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
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75)
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — nazwane liczbą. Ten plik miał **109 ASERCJI, drugie
// miejsce w całej suicie**, i ANI JEDNEJ, która czytałaby EKRAN. Audyt H1
// (15.08) zmierzył: nie istnieje stan repozytorium z pilnowanym defektem,
// na którym ten strażnik by się zapalił.
//
// DLACZEGO TO JEST GROŹNE AKURAT TUTAJ. Nagłówek `lib/rediagnosis.ts` mówi,
// że najdroższym błędem tej stacji jest **ogłoszenie spadku komuś, komu nie
// spadło** („zdanie o spadku napisane źle potrafi zniechęcić na miesiąc").
// Cała ta ostrożność — martwa strefa, błąd zaokrąglenia `calcScores()`,
// trzy segmenty z odwróconym kierunkiem, Osłona przy szybkim wzroście —
// siedzi w module. **Ekran mógł ją całą ominąć i napisać własne zdanie,
// a 109 asercji nadal świeciło 109/109.**
//
// ⭐ DRUGA RZECZ, KTÓREJ NIKT NIE PILNOWAŁ: stacja pokazuje DWA paski,
// „byłeś tu — jesteś tu". Skasowanie paska „przed" zostawia zawodnika
// z samym nowym wynikiem — czyli z oceną zamiast z ruchem. To jest
// dokładnie to, czego ten komponent obiecuje w nagłówku nie robić,
// i przed 16.08 żadna asercja tego nie sprawdzała.
//
// ⚠️ CZEGO TA SEKCJA NIE UDAJE. Czyta źródło ekranu JAKO TEKST. Nie
// uruchamia Reacta i nie wie, czy stacja się rysuje. Podmiana wywołania
// na inne, równie zepsute, przejdzie tu niezauważona.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (O53): `tsconfig.json` ciągnie DOM, więc `tsc`
// pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

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
// PLAN-D-P 08.2026 (13.08.2026) — reguła uratowana z Kalibracji, sekcja (P5) niżej.
import { czytajOgraniczenia, czyOslonaAktywna } from './ograniczenia';

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

// ═══════════════════════════════════════════════════════════════════
// ⭐ 0. PAS I2 16.08.2026 — EKRAN, KTÓRY RYSUJE STACJĘ (K4 / O75)
// ═══════════════════════════════════════════════════════════════════
// ⚠️ `check()` w tym pliku przyjmuje SAMĄ etykietę (bez osobnego `detail`),
// więc cały opis defektu idzie w etykietę — inaczej porażka pokazałaby się
// na dole jako gołe zdanie bez tego, co dokładnie było zepsute.
{
  const root = dirname(dirname(fileURLToPath(import.meta.url)));

  /**
   * Źródło BEZ komentarzy. Ten komponent CYTUJE w nagłówku dokładnie te rzeczy,
   * których pilnujemy („zawodnik widzi RÓŻNICĘ… nigdy sam nowy wynik"), więc
   * strażnik czytający surowy tekst przechodziłby na własnej dokumentacji,
   * a jedynym sposobem, żeby go zapalić, byłoby skasowanie wyjaśnienia.
   */
  const bezKomentarzy = (s: string): string => s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .join('\n');

  // ⛔ Brak pliku to FAIL Z NAZWĄ, nigdy wyjątek `ENOENT` (O76).
  const BRAK_PLIKOW: string[] = [];
  const surowe = (wzgledna: string): string => {
    const p = join(root, wzgledna);
    if (!existsSync(p)) { BRAK_PLIKOW.push(wzgledna); return ''; }
    return readFileSync(p, 'utf8');
  };

  const PLIK_STACJA = 'components/BlockClosingRediagnosis.tsx';
  const stacja = bezKomentarzy(surowe(PLIK_STACJA));

  check(`⛔ (I2-0) plik stacji istnieje i daje się odczytać — brak: ${BRAK_PLIKOW.join(', ') || '—'} `
    + '(zmieniła się nazwa albo miejsce komponentu; do czasu poprawki asercje niżej czytają PUSTY tekst)',
    BRAK_PLIKOW.length === 0);

  // ── Odkrywanie z katalogu, nie lista na sztywno (O69) ──
  const POMIN_KAT = new Set(['_diag_backup', 'node_modules', '.git', '.expo', 'assets']);
  const chodz = (katalog: string, out: string[] = []): string[] => {
    if (!existsSync(katalog)) return out;
    for (const wpis of readdirSync(katalog)) {
      if (POMIN_KAT.has(wpis)) continue;
      const p = join(katalog, wpis);
      if (statSync(p).isDirectory()) chodz(p, out);
      else out.push(p);
    }
    return out;
  };
  const EKRANY = ['app', 'components']
    .flatMap((k) => chodz(join(root, k)))
    .filter((p) => p.endsWith('.ts') || p.endsWith('.tsx'))
    .map((p) => relative(root, p).split(sep).join('/'))
    .filter((p) => !p.endsWith('.selftest.ts'))
    .sort();

  const konsumenci = EKRANY.filter(
    (p) => /from\s+'[^']*\/rediagnosis'/.test(bezKomentarzy(readFileSync(join(root, p), 'utf8'))));
  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c` (po D2 i I1), nie przepisane
  // z pamięci. RÓWNOŚĆ, nie „≥ 1" (O73): „co najmniej jeden konsument"
  // przeszłoby także wtedy, gdy stacja zniknie z zamykania Bloku.
  const OCZEKIWANI = [PLIK_STACJA];
  check(`⭐ (I2-0) stację rysuje DOKŁADNIE jeden plik, ten sam co 16.08 — RÓWNOŚĆ, nie „≥ 1" (O73). `
    + `Zastane: [${konsumenci.join(', ') || 'ŻADEN'}], oczekiwane: [${OCZEKIWANI.join(', ')}]. `
    + 'Ubyło → zawodnik przestał być pytany o zmianę obrazu po Bloku, a 109 asercji niżej nadal jest zielonych. '
    + 'Doszło → drugie miejsce rysuje zmianę i może ją rozstrzygać po swojemu.',
    JSON.stringify(konsumenci) === JSON.stringify(OCZEKIWANI));

  // ── ⛔ EKRAN NIE ROZSTRZYGA KIERUNKU ZMIANY ──
  // Defekt, którego pilnuje: stacja porównuje sobie odpowiedź z punktem
  // odniesienia i sama nazywa kierunek. Wtedy cała ostrożność modułu —
  // martwa strefa, błąd zaokrąglenia `calcScores()`, trzy segmenty z `dir:-1`,
  // Osłona przy szybkim wzroście — przestaje obowiązywać, a zawodnik czyta
  // „w dół" przy wyniku, który nie spadł.
  const DECYDUJACE = ['compareRediagnosis', 'segmentDirection', 'answerPosition',
    'baselinePosition', 'REDIAGNOSIS_DEAD_ZONE', 'CALC_SCORES_ROUNDING_ERROR'];
  const przecieki = DECYDUJACE.filter((f) => new RegExp(`\\b${f}\\b`).test(stacja));
  check('⛔ (I2-0) stacja NIE rozstrzyga kierunku zmiany sama — o „w górę / w dół / bez zmiany" '
    + `decyduje wyłącznie \`buildRediagnosisView\`. Znalezione na ekranie: [${przecieki.join(', ') || '—'}] `
    + '→ druga reguła kierunku obok tej, którą pilnuje 109 asercji niżej; najdroższy błąd tej stacji '
    + 'to ogłoszenie spadku komuś, komu nie spadło',
    przecieki.length === 0);

  check('⛔ (I2-0) stacja woła `buildRediagnosisView(` — bez tego nie ma czego rysować',
    /buildRediagnosisView\(/.test(stacja));

  // ── ⭐ DWA PASKI, NIGDY JEDEN ──
  // Nagłówek komponentu obiecuje: „zawodnik widzi RÓŻNICĘ — dwa paski,
  // «byłeś tu, jesteś tu», nigdy sam nowy wynik". Skasowanie paska „przed"
  // zamienia ruch w ocenę, a ocena bez punktu odniesienia jest tym, czego
  // ekran Diagnoza świadomie nie pokazuje od rundy 1.
  check('⭐ (I2-0) stacja rysuje OBA paski — `beforeBarPercent` I `afterBarPercent`; sam nowy wynik '
    + 'zamienia RUCH w OCENĘ, a stacja powstała po to, żeby pokazywać ruch',
    /view\.beforeBarPercent/.test(stacja) && /view\.afterBarPercent/.test(stacja));

  check('⛔ (I2-0) stacja nie przelicza pasków po swojemu — ani `barPercent(`, ani własnego `* 100`',
    !/\bbarPercent\s*\(/.test(stacja) && !/\*\s*100\b/.test(stacja));

  // ── ⭐ ZDANIA POCHODZĄ Z MODUŁU, NIE Z EKRANU ──
  // Komponent obiecuje „nie dokłada ani jednego zdania". Sprawdzamy to
  // dwustronnie: pola widoku MUSZĄ być narysowane, a KOPII stałych modułu
  // na ekranie ma nie być.
  for (const pole of ['headline', 'body', 'lead', 'question', 'eyebrow', 'segmentName',
    'beforeCaption', 'afterCaption', 'skipLabel', 'skipNote', 'notSavedText']) {
    check(`⭐ (I2-0) stacja rysuje \`view.${pole}\` — zdanie widoczne dla zawodnika przychodzi `
      + 'z modułu, a nie powstaje na ekranie',
      new RegExp(`view\\.${pole}\\b`).test(stacja));
  }

  check('⛔ (I2-0) na ekranie NIE stoi kopia zdania „nie zapisało się" ze stałej modułu — '
    + 'kopia rozjedzie się po cichu z oryginałem i zawodnik przeczyta dwie różne prawdy o tym samym',
    !stacja.includes(REDIAGNOSIS_NOT_SAVED_TEXT));

  // ── ⛔ NAPRAWA A4c: STACJA NIGDY NIE ZAMYKA ZAWODNIKA W BLOKU ──
  // Defekt historyczny (naprawiony 12.08, commit `e3cce2b`): przy
  // `kind:'absent'` render kończył się `return null`, ale `resolve()` nie
  // leciało — `rediagnosisResolved` zostawało `false`, więc trzy przyciski
  // „Co dalej?" NIE POJAWIAŁY SIĘ NIGDY, a ekran przeglądu nie ma innego
  // wyjścia. Zawodnik zostawał uwięziony na podsumowaniu WŁASNEGO Bloku.
  // Wystarczał jeden segment spoza banku pytań.
  check('⛔ (I2-0) przy `kind === \'absent\'` stacja WOŁA `resolve()` (naprawa A4c, `e3cce2b`) — '
    + 'bez tego zawodnik zostaje uwięziony na podsumowaniu własnego Bloku bez ani jednego wyjścia',
    /view\.kind\s*===\s*'absent'\s*\)\s*resolve\(\)/.test(stacja));

  check('⛔ (I2-0) …i dopiero potem nie rysuje niczego (`return null`)',
    /if\s*\(\s*view\.kind\s*===\s*'absent'\s*\)\s*return null/.test(stacja));

  // ── ⛔ POMINIĘCIE NIC NIE ZAPISUJE ──
  // „Pominięcie nie jest danymi o zawodniku i nie może się liczyć jako spadek."
  const onSkip = (stacja.match(/const onSkip\s*=[\s\S]{0,400}?\n\s*\};/) ?? [''])[0];
  check(`⛔ (I2-0) „Nie chcę teraz odpowiadać" NIC NIE ZAPISUJE — w \`onSkip\` nie ma \`saveRediagnosisAnswer\`. `
    + `Zastane ciało: ${onSkip.replace(/\s+/g, ' ').slice(0, 200) || '(nie znalazłem onSkip)'} `
    + '→ pominięcie zapisane jako odpowiedź staje się punktem na osi zawodnika, którego on nigdy nie podał',
    onSkip !== '' && !/saveRediagnosisAnswer/.test(onSkip));

  console.log(`[pomiar] I2 16.08.2026: stację „Zmiana obrazu" rysuje ${konsumenci.length} plik(ów) `
    + `(${konsumenci.join(', ') || 'ŻADEN'}); pól widoku sprawdzanych na ekranie: 11.`);
}

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

// ═════════════════════════════════════════════════════════════
// (P5) OSŁONA PRZERAMOWUJE SPADEK — reguła uratowana z Kalibracji
// ═════════════════════════════════════════════════════════════
// Reguła: „spadku nie nazywa się spadkiem u kogoś, kto akurat szybko rośnie".
// Do 13.08.2026 mieszkała w `lib/kalibracja.ts` i zginęłaby razem z nią.
//
// ⚠️ NAJDROŻSZY BŁĄD TEJ GAŁĘZI nie jest kosmetyczny: powiedzenie „rośniesz
// i dlatego ta liczba spadła" komuś, kto NIE rośnie (np. ma kontuzję), jest
// podaniem prawdopodobnego jako pewnego. Dlatego asercje niżej sprawdzają
// przede wszystkim, kiedy produkt ma MILCZEĆ o wzrastaniu.
{
  const koperta = (aktywne: string[], nieznane: string[] = []) => czytajOgraniczenia({
    wersja: 1, aktywne, nieznane_ograniczenia: nieznane, nieznane: [],
  });
  const OSLONA = koperta(['blokNieZwiekszaObjetosci']);
  const KONTUZJA = koperta(['blokNieZwiekszaObjetosci', 'systemMilczyOCelach']);
  const SPOKOJ = koperta([]);
  const NIEROZSTRZYGNIETE = koperta([], ['blokNieZwiekszaObjetosci']);
  const widok = (answerValue: number, ograniczenia: any) => buildRediagnosisView({
    segmentId: 'regeneracja', baseline: READY, answerValue, weeks: 6, ograniczenia,
  }) as any;

  // 1. Wyprowadzenie stanu Osłony z koperty — sedno, bo wszystko inne z niego wynika.
  eq('(P5) blok=tak, kontuzja=nie → Osłona OBOWIĄZUJE', czyOslonaAktywna(OSLONA), 'tak');
  eq('(P5) blok=tak, kontuzja=tak → NIE WIEM (przesłanki nierozróżnialne)',
    czyOslonaAktywna(KONTUZJA), 'nie_wiem');
  eq('(P5) blok=nie → Osłona NIE obowiązuje', czyOslonaAktywna(SPOKOJ), 'nie');
  eq('(P5) blok nierozstrzygnięty → NIE WIEM', czyOslonaAktywna(NIEROZSTRZYGNIETE), 'nie_wiem');
  eq('(P5) koperty nie odczytano → NIE WIEM, nigdy „nie"',
    czyOslonaAktywna(czytajOgraniczenia(undefined, 'błąd sieci')), 'nie_wiem');

  // 2. Spadek przy Osłonie — nie nazywa się spadkiem.
  const spadekOslona = widok(2, OSLONA);
  eq('(P5) spadek przy Osłonie: kierunek nadal „down" — liczby nie fałszujemy',
    spadekOslona.direction, 'down');
  eq('(P5) …i widok mówi wprost, że przeramował', spadekOslona.oslona, 'tak');
  check('(P5) …nagłówek NIE nazywa tego spadkiem',
    !/w dół/i.test(spadekOslona.headline));
  check('(P5) …i mówi wprost, że to nie jest cofnięcie się',
    /nie jest cofnięcie/i.test(spadekOslona.body));
  check('(P5) …i nie podaje ANI JEDNEJ liczby o dojrzałości biologicznej',
    !/\d/.test(spadekOslona.headline) && !/\d/.test(spadekOslona.body));
  check('(P5) …i nadal daje jedną rzecz do zrobienia (zakaz 17 / M4)',
    /sn(u|em)|objętoś/i.test(spadekOslona.body));

  // 3. Brak zmiany przy Osłonie — to jest OSIĄGNIĘCIE (P1 z ZASADY_OBOWIAZUJACE).
  const plaskoOslona = widok(3, OSLONA);
  eq('(P5) bez zmiany przy Osłonie: kierunek nadal „flat"', plaskoOslona.direction, 'flat');
  check('(P5) …a utrzymanie wyniku jest NAZWANE osiągnięciem, nie „brakiem zmian"',
    /utrzyma/i.test(plaskoOslona.headline) && !/tak samo/i.test(plaskoOslona.headline));

  // 4. Wzrost przy Osłonie — brzmienie się NIE zmienia.
  eq('(P5) wzrost przy Osłonie mówi to samo co bez niej',
    widok(5, OSLONA).body, widok(5, SPOKOJ).body);

  // 5. ⛔ TRZY PRZYPADKI, W KTÓRYCH PRODUKT NIE MA PRAWA POWIEDZIEĆ „ROŚNIESZ".
  for (const [nazwa, stan] of [
    ['kontuzja (przesłanki nierozróżnialne)', KONTUZJA],
    ['spokojny tydzień', SPOKOJ],
    ['ograniczenie nierozstrzygnięte', NIEROZSTRZYGNIETE],
  ] as const) {
    const w = widok(2, stan);
    check(`(P5) ⛔ ${nazwa}: spadek NIE jest przeramowany`,
      w.oslona !== 'tak' && /w dół/i.test(w.headline) && !/rośniesz/i.test(w.body));
  }
  const bezKoperty = buildRediagnosisView({
    segmentId: 'regeneracja', baseline: READY, answerValue: 2, weeks: 6,
  }) as any;
  eq('(P5) ⛔ wywołanie BEZ koperty zachowuje się co do znaku jak przed rundą P',
    bezKoperty.body, widok(2, SPOKOJ).body);
  eq('(P5) …i nazywa swój stan „nie_wiem", a nie „nie"', bezKoperty.oslona, 'nie_wiem');
}

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

// ⚠️ DWA PRZYPADKI DO PRZEJRZENIA PRZEZ KUBĘ — brzmienia nowe 13.08.2026 (P5).
{
  const OSLONA = czytajOgraniczenia({
    wersja: 1, aktywne: ['blokNieZwiekszaObjetosci'], nieznane_ograniczenia: [], nieznane: [],
  });
  console.log('\n\n⚠️  PONIŻSZE DWA — TEN SAM ZAWODNIK, ALE W SZCZYCIE SKOKU WZROSTOWEGO');
  console.log('    (arbiter włączył Osłonę: tempo > 7,2 cm/rok, kontuzji nie ma).');
  console.log('    Brzmienia NOWE 13.08.2026 — DO PRZEJRZENIA PRZEZ KUBĘ.');
  printChange('Przypadek 8 — wynik w dół PRZY OSŁONIE (odpowiedź: 2 „Rzadko")',
    buildRediagnosisView({ segmentId: 'regeneracja', baseline: READY, answerValue: 2, weeks: 6, ograniczenia: OSLONA }));
  printChange('Przypadek 9 — bez zmiany PRZY OSŁONIE (odpowiedź: 3 „Raczej rzadko")',
    buildRediagnosisView({ segmentId: 'regeneracja', baseline: READY, answerValue: 3, weeks: 6, ograniczenia: OSLONA }));
}

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
