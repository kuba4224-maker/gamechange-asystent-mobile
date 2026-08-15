// Ekran KALENDARZ — Krok 8 checklisty. Implementacja wg
// docs/KONTRAKT_KALENDARZ.md (spisanego z panel-kalendarz w asystent_app.html).
//
// AUDYT 06.08.2026 — USUNIĘTA sekcja "Sugerowane na ten tydzień"
// (SUGGESTED_ACTIVITY_BY_SEGMENT + computeCalendarSuggestion + acceptCalendarSuggestion).
// Powody, w kolejności ważności:
//  1. Robiła DOKŁADNIE to samo co Blok Skupienia — planowała mikro-sesję pod cel
//     priorytetowy — tylko gorzej i z drugiego ekranu. Dwa konkurujące mechanizmy
//     do jednego zadania to główne źródło bałaganu w tej appce.
//  2. Nie wiedziała o Blokach Skupienia: `alreadyPlanned` sprawdzało `goal_id`,
//     ale nie `focus_block_id`, więc proponowała kolejną sesję zawodnikowi, któremu
//     Blok zaplanował właśnie 18 wpisów w kalendarzu.
//  3. Treść była zahardkodowana — 13 stałych zdań, niezależnych od diagnozy,
//     pozycji i poziomu zawodnika. Blok Skupienia dobiera dawkowanie przez
//     /api/generate-focus-block-dosing, na podstawie realnych danych.
//  4. Sama sekcja NIE była potwierdzona jako obecna na produkcji/GitHub main
//     (patrz claude/BACKUP_asystent_app_html_2026-07-27_przed_migracja_mobilna.md) —
//     czyli usunięcie prawdopodobnie zbliża ten ekran do produkcji, nie oddala.
// Planowanie pracy nad celem zostaje w JEDNYM miejscu: Cele → "Zaplanuj pracę
// nad tym celem" → Blok Skupienia.
// AUDYT 27.07.2026: `useEffect` -> `useFocusEffect` + `RefreshControl` — patrz
// uzasadnienie w app/(tabs)/dziennik.tsx (ten sam powód: ekran nie
// odmontowuje się przy przełączaniu zakładek, np. po zalogowaniu wpisu w
// Dzienniku i powrocie tu, badge "Wykonano/Nie wykonano" musi się odświeżyć).
//
// DOMKNIĘCIE LUKI 28.07.2026 (znalezionej w Domenie 09 SQL i opisanej w
// docs/KROK_4_PUSH_POWIADOMIENIA.md, założenie 3): `calendar_events`
// dopuszcza `event_type='match'` w bazie od Domeny 09 (dodane właśnie pod
// rytm powiadomień pre_match), ale ŻADEN frontend — ani web, ani ten ekran
// — nie dawał zawodnikowi sposobu na faktyczne zaplanowanie nadchodzącego
// meczu. Bez tego rytm pre_match (kod gotowy w cron-send-notifications.js)
// nigdy nie miał żadnych wierszy do obsłużenia. Naprawa: 'match' dodany do
// EVENT_TYPE_LABELS niżej — to WYŁĄCZNIE zaplanowanie nadchodzącego meczu
// (tytuł/data/notatka, jak każde inne wydarzenie), coś innego niż zakładka
// Mecz (tam zawodnik loguje WYNIK już rozegranego meczu, osobna tabela
// match_contexts) — nie miesza się z tamtą logiką.
import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
// AUDYT 06.08.2026 — `getCurrentWeekDayList` stracił konsumenta razem z usuniętą
// sekcją "Sugerowane na ten tydzień". Zostaje w lib/date-utils (używany gdzie indziej),
// usunięty tylko z tego importu.
import { toLocalDateStr, DAYS_OF_WEEK, DAY_LABELS_PL } from '../../lib/date-utils';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';
// JEDNA DROGA B2 08.08.2026 — jedno źródło nazw segmentów (lib/labels.ts).
import { SEGMENT_LABELS } from '../../lib/labels';
// ═══════════════════════════════════════════════════════════════════
// PLAN-D-T 08.2026 (14.08.2026), zadanie T6 — TRZY PUSTKI I KOMUNIKAT
// O BRAKU DOSTĘPU.
//
// Do tej rundy ten ekran robił dwie rzeczy źle i obie po cichu:
//   • przy pustej liście mówił „Brak zaplanowanych wydarzeń" — to samo
//     zdanie zawodnikowi, który nic nie zaplanował, i temu, któremu
//     WYGASŁ DOSTĘP i baza i tak nie przyjęłaby jego wpisu;
//   • przy odrzuconym zapisie pokazywał surowy błąd bazy („new row
//     violates row-level security policy for table «calendar_events»"),
//     z którego nie da się wyczytać ani co się stało, ani że nic nie zginęło.
// Oba naprawia ta runda. Rozróżnienie pustek jest CZYSTĄ FUNKCJĄ
// (`lib/trzyPustki.ts`), a komunikat — tym samym, którym pas K zastąpił
// błąd w Dzienniku. Zero nowej treści.
// ═══════════════════════════════════════════════════════════════════
import {
  rozpoznajPustke,
  opisPustkiDoLogu,
  PUSTKA_BRAK_KONFIGURACJI_TEKST,
  PUSTKA_BRAK_KONFIGURACJI_CTA,
} from '../../lib/trzyPustki';
import {
  toJestBrakDostepu,
  ZAPIS_ODRZUCONY_BRAK_DOSTEPU,
  czytajStanDostepu,
  RPC_STAN_DOSTEPU,
} from '../../lib/dostepKonta';
// ═══════════════════════════════════════════════════════════════════
// PLAN-D-A7 08.2026 (14.08.2026) — TRZY RZECZY, KTÓRYCH TEN EKRAN NIE ROBIŁ.
//
// Pomiar M5, powtórzony 14.08 na żywej bazie: `calendar_events` = 24 wiersze,
// 24 z 24 to `micro_session` ze `source='system'`. Formularz niżej ma pięć
// rodzajów i UMIE zapisać `source='player'` (sprawdzone: ustawia to w linii
// z `body`), a mimo to nie ma ani jednego wiersza od zawodnika. Diagnoza
// hipotez H1–H5 stoi w `claude/PRZEKAZANIE_PAS_A7_14_08_2026.md`, sekcja 4.
// Trzy rzeczy, które ta runda naprawia po stronie tego ekranu:
//
//  1. **GODZINY NIE DA SIĘ BYŁO PODAĆ.** Kolumna `scheduled_time` istnieje
//     od pasa A2+A3 (14.08), a `grep -rn scheduled_time app lib` dawał
//     ZERO trafień piszących i ZERO czytających. Makieta widoku tygodnia
//     pokazuje tagi „18:00" i „11:00" — nie było ich z czego narysować.
//  2. **ŹRÓDŁA NIE BYŁO WIDAĆ.** Legenda makiety rozróżnia „Sesja Bloku
//     Skupienia (system zaplanował)" od „Trening — Ty dodałeś". To jest
//     kolumna `source`, nie `event_type` — ekran ją pobierał (`select('*')`)
//     i nigdy nie rysował.
//  3. **WYDARZENIE `completed` ZNIKAŁO Z EKRANU W CAŁOŚCI.** Wszystkie trzy
//     sekcje filtrowały po `status === 'scheduled'` albo `'cancelled'`.
//     Po migracji A1 (status `'completed'` dopuszczony od 14.08) pierwsza
//     sesja zaliczona z Dziennika — i każdy mecz opisany na ekranie Mecz —
//     wypadłyby z kalendarza bez śladu. Klasyczny „cichy brak": zapis się
//     udaje, ekran milczy, nikt nie ma jak tego zauważyć.
// ═══════════════════════════════════════════════════════════════════
import { formatujGodzine } from '../../lib/godzinaWydarzenia';
import {
  przygotujGodzineDoZapisu,
  opiszRodzaj,
  opiszZrodlo,
  opisNieznanegoRodzajuDoLogu,
} from '../../lib/meczWKalendarzu';
// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-C1 08.2026 (14.08.2026) — WIDOK TYGODNIA.
//
// ── CO TU BYŁO DO 14.08.2026 WIECZOREM ──────────────────────────────
// Ten ekran grupował wiersze PO STATUSIE: Cykliczne · Nadchodzące · Minione ·
// Anulowane. Makieta `claude/MAKIETA_WIDOK_TYGODNIA.html` pokazuje coś zupełnie
// innego: SIEDEM WIERSZY DNI, cały tydzień naraz, z wagą każdego dnia widoczną
// bez czytania legendy. To nie jest ten sam ekran w innej kolejności — to jest
// inny sposób patrzenia na te same wiersze.
//
// Rejestr obietnic policzył cenę tej luki: JEDENAŚCIE obietnic (WT-04…WT-11,
// WT-16, WT-18 i WG-02…WG-07) czekało na JEDEN brakujący element — wiersz dnia.
//
// ── CO SIĘ ZMIENIŁO NA EKRANIE, ŻEBY NIC NIE ZNIKNĘŁO PO CICHU ──────
// • Doszły zakładki **Tydzień / Listy** (WT-03). Domyślna jest „Tydzień",
//   dokładnie jak w makiecie (`<div class="seg"><div class="on">Tydzień</div>`).
// • **Stare grupowanie NIE ZOSTAŁO USUNIĘTE.** Cztery sekcje i formularz żyją
//   w całości pod zakładką „Listy" — o jedno dotknięcie dalej niż dotąd.
//   To jest jedyna rzecz, która na tym ekranie „podrożała", i jest wymieniona
//   w nocie pasa C1, sekcja 4.
// • Plakietka **„Nie wykonano" ZNIKŁA** i nie wróci. Renderowała się dla każdej
//   przeszłej pozycji bez wpisu w dzienniku — czyli produkt ZGADYWAŁ PRZECIWKO
//   ZAWODNIKOWI: brak danych zamieniał w oskarżenie. Zastępują ją trzy stany
//   z WG-05 (`lib/widokTygodnia.ts`, `rozstrzygnijStanPrzeszly`).
//
// ── ⛔ CZEGO TU NIE MA I MIEĆ NIE BĘDZIE ────────────────────────────
// ŻADNEJ SIATKI GODZINOWEJ. Obietnica WT-34 jest dziś w stanie JEST i siatka
// ZGASIŁABY spełnioną obietnicę. Uzasadnienie ze stopki makiety:
// `scheduled_date` to data bez godziny, więc siatka rysowałaby pozycje
// w miejscach, których nie znamy. Pasek zajętości pokazuje WYŁĄCZNIE godziny
// szkoły — jedyne dane, które godzinę naprawdę mają.
//
// ── ⛔ ZERO `?? []` NA WEJŚCIACH ────────────────────────────────────
// „Nie udało się odczytać" i „nic nie masz" to dwa różne zdania (R5). Trzy stany
// (`events`, `loggedEventIds`, `planLekcji`) są dziś `T | null`, gdzie `null`
// znaczy WYŁĄCZNIE „odczyt się nie udał". Do 14.08 stało tu `(eventRows ?? [])`
// i nieudany odczyt wyglądał na pusty kalendarz.
// ═══════════════════════════════════════════════════════════════════
import { poniedzialekTygodnia } from '../../lib/glosTygodnia';
import { parsujPlanLekcji, type PlanTygodnia, type WierszPlanuLekcji } from '../../lib/planLekcji';
import {
  zbudujTydzien,
  czyPlanLekcjiZnany,
  przesunTydzien,
  segmentyPaska,
  liczbaPozycji,
  opisTygodniaDoLogu,
  LEGENDA_KROPEK,
  PLAKIETKI_STANU_PRZESZLEGO,
  NIE_UDALO_SIE_ODCZYTAC_TYGODNIA,
  type KlasaKropki,
  type PozycjaDnia,
  type WierszDnia,
  type WagaDnia,
} from '../../lib/widokTygodnia';
// ⭐ PLAN-D-D1 08.2026 (14.08.2026) — „TEJ SESJI NIE ODBYŁEM".
//
// ── CZEGO TU NIE BYŁO DO DZIŚ ─────────────────────────────
// Produkt umiał zapisać wyłącznie „ta sesja MA wpis". Nie miał ani jednego
// miejsca, w którym zawodnik mógłby powiedzieć „nie odbyłem" — więc licznik
// pracy potrafił podać tylko „ile sesji ma wpis", nigdy „ile odbyłeś".
// Ten ekran jest tym JEDNYM miejscem. ⛔ Drugie miejsce to dwa źródła prawdy.
//
// ── ⛔ CZTERY WARUNKI TEJ AKCJI, KAŻDY PILNOWANY ASERCJĄ ────────
// 1. NIE PYTAMY „DLACZEGO NIE". Pytanie o powód przy opuszczonej sesji jest
//    konfrontacją (M1) i obniża wypełnialność u tych, którzy najbardziej
//    odpadają. Powód wolno zapisać, gdy zawodnik sam go poda — nie wolno
//    o niego prosić jako o warunek.
// 2. ZERO ZDANIA OCENIAJĄCEGO PO ZAPISIE. „Szkoda" ocenia, „nic straconego"
//    kłamie. Po dotknięciu zmienia się plakietka i nic więcej.
// 3. AKCJA JEST ODWRACALNA I WIDAĆ, ŻE JEST — w tym samym miejscu, w którym
//    było „Nie odbyłem", stoi potem „Cofnij". Kto kliknął przez pomyłkę
//    i nie może cofnąć, przestaje klikać w ogóle.
// 4. WERDYKT DOTYCZY WYSTĄPIENIA `(id, dzień)`, nie wiersza. Reguła cykliczna
//    ma jeden wiersz i wiele wtorków.
import {
  rozstrzygnijWykonanie,
  akcjaDlaWystapienia,
  czytajWerdykty,
  kluczWystapienia,
  WERDYKTY_NIEPODANE,
  type WejscieWerdyktow,
} from '../../lib/wykonanieSesji';

const EVENT_TYPE_LABELS: Record<string, string> = {
  club_training: 'Trening klubowy', own_training: 'Trening własny',
  micro_session: 'Mikro-sesja', task: 'Zadanie', match: 'Mecz',
};

// JEDNA DROGA B2 08.08.2026 — lokalna kopia 13 nazw segmentów usunięta,
// nazwy pochodzą teraz z lib/labels.ts (jedno źródło dla całej appki).
// Treść niezmieniona co do znaku — `SEG_LABELS` to alias na tę samą mapę,
// żeby nie ruszać ani jednego miejsca użycia w tym pliku.
const SEG_LABELS = SEGMENT_LABELS;

type Goal = { id: number; segment_id: string; status: string; is_priority: boolean; refinement_note: string | null };
type CalEvent = {
  id: number; title: string; notes: string | null; event_type: string; status: string;
  scheduled_date: string | null; recurrence_rule: string | null; goal_id: number | null;
  // PLAN-D-A7 — obie kolumny SĄ pobierane (`select('*')` niżej) i od tej rundy
  // obie są RYSOWANE. Wpisanie ich w typ nie jest kosmetyką: dopóki tu ich nie
  // było, TypeScript nie miał jak powiedzieć, że ekran sięga po coś, czego
  // zapytanie nie przynosi — a to jest dokładnie ten defekt, którego pilnuje
  // `lib/meczWKalendarzu.selftest.ts`, asercja (A7-2).
  source: string | null; scheduled_time: string | null;
};

function formatRecurrence(rule: string) {
  const m = /^weekly:(.+)$/.exec(rule);
  if (!m) return rule;
  return 'Co tydzień: ' + m[1].split(',').map((d) => DAY_LABELS_PL[d] || d).join(', ');
}

// PLAN-D-C1 — kolor kropki. Klasa przychodzi z reguły (`klasaKropki`
// w lib/widokTygodnia.ts), tutaj zostaje wyłącznie przypisanie tokenu.
// ⚠️ `nieznana` NIE dostaje koloru rodzaju — dostaje obrys, tak samo jak
// pozycja, o której nic nie wiemy. Kolor „na oko" byłby zgadywaniem.
const KOLOR_KROPKI: Record<KlasaKropki, { backgroundColor: string; borderColor?: string; borderWidth?: number }> = {
  blok: { backgroundColor: colors.success },
  klub: { backgroundColor: colors.textSecondary },
  mecz: { backgroundColor: colors.brand },
  zadanie: { backgroundColor: 'transparent', borderColor: colors.textTertiary, borderWidth: 1.5 },
  nieznana: { backgroundColor: 'transparent', borderColor: colors.warning, borderWidth: 1.5 },
};

// PLAN-D-C1 — ile segmentów paska wagi zapala się przy której wadze.
// ⚠️ Sama waga jest REGUŁĄ i mieszka w `lib/widokTygodnia.ts` (tabela
// `PUNKTY_RODZAJU` + `PROGI_WAGI`). Tutaj jest wyłącznie jej obraz.
const SEGMENTY_WAGI: Record<WagaDnia, number> = {
  pusty: 0, lekki: 1, sredni: 2, ciezki: 3, nie_wiem: 0,
};

export default function KalendarzScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();

  const [eventType, setEventType] = useState('club_training');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [frequency, setFrequency] = useState<'once' | 'recurring'>('once');
  // PLAN-D-A7 — godzina jako TEKST, nie `Date`. Powód: `Date` zawsze JAKĄŚ
  // godzinę ma, więc pole oparte na `DateTimePicker` nie umie wyrazić „nie
  // podałem". Makieta rozstrzyga to wprost („Godzina przy kaflu pojawia się
  // tylko wtedy, gdy zawodnik ją podał"), a kolumna `scheduled_time` jest
  // NULL-owalna właśnie po to. Pusty napis = brak godziny i nic się nie psuje.
  const [godzina, setGodzina] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [goalId, setGoalId] = useState('');

  const [goals, setGoals] = useState<Goal[]>([]);
  // ⛔ PLAN-D-C1 — TRZY WEJŚCIA, KAŻDE Z JAWNYM `null` = „ODCZYT SIĘ NIE UDAŁ".
  // Do 14.08 stało tu `useState<CalEvent[]>([])` plus `(eventRows ?? [])`,
  // więc padnięte zapytanie wyglądało dokładnie jak pusty kalendarz.
  const [events, setEvents] = useState<CalEvent[] | null>(null);
  const [loggedEventIds, setLoggedEventIds] = useState<ReadonlySet<number> | null>(null);
  const [planLekcji, setPlanLekcji] = useState<PlanTygodnia | null>(null);
  // ⭐ PLAN-D-D1 — WERDYKTY ZAWODNIKA. Stan startowy to `WERDYKTY_NIEPODANE`,
  // czyli jawne „ten ekran ich jeszcze nie czytał", a NIE pusta lista: pusta
  // lista twierdziłaby, że sprawdziliśmy i nic nie ma.
  const [werdykty, setWerdykty] = useState<WejscieWerdyktow>(WERDYKTY_NIEPODANE);
  const [zapisWerdyktu, setZapisWerdyktu] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [showPast, setShowPast] = useState(false);

  // PLAN-D-C1 — zakładki WT-03. Domyślnie „Tydzień", jak w makiecie.
  const [zakladka, setZakladka] = useState<'tydzien' | 'listy'>('tydzien');
  // PLAN-D-C1 — który tydzień oglądamy (WT-04). Stan, nie zegar: strzałki
  // muszą go zmieniać, a `useFocusEffect` nie może go resetować pod palcem.
  const [poniedzialek, setPoniedzialek] = useState<string>(() => poniedzialekTygodnia(new Date()));

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  // PLAN-D-T (T6) — `null` znaczy „nie odczytałem", a NIE „nie ma dostępu".
  // Kierunek błędu wybrany świadomie: powiedzenie „skończył Ci się okres
  // próbny" komuś, komu się nie skończył, jest gorsze niż niepokazanie tego
  // zdania. Patrz `moznaZapisywac` w lib/trzyPustki.ts.
  const [moznaZapisywac, setMoznaZapisywac] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const loadGoals = useCallback(async () => {
    if (!currentUser) return [] as Goal[];
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('is_priority', { ascending: false })
      .order('created_at', { ascending: false });
    const rows = (data || []) as Goal[];
    setGoals(rows);
    return rows;
  }, [currentUser]);

  const loadEvents = useCallback(async () => {
    if (!currentUser) return;
    await loadGoals();

    const { data: eventRows, error: err } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', currentUser.id);
    if (err) {
      // ⛔ PLAN-D-C1 — NIEUDANY ODCZYT NIE UDAJE PUSTEGO KALENDARZA.
      // Do 14.08 stało tu `return` bez śladu, a stan zostawał poprzedni albo
      // pusty. Teraz `null` niesie się aż na ekran i ekran mówi, czego nie wie.
      console.warn('[PLAN-D-C1] nie odczytałem calendar_events:', err.message);
      setEvents(null);
    } else if (eventRows) {
      setEvents(eventRows as CalEvent[]);
    } else {
      setEvents(null);
    }

    const { data: logRows, error: logErr } = await supabase
      .from('daily_logs')
      .select('calendar_event_id')
      .eq('user_id', currentUser.id)
      .not('calendar_event_id', 'is', null);
    if (logErr || !logRows) {
      // ⚠️ Bez dziennika NIE WIEMY, czy przeszła pozycja się odbyła — i to jest
      // stan `nie_odczytano`, a nie „brak wpisu" i tym bardziej nie „nie wykonano".
      if (logErr) console.warn('[PLAN-D-C1] nie odczytałem daily_logs:', logErr.message);
      setLoggedEventIds(null);
    } else {
      setLoggedEventIds(new Set(logRows.map((l: any) => l.calendar_event_id as number)));
    }

    // PLAN-D-C1 — PLAN LEKCJI. ⚠️ ŚWIADOMIE OSOBNE, WĄSKIE WYWOŁANIE, ten sam
    // wzorzec co w `profil.tsx`: gdyby funkcja `school_week` nie istniała
    // (migracja A3 jeszcze nie wklejona) albo padła, kalendarz ma działać dalej.
    // ⚠️ To jest wejście, które ODBLOKOWUJE obietnicę WT-31 — do tej rundy
    // `planLekcjiZnany` było przybite do `null` i gałąź „brak konfiguracji"
    // w `lib/trzyPustki.ts` była NIEOSIĄGALNA. Brzmienie istniało od pasa T
    // i nikt go nigdy nie zobaczył.
    const planRes = await supabase.rpc('school_week', { p_from: poniedzialek });
    if (planRes.error) {
      console.warn('[PLAN-D-C1] nie odczytałem planu lekcji:', planRes.error.message);
      setPlanLekcji(parsujPlanLekcji(null));
    } else {
      setPlanLekcji(parsujPlanLekcji((planRes.data || []) as WierszPlanuLekcji[]));
    }

    // ⭐ PLAN-D-D1 — WERDYKTY. ŚWIADOMIE OSOBNE, WĄSKIE WYWOŁANIE, ten sam
    // wzorzec co `school_week` wyżej: dopóki migracja
    // `MIGRACJA_D1_WERDYKT_WYSTAPIENIA_14_08_2026.sql` nie jest wykonana,
    // tabeli `session_verdicts` NIE MA i to zapytanie odpowie błędem.
    // ⚠️ To NIE JEST to samo, co nieudany odczyt: `czytajWerdykty` rozróżnia
    // „tabeli nie ma, więc werdyktu nie może być" od „nie udało mi się odczytać".
    // Bez tego rozróżnienia KAŻDA przeszła pozycja bez wpisu dostałaby dziś
    // plakietkę „Nie wiemy" — czyli spełniona obietnica WG-05 zgasłaby z powodu
    // migracji, której nikt jeszcze nie wkleił.
    const werdyktyRes = await supabase
      .from('session_verdicts')
      .select('calendar_event_id,occurred_on,verdict,withdrawn_at')
      .eq('user_id', currentUser.id);
    const werdyktyWe = czytajWerdykty({ dane: werdyktyRes.data, blad: werdyktyRes.error });
    if (werdyktyWe.rodzaj !== 'jest') console.warn('[PLAN-D-D1] ' + werdyktyWe.powod);
    setWerdykty(werdyktyWe);

    // PLAN-D-T 08.2026 (14.08.2026), zadanie T6 — STAN DOSTĘPU DO ZAPISU.
    // ⚠️ ŚWIADOMIE OSOBNE, WĄSKIE WYWOŁANIE, POZA paczką wyżej: gdyby RPC
    // `stan_dostepu` nie istniało albo padło, kalendarz ma działać dalej.
    // Nieudany odczyt daje `null`, czyli „nie wiem" — a „nie wiem" NIE mówi
    // zawodnikowi, że stracił dostęp (patrz lib/trzyPustki.ts).
    const dostepRes = await supabase.rpc(RPC_STAN_DOSTEPU);
    const stanDostepu = czytajStanDostepu(
      dostepRes.data, dostepRes.error ? dostepRes.error.message : null,
    );
    setMoznaZapisywac(stanDostepu.rodzaj === 'znany' ? stanDostepu.maDostep : null);
  }, [currentUser, loadGoals, poniedzialek]);

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadEvents(); }, [loadEvents]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  const activeGoals = goals.filter((g) => g.status === 'active');

  const todayStr = toLocalDateStr(new Date());

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-C1 — TYDZIEŃ. Cała logika jest w czystej funkcji; ten ekran
  // jej WYNIK RYSUJE, a nie liczy. Zero Reacta po tamtej stronie znaczy, że
  // reguły (waga dnia, zdanie, kolizja) dają się sprawdzić bez ekranu — a reguła,
  // której nie da się sprawdzić, cicho przestaje obowiązywać.
  // ═══════════════════════════════════════════════════════════════════
  const tydzien = zbudujTydzien({
    poniedzialek,
    dzisiaj: todayStr,
    wydarzenia: events,
    planLekcji,
    wpisyDziennika: loggedEventIds,
    werdykty,
  });

  // PLAN-D-C1 — pustka TYGODNIA (a nie sekcji). Rozstrzyga ta sama czysta
  // funkcja co dotąd; zmienia się wyłącznie zakres, o którym mówi.
  // ⚠️ Przy nieudanym odczycie NIE MA PUSTKI — jest zdanie o nieudanym odczycie.
  // Pustka znaczy „sprawdziłem i nic nie ma", a tego nie sprawdziliśmy.
  const pustkaTygodnia = tydzien.odczyt.wydarzenia
    ? rozpoznajPustke({
        maWpisy: liczbaPozycji(tydzien) > 0,
        planLekcjiZnany: czyPlanLekcjiZnany(planLekcji),
        moznaZapisywac,
        zakres: 'tydzien',
      })
    : null;
  if (pustkaTygodnia) console.log(`kalendarz: ${opisPustkiDoLogu(pustkaTygodnia)}`);
  if (tydzien.nieumieszczone.length > 0) {
    console.warn('[PLAN-D-C1] pozycje, których nie umiem położyć w tygodniu:', JSON.stringify(tydzien.nieumieszczone));
  }
  console.log(opisTygodniaDoLogu(tydzien));

  const resetForm = () => {
    setTitle(''); setNotes(''); setDate(null); setSelectedDays(new Set()); setGoalId('');
    setGodzina('');
  };

  const toggleDay = (code: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  async function createCalendarEvent() {
    if (!currentUser) return;
    setError(null); setOk(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) { setError('Podaj tytuł wydarzenia.'); return; }

    const body: Record<string, any> = {
      user_id: currentUser.id,
      event_type: eventType,
      source: 'player',
      title: trimmedTitle,
      status: 'scheduled',
    };
    if (notes.trim()) body.notes = notes.trim();
    if (goalId) body.goal_id = Number(goalId);

    // PLAN-D-A7 — GODZINA ROZSTRZYGA SIĘ PRZED WYSŁANIEM, NIE W BAZIE.
    // `chk_calendar_events_scheduled_time` odrzuca sekundy i `>= 24:00` kodem
    // `23514`. Bez tej bramki zawodnik, który wpisze „25:00", dostaje surowy
    // błąd bazy zamiast zdania po polsku. Pusto = brak godziny, nie błąd.
    const wynikGodziny = przygotujGodzineDoZapisu(godzina);
    if (!wynikGodziny.zapisz) { setError(wynikGodziny.powod); return; }
    // ⚠️ Wysyłamy pole TYLKO wtedy, gdy godzina jest. `scheduled_time: null`
    // też byłoby poprawne, ale wysyłanie jawnego `null` przy każdym zapisie
    // kasowałoby godzinę przy każdej przyszłej edycji tego samego kształtu
    // `body` — a `body` jest tu jedynym miejscem, z którego ten ekran pisze.
    if (wynikGodziny.wartosc !== null) body.scheduled_time = wynikGodziny.wartosc;

    // chk_recurrence_xor_date: dokładnie jedno z dwóch, nigdy oba naraz.
    if (frequency === 'once') {
      if (!date) { setError('Podaj datę.'); return; }
      body.scheduled_date = toLocalDateStr(date);
    } else {
      if (selectedDays.size === 0) { setError('Zaznacz przynajmniej jeden dzień tygodnia.'); return; }
      body.recurrence_rule = 'weekly:' + Array.from(selectedDays).join(',');
    }

    setSaving(true);
    try {
      const { error: insErr } = await supabase.from('calendar_events').insert(body);
      if (insErr) throw insErr;
      setOk('Dodano do kalendarza.');
      resetForm();
      await loadEvents();
    } catch (e: any) {
      // PLAN-D-T (T6) — ⚠️ TO NIE JEST ŚCIEŻKA ODZYSKU: nie ponawiamy zapisu
      // i nie zmieniamy jego treści. Zmienia się WYŁĄCZNIE zdanie, które
      // zawodnik czyta, gdy baza odmówiła z powodu wygasłego dostępu.
      setError(toJestBrakDostepu(e) ? ZAPIS_ODRZUCONY_BRAK_DOSTEPU : 'Nie udało się dodać wydarzenia: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function cancelEvent(id: number) {
    setError(null);
    const { error: err } = await supabase.from('calendar_events').update({ status: 'cancelled' }).eq('id', id);
    if (err) {
      // PLAN-D-T (T6) — jak wyżej.
      setError(toJestBrakDostepu(err) ? ZAPIS_ODRZUCONY_BRAK_DOSTEPU : 'Nie udało się anulować wydarzenia: ' + err.message);
      return;
    }
    await loadEvents();
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-D1 — JEDNA AKCJA, ODWRACALNA. „Tej sesji nie odbyłem".
  //
  // ⚠️ Dlaczego TUTAJ, a nie na karcie w zakładce „Listy": karta opisuje
  // WIERSZ, a werdykt dotyczy WYSTĄPIENIA. Wiersz reguły cyklicznej nie ma
  // daty w ogóle (`chk_recurrence_xor_date`), więc z karty nie da się wskazać,
  // o który wtorek chodzi. Wiersz dnia wie to zawsze — i tylko on.
  // ═══════════════════════════════════════════════════════════════════
  async function oznaczNieodbyte(p: PozycjaDnia) {
    if (!currentUser) return;
    setError(null); setOk(null);
    setZapisWerdyktu(kluczWystapienia(p.id, p.dzien));
    // ⚠️ PLAN-D 14.08.2026, POPRAWKA SESJI NAWIGUJĄCEJ — RYZYKO 6 Z NOTY PASA D1.
    // DO TEJ POPRAWKI STAŁO TU `.insert(...)`. Unikat
    // `session_verdicts_jeden_na_wystapienie` obejmuje TAKŻE wiersze wycofane
    // (i słusznie — inaczej po „Cofnij" powstałby drugi wiersz na ten sam dzień
    // i „ostatni wygrywa" stałoby się niepisaną regułą). Skutek: ścieżka
    // „Nie odbyłem" → „Cofnij" → „Nie odbyłem" zwracała `23505`, a zawodnik
    // widział „Nie udało się zapisać" przy poprawnym zachowaniu.
    // ⛔ `withdrawn_at: null` jest tu OBOWIĄZKOWE, nie kosmetyczne: bez niego
    // ponowny werdykt trafiłby w wiersz wycofany i nadal by nie obowiązywał.
    // Ślad zmiany stawia wyzwalacz `session_verdicts_pilnuj`, nie ten kod (P1).
    const { data: wstawione, error: err } = await supabase
      .from('session_verdicts')
      .upsert({
        user_id: currentUser.id,
        calendar_event_id: p.id,
        occurred_on: p.dzien,
        verdict: 'nie_odbylo_sie',
        origin: 'player',
        withdrawn_at: null,
      }, { onConflict: 'calendar_event_id,occurred_on' })
      .select('id');
    setZapisWerdyktu(null);
    if (err) {
      setError(toJestBrakDostepu(err)
        ? ZAPIS_ODRZUCONY_BRAK_DOSTEPU
        : 'Nie udało się zapisać: ' + err.message);
      return;
    }
    // ⚠️ O61 — OPERACJA, KTÓRA NIE RZUCIŁA WYJĄTKU, NIE JEST DOWODEM, ŻE COŚ
    // SIĘ STAŁO. Zapis odrzucony przez RLS potrafi wyglądać jak sukces z pustą
    // listą. Zawodnikowi nie kłamiemy, że zapisaliśmy.
    if (!wstawione || wstawione.length === 0) {
      setError('Nie udało się zapisać: baza nie przyjęła tego wpisu.');
      console.warn('[PLAN-D-D1] insert session_verdicts dotknął ZERO wierszy '
        + `(wydarzenie ${p.id}, dzień ${p.dzien}) — najpewniej RLS.`);
      return;
    }
    // ⛔ ZERO ZDANIA PO ZAPISIE. „Szkoda" ocenia, „nic straconego" kłamie.
    // Zmienia się plakietka i przycisk — i to jest cała odpowiedź produktu.
    await loadEvents();
  }

  async function cofnijWerdykt(p: PozycjaDnia) {
    if (!currentUser) return;
    setError(null); setOk(null);
    setZapisWerdyktu(kluczWystapienia(p.id, p.dzien));
    // ⚠️ Werdyktu NIE KASUJEMY — wycofujemy. Wiersz zostaje, żeby ślad zmiany
    // zdania nie zginął (P1), a wystąpienie wraca do stanu „bez wpisu".
    // Wartość daty jest bez znaczenia: wyzwalacz `session_verdicts_pilnuj`
    // podstawia `now()` bazy. Data z telefonu byłaby datą, której nikt nie zmierzył.
    const { data: dotkniete, error: err } = await supabase
      .from('session_verdicts')
      .update({ withdrawn_at: new Date().toISOString() })
      .eq('calendar_event_id', p.id)
      .eq('occurred_on', p.dzien)
      .eq('user_id', currentUser.id)
      .select('id');
    setZapisWerdyktu(null);
    if (err) {
      setError(toJestBrakDostepu(err)
        ? ZAPIS_ODRZUCONY_BRAK_DOSTEPU
        : 'Nie udało się cofnąć: ' + err.message);
      return;
    }
    if (!dotkniete || dotkniete.length === 0) {
      setError('Nie udało się cofnąć: baza nie zmieniła żadnego wpisu.');
      console.warn('[PLAN-D-D1] update session_verdicts dotknął ZERO wierszy '
        + `(wydarzenie ${p.id}, dzień ${p.dzien}) — najpewniej RLS.`);
      return;
    }
    await loadEvents();
  }

  function renderEventCard(e: CalEvent) {
    // ⚠️ PLAN-D-A7 08.2026 — DO 14.08.2026 STAŁO TU `EVENT_TYPE_LABELS[…] || e.event_type`.
    // Rodzaj spoza piątki znanej appce (np. dołożony do CHECK-a w bazie i nie
    // dołożony tutaj) pokazywał się zawodnikowi jako SUROWA WARTOŚĆ Z BAZY —
    // „club_training" wygląda jak etykieta, więc nikt nigdy nie zgłosiłby,
    // że etykiety brakuje. Reguła R5: brak wiedzy ma mieć własny, jawny stan.
    const opisRodzaju = opiszRodzaj(e.event_type);
    const typeLabel = opisRodzaju.znany
      ? EVENT_TYPE_LABELS[opisRodzaju.id]
      : opisRodzaju.komunikat;
    if (!opisRodzaju.znany) console.warn(opisNieznanegoRodzajuDoLogu(opisRodzaju));
    const goal = e.goal_id ? goals.find((g) => g.id === e.goal_id) : null;

    // ⭐ PLAN-D-C1 — TA SAMA REGUŁA TRZECH STANÓW, CO W WIDOKU TYGODNIA.
    // Do 14.08 stało tu `loggedEventIds.has(e.id) ? 'Wykonano' : 'Nie wykonano'`
    // — czyli brak wpisu w dzienniku był renderowany jako informacja o tym,
    // że zawodnik czegoś NIE ZROBIŁ. To jest domysł podany jako fakt (Z0).
    const badges: string[] = [];
    // ⭐ PLAN-D-D1 — ta sama reguła co w wierszu dnia, wołana o wystąpienie.
    // Karta opisuje wiersz, więc wystąpieniem jest jego własna data; wiersz
    // cykliczny daty nie ma i dostaje stan „bez wpisu", tak jak dotąd.
    const stanPrzeszly = rozstrzygnijWykonanie({
      idWydarzenia: e.id,
      dzien: e.scheduled_date ? e.scheduled_date.slice(0, 10) : '',
      przeszle: !!e.scheduled_date && e.scheduled_date < todayStr,
      status: e.status,
      zRegulyCyklicznej: !!e.recurrence_rule,
      wpisyDziennika: loggedEventIds,
      werdykty,
    });
    if (stanPrzeszly) badges.push(PLAKIETKI_STANU_PRZESZLEGO[stanPrzeszly]);
    else if (e.status === 'cancelled') badges.push('Anulowane');
    else if (e.status === 'completed') badges.push(PLAKIETKI_STANU_PRZESZLEGO.odbylo_sie);

    const meta: string[] = [];
    if (e.scheduled_date) {
      meta.push(new Date(e.scheduled_date + 'T00:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', weekday: 'short' }));
    }
    // PLAN-D-A7 — GODZINA. `formatujGodzine` zwraca `null`, gdy godziny nie ma
    // (nie `''` i nie `'—'`), więc brak godziny nie ma jak wyrenderować się
    // jako pusty tag wyglądający na daną. Patrz `lib/godzinaWydarzenia.ts`.
    const tagGodziny = formatujGodzine(e.scheduled_time);
    if (tagGodziny) meta.push(tagGodziny);
    if (e.recurrence_rule) meta.push(formatRecurrence(e.recurrence_rule));
    // PLAN-D-A 08.2026 — `goals` to wąskie gardło, nie Cel.
    if (goal) meta.push('wąskie gardło: ' + (SEG_LABELS[goal.segment_id] || goal.segment_id));
    // PLAN-D-A7 — KTO TĘ POZYCJĘ WSTAWIŁ. Legenda makiety widoku tygodnia
    // rozróżnia kropki właśnie po tym („Sesja Bloku Skupienia (system
    // zaplanował)" kontra „Trening — Ty dodałeś"), a rozróżnienie siedzi
    // w kolumnie `source`, nie w `event_type`. Kolumna była pobierana
    // (`select('*')`) i nierysowana od początku istnienia tego ekranu.
    meta.push(opiszZrodlo(e.source).opis);

    return (
      <View key={e.id} style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{e.title}</Text>
          {badges.map((b, i) => (
            <Text key={i} style={[styles.badge, b === PLAKIETKI_STANU_PRZESZLEGO.odbylo_sie ? styles.badgeCompleted : styles.badgeMuted]}>{b}</Text>
          ))}
        </View>
        <Text style={styles.cardSubtitle}>{typeLabel}</Text>
        {e.notes ? <Text style={styles.cardNote}>{e.notes}</Text> : null}
        <Text style={styles.cardMeta}>{meta.join(' · ')}</Text>
        {e.status === 'scheduled' && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => cancelEvent(e.id)}>
              <Text style={styles.secondaryBtnText}>Anuluj</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ WIERSZ DNIA — element, na który czekało jedenaście obietnic
  // ═══════════════════════════════════════════════════════════════════
  function renderPozycja(p: PozycjaDnia) {
    const nazwaRodzaju = p.rodzaj.znany ? EVENT_TYPE_LABELS[p.rodzaj.id] : p.rodzaj.komunikat;
    const przekreslone = p.stanPrzeszly === 'nie_odbylo_sie';
    const zapisujeTo = zapisWerdyktu === kluczWystapienia(p.id, p.dzien);
    return (
      <View key={`${p.id}-${p.zRegulyCyklicznej ? 'c' : 'j'}`} style={styles.it}>
        <View style={[styles.dot, KOLOR_KROPKI[p.kropka]]} />
        <Text style={[styles.itText, przekreslone && styles.itDone]} numberOfLines={2}>
          {p.tytul}
        </Text>
        {/* ⚠️ WT-12 / WG-06 — tag godziny WYŁĄCZNIE wtedy, gdy zawodnik ją podał.
            `p.godzina` jest `null`, a nie `''` ani `'—'`, właśnie po to, żeby
            nie dało się przypadkiem narysować pustego tagu wyglądającego na daną. */}
        {p.godzina ? <Text style={styles.tag}>{p.godzina}</Text> : null}
        {p.stanPrzeszly ? (
          <Text style={[styles.tag, p.stanPrzeszly === 'odbylo_sie' && styles.tagOk]}>
            {PLAKIETKI_STANU_PRZESZLEGO[p.stanPrzeszly]}
          </Text>
        ) : null}
        {!p.rodzaj.znany ? <Text style={styles.tag}>{nazwaRodzaju}</Text> : null}
        {/* ⭐ PLAN-D-D1 — JEDNO DOTKNIĘCIE. ⛔ Gałąź `brak` NIE RYSUJE przycisku
            wyszarzonego: przycisk, który nic nie robi, uczy, że klikanie nic
            nie daje. Dziś `brak` zachodzi u wszystkich, bo migracja
            `session_verdicts` czeka na wykonanie — a wtedy nie ma gdzie
            zapisać werdyktu i przycisk obiecywałby zapis, który padnie. */}
        {p.akcja.rodzaj === 'oznacz' ? (
          <TouchableOpacity
            style={styles.werdyktBtn}
            disabled={zapisujeTo}
            onPress={() => oznaczNieodbyte(p)}
          >
            <Text style={styles.werdyktTxt}>{p.akcja.etykieta}</Text>
          </TouchableOpacity>
        ) : null}
        {p.akcja.rodzaj === 'cofnij' ? (
          <TouchableOpacity
            style={styles.werdyktBtn}
            disabled={zapisujeTo}
            onPress={() => cofnijWerdykt(p)}
          >
            <Text style={styles.werdyktTxt}>{p.akcja.etykieta}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  function renderDzien(d: WierszDnia) {
    const segmenty = segmentyPaska(d.pasekZajetosci);
    const zapalone = SEGMENTY_WAGI[d.waga];
    return (
      <View key={d.data} style={styles.day}>
        <View style={styles.dhead}>
          {/* WT-07 — dzisiejszy dzień kolorem marki. */}
          <Text style={[styles.dname, d.dzisiaj && styles.dnameToday]}>{d.etykieta}</Text>
          {/* ⛔ WT-10 — PASEK ZAJĘTOŚCI ZE SZKOŁY. To NIE jest siatka godzinowa:
              rysuje wyłącznie godziny szkoły, czyli jedyne dane, które godzinę
              naprawdę mają. Pozycje są listą pod nim (WT-34 zostaje nietknięta). */}
          <View style={styles.busy}>
            {segmenty.map((s, i) => (
              <View key={i} style={[styles.busyFill, { left: `${s.lewo}%`, width: `${s.szerokosc}%` }]} />
            ))}
          </View>
          {d.pasekZajetosci.podpis ? (
            <Text style={styles.btime}>{d.pasekZajetosci.podpis}</Text>
          ) : null}
        </View>

        {/* WG-07 — krótki opis wagi dnia plus jej obraz. Trzy segmenty, bo
            wag jest trzy ponad zerem; `nie_wiem` nie zapala ani jednego. */}
        {d.opisWagi ? (
          <View style={styles.wagaRow}>
            <View style={styles.wagaPasek}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.wagaSeg, i < zapalone && styles.wagaSegOn]} />
              ))}
            </View>
            <Text style={styles.wagaOpis}>{d.opisWagi}</Text>
          </View>
        ) : null}

        {d.pozycje.map(renderPozycja)}

        {/* WT-16 — dzień bez pozycji ma WŁASNY podpis, a nie znika z tygodnia. */}
        {d.podpisPustegoDnia ? <Text style={styles.empty2}>{d.podpisPustegoDnia}</Text> : null}

        {/* ⛔ WT-11 — ostrzeżenie o kolizji stoi tu WYŁĄCZNIE wtedy, gdy znamy
            OBIE godziny. Brak którejkolwiek → nie ma ostrzeżenia, jest jawne
            „nie wiemy, kiedy masz szkołę" nad tygodniem. */}
        {d.napiecie ? <Text style={styles.tight}>↑ {d.napiecie.tekst}</Text> : null}
      </View>
    );
  }

  function renderTydzien() {
    return (
      <View>
        {/* WT-04 + WT-05 — strzałki i zakres dat. */}
        <View style={styles.navrow}>
          <TouchableOpacity
            style={styles.arrow}
            onPress={() => { const p = przesunTydzien(poniedzialek, -1); if (p) setPoniedzialek(p); }}
          >
            <Text style={styles.arrowTxt}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.wk}>{tydzien.zakresDat}</Text>
          <TouchableOpacity
            style={styles.arrow}
            onPress={() => { const p = przesunTydzien(poniedzialek, 1); if (p) setPoniedzialek(p); }}
          >
            <Text style={styles.arrowTxt}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ⛔ R5 — NIEUDANY ODCZYT MA WŁASNE ZDANIE. Nie jest pustką i nie
            udaje pustego kalendarza. */}
        {!tydzien.odczyt.wydarzenia ? (
          <Text style={styles.blad}>{NIE_UDALO_SIE_ODCZYTAC_TYGODNIA}</Text>
        ) : null}

        {/* ⭐ WT-08 + WT-09 — jedno zdanie nad tygodniem. Powstaje WYŁĄCZNIE
            z policzonych wierszy; przy braku danych nie ma go wcale. */}
        {tydzien.zdanie ? (
          <View style={styles.lede}>
            <Text style={styles.ledeMain}>{tydzien.zdanie.podsumowanie}</Text>
            {tydzien.zdanie.napiecie ? (
              <Text style={styles.ledeSub}>{tydzien.zdanie.napiecie}</Text>
            ) : null}
          </View>
        ) : null}

        {/* WT-31 — „nie wiemy, kiedy masz szkołę". Stoi też wtedy, gdy tydzień
            MA pozycje: pasek zajętości jest wtedy pusty u każdego dnia i bez
            tego zdania wygląda to jak tydzień bez szkoły. Przy pustym tygodniu
            mówi to samo `rozpoznajPustke` niżej — nie dublujemy. */}
        {tydzien.planLekcjiZnany === false && pustkaTygodnia === null ? (
          <View style={styles.konfig}>
            <Text style={styles.konfigTxt}>{PUSTKA_BRAK_KONFIGURACJI_TEKST}</Text>
            <TouchableOpacity onPress={() => router.push('/profil')}>
              <Text style={styles.pustkaCta}>{PUSTKA_BRAK_KONFIGURACJI_CTA} →</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ⚠️ PLAN-D-T 08.2026 (14.08.2026), zadanie T6 — TRZY PUSTKI ZAMIAST
            JEDNEJ. Stało tu „Brak zaplanowanych wydarzeń." — jedno zdanie na
            trzy różne sytuacje. Zawodnik, któremu wygasł dostęp, czytał, że
            NIC NIE MA, zamiast dowiedzieć się, że produkt przestał przyjmować
            jego wpisy. Rozstrzygnięcie jest czystą funkcją (lib/trzyPustki.ts);
            ten ekran je WYKONUJE, nie podejmuje. */}
        {pustkaTygodnia ? (
          <View>
            <Text style={styles.empty}>{pustkaTygodnia.tekst}</Text>
            {/* WT-33 — pustka kończy się DOKŁADNIE JEDNĄ akcją, i to taką,
                która TĘ pustkę zamyka. „Dodaj trening" prowadzi do formularza,
                „Wpisz swój plan lekcji" i „Przedłuż dostęp" — do Profilu, bo
                tam mieszka jedno i drugie. Pustka z wyjściem donikąd jest
                ślepym zaułkiem, a nie wyjściem. */}
            <TouchableOpacity onPress={() => {
              if (pustkaTygodnia.rodzaj === 'brak_danych') setZakladka('listy');
              else router.push('/profil');
            }}>
              <Text style={styles.pustkaCta}>{pustkaTygodnia.cta} →</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ⭐ SIEDEM WIERSZY DNI — zawsze siedem, także w pustym tygodniu.
            Tydzień, który kurczy się do dni z treścią, przestaje być tygodniem
            (WT-06, WG-02). */}
        {tydzien.dni.map(renderDzien)}

        {/* WT-18 — legenda kropek. Brzmienia co do znaku z makiety. */}
        <Text style={styles.sectionLabel}>Legenda</Text>
        {LEGENDA_KROPEK.map((l) => (
          <View key={l.kropka} style={styles.it}>
            <View style={[styles.dot, KOLOR_KROPKI[l.kropka]]} />
            <Text style={styles.itText}>{l.opis}</Text>
          </View>
        ))}
      </View>
    );
  }

  function renderListy() {
    // ⛔ PLAN-D-C1 — SEKCJE POWSTAJĄ TYLKO Z ODCZYTANYCH DANYCH. Przy `null`
    // nie budujemy pustych list, tylko mówimy, że odczyt się nie udał.
    if (events === null) {
      return <Text style={styles.blad}>{NIE_UDALO_SIE_ODCZYTAC_TYGODNIA}</Text>;
    }
    const byDateAsc = (a: CalEvent, b: CalEvent) =>
      (a.scheduled_date! < b.scheduled_date! ? -1 : a.scheduled_date! > b.scheduled_date! ? 1 : 0);
    const recurring = events.filter((e) => e.status === 'scheduled' && e.recurrence_rule);
    // ⚠️ PLAN-D-A7 08.2026 — DO 14.08.2026 STAŁO TU `e.status === 'scheduled'`.
    // Migracja A1 (wykonana 14.08) dopuściła `status = 'completed'`, a pas A1
    // ustawia go z Dziennika przy zaliczeniu sesji Bloku. Ten ekran filtrował
    // po `'scheduled'` w KAŻDEJ z trzech sekcji, więc pierwsze wydarzenie
    // oznaczone jako wykonane ZNIKNĘŁOBY z kalendarza bez śladu — razem
    // z każdym meczem, który od tej rundy zapisuje ekran Mecz. Zapis by się
    // udał, ekran by milczał: „cichy brak" w czystej postaci.
    // Kryterium jest teraz DATA, nie status; status idzie na plakietkę niżej.
    const scheduledWithDate = events.filter(
      (e) => (e.status === 'scheduled' || e.status === 'completed') && e.scheduled_date,
    );
    const upcoming = scheduledWithDate.filter((e) => e.scheduled_date! >= todayStr).sort(byDateAsc);
    const past = scheduledWithDate.filter((e) => e.scheduled_date! < todayStr).sort((a, b) => -byDateAsc(a, b));
    const cancelled = events.filter((e) => e.status === 'cancelled');

    return (
      <View>
        <View style={styles.block}>
          <Text style={styles.label}>Rodzaj</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={eventType} onValueChange={setEventType}>
              {Object.entries(EVENT_TYPE_LABELS).map(([id, label]) => <Picker.Item key={id} label={label} value={id} />)}
            </Picker>
          </View>

          <Text style={styles.label}>Tytuł</Text>
          <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} value={title} onChangeText={setTitle} placeholder="np. Trening siłowy" />

          <Text style={styles.label}>Notatka (opcjonalnie)</Text>
          <TextInput style={[styles.input, styles.textarea]} placeholderTextColor={colors.textSecondary} value={notes} onChangeText={setNotes} multiline placeholder="Dodatkowe informacje" />

          <View style={styles.toggle}>
            <TouchableOpacity style={[styles.toggleBtn, frequency === 'once' && styles.toggleBtnActive]} onPress={() => setFrequency('once')}>
              <Text style={[styles.toggleTxt, frequency === 'once' && styles.toggleTxtActive]}>Jednorazowe</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, frequency === 'recurring' && styles.toggleBtnActive]} onPress={() => setFrequency('recurring')}>
              <Text style={[styles.toggleTxt, frequency === 'recurring' && styles.toggleTxtActive]}>Cykliczne</Text>
            </TouchableOpacity>
          </View>

          {frequency === 'once' ? (
            <>
              <Text style={styles.label}>Data</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: date ? colors.textPrimary : colors.textSecondary }}>
                  {date ? date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Wybierz datę'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date ?? new Date()}
                  mode="date"
                  onChange={(_event, selected) => {
                    setShowDatePicker(false);
                    if (selected) setDate(selected);
                  }}
                />
              )}
            </>
          ) : (
            <>
              <Text style={styles.label}>Dni tygodnia</Text>
              <View style={styles.daysRow}>
                {DAYS_OF_WEEK.map(([code, label]) => (
                  <TouchableOpacity key={code} style={styles.dayCheck} onPress={() => toggleDay(code)}>
                    <Checkbox value={selectedDays.has(code)} onValueChange={() => toggleDay(code)} />
                    <Text style={styles.dayCheckLabel}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* PLAN-D-A7 08.2026 — GODZINA, KTÓREJ WOLNO NIE BYĆ.
              Stoi POZA gałęzią „jednorazowe / cykliczne" świadomie: trening
              klubowy w każdy wtorek o 18:00 ma godzinę tak samo jak pojedynczy
              mecz. Pole jest tekstowe, a nie zegarkowe — `DateTimePicker` w trybie
              `time` zawsze JAKĄŚ godzinę pokazuje, więc nie umie wyrazić „nie
              podałem", a to jest tu stan poprawny i najczęstszy. */}
          <Text style={styles.label}>Godzina (opcjonalnie)</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
            value={godzina}
            onChangeText={setGodzina}
            keyboardType="numbers-and-punctuation"
            placeholder="np. 18:00 — zostaw puste, jeśli nie wiesz"
          />

          <Text style={styles.label}>Powiąż z wąskim gardłem (opcjonalnie)</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={goalId} onValueChange={setGoalId}>
              <Picker.Item label="— nie dotyczy —" value="" />
              {activeGoals.map((g) => (
                <Picker.Item
                  key={g.id}
                  label={(SEG_LABELS[g.segment_id] || g.segment_id) + (g.refinement_note ? ' — ' + g.refinement_note : '')}
                  value={String(g.id)}
                />
              ))}
            </Picker>
          </View>

          <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} disabled={saving} onPress={createCalendarEvent}>
            <Text style={styles.btnText}>{saving ? 'Zapisuję...' : 'Dodaj do kalendarza'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionLabel}>Cykliczne</Text>
          {recurring.length === 0 && <Text style={styles.empty}>Brak cyklicznych wpisów.</Text>}
          {recurring.map(renderEventCard)}
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionLabel}>Nadchodzące</Text>
          {upcoming.length === 0 && pustkaTygodnia ? (
            <View>
              <Text style={styles.empty}>{pustkaTygodnia.tekst}</Text>
              <Text style={styles.pustkaCta}>{pustkaTygodnia.cta} →</Text>
            </View>
          ) : null}
          {upcoming.map(renderEventCard)}
        </View>

        {past.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <TouchableOpacity onPress={() => setShowPast((v) => !v)}>
              <Text style={styles.sectionLabel}>{showPast ? '▾' : '▸'} Minione ({past.length})</Text>
            </TouchableOpacity>
            {showPast && past.map(renderEventCard)}
          </View>
        )}

        <View style={{ marginTop: 20 }}>
          <TouchableOpacity onPress={() => setShowCancelled((v) => !v)}>
            <Text style={styles.sectionLabel}>{showCancelled ? '▾' : '▸'} Anulowane</Text>
          </TouchableOpacity>
          {showCancelled && (
            cancelled.length === 0
              ? <Text style={styles.empty}>Brak anulowanych wpisów.</Text>
              : cancelled.map(renderEventCard)
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <Text style={styles.title}>Kalendarz treningowy</Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {ok && <Text style={styles.ok}>{ok}</Text>}

      {/* ⭐ WT-03 — zakładki Tydzień / Listy WEWNĄTRZ ekranu Kalendarz.
          Nie piąta zakładka w pasku (WT-01 zostaje nietknięta) — przełącznik
          wewnątrz ekranu, dokładnie jak w makiecie. */}
      <View style={styles.seg}>
        <TouchableOpacity
          style={[styles.segBtn, zakladka === 'tydzien' && styles.segBtnOn]}
          onPress={() => setZakladka('tydzien')}
        >
          <Text style={[styles.segTxt, zakladka === 'tydzien' && styles.segTxtOn]}>Tydzień</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, zakladka === 'listy' && styles.segBtnOn]}
          onPress={() => setZakladka('listy')}
        >
          <Text style={[styles.segTxt, zakladka === 'listy' && styles.segTxtOn]}>Listy</Text>
        </TouchableOpacity>
      </View>

      {zakladka === 'tydzien' ? renderTydzien() : renderListy()}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 28, marginBottom: spacing.lg, color: colors.textPrimary },
  label: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6, marginTop: 4 }, // W1: ink3
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 12, marginTop: 18 }, // W1: ink3
  // PLAN-D-T (T6) — wyjście z pustki. Te same wartości co `cardAction` na
  // „Dziś": to jest ta sama rzecz co „zobacz" na innych kartach.
  pustkaCta: { ...typography.bodyMedium, fontSize: 13, color: colors.brand, marginTop: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 10, fontSize: 14, marginBottom: 8, color: colors.textPrimary, minHeight: minTouchHeight, justifyContent: 'center' },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  pickerWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, marginBottom: 8 },
  block: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 16, marginBottom: 20 },
  toggle: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleBtn: { flex: 1, minHeight: minTouchHeight, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  toggleTxt: { ...typography.bodyMedium, fontSize: 14, color: colors.textPrimary },
  toggleTxtActive: { color: colors.white },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 12 },
  dayCheck: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayCheckLabel: { fontSize: 13, color: colors.textPrimary },
  btn: { minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.4 },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  error: { color: colors.error, fontSize: 13, marginBottom: 12 },
  ok: { color: colors.success, fontSize: 13, marginBottom: 12 },
  empty: { textAlign: 'center', padding: 24, color: colors.textSecondary, fontSize: 14 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 2 },
  cardTitle: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  cardSubtitle: { fontSize: 11, color: colors.textSecondary, marginBottom: 8 },
  cardNote: { ...typography.body, fontSize: 13, color: colors.textPrimary, marginBottom: 8 },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  badge: { fontSize: 11, letterSpacing: 0.5, marginLeft: 8, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  // W1: tła odznak z tokenów (koniec rgba na sztywno; lib/theme.ts)
  badgeCompleted: { backgroundColor: colors.okSoft, color: colors.success },
  badgeMuted: { backgroundColor: colors.surfaceElevated, color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  secondaryBtn: { paddingVertical: 10, paddingHorizontal: 18, minHeight: minTouchHeight, justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, alignSelf: 'flex-start' },
  secondaryBtnText: { ...typography.bodyMedium, fontSize: 13, color: colors.textPrimary, letterSpacing: 0.5 },

  // ── PLAN-D-C1 — WIDOK TYGODNIA ────────────────────────────────────
  seg: { flexDirection: 'row', backgroundColor: colors.surfaceElevated, borderRadius: radii.md, padding: 3, marginBottom: 14 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: minTouchHeight, borderRadius: radii.sm },
  segBtnOn: { backgroundColor: colors.surface },
  segTxt: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  segTxtOn: { ...typography.bodySemiBold, color: colors.textPrimary },
  navrow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  arrow: { width: minTouchHeight, height: minTouchHeight, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  arrowTxt: { fontSize: 18, color: colors.textSecondary },
  wk: { ...typography.display, fontSize: 19, letterSpacing: 0.4, color: colors.textPrimary },
  lede: { backgroundColor: colors.surfaceElevated, borderRadius: radii.md, padding: 12, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: colors.brand },
  ledeMain: { ...typography.body, fontSize: 14, color: colors.textPrimary },
  ledeSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  blad: { fontSize: 13, color: colors.warning, marginBottom: 12 },
  konfig: { borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: colors.caution, borderRadius: radii.md, padding: 12, marginBottom: 14 },
  konfigTxt: { fontSize: 13, color: colors.textPrimary },
  day: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, paddingBottom: 10 },
  dhead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dname: { ...typography.display, fontSize: 16, letterSpacing: 0.6, minWidth: 74, color: colors.textPrimary },
  dnameToday: { color: colors.brand },
  busy: { flex: 1, height: 7, backgroundColor: colors.track, borderRadius: 4, overflow: 'hidden' },
  busyFill: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.textTertiary },
  btime: { fontSize: 11, color: colors.textTertiary },
  wagaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, paddingLeft: 4 },
  wagaPasek: { flexDirection: 'row', gap: 2 },
  wagaSeg: { width: 10, height: 3, borderRadius: 2, backgroundColor: colors.track },
  wagaSegOn: { backgroundColor: colors.brand },
  wagaOpis: { fontSize: 11, letterSpacing: 0.5, color: colors.textTertiary },
  it: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 3, paddingLeft: 4 },
  itText: { flex: 1, fontSize: 13, color: colors.textPrimary },
  itDone: { color: colors.textTertiary, textDecorationLine: 'line-through' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tag: { fontSize: 10, color: colors.textSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
  tagOk: { color: colors.success, borderColor: colors.okSoft, backgroundColor: colors.okSoft },
  // ⭐ PLAN-D-D1 — przycisk werdyktu. `minHeight: minTouchHeight` nie jest
  // ozdobą: cel dotykowy mniejszy od progu to akcja, której zawodnik nie trafia,
  // a nietrafiona akcja wygląda dokładnie jak akcja, której nie chciał wykonać.
  werdyktBtn: { minHeight: minTouchHeight, justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, backgroundColor: colors.surface },
  werdyktTxt: { fontSize: 11, color: colors.textSecondary },
  empty2: { fontSize: 12, color: colors.textTertiary, fontStyle: 'italic', paddingLeft: 4, paddingVertical: 2 },
  tight: { fontSize: 12, color: colors.brand, paddingLeft: 19, paddingTop: 2 },
});
