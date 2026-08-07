// ZAPIS B7 08.08.2026 — asercje logiki „dziennik zasila wskaźnik Celu".
// Uruchomienie: npx tsx lib/focusBlockJournalLink.selftest.ts

import {
  pickBlockSessionToConfirm,
  blockSessionQuestion,
  journalSavedMessage,
  BLOCK_LINK_YES_LABEL,
  BLOCK_LINK_NO_LABEL,
  type LinkableCalendarEvent,
} from './focusBlockJournalLink';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.error(`FAIL - ${label}\n       ${detail}`); }
}

const TODAY = '2026-08-08';
const ev = (id: number, date: string, blockId: string | null, title = 'Blok Skupienia: skoki (20 min)'): LinkableCalendarEvent =>
  ({ id, scheduled_date: date, title, focus_block_id: blockId });

// ── wybór sesji ──────────────────────────────────────────────
check('bez żadnych wydarzeń → brak pytania (dziennik wygląda jak wczoraj)',
  pickBlockSessionToConfirm([], TODAY) === null, 'pytanie z powietrza');
check('same wydarzenia spoza Bloku → brak pytania (od nich jest ręczny picker)',
  pickBlockSessionToConfirm([ev(1, TODAY, null, 'Mecz ligowy')], TODAY) === null, 'pytanie o nie-sesję');
check('sesja Bloku DZIŚ → pytanie o nią',
  pickBlockSessionToConfirm([ev(1, TODAY, 'fb-1')], TODAY)?.id === 1, 'nie wybrało dzisiejszej');
check('sesja Bloku tylko WCZORAJ → pytanie o wczorajszą (wpis po wczorajszym treningu jest realny)',
  pickBlockSessionToConfirm([ev(2, '2026-08-07', 'fb-1')], TODAY)?.id === 2, 'nie wybrało wczorajszej');
check('dziś wygrywa z wczoraj',
  pickBlockSessionToConfirm([ev(2, '2026-08-07', 'fb-1'), ev(3, TODAY, 'fb-1')], TODAY)?.id === 3, 'wczoraj wygrało');
check('sesja z JUTRA nigdy nie dostaje pytania — nawet gdy jest jedyna',
  pickBlockSessionToConfirm([ev(4, '2026-08-09', 'fb-1')], TODAY) === null,
  'pytanie „czy zrobiłeś jutrzejszy trening" podważa zaufanie do dziennika');
check('miks: jutrzejsza sesja Bloku + dzisiejszy mecz + wczorajsza sesja Bloku → wczorajsza',
  pickBlockSessionToConfirm([ev(4, '2026-08-09', 'fb-1'), ev(1, TODAY, null, 'Mecz'), ev(2, '2026-08-07', 'fb-1')], TODAY)?.id === 2,
  'zły wybór');
check('dwie sesje tego samego dnia → deterministycznie pierwsza (mniejsze id)',
  pickBlockSessionToConfirm([ev(9, TODAY, 'fb-1'), ev(5, TODAY, 'fb-2')], TODAY)?.id === 5, 'niedeterministyczne');

// ── brzmienia (test 15-latka: krótko, zero oceniania) ────────
check('pytanie o dzisiejszą sesję mówi „ten trening"',
  blockSessionQuestion(ev(1, TODAY, 'fb-1'), TODAY).includes('ten trening'), blockSessionQuestion(ev(1, TODAY, 'fb-1'), TODAY));
check('pytanie o wcześniejszą sesję mówi o „ostatnich dniach"',
  blockSessionQuestion(ev(1, '2026-08-07', 'fb-1'), TODAY).includes('ostatnich dni'), '');
check('„Nie" jest równie dobrą odpowiedzią — bez „niestety", bez wykrzykników',
  BLOCK_LINK_NO_LABEL === 'Nie' && !BLOCK_LINK_YES_LABEL.includes('!'), BLOCK_LINK_NO_LABEL);
check('komunikat po zaliczeniu sesji mówi WPROST, że pasek Celu się przesunął (zasada 4: oddajemy)',
  journalSavedMessage(true).includes('paska Twojego Celu'), journalSavedMessage(true));
check('zwykły zapis brzmi jak dotąd — co do znaku',
  journalSavedMessage(false) === 'Zapisano.', journalSavedMessage(false));

// Pomiar OSOBNYM logiem (zasada 14): ile dotknięć kosztuje zaliczenie sesji.
console.log('[pomiar] Zaliczenie sesji Bloku z dziennika: 1 dotknięcie (było: otwórz picker → znajdź wydarzenie → wybierz = 3+).');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
