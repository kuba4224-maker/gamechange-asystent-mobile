// Weryfikacja lib/livingDiagnosisCascade.ts — czysta logika, bez Supabase/
// RN, uruchamiana lokalnie poza appką:
//
//   npx tsx lib/livingDiagnosisCascade.selftest.ts
//
// (jeśli brak `tsx` w projekcie: `npm install --no-save tsx`, potem to
// samo polecenie). Wzorem lib/matchCascade.selftest.ts — ta sama konwencja
// testowa co reszta appki mobilnej (NIE tests/test-*.js, to konwencja z
// drugiego repo, gamechange-app). Uruchom ponownie po każdej zmianie w
// livingDiagnosisCascade.ts/positionProfiles.ts/livingDiagnosisQuestionBank.ts.
// PLAN-D-E 12.08.2026 — dopisane `type` przy imporcie typu (znalezisko E-N8),
// z tego samego powodu co w matchCascade.selftest.ts.
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75)
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — nazwane liczbą, nie odczuciem. Ten plik miał 13 ASERCJI
// i ANI JEDNEJ, która czytałaby jakikolwiek EKRAN. Sprawdzał wyłącznie własny
// moduł przez `import`. Audyt H1 (15.08) zmierzył: nie istnieje stan
// repozytorium z pilnowanym defektem, na którym ten strażnik by się zapalił.
//
// ⚠️ ZNALEZISKO PASA I2, WAŻNIEJSZE NIŻ SAM STRAŻNIK. Kaskada MA konsumenta
// — `components/LivingDiagnosisPulseCard.tsx`, montowany z `app/(tabs)/dzis.tsx`
// — ale ten konsument NIE RYSUJE NIC. Karta ma flagę zamrożenia
// (decyzja Kuby 06.08.2026, powód: `response_value` nie było czytane nigdzie
// w produkcie) i jako pierwszą instrukcję zwraca `null`. Flaga stoi na `false`
// OD NARODZIN KARTY (commit `f54bc0b`, 07.08.2026) — w całej historii tego
// repozytorium ta kaskada nie narysowała zawodnikowi ani jednego pytania.
// Czyli: to NIE jest „producent bez konsumenta", to jest producent
// z konsumentem, który stoi na hamulcu. Sekcja 0 pilnuje OBU rzeczy naraz:
// czy ścieżka do ekranu jest cała, i czy hamulec dalej stoi tam, gdzie
// go zostawiono.
//
// ⚠️ CZEGO TA SEKCJA NIE UDAJE. Czyta źródło ekranu JAKO TEKST. Nie uruchamia
// Reacta i nie wie, czy karta się rysuje. Podmiana wywołania na inne, równie
// zepsute, przejdzie tu niezauważona. Dlatego każda asercja mówi wprost,
// co dokładnie było zepsute i co zawodnik zobaczyłby źle.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (O53): `tsconfig.json` ciągnie DOM, więc `tsc`
// pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  selectSegmentForLivingDiagnosis,
  isPulseDueToday,
  getRelativeDeficits,
  type PlayerLivingDiagnosisContext,
  FRESHNESS_COOLDOWN_DAYS,
  PULSE_INTERVAL_DAYS,
} from './livingDiagnosisCascade';
import { LIVING_DIAGNOSIS_SEGMENT_ORDER } from './livingDiagnosisQuestionBank';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ 0. PAS I2 16.08.2026 — EKRAN, KTÓRY RYSUJE PULS (K4 / O75)
// ═══════════════════════════════════════════════════════════════════
// Wszystkie asercje w tej sekcji czytają ŹRÓDŁO EKRANU I POŚREDNIKA, nie
// moduł. Bez nich 13 asercji niżej opisuje funkcję, której nikt nie musi wołać.

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — pliki tego projektu CYTUJĄ w komentarzach nazwy
 * funkcji i zepsute wywołania (np. `dzis.tsx` wymienia nazwę flagi zamrożenia
 * w komentarzu nad montażem karty), więc strażnik czytający surowy tekst
 * przechodziłby na własnej dokumentacji. Wtedy jedynym sposobem, żeby go
 * zapalić, byłoby skasowanie wyjaśnienia.
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

const PLIK_KARTA = 'components/LivingDiagnosisPulseCard.tsx';
const PLIK_DZIS = 'app/(tabs)/dzis.tsx';
const PLIK_POSREDNIK = 'lib/livingDiagnosisPulses.ts';
const karta = bezKomentarzy(surowe(PLIK_KARTA));
const dzis = bezKomentarzy(surowe(PLIK_DZIS));
const posrednik = bezKomentarzy(surowe(PLIK_POSREDNIK));

{
  console.log('0. EKRAN, KTÓRY RYSUJE PULS (K4 / O75)');

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
  const trescEkranu = new Map<string, string>(
    EKRANY.map((p) => [p, bezKomentarzy(readFileSync(join(root, p), 'utf8'))]));

  const rowneZbiory = (zmierzone: string[], oczekiwane: string[]) => {
    const brakujacy = oczekiwane.filter((p) => !zmierzone.includes(p));
    const nadmiarowi = zmierzone.filter((p) => !oczekiwane.includes(p));
    return { ok: brakujacy.length === 0 && nadmiarowi.length === 0, brakujacy, nadmiarowi };
  };

  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c`, nie przepisane z pamięci.
  // RÓWNOŚĆ, nie „≥ 1" (O73): „co najmniej jeden konsument" przeszłoby także
  // wtedy, gdy karta pulsu zniknie, a zostanie sam import gdzieś indziej.
  const kaskadaU = EKRANY.filter((p) => /from\s+'[^']*\/livingDiagnosisCascade'/.test(trescEkranu.get(p) ?? ''));
  const rk = rowneZbiory(kaskadaU, [PLIK_KARTA]);
  check('⭐ (I2-0) kaskadę czyta DOKŁADNIE jeden ekran — RÓWNOŚĆ ze stanem z 16.08 (O73)',
    rk.ok,
    `BRAKUJE: ${rk.brakujacy.join(', ') || '—'} · NADMIAROWI: ${rk.nadmiarowi.join(', ') || '—'} `
    + '→ ubył: kaskada nie ma już ANI JEDNEGO miejsca, w którym mogłaby cokolwiek zawodnikowi '
    + 'pokazać, a 13 asercji niżej dalej świeci na zielono; doszedł: sprawdź, czy nowe miejsce '
    + 'nie pyta o segment drugi raz obok bramy świeżości.');

  const posrednikU = EKRANY.filter((p) => /from\s+'[^']*\/livingDiagnosisPulses'/.test(trescEkranu.get(p) ?? ''));
  const rp = rowneZbiory(posrednikU, [PLIK_KARTA]);
  check('⭐ (I2-0) warstwę I/O pulsu czyta DOKŁADNIE ta sama karta, co kaskadę (O73)',
    rp.ok,
    `BRAKUJE: ${rp.brakujacy.join(', ') || '—'} · NADMIAROWI: ${rp.nadmiarowi.join(', ') || '—'} `
    + '→ kaskada i odczyt historii pulsów rozeszły się na dwa różne miejsca: jedno liczy bramę '
    + 'świeżości, drugie zapisuje odpowiedź, i nic ich już ze sobą nie wiąże.');

  // ⭐ ZAPADKA NA „PRODUCENT BEZ KONSUMENTA": sam import nie rysuje niczego.
  // Karta musi być gdzieś ZAMONTOWANA w JSX — inaczej cała kaskada jest
  // kodem, którego zawodnik nie ma jak dotknąć.
  const montujacy = EKRANY.filter((p) => /<\s*LivingDiagnosisPulseCard[\s/>]/.test(trescEkranu.get(p) ?? ''));
  const rm = rowneZbiory(montujacy, [PLIK_DZIS]);
  check('⭐ (I2-0) kartę pulsu montuje DOKŁADNIE `dzis.tsx` — zmierzone 16.08, nie „≥ 1" (O73)',
    rm.ok,
    `MONTUJĄ: ${montujacy.join(', ') || 'ŻADEN EKRAN'} (oczekiwany dokładnie: ${PLIK_DZIS}) `
    + '→ ZERO montaży znaczy, że kaskada jest producentem bez konsumenta: policzona bezbłędnie '
    + 'i nienarysowana nigdzie; dwa montaże znaczą dwa pytania tego samego dnia.');

  // ── ⭐ HAMULEC: ZAMROŻENIE ZMIERZONE, NIE ZAŁOŻONE ──
  // Karta zwraca `null` bezwarunkowo, dopóki flaga jest `false`. To NIE jest
  // defekt — to decyzja Kuby z 06.08.2026. Ale to znaczy, że 13 asercji niżej
  // opisuje dziś KOD MARTWY, i strażnik ma o tym mówić głośno, a nie milczeć.
  // Asercja jest ZAPADKĄ NA ODMROŻENIE: w dniu, w którym ktoś przestawi flagę
  // na `true`, ta linia się zapali i każe przeczytać notę zamrożenia — bo są
  // tam wypisane DWIE rzeczy do naprawy przed włączeniem (karta w fazie 'done'
  // nie znika do restartu appki; pominięcie nie jest nigdzie pamiętane, więc
  // ten sam zawodnik dostaje to samo pytanie przy każdym zimnym starcie).
  check('⭐ (I2-0) puls jest DALEJ ZAMROŻONY (`LIVING_DIAGNOSIS_PULSE_ENABLED = false`) — stan z 16.08',
    /const\s+LIVING_DIAGNOSIS_PULSE_ENABLED\s*=\s*false\s*;/.test(karta),
    'flaga zamrożenia zmieniła wartość albo zniknęła. Jeśli WŁĄCZASZ puls: najpierw napraw dwie '
    + 'rzeczy z noty zamrożenia w components/LivingDiagnosisPulseCard.tsx (karta „Dzięki, zapisano." '
    + 'nie znika do restartu appki; pominięcie nie jest pamiętane, więc zawodnik, który zawsze pomija, '
    + 'dostaje to samo pytanie w nieskończoność), potem popraw tę asercję. Jeśli NIE włączasz — '
    + 'ktoś właśnie odmroził zawodnikowi piąty kanał pytań bez decyzji.');

  // ── Karta nie wybiera segmentu za kaskadę ──
  check('⛔ (I2-0) karta pyta o segment kaskadę (`selectSegmentForLivingDiagnosis`), nie siebie',
    /selectSegmentForLivingDiagnosis\(/.test(karta)
    && !/getRelativeDeficits\(/.test(karta)
    && !/LIVING_DIAGNOSIS_SEGMENT_ORDER\s*\.\s*(filter|sort|find)/.test(karta),
    'na karcie pojawił się drugi wybór segmentu; wtedy kolejność źródeł (cel → deficyt → pozycja → '
    + 'rotacja) i brama świeżości liczą się w dwóch miejscach naraz i rozjeżdżają po cichu — zawodnik '
    + 'dostaje pytanie o segment, o który pytaliśmy w zeszłym tygodniu');

  check('⛔ (I2-0) karta pyta o TERMIN `isPulseDueToday` i nie liczy dni sama',
    /isPulseDueToday\(/.test(karta)
    && !/24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/.test(karta)
    && !/getTime\(\)\s*[-−]/.test(karta),
    'na karcie stanął drugi kalendarz pulsu; wtedy PULSE_INTERVAL_DAYS w module przestaje cokolwiek '
    + 'znaczyć i zawodnik dostaje pytanie częściej (albo rzadziej), niż mówi jedyna reguła, która to opisuje');

  // ⚠️ JEDNO `new Date()` na całą kartę. Dwa wywołania to dwa różne „teraz":
  // o północy brama świeżości i termin pulsu sądzą o INNYCH dniach.
  const ileDat = (karta.match(/new\s+Date\(\s*\)/g) ?? []).length;
  check('⛔ (I2-0) obie funkcje modułu dostają TO SAMO „teraz" — jedno `new Date()` na karcie',
    ileDat === 1
    && /isPulseDueToday\(\s*lastAnyPulseAt\s*,\s*now\s*\)/.test(karta)
    && /selectSegmentForLivingDiagnosis\(\s*context\s*,\s*now\s*\)/.test(karta),
    `liczba \`new Date()\` na karcie: ${ileDat} (ma być 1) — moduł CELOWO przyjmuje \`now\` parametrem `
    + '(testowalność), a karta ma podać jedną i tę samą chwilę do terminu i do bramy świeżości; '
    + 'dwie chwile znaczą, że tuż po północy jedno liczy z wczoraj, drugie z dziś');

  // Kontekst idzie do kaskady W CAŁOŚCI i bez listy wykluczeń (decyzja 4:
  // jedno pytanie na jeden puls — lista wykluczeń jest kształtem z mecz.tsx).
  check('⛔ (I2-0) karta oddaje kaskadzie CAŁY kontekst — nie zawęża go i nie dokłada wykluczeń',
    /selectSegmentForLivingDiagnosis\(\s*context\s*,\s*now\s*\)/.test(karta)
    && !/selectSegmentForLivingDiagnosis\(\s*\{/.test(karta),
    'karta przycina kontekst albo podaje trzeci argument (`excludeSegmentIds`) — kaskada liczy wtedy '
    + 'na innym zbiorze, niż zapisuje warstwa I/O, więc brama świeżości pilnuje czegoś innego, niż '
    + 'zawodnik naprawdę odpowiedział');

  check('⛔ (I2-0) karta bierze kontekst WYŁĄCZNIE z warstwy I/O — nie pyta bazy sama',
    /fetchPlayerLivingDiagnosisContext\(/.test(karta)
    && !/\bsupabase\b/.test(karta)
    && !/living_diagnosis_pulses/.test(karta),
    'karta czyta historię pulsów drugim, własnym zapytaniem — dwa odczyty tej samej rzeczy rozjadą się '
    + 'po cichu i brama świeżości zacznie liczyć z innego zbioru niż ten, do którego karta zapisuje');

  // ── ⛔ POMINIĘCIE NIGDY NIE ZAPISUJE (INTEGRACJA_DIAGNOZA_ZYWA.md, decyzja 4) ──
  // ⚠️ Wycinamy SAM HANDLER, nie cały plik (O71): `saveLivingDiagnosisPulse`
  // stoi w tym pliku legalnie — w `answer()`. „Nigdzie w pliku nie ma zapisu"
  // byłoby nieprawdą już dziś i nie mówiłoby nic o tym, co robi POMINIĘCIE.
  const cialoSkip = (karta.match(/const\s+skip\s*=[^\n]*\n?(?:[^\n]*\n){0,8}/) ?? [''])[0];
  check('⛔ (I2-0) „Zapytaj innym razem" NIE zapisuje nic do bazy (decyzja 4)',
    /const\s+skip\s*=/.test(karta) && !/saveLivingDiagnosisPulse/.test(cialoSkip),
    'pominięcie zaczęło zapisywać wiersz pulsu. Skutek dla zawodnika: brama świeżości (' + FRESHNESS_COOLDOWN_DAYS
    + ' dni) zatrzaskuje się na segmencie, o który zawodnik NIE odpowiedział — przez trzy tygodnie nie '
    + 'usłyszy o nim pytania, a w bazie stoi „odpowiedziano"');

  check('⛔ (I2-0) karta rozróżnia UDANY zapis od nieudanego — czyta `error` z warstwy I/O',
    /saveLivingDiagnosisPulse\(/.test(karta) && /error\s*\?\s*'error'\s*:\s*'done'/.test(karta),
    'karta przestała czytać `error` z zapisu; zawodnik widzi „Dzięki, zapisano.", choć nic nie zostało '
    + 'zapisane, a segment zostaje w kolejce do pytania, jakby nigdy nie odpowiedział');

  // Pytanie MUSI dotyczyć tego segmentu, który wybrała kaskada, a odpowiedź
  // MUSI trafić pod ten sam segment. Rozjazd tych dwóch to najgorszy możliwy
  // defekt tej funkcji: dane w bazie wyglądają poprawnie i są nieprawdziwe.
  check('⛔ (I2-0) pytanie i zapis dotyczą TEGO SAMEGO segmentu, który wybrała kaskada',
    /LIVING_DIAGNOSIS_QUESTION_BANK\[\s*selection\.segmentId\s*\]/.test(karta)
    && /resolveLivingDiagnosisWording\(\s*selection\.segmentId\s*,/.test(karta)
    && /saveLivingDiagnosisPulse\([^)]*pending\.segmentId\s*,/.test(karta),
    'brzmienie pytania albo zapis odpowiedzi odkleiły się od segmentu wybranego przez kaskadę — '
    + 'zawodnik odpowiada na pytanie o jeden obszar, a odpowiedź ląduje pod innym; w bazie nie widać '
    + 'po tym żadnego śladu');

  // ── ⭐ ZAPADKA NA SKASOWANIE ──
  // Bez tej asercji wszystkie powyższe spełnia się przez USUNIĘCIE rysowania
  // pytania. Strażnik nagradzałby wtedy skasowanie funkcji.
  check('⭐ (I2-0) karta NAPRAWDĘ rysuje pytanie i skalę odpowiedzi',
    /\{\s*pending\.t\s*\}/.test(karta)
    && /SCALE\s*\.\s*map\(/.test(karta)
    && /onPress=\{\s*\(\)\s*=>\s*answer\(/.test(karta),
    'zniknęło renderowanie treści pytania albo skali; wszystkie asercje wyżej spełnia też karta, '
    + 'która nie pokazuje zawodnikowi nic');

  check('⭐ (I2-0) warstwa I/O NIE rysuje zdania o błędzie — stan odczytu jedzie wyżej',
    /zbierzStanOdczytu\(/.test(posrednik) && !/<\s*Text/.test(posrednik),
    'w lib/livingDiagnosisPulses.ts pojawił się widok albo zniknął stan odczytu; warstwa bez ekranu '
    + 'nie wie, gdzie postawić zdanie i jakie wyjście z niego prowadzi — odmowa RLS zamieni się wtedy '
    + 'w „nigdy nie pulsowano" i zawodnik dostanie pytanie, na które odpowiadał wczoraj');
}

const NOW = new Date('2026-08-10T12:00:00.000Z');
const OBRONCA = 'Środkowy obrońca'; // tier 'key': percepcja/decyzja/fizycznosc/mental

function scoresWithDeficit(deficitSeg: string) {
  const base: Record<string, number> = {
    moc: 70, wytrzymalosc: 72, fizycznosc: 71, techFund: 69, techSpec: 70,
    tolerancja: 68, regeneracja: 71, odpornosc: 70, odzywianie: 69,
    koncentracja: 70, mental: 71, percepcja: 70, decyzja: 70,
  };
  base[deficitSeg] = 30;
  return base;
}

function daysAgoIso(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

// --- Scenariusz 1: cel = position-critical deficyt w tym samym segmencie
// (powinno wybrać ten segment, źródło 'deficit') — mirror scenariusza 1
// matchCascade.selftest.ts, potwierdza że port kolejności priorytetu
// zadziałał identycznie. ---
{
  const ctx: PlayerLivingDiagnosisContext = {
    profilePosition: OBRONCA,
    latestScores: scoresWithDeficit('percepcja'),
    activeGoalSegmentId: 'percepcja',
    segmentLastPulsedAt: {},
  };
  const result = selectSegmentForLivingDiagnosis(ctx, NOW);
  check(
    'Scenariusz 1: cel = position-critical deficyt w tym samym segmencie',
    !!result && result.segmentId === 'percepcja' && result.selectionSource === 'deficit',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 2: cel RÓŻNY od najgroźniejszego deficytu (powinno wybrać
// deficyt position-critical, NIE cel). ---
{
  const ctx: PlayerLivingDiagnosisContext = {
    profilePosition: OBRONCA,
    latestScores: scoresWithDeficit('fizycznosc'),
    activeGoalSegmentId: 'techSpec',
    segmentLastPulsedAt: {},
  };
  const result = selectSegmentForLivingDiagnosis(ctx, NOW);
  check(
    'Scenariusz 2: cel różny od najgroźniejszego deficytu -> wygrywa deficyt position-critical',
    !!result && result.segmentId === 'fizycznosc' && result.selectionSource === 'deficit',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 3: bez diagnozy i bez celu -> spada do rotacji. ---
{
  const ctx: PlayerLivingDiagnosisContext = {
    profilePosition: null,
    latestScores: null,
    activeGoalSegmentId: null,
    segmentLastPulsedAt: { moc: daysAgoIso(1) }, // wszystko poza 'moc' nigdy pytane
  };
  const result = selectSegmentForLivingDiagnosis(ctx, NOW);
  check(
    'Scenariusz 3: brak diagnozy i celu -> rotacja',
    !!result && result.selectionSource === 'rotation' && result.segmentId !== 'moc',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 4 (NOWY, specyficzny dla diagnozy żywej — brama
// świeżości): aktywny cel WSKAZUJE segment odpytany 5 dni temu (świeży,
// < 21 dni) -> kaskada NIE wraca do tego samego segmentu, mimo że źródło
// 'goal' normalnie by go wybrało; spada do innego, dostępnego segmentu. ---
{
  const ctx: PlayerLivingDiagnosisContext = {
    profilePosition: null,
    latestScores: null,
    activeGoalSegmentId: 'percepcja',
    segmentLastPulsedAt: { percepcja: daysAgoIso(5) },
  };
  const result = selectSegmentForLivingDiagnosis(ctx, NOW);
  check(
    'Scenariusz 4: cel wskazuje świeżo odpytany segment -> pomijany przez bramę świeżości',
    !!result && result.segmentId !== 'percepcja',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 5: ten sam segment odpytany DAWNO (22 dni, powyżej progu
// FRESHNESS_COOLDOWN_DAYS=21) -> brama świeżości już nie blokuje, cel może
// znów wygrać kaskadę. ---
{
  const ctx: PlayerLivingDiagnosisContext = {
    profilePosition: null,
    latestScores: null,
    activeGoalSegmentId: 'percepcja',
    segmentLastPulsedAt: { percepcja: daysAgoIso(22) },
  };
  const result = selectSegmentForLivingDiagnosis(ctx, NOW);
  check(
    `Scenariusz 5: segment odpytany ${'>'}${FRESHNESS_COOLDOWN_DAYS} dni temu -> brama świeżości już nie blokuje`,
    !!result && result.segmentId === 'percepcja' && result.selectionSource === 'goal',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 6: wszystkie 13 segmentów świeże (< 21 dni) -> brak
// dostępnego segmentu, funkcja zwraca null (dziś brak pulsu). ---
{
  const allFresh: Partial<Record<string, string>> = {};
  LIVING_DIAGNOSIS_SEGMENT_ORDER.forEach((id) => { allFresh[id] = daysAgoIso(2); });
  const ctx: PlayerLivingDiagnosisContext = {
    profilePosition: null,
    latestScores: null,
    activeGoalSegmentId: null,
    segmentLastPulsedAt: allFresh,
  };
  const result = selectSegmentForLivingDiagnosis(ctx, NOW);
  check(
    'Scenariusz 6: wszystkie 13 segmentów świeże -> null (brak pulsu dziś)',
    result === null,
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 7: excludeSegmentIds wyklucza segment mimo że inaczej
// wygrałby kaskadę (spójność kształtu z selectSegmentForMatch). ---
{
  const ctx: PlayerLivingDiagnosisContext = {
    profilePosition: OBRONCA,
    latestScores: scoresWithDeficit('percepcja'),
    activeGoalSegmentId: 'percepcja',
    segmentLastPulsedAt: {},
  };
  const result = selectSegmentForLivingDiagnosis(ctx, NOW, ['percepcja']);
  check(
    'Scenariusz 7: excludeSegmentIds wyklucza segment, mimo że wygrałby kaskadę',
    !!result && result.segmentId !== 'percepcja',
    `otrzymano ${JSON.stringify(result)}`
  );
}

console.log('\nisPulseDueToday — czysta funkcja decyzyjna');

check('nigdy nie pulsowano -> należny dziś', isPulseDueToday(null, NOW) === true, 'oczekiwano true');
check(`dokładnie ${PULSE_INTERVAL_DAYS} dni temu -> należny dziś`, isPulseDueToday(daysAgoIso(PULSE_INTERVAL_DAYS), NOW) === true, 'oczekiwano true');
check('1 dzień temu -> jeszcze nie należny', isPulseDueToday(daysAgoIso(1), NOW) === false, 'oczekiwano false');
check(`${PULSE_INTERVAL_DAYS - 1} dni temu -> jeszcze nie należny`, isPulseDueToday(daysAgoIso(PULSE_INTERVAL_DAYS - 1), NOW) === false, 'oczekiwano false');

console.log('\ngetRelativeDeficits — port z lib/matchCascade.ts, sanity check');

check(
  'segment wyraźnie poniżej mediany -> wykryty jako deficyt',
  getRelativeDeficits(scoresWithDeficit('tolerancja')).some(([id]) => id === 'tolerancja'),
  'oczekiwano tolerancja w liście deficytów'
);
check(
  'wszystkie wyniki równe -> brak deficytów',
  getRelativeDeficits(Object.fromEntries(LIVING_DIAGNOSIS_SEGMENT_ORDER.map((id) => [id, 70]))).length === 0,
  'oczekiwano pustej listy'
);

console.log(`\n${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) process.exit(1);
