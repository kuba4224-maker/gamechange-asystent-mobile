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

import type { ZwrotObszarow } from './zwrotObszaru';
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
  WAGA_ZOBOWIAZANIA,
  wagaSesji,
  wagaMeczu,
  PROG_DLUGOSCI_SESJI_MIN,
  MECZ_BEZ_MINUT_NA_BOISKU,
  punktyRozwojuNaEkranie,
  JEDNOSTKA_ODNIESIENIA_ROZWOJU,
  MAKS_PUNKTOW_ZA_MECZ,
  ZASADY_NAGRODY_PRAWDZIWE,
  type JednostkaPracy,
  type NagrodaZaPrace,
  type OdznakaId,
  type WejscieNagrody,
  type WejscieZrodla,
  type WierszSesji,
  type ZasadyNagrody,
} from './nagrodaZaPrace';
// ⭐ PLAN-D-D1 18.08.2026 — IMPORT Z `./obciazenieOstatnichDni` ZDJĘTY.
// ⛔ NIC NIE ZNIKŁO PO CICHU (B3). Wszystkie asercje o oknie obciążenia
// (grupy L1-D3, L1-D4, L1-D5, L1-D6, L1-D8 i trzy mutacje M5–M7) przeniosły
// się DO WŁASNEGO STRAŻNIKA `lib/obciazenie.selftest.ts`, mocniejsze o to,
// czego tu nigdy nie było: dowód, że obciążenie NIE ZALEŻY OD TRAFNOŚCI.
// Powód przeprowadzki: od pasa D1 okno sumuje `minuty × ciężkość ⁄ przelicznik`
// i nie przyjmuje już `WejscieNagrody` — więc te asercje nie miały tu czego
// mierzyć. ⭐ Ten plik pilnuje od dziś WYŁĄCZNIE dorobku, i to jest cała
// zmiana: `lib/nagrodaZaPrace.ts` nie zna okna ani obciążenia (L1-D2).
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
/**
 * ⭐ PLAN-D-S1 18.08.2026 — GDZIE STOI DZIŚ DOROBEK.
 *
 * Do 18.08.2026 karta „TWÓJ DOROBEK" stała na ekranie „Dziś" i wszystkie
 * asercje renderu czytały `app/(tabs)/dzis.tsx`. Decyzja D4/O92 uśmierciła
 * słowo „punktów pracy", a pas A1 zdjął kartę z „Dziś" (nota A1 §3, wiersz 8:
 * „karta mówiła `punktów pracy` — słowo uśmiercone decyzją D4/O92 → Profil
 * jako ROZWÓJ, brzmienie do PRZEPISANIA, nie do przeniesienia").
 * Pas A3 postawił ją na ekranie „Profil": liczba w panelu dwóch miar
 * (`app/(tabs)/ja.tsx`), odznaki i progi w arkuszu
 * (`components/ArkuszeProfilu.tsx`), arytmetyka i brzmienia w `lib/ekranProfilu.ts`.
 *
 * ⛔ PRZECELOWANIE, NIE OSŁABIENIE: każda z sześciu asercji niżej pyta
 * o tę samą rzecz, co dotąd — liczba narysowana, odznaki z uzasadnieniem,
 * następny próg wyrażony PRACĄ, „nie udało się policzyć" osobnym zdaniem,
 * to, czego nie umiemy policzyć, wypisane z powodem — tylko w miejscu,
 * w którym te rzeczy dziś stoją.
 */
const PLIK_PROFIL_EKRAN = 'app/(tabs)/ja.tsx';
const PLIK_PROFIL_ARKUSZ = 'components/ArkuszeProfilu.tsx';
const PLIK_PROFIL_LIB = 'lib/ekranProfilu.ts';
const profilEkran = bezKomentarzy(readFileSync(join(root, PLIK_PROFIL_EKRAN), 'utf8'));
const profilArkusz = bezKomentarzy(readFileSync(join(root, PLIK_PROFIL_ARKUSZ), 'utf8'));
const profilLib = bezKomentarzy(readFileSync(join(root, PLIK_PROFIL_LIB), 'utf8'));
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

/**
 * ⭐ PLAN-D-W1 — N TRENINGÓW KLUBOWYCH (waga 3, dowód zewnętrzny).
 * ⛔ Progi punktowe buduje się TYM, a nie wpisami Dziennika: od 17.08.2026
 * wpis Dziennika waży zero i nie da się nim przekroczyć żadnego progu (O100).
 */
function treningiKlubowe(ile: number, segment: string | null = null, od = '2026-01-01'): WierszSesji[] {
  const out: WierszSesji[] = [];
  for (let i = 0; i < ile; i++) {
    out.push({
      idWydarzenia: 5000 + i, dzien: przesun(od, i), segment, maWpisWDzienniku: false,
      eventType: 'club_training', source: 'coach', maSesjeTrenera: false,
      minutyZmierzone: null, minutyZPlanu: null,
    });
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
// ═══════════════════════════════════════════════════════════════════
// ⛔ BRAMKA KOMPLETNOŚCI MODUŁU — SPŁATA DŁUGU ZGŁOSZONEGO PRZY PASIE O1
// ═══════════════════════════════════════════════════════════════════
//
// ⛔ POWÓD JEST ZMIERZONY, NIE TEORETYCZNY. Puszczony na STARYM kodzie
// (kontrola historyczna, O70) ten strażnik wywalał się na `TypeError:
// punktyRozwojuNaEkranie is not a function` — i cały plik oddawał
// „czerwony BEZ NAZW". Czerwień bez nazwy nie mówi, CO się zepsuło,
// więc kontrola historyczna traciła całą wartość.
//
// Od teraz brak eksportu jest ASERCJĄ Z NAZWĄ, a reszta pliku liczy dalej.
const KOMPLET_REGUL: readonly (readonly [string, boolean])[] = [
  ['wagaSesji', typeof wagaSesji === 'function'],
  ['wagaMeczu', typeof wagaMeczu === 'function'],
  ['punktyRozwojuNaEkranie', typeof punktyRozwojuNaEkranie === 'function'],
  ['JEDNOSTKA_ODNIESIENIA_ROZWOJU', typeof JEDNOSTKA_ODNIESIENIA_ROZWOJU === 'number'],
  ['WAGA_ZOBOWIAZANIA', typeof WAGA_ZOBOWIAZANIA === 'number'],
  ['PROG_DLUGOSCI_SESJI_MIN', typeof PROG_DLUGOSCI_SESJI_MIN === 'number'],
];
check('⛔ (W4) moduł nagrody eksportuje KOMPLET reguł rozwoju — bez tego reszta strażnika nie ma czego pilnować',
  KOMPLET_REGUL.every(([, jest]) => jest),
  `brakuje: ${KOMPLET_REGUL.filter(([, jest]) => !jest).map(([n]) => n).join(', ')}`);

/** Bezpieczna konwencja wyświetlania — na starym kodzie oddaje `NaN`, nie wywala pliku. */
const naEkranie = (x: number): number =>
  (typeof punktyRozwojuNaEkranie === 'function' ? punktyRozwojuNaEkranie(x) : Number.NaN);

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

  // ═══ ⛔ F2 18.08.2026 — SŁOWO, KTÓRE WRÓCIŁO BOKIEM ═══════════════
  // ZMIERZONE: cztery progi miały w NAZWIE „punktów pracy" i stały tak na
  // ekranie 2, pod nagłówkiem „Rozwój" — czyli słowo uśmiercone decyzją
  // D4/O92 wróciło DO ZAWODNIKA, mimo że licznik obok mówił „rozwój".
  // ⛔ Poprzedni strażnik pilnował `NAZWA_MIARY` w PODPISIE, a nie w TYTULE.
  // ⭐ Ta asercja pyta o KAŻDE pole progu, które trafia na ekran.
  // ⛔⛔ KLASA ZNAKÓW JEST POLSKA I TO NIE JEST OZDOBA: `\w` w JavaScripcie to
  // [A-Za-z0-9_], więc NIE ŁAPIE „punktÓW". Pierwsza wersja tej asercji świeciła
  // na zielono i nie pilnowała NICZEGO — dokładnie ta choroba, którą pas F2 opisał
  // przy trzech innych strażnikach tego samego dnia.
  // ⚠️ RDZEŃ TO `jednost`, NIE `jednostk` — polski dopełniacz mnogi brzmi
  // „jednostEK", więc wzorzec na `jednostk` przepuszczał go bez słowa.
  // Złapane własną mutacją, nie lekturą.
  check('⛔⭐ (F2) ŻADNE pole progu widoczne dla zawodnika nie mówi „pracy" jako WALUTY — waluta nazywa się ROZWÓJ (D4/O92)',
    PROGI.every((p) => ![p.nazwa, p.zaJakaPrace]
      .some((t) => typeof t === 'string' && /(punkt|jednost)[a-ząćęłńóśźż]*\s+pracy/i.test(t))),
    JSON.stringify(PROGI.filter((p) => [p.nazwa, p.zaJakaPrace]
      .some((t) => typeof t === 'string' && /(punkt|jednost)[a-ząćęłńóśźż]*\s+pracy/i.test(t)))
      .map((p) => [p.id, p.nazwa, p.zaJakaPrace])));

  check('⛔ (F2) …a NAZWA progu w mierze `punkty` nazywa walutę wprost, żeby tytuł nie kłamał obok podpisu',
    PROGI.filter((p) => p.miara === 'punkty' && /\d/.test(p.nazwa))
      .every((p) => /punkt[a-ząćęłńóśźż]*\s+rozwoju/i.test(p.nazwa)),
    JSON.stringify(PROGI.filter((p) => p.miara === 'punkty' && /\d/.test(p.nazwa)).map((p) => p.nazwa)));

  check('⭐ każdy próg ma uzasadnienie wartości — liczba bez uzasadnienia wraca jako „tak było"',
    PROGI.every((p) => typeof p.uzasadnienieProgu === 'string' && p.uzasadnienieProgu.trim().length > 15),
    JSON.stringify(PROGI.map((p) => [p.id, p.uzasadnienieProgu?.length])));

  // ⭐ PLAN-D-W1 (O99 + O100). Stara asercja brzmiała „każda waga ≥ 1" i była
  // prawdziwa dopóty, dopóki wypełnienie ankiety uchodziło za pracę sportową.
  // ⛔ Decyzja Kuby 17.08.2026: nie uchodzi.
  check('⛔ (W1, O100) ANI JEDNA jednostka OPISOWA nie daje punktu — ankieta, formularz, odpowiedź kontrolna',
    WAGI_PRACY.wpis_dziennika === 0 && WAGI_PRACY.wpis_potreningowy === 0
    && WAGI_PRACY.odpowiedz_kontrolna === 0,
    JSON.stringify(WAGI_PRACY));

  check('⛔ (W1, O99) OPIS PRACY NIGDY NIE WAŻY WIĘCEJ NIŻ SAMA PRACA — zapadka na porównanie, nie na liczby',
    Math.max(WAGI_PRACY.wpis_dziennika, WAGI_PRACY.wpis_potreningowy, WAGI_PRACY.odpowiedz_kontrolna)
      < Math.min(WAGI_PRACY.sesja_z_dowodem, WAGI_PRACY.mecz),
    JSON.stringify(WAGI_PRACY));

  check('⛔ (W1) jednostki PRACY mają wagę awaryjną ≥ 1 — sesja, która się odbyła, nie waży zera',
    Number.isInteger(WAGI_PRACY.sesja_z_dowodem) && WAGI_PRACY.sesja_z_dowodem >= 1
    && Number.isInteger(WAGI_PRACY.mecz) && WAGI_PRACY.mecz >= 1,
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
  const male = policzNagrode(we({ sesje: zrodlo(jednostkiZSesji(treningiKlubowe(1))) }));
  const wieksze = policzNagrode(we({ sesje: zrodlo(jednostkiZSesji(treningiKlubowe(2))) }));
  check('⭐ dołożenie pracy PRZYBLIŻA następny próg, nigdy go nie oddala',
    male.rodzaj === 'policzona' && wieksze.rodzaj === 'policzona'
    && male.nastepnyProg !== null && wieksze.nastepnyProg !== null
    && wieksze.nastepnyProg.brakuje < male.nastepnyProg.brakuje,
    `1 trening → brakuje ${male.rodzaj === 'policzona' ? male.nastepnyProg?.brakuje : '?'}, `
    + `2 treningi → brakuje ${wieksze.rodzaj === 'policzona' ? wieksze.nastepnyProg?.brakuje : '?'}`);

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
      if (p.miara === 'odpowiedzi_kontrolne') {
        return policzNagrode(we({ dziennik: zrodlo(jednostkiZDziennika(wpisyZPomiarem(ile))) }));
      }
      // ⭐ PLAN-D-W1: skalę punktową buduje się TRENINGAMI KLUBOWYMI (waga 3),
      // bo wpis Dziennika waży od 17.08.2026 zero.
      const segment = p.miara === 'punkty_w_celu' ? 'wytrzymalosc' : null;
      const trzeba = Math.ceil(ile / WAGA_ZOBOWIAZANIA);
      return policzNagrode(we({ sesje: zrodlo(jednostkiZSesji(treningiKlubowe(trzeba, segment))) }));
    };
    const ponizej = p.prog - WAGA_ZOBOWIAZANIA;
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
  const samaObjetosc = policzNagrode(we({ sesje: zrodlo(jednostkiZSesji(treningiKlubowe(500))) }));
  check('⭐ 500 treningów bez segmentu NIE DAJE odznaki „praca nad swoim celem"',
    !ma(samaObjetosc, 'praca_w_celu'),
    'praca bez przypisania do celu policzyła się jako praca nad celem');
  check('500 treningów daje jednak WSZYSTKIE progi objętości — objętość nadal się liczy',
    PROGI.filter((p) => p.miara === 'punkty').every((p) => ma(samaObjetosc, p.id)),
    'objętość przestała cokolwiek dawać');

  // Pięć rzeczy domkniętych odpowiedzią wystarcza, mimo mniejszej objętości.
  // ⭐ PLAN-D-W1: odznaka „praca domknięta" USUNIĘTA (decyzja Kuby 1.3 A),
  // a wpis potreningowy waży zero. Oś jakości ZOSTAJE jako liczba i to jest
  // to, co ta asercja pilnuje: pięć domknięć jest widoczne, ale nie kupuje punktu.
  const malaAleDomknieta = policzNagrode(we({ dziennik: zrodlo(jednostkiZDziennika(wpisyZPomiarem(5))) }));
  check('⭐ (W1) pięć DOMKNIĘTYCH wpisów widać na osi jakości, ale ⛔ NIE dają ani jednego punktu',
    malaAleDomknieta.rodzaj === 'policzona' && malaAleDomknieta.odpowiedziKontrolne === 5
    && punkty(malaAleDomknieta) === 0,
    `punkty=${punkty(malaAleDomknieta)} jakość=${malaAleDomknieta.rodzaj === 'policzona' ? malaAleDomknieta.odpowiedziKontrolne : '?'}`);

  // Praca w SEGMENCIE, którego zawodnik nie nazwał celem, nie liczy się do celu.
  const obcySegment = policzNagrode(we({ sesje: zrodlo(jednostkiZSesji(treningiKlubowe(20, 'moc'))) }));
  check('⭐ praca w segmencie SPOZA celów nie liczy się do „pracy nad swoim celem"',
    !ma(obcySegment, 'praca_w_celu')
    && obcySegment.rodzaj === 'policzona' && obcySegment.punktyWCelu === 0,
    `punktyWCelu=${obcySegment.rodzaj === 'policzona' ? obcySegment.punktyWCelu : '?'}`);

  // …ale nadal liczy się do objętości. ⛔ Praca poza celem nie znika.
  check('⛔ praca w segmencie spoza celów NIE ZNIKA — liczy się do objętości',
    punkty(obcySegment) === 20 * WAGA_ZOBOWIAZANIA,
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
    sesje: zrodlo(jednostkiZSesji(treningiKlubowe(20, 'wytrzymalosc'))),
    segmentyCelow: { rodzaj: 'niepelne', powod: 'ekran pyta o cele z filtrem status=active' },
  }));
  check('⭐ niepełny zbiór celów → odznaka celu NIE POWSTAJE…',
    !ma(niepelneCele, 'praca_w_celu'), 'odznaka powstała z niepełnych danych');
  check('⭐ …i trafia do `nieumiemPoliczyc` Z POWODEM, zamiast zniknąć po cichu',
    niepelneCele.rodzaj === 'policzona'
    && niepelneCele.nieumiemPoliczyc.some((b) => b.id === 'praca_w_celu' && b.powod.includes('status=active')),
    JSON.stringify(niepelneCele.rodzaj === 'policzona' ? niepelneCele.nieumiemPoliczyc : []));
  check('⛔ niepełny zbiór celów NIE odbiera odznak objętości',
    ma(niepelneCele, 'dziesiec') && ma(niepelneCele, 'czterdziesci'),
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
  // ⭐ PRZECELOWANE 18.08.2026 (pas S1) — Z „DZIŚ" NA „PROFIL". Powód i cytat
  // decyzji stoją przy stałych `PLIK_PROFIL_*` na górze tego pliku.
  // ⛔ Ciało arkusza wycinamy, a nie czytamy całego pliku — inaczej asercje
  // przechodziłyby na komentarzach i na cudzych arkuszach (O71).
  const cialoOdznak = (() => {
    const od = profilArkusz.indexOf('function Odznaki(');
    if (od < 0) return null;
    const koniec = profilArkusz.indexOf('\nfunction ', od + 10);
    return koniec < 0 ? profilArkusz.slice(od) : profilArkusz.slice(od, koniec);
  })();
  const cialoPanelu = (() => {
    const od = profilEkran.indexOf('styles.panelMiar');
    if (od < 0) return null;
    const koniec = profilEkran.indexOf('styles.pracaDodatkowa', od);
    return koniec < 0 ? null : profilEkran.slice(od, koniec);
  })();

  check('⭐ (0) da się wskazać MIEJSCE, w którym dorobek jest dziś rysowany',
    cialoOdznak !== null && cialoPanelu !== null,
    `panel dwóch miar w ${PLIK_PROFIL_EKRAN}: ${cialoPanelu === null ? 'NIE ZNAJDUJĘ' : 'jest'} · `
    + `arkusz „Odznaki i progi" w ${PLIK_PROFIL_ARKUSZ}: ${cialoOdznak === null ? 'NIE ZNAJDUJĘ' : 'jest'} `
    + '— dopóki tego nie ma, sześć asercji niżej czyta pustkę i nie znaczy nic');

  check('⭐ (1) łączna praca jest narysowana',
    cialoPanelu !== null && /<Text style=\{styles\.miaraLiczba\}>/.test(cialoPanelu)
    && /rozwoj\.punkty/.test(cialoPanelu) && /NAZWA_ROZWOJU/.test(cialoPanelu),
    'brak liczby łącznej pracy — miara ROZWÓJ nie wchodzi do żadnego `<Text>`');

  check('⭐ (2) odznaki są narysowane RAZEM ZE ZDANIEM „za jaką pracę"',
    cialoOdznak !== null && /\.odznaki\.map\(/.test(cialoOdznak) && /zaJakaPrace/.test(cialoOdznak),
    'odznaki bez uzasadnienia to naklejki (M4)');

  check('⭐ (3) następny próg jest narysowany',
    cialoOdznak !== null && /nastepnyProg/.test(cialoOdznak) && /Brakuje Ci /.test(cialoOdznak),
    'brak następnego progu');

  check('⭐ (4) „nie udało się policzyć" ma WŁASNĄ stałą, inną niż „jeszcze nic"',
    cialoPanelu !== null && /ROZWOJ_NIE_POLICZONE\(/.test(cialoPanelu)
    && /ROZWOJ_JESZCZE_NIC/.test(cialoPanelu)
    && cialoOdznak !== null && /nie_policzona/.test(cialoOdznak)
    && /ROZWOJ_NIE_POLICZONE\s*=/.test(profilLib) && /ROZWOJ_JESZCZE_NIC\s*=/.test(profilLib),
    'awaria odczytu i zero pracy rysują się tym samym zdaniem (R5)');

  // ⛔ PRÓG WYRAŻONY PRACĄ, NIGDY CZASEM. To jest sedno tej asercji, więc
  // sprawdzamy je DWUSTRONNIE: miara pracy musi paść, a słowa o dniach
  // i tygodniach nie mają prawa.
  check('⭐ następny próg wyrażony jest w PRACY — bierze braki z `nastepnyProg` i nazwę miary',
    cialoOdznak !== null && /nastepnyProg/.test(cialoOdznak) && /NAZWA_MIARY\[/.test(cialoOdznak)
    && !/\bdni\b|\btygod|\bcodzienn|z\s+rzędu/i.test(cialoOdznak),
    'próg wyrażony inaczej niż pracą — albo zniknęła nazwa miary, albo weszło zdanie o czasie');

  check('⭐ R5 — to, czego ekran nie umie policzyć, jest wypisane z powodem',
    cialoOdznak !== null && /nieumiemPoliczyc\.map\(/.test(cialoOdznak)
    && /Nie umiem tego policzyć/.test(cialoOdznak),
    'odznaka nie do policzenia znika po cichu');

  const cialoRenderu = `${cialoOdznak ?? ''}\n${cialoPanelu ?? ''}`;

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
// ⭐ PLAN-D-W1: fixtury L1 przepisane z wpisów Dziennika na TRENINGI KLUBOWE.
// ⛔ Powód nie jest kosmetyczny: od 17.08.2026 wpis Dziennika waży ZERO (O100),
// więc na wpisach nie da się już pokazać różnicy między oknem a dorobkiem —
// obie liczby byłyby zerami i asercja świeciłaby na zielono, nic nie mierząc.
const WEJSCIE_POLOWA_STARSZA: WejscieNagrody = we({
  sesje: zrodlo(jednostkiZSesji([
    ...treningiKlubowe(4, null, '2026-08-11'),
    ...treningiKlubowe(4, null, '2026-06-01').map((w, i) => ({ ...w, idWydarzenia: 6100 + i })),
  ])),
});
const PUNKTY_POLOWY = 4 * WAGA_ZOBOWIAZANIA;
const PUNKTY_CALOSCI = 8 * WAGA_ZOBOWIAZANIA;

/** Dwie jednostki, których nie da się umieścić w czasie — źródło nie ma daty. */
const WEJSCIE_BEZ_DATY: WejscieNagrody = we({
  sesje: zrodlo(jednostkiZSesji([
    { idWydarzenia: 9300, dzien: 'nie-jest-data', segment: null, maWpisWDzienniku: false,
      eventType: 'club_training', source: 'coach' },
    { idWydarzenia: 9301, dzien: 'tez-nie-data', segment: null, maWpisWDzienniku: false,
      eventType: 'club_training', source: 'coach' },
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

  // ⭐ PLAN-D-D1 18.08.2026 — DRUGA POŁOWA TEJ PARY MIESZKA TERAZ
  // W `lib/obciazenie.selftest.ts` (grupa D1-C). Brzmi tam tak samo: ta sama
  // praca skupiona w jednym dniu i rozrzucona po roku daje przez OKNO liczby
  // RÓŻNE — bez tego zdania asercja wyżej mogłaby być zielona dlatego, że okno
  // w ogóle nie działa. ⛔ Nie została skasowana, tylko przeniesiona razem
  // z modułem, którego dotyczy.
}

console.log('\nL1-D3…D6/D8. ⭐ PRZENIESIONE DO `lib/obciazenie.selftest.ts` (pas D1, 18.08.2026)');
{
  // ⛔ NIC NIE ZNIKŁO PO CICHU (B3). Cztery grupy asercji o oknie obciążenia
  // stały tutaj do 18.08 i od 18.08 stoją w strażniku własnego modułu:
  //   (L1-D3/D4) okno obcina · obie długości okna stoją w jednym miejscu
  //   (L1-D5)    moduł obciążenia mówi ILE, nigdy CZY
  //   (L1-D6)    trzy wartości i trzy różne kształty wyniku
  //   (L1-D8)    sesja bez daty nie jest zerem i nie jest „dzisiaj"
  // Powód: od pasa D1 okno sumuje `minuty × ciężkość ⁄ przelicznik` i NIE
  // PRZYJMUJE JUŻ `WejscieNagrody`, więc te asercje nie miały tu czego mierzyć.
  // ⭐ Tutaj zostaje TYLKO to, co jest o dorobku — i to jest cała treść L1-D2.
  check('⭐ (L1-D3) DOROBEK przy wejściu „połowa pracy starsza niż tydzień" oddaje CAŁOŚĆ',
    punkty(policzNagrode(WEJSCIE_POLOWA_STARSZA)) === PUNKTY_CALOSCI,
    `dorobek=${punkty(policzNagrode(WEJSCIE_POLOWA_STARSZA))}, spodziewam się ${PUNKTY_CALOSCI}`);
  check('⭐⛔ (L1-D8) …a brak daty NIE ODBIERA wykonanej pracy w dorobku',
    punkty(policzNagrode(WEJSCIE_BEZ_DATY)) === 2 * WAGA_ZOBOWIAZANIA,
    `dorobek=${punkty(policzNagrode(WEJSCIE_BEZ_DATY))}`);
  check('⭐ (L1-D3) `policzObciazenieWOknie` NIE MA drugiej kopii w pliku dorobku',
    !/export function policzObciazenieWOknie\(/.test(lib)
    && existsSync(join(root, 'lib/obciazenie.selftest.ts')),
    'obie liczby wyszły z jednego pliku — czyli przełącznik trybu istnieje '
    + 'albo strażnik przeniesionych asercji nie istnieje');
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
function bateria(zasady: ZasadyNagrody): Wynik[] {
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
  // ⭐ PLAN-D-W1: duplikat liczony na TRENINGACH KLUBOWYCH, nie na wpisach.
  // ⛔ Na wpisach (waga 0) ta asercja porównywałaby zero z zerem i przepuściłaby
  // każdą mutację odsiewu duplikatów.
  const raz = jednostkiZSesji(treningiKlubowe(5));
  const dwa = policzNagrode(we({ sesje: zrodlo([...raz, ...raz]) }), zasady);
  push('ten sam wiersz liczy się raz', punkty(dwa) === 5 * WAGA_ZOBOWIAZANIA, `punkty=${punkty(dwa)}`);

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

  // ⭐ PLAN-D-D1 18.08.2026 — TRZY POZYCJE O OKNIE (M5–M7) PRZENIESIONE
  // DO `lib/obciazenie.selftest.ts`, razem z modułem, którego dotyczyły.
  // ⛔ Nie zostały skasowane: bateria tamtego strażnika ma ICH SIEDEM, w tym
  // MUTACJĘ OBOWIĄZKOWĄ „obciążenie zaczyna zależeć od trafności".

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
  const prawdziwe = bateria(ZASADY_NAGRODY_PRAWDZIWE);
  const zieloneNaPrawdziwych = prawdziwe.filter((x) => !x.ok);
  check(`⭐ na PRAWDZIWYCH zasadach bateria jest zielona (${prawdziwe.length} asercji)`,
    zieloneNaPrawdziwych.length === 0,
    zieloneNaPrawdziwych.map((x) => `${x.label}: ${x.detal}`).join(' | '));

  // ⭐ PLAN-D-D1 18.08.2026 — MUTACJE M5–M7 (okno obciążenia) PRZENIESIONE
  // do `lib/obciazenie.selftest.ts`. ⛔ Żadna nie została skasowana.
  const mutacje: { nazwa: string; zasady: ZasadyNagrody }[] = [
    {
      nazwa: 'M1 · nieodczytane źródło liczone jak puste',
      zasady: { ...ZASADY_NAGRODY_PRAWDZIWE, brakWolnoUznacZaZero: true },
    },
    {
      nazwa: 'M2 · odznaka bez pokrycia w pracy',
      zasady: { ...ZASADY_NAGRODY_PRAWDZIWE, progWolnoDacBezPracy: true },
    },
    {
      nazwa: 'M3 · duplikaty liczone wielokrotnie',
      zasady: { ...ZASADY_NAGRODY_PRAWDZIWE, odsiewajDuplikaty: false },
    },
    {
      nazwa: 'M4 · niepełny zbiór celów liczony jak pełny',
      zasady: { ...ZASADY_NAGRODY_PRAWDZIWE, niepelneCeleLiczaSieJakPelne: true },
    },
  ];

  let wszystkieZapalily = true;
  for (const m of mutacje) {
    const wynik = bateria(m.zasady);
    const fail = wynik.filter((x) => !x.ok);
    if (fail.length === 0) wszystkieZapalily = false;
    console.log(`\n${m.nazwa}   →   ${fail.length} / ${wynik.length} FAIL`);
    for (const f of fail) console.log(`      ↳ ${f.label}: ${f.detal.slice(0, 190)}`);
  }
  console.log('');
  check(`⭐ KAŻDA z ${mutacje.length} mutacji zapala co najmniej jedną asercję`,
    wszystkieZapalily, 'któraś mutacja przeszła niezauważona');

  // Cofnięcie każdej mutacji: bateria znów zielona.
  const poCofnieciu = bateria(ZASADY_NAGRODY_PRAWDZIWE).filter((x) => !x.ok);
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


// ═══════════════════════════════════════════════════════════════════
// W1. ⭐ O100 — PUNKT JEST ZA PRACĘ, KTÓRA MA DOWÓD (17.08.2026)
// ═══════════════════════════════════════════════════════════════════
console.log('\nW1. ⭐ PUNKT ZA PRACĘ, KTÓRA MA DOWÓD');
{
  const wlasny = (min: number | null, plan: number | null = null) => wagaSesji({
    eventType: 'own_training', source: 'player', maSesjeTrenera: false,
    minutyZmierzone: min, minutyZPlanu: plan,
  });
  const klubowy = (min: number | null = null, plan: number | null = null) => wagaSesji({
    eventType: 'club_training', source: 'coach', maSesjeTrenera: false,
    minutyZmierzone: min, minutyZPlanu: plan,
  });

  // ── ASERCJA GŁÓWNA: deklaracja nie jest pracą ──────────────────────
  const zadeklarowany90 = wlasny(null, 90);
  const zmierzony90 = wlasny(90);
  check('⭐⭐ (W1, O100) trening własny ZADEKLAROWANY na 90 minut i tylko odhaczony waży 1 — deklaracja NIE JEST pracą',
    zadeklarowany90.punkty === 1 && zadeklarowany90.pochodzenie === 'bez_dowodu',
    JSON.stringify(zadeklarowany90));
  check('⭐⭐ (W1, O100) …a TEN SAM trening z PODANYM czasem waży 2 — liczba jest tym, co odblokowuje punkt',
    zmierzony90.punkty === 2 && zmierzony90.pochodzenie === 'zmierzony',
    JSON.stringify(zmierzony90));
  check('⭐ (W1) różnica między nimi jest DODATNIA — inaczej wypełnianie formularza nic by nie dawało',
    zmierzony90.punkty > zadeklarowany90.punkty,
    `${zadeklarowany90.punkty} vs ${zmierzony90.punkty}`);

  // ── ASERCJA ODWROTNA: dowód zewnętrzny nie potrzebuje wpisu ────────
  check('⭐⭐ (W1, O100) trening KLUBOWY BEZ ŻADNEGO WPISU waży 3 — dowód jest zewnętrzny i brak wpisu go nie kasuje',
    klubowy().punkty === WAGA_ZOBOWIAZANIA && klubowy().pochodzenie === 'z_rodzaju',
    JSON.stringify(klubowy()));
  check('⛔ (W1) treningu klubowego NIE DA SIĘ obniżyć krótkim czasem — kara jest za BRAK DOWODU, nie za NISKĄ LICZBĘ',
    klubowy(15).punkty === WAGA_ZOBOWIAZANIA && klubowy(null, 20).punkty === WAGA_ZOBOWIAZANIA,
    `${klubowy(15).punkty} / ${klubowy(null, 20).punkty}`);

  // ── D6: pomiar może PODNIEŚĆ, nigdy obniżyć ───────────────────────
  check('⭐ (W1, D6) własna praca: plan 90 / pomiar 20 → 1 · plan 20 / pomiar 90 → 2',
    wlasny(20, 90).punkty === 1 && wlasny(90, 20).punkty === 2,
    `${wlasny(20, 90).punkty} / ${wlasny(90, 20).punkty}`);
  check('⛔ (W1) SAM PLAN nie podnosi wagi własnej pracy — plan jest deklaracją, nie pomiarem',
    wlasny(null, 120).punkty === 1 && wlasny(null, 120).pochodzenie === 'bez_dowodu',
    JSON.stringify(wlasny(null, 120)));

  // ── D4: próg 45 stoi w JEDNYM miejscu ─────────────────────────────
  check(`⭐ (W1, D4) próg ${PROG_DLUGOSCI_SESJI_MIN} minut jest granicą: ${PROG_DLUGOSCI_SESJI_MIN - 1} → 1, ${PROG_DLUGOSCI_SESJI_MIN} → 2`,
    wlasny(PROG_DLUGOSCI_SESJI_MIN - 1).punkty === 1 && wlasny(PROG_DLUGOSCI_SESJI_MIN).punkty === 2,
    `${wlasny(PROG_DLUGOSCI_SESJI_MIN - 1).punkty} / ${wlasny(PROG_DLUGOSCI_SESJI_MIN).punkty}`);
  {
    const lib = readFileSync(join(root, 'lib', 'nagrodaZaPrace.ts'), 'utf8');
    const kodBezKomentarzy = lib.split('\n')
      .filter((l) => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*') && !l.trimStart().startsWith('/*'))
      .join('\n');
    const wystapienia = (kodBezKomentarzy.match(/\b45\b/g) ?? []).length;
    check('⛔ (W1, D4) próg 45 pada w KODZIE modułu DOKŁADNIE RAZ — w definicji stałej. Zapadka na RÓWNOŚĆ, nie na „≥1"',
      wystapienia === 1, `wystąpień: ${wystapienia}`);
  }

  // ── D8: nieznany rodzaj to TRZECIA WARTOŚĆ ────────────────────────
  const nieznany = wagaSesji({
    eventType: 'cokolwiek_nowego', source: 'player', maSesjeTrenera: false,
    minutyZmierzone: null, minutyZPlanu: null,
  });
  const mikro = wagaSesji({
    eventType: 'micro_session', source: 'player', maSesjeTrenera: false,
    minutyZmierzone: null, minutyZPlanu: null,
  });
  check('⭐ (W1, D8, R5) nieznany `event_type` → waga 1 i pochodzenie `nieznany_rodzaj`, ⛔ JAWNIE różne od mikrosesji',
    nieznany.punkty === 1 && nieznany.pochodzenie === 'nieznany_rodzaj'
    && mikro.pochodzenie !== nieznany.pochodzenie,
    `${JSON.stringify(nieznany)} vs ${JSON.stringify(mikro)}`);

  // ── D5: pięć pochodzeń, nie trzy ──────────────────────────────────
  {
    const zebrane = new Set<string>([
      wlasny(90).pochodzenie,
      wlasny(null).pochodzenie,
      klubowy().pochodzenie,
      klubowy(null, 90).pochodzenie,
      nieznany.pochodzenie,
      wagaMeczu(45, 90).pochodzenie,
      wagaMeczu(null, 90).pochodzenie,
    ]);
    // ⭐ SZEŚĆ, nie pięć — i ta liczba jest wynikiem POMIARU, nie planu.
    // ⛔ Siódme pochodzenie (`zaplanowany`) zostało USUNIĘTE z typu w tym samym
    // pasie, bo okazało się nieosiągalne: waga z minut to najwyżej 2, a waga
    // zobowiązania to 3, więc plan nigdy nie mógłby jej podnieść.
    check('⭐ (W1, D5) zbiór oddawanych POCHODZEŃ wagi ma rozmiar 6 — zapadka na RÓWNOŚĆ, i każde jest OSIĄGALNE',
      zebrane.size === 6, `${zebrane.size}: ${[...zebrane].sort().join(' · ')}`);
  }

  // ── D2: mecz z minut na boisku ────────────────────────────────────
  {
    const tabela: readonly (readonly [number | null, number])[] = [
      [90, 4], [68, 3], [45, 2], [30, 1], [10, 1], [5, 1], [0, 0], [null, 1],
    ];
    // ⭐ PLAN-D-W4: waga jest SUROWA, więc porównujemy przez konwencję wyświetlania.
    const zle = tabela.filter(([min, ocz]) => naEkranie(wagaMeczu(min, 90).punkty) !== ocz);
    check('⭐⭐ (W1, D2) mecz 90-minutowy: 90→4 · 68→3 · 45→2 · 30→1 · 10→1 · 5→1 · 0→0 · nieznane→1',
      zle.length === 0,
      zle.map(([min, ocz]) => `${min}: jest ${naEkranie(wagaMeczu(min, 90).punkty)}, ma być ${ocz}`).join(' · '));

    check('⭐ (W1, D2) mecz KRÓTSZY: 60 minut z 60 → 4. Trzynastolatek nie jest karany za to, że jego mecz jest krótszy',
      naEkranie(wagaMeczu(60, 60).punkty) === 4
      && naEkranie(wagaMeczu(30, 60).punkty) === 2,
      `${wagaMeczu(60, 60).punkty} / ${wagaMeczu(30, 60).punkty}`);

    check('⛔ (W1, D2) waga meczu NIGDY nie przekracza 4, także przy dogrywce',
      wagaMeczu(120, 90).punkty === MAKS_PUNKTOW_ZA_MECZ
      && wagaMeczu(120, 90, 10).punkty === MAKS_PUNKTOW_ZA_MECZ,
      `${wagaMeczu(120, 90).punkty}`);

    check('⭐ (W1, D2) brak zaplanowanej długości → 90 minut, jako DECYZJA PRODUKTOWA, nie pomiar',
      wagaMeczu(45, null).punkty === wagaMeczu(45, 90).punkty,
      `${wagaMeczu(45, null).punkty} vs ${wagaMeczu(45, 90).punkty}`);
  }

  // ── D3: mecz na ławce nie znika ───────────────────────────────────
  check('⭐ (W1, D3) 0 minut na boisku → 0 punktów, ⛔ ale mecz MA ZDANIE i nie znika z historii',
    wagaMeczu(0, 90).punkty === 0
    && typeof MECZ_BEZ_MINUT_NA_BOISKU === 'string' && MECZ_BEZ_MINUT_NA_BOISKU.length > 30,
    MECZ_BEZ_MINUT_NA_BOISKU);
  check('⛔ (W1, D3) brzmienie meczu bez minut NIE OCENIA zawodnika i nie mówi o serii ani obecności',
    !/lenist|nie chc|słab|zmarnowa|passa|seri|z rzędu/i.test(MECZ_BEZ_MINUT_NA_BOISKU),
    MECZ_BEZ_MINUT_NA_BOISKU);
  {
    const naLawce = jednostkiZMeczow([{ id: 77, created_at: '2026-08-17T20:00:00Z', minutes_played: 0 }]);
    check('⭐ (W1, D3) mecz z 0 minut NADAL JEST JEDNOSTKĄ — zero punktów, ale nie zero wydarzeń',
      naLawce.length === 1 && naLawce[0].punkty === 0,
      JSON.stringify(naLawce));
  }

  // ── D1: rzetelność — 30 ankiet nie kupuje ani jednego punktu ──────
  {
    const samGrafoman = policzNagrode(we({
      dziennik: zrodlo(jednostkiZDziennika(wpisy(30))),
      odpowiedziKontrolne: zrodlo(jednostkiZOdpowiedziKontrolnych(
        Array.from({ length: 20 }, (_, i) => ({ id: `k${i}`, answered_at: '2026-08-10T10:00:00Z', segment: 'wytrzymalosc' })),
      )),
    }));
    check('⭐⭐⭐ (W1, O100) 30 ANKIET i 20 ODPOWIEDZI KONTROLNYCH, ZERO TRENINGÓW → ⛔ DOKŁADNIE 0 PUNKTÓW i ZERO odznak',
      punkty(samGrafoman) === 0
      && samGrafoman.rodzaj === 'policzona' && samGrafoman.odznaki.length === 0,
      opisNagrodyDoLogu(samGrafoman));

    const jedenTrening = policzNagrode(we({ sesje: zrodlo(jednostkiZSesji(treningiKlubowe(1))) }));
    check('⭐⭐ (W1, O100) …a JEDEN trening klubowy daje 3 punkty i pierwszą odznakę. To jest cała różnica.',
      punkty(jedenTrening) === WAGA_ZOBOWIAZANIA && ma(jedenTrening, 'pierwsza'),
      opisNagrodyDoLogu(jedenTrening));
  }

  // ── D9: progi i skasowana odznaka ─────────────────────────────────
  {
    const progiPunktowe = PROGI.filter((p) => p.miara === 'punkty').map((p) => p.prog);
    check('⭐ (W1, D9) progi punktowe to DOKŁADNIE [1, 10, 40, 150, 400]',
      JSON.stringify(progiPunktowe) === JSON.stringify([1, 10, 40, 150, 400]),
      JSON.stringify(progiPunktowe));
    const lib = readFileSync(join(root, 'lib', 'nagrodaZaPrace.ts'), 'utf8');
    const kod = lib.split('\n').filter((l) => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*')).join('\n');
    check('⛔ (W1, D9, O88) odznaki „praca domknięta" NIE MA W KODZIE — sprawdzone po TREŚCI, nie po nazwie stałej',
      !/Praca domknięta/.test(kod) && !PROGI.some((p) => p.miara === 'odpowiedzi_kontrolne'),
      'brzmienie albo próg odznaki jakości nadal stoi w module');
    check('⭐ (W1) …ale MIARA jakości nadal jest liczona i zwracana — odznaka i miara to dwie różne rzeczy',
      policzNagrode(we({ dziennik: zrodlo(jednostkiZDziennika(wpisyZPomiarem(5))) })).rodzaj === 'policzona',
      'oś jakości zniknęła razem z odznaką');
  }

  // ── D10: dorobek nadal bez okna ───────────────────────────────────
  {
    const rozklad = (przesuniecia: readonly number[]) => policzNagrode(we({
      sesje: zrodlo(jednostkiZSesji(przesuniecia.map((d, i) => ({
        idWydarzenia: 7700 + i, dzien: przesun('2026-08-17', -d), segment: null,
        maWpisWDzienniku: false, eventType: 'club_training', source: 'coach',
      })))),
    }));
    let rozne: string | null = null;
    const wzorzec = punkty(rozklad(Array.from({ length: 12 }, () => 0)));
    for (let k = 0; k < 50; k++) {
      const dni = Array.from({ length: 12 }, (_, i) => (i * (k + 1)) % 900);
      if (punkty(rozklad(dni)) !== wzorzec) { rozne = `k=${k}: ${punkty(rozklad(dni))} ≠ ${wzorzec}`; break; }
    }
    check('⭐ (W1, D10) 50 rozkładów tej samej pracy w czasie — DOROBEK identyczny co do znaku',
      rozne === null, rozne ?? `stale ${wzorzec}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// W4-W. ⭐ PODŁĄCZENIE — silnik zwrotu MA KONSUMENTA I NIM JEST EKRAN
// ═══════════════════════════════════════════════════════════════════
//
// ⛔ TA GRUPA ISTNIEJE, BO SAM MODUŁ MOŻE BYĆ IDEALNY I NIEUŻYWANY.
// Pas W3 skończył się dokładnie tak: silnik obciążenia napisany, poprawny
// i wyrzucony, bo nikt go nie wołał. Asercje niżej pilnują DROGI, a nie funkcji.
console.log('\nW4-W. ⭐ PODŁĄCZENIE ZWROTU DO EKRANU');
{
  const ekran = readFileSync(join(root, 'app', '(tabs)', 'dzis.tsx'), 'utf8');
  const silnik = readFileSync(join(root, 'lib', 'nagrodaZaPrace.ts'), 'utf8');

  check('⭐⭐ (W4-W) ekran „Dziś" WOŁA `policzZwrotObszarow` — bez tego cały moduł jest martwy',
    /policzZwrotObszarow\s*\(/.test(ekran),
    'ekran nie liczy zwrotu obszarów');

  check('⭐⭐ (W4-W) …i PRZEKAZUJE wynik do źródła sesji — sama wołanka nie wystarcza',
    /zrodloSesji\(\{[\s\S]{0,400}?\bzwrot\b/.test(ekran),
    'zwrot policzony i wyrzucony — dokładnie „dane znikające po cichu"');

  check('⛔ (W4-W) ekran CZYTA `scores` i `position` z diagnozy, a nie tylko liczy wiersze',
    /from\('diagnostics'\)\s*\.select\('[^']*scores[^']*position/.test(ekran),
    'zapytanie o diagnozę nadal pyta wyłącznie „czy jest"');

  check('⭐ (W4-W) `zrodloSesji` DOKŁADA trafność do każdej sesji, którą oddaje',
    /trafnosc:\s*trafnoscDla\(/.test(silnik),
    'trafność nie dociera z reguły do jednostki pracy');

  check('⭐ (W4-W) `wagaSesji` NAPRAWDĘ czyta trafność z faktów, a nie tylko ją przyjmuje',
    /const trafnosc\s*=[\s\S]{0,200}f\.trafnosc/.test(silnik) && /\*\s*trafnosc/.test(silnik),
    'trafność wchodzi do funkcji i nie wychodzi z liczby');

  check('⭐ (W4-W) pomiar `minuty × RPE` ma drogę do wagi — `rpeZmierzone` dociera z ekranu do reguły',
    /rpeZWpisow/.test(ekran) && /rpeZmierzone/.test(silnik) && /JEDNOSTKA_ODNIESIENIA_ROZWOJU/.test(silnik),
    'RPE zebrane i niepoliczone');

  // ⭐⭐ ASERCJA URUCHOMIENIOWA — DZIURA ZNALEZIONA WŁASNĄ MUTACJĄ.
  // ⛔ Wszystkie asercje wyżej czytają TEKST. Mutacja „trafność zaczyna dotyczyć
  // treningu klubowego" przechodziła przez nie WSZYSTKIE, bo tekst się nie zmieniał —
  // zmieniał się wynik. Ta asercja przepuszcza dane przez PRAWDZIWE `zrodloSesji`.
  {
    const zwrotTestowy: ZwrotObszarow = {
      rodzaj: 'jest',
      obszary: [{ obszar: 'moc', wynik: 30, tier: 'key', zwrot: 70, trafny: 'zwrot_i_podloga' }],
      trafne: new Set(['moc']),
    };
    const wydarzenie = (typ: string, source: string) => ({
      id: 4242, scheduled_date: '2026-08-17', status: 'completed',
      recurrence_rule: null, focus_block_id: 'blok-moc',
      event_type: typ, source, coach_session_id: null, planned_minutes: null,
    });
    const policz = (typ: string, source: string) => {
      const z = zrodloSesji({
        wydarzenia: [wydarzenie(typ, source)],
        werdykty: { rodzaj: 'jest', werdykty: [] },
        wpisyDziennika: new Set<number>(),
        segmentBloku: new Map([['blok-moc', 'moc']]),
        zwrot: zwrotTestowy,
      });
      return z.rodzaj === 'jest' ? (z.jednostki[0]?.punkty ?? -1) : -1;
    };

    check('⭐⭐ (W4-W) URUCHOMIENIOWO: trening KLUBOWY w obszarze trafnym waży DOKŁADNIE 3 — ⛔ premia go NIE dotyczy',
      policz('club_training', 'coach') === WAGA_ZOBOWIAZANIA,
      `klubowy w trafnym obszarze: ${policz('club_training', 'coach')}, ma być ${WAGA_ZOBOWIAZANIA}`);

    check('⭐⭐ (W4-W) URUCHOMIENIOWO: praca WŁASNA w tym samym obszarze dostaje premię — 1 × 1,5',
      Math.abs(policz('own_training', 'player') - 1.5) < 1e-9,
      `własna w trafnym obszarze: ${policz('own_training', 'player')}, ma być 1,5`);

    check('⛔ (W4-W) URUCHOMIENIOWO: różnica między nimi ISTNIEJE i ma właściwy znak',
      policz('club_training', 'coach') > policz('own_training', 'player'),
      'klubowy i własny zrównały się — premia wyciekła na pracę, na którą zawodnik nie ma wpływu');
  }

  // ⛔ ZAPADKA NA RÓWNOŚĆ — zaokrąglenie ma być DOKŁADNIE w jednym miejscu.
  const zaokraglenia = (silnik.match(/Math\.round\(/g) ?? []).length;
  check('⛔ (W4-W) `Math.round` pada w module DOKŁADNIE trzy razy: suma, suma w celu i konwencja wyświetlania',
    zaokraglenia === 3,
    `wystąpień: ${zaokraglenia} — każde dodatkowe zaokrąglenie zjada premię za trafność`);
}


// ═══════════════════════════════════════════════════════════════════
// W1-M. ⭐ BATERIA MUTACJI — OSIEM, Z ASERCJĄ ODWROTNĄ
// ═══════════════════════════════════════════════════════════════════
console.log('\nW1-M. ⭐ BATERIA MUTACJI');
{
  type Predykat = { nazwa: string; ok: () => boolean };
  const wlasny = (min: number | null, plan: number | null, wS: typeof wagaSesji) => wS({
    eventType: 'own_training', source: 'player', maSesjeTrenera: false,
    minutyZmierzone: min, minutyZPlanu: plan,
  });

  const bateria = (wS: typeof wagaSesji, wM: typeof wagaMeczu, wagi: Record<string, number>): Predykat[] => [
    { nazwa: 'ankieta nie daje punktu', ok: () => wagi.wpis_dziennika === 0 },
    { nazwa: 'wpis potreningowy nie daje punktu', ok: () => wagi.wpis_potreningowy === 0 },
    { nazwa: 'odpowiedź kontrolna nie daje punktu', ok: () => wagi.odpowiedz_kontrolna === 0 },
    { nazwa: 'sesja bez zmierzonego czasu waży 1, choćby zadeklarowano 120 min', ok: () => wlasny(null, 120, wS).punkty === 1 },
    { nazwa: 'sesja z czasem ≥ progu waży 2', ok: () => wlasny(90, null, wS).punkty === 2 },
    { nazwa: 'pomiar NIE obniża wagi treningu klubowego', ok: () => wS({ eventType: 'club_training', source: 'coach', maSesjeTrenera: false, minutyZmierzone: 10, minutyZPlanu: null }).punkty === 3 },
    { nazwa: 'mecz rozróżnia minuty: 90 ≠ 45 ≠ 10', ok: () => wM(90, 90).punkty !== wM(45, 90).punkty && wM(45, 90).punkty !== wM(10, 90).punkty },
    { nazwa: 'pochodzenie wagi jest zwracane', ok: () => typeof wlasny(90, null, wS).pochodzenie === 'string' && wlasny(90, null, wS).pochodzenie.length > 0 },
    { nazwa: 'nieznany rodzaj jest odróżnialny od mikrosesji', ok: () => wS({ eventType: 'xxx', source: 'player', maSesjeTrenera: false, minutyZmierzone: null, minutyZPlanu: null }).pochodzenie !== wS({ eventType: 'micro_session', source: 'player', maSesjeTrenera: false, minutyZmierzone: null, minutyZPlanu: null }).pochodzenie },
  ];

  const ileFail = (b: readonly Predykat[]): number => b.filter((p) => !p.ok()).length;

  // ⭐ ASERCJA ODWROTNA — bez niej „każda mutacja zapala" spełniłby strażnik zapalony zawsze.
  check('⭐⭐ (W1-M) ASERCJA ODWROTNA — na PRAWDZIWYCH regułach bateria ma ZERO FAIL-i',
    ileFail(bateria(wagaSesji, wagaMeczu, { ...WAGI_PRACY })) === 0,
    bateria(wagaSesji, wagaMeczu, { ...WAGI_PRACY }).filter((p) => !p.ok()).map((p) => p.nazwa).join(' · '));

  const mutacje: readonly (readonly [string, () => number])[] = [
    ['MW1 ⛔ ankieta wraca z wagą 1', () => ileFail(bateria(wagaSesji, wagaMeczu, { ...WAGI_PRACY, wpis_dziennika: 1 }))],
    ['MW2 ⛔ wpis potreningowy wraca z wagą 2', () => ileFail(bateria(wagaSesji, wagaMeczu, { ...WAGI_PRACY, wpis_potreningowy: 2 }))],
    ['MW3 ⛔ odpowiedź kontrolna wraca z wagą 2', () => ileFail(bateria(wagaSesji, wagaMeczu, { ...WAGI_PRACY, odpowiedz_kontrolna: 2 }))],
    ['MW4 ⛔ sesja bez dowodu dostaje wagę z DEKLARACJI', () => ileFail(bateria(
      (f) => (f.minutyZmierzone ?? f.minutyZPlanu ?? 0) >= PROG_DLUGOSCI_SESJI_MIN
        ? { punkty: 2, pochodzenie: 'bez_dowodu' } : wagaSesji(f), wagaMeczu, { ...WAGI_PRACY }))],
    ['MW5 ⛔ pomiar MOŻE obniżyć wagę treningu klubowego', () => ileFail(bateria(
      (f) => (typeof f.minutyZmierzone === 'number'
        ? { punkty: f.minutyZmierzone >= PROG_DLUGOSCI_SESJI_MIN ? 2 : 1, pochodzenie: 'zmierzony' }
        : wagaSesji(f)), wagaMeczu, { ...WAGI_PRACY }))],
    ['MW6 ⛔ mecz wraca do JEDNEJ wagi, bez minut', () => ileFail(bateria(
      wagaSesji, () => ({ punkty: 3, pochodzenie: 'z_rodzaju' }), { ...WAGI_PRACY }))],
    ['MW7 ⛔ próg długości przesunięty z 45 na 5', () => ileFail(bateria(
      (f) => (typeof f.minutyZmierzone === 'number' && f.minutyZmierzone >= 5
        ? { punkty: 2, pochodzenie: 'zmierzony' } : wagaSesji(f)), wagaMeczu, { ...WAGI_PRACY }))],
    ['MW8 ⛔ nieznany rodzaj liczony po cichu jak mikrosesja', () => ileFail(bateria(
      (f) => wagaSesji({ ...f, eventType: 'micro_session' }), wagaMeczu, { ...WAGI_PRACY }))],
  ];

  let nieZapalone: string | null = null;
  for (const [nazwa, uruchom] of mutacje) {
    const n = uruchom();
    console.log(`       ${nazwa}   →   ${n} FAIL`);
    if (n === 0 && nieZapalone === null) nieZapalone = nazwa;
  }
  check(`⭐⭐ (W1-M) KAŻDA z ${mutacje.length} mutacji zapala strażnika`,
    nieZapalone === null, `nie zapaliła: ${nieZapalone}`);
  check('⭐ (W1-M) …a prawdziwe reguły są po baterii NIETKNIĘTE',
    ileFail(bateria(wagaSesji, wagaMeczu, { ...WAGI_PRACY })) === 0
    && WAGI_PRACY.wpis_dziennika === 0 && PROG_DLUGOSCI_SESJI_MIN === 45,
    'bateria zostawiła po sobie ślad w prawdziwych regułach');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
