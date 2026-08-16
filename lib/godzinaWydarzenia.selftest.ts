// PLAN-D-A2A3 08.2026 (14.08.2026) — STRAŻNIK GODZINY OPCJONALNEJ.
//
//   npx tsx lib/godzinaWydarzenia.selftest.ts
//
// (albo `node tests/run-selftests.mjs`, który odkrywa ten plik sam).
// Ten sam wzorzec co lib/focusBlockProgress.selftest.ts.
//
// ⚠️ Ten strażnik pilnuje REGUŁY, nie dzisiejszej listy wartości. Reguła brzmi:
// BRAK GODZINY MA ZOSTAĆ BRAKIEM — a nie zamienić się w napis, który na ekranie
// wygląda jak dane.
//
// ⛔ ZAKAZ `new URL(...)` w tym pliku: `tsconfig.json` appki ciągnie bibliotekę
// DOM i kontrola typów pada (O53, TS2769). Wzorzec z `readFileSync(join(...))`.
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75)
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — nazwane liczbą, nie odczuciem. Ten plik miał 49 ASERCJI
// i ANI JEDNEJ, która czytałaby jakikolwiek EKRAN. Jedyny `readFileSync`
// w sekcji (5) czytał `lib/godzinaWydarzenia.ts`, czyli WŁASNY MODUŁ.
// Audyt H1 (15.08) zaliczył go do niezapalających się i podał commit
// „z defektem" `0705760` — który jest STARSZY niż commit narodzin modułu
// (`be39585`, 14.08). To jest błąd H1 (O74): na `0705760` tego modułu jeszcze
// nie było, więc żaden jego strażnik nie miał prawa się tam zapalić.
//
// DLACZEGO TO JEST GROŹNE AKURAT TUTAJ. Cały ten moduł istnieje po to, żeby
// BRAK GODZINY ZOSTAŁ BRAKIEM: `formatujGodzine` oddaje `null`, nigdy `''`
// i nigdy `'—'`, bo pusty napis i myślnik WYGLĄDAJĄ NA EKRANIE JAK DANE.
// Reguła policzona bezbłędnie w module i OMINIĘTA NA EKRANIE przechodziła tu
// 49 na 49. Ekran, który zrobi `formatujGodzine(x) ?? '—'` albo weźmie godzinę
// prosto z `e.scheduled_time`, pokaże zawodnikowi tag, w którym „coś jest",
// a zawodnik nie ma jak odróżnić „nie podałem godziny" od „system ją zgubił".
//
// ⚠️ CZEGO SEKCJA 0 NIE POWIELA. `lib/meczWKalendarzu.selftest.ts` czyta ten
// sam ekran i pilnuje ŚCIEŻKI ZAPISU (godzina idzie do bazy przez
// `przygotujGodzineDoZapisu`) oraz tego, że skoro ekran rysuje godzinę, to
// pobiera kolumnę `scheduled_time` i deklaruje ją w typie `CalEvent`.
// Sekcja 0 niżej pilnuje ŚCIEŻKI ODCZYTU I RYSOWANIA — czyli tego, czego tam
// nie ma: że godzina JEST rysowana, że rysuje ją funkcja modułu, i że gałąź
// „nie znam godziny" nie ma czym się narysować.
//
// ⚠️ CZEGO TA SEKCJA NIE UDAJE. Czyta źródło ekranu JAKO TEKST. Nie uruchamia
// Reacta i nie wie, czy ekran się rysuje. Podmiana wywołania na inne, równie
// zepsute, przejdzie tu niezauważona.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  walidujGodzine,
  formatujGodzine,
  czyPokazacGodzine,
  godzinaWMinutach,
} from './godzinaWydarzenia';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ 0. PAS I2 16.08.2026 — EKRAN, KTÓRY RYSUJE GODZINĘ (K4 / O75)
// ═══════════════════════════════════════════════════════════════════
// Wszystkie asercje niżej czytają ŹRÓDŁO EKRANU I POŚREDNIKA, nie moduł.
// Bez nich 49 asercji tego pliku opisuje funkcję, której nikt nie musi wołać.

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — pliki tego projektu CYTUJĄ w komentarzach nazwy
 * funkcji i zepsute wywołania („`formatujGodzine` zwraca `null`, gdy godziny
 * nie ma (nie `''` i nie `'—'`)" stoi komentarzem w `kalendarz.tsx`), więc
 * strażnik czytający surowy tekst przechodziłby — albo zapalał się — NA
 * WŁASNEJ DOKUMENTACJI. Wtedy jedynym sposobem, żeby go uciszyć, byłoby
 * skasowanie wyjaśnienia, czyli tej wiedzy, dla której powstał.
 */
const bezKomentarzy = (s: string): string => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .join('\n');

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

const PLIK_KALENDARZ = 'app/(tabs)/kalendarz.tsx';
const PLIK_WIDOK_TYGODNIA = 'lib/widokTygodnia.ts';
const kalendarz = bezKomentarzy(surowe(PLIK_KALENDARZ));
const widokTygodnia = bezKomentarzy(surowe(PLIK_WIDOK_TYGODNIA));

{
  console.log('0. EKRAN, KTÓRY RYSUJE GODZINĘ (K4 / O75)');

  check('⛔ (I2-0) każdy plik z listy strażnika istnieje i daje się odczytać',
    BRAK_PLIKOW.length === 0,
    `NIE MA TYCH PLIKÓW: ${BRAK_PLIKOW.join(', ')} — zmieniła się nazwa albo miejsce ekranu. `
    + 'Popraw listę w tym pliku ALBO przywróć ekran; do tego czasu asercje niżej '
    + 'czytają PUSTY tekst i nie znaczą nic.');

  // ── Odkrywanie z katalogu, nie lista na sztywno (O69) ──
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
  const zrodlaEkranow = new Map(
    EKRANY.map((p) => [p, bezKomentarzy(readFileSync(join(root, p), 'utf8'))] as const));

  check('(I2-0) (strażnik strażnika) mam co przemiatać — katalogi ekranów nie są puste',
    EKRANY.length >= 20,
    `przemiotłem ${EKRANY.length} plików w app/ i components/ — jeżeli to zero albo garstka, `
    + 'to nie „nikt nie rysuje godziny", tylko przemiatanie trafiło w zły katalog, '
    + 'a asercje na RÓWNOŚĆ niżej przeszłyby na pustym zbiorze');

  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c`, nie przepisane z pamięci.
  // RÓWNOŚĆ, nie „≥ 1" (O73): „co najmniej jeden konsument" przeszłoby także
  // wtedy, gdy kalendarz przestanie wołać moduł i zacznie formatować godzinę
  // po swojemu.
  const importujaModul = EKRANY.filter(
    (p) => /from\s+'[^']*\/godzinaWydarzenia'/.test(zrodlaEkranow.get(p) ?? ''));
  const OCZEKIWANI = [PLIK_KALENDARZ];
  const brakImportu = OCZEKIWANI.filter((p) => !importujaModul.includes(p));
  const nadmiarImportu = importujaModul.filter((p) => !OCZEKIWANI.includes(p));
  check('⭐ (I2-0) moduł godziny woła DOKŁADNIE ten ekran, co 16.08 — RÓWNOŚĆ, nie „≥ 1" (O73)',
    brakImportu.length === 0 && nadmiarImportu.length === 0,
    `BRAKUJE: ${brakImportu.join(', ') || '—'} · NADMIAROWI: ${nadmiarImportu.join(', ') || '—'} `
    + '→ ubył: kalendarz przestał liczyć godzinę modułem, więc reguła „brak godziny zostaje brakiem" '
    + 'obowiązuje już tylko w tym pliku; doszedł: sprawdź, czy nowy ekran rysuje `null` jako BRAK TAGU, '
    + 'a nie jako myślnik.');

  // ⭐ DRUGI ZBIÓR NA RÓWNOŚĆ: kto RYSUJE gotową godzinę (`.godzina` z pozycji
  // dnia albo z kolejki). Import modułu i rysowanie tagu to dwie różne rzeczy —
  // godzinę policzoną w `lib/` rysują ekrany, które modułu wcale nie importują.
  const rysujaTag = EKRANY.filter((p) => /\.godzina\b/.test(zrodlaEkranow.get(p) ?? ''));
  const RYSUJACY = [
    'app/(tabs)/dzis.tsx',
    PLIK_KALENDARZ,
    'components/PozycjaKolejkiCard.tsx',
  ].sort();
  const brakRysujacy = RYSUJACY.filter((p) => !rysujaTag.includes(p));
  const nadmiarRysujacy = rysujaTag.filter((p) => !RYSUJACY.includes(p));
  check('⭐ (I2-0) tag godziny rysują DOKŁADNIE te trzy miejsca, co 16.08 — RÓWNOŚĆ (O73)',
    brakRysujacy.length === 0 && nadmiarRysujacy.length === 0,
    `BRAKUJE: ${brakRysujacy.join(', ') || '—'} · NADMIAROWI: ${nadmiarRysujacy.join(', ') || '—'} `
    + '→ ubył: zawodnik przestał gdzieś widzieć godzinę, którą podał, a 49 asercji niżej '
    + 'nadal jest zielonych; doszedł: sprawdź, czy nowe miejsce nie rysuje pustego tagu przy `null`.');

  // ── ⛔ JEDEN RACHUNEK GODZINY, NIE DWA ──
  // Defekt, którego pilnuje: ekran bierze `scheduled_time` prosto z bazy
  // i przycina je sam (`'18:00:00'.slice(0, 5)`). Wtedy w produkcie są DWA
  // formatowania tej samej rzeczy, a to na ekranie nie zna ani tolerancji na
  // sekundy z PostgREST, ani reguły „wartość bez sensu = nie pokazuj nic".
  // Skutek dla zawodnika: w kalendarzu stoi `25:00` albo `18:00:0`.
  check('⛔ (I2-0) kalendarz NIE formatuje godziny sam — ani jednego cięcia na `scheduled_time`',
    !/scheduled_time[^\n]*\.\s*(slice|substr|substring)\s*\(/.test(kalendarz)
    && !/\.\s*(slice|substr|substring)\s*\([^)]*\)[^\n]*scheduled_time/.test(kalendarz),
    'na ekranie pojawił się drugi sposób robienia tagu godziny; formatowanie ma JEDNO miejsce '
    + 'i jest nim `formatujGodzine()` w lib/godzinaWydarzenia.ts');

  check('⛔ (I2-0) kalendarz liczy tag przez `formatujGodzine(e.scheduled_time)`',
    /formatujGodzine\(\s*e\.scheduled_time\s*\)/.test(kalendarz),
    'ekran przestał wołać `formatujGodzine` na wartości z bazy — reguła „brak godziny zostaje brakiem" '
    + 'nie ma się gdzie wykonać, a `18:00:00` z PostgREST wyjedzie zawodnikowi z sekundami');

  // ── ⛔ „GODZINA ZNANA" ≠ „NIE ZNAM GODZINY" ──
  // Cała asymetria modułu (`null`, nigdy `''`, nigdy `'—'`) jest po to, żeby
  // te dwa stany dały się na ekranie rozróżnić. Wystarczy jeden `?? '—'`,
  // żeby przestały.
  check('⛔ (I2-0) brak godziny NIE dostaje wartości zastępczej — zero `?? \'—\'` przy godzinie',
    !/(tagGodziny|\.godzina|formatujGodzine\([^)]*\))\s*(\?\?|\|\|)\s*['"`]/.test(kalendarz),
    'ekran podstawia napis w miejsce `null`; zawodnik zobaczy tag, w którym „coś jest", '
    + 'i nie odróżni „nie podałem godziny" od „system ją zgubił" — a to jest dokładnie ta różnica, '
    + 'dla której `formatujGodzine` zwraca `null`, a nie pusty napis');

  check('⛔ (I2-0) o narysowaniu tagu rozstrzyga WYNIK modułu, nie surowe `scheduled_time`',
    !/if\s*\(\s*[A-Za-z_$][\w$]*\.scheduled_time\s*\)/.test(kalendarz)
    && !/[A-Za-z_$][\w$]*\.scheduled_time\s*\?[^?]/.test(kalendarz),
    'ekran pyta o godzinę surową wartość z bazy — a to INNA REGUŁA niż `formatujGodzine`: '
    + 'przepuszcza `\'\'` (pusty tag) i przepuszcza wartości, których nie da się pokazać');

  check('⛔ (I2-0) kalendarz nie rysuje surowego `scheduled_time` prosto w widoku',
    !/\{[^{}\n]*\.scheduled_time\s*\}/.test(kalendarz),
    'wartość z bazy idzie na ekran bez formatowania — zawodnik przeczyta `18:00:00`, '
    + 'a przy wartości spoza doby przeczyta ją tak samo spokojnie');

  // ── ⭐ ZAPADKA NA SKASOWANIE ──
  // Bez tych dwóch asercji wszystkie powyższe spełnia się przez USUNIĘCIE
  // rysowania godziny. Strażnik nagradzałby wtedy skasowanie funkcji.
  check('⭐ (I2-0) policzony tag NAPRAWDĘ idzie do wiersza opisu karty (`meta`)',
    /if\s*\(\s*tagGodziny\s*\)/.test(kalendarz)
    && /meta\.push\(\s*tagGodziny\s*\)/.test(kalendarz)
    && /\{\s*meta\.join\(/.test(kalendarz),
    'godzina jest liczona i nieoddana do widoku — zawodnik podał ją przy planowaniu i nigdzie jej nie widzi; '
    + 'wszystkie asercje wyżej spełnia też ekran, który godziny nie pokazuje wcale');

  check('⭐ (I2-0) wiersz dnia rysuje godzinę WYŁĄCZNIE wtedy, gdy jest — i rysuje ją naprawdę',
    /\{\s*p\.godzina\s*\?\s*<Text[\s\S]{0,120}?\{\s*p\.godzina\s*\}[\s\S]{0,60}?:\s*null\s*\}/.test(kalendarz),
    'zniknął tag godziny z wiersza dnia albo przestał być warunkowy; makieta '
    + '`claude/MAKIETA_WIDOK_TYGODNIA.html` rozstrzyga to jednym zdaniem: „Godzina przy kaflu '
    + 'pojawia się TYLKO WTEDY, GDY ZAWODNIK JĄ PODAŁ"');

  // ── POŚREDNIK: `lib/widokTygodnia.ts` ──
  // Kalendarz rysuje `p.godzina` z pozycji dnia, a tę pozycję buduje widok
  // tygodnia. Gdyby ON wziął `scheduled_time` surowo, ekran byłby czysty,
  // a zawodnik i tak zobaczyłby `18:00:00`.
  check('⛔ (I2-0) pośrednik `widokTygodnia` wkłada do pozycji dnia WYNIK `formatujGodzine`',
    /godzina:\s*formatujGodzine\(/.test(widokTygodnia)
    && !/godzina:\s*[A-Za-z_$][\w$]*\.scheduled_time/.test(widokTygodnia),
    'godzina wchodzi do pozycji dnia z pominięciem modułu — kalendarz narysuje ją wtedy '
    + 'tak, jak przyszła z bazy, mimo że sam ekran jest w porządku');
}

// ── (1) WALIDACJA WPISU ZAWODNIKA ──────────────────────────────────────────
{
  const dobre: Array<[string, string]> = [
    ['08:00', '08:00'],
    ['8:00', '08:00'],     // baza przyjmuje `time '8:00'` — appka nie może być surowsza
    ['00:00', '00:00'],
    ['23:59', '23:59'],
    ['18:00', '18:00'],
    ['  18:00  ', '18:00'],
    ['11:00', '11:00'],
    ['17:30', '17:30'],
  ];
  for (const [wejscie, oczekiwane] of dobre) {
    const r = walidujGodzine(wejscie);
    check(`walidujGodzine przyjmuje ${JSON.stringify(wejscie)} → ${oczekiwane}`,
      r.ok === true && r.wartosc === oczekiwane, JSON.stringify(r));
  }

  check('walidujGodzine normalizuje do dwóch cyfr — jedna godzina, jeden zapis w bazie',
    (walidujGodzine('8:00') as any).wartosc === (walidujGodzine('08:00') as any).wartosc,
    'dwa różne zapisy tej samej godziny');

  const zle: unknown[] = [
    '25:00', '8:70', '24:00', '18:00:30', '', '   ', 'abc', '18', '18:0',
    '1 8:00', '-1:00', '08:00 rano', null, undefined, 1800, {}, [], NaN,
  ];
  for (const wejscie of zle) {
    const r = walidujGodzine(wejscie);
    check(`walidujGodzine odrzuca ${JSON.stringify(wejscie)}`,
      r.ok === false && typeof (r as any).powod === 'string' && (r as any).powod.length > 0,
      JSON.stringify(r));
  }
}

// ── (2) REGUŁA: BRAK ZWRACA `null`, NIGDY NAPIS ────────────────────────────
//
// To jest asercja na regułę. Nie sprawdza jednej wartości, tylko WSZYSTKIE
// kształty „braku", jakie mogą przyjść z bazy, z formularza i z pustego stanu
// Reacta — i wymaga, żeby każdy z nich dał DOKŁADNIE `null`. Gdyby ktoś zwrócił
// `''` albo `'—'`, ekran narysowałby pusty tag, którego zawodnik nie odróżni
// od danych.
{
  const braki: unknown[] = [
    null, undefined, '', '   ', '\t', '—', '-', 'brak', 'null', 'undefined',
    0, false, NaN, {}, [], '25:00', '8:70', 'nie wiem',
  ];
  let zleZwroty: string[] = [];
  for (const b of braki) {
    const r = formatujGodzine(b);
    if (r !== null) zleZwroty.push(`${JSON.stringify(b)} → ${JSON.stringify(r)}`);
  }
  check('formatujGodzine zwraca DOKŁADNIE null dla każdego kształtu braku (nigdy "" ani "—")',
    zleZwroty.length === 0, zleZwroty.join(' · '));

  check('czyPokazacGodzine mówi „nie" dokładnie wtedy, gdy formatujGodzine daje null',
    braki.every((b) => czyPokazacGodzine(b) === false), 'rozjazd między dwiema funkcjami');
}

// ── (3) TOLERANCJA PRZY ODCZYCIE — inaczej appka nie pokaże tego, co zapisała ─
{
  const zBazy: Array<[string, string]> = [
    ['18:00:00', '18:00'],        // tak PostgREST podaje `time`
    ['08:00:00', '08:00'],
    ['18:00', '18:00'],
    ['08:00:00.000', '08:00'],
    ['23:59:00', '23:59'],
    ['00:00:00', '00:00'],
  ];
  for (const [wejscie, oczekiwane] of zBazy) {
    check(`formatujGodzine czyta z bazy ${wejscie} → ${oczekiwane}`,
      formatujGodzine(wejscie) === oczekiwane, String(formatujGodzine(wejscie)));
  }

  // Asymetria surowości jest CELOWA i ma tu swoją asercję: to, co wraca z bazy,
  // musi dać się pokazać, nawet jeśli nie przeszłoby przez walidację wpisu.
  check('asymetria celowa: "18:00:00" nie przechodzi walidacji wpisu, ale DA SIĘ pokazać',
    walidujGodzine('18:00:00').ok === false && formatujGodzine('18:00:00') === '18:00',
    'appka nie pokazałaby godziny, którą sama zapisała');

  // Zapis → odczyt → zapis: to samo, bez dryfu.
  for (const wejscie of ['8:00', '08:00', '18:00', '23:59', '00:00']) {
    const zapis = walidujGodzine(wejscie);
    const odczyt = formatujGodzine(`${(zapis as any).wartosc}:00`);
    check(`obieg bez dryfu dla ${wejscie}`, odczyt === (zapis as any).wartosc,
      `${(zapis as any).wartosc} → ${odczyt}`);
  }
}

// ── (4) ZERO TO NIE BRAK ───────────────────────────────────────────────────
//
// Północ jest prawidłową godziną. Zwrócenie dla niej `null` byłoby dokładnie
// tym błędem, przed którym broni się migracja A2 (zakaz `DEFAULT '00:00'`).
{
  check('godzinaWMinutach("00:00") === 0, a nie null — północ to godzina',
    godzinaWMinutach('00:00') === 0, String(godzinaWMinutach('00:00')));
  check('godzinaWMinutach(null) === null, a nie 0 — brak to nie północ',
    godzinaWMinutach(null) === null, String(godzinaWMinutach(null)));
  check('godzinaWMinutach("18:00") === 1080', godzinaWMinutach('18:00') === 1080,
    String(godzinaWMinutach('18:00')));
  check('godzinaWMinutach("16:30") === 990', godzinaWMinutach('16:30') === 990,
    String(godzinaWMinutach('16:30')));
  check('godzinaWMinutach("00:00") !== godzinaWMinutach(null) — dwie różne rzeczy',
    godzinaWMinutach('00:00') !== godzinaWMinutach(null), 'zero sklejone z brakiem');
}

// ── (5) STRAŻNIK NA ŹRÓDLE — reguła, nie wartość ───────────────────────────
{
  const tu = dirname(fileURLToPath(import.meta.url));
  const zrodlo = readFileSync(join(tu, 'godzinaWydarzenia.ts'), 'utf8');
  const kod = zrodlo
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'))
    .join('\n');

  check('formatujGodzine nie ma ŻADNEJ ścieżki zwracającej pusty napis',
    !/return\s*(''|""|`\s*`)\s*;/.test(kod), 'w kodzie jest `return \'\'`');
  check('nigdzie nie zwracamy myślnika jako „godziny"',
    !/return\s*['"`]\s*[—–-]\s*['"`]/.test(kod), 'w kodzie jest `return \'—\'`');
  check('brak godziny reprezentuje `null`, a nie wartość zastępcza',
    /return null/.test(kod), 'nie ma ani jednego `return null`');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
