// PLAN-D-F 08.2026 (12.08.2026) — TEN PLIK ZMIENIŁ ZADANIE.
//
// DO 12.08.2026 stało tu 90 asercji sprawdzających drabinę arbitra. Drabina
// wyprowadziła się do `gamechange-app/lib/arbiter-glosu.js` (patrz nagłówek
// `lib/arbiterGlosu.ts`), a te 90 asercji poszło razem z nią i żyje w
// `gamechange-app/tests/test-arbiter-glosu.js` — gdzie urosło do 101.
// Ani jedna nie została skasowana; są w innym repozytorium.
//
// TERAZ TEN PLIK PILNUJE JEDNEJ RZECZY: żeby drabina NIE WRÓCIŁA TU PO CICHU.
// Dwie kopie tej samej drabiny to defekt, którego nie widać: obie mają zielone
// testy i obie odpowiadają — tylko czasem różnie. Ten strażnik czyta WŁASNY
// katalog i zapala się, gdy w appce pojawi się cokolwiek, co rozstrzyga
// o głosie tygodnia.
//
//   npx tsx lib/arbiterGlosu.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZRODLO_DRABINY, WARSTWA_EKRANU, type Voice } from './arbiterGlosu';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

const libDir = dirname(fileURLToPath(import.meta.url));

function bezKomentarzy(zrodlo: string): string {
  return zrodlo
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/(^|\s)\/\/.*$/, '$1'))
    .join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// 1. TEN PLIK NIE ZAWIERA JUŻ DRABINY
// ═══════════════════════════════════════════════════════════════════
const arbiter = bezKomentarzy(readFileSync(join(libDir, 'arbiterGlosu.ts'), 'utf8'));

for (const slad of ['rozstrzygnijGlos', 'DRABINA', 'REFRAKCJE', 'PRIORYTET', 'PROG_TEMPA_CM_ROK',
  'ocenOslone', 'refrakcjaMinela', 'przeliczWSrodkuTygodnia', 'policzBudzet', 'odezwanieMiesieczne']) {
  check(`arbiterGlosu.ts nie zawiera już „${slad}"`, !arbiter.includes(slad), slad);
}
check('arbiterGlosu.ts nie ma ŻADNEJ funkcji — sam typ i dwie stałe',
  !/\bfunction\b/.test(arbiter) && !/=>/.test(arbiter), arbiter.slice(0, 200));
check('arbiterGlosu.ts wskazuje, gdzie mieszka drabina',
  ZRODLO_DRABINY === 'gamechange-app/lib/arbiter-glosu.js', ZRODLO_DRABINY);
check('…i gdzie mieszka warstwa ekranu', WARSTWA_EKRANU === 'lib/glosTygodnia.ts', WARSTWA_EKRANU);

// Typ nadal jest kontraktem danych i musi mieć wszystkie siedem wartości
// z CHECK-u w bazie — inaczej appka nie umiałaby nazwać tego, co odczyta.
{
  const siedem: Voice[] = ['exit', 'injury', 'growth', 'compass', 'calibration', 'block', 'silence'];
  check('typ Voice ma wszystkie siedem wartości z CHECK-u bazy', siedem.length === 7, JSON.stringify(siedem));
  for (const v of siedem) {
    check(`…w tym „${v}"`, arbiter.includes(`'${v}'`), v);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 2. DRABINA NIE WRÓCIŁA POD INNĄ NAZWĄ, NIGDZIE W lib/
// ═══════════════════════════════════════════════════════════════════
// Sygnatury dobrane tak, żeby łapały ODTWORZENIE drabiny, a nie samo słowo:
// próg 7,2 cm/rok i zbiór refrakcji są w niej jedyne w swoim rodzaju.
{
  const pliki = readdirSync(libDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.selftest.ts'));
  const podejrzane: string[] = [];
  for (const f of pliki) {
    const t = bezKomentarzy(readFileSync(join(libDir, f), 'utf8'));
    if (/7\.2/.test(t) && /cm/i.test(t)) podejrzane.push(`${f}: próg tempa wzrostu`);
    if (/refrakcj/i.test(t) && /=/.test(t) && !/glosTygodnia/.test(f)) podejrzane.push(`${f}: refrakcje`);
    if (/rozstrzygnijGlos/.test(t)) podejrzane.push(`${f}: rozstrzyganie głosu`);
  }
  check('żaden plik w lib/ nie odtwarza drabiny arbitra',
    podejrzane.length === 0, podejrzane.join('; '));
  check('sprawdzono WSZYSTKIE pliki lib/*.ts, nie próbkę (licznik wypisany, nie obiecany)',
    pliki.length >= 20, `plików sprawdzonych: ${pliki.length}`);
}

// ═══════════════════════════════════════════════════════════════════
// 3. APPKA CZYTA WYNIK, A NIE LICZY GO SAMA
// ═══════════════════════════════════════════════════════════════════
{
  const ekran = bezKomentarzy(readFileSync(join(libDir, 'glosTygodnia.ts'), 'utf8'));
  check('warstwa ekranu istnieje i zna tabelę weekly_voice',
    ekran.length > 500 && /week_start/.test(ekran), String(ekran.length));
  check('…i NIE liczy drabiny sama',
    !/DRABINA|refrakcjaMinela|rozstrzygnijGlos|7\.2/.test(ekran), 'warstwa ekranu');
  check('…i nie czyta zegara bez parametru (E-N2)',
    !/new\s+Date\s*\(\s*\)/.test(ekran) && !/Date\.now\s*\(/.test(ekran), 'zegar w glosTygodnia.ts');
}

console.log(`\n${passed} passed, ${failed} failed`);
// Celowo `throw`, a nie `process.exit(1)`: `process` wymaga `@types/node`,
// których tsconfig appki nie zaciąga — a te pliki są objęte `npx tsc --noEmit`.
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
