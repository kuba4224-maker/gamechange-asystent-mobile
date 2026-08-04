// Weryfikacja 5 scenariuszy z Kroku 3 procedury wdrożenia (mecz.tsx) —
// czysta logika, bez Supabase/RN, uruchamiana lokalnie poza appką:
//
//   npx tsx lib/matchCascade.selftest.ts
//
// (jeśli brak `tsx` w projekcie: `npm install --no-save tsx`, potem to
// samo polecenie). Wszystkie 5 scenariuszy przeszło w sesji Cowork z
// 29.07.2026 przy pierwszym uruchomieniu — uruchom ponownie po każdej
// zmianie w matchCascade.ts/positionProfiles.ts/matchQuestionBank.ts.
import { selectSegmentForMatch, PlayerMatchSelectionContext } from './matchCascade';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

// Środkowy obrońca: tier 'key' dla percepcja/decyzja/fizycznosc/mental.
const OBRONCA = 'Środkowy obrońca';

function scoresWithDeficit(deficitSeg: string) {
  // 13 segmentów, wszystkie ~70, jeden segment wyraźnie niżej (deficyt
  // statystyczny: mediana ~70, ten segment np. 30 -> spełnia oba warunki).
  const base: Record<string, number> = {
    moc: 70, wytrzymalosc: 72, fizycznosc: 71, techFund: 69, techSpec: 70,
    tolerancja: 68, regeneracja: 71, odpornosc: 70, odzywianie: 69,
    koncentracja: 70, mental: 71, percepcja: 70, decyzja: 70,
  };
  base[deficitSeg] = 30;
  return base;
}

// --- Scenariusz 1: cel = position-critical deficyt w TYM SAMYM segmencie
// (powinno wybrać ten segment, źródło 'deficit' -- sprawdza że kolejność
// priorytetu działa, nie tylko że coś się wybiera). ---
{
  const ctx: PlayerMatchSelectionContext = {
    profilePosition: OBRONCA,
    latestScores: scoresWithDeficit('percepcja'), // percepcja = tier 'key' dla obrońcy środkowego
    activeGoalSegmentId: 'percepcja',
    segmentLastAskedAt: {},
    enteredRecoveryState: 'entered_fresh',
  };
  const result = selectSegmentForMatch(ctx);
  check(
    'Scenariusz 1: cel = position-critical deficyt w tym samym segmencie',
    !!result && result.segmentId === 'percepcja' && result.selectionSource === 'deficit',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 2: cel RÓŻNY od najgroźniejszego deficytu (powinno wybrać
// deficyt position-critical, NIE cel). ---
{
  const ctx: PlayerMatchSelectionContext = {
    profilePosition: OBRONCA,
    latestScores: scoresWithDeficit('fizycznosc'), // fizycznosc też tier 'key' dla obrońcy
    activeGoalSegmentId: 'techSpec', // cel zupełnie inny, nie jest deficytem ani position-critical
    segmentLastAskedAt: {},
    enteredRecoveryState: 'entered_fresh',
  };
  const result = selectSegmentForMatch(ctx);
  check(
    'Scenariusz 2: cel różny od najgroźniejszego deficytu -> wygrywa deficyt position-critical',
    !!result && result.segmentId === 'fizycznosc' && result.selectionSource === 'deficit',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 3: bez diagnozy i bez celu -> spada do rotacji. ---
{
  const ctx: PlayerMatchSelectionContext = {
    profilePosition: null,
    latestScores: null,
    activeGoalSegmentId: null,
    segmentLastAskedAt: { moc: '2026-07-01T00:00:00Z' }, // wszystko poza 'moc' nigdy nie pytane
    enteredRecoveryState: 'uncertain',
  };
  const result = selectSegmentForMatch(ctx);
  check(
    'Scenariusz 3: brak diagnozy i celu -> rotacja',
    !!result && result.selectionSource === 'rotation' && result.segmentId !== 'moc',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 4: entered_recovery_state='entered_fresh' + regeneracja
// byłaby priorytetem -> powinno pominąć regenerację. ---
{
  // Bramkarz ma regeneracja='important' (nie 'key'), więc żeby regeneracja
  // w ogóle mogła być "priorytetem", trzeba by ją sztucznie postawić przez
  // rotację (bo source 1/4 wymaga tier 'key', a regeneracja nigdzie nie ma
  // tier 'key'). Test więc sprawdza to poprzez rotację: regeneracja
  // najdawniej pytana, ale entered_fresh -> powinna być pominięta mimo że
  // rotacja normalnie by ją wybrała.
  const ctx: PlayerMatchSelectionContext = {
    profilePosition: null,
    latestScores: null,
    activeGoalSegmentId: null,
    segmentLastAskedAt: {
      moc: '2026-07-20T00:00:00Z', wytrzymalosc: '2026-07-20T00:00:00Z',
      fizycznosc: '2026-07-20T00:00:00Z', techFund: '2026-07-20T00:00:00Z',
      techSpec: '2026-07-20T00:00:00Z', tolerancja: '2026-07-20T00:00:00Z',
      odpornosc: '2026-07-20T00:00:00Z', odzywianie: '2026-07-20T00:00:00Z',
      koncentracja: '2026-07-20T00:00:00Z', mental: '2026-07-20T00:00:00Z',
      percepcja: '2026-07-20T00:00:00Z', decyzja: '2026-07-20T00:00:00Z',
      // regeneracja celowo BEZ wpisu = "nigdy pytane" = najdawniej z wszystkich
    },
    enteredRecoveryState: 'entered_fresh',
  };
  const result = selectSegmentForMatch(ctx);
  check(
    'Scenariusz 4: entered_fresh -> regeneracja pominięta mimo że rotacja by ją wybrała',
    !!result && result.segmentId !== 'regeneracja',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 5: drugie pytanie w tym samym meczu -> wyklucza segment
// już wybrany jako pierwsze. ---
{
  const ctx: PlayerMatchSelectionContext = {
    profilePosition: OBRONCA,
    latestScores: { ...scoresWithDeficit('percepcja'), decyzja: 30 }, // dwa deficyty position-critical
    activeGoalSegmentId: null,
    segmentLastAskedAt: {},
    enteredRecoveryState: 'entered_fresh',
  };
  const first = selectSegmentForMatch(ctx);
  const second = selectSegmentForMatch(ctx, first ? [first.segmentId] : []);
  check(
    'Scenariusz 5: drugie pytanie wyklucza pierwsze',
    !!first && !!second && first.segmentId !== second.segmentId,
    `pierwsze=${JSON.stringify(first)} drugie=${JSON.stringify(second)}`
  );
}

console.log(`\n${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) process.exit(1);
