// Ekran DZIŚ — NOWY, Krok 2 Toru 7 (SESJA_START_UX_MOBILE_ONBOARDING_NAWIGACJA.md).
// Nowy ekran domowy appki, zastępuje Dziennik jako domyślna zakładka po
// zalogowaniu (patrz app/index.tsx).
//
// DECYZJA ODWRÓCONA 06.08.2026 (BRIEF_DELEGACJA_PROMINENCJA_CELU.md, zatwierdzone
// przez Kubę) — Cel aktywny jest tu dużym, stałym, PIERWSZYM elementem ekranu,
// nie small-printem. Rekomendacja training_focus stoi pod Celem, jawnie z nim
// powiązana (patrz `linkedToGoal` niżej).
//
// ═══════════════════════════════════════════════════════════════════
// JEDNA DROGA B2 08.08.2026 — SCALENIE Z CENTRUM DECYZJI
// (blok B1 „jedna droga, jeden słownik", claude/KREGOSLUP_PRODUKTU_I_DROGA_07_08_2026.md)
//
// PROBLEM, KTÓRY TO ZAMYKA: ten sam rekord bazy — najnowszy `training_focus` —
// był pokazywany w dwóch miejscach, pod dwiema nazwami („Co dziś zrobić" tutaj
// i „Priorytet tygodnia" w Centrum Decyzji), w dwóch ramach czasowych, z niemal
// identycznymi pustymi stanami. Na Dziś nie dało się kliknąć NIC poza przejściem
// dalej — przyciski Wykonałem / Nie wykonałem / Nie miało to sensu były o
// zakładkę dalej. Jedna rzecz, dwie drogi.
//
// CO SIĘ ZMIENIŁO:
//  1. Karta „Co dziś zrobić" pokazuje PEŁNĄ treść rekomendacji i ma realne
//     przyciski feedbacku. Zawodnik odpowiada systemowi bez opuszczania ekranu
//     domowego. Karta to `components/RecommendationCard.tsx` — TEN SAM komponent,
//     który renderuje Centrum Decyzji (zero drugiej kopii kodu karty).
//  2. Ten ekran oznacza jako przeczytaną WYŁĄCZNIE tę jedną rekomendację, którą
//     faktycznie pokazuje. Stary `markAsViewed()` w Centrum Decyzji oznaczał przy
//     każdym wejściu wszystkie wczytane rekomendacje, łącznie z tymi w ZWINIĘTEJ
//     historii — badge spadał do zera, choć zawodnik niczego nie przeczytał.
//  3. Reszta Centrum Decyzji (historia + specialist_referral / position_fit_signal /
//     coach_recommendation) jest dostępna z linku „Wszystkie rekomendacje" niżej.
//     Zakładka zniknęła z paska; trasa żyje (`href: null`, patrz (tabs)/_layout.tsx).
//  4. Wskaźnik pracy w hero Celu — „N z M sesji Bloku Skupienia zrobione",
//     policzone z `focus_blocks` + `calendar_events` + `daily_logs.calendar_event_id`.
//     To zamiennik dwóch wskaźników usuniętych w audycie 06.08.2026 („Aktywny od
//     N tygodni" mierzył upływ czasu i nagradzał stagnację; „N rekomendacji"
//     liczyło wszystkie typy wbrew własnej etykiecie). Ten mierzy PRACĘ.
//     Bez aktywnego Bloku pod tym Celem NIE pokazujemy zastępczej liczby, tylko
//     zaproszenie do zaplanowania pracy.
//
// CO USTĄPIŁO, ŻEBY EKRAN NIE URÓSŁ (zasada „jedno wchodzi, jedno wychodzi"):
//  • Linia „Twój profil z diagnozy →" przestała być osobnym blokiem 48 px pod
//    hero i weszła do środka hero, w jeden rząd z „Zobacz szczegóły celu →".
//    Merytorycznie to jej właściwe miejsce: diagnoza jest uzasadnieniem Celu.
//  • Sekcja „Dziś w kalendarzu" to JEDNA karta z listą pozycji, nie osobna karta
//    na każde wydarzenie. Przy trzech treningach dziennie oszczędza dwie karty.
//  • Z karty rekomendacji zniknął odsyłacz „Zobacz w Centrum Decyzji →" — jest
//    zbędny, skoro treść i przyciski są już tutaj.
//
// Świadomie NIE duplikuje ciężkiej logiki „znajdź wolny dzień w tygodniu"
// z app/(tabs)/kalendarz.tsx (computeCalendarSuggestion) — to jest ekran
// DZISIAJ, węższe pytanie niż planowanie na cały tydzień do przodu.
//
// ═══════════════════════════════════════════════════════════════════
// NAWIGACJA B3 08.08.2026 — HERO CELU KURCZY SIĘ, KALENDARZ I CELE
// WCHŁONIĘTE (decyzje B5 i B8, claude/DECYZJE_PRODUKTOWE_07_08_2026.md)
//
// 1. HERO CELU: ~220 dp → ~101 dp. Zostały trzy rzeczy: nazwa Celu, wskaźnik
//    pracy („3 z 6 sesji zrobione") i pasek. Zeszły do szczegółów Celu
//    (ekran `/cele`): kontekst „skąd się wziął" (`goalOriginContext`) i rząd
//    linków. CEL ZOSTAJE PIERWSZY — decyzja Kuby z 06.08.2026 jest w mocy,
//    tylko spełniona taniej.
//    PO CO TO: żeby przyciski feedbacku rekomendacji („Wykonałem / Nie
//    wykonałem / Nie miało to sensu") weszły NAD ZGIĘCIE. W rundzie 2 stały
//    ~607 dp od góry, czyli poniżej pierwszego ekranu na mniejszym telefonie
//    (iPhone SE ma ~598 dp widocznego obszaru) — jedyna akcja decyzyjna
//    zawodnika wymagała tam scrolla. Teraz ~491 dp, czyli z zapasem.
//    Pomiar i założenia: raport zwrotny B runda 3, sekcja 12.
//    CAŁY KAFELEK JEST PRZYCISKIEM do `/cele` — to są „szczegóły Celu".
//    Osobnych linków w hero nie ma: jeden kafelek, jedno miejsce docelowe.
//
// 2. LINK „TWÓJ PROFIL Z DIAGNOZY" WYPROWADZONY STĄD do zakładki „Ja"
//    (app/(tabs)/ja.tsx), gdzie stoi jako skrót profilu + wejście „Wynik
//    diagnozy". Nie zniknął — zmienił dom na ten, który powstał właśnie po to.
//
// 3. KALENDARZ jest wchłonięty przez ten ekran: zakładki „Kalendarz" nie ma
//    w pasku, trasa `/kalendarz` żyje (`href: null`), a karta „Dziś w
//    kalendarzu" niżej jest jej JEDYNYM wejściem — stąd link mówi wprost
//    „dodaj i zaplanuj", a nie tylko „otwórz". Formularz dodawania,
//    cykliczne, nadchodzące, minione i anulowane są nietknięte, jedno
//    dotknięcie stąd.
//
// ═══════════════════════════════════════════════════════════════════
// WIEDZA B4 08.08.2026 — PODPOWIEDŹ Z MATERIAŁU PRZY REKOMENDACJI
// (decyzje B1 i C1 warstwa 1, claude/DECYZJE_PRODUKTOWE_07_08_2026.md;
//  treść i kształt tabeli: claude/PODPOWIEDZI_Z_MATERIALOW_A.md 4.3 i 4.5)
//
// CO SIĘ ZMIENIŁO: pod przyciskami karty rekomendacji stoi jedna podpowiedź
// z materiałów Kuby, Z WIDOCZNYM ŹRÓDŁEM („Moc, s. 8"). To źródło jest całą
// różnicą — zdanie bez niego mógłby napisać dowolny model; zdanie z nim pochodzi
// z konkretnej strony konkretnej książki i da się je sprawdzić.
//
// SKĄD BIERZEMY DANE — i dlaczego tą drogą. Polecenie dawało dwie: (1) czytać
// podpowiedź już przypiętą do rekordu rekomendacji przez pas A tej samej rundy,
// (2) czytać `component_hints` bezpośrednio po `segment_id` aktywnego Celu.
// SPRAWDZIŁEM PIERWSZĄ: raportu A rundy 4 nie ma w pamięci projektu (najnowszy
// to `RAPORT_ZWROTNY_A_RUNDA_3.md`), więc kontraktu na przypięcie nie ma, a
// `RECOMMENDATION_COLUMNS` nie zawiera żadnej kolumny z podpowiedzią. Idę
// drugą drogą. Gdy pas A dopnie podpowiedź do rekordu, ten ekran przestawia się
// na nią zmianą w jednym miejscu (`loadHint`), bez ruszania reguł z
// `lib/componentHints.ts`.
//
// ⚠️ BRAMKA WIEKOWA (decyzja A9) jest twarda i jest w `lib/componentHints.ts`:
// poniżej 16 lat zawodnik nie dostaje podpowiedzi z dawkami suplementacyjnymi,
// a gdy appka NIE ZNA wieku — też ich nie dostaje. Appka zna wyłącznie rocznik
// (`users.birth_year`), więc liczymy wiek NAJNIŻSZY MOŻLIWY. Uzasadnienie
// kierunku błędu stoi przy `minimumPossibleAge`.
//
// ⚠️ REGUŁA R5: „nie ma tabeli" i „tabela jest, ale pusta" to DWIE RÓŻNE RZECZY
// i ekran je rozróżnia. Migracja `component_hints` (214 wierszy) czeka na
// wklejenie przez Kubę — do tego czasu ekran mówi wprost „materiały dla tego
// obszaru są w przygotowaniu", zamiast pokazać pustkę udającą, że nic nie ma.
//
// ═══════════════════════════════════════════════════════════════════
// WIEDZA B4 08.08.2026 — STAN ŁADOWANIA (dług N2 / znalezisko B18, otwarte
// od rundy 2). `loading` było ustawiane i NIGDY nie czytane: przy pierwszym
// wejściu zawodnik widział przez chwilę „Nie masz jeszcze Celu" i pusty stan
// rekomendacji, po czym ekran się przemalowywał. To nie jest kosmetyka —
// pierwsze zdanie, jakie appka mówi zawodnikowi po zalogowaniu, brzmiało
// nieprawdziwie. `loading` startuje jako `true` i schodzi do `false` po
// pierwszym `load()`; kolejne odświeżenia (`useFocusEffect`, `RefreshControl`)
// go NIE podnoszą, bo wtedy na ekranie są już prawdziwe dane i migotanie
// byłoby gorsze niż jego brak.
import { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { toLocalDateStr, DAYS_OF_WEEK } from '../../lib/date-utils';
// NAWIGACJA B3 08.08.2026 — `goalOriginContext` (lib/goal-prominence.ts) stracił
// tu konsumenta razem ze skurczeniem hero (punkt 1 w nagłówku). Plik ZOSTAJE
// nietknięty; kontekst „skąd się wziął ten Cel" należy teraz do szczegółów Celu
// na ekranie `/cele`, gdzie jest miejsce, żeby go rozwinąć, a nie skracać.
// JEDNA DROGA B2 08.08.2026 — jedno źródło nazw segmentów (lib/labels.ts);
// lokalna kopia 13 nazw usunięta, treść niezmieniona co do znaku.
import { SEGMENT_LABELS } from '../../lib/labels';
import { computeFocusBlockProgress, type FocusBlockProgress } from '../../lib/focusBlockProgress';
// WIEDZA B4 08.08.2026 — wszystkie reguły podpowiedzi (bramka wiekowa A9,
// rozróżnienie R5, wybór jednej z kilkunastu) siedzą w czystych funkcjach
// z własnym selftestem. Tutaj zostaje wyłącznie zapytanie i rysowanie.
import {
  COMPONENT_HINT_COLUMNS,
  // ZAPIS B7 08.08.2026 (M19) — treść zawsze widoczna: rozszerzona lista kolumn
  // + ścieżka odzysku, gdy migracja `zawsze_widoczna` nie jest wklejona.
  COMPONENT_HINT_COLUMNS_WITH_ALWAYS,
  shouldRetryWithoutAlwaysVisible,
  ALWAYS_VISIBLE_COLUMN_MISSING_WARN,
  buildHintState,
  minimumPossibleAge,
  hintKindLabel,
  hintEyebrow,
  HINT_EYEBROW,
  HINT_TABLE_MISSING_TEXT,
  HINT_ERROR_TEXT,
  HINT_EMPTY_TEXT,
  type ComponentHintRow,
  type HintState,
} from '../../lib/componentHints';
// ZAPIS B7 08.08.2026 (M23/B35) — „Nowa porcja w Twoim Bloku": odczyt dawki
// i listy „przeczytane" tymi samymi czystymi funkcjami co ekran Bloku.
import {
  CONTENT_DOSE_COLUMN,
  CONTENT_DOSE_SEEN_COLUMN,
  CONTENT_DOSE_SEEN_COLUMN_MISSING_WARN,
  isMissingContentDoseColumnError,
  isMissingSeenColumnError,
  parseContentDoses,
  parseSeenKeys,
  isDoseSeen,
} from '../../lib/contentDose';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';
import LivingDiagnosisPulseCard from '../../components/LivingDiagnosisPulseCard';
import RecommendationCard, { RECOMMENDATION_COLUMNS, type Recommendation } from '../../components/RecommendationCard';

const SEG_LABELS = SEGMENT_LABELS;

const EVENT_TYPE_LABELS: Record<string, string> = {
  club_training: 'Trening klubowy', own_training: 'Trening własny',
  micro_session: 'Mikro-sesja', task: 'Zadanie', match: 'Mecz',
};

type Goal = {
  id: number; segment_id: string; is_priority: boolean; created_at: string;
  origin: string | null; suggestion_note: string | null; refinement_note: string | null;
};
type RecommendationRow = Recommendation & { goal_id: number | null };
type CalEvent = {
  id: number; title: string; event_type: string; scheduled_date: string | null;
  recurrence_rule: string | null; focus_block_id: string | null;
};
// WIEDZA B4 08.08.2026 — doszło `component_id`: to jest Element, nad którym
// zawodnik faktycznie pracuje, więc podpowiedź wycelowana w ten Element jest
// trafniejsza niż reguła przekrojowa segmentu. `computeFocusBlockProgress`
// tej kolumny nie czyta i nie zmienia przez to zachowania.
type FocusBlockRow = { id: string; segment_id: string; status: string; component_id?: string | null };

function dayCodeFor(date: Date) {
  const idx = (date.getDay() + 6) % 7; // 0=Pon..6=Nd — ta sama konwencja co lib/date-utils.ts
  return DAYS_OF_WEEK[idx][0];
}

export default function DzisScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();

  const [priorityGoal, setPriorityGoal] = useState<Goal | null>(null);
  const [hasAnyGoal, setHasAnyGoal] = useState(false);
  const [loggedToday, setLoggedToday] = useState(false);
  const [focusRec, setFocusRec] = useState<RecommendationRow | null>(null);
  const [otherUnreadCount, setOtherUnreadCount] = useState(0);
  const [openActionableCount, setOpenActionableCount] = useState(0);
  const [todayEvents, setTodayEvents] = useState<CalEvent[]>([]);
  const [workProgress, setWorkProgress] = useState<FocusBlockProgress>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  // WIEDZA B4 08.08.2026 — podpowiedź z materiału. Osobny stan, bo zapytanie
  // o nią rusza dopiero wtedy, gdy wiadomo, jaki jest segment Celu.
  const [hintState, setHintState] = useState<HintState>({ state: 'loading' });

  // Migawka „co było nieprzeczytane w chwili wejścia na ekran" — ten sam wzorzec
  // co w centrum-decyzji.tsx: kropka „Nowe" nie może zniknąć w trakcie tej samej
  // wizyty, zaraz po asynchronicznym oznaczeniu jako przeczytane.
  const unreadSnapshotRef = useRef<Set<number>>(new Set());

  // JEDNA DROGA B2 08.08.2026 — oznaczamy JEDNĄ rekomendację: tę, którą ten ekran
  // faktycznie wyrenderował. Nigdy hurtem, nigdy niewidocznych. Patrz nagłówek, punkt 2.
  const markShownAsViewed = useCallback(async (rec: RecommendationRow | null) => {
    if (!rec || rec.viewed_at) return;
    const nowIso = new Date().toISOString();
    const { error: err } = await supabase
      .from('decision_recommendations')
      .update({ viewed_at: nowIso })
      .eq('id', rec.id);
    if (err) {
      // Brak oznaczenia to tylko kropka przy kolejnej wizycie, nie utrata danych.
      console.error('dzis: nie udało się oznaczyć rekomendacji jako przeczytanej:', err);
      return;
    }
    setFocusRec((prev) => (prev && prev.id === rec.id ? { ...prev, viewed_at: nowIso } : prev));
  }, []);

  // WIEDZA B4 08.08.2026 — jedno zapytanie o podpowiedzi z materiałów.
  // Rusza dopiero po `load()`, bo dopiero wtedy znany jest segment Celu.
  //
  // ⚠️ TU MIESZKA REGUŁA R5. `supabase-js` NIE RZUCA wyjątku, gdy tabeli nie
  // ma — zwraca `{ data: null, error }`. Gdyby ten kod zrobił
  // `rows = data ?? []`, brak tabeli byłby nieodróżnialny od „nie ma treści dla
  // tego segmentu": ekran pokazałby spokojny pusty stan, wszystko wyglądałoby
  // na wdrożone i nikt nigdy by nie wrócił. Dlatego `error` idzie do
  // `buildHintState` NIETKNIĘTY i to ono rozstrzyga, co zawodnik zobaczy.
  // ZAPIS B7 08.08.2026 (M23/B35) — czy w Bloku pod tym Celem czeka NOWA,
  // nieotwarta dawka treści. Osobne, wąskie zapytanie (nie kolumny w selecie
  // z Promise.all — PostgREST przy nieznanej kolumnie odrzuca CAŁE zapytanie,
  // a `content_doses`/`content_dose_seen` to najmłodsze migracje). Każdy brak
  // — kolumny, koperty, klucza — znaczy po prostu „nie pokazuj linii";
  // pierwszy z nich dodatkowo mówi w logu dlaczego.
  const [newDoseWaiting, setNewDoseWaiting] = useState(false);
  const loadNewDose = useCallback(async (blockId: string | null) => {
    if (!blockId) { setNewDoseWaiting(false); return; }
    let { data, error: err } = await supabase
      .from('focus_blocks')
      .select(`${CONTENT_DOSE_COLUMN},${CONTENT_DOSE_SEEN_COLUMN}`)
      .eq('id', blockId)
      .maybeSingle();
    if (err && isMissingSeenColumnError(err) && !isMissingContentDoseColumnError(err)) {
      console.warn(CONTENT_DOSE_SEEN_COLUMN_MISSING_WARN);
      setNewDoseWaiting(false);
      return; // bez kolumny „seen" nie ma jak odróżnić nowej od przeczytanej
    }
    if (err || !data) { setNewDoseWaiting(false); return; }
    const row = data as Record<string, unknown>;
    const parsed = parseContentDoses(row[CONTENT_DOSE_COLUMN]);
    if (parsed.kind !== 'ready' || parsed.doses.length === 0) { setNewDoseWaiting(false); return; }
    const seen = parseSeenKeys(row[CONTENT_DOSE_SEEN_COLUMN]);
    setNewDoseWaiting(!isDoseSeen(seen, parsed.doses[0].klucz));
  }, []);

  const loadHint = useCallback(async (params: {
    segmentId: string | null;
    componentId: string | null;
    birthYear: number | null;
  }) => {
    const { segmentId, componentId, birthYear } = params;
    if (!segmentId) {
      setHintState(buildHintState({ hasGoal: false, error: null, rows: null, age: null }));
      return;
    }
    const age = minimumPossibleAge(birthYear);
    // ZAPIS B7 08.08.2026 (M19) — pytamy rozszerzoną listą kolumn (z
    // `zawsze_widoczna`); gdy migracji nie ma, powtarzamy starą listą i
    // zachowanie wraca bajt w bajt do stanu sprzed rundy 6. Diff wprost
    // z raportu B rundy 6, sekcja 8.1 — to jest WARUNEK wejścia treści
    // bezpieczeństwa do bazy.
    let { data, error: err } = await supabase
      .from('component_hints')
      .select(COMPONENT_HINT_COLUMNS_WITH_ALWAYS)
      .eq('segment_id', segmentId)
      .eq('active', true);
    if (err && shouldRetryWithoutAlwaysVisible(err)) {
      console.warn(ALWAYS_VISIBLE_COLUMN_MISSING_WARN);
      ({ data, error: err } = await supabase
        .from('component_hints')
        .select(COMPONENT_HINT_COLUMNS)
        .eq('segment_id', segmentId)
        .eq('active', true));
    }
    setHintState(buildHintState({
      hasGoal: true,
      error: err,
      rows: err ? null : ((data ?? []) as unknown as ComponentHintRow[]),
      componentId,
      age,
    }));
  }, []);

  const load = useCallback(async () => {
    if (!currentUser) return;
    const todayStr = toLocalDateStr(new Date());
    const todayCode = dayCodeFor(new Date());
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [goalsRes, logsRes, recsRes, eventsRes, blocksRes, doneLogsRes, userRes] = await Promise.all([
      supabase.from('goals').select('id,segment_id,is_priority,status,created_at,origin,suggestion_note,refinement_note')
        .eq('user_id', currentUser.id).eq('status', 'active')
        .order('is_priority', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('daily_logs').select('id')
        .eq('user_id', currentUser.id).gte('created_at', startOfDay.toISOString()).limit(1),
      // JEDNA DROGA B2 08.08.2026 — pełne kolumny karty (nie skrót jak dotąd),
      // bo karta pokazuje teraz całą treść i przyciski. Ta sama lista kolumn co
      // w Centrum Decyzji (RECOMMENDATION_COLUMNS) — jedno źródło.
      supabase.from('decision_recommendations').select(RECOMMENDATION_COLUMNS)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false }),
      supabase.from('calendar_events').select('id,title,event_type,scheduled_date,recurrence_rule,focus_block_id')
        .eq('user_id', currentUser.id).eq('status', 'scheduled'),
      // WIEDZA B4 08.08.2026 — doszło `component_id` (Element Bloku Skupienia),
      // żeby podpowiedź dało się wycelować w to, nad czym zawodnik pracuje.
      supabase.from('focus_blocks').select('id,segment_id,status,component_id')
        .eq('user_id', currentUser.id).eq('status', 'active'),
      // Wykonanie sesji rozpoznajemy po `daily_logs.calendar_event_id` — ten sam
      // wzorzec co plakietki „Wykonano / Nie wykonano" w kalendarz.tsx.
      supabase.from('daily_logs').select('calendar_event_id')
        .eq('user_id', currentUser.id).not('calendar_event_id', 'is', null),
      // WIEDZA B4 08.08.2026 — rocznik. JEDYNE źródło wieku, jakie appka ma
      // (`app/(tabs)/profil.tsx`, etap 0 kreatora). Karmi wyłącznie bramkę
      // wiekową A9 i nie jest nigdzie pokazywany.
      supabase.from('users').select('birth_year').eq('id', currentUser.id).limit(1),
    ]);

    const goals = (goalsRes.data ?? []) as Goal[];
    const goal = goals.find((g) => g.is_priority) ?? goals[0] ?? null;
    setPriorityGoal(goal);
    setHasAnyGoal(goals.length > 0);

    setLoggedToday(!!(logsRes.data && logsRes.data.length > 0));

    const recs = (recsRes.data ?? []) as unknown as RecommendationRow[];
    const rec = recs.find((r) => r.recommendation_type === 'training_focus') ?? null;
    unreadSnapshotRef.current = new Set(recs.filter((r) => !r.viewed_at).map((r) => r.id));
    setFocusRec(rec);
    // „N nowe" na linku do wszystkich rekomendacji liczy WYŁĄCZNIE te, których
    // ten ekran nie pokazuje — inaczej etykieta kłamałaby zaraz po wejściu.
    setOtherUnreadCount(recs.filter((r) => !r.viewed_at && r.id !== rec?.id).length);
    setOpenActionableCount(recs.filter((r) =>
      (r.recommendation_type === 'specialist_referral' || r.recommendation_type === 'position_fit_signal')
      && !r.feedback_response).length);
    markShownAsViewed(rec);

    const events = (eventsRes.data ?? []) as CalEvent[];
    const forToday = events.filter((e) =>
      e.scheduled_date === todayStr ||
      (!!e.recurrence_rule && e.recurrence_rule.replace('weekly:', '').split(',').includes(todayCode))
    );
    setTodayEvents(forToday);

    // ─── Wskaźnik pracy (patrz nagłówek pliku, punkt 4) ───────────────
    // Cała logika (i uzasadnienie każdej decyzji) siedzi w
    // lib/focusBlockProgress.ts — czysta funkcja, uruchamiana i sprawdzana bez
    // appki przez lib/focusBlockProgress.selftest.ts. Tutaj tylko dane.
    const activeBlocks = (blocksRes.data ?? []) as FocusBlockRow[];
    setWorkProgress(computeFocusBlockProgress({
      goalSegmentId: goal?.segment_id ?? null,
      activeBlocks,
      scheduledEvents: events, // wyłącznie status='scheduled' — patrz zapytanie wyżej
      doneEventIds: new Set(((doneLogsRes.data ?? []) as { calendar_event_id: number }[])
        .map((l) => l.calendar_event_id)),
    }));

    setLoading(false);

    // ─── Podpowiedź z materiału (WIEDZA B4 08.08.2026) ────────────────
    // Świadomie POZA `Promise.all` wyżej: zapytanie potrzebuje `segment_id`
    // Celu, którego przed tamtym zapytaniem nie znamy. Ekran ma na to własny
    // stan ładowania, więc rekomendacja nie czeka na podpowiedź.
    // Blok Skupienia bierzemy ten, który stoi pod Celem — nie dowolny aktywny.
    const blockForGoal = goal
      ? activeBlocks.find((b) => b.segment_id === goal.segment_id) ?? null
      : null;
    const birthYear = (userRes.data?.[0] as { birth_year: number | null } | undefined)?.birth_year ?? null;
    loadHint({
      segmentId: goal?.segment_id ?? null,
      componentId: blockForGoal?.component_id ?? null,
      // Błąd odczytu rocznika daje `null`, czyli „appka nie zna wieku", czyli
      // bramka A9 zamknięta. Nie ma tu cichego fallbacku „załóżmy, że dorosły".
      birthYear: userRes.error ? null : birthYear,
    });
    loadNewDose(blockForGoal?.id ?? null);
  }, [currentUser, markShownAsViewed, loadHint, loadNewDose]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const todayLabel = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  const goalSegmentLabel = priorityGoal ? (SEG_LABELS[priorityGoal.segment_id] ?? priorityGoal.segment_id) : null;
  const isRecLinkedToGoal = !!focusRec && !!priorityGoal && focusRec.goal_id === priorityGoal.id;

  // WIEDZA B4 08.08.2026 — podpowiedź z materiału, blok pod przyciskami karty.
  // Uzasadnienie miejsca (a nie nad przyciskami) stoi przy `footerSlot`
  // w components/RecommendationCard.tsx. Cztery stany, każdy JAWNY — reguła R5:
  // pusty wynik i brak tabeli to dwie różne rzeczy i zawodnik ma je rozróżniać
  // po tekście, nie zgadywać z ciszy.
  const renderHint = () => {
    if (hintState.state === 'no_goal') return null;
    if (hintState.state === 'loading') return null; // nic nie migocze pod przyciskami

    // ZAPIS B7 08.08.2026 (M19) — treść zawsze widoczna (m.in. bezpieczeństwo:
    // telefon zaufania) stoi NAD rotacyjną i nie znika żadnego dnia. Dziś
    // (kolumna świeżo wklejona, zero wierszy `true`) ta lista jest pusta,
    // więc ekran wygląda co do piksela jak przed tą zmianą.
    const always = hintState.alwaysVisible.map((p) => (
      <View key={p.hint.klucz} style={styles.hintBox}>
        <Text style={styles.hintEyebrow}>
          {hintEyebrow(p.source)}
          {p.source ? <Text style={styles.hintSource}>{'  ·  ' + p.source}</Text> : null}
        </Text>
        <Text style={styles.hintKind}>{hintKindLabel(p.hint.rodzaj)}</Text>
        <Text style={styles.hintText}>{p.hint.hint}</Text>
      </View>
    ));
    if (hintState.state === 'always_only') return <>{always}</>;

    if (hintState.state === 'ready') {
      return (
        <>
          {always}
          <View style={styles.hintBox}>
            {/* Nadtytuł mówi PRAWDĘ o pochodzeniu zdania: „Z materiałów Gamechange"
                tylko wtedy, gdy da się pokazać źródło. Jedyny wiersz bez źródła
                (zdanie kierujące po dawki do rodzica, decyzja A9) dostaje
                „Zasada Gamechange" — patrz `hintEyebrow` w lib/componentHints.ts. */}
            <Text style={styles.hintEyebrow}>
              {hintEyebrow(hintState.source)}
              {hintState.source ? <Text style={styles.hintSource}>{'  ·  ' + hintState.source}</Text> : null}
            </Text>
            <Text style={styles.hintKind}>{hintKindLabel(hintState.hint.rodzaj)}</Text>
            <Text style={styles.hintText}>{hintState.hint.hint}</Text>
          </View>
        </>
      );
    }

    const quietText =
      hintState.state === 'table_missing' ? HINT_TABLE_MISSING_TEXT
        : hintState.state === 'error' ? HINT_ERROR_TEXT
          : HINT_EMPTY_TEXT;
    return (
      <View style={styles.hintBox}>
        <Text style={styles.hintEyebrow}>{HINT_EYEBROW}</Text>
        <Text style={styles.hintQuiet}>{quietText}</Text>
      </View>
    );
  };

  const allRecsLinkLabel = otherUnreadCount > 0
    ? `Wszystkie rekomendacje (${otherUnreadCount} nowe) →`
    : openActionableCount > 0
      ? `Wszystkie rekomendacje (${openActionableCount} do sprawdzenia) →`
      : 'Wszystkie rekomendacje →';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        <Text style={styles.eyebrow}>{todayLabel}</Text>
        <Text style={styles.title}>Dziś</Text>

        {/* CEL — element PIERWSZY ekranu (zatwierdzone 06.08.2026), od
            08.08.2026 mały: nazwa + wskaźnik pracy + pasek, nic więcej.
            Cały kafelek to przycisk do szczegółów Celu (`/cele`) — patrz
            punkt 1 w nagłówku pliku.
            `numberOfLines={1}` na nazwie trzyma wysokość przewidywalną —
            i wszystkie 13 nazw segmentów faktycznie się w tej jednej linii
            mieści, także najdłuższa („Technika Specjalistyczna", 24 znaki),
            także na ekranie 320 dp szerokości. Policzone, nie założone —
            raport zwrotny B runda 3, sekcja 12. Dlatego rozmiar to 21 px,
            a nie 22: przy 22 px najdłuższa nazwa wychodziła 5 dp za wąski
            ekran i zostałaby ucięta wielokropkiem. */}
        <TouchableOpacity style={styles.heroGoal} onPress={() => router.push('/cele')}>
          <Text style={styles.heroEyebrow}>Twój aktywny Cel</Text>
          {/* WIEDZA B4 08.08.2026 — dług N2 (znalezisko B18, otwarte od rundy 2).
              Bez tego zawodnik przy pierwszym wejściu widział przez ułamek
              sekundy „Nie masz jeszcze Celu" — zdanie nieprawdziwe dla większości
              zalogowanych. Patrz nagłówek pliku. */}
          {loading ? (
            <Text style={styles.heroLoading}>Wczytuję Twój Cel…</Text>
          ) : priorityGoal ? (
            <>
              <Text style={styles.heroTitle} numberOfLines={1}>{goalSegmentLabel}</Text>

              {/* Wskaźnik PRACY, nie upływu czasu (JEDNA DROGA B2 08.08.2026).
                  NAWIGACJA B3 08.08.2026 — skrócony do brzmienia z decyzji B5:
                  „3 z 6 sesji zrobione". Słowa „Bloku Skupienia" zeszły razem
                  z resztą kontekstu do szczegółów Celu; pod nazwą Celu nie ma
                  wątpliwości, o jakich sesjach mowa. */}
              {workProgress ? (
                <>
                  <Text style={styles.workText}>
                    {workProgress.done} z {workProgress.total} sesji zrobione
                  </Text>
                  <View style={styles.workTrack}>
                    <View style={[styles.workFill, { width: `${Math.round((workProgress.done / workProgress.total) * 100)}%` }]} />
                  </View>
                  {/* ZAPIS B7 08.08.2026 (M23/B35) — dawka była dotąd za dwoma
                      kliknięciami i nic na Dziś o niej nie mówiło. Jedna linia,
                      tylko gdy najnowsza dawka jest NIEOTWARTA; cały kafelek
                      i tak prowadzi do Celu, więc zero nowych tras. */}
                  {newDoseWaiting ? (
                    <Text style={styles.heroAction}>Nowa porcja w Twoim Bloku →</Text>
                  ) : null}
                </>
              ) : (
                // Brak Bloku pod ten Cel → ŻADNEJ zastępczej liczby (nigdy
                // „0 z 0"), tylko zaproszenie. Zwykły tekst, nie osobny
                // przycisk: cały kafelek prowadzi w to samo miejsce.
                <Text style={styles.heroAction}>Zaplanuj pracę nad tym Celem →</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.heroTitle}>Nie masz jeszcze Celu</Text>
              <Text style={styles.heroAction}>Załóż pierwszy Cel →</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Rekomendacja dnia — od 08.08.2026 PEŁNA, z przyciskami. Jedyna akcja
            decyzyjna na ekranie domowym. */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionLabel}>Co dziś zrobić</Text>
          {/* WIEDZA B4 08.08.2026 — dług N2: pierwsze wejście nie udaje już, że
              rekomendacji nie ma. Patrz nagłówek pliku. */}
          {loading ? (
            <View style={styles.card}>
              <Text style={styles.cardBody}>Wczytuję…</Text>
            </View>
          ) : focusRec && currentUser ? (
            <>
              <RecommendationCard
                rec={focusRec}
                currentUserId={currentUser.id}
                isUnread={unreadSnapshotRef.current.has(focusRec.id)}
                headerSlot={isRecLinkedToGoal && goalSegmentLabel
                  ? <Text style={styles.linkedToGoal}>Pomaga Ci w celu: {goalSegmentLabel}</Text>
                  : null}
                // WIEDZA B4 08.08.2026 — SEDNO TEJ RUNDY: konkret z materiałów
                // Kuby ze źródłem, pod przyciskami. Patrz `footerSlot`
                // w components/RecommendationCard.tsx.
                footerSlot={renderHint()}
                onSubmitted={load}
              />
              <TouchableOpacity style={styles.inlineLink} onPress={() => router.push('/centrum-decyzji')}>
                <Text style={styles.cardAction}>{allRecsLinkLabel}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardBody}>
                {hasAnyGoal
                  ? 'Jeszcze nie mamy dla Ciebie gotowej rekomendacji — pojawi się tu, gdy silnik Centrum Decyzji zacznie działać.'
                  : 'Załóż swój pierwszy Cel, żeby system zaczął podpowiadać, na czym się skupić.'}
              </Text>
              {/* Brak rekomendacji NIE oznacza braku wiedzy: podpowiedź z materiału
                  wisi na segmencie Celu, więc zawodnik z Celem, ale bez gotowej
                  rekomendacji, i tak dostaje dziś konkret. Bez Celu `renderHint()`
                  zwraca `null` i karta wygląda jak dotąd. */}
              {renderHint()}
              <TouchableOpacity style={styles.inlineLink} onPress={() => router.push(hasAnyGoal ? '/centrum-decyzji' : '/cele')}>
                <Text style={styles.cardAction}>{hasAnyGoal ? allRecsLinkLabel : 'Przejdź do Celów →'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Diagnoza żywa — Funkcja 10, część 2 (INTEGRACJA_DIAGNOZA_ZYWA.md).
            Renderuje się sama w null, gdy pulse nie jest dziś należny.
            ⛔ Zamrożona 06.08.2026 (LIVING_DIAGNOSIS_PULSE_ENABLED = false) —
            nietknięta w tej sesji, nie odmrażana. */}
        <LivingDiagnosisPulseCard />

        {/* Wpis dnia */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionLabel}>Dziennik</Text>
          <TouchableOpacity style={[styles.card, loggedToday && styles.cardMuted]} onPress={() => router.push('/dziennik')}>
            <Text style={styles.cardLabel}>
              {loggedToday ? 'Dzisiejszy wpis zapisany' : 'Nie masz jeszcze dzisiejszego wpisu'}
            </Text>
            <Text style={styles.cardAction}>{loggedToday ? 'Dodaj kolejny wpis →' : 'Zapisz dzisiejszy wpis →'}</Text>
          </TouchableOpacity>
        </View>

        {/* Dzisiejszy kalendarz. JEDNA DROGA B2 08.08.2026 — jedna karta z listą
            zamiast osobnej karty na każde wydarzenie (patrz nagłówek: co ustąpiło). */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionLabel}>Dziś w kalendarzu</Text>
          <TouchableOpacity style={styles.card} onPress={() => router.push('/kalendarz')}>
            {todayEvents.length === 0 ? (
              <Text style={styles.cardBody}>Nic zaplanowanego na dziś.</Text>
            ) : (
              todayEvents.map((e) => (
                <Text key={e.id} style={styles.eventLine}>
                  <Text style={styles.eventTitle}>{e.title}</Text>
                  {'  ·  '}{EVENT_TYPE_LABELS[e.event_type] || e.event_type}
                </Text>
              ))
            )}
            {/* NAWIGACJA B3 08.08.2026 — to jest JEDYNE wejście do Kalendarza
                po zabraniu jego zakładki z paska, więc link musi nazywać obie
                rzeczy, które są po drugiej stronie: przeglądanie i dodawanie.
                „Otwórz Kalendarz →" nie mówiłoby zawodnikowi, że stamtąd
                planuje się trening. */}
            <Text style={styles.cardAction}>Kalendarz — dodaj i zaplanuj →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  eyebrow: { ...typography.bodyMedium, fontSize: 12, letterSpacing: 1, textTransform: 'capitalize', color: colors.textSecondary, marginBottom: 4 },
  title: { ...typography.display, fontSize: 32, marginBottom: spacing.lg, color: colors.textPrimary },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 16, marginBottom: 10 },
  cardMuted: { opacity: 0.7 },
  cardLabel: { ...typography.bodySemiBold, fontSize: 15, color: colors.textPrimary, marginBottom: 4 },
  cardBody: { ...typography.body, fontSize: 14, color: colors.textSecondary, marginBottom: 8, lineHeight: 20 },
  cardAction: { ...typography.bodyMedium, fontSize: 13, color: colors.brand },
  linkedToGoal: { ...typography.bodyMedium, fontSize: 12, color: colors.brand, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  // NAWIGACJA B3 08.08.2026 — hero Celu skurczone z ~220 dp do ~102 dp
  // (decyzja B5). Wysokość składa się z: 24 (padding pionowy 12+12)
  // + 17,8 (nadtytuł 11 px + 4 marginesu) + 32,3 (nazwa 21 px, jedna linia,
  // + 6 marginesu) + 21,3 (wskaźnik 13 px + 5) + 4 (pasek) + 2 (ramka) ≈ 101 dp.
  // Cel B5 brzmiał „~90" — jesteśmy 12 dp wyżej i to jest świadome: zejście
  // niżej wymagałoby usunięcia jednej z trzech rzeczy, które B5 kazała
  // zostawić (nazwa / wskaźnik / pasek) albo zwężenia oddechu do 8 px.
  // Zmienione względem stanu z rundy 2: `padding` 20 → 12/16, `heroTitle`
  // 30 px → 22 px, usunięte `heroContext` i `heroLinksRow`.
  // Cały kafelek jest dotykalny, więc nie potrzebuje własnych stref dotyku
  // 48 dp w środku — i to jest połowa oszczędzonej wysokości.
  heroGoal: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 4, borderLeftColor: colors.brand, borderRadius: radii.lg,
    paddingVertical: 12, paddingHorizontal: 16, marginBottom: 4,
  },
  heroEyebrow: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 4 },
  heroTitle: { ...typography.displayExtraBold, fontSize: 21, color: colors.textPrimary, marginBottom: 6 },
  heroAction: { ...typography.bodyMedium, fontSize: 13, color: colors.brand },
  // WIEDZA B4 08.08.2026 — dług N2. Wysokość dobrana tak, żeby stan ładowania
  // NIE był wyższy niż stan docelowy (21 px nazwa + 6 marginesu + 13 px wskaźnik
  // + 5 + 4 pasek ≈ 49 dp; tu 20 + 5 + 4 + 20 = 49). Ekran nie skacze w dół,
  // gdy dane dojdą — a to jest cały sens tego stanu.
  heroLoading: { ...typography.body, fontSize: 15, lineHeight: 20, color: colors.textSecondary, marginBottom: 29 },
  // JEDNA DROGA B2 08.08.2026 — wskaźnik pracy.
  workText: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary, marginBottom: 5 },
  workTrack: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  workFill: { height: 4, borderRadius: 2, backgroundColor: colors.brand },
  // WIEDZA B4 08.08.2026 — PODPOWIEDŹ Z MATERIAŁU.
  // Kreska u góry zamiast własnej ramki: to jest część TEJ karty, a nie druga
  // karta pod nią. Zawodnik ma przeczytać „to należy do tej rekomendacji", nie
  // „doszedł kolejny kafelek".
  hintBox: {
    marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  hintEyebrow: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 6 },
  // Źródło w kolorze marki — to JEDYNA rzecz na tym ekranie, która mówi
  // zawodnikowi, że zdanie obok pochodzi z konkretnej strony konkretnej książki,
  // a nie z generatora. Dlatego nie jest szare.
  hintSource: { ...typography.bodySemiBold, color: colors.brand, letterSpacing: 0.5 },
  hintKind: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary, marginBottom: 4 },
  hintText: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textPrimary },
  // Stan „nie mam skąd wziąć" (reguła R5) — spokojny, szary, JAWNY. Nigdy pustka.
  hintQuiet: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  inlineLink: { minHeight: minTouchHeight, justifyContent: 'center' },
  eventLine: { ...typography.body, fontSize: 14, color: colors.textPrimary, marginBottom: 6, lineHeight: 20 },
  eventTitle: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary },
});
