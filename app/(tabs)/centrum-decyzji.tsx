// Ekran CENTRUM DECYZJI — Krok 11 checklisty. Implementacja wg
// docs/KONTRAKT_CENTRUM_DECYZJI.md (spisanego z panel-centrum w
// asystent_app.html). NAJBARDZIEJ złożony ekran, zrobiony na końcu Fazy 2.
//
// ⚠️ Dwie rzeczy niepotwierdzone na produkcji/GitHub main w chwili audytu
// wcześniej w tej sesji (patrz claude/BACKUP_asystent_app_html_2026-07-27_
// przed_migracja_mobilna.md): endpoint /api/submit-recommendation-feedback
// i etykieta "Co teraz:". Wdrożone tu 1:1 zgodnie z Project Knowledge — jeśli
// produkcja ich nie ma, to znana rozbieżność, nie błąd tej migracji.
//
// ⚠️ Web woła fetch('/api/submit-recommendation-feedback') — ścieżka
// względna wobec originu strony. Appka natywna nie ma "tego samego originu",
// więc RECOMMENDATION_FEEDBACK_API_URL niżej zakłada bezwzględny URL na
// domenie produkcyjnej gamechange-app.vercel.app — DO POTWIERDZENIA przez
// Kubę, że to poprawna domena tego endpointu, zanim eskalacja będzie
// testowana na żywo.
// AUDYT 27.07.2026: `Linking.openURL` (system browser) -> `expo-web-browser`
// (przeglądarka w kontekście appki) dla linku "Znajdź specjalistę" — ta sama
// zmiana i to samo uzasadnienie co w docs/../diagnoza.tsx. `useEffect` ->
// `useFocusEffect` z tego samego powodu (ekran nie odmontowuje się przy
// przełączaniu zakładek — bez tego lista rekomendacji nie odświeżyłaby się
// po powrocie z Dziennika/Kalendarza, gdzie dane wpływające na rekomendacje
// mogły się zmienić).
import { useState, useCallback, ReactNode } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';

const RECOMMENDATION_FEEDBACK_API_URL = 'https://gamechange-app.vercel.app/api/submit-recommendation-feedback';
const MARKETPLACE_BASE_URL = 'https://gamechange-marketplace.vercel.app';

const FEEDBACK_LABELS: Record<string, string> = {
  done: 'Wykonałem', not_done: 'Nie wykonałem', did_not_make_sense: 'Nie miało to sensu',
  open_to_discussing: 'Chętnie porozmawiam', not_interested: 'Nie jestem zainteresowany',
};
const REFERRAL_REASON_LABELS: Record<string, string> = {
  pain_pattern_match: 'Wzorzec bólu', feedback_escalation: 'Powtarzające się odrzucenia', other: 'Inne',
};
const SPECIALIST_CATEGORY_LABELS: Record<string, string> = {
  strength_conditioning: 'Trener przygotowania motorycznego',
  physiotherapy: 'Fizjoterapeuta',
  orthopedics: 'Ortopeda',
  nutrition: 'Dietetyk sportowy',
  technical_tactical: 'Trener Techniczno-Taktyczny',
  sports_psychology: 'Psycholog sportowy',
};

type Recommendation = {
  id: number; created_at: string; recommendation_type: string;
  weekly_focus_text: string | null; recommendation_text: string; rationale_text: string | null;
  confidence_tone: string | null; referral_reason: string | null; suggested_position: string | null;
  suggested_specialist_category: string | null;
  feedback_response: string | null; feedback_comment: string | null;
};

export default function CentrumDecyzjiScreen() {
  const { currentUser } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [commentVisible, setCommentVisible] = useState<Record<number, boolean>>({});
  const [commentText, setCommentText] = useState<Record<number, string>>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecommendations = useCallback(async () => {
    if (!currentUser) return;
    setLoadError(null);
    const { data, error: err } = await supabase
      .from('decision_recommendations')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (err) {
      setLoadError('Nie udało się wczytać rekomendacji.');
      setRecommendations([]);
      return;
    }
    setRecommendations((data ?? []) as Recommendation[]);
  }, [currentUser]);

  useFocusEffect(useCallback(() => { loadRecommendations(); }, [loadRecommendations]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  }, [loadRecommendations]);

  const trainingFocusRows = recommendations.filter((r) => r.recommendation_type === 'training_focus');
  const currentFocus = trainingFocusRows.length ? trainingFocusRows[0] : null; // najnowsza — sortowanie z zapytania

  const openActionable = recommendations.filter((r) =>
    (r.recommendation_type === 'specialist_referral' || r.recommendation_type === 'position_fit_signal')
    && !r.feedback_response
  );

  const historyIds = new Set(recommendations.map((r) => r.id));
  if (currentFocus) historyIds.delete(currentFocus.id);
  openActionable.forEach((r) => historyIds.delete(r.id));
  const history = recommendations.filter((r) => historyIds.has(r.id));

  const toggleComment = (id: number) => setCommentVisible((prev) => ({ ...prev, [id]: true }));

  async function submitFeedback(recId: number, response: string) {
    if (!currentUser) return;
    setOk(null); setLoadError(null);
    const comment = (commentText[recId] || '').trim();
    setSubmittingId(recId);
    try {
      const res = await fetch(RECOMMENDATION_FEEDBACK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          recommendationId: recId,
          response,
          comment: comment || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setOk(data?.escalation?.fired
        ? 'Zapisano Twoją odpowiedź. Widzimy, że kilka razy z rzędu ta sugestia nie trafiała — przygotowaliśmy nową rekomendację, sprawdź listę poniżej.'
        : 'Zapisano Twoją odpowiedź.');
      await loadRecommendations();
    } catch (e: any) {
      setLoadError('Nie udało się zapisać odpowiedzi: ' + e.message);
    } finally {
      setSubmittingId(null);
    }
  }

  function renderRecCard(r: Recommendation) {
    const isReferral = r.recommendation_type === 'specialist_referral';
    const isPositionSignal = r.recommendation_type === 'position_fit_signal';
    const toneBadge = r.confidence_tone === 'questioning';

    let headerNode: ReactNode = null;
    let actionNode: ReactNode;
    if (isReferral) {
      const reasonLabel = REFERRAL_REASON_LABELS[r.referral_reason || ''] || r.referral_reason || '';
      headerNode = <Text style={styles.pillarLine}>{reasonLabel}</Text>;
      actionNode = <Text style={styles.actionText}>{r.recommendation_text}</Text>;
    } else if (isPositionSignal) {
      headerNode = <Text style={styles.pillarLine}>Sugerowana pozycja: {r.suggested_position || ''}</Text>;
      actionNode = <Text style={styles.actionText}>{r.recommendation_text}</Text>;
    } else {
      if (r.weekly_focus_text) {
        headerNode = (
          <Text style={styles.focusText}>
            {r.weekly_focus_text}{toneBadge ? <Text style={styles.toneBadge}>  ton pytający</Text> : null}
          </Text>
        );
      }
      actionNode = (
        <Text style={styles.actionText}>
          {!r.weekly_focus_text && toneBadge ? <Text style={styles.toneBadge}>ton pytający  </Text> : null}
          <Text style={{ fontWeight: '700' }}>Co teraz: </Text>{r.recommendation_text}
        </Text>
      );
    }

    const dateLabel = new Date(r.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    const showCommentBox = !!commentVisible[r.id];
    const isReferralCard = isReferral || isPositionSignal;

    return (
      <View key={r.id} style={[styles.card, isReferralCard && styles.cardReferral]}>
        {headerNode}
        {actionNode}
        {r.rationale_text ? <Text style={styles.rationale}>{r.rationale_text}</Text> : null}

        {r.suggested_specialist_category ? (
          <TouchableOpacity
            style={styles.specialistLink}
            onPress={() => WebBrowser.openBrowserAsync(`${MARKETPLACE_BASE_URL}/specialist_list.html?category=${encodeURIComponent(r.suggested_specialist_category!)}`)}
          >
            <Text style={styles.specialistLinkText}>
              Znajdź specjalistę: {SPECIALIST_CATEGORY_LABELS[r.suggested_specialist_category] || r.suggested_specialist_category} →
            </Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.dateLabel}>{dateLabel}</Text>

        {r.feedback_response ? (
          <Text style={styles.feedbackGiven}>
            Twoja odpowiedź: {FEEDBACK_LABELS[r.feedback_response] || r.feedback_response}
            {r.feedback_comment ? ` — „${r.feedback_comment}”` : ''}
          </Text>
        ) : isPositionSignal ? (
          <>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.secondaryBtn} disabled={submittingId === r.id} onPress={() => submitFeedback(r.id, 'open_to_discussing')}>
                <Text style={styles.secondaryBtnText}>Chętnie porozmawiam</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} disabled={submittingId === r.id} onPress={() => submitFeedback(r.id, 'not_interested')}>
                <Text style={styles.secondaryBtnText}>Nie jestem zainteresowany</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => toggleComment(r.id)}>
                <Text style={styles.secondaryBtnText}>Nie miało to sensu</Text>
              </TouchableOpacity>
            </View>
            {showCommentBox && (
              <View style={{ marginTop: 10 }}>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Dlaczego? (opcjonalnie)"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  value={commentText[r.id] || ''}
                  onChangeText={(t) => setCommentText((prev) => ({ ...prev, [r.id]: t }))}
                />
                <TouchableOpacity style={styles.secondaryBtn} disabled={submittingId === r.id} onPress={() => submitFeedback(r.id, 'did_not_make_sense')}>
                  <Text style={styles.secondaryBtnText}>Wyślij</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.secondaryBtn} disabled={submittingId === r.id} onPress={() => submitFeedback(r.id, 'done')}>
                <Text style={styles.secondaryBtnText}>Wykonałem</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} disabled={submittingId === r.id} onPress={() => submitFeedback(r.id, 'not_done')}>
                <Text style={styles.secondaryBtnText}>Nie wykonałem</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => toggleComment(r.id)}>
                <Text style={styles.secondaryBtnText}>Nie miało to sensu</Text>
              </TouchableOpacity>
            </View>
            {showCommentBox && (
              <View style={{ marginTop: 10 }}>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Dlaczego? (opcjonalnie)"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  value={commentText[r.id] || ''}
                  onChangeText={(t) => setCommentText((prev) => ({ ...prev, [r.id]: t }))}
                />
                <TouchableOpacity style={styles.secondaryBtn} disabled={submittingId === r.id} onPress={() => submitFeedback(r.id, 'did_not_make_sense')}>
                  <Text style={styles.secondaryBtnText}>Wyślij</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <Text style={styles.title}>Centrum Decyzji</Text>

      {loadError && <Text style={styles.error}>{loadError}</Text>}
      {ok && <Text style={styles.ok}>{ok}</Text>}

      <View>
        <Text style={styles.sectionLabel}>Priorytet tygodnia</Text>
        {currentFocus
          ? renderRecCard(currentFocus)
          : <Text style={styles.empty}>Brak jeszcze wygenerowanej rekomendacji — pojawi się tu, gdy silnik Centrum Decyzji zacznie działać.</Text>}
      </View>

      <View style={{ marginTop: 32 }}>
        <Text style={styles.sectionLabel}>Warto sprawdzić</Text>
        {openActionable.length === 0
          ? <Text style={styles.empty}>Nic do sprawdzenia w tej chwili.</Text>
          : openActionable.map(renderRecCard)}
      </View>

      <View style={{ marginTop: 32 }}>
        <TouchableOpacity onPress={() => setShowHistory((v) => !v)}>
          <Text style={styles.sectionLabel}>{showHistory ? '▾' : '▸'} Historia rekomendacji</Text>
        </TouchableOpacity>
        {showHistory && (
          history.length === 0
            ? <Text style={styles.empty}>Brak historii.</Text>
            : history.map(renderRecCard)
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 28, marginBottom: spacing.lg, color: colors.textPrimary },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 14 },
  error: { color: colors.error, fontSize: 13, marginBottom: 12 },
  ok: { color: colors.success, fontSize: 13, marginBottom: 12 },
  empty: { textAlign: 'center', padding: 24, color: colors.textSecondary, fontSize: 14 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 20, marginBottom: 14 },
  cardReferral: { borderLeftWidth: 3, borderLeftColor: colors.brand },
  pillarLine: { fontSize: 11, color: colors.textSecondary, marginBottom: 8 },
  focusText: { ...typography.display, fontSize: 18, color: colors.textPrimary, marginBottom: 10 },
  actionText: { ...typography.body, fontSize: 15, color: colors.textPrimary, marginBottom: 10 },
  toneBadge: { fontSize: 11, letterSpacing: 0.5, color: colors.textPrimary, backgroundColor: colors.surfaceElevated, borderRadius: radii.sm, paddingHorizontal: 6, overflow: 'hidden' },
  rationale: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  specialistLink: { alignSelf: 'flex-start', marginTop: 10, marginBottom: 4, minHeight: minTouchHeight, justifyContent: 'center', paddingHorizontal: 18, borderWidth: 1, borderColor: colors.brand, borderRadius: radii.md },
  specialistLinkText: { ...typography.bodyMedium, fontSize: 13, color: colors.brand, letterSpacing: 0.5 },
  dateLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 10, marginTop: 6 },
  feedbackGiven: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  secondaryBtn: { paddingVertical: 10, paddingHorizontal: 18, minHeight: minTouchHeight, justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md },
  secondaryBtnText: { ...typography.bodyMedium, fontSize: 13, color: colors.textPrimary, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 10, fontSize: 14, marginBottom: 8, color: colors.textPrimary },
  textarea: { minHeight: 60, textAlignVertical: 'top' },
});
