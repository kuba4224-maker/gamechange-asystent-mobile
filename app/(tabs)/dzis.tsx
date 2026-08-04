// Ekran DZIŚ — NOWY, Krok 2 Toru 7 (SESJA_START_UX_MOBILE_ONBOARDING_NAWIGACJA.md).
// Nowy ekran domowy appki, zastępuje Dziennik jako domyślna zakładka po
// zalogowaniu (patrz app/index.tsx). Realizuje "Cel jako silnik w tle"
// (PLAN_SPOJNEJ_SCIEZKI.md, sekcja 2): Cel nie jest tu pokazany jako
// osobny, głośno podpisany blok "Twój Cel" powtarzany na każdym ekranie —
// zamiast tego DECYDUJE, co jest tu wyeksponowane (najnowsza rekomendacja
// "priorytet tygodnia" z Centrum Decyzji jest z definicji tym, co silnik
// wygenerował dla aktywnego Celu). Pełny, pierwszoplanowy widok samego
// Celu zostaje w zakładce Cele (nietkniętej w tej sesji) — tu jest tylko
// cichy link do niego na dole ekranu, nie osobny wyeksponowany blok.
//
// Świadomie NIE duplikuje ciężkiej logiki "znajdź wolny dzień w tygodniu"
// z app/(tabs)/kalendarz.tsx (computeCalendarSuggestion) — to jest ekran
// DZISIAJ, węższe pytanie niż planowanie na cały tydzień do przodu, więc
// pyta wprost "co jest zaplanowane na dziś", zamiast szukać wolnego terminu.
import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { toLocalDateStr, DAYS_OF_WEEK } from '../../lib/date-utils';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';

const SEG_LABELS: Record<string, string> = Object.fromEntries([
  ['moc', 'Moc'], ['wytrzymalosc', 'Wytrzymałość'], ['fizycznosc', 'Fizyczność'],
  ['techFund', 'Technika Fundamentalna'], ['techSpec', 'Technika Specjalistyczna'],
  ['tolerancja', 'Tolerancja (Obciążeń)'], ['regeneracja', 'Regeneracja'], ['odpornosc', 'Odporność'], ['odzywianie', 'Odżywienie'],
  ['koncentracja', 'Koncentracja'], ['mental', 'Stan Mentalny'],
  ['percepcja', 'Percepcja'], ['decyzja', 'Szybkość Decyzji'],
]);

const EVENT_TYPE_LABELS: Record<string, string> = {
  club_training: 'Trening klubowy', own_training: 'Trening własny',
  micro_session: 'Mikro-sesja', task: 'Zadanie', match: 'Mecz',
};

type Goal = { id: number; segment_id: string; is_priority: boolean };
type Recommendation = { id: number; weekly_focus_text: string | null; recommendation_text: string };
type CalEvent = { id: number; title: string; event_type: string; scheduled_date: string | null; recurrence_rule: string | null };

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
  const [focusRec, setFocusRec] = useState<Recommendation | null>(null);
  const [todayEvents, setTodayEvents] = useState<CalEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentUser) return;
    const todayStr = toLocalDateStr(new Date());
    const todayCode = dayCodeFor(new Date());
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [goalsRes, logsRes, recRes, eventsRes] = await Promise.all([
      supabase.from('goals').select('id,segment_id,is_priority,status')
        .eq('user_id', currentUser.id).eq('status', 'active')
        .order('is_priority', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('daily_logs').select('id')
        .eq('user_id', currentUser.id).gte('created_at', startOfDay.toISOString()).limit(1),
      supabase.from('decision_recommendations').select('id,weekly_focus_text,recommendation_text')
        .eq('user_id', currentUser.id).eq('recommendation_type', 'training_focus')
        .order('created_at', { ascending: false }).limit(1),
      supabase.from('calendar_events').select('id,title,event_type,scheduled_date,recurrence_rule')
        .eq('user_id', currentUser.id).eq('status', 'scheduled'),
    ]);

    const goals = (goalsRes.data ?? []) as Goal[];
    setPriorityGoal(goals.find((g) => g.is_priority) ?? goals[0] ?? null);
    setHasAnyGoal(goals.length > 0);

    setLoggedToday(!!(logsRes.data && logsRes.data.length > 0));

    const rec = recRes.data?.[0];
    setFocusRec(rec ? { id: rec.id, weekly_focus_text: rec.weekly_focus_text, recommendation_text: rec.recommendation_text } : null);

    const events = (eventsRes.data ?? []) as CalEvent[];
    const forToday = events.filter((e) =>
      e.scheduled_date === todayStr ||
      (!!e.recurrence_rule && e.recurrence_rule.replace('weekly:', '').split(',').includes(todayCode))
    );
    setTodayEvents(forToday);

    setLoading(false);
  }, [currentUser]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const todayLabel = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  const goalSegmentLabel = priorityGoal ? (SEG_LABELS[priorityGoal.segment_id] ?? priorityGoal.segment_id) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        <Text style={styles.eyebrow}>{todayLabel}</Text>
        <Text style={styles.title}>Dziś</Text>

        {/* Wpis dnia */}
        <TouchableOpacity style={[styles.card, loggedToday && styles.cardMuted]} onPress={() => router.push('/dziennik')}>
          <Text style={styles.cardLabel}>
            {loggedToday ? 'Dzisiejszy wpis zapisany' : 'Nie masz jeszcze dzisiejszego wpisu'}
          </Text>
          <Text style={styles.cardAction}>{loggedToday ? 'Dodaj kolejny wpis →' : 'Zapisz dzisiejszy wpis →'}</Text>
        </TouchableOpacity>

        {/* Rekomendacja dnia — powiązana z aktywnym Celem po stronie silnika, bez etykiety "Twój Cel" */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionLabel}>Na czym się dziś skupić</Text>
          {focusRec ? (
            <TouchableOpacity style={styles.card} onPress={() => router.push('/centrum-decyzji')}>
              {focusRec.weekly_focus_text ? <Text style={styles.focusText}>{focusRec.weekly_focus_text}</Text> : null}
              <Text style={styles.cardBody} numberOfLines={3}>{focusRec.recommendation_text}</Text>
              <Text style={styles.cardAction}>Zobacz w Centrum Decyzji →</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardBody}>
                {hasAnyGoal
                  ? 'Jeszcze nie mamy dla Ciebie gotowej rekomendacji — pojawi się tu, gdy silnik Centrum Decyzji zacznie działać.'
                  : 'Załóż swój pierwszy Cel, żeby system zaczął podpowiadać, na czym się skupić.'}
              </Text>
              <TouchableOpacity onPress={() => router.push(hasAnyGoal ? '/centrum-decyzji' : '/cele')}>
                <Text style={styles.cardAction}>{hasAnyGoal ? 'Zobacz Centrum Decyzji →' : 'Przejdź do Celów →'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Dzisiejszy kalendarz */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionLabel}>Dziś w kalendarzu</Text>
          {todayEvents.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardBody}>Nic zaplanowanego na dziś.</Text>
              <TouchableOpacity onPress={() => router.push('/kalendarz')}>
                <Text style={styles.cardAction}>Otwórz Kalendarz →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            todayEvents.map((e) => (
              <TouchableOpacity key={e.id} style={styles.card} onPress={() => router.push('/kalendarz')}>
                <Text style={styles.cardLabel}>{e.title}</Text>
                <Text style={styles.cardBody}>{EVENT_TYPE_LABELS[e.event_type] || e.event_type}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {goalSegmentLabel && (
          <TouchableOpacity style={styles.goalLink} onPress={() => router.push('/cele')}>
            <Text style={styles.goalLinkText}>Twój aktywny Cel: {goalSegmentLabel} — zobacz szczegóły →</Text>
          </TouchableOpacity>
        )}

        {!loading && !hasAnyGoal && (
          <Text style={styles.emptyHint}>
            Dziennik, Centrum Decyzji i Kalendarz działają najlepiej, gdy masz założony Cel.
          </Text>
        )}
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
  focusText: { ...typography.display, fontSize: 17, color: colors.textPrimary, marginBottom: 6 },
  goalLink: { marginTop: 20, minHeight: minTouchHeight, justifyContent: 'center' },
  goalLinkText: { ...typography.body, fontSize: 13, color: colors.textSecondary },
  emptyHint: { ...typography.body, fontSize: 13, color: colors.textSecondary, marginTop: 20, textAlign: 'center', lineHeight: 19 },
});
