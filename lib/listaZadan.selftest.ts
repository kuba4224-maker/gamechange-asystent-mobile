// PLAN-D-C2 08.2026 (14.08.2026) — NOWY PLIK. Zadanie C2.3 — STRAŻNIK.
//
//   npx tsx lib/listaZadan.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ── CZEGO PILNUJE — sześć rzeczy, każda zapala się na innym defekcie ──
//
//   (C2-1) lista znów zaczyna UKŁADAĆ WŁASNĄ KOLEJNOŚĆ — `.sort()`, filtr po
//          regule albo własny `.slice()` na tym, co oddał ranker;
//   (C2-2) ktoś pisze DRUGĄ KARTĘ POZYCJI zamiast użyć `PozycjaKolejkiCard`.
//          To jest jedyny zakaz, którego złamanie przekreśla cały pas: dwie
//          kopie rysowania pozycji rozjadą się i zawodnik zobaczy o tej samej
//          rzeczy dwie różne prawdy na dwóch ekranach;
//   (C2-3) suma w nagłówku kubełka KŁAMIE — wciąga pozycje bez czasu jako zero
//          albo milczy o tym, że czegoś nie wie;
//   (C2-4) cztery stany `odczytZadan` sklejają się w jedno zdanie, czyli
//          „nie odczytałem Twoich zadań" zaczyna wyglądać jak „nie masz zadań";
//   (C2-5) ręczne podniesienie KASUJE zdanie systemu — zawodnik traci prawo
//          wiedzieć, co system o jego decyzji sądzi (M1, M2);
//   (C2-6) ⭐ ktoś spełnia pięć powyższych przez EKRAN, KTÓRY NIC NIE RYSUJE.
//          Bez tej asercji strażnik NAGRADZA skasowanie funkcji.
//
// ⚠️ ASERCJE SĄ NA REGUŁĘ, NIE NA DANE. Nigdzie niżej nie ma liczby wierszy
// z bazy: test „lista ma 6 pozycji" zgasłby przy siódmej i niczego by nie
// pilnował. Wiersze budowane są TUTAJ, w tym pliku (zakaz §9.5 polecenia —
// dane do selftestu nie powstają w bazie zawodnika).
//
// ⚠️ CZEGO TEN PLIK NIE UDAJE. Część asercji czyta ŹRÓDŁA EKRANU I KOMPONENTU
// JAKO TEKST (wzorzec z `lib/kolejkaNaDzis.selftest.ts`). To nie jest test —
// to jest strażnik regresji: nie uruchamia Reacta, nie dotyka Supabase i nie
// wie, czy ekran się rysuje. Import komponentu jest NIEMOŻLIWY, nie pominięty:
// ciągnie `react-native`, którego `tsx` nie potrafi przetransformować
// (`Unexpected "typeof"` w react-native/index.js) — znalezisko 11 pasa B2.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (ograniczenie O53): `tsconfig.json` ciągnie DOM,
// więc `tsc` pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ulozKolejke,
  wezKubelek,
  slad,
  WAGA_BAZOWA,
  type Kandydat,
  type PozycjaKolejki,
  type WejsciaKolejki,
} from './kolejkaPodania';
import { odczytZadan } from './zadania';
import {
  KUBELKI_LISTY,
  ZADANIA_SA,
  ZADANIA_BRAK,
  ZADANIA_BRAK_UPRAWNIEN,
  ZADANIA_NIE_WIEM,
  KUBELEK_PUSTY,
  SUMA_NIC_NIE_WIEM,
  SUMA_CZAS_NIECZYTELNY,
  podsumujKubelek,
  opiszSume,
  zdanieOdczytu,
  zdanieNiepelnosci,
  czyPozycjaZadania,
  idZadaniaZPozycji,
  mozliwePodniesienie,
  mozliweOdhaczenie,
  wejscieZOdpowiedzi,
} from './listaZadan';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — ten sam powód co w `kolejkaNaDzis.selftest.ts`:
 * pliki tego projektu CYTUJĄ w komentarzach zepsute wywołania („⛔ ZERO
 * `.sort(`"), więc strażnik czytający surowy tekst zapalałby się na własnej
 * dokumentacji, a jedynym sposobem, żeby go uciszyć, byłoby skasowanie
 * wyjaśnienia — czyli tej wiedzy, dla której powstał.
 */
const bezKomentarzy = (s: string): string => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .join('\n');

const PLIK_EKRAN = 'components/ListaZadan.tsx';
const PLIK_KARTA = 'components/PozycjaKolejkiCard.tsx';
const PLIK_JA = 'app/(tabs)/ja.tsx';

/**
 * ⭐ PAS I1 16.08.2026 — CHOROBA K1 (ograniczenie O69).
 *
 * CO BYŁO ZEPSUTE: `surowe()` wołało `readFileSync` prosto z listy wpisanej
 * ręcznie wyżej. Gdy pliku nie było — zmiana nazwy, przeniesienie komponentu —
 * strażnik PADAŁ WYJĄTKIEM `ENOENT`, ZANIM policzył cokolwiek. W CI wygląda
 * to jak awaria narzędzia, a nie jak to, czym jest: EKRAN, KTÓREGO PILNUJEMY,
 * ZNIKNĄŁ Z REPOZYTORIUM. Runda H1 zaliczyła ten plik do klasy K1 za to.
 *
 * CO JEST TERAZ: brak pliku zostaje ZAPAMIĘTANY, a nie rzucony — sekcja 0
 * niżej zgłasza FAIL Z NAZWĄ PLIKU.
 */
const BRAK_PLIKOW: string[] = [];
const surowe = (wzgledna: string): string => {
  const p = join(root, wzgledna);
  if (!existsSync(p)) { BRAK_PLIKOW.push(wzgledna); return ''; }
  return readFileSync(p, 'utf8');
};
const zrodlo = (wzgledna: string): string => bezKomentarzy(surowe(wzgledna));

const ekranSurowy = surowe(PLIK_EKRAN);
const ekran = zrodlo(PLIK_EKRAN);
const karta = zrodlo(PLIK_KARTA);
const ja = zrodlo(PLIK_JA);

/**
 * ⭐ PLAN-D-A2 17.08.2026 — PRZEMIATANIE KATALOGU ZAMIAST LISTY (O69).
 * Wersja modułowa `chodz()` z sekcji 0, żeby zapadki pasa A2 też odkrywały
 * pliki z katalogu, a nie z napisanej ręką listy, która starzeje się po cichu.
 */
const POMIN_KAT_REPO = new Set(['_diag_backup', 'node_modules', '.git', '.expo', 'assets']);
function chodzRepo(katalog: string, out: string[] = []): string[] {
  if (!existsSync(katalog)) return out;
  for (const wpis of readdirSync(katalog)) {
    if (POMIN_KAT_REPO.has(wpis)) continue;
    const p = join(katalog, wpis);
    if (statSync(p).isDirectory()) chodzRepo(p, out);
    else if (p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

/**
 * Argumenty każdego wywołania `nazwa(...)` — rozdzielone PO PRZECINKACH
 * NAJWYŻSZEGO POZIOMU, ze skanowaniem głębokości nawiasów (O71: wytnij ciało,
 * nie zgaduj wyrażeniem regularnym).
 *
 * ⚠️ ISTNIEJE, BO WYRAŻENIE REGULARNE TEGO NIE UMIE — wzorzec przeniesiony
 * z `lib/wgladyNaDzis.selftest.ts`, gdzie leniwe `[\s\S]*?` przeskoczyło
 * zamykający nawias argumentu i złapało przecinek kilkaset znaków dalej,
 * w zupełnie innym wywołaniu. Strażnik, który zapala się na poprawnym kodzie,
 * zostaje wyciszony przy pierwszej okazji — i wtedy przestaje pilnować czegokolwiek.
 */
function argumentyWywolania(src: string, nazwa: string): string[][] {
  const wynik: string[][] = [];
  const igla = `${nazwa}(`;
  let od = src.indexOf(igla);
  while (od >= 0) {
    // ⚠️ `policzWglady(` musi być WYWOŁANIEM, a nie końcówką dłuższej nazwy.
    const przed = od === 0 ? '' : src[od - 1];
    if (/[A-Za-z0-9_$]/.test(przed)) { od = src.indexOf(igla, od + igla.length); continue; }
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

/** Sekcja budowania wejść kolejki — znaczniki stoją w komentarzach. */
function sekcjaWejsc(): string | null {
  const od = ekranSurowy.indexOf('WEJŚCIA KOLEJKI — POCZĄTEK');
  const do_ = ekranSurowy.indexOf('WEJŚCIA KOLEJKI — KONIEC');
  if (od < 0 || do_ < 0 || do_ <= od) return null;
  return bezKomentarzy(ekranSurowy.slice(od, do_));
}

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ 0. PAS I1 16.08.2026 — PLIKI, KTÓRE TEN STRAŻNIK CZYTA (K1 / O69)
// ═══════════════════════════════════════════════════════════════════
// Lista ręczna JEST tu potrzebna: asercje niżej mówią o KONKRETNYCH plikach.
// Wolno jej stać, ale nie wolno jej stać SAMEJ — obok idzie asercja na
// RÓWNOŚĆ z tym, co widać w katalogu (O73), bo „co najmniej jeden ekran
// rysuje listę zadań" przeszłoby także wtedy, gdy zawodnik straci wejście
// do niej z zakładki „Ja".
{
  console.log('0. PLIKI, KTÓRE TEN STRAŻNIK CZYTA');

  // ⛔ Brak pliku to FAIL Z NAZWĄ, nigdy wyjątek `ENOENT`.
  check('⛔ każdy plik z listy strażnika istnieje i daje się odczytać',
    BRAK_PLIKOW.length === 0,
    `NIE MA TYCH PLIKÓW: ${BRAK_PLIKOW.join(', ')} — zmieniła się nazwa albo miejsce ekranu. `
    + 'Popraw listę w tym pliku ALBO przywróć ekran; do tego czasu asercje niżej '
    + 'czytają PUSTY tekst i nie znaczą nic.');

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

  // Kto sięga po moduł listy zadań — ODKRYTE Z KATALOGU, nie wpisane.
  // ⚠️ ZMIERZONE 16.08.2026 na `main` po pushu G1.
  const konsumenci = EKRANY.filter(
    (p) => /from\s+'[^']*\/listaZadan'/.test(readFileSync(join(root, p), 'utf8')));
  const KONSUMENCI_LISTY = ['app/(tabs)/ja.tsx', 'components/ListaZadan.tsx'].sort();
  const brakujacy = KONSUMENCI_LISTY.filter((p) => !konsumenci.includes(p));
  const nadmiarowi = konsumenci.filter((p) => !KONSUMENCI_LISTY.includes(p));
  check('⭐ listę zadań rysują DOKŁADNIE te pliki, co wczoraj — RÓWNOŚĆ, nie „≥ 1" (O73)',
    brakujacy.length === 0 && nadmiarowi.length === 0,
    `BRAKUJE: ${brakujacy.join(', ') || '—'} · NADMIAROWI: ${nadmiarowi.join(', ') || '—'} `
    + '→ ubył: zawodnik stracił miejsce, w którym widzi swoje zadania; '
    + 'doszedł: sprawdź, czy nowe miejsce nie liczy kubełków po swojemu.');
}

// ═══════════════════════════════════════════════════════════════════
// DANE DO TESTÓW — budowane TUTAJ, nigdy w bazie zawodnika (§9.5)
// ═══════════════════════════════════════════════════════════════════
const DZIS = '2026-08-14';
const ZA_TRZY_DNI = '2026-08-17';

/** Surowy wiersz `player_tasks` w kształcie, w jakim wraca z Supabase. */
function wierszZadania(w: {
  id: string; title: string; due_on: string | null;
  effort_seconds?: number | null; raised_at?: string | null; reason_key?: string;
}): Record<string, unknown> {
  return {
    id: w.id,
    title: w.title,
    reason_fact: 'Zapisałeś to sam.',
    reason_text: 'Stąd ta pozycja.',
    reason_register: 'fakt_o_tobie',
    reason_key: w.reason_key ?? 'wlasne',
    origin: 'player',
    source_table: null,
    source_row_id: null,
    effort_seconds: w.effort_seconds ?? null,
    due_on: w.due_on,
    state: 'open',
    state_changed_at: null,
    raised_at: w.raised_at ?? null,
    system_key: null,
    created_at: '2026-08-10T08:00:00Z',
  };
}

/**
 * Kandydat wglądu — publiczne wejście rankera (`dodatkowi`, kontrakt B1 §8.7).
 *
 * ⭐ PLAN-D-A2 17.08.2026 — DOSZŁY DWA POLA OPCJONALNE (`co`, `dlaczego`).
 * ⚠️ POWÓD JEST ZMIERZONY, NIE ESTETYCZNY: pas B2 ZWIJA POWTÓRZENIA po
 * treści, więc dwaj kandydaci z tym samym zdaniem wychodzą z rankera JAKO
 * JEDNA pozycja z licznikiem. Asercja urodzeniowa pasa A2 porównuje ZBIORY
 * wglądów na dwóch ekranach — na dwóch identycznych zdaniach porównywałaby
 * dwie jednoelementowe listy i nie znaczyłaby nic.
 * ⛔ Wartości domyślne zostają CO DO ZNAKU takie, jak przed pasem, żeby żadna
 * wcześniejsza asercja nie zmieniła po cichu tego, co sprawdza.
 */
function kandydatWgladu(id: string, tekst?: { co: string; dlaczego: string }): Kandydat {
  return {
    id,
    co: tekst ? tekst.co : 'Zerknij na sen z ostatnich trzech nocy',
    dlaczego: tekst ? tekst.dlaczego : 'Trzy noce poniżej 7 h.',
    ileZajmieSekund: null,
    skadToWiemy: slad({
      rejestr: 'fakt_o_tobie', skad: 'daily_logs', idWiersza: '13', klucz: 'journal',
    }),
    wagaBazowa: WAGA_BAZOWA.wglad,
    zrodlo: 'wglad',
    rodzajPracy: 'inne',
    podniesioneRecznie: false,
    termin: null,
    godzina: null,
  };
}

function wejscia(w: {
  zadaniaData?: unknown; zadaniaError?: unknown; dodatkowi?: Kandydat[];
}): WejsciaKolejki {
  return {
    dzis: DZIS,
    glos: { rodzaj: 'brak_wiersza' },
    ograniczenia: { rodzaj: 'nie_zapisane', powod: 'test' },
    jednaOdpowiedz: null,
    zadania: odczytZadan({ data: w.zadaniaData ?? [], error: w.zadaniaError ?? null }),
    kalendarz: { rodzaj: 'brak' },
    dziennik: { rodzaj: 'brak' },
    bol: { rodzaj: 'brak' },
    cel: { rodzaj: 'jest', dane: { segmentCelu: null, maAktywnyBlok: false } },
    mecz: { rodzaj: 'brak' },
    dodatkowi: w.dodatkowi,
  };
}

/**
 * `slad()` oddaje `null`, gdy dowodu naprawdę nie ma — i to jest jego cała
 * wartość. W teście `null` znaczy, że TEST jest zepsuty, więc ma wybuchnąć
 * tutaj, a nie udawać poprawną pozycję dwadzieścia linii dalej.
 */
function sladLubBlad(w: { rejestr: 'fakt_o_tobie'; skad: string; idWiersza: string | null; klucz: string }) {
  const s = slad(w);
  if (s === null) throw new Error(`selftest zbudował ślad, którego ranker nie przyjmuje: ${JSON.stringify(w)}`);
  return s;
}

/** Pozycja zbudowana ręcznie — wyłącznie do testów sumy. */
function pozycjaZCzasem(id: string, sekundy: number | null): PozycjaKolejki {
  return {
    id,
    co: id,
    dlaczego: null,
    ileZajmieSekund: sekundy,
    skadToWiemy: sladLubBlad({ rejestr: 'fakt_o_tobie', skad: 'player_tasks', idWiersza: id, klucz: 'player' }),
    waga: 500,
    skladnikiWagi: [],
    zrodlo: 'zadanie_zawodnika',
    rodzajPracy: 'inne',
    kubelek: 'teraz',
    kubelekSystemowy: 'teraz',
    podniesioneRecznie: false,
    milczy: null,
    termin: null,
    godzina: null,
    // ⭐ PAS B2 16.08.2026 — `ileRazem` jest polem OBOWIĄZKOWYM `PozycjaKolejki`.
    // `1` = pozycja pojedyncza, nic nie zwinięto — a tak właśnie wygląda każda
    // pozycja budowana ręcznie na potrzeby sumy czasu.
    ileRazem: 1,
  };
}

// ═══════════════════════════════════════════════════════════════════
// (C2-1) EKRAN NIE UKŁADA WŁASNEJ KOLEJNOŚCI
// ═══════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: ktoś uznaje, że „ta pozycja powinna stać wyżej",
// i dokłada `sort` na liście. Od tej chwili kolejność ma DWA źródła, oba
// zielone, oba przekonane, że są jedyne — i rozjeżdżają się po cichu.
// Kolejność, która się nie podoba, jest ZGŁOSZENIEM DO PASA B1.
{
  check('(C2-1) `ListaZadan.tsx` nie sortuje niczego — w pliku nie ma ani jednego `.sort(`',
    !ekran.includes('.sort('),
    'lista znów układa własną kolejność; kolejność ustala WYŁĄCZNIE lib/kolejkaPodania.ts');

  check('(C2-1) wynik `wezKubelek` nie jest sortowany, filtrowany ani cięty na ekranie',
    !/wezKubelek\([^)]*\)\s*\.\s*(sort|filter|slice)\s*\(/.test(ekran)
    && !/\bpozycje\s*\.\s*(sort|filter|slice)\s*\(/.test(ekran),
    'lista wybiera, KTÓRE pozycje pokazać — a wolno jej wybrać wyłącznie KUBEŁEK, i to robi za nią `wezKubelek`');

  check('(C2-1) kubełki bierze przez `wezKubelek(kolejka, kubelek)`',
    /wezKubelek\(\s*kol\s*,\s*k\s*\)/.test(ekran) || /wezKubelek\(\s*\w+\s*,\s*\w+\s*\)/.test(ekran),
    'lista sięga po pozycje inną drogą niż widok rankera');

  check('(C2-1) kolejność kubełków pochodzi z rankera (`KUBELKI`), nie z własnej stałej',
    /KUBELKI_LISTY\s*\.\s*map\s*\(/.test(ekran)
    && KUBELKI_LISTY.join(',') === 'teraz,w_tym_tygodniu,kiedys',
    `KUBELKI_LISTY=${KUBELKI_LISTY.join(',')}`);

  // ⛔ Kontrakt B1 §8.1: produkcja woła `ulozKolejke` z JEDNYM argumentem.
  //
  // ⭐ PLAN-D-A2 17.08.2026 — ASERCJA POPRAWIONA, NIE KOD. Do 16.08 wymagała
  // DOSŁOWNIE `ulozKolejke(dane.wejscia)`, bo tak wyglądało wywołanie w dniu,
  // w którym powstała. Pas A2 dołożył wglądy przez `dodatkowi`, więc wywołanie
  // brzmi teraz `ulozKolejke({ ...dane.wejscia, dodatkowi })`. Reguła się nie
  // zmieniła — JEDNO wywołanie, JEDEN argument — i to jej pilnujemy dalej,
  // licząc argumenty ze skanowaniem głębokości nawiasów, a nie napisem.
  {
    const wywolania = argumentyWywolania(ekran, 'ulozKolejke');
    check('(C2-1) `ulozKolejke` wołane RAZ i z jednym argumentem',
      wywolania.length === 1 && wywolania[0].length === 1
      && /\.\.\.\s*dane\.wejscia/.test(wywolania[0][0]),
      `wywołań: ${wywolania.length}, argumentów: ${JSON.stringify(wywolania.map((a) => a.length))} `
      + '— drugi argument (`Zasady`) jest wyłącznie dla strażnika mutacyjnego rankera; '
      + 'podany z ekranu znaczy, że ekran ma własną kopię reguł, tylko schowaną głębiej');
  }
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ (A2) LISTA WIDZI WGLĄDY — PAS A2, 17.08.2026
// ═══════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE, ZMIERZONE 17.08.2026 na żywych danych zawodnika
// 8d7e1ebb… (`select` do produkcji, zero zapisu):
//
//   ekran „Dziś"        →  5 pozycji, w tym 2 wglądy
//   „Moje zadania"      →  1 pozycja,  w tym 0 wglądów
//
// TA SAMA kolejka, TEN SAM ranker, DWA RÓŻNE ZBIORY POZYCJI. Wgląd „Nie znamy
// Twojego rocznika…" stał na PIĄTYM miejscu, czyli poza prefiksem „Dziś" (4) —
// więc jedynym ekranem, który mógł go pokazać, była ta lista. I akurat ona
// wglądów nie dostawała: `ulozKolejke(dane.wejscia)`, bez pola `dodatkowi`.
//
// ⛔ SZEŚĆ ASERCJI NIŻEJ PILNUJE SZEŚCIU RÓŻNYCH DEFEKTÓW, każdy z nich
// przechodziłby przez pozostałe:
//   (A2-1) ekran przestaje wołać `policzWglady` albo woła je z DRUGIM
//          argumentem — czyli ma własną, schowaną kopię reguł;
//   (A2-2) ⭐ ekran woła obie funkcje i podaje `dodatkowi: []`. Asercja
//          szukająca NAPISU `dodatkowi` przepuściłaby to bez mrugnięcia —
//          dlatego ta jest URUCHOMIENIOWA;
//   (A2-3) `jednaOdpowiedz` przestaje być `null`, czyli powstaje drugi
//          producent pozycji nr 1;
//   (A2-4) ekran zaczyna budować kandydata rekomendacji albo wpisu Dziennika
//          — dwaj kolejni producenci, których ta lista mieć nie ma;
//   (A2-5) wejścia wglądów dostają DRUGIEGO czytnika, który rozjedzie się
//          z pierwszym;
//   (A2-6) ⭐ ktoś zamalowuje pustkę: przy zerze wglądów i zerze zadań lista
//          przestaje mówić „nic nie masz" i rysuje wiersz „na próbę".
{
  console.log('\n(A2) LISTA WIDZI WGLĄDY — PAS A2');

  // ── (A2-1) JEDNO WYWOŁANIE, JEDEN ARGUMENT ───────────────────────
  const wywolaniaWgladow = argumentyWywolania(ekran, 'policzWglady');
  check('⭐ (A2-1) `ListaZadan.tsx` woła `policzWglady` — producent wglądów ma DRUGIEGO KONSUMENTA',
    wywolaniaWgladow.length > 0,
    'lista zadań przestała liczyć wglądy — wracamy do stanu, w którym wgląd spoza prefiksu '
    + '„Dziś" (miejsce 5 z 5) nie ma w całym produkcie ANI JEDNEGO widoku, który by go wydał');

  check('⛔ (A2-1) `policzWglady` wołane z JEDNYM argumentem — ekran nie podmienia zasad wglądów',
    wywolaniaWgladow.length > 0 && wywolaniaWgladow.every((a) => a.length === 1),
    'ekran podał drugi argument (`ZasadyWgladow`), zarezerwowany dla strażnika mutacyjnego B3 — '
    + `czyli ma własną, schowaną kopię reguł liczenia wglądów. Wywołania: `
    + `${JSON.stringify(wywolaniaWgladow.map((a) => a.length))}`);

  check('⛔ (A2-1) kandydaci wglądów idą do `dodatkowi` RANKERA, a nie do osobnej karty',
    /dodatkowi\.push\(\s*\.\.\.\s*wglady\.kandydaci\s*\)/.test(ekran),
    'wglądy nie wchodzą do kolejki jako pozycje — albo stoją obok niej jako osobny producent, '
    + 'a wtedy nie podlegają ani wyciszeniu przy kontuzji, ani hamulcowi bólu, ani ścieżce wyjścia');

  // ⭐ ZŁAPANE BATERIĄ MUTACJI 17.08.2026, MUTACJA M1 — DZIURA, KTÓRA PRZESZŁA.
  // ⛔ Zbudowanie `dodatkowi` i NIEPODANIE go rankerowi jest NIEWIDOCZNE dla
  // wszystkich asercji wyżej: `dodatkowi.push(...)` stoi w pliku, tablica
  // powstaje, kandydaci do niej wpadają — i nikt jej nie czyta. Zmierzone:
  // usunięcie `dodatkowi` z argumentu `ulozKolejke` dało 0 FAIL-i u czterech
  // strażników. To jest dokładnie ten stan sprzed pasa (lista bez wglądów),
  // tylko z martwym kodem, który wygląda na wpięcie.
  {
    const arg = argumentyWywolania(ekran, 'ulozKolejke');
    check('⭐ (A2-1) …i argument `ulozKolejke` NAPRAWDĘ NIESIE `dodatkowi` (mutacja M1)',
      arg.length === 1 && /\bdodatkowi\b/.test(arg[0][0] ?? ''),
      `argument: ${JSON.stringify(arg[0]?.[0] ?? null)} — kandydaci wglądów powstają i giną `
      + 'w martwej tablicy; ekran wygląda na wpięty i nie pokazuje ani jednego wglądu');
  }

  check('⛔ (A2-1) kandydaci NIE SĄ filtrowani, cięci ani sortowani przed rankerem (WG-32)',
    !/wglady\.kandydaci\s*\.\s*(filter|slice|sort|reverse)\s*\(/.test(ekran),
    'ekran wybiera, który wgląd wpuścić — wyciszony wgląd znika wtedy bez powodu milczenia, '
    + 'i znika NIEWIDOCZNIE, bo lista jest po prostu krótsza');

  // ── (A2-3) `jednaOdpowiedz` ZOSTAJE `null` ───────────────────────
  check('⛔ (A2-3) `jednaOdpowiedz` na tej liście jest nadal `null` — bez drugiego producenta pozycji nr 1',
    /jednaOdpowiedz:\s*null/.test(ekran) && !/zbudujJednaOdpowiedz\s*\(/.test(ekran),
    '„jedną odpowiedź" buduje `zbudujJednaOdpowiedz` z OŚMIU wejść ekranu „Dziś"; odtworzona '
    + 'tutaj — choćby niedokładnie, bez `hintState` i bez dawki treści — daje zawodnikowi '
    + 'DWIE RÓŻNE odpowiedzi na to samo pytanie, na dwóch ekranach');

  // ── (A2-4) ZERO DRUGIEGO PRODUCENTA REKOMENDACJI I WPISU ─────────
  // ⚠️ SZUKANE PO TREŚCI (O88), nie po nazwie stałej: kandydat rekomendacji
  // poznaje się po tabeli `decision_recommendations`, a kandydat wpisu — po
  // śladzie z `daily_logs` z kluczem `journal`. Zmiana nazwy stałej nie
  // ukryje ani jednego z nich.
  check('⛔ (A2-4) ekran NIE BUDUJE kandydata rekomendacji (`decision_recommendations`)',
    !/decision_recommendations/.test(ekran) && !/rekomendacja:\$\{/.test(ekran),
    'rekomendacja powstaje z `odpowiedz.dlaczego` i `focusRec` ekranu „Dziś" — zbudowana tutaj '
    + 'jest DRUGIM producentem tej samej pozycji, a jej treść rozjedzie się z tamtą');

  check('⛔ (A2-4) ekran NIE BUDUJE kandydata wpisu Dziennika (ślad `daily_logs` / `journal`)',
    !/klucz:\s*'journal'/.test(ekran) && !/dziennik:\$\{/.test(ekran),
    'zaproszenie do wpisu powstaje na „Dziś" z ośmiu wejść tamtego ekranu — zbudowane tutaj '
    + 'jest drugim producentem i pokaże się zawodnikowi, który wpis właśnie zrobił (Z0)');

  // ── (A2-5) ⭐ ZAPADKA NA RÓWNOŚĆ: ILE MIEJSC CZYTA WEJŚCIA WGLĄDÓW ─
  // ⛔ RÓWNOŚĆ, nie „≥ 1" (O73). Producent wejść ma być JEDEN i mieć DWÓCH
  // konsumentów. Trzecie miejsce, które zacznie budować te wejścia u siebie,
  // rozjedzie się z pozostałymi przy pierwszej dołożonej kolumnie — i zrobi
  // to po cichu, bo obie wersje wyglądają na ekranie tak samo.
  {
    const PLIK_WEJSC = 'lib/wejsciaWgladow.ts';
    const wejsciaKod = zrodlo(PLIK_WEJSC);
    const definicje = ['lib', 'app', 'components']
      .flatMap((k) => chodzRepo(join(root, k)))
      .map((p) => relative(root, p).split(sep).join('/'))
      .filter((p) => !p.endsWith('.selftest.ts'))
      .filter((p) => /export\s+function\s+zbudujWejsciaWgladow\s*\(/
        .test(bezKomentarzy(readFileSync(join(root, p), 'utf8'))))
      .sort();
    const wolajacy = ['app', 'components']
      .flatMap((k) => chodzRepo(join(root, k)))
      .map((p) => relative(root, p).split(sep).join('/'))
      .filter((p) => !p.endsWith('.selftest.ts'))
      .filter((p) => /\bzbudujWejsciaWgladow\s*\(/
        .test(bezKomentarzy(readFileSync(join(root, p), 'utf8'))))
      .sort();
    const WOLAJACY = ['app/(tabs)/dzis.tsx', 'components/ListaZadan.tsx'].sort();

    console.log(`[pomiar] 17.08.2026 — definicji \`zbudujWejsciaWgladow\`: ${definicje.length} `
      + `[${definicje.join(', ') || '—'}] · wołających: ${wolajacy.length} [${wolajacy.join(', ') || '—'}]`);

    check('⭐ (A2-5) wejścia wglądów buduje DOKŁADNIE JEDNO miejsce — RÓWNOŚĆ, nie „≥ 1" (O73)',
      definicje.length === 1 && definicje[0] === PLIK_WEJSC,
      `definicje: ${JSON.stringify(definicje)} (spodziewane: ["${PLIK_WEJSC}"]) — dwa czytniki tej `
      + 'samej rzeczy rozjadą się przy pierwszej zmianie i zrobią to po cichu (O92)');

    check('⭐ (A2-5) …i czytają go DOKŁADNIE te dwa ekrany, co 17.08 — RÓWNOŚĆ (O73)',
      WOLAJACY.every((p) => wolajacy.includes(p)) && wolajacy.every((p) => WOLAJACY.includes(p)),
      `BRAKUJE: ${WOLAJACY.filter((p) => !wolajacy.includes(p)).join(', ') || '—'} · `
      + `NADMIAROWI: ${wolajacy.filter((p) => !WOLAJACY.includes(p)).join(', ') || '—'} `
      + '→ ubył: ekran znowu nie widzi wglądów; doszedł: sprawdź, czy podaje je przez `dodatkowi`');

    // ⛔ KOLUMNY, BEZ KTÓRYCH DWA EKRANY POLICZĄ DWA RÓŻNE WGLĄDY.
    // To jest cichy rozjazd numer jeden: `daily_logs` bez `calendar_event_id`
    // daje na jednym ekranie „żaden wpis nie wskazuje sesji", a na drugim
    // prawdziwą liczbę. Zawodnik dostaje wtedy dwa różne zdania o tej samej
    // rzeczy — i to jest dokładnie to, czego zakazuje decyzja A2 D5.
    const WYMAGANE_KOLUMNY: { tabela: string; kolumna: string }[] = [
      { tabela: 'daily_logs', kolumna: 'calendar_event_id' },
      { tabela: 'pain_entries', kolumna: 'body_location' },
      { tabela: 'calendar_events', kolumna: 'status' },
    ];
    const dzisKod = zrodlo('app/(tabs)/dzis.tsx');
    for (const { tabela, kolumna } of WYMAGANE_KOLUMNY) {
      const maNaLiscie = new RegExp(`from\\('${tabela}'\\)[\\s\\S]{0,260}?${kolumna}`).test(ekran);
      const maNaDzis = new RegExp(`from\\('${tabela}'\\)[\\s\\S]{0,260}?${kolumna}`).test(dzisKod);
      check(`⛔ (A2-5) OBA ekrany proszą \`${tabela}\` o kolumnę \`${kolumna}\``,
        maNaLiscie && maNaDzis,
        `lista=${maNaLiscie ? 'TAK' : 'NIE'} · Dziś=${maNaDzis ? 'TAK' : 'NIE'} — ekran bez tej `
        + 'kolumny policzy INNY wgląd z tych samych danych, a zawodnik dostanie dwa różne zdania '
        + 'o tej samej rzeczy (A2 D5)');
    }

    check('⛔ (A2-5) `lib/wejsciaWgladow.ts` nie importuje Supabase ani Reacta — wydaje NAZWY, nie pyta bazy',
      wejsciaKod.length > 0
      && !/from\s+'[^']*supabase'/.test(wejsciaKod) && !/from\s+'react/.test(wejsciaKod),
      'moduł wejść zaczął sam czytać bazę — wtedy przestaje się dać uruchomić w strażniku, '
      + 'a reguła, której nie da się sprawdzić, cicho przestaje obowiązywać');

    check('⛔ (A2-5) `lib/wejsciaWgladow.ts` nie czyta zegara — `dzis` przychodzi z wejścia kolejki',
      wejsciaKod.length > 0 && !/Date\.now\(/.test(wejsciaKod) && !/new Date\(\s*\)/.test(wejsciaKod),
      'ranker i producent wglądów mogą dostać DWA RÓŻNE dni — o północy cztery części jednego '
      + 'ekranu mówiłyby o dwóch różnych „dziś"');
  }
}

// ═══════════════════════════════════════════════════════════════════
// (C2-2) ⭐ JEDNA KOPIA RYSOWANIA POZYCJI — ZERO DRUGIEJ KARTY
// ═══════════════════════════════════════════════════════════════════
// ⚠️ Asercja jest na BRAK DRUGIEJ KARTY, nie tylko na obecność importu.
// Import może stać w pliku, w którym obok niego mieszka własny render pozycji
// — i wtedy „importuje komponent" jest prawdą, a produkt i tak ma dwie kopie.
{
  check('(C2-2) ekran IMPORTUJE `PozycjaKolejkiCard`',
    /import\s+PozycjaKolejkiCard\s*,?\s*\{?[\s\S]{0,120}?\}?\s*from\s*'\.\/PozycjaKolejkiCard'/.test(ekran),
    'lista nie importuje wspólnego komponentu pozycji');

  check('(C2-2) …i NAPRAWDĘ go renderuje',
    /<PozycjaKolejkiCard\b/.test(ekran),
    'import stoi, ale komponent nie jest użyty — pozycje rysuje coś innego');

  // Znaczniki rysowania pozycji. Wszystkie SĄ w karcie i ŻADEN nie ma prawa
  // wystąpić na ekranie: obecność któregokolwiek znaczy, że ekran zaczął
  // rysować pozycję sam.
  const MARKERY = [
    'pozycja.dlaczego', 'pozycja.milczy', 'pozycja.skadToWiemy',
    'pozycja.kubelekSystemowy', 'pozycja.podniesioneRecznie', 'pozycja.godzina',
  ];
  const wKarcie = MARKERY.filter((m) => karta.includes(m));
  const wEkranie = MARKERY.filter((m) => ekran.includes(m));
  check('(C2-2) ⭐ ekran NIE rysuje pozycji sam — zero znaczników rysowania',
    wKarcie.length === MARKERY.length && wEkranie.length === 0,
    `w karcie: ${wKarcie.length}/${MARKERY.length}; na ekranie znalezione: ${JSON.stringify(wEkranie)}`);

  check('(C2-2) ekran nie renderuje treści pozycji we własnym `<Text>`',
    !/<Text[^>]*>\s*\{?\s*(p|pozycja)\.(co|dlaczego|ileZajmieSekund|godzina|termin)\b/.test(ekran),
    'na ekranie stoi własny render treści pozycji — to jest druga karta, tylko rozsypana');

  check('(C2-2) ekran nie ma własnego formatowania czasu ani własnej mapy „skąd to wiemy"',
    !/(function|const)\s+(opiszCzas|opiszTermin)\b/.test(ekran)
    && !/SKAD_TO_WIEMY\s*[:=]/.test(ekran)
    && !/KUBELEK_ETYKIETA\s*[:=]/.test(ekran),
    'ekran zdublował formatowanie albo brzmienia komponentu — rozjazd jest kwestią czasu');

  check('(C2-2) nazwy kubełków i format czasu bierze Z KOMPONENTU',
    /KUBELEK_ETYKIETA/.test(ekran) && /opiszCzas\(/.test(ekran)
    && karta.includes('export const KUBELEK_ETYKIETA')
    && karta.includes('export function opiszCzas'),
    'ekran ma własne nazwy kubełków albo własny format czasu');
}

// ═══════════════════════════════════════════════════════════════════
// (C2-3) SUMA KUBEŁKA NIE KŁAMIE (WG-19)
// ═══════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: `pozycje.reduce((s,p)=>s+(p.ileZajmieSekund ?? 0),0)`.
// Wygląda niewinnie i zamienia „nie wiemy, ile zajmie" w „zajmie zero" —
// a nagłówek „4 rzeczy · 22 minuty" staje się nieprawdą o cudzym dniu.
{
  const mieszane = [pozycjaZCzasem('a', 600), pozycjaZCzasem('b', null), pozycjaZCzasem('c', 720)];
  const s = podsumujKubelek(mieszane);
  check('(C2-3) pozycja bez czasu NIE wchodzi do sumy i jest policzona osobno',
    s.ile === 3 && s.sekundy === 1320 && s.bezCzasu === 1,
    JSON.stringify(s));

  check('(C2-3) `0` i wartość ujemna też nie są czasem, który wolno dodać',
    podsumujKubelek([pozycjaZCzasem('a', 0), pozycjaZCzasem('b', -30)]).sekundy === 0
    && podsumujKubelek([pozycjaZCzasem('a', 0), pozycjaZCzasem('b', -30)]).bezCzasu === 2,
    JSON.stringify(podsumujKubelek([pozycjaZCzasem('a', 0), pozycjaZCzasem('b', -30)])));

  const zdanie = opiszSume(s, '22 min');
  check('(C2-3) nagłówek MÓWI, przy ilu pozycjach nie wiadomo, ile zajmą',
    zdanie.includes('3 rzeczy') && zdanie.includes('22 min') && zdanie.includes('przy 1 nie wiem ile'),
    zdanie);

  const wszystkieBez = podsumujKubelek([pozycjaZCzasem('a', null), pozycjaZCzasem('b', null)]);
  const zdanieBez = opiszSume(wszystkieBez, null);
  check('(C2-3) gdy NIC nie ma czasu — nagłówek nie podaje żadnej sumy i mówi to wprost',
    zdanieBez.includes(SUMA_NIC_NIE_WIEM) && !/\bmin\b|\bs\b/.test(zdanieBez.replace(SUMA_NIC_NIE_WIEM, '')),
    zdanieBez);

  check('(C2-3) pusty kubełek nie udaje sumy',
    opiszSume(podsumujKubelek([]), null) === KUBELEK_PUSTY,
    opiszSume(podsumujKubelek([]), null));

  check('(C2-3) nieczytelny format czasu NIE JEST po cichu pomijany',
    opiszSume({ ile: 2, sekundy: 600, bezCzasu: 0 }, null).includes(SUMA_CZAS_NIECZYTELNY),
    opiszSume({ ile: 2, sekundy: 600, bezCzasu: 0 }, null));

  check('(C2-3) ekran liczy sumę przez `podsumujKubelek` i `opiszSume`, nie własnym `reduce`',
    /podsumujKubelek\(/.test(ekran) && /opiszSume\(/.test(ekran)
    && !/ileZajmieSekund\s*\?\?\s*0/.test(ekran),
    'suma liczona na ekranie albo pozycja bez czasu wpada do niej jako zero');
}

// ═══════════════════════════════════════════════════════════════════
// (C2-4) CZTERY STANY = CZTERY RÓŻNE STAŁE (R5)
// ═══════════════════════════════════════════════════════════════════
{
  const czteryZdania = [
    zdanieOdczytu(odczytZadan({ data: [wierszZadania({ id: '1', title: 'x', due_on: null })], error: null })),
    zdanieOdczytu(odczytZadan({ data: [], error: null })),
    zdanieOdczytu(odczytZadan({ data: null, error: { code: '42501', message: 'permission denied' } })),
    zdanieOdczytu(odczytZadan({ data: null, error: { message: 'network' } })),
  ];
  check('(C2-4) cztery stany prowadzą do CZTERECH RÓŻNYCH zdań',
    new Set(czteryZdania).size === 4,
    JSON.stringify(czteryZdania));

  check('(C2-4) …i są to dokładnie te cztery nazwane stałe',
    czteryZdania[0] === ZADANIA_SA && czteryZdania[1] === ZADANIA_BRAK
    && czteryZdania[2] === ZADANIA_BRAK_UPRAWNIEN && czteryZdania[3] === ZADANIA_NIE_WIEM,
    JSON.stringify(czteryZdania));

  // ⚠️ `String(...)` nie jest ozdobą: bez niego TypeScript zawęża stałe do
  // TYPÓW LITERAŁOWYCH i odrzuca całe porównanie jako „bez części wspólnej"
  // (TS2367) — czyli asercja, która ma pilnować sklejenia dwóch zdań, nie
  // kompilowałaby się dokładnie wtedy, gdy jest spełniona.
  check('(C2-4) „nie odczytałem" NIE JEST tym samym zdaniem co „nic nie masz"',
    String(ZADANIA_NIE_WIEM) !== String(ZADANIA_BRAK)
    && String(ZADANIA_BRAK_UPRAWNIEN) !== String(ZADANIA_BRAK),
    'stany R5 skleiły się — zawodnik przestał odróżniać pustkę od awarii');

  // Wiersz nieczytelny obok czytelnych: lista JEST niepełna i ma to powiedzieć.
  const zJednymZlym = odczytZadan({
    data: [wierszZadania({ id: '1', title: 'x', due_on: null }), { id: '2' }],
    error: null,
  });
  check('(C2-4) wiersz, który wypadł, NIE ZNIKA po cichu — lista mówi, że jest niepełna',
    zdanieNiepelnosci(zJednymZlym) !== null && zdanieOdczytu(zJednymZlym) === ZADANIA_SA,
    `${String(zdanieNiepelnosci(zJednymZlym))} / ${zdanieOdczytu(zJednymZlym)}`);

  const sekcja = sekcjaWejsc();
  check('(C2-4) ⛔ w sekcji wejść kolejki nie ma ani jednego `?? []` / `|| []`',
    sekcja !== null && !/\?\?\s*\[\]/.test(sekcja) && !/\|\|\s*\[\]/.test(sekcja),
    sekcja === null ? 'nie znalazłem znaczników sekcji wejść' : 'wejście dostało pustą tablicę zamiast stanu „nie wiem"');

  check('(C2-4) `odczytZadan` dostaje CAŁĄ odpowiedź bazy — z `error`, nie samą tablicę',
    /odczytZadan\(\s*\{\s*data:\s*zadaniaRes\.data\s*,\s*error:\s*zadaniaRes\.error\s*\}\s*\)/.test(ekran),
    'ekran odrzucił `error` przed odczytem — czyli sam sobie zamknął drogę do stanu „nie wiem"');

  // ⭐ ASERCJA ZAOSTRZONA PO MUTACJI M4b (14.08.2026). Pierwsza wersja tej
  // grupy sprawdzała WYŁĄCZNIE `zdanieOdczytu` jako funkcję — a ekran, który
  // podstawia jedną stałą na wszystkie cztery stany, przechodził ją na zielono
  // (zmierzone: 44 passed, 0 failed). Cztery różne zdania w bibliotece nic nie
  // znaczą, dopóki ekran ich nie ROZRÓŻNIA.
  check('(C2-4) ⭐ ekran wybiera zdanie PRZEZ `zdanieOdczytu`, a nie podstawia jednej stałej',
    /\{\s*zdanieOdczytu\(dane\.odczyt\)\s*\}/.test(ekran)
    && !/<Text[^>]*>\s*\{\s*(ZADANIA_SA|ZADANIA_BRAK|ZADANIA_BRAK_UPRAWNIEN|ZADANIA_NIE_WIEM)\s*\}/.test(ekran),
    'ekran pokazuje jedno zdanie niezależnie od stanu odczytu — cztery stany R5 skleiły się na ekranie');

  // `wejscieZOdpowiedzi` — reguła sprawdzana URUCHOMIENIEM, nie tekstem.
  check('(C2-4) błąd odczytu daje `nie_wiem`, pusta lista daje `brak` — nigdy odwrotnie',
    wejscieZOdpowiedzi({ data: null, error: { message: 'x' } }, 't', (r) => r).rodzaj === 'nie_wiem'
    && wejscieZOdpowiedzi({ data: [], error: null }, 't', (r) => r).rodzaj === 'brak'
    && wejscieZOdpowiedzi({ data: [1], error: null }, 't', (r) => r).rodzaj === 'jest',
    'trzy stany wejścia skleiły się');
}

// ═══════════════════════════════════════════════════════════════════
// (C2-5) PODNIESIENIE NIE KASUJE ZDANIA SYSTEMU (WT-28, reguła 4)
// ═══════════════════════════════════════════════════════════════════
{
  const k = ulozKolejke(wejscia({
    zadaniaData: [wierszZadania({
      id: 'p1', title: 'Zamów wizytę u fizjo', due_on: null, raised_at: '2026-08-14T09:00:00Z',
    })],
  }));
  const p = k.pozycje[0];
  check('(C2-5) podniesiona pozycja stoi w „Teraz", a kubełek systemowy ZOSTAJE inny',
    p !== undefined && p.podniesioneRecznie === true
    && p.kubelek === 'teraz' && p.kubelekSystemowy === 'w_tym_tygodniu',
    p === undefined ? 'brak pozycji' : `kubelek=${p.kubelek} systemowy=${p.kubelekSystemowy}`);

  check('(C2-5) karta rysuje OBA naraz — decyzję zawodnika I zdanie systemu',
    /PODNIESIONE_PRZEZ_CIEBIE/.test(karta)
    && /SYSTEM_PROPONOWAL\s*\+\s*KUBELEK_ETYKIETA\[pozycja\.kubelekSystemowy\]/.test(karta),
    'karta przestała pokazywać, co proponował system — zawodnik traci prawo to wiedzieć');

  check('(C2-5) ekran nie nadpisuje kubełków pozycji przed przekazaniem jej do karty',
    /<PozycjaKolejkiCard\s+pozycja=\{p\}/.test(ekran)
    && !/kubelekSystemowy\s*:/.test(ekran),
    'ekran podmienia pola pozycji — to jest cicha zmiana tego, co zawodnik widzi');

  // Pozycja JUŻ podniesiona nie dostaje przycisku po raz drugi.
  check('(C2-5) pozycja podniesiona nie dostaje przycisku podniesienia po raz drugi',
    p !== undefined && mozliwePodniesienie(p) === false && mozliweOdhaczenie(p) === true,
    p === undefined ? 'brak pozycji' : `podniesienie=${mozliwePodniesienie(p)} odhaczenie=${mozliweOdhaczenie(p)}`);

  // Rozpoznanie po ŚLADZIE, nie po prefiksie `id`.
  check('(C2-5) zapis idzie do wiersza wskazanego ŚLADEM, nie zgadniętego z `id`',
    p !== undefined && czyPozycjaZadania(p) && idZadaniaZPozycji(p) === 'p1'
    && /skadToWiemy\.skad\s*===\s*TABELA_ZADAN/.test(zrodlo('lib/listaZadan.ts')),
    p === undefined ? 'brak pozycji' : String(idZadaniaZPozycji(p)));

  // ⛔ Identyfikator wiersza NIE WYCHODZI na ekran (kontrakt B1 §8.6).
  check('(C2-5) `idWiersza` nie jest rysowany — służy WYŁĄCZNIE zapisowi do bazy',
    !/<Text[^>]*>[^<]*idWiersza/.test(ekran)
    && /\.eq\('id',\s*idWiersza\)/.test(ekran),
    'identyfikator rekordu wyszedł na ekran albo zapis nie celuje we wskazany wiersz');
}

// ═══════════════════════════════════════════════════════════════════
// (C2-6) ⭐ ASERCJA DOMYKAJĄCA DZIURĘ
// ═══════════════════════════════════════════════════════════════════
// Pięć powyższych grup jest SPEŁNIALNYCH PRZEZ EKRAN, KTÓRY NIC NIE RENDERUJE:
// plik bez `.sort(`, bez własnej karty, bez własnej sumy i bez sklejonych
// stanów przechodzi je wszystkie także wtedy, gdy `return null`. Ta grupa
// podaje KOMPLET DANYCH, przy którym lista MUSI mieć trzy kubełki i pozycje —
// i sprawdza, że je ma, po obu stronach: w danych i w źródle ekranu.
{
  const k = ulozKolejke(wejscia({
    zadaniaData: [
      wierszZadania({ id: 't1', title: 'Opisz wczorajszy mecz', due_on: DZIS, effort_seconds: 600 }),
      wierszZadania({ id: 't2', title: 'Zamów wizytę u fizjo', due_on: ZA_TRZY_DNI }),
    ],
    dodatkowi: [kandydatWgladu('wglad:sen')],
  }));

  const wKubelkach = KUBELKI_LISTY.map((kub) => wezKubelek(k, kub));
  check('(C2-6) ⭐ przy komplecie danych KAŻDY z trzech kubełków ma pozycje',
    wKubelkach.length === 3 && wKubelkach.every((lista) => lista.length > 0),
    `teraz=${wKubelkach[0].length} w_tym_tygodniu=${wKubelkach[1].length} kiedys=${wKubelkach[2].length}`);

  check('(C2-6) ⭐ …a suma pierwszego kubełka podaje prawdziwy czas, nie zero',
    podsumujKubelek(wKubelkach[0]).sekundy === 600
    && podsumujKubelek(wKubelkach[1]).bezCzasu === podsumujKubelek(wKubelkach[1]).ile,
    JSON.stringify(wKubelkach.map(podsumujKubelek)));

  check('(C2-6) suma wszystkich kubełków = cała kolejka; ani jedna pozycja nie ginie',
    wKubelkach[0].length + wKubelkach[1].length + wKubelkach[2].length === k.pozycje.length
    && k.pozycje.length === 3,
    `kubełki=${wKubelkach.map((x) => x.length).join('+')} kolejka=${k.pozycje.length}`);

  // ⭐ Źródło ekranu NAPRAWDĘ rysuje kubełki i pozycje — nie tylko je liczy.
  const renderKubelka = ekran.slice(ekran.indexOf('const renderKubelek'));
  check('(C2-6) ⭐ ekran renderuje TRZY kubełki, każdy z nagłówkiem i sumą',
    /KUBELKI_LISTY\.map\(\(k\)\s*=>\s*renderKubelek\(/.test(ekran)
    && /KUBELEK_ETYKIETA\[k\]/.test(renderKubelka)
    && /opiszSume\(suma,\s*opiszCzas\(suma\.sekundy\)\)/.test(renderKubelka),
    'ekran przestał rysować kubełki albo ich nagłówki');

  check('(C2-6) ⭐ ekran renderuje POZYCJE wewnątrz kubełka, wspólnym komponentem',
    /pozycje\.map\(\(p\)\s*=>\s*renderPozycja\(/.test(renderKubelka)
    && /<PozycjaKolejkiCard\b/.test(ekran),
    'kubełki są, ale pozycje w nich nie powstają — ekran nagradza skasowanie funkcji');

  check('(C2-6) ⭐ WT-29: „Kiedyś" startuje ZWINIĘTY, dwa pozostałe rozwinięte',
    /teraz:\s*true,\s*w_tym_tygodniu:\s*true,\s*kiedys:\s*false/.test(ekran),
    'stan startowy kubełków zmieniony — „Kiedyś" nie jest już jedną linią z liczbą');

  check('(C2-6) WT-23 i WT-28: pole odhaczenia i podniesienie NAPRAWDĘ zapisują do bazy',
    /update\(\s*\{\s*state:\s*'done'/.test(ekran)
    && /update\(\s*\{\s*raised_at:/.test(ekran)
    && /BLAD_ODHACZENIA/.test(ekran) && /BLAD_PODNIESIENIA/.test(ekran),
    'odhaczenie/podniesienie nic nie zapisuje albo błąd zapisu jest połykany (R5)');

  // Ścieżka wyjścia: lista nie wydaje ANI JEDNEJ pozycji.
  const kWyciszona = ulozKolejke({
    ...wejscia({ zadaniaData: [wierszZadania({ id: 't1', title: 'x', due_on: DZIS })] }),
    ograniczenia: { rodzaj: 'znane', aktywne: ['wszystkoMilczy'], nierozstrzygniete: [], nieznane: [], nieznaneKlucze: [] },
  });
  check('(C2-6) ścieżka wyjścia: `wezKubelek` nie wydaje ANI JEDNEJ pozycji',
    kWyciszona.wyciszonaCalkowicie
    && KUBELKI_LISTY.every((kub) => wezKubelek(kWyciszona, kub).length === 0)
    && kWyciszona.pozycje.length > 0,
    `wyciszona=${kWyciszona.wyciszonaCalkowicie} pozycji w kolejce=${kWyciszona.pozycje.length}`);

  check('(C2-6) …i ekran gasi wtedy CAŁĄ listę, zamiast rysować puste kubełki',
    /kolejka\.wyciszonaCalkowicie\s*\?/.test(ekran),
    'ekran nie ma gałęzi ścieżki wyjścia — narysuje trzy puste kubełki z licznikami');
}

// ═══════════════════════════════════════════════════════════════════
// WEJŚCIE Z EKRANU „JA" — A1: ŻADNEJ PIĄTEJ ZAKŁADKI
// ═══════════════════════════════════════════════════════════════════
{
  check('lista ma wejście z ekranu „Ja" i jest MODALEM, nie piątą zakładką',
    /<ListaZadan\b/.test(ja) && /setZadaniaOtwarte\(true\)/.test(ja)
    && /<Modal\b/.test(ekran),
    'wejścia z „Ja" nie ma albo lista przestała być modalem');

  check('podpis wejścia niesie CZTERY STANY odczytu, nie zdanie na sztywno',
    /zdanieOdczytu\(odczytZadanStan\)/.test(ja),
    'wiersz „Moje zadania" ma opis na sztywno — ten sam defekt, co „Wynik diagnozy" przed 10.08');

  check('`ja.tsx` nie liczy kolejki u siebie — robi to modal',
    !/ulozKolejke\(/.test(ja) && !/wezKubelek\(/.test(ja),
    'ekran „Ja" zaczął liczyć kolejkę — druga kopia tej samej decyzji');
}

// ═══════════════════════════════════════════════════════════════════
// PLIKI, KTÓRE TEN STRAŻNIK CZYTA, NAPRAWDĘ ZAWIERAJĄ BADANĄ LOGIKĘ
// ═══════════════════════════════════════════════════════════════════
// Bez tego część asercji przechodziłaby, nie sprawdzając niczego — plik
// istnieje, tylko nie ma już w nim tego, czego pilnujemy.
{
  check('pliki, które ten strażnik czyta, zawierają badaną logikę',
    ekran.includes('ulozKolejke') && ekran.includes('wezKubelek')
    && karta.includes('PozycjaKolejki') && karta.includes('KUBELEK_ETYKIETA')
    && ja.includes('ListaZadan'),
    `ekran=${ekran.length}B karta=${karta.length}B ja=${ja.length}B`);
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ (A2-2) ASERCJA URUCHOMIENIOWA — SEDNO PASA A2
// ═══════════════════════════════════════════════════════════════════
// Wszystko wyżej czyta tekst. Ta sekcja niczego nie czyta: bierze JEDEN
// zestaw wejść, buduje z niego kolejkę „jak w `dzis.tsx`" i kolejkę
// „jak w `ListaZadan.tsx`", i sprawdza, że ZBIÓR WGLĄDÓW JEST IDENTYCZNY
// co do klucza, zdania i powodu (decyzja A2 D5).
//
// ⛔ PO CO, SKORO WYŻEJ STOI ASERCJA NA `dodatkowi.push(...wglady.kandydaci)`.
// Bo asercja na tekst przepuściłaby `dodatkowi: []` — pole, które JEST,
// i wglądy, których NIE MA. Przepuściłaby też wpięcie kandydatów, które
// po drodze gubi `dlaczego` albo podmienia `id`. Ta nie przepuszcza:
// porównuje WYNIK rankera, pozycja po pozycji.
//
// ⚠️ TA SEKCJA NIE UDAJE, ŻE URUCHAMIA EKRANY. Uruchamia tego samego
// PRAWDZIWEGO rankera, którego wołają oba ekrany, na tych samych wejściach —
// czyli sprawdza dokładnie tę różnicę, którą pas A2 usunął.
{
  console.log('\n(A2-2) ASERCJA URUCHOMIENIOWA — TEN SAM ZBIÓR WGLĄDÓW NA OBU EKRANACH');

  // ⚠️ DWA RÓŻNE ZDANIA, nie dwa razy to samo: pas B2 zwija powtórzenia
  // po treści, więc dwaj kandydaci z identycznym `co` wyszliby z rankera jako
  // JEDNA pozycja — i asercja porównywałaby dwie jednoelementowe listy.
  const kandydaciWgladow = [
    kandydatWgladu('wglad:sen_wobec_obciazenia:2026-08-14', {
      co: 'Spałeś krócej niż 6 h w 3 z ostatnich 5 nocy',
      dlaczego: 'Najkrócej 4 h, 12 sierpnia.',
    }),
    kandydatWgladu('wglad:brak_roku_urodzenia:2026-08-14', {
      co: 'Nie znamy Twojego rocznika',
      dlaczego: 'Przez to z 4 odcinków Mapy drogi nie umiemy dobrać treści do wieku.',
    }),
  ];

  // „Jak w `dzis.tsx`": `jednaOdpowiedz` policzona + DWAJ producenci lokalni
  // (rekomendacja i wpis Dziennika) + kandydaci wglądów.
  const jakDzis = ulozKolejke({
    ...wejscia({ zadaniaData: [wierszZadania({ id: 'z1', title: 'Zadanie zawodnika', due_on: DZIS })] }),
    jednaOdpowiedz: {
      coZrobic: { zrodlo: 'blok', tekst: 'Nowa porcja w Twoim Bloku' },
      dlaczego: null,
      coToZmieni: null,
      pokazac: true,
      powod: 'selftest — źródło: aktywny Blok',
    },
    dodatkowi: [
      {
        id: 'dziennik:2026-08-14',
        co: 'Zapisz dzisiejszy wpis',
        dlaczego: 'Nie masz jeszcze dzisiejszego wpisu.',
        ileZajmieSekund: null,
        skadToWiemy: sladLubBlad({
          rejestr: 'fakt_o_tobie', skad: 'daily_logs', idWiersza: null, klucz: 'journal',
        }),
        wagaBazowa: WAGA_BAZOWA.zadanie_systemowe,
        zrodlo: 'zadanie_systemowe',
        rodzajPracy: 'porzadek',
        podniesioneRecznie: false,
        termin: DZIS,
        godzina: null,
      },
      ...kandydaciWgladow,
    ],
  });

  // „Jak w `ListaZadan.tsx`": `jednaOdpowiedz` = `null`, ZERO producentów
  // lokalnych — i TE SAME kandydaty wglądów, z tego samego wywołania
  // tej samej funkcji.
  const jakLista = ulozKolejke({
    ...wejscia({ zadaniaData: [wierszZadania({ id: 'z1', title: 'Zadanie zawodnika', due_on: DZIS })] }),
    dodatkowi: kandydaciWgladow,
  });

  const wgladyZ = (k: ReturnType<typeof ulozKolejke>) => k.pozycje
    .filter((p) => p.zrodlo === 'wglad')
    .map((p) => `${p.id} ${p.co} ${p.dlaczego ?? ''}`)
    .sort();

  const naDzis = wgladyZ(jakDzis);
  const naLiscie = wgladyZ(jakLista);

  check('⭐ (A2-2) obie kolejki mają wglądy — a nie „zero i zero", co przeszłoby jako równość',
    naDzis.length === kandydaciWgladow.length && naLiscie.length === kandydaciWgladow.length,
    `„Dziś"=${naDzis.length} · lista=${naLiscie.length} (spodziewane po ${kandydaciWgladow.length}) `
    + '— dwa puste zbiory są sobie równe i nie znaczą nic');

  check('⭐ (A2-2) ZBIÓR WGLĄDÓW JEST IDENTYCZNY: ten sam klucz, to samo zdanie, ten sam powód (D5)',
    JSON.stringify(naDzis) === JSON.stringify(naLiscie),
    `„Dziś": ${JSON.stringify(naDzis)}\n       lista: ${JSON.stringify(naLiscie)} `
    + '— zawodnik dostał DWA RÓŻNE zdania o tej samej rzeczy na dwóch ekranach');

  check('⭐ (A2-2) różnica między kolejkami to WYŁĄCZNIE pozycje, których ta lista świadomie nie buduje',
    jakDzis.pozycje.filter((p) => !jakLista.pozycje.some((q) => q.id === p.id))
      .every((p) => p.zrodlo === 'jedna_odpowiedz' || p.id.startsWith('dziennik:'))
    && jakLista.pozycje.every((p) => jakDzis.pozycje.some((q) => q.id === p.id)),
    'na jednym z ekranów stoi pozycja, której nie ma na drugim, i nie jest to ani „jedna '
    + 'odpowiedź", ani wpis Dziennika — czyli kolejka znów ma dwa różne zbiory pozycji');

  check('⛔ (A2-2) żaden kandydat wglądu nie ZNIKA na bramce rankera po drodze na listę',
    jakLista.odrzucone.length === 0,
    `odrzucone: ${JSON.stringify(jakLista.odrzucone)} — wgląd wpięty poprawnie, a mimo to `
    + 'niewidoczny, jest gorszy niż wgląd niewpięty: wygląda na zrobiony');
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ (A2-6) ASERCJA ODWROTNA — PUSTKA ZOSTAJE PUSTKĄ (D7)
// ═══════════════════════════════════════════════════════════════════
// ⛔ Ta asercja jest po to, żeby wpięcie wglądów NIE STAŁO SIĘ pretekstem
// do zamalowania pustki. Gdy producent nie zbuduje ani jednego wglądu
// i zawodnik nie ma ani jednego zadania, lista ma wyglądać DOKŁADNIE TAK,
// JAK PRZED PASEM: zdanie `ZADANIA_BRAK` i ani jednego wiersza „na próbę".
{
  console.log('\n(A2-6) PUSTKA ZOSTAJE PUSTKĄ (D7)');

  const przed = ulozKolejke(wejscia({ zadaniaData: [] }));
  const poZerze = ulozKolejke({ ...wejscia({ zadaniaData: [] }), dodatkowi: [] });
  const poBraku = ulozKolejke({ ...wejscia({ zadaniaData: [] }), dodatkowi: undefined });

  check('⭐ (A2-6) zero wglądów + zero zadań → kolejka CO DO ZNAKU taka sama jak przed pasem',
    JSON.stringify(poZerze.pozycje) === JSON.stringify(przed.pozycje)
    && JSON.stringify(poBraku.pozycje) === JSON.stringify(przed.pozycje),
    `przed=${przed.pozycje.length} · dodatkowi:[]=${poZerze.pozycje.length} · `
    + `bez pola=${poBraku.pozycje.length} — wpięcie wglądów dołożyło pozycję tam, gdzie `
    + 'zawodnik nie ma NICZEGO; pusta lista jest uczciwa, zamalowana nie');

  check('⭐ (A2-6) …i zdanie o braku zadań jest nadal `ZADANIA_BRAK`, a nie „prawie coś masz"',
    zdanieOdczytu(odczytZadan({ data: [], error: null })) === ZADANIA_BRAK
    && poZerze.pozycje.length === 0,
    `zdanie=${zdanieOdczytu(odczytZadan({ data: [], error: null }))} · pozycji=${poZerze.pozycje.length}`);

  check('⛔ (A2-6) ekran nadal ma gałąź `ZADANIA_BRAK` — pustka ma własne zdanie, nie ciszę',
    /zdanieOdczytu\(/.test(ekran) && /KUBELEK_PUSTY/.test(ekran),
    'zniknęło zdanie o pustce albo zdanie o pustym kubełku — zawodnik przestał odróżniać '
    + '„nic nie masz" od „nie udało mi się odczytać" (R5)');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
