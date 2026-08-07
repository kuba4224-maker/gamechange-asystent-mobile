// Funkcje pomocnicze — "wzmocnienie znaczenia" Celu na ekranie Dziś
// (BRIEF_DELEGACJA_PROMINENCJA_CELU.md, zatwierdzone przez Kubę 06.08.2026).
// Wydzielone jako logika czysta (bez Supabase/RN) — testowalne przez
// `npx tsx lib/goal-prominence.selftest.ts`, ten sam wzorzec co
// lib/matchCascade.ts + lib/matchCascade.selftest.ts. Uruchom selftest
// ponownie po każdej zmianie w tym pliku.

export type GoalOriginInfo = {
  origin: string | null;
  suggestion_note: string | null;
  refinement_note: string | null;
};

// Ile PEŁNYCH tygodni upłynęło od `createdAtIso` do `now` (domyślnie
// bieżący moment). Zaokrąglone w dół — cel założony 3 dni temu to "0
// tygodni", nie "1" (unikamy zawyżania). Nigdy ujemne (zegar
// urządzenia/serwera rozjechany -> traktujemy jak "dopiero co").
export function weeksActiveSince(createdAtIso: string, now: Date = new Date()): number {
  const start = new Date(createdAtIso).getTime();
  const days = Math.floor((now.getTime() - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.floor(days / 7));
}

// Polska odmiana liczebnikowa — standardowa reguła: 1 -> forma pojedyncza,
// 2-4 (poza 12-14) -> forma "kilka", reszta -> forma dopełniacza mnogiej.
export function pluralizePl(n: number, forms: [one: string, few: string, many: string]): string {
  const [one, few, many] = forms;
  if (n === 1) return one;
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return few;
  return many;
}

export function weekNounPl(n: number): string {
  return pluralizePl(n, ['tydzień', 'tygodnie', 'tygodni']);
}

export function recommendationNounPl(n: number): string {
  return pluralizePl(n, ['rekomendacja', 'rekomendacje', 'rekomendacji']);
}

// Krótkie zdanie "skąd się wziął ten cel" — jeden z mechanizmów wzmocnienia
// znaczenia. Priorytet: notatka trenera przy sugestii > notatka zawodnika
// (refinement_note) > ogólna etykieta wg origin. Zwraca null tylko gdy
// origin jest nieznany/pusty (nie powinno się zdarzyć dla realnych
// wierszy — origin jest zawsze ustawiane przy tworzeniu celu, patrz
// KONTRAKT_CELE.md/createGoal() i INTEGRACJA_CELE_SUGEROWANE_TRENERA.md).
export function goalOriginContext(goal: GoalOriginInfo): string | null {
  if (goal.origin === 'coach_suggested') {
    return goal.suggestion_note
      ? `Zasugerowany przez trenera: „${goal.suggestion_note}”`
      : 'Zasugerowany przez trenera';
  }
  if (goal.origin === 'player_chosen') {
    return goal.refinement_note
      ? `Twoja notatka: „${goal.refinement_note}”`
      : 'Wybrany przez Ciebie';
  }
  return null;
}
