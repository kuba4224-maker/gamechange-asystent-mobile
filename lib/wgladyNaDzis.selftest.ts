// PLAN-D-B4 08.2026 (14.08.2026) — NOWY PLIK. Zadanie B4.3 — STRAŻNIK WPIĘCIA.
//
//   npx tsx lib/wgladyNaDzis.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ═════════════════════════════════════════════════════════════════════
// DLACZEGO TO JEST NOWY PLIK, A NIE ROZSZERZENIE `kolejkaNaDzis.selftest.ts`
//
// Polecenie B4 §6 każe najpierw ZMIERZYĆ, czy strażnik pasa B2 już tego pilnuje.
// Zmierzone 14.08.2026 na pliku `lib/kolejkaNaDzis.selftest.ts` (22 000 B):
//
//   grep -c "wglad\|policzWglady\|wgladDlaPozycji"  →  0
//
// Strażnik B2 nie zna słowa „wgląd". Pilnuje CZEGO INNEGO: że ekran nie układa
// własnej kolejności, czyta rankera i rozróżnia trzy stany kolejki. To są
// reguły PASA B2 i mają zostać jego regułami — dołożenie do nich reguł pasa B4
// zrobiłoby z jednego pliku wspólny worek, w którym za trzy pasy nikt nie
// odróżni, która asercja czego broni. Osobny plik ma też cenę policzalną:
// gdy ktoś skasuje wpięcie wglądów, czerwony robi się plik o nazwie
// `wgladyNaDzis`, a nie plik o nazwie `kolejkaNaDzis`.
//
// ⚠️ Ten plik NIE POWTARZA pracy strażnika B3 (`wgladyZAlgorytmu.selftest.ts`,
// 81 asercji). Tamten pilnuje, czy wglądy są dobrze LICZONE. Ten pilnuje
// wyłącznie tego, czy są WPIĘTE — i to jest cała różnica między „KOD GOTOWY"
// a „JEST".
//
// ── CZTERY DEFEKTY, KAŻDY z własną asercją i własną mutacją ─────────
//
//   (B4-1) ekran liczy wglądy, ale NIE PODAJE ich rankerowi — albo podaje je
//          obok niego, jako siódmego producenta z własną kartą;
//   (B4-2) ekran nie woła `wgladDlaPozycji`, więc TRZECIA CZĘŚĆ wglądu
//          („jedna rzecz do zrobienia") nie ma jak trafić na ekran — wgląd
//          kończy się na wiedzy (M4);
//   (B4-3) wejście wglądu dostaje `?? []` — „nie udało się odczytać" staje się
//          nieodróżnialne od „nic nie masz", a producent traci rozróżnienie
//          `nie_wiem` / `brak_danych`, na którym stoi cały pas B3;
//   (B4-4) ⭐ ktoś spełnia trzy powyższe kodem, który woła OBIE funkcje
//          i NIC NIE RENDERUJE. Bez tej asercji strażnik świeci na zielono
//          przy wglądzie, którego zawodnik nigdy nie zobaczy — czyli nagradza
//          dokładnie ten stan, który ten pas likwiduje.
//
// ⚠️ ASERCJE SĄ NA REGUŁĘ I NA KSZTAŁT WYWOŁAŃ, NIE NA DANE. Nigdzie niżej nie
// ma liczby wierszy w bazie: test „powstają dwa wglądy" zgasłby przy trzecim
// wpisie Dziennika i niczego by nie pilnował. Liczby z produkcji stoją
// w nocie przekazania, nie tutaj.
//
// ⚠️ CZEGO TEN PLIK NIE UDAJE. Część asercji czyta ŹRÓDŁO EKRANU JAKO TEKST
// (wzorzec z `kolejkaNaDzis.selftest.ts` i `meczWKalendarzu.selftest.ts`).
// To nie jest test — to jest strażnik regresji. Nie uruchamia Reacta i nie wie,
// czy ekran się rysuje. Dlatego OSTATNIA sekcja jest inna: przepuszcza
// prawdziwych kandydatów przez PRAWDZIWEGO rankera i sprawdza, że kontrakt
// identyfikatorów naprawdę się domyka.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (ograniczenie O53): `tsconfig.json` ciągnie DOM,
// więc `tsc` pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.
// ═════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ulozKolejke, wezDlaWidoku, type WejsciaKolejki } from './kolejkaPodania';
import { policzWglady, wgladDlaPozycji, KLUCZE_WGLADOW, type WejsciaWgladow } from './wgladyZAlgorytmu';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — ten sam powód co w strażniku B2: pliki tego projektu
 * CYTUJĄ w komentarzach zepsute wywołania („⛔ nie ma prawa paść ani jedno
 * `?? []`"), więc strażnik czytający surowy tekst zapalałby się na własnej
 * dokumentacji, a jedynym sposobem, żeby go uciszyć, byłoby skasowanie
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
 * Sekcja budowania SZEŚCIU WEJŚĆ WGLĄDÓW, wycięta z SUROWEGO źródła (znaczniki
 * stoją w komentarzach, więc po `bezKomentarzy` by ich nie było) i dopiero
 * potem odkomentowana.
 */
function sekcjaWejscWgladow(): string | null {
  const od = dzisSurowe.indexOf('WEJŚCIA WGLĄDÓW — POCZĄTEK');
  const do_ = dzisSurowe.indexOf('WEJŚCIA WGLĄDÓW — KONIEC');
  if (od < 0 || do_ < 0 || do_ <= od) return null;
  return bezKomentarzy(dzisSurowe.slice(od, do_));
}

/**
 * Argumenty każdego wywołania `nazwa(...)` — rozdzielone PO PRZECINKACH
 * NAJWYŻSZEGO POZIOMU, ze skanowaniem głębokości nawiasów.
 *
 * ⚠️ ISTNIEJE, BO WYRAŻENIE REGULARNE TEGO NIE UMIE i moja pierwsza wersja
 * tej asercji zapaliła się FAŁSZYWIE (zmierzone 14.08.2026): leniwe `[\s\S]*?`
 * przeskoczyło zamykający nawias klamrowy argumentu i złapało przecinek
 * kilkaset znaków dalej, w zupełnie innym wywołaniu. Strażnik, który zapala
 * się na poprawnym kodzie, zostaje wyciszony przy pierwszej okazji — i wtedy
 * przestaje pilnować czegokolwiek.
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

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

// ═══════════════════════════════════════════════════════════════════
// (B4-1) EKRAN WOŁA `policzWglady` I PODAJE WYNIK DO `dodatkowi`
// ═══════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: ktoś liczy wglądy i rysuje je OBOK kolejki, jako
// siódmego producenta z własną kartą. Wtedy kolejność ma znowu dwa źródła,
// a wgląd — w odróżnieniu od każdej innej pozycji — nie podlega ani wyciszeniu
// przy kontuzji, ani hamulcowi bólu, ani ścieżce wyjścia. Wgląd o objętości
// pokazany zawodnikowi po urazie jest dokładnie tym, czemu ranker zapobiega.
{
  check('(B4-1) `dzis.tsx` woła `policzWglady`',
    /\bpoliczWglady\(/.test(dzis),
    'ekran nie liczy wglądów — producent B3 (49 261 B, 81 asercji) znowu nie ma konsumenta');

  const wywolaniaWgladow = argumentyWywolania(dzis, 'policzWglady');
  check('(B4-1) `policzWglady` wołane z JEDNYM argumentem — ekran nie podmienia zasad wglądów',
    wywolaniaWgladow.length > 0 && wywolaniaWgladow.every((a) => a.length === 1),
    `ekran podał drugi argument (\`ZasadyWgladow\`), zarezerwowany dla strażnika mutacyjnego B3 — `
    + `czyli ma własną, schowaną kopię reguł liczenia wglądów. Wywołania: `
    + `${JSON.stringify(wywolaniaWgladow.map((a) => a.length))}`);

  check('(B4-1) ⭐ kandydaci wglądów idą do `dodatkowi` rankera — a nie do osobnej karty',
    /dodatkowi\.push\(\s*\.\.\.\s*wglady\.kandydaci\s*\)/.test(dzis),
    'wglądy nie wchodzą do kolejki jako pozycje — albo stoją obok niej jako siódmy producent');

  // ⛔ WG-32. Wgląd wyciszony ma zostać WIDOCZNY, wyszarzony, z powodem
  // milczenia. Filtr PRZED rankerem kasuje go po cichu — i robi to niewidocznie
  // dla wszystkich pozostałych asercji, bo lista jest po prostu krótsza.
  check('(B4-1) kandydaci NIE SĄ filtrowani przed rankerem (WG-32)',
    !/wglady\.kandydaci\s*\.\s*(filter|slice|sort)\s*\(/.test(dzis),
    'ekran wybiera, który wgląd wpuścić — wyciszony wgląd znika wtedy bez powodu milczenia');

  // `wglady.kandydaci` ma w całym pliku DOKŁADNIE JEDNO użycie: to jedno,
  // które idzie do rankera. Drugie użycie znaczy, że ktoś rysuje kandydatów
  // także poza kolejką.
  const uzyciaKandydatow = (dzis.match(/wglady\.kandydaci/g) || []).length;
  check('(B4-1) `wglady.kandydaci` ma DOKŁADNIE JEDNO użycie — drogę przez rankera',
    uzyciaKandydatow === 1,
    `użyć: ${uzyciaKandydatow} (spodziewane 1 — drugie znaczy drugą drogę na ekran)`);
}

// ═══════════════════════════════════════════════════════════════════
// (B4-2) EKRAN WOŁA `wgladDlaPozycji` — TRZECIA CZĘŚĆ MA JAK WYJŚĆ
// ═══════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: `Kandydat` ma DWA pola tekstowe, a wgląd ma TRZY
// części. Ekran, który bierze `co` i `dlaczego` i nie pyta o trzecią, pokazuje
// zawodnikowi liczbę i jej znaczenie — i nie mówi, co z tym zrobić. To jest
// dokładnie M4 („żaden materiał nie kończy się na wiedzy"), dziś złamane
// w 114 z 297 podpowiedzi.
{
  check('(B4-2) `dzis.tsx` woła `wgladDlaPozycji`',
    /\bwgladDlaPozycji\(/.test(dzis),
    'trzecia część wglądu nie ma jak wyjść z producenta — wgląd kończy się na wiedzy (M4)');

  check('(B4-2) `wgladDlaPozycji` pyta o pozycję Z LISTY, po jej `id` — nie o wgląd wybrany na sztywno',
    /wgladDlaPozycji\(\s*wglady\s*,\s*p\.id\s*\)/.test(dzis),
    'ekran nie łączy wglądu z POZYCJĄ, którą właśnie rysuje — pokaże trzecią część przy cudzym wierszu');
}

// ═══════════════════════════════════════════════════════════════════
// (B4-3) SZEŚĆ WEJŚĆ, TRZY STANY KAŻDE — ZERO `?? []`
// ═══════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: `const dane = res.data ?? []`. `supabase-js` NIE
// RZUCA przy nieudanym odczycie — oddaje `{ data: null, error }`. Po `?? []`
// producent dostaje pustą tablicę zamiast „nie odczytałem", oddaje
// `brak_danych` zamiast `nie_wiem`, ekran przestaje mówić, że lista jest
// niepełna — i wszystko wygląda na wdrożone.
{
  const sekcja = sekcjaWejscWgladow();

  check('(B4-3) sekcja „WEJŚCIA WGLĄDÓW" istnieje i da się ją wskazać znacznikami',
    sekcja !== null && sekcja.length > 200,
    'znaczników POCZĄTEK/KONIEC nie ma — nie da się powiedzieć, gdzie powstają wejścia wglądów');

  check('(B4-3) ⭐ w sekcji wejść wglądów nie ma ani jednego `?? []` / `|| []`',
    sekcja !== null && !/\?\?\s*\[\s*\]/.test(sekcja) && !/\|\|\s*\[\s*\]/.test(sekcja),
    'wejście wglądu skleja „nie udało się odczytać" z „nic nie masz" — producent traci rozróżnienie R5');

  check('(B4-3) pięć wejść listowych powstaje JEDYNĄ drogą — przez `wejscieZOdpowiedzi`, które widzi `error`',
    sekcja !== null && (sekcja.match(/wejscieZOdpowiedzi</g) || []).length >= 5,
    'ktoś zbudował wejście z samej `data`, z pominięciem błędu odczytu');

  // PROFIL nie jest listą, więc nie przechodzi przez `wejscieZOdpowiedzi` —
  // i właśnie dlatego jest jedynym miejscem, w którym trzeba sprawdzić `error`
  // ręcznie. Trzy odpowiedzi, trzy jawne gałęzie `nie_wiem`.
  check('(B4-3) wejście `profil` sprawdza błąd KAŻDEJ z trzech odpowiedzi, z których powstaje',
    sekcja !== null
    && /userRes\.error/.test(sekcja) && /katalogRes\.error/.test(sekcja) && /odcinkiRes\.error/.test(sekcja),
    'błąd jednej z trzech odpowiedzi zamienia się w „nic Cię nie kosztuje brak rocznika" (Z0)');

  // ⛔ ZNALEZISKO 10.9 NOTY B3, ZŁAPANE NA WŁASNYM BRZMIENIU. Bez filtru
  // odbiorcy zdanie mówi zawodnikowi, że traci 18 podpowiedzi — a wszystkie 18
  // bramkowanych wiekiem ma `odbiorca='rodzic'` i nigdy by ich nie zobaczył.
  // To jest nieprawda o zawodniku PRZY ZIELONYCH TESTACH.
  check('(B4-3) ⭐ liczby katalogu liczone Z FILTREM ODBIORCY — inaczej zdanie skłamie zawodnikowi',
    /from\('component_hints'\)[\s\S]{0,200}?\.in\('odbiorca',\s*\['zawodnik',\s*'oba'\]\)/.test(dzis),
    'katalog podpowiedzi liczony bez `odbiorca in (zawodnik, oba)` — wgląd WT-26 poda liczbę, '
    + 'której zawodnik i tak nigdy by nie zobaczył');
}

// ═══════════════════════════════════════════════════════════════════
// (B4-4) ⭐ ASERCJA DOMYKAJĄCA DZIURĘ — `doZrobienia` JEST NARYSOWANE
// ═══════════════════════════════════════════════════════════════════
// Trzy powyższe są spełnialne w całości przez kod, który woła obie funkcje,
// buduje sześć wejść bez jednego `?? []` — i NIC NIE RENDERUJE. Suita świeci
// wtedy na zielono, dziewięć obietnic wygląda na domknięte, a zawodnik nie
// widzi ani jednej rzeczy do zrobienia. Ta asercja wymaga, żeby trzecia część
// wglądu naprawdę stała w drzewie JSX.
{
  check('(B4-4) ⭐ istnieje komponent, który rysuje TRZECIĄ CZĘŚĆ wglądu w `<Text>`',
    /<Text[^>]*>\s*\{wglad\.doZrobienia\}\s*<\/Text>/.test(dzis),
    'trzecia część wglądu nie trafia do drzewa JSX — wgląd kończy się na wiedzy mimo zielonych asercji (M4)');

  check('(B4-4) ⭐ ekran NAPRAWDĘ montuje ten komponent, karmiąc go wynikiem `wgladDlaPozycji`',
    /<WgladPozycji\s+wglad=\{wgladDlaPozycji\(/.test(dzis),
    'komponent istnieje, ale nikt go nie renderuje — martwy kod, który przechodzi każdą asercję na tekst');

  check('(B4-4) ⭐ komponent stoi WEWNĄTRZ pętli po pozycjach kolejki, a nie obok niej',
    /pozycjeNaDzis\.map\(/.test(dzis)
    && dzis.indexOf('pozycjeNaDzis.map(') < dzis.indexOf('<WgladPozycji')
    && dzis.indexOf('<WgladPozycji') < dzis.indexOf('</ScrollView>'),
    'wgląd wyszedł z pozycji kolejki i stoi jako osobna karta — czyli jako siódmy producent');

  // WG-34 — oś pomiarów na GŁĘBOKOŚCI 1. ⛔ Punkt bez czytelnej daty nie jest
  // rysowany: „2026-13-45" na ekranie jest gorsze niż brak punktu.
  check('(B4-4) oś pomiarów (WG-34) rysuje się po rozwinięciu i odrzuca punkty bez czytelnej daty',
    /osWidoczna/.test(dzis) && /dataPoPolsku\(/.test(dzis)
    && /\.filter\(\(p\)[\s\S]{0,120}p\.data !== null\)/.test(dzis),
    'oś stoi na głębokości 0 (hałas przy każdej pozycji) albo wypisuje surowe daty z bazy');

  // ⛔ Powody techniczne („2 pomiary RPE, próg 3") mówią o STANIE NASZYCH
  // DANYCH, a nie o zawodniku. Na ekranie zostaje wyłącznie „lista niepełna",
  // i to tylko przy `nie_wiem` — nie przy `brak_danych`.
  check('(B4-4) `brakDanych` idzie do konsoli, a NIE na ekran',
    /console\.(log|warn|error)\([^)]*brakDanych|for \(const b of wglady\.brakDanych\)/.test(dzis)
    && !/<Text[^>]*>\s*\{[^}]*brakDanych/.test(dzis),
    'techniczne powody braku danych trafiły do zawodnika — to są zdania o nas, nie o nim');

  check('(B4-4) nieodczytane wejście wglądu MÓWI, że lista jest niepełna',
    /wglady\.niepelna/.test(dzis) && /KOLEJKA_NIEPELNA/.test(dzis),
    'wejście wglądu padło, lista jest krótsza i nikt o tym nie mówi — cichy brak');
}

// ═══════════════════════════════════════════════════════════════════
// BRZMIENIA, KTÓRYCH TEN PAS NIE ZATWIERDZA
// ═══════════════════════════════════════════════════════════════════
// Wszystkie zdania samych wglądów przychodzą gotowe z `lib/wgladyZAlgorytmu.ts`
// i czekają na decyzję Kuby. Ekran dokłada TRZY własne (nagłówek trzeciej
// części i dwa stany przełącznika osi) — i one też czekają.
{
  check('znacznik „do przejrzenia przez Kubę" stoi w pliku razem z brzmieniami pasa B4',
    /BRZMIENIE_DO_PRZEJRZENIA_B4\s*=\s*'DO PRZEJRZENIA PRZEZ KUBĘ \(PLAN-D-B4/.test(dzis),
    'zniknął znacznik brzmień — nie da się już powiedzieć, które zdania czekają na decyzję');

  check('ekran NIE PRZEPISUJE zdań wglądu — bierze `doZrobienia` z producenta, nie z własnej stałej',
    /\{wglad\.doZrobienia\}/.test(dzis) && !/const WGLAD_[A-Z_]*TRESC/.test(dzis),
    'ktoś podmienił brzmienie wglądu na ekranie — decyzja o brzmieniu należy do Kuby, nie do wołającego');
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ KONTRAKT IDENTYFIKATORÓW DOMYKA SIĘ NA PRAWDZIWYM RANKERZE
// ═══════════════════════════════════════════════════════════════════
// Wszystko wyżej czyta tekst. Ta sekcja niczego nie czyta: buduje komplet
// wejść, przepuszcza kandydatów przez PRAWDZIWEGO `ulozKolejke` i sprawdza
// rzecz, której nie widać w źródle — czy `id` kandydata przeżywa rankera,
// a więc czy `wgladDlaPozycji(wglady, pozycja.id)` ma prawo cokolwiek znaleźć.
// Gdyby ranker zmienił `id` (albo odrzucił kandydata na bramce), ekran wołałby
// obie funkcje poprawnie i pokazywał trzecią część NIGDY.
{
  const DZIS = '2026-08-14';

  const wejsciaWgladow: WejsciaWgladow = {
    dzis: DZIS,
    dziennik: {
      rodzaj: 'jest',
      dane: [
        { idWiersza: '1', dzien: '2026-08-13', senGodziny: 4.5, rpe: null },
        { idWiersza: '2', dzien: '2026-08-12', senGodziny: 5, rpe: null },
        { idWiersza: '3', dzien: '2026-08-11', senGodziny: 5.5, rpe: null },
        { idWiersza: '4', dzien: '2026-08-13', senGodziny: null, rpe: 8 },
        { idWiersza: '5', dzien: '2026-08-12', senGodziny: null, rpe: 7 },
        { idWiersza: '6', dzien: '2026-08-11', senGodziny: null, rpe: 6 },
      ],
    },
    kalendarz: {
      rodzaj: 'jest',
      dane: [
        { id: '10', dzien: '2026-08-16', rodzaj: 'match', status: 'scheduled', tytul: 'Mecz ligowy' },
        { id: '11', dzien: '2026-08-12', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Sesja' },
        { id: '12', dzien: '2026-08-10', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Sesja' },
      ],
    },
    powiazania: {
      rodzaj: 'jest',
      dane: [{ idWpisu: '1', idWydarzenia: '11' }, { idWpisu: '2', idWydarzenia: null }],
    },
    bol: {
      rodzaj: 'jest',
      dane: [
        { idWiersza: '1', dzien: '2026-08-12', miejsce: 'kolano', intensywnosc: 6, wykluczaZTreningu: false },
        { idWiersza: '2', dzien: '2026-08-10', miejsce: 'kolano', intensywnosc: 5, wykluczaZTreningu: false },
        { idWiersza: '3', dzien: '2026-08-06', miejsce: 'kolano', intensywnosc: 4, wykluczaZTreningu: false },
      ],
    },
    mecze: {
      rodzaj: 'jest',
      dane: [
        { idWiersza: '1', dzien: '2026-08-02', ciezkosc: 8, stanWejscia: 'entered_fatigued' },
        { idWiersza: '2', dzien: '2026-07-26', ciezkosc: 7, stanWejscia: 'entered_fatigued' },
        { idWiersza: '3', dzien: '2026-07-19', ciezkosc: 5, stanWejscia: 'entered_fresh' },
      ],
    },
    profil: {
      rodzaj: 'jest',
      dane: {
        rokUrodzenia: null,
        podpowiedziZaBramkaWieku: 12,
        podpowiedziRazem: 274,
        odcinkowMapyDrogi: 4,
      },
    },
  };

  const wglady = policzWglady(wejsciaWgladow);

  check('komplet danych → producent oddaje kandydatów (inaczej reszta tej sekcji nic nie sprawdza)',
    wglady.kandydaci.length === KLUCZE_WGLADOW.length,
    `kandydatów: ${wglady.kandydaci.length} z ${KLUCZE_WGLADOW.length}; `
    + `braki: ${JSON.stringify(wglady.brakDanych.map((b) => b.klucz))}`);

  // ⚠️ EKRAN PODAJE KANDYDATÓW DOKŁADNIE TAK, JAK JE DOSTAŁ — bez filtrowania.
  const wejscia: WejsciaKolejki = {
    dzis: DZIS,
    glos: { rodzaj: 'brak_wiersza' },
    // ⚠️ `znane` z PUSTĄ listą aktywnych, a nie `nie_odczytane`: chcę mieć
    // pewność, że żaden kandydat nie zniknie z powodu Osłony ani kontuzji.
    // Gdyby zniknął, asercja o przeżyciu `id` przez rankera zapaliłaby się
    // z zupełnie innego powodu, niż mówi jej nazwa.
    ograniczenia: {
      rodzaj: 'znane', aktywne: [], nierozstrzygniete: [], nieznane: [], nieznaneKlucze: [],
    },
    jednaOdpowiedz: {
      coZrobic: { zrodlo: 'brak', tekst: null },
      dlaczego: null,
      coToZmieni: null,
      pokazac: true,
      powod: 'selftest',
    },
    zadania: { rodzaj: 'brak_danych' },
    kalendarz: { rodzaj: 'brak' },
    dziennik: { rodzaj: 'brak' },
    bol: { rodzaj: 'brak' },
    cel: { rodzaj: 'brak' },
    mecz: { rodzaj: 'brak' },
    dodatkowi: wglady.kandydaci,
  };

  const kolejka = ulozKolejke(wejscia);

  check('⭐ ŻADEN kandydat wglądu nie zostaje ODRZUCONY przez bramkę rankera',
    kolejka.odrzucone.length === 0,
    `odrzucone: ${JSON.stringify(kolejka.odrzucone)}`);

  check('⭐ `id` kandydata PRZEŻYWA rankera — bez tego `wgladDlaPozycji` nigdy nic nie znajdzie',
    kolejka.pozycje.length === wglady.kandydaci.length
    && kolejka.pozycje.every((p) => wgladDlaPozycji(wglady, p.id) !== null),
    `pozycje: ${JSON.stringify(kolejka.pozycje.map((p) => p.id))}`);

  check('⭐ każda pozycja wglądu ma NIEPUSTĄ trzecią część — jest co narysować',
    kolejka.pozycje.every((p) => {
      const w = wgladDlaPozycji(kolejka === null ? wglady : wglady, p.id);
      return w !== null && typeof w.doZrobienia === 'string' && w.doZrobienia.trim().length > 0;
    }),
    'pozycja wglądu bez rzeczy do zrobienia — wgląd kończy się na wiedzy (M4)');

  // ⚠️ POZYCJA, KTÓRA NIE JEST WGLĄDEM, MA DOSTAĆ `null` — a nie cudzy wgląd.
  check('pozycja spoza wglądów oddaje `null`, a nie pierwszy lepszy wgląd',
    wgladDlaPozycji(wglady, 'dziennik:2026-08-14') === null,
    'ekran pokaże trzecią część wglądu przy pozycji, która wglądem nie jest');

  // WG-34 — oś istnieje tam, gdzie wgląd JEST osią, i ma czytelne daty.
  const zOsia = wglady.wyniki.filter((w) => w.rodzaj === 'jest' && w.wglad.os.length > 0);
  check('WG-34 — co najmniej jeden wgląd niesie oś pomiarów z datami',
    zOsia.length > 0
    && zOsia.every((w) => w.rodzaj === 'jest' && w.wglad.os.every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.dzien))),
    `wglądów z osią: ${zOsia.length}`);
}

// ═══════════════════════════════════════════════════════════════════
// PLIK, KTÓRY TEN STRAŻNIK CZYTA, NAPRAWDĘ ZAWIERA BADANĄ LOGIKĘ
// ═══════════════════════════════════════════════════════════════════
// Bez tego część asercji przechodziłaby, nie sprawdzając niczego — plik
// istnieje, tylko nie ma już w nim tego, czego pilnujemy.
{
  check('`dzis.tsx` istnieje, importuje producenta wglądów i zawiera badaną logikę',
    dzisSurowe.length > 90_000
    && /from '\.\.\/\.\.\/lib\/wgladyZAlgorytmu'/.test(dzis)
    && dzis.includes('ulozKolejke') && dzis.includes('wezDlaWidoku'),
    `dzis=${dzisSurowe.length}B surowo, ${dzis.length}B bez komentarzy`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
