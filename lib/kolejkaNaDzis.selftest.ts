// PLAN-D-B2 08.2026 (14.08.2026) — NOWY PLIK. Zadanie B2.4 — STRAŻNIK.
//
//   npx tsx lib/kolejkaNaDzis.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ── CZEGO PILNUJE — pięć rzeczy, każda zapala się na innym defekcie ──
//
//   (B2-1) ekran znów zaczyna UKŁADAĆ WŁASNĄ KOLEJNOŚĆ — `.sort()`,
//          `.filter()` po regule albo własny `.slice()` na wyniku rankera;
//   (B2-2) ekran przestaje wołać rankera i wraca do własnej logiki wyboru
//          (albo podaje `ulozKolejke` DRUGI argument, zarezerwowany dla
//          strażnika mutacyjnego i pasa B3);
//   (B2-3) wejście kolejki dostaje `?? []` — czyli „nie udało się odczytać"
//          staje się nieodróżnialne od „nic nie masz";
//   (B2-4) stany `pusto` i `nie_wiem` sklejają się w jedno zdanie;
//   (B2-5) ⭐ ktoś spełnia cztery powyższe przez USUNIĘCIE renderowania
//          kolejki. Bez tej asercji strażnik NAGRADZA skasowanie funkcji.
//
// ⚠️ ASERCJE SĄ NA REGUŁĘ, NIE NA DANE. Nigdzie niżej nie ma liczby wierszy
// w bazie: test „kolejka ma 4 pozycje" zgasłby przy piątej i niczego by nie
// pilnował. Pilnujemy KSZTAŁTU DECYZJI i KSZTAŁTU WYWOŁAŃ.
//
// ⚠️ CZEGO TEN PLIK NIE UDAJE. Część asercji czyta ŹRÓDŁA EKRANU I KOMPONENTU
// JAKO TEKST (wzorzec z `lib/meczWKalendarzu.selftest.ts`). To nie jest test —
// to jest strażnik regresji. Nie uruchamia Reacta, nie dotyka Supabase i nie
// wie, czy ekran się rysuje. Zamiana wywołania na inne, równie zepsute,
// przejdzie tu niezauważona. Dlatego każda asercja mówi wprost, co dokładnie
// było zepsute.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (ograniczenie O53): `tsconfig.json` ciągnie DOM,
// więc `tsc` pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ulozKolejke,
  wezDlaWidoku,
  slad,
  WAGA_BAZOWA,
  type WejsciaKolejki,
  type Kandydat,
} from './kolejkaPodania';
import type { JednaOdpowiedz } from './jednaOdpowiedz';
// ⛔ ŚWIADOMIE NIE IMPORTUJEMY KOMPONENTU. Ciągnie `react-native`, którego
// `tsx` nie potrafi przetransformować (`Unexpected "typeof"` w
// react-native/index.js) — a runner selftestów jest właśnie po to, żeby reguły
// dało się sprawdzić BEZ appki. Reguły komponentu sprawdzamy więc na jego
// źródle, tak samo jak reguły ekranu. Wymuszone przez narzędzie, nie wybrane.

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — ten sam powód co w `meczWKalendarzu.selftest.ts`:
 * pliki tego projektu CYTUJĄ w komentarzach zepsute wywołania („⛔ w tej sekcji
 * nie ma prawa paść ani jedno `?? []`"), więc strażnik czytający surowy tekst
 * zapalałby się na własnej dokumentacji, a jedynym sposobem, żeby go uciszyć,
 * byłoby skasowanie wyjaśnienia — czyli tej wiedzy, dla której powstał.
 */
const bezKomentarzy = (s: string): string => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .join('\n');

const PLIK_DZIS = 'app/(tabs)/dzis.tsx';
const PLIK_KOMPONENT = 'components/PozycjaKolejkiCard.tsx';

/**
 * ⭐ PAS I1 16.08.2026 — CHOROBA K1 (ograniczenie O69).
 *
 * CO BYŁO ZEPSUTE: `surowe()` wołało `readFileSync` prosto z listy wpisanej
 * ręcznie wyżej. Gdy pliku nie było — zmiana nazwy ekranu, przeniesienie
 * komponentu — strażnik PADAŁ WYJĄTKIEM `ENOENT`, ZANIM policzył cokolwiek.
 * W CI wygląda to jak awaria narzędzia („nie umie odczytać pliku"), a nie
 * jak to, czym jest: EKRAN, KTÓREGO PILNUJEMY, ZNIKNĄŁ Z REPOZYTORIUM.
 * Runda H1 zaliczyła ten plik do klasy K1 właśnie za to.
 *
 * CO JEST TERAZ: brak pliku zostaje ZAPAMIĘTANY, a nie rzucony. Strażnik
 * dochodzi do sekcji 0 niżej i zgłasza FAIL Z NAZWĄ PLIKU.
 */
const BRAK_PLIKOW: string[] = [];
const surowe = (wzgledna: string): string => {
  const p = join(root, wzgledna);
  if (!existsSync(p)) { BRAK_PLIKOW.push(wzgledna); return ''; }
  return readFileSync(p, 'utf8');
};
const zrodlo = (wzgledna: string): string => bezKomentarzy(surowe(wzgledna));

const dzisSurowe = surowe(PLIK_DZIS);
const dzis = zrodlo(PLIK_DZIS);
const komponent = zrodlo(PLIK_KOMPONENT);

/**
 * Sekcja budowania wejść kolejki, wycięta z SUROWEGO źródła (znaczniki stoją
 * w komentarzach, więc po `bezKomentarzy` by ich nie było) i dopiero potem
 * odkomentowana.
 */
function sekcjaWejsc(): string | null {
  const od = dzisSurowe.indexOf('WEJŚCIA KOLEJKI — POCZĄTEK');
  const do_ = dzisSurowe.indexOf('WEJŚCIA KOLEJKI — KONIEC');
  if (od < 0 || do_ < 0 || do_ <= od) return null;
  return bezKomentarzy(dzisSurowe.slice(od, do_));
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
// Lista ręczna JEST tu potrzebna: asercje niżej mówią o KONKRETNYCH plikach
// („`dzis.tsx` nie sortuje niczego"). Wolno jej stać, ale nie wolno jej stać
// SAMEJ — obok idzie asercja na RÓWNOŚĆ z tym, co widać w katalogu (O73).
// „Co najmniej jeden konsument kolejki" przeszłoby także wtedy, gdy ekran
// przestanie ją rysować, a zostanie sam komponent karty.
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

  // Kto w ogóle sięga po ranker — ODKRYTE Z KATALOGU, nie wpisane.
  const konsumenci = EKRANY.filter(
    (p) => /from\s+'[^']*\/kolejkaPodania'/.test(readFileSync(join(root, p), 'utf8')));
  // ⚠️ ZMIERZONE 16.08.2026 na `main` po pushu G1, nie przepisane z pamięci.
  // `app/(tabs)/ja.tsx` NIE JEST tu wymieniony celowo: wspomina ranker tylko
  // w komentarzu, a komentarz nie rysuje kolejności.
  const KONSUMENCI_KOLEJKI = [
    'app/(tabs)/dzis.tsx',
    'components/ListaZadan.tsx',
    'components/PozycjaKolejkiCard.tsx',
  ].sort();
  const brakujacy = KONSUMENCI_KOLEJKI.filter((p) => !konsumenci.includes(p));
  const nadmiarowi = konsumenci.filter((p) => !KONSUMENCI_KOLEJKI.includes(p));
  check('⭐ kolejkę rysują DOKŁADNIE te pliki, co wczoraj — RÓWNOŚĆ, nie „≥ 1" (O73)',
    brakujacy.length === 0 && nadmiarowi.length === 0,
    `BRAKUJE: ${brakujacy.join(', ') || '—'} · NADMIAROWI: ${nadmiarowi.join(', ') || '—'} `
    + '→ ubył: sprawdź, czy zawodnik nadal widzi tam kolejność z rankera; '
    + 'doszedł: sprawdź, czy nowe miejsce nie układa własnej kolejności.');

  // Ekran, który liczy kolejkę, ma być JEDEN — dwa znaczą dwa źródła kolejności.
  const zUlozKolejke = EKRANY.filter(
    (p) => p.startsWith('app/') && /\bulozKolejke\s*\(/.test(readFileSync(join(root, p), 'utf8')));
  check('⛔ ranker jest wołany z DOKŁADNIE JEDNEGO ekranu — dwa miejsca to dwie kolejności',
    zUlozKolejke.length === 1 && zUlozKolejke[0] === PLIK_DZIS,
    `ekrany wołające ulozKolejke(): ${zUlozKolejke.join(', ') || 'ŻADEN'} (oczekiwany: ${PLIK_DZIS})`);
}

// ═══════════════════════════════════════════════════════════════════
// (B2-1) EKRAN NIE UKŁADA WŁASNEJ KOLEJNOŚCI
// ═══════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: ktoś uznaje, że „ta pozycja powinna stać wyżej",
// i dokłada `sort` na ekranie. Od tej chwili kolejność ma DWA źródła, oba
// zielone, oba przekonane, że są jedyne — i rozjeżdżają się po cichu.
// Kolejność, która się nie podoba, jest ZGŁOSZENIEM DO PASA B1.
{
  check('(B2-1) `dzis.tsx` nie sortuje niczego — w pliku nie ma ani jednego `.sort(`',
    !dzis.includes('.sort('),
    'ekran znów układa własną kolejność; kolejność ustala WYŁĄCZNIE lib/kolejkaPodania.ts');

  check('(B2-1) wynik `wezDlaWidoku` nie jest filtrowany ani cięty na ekranie',
    !/pozycjeNaDzis\s*\.\s*(sort|filter|slice)\s*\(/.test(dzis)
    && !/wezDlaWidoku\([^)]*\)\s*\.\s*(sort|filter|slice)\s*\(/.test(dzis),
    'ekran wybiera, KTÓRE pozycje pokazać — a wolno mu wybrać wyłącznie ILE, i to robi za niego `wezDlaWidoku`');
}

// ═══════════════════════════════════════════════════════════════════
// (B2-2) EKRAN CZYTA RANKERA, A NIE SIEBIE
// ═══════════════════════════════════════════════════════════════════
{
  check('(B2-2) `dzis.tsx` woła `ulozKolejke`',
    /\bulozKolejke\(/.test(dzis),
    'ekran przestał czytać kolejkę — wrócił kolaż producentów');

  check('(B2-2) …i bierze pozycje przez `wezDlaWidoku(kolejka, \'dzis\')`',
    /wezDlaWidoku\(\s*kolejka\s*,\s*'dzis'\s*\)/.test(dzis),
    'ekran sięga po pozycje inną drogą niż widok rankera');

  // ⛔ Kontrakt B1 §8.1: produkcja woła `ulozKolejke` z JEDNYM argumentem.
  // Drugi (`Zasady`) istnieje dla strażnika mutacyjnego rankera i dla pasa B3.
  // Podany z ekranu znaczy, że ekran ZMIENIA REGUŁY rankera u siebie —
  // czyli ma własną kopię reguł, tylko schowaną głębiej.
  const wywolania = Array.from(dzis.matchAll(/ulozKolejke\(([\s\S]{0,400}?)\);/g)).map((m) => m[1]);
  check('(B2-2) `ulozKolejke` wołane z JEDNYM argumentem — ekran nie podmienia zasad rankera',
    wywolania.length > 0 && wywolania.every((a) => !/\}\s*,/.test(a.trim().replace(/^\{[\s\S]*\}\s*$/, ''))
      && a.split('}').length - 1 <= (a.match(/\{/g) || []).length),
    `wywołania: ${JSON.stringify(wywolania)}`);
}

// ═══════════════════════════════════════════════════════════════════
// (B2-3) TRZY STANY WEJŚCIA, NIGDY DWA — ZERO `?? []`
// ═══════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: `const dane = res.data ?? []`. `supabase-js` NIE
// RZUCA przy nieudanym odczycie — oddaje `{ data: null, error }`. Po `?? []`
// ekran mówi „nic nie masz na dziś" zawodnikowi, o którym po prostu nic nie
// odczytał. To jest nieprawda o nim, wygląda identycznie jak prawda i nikt
// nigdy tu nie wróci, bo ekran wygląda na wdrożony.
{
  const sekcja = sekcjaWejsc();
  check('(B2-3) sekcja „WEJŚCIA KOLEJKI" istnieje i da się ją wskazać znacznikami',
    sekcja !== null && sekcja.length > 200,
    'znaczników POCZĄTEK/KONIEC nie ma — nie da się powiedzieć, gdzie powstają wejścia rankera');

  check('(B2-3) w sekcji wejść kolejki nie ma ani jednego `?? []` / `|| []`',
    sekcja !== null && !/\?\?\s*\[\s*\]/.test(sekcja) && !/\|\|\s*\[\s*\]/.test(sekcja),
    'wejście kolejki skleja „nie udało się odczytać" z „nic nie masz" (R5)');

  check('(B2-3) wejścia powstają JEDYNĄ drogą — przez `wejscieZOdpowiedzi`, które widzi `error`',
    sekcja !== null && (sekcja.match(/wejscieZOdpowiedzi</g) || []).length >= 3,
    'ktoś zbudował wejście z samej `data`, z pominięciem błędu odczytu');

  check('(B2-3) zadania idą przez `odczytZadan`, które NIE PRZYJMUJE samej tablicy',
    sekcja !== null && /odczytZadan\(\s*\{\s*data:/.test(sekcja),
    'ekran odrzucił `error` przed wywołaniem — jedyny ruch, którym powstaje pustka zamiast błędu');
}

// ═══════════════════════════════════════════════════════════════════
// (B2-4) TRZY STANY KOLEJKI = TRZY RÓŻNE ZDANIA
// ═══════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: `pusto` i `nie_wiem` dostają jeden komunikat.
// Wtedy zawodnik, u którego odczyt padł, czyta, że nic nie ma — a produkt
// wygląda, jakby działał.
{
  const stala = (nazwa: string): string | null => {
    const m = new RegExp(`const\\s+${nazwa}\\s*=\\s*'([^']*)'`).exec(dzis);
    return m ? m[1] : null;
  };
  const pusto = stala('KOLEJKA_PUSTO');
  const nieWiem = stala('KOLEJKA_NIE_WIEM');
  const niepelna = stala('KOLEJKA_NIEPELNA');

  check('(B2-4) istnieją OSOBNE stałe na „pusto", „nie wiem" i „lista niepełna"',
    pusto !== null && nieWiem !== null && niepelna !== null,
    `pusto=${pusto} nieWiem=${nieWiem} niepelna=${niepelna}`);

  check('(B2-4) „pusto" i „nie wiem" to DWA RÓŻNE zdania, nie jedno',
    pusto !== null && nieWiem !== null && pusto !== nieWiem && pusto.length > 0 && nieWiem.length > 0,
    'stany R5 skleiły się — „nie odczytałem" mówi to samo, co „nic nie masz"');

  check('(B2-4) ekran rozgałęzia się na stanie kolejki, a nie na samej długości listy',
    /kolejka\.stan\s*===\s*'nie_wiem'/.test(dzis),
    'ekran nie patrzy na `kolejka.stan` — dwa różne stany trafią w tę samą gałąź');

  check('(B2-4) `niepelna` MÓWI o sobie — lista skrócona po cichu wygląda jak pełna',
    /kolejka\.niepelna/.test(dzis) && dzis.includes('KOLEJKA_NIEPELNA'),
    'ekran skraca listę i nie mówi o tym ani słowa');
}

// ═══════════════════════════════════════════════════════════════════
// (B2-5) ⭐ ASERCJA DOMYKAJĄCA DZIURĘ
// ═══════════════════════════════════════════════════════════════════
// Cztery powyższe są spełnialne przez USUNIĘCIE renderowania kolejki: bez
// `.sort`, bez `?? []`, ze stałymi, których nikt nie używa — suita świeci na
// zielono, a zawodnik nie widzi ani jednej pozycji. Ta asercja wymaga, żeby
// ekran NAPRAWDĘ rysował obie głębokości i pole „skąd to wiemy".
{
  check('(B2-5) ekran renderuje pozycje jednym, wspólnym komponentem',
    /<PozycjaKolejkiCard/.test(dzis) && /pozycjeNaDzis\.map\(/.test(dzis),
    'kolejka nie trafia na ekran — cztery poprzednie asercje są wtedy spełnione przez usunięcie funkcji');

  check('(B2-5) pierwsza pozycja jest PODANA (rozwinięta), reszta zwinięta — dwie głębokości',
    /pierwsza=\{i === 0\}/.test(dzis) && /pierwsza\s*=\s*false/.test(komponent)
    && /useState\(pierwsza\)/.test(komponent),
    'obie głębokości zniknęły — rzecz ważna wymaga dotknięcia (złamane P0) albo nie da się jej zwinąć');

  // ⚠️ TA ASERCJA BYŁA ZA SŁABA I ZŁAPAŁ TO DOPIERO TEST MUTACYJNY (mutacja M5,
  // 14.08.2026): sprawdzała obecność `rozwinieta ?` gdziekolwiek w pliku —
  // a `rozwinieta ?` stoi też w przełączniku („Skąd to wiemy" / „Ukryj").
  // Skasowanie CAŁEJ gałęzi rozwiniętej przechodziło więc na zielono: przycisk
  // zostawał, treść znikała. Teraz wymagamy, żeby to `{skad}` stało W GAŁĘZI
  // rozwinięcia — czyli żeby głębokość 1 naprawdę coś pokazywała.
  check('(B2-5) gałąź rozwinięta NAPRAWDĘ rysuje zdanie „skąd to wiemy"',
    /pozycja\.skadToWiemy\.klucz/.test(komponent) && /SKAD_TO_WIEMY\[/.test(komponent)
    && /rozwinieta\s*\?\s*<Text[\s\S]{0,80}\{skad\}/.test(komponent),
    'głębokość 1 nie istnieje albo jest pusta — przełącznik zostaje, treść znika');

  check('(B2-5) pozycja wstrzymana jest WIDOCZNA, z powodem i warunkiem powrotu (WG-24)',
    /pozycja\.milczy\.powod/.test(komponent) && /pozycja\.milczy\.warunekPowrotu/.test(komponent)
    && /pozycjaMilczaca/.test(komponent),
    'milcząca pozycja znika albo milczy bez podanego powodu — to wygląda jak awaria, nie jak decyzja');
}

// ═══════════════════════════════════════════════════════════════════
// CZEGO ZAWODNIK NIE MA ZOBACZYĆ (kontrakt B1 §8.6)
// ═══════════════════════════════════════════════════════════════════
{
  check('waga i jej składniki NIE wychodzą do zawodnika',
    !/pozycja\.waga/.test(komponent) && !/skladnikiWagi/.test(komponent)
    && !/\.waga/.test(dzis) && !/skladnikiWagi/.test(dzis),
    'liczba wewnętrzna trafiła na ekran — nic zawodnikowi nie mówi i zaprasza do porównywania się (N3)');

  check('identyfikator wiersza NIE jest rysowany',
    !/idWiersza/.test(komponent),
    'komponent pokazuje identyfikator rekordu — zero wartości dla zawodnika');

  check('ręczne podniesienie NIE KASUJE kubełka systemowego (reguła 4)',
    /kubelekSystemowy/.test(komponent) && /podniesioneRecznie/.test(komponent),
    'zawodnik decyduje, ale przestaje wiedzieć, co system o tym sądzi (M1, M2)');
}

// ═══════════════════════════════════════════════════════════════════
// „ILE ZAJMIE" I „SKĄD TO WIEMY" — dwa pola, w których `null` bywa mylone
// z zerem i z niewiedzą
// ═══════════════════════════════════════════════════════════════════
{
  // ⛔ ZAKAZ 2 z polecenia §7: `ileZajmieSekund === null` → pole ZNIKA.
  // „30 sekund" wypisane komuś, komu nikt czasu nie zmierzył, jest zmyśleniem
  // tak samo jak zmyślone uzasadnienie — tylko mniej rzucającym się w oczy.
  check('„ile zajmie" oddaje `null` przy braku danych i przy zerze, a nie „0 s"',
    /if \(sekundy === null\) return null;/.test(komponent)
    && /sekundy <= 0\) return null;/.test(komponent)
    && !/'0 s'/.test(komponent),
    'brak `ileZajmieSekund` zamienia się na ekranie w liczbę — czyli w zmyślony pomiar');

  // Mapa klucz → zdanie. `nieznane` znaczy „baza wie więcej niż ta wersja
  // appki" i NIE MA prawa dostać brzmienia (kontrakt B1 §8.3).
  const mapa = /SKAD_TO_WIEMY:\s*Record<string, string>\s*=\s*\{([\s\S]*?)\};/.exec(komponent);
  const klucze = mapa ? Array.from(mapa[1].matchAll(/^\s*(\w+):/gm)).map((m) => m[1]) : [];
  check('mapa „skąd to wiemy" ma zdanie dla kluczy, których ekran naprawdę używa',
    klucze.includes('journal') && klucze.includes('calendar') && klucze.includes('rekomendacja'),
    `klucze mapy: ${JSON.stringify(klucze)}`);
  check('mapa „skąd to wiemy" NIE ZGADUJE klucza `nieznane`',
    klucze.length > 0 && !klucze.includes('nieznane'),
    'klucz `nieznane` dostał brzmienie — zgadnięte zdanie jest gorsze niż jego brak (Z0)');

  // ⚠️ ZMIERZONE NA PRODUKCJI 14.08.2026: kolejka wydaje DWIE pozycje
  // kalendarza o identycznej treści („Blok Skupienia: Bieg ciągły w strefie
  // tlenowej", 15 i 20 sierpnia). Bez terminu zawodnik ma na ekranie dwa takie
  // same wiersze i nie ma jak ich odróżnić — a `termin` jest polem pozycji,
  // więc rysowanie go nie wymaga niczego, czego kolejka nie ma.
  check('termin JEST rysowany, a `null` i data nieczytelna oddają brak, nie „dziś"',
    /pozycja\.termin !== null && pozycja\.termin !== dzis/.test(komponent)
    && /if \(iso === null\) return null;/.test(komponent)
    && /return null;[\s\S]{0,80}toLocaleDateString/.test(komponent),
    'pozycje o tej samej treści zlewają się w jedną — albo nieczytelna data trafia na ekran');
}

// ═══════════════════════════════════════════════════════════════════
// KOLEJNOŚĆ NAPRAWDĘ WYCHODZI Z RANKERA — na tych samych kandydatach,
// których używa ekran (rekomendacja + dzisiejszy wpis Dziennika)
// ═══════════════════════════════════════════════════════════════════
{
  const odpowiedzRekomendacja: JednaOdpowiedz = {
    coZrobic: { zrodlo: 'rekomendacja', tekst: null },
    dlaczego: 'Bo to jest Twoje wąskie gardło.',
    coToZmieni: null,
    pokazac: true,
    powod: 'selftest',
  };

  const kandydatRekomendacji: Kandydat = {
    id: 'rekomendacja:1',
    co: 'Zrób trzy serie po osiem powtórzeń.',
    dlaczego: odpowiedzRekomendacja.dlaczego,
    ileZajmieSekund: null,
    skadToWiemy: slad({
      rejestr: 'propozycja', skad: 'decision_recommendations', idWiersza: '1', klucz: 'rekomendacja',
    }),
    wagaBazowa: WAGA_BAZOWA.jedna_odpowiedz,
    zrodlo: 'jedna_odpowiedz',
    rodzajPracy: 'praca_nad_celem',
    podniesioneRecznie: false,
    termin: '2026-08-14',
    godzina: null,
  };

  const kandydatDziennika: Kandydat = {
    id: 'dziennik:2026-08-14',
    co: 'Zapisz dzisiejszy wpis',
    dlaczego: 'Nie masz jeszcze dzisiejszego wpisu.',
    ileZajmieSekund: null,
    skadToWiemy: slad({
      rejestr: 'fakt_o_tobie', skad: 'daily_logs', idWiersza: null, klucz: 'journal',
    }),
    wagaBazowa: WAGA_BAZOWA.zadanie_systemowe,
    zrodlo: 'zadanie_systemowe',
    rodzajPracy: 'porzadek',
    podniesioneRecznie: false,
    termin: '2026-08-14',
    godzina: null,
  };

  const wejscia: WejsciaKolejki = {
    dzis: '2026-08-14',
    glos: { rodzaj: 'brak_wiersza' },
    ograniczenia: { rodzaj: 'nie_odczytane', powod: 'selftest' },
    jednaOdpowiedz: odpowiedzRekomendacja,
    zadania: { rodzaj: 'brak_danych' },
    kalendarz: { rodzaj: 'brak' },
    dziennik: { rodzaj: 'brak' },
    bol: { rodzaj: 'brak' },
    cel: { rodzaj: 'brak' },
    mecz: { rodzaj: 'brak' },
    dodatkowi: [kandydatRekomendacji, kandydatDziennika],
  };

  const k = ulozKolejke(wejscia);
  const naDzis = wezDlaWidoku(k, 'dzis');

  check('rekomendacja WCHODZI do kolejki jako pozycja, a nie stoi obok niej',
    naDzis.length === 2 && naDzis[0].id === 'rekomendacja:1',
    `pozycje: ${JSON.stringify(naDzis.map((p) => p.id))}`);

  check('wpis Dziennika stoi POD rekomendacją, bo tak zważył ranker — nie dlatego, że tak go wpisano',
    naDzis.length === 2 && naDzis[1].id === 'dziennik:2026-08-14'
    && naDzis[0].waga > naDzis[1].waga,
    `wagi: ${JSON.stringify(naDzis.map((p) => [p.id, p.waga]))}`);

  // ⚠️ TA SAMA LISTA W ODWROTNEJ KOLEJNOŚCI WEJŚCIA MA DAĆ TEN SAM WYNIK.
  // Bez tego „jedno źródło kolejności" znaczy tylko tyle, że kolejność ustala
  // kolejność zapytań do bazy — czyli dokładnie to, co ten pas wycina.
  const odwrotnie = ulozKolejke({ ...wejscia, dodatkowi: [kandydatDziennika, kandydatRekomendacji] });
  check('kolejność wejścia NIE zmienia kolejności wyjścia',
    JSON.stringify(wezDlaWidoku(odwrotnie, 'dzis').map((p) => p.id))
    === JSON.stringify(naDzis.map((p) => p.id)),
    'kolejność zależy od kolejności zapytań — jedno źródło kolejności jest pozorne');

  check('`nie_odczytane` ograniczenia czynią listę NIEPEŁNĄ, a nie pustą',
    k.niepelna && k.stan === 'sa_pozycje',
    `stan=${k.stan} niepelna=${k.niepelna}`);
}

// ═══════════════════════════════════════════════════════════════════
// PLIKI, KTÓRE TEN STRAŻNIK CZYTA, NAPRAWDĘ ZAWIERAJĄ BADANĄ LOGIKĘ
// ═══════════════════════════════════════════════════════════════════
// Bez tego część asercji przechodziłaby, nie sprawdzając niczego — plik
// istnieje, tylko nie ma już w nim tego, czego pilnujemy.
{
  check('pliki, które ten strażnik czyta, zawierają badaną logikę',
    dzis.includes('ulozKolejke') && dzis.includes('wezDlaWidoku')
    && komponent.includes('PozycjaKolejki') && komponent.includes('SKAD_TO_WIEMY'),
    `dzis=${dzis.length}B komponent=${komponent.length}B`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
