// Ekran MECZ — Krok 9 checklisty. Implementacja wg docs/KONTRAKT_MECZ.md
// (spisanego z panel-mecz w asystent_app.html).
//
// AUDYT 27.07.2026: `useEffect` -> `useFocusEffect` + `RefreshControl` — patrz
// uzasadnienie w app/(tabs)/dziennik.tsx (tu dodatkowo ważne: status trybu
// kontuzji zmienia się w Profilu, a ten ekran musi go pokazać aktualnym po
// powrocie z tamtej zakładki, nie tylko przy pierwszym wejściu).
import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import ScalePicker from '../../components/ScalePicker';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';

const GAME_TYPE_LABELS: Record<string, string> = {
  official_match: 'Mecz oficjalny', friendly: 'Sparing',
  training_game: 'Gierka treningowa', tournament: 'Turniej',
};
const SEGMENT_AVAILABILITY_LABELS: Record<string, string> = {
  available: 'dostępne', partial: 'częściowo dostępne', unavailable: 'niedostępne',
};
const SEG_LABELS: Record<string, string> = Object.fromEntries([
  ['moc', 'Moc'], ['wytrzymalosc', 'Wytrzymałość'], ['fizycznosc', 'Fizyczność'],
  ['techFund', 'Technika Fundamentalna'], ['techSpec', 'Technika Specjalistyczna'],
  ['tolerancja', 'Tolerancja (Obciążeń)'], ['regeneracja', 'Regeneracja'], ['odpornosc', 'Odporność'], ['odzywianie', 'Odżywienie'],
  ['koncentracja', 'Koncentracja'], ['mental', 'Stan Mentalny'],
  ['percepcja', 'Percepcja'], ['decyzja', 'Szybkość Decyzji'],
]);

// Treść potwierdzona przez Kubę wcześniej w projekcie (architektura_
// techniczna.md, Domena 04) — przeniesiona 1:1 z asystent_app.html.
const INJURY_MODE_ROUTING: Record<string, { label: string; segments: Record<string, string> }> = {
  lower_body: {
    label: 'Dół ciała (noga, kolano, kostka)',
    segments: {
      moc: 'unavailable', wytrzymalosc: 'unavailable', fizycznosc: 'unavailable',
      techFund: 'partial', techSpec: 'partial',
      regeneracja: 'available', odpornosc: 'available', odzywianie: 'available', tolerancja: 'available',
      koncentracja: 'available', mental: 'available',
      percepcja: 'available', decyzja: 'available',
    },
  },
  upper_body: {
    label: 'Góra ciała (ręka, bark)',
    segments: {
      moc: 'available', wytrzymalosc: 'available', fizycznosc: 'available',
      techFund: 'available', techSpec: 'available',
      regeneracja: 'available', odpornosc: 'available', odzywianie: 'available', tolerancja: 'available',
      koncentracja: 'available', mental: 'available',
      percepcja: 'available', decyzja: 'available',
    },
  },
  general: {
    label: 'Ogólne (przeciążenie, choroba)',
    segments: {
      moc: 'unavailable', wytrzymalosc: 'unavailable', fizycznosc: 'unavailable',
      techFund: 'unavailable', techSpec: 'unavailable',
      regeneracja: 'available', odpornosc: 'available', odzywianie: 'available', tolerancja: 'partial',
      koncentracja: 'available', mental: 'available',
      percepcja: 'available', decyzja: 'available',
    },
  },
};

type MatchRow = {
  id: number; created_at: string; game_type: string;
  own_score: number | null; opponent_score: number | null;
  role: string | null; minutes_played: number | null; match_rpe: number | null;
};

export default function MeczScreen() {
  const { currentUser } = useAuth();

  const [gameType, setGameType] = useState('official_match');
  const [ownScore, setOwnScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [role, setRole] = useState('');
  const [minutes, setMinutes] = useState('');
  const [matchRpe, setMatchRpe] = useState<number>();

  const [routing, setRouting] = useState<{ label: string; segments: Record<string, string> } | null>(null);
  const [history, setHistory] = useState<MatchRow[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadMecz = useCallback(async () => {
    if (!currentUser) return;

    try {
      const { data, error: err } = await supabase
        .from('player_profiles')
        .select('injury_mode_active,injury_mode_category')
        .eq('user_id', currentUser.id)
        .limit(1);
      if (err) throw err;
      const profile = data?.[0];
      if (profile?.injury_mode_active && INJURY_MODE_ROUTING[profile.injury_mode_category]) {
        setRouting(INJURY_MODE_ROUTING[profile.injury_mode_category]);
      } else {
        setRouting(null);
      }
    } catch (e) {
      // Status trybu kontuzji to dodatkowa informacja — jego brak nie
      // powinien blokować reszty ekranu.
      setRouting(null);
    }

    const { data: rows, error: histErr } = await supabase
      .from('match_contexts')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (histErr) return; // load* nie pokazuje banera błędu — konwencja z web
    setHistory((rows ?? []) as MatchRow[]);
  }, [currentUser]);

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadMecz(); }, [loadMecz]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMecz();
    setRefreshing(false);
  }, [loadMecz]);

  const resetForm = () => {
    setOwnScore(''); setOpponentScore(''); setRole(''); setMinutes(''); setMatchRpe(undefined);
  };

  async function submitMatchContext() {
    if (!currentUser) return;
    setError(null); setOk(null);
    setSaving(true);
    try {
      // Brak walidacji — zgodnie ze źródłem web wszystkie pola są opcjonalne.
      const body = {
        user_id: currentUser.id,
        game_type: gameType,
        own_score: ownScore !== '' ? Number(ownScore) : null,
        opponent_score: opponentScore !== '' ? Number(opponentScore) : null,
        role: role.trim() || null,
        minutes_played: minutes !== '' ? Number(minutes) : null,
        match_rpe: matchRpe !== undefined ? matchRpe : null,
      };
      const { error: insErr } = await supabase.from('match_contexts').insert(body);
      if (insErr) throw insErr;

      setOk('Mecz zapisany.');
      resetForm();
      await loadMecz();
    } catch (e: any) {
      setError('Nie udało się zapisać meczu: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function renderRoutingBlock() {
    if (!routing) return null;
    const grouped: Record<string, string[]> = { unavailable: [], partial: [], available: [] };
    Object.entries(routing.segments).forEach(([segId, status]) => grouped[status].push(SEG_LABELS[segId] || segId));

    return (
      <View style={[styles.block, styles.injuryBlock]}>
        <Text style={styles.sectionLabel}>Tryb kontuzji — co jest teraz dostępne</Text>
        <Text style={styles.injuryCategory}>{routing.label}</Text>
        {(['unavailable', 'partial', 'available'] as const).map((status) =>
          grouped[status].length ? (
            <Text key={status} style={styles.injuryRow}>
              <Text style={styles.injuryStatusLabel}>{SEGMENT_AVAILABILITY_LABELS[status].toUpperCase()}: </Text>
              {grouped[status].join(', ')}
            </Text>
          ) : null
        )}
        <Text style={styles.injuryHint}>Zmień lub wyłącz tryb kontuzji w Profilu.</Text>
      </View>
    );
  }

  function renderMatchCard(row: MatchRow) {
    const dateLabel = new Date(row.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
    const typeLabel = GAME_TYPE_LABELS[row.game_type] || row.game_type;
    const parts: string[] = [];
    if (row.own_score !== null && row.own_score !== undefined && row.opponent_score !== null && row.opponent_score !== undefined) {
      parts.push(`wynik: ${row.own_score}:${row.opponent_score}`);
    }
    if (row.minutes_played !== null && row.minutes_played !== undefined) parts.push(`${row.minutes_played} min`);
    if (row.match_rpe !== null && row.match_rpe !== undefined) parts.push(`RPE: ${row.match_rpe}/10`);
    if (row.role) parts.push(row.role);
    const detail = parts.join(' · ') || '—';

    return (
      <View key={row.id} style={styles.historyCard}>
        <View style={styles.historyTop}>
          <Text style={styles.historyType}>{typeLabel}</Text>
          <Text style={styles.historyDate}>{dateLabel}</Text>
        </View>
        <Text style={styles.historyDetail}>{detail}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <Text style={styles.title}>Mecz</Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {ok && <Text style={styles.ok}>{ok}</Text>}

      {renderRoutingBlock()}

      <View style={styles.block}>
        <Text style={styles.sectionLabel}>Zapisz mecz</Text>

        <Text style={styles.label}>Rodzaj</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={gameType} onValueChange={setGameType}>
            {Object.entries(GAME_TYPE_LABELS).map(([id, label]) => <Picker.Item key={id} label={label} value={id} />)}
          </Picker>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Twój zespół — gole</Text>
            <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} keyboardType="number-pad" value={ownScore} onChangeText={setOwnScore} placeholder="np. 2" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Przeciwnik — gole</Text>
            <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} keyboardType="number-pad" value={opponentScore} onChangeText={setOpponentScore} placeholder="np. 1" />
          </View>
        </View>

        <Text style={styles.label}>Twoja rola (opcjonalnie)</Text>
        <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} value={role} onChangeText={setRole} placeholder="np. w podstawowym składzie" />

        <Text style={styles.label}>Minuty na boisku</Text>
        <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} keyboardType="number-pad" value={minutes} onChangeText={setMinutes} placeholder="np. 90" />

        <Text style={styles.label}>RPE meczowe (0 = brak wysiłku, 10 = maksymalny)</Text>
        <ScalePicker value={matchRpe} onChange={setMatchRpe} />

        <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} disabled={saving} onPress={submitMatchContext}>
          <Text style={styles.btnText}>{saving ? 'Zapisuję...' : 'Zapisz mecz'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 40 }}>
        <Text style={styles.sectionLabel}>Historia meczów</Text>
        {history.length === 0 && <Text style={styles.empty}>Brak zapisanych meczów — dodaj pierwszy powyżej.</Text>}
        {history.map(renderMatchCard)}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 28, marginBottom: spacing.lg, color: colors.textPrimary },
  label: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 6, marginTop: 4 },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 14 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 10, fontSize: 14, marginBottom: 8, color: colors.textPrimary },
  pickerWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, marginBottom: 8 },
  block: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 16, marginBottom: 20 },
  injuryBlock: { borderLeftWidth: 3, borderLeftColor: colors.brand, marginBottom: 28 },
  injuryCategory: { fontSize: 14, color: colors.textPrimary, marginBottom: 14 },
  injuryRow: { fontSize: 13, color: colors.textPrimary, marginBottom: 8 },
  injuryStatusLabel: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.textSecondary },
  injuryHint: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  btn: { minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.4 },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  error: { color: colors.error, fontSize: 13, marginBottom: 12 },
  ok: { color: colors.success, fontSize: 13, marginBottom: 12 },
  empty: { textAlign: 'center', padding: 24, color: colors.textSecondary, fontSize: 14 },
  historyCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 14, marginBottom: 10 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  historyType: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary },
  historyDate: { fontSize: 12, color: colors.textSecondary },
  historyDetail: { ...typography.body, fontSize: 13, color: colors.textSecondary },
});
