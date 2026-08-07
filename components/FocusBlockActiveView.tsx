// TOR 7 KROK 5b (31.07.2026 noc — 01.08.2026) — Blok Skupienia, Fazy 2-4
// "Praca / Zamknięcie / Utrzymanie". Kontynuacja po Kroku 5a
// (components/FocusBlockPlanner.tsx, Faza 1 "Start" — NIE dotknięty przez
// ten plik).
//
// Zintegrowany w app/(tabs)/cele.tsx 01.08.2026 — renderowany zamiast
// statycznego tekstu blokady, gdy zawodnik ma już aktywny Blok Skupienia w
// danym filarze (środkowa gałąź warunku obok FocusBlockPlanner). Rodzic
// (cele.tsx, funkcja loadActiveBlockPillars) ładuje pełny wiersz
// focus_blocks + rozwiązaną etykietę elementu (component_id →
// segment_components.name, embedding przez FK z migracji Kroku 5a) i
// przekazuje jako props — ten komponent NIE sam wyszukuje "czy jest blok
// dla tego filaru".
//
// Zakres (PLAN_SPOJNEJ_SCIEZKI.md sekcja 3E):
// - Faza 2a: pytanie kontrolne co ~14 dni (generowane przez cron, patrz
//   cron-send-notifications_KROK5B_ROZSZERZENIE.md) — tu TYLKO wyświetlenie
//   najnowszego nieodpowiedzianego pytania + zapis odpowiedzi. Zawodnik
//   może też ręcznie odświeżyć/zażądać pytania wcześniej (dogodność UX,
//   poza ścisłym zakresem crona) przez generate-focus-block-content
//   (action:'checkin') — patrz onRequestCheckinNow.
// - Faza 2b: dawka treści — pokazywana razem z pytaniem, gdy backend ją
//   dołączył (contentDose w wygenerowanym pytaniu; już zapisane pytanie
//   z crona nie niesie ze sobą dawki w tej tabeli — schemat
//   focus_block_checkins nie ma osobnej kolumny na treść dawki, tylko
//   question_text; jeśli w przyszłości trzeba pokazywać historyczne dawki,
//   trzeba dodać kolumnę — świadomie POMINIĘTE w tej wersji, dawka jest
//   "ulotna": widoczna tylko w turze, w której wygenerowana ręcznie przez
//   onRequestCheckinNow, bo tylko wtedy mamy ją w pamięci klienta).
// - Faza 3: przegląd zamknięcia — baner gdy started_at+target_weeks minęło,
//   generuje podsumowanie (action:'closing_review'), trzy równorzędne
//   opcje + CTA do programu 97 zł.
// - Faza 4: rzadkie sprawdzanie opanowanych elementów (checkin_type=
//   'maintenance', generowane przez cron dla status='completed') — ten sam
//   komponent obsługuje odpowiedź, przełącznik działa przez focusBlock.status
//   (patrz loadLatestCheckin) — placement w cele.tsx dla ZAKOŃCZONYCH bloków
//   (sekcja "Historia celów") NIE jest jeszcze zrobiony w tej turze integracji,
//   tylko ścieżka dla AKTYWNYCH bloków — zostaje jako kolejny krok.
//
// Wzorce zapisu (bezpośredni z klienta, bez backendu, RLS pozwala) —
// zgodnie z planem sesji, która przygotowała migrację SQL: RLS na
// focus_block_checkins pozwala UPDATE/SELECT właścicielowi (przez EXISTS
// join focus_blocks.user_id = auth.uid()), brak polityki INSERT dla
// zwykłych userów (insert robi wyłącznie cron/backend przez service role)
// — więc ten komponent NIGDY nie insertuje do focus_block_checkins, tylko
// czyta i UPDATE'uje answer_text/answered_at.

import { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { formatDatePl, DAYS_OF_WEEK, toLocalDateStr } from '../lib/date-utils';
import { colors, typography, radii, minTouchHeight } from '../constants/theme';

const FOCUS_BLOCK_CONTENT_API_URL = 'https://gamechange-app.vercel.app/api/generate-focus-block-content';

// ------------------------------------------------------------
// Mapa uzupełniona 01.08.2026 — skopiowana z `index.html` tego samego repo
// (blok CTA obok `topDeficitId`, gdzie `PRODUCT_NAMES`/`STRIPE_LINKS` są
// użyte razem — to samo miejsce, ten sam wzorzec lookupu po segment_id, co
// tutaj). Wartości potwierdzone krzyżowo w 3 niezależnych miejscach tego
// samego pliku (`generateBridge()`, `PRODUCT_TITLES`, i blok CTA sąsiadujący
// ze STRIPE_LINKS) — identyczne we wszystkich trzech, 13/13 segmentów.
// Linki `buy.stripe.com` NIE zostały kliknięte/przetestowane na żywo —
// samo istnienie i treść stringów jest pewne (odczyt z Project Knowledge),
// zaleca się jedno kliknięcie testowe każdego linku przy najbliższej okazji.
// ------------------------------------------------------------
const STRIPE_LINKS: Record<string, string> = {
  moc: 'https://buy.stripe.com/cNibJ14U6bBc62M2Fndby09',
  fizycznosc: 'https://buy.stripe.com/dRm5kDfyK20C76Qgwddby0b',
  wytrzymalosc: 'https://buy.stripe.com/eVq3cv86icFg4YI1Bjdby01',
  tolerancja: 'https://buy.stripe.com/9B68wP86iax81Mwfs9dby02',
  regeneracja: 'https://buy.stripe.com/7sY3cv86ifRsbn693Ldby05',
  odzywianie: 'https://buy.stripe.com/28E9ATcmy20C4YI1Bjdby07',
  odpornosc: 'https://buy.stripe.com/bJebJ1fyKcFgezigwddby08',
  percepcja: 'https://buy.stripe.com/fZu4gzgCOgVw3UEfs9dby06',
  decyzja: 'https://buy.stripe.com/fZu4gzgCOgVw3UEfs9dby06',
  koncentracja: 'https://buy.stripe.com/9B628r86i48K1Mw5Rzdby0a',
  mental: 'https://buy.stripe.com/6oU4gz5Ya20C2QAgwddby04',
  techFund: 'https://buy.stripe.com/7sY8wP9am20Caj26VDdby03',
  techSpec: 'https://buy.stripe.com/7sY8wP9am20Caj26VDdby03',
};
const PRODUCT_NAMES: Record<string, string> = {
  moc: 'Prawdziwa Eksplozywność',
  fizycznosc: 'Prawdziwa Eksplozywność',
  wytrzymalosc: 'Program Wytrzymałości Meczowej',
  tolerancja: 'Protokół Tolerancji Obciążeń',
  regeneracja: 'Protokół Regeneracji',
  odzywianie: 'Protokół Odżywienia Sportowca',
  odpornosc: 'Protokół Odporności Sezonowej',
  percepcja: 'Percepcja i Szybkość Decyzji',
  decyzja: 'Percepcja i Szybkość Decyzji',
  koncentracja: 'Protokół Mentalny',
  mental: 'Protokół Mentalny',
  techFund: 'Program Techniki',
  techSpec: 'Program Techniki',
};

type FocusBlock = {
  id: string;
  user_id: string;
  segment_id: string;
  component_id: string | null;
  custom_description: string | null;
  pillar: string;
  status: 'active' | 'completed' | 'abandoned';
  stage: string | null;
  sessions_per_week: number;
  target_weeks: number;
  started_at: string;
  closed_at: string | null;
};

type Checkin = {
  id: string;
  focus_block_id: string;
  checkin_type: 'progress' | 'maintenance';
  question_text: string;
  asked_at: string;
  answered_at: string | null;
  answer_text: string | null;
};

type Props = {
  // Aktywny LUB zakończony blok do wyświetlenia — pobierany przez rodzica
  // (cele.tsx), ten komponent NIE sam wyszukuje "czy jest blok dla tego
  // filaru", żeby uniknąć duplikowania zapytania, które cele.tsx i tak
  // musi wykonać, żeby zdecydować co renderować (przycisk "Zaplanuj pracę"
  // kontra ten komponent).
  focusBlock: FocusBlock;
  elementLabel: string; // nazwa elementu — ten sam tekst co confirmedText w FocusBlockPlanner, rodzic go już ma (goal.refinement_note albo component name)
  currentUserId: string;
  onBlockClosed: () => void; // wywoływane po continue/new_element/close — rodzic przeładowuje listę celów/bloków
};

// Dociągnięcie TODO (01.08.2026): "Kontynuuj" musi dogenerować nowe
// calendar_events na dodatkowe tygodnie, nie tylko przedłużyć
// target_weeks — inaczej zawodnik widzi dłuższy blok bez żadnych nowych
// sesji w kalendarzu. focus_blocks NIE przechowuje wybranych dni tygodnia
// (tylko sessions_per_week jako liczbę), więc dni wnioskujemy z historii
// już istniejących calendar_events tego bloku (patrz wywołanie niżej).
// Ten sam wzorzec generowania dat co buildScheduledDates w
// FocusBlockPlanner.tsx, tylko z jawnym punktem startowym (dzień po
// ostatniej dotychczasowej sesji) zamiast "dzisiaj".
function buildContinuationDates(dayCodes: string[], weeks: number, afterDate: Date): string[] {
  const start = new Date(afterDate);
  start.setDate(start.getDate() + 1);
  const startIdx = (start.getDay() + 6) % 7; // Pon=0..Nd=6, jak w date-utils
  const dates: string[] = [];
  for (const code of dayCodes) {
    const targetIdx = DAYS_OF_WEEK.findIndex(([c]) => c === code);
    if (targetIdx === -1) continue;
    const diff = (targetIdx - startIdx + 7) % 7;
    const first = new Date(start);
    first.setDate(start.getDate() + diff);
    for (let w = 0; w < weeks; w++) {
      const d = new Date(first);
      d.setDate(first.getDate() + w * 7);
      dates.push(toLocalDateStr(d));
    }
  }
  return dates;
}

export default function FocusBlockActiveView({ focusBlock, elementLabel, currentUserId, onBlockClosed }: Props) {
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(true);
  const [answerText, setAnswerText] = useState('');
  const [answerSaving, setAnswerSaving] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  const [requestingCheckin, setRequestingCheckin] = useState(false);
  const [freshContentDose, setFreshContentDose] = useState<{ practicalStep: string; forCurious: string | null } | null>(null);
  // AUDYT 06.08.2026 — dodany widoczny stan błędu dla "Sprawdź teraz, jak idzie".
  const [checkinError, setCheckinError] = useState<string | null>(null);

  const loadLatestCheckin = useCallback(async () => {
    setCheckinLoading(true);
    try {
      const checkinType = focusBlock.status === 'completed' ? 'maintenance' : 'progress';
      const { data, error: err } = await supabase
        .from('focus_block_checkins')
        .select('id, focus_block_id, checkin_type, question_text, asked_at, answered_at, answer_text')
        .eq('focus_block_id', focusBlock.id)
        .eq('checkin_type', checkinType)
        .order('asked_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (err) throw err;
      setCheckin((data as Checkin) ?? null);
    } catch {
      setCheckin(null);
    } finally {
      setCheckinLoading(false);
    }
  }, [focusBlock.id, focusBlock.status]);

  useEffect(() => { loadLatestCheckin(); }, [loadLatestCheckin]);

  const submitAnswer = async () => {
    if (!checkin || !answerText.trim()) return;
    setAnswerSaving(true);
    setAnswerError(null);
    try {
      const { error: err } = await supabase
        .from('focus_block_checkins')
        .update({ answer_text: answerText.trim(), answered_at: new Date().toISOString() })
        .eq('id', checkin.id);
      if (err) throw err;
      setCheckin({ ...checkin, answer_text: answerText.trim(), answered_at: new Date().toISOString() });
      setAnswerText('');
    } catch (e: any) {
      setAnswerError('Nie udało się zapisać odpowiedzi: ' + e.message);
    } finally {
      setAnswerSaving(false);
    }
  };

  // Wygodowa opcja: zawodnik może ręcznie poprosić o pytanie kontrolne
  // wcześniej niż wypadałoby to z crona (np. jeśli chce sprawdzić postęp
  // "na już"). Woła generate-focus-block-content (action:'checkin'),
  // ale — inaczej niż cron — NIE insertuje wiersza do focus_block_checkins
  // (brak uprawnień INSERT z klienta, patrz nagłówek pliku): pokazuje
  // wynik WYŁĄCZNIE lokalnie w tej turze (pytanie + ewentualna dawka
  // treści), nie zapisuje trwale. To świadomy kompromis — trwałe pytania
  // kontrolne zawsze pochodzą z crona (Faza 2a ma być rytmem, nie
  // czymś generowanym na żądanie w nieskończoność).
  //
  // AUDYT 06.08.2026 — audyt zaproponował usunięcie tego przycisku ("nic nie
  // zapisuje, pusty catch, w typowym przypadku dotknięcie nie zmienia nic").
  // ŚWIADOMIE ODSTĄPIONO od usunięcia: bez działającego crona to jedyna droga,
  // żeby Faza 2 pokazała cokolwiek poza "Brak jeszcze żadnego pytania kontrolnego".
  // Naprawiona została natomiast realna wada — cichy `catch {}`. Teraz błąd jest
  // widoczny, a brak treści w odpowiedzi też ma swój komunikat, więc dotknięcie
  // przycisku ZAWSZE coś zmienia na ekranie.
  const requestCheckinNow = async () => {
    setRequestingCheckin(true);
    setFreshContentDose(null);
    setCheckinError(null);
    try {
      const res = await fetch(FOCUS_BLOCK_CONTENT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkin', focusBlockId: focusBlock.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.contentDose) setFreshContentDose(data.contentDose);
      else setCheckinError('Tym razem nie ma nowej podpowiedzi — wróć po kolejnej sesji.');
    } catch {
      setCheckinError('Nie udało się teraz sprawdzić — spróbuj za chwilę.');
    } finally {
      setRequestingCheckin(false);
    }
  };

  // --- Faza 3: przegląd zamknięcia ---
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [closingAction, setClosingAction] = useState<'continue' | 'new_element' | 'close' | null>(null);
  const [closingSaving, setClosingSaving] = useState(false);
  const [closingSaveError, setClosingSaveError] = useState<string | null>(null);

  const targetEndDate = (() => {
    const start = new Date(focusBlock.started_at);
    const end = new Date(start);
    end.setDate(start.getDate() + focusBlock.target_weeks * 7);
    return end;
  })();
  const reviewDue = focusBlock.status === 'active' && Date.now() >= targetEndDate.getTime();

  const openReview = async () => {
    setReviewOpen(true);
    setReviewLoading(true);
    setReviewError(null);
    try {
      const res = await fetch(FOCUS_BLOCK_CONTENT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'closing_review', focusBlockId: focusBlock.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setReviewSummary(data.summary);
    } catch (e: any) {
      setReviewError('Nie udało się wygenerować podsumowania: ' + e.message);
    } finally {
      setReviewLoading(false);
    }
  };

  // "Kontynuuj" = +2 tygodnie do target_weeks, blok zostaje active.
  // Wartość POTWIERDZONA przez Kubę 01.08.2026 (pytanie zadane wprost przy
  // domykaniu TODO poniżej) — 2 tygodnie to ostateczna wartość.
  const CONTINUE_EXTRA_WEEKS = 2;

  const confirmClosingAction = async (action: 'continue' | 'new_element' | 'close') => {
    setClosingAction(action);
    setClosingSaving(true);
    setClosingSaveError(null);
    try {
      if (action === 'continue') {
        // Dni tygodnia wnioskujemy z historii już zaplanowanych sesji tego
        // bloku (jedyne miejsce, gdzie ten wzorzec jest zapisany — patrz
        // komentarz przy buildContinuationDates wyżej).
        const { data: existingEvents, error: evFetchErr } = await supabase
          .from('calendar_events')
          .select('scheduled_date, goal_id')
          .eq('focus_block_id', focusBlock.id)
          .not('scheduled_date', 'is', null)
          .order('scheduled_date', { ascending: false });
        if (evFetchErr) throw evFetchErr;

        const rows = existingEvents ?? [];
        const dayCodes = Array.from(new Set(
          rows.map((r) => {
            const d = new Date(r.scheduled_date + 'T00:00:00');
            const idx = (d.getDay() + 6) % 7;
            return DAYS_OF_WEEK[idx][0];
          })
        ));
        const lastDate = rows[0]?.scheduled_date
          ? new Date(rows[0].scheduled_date + 'T00:00:00')
          : new Date(focusBlock.started_at);
        const goalIdFromHistory = rows.find((r) => r.goal_id != null)?.goal_id ?? null;

        // Skrajny przypadek (nie powinien wystąpić w praktyce — FocusBlockPlanner
        // zawsze tworzy sesje razem z blokiem): brak jakiejkolwiek historii
        // calendar_events, więc nie mamy z czego wywnioskować dni tygodnia.
        // Świadomie NIE blokujemy przedłużenia target_weeks w tym przypadku —
        // lepiej pozwolić zawodnikowi kontynuować bez nowych sesji w kalendarzu
        // niż rzucić błąd i nie pozwolić kontynuować wcale.
        if (dayCodes.length > 0) {
          const newDates = buildContinuationDates(dayCodes, CONTINUE_EXTRA_WEEKS, lastDate);
          const eventsBody = newDates.map((d) => ({
            user_id: currentUserId,
            event_type: 'micro_session',
            source: 'system',
            title: `Blok Skupienia: ${elementLabel}`,
            status: 'scheduled',
            scheduled_date: d,
            goal_id: goalIdFromHistory,
            focus_block_id: focusBlock.id,
          }));
          const { error: evInsertErr } = await supabase.from('calendar_events').insert(eventsBody);
          if (evInsertErr) throw evInsertErr;
        }

        const { error: err } = await supabase
          .from('focus_blocks')
          .update({ target_weeks: focusBlock.target_weeks + CONTINUE_EXTRA_WEEKS })
          .eq('id', focusBlock.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('focus_blocks')
          .update({ status: action === 'new_element' ? 'completed' : 'abandoned', closed_at: new Date().toISOString() })
          .eq('id', focusBlock.id);
        if (err) throw err;
      }
      onBlockClosed();
    } catch (e: any) {
      setClosingSaveError('Nie udało się zapisać decyzji: ' + e.message);
      setClosingAction(null);
    } finally {
      setClosingSaving(false);
    }
  };

  const renderStripeCta = () => {
    const link = STRIPE_LINKS[focusBlock.segment_id];
    const name = PRODUCT_NAMES[focusBlock.segment_id];
    if (!link) return null;
    return (
      <TouchableOpacity style={styles.stripeCta} onPress={() => Linking.openURL(link)}>
        <Text style={styles.stripeCtaLabel}>Pogłęb temat</Text>
        <Text style={styles.stripeCtaName}>{name || 'Program pogłębiający'}</Text>
      </TouchableOpacity>
    );
  };

  // --- Render ---

  if (reviewOpen) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.sectionLabel}>Przegląd Bloku Skupienia — {elementLabel}</Text>
        {reviewLoading && <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginVertical: 12 }} />}
        {reviewError && <Text style={styles.error}>{reviewError}</Text>}
        {reviewSummary && <Text style={styles.reasoningText}>{reviewSummary}</Text>}
        {!reviewLoading && (
          <View>
            <Text style={styles.label}>Co dalej?</Text>
            <TouchableOpacity
              style={[styles.btn, closingSaving && styles.btnDisabled]}
              disabled={closingSaving}
              onPress={() => confirmClosingAction('continue')}
            >
              <Text style={styles.btnText}>{closingAction === 'continue' && closingSaving ? 'Zapisuję...' : `Kontynuuj jeszcze ${CONTINUE_EXTRA_WEEKS} tyg.`}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnSecondary, closingSaving && styles.btnDisabled]}
              disabled={closingSaving}
              onPress={() => confirmClosingAction('new_element')}
            >
              <Text style={styles.btnSecondaryText}>{closingAction === 'new_element' && closingSaving ? 'Zapisuję...' : 'Zamknij i wybierz nowy element'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnSecondary, closingSaving && styles.btnDisabled]}
              disabled={closingSaving}
              onPress={() => confirmClosingAction('close')}
            >
              <Text style={styles.btnSecondaryText}>{closingAction === 'close' && closingSaving ? 'Zapisuję...' : 'Zamknij wątek'}</Text>
            </TouchableOpacity>
            {closingSaveError && <Text style={styles.error}>{closingSaveError}</Text>}
            {renderStripeCta()}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>
        {focusBlock.status === 'completed' ? 'Utrzymanie — ' : 'Blok Skupienia — '}{elementLabel}
      </Text>
      {focusBlock.stage && focusBlock.status === 'active' && (
        <Text style={styles.stageText}>Etap: {focusBlock.stage}</Text>
      )}

      {reviewDue && (
        <TouchableOpacity style={styles.reviewBanner} onPress={openReview}>
          <Text style={styles.reviewBannerText}>Ten Blok Skupienia dobiega końca zaplanowanego okresu — zobacz podsumowanie i zdecyduj, co dalej →</Text>
        </TouchableOpacity>
      )}

      {checkinLoading && <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginVertical: 8 }} />}

      {!checkinLoading && checkin && !checkin.answered_at && (
        <View style={styles.checkinBox}>
          <Text style={styles.questionText}>{checkin.question_text}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholderTextColor={colors.textSecondary}
            value={answerText}
            onChangeText={setAnswerText}
            multiline
            placeholder="Twoja odpowiedź..."
          />
          {answerError && <Text style={styles.error}>{answerError}</Text>}
          <TouchableOpacity
            style={[styles.btn, (answerSaving || !answerText.trim()) && styles.btnDisabled]}
            disabled={answerSaving || !answerText.trim()}
            onPress={submitAnswer}
          >
            <Text style={styles.btnText}>{answerSaving ? 'Zapisuję...' : 'Wyślij odpowiedź'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!checkinLoading && checkin && checkin.answered_at && (
        <Text style={styles.hintText}>
          Ostatnie pytanie kontrolne ({formatDatePl(checkin.asked_at)}) odpowiedziane {formatDatePl(checkin.answered_at)}.
        </Text>
      )}

      {!checkinLoading && !checkin && (
        <Text style={styles.hintText}>Brak jeszcze żadnego pytania kontrolnego dla tego bloku.</Text>
      )}

      {freshContentDose && (
        <View style={styles.contentDoseBox}>
          <Text style={styles.contentDoseLabel}>Praktyczny krok</Text>
          <Text style={styles.reasoningText}>{freshContentDose.practicalStep}</Text>
          {freshContentDose.forCurious && (
            <>
              <Text style={styles.contentDoseLabel}>Dla chętnych</Text>
              <Text style={styles.reasoningText}>{freshContentDose.forCurious}</Text>
            </>
          )}
        </View>
      )}

      {checkinError && <Text style={styles.checkinErrorText}>{checkinError}</Text>}

      <TouchableOpacity style={styles.cancelLink} onPress={requestCheckinNow} disabled={requestingCheckin}>
        <Text style={styles.linkTextMuted}>{requestingCheckin ? 'Sprawdzam...' : 'Sprawdź teraz, jak idzie'}</Text>
      </TouchableOpacity>

      {!reviewDue && focusBlock.status === 'active' && (
        <TouchableOpacity style={styles.cancelLink} onPress={openReview}>
          <Text style={styles.linkTextMuted}>Zakończ blok wcześniej</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderColor: colors.brand, borderRadius: radii.md, backgroundColor: 'rgba(232,67,45,0.06)', padding: 14, marginTop: 10 },
  checkinErrorText: { ...typography.body, fontSize: 13, color: colors.textSecondary, marginTop: 10, lineHeight: 19 },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 6 },
  stageText: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary, marginBottom: 10 },
  label: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 6, marginTop: 8 },
  reasoningText: { ...typography.body, fontSize: 13, color: colors.textSecondary, marginBottom: 12, lineHeight: 18 },
  reviewBanner: { backgroundColor: 'rgba(232,67,45,0.15)', borderRadius: radii.md, padding: 10, marginBottom: 10 },
  reviewBannerText: { ...typography.bodyMedium, fontSize: 13, color: colors.textPrimary },
  checkinBox: { marginTop: 6, marginBottom: 6 },
  questionText: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 10, fontSize: 14, marginBottom: 8, color: colors.textPrimary },
  textarea: { minHeight: 60, textAlignVertical: 'top' },
  hintText: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  contentDoseBox: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 10 },
  contentDoseLabel: { ...typography.bodySemiBold, fontSize: 12, color: colors.textPrimary, marginBottom: 2 },
  error: { color: colors.error, fontSize: 13, marginBottom: 8, marginTop: 4 },
  btn: { minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center', marginTop: 8, paddingHorizontal: 12 },
  btnDisabled: { opacity: 0.4 },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  btnSecondary: { minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginTop: 8, paddingHorizontal: 12 },
  btnSecondaryText: { ...typography.bodySemiBold, color: colors.textPrimary, fontSize: 15 },
  cancelLink: { marginTop: 12, alignItems: 'center' },
  linkTextMuted: { color: colors.textSecondary, fontSize: 13, ...typography.bodyMedium },
  stripeCta: { marginTop: 14, borderWidth: 1, borderColor: colors.special, borderRadius: radii.md, padding: 12, alignItems: 'center' },
  stripeCtaLabel: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 2 },
  stripeCtaName: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary },
});
