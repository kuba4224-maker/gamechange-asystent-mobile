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

import { existsSync, readFileSync } from 'node:fs';
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
/**
 * ⭐ PLAN-D-A2 17.08.2026 — SZEŚĆ WEJŚĆ WGLĄDÓW WYPROWADZONYCH Z EKRANU DO `lib/`.
 *
 * Do 16.08.2026 budowały się WYŁĄCZNIE w `load()` w `dzis.tsx` i tam ich
 * szukały asercje (B4-3). Ekran „Moje zadania" woła TEGO SAMEGO rankera
 * i nie miał jak ich zbudować — więc nie pokazywał ani jednego wglądu.
 * Od pasa A2 mieszkają tutaj i mają DWÓCH konsumentów.
 *
 * ⛔ PLIK, KTÓREGO NIE MA, TO FAIL Z NAZWĄ, nie wyjątek `ENOENT` (O76).
 */
const PLIK_WEJSC = 'lib/wejsciaWgladow.ts';

const BRAK_PLIKOW: string[] = [];
function surowe(wzgledna: string): string {
  const p = join(root, wzgledna);
  if (!existsSync(p)) { BRAK_PLIKOW.push(wzgledna); return ''; }
  return readFileSync(p, 'utf8');
}

/**
 * ⭐ PLAN-D-S1 18.08.2026 — GDZIE MIESZKA DZIŚ TRZECIA CZĘŚĆ WGLĄDU.
 *
 * Do 18.08.2026 rysował ją `app/(tabs)/dzis.tsx` i wszystkie asercje (B4-2)
 * i (B4-4) czytały TAMTEN plik. Pas A1 zdjął z „Dziś" komponent `WgladPozycji`
 * razem z 330 dp — i przez jedną rundę wgląd kończył się na WIEDZY, czyli
 * łamał M4, mimo że producent (`lib/wgladyZAlgorytmu.ts`, 81 asercji) liczył
 * wszystkie trzy części poprawnie. ⛔ To był CICHY BRAK: nota A1 §3 wiersz 10
 * kierowała ten blok na „Profil → Skąd to wiemy" i nazywała go „najdroższą
 * rzeczą na tej liście i pierwszą do odzyskania", a nikt go tam nie postawił.
 *
 * ⭐ PAS S1 PRZYWRÓCIŁ RZECZ, a nie osłabił strażnika: rysowanie zostało
 * wyprowadzone do `components/WgladPozycji.tsx` (JEDNA kopia — dokładnie tak,
 * jak zapowiadał nagłówek `components/ListaZadan.tsx`) i wpięte w listę
 * „Moje zadania", czyli WEWNĄTRZ pętli po pozycjach wydanych przez rankera.
 * Lista jest `Modal`-em montowanym z ekranu „Profil", więc kosztuje ZERO dp.
 *
 * ⛔ ASERCJE NIŻEJ SĄ RÓWNIE MOCNE: pytają o te same kształty (`<Text>` z
 * `doZrobienia`, montaż karmiony `wgladDlaPozycji`, oś z datą, wartością
 * i jednostką, zakaz przepisywania zdań producenta) — tylko w miejscu,
 * w którym te kształty dziś stoją.
 */
const PLIK_RYSUJACY = 'components/WgladPozycji.tsx';
/** Ekran, który MONTUJE rysowanie wewnątrz pętli po pozycjach rankera. */
const PLIK_MONTUJACY = 'components/ListaZadan.tsx';

const dzisSurowe = surowe(PLIK_DZIS);
const dzis = bezKomentarzy(dzisSurowe);
const wejsciaSurowe = surowe(PLIK_WEJSC);
const wejscia = bezKomentarzy(wejsciaSurowe);
const rysujacySurowe = surowe(PLIK_RYSUJACY);
const rysujacy = bezKomentarzy(rysujacySurowe);
const montujacySurowe = surowe(PLIK_MONTUJACY);
const montujacy = bezKomentarzy(montujacySurowe);

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
  check('(B4-2) ekran, który rysuje pozycje kolejki, woła `wgladDlaPozycji`',
    /\bwgladDlaPozycji\(/.test(montujacy),
    `trzecia część wglądu nie ma jak wyjść z producenta — wgląd kończy się na wiedzy (M4). `
    + `Szukane w ${PLIK_MONTUJACY}`);

  check('(B4-2) `wgladDlaPozycji` pyta o pozycję Z LISTY, po jej `id` — nie o wgląd wybrany na sztywno',
    /wgladDlaPozycji\(\s*wglady\s*,\s*p\.id\s*\)/.test(montujacy),
    'ekran nie łączy wglądu z POZYCJĄ, którą właśnie rysuje — pokaże trzecią część przy cudzym wierszu');

  // ⛔ ZAPADKA NA RÓWNOŚĆ: rysowanie trzeciej części ma w produkcie DOKŁADNIE
  // JEDNĄ kopię. Dwie kopie rozjeżdżają się przy pierwszej poprawce brzmienia,
  // a zero kopii to stan sprzed tego pasa.
  const KOPII_RYSOWANIA_18_08_2026 = 1;
  const kopieRysowania = ['app/(tabs)/dzis.tsx', 'components/ListaZadan.tsx',
    'components/PozycjaKolejkiCard.tsx', 'components/WgladPozycji.tsx', 'app/(tabs)/ja.tsx']
    .filter((f) => /\{\s*wglad\.doZrobienia\s*\}/.test(bezKomentarzy(surowe(f))));
  check(`(B4-2) ⭐ trzecia część wglądu ma DOKŁADNIE ${KOPII_RYSOWANIA_18_08_2026} kopię rysowania (O73)`,
    kopieRysowania.length === KOPII_RYSOWANIA_18_08_2026,
    `rysują ją: ${kopieRysowania.join(', ') || 'ŻADEN PLIK'} — zero znaczy, że wgląd znowu kończy `
    + 'się na wiedzy; dwa znaczą dwie kopie brzmienia, które rozjadą się po cichu');
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

  check('⛔ (B4-3) każdy plik z listy strażnika istnieje i daje się odczytać (O76)',
    BRAK_PLIKOW.length === 0,
    `NIE MA TYCH PLIKÓW: ${BRAK_PLIKOW.join(', ')} — zmieniła się nazwa albo miejsce. `
    + 'Popraw listę w tym pliku ALBO przywróć plik; do tego czasu asercje niżej '
    + 'czytają PUSTY tekst i nie znaczą nic.');

  check('(B4-3) sekcja „WEJŚCIA WGLĄDÓW" istnieje i da się ją wskazać znacznikami',
    sekcja !== null && sekcja.length > 200,
    'znaczników POCZĄTEK/KONIEC nie ma — nie da się powiedzieć, gdzie powstają wejścia wglądów');

  check('(B4-3) ⭐ w sekcji wejść wglądów nie ma ani jednego `?? []` / `|| []`',
    sekcja !== null && !/\?\?\s*\[\s*\]/.test(sekcja) && !/\|\|\s*\[\s*\]/.test(sekcja),
    'wejście wglądu skleja „nie udało się odczytać" z „nic nie masz" — producent traci rozróżnienie R5');

  // ⭐ PLAN-D-A2 17.08.2026 — TRZY ASERCJE NIŻEJ CZYTAJĄ TERAZ `lib/wejsciaWgladow.ts`.
  //
  // ⚠️ POPRAWIONE ZOSTAŁY ASERCJE, NIE KOD, i powód jest jeden: reguła się nie
  // zmieniła, ZMIENIŁO SIĘ MIEJSCE, W KTÓRYM MIESZKA. Do 16.08 pięć wywołań
  // `wejscieZOdpowiedzi` i trzy gałęzie `nie_wiem` profilu stały w środku
  // `load()` w `dzis.tsx`; asercja szukała ich tam i miała rację. Po pasie A2
  // stoją w `lib/`, bo woła je także ekran „Moje zadania". Asercja szukająca
  // ich dalej w `dzis.tsx` pilnowałaby MIEJSCA, a nie reguły — i zapaliłaby
  // się na zmianie, która tę regułę wzmacnia (jedna kopia zamiast dwóch).
  //
  // ⛔ ZERO `?? []` OBOWIĄZUJE TERAZ CAŁY TAMTEN PLIK, nie tylko sekcję.
  check('(B4-3) ⭐ w `lib/wejsciaWgladow.ts` nie ma ani jednego `?? []` / `|| []`',
    wejscia.length > 0 && !/\?\?\s*\[\s*\]/.test(wejscia) && !/\|\|\s*\[\s*\]/.test(wejscia),
    'wejście wglądu skleja „nie udało się odczytać" z „nic nie masz" — producent traci rozróżnienie R5');

  check('(B4-3) pięć wejść listowych powstaje JEDYNĄ drogą — przez `wejscieZOdpowiedzi`, które widzi `error`',
    (wejscia.match(/wejscieZOdpowiedzi</g) || []).length >= 5,
    'ktoś zbudował wejście z samej `data`, z pominięciem błędu odczytu');

  // PROFIL nie jest listą, więc nie przechodzi przez `wejscieZOdpowiedzi` —
  // i właśnie dlatego jest jedynym miejscem, w którym trzeba sprawdzić `error`
  // ręcznie. Trzy odpowiedzi, trzy jawne gałęzie `nie_wiem`.
  check('(B4-3) wejście `profil` sprawdza błąd KAŻDEJ z trzech odpowiedzi, z których powstaje',
    /profilRes\.error/.test(wejscia) && /katalogRes\.error/.test(wejscia) && /odcinkiRes\.error/.test(wejscia),
    'błąd jednej z trzech odpowiedzi zamienia się w „nic Cię nie kosztuje brak rocznika" (Z0)');

  // ⛔ ZNALEZISKO 10.9 NOTY B3, ZŁAPANE NA WŁASNYM BRZMIENIU. Bez filtru
  // odbiorcy zdanie mówi zawodnikowi, że traci 18 podpowiedzi — a wszystkie 18
  // bramkowanych wiekiem ma `odbiorca='rodzic'` i nigdy by ich nie zobaczył.
  // To jest nieprawda o zawodniku PRZY ZIELONYCH TESTACH.
  // ⚠️ Filtr JEST TERAZ STAŁĄ w `lib/wejsciaWgladow.ts` i oba ekrany biorą go
  // stamtąd — asercja sprawdza JEGO TREŚĆ, nie napis w jednym ekranie (O88).
  check('(B4-3) ⭐ liczby katalogu liczone Z FILTREM ODBIORCY — inaczej zdanie skłamie zawodnikowi',
    /TABELA_KATALOGU\s*=\s*'component_hints'/.test(wejscia)
    && /KOLUMNA_ODBIORCY\s*=\s*'odbiorca'/.test(wejscia)
    && /ODBIORCY_KATALOGU[^=]*=\s*\[\s*'zawodnik',\s*'oba'\s*\]/.test(wejscia)
    && /\.in\(KOLUMNA_ODBIORCY,\s*\[\s*\.\.\.\s*ODBIORCY_KATALOGU\s*\]\)/.test(dzis),
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
    /<Text[^>]*>\s*\{wglad\.doZrobienia\}\s*<\/Text>/.test(rysujacy),
    `trzecia część wglądu nie trafia do drzewa JSX (${PLIK_RYSUJACY}) — wgląd kończy się `
    + 'na wiedzy mimo zielonych asercji (M4)');

  check('(B4-4) ⭐ ekran NAPRAWDĘ montuje ten komponent, karmiąc go wynikiem `wgladDlaPozycji`',
    /<WgladPozycji\s+wglad=\{wgladDlaPozycji\(/.test(montujacy),
    'komponent istnieje, ale nikt go nie renderuje — martwy kod, który przechodzi każdą asercję na tekst');

  // ⛔ WEWNĄTRZ PĘTLI PO POZYCJACH RANKERA, a nie obok niej. Wgląd rysowany
  // poza pętlą jest siódmym producentem: nie podlega ani wyciszeniu przy
  // kontuzji, ani hamulcowi bólu, ani ścieżce wyjścia.
  // ⚠️ Pętla i montaż stoją w tym samym pliku, ale w DWÓCH funkcjach:
  // `pozycje.map((p) => renderPozycja(p, dzisStr))` woła `renderPozycja`,
  // a montaż stoi w JEJ CIELE. Sprawdzamy więc ciało tej funkcji, a nie
  // odległość znaków — inaczej strażnik pilnowałby układu pliku, nie reguły.
  const cialoWiersza = (() => {
    const od = montujacy.indexOf('const renderPozycja =');
    if (od < 0) return null;
    const koniec = montujacy.indexOf('\n  };', od);
    return koniec < 0 ? null : montujacy.slice(od, koniec);
  })();
  check('(B4-4) ⭐ komponent stoi WEWNĄTRZ pętli po pozycjach kolejki, a nie obok niej',
    cialoWiersza !== null
    && /<WgladPozycji/.test(cialoWiersza)
    && /pozycje\.map\(\s*\(p\)\s*=>\s*renderPozycja\(/.test(montujacy)
    && /<WgladPozycji/.test(montujacy.slice(0, montujacy.indexOf('</Modal>'))),
    cialoWiersza === null
      ? 'nie znajduję ciała `renderPozycja` — nie da się powiedzieć, czy wgląd stoi w pętli'
      : 'wgląd wyszedł z pozycji kolejki i stoi jako osobna karta — czyli jako siódmy producent');

  // WG-34 — oś pomiarów na GŁĘBOKOŚCI 1. ⛔ Punkt bez czytelnej daty nie jest
  // rysowany: „2026-13-45" na ekranie jest gorsze niż brak punktu.
  check('(B4-4) oś pomiarów (WG-34) rysuje się po rozwinięciu i odrzuca punkty bez czytelnej daty',
    /osWidoczna/.test(rysujacy) && /dataPoPolsku\(/.test(rysujacy)
    && /\.filter\(\(p\)[\s\S]{0,120}p\.data !== null\)/.test(rysujacy),
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
  // ⭐ PRZECELOWANE 18.08.2026 (pas S1): znacznik i trzy własne brzmienia pasa
  // B4 przeprowadziły się razem z rysowaniem do `components/WgladPozycji.tsx`.
  // ⚠️ W `dzis.tsx` została ICH MARTWA KOPIA (plik jest dla pasa S1 tylko
  // do odczytu) — dlatego pytamy o plik, który te zdania NAPRAWDĘ rysuje.
  check('znacznik „do przejrzenia przez Kubę" stoi w pliku razem z brzmieniami pasa B4',
    /BRZMIENIE_DO_PRZEJRZENIA_B4\s*=\s*'DO PRZEJRZENIA PRZEZ KUBĘ \(PLAN-D-B4/.test(rysujacy),
    'zniknął znacznik brzmień — nie da się już powiedzieć, które zdania czekają na decyzję');

  check('ekran NIE PRZEPISUJE zdań wglądu — bierze `doZrobienia` z producenta, nie z własnej stałej',
    /\{wglad\.doZrobienia\}/.test(rysujacy) && !/const WGLAD_[A-Z_]*TRESC/.test(rysujacy),
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
