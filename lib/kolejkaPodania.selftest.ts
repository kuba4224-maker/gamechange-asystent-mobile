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
} from './kolejkaPodania';
import type {
  Kandydat,
  Kolejka,
  Milczenie,
  PozycjaKolejki,
  Slad,
  WejsciaKolejki,
  Zasady,
} from './kolejkaPodania';
import { czytajOgraniczenia } from './ograniczenia';
import type { StanOgraniczen } from './ograniczenia';
import { odczytZadan } from './zadania';
import type { OdczytZadan } from './zadania';
import type { StanGlosu } from './glosTygodnia';
import type { JednaOdpowiedz } from './jednaOdpowiedz';

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
  const listaMaDodatkowych = /\bdodatkowi\b/.test(lista);
  const listaMaJednaOdpowiedz = !/jednaOdpowiedz:\s*null/.test(lista);
  console.log('[pomiar] 16.08.2026, main=123e09c — components/ListaZadan.tsx: '
    + `dodatkowi (wglądy) = ${listaMaDodatkowych ? 'SĄ' : 'BRAK'} · `
    + `jednaOdpowiedz = ${listaMaJednaOdpowiedz ? 'JEST' : 'null'} · `
    + `producenci kolejki w repo = ${producenci.length} [${producenci.join(', ')}]`);
  check('⭐ (I2-0) ZNANY DŁUG: lista zadań nadal woła rankera BEZ `dodatkowi` i bez „jednej odpowiedzi"',
    !listaMaDodatkowych && !listaMaJednaOdpowiedz,
    'stan się ZMIENIŁ i to jest wynik, nie awaria. Jeżeli `dodatkowi` DOSZŁO — dobrze: '
    + 'lista zadań widzi wreszcie wglądy; skreśl ten dług tutaj i dołóż asercję, że kandydaci '
    + 'idą do rankera, a nie obok niego (wzorzec: `lib/wgladyNaDzis.selftest.ts`, B4-1). '
    + 'Jeżeli pojawił się DRUGI PRODUCENT tych pozycji na tym ekranie zamiast wspólnego '
    + 'przez `dodatkowi` — to jest dokładnie ten kolaż, który etap B wyciął, i trzeba go cofnąć.');
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
