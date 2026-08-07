// Weryfikacja lib/livingDiagnosisCascade.ts — czysta logika, bez Supabase/
// RN, uruchamiana lokalnie poza appką:
//
//   npx tsx lib/livingDiagnosisCascade.selftest.ts
//
// (jeśli brak `tsx` w projekcie: `npm install --no-save tsx`, potem to
// samo polecenie). Wzorem lib/matchCascade.selftest.ts — ta sama konwencja
// testowa co reszta appki mobilnej (NIE tests/test-*.js, to konwencja z
// drugiego repo, gamechange-app). Uruchom ponownie po każdej zmianie w
// livingDiagnosisCascade.ts/positionProfiles.ts/livingDiagnosisQuestionBank.ts.
import {
  selectSegmentForLivingDiagnosis,
  isPulseDueToday,
  getRelativeDeficits,
  PlayerLivingDiagnosisContext,
  FRESHNESS_COOLDOWN_DAYS,
  PULSE_INTERVAL_DAYS,
} from './livingDiagnosisCascade';
import { LIVING_DIAGNOSIS_SEGMENT_ORDER } from './livingDiagnosisQuestionBank';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

const NOW = new Date('2026-08-10T12:00:00.000Z');
const OBRONCA = 'Środkowy obrońca'; // tier 'key': percepcja/decyzja/fizycznosc/mental

function scoresWithDeficit(deficitSeg: string) {
  const base: Record<string, number> = {
    moc: 70, wytrzymalosc: 72, fizycznosc: 71, techFund: 69, techSpec: 70,
    tolerancja: 68, regeneracja: 71, odpornosc: 70, odzywianie: 69,
    koncentracja: 70, mental: 71, percepcja: 70, decyzja: 70,
  };
  base[deficitSeg] = 30;
  return base;
}

function daysAgoIso(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

// --- Scenariusz 1: cel = position-critical deficyt w tym samym segmencie
// (powinno wybrać ten segment, źródło 'deficit') — mirror scenariusza 1
// matchCascade.selftest.ts, potwierdza że port kolejności priorytetu
// zadziałał identycznie. ---
{
  const ctx: PlayerLivingDiagnosisContext = {
    profilePosition: OBRONCA,
    latestScores: scoresWithDeficit('percepcja'),
    activeGoalSegmentId: 'percepcja',
    segmentLastPulsedAt: {},
  };
  const result = selectSegmentForLivingDiagnosis(ctx, NOW);
  check(
    'Scenariusz 1: cel = position-critical deficyt w tym samym segmencie',
    !!result && result.segmentId === 'percepcja' && result.selectionSource === 'deficit',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 2: cel RÓŻNY od najgroźniejszego deficytu (powinno wybrać
// deficyt position-critical, NIE cel). ---
{
  const ctx: PlayerLivingDiagnosisContext = {
    profilePosition: OBRONCA,
    latestScores: scoresWithDeficit('fizycznosc'),
    activeGoalSegmentId: 'techSpec',
    segmentLastPulsedAt: {},
  };
  const result = selectSegmentForLivingDiagnosis(ctx, NOW);
  check(
    'Scenariusz 2: cel różny od najgroźniejszego deficytu -> wygrywa deficyt position-critical',
    !!result && result.segmentId === 'fizycznosc' && result.selectionSource === 'deficit',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 3: bez diagnozy i bez celu -> spada do rotacji. ---
{
  const ctx: PlayerLivingDiagnosisContext = {
    profilePosition: null,
    latestScores: null,
    activeGoalSegmentId: null,
    segmentLastPulsedAt: { moc: daysAgoIso(1) }, // wszystko poza 'moc' nigdy pytane
  };
  const result = selectSegmentForLivingDiagnosis(ctx, NOW);
  check(
    'Scenariusz 3: brak diagnozy i celu -> rotacja',
    !!result && result.selectionSource === 'rotation' && result.segmentId !== 'moc',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 4 (NOWY, specyficzny dla diagnozy żywej — brama
// świeżości): aktywny cel WSKAZUJE segment odpytany 5 dni temu (świeży,
// < 21 dni) -> kaskada NIE wraca do tego samego segmentu, mimo że źródło
// 'goal' normalnie by go wybrało; spada do innego, dostępnego segmentu. ---
{
  const ctx: PlayerLivingDiagnosisContext = {
    profilePosition: null,
    latestScores: null,
    activeGoalSegmentId: 'percepcja',
    segmentLastPulsedAt: { percepcja: daysAgoIso(5) },
  };
  const result = selectSegmentForLivingDiagnosis(ctx, NOW);
  check(
    'Scenariusz 4: cel wskazuje świeżo odpytany segment -> pomijany przez bramę świeżości',
    !!result && result.segmentId !== 'percepcja',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 5: ten sam segment odpytany DAWNO (22 dni, powyżej progu
// FRESHNESS_COOLDOWN_DAYS=21) -> brama świeżości już nie blokuje, cel może
// znów wygrać kaskadę. ---
{
  const ctx: PlayerLivingDiagnosisContext = {
    profilePosition: null,
    latestScores: null,
    activeGoalSegmentId: 'percepcja',
    segmentLastPulsedAt: { percepcja: daysAgoIso(22) },
  };
  const result = selectSegmentForLivingDiagnosis(ctx, NOW);
  check(
    `Scenariusz 5: segment odpytany ${'>'}${FRESHNESS_COOLDOWN_DAYS} dni temu -> brama świeżości już nie blokuje`,
    !!result && result.segmentId === 'percepcja' && result.selectionSource === 'goal',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 6: wszystkie 13 segmentów świeże (< 21 dni) -> brak
// dostępnego segmentu, funkcja zwraca null (dziś brak pulsu). ---
{
  const allFresh: Partial<Record<string, string>> = {};
  LIVING_DIAGNOSIS_SEGMENT_ORDER.forEach((id) => { allFresh[id] = daysAgoIso(2); });
  const ctx: PlayerLivingDiagnosisContext = {
    profilePosition: null,
    latestScores: null,
    activeGoalSegmentId: null,
    segmentLastPulsedAt: allFresh,
  };
  const result = selectSegmentForLivingDiagnosis(ctx, NOW);
  check(
    'Scenariusz 6: wszystkie 13 segmentów świeże -> null (brak pulsu dziś)',
    result === null,
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 7: excludeSegmentIds wyklucza segment mimo że inaczej
// wygrałby kaskadę (spójność kształtu z selectSegmentForMatch). ---
{
  const ctx: PlayerLivingDiagnosisContext = {
    profilePosition: OBRONCA,
    latestScores: scoresWithDeficit('percepcja'),
    activeGoalSegmentId: 'percepcja',
    segmentLastPulsedAt: {},
  };
  const result = selectSegmentForLivingDiagnosis(ctx, NOW, ['percepcja']);
  check(
    'Scenariusz 7: excludeSegmentIds wyklucza segment, mimo że wygrałby kaskadę',
    !!result && result.segmentId !== 'percepcja',
    `otrzymano ${JSON.stringify(result)}`
  );
}

console.log('\nisPulseDueToday — czysta funkcja decyzyjna');

check('nigdy nie pulsowano -> należny dziś', isPulseDueToday(null, NOW) === true, 'oczekiwano true');
check(`dokładnie ${PULSE_INTERVAL_DAYS} dni temu -> należny dziś`, isPulseDueToday(daysAgoIso(PULSE_INTERVAL_DAYS), NOW) === true, 'oczekiwano true');
check('1 dzień temu -> jeszcze nie należny', isPulseDueToday(daysAgoIso(1), NOW) === false, 'oczekiwano false');
check(`${PULSE_INTERVAL_DAYS - 1} dni temu -> jeszcze nie należny`, isPulseDueToday(daysAgoIso(PULSE_INTERVAL_DAYS - 1), NOW) === false, 'oczekiwano false');

console.log('\ngetRelativeDeficits — port z lib/matchCascade.ts, sanity check');

check(
  'segment wyraźnie poniżej mediany -> wykryty jako deficyt',
  getRelativeDeficits(scoresWithDeficit('tolerancja')).some(([id]) => id === 'tolerancja'),
  'oczekiwano tolerancja w liście deficytów'
);
check(
  'wszystkie wyniki równe -> brak deficytów',
  getRelativeDeficits(Object.fromEntries(LIVING_DIAGNOSIS_SEGMENT_ORDER.map((id) => [id, 70]))).length === 0,
  'oczekiwano pustej listy'
);

console.log(`\n${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) process.exit(1);
