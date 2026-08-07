// JEDNA DROGA B2 08.08.2026 — weryfikacja wskaźnika pracy w hero Celu
// (lib/focusBlockProgress.ts). Czysta logika, bez Supabase/RN, uruchamiana
// lokalnie poza appką:
//
//   npx tsx lib/focusBlockProgress.selftest.ts
//
// (jeśli brak `tsx` w projekcie: `npm install --no-save tsx`, potem to samo
// polecenie). Ten sam wzorzec co lib/goal-prominence.selftest.ts.
// Uruchom ponownie po każdej zmianie w lib/focusBlockProgress.ts.
import { computeFocusBlockProgress } from './focusBlockProgress';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

const BLOCK = { id: 'fb-1', segment_id: 'moc' };
const OTHER_BLOCK = { id: 'fb-2', segment_id: 'regeneracja' };
const ev = (id: number, fb: string | null) => ({ id, focus_block_id: fb });

// Sesje Bloku wymieszane z wydarzeniami niezwiązanymi z Blokiem (trening
// klubowy, mecz) — dokładnie to, co przyjdzie z zapytania w dzis.tsx.
const EVENTS = [
  ev(1, 'fb-1'), ev(2, 'fb-1'), ev(3, 'fb-1'),
  ev(4, 'fb-1'), ev(5, 'fb-1'), ev(6, 'fb-1'),
  ev(90, null), ev(91, null),
  ev(50, 'fb-2'), ev(51, 'fb-2'),
];

{
  const r = computeFocusBlockProgress({
    goalSegmentId: 'moc', activeBlocks: [BLOCK], scheduledEvents: EVENTS,
    doneEventIds: new Set([1, 2, 3, 90]), // 90 to wydarzenie spoza Bloku — nie może się liczyć
  });
  check('3 z 6 — wydarzenia spoza Bloku nie wpadają do licznika',
    r?.done === 3 && r?.total === 6, JSON.stringify(r));
}

{
  const r = computeFocusBlockProgress({
    goalSegmentId: 'moc', activeBlocks: [BLOCK], scheduledEvents: EVENTS, doneEventIds: new Set(),
  });
  check('0 z 6 — zaplanowane, nic nie zrobione', r?.done === 0 && r?.total === 6, JSON.stringify(r));
}

{
  const r = computeFocusBlockProgress({
    goalSegmentId: 'moc', activeBlocks: [BLOCK], scheduledEvents: EVENTS,
    doneEventIds: new Set([1, 2, 3, 4, 5, 6]),
  });
  check('6 z 6 — Blok wyrobiony', r?.done === 6 && r?.total === 6, JSON.stringify(r));
}

{
  // Zawodnik ma aktywny Blok, ale w INNYM filarze niż jego Cel.
  const r = computeFocusBlockProgress({
    goalSegmentId: 'moc', activeBlocks: [OTHER_BLOCK], scheduledEvents: EVENTS, doneEventIds: new Set([50]),
  });
  check('null — Blok istnieje, ale nie pod ten Cel (żadnej cudzej liczby)', r === null, JSON.stringify(r));
}

{
  const r = computeFocusBlockProgress({
    goalSegmentId: 'moc', activeBlocks: [], scheduledEvents: EVENTS, doneEventIds: new Set(),
  });
  check('null — brak aktywnego Bloku', r === null, JSON.stringify(r));
}

{
  const r = computeFocusBlockProgress({
    goalSegmentId: null, activeBlocks: [BLOCK], scheduledEvents: EVENTS, doneEventIds: new Set([1]),
  });
  check('null — brak Celu', r === null, JSON.stringify(r));
}

{
  // Blok jest, ale ani jednej sesji w kalendarzu (np. wszystkie anulowane —
  // zapytanie w dzis.tsx bierze wyłącznie status='scheduled').
  const r = computeFocusBlockProgress({
    goalSegmentId: 'moc', activeBlocks: [BLOCK],
    scheduledEvents: [ev(90, null), ev(50, 'fb-2')], doneEventIds: new Set(),
  });
  check('null — Blok bez ani jednej sesji (nie pokazujemy „0 z 0")', r === null, JSON.stringify(r));
}

{
  // Dwa aktywne Bloki w różnych filarach — wybieramy ten pod Cel.
  const r = computeFocusBlockProgress({
    goalSegmentId: 'regeneracja', activeBlocks: [BLOCK, OTHER_BLOCK],
    scheduledEvents: EVENTS, doneEventIds: new Set([50, 1, 2, 3]),
  });
  check('1 z 2 — właściwy Blok przy dwóch aktywnych', r?.done === 1 && r?.total === 2, JSON.stringify(r));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
