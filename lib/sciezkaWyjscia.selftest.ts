// PLAN-D-H 08.2026 (12.08.2026) — NOWY PLIK.
//
//   npx tsx lib/sciezkaWyjscia.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// PO CO TO ISTNIEJE. Ścieżka wyjścia jest jedynym stanem produktu, w którym
// błąd nie kończy się brzydkim ekranem. Trzy rzeczy, które da się tu zepsuć
// po cichu i których nie widać w przeglądzie kodu:
//   • nazwa zdarzenia skrócona przy przepisywaniu — czytnik arbitra
//     przestaje ją rozpoznawać i Kompas milczy, choć wszystko „działa";
//   • sklejenie „nie odczytałem" z „wyłączona" — zawodnik w ścieżce wyjścia
//     dostaje przycisk „Włącz" i wygląda to, jakby nic się nie stało;
//   • dołożenie stanowi terminu ważności — stan kończy się wtedy, gdy
//     zawodnik przestaje pisać, czyli dokładnie wtedy, gdy jest mu najgorzej
//     (to jest reguła A3 złamana w tym projekcie już raz).
//
// ⚠️ CZEGO TEN PLIK NIE SPRAWDZA: niczego o drabinie arbitra. Kto mówi
// w danym tygodniu, rozstrzyga `gamechange-app/lib/arbiter-glosu.js`.
// Przebieg 52 tygodni przez PRAWDZIWY czytnik i PRAWDZIWĄ drabinę siedzi
// w `gamechange-app/tests/test-sciezka-wyjscia-52-tygodnie.js`.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  stanSciezki,
  wierszWlaczenia,
  patchWylaczenia,
  RODZAJE_ZDARZEN,
  ZDARZENIE_DESELEKCJA,
  ZDARZENIE_ZMIANA,
  STAN_AKTYWNA,
  STAN_ZAMKNIETA,
  KOLUMNY_WYJSCIA,
  WYJSCIE_ODPOWIEDZI,
  WYJSCIE_CO_SIE_ZMIENI,
  WYJSCIE_LICZBY,
  WYJSCIE_NA_JUTRO,
  WYJSCIE_WLACZONA_TRESC,
  WYJSCIE_WEJSCIE_PODPIS,
  WYJSCIE_PYTANIE_PODPIS,
  WYJSCIE_WYLACZ_PODPIS,
  WYJSCIE_NIE_WIEM,
  type WierszWyjscia,
} from './sciezkaWyjscia';

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

const TERAZ = new Date('2026-08-12T18:30:00.000Z');

function wiersz(nadpisz: Partial<WierszWyjscia> = {}): WierszWyjscia {
  return {
    id: 'e1',
    state: STAN_AKTYWNA,
    event_kind: ZDARZENIE_DESELEKCJA,
    event_at: '2026-08-12T18:30:00.000Z',
    opened_at: '2026-08-12T18:30:00.000Z',
    closed_at: null,
    ...nadpisz,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 1. KONTRAKT NAZW — skrót nie rzuca błędem, po cichu rozjeżdża dopasowanie
// ═══════════════════════════════════════════════════════════════════
check('rodzaj zdarzenia „deselekcja" ma dokładnie tę nazwę, co czytnik arbitra',
  ZDARZENIE_DESELEKCJA === 'deselekcja', ZDARZENIE_DESELEKCJA);
check('rodzaj zdarzenia zmiany klubu/pozycji/poziomu — nazwa co do znaku',
  ZDARZENIE_ZMIANA === 'zmiana_klubu_pozycji_poziomu', ZDARZENIE_ZMIANA);
check('zbiór rodzajów zdarzeń jest ZAMKNIĘTY i ma dokładnie dwa elementy',
  RODZAJE_ZDARZEN.length === 2, JSON.stringify(RODZAJE_ZDARZEN));
check('stan otwarty nazywa się „active"', STAN_AKTYWNA === 'active', STAN_AKTYWNA);
check('stan zamknięty nazywa się „closed"', STAN_ZAMKNIETA === 'closed', STAN_ZAMKNIETA);

for (const k of ['id', 'state', 'event_kind', 'event_at', 'opened_at', 'closed_at']) {
  check(`lista kolumn do select() zawiera „${k}"`, KOLUMNY_WYJSCIA.split(',').includes(k), KOLUMNY_WYJSCIA);
}
check('…i nie pobiera niczego ponadto (sześć kolumn, zero na zapas)',
  KOLUMNY_WYJSCIA.split(',').length === 6, KOLUMNY_WYJSCIA);

// ═══════════════════════════════════════════════════════════════════
// 2. TRZY STANY, KTÓRYCH NIE WOLNO SKLEIĆ (R5)
// ═══════════════════════════════════════════════════════════════════
{
  const s = stanSciezki(null, 'network request failed');
  check('błąd odczytu → „nie wiem", NIE „wyłączona"', s.rodzaj === 'nie_wiem', s.rodzaj);
  check('…i powód wchodzi do stanu, żeby dało się to zdiagnozować',
    s.rodzaj === 'nie_wiem' && s.powod.includes('network request failed'), JSON.stringify(s));
}
{
  const s = stanSciezki(null, null);
  check('odczyt udany, brak wiersza → „wyłączona" (policzone i wyszło zero)',
    s.rodzaj === 'wylaczona', s.rodzaj);
}
{
  const s = stanSciezki(wiersz(), null);
  check('otwarty wiersz → „włączona"', s.rodzaj === 'wlaczona', s.rodzaj);
  check('…z rozpoznanym zdarzeniem',
    s.rodzaj === 'wlaczona' && s.zdarzenie === ZDARZENIE_DESELEKCJA, JSON.stringify(s));
  check('…i z datą otwarcia (do harmonogramu kontaktów 4/6/9/12 mies.)',
    s.rodzaj === 'wlaczona' && s.otwartaOd === '2026-08-12T18:30:00.000Z', JSON.stringify(s));
}
{
  const s = stanSciezki(wiersz({ event_kind: null }), null);
  check('„Nie chcę tego nazywać" NIE psuje stanu — ścieżka nadal włączona',
    s.rodzaj === 'wlaczona' && s.zdarzenie === null, JSON.stringify(s));
}
{
  const s = stanSciezki(wiersz({ event_kind: 'deselekcia' }), null);
  check('literówka w event_kind → zdarzenie „nie wiem" (null), a nie udawanie deselekcji',
    s.rodzaj === 'wlaczona' && s.zdarzenie === null, JSON.stringify(s));
}
{
  const s = stanSciezki(wiersz({ closed_at: '2026-09-01T00:00:00.000Z' }), null);
  check('wiersz z closed_at NIE jest otwarty, nawet gdy przyjdzie z zapytania',
    s.rodzaj === 'wylaczona', JSON.stringify(s));
}
{
  const s = stanSciezki(wiersz({ state: STAN_ZAMKNIETA }), null);
  check('state = „closed" → wyłączona, choćby closed_at było puste',
    s.rodzaj === 'wylaczona', JSON.stringify(s));
}
{
  const s = stanSciezki(wiersz({ state: 'paused_decision' }), null);
  check('nieznany stan („paused_decision") NIE udaje zwykłego włączenia — jest nazwany w logu',
    s.rodzaj === 'wlaczona' && s.nieznanyStan === 'paused_decision', JSON.stringify(s));
}

// ═══════════════════════════════════════════════════════════════════
// 3. WŁĄCZENIE — wiersz powstaje OTWARTY i nie wymaga tłumaczenia się
// ═══════════════════════════════════════════════════════════════════
{
  const w = wierszWlaczenia({ userId: 'u1', rodzaj: ZDARZENIE_DESELEKCJA, teraz: TERAZ });
  check('włączenie zapisuje state = active', w.state === STAN_AKTYWNA, JSON.stringify(w));
  check('włączenie NIE ustawia closed_at (wiersz ma być otwarty)',
    !Object.prototype.hasOwnProperty.call(w, 'closed_at'), JSON.stringify(w));
  check('event_at idzie razem z rodzajem zdarzenia — bez daty zdarzenia arbiter go nie zobaczy',
    w.event_at === TERAZ.toISOString(), JSON.stringify(w));
  check('opened_at jest ustawione przez appkę, nie zostawione bazie',
    w.opened_at === TERAZ.toISOString(), JSON.stringify(w));
}
{
  const w = wierszWlaczenia({ userId: 'u1', rodzaj: null, teraz: TERAZ });
  check('włączenie BEZ podania powodu jest pełnoprawne', w.state === STAN_AKTYWNA, JSON.stringify(w));
  check('…i nie zostawia daty zdarzenia, którego nie ma',
    w.event_kind === null && w.event_at === null, JSON.stringify(w));
}
{
  const w = wierszWlaczenia({ userId: 'u1', rodzaj: ZDARZENIE_ZMIANA, teraz: TERAZ });
  check('zmiana klubu/pozycji/poziomu też otwiera ścieżkę',
    w.event_kind === ZDARZENIE_ZMIANA, JSON.stringify(w));
}

// ═══════════════════════════════════════════════════════════════════
// 4. WYJŚCIE ZE STANU ISTNIEJE I O NIC NIE PYTA
// ═══════════════════════════════════════════════════════════════════
{
  const p = patchWylaczenia(TERAZ);
  check('wyłączenie ustawia OBIE rzeczy: state i closed_at',
    p.state === STAN_ZAMKNIETA && p.closed_at === TERAZ.toISOString(), JSON.stringify(p));
  check('…i nie ustawia niczego więcej (żadnego powodu, żadnej ankiety)',
    Object.keys(p).length === 2, JSON.stringify(p));
  check('wyłączenie nie przyjmuje żadnego argumentu poza czasem',
    patchWylaczenia.length === 1, String(patchWylaczenia.length));
}
{
  // Domknięcie pętli: włączone → wyłączone → stan czytany z powrotem.
  const p = patchWylaczenia(TERAZ);
  const po = stanSciezki(wiersz({ state: p.state, closed_at: p.closed_at }), null);
  check('po wyłączeniu odczyt tego samego wiersza daje „wyłączona"',
    po.rodzaj === 'wylaczona', JSON.stringify(po));
}

// ═══════════════════════════════════════════════════════════════════
// 5. STAN KOŃCZY SIĘ ZDARZENIEM, NIGDY WYGAŚNIĘCIEM OKNA DANYCH (P9/A3)
// ═══════════════════════════════════════════════════════════════════
const zrodlo = bezKomentarzy(readFileSync(join(libDir, 'sciezkaWyjscia.ts'), 'utf8'));

for (const slad of ['expires', 'wygasa', 'DNI_BEZ_WPISU', 'TTL', 'setTimeout', 'Date.now(']) {
  check(`źródło nie zawiera „${slad}" — stan nie może się kończyć sam`,
    !zrodlo.includes(slad), slad);
}
check('źródło nie czyta zegara (data wchodzi parametrem, reguła E-N2)',
  !/new Date\(\)/.test(zrodlo), 'new Date()');
check('źródło nie zapisuje stanu „paused_decision" — patrz nagłówek pliku',
  !zrodlo.includes("'paused_decision'"), 'paused_decision');

// Klasyfikator: ten plik nie ma prawa czytać treści wpisów zawodnika.
for (const slad of ['daily_logs', 'payload', 'diagnostics', 'ryzyk', 'score']) {
  check(`źródło nie sięga po „${slad}" — włącza człowiek, nie klasyfikator`,
    !zrodlo.includes(slad), slad);
}

// ═══════════════════════════════════════════════════════════════════
// 6. TREŚĆ — zakazy 8, 14, 17 i brak pytania „dlaczego"
// ═══════════════════════════════════════════════════════════════════
const cala = [
  WYJSCIE_WEJSCIE_PODPIS, WYJSCIE_PYTANIE_PODPIS, WYJSCIE_WYLACZ_PODPIS,
  WYJSCIE_WLACZONA_TRESC, WYJSCIE_NA_JUTRO, WYJSCIE_NIE_WIEM,
  ...WYJSCIE_CO_SIE_ZMIENI, ...WYJSCIE_LICZBY,
  ...WYJSCIE_ODPOWIEDZI.map((o) => o.label),
].join(' ').toLowerCase();

for (const zakazane of ['a jeśli się nie uda', 'plan b', 'wróć silniejszy', 'głowa do góry',
  'wszystko będzie dobrze', 'dlaczego']) {
  check(`treść nie zawiera „${zakazane}"`, !cala.includes(zakazane), zakazane);
}
check('treść nie pyta o powód znakiem zapytania w podpisie wejścia',
  !WYJSCIE_WEJSCIE_PODPIS.includes('?'), WYJSCIE_WEJSCIE_PODPIS);
check('treść mówi wprost, że dane NIE są kasowane',
  cala.includes('nic nie jest kasowane') || cala.includes('nic nie zostało skasowane'), cala.slice(0, 80));
check('treść mówi wprost, że to się da cofnąć',
  cala.includes('cofnąć') || cala.includes('wyłączyć'), cala.slice(0, 80));

check('są dokładnie trzy gotowe odpowiedzi (reguła P4), nigdy puste pole',
  WYJSCIE_ODPOWIEDZI.length === 3, JSON.stringify(WYJSCIE_ODPOWIEDZI));
check('…i jedna z nich pozwala nie nazywać niczego',
  WYJSCIE_ODPOWIEDZI.some((o) => o.rodzaj === null), JSON.stringify(WYJSCIE_ODPOWIEDZI));
check('…a każda z pozostałych ma rodzaj z zamkniętego zbioru',
  WYJSCIE_ODPOWIEDZI.filter((o) => o.rodzaj !== null)
    .every((o) => (RODZAJE_ZDARZEN as readonly string[]).includes(o.rodzaj as string)),
  JSON.stringify(WYJSCIE_ODPOWIEDZI));

check('są trzy liczby systemowe zamiast pocieszenia (spec 2.3)',
  WYJSCIE_LICZBY.length === 3, String(WYJSCIE_LICZBY.length));
check('lista „co się zmieni" jest pokazywana PRZED włączeniem i ma co najmniej pięć pozycji',
  WYJSCIE_CO_SIE_ZMIENI.length >= 5, String(WYJSCIE_CO_SIE_ZMIENI.length));
check('stan włączony ma jedną rzecz do zrobienia jutro (zakaz 17)',
  WYJSCIE_NA_JUTRO.length > 30, WYJSCIE_NA_JUTRO);
check('…i ta rzecz nie wymaga klubu, trenera ani niczyjej zgody',
  !/klub|trener|zgod/i.test(WYJSCIE_NA_JUTRO), WYJSCIE_NA_JUTRO);

// ═══════════════════════════════════════════════════════════════════
console.log(`\n${passed} przeszło, ${failed} nie przeszło.`);
if (failed > 0) process.exit(1);
