// PLAN-D 08.2026 · PAS T2 (19.08.2026) — NOWY PLIK. STRAŻNIK OKNA PORANKA.
//
//   node --experimental-strip-types --import ./tests/rejestracja-hooka.mjs lib/oknoPoranka.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ⛔ ZAKAZ `new URL(...)` DO CZYTANIA PLIKÓW — O53. `tsconfig.json` appki
// ciągnie bibliotekę DOM i kontrola typów pada na TS2769.
//
// ═════════════════════════════════════════════════════════════════════
// CZEGO TEN PLIK PILNUJE — I DLACZEGO KAŻDEJ Z TYCH RZECZY OSOBNO
// ═════════════════════════════════════════════════════════════════════
// Decyzja Kuby z 17.08.2026 („nie można wypełniać ankiety wstecz. To byłoby
// nierzetelne") ma SZEŚĆ wymagań i każde da się spełnić bez pozostałych:
//
//   1. godzina graniczna jest NAZWANĄ STAŁĄ z podanym źródłem (R4),
//   2. po 12:00 ankiety NIE DA SIĘ wypełnić,
//   3. ⛔ kafel NIE ZNIKA — szarzeje i MÓWI DLACZEGO (R5),
//   4. ⛔⛔ ZERO liczenia dni bez ankiety, w JAKIEJKOLWIEK postaci (N1),
//   5. ⛔ zapora stoi W ZAPISIE, nie tylko w wyglądzie (Z0),
//   6. ⛔ strefa czasowa nazwana wprost i sprawdzona asercją (Z0).
//
// ⚠️ CZEGO TEN PLIK NIE UDAJE. Nie uruchamia Reacta i nie wie, czy ekran się
// rysuje. Wymagania 1, 2, 4 i 6 sprawdza WYWOŁANIEM czystych funkcji;
// wymagania 3 i 5 — CZYTANIEM ŹRÓDŁA `app/(tabs)/dziennik.tsx` jako tekstu,
// bo one nie siedzą w funkcji, tylko w sposobie, w jaki ekran jej używa
// (ta sama metoda co `lib/ostatniCentymetr.selftest.ts`).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  OKNO_PORANKA_DO_GODZINY,
  OKNO_PORANKA_ZEGAR,
  OKNO_PORANKA_ZAMKNIETE_ZDANIE,
  stanOknaPoranka,
  czyOknoPorankaOtwarte,
  powodOdmowyZapisuPoranka,
} from './oknoPoranka';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

const libDir = dirname(fileURLToPath(import.meta.url));
const appRoot = dirname(libDir);
const SCIEZKA_DZIENNIKA = join(appRoot, 'app', '(tabs)', 'dziennik.tsx');
const zrodloDziennika = readFileSync(SCIEZKA_DZIENNIKA, 'utf8');
const zrodloModulu = readFileSync(join(libDir, 'oknoPoranka.ts'), 'utf8');

/**
 * Źródło bez komentarzy. ⛔ TEKST PRZECHODZONY RAZ, ze stanem — nie dwoma
 * `replace` po sobie. Powód jest zmierzony i opisany w
 * `lib/ostatniCentymetr.selftest.ts` (pas Q1, 17.08.2026): przy dwóch
 * `replace` komentarz cytujący ścieżkę w rodzaju `lib/*.selftest.ts` otwiera
 * „blok", który leci do następnego zamknięcia i zjada prawdziwy kod —
 * w jednym strażniku zjadło 87 % pliku, a asercje przechodziły.
 */
function bezKomentarzy(tekst: string): string {
  let wynik = '';
  let i = 0;
  let wNapisie: string | null = null;
  while (i < tekst.length) {
    const z = tekst[i];
    const nast = tekst[i + 1];
    if (wNapisie !== null) {
      wynik += z;
      if (z === '\\') { wynik += nast ?? ''; i += 2; continue; }
      if (z === wNapisie) wNapisie = null;
      i += 1;
      continue;
    }
    if (z === '"' || z === "'" || z === '`') { wNapisie = z; wynik += z; i += 1; continue; }
    if (z === '/' && nast === '/') {
      while (i < tekst.length && tekst[i] !== '\n') i += 1;
      continue;
    }
    if (z === '/' && nast === '*') {
      i += 2;
      while (i < tekst.length && !(tekst[i] === '*' && tekst[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    wynik += z;
    i += 1;
  }
  return wynik;
}

const kodDziennika = bezKomentarzy(zrodloDziennika);

/** Zegar ustawiony co do godziny — bez dotykania zegara maszyny. */
const oGodzinie = (h: number, m = 0) => new Date(2026, 7, 19, h, m, 0, 0);

// ═════════════════════════════════════════════════════════════════════
console.log('\n1. ⭐ (T2-1) GODZINA GRANICZNA JEST NAZWANĄ STAŁĄ, A NIE LICZBĄ W WARUNKU');
// ═════════════════════════════════════════════════════════════════════
{
  check('⭐ stała `OKNO_PORANKA_DO_GODZINY` istnieje i wynosi 12',
    OKNO_PORANKA_DO_GODZINY === 12, String(OKNO_PORANKA_DO_GODZINY));

  // ⛔ R4: liczba, której nikt nie umie uzasadnić, po tygodniu staje się
  // „liczbą z badania". Ta ma powiedziane w źródle, że jest decyzją.
  check('⭐⛔ (R4) źródło stałej MÓWI, że to DECYZJA KUBY, a nie liczba z badania',
    /decyzja produktowa Kuby z 17\.08\.2026/.test(zrodloModulu)
    && /NIE JEST TO LICZBA Z BADANIA/i.test(zrodloModulu),
    'stała nie mówi, skąd się wzięła — po tygodniu nikt tego nie odróżni od wyniku badania');

  check('⛔ ekran NIE porównuje godziny sam — nie ma w nim gołego `getHours()`',
    !/getHours\(\)\s*[<>]/.test(kodDziennika),
    'ekran ma własną kopię reguły; przy zmianie godziny rozjadą się dwa miejsca');

  check('⛔ w ekranie nie stoi goła dwunastka jako granica',
    !/[<>]=?\s*12\b/.test(kodDziennika), 'liczba 12 wróciła do warunku na ekranie');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n2. ⭐ (T2-2) PO 12:00 ANKIETY NIE DA SIĘ WYPEŁNIĆ — GODZINA PO GODZINIE');
// ═════════════════════════════════════════════════════════════════════
{
  const OTWARTE = [0, 5, 7, 9, 11];
  const ZAMKNIETE = [12, 13, 15, 18, 21, 23];

  check('⭐ przed 12:00 okno jest OTWARTE — sprawdzone na pięciu godzinach',
    OTWARTE.every((h) => stanOknaPoranka(oGodzinie(h)) === 'otwarte'),
    OTWARTE.map((h) => `${h}:${stanOknaPoranka(oGodzinie(h))}`).join(' '));

  check('⭐⛔ od 12:00 okno jest ZAMKNIĘTE — sprawdzone na sześciu godzinach',
    ZAMKNIETE.every((h) => stanOknaPoranka(oGodzinie(h)) === 'zamkniete'),
    ZAMKNIETE.map((h) => `${h}:${stanOknaPoranka(oGodzinie(h))}`).join(' '));

  // ⚠️ GRANICA JEST WYŁĄCZNA i to jest decyzja, nie przypadek: „do 12:00"
  // znaczy „dopóki nie ma dwunastej". 11:59 przechodzi, 12:00:00 już nie.
  check('⭐ 11:59 przechodzi, a 12:00:00 już NIE — granica jest wyłączna',
    czyOknoPorankaOtwarte(oGodzinie(11, 59)) && !czyOknoPorankaOtwarte(oGodzinie(12, 0)),
    `${stanOknaPoranka(oGodzinie(11, 59))} / ${stanOknaPoranka(oGodzinie(12, 0))}`);

  check('⛔ stan ma DWIE wartości, nigdy trzeciej „nie wiem"',
    [0, 11, 12, 23].every((h) => ['otwarte', 'zamkniete'].includes(stanOknaPoranka(oGodzinie(h)))),
    'pojawił się trzeci stan — a trzeci stan zawsze kończy się „skoro nie wiem, to przepuszczam"');

  check('⭐ `powodOdmowyZapisuPoranka` milczy przed 12:00 i mówi po',
    powodOdmowyZapisuPoranka(oGodzinie(9)) === null
    && powodOdmowyZapisuPoranka(oGodzinie(14)) === OKNO_PORANKA_ZAMKNIETE_ZDANIE,
    `${String(powodOdmowyZapisuPoranka(oGodzinie(9)))} / ${String(powodOdmowyZapisuPoranka(oGodzinie(14)))}`);
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n3. ⭐⛔ (T2-3) KAFEL NIE ZNIKA — SZARZEJE I MÓWI, DLACZEGO (R5)');
// ═════════════════════════════════════════════════════════════════════
{
  check('⭐ zdanie istnieje i jest JEDNYM zdaniem, nie akapitem',
    OKNO_PORANKA_ZAMKNIETE_ZDANIE === 'Dziś już nie — ankieta mierzy poranek.',
    OKNO_PORANKA_ZAMKNIETE_ZDANIE);

  check('⭐ zdanie podaje POWÓD, a nie sam zakaz',
    /mierzy poranek/.test(OKNO_PORANKA_ZAMKNIETE_ZDANIE), OKNO_PORANKA_ZAMKNIETE_ZDANIE);

  check('⛔ zdanie NIE przeprasza i NIE obiecuje przypomnienia (pchnięcie to osobna decyzja W3)',
    !/przepraszam|przykro|przypomn|powiadom/i.test(OKNO_PORANKA_ZAMKNIETE_ZDANIE),
    OKNO_PORANKA_ZAMKNIETE_ZDANIE);

  // ⛔ TU JEST CAŁA RÓŻNICA MIĘDZY „SZARZEJE" A „ZNIKA". Kafel musi zostać
  // narysowany BEZ WARUNKU o oknie — inaczej po 12:00 zawodnik nie odróżnia
  // „wypełniłem" od „przepadło" (R5).
  check('⭐⭐ (R5) kafel „Wpis poranny" jest rysowany BEZ WARUNKU o oknie — nie znika',
    /Wpis poranny/.test(kodDziennika)
    && !/oknoPorankaOtwarte\s*&&[^\n]*Wpis poranny/.test(kodDziennika)
    && !/oknoPorankaOtwarte\s*\?[^\n]*Wpis poranny/.test(kodDziennika),
    'kafel wpisu porannego zniknął albo został schowany za warunkiem okna');

  check('⭐ kafel dostaje po 12:00 OSOBNY styl (szarzeje), a nie inny tekst',
    /toggleBtnPoOknie/.test(kodDziennika) && /toggleBtnPoOknie:\s*\{/.test(kodDziennika),
    'brak stylu zaszarzenia — kafel po 12:00 wygląda tak samo jak przed');

  check('⛔ (Z2) zaszarzenie NIE JEST czerwienią — czerwień należy wyłącznie do bólu',
    !/toggleBtnPoOknie:\s*\{[^}]*colors\.error/.test(kodDziennika),
    'do stylu zamkniętego okna weszła czerwień');

  check('⭐ ekran rysuje ZDANIE, a nie samą szarość',
    /OKNO_PORANKA_ZAMKNIETE_ZDANIE/.test(kodDziennika),
    'zdanie o powodzie nie jest nigdzie na ekranie — kafel szarzeje i milczy');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n4. ⭐⛔ (T2-5) ZAPORA STOI W ZAPISIE, NIE TYLKO W WYGLĄDZIE (Z0)');
// ═════════════════════════════════════════════════════════════════════
{
  // ⛔ POWÓD JEST PRAKTYCZNY: wystarczy otworzyć ekran o 11:58 i dotknąć
  // „Zapisz" o 15:00. `disabled` na przycisku było policzone przy renderze.
  const funkcjaZapisu = kodDziennika.slice(kodDziennika.indexOf('const submitDailyLog'));
  const doPierwszegoAwait = funkcjaZapisu.slice(0, funkcjaZapisu.indexOf('await'));

  check('⭐⭐ (Z0) `submitDailyLog` PYTA O OKNO, zanim cokolwiek zapisze',
    /powodOdmowyZapisuPoranka/.test(doPierwszegoAwait),
    'zapory nie ma w zapisie — wystarczy zostawić otwarty ekran przez południe');

  check('⭐ zapora czyta zegar W CHWILI ZAPISU (`new Date()`), a nie stan z renderu',
    /powodOdmowyZapisuPoranka\(new Date\(\)\)/.test(doPierwszegoAwait),
    'zapis pyta o stan policzony przy renderze — czyli o godzinę sprzed kilku godzin');

  check('⭐ odmowa KOŃCZY funkcję (`return`), a nie tylko pokazuje napis',
    /powodOdmowyZapisuPoranka[\s\S]{0,220}?return;/.test(doPierwszegoAwait),
    'po odmowie funkcja leci dalej i zapisuje mimo wszystko');

  check('⛔ zapora dotyczy WYŁĄCZNIE wpisu porannego — potreningowy zostaje otwarty',
    /entryType === 'morning'[\s\S]{0,200}?powodOdmowyZapisuPoranka/.test(doPierwszegoAwait),
    'zapora objęła też wpis potreningowy, który z porankiem nie ma nic wspólnego');

  check('⭐ stan okna dla WYGLĄDU jest liczony przy renderze, a nie trzymany w `useState`',
    /const oknoPorankaOtwarte = czyOknoPorankaOtwarte\(new Date\(\)\)/.test(kodDziennika)
    && !/useState[^\n]*[oO]knoPoranka/.test(kodDziennika),
    'stan okna zamrożony w `useState` — ekran otwarty rano pokaże otwarte okno do wieczora');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n5. ⭐⛔⛔ (T2-4) ZERO LICZENIA DNI BEZ ANKIETY — REGUŁA N1');
// ═════════════════════════════════════════════════════════════════════
{
  // ⛔ N1: NAGRADZAMY WYKONANĄ PRACĘ, NIGDY OBECNOŚĆ. Licznik nieobecności
  // jest tą samą mechaniką co seria — odwróconą i wymierzoną w zawodnika,
  // który akurat miał zawody, chorobę albo szkołę.
  // ⛔ Zapadka przemiata OBA pliki tego pasa, także „po cichu, do logu".
  // ⛔ WZORZEC ŁAPIE TAKŻE NAZWY ZMIENNYCH. Cichy licznik nie nazywa się
  // „dni bez ankiety" — nazywa się `dniBezAnkiety`. Zapadka na samą frazę
  // z odstępami przepuściłaby dokładnie to, przed czym stoi.
  const SLOWA_SERII =
    /dni bez ankiety|dni?BezAnkiety|dni_bez_ankiety|dzień z rzędu|dni z rzędu|z rzędu bez|ZRzedu|_z_rzedu|seria wpis|seriaWpis|streak|passa|bez wpisu od|bezWpisu/i;

  check('⭐⛔⛔ (N1) `lib/oknoPoranka.ts` NIE LICZY dni bez ankiety w ŻADNEJ postaci',
    !SLOWA_SERII.test(bezKomentarzy(zrodloModulu)),
    'w module pojawiło się liczenie nieobecności');

  check('⭐⛔⛔ (N1) `app/(tabs)/dziennik.tsx` NIE LICZY dni bez ankiety w ŻADNEJ postaci',
    !SLOWA_SERII.test(kodDziennika), 'na ekranie pojawiło się liczenie nieobecności');

  check('⛔ (N1) zdanie dla zawodnika NIE ZAWIERA ani jednej liczby',
    !/[0-9]/.test(OKNO_PORANKA_ZAMKNIETE_ZDANIE), OKNO_PORANKA_ZAMKNIETE_ZDANIE);

  check('⛔ (N1) odmowa NIE ZOSTAWIA śladu — nie ma `console` ani zapisu przy odmowie',
    !/powodOdmowyZapisuPoranka[\s\S]{0,220}?(console\.|supabase\.)/.test(kodDziennika),
    'odmowa zapisuje ślad — czyli po cichu jednak liczy nieobecność');

  check('⛔ moduł nie eksportuje ŻADNEJ funkcji, która przyjmuje historię wpisów',
    !/export function \w+\([^)]*(historia|wpisy|logs|entries)/i.test(zrodloModulu),
    'moduł dostał wejście, z którego da się policzyć serię');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n6. ⭐⛔ (T2-6) STREFA CZASOWA NAZWANA WPROST');
// ═════════════════════════════════════════════════════════════════════
{
  check('⭐ stała `OKNO_PORANKA_ZEGAR` mówi WPROST, czyj to zegar',
    /zegar lokalny urządzenia zawodnika/.test(OKNO_PORANKA_ZEGAR)
    && /nie UTC/.test(OKNO_PORANKA_ZEGAR), OKNO_PORANKA_ZEGAR);

  // ⭐ ASERCJA URUCHOMIENIOWA, NIE LEKTURA KOMENTARZA. Data zbudowana
  // konstruktorem lokalnym `new Date(rok, mies, dzień, godz…)` musi być
  // czytana tym samym, lokalnym zegarem — inaczej reguła mówiłaby o UTC.
  const lokalna = new Date(2026, 7, 19, 11, 30, 0, 0);
  check('⭐⭐ (Z0) reguła czyta zegar LOKALNY, nie UTC — sprawdzone wywołaniem',
    lokalna.getHours() === 11 && czyOknoPorankaOtwarte(lokalna),
    `getHours=${lokalna.getHours()} · getUTCHours=${lokalna.getUTCHours()}`);

  check('⛔ moduł NIE używa `getUTCHours` ani `toISOString` do rozstrzygania okna',
    !/getUTCHours|toISOString/.test(bezKomentarzy(zrodloModulu)),
    'okno rozstrzygane zegarem UTC — zawodnik w Polsce latem miałby je do 14:00 swojego czasu');

  // ⚠️ DEDUPLIKACJA WPISU PORANNEGO NA TYM EKRANIE liczy „dziś" tym samym,
  // lokalnym zegarem (`setHours(0, 0, 0, 0)`). Dwa mechanizmy na jednym
  // ekranie muszą mierzyć tym samym zegarem — inaczej istnieje godzina,
  // w której „dziś" znaczy dwie różne rzeczy.
  check('⭐ ekran mierzy „dziś" TYM SAMYM zegarem co okno (deduplikacja lokalna)',
    /setHours\(0, 0, 0, 0\)/.test(kodDziennika), 'deduplikacja przeszła na inny zegar niż okno');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n7. ⭐⭐ BATERIA MUTACJI — NA PRAWDZIWYCH PLIKACH');
// ═════════════════════════════════════════════════════════════════════
// ⛔ NAJPIERW ASERCJA ODWROTNA. Bateria uruchomiona na PRAWDZIWYM źródle ma
// dać ZERO zapaleń — inaczej badałaby pustkę i wyglądałaby na skuteczną.
{
  type Ekran = { kod: string; modul: string; zdanie: string; przedPoludniem: boolean; poPoludniu: boolean };

  const PRAWDA: Ekran = {
    kod: kodDziennika,
    modul: bezKomentarzy(zrodloModulu),
    zdanie: OKNO_PORANKA_ZAMKNIETE_ZDANIE,
    przedPoludniem: czyOknoPorankaOtwarte(oGodzinie(9)),
    poPoludniu: czyOknoPorankaOtwarte(oGodzinie(15)),
  };

  /** Sześć reguł tego pasa, sprawdzanych na PODANYM stanie. */
  const regulyLamane = (s: Ekran): string[] => {
    const zle: string[] = [];
    if (!(s.przedPoludniem && !s.poPoludniu)) zle.push('⛔ T2-2 — okno nie zamyka się po 12:00');
    if (!/powodOdmowyZapisuPoranka\(new Date\(\)\)/.test(s.kod)) zle.push('⛔ Z0 — zapory nie ma w zapisie');
    if (!/Wpis poranny/.test(s.kod)) zle.push('⛔ R5 — kafel ankiety zniknął z ekranu');
    if (!/toggleBtnPoOknie/.test(s.kod)) zle.push('⛔ R5 — kafel nie szarzeje');
    if (!/OKNO_PORANKA_ZAMKNIETE_ZDANIE/.test(s.kod)) zle.push('⛔ R5 — kafel milczy o powodzie');
    if (/dni bez ankiety|dni?BezAnkiety|dni z rzędu|ZRzedu|streak|bezWpisu/i.test(`${s.kod}${s.modul}`)) zle.push('⛔ N1 — pojawił się licznik dni bez ankiety');
    if (/[0-9]/.test(s.zdanie)) zle.push('⛔ N1 — zdanie dla zawodnika podaje liczbę');
    return zle;
  };

  check('⭐⭐ ASERCJA ODWROTNA — na PRAWDZIWYCH plikach bateria ma ZERO zapaleń',
    regulyLamane(PRAWDA).length === 0, regulyLamane(PRAWDA).join(' · '));

  const MUTACJE: Array<[string, Ekran]> = [
    ['M1 ⛔ zapis wstecz przechodzi — okno otwarte o 15:00',
      { ...PRAWDA, poPoludniu: true }],
    ['M2 ⛔ zapory nie ma w zapisie, została sama szarość',
      { ...PRAWDA, kod: PRAWDA.kod.replace(/powodOdmowyZapisuPoranka\(new Date\(\)\)/g, 'null') }],
    ['M3 ⛔ kafel ZNIKA wieczorem, zamiast szarzeć',
      { ...PRAWDA, kod: PRAWDA.kod.replace(/Wpis poranny/g, '').replace(/toggleBtnPoOknie/g, '') }],
    ['M4 ⛔ kafel szarzeje, ale MILCZY — bez zdania o powodzie',
      { ...PRAWDA, kod: PRAWDA.kod.replace(/OKNO_PORANKA_ZAMKNIETE_ZDANIE/g, "''") }],
    ['M5 ⛔ pojawia się licznik dni bez ankiety',
      { ...PRAWDA, kod: `${PRAWDA.kod}\nconst dniBezAnkiety = policzDniZRzedu(historia);` }],
    ['M6 ⛔ zdanie zaczyna podawać liczbę („trzeci dzień bez wpisu")',
      { ...PRAWDA, zdanie: 'Dziś już nie — to 3. dzień bez wpisu.' }],
  ];

  const zapalenia = MUTACJE.map(([opis, stan]) => {
    const zle = regulyLamane(stan);
    console.log(`       ${opis}   →   ${zle.length} zapaleń: ${zle.join(' · ') || '⛔⛔ ŻADNEGO'}`);
    return zle.length;
  });

  check('⭐⭐ KAŻDA z sześciu mutacji zapala strażnika',
    zapalenia.every((n) => n > 0), JSON.stringify(zapalenia));

  check('⭐ …a prawdziwe pliki są po baterii NIETKNIĘTE',
    regulyLamane(PRAWDA).length === 0 && kodDziennika === bezKomentarzy(zrodloDziennika),
    'bateria zostawiła po sobie zmieniony stan');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
