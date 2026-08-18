// ⚠️ PLAN-D-A 08.2026 — dla zawodnika ta rzecz nazywa się od teraz po prostu
// BLOK (4–8 tygodni skupionej pracy). Nazwa pliku, komponentu i tabeli
// (`focus_blocks`) zostaje bez zmian — to kod, nie głos produktu. Komentarze
// niżej pisane wcześniej mówią „Blok Skupienia"; zostawione jako zapis.
//
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
//
//   ⚠️ PRAKTYKA-EKRAN B6 08.08.2026 — POWYŻSZY AKAPIT JEST JUŻ NIEAKTUALNY
//   i zostaje wyłącznie jako zapis tego, jak było. Od rundy 5 pas A zapisuje
//   dawkę do `focus_blocks.content_doses jsonb` w postaci gotowej na ekran
//   (kontrakt: claude/RAPORT_ZWROTNY_A_RUNDA_5.md, sekcja 11). Dawka
//   PRZESTAŁA BYĆ ULOTNA i ten komponent ją czyta — patrz `loadContentDoses`
//   i `renderContentDose` niżej. Historyczne dawki też są widoczne, jako
//   zwijana lista „wcześniej w tym Bloku"; osobnej kolumny na
//   focus_block_checkins nie było trzeba.
//
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
//
// ═══════════════════════════════════════════════════════════════════
// PRAKTYKA-EKRAN B6 08.08.2026 — DAWKA TREŚCI PRZESTAJE BYĆ NIEWIDOCZNA
//
// PO CO: dawka była od rundy 5 zapisywana w bazie i nadal NIE CZYTANA PRZEZ
// ŻADEN EKRAN — stacja „Praktyka" była domknięta w danych, nie dla człowieka
// (reguła R1). Zmierzone przez pas A: w 8-tygodniowym Bloku 18 z 27 tur to
// dziś tury, w których zawodnik wchodzi i NIE MA CZEGO PRZECZYTAĆ.
//
// SKĄD DANE — i dlaczego OSOBNYM, WĄSKIM ZAPYTANIEM, a nie dopisaniem kolumny
// do dużego selecta `focus_blocks` w app/(tabs)/cele.tsx (który i tak ładuje
// ten wiersz i przekazuje go tu propsem). Dwa powody, oba twarde:
//   1. `cele.tsx` NIE JEST w pasie tej rundy — polecenie wymienia pliki, które
//      wolno ruszyć, i tego pliku wśród nich nie ma;
//   2. — ważniejszy — gdyby `content_doses` weszło do TAMTEGO selecta, a
//      migracja z sekcji 7 raportu A nie była jeszcze wklejona, PostgREST
//      odrzuciłby CAŁE zapytanie (błąd `42703` dotyczy zapytania, nie kolumny).
//      Padłby wtedy nie kafelek dawki, tylko cały odczyt Bloków Skupienia:
//      nazwa Elementu, blokada „jeden Blok na filar", przegląd zamknięcia.
//      Nowa funkcja zabiłaby trzy stare. Osobne zapytanie izoluje ten błąd do
//      jednej sekcji — dokładnie tak, jak opisał to pas A przy `fetchFocusBlock`.
// Zapytanie idzie RÓWNOLEGLE z odczytem pytania kontrolnego (Promise.all), więc
// kosztuje jeden request, a nie jedno oczekiwanie więcej.
//
// ⚠️ ZERO ZAPISU do tej kolumny i ZERO wywołań `generate-focus-block-content`
// na potrzeby dawki (zasady 5 i 6 kontraktu). Odczyt z bazy jest darmowy;
// wywołanie modelu nie jest. Przycisk „Sprawdź teraz, jak idzie" nadal woła
// endpoint — ale to jest ŚWIADOME działanie zawodnika, nie automat, i po nim
// odświeżamy odczyt, żeby na ekranie została wersja z bazy.
//
// ⚠️ TRZY JAWNE STANY BRAKU (kolumny nie ma / `NULL` / pusta lista) siedzą
// w lib/contentDose.ts razem z resztą reguł i mają swój selftest. Żaden z nich
// nie jest błędem na ekranie zawodnika; tylko pierwszy pisze do logu.

import { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { formatDatePl, DAYS_OF_WEEK, toLocalDateStr } from '../lib/date-utils';
import { colors, typography, radii, minTouchHeight } from '../constants/theme';
import BlockClosingRediagnosis from './BlockClosingRediagnosis';
// PRAKTYKA-EKRAN B6 08.08.2026 — wszystkie reguły dawki (kształt koperty, trzy
// jawne stany braku, sześć zasad renderowania z kontraktu pasa A) siedzą
// w czystych funkcjach z własnym selftestem. Tutaj zostaje wyłącznie zapytanie
// i rysowanie.
import {
  CONTENT_DOSE_COLUMN,
  CONTENT_DOSE_COLUMN_MISSING_WARN,
  CONTENT_DOSE_SECTION_LABEL,
  CONTENT_DOSE_STEP_LABEL,
  CONTENT_DOSE_CURIOUS_LABEL,
  CONTENT_DOSE_SOURCE_LABEL,
  buildContentDoseView,
  curiousToggleLabel,
  earlierDosesLabel,
  isMissingContentDoseColumnError,
  // ZAPIS B7 08.08.2026 (M23/B36) — „przeczytane": osobna kolumna, appka
  // zapisuje wyłącznie do niej (nigdy do content_doses, zasada 5 kontraktu).
  CONTENT_DOSE_SEEN_COLUMN,
  CONTENT_DOSE_SEEN_COLUMN_MISSING_WARN,
  isMissingSeenColumnError,
  parseSeenKeys,
  parseContentDoses,
  isDoseSeen,
  withSeenKey,
  type ContentDoseCard,
} from '../lib/contentDose';

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

  // PRAKTYKA-EKRAN B6 08.08.2026 — stan dawki treści z bazy.
  // `doseRaw === undefined` znaczy „jeszcze nie czytaliśmy", `null` znaczy
  // „kolumna jest i jest pusta". To NIE jest to samo i `buildContentDoseView`
  // rozróżnia oba — patrz lib/contentDose.ts.
  const [doseRaw, setDoseRaw] = useState<unknown>(undefined);
  const [doseError, setDoseError] = useState<unknown>(null);
  const [doseLoading, setDoseLoading] = useState(true);
  const [earlierDosesOpen, setEarlierDosesOpen] = useState(false);
  // Pogłębienie jest zwijane osobno dla każdej dawki (bieżącej i historycznych),
  // więc stanem jest mapa po kluczu dawki, nie jeden przełącznik.
  const [curiousOpen, setCuriousOpen] = useState<Record<string, boolean>>({});

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

  // PRAKTYKA-EKRAN B6 08.08.2026 — jedno wąskie zapytanie o dawki tego Bloku.
  // Uzasadnienie osobnego zapytania (zamiast kolumny w selecie z cele.tsx) stoi
  // w nagłówku pliku. `supabase-js` NIE RZUCA przy braku kolumny — zwraca
  // `{ data: null, error }` — więc `error` idzie do `buildContentDoseView`
  // NIETKNIĘTY i to ono rozstrzyga, czy to „nie ma migracji", czy „nie ma dawki".
  // ZAPIS B7 08.08.2026 — „przeczytane". `null` = kolumny nie ma (migracja
  // rundy 7 niewklejona) — wtedy nic nie zapisujemy i nic nie mierzymy.
  const [seenKeys, setSeenKeys] = useState<string[] | null>(null);

  const loadContentDoses = useCallback(async () => {
    setDoseLoading(true);
    // ZAPIS B7 08.08.2026 — pytamy też o `content_dose_seen`; gdy tej kolumny
    // nie ma, powtarzamy samym `content_doses` (ścieżka odzysku — wzorzec
    // `zawsze_widoczna` z dzis.tsx). PostgREST przy nieznanej kolumnie odrzuca
    // CAŁE zapytanie, więc bez powtórki brak migracji „seen" zabrałby
    // zawodnikowi cały ekran dawki.
    let { data, error: err } = await supabase
      .from('focus_blocks')
      .select(`${CONTENT_DOSE_COLUMN},${CONTENT_DOSE_SEEN_COLUMN}`)
      .eq('id', focusBlock.id)
      .maybeSingle();
    let seenAvailable = true;
    if (err && isMissingSeenColumnError(err) && !isMissingContentDoseColumnError(err)) {
      console.warn(CONTENT_DOSE_SEEN_COLUMN_MISSING_WARN);
      seenAvailable = false;
      ({ data, error: err } = await supabase
        .from('focus_blocks')
        .select(CONTENT_DOSE_COLUMN)
        .eq('id', focusBlock.id)
        .maybeSingle());
    }
    if (err) {
      setDoseError(err);
      setDoseRaw(undefined);
      setSeenKeys(null);
      // Log mówi wprost, CZEGO ZAWODNIK PRZEZ TO NIE WIDZI — ten sam wzorzec
      // co `console.warn` przy `goals.component_id` w cele.tsx (runda 5).
      if (isMissingContentDoseColumnError(err)) console.warn(CONTENT_DOSE_COLUMN_MISSING_WARN);
      else console.warn('[dawka] Nie udało się odczytać focus_blocks.content_doses:', err);
    } else {
      setDoseError(null);
      const row = data as Record<string, unknown> | null;
      setDoseRaw(row?.[CONTENT_DOSE_COLUMN] ?? null);
      setSeenKeys(seenAvailable ? parseSeenKeys(row?.[CONTENT_DOSE_SEEN_COLUMN]) : null);
    }
    setDoseLoading(false);
  }, [focusBlock.id]);

  useEffect(() => {
    // Równolegle, nie po kolei: dawka nie ma powodu czekać na pytanie kontrolne.
    Promise.all([loadLatestCheckin(), loadContentDoses()]);
  }, [loadLatestCheckin, loadContentDoses]);

  // ZAPIS B7 08.08.2026 (M23/B36) — otwarcie Bloku z widoczną dawką oznacza ją
  // jako przeczytaną. JEDYNY zapis, jaki appka robi przy dawce — i idzie do
  // OSOBNEJ kolumny `content_dose_seen`, nigdy do `content_doses` (zasada 5).
  // `seenKeys === null` = migracji nie ma → zero zapisów, zero pomiaru, reszta
  // ekranu bez zmian. Zapis jest best-effort: porażka to strata pomiaru,
  // nie funkcji.
  useEffect(() => {
    if (doseLoading || doseError || seenKeys === null) return;
    const parsed = parseContentDoses(doseRaw);
    if (parsed.kind !== 'ready' || parsed.doses.length === 0) return;
    const key = parsed.doses[0].klucz;
    if (!key || isDoseSeen(seenKeys, key)) return;
    const next = withSeenKey(seenKeys, key);
    setSeenKeys(next);
    supabase
      .from('focus_blocks')
      .update({ [CONTENT_DOSE_SEEN_COLUMN]: next })
      .eq('id', focusBlock.id)
      .then(({ error: uerr }) => {
        if (uerr) console.warn('[dawka] Nie udało się zapisać „przeczytane" (strata pomiaru, nie funkcji):', uerr);
      });
  }, [doseLoading, doseError, doseRaw, seenKeys, focusBlock.id]);

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
      // PRAKTYKA-EKRAN B6 08.08.2026 — od rundy 5 backend ZAPISUJE tę dawkę do
      // `focus_blocks.content_doses`, więc po udanym wywołaniu odczytujemy bazę
      // ponownie. Dzięki temu na ekranie zostaje wersja trwała, a nie kopia
      // w pamięci klienta, która ginie przy wyjściu z ekranu.
      loadContentDoses();
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

  // ZMIANA OBRAZU B5 08.08.2026 — stacja rediagnozy stoi PRZED pytaniem
  // „Co dalej?". Trzy przyciski zamknięcia pojawiają się dopiero, gdy stacja
  // się rozstrzygnie: zawodnik odpowiedział, pominął, albo stacji w ogóle nie
  // ma (brak punktu odniesienia / błąd odczytu — patrz komponent).
  //
  // KOLEJNOŚĆ JEST CELOWA. Gdyby trzy przyciski stały obok pytania, zawodnik
  // dotknąłby najbliższego i rediagnoza nigdy by się nie wydarzyła — a to jest
  // jedyny moment w całej pętli, w którym da się pokazać zmianę. Odwrotnie niż
  // przy podpowiedzi na Dziś (runda 4, odstąpienie 1): tam decyzja szła przed
  // czytaniem, bo czytanie może poczekać. Tu czytanie JEST podsumowaniem pracy.
  const [rediagnosisResolved, setRediagnosisResolved] = useState(false);

  // Stabilna referencja — komponent stacji woła to raz i tylko raz.
  const handleRediagnosisResolved = useCallback(() => setRediagnosisResolved(true), []);

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
    setRediagnosisResolved(false); // ZMIANA OBRAZU B5 08.08.2026
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
          // ⭐ PLAN-D-W2 — odczyt długości z ostatniej sesji tego Bloku.
          let dlugoscZOstatniejSesji: number | null = null;
          {
            const { data: ostatnia, error: dlErr } = await supabase
              .from('calendar_events')
              .select('planned_minutes')
              .eq('focus_block_id', focusBlock.id)
              .not('planned_minutes', 'is', null)
              .order('scheduled_date', { ascending: false })
              .limit(1);
            // ⛔ O83 — klient Supabase NIE RZUCA. Błąd odczytany jawnie:
            // nieudany odczyt zostawia `null`, czyli „nie wiemy", a nie liczbę.
            if (dlErr) {
              console.warn(`FocusBlockActiveView: [PLAN-D-W2] nie odczytałem długości sesji Bloku — ${dlErr.message}`);
            } else if (Array.isArray(ostatnia) && ostatnia.length > 0
              && typeof ostatnia[0]?.planned_minutes === 'number') {
              dlugoscZOstatniejSesji = ostatnia[0].planned_minutes;
            }
          }
          const eventsBody = newDates.map((d) => ({
            user_id: currentUserId,
            event_type: 'micro_session',
            source: 'system',
            // PLAN-D-A 08.2026 — tytuł widoczny w Kalendarzu.
            title: `Blok: ${elementLabel}`,
            status: 'scheduled',
            // ⭐ PLAN-D-W2 — długość sesji z konfiguracji Bloku, nie z pytania.
            // ⚠️ `focus_blocks` NIE MA kolumny na czas trwania (zmierzone 17.08),
            // więc przedłużenie Bloku odtwarza ją z OSTATNIEJ zaplanowanej sesji
            // tego Bloku. Gdy i tej nie ma — zostaje `null`, czyli „nie wiemy" (R5).
            // ⛔ Nie wpisujemy tu liczby domyślnej: zmyślona długość weszłaby
            // do wagi pracy jako pomiar.
            planned_minutes: dlugoscZOstatniejSesji,
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
        // PLAN-D-A 08.2026 — `closed_at` JEST OBOWIĄZKOWE na każdej ścieżce
        // zamykającej Blok. ⚠️ Kolumna nazywa się `closed_at`, NIE `ended_at`
        // (`ended_at` jest w `goals`). Asymetria jest celowa i potwierdzona
        // odczytem schematu 10.08.2026 — pierwsza wersja migracji A1 wywróciła
        // się właśnie na tym założeniu.
        // Bez `closed_at` Blok znika z widoku (bo `status <> 'active'`), ale
        // nie wiadomo KIEDY został zamknięty — a to jest jedyne źródło długości
        // Bloku w podsumowaniach i w rediagnozie.
        const { error: err } = await supabase
          .from('focus_blocks')
          .update({ status: action === 'new_element' ? 'completed' : 'abandoned', closed_at: new Date().toISOString() })
          .eq('id', focusBlock.id);
        if (err) throw err;
      }
      // ════════════════════════════════════════════════════════
      // NAPRAWA A4a — 10.08.2026
      //
      // `setReviewOpen` był w tym pliku wołany DOKŁADNIE RAZ, z wartością
      // `true`. Po zatwierdzeniu „Kontynuuj" Blok zostawał `active`, więc
      // rodzic renderował ten sam, wciąż zamontowany komponent z
      // `reviewOpen === true` — zawodnik widział to samo podsumowanie i te
      // same trzy przyciski, bez jednego słowa o tym, że cokolwiek się
      // zapisało. Naturalną reakcją było kliknięcie jeszcze raz, a każde
      // kolejne kliknięcie dokładało następne dwa tygodnie sesji: insert
      // idzie PRZED podniesieniem `target_weeks`, a dni tygodnia liczą się
      // z historii zawierającej już świeżo wstawione daty. Mianownik paska
      // „N z M" puchł, więc wskaźnik pracy COFAŁ SIĘ mimo pracy zawodnika.
      //
      // Zamykamy przegląd PRZED `onBlockClosed()`, żeby nie ustawiać stanu
      // komponentu, który rodzic może w tej samej chwili odmontować.
      // ════════════════════════════════════════════════════════
      setReviewOpen(false);
      setClosingAction(null);
      onBlockClosed();
    } catch (e: any) {
      setClosingSaveError('Nie udało się zapisać decyzji: ' + e.message);
      setClosingAction(null);
    } finally {
      setClosingSaving(false);
    }
  };

  // ─── PRAKTYKA-EKRAN B6 08.08.2026 — dawka treści z bazy ─────────────
  // Cała decyzja „co pokazać" zapadła już w `buildContentDoseView`. Tutaj nie
  // ma ani jednego `if` o danych — są wyłącznie `if` o tym, czy dane pole
  // istnieje, bo to są zasady 2 i 3 kontraktu: `dla_chetnych: null` znaczy
  // BRAK PRZYCISKU, a brak `material` znaczy BRAK PRZYPISU.
  const doseView = buildContentDoseView({ loading: doseLoading, error: doseError, raw: doseRaw });

  const renderDoseBody = (card: ContentDoseCard, key: string) => (
    <View key={key} style={styles.doseCard}>
      {card.dateLabel && <Text style={styles.doseDate}>{card.dateLabel}</Text>}
      <Text style={styles.contentDoseLabel}>{CONTENT_DOSE_STEP_LABEL}</Text>
      {/* ZASADA 1: treść jest gotowa — bez skracania, bez przedrostków, bez
          zmiany pierwszej litery. Dlatego stoi tu samo `{...}`. */}
      <Text style={styles.reasoningText}>{card.practicalStep}</Text>
      {/* ZASADA 2: `dla_chetnych: null` znaczy BRAK PRZYCISKU, nie pusty
          przycisk. Gdy treść jest — przycisk stoi ZWINIĘTY, bo pomiar
          (tests/measure-heights.ts) pokazał, że rozwinięty blok przy
          najdłuższej realnej dawce przekracza jeden ekran na małym telefonie. */}
      {card.forCurious && (
        <>
          <TouchableOpacity
            style={styles.doseCuriousToggle}
            onPress={() => setCuriousOpen((prev) => ({ ...prev, [key]: !prev[key] }))}
          >
            <Text style={styles.linkTextMuted}>{curiousToggleLabel(!!curiousOpen[key])}</Text>
          </TouchableOpacity>
          {curiousOpen[key] && <Text style={styles.reasoningText}>{card.forCurious}</Text>}
        </>
      )}
      {card.source && (
        <View style={styles.doseSourceBox}>
          <Text style={styles.doseSourceLabel}>{CONTENT_DOSE_SOURCE_LABEL}</Text>
          {card.source.text && <Text style={styles.doseSourceText}>{card.source.text}</Text>}
          <Text style={styles.doseSourceRef}>{card.source.label}</Text>
        </View>
      )}
    </View>
  );

  const renderContentDose = () => {
    // Wszystkie stany braku renderują TO SAMO: nic. Rozróżnienie między nimi
    // jest w logu i w selfteście, nie na ekranie zawodnika — bo dla niego
    // „migracja nie weszła" i „Blok jest świeży" to ta sama informacja: nie ma
    // dziś nic nowego do przeczytania, a komunikat o tym byłby szumem.
    if (doseView.kind !== 'ready') return null;
    return (
      <View style={styles.contentDoseBox}>
        <Text style={styles.doseSectionLabel}>{CONTENT_DOSE_SECTION_LABEL}</Text>
        {renderDoseBody(doseView.current, doseView.current.key)}

        {/* ZASADA 4: to NIE jest biblioteka. Starsze dawki są zwiniętą listą
            wewnątrz Bloku — miejscem, w którym można wrócić do dawki sprzed
            zmiany etapu — a nie katalogiem z własną trasą i wyszukiwarką
            (decyzja C1: wartość jest w trafieniu w moment, nie w katalogu). */}
        {doseView.earlier.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.doseEarlierToggle}
              onPress={() => setEarlierDosesOpen((v) => !v)}
            >
              <Text style={styles.linkTextMuted}>
                {earlierDosesLabel(doseView.earlier.length, earlierDosesOpen)}
              </Text>
            </TouchableOpacity>
            {earlierDosesOpen && doseView.earlier.map((c) => renderDoseBody(c, c.key))}
          </>
        )}
      </View>
    );
  };

  // Ulotna dawka z przycisku „Sprawdź teraz" ZOSTAJE jako ścieżka odzysku na
  // wypadek, gdyby kolumny w bazie nie było — ale nie pokazujemy jej drugi raz,
  // gdy ta sama treść przyszła już z bazy.
  const showFreshContentDose = !!freshContentDose
    && (doseView.kind !== 'ready' || doseView.current.practicalStep !== freshContentDose.practicalStep);

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
        <Text style={styles.sectionLabel}>Przegląd Bloku — {elementLabel}</Text>
        {reviewLoading && <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginVertical: 12 }} />}
        {reviewError && <Text style={styles.error}>{reviewError}</Text>}
        {reviewSummary && <Text style={styles.reasoningText}>{reviewSummary}</Text>}

        {/* ZMIANA OBRAZU B5 08.08.2026 — „byłeś tu, jesteś tu". Komponent sam
            renderuje się w null, gdy nie ma punktu odniesienia albo zawodnik
            pominął pytanie, i wtedy od razu odsłania „Co dalej?". */}
        <BlockClosingRediagnosis
          userId={currentUserId}
          segmentId={focusBlock.segment_id}
          blockStartedAt={focusBlock.started_at}
          onResolved={handleRediagnosisResolved}
        />

        {!reviewLoading && rediagnosisResolved && (
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
              <Text style={styles.btnSecondaryText}>{closingAction === 'close' && closingSaving ? 'Zapisuję...' : 'Zamknij Blok'}</Text>
            </TouchableOpacity>
            {closingSaveError && <Text style={styles.error}>{closingSaveError}</Text>}
            {renderStripeCta()}
          </View>
        )}

        {/* NAPRAWA A4a — 10.08.2026. Ekran przeglądu nie miał ŻADNEGO wyjścia:
            gdy rediagnoza nie rozstrzygnęła (patrz A4c w
            components/BlockClosingRediagnosis.tsx), trzy przyciski „Co dalej?"
            się nie pokazywały i zawodnik zostawał uwięziony na podsumowaniu.
            Ten link istnieje także po to, żeby dało się wyjść bez podejmowania
            decyzji — przegląd nie jest zobowiązaniem. */}
        <TouchableOpacity
          style={[styles.linkRow, closingSaving && styles.btnDisabled]}
          disabled={closingSaving}
          onPress={() => { setReviewOpen(false); setClosingAction(null); }}
        >
          <Text style={styles.linkTextMuted}>Wróć do Bloku</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>
        {focusBlock.status === 'completed' ? 'Utrzymanie — ' : 'Blok — '}{elementLabel}
      </Text>
      {focusBlock.stage && focusBlock.status === 'active' && (
        <Text style={styles.stageText}>Etap: {focusBlock.stage}</Text>
      )}

      {reviewDue && (
        <TouchableOpacity style={styles.reviewBanner} onPress={openReview}>
          <Text style={styles.reviewBannerText}>Ten Blok dobiega końca zaplanowanego okresu — zobacz podsumowanie i zdecyduj, co dalej →</Text>
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
        <Text style={styles.hintText}>Brak jeszcze żadnego pytania kontrolnego dla tego Bloku.</Text>
      )}

      {/* PRAKTYKA-EKRAN B6 08.08.2026 — dawka z bazy. Stoi PRZED ulotną, bo to
          ona jest trwała: przetrwa wyjście z ekranu i niesie ze sobą źródło. */}
      {renderContentDose()}

      {showFreshContentDose && freshContentDose && (
        <View style={styles.contentDoseBox}>
          <Text style={styles.contentDoseLabel}>{CONTENT_DOSE_STEP_LABEL}</Text>
          <Text style={styles.reasoningText}>{freshContentDose.practicalStep}</Text>
          {freshContentDose.forCurious && (
            <>
              <Text style={styles.contentDoseLabel}>{CONTENT_DOSE_CURIOUS_LABEL}</Text>
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
  wrap: { borderWidth: 1, borderColor: colors.brand, borderRadius: radii.md, backgroundColor: colors.brandSofter, padding: 14, marginTop: 10 }, // W1: token
  checkinErrorText: { ...typography.body, fontSize: 13, color: colors.textSecondary, marginTop: 10, lineHeight: 19 },
  // W1: nadtytuły na ink3 (koncepcja: ink3 = podpisy, nadtytuły)
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6 },
  stageText: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary, marginBottom: 10 },
  label: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6, marginTop: 8 },
  reasoningText: { ...typography.body, fontSize: 13, color: colors.textSecondary, marginBottom: 12, lineHeight: 18 },
  reviewBanner: { backgroundColor: colors.brandTint, borderRadius: radii.md, padding: 10, marginBottom: 10 }, // W1: token
  reviewBannerText: { ...typography.bodyMedium, fontSize: 13, color: colors.textPrimary },
  checkinBox: { marginTop: 6, marginBottom: 6 },
  questionText: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 10, fontSize: 14, marginBottom: 8, color: colors.textPrimary },
  textarea: { minHeight: 60, textAlignVertical: 'top' },
  hintText: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  contentDoseBox: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 10 },
  contentDoseLabel: { ...typography.bodySemiBold, fontSize: 12, color: colors.textPrimary, marginBottom: 2 },
  // PRAKTYKA-EKRAN B6 08.08.2026 — dawka treści z bazy.
  doseSectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 8 }, // W1: ink3
  doseCard: { marginBottom: 4 },
  doseDate: { ...typography.body, fontSize: 11, color: colors.textSecondary, marginBottom: 6 },
  doseSourceBox: { borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: 10, marginTop: 2, marginBottom: 6 },
  doseSourceLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 4 },
  doseSourceText: { ...typography.body, fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginBottom: 3 },
  doseSourceRef: { ...typography.bodyMedium, fontSize: 11, color: colors.textSecondary },
  doseEarlierToggle: { minHeight: minTouchHeight, justifyContent: 'center', marginTop: 2 },
  doseCuriousToggle: { minHeight: minTouchHeight, justifyContent: 'center' },
  error: { color: colors.error, fontSize: 13, marginBottom: 8, marginTop: 4 },
  btn: { minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center', marginTop: 8, paddingHorizontal: 12 },
  btnDisabled: { opacity: 0.4 },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  btnSecondary: { minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginTop: 8, paddingHorizontal: 12 },
  btnSecondaryText: { ...typography.bodySemiBold, color: colors.textPrimary, fontSize: 15 },
  cancelLink: { marginTop: 12, alignItems: 'center' },
  linkTextMuted: { color: colors.textSecondary, fontSize: 13, ...typography.bodyMedium },
  // NAPRAWA A4a 10.08.2026 — wiersz wyjścia z przeglądu. `minTouchHeight`,
  // bo to jedyne wyjście z tego ekranu i musi być trafialne kciukiem.
  linkRow: { minHeight: minTouchHeight, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  stripeCta: { marginTop: 14, borderWidth: 1, borderColor: colors.special, borderRadius: radii.md, padding: 12, alignItems: 'center' },
  stripeCtaLabel: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 2 },
  stripeCtaName: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary },
});
