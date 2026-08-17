// PLAN-D-C2 08.2026 (14.08.2026) — NOWY PLIK. Zadanie C2.2.
//
// „MOJE ZADANIA" — DRUGA POŁOWA KOLEJKI PODANIA.
//
// ═════════════════════════════════════════════════════════════════════
// CZYM TEN EKRAN JEST
//
// Pas B2 pokazał na „Dziś" CZTERY PIERWSZE pozycje kolejki (głębokość 0,
// zero dotknięć). Ten ekran pokazuje WSZYSTKIE, w trzech kubełkach, dla
// dociekliwego (głębokość 2). ⚠️ TA SAMA kolejka, TEN SAM ranker, TEN SAM
// komponent pozycji. Zero drugiej kopii czegokolwiek z tej trójki.
//
// ── DLACZEGO TO JEST MODAL, A NIE TRASA W `app/(tabs)/` ──────────────
// Bo `app/(tabs)/_layout.tsx` mówi wprost w swoim nagłówku: „Expo Router
// pokazuje w pasku KAŻDY plik z tego katalogu, także ten, którego tu nie
// wymieniono. Nowy plik w `app/(tabs)/` bez wpisu `href: null` poniżej pojawi
// się jako PIĄTA ZAKŁADKA." Wpisu w `_layout.tsx` ten pas zrobić nie może —
// plik nie należy do jego zakresu — więc trasa oznaczałaby albo edycję cudzego
// pliku, albo złamanie zasady A1 („żadnej piątej zakładki"). Modal nie ma tego
// problemu i JEST W TYM PLIKU JUŻ USTALONYM WZORCEM: dokładnie tak wchodzą
// `components/MojaDroga.tsx` (Mapa drogi) i `components/SciezkaWyjscia.tsx`,
// obie otwierane z ekranu „Ja", obie z tym samym uzasadnieniem w nagłówku.
//
// Drugi powód, zmierzony: sekcja wewnątrz `ja.tsx` pogłębiłaby EK-60
// („Ustawienia i Wyloguj mieszczą się w jednym ekranie", stan `NIE MA`).
// Ekran „Ja" miał po rundzie 4 od 2,26 do 2,64 ekranu scrolla i to był powód,
// dla którego biblioteka wyprowadziła się na własną trasę. Lista, która
// u zawodnika z sześcioma wydarzeniami ma sześć pozycji z powodem, czasem
// i przełącznikiem „skąd to wiemy", dołożyłaby tam kolejny ekran przewijania.
// Tutaj „Ja" rośnie o JEDEN wiersz wejścia.
//
// ── CZTERY ZAKAZY, KTÓRE OBOWIĄZUJĄ TEN PLIK ────────────────────────
//  1. ⛔ ZERO `.sort(`. Kolejność należy do `lib/kolejkaPodania.ts` (pas B1).
//     Kolejność, która się nie podoba, jest ZGŁOSZENIEM DO PASA B1, a nie
//     powodem, żeby ekran znów zaczął układać własną.
//  2. ⛔ ZERO własnego komponentu pozycji. `PozycjaKolejkiCard` jest jedyną
//     kopią rysowania pozycji i ten plik go IMPORTUJE, a nie przepisuje.
//     Druga karta pozycji to dokładnie ten defekt kolażu, który etap B wyciął.
//  3. ⛔ ZERO `?? []` i ZERO `catch {}` przy budowaniu wejść. Trzy stany każdego
//     wejścia idą przez `wejscieZOdpowiedzi` z `lib/listaZadan.ts`.
//  4. ⛔ ZERO wiersza `player_tasks` dokładanego „na próbę". Pusta lista jest
//     uczciwa; zamalowana nie.
//
// ── ⭐ PLAN-D-T1 08.2026 (16.08.2026) — TEN EKRAN DOSTAJE PRODUCENTA ─
// Do dziś `player_tasks` nie miała w CAŁYM PRODUKCIE ani jednego `insert`:
// ekran z trzema kubełkami, polem odhaczenia i sumą czasu nie mógł dostać
// ani jednej rzeczy do odhaczenia, choćby zawodnik używał aplikacji rok.
// Pole „Dopisz coś swojego" jest producentem (a) — zadaniem WŁASNYM zawodnika,
// zapisywanym przez RLS (`origin='player'`, pola systemowe puste, bo tyle
// wpuszcza polityka `player_tasks_insert_own`).
// ⚠️ ZAKAZ 4 WYŻEJ ZOSTAJE NIENARUSZONY: pole nie dokłada wiersza „na próbę"
// ani przykładowego. Gdy zawodnik nie ma zadań, zdanie `ZADANIA_BRAK` nadal
// mówi, że ich nie ma — pole stoi OBOK tego zdania, nie zamiast niego.
// ⛔ Producent (b) — zadanie systemowe z wglądu — NIE MIESZKA W APPCE i mieszkać
// nie może: polityka RLS zawodnika odrzuci wiersz z `system_key`, i to jest
// zabezpieczenie, nie przeszkoda. Buduje go `zbudujZadanieSystemoweZWgladu`
// z `lib/zadania.ts`, a wstawia backend na `service_role` (kontrakt: nota T1 §7).
//
// ── CZEGO TEN EKRAN ŚWIADOMIE NIE BUDUJE — i co z tego wynika ────────
// `jednaOdpowiedz` = `null`. Powód nie jest lenistwem: jest dziś PRODUKOWANA
// WEWNĄTRZ `app/(tabs)/dzis.tsx` (`zbudujJednaOdpowiedz` z ośmioma wejściami
// tamtego ekranu). Odtworzenie jej tutaj znaczyłoby DRUGIEGO PRODUCENTA tej
// samej pozycji — czyli dokładnie defekt, którego ten etap się pozbywa;
// a odtworzenie jej niedokładnie (bez `hintState`, bez dawki treści) dałoby
// zawodnikowi DWIE RÓŻNE „jedne odpowiedzi" na dwóch ekranach. `null` jest
// w kontrakcie B1 opisane wprost jako „ekran jej nie policzył" i jest stanem
// uczciwym.
// ⚠️ TO SAMO DOTYCZY DWÓCH KANDYDATÓW BUDOWANYCH LOKALNIE NA „DZIŚ":
// kandydata REKOMENDACJI (`decision_recommendations` + `odpowiedz.dlaczego`)
// i kandydata WPISU DZIENNIKA (`daily_logs`, „czy jest dzisiejszy wpis").
// Oba powstają z ośmiu wejść tamtego ekranu i tutaj ICH NIE MA — odtworzone
// byłyby drugim producentem. ⚠️ SKUTEK, NAZWANY: ta lista NIE POKAZUJE
// pozycji nr 1 z „Dziś" ani zaproszenia do wpisu w Dzienniku.
//
// ── ⭐ PLAN-D-A2 08.2026 (16.08.2026) — CO SIĘ ZMIENIŁO: `dodatkowi` ──
// Do 16.08.2026 stało tu także „`dodatkowi` = brak", z tym samym uzasadnieniem.
// ⛔ DLA WGLĄDÓW BYŁO ONO NIESŁUSZNE i to jest cała treść pasa A2:
// `policzWglady` (`lib/wgladyZAlgorytmu.ts`, pas B3) JEST JUŻ JEDYNYM
// PRODUCENTEM WGLĄDÓW — czystą funkcją z jednym argumentem, bez bazy, bez
// zegara, bez pamięci. Zawołanie jej stąd nie tworzy drugiego producenta,
// tylko drugiego KONSUMENTA.
// ZMIERZONE 17.08.2026 na zawodniku 8d7e1ebb… (żywe dane, `select`):
//   • „Dziś"  →  5 pozycji, w tym 2 wglądy;
//   • ta lista →  1 pozycja,  w tym 0 wglądów.
// Wgląd „Nie znamy Twojego rocznika…" stał na PIĄTYM miejscu kolejki, czyli
// poza prefiksem „Dziś" (4 pozycje) — i był policzony, poprawny, przechodził
// bramkę rankera, a NIE MIAŁ ŻADNEGO WIDOKU, KTÓRY BY GO WYDAŁ. Po tym pasie
// stoi na tej liście na miejscu 3, w kubełku „Kiedyś".
// ⚠️ KUBEŁEK WYZNACZA RANKER, NIE TEN EKRAN — pozycja i waga wglądu to wynik
// `lib/kolejkaPodania.ts` i ten plik ich nie dotyka.
// ⚠️ CZEGO TA LISTA NADAL NIE RYSUJE: TRZECIEJ CZĘŚCI wglądu („jedna rzecz
// do zrobienia", `wgladDlaPozycji`). Rysuje ją komponent `WgladPozycji`, który
// mieszka DZIŚ WEWNĄTRZ `app/(tabs)/dzis.tsx` — przepisanie go tutaj byłoby
// drugą kopią rysowania (zakaz 2 wyżej). Domknięcie: wyprowadzić `WgladPozycji`
// do `components/` i podpiąć oba ekrany. Nazwane, nie przemilczane.
// ═════════════════════════════════════════════════════════════════════
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii, minTouchHeight } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { toLocalDateStr } from '../lib/date-utils';
// ⭐ JEDYNA KOPIA RYSOWANIA POZYCJI (pas B2). Importowana, nie przepisana.
import PozycjaKolejkiCard, {
  KUBELEK_ETYKIETA,
  opiszCzas,
} from './PozycjaKolejkiCard';
// ⭐ JEDYNE ŹRÓDŁO KOLEJNOŚCI (pas B1). Ten ekran wybiera wyłącznie KUBEŁEK,
// a i tego nie liczy sam — liczy to `wezKubelek`.
import {
  ulozKolejke,
  wezKubelek,
  type Kandydat,
  type Kolejka,
  type Kubelek,
  type PozycjaKolejki,
  type WejsciaKolejki,
  type Wejscie,
  type WydarzenieKalendarza,
  type WpisDziennikaWejscie,
  type WpisBolu,
  type WejscieCelu,
  type WejscieMeczu,
  MILCZENIE_SCIEZKA_WYJSCIA,
} from '../lib/kolejkaPodania';
import {
  odczytZadan,
  opisOdczytuDoLogu,
  zbudujZadanieWlasne,
  MAKS_DLUGOSC_TYTULU,
  SELECT_ZADANIA,
  TABELA_ZADAN,
  type OdczytZadan,
} from '../lib/zadania';
import {
  stanGlosu,
  opisDoLogu,
  poniedzialekTygodnia as poniedzialekGlosu,
  type WierszGlosu,
} from '../lib/glosTygodnia';
import {
  czytajOgraniczenia,
  opisOgraniczenDoLogu,
  isMissingOgraniczeniaColumnError,
  KOLUMNA_OGRANICZEN,
} from '../lib/ograniczenia';
import {
  KUBELKI_LISTY,
  NAGLOWEK_LISTY,
  PODTYTUL_LISTY,
  ZAMKNIJ_LISTE,
  LISTA_WCZYTUJE,
  LISTA_NIEPELNA,
  KUBELEK_PUSTY,
  ROZWIN_KUBELEK,
  ZWIN_KUBELEK,
  PODNIES_DO_TERAZ,
  ODHACZ,
  ODHACZONE_PREFIKS,
  BLAD_ODHACZENIA,
  BLAD_PODNIESIENIA,
  podsumujKubelek,
  opiszSume,
  zdanieOdczytu,
  zdanieNiepelnosci,
  idZadaniaZPozycji,
  mozliwePodniesienie,
  mozliweOdhaczenie,
  wejscieZOdpowiedzi,
  powodBledu,
  DODAJ_NAGLOWEK,
  DODAJ_PLACEHOLDER,
  DODAJ_PRZYCISK,
  DODAJ_ZAPISUJE,
  DODANE_PREFIKS,
  BLAD_DODANIA,
  zdanieOdmowyDodania,
} from '../lib/listaZadan';
// ═════════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-A2 08.2026 (16.08.2026) — TA LISTA WIDZI WGLĄDY.
//
// `policzWglady` jest JEDYNYM producentem wglądów i jest CZYSTĄ FUNKCJĄ
// z jednym argumentem: nie czyta bazy, nie czyta zegara, nie ma pamięci.
// Zawołanie jej stąd NIE TWORZY drugiego producenta — tworzy drugiego
// KONSUMENTA. Wejścia buduje `zbudujWejsciaWgladow` z `lib/wejsciaWgladow.ts`,
// czyli TA SAMA funkcja, którą woła `app/(tabs)/dzis.tsx` (decyzja A2 D4).
// ═════════════════════════════════════════════════════════════════════
import {
  policzWglady,
  type WejsciaWgladow,
  type WynikiWgladow,
} from '../lib/wgladyZAlgorytmu';
import {
  zbudujWejsciaWgladow,
  TABELA_MECZOW, SELECT_MECZOW,
  TABELA_PROFILU, SELECT_PROFILU,
  TABELA_KATALOGU, SELECT_KATALOGU, KOLUMNA_ODBIORCY, ODBIORCY_KATALOGU,
  TABELA_ODCINKOW, SELECT_ODCINKOW,
} from '../lib/wejsciaWgladow';

// Kształty wierszy, dokładnie takie, w jakich wracają z bazy. ⚠️ Te same
// kolumny co w `app/(tabs)/dzis.tsx` — kontrakt rankera §3 wymaga kompletu.
type Goal = { id: number; segment_id: string; is_priority: boolean };
type FocusBlockRow = { id: string; segment_id: string; status: string };
type CalEvent = {
  id: number; title: string; event_type: string; scheduled_date: string | null;
  scheduled_time: string | null; status: string;
  recurrence_rule: string | null; focus_block_id: string | null;
};
type WierszDziennika = {
  id: number; entry_type: string | null;
  payload: Record<string, unknown> | null; created_at: string;
};
type WierszBolu = {
  id: number; intensity: number | null;
  excludes_from_training: boolean | null; created_at: string;
};

type DaneListy = {
  wejscia: WejsciaKolejki;
  /** ⚠️ Trzymany osobno, bo cztery stany R5 mają dać CZTERY RÓŻNE ZDANIA. */
  odczyt: OdczytZadan;
  /**
   * ⭐ PLAN-D-A2 — SZEŚĆ WEJŚĆ PRODUCENTA WGLĄDÓW. `dzis` tu nie stoi: bierze
   * się z `wejscia.dzis`, żeby ranker i producent wglądów nie mogły dostać
   * DWÓCH RÓŻNYCH dni. Jeden napis, jedno źródło — tak samo jak na „Dziś".
   *
   * ⛔ TU NIE MA POLICZONYCH WGLĄDÓW I TO JEST DECYZJA. `policzWglady` jest
   * czystą funkcją, więc jej wynik liczy `useMemo` przy renderze; wynik
   * przechowany w stanie byłby drugą kopią prawdy, którą da się nie odświeżyć.
   */
  wejsciaWgladow: Omit<WejsciaWgladow, 'dzis'>;
};

function liczbaAlboNull(x: unknown): number | null {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

/**
 * ⚠️ TA SAMA KONWERSJA CO W `app/(tabs)/dzis.tsx` i w `app/(tabs)/dziennik.tsx`:
 * Dziennik zapisuje `payload.morning_fatigue = 10 − energia`. Własna konwersja
 * dałaby dwie różne energie tego samego zawodnika na dwóch ekranach.
 */
function wpisDziennikaDlaKolejki(w: WierszDziennika): WpisDziennikaWejscie {
  const p: Record<string, unknown> = w.payload && typeof w.payload === 'object' ? w.payload : {};
  const zmeczenie = liczbaAlboNull(p.morning_fatigue);
  return {
    dzien: toLocalDateStr(new Date(w.created_at)),
    senGodziny: liczbaAlboNull(p.sleep_hours),
    energia: zmeczenie === null ? null : 10 - zmeczenie,
    rpe: liczbaAlboNull(p.rpe),
  };
}

function wpisBoluDlaKolejki(w: WierszBolu): WpisBolu {
  return {
    dzien: toLocalDateStr(new Date(w.created_at)),
    intensywnosc: liczbaAlboNull(w.intensity) ?? 0,
    wykluczaZTreningu: w.excludes_from_training === true,
  };
}

type Props = { visible: boolean; onClose: () => void; userId: string | null };

export default function ListaZadan({ visible, onClose, userId }: Props) {
  const [dane, setDane] = useState<DaneListy | null>(null);
  const [laduje, setLaduje] = useState(true);
  const [zapisuje, setZapisuje] = useState<string | null>(null);
  const [bladZapisu, setBladZapisu] = useState<string | null>(null);
  const [ostatnioOdhaczone, setOstatnioOdhaczone] = useState<string | null>(null);
  // ⭐ PLAN-D-T1 — producent (a). ⚠️ `nowyTytul` NIE jest czyszczony przy błędzie
  // zapisu: tekst, który zawodnik napisał, nie ma prawa zniknąć dlatego, że
  // baza odmówiła. Pilnuje tego asercja w `lib/zadania.selftest.ts`.
  const [nowyTytul, setNowyTytul] = useState('');
  const [dodaje, setDodaje] = useState(false);
  const [bladDodania, setBladDodania] = useState<string | null>(null);
  const [ostatnioDodane, setOstatnioDodane] = useState<string | null>(null);
  // WT-29 — „Kiedyś" startuje ZWINIĘTY. Dwa pozostałe są rozwinięte: rzecz
  // z terminem jest rzeczą na teraz, a nie do przeglądania.
  const [rozwiniete, setRozwiniete] = useState<Record<Kubelek, boolean>>({
    teraz: true, w_tym_tygodniu: true, kiedys: false,
  });

  const load = useCallback(async () => {
    if (!userId) return;
    setLaduje(true);
    const dzisStr = toLocalDateStr(new Date());

    const [goalsRes, blocksRes, eventsRes, dziennikRes, bolRes, zadaniaRes, glosRes,
      meczeRes, profilRes, katalogRes, odcinkiRes] =
      await Promise.all([
        supabase.from('goals').select('id,segment_id,is_priority')
          .eq('user_id', userId).eq('status', 'active'),
        supabase.from('focus_blocks').select('id,segment_id,status')
          .eq('user_id', userId).eq('status', 'active'),
        supabase.from('calendar_events')
          .select('id,title,event_type,scheduled_date,scheduled_time,status,recurrence_rule,focus_block_id')
          .eq('user_id', userId).in('status', ['scheduled', 'completed']),
        // ⭐ PLAN-D-A2 16.08.2026 — DOSZŁA JEDNA KOLUMNA: `calendar_event_id`.
        // ⚠️ TO JEST ROZSZERZENIE ISTNIEJĄCEGO ZAPYTANIA, NIE NOWE ZAPYTANIE —
        // ten sam ruch i to samo uzasadnienie, którym B4 dołożył `body_location`
        // do `pain_entries` na „Dziś". Bez niej wgląd o wpisach bez powiązania
        // z sesją policzyłby na tym ekranie CO INNEGO niż na „Dziś" — a zawodnik
        // nie ma prawa dostać dwóch różnych zdań o tej samej rzeczy (A2 D5).
        supabase.from('daily_logs').select('id,entry_type,payload,created_at,calendar_event_id')
          .eq('user_id', userId).order('created_at', { ascending: false }),
        // ⭐ PLAN-D-A2 — DOSZŁA JEDNA KOLUMNA: `body_location`. Wgląd WT-25
        // („ten sam ból trzeci raz") grupuje zgłoszenia po miejscu; bez tej
        // kolumny musiałby zgadywać, czy trzy zgłoszenia to trzy razy to samo.
        supabase.from('pain_entries').select('id,body_location,intensity,excludes_from_training,created_at')
          .eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
        // ⭐ WEJŚCIE, O KTÓRE CHODZI W CAŁYM TYM PASIE.
        // ⚠️ PLAN-D-T1 16.08.2026 — POPRAWKA KOMENTARZA, KTÓRY STARZAŁ SIĘ CICHO
        // (O67). Stało tu: „Zmierzone 14.08.2026: `player_tasks` ma 0 wierszy…
        // producenta zadań buduje pas B3". Producent (a) jest OD TERAZ W TYM
        // PLIKU (pole „Dopisz coś swojego" niżej), więc to zapytanie przestaje
        // z definicji oddawać `brak_danych`.
        // ⚠️ Pomiar produkcji 16.08.2026: `player_tasks` nadal ma 0 wierszy —
        // ale teraz dlatego, że nikt jeszcze nic nie dopisał, a nie dlatego,
        // że nie ma czym.
        supabase.from(TABELA_ZADAN).select(SELECT_ZADANIA).eq('user_id', userId),
        supabase.from('weekly_voice')
          .select(`week_start, voice, reason, spoke_at, ${KOLUMNA_OGRANICZEN}`)
          .eq('user_id', userId).eq('week_start', poniedzialekGlosu(new Date())).limit(1),
        // ═══════════════════════════════════════════════════════════
        // ⭐ PLAN-D-A2 16.08.2026 — CZTERY ZAPYTANIA, KTÓRYCH TEN EKRAN
        // NIE MIAŁ, DOŁOŻONE DO TEJ SAMEJ PACZKI `Promise.all`.
        //
        // Koszt: ZERO dodatkowych rund sieci. Trzy pozostałe odpowiedzi,
        // których producent wglądów potrzebuje (Dziennik, kalendarz, ból),
        // ten ekran i tak już pobiera — dlatego wglądy kosztują tu cztery
        // zapytania, a nie siedem.
        //
        // ⛔ NAZWY TABEL I LISTY KOLUMN POCHODZĄ Z `lib/wejsciaWgladow.ts`,
        // czyli z tego samego miejsca, z którego bierze je „Dziś". Własny
        // napis `'match_contexts'` w tym pliku byłby drugą listą kolumn,
        // która rozjedzie się z tamtą przy pierwszej zmianie (O92).
        // ═══════════════════════════════════════════════════════════
        supabase.from(TABELA_MECZOW).select(SELECT_MECZOW)
          .eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from(TABELA_PROFILU).select(SELECT_PROFILU).eq('id', userId).limit(1),
        supabase.from(TABELA_KATALOGU).select(SELECT_KATALOGU).in(KOLUMNA_ODBIORCY, [...ODBIORCY_KATALOGU]),
        supabase.from(TABELA_ODCINKOW).select(SELECT_ODCINKOW, { count: 'exact', head: true }),
      ]);

    // ── GŁOS I OGRANICZENIA ────────────────────────────────────────
    // ⚠️ PONOWIENIE BEZ KOLUMNY `ograniczenia` — ta sama gałąź co w `dzis.tsx`.
    // PostgREST przy nieznanej kolumnie odrzuca CAŁE zapytanie, więc dopóki
    // migracja J1 nie jest wykonana, bez tego cała lista byłaby pusta z powodu
    // jednej kolumny. Kolejność wdrożenia nie może gasić ekranu.
    type WierszGlosuSurowy = { week_start: unknown; voice: unknown; reason: unknown; spoke_at: unknown };
    let glosData: WierszGlosuSurowy[] | null = glosRes.data;
    let glosError: { message: string } | null = glosRes.error;
    let ograniczeniaSurowe: unknown =
      (glosRes.data && glosRes.data[0] ? (glosRes.data[0] as Record<string, unknown>) : undefined)?.[KOLUMNA_OGRANICZEN];
    let bladOgraniczen: string | null = glosRes.error ? glosRes.error.message : null;
    if (glosRes.error && isMissingOgraniczeniaColumnError(glosRes.error)) {
      const drugi = await supabase.from('weekly_voice').select('week_start, voice, reason, spoke_at')
        .eq('user_id', userId).eq('week_start', poniedzialekGlosu(new Date())).limit(1);
      glosData = drugi.data;
      glosError = drugi.error;
      ograniczeniaSurowe = undefined;
      bladOgraniczen = `kolumny „${KOLUMNA_OGRANICZEN}" nie ma jeszcze w bazie`;
    }
    const stanTygodnia = stanGlosu(
      (glosData && glosData[0] ? (glosData[0] as WierszGlosu) : null),
      glosError ? glosError.message : null,
    );
    const stanOgraniczen = czytajOgraniczenia(ograniczeniaSurowe, bladOgraniczen);
    console.log(`lista zadań: ${opisDoLogu(stanTygodnia)}`);
    console.log(`lista zadań: ${opisOgraniczenDoLogu(stanOgraniczen)}`);

    // ── WEJŚCIA KOLEJKI — POCZĄTEK ─────────────────────────────────
    // ⛔ W TEJ SEKCJI NIE MA PRAWA PAŚĆ ANI JEDNO `?? []` ANI `|| []`.
    // Każde wejście ma trzy stany; sklejenie „nie odczytałem" z „nic nie masz"
    // jest nieprawdą o zawodniku (Z0). Pilnuje tego asercja w
    // `lib/listaZadan.selftest.ts`, nie ten komentarz.
    const weKalendarz: Wejscie<WydarzenieKalendarza[]> =
      wejscieZOdpowiedzi<CalEvent, WydarzenieKalendarza>(eventsRes, 'kalendarz', (e) => ({
        id: e.id,
        title: e.title,
        event_type: e.event_type,
        scheduled_date: e.scheduled_date,
        scheduled_time: e.scheduled_time,
        status: e.status,
        focus_block_id: e.focus_block_id,
      }));

    const weDziennik: Wejscie<WpisDziennikaWejscie[]> =
      wejscieZOdpowiedzi<WierszDziennika, WpisDziennikaWejscie>(dziennikRes, 'dziennik', wpisDziennikaDlaKolejki);

    const weBol: Wejscie<WpisBolu[]> =
      wejscieZOdpowiedzi<WierszBolu, WpisBolu>(bolRes, 'ból', wpisBoluDlaKolejki);

    // CEL — dwa zapytania, jedno wejście. ⚠️ Błąd KTÓREGOKOLWIEK znaczy „nie
    // wiem, nad czym pracujesz", a nie „nie masz nad czym pracować".
    const weGole = wejscieZOdpowiedzi<Goal, Goal>(goalsRes, 'cele', (g) => g);
    const weBloki = wejscieZOdpowiedzi<FocusBlockRow, FocusBlockRow>(blocksRes, 'bloki', (b) => b);
    let weCel: Wejscie<WejscieCelu>;
    if (weGole.rodzaj === 'nie_wiem' || weBloki.rodzaj === 'nie_wiem') {
      weCel = {
        rodzaj: 'nie_wiem',
        powod: `cel: ${weGole.rodzaj === 'nie_wiem' ? weGole.powod : (weBloki.rodzaj === 'nie_wiem' ? weBloki.powod : '')}`,
      };
    } else {
      // ⚠️ `rodzaj === 'brak'` to PUSTA LISTA PO UDANYM ODCZYCIE — i tylko
      // wtedy wolno tu zejść do pustej tablicy. Gałąź „nie wiem" jest wyżej.
      const gole: Goal[] = weGole.rodzaj === 'jest' ? weGole.dane : [];
      const bloki: FocusBlockRow[] = weBloki.rodzaj === 'jest' ? weBloki.dane : [];
      const cel = gole.find((g) => g.is_priority) ?? gole[0] ?? null;
      const blokCelu = cel ? bloki.find((b) => b.segment_id === cel.segment_id) ?? null : null;
      weCel = {
        rodzaj: 'jest',
        dane: { segmentCelu: cel ? cel.segment_id : null, maAktywnyBlok: blokCelu !== null },
      };
    }

    // MECZ — ta sama reguła co w `dzis.tsx`: gdy meczu w kalendarzu nie ma,
    // mówię „brak" (to jest prawda odczytana z kalendarza); gdy jest, mówię
    // „nie wiem", zamiast zgadywać stan kaskady, której ten ekran nie czyta.
    const meczeMinione = weKalendarz.rodzaj === 'jest'
      ? weKalendarz.dane.reduce<number>((n, e) => (
        e.event_type === 'match' && e.scheduled_date !== null && e.scheduled_date <= dzisStr ? n + 1 : n
      ), 0)
      : 0;
    const weMecz: Wejscie<WejscieMeczu> = weKalendarz.rodzaj === 'nie_wiem'
      ? { rodzaj: 'nie_wiem', powod: 'mecz: nie odczytałem kalendarza' }
      : meczeMinione === 0
        ? { rodzaj: 'brak' }
        : { rodzaj: 'nie_wiem', powod: 'mecz: lista zadań nie czyta stanu kaskady meczowej (pas B3)' };

    // ZADANIA — cztery stany R5. `odczytZadan` dostaje CAŁĄ odpowiedź bazy.
    const weZadania = odczytZadan({ data: zadaniaRes.data, error: zadaniaRes.error });
    console.log(`lista zadań: ${opisOdczytuDoLogu(weZadania)}`);

    // ═══════════════════════════════════════════════════════════════
    // ⬇⬇⬇ WEJŚCIA WGLĄDÓW — POCZĄTEK ⬇⬇⬇   (PLAN-D-A2, decyzja D1 i D4)
    //
    // ⭐ JEDNO WYWOŁANIE, TA SAMA FUNKCJA, KTÓRĄ WOŁA „DZIŚ". Nie powstaje tu
    // drugi producent wglądów: `zbudujWejsciaWgladow` mieszka w `lib/` i ma
    // w całym produkcie DWÓCH konsumentów i ZERO kopii.
    //
    // ⛔ ANI JEDNO `?? []`, ANI JEDNO `|| []` — trzy stany każdego wejścia
    // rozstrzyga `wejscieZOdpowiedzi` wewnątrz tamtej funkcji, a nie ten plik.
    // ═══════════════════════════════════════════════════════════════
    const wejsciaWgladow = zbudujWejsciaWgladow({
      dziennikRes,
      wydarzeniaRes: eventsRes,
      bolRes,
      meczeRes,
      profilRes,
      katalogRes,
      odcinkiRes,
    });
    // ⬆⬆⬆ WEJŚCIA WGLĄDÓW — KONIEC ⬆⬆⬆

    setDane({
      odczyt: weZadania,
      wejsciaWgladow,
      wejscia: {
        dzis: dzisStr,
        glos: stanTygodnia,
        ograniczenia: stanOgraniczen,
        // ⚠️ `null` = ten ekran jej nie policzył. Powód w nagłówku pliku.
        jednaOdpowiedz: null,
        zadania: weZadania,
        kalendarz: weKalendarz,
        dziennik: weDziennik,
        bol: weBol,
        cel: weCel,
        mecz: weMecz,
      },
    });
    // ── WEJŚCIA KOLEJKI — KONIEC ───────────────────────────────────
    setLaduje(false);
  }, [userId]);

  useEffect(() => {
    if (visible) {
      setBladZapisu(null);
      setOstatnioOdhaczone(null);
      setBladDodania(null);
      setOstatnioDodane(null);
      load();
    }
  }, [visible, load]);

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PRODUCENT (a) — ZADANIE WŁASNE ZAWODNIKA (PLAN-D-T1)
  // ═══════════════════════════════════════════════════════════════════
  // ⛔ Zapis idzie KLIENTEM ZALOGOWANEGO ZAWODNIKA, czyli przez RLS. Wiersz
  // buduje `zbudujZadanieWlasne` — ten plik nie skleja obiektu sam, bo wtedy
  // pięć warunków polityki `player_tasks_insert_own` żyłoby w ekranie i nikt
  // by ich nie sprawdził bez uruchomienia appki.
  // ⛔ Błąd zapisu ma WŁASNE ZDANIE, nie ciszę (R5) — ten sam wzorzec co `odhacz`.
  const dodaj = useCallback(async () => {
    const zbudowane = zbudujZadanieWlasne({ userId, tytul: nowyTytul });
    if (!zbudowane.ok) {
      // ⚠️ Odmowa PRZED dotknięciem bazy dostaje własne zdanie z `lib/listaZadan.ts`,
      // a nie ten sam komunikat co awaria zapisu: „nic nie napisałeś" i „nie udało
      // się zapisać" to dwie różne rzeczy i tylko jedna z nich jest o produkcie.
      console.log(`lista zadań: nie dodaję — ${zbudowane.powod}`);
      setBladDodania(zdanieOdmowyDodania(zbudowane.kod));
      return;
    }
    setDodaje(true);
    setBladDodania(null);
    const { error } = await supabase.from(TABELA_ZADAN).insert(zbudowane.wiersz);
    setDodaje(false);
    if (error) {
      console.error(`lista zadań: zadanie nie zapisane — ${powodBledu(error)}`);
      setBladDodania(BLAD_DODANIA);
      // ⛔ CELOWO BEZ `setNowyTytul('')`. Wyczyszczone pole po nieudanym zapisie
      // wygląda dokładnie tak samo jak po udanym — zawodnik straciłby tekst
      // i myślał, że zadanie jest na liście.
      return;
    }
    setOstatnioDodane(zbudowane.wiersz.title);
    setNowyTytul('');
    await load();
  }, [userId, nowyTytul, load]);

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-A2 (16.08.2026), decyzja D1 — WGLĄDY WCHODZĄ NA TĘ LISTĘ.
  //
  // ⛔ JEDEN ARGUMENT. Drugi (`ZasadyWgladow`) istnieje WYŁĄCZNIE dla strażnika
  // mutacyjnego pasa B3 — podany stąd znaczyłby, że ten ekran ma własną,
  // schowaną kopię reguł liczenia wglądów.
  //
  // `policzWglady` jest CZYSTĄ FUNKCJĄ: nie czyta bazy, nie czyta zegara,
  // nie ma pamięci. Zawołanie jej z drugiego ekranu NIE TWORZY drugiego
  // producenta — tworzy drugiego KONSUMENTA, czyli dokładnie to, czego
  // brakowało: wgląd był policzony, poprawny, przechodził bramkę rankera
  // i NIE MIAŁ WIDOKU, KTÓRY BY GO WYDAŁ.
  // ═══════════════════════════════════════════════════════════════════
  const wglady = useMemo<WynikiWgladow | null>(() => {
    if (dane === null) return null;
    return policzWglady({ dzis: dane.wejscia.dzis, ...dane.wejsciaWgladow });
  }, [dane]);

  // ═══════════════════════════════════════════════════════════════════
  // ⛔ JEDEN ARGUMENT. Drugi (`Zasady`) jest wyłącznie dla strażnika
  // mutacyjnego rankera i dla pasa B3 — kontrakt B1 §8.1. Podany stąd
  // znaczyłby, że ekran ma własną kopię reguł, tylko schowaną głębiej.
  //
  // ⛔ ZERO FILTROWANIA KANDYDATÓW PRZED RANKEREM (WG-32). Wgląd, który ranker
  // wyciszy, ma zostać WIDOCZNY z powodem milczenia; `.filter()` w tym miejscu
  // skasowałby go po cichu — i zrobiłby to niewidocznie dla testów, bo lista
  // byłaby po prostu krótsza.
  // ⛔ ZERO SORTOWANIA. Kolejność należy do `lib/kolejkaPodania.ts` (zakaz 1
  // z nagłówka tego pliku) — także kolejność wglądów.
  // ═══════════════════════════════════════════════════════════════════
  const kolejka: Kolejka | null = useMemo(() => {
    if (dane === null) return null;
    const dodatkowi: Kandydat[] = [];
    if (wglady !== null) dodatkowi.push(...wglady.kandydaci);
    return ulozKolejke({ ...dane.wejscia, dodatkowi });
  }, [dane, wglady]);
  if (kolejka !== null) console.log(`lista zadań: ${kolejka.powod}`);
  if (wglady !== null) console.log(`lista zadań: wglądy — ${wglady.powod}`);

  // ── ZAPISY: ODHACZENIE (WT-23) I PODNIESIENIE (WT-28) ──────────────
  // ⛔ Błąd zapisu ma WŁASNE ZDANIE, nie ciszę (R5). Wiersz nie znika z listy
  // dlatego, że dotknięcie „wyglądało na udane".
  const odhacz = useCallback(async (p: PozycjaKolejki) => {
    const idWiersza = idZadaniaZPozycji(p);
    if (idWiersza === null) return;
    setZapisuje(p.id);
    setBladZapisu(null);
    const { error } = await supabase.from(TABELA_ZADAN)
      .update({ state: 'done', state_changed_at: new Date().toISOString() })
      .eq('id', idWiersza);
    setZapisuje(null);
    if (error) {
      console.error(`lista zadań: odhaczenie nie zapisane — ${powodBledu(error)}`);
      setBladZapisu(BLAD_ODHACZENIA);
      return;
    }
    setOstatnioOdhaczone(p.co);
    await load();
  }, [load]);

  const podnies = useCallback(async (p: PozycjaKolejki) => {
    const idWiersza = idZadaniaZPozycji(p);
    if (idWiersza === null) return;
    setZapisuje(p.id);
    setBladZapisu(null);
    const { error } = await supabase.from(TABELA_ZADAN)
      .update({ raised_at: new Date().toISOString() })
      .eq('id', idWiersza);
    setZapisuje(null);
    if (error) {
      console.error(`lista zadań: podniesienie nie zapisane — ${powodBledu(error)}`);
      setBladZapisu(BLAD_PODNIESIENIA);
      return;
    }
    await load();
  }, [load]);

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  const naglowek = (
    <View style={styles.naglowek}>
      <View style={{ flex: 1 }}>
        <Text style={styles.tytul}>{NAGLOWEK_LISTY}</Text>
        <Text style={styles.podtytul}>{PODTYTUL_LISTY}</Text>
      </View>
      <TouchableOpacity onPress={onClose} accessibilityRole="button" style={styles.zamknij}>
        <Text style={styles.zamknijTekst}>{ZAMKNIJ_LISTE}</Text>
      </TouchableOpacity>
    </View>
  );

  /** Jeden wiersz listy. ⭐ Rysuje go `PozycjaKolejkiCard` — nie ten plik. */
  const renderPozycja = (p: PozycjaKolejki, dzisStr: string) => (
    <View key={p.id} style={styles.wiersz}>
      {/* WT-23 — pole do odhaczenia. ⚠️ WYŁĄCZNIE przy pozycji, która MA wiersz
          w `player_tasks`: wydarzenia kalendarza i wglądy nie mają czego
          odhaczyć, a pole, które nic nie zapisuje, uczy, że pola nic nie robią. */}
      {mozliweOdhaczenie(p) ? (
        <TouchableOpacity
          style={styles.pole}
          onPress={() => odhacz(p)}
          disabled={zapisuje !== null}
          accessibilityRole="checkbox"
          accessibilityLabel={ODHACZ}
        >
          <View style={styles.poleKwadrat} />
        </TouchableOpacity>
      ) : (
        <View style={styles.poleMiejsce} />
      )}
      <View style={{ flex: 1 }}>
        <PozycjaKolejkiCard pozycja={p} dzis={dzisStr} />
        {/* WT-28 — podniesienie do „Teraz". Zapis idzie do `player_tasks.raised_at`,
            a kubełek przelicza RANKER (`kubelekDla`), nie ten ekran. */}
        {mozliwePodniesienie(p) ? (
          <TouchableOpacity
            style={styles.podnies}
            onPress={() => podnies(p)}
            disabled={zapisuje !== null}
            accessibilityRole="button"
          >
            <Text style={styles.podniesTekst}>{PODNIES_DO_TERAZ}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  /** Jeden kubełek: nagłówek z sumą (WG-19) i pozycje w kolejności kolejki. */
  const renderKubelek = (k: Kubelek, kol: Kolejka, dzisStr: string) => {
    // ⛔ TU JEST CAŁY WYBÓR TEGO EKRANU: KTÓRY kubełek. Kolejność wewnątrz
    // niego należy do rankera — `wezKubelek` oddaje pozycje w kolejności
    // kolejki i ten plik ich nie dotyka.
    const pozycje = wezKubelek(kol, k);
    const suma = podsumujKubelek(pozycje);
    const otwarty = rozwiniete[k];
    return (
      <View key={k} style={styles.kubelek}>
        <TouchableOpacity
          style={styles.kubelekNaglowek}
          onPress={() => setRozwiniete((s) => ({ ...s, [k]: !s[k] }))}
          accessibilityRole="button"
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.kubelekNazwa}>{KUBELEK_ETYKIETA[k]}</Text>
            {/* WG-19 — suma. ⛔ Pozycje bez `ileZajmieSekund` NIE wchodzą do
                niej i suma mówi o nich wprost. Suma udająca komplet łamie Z0. */}
            <Text style={styles.kubelekSuma}>{opiszSume(suma, opiszCzas(suma.sekundy))}</Text>
          </View>
          <Text style={styles.kubelekPrzelacznik}>{otwarty ? ZWIN_KUBELEK : ROZWIN_KUBELEK}</Text>
        </TouchableOpacity>
        {otwarty ? (
          suma.ile === 0
            ? <Text style={styles.pusto}>{KUBELEK_PUSTY}</Text>
            : <View>{pozycje.map((p) => renderPozycja(p, dzisStr))}</View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {naglowek}
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          {laduje || kolejka === null || dane === null ? (
            <View style={styles.laduje}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.info}>{LISTA_WCZYTUJE}</Text>
            </View>
          ) : kolejka.wyciszonaCalkowicie ? (
            // ⛔ ŚCIEŻKA WYJŚCIA — ZERO POZYCJI, ZERO KUBEŁKÓW, ZERO LICZNIKÓW.
            // Lista wyszarzonych przypomnień jest nadal listą przypomnień.
            // ⚠️ Brzmienie NIE JEST NOWE: to ta sama stała, której używa ranker.
            <View>
              <Text style={styles.info}>{MILCZENIE_SCIEZKA_WYJSCIA.powod}</Text>
              <Text style={styles.infoDrobne}>{MILCZENIE_SCIEZKA_WYJSCIA.warunekPowrotu}</Text>
            </View>
          ) : (
            <View>
              {/* CZTERY STANY `odczytZadan` = CZTERY RÓŻNE ZDANIA (R5). */}
              <Text style={styles.info}>{zdanieOdczytu(dane.odczyt)}</Text>
              {zdanieNiepelnosci(dane.odczyt) !== null ? (
                <Text style={styles.ostrzezenie}>{zdanieNiepelnosci(dane.odczyt)}</Text>
              ) : null}
              {kolejka.niepelna ? <Text style={styles.ostrzezenie}>{LISTA_NIEPELNA}</Text> : null}
              {bladZapisu !== null ? <Text style={styles.ostrzezenie}>{bladZapisu}</Text> : null}
              {ostatnioOdhaczone !== null ? (
                <Text style={styles.infoDrobne}>{ODHACZONE_PREFIKS + ostatnioOdhaczone}</Text>
              ) : null}

              {/* ⭐ PLAN-D-T1 — PRODUCENT (a): POLE I PRZYCISK.
                  Stoi NAD kubełkami i POD zdaniem o stanie odczytu — świadomie:
                  zawodnik z pustą listą czyta najpierw prawdę o niej („Nie masz
                  zapisanego ani jednego zadania."), a dopiero potem widzi, czym
                  ją wypełnić. Odwrotna kolejność zamalowałaby pustkę formularzem.
                  ⚠️ Poza gałęzią `wyciszonaCalkowicie`: na ścieżce wyjścia ekran
                  milczy w całości i ten pas tego nie zmienia. */}
              <View style={styles.dodaj}>
                <Text style={styles.dodajNaglowek}>{DODAJ_NAGLOWEK}</Text>
                <View style={styles.dodajWiersz}>
                  <TextInput
                    style={styles.dodajPole}
                    value={nowyTytul}
                    onChangeText={setNowyTytul}
                    placeholder={DODAJ_PLACEHOLDER}
                    placeholderTextColor={colors.textTertiary}
                    editable={!dodaje}
                    /* ⚠️ Ta sama granica co CHECK `player_tasks_title_len` i co
                       zdanie odmowy — jedna stała, trzy miejsca, zero rozjazdu. */
                    maxLength={MAKS_DLUGOSC_TYTULU}
                    accessibilityLabel={DODAJ_NAGLOWEK}
                  />
                  <TouchableOpacity
                    style={styles.dodajPrzycisk}
                    onPress={dodaj}
                    disabled={dodaje}
                    accessibilityRole="button"
                    accessibilityLabel={DODAJ_PRZYCISK}
                  >
                    <Text style={styles.dodajPrzyciskTekst}>
                      {dodaje ? DODAJ_ZAPISUJE : DODAJ_PRZYCISK}
                    </Text>
                  </TouchableOpacity>
                </View>
                {/* ⛔ Błąd i odmowa mają WŁASNE ZDANIE, nie ciszę (R5). */}
                {bladDodania !== null ? (
                  <Text style={styles.ostrzezenie}>{bladDodania}</Text>
                ) : null}
                {ostatnioDodane !== null ? (
                  <Text style={styles.infoDrobne}>{DODANE_PREFIKS + ostatnioDodane}</Text>
                ) : null}
              </View>

              {/* ⭐ TRZY KUBEŁKI, każdy przez `wezKubelek`. Kolejność kubełków
                  bierzemy z rankera (`KUBELKI`), nie z własnej stałej. */}
              {KUBELKI_LISTY.map((k) => renderKubelek(k, kolejka, dane.wejscia.dzis))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  naglowek: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tytul: { ...typography.display, fontSize: 26, color: colors.textPrimary },
  podtytul: { ...typography.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  zamknij: { minHeight: minTouchHeight, justifyContent: 'center', paddingLeft: 12 },
  zamknijTekst: { ...typography.bodyMedium, fontSize: 13, color: colors.brand },
  laduje: { alignItems: 'center', paddingVertical: spacing.xl },
  info: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: 8 },
  infoDrobne: { ...typography.body, fontSize: 12, lineHeight: 18, color: colors.textTertiary, marginTop: 4 },
  // ⚠️ Rozróżnienie niesie TEKST, nie kolor — koloru zawodnik się nie domyśli.
  ostrzezenie: { ...typography.bodyMedium, fontSize: 13, lineHeight: 19, color: colors.textPrimary, marginTop: 8 },
  // ⭐ PLAN-D-T1 — pole „Dopisz coś swojego". Ta sama ramka co kubełek, żeby
  // zawodnik rozpoznał, że to jest część tej samej listy, a nie osobny przyrząd.
  dodaj: {
    marginTop: 24, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, backgroundColor: colors.surface, padding: 16,
  },
  dodajNaglowek: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  dodajWiersz: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  dodajPole: {
    flex: 1, minHeight: minTouchHeight, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    backgroundColor: colors.background,
    ...typography.body, fontSize: 14, color: colors.textPrimary,
  },
  dodajPrzycisk: { minHeight: minTouchHeight, justifyContent: 'center', paddingLeft: 14 },
  dodajPrzyciskTekst: { ...typography.bodyMedium, fontSize: 14, color: colors.brand },
  kubelek: {
    marginTop: 24, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, backgroundColor: colors.surface, padding: 16,
  },
  kubelekNaglowek: { flexDirection: 'row', alignItems: 'center', minHeight: minTouchHeight },
  kubelekNazwa: { ...typography.bodySemiBold, fontSize: 16, color: colors.textPrimary },
  kubelekSuma: { ...typography.body, fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  kubelekPrzelacznik: { ...typography.bodyMedium, fontSize: 12, color: colors.brand, marginLeft: 12 },
  pusto: { ...typography.body, fontSize: 13, color: colors.textSecondary, marginTop: 10 },
  wiersz: { flexDirection: 'row', alignItems: 'flex-start' },
  pole: { minHeight: minTouchHeight, width: 36, justifyContent: 'center', paddingTop: 14 },
  poleMiejsce: { width: 0 },
  poleKwadrat: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2, borderColor: colors.brand,
  },
  podnies: { minHeight: minTouchHeight, justifyContent: 'center' },
  podniesTekst: { ...typography.bodyMedium, fontSize: 12, color: colors.brand },
});
