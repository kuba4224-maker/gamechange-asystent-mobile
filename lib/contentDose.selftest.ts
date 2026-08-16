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
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75)
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — liczbą, nie odczuciem. Ten plik miał 60 ASERCJI i ANI
// JEDNEJ, która czytałaby jakikolwiek EKRAN. Wszystkie szły przez `import`
// własnego modułu. Audyt H1 (15.08) zmierzył: nie istnieje stan repozytorium
// z pilnowanym defektem, na którym ten strażnik by się zapalił.
//
// DLACZEGO TO JEST GROŹNE AKURAT TUTAJ. Cała wartość `lib/contentDose.ts`
// to ROZRÓŻNIENIE STANÓW, KTÓRE NA EKRANIE WYGLĄDAJĄ IDENTYCZNIE:
// `isMissingContentDoseColumnError` („migracja nie weszła — zawodnik nie
// zobaczy ANI JEDNEJ dawki, mimo że backend je generuje i płacimy za nie")
// kontra `null_column`/`empty_list` („Blok jest świeży, nie ma jeszcze czego
// czytać"). Oba renderują TO SAMO: nic. Jedyne, co je odróżnia, to `warn`
// w logu — a ten powstaje wyłącznie wtedy, gdy EKRAN poda `error` do
// `buildContentDoseView` NIETKNIĘTY. Ekran, który robi `raw: data ?? null`
// i gubi `error`, przechodził tu 60 na 60 przy niewklejonej migracji.
//
// Drugie takie miejsce to `isMissingSeenColumnError`. Brak kolumny „seen"
// jest ŁAGODNY (znika plakietka „Nowa"), brak kolumny `content_doses` jest
// CIĘŻKI (znika cała dawka). Oba dają z PostgREST ten sam goły kod `42703`
// / `PGRST204`, więc rozróżnia je dopiero WARUNEK NA EKRANIE
// (`isMissingSeenColumnError(err) && !isMissingContentDoseColumnError(err)`).
// Bez tego warunku ciężka awaria wchodzi w łagodną ścieżkę odzysku i zawodnik
// po cichu traci cały ekran dawki — a suita mówi „przeszło".
//
// CO JEST TERAZ — sekcja 0 niżej. Ekrany ODKRYWANE Z KATALOGU (O69), zbiór
// konsumentów porównywany na RÓWNOŚĆ (O73), brak pliku to FAIL Z NAZWĄ,
// nigdy wyjątek `ENOENT` (O76).
//
// ⚠️ CZEGO TA SEKCJA NIE UDAJE. Czyta źródło ekranu JAKO TEKST. Nie uruchamia
// Reacta i nie wie, czy ekran się rysuje. Podmiana wywołania na inne, równie
// zepsute, przejdzie tu niezauważona. Dlatego każda asercja mówi wprost,
// co było zepsute i co zawodnik zobaczy źle.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (O53): `tsconfig.json` ciągnie DOM, `tsc` pada
// wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// ═══════════════════════════════════════════════════════════════════
// ⭐ 0. PAS I2 16.08.2026 — EKRANY, KTÓRE RYSUJĄ DAWKĘ (K4 / O75)
// ═══════════════════════════════════════════════════════════════════
// Wszystkie asercje w tej sekcji czytają ŹRÓDŁO EKRANU, nie moduł. Bez nich
// 60 asercji tego pliku opisuje funkcję, której nikt nie musi wołać.

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — pliki tego projektu CYTUJĄ w komentarzach nazwy
 * funkcji i zepsute wywołania („gdyby ten kod zrobił `rows = data ?? []`"),
 * więc strażnik czytający surowy tekst przechodziłby na własnej dokumentacji.
 * Wtedy jedynym sposobem, żeby go zapalić, byłoby skasowanie wyjaśnienia —
 * czyli tej wiedzy, dla której powstał.
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

const PLIK_BLOK = 'components/FocusBlockActiveView.tsx';
const PLIK_DZIS = 'app/(tabs)/dzis.tsx';
const blok = bezKomentarzy(surowe(PLIK_BLOK));
const dzisEkran = bezKomentarzy(surowe(PLIK_DZIS));

{
  console.log('0. EKRANY, KTÓRE RYSUJĄ DAWKĘ (K4 / O75)');

  check('⛔ (I2-0) każdy plik ekranu z listy strażnika istnieje i daje się odczytać',
    BRAK_PLIKOW.length === 0,
    `NIE MA TYCH PLIKÓW: ${BRAK_PLIKOW.join(', ')} — zmieniła się nazwa albo miejsce ekranu. `
    + 'Popraw listę w tym pliku ALBO przywróć ekran; do tego czasu asercje niżej '
    + 'czytają PUSTY tekst i nie znaczą nic.');

  // ── Odkrywanie z katalogu, nie lista na sztywno (O69) ──
  // Lista ręczna wyżej JEST potrzebna (asercje mówią o KONKRETNYCH plikach),
  // ale nie wolno jej stać samej: gdyby dawkę zaczął rysować trzeci ekran,
  // żadna asercja by tego nie zauważyła.
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
    (p) => /from\s+'[^']*\/contentDose'/.test(bezKomentarzy(readFileSync(join(root, p), 'utf8'))));
  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c`, nie przepisane z pamięci.
  // RÓWNOŚĆ, nie „≥ 1" (O73): „co najmniej jeden konsument" przeszłoby także
  // wtedy, gdy „Dziś" przestanie zapowiadać nową porcję, a zostanie sam Blok.
  const KONSUMENCI = [PLIK_BLOK, PLIK_DZIS].sort();
  const brakujacy = KONSUMENCI.filter((p) => !konsumenci.includes(p));
  const nadmiarowi = konsumenci.filter((p) => !KONSUMENCI.includes(p));
  check('⭐ (I2-0) dawkę czytają DOKŁADNIE te pliki, co 16.08 — RÓWNOŚĆ, nie „≥ 1" (O73)',
    brakujacy.length === 0 && nadmiarowi.length === 0,
    `BRAKUJE: ${brakujacy.join(', ') || '—'} · NADMIAROWI: ${nadmiarowi.join(', ') || '—'} `
    + '→ ubył: zawodnik przestał gdzieś widzieć dawkę, a 60 asercji niżej nadal jest zielonych; '
    + 'doszedł: sprawdź, czy nowe miejsce odróżnia „nie ma kolumny" od „pusto" i czy nie pisze '
    + 'do `content_doses` (zasada 5 kontraktu pasa A: tę kolumnę pisze WYŁĄCZNIE backend).');

  // ── ⛔ RDZEŃ: „NIE MA KOLUMNY" ≠ „PUSTO" ──
  // Defekt, którego pilnuje: ekran robi `raw: data ?? null` i gubi `error`.
  // Wtedy niewklejona migracja wygląda dokładnie jak świeży Blok: cisza.
  // Nikt nigdy nie wraca, backend dalej generuje dawki, my dalej za nie
  // płacimy, a zawodnik nie widzi ani jednej. To jest „cichy brak" wprost.
  check('⛔ (I2-0) `error` z bazy idzie do `buildContentDoseView` NIETKNIĘTY — nie `null`, nie `?? []`',
    /buildContentDoseView\(\{[\s\S]{0,200}?\berror:\s*doseError\b/.test(blok),
    'ekran przestał oddawać błąd odczytu modułowi — brak migracji `content_doses` staje się '
    + 'nieodróżnialny od „Blok jest świeży", log `CONTENT_DOSE_COLUMN_MISSING_WARN` nigdy nie padnie '
    + 'i nikt się nie dowie, że zawodnik nie dostaje treści, za którą płacimy');

  check('⛔ (I2-0) ekran Bloku ROZPOZNAJE brak kolumny i mówi to w logu, zamiast milczeć',
    /isMissingContentDoseColumnError\(/.test(blok) && /CONTENT_DOSE_COLUMN_MISSING_WARN/.test(blok),
    'zniknęło rozpoznanie braku migracji albo log o nim; ekran wygląda tak samo w obu stanach, '
    + 'a to log jest JEDYNYM miejscem, w którym „migracja nie weszła" różni się od „nie ma czego czytać"');

  check('⛔ (I2-0) ścieżka odzysku „seen" nie połyka CIĘŻKIEJ awarii — warunek ma zaprzeczenie',
    /isMissingSeenColumnError\([^)]*\)\s*&&\s*!\s*isMissingContentDoseColumnError\(/.test(blok)
    && /isMissingSeenColumnError\([^)]*\)\s*&&\s*!\s*isMissingContentDoseColumnError\(/.test(dzisEkran),
    'na którymś ekranie zniknęło `&& !isMissingContentDoseColumnError(...)`: oba braki kolumn dają '
    + 'z PostgREST ten sam goły kod 42703/PGRST204, więc bez zaprzeczenia brak `content_doses` '
    + '(zawodnik traci CAŁĄ dawkę) wchodzi w łagodną ścieżkę „nie ma plakietki Nowa" i ginie bez śladu');

  check('⛔ (I2-0) nazwy kolumn brane ze stałych modułu, nie wpisane w zapytanie ręcznie',
    /\.select\(`\$\{CONTENT_DOSE_COLUMN\}/.test(blok)
    && !/['"`]content_doses['"`,]/.test(blok) && !/['"`]content_dose_seen['"`,]/.test(blok)
    && !/['"`]content_doses['"`,]/.test(dzisEkran) && !/['"`]content_dose_seen['"`,]/.test(dzisEkran),
    'na ekranie stoi KOPIA nazwy kolumny; rozjedzie się ze stałą po cichu, a PostgREST przy nieznanej '
    + 'kolumnie odrzuca CAŁE zapytanie — czyli literówka zabiera zawodnikowi cały ekran dawki');

  // ── ⛔ ZASADA 5 KONTRAKTU PASA A: appka NIE PISZE do `content_doses` ──
  // Baza dziś na to pozwoli (`focus_blocks_owner` jest `FOR ALL`, znalezisko
  // A27), więc jedyną zaporą jest kod ekranu.
  check('⛔ (I2-0) appka zapisuje WYŁĄCZNIE do kolumny „przeczytane", nigdy do `content_doses`',
    /\.update\(\{\s*\[CONTENT_DOSE_SEEN_COLUMN\]/.test(blok)
    && !/\.update\(\{[^}]*\[CONTENT_DOSE_COLUMN\]/.test(blok)
    && !/\.update\(\{[^}]*\[CONTENT_DOSE_COLUMN\]/.test(dzisEkran),
    'ekran zaczął pisać do kolumny, którą wypełnia backend (zasada 5 kontraktu pasa A) — '
    + 'polityka RLS na to pozwoli, więc nadpisana treść zniknie bez błędu i bez śladu');

  // ── Ekran nie decyduje za moduł ──
  check('⛔ (I2-0) o tym, co zawodnik zobaczy, rozstrzyga `buildContentDoseView` — ekran nie ma własnej gałęzi',
    /const\s+doseView\s*=\s*buildContentDoseView\(/.test(blok)
    && !/\bdoseRaw\s*\?\?\s*\[\]/.test(blok),
    'decyzja „co pokazać" wróciła na ekran; sześć jawnych stanów braku (brak kolumny, NULL, pusta '
    + 'lista, zła wersja koperty, nieczytelna treść, błąd sieci) sklei się w jedno „nic nie ma"');

  check('⛔ (I2-0) ekran nie sortuje, nie filtruje i nie tnie wyniku modułu',
    !/doseView\s*\.\s*(earlier|current)\s*\.\s*(sort|filter|slice|reverse)\s*\(/.test(blok),
    'ekran wybiera, KTÓRE dawki pokazać — a zasada 4 kontraktu mówi, że `dawki[0]` to bieżąca, '
    + 'a reszta to „wcześniej w tym Bloku" W TEJ KOLEJNOŚCI; drugi rachunek rozjedzie się po cichu');

  // ── Brzmienia pochodzą z modułu, nie z ekranu ──
  check('⛔ (I2-0) etykiety dawki rysowane STAŁYMI modułu, a na ekranie nie stoi ich kopia',
    /CONTENT_DOSE_SECTION_LABEL/.test(blok) && /CONTENT_DOSE_STEP_LABEL/.test(blok)
    && /CONTENT_DOSE_SOURCE_LABEL/.test(blok)
    && !blok.includes(CONTENT_DOSE_SECTION_LABEL) && !blok.includes(CONTENT_DOSE_STEP_LABEL)
    && !blok.includes(CONTENT_DOSE_SOURCE_LABEL),
    'na ekranie stoi wpisany ręcznie napis zamiast stałej — a te napisy są celowo TE SAME co '
    + 'w ulotnym pudełku dawki („Praktyczny krok"/„Dla chętnych"); rozjazd zrobi z jednej rzeczy dwie, '
    + 'a „Dla chętnych" ma się nie zlać z płatnym „Pogłęb temat" za 97 zł');

  check('⛔ (I2-0) przełącznik pogłębienia i nagłówek starszych dawek liczą FUNKCJE modułu',
    /curiousToggleLabel\(/.test(blok) && /earlierDosesLabel\(/.test(blok),
    'ekran zaczął sam składać te napisy — `earlierDosesLabel` odmienia liczebnik („1 dawka", '
    + '„3 dawki", „5 dawek"), a druga kopia tej odmiany rozjedzie się przy pierwszej piątce');

  check('⛔ (I2-0) `dla_chetnych: null` znaczy BRAK PRZYCISKU, nie pusty przycisk (zasada 2)',
    /\{card\.forCurious\s*&&/.test(blok),
    'zniknął warunek na `card.forCurious`: zawodnik dostaje przycisk „Dla chętnych ▾", który '
    + 'po dotknięciu nie pokazuje nic — a to jest dokładnie „cichy brak" z audytu po bloku 3');

  // ── ⭐ ZAPADKA NA SKASOWANIE (wzorzec B2-5) ──
  // Bez tych dwóch asercji wszystkie powyższe spełnia się przez USUNIĘCIE
  // rysowania dawki. Strażnik nagradzałby wtedy skasowanie funkcji.
  check('⭐ (I2-0) ekran Bloku NAPRAWDĘ rysuje bieżącą dawkę — `doseView.current` idzie do widoku',
    /renderDoseBody\(\s*doseView\.current/.test(blok) && /\{renderContentDose\(\)\}/.test(blok),
    'zniknęło renderowanie dawki; wszystkie asercje wyżej spełnia też ekran, który nie pokazuje '
    + 'jej wcale — a wtedy strażnik NAGRADZA skasowanie funkcji');

  check('⭐ (I2-0) „Dziś" NAPRAWDĘ zapowiada nową porcję — `isDoseSeen` idzie do jednej odpowiedzi',
    /setNewDoseWaiting\(\s*!\s*isDoseSeen\(/.test(dzisEkran)
    && /nowaPorcjaCzeka:\s*newDoseWaiting/.test(dzisEkran),
    'na „Dziś" policzone „czeka nowa porcja" nie dochodzi do `zbudujJednaOdpowiedz` albo zniknęło '
    + 'całkiem: zawodnik nie dowie się, że w Bloku czeka na niego treść, i po prostu tam nie wejdzie');
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
