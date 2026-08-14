// ZAPIS B7 08.08.2026 — asercje logiki „dziennik zasila wskaźnik Celu".
// Uruchomienie: npx tsx lib/focusBlockJournalLink.selftest.ts

import {
  pickBlockSessionToConfirm,
  blockSessionQuestion,
  journalSavedMessage,
  BLOCK_LINK_YES_LABEL,
  BLOCK_LINK_NO_LABEL,
  type LinkableCalendarEvent,
  decideSessionCompletion,
  completionFailureLog,
  completionNoRowsLog,
} from './focusBlockJournalLink';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// ═══════════════════════════════════════════════════════════════════════
// PLAN-D-A1 08.2026 — STRAŻNIK ZNACZNIKA WYKONANIA I WARUNKU PYTANIA
// ═══════════════════════════════════════════════════════════════════════

// ── (5) WARUNEK PYTANIA NIE MOŻE DOPUŚCIĆ SESJI Z PRZYSZŁOŚCI.
//        To było jawnie zakazane w kontrakcie Dziennika („pytanie »czy zrobiłeś
//        jutrzejszy trening« podważałoby zaufanie do całego dziennika") i nie
//        wolno tego zgubić przy naprawie. Asercja na REGUŁĘ: dla dowolnego
//        przesunięcia w przód wynik ma być pusty.
{
  const przod = ['2026-08-09', '2026-08-10', '2026-08-15', '2026-09-01', '2027-01-01'];
  for (const d of przod) {
    check(`sesja z przyszłości (${d}) → NIGDY pytania`,
      pickBlockSessionToConfirm([ev(1, d, 'fb-1')], TODAY) === null,
      'pytanie o sesję, która się jeszcze nie odbyła');
  }
  check('sesja z przyszłości nie wygrywa nawet obok sesji z dziś',
    pickBlockSessionToConfirm([ev(7, '2026-08-20', 'fb-1'), ev(3, TODAY, 'fb-1')], TODAY)?.id === 3,
    'wybrało sesję z przyszłości');
  // Ta sama reguła czytana z kodu — żeby porównanie dat nie zniknęło po cichu.
  {
    const tu = dirname(fileURLToPath(import.meta.url));
    const zrodlo = readFileSync(join(tu, 'focusBlockJournalLink.ts'), 'utf8');
    check('kod nadal odcina przyszłość porównaniem scheduled_date <= dziś',
      /scheduled_date\s*<=\s*todayStr/.test(zrodlo), 'zniknął warunek odcinający przyszłość');
  }
}

// ── ZNACZNIK: decyzja jest POCHODNĄ powiązania, nie drugim torem ────────
{
  const opcje = [
    { id: 11, focusBlockId: 'fb-1' },
    { id: 12, focusBlockId: null },
  ];
  const d1 = decideSessionCompletion({ entryType: 'post_training', calendarLinkId: '11', options: opcje });
  check('wpis potreningowy powiązany z sesją Bloku → oznacz to wydarzenie',
    d1.oznacz === true && d1.eventId === 11, JSON.stringify(d1));

  const d2 = decideSessionCompletion({ entryType: 'morning', calendarLinkId: '11', options: opcje });
  check('wpis poranny NIGDY nie stawia znacznika',
    d2.oznacz === false && d2.powod === 'wpis-poranny', JSON.stringify(d2));

  const d3 = decideSessionCompletion({ entryType: 'post_training', calendarLinkId: '', options: opcje });
  check('bez powiązania nie ma czego oznaczać',
    d3.oznacz === false && d3.powod === 'brak-powiazania', JSON.stringify(d3));

  const d4 = decideSessionCompletion({ entryType: 'post_training', calendarLinkId: '12', options: opcje });
  check('wydarzenie spoza Bloku → bez znacznika (znacznik odpowiada licznikowi)',
    d4.oznacz === false && d4.powod === 'wydarzenie-spoza-bloku', JSON.stringify(d4));

  const d5 = decideSessionCompletion({ entryType: 'post_training', calendarLinkId: '99', options: opcje });
  check('powiązanie do wydarzenia spoza okna → bez znacznika, nie wyjątek',
    d5.oznacz === false, JSON.stringify(d5));
}

// ── PORAŻKA ZNACZNIKA MA BYĆ WIDOCZNA I MA MÓWIĆ, ŻE LICZNIK JEST CAŁY ──
{
  const l1 = completionFailureLog(11, 'kod 23514');
  check('ślad porażki niesie id wydarzenia i powód',
    l1.includes('11') && l1.includes('23514'), l1);
  check('ślad porażki mówi wprost, że licznik nie ucierpiał',
    /licznik/i.test(l1) && /calendar_event_id/.test(l1), l1);
  const l2 = completionNoRowsLog(11);
  check('„zero dotkniętych wierszy" ma własny ślad (cichy brak przez RLS)',
    /ani jednego wiersza/i.test(l2) && /RLS/.test(l2), l2);
}

// Pomiar OSOBNYM logiem (zasada 14): ile dotknięć kosztuje zaliczenie sesji.
console.log('[pomiar] Zaliczenie sesji Bloku z dziennika: 1 dotknięcie (było: otwórz picker → znajdź wydarzenie → wybierz = 3+).');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
