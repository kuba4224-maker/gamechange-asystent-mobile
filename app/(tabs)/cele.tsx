// Ekran WĄSKIE GARDŁA (plik i trasa nadal `cele` — nazwy plików i tras
// świadomie bez zmian). Krok 7 checklisty, implementacja wg docs/KONTRAKT_CELE.md.
//
// ⚠️ PLAN-D-A 08.2026 — SŁOWNIK TRZECH POZIOMÓW. Ten ekran pokazuje POZIOM 2:
// `goals` = WĄSKIE GARDŁO (miesiące). Poziom 1 (CEL, lata, jeden) to blok
// „Twój Cel" u góry, czytany z `player_profiles.goal_direction`. Poziom 3
// (BLOK, 4–8 tygodni) renderuje się w karcie wąskiego gardła.
// Wszystkie komentarze niżej pisane przed 11.08.2026 mówią „Cel" tam, gdzie
// dziś jest „wąskie gardło" — zostawione jako zapis, jak było, zgodnie z zakazem
// przepisywania historii. Kod i teksty na ekranie są już w nowym słowniku.
//
// AUDYT 27.07.2026: `useEffect` -> `useFocusEffect` + `RefreshControl` — patrz
// uzasadnienie w app/(tabs)/dziennik.tsx.
//
// TOR 7 KROK 4 (30.07.2026): Doprecyzowanie celu przebudowane z wolnego pola
// tekstowego na przepływ Obszar→Element z Bazy Składowych Segmentów
// (`segment_components`, patrz claude/BAZA_SKLADOWYCH_SEGMENTOW_FINAL.md,
// architektura: claude/PLAN_SPOJNEJ_SCIEZKI.md sekcja 3G) + miękka AI-walidacja
// (nowy endpoint /api/validate-goal-refinement). Krok 0 tej sesji (żywe
// zapytania do Supabase) potwierdził: dane z BAZA_SKLADOWYCH_SEGMENTOW_FINAL.md
// są już w tabeli (99 wierszy, 12 segmentów — `techSpec` świadomie poza tym
// procesem), kolumna `evidence_strength` już istnieje i jest wypełniona (NOT
// NULL, 4 wartości: SILNE/REASONABLE/PRAKTYKA TRENERSKA/MIESZANE), a
// `position_id` jest puste dla 100% wierszy we wszystkich segmentach (w tym
// `techFund`, 15/15) — więc UI niżej NIE filtruje Obszarów po pozycji
// zawodnika, zgodnie z rozstrzygnięciem z dokumentu startowego tego kroku.
// "Opisz sam" zostaje dostępne w KAŻDYM momencie tego przepływu (wymóg z
// dokumentu startowego) — w tym jako automatyczny fallback dla `techSpec`
// (0 wierszy w tabeli dla tego segmentu — bez crashowania/pustego ekranu).
//
// TOR 7 KROK 5a (31.07.2026): przycisk "Zaplanuj pracę nad tym celem" na
// karcie aktywnego celu — precyzowanie + dozowanie + automatyczny wpis do
// kalendarza (Faza 1 "Start" z PLAN_SPOJNEJ_SCIEZKI.md sekcja 3E). Cała
// logika przepływu (Obszar→Element→"opisz sam" zawężone do celu, wywołanie
// /api/generate-focus-block-dosing, edycja sugestii, zapis focus_blocks +
// calendar_events) wydzielona do components/FocusBlockPlanner.tsx — zbyt
// dużo dodatkowego stanu, żeby trzymać to w tym już dużym pliku (patrz
// komentarz w dokumencie startowym tego kroku o rozważeniu osobnego pliku).
// Egzekwowanie limitu "jeden aktywny Blok na filar" w UI: `activeBlocksByPillar`
// niżej, ładowane razem z celami — prawdziwe wymuszenie to unique index w
// bazie (`one_active_focus_block_per_pillar`), to tylko czytelny komunikat
// zamiast surowego błędu bazy na końcu przepływu.
// AUDYT 06.08.2026 — usunięty równoległy stan `activeBlockPillars` (Set<string>):
// był ustawiany, ale nigdy nieczytany w renderze (render używa wyłącznie
// `activeBlocksByPillar.has(pillar)`). Pozostałość po Kroku 5a. Usunięty też
// nieużywany styl `blockedText`.
//
// ═══════════════════════════════════════════════════════════════════
// WIEDZA B4 08.08.2026 — WRACA KONTEKST „SKĄD SIĘ WZIĄŁ TEN CEL"
// (dług N1 z audytu po bloku 3 / znalezisko B15; decyzja Kuby: wpinamy w /cele,
//  nie kasujemy)
//
// CO SIĘ STAŁO: runda 3 skurczyła hero Celu na ekranie Dziś z ~220 dp do ~101 dp
// i kontekst „Zasugerowany przez trenera: …" / „Twoja notatka: …" zszedł stamtąd.
// Miał trafić tutaj — i nie trafił. Przez jedną rundę `lib/goal-prominence.ts`
// nie miał ANI JEDNEGO konsumenta produkcyjnego (używał go tylko własny
// selftest), a zawodnik stracił jedyne zdanie mówiące, skąd się ten Cel wziął.
// To była JEDYNA funkcja z mapy przed/po rundy 3, która po niej nie była nigdzie
// widoczna.
//
// GDZIE WRACA: na kartę Celu, tuż pod nazwą filaru — czyli w miejscu, w którym
// zawodnik ogląda szczegóły tego Celu, a nie na ekranie domowym, gdzie ta linia
// kosztowała wysokość potrzebną na przyciski feedbacku.
//
// DLACZEGO `goalOriginContext`, A NIE POWTÓRZENIE `refinement_note` NIŻEJ:
// funkcja rozstrzyga PIERWSZEŃSTWO (notatka trenera > notatka zawodnika >
// ogólna etykieta wg `origin`) i formatuje zdanie. Karta pokazywała dotąd samo
// `refinement_note` bez etykiety — czyli notatkę bez informacji, czyja jest.
// Cel zasugerowany przez trenera wyglądał tak samo jak wybrany samodzielnie.
import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
// SCROLL R13 08.08.2026 — parametry trasy z deep-linku dawki (pushDeepLink.ts).
import { useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { toLocalDateStr, formatDatePl } from '../../lib/date-utils';
import { colors, typography, spacing, radii, minTouchHeight, skew } from '../../constants/theme';
// JEDNA DROGA B2 08.08.2026 — jedno źródło nazw segmentów i filarów.
import {
  SEGMENT_LABELS,
  SEGMENT_PILLAR,
  SEGMENTS_BY_PILLAR as SEGMENTS_BY_PILLAR_SHARED,
  // PLAN-D-A 08.2026 — słownik trzech poziomów (CEL / WĄSKIE GARDŁO / BLOK).
  GARDLA_SCREEN_TITLE,
  GARDLO_BADGE_DONE,
  GARDLO_BADGE_CLOSED,
  GARDLO_DONE_LABEL,
  GARDLO_STOP_LABEL,
} from '../../lib/labels';
import FocusBlockPlanner from '../../components/FocusBlockPlanner';
import FocusBlockActiveView from '../../components/FocusBlockActiveView';
// WIEDZA B4 08.08.2026 — dług N1: `goal-prominence.ts` odzyskuje konsumenta
// produkcyjnego. Patrz nagłówek pliku.
import { goalOriginContext } from '../../lib/goal-prominence';
// SCROLL R13 08.08.2026 — czysta decyzja „czy i dokąd przewinąć" po wejściu
// z pusha o nowej dawce ('/cele?dawka=1&fb=…'); selftest: lib/doseScroll.selftest.ts.
import { doseScrollY, firstParam } from '../../lib/doseScroll';

// JEDNA DROGA B2 08.08.2026 — lokalne kopie nazw segmentów i podziału na filary
// usunięte; jedno źródło to lib/labels.ts. Aliasy poniżej zachowują dotychczasowe
// nazwy zmiennych, żeby nie ruszać ani jednego miejsca użycia w tym pliku
// (Picker, karty celów, przekazanie `pillar` do FocusBlockPlanner).
// Treść i KOLEJNOŚĆ pozycji niezmienione co do znaku — sprawdzone maszynowo:
// wypłaszczone SEGMENTS_BY_PILLAR daje dokładnie SEGMENT_ORDER, jak dotąd.
const SEGMENTS_BY_PILLAR = SEGMENTS_BY_PILLAR_SHARED;
const SEG_LABELS = SEGMENT_LABELS;
const SEG_PILLAR = SEGMENT_PILLAR;
// ── PLAN-D-Q 08.2026 (13.08.2026) — ETYKIETY CELU: CZTERY KOPIE JEDNEJ LISTY ──
// Zmieniasz tutaj — zmień w POZOSTAŁYCH TRZECH, w tej samej kolejności:
//   • Asystent Gamechange/app/(tabs)/cele.tsx    — GOAL_DIRECTION_LABELS ← TEN PLIK
//   • Asystent Gamechange/app/(tabs)/profil.tsx  — GOAL_DIRECTION_LABELS, kreator etap 2
//   • gamechange-app/asystent_app.html           — GOAL_DIRECTION_LABELS
//   • gamechange-diagnoza/index.html             — #goal-buttons + CTX_LABELS.goal + GOAL_DIRECTION_KEYS
// KOLEJNOŚĆ JEST CZĘŚCIĄ DECYZJI: `zawodowo` PIERWSZE, `other` OSTATNIE. Nie sortuj.
// `other` wpada do istniejącego pola `goal_direction_note` — nie ma osobnego pola.
// Strażnik: Asystent Gamechange/lib/etykietyCelu.selftest.ts (porównuje ZBIORY KLUCZY).
// 12.08.2026 dokładnie ten kształt — jedna kopia zmieniona, trzy nie — zabił Mapę drogi.
const GOAL_DIRECTION_LABELS: Record<string, string> = {
  zawodowo: 'Dojść do futbolu zawodowego',
  najwyzej_jak_moge: 'Zajść tak wysoko, jak zdołam',
  nie_do_pominiecia: 'Być zawodnikiem, którego trudno pominąć',
  jedna_rzecz: 'Doprowadzić do końca jedną rzecz w swojej grze',
  w_grze_na_dlugo: 'Zostać w grze na długo',
  other: 'Coś innego — napiszę własnymi słowami',
};

// Baza Składowych Segmentów — Tor 7 Krok 4. Etykiety poziomu dowodów, patrz
// claude/BAZA_SKLADOWYCH_SEGMENTOW_FINAL.md — te same 4 wartości co w bazie,
// tylko czytelniejsze dla zawodnika (dyskretna, opcjonalna etykieta, patrz
// dokument startowy tego kroku: "nie wymagane do zamknięcia, dodaj tylko
// jeśli dane są gotowe i nie komplikuje to zbytnio UI").
const EVIDENCE_LABELS: Record<string, string> = {
  SILNE: 'silne dowody naukowe',
  REASONABLE: 'dość dobre dowody',
  'PRAKTYKA TRENERSKA': 'praktyka trenerska',
  MIESZANE: 'mieszane dowody',
};

const GOAL_VALIDATION_API_URL = 'https://gamechange-app.vercel.app/api/validate-goal-refinement';

// ═══════════════════════════════════════════════════════════════════
// PLAN-D-T 08.2026 (14.08.2026), zadanie T6 — KOMUNIKAT O BRAKU DOSTĘPU.
//
// Do tej rundy ten ekran pokazywał zawodnikowi z wygasłym okresem próbnym
// surowy błąd bazy: „Nie udało się dodać wąskiego gardła: new row violates
// row-level security policy for table «goals»". Z tego zdania nie da się
// wyczytać ani co się stało, ani że nic nie zginęło.
//
// ⚠️ ZERO NOWEJ TREŚCI: to jest DOKŁADNIE ten sam komunikat, którym pas K
// zastąpił błąd w Dzienniku. Trzy ekrany, jedno zdanie.
// ⚠️ To NIE jest ścieżka odzysku — nie ponawiamy zapisu i nie zmieniamy jego
// treści. Zmienia się wyłącznie zdanie, które zawodnik czyta.
//
// ⚠️ PLIK ZMIENIONY PRZEZ PAS Q 13.08.2026 (etykiety Celu) — odczytany
// z dysku przed edycją i nietknięty poza trzema miejscami obsługi błędu.
// ═══════════════════════════════════════════════════════════════════
import { toJestBrakDostepu, ZAPIS_ODRZUCONY_BRAK_DOSTEPU } from '../../lib/dostepKonta';

// ZMIANA OBRAZU B5 08.08.2026 — rozpoznanie „nie ma takiej kolumny".
// PostgREST zgłasza to na dwa sposoby zależnie od wersji (`42703` z Postgresa
// albo `PGRST204` ze schema cache), a kod bywa pusty — dlatego sprawdzamy oba
// i treść komunikatu, tak samo jak `isMissingTableError()` w lib/componentHints.ts.
function isUnknownColumnError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === '42703' || e.code === 'PGRST204') return true;
  const msg = (e.message ?? '').toLowerCase();
  return msg.includes('component_id') && (msg.includes('column') || msg.includes('schema cache'));
}

type Goal = {
  id: number; segment_id: string; status: string; is_priority: boolean;
  refinement_note: string | null; horizon_weeks: number | null;
  created_at: string; ended_at: string | null;
  // WIEDZA B4 08.08.2026 — dług N1. Te dwie kolumny BYŁY już pobierane
  // (`loadGoals()` robi `select('*')`), tylko typ ich nie znał, więc kontekst
  // „skąd się wziął ten Cel" nie dało się narysować bez rzutowania. Zero zmian
  // w zapytaniu. Kształt zgodny z `GoalOriginInfo` z lib/goal-prominence.ts.
  origin: string | null;
  suggestion_note: string | null;
};

type SegmentComponent = { id: string; name: string; evidence_strength?: string | null };
type ValidationResult = { passes: boolean; hint: string | null };

// Tor 7 Krok 5b — pelny wiersz focus_blocks (nie tylko nazwa filaru) +
// rozwiazana etykieta elementu, do przekazania w FocusBlockActiveView.
type ActiveFocusBlock = {
  id: string; user_id: string; segment_id: string; component_id: string | null;
  custom_description: string | null; pillar: string;
  status: 'active' | 'completed' | 'abandoned'; stage: string | null;
  sessions_per_week: number; target_weeks: number; started_at: string; closed_at: string | null;
  elementLabel: string;
};

export default function CeleScreen() {
  const { currentUser } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [segmentId, setSegmentId] = useState(SEGMENTS_BY_PILLAR[0][1][0][0]);
  const [note, setNote] = useState('');
  const [horizon, setHorizon] = useState('');
  const [isPriority, setIsPriority] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [directionContext, setDirectionContext] = useState<{ label: string; note: string | null } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // --- Tor 7 Krok 5a: Blok — które wąskie gardło jest właśnie planowane +
  // otwarte Bloki zawodnika ---
  //
  // PLAN-D-A 08.2026 — MAPA KLUCZOWANA PO SEGMENCIE, NIE PO FILARZE.
  // Do 10.08.2026 baza miała `one_active_focus_block_per_pillar`, więc jeden
  // filar = najwyżej jeden Blok i mapa po filarze była wierna. Migracja A2
  // z 10.08.2026 usunęła ten indeks i założyła
  // `one_active_focus_block_per_segment` — od tej chwili zawodnik MOŻE mieć
  // dwa Bloki w jednym filarze (np. „Koncentracja" i „Odwaga w grze").
  // Mapa po filarze cicho gubiłaby jeden z nich (`Map.set` nadpisuje) i mogła
  // pokazać Blok z segmentu A pod wąskim gardłem z segmentu B — czyli
  // zawodnik widziałby CUDZĄ pracę pod swoim tematem, bez żadnego błędu.
  // Klucz po `segment_id` jest też zgodny z `lib/focusBlockProgress.ts`,
  // które wiąże Blok z Celem po segmencie od początku.
  const [planningGoalId, setPlanningGoalId] = useState<number | null>(null);
  const [activeBlocksBySegment, setActiveBlocksBySegment] = useState<Map<string, ActiveFocusBlock>>(new Map());

  // ── SCROLL R13 08.08.2026 — auto-scroll do karty Bloku z nową dawką ──
  // Push z dawką prowadzi na '/cele?dawka=1&fb=<id Bloku>' (lib/pushDeepLink.ts).
  // Ekran mierzy pozycje kart z aktywnym Blokiem (onLayout) i sekcji „Aktywne
  // cele", a czysta funkcja doseScrollY() rozstrzyga, czy i dokąd przewinąć —
  // w tym przypadki „karta jeszcze niezmierzona" i „fb nieznany" (wtedy NIE
  // ruszamy ekranu; scroll do złej karty jest gorszy niż brak scrolla).
  // Jeden skok na jedno wejście (klucz dawka|fb w doseScrollDoneRef).
  const doseParams = useLocalSearchParams<{ dawka?: string | string[]; fb?: string | string[] }>();
  const scrollRef = useRef<ScrollView>(null);
  const [activeSectionY, setActiveSectionY] = useState(0);
  const [blockCardYs, setBlockCardYs] = useState<Map<string, number>>(new Map());
  const doseScrollDoneRef = useRef<string | null>(null);

  const registerBlockCardY = useCallback((blockId: string, y: number) => {
    setBlockCardYs((prev) => {
      if (prev.get(blockId) === y) return prev; // bez pętli renderów
      const next = new Map(prev);
      next.set(blockId, y);
      return next;
    });
  }, []);

  useEffect(() => {
    const dawka = firstParam(doseParams.dawka);
    const fb = firstParam(doseParams.fb);
    if (dawka !== '1') return;
    const key = `${dawka}|${fb ?? ''}`;
    if (doseScrollDoneRef.current === key) return;
    // Pozycje kart są względem sekcji „Aktywne cele" — do współrzędnych
    // ScrollView dodajemy y samej sekcji. Dokładność co do kilku pikseli
    // wystarcza: chodzi o to, żeby karta z dawką była na ekranie.
    const absolute = new Map<string, number>();
    for (const [id, y] of blockCardYs) absolute.set(id, activeSectionY + y);
    const target = doseScrollY({ dawka, fb, cardYByBlockId: absolute });
    if (target === null) return; // np. layout jeszcze nie spłynął — spróbujemy po kolejnym pomiarze
    doseScrollDoneRef.current = key;
    scrollRef.current?.scrollTo({ y: target, animated: true });
  }, [doseParams.dawka, doseParams.fb, blockCardYs, activeSectionY]);

  // --- Baza Składowych Segmentów: Obszar → Element → "opisz sam" (Tor 7 Krok 4) ---
  const [obszary, setObszary] = useState<SegmentComponent[]>([]);
  const [obszaryLoading, setObszaryLoading] = useState(false);
  const [selectedObszarId, setSelectedObszarId] = useState<string | null>(null);
  const [elementy, setElementy] = useState<SegmentComponent[]>([]);
  const [elementyLoading, setElementyLoading] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [freeTextMode, setFreeTextMode] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const resetRefinementFlow = useCallback(() => {
    setSelectedObszarId(null);
    setElementy([]);
    setSelectedElementId(null);
    setFreeTextMode(false);
    setNote('');
    setValidation(null);
    setValidationError(null);
  }, []);

  const loadObszary = useCallback(async (segId: string) => {
    setObszaryLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('segment_components')
        .select('id, name')
        .eq('segment_id', segId)
        .is('parent_component_id', null)
        .order('display_order', { ascending: true });
      if (err) throw err;
      const rows = (data ?? []) as SegmentComponent[];
      setObszary(rows);
      // Segment bez Obszarów w bazie (dziś: wyłącznie `techSpec`, świadomie
      // poza procesem populacji treści — patrz komentarz na górze pliku) —
      // bezpieczny spadek na "opisz sam", zamiast pustego ekranu.
      if (rows.length === 0) setFreeTextMode(true);
    } catch {
      // Cichy fallback — jeśli baza składowych nie odpowiada z jakiegokolwiek
      // powodu, zawodnik i tak może opisać cel sam (ta opcja nigdy nie może
      // zniknąć), tylko bez podpowiedzi z listy.
      setObszary([]);
      setFreeTextMode(true);
    } finally {
      setObszaryLoading(false);
    }
  }, []);

  const loadElementy = useCallback(async (obszarId: string) => {
    setElementyLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('segment_components')
        .select('id, name, evidence_strength')
        .eq('parent_component_id', obszarId)
        .order('display_order', { ascending: true });
      if (err) throw err;
      setElementy((data ?? []) as SegmentComponent[]);
    } catch {
      setElementy([]);
    } finally {
      setElementyLoading(false);
    }
  }, []);

  const onSegmentChange = useCallback((id: string) => {
    setSegmentId(id);
    resetRefinementFlow();
    loadObszary(id);
  }, [resetRefinementFlow, loadObszary]);

  // Ładuje Obszary dla domyślnie wybranego segmentu przy pierwszym montowaniu
  // ekranu (Picker startuje na SEGMENTS_BY_PILLAR[0][1][0][0], patrz useState wyżej).
  useEffect(() => {
    loadObszary(segmentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectObszar = useCallback((obszarId: string) => {
    setSelectedObszarId(obszarId);
    setSelectedElementId(null);
    setNote('');
    setValidation(null);
    setValidationError(null);
    loadElementy(obszarId);
  }, [loadElementy]);

  const backToObszary = useCallback(() => {
    setSelectedObszarId(null);
    setSelectedElementId(null);
    setElementy([]);
    setNote('');
    setValidation(null);
    setValidationError(null);
  }, []);

  const runValidation = useCallback(async (segId: string, text: string) => {
    if (!text.trim()) { setValidation(null); return; }
    setValidating(true);
    setValidationError(null);
    try {
      const res = await fetch(GOAL_VALIDATION_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId: segId, text: text.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setValidation({ passes: !!data.passes, hint: data.hint ?? null });
    } catch (e: any) {
      // Miękka bramka w duchu całego mechanizmu: brak możliwości sprawdzenia
      // NIE blokuje zapisania celu — appka po prostu nie pokaże podpowiedzi.
      setValidationError('Nie udało się sprawdzić opisu teraz — możesz mimo to zapisać.');
      setValidation(null);
    } finally {
      setValidating(false);
    }
  }, []);

  const selectElement = useCallback((el: SegmentComponent) => {
    setSelectedElementId(el.id);
    setNote(el.name);
    runValidation(segmentId, el.name);
  }, [segmentId, runValidation]);

  const switchToFreeText = useCallback(() => {
    setFreeTextMode(true);
    setSelectedObszarId(null);
    setSelectedElementId(null);
    setElementy([]);
    setNote('');
    setValidation(null);
    setValidationError(null);
  }, []);

  const switchToList = useCallback(() => {
    setFreeTextMode(false);
    setSelectedObszarId(null);
    setSelectedElementId(null);
    setNote('');
    setValidation(null);
    setValidationError(null);
  }, []);

  const loadGoalDirectionContext = useCallback(async (currentGoals: Goal[]) => {
    if (!currentUser) return;
    const hasActive = currentGoals.some((g) => g.status === 'active');
    if (hasActive) { setDirectionContext(null); return; }
    try {
      const { data } = await supabase
        .from('player_profiles')
        .select('goal_direction,goal_direction_note')
        .eq('user_id', currentUser.id)
        .limit(1);
      const p = data?.[0];
      if (!p?.goal_direction) { setDirectionContext(null); return; }
      setDirectionContext({
        label: GOAL_DIRECTION_LABELS[p.goal_direction] ?? p.goal_direction,
        note: p.goal_direction_note ?? null,
      });
    } catch {
      setDirectionContext(null); // cichy fallback — nie blokuje zakładania celu
    }
  }, [currentUser]);

  const loadGoals = useCallback(async () => {
    if (!currentUser) return;
    const { data, error: err } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('is_priority', { ascending: false })
      .order('created_at', { ascending: false });
    if (err) return;
    const rows = (data ?? []) as Goal[];
    setGoals(rows);
    await loadGoalDirectionContext(rows);
  }, [currentUser, loadGoalDirectionContext]);

  // Tor 7 Krok 5a — otwarte Bloki zawodnika, kluczowane po SEGMENCIE
  // (PLAN-D-A 08.2026, uzasadnienie przy `activeBlocksBySegment` wyżej).
  // Ładowane obok wąskich gardeł, tym samym rytmem odświeżania.
  const loadActiveBlocks = useCallback(async () => {
    if (!currentUser) return;
    // Tor 7 Krok 5b: pełne wiersze (nie tylko `pillar`), żeby móc pokazać
    // żywy FocusBlockActiveView zamiast samego tekstu blokady. Embedding
    // `segment_components(name)` korzysta z FK component_id->segment_components.id
    // z migracji Kroku 5a — gdy component_id jest NULL (tryb "opisz sam"),
    // Supabase po prostu zwraca segment_components: null, obsłużone niżej.
    const { data, error: err } = await supabase
      .from('focus_blocks')
      .select('id, user_id, segment_id, component_id, custom_description, pillar, status, stage, sessions_per_week, target_weeks, started_at, closed_at, segment_components(name)')
      .eq('user_id', currentUser.id)
      .eq('status', 'active');
    // PLAN-D-A 08.2026 — reguła R5 („pustka wymaga jawnego stanu «nie wiem»").
    // Dotychczas błąd odczytu dawał pustą mapę, nieodróżnialną od „zawodnik
    // nie ma żadnego Bloku" — a wtedy ekran POKAZUJE przycisk „Zaplanuj Blok"
    // i zawodnik dociera do końca przepływu, żeby dostać błąd zapisu. Nie
    // pokazujemy tego zawodnikowi (to nie jest jego problem), ale mówimy
    // wprost w logu i NIE czyścimy poprzedniego stanu mapy.
    if (err) {
      console.warn('[gardla] Nie udało się odczytać otwartych Bloków — ekran pokazuje stan sprzed odświeżenia:', err.message);
      return;
    }
    const rows = (data ?? []) as any[];
    const bySegment = new Map<string, ActiveFocusBlock>();
    rows.forEach((r) => {
      bySegment.set(r.segment_id, {
        id: r.id, user_id: r.user_id, segment_id: r.segment_id, component_id: r.component_id,
        custom_description: r.custom_description, pillar: r.pillar, status: r.status, stage: r.stage,
        sessions_per_week: r.sessions_per_week, target_weeks: r.target_weeks,
        started_at: r.started_at, closed_at: r.closed_at,
        elementLabel: r.custom_description ?? r.segment_components?.name ?? (SEG_LABELS[r.segment_id] ?? r.segment_id),
      });
    });
    setActiveBlocksBySegment(bySegment);
  }, [currentUser]);

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadGoals(); loadActiveBlocks(); }, [loadGoals, loadActiveBlocks]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadGoals(), loadActiveBlocks()]);
    setRefreshing(false);
  }, [loadGoals, loadActiveBlocks]);

  const patchGoal = async (id: number, fields: Record<string, any>) => {
    const { error: err } = await supabase.from('goals').update(fields).eq('id', id);
    if (err) throw err;
  };

  const createGoal = async () => {
    if (!currentUser) return;
    setError(null); setOk(null);
    setSaving(true);

    let prevPriority: Goal | null = null;
    try {
      if (isPriority) {
        prevPriority = goals.find((g) => g.is_priority && g.status === 'active') ?? null;
        if (prevPriority) await patchGoal(prevPriority.id, { is_priority: false, priority_changed_at: new Date().toISOString() });
      }

      const body: Record<string, any> = {
        user_id: currentUser.id,
        segment_id: segmentId,
        origin: 'player_chosen',
        is_priority: isPriority,
      };
      if (note.trim()) body.refinement_note = note.trim();

      // ═══════════════════════════════════════════════════════════════
      // ZMIANA OBRAZU B5 08.08.2026 — pozycja M1 audytu po bloku 4.
      //
      // Kolumna `goals.component_id` istnieje od 08.08.2026 i NIKT W NIĄ NIE
      // PISAŁ. Ekran prowadził zawodnika przez wybór Obszar → Element z
      // `segment_components`, pokazywał listę, walidował wybór przez AI — a
      // potem zapisywał sam `segment_id` i nazwę Elementu jako zwykły tekst
      // w `refinement_note`. Wybór ginął: baza wiedziała, w JAKIM OBSZARZE
      // zawodnik pracuje, ale nie W CO celuje.
      //
      // Koszt tego był policzalny (znalezisko B24): 113 z 214 podpowiedzi z
      // `component_hints` jest przypiętych do Elementu (63) albo do Obszaru
      // (43), a `selectHintsForPlayer()` dopuszcza je wyłącznie przy
      // DOKŁADNYM dopasowaniu `component_id`. Przy pustej kolumnie zostawało
      // 108 reguł segmentowych — czyli zawodnik bez Bloku Skupienia nie miał
      // jak dostać połowy korpusu.
      //
      // CO DOKŁADNIE ZAPISUJEMY: NAJBARDZIEJ SZCZEGÓŁOWY wybór, jakiego
      // zawodnik faktycznie dokonał — Element, jeśli go wskazał, a jeśli
      // zatrzymał się na Obszarze, to Obszar. Nie „zawsze Obszar" i nie
      // „tylko Element":
      //   • Element bez Obszaru nie istnieje w tym przepływie (Elementy
      //     ładują się dopiero po wybraniu Obszaru), więc zapis Elementu
      //     niczego nie gubi — `segment_components` zna jego rodzica;
      //   • zapis Obszaru, gdy Element nie został wybrany, jest jedyną drogą
      //     do 43 podpowiedzi przypiętych do Obszarów;
      //   • „opisz sam" (`freeTextMode`) czyści OBA identyfikatory
      //     (`switchToFreeText`), więc zostaje `null` — i to jest poprawne:
      //     zawodnik nie wskazał żadnego wiersza taksonomii, a wpisanie tam
      //     czegokolwiek byłoby zgadywaniem za niego.
      const componentId = selectedElementId ?? selectedObszarId ?? null;
      if (componentId) body.component_id = componentId;
      if (horizon !== '') {
        body.horizon_weeks = Number(horizon);
        body.horizon_started_at = toLocalDateStr(new Date());
      }
      if (isPriority) body.priority_changed_at = new Date().toISOString();

      let { error: insErr } = await supabase.from('goals').insert(body);

      // ŚCIEŻKA ODZYSKU — ten sam wzorzec co zapis `source_hint` w silniku
      // (raport A runda 4, sekcja 3.4). Migracja dodająca `goals.component_id`
      // została wklejona 08.08.2026, ale gdyby tej kolumny w bazie jednak nie
      // było, BEZ tego bloku zawodnik przestałby móc założyć JAKIKOLWIEK cel —
      // czyli nowa funkcja zabiłaby starą. Zapisujemy wtedy cel bez tego
      // jednego pola i mówimy o tym w logu wprost, zamiast po cichu.
      if (insErr && componentId && isUnknownColumnError(insErr)) {
        console.warn(
          '[cele] Kolumna goals.component_id nie istnieje w bazie — cel zapisany BEZ wybranego '
          + 'Elementu. Zawodnik NIE dostanie podpowiedzi przypiętych do Elementu ani Obszaru. '
          + 'Migracja: audyt po bloku 4, pozycja M1.'
        );
        delete body.component_id;
        ({ error: insErr } = await supabase.from('goals').insert(body));
      }

      if (insErr) {
        if ((insErr as any).code === '23505' || insErr.message?.includes('idx_goals_one_active_per_segment')) {
          // PLAN-D-A 08.2026 — bez słowa „porzucony".
          throw new Error('Masz już aktywne wąskie gardło w tym segmencie — najpierw je zamknij, zanim dodasz nowe.');
        }
        throw insErr;
      }

      setOk('Wąskie gardło dodane.');
      resetRefinementFlow();
      loadObszary(segmentId);
      setHorizon(''); setIsPriority(false);
      await loadGoals();
    } catch (e: any) {
      let message = toJestBrakDostepu(e) ? ZAPIS_ODRZUCONY_BRAK_DOSTEPU : 'Nie udało się dodać wąskiego gardła: ' + e.message;
      if (prevPriority) {
        try {
          await patchGoal(prevPriority.id, { is_priority: true, priority_changed_at: new Date().toISOString() });
        } catch {
          message += ' Dodatkowo nie udało się przywrócić poprzedniego priorytetu — sprawdź listę wąskich gardeł.';
        }
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const togglePriority = async (goalId: number, makePriority: boolean) => {
    setError(null);
    let prevPriority: Goal | null = null;
    try {
      if (makePriority) {
        prevPriority = goals.find((g) => g.is_priority && g.status === 'active' && g.id !== goalId) ?? null;
        if (prevPriority) await patchGoal(prevPriority.id, { is_priority: false, priority_changed_at: new Date().toISOString() });
      }
      await patchGoal(goalId, { is_priority: makePriority, priority_changed_at: new Date().toISOString() });
      await loadGoals();
    } catch (e: any) {
      let message = toJestBrakDostepu(e) ? ZAPIS_ODRZUCONY_BRAK_DOSTEPU : 'Nie udało się zmienić priorytetu: ' + e.message;
      if (prevPriority) {
        try {
          await patchGoal(prevPriority.id, { is_priority: true, priority_changed_at: new Date().toISOString() });
        } catch {
          message += ' Dodatkowo nie udało się przywrócić poprzedniego priorytetu — sprawdź zakładkę Cele.';
        }
      }
      setError(message);
    }
  };

  // ════════════════════════════════════════════════════════════
  // PLAN-D-A 08.2026 — ZAMKNIĘCIE IDZIE PRZEZ RPC `close_goal_with_blocks`
  //
  // CO SIĘ ZMIENIŁO WZGLĘDEM WERSJI Z 10.08.2026 (opis niżej zostaje jako
  // zapis, co było zepsute i dlaczego). Poprzednia wersja robiła naprawę A1
  // po stronie appki: `update goals` + osobne `update focus_blocks` po
  // `segment_id`. Miała trzy wady, których nie da się naprawić w kliencie:
  //
  //  1. NIE BYŁA TRANSAKCJĄ. Między jednym a drugim zapytaniem zawodnik mógł
  //     stracić sieć — i zostawał z zamkniętym wąskim gardłem i otwartym
  //     Blokiem, czyli dokładnie w stanie A1.
  //  2. WIĄZAŁA PO `segment_id`. Odczyt produkcyjny z 10.08.2026 pokazał, że
  //     `focus_blocks` NIE MA kolumny `goal_id`, a jedyne prawdziwe wiązanie
  //     idzie przez `calendar_events` (12 z 12 wierszy ma oba klucze).
  //     Wiązanie po segmencie trafia w większość przypadków i cicho pudłuje
  //     w reszcie.
  //  3. NIE ANULOWAŁA PRZYSZŁYCH WYDARZEŃ. Zawodnik dalej dostawał pushe
  //     o pracy, którą zamknął.
  //
  // Funkcja `public.close_goal_with_blocks(goal, status)` wdrożona na
  // produkcji 10.08.2026 (`security invoker`, `grant execute` dla
  // `authenticated`) robi wszystkie trzy rzeczy w jednej transakcji i sama
  // ustawia `focus_blocks.closed_at` (kolumna nazywa się `closed_at`, NIE
  // `ended_at` — asymetria wobec `goals.ended_at` jest celowa i potwierdzona
  // odczytem schematu).
  //
  // ⛔ ZAKAZ ŚCIEŻKI ODZYSKU. Gdy RPC nie istnieje (42883 / PGRST202), NIE
  // wracamy po cichu do `update goals` — to odtworzyłoby defekt A1 i zrobiło
  // go niewidocznym po raz drugi. Mówimy zawodnikowi, że się nie udało,
  // i zostawiamy w logu zdanie, po którym da się rozpoznać brak migracji.
  //
  // ⚠️ `p_goal_id` PRZEKAZUJEMY BEZ KONWERSJI — dokładnie tę wartość, którą
  // zwróciła baza w `goals.id`. Typ w tym pliku mówi `number`, a podpis
  // funkcji spisany 10.08.2026 mówi `uuid`; jedno z tych dwóch jest nieaktualne
  // i tej sesji nie wolno wykonywać SQL, żeby rozstrzygnąć które. Przekazanie
  // wartości bez dotykania jej jest jedynym wariantem poprawnym w OBU
  // przypadkach. Sprawdzenie dla Kuby: raport PLAN-D-A, sekcja 8.
  //
  // ── zapis stanu sprzed tej zmiany ──
  // NAPRAWA A1 — 10.08.2026
  //
  // CO BYŁO ZŁE. Ta funkcja zmieniała WYŁĄCZNIE wiersz w `goals` i nie
  // dotykała `focus_blocks` ani razu. Zawodnik klikał „Ukończony", a jego
  // Blok Skupienia zostawał w bazie ze statusem `active` — i jednocześnie
  // ZNIKAŁ z ekranu, bo karta renderuje Blok tylko przy Celu
  // `status === 'active'` (patrz `hostedBlock` w `renderGoalCard`).
  // Skutki, wszystkie nieodwracalne z poziomu appki:
  //   • `loadActiveBlockPillars()` dalej ładował ten Blok, więc filar
  //     zostawał ZAJĘTY — nowy Cel w tej samej kategorii nigdy nie dostawał
  //     przycisku „Zaplanuj pracę nad tym celem";
  //   • pod nowym Celem wyświetlał się osierocony Blok od poprzedniego;
  //   • `api/cron-send-notifications.js` bierze wszystkie bloki `active`
  //     bez wiedzy o Celu i dalej wysyłał pushe o pracy, którą zawodnik
  //     już zamknął.
  // Jedno dotknięcie przycisku stojącego wprost na karcie Celu, obok
  // „Ustaw priorytet", wyłączało pracę w całym filarze — bez słowa
  // komunikatu. Najpoważniejsze znalezisko audytu ścieżki z 09.08.2026
  // (pozycja A1) i prawdopodobna przyczyna incydentu z rotacją celu z 08.08.
  //
  // DLACZEGO PO `segment_id`, A NIE PO `pillar`. Mapa `activeBlocksByPillar`
  // kluczuje Bloki po FILARZE, ale `lib/focusBlockProgress.ts` wiąże je po
  // SEGMENCIE — i to drugie jest właściwe (wiązanie po filarze jest osobną
  // wadą, znalezisko A2 tego samego audytu). Zamykamy więc wyłącznie Blok
  // TEGO segmentu, żeby nie zamknąć cudzego Bloku z tego samego filaru.
  //
  // STATUS BLOKU jest lustrem statusu Celu — ten sam słownik, którego używa
  // `components/FocusBlockActiveView.tsx` przy ręcznym zamykaniu.
  // ════════════════════════════════════════════════════════════
  // Liczba z odpowiedzi RPC, która NIE UDAJE zera. Funkcja może zwrócić liczbę
  // albo tablicę identyfikatorów (kontrakt spisany słownie, nie sprawdzony
  // odczytem) — oba kształty czytamy, a wszystko inne daje `null`, czyli
  // „nie wiem", i wtedy po prostu nie mówimy zawodnikowi zdania o Blokach.
  const liczbaZOdpowiedzi = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (Array.isArray(v)) return v.length;
    return null;
  };

  const endGoal = async (goalId: Goal['id'], status: 'completed' | 'abandoned') => {
    if (!currentUser) return;
    setError(null); setOk(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('close_goal_with_blocks', {
        p_goal_id: goalId,          // bez konwersji — patrz nagłówek funkcji
        p_new_status: status,       // 'completed' albo 'abandoned'
      });

      if (rpcErr || !(data as any)?.ok) {
        const code = (rpcErr as any)?.code;

        // PLAN-D-A 08.2026 — ODMOWA Z POWODEM TO NIE AWARIA.
        // Funkcja zwraca `{ok:false, powod:'…'}`, gdy wąskie gardło już nie
        // jest aktywne (np. zawodnik zamknął je na drugim urządzeniu albo
        // dotknął przycisku dwa razy). To NIE jest błąd i nie ma sensu kazać
        // mu „spróbować ponownie" — druga próba da dokładnie to samo.
        // ⚠️ `powod` jest napisany dla programisty i mówi „cel"; na ekran idzie
        // zdanie w słowniku produktu, surowy tekst z bazy zostaje w logu.
        if (!rpcErr && (data as any)?.powod) {
          console.warn('[gardla] close_goal_with_blocks odmówiło z powodem:', (data as any).powod);
          await loadGoals();
          await loadActiveBlocks();
          setError('To wąskie gardło jest już zamknięte — odświeżyłem listę.');
          return;
        }

        if (code === '42883' || code === 'PGRST202') {
          // Brak migracji, nie awaria sieci. To jest jedyne miejsce, w którym
          // ta różnica jest widoczna — bez tego logu wygląda jak losowy błąd.
          console.error(
            '[gardla] Funkcja close_goal_with_blocks nie istnieje w bazie (kod ' + code + '). '
            + 'Migracja A1 z 10.08.2026 NIE weszła albo ma inny typ parametru p_goal_id. '
            + 'ŚWIADOMIE nie wracamy do zapisu po stronie appki — to odtworzyłoby defekt A1 '
            + '(zamknięte wąskie gardło, otwarty Blok, zajęty segment).'
          );
        } else {
          console.error('[gardla] close_goal_with_blocks zwróciło błąd:', rpcErr?.message ?? JSON.stringify(data));
        }
        // PLAN-D-T (T6) — odmowa dostępu ma własne zdanie, nie „spróbuj ponownie":
        // ponawianie nic nie da, dopóki dostęp nie wróci.
        setError(toJestBrakDostepu(rpcErr) ? ZAPIS_ODRZUCONY_BRAK_DOSTEPU : 'Nie udało się zamknąć. Spróbuj ponownie.');
        return;
      }

      await loadGoals();
      // BEZ TEJ LINII mapa Bloków zostaje nieaktualna do następnego wejścia
      // na ekran i przycisk planowania nadal się nie pokazuje — czyli objaw
      // A1 przeżywa własną naprawę.
      await loadActiveBlocks();

      // Zawodnik ma wiedzieć, że zamknął nie tylko wąskie gardło. Zdanie
      // powstaje TYLKO z liczb, które faktycznie przyszły — brak liczby nie
      // zamienia się w „0", bo „0 Bloków" i „nie wiadomo ile" to dwie różne
      // informacje, a pierwsza bywa nieprawdą.
      const bloki = liczbaZOdpowiedzi((data as any).bloki);
      const wydarzenia = liczbaZOdpowiedzi((data as any).anulowane_wydarzenia);
      const czesci: string[] = [];
      if (bloki && bloki > 0) czesci.push(bloki === 1 ? 'zamknięty 1 Blok' : `zamknięte Bloki: ${bloki}`);
      if (wydarzenia && wydarzenia > 0) czesci.push(`anulowane zaplanowane sesje: ${wydarzenia}`);
      setOk(czesci.length > 0
        ? `Zamknięte. Razem z nim: ${czesci.join(' · ')}.`
        : 'Zamknięte.');
    } catch (e: any) {
      console.error('[gardla] Wyjątek przy zamykaniu wąskiego gardła:', e?.message);
      // PLAN-D-T (T6) — jak wyżej.
      setError(toJestBrakDostepu(e) ? ZAPIS_ODRZUCONY_BRAK_DOSTEPU : 'Nie udało się zamknąć. Spróbuj ponownie.');
    }
  };

  const active = goals.filter((g) => g.status === 'active');
  const history = goals.filter((g) => g.status !== 'active');

  const renderGoalCard = (g: Goal) => {
    const label = SEG_LABELS[g.segment_id] ?? g.segment_id;
    const pillar = SEG_PILLAR[g.segment_id] ?? '';
    // SCROLL R13 — karta, która renderuje otwarty Blok tego SEGMENTU, melduje
    // swoją pozycję (cel auto-scrolla po deep-linku dawki).
    // PLAN-D-A 08.2026 — po segmencie, nie po filarze (patrz `activeBlocksBySegment`).
    const hostedBlock = g.status === 'active' ? activeBlocksBySegment.get(g.segment_id) : undefined;
    // WIEDZA B4 08.08.2026 — dług N1, patrz nagłówek pliku.
    const originContext = goalOriginContext(g);
    const meta: string[] = [];
    if (g.horizon_weeks) meta.push(`horyzont: ${g.horizon_weeks} tyg.`);
    meta.push('dodano: ' + formatDatePl(g.created_at));
    if (g.ended_at) meta.push('zakończono: ' + formatDatePl(g.ended_at));

    return (
      <View
        key={g.id}
        style={[styles.card, g.status === 'active' && styles.cardActive]}
        onLayout={hostedBlock ? (e) => registerBlockCardY(hostedBlock.id, e.nativeEvent.layout.y) : undefined}
      >
        {/* W1: krecha 12° na karcie AKTYWNEGO Celu (karta „to jest o Tobie");
            historia bez krechy — zakończony Cel nie jest bieżącą tożsamością */}
        {g.status === 'active' ? <View style={styles.cardStripe} /> : null}
        <View style={styles.cardTop}>
          <Text style={styles.cardSegment}>{label}</Text>
          {g.is_priority && g.status === 'active' && <Text style={styles.badgePriority}>Priorytet</Text>}
          {/* PLAN-D-A 08.2026 — „Porzucony" znika z produktu (decyzja Kuby). */}
          {g.status === 'completed' && <Text style={styles.badgeCompleted}>{GARDLO_BADGE_DONE}</Text>}
          {g.status === 'abandoned' && <Text style={styles.badgeAbandoned}>{GARDLO_BADGE_CLOSED}</Text>}
        </View>
        <Text style={styles.cardPillar}>{pillar}</Text>
        {/* WIEDZA B4 08.08.2026 — dług N1: kontekst „skąd się wziął ten Cel".
            `goalOriginContext` ZAWIERA W SOBIE `refinement_note` (wariant
            „Twoja notatka: …"), więc rysowanie obu naraz powtórzyłoby ten sam
            tekst dwa razy. Surowa notatka zostaje jako odwrót na wypadek
            nieznanego `origin` — wtedy funkcja zwraca `null`, a notatka i tak
            ma się pokazać. Nic z dotychczasowej treści karty nie znika. */}
        {originContext
          ? <Text style={styles.cardOrigin}>{originContext}</Text>
          : g.refinement_note ? <Text style={styles.cardNote}>{g.refinement_note}</Text> : null}
        <Text style={styles.cardMeta}>{meta.join(' · ')}</Text>
        {g.status === 'active' && (
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => togglePriority(g.id, !g.is_priority)}>
              <Text style={styles.actionBtnText}>{g.is_priority ? 'Zdejmij priorytet' : 'Ustaw priorytet'}</Text>
            </TouchableOpacity>
            {/* PLAN-D-A 08.2026 — rozdzielenie odpowiedzialności (sekcja 2
                decyzji o słowniku). „Porzuć" znika. Zostają dwa wyjścia
                z wąskiego gardła i OBA są drugorzędne wizualnie: główną drogą
                jest rediagnoza przy zamknięciu Bloku, nie ten przycisk.
                Karta CELU (kierunek na lata) nie ma i nie dostaje żadnego
                przycisku zamknięcia — Cel zmienia się tylko przez świadomą
                rewizję kierunku. */}
            <TouchableOpacity style={styles.actionBtn} onPress={() => endGoal(g.id, 'completed')}>
              <Text style={styles.actionBtnText}>{GARDLO_DONE_LABEL}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => endGoal(g.id, 'abandoned')}>
              <Text style={styles.actionBtnText}>{GARDLO_STOP_LABEL}</Text>
            </TouchableOpacity>
          </View>
        )}
        {g.status === 'active' && currentUser && (
          planningGoalId === g.id ? (
            <FocusBlockPlanner
              goal={g}
              segmentLabel={label}
              pillar={pillar}
              currentUserId={currentUser.id}
              onClose={() => setPlanningGoalId(null)}
              onCreated={() => {
                setPlanningGoalId(null);
                setOk('Blok zaplanowany — sesje zobaczysz w Kalendarzu.');
                loadActiveBlocks();
              }}
            />
          ) : hostedBlock ? (
            <FocusBlockActiveView
              focusBlock={hostedBlock}
              elementLabel={hostedBlock.elementLabel}
              currentUserId={currentUser.id}
              onBlockClosed={loadActiveBlocks}
            />
          ) : (
            <TouchableOpacity style={styles.focusBlockBtn} onPress={() => setPlanningGoalId(g.id)}>
              <Text style={styles.focusBlockBtnText}>Zaplanuj Blok</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    );
  };

  const renderValidationBlock = () => {
    if (validating) {
      return (
        <View style={styles.validationBox}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      );
    }
    if (validationError) {
      return <Text style={styles.validationErrorText}>{validationError}</Text>;
    }
    if (!validation) return null;
    if (validation.passes) {
      return (
        <View style={[styles.validationBox, styles.validationBoxOk]}>
          <Text style={styles.validationOkText}>✓ Wygląda dobrze.</Text>
        </View>
      );
    }
    return (
      <View style={[styles.validationBox, styles.validationBoxHint]}>
        <Text style={styles.validationHintText}>💡 {validation.hint ?? 'Spróbuj to doprecyzować.'}</Text>
      </View>
    );
  };

  const renderRefinementFlow = () => {
    // Element już wybrany z bazy — pokaż potwierdzenie + wynik walidacji.
    if (!freeTextMode && selectedElementId) {
      const el = elementy.find((e) => e.id === selectedElementId);
      return (
        <View>
          <View style={styles.selectedRow}>
            <Text style={styles.rowTextSelected}>{el?.name ?? note}</Text>
            <TouchableOpacity onPress={backToObszary}>
              <Text style={styles.linkText}>Zmień</Text>
            </TouchableOpacity>
          </View>
          {renderValidationBlock()}
        </View>
      );
    }

    // Obszar wybrany, czekamy na wybór Elementu.
    if (!freeTextMode && selectedObszarId) {
      return (
        <View>
          <TouchableOpacity onPress={backToObszary} style={{ marginBottom: 8 }}>
            <Text style={styles.linkText}>◂ Zmień obszar</Text>
          </TouchableOpacity>
          {elementyLoading && <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginVertical: 8 }} />}
          {!elementyLoading && elementy.map((el) => (
            <TouchableOpacity key={el.id} style={styles.listRow} onPress={() => selectElement(el)}>
              <Text style={styles.rowText}>{el.name}</Text>
              {el.evidence_strength && EVIDENCE_LABELS[el.evidence_strength] && (
                <Text style={styles.rowEvidence}>{EVIDENCE_LABELS[el.evidence_strength]}</Text>
              )}
            </TouchableOpacity>
          ))}
          {!elementyLoading && elementy.length === 0 && (
            <Text style={styles.empty}>Brak elementów dla tego obszaru.</Text>
          )}
          <TouchableOpacity onPress={switchToFreeText} style={{ marginTop: 4 }}>
            <Text style={styles.linkText}>Opisz sam zamiast wybierać z listy</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Wolny opis — domyślny fallback (np. techSpec bez Obszarów w bazie)
    // albo świadomy wybór zawodnika w dowolnym momencie.
    if (freeTextMode) {
      return (
        <View>
          {obszary.length === 0 && !obszaryLoading && (
            <Text style={styles.hintText}>
              Ten segment nie ma jeszcze gotowej listy obszarów — opisz swój cel własnymi słowami.
            </Text>
          )}
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholderTextColor={colors.textSecondary}
            value={note}
            onChangeText={(v) => { setNote(v); setValidation(null); setValidationError(null); }}
            multiline
            placeholder="np. poprawić skanowanie przed przyjęciem piłki"
          />
          <View style={styles.rowBetween}>
            {obszary.length > 0 && (
              <TouchableOpacity onPress={switchToList}>
                <Text style={styles.linkText}>◂ Wybierz z listy zamiast</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              disabled={!note.trim() || validating}
              onPress={() => runValidation(segmentId, note)}
            >
              <Text style={[styles.linkText, (!note.trim() || validating) && { opacity: 0.4 }]}>Sprawdź</Text>
            </TouchableOpacity>
          </View>
          {renderValidationBlock()}
        </View>
      );
    }

    // Domyślny widok — lista Obszarów segmentu.
    return (
      <View>
        {obszaryLoading && <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginVertical: 8 }} />}
        {!obszaryLoading && obszary.map((ob) => (
          <TouchableOpacity key={ob.id} style={styles.listRow} onPress={() => selectObszar(ob.id)}>
            <Text style={styles.rowText}>{ob.name}</Text>
          </TouchableOpacity>
        ))}
        {!obszaryLoading && (
          <TouchableOpacity onPress={switchToFreeText} style={{ marginTop: 4 }}>
            <Text style={styles.linkText}>Opisz sam zamiast wybierać z listy</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <Text style={styles.title}>{GARDLA_SCREEN_TITLE}</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {ok && <Text style={styles.ok}>{ok}</Text>}

      {directionContext && (
        <View style={styles.directionBlock}>
          {/* PLAN-D-A 08.2026 — to jest CEL w nowym słowniku: kierunek na lata,
              jeden, bez przycisku zamknięcia. Jedyne miejsce w tym ekranie,
              w którym pada słowo „Cel". */}
          <Text style={styles.blockLabel}>Twój Cel</Text>
          <Text style={styles.directionText}>
            {directionContext.label}{directionContext.note ? ` — „${directionContext.note}”` : ''}
          </Text>
          <Text style={styles.directionHint}>
            Wybierz niżej obszar, który najbardziej Cię dziś ogranicza — to będzie Twoje wąskie gardło.
          </Text>
        </View>
      )}

      <View style={styles.block}>
        <Text style={styles.label}>Segment</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={segmentId} onValueChange={onSegmentChange}>
            {SEGMENTS_BY_PILLAR.flatMap(([, segs]) => segs).map(([id, label]) => (
              <Picker.Item key={id} label={label} value={id} />
            ))}
          </Picker>
        </View>
        <Text style={styles.label}>Doprecyzowanie (opcjonalnie)</Text>
        {renderRefinementFlow()}
        <Text style={[styles.label, { marginTop: 12 }]}>Horyzont (tygodnie, opcjonalnie)</Text>
        <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} keyboardType="number-pad" value={horizon} onChangeText={setHorizon} placeholder="np. 8" />
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setIsPriority((v) => !v)}>
          <Checkbox value={isPriority} onValueChange={setIsPriority} />
          <Text style={styles.checkboxLabel}>To jest teraz najważniejsze</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} disabled={saving} onPress={createGoal}>
          <Text style={styles.btnText}>{saving ? 'Zapisuję...' : 'Dodaj wąskie gardło'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 24 }} onLayout={(e) => setActiveSectionY(e.nativeEvent.layout.y)}>
        <Text style={styles.sectionLabel}>Nad czym pracujesz</Text>
        {active.length === 0 && <Text style={styles.empty}>Nie masz teraz żadnego wąskiego gardła — dodaj pierwsze powyżej.</Text>}
        {active.map(renderGoalCard)}
      </View>

      <TouchableOpacity style={{ marginTop: 24 }} onPress={() => setShowHistory((v) => !v)}>
        <Text style={styles.sectionLabel}>
          {showHistory ? '▾' : '▸'} Historia (ukończone / zamknięte)
        </Text>
      </TouchableOpacity>
      {showHistory && (
        <View style={{ marginTop: 4 }}>
          {history.length === 0 && <Text style={styles.empty}>Nic tu jeszcze nie ma.</Text>}
          {history.map(renderGoalCard)}
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 28, marginBottom: spacing.lg, color: colors.textPrimary },
  // W1: nadtytuły na ink3 (koncepcja: ink3 = podpisy, nadtytuły)
  label: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6, marginTop: 4 },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 12 },
  blockLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 10, fontSize: 14, marginBottom: 8, color: colors.textPrimary },
  textarea: { minHeight: 60, textAlignVertical: 'top' },
  pickerWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, marginBottom: 8 },
  block: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 16, marginBottom: 16 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  checkboxLabel: { ...typography.body, fontSize: 14, color: colors.textPrimary, flexShrink: 1 },
  btn: { minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  error: { color: colors.error, fontSize: 13, marginBottom: 12 },
  ok: { color: colors.success, fontSize: 13, marginBottom: 12 },
  empty: { textAlign: 'center', padding: 24, color: colors.textSecondary, fontSize: 14 },
  directionBlock: { borderLeftWidth: 3, borderLeftColor: colors.brand, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 16, marginBottom: 16 }, // W1: świadomie prosta krecha — kontekst, nie hero
  directionText: { ...typography.body, fontSize: 14, color: colors.textPrimary },
  directionHint: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 14, marginBottom: 10 },
  // W1: wariant aktywnego Celu — miejsce na krechę 12°, wysokość bez zmian
  cardActive: { paddingLeft: 22 },
  cardStripe: { ...skew.stripe, left: 8, top: 14, height: 32, backgroundColor: colors.brand },
  cardTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 2 },
  cardSegment: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  cardPillar: { fontSize: 11, color: colors.textSecondary, marginBottom: 8 },
  cardNote: { ...typography.body, fontSize: 13, color: colors.textPrimary, marginBottom: 8 },
  // WIEDZA B4 08.08.2026 — dług N1. Ten sam rozmiar i margines co `cardNote`,
  // którą zastępuje w typowym przypadku — karta nie zmienia wysokości. Kolor
  // drugorzędny, bo to kontekst, a nie treść Celu.
  cardOrigin: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginBottom: 8 },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  // W1: tła odznak z tokenów (koniec rgba na sztywno)
  badgePriority: { fontSize: 11, backgroundColor: colors.warnSoft, color: colors.warning, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  badgeCompleted: { fontSize: 11, backgroundColor: colors.okSoft, color: colors.success, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  badgeAbandoned: { fontSize: 11, backgroundColor: colors.surfaceElevated, color: colors.textSecondary, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm },
  actionBtnText: { fontSize: 12, color: colors.textPrimary },
  // --- Tor 7 Krok 4: Baza Składowych Segmentów (Obszar/Element listy + walidacja) ---
  listRow: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 },
  rowText: { ...typography.body, fontSize: 14, color: colors.textPrimary },
  rowEvidence: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  selectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.brand, borderRadius: radii.md, backgroundColor: colors.brandSoft, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 4 }, // W1: token
  rowTextSelected: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary, flexShrink: 1, marginRight: 8 },
  linkText: { color: colors.brand, fontSize: 13, ...typography.bodyMedium },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  hintText: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  validationBox: { marginTop: 8, padding: 10, borderRadius: radii.md, alignItems: 'flex-start' },
  validationBoxOk: { backgroundColor: colors.okSoft }, // W1: token
  validationBoxHint: { backgroundColor: colors.warnSoft }, // W1: token
  validationOkText: { fontSize: 13, color: colors.success },
  validationHintText: { fontSize: 13, color: colors.warning },
  validationErrorText: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  // --- Tor 7 Krok 5a: Blok Skupienia (przycisk + komunikat blokady na karcie celu) ---
  focusBlockBtn: { minHeight: minTouchHeight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.brand, borderRadius: radii.md, marginTop: 10 },
  focusBlockBtnText: { ...typography.bodySemiBold, fontSize: 13, color: colors.brand, letterSpacing: 0.3 },
});
