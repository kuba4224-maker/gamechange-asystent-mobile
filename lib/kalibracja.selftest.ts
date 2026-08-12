// PLAN-D-H 08.2026 (12.08.2026) — NOWY PLIK.
//
//   npx tsx lib/kalibracja.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// PO CO TO ISTNIEJE. W kalibracji da się zepsuć po cichu cztery rzeczy
// i żadnej z nich nie widać na ekranie:
//   • KOLEJNOŚĆ — appka, która wyśle predykcję i pomiar w jednym zapytaniu,
//     dostanie z bazy błąd, ale gdyby wyzwalacza zabrakło, zapisałaby pomiar
//     bez uczciwej predykcji i cała waluta byłaby zmyślona;
//   • STAN DRUGI — zniknięcie gałęzi „bez zmian, których dałoby się dowieść"
//     zamienia szum w postęp i nikt tego nie zauważy;
//   • PORÓWNYWALNOŚĆ — pomiar o innej porze dnia różni się o więcej,
//     niż daje osiem tygodni pracy;
//   • POCHWAŁA TRAFNOŚCI — jedno zdanie „dobrze oszacowałeś" zamienia
//     narzędzie w trening zgadywania tego, co system chce usłyszeć.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  sprawdzLiczbe, ocenPorownanie, stanZmiany, progZmiany, bladKalibracji,
  opiszKalibracje, wierszPredykcji, patchPomiaru, stanKalibracji,
  czyPunktZerowy, poprzedniBlad,
  OS_FIZYCZNA, OS_ZACHOWANIA, OSIE, METRYKA_CMJ, METRYKA_SESJE_WLASNE,
  KOLUMNY_KALIBRACJI, CMJ_MIN, CMJ_MAX, SESJE_MAX,
  PROG_CMJ_JEDEN_DZIEN, PROG_CMJ_DWA_DNI, MAX_ROZNICA_PORY_MIN,
  KALIBRACJA_PYTANIE_FIZYCZNA, KALIBRACJA_PYTANIE_ZACHOWANIE,
  KALIBRACJA_ZABLOKOWANE, KALIBRACJA_NA_JUTRO, KALIBRACJA_PROTOKOL,
  KALIBRACJA_ENTRY_PODPIS, KALIBRACJA_NIE_WIEM_PODPOWIEDZ,
  type WierszKalibracji, type Warunki,
} from './kalibracja';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

const libDir = dirname(fileURLToPath(import.meta.url));
const TERAZ = new Date('2026-08-12T17:00:00.000Z');

function w(nadpisz: Partial<WierszKalibracji> = {}): WierszKalibracji {
  return {
    id: 'k1', axis: OS_FIZYCZNA, metric: METRYKA_CMJ,
    predicted_value: 38, predicted_at: '2026-08-12T17:00:00.000Z',
    measured_value: 31, measured_at: '2026-08-12T17:10:00.000Z',
    is_baseline: false, comparable: true,
    time_of_day: '17:00', nawierzchnia: null, obuwie: null,
    surface: 'beton', footwear: 'korki',
    ...nadpisz,
  } as WierszKalibracji;
}

// ═══════════════════════════════════════════════════════════════════
// 1. KONTRAKT NAZW
// ═══════════════════════════════════════════════════════════════════
check('oś fizyczna nazywa się „physical" (CHECK w bazie)', OS_FIZYCZNA === 'physical', OS_FIZYCZNA);
check('oś zachowania nazywa się „behavioural" (pisownia brytyjska, jak w bazie)',
  OS_ZACHOWANIA === 'behavioural', OS_ZACHOWANIA);
check('zbiór osi jest zamknięty i ma dwa elementy', OSIE.length === 2, JSON.stringify(OSIE));
for (const k of ['id', 'axis', 'metric', 'predicted_value', 'predicted_at', 'measured_value',
  'measured_at', 'is_baseline', 'comparable', 'time_of_day', 'surface', 'footwear']) {
  check(`lista kolumn zawiera „${k}"`, KOLUMNY_KALIBRACJI.split(',').includes(k), KOLUMNY_KALIBRACJI);
}
check('metryki mają jedno źródło',
  METRYKA_CMJ === 'cmj_cm' && METRYKA_SESJE_WLASNE === 'sesje_wlasne_4t',
  `${METRYKA_CMJ} / ${METRYKA_SESJE_WLASNE}`);

// ═══════════════════════════════════════════════════════════════════
// 2. WALIDACJA
// ═══════════════════════════════════════════════════════════════════
check('pusty tekst odrzucony', sprawdzLiczbe('', OS_FIZYCZNA).ok === false, '');
check('śmieć odrzucony', sprawdzLiczbe('abc', OS_FIZYCZNA).ok === false, 'abc');
check('przecinek dziesiętny działa (klawiatura polska)',
  sprawdzLiczbe('31,5', OS_FIZYCZNA).ok === true, '31,5');
{
  const r = sprawdzLiczbe('31,5', OS_FIZYCZNA);
  check('…i daje liczbę, nie tekst', r.ok === true && r.wartosc === 31.5, JSON.stringify(r));
}
{
  const r = sprawdzLiczbe('31,472', OS_FIZYCZNA);
  check('nadmiar miejsc po przecinku obcięty do jednego (pomiar nie ma takiej precyzji)',
    r.ok === true && r.wartosc === 31.5, JSON.stringify(r));
}
check(`${CMJ_MIN - 1} cm odrzucone`, sprawdzLiczbe(String(CMJ_MIN - 1), OS_FIZYCZNA).ok === false, '');
check(`${CMJ_MAX + 1} cm odrzucone`, sprawdzLiczbe(String(CMJ_MAX + 1), OS_FIZYCZNA).ok === false, '');
check(`${CMJ_MIN} cm przyjęte (granica należy do zakresu)`,
  sprawdzLiczbe(String(CMJ_MIN), OS_FIZYCZNA).ok === true, '');
check(`${CMJ_MAX} cm przyjęte (granica należy do zakresu)`,
  sprawdzLiczbe(String(CMJ_MAX), OS_FIZYCZNA).ok === true, '');
check('literówka „310" zamiast „31" złapana przez zakres',
  sprawdzLiczbe('310', OS_FIZYCZNA).ok === false, '310');
check('oś zachowania odrzuca ułamek — „ile razy" nie ma połówek',
  sprawdzLiczbe('3,5', OS_ZACHOWANIA).ok === false, '3,5');
check('oś zachowania przyjmuje zero (zero sesji to prawdziwa odpowiedź)',
  sprawdzLiczbe('0', OS_ZACHOWANIA).ok === true, '0');
check(`oś zachowania odrzuca ${SESJE_MAX + 1}`,
  sprawdzLiczbe(String(SESJE_MAX + 1), OS_ZACHOWANIA).ok === false, '');

// ═══════════════════════════════════════════════════════════════════
// 3. PORÓWNYWALNOŚĆ — kierunek błędu na korzyść uczciwości
// ═══════════════════════════════════════════════════════════════════
const bazowe: Warunki = { poraDnia: '17:00', nawierzchnia: 'beton', obuwie: 'korki' };
check('pierwszy pomiar: nie ma z czym porównać → comparable = false',
  ocenPorownanie(null, bazowe).comparable === false, '');
check('te same warunki → comparable = true',
  ocenPorownanie(bazowe, { ...bazowe }).comparable === true, '');
check('różnica pory dnia dokładnie 2 h → nadal porównywalne (granica należy do zakresu)',
  ocenPorownanie(bazowe, { ...bazowe, poraDnia: '19:00' }).comparable === true, '');
check('różnica pory dnia 2 h 1 min → NIE porównywalne',
  ocenPorownanie(bazowe, { ...bazowe, poraDnia: '19:01' }).comparable === false, '');
check('…i powód mówi wprost o porze dnia',
  /por[a-ząęó]+ dnia/i.test(ocenPorownanie(bazowe, { ...bazowe, poraDnia: '08:00' }).powod),
  ocenPorownanie(bazowe, { ...bazowe, poraDnia: '08:00' }).powod);
check('inna nawierzchnia → NIE porównywalne',
  ocenPorownanie(bazowe, { ...bazowe, nawierzchnia: 'trawa' }).comparable === false, '');
check('inne buty → NIE porównywalne',
  ocenPorownanie(bazowe, { ...bazowe, obuwie: 'halowki' }).comparable === false, '');
check('nawierzchnia różniąca się tylko wielkością liter NIE unieważnia porównania',
  ocenPorownanie(bazowe, { ...bazowe, nawierzchnia: 'Beton' }).comparable === true, '');
check('BRAK pory dnia poprzedniego pomiaru → „nie wiem", czyli NIE porównujemy',
  ocenPorownanie({ ...bazowe, poraDnia: null }, bazowe).comparable === false, '');
check('BRAK nawierzchni → NIE porównujemy (a nie: porównujemy na oko)',
  ocenPorownanie({ ...bazowe, nawierzchnia: null }, bazowe).comparable === false, '');
check('BRAK butów → NIE porównujemy',
  ocenPorownanie({ ...bazowe, obuwie: null }, bazowe).comparable === false, '');
check('nieczytelna godzina traktowana jak brak, nie jak zero',
  ocenPorownanie({ ...bazowe, poraDnia: 'wieczorem' }, bazowe).comparable === false, '');
check('próg różnicy pory dnia to 120 minut', MAX_ROZNICA_PORY_MIN === 120, String(MAX_ROZNICA_PORY_MIN));

// ═══════════════════════════════════════════════════════════════════
// 4. TRZY STANY — stan drugi jest obowiązkowy
// ═══════════════════════════════════════════════════════════════════
check('próg jednego dnia to 2,3 cm', PROG_CMJ_JEDEN_DZIEN === 2.3, String(PROG_CMJ_JEDEN_DZIEN));
check('próg średniej z dwóch dni to 1,6 cm', PROG_CMJ_DWA_DNI === 1.6, String(PROG_CMJ_DWA_DNI));
check('progZmiany(1) = 2,3', progZmiany(1) === 2.3, String(progZmiany(1)));
check('progZmiany(2) = 1,6', progZmiany(2) === 1.6, String(progZmiany(2)));
check('progZmiany(0) nie daje łagodniejszego progu niż jeden dzień',
  progZmiany(0) === 2.3, String(progZmiany(0)));

check('+3,0 cm → stan 1 (realna zmiana)', stanZmiany(3.0, 2.3).stan === 1, '');
check('+2,3 cm → stan 2 — RÓWNO NA PROGU to jeszcze nie dowód',
  stanZmiany(2.3, 2.3).stan === 2, JSON.stringify(stanZmiany(2.3, 2.3)));
check('+2,4 cm → stan 1', stanZmiany(2.4, 2.3).stan === 1, '');
check('0 cm → stan 2', stanZmiany(0, 2.3).stan === 2, '');
check('−2,3 cm → stan 2 (symetrycznie)', stanZmiany(-2.3, 2.3).stan === 2, '');
check('−2,4 cm → stan 3 (spadek)', stanZmiany(-2.4, 2.3).stan === 3, '');
{
  // Przemiatanie całego zakresu: żadna wartość nie może wypaść bez stanu,
  // a stan 2 musi objąć CAŁY przedział ±próg. To jest asercja, która zapala
  // się, gdy ktoś usunie środkową gałąź „dla uproszczenia".
  let bezStanu = 0; let drugichWPrzedziale = 0; let drugichPoza = 0;
  for (let i = -100; i <= 100; i++) {
    const r = i / 10;
    const s = stanZmiany(r, 2.3);
    if (![1, 2, 3].includes(s.stan)) bezStanu++;
    if (Math.abs(r) <= 2.3 && s.stan === 2) drugichWPrzedziale++;
    if (Math.abs(r) > 2.3 && s.stan === 2) drugichPoza++;
  }
  check('201 wartości od −10 do +10 cm — każda ma stan', bezStanu === 0, String(bezStanu));
  check('…cały przedział ±2,3 cm to stan 2 (47 wartości)', drugichWPrzedziale === 47, String(drugichWPrzedziale));
  check('…i ANI JEDNA wartość spoza przedziału nie jest stanem 2', drugichPoza === 0, String(drugichPoza));
}
check('stan 2 mówi wprost, że to nie znaczy „nie pracowałeś"',
  stanZmiany(1, 2.3).tresc.includes('nie pracowałeś'), stanZmiany(1, 2.3).tresc);
check('stan 2 podaje próg liczbą, a nie ogólnikiem',
  stanZmiany(1, 2.3).tresc.includes('2,3'), stanZmiany(1, 2.3).tresc);

// ═══════════════════════════════════════════════════════════════════
// 5. BŁĄD KALIBRACJI I OPIS
// ═══════════════════════════════════════════════════════════════════
check('błąd kalibracji jest wartością bezwzględną', bladKalibracji(38, 31) === 7, '');
check('…i nie zależy od kierunku pomyłki', bladKalibracji(31, 38) === 7, '');
{
  const o = opiszKalibracje({ predykcja: 38, pomiar: 31, bladPoprzedni: null, jednostka: 'cm' });
  check('pierwszy pomiar to PUNKT ZEROWY, nie wynik', o.rodzaj === 'punkt_zerowy', JSON.stringify(o));
  check('…i mówi wprost, że nie jest ani dobry, ani słaby',
    o.tresc.includes('ani dobry, ani słaby'), o.tresc);
  check('…i nazywa liczbę, którą będziemy zmniejszać', o.tresc.includes('zmniejszać'), o.tresc);
}
{
  const o = opiszKalibracje({ predykcja: 34, pomiar: 32, bladPoprzedni: 7, jednostka: 'cm' });
  check('mniejsza różnica niż poprzednio → to jest postęp', o.tytul.includes('lepiej'), o.tytul);
  check('…i tylko to wolno nazwać postępem', o.tresc.includes('wolno nazwać postępem'), o.tresc);
}
{
  const o = opiszKalibracje({ predykcja: 45, pomiar: 32, bladPoprzedni: 2, jednostka: 'cm' });
  check('większa różnica niż poprzednio NIE jest nazwana błędem zawodnika',
    !/przecenia|błąd|wada|źle/i.test(o.tresc), o.tresc);
}
{
  const o = opiszKalibracje({ predykcja: 33, pomiar: 31, bladPoprzedni: 2, jednostka: 'cm' });
  check('taka sama różnica → mówi, że z jednego pomiaru nic z tego nie wynika',
    o.tresc.includes('Jeden pomiar'), o.tresc);
}
{
  const o = opiszKalibracje({ predykcja: 31, pomiar: 31, bladPoprzedni: null, jednostka: 'cm' });
  check('TRAFIENIE ZA PIERWSZYM RAZEM nie jest chwalone',
    !/brawo|świetnie|dobrze oszacowa|super|gratul/i.test(o.tresc + o.tytul), o.tresc);
}
{
  const o = opiszKalibracje({ predykcja: 12, pomiar: 5, bladPoprzedni: null, jednostka: 'razy' });
  check('oś zachowania nie dokleja „cm" do liczby sesji', !o.tresc.includes('cm'), o.tresc);
}

// ═══════════════════════════════════════════════════════════════════
// 6. KOLEJNOŚĆ — ładunki do bazy nie mogą jej złamać
// ═══════════════════════════════════════════════════════════════════
{
  const p = wierszPredykcji({
    userId: 'u1', os: OS_FIZYCZNA, metryka: METRYKA_CMJ, predykcja: 38,
    isBaseline: true, warunki: bazowe, teraz: TERAZ,
  });
  check('INSERT predykcji nie niesie measured_value',
    !Object.prototype.hasOwnProperty.call(p, 'measured_value'), JSON.stringify(p));
  check('INSERT predykcji nie niesie measured_at',
    !Object.prototype.hasOwnProperty.call(p, 'measured_at'), JSON.stringify(p));
  check('INSERT zapisuje warunki standaryzacji OD RAZU, nie przy pomiarze',
    p.time_of_day === '17:00' && p.surface === 'beton' && p.footwear === 'korki', JSON.stringify(p));
  check('INSERT nie ustawia comparable — to rozstrzyga się dopiero przy pomiarze',
    !Object.prototype.hasOwnProperty.call(p, 'comparable'), JSON.stringify(p));
}
{
  const u = patchPomiaru({ pomiar: 31, comparable: true, teraz: TERAZ });
  check('UPDATE pomiaru nie niesie predicted_value',
    !Object.prototype.hasOwnProperty.call(u, 'predicted_value'), JSON.stringify(u));
  check('UPDATE pomiaru nie niesie predicted_at',
    !Object.prototype.hasOwnProperty.call(u, 'predicted_at'), JSON.stringify(u));
  check('UPDATE ustawia dokładnie trzy pola', Object.keys(u).length === 3, JSON.stringify(u));
}

// ═══════════════════════════════════════════════════════════════════
// 7. STAN EKRANU — R5
// ═══════════════════════════════════════════════════════════════════
{
  const s = stanKalibracji(null, 'timeout');
  check('błąd odczytu → „nie wiem", NIE „brak predykcji"', s.rodzaj === 'nie_wiem', s.rodzaj);
}
check('odczyt udany, zero wierszy → „brak predykcji"',
  stanKalibracji([], null).rodzaj === 'brak_predykcji', '');
check('otwarta predykcja → ekran pomiaru',
  stanKalibracji([w({ measured_at: null, measured_value: null })], null).rodzaj === 'czeka_na_pomiar', '');
check('dokończony pomiar → ekran wyniku',
  stanKalibracji([w()], null).rodzaj === 'zamkniete', '');
{
  // Otwarta predykcja wygrywa nad dokończonym pomiarem: dopóki jest otwarta,
  // nie wolno pozwolić zapisać nowej.
  const s = stanKalibracji([w(), w({ id: 'k2', measured_at: null, measured_value: null })], null);
  check('otwarta predykcja blokuje zapisanie kolejnej', s.rodzaj === 'czeka_na_pomiar', s.rodzaj);
}
check('punkt zerowy: brak dokończonych pomiarów', czyPunktZerowy([]) === true, '');
check('…sama predykcja bez pomiaru NIE kończy punktu zerowego',
  czyPunktZerowy([w({ measured_at: null, measured_value: null })]) === true, '');
check('…jeden dokończony pomiar już go kończy', czyPunktZerowy([w()]) === false, '');
check('poprzedni błąd liczony z ostatniego dokończonego pomiaru',
  poprzedniBlad([w()]) === 7, String(poprzedniBlad([w()])));
check('…z pominięciem pomiarów NIEporównywalnych',
  poprzedniBlad([w({ comparable: false, predicted_value: 50 }), w({ id: 'k2' })]) === 7,
  String(poprzedniBlad([w({ comparable: false, predicted_value: 50 }), w({ id: 'k2' })])));
check('brak historii → null („nie wiem"), a nie zero', poprzedniBlad([]) === null, '');

// ═══════════════════════════════════════════════════════════════════
// 8. ŹRÓDŁO I TREŚĆ — czego tu być nie może
// ═══════════════════════════════════════════════════════════════════
const zrodlo = readFileSync(join(libDir, 'kalibracja.ts'), 'utf8');
const teksty = [
  KALIBRACJA_PYTANIE_FIZYCZNA, KALIBRACJA_PYTANIE_ZACHOWANIE, KALIBRACJA_ZABLOKOWANE,
  KALIBRACJA_NA_JUTRO, KALIBRACJA_ENTRY_PODPIS, KALIBRACJA_NIE_WIEM_PODPOWIEDZ,
  ...KALIBRACJA_PROTOKOL,
  ...[0, 1, 2, 3, 5, 10].flatMap((r) => [stanZmiany(r, 2.3).tytul, stanZmiany(r, 2.3).tresc]),
].join(' ').toLowerCase();

for (const zakazane of ['brawo', 'świetnie', 'dobrze oszacowa', 'gratul', 'lepszy niż', 'rówieśnik',
  'średnia w twoim wieku', 'ranking', 'wiek biologiczny', 'phv']) {
  check(`treść nie zawiera „${zakazane}"`, !teksty.includes(zakazane), zakazane);
}
check('pytanie o predykcję jest KONKRETNE (centymetry), nie skalą 0–10',
  /centymetr/i.test(KALIBRACJA_PYTANIE_FIZYCZNA), KALIBRACJA_PYTANIE_FIZYCZNA);
check('„nie wiem" ma gotową odpowiedź, a nie kończy rozmowę',
  /zgadnij/i.test(KALIBRACJA_NIE_WIEM_PODPOWIEDZ), KALIBRACJA_NIE_WIEM_PODPOWIEDZ);
check('ekran ma jedną rzecz do zrobienia jutro (zakaz 17)',
  KALIBRACJA_NA_JUTRO.length > 30, KALIBRACJA_NA_JUTRO);
check('protokół ma co najmniej pięć warunków standaryzacji',
  KALIBRACJA_PROTOKOL.length >= 5, String(KALIBRACJA_PROTOKOL.length));
check('źródło nie czyta zegara (czas wchodzi parametrem, reguła E-N2)',
  !/new Date\(\)/.test(zrodlo) && !zrodlo.includes('Date.now('), 'zegar');
check('źródło nie zna progu wzrostu 7,2 cm/rok (to należy do backendu)',
  !zrodlo.includes('7.2') && !zrodlo.includes('7,2'), '7,2');

// ═══════════════════════════════════════════════════════════════════
console.log(`\n${passed} przeszło, ${failed} nie przeszło.`);
if (failed > 0) process.exit(1);
