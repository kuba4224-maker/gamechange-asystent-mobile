// PLAN-D-F 08.2026 (12.08.2026) — NOWY PLIK.
//
//   npx tsx lib/wzrost.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// PO CO TO ISTNIEJE. Data pomiaru wzrostu jest jedyną daną w tym produkcie,
// którą zawodnik wpisuje WSTECZ — i jedyną, w której literówka w roku wygląda
// dokładnie jak poprawny pomiar. „2016" zamiast „2026" nie rzuca błędem: daje
// backendowi okno dziesięcioletnie, tempo bliskie zeru i cichy brak alertu
// u zawodnika, który rośnie 9 cm rocznie. Dlatego walidacja daty ma tu tyle
// samo asercji co walidacja wartości.
//
// ⚠️ CZEGO TEN PLIK NIE SPRAWDZA: niczego o tempie wzrostu ani o progu
// 7,2 cm/rok — appka tego nie liczy i nie ma prawa liczyć. Klasyfikacja jest
// w `gamechange-app/lib/arbiter-glosu.js` i ma tam własne 101 asercji.
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75)
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — nazwane liczbą, nie odczuciem. Ten plik miał 50 ASERCJI
// i ANI JEDNEJ, która czytałaby jakikolwiek EKRAN. Sprawdzał wyłącznie własny
// moduł przez `import`. Audyt H1 (15.08) zmierzył: nie istnieje stan
// repozytorium z pilnowanym defektem, na którym ten strażnik by się zapalił.
//
// DLACZEGO TO JEST GROŹNE AKURAT TUTAJ — to jest najdroższa pozycja w pasie.
// `height_logs` to JEDYNE wejście OSŁONY: arbiter (`gamechange-app/lib/
// arbiter-glosu.js`) zdejmuje obciążenie zawodnikowi, który rośnie szybciej
// niż 7,2 cm/rok. Osłona potrzebuje DWÓCH pomiarów oddalonych o co najmniej
// pół roku, a jedyny formularz, którym da się je wpisać, stoi w Profilu.
// Ekran, który: (a) zgubi `measured_at` w INSERT-cie — baza wpisze
// `CURRENT_DATE` i oba pomiary będą z dnia wpisania, więc okno wyjdzie zerowe
// i Osłona nie odblokuje się NIGDY; (b) ominie `sprawdzPomiar` — literówka
// w roku („2016" zamiast „2026") wygląda jak poprawny pomiar i daje tempo
// bliskie zeru; (c) przestanie rysować `opiszPomiary().zdanie` — zawodnik nie
// dowie się, że ma dopisać drugi pomiar — przechodził tu na zielono 50 na 50.
// Liczba policzona w module i narysowana źle albo wcale znaczy tu, że produkt
// mówi NASTOLATKOWI COŚ O JEGO CIELE. Suita mówiła „przeszło".
//
// CO JEST TERAZ — sekcja 0 niżej. Ekrany ODKRYWANE Z KATALOGU (O69), nie
// wpisane; zbiór konsumentów porównywany na RÓWNOŚĆ (O73), nie „≥ 1"; brak
// pliku to FAIL Z NAZWĄ, nigdy wyjątek `ENOENT` (O76).
//
// ⚠️ CZEGO TA SEKCJA NIE UDAJE. Czyta źródło ekranu JAKO TEKST. Nie uruchamia
// Reacta i nie wie, czy ekran się rysuje. Podmiana wywołania na inne, równie
// zepsute, przejdzie tu niezauważona. Dlatego każda asercja mówi wprost,
// co dokładnie było zepsute i co zawodnik zobaczyłby źle.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (O53): `tsconfig.json` ciągnie DOM, więc `tsc`
// pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  sprawdzPomiar,
  opiszPomiary,
  opisOdstepu,
  miesiecyMiedzy,
  dniOdEpoki,
  naDateLokalna,
  MIN_CM,
  MAX_CM,
  MAX_LAT_WSTECZ,
  type PomiarWzrostu,
} from './wzrost';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

const DZIS = '2026-08-12';

// ═══════════════════════════════════════════════════════════════════
// ⭐ 0. PAS I2 16.08.2026 — EKRAN, KTÓRY ZBIERA POMIARY WZROSTU (K4 / O75)
// ═══════════════════════════════════════════════════════════════════
// Wszystkie asercje niżej czytają ŹRÓDŁO EKRANU, nie moduł. Bez nich
// 50 asercji tego pliku opisuje funkcję, której nikt nie musi wołać.

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — pliki tego projektu CYTUJĄ w komentarzach nazwy
 * funkcji i zepsute wywołania („⚠️ Ten moduł NIE liczy tempa wzrostu i nie zna
 * progu 7,2 cm/rok"), więc strażnik czytający surowy tekst zapalałby się na
 * WŁASNEJ DOKUMENTACJI ekranu. Wtedy jedynym sposobem, żeby go uciszyć, byłoby
 * skasowanie wyjaśnienia — czyli tej wiedzy, dla której powstał.
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

const PLIK_PROFIL = 'app/(tabs)/profil.tsx';
const profil = bezKomentarzy(surowe(PLIK_PROFIL));

{
  console.log('0. EKRAN, KTÓRY ZBIERA POMIARY WZROSTU (K4 / O75)');

  check('⛔ (I2-0) plik ekranu z listy strażnika istnieje i daje się odczytać',
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

  const konsumenci = EKRANY.filter(
    (p) => /from\s+'[^']*\/wzrost'/.test(bezKomentarzy(readFileSync(join(root, p), 'utf8'))));
  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c`, nie przepisane z pamięci.
  // RÓWNOŚĆ, nie „≥ 1" (O73): „co najmniej jeden konsument" przeszłoby także
  // wtedy, gdy Profil przestanie zbierać pomiary — a wtedy `height_logs`
  // przestaje się wypełniać i Osłona nie ma z czego policzyć tempa.
  const KONSUMENCI = [PLIK_PROFIL].sort();
  const brakujacy = KONSUMENCI.filter((p) => !konsumenci.includes(p));
  const nadmiarowi = konsumenci.filter((p) => !KONSUMENCI.includes(p));
  check('⭐ (I2-0) pomiary wzrostu zbiera DOKŁADNIE ten plik, co 16.08 — RÓWNOŚĆ, nie „≥ 1" (O73)',
    brakujacy.length === 0 && nadmiarowi.length === 0,
    `BRAKUJE: ${brakujacy.join(', ') || '—'} · NADMIAROWI: ${nadmiarowi.join(', ') || '—'} `
    + '→ ubył: zawodnik nie ma już GDZIE wpisać wzrostu, a 50 asercji niżej nadal jest zielonych; '
    + 'doszedł: sprawdź, czy nowe miejsce woła `sprawdzPomiar` i oddaje `measured_at` do bazy.');

  // ── ⛔ ZAKAZ SPEC 3.3 — najdroższa rzecz w tym pliku ──
  // Defekt, którego pilnuje: ktoś dokłada na ekranie własny rachunek tempa
  // („urosłeś 8 cm w rok"), wiek biologiczny, „PHV za X miesięcy" albo
  // przewidywany wzrost dorosłego. Wtedy w produkcie są DWA rachunki tempa —
  // ten w arbitrze, który zna próg 7,2 cm/rok i margines błędu, i ten na
  // ekranie, który nie zna żadnego. Skutek dla zawodnika: PRODUKT MÓWI
  // NASTOLATKOWI COŚ O JEGO CIELE, a błąd tych szacunków idzie w najgorszą
  // stronę (0 trafień na 39 przypadków u wcześnie dojrzewających).
  check('⛔ (I2-0) ekran NIE liczy tempa wzrostu sam — ani jednego odejmowania na `height_cm`',
    !/height_cm\s*[-−]/.test(profil) && !/miesiecyMiedzy\s*\(/.test(profil),
    'na ekranie pojawił się drugi rachunek tempa wzrostu; tempo liczy WYŁĄCZNIE arbiter '
    + '(gamechange-app/lib/arbiter-glosu.js) i wraca wierszem `weekly_voice`');

  check('⛔ (I2-0) ekran NIE pokazuje żadnej liczby o dojrzałości biologicznej (zakaz spec 3.3)',
    !/PHV|wiek\s+biologiczn|dojrzałoś[cć]\s+biologiczn|cm\s*\/\s*rok|7[,.]2\s*cm/i.test(profil),
    'na ekranie stanęła liczba o dojrzewaniu — wiek biologiczny, „PHV za X miesięcy" albo '
    + 'przewidywany wzrost dorosłego. Zakaz jest bezwzględny: nastolatek dostaje prognozę '
    + 'o własnym ciele, której nikt nie umie postawić trafnie');

  // ── Walidacja ma JEDNO miejsce i naprawdę blokuje zapis ──
  check('⛔ (I2-0) ekran woła `sprawdzPomiar(` — nie waliduje pomiaru sam',
    /sprawdzPomiar\(/.test(profil),
    'ekran przestał wołać walidację modułu; wtedy literówka w roku („2016" zamiast „2026") '
    + 'wchodzi do bazy jak poprawny pomiar, daje backendowi okno dziesięcioletnie, '
    + 'tempo bliskie zeru i CICHY BRAK ALERTU u zawodnika, który rośnie 9 cm rocznie');

  // ⚠️ ASERCJA CZYTA ODCINEK MIĘDZY `sprawdzPomiar(` a INSERT-em, nie cały plik
  // (O71). Ten sam ekran ma PIĘĆ różnych gałęzi `if (!wynik.ok)` (m.in. raport
  // rodzica z `wynik.powod`); asercja na całym pliku przechodziła na CUDZEJ
  // gałęzi i przepuszczała zdjęcie `return` z tej jedynej, która broni bazy.
  // Wnętrze gałęzi czytamy przez `[^{}]*`, żeby nie złapać `return` z dalszej
  // instrukcji.
  const odWalidacjiDoZapisu = (() => {
    const od = profil.indexOf('sprawdzPomiar(');
    if (od < 0) return '';
    const do_ = profil.indexOf(".from('height_logs')", od);
    return do_ < 0 ? profil.slice(od) : profil.slice(od, do_);
  })();
  check('⛔ (I2-0) …i wynik walidacji NAPRAWDĘ blokuje zapis (`if (!wynik.ok) { … return; }`)',
    /if\s*\(\s*!\s*wynik\.ok\s*\)\s*\{[^{}]*\breturn\b[^{}]*\}/.test(odWalidacjiDoZapisu),
    'między `sprawdzPomiar()` a INSERT-em do `height_logs` nie ma wyjścia z funkcji: '
    + 'walidacja jest wołana, ale jej „nie" NIE ZATRZYMUJE zapisu. Pomiar z datą sprzed '
    + 'dziesięciu lat albo 300 cm wchodzi do bazy mimo czerwonego komunikatu na ekranie — '
    + 'policzona i zignorowana walidacja jest tym samym, co jej brak');

  check('⛔ (I2-0) INSERT niesie `measured_at: wynik.data` — bez tego Osłona nie odblokuje się NIGDY',
    /measured_at:\s*wynik\.data/.test(profil),
    'z INSERT-a zniknęła data pomiaru; baza wpisze wtedy `DEFAULT CURRENT_DATE`, więc KAŻDY '
    + 'pomiar będzie z dnia wpisania, okno między pomiarami wyjdzie zerowe i arbiter nigdy '
    + 'nie policzy tempa — zawodnik, który rośnie szybko, nie dostanie Osłony');

  check('⛔ (I2-0) INSERT niesie `height_cm: wynik.wartosc` — liczbę po walidacji, nie surowy tekst z pola',
    /height_cm:\s*wynik\.wartosc/.test(profil) && !/height_cm:\s*heightInput/.test(profil),
    'do bazy idzie surowa zawartość pola zamiast liczby znormalizowanej przez moduł; '
    + '„178,5" z polskiej klawiatury poleci wtedy jako tekst z przecinkiem');

  check('⛔ (I2-0) ekran liczy datę przez `naDateLokalna(`, a nie `toISOString()` na wybranym dniu',
    /naDateLokalna\(/.test(profil) && !/heightDate[\s\S]{0,60}toISOString/.test(profil),
    'ekran buduje datę pomiaru sam w UTC; wieczorem w Polsce daje to dzień WCZEŚNIEJSZY '
    + 'niż ten, który zawodnik wybrał w kalendarzu');

  // ── Ekran nie wybiera za moduł ──
  check('⛔ (I2-0) ekran oddaje modułowi CAŁĄ historię pomiarów — nie filtruje jej przed opisem',
    /opiszPomiary\(\s*heightRows\s*\)/.test(profil)
    && !/opiszPomiary\(\s*heightRows\s*\.\s*(filter|slice|sort|map|reverse)/.test(profil),
    'ekran zawęża historię przed oddaniem jej do `opiszPomiary`, więc liczba pomiarów i odstęp '
    + 'liczą się na INNYM zbiorze, niż ma zawodnik — zdanie „masz jeden pomiar" trafia do kogoś, kto ma pięć');

  // ── R5: „nie wiem" ≠ „nie masz" ──
  check('⛔ (I2-0) błąd odczytu `height_logs` NIE udaje pustej historii (R5)',
    /if\s*\(\s*heightRes\.error\s*\)\s*\{[\s\S]{0,300}?\}\s*else\s*\{[\s\S]{0,200}?setHeightRows\(/.test(profil),
    'gałąź błędu odczytu wpisuje pustą listę do `heightRows`; zawodnik z pięcioma pomiarami '
    + 'czyta wtedy „Nie masz jeszcze żadnego pomiaru" przy każdym czknięciu sieci — a to jest '
    + 'zaproszenie do wpisania szóstego, duplikatu');

  check('⛔ (I2-0) ekran pyta bazę o OBIE kolumny (`height_cm,measured_at`)',
    /\.select\('height_cm,measured_at'\)/.test(profil),
    'z zapytania wypadła kolumna; bez `measured_at` `opiszPomiary` odrzuca WSZYSTKIE wiersze '
    + 'jako nieczytelne i zawodnik z historią czyta „nie masz żadnego pomiaru"');

  // ── Brzmienia pochodzą z modułu, nie z ekranu ──
  // ⚠️ Zdania budowane są WYWOŁANIEM MODUŁU, nie przepisane tutaj — kopia
  // w strażniku rozjechałaby się tak samo cicho jak kopia na ekranie.
  {
    const ZDANIE_ZERO = opiszPomiary([]).zdanie;
    const ZDANIE_JEDEN = opiszPomiary([{ height_cm: 178, measured_at: DZIS }]).zdanie;
    const wOstrz = sprawdzPomiar('178', DZIS, DZIS, [{ height_cm: 170, measured_at: DZIS }]);
    const OSTRZEZENIE = wOstrz.ok ? (wOstrz.ostrzezenie ?? '') : '';
    const wBlad = sprawdzPomiar(String(MIN_CM - 1), DZIS, DZIS, []);
    const BLAD_ZAKRESU = wBlad.ok ? '' : wBlad.blad;
    const kopie = [
      ['zdanie „zero pomiarów"', ZDANIE_ZERO],
      ['zdanie „jeden pomiar"', ZDANIE_JEDEN],
      ['ostrzeżenie o drugim pomiarze tego samego dnia', OSTRZEZENIE],
      [`błąd zakresu ${MIN_CM}–${MAX_CM} cm`, BLAD_ZAKRESU],
    ].filter(([, tekst]) => tekst !== '' && profil.includes(tekst)).map(([co]) => co);
    check('⛔ (I2-0) na ekranie NIE STOI kopia żadnego brzmienia z modułu',
      kopie.length === 0,
      `KOPIE NA EKRANIE: ${kopie.join(', ')} — od tej chwili to samo zdanie ma DWA źródła; `
      + 'zmiana w module przestanie docierać do zawodnika, a nikt się o tym nie dowie, '
      + 'bo obie wersje wyglądają poprawnie');

    check('⛔ (I2-0) ekran pokazuje BŁĄD walidacji i OSTRZEŻENIE osobno — to dwa różne stany',
      /setProfileError\(\s*wynik\.blad\s*\)/.test(profil) && /wynik\.ostrzezenie/.test(profil),
      'zniknął `wynik.blad` (zawodnik dotyka „Zapisz" i NIC się nie dzieje) albo `wynik.ostrzezenie` '
      + '(drugi pomiar tego samego dnia zapisuje się bez słowa, więc podwójne dotknięcie przycisku '
      + 'wygląda jak brak reakcji i zostaje w bazie dwa razy)');
  }

  // ── ⭐ ZAPADKA NA SKASOWANIE ──
  // Bez tej asercji wszystkie powyższe spełnia się przez USUNIĘCIE bloku
  // „Wzrost" z Profilu. Strażnik nagradzałby wtedy skasowanie funkcji.
  check('⭐ (I2-0) ekran NAPRAWDĘ rysuje zdanie modułu — `opiszPomiary(...).zdanie` idzie do widoku',
    /\{\s*opiszPomiary\([^)]*\)\s*\.\s*zdanie\s*\}/.test(profil),
    'zniknęło renderowanie zdania o stanie pomiarów; wszystkie asercje wyżej spełnia też ekran, '
    + 'który nie mówi zawodnikowi, że z jednego pomiaru nie da się powiedzieć nic o tempie — '
    + 'a wtedy nikt nie dopisze drugiego i Osłona nie ma z czego działać');

  check('⭐ (I2-0) ekran NAPRAWDĘ rysuje historię pomiarów (`heightRows.map`) — jest z czego zobaczyć odstęp',
    /heightRows[\s\S]{0,30}\.map\(/.test(profil),
    'zniknęła lista pomiarów; zawodnik nie widzi, czy ma już dwa oddalone pomiary, '
    + 'więc nie wie, czego brakuje Osłonie');
}

// ═══════════════════════════════════════════════════════════════════
// 1. DATY — bez pułapek strefowych i bez dat, które się przewijają
// ═══════════════════════════════════════════════════════════════════
check('dniOdEpoki liczy w UTC', dniOdEpoki('1970-01-01') === 0, String(dniOdEpoki('1970-01-01')));
check('dniOdEpoki odrzuca śmieć', dniOdEpoki('kiedyś') === null, String(dniOdEpoki('kiedyś')));
check('dniOdEpoki odrzuca 31 lutego, zamiast przewinąć go na 3 marca',
  dniOdEpoki('2026-02-31') === null, String(dniOdEpoki('2026-02-31')));
check('dniOdEpoki przyjmuje 29 lutego w roku przestępnym',
  dniOdEpoki('2028-02-29') !== null, String(dniOdEpoki('2028-02-29')));
check('dniOdEpoki odrzuca 29 lutego w roku nieprzestępnym',
  dniOdEpoki('2026-02-29') === null, String(dniOdEpoki('2026-02-29')));
check('naDateLokalna dopełnia zerami', naDateLokalna(new Date(2026, 0, 5)) === '2026-01-05', naDateLokalna(new Date(2026, 0, 5)));
check('miesiecyMiedzy liczy pełne miesiące', miesiecyMiedzy('2025-08-12', '2026-08-12') === 12, String(miesiecyMiedzy('2025-08-12', '2026-08-12')));
check('miesiecyMiedzy przy odwróconej kolejności daje null, nie liczbę ujemną',
  miesiecyMiedzy('2026-08-12', '2025-08-12') === null, String(miesiecyMiedzy('2026-08-12', '2025-08-12')));

// ═══════════════════════════════════════════════════════════════════
// 2. WARTOŚĆ — ten sam zakres co CHECK w bazie
// ═══════════════════════════════════════════════════════════════════
check('pusty wzrost odrzucony', sprawdzPomiar('', DZIS, DZIS, []).ok === false, 'pusty');
check('wzrost nieliczbowy odrzucony', sprawdzPomiar('wysoki', DZIS, DZIS, []).ok === false, 'tekst');
check('przecinek dziesiętny działa (klawiatura polska)',
  sprawdzPomiar('178,5', DZIS, DZIS, []).ok === true, '178,5');
{
  const w = sprawdzPomiar('178,5', DZIS, DZIS, []);
  check('…i daje liczbę, nie tekst', w.ok === true && w.wartosc === 178.5, JSON.stringify(w));
}
check(`${MIN_CM - 1} cm odrzucone (poniżej CHECK-u bazy)`, sprawdzPomiar(String(MIN_CM - 1), DZIS, DZIS, []).ok === false, 'za mało');
check(`${MAX_CM + 1} cm odrzucone (powyżej CHECK-u bazy)`, sprawdzPomiar(String(MAX_CM + 1), DZIS, DZIS, []).ok === false, 'za dużo');
check(`${MIN_CM} cm przyjęte (granica należy do zakresu)`, sprawdzPomiar(String(MIN_CM), DZIS, DZIS, []).ok === true, 'granica dolna');
check(`${MAX_CM} cm przyjęte (granica należy do zakresu)`, sprawdzPomiar(String(MAX_CM), DZIS, DZIS, []).ok === true, 'granica górna');

// ═══════════════════════════════════════════════════════════════════
// 3. DATA — tu mieszka defekt, którego nie widać
// ═══════════════════════════════════════════════════════════════════
check('data z przyszłości ODRZUCONA', sprawdzPomiar('178', '2026-08-13', DZIS, []).ok === false, 'jutro');
{
  const w = sprawdzPomiar('178', '2026-08-13', DZIS, []);
  check('…i mówi wprost dlaczego', w.ok === false && /przyszłości/.test(w.blad), JSON.stringify(w));
}
check('dzisiejsza data PRZYJĘTA', sprawdzPomiar('178', DZIS, DZIS, []).ok === true, 'dziś');
check('pomiar sprzed roku PRZYJĘTY — to jest cały sens tej zmiany',
  sprawdzPomiar('170', '2025-08-12', DZIS, []).ok === true, 'rok temu');
check(`pomiar sprzed ${MAX_LAT_WSTECZ + 1} lat odrzucony (literówka w roku wygląda jak pomiar)`,
  sprawdzPomiar('170', '2015-08-12', DZIS, []).ok === false, 'za dawno');
check('nieczytelna data odrzucona', sprawdzPomiar('178', '12.08.2026', DZIS, []).ok === false, 'zły format');
check('31 lutego odrzucone', sprawdzPomiar('178', '2026-02-31', DZIS, []).ok === false, '31 lutego');

// ═══════════════════════════════════════════════════════════════════
// 4. DRUGI POMIAR TEGO SAMEGO DNIA — ostrzeżenie, nie błąd
// ═══════════════════════════════════════════════════════════════════
{
  const istniejace: PomiarWzrostu[] = [{ height_cm: 178, measured_at: DZIS }];
  const w = sprawdzPomiar('179', DZIS, DZIS, istniejace);
  check('drugi pomiar tego samego dnia NIE jest błędem (baza nie ma na to unikalności)',
    w.ok === true, JSON.stringify(w));
  check('…ale zawodnik dostaje ostrzeżenie, żeby dwukrotne dotknięcie nie wyglądało jak brak reakcji',
    w.ok === true && w.ostrzezenie !== null, JSON.stringify(w));
  const inny = sprawdzPomiar('179', '2026-08-11', DZIS, istniejace);
  check('pomiar z innego dnia nie ostrzega', inny.ok === true && inny.ostrzezenie === null, JSON.stringify(inny));
}

// ═══════════════════════════════════════════════════════════════════
// 5. OPIS STANU — fakty, nigdy ocena
// ═══════════════════════════════════════════════════════════════════
{
  const s = opiszPomiary([]);
  check('zero pomiarów: mówi, CO ZROBIĆ, nie tylko czego brak',
    s.ile === 0 && /Wpisz swój dzisiejszy wzrost/.test(s.zdanie), s.zdanie);
  check('…i od razu podpowiada wpisanie pomiaru sprzed roku', /rok temu/.test(s.zdanie), s.zdanie);
}
{
  const s = opiszPomiary([{ height_cm: 178, measured_at: DZIS }]);
  check('jeden pomiar: mówi wprost, że z jednego nie da się nic powiedzieć',
    s.ile === 1 && /nie da się powiedzieć nic/.test(s.zdanie), s.zdanie);
  check('…i że odstęp jest tym, czego brakuje', /sprzed roku/.test(s.zdanie), s.zdanie);
  check('…a odstęp jest jawnie nieznany, nie zerowy', s.odstepMiesiecy === null, String(s.odstepMiesiecy));
}
{
  const s = opiszPomiary([
    { height_cm: 178.2, measured_at: '2026-08-10' },
    { height_cm: 170, measured_at: '2025-08-10' },
  ]);
  check('dwa pomiary: sortuje po dacie, nie po kolejności z bazy',
    s.najstarszy?.measured_at === '2025-08-10' && s.najnowszy?.measured_at === '2026-08-10', JSON.stringify(s));
  check('…i podaje odstęp jako FAKT', s.odstepMiesiecy === 11 || s.odstepMiesiecy === 12, String(s.odstepMiesiecy));
  check('…w zdaniu po polsku', /miesięcy|miesiące/.test(s.zdanie), s.zdanie);
}
{
  const s = opiszPomiary([
    { height_cm: 176, measured_at: '2026-06-10' },
    { height_cm: 178, measured_at: '2026-08-10' },
  ]);
  check('krótki odstęp NIE jest nazwany „za krótki" — appka nie wydaje oceny',
    !/za krótk|za mało|niewystarczaj/i.test(s.zdanie), s.zdanie);
  check('…tylko mówi, że dłuższy jest pewniejszy', /Im dłuższy odstęp/.test(s.zdanie), s.zdanie);
}
{
  // Zakaz bezwzględny (spec 3.3) — sprawdzany, nie obiecany.
  const wszystkie = [
    opiszPomiary([]).zdanie,
    opiszPomiary([{ height_cm: 178, measured_at: DZIS }]).zdanie,
    opiszPomiary([{ height_cm: 170, measured_at: '2025-08-10' }, { height_cm: 178, measured_at: '2026-08-10' }]).zdanie,
  ].join(' ');
  for (const zakazane of ['PHV', 'wiek biologiczn', 'dojrzał', 'przewidywany wzrost', 'cm/rok', '7,2', '7.2']) {
    check(`żadne zdanie o wzroście nie zawiera „${zakazane}"`,
      !wszystkie.toLowerCase().includes(zakazane.toLowerCase()), wszystkie);
  }
  check('…i żadne nie wydaje oceny „rośniesz szybko" (to należy do arbitra)',
    !/rośniesz teraz szybko/.test(wszystkie), wszystkie);
}
{
  // Wiersze uszkodzone nie mogą wywrócić ekranu ani po cichu policzyć się do stanu.
  const s = opiszPomiary([
    { height_cm: 178, measured_at: 'bzdura' } as PomiarWzrostu,
    { height_cm: Number.NaN, measured_at: '2026-08-10' },
    { height_cm: 170, measured_at: '2025-08-10' },
  ]);
  check('wiersze z nieczytelną datą albo wartością są POMIJANE, nie liczone',
    s.ile === 1, JSON.stringify(s));
}

check('opisOdstepu: 1 → „miesiąc"', opisOdstepu(1) === 'miesiąc', opisOdstepu(1));
check('opisOdstepu: 3 → „3 miesiące"', opisOdstepu(3) === '3 miesiące', opisOdstepu(3));
check('opisOdstepu: 7 → „7 miesięcy"', opisOdstepu(7) === '7 miesięcy', opisOdstepu(7));
check('opisOdstepu: 0 → „mniej niż miesiąc", nie „0 miesięcy"', opisOdstepu(0) === 'mniej niż miesiąc', opisOdstepu(0));
check('opisOdstepu: null → jawne „nieznany czas"', opisOdstepu(null) === 'nieznany czas', opisOdstepu(null));

console.log(`\n${passed} passed, ${failed} failed`);
// Celowo `throw`, a nie `process.exit(1)`: `process` wymaga `@types/node`,
// których tsconfig appki nie zaciąga — a te pliki są objęte `npx tsc --noEmit`.
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
