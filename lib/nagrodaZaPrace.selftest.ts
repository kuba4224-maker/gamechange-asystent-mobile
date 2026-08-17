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
// ── ⭐ PLAN-D-L1 (17.08.2026) — SZEŚĆ GRUP DOŁOŻONYCH ───────────────
// Od 17.08 `JednostkaPracy` NIESIE DATĘ (decyzja Kuby D1), bo produkt ma umieć
// powiedzieć, ile pracy mieści się w ostatnich dniach. ⛔ Zakaz z (C4-1) NIE
// ZNIKNĄŁ — przeniósł się z kształtu danych do funkcji dorobku i jest teraz
// pilnowany MOCNIEJ, bo także uruchomieniem:
//   (L1-D2) ⭐ dorobek całkowity nie przyjmuje okna i nie czyta daty jednostki;
//   (L1-D3/D4) okno naprawdę obcina, a 7 i 28 stoją dokładnie w jednym miejscu;
//   (L1-D5) moduł obciążenia mówi ILE, nigdy CZY — szukane po treści całego pliku;
//   (L1-D6) trzy wartości wyniku i trzy różne zdania;
//   (L1-D8) jednostka bez daty nie jest zerem i nie jest „dzisiaj";
//   (L1-D7) ⭐ zapadka na moduły `lib/` bez ani jednego konsumenta — RÓWNOŚĆ.
//
// ⚠️ CZEGO TEN PLIK NIE UDAJE. Część asercji czyta ŹRÓDŁO EKRANU JAKO TEKST
// (wzorzec z `kartaDzisILicznik.selftest.ts` i `wgladyNaDzis.selftest.ts`).
// To nie jest test — to jest strażnik regresji. Nie uruchamia Reacta i nie wie,
// czy ekran się rysuje.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (ograniczenie O53): `tsconfig.json` ciągnie DOM,
// więc `tsc` pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.
// ═════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, existsSync } from 'node:fs';
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
  type JednostkaPracy,
  type NagrodaZaPrace,
  type OdznakaId,
  type WejscieNagrody,
  type WejscieZrodla,
  type WierszSesji,
  type ZasadyNagrody,
} from './nagrodaZaPrace';
import {
  policzObciazenieWOknie,
  zdanieObciazenia,
  opisObciazeniaDoLogu,
  OKNO_OBCIAZENIA_DNI,
  OKNO_ODNIESIENIA_DNI,
  ZASADY_OBCIAZENIA_PRAWDZIWE,
  type ObciazenieWOknie,
  type ZasadyObciazenia,
} from './obciazenieOstatnichDni';
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
const PLIK_OBCIAZENIE = 'lib/obciazenieOstatnichDni.ts';
const dzisSurowe = readFileSync(join(root, PLIK_DZIS), 'utf8');
const dzis = bezKomentarzy(dzisSurowe);
const libSurowe = readFileSync(join(root, PLIK_LIB), 'utf8');
const lib = bezKomentarzy(libSurowe);
const obciazenieSurowe = readFileSync(join(root, PLIK_OBCIAZENIE), 'utf8');
const obciazenie = bezKomentarzy(obciazenieSurowe);

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

  // ⭐ PLAN-D-L1 (D1) — DO 17.08.2026 STAŁA TU ASERCJA ODWROTNA: „typ
  // `JednostkaPracy` NIE MA pola z datą". ⛔ Nie została skasowana po cichu —
  // została ODWRÓCONA decyzją Kuby D1 i zastąpiona zapadką D2 niżej, która
  // pilnuje tego samego zakazu w miejscu, w którym on naprawdę obowiązuje:
  // w funkcji DOROBKU CAŁKOWITEGO, a nie w kształcie danych.
  const blokTypu = libSurowe.slice(
    libSurowe.indexOf('export type JednostkaPracy = {'),
    libSurowe.indexOf('// ═══', libSurowe.indexOf('export type JednostkaPracy = {')),
  );
  check('⭐ (L1-D1) typ `JednostkaPracy` MA pole `kiedy` — bez niego okna nie da się policzyć',
    blokTypu.length > 0 && /^\s*kiedy\s*:/m.test(bezKomentarzy(blokTypu)),
    `blok typu: ${bezKomentarzy(blokTypu).slice(0, 220)}`);

  check('⭐ (L1-D1) `DataPracy` ma TRZY wartości, nie dwie — dzień pracy ≠ dzień zapisu ≠ brak daty',
    /rodzaj: 'dzien_pracy'/.test(lib) && /rodzaj: 'dzien_zapisu'/.test(lib) && /rodzaj: 'nieznana'/.test(lib),
    'data jednostki zwinęła się do „jest albo nie ma" — a wtedy data zapisu udaje datę pracy (Z0)');

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
function tenSamKomplet(dni: readonly number[]): NagrodaZaPrace {
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
    sesje: zrodlo(jednostkiZSesji(s)),
    dziennik: zrodlo(jednostkiZDziennika(w).concat(jednostkiZDziennika(p))),
    mecze: zrodlo(jednostkiZMeczow(m)),
    odpowiedziKontrolne: zrodlo(jednostkiZOdpowiedziKontrolnych(k)),
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
function rozkladyDajaTenSamWynik(): { ok: boolean; detal: string } {
  const rozklady: number[][] = [
    Array.from({ length: 20 }, () => 0),                    // wszystko jednego dnia
    Array.from({ length: 20 }, (_, i) => i),                // dzień po dniu
    Array.from({ length: 20 }, (_, i) => i * 7),            // raz w tygodniu
    Array.from({ length: 20 }, (_, i) => (i < 10 ? i : i + 400)), // przerwa 13 miesięcy w środku
    Array.from({ length: 20 }, (_, i) => 500 - i),          // wszystko dawno temu
  ];
  for (let z = 1; z <= 45; z++) rozklady.push(losowyRozkladDni(z * 7919, 20));

  const wzorzec = odcisk(tenSamKomplet(rozklady[0]));
  for (let i = 1; i < rozklady.length; i++) {
    const teraz = odcisk(tenSamKomplet(rozklady[i]));
    if (teraz !== wzorzec) {
      return { ok: false, detal: `rozkład #${i} (dni ${rozklady[i].slice(0, 6).join(',')}…) dał „${teraz}", a rozkład #0 „${wzorzec}"` };
    }
  }
  return { ok: true, detal: `${rozklady.length} rozkładów, wszystkie „${wzorzec}"` };
}

{
  const wynik = rozkladyDajaTenSamWynik();
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
// L1. ⭐ PLAN-D-L1 17.08.2026 — OBCIĄŻENIE OSTATNICH DNI I PORZĄDEK W SILNIKU
// ═══════════════════════════════════════════════════════════════════
//
// Sześć grup, każda z własną decyzją Kuby:
//   (L1-D2) ⭐ NAJWAŻNIEJSZA — dorobek całkowity NADAL nie ma okna;
//   (L1-D3/D4) okno naprawdę obcina, a obie liczby stoją w jednym miejscu;
//   (L1-D5) moduł obciążenia mówi ILE, nigdy CZY;
//   (L1-D6) trzy wartości i trzy różne zdania;
//   (L1-D8) jednostka bez daty nie jest zerem i nie jest „dzisiaj";
//   (L1-D7) ⭐ zapadka na moduły `lib/` bez ani jednego konsumenta.

const DZIS_L1 = '2026-08-17';

/** Osiem wpisów objętości (waga 1): cztery W OKNIE 7 dni, cztery sprzed miesięcy. */
const WEJSCIE_POLOWA_STARSZA: WejscieNagrody = we({
  dziennik: zrodlo(jednostkiZDziennika([
    ...[0, 1, 2, 3].map((i) => ({
      id: 9100 + i, entry_type: 'morning', created_at: `${przesun('2026-08-11', i)}T07:00:00Z`,
      payload: { sleep_hours: 7 },
    })),
    ...[0, 1, 2, 3].map((i) => ({
      id: 9200 + i, entry_type: 'morning', created_at: `${przesun('2026-06-01', i)}T07:00:00Z`,
      payload: { sleep_hours: 7 },
    })),
  ])),
});
const PUNKTY_POLOWY = 4;
const PUNKTY_CALOSCI = 8;

/** Dwie jednostki, których nie da się umieścić w czasie — źródło nie ma daty. */
const WEJSCIE_BEZ_DATY: WejscieNagrody = we({
  dziennik: zrodlo(jednostkiZDziennika([
    { id: 9300, entry_type: 'morning', created_at: null, payload: { sleep_hours: 7 } },
    { id: 9301, entry_type: 'morning', created_at: 'nie data', payload: { sleep_hours: 7 } },
  ])),
});

/** Praca jest, ale cała starsza niż okno. ⛔ To NIE JEST awaria odczytu. */
const WEJSCIE_TYLKO_STARE: WejscieNagrody = we({
  dziennik: zrodlo(jednostkiZDziennika(wpisy(4, '2026-06-01'))),
});

console.log('\nL1-D2. ⭐⭐ ZAPADKA: DOROBEK CAŁKOWITY NADAL NIE MA OKNA');
{
  // ── (a) DOWÓD Z TEKSTU ŹRÓDŁA ──────────────────────────────────────
  const cialoDorobku = (() => {
    const od = lib.indexOf('export function policzNagrode(');
    if (od < 0) return null;
    const koniec = lib.indexOf('\nexport function', od + 10);
    return lib.slice(od, koniec > od ? koniec : lib.length);
  })();

  check('⭐⛔ (L1-D2) `policzNagrode` NIE CZYTA pola `kiedy` ani żadnej daty jednostki',
    cialoDorobku !== null
    && !/\.kiedy\b/.test(cialoDorobku)
    && !/\bkiedy\b/.test(cialoDorobku)
    && !/\.dzien\b/.test(cialoDorobku),
    cialoDorobku === null
      ? 'nie znalazłem ciała `policzNagrode`'
      : 'dorobek całkowity sięgnął po datę — od tej chwili może maleć');

  check('⭐⛔ (L1-D2) `policzNagrode` NIE PRZYJMUJE żadnego parametru okna',
    cialoDorobku !== null
    && !/okno/i.test(cialoDorobku.slice(0, cialoDorobku.indexOf('{'))),
    'w podpisie dorobku pojawiło się okno');

  check('⭐⛔ (L1-D2) `nagrodaZaPrace.ts` nie zna nazw okien z modułu obciążenia',
    !/OKNO_OBCIAZENIA_DNI|OKNO_ODNIESIENIA_DNI/.test(lib)
    && !/from ['"]\.\/obciazenieOstatnichDni['"]/.test(lib),
    'plik dorobku zaczął importować okno — czyli okno jest o jeden import od dorobku');

  // ── (b) ⭐ DOWÓD Z URUCHOMIENIA — ten sam zestaw, dwa rozkłady w czasie ──
  // ⛔ To jest ta asercja, której nie da się oszukać czytaniem kodu.
  const wJednymDniu = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const poRoku = Array.from({ length: 20 }, (_, i) => i * 18);
  check('⭐⭐⛔ (L1-D2) TEN SAM ZESTAW skupiony w JEDNYM DNIU i rozrzucony PO ROKU — TA SAMA liczba dorobku',
    odcisk(tenSamKomplet(wJednymDniu)) === odcisk(tenSamKomplet(poRoku)),
    `jeden dzień: ${odcisk(tenSamKomplet(wJednymDniu))} · rok: ${odcisk(tenSamKomplet(poRoku))}`);

  // …i ta sama praca policzona przez OKNO daje przy tych dwóch rozkładach
  // liczby RÓŻNE. Bez tego zdania asercja wyżej mogłaby być zielona dlatego,
  // że okno w ogóle nie działa.
  const komplet = (dni: readonly number[]): WejscieNagrody => we({
    dziennik: zrodlo(jednostkiZDziennika(dni.map((d, i) => ({
      id: 9400 + i, entry_type: 'morning', created_at: `${przesun('2026-08-17', -d)}T07:00:00Z`,
      payload: { sleep_hours: 7 },
    })))),
  });
  const oknoSkupione = policzObciazenieWOknie(komplet(wJednymDniu), { dzis: DZIS_L1, oknoDni: OKNO_OBCIAZENIA_DNI });
  const oknoRozrzucone = policzObciazenieWOknie(komplet(poRoku), { dzis: DZIS_L1, oknoDni: OKNO_OBCIAZENIA_DNI });
  check('⭐ (L1-D2) …a OBCIĄŻENIE przy tych samych dwóch rozkładach daje liczby RÓŻNE',
    oknoSkupione.rodzaj === 'policzone' && oknoRozrzucone.rodzaj === 'policzone'
    && oknoSkupione.punkty !== oknoRozrzucone.punkty,
    `${opisObciazeniaDoLogu(oknoSkupione)} vs ${opisObciazeniaDoLogu(oknoRozrzucone)}`);
}

console.log('\nL1-D3/D4. OKNO OBCINA, A OBIE LICZBY STOJĄ W JEDNYM MIEJSCU');
{
  const w7 = policzObciazenieWOknie(WEJSCIE_POLOWA_STARSZA, { dzis: DZIS_L1, oknoDni: OKNO_OBCIAZENIA_DNI });
  const dorobek = policzNagrode(WEJSCIE_POLOWA_STARSZA);
  check(`⭐ (L1-D3) połowa pracy starsza niż tydzień → obciążenie oddaje POŁOWĘ (${PUNKTY_POLOWY} z ${PUNKTY_CALOSCI})`,
    w7.rodzaj === 'policzone' && w7.punkty === PUNKTY_POLOWY,
    opisObciazeniaDoLogu(w7));
  check(`⭐ (L1-D3) …a DOROBEK przy tym samym wejściu oddaje CAŁOŚĆ (${PUNKTY_CALOSCI})`,
    punkty(dorobek) === PUNKTY_CALOSCI, `dorobek=${punkty(dorobek)}`);

  check('⭐ (L1-D3) to są DWIE osobne funkcje w DWÓCH plikach, nie jedna z przełącznikiem',
    /export function policzObciazenieWOknie\(/.test(obciazenie)
    && /export function policzNagrode\(/.test(lib)
    && !/export function policzObciazenieWOknie\(/.test(lib),
    'obie liczby wyszły z jednej funkcji — czyli przełącznik trybu istnieje');

  // ⛔ (D4) OBIE LICZBY STOJĄ RAZ. Nie „w trzech asercjach".
  const ile = (s: string, re: RegExp) => (s.match(re) ?? []).length;
  check('⭐⛔ (L1-D4) liczba 7 stoi w module obciążenia DOKŁADNIE RAZ — przy nazwanej stałej',
    ile(obciazenie, /\b7\b/g) === 1 && /OKNO_OBCIAZENIA_DNI = 7;/.test(obciazenie),
    `wystąpień „7": ${ile(obciazenie, /\b7\b/g)}`);
  check('⭐⛔ (L1-D4) liczba 28 stoi w module obciążenia DOKŁADNIE RAZ — przy nazwanej stałej',
    ile(obciazenie, /\b28\b/g) === 1 && /OKNO_ODNIESIENIA_DNI = 28;/.test(obciazenie),
    `wystąpień „28": ${ile(obciazenie, /\b28\b/g)}`);
  check('⭐ (L1-D4) obie stałe mają przy sobie zdanie, SKĄD SIĘ WZIĘŁY',
    /Skąd 7:/.test(obciazenieSurowe) && /Skąd 28:/.test(obciazenieSurowe)
    && /NIE MA ZA SOBĄ BADANIA/.test(obciazenieSurowe),
    'liczba bez uzasadnienia wraca za miesiąc jako „tak było"');
  check('⭐ (L1-D4) obie stałe są DODATNIMI liczbami całkowitymi i 28 > 7',
    Number.isInteger(OKNO_OBCIAZENIA_DNI) && OKNO_OBCIAZENIA_DNI >= 1
    && Number.isInteger(OKNO_ODNIESIENIA_DNI) && OKNO_ODNIESIENIA_DNI > OKNO_OBCIAZENIA_DNI,
    `${OKNO_OBCIAZENIA_DNI} / ${OKNO_ODNIESIENIA_DNI}`);

  // ⛔ Sam ten strażnik też nie wpisuje długości okna liczbą. ⚠️ Wzorzec celuje
  // w `[1-9]`, a nie w dowolną cyfrę, i to nie jest niedopatrzenie: `oknoDni: 0`
  // stoi niżej JAKO PRÓBKA WEJŚCIA NIEPOPRAWNEGO. Zero nie jest długością okna,
  // więc nie da się nim przepisać stałej w drugie miejsce.
  const jaSam = readFileSync(join(root, 'lib/nagrodaZaPrace.selftest.ts'), 'utf8');
  check('⭐⛔ (L1-D4) ANI JEDNO wywołanie w tym strażniku nie podaje długości okna liczbą',
    !/oknoDni:\s*[1-9]/.test(jaSam),
    'długość okna wpisana drugi raz — czyli zmiana stałej nie zmieni już wszystkiego');

  // Okno 28 dni obejmuje wszystko, co obejmuje okno 7 dni. Nigdy odwrotnie.
  const w28 = policzObciazenieWOknie(WEJSCIE_POLOWA_STARSZA, { dzis: DZIS_L1, oknoDni: OKNO_ODNIESIENIA_DNI });
  check('⭐ (L1-D4) okno szersze nigdy nie oddaje MNIEJ niż węższe',
    w28.rodzaj === 'policzone' && w7.rodzaj === 'policzone' && w28.punkty >= w7.punkty,
    `${opisObciazeniaDoLogu(w7)} · ${opisObciazeniaDoLogu(w28)}`);
}

console.log('\nL1-D5. MODUŁ OBCIĄŻENIA MÓWI ILE, NIGDY CZY');
{
  // ⛔ SZUKANE PO TREŚCI, W CAŁYM PLIKU — RAZEM Z KOMENTARZAMI. To jest
  // mocniejsze niż wzorzec z G6 (tam czytamy ekran bez komentarzy, bo ekran
  // cytuje zakazy w dokumentacji). Moduł obciążenia jest pisany tak, żeby
  // NIE CYTOWAĆ zakazanych brzmień — powody stoją w `nagrodaZaPrace.ts`
  // i w nocie. Cena jest świadoma, zysk też: nie da się przemycić słowa
  // do brzmienia, chowając je w komentarzu.
  const zakazaneL1: readonly (readonly [string, RegExp])[] = [
    ['seria dni', /\bseri(a|i|e|ę|ą|ach|om|ami)\b/i],
    ['passa', /\bpass(a|y|ie|ę|ą)\b/i],
    ['z rzędu', /z\s+rzędu/i],
    ['streak', /\bstreak/i],
    ['codziennie', /\bcodzienn/i],
    ['porównanie', /\bporówn/i],
    ['ranking', /\branking/i],
    ['na tle', /na\s+tle\b/i],
    ['lepszy', /\blepsz/i],
    ['gorszy', /\bgorsz/i],
    ['inni zawodnicy', /innych\s+zawodnik/i],
    ['ocena', /\bocen/i],
    ['dobrze', /\bdobrze\b/i],
    ['słabo', /\bsłab/i],
    ['za mało', /za\s+mało/i],
    ['za dużo', /za\s+dużo/i],
    ['wystarczająco', /wystarczająco/i],
    ['powinieneś', /\bpowin(ien|na|no|ieneś)/i],
  ];
  const trafienia = zakazaneL1
    .map(([slowo, wzorzec]) => [slowo, obciazenieSurowe.split('\n').filter((l) => wzorzec.test(l))] as const)
    .filter(([, l]) => l.length > 0);
  check(`⭐⛔ (L1-D5) w module obciążenia NIE MA ani jednego z ${zakazaneL1.length} zakazanych brzmień — szukane po TREŚCI`,
    trafienia.length === 0,
    trafienia.map(([s, l]) => `„${s}": ${l[0].trim().slice(0, 120)}`).join(' | '));

  // ⭐ Strażnik strażnika: lista naprawdę łapie, a nie jest ozdobą.
  const probka = 'const x = "seria dni z rzędu";';
  check('⭐ (L1-D5) (strażnik strażnika) ta sama lista ZAPALA się na próbce z zakazanym brzmieniem',
    zakazaneL1.some(([, wzorzec]) => wzorzec.test(probka)),
    'lista zakazanych brzmień nie łapie nawet jawnej próbki');

  // Zdania oddawane przez moduł też są czyste — sprawdzone na wyniku, nie na źródle.
  const trzyZdania = [
    zdanieObciazenia(policzObciazenieWOknie(WEJSCIE_POLOWA_STARSZA, { dzis: DZIS_L1, oknoDni: OKNO_OBCIAZENIA_DNI })),
    zdanieObciazenia(policzObciazenieWOknie(WEJSCIE_TYLKO_STARE, { dzis: DZIS_L1, oknoDni: OKNO_OBCIAZENIA_DNI })),
    zdanieObciazenia(policzObciazenieWOknie(we({ mecze: { rodzaj: 'nie_odczytano', powod: 'sieć' } }), { dzis: DZIS_L1, oknoDni: OKNO_OBCIAZENIA_DNI })),
  ];
  check('⭐⛔ (L1-D5) ŻADNE z trzech zdań oddawanych zawodnikowi nie zawiera zakazanego brzmienia',
    trzyZdania.every((z) => zakazaneL1.every(([, wzorzec]) => !wzorzec.test(z))),
    trzyZdania.join(' || '));
  for (const z of trzyZdania) console.log(`       (brzmienie: ${z})`);
}

console.log('\nL1-D6/D8. TRZY WARTOŚCI, TRZY ZDANIA — I BRAK DATY, KTÓRY NIE JEST ZEREM');
{
  const pusto = policzObciazenieWOknie(WEJSCIE_TYLKO_STARE, { dzis: DZIS_L1, oknoDni: OKNO_OBCIAZENIA_DNI });
  const awaria = policzObciazenieWOknie(
    we({ dziennik: { rodzaj: 'nie_odczytano', powod: 'sieć padła' } }),
    { dzis: DZIS_L1, oknoDni: OKNO_OBCIAZENIA_DNI },
  );
  const jest = policzObciazenieWOknie(WEJSCIE_POLOWA_STARSZA, { dzis: DZIS_L1, oknoDni: OKNO_OBCIAZENIA_DNI });

  check('⭐ (L1-D6) TRZY różne wartości: policzone · brak pracy w oknie · nie policzone',
    jest.rodzaj === 'policzone' && pusto.rodzaj === 'brak_pracy_w_oknie' && awaria.rodzaj === 'nie_policzone',
    `${jest.rodzaj} / ${pusto.rodzaj} / ${awaria.rodzaj}`);

  const zdania = [zdanieObciazenia(jest), zdanieObciazenia(pusto), zdanieObciazenia(awaria)];
  check('⭐ (L1-D6) …i TRZY różne zdania — żadne dwa nie są tym samym napisem',
    new Set(zdania).size === 3, zdania.join(' || '));

  check('⭐⛔ (L1-D6) kształt „brak pracy w oknie" NIE MA pola `punkty` — „0 punktów" jest nie do narysowania',
    pusto.rodzaj === 'brak_pracy_w_oknie' && !('punkty' in pusto),
    'da się narysować zero tam, gdzie zero i awaria wyglądają tak samo');

  check('⭐ (L1-D6) „nie policzone" mówi, CZEGO nie przeczytało',
    awaria.rodzaj === 'nie_policzone' && awaria.nieodczytane.length === 1
    && awaria.nieodczytane[0].includes('sieć padła'),
    JSON.stringify(awaria.rodzaj === 'nie_policzone' ? awaria.nieodczytane : []));

  // ── (D8) jednostka bez daty ────────────────────────────────────────
  const bezDaty = policzObciazenieWOknie(WEJSCIE_BEZ_DATY, { dzis: DZIS_L1, oknoDni: OKNO_OBCIAZENIA_DNI });
  check('⭐⛔ (L1-D8) jednostka BEZ DATY nie wpada do okna — data nie jest zgadywana',
    bezDaty.rodzaj === 'brak_pracy_w_oknie',
    opisObciazeniaDoLogu(bezDaty));
  check('⭐ (L1-D8) …i NIE ZNIKA po cichu: jest policzona i nazwana z rodzaju',
    bezDaty.rodzaj === 'brak_pracy_w_oknie' && bezDaty.pozaPomiarem.length === 2
    && bezDaty.pozaPomiarem.every((p) => p.rodzaj === 'wpis_dziennika' && p.powod.length > 5),
    JSON.stringify(bezDaty.rodzaj === 'nie_policzone' ? [] : bezDaty.pozaPomiarem));
  check('⭐⛔ (L1-D8) …a DOROBEK liczy ją normalnie — brak daty nie odbiera wykonanej pracy',
    punkty(policzNagrode(WEJSCIE_BEZ_DATY)) === 2,
    `dorobek=${punkty(policzNagrode(WEJSCIE_BEZ_DATY))}`);

  // ── (D8) dzień pracy ≠ dzień zapisu, i wynik to rozróżnia ──────────
  const mieszane = policzObciazenieWOknie(we({
    dziennik: zrodlo(jednostkiZDziennika([
      { id: 9500, entry_type: 'morning', created_at: '2026-08-15T07:00:00Z', payload: { sleep_hours: 7 } },
      { id: 9501, entry_type: 'post_training', created_at: '2026-08-15T19:00:00Z', payload: { rpe: 6 } },
    ])),
    mecze: zrodlo(jednostkiZMeczow([{ id: 9600, created_at: '2026-08-16T20:00:00Z' }])),
  }), { dzis: DZIS_L1, oknoDni: OKNO_OBCIAZENIA_DNI });
  check('⭐ (L1-D8) wynik ROZRÓŻNIA pracę zadatowaną dniem pracy od zadatowanej dniem zapisu',
    mieszane.rodzaj === 'policzone' && mieszane.zDniaPracy === 1 && mieszane.zDniaZapisu === 2,
    opisObciazeniaDoLogu(mieszane));

  // ⛔ Niepoprawne wejścia nie udają pomiaru.
  const zlaData = policzObciazenieWOknie(WEJSCIE_POLOWA_STARSZA, { dzis: 'kiedyś', oknoDni: OKNO_OBCIAZENIA_DNI });
  check('⛔ (L1-D6) bez dzisiejszej daty funkcja ODMAWIA, zamiast oddać zero',
    zlaData.rodzaj === 'nie_policzone', `dostałem ${zlaData.rodzaj}`);
  const zleOkno = policzObciazenieWOknie(WEJSCIE_POLOWA_STARSZA, { dzis: DZIS_L1, oknoDni: 0 });
  check('⛔ (L1-D6) okno o długości 0 dni to nie jest okno — funkcja ODMAWIA',
    zleOkno.rodzaj === 'nie_policzone', `dostałem ${zleOkno.rodzaj}`);
}

console.log('\nL1-D7. ⭐ ZAPADKA: MODUŁY `lib/` BEZ ANI JEDNEGO KONSUMENTA');
{
  // ⛔ RÓWNOŚĆ, NIE „≤" (O73). Lista nazw w komunikacie, żeby dało się to
  // odhaczyć bez uruchamiania czegokolwiek.
  //
  // ⚠️ DEFINICJA KONSUMENTA, napisana wprost: importer W CAŁYM REPOZYTORIUM
  // (poza `_diag_backup/`) INNY NIŻ własny selftest modułu. Moduł, którego
  // jedynym importerem jest jego własny strażnik, jest martwy: strażnik
  // pilnuje wtedy sam siebie. Zmierzone 17.08.2026 przed pasem L1: DWA takie
  // moduły — `lib/arbiterGlosu.ts` i `lib/sladZachowania.ts`. Pas L1 usunął
  // oba, więc po nim ma być ZERO.
  const KATALOGI = ['lib', 'app', 'app/(tabs)', 'components', 'tests'];
  const pliki: { rel: string; tresc: string }[] = [];
  for (const k of KATALOGI) {
    const kat = join(root, k);
    if (!existsSync(kat)) continue;
    for (const f of readdirSync(kat)) {
      if (!/\.(ts|tsx|mjs)$/.test(f)) continue;
      pliki.push({ rel: `${k}/${f}`, tresc: readFileSync(join(kat, f), 'utf8') });
    }
  }
  const moduly = readdirSync(join(root, 'lib'))
    .filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.selftest.ts'))
    .map((f) => f.replace(/\.tsx?$/, ''));

  const bezKonsumenta: string[] = [];
  for (const m of moduly) {
    const igla = new RegExp(`from\\s+['"][^'"]*\\b${m}['"]|require\\(['"][^'"]*\\b${m}['"]\\)|import\\(['"][^'"]*\\b${m}['"]\\)`);
    const importerzy = pliki
      .filter((p) => p.rel !== `lib/${m}.ts` && p.rel !== `lib/${m}.tsx` && p.rel !== `lib/${m}.selftest.ts`)
      .filter((p) => igla.test(p.tresc))
      .map((p) => p.rel);
    if (importerzy.length === 0) bezKonsumenta.push(`lib/${m}.ts`);
  }

  check(`⭐⛔ (L1-D7) modułów w \`lib/\` bez ani jednego konsumenta: ${bezKonsumenta.length} — ma być 0`,
    bezKonsumenta.length === 0,
    bezKonsumenta.length === 0
      ? ''
      : `BEZ KONSUMENTA (podepnij albo skasuj razem z selftestem): ${bezKonsumenta.join(' | ')}`);

  // ⭐ Strażnik strażnika — bez tego „zero" mogłoby znaczyć „detektor nie widzi".
  const iglaAtrapy = /from\s+['"][^'"]*\batrapaL1['"]/;
  check('⭐ (L1-D7) (strażnik strażnika) detektor importu ZNAJDUJE import, gdy ten istnieje…',
    iglaAtrapy.test("import { x } from '../lib/atrapaL1';"),
    'wzorzec importu nie łapie nawet jawnego importu — „zero" byłoby wtedy bez treści');
  check('⭐ (L1-D7) (strażnik strażnika) …i MILCZY, gdy importu nie ma',
    !iglaAtrapy.test("const atrapaL1 = 1;"),
    'wzorzec importu łapie samą nazwę bez importu');

  // ⛔ USUNIĘTE MODUŁY NAPRAWDĘ ZNIKNĘŁY — razem z selftestami.
  for (const nazwa of ['arbiterGlosu', 'sladZachowania']) {
    check(`⭐ (L1-D7) \`lib/${nazwa}.ts\` i jego selftest NIE ISTNIEJĄ`,
      !existsSync(join(root, 'lib', `${nazwa}.ts`)) && !existsSync(join(root, 'lib', `${nazwa}.selftest.ts`)),
      `plik wrócił — strażnik pilnujący nieistniejącego modułu to kolejny martwy kod`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// G7. ⭐ BATERIA MUTACYJNA — pięć mutacji, każda zapala, każda cofnięta
// ═══════════════════════════════════════════════════════════════════
console.log('\nG7. ⭐ BATERIA MUTACYJNA');

type Wynik = { label: string; ok: boolean; detal: string };

/**
 * Bateria puszczana raz na PRAWDZIWYCH zasadach i raz na każdej mutacji.
 * ⛔ Punkt wpięcia (`ZasadyNagrody`, `ZasadyObciazenia`) NIE JEST podawany przez
 * ekran — pilnuje tego asercja z G6 — więc mutacja nie ma drogi do zawodnika.
 */
function bateria(zasady: ZasadyNagrody, obc: ZasadyObciazenia): Wynik[] {
  const w: Wynik[] = [];
  const push = (label: string, ok: boolean, detal: string) => w.push({ label, ok, detal });

  // 1. przerwa nie zmienia dorobku (⭐ dowód zakazu serii)
  const rozklady = rozkladyDajaTenSamWynikZ(zasady);
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
    sesje: zrodlo(jednostkiZSesji(sesje(20, 'wytrzymalosc'))),
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

  // ── ⭐ PLAN-D-L1 — TRZY POZYCJE O OKNIE ────────────────────────────
  // 7. (D3/D4) okno naprawdę OBCINA: połowa pracy starsza niż tydzień odpada
  const polowa = policzObciazenieWOknie(WEJSCIE_POLOWA_STARSZA, { dzis: DZIS_L1, oknoDni: OKNO_OBCIAZENIA_DNI }, obc);
  push('okno 7 dni oddaje POŁOWĘ, gdy połowa pracy jest starsza niż tydzień',
    polowa.rodzaj === 'policzone' && polowa.punkty === PUNKTY_POLOWY,
    `dostałem ${polowa.rodzaj === 'policzone' ? polowa.punkty : polowa.rodzaj}, spodziewam się ${PUNKTY_POLOWY}`);

  // 8. (D8) jednostka BEZ DATY nie wchodzi do okna i jest nazwana
  const bezDaty = policzObciazenieWOknie(WEJSCIE_BEZ_DATY, { dzis: DZIS_L1, oknoDni: OKNO_OBCIAZENIA_DNI }, obc);
  push('jednostka bez daty NIE wchodzi do okna i trafia do `pozaPomiarem`',
    bezDaty.rodzaj === 'brak_pracy_w_oknie' && bezDaty.pozaPomiarem.length === 2,
    `rodzaj=${bezDaty.rodzaj} · pozaPomiarem=${bezDaty.rodzaj === 'nie_policzone' ? '—' : bezDaty.pozaPomiarem.length}`);

  // 9. (D6) pustka w oknie ma WŁASNY stan, nie stan awarii
  const pustka = policzObciazenieWOknie(WEJSCIE_TYLKO_STARE, { dzis: DZIS_L1, oknoDni: OKNO_OBCIAZENIA_DNI }, obc);
  push('brak pracy w oknie → `brak_pracy_w_oknie`, a nie `nie_policzone`',
    pustka.rodzaj === 'brak_pracy_w_oknie', `dostałem ${pustka.rodzaj}`);

  return w;
}

/** Wariant `rozkladyDajaTenSamWynik` przyjmujący też `ZasadyNagrody`. */
function rozkladyDajaTenSamWynikZ(zasady: ZasadyNagrody): { ok: boolean; detal: string } {
  const bazowa = '2026-01-01';
  const zbuduj = (dni: readonly number[]) => policzNagrode(we({
    sesje: zrodlo(jednostkiZSesji(dni.slice(0, 6).map((d, i) => ({
      idWydarzenia: 1000 + i, dzien: przesun(bazowa, d), segment: 'wytrzymalosc', maWpisWDzienniku: i % 2 === 0,
    })))),
    dziennik: zrodlo(jednostkiZDziennika(dni.slice(6, 12).map((d, i) => ({
      id: 2000 + i, entry_type: 'morning', created_at: `${przesun(bazowa, d)}T07:00:00Z`, payload: { sleep_hours: 7 },
    }))).concat(jednostkiZDziennika(dni.slice(12, 16).map((d, i) => ({
      id: 3000 + i, entry_type: 'post_training', created_at: `${przesun(bazowa, d)}T19:00:00Z`, payload: { rpe: 6 },
    }))))),
    mecze: zrodlo(jednostkiZMeczow(dni.slice(16, 18).map((d, i) => ({
      id: 4000 + i, created_at: `${przesun(bazowa, d)}T20:00:00Z`,
    })))),
    odpowiedziKontrolne: zrodlo(jednostkiZOdpowiedziKontrolnych(dni.slice(18, 20).map((d, i) => ({
      id: `c${i}`, answered_at: `${przesun(bazowa, d)}T18:00:00Z`, segment: 'wytrzymalosc',
    })))),
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
  const prawdziwe = bateria(ZASADY_NAGRODY_PRAWDZIWE, ZASADY_OBCIAZENIA_PRAWDZIWE);
  const zieloneNaPrawdziwych = prawdziwe.filter((x) => !x.ok);
  check(`⭐ na PRAWDZIWYCH zasadach bateria jest zielona (${prawdziwe.length} asercji)`,
    zieloneNaPrawdziwych.length === 0,
    zieloneNaPrawdziwych.map((x) => `${x.label}: ${x.detal}`).join(' | '));

  const mutacje: { nazwa: string; zasady: ZasadyNagrody; obc: ZasadyObciazenia }[] = [
    {
      nazwa: 'M1 · nieodczytane źródło liczone jak puste',
      zasady: { ...ZASADY_NAGRODY_PRAWDZIWE, brakWolnoUznacZaZero: true },
      obc: ZASADY_OBCIAZENIA_PRAWDZIWE,
    },
    {
      nazwa: 'M2 · odznaka bez pokrycia w pracy',
      zasady: { ...ZASADY_NAGRODY_PRAWDZIWE, progWolnoDacBezPracy: true },
      obc: ZASADY_OBCIAZENIA_PRAWDZIWE,
    },
    {
      nazwa: 'M3 · duplikaty liczone wielokrotnie',
      zasady: { ...ZASADY_NAGRODY_PRAWDZIWE, odsiewajDuplikaty: false },
      obc: ZASADY_OBCIAZENIA_PRAWDZIWE,
    },
    {
      nazwa: 'M4 · niepełny zbiór celów liczony jak pełny',
      zasady: { ...ZASADY_NAGRODY_PRAWDZIWE, niepelneCeleLiczaSieJakPelne: true },
      obc: ZASADY_OBCIAZENIA_PRAWDZIWE,
    },
    {
      nazwa: 'M5 · ⭐ (L1) OKNO PRZESTAJE OBOWIĄZYWAĆ — obciążenie liczy całą historię',
      zasady: ZASADY_NAGRODY_PRAWDZIWE,
      obc: { ...ZASADY_OBCIAZENIA_PRAWDZIWE, oknoObowiazuje: false },
    },
    {
      nazwa: 'M6 · ⭐ (L1) jednostka BEZ DATY wpada do okna — data zgadnięta po cichu',
      zasady: ZASADY_NAGRODY_PRAWDZIWE,
      obc: { ...ZASADY_OBCIAZENIA_PRAWDZIWE, bezDatyWchodziDoOkna: true },
    },
    {
      nazwa: 'M7 · ⭐ (L1) pustka w oknie zlewa się z nieudanym odczytem',
      zasady: ZASADY_NAGRODY_PRAWDZIWE,
      obc: { ...ZASADY_OBCIAZENIA_PRAWDZIWE, pustkaZlewaSieZAwaria: true },
    },
  ];

  let wszystkieZapalily = true;
  for (const m of mutacje) {
    const wynik = bateria(m.zasady, m.obc);
    const fail = wynik.filter((x) => !x.ok);
    if (fail.length === 0) wszystkieZapalily = false;
    console.log(`\n${m.nazwa}   →   ${fail.length} / ${wynik.length} FAIL`);
    for (const f of fail) console.log(`      ↳ ${f.label}: ${f.detal.slice(0, 190)}`);
  }
  console.log('');
  check(`⭐ KAŻDA z ${mutacje.length} mutacji zapala co najmniej jedną asercję`,
    wszystkieZapalily, 'któraś mutacja przeszła niezauważona');

  // Cofnięcie każdej mutacji: bateria znów zielona.
  const poCofnieciu = bateria(ZASADY_NAGRODY_PRAWDZIWE, ZASADY_OBCIAZENIA_PRAWDZIWE).filter((x) => !x.ok);
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
