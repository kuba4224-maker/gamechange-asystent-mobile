// Weryfikacja logiki "wzmocnienia znaczenia" Celu (app/(tabs)/dzis.tsx) —
// czysta logika, bez Supabase/RN, uruchamiana lokalnie poza appką:
//
//   npx tsx lib/goal-prominence.selftest.ts
//
// (jeśli brak `tsx` w projekcie: `npm install --no-save tsx`, potem to
// samo polecenie). Ten sam wzorzec co lib/matchCascade.selftest.ts.
// Uruchom ponownie po każdej zmianie w lib/goal-prominence.ts.
import { weeksActiveSince, weekNounPl, recommendationNounPl, pluralizePl, goalOriginContext } from './goal-prominence';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

// --- weeksActiveSince ---
{
  const now = new Date('2026-08-06T12:00:00.000Z');
  check('0 tygodni — cel założony dziś', weeksActiveSince('2026-08-06T08:00:00.000Z', now) === 0, String(weeksActiveSince('2026-08-06T08:00:00.000Z', now)));
  check('0 tygodni — cel założony 3 dni temu', weeksActiveSince('2026-08-03T12:00:00.000Z', now) === 0, String(weeksActiveSince('2026-08-03T12:00:00.000Z', now)));
  check('1 tydzień — cel założony dokładnie 7 dni temu', weeksActiveSince('2026-07-30T12:00:00.000Z', now) === 1, String(weeksActiveSince('2026-07-30T12:00:00.000Z', now)));
  check('3 tygodnie — cel założony 25 dni temu', weeksActiveSince('2026-07-12T12:00:00.000Z', now) === 3, String(weeksActiveSince('2026-07-12T12:00:00.000Z', now)));
  check('0 (nigdy ujemne) — data w przyszłości', weeksActiveSince('2026-08-10T12:00:00.000Z', now) === 0, String(weeksActiveSince('2026-08-10T12:00:00.000Z', now)));
}

// --- pluralizePl / weekNounPl / recommendationNounPl ---
{
  check('pluralizePl(1) -> jeden', pluralizePl(1, ['jeden', 'kilka', 'wiele']) === 'jeden', pluralizePl(1, ['jeden', 'kilka', 'wiele']));
  check('pluralizePl(3) -> kilka', pluralizePl(3, ['jeden', 'kilka', 'wiele']) === 'kilka', pluralizePl(3, ['jeden', 'kilka', 'wiele']));
  check('pluralizePl(13) -> wiele (wyjątek 12-14)', pluralizePl(13, ['jeden', 'kilka', 'wiele']) === 'wiele', pluralizePl(13, ['jeden', 'kilka', 'wiele']));

  check('weekNounPl(1) -> tydzień', weekNounPl(1) === 'tydzień', weekNounPl(1));
  check('weekNounPl(2) -> tygodnie', weekNounPl(2) === 'tygodnie', weekNounPl(2));
  check('weekNounPl(4) -> tygodnie', weekNounPl(4) === 'tygodnie', weekNounPl(4));
  check('weekNounPl(5) -> tygodni', weekNounPl(5) === 'tygodni', weekNounPl(5));
  check('weekNounPl(12) -> tygodni (wyjątek 12-14)', weekNounPl(12) === 'tygodni', weekNounPl(12));
  check('weekNounPl(22) -> tygodnie', weekNounPl(22) === 'tygodnie', weekNounPl(22));
  check('weekNounPl(0) -> tygodni', weekNounPl(0) === 'tygodni', weekNounPl(0));

  check('recommendationNounPl(1) -> rekomendacja', recommendationNounPl(1) === 'rekomendacja', recommendationNounPl(1));
  check('recommendationNounPl(2) -> rekomendacje', recommendationNounPl(2) === 'rekomendacje', recommendationNounPl(2));
  check('recommendationNounPl(5) -> rekomendacji', recommendationNounPl(5) === 'rekomendacji', recommendationNounPl(5));
}

// --- goalOriginContext ---
{
  check(
    'coach_suggested + notatka trenera',
    goalOriginContext({ origin: 'coach_suggested', suggestion_note: 'Deficyt w diagnozie', refinement_note: null })
      === 'Zasugerowany przez trenera: „Deficyt w diagnozie”',
    String(goalOriginContext({ origin: 'coach_suggested', suggestion_note: 'Deficyt w diagnozie', refinement_note: null }))
  );
  check(
    'coach_suggested bez notatki',
    goalOriginContext({ origin: 'coach_suggested', suggestion_note: null, refinement_note: null }) === 'Zasugerowany przez trenera',
    String(goalOriginContext({ origin: 'coach_suggested', suggestion_note: null, refinement_note: null }))
  );
  check(
    'player_chosen + notatka zawodnika',
    goalOriginContext({ origin: 'player_chosen', suggestion_note: null, refinement_note: 'Chcę szybciej biegać' })
      === 'Twoja notatka: „Chcę szybciej biegać”',
    String(goalOriginContext({ origin: 'player_chosen', suggestion_note: null, refinement_note: 'Chcę szybciej biegać' }))
  );
  check(
    'player_chosen bez notatki',
    goalOriginContext({ origin: 'player_chosen', suggestion_note: null, refinement_note: null }) === 'Wybrany przez Ciebie',
    String(goalOriginContext({ origin: 'player_chosen', suggestion_note: null, refinement_note: null }))
  );
  check(
    'nieznany origin -> null',
    goalOriginContext({ origin: null, suggestion_note: null, refinement_note: null }) === null,
    String(goalOriginContext({ origin: null, suggestion_note: null, refinement_note: null }))
  );
  // coach_suggested ma priorytet nad refinement_note, gdyby oba jakoś współistniały
  check(
    'coach_suggested wygrywa nad refinement_note',
    goalOriginContext({ origin: 'coach_suggested', suggestion_note: null, refinement_note: 'notatka zawodnika' }) === 'Zasugerowany przez trenera',
    String(goalOriginContext({ origin: 'coach_suggested', suggestion_note: null, refinement_note: 'notatka zawodnika' }))
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
