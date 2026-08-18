// PLAN-D-A1 08.2026 (18.08.2026) — NOWY PLIK. STRAŻNIK ŚCIEŻKI „+" (A5).
//
// ⭐ CO TEN STRAŻNIK MA UDOWODNIĆ, zdanie po zdaniu:
//   „dodanie z datą przeszłą, przy której są nieocenione pozycje planu,
//    NIE TWORZY nowego `calendar_events`, dopóki zawodnik nie powie »nie«".
//
// ⛔ DLACZEGO TO JEST BEZPIECZEŃSTWO DANYCH, A NIE WYGODA. `kalendarz.tsx:523`
// robi czysty `insert` bez ani jednego sprawdzenia. Duplikat, który stąd
// powstaje, nie jest brzydki — on FAŁSZUJE RACHUNEK: mianownik licznika pracy
// rośnie o jeden, a tydzień pokazuje „nie wiemy" o dniu, o którym zawodnik
// przed chwilą powiedział wszystko.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  sprawdzPrzedDodaniem, wolnoUtworzycWydarzenie,
  KOLIZJA_PYTANIE, KOLIZJA_PRZYPIS, KOLIZJA_INNA_RZECZ,
  type PozycjaBezOceny,
} from './dodanieWstecz';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let bledy = 0; let ok = 0;
function check(nazwa: string, warunek: boolean, szczegol = '') {
  if (warunek) { ok += 1; console.log(`OK   - ${nazwa}`); }
  else { bledy += 1; console.log(`FAIL - ${nazwa}${szczegol ? ': ' + szczegol : ''}`); }
}

const POZ: PozycjaBezOceny[] = [
  { idWydarzenia: 41, tytul: 'Trening klubowy', godzina: '18:00' },
  { idWydarzenia: 42, tytul: 'Sesja Bloku: Moc', godzina: null },
];
const DZIS = '2026-08-18';
const WCZORAJ = '2026-08-17';

// ═════════════════════════════════════════════════════════════════════
// 1. TRZY STANY, NIE DWA (R5)
// ═════════════════════════════════════════════════════════════════════
const pytamy = sprawdzPrzedDodaniem({ data: WCZORAJ, dzis: DZIS, nieocenione: POZ });
check('⭐ (A5) data minęła + nieocenione rzeczy → PYTAMY',
  pytamy.rodzaj === 'pytamy', pytamy.rodzaj);

const pusto = sprawdzPrzedDodaniem({ data: WCZORAJ, dzis: DZIS, nieocenione: [] });
check('⭐ (A5) data minęła, plan sprawdzony i PUSTY → wolno dodać od razu',
  pusto.rodzaj === 'wolno_dodac', pusto.rodzaj);

const nieWiemy = sprawdzPrzedDodaniem({ data: WCZORAJ, dzis: DZIS, nieocenione: null });
check('⛔ (A5, R5) NIEUDANY ODCZYT to TRZECI STAN, a nie „pusty plan"',
  nieWiemy.rodzaj === 'nie_wiemy', nieWiemy.rodzaj);
check('⛔ (A5, R5) „pusto" i „nie wiemy" oddają RÓŻNE stany — bez tego awaria '
  + 'odczytu udaje wiedzę (Z0)',
  pusto.rodzaj !== nieWiemy.rodzaj);

// ⛔ CZWARTA DROGA DO „NIE WIEMY": nie znamy nawet DNIA. Wchodzi tędy awaria
// odczytu pytań o wystąpienia — skoro nie wiemy, o co pytać, to nie wiemy też,
// o który dzień. ⛔ To NIE JEST „dziś" (R5).
const bezDnia = sprawdzPrzedDodaniem({ data: null, dzis: DZIS, nieocenione: null });
check('⛔ (A5, R5) nieznany DZIEŃ to „nie wiemy", a nie „dziś"',
  bezDnia.rodzaj === 'nie_wiemy', bezDnia.rodzaj);
check('⛔ (Z0) i powód mówi WPROST, czego nie wiemy',
  /nie wiemy, którego dnia/.test(bezDnia.powod), bezDnia.powod);
check('⛔ (A5) nieznany dzień PRZEPUSZCZA dodanie — awaria po naszej stronie '
  + 'nie może zjeść wpisu zawodnika',
  wolnoUtworzycWydarzenie(bezDnia, { rodzaj: 'brak_odpowiedzi' }).wolno === true);

const dzisiaj = sprawdzPrzedDodaniem({ data: DZIS, dzis: DZIS, nieocenione: POZ });
check('⛔ (A5) DZIŚ nie pyta o nic — rzecz, która nie minęła, nie ma jak być duplikatem',
  dzisiaj.rodzaj === 'wolno_dodac', dzisiaj.rodzaj);
const jutro = sprawdzPrzedDodaniem({ data: '2026-08-19', dzis: DZIS, nieocenione: POZ });
check('⛔ (A5) PRZYSZŁOŚĆ nie pyta o nic — pytanie bez treści jest przeszkodą, '
  + 'a nie zabezpieczeniem',
  jutro.rodzaj === 'wolno_dodac', jutro.rodzaj);

check('⛔ (Z0) każdy stan niesie POWÓD — stan bez powodu jest werdyktem bez uzasadnienia',
  [pytamy, pusto, nieWiemy, dzisiaj, jutro].every((s) => s.powod.length > 20));

// ═════════════════════════════════════════════════════════════════════
// 2. ⭐⭐ BRAMKA — SEDNO A5
// ═════════════════════════════════════════════════════════════════════
check('⭐⭐ (A5) ⛔ BEZ ODPOWIEDZI NOWE WYDARZENIE NIE POWSTAJE',
  wolnoUtworzycWydarzenie(pytamy, { rodzaj: 'brak_odpowiedzi' }).wolno === false);

check('⭐⭐ (A5) ⛔ „to było to" NIE TWORZY drugiego wiersza — oceniamy ten z planu',
  wolnoUtworzycWydarzenie(pytamy, { rodzaj: 'to_bylo_to', idWydarzenia: 41 }).wolno === false);

check('⭐⭐ (A5) dopiero „nie, to była inna rzecz" otwiera tworzenie wydarzenia',
  wolnoUtworzycWydarzenie(pytamy, { rodzaj: 'inna_rzecz' }).wolno === true);

check('⭐ (A5) przy pustym planie „+" nie stawia zawodnikowi ani jednego pytania',
  wolnoUtworzycWydarzenie(pusto, { rodzaj: 'brak_odpowiedzi' }).wolno === true);

// ⛔ DECYZJA WYPOWIEDZIANA WPROST, a nie ukryta w gałęzi.
check('⛔ (A5) `nie_wiemy` PRZEPUSZCZA — awaria odczytu po NASZEJ stronie nie może '
  + 'zjeść wpisu zawodnika',
  wolnoUtworzycWydarzenie(nieWiemy, { rodzaj: 'brak_odpowiedzi' }).wolno === true);
check('⛔ (Z0) przepuszczenie przy `nie_wiemy` MÓWI, dlaczego przepuszcza',
  /awaria odczytu/.test(wolnoUtworzycWydarzenie(nieWiemy, { rodzaj: 'brak_odpowiedzi' }).powod));

check('⛔ (Z0) odmowa utworzenia NAZYWA POZYCJĘ, którą wskazał zawodnik',
  /41/.test(wolnoUtworzycWydarzenie(pytamy, { rodzaj: 'to_bylo_to', idWydarzenia: 41 }).powod));

// ⭐ DWA TRENINGI TEGO SAMEGO DNIA Z TEGO SAMEGO ŹRÓDŁA — NIE POWSTAJĄ.
// Symulacja pełnej ścieżki: licznik wierszy przed i po.
{
  let wierszy = POZ.length;
  const stan = sprawdzPrzedDodaniem({ data: WCZORAJ, dzis: DZIS, nieocenione: POZ });
  for (const odp of [{ rodzaj: 'brak_odpowiedzi' } as const,
    { rodzaj: 'to_bylo_to', idWydarzenia: 41 } as const]) {
    if (wolnoUtworzycWydarzenie(stan, odp).wolno) wierszy += 1;
  }
  check('⭐⭐ (A5) PRZEBIEG: dwa treningi tego samego dnia z tego samego źródła '
    + 'NIE POWSTAJĄ — liczba wierszy się nie zmienia',
    wierszy === POZ.length, `wierszy ${wierszy}, było ${POZ.length}`);
  if (wolnoUtworzycWydarzenie(stan, { rodzaj: 'inna_rzecz' }).wolno) wierszy += 1;
  check('⭐ (A5) PRZEBIEG: po „nie, to była inna rzecz" wiersz POWSTAJE — '
    + 'bramka nie jest ścianą',
    wierszy === POZ.length + 1, `wierszy ${wierszy}`);
}

// ═════════════════════════════════════════════════════════════════════
// 3. BRZMIENIA
// ═════════════════════════════════════════════════════════════════════
check('⛔ liczebnik odmienia MODUŁ, a nie ternary wpisany na ekranie',
  KOLIZJA_PYTANIE(1).includes('1 rzecz b') && KOLIZJA_PYTANIE(3).includes('3 rzeczy b'),
  `${KOLIZJA_PYTANIE(1)} / ${KOLIZJA_PYTANIE(3)}`);
check('⭐ przypis mówi WPROST, kiedy powstaje nowe wydarzenie',
  /po „nie"/.test(KOLIZJA_PRZYPIS));
const ZAKAZANE = [/\bseri[ai]\b/i, /z rzędu/i, /\bgratul/i, /lepiej niż/i, /\bpowinieneś\b/i];
const zdania = [KOLIZJA_PYTANIE(2), KOLIZJA_PRZYPIS, KOLIZJA_INNA_RZECZ].join(' ');
check('⛔ (N1, N3) brzmienia ścieżki „+" nie liczą serii, nie chwalą i nie każą',
  !ZAKAZANE.some((w) => w.test(zdania)));

// ═════════════════════════════════════════════════════════════════════
// 4. ⭐ EKRAN NAPRAWDĘ TĘDY CHODZI
// ═════════════════════════════════════════════════════════════════════
const ekran = readFileSync(join(root, 'app', '(tabs)', 'dzis.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
check('⭐⛔ (A5) ekran „Dziś" WOŁA bramkę, a nie tylko ją importuje',
  /wolnoUtworzycWydarzenie\(/.test(ekran), 'bramka zbudowana i nieużyta');
check('⭐⛔ (A5) ekran WOŁA `sprawdzPrzedDodaniem` — inaczej bramka nie ma czego pilnować',
  /sprawdzPrzedDodaniem\(\{/.test(ekran));
check('⭐⛔ (A5) przycisk „+" jest na ekranie i otwiera arkusz, a nie trasę',
  /rodzaj: 'plus'/.test(ekran) && /styles\.fab/.test(ekran));
check('⭐⛔ (A5) ekran bierze DZIEŃ Z REGUŁY (`kiedy`), a nie z własnej arytmetyki dat — '
  + 'druga kopia okna „wczoraj i dziś" rozjechałaby się z pierwszą po cichu',
  /p\.kiedy === 'wczoraj'/.test(ekran)
  && !/setDate\(/.test(ekran) && !/new Date\(r, m - 1, d\)/.test(ekran),
  'ekran liczy datę sam');

check('⛔ (A5) ścieżka do kalendarza prowadzi PRZEZ bramkę — `router.push` stoi '
  + 'w `przejdzDoDodania`, nie obok niej',
  /if \(!brama\.wolno\) return;\s*\n\s*setArkusz\(null\);\s*\n\s*router\.push\('\/kalendarz'\);/.test(ekran),
  'obejście bramki');

// ⛔ PODSUMOWANIE W KSZTAŁCIE, KTÓRY CZYTA `tests/run-selftests.mjs`.
// Bez tej linii runner nie odróżnia strażnika, który wszystko sprawdził,
// od takiego, który nie uruchomił ani jednej asercji (znalezisko H1, O76).
console.log(`\n${ok} passed, ${bledy} failed`);
if (bledy > 0) throw new Error(`${bledy} asercji nie przeszło`);
