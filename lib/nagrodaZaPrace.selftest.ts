// PLAN-D-C4 08.2026 (15.08.2026) — NOWY PLIK. Zadanie C4.4 — STRAŻNIK NAGRODY.
//
//   npx tsx lib/nagrodaZaPrace.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ═════════════════════════════════════════════════════════════════════
// PO CO TEN PLIK ISTNIEJE — JEDNYM ZDANIEM
//
// Zakaz „licznik nigdy nie wraca do zera" jest wart tyle, ile maszyna, która
// go pilnuje. Bez niej jest zdaniem w dokumencie, które kolejna sesja
// przeczyta albo nie.
//
// ── PIĘĆ DEFEKTÓW, KAŻDY z własną grupą asercji i własną mutacją ────
//
//   (C4-1) dorobek MALEJE — bo ktoś dołożył okno, filtr po dacie albo serię
//          dni. ⭐ To jest defekt, przed którym stoi cały ten pas, i jedyny,
//          którego dowód musi być MASZYNOWY, a nie z lektury kodu;
//   (C4-2) nieodczytane źródło liczy się jak puste — dorobek spada po awarii
//          sieci i wraca po odświeżeniu, czyli liczba „nigdy niemalejąca"
//          maleje z powodu, o którym zawodnik nic nie wie;
//   (C4-3) odznaka powstaje bez pokrycia w pracy — czyli nagroda za obecność
//          w przebraniu (N1, Deci 1999, d = −0,40, najsilniej u dzieci);
//   (C4-4) oś jakości robi się drugą osią objętości — wtedy „praca domknięta"
//          jest wyłącznie inną nazwą na „dużo wierszy";
//   (C4-5) ekran zaczyna mówić o dniach z rzędu — jednym słowem w jednej
//          stałej, którego nikt nie zauważy w 153 kB pliku.
//
// ⚠️ CZEGO TEN PLIK NIE UDAJE. Część asercji czyta ŹRÓDŁO EKRANU JAKO TEKST
// (wzorzec z `kartaDzisILicznik.selftest.ts` i `wgladyNaDzis.selftest.ts`).
// To nie jest test — to jest strażnik regresji. Nie uruchamia Reacta i nie wie,
// czy ekran się rysuje.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (ograniczenie O53): `tsconfig.json` ciągnie DOM,
// więc `tsc` pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.
// ═════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  policzNagrode,
  jednostkiZSesji,
  jednostkiZDziennika,
  jednostkiZMeczow,
  jednostkiZOdpowiedziKontrolnych,
  zrodloSesji,
  zrodloNieczytane,
  opisNagrodyDoLogu,
  maPomiarObciazenia,
  PROGI,
  WAGI_PRACY,
  ZASADY_NAGRODY_PRAWDZIWE,
  CZYTAJ_WSZYSTKO,
  type JednostkaPracy,
  type NagrodaZaPrace,
  type OdznakaId,
  type WejscieNagrody,
  type WejscieZrodla,
  type WierszSesji,
  type ZasadyCzytania,
  type ZasadyNagrody,
} from './nagrodaZaPrace';
import { czytajWerdykty } from './wykonanieSesji';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

/**
 * Źródło BEZ komentarzy. Ten sam powód, co w strażnikach B2, B4 i B5: pliki
 * tego projektu CYTUJĄ w komentarzach zakazane brzmienia („⛔ ani jednego
 * słowa o dniach z rzędu"), więc strażnik czytający surowy tekst zapalałby się
 * na własnej dokumentacji, a jedynym sposobem, żeby go uciszyć, byłoby
 * skasowanie wyjaśnienia — czyli tej wiedzy, dla której powstał.
 */
const bezKomentarzy = (s: string): string => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .join('\n');

/**
 * Argumenty każdego wywołania `nazwa(...)` — rozdzielone PO PRZECINKACH
 * NAJWYŻSZEGO POZIOMU, ze skanowaniem głębokości nawiasów. ⚠️ Skopiowane co do
 * znaku z `kartaDzisILicznik.selftest.ts` i z tego samego powodu: wyrażenie
 * regularne tego nie umie.
 */
function argumentyWywolania(src: string, nazwa: string): string[][] {
  const wynik: string[][] = [];
  const igla = `${nazwa}(`;
  let od = src.indexOf(igla);
  while (od >= 0) {
    let i = od + igla.length;
    let glebokosc = 1;
    let biezacy = '';
    const argumenty: string[] = [];
    while (i < src.length && glebokosc > 0) {
      const z = src[i];
      if (z === '(' || z === '{' || z === '[') glebokosc++;
      else if (z === ')' || z === '}' || z === ']') glebokosc--;
      if (glebokosc === 0) break;
      if (z === ',' && glebokosc === 1) { argumenty.push(biezacy); biezacy = ''; } else biezacy += z;
      i++;
    }
    argumenty.push(biezacy);
    wynik.push(argumenty.map((a) => a.trim()).filter((a) => a.length > 0));
    od = src.indexOf(igla, od + igla.length);
  }
  return wynik;
}

const PLIK_DZIS = 'app/(tabs)/dzis.tsx';
const PLIK_LIB = 'lib/nagrodaZaPrace.ts';
const dzisSurowe = readFileSync(join(root, PLIK_DZIS), 'utf8');
const dzis = bezKomentarzy(dzisSurowe);
const libSurowe = readFileSync(join(root, PLIK_LIB), 'utf8');
const lib = bezKomentarzy(libSurowe);

// ═══════════════════════════════════════════════════════════════════
// BUDOWNICZOWIE WEJŚĆ — jedno miejsce, żeby asercje mówiły o regule,
// a nie o składaniu obiektów.
// ═══════════════════════════════════════════════════════════════════

const PUSTE: WejscieZrodla = { rodzaj: 'jest', jednostki: [] };

function we(x: Partial<WejscieNagrody> = {}): WejscieNagrody {
  return {
    sesje: x.sesje ?? PUSTE,
    dziennik: x.dziennik ?? PUSTE,
    odpowiedziKontrolne: x.odpowiedziKontrolne ?? PUSTE,
    mecze: x.mecze ?? PUSTE,
    segmentyCelow: x.segmentyCelow ?? { rodzaj: 'pelne', segmenty: new Set(['wytrzymalosc']) },
  };
}

function zrodlo(jednostki: readonly JednostkaPracy[]): WejscieZrodla {
  return { rodzaj: 'jest', jednostki };
}

/** N sesji z dowodem, w podanym segmencie, na kolejnych dniach od `od`. */
function sesje(ile: number, segment: string | null, od = '2026-01-01', maWpis = false): WierszSesji[] {
  const out: WierszSesji[] = [];
  for (let i = 0; i < ile; i++) {
    out.push({ idWydarzenia: 1000 + i, dzien: przesun(od, i), segment, maWpisWDzienniku: maWpis });
  }
  return out;
}

function przesun(data: string, oDni: number): string {
  return new Date(Date.parse(`${data}T00:00:00Z`) + oDni * 86400000).toISOString().slice(0, 10);
}

/** N wpisów Dziennika BEZ pomiaru obciążenia (czyli czysta objętość). */
function wpisy(ile: number, od = '2026-01-01') {
  return Array.from({ length: ile }, (_, i) => ({
    id: 2000 + i, entry_type: 'morning', created_at: `${przesun(od, i)}T07:00:00Z`,
    payload: { sleep_hours: 7 },
  }));
}

/** N wpisów Dziennika Z pomiarem obciążenia (czyli z odpowiedzią kontrolną). */
function wpisyZPomiarem(ile: number, od = '2026-01-01') {
  return Array.from({ length: ile }, (_, i) => ({
    id: 3000 + i, entry_type: 'post_training', created_at: `${przesun(od, i)}T19:00:00Z`,
    payload: { rpe: 6, duration_minutes: 90 },
  }));
}

function ma(n: NagrodaZaPrace, id: OdznakaId): boolean {
  return n.rodzaj === 'policzona' && n.odznaki.some((o) => o.id === id);
}
function punkty(n: NagrodaZaPrace): number {
  return n.rodzaj === 'policzona' ? n.punkty : -1;
}

// ═══════════════════════════════════════════════════════════════════
// G0. KONTRAKT PLIKU — czystość i kształt tabeli progów
// ═══════════════════════════════════════════════════════════════════
console.log('\nG0. KONTRAKT PLIKU');
{
  check('⛔ `nagrodaZaPrace.ts` nie importuje Supabase',
    !/supabase/i.test(lib),
    'plik dotyka bazy — przestaje być czystą funkcją i nie da się go przepuścić przez tabelę wejść');

  check('⛔ `nagrodaZaPrace.ts` nie importuje Reacta',
    !/from ['"]react/.test(lib),
    'plik dotyka Reacta');

  // ⭐ NAJWAŻNIEJSZA ASERCJA CAŁEGO PLIKU PO STRONIE ŹRÓDŁA.
  // Funkcja, która nie zna zegara, nie umie policzyć „dni z rzędu" ani okna.
  check('⭐⛔ `nagrodaZaPrace.ts` NIE CZYTA ZEGARA (`Date.now`, `new Date()` bez argumentu)',
    !/Date\.now\(/.test(lib) && !/new Date\(\s*\)/.test(lib),
    'plik sięga po zegar — a wtedy „ile dni temu" znów jest w zasięgu ręki');

  // ⭐ Typ jednostki pracy NIE MA POLA Z DATĄ. To jest ta jedna zmiana, która
  // pozwoliłaby kolejnej sesji przywrócić okno albo serię.
  const blokTypu = libSurowe.slice(
    libSurowe.indexOf('export type JednostkaPracy = {'),
    libSurowe.indexOf('export type WejscieZrodla'),
  );
  check('⭐⛔ typ `JednostkaPracy` NIE MA pola z datą',
    blokTypu.length > 0
    && !/^\s*(dzien|data|created_at|dzis|kiedy|date)\s*[?:]/m.test(bezKomentarzy(blokTypu)),
    `blok typu: ${blokTypu.slice(0, 200)}`);

  check('⛔ każdy próg ma wartość ≥ 1 — próg zerowy byłby nagrodą za samo pojawienie się',
    PROGI.length > 0 && PROGI.every((p) => Number.isInteger(p.prog) && p.prog >= 1),
    JSON.stringify(PROGI.map((p) => [p.id, p.prog])));

  check('⛔ żaden próg nie jest wyrażony w jednostce czasu',
    PROGI.every((p) => p.miara === 'punkty' || p.miara === 'odpowiedzi_kontrolne' || p.miara === 'punkty_w_celu'),
    JSON.stringify(PROGI.map((p) => [p.id, p.miara])));

  check('⭐ każdy próg ma zdanie „za jaką pracę" — odznaka bez niego jest naklejką (M4)',
    PROGI.every((p) => typeof p.zaJakaPrace === 'string' && p.zaJakaPrace.trim().length > 15),
    JSON.stringify(PROGI.map((p) => [p.id, p.zaJakaPrace?.length])));

  check('⭐ każdy próg ma uzasadnienie wartości — liczba bez uzasadnienia wraca jako „tak było"',
    PROGI.every((p) => typeof p.uzasadnienieProgu === 'string' && p.uzasadnienieProgu.trim().length > 15),
    JSON.stringify(PROGI.map((p) => [p.id, p.uzasadnienieProgu?.length])));

  check('⛔ każda waga pracy jest ≥ 1 — praca ważąca zero nie jest pracą',
    Object.values(WAGI_PRACY).every((w) => Number.isInteger(w) && w >= 1),
    JSON.stringify(WAGI_PRACY));

  check('⛔ ani jedno brzmienie progu nie mówi o dniach, serii ani passie',
    PROGI.every((p) => !/\bseri|\bpass|z rzędu|streak|codzienn|\bdni\b|\bdzień\b/i.test(`${p.nazwa} ${p.zaJakaPrace}`)),
    JSON.stringify(PROGI.map((p) => p.nazwa)));

  check('`maPomiarObciazenia` odróżnia wypełniony formularz od pustego',
    maPomiarObciazenia({ rpe: 6 }) && maPomiarObciazenia({ duration_minutes: 30 })
    && !maPomiarObciazenia({ sleep_hours: 7 }) && !maPomiarObciazenia(null) && !maPomiarObciazenia({}),
    'pomiar obciążenia rozpoznawany źle');
}

// ═══════════════════════════════════════════════════════════════════
// G1. MONOTONICZNOŚĆ — dołożenie pracy nigdy nie zmniejsza ani nie odbiera
// ═══════════════════════════════════════════════════════════════════
console.log('\nG1. MONOTONICZNOŚĆ');
{
  // 120 kroków: w każdym dokładamy jedną jednostkę i sprawdzamy, że ŻADNA
  // liczba nie spadła i ŻADNA odznaka nie zniknęła.
  const kroki: JednostkaPracy[] = [
    ...jednostkiZSesji(sesje(40, 'wytrzymalosc')),
    ...jednostkiZDziennika(wpisy(40)),
    ...jednostkiZDziennika(wpisyZPomiarem(20)),
    ...jednostkiZMeczow(Array.from({ length: 20 }, (_, i) => ({ id: 4000 + i, created_at: `${przesun('2026-01-01', i)}T20:00:00Z` }))),
  ];

  let poprzedni = policzNagrode(we());
  let spadek: string | null = null;
  let utrata: string | null = null;
  const narastajaco: JednostkaPracy[] = [];
  for (const j of kroki) {
    narastajaco.push(j);
    const teraz = policzNagrode(we({ sesje: zrodlo(narastajaco) }));
    if (teraz.rodzaj !== 'policzona' || poprzedni.rodzaj !== 'policzona') { spadek = 'wynik przestał być policzony'; break; }
    if (teraz.punkty < poprzedni.punkty) spadek = spadek ?? `punkty ${poprzedni.punkty} → ${teraz.punkty}`;
    if (teraz.jednostki < poprzedni.jednostki) spadek = spadek ?? `jednostki ${poprzedni.jednostki} → ${teraz.jednostki}`;
    if (teraz.odpowiedziKontrolne < poprzedni.odpowiedziKontrolne) spadek = spadek ?? 'odpowiedzi kontrolne spadły';
    if ((teraz.punktyWCelu ?? 0) < (poprzedni.punktyWCelu ?? 0)) spadek = spadek ?? 'punkty w celu spadły';
    for (const o of poprzedni.odznaki) {
      if (!teraz.odznaki.some((x) => x.id === o.id)) utrata = utrata ?? o.id;
    }
    poprzedni = teraz;
  }

  check(`⭐ ${kroki.length} kroków dokładania pracy — ŻADNA liczba nie spadła`,
    spadek === null, `spadek: ${spadek}`);
  check(`⭐ ${kroki.length} kroków dokładania pracy — ŻADNA odznaka nie została odebrana`,
    utrata === null, `odebrana odznaka: ${utrata}`);

  // Dołożenie pracy nie może też ODDALIĆ następnego progu.
  const male = policzNagrode(we({ dziennik: zrodlo(jednostkiZDziennika(wpisy(3))) }));
  const wieksze = policzNagrode(we({ dziennik: zrodlo(jednostkiZDziennika(wpisy(6))) }));
  check('⭐ dołożenie pracy PRZYBLIŻA następny próg, nigdy go nie oddala',
    male.rodzaj === 'policzona' && wieksze.rodzaj === 'policzona'
    && male.nastepnyProg !== null && wieksze.nastepnyProg !== null
    && wieksze.nastepnyProg.brakuje < male.nastepnyProg.brakuje,
    `3 wpisy → brakuje ${male.rodzaj === 'policzona' ? male.nastepnyProg?.brakuje : '?'}, `
    + `6 wpisów → brakuje ${wieksze.rodzaj === 'policzona' ? wieksze.nastepnyProg?.brakuje : '?'}`);

  // Ten sam wiersz przeczytany dwa razy to jedna praca, a nie dwie.
  const raz = jednostkiZDziennika(wpisy(5));
  const dwaRazy = policzNagrode(we({ dziennik: zrodlo([...raz, ...raz]) }));
  check('⛔ ten sam wiersz policzony dwa razy daje tyle samo, co raz',
    punkty(dwaRazy) === punkty(policzNagrode(we({ dziennik: zrodlo(raz) }))),
    `podwójnie: ${punkty(dwaRazy)}, pojedynczo: ${punkty(policzNagrode(we({ dziennik: zrodlo(raz) })))}`);
}

// ═══════════════════════════════════════════════════════════════════
// G2. ⭐ BRAK KARY ZA PRZERWĘ — MASZYNOWY DOWÓD ZAKAZU SERII
// ═══════════════════════════════════════════════════════════════════
console.log('\nG2. ⭐ BRAK KARY ZA PRZERWĘ (maszynowy dowód zakazu serii)');

/**
 * ⚠️ GENERATOR JEST DETERMINISTYCZNY (LCG ze stałym ziarnem), A NIE
 * `Math.random()`. Powód: strażnik, który raz na sto uruchomień świeci na
 * czerwono na wejściu, którego nie da się odtworzyć, jest gorszy niż brak
 * strażnika — bo uczy, że czerwony bywa przypadkiem.
 */
function losowyRozkladDni(ziarno: number, ile: number): number[] {
  let s = ziarno;
  const out: number[] = [];
  let dzien = 0;
  for (let i = 0; i < ile; i++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    // przerwy od 0 do 89 dni — w tym przerwy dłuższe niż okno licznika D1
    dzien += Math.floor((s / 2147483648) * 90);
    out.push(dzien);
  }
  return out;
}

/** Ten sam KOMPLET pracy, rozłożony w czasie tak, jak każe `dni`. */
function tenSamKomplet(dni: readonly number[], zasady: ZasadyCzytania = CZYTAJ_WSZYSTKO): NagrodaZaPrace {
  const bazowa = '2026-01-01';
  const s: WierszSesji[] = dni.slice(0, 6).map((d, i) => ({
    idWydarzenia: 1000 + i, dzien: przesun(bazowa, d), segment: 'wytrzymalosc', maWpisWDzienniku: i % 2 === 0,
  }));
  const w = dni.slice(6, 12).map((d, i) => ({
    id: 2000 + i, entry_type: 'morning', created_at: `${przesun(bazowa, d)}T07:00:00Z`, payload: { sleep_hours: 7 },
  }));
  const p = dni.slice(12, 16).map((d, i) => ({
    id: 3000 + i, entry_type: 'post_training', created_at: `${przesun(bazowa, d)}T19:00:00Z`, payload: { rpe: 6 },
  }));
  const m = dni.slice(16, 18).map((d, i) => ({ id: 4000 + i, created_at: `${przesun(bazowa, d)}T20:00:00Z` }));
  const k = dni.slice(18, 20).map((d, i) => ({
    id: `c${i}`, answered_at: `${przesun(bazowa, d)}T18:00:00Z`, segment: 'wytrzymalosc',
  }));
  return policzNagrode(we({
    sesje: zrodlo(jednostkiZSesji(s, zasady)),
    dziennik: zrodlo(jednostkiZDziennika(w, zasady).concat(jednostkiZDziennika(p, zasady))),
    mecze: zrodlo(jednostkiZMeczow(m, zasady)),
    odpowiedziKontrolne: zrodlo(jednostkiZOdpowiedziKontrolnych(k, zasady)),
  }));
}

/** Odcisk wyniku — wszystko, co zawodnik zobaczy na ekranie. */
function odcisk(n: NagrodaZaPrace): string {
  if (n.rodzaj !== 'policzona') return `NIE_POLICZONA:${n.powod}`;
  return [
    n.punkty, n.jednostki, n.odpowiedziKontrolne, n.punktyWCelu,
    n.odznaki.map((o) => o.id).join('+'),
    n.nastepnyProg === null ? 'brak' : `${n.nastepnyProg.id}:${n.nastepnyProg.brakuje}`,
    n.nieumiemPoliczyc.map((b) => b.id).join('+'),
  ].join('|');
}

/**
 * ⭐ TA FUNKCJA JEST DOWODEM ZAKAZU SERII I JEST WOŁANA TAKŻE PRZEZ BATERIĘ
 * MUTACYJNĄ. Bierze KILKADZIESIĄT rozkładów tej samej pracy w czasie —
 * od „wszystko jednego dnia" po „z przerwami po dwa i pół miesiąca" — i żąda,
 * żeby wynik był IDENTYCZNY co do znaku.
 */
function rozkladyDajaTenSamWynik(zasady: ZasadyCzytania): { ok: boolean; detal: string } {
  const rozklady: number[][] = [
    Array.from({ length: 20 }, () => 0),                    // wszystko jednego dnia
    Array.from({ length: 20 }, (_, i) => i),                // dzień po dniu
    Array.from({ length: 20 }, (_, i) => i * 7),            // raz w tygodniu
    Array.from({ length: 20 }, (_, i) => (i < 10 ? i : i + 400)), // przerwa 13 miesięcy w środku
    Array.from({ length: 20 }, (_, i) => 500 - i),          // wszystko dawno temu
  ];
  for (let z = 1; z <= 45; z++) rozklady.push(losowyRozkladDni(z * 7919, 20));

  const wzorzec = odcisk(tenSamKomplet(rozklady[0], zasady));
  for (let i = 1; i < rozklady.length; i++) {
    const teraz = odcisk(tenSamKomplet(rozklady[i], zasady));
    if (teraz !== wzorzec) {
      return { ok: false, detal: `rozkład #${i} (dni ${rozklady[i].slice(0, 6).join(',')}…) dał „${teraz}", a rozkład #0 „${wzorzec}"` };
    }
  }
  return { ok: true, detal: `${rozklady.length} rozkładów, wszystkie „${wzorzec}"` };
}

{
  const wynik = rozkladyDajaTenSamWynik(CZYTAJ_WSZYSTKO);
  check('⭐⭐ 50 ROZKŁADÓW TEJ SAMEJ PRACY W CZASIE — WYNIK IDENTYCZNY CO DO ZNAKU',
    wynik.ok, wynik.detal);

  // Dwa wejścia różniące się WYŁĄCZNIE przerwą — najprostsza wersja tego samego.
  const bezPrzerwy = policzNagrode(we({ dziennik: zrodlo(jednostkiZDziennika(wpisy(8, '2026-03-01'))) }));
  const zPrzerwa = policzNagrode(we({
    dziennik: zrodlo(jednostkiZDziennika([...wpisy(4, '2026-03-01'), ...wpisy(4, '2026-09-01').map((w, i) => ({ ...w, id: 2100 + i }))])),
  }));
  check('⭐ osiem wpisów pod rząd i osiem z półroczną przerwą — ten sam dorobek',
    odcisk(bezPrzerwy) === odcisk(zPrzerwa),
    `bez przerwy: ${odcisk(bezPrzerwy)} · z przerwą: ${odcisk(zPrzerwa)}`);

  // Praca sprzed roku liczy się tak samo, jak wczorajsza.
  const dawno = policzNagrode(we({ sesje: zrodlo(jednostkiZSesji(sesje(5, 'wytrzymalosc', '2020-01-01'))) }));
  const wczoraj = policzNagrode(we({ sesje: zrodlo(jednostkiZSesji(sesje(5, 'wytrzymalosc', '2026-08-10'))) }));
  check('⭐ praca sprzed sześciu lat liczy się dokładnie tak samo, jak wczorajsza',
    odcisk(dawno) === odcisk(wczoraj), `${odcisk(dawno)} vs ${odcisk(wczoraj)}`);
}

// ═══════════════════════════════════════════════════════════════════
// G3. KAŻDY PRÓG MA POKRYCIE W PRACY
// ═══════════════════════════════════════════════════════════════════
console.log('\nG3. KAŻDY PRÓG MA POKRYCIE W PRACY');
{
  const puste = policzNagrode(we());
  check('⛔ zero pracy → ZERO odznak',
    puste.rodzaj === 'policzona' && puste.odznaki.length === 0,
    `odznaki: ${puste.rodzaj === 'policzona' ? puste.odznaki.map((o) => o.id).join(',') : puste.rodzaj}`);

  check('⭐ zero pracy → wynik jest POLICZONY z zerem, a nie „nie umiem policzyć"',
    puste.rodzaj === 'policzona' && puste.punkty === 0,
    'pusty odczyt musi dać pomiar, a nie awarię');

  // Dla KAŻDEGO progu: o jeden mniej — nie ma; dokładnie tyle — jest.
  for (const p of PROGI) {
    const zbuduj = (ile: number): NagrodaZaPrace => {
      if (p.miara === 'punkty') {
        // 1 punkt = 1 wpis Dziennika bez pomiaru (waga 1) — najczystsza skala.
        return policzNagrode(we({ dziennik: zrodlo(jednostkiZDziennika(wpisy(ile))) }));
      }
      if (p.miara === 'odpowiedzi_kontrolne') {
        return policzNagrode(we({ dziennik: zrodlo(jednostkiZDziennika(wpisyZPomiarem(ile))) }));
      }
      // punkty_w_celu: sesja w segmencie celu waży 3
      const sesjiTrzeba = Math.ceil(ile / WAGI_PRACY.sesja_z_dowodem);
      return policzNagrode(we({ sesje: zrodlo(jednostkiZSesji(sesje(sesjiTrzeba, 'wytrzymalosc'))) }));
    };
    const ponizej = p.miara === 'punkty_w_celu' ? p.prog - WAGI_PRACY.sesja_z_dowodem : p.prog - 1;
    check(`⛔ „${p.id}" NIE powstaje przy ${Math.max(ponizej, 0)} w mierze ${p.miara}`,
      ponizej <= 0 ? !ma(zbuduj(0), p.id) : !ma(zbuduj(ponizej), p.id),
      `odznaka pojawiła się poniżej progu ${p.prog}`);
    check(`⭐ „${p.id}" powstaje przy ${p.prog} w mierze ${p.miara}`,
      ma(zbuduj(p.prog), p.id),
      `odznaka nie powstała mimo osiągnięcia progu ${p.prog}`);
  }

  // Odznaka zdobyta zawsze niesie `osiagnieto >= prog` — czyli pokrycie.
  const duzo = policzNagrode(we({ dziennik: zrodlo(jednostkiZDziennika(wpisy(200))) }));
  check('⛔ każda zdobyta odznaka niesie osiągnięcie ≥ swojego progu',
    duzo.rodzaj === 'policzona' && duzo.odznaki.every((o) => o.osiagnieto >= o.prog),
    'odznaka bez pokrycia w liczbie');
}

// ═══════════════════════════════════════════════════════════════════
// G4. JAKOŚĆ OBOK OBJĘTOŚCI
// ═══════════════════════════════════════════════════════════════════
console.log('\nG4. JAKOŚĆ OBOK OBJĘTOŚCI');
{
  // 500 wierszy czystej objętości. Wszystkie progi objętości — tak.
  // Ani jednej odznaki jakości — nie.
  const samaObjetosc = policzNagrode(we({ dziennik: zrodlo(jednostkiZDziennika(wpisy(500))) }));
  check('⭐ 500 wpisów bez odpowiedzi kontrolnej NIE DAJE odznaki „praca domknięta"',
    !ma(samaObjetosc, 'odpowiedz_kontrolna'),
    'oś jakości jest tylko inną nazwą na liczbę wierszy');
  check('⭐ 500 wpisów bez segmentu NIE DAJE odznaki „praca nad swoim celem"',
    !ma(samaObjetosc, 'praca_w_celu'),
    'praca bez przypisania do celu policzyła się jako praca nad celem');
  check('500 wpisów daje jednak WSZYSTKIE progi objętości — objętość nadal się liczy',
    PROGI.filter((p) => p.miara === 'punkty').every((p) => ma(samaObjetosc, p.id)),
    'objętość przestała cokolwiek dawać');

  // Pięć rzeczy domkniętych odpowiedzią wystarcza, mimo mniejszej objętości.
  const malaAleDomknieta = policzNagrode(we({ dziennik: zrodlo(jednostkiZDziennika(wpisyZPomiarem(5))) }));
  check('⭐ pięć rzeczy DOMKNIĘTYCH odpowiedzią daje odznakę jakości przy 10 punktach objętości',
    ma(malaAleDomknieta, 'odpowiedz_kontrolna') && punkty(malaAleDomknieta) === 10,
    `punkty=${punkty(malaAleDomknieta)}`);

  // Praca w SEGMENCIE, którego zawodnik nie nazwał celem, nie liczy się do celu.
  const obcySegment = policzNagrode(we({ sesje: zrodlo(jednostkiZSesji(sesje(20, 'moc'))) }));
  check('⭐ praca w segmencie SPOZA celów nie liczy się do „pracy nad swoim celem"',
    !ma(obcySegment, 'praca_w_celu')
    && obcySegment.rodzaj === 'policzona' && obcySegment.punktyWCelu === 0,
    `punktyWCelu=${obcySegment.rodzaj === 'policzona' ? obcySegment.punktyWCelu : '?'}`);

  // …ale nadal liczy się do objętości. ⛔ Praca poza celem nie znika.
  check('⛔ praca w segmencie spoza celów NIE ZNIKA — liczy się do objętości',
    punkty(obcySegment) === 20 * WAGI_PRACY.sesja_z_dowodem,
    `punkty=${punkty(obcySegment)}`);

  // Domknięcie sesji wpisem Dziennika jest osią jakości, nie objętości.
  const bezWpisu = policzNagrode(we({ sesje: zrodlo(jednostkiZSesji(sesje(6, 'wytrzymalosc', '2026-01-01', false))) }));
  const zWpisem = policzNagrode(we({ sesje: zrodlo(jednostkiZSesji(sesje(6, 'wytrzymalosc', '2026-01-01', true))) }));
  check('⭐ domknięcie sesji wpisem podnosi JAKOŚĆ, nie objętość',
    punkty(bezWpisu) === punkty(zWpisem)
    && bezWpisu.rodzaj === 'policzona' && zWpisem.rodzaj === 'policzona'
    && bezWpisu.odpowiedziKontrolne === 0 && zWpisem.odpowiedziKontrolne === 6,
    `punkty ${punkty(bezWpisu)}/${punkty(zWpisem)}`);
}

// ═══════════════════════════════════════════════════════════════════
// G5. TRZECI STAN — brak danych ≠ zero pracy (R5)
// ═══════════════════════════════════════════════════════════════════
console.log('\nG5. TRZECI STAN — brak danych ≠ zero pracy');
{
  const nieodczytany = policzNagrode(we({
    dziennik: zrodloNieczytane('sieć padła'),
    sesje: zrodlo(jednostkiZSesji(sesje(10, 'wytrzymalosc'))),
  }));
  check('⭐ jedno nieodczytane źródło → wynik `nie_policzona`, a NIE mniejsza liczba',
    nieodczytany.rodzaj === 'nie_policzona',
    `dostałem ${nieodczytany.rodzaj === 'policzona' ? `${nieodczytany.punkty} punktów` : '—'} mimo nieodczytanego Dziennika`);

  check('⭐ `nie_policzona` mówi, CZEGO nie przeczytało — inaczej nikt tego nie zdiagnozuje',
    nieodczytany.rodzaj === 'nie_policzona'
    && nieodczytany.nieodczytane.length === 1
    && nieodczytany.nieodczytane[0].includes('sieć padła'),
    JSON.stringify(nieodczytany.rodzaj === 'nie_policzona' ? nieodczytany.nieodczytane : []));

  // ⛔ Kształt `nie_policzona` nie ma pola z liczbą punktów — żeby nie dało się
  // z niego narysować „0 punktów". Ten sam wzorzec, co `brak_podstawy` w D1.
  check('⭐⛔ kształt `nie_policzona` NIE MA pola `punkty` — „0 punktów" jest nie do narysowania',
    nieodczytany.rodzaj === 'nie_policzona' && !('punkty' in nieodczytany),
    'da się narysować zero po nieudanym odczycie');

  // „Odczytałem i nic nie ma" to CO INNEGO niż „nie odczytałem".
  const pustoAleOdczytane = policzNagrode(we());
  check('⭐ „odczytałem i nic nie ma" jest ODRÓŻNIALNE od „nie odczytałem"',
    pustoAleOdczytane.rodzaj === 'policzona' && nieodczytany.rodzaj === 'nie_policzona',
    'oba stany dają ten sam kształt');

  // Niepełny zbiór celów: odznaka celu NIE POWSTAJE i mówi dlaczego.
  const niepelneCele = policzNagrode(we({
    sesje: zrodlo(jednostkiZSesji(sesje(20, 'wytrzymalosc'))),
    segmentyCelow: { rodzaj: 'niepelne', powod: 'ekran pyta o cele z filtrem status=active' },
  }));
  check('⭐ niepełny zbiór celów → odznaka celu NIE POWSTAJE…',
    !ma(niepelneCele, 'praca_w_celu'), 'odznaka powstała z niepełnych danych');
  check('⭐ …i trafia do `nieumiemPoliczyc` Z POWODEM, zamiast zniknąć po cichu',
    niepelneCele.rodzaj === 'policzona'
    && niepelneCele.nieumiemPoliczyc.some((b) => b.id === 'praca_w_celu' && b.powod.includes('status=active')),
    JSON.stringify(niepelneCele.rodzaj === 'policzona' ? niepelneCele.nieumiemPoliczyc : []));
  check('⛔ niepełny zbiór celów NIE odbiera odznak objętości',
    ma(niepelneCele, 'dziesiec') && ma(niepelneCele, 'trzydziesci'),
    'niepełna wiedza o celach zabrała odznaki, które z celami nie mają nic wspólnego');
  check('⭐ `punktyWCelu` jest wtedy `null`, a nie zerem',
    niepelneCele.rodzaj === 'policzona' && niepelneCele.punktyWCelu === null,
    'niewiedza o celach została narysowana jako zero pracy nad celem');

  // `zrodloSesji` — trzy różne „nie wiem", każde blokuje; segment NIE blokuje.
  const werdyktyJest = czytajWerdykty({ dane: [], blad: null });
  check('⭐ `zrodloSesji`: nieodczytane wydarzenia → `nie_odczytano`',
    zrodloSesji({ wydarzenia: null, werdykty: werdyktyJest, wpisyDziennika: new Set(), segmentBloku: null }).rodzaj === 'nie_odczytano',
    'brak wydarzeń przeszedł jako pusta lista');
  check('⭐ `zrodloSesji`: nieodczytane powiązania Dziennika → `nie_odczytano`',
    zrodloSesji({ wydarzenia: [], werdykty: werdyktyJest, wpisyDziennika: null, segmentBloku: null }).rodzaj === 'nie_odczytano',
    'brak powiązań przeszedł jako pusty zbiór');
  check('⭐ `zrodloSesji`: nieodczytane werdykty → `nie_odczytano`',
    zrodloSesji({
      wydarzenia: [], werdykty: { rodzaj: 'nie_odczytano', powod: 'RLS' }, wpisyDziennika: new Set(), segmentBloku: null,
    }).rodzaj === 'nie_odczytano',
    'nieodczytane werdykty przeszły jako brak werdyktów');
  check('⭐⛔ `zrodloSesji`: NIEZNANA mapa segmentów NIE BLOKUJE — praca nie znika przez brak przypisania',
    zrodloSesji({
      wydarzenia: [{ id: 1, scheduled_date: '2026-08-01', status: 'completed', recurrence_rule: null, focus_block_id: 'b1' }],
      werdykty: werdyktyJest, wpisyDziennika: new Set(), segmentBloku: null,
    }).rodzaj === 'jest',
    'brak mapy segmentów skasował wykonaną pracę');

  // ⛔ Reguła cykliczna nie dostaje dowodu z wiersza (reguła 4 pasa D1).
  const cykliczna = zrodloSesji({
    wydarzenia: [{ id: 7, scheduled_date: '2026-08-01', status: 'completed', recurrence_rule: 'weekly:tue', focus_block_id: null }],
    werdykty: werdyktyJest, wpisyDziennika: new Set([7]), segmentBloku: null,
  });
  check('⭐⛔ reguła cykliczna NIE dostaje dowodu ze `status` ani ze wpisu wskazującego WIERSZ',
    cykliczna.rodzaj === 'jest' && cykliczna.jednostki.length === 0,
    'jeden wpis o wtorkowym treningu policzyłby pracę za każdy wtorek w historii');

  // …ale werdykt o WYSTĄPIENIU liczy się także dla reguły cyklicznej.
  const werdyktCykliczny = zrodloSesji({
    wydarzenia: [{ id: 7, scheduled_date: '2026-08-01', status: 'scheduled', recurrence_rule: 'weekly:tue', focus_block_id: null }],
    werdykty: czytajWerdykty({
      dane: [{ calendar_event_id: 7, occurred_on: '2026-08-04', verdict: 'odbylo_sie', withdrawn_at: null }],
      blad: null,
    }),
    wpisyDziennika: new Set(), segmentBloku: null,
  });
  check('⭐ werdykt o WYSTĄPIENIU liczy się także dla reguły cyklicznej',
    werdyktCykliczny.rodzaj === 'jest' && werdyktCykliczny.jednostki.length === 1,
    'werdykt zawodnika przepadł');

  // Werdykt WYCOFANY nie jest dowodem.
  const wycofany = zrodloSesji({
    wydarzenia: [{ id: 7, scheduled_date: '2026-08-04', status: 'scheduled', recurrence_rule: null, focus_block_id: null }],
    werdykty: czytajWerdykty({
      dane: [{ calendar_event_id: 7, occurred_on: '2026-08-04', verdict: 'odbylo_sie', withdrawn_at: '2026-08-05T10:00:00Z' }],
      blad: null,
    }),
    wpisyDziennika: new Set(), segmentBloku: null,
  });
  check('⛔ werdykt WYCOFANY nie jest dowodem wykonanej pracy',
    wycofany.rodzaj === 'jest' && wycofany.jednostki.length === 0,
    'wycofany werdykt nadal daje punkty');

  // ⛔ Zadane, nieodpowiedziane pytanie kontrolne NIE jest pracą zawodnika.
  check('⛔ ZADANE, nieodpowiedziane pytanie kontrolne nie jest pracą — to produkt się odezwał',
    jednostkiZOdpowiedziKontrolnych([{ id: 'c1', answered_at: null, segment: 'wytrzymalosc' }]).length === 0,
    'nagroda za to, że appka zadała pytanie');
}

// ═══════════════════════════════════════════════════════════════════
// G6. EKRAN — `app/(tabs)/dzis.tsx`
// ═══════════════════════════════════════════════════════════════════
console.log('\nG6. EKRAN — app/(tabs)/dzis.tsx');
{
  // ⭐ (C4-5) SŁOWA ZAKAZANE. Na źródle BEZ komentarzy, żeby strażnik nie
  // zapalał się na własnym wyjaśnieniu, dlaczego tych słów nie ma.
  const zakazane: readonly (readonly [string, RegExp])[] = [
    ['seria', /\bseri(a|i|e|ę|ą|ach|om|ami)\b/i],
    ['passa', /\bpass(a|y|ie|ę|ą)\b/i],
    ['z rzędu', /z\s+rzędu/i],
    ['streak', /\bstreak/i],
  ];
  for (const [slowo, wzorzec] of zakazane) {
    const trafienia = dzis.split('\n').filter((l) => wzorzec.test(l));
    check(`⭐⛔ „${slowo}" NIE WYSTĘPUJE w kodzie ekranu`,
      trafienia.length === 0,
      `${trafienia.length} trafień, pierwsze: ${trafienia[0]?.trim().slice(0, 160)}`);
  }
  // Dwa dodatkowe kształty tej samej pokusy.
  check('⭐⛔ ekran nie mówi „nie przerwij" ani „codziennie"',
    !/nie przerw/i.test(dzis) && !/\bcodzienn/i.test(dzis),
    'wróciło wezwanie do obecności zamiast do pracy');

  // (C4-2/C4-3) EKRAN WOŁA CZYSTĄ FUNKCJĘ, JEDNYM ARGUMENTEM.
  check('ekran woła `policzNagrode`',
    /\bpoliczNagrode\(/.test(dzis),
    'nagroda za pracę nie ma konsumenta — czyli nie istnieje dla zawodnika');
  const wywolania = argumentyWywolania(dzis, 'policzNagrode');
  check('⛔ `policzNagrode` wołane z JEDNYM argumentem — ekran nie podmienia zasad',
    wywolania.length > 0 && wywolania.every((a) => a.length === 1),
    `wywołania: ${JSON.stringify(wywolania.map((a) => a.length))}`);

  // ⭐ (C4-1) LICZNIK JEST WYLICZANY, A NIE CZYTANY Z KOLUMNY STANU.
  check('⭐⛔ dorobek jest WYLICZANY w `useMemo`, a nie trzymany w stanie',
    /const nagroda[^=]*=\s*useMemo\(/.test(dzis),
    'nagroda nie powstaje z wyliczenia przy renderze');
  // ⚠️ TE DWA WZORCE SĄ WRAŻLIWE NA WIELKOŚĆ LITER I TO NIE JEST NIEDOPATRZENIE.
  // Nazwy kolumn i tabel w tej bazie są `snake_case` małymi literami, a stałe
  // brzmień w kodzie — WIELKIMI. Pierwsza wersja tej asercji miała `/i`
  // i zapaliła się na WŁASNEJ stałej `NAGRODA_PUNKTY` z tego samego pasa.
  // Strażnik, który świeci na czerwono z powodu nazwy własnej zmiennej, uczy
  // gaszenia go przez zmianę nazwy — czyli nie pilnuje niczego.
  check('⭐⛔ ekran NIE CZYTA odznak ani punktów z żadnej tabeli stanu',
    !/from\(['"](odznaki|badges|achievements|user_points|player_points|streaks?)['"]\)/.test(dzis)
    && !/\b(points_total|total_points|nagroda_punkty|badge_state|streak_count)\b/.test(dzis),
    'ktoś dołożył przechowywany licznik — a taki da się nie zwiększyć albo wyzerować');
  check('⭐ `policzNagrode` dostaje WEJŚCIA z `dane`, a nie gotową liczbę',
    wywolania.length > 0 && wywolania.every((a) => /wejsciaNagrody/.test(a[0])),
    `argument: ${wywolania.map((a) => a[0]).join(' | ')}`);

  // ⭐ CZTERY RZECZY Z C4.3 SĄ NARYSOWANE. Bez tej grupy strażnik świeci
  // na zielono przy funkcji, której zawodnik nigdy nie zobaczy.
  const render = dzis.slice(dzis.indexOf('function renderNagrodaZaPrace'));
  const cialoRenderu = render.slice(0, render.indexOf('\n  const allRecsLinkLabel'));
  check('⭐ (1) łączna praca jest narysowana',
    /NAGRODA_PUNKTY\(/.test(cialoRenderu), 'brak liczby łącznej pracy');
  check('⭐ (2) odznaki są narysowane RAZEM ZE ZDANIEM „za jaką pracę"',
    /\.odznaki\.map\(/.test(cialoRenderu) && /zaJakaPrace/.test(cialoRenderu),
    'odznaki bez uzasadnienia to naklejki (M4)');
  check('⭐ (3) następny próg jest narysowany',
    /NAGRODA_NASTEPNY\(/.test(cialoRenderu) && /nastepnyProg/.test(cialoRenderu),
    'brak następnego progu');
  check('⭐ (4) „nie udało się policzyć" ma WŁASNĄ stałą, inną niż „jeszcze nic"',
    /NAGRODA_NIE_POLICZONA\(/.test(cialoRenderu) && /NAGRODA_JESZCZE_NIC/.test(cialoRenderu)
    && /nie_policzona/.test(cialoRenderu),
    'awaria odczytu i zero pracy rysują się tym samym zdaniem (R5)');
  check('⭐ następny próg wyrażony jest w PRACY — bierze `brakuje` i nazwę miary',
    /nastepnyProg\.brakuje/.test(cialoRenderu) && /NAGRODA_MIARA\[/.test(cialoRenderu),
    'próg wyrażony inaczej niż pracą');
  check('⭐ R5 — to, czego ekran nie umie policzyć, jest wypisane z powodem',
    /nieumiemPoliczyc\.map\(/.test(cialoRenderu),
    'odznaka nie do policzenia znika po cichu');

  // ⛔ ZERO POWIADOMIEŃ. Nagroda jest DO ZOBACZENIA, gdy zawodnik wejdzie —
  // nie do zawołania go z powrotem.
  // ⚠️ WZORZEC CELUJE W POWIADOMIENIA, A NIE W SŁOWO `push`. Pierwsza wersja
  // szukała `/push/i` i zapaliła się na `router.push('/dziennik')`, czyli na
  // NAWIGACJI — a nawigacja jest dokładnie tym, co ten blok ma robić (M4:
  // liczba kończy się rzeczą do zrobienia). Zakaz dotyczy odezwania się do
  // zawodnika, który appki nie otworzył.
  check('⭐⛔ blok dorobku nie wysyła powiadomienia ani nie planuje odezwania',
    !/schedule[A-Za-z]*Notification|Notifications\s*\.|sendPush|expo-notifications|registerFor|scheduleNotificationAsync/i
      .test(cialoRenderu),
    'nagroda zaczepia zawodnika — czyli jest nagrodą za obecność w przebraniu');

  // ⛔ ZERO PORÓWNANIA Z INNYMI (N3).
  check('⛔ blok dorobku nie porównuje z innymi zawodnikami (N3)',
    !/ranking|miejsce w tabeli|na tle|lepszy niż|innych zawodnik/i.test(cialoRenderu),
    'porównanie z innymi po stronie zawodnika');

  // Wejścia nagrody nie mają prawa użyć `?? []`.
  const od = dzisSurowe.indexOf('WEJŚCIA NAGRODY ZA PRACĘ — POCZĄTEK');
  const do_ = dzisSurowe.indexOf('WEJŚCIA NAGRODY ZA PRACĘ — KONIEC');
  const sekcja = od >= 0 && do_ > od ? bezKomentarzy(dzisSurowe.slice(od, do_)) : null;
  check('⭐⛔ sekcja wejść nagrody nie ma ani jednego `?? []` / `|| []`',
    sekcja !== null && !/\?\?\s*\[\]/.test(sekcja) && !/\|\|\s*\[\]/.test(sekcja),
    sekcja === null ? 'nie znalazłem znaczników sekcji' : 'awaria odczytu skleiła się z „nic nie ma"');
  check('⭐ sekcja wejść nagrody buduje WSZYSTKIE cztery źródła',
    sekcja !== null && ['sesje:', 'dziennik:', 'odpowiedziKontrolne:', 'mecze:'].every((k) => sekcja.includes(k)),
    'brakuje któregoś ze źródeł pracy');
  check('⭐ cele czytane są BEZ filtra `status` — inaczej odznaka przepada po domknięciu celu',
    /from\('goals'\)\.select\('segment_id'\)\.eq\('user_id'[^\n]*\)(?!\s*\.eq\('status')/.test(dzis),
    'zapytanie o cele zawęża po statusie — odznaka zniknęłaby w dniu sukcesu');
}

// ═══════════════════════════════════════════════════════════════════
// G7. ⭐ BATERIA MUTACYJNA — pięć mutacji, każda zapala, każda cofnięta
// ═══════════════════════════════════════════════════════════════════
console.log('\nG7. ⭐ BATERIA MUTACYJNA');

type Wynik = { label: string; ok: boolean; detal: string };

/**
 * Bateria puszczana raz na PRAWDZIWYCH zasadach i raz na każdej mutacji.
 * ⛔ Punkt wpięcia (`ZasadyNagrody`, `ZasadyCzytania`) NIE JEST podawany przez
 * ekran — pilnuje tego asercja z G6 — więc mutacja nie ma drogi do zawodnika.
 */
function bateria(zasady: ZasadyNagrody, czytanie: ZasadyCzytania): Wynik[] {
  const w: Wynik[] = [];
  const push = (label: string, ok: boolean, detal: string) => w.push({ label, ok, detal });

  // 1. przerwa nie zmienia dorobku (⭐ dowód zakazu serii)
  const rozklady = rozkladyDajaTenSamWynikZ(zasady, czytanie);
  push('rozkład pracy w czasie nie zmienia dorobku', rozklady.ok, rozklady.detal);

  // 2. nieodczytane źródło nie daje liczby
  const nieodczyt = policzNagrode(we({ mecze: zrodloNieczytane('sieć') }), zasady);
  push('nieodczytane źródło → `nie_policzona`', nieodczyt.rodzaj === 'nie_policzona',
    `dostałem ${nieodczyt.rodzaj}`);

  // 3. zero pracy → zero odznak
  const puste = policzNagrode(we(), zasady);
  push('zero pracy → zero odznak',
    puste.rodzaj === 'policzona' && puste.odznaki.length === 0,
    `odznaki: ${puste.rodzaj === 'policzona' ? puste.odznaki.map((o) => o.id).join(',') : '—'}`);

  // 4. duplikat liczy się raz
  const raz = jednostkiZDziennika(wpisy(5));
  const dwa = policzNagrode(we({ dziennik: zrodlo([...raz, ...raz]) }), zasady);
  push('ten sam wiersz liczy się raz', punkty(dwa) === 5, `punkty=${punkty(dwa)}`);

  // 5. niepełne cele nie dają odznaki celu
  const niepelne = policzNagrode(we({
    sesje: zrodlo(jednostkiZSesji(sesje(20, 'wytrzymalosc'), czytanie)),
    segmentyCelow: { rodzaj: 'niepelne', powod: 'filtr status=active' },
  }), zasady);
  push('niepełne cele → brak odznaki celu i jawny powód',
    !ma(niepelne, 'praca_w_celu')
    && niepelne.rodzaj === 'policzona' && niepelne.nieumiemPoliczyc.some((b) => b.id === 'praca_w_celu'),
    `odznaki: ${niepelne.rodzaj === 'policzona' ? niepelne.odznaki.map((o) => o.id).join(',') : '—'}`);

  // 6. dorobek nie maleje przy dokładaniu pracy
  const male = punkty(policzNagrode(we({ dziennik: zrodlo(jednostkiZDziennika(wpisy(4))) }), zasady));
  const duze = punkty(policzNagrode(we({ dziennik: zrodlo(jednostkiZDziennika(wpisy(9))) }), zasady));
  push('więcej pracy → nie mniej punktów', duze >= male, `4 wpisy=${male}, 9 wpisów=${duze}`);

  return w;
}

/** Wariant `rozkladyDajaTenSamWynik` przyjmujący też `ZasadyNagrody`. */
function rozkladyDajaTenSamWynikZ(zasady: ZasadyNagrody, czytanie: ZasadyCzytania): { ok: boolean; detal: string } {
  const bazowa = '2026-01-01';
  const zbuduj = (dni: readonly number[]) => policzNagrode(we({
    sesje: zrodlo(jednostkiZSesji(dni.slice(0, 6).map((d, i) => ({
      idWydarzenia: 1000 + i, dzien: przesun(bazowa, d), segment: 'wytrzymalosc', maWpisWDzienniku: i % 2 === 0,
    })), czytanie)),
    dziennik: zrodlo(jednostkiZDziennika(dni.slice(6, 12).map((d, i) => ({
      id: 2000 + i, entry_type: 'morning', created_at: `${przesun(bazowa, d)}T07:00:00Z`, payload: { sleep_hours: 7 },
    })), czytanie).concat(jednostkiZDziennika(dni.slice(12, 16).map((d, i) => ({
      id: 3000 + i, entry_type: 'post_training', created_at: `${przesun(bazowa, d)}T19:00:00Z`, payload: { rpe: 6 },
    })), czytanie))),
    mecze: zrodlo(jednostkiZMeczow(dni.slice(16, 18).map((d, i) => ({
      id: 4000 + i, created_at: `${przesun(bazowa, d)}T20:00:00Z`,
    })), czytanie)),
    odpowiedziKontrolne: zrodlo(jednostkiZOdpowiedziKontrolnych(dni.slice(18, 20).map((d, i) => ({
      id: `c${i}`, answered_at: `${przesun(bazowa, d)}T18:00:00Z`, segment: 'wytrzymalosc',
    })), czytanie)),
  }), zasady);

  const rozklady: number[][] = [
    Array.from({ length: 20 }, () => 0),
    Array.from({ length: 20 }, (_, i) => i),
    Array.from({ length: 20 }, (_, i) => i * 7),
    Array.from({ length: 20 }, (_, i) => (i < 10 ? i : i + 400)),
    Array.from({ length: 20 }, (_, i) => 500 - i),
  ];
  for (let z = 1; z <= 45; z++) rozklady.push(losowyRozkladDni(z * 7919, 20));

  const wzorzec = odcisk(zbuduj(rozklady[0]));
  for (let i = 1; i < rozklady.length; i++) {
    const teraz = odcisk(zbuduj(rozklady[i]));
    if (teraz !== wzorzec) {
      return { ok: false, detal: `rozkład #${i} dał „${teraz}", a rozkład #0 „${wzorzec}"` };
    }
  }
  return { ok: true, detal: `${rozklady.length} rozkładów, wszystkie „${wzorzec}"` };
}

{
  const prawdziwe = bateria(ZASADY_NAGRODY_PRAWDZIWE, CZYTAJ_WSZYSTKO);
  const zieloneNaPrawdziwych = prawdziwe.filter((x) => !x.ok);
  check(`⭐ na PRAWDZIWYCH zasadach bateria jest zielona (${prawdziwe.length} asercji)`,
    zieloneNaPrawdziwych.length === 0,
    zieloneNaPrawdziwych.map((x) => `${x.label}: ${x.detal}`).join(' | '));

  const mutacje: { nazwa: string; zasady: ZasadyNagrody; czytanie: ZasadyCzytania }[] = [
    {
      nazwa: 'M1 · ⭐ WRACA OKNO 14 DNI (czytnik odrzuca starszą pracę)',
      zasady: ZASADY_NAGRODY_PRAWDZIWE,
      czytanie: { oknoDni: 14, dzis: '2026-01-20' },
    },
    {
      nazwa: 'M2 · nieodczytane źródło liczone jak puste',
      zasady: { ...ZASADY_NAGRODY_PRAWDZIWE, brakWolnoUznacZaZero: true },
      czytanie: CZYTAJ_WSZYSTKO,
    },
    {
      nazwa: 'M3 · odznaka bez pokrycia w pracy',
      zasady: { ...ZASADY_NAGRODY_PRAWDZIWE, progWolnoDacBezPracy: true },
      czytanie: CZYTAJ_WSZYSTKO,
    },
    {
      nazwa: 'M4 · duplikaty liczone wielokrotnie',
      zasady: { ...ZASADY_NAGRODY_PRAWDZIWE, odsiewajDuplikaty: false },
      czytanie: CZYTAJ_WSZYSTKO,
    },
    {
      nazwa: 'M5 · niepełny zbiór celów liczony jak pełny',
      zasady: { ...ZASADY_NAGRODY_PRAWDZIWE, niepelneCeleLiczaSieJakPelne: true },
      czytanie: CZYTAJ_WSZYSTKO,
    },
  ];

  let wszystkieZapalily = true;
  for (const m of mutacje) {
    const wynik = bateria(m.zasady, m.czytanie);
    const fail = wynik.filter((x) => !x.ok);
    if (fail.length === 0) wszystkieZapalily = false;
    console.log(`\n${m.nazwa}   →   ${fail.length} / ${wynik.length} FAIL`);
    for (const f of fail) console.log(`      ↳ ${f.label}: ${f.detal.slice(0, 190)}`);
  }
  console.log('');
  check('⭐ KAŻDA z pięciu mutacji zapala co najmniej jedną asercję',
    wszystkieZapalily, 'któraś mutacja przeszła niezauważona');

  // Cofnięcie każdej mutacji: bateria znów zielona.
  const poCofnieciu = bateria(ZASADY_NAGRODY_PRAWDZIWE, CZYTAJ_WSZYSTKO).filter((x) => !x.ok);
  check('⭐ po cofnięciu wszystkich mutacji bateria jest znowu zielona',
    poCofnieciu.length === 0, poCofnieciu.map((x) => x.label).join(' | '));
}

// ═══════════════════════════════════════════════════════════════════
// G8. DANE PRODUKCYJNE — oba stany są OSIĄGALNE, nie tylko opisane
// ═══════════════════════════════════════════════════════════════════
console.log('\nG8. DANE PRODUKCYJNE — czy oba stany są osiągalne');
{
  // ⚠️ TO NIE SĄ ASERCJE NA LICZBY Z PRODUKCJI. Test „dorobek wynosi 15"
  // zgasłby przy pierwszym nowym wpisie i niczego by nie pilnował. Asercja
  // brzmi: oba stany DA SIĘ osiągnąć na kształcie danych, jaki dziś istnieje.
  // Liczby stoją w nocie.
  const kształtProdukcyjny = policzNagrode(we({
    dziennik: zrodlo(jednostkiZDziennika([
      ...wpisy(5, '2026-08-05'),
      ...wpisyZPomiarem(2, '2026-08-05'),
    ])),
    mecze: zrodlo(jednostkiZMeczow([
      { id: 1, created_at: '2026-07-29T20:00:00Z' }, { id: 2, created_at: '2026-07-29T21:00:00Z' },
    ])),
    sesje: zrodloSesji({
      // 12 wydarzeń `scheduled`, zero `completed`, zero powiązań, zero werdyktów.
      wydarzenia: Array.from({ length: 12 }, (_, i) => ({
        id: 100 + i, scheduled_date: `2026-08-0${(i % 9) + 1}`, status: 'scheduled',
        recurrence_rule: null, focus_block_id: 'blok-1',
      })),
      werdykty: czytajWerdykty({ dane: [], blad: null }),
      wpisyDziennika: new Set<number>(),
      segmentBloku: new Map([['blok-1', 'wytrzymalosc']]),
    }),
    segmentyCelow: { rodzaj: 'pelne', segmenty: new Set(['wytrzymalosc']) },
  }));

  check('⭐ na dzisiejszym KSZTAŁCIE danych dorobek JEST policzalny i większy od zera',
    kształtProdukcyjny.rodzaj === 'policzona' && kształtProdukcyjny.punkty > 0,
    `wynik: ${opisNagrodyDoLogu(kształtProdukcyjny)}`);
  check('⭐ …i daje co najmniej jedną odznakę, mimo ZERA dowodów wykonania sesji',
    kształtProdukcyjny.rodzaj === 'policzona' && kształtProdukcyjny.odznaki.length > 0,
    'zawodnik z siedmioma wpisami i dwoma meczami nie dostałby nic');
  check('⭐ …i ma następny próg wyrażony w pracy',
    kształtProdukcyjny.rodzaj === 'policzona' && kształtProdukcyjny.nastepnyProg !== null
    && kształtProdukcyjny.nastepnyProg.brakuje > 0,
    'brak następnego progu przy niepełnym dorobku');
  console.log(`       (dla protokołu: ${opisNagrodyDoLogu(kształtProdukcyjny)})`);

  const zeroWszedzie = policzNagrode(we());
  check('⭐ zawodnik bez ani jednego wiersza dostaje POMIAR zera, nie awarię',
    zeroWszedzie.rodzaj === 'policzona' && zeroWszedzie.punkty === 0 && zeroWszedzie.odznaki.length === 0,
    opisNagrodyDoLogu(zeroWszedzie));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
