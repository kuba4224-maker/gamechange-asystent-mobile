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

import { readFileSync, readdirSync } from 'node:fs';
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

// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-S2 18.08.2026 — DRUGI PLIK, KTÓRY TEN STRAŻNIK OD DZIŚ CZYTA.
//
// GDZIE BYŁO: `app/(tabs)/dzis.tsx` — licznik pracy, praca we wszystkich
// Blokach i trzeci stan postępu Bloku stały tam do 18.08.2026 rano.
// GDZIE JEST: `components/PracaWLiczbach.tsx`, montowany przez
// `components/ArkuszeProfilu.tsx` w pozycji „Skąd to wiemy" ekranu „Profil".
// DLACZEGO: pas A1 przebudował ekran „Dziś" do makiety v3 i zdjął z niego trzy
// bloki, ale WYWOŁANIA zostały — produkt liczył wszystkie trzy rzeczy i nie
// rysował ani jednej (dokładnie stan zakazany przez (F1-2)). Ekran „Dziś" ma
// 807 dp przy zgięciu 808, więc jedynym miejscem z zapasem był arkusz Profilu,
// montowany POZA `ScrollView`, czyli za 0 dp.
//
// ⛔ REGUŁY SĄ TE SAME CO DO ZNAKU. Zmieniło się WYŁĄCZNIE, którego pliku
// strażnik o nie pyta — i pyta go tak samo ostro: na wyciętych instrukcjach,
// na równość, bez ani jednego `>= 1`.
// ═══════════════════════════════════════════════════════════════════
const PLIK_PRACA = 'components/PracaWLiczbach.tsx';
const pracaSurowe = readFileSync(join(root, PLIK_PRACA), 'utf8');
const praca = bezKomentarzy(pracaSurowe);

/** Arkusze Profilu — jedyne miejsce, z którego blok wchodzi na ekran. */
const PLIK_ARKUSZE = 'components/ArkuszeProfilu.tsx';
const arkusze = bezKomentarzy(readFileSync(join(root, PLIK_ARKUSZE), 'utf8'));

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
  // ⭐ PRZECELOWANE 18.08.2026 (pas S2) — REGUŁA TA SAMA, PLIK INNY.
  // GDZIE PYTAŁA: `app/(tabs)/dzis.tsx`. GDZIE PYTA: `components/PracaWLiczbach.tsx`.
  // DLACZEGO: pas A1 zdjął z ekranu „Dziś" render licznika, a wywołanie zostało
  // — liczba szła do `console.log`. Od 18.08 licznik liczy się TAM, GDZIE się
  // rysuje, więc jednym ruchem nie da się już zdjąć widza bez zdjęcia liczby.
  // ⛔ RÓWNIE MOCNA: warunek co do znaku ten sam, plik jest JEDYNYM konsumentem.
  check('(B5-2) blok „praca w liczbach" woła `policzWykonanaPrace`',
    /\bpoliczWykonanaPrace\(/.test(praca)
    && !/\bpoliczWykonanaPrace\(/.test(dzis),
    'licznik pracy pasa D1 (84 asercje) znowu nie ma ani jednego konsumenta '
    + '(albo wrócił na ekran „Dziś", który go nie rysuje — wtedy znowu liczy dla nikogo)');

  const wywolaniaLicznika = argumentyWywolania(praca, 'policzWykonanaPrace');
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
  // ⭐ PRZECELOWANE 18.08.2026 (pas S2): memo licznika mieszka od dziś
  // w `components/PracaWLiczbach.tsx`. Kształt sprawdzany co do znaku ten sam.
  const memoLicznika = cialoMemo(praca, 'licznik');
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
// ⭐ PRZECELOWANE 18.08.2026 (pas S2) — cała ta piątka pyta od dziś
// `components/PracaWLiczbach.tsx` zamiast `app/(tabs)/dzis.tsx`. Reguły
// nietknięte co do znaku; zmieniło się miejsce, w którym licznik jest rysowany.
{
  const cialoLicznika = cialoFunkcji(praca, 'renderLicznikPracy');

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
    !/LICZNIK_BRAK_PODSTAWY\s*=\s*\([^)]*\)\s*=>[\s\S]{0,600}?\$\{[^}]*\}\s*z\s*\$\{/.test(praca),
    'stała `brak_podstawy` buduje zdanie w kształcie pomiaru');

  // ⛔ ZAPADKA NA JEDNĄ KOPIĘ BRZMIEŃ (pas S2, 18.08.2026). Do dziś rano te
  // same stałe stały W DWÓCH plikach: żywa kopia nigdzie i martwa w `dzis.tsx`.
  // Dwie kopie brzmienia rozjeżdżają się przy pierwszej poprawce, a każda
  // z osobna wygląda poprawnie.
  check('(B5-3) ⛔ brzmienia licznika mają DOKŁADNIE JEDNĄ kopię w produkcie',
    /LICZNIK_POLICZONY\s*=/.test(praca) && !/LICZNIK_POLICZONY/.test(dzis),
    'brzmienie licznika istnieje w dwóch miejscach albo zniknęło z tego, które je rysuje');

  // ⛔ WG-28 wymaga JAWNEGO „bez wpisu". Jawne znaczy: własne zdanie, nie
  // milczenie i nie doliczenie do mianownika.
  check('(B5-3) WG-28 — „bez wpisu" ma własne, jawne zdanie',
    /LICZNIK_BEZ_WPISU\s*=/.test(praca) && cialoLicznika !== null
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
  // ⭐ PRZECELOWANE 18.08.2026 (pas S2) — DWA PLIKI ZAMIAST JEDNEGO, i to jest
  // MOCNIEJSZE niż suma po produkcie: `zbudujTydzien` musi dostać werdykty
  // w OBU miejscach, w których stoi (karta „Dziś" i blok pracy na „Profilu"),
  // a licznik tam, gdzie się liczy. Pominięcie pola daje `WERDYKTY_NIEPODANE`,
  // czyli ciche „brak" — i wygląda dokładnie jak poprawny kod.
  check('(B5-4) ⭐ obie funkcje dostają werdykty — inaczej werdykt zawodnika nie ma jak dojść na ekran',
    (argumentyWywolania(dzis, 'zbudujTydzien')[0] ?? []).join(',').includes('werdykty')
    && (argumentyWywolania(praca, 'zbudujTydzien')[0] ?? []).join(',').includes('werdykty')
    && (argumentyWywolania(praca, 'policzWykonanaPrace')[0] ?? []).join(',').includes('werdykty'),
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
  const ilePolanW = (src: string, nazwa: string) =>
    (src.match(new RegExp(`${nazwa}\\(\\)`, 'g')) || []).length;

  // ⭐ PRZECELOWANE 18.08.2026 (pas S2) — I WZMOCNIONE O DRUGI WARUNEK.
  // GDZIE PYTAŁA: `dzis.tsx`. GDZIE PYTA: `components/PracaWLiczbach.tsx`
  // (render jest wołany) ORAZ `components/ArkuszeProfilu.tsx` (sam blok jest
  // NAPRAWDĘ montowany w pozycji „Skąd to wiemy"). ⛔ Sam render wołany
  // wewnątrz komponentu, którego nikt nie montuje, jest tą samą pustką co
  // przed przeprowadzką — dlatego warunki są dwa, nie jeden.
  check('(B5-5) ⭐ render licznika jest WOŁANY, a nie tylko zdefiniowany',
    ilePolanW(praca, 'renderLicznikPracy') >= 2
    && /<PracaWLiczbach\b/.test(arkusze)
    && arkusze.indexOf('<PracaWLiczbach') > arkusze.indexOf("props.otwarty === 'skad'"),
    `wystąpień \`renderLicznikPracy()\`: ${ilePolanW(praca, 'renderLicznikPracy')} `
    + '(1 = sama definicja, czyli nikt jej nie woła i liczba nie trafia na ekran) · '
    + `montaż bloku w arkuszu „Skąd to wiemy": ${/<PracaWLiczbach\b/.test(arkusze)}`);

  check('(B5-5) ⭐ render tygodnia jest WOŁANY, a nie tylko zdefiniowany',
    ilePolan('renderTydzienNaKarcie') >= 2,
    `wystąpień \`renderTydzienNaKarcie()\`: ${ilePolan('renderTydzienNaKarcie')} `
    + '(1 = sama definicja, czyli przełącznik nie ma czego pokazać)');

  const cialoLicznika = cialoFunkcji(praca, 'renderLicznikPracy');

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

  // ═════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-D2 15.08.2026 — TA ASERCJA ZOSTAŁA ODWRÓCONA DECYZJĄ KUBY.
  // ═════════════════════════════════════════════════════════════════
  //
  // DO 15.08.2026 STAŁO TU:
  //
  //   check('(B5-5) ⛔ ekran „Dziś" NIE ZAPISUJE werdyktów — zapis mieszka
  //          w Kalendarzu',
  //     !/from\(\s*'session_verdicts'\s*\)\s*\.\s*(insert|upsert|update|delete)/…)
  //
  // ⚠️ TO NIE JEST WYCISZENIE STRAŻNIKA I NIE JEST ODKRYCIEM DEFEKTU W PASIE
  // B5. Tamta asercja była poprawnym zapisem decyzji, która obowiązywała
  // 15.08 rano: jedno miejsce zapisu, w Kalendarzu. Decyzja zmieniła się na
  // podstawie POMIARU — przycisk „Nie odbyłem" stoi w Kalendarzu od 14.08
  // i ma ZERO użyć, a `session_verdicts` ma ZERO wierszy. Produkt, który
  // czeka, aż zawodnik sam wejdzie do Kalendarza, czekał dobę i się nie
  // doczekał. Kuba rozstrzygnął: karta „Dziś" PYTA SAMA.
  //
  // ⭐ I DLATEGO ASERCJA NIE ZNIKA, TYLKO SIĘ ZAOSTRZA. Powód pierwotnego
  // zakazu — „dwa miejsca zapisu to dwa źródła prawdy" — NIE PRZESTAŁ
  // obowiązywać; przestało obowiązywać wyłącznie to, że miejsc ma być jedno.
  // Zamiast liczby miejsc pilnujemy dziś tego, co naprawdę było stawką:
  //
  //   1. ⭐ OBA miejsca piszą TYM SAMYM kształtem (`upsert` + `onConflict`
  //      na parze `(calendar_event_id, occurred_on)` + `withdrawn_at: null`).
  //      Dwa RÓŻNE kształty zapisu to dopiero są dwa źródła prawdy: jedno
  //      z nich wywróciłoby się na `23505` po „Cofnij", drugie nie.
  //   2. ⭐ OBA sprawdzają LICZBĘ ZWRÓCONYCH WIERSZY (O61), a nie brak błędu.
  //   3. ⛔ ŻADNE nie zapisuje `odbylo_sie` na sztywno, bez dotknięcia
  //      zawodnika — wartość werdyktu jest wszędzie ZMIENNĄ.
  //
  // ⚠️ To jest dokładnie ten wzorzec, który pas F1 zmierzył w `pustkaWCalymRepo`
  // (nota F1 §6.1) i który stoi w `STAN_DELEGACJI` jako **O73**: asercja
  // pilnująca LICZBY zapala się na sukcesie następnego pasa. Lekarstwo jest
  // to samo — pilnować REGUŁY, nie licznika.
  const zapisWDzis = (() => {
    const od = dzis.indexOf('async function odpowiedzNaWystapienie');
    if (od < 0) return '';
    const doKad = dzis.indexOf('\n  }', od);
    return doKad < 0 ? dzis.slice(od) : dzis.slice(od, doKad + 4);
  })();
  const kalendarzZrodlo = readFileSync(join(root, 'app', '(tabs)', 'kalendarz.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const zapisWKalendarzu = (() => {
    const od = kalendarzZrodlo.indexOf('async function oznaczNieodbyte');
    if (od < 0) return '';
    const doKad = kalendarzZrodlo.indexOf('\n  }', od);
    return doKad < 0 ? kalendarzZrodlo.slice(od) : kalendarzZrodlo.slice(od, doKad + 4);
  })();

  check('(B5-5 → D2) ⭐ OBA miejsca zapisu werdyktu istnieją: karta „Dziś" pyta sama, '
    + 'Kalendarz zostaje dla porządkowania tygodnia wstecz',
    zapisWDzis !== '' && zapisWKalendarzu !== '',
    `dzis=${zapisWDzis.length}B, kalendarz=${zapisWKalendarzu.length}B`);

  check('(B5-5 → D2) ⭐ OBA piszą TYM SAMYM kształtem — `upsert` po parze '
    + '`(calendar_event_id, occurred_on)` z `withdrawn_at: null`',
    [zapisWDzis, zapisWKalendarzu].every((k) => /\.upsert\(/.test(k)
      && /onConflict: 'calendar_event_id,occurred_on'/.test(k)
      && /withdrawn_at: null/.test(k)),
    'dwa RÓŻNE kształty zapisu tego samego wystąpienia — jedno z nich wywróci się na `23505`');

  check('(B5-5 → D2) ⭐ OBA traktują ZERO ZWRÓCONYCH WIERSZY jako porażkę (O61)',
    [zapisWDzis, zapisWKalendarzu].every((k) => /\.select\('id'\)/.test(k)
      && /length === 0/.test(k)),
    'zapis odrzucony przez RLS zostanie pokazany zawodnikowi jako sukces');

  check('(B5-5 → D2) ⛔ ŻADNE z dwóch miejsc nie zapisuje `odbylo_sie` bez dotknięcia '
    + 'zawodnika — wartość werdyktu jest zmienną, nie literałem',
    !/verdict: 'odbylo_sie'/.test(dzis) && !/verdict: 'odbylo_sie'/.test(kalendarzZrodlo),
    'produkt może uznać sesję za odbytą sam z siebie');

  // ⛔ …i pilnujemy, że TRZECIEGO miejsca nie ma. Zapadka na RÓWNOŚĆ (O73),
  // z katalogiem ODKRYWANYM (O69) — lista na sztywno kłamałaby na zielono.
  const ekranyZapisujace = readdirSync(join(root, 'app', '(tabs)'))
    .filter((f) => f.endsWith('.tsx'))
    .filter((f) => /\.from\('session_verdicts'\)[\s\S]{0,400}?(upsert|insert|update)\(/
      .test(readFileSync(join(root, 'app', '(tabs)', f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')))
    .sort();
  check('(B5-5 → D2) ⛔ DOKŁADNIE DWA ekrany zapisują werdykt — ani jednego więcej',
    ekranyZapisujace.join(',') === 'dzis.tsx,kalendarz.tsx',
    `znalezione: ${ekranyZapisujace.join(', ') || 'brak'}`);
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

  // Plakietki są RÓŻNYMI napisami — inaczej WT-17 pokazuje ten sam tekst
  // dla „Zrobione" i dla „Bez wpisu".
  // ⚠️ PLAN-D-K1 16.08.2026 — stanów jest PIĘĆ (doszło `odwolane`).
  const napisy = Object.values(PLAKIETKI_WYKONANIA);
  check('WT-17 — pięć stanów ma PIĘĆ różnych plakietek',
    new Set(napisy).size === 5,
    JSON.stringify(napisy));
}

// ╔═══════════════════════════════════════════════════════════════════╗
// ║  ⭐ PLAN-D-F1 08.2026 (15.08.2026) — SILNIK MA TRAFIĆ NA EKRAN     ║
// ╚═══════════════════════════════════════════════════════════════════╝
//
// ── PO CO TA CZĘŚĆ ISTNIEJE — to jest choroba, nie jeden defekt ──────
//
// Rejestr obietnic niósł 15.08.2026 **32 pozycje w stanie „KOD GOTOWY"**:
// zbudowane, sprawdzone asercjami i NIEWIDOCZNE dla zawodnika. Pas E2 dołożył
// tego dnia dwie kolejne i sam to nazwał: *„druga liczba tego pasa też bez
// konsumenta — wzorzec, nie przypadek"*.
//
//   • `computeFocusBlockProgressState` (pas A1, 14.08) — trzeci stan licznika
//     Bloku. Komentarz w `lib/focusBlockProgress.ts` mówił wprost, że podmiana
//     wywołania „jest KONTRAKTEM dla pasa T". Kontrakt stał niewykonany dobę,
//     a zawodnik `8d7e1ebb…` czytał przez ten czas „0 z 12 sesji zrobione" —
//     zdanie nieprawdziwe (`daily_logs.calendar_event_id`: 0 z 10);
//   • `policzPraceWeWszystkichBlokach` (pas E2, 15.08) — jedyna liczba
//     w appce, której nie kasuje domknięcie Bloku. Zero konsumentów.
//
// Pas F1 podpiął obie. ⚠️ ALE SAMO PODPIĘCIE NIE JEST OBRONĄ: następna sesja
// może je odpiąć jednym `return null`, a suita nadal będzie zielona. Dlatego
// niżej stoi para asercji, której wcześniej w tym repozytorium nie było:
//
//   (F1-1) obie liczby MAJĄ konsumenta w `dzis.tsx` i obie trafiają do <Text>;
//   (F1-2) ⭐ ASERCJA ODWROTNA — w `lib/` NIE MA funkcji liczącej pracę,
//          której nikt nie woła. Ta druga jest ważniejsza, bo (F1-1) pilnuje
//          DWÓCH ZNANYCH liczb, a (F1-2) złapie NASTĘPNĄ, o której dziś nikt
//          nie wie. To jest strażnik przeciwko wzorcowi, nie przeciwko dwóm
//          jego wystąpieniom.
//
// ⚠️ O71 — CZEGO TA CZĘŚĆ ŚWIADOMIE NIE ROBI. Asercja szukająca frazy
// w CAŁYM pliku nie pilnuje jej w JEDNEJ instrukcji: `dzis.tsx` ma 3 100 linii
// i prawie każda fraza gdzieś w nim jest. Pas E1 zmierzył, że dwie mutacje
// pasa C3b przestały cokolwiek łapać po naprawie i świeciły na zielono.
// Dlatego niżej wycinane są KONKRETNE instrukcje: ciało `renderPracaWBlokach`,
// gałąź `WIADOMO` i gałąź `NIE_WIEM` kafelka — i pytanie zadawane jest im,
// a nie plikowi. Jedynym wyjątkiem jest (F1-4), gdzie polecenie WYMAGA
// asercji na tekst całego pliku, i ma rację: zakazu N1 nie da się spełnić
// lokalnie.

const PLIK_PROFIL = 'app/(tabs)/profil.tsx';
const profilSurowe = readFileSync(join(root, PLIK_PROFIL), 'utf8');

/**
 * Gałąź „then" wyrażenia `{ warunek ? ( … ) : null }`, wycięta przez
 * dopasowanie nawiasów od pierwszego `? (` po `igla`.
 * ⚠️ Po co, skoro jest `blokOd`: gałęzie JSX stoją w nawiasach OKRĄGŁYCH,
 * nie klamrowych — ta sama pułapka, na której zapaliła się pierwsza wersja
 * asercji (B5-5) na poprawnym kodzie.
 */
function galazJsx(src: string, igla: string): string | null {
  const od = src.indexOf(igla);
  if (od < 0) return null;
  const pyt = src.indexOf('?', od + igla.length);
  if (pyt < 0) return null;
  const start = src.indexOf('(', pyt);
  if (start < 0) return null;
  let glebokosc = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '(') glebokosc++;
    else if (src[i] === ')') {
      glebokosc--;
      if (glebokosc === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Ciało `export function <nazwa>(…)` — do asercji odwrotnej (F1-2).
 *
 * ⚠️ NIE MOŻNA TU UŻYĆ SAMEGO `blokOd`, i to nie jest drobiazg: `blokOd` bierze
 * PIERWSZY `{` po nazwie, a w tym repozytorium prawie każda czysta funkcja ma
 * podpis `nazwa(params: { … })`. Pierwsza wersja tej funkcji wycinała więc TYP
 * ARGUMENTU zamiast ciała — i asercja odwrotna oskarżyła
 * `computeFocusBlockProgress` o brak konsumenta, choć woła je
 * `computeFocusBlockProgressState` trzy linie niżej. Strażnik oskarżający
 * poprawny kod zostaje wyciszony przy pierwszej okazji; ta poprawka jest
 * powodem, dla którego niżej stoi próbka „detektor MILCZY, gdy funkcja ma
 * konsumenta". Najpierw domykamy NAWIASY OKRĄGŁE podpisu, potem szukamy `{`.
 */
function cialoEksportu(src: string, nazwa: string): string | null {
  const igla = `export function ${nazwa}(`;
  const od = src.indexOf(igla);
  if (od < 0) return null;
  let glebokosc = 1;
  let i = od + igla.length;
  for (; i < src.length && glebokosc > 0; i++) {
    if (src[i] === '(') glebokosc++;
    else if (src[i] === ')') glebokosc--;
  }
  return glebokosc === 0 ? blokOd(src, i) : null;
}

// ─────────────────────────────────────────────────────────────────────
// ⭐ (F1-2) DŁUG: funkcje liczące pracę, o których WIEMY, że nikt ich nie woła
// ─────────────────────────────────────────────────────────────────────
// ⚠️ Ta lista działa jak `DLUG_ZASTANY` w `lib/pustkaWCalymRepo.selftest.ts`:
// pozycja, która dostanie konsumenta, ZAPALA strażnika z poleceniem usunięcia
// jej stąd, a pozycja nowa zapala go z poleceniem podpięcia albo skasowania.
// Bez zapadki w obie strony „dług zgłoszony" jest miejscem, w którym da się
// przenocować dowolnie długo.
// ⚠️ PLAN-D-L1 17.08.2026 — POZYCJA `lib/sladZachowania.ts :: policzSlad`
// ZNIKŁA Z TEJ LISTY, BO ZNIKŁ PLIK. Nie została „naprawiona": pas L1 usunął
// `lib/sladZachowania.ts` razem z jego selftestem, po dowodzie zera importerów
// w całym repozytorium poza własnym selftestem. ⛔ To NIE JEST ciche wypadnięcie
// — co ten moduł liczył i co trzeba zrobić, żeby wrócił, stoi w nocie
// `claude/PRZEKAZANIE_PAS_L1_17_08_2026.md` (nagrobek, D7).
const SILNIKI_BEZ_EKRANU: { klucz: string; kto: string; dlaczego: string }[] = [
  {
    klucz: 'lib/obciazenieOstatnichDni.ts :: policzObciazenieWOknie',
    kto: 'Kuba — przebudowa architektury informacji, po niej podpięcie do ekranu (pas L1, 17.08.2026)',
    dlaczego: 'Silnik obciążenia ostatnich dni powstał w pasie L1 na decyzję Kuby (wariant A: '
      + 'obciążenie ostatnich 7 dni na pierwszym planie, dorobek całkowity niżej). ⛔ TEN SAM PAS '
      + 'MIAŁ JAWNY ZAKAZ dotykania tego, gdzie cokolwiek stoi na ekranie — Kuba przebudowuje '
      + 'właśnie architekturę informacji i każda zmiana układu poszłaby do kosza. Dlatego silnik '
      + 'jest zbudowany, zmierzony na żywych danych i NIEPODPIĘTY: świadomie i z datą. '
      + '⚠️ Pozycja wypada z tej listy w dniu, w którym ekran zacznie wołać '
      + '`policzObciazenieWOknie` — strażnik sam o tym powie.',
  },
];

const KLUCZE_SILNIKOW_BEZ_EKRANU = new Set(SILNIKI_BEZ_EKRANU.map((s) => s.klucz));

type ZasadyF1 = {
  dzis: string;
  profil: string;
  /**
   * ⭐ PLAN-D-S2 18.08.2026 — TRZECIE ŹRÓDŁO BATERII: `components/PracaWLiczbach.tsx`.
   * Dwie z trzech liczb pasa F1 (licznik pracy i praca w Blokach) oraz trzeci
   * stan postępu Bloku mieszkają od 18.08 tutaj, nie na ekranie „Dziś".
   * ⛔ Mutacje, które do 18.08 psuły `dzis`, psują od dziś TEN plik — inaczej
   * bateria mierzyłaby kod, w którym badanych rzeczy już nie ma.
   */
  praca: string;
  /** Arkusze Profilu — dowód, że blok jest MONTOWANY, a nie tylko napisany. */
  arkusze: string;
  /** `lib/<plik>.ts` → treść. Wstrzykiwane, żeby mutacja nie dotykała dysku. */
  zrodlaLib: Record<string, string>;
  /** `app/…` i `components/…` → treść. Konsumenci pierwszego rzędu. */
  zrodlaEkranow: Record<string, string>;
  dlugSilnikow: Set<string>;
};

/**
 * ⭐ Funkcje liczące pracę, DO KTÓRYCH NIE DA SIĘ DOJŚĆ Z ŻADNEGO EKRANU.
 *
 * Osiągalność jest PRZECHODNIA i to nie jest wyrafinowanie dla ozdoby:
 * `computeFocusBlockProgress` nie jest dziś wołane z żadnego ekranu, ale woła
 * je `computeFocusBlockProgressState`, które jest — więc jego wynik DOCIERA
 * do zawodnika. Asercja bez przechodniości oskarżałaby poprawny kod, a strażnik,
 * który zapala się na poprawnym kodzie, zostaje wyciszony przy pierwszej okazji.
 *
 * ⚠️ CZEGO TA FUNKCJA NIE UMIE, napisane wprost: nie rozumie aliasów importu
 * (`import { policzX as y }`), nie widzi wywołań przez zmienną
 * (`const f = policzX; f()`), i uznaje wystąpienie nazwy z nawiasem za
 * wywołanie. Wszystkie trzy dają FAŁSZYWE „ma konsumenta", nie odwrotnie —
 * czyli mylą się w stronę milczenia. To jest ta sama granica, którą zgłosił
 * detektor wzorca pustki w `lib/trzyPustki.ts`.
 */
function silnikiBezEkranu(z: ZasadyF1): { klucz: string; nazwa: string }[] {
  const NAZWA_LICZY_PRACE = /^(policz|compute)/;

  // 1. Wszystkie eksportowane funkcje liczące pracę, z ciałami.
  const funkcje: { klucz: string; plik: string; nazwa: string; cialo: string }[] = [];
  for (const [plik, src] of Object.entries(z.zrodlaLib)) {
    const re = /export\s+function\s+([A-Za-z0-9_]+)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const nazwa = m[1];
      if (!NAZWA_LICZY_PRACE.test(nazwa)) continue;
      funkcje.push({ klucz: `${plik} :: ${nazwa}`, plik, nazwa, cialo: cialoEksportu(src, nazwa) ?? '' });
    }
  }

  const wolaneW = (src: string, nazwa: string) => new RegExp(`\\b${nazwa}\\s*\\(`).test(src);

  // 2. Ziarno: wołane wprost z ekranu.
  const osiagalne = new Set<string>();
  for (const f of funkcje) {
    if (Object.values(z.zrodlaEkranow).some((src) => wolaneW(src, f.nazwa))) osiagalne.add(f.klucz);
  }

  // 3. Domknięcie przechodnie: wołane z ciała funkcji już osiągalnej.
  let rosnie = true;
  while (rosnie) {
    rosnie = false;
    for (const f of funkcje) {
      if (osiagalne.has(f.klucz)) continue;
      const wolaGoOsiagalny = funkcje.some((g) => osiagalne.has(g.klucz) && g.klucz !== f.klucz && wolaneW(g.cialo, f.nazwa));
      if (wolaGoOsiagalny) { osiagalne.add(f.klucz); rosnie = true; }
    }
  }

  return funkcje.filter((f) => !osiagalne.has(f.klucz)).map((f) => ({ klucz: f.klucz, nazwa: f.nazwa }));
}

type WynikF1 = { label: string; ok: boolean; detail: string };

function bateriaF1(z: ZasadyF1): WynikF1[] {
  const r: WynikF1[] = [];
  const zapisz = (label: string, ok: boolean, detail = '') => r.push({ label, ok, detail });

  // ⚠️ IGŁA MUSI BYĆ JEDNOZNACZNA. `workProgress.stan === 'NIE_WIEM'` występuje
  // w pliku bloku DWA razy: w `renderPostepBloku` i w `renderPracaWBlokach`
  // (warunek powodu). Pierwsza wersja tej asercji brała pierwsze wystąpienie
  // i pytała gałąź powodu o tytuł, którego tam nie ma — czyli zapalała się
  // na poprawnym kodzie.
  // ⭐ PLAN-D-S2 18.08.2026 — ROZWIĄZANE MOCNIEJ NIŻ DŁUŻSZĄ IGŁĄ: najpierw
  // WYCINAMY CIAŁO `renderPostepBloku`, potem szukamy gałęzi W NIM. Igła oparta
  // na drugim członie warunku (`widokDzis.pokazacPostepPracy`) trzymała się
  // przypadkowego sąsiedztwa; ta trzyma się funkcji, o którą naprawdę pytamy,
  // i nie da się jej ominąć przestawieniem kolejności bloków w pliku.
  const cialoPostepu = cialoFunkcji(z.praca, 'renderPostepBloku');
  const galazWiadomo = cialoPostepu === null
    ? null : galazJsx(cialoPostepu, "workProgress.stan === 'WIADOMO'");
  const galazNieWiem = cialoPostepu === null
    ? null : galazJsx(cialoPostepu, "workProgress.stan === 'NIE_WIEM'");
  const cialoPracy = cialoFunkcji(z.praca, 'renderPracaWBlokach');
  const ilePolan = (src: string, nazwa: string) => (src.match(new RegExp(`${nazwa}\\(\\)`, 'g')) || []).length;

  // ── P1 · PIERWSZA LICZBA MA KONSUMENTA I TRZECI STAN JEST NARYSOWANY ──
  // ⭐ PRZECELOWANE 18.08.2026 (pas S2) — OBA PLIKI NARAZ, i to jest MOCNIEJSZE
  // niż pytanie o jeden. `dzis.tsx` woła stan nadal (karmi `maAktywnyBlok`
  // w jednej odpowiedzi), a `PracaWLiczbach.tsx` woła go, bo go RYSUJE.
  // ⛔ Powrót do `computeFocusBlockProgress` zakazany W OBU.
  zapisz('⭐ (F1-1) OBA konsumenty wołają `computeFocusBlockProgressState`, a nie wersję bez trzeciego stanu',
    /\bcomputeFocusBlockProgressState\(/.test(z.dzis)
    && /\bcomputeFocusBlockProgressState\(/.test(z.praca)
    && !/\bsetWorkProgress\(\s*computeFocusBlockProgress\(/.test(z.dzis)
    && !/[^a-zA-Z]computeFocusBlockProgress\(/.test(z.praca),
    'któryś z ekranów wrócił do `computeFocusBlockProgress` — „nie wiemy, ile z M" '
    + 'znowu rysuje się jako „0 z M"');

  // ⭐ PRZECELOWANE 18.08.2026 (pas S2). GDZIE BYŁO: kafelek Celu na „Dziś".
  // GDZIE JEST: `renderPostepBloku` w bloku „praca w liczbach" na „Profilu".
  // DLACZEGO: makieta v3 nie ma kafla celu na ekranie 1, ale TRZECI STAN nie
  // dostał w żadnym dokumencie nowego miejsca — dostał je dziś.
  zapisz('⭐ (F1-1) stan `NIE_WIEM` NAPRAWDĘ trafia do `<Text>`, nie tylko jest policzony',
    galazNieWiem !== null && /<Text[^>]*>\s*\{?\s*NIE_WIEM_TYTUL\(/.test(galazNieWiem),
    galazNieWiem === null
      ? 'nie ma gałęzi `stan === \'NIE_WIEM\'` w `renderPostepBloku`'
      : `gałąź jest, ale nie rysuje tytułu: ${galazNieWiem.replace(/\s+/g, ' ').slice(0, 120)}`);

  // ⛔ O71 — TO JEST ASERCJA NA WYCIĘTĄ INSTRUKCJĘ, NIE NA PLIK. Pasek postępu
  // narysowany na 0% obok zdania „nie wiemy, ile się odbyło" jest tym samym
  // kłamstwem co „0 z 12", tylko narysowanym zamiast napisanym.
  zapisz('⛔ ⭐ (F1-1) pasek postępu rysuje się WYŁĄCZNIE przy `WIADOMO`',
    galazWiadomo !== null && /styles\.workFill/.test(galazWiadomo)
    && galazNieWiem !== null && !/styles\.workFill/.test(galazNieWiem),
    'pasek wjechał do gałęzi „nie wiemy" albo zniknął z gałęzi „wiadomo"');

  // ⭐ NOWA (pas S2, 18.08.2026) — TRZECI STAN NIE MA PRAWA BYĆ WYCISZONY.
  // ⛔ Powód, dla którego ta asercja musiała powstać RAZEM z przeprowadzką:
  // dwie siostrzane reguły („brak_podstawy" licznika i „nie_policzony" pracy
  // w Blokach) miały swoje anty-`return null` od pasów B5 i F1, a `NIE_WIEM`
  // NIE MIAŁ ŻADNEGO — bo do 18.08 mieszkał w gałęzi JSX, a nie w funkcji,
  // z której da się wyjść. Po przeprowadzce do `renderPostepBloku` ta droga
  // istnieje, więc musi mieć strażnika. Cisza przy „nie wiemy" wygląda
  // dokładnie jak brak funkcji — i jest gorsza, bo nie da się jej zauważyć.
  // ⚠️ `BRAK_PLANU` wolno wyciszyć i tylko jego: nie ma wtedy o czym mówić.
  zapisz('⛔ ⭐ (F1-1) stan `NIE_WIEM` NIE jest wyciszany wcześniejszym `return null`',
    cialoPostepu !== null
    && !/stan\s*!==\s*'WIADOMO'[\s\S]{0,80}?return\s+null/.test(cialoPostepu)
    && !/stan\s*===\s*'NIE_WIEM'[\s\S]{0,80}?return\s+null/.test(cialoPostepu),
    cialoPostepu === null
      ? 'nie ma funkcji `renderPostepBloku` — ta asercja nie znaczy nic'
      : 'blok chowa stan „nie wiemy, ile z M" zamiast go pokazać');

  // ── P2 · DRUGA LICZBA MA KONSUMENTA I JEST NARYSOWANA ────────────────
  // ⭐ PRZECELOWANE 18.08.2026 (pas S2) — I WZMOCNIONE O ZAKAZ POWROTU:
  // wołanie z `dzis.tsx` znaczyłoby liczenie bez rysowania, bo tamten ekran
  // tej liczby nie pokazuje od 18.08 i nie ma na nią ani jednego dp.
  zapisz('⭐ (F1-1) blok „praca w liczbach" woła `policzPraceWeWszystkichBlokach` — i nikt poza nim',
    /\bpoliczPraceWeWszystkichBlokach\(/.test(z.praca)
    && !/\bpoliczPraceWeWszystkichBlokach\(/.test(z.dzis),
    'praca we wszystkich Blokach nie ma konsumenta — czyli nie istnieje dla zawodnika '
    + '(albo wróciła na ekran, który jej nie rysuje)');

  zapisz('⭐ (F1-1) LICZBA pracy w Blokach jest w `<Text>`, nie tylko policzona',
    cialoPracy !== null && /<Text[^>]*>\s*\{?\s*dorobekBlokowLiczba\(/.test(cialoPracy),
    cialoPracy === null ? 'nie ma funkcji `renderPracaWBlokach`' : 'wynik nigdzie nie wchodzi do `<Text>`');

  // ⭐ PRZECELOWANE 18.08.2026 (pas S2) — DWA WARUNKI ZAMIAST JEDNEGO:
  // render wołany W BLOKU **i** blok montowany w arkuszu „Skąd to wiemy".
  // Sam render wołany w komponencie, którego nikt nie montuje, jest tą samą
  // pustką co przed przeprowadzką.
  zapisz('⭐ (F1-1) render pracy w Blokach jest WOŁANY, a blok MONTOWANY na ekranie',
    ilePolan(z.praca, 'renderPracaWBlokach') >= 2 && /<PracaWLiczbach\b/.test(z.arkusze),
    `wystąpień \`renderPracaWBlokach()\`: ${ilePolan(z.praca, 'renderPracaWBlokach')} `
    + `(1 = sama definicja) · montaż bloku: ${/<PracaWLiczbach\b/.test(z.arkusze)}`);

  // ── P3 · ⭐ ASERCJA ODWROTNA ─────────────────────────────────────────
  const bezEkranu = silnikiBezEkranu(z);
  const noweBezEkranu = bezEkranu.filter((s) => !z.dlugSilnikow.has(s.klucz));
  const juzPodpiete = [...z.dlugSilnikow].filter((k) => !bezEkranu.some((s) => s.klucz === k));

  zapisz('⭐⛔ (F1-2) ANI JEDNEJ nowej funkcji liczącej pracę, której nikt nie woła',
    noweBezEkranu.length === 0,
    `${noweBezEkranu.length} NOWYCH: ${noweBezEkranu.map((s) => s.klucz).join(' | ')} — `
    + 'podepnij ją do ekranu albo skasuj; trzecia droga („zostawiam, przyda się") '
    + 'jest tym, jak powstały 32 pozycje „KOD GOTOWY"');

  zapisz('⭐ (F1-2) pozycja długu, która DOSTAŁA konsumenta, wypada z listy',
    juzPodpiete.length === 0,
    `PODPIĘTE, usuń z SILNIKI_BEZ_EKRANU: ${juzPodpiete.join(' | ')}`);

  // ⭐ (strażnik strażnika) — bez tego „zero niewidocznych silników" mogłoby
  // znaczyć „detektor nic nie widzi". Próbki są SYNTETYCZNE, więc nie znikną
  // razem z naprawą kodu (O71, znalezisko E1 §10).
  const probaZlapie = silnikiBezEkranu({
    ...z,
    zrodlaLib: { ...z.zrodlaLib, 'lib/atrapaF1.ts': 'export function policzAtrapeF1() { return 1; }' },
  });
  const probaPrzepusci = silnikiBezEkranu({
    ...z,
    zrodlaLib: { ...z.zrodlaLib, 'lib/atrapaF1.ts': 'export function policzAtrapeF1() { return 1; }' },
    zrodlaEkranow: { ...z.zrodlaEkranow, 'app/(tabs)/atrapa.tsx': 'const x = policzAtrapeF1();' },
  });
  zapisz('⭐ (F1-2) (strażnik strażnika) detektor ZNAJDUJE funkcję bez konsumenta…',
    probaZlapie.some((s) => s.nazwa === 'policzAtrapeF1'), 'detektor przepuścił atrapę bez konsumenta');
  zapisz('⭐ (F1-2) (strażnik strażnika) …i MILCZY, gdy ta sama funkcja ma konsumenta',
    !probaPrzepusci.some((s) => s.nazwa === 'policzAtrapeF1'), 'detektor oskarża funkcję, która ma konsumenta');

  // ── P4 · R5 ──────────────────────────────────────────────────────────
  // „Nie udało się policzyć" i „jeszcze nic nie ma" muszą być DWOMA różnymi
  // zdaniami w DWÓCH różnych gałęziach, nie tą samą stałą z zerem.
  zapisz('⭐ (F1-3) R5 — „nie udało się policzyć" i „jeszcze nic nie ma" to DWA różne zdania',
    cialoPracy !== null
    && /dorobekBlokowNiePoliczony\(/.test(cialoPracy)
    && /DOROBEK_BLOKOW_PUSTO/.test(cialoPracy)
    && /rodzaj === 'nie_policzony'/.test(cialoPracy),
    'ekran skleił awarię odczytu z pustką — dorobek malejący przy awarii sieci kłamie tak samo '
    + 'jak licznik zerowany po opuszczonym dniu');

  zapisz('⛔ ⭐ (F1-3) R5 — stan `nie_policzony` NIE jest wyciszany wcześniejszym `return null`',
    cialoPracy !== null
    && !/rodzaj\s*!==\s*'policzony'[\s\S]{0,80}?return\s+null/.test(cialoPracy)
    && !/rodzaj\s*===\s*'nie_policzony'[\s\S]{0,80}?return\s+null/.test(cialoPracy),
    'ekran chowa „nie udało się policzyć" zamiast je pokazać — cisza wygląda jak brak funkcji');

  // ⭐ Powód stanu NIE_WIEM jest TWIERDZENIEM o danych zawodnika („żaden wpis
  // nie jest jeszcze połączony z sesją"). Postawiony po odczycie, którego nie
  // było, jest zgadywaniem podanym jako pewnik (Z0).
  zapisz('⛔ ⭐ (F1-3) powód „NIE WIEM" rysuje się TYLKO przy stanie `NIE_WIEM`, nie bezwarunkowo',
    cialoPracy !== null
    && /workProgress[\s\S]{0,120}?stan === 'NIE_WIEM'[\s\S]{0,120}?NIE_WIEM_POWOD/.test(cialoPracy),
    'zdanie o tym, że żaden wpis nie jest połączony z sesją, stoi bez warunku — '
    + 'czyli także po nieudanym odczycie powiązań');

  // ── P5 · N1 — NA TEKŚCIE CAŁEGO PLIKU, tak jak wymaga polecenie ──────
  const zakazaneN1: readonly (readonly [string, RegExp])[] = [
    ['seria', /\bseri(a|i|e|ę|ą|ach|om|ami)\b/i],
    ['passa', /\bpass(a|y|ie|ę|ą)\b/i],
    ['z rzędu', /z\s+rzędu/i],
    ['streak', /\bstreak/i],
    ['codziennie', /\bcodzienn/i],
    ['nie przerwij', /nie\s+przerw/i],
  ];
  // ⭐ ROZSZERZONE 18.08.2026 (pas S2) na plik, do którego przeniosły się dwie
  // liczby o pracy — zakazu N1 nie da się spełnić lokalnie, więc pytamy o CAŁE
  // teksty obu plików, nie o wycinki.
  const trafioneN1 = zakazaneN1
    .filter(([, w]) => w.test(z.dzis) || w.test(z.praca)).map(([s]) => s);
  zapisz('⭐⛔ (F1-4) N1 — ANI JEDNEGO słowa o dniach z rzędu w CAŁYM `dzis.tsx` i w bloku pracy',
    trafioneN1.length === 0, `zakazane słowa w plikach: ${trafioneN1.join(', ')}`);

  // ── P6 · F1.3 — DWA OSIEROCONE `?? []` ──────────────────────────────
  zapisz('⭐ (F1-5) `dzis.tsx` nie ma już `eventsRes.data ?? []`',
    !/eventsRes\.data\s*\?\?\s*\[\s*\]/.test(z.dzis),
    'wrócił `?? []` przy odczycie kalendarza — pusty dzień zamiast „nie udało się sprawdzić"');

  zapisz('⭐ (F1-5) `profil.tsx` nie ma już `injuryRes.data ?? []`',
    !/injuryRes\.data\s*\?\?\s*\[\s*\]/.test(z.profil),
    'wrócił `?? []` przy historii kontuzji — brak historii, której nie odczytano');

  zapisz('⭐ (F1-5) OBA ekrany podają `odczytUdanySie` do `rozpoznajPustke`',
    (argumentyWywolania(z.dzis, 'rozpoznajPustke')[0] ?? []).join(',').includes('odczytUdanySie')
    && (argumentyWywolania(z.profil, 'rozpoznajPustke')[0] ?? []).join(',').includes('odczytUdanySie'),
    'ekran woła `rozpoznajPustke` bez stanu odczytu — czwarty rodzaj pustki jest wtedy nieosiągalny, '
    + 'a awaria znowu wygląda jak „nic nie masz"');

  // ⛔ Brzmienie zatwierdzone wcześniej ZOSTAJE co do znaku — zmienia się
  // wyłącznie to, KIEDY zawodnik je czyta (ten sam ruch, co na siedmiu
  // ekranach pasa C3).
  zapisz('⛔ (F1-5) brzmienie „Brak wpisów w historii kontuzji." NIE ZNIKNĘŁO z `profil.tsx`',
    /Brak wpisów w historii kontuzji\./.test(z.profil),
    'pas skasował cudze brzmienie zamiast je przepuścić przez `rozpoznajPustke`');

  return r;
}

// ═══════════════════════════════════════════════════════════════════
console.log('\n⭐ F1. SILNIK NA EKRANIE — dwie liczby, dwa `?? []`, asercja odwrotna');
// ═══════════════════════════════════════════════════════════════════
const ZRODLA_LIB_PRAWDZIWE: Record<string, string> = Object.fromEntries(
  readdirSync(join(root, 'lib'))
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.selftest.ts'))
    .sort()
    .map((f) => [`lib/${f}`, bezKomentarzy(readFileSync(join(root, 'lib', f), 'utf8'))]),
);

const ZRODLA_EKRANOW_PRAWDZIWE: Record<string, string> = Object.fromEntries([
  ...readdirSync(join(root, 'app', '(tabs)'))
    .filter((f) => f.endsWith('.tsx'))
    .sort()
    .map((f) => [`app/(tabs)/${f}`, bezKomentarzy(readFileSync(join(root, 'app', '(tabs)', f), 'utf8'))] as const),
  ...readdirSync(join(root, 'components'))
    .filter((f) => f.endsWith('.tsx'))
    .sort()
    .map((f) => [`components/${f}`, bezKomentarzy(readFileSync(join(root, 'components', f), 'utf8'))] as const),
]);

const ZASADY_F1: ZasadyF1 = {
  dzis,
  praca,
  arkusze,
  profil: bezKomentarzy(profilSurowe),
  zrodlaLib: ZRODLA_LIB_PRAWDZIWE,
  zrodlaEkranow: ZRODLA_EKRANOW_PRAWDZIWE,
  dlugSilnikow: KLUCZE_SILNIKOW_BEZ_EKRANU,
};

{
  console.log(`   przemiatam ${Object.keys(ZASADY_F1.zrodlaLib).length} plików lib/ `
    + `i ${Object.keys(ZASADY_F1.zrodlaEkranow).length} ekranów`);
  const bezEkranu = silnikiBezEkranu(ZASADY_F1);
  console.log(`   ⭐ (F1-2) funkcji liczących pracę BEZ ani jednego konsumenta: ${bezEkranu.length}`);
  for (const s of bezEkranu) {
    const poz = SILNIKI_BEZ_EKRANU.find((d) => d.klucz === s.klucz);
    console.log(`      • ${s.klucz}`);
    console.log(`        ${poz ? poz.kto : '⛔ NOWA — nie ma jej na liście zgłoszonych'}`);
    if (poz) console.log(`        ${poz.dlaczego}`);
  }

  for (const w of bateriaF1(ZASADY_F1)) check(w.label, w.ok, w.detail);
}

// ═══════════════════════════════════════════════════════════════════
console.log('\n⭐ F1-6. TEST MUTACYJNY — osiem kształtów SPRZED pasa F1');
// ═══════════════════════════════════════════════════════════════════
// ⚠️ MUTACJE ŻYJĄ WYŁĄCZNIE W OBIEKTACH `ZasadyF1` przekazywanych do
// `bateriaF1` — ani jedna nie dotyka dysku, `dzis.tsx` ani `profil.tsx`.
// Cofnięcie jest STRUKTURALNE: nie ma czego cofać, bo nic nie zostało
// zmienione. Osobna asercja na końcu sprawdza, że prawdziwe zasady przechodzą
// tę samą baterię, którą mutanty oblewają.
//
// ⭐ SIEDEM Z OŚMIU MUTACJI TO KSZTAŁTY, KTÓRE NAPRAWDĘ BYŁY W TYM
// REPOZYTORIUM JESZCZE 15.08.2026 PRZED TYM PASEM — nie wymyślone defekty,
// tylko stan `main` na commicie `e27d5cc`. To jest kontrola historyczna
// (**O70**) zapisana strukturalnie: dopóki te mutacje zapalają, żadna kolejna
// sesja nie przywróci tamtego stanu niepostrzeżenie.
{
  const ROZMIAR = bateriaF1(ZASADY_F1).length;
  const failePrawdziwe = bateriaF1(ZASADY_F1).filter((w) => !w.ok).length;

  const MUTACJE: { nazwa: string; opis: string; zasady: ZasadyF1 }[] = [
    {
      nazwa: 'M1 · wraca `computeFocusBlockProgress` (stan `main` sprzed F1)',
      opis: 'kafelek Celu znowu rysuje „0 z 12" tam, gdzie prawdą jest „nie wiemy, ile z 12"',
      zasady: {
        ...ZASADY_F1,
        dzis: ZASADY_F1.dzis
          .replace(/setWorkProgress\(computeFocusBlockProgressState\(/g, 'setWorkProgress(computeFocusBlockProgress('),
        // ⭐ PLAN-D-S2 — MUTACJA IDZIE OD DZIŚ TAKŻE W PLIK, KTÓRY TO RYSUJE.
        praca: ZASADY_F1.praca
          .replace(/computeFocusBlockProgressState\(/g, 'computeFocusBlockProgress(')
          .replace(/workProgress\.stan === 'NIE_WIEM'/g, 'false'),
      },
    },
    {
      nazwa: 'M2 · druga liczba policzona i wyrzucona',
      opis: '`policzPraceWeWszystkichBlokach` wraca do stanu z pasa E2: policzona, bez konsumenta',
      zasady: {
        ...ZASADY_F1,
        praca: ZASADY_F1.praca.replace(/\bpoliczPraceWeWszystkichBlokach\(/g, 'nieistniejacaFunkcja('),
      },
    },
    {
      nazwa: 'M3 · render pracy w Blokach zdefiniowany, ale niewołany',
      opis: 'najcichszy z możliwych sposobów odpięcia liczby — funkcja jest, `tsc` przechodzi, ekran milczy',
      zasady: {
        ...ZASADY_F1,
        praca: ZASADY_F1.praca.replace(/\{renderPracaWBlokach\(\)\}/g, '{null}'),
      },
    },
    {
      nazwa: 'M4 · R5 skasowane — awaria odczytu udaje pustkę',
      opis: '„nie udało się policzyć" rysuje to samo zdanie co „jeszcze nic nie ma"',
      zasady: {
        ...ZASADY_F1,
        praca: ZASADY_F1.praca.replace(/dorobekBlokowNiePoliczony\(/g, 'String(DOROBEK_BLOKOW_PUSTO) + String('),
      },
    },
    {
      nazwa: 'M5 · pasek 0% wraca pod zdanie „nie wiemy"',
      opis: 'kłamstwo narysowane zamiast napisanego — pasek na zero obok „nie wiemy, ile się odbyło"',
      zasady: {
        ...ZASADY_F1,
        praca: ZASADY_F1.praca.replace(
          /\{workProgress\.stan === 'NIE_WIEM' \? \(/,
          "{workProgress.stan === 'NIE_WIEM' ? (<View style={styles.workTrack}><View style={styles.workFill} /></View>) : null}\n{false ? (",
        ),
      },
    },
    {
      nazwa: 'M6 · wraca `eventsRes.data ?? []` (stan `main` sprzed F1)',
      opis: 'pusty dzień zamiast „Nie udało się sprawdzić." — dług bez właściciela po pasie C4',
      zasady: {
        ...ZASADY_F1,
        dzis: `${ZASADY_F1.dzis}\nconst events = (eventsRes.data ?? []) as CalEvent[];`,

      },
    },
    {
      nazwa: 'M7 · wraca `injuryRes.data ?? []` (stan `main` sprzed F1)',
      opis: 'historia kontuzji po nieudanym odczycie wygląda jak jej brak — dług bez właściciela po pasie L2',
      zasady: {
        ...ZASADY_F1,
        profil: `${ZASADY_F1.profil}\nsetInjuryHistory(injuryRes.data ?? []);`,
      },
    },
    {
      nazwa: 'M8 · ⭐ nowa funkcja licząca pracę, której nikt nie woła',
      opis: 'dokładnie ta choroba, dla której ten strażnik powstał — 33. pozycja „KOD GOTOWY"',
      zasady: {
        ...ZASADY_F1,
        zrodlaLib: {
          ...ZASADY_F1.zrodlaLib,
          'lib/nowyLicznik.ts': 'export function policzNowaCiaglosc(x: number[]) { return x.length; }',
        },
      },
    },
  ];

  console.log(`\nbateria F1 ma ${ROZMIAR} predykatów · na prawdziwych zasadach FAIL-i: ${failePrawdziwe}\n`);
  check('⭐ bateria F1 na PRAWDZIWYM kodzie nie zapala ani jednego predykatu',
    failePrawdziwe === 0, `FAIL-i: ${failePrawdziwe}`);

  let bezEfektu = 0;
  for (const m of MUTACJE) {
    const zapalone = bateriaF1(m.zasady).filter((w) => !w.ok);
    console.log(`${m.nazwa}`);
    console.log(`   co psuje: ${m.opis}`);
    console.log(`   FAIL-i przy tej mutacji: ${zapalone.length} / ${ROZMIAR}`);
    for (const z of zapalone) console.log(`     • ${z.label}`);
    if (zapalone.length === 0) bezEfektu++;
    check(`⭐ mutacja „${m.nazwa}" podnosi liczbę FAIL-i`,
      zapalone.length > 0, 'mutacja przeszła niezauważona — ta bateria niczego nie pilnuje');
    console.log('');
  }

  // ⚠️ Liczba mutacji LICZONA, nie wpisana (**O71**) — „osiem" zestarzałoby się
  // po cichu przy pierwszej dołożonej.
  check(`⭐ KAŻDA z ${MUTACJE.length} mutacji została złapana`, bezEfektu === 0, `mutacji bez efektu: ${bezEfektu}`);
  check(`⭐ po ${MUTACJE.length} mutacjach prawdziwe zasady są nadal nietknięte`,
    bateriaF1(ZASADY_F1).filter((w) => !w.ok).length === 0,
    'mutacja wyciekła poza swój obiekt ZasadyF1');
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-D2 15.08.2026 — TRZY ASERCJE O KARCIE, KTÓRYCH NIE MA NIGDZIE INDZIEJ
// ═══════════════════════════════════════════════════════════════════
//
// ⚠️ Reguły pytania pilnuje `lib/pytanieOWystapienie.selftest.ts` (63 asercje).
// Tutaj stoi wyłącznie to, co jest własnością KARTY „DZIŚ" jako całości
// i czego tamten strażnik nie widzi: kolejność bloków i głębokość dotknięć.
{
  // ── (D2-1) REGUŁA MA KONSUMENTA — i wynik dochodzi do <Text> ─────
  //
  // ⚠️ DLACZEGO TO STOI TU, A NIE W ASERCJI ODWROTNEJ (F1-2). Tamta zna
  // wzorzec nazw `^(policz|compute)`, a ta funkcja nazywa się `zbuduj…` —
  // czyli wpada dokładnie w lukę, którą pas F1 zgłosił sam o sobie
  // (nota F1 §15.3 poz. 5: „funkcja nazwana `zbuduj*` nie zostanie znaleziona").
  // ⛔ ROZSZERZENIA WZORCA O `zbuduj*` ŚWIADOMIE NIE ROBIĘ i powód jest
  // ZMIERZONY, nie ostrożnościowy: w `lib/` jest dziś 10 eksportów `zbuduj*`,
  // z czego CZTERY nie mają konsumenta pierwszego rzędu (`zbudujCoToZmieni`,
  // `zbudujOdcinek`, `zbudujWglad`, `zbudujZadanieSystemowe`
  // + `zbudujKluczSystemowy`). Rozszerzenie wzorca zapaliłoby strażnika na
  // CUDZYCH plikach w pasie, który ich nie dotyka (O68) — zgłaszam to jako
  // znalezisko do osobnego pasa, a nie jako czerwień do posprzątania dziś.
  check('⭐ (D2-1) karta „Dziś" WOŁA `zbudujPytaniaOWystapienia` — reguła ma konsumenta',
    /zbudujPytaniaOWystapienia\(\{/.test(dzis),
    'reguła pytania policzona i nigdzie nie użyta — 34. pozycja tej samej choroby');

  check('⭐ (D2-1) ZDANIE PYTAJĄCE dochodzi do <Text>, a nie kończy się w `useMemo`',
    /<Text style=\{styles\.licznikLiczba\}>\{p\.zdanie\}<\/Text>/.test(dzis),
    'pytanie jest policzone i niewidoczne');

  // ── (D2-2) ⭐ KOLEJNOŚĆ BLOKÓW KARTY — PYTANIE NAD ODPOWIEDZIAMI ──
  //
  // ⛔ TO NIE JEST ESTETYKA. Karta niesie dziś cztery bloki i trzy z nich są
  // ODPOWIEDZIAMI o wykonanej pracy („N z M w 14 dni", dorobek, praca
  // w Blokach). Wszystkie trzy mówią dziś „nie wiemy" — bo nie ma dowodów.
  // Pytanie jest jedyną rzeczą na tym ekranie, która to zmienia, więc stoi
  // PIERWSZE. Przesunięte pod liczniki kazałoby zawodnikowi przeczytać trzy
  // razy „nie wiem", zanim dostanie sposób, żeby na to odpowiedzieć.
  // ⭐ PRZECELOWANE 18.08.2026 (pas S2) — TE SAME CZTERY RZECZY, DWA PLIKI.
  //
  // GDZIE PYTAŁA: cztery bloki JEDNEJ karty w `app/(tabs)/dzis.tsx`.
  // GDZIE PYTA: PYTANIE zostało na ekranie 1 (arkusz „Dziś"), a trzy
  // ODPOWIEDZI o wykonanej pracy stoją w `components/PracaWLiczbach.tsx`
  // (Profil → „Skąd to wiemy"), plus dorobek w arkuszu odznak.
  // DLACZEGO: pas A1 zdjął z ekranu „Dziś" trzy z czterech bloków; kolejności
  // na jednej karcie nie ma już czego pilnować, ale REGUŁA ZOSTAJE TA SAMA —
  // zawodnik spotyka PYTANIE zanim spotka odpowiedzi „nie wiem", a trzy
  // odpowiedzi idą od szczegółu (bieżący Blok) do sumy (wszystkie Bloki).
  // ⛔ RÓWNIE MOCNA: nadal RÓWNOŚĆ POZYCJI, nadal wszystkie cztery muszą
  // istnieć — zniknięcie którejkolwiek zapala tę samą asercję.
  const iPytanie = dzis.indexOf('{renderPytaniaOWystapienia()}');
  const kolejnosc = ['renderPostepBloku', 'renderLicznikPracy', 'renderPracaWBlokach']
    .map((n) => ({ n, i: praca.indexOf(`{${n}()}`) }));
  const iDorobek = arkusze.indexOf('<Odznaki');
  check('⭐ (D2-2) cztery bloki stoją w kolejności: PYTANIE (ekran 1) → postęp Bloku → '
    + 'licznik okna → praca w Blokach, a dorobek ma własne miejsce',
    iPytanie > 0
    && iDorobek > 0
    && kolejnosc.every((x) => x.i > 0)
    && kolejnosc.every((x, i) => i === 0 || x.i > kolejnosc[i - 1].i),
    `pytanie@${iPytanie} (dzis.tsx) · `
    + `${kolejnosc.map((x) => `${x.n}@${x.i}`).join(' · ')} (PracaWLiczbach.tsx) · `
    + `dorobek@${iDorobek} (ArkuszeProfilu.tsx)`);

  // ── (D2-3) ⭐ GŁĘBOKOŚĆ ZERO (P0) ────────────────────────────────
  //
  // Karta ma przełącznik `Dziś / Tydzień` (pas B5). Blok pytania stoi POZA
  // jego gałęziami — czyli widać go bez względu na to, który zakres zawodnik
  // wybrał, i bez ani jednego dotknięcia. ⚠️ Wycinamy gałąź przełącznika
  // i pytamy JEJ, a nie plikowi (O71): fraza „renderPytaniaOWystapienia"
  // jest w tym pliku także w definicji i w komentarzach.
  // ⭐ PRZECELOWANE 18.08.2026 (pas S1) — REGUŁA TA SAMA, MIEJSCE INNE.
  //
  // Do 18.08.2026 pytanie o wystąpienie stało W CIELE `ScrollView`, wewnątrz
  // karty kalendarza, nad licznikiem. Pas A1 przeniósł je do ARKUSZA
  // (`<Arkusz>` — `Modal` stojący POZA `ScrollView`), a decyzja jest zapisana
  // i widoczna na samym ekranie jako przypis:
  //   „Ocena należy do rzeczy: dotykasz kafla i mówisz, jak poszło."
  // (`PRZYPIS_OCENA_NALEZY_DO_RZECZY`, decyzja Kuby M1 §3 / makieta v3;
  //  powód policzalny: ocena w ciele ekranu kosztowała 4 663 dp w głąb,
  //  a `session_verdicts` miało JEDEN wiersz w całej bazie).
  //
  // ⛔ CO Z TEGO ZOSTAJE NIENARUSZALNE — i jest niżej pilnowane:
  //  (a) pytanie NIE JEST schowane za przełącznikiem `Dziś / Tydzień`
  //      (arkusz stoi poza `ScrollView`, więc poza obiema gałęziami),
  //  (b) na GŁĘBOKOŚCI 0, bez ani jednego dotknięcia, zawodnik nadal DOWIADUJE
  //      SIĘ, że coś czeka na odpowiedź — wierszem „Bez oceny: N rzeczy →".
  //      ⚠️ To jest cena tej przeprowadzki wypowiedziana wprost: samo PYTANIE
  //      jest dziś o jedno dotknięcie dalej, ale WIEDZA, że czeka, została na zerze.
  // ⭐ Kształt pytania w arkuszu pilnuje osobno `lib/arkusz.selftest.ts`
  // („ocena z kafla NIE stoi w ciele `ScrollView`").
  const iScroll = dzis.indexOf('<ScrollView');
  const iKoniecScroll = dzis.indexOf('</ScrollView>');
  // ⭐ PAS W1 18.08.2026 — „CIAŁO EKRANU” TO OD DZIŚ DWIE RZECZY.
  // JEDNYM ZDANIEM: obie gałęzie przełącznika („Dziś” i „Tydzień”) są od
  // pasa W1 WYWOŁANIAMI PO NAZWIE — bez tego miara wysokości nie umie
  // NAZWAĆ gałęzi, której nie opisuje, i gałąź „Dziś” wypadałaby z raportu
  // bez śladu (O97). Ciało `ScrollView` samo w sobie zawiera więc już tylko
  // nagłówek, przełącznik i dwa wywołania — a treść ekranu siedzi w ciele
  // `renderDzisNaEkranie()`. ⛔ To NIE JEST osłabienie asercji: arkusz
  // (`trescArkusza`) nadal NIE należy do żadnej z tych funkcji, więc każda
  // reguła „to ma / nie ma stać na ekranie” działa tak samo jak dotąd.
  const cialoScrollView = iScroll >= 0 && iKoniecScroll > iScroll
    ? dzis.slice(iScroll, iKoniecScroll)
      + (cialoFunkcji(dzis, 'renderDzisNaEkranie') ?? '')
      + (cialoFunkcji(dzis, 'renderTydzienNaKarcie') ?? '')
    : null;
  check('⭐ (D2-3) PYTANIE STOI POZA PRZEŁĄCZNIKIEM `Dziś / Tydzień` — żadna gałąź go nie chowa',
    cialoScrollView !== null
    && !cialoScrollView.includes('{renderPytaniaOWystapienia()}')
    && !cialoScrollView.includes('{renderPytaniaOWystapienia(')
    && /\{trescArkusza\(\)\}/.test(dzis)
    && dzis.indexOf('{trescArkusza()}') > iKoniecScroll,
    cialoScrollView === null
      ? 'nie znajduję ciała `ScrollView` — ta asercja nie znaczy nic'
      : 'pytanie wpadło do ciała ekranu (a więc pod jedną z gałęzi zakresu) albo arkusz '
        + 'wjechał do `ScrollView` i przestał być nakładką — połowa zawodników go nie zobaczy');

  check('⭐ (D2-3) na GŁĘBOKOŚCI 0 zawodnik dowiaduje się, że coś czeka na odpowiedź',
    cialoScrollView !== null
    && /WIERSZ_BEZ_OCENY\(bezOceny\.length\)/.test(cialoScrollView)
    && /bezOceny\.length > 0/.test(cialoScrollView)
    && /PRZYPIS_OCENA_NALEZY_DO_RZECZY/.test(cialoScrollView),
    'z ekranu zniknął wiersz „Bez oceny: N rzeczy →" albo przypis, który mówi, gdzie jest ocena '
    + '— a wtedy pytanie jest schowane za dotknięciem, o którym nikt nie wie (złamane P0)');
}

// ═══════════════════════════════════════════════════════════════════
// PLIK, KTÓRY TEN STRAŻNIK CZYTA, NAPRAWDĘ ZAWIERA BADANĄ LOGIKĘ
// ═══════════════════════════════════════════════════════════════════
// Bez tego część asercji przechodziłaby, nie sprawdzając niczego — plik
// istnieje, tylko nie ma już w nim tego, czego pilnujemy.
{
  // ⭐ PRZECELOWANE 18.08.2026 (pas S2). Licznik pracy wyszedł z tego pliku
  // razem z rysowaniem, więc `dzis.tsx` odpowiada dziś WYŁĄCZNIE za tydzień
  // na karcie i za pytanie o wystąpienie. Reszta stoi w asercji obok.
  check('`dzis.tsx` istnieje, importuje czystą funkcję tygodnia i zawiera badaną logikę',
    dzisSurowe.length > 90_000
    && /from '\.\.\/\.\.\/lib\/widokTygodnia'/.test(dzis)
    && /from '\.\.\/\.\.\/lib\/wykonanieSesji'/.test(dzis)
    && dzis.includes('renderPytaniaOWystapienia') && dzis.includes('renderTydzienNaKarcie'),
    `dzis=${dzisSurowe.length}B surowo, ${dzis.length}B bez komentarzy`);

  // ⭐ NOWA (pas S2) — bez niej piętnaście asercji wyżej dałoby się spełnić
  // PUSTYM PLIKIEM: `cialoFunkcji` na nieistniejącej nazwie oddaje `null`,
  // a `null` da się przepuścić, kasując warunek. Ta asercja jest kotwicą:
  // plik istnieje, jest niepusty, bierze trzy silniki i ma trzy rendery.
  check('⭐ `components/PracaWLiczbach.tsx` istnieje, bierze trzy silniki i ma trzy rendery',
    pracaSurowe.length > 5_000
    && /from '\.\.\/lib\/widokTygodnia'/.test(praca)
    && /from '\.\.\/lib\/wykonanieSesji'/.test(praca)
    && /from '\.\.\/lib\/focusBlockProgress'/.test(praca)
    && praca.includes('renderLicznikPracy')
    && praca.includes('renderPracaWBlokach')
    && praca.includes('renderPostepBloku'),
    `praca=${pracaSurowe.length}B surowo, ${praca.length}B bez komentarzy`);

  // ⭐ PLAN-D-F1 — to samo dla drugiego pliku, który ten strażnik od dziś czyta.
  check('`profil.tsx` istnieje, czyta trzy pustki i zawiera badaną logikę',
    profilSurowe.length > 50_000
    && /from '\.\.\/\.\.\/lib\/trzyPustki'/.test(profilSurowe)
    && profilSurowe.includes('loadProfile') && profilSurowe.includes('injuryHistory'),
    `profil=${profilSurowe.length}B surowo`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
