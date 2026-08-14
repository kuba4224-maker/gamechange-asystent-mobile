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
import { rozpoznajPustke, opisPustkiDoLogu } from '../../lib/trzyPustki';
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

export default function KalendarzScreen() {
  const { currentUser } = useAuth();

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
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loggedEventIds, setLoggedEventIds] = useState<Set<number>>(new Set());
  const [showCancelled, setShowCancelled] = useState(false);
  const [showPast, setShowPast] = useState(false);

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
    const rows = (data ?? []) as Goal[];
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
    if (err) return; // load* nie pokazuje banera błędu — konwencja z web
    setEvents((eventRows ?? []) as CalEvent[]);

    const { data: logRows } = await supabase
      .from('daily_logs')
      .select('calendar_event_id')
      .eq('user_id', currentUser.id)
      .not('calendar_event_id', 'is', null);
    setLoggedEventIds(new Set((logRows ?? []).map((l: any) => l.calendar_event_id)));

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
  }, [currentUser, loadGoals]);

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadEvents(); }, [loadEvents]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  const activeGoals = goals.filter((g) => g.status === 'active');

  const todayStr = toLocalDateStr(new Date());
  const recurring = events.filter((e) => e.status === 'scheduled' && e.recurrence_rule);
  // AUDYT 06.08.2026 — "Nadchodzące" nie miało filtra daty, tylko sortowanie rosnąco.
  // Efekt: na górze sekcji siedziały wydarzenia sprzed tygodni i miesięcy, w większości
  // z plakietką "Nie wykonano". Zawodnik wchodził po plan na dziś, a dostawał listę
  // zaległości. Rozdzielone na dwie sekcje: nadchodzące (od dziś włącznie) i zwinięta
  // historia (przeszłe), żeby plakietki "Wykonano / Nie wykonano" nadal były dostępne,
  // ale nie były pierwszą rzeczą, którą widać.
  const byDateAsc = (a: CalEvent, b: CalEvent) =>
    (a.scheduled_date! < b.scheduled_date! ? -1 : a.scheduled_date! > b.scheduled_date! ? 1 : 0);
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

    const badges: string[] = [];
    if (e.status === 'cancelled') badges.push('Anulowane');
    // PLAN-D-A7 — `status='completed'` to teraz osobny, WIDOCZNY stan. Bez tej
    // gałęzi wydarzenie oznaczone jako wykonane rysowałoby się bez żadnej
    // plakietki i wyglądało dokładnie jak zaplanowane, którego nikt nie ruszył.
    if (e.status === 'completed') badges.push('Wykonano');
    if (e.status === 'scheduled' && e.scheduled_date && e.scheduled_date <= todayStr) {
      badges.push(loggedEventIds.has(e.id) ? 'Wykonano' : 'Nie wykonano');
    }

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
            <Text key={i} style={[styles.badge, b === 'Nie wykonano' ? styles.badgePriority : b === 'Wykonano' ? styles.badgeCompleted : styles.badgeMuted]}>{b}</Text>
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

  // PLAN-D-T 08.2026 (14.08.2026), zadanie T6 — KTÓRA TO PUSTKA.
  // ⚠️ `planLekcjiZnany: null` — produkt NIE MA planu lekcji i nie ma go skąd
  // wziąć (zmierzone 14.08.2026: zero tabel %school% / %szkol% / %lesson%).
  // Gałąź „brak konfiguracji" jest przez to nieosiągalna i jest to NAZWANE
  // w lib/trzyPustki.ts, a nie przemilczane. Włącza ją pas A3.
  const pustkaNadchodzace = rozpoznajPustke({
    maWpisy: upcoming.length > 0,
    planLekcjiZnany: null,
    moznaZapisywac,
    zakres: 'nadchodzace',
  });
  if (pustkaNadchodzace) console.log(`kalendarz: ${opisPustkiDoLogu(pustkaNadchodzace)}`);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <Text style={styles.title}>Kalendarz treningowy</Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {ok && <Text style={styles.ok}>{ok}</Text>}

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
        {/* ⚠️ PLAN-D-T 08.2026 (14.08.2026), zadanie T6 — TRZY PUSTKI ZAMIAST
            JEDNEJ. Stało tu „Brak zaplanowanych wydarzeń." — jedno zdanie na
            trzy różne sytuacje. Zawodnik, któremu wygasł dostęp, czytał, że
            NIC NIE MA, zamiast dowiedzieć się, że produkt przestał przyjmować
            jego wpisy. Rozstrzygnięcie jest czystą funkcją (lib/trzyPustki.ts);
            ten ekran je WYKONUJE, nie podejmuje. */}
        {pustkaNadchodzace ? (
          <View>
            <Text style={styles.empty}>{pustkaNadchodzace.tekst}</Text>
            <Text style={styles.pustkaCta}>{pustkaNadchodzace.cta} →</Text>
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
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 28, marginBottom: spacing.lg, color: colors.textPrimary },
  label: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6, marginTop: 4 }, // W1: ink3
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 12 }, // W1: ink3
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
  badgePriority: { backgroundColor: colors.warnSoft, color: colors.warning },
  badgeCompleted: { backgroundColor: colors.okSoft, color: colors.success },
  badgeMuted: { backgroundColor: colors.surfaceElevated, color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  secondaryBtn: { paddingVertical: 10, paddingHorizontal: 18, minHeight: minTouchHeight, justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, alignSelf: 'flex-start' },
  secondaryBtnText: { ...typography.bodyMedium, fontSize: 13, color: colors.textPrimary, letterSpacing: 0.5 },
});
