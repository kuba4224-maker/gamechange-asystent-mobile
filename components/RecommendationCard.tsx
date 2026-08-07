// JEDNA DROGA B2 08.08.2026 — NOWY PLIK.
// Jedna karta rekomendacji dla całej appki. Do 08.08.2026 istniała wyłącznie
// wewnątrz app/(tabs)/centrum-decyzji.tsx (funkcja renderRecCard). Po scaleniu
// rekomendacja z przyciskami stoi też na ekranie Dziś — a to jest dokładnie ten
// rodzaj duplikatu, który ta sesja ma likwidować, nie mnożyć. Oba ekrany
// renderują TEN SAM komponent.
//
// DWIE WADY NAPRAWIONE PRZY PRZENOSINACH (obie znalezione w audycie i wskazane
// w poleceniu — nie mogły przewędrować razem z kodem):
//
//  1. `toggleComment` ustawiał tylko `true`. Raz otwartego pola komentarza nie
//     dało się zamknąć — zawodnik, który kliknął „Nie miało to sensu" przez
//     pomyłkę, zostawał z otwartym polem i przyciskiem „Wyślij" do końca
//     wizyty. Teraz to przełącznik w obie strony (`!prev`), a zamknięcie
//     czyści wpisany tekst, żeby ukryta treść nie poszła później w żądaniu.
//
//  2. Komunikat sukcesu renderował się na GÓRZE ekranu (stan `ok` w
//     centrum-decyzji.tsx), więc zawodnik odpowiadający na kartę niżej w
//     scrollu nie widział żadnego potwierdzenia. Teraz komunikat (i błąd) są
//     stanem TEJ karty i renderują się pod przyciskami, których dotyczą.
//     To dlatego stan feedbacku siedzi w tym komponencie, a nie u rodzica.
import { useState, type ReactNode } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { colors, typography, radii, minTouchHeight } from '../constants/theme';
import {
  FEEDBACK_LABELS,
  REFERRAL_REASON_LABELS,
  SPECIALIST_CATEGORY_LABELS,
  submitRecommendationFeedback,
} from '../lib/recommendationFeedback';

const MARKETPLACE_BASE_URL = 'https://gamechange-marketplace.vercel.app';

// ⛔ ZAMROŻONE 06.08.2026 (decyzja Kuby po audycie wartości produktu).
// Link „Znajdź specjalistę" jest ukryty do czasu, aż Marketplace będzie realnym
// produktem. Stan na dzień zamrożenia: klucz Stripe `pk_test` w booking.html
// (płatności nieprodukcyjne), zero ścieżki rejestracji specjalisty, zdjęcia nie
// istnieją jako funkcja, filtr miast wyłączony na sztywno, zgoda na udostępnienie
// diagnozy nie jest zapisywana. Zawodnik klikający ten link trafiał w najlepszym
// razie na pustą listę, w najgorszym na rezerwację z testową płatnością.
// ŻEBY WŁĄCZYĆ Z POWROTEM: ustaw flagę na `true` — reszta kodu jest nietknięta.
// JEDNA DROGA B2 08.08.2026 — flaga PRZENIESIONA tu z centrum-decyzji.tsx razem
// z kodem, który obsługuje. Nadal `false`, wartość nietknięta.
const MARKETPLACE_ENABLED = false;

export type Recommendation = {
  id: number; created_at: string; recommendation_type: string;
  weekly_focus_text: string | null; recommendation_text: string; rationale_text: string | null;
  confidence_tone: string | null; referral_reason: string | null; suggested_position: string | null;
  suggested_specialist_category: string | null;
  feedback_response: string | null; feedback_comment: string | null;
  viewed_at: string | null;
};

/** Kolumny wymagane przez tę kartę — jedno źródło listy, żeby oba ekrany pytały bazę o to samo. */
export const RECOMMENDATION_COLUMNS =
  'id,created_at,recommendation_type,weekly_focus_text,recommendation_text,rationale_text,'
  + 'confidence_tone,referral_reason,suggested_position,suggested_specialist_category,'
  + 'feedback_response,feedback_comment,viewed_at,goal_id';

type Props = {
  rec: Recommendation;
  currentUserId: string;
  /** Kropka „Nowe" — migawka sprzed oznaczenia jako przeczytane (patrz ekrany). */
  isUnread?: boolean;
  /** Dodatkowa linia nad treścią — na Dziś: „Pomaga Ci w celu: …". */
  headerSlot?: ReactNode;
  /**
   * WIEDZA B4 08.08.2026 — blok na SAMYM DOLE karty, pod przyciskami.
   * Na Dziś: podpowiedź z materiałów Gamechange ze źródłem („Moc, s. 8").
   *
   * DLACZEGO POD PRZYCISKAMI, A NIE NAD NIMI — to jedyna decyzja układu w tej
   * rundzie, która miała realny koszt, więc stoi tu wprost. Runda 3 wywalczyła,
   * że przyciski feedbacku stoją 489 dp od góry, czyli NAD ZGIĘCIEM także na
   * najmniejszym telefonie (598 dp widocznego obszaru), z zapasem 109 dp.
   * Blok podpowiedzi to 80–100 dp — wstawiony NAD przyciskami zjadłby cały ten
   * zapas i przy dłuższej rekomendacji zepchnąłby jedyną akcję decyzyjną
   * zawodnika pod zgięcie. Zdobycz rundy 3 jest twardym warunkiem polecenia,
   * a miejsce podpowiedzi nie jest. Decyzja: najpierw decyzja, potem czytanie.
   * Pełny rachunek obu wariantów: raport zwrotny B runda 4, sekcja 12.
   */
  footerSlot?: ReactNode;
  /** Wołane po udanym zapisie odpowiedzi — rodzic przeładowuje dane. */
  onSubmitted: () => void | Promise<void>;
};

export default function RecommendationCard({
  rec, currentUserId, isUnread = false, headerSlot, footerSlot, onSubmitted,
}: Props) {
  const [commentVisible, setCommentVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Komunikat PRZY karcie, nie na górze ekranu — patrz nagłówek pliku, punkt 2.
  const [okMessage, setOkMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Naprawa punkt 1 z nagłówka: przełącznik w obie strony.
  const toggleComment = () => {
    setCommentVisible((prev) => {
      if (prev) setCommentText('');
      return !prev;
    });
  };

  async function submit(response: string) {
    setOkMessage(null);
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const result = await submitRecommendationFeedback({
        userId: currentUserId,
        recommendationId: rec.id,
        response,
        comment: commentText.trim() || undefined,
      });
      setOkMessage(result.message);
      setCommentVisible(false);
      setCommentText('');
      await onSubmitted();
    } catch (e: any) {
      setErrorMessage('Nie udało się zapisać odpowiedzi: ' + (e?.message ?? 'nieznany błąd'));
    } finally {
      setSubmitting(false);
    }
  }

  const isReferral = rec.recommendation_type === 'specialist_referral';
  const isPositionSignal = rec.recommendation_type === 'position_fit_signal';
  const isReferralCard = isReferral || isPositionSignal;
  const toneBadge = rec.confidence_tone === 'questioning';

  let headerNode: ReactNode = null;
  let actionNode: ReactNode;
  if (isReferral) {
    const reasonLabel = REFERRAL_REASON_LABELS[rec.referral_reason || ''] || rec.referral_reason || '';
    headerNode = <Text style={styles.pillarLine}>{reasonLabel}</Text>;
    actionNode = <Text style={styles.actionText}>{rec.recommendation_text}</Text>;
  } else if (isPositionSignal) {
    headerNode = <Text style={styles.pillarLine}>Sugerowana pozycja: {rec.suggested_position || ''}</Text>;
    actionNode = <Text style={styles.actionText}>{rec.recommendation_text}</Text>;
  } else {
    if (rec.weekly_focus_text) {
      headerNode = (
        <Text style={styles.focusText}>
          {rec.weekly_focus_text}{toneBadge ? <Text style={styles.toneBadge}>  ton pytający</Text> : null}
        </Text>
      );
    }
    actionNode = (
      <Text style={styles.actionText}>
        {!rec.weekly_focus_text && toneBadge ? <Text style={styles.toneBadge}>ton pytający  </Text> : null}
        <Text style={{ fontWeight: '700' }}>Co teraz: </Text>{rec.recommendation_text}
      </Text>
    );
  }

  const dateLabel = new Date(rec.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

  const primaryLabels = isPositionSignal
    ? { first: 'Chętnie porozmawiam', firstValue: 'open_to_discussing', second: 'Nie jestem zainteresowany', secondValue: 'not_interested' }
    : { first: 'Wykonałem', firstValue: 'done', second: 'Nie wykonałem', secondValue: 'not_done' };

  return (
    <View style={[styles.card, isReferralCard && styles.cardReferral, isUnread && styles.cardUnread]}>
      {isUnread ? (
        <View style={styles.unreadRow}>
          <View style={styles.unreadDot} />
          <Text style={styles.unreadLabel}>Nowe</Text>
        </View>
      ) : null}

      {headerSlot}
      {headerNode}
      {actionNode}
      {rec.rationale_text ? <Text style={styles.rationale}>{rec.rationale_text}</Text> : null}

      {MARKETPLACE_ENABLED && rec.suggested_specialist_category ? (
        <TouchableOpacity
          style={styles.specialistLink}
          onPress={() => WebBrowser.openBrowserAsync(`${MARKETPLACE_BASE_URL}/specialist_list.html?category=${encodeURIComponent(rec.suggested_specialist_category!)}`)}
        >
          <Text style={styles.specialistLinkText}>
            Znajdź specjalistę: {SPECIALIST_CATEGORY_LABELS[rec.suggested_specialist_category] || rec.suggested_specialist_category} →
          </Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.dateLabel}>{dateLabel}</Text>

      {rec.feedback_response ? (
        <Text style={styles.feedbackGiven}>
          Twoja odpowiedź: {FEEDBACK_LABELS[rec.feedback_response] || rec.feedback_response}
          {rec.feedback_comment ? ` — „${rec.feedback_comment}”` : ''}
        </Text>
      ) : (
        <>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.secondaryBtn} disabled={submitting} onPress={() => submit(primaryLabels.firstValue)}>
              <Text style={styles.secondaryBtnText}>{primaryLabels.first}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} disabled={submitting} onPress={() => submit(primaryLabels.secondValue)}>
              <Text style={styles.secondaryBtnText}>{primaryLabels.second}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn, commentVisible && styles.secondaryBtnActive]} onPress={toggleComment}>
              <Text style={styles.secondaryBtnText}>Nie miało to sensu</Text>
            </TouchableOpacity>
          </View>
          {commentVisible && (
            <View style={{ marginTop: 10 }}>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Dlaczego? (opcjonalnie)"
                placeholderTextColor={colors.textSecondary}
                multiline
                value={commentText}
                onChangeText={setCommentText}
              />
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.secondaryBtn} disabled={submitting} onPress={() => submit('did_not_make_sense')}>
                  <Text style={styles.secondaryBtnText}>Wyślij</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={toggleComment}>
                  <Text style={styles.secondaryBtnText}>Anuluj</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}

      {okMessage ? <Text style={styles.ok}>{okMessage}</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {/* WIEDZA B4 08.08.2026 — patrz opis `footerSlot` w typie Props. */}
      {footerSlot}
    </View>
  );
}

// Style przeniesione 1:1 z centrum-decyzji.tsx — żeby karta wyglądała po
// scaleniu dokładnie tak, jak wyglądała, i żeby oba ekrany były tożsame.
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 20, marginBottom: 14 },
  cardReferral: { borderLeftWidth: 3, borderLeftColor: colors.brand },
  cardUnread: { borderColor: colors.brand },
  unreadRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, marginRight: 6 },
  unreadLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.brand },
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
  // JEDNA DROGA B2 08.08.2026 — widoczny stan wciśnięcia „Nie miało to sensu",
  // skoro przycisk jest teraz przełącznikiem, a nie akcją jednokierunkową.
  secondaryBtnActive: { borderColor: colors.brand },
  secondaryBtnText: { ...typography.bodyMedium, fontSize: 13, color: colors.textPrimary, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 10, fontSize: 14, marginBottom: 8, color: colors.textPrimary },
  textarea: { minHeight: 60, textAlignVertical: 'top' },
  ok: { color: colors.success, fontSize: 13, marginTop: 12 },
  error: { color: colors.error, fontSize: 13, marginTop: 12 },
});
