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
