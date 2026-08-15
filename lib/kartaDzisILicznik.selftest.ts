// PLAN-D-B5 08.2026 (15.08.2026) — NOWY PLIK. Zadanie B5.4 — STRAŻNIK KARTY.
//
//   npx tsx lib/kartaDzisILicznik.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ═════════════════════════════════════════════════════════════════════
// DLACZEGO NOWY PLIK, A NIE ROZSZERZENIE `wgladyNaDzis.selftest.ts`
//
// Polecenie B5 §3 zostawia wybór i każe go uzasadnić. Zmierzone 15.08.2026:
//
//   grep -c "policzWykonanaPrace\|zbudujTydzien\|licznik" lib/wgladyNaDzis.selftest.ts  →  0
//
// Strażnik B4 nie zna słowa „licznik" ani „tydzień". Pilnuje CZEGO INNEGO:
// że sześć wglądów wchodzi do kolejki przez rankera i że trzecia część wglądu
// jest narysowana. To są reguły PASA B4 i mają zostać jego regułami.
//
// Powód policzalny, ten sam co przy B4: gdy ktoś wyrwie licznik pracy z ekranu,
// czerwony ma się zrobić plik o nazwie `kartaDzisILicznik`, a nie plik o nazwie
// `wgladyNaDzis`. Nazwa czerwonego pliku jest pierwszą informacją, jaką dostaje
// człowiek patrzący na CI — i jedyną, którą dostaje za darmo.
//
// ⚠️ Ten plik NIE POWTARZA pracy strażników C1 (73 asercje) i D1 (84 asercje).
// Tamte pilnują, czy tydzień i licznik są dobrze LICZONE. Ten pilnuje wyłącznie
// tego, czy są WPIĘTE I NARYSOWANE — i to jest cała różnica między „KOD GOTOWY"
// a „JEST" (O58).
//
// ── PIĘĆ DEFEKTÓW, KAŻDY z własną asercją i własną mutacją ─────────
//
//   (B5-1) ekran buduje tydzień WŁASNĄ PĘTLĄ po dniach zamiast wołać
//          `zbudujTydzien` — czyli powstaje druga kopia reguły rozwijania
//          reguły cyklicznej, i pierwsza poprawka wejdzie tylko do jednej;
//   (B5-2) ekran nie woła `policzWykonanaPrace` — licznik pracy zostaje bez
//          konsumenta, tak jak był przed tym pasem;
//   (B5-3) ⭐ `brak_podstawy` prowadzi do TEJ SAMEJ stałej co `policzony`,
//          z podstawionym zerem — czyli „nie wiem, ile odbyłeś" zostaje
//          narysowane jako „0 z 0", zdanie wyglądające na pomiar;
//   (B5-4) wejście tygodnia albo werdyktów dostaje `?? []` — „nie udało się
//          odczytać" staje się nieodróżnialne od „nic nie masz", a trzy stany
//          `czytajWerdykty` znikają w całości i CICHO;
//   (B5-5) ⭐ ktoś spełnia cztery powyższe kodem, który woła obie funkcje
//          i NIC NIE RENDERUJE. Bez tej asercji strażnik świeci na zielono
//          przy liczniku, którego zawodnik nigdy nie zobaczy — czyli nagradza
//          dokładnie ten stan, który ten pas likwiduje.
//
// ⚠️ ASERCJE SĄ NA REGUŁĘ I NA KSZTAŁT WYWOŁAŃ, NIE NA DANE. Nigdzie niżej nie
// ma liczby wierszy z produkcji: test „licznik pokazuje 0 z 2" zgasłby przy
// pierwszym werdykcie i niczego by nie pilnował. Liczby stoją w nocie.
//
// ⚠️ CZEGO TEN PLIK NIE UDAJE. Część asercji czyta ŹRÓDŁO EKRANU JAKO TEKST
// (wzorzec z `wgladyNaDzis.selftest.ts` i `meczWKalendarzu.selftest.ts`).
// To nie jest test — to jest strażnik regresji. Nie uruchamia Reacta i nie wie,
// czy ekran się rysuje. Dlatego ostatnia sekcja jest inna: przepuszcza
// prawdziwe wejścia przez PRAWDZIWE funkcje pasów C1 i D1 i sprawdza, że oba
// stany licznika naprawdę powstają — bo asercja na kształt renderu jest warta
// tyle, ile prawda o tym, że oba stany są osiągalne.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (ograniczenie O53): `tsconfig.json` ciągnie DOM,
// więc `tsc` pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.
// ═════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { zbudujTydzien, type WierszWydarzenia } from './widokTygodnia';
import {
  policzWykonanaPrace,
  czytajWerdykty,
  PLAKIETKI_WYKONANIA,
  type WystapienieDoLicznika,
} from './wykonanieSesji';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — ten sam powód co w strażnikach B2 i B4: pliki tego
 * projektu CYTUJĄ w komentarzach zepsute wywołania („⛔ nie ma prawa paść ani
 * jedno `?? []`"), więc strażnik czytający surowy tekst zapalałby się na
 * własnej dokumentacji, a jedynym sposobem, żeby go uciszyć, byłoby skasowanie
 * wyjaśnienia — czyli tej wiedzy, dla której powstał.
 */
const bezKomentarzy = (s: string): string => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .join('\n');

const PLIK_DZIS = 'app/(tabs)/dzis.tsx';

const dzisSurowe = readFileSync(join(root, PLIK_DZIS), 'utf8');
const dzis = bezKomentarzy(dzisSurowe);

/**
 * Sekcja budowania TRZECH WEJŚĆ tygodnia i licznika, wycięta z SUROWEGO
 * źródła (znaczniki stoją w komentarzach, więc po `bezKomentarzy` by ich nie
 * było) i dopiero potem odkomentowana.
 */
function sekcjaWejscTygodnia(): string | null {
  const od = dzisSurowe.indexOf('WEJŚCIA TYGODNIA I LICZNIKA — POCZĄTEK');
  const do_ = dzisSurowe.indexOf('WEJŚCIA TYGODNIA I LICZNIKA — KONIEC');
  if (od < 0 || do_ < 0 || do_ <= od) return null;
  return bezKomentarzy(dzisSurowe.slice(od, do_));
}

/**
 * Argumenty każdego wywołania `nazwa(...)` — rozdzielone PO PRZECINKACH
 * NAJWYŻSZEGO POZIOMU, ze skanowaniem głębokości nawiasów.
 * ⚠️ Skopiowane co do znaku z `wgladyNaDzis.selftest.ts` i z tego samego
 * powodu: wyrażenie regularne tego nie umie, a leniwe `[\s\S]*?` przeskakuje
 * zamykający nawias klamrowy argumentu i łapie przecinek kilkaset znaków dalej.
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

/** Blok w klamrach, zaczynający się pierwszym `{` po `od`. `null`, gdy się nie domyka. */
function blokOd(src: string, od: number): string | null {
  const start = src.indexOf('{', od);
  if (start < 0) return null;
  let glebokosc = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') glebokosc++;
    else if (src[i] === '}') {
      glebokosc--;
      if (glebokosc === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

/** Ciało funkcji `nazwa()` z pliku bez komentarzy — od `{` do domykającego `}`. */
function cialoFunkcji(src: string, nazwa: string): string | null {
  const od = src.indexOf(`function ${nazwa}(`);
  return od < 0 ? null : blokOd(src, od);
}

/** Ciało `const <nazwa> … = useMemo(() => { … })`. */
function cialoMemo(src: string, nazwa: string): string | null {
  const od = src.indexOf(`const ${nazwa}`);
  if (od < 0) return null;
  const memo = src.indexOf('useMemo(() =>', od);
  if (memo < 0) return null;
  return blokOd(src, memo);
}

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

// ═══════════════════════════════════════════════════════════════════
// (B5-1) EKRAN WOŁA `zbudujTydzien`, A NIE WŁASNĄ PĘTLĘ PO DNIACH
// ═══════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: ktoś buduje siedem wierszy dnia na miejscu —
// pętlą po datach, z własnym rozwijaniem `recurrence_rule`. Wtedy reguła
// „który wtorek to jest" istnieje w DWÓCH kopiach. Pierwsza poprawka wejdzie
// do jednej z nich; widok tygodnia w Kalendarzu i widok tygodnia na karcie
// będą pokazywały co innego, OBA będą wyglądały poprawnie, a różnicy nie
// zauważy nikt — bo nikt nie ogląda obu naraz.
{
  check('(B5-1) `dzis.tsx` woła `zbudujTydzien`',
    /\bzbudujTydzien\(/.test(dzis),
    'karta buduje tydzień sama — czysta funkcja pasa C1 (41 755 B, 73 asercje) '
    + 'znowu jest wołana wyłącznie z Kalendarza');

  const wywolaniaTygodnia = argumentyWywolania(dzis, 'zbudujTydzien');
  check('(B5-1) `zbudujTydzien` wołane z JEDNYM argumentem — ekran nie podmienia reguł tygodnia',
    wywolaniaTygodnia.length > 0 && wywolaniaTygodnia.every((a) => a.length === 1),
    `wywołania: ${JSON.stringify(wywolaniaTygodnia.map((a) => a.length))}`);

  // ⛔ ŻADNEJ WŁASNEJ PĘTLI PO DNIACH ANI WŁASNEGO ROZWIJANIA REGUŁY.
  // Szukamy dokładnie tych kształtów, którymi ktoś napisałby drugą kopię:
  // pętli po siedmiu dniach i ręcznego rozbierania `recurrence_rule` w tej
  // części pliku, która buduje tydzień.
  const cialoTygodnia = cialoFunkcji(dzis, 'renderTydzienNaKarcie');
  const cialoWiersza = cialoFunkcji(dzis, 'renderWierszDnia');
  check('(B5-1) ⭐ render tygodnia NIE MA własnej pętli po dniach ani własnego rozwijania reguły',
    cialoTygodnia !== null && cialoWiersza !== null
    && !/for\s*\(/.test(cialoTygodnia) && !/for\s*\(/.test(cialoWiersza)
    && !/recurrence_rule/.test(cialoTygodnia) && !/recurrence_rule/.test(cialoWiersza)
    && !/dniReguly|dodajDni|datyTygodnia/.test(cialoTygodnia)
    && !/dniReguly|dodajDni|datyTygodnia/.test(cialoWiersza),
    `renderTydzienNaKarcie=${cialoTygodnia === null ? 'BRAK' : `${cialoTygodnia.length}B`} `
    + `renderWierszDnia=${cialoWiersza === null ? 'BRAK' : `${cialoWiersza.length}B`}`);

  // Siedem wierszy dnia ma przyjść Z FUNKCJI (`tydzien.dni`), a nie z tablicy
  // zbudowanej na ekranie. Bez tego poprzednia asercja przechodzi przy kodzie,
  // który buduje dni `map`-em po własnej liście dat.
  check('(B5-1) siedem wierszy dnia bierze się z `.dni` wyniku funkcji',
    /\.dni\.map\(/.test(dzis),
    'ekran nie mapuje `dni` z wyniku `zbudujTydzien` — wiersze powstają gdzie indziej');
}

// ═══════════════════════════════════════════════════════════════════
// (B5-2) EKRAN WOŁA `policzWykonanaPrace`
// ═══════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: licznik pracy zostaje bez konsumenta — dokładnie
// stan sprzed tego pasa, w którym 84 asercje pilnowały funkcji, o którą nikt
// nigdy nie pytał. Cztery obietnice (WG-28, WG-37, WT-15, WT-17) stały wtedy
// w `KOD GOTOWY` wyłącznie dlatego, że nikt nie wpiął jednego wywołania.
{
  check('(B5-2) `dzis.tsx` woła `policzWykonanaPrace`',
    /\bpoliczWykonanaPrace\(/.test(dzis),
    'licznik pracy pasa D1 (84 asercje) znowu nie ma ani jednego konsumenta');

  const wywolaniaLicznika = argumentyWywolania(dzis, 'policzWykonanaPrace');
  // ⛔ Drugi argument (`ZasadyWykonania`) jest punktem wpięcia MUTACJI i należy
  // wyłącznie do strażnika D1. Podany z ekranu znaczyłby, że ekran ma własną,
  // schowaną kopię reguł rozstrzygania wykonania — i że mutacja ma drogę
  // na ekran zawodnika.
  check('(B5-2) `policzWykonanaPrace` wołane z JEDNYM argumentem — ekran nie podmienia zasad wykonania',
    wywolaniaLicznika.length > 0 && wywolaniaLicznika.every((a) => a.length === 1),
    `ekran podał drugi argument (\`ZasadyWykonania\`), zarezerwowany dla strażnika mutacyjnego D1. `
    + `Wywołania: ${JSON.stringify(wywolaniaLicznika.map((a) => a.length))}`);

  // ⭐⛔ WYWOŁANIE MUSI BYĆ OSIĄGALNE, A NIE TYLKO OBECNE W TEKŚCIE.
  //
  // ⚠️ TA ASERCJA ISTNIEJE, BO PIERWSZA WERSJA DWÓCH POWYŻSZYCH NIE ZAPALIŁA
  // SIĘ NA MUTACJI M2 (zmierzone 15.08.2026). Mutacja nie kasowała wywołania —
  // stawiała nad nim `if (…) return null;`. Wywołanie zostawało w pliku, oba
  // wyrażenia regularne przechodziły, strażnik świecił na zielono, a licznik
  // nie miał konsumenta dokładnie tak samo jak przed tym pasem.
  //
  // Poprawne ciało memo ma DOKŁADNIE DWA `return`: strażnik wejścia
  // (`return null`, gdy dane jeszcze nie przyszły) i wynik funkcji. Trzeci
  // `return` znaczy, że ktoś dołożył drogę omijającą licznik — a taka droga
  // z definicji nie ma testu, bo wygląda jak brak danych.
  const memoLicznika = cialoMemo(dzis, 'licznik');
  const ileReturnow = (memoLicznika?.match(/\breturn\b/g) || []).length;
  const ileReturnNull = (memoLicznika?.match(/\breturn\s+null\b/g) || []).length;
  check('(B5-2) ⭐ wywołanie licznika jest OSIĄGALNE — memo ma dwa `return`, nie trzy',
    memoLicznika !== null && ileReturnow === 2 && ileReturnNull === 1
    && /return\s+policzWykonanaPrace\(/.test(memoLicznika),
    `memo licznika: ${memoLicznika === null ? 'BRAK' : `${memoLicznika.length}B`}, `
    + `\`return\`=${ileReturnow} (oczekiwane 2), \`return null\`=${ileReturnNull} (oczekiwane 1). `
    + 'Dodatkowy `return` to droga omijająca licznik — wywołanie zostaje w pliku i nic nie liczy');

  // ⛔ N1 — LICZNIK NIE LICZY DNI Z RZĘDU I SIĘ NIE ZERUJE. Seria dni na tym
  // ekranie jest błędem, nie funkcją: jeden opuszczony dzień obniża automatyzm
  // nawyku o 0,29 punktu i nawyku NIE PRZERYWA, więc licznik wracający do zera
  // mówi zawodnikowi nieprawdę o tym, jak powstaje nawyk (złamanie Z0).
  check('(B5-2) ⛔ nigdzie nie ma serii dni ani zerowania licznika (N1)',
    !/dniZRzedu|seriaDni|streak|zerujLicznik|resetLicznik/i.test(dzis),
    'na ekranie pojawiło się pojęcie serii dni albo zerowania — N1 zakazuje obu');
}

// ═══════════════════════════════════════════════════════════════════
// (B5-3) ⭐ `brak_podstawy` PROWADZI DO INNEJ STAŁEJ NIŻ `policzony`
// ═══════════════════════════════════════════════════════════════════
// ⛔ TO JEST NAJWAŻNIEJSZA ASERCJA TEGO PLIKU.
//
// Kształt `brak_podstawy` świadomie nie ma pól `odbyte` ani `mianownik` (pas
// D1) — po to, żeby nie dało się z nich narysować „0 z 0". Ale ekran może tę
// ostrożność obejść w jednej linii: wystarczy napisać `licznik.rodzaj ===
// 'policzony' ? licznik.odbyte : 0` i zdanie „nie wiem, ile odbyłeś" zamienia
// się w pomiar, którego nikt nie wykonał. Wygląda wtedy poprawnie i przechodzi
// wszystkie pozostałe asercje.
{
  const cialoLicznika = cialoFunkcji(dzis, 'renderLicznikPracy');

  check('(B5-3) render licznika istnieje i rozgałęzia się po `rodzaj`',
    cialoLicznika !== null && /rodzaj\s*===\s*'policzony'/.test(cialoLicznika),
    `renderLicznikPracy=${cialoLicznika === null ? 'BRAK' : `${cialoLicznika.length}B`}`);

  check('(B5-3) ⭐ `brak_podstawy` prowadzi do INNEJ stałej niż `policzony`',
    cialoLicznika !== null
    && /LICZNIK_POLICZONY\(/.test(cialoLicznika)
    && /LICZNIK_BRAK_PODSTAWY\(/.test(cialoLicznika),
    'obie gałęzie licznika prowadzą do tego samego brzmienia — czyli „nie wiem" '
    + 'jest rysowane tym samym zdaniem co pomiar');

  // ⛔ ANI JEDNEGO ZERA PODSTAWIONEGO ZA BRAKUJĄCE POLE.
  check('(B5-3) ⭐ ⛔ ekran NIE podstawia zera za brakujące `odbyte` / `mianownik`',
    cialoLicznika !== null
    && !/(odbyte|mianownik)\s*(\?\?|\|\|)\s*0/.test(cialoLicznika)
    && !/:\s*0\b/.test(cialoLicznika),
    'gdzieś stoi zero podstawione za pole, którego `brak_podstawy` celowo nie ma — '
    + 'to jest „0 z 0" napisane inaczej');

  // Brzmienie `brak_podstawy` nie ma prawa zawierać wzorca „N z M".
  check('(B5-3) brzmienie `brak_podstawy` nie zawiera wzorca „N z M"',
    !/LICZNIK_BRAK_PODSTAWY\s*=\s*\([^)]*\)\s*=>[\s\S]{0,600}?\$\{[^}]*\}\s*z\s*\$\{/.test(dzis),
    'stała `brak_podstawy` buduje zdanie w kształcie pomiaru');

  // ⛔ WG-28 wymaga JAWNEGO „bez wpisu". Jawne znaczy: własne zdanie, nie
  // milczenie i nie doliczenie do mianownika.
  check('(B5-3) WG-28 — „bez wpisu" ma własne, jawne zdanie',
    /LICZNIK_BEZ_WPISU\s*=/.test(dzis) && cialoLicznika !== null
    && /LICZNIK_BEZ_WPISU\(/.test(cialoLicznika),
    'trzecia liczba WG-28 („bez wpisu") nie jest pokazywana jawnie');

  // ⭐ M4 — liczba kończy się rzeczą do zrobienia, w OBU gałęziach.
  check('(B5-3) ⭐ M4 — licznik kończy się rzeczą do zrobienia, niezależnie od gałęzi',
    cialoLicznika !== null
    && /LICZNIK_ROBOTA_(ZAZNACZ|ZAPLANUJ)/.test(cialoLicznika)
    && /const\s+doZrobienia\s*=/.test(cialoLicznika)
    && cialoLicznika.indexOf('doZrobienia') < cialoLicznika.indexOf("rodzaj === 'policzony'"),
    'rzecz do zrobienia powstaje wewnątrz jednej z gałęzi — czyli druga kończy się na wiedzy (M4)');
}

// ═══════════════════════════════════════════════════════════════════
// (B5-4) ZERO `?? []` I `|| []` NA WEJŚCIACH TYGODNIA I WERDYKTÓW
// ═══════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: `(werdyktyRes.data ?? [])`. Wygląda niewinnie
// i kasuje w całości rozróżnienie, na którym stoi pas D1: „tabeli nie ma"
// (`brak`) od „nie udało mi się odczytać" (`nie_odczytano`) od „odczytałem
// i nic nie ma" (`jest`, pusta lista). Po sklejeniu awaria odczytu wygląda
// dokładnie tak samo jak brak werdyktów — czyli produkt mówi zawodnikowi
// „nie odbyłeś nic", nie wiedząc tego (Z0).
{
  const sekcja = sekcjaWejscTygodnia();

  check('(B5-4) sekcja wejść tygodnia i licznika jest oznaczona znacznikami i daje się wyciąć',
    sekcja !== null && sekcja.length > 200,
    sekcja === null
      ? 'nie znalazłem znaczników „WEJŚCIA TYGODNIA I LICZNIKA — POCZĄTEK/KONIEC"'
      : `sekcja=${sekcja.length}B`);

  check('(B5-4) ⛔ ZERO `?? []` i `|| []` w sekcji wejść tygodnia i licznika',
    sekcja !== null && !/\?\?\s*\[\s*\]/.test(sekcja) && !/\|\|\s*\[\s*\]/.test(sekcja),
    'wejście dostało pustą listę zamiast stanu „nie odczytałem" — '
    + 'trzy stany `czytajWerdykty` znikają wtedy w całości i CICHO');

  check('(B5-4) werdykty przechodzą przez `czytajWerdykty`, a nie przez surowe `.data`',
    /czytajWerdykty\(\s*\{\s*dane:\s*werdyktyRes\.data\s*,\s*blad:\s*werdyktyRes\.error\s*\}\s*\)/.test(dzis),
    'ekran czyta `session_verdicts` z pominięciem funkcji, która rozróżnia trzy stany');

  // Wejście tygodnia musi mieć stan „nie odczytałem" ODRÓŻNIALNY od pustej
  // listy — czyli `null`, a nie `[]`.
  check('(B5-4) nieudany odczyt wydarzeń tygodnia daje `null`, a nie pustą listę',
    sekcja !== null
    && /wydarzeniaTygodnia[\s\S]{0,200}?\?\s*null/.test(sekcja),
    'awaria odczytu wydarzeń jest nieodróżnialna od „nic nie masz w tym tygodniu"');

  // ⛔ `zbudujTydzien` i `policzWykonanaPrace` MUSZĄ dostać werdykty. Wołanie
  // ich bez tego pola jest ciche: `WERDYKTY_NIEPODANE` zachowuje się jak
  // „brak", więc ekran wygląda poprawnie i po prostu nigdy nie widzi werdyktu.
  check('(B5-4) ⭐ obie funkcje dostają werdykty — inaczej werdykt zawodnika nie ma jak dojść na ekran',
    (argumentyWywolania(dzis, 'zbudujTydzien')[0] ?? []).join(',').includes('werdykty')
    && (argumentyWywolania(dzis, 'policzWykonanaPrace')[0] ?? []).join(',').includes('werdykty'),
    'któraś z funkcji jest wołana bez pola `werdykty` — pominięcie daje '
    + '`WERDYKTY_NIEPODANE`, czyli ciche „brak"');
}

// ═══════════════════════════════════════════════════════════════════
// (B5-5) ⭐ LICZBA I ZDANIE `brak_podstawy` SĄ NARYSOWANE
// ═══════════════════════════════════════════════════════════════════
// ⛔ BEZ TEJ SEKCJI CZTERY POWYŻSZE SĄ SPEŁNIALNE PRZEZ KOD, KTÓRY WOŁA OBIE
// FUNKCJE I NIC NIE RENDERUJE. Strażnik świeciłby wtedy na zielono przy
// ekranie, na którym zawodnik nie widzi ani liczby, ani zdania — czyli
// nagradzałby dokładnie ten stan, który ten pas likwiduje (O58: reguła, która
// żyje wyłącznie w `lib/`, nie jest obietnicą spełnioną).
{
  // ⚠️ LICZYMY WYSTĄPIENIA, NIE DOPASOWUJEMY KSZTAŁTU JSX. Pierwsza wersja tej
  // asercji szukała dosłownie `{renderTydzienNaKarcie()}` i ZAPALIŁA SIĘ NA
  // POPRAWNYM KODZIE (zmierzone 15.08.2026): wywołanie stoi w gałęzi `else`
  // wyrażenia warunkowego, czyli w nawiasach okrągłych, nie klamrowych.
  // Strażnik, który zapala się na poprawnym kodzie, zostaje wyciszony przy
  // pierwszej okazji — i wtedy przestaje pilnować czegokolwiek.
  // `nazwa()` z pustymi nawiasami występuje raz w definicji; każde następne
  // wystąpienie JEST wywołaniem, niezależnie od tego, jak owinięte.
  const ilePolan = (nazwa: string) => (dzis.match(new RegExp(`${nazwa}\\(\\)`, 'g')) || []).length;

  check('(B5-5) ⭐ render licznika jest WOŁANY, a nie tylko zdefiniowany',
    ilePolan('renderLicznikPracy') >= 2,
    `wystąpień \`renderLicznikPracy()\`: ${ilePolan('renderLicznikPracy')} `
    + '(1 = sama definicja, czyli nikt jej nie woła i liczba nie trafia na ekran)');

  check('(B5-5) ⭐ render tygodnia jest WOŁANY, a nie tylko zdefiniowany',
    ilePolan('renderTydzienNaKarcie') >= 2,
    `wystąpień \`renderTydzienNaKarcie()\`: ${ilePolan('renderTydzienNaKarcie')} `
    + '(1 = sama definicja, czyli przełącznik nie ma czego pokazać)');

  const cialoLicznika = cialoFunkcji(dzis, 'renderLicznikPracy');

  check('(B5-5) ⭐ LICZBA jest w elemencie `<Text>`, nie tylko policzona',
    cialoLicznika !== null
    && /<Text[^>]*>\s*\{?\s*LICZNIK_POLICZONY\(/.test(cialoLicznika),
    'wynik `policzony` nigdzie nie wchodzi do `<Text>` — licznik jest liczony i wyrzucany');

  check('(B5-5) ⭐ ZDANIE `brak_podstawy` jest w elemencie `<Text>`, nie tylko policzone',
    cialoLicznika !== null
    && /<Text[^>]*>\s*\{?\s*LICZNIK_BRAK_PODSTAWY\(/.test(cialoLicznika),
    'stan „nie wiem, ile odbyłeś" nigdzie nie wchodzi do `<Text>` — zawodnik zobaczy pustkę');

  // ⛔ Wyjście wcześniejsze niż render zdania zamieniłoby `brak_podstawy`
  // w ciszę — a cisza wygląda jak „licznika nie ma", a nie jak „nie wiem".
  check('(B5-5) ⛔ `brak_podstawy` NIE jest wyciszany wcześniejszym `return null`',
    cialoLicznika !== null
    && !/rodzaj\s*!==\s*'policzony'[\s\S]{0,80}?return\s+null/.test(cialoLicznika)
    && !/rodzaj\s*===\s*'brak_podstawy'[\s\S]{0,80}?return\s+null/.test(cialoLicznika),
    'ekran chowa stan „brak podstawy" zamiast go pokazać — cisza wygląda jak brak funkcji');

  // ⭐ WT-02 — przełącznik jest na ekranie, ma OBIE etykiety i domyślnie „Dziś".
  check('(B5-5) ⭐ WT-02 — przełącznik Dziś / Tydzień jest narysowany, obie etykiety',
    /KARTA_ZAKRES_DZIS/.test(dzis) && /KARTA_ZAKRES_TYDZIEN/.test(dzis)
    && /setZakresKarty\(\s*'dzis'\s*\)/.test(dzis)
    && /setZakresKarty\(\s*'tydzien'\s*\)/.test(dzis),
    'przełącznika nie ma na ekranie albo brakuje jednej z dwóch stron');

  check('(B5-5) ⭐ przełącznik startuje na „Dziś" — tydzień jest rozwinięciem, nie zamianą',
    /useState<\s*'dzis'\s*\|\s*'tydzien'\s*>\(\s*'dzis'\s*\)/.test(dzis),
    'karta otwiera się na tygodniu — przestaje odpowiadać na pytanie „co mam dzisiaj"');

  // ⭐ WT-17 — plakietka stanu bierze się z JEDNEJ tabeli, tej samej co
  // w Kalendarzu. Druga kopia znaczy dwa ekrany mówiące co innego o tym
  // samym wystąpieniu.
  check('(B5-5) ⭐ WT-17 — plakietka stanu bierze się z `PLAKIETKI_STANU_PRZESZLEGO`, nie z własnej tabeli',
    /PLAKIETKI_STANU_PRZESZLEGO\[/.test(dzis)
    && !/'Nie wykonano'/.test(dzis)
    && !/'Wykonano'/.test(dzis),
    'ekran ma własne brzmienia stanów albo wróciło „Nie wykonano" — oskarżenie postawione '
    + 'na podstawie braku danych');

  // ⛔ WT-34 — na tym ekranie nie ma siatki godzinowej i ten pas jej nie dokłada.
  check('(B5-5) ⛔ WT-34 NIETKNIĘTA — karta nie dokłada siatki godzinowej',
    !/godzinyDnia|siatkaGodzin|hourGrid|HOURS\s*=/.test(dzis)
    && !/for\s*\(\s*let\s+h\s*=\s*0\s*;\s*h\s*<\s*24/.test(dzis),
    'na karcie pojawiła się siatka godzin — WT-34 była spełniona i ten pas nie ma prawa jej zgasić');

  // ⛔ §10 pkt 3 polecenia — „Dziś" CZYTA werdykty, nie zapisuje ich.
  check('(B5-5) ⛔ ekran „Dziś" NIE ZAPISUJE werdyktów — zapis mieszka w Kalendarzu',
    !/from\(\s*'session_verdicts'\s*\)\s*\.\s*(insert|upsert|update|delete)/.test(dzis)
    && !/session_verdicts[\s\S]{0,120}?\.(insert|upsert|update|delete)\(/.test(dzis),
    'ekran zapisuje werdykt — dwa miejsca zapisu to dwa źródła prawdy o tym samym wystąpieniu');
}

// ═══════════════════════════════════════════════════════════════════
// OBA STANY LICZNIKA SĄ OSIĄGALNE — na PRAWDZIWYCH funkcjach
// ═══════════════════════════════════════════════════════════════════
// ⚠️ Po co, skoro strażnik D1 ma 84 asercje na tę funkcję: asercje wyżej
// pilnują, że ekran rysuje OBA stany. Są warte tyle, ile prawda o tym, że oba
// stany naprawdę powstają z danych, które ten ekran podaje — a ten ekran
// podaje wystąpienia zbudowane z `zbudujTydzien`, czego strażnik D1 nie widzi.
// To jest jedyne miejsce, w którym oba pasy się spotykają.
{
  const DZIS = '2026-08-15';
  const wydarzenia: WierszWydarzenia[] = [
    { id: 1, title: 'Trening klubowy', event_type: 'club_training', status: 'scheduled', scheduled_date: '2026-08-11', scheduled_time: null, recurrence_rule: null, source: 'player' },
    { id: 2, title: 'Sesja Bloku', event_type: 'micro_session', status: 'cancelled', scheduled_date: '2026-08-12', scheduled_time: null, recurrence_rule: null, source: 'system' },
    { id: 3, title: 'Mecz', event_type: 'match', status: 'completed', scheduled_date: '2026-08-13', scheduled_time: '11:00', recurrence_rule: null, source: 'coach' },
  ];
  const tydzien = zbudujTydzien({
    poniedzialek: '2026-08-10',
    dzisiaj: DZIS,
    wydarzenia,
    planLekcji: null,
    wpisyDziennika: new Set<number>(),
    werdykty: czytajWerdykty({ dane: [], blad: null }),
  });

  check('tydzień z tych danych ma SIEDEM wierszy dnia, także pustych',
    tydzien.dni.length === 7,
    `dni=${tydzien.dni.length}`);

  const statusy = new Map(wydarzenia.map((w) => [w.id, w.status]));
  const wystapienia: WystapienieDoLicznika[] = tydzien.dni.flatMap((d) => d.pozycje.map((p) => ({
    idWydarzenia: p.id,
    dzien: p.dzien,
    status: statusy.get(p.id) ?? '',
    zRegulyCyklicznej: p.zRegulyCyklicznej,
  })));

  check('⭐ pozycje tygodnia niosą DATĘ WYSTĄPIENIA — bez niej licznik nie ma czego liczyć',
    wystapienia.length === 3 && wystapienia.every((w) => /^\d{4}-\d{2}-\d{2}$/.test(w.dzien)),
    JSON.stringify(wystapienia));

  const policzony = policzWykonanaPrace({
    dzis: DZIS,
    oknoDni: 14,
    wystapienia,
    wpisyDziennika: new Set<number>(),
    werdykty: czytajWerdykty({ dane: [], blad: null }),
  });
  check('⭐ STAN `policzony` JEST OSIĄGALNY z wystąpień zbudowanych przez `zbudujTydzien`',
    policzony.rodzaj === 'policzony',
    JSON.stringify(policzony));
  check('⭐ …i „bez wpisu" NIE WCHODZI do mianownika — 1 z 2, a nie 1 z 3',
    policzony.rodzaj === 'policzony'
    && policzony.odbyte === 1 && policzony.nieodbyte === 1
    && policzony.mianownik === 2 && policzony.bezWpisu === 1,
    JSON.stringify(policzony));

  // Ten sam tydzień, ale bez odwołania i bez `completed` — same pozycje bez
  // dowodu. ⭐ Wynik MA BYĆ `brak_podstawy`, a nie „0 z 1".
  const tydzienBezDowodu = zbudujTydzien({
    poniedzialek: '2026-08-10',
    dzisiaj: DZIS,
    wydarzenia: [wydarzenia[0]],
    planLekcji: null,
    wpisyDziennika: new Set<number>(),
    werdykty: czytajWerdykty({ dane: [], blad: null }),
  });
  const brak = policzWykonanaPrace({
    dzis: DZIS,
    oknoDni: 14,
    wystapienia: tydzienBezDowodu.dni.flatMap((d) => d.pozycje.map((p) => ({
      idWydarzenia: p.id, dzien: p.dzien, status: 'scheduled', zRegulyCyklicznej: p.zRegulyCyklicznej,
    }))),
    wpisyDziennika: new Set<number>(),
    werdykty: czytajWerdykty({ dane: [], blad: null }),
  });
  check('⭐ STAN `brak_podstawy` JEST OSIĄGALNY — sesja bez dowodu to NIE „0 z 1"',
    brak.rodzaj === 'brak_podstawy' && brak.bezWpisu === 1,
    JSON.stringify(brak));
  check('⭐ ⛔ kształt `brak_podstawy` NIE MA pól, z których dałoby się narysować „0 z 0"',
    brak.rodzaj === 'brak_podstawy'
    && !('odbyte' in brak) && !('mianownik' in brak),
    JSON.stringify(Object.keys(brak)));

  // Cztery plakietki są CZTEREMA różnymi napisami — inaczej WT-17 pokazuje
  // ten sam tekst dla „Zrobione" i dla „Bez wpisu".
  const napisy = Object.values(PLAKIETKI_WYKONANIA);
  check('WT-17 — cztery stany mają CZTERY różne plakietki',
    new Set(napisy).size === 4,
    JSON.stringify(napisy));
}

// ═══════════════════════════════════════════════════════════════════
// PLIK, KTÓRY TEN STRAŻNIK CZYTA, NAPRAWDĘ ZAWIERA BADANĄ LOGIKĘ
// ═══════════════════════════════════════════════════════════════════
// Bez tego część asercji przechodziłaby, nie sprawdzając niczego — plik
// istnieje, tylko nie ma już w nim tego, czego pilnujemy.
{
  check('`dzis.tsx` istnieje, importuje obie czyste funkcje i zawiera badaną logikę',
    dzisSurowe.length > 90_000
    && /from '\.\.\/\.\.\/lib\/widokTygodnia'/.test(dzis)
    && /from '\.\.\/\.\.\/lib\/wykonanieSesji'/.test(dzis)
    && dzis.includes('renderLicznikPracy') && dzis.includes('renderTydzienNaKarcie'),
    `dzis=${dzisSurowe.length}B surowo, ${dzis.length}B bez komentarzy`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
