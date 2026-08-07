// ZMIANA OBRAZU B5 08.08.2026 — NOWY PLIK.
//
//   npx tsx lib/rediagnosis.selftest.ts
//
// PRAKTYKA-EKRAN B6 08.08.2026 — martwa strefa 0,2 → 0,1 po POTWIERDZENIU
// postaci `calcScores()` (odczyt: gamechange-diagnoza/index.html, linia 6092).
// Asercja odporności na drugą, hipotetyczną postać przeliczenia została
// zastąpiona asercją na to, co po potwierdzeniu zostało: błąd zaokrąglenia
// 0,005. Siatka rozrosła się z „przypadków niepłaskich" do WSZYSTKICH 1 212
// kombinacji, a obok niej stoi pomiar, ile zmian zawodnik zaczyna widzieć.
//
// Czego pilnuje ten plik, w kolejności ważności:
//  1. że „w dół" NIGDY nie zostanie ogłoszone zawodnikowi, któremu w
//     rzeczywistości nie spadło — przy potwierdzonej postaci `calcScores()`
//     i jej zaokrągleniu (patrz nagłówek lib/rediagnosis.ts). To jest
//     najdroższy błąd tej stacji: „zdanie o spadku napisane źle potrafi
//     zniechęcić na miesiąc";
//  2. że trzy segmenty z `dir: -1` (tolerancja, odporność, koncentracja) mają
//     obraz w DOBRYM kierunku, a nie odwrócony;
//  3. że stacja nie pyta bez punktu odniesienia i że pominięcie nie zapisuje
//     ani nie liczy się jako spadek;
//  4. że ani jedno zdanie pytania nie powstało w tej rundzie — każde pochodzi
//     z banku.
//
// Na końcu drukuje WYPIS „co zawodnik realnie zobaczy" — sekcja 11 raportu
// zwrotnego jest wyjściem tego kodu, nie tekstem pisanym ręcznie.
import {
  REDIAGNOSIS_DEAD_ZONE,
  REDIAGNOSIS_SCALE_STEPS,
  CALC_SCORES_ROUNDING_ERROR,
  answerPosition,
  baselinePosition,
  baselineFromScores,
  barPercent,
  compareRediagnosis,
  segmentDirection,
  weeksWorked,
  weeksPhrase,
  rediagnosisLead,
  buildRediagnosisView,
  REDIAGNOSIS_NOT_SAVED_TEXT,
  type RediagnosisView,
} from './rediagnosis';
import {
  DIAGNOSIS_ANSWER_SCALE,
  LIVING_DIAGNOSIS_QUESTION_BANK,
  LIVING_DIAGNOSIS_SEGMENT_ORDER,
  resolveLivingDiagnosisWording,
} from './livingDiagnosisQuestionBank';
import { segmentLabel } from './labels';

let passed = 0;
const failures: string[] = [];
function check(label: string, cond: boolean) {
  if (cond) { passed++; return; }
  failures.push(label);
}
function eq(label: string, actual: unknown, expected: unknown) {
  check(`${label}  (było: ${JSON.stringify(actual)}, oczekiwano: ${JSON.stringify(expected)})`,
    JSON.stringify(actual) === JSON.stringify(expected));
}
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

// ─────────────────────────────────────────────────────────────
// 1. SKALA
// ─────────────────────────────────────────────────────────────
eq('SKALA: sześć odpowiedzi', DIAGNOSIS_ANSWER_SCALE.length, 6);
eq('SKALA: wartości 1..6', DIAGNOSIS_ANSWER_SCALE.map(([v]) => v), [1, 2, 3, 4, 5, 6]);
eq('SKALA: dolna etykieta 1:1 z ankietą', DIAGNOSIS_ANSWER_SCALE[0][1], 'Prawie nigdy');
eq('SKALA: górna etykieta 1:1 z ankietą', DIAGNOSIS_ANSWER_SCALE[5][1], 'Prawie zawsze');
eq('SKALA: 6 odpowiedzi = 5 kroków', REDIAGNOSIS_SCALE_STEPS, 5);

// ─────────────────────────────────────────────────────────────
// 2. POZYCJA ODPOWIEDZI — `dir` decyduje, gdzie jest „lepiej"
// ─────────────────────────────────────────────────────────────
check('dir 1: odpowiedź 1 = dół skali', near(answerPosition(1, 1), 0));
check('dir 1: odpowiedź 6 = góra skali', near(answerPosition(6, 1), 1));
check('dir 1: odpowiedź 3 = 0,4', near(answerPosition(3, 1), 0.4));
check('dir -1: odpowiedź 1 = GÓRA skali (odwrócone)', near(answerPosition(1, -1), 1));
check('dir -1: odpowiedź 6 = DÓŁ skali (odwrócone)', near(answerPosition(6, -1), 0));
check('poza skalą w dół przycięte do 1', near(answerPosition(0, 1), 0));
check('poza skalą w górę przycięte do 6', near(answerPosition(9, 1), 1));

const inverted = LIVING_DIAGNOSIS_SEGMENT_ORDER.filter((id) => segmentDirection(id) === -1);
eq('dir -1 ma DOKŁADNIE trzy segmenty (pytania „jak często NIEDOBRZE")',
  inverted, ['tolerancja', 'odpornosc', 'koncentracja']);
eq('segment spoza banku nie ma kierunku', segmentDirection('nie-ma-takiego'), null);

// Realny scenariusz odwrócony: koncentracja, „jak często myśli wracają do
// błędu". Odpowiedź 2 („Rzadko") to DOBRY obraz, odpowiedź 5 — zły.
check('koncentracja: „Rzadko" jest wysoko na pasku', answerPosition(2, -1) > answerPosition(5, -1));

// ─────────────────────────────────────────────────────────────
// 3. PUNKT ODNIESIENIA
// ─────────────────────────────────────────────────────────────
check('wynik 0 = dół paska', near(baselinePosition(0), 0));
check('wynik 100 = góra paska', near(baselinePosition(100), 1));
check('wynik 42 = 0,42', near(baselinePosition(42), 0.42));
check('wynik spoza zakresu przycięty', near(baselinePosition(140), 1) && near(baselinePosition(-5), 0));

eq('brak diagnozy ≠ nieczytelna', baselineFromScores(undefined, 'moc').state, 'no_diagnosis');
eq('nieczytelne `scores` mają własny stan', baselineFromScores(null, 'moc').state, 'unreadable');
eq('diagnoza bez tego segmentu (np. techSpec u juniora)',
  baselineFromScores({ moc: 40 }, 'techSpec').state, 'no_segment_score');
eq('wartość nieliczbowa w JSON-ie nie udaje wyniku',
  baselineFromScores({ moc: 'dużo' } as unknown as Record<string, number>, 'moc').state, 'no_segment_score');
eq('poprawny wynik przechodzi', baselineFromScores({ moc: 61 }, 'moc'), { state: 'ready', score: 61 });

// ─────────────────────────────────────────────────────────────
// 4. MARTWA STREFA — sedno bezpieczeństwa tej rundy
// ─────────────────────────────────────────────────────────────
// PRAKTYKA-EKRAN B6 08.08.2026 — martwa strefa zeszła z 0,2 do 0,1.
// Powód: postać `calcScores()` PRZESTAŁA BYĆ ZAŁOŻENIEM. Sesja główna
// odczytała `gamechange-diagnoza/index.html`, linia 6092 (08.08.2026):
//     sc[id] = Math.round(((raw - 1) / 5) * 100)
// przy `raw` = średnia odpowiedzi z już zastosowanym `dir`. Mapowanie jest
// liniowe od zera, więc wariant „średnia / 6 × 100" (dolny koniec na 0,167)
// jest WYKLUCZONY i asercja przeciwko niemu przestała mieć sens — została tu
// zastąpiona asercją przeciwko temu, co zostało: zaokrągleniu do pełnych punktów.
check('martwa strefa = PÓŁ kroku skali (było: pełny krok)', near(REDIAGNOSIS_DEAD_ZONE, 0.1));
check('pół kroku to dokładnie połowa jednego kroku skali',
  near(REDIAGNOSIS_DEAD_ZONE * 2, 1 / REDIAGNOSIS_SCALE_STEPS));
check('błąd zaokrąglenia calcScores() to 0,005 pozycji (Math.round do pełnych punktów)',
  near(CALC_SCORES_ROUNDING_ERROR, 0.005));
check('martwa strefa jest 20× większa niż jedyny realny błąd przeliczenia (0,1 > 0,005)',
  REDIAGNOSIS_DEAD_ZONE > CALC_SCORES_ROUNDING_ERROR * 10);

// Potwierdzona postać `calcScores()`, przepisana z odczytanej linii i użyta
// WYŁĄCZNIE tutaj — do sprawdzenia, że nasza `baselinePosition()` odtwarza ją
// z dokładnością do zaokrąglenia, i to dla obu wartości `dir`.
const calcScoresConfirmed = (answers: number[], dir: 1 | -1) => {
  const raw = answers.reduce((a, v) => a + (dir === 1 ? v : 7 - v), 0) / answers.length;
  return Math.round(((raw - 1) / 5) * 100);
};
{
  let mismatch = 0;
  for (const dir of [1, -1] as const) {
    for (let v = 1; v <= 6; v++) {
      // Segment, w którym obie odpowiedzi ankiety są takie same — wtedy wynik
      // diagnozy MUSI wypaść dokładnie tam, gdzie nasza pozycja odpowiedzi.
      const score = calcScoresConfirmed([v, v], dir);
      if (Math.abs(baselinePosition(score) - answerPosition(v, dir)) > CALC_SCORES_ROUNDING_ERROR) mismatch++;
    }
  }
  eq('calcScores() ODTWORZONE: nasza skala zgadza się z lejkiem co do zaokrąglenia, '
    + 'dla obu wartości `dir`', mismatch, 0);
}

// SIATKA — wszystkie kombinacje wyniku (0–100 co 1) × odpowiedzi (1–6) × `dir`.
// Pytanie, na które odpowiada: czy ogłoszony kierunek jest prawdziwy dla KAŻDEJ
// pozycji, jaką mógł mieć naprawdę punkt odniesienia przed zaokrągleniem.
let gridAll = 0;
let gridAnnounced = 0;
let gridAnnouncedOldZone = 0;
let gridBroken = 0;
const OLD_DEAD_ZONE = 1 / REDIAGNOSIS_SCALE_STEPS; // 0,2 — stan sprzed tej rundy
for (const dir of [1, -1] as const) {
  for (let score = 0; score <= 100; score += 1) {
    for (let v = 1; v <= 6; v++) {
      gridAll++;
      const { direction, delta } = compareRediagnosis({ baselineScore: score, answerValue: v, dir });
      if (Math.abs(delta) >= OLD_DEAD_ZONE - 1e-9) gridAnnouncedOldZone++;
      if (direction === 'flat') continue;
      gridAnnounced++;
      // Najgorszy przypadek: prawdziwa pozycja punktu odniesienia leży o 0,005
      // po niekorzystnej stronie zaokrąglenia.
      if (direction === 'up' && delta - CALC_SCORES_ROUNDING_ERROR <= 0) gridBroken++;
      if (direction === 'down' && delta + CALC_SCORES_ROUNDING_ERROR >= 0) gridBroken++;
    }
  }
}
eq(`SIATKA ${gridAll} przypadków: żaden ogłoszony kierunek nie jest fałszywy `
  + 'przy potwierdzonej postaci calcScores() (z zaokrągleniem)', gridBroken, 0);
eq('SIATKA: pokryte wszystkie kombinacje (101 wyników × 6 odpowiedzi × 2 kierunki)', gridAll, 1212);
console.log(`\n  [pomiar] Zawodnik widzi kierunek w ${gridAnnounced} z ${gridAll} kombinacji `
  + `(przy dawnej martwej strefie 0,2 było ${gridAnnouncedOldZone}) — `
  + `czyli ${gridAnnounced - gridAnnouncedOldZone} sytuacji więcej niż przed tą rundą.\n`);
check('ZWĘŻENIE MA SKUTEK: pół kroku pokazuje WIĘCEJ prawdziwych zmian niż pełny krok',
  gridAnnounced > gridAnnouncedOldZone);

eq('równe pozycje = bez zmiany',
  compareRediagnosis({ baselineScore: 40, answerValue: 3, dir: 1 }).direction, 'flat');
eq('ĆWIERĆ kroku w górę = wciąż bez zmiany (szum z drugiego pytania segmentu, B27)',
  compareRediagnosis({ baselineScore: 35, answerValue: 3, dir: 1 }).direction, 'flat');
eq('mniej niż pół kroku w dół = bez zmiany',
  compareRediagnosis({ baselineScore: 45, answerValue: 3, dir: 1 }).direction, 'flat');
eq('DOKŁADNIE PÓŁ KROKU w górę = W GÓRĘ (przed tą rundą było „bez zmiany")',
  compareRediagnosis({ baselineScore: 30, answerValue: 3, dir: 1 }).direction, 'up');
eq('DOKŁADNIE PÓŁ KROKU w dół = W DÓŁ (przed tą rundą było „bez zmiany")',
  compareRediagnosis({ baselineScore: 50, answerValue: 3, dir: 1 }).direction, 'down');
eq('PÓŁ KROKU działa też w segmencie odwróconym (`dir: -1`)',
  compareRediagnosis({ baselineScore: 50, answerValue: 4, dir: -1 }).direction, 'down');
eq('dokładnie krok w górę = W GÓRĘ',
  compareRediagnosis({ baselineScore: 40, answerValue: 4, dir: 1 }).direction, 'up');
eq('dokładnie krok w dół = W DÓŁ',
  compareRediagnosis({ baselineScore: 60, answerValue: 3, dir: 1 }).direction, 'down');
eq('spadek jest pokazywany, nie chowany',
  compareRediagnosis({ baselineScore: 80, answerValue: 2, dir: 1 }).direction, 'down');
eq('dir -1: wysoka odpowiedź to SPADEK, nie wzrost',
  compareRediagnosis({ baselineScore: 70, answerValue: 6, dir: -1 }).direction, 'down');
eq('dir -1: niska odpowiedź to wzrost',
  compareRediagnosis({ baselineScore: 30, answerValue: 1, dir: -1 }).direction, 'up');

eq('pasek nigdy nie ma zerowej szerokości', barPercent(0), 6);
eq('pasek pełny to 100', barPercent(1), 100);
eq('pasek 0,42 to 42', barPercent(0.42), 42);

// ─────────────────────────────────────────────────────────────
// 5. TYGODNIE
// ─────────────────────────────────────────────────────────────
const NOW = new Date('2026-08-08T10:00:00Z');
eq('sześć tygodni pracy', weeksWorked('2026-06-27T10:00:00Z', NOW), 6);
eq('mniej niż tydzień = brak liczby', weeksWorked('2026-08-05T10:00:00Z', NOW), null);
eq('brak daty = brak liczby', weeksWorked(null, NOW), null);
eq('data nieczytelna = brak liczby', weeksWorked('kiedyś', NOW), null);
eq('odmiana 1', weeksPhrase(1), '1 tydzień');
eq('odmiana 3', weeksPhrase(3), '3 tygodnie');
eq('odmiana 6', weeksPhrase(6), '6 tygodni');
eq('odmiana 12 (wyjątek)', weeksPhrase(12), '12 tygodni');
eq('odmiana 22', weeksPhrase(22), '22 tygodnie');
check('wstęp bez liczby tygodni nie zostawia dziury',
  !rediagnosisLead(null).includes('undefined') && !rediagnosisLead(null).startsWith(' '));
check('wstęp z liczbą tygodni ją zawiera', rediagnosisLead(6).includes('6 tygodni'));

// ─────────────────────────────────────────────────────────────
// 6. WIDOK — co jest, a czego nie ma na ekranie
// ─────────────────────────────────────────────────────────────
const READY = { state: 'ready' as const, score: 42 };

eq('BEZ PUNKTU ODNIESIENIA NIE PYTAMY',
  buildRediagnosisView({ segmentId: 'regeneracja', baseline: { state: 'no_diagnosis' }, answerValue: null }),
  { kind: 'absent', reason: 'no_baseline' });
eq('diagnoza bez tego segmentu — też nie pytamy',
  (buildRediagnosisView({ segmentId: 'techSpec', baseline: { state: 'no_segment_score' }, answerValue: null }) as any).reason,
  'no_baseline');
eq('błąd odczytu — też nie pytamy',
  (buildRediagnosisView({ segmentId: 'moc', baseline: { state: 'error' }, answerValue: null }) as any).reason,
  'no_baseline');
eq('POMINIĘCIE: pustka, zero treści, zero spadku',
  buildRediagnosisView({ segmentId: 'regeneracja', baseline: READY, answerValue: null, skipped: true }),
  { kind: 'absent', reason: 'skipped' });
eq('pominięcie działa też PO odpowiedzi (kolejność stanów)',
  (buildRediagnosisView({ segmentId: 'regeneracja', baseline: READY, answerValue: 5, skipped: true }) as any).reason,
  'skipped');
eq('ładowanie nie miga treścią',
  (buildRediagnosisView({ segmentId: 'moc', baseline: READY, answerValue: null, loading: true }) as any).reason,
  'loading');
eq('segment spoza banku 13 pytań',
  (buildRediagnosisView({ segmentId: 'wymyslony', baseline: READY, answerValue: null }) as any).reason,
  'unknown_segment');

const q = buildRediagnosisView({
  segmentId: 'regeneracja', baseline: READY, answerValue: null, weeks: 6,
}) as Extract<RediagnosisView, { kind: 'question' }>;
eq('pytanie: właściwy stan', q.kind, 'question');
eq('ZERO NOWYCH PYTAŃ — treść 1:1 z banku',
  q.question, LIVING_DIAGNOSIS_QUESTION_BANK.regeneracja.universal.t);
eq('podpowiedź też z banku', q.ctx, LIVING_DIAGNOSIS_QUESTION_BANK.regeneracja.universal.ctx);
eq('nazwa segmentu z jednego źródła nazw', q.segmentName, segmentLabel('regeneracja'));
eq('skala pytania to skala ankiety', q.scale.length, 6);
check('pomijalność widoczna przy pytaniu', q.skipLabel.length > 0 && q.skipNote.length > 0);

const qPos = buildRediagnosisView({
  segmentId: 'moc', baseline: READY, answerValue: null, wordingKey: 'skrzydlowy',
}) as Extract<RediagnosisView, { kind: 'question' }>;
eq('wariant pozycyjny użyty tak samo jak w ankiecie',
  qPos.question, resolveLivingDiagnosisWording('moc', 'skrzydlowy')!.t);
check('wariant pozycyjny różni się od uniwersalnego',
  qPos.question !== LIVING_DIAGNOSIS_QUESTION_BANK.moc.universal.t);
eq('segment bez wariantów pozycyjnych ignoruje pozycję',
  (buildRediagnosisView({ segmentId: 'regeneracja', baseline: READY, answerValue: null, wordingKey: 'skrzydlowy' }) as any).question,
  LIVING_DIAGNOSIS_QUESTION_BANK.regeneracja.universal.t);

// Kontrola przekrojowa: dla każdego z 13 segmentów pytanie na ekranie jest
// dosłownie tym z banku — żeby żadna przyszła sesja nie „poprawiła" go tutaj.
let bankMismatch = 0;
for (const id of LIVING_DIAGNOSIS_SEGMENT_ORDER) {
  const v = buildRediagnosisView({ segmentId: id, baseline: READY, answerValue: null }) as any;
  if (v.kind !== 'question' || v.question !== LIVING_DIAGNOSIS_QUESTION_BANK[id].universal.t) bankMismatch++;
}
eq('13/13 segmentów pyta dokładnie tekstem z banku', bankMismatch, 0);

const up = buildRediagnosisView({ segmentId: 'regeneracja', baseline: READY, answerValue: 5, weeks: 6 }) as any;
eq('w górę: kierunek', up.direction, 'up');
eq('w górę: pasek przed', up.beforeBarPercent, 42);
eq('w górę: pasek dziś', up.afterBarPercent, 80);
check('w górę: nagłówek mówi o kierunku', up.headline.includes('w górę'));
eq('zapisane = brak dopisku o niezapisaniu', up.notSavedText, null);

const down = buildRediagnosisView({ segmentId: 'regeneracja', baseline: READY, answerValue: 2, weeks: 6 }) as any;
eq('w dół: kierunek', down.direction, 'down');
check('w dół: nagłówek nie ocenia', !/słab|gorzej wypad|niestety|szkoda/i.test(down.headline));
check('w dół: brak pocieszania („nic straconego", „nie martw się")',
  !/nie martw|nic strac|głowa do góry|spokojnie/i.test(down.body));
check('w dół: jedno zdanie o tym, co to MOŻE znaczyć', down.body.split('. ').length <= 2);
check('w dół: nie obwinia zawodnika', !/twoja wina|zawiodł|nie dałeś/i.test(down.body));

const flat = buildRediagnosisView({ segmentId: 'regeneracja', baseline: READY, answerValue: 3, weeks: 6 }) as any;
eq('bez zmiany: kierunek', flat.direction, 'flat');
check('bez zmiany: nie udaje wzrostu', !flat.headline.includes('w górę'));

const notSaved = buildRediagnosisView({
  segmentId: 'regeneracja', baseline: READY, answerValue: 5, weeks: 6, saved: false,
}) as any;
eq('nieudany zapis mówi wprost', notSaved.notSavedText, REDIAGNOSIS_NOT_SAVED_TEXT);
eq('nieudany zapis NIE ukrywa różnicy', notSaved.direction, 'up');

// Odwrócony segment na ekranie, od początku do końca.
const konc = buildRediagnosisView({
  segmentId: 'koncentracja', baseline: { state: 'ready', score: 30 }, answerValue: 1, weeks: 5,
}) as any;
eq('koncentracja: „prawie nigdy nie wracam do błędu" to WZROST', konc.direction, 'up');
eq('koncentracja: pasek dziś na górze', konc.afterBarPercent, 100);

// ─────────────────────────────────────────────────────────────
// WYPIS — sekcja 11 raportu zwrotnego
// ─────────────────────────────────────────────────────────────
const line = '─'.repeat(62);
function drawBar(pct: number) {
  const filled = Math.round((pct / 100) * 40);
  return `${'█'.repeat(filled)}${'░'.repeat(40 - filled)}`;
}
function printChange(title: string, v: any) {
  console.log(`\n### ${title}\n`);
  console.log(line);
  console.log(`${v.eyebrow.toUpperCase()}  ·  ${v.segmentName}`);
  console.log('');
  console.log(`  ${v.beforeCaption.padEnd(14)}${drawBar(v.beforeBarPercent)}`);
  console.log(`  ${v.afterCaption.padEnd(14)}${drawBar(v.afterBarPercent)}`);
  console.log('');
  console.log(`  ${v.headline}`);
  console.log(`  ${v.body}`);
  if (v.notSavedText) console.log(`  ${v.notSavedText}`);
  console.log(line);
}

console.log('\n\n══════════════════════════════════════════════════════════════');
console.log('CO ZAWODNIK REALNIE ZOBACZY PRZY ZAMKNIĘCIU BLOKU');
console.log('══════════════════════════════════════════════════════════════');
console.log('\nScenariusz: Blok Skupienia na Elemencie „Wydłużenie snu nocnego"');
console.log('(segment Regeneracja), 6 tygodni pracy, wynik tego segmentu');
console.log('w diagnozie sprzed bloku: 42 na 100.');

const ask = buildRediagnosisView({ segmentId: 'regeneracja', baseline: READY, answerValue: null, weeks: 6 }) as any;
console.log('\n### Krok 1 — pytanie (wspólne dla wszystkich trzech przypadków)\n');
console.log(line);
console.log(`${ask.eyebrow.toUpperCase()}  ·  ${ask.segmentName}`);
console.log(`\n${ask.lead}\n`);
console.log(ask.question);
console.log(`\n${ask.ctx}\n`);
console.log(ask.scale.map(([v, l]: [number, string]) => `[${v} ${l}]`).join('  '));
console.log(`\n${ask.skipLabel}`);
console.log(ask.skipNote);
console.log(line);

printChange('Przypadek 1 — wynik w górę (odpowiedź: 5 „Często")',
  buildRediagnosisView({ segmentId: 'regeneracja', baseline: READY, answerValue: 5, weeks: 6 }));
printChange('Przypadek 2 — wynik w dół (odpowiedź: 2 „Rzadko")',
  buildRediagnosisView({ segmentId: 'regeneracja', baseline: READY, answerValue: 2, weeks: 6 }));

const skippedView = buildRediagnosisView({
  segmentId: 'regeneracja', baseline: READY, answerValue: null, skipped: true, weeks: 6,
});
console.log('\n### Przypadek 3 — rediagnoza pominięta\n');
console.log(line);
console.log(`(stacja nie renderuje się w ogóle — ${JSON.stringify(skippedView)})`);
console.log('Zawodnik przechodzi wprost do „Co dalej?" i zamyka Blok normalnie.');
console.log('Do bazy nie idzie żaden wiersz.');
console.log(line);

printChange('Przypadek 4 — bez zmiany (odpowiedź: 3 „Raczej rzadko")',
  buildRediagnosisView({ segmentId: 'regeneracja', baseline: READY, answerValue: 3, weeks: 6 }));
printChange('Przypadek 5 — segment odwrócony (Koncentracja, odpowiedź: 1 „Prawie nigdy")',
  konc);
printChange('Przypadek 6 — zapis się nie udał (odpowiedź: 5, tabela niedostępna)',
  notSaved);

const noBase = buildRediagnosisView({ segmentId: 'regeneracja', baseline: { state: 'no_diagnosis' }, answerValue: null });
console.log('\n### Przypadek 7 — zawodnik bez diagnozy sprzed bloku\n');
console.log(line);
console.log(`(stacja nie renderuje się w ogóle — ${JSON.stringify(noBase)})`);
console.log('Nie pytamy, bo nie byłoby czego z czym porównać — a każde pytanie');
console.log('kosztuje uwagę. Blok zamyka się dokładnie tak jak przed tą rundą.');
console.log(line);

// ─────────────────────────────────────────────────────────────
console.log(`\n\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  // `throw` zamiast `process.exit` — `process` wymaga @types/node, których
  // tsconfig appki nie zaciąga (znalezisko B21), a ten plik jest objęty
  // `npx tsc --noEmit`.
  throw new Error(`${failures.length} asercji nie przeszło.`);
}
