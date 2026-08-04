// Ekran CELE — Krok 7 checklisty. Implementacja wg docs/KONTRAKT_CELE.md.
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
// Egzekwowanie limitu "jeden aktywny Blok na filar" w UI: `activeBlockPillars`
// niżej, ładowane razem z celami — prawdziwe wymuszenie to unique index w
// bazie (`one_active_focus_block_per_pillar`), to tylko czytelny komunikat
// zamiast surowego błędu bazy na końcu przepływu.
import { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { toLocalDateStr, formatDatePl } from '../../lib/date-utils';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';
import FocusBlockPlanner from '../../components/FocusBlockPlanner';
import FocusBlockActiveView from '../../components/FocusBlockActiveView';

const SEGMENTS_BY_PILLAR: [string, [string, string][]][] = [
  ['Filar 1 — Dominacja fizyczna', [['moc', 'Moc'], ['wytrzymalosc', 'Wytrzymałość'], ['fizycznosc', 'Fizyczność']]],
  ['Filar 2 — Efektywność techniczna', [['techFund', 'Technika Fundamentalna'], ['techSpec', 'Technika Specjalistyczna']]],
  ['Filar 3 — Trwałość organizmu', [['tolerancja', 'Tolerancja (Obciążeń)'], ['regeneracja', 'Regeneracja'], ['odpornosc', 'Odporność'], ['odzywianie', 'Odżywienie']]],
  ['Filar 4 — Mentalność', [['koncentracja', 'Koncentracja'], ['mental', 'Stan Mentalny']]],
  ['Filar 5 — Boiskowa mądrość', [['percepcja', 'Percepcja'], ['decyzja', 'Szybkość Decyzji']]],
];
const SEG_LABELS: Record<string, string> = Object.fromEntries(SEGMENTS_BY_PILLAR.flatMap(([, segs]) => segs));
const SEG_PILLAR: Record<string, string> = Object.fromEntries(
  SEGMENTS_BY_PILLAR.flatMap(([pillar, segs]) => segs.map(([id]) => [id, pillar]))
);
const GOAL_DIRECTION_LABELS: Record<string, string> = {
  more_minutes: 'Więcej minut w meczach',
  move_up: 'Awans na wyższy poziom',
  improve_element: 'Poprawa konkretnego elementu gry',
  avoid_relegation_from_team: 'Utrzymanie miejsca w składzie',
  other: 'Inne',
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

type Goal = {
  id: number; segment_id: string; status: string; is_priority: boolean;
  refinement_note: string | null; horizon_weeks: number | null;
  created_at: string; ended_at: string | null;
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

  // --- Tor 7 Krok 5a: Blok Skupienia — który cel jest właśnie planowany +
  // filary z już aktywnym Blokiem (egzekwowanie limitu w UI, patrz nagłówek pliku) ---
  const [planningGoalId, setPlanningGoalId] = useState<number | null>(null);
  const [activeBlockPillars, setActiveBlockPillars] = useState<Set<string>>(new Set());
  const [activeBlocksByPillar, setActiveBlocksByPillar] = useState<Map<string, ActiveFocusBlock>>(new Map());

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
      setValidationError('Nie udało się sprawdzić opisu teraz — możesz mimo to zapisać cel.');
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

  // Tor 7 Krok 5a — filary, w których zawodnik ma już aktywny Blok Skupienia
  // (patrz nagłówek pliku). Ładowane obok celów, tym samym rytmem odświeżania.
  const loadActiveBlockPillars = useCallback(async () => {
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
    if (err) return; // cichy fallback — w najgorszym razie UI nie pokaże blokady wcześnie, baza i tak wymusi limit
    const rows = (data ?? []) as any[];
    setActiveBlockPillars(new Set(rows.map((r) => r.pillar)));
    const byPillar = new Map<string, ActiveFocusBlock>();
    rows.forEach((r) => {
      byPillar.set(r.pillar, {
        id: r.id, user_id: r.user_id, segment_id: r.segment_id, component_id: r.component_id,
        custom_description: r.custom_description, pillar: r.pillar, status: r.status, stage: r.stage,
        sessions_per_week: r.sessions_per_week, target_weeks: r.target_weeks,
        started_at: r.started_at, closed_at: r.closed_at,
        elementLabel: r.custom_description ?? r.segment_components?.name ?? (SEG_LABELS[r.segment_id] ?? r.segment_id),
      });
    });
    setActiveBlocksByPillar(byPillar);
  }, [currentUser]);

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadGoals(); loadActiveBlockPillars(); }, [loadGoals, loadActiveBlockPillars]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadGoals(), loadActiveBlockPillars()]);
    setRefreshing(false);
  }, [loadGoals, loadActiveBlockPillars]);

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
      if (horizon !== '') {
        body.horizon_weeks = Number(horizon);
        body.horizon_started_at = toLocalDateStr(new Date());
      }
      if (isPriority) body.priority_changed_at = new Date().toISOString();

      const { error: insErr } = await supabase.from('goals').insert(body);
      if (insErr) {
        if ((insErr as any).code === '23505' || insErr.message?.includes('idx_goals_one_active_per_segment')) {
          throw new Error('Masz już aktywny cel w tym segmencie — najpierw go zakończ (ukończony/porzucony), zanim dodasz nowy.');
        }
        throw insErr;
      }

      setOk('Cel dodany.');
      resetRefinementFlow();
      loadObszary(segmentId);
      setHorizon(''); setIsPriority(false);
      await loadGoals();
    } catch (e: any) {
      let message = 'Nie udało się dodać celu: ' + e.message;
      if (prevPriority) {
        try {
          await patchGoal(prevPriority.id, { is_priority: true, priority_changed_at: new Date().toISOString() });
        } catch {
          message += ' Dodatkowo nie udało się przywrócić poprzedniego priorytetu — sprawdź zakładkę Cele.';
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
      let message = 'Nie udało się zmienić priorytetu: ' + e.message;
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

  const endGoal = async (goalId: number, status: 'completed' | 'abandoned') => {
    setError(null);
    try {
      const goal = goals.find((g) => g.id === goalId);
      const fields: Record<string, any> = { status, ended_at: new Date().toISOString() };
      if (goal?.is_priority) fields.is_priority = false;
      await patchGoal(goalId, fields);
      await loadGoals();
    } catch (e: any) {
      setError('Nie udało się zaktualizować celu: ' + e.message);
    }
  };

  const active = goals.filter((g) => g.status === 'active');
  const history = goals.filter((g) => g.status !== 'active');

  const renderGoalCard = (g: Goal) => {
    const label = SEG_LABELS[g.segment_id] ?? g.segment_id;
    const pillar = SEG_PILLAR[g.segment_id] ?? '';
    const meta: string[] = [];
    if (g.horizon_weeks) meta.push(`horyzont: ${g.horizon_weeks} tyg.`);
    meta.push('dodano: ' + formatDatePl(g.created_at));
    if (g.ended_at) meta.push('zakończono: ' + formatDatePl(g.ended_at));

    return (
      <View key={g.id} style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cardSegment}>{label}</Text>
          {g.is_priority && g.status === 'active' && <Text style={styles.badgePriority}>Priorytet</Text>}
          {g.status === 'completed' && <Text style={styles.badgeCompleted}>Ukończony</Text>}
          {g.status === 'abandoned' && <Text style={styles.badgeAbandoned}>Porzucony</Text>}
        </View>
        <Text style={styles.cardPillar}>{pillar}</Text>
        {g.refinement_note ? <Text style={styles.cardNote}>{g.refinement_note}</Text> : null}
        <Text style={styles.cardMeta}>{meta.join(' · ')}</Text>
        {g.status === 'active' && (
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => togglePriority(g.id, !g.is_priority)}>
              <Text style={styles.actionBtnText}>{g.is_priority ? 'Zdejmij priorytet' : 'Ustaw priorytet'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => endGoal(g.id, 'completed')}>
              <Text style={styles.actionBtnText}>Ukończony</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => endGoal(g.id, 'abandoned')}>
              <Text style={styles.actionBtnText}>Porzuć</Text>
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
                setOk('Blok Skupienia zaplanowany — sesje zobaczysz w Kalendarzu.');
                loadActiveBlockPillars();
              }}
            />
          ) : activeBlocksByPillar.has(pillar) ? (
            <FocusBlockActiveView
              focusBlock={activeBlocksByPillar.get(pillar)!}
              elementLabel={activeBlocksByPillar.get(pillar)!.elementLabel}
              currentUserId={currentUser.id}
              onBlockClosed={loadActiveBlockPillars}
            />
          ) : (
            <TouchableOpacity style={styles.focusBlockBtn} onPress={() => setPlanningGoalId(g.id)}>
              <Text style={styles.focusBlockBtnText}>Zaplanuj pracę nad tym celem</Text>
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
        <Text style={styles.validationHintText}>💡 {validation.hint ?? 'Spróbuj doprecyzować ten cel.'}</Text>
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
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <Text style={styles.title}>Cele</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {ok && <Text style={styles.ok}>{ok}</Text>}

      {directionContext && (
        <View style={styles.directionBlock}>
          <Text style={styles.blockLabel}>Twój ogólny cel z Profilu</Text>
          <Text style={styles.directionText}>
            {directionContext.label}{directionContext.note ? ` — „${directionContext.note}”` : ''}
          </Text>
          <Text style={styles.directionHint}>
            Wybierz poniżej konkretny segment, którego to dotyczy — to on będzie śledzony jako Twój cel.
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
        <Text style={styles.label}>Doprecyzowanie celu (opcjonalnie)</Text>
        {renderRefinementFlow()}
        <Text style={[styles.label, { marginTop: 12 }]}>Horyzont (tygodnie, opcjonalnie)</Text>
        <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} keyboardType="number-pad" value={horizon} onChangeText={setHorizon} placeholder="np. 8" />
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setIsPriority((v) => !v)}>
          <Checkbox value={isPriority} onValueChange={setIsPriority} />
          <Text style={styles.checkboxLabel}>Ustaw jako cel priorytetowy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} disabled={saving} onPress={createGoal}>
          <Text style={styles.btnText}>{saving ? 'Zapisuję...' : 'Dodaj cel'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 24 }}>
        <Text style={styles.sectionLabel}>Aktywne cele</Text>
        {active.length === 0 && <Text style={styles.empty}>Brak aktywnych celów — dodaj pierwszy powyżej.</Text>}
        {active.map(renderGoalCard)}
      </View>

      <TouchableOpacity style={{ marginTop: 24 }} onPress={() => setShowHistory((v) => !v)}>
        <Text style={styles.sectionLabel}>
          {showHistory ? '▾' : '▸'} Historia celów (ukończone / porzucone)
        </Text>
      </TouchableOpacity>
      {showHistory && (
        <View style={{ marginTop: 4 }}>
          {history.length === 0 && <Text style={styles.empty}>Brak zakończonych celów.</Text>}
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
  label: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 6, marginTop: 4 },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 12 },
  blockLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 8 },
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
  directionBlock: { borderLeftWidth: 3, borderLeftColor: colors.brand, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 16, marginBottom: 16 },
  directionText: { ...typography.body, fontSize: 14, color: colors.textPrimary },
  directionHint: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 2 },
  cardSegment: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  cardPillar: { fontSize: 11, color: colors.textSecondary, marginBottom: 8 },
  cardNote: { ...typography.body, fontSize: 13, color: colors.textPrimary, marginBottom: 8 },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  badgePriority: { fontSize: 11, backgroundColor: 'rgba(240,149,75,0.15)', color: colors.warning, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  badgeCompleted: { fontSize: 11, backgroundColor: 'rgba(76,175,107,0.15)', color: colors.success, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  badgeAbandoned: { fontSize: 11, backgroundColor: colors.surfaceElevated, color: colors.textSecondary, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm },
  actionBtnText: { fontSize: 12, color: colors.textPrimary },
  // --- Tor 7 Krok 4: Baza Składowych Segmentów (Obszar/Element listy + walidacja) ---
  listRow: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 },
  rowText: { ...typography.body, fontSize: 14, color: colors.textPrimary },
  rowEvidence: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  selectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.brand, borderRadius: radii.md, backgroundColor: 'rgba(232,67,45,0.08)', paddingVertical: 10, paddingHorizontal: 12, marginBottom: 4 },
  rowTextSelected: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary, flexShrink: 1, marginRight: 8 },
  linkText: { color: colors.brand, fontSize: 13, ...typography.bodyMedium },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  hintText: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  validationBox: { marginTop: 8, padding: 10, borderRadius: radii.md, alignItems: 'flex-start' },
  validationBoxOk: { backgroundColor: 'rgba(76,175,107,0.12)' },
  validationBoxHint: { backgroundColor: 'rgba(240,149,75,0.12)' },
  validationOkText: { fontSize: 13, color: colors.success },
  validationHintText: { fontSize: 13, color: colors.warning },
  validationErrorText: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  // --- Tor 7 Krok 5a: Blok Skupienia (przycisk + komunikat blokady na karcie celu) ---
  focusBlockBtn: { minHeight: minTouchHeight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.brand, borderRadius: radii.md, marginTop: 10 },
  focusBlockBtnText: { ...typography.bodySemiBold, fontSize: 13, color: colors.brand, letterSpacing: 0.3 },
  blockedText: { fontSize: 12, color: colors.textSecondary, marginTop: 10, fontStyle: 'italic' },
});
