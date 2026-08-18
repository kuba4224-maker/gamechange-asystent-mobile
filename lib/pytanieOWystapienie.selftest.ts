// PLAN-D-D2 08.2026 (15.08.2026) — STRAŻNIK „ZROBIŁEŚ?".
//
//   npx tsx lib/pytanieOWystapienie.selftest.ts
//
// (albo `node tests/run-selftests.mjs`, który odkrywa ten plik sam — runner
// czyta katalog `lib/`, więc nie ma listy, do której trzeba by go dopisać.)
//
// ⛔ ZAKAZ `new URL(...)` — O53, TS2769.
//
// ═══════════════════════════════════════════════════════════════════════════
// SIEDEM GRUP — I DLACZEGO SZÓSTA JEST NAJWAŻNIEJSZA
//
//   (1) OKNO = WCZORAJ I DZIŚ. Sesja z przedwczoraj nie wchodzi NIGDY.
//   (2) JEDNO PYTANIE NA WYSTĄPIENIE, nie na wiersz.
//   (3) WERDYKT ZAMYKA PYTANIE, a wycofany je PRZYWRACA.
//   (4) TRZECI STAN — nieodczytane wejście daje `nie_wiem`, nie „brak pytań".
//   (5) ⛔ ZERO ARYTMETYKI NA DNIACH POZA OKNEM — asercja na ŹRÓDŁO, nie na wynik.
//   (6) ⭐ ASERCJA TABELARYCZNA: kilkadziesiąt wejść różniących się WYŁĄCZNIE
//       rozkładem sesji w czasie. Liczba zadanych pytań ma się zmieniać
//       WYŁĄCZNIE z okna „wczoraj i dziś" — NIGDY z długości przerwy.
//       ⭐ To jest maszynowy dowód decyzji Kuby nr 2 i zakazu N1 naraz:
//       zawodnik wracający po dwóch tygodniach dostaje dokładnie tyle samo
//       pytań, co ten, który był wczoraj. Deklaracja w komentarzu zgniłaby
//       przy pierwszej „drobnej" zmianie okna; ta tabela nie.
//   (7) EKRAN — cztery zakazane słowa, brak powiadomień, brak porównań,
//       `.select('id')` jako dowód zapisu i zakaz zapisu `odbylo_sie`
//       bez dotknięcia zawodnika.
//
// ⚠️ O71 — ASERCJE O EKRANIE WYCINAJĄ INSTRUKCJĘ, a nie szukają frazy
// w 200-kilobajtowym pliku. `dzis.tsx` ma 197 kB i trzy pasy pod rząd coś do
// niego dołożyły: fraza „session_verdicts" występuje w nim w KOMENTARZU pasa
// B5, w zapytaniu odczytu i w moim zapisie. Asercja szukająca jej w całym
// pliku byłaby zielona nawet po skasowaniu zapisu.
//
// ⚠️ O73 — ZAPADKI SĄ NA RÓWNOŚĆ, NIE NA „≥ 1". Liczba pytań, liczba miejsc
// zapisu werdyktu i liczba zakazanych słów są porównywane co do jednego:
// zapadka na „≥ 1" przepuszcza dokładnie ten defekt, przed którym stoi.
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  zbudujPytaniaOWystapienia,
  zdaniePytania,
  ilePytamy,
  opisPytanDoLogu,
  PYTANIE_NAGLOWEK,
  KIEDY_NAPIS,
  ZASADY_PRAWDZIWE_PYTAN,
  type WystapienieDoPytania,
  type WynikPytan,
  type ZasadyPytan,
} from './pytanieOWystapienie';
import {
  czytajWerdykty,
  PLAKIETKI_WYKONANIA,
  type WejscieWerdyktow,
} from './wykonanieSesji';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

let passed = 0;
let failed = 0;
function check(nazwa: string, warunek: boolean, szczegol = ''): void {
  if (warunek) { passed += 1; console.log(`OK   - ${nazwa}`); }
  else { failed += 1; console.log(`FAIL - ${nazwa}${szczegol ? ': ' + szczegol : ''}`); }
}

// ═══════════════════════════════════════════════════════════════════
// POMOCE — WEJŚCIA BUDOWANE W PLIKU, ⛔ ZERO DOTKNIĘĆ BAZY
// ═══════════════════════════════════════════════════════════════════

const DZIS = '2026-08-16';
const WCZORAJ = '2026-08-15';
const PRZEDWCZORAJ = '2026-08-14';
const JUTRO = '2026-08-17';

function w(
  idWydarzenia: number,
  dzien: string,
  o: Partial<WystapienieDoPytania> = {},
): WystapienieDoPytania {
  return {
    idWydarzenia,
    dzien,
    tytul: o.tytul ?? `Trening ${idWydarzenia}`,
    nazwaRodzaju: o.nazwaRodzaju === undefined ? 'Trening klubowy' : o.nazwaRodzaju,
    godzina: o.godzina === undefined ? null : o.godzina,
    status: o.status ?? 'scheduled',
    zRegulyCyklicznej: o.zRegulyCyklicznej ?? false,
  };
}

type WierszWerdyktu = {
  calendar_event_id: number;
  occurred_on: string;
  verdict: string;
  withdrawn_at: string | null;
};

function jest(...wiersze: WierszWerdyktu[]): WejscieWerdyktow {
  return czytajWerdykty({ dane: wiersze, blad: null });
}
const PADL_ODCZYT: WejscieWerdyktow = czytajWerdykty({
  dane: null,
  blad: { code: '57014', message: 'canceling statement due to statement timeout' },
});
const NIE_MA_TABELI: WejscieWerdyktow = czytajWerdykty({
  dane: null,
  blad: { code: '42P01', message: 'relation "session_verdicts" does not exist' },
});

function policz(
  wystapienia: readonly WystapienieDoPytania[] | null,
  o: {
    dzis?: string;
    wpisy?: ReadonlySet<number> | null;
    werdykty?: WejscieWerdyktow;
  } = {},
  zasady: ZasadyPytan = ZASADY_PRAWDZIWE_PYTAN,
): WynikPytan {
  return zbudujPytaniaOWystapienia({
    dzis: o.dzis ?? DZIS,
    wystapienia,
    wpisyDziennika: o.wpisy === undefined ? new Set<number>() : o.wpisy,
    werdykty: o.werdykty ?? jest(),
  }, zasady);
}

function klucze(wy: WynikPytan): string[] {
  return wy.rodzaj === 'pytania' ? wy.pytania.map((p) => p.klucz) : [];
}

// ═══════════════════════════════════════════════════════════════════
// BATERIA — te same asercje puszczane na prawdziwych zasadach
// i na sześciu mutacjach (§ na końcu pliku).
// ═══════════════════════════════════════════════════════════════════

const ASERCJI_BATERII = 25;

// ── GRUPA 1 — OKNO = WCZORAJ I DZIŚ ────────────────────────────────
function grupa1(z: ZasadyPytan) {
  const wy = policz([w(1, PRZEDWCZORAJ), w(2, WCZORAJ), w(3, DZIS), w(4, JUTRO)], {}, z);
  check('(1) ⭐ okno bierze DOKŁADNIE dwa wystąpienia: wczorajsze i dzisiejsze',
    klucze(wy).join('|') === '2@2026-08-15|3@2026-08-16', klucze(wy).join('|') || wy.rodzaj);

  check('(1) ⛔ sesja z PRZEDWCZORAJ bez werdyktu NIE WCHODZI — i nie wejdzie nigdy',
    !klucze(wy).includes('1@2026-08-14'), 'przedwczorajsza sesja wpadła do pytań');

  check('(1) ⛔ sesja z JUTRA nie wchodzi — nie ma o czym orzekać',
    !klucze(wy).includes('4@2026-08-17'), 'jutrzejsza sesja wpadła do pytań');

  const stare = policz(
    [w(1, '2019-01-01'), w(2, '2026-07-01'), w(3, PRZEDWCZORAJ)],
    {}, z,
  );
  check('(1) ⛔ TRZY sesje sprzed okna (7 lat, 6 tygodni, 2 dni) dają ZERO pytań',
    ilePytamy(stare) === 0, `${ilePytamy(stare)} pytań`);

  const kiedy = policz([w(2, WCZORAJ), w(3, DZIS)], {}, z);
  check('(1) wczorajsze pytanie stoi PRZED dzisiejszym — starsze najłatwiej zapomnieć',
    kiedy.rodzaj === 'pytania'
    && kiedy.pytania[0]?.kiedy === 'wczoraj' && kiedy.pytania[1]?.kiedy === 'dzis',
    kiedy.rodzaj === 'pytania' ? kiedy.pytania.map((p) => p.kiedy).join(',') : kiedy.rodzaj);
}

// ── GRUPA 2 — JEDNO PYTANIE NA WYSTĄPIENIE ─────────────────────────
function grupa2(z: ZasadyPytan) {
  // Reguła cykliczna: JEDEN wiersz (`id: 9`), DWA wystąpienia w oknie.
  const cykl = policz(
    [w(9, WCZORAJ, { zRegulyCyklicznej: true }), w(9, DZIS, { zRegulyCyklicznej: true })],
    {}, z,
  );
  check('(2) ⭐ jeden wiersz reguły cyklicznej, dwa dni w oknie = DWA pytania',
    klucze(cykl).join('|') === '9@2026-08-15|9@2026-08-16', klucze(cykl).join('|') || cykl.rodzaj);

  const dwaRazy = policz([w(5, WCZORAJ), w(5, WCZORAJ)], {}, z);
  check('(2) to samo wystąpienie podane dwa razy daje JEDNO pytanie',
    ilePytamy(dwaRazy) === 1, `${ilePytamy(dwaRazy)} pytań`);

  // ⭐ Werdykt o JEDNYM wtorku nie zamyka pytania o drugi.
  const jedenZDwoch = policz(
    [w(9, WCZORAJ, { zRegulyCyklicznej: true }), w(9, DZIS, { zRegulyCyklicznej: true })],
    { werdykty: jest({ calendar_event_id: 9, occurred_on: WCZORAJ, verdict: 'odbylo_sie', withdrawn_at: null }) },
    z,
  );
  check('(2) ⭐ werdykt o JEDNYM wystąpieniu reguły NIE zamyka pytania o drugie',
    ilePytamy(jedenZDwoch) === 1
    && klucze(jedenZDwoch).join('|') === '9@2026-08-15|9@2026-08-16',
    `${ilePytamy(jedenZDwoch)} pytań, ${klucze(jedenZDwoch).join('|')}`);

  check('(2) klucz pytania jest parą `(id, dzien)`, a nie samym `id`',
    klucze(cykl).every((k) => k.includes('@')), klucze(cykl).join('|'));
}

// ── GRUPA 3 — WERDYKT ZAMYKA PYTANIE, WYCOFANY JE PRZYWRACA ────────
function grupa3(z: ZasadyPytan) {
  const odp = policz([w(5, WCZORAJ)], {
    werdykty: jest({ calendar_event_id: 5, occurred_on: WCZORAJ, verdict: 'odbylo_sie', withdrawn_at: null }),
  }, z);
  check('(3) sesja z werdyktem NIE JEST pytana ponownie',
    ilePytamy(odp) === 0, `${ilePytamy(odp)} pytań`);
  check('(3) ⭐ …ale ZOSTAJE widoczna i pokazuje, co zawodnik wybrał — da się zmienić',
    odp.rodzaj === 'pytania' && odp.pytania.length === 1
    && odp.pytania[0].stan.rodzaj === 'odpowiedziane'
    && odp.pytania[0].stan.werdykt === 'odbylo_sie',
    odp.rodzaj === 'pytania' ? JSON.stringify(odp.pytania[0]?.stan) : odp.rodzaj);

  const wycofany = policz([w(5, WCZORAJ)], {
    werdykty: jest({ calendar_event_id: 5, occurred_on: WCZORAJ, verdict: 'odbylo_sie', withdrawn_at: '2026-08-16T00:00:00Z' }),
  }, z);
  check('(3) ⭐ werdykt WYCOFANY = brak werdyktu — pytanie WRACA',
    ilePytamy(wycofany) === 1, `${ilePytamy(wycofany)} pytań`);

  const zWpisem = policz([w(5, WCZORAJ)], { wpisy: new Set<number>([5]) }, z);
  check('(3) ⛔ wystąpienie z DOWODEM w Dzienniku nie jest pytane — dowód już jest',
    ilePytamy(zWpisem) === 0, `${ilePytamy(zWpisem)} pytań`);

  const anulowane = policz([w(5, WCZORAJ, { status: 'cancelled' })], {}, z);
  check('(3) ⛔ sesja ODWOŁANA nie jest pytana — odwołanie JEST dowodem',
    ilePytamy(anulowane) === 0, `${ilePytamy(anulowane)} pytań`);

  const completed = policz([w(5, WCZORAJ, { status: 'completed' })], {}, z);
  check('(3) ⛔ sesja `completed` nie jest pytana — dowód już jest',
    ilePytamy(completed) === 0, `${ilePytamy(completed)} pytań`);
}

// ── GRUPA 4 — TRZECI STAN (R5) ─────────────────────────────────────
function grupa4(z: ZasadyPytan) {
  check('(4) ⛔ nie odczytałem WYDARZEŃ → `nie_wiem`, nie „brak pytań"',
    policz(null, {}, z).rodzaj === 'nie_wiem', policz(null, {}, z).rodzaj);
  check('(4) ⛔ nie odczytałem DZIENNIKA → `nie_wiem`',
    policz([w(5, WCZORAJ)], { wpisy: null }, z).rodzaj === 'nie_wiem',
    policz([w(5, WCZORAJ)], { wpisy: null }, z).rodzaj);
  check('(4) ⛔ nie odczytałem WERDYKTÓW → `nie_wiem`',
    policz([w(5, WCZORAJ)], { werdykty: PADL_ODCZYT }, z).rodzaj === 'nie_wiem',
    policz([w(5, WCZORAJ)], { werdykty: PADL_ODCZYT }, z).rodzaj);
  check('(4) ⛔ nie ma tabeli werdyktów → `nie_wiem` — nie ma gdzie zapisać odpowiedzi',
    policz([w(5, WCZORAJ)], { werdykty: NIE_MA_TABELI }, z).rodzaj === 'nie_wiem',
    policz([w(5, WCZORAJ)], { werdykty: NIE_MA_TABELI }, z).rodzaj);

  const pusto = policz([], {}, z);
  check('(4) ⭐ „sprawdziłem i nie ma o co pytać" to INNY stan niż „nie wiem"',
    pusto.rodzaj === 'brak_pytan', pusto.rodzaj);
}

// ── GRUPA 6 — ⭐ ASERCJA TABELARYCZNA ──────────────────────────────
//
// Kilkadziesiąt wejść różniących się WYŁĄCZNIE rozkładem sesji w czasie.
// Dla każdego liczymy pytania i porównujemy CO DO JEDNEGO z liczbą sesji
// w oknie „wczoraj i dziś" — policzoną niezależnie, prostym filtrem.
function grupa6(z: ZasadyPytan) {
  // 31 przesunięć × 4 kształty przerwy = 124 wejścia.
  const przesuniecia = Array.from({ length: 31 }, (_, i) => i); // 0..30 dni wstecz
  const ksztalty: { nazwa: string; dni: (k: number) => number[] }[] = [
    { nazwa: 'jedna sesja', dni: (k) => [k] },
    { nazwa: 'dwie sesje pod rząd', dni: (k) => [k, k + 1] },
    { nazwa: 'sesja + przerwa 7 dni + sesja', dni: (k) => [k, k + 7] },
    { nazwa: 'sesja + przerwa 21 dni + sesja', dni: (k) => [k, k + 21] },
  ];

  const dzien = (k: number) => {
    const t = Date.parse(`${DZIS}T00:00:00Z`) - k * 86400000;
    return new Date(t).toISOString().slice(0, 10);
  };

  let zgodnych = 0;
  let wszystkich = 0;
  const rozjazdy: string[] = [];
  for (const k of przesuniecia) {
    for (const ks of ksztalty) {
      wszystkich += 1;
      const dni = ks.dni(k);
      const wejscie = dni.map((d, i) => w(100 + i, dzien(d)));
      // ⭐ OCZEKIWANIE POLICZONE NIEZALEŻNIE OD BADANEJ FUNKCJI — prostym
      // filtrem „czy to jest wczoraj albo dziś". Gdyby stało tu wywołanie
      // badanej funkcji, asercja porównywałaby ją z samą sobą.
      const oczekiwane = wejscie.filter((x) => x.dzien === DZIS || x.dzien === WCZORAJ).length;
      const dostane = ilePytamy(policz(wejscie, {}, z));
      // ⚠️ O73 — RÓWNOŚĆ, nie „≥ 1". Zapadka na „co najmniej" przepuszcza
      // dokładnie ten defekt, przed którym stoi: okno rozszerzone o dzień.
      if (dostane === oczekiwane) zgodnych += 1;
      else rozjazdy.push(`${ks.nazwa} @−${k}d: ${dostane} ≠ ${oczekiwane}`);
    }
  }
  check(`(6) ⭐ ${wszystkich} wejść różniących się WYŁĄCZNIE rozkładem sesji w czasie — `
    + 'liczba pytań zmienia się TYLKO z okna „wczoraj i dziś"',
    zgodnych === wszystkich, `${wszystkich - zgodnych} rozjazdów, np. ${rozjazdy.slice(0, 3).join(' · ')}`);

  // ⭐ DRUGA POŁOWA TEGO DOWODU: DŁUGOŚĆ PRZERWY NIE ZMIENIA NICZEGO.
  // Ten sam zawodnik, ta sama wczorajsza sesja, i do niej doklejone zaległości
  // sprzed 2, 5, 10 i 30 dni. Liczba pytań ma być ZA KAŻDYM RAZEM ta sama.
  const wczorajszaSesja = w(1, WCZORAJ);
  const przerwy = [0, 2, 5, 10, 30, 60, 365];
  const wyniki = przerwy.map((ile) => ilePytamy(policz(
    [wczorajszaSesja, ...Array.from({ length: ile }, (_, i) => w(200 + i, dzien(i + 2)))],
    {}, z,
  )));
  check('(6) ⭐ zawodnik wracający po 365 dniach dostaje TYLE SAMO pytań, co ten, '
    + 'który był wczoraj — długość przerwy nie jest wejściem reguły',
    wyniki.every((x) => x === 1), `[${wyniki.join(', ')}]`);
}

// ── GRUPA 7 — ZDANIE PYTAJĄCE ──────────────────────────────────────
function grupa7(z: ZasadyPytan) {
  const zGodzina = policz([w(5, WCZORAJ, { tytul: 'Trening z klubem', godzina: '17:00' })], {}, z);
  check('(7) zdanie niesie tytuł, „wczoraj" i godzinę, i kończy się pytaniem',
    zGodzina.rodzaj === 'pytania'
    && zGodzina.pytania[0]?.zdanie === 'Trening z klubem wczoraj o 17:00 — zrobiłeś?',
    zGodzina.rodzaj === 'pytania' ? zGodzina.pytania[0]?.zdanie : zGodzina.rodzaj);

  const bezGodziny = policz([w(5, DZIS, { tytul: 'Trening z klubem' })], {}, z);
  check('(7) ⛔ brak godziny NIE rysuje się jako `—` ani jako północ — znika z całości',
    bezGodziny.rodzaj === 'pytania'
    && bezGodziny.pytania[0]?.zdanie === 'Trening z klubem dziś — zrobiłeś?',
    bezGodziny.rodzaj === 'pytania' ? bezGodziny.pytania[0]?.zdanie : bezGodziny.rodzaj);

  check('(7) ⛔ nieznany rodzaj NIE wypływa do zdania jako surowa wartość ani jako '
    + 'komunikat diagnostyczny — zostaje tytuł zawodnika',
    zdaniePytania({ nazwaRodzaju: null, tytul: 'Bieg z Mateuszem', kiedy: 'dzis', godzina: null })
      === 'Bieg z Mateuszem dziś — zrobiłeś?');
}

// ═══════════════════════════════════════════════════════════════════
// URUCHOMIENIE BATERII NA PRAWDZIWYCH ZASADACH
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══ BATERIA D2 — PRAWDZIWE ZASADY ═══');
const przedBaterii = { p: passed, f: failed };
grupa1(ZASADY_PRAWDZIWE_PYTAN);
grupa2(ZASADY_PRAWDZIWE_PYTAN);
grupa3(ZASADY_PRAWDZIWE_PYTAN);
grupa4(ZASADY_PRAWDZIWE_PYTAN);
grupa6(ZASADY_PRAWDZIWE_PYTAN);
grupa7(ZASADY_PRAWDZIWE_PYTAN);
const NA_PRAWDZIWYCH = failed - przedBaterii.f;
const ASERCJI_ZLICZONYCH = (passed - przedBaterii.p) + NA_PRAWDZIWYCH;
check(`⭐ bateria ma dokładnie ${ASERCJI_BATERII} asercji — liczba pilnowana, nie szacowana`,
  ASERCJI_ZLICZONYCH === ASERCJI_BATERII, `policzono ${ASERCJI_ZLICZONYCH}`);

// ═══════════════════════════════════════════════════════════════════
// GRUPA 5 — ⛔ ZERO ARYTMETYKI NA DNIACH POZA OKNEM (asercja na ŹRÓDŁO)
// ═══════════════════════════════════════════════════════════════════
//
// ⭐ TA GRUPA NIE PATRZY NA WYNIK, TYLKO NA KOD. Reguła, która policzy „ile
// dni z rzędu", może dziś dawać poprawne liczby i mimo to nieść w sobie
// zakazaną możliwość — a pierwszy ekran, który sięgnie po to pole, zbuduje
// passę (N1). Ten sam ruch, co asercja grupy 2 strażnika pasa D1.

console.log('\n═══ GRUPA 5 — ŹRÓDŁO REGUŁY ═══');

function zywy(kod: string): string {
  return kod.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}
function zrodloAlboNull(...czesci: string[]): string | null {
  const p = join(root, ...czesci);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

const surowyModul = zrodloAlboNull('lib', 'pytanieOWystapienie.ts');
check('(5) ⭐ `lib/pytanieOWystapienie.ts` ISTNIEJE — bez niego reszta tej grupy '
  + 'milczałaby przez brak pliku, a nie przez czystość',
  surowyModul !== null, 'pliku reguły nie ma na dysku');

const modul = zywy(surowyModul ?? '');

check('(5) ⛔ reguła NIE CZYTA ZEGARA — „dziś" jest argumentem',
  modul !== '' && !/new Date\(\)|Date\.now\(/.test(modul), 'w regule stoi odczyt zegara');

const uzyciaPrzesun = (modul.match(/przesunDate\(/g) ?? []).length;
check('(5) ⭐ DOKŁADNIE JEDNA arytmetyka na dniach w całym pliku i jest to `-1` '
  + '(O73 — równość, nie „≥ 1")',
  uzyciaPrzesun === 1 && /przesunDate\(we\.dzis, -1\)/.test(modul),
  `${uzyciaPrzesun} wywołań przesunDate`);

check('(5) ⛔ w regule nie ma odejmowania milisekund ani własnej arytmetyki dat',
  modul !== '' && !/86400000|getTime\(|Date\.parse\(/.test(modul),
  'reguła liczy daty po swojemu zamiast wołać `przesunDate`');

check('(5) ⛔ reguła nie zna pojęcia serii, passy ani dni z rzędu',
  modul !== '' && !/(zRzedu|zRzędu|seri[ae]|passa|streak)/i.test(modul),
  'w regule pojawiło się pojęcie ciągłości dni');

check('(5) ⭐ reguła WOŁA silnik pasa D1, a nie ma własnej kopii rozstrzygnięcia',
  /akcjaDlaWystapienia\(/.test(modul) && /werdyktDlaWystapienia\(/.test(modul)
  && !/status === 'cancelled'/.test(modul),
  'druga kopia reguły wykonania wjechała do pliku pytań');

check('(5) ⛔ okno jest porównaniem NA RÓWNOŚĆ z dwiema datami, nie zakresem',
  /dzien === we\.dzis/.test(modul) && /dzien === wczoraj/.test(modul)
  && !/dzien >=|dzien <=/.test(modul),
  'okno stało się zakresem — a zakres da się rozszerzyć niepostrzeżenie');

check('(5) ⛔ kształt wyniku nie niesie liczby zaległości spoza okna',
  modul !== '' && !/zaleglosci|bezOdpowiedzi:|niezapytane/i.test(modul),
  'w kształcie wyniku pojawiła się lista zaległości');

// ═══════════════════════════════════════════════════════════════════
// GRUPA 8 — EKRAN. ⚠️ O71: WYCINAMY INSTRUKCJĘ, NIE SZUKAMY FRAZY.
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══ GRUPA 8 — EKRAN `app/(tabs)/dzis.tsx` ═══');

const surowyEkran = zrodloAlboNull('app', '(tabs)', 'dzis.tsx');
check('(8) `app/(tabs)/dzis.tsx` istnieje i da się go przeczytać',
  surowyEkran !== null, 'nie znalazłem ekranu');
const ekranSurowy = surowyEkran ?? '';
const ekran = zywy(ekranSurowy);

/** Wycina ciało funkcji od nagłówka do pierwszego `\n  }` na poziomie funkcji. */
function cialo(kod: string, naglowek: string): string {
  const i = kod.indexOf(naglowek);
  if (i < 0) return '';
  const j = kod.indexOf('\n  }', i);
  return j < 0 ? kod.slice(i) : kod.slice(i, j + 4);
}

const cialoZapisu = cialo(ekran, 'async function odpowiedzNaWystapienie');
check('(8) ekran ma funkcję zapisu odpowiedzi',
  cialoZapisu !== '', 'brak `odpowiedzNaWystapienie` w ekranie');

check('(8) ⭐ ZAPIS WOŁA `.select(\'id\')` — dowodem jest LICZBA ZWRÓCONYCH WIERSZY (O61)',
  /\.select\('id'\)/.test(cialoZapisu), 'zapis nie prosi bazy o zwrócenie wiersza');

check('(8) ⭐ ZERO WIERSZY BEZ BŁĘDU TO PORAŻKA, nie sukces (O61)',
  /length === 0/.test(cialoZapisu) && /Nie udało się zapisać/.test(cialoZapisu),
  'ekran uzna pustą odpowiedź bazy za zapisany werdykt');

check('(8) zapis idzie `upsert`-em po `(calendar_event_id, occurred_on)` — wzorzec z Kalendarza',
  /\.upsert\(/.test(cialoZapisu)
  && /onConflict: 'calendar_event_id,occurred_on'/.test(cialoZapisu)
  && /withdrawn_at: null/.test(cialoZapisu),
  'zapis nie powtarza wzorca z `kalendarz.tsx` — wróci `23505` po „Cofnij"');

check('(8) ⛔ PAS NIE ZAPISUJE `odbylo_sie` SAM Z SIEBIE — wartość jest ARGUMENTEM, '
  + 'a jedyne wywołanie stoi w `onPress`',
  /verdict: werdykt/.test(cialoZapisu)
  && !/verdict: 'odbylo_sie'/.test(cialoZapisu)
  && /onPress=\{\(\) => odpowiedzNaWystapienie\(p, w\)\}/.test(ekran),
  'ekran może zapisać „zrobione" bez dotknięcia zawodnika');

check('(8) ⛔ ekran nie buduje drugiego mechanizmu śladu — `previous_verdict` '
  + 'i `changed_at` stawia wyzwalacz',
  !/previous_verdict|changed_at/.test(cialoZapisu),
  'ekran dopisuje ślad zmiany zdania obok wyzwalacza');

const cialoRenderu = cialo(ekran, 'function renderPytaniaOWystapienia');
check('(8) ekran ma render pytania',
  cialoRenderu !== '', 'brak `renderPytaniaOWystapienia`');

check('(8) ⭐ render jest WOŁANY w JSX, a nie tylko zdefiniowany',
  /\{renderPytaniaOWystapienia\(\)\}/.test(ekran), 'render zdefiniowany i nieużyty');

// ⭐ PRZECELOWANE 18.08.2026 (pas S2) — REGUŁA TA SAMA, DWA EKRANY ZAMIAST
// JEDNEGO. GDZIE PYTAŁA: kolejność dwóch bloków w `app/(tabs)/dzis.tsx`
// (pytanie miało stać NAD licznikiem). GDZIE PYTA: o to, że licznik pracy
// NIE STOI JUŻ NA TYM EKRANIE WCALE, a pytanie stoi.
// DLACZEGO: pas A1 zdjął licznik z „Dziś" (makieta v3, 807 dp przy zgięciu
// 808), a pas S2 postawił go na „Profilu" → „Skąd to wiemy". Zawodnik spotyka
// więc PYTANIE na pierwszym ekranie, a ODPOWIEDŹ „N z M" o ekran dalej —
// czyli pytanie nadal poprzedza odpowiedź, tylko w czasie, nie w pikselach.
// ⛔ RÓWNIE MOCNA, a w jedną stronę MOCNIEJSZA: powrót licznika na ekran
// „Dziś" — w JAKIEKOLWIEK miejsce, także pod pytanie — zapala ją tak samo,
// a dodatkowo zapala, gdy licznik zniknie z pliku, który go dziś rysuje.
const iPytanie = ekran.indexOf('{renderPytaniaOWystapienia()}');
const iLicznikNaDzis = ekran.indexOf('{renderLicznikPracy()}');
const blokPracy = zywy(zrodloAlboNull('components', 'PracaWLiczbach.tsx') ?? '');
const iLicznikWBloku = blokPracy.indexOf('{renderLicznikPracy()}');
check('(8) ⭐ PYTANIE JEST NA EKRANIE 1, A LICZNIK PRACY O EKRAN DALEJ — pytanie przed odpowiedzią',
  iPytanie > 0 && iLicznikNaDzis === -1 && iLicznikWBloku > 0,
  `pytanie @${iPytanie} (dzis.tsx) · licznik na „Dziś" @${iLicznikNaDzis} `
  + `(ma być −1) · licznik w bloku pracy @${iLicznikWBloku} (Profil → „Skąd to wiemy")`);

check('(8) ⭐ ZDANIE PYTAJĄCE NAPRAWDĘ TRAFIA DO <Text>, nie jest tylko policzone',
  /<Text style=\{styles\.licznikLiczba\}>\{p\.zdanie\}<\/Text>/.test(cialoRenderu),
  'zdanie nie wchodzi do żadnego <Text>');

check('(8) ⭐ przyciski niosą ISTNIEJĄCE brzmienia `PLAKIETKI_STANU_PRZESZLEGO`, '
  + 'a nie trzecie słowo na to samo',
  /PLAKIETKI_STANU_PRZESZLEGO\[w\]/.test(cialoRenderu),
  'ekran wymyślił własne napisy na przyciskach');

check('(8) ⭐ stan „nie wiem" NIE jest wyciszony wcześniejszym `return null` (R5)',
  cialoRenderu.indexOf("rodzaj === 'nie_wiem'") > 0
  && cialoRenderu.indexOf("rodzaj === 'nie_wiem'") < cialoRenderu.indexOf("rodzaj !== 'pytania'"),
  'gałąź awarii odczytu stoi za wyjściem z funkcji i nigdy się nie narysuje');

check('(8) ⭐ brzmienie awarii idzie przez `rozpoznajPustke` — zero nowych zdań (R5)',
  /rozpoznajPustke\(\{/.test(cialoRenderu) && /odczytUdanySie: false/.test(cialoRenderu),
  'ekran napisał własne zdanie o awarii odczytu');

check('(8) ⛔ ekran NIE POKAZUJE, ile pytań zostało bez odpowiedzi — to byłaby '
  + 'lista zaległości',
  !/ilePytamy\(/.test(cialoRenderu),
  'liczba pytań bez odpowiedzi trafiła na ekran');

// ── ZAKAZANE SŁOWA — NA TEKŚCIE CAŁEGO PLIKU (N1, N3) ──────────────
// ⚠️ WZORCE ZE SŁOWEM, NIE PODCIĄGIEM — wzięte co do znaku ze strażnika pasa
// F1 (`lib/kartaDzisILicznik.selftest.ts`, grupa F1-4). Pierwsza wersja tej
// asercji szukała podciągu „seri" i ZAPALIŁA SIĘ NA POPRAWNYM KODZIE:
// `currentUserId` zawiera „serI". Strażnik, który zapala się na czystym
// pliku, zostaje wyciszony przy pierwszej okazji.
const ZAKAZANE: readonly (readonly [string, RegExp])[] = [
  ['seria', /\bseri(a|i|e|ę|ą|ach|om|ami)\b/i],
  ['passa', /\bpass(a|y|ie|ę|ą)\b/i],
  ['z rzędu', /z\s+rzędu/i],
  ['streak', /\bstreak/i],
  ['codziennie', /\bcodzienn/i],
  ['nie przerwij', /nie\s+przerw/i],
];
const znalezione = ZAKAZANE.filter(([, r]) => r.test(ekran)).map(([s]) => s);
check(`(8) ⛔ ZERO z ${ZAKAZANE.length} zakazanych słów o ciągłości w całym \`dzis.tsx\` (N1)`,
  znalezione.length === 0, `znalezione: ${znalezione.join(', ')}`);

check('(8) ⛔ ekran nie wysyła powiadomień push przy pytaniu',
  !/schedulePush|sendPush|Notifications\.schedule/.test(ekran),
  'pytanie zaczepia zawodnika powiadomieniem');

check('(8) ⛔ zero porównania z innymi zawodnikami (N3)',
  !/(ranking|miejsce w tabeli|lepszy niż|inni zawodnicy)/i.test(ekran),
  'na ekranie pojawiło się porównanie z innymi');

check('(8) ⛔ ekran nie pyta „dlaczego nie" — to konfrontacja (M1)',
  !/Dlaczego (nie|się nie)/i.test(ekran),
  'ekran prosi o powód nieodbycia sesji');

check('(8) ⭐ ekran RYSUJE wynik reguły, a nie liczy okna po swojemu',
  /zbudujPytaniaOWystapienia\(/.test(ekran)
  && !/=== 'wczoraj' \? .* : .*przesunDate/.test(ekran)
  && !/dzien === wczoraj/.test(ekran),
  'ekran ma własną kopię okna „wczoraj i dziś"');

// ── ⚠️ O69: PRZEMIATANIE ODKRYWA KATALOG, NIE MA LISTY NA SZTYWNO ──
//
// ⭐ ZAPADKA NA RÓWNOŚĆ (O73): miejsc zapisu werdyktu mają być DOKŁADNIE DWA
// — Kalendarz (droga dla kogoś, kto porządkuje tydzień wstecz) i karta „Dziś"
// (produkt pyta sam). Trzecie byłoby trzecim źródłem prawdy o tym samym
// wystąpieniu, a zapadka na „≥ 1" przepuściłaby je bez słowa.
const katalogEkranow = join(root, 'app', '(tabs)');
const ekranyZZapisem = existsSync(katalogEkranow)
  ? readdirSync(katalogEkranow)
    .filter((f) => f.endsWith('.tsx'))
    .filter((f) => /\.from\('session_verdicts'\)[\s\S]{0,400}?(upsert|insert|update)\(/
      .test(zywy(readFileSync(join(katalogEkranow, f), 'utf8'))))
    .sort()
  : [];
check('(8) ⭐ DOKŁADNIE DWA ekrany zapisują werdykt: `dzis.tsx` i `kalendarz.tsx` '
  + '(katalog odkryty, nie wpisany — O69; równość, nie „≥ 1" — O73)',
  ekranyZZapisem.join(',') === 'dzis.tsx,kalendarz.tsx',
  `znalezione: ${ekranyZZapisem.join(', ') || 'brak'}`);

// ⛔ KALENDARZ ZOSTAJE NIETKNIĘTY — to jest decyzja Kuby, nie skutek uboczny.
const kalendarz = zrodloAlboNull('app', '(tabs)', 'kalendarz.tsx');
check('(8) ⛔ droga „Nie odbyłem" w Kalendarzu ZOSTAJE — pas D2 jej nie kasuje',
  kalendarz !== null && /oznaczNieodbyte/.test(kalendarz) && /cofnijWerdykt/.test(kalendarz),
  'akcja werdyktu zniknęła z Kalendarza');

// ═══════════════════════════════════════════════════════════════════
// SZEŚĆ MUTACJI — ⛔ COFNIĘCIE STRUKTURALNE
// ═══════════════════════════════════════════════════════════════════
//
// ⚠️ Mutacje żyją WYŁĄCZNIE w obiektach `ZasadyPytan` przekazywanych do
// baterii. Ani jedna nie dotyka dysku, `dzis.tsx` ani modułu reguły —
// ⛔ COFNIĘCIE JEST STRUKTURALNE: nie ma czego cofać, bo nic nie zmieniono.
// Produkcyjny wołający drugiego argumentu NIE PODAJE (asercja niżej), więc
// mutacja nie ma jak wejść na ekran zawodnika.

console.log('\n═══ SZEŚĆ MUTACJI ═══');

const MUTACJE: { nazwa: string; zasady: ZasadyPytan }[] = [
  {
    nazwa: 'M1 · ⛔ okno pęka — pytamy o CAŁĄ HISTORIĘ (powrót po chorobie = 12 pytań)',
    zasady: { ...ZASADY_PRAWDZIWE_PYTAN, oknoWczorajIDzis: false },
  },
  {
    nazwa: 'M2 · klucz to WIERSZ, nie wystąpienie (reguła cykliczna gubi wtorki)',
    zasady: { ...ZASADY_PRAWDZIWE_PYTAN, jednoNaWystapienie: false },
  },
  {
    nazwa: 'M3 · pytamy MIMO DOWODU — obok „Zrobione" staje przycisk zaprzeczenia',
    zasady: { ...ZASADY_PRAWDZIWE_PYTAN, pytamTylkoBezDowodu: false },
  },
  {
    nazwa: 'M4 · ⛔ R5 skasowane — awaria odczytu udaje „nie ma o co pytać"',
    zasady: { ...ZASADY_PRAWDZIWE_PYTAN, trzeciStanNieWiem: false },
  },
  {
    nazwa: 'M5 · werdykt WYCOFANY nadal zamyka pytanie — „Cofnij" przestaje działać',
    zasady: { ...ZASADY_PRAWDZIWE_PYTAN, wycofanyToBrakWerdyktu: false },
  },
  {
    nazwa: 'M6 · okno pęka I awaria udaje ciszę naraz',
    zasady: { ...ZASADY_PRAWDZIWE_PYTAN, oknoWczorajIDzis: false, trzeciStanNieWiem: false },
  },
];

let mutacjeOk = 0;
for (const m of MUTACJE) {
  const przedP = passed;
  const przedF = failed;
  const cichy = console.log;
  const zebrane: string[] = [];
  console.log = (...a: unknown[]) => { const s = String(a[0]); if (s.startsWith('FAIL')) zebrane.push(s); };
  grupa1(m.zasady); grupa2(m.zasady); grupa3(m.zasady); grupa4(m.zasady); grupa6(m.zasady); grupa7(m.zasady);
  const faili = failed - przedF;
  console.log = cichy;
  // Mutacja nie ma prawa zmienić wyniku baterii prawdziwej — cofamy licznik.
  passed = przedP;
  failed = przedF;

  console.log(`\n   „${m.nazwa}"`);
  console.log(`   FAIL-i przy tej mutacji: ${faili} / ${ASERCJI_BATERII}`);
  for (const f of zebrane.slice(0, 5)) console.log(`      ↳ ${f.replace(/^FAIL - /, '')}`);
  if (zebrane.length > 5) console.log(`      ↳ …i ${zebrane.length - 5} dalszych`);
  if (faili > 0) mutacjeOk += 1;
}

check(`⭐ KAŻDA z ${MUTACJE.length} mutacji zapala strażnika`,
  mutacjeOk === MUTACJE.length, `zapaliło ${mutacjeOk} z ${MUTACJE.length}`);
check('⭐ na PRAWDZIWYCH zasadach bateria jest zielona',
  NA_PRAWDZIWYCH === 0, `${NA_PRAWDZIWYCH} FAIL-i`);
check('⭐ po sześciu mutacjach prawdziwe zasady są NIETKNIĘTE',
  ZASADY_PRAWDZIWE_PYTAN.oknoWczorajIDzis && ZASADY_PRAWDZIWE_PYTAN.jednoNaWystapienie
  && ZASADY_PRAWDZIWE_PYTAN.pytamTylkoBezDowodu && ZASADY_PRAWDZIWE_PYTAN.trzeciStanNieWiem
  && ZASADY_PRAWDZIWE_PYTAN.wycofanyToBrakWerdyktu,
  'mutacja przeciekła do prawdziwych zasad');
check('⛔ PRODUKCYJNY WOŁAJĄCY NIE PODAJE ZASAD — mutacja nie ma drogi na ekran',
  !/zbudujPytaniaOWystapienia\([\s\S]{0,600}?\},\s*ZASADY/.test(ekran)
  && !/zbudujPytaniaOWystapienia\([^)]*ZasadyPytan/.test(ekran),
  'ekran podaje drugi argument — mutacja może wejść do produktu');

// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-O1 17.08.2026 — GRUPY 9–11: OCENA NA KAFLU W DNIU
// ═══════════════════════════════════════════════════════════════════
//
// ⚠️ DLACZEGO TUTAJ, A NIE W NOWYM PLIKU. Polecenie O1 §3 zabrania nowego
// strażnika wprost, ale powód jest starszy niż polecenie: `lib/ocenaZKafla.ts`
// jest DRUGĄ POŁOWĄ tej samej rozmowy z zawodnikiem. Pytanie „zrobiłeś?" i to,
// co zawodnik dokłada do odpowiedzi, rozjeżdżają się dokładnie wtedy, gdy
// pilnują ich dwa osobne pliki: jeden zmienia okno, drugi zostaje z krokami,
// które nie mają już czego dotyczyć. ⭐ Kiedy pęknie ocena z kafla, na czerwono
// ma się zapalić plik o nazwie `pytanieOWystapienie` — bo to jest to samo
// pytanie, tylko dłuższe.
//
//   (9)  ⭐ REGUŁA — kroki, powód, rodzaj pozycji, źródła wartości, jednostki.
//   (10) ⭐ EKRAN — RPE bez podpowiedzi (D3) i wszystko, co z tego wynika.
//   (11) ⭐ OSIEM MUTACJI z asercją odwrotną i `md5` przed i po.
//
// ⛔ ASERCJE D3 SĄ PO TREŚCI, NIE PO NAZWIE STAŁEJ (O88). Stała nazwana
// `RPE_BEZ_PODPOWIEDZI` mogłaby nieść piątkę i strażnik nazwany po niej
// świeciłby na zielono — dlatego pytamy o WARTOŚĆ, którą oddaje funkcja,
// i o TEKST fragmentu ekranu, który rysuje przyciski.

import {
  krokiOceny,
  rpePoczatkowe,
  podpowiedzCzasu,
  rozstrzygnijPowod,
  rozpoznajRodzajPozycji,
  sciezkaUsuniecia,
  czyOceniamy,
  wierszWerdyktu,
  wierszWpisuPoTreningu,
  wierszBolu,
  zbudujPayloadIZrodla,
  wartosciBezZrodla,
  jednostkiZOceny,
  stanNalezyDoOceny,
  rodzajSesjiDoWpisu,
  STAN_SPOZA_OCENY,
  ZASADY_PRAWDZIWE_OCENY,
  POWODY_NIEOBECNOSCI,
  czyZnanyPowod,
  RPE_WARTOSCI,
  MINUTY_DO_WYBORU,
  MAKS_MINUT,
  MAKS_RPE,
  type ZasadyOceny,
  type FaktyPozycji,
  type WagaPowodu,
} from './ocenaZKafla';
import { createHash } from 'node:crypto';

const PLIK_REGULY_O1 = join(root, 'lib', 'ocenaZKafla.ts');
const surowaRegulaO1 = existsSync(PLIK_REGULY_O1) ? readFileSync(PLIK_REGULY_O1, 'utf8') : null;

function md5(t: string): string {
  return createHash('md5').update(t, 'utf8').digest('hex');
}

// ⭐ `md5` PRZED BATERIĄ MUTACJI. Mutacje żyją wyłącznie w pamięci; ten odcisk
// i jego bliźniak na końcu grupy 11 są na to DOWODEM, a nie zapewnieniem.
const MD5_REGULY_PRZED = md5(surowaRegulaO1 ?? '');
const MD5_EKRANU_PRZED = md5(ekranSurowy);

console.log('\n═══ GRUPA 9 — REGUŁA OCENY `lib/ocenaZKafla.ts` ═══');

check('(9) ⭐ `lib/ocenaZKafla.ts` ISTNIEJE — bez niego reszta tej grupy milczałaby '
  + 'przez brak pliku, a nie przez czystość',
  surowaRegulaO1 !== null, 'pliku reguły oceny nie ma na dysku');

const regulaO1 = zywy(surowaRegulaO1 ?? '');

check('(9) ⛔ reguła NIE CZYTA ZEGARA ani bazy — inaczej nie da się jej sprawdzić bez sieci',
  regulaO1 !== '' && !/new Date\(\)|Date\.now\(|supabase/.test(regulaO1),
  'w regule oceny stoi zegar albo klient bazy');

// ── ⭐ D2 — CZTERY KROKI, Z KTÓRYCH PIERWSZY SAM WYSTARCZA ─────────
{
  const bezOdpowiedzi = krokiOceny(null);
  const poTak = krokiOceny('odbylo_sie');
  const poNie = krokiOceny('nie_odbylo_sie');
  const widoczne = (k: readonly { id: string; widoczny: boolean }[]) =>
    k.filter((x) => x.widoczny).map((x) => x.id).sort().join(',');

  check('(9) ⭐ D2 — PRZED ODPOWIEDZIĄ WIDAĆ WYŁĄCZNIE KROK 1',
    widoczne(bezOdpowiedzi) === 'odbylo_sie', widoczne(bezOdpowiedzi));

  // ⚠️ KROK 1 ZOSTAJE WIDOCZNY PO ODPOWIEDZI I TO JEST DECYZJA, NIE NIEDOPATRZENIE:
  // zawodnik, który dotknął nie tego przycisku, ma go poprawić w tym samym
  // miejscu, a nie szukać drugiego ekranu (P0, wzorzec stanu `odpowiedziane`).
  check('(9) ⭐ D2 — po „zrobione" dochodzą czas z RPE i ból, ⛔ NIE powód',
    widoczne(poTak) === 'bol,czas_i_rpe,odbylo_sie', widoczne(poTak));

  check('(9) ⭐ D2 — po „nie odbyło się" dochodzą powód i ból, ⛔ NIE RPE '
    + '(pytanie o ciężkość sesji, której nie było, nie ma treści)',
    widoczne(poNie) === 'bol,odbylo_sie,powod', widoczne(poNie));

  const dalsze = [...poTak, ...poNie].filter((k) => k.id !== 'odbylo_sie');
  check('(9) ⭐ D2 — ⛔ ANI JEDEN krok poza pierwszym nie jest obowiązkowy '
    + 'i ⛔ ANI JEDEN nie jest rozwinięty (zapadka na RÓWNOŚĆ, O73)',
    dalsze.length > 0 && dalsze.every((k) => k.obowiazkowy === false && k.zwiniety === true),
    `${dalsze.filter((k) => k.obowiazkowy || !k.zwiniety).map((k) => k.id).join(', ') || 'brak'}`);

  check('(9) ⭐ D2 — KROK 1 JEST OBOWIĄZKOWY i ROZWINIĘTY w każdym stanie',
    [bezOdpowiedzi, poTak, poNie].every((k) => {
      const p = k.find((x) => x.id === 'odbylo_sie');
      return p !== undefined && p.obowiazkowy && !p.zwiniety && p.widoczny;
    }), 'pierwszy krok przestał być jedyną rzeczą, która wystarcza');
}

// ── ⭐ ASERCJA URUCHOMIENIOWA D2 — SAMO „ODBYŁO SIĘ" DAJE POPRAWNY WIERSZ ──
{
  const wiersz = wierszWerdyktu({
    idZawodnika: '0be298a2-5e66-4ee2-8b57-15e6b6765c83',
    idWydarzenia: 33,
    dzien: '2026-08-17',
    werdykt: 'odbylo_sie',
    powod: null,
  });
  check('(9) ⭐⭐ D2 URUCHOMIENIOWO — SAMA ODPOWIEDŹ „odbyło się", BEZ RPE '
    + 'i BEZ CZASU, produkuje POPRAWNY wiersz werdyktu',
    wiersz.verdict === 'odbylo_sie'
    && wiersz.origin === 'player'
    && wiersz.withdrawn_at === null
    && wiersz.absence_reason === null
    && wiersz.calendar_event_id === 33
    && wiersz.occurred_on === '2026-08-17',
    JSON.stringify(wiersz));

  check('(9) ⛔ wiersz werdyktu NIE NIESIE ŚLADU ZMIANY — stawia go wyzwalacz, '
    + 'a polityka RLS `session_verdicts_insert_own` wprost tego zabrania (D9)',
    !('previous_verdict' in wiersz) && !('changed_at' in wiersz),
    Object.keys(wiersz).join(', '));

  // ⛔ CHECK `session_verdicts_powod_tylko_przy_nieodbyciu` — PRZENIESIONY
  // PRZED WYSYŁKĘ. Bez tego zmiana zdania z „nie odbyło się" na „zrobione"
  // wracałaby kodem `23514`, czyli błędem przy ruchu, do którego zawodnik
  // ma pełne prawo (D9).
  const zPowodemPrzyTak = wierszWerdyktu({
    idZawodnika: 'x', idWydarzenia: 1, dzien: '2026-08-17', werdykt: 'odbylo_sie', powod: 'kontuzja',
  });
  check('(9) ⭐ D9 — POWÓD ZNIKA przy zmianie zdania na „zrobione" '
    + '(inaczej `upsert` zostawiłby go i baza odrzuciłaby poprawny ruch)',
    zPowodemPrzyTak.absence_reason === null, String(zPowodemPrzyTak.absence_reason));

  const zPowodemPrzyNie = wierszWerdyktu({
    idZawodnika: 'x', idWydarzenia: 1, dzien: '2026-08-17', werdykt: 'nie_odbylo_sie', powod: 'kontuzja',
  });
  check('(9) ⭐ …a przy „nie odbyło się" powód ZOSTAJE',
    zPowodemPrzyNie.absence_reason === 'kontuzja', String(zPowodemPrzyNie.absence_reason));
}

// ── ⭐ D3 — RPE BEZ PODPOWIEDZI, CZAS Z PODPOWIEDZIĄ ────────────────
{
  check('(9) ⭐⭐ D3 — `rpePoczatkowe()` ODDAJE `null`. ⛔ Sprawdzone po WARTOŚCI, '
    + 'nie po nazwie stałej (O88)',
    rpePoczatkowe() === null, String(rpePoczatkowe()));

  check('(9) ⭐ D3 — ⛔ w całym module NIE MA funkcji, która mogłaby RPE podpowiedzieć',
    regulaO1 !== '' && !/podpowiedzRpe|domyslneRpe|rpeDomyslne|sugerowaneRpe/i.test(regulaO1),
    'w module reguły powstała droga podpowiadania RPE');

  check('(9) ⭐ D3 — ⛔ moduł nie zna suwaka',
    regulaO1 !== '' && !/[Ss]lider|uchwyt/.test(regulaO1),
    'w module reguły pojawił się suwak');

  check(`(9) ⭐ D3 — RPE ma ${RPE_WARTOSCI.length} wartości i ANI JEDNA nie jest wyróżniona`,
    RPE_WARTOSCI.length === 10 && RPE_WARTOSCI[0] === 1 && RPE_WARTOSCI[9] === MAKS_RPE,
    RPE_WARTOSCI.join(','));

  // ⭐ ASERCJA ODWROTNA — bez niej „nic nie jest podpowiadane" dałoby się
  // spełnić, wyłączając podpowiadanie WSZĘDZIE, i strażnik by tego nie zauważył.
  const zPlanu = podpowiedzCzasu(45);
  check('(9) ⭐⭐ D3 ODWROTNIE — CZAS TRWANIA PODPOWIEDŹ MA: plan 45 min '
    + 'daje podpowiedź ze źródłem `plan`',
    zPlanu.jest === true && zPlanu.minuty === 45 && zPlanu.zrodlo === 'plan',
    JSON.stringify(zPlanu));

  check('(9) ⛔ …a plan, który nic nie mówi, NIE dostaje wypełniacza — dostaje powód',
    podpowiedzCzasu(null).jest === false
    && podpowiedzCzasu(null).jest === false
    && !podpowiedzCzasu(null).jest,
    JSON.stringify(podpowiedzCzasu(null)));

  check('(9) ⛔ podpowiedź spoza zakresu bazy NIE WCHODZI '
    + `(\`chk_daily_logs_payload_ranges\`: duration_minutes ≤ ${MAKS_MINUT})`,
    podpowiedzCzasu(MAKS_MINUT + 1).jest === false && podpowiedzCzasu(0).jest === false,
    `${MAKS_MINUT + 1} → ${JSON.stringify(podpowiedzCzasu(MAKS_MINUT + 1))}`);

  check('(9) ⭐ długości do wyboru mieszczą się w granicy bazy — zapadka na RÓWNOŚĆ z CHECK-iem',
    MINUTY_DO_WYBORU.every((m) => m > 0 && m <= MAKS_MINUT),
    MINUTY_DO_WYBORU.join(','));
}

// ── ⭐ D4 — KAŻDA WARTOŚĆ MA WPIS O ŹRÓDLE. ZAPADKA NA RÓWNOŚĆ ──────
{
  const p = zbudujPayloadIZrodla([
    { klucz: 'duration_minutes', liczba: 90, zrodlo: 'plan' },
    { klucz: 'rpe', liczba: 7, zrodlo: 'zawodnik' },
    { klucz: 'post_fatigue', liczba: 4, zrodlo: 'zawodnik' },
  ]);
  const ileWartosci = Object.keys(p.payload).length;
  const ileZrodel = Object.keys(p.data_sources).length;

  check('(9) ⭐⭐ D4 ZAPADKA NA RÓWNOŚĆ — liczba wartości RÓWNA SIĘ liczbie wpisów '
    + 'o źródle (O73: „≥" przepuściłoby dokładnie ten defekt, przed którym stoi)',
    ileWartosci === 3 && ileZrodel === 3 && ileWartosci === ileZrodel,
    `wartości ${ileWartosci}, źródeł ${ileZrodel}`);

  check('(9) ⭐ D4 — ⛔ ZERO wartości bez wpisu o źródle',
    wartosciBezZrodla(p).length === 0, wartosciBezZrodla(p).join(', '));

  check('(9) ⭐ D4 — źródło jest FAKTEM O TEJ WARTOŚCI: czas z planu ma `plan`, '
    + 'RPE ma `zawodnik` i nie ma jak dostać niczego innego',
    p.data_sources.duration_minutes === 'plan' && p.data_sources.rpe === 'zawodnik',
    JSON.stringify(p.data_sources));

  const pozaZakresem = zbudujPayloadIZrodla([
    { klucz: 'rpe', liczba: MAKS_RPE + 1, zrodlo: 'zawodnik' },
    { klucz: 'duration_minutes', liczba: MAKS_MINUT + 1, zrodlo: 'zawodnik' },
    { klucz: 'wymyslona', liczba: 1, zrodlo: 'zawodnik' },
  ]);
  check('(9) ⛔ wartość spoza CHECK-a bazy NIE WCHODZI ANI DO JEDNEJ MAPY — '
    + 'wiersz odrzucony przez `23514` zabrałby ze sobą także te poprawne',
    Object.keys(pozaZakresem.payload).length === 0
    && Object.keys(pozaZakresem.data_sources).length === 0,
    JSON.stringify(pozaZakresem));
}

// ── ⭐ D5 — WPIS WSKAZUJE WYDARZENIE ───────────────────────────────
{
  const wpis = wierszWpisuPoTreningu({
    idZawodnika: 'x', idWydarzenia: 16, eventType: 'micro_session',
    wartosci: [{ klucz: 'rpe', liczba: 6, zrodlo: 'zawodnik' }],
  });
  check('(9) ⭐⭐ D5 — WPIS PO TRENINGU WSKAZUJE WYDARZENIE '
    + '(17.08.2026 takich wpisów było 0 z 10)',
    wpis.calendar_event_id === 16, String(wpis.calendar_event_id));

  check('(9) ⭐ D5 — wpis spełnia `chk_session_type_matches_entry`: '
    + '`post_training` MA `session_type`',
    wpis.entry_type === 'post_training' && typeof wpis.session_type === 'string' && wpis.session_type !== '',
    `${wpis.entry_type} / ${wpis.session_type}`);

  const DOPUSZCZALNE_SESJE = ['club_training', 'own_training', 'micro_session', 'match', 'other'];
  const rodzajeWydarzen = ['club_training', 'own_training', 'micro_session', 'task', 'match', 'cos_nowego', null];
  const wyniki = rodzajeWydarzen.map((r) => rodzajSesjiDoWpisu(r));
  check('(9) ⛔ KAŻDY rodzaj wydarzenia — także NIEZNANY — mapuje się na wartość, '
    + 'którą `daily_logs_session_type_check` przyjmie',
    wyniki.every((w) => DOPUSZCZALNE_SESJE.includes(w)),
    wyniki.join(', '));

  check('(9) ⛔ rodzaj NIEZNANY idzie do `other`, a nie surową wartością do bazy (R5)',
    rodzajSesjiDoWpisu('cos_nowego') === 'other' && rodzajSesjiDoWpisu(null) === 'other',
    `${rodzajSesjiDoWpisu('cos_nowego')} / ${rodzajSesjiDoWpisu(null)}`);

  const bol = wierszBolu({
    idZawodnika: 'x', idWpisu: 7, miejsce: 'lydka', strona: null, natezenie: 6, wykluczaZTreningu: false,
  });
  check('(9) ⭐ ból WISI NA WPISIE — `pain_entries_owner` wymaga `daily_log_id`',
    bol !== null && bol.daily_log_id === 7 && bol.intensity === 6, JSON.stringify(bol));

  check('(9) ⛔ ból bez miejsca NIE POWSTAJE — `body_location` jest NOT NULL',
    wierszBolu({ idZawodnika: 'x', idWpisu: 7, miejsce: '  ', strona: null, natezenie: 6, wykluczaZTreningu: false }) === null,
    'pusty `body_location` przeszedł dalej');
}

// ── ⭐ D6 — TRZY RODZAJE POZYCJI I ŚCIEŻKA USUNIĘCIA ───────────────
{
  const f = (o: Partial<FaktyPozycji>): FaktyPozycji => ({
    idWydarzenia: o.idWydarzenia === undefined ? 1 : o.idWydarzenia,
    eventType: o.eventType === undefined ? 'micro_session' : o.eventType,
    source: o.source === undefined ? 'system' : o.source,
    maSesjeTrenera: o.maSesjeTrenera === true,
  });

  const TABELA: readonly [string, FaktyPozycji, string][] = [
    ['sesja Bloku (system)', f({ eventType: 'micro_session' }), 'wlasna_praca'],
    ['własny trening', f({ eventType: 'own_training', source: 'player' }), 'wlasna_praca'],
    ['zadanie zawodnika', f({ eventType: 'task', source: 'player' }), 'wlasna_praca'],
    ['trening klubowy', f({ eventType: 'club_training', source: 'player' }), 'zobowiazanie'],
    ['mecz', f({ eventType: 'match', source: 'player' }), 'zobowiazanie'],
    ['cokolwiek od trenera', f({ eventType: 'micro_session', maSesjeTrenera: true }), 'zobowiazanie'],
    ['cokolwiek ze źródła coach', f({ eventType: 'own_training', source: 'coach' }), 'zobowiazanie'],
    ['ankieta / wgląd (brak wiersza)', f({ idWydarzenia: null }), 'rzecz_produktu'],
  ];
  const bledy = TABELA.filter(([, fakty, oczekiwany]) => {
    const r = rozpoznajRodzajPozycji(fakty);
    return !r.znany || r.rodzaj !== oczekiwany;
  }).map(([n]) => n);
  check(`(9) ⭐ D6 — ${TABELA.length} pozycji rozpoznanych Z DANYCH, ZERO z tytułu`,
    bledy.length === 0, `źle: ${bledy.join(', ')}`);

  // ⛔ O84 — TO JEST ASERCJA, DLA KTÓREJ POWSTAŁA CAŁA GAŁĄŹ „NIE WIEM".
  const nowyRodzaj = rozpoznajRodzajPozycji(f({ eventType: 'zupelnie_nowy_rodzaj' }));
  check('(9) ⭐⭐ D6 / O84 — RODZAJ, KTÓREGO APPKA NIE ZNA, daje JAWNE „nie wiem", '
    + '⛔ a nie ciche wpadnięcie do „własnej pracy" (bo tamto pozwala usuwać)',
    nowyRodzaj.znany === false, JSON.stringify(nowyRodzaj));

  const usuwalne = TABELA
    .filter(([, fakty]) => sciezkaUsuniecia(rozpoznajRodzajPozycji(fakty)).jest)
    .map(([n]) => n).sort();
  check('(9) ⭐⭐ D6 — ⛔ ZOBOWIĄZANIA NIE MAJĄ ŚCIEŻKI USUNIĘCIA, własna praca MA '
    + '(zapadka na RÓWNOŚĆ listy, nie na jej długość)',
    usuwalne.join(' | ') === 'sesja Bloku (system) | własny trening | zadanie zawodnika',
    `usuwalne: ${usuwalne.join(' | ')}`);

  check('(9) ⛔ pozycja o NIEZNANYM rodzaju zachowuje się jak zobowiązanie — '
    + 'z dwóch możliwych pomyłek ta druga jest nieodwracalna',
    sciezkaUsuniecia(nowyRodzaj).jest === false, 'nieznany rodzaj dostał prawo usunięcia');

  check('(9) ⛔ RZECZY PRODUKTU SIĘ NIE OCENIA, a nieznanej pozycji też nie',
    czyOceniamy(rozpoznajRodzajPozycji(f({ idWydarzenia: null }))) === false
    && czyOceniamy(nowyRodzaj) === false
    && czyOceniamy(rozpoznajRodzajPozycji(f({ eventType: 'club_training' }))) === true,
    'ocena trafiła na rzecz, o której nie ma czego orzekać');
}

// ── ⭐ D7 — POWÓD MA TRZY WARTOŚCI, NIE DWIE ───────────────────────
{
  const wagi = new Set<WagaPowodu>();
  const TABELA_POWODOW: readonly [string | null, WagaPowodu][] = [
    ['kontuzja', 'nie_liczy_sie'],
    ['choroba', 'nie_liczy_sie'],
    ['szkola', 'nie_liczy_sie'],
    ['rodzina', 'nie_liczy_sie'],
    ['inny', 'liczy_sie'],
    // ⭐ SZÓSTY POWÓD — decyzja Kuby 18.08.2026. ⛔ ANI `liczy_sie` (karałoby za
    // skorzystanie z przycisku, który produkt sam podstawił), ANI `nie_liczy_sie`
    // (twierdziłoby, że powód był niezależny — a tego NIE WIEMY, Z0).
    ['nie_podam', 'nie_wiemy'],
    [null, 'nie_wiemy'],
    ['', 'nie_wiemy'],
    ['cos_spoza_checka', 'nie_wiemy'],
  ];
  const zle = TABELA_POWODOW.filter(([w, oczekiwana]) => {
    const r = rozstrzygnijPowod(w);
    wagi.add(r.waga);
    return r.waga !== oczekiwana;
  }).map(([w]) => String(w));

  check(`(9) ⭐ D7 — ${TABELA_POWODOW.length} wejść rozstrzygniętych zgodnie z decyzją Kuby`,
    zle.length === 0, `źle: ${zle.join(', ')}`);

  check('(9) ⭐⭐ D7 — funkcja oddaje TRZY WARTOŚCI, nie dwie (zapadka na RÓWNOŚĆ, O73)',
    wagi.size === 3, `oddała ${wagi.size}: ${[...wagi].sort().join(', ')}`);

  check('(9) ⭐⭐ D7 — ⛔ BRAK POWODU DAJE „NIE WIEMY", a NIE „liczy się" (R5). '
    + 'Milczenie zawodnika nie jest oświadczeniem o niczym',
    rozstrzygnijPowod(null).waga === 'nie_wiemy'
    && rozstrzygnijPowod(null).waga !== 'liczy_sie',
    rozstrzygnijPowod(null).waga);

  check('(9) ⛔ …i ma POWÓD także wtedy, gdy nie wie (inaczej za miesiąc nikt nie odtworzy czemu)',
    rozstrzygnijPowod(null).powod !== '' && rozstrzygnijPowod('cos_spoza_checka').powod.includes('cos_spoza_checka'),
    JSON.stringify(rozstrzygnijPowod(null)));

  check('(9) ⭐ sześć powodów co do znaku jak `session_verdicts_absence_reason_enum` '
    + '(⛔ `szkola` BEZ polskich znaków, ⛔ `nie_podam` z PODKREŚLNIKIEM — skrót albo '
    + '„poprawka" przy przepisywaniu nie rzuca błędem, tylko po cichu rozjeżdża dopasowanie)',
    POWODY_NIEOBECNOSCI.join(',') === 'kontuzja,choroba,szkola,rodzina,inny,nie_podam',
    POWODY_NIEOBECNOSCI.join(','));

  // ═══ „NIE PODAM" — decyzja Kuby 18.08.2026 ═══════════════════════
  check('(9) ⭐⭐ „nie podam" NIE LICZY SIĘ PRZECIWKO ZAWODNIKOWI — ⛔ przycisk, '
    + 'który kosztuje, przestaje być wyjściem i staje się pułapką',
    rozstrzygnijPowod('nie_podam').waga !== 'liczy_sie',
    rozstrzygnijPowod('nie_podam').waga);
  check('(9) ⭐⭐ …ale TEŻ NIE UDAJE, że wie, iż powód był niezależny (Z0) — oddaje „nie wiemy"',
    rozstrzygnijPowod('nie_podam').waga === 'nie_wiemy',
    rozstrzygnijPowod('nie_podam').waga);
  check('(9) ⛔ ŚWIADOMA ODMOWA i MILCZENIE to DWA RÓŻNE FAKTY — ta sama waga, ale INNY powód. '
    + 'Bez tego rozróżnienia baza nie odpowie, czy w ogóle zapytaliśmy',
    rozstrzygnijPowod('nie_podam').powod !== rozstrzygnijPowod(null).powod
    && rozstrzygnijPowod('nie_podam').powod !== '',
    `nie_podam: „${rozstrzygnijPowod('nie_podam').powod}" · null: „${rozstrzygnijPowod(null).powod}"`);
  check('(9) ⛔ `nie podam` ZE SPACJĄ nie jest znanym powodem — baza odrzuca go kodem 23514',
    !czyZnanyPowod('nie podam') && czyZnanyPowod('nie_podam'),
    'zapis ze spacją przeszedł jako znany — u zawodnika skończy się błędem zapisu');

  // ⛔ ZAKRES — TEN PAS NIE BUDUJE ZDANIA O WYSTARCZALNOŚCI (§5 polecenia).
  check('(9) ⛔ moduł NIE ZAWIERA zdania o wystarczalności wobec celu — to osobny pas',
    regulaO1 !== '' && !/wystarczaj|za mało|niewystarczaj|prog[uiy]Celu/i.test(regulaO1),
    'w module oceny pojawiło się zdanie o tym, czy zawodnik robi dość');
}

// ── ⭐ D8 — NIC NIE ODEJMUJE DOROBKU ───────────────────────────────
{
  const wszystkie = [
    jednostkiZOceny('odbylo_sie'),
    jednostkiZOceny('nie_odbylo_sie'),
    jednostkiZOceny(null),
  ];
  check('(9) ⭐⭐ D8 — ⛔ ŻADNA jednostka pracy z tej ścieżki NIE JEST UJEMNA. '
    + 'Nieobecność daje ZERO, nie minus',
    wszystkie.every((j) => j.jednostki >= 0),
    wszystkie.map((j) => j.jednostki).join(', '));

  check('(9) ⭐ D8 — nieobecność daje DOKŁADNIE zero (równość, nie „≥ 0")',
    jednostkiZOceny('nie_odbylo_sie').jednostki === 0
    && jednostkiZOceny('odbylo_sie').jednostki === 1,
    `${jednostkiZOceny('nie_odbylo_sie').jednostki} / ${jednostkiZOceny('odbylo_sie').jednostki}`);

  check('(9) ⛔ w module nie ma ANI JEDNEGO odejmowania od dorobku',
    regulaO1 !== '' && !/jednostki\s*-=|punkty\s*-=|-\s*jednostk/i.test(regulaO1),
    'w module pojawiło się odejmowanie pracy');

  // ⭐ D7 PASA K1 — PIĄTA WARTOŚĆ STANU JEST WYMIENIONA Z NAZWY I SPRAWDZONA
  // URUCHOMIENIOWO, a nie przemilczana. Konsument, który o niej nie mówi,
  // jest konsumentem, który jej nie rozważył — a to wychodzi po tygodniach.
  check('(9) ⭐ D7 (K1) — moduł WPROST nazywa piątą wartość stanu i odsyła ją poza ocenę',
    stanNalezyDoOceny(STAN_SPOZA_OCENY) === false
    && stanNalezyDoOceny('odbylo_sie') === true
    && stanNalezyDoOceny('nie_odbylo_sie') === true
    && stanNalezyDoOceny('brak_wpisu') === false
    && stanNalezyDoOceny('nie_odczytano') === false,
    `odwolane → ${stanNalezyDoOceny(STAN_SPOZA_OCENY)}`);

  check('(9) ⭐ jednostki liczy `Record`, a nie `if/else` — trzecia wartość werdyktu '
    + 'wywali `tsc` w tej samej sekundzie, zamiast zostać przemilczana',
    regulaO1 !== '' && /Record<WartoscWerdyktu, JednostkiZOceny>/.test(regulaO1),
    'jednostki wróciły do rozgałęzienia, które umie przemilczeć wartość');
}

console.log('\n═══ GRUPA 10 — EKRAN: OCENA NA KAFLU ═══');

const cialoKrokow = cialo(ekran, 'function renderKrokiOceny');
const cialoSzczegolow = cialo(ekran, 'async function zapiszSzczegolyOceny');
const cialoUsuniecia = cialo(ekran, 'async function zdejmijZPlanu');

check('(10) ekran ma render kroków oceny, zapis szczegółów i ścieżkę zdjęcia z planu',
  cialoKrokow !== '' && cialoSzczegolow !== '' && cialoUsuniecia !== '',
  `kroki=${cialoKrokow.length}B, szczegóły=${cialoSzczegolow.length}B, usunięcie=${cialoUsuniecia.length}B`);

check('(10) ⭐ kroki są WOŁANE w JSX, a nie tylko zdefiniowane — inaczej strażnik '
  + 'świeciłby na zielono przy rzeczy, której zawodnik nigdy nie zobaczy',
  /\{renderKrokiOceny\(p\)\}/.test(ekran), 'render kroków zdefiniowany i nieużyty');

// ── ⭐⭐ D3 NA EKRANIE — PO TREŚCI, NIE PO NAZWIE (O88) ────────────
check('(10) ⭐⭐ D3 — RPE STARTUJE Z `rpePoczatkowe()`, a NIE z liczby',
  /useState<WartoscRpe \| null>\(rpePoczatkowe\(\)\)/.test(ekran)
  && !/setRpeWybrane\(\s*\d/.test(ekran),
  'RPE dostało wartość początkową w ekranie');

check('(10) ⭐⭐ D3 — ⛔ W CAŁEJ ŚCIEŻCE RPE NIE MA ANI JEDNEJ WARTOŚCI DOMYŚLNEJ, '
  + 'POCZĄTKOWEJ ANI PODPOWIEDZIANEJ (sprawdzone po treści fragmentu)',
  cialoKrokow !== ''
  && !/rpeWybrane\s*\?\?\s*\d/.test(cialoKrokow)
  && !/rpeWybrane\s*\|\|\s*\d/.test(cialoKrokow)
  && !/defaultValue|initialValue|domysln/i.test(cialoKrokow),
  'w ścieżce RPE stoi wartość podstawiana za zawodnika');

check('(10) ⭐⭐ D3 — ⛔ ZERO SUWAKÓW W CAŁYM EKRANIE. Suwak ma uchwyt, uchwyt '
  + 'gdzieś stoi, a to „gdzieś" jest podpowiedzią, choćby nikt jej tak nie nazwał',
  !/Slider|slider/.test(ekran), 'na ekranie „Dziś" pojawił się suwak');

check('(10) ⭐ D3 — RPE rysuje się PRZYCISKAMI z `RPE_WARTOSCI`, a zaznaczenie '
  + 'bierze się WYŁĄCZNIE z tego, co zawodnik dotknął',
  /RPE_WARTOSCI\.map\(/.test(cialoKrokow)
  && /rpeWybrane === r && styles\.pytanieBtnWybrany/.test(cialoKrokow),
  'zaznaczenie RPE nie pochodzi z dotknięcia zawodnika');

check('(10) ⭐⭐ D3 ODWROTNIE — CZAS TRWANIA MA NA EKRANIE DROGĘ PODPOWIEDZI '
  + '(`podpowiedzCzasu`), a RPE nie ma jej ani jednej',
  /podpowiedzCzasu\(/.test(cialoKrokow)
  && /podpowiedz\.jest && podpowiedz\.minuty === m/.test(cialoKrokow),
  'czas trwania stracił podpowiedź — wtedy „nic nie podpowiadamy" spełnia się przez wyłączenie wszystkiego');

// ── ⭐ D4 i D5 NA EKRANIE ──────────────────────────────────────────
check('(10) ⭐ D4 — ekran NIE BUDUJE `data_sources` SAM: obie mapy powstają '
  + 'w `wierszWpisuPoTreningu`, z jednej listy',
  /wierszWpisuPoTreningu\(\{/.test(cialoSzczegolow)
  && !/data_sources:\s*\{/.test(cialoSzczegolow),
  'ekran zbudował własną mapę źródeł obok reguły');

check('(10) ⭐ D4 — KAŻDA wartość wchodzi do wpisu ZE ŹRÓDŁEM: czas ma `plan` '
  + 'albo `zawodnik`, RPE ⛔ WYŁĄCZNIE `zawodnik`',
  /zrodlo: czasZPlanu \? 'plan' : 'zawodnik'/.test(cialoSzczegolow)
  && /klucz: 'rpe', liczba: rpeWybrane, zrodlo: 'zawodnik'/.test(cialoSzczegolow),
  'wartość idzie do bazy bez zapisania, skąd pochodzi');

check('(10) ⭐ D5 — ekran podaje regule `idWydarzenia`, a nie zostawia wpisu bez wskazania',
  /idWydarzenia: p\.idWydarzenia/.test(cialoSzczegolow),
  'wpis po treningu nie wskazuje wydarzenia');

check('(10) ⭐ zapytanie o wydarzenia CZYTA `coach_session_id` — bez tego rodzaj '
  + 'pozycji liczyłby się z nazwy, a nie z danych (D6, O84)',
  /coach_session_id/.test(ekran), 'ekran nie czyta kolumny, na której stoi D6');

// ── ⭐⭐ D10 — TYLE ODCZYTÓW `error`, ILE WYWOŁAŃ BAZY ─────────────
{
  const sciezkaZapisu = `${cialoZapisu}\n${cialoSzczegolow}\n${cialoUsuniecia}`;
  const wywolan = (sciezkaZapisu.match(/await supabase/g) ?? []).length;
  const odczytow = (sciezkaZapisu.match(/error: \w+/g) ?? []).length;
  check('(10) ⭐⭐ D10 ZAPADKA NA RÓWNOŚĆ — LICZBA WYWOŁAŃ BAZY RÓWNA SIĘ LICZBIE '
    + 'ODCZYTÓW `error`. ⛔ Klient Supabase NIE RZUCA (O83): zignorowany `error` '
    + 'w destrukturyzacji jest cichym brakiem, nie awarią',
    wywolan > 0 && wywolan === odczytow, `wywołań ${wywolan}, odczytów error ${odczytow}`);

  check('(10) ⭐ KAŻDE wywołanie traktuje ZERO ZWRÓCONYCH WIERSZY jako porażkę (O61)',
    (sciezkaZapisu.match(/length === 0/g) ?? []).length >= 2
    && /Nie udało się zapisać/.test(cialoSzczegolow),
    'zapis odrzucony przez RLS zostanie pokazany jako sukces');

  check('(10) ⛔ D10 — ZERO `service_role` i zero klucza serwisowego na ekranie',
    !/service_role|serviceRole|SERVICE_ROLE/.test(ekran),
    'ekran obchodzi RLS');
}

// ── ⭐ D6 NA EKRANIE — ŚCIEŻKA USUNIĘCIA ALBO ZDANIE ───────────────
// ⛔ OBA MIEJSCA PYTAJĄ REGUŁY — i render, i sam zapis. Sprawdzenie wyłącznie
// przy renderze zostawiłoby drogę „przycisku nie widać, ale funkcja działa",
// czyli usunięcie zobowiązania jednym wywołaniem z innego miejsca.
check('(10) ⭐⭐ D6 — ekran PYTA REGUŁY, czy wolno usunąć, i nie ma własnej kopii tej decyzji',
  [cialoKrokow, cialoUsuniecia].every((k) => /sciezkaUsuniecia\(/.test(k) && /rozpoznajRodzajPozycji\(/.test(k))
  && !/'zobowiazanie'|'wlasna_praca'|'rzecz_produktu'/.test(ekran),
  'ekran rozstrzyga usuwalność po swojemu');

check('(10) ⛔ D6 — przy pozycji bez ścieżki usunięcia stoi ZDANIE, a NIE wyszarzony '
  + 'przycisk. Przycisk, który nic nie robi, uczy, że dotykanie nic nie daje',
  /BEZ_USUNIECIA/.test(cialoKrokow) && !/disabled=\{true\}/.test(cialoKrokow),
  'na ekranie stanął martwy przycisk usunięcia');

check('(10) ⛔ M1 — ekran nadal NIE PYTA „dlaczego nie": powód jest OFERTĄ, '
  + 'a werdykt leży w bazie, zanim ten krok w ogóle się pokaże',
  !/Dlaczego (nie|się nie)/i.test(ekran) && /KROK_POWOD/.test(cialoKrokow),
  'prośba o powód stała się warunkiem zapisu');

check('(10) ⭐ brzmienia kroków są STAŁYMI Z MODUŁU, nie napisami w JSX',
  /KROK_CZAS_I_RPE/.test(cialoKrokow) && /KROK_BOL/.test(cialoKrokow)
  && /POLE_CZAS/.test(cialoKrokow) && /POLE_RPE/.test(cialoKrokow),
  'ekran wymyślił własne napisy kroków');

check('(10) ⛔ ZERO NOWYCH MIEJSC BÓLU — ekran bierze `BODY_LOCATIONS` z `lib/labels.ts`',
  /BODY_LOCATIONS\.map\(/.test(cialoKrokow) && /from '\.\.\/\.\.\/lib\/labels'/.test(ekran),
  'powstał drugi słownik miejsc bólu');

console.log('\n═══ GRUPA 11 — OSIEM MUTACJI (⛔ COFNIĘCIE STRUKTURALNE) ═══');
//
// ⚠️ PIĘĆ PIERWSZYCH MUTACJI ŻYJE W OBIEKCIE `ZasadyOceny`, TRZY OSTATNIE
// W KOPII TEKSTU ŹRÓDŁA TRZYMANEJ W PAMIĘCI. ⛔ ANI JEDNA nie dotyka dysku —
// `md5` obu plików przed baterią i po niej jest na to DOWODEM, a nie
// zapewnieniem. Produkcyjny wołający drugiego argumentu nie podaje (asercja
// niżej), więc mutacja nie ma jak wejść na ekran zawodnika.

/** Bateria reguły — ⛔ ta sama treść na prawdziwych zasadach musi być zielona. */
function bateriaO1(z: ZasadyOceny): number {
  let bledy = 0;
  if (rpePoczatkowe(z) !== null) bledy += 1;
  if (podpowiedzCzasu(45, z).jest !== true) bledy += 1;
  const p = zbudujPayloadIZrodla([{ klucz: 'rpe', liczba: 6, zrodlo: 'zawodnik' }], z);
  if (Object.keys(p.payload).length !== Object.keys(p.data_sources).length) bledy += 1;
  const wpis = wierszWpisuPoTreningu({ idZawodnika: 'x', idWydarzenia: 16, eventType: 'micro_session', wartosci: [] }, z);
  if (wpis.calendar_event_id !== 16) bledy += 1;
  const zobowiazanie = rozpoznajRodzajPozycji({ idWydarzenia: 1, eventType: 'club_training', source: 'player', maSesjeTrenera: false });
  if (sciezkaUsuniecia(zobowiazanie, z).jest !== false) bledy += 1;
  const wlasna = rozpoznajRodzajPozycji({ idWydarzenia: 1, eventType: 'own_training', source: 'player', maSesjeTrenera: false });
  if (sciezkaUsuniecia(wlasna, z).jest !== true) bledy += 1;
  if (rozstrzygnijPowod(null, z).waga !== 'nie_wiemy') bledy += 1;
  return bledy;
}

/** Bateria tekstu — te same pytania, co grupa 10, na PODANEJ kopii źródła. */
function bateriaTekstu(zrodlo: string): number {
  const kroki = cialo(zrodlo, 'function renderKrokiOceny');
  const szczegoly = cialo(zrodlo, 'async function zapiszSzczegolyOceny');
  const zapis = cialo(zrodlo, 'async function odpowiedzNaWystapienie');
  const usuniecie = cialo(zrodlo, 'async function zdejmijZPlanu');
  const sciezka = `${zapis}\n${szczegoly}\n${usuniecie}`;
  let bledy = 0;
  if (!/RPE_WARTOSCI\.map\(/.test(kroki)) bledy += 1;
  if (/Slider|slider/.test(zrodlo)) bledy += 1;
  const wywolan = (sciezka.match(/await supabase/g) ?? []).length;
  const odczytow = (sciezka.match(/error: \w+/g) ?? []).length;
  if (wywolan === 0 || wywolan !== odczytow) bledy += 1;
  if (!/idWydarzenia: p\.idWydarzenia/.test(szczegoly)) bledy += 1;
  return bledy;
}

const NA_PRAWDZIWYCH_O1 = bateriaO1(ZASADY_PRAWDZIWE_OCENY) + bateriaTekstu(ekran);

const MUTACJE_O1: { nazwa: string; zasady?: ZasadyOceny; tekst?: (z: string) => string }[] = [
  {
    nazwa: 'MO1 · ⛔⭐ RPE DOSTAJE WARTOŚĆ POCZĄTKOWĄ — produkt mierzy własny plan zamiast zawodnika',
    zasady: { ...ZASADY_PRAWDZIWE_OCENY, rpeBezPodpowiedzi: false },
  },
  {
    nazwa: 'MO2 · ⛔ SUWAK ZAMIAST PRZYCISKÓW — uchwyt stoi gdzieś i to „gdzieś" staje się pomiarem',
    tekst: (z) => z.replace(/RPE_WARTOSCI\.map\(/g, 'Slider(').replace('renderKrokiOceny', 'renderKrokiOceny'),
  },
  {
    nazwa: 'MO3 · ⛔ `data_sources` PRZESTAJE BYĆ WYPEŁNIANE — po roku nie odróżnimy propozycji od odpowiedzi',
    zasady: { ...ZASADY_PRAWDZIWE_OCENY, zrodloPrzyKazdejWartosci: false },
  },
  {
    nazwa: 'MO4 · ⛔ `error` PRZESTAJE BYĆ ODCZYTYWANY — klient Supabase nie rzuca, więc awaria milczy (O83)',
    tekst: (z) => z.replace(/error: bladWpisu/g, ''),
  },
  {
    nazwa: 'MO5 · ⛔ ZOBOWIĄZANIE DA SIĘ USUNĄĆ — znika jedyny ślad tego, że coś było umówione',
    zasady: { ...ZASADY_PRAWDZIWE_OCENY, zobowiazaniaNieUsuwalne: false },
  },
  {
    nazwa: 'MO6 · ⛔ BRAK POWODU LICZY SIĘ JAK „INNY" — milczenie staje się oświadczeniem (R5)',
    zasady: { ...ZASADY_PRAWDZIWE_OCENY, brakPowoduToNieWiemy: false },
  },
  {
    nazwa: 'MO7 · ⛔ WPIS PRZESTAJE WSKAZYWAĆ WYDARZENIE — wracamy do 0 z 10 (D5)',
    zasady: { ...ZASADY_PRAWDZIWE_OCENY, wpisWskazujeWydarzenie: false },
  },
  {
    nazwa: 'MO8 · ⛔ CZAS TRACI PODPOWIEDŹ — „nic nie podpowiadamy" spełnione przez wyłączenie wszystkiego',
    zasady: { ...ZASADY_PRAWDZIWE_OCENY, czasMaPodpowiedz: false },
  },
];

let mutacjeO1Ok = 0;
for (const m of MUTACJE_O1) {
  const bledy = m.zasady !== undefined
    ? bateriaO1(m.zasady) + bateriaTekstu(ekran)
    : bateriaO1(ZASADY_PRAWDZIWE_OCENY) + bateriaTekstu((m.tekst ?? ((x: string) => x))(ekran));
  console.log(`\n   „${m.nazwa}"`);
  console.log(`   FAIL-i przy tej mutacji: ${bledy}`);
  if (bledy > 0) mutacjeO1Ok += 1;
}

check(`(11) ⭐ KAŻDA z ${MUTACJE_O1.length} mutacji zapala strażnika`,
  mutacjeO1Ok === MUTACJE_O1.length, `zapaliło ${mutacjeO1Ok} z ${MUTACJE_O1.length}`);

check('(11) ⭐⭐ ASERCJA ODWROTNA — na PRAWDZIWYCH zasadach bateria jest ZIELONA. '
  + 'Bez niej „każda mutacja zapala" spełniłby strażnik zapalony zawsze',
  NA_PRAWDZIWYCH_O1 === 0, `${NA_PRAWDZIWYCH_O1} FAIL-i na prawdziwym kodzie`);

check('(11) ⭐ po ośmiu mutacjach PRAWDZIWE ZASADY SĄ NIETKNIĘTE',
  ZASADY_PRAWDZIWE_OCENY.rpeBezPodpowiedzi && ZASADY_PRAWDZIWE_OCENY.czasMaPodpowiedz
  && ZASADY_PRAWDZIWE_OCENY.zrodloPrzyKazdejWartosci && ZASADY_PRAWDZIWE_OCENY.wpisWskazujeWydarzenie
  && ZASADY_PRAWDZIWE_OCENY.zobowiazaniaNieUsuwalne && ZASADY_PRAWDZIWE_OCENY.brakPowoduToNieWiemy,
  'mutacja przeciekła do prawdziwych zasad');

check('(11) ⛔ PRODUKCYJNY WOŁAJĄCY NIE PODAJE ZASAD OCENY — mutacja nie ma drogi na ekran',
  !/ZASADY_PRAWDZIWE_OCENY/.test(ekran) && !/ZasadyOceny/.test(ekran),
  'ekran podaje drugi argument regule oceny');

// ⭐ `md5` PO BATERII — DOWÓD, ŻE MUTACJE NIE DOTKNĘŁY DYSKU.
{
  const poRegula = md5(existsSync(PLIK_REGULY_O1) ? readFileSync(PLIK_REGULY_O1, 'utf8') : '');
  const poEkran = md5(readFileSync(join(root, 'app', '(tabs)', 'dzis.tsx'), 'utf8'));
  check('(11) ⭐⭐ `md5` OBU PLIKÓW PRZED I PO BATERII JEST TEN SAM — cofnięcie jest '
    + 'STRUKTURALNE, bo nie ma czego cofać',
    poRegula === MD5_REGULY_PRZED && poEkran === MD5_EKRANU_PRZED,
    `reguła ${MD5_REGULY_PRZED} → ${poRegula} · ekran ${MD5_EKRANU_PRZED} → ${poEkran}`);
}

// ── SANITY: brzmienia, które ten pas OBIECAŁ zostawić w spokoju ─────
check('⛔ plakietki nie zmieniły się co do znaku (pas C1/D1)',
  PLAKIETKI_WYKONANIA.odbylo_sie === 'Zrobione'
  && PLAKIETKI_WYKONANIA.nie_odbylo_sie === 'Nie odbyło się',
  `${PLAKIETKI_WYKONANIA.odbylo_sie} / ${PLAKIETKI_WYKONANIA.nie_odbylo_sie}`);
check('nagłówek i dwa napisy okna są jedynymi nowymi brzmieniami tego pasa',
  PYTANIE_NAGLOWEK === 'ZROBIŁEŚ?' && KIEDY_NAPIS.wczoraj === 'wczoraj' && KIEDY_NAPIS.dzis === 'dziś');
check('opis do logu nie kłamie o stanie',
  opisPytanDoLogu(policz(null)).includes('NIE WIEM'));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
