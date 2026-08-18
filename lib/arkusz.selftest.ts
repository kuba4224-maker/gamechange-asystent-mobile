// PLAN-D-A1 08.2026 (18.08.2026) — NOWY PLIK. STRAŻNIK ARKUSZA (A2).
//
// ⛔ CZEGO TEN STRAŻNIK NIE UDAJE: nie uruchamia React Native i nie wie, czy
// nakładka naprawdę się otworzy. Sprawdza trzy rzeczy, których da się dowieść
// bez appki: że brzmienia istnieją dla KAŻDEGO rodzaju arkusza, że komponent
// jest `Modal`-em (czyli nie wchodzi do przewijania ekranu pod spodem) i że
// ekran „Dziś" NAPRAWDĘ go montuje oraz ma z czego go otworzyć.
//
// ⭐ KAŻDY IMPORT SPRAWDZONY URUCHOMIENIEM, NIE TEKSTEM. W tym projekcie
// zdarzyło się już, że asercje tekstowe świeciły na zielono, a ekran wywalał
// się przy pierwszym otwarciu, bo importu nie było. Dlatego funkcje niżej są
// WOŁANE, a nie wyszukiwane wyrażeniem regularnym.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  naglowekArkusza, RODZAJE_ARKUSZA, ARKUSZ_ZAMKNIJ,
  WYSOKOSC_NAGLOWKA_ARKUSZA_DP, type RodzajArkusza,
} from './arkusz';
import { zmierzEkran, WIDOCZNE_NAD_ZGIECIEM_DP } from './wysokoscEkranu';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let bledy = 0; let ok = 0;
function check(nazwa: string, warunek: boolean, szczegol = '') {
  if (warunek) { ok += 1; console.log(`OK   - ${nazwa}`); }
  else { bledy += 1; console.log(`FAIL - ${nazwa}${szczegol ? ': ' + szczegol : ''}`); }
}
const bezKomentarzy = (t: string): string =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

// ═════════════════════════════════════════════════════════════════════
// 1. BRZMIENIA — KAŻDY RODZAJ MA NAGŁÓWEK, ŻADEN NIE JEST PUSTY
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS W1 18.08.2026 — ZAPADKA PRZESTAWIONA Z PIĘCIU NA SZEŚĆ.
// Powód, jednym zdaniem: decyzja Kuby D-B z 18.08 („cały materiał otwiera
// się dotknięciem, w arkuszu") dokłada rodzaj `material`, który zdejmuje
// z ekranu „Dziś" 547 dp ściany tekstu i nie kosztuje ani jednego dp.
// ⛔ Zapadka jest NA RÓWNOŚĆ celowo: szósty arkusz miał się zapalić i się zapalił.
check('⛔ (A2, W1) rodzajów arkusza jest DOKŁADNIE sześć — zapadka na równość (O73)',
  RODZAJE_ARKUSZA.length === 6, `jest ${RODZAJE_ARKUSZA.length}`);

for (const r of RODZAJE_ARKUSZA) {
  const n = naglowekArkusza(r);
  check(`⛔ (A2) „${r}" ma tytuł — arkusz bez tytułu jest oknem bez nazwy`,
    n.tytul.trim().length > 0, JSON.stringify(n));
  check(`⛔ (A2) „${r}" ma dokąd wrócić (kicker) — zawsze da się wyjść`,
    n.kicker.trim().length > 0, JSON.stringify(n));
}

// ⭐ NAZWA RZECZY WCHODZI DO TYTUŁU — dowód WYWOŁANIEM, nie tekstem.
check('⭐ (A2) tytuł oceny to NAZWA rzeczy, a nie zdanie ogólne',
  naglowekArkusza('ocena', 'Trening klubowy').tytul === 'Trening klubowy');
// ⛔ Z0 — pustej nazwy NIE ZMYŚLAMY.
check('⛔ (A2, Z0) bez nazwy rzeczy tytuł jest OGÓLNY, a nie zmyślony',
  naglowekArkusza('ocena', '').tytul === 'Jak poszło?'
  && naglowekArkusza('ocena', '   ').tytul === 'Jak poszło?',
  naglowekArkusza('ocena', '   ').tytul);
check('⭐ (M1 §3) arkusz meczu nosi tytuł z decyzji Kuby 18.08',
  naglowekArkusza('meczWiecej', 'Mecz ligowy').tytul === 'Powiedz więcej o tym meczu',
  naglowekArkusza('meczWiecej', 'Mecz ligowy').tytul);

// ⛔ N1/N3 NA BRZMIENIACH ARKUSZA — pilnowane, nie zakładane.
const ZAKAZANE = [/\bseri[ai]\b/i, /\bpassa\b/i, /z rzędu/i, /codziennie/i,
  /\bgratul/i, /\bbrawo\b/i, /\bświetnie\b/i, /lepiej niż/i, /\binni\b/i];
const wszystkieZdania = RODZAJE_ARKUSZA
  .map((r) => Object.values(naglowekArkusza(r, 'X')).join(' ')).join(' ');
check('⛔ (N1, N3) nagłówki arkuszy nie liczą dni z rzędu, nie chwalą i nie porównują',
  !ZAKAZANE.some((w) => w.test(wszystkieZdania)),
  ZAKAZANE.filter((w) => w.test(wszystkieZdania)).map(String).join(', '));

check('⛔ (A2) zamknięcie ma JEDNO brzmienie na wszystkie arkusze',
  ARKUSZ_ZAMKNIJ === 'zamknij', ARKUSZ_ZAMKNIJ);

// ⛔ Rodzaj spoza listy nie może po cichu oddać `undefined` — sprawdzone WYWOŁANIEM.
const wymyslony = naglowekArkusza('czegoTakiegoNieMa' as RodzajArkusza);
check('⛔ (R5) rodzaj spoza listy nie oddaje po cichu poprawnego nagłówka',
  wymyslony === undefined, JSON.stringify(wymyslony));

// ═════════════════════════════════════════════════════════════════════
// 2. KOMPONENT — NAKŁADKA, NIE KOLEJNA RZECZ NA EKRANIE
// ═════════════════════════════════════════════════════════════════════
const PLIK_ARKUSZ = join(root, 'components', 'Arkusz.tsx');
check('⛔ (A2) `components/Arkusz.tsx` istnieje', existsSync(PLIK_ARKUSZ));
const arkuszTsx = bezKomentarzy(readFileSync(PLIK_ARKUSZ, 'utf8'));

check('⭐⛔ (A2) arkusz jest `Modal`-em — i TYLKO dlatego zdejmuje wysokość, '
  + 'zamiast ją przesuwać',
  /<Modal/.test(arkuszTsx), 'nakładka rysuje się w drzewie ekranu');
check('⛔ (A2) arkusz ZAWSZE ma zamknięcie w tym samym miejscu',
  /ARKUSZ_ZAMKNIJ/.test(arkuszTsx) && /onRequestClose=\{naZamkniecie\}/.test(arkuszTsx));
check('⛔ (A2) wysokość nagłówka bierze się ze stałej modułu, nie z drugiej kopii liczby',
  /WYSOKOSC_NAGLOWKA_ARKUSZA_DP/.test(arkuszTsx)
  && !new RegExp(`minHeight:\\s*${WYSOKOSC_NAGLOWKA_ARKUSZA_DP}`).test(arkuszTsx));
check('⛔ (A2) `naglowek === null` NIE RYSUJE PUSTEGO OKNA (R5)',
  /naglowek === null\) return null/.test(arkuszTsx));
check('⛔ (A2) arkusz nie podejmuje ani jednej decyzji o treści — zero `naglowekArkusza(` '
  + 'w komponencie',
  !/naglowekArkusza\(/.test(arkuszTsx), 'komponent sam sobie pisze brzmienia');

// ⭐ WYSOKOŚĆ ARKUSZA — mierzona tym samym narzędziem co ekrany.
// ⚠️ GRANICA DOWODU, WYPOWIEDZIANA: `zmierzEkran` oddaje tu ZERO i to nie jest
// awaria miary. Korzeniem pomiaru jest pierwszy `ScrollView`, a ten w arkuszu
// zawiera WYŁĄCZNIE `{children}` — całą treść wstawia ekran. ⛔ Znaczy to, że
// tego pliku NIE DA SIĘ zmierzyć w oderwaniu od wołającego, i asercja niżej
// pilnuje właśnie tego: arkusz jest SKORUPĄ, a nie ekranem z własną treścią.
// Wysokości KAŻDEGO stanu arkusza pilnuje strażnik ekranu „Dziś"
// (`lib/wysokoscEkranu.selftest.ts`), bo to tam stoi treść.
const miara = zmierzEkran(PLIK_ARKUSZ);
console.log(`   · arkusz: ${Math.round(miara.wysokoscRazemDp)} dp `
  + `(nad zgięciem ${miara.nadZgieciem} z ${miara.pozycje.length})`);
check('⭐⛔ (A2) arkusz jest SKORUPĄ — nie niesie ani jednej własnej rzeczy '
  + 'na ekranie; cała treść przychodzi od wołającego',
  miara.pozycje.length === 0 && miara.wysokoscRazemDp === 0,
  `${Math.round(miara.wysokoscRazemDp)} dp, pozycji ${miara.pozycje.length}`);
check(`⛔ (A2) nagłówek arkusza mieści się nad zgięciem (${WIDOCZNE_NAD_ZGIECIEM_DP} dp) `
  + 'z zapasem na treść',
  WYSOKOSC_NAGLOWKA_ARKUSZA_DP > 0
  && WYSOKOSC_NAGLOWKA_ARKUSZA_DP < WIDOCZNE_NAD_ZGIECIEM_DP / 4,
  `${WYSOKOSC_NAGLOWKA_ARKUSZA_DP} dp`);

// ═════════════════════════════════════════════════════════════════════
// 3. ⭐ EKRAN NAPRAWDĘ GO MONTUJE — I MA CZYM GO OTWORZYĆ
// ═════════════════════════════════════════════════════════════════════
// ⛔ TO JEST NAJWAŻNIEJSZA GRUPA. Komponent zbudowany i niezamontowany to
// dokładnie ta pozycja „KOD GOTOWY", której ten projekt ma 32 sztuki.
const ekran = bezKomentarzy(readFileSync(join(root, 'app', '(tabs)', 'dzis.tsx'), 'utf8'));
check('⭐⛔ (A2) ekran „Dziś" IMPORTUJE komponent arkusza',
  /import Arkusz from '\.\.\/\.\.\/components\/Arkusz'/.test(ekran));
check('⭐⛔ (A2) ekran „Dziś" MONTUJE `<Arkusz` — nie tylko go importuje',
  /<Arkusz\b/.test(ekran), 'import bez montażu — komponent zbudowany i niewidoczny');
check('⭐⛔ (A2) ekran karmi arkusz nagłówkiem Z MODUŁU',
  /naglowekArkusza\(/.test(ekran), 'ekran pisze brzmienia arkusza sam');

// ⭐ KAŻDY RODZAJ ARKUSZA MA WEJŚCIE Z EKRANU — inaczej jest martwym wpisem.
const bezWejscia = RODZAJE_ARKUSZA.filter(
  (r) => !new RegExp(`rodzaj:\\s*'${r}'`).test(ekran));
check('⭐⛔ (A2, W1) KAŻDY z sześciu rodzajów arkusza ma wejście z ekranu „Dziś"',
  bezWejscia.length === 0, `bez wejścia: ${bezWejscia.join(', ') || '—'}`);

check('⭐⛔ (A2) arkusz stoi POZA `ScrollView` — inaczej podnosiłby ekran '
  + 'zamiast stać nad nim',
  ekran.indexOf('</ScrollView>') < ekran.indexOf('<Arkusz'),
  'arkusz wpięty do przewijania ekranu');

// ⭐⭐ SEDNO A2: ocena jest wołana Z ARKUSZA, a nie z karty na ekranie.
// ⛔ Sprawdzane na CIELE `ScrollView`, nie na całym pliku: wywołanie stoi
// w `trescArkusza()`, czyli FIZYCZNIE WYŻEJ w pliku niż `<ScrollView>`,
// więc porównanie pozycji w tekście dałoby fałszywy alarm (O97).
const iScroll = ekran.indexOf('<ScrollView');
const cialoScroll = ekran.slice(iScroll, ekran.indexOf('</ScrollView>'));
check('⭐⛔ (A2) ocena z kafla NIE stoi w ciele `ScrollView` ekranu — '
  + 'inaczej wraca razem z nią 4 663 dp',
  iScroll > 0 && !/renderPytaniaOWystapienia\(/.test(cialoScroll),
  'render pytań wrócił na ekran');
check('⭐⛔ (A2) ocena z kafla JEST wołana — bez tego zniknęła, a nie przeniosła się',
  /\{renderPytaniaOWystapienia\(\)\}/.test(ekran)
  && /renderPytaniaOWystapienia\(arkusz\.klucz\)/.test(ekran),
  'brak wywołania renderu pytań');

// ⛔ PODSUMOWANIE W KSZTAŁCIE, KTÓRY CZYTA `tests/run-selftests.mjs`.
// Bez tej linii runner nie odróżnia strażnika, który wszystko sprawdził,
// od takiego, który nie uruchomił ani jednej asercji (znalezisko H1, O76).
console.log(`\n${ok} passed, ${bledy} failed`);
if (bledy > 0) throw new Error(`${bledy} asercji nie przeszło`);
