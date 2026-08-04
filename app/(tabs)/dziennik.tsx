// Ekran DZIENNIK — Krok 6 checklisty. Implementacja wg
// docs/KONTRAKT_DZIENNIK.md (spisanego z panel-dziennik w asystent_app.html).
//
// AUDYT 27.07.2026: `useEffect` -> `useFocusEffect` (ekran nie odmontowuje
// się przy przełączaniu zakładek, więc bez tego historia wpisów nie
// odświeżyłaby się po powrocie z innej zakładki) + `RefreshControl`
// (standardowy natywny gest "pociągnij żeby odświeżyć" — czego web w ogóle
// nie ma, ale użytkownik appki mobilnej będzie go instynktownie próbował).
import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import ScalePicker from '../../components/ScalePicker';
import { toLocalDateStr } from '../../lib/date-utils';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';

const BODY_LOCATIONS: [string, string][] = [
  ['kostka', 'Kostka'], ['kolano', 'Kolano'], ['udo_przednie', 'Udo przednie'],
  ['udo_tylne', 'Udo tylne'], ['lydka', 'Łydka'], ['pachwina', 'Pachwina'],
  ['biodro', 'Biodro'], ['stopa', 'Stopa'], ['achilles', 'Ścięgno Achillesa'],
  ['plecy_kregoslup', 'Plecy / kręgosłup'], ['brzuch_tulow', 'Brzuch / tułów'],
  ['bark', 'Bark'], ['lokiec', 'Łokieć'], ['nadgarstek_dlon', 'Nadgarstek / dłoń'],
  ['glowa_twarz', 'Głowa / twarz'], ['klatka_piersiowa_zebra', 'Klatka piersiowa / żebra'],
  ['inne', 'Inne'],
];
const BODY_LOCATION_LABELS = Object.fromEntries(BODY_LOCATIONS);
const NON_LATERAL_LOCATIONS = new Set(['plecy_kregoslup', 'brzuch_tulow', 'inne']);
const SESSION_TYPE_LABELS: Record<string, string> = {
  club_training: 'Trening klubowy', own_training: 'Trening własny',
  micro_session: 'Mikro-sesja', match: 'Mecz', other: 'Inne',
};

type CalendarLinkOption = { id: number; label: string };
type HistoryRow = {
  id: number; created_at: string; entry_type: 'morning' | 'post_training';
  session_type: string | null; payload: any; pain_entries: any[];
};

export default function DziennikScreen() {
  const { currentUser } = useAuth();
  const [entryType, setEntryType] = useState<'morning' | 'post_training'>('morning');

  // Morning
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState<number>();
  const [morningFatigue, setMorningFatigue] = useState<number>();
  const [moodMotivation, setMoodMotivation] = useState<number>();
  const [freeNote, setFreeNote] = useState('');

  // Post-training
  const [sessionType, setSessionType] = useState('club_training');
  const [duration, setDuration] = useState('');
  const [calendarLinkId, setCalendarLinkId] = useState('');
  const [calendarLinkOptions, setCalendarLinkOptions] = useState<CalendarLinkOption[]>([]);
  const [rpe, setRpe] = useState<number>();
  const [postFatigue, setPostFatigue] = useState<number>();

  // Ból
  const [hasPain, setHasPain] = useState(false);
  const [painLocation, setPainLocation] = useState<string>(BODY_LOCATIONS[0][0]);
  const [painSide, setPainSide] = useState('');
  const [painIntensity, setPainIntensity] = useState<number>();
  const [painExcludes, setPainExcludes] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const populateCalendarLinkSelect = useCallback(async () => {
    if (!currentUser) return;
    const from = new Date(); from.setDate(from.getDate() - 2);
    const to = new Date(); to.setDate(to.getDate() + 1);
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('status', 'scheduled')
      .gte('scheduled_date', toLocalDateStr(from))
      .lte('scheduled_date', toLocalDateStr(to));
    const opts = (data ?? []).map((e: any) => ({
      id: e.id,
      label: `${new Date(e.scheduled_date + 'T00:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} — ${e.title}`,
    }));
    setCalendarLinkOptions(opts);
  }, [currentUser]);

  const loadHistory = useCallback(async () => {
    if (!currentUser) return;
    const { data, error: err } = await supabase
      .from('daily_logs')
      .select('*,pain_entries(*)')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (err) return; // load* nie pokazuje banera błędu — konwencja z web
    setHistory((data ?? []) as HistoryRow[]);
  }, [currentUser]);

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { populateCalendarLinkSelect(); loadHistory(); }, [populateCalendarLinkSelect, loadHistory]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([populateCalendarLinkSelect(), loadHistory()]);
    setRefreshing(false);
  }, [populateCalendarLinkSelect, loadHistory]);

  const resetForm = () => {
    // AUDYT 28.07.2026: brakujący `setEntryType('morning')` — kontrakt sekcja 1
    // wymaga, żeby przełącznik wracał do "Wpis poranny" po KAŻDYM udanym
    // zapisie (także po zapisie potreningowym), nie tylko czyścić pola.
    setEntryType('morning');
    setSleepHours(''); setFreeNote(''); setDuration(''); setCalendarLinkId('');
    setHasPain(false); setPainExcludes(false);
    setSleepQuality(undefined); setMorningFatigue(undefined); setMoodMotivation(undefined);
    setRpe(undefined); setPostFatigue(undefined); setPainIntensity(undefined);
  };

  const submitDailyLog = async () => {
    if (!currentUser) return;
    setError(null); setOk(null);

    if (hasPain && painIntensity === undefined) {
      setError('Zaznacz intensywność bólu.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (entryType === 'morning') {
        if (sleepHours !== '') payload.sleep_hours = Number(sleepHours);
        if (sleepQuality !== undefined) payload.sleep_quality = sleepQuality;
        if (morningFatigue !== undefined) payload.morning_fatigue = morningFatigue;
        if (moodMotivation !== undefined) payload.mood_motivation = moodMotivation;
        if (freeNote.trim()) payload.free_note = freeNote.trim();
      } else {
        if (duration !== '') payload.duration_minutes = Number(duration);
        if (rpe !== undefined) payload.rpe = rpe;
        if (postFatigue !== undefined) payload.post_fatigue = postFatigue;
      }

      const insertBody: Record<string, any> = {
        user_id: currentUser.id,
        entry_type: entryType,
        session_type: entryType === 'post_training' ? sessionType : null,
        payload,
      };
      if (entryType === 'post_training' && calendarLinkId) {
        insertBody.calendar_event_id = Number(calendarLinkId);
      }

      const { data: inserted, error: insErr } = await supabase.from('daily_logs').insert(insertBody).select();
      if (insErr) throw insErr;
      const dailyLogId = inserted?.[0]?.id;

      if (hasPain && dailyLogId) {
        const side = NON_LATERAL_LOCATIONS.has(painLocation) ? null : (painSide || null);
        const { error: painErr } = await supabase.from('pain_entries').insert({
          daily_log_id: dailyLogId,
          user_id: currentUser.id,
          body_location: painLocation,
          side,
          intensity: painIntensity,
          excludes_from_training: painExcludes,
        });
        if (painErr) throw new Error('Wpis zapisany, ale wpis bólowy się nie udał: ' + painErr.message);
      }

      setOk('Zapisano.');
      resetForm();
      await loadHistory();
    } catch (e: any) {
      setError('Nie udało się zapisać: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <Text style={styles.title}>Dziennik zawodnika</Text>

      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, entryType === 'morning' && styles.toggleBtnActive]}
          onPress={() => setEntryType('morning')}
        >
          <Text style={[styles.toggleTxt, entryType === 'morning' && styles.toggleTxtActive]}>Wpis poranny</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, entryType === 'post_training' && styles.toggleBtnActive]}
          onPress={() => setEntryType('post_training')}
        >
          <Text style={[styles.toggleTxt, entryType === 'post_training' && styles.toggleTxtActive]}>Wpis potreningowy</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {ok && <Text style={styles.ok}>{ok}</Text>}

      {entryType === 'morning' ? (
        <>
          <Text style={styles.label}>Ile godzin spałeś?</Text>
          <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" value={sleepHours} onChangeText={setSleepHours} placeholder="np. 7.5" />
          <Text style={styles.label}>Jakość snu (0 = fatalna, 10 = doskonała)</Text>
          <ScalePicker value={sleepQuality} onChange={setSleepQuality} />
          <Text style={styles.label}>Poranne zmęczenie (0 = brak, 10 = wykończony)</Text>
          <ScalePicker value={morningFatigue} onChange={setMorningFatigue} />
          <Text style={styles.label}>Nastrój / motywacja (0 = fatalny, 10 = świetny)</Text>
          <ScalePicker value={moodMotivation} onChange={setMoodMotivation} />
          <Text style={styles.label}>Notatka (opcjonalnie)</Text>
          <TextInput style={[styles.input, styles.textarea]} placeholderTextColor={colors.textSecondary} value={freeNote} onChangeText={setFreeNote} multiline placeholder="Coś jeszcze warto zapisać?" />
        </>
      ) : (
        <>
          <Text style={styles.label}>Rodzaj sesji</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={sessionType} onValueChange={setSessionType}>
              {Object.entries(SESSION_TYPE_LABELS).map(([id, label]) => <Picker.Item key={id} label={label} value={id} />)}
            </Picker>
          </View>
          <Text style={styles.label}>Czas trwania (minuty)</Text>
          <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} keyboardType="number-pad" value={duration} onChangeText={setDuration} placeholder="np. 90" />
          <Text style={styles.label}>Powiąż z zaplanowanym wydarzeniem (opcjonalnie)</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={calendarLinkId} onValueChange={setCalendarLinkId}>
              <Picker.Item label="— nie dotyczy —" value="" />
              {calendarLinkOptions.map((o) => <Picker.Item key={o.id} label={o.label} value={String(o.id)} />)}
            </Picker>
          </View>
          <Text style={styles.label}>RPE — odczuwany wysiłek (0 = brak, 10 = maksymalny)</Text>
          <ScalePicker value={rpe} onChange={setRpe} />
          <Text style={styles.label}>Zmęczenie po treningu (0 = brak, 10 = wykończony)</Text>
          <ScalePicker value={postFatigue} onChange={setPostFatigue} />
        </>
      )}

      <View style={styles.block}>
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setHasPain((v) => !v)}>
          <Checkbox value={hasPain} onValueChange={setHasPain} />
          <Text style={styles.checkboxLabel}>Boli Cię dziś coś?</Text>
        </TouchableOpacity>
        {hasPain && (
          <>
            <Text style={styles.label}>Lokalizacja</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={painLocation} onValueChange={setPainLocation}>
                {BODY_LOCATIONS.map(([id, label]) => <Picker.Item key={id} label={label} value={id} />)}
              </Picker>
            </View>
            {!NON_LATERAL_LOCATIONS.has(painLocation) && (
              <>
                <Text style={styles.label}>Strona</Text>
                <View style={styles.pickerWrap}>
                  <Picker selectedValue={painSide} onValueChange={setPainSide}>
                    <Picker.Item label="—" value="" />
                    <Picker.Item label="Lewa" value="left" />
                    <Picker.Item label="Prawa" value="right" />
                  </Picker>
                </View>
              </>
            )}
            <Text style={styles.label}>Intensywność (0 = ledwo wyczuwalny, 10 = nie do zniesienia)</Text>
            <ScalePicker value={painIntensity} onChange={setPainIntensity} />
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setPainExcludes((v) => !v)}>
              <Checkbox value={painExcludes} onValueChange={setPainExcludes} />
              <Text style={styles.checkboxLabel}>To wyklucza mnie z treningu</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} disabled={saving} onPress={submitDailyLog}>
        <Text style={styles.btnText}>{saving ? 'Zapisuję...' : 'Zapisz wpis'}</Text>
      </TouchableOpacity>

      <View style={{ marginTop: 40 }}>
        <Text style={styles.sectionLabel}>Historia wpisów</Text>
        {history.length === 0 && <Text style={styles.empty}>Brak wpisów — dodaj pierwszy powyżej.</Text>}
        {history.map((row) => {
          const dateLabel = new Date(row.created_at).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
          const typeLabel = row.entry_type === 'morning' ? 'Poranny' : 'Potreningowy';
          const p = row.payload || {};
          let detail = '';
          if (row.entry_type === 'morning') {
            const parts = [];
            if (p.sleep_hours !== undefined) parts.push(`sen: ${p.sleep_hours}h`);
            if (p.sleep_quality !== undefined) parts.push(`jakość snu: ${p.sleep_quality}/10`);
            if (p.morning_fatigue !== undefined) parts.push(`zmęczenie: ${p.morning_fatigue}/10`);
            if (p.mood_motivation !== undefined) parts.push(`nastrój: ${p.mood_motivation}/10`);
            detail = parts.join(' · ') || '—';
          } else {
            const parts = [];
            if (row.session_type) parts.push(SESSION_TYPE_LABELS[row.session_type] ?? row.session_type);
            if (p.duration_minutes !== undefined) parts.push(`${p.duration_minutes} min`);
            if (p.rpe !== undefined) parts.push(`RPE: ${p.rpe}/10`);
            if (p.post_fatigue !== undefined) parts.push(`zmęczenie: ${p.post_fatigue}/10`);
            detail = parts.join(' · ') || '—';
          }
          const pains = row.pain_entries || [];
          return (
            <View key={row.id} style={styles.historyCard}>
              <View style={styles.historyTop}>
                <Text style={styles.historyType}>{typeLabel}</Text>
                <Text style={styles.historyDate}>{dateLabel}</Text>
              </View>
              <Text style={styles.historyDetail}>{detail}</Text>
              {pains.map((pe: any, i: number) => {
                const loc = BODY_LOCATION_LABELS[pe.body_location] ?? pe.body_location;
                const side = pe.side === 'left' ? ' (L)' : pe.side === 'right' ? ' (P)' : '';
                return (
                  <Text key={i} style={styles.painTag}>
                    {loc}{side} — {pe.intensity}/10{pe.excludes_from_training ? ' · wyklucza z treningu' : ''}
                  </Text>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 28, marginBottom: spacing.lg, color: colors.textPrimary },
  toggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  toggleBtn: { flex: 1, minHeight: minTouchHeight, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  toggleTxt: { ...typography.bodyMedium, fontSize: 14, color: colors.textPrimary },
  toggleTxtActive: { color: colors.white },
  label: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 6, marginTop: 4 },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 10, fontSize: 14, marginBottom: spacing.sm, color: colors.textPrimary },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  pickerWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, marginBottom: spacing.sm },
  block: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: spacing.md, marginVertical: spacing.md },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 10 },
  checkboxLabel: { ...typography.body, fontSize: 14, color: colors.textPrimary, flexShrink: 1 },
  btn: { minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  error: { color: colors.error, fontSize: 13, marginBottom: spacing.md },
  ok: { color: colors.success, fontSize: 13, marginBottom: spacing.md },
  empty: { textAlign: 'center', padding: spacing.lg, color: colors.textSecondary, fontSize: 14 },
  historyCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 14, marginBottom: 10 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  historyType: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary },
  historyDate: { fontSize: 12, color: colors.textSecondary },
  historyDetail: { ...typography.body, fontSize: 13, color: colors.textSecondary },
  painTag: { fontSize: 11, color: colors.error, marginTop: 4 },
});
