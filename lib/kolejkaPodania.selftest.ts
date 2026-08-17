// PLAN-D-B1 08.2026 (14.08.2026) — NOWY PLIK. STRAŻNIK RANKERA KOLEJKI PODANIA.
//
//   npx tsx lib/kolejkaPodania.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ── PO CO TEN PLIK ISTNIEJE ───────────────────────────────────────────
// `lib/kolejkaPodania.ts` jest pierwszym pasem fundamentu: staną na nim B2
// („Dziś" jako kolejka), B3 (wglądy), C1 (widok tygodnia) i C2 (lista zadań).
// Cicha zmiana reguły w rankerze rozejdzie się po czterech ekranach naraz
// i nikt jej nie zobaczy, bo każdy z nich będzie działał.
//
// ── ⭐ TEN PLIK ŁAMIE KOD CELOWO (sekcja 8) ───────────────────────────
// Cztery mutacje, każda podmienia JEDNĄ regułę na zepsutą i podaje LICZBĘ
// asercji, które się na tym zapaliły. Mutacja, która nie podnosi liczby
// FAIL-i, oznacza test, który niczego nie pilnuje — i taki test trzeba
// napisać od nowa, a nie zgłaszać zielone.
//
// Punktem wpięcia jest drugi argument `ulozKolejke(w, zasady)`. Nie jest to
// furtka do produkcji: ekran woła tę funkcję z jednym argumentem, a strażnik
// w sekcji 7 sprawdza, że domyślne zasady są tymi prawdziwymi.
//
// ⚠️ CZEGO TEN PLIK NIE UDAJE. Nie uruchamia Reacta, nie dotyka Supabase
// i nie wie, czy ekran się rysuje. Sprawdza REGUŁY, które da się zepsuć po
// cichu. Zielony wynik znaczy „reguły nadal obowiązują", nie „appka działa".
//
// ⚠️ ZAKAZ `new URL(...)` (O53) — `tsconfig` ciągnie bibliotekę DOM i kontrola
// typów pada z TS2769. Wzorzec czytania pliku obok stoi niżej.
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75)
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — nazwane liczbą. Ten plik miał 54 ASERCJE i ANI JEDNEJ,
// która czytałaby jakikolwiek EKRAN: `readFileSync` sięgał po `kolejkaPodania.ts`,
// czyli po WŁASNY moduł. Ranker mógł być bezbłędny co do reguły i nierysowany
// albo rysowany z pominięciem reguły — 54 na 54 świeciło na zielono.
//
// ⚠️ TEN STRAŻNIK JEST TEŻ K3: moduł i strażnik powstały w JEDNYM commicie
// `6732ca7` (2026-08-14 18:37), więc testu historycznego „stan sprzed naprawy"
// dla samego rankera nie da się zrobić — dowód idzie mutacją ekranu (O77).
//
// ⚠️ CZEGO TA SEKCJA ŚWIADOMIE NIE POWTARZA. Ekranu „Dziś" wobec rankera pilnuje
// już `lib/kolejkaNaDzis.selftest.ts` (32 asercje, pas B2/I1): że `dzis.tsx` nie
// sortuje, woła `ulozKolejke` i `wezDlaWidoku`, rozróżnia trzy stany kolejki
// i naprawdę rysuje pozycje. Powtórzenie tego tutaj dałoby DWA liczniki tej samej
// rzeczy. Sekcja 0-EK niżej dokłada to, czego tamten strażnik NIE MA:
//   • `components/ListaZadan.tsx` — DRUGI producent kolejki, zero asercji u B2;
//   • że ekrany rysują `dlaczego` i `ileZajmieSekund` Z POZYCJI, a nie własnym
//     tekstem — i że da się to zepsuć skasowaniem, nie tylko podmianą;
//   • że wagi i brzmienia milczenia nie mają na ekranie drugiej kopii.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DOMYSLNA_LICZBA,
  MILCZENIE_BOL,
  MILCZENIE_KONTUZJA,
  MILCZENIE_OSLONA,
  MILCZENIE_SCIEZKA_WYJSCIA,
  PREMIE,
  PROG_TERAZ,
  WAGA_BAZOWA,
  ZASADY,
  czyPrawdziwySlad,
  dzienNaLiczbe,
  glosWspiera,
  kubelekDla,
  liczbaNaDzien,
  odstepDni,
  slad,
  ulozKolejke,
  wezDlaWidoku,
  wezKubelek,
  // ⭐ PAS B2 16.08.2026 — zwijanie powtórzeń (sekcja 9b rankera).
  kluczZwijania,
  zwinPowtorzenia,
} from './kolejkaPodania';
import type {
  Kandydat,
  Kolejka,
  Milczenie,
  PozycjaKolejki,
  Slad,
  WejsciaKolejki,
  // ⭐ PAS B2 — kształt wiersza `calendar_events` w wejściu rankera.
  WydarzenieKalendarza,
  Zasady,
} from './kolejkaPodania';
import { czytajOgraniczenia } from './ograniczenia';
import type { StanOgraniczen } from './ograniczenia';
import { odczytZadan } from './zadania';
import type { OdczytZadan } from './zadania';
import type { StanGlosu } from './glosTygodnia';
import type { JednaOdpowiedz } from './jednaOdpowiedz';
// ⭐ PAS B2 — PRAWDZIWY producent wglądów, nie replika. Asercja imienna D7
// mierzy POZYCJĘ WGLĄDU `brak_roku_urodzenia`, więc wgląd musi być TYM,
// który produkt naprawdę liczy; kandydat przepisany ręcznie do tego pliku
// sprawdzałby wyłącznie, że przepisałem go zgodnie z tym, co przepisałem (O56).
import { policzWglady } from './wgladyZAlgorytmu';

const katalog = dirname(fileURLToPath(import.meta.url));

/**
 * Źródło BEZ komentarzy — ten sam wzorzec co `lib/ostatniCentymetr.selftest.ts`.
 * ⚠️ NIE JEST TO OZDOBNIK: nagłówek `kolejkaPodania.ts` CYTUJE zakazane wyrażenia
 * („⛔ NIE CZYTA ZEGARA. Ani `Date.now()`…"). Strażnik czytający surowy tekst
 * zapalałby się na własnej dokumentacji, więc jedynym sposobem, żeby go uciszyć,
 * byłoby usunięcie wyjaśnienia — czyli tej wiedzy, dla której powstał.
 */
const bezKomentarzy = (s: string): string => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .join('\n');

const ZRODLO_SUROWE = readFileSync(join(katalog, 'kolejkaPodania.ts'), 'utf8');
const ZRODLO = bezKomentarzy(ZRODLO_SUROWE);

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string): void {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

console.log('kolejkaPodania.selftest.ts — strażnik rankera (pas B1)\n');

// ═════════════════════════════════════════════════════════════════════
// ⭐ 0-EK. PAS I2 16.08.2026 — EKRANY, KTÓRE RYSUJĄ KOLEJKĘ (K4 / O75)
// ═════════════════════════════════════════════════════════════════════
// Wszystkie asercje niżej czytają ŹRÓDŁA EKRANÓW, nie moduł. Bez nich 54
// asercje tego pliku opisują kolejność, której nikt nie musi narysować.
{
  const root = dirname(katalog);

  /**
   * ⛔ BRAK PLIKU JEST FAIL-em Z NAZWĄ, nie wyjątkiem `ENOENT` (O76).
   * Strażnik, który pada przed pierwszą asercją, w CI wygląda jak awaria
   * narzędzia — a jest EKRANEM, KTÓRY ZNIKNĄŁ Z REPOZYTORIUM.
   */
  const BRAK_PLIKOW: string[] = [];
  const surowe = (wzgledna: string): string => {
    const p = join(root, wzgledna);
    if (!existsSync(p)) { BRAK_PLIKOW.push(wzgledna); return ''; }
    return readFileSync(p, 'utf8');
  };

  const PLIK_DZIS = 'app/(tabs)/dzis.tsx';
  const PLIK_LISTA = 'components/ListaZadan.tsx';
  const PLIK_KARTA = 'components/PozycjaKolejkiCard.tsx';
  const dzis = bezKomentarzy(surowe(PLIK_DZIS));
  const lista = bezKomentarzy(surowe(PLIK_LISTA));
  const karta = bezKomentarzy(surowe(PLIK_KARTA));

  console.log('0-EK. EKRANY, KTÓRE RYSUJĄ KOLEJKĘ (K4 / O75)');

  check('⛔ (I2-0) każdy ekran z listy strażnika istnieje i daje się odczytać',
    BRAK_PLIKOW.length === 0,
    `NIE MA TYCH PLIKÓW: ${BRAK_PLIKOW.join(', ')} — zmieniła się nazwa albo miejsce ekranu. `
    + 'Popraw listę w tym pliku ALBO przywróć ekran; do tego czasu asercje niżej '
    + 'czytają PUSTY tekst i nie znaczą nic.');

  // ── Odkrywanie z katalogu, nie lista na sztywno (O69) ──
  const POMIN_KAT = new Set(['_diag_backup', 'node_modules', '.git', '.expo', 'assets']);
  function chodz(kat: string, out: string[] = []): string[] {
    if (!existsSync(kat)) return out;
    for (const wpis of readdirSync(kat)) {
      if (POMIN_KAT.has(wpis)) continue;
      const p = join(kat, wpis);
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

  // ⚠️ NIE „kto importuje" (tego pilnuje już strażnik B2), tylko KTO UKŁADA
  // KOLEJKĘ. To jest pytanie rankera o siebie: ile jest w produkcie miejsc,
  // w których powstaje kolejność. Import typu `PozycjaKolejki` nie tworzy
  // kolejności; `ulozKolejke(` tworzy.
  const producenci = EKRANY.filter(
    (p) => /\bulozKolejke\s*\(/.test(bezKomentarzy(readFileSync(join(root, p), 'utf8')))).sort();
  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c`, nie przepisane z pamięci.
  // RÓWNOŚĆ, nie „≥ 1" (O73): „co najmniej jeden producent" przeszłoby także
  // wtedy, gdy lista zadań przestanie układać kolejkę i zostanie sam ekran „Dziś".
  const PRODUCENCI = [PLIK_DZIS, PLIK_LISTA].sort();
  const brakujacy = PRODUCENCI.filter((p) => !producenci.includes(p));
  const nadmiarowi = producenci.filter((p) => !PRODUCENCI.includes(p));
  check('⭐ (I2-0) kolejkę UKŁADAJĄ dokładnie te dwa ekrany, co 16.08 — RÓWNOŚĆ, nie „≥ 1" (O73)',
    brakujacy.length === 0 && nadmiarowi.length === 0,
    `BRAKUJE: ${brakujacy.join(', ') || '—'} · NADMIAROWI: ${nadmiarowi.join(', ') || '—'} `
    + '→ ubył: zawodnik przestał gdzieś widzieć kolejność z rankera i widzi tam własną kolejność '
    + 'ekranu albo nic; doszedł: sprawdź, czy nowe miejsce podaje KOMPLET wejść — ranker liczony '
    + 'na wejściach niepełnych oddaje krótszą listę i wygląda przy tym poprawnie.');

  // ── (I2-0a) LISTA ZADAŃ NIE UKŁADA WŁASNEJ KOLEJNOŚCI ──
  // Defekt, którego pilnuje: ktoś uznaje, że „na liście zadań to powinno stać
  // wyżej", i dokłada `sort` tutaj. Od tej chwili ta sama pozycja ma na dwóch
  // ekranach dwa różne miejsca, oba zielone. Kolejność, która się nie podoba,
  // jest ZGŁOSZENIEM DO PASA B1, nie powodem, żeby ekran znów liczył sam.
  check('⛔ (I2-0) `ListaZadan.tsx` nie sortuje niczego — ani jednego `.sort(`',
    lista.length > 0 && !lista.includes('.sort('),
    'lista zadań układa własną kolejność; kolejność ustala WYŁĄCZNIE lib/kolejkaPodania.ts, '
    + 'a zawodnik dostaje wtedy dwie różne odpowiedzi na pytanie „co najpierw"');

  check('⛔ (I2-0) `ListaZadan.tsx` nie filtruje ani nie tnie wyniku `wezKubelek`',
    !/wezKubelek\([^)]*\)\s*\.\s*(sort|filter|slice|reverse)\s*\(/.test(lista)
    && !/\bpozycje\s*\.\s*(sort|filter|slice|reverse)\s*\(/.test(lista),
    'ekran wybiera, KTÓRE pozycje kubełka pokazać — a wolno mu wybrać wyłącznie KTÓRY kubełek; '
    + 'wycięta pozycja znika bez śladu i nie ma jak jej zauważyć');

  check('⛔ (I2-0) kubełek liczy `wezKubelek` z modułu — ekran nie porównuje wag u siebie',
    /\bwezKubelek\s*\(/.test(lista) && !/\.waga\b/.test(lista) && !/PROG_TERAZ/.test(lista),
    'na liście zadań pojawił się drugi rachunek kubełka (własny próg albo `pozycja.waga`); '
    + 'dwa progi „Teraz" rozjeżdżają się po cichu i ta sama rzecz trafia u zawodnika '
    + 'raz do „Teraz", raz do „Kiedyś"');

  // ⛔ Kontrakt B1 §8.1: produkcja woła `ulozKolejke` z JEDNYM argumentem.
  // Drugi (`Zasady`) istnieje wyłącznie dla mutacji w sekcji 8 tego pliku.
  // Podany z ekranu znaczy, że ekran ZMIENIA REGUŁY rankera u siebie.
  //
  // ⚠️ ARGUMENTY DZIELONE ZE SKANOWANIEM GŁĘBOKOŚCI, NIE WYRAŻENIEM REGULARNYM.
  // Zmierzone 16.08.2026: pierwsza wersja tej asercji (`!argument.includes(',')`)
  // ZAPALIŁA SIĘ FAŁSZYWIE na mutacji `ulozKolejke({ ...wejscia, dodatkowi: [] })`
  // — jeden argument, a przecinek jest w środku obiektu. Strażnik, który zapala
  // się na poprawnym kodzie, zostaje wyciszony przy pierwszej okazji i wtedy
  // przestaje pilnować czegokolwiek.
  const argumentyWywolan = (src: string, nazwa: string): string[][] => {
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
  };
  const argiListy = argumentyWywolan(lista, 'ulozKolejke');
  check('⛔ (I2-0) `ListaZadan.tsx` woła `ulozKolejke` z JEDNYM argumentem — bez podmiany zasad',
    argiListy.length > 0 && argiListy.every((a) => a.length === 1),
    `wywołania na liście zadań: ${JSON.stringify(argiListy)} — drugi argument (\`Zasady\`) znaczy, `
    + 'że ekran ma własną kopię reguł rankera, tylko schowaną głębiej niż `sort`: kolejność '
    + 'na liście zadań przestaje wtedy być tą samą kolejnością, którą zawodnik widzi na „Dziś"');

  // ── (I2-0b) WAGI I BRZMIENIA MAJĄ JEDNO ŹRÓDŁO ──
  // Defekt, którego pilnuje: `wagaBazowa: 1000` wpisane wprost na ekranie.
  // Liczba przestaje wtedy zależeć od `WAGA_BAZOWA` i pierwsza zmiana tabeli
  // wag ominie ten jeden producent — kolejność zmieni się wszędzie oprócz niego.
  const wagiNaEkranach = [...dzis.matchAll(/wagaBazowa:\s*([^,\n]+)/g)].map((m) => m[1].trim())
    .concat([...lista.matchAll(/wagaBazowa:\s*([^,\n]+)/g)].map((m) => m[1].trim()));
  check('⛔ (I2-0) każda `wagaBazowa` na ekranie pochodzi z `WAGA_BAZOWA`, nie z liczby wpisanej ręcznie',
    wagiNaEkranach.length > 0 && wagiNaEkranach.every((w) => w.startsWith('WAGA_BAZOWA.')),
    `wartości \`wagaBazowa\` na ekranach: ${JSON.stringify(wagiNaEkranach)} — liczba wpisana wprost `
    + 'jest drugą kopią tabeli wag; po zmianie `WAGA_BAZOWA` ten producent zostanie na starej '
    + 'wadze i wskoczy zawodnikowi w niewłaściwe miejsce listy');

  check('⛔ (I2-0) ekrany nie trzymają własnych progów kubełka ani własnej tabeli premii',
    !/PROG_TERAZ\s*=/.test(dzis) && !/PROG_W_TYM_TYGODNIU\s*=/.test(dzis)
    && !/PROG_TERAZ\s*=/.test(lista) && !/const\s+PREMIE\s*=/.test(dzis + lista),
    'ekran dorobił sobie próg albo premię — od tej chwili ranker i ekran liczą tę samą '
    + 'kolejność dwoma tabelami i nikt nie zobaczy, kiedy się rozjadą');

  // Brzmienia milczenia pochodzą ZE STAŁYCH MODUŁU, a na ekranie NIE STOI ICH KOPIA.
  // ⚠️ Porównanie idzie z WARTOŚCIĄ zaimportowanej stałej, nie z tekstem przepisanym
  // do tego pliku — inaczej strażnik pilnowałby własnej kopii zdania.
  const KOPIE_MILCZENIA = [
    MILCZENIE_SCIEZKA_WYJSCIA, MILCZENIE_KONTUZJA, MILCZENIE_OSLONA, MILCZENIE_BOL,
  ].flatMap((m) => [m.powod, m.warunekPowrotu])
    .filter((z) => dzis.includes(z) || lista.includes(z) || karta.includes(z));
  check('⛔ (I2-0) na ekranach NIE STOI kopia zdania o milczeniu — każde wychodzi ze stałej modułu',
    KOPIE_MILCZENIA.length === 0 && /MILCZENIE_SCIEZKA_WYJSCIA\./.test(lista),
    `przepisane zdania: ${JSON.stringify(KOPIE_MILCZENIA)} — kopia rozjedzie się z oryginałem `
    + 'przy pierwszej poprawce brzmienia i zawodnik przeczyta na dwóch ekranach dwa różne powody '
    + 'tego samego wyciszenia; albo lista zadań przestała w ogóle mówić, dlaczego milczy');

  // ── ⭐ (I2-0c) ZAPADKA NA SKASOWANIE ──
  // Wszystko powyżej spełnia też ekran, który NIC NIE RYSUJE: bez `.sort`, bez
  // własnych progów, bez kopii zdań — i bez ani jednej pozycji. Te dwie asercje
  // wymagają, żeby pola pozycji NAPRAWDĘ szły do widoku.
  check('⭐ (I2-0) karta pozycji RYSUJE `dlaczego` i `ileZajmieSekund` Z POZYCJI, nie własnym tekstem',
    /\{pozycja\.dlaczego\}/.test(karta)
    && /opiszCzas\(pozycja\.ileZajmieSekund\)/.test(karta)
    && /\{\[termin, czas\]/.test(karta),
    'zniknęło rysowanie uzasadnienia albo czasu z pozycji kolejki — zawodnik czyta wtedy '
    + 'samo „co", bez „dlaczego akurat to" (a to jest cała różnica między poleceniem '
    + 'a podaniem), albo widzi czas policzony gdzie indziej niż w rankerze');

  check('⭐ (I2-0) `ListaZadan.tsx` NAPRAWDĘ montuje `PozycjaKolejkiCard` w trzech kubełkach',
    /<PozycjaKolejkiCard\s/.test(lista) && /pozycje\.map\(/.test(lista)
    && /teraz:\s*true/.test(lista) && /kiedys:\s*false/.test(lista),
    'lista zadań przestała rysować pozycje albo dorobiła się własnego wiersza — pięć asercji '
    + 'wyżej spełnia też lista, która nie pokazuje ani jednego zadania, a strażnik nagradzałby '
    + 'wtedy skasowanie funkcji');

  // ── ⭐ (I2-0d) ZAPADKA POMIAROWA NA ZNANE ZNALEZISKO ──
  // ⚠️ TO NIE JEST NAPRAWA I NIE MA NIĄ BYĆ. Zmierzone 16.08.2026 na `123e09c`:
  // `ListaZadan.tsx` woła `ulozKolejke(dane.wejscia)` BEZ pola `dodatkowi`
  // i z `jednaOdpowiedz: null`. Skutek, nazwany: do listy zadań nie dochodzi
  // ANI JEDEN wgląd z `lib/wgladyZAlgorytmu.ts` (sześć producentów), ani „jedna
  // odpowiedź" pasa T. Zawodnik widzi na „Dziś" pozycję, której na „Moich
  // zadaniach" nie ma — i nie ma jak się dowiedzieć, że jej tam brakuje.
  // Powód stoi w nagłówku `ListaZadan.tsx` (drugi producent tych samych pozycji
  // byłby gorszy), kontrakt naprawy — w nocie przekazania C2.
  // Ta asercja PILNUJE STANU, nie go poprawia: dzień, w którym `dodatkowi`
  // dojdzie do listy, ZAPALA ją z poleceniem skreślenia tego długu.
  // ⭐ PLAN-D-A2 16.08.2026 — DŁUG SKREŚLONY, ASERCJA ODWRÓCONA.
  //
  // Do 16.08.2026 stała tu asercja PILNUJĄCA DŁUGU: „lista zadań nadal woła
  // rankera BEZ `dodatkowi`", z poleceniem skreślenia jej w dniu, w którym
  // `dodatkowi` dojdzie. Ten dzień nastał — pas A2 wpiął wglądy w listę.
  // ⚠️ POPRAWIONA ZOSTAŁA ASERCJA, NIE KOD: stary warunek opisywał stan
  // sprzed pasa i był PRAWDZIWY dokładnie tak długo, jak długo zawodnik nie
  // widział na tej liście ani jednego wglądu.
  //
  // ⛔ NOWA ASERCJA PILNUJE CZEGOŚ MOCNIEJSZEGO NIŻ SAMO SŁOWO `dodatkowi`:
  // że kandydaci idą DO RANKERA, a nie obok niego. Asercja na sam napis
  // przepuściłaby `dodatkowi: []` — czyli pole, które jest, i wglądy, których
  // nadal nie ma (dokładnie ten defekt nazwany w poleceniu A2 §A2.3).
  const listaPodajeKandydatow = /dodatkowi\.push\(\s*\.\.\.\s*wglady\.kandydaci\s*\)/.test(lista);
  const listaMaJednaOdpowiedz = !/jednaOdpowiedz:\s*null/.test(lista);
  console.log('[pomiar] 17.08.2026, po pasie A2 — components/ListaZadan.tsx: '
    + `kandydaci wglądów → dodatkowi = ${listaPodajeKandydatow ? 'TAK' : 'NIE'} · `
    + `jednaOdpowiedz = ${listaMaJednaOdpowiedz ? 'JEST' : 'null'} · `
    + `producenci kolejki w repo = ${producenci.length} [${producenci.join(', ')}]`);

  check('⭐ (A2-0) lista zadań PODAJE kandydatów wglądów RANKEROWI, przez `dodatkowi`',
    listaPodajeKandydatow,
    'ubyło wpięcie wglądów w listę „Moje zadania" — wgląd znów jest policzony, poprawny, '
    + 'przechodzi bramkę rankera i NIE MA WIDOKU, KTÓRY BY GO WYDAŁ. ⚠️ Sam napis `dodatkowi` '
    + 'to za mało: `dodatkowi: []` wygląda tak samo i nie pokazuje niczego.');

  check('⭐ (A2-0) lista NIE FILTRUJE i NIE TNIE kandydatów przed rankerem (WG-32)',
    !/wglady\.kandydaci\s*\.\s*(filter|slice|sort|reverse)\s*\(/.test(lista),
    'ekran wybiera, który wgląd wpuścić do kolejki — wyciszony wgląd znika wtedy bez powodu '
    + 'milczenia, czyli dokładnie tak, jak zakazuje WG-32, i znika NIEWIDOCZNIE dla testów');

  // ⛔ D2 pasa A2: `jednaOdpowiedz` na tej liście ZOSTAJE `null`. To nie jest
  // dług — to jest stan uczciwy, opisany w kontrakcie B1 jako „ekran jej nie
  // policzył". Odtworzenie jej tutaj byłoby drugim producentem pozycji nr 1.
  check('⛔ (A2-0) `jednaOdpowiedz` na liście zadań nadal `null` — bez drugiego producenta pozycji nr 1',
    !listaMaJednaOdpowiedz,
    'ktoś zaczął budować „jedną odpowiedź" także tutaj — a buduje ją `zbudujJednaOdpowiedz` '
    + 'z ośmiu wejść ekranu „Dziś". Druga, niedokładna kopia daje zawodnikowi DWIE RÓŻNE '
    + 'odpowiedzi na to samo pytanie, na dwóch ekranach.');
}

// ═════════════════════════════════════════════════════════════════════
// 0. WEJŚCIA TESTOWE
// ═════════════════════════════════════════════════════════════════════
// ⚠️ Budowane PRAWDZIWYMI czytnikami (`czytajOgraniczenia`, `odczytZadan`),
// nie ręcznymi literałami. Atrapa przyjmująca wszystko sprawdza tylko, że kod
// wpisał to, co kod wpisał (O56).

const DZIS = '2026-08-14';

function kopertaZ(aktywne: string[]): StanOgraniczen {
  return czytajOgraniczenia({
    wersja: 1,
    aktywne,
    nieznane_ograniczenia: [],
    nieznane: [],
  });
}

const KOPERTA_PUSTA = kopertaZ([]);
const KOPERTA_EXIT = kopertaZ(['wszystkoMilczy', 'systemMilczyOCelach', 'blokNieZwiekszaObjetosci']);
const KOPERTA_KONTUZJA = kopertaZ(['systemMilczyOCelach', 'blokNieZwiekszaObjetosci']);
const KOPERTA_OSLONA = kopertaZ(['blokNieZwiekszaObjetosci']);
const KOPERTA_NIEODCZYTANA = czytajOgraniczenia(undefined, 'timeout połączenia');

const GLOS_BLOK: StanGlosu = {
  rodzaj: 'glos', voice: 'block', tytul: '', tresc: '',
  powod: 'aktywnych Bloków: 1 — głos domyślny tygodnia', mowi: true,
};
const GLOS_MILCZY: StanGlosu = {
  rodzaj: 'glos', voice: 'block', tytul: '', tresc: '',
  powod: 'aktywnych Bloków: 1 — głos domyślny tygodnia', mowi: false,
};
const GLOS_CISZA: StanGlosu = { rodzaj: 'cisza', powod: 'nic do powiedzenia w tym tygodniu' };
const GLOS_NIE_WIEM: StanGlosu = { rodzaj: 'nie_wiem', powod: 'nie odczytałem głosu tygodnia: 500' };

/** Wiersz `player_tasks` — kolumny i wartości jeden do jednego z bazą (zmierzone 14.08.2026). */
function wierszZadania(nadpisz: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Zamów wizytę u fizjo',
    reason_fact: 'Kolano boli od 5 dni',
    reason_text: 'zapisałeś to trzy razy w tym tygodniu.',
    reason_register: 'fakt_o_tobie',
    reason_key: 'bol_utrzymuje_sie',
    origin: 'journal',
    source_table: 'pain_entries',
    source_row_id: '22222222-2222-4222-8222-222222222222',
    effort_seconds: 120,
    due_on: null,
    state: 'open',
    state_changed_at: null,
    raised_at: null,
    system_key: 'bol_kolano:2026-W33',
    created_at: '2026-08-12T09:00:00+00:00',
    ...nadpisz,
  };
}

function zadaniaZ(wiersze: Record<string, unknown>[]): OdczytZadan {
  return odczytZadan({ data: wiersze, error: null });
}

const JEDNA_ODPOWIEDZ: JednaOdpowiedz = {
  coZrobic: { zrodlo: 'blok', tekst: 'Nowa porcja w Twoim Bloku' },
  dlaczego: 'Pomaga Ci przy: Wytrzymałość',
  coToZmieni: null,
  pokazac: true,
  powod: 'źródło: aktywny Blok — czeka nieotwarta porcja treści',
};

function wejscia(nadpisz: Partial<WejsciaKolejki> = {}): WejsciaKolejki {
  return {
    dzis: DZIS,
    glos: GLOS_BLOK,
    ograniczenia: KOPERTA_PUSTA,
    jednaOdpowiedz: JEDNA_ODPOWIEDZ,
    zadania: zadaniaZ([wierszZadania()]),
    kalendarz: { rodzaj: 'brak' },
    dziennik: { rodzaj: 'brak' },
    bol: { rodzaj: 'brak' },
    cel: { rodzaj: 'jest', dane: { segmentCelu: 'wytrzymalosc', maAktywnyBlok: true } },
    mecz: { rodzaj: 'brak' },
    ...nadpisz,
  };
}

/** Kandydat z prawdziwym śladem — do testów kolejności i wyciszenia. */
function kandydat(nadpisz: Partial<Kandydat> = {}): Kandydat {
  return {
    id: 'wglad:test',
    co: 'Dołóż jedną jednostkę w tym tygodniu',
    dlaczego: null,
    ileZajmieSekund: null,
    skadToWiemy: slad({
      rejestr: 'propozycja', skad: 'daily_logs', idWiersza: '13', klucz: 'journal',
    }),
    wagaBazowa: WAGA_BAZOWA.wglad,
    zrodlo: 'wglad',
    rodzajPracy: 'wiecej_objetosci',
    podniesioneRecznie: false,
    termin: null,
    godzina: null,
    ...nadpisz,
  };
}

const idy = (p: PozycjaKolejki[]): string => p.map((x) => x.id).join('|');

// ═════════════════════════════════════════════════════════════════════
// BATERIA — asercje, które muszą zapalać się przy mutacjach (sekcja 8)
// ═════════════════════════════════════════════════════════════════════
// ⚠️ TO JEST SEDNO TEGO PLIKU. Ta sama bateria idzie raz na PRAWDZIWYCH
// zasadach (musi dać zero FAIL-i) i cztery razy na ZEPSUTYCH (każda mutacja
// musi dać co najmniej jeden FAIL). Bateria, która nie zapala się na żadnej
// mutacji, jest zbiorem zdań, nie strażnikiem.

type Wynik = { label: string; ok: boolean; detail: string };

function bateria(zasady: Zasady): Wynik[] {
  const w: Wynik[] = [];
  const test = (label: string, cond: boolean, detail: string): void => {
    w.push({ label, ok: cond, detail });
  };
  const uloz = (we: WejsciaKolejki): Kolejka => ulozKolejke(we, zasady);

  // ── B-1. Z0: POZYCJA BEZ ŹRÓDŁA NIE POWSTAJE ──────────────────────
  {
    const podrobiony = kandydat({
      id: 'wglad:podrobiony',
      // ⚠️ Obiekt UDAJĄCY ślad: ma pola, nie ma znaku z `slad()`. Dokładnie to,
      // co powstaje, gdy ktoś napisze `{ skad: 'system' } as Slad`.
      skadToWiemy: { rejestr: 'propozycja', skad: 'system', klucz: 'x', idWiersza: null } as unknown as Slad,
    });
    const k = uloz(wejscia({ dodatkowi: [podrobiony] }));
    test(
      'Z0 — kandydat z podrobionym śladem NIE wchodzi do kolejki',
      !k.pozycje.some((p) => p.id === 'wglad:podrobiony'),
      `pozycje: ${idy(k.pozycje)}`,
    );
    test(
      'Z0 — odrzucony kandydat jest POLICZONY, nie zniknięty po cichu',
      k.odrzucone.some((o) => o.id === 'wglad:podrobiony' && o.powod.length > 0),
      `odrzucone: ${JSON.stringify(k.odrzucone)}`,
    );
    test(
      'Z0 — każda pozycja w kolejce ma PRAWDZIWY ślad źródłowy',
      k.pozycje.every((p) => czyPrawdziwySlad(p.skadToWiemy)),
      k.pozycje.map((p) => `${p.id}:${String(czyPrawdziwySlad(p.skadToWiemy))}`).join(', '),
    );
    const pusty = kandydat({ id: 'wglad:bez_zrodla', skadToWiemy: null });
    const k2 = uloz(wejscia({ dodatkowi: [pusty] }));
    test(
      'Z0 — kandydat z `skadToWiemy: null` też jest odrzucony z powodem',
      !k2.pozycje.some((p) => p.id === 'wglad:bez_zrodla')
        && k2.odrzucone.some((o) => o.id === 'wglad:bez_zrodla'),
      `pozycje: ${idy(k2.pozycje)} · odrzucone: ${JSON.stringify(k2.odrzucone)}`,
    );
  }

  // ── B-2. ARBITER: PRZEGRANA POZYCJA JEST WIDOCZNA Z POWODEM ───────
  {
    const k = uloz(wejscia({ ograniczenia: KOPERTA_EXIT, dodatkowi: [kandydat()] }));
    test(
      'arbiter — przy ścieżce wyjścia pozycje NIE ZNIKAJĄ z kolejki',
      k.pozycje.length > 0,
      `pozycji: ${k.pozycje.length}`,
    );
    test(
      'arbiter — przy ścieżce wyjścia KAŻDA pozycja milczy',
      k.pozycje.every((p) => p.milczy !== null),
      k.pozycje.map((p) => `${p.id}:${p.milczy ? 'milczy' : 'MÓWI'}`).join(', '),
    );
    test(
      'arbiter — milczenie ma POWÓD i WARUNEK POWROTU, oba niepuste',
      k.pozycje.every((p) => p.milczy !== null
        && p.milczy.powod.trim().length > 0
        && p.milczy.warunekPowrotu.trim().length > 0),
      JSON.stringify(k.pozycje.map((p) => p.milczy)),
    );
    test(
      'arbiter — ścieżka wyjścia wycisza kolejkę CAŁKOWICIE (zero przypomnień)',
      k.wyciszonaCalkowicie && wezDlaWidoku(k, 'dzis').length === 0,
      `wyciszonaCalkowicie=${String(k.wyciszonaCalkowicie)} · widok dzis: ${wezDlaWidoku(k, 'dzis').length}`,
    );

    const kk = uloz(wejscia({
      ograniczenia: KOPERTA_KONTUZJA,
      dodatkowi: [
        kandydat({ id: 'wglad:cel', rodzajPracy: 'praca_nad_celem' }),
        kandydat({ id: 'wglad:zdrowie', rodzajPracy: 'zdrowie' }),
      ],
    }));
    const cel = kk.pozycje.find((p) => p.id === 'wglad:cel');
    const zdrowie = kk.pozycje.find((p) => p.id === 'wglad:zdrowie');
    test(
      'arbiter — kontuzja wycisza pracę nad celem, ale NIE rzecz o ciele',
      cel?.milczy !== null && cel?.milczy !== undefined && zdrowie?.milczy === null,
      `cel: ${JSON.stringify(cel?.milczy)} · zdrowie: ${JSON.stringify(zdrowie?.milczy)}`,
    );

    const ko = uloz(wejscia({
      ograniczenia: KOPERTA_OSLONA,
      dodatkowi: [kandydat({ id: 'wglad:objetosc', rodzajPracy: 'wiecej_objetosci' })],
    }));
    const obj = ko.pozycje.find((p) => p.id === 'wglad:objetosc');
    test(
      'arbiter — Osłona wycisza WYŁĄCZNIE dokładanie objętości (O1 pkt 3)',
      obj?.milczy !== null && obj?.milczy !== undefined,
      JSON.stringify(obj?.milczy),
    );

    const kb = uloz(wejscia({
      bol: { rodzaj: 'jest', dane: [{ dzien: DZIS, intensywnosc: 4, wykluczaZTreningu: false }] },
      dodatkowi: [kandydat({ id: 'wglad:objetosc', rodzajPracy: 'wiecej_objetosci' })],
    }));
    const objBol = kb.pozycje.find((p) => p.id === 'wglad:objetosc');
    test(
      'arbiter — zgłoszony ból wstrzymuje dokładanie pracy (O1 pkt 2)',
      objBol?.milczy !== null && objBol?.milczy !== undefined,
      JSON.stringify(objBol?.milczy),
    );

    const kp = uloz(wejscia({ dodatkowi: [kandydat({ rodzajPracy: 'zdrowie' })] }));
    test(
      'arbiter — bez ograniczeń NIC nie milczy (milczenie ma mieć przesłankę)',
      kp.pozycje.every((p) => p.milczy === null) && !kp.wyciszonaCalkowicie,
      kp.pozycje.map((p) => `${p.id}:${p.milczy ? 'milczy' : 'mówi'}`).join(', '),
    );
  }

  // ── B-3. DETERMINIZM ──────────────────────────────────────────────
  {
    const we = wejscia({
      dodatkowi: [
        kandydat({ id: 'wglad:aaa', rodzajPracy: 'inne' }),
        kandydat({ id: 'wglad:bbb', rodzajPracy: 'inne' }),
        kandydat({ id: 'wglad:ccc', rodzajPracy: 'inne' }),
      ],
    });
    test(
      'determinizm — dwa przebiegi na tych samych wejściach dają tę samą kolejność',
      idy(uloz(we).pozycje) === idy(uloz(we).pozycje),
      `${idy(uloz(we).pozycje)} vs ${idy(uloz(we).pozycje)}`,
    );

    // ⚠️ SEDNO: trzy pozycje o IDENTYCZNEJ wadze, podane w odwrotnej kolejności.
    // Porządek bez rozstrzygnięcia po `id` odda je w kolejności wejścia — czyli
    // kolejność na ekranie zależałaby od kolejności zapytań do bazy.
    const odwrotne = wejscia({
      dodatkowi: [
        kandydat({ id: 'wglad:ccc', rodzajPracy: 'inne' }),
        kandydat({ id: 'wglad:bbb', rodzajPracy: 'inne' }),
        kandydat({ id: 'wglad:aaa', rodzajPracy: 'inne' }),
      ],
    });
    test(
      'determinizm — kolejność wejścia NIE zmienia kolejności wyjścia (remisy po `id`)',
      idy(uloz(we).pozycje) === idy(uloz(odwrotne).pozycje),
      `${idy(uloz(we).pozycje)}\n       vs ${idy(uloz(odwrotne).pozycje)}`,
    );
  }

  // ── B-4. R5: „NIE WIEM" TO NIE PUSTKA ─────────────────────────────
  {
    const puste = uloz(wejscia({
      jednaOdpowiedz: null,
      zadania: { rodzaj: 'brak_danych' },
      dziennik: { rodzaj: 'brak' },
    }));
    test(
      'R5 — brak treści przy odczytanych wejściach daje stan „pusto"',
      puste.stan === 'pusto' && puste.nieWiem.length === 0,
      `stan=${puste.stan} · nieWiem=${JSON.stringify(puste.nieWiem)}`,
    );

    const nieWiem = uloz(wejscia({
      jednaOdpowiedz: null,
      zadania: { rodzaj: 'brak_danych' },
      dziennik: { rodzaj: 'nie_wiem', powod: 'zapytanie o Dziennik nie powiodło się' },
    }));
    test(
      'R5 — nieodczytane wejście daje stan „nie_wiem", a NIE pustą listę',
      nieWiem.stan === 'nie_wiem'
        && nieWiem.nieWiem.some((n) => n.wejscie === 'dziennik' && n.powod.length > 0),
      `stan=${nieWiem.stan} · nieWiem=${JSON.stringify(nieWiem.nieWiem)}`,
    );

    const odmowa = uloz(wejscia({
      jednaOdpowiedz: null,
      zadania: { rodzaj: 'brak_uprawnien', powod: 'polityka odmówiła' },
    }));
    test(
      'R5 — odmowa polityki NIE jest pustką (zawodnik ma zadania, tylko ich nie dostał)',
      odmowa.nieWiem.some((n) => n.wejscie === 'zadania'),
      JSON.stringify(odmowa.nieWiem),
    );

    const koperta = uloz(wejscia({ ograniczenia: KOPERTA_NIEODCZYTANA }));
    test(
      'R5 — nieodczytana koperta ograniczeń jest nazwana, nie przemilczana',
      koperta.nieWiem.some((n) => n.wejscie === 'ograniczenia'),
      JSON.stringify(koperta.nieWiem),
    );

    const glos = uloz(wejscia({ glos: GLOS_NIE_WIEM }));
    test(
      'R5 — nieodczytany głos tygodnia jest nazwany',
      glos.nieWiem.some((n) => n.wejscie === 'glos'),
      JSON.stringify(glos.nieWiem),
    );

    test(
      'R5 — kolejka z pozycjami i z nieodczytanym wejściem jest oznaczona jako NIEPEŁNA',
      uloz(wejscia({ mecz: { rodzaj: 'nie_wiem', powod: 'brak tabeli' } })).niepelna,
      'niepelna === false',
    );
  }

  return w;
}

// ═════════════════════════════════════════════════════════════════════
console.log('1–4. BATERIA NA PRAWDZIWYCH ZASADACH (musi dać 0 FAIL)');
// ═════════════════════════════════════════════════════════════════════
const wynikiRzeczywiste = bateria(ZASADY);
for (const r of wynikiRzeczywiste) check(r.label, r.ok, r.detail);
const ROZMIAR_BATERII = wynikiRzeczywiste.length;

// ═════════════════════════════════════════════════════════════════════
console.log('\n5. KUBEŁEK JEST LICZONY, NIE ODCZYTANY (decyzja D5)');
// ═════════════════════════════════════════════════════════════════════
{
  check('kubełek nie jest odczytywany z żadnego pola wejścia',
    !/\b(kubelek|bucket|sort_order|rank)\s*[:=]\s*(w|z|e)\./i.test(ZRODLO)
    && !/KOLUMNY[_A-Z]*\s*=\s*\[[^\]]*kubelek/i.test(ZRODLO),
    'znalazłem odczyt kubełka z wejścia');

  check('kubełek liczy się z wagi i terminu, nie z danych',
    kubelekDla({ waga: PROG_TERAZ, termin: null, dzis: DZIS, podniesioneRecznie: false }) === 'teraz'
    && kubelekDla({ waga: 0, termin: null, dzis: DZIS, podniesioneRecznie: false }) === 'kiedys'
    && kubelekDla({ waga: 0, termin: '2026-08-16', dzis: DZIS, podniesioneRecznie: false }) === 'w_tym_tygodniu'
    && kubelekDla({ waga: 0, termin: '2026-08-10', dzis: DZIS, podniesioneRecznie: false }) === 'teraz',
    'kubełek liczy się inaczej, niż mówi tabela progów');

  // ⚠️ REGUŁA 4 Z POLECENIA: ręczne podniesienie NIE KASUJE powodu systemowego.
  const podniesione = ulozKolejke(wejscia({
    jednaOdpowiedz: null,
    zadania: zadaniaZ([wierszZadania({
      id: '33333333-3333-4333-8333-333333333333',
      raised_at: '2026-08-14T07:00:00+00:00',
      system_key: null,
      origin: 'player',
      reason_fact: null, reason_text: null, reason_register: null, reason_key: null,
    })]),
  }));
  const p = podniesione.pozycje[0];
  check('ręczne podniesienie stawia pozycję w „Teraz"',
    p?.kubelek === 'teraz' && p?.podniesioneRecznie === true,
    `kubelek=${p?.kubelek} · podniesioneRecznie=${String(p?.podniesioneRecznie)}`);
  check('⭐ ręczne podniesienie NIE KASUJE powodu systemowego — `kubelekSystemowy` mówi swoje',
    p?.kubelekSystemowy !== undefined && p.kubelekSystemowy !== 'teraz',
    `kubelekSystemowy=${p?.kubelekSystemowy} (zawodnik ma prawo decydować i prawo wiedzieć, co system sądzi)`);
  check('premia za ręczne podniesienie jest NAZWANA w składnikach wagi',
    p?.skladnikiWagi.some((s) => s.nazwa === 'zawodnik:podniesione_recznie'
      && s.wartosc === PREMIE.podniesioneRecznie) === true,
    JSON.stringify(p?.skladnikiWagi));

  check('waga jest sumą swoich nazwanych składników (nic nie dochodzi po cichu)',
    podniesione.pozycje.every((x) => x.waga === x.skladnikiWagi.reduce((s, y) => s + y.wartosc, 0)),
    podniesione.pozycje.map((x) => `${x.id}: ${x.waga}`).join(', '));
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n6. TRZY WIDOKI BIORĄ, NIGDY NIE SORTUJĄ (B1-3)');
// ═════════════════════════════════════════════════════════════════════
{
  const k = ulozKolejke(wejscia({
    dodatkowi: [
      kandydat({ id: 'wglad:1', rodzajPracy: 'inne' }),
      kandydat({ id: 'wglad:2', rodzajPracy: 'inne' }),
      kandydat({ id: 'wglad:3', rodzajPracy: 'inne' }),
      kandydat({ id: 'wglad:4', rodzajPracy: 'inne' }),
      kandydat({ id: 'wglad:5', rodzajPracy: 'inne' }),
    ],
  }));

  for (const widok of ['dzis', 'tydzien', 'zadania'] as const) {
    const wyd = wezDlaWidoku(k, widok);
    const prefiks = k.pozycje.slice(0, wyd.length);
    check(`widok „${widok}" wydaje PREFIKS kolejki — nie własną kolejność`,
      idy(wyd) === idy(prefiks),
      `${idy(wyd)}\n       vs ${idy(prefiks)}`);
  }

  check('widok „Dziś" bierze jedną odpowiedź + kilka kolejnych, nie wszystko',
    wezDlaWidoku(k, 'dzis').length === Math.min(DOMYSLNA_LICZBA.dzis ?? 0, k.pozycje.length)
    && wezDlaWidoku(k, 'zadania').length === k.pozycje.length,
    `dzis=${wezDlaWidoku(k, 'dzis').length} · zadania=${wezDlaWidoku(k, 'zadania').length} · razem=${k.pozycje.length}`);

  check('jedna odpowiedź z pasa T stoi na górze kolejki',
    k.pozycje[0]?.zrodlo === 'jedna_odpowiedz',
    `pierwsza pozycja: ${k.pozycje[0]?.id} (${k.pozycje[0]?.zrodlo})`);

  const wszystkieKubelki = ['teraz', 'w_tym_tygodniu', 'kiedys'] as const;
  const suma = wszystkieKubelki.reduce((s, b) => s + wezKubelek(k, b).length, 0);
  check('trzy kubełki obejmują całą kolejkę — żadna pozycja nie wypada między nie',
    suma === k.pozycje.length,
    `suma kubełków=${suma} · pozycji=${k.pozycje.length}`);

  check('pozycje milczące stoją NIŻEJ od mówiących w tym samym kubełku',
    (() => {
      const kk = ulozKolejke(wejscia({
        ograniczenia: KOPERTA_OSLONA,
        dodatkowi: [
          kandydat({ id: 'wglad:cichy', rodzajPracy: 'wiecej_objetosci' }),
          kandydat({ id: 'wglad:glosny', rodzajPracy: 'inne' }),
        ],
      }));
      const wKubelku = kk.pozycje.filter((x) => x.kubelek === kk.pozycje.find((y) => y.id === 'wglad:cichy')?.kubelek);
      const iCichy = wKubelku.findIndex((x) => x.id === 'wglad:cichy');
      const iGlosny = wKubelku.findIndex((x) => x.id === 'wglad:glosny');
      return iCichy > iGlosny && iGlosny >= 0;
    })(),
    'milcząca pozycja wyszła nad mówiącą');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n7. TEN PLIK MA ZOSTAĆ CZYSTY');
// ═════════════════════════════════════════════════════════════════════
{
  check('⛔ ranker nie importuje Supabase',
    !/supabase/i.test(ZRODLO), 'znalazłem odwołanie do Supabase');
  check('⛔ ranker nie importuje Reacta ani React Native',
    !/from\s+'react/i.test(ZRODLO) && !/react-native/i.test(ZRODLO),
    'znalazłem import Reacta');
  check('⛔ ranker nie renderuje — zero JSX',
    !/<\/[A-Za-z]|\/>/.test(ZRODLO), 'znalazłem JSX');
  check('⛔ ranker nie czyta zegara — nie ma w nim słowa `Date` ani `Math.random`',
    !/\bDate\b/.test(ZRODLO) && !/Math\.random/.test(ZRODLO),
    'znalazłem odczyt zegara albo losowość — determinizm przestaje obowiązywać');
  check('⛔ ranker nie robi `fetch` ani niczego sieciowego',
    !/\bfetch\s*\(/.test(ZRODLO), 'znalazłem `fetch`');
  check('⛔ ranker nie zapisuje niczego do bazy',
    !/\b(insert|update|upsert|delete)\s*\(/i.test(ZRODLO), 'znalazłem zapis do bazy');

  check('Z0 jest wymuszone TYPEM: `skadToWiemy` jest polem obowiązkowym typu `Slad`',
    /skadToWiemy:\s*Slad;/.test(ZRODLO) && !/skadToWiemy\?:/.test(ZRODLO),
    'pole źródła stało się opcjonalne albo zmieniło typ — Z0 przestaje obowiązywać na kompilacji');
  check('marka śladu NIE jest eksportowana (podrobienie wymaga symbolu z tego modułu)',
    /const ZNAK_SLADU = Symbol\(/.test(ZRODLO) && !/export\s+const\s+ZNAK_SLADU/.test(ZRODLO),
    'znak śladu wyszedł na zewnątrz — ślad da się wtedy podrobić');
  check('`milczy` niesie POWÓD i WARUNEK POWROTU — oba obowiązkowe w typie',
    /powod:\s*string;/.test(ZRODLO) && /warunekPowrotu:\s*string;/.test(ZRODLO),
    'warunek powrotu wypadł z typu — milczenie bez drogi powrotu jest wyrokiem');

  check('reguła „co ekran pokazuje" jest CZYTANA z `lib/ograniczenia.ts`, a nie przepisana',
    /coPokazacNaDzis/.test(ZRODLO) && /czyOslonaAktywna/.test(ZRODLO),
    'ranker liczy ograniczenia sam — to jest druga kopia reguły i cichy rozjazd');
  check('drabina arbitra NIE jest tu odtworzona (jedno źródło: backend)',
    !/(exit|injury|growth)\s*:\s*\d/.test(ZRODLO) && !/priorytet\s*[0-5]\s*[:=]/i.test(ZRODLO),
    'znalazłem drabinę — dwie kopie drabiny odpowiadają różnie i nikt się nie dowie, która rozstrzygnęła');

  check('domyślne zasady `ulozKolejke` to te prawdziwe (punkt wpięcia nie jest furtką)',
    /zasady:\s*Zasady\s*=\s*ZASADY/.test(ZRODLO),
    'domyślny drugi argument zmieniony — produkcja mogłaby dostać inne reguły');

  check('brzmienia widoczne dla zawodnika są oznaczone dla Kuby',
    /BRZMIENIE_DO_PRZEJRZENIA/.test(ZRODLO_SUROWE),
    'znacznik `DO PRZEJRZENIA` zniknął — brzmienia należą do Kuby');

  // ⚠️ DOŁOŻONE 14.08.2026 (sesja naprawcza po odbiorze pasa B1).
  // ZMIERZONY WYŁOM: wyzerowanie `powod` i `warunekPowrotu` do '' w trzech
  // stałych — MILCZENIE_KONTUZJA, MILCZENIE_OSLONA, MILCZENIE_BOL — dawało
  // 53 passed, 0 failed. Jedyna asercja niepustości (sekcja B-2) sprawdzała
  // POZYCJE ZBUDOWANE w scenariuszu KOPERTA_EXIT, więc dotykała wyłącznie
  // czwartej gałęzi (MILCZENIE_SCIEZKA_WYJSCIA). Trzy z czterech brzmień
  // dało się opróżnić do pustego napisu, a suita zostawała zielona.
  // Ta asercja bierze WSZYSTKIE CZTERY STAŁE naraz i nie zależy od tego,
  // który scenariusz je wywoła.
  const BRZMIENIA_MILCZENIA: Array<readonly [string, Milczenie]> = [
    ['MILCZENIE_SCIEZKA_WYJSCIA', MILCZENIE_SCIEZKA_WYJSCIA],
    ['MILCZENIE_KONTUZJA', MILCZENIE_KONTUZJA],
    ['MILCZENIE_OSLONA', MILCZENIE_OSLONA],
    ['MILCZENIE_BOL', MILCZENIE_BOL],
  ];
  const pusteBrzmienia = BRZMIENIA_MILCZENIA
    .filter(([, m]) => m.powod.trim().length === 0 || m.warunekPowrotu.trim().length === 0)
    .map(([nazwa, m]) => `${nazwa}(powod:${m.powod.trim().length}, warunekPowrotu:${m.warunekPowrotu.trim().length})`);
  check('⛔ KAŻDA z czterech stałych milczenia ma niepusty POWÓD i niepusty WARUNEK POWROTU',
    BRZMIENIA_MILCZENIA.length === 4 && pusteBrzmienia.length === 0,
    `puste po trim(): ${pusteBrzmienia.join(' · ') || '(żadne)'} — milczenie bez powodu jest zniknięciem, a bez warunku powrotu wyrokiem`);

  check('arytmetyka dni jest odwracalna i sprawdza istnienie daty',
    dzienNaLiczbe('2026-08-14') !== null
    && liczbaNaDzien(dzienNaLiczbe('2026-08-14') as number) === '2026-08-14'
    && dzienNaLiczbe('2026-02-31') === null
    && odstepDni('2026-08-14', '2026-08-21') === 7
    && odstepDni('2026-08-14', 'nie-data') === null,
    'arytmetyka dni się rozjechała');

  check('`glosWspiera` nie podnosi niczego, gdy arbiter zdecydował NIE mówić (`spoke_at` = null)',
    glosWspiera(GLOS_MILCZY) === null && glosWspiera(GLOS_CISZA) === null
    && glosWspiera(GLOS_NIE_WIEM) === null && glosWspiera(GLOS_BLOK) !== null,
    'budżet odezwań przestaje obowiązywać w kolejce');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n7b. ⭐ PAS B2 16.08.2026 — PIĘĆ RAZY TO SAMO ZDANIE (zwijanie powtórzeń)');
// ═════════════════════════════════════════════════════════════════════
// ⚠️ CHOROBA, DLA KTÓREJ TA SEKCJA POWSTAŁA — zmierzona uruchomieniem
// na produkcji 16.08.2026, nie odczytana z kodu:
//
//   zawodnik `8d7e1ebb…` · `calendar_events` = 12 wierszy · JEDEN tytuł
//   („Blok Skupienia: Bieg ciągły w strefie tlenowej") · 12 różnych dat.
//   Kolejka: 9 pozycji, z czego PIĘĆ to jedno i to samo zdanie (miejsca 4–8).
//   Wgląd `brak_roku_urodzenia` — jedyna pozycja mówiąca coś o TYM zawodniku —
//   stał na miejscu 9, poza prefiksem „Dziś" (4) i poza „Tydzień" (8).
//
// ⛔ ASERCJA TEKSTOWA („czy w pliku stoi słowo `zwin`") PRZEPUŚCIŁABY DOWOLNĄ
// implementację, która nic nie zwija. Dlatego trzon tej sekcji URUCHAMIA
// `ulozKolejke` i `wezDlaWidoku` na kształcie danych tego zawodnika i pyta
// o WYNIK — o miejsce wglądu, o wagę zwiniętego wiersza i o jego termin.
{
  const DZIS_B2 = '2026-08-16';

  // ⛔ O76: STRAŻNIK, KTÓRY SIĘ WYWRACA, NIE JEST CZERWONY — JEST NIECZYTELNY.
  // Test historyczny (O70) puszcza ten plik na rankerze SPRZED pasa, w którym
  // `zwinPowtorzenia` i `kluczZwijania` jeszcze nie istnieją. Bez tych dwóch
  // linii sekcja rzucałaby `TypeError` przed pierwszą asercją i w CI wyglądałaby
  // jak awaria narzędzia — a jest REGUŁĄ, KTÓRA ZNIKNĘŁA Z RANKERA.
  const MA_ZWIJANIE = typeof zwinPowtorzenia === 'function' && typeof kluczZwijania === 'function';
  check('⛔ (B2-0) ranker eksportuje `zwinPowtorzenia` i `kluczZwijania`',
    MA_ZWIJANIE,
    `zwinPowtorzenia=${typeof zwinPowtorzenia} · kluczZwijania=${typeof kluczZwijania} — zwijanie `
    + 'powtórzeń wypadło z rankera; wszystkie asercje niżej mierzą teraz kolejkę BEZ zwijania '
    + 'i zapalą się po kolei');
  const zwin = (l: PozycjaKolejki[]): PozycjaKolejki[] => (MA_ZWIJANIE ? zwinPowtorzenia(l) : []);
  const klucz = (p: PozycjaKolejki): string => (MA_ZWIJANIE ? kluczZwijania(p) : '⛔ BRAK FUNKCJI');

  /** Tytuł zmierzony w bazie. ⚠️ Zawiera dwukropek — patrz rozdzielacz w `kluczZwijania`. */
  const TYTUL = 'Blok Skupienia: Bieg ciągły w strefie tlenowej';
  const BLOK = '33e7eeb2-07c5-47e7-ac5a-28f054d33fc6';

  /** 12 wierszy `calendar_events` zawodnika `8d7e1ebb…`, co do `id` i co do daty. */
  const DWANASCIE: WydarzenieKalendarza[] = ([
    [14, '2026-08-01'], [6, '2026-08-04'], [10, '2026-08-06'], [15, '2026-08-08'],
    [7, '2026-08-11'], [11, '2026-08-13'], [16, '2026-08-15'], [8, '2026-08-18'],
    [12, '2026-08-20'], [17, '2026-08-22'], [9, '2026-08-25'], [13, '2026-08-27'],
  ] as Array<[number, string]>).map(([id, dzien]) => ({
    id,
    title: TYTUL,
    event_type: 'micro_session',
    scheduled_date: dzien,
    scheduled_time: null,
    status: 'scheduled',
    focus_block_id: BLOK,
  }));

  /** `daily_logs` zawodnika — 7 wierszy, zmierzone 16.08.2026. */
  const LOGI = ([
    ['4', '2026-08-05', 7.5, null], ['5', '2026-08-05', null, 6],
    ['6', '2026-08-06', 7, null], ['7', '2026-08-06', 7.5, null],
    ['8', '2026-08-08', null, 5], ['9', '2026-08-08', 7.5, null],
    ['10', '2026-08-09', 3, null],
  ] as Array<[string, string, number | null, number | null]>)
    .map(([idWiersza, dzien, senGodziny, rpe]) => ({ idWiersza, dzien, senGodziny, rpe }));

  /**
   * ⭐ WGLĄDY OD PRAWDZIWEGO PRODUCENTA, NA KOMPLECIE WEJŚĆ ZAWODNIKA.
   * ⚠️ Wejścia niepełne dałyby KRÓTSZĄ kolejkę i asercja o MIEJSCU wglądu
   * mierzyłaby wtedy inny zawodnik niż ten, o którego chodzi.
   * `users.birth_year` = null · `component_hints`: 0 za bramką wieku widoczną
   * dla zawodnika, 274 widocznych razem · `road_segments` = 4 ·
   * `pain_entries` = 1 wiersz · `match_contexts` = 2 wiersze ·
   * `daily_logs.calendar_event_id` = null w 7 z 7 (zmierzone 16.08.2026).
   */
  const wglądyZawodnika = policzWglady({
    dzis: DZIS_B2,
    dziennik: { rodzaj: 'jest', dane: LOGI },
    kalendarz: {
      rodzaj: 'jest',
      dane: DWANASCIE.map((e) => ({
        id: String(e.id), dzien: e.scheduled_date, rodzaj: e.event_type, status: e.status, tytul: e.title,
      })),
    },
    powiazania: { rodzaj: 'jest', dane: LOGI.map((l) => ({ idWpisu: l.idWiersza, idWydarzenia: null })) },
    bol: {
      rodzaj: 'jest',
      dane: [{ idWiersza: '1', dzien: '2026-08-08', miejsce: 'lydka', intensywnosc: 2, wykluczaZTreningu: false }],
    },
    mecze: {
      rodzaj: 'jest',
      dane: [
        { idWiersza: '2', dzien: '2026-07-29', ciezkosc: 6, stanWejscia: 'entered_fresh' },
        { idWiersza: '3', dzien: '2026-07-29', ciezkosc: 5, stanWejscia: 'entered_fresh' },
      ],
    },
    profil: {
      rodzaj: 'jest',
      dane: { rokUrodzenia: null, podpowiedziZaBramkaWieku: 0, podpowiedziRazem: 274, odcinkowMapyDrogi: 4 },
    },
  });
  const kandydatRocznika = wglądyZawodnika.kandydaci.find((k) => k.id.includes('brak_roku_urodzenia')) ?? null;

  check('⭐ (B2) producent wglądów oddaje na danych tego zawodnika DWA kandydaty, w tym `brak_roku_urodzenia`',
    kandydatRocznika !== null && wglądyZawodnika.kandydaci.length === 2,
    `kandydaci wglądów: ${JSON.stringify(wglądyZawodnika.kandydaci.map((k) => k.id))} — bez kompletu `
    + 'asercje niżej mierzą miejsce pozycji w kolejce INNEGO kształtu niż ta zmierzona na produkcji');

  /** Pozycja systemowa „zapisz dzisiejszy wpis" — dokłada ją ekran „Dziś" (`dzis.tsx`). */
  const WPIS_DZIS = kandydat({
    id: `dziennik:${DZIS_B2}`,
    co: 'Zapisz dzisiejszy wpis w Dzienniku',
    dlaczego: 'Dziś nie ma jeszcze Twojego wpisu.',
    wagaBazowa: WAGA_BAZOWA.zadanie_systemowe,
    zrodlo: 'zadanie_systemowe',
    rodzajPracy: 'porzadek',
    termin: DZIS_B2,
  });

  const wejsciaZawodnika = (dodatkowi: Kandydat[]): WejsciaKolejki => wejscia({
    dzis: DZIS_B2,
    // `player_tasks` = 0 wierszy u tego zawodnika. Odczyt się udał, nic nie ma.
    zadania: odczytZadan({ data: [], error: null }),
    kalendarz: { rodzaj: 'jest', dane: DWANASCIE },
    dodatkowi,
  });

  const kolejkaPelna = ulozKolejke(wejsciaZawodnika([WPIS_DZIS, ...wglądyZawodnika.kandydaci]));

  // ── ⭐ (B2-1) TYLE POWTÓRZEŃ, ILE ICH BYŁO — I ANI JEDNEGO WIERSZA WIĘCEJ ──
  const wierszeKalendarza = kolejkaPelna.pozycje.filter((p) => p.zrodlo === 'kalendarz');
  check('⭐ (B2-1) dwanaście wydarzeń o jednym tytule wychodzi z rankera JAKO JEDEN wiersz',
    wierszeKalendarza.length === 1 && wierszeKalendarza[0].ileRazem === 5,
    `wierszy kalendarza: ${wierszeKalendarza.length} `
    + `[${wierszeKalendarza.map((p) => `${p.id} ×${p.ileRazem} ${p.termin}`).join(', ')}] — `
    + 'oczekiwane: 1 wiersz niosący 5 pozycji (pięć wydarzeń z datą ≥ 16.08; siedem starszych '
    + 'odpada wcześniej, na filtrze daty w `zKalendarza`)');

  // ── ⭐ (B2-1b) D2: TEN SAM TYTUŁ, INNY RODZAJ → DWIE POZYCJE ──
  // ⚠️ ASERCJA URUCHOMIENIOWA, nie tekstowa. „Klucz zawiera `p.zrodlo`" da się
  // spełnić kluczem, który i tak scala wszystko; tu pytam o WYNIK. Defekt,
  // którego pilnuje: zwijanie po samym zdaniu scaliłoby wgląd „Blok Skupienia…"
  // z wydarzeniem kalendarza o tym samym tytule — dwie rzeczy, które zawodnik
  // robi inaczej, staną się jedną i jedna z nich zniknie mu z planu.
  const kRodzaje = ulozKolejke(wejscia({
    dzis: DZIS_B2,
    jednaOdpowiedz: { ...JEDNA_ODPOWIEDZ, pokazac: false },
    zadania: odczytZadan({ data: [], error: null }),
    dodatkowi: [
      kandydat({ id: 'kalendarz:r1', co: TYTUL, zrodlo: 'kalendarz', rodzajPracy: 'inne' }),
      kandydat({ id: 'wglad:r2', co: TYTUL, zrodlo: 'wglad', rodzajPracy: 'inne' }),
      kandydat({ id: 'kalendarz:r3', co: TYTUL, zrodlo: 'kalendarz', rodzajPracy: 'porzadek' }),
    ],
  }));
  check('⭐ (B2-1b) D2: ten sam TYTUŁ przy innym ŹRÓDLE albo innym RODZAJU PRACY → osobne pozycje',
    kRodzaje.pozycje.length === 3 && kRodzaje.pozycje.every((p) => p.ileRazem === 1),
    JSON.stringify(kRodzaje.pozycje.map((p) => `${p.id} ${p.zrodlo}/${p.rodzajPracy} ×${p.ileRazem}`))
    + ' — klucz zwijania stracił rodzaj i scala teraz rzeczy, które tylko brzmią tak samo');

  // ── ⭐ (B2-2) ASERCJA IMIENNA D7, URUCHOMIENIOWA ──
  // ⚠️ D7 W POLECENIU BRZMIAŁA: „po zwinięciu wgląd `brak_roku_urodzenia`
  // MA SIĘ ZMIEŚCIĆ w prefiksie »Dziś« (4)". POMIAR JĄ OBALIŁ i zostawiam
  // pomiar, nie zdanie (O74). Na PEŁNYM kształcie zawodnika kolejka po
  // zwinięciu ma PIĘĆ pozycji:
  //   1. jedna_odpowiedz 1650 · 2. zadanie_systemowe 800 · 3. wgląd o śnie 800
  //   4. kalendarz 650 (×5) · 5. brak_roku_urodzenia 300
  // czyli wgląd wychodzi z miejsca 9 na 5 — o JEDNO miejsce za daleko.
  // Zwinięcie oddaje CZTERY miejsca (pięć kopii → jedna), a brakowało pięciu.
  // ⛔ Podniesienie `DOMYSLNA_LICZBA.dzis` byłoby ukryciem choroby, nie
  // leczeniem, i polecenie tego zakazuje; przestawienie wag jest poza mandatem.
  const naDzis = wezDlaWidoku(kolejkaPelna, 'dzis');
  const naTydzien = wezDlaWidoku(kolejkaPelna, 'tydzien');
  const miejsceRocznika = kolejkaPelna.pozycje.findIndex((p) => p.id.includes('brak_roku_urodzenia')) + 1;
  console.log(`[pomiar B2] 16.08.2026, zawodnik 8d7e1ebb… — kolejka po zwinięciu: `
    + `${kolejkaPelna.pozycje.length} pozycji · wgląd brak_roku_urodzenia na miejscu ${miejsceRocznika} `
    + `· w prefiksie „Dziś" (${DOMYSLNA_LICZBA.dzis}): ${naDzis.some((p) => p.id.includes('brak_roku_urodzenia')) ? 'TAK' : 'NIE'} `
    + `· w prefiksie „Tydzień" (${DOMYSLNA_LICZBA.tydzien}): ${naTydzien.some((p) => p.id.includes('brak_roku_urodzenia')) ? 'TAK' : 'NIE'}`);

  check('⭐ (B2-2) ZMIERZONE: wgląd `brak_roku_urodzenia` wychodzi z miejsca 9 na 5 i wchodzi do prefiksu „Tydzień"',
    kolejkaPelna.pozycje.length === 5
    && miejsceRocznika === 5
    && naTydzien.some((p) => p.id.includes('brak_roku_urodzenia')),
    `pozycji: ${kolejkaPelna.pozycje.length} · wgląd na miejscu ${miejsceRocznika} · `
    + `prefiks „Tydzień" wydaje ${naTydzien.length} · kolejka: `
    + JSON.stringify(kolejkaPelna.pozycje.map((p) => `${p.zrodlo}/${p.waga}×${p.ileRazem}`))
    + ' — jeżeli wgląd wrócił poniżej miejsca 8, jest z powrotem NIEWIDOCZNY W KAŻDYM WIDOKU (P0)');

  // ── ⭐ (B2-3) ASERCJA IMIENNA D7 W POSTACI, W KTÓREJ JEST PRAWDZIWA ──
  // Ten sam kształt BEZ pozycji „zapisz dzisiejszy wpis" — czyli dzień,
  // w którym zawodnik już dopisał wpis do Dziennika. Wtedy zwijanie wystarcza
  // i wgląd wchodzi do prefiksu „Dziś". ⛔ To jest asercja URUCHOMIENIOWA:
  // `wezDlaWidoku(…, 'dzis')` MUSI zawierać ten wgląd, nie „coś podobnego".
  const kolejkaZWpisem = ulozKolejke(wejsciaZawodnika([...wglądyZawodnika.kandydaci]));
  const naDzisZWpisem = wezDlaWidoku(kolejkaZWpisem, 'dzis');
  check('⭐ (B2-3) D7: gdy zawodnik ma dzisiejszy wpis, zwinięcie WPUSZCZA wgląd o roczniku na „Dziś"',
    kolejkaZWpisem.pozycje.length === 4
    && naDzisZWpisem.some((p) => p.id.includes('brak_roku_urodzenia')),
    `kolejka: ${JSON.stringify(kolejkaZWpisem.pozycje.map((p) => p.id))} · `
    + `„Dziś" wydaje: ${JSON.stringify(naDzisZWpisem.map((p) => p.id))} — bez zwijania stało tam pięć kopii `
    + 'jednego zdania i wgląd nie miał jak wejść');

  // ── ⭐ (B2-4) D6: WAGA ZWINIĘTEJ POZYCJI = NAJWYŻSZA W GRUPIE, NIE SUMA ──
  // ⚠️ Grupa podstawiona wprost, wagami z polecenia: 550, 550, 400, 400, 400.
  // Suma = 2300 — i to jest liczba, która wypchnęłaby powtórzenie PONAD
  // wszystko, czego nikt nie powtórzył. Dokładna odwrotność tego pasa (N1).
  const grupaWag = (): Kolejka => ulozKolejke(wejscia({
    dzis: DZIS_B2,
    jednaOdpowiedz: { ...JEDNA_ODPOWIEDZ, pokazac: false },
    zadania: odczytZadan({ data: [], error: null }),
    dodatkowi: ([
      ['a', '2026-08-18'], ['b', '2026-08-20'],  // +150 (termin w tygodniu) → 550
      ['c', '2026-08-30'], ['d', '2026-09-01'], ['e', '2026-09-03'],  // bez premii → 400
    ] as Array<[string, string]>).map(([sufiks, termin]) => kandydat({
      id: `kalendarz:${sufiks}`,
      co: TYTUL,
      wagaBazowa: WAGA_BAZOWA.kalendarz,
      zrodlo: 'kalendarz',
      rodzajPracy: 'inne',
      termin,
    })),
  }));
  const kWag = grupaWag();
  const zwiniętyWag = kWag.pozycje.find((p) => p.co === TYTUL) ?? null;
  check('⭐ (B2-4) D6: grupa o wagach 550·550·400·400·400 daje wagę 550 — NIE 2300',
    kWag.pozycje.length === 1
    && zwiniętyWag !== null && zwiniętyWag.waga === 550 && zwiniętyWag.ileRazem === 5,
    `pozycji: ${kWag.pozycje.length} · waga zwiniętej: ${zwiniętyWag?.waga} · ileRazem: ${zwiniętyWag?.ileRazem} — `
    + 'suma (2300) podniosłaby powtórzenie ponad rzeczy niepowtórzone, czyli nagrodziłaby produkt '
    + 'za to, że powiedział coś pięć razy');
  check('⭐ (B2-4) D6: waga zwiniętego wiersza RÓWNA SIĘ najwyższej w grupie, policzonej z wejść',
    zwiniętyWag !== null && zwiniętyWag.waga === 550
    && zwiniętyWag.waga === zwiniętyWag.skladnikiWagi.reduce((s, x) => s + x.wartosc, 0),
    `waga=${zwiniętyWag?.waga} · składniki=${JSON.stringify(zwiniętyWag?.skladnikiWagi)} — waga zwiniętej `
    + 'pozycji musi dać się rozłożyć na jej WŁASNE składniki; inaczej wiersz niesie liczbę, której '
    + 'nikt nie umie wytłumaczyć');

  // ── ⭐ (B2-5) D5: ZWINIĘTY WIERSZ NIESIE NAJBLIŻSZY TERMIN ──
  // ⚠️ TO NIE JEST OZDOBNIK. Zmierzone: trzy pozycje grupy miały wagę 650
  // i terminy 20, 22 i 18 sierpnia, a remis rozstrzyga `id` PORÓWNANIEM
  // NAPISÓW — więc najwyżej stała ta z 20 sierpnia. Wiersz mówiący
  // „20 sierpnia" zawodnikowi, który ma to samo 18 sierpnia, jest fałszem
  // o jego planie i wysyła go dwa dni za późno.
  const zwinietyKal = wierszeKalendarza[0] ?? null;
  check('⭐ (B2-5) D5: zwinięty wiersz niesie NAJBLIŻSZY termin grupy, nie ten, który wygrał remis po `id`',
    zwinietyKal !== null && zwinietyKal.termin === '2026-08-18' && zwinietyKal.id === 'kalendarz:8',
    `termin zwiniętego: ${zwinietyKal?.termin} · id: ${zwinietyKal?.id} — najbliższy termin w grupie to `
    + '2026-08-18 (`calendar_events.id` = 8); remis po napisie `id` dałby tu 2026-08-20 (`id` = 12)');
  check('⭐ (B2-5) D5: zwinięty wiersz jest PRAWDZIWĄ pozycją — jego ślad wskazuje TEN wiersz, którego termin niesie',
    zwinietyKal !== null && zwinietyKal.skadToWiemy.idWiersza === '8'
    && zwinietyKal.skadToWiemy.skad === 'calendar_events',
    `ślad: ${JSON.stringify({ skad: zwinietyKal?.skadToWiemy.skad, id: zwinietyKal?.skadToWiemy.idWiersza })} — `
    + 'zlepek („termin z jednej pozycji, ślad z drugiej") jest zapisem nieprawdy, tym samym, '
    + 'który ten pas prostuje obok w `wgladyZAlgorytmu.ts`');

  // ── ⭐ (B2-6) D4: LICZBA ZGADZA SIĘ CO DO JEDNOŚCI Z LICZBĄ WEJŚĆ ──
  const SZTUK = 7;
  const kSuma = ulozKolejke(wejscia({
    dzis: DZIS_B2,
    jednaOdpowiedz: { ...JEDNA_ODPOWIEDZ, pokazac: false },
    zadania: odczytZadan({ data: [], error: null }),
    dodatkowi: [
      ...Array.from({ length: SZTUK }, (_, i) => kandydat({ id: `kalendarz:s${i}`, co: TYTUL, zrodlo: 'kalendarz', rodzajPracy: 'inne' })),
      kandydat({ id: 'wglad:osobny', co: 'Zupełnie inne zdanie', rodzajPracy: 'inne' }),
    ],
  }));
  const sumaIleRazem = kSuma.pozycje.reduce((s, p) => s + p.ileRazem, 0);
  check('⭐ (B2-6) D4: suma `ileRazem` po zwinięciu = liczba pozycji przed zwinięciem, co do jedności',
    kSuma.pozycje.length === 2 && sumaIleRazem === SZTUK + 1
    && (kSuma.pozycje.find((p) => p.co === TYTUL)?.ileRazem ?? 0) === SZTUK,
    `pozycji: ${kSuma.pozycje.length} · suma ileRazem: ${sumaIleRazem} (oczekiwane ${SZTUK + 1}) · `
    + JSON.stringify(kSuma.pozycje.map((p) => `${p.id}×${p.ileRazem}`))
    + ' — jeżeli suma jest mniejsza, zwijanie KASUJE pozycje zamiast je scalać, i robi to niewidocznie');
  check('⭐ (B2-6) D4: pozycja niepowtórzona niesie `ileRazem === 1`, nigdy 0 i nigdy `undefined`',
    kSuma.pozycje.every((p) => Number.isInteger(p.ileRazem) && p.ileRazem >= 1)
    && (kSuma.pozycje.find((p) => p.co === 'Zupełnie inne zdanie')?.ileRazem ?? 0) === 1,
    JSON.stringify(kSuma.pozycje.map((p) => `${p.id}: ${String(p.ileRazem)}`)));

  // ── ⭐ (B2-7) ASERCJA ODWROTNA: KOLEJKA BEZ POWTÓRZEŃ SIĘ NIE ZMIENIA ──
  // ⛔ Porównanie IDENTYCZNOŚCIĄ OBIEKTÓW, nie treścią: zwijanie ma oddać
  // TE SAME pozycje, a nie ich kopie. Kopia przechodzi porównanie treści
  // i gubi wszystko, czego to porównanie nie objęło.
  const bezPowtorzen = ulozKolejke(wejscia({
    dzis: DZIS_B2,
    zadania: odczytZadan({ data: [], error: null }),
    dodatkowi: Array.from({ length: 6 }, (_, i) => kandydat({ id: `wglad:r${i}`, co: `Zdanie numer ${i}`, rodzajPracy: 'inne' })),
  })).pozycje;
  const poZwinieciu = zwin(bezPowtorzen);
  check('⭐ (B2-7) ASERCJA ODWROTNA: lista BEZ powtórzeń wychodzi ze zwijania co do znaku ta sama',
    poZwinieciu.length === bezPowtorzen.length
    && poZwinieciu.every((p, i) => p === bezPowtorzen[i])
    && poZwinieciu.every((p) => p.ileRazem === 1),
    `przed: ${idy(bezPowtorzen)}\n       po:   ${idy(poZwinieciu)} — zwijanie ruszyło coś, `
    + 'czego nikt nie powtórzył; od tej chwili każda zmiana w tej funkcji rusza CAŁĄ kolejkę');

  // ── ⭐ (B2-8) D3: STAN POZYCJI NIE ZWIJA SIĘ ──
  // (a) URUCHOMIENIOWO: identyczne zdanie, różnica w RĘCZNYM PODNIESIENIU.
  //     Decyzja zawodnika ma zostać widoczna (M1, M2), a nie wtopić się
  //     w wiersz, którego sam nie podnosił.
  const kStan = ulozKolejke(wejscia({
    dzis: DZIS_B2,
    jednaOdpowiedz: { ...JEDNA_ODPOWIEDZ, pokazac: false },
    zadania: odczytZadan({ data: [], error: null }),
    dodatkowi: [
      kandydat({ id: 'kalendarz:p1', co: TYTUL, zrodlo: 'kalendarz', rodzajPracy: 'inne', termin: '2026-08-18' }),
      kandydat({ id: 'kalendarz:p2', co: TYTUL, zrodlo: 'kalendarz', rodzajPracy: 'inne', termin: '2026-08-20', podniesioneRecznie: true }),
    ],
  }));
  check('⭐ (B2-8) D3: identyczne zdanie + RÓŻNY stan (ręczne podniesienie) → DWIE pozycje, nie jedna',
    kStan.pozycje.length === 2 && kStan.pozycje.every((p) => p.ileRazem === 1),
    JSON.stringify(kStan.pozycje.map((p) => `${p.id} podniesione=${p.podniesioneRecznie} ×${p.ileRazem}`))
    + ' — scalenie skasowałoby zawodnikowi jego własną decyzję, zostawiając mu zdanie systemu');

  // (b) NA `zwinPowtorzenia` WPROST: identyczne zdanie, jedna pozycja MILCZY.
  //     ⚠️ Tą drogą, nie przez `ulozKolejke`: `wycisz()` zależy WYŁĄCZNIE od
  //     `rodzajPracy` i kontekstu, więc dwie pozycje o tym samym rodzaju nigdy
  //     nie różnią się milczeniem — defekt „zwijanie zjada milczenie" byłby
  //     wtedy nie do wywołania i asercja nie pilnowałaby niczego.
  const wzor = kStan.pozycje[0];
  const paraMilczenia: PozycjaKolejki[] = [
    { ...wzor, id: 'kalendarz:m1', milczy: null },
    { ...wzor, id: 'kalendarz:m2', milczy: MILCZENIE_OSLONA },
  ];
  const poParze = zwin(paraMilczenia);
  check('⭐ (B2-8) D3: identyczne zdanie, jedna pozycja MILCZY → NIE zwijają się',
    poParze.length === 2
    && klucz(paraMilczenia[0]) !== klucz(paraMilczenia[1]),
    `po zwinięciu: ${poParze.length} pozycji · klucze: ${JSON.stringify(paraMilczenia.map(klucz))} — `
    + 'pozycja wstrzymana rysuje POWÓD i WARUNEK POWROTU (WG-24); scalenie jej z mówiącą chowa oba, '
    + 'a zawodnik nie ma jak się dowiedzieć, że coś milczy');

  // (c) ⚠️ STAN WYKONANIA (`odwolane`, pas K1) NIE DOCHODZI DZIŚ DO RANKERA
  //     i to jest POMIAR, nie założenie: `zKalendarza()` przepuszcza wyłącznie
  //     `status === 'scheduled'`, więc pozycja odwołana NIE POWSTAJE i nie ma
  //     jak wpaść do grupy. Ta asercja pilnuje tego faktu — dzień, w którym
  //     odwołanie zacznie tworzyć pozycję, ZAPALA ją z poleceniem dopisania
  //     stanu wykonania do `kluczZwijania`.
  const kOdwolane = ulozKolejke(wejscia({
    dzis: DZIS_B2,
    jednaOdpowiedz: { ...JEDNA_ODPOWIEDZ, pokazac: false },
    zadania: odczytZadan({ data: [], error: null }),
    kalendarz: {
      rodzaj: 'jest',
      dane: [
        { ...DWANASCIE[7] },
        { ...DWANASCIE[8], status: 'cancelled' },
      ],
    },
  }));
  check('⭐ (B2-8) D3: wydarzenie ODWOŁANE nie tworzy pozycji, więc nie ma jak wpaść do grupy',
    kOdwolane.pozycje.length === 1 && kOdwolane.pozycje[0].ileRazem === 1,
    `pozycji: ${kOdwolane.pozycje.length} · ${JSON.stringify(kOdwolane.pozycje.map((p) => `${p.id}×${p.ileRazem}`))} — `
    + 'stan wykonania (piąty stan `odwolane` z pasa K1) DOSZEDŁ do rankera. Od tej chwili '
    + '`kluczZwijania` MUSI go zawierać, inaczej pozycja odwołana scali się z zaplanowaną '
    + 'i zawodnik przeczyta o pracy, której nie ma');

  // ── ⭐ (B2-9) O71: PYTAM O CIAŁA FUNKCJI, NIE O CAŁY PLIK ──
  // ⚠️ Asercja szukająca wzorca w całym pliku nie pilnuje jednej instrukcji:
  // `zwinPowtorzenia(` stoi w tym pliku także w komentarzu i w nagłówku.
  const cialoFunkcji = (src: string, nazwa: string): string => {
    const igla = new RegExp(`function\\s+${nazwa}\\s*\\(`);
    const m = igla.exec(src);
    if (m === null) return '';
    let i = src.indexOf('{', m.index + m[0].length);
    if (i < 0) return '';
    let glebokosc = 0;
    const od = i;
    for (; i < src.length; i++) {
      if (src[i] === '{') glebokosc++;
      else if (src[i] === '}') { glebokosc--; if (glebokosc === 0) return src.slice(od, i + 1); }
    }
    return '';
  };

  const cialoUloz = cialoFunkcji(ZRODLO, 'ulozKolejke');
  const cialoZwin = cialoFunkcji(ZRODLO, 'zwinPowtorzenia');
  const cialoKlucz = cialoFunkcji(ZRODLO, 'kluczZwijania');

  check('⛔ (B2-9) trzy ciała funkcji dają się wyciąć — bez tego asercje niżej badają pusty napis',
    cialoUloz.length > 0 && cialoZwin.length > 0 && cialoKlucz.length > 0,
    `ulozKolejke=${cialoUloz.length} · zwinPowtorzenia=${cialoZwin.length} · kluczZwijania=${cialoKlucz.length} `
    + '— zmieniła się nazwa albo kształt deklaracji (O63: nazwa funkcji, nie numer linii)');

  check('⭐ (B2-9) D1: zwijanie dzieje się W `ulozKolejke`, PO sortowaniu — nie przed i nie na ekranie',
    cialoUloz.includes('zwinPowtorzenia(')
    && cialoUloz.indexOf('.sort(') >= 0
    && cialoUloz.indexOf('zwinPowtorzenia(') > cialoUloz.indexOf('.sort('),
    'zwijanie wypadło z rankera albo stoi PRZED sortowaniem — grupa nie wie wtedy, '
    + 'która jej pozycja stała najwyżej, więc D6 (waga najwyższej) nie ma jak być prawdą');

  check('⛔ (B2-9) `zwinPowtorzenia` NIE SORTUJE — kolejność ma jedno źródło (WG-22)',
    !cialoZwin.includes('.sort(') && !cialoZwin.includes('.reverse('),
    'zwijanie zaczęło ustalać kolejność; od tej chwili są dwa miejsca, które ją ustalają, '
    + 'i oba są zielone');

  check('⛔ (B2-9) D6: `zwinPowtorzenia` NIE SUMUJE wag — ani jednego `+=` po wadze, ani `reduce` po `waga`',
    !/waga\s*\+/.test(cialoZwin) && !/\+\s*[a-z]\w*\.waga/i.test(cialoZwin)
    && !/reduce\([^)]*waga/.test(cialoZwin),
    'w ciele zwijania pojawiło się sumowanie wag — powtórzenie zaczyna wypychać w górę '
    + 'rzeczy, których nikt nie powtórzył');

  check('⭐ (B2-9) D4: `zwinPowtorzenia` ustawia `ileRazem` z LICZEBNOŚCI grupy, nie ze stałej',
    /ileRazem:\s*grupa\.length/.test(cialoZwin),
    `ciało zwijania nie ustawia \`ileRazem: grupa.length\` — licznik przestał być liczbą scalonych `
    + 'rzeczy i zaczął być ozdobą');

  check('⭐ (B2-9) D2: klucz zwijania bierze RODZAJ i ZDANIE, a NIE `id` ani `focus_block_id`',
    /\bp\.zrodlo\b/.test(cialoKlucz) && /\bp\.rodzajPracy\b/.test(cialoKlucz) && /\bp\.co\b/.test(cialoKlucz)
    && !/\bp\.id\b/.test(cialoKlucz) && !/focus_block/.test(cialoKlucz),
    'klucz zwijania stracił rodzaj albo zdanie, albo zaczął patrzeć na `id` — po `id` nie zwinie '
    + 'się NIC (dwanaście wierszy ma dwanaście różnych `id`), a bez rodzaju zwiną się rzeczy różne');

  check('⭐ (B2-9) D5: TERMINU I GODZINY NIE MA W KLUCZU — inaczej nie zwinie się nic',
    !/\bp\.termin\b/.test(cialoKlucz) && !/\bp\.godzina\b/.test(cialoKlucz),
    'termin wszedł do klucza zwijania; dwanaście wydarzeń ma dwanaście różnych dat, '
    + 'więc zwijanie przestaje cokolwiek robić i robi to po cichu');

  check('⭐ (B2-9) D3: STAN pozycji JEST w kluczu zwijania (milczenie i ręczne podniesienie)',
    /milczy/.test(cialoKlucz) && /podniesioneRecznie/.test(cialoKlucz),
    'stan wypadł z klucza — pozycja milcząca scali się z mówiącą, a podniesiona przez zawodnika '
    + 'z tą, której nie podnosił');

  // ── ⭐ (B2-10) O75: EKRAN. ASERCJE CZYTAJĄ `PozycjaKolejkiCard.tsx` ──
  // ⛔ Nie własny moduł. Ranker może liczyć `ileRazem` bezbłędnie i nikt tego
  // nie narysuje — wtedy zwijanie jest UKRYCIEM czterech pozycji (Z0).
  {
    const root = dirname(katalog);
    const SCIEZKA_KARTY = 'components/PozycjaKolejkiCard.tsx';
    const pelna = join(root, SCIEZKA_KARTY);
    // ⛔ BRAK PLIKU = FAIL Z NAZWĄ, nigdy `POMINIETE` (O76).
    const jestKarta = existsSync(pelna);
    check(`⛔ (B2-10) ekran \`${SCIEZKA_KARTY}\` istnieje i daje się odczytać`,
      jestKarta,
      `NIE MA TEGO PLIKU — asercje niżej czytałyby pusty napis. To nie jest pominięcie: `
      + 'to jest ekran, który zniknął z repozytorium.');
    const kartaSurowa = jestKarta ? readFileSync(pelna, 'utf8') : '';
    const kartaB2 = bezKomentarzy(kartaSurowa);
    const cialoOpisz = cialoFunkcji(kartaB2, 'opiszPowtorzenie');

    check('⭐ (B2-10) karta RYSUJE licznik powtórzeń i bierze go Z POZYCJI',
      /opiszPowtorzenie\(pozycja\.ileRazem\)/.test(kartaB2) && /\{powtorzenie\}/.test(kartaB2),
      'karta przestała rysować liczbę scalonych rzeczy albo liczy ją sama — zawodnik widzi wtedy '
      + 'jeden wiersz zamiast pięciu i nie ma jak się dowiedzieć, że cztery zniknęły (Z0)');

    check('⭐ (B2-10) licznik na karcie liczy `ileRazem − 1` i milczy przy pozycji pojedynczej',
      cialoOpisz.length > 0
      && /Math\.floor\(ileRazem\)\s*-\s*1/.test(cialoOpisz)
      && /pozostale\s*<\s*1/.test(cialoOpisz)
      && /return\s+null/.test(cialoOpisz),
      `ciało \`opiszPowtorzenie\`: ${cialoOpisz.slice(0, 200) || '(nie wycięte)'} — „to samo powtarza się `
      + 'jeszcze 0 razy" przy pojedynczej pozycji jest hałasem, a pomyłka o jeden w drugą stronę '
      + 'zaniża zawodnikowi jego własny plan');

    check('⛔ (B2-10) brzmienie licznika stoi W STAŁEJ karty, obok `POKAZ_SKAD` i `PODNIESIONE_PRZEZ_CIEBIE`',
      /export const POWTORZENIE_PRZED\s*=/.test(kartaB2)
      && /export const POWTORZENIE_RAZ\s*=/.test(kartaB2)
      && /export const POWTORZENIE_RAZY\s*=/.test(kartaB2)
      && /POKAZ_SKAD/.test(kartaB2) && /PODNIESIONE_PRZEZ_CIEBIE/.test(kartaB2),
      'brzmienie licznika wypadło ze stałych — tekst wpisany wprost w JSX nie daje się wypisać '
      + 'bez uruchomienia appki (reguła R1) i wymyka się przeglądowi Kuby');

    check('⛔ (B2-10) brzmienie jest oznaczone do przeglądu przez Kubę',
      /DO PRZEJRZENIA — B2/.test(kartaSurowa) && /BRZMIENIE_DO_PRZEJRZENIA/.test(kartaSurowa),
      'znacznik `⚠️ DO PRZEJRZENIA — B2` zniknął — brzmienia należą do Kuby, nie do pasa');

    // ⛔ ANI JEDNEJ KOPII NAPISU WPISANEJ WPROST NA EKRANIE.
    // ⚠️ Porównanie z WARTOŚCIĄ stałej, a nie z tekstem przepisanym do tego
    // pliku — inaczej strażnik pilnowałby własnej kopii zdania.
    const wartoscPrzed = /export const POWTORZENIE_PRZED\s*=\s*'([^']*)'/.exec(kartaSurowa)?.[1] ?? null;
    const ILE_RAZY_W_KARCIE = wartoscPrzed === null
      ? -1
      : kartaB2.split(wartoscPrzed).length - 1;
    const EKRANY_B2 = ['app/(tabs)/dzis.tsx', 'components/ListaZadan.tsx'];
    const kopieNaEkranach = wartoscPrzed === null ? [] : EKRANY_B2.filter((p) => {
      const q = join(root, p);
      return existsSync(q) && readFileSync(q, 'utf8').includes(wartoscPrzed);
    });
    check('⛔ (B2-10) napis licznika występuje w karcie DOKŁADNIE RAZ i nie ma go na żadnym ekranie',
      wartoscPrzed !== null && wartoscPrzed.trim().length > 0
      && ILE_RAZY_W_KARCIE === 1 && kopieNaEkranach.length === 0,
      `wartość stałej: ${JSON.stringify(wartoscPrzed)} · wystąpień w karcie: ${ILE_RAZY_W_KARCIE} · `
      + `kopie na ekranach: ${kopieNaEkranach.join(', ') || '—'} — druga kopia rozjedzie się `
      + 'z oryginałem przy pierwszej poprawce brzmienia');
  }

  // ── ⭐ (B2-11) ZAPADKA NA RÓWNOŚĆ: KTO BIERZE WYNIK ZWIJANIA ──
  // ⚠️ Zwijanie zmienia LICZBĘ WIERSZY, którą widzi każdy konsument kolejki.
  // Sekcja 0-EK pilnuje, kto ją UKŁADA (`ulozKolejke`); ta asercja pilnuje,
  // kto ją BIERZE (`wezDlaWidoku`) — to jest inna liczba i inne pytanie.
  // ⛔ RÓWNOŚĆ, nie „≥ 1" (O73). Kto dołoży kolejnego konsumenta, zobaczy
  // czerwień i będzie musiał sprawdzić, czy jego widok też korzysta ze zwijania.
  {
    const root = dirname(katalog);
    const POMIN = new Set(['_diag_backup', 'node_modules', '.git', '.expo', 'assets']);
    const chodzB2 = (kat: string, out: string[] = []): string[] => {
      if (!existsSync(kat)) return out;
      for (const wpis of readdirSync(kat)) {
        if (POMIN.has(wpis)) continue;
        const p = join(kat, wpis);
        if (statSync(p).isDirectory()) chodzB2(p, out);
        else if (p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p);
      }
      return out;
    };
    // ⚠️ PRZEMIATAM KATALOG, nie wpisuję listy plików (O69). Lista na sztywno
    // kłamie na zielono w dniu, w którym ktoś doda plik.
    const wszystkie = ['app', 'components', 'lib']
      .flatMap((k) => chodzB2(join(root, k)))
      .map((p) => relative(root, p).split(sep).join('/'))
      .filter((p) => !p.endsWith('.selftest.ts'))
      .sort();
    // ⚠️ PYTANIE BRZMI „KTO WOŁA", NIE „GDZIE TE SŁOWA STOJĄ". Plik, który
    // funkcję DEKLARUJE, nie jest jej konsumentem — wliczony podnosiłby licznik
    // o jeden na zawsze i zapadka pilnowałaby liczby, której nikt nie rozumie.
    const wola = (p: string, nazwa: string): boolean => {
      const src = bezKomentarzy(readFileSync(join(root, p), 'utf8'));
      if (new RegExp(`export function ${nazwa}\\s*\\(`).test(src)) return false;
      return new RegExp(`\\b${nazwa}\\s*\\(`).test(src);
    };
    const biora = wszystkie.filter((p) => wola(p, 'wezDlaWidoku')).sort();
    const ukladaja = wszystkie.filter((p) => wola(p, 'ulozKolejke')).sort();
    // ⚠️ ZMIERZONE 16.08.2026 uruchomieniem tego przemiatania, nie z pamięci.
    const BIORA = ['app/(tabs)/dzis.tsx'];
    const UKLADAJA = ['app/(tabs)/dzis.tsx', 'components/ListaZadan.tsx'].sort();
    console.log(`[pomiar B2] konsumenci kolejki 16.08.2026 — układa: ${ukladaja.length} `
      + `[${ukladaja.join(', ')}] · bierze przez wezDlaWidoku: ${biora.length} [${biora.join(', ')}]`);
    check('⭐ (B2-11) ZAPADKA: `wezDlaWidoku` woła DOKŁADNIE JEDEN plik produkcyjny, ten co 16.08',
      biora.length === BIORA.length && BIORA.every((p) => biora.includes(p)),
      `bierze: ${JSON.stringify(biora)} · oczekiwane: ${JSON.stringify(BIORA)} — doszedł konsument: `
      + 'sprawdź, czy jego widok radzi sobie z pozycją niosącą `ileRazem > 1` (musi narysować licznik, '
      + 'inaczej chowa zawodnikowi resztę grupy); ubył: prefiks kolejki przestał gdzieś docierać na ekran');
    check('⭐ (B2-11) ZAPADKA: kolejkę UKŁADAJĄ dokładnie DWA pliki produkcyjne — liczba, nie tylko nazwy',
      ukladaja.length === 2 && UKLADAJA.every((p) => ukladaja.includes(p)),
      `układa: ${JSON.stringify(ukladaja)} · oczekiwane: ${JSON.stringify(UKLADAJA)} — każdy producent `
      + 'kolejki dostaje zwijanie za darmo (jest w `ulozKolejke`), ale każdy MUSI umieć narysować `ileRazem`');
  }
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n8. ⭐ TEST MUTACYJNY — cztery mutacje, liczba FAIL-i przy każdej');
// ═════════════════════════════════════════════════════════════════════
// ⚠️ MUTACJA, KTÓRA NIE PODNOSI LICZBY FAIL-i, OZNACZA TEST, KTÓRY NICZEGO
// NIE PILNUJE. Wtedy trzeba napisać go od nowa, a nie zgłaszać zielone.

type Mutacja = { nazwa: string; opis: string; zasady: Zasady };

const MUTACJE: Mutacja[] = [
  {
    nazwa: 'M1 · bramka Z0 przepuszcza wszystko',
    opis: 'pozycja bez prawdziwego śladu źródłowego wchodzi na ekran',
    zasady: {
      ...ZASADY,
      bramka: (k) => ({ ok: true, skadToWiemy: k.skadToWiemy as Slad }),
    },
  },
  {
    nazwa: 'M2 · nic nigdy nie milczy',
    opis: 'pozycja, która przegrała z arbitrem, mówi tak samo jak zwycięska',
    zasady: { ...ZASADY, wycisz: () => null },
  },
  {
    nazwa: 'M3 · porządek bez rozstrzygnięcia remisów',
    opis: 'kolejność zależy od kolejności wejścia, czyli od kolejności zapytań do bazy',
    zasady: {
      ...ZASADY,
      porownaj: (a, b) => b.waga - a.waga,
    },
  },
  {
    nazwa: 'M4 · brak wejścia udaje pustkę',
    opis: '„nie udało się odczytać" staje się nieodróżnialne od „nic nie ma"',
    zasady: { ...ZASADY, zbierzNieWiem: () => [] },
  },
];

let mutacjeBezEfektu = 0;
console.log(`\nbateria ma ${ROZMIAR_BATERII} asercji · na prawdziwych zasadach FAIL-i: ${wynikiRzeczywiste.filter((r) => !r.ok).length}\n`);

for (const m of MUTACJE) {
  const wyniki = bateria(m.zasady);
  const zapalone = wyniki.filter((r) => !r.ok);
  console.log(`${m.nazwa}`);
  console.log(`   co psuje: ${m.opis}`);
  console.log(`   FAIL-i przy tej mutacji: ${zapalone.length} / ${ROZMIAR_BATERII}`);
  for (const z of zapalone) console.log(`     • ${z.label}`);
  if (zapalone.length === 0) mutacjeBezEfektu++;
  check(`⭐ mutacja „${m.nazwa}" podnosi liczbę FAIL-i`,
    zapalone.length > 0,
    'mutacja przeszła niezauważona — ta bateria niczego nie pilnuje');
  console.log('');
}

check('⭐ KAŻDA z czterech mutacji została złapana',
  mutacjeBezEfektu === 0,
  `mutacji bez efektu: ${mutacjeBezEfektu}`);

// ═════════════════════════════════════════════════════════════════════
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
