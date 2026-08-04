// Ekran CELE — Krok 7 checklisty. Implementacja wg docs/KONTRAKT_CELE.md.
//
// AUDYT 27.07.2026: `useEffect` -> `useFocusEffect` + `RefreshControl` — patrz
// uzasadnienie w app/(tabs)/dziennik.tsx.
import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { toLocalDateStr, formatDatePl } from '../../lib/date-utils';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';

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

type Goal = {
  id: number; segment_id: string; status: string; is_priority: boolean;
  refinement_note: string | null; horizon_weeks: number | null;
  created_at: string; ended_at: string | null;
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

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadGoals(); }, [loadGoals]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGoals();
    setRefreshing(false);
  }, [loadGoals]);

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
      setNote(''); setHorizon(''); setIsPriority(false);
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
          <Picker selectedValue={segmentId} onValueChange={setSegmentId}>
            {SEGMENTS_BY_PILLAR.flatMap(([, segs]) => segs).map(([id, label]) => (
              <Picker.Item key={id} label={label} value={id} />
            ))}
          </Picker>
        </View>
        <Text style={styles.label}>Doprecyzowanie celu (opcjonalnie)</Text>
        <TextInput style={[styles.input, styles.textarea]} placeholderTextColor={colors.textSecondary} value={note} onChangeText={setNote} multiline placeholder="np. poprawić skanowanie przed przyjęciem piłki" />
        <Text style={styles.label}>Horyzont (tygodnie, opcjonalnie)</Text>
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
});
