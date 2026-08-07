// JEDNA DROGA B2 08.08.2026 — NOWY PLIK.
// Jedna droga odpowiedzi zawodnika na rekomendację. Do 08.08.2026 cały ten
// kod (adres endpointu, kształt ciała żądania, słowniki etykiet odpowiedzi)
// żył wyłącznie w app/(tabs)/centrum-decyzji.tsx. Po scaleniu rekomendacji na
// ekran Dziś ta sama akcja jest wywoływana z dwóch ekranów — więc musi mieć
// JEDNO miejsce, inaczej za tydzień będą dwa różne ciała żądania.
//
// ⚠️ NADAL NIEPOTWIERDZONE — komentarz przeniesiony 1:1 z centrum-decyzji.tsx
// i celowo NIE zmieniony (adres endpointu nietknięty):
//   Web woła fetch('/api/submit-recommendation-feedback') — ścieżka względna
//   wobec originu strony. Appka natywna nie ma "tego samego originu", więc
//   RECOMMENDATION_FEEDBACK_API_URL niżej zakłada bezwzględny URL na domenie
//   produkcyjnej gamechange-app.vercel.app — DO POTWIERDZENIA przez Kubę, że
//   to poprawna domena tego endpointu, zanim eskalacja będzie testowana na
//   żywo.
// PO SCALENIU TO WISI CIĘŻEJ NIŻ WISIAŁO: od 08.08.2026 ten endpoint obsługuje
// JEDYNĄ akcję decyzyjną na ekranie domowym appki. Jeśli adres jest zły,
// zawodnik dostaje błąd na pierwszym ekranie, który widzi po zalogowaniu.
export const RECOMMENDATION_FEEDBACK_API_URL =
  'https://gamechange-app.vercel.app/api/submit-recommendation-feedback';

export const FEEDBACK_LABELS: Record<string, string> = {
  done: 'Wykonałem', not_done: 'Nie wykonałem', did_not_make_sense: 'Nie miało to sensu',
  open_to_discussing: 'Chętnie porozmawiam', not_interested: 'Nie jestem zainteresowany',
};

export const REFERRAL_REASON_LABELS: Record<string, string> = {
  pain_pattern_match: 'Wzorzec bólu', feedback_escalation: 'Powtarzające się odrzucenia', other: 'Inne',
};

export const SPECIALIST_CATEGORY_LABELS: Record<string, string> = {
  strength_conditioning: 'Trener przygotowania motorycznego',
  physiotherapy: 'Fizjoterapeuta',
  orthopedics: 'Ortopeda',
  nutrition: 'Dietetyk sportowy',
  technical_tactical: 'Trener Techniczno-Taktyczny',
  sports_psychology: 'Psycholog sportowy',
};

export type FeedbackResult = {
  /** Komunikat do pokazania PRZY karcie, której dotyczy — nie na górze ekranu. */
  message: string;
  escalationFired: boolean;
};

/**
 * Wysyła odpowiedź zawodnika na rekomendację. Rzuca wyjątkiem z czytelną
 * treścią przy błędzie — wołający decyduje, gdzie ją pokazać.
 * Kształt ciała żądania 1:1 z dotychczasowym centrum-decyzji.tsx.
 */
export async function submitRecommendationFeedback(params: {
  userId: string;
  recommendationId: number;
  response: string;
  comment?: string;
}): Promise<FeedbackResult> {
  const res = await fetch(RECOMMENDATION_FEEDBACK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: params.userId,
      recommendationId: params.recommendationId,
      response: params.response,
      comment: params.comment || undefined,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

  const escalationFired = !!data?.escalation?.fired;
  return {
    escalationFired,
    message: escalationFired
      ? 'Zapisano Twoją odpowiedź. Widzimy, że kilka razy z rzędu ta sugestia nie trafiała — przygotowaliśmy nową rekomendację, sprawdź Wszystkie rekomendacje.'
      : 'Zapisano Twoją odpowiedź.',
  };
}
