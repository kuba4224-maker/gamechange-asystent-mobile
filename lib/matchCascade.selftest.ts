// Weryfikacja 5 scenariuszy z Kroku 3 procedury wdrożenia (mecz.tsx) —
// czysta logika, bez Supabase/RN, uruchamiana lokalnie poza appką:
//
//   npx tsx lib/matchCascade.selftest.ts
//
// (jeśli brak `tsx` w projekcie: `npm install --no-save tsx`, potem to
// samo polecenie). Wszystkie 5 scenariuszy przeszło w sesji Cowork z
// 29.07.2026 przy pierwszym uruchomieniu — uruchom ponownie po każdej
// zmianie w matchCascade.ts/positionProfiles.ts/matchQuestionBank.ts.
// PLAN-D-E 12.08.2026 — dopisane `type` przy imporcie typu (znalezisko E-N8).
// `PlayerMatchSelectionContext` to `export type`. Pod `tsx` import bez tego słowa
// przechodzi, bo `tsx` transpiluje; pod wbudowanym strippingiem typów Node 22
// plik wywala się NA STARCIE — czyli runner po cichu przestałby sprawdzać tę
// kaskadę. Dziś nic nie psuje; zepsuje w dniu, w którym projekt zejdzie z `tsx`
// albo ktoś włączy `verbatimModuleSyntax`.
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75) + K3
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — nazwane liczbą, nie odczuciem. Ten plik miał 5 ASERCJI
// i ANI JEDNEJ, która czytałaby jakikolwiek EKRAN. Pięć scenariuszy kaskady
// liczonych na wymyślonych wynikach, zero pytania „czy `mecz.tsx` w ogóle
// tę kaskadę woła i czy rysuje to, co ona wybrała".
//
// ⚠️ K3 POTWIERDZONE, NIE PRZEPISANE. `lib/matchCascade.ts`, ten strażnik
// i `app/(tabs)/mecz.tsx` urodziły się W JEDNYM commicie `db6ea60`
// (04.08.2026), a `db6ea60` jest commitem POCZĄTKOWYM tego repozytorium —
// NIE MA RODZICA. `git log -S` na `selectSegmentForMatch`,
// `fetchPlayerMatchSelectionContext` i `resolveWordingKey` w `mecz.tsx`
// pokazuje TEN JEDEN commit: nie istnieje ani wcześniejszy, ani PÓŹNIEJSZY
// stan repozytorium, w którym ekran tych wywołań nie robił. Dla tych trzech
// wywołań testu historycznego nie da się zrobić — dowodem są mutacje.
//
// ⭐ ALE NIE DLA CAŁEJ SEKCJI. Ekran ma własną, bogatszą historię niż moduł
// (sześć commitów). Asercja o NAZWANIU nieudanego odczytu kontekstu kaskady
// pilnuje rzeczy dołożonej dopiero 15.08 przez pas C3 — i na stanie
// `6732ca7` (14.08) zapala się naprawdę. K3 zamyka drogę historyczną
// wyłącznie tam, gdzie moduł i ekran urodziły się razem; nie zamyka jej dla
// wszystkiego, czego ten ekran nauczył się później.
//
// ⚠️ CZEGO TA SEKCJA NIE UDAJE. Czyta źródło ekranu JAKO TEKST. Nie uruchamia
// Reacta i nie wie, czy ekran się rysuje. Podmiana wywołania na inne, równie
// zepsute, przejdzie tu niezauważona.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (O53): `tsconfig.json` ciągnie DOM, więc `tsc`
// pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { selectSegmentForMatch, type PlayerMatchSelectionContext } from './matchCascade';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ 0. PAS I2 16.08.2026 — EKRAN, KTÓRY ZADAJE PYTANIA MECZOWE (K4 / O75)
// ═══════════════════════════════════════════════════════════════════

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — `mecz.tsx` i `matchSegmentSelection.ts` CYTUJĄ
 * w komentarzach nazwy funkcji i opisy naprawionych defektów („`catch`, który
 * pas C3 dołożył w `mecz.tsx :: loadSegmentSlots`"), więc strażnik czytający
 * surowy tekst przechodziłby na cudzej dokumentacji, a jedynym sposobem, żeby
 * go zapalić, byłoby skasowanie wyjaśnienia.
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

const PLIK_MECZ = 'app/(tabs)/mecz.tsx';
const PLIK_POSREDNIK = 'lib/matchSegmentSelection.ts';
const mecz = bezKomentarzy(surowe(PLIK_MECZ));
const posrednik = bezKomentarzy(surowe(PLIK_POSREDNIK));

{
  console.log('0. EKRAN, KTÓRY ZADAJE PYTANIA MECZOWE (K4 / O75)');

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
  const tresc = new Map<string, string>(
    EKRANY.map((p) => [p, bezKomentarzy(readFileSync(join(root, p), 'utf8'))]));

  const rowneZbiory = (zmierzone: string[], oczekiwane: string[]) => {
    const brakujacy = oczekiwane.filter((p) => !zmierzone.includes(p));
    const nadmiarowi = zmierzone.filter((p) => !oczekiwane.includes(p));
    return { ok: brakujacy.length === 0 && nadmiarowi.length === 0, brakujacy, nadmiarowi };
  };

  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c`, nie przepisane z pamięci.
  // RÓWNOŚĆ, nie „≥ 1" (O73): „co najmniej jeden konsument" przeszłoby także
  // wtedy, gdy tryb Mecz przestanie zadawać pytania segmentowe, a import
  // zostanie w jakimś innym pliku.
  const kaskadaU = EKRANY.filter((p) => /from\s+'[^']*\/matchCascade'/.test(tresc.get(p) ?? ''));
  const rk = rowneZbiory(kaskadaU, [PLIK_MECZ]);
  check('⭐ (I2-0) kaskadę meczową czyta DOKŁADNIE `mecz.tsx` — RÓWNOŚĆ ze stanem z 16.08 (O73)',
    rk.ok,
    `BRAKUJE: ${rk.brakujacy.join(', ') || '—'} · NADMIAROWI: ${rk.nadmiarowi.join(', ') || '—'} `
    + '→ ubył: kaskada nie ma już gdzie zadać ani jednego pytania, a pięć scenariuszy niżej dalej '
    + 'świeci na zielono; doszedł: sprawdź, czy nowe miejsce nie pyta o segment, o który mecz już pytał.');

  const posrednikU = EKRANY.filter((p) => /from\s+'[^']*\/matchSegmentSelection'/.test(tresc.get(p) ?? ''));
  const rp = rowneZbiory(posrednikU, [PLIK_MECZ]);
  check('⭐ (I2-0) kontekst kaskady pobiera DOKŁADNIE ten sam ekran, co ją woła (O73)',
    rp.ok,
    `BRAKUJE: ${rp.brakujacy.join(', ') || '—'} · NADMIAROWI: ${rp.nadmiarowi.join(', ') || '—'} `
    + '→ kaskada i jej wejście rozeszły się na dwa miejsca: jedno liczy priorytet, drugie czyta historię '
    + 'pytań, i nic ich już ze sobą nie wiąże.');

  // ── Ekran nie wybiera segmentu za kaskadę ──
  check('⛔ (I2-0) `mecz.tsx` pyta o segment kaskadę, a nie liczy priorytetu sam',
    /selectSegmentForMatch\(/.test(mecz)
    && !/getRelativeDeficits\(/.test(mecz)
    && !/getPositionCriticalSegments\(/.test(mecz),
    'na ekranie stanął drugi rachunek priorytetu; kolejność źródeł (deficyt pozycyjny → cel → największy '
    + 'deficyt → pozycja → rotacja) ma DOKŁADNIE jedno miejsce, a dwa rozjeżdżają się po cichu i zawodnik '
    + 'dostaje po meczu pytanie o coś, co u niego akurat jest mocne');

  check('⛔ (I2-0) `mecz.tsx` bierze kontekst WYŁĄCZNIE z warstwy I/O — nie czyta wejść kaskady sam',
    /fetchPlayerMatchSelectionContext\(/.test(mecz)
    && !/\.from\('diagnostics'\)/.test(mecz)
    && !/\.from\('goals'\)/.test(mecz)
    && !/\.from\('match_context_answers'\)\s*\.\s*select\(/.test(mecz),
    'ekran zaczął czytać wejścia kaskady drugim, własnym zapytaniem — wtedy „o co już pytaliśmy" liczy się '
    + 'z innego zbioru niż ten, którym kaskada się kieruje, i zawodnik dostaje to samo pytanie drugi raz');

  // ── ⛔ STAN REGENERACJI DOCIERA DO KASKADY ──
  // `regeneracja` jest dostępna do pogłębienia TYLKO przy `entered_fatigued`
  // (matchCascade.ts, isAvailable). Ekran ma podać ten stan; podanie `null`
  // albo policzenie slotów przed odpowiedzią o regenerację cicho wyłącza
  // całą gałąź.
  check('⛔ (I2-0) stan regeneracji dociera do kaskady — sloty liczone PO odpowiedzi o regenerację',
    /fetchPlayerMatchSelectionContext\(\s*currentUser\.id\s*,\s*recoveryState\s*\)/.test(mecz)
    && /loadSegmentSlots\(\s*value\s*\)/.test(mecz),
    'ekran przestał podawać `entered_recovery_state` do warstwy I/O albo liczy sloty, zanim zawodnik '
    + 'odpowie o regenerację — wtedy zawodnik, który wszedł w mecz zmęczony, NIGDY nie dostanie pytania '
    + 'pogłębiającego o regenerację, bo kaskada uzna ją za niedostępną');

  // ── ⛔ DRUGIE I TRZECIE PYTANIE WYKLUCZAJĄ POPRZEDNIE ──
  // ⚠️ ASERCJA CZYTA KONKRETNE WYWOŁANIE, NIE CAŁY PLIK (O71). Pierwsza wersja
  // tej pary sprawdzała „gdzieś w pliku stoi `selectSegmentForMatch(ctx, exclude)`"
  // — i mutacja zdejmująca wykluczenie z DRUGIEGO pytania przeszła na zielono,
  // bo warunek spełniało wywołanie TRZECIEGO. Mutacja była wynikiem, nie porażką:
  // dziura była w strażniku, nie w ekranie. Teraz każde wywołanie ma własną asercję.
  check('⛔ (I2-0) drugie pytanie wyklucza pierwsze — `second` woła kaskadę z `exclude`',
    /const\s+exclude\s*=\s*first\s*\?\s*\[first\.segmentId\]/.test(mecz)
    && /const\s+second\s*=\s*selectSegmentForMatch\(\s*ctx\s*,\s*exclude\s*\)/.test(mecz),
    'ekran woła kaskadę drugi raz bez listy wykluczeń; kaskada jest CZYSTA, więc na tym samym kontekście '
    + 'zwróci ten sam segment — zawodnik dostaje po meczu dwa razy pod rząd to samo pytanie');

  check('⛔ (I2-0) trzecie pytanie wyklucza WSZYSTKIE już zadane, nie tylko pierwsze',
    /const\s+exclude\s*=\s*segmentSlots\.map\(\s*\(s\)\s*=>\s*s\.segmentId\s*\)/.test(mecz)
    && /const\s+third\s*=\s*selectSegmentForMatch\(\s*ctx\s*,\s*exclude\s*\)/.test(mecz),
    'trzecie pytanie liczone bez pełnej listy zadanych — zawodnik, który sam poprosił o kolejne pytanie, '
    + 'dostaje powtórkę jednego z dwóch poprzednich');

  // ── ⛔ NIEUDANY ODCZYT KONTEKSTU MA BYĆ NAZWANY (pas C3, 15.08.2026) ──
  // ⭐ TO JEST ASERCJA Z TESTEM HISTORYCZNYM: na stanie `6732ca7` (14.08)
  // `loadThirdQuestion` NIE MIAŁA `try` w ogóle, a `loadSegmentSlots` łykała
  // błąd bez śladu. Zawodnik klikał „zadaj kolejne pytanie" i nic się nie
  // działo — i nikt nie miał jak się dowiedzieć, że coś padło.
  check('⛔ (I2-0) nieudany odczyt kontekstu kaskady jest NAZWANY w OBU miejscach, nie zjadany',
    /opisBleduOdczytuDoLogu\('mecz\.loadSegmentSlots → kontekst kaskady'/.test(mecz)
    && /opisBleduOdczytuDoLogu\('mecz\.loadThirdQuestion → kontekst kaskady'/.test(mecz),
    'wróciło ciche zjadanie błędu odczytu: „kaskada nie miała czego wybrać" wygląda wtedy dokładnie tak samo '
    + 'jak „nie udało się przeczytać". Formularz meczu jest krótszy, walidacja „minimum jeden sygnał" liczy '
    + 'z pustej listy, a zawodnik klika w przycisk, po którym nic się nie dzieje');

  // ── ⛔ EKRAN NIE PRZESTAWIA WYNIKU KASKADY ──
  check('⛔ (I2-0) ekran nie sortuje, nie filtruje i nie tnie slotów wybranych przez kaskadę',
    !/segmentSlots\s*\.\s*(sort|filter|slice|reverse)\s*\(/.test(mecz),
    'ekran zaczął przestawiać albo obcinać pytania wybrane przez kaskadę — kolejność pytań przestaje '
    + 'odpowiadać priorytetowi, który kaskada policzyła, i nikt nie widzi, że rozstrzyga o niej ktoś inny');

  // ── ⛔ BRZMIENIE PYTANIA I ZAPIS ODPOWIEDZI ──
  check('⛔ (I2-0) wariant pozycyjny brzmienia liczy moduł (`resolveWordingKey`), nie ekran',
    /resolveWordingKey\(\s*positionPlayedToday\s*\|\|\s*null\s*,\s*ctx\.profilePosition\s*\)/.test(mecz),
    'ekran zaczął sam wybierać wariant brzmienia; reguła jest jedna (dzisiejsza pozycja, a gdy jej nie ma — '
    + 'profilowa) i zawodnik grający dziś inaczej niż zwykle dostaje pytanie sformułowane nie o jego rolę');

  check('⛔ (I2-0) pytanie rysowane z banku pod segment WYBRANY przez kaskadę',
    /MATCH_QUESTION_BANK\[\s*slot\.segmentId\s*\]/.test(mecz),
    'brzmienie pytania odkleiło się od segmentu wybranego przez kaskadę — zawodnik odpowiada na pytanie '
    + 'o jeden obszar, a odpowiedź zapisuje się pod innym; w bazie nie zostaje po tym żaden ślad');

  check('⛔ (I2-0) do bazy idzie ŹRÓDŁO WYBORU policzone przez kaskadę, nie wpisane na ekranie',
    /selection_source:\s*slot\.selectionSource/.test(mecz)
    && !/selection_source:\s*['"]/.test(mecz),
    'ekran wpisuje `selection_source` z palca; wtedy `match_context_answers` przestaje mówić, DLACZEGO '
    + 'zapytaliśmy — a to jedyne pole, z którego da się później sprawdzić, czy kaskada wybierała sensownie');

  // ── ⭐ ZAPADKA NA SKASOWANIE ──
  // Bez tej asercji wszystkie powyższe spełnia się przez USUNIĘCIE rysowania
  // pytań segmentowych. Strażnik nagradzałby wtedy skasowanie funkcji.
  check('⭐ (I2-0) `mecz.tsx` NAPRAWDĘ rysuje pytania segmentowe wybrane przez kaskadę',
    /segmentSlots\.map\(\s*renderSegmentSlot\s*\)/.test(mecz)
    && /function\s+renderSegmentSlot\(/.test(mecz),
    'zniknęło renderowanie pytań segmentowych; wszystkie asercje wyżej spełnia też ekran, na którym '
    + 'kaskada liczy się bezbłędnie i nikt jej wyniku nie widzi');

  check('⭐ (I2-0) warstwa I/O NIE rysuje zdania o błędzie — stan odczytu jedzie wyżej, do ekranu',
    /zbierzStanOdczytu\(/.test(posrednik) && !/<\s*Text/.test(posrednik),
    'w lib/matchSegmentSelection.ts pojawił się widok albo zniknął stan odczytu; odmowa RLS zamieni się '
    + 'wtedy z powrotem w „o tym segmencie nigdy nie pytaliśmy" i kaskada zapyta o to samo drugi raz');
}

// Środkowy obrońca: tier 'key' dla percepcja/decyzja/fizycznosc/mental.
const OBRONCA = 'Środkowy obrońca';

function scoresWithDeficit(deficitSeg: string) {
  // 13 segmentów, wszystkie ~70, jeden segment wyraźnie niżej (deficyt
  // statystyczny: mediana ~70, ten segment np. 30 -> spełnia oba warunki).
  const base: Record<string, number> = {
    moc: 70, wytrzymalosc: 72, fizycznosc: 71, techFund: 69, techSpec: 70,
    tolerancja: 68, regeneracja: 71, odpornosc: 70, odzywianie: 69,
    koncentracja: 70, mental: 71, percepcja: 70, decyzja: 70,
  };
  base[deficitSeg] = 30;
  return base;
}

// --- Scenariusz 1: cel = position-critical deficyt w TYM SAMYM segmencie
// (powinno wybrać ten segment, źródło 'deficit' -- sprawdza że kolejność
// priorytetu działa, nie tylko że coś się wybiera). ---
{
  const ctx: PlayerMatchSelectionContext = {
    profilePosition: OBRONCA,
    latestScores: scoresWithDeficit('percepcja'), // percepcja = tier 'key' dla obrońcy środkowego
    activeGoalSegmentId: 'percepcja',
    segmentLastAskedAt: {},
    enteredRecoveryState: 'entered_fresh',
  };
  const result = selectSegmentForMatch(ctx);
  check(
    'Scenariusz 1: cel = position-critical deficyt w tym samym segmencie',
    !!result && result.segmentId === 'percepcja' && result.selectionSource === 'deficit',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 2: cel RÓŻNY od najgroźniejszego deficytu (powinno wybrać
// deficyt position-critical, NIE cel). ---
{
  const ctx: PlayerMatchSelectionContext = {
    profilePosition: OBRONCA,
    latestScores: scoresWithDeficit('fizycznosc'), // fizycznosc też tier 'key' dla obrońcy
    activeGoalSegmentId: 'techSpec', // cel zupełnie inny, nie jest deficytem ani position-critical
    segmentLastAskedAt: {},
    enteredRecoveryState: 'entered_fresh',
  };
  const result = selectSegmentForMatch(ctx);
  check(
    'Scenariusz 2: cel różny od najgroźniejszego deficytu -> wygrywa deficyt position-critical',
    !!result && result.segmentId === 'fizycznosc' && result.selectionSource === 'deficit',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 3: bez diagnozy i bez celu -> spada do rotacji. ---
{
  const ctx: PlayerMatchSelectionContext = {
    profilePosition: null,
    latestScores: null,
    activeGoalSegmentId: null,
    segmentLastAskedAt: { moc: '2026-07-01T00:00:00Z' }, // wszystko poza 'moc' nigdy nie pytane
    enteredRecoveryState: 'uncertain',
  };
  const result = selectSegmentForMatch(ctx);
  check(
    'Scenariusz 3: brak diagnozy i celu -> rotacja',
    !!result && result.selectionSource === 'rotation' && result.segmentId !== 'moc',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 4: entered_recovery_state='entered_fresh' + regeneracja
// byłaby priorytetem -> powinno pominąć regenerację. ---
{
  // Bramkarz ma regeneracja='important' (nie 'key'), więc żeby regeneracja
  // w ogóle mogła być "priorytetem", trzeba by ją sztucznie postawić przez
  // rotację (bo source 1/4 wymaga tier 'key', a regeneracja nigdzie nie ma
  // tier 'key'). Test więc sprawdza to poprzez rotację: regeneracja
  // najdawniej pytana, ale entered_fresh -> powinna być pominięta mimo że
  // rotacja normalnie by ją wybrała.
  const ctx: PlayerMatchSelectionContext = {
    profilePosition: null,
    latestScores: null,
    activeGoalSegmentId: null,
    segmentLastAskedAt: {
      moc: '2026-07-20T00:00:00Z', wytrzymalosc: '2026-07-20T00:00:00Z',
      fizycznosc: '2026-07-20T00:00:00Z', techFund: '2026-07-20T00:00:00Z',
      techSpec: '2026-07-20T00:00:00Z', tolerancja: '2026-07-20T00:00:00Z',
      odpornosc: '2026-07-20T00:00:00Z', odzywianie: '2026-07-20T00:00:00Z',
      koncentracja: '2026-07-20T00:00:00Z', mental: '2026-07-20T00:00:00Z',
      percepcja: '2026-07-20T00:00:00Z', decyzja: '2026-07-20T00:00:00Z',
      // regeneracja celowo BEZ wpisu = "nigdy pytane" = najdawniej z wszystkich
    },
    enteredRecoveryState: 'entered_fresh',
  };
  const result = selectSegmentForMatch(ctx);
  check(
    'Scenariusz 4: entered_fresh -> regeneracja pominięta mimo że rotacja by ją wybrała',
    !!result && result.segmentId !== 'regeneracja',
    `otrzymano ${JSON.stringify(result)}`
  );
}

// --- Scenariusz 5: drugie pytanie w tym samym meczu -> wyklucza segment
// już wybrany jako pierwsze. ---
{
  const ctx: PlayerMatchSelectionContext = {
    profilePosition: OBRONCA,
    latestScores: { ...scoresWithDeficit('percepcja'), decyzja: 30 }, // dwa deficyty position-critical
    activeGoalSegmentId: null,
    segmentLastAskedAt: {},
    enteredRecoveryState: 'entered_fresh',
  };
  const first = selectSegmentForMatch(ctx);
  const second = selectSegmentForMatch(ctx, first ? [first.segmentId] : []);
  check(
    'Scenariusz 5: drugie pytanie wyklucza pierwsze',
    !!first && !!second && first.segmentId !== second.segmentId,
    `pierwsze=${JSON.stringify(first)} drugie=${JSON.stringify(second)}`
  );
}

console.log(`\n${passed} zaliczone, ${failed} nieudane`);
if (failed > 0) process.exit(1);
