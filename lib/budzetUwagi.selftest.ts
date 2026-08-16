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
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75)
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — liczbą. Ten plik miał 47 ASERCJI i ANI JEDNEJ, która
// czytałaby EKRAN. Sprawdzał wyłącznie własny moduł przez `import`. Audyt H1
// (15.08) zmierzył: nie istnieje stan repozytorium z pilnowanym defektem,
// na którym ten strażnik by się zapalił.
//
// ⛔ DLACZEGO TO JEST GROŹNE AKURAT TUTAJ — I DLACZEGO KOSZT JEST FIZYCZNY.
// `sufitObjetosci()` liczy SUFIT TYGODNIOWEJ OBJĘTOŚCI pracy przy włączonym
// ograniczeniu `blokNieZwiekszaObjetosci` (spec 3.2: zawodnik rośnie szybciej
// niż 7,2 cm/rok). To nie jest kosmetyka i nie jest to komunikat: to są
// LICZBY, którymi planer ma się posługiwać. Sufit policzony bezbłędnie
// w module i POMINIĘTY NA EKRANIE znaczy, że zawodnik w szczycie wzrastania —
// czyli w okresie, w którym urazy zabierają 96 zamiast 24 dni absencji na
// 1000 godzin — dostaje plan pracy POWYŻEJ sufitu. Suita mówi wtedy 47 na 47.
//
// Sufit trzeba przy tym uszanować w TRZECH niezależnych miejscach planera,
// bo w każdym z nich objętość rośnie inną drogą:
//   1. propozycja endpointu dozowania (`ograniczLiczbeDni` + `slice`) —
//      endpoint nic nie wie o Osłonie i potrafi zaproponować pięć dni;
//   2. ręczne doklikanie dnia — bez tego przycinanie propozycji jest ozdobą,
//      bo zawodnik odklika z powrotem to, co system właśnie zdjął;
//   3. lista liczb „ile razy w tygodniu" — liczby powyżej sufitu mają się
//      W OGÓLE NIE POJAWIAĆ (budżet ma być pokazany ZANIM zawodnik wybierze).
// Każde z tych trzech miejsc ma tu osobną asercję, bo każde da się wyciąć
// osobno i każde osobno kosztuje zawodnika treningiem.
//
// CO JEST TERAZ — sekcja 0 niżej. Ekran ODKRYWANY Z KATALOGU (O69), zbiór
// konsumentów na RÓWNOŚĆ (O73), brak pliku to FAIL Z NAZWĄ, nigdy `ENOENT` (O76).
//
// ⚠️ CZEGO TA SEKCJA NIE UDAJE. Czyta źródło ekranu JAKO TEKST, nie uruchamia
// Reacta. Podmiana wywołania na inne, równie zepsute, przejdzie niezauważona.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (O53): `tsconfig.json` ciągnie DOM, `tsc` pada
// wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// ═══════════════════════════════════════════════════════════════════
// ⭐ 0. PAS I2 16.08.2026 — EKRAN, KTÓRY PLANUJE OBJĘTOŚĆ (K4 / O75)
// ═══════════════════════════════════════════════════════════════════
// Wszystkie asercje tej sekcji czytają ŹRÓDŁO EKRANU, nie moduł. Bez nich
// 47 asercji tego pliku opisuje sufit, którego nikt nie musi respektować.

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — ten plik i planer CYTUJĄ w komentarzach nazwy
 * funkcji i skasowane wywołania („TU STAŁO SKRÓCENIE HORYZONTU (`sufitTygodni`)"),
 * więc strażnik czytający surowy tekst przechodziłby na własnej dokumentacji.
 * Jedynym sposobem, żeby go zapalić, byłoby wtedy skasowanie wyjaśnienia.
 */
const bezKomentarzy = (s: string): string => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .join('\n');

/** ⛔ Brak pliku to FAIL Z NAZWĄ, nigdy wyjątek `ENOENT` (O76). */
const BRAK_PLIKOW: string[] = [];
const surowe = (wzgledna: string): string => {
  const p = join(root, wzgledna);
  if (!existsSync(p)) { BRAK_PLIKOW.push(wzgledna); return ''; }
  return readFileSync(p, 'utf8');
};

const PLIK_PLANER = 'components/FocusBlockPlanner.tsx';
const planer = bezKomentarzy(surowe(PLIK_PLANER));

{
  console.log('0. EKRAN, KTÓRY PLANUJE OBJĘTOŚĆ (K4 / O75)');

  check('⛔ (I2-0) plik ekranu z listy strażnika istnieje i daje się odczytać',
    BRAK_PLIKOW.length === 0,
    `NIE MA TYCH PLIKÓW: ${BRAK_PLIKOW.join(', ')} — zmieniła się nazwa albo miejsce planera. `
    + 'Popraw listę w tym pliku ALBO przywróć ekran; do tego czasu asercje niżej '
    + 'czytają PUSTY tekst i nie znaczą nic.');

  // ── Odkrywanie z katalogu, nie lista na sztywno (O69) ──
  const POMIN_KAT = new Set(['_diag_backup', 'node_modules', '.git', '.expo', 'assets']);
  function chodz(katalog: string, out: string[] = []): string[] {
    if (!existsSync(katalog)) return out;
    for (const wpis of readdirSync(katalog)) {
      if (POMIN_KAT.has(wpis)) continue;
      const p = join(katalog, wpis);
      if (statSync(p).isDirectory()) chodz(p, out);
      else if (p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p);
    }
    return out;
  }
  const EKRANY = ['app', 'components']
    .flatMap((k) => chodz(join(root, k)))
    .map((p) => relative(root, p).split(sep).join('/'))
    .filter((p) => !p.endsWith('.selftest.ts'))
    .sort();

  const konsumenci = EKRANY.filter(
    (p) => /from\s+'[^']*\/budzetUwagi'/.test(bezKomentarzy(readFileSync(join(root, p), 'utf8'))));
  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c`, nie przepisane z pamięci.
  // RÓWNOŚĆ, nie „≥ 1" (O73). Konsument jest DOKŁADNIE JEDEN i to jest cała
  // treść tej asercji: ubytek znaczy, że budżet uwagi zniknął z produktu,
  // a nadmiar — że objętość planuje się w drugim miejscu, które o suficie
  // nie musi wiedzieć.
  const KONSUMENCI = [PLIK_PLANER];
  const brakujacy = KONSUMENCI.filter((p) => !konsumenci.includes(p));
  const nadmiarowi = konsumenci.filter((p) => !KONSUMENCI.includes(p));
  check('⭐ (I2-0) budżet uwagi rysuje DOKŁADNIE ten jeden plik, co 16.08 — RÓWNOŚĆ, nie „≥ 1" (O73)',
    brakujacy.length === 0 && nadmiarowi.length === 0,
    `BRAKUJE: ${brakujacy.join(', ') || '—'} · NADMIAROWI: ${nadmiarowi.join(', ') || '—'} `
    + '→ ubył: zawodnik przestał widzieć, ile ma wolnego tygodnia, a 47 asercji niżej nadal jest '
    + 'zielonych; doszedł: sprawdź, czy nowe miejsce respektuje sufit `sufitObjetosci()`, bo inaczej '
    + 'objętość da się podbić drogą, o której ten strażnik nie wie.');

  // ══ ⛔ RDZEŃ TEJ SEKCJI: SUFIT POLICZONY ≠ SUFIT USZANOWANY ══
  check('⛔ (I2-0) planer LICZY sufit funkcją modułu — `sufitObjetosci(budzet, ograniczenia)`',
    /sufitObjetosci\(\s*budzet\s*,\s*ograniczenia\s*\)/.test(planer),
    'ekran przestał wołać `sufitObjetosci` albo liczy sufit sam: wtedy istnieją DWA rachunki '
    + 'objętości i ten na ekranie nie zna reguły „minimum 1, żeby produkt nie przestał działać '
    + 'na cały skok wzrostowy". Zawodnik w szczycie wzrastania planuje jak każdy inny.');

  check('⛔ (I2-0) sufit tnie PROPOZYCJĘ ENDPOINTU dozowania (`ograniczLiczbeDni` + `slice`)',
    /ograniczLiczbeDni\(/.test(planer) && /\.slice\(\s*0\s*,\s*ileWolno\s*\)/.test(planer),
    'endpoint dozowania nic nie wie o Osłonie i potrafi zaproponować pięć dni; bez przycięcia '
    + 'zawodnik dostaje GOTOWY plan powyżej sufitu i zatwierdza go jednym dotknięciem — '
    + 'to jest koszt fizyczny, nie kosmetyczny (spec 3.2: „BLOK NIE PROPONUJE zwiększenia objętości")');

  check('⛔ (I2-0) sufit obowiązuje też przy RĘCZNYM doklikaniu dnia',
    /next\.size\s*>=\s*sufit\.maxJednostek/.test(planer),
    'zniknął warunek w `toggleSuggestionDay`: przycinanie propozycji staje się ozdobą, bo zawodnik '
    + 'odklika z powrotem dokładnie te dni, które system właśnie zdjął — i wyjdzie z planera '
    + 'z objętością powyżej sufitu, nie wiedząc, że jakikolwiek sufit istniał');

  check('⛔ (I2-0) liczby powyżej sufitu W OGÓLE nie pojawiają się na liście „ile razy w tygodniu"',
    /SESSIONS_OPTIONS\s*\.\s*filter\(\([^)]*\)\s*=>\s*sufit\.maxJednostek/.test(planer),
    'lista częstotliwości przestała być filtrowana sufitem: zawodnik wybiera liczbę, której nie '
    + 'wolno mu dać, i dowiaduje się o tym dopiero uderzając w ograniczenie na końcu przepływu — '
    + 'albo, gorzej, nie dowiaduje się wcale i plan zostaje zapisany');

  check('⛔ (I2-0) „ile jeszcze wolno" liczone Z SUFITU, nie z surowego budżetu',
    /const\s+wolne\s*=\s*sufit\.wolneJednostki\s*\?\?/.test(planer),
    'ekran wrócił do `budzet.stan.wolne_jednostki` z pominięciem sufitu: zdanie „Zmieści się — '
    + 'masz wolne: N" podaje zawodnikowi liczbę WIĘKSZĄ niż to, co wolno mu zaplanować, '
    + 'czyli produkt wprost zaprasza do przekroczenia własnej reguły');

  // ── R5: „nie wiem" jest osobnym stanem, nigdy zerem ──
  check('⛔ (I2-0) planer rozróżnia „nie znam budżetu" od „nie masz miejsca" (R5)',
    /budzet\.kind\s*===\s*'unknown'/.test(planer) && /budzet\.kind\s*===\s*'loading'/.test(planer),
    'zniknęła gałąź `unknown` albo `loading`: nieudany odczyt `focus_budget_state()` zaczyna '
    + 'wyglądać jak „masz 0 wolnych sesji" — twierdzenie o zawodniku postawione na odczycie, '
    + 'który nigdy nie doszedł (Z0)');

  // ── Brzmienia: nic z bazy nie wycieka na ekran ──
  check('⛔ (I2-0) odmowa budżetu rysowana `budzetBlokadaKomunikat`, a SUROWY tekst bazy nie stoi na ekranie',
    /budzetBlokadaKomunikat\(/.test(planer) && /isBudzetError\(/.test(planer)
    && !/BUDZET_UWAGI/.test(planer),
    'ekran przestał tłumaczyć wyjątek wyzwalacza albo wypisuje go wprost: zawodnik czyta '
    + '„BUDZET_UWAGI: …" — zdanie napisane dla programisty — zamiast komunikatu, który daje WYJŚCIE');

  check('⛔ (I2-0) liczebnik odmienia FUNKCJA modułu, a nie ternary wpisany na ekranie',
    /jednostkiSlowo\(/.test(planer) && !/[?:]\s*'sesj/.test(planer),
    'na ekranie pojawiła się druga odmiana „sesję/sesje/sesji"; ta reguła ma wyjątek na nastkach '
    + '(12 → „sesji", 22 → „sesje") i druga kopia rozjedzie się na pierwszym z nich — '
    + 'a zdanie „0 z 4 sesje" już raz zostało złapane na żywym telefonie');

  // ── ⭐ ZAPADKA NA SKASOWANIE ──
  // Bez tych dwóch asercji wszystkie powyższe spełnia się przez USUNIĘCIE
  // pudełka budżetu z widoku. Strażnik nagradzałby wtedy skasowanie funkcji.
  check('⭐ (I2-0) pudełko budżetu i koszt wyboru NAPRAWDĘ trafiają do widoku',
    /\{renderBudzet\(\)\}/.test(planer) && /\{renderKoszt\(\)\}/.test(planer),
    'zniknęło rysowanie budżetu albo kosztu; wszystkie asercje wyżej spełnia też planer, który '
    + 'nie pokazuje ich wcale — a wtedy strażnik NAGRADZA skasowanie funkcji');

  check('⭐ (I2-0) zamrożona objętość ma na ekranie ZDANIE, i to zdanie z DWIEMA gałęziami',
    /objetoscZamrozona\s*\?/.test(planer) && /sufit\.proponowacRedukcje/.test(planer),
    'zniknęło zdanie o zamrożonej objętości albo jego druga gałąź: zawodnik widzi, że nagle nie '
    + 'może dołożyć sesji, i NIE WIE DLACZEGO — a to jest jedyne miejsce, w którym produkt to mówi. '
    + '⚠️ Brzmienie jest zatwierdzone: zero liczby o dojrzałości biologicznej (zakaz bezwzględny, '
    + 'spec 3.3) i zero zakazu — mowa o tym, czego system NIE PROPONUJE');
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
