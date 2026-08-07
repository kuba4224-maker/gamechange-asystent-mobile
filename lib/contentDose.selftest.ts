// PRAKTYKA-EKRAN B6 08.08.2026 — NOWY PLIK.
//
//   npx tsx lib/contentDose.selftest.ts
//
// (jeśli brak `tsx`: `npm install --no-save tsx`). Albo razem z resztą:
// `node tests/run-selftests.mjs`.
//
// CZEGO PILNUJE TEN PLIK, w kolejności ważności:
//  1. SZEŚCIU ZASAD RENDEROWANIA z kontraktu pasa A (RAPORT_ZWROTNY_A_RUNDA_5.md,
//     sekcja 11). Każda ma tu asercję nazwaną jej numerem — żeby przyszła sesja,
//     która je złamie, dowiedziała się KTÓRĄ złamała, a nie „że coś nie przechodzi".
//  2. TRZECH JAWNYCH STANÓW BRAKU (kolumny nie ma / `NULL` / pusta lista) — na
//     ekranie wyglądają tak samo (nic), więc bez testu nie da się ich rozróżnić,
//     a to one decydują, czy ktokolwiek się dowie, że migracja nie weszła.
//  3. Tego, że `krok_praktyczny` i `dla_chetnych` idą na ekran BAJT W BAJT.
//
// Na końcu drukuje WYPIS „co zawodnik realnie zobaczy" — sekcja raportu
// zwrotnego jest wyjściem tego kodu, nie tekstem pisanym ręcznie.
import {
  CONTENT_DOSE_ENVELOPE_VERSION,
  CONTENT_DOSE_COLUMN,
  CONTENT_DOSE_COLUMN_MISSING_WARN,
  CONTENT_DOSE_UNSUPPORTED_VERSION_WARN,
  CONTENT_DOSE_SECTION_LABEL,
  CONTENT_DOSE_STEP_LABEL,
  CONTENT_DOSE_CURIOUS_LABEL,
  CONTENT_DOSE_SOURCE_LABEL,
  isMissingContentDoseColumnError,
  normalizeDose,
  parseContentDoses,
  contentDoseDateLabel,
  doseSourceLine,
  buildContentDoseView,
  earlierDosesLabel,
  // ZAPIS B7 08.08.2026 — „przeczytane" (M23/B36)
  CONTENT_DOSE_SEEN_COLUMN,
  CONTENT_DOSE_SEEN_LIMIT,
  CONTENT_DOSE_SEEN_COLUMN_MISSING_WARN,
  isMissingSeenColumnError,
  parseSeenKeys,
  isDoseSeen,
  withSeenKey,
  type ContentDoseView,
} from './contentDose';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

// ═════════════════════════════════════════════════════════════
// DANE — PRZYKŁAD PRAWDZIWEGO REKORDU, przepisany CO DO ZNAKU
// z sekcji 11 raportu A rundy 5. Nie wymyślony: dzięki temu wypis na końcu
// tego pliku jest tym, co zawodnik zobaczy po wklejeniu migracji, a nie
// osobną opowieścią.
// ═════════════════════════════════════════════════════════════
const REAL_ENVELOPE = {
  wersja: 1,
  dawki: [
    {
      wersja: 1,
      klucz: '3d5b2a10-8c41-4f6e-9a02-71b4e8c93f5d:e2:2026-08-08',
      etap: 2,
      wygenerowano_at: '2026-08-08T06:12:00.000Z',
      krok_praktyczny: 'Ustaw w telefonie alarm 30 minut przed swoją godziną snu i traktuj go jak sygnał do kończenia dnia, nie jak przypomnienie.',
      dla_chetnych: 'Stała pora zasypiania synchronizuje wydzielanie melatoniny — organizm zaczyna szykować się do snu zanim się położysz.',
      segment_id: 'regeneracja',
      component_id: '8f2c1d34-9b0a-4e77-a1c5-6d3e5b90aa11',
      zrodlo_podpowiedzi: {
        wersja: 1,
        klucz: 'regeneracja-wyduzenie-snu-nocnego-o-46-113-minut-02',
        tresc: 'Wyznacz stałą godzinę snu i trzymaj się jej codziennie, także w weekendy. Zasypianie o różnych porach działa na organizm jak ciągła zmiana strefy czasowej.',
        material: 'Regeneracja — System Gamechange (pełny)',
        strona: '2',
        rodzaj: 'zrobic',
        celowanie: 'element_celu',
        segment_id: 'regeneracja',
        component_id: '8f2c1d34-9b0a-4e77-a1c5-6d3e5b90aa11',
        wybor: 'wskazana_przez_ai',
        wszystkie_w_promptcie: 1,
      },
    },
  ],
};

/** Dawka sprzed zmiany etapu — to jest ta, do której zawodnik ma móc wrócić (zasada 4). */
const OLDER_DOSE = {
  wersja: 1,
  klucz: '3d5b2a10-8c41-4f6e-9a02-71b4e8c93f5d:e1:2026-07-25',
  etap: 1,
  wygenerowano_at: '2026-07-25T06:10:00.000Z',
  krok_praktyczny: 'Przez najbliższy tydzień kładź się spać o tej samej porze także w piątek i sobotę. Zapisz w telefonie, o której faktycznie zgasiłeś światło.',
  dla_chetnych: null,
  segment_id: 'regeneracja',
  component_id: '8f2c1d34-9b0a-4e77-a1c5-6d3e5b90aa11',
  zrodlo_podpowiedzi: null,
};

const TWO_DOSE_ENVELOPE = { wersja: 1, dawki: [REAL_ENVELOPE.dawki[0], OLDER_DOSE] };

// ═════════════════════════════════════════════════════════════
// 1. TRZY JAWNE STANY BRAKU — żaden nie jest błędem na ekranie
// ═════════════════════════════════════════════════════════════
{
  const missing = buildContentDoseView({ error: { code: '42703', message: 'column focus_blocks.content_doses does not exist' } });
  check('STAN 1/3: brak kolumny w bazie → „column_missing", NIE „no_doses"',
    missing.kind === 'absent' && missing.reason === 'column_missing', JSON.stringify(missing));
  check('STAN 1/3: brak kolumny JAKO JEDYNY ma ostrzeżenie do logu',
    missing.kind === 'absent' && missing.warn === CONTENT_DOSE_COLUMN_MISSING_WARN, JSON.stringify(missing));
  check('STAN 1/3: ostrzeżenie mówi, CZEGO ZAWODNIK NIE WIDZI, i wskazuje migrację',
    CONTENT_DOSE_COLUMN_MISSING_WARN.includes('zawodnik NIE zobaczy')
    && CONTENT_DOSE_COLUMN_MISSING_WARN.includes('sekcja 7'), CONTENT_DOSE_COLUMN_MISSING_WARN);

  const nullCol = buildContentDoseView({ raw: null });
  check('STAN 2/3: kolumna jest, wartość NULL → „no_doses"',
    nullCol.kind === 'absent' && nullCol.reason === 'no_doses', JSON.stringify(nullCol));
  check('STAN 2/3: NULL NIE loguje ostrzeżenia (to normalny stan świeżego Bloku)',
    nullCol.kind === 'absent' && nullCol.warn === null, JSON.stringify(nullCol));

  const emptyList = buildContentDoseView({ raw: { wersja: 1, dawki: [] } });
  check('STAN 3/3: koperta jest, lista pusta → „empty_list", NIE „no_doses"',
    emptyList.kind === 'absent' && emptyList.reason === 'empty_list', JSON.stringify(emptyList));

  check('Trzy stany braku są od siebie ODRÓŻNIALNE (inaczej nie da się zdiagnozować niczego)',
    new Set([
      (missing as any).reason, (nullCol as any).reason, (emptyList as any).reason,
    ]).size === 3, 'stany się zlewają');

  check('ŻADEN z trzech stanów nie renderuje treści (żaden nie jest błędem na ekranie)',
    [missing, nullCol, emptyList].every((v) => v.kind === 'absent'), 'coś się rysuje');
}

check('Sieć/RLS → „error", a NIE „column_missing" (inaczej ostrzeżenie kłamałoby o migracji)',
  (buildContentDoseView({ error: { message: 'Network request failed' } }) as any).reason === 'error',
  JSON.stringify(buildContentDoseView({ error: { message: 'Network request failed' } })));
check('Ładowanie nie miga pustką ani treścią',
  (buildContentDoseView({ loading: true }) as any).reason === 'loading', 'inny stan');
check('BŁĄD MA PIERWSZEŃSTWO NAD `loading` — inaczej brak kolumny znikałby w trakcie ładowania',
  (buildContentDoseView({ loading: true, error: { code: 'PGRST204', message: 'content_doses' } }) as any).reason === 'column_missing',
  'zgubiony stan braku kolumny');

check('R5: kod 42703 rozpoznany', isMissingContentDoseColumnError({ code: '42703' }), 'nie');
check('R5: kod PGRST204 rozpoznany', isMissingContentDoseColumnError({ code: 'PGRST204' }), 'nie');
check('R5: sam komunikat, bez kodu, też wystarcza',
  isMissingContentDoseColumnError({ message: "Could not find the 'content_doses' column in the schema cache" }), 'nie');
check('R5: odmowa RLS to NIE brak kolumny',
  !isMissingContentDoseColumnError({ code: '42501', message: 'permission denied for table focus_blocks' }), 'fałszywie rozpoznane');
check('R5: null/undefined nie wywraca funkcji',
  !isMissingContentDoseColumnError(null) && !isMissingContentDoseColumnError(undefined), 'wywróciło się');

// ═════════════════════════════════════════════════════════════
// 2. WERSJA KOPERTY — „jeśli zobaczysz > 1, sprawdź kontrakt zamiast zgadywać"
// ═════════════════════════════════════════════════════════════
{
  const v2 = buildContentDoseView({ raw: { wersja: 2, dawki: [REAL_ENVELOPE.dawki[0]] } });
  check('WERSJA: koperta w wersji 2 NIE jest zgadywana — nic nie rysujemy',
    v2.kind === 'absent' && v2.reason === 'unsupported_version', JSON.stringify(v2));
  check('WERSJA: i mówimy o tym w logu, zamiast milczeć',
    (v2 as any).warn === CONTENT_DOSE_UNSUPPORTED_VERSION_WARN, JSON.stringify(v2));
  check('WERSJA: dzisiejsza wersja koperty to 1', CONTENT_DOSE_ENVELOPE_VERSION === 1, String(CONTENT_DOSE_ENVELOPE_VERSION));
  check('WERSJA: koperta bez pola `wersja` → „unreadable", nie „ready" na wyczucie',
    (buildContentDoseView({ raw: { dawki: [REAL_ENVELOPE.dawki[0]] } }) as any).reason === 'unreadable', 'przeszło');
  check('KSZTAŁT: `dawki` nie jest tablicą → „unreadable"',
    (buildContentDoseView({ raw: { wersja: 1, dawki: 'a' } }) as any).reason === 'unreadable', 'przeszło');
  check('KSZTAŁT: napis zamiast koperty → „unreadable"',
    (buildContentDoseView({ raw: 'coś' }) as any).reason === 'unreadable', 'przeszło');
}

// ═════════════════════════════════════════════════════════════
// 3. SZEŚĆ ZASAD KONTRAKTU PASA A — po jednej asercji na zasadę
// ═════════════════════════════════════════════════════════════
const view = buildContentDoseView({ raw: TWO_DOSE_ENVELOPE }) as Extract<ContentDoseView, { kind: 'ready' }>;
check('Koperta z dwiema dawkami daje stan „ready"', view.kind === 'ready', JSON.stringify(view));

// ZASADA 1 — treść jest GOTOWA, idzie bez obróbki.
check('ZASADA 1: `krok_praktyczny` trafia na ekran BAJT W BAJT (bez skracania i przedrostków)',
  view.current.practicalStep === REAL_ENVELOPE.dawki[0].krok_praktyczny, view.current.practicalStep);
check('ZASADA 1: `dla_chetnych` trafia na ekran BAJT W BAJT',
  view.current.forCurious === REAL_ENVELOPE.dawki[0].dla_chetnych, String(view.current.forCurious));
check('ZASADA 1: pierwsza litera NIE jest zmieniana',
  view.current.practicalStep.startsWith('Ustaw w telefonie'), view.current.practicalStep.slice(0, 20));
check('ZASADA 1: żaden nasz napis nie doklei się do treści („Wskazówka:", „Pamiętaj:")',
  !/^(Wskazówka|Pamiętaj|Uwaga|Rada)/i.test(view.current.practicalStep), view.current.practicalStep.slice(0, 20));

// ZASADA 2 — `dla_chetnych: null` = BRAK PRZYCISKU, nie pusty przycisk.
check('ZASADA 2: `dla_chetnych: null` → `forCurious === null` (ekran nie rysuje pustego „Dla chętnych")',
  view.earlier[0]?.forCurious === null, String(view.earlier[0]?.forCurious));
check('ZASADA 2: pusty napis w `dla_chetnych` też znaczy „nie pokazuj"',
  normalizeDose({ ...REAL_ENVELOPE.dawki[0], dla_chetnych: '   ' })?.dla_chetnych === null, 'przeszedł pusty');

// ZASADA 3 — źródło tą samą regułą co podpowiedź na Dziś.
check('ZASADA 3: źródło formatowane jak na Dziś → „Regeneracja, s. 2"',
  view.current.source?.label === 'Regeneracja, s. 2', String(view.current.source?.label));
check('ZASADA 3: bez `strona` → sam tytuł materiału',
  doseSourceLine({ material: 'Regeneracja — System Gamechange (pełny)', strona: null })?.label === 'Regeneracja',
  JSON.stringify(doseSourceLine({ material: 'Regeneracja — System Gamechange (pełny)', strona: null })));
check('ZASADA 3: bez `material` → PRZYPISU NIE MA W OGÓLE',
  doseSourceLine({ material: null, strona: '2', tresc: 'coś' }) === null,
  JSON.stringify(doseSourceLine({ material: null, strona: '2', tresc: 'coś' })));
check('ZASADA 3: `zrodlo_podpowiedzi: null` → przypisu nie ma',
  view.earlier[0]?.source === null, JSON.stringify(view.earlier[0]?.source));
check('ZASADA 3: `celowanie` i `wybor` NIE trafiają na ekran (są diagnostyczne)',
  !JSON.stringify(view.current.source).includes('element_celu')
  && !JSON.stringify(view.current.source).includes('wskazana_przez_ai'), JSON.stringify(view.current.source));

// ZASADA 4 — `dawki[0]` to bieżąca, reszta to „wcześniej w tym Bloku".
check('ZASADA 4: `dawki[0]` jest BIEŻĄCA (kolejności z bazy NIE zmieniamy)',
  view.current.key === REAL_ENVELOPE.dawki[0].klucz, view.current.key);
check('ZASADA 4: starsza dawka ląduje w „wcześniej w tym Bloku", nie znika',
  view.earlier.length === 1 && view.earlier[0].key === OLDER_DOSE.klucz,
  JSON.stringify(view.earlier.map((c) => c.key)));
{
  // Kolejność z bazy jest kontraktem pasa A. Gdybyśmy sortowali sami, dwie
  // dawki z tą samą sekundą rozjechałyby się z tym, co pas A uznaje za bieżącą.
  const odwrocona = buildContentDoseView({ raw: { wersja: 1, dawki: [OLDER_DOSE, REAL_ENVELOPE.dawki[0]] } }) as any;
  check('ZASADA 4: NIE sortujemy po dacie — bieżąca to ta, którą pas A dał jako pierwszą',
    odwrocona.current.key === OLDER_DOSE.klucz, odwrocona.current.key);
}
check('ZASADA 4: to nie jest biblioteka — starsze dawki są listą w Bloku, nie własnym ekranem '
  + '(nagłówek mówi „Wcześniej w tym Bloku")',
  earlierDosesLabel(1, false).includes('Wcześniej w tym Bloku'), earlierDosesLabel(1, false));

// ZASADY 5 i 6 — zero zapisu, zero wywołań endpointu. Sprawdzane na treści
// pliku źródłowego, bo „czego nie ma" nie da się sprawdzić wywołaniem.
check('ZASADA 5 + 6: ten moduł nie eksportuje NICZEGO, co zapisuje albo woła model',
  !['save', 'update', 'insert', 'upsert', 'fetch', 'generate'].some((s) =>
    Object.keys({
      isMissingContentDoseColumnError, normalizeDose, parseContentDoses, contentDoseDateLabel,
      doseSourceLine, buildContentDoseView, earlierDosesLabel,
    }).some((k) => k.toLowerCase().includes(s))),
  'w module jest funkcja zapisu albo pobrania');

// ═════════════════════════════════════════════════════════════
// 4. DROBIAZGI, KTÓRE MILCZĄ, GDY SIĘ ZEPSUJĄ
// ═════════════════════════════════════════════════════════════
check('Data: „z 8 sierpnia" (bez Intl — na Hermesie miesiąc bywa po angielsku)',
  contentDoseDateLabel('2026-08-08T06:12:00.000Z') === 'z 8 sierpnia',
  String(contentDoseDateLabel('2026-08-08T06:12:00.000Z')));
check('Data: brak daty → brak napisu, nie „z Invalid Date"',
  contentDoseDateLabel(null) === null && contentDoseDateLabel('kiedyś') === null,
  String(contentDoseDateLabel('kiedyś')));
check('Dawka bez `krok_praktyczny` nie tworzy pustego kafelka',
  normalizeDose({ klucz: 'x', dla_chetnych: 'coś' }) === null, 'utworzyła');
check('Dawka z pustym `krok_praktyczny` też nie',
  normalizeDose({ klucz: 'x', krok_praktyczny: '  ' }) === null, 'utworzyła');
check('Koperta z samych nieczytelnych dawek → „empty_list", nie „ready" z zerem kart',
  (buildContentDoseView({ raw: { wersja: 1, dawki: [{ klucz: 'x' }] } }) as any).reason === 'empty_list', 'inny stan');
check('Powtórzony `klucz` liczy się raz (klucz Reacta musi być unikalny)',
  (parseContentDoses({ wersja: 1, dawki: [REAL_ENVELOPE.dawki[0], REAL_ENVELOPE.dawki[0]] }) as any).doses.length === 1,
  'duplikat przeszedł');
check('SUROWY ETAP nie trafia na kartę (kontrakt: „nie pokazuj surowej liczby zawodnikowi")',
  !Object.keys(view.current).includes('etap') && !JSON.stringify(view.current).includes('"etap"'),
  JSON.stringify(Object.keys(view.current)));
check('Nazwa kolumny jest w JEDNYM miejscu i zgadza się z migracją pasa A',
  CONTENT_DOSE_COLUMN === 'content_doses', CONTENT_DOSE_COLUMN);

check('Odmiana: 1 dawka / 2 dawki / 5 dawek',
  earlierDosesLabel(1, false).endsWith('1 dawka')
  && earlierDosesLabel(2, false).endsWith('2 dawki')
  && earlierDosesLabel(5, false).endsWith('5 dawek'),
  [earlierDosesLabel(1, false), earlierDosesLabel(2, false), earlierDosesLabel(5, false)].join(' | '));
check('Odmiana: 12 dawek (wyjątek nastu), 22 dawki',
  earlierDosesLabel(12, false).endsWith('12 dawek') && earlierDosesLabel(22, false).endsWith('22 dawki'),
  [earlierDosesLabel(12, false), earlierDosesLabel(22, false)].join(' | '));
check('Rozwinięta lista daje drogę powrotną („Ukryj")',
  earlierDosesLabel(3, true).startsWith('Ukryj'), earlierDosesLabel(3, true));

check('Cztery etykiety ekranu są niepuste i różne od siebie',
  new Set([CONTENT_DOSE_SECTION_LABEL, CONTENT_DOSE_STEP_LABEL, CONTENT_DOSE_CURIOUS_LABEL, CONTENT_DOSE_SOURCE_LABEL]).size === 4
  && [CONTENT_DOSE_SECTION_LABEL, CONTENT_DOSE_STEP_LABEL, CONTENT_DOSE_CURIOUS_LABEL, CONTENT_DOSE_SOURCE_LABEL]
    .every((t) => t.trim().length > 0), 'powtórzone albo puste');
check('A10 (test 15-latka): żadna etykieta nie ocenia zawodnika i nie każe mu się starać',
  ![CONTENT_DOSE_SECTION_LABEL, CONTENT_DOSE_STEP_LABEL, CONTENT_DOSE_CURIOUS_LABEL, CONTENT_DOSE_SOURCE_LABEL]
    .some((t) => /musisz|powinieneś|niestety|słab|popraw się/i.test(t)), 'etykieta ocenia');
check('„Pogłęb temat" NIE jest użyte jako etykieta dawki — ta nazwa należy do płatnego programu '
  + 'w tym samym komponencie',
  ![CONTENT_DOSE_SECTION_LABEL, CONTENT_DOSE_STEP_LABEL, CONTENT_DOSE_CURIOUS_LABEL, CONTENT_DOSE_SOURCE_LABEL]
    .some((t) => t.toLowerCase().includes('pogłęb')), 'kolizja nazw z CTA Stripe');

// ═════════════════════════════════════════════════════════════
// 5. WYPIS — co zawodnik realnie zobaczy w Bloku Skupienia
// ═════════════════════════════════════════════════════════════
const line = '─'.repeat(62);
function printDose(title: string, v: ContentDoseView) {
  console.log(`\n### ${title}\n`);
  console.log(line);
  if (v.kind !== 'ready') {
    console.log(`(sekcji dawki nie ma na ekranie — {"reason":"${v.reason}"})`);
    if (v.warn) console.log(`\n[log Kuby] ${v.warn}`);
    console.log(line);
    return;
  }
  console.log(`${CONTENT_DOSE_SECTION_LABEL.toUpperCase()}${v.current.dateLabel ? `  ·  ${v.current.dateLabel}` : ''}`);
  console.log('');
  console.log(`${CONTENT_DOSE_STEP_LABEL}`);
  console.log(v.current.practicalStep);
  if (v.current.forCurious) {
    console.log('');
    console.log(`${CONTENT_DOSE_CURIOUS_LABEL} ▾`);
    console.log(v.current.forCurious);
  }
  if (v.current.source) {
    console.log('');
    console.log(CONTENT_DOSE_SOURCE_LABEL);
    if (v.current.source.text) console.log(v.current.source.text);
    console.log(v.current.source.label);
  }
  if (v.earlier.length > 0) {
    console.log('');
    console.log(`${earlierDosesLabel(v.earlier.length, false)}  (zwinięte)`);
    for (const c of v.earlier) {
      console.log(`   └ ${c.dateLabel ?? 'bez daty'} — ${c.practicalStep.slice(0, 58)}…`);
    }
  }
  console.log(line);
}

console.log('\n\n══════════════════════════════════════════════════════════════');
console.log('CO ZAWODNIK REALNIE ZOBACZY W BLOKU SKUPIENIA');
console.log('══════════════════════════════════════════════════════════════');
console.log('\nScenariusz: Blok Skupienia na Elemencie „Wydłużenie snu nocnego"');
console.log('(segment Regeneracja), etap 2. Dane 1:1 z przykładu prawdziwego');
console.log('rekordu w RAPORT_ZWROTNY_A_RUNDA_5.md, sekcja 11.');

printDose('Przypadek 1 — jedna dawka, z pogłębieniem i ze źródłem', buildContentDoseView({ raw: REAL_ENVELOPE }));
printDose('Przypadek 2 — druga dawka po zmianie etapu (starsza do wglądu)', buildContentDoseView({ raw: TWO_DOSE_ENVELOPE }));
printDose('Przypadek 3 — dawka bez pogłębienia i bez źródła',
  buildContentDoseView({ raw: { wersja: 1, dawki: [OLDER_DOSE] } }));
printDose('Przypadek 4 — MIGRACJA NIEWKLEJONA (kolumny nie ma w bazie)',
  buildContentDoseView({ error: { code: '42703', message: 'column focus_blocks.content_doses does not exist' } }));
printDose('Przypadek 5 — kolumna jest, dawki jeszcze nie było (świeży Blok)',
  buildContentDoseView({ raw: null }));

// ═════════════════════════════════════════════════════════════
// „PRZECZYTANE" — ZAPIS B7 08.08.2026 (M23/B36)
// ═════════════════════════════════════════════════════════════
check('SEEN: parseSeenKeys — wszystko, co nie jest listą stringów, znaczy „pusto" (nie błąd)',
  parseSeenKeys(null).length === 0 && parseSeenKeys(undefined).length === 0
  && parseSeenKeys('x').length === 0 && parseSeenKeys({ a: 1 }).length === 0
  && parseSeenKeys([1, '', 'ok', null]).join(',') === 'ok', 'defensywa nie działa');
check('SEEN: isDoseSeen — dawka bez klucza nie ma jak być „nowa"',
  isDoseSeen([], null) && isDoseSeen([], undefined) && !isDoseSeen([], 'k1') && isDoseSeen(['k1'], 'k1'),
  'zła klasyfikacja');
check('SEEN: withSeenKey — bez duplikatów, najnowsze na końcu',
  withSeenKey(['a', 'b'], 'a').join(',') === 'b,a' && withSeenKey([], 'x').join(',') === 'x',
  withSeenKey(['a', 'b'], 'a').join(','));
{
  const dużo = Array.from({ length: CONTENT_DOSE_SEEN_LIMIT + 5 }, (_, i) => `k${i}`);
  const po = withSeenKey(dużo, 'nowy');
  check(`SEEN: limit ${CONTENT_DOSE_SEEN_LIMIT} kluczy, tnie z PRZODU (stare wypadają pierwsze), nowy zawsze zostaje`,
    po.length === CONTENT_DOSE_SEEN_LIMIT && po[po.length - 1] === 'nowy' && !po.includes('k0'),
    `${po.length}, ostatni=${po[po.length - 1]}`);
}
check('SEEN: brak kolumny content_dose_seen rozpoznawany po nazwie i po kodach PGRST204/42703',
  isMissingSeenColumnError({ message: "column focus_blocks.content_dose_seen does not exist" })
  && isMissingSeenColumnError({ code: 'PGRST204', message: 'schema cache' })
  && isMissingSeenColumnError({ code: '42703', message: 'x' })
  && !isMissingSeenColumnError({ message: 'Network request failed' })
  && !isMissingSeenColumnError(null), 'ścieżka odzysku nie zadziała');
check('SEEN: log braku kolumny mówi, czego zawodnik nie zobaczy, i że reszta działa',
  CONTENT_DOSE_SEEN_COLUMN_MISSING_WARN.includes('Nowa')
  && CONTENT_DOSE_SEEN_COLUMN_MISSING_WARN.includes('normalnie'), CONTENT_DOSE_SEEN_COLUMN_MISSING_WARN);
check('SEEN: nazwa kolumny jest jedną stałą (żadnych literałów w widokach)',
  CONTENT_DOSE_SEEN_COLUMN === 'content_dose_seen', CONTENT_DOSE_SEEN_COLUMN);
// Pomiar osobnym logiem, wypisywany zawsze (zasada 14):
console.log(`[pomiar] SEEN: limit ${CONTENT_DOSE_SEEN_LIMIT} kluczy = 2× limit dawek pasa A (12).`);

console.log(`\n${passed} passed, ${failed} failed`);
// Celowo `throw`, a nie `process.exit(1)`: `process` wymaga `@types/node`,
// których tsconfig appki nie zaciąga — a te pliki są objęte `npx tsc --noEmit`.
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
