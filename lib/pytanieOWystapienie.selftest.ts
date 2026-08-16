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

const iPytanie = ekran.indexOf('{renderPytaniaOWystapienia()}');
const iLicznik = ekran.indexOf('{renderLicznikPracy()}');
check('(8) ⭐ PYTANIE STOI NAD LICZNIKIEM PRACY — pytanie przed odpowiedzią',
  iPytanie > 0 && iLicznik > 0 && iPytanie < iLicznik,
  `pytanie @${iPytanie}, licznik @${iLicznik}`);

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
