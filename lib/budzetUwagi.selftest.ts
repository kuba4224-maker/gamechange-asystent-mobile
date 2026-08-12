// PLAN-D-A 08.2026 (11.08.2026) — NOWY PLIK.
//
//   npx tsx lib/budzetUwagi.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// PO CO TO ISTNIEJE. Naprawa A2 zamieniła twardy limit („Masz już aktywny Blok
// w tej kategorii") na ROZMOWĘ z liczbami. Cała jej wartość siedzi w jednym
// zdaniu, które zawodnik czyta w chwili odmowy — a to zdanie da się zepsuć na
// trzy sposoby, z których żaden nie wywala appki i żaden nie jest widoczny
// w code review:
//
//   1. `hint` przestaje się parsować (baza zmienia format) → komunikat traci
//      liczby i staje się ścianą „nie możesz";
//   2. z komunikatu znika WYJŚCIE → zawodnik wie, że się nie da, i nie wie,
//      co z tym zrobić;
//   3. na ekran wycieka surowy tekst z bazy („BUDZET_UWAGI: …") — napisany
//      dla programisty, nie dla piętnastolatka.
//
// Te asercje zostały uruchomione 11.08.2026 przed zapisem i wszystkie przeszły.
// Zapisuję je na dysk, bo test uruchomiony w sesji i nigdzie niezapisany znika
// razem z sesją — to jest znalezisko N7 z audytu po bloku 3 (55 scenariuszy
// straconych w jednej rundzie).
//
// ⚠️ CZEGO TEN PLIK NIE SPRAWDZA: czy `supabase-js` w ogóle przenosi SQLSTATE
// do pola `code`, a `hint` do pola `hint`. Tego nie da się sprawdzić bez żywej
// bazy i na 11.08.2026 NIE BYŁO to sprawdzone — dlatego `isBudzetError`
// rozpoznaje wyjątek dwiema drogami naraz.
import {
  jednostkiSlowo,
  parseBudzetHint,
  budzetBlokadaKomunikat,
  isBudzetError,
  type OtwartyBlok,
} from './budzetUwagi';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

const OTWARTE: OtwartyBlok[] = [{ id: 'b1', label: 'Wytrzymałość', jednostki: 3 }];
const HINT_TYPOWY = 'koszt=3;wolne=1;limit_jednostek=4';

// ─── Odmiana liczebnika ───
// Ta funkcja opisuje MIANOWNIK PO LICZBIE. Po „z" idzie dopełniacz („0 z 4
// sesji") i tam jej NIE używamy — błąd złapany na żywym telefonie.
check('1 → „sesję"', jednostkiSlowo(1) === 'sesję', jednostkiSlowo(1));
check('2 → „sesje"', jednostkiSlowo(2) === 'sesje', jednostkiSlowo(2));
check('4 → „sesje"', jednostkiSlowo(4) === 'sesje', jednostkiSlowo(4));
check('5 → „sesji"', jednostkiSlowo(5) === 'sesji', jednostkiSlowo(5));
check('12 → „sesji" (nastki są wyjątkiem)', jednostkiSlowo(12) === 'sesji', jednostkiSlowo(12));
check('22 → „sesje" (a dziesiątki nie)', jednostkiSlowo(22) === 'sesje', jednostkiSlowo(22));
check('0 → „sesji"', jednostkiSlowo(0) === 'sesji', jednostkiSlowo(0));

// ─── Parsowanie `hint` z wyzwalacza ───
const h = parseBudzetHint(HINT_TYPOWY);
check('typowy hint: koszt', h.koszt === 3, String(h.koszt));
check('typowy hint: wolne', h.wolne === 1, String(h.wolne));
check('typowy hint: limit_jednostek', h.limitJednostek === 4, String(h.limitJednostek));
check('kolejność pól nie ma znaczenia',
  parseBudzetHint('limit_jednostek=4;koszt=3;wolne=1').koszt === 3, 'kolejność');
check('spacje wokół wartości nie psują odczytu',
  parseBudzetHint(' koszt = 3 ; wolne = 1 ').koszt === 3, 'spacje');
check('wolne=0 to ZERO, nie brak danych',
  parseBudzetHint('koszt=2;wolne=0').wolne === 0, String(parseBudzetHint('koszt=2;wolne=0').wolne));

// R5: nieznany kształt daje „nie wiem", NIGDY zero.
for (const zly of [null, undefined, '', 'cos=innego', 'koszt=abc', '{"koszt":3}']) {
  const p = parseBudzetHint(zly as string | null | undefined);
  check(`nieznany hint ${JSON.stringify(zly)} → same null, nie zera`,
    p.koszt === null && p.wolne === null && p.limitJednostek === null, JSON.stringify(p));
}

// ─── Komunikat dla zawodnika ───
const pelny = budzetBlokadaKomunikat(HINT_TYPOWY, OTWARTE);

check('komunikat podaje koszt Bloku', pelny.includes('kosztuje 3 sesje'), pelny);
check('komunikat podaje, ile zostało', pelny.includes('wolne: 1 z 4'), pelny);
check('komunikat mówi, KTÓRY Blok zamknąć (nazwa, nie „jakiś")',
  pelny.includes('Wytrzymałość (3)'), pelny);
check('komunikat daje drugie wyjście — lżejszy wariant',
  pelny.includes('mniej dni'), pelny);

// To jest sedno całego pliku. Surowy tekst z bazy nie ma prawa trafić na ekran.
for (const [nazwa, tekst] of [
  ['pełny hint', pelny],
  ['bez listy Bloków', budzetBlokadaKomunikat(HINT_TYPOWY, [])],
  ['nieznany hint', budzetBlokadaKomunikat('cos=innego', OTWARTE)],
  ['brak hintu', budzetBlokadaKomunikat(null, [])],
] as [string, string][]) {
  check(`[${nazwa}] bez surowego tekstu z bazy`,
    !tekst.includes('BUDZET_UWAGI') && !tekst.includes('GC001') && !tekst.includes('SQLSTATE'), tekst);
  check(`[${nazwa}] zawsze jest jakieś WYJŚCIE, nie sama ściana`,
    tekst.includes('Zamknij jeden z otwartych Bloków'), tekst);
  check(`[${nazwa}] w słowniku trzech poziomów — „Blok", nigdy „Blok Skupienia"`,
    !tekst.includes('Blok Skupienia'), tekst);
}

check('gdy zabrakło liczb, komunikat NIE zmyśla zera',
  !budzetBlokadaKomunikat('cos=innego', OTWARTE).includes(' 0 '),
  budzetBlokadaKomunikat('cos=innego', OTWARTE));
check('gdy wolne=0, nie proponujemy „zaznacz mniej dni" (bo nie ma ile)',
  !budzetBlokadaKomunikat('koszt=3;wolne=0;limit_jednostek=4', OTWARTE).includes('mniej dni'),
  budzetBlokadaKomunikat('koszt=3;wolne=0;limit_jednostek=4', OTWARTE));
check('gdy wolne=1, liczebnik w drugim wyjściu jest w liczbie pojedynczej',
  budzetBlokadaKomunikat(HINT_TYPOWY, OTWARTE).includes('1 zmieści się'), pelny);
check('gdy wolne=2, liczebnik w liczbie mnogiej',
  budzetBlokadaKomunikat('koszt=5;wolne=2;limit_jednostek=4', OTWARTE).includes('2 zmieszczą się'),
  budzetBlokadaKomunikat('koszt=5;wolne=2;limit_jednostek=4', OTWARTE));
check('bez znanych otwartych Bloków komunikat kieruje na listę, nie donikąd',
  budzetBlokadaKomunikat(HINT_TYPOWY, []).includes('na liście wąskich gardeł'),
  budzetBlokadaKomunikat(HINT_TYPOWY, []));

// ─── Rozpoznanie wyjątku — DWIE drogi, bo jedna nie została sprawdzona na żywo ───
check('rozpoznaje po SQLSTATE', isBudzetError({ code: 'GC001' }), 'code');
check('rozpoznaje po prefiksie komunikatu, gdy kodu nie ma',
  isBudzetError({ message: 'BUDZET_UWAGI: nie mieści się' }), 'message');
check('rozpoznaje mimo wiodących białych znaków',
  isBudzetError({ message: '  BUDZET_UWAGI: x' }), 'trim');
check('NIE bierze cudzego błędu za budżet (unikalny indeks)',
  !isBudzetError({ code: '23505', message: 'duplicate key' }), '23505');
check('NIE bierze braku funkcji za budżet',
  !isBudzetError({ code: 'PGRST202', message: 'not found' }), 'PGRST202');
check('null nie wywraca rozpoznania', !isBudzetError(null), 'null');
check('undefined nie wywraca rozpoznania', !isBudzetError(undefined), 'undefined');

console.log(`\n${passed} passed, ${failed} failed`);
// Celowo `throw`, a nie `process.exit(1)`: `process` wymaga `@types/node`,
// których tsconfig appki nie zaciąga — a te pliki są objęte `npx tsc --noEmit`.
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
