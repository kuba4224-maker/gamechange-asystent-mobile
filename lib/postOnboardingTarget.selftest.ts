// ONBOARDING R8 08.08.2026 — asercje dla lib/postOnboardingTarget.ts.
// Czysta logika, bez Supabase/RN, uruchamiana lokalnie poza appką:
//
//   npx tsx lib/postOnboardingTarget.selftest.ts
//
// Ten sam wzorzec co lib/focusBlockProgress.selftest.ts. Uruchom ponownie po
// każdej zmianie w lib/postOnboardingTarget.ts.
import { postOnboardingTarget } from './postOnboardingTarget';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

check('ma diagnozę → /diagnoza (wynik, nie pusty ekran)',
  postOnboardingTarget(true) === '/diagnoza', postOnboardingTarget(true));

check('nie ma diagnozy → /cele (założenie Celu, nie pusty ekran)',
  postOnboardingTarget(false) === '/cele', postOnboardingTarget(false));

check('R5: błąd odczytu (null) → /dzis, NIE /cele — „nie wiem" to nie „nie ma"',
  postOnboardingTarget(null) === '/dzis', postOnboardingTarget(null));

check('błąd odczytu nie udaje wyniku diagnozy',
  postOnboardingTarget(null) !== '/diagnoza', postOnboardingTarget(null));

check('trzy wejścia dają trzy różne wyjścia (żaden stan nie jest zlany z innym)',
  new Set([postOnboardingTarget(true), postOnboardingTarget(false), postOnboardingTarget(null)]).size === 3,
  JSON.stringify([postOnboardingTarget(true), postOnboardingTarget(false), postOnboardingTarget(null)]));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
