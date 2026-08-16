// WIEDZA B4 08.08.2026 — weryfikacja biblioteki materiałów (lib/materials.ts).
// Czysta logika, bez Supabase i bez React Native:
//
//   npx tsx lib/materials.selftest.ts
//
// Albo razem z resztą: `node tests/run-selftests.mjs`.
// Uruchom ponownie po każdej zmianie w lib/materials.ts ORAZ po każdej zmianie
// w lib/labels.ts (test 2 pilnuje zgodności obu plików).
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75)
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — liczbą. Ten plik miał 40 ASERCJI i ANI JEDNEJ, która
// czytałaby EKRAN. Sprawdzał wyłącznie własny moduł przez `import`. Audyt H1
// (15.08) zmierzył: nie istnieje stan repozytorium z pilnowanym defektem,
// na którym ten strażnik by się zapalił.
//
// DLACZEGO TO JEST GROŹNE AKURAT TUTAJ. Cała różnica między BIBLIOTEKĄ
// a PÓŁKĄ (decyzja C1: „wartość nie leży w dostępie do treści, tylko
// w trafieniu w moment") mieszka w trzech rzeczach, które robi EKRAN:
//   • rysuje zdanie `u.why` — „dlaczego akurat ten materiał dla Ciebie";
//   • rysuje `sharedNote` — 11 materiałów na 13 segmentów NIE jest dziurą
//     i appka mówi to jako WIEDZĘ O GRZE, nie jako przeprosiny (decyzja B2);
//   • zachowuje KOLEJNOŚĆ z `unlockedMaterials` — najpierw materiał do Celu,
//     nad którym zawodnik pracuje TERAZ, potem to, co wyszło z diagnozy.
//     Kolejność jest świadomie NIEALFABETYCZNA.
// Każdą z tych trzech da się skasować jednym cięciem w `.tsx`, a 40 asercji
// niżej dalej świeci na zielono, bo one badają wyłącznie funkcję.
//
// ⚠️ CZEGO TA SEKCJA CELOWO NIE POWTARZA. `lib/surowaWartosc.selftest.ts`
// przemiata `biblioteka.tsx` i `ja.tsx` pod kątem SUROWYCH WARTOŚCI z bazy,
// a `lib/trzyPustki.selftest.ts` i `lib/pustkaWCalymRepo.selftest.ts` —
// pod kątem rozróżnienia „nic nie masz" od „nie udało się wczytać"
// (`rozpoznajPustke`, `?? []` przy nieodpytanym `.error`). Powtórzona lista
// rozjechałaby się z pierwszą i wtedy jeden strażnik świeciłby na zielono na
// tym, na czym drugi świeci na czerwono. TUTAJ pilnujemy WYŁĄCZNIE materiałów:
// tytułów, segmentów i brzmień.
//
// CO JEST TERAZ — sekcja 0 niżej. Ekrany ODKRYWANE Z KATALOGU (O69), zbiór
// konsumentów na RÓWNOŚĆ (O73), brak pliku to FAIL Z NAZWĄ, nigdy `ENOENT` (O76).
//
// ⚠️ CZEGO TA SEKCJA NIE UDAJE. Czyta źródło ekranu JAKO TEKST, nie uruchamia
// Reacta. Podmiana wywołania na inne, równie zepsute, przejdzie niezauważona.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (O53): `tsconfig.json` ciągnie DOM, `tsc` pada
// wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SEGMENT_ORDER, SEGMENT_LABELS } from './labels';
import { formatHintSource } from './componentHints';
import {
  MATERIALS,
  MATERIAL_BY_SEGMENT,
  unlockedMaterials,
  libraryCountLine,
  LIBRARY_EMPTY_TEXT,
  LIBRARY_NO_DOWNLOAD_TEXT,
  LIBRARY_SECTION_LABEL,
  libraryEntryHint,
  LIBRARY_SCREEN_TITLE,
  LIBRARY_SCREEN_INTRO,
} from './materials';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ 0. PAS I2 16.08.2026 — EKRANY, KTÓRE RYSUJĄ MATERIAŁY (K4 / O75)
// ═══════════════════════════════════════════════════════════════════

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — pliki tego projektu CYTUJĄ w komentarzach nazwy
 * funkcji i zepsute wywołania („⛔ USUNIĘTE Z FUNKCJI `load()`: `(goalsRes.data
 * ?? [])`"), więc strażnik czytający surowy tekst przechodziłby na własnej
 * dokumentacji, a jedynym sposobem, żeby go zapalić, byłoby skasowanie
 * wyjaśnienia — czyli tej wiedzy, dla której powstał.
 */
const bezKomentarzy = (s: string): string => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .join('\n');

/** ⛔ Brak pliku to FAIL Z NAZWĄ, nigdy wyjątek `ENOENT` (O76). */
const BRAK_PLIKOW: string[] = [];
const surowe = (wzgledna: string): string => {
  const p = join(root, wzgledna);
  if (!existsSync(p)) { BRAK_PLIKOW.push(wzgledna); return ''; }
  return readFileSync(p, 'utf8');
};

const PLIK_BIBLIOTEKA = 'app/(tabs)/biblioteka.tsx';
const PLIK_JA = 'app/(tabs)/ja.tsx';
const PLIK_LAYOUT = 'app/(tabs)/_layout.tsx';
const biblioteka = bezKomentarzy(surowe(PLIK_BIBLIOTEKA));
const ja = bezKomentarzy(surowe(PLIK_JA));
const layout = bezKomentarzy(surowe(PLIK_LAYOUT));

{
  console.log('0. EKRANY, KTÓRE RYSUJĄ MATERIAŁY (K4 / O75)');

  check('⛔ (I2-0) każdy plik ekranu z listy strażnika istnieje i daje się odczytać',
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
    (p) => /from\s+'[^']*\/materials'/.test(bezKomentarzy(readFileSync(join(root, p), 'utf8'))));
  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c`, nie przepisane z pamięci.
  // RÓWNOŚĆ, nie „≥ 1" (O73): „co najmniej jeden konsument" przeszłoby także
  // wtedy, gdy zniknie WEJŚCIE w „Ja" — a trasa biblioteki jest CHOWANA
  // (`href: null`), więc bez tego wejścia nie da się do niej dojść wcale.
  const KONSUMENCI = [PLIK_BIBLIOTEKA, PLIK_JA].sort();
  const brakujacy = KONSUMENCI.filter((p) => !konsumenci.includes(p));
  const nadmiarowi = konsumenci.filter((p) => !KONSUMENCI.includes(p));
  check('⭐ (I2-0) materiały rysują DOKŁADNIE te pliki, co 16.08 — RÓWNOŚĆ, nie „≥ 1" (O73)',
    brakujacy.length === 0 && nadmiarowi.length === 0,
    `BRAKUJE: ${brakujacy.join(', ') || '—'} · NADMIAROWI: ${nadmiarowi.join(', ') || '—'} `
    + '→ ubył: zawodnik przestał gdzieś widzieć materiały, a 40 asercji niżej nadal jest zielonych; '
    + 'doszedł: sprawdź, czy nowe miejsce nie liczy odblokowań własną regułą obok `unlockedMaterials`.');

  // ── ⛔ ODBLOKOWANIE LICZY MODUŁ, NIE EKRAN ──
  // Defekt: ekran zaczyna sam sprawdzać „czy mam Cel w tym segmencie".
  // Wtedy w produkcie są DWIE reguły odblokowania, obie przekonane, że są
  // jedyne — a licznik w „Ja" i lista w bibliotece pokazują różne liczby.
  check('⛔ (I2-0) oba ekrany liczą odblokowania FUNKCJĄ modułu (`unlockedMaterials`)',
    /setLibrary\(\s*unlockedMaterials\(/.test(biblioteka)
    && /setLibraryCount\(\s*unlockedMaterials\(/.test(ja),
    'któryś ekran policzył odblokowania sam; wtedy podpis w „Ja" („3 materiały otwarte dla Ciebie") '
    + 'i lista na ekranie biblioteki mogą po cichu mówić o dwóch różnych zbiorach — a zawodnik '
    + 'wchodzi tam właśnie po to, żeby zobaczyć TE materiały, o których przed chwilą przeczytał liczbę');

  check('⛔ (I2-0) ekran nie sortuje, nie filtruje i nie tnie wyniku `unlockedMaterials`',
    !/library\s*\.\s*(sort|filter|slice|reverse)\s*\(/.test(biblioteka),
    'ekran układa własną kolejność materiałów; kolejność z modułu jest ŚWIADOMIE nieafabetyczna — '
    + 'najpierw materiał do Celu, nad którym zawodnik pracuje TERAZ, potem to, co wyszło z diagnozy. '
    + 'Zawodnik wchodzi tu z pytaniem „co mam przeczytać", nie „co posiadam"');

  // ── ⛔ TYTUŁY I OPISY POCHODZĄ Z MODUŁU, NIE Z EKRANU ──
  // Decyzja A1: „tytuł bierzemy z bazy, nie z nazwy pliku". Te same napisy
  // stoją w `component_hints.zrodlo`, więc źródło podpowiedzi na „Dziś"
  // („Moc, s. 8") i pozycja w bibliotece („Moc") muszą mówić o tym samym
  // materiale TYM SAMYM SŁOWEM.
  {
    const wpisaneTytuly = MATERIALS.filter((m) => biblioteka.includes(m.title) || ja.includes(m.title));
    const wpisaneOpisy = MATERIALS.filter((m) => biblioteka.includes(m.about));
    check('⛔ (I2-0) ani jeden tytuł ani opis materiału NIE jest wpisany w ekran ręcznie',
      /\{u\.material\.title\}/.test(biblioteka) && /\{u\.material\.about\}/.test(biblioteka)
      && wpisaneTytuly.length === 0 && wpisaneOpisy.length === 0,
      `KOPIE TYTUŁÓW: ${wpisaneTytuly.map((m) => m.id).join(', ') || '—'} · `
      + `KOPIE OPISÓW: ${wpisaneOpisy.map((m) => m.id).join(', ') || '—'} — `
      + 'tytuł na ekranie ma być TYM SAMYM napisem co w `component_hints.zrodlo` (decyzja A1); '
      + 'kopia rozjedzie się przy pierwszej zmianie nazwy i zawodnik zobaczy „Moc, s. 8" przy '
      + 'podpowiedzi, a inny napis przy pozycji w bibliotece');
  }

  // ── ⭐ TO, CO ODRÓŻNIA BIBLIOTEKĘ OD PÓŁKI ──
  check('⭐ (I2-0) przy każdej pozycji stoi zdanie „dlaczego akurat to" (`u.why`)',
    /\{u\.why\}/.test(biblioteka),
    'zniknęło jedno zdanie uzasadnienia przy pozycji — i to jest CAŁA różnica między biblioteką '
    + 'a półką (decyzja C1: wartość jest w trafieniu w moment, nie w katalogu). Bez niego zawodnik '
    + 'dostaje listę tytułów i nie wie, dlaczego ma przeczytać akurat ten');

  check('⛔ (I2-0) nota o współdzielonym materiale rysowana WARUNKOWO, ze struktury modułu',
    /u\.material\.sharedNote\s*\?/.test(biblioteka),
    'zniknęła nota `sharedNote` albo jej warunek: 11 materiałów na 13 segmentów NIE JEST DZIURĄ '
    + '(decyzja B2) i appka mówi to jako wiedzę o grze — bez tej noty zawodnik z gardłem '
    + 'w Technice Specjalistycznej widzi pozycję „Technika fundamentalna" i myśli, że go pominięto');

  // ── ⛔ BRZMIENIA ZE STAŁYCH MODUŁU, NIE ICH KOPIE NA EKRANIE ──
  check('⛔ (I2-0) tytuł, wstęp i przypis ekranu biblioteki idą ze stałych modułu, bez kopii',
    /\{LIBRARY_SCREEN_TITLE\}/.test(biblioteka) && /\{LIBRARY_SCREEN_INTRO\}/.test(biblioteka)
    && /\{LIBRARY_NO_DOWNLOAD_TEXT\}/.test(biblioteka)
    && !biblioteka.includes(LIBRARY_SCREEN_TITLE) && !biblioteka.includes(LIBRARY_SCREEN_INTRO)
    && !biblioteka.includes(LIBRARY_NO_DOWNLOAD_TEXT) && !biblioteka.includes(LIBRARY_EMPTY_TEXT),
    'na ekranie stoi KOPIA któregoś z tych zdań albo któregoś zabrakło. `LIBRARY_NO_DOWNLOAD_TEXT` '
    + 'jest tu najdroższy: to jedyne miejsce, w którym produkt mówi, że pliku dziś NIE MA i skąd '
    + 'zamiast niego biorą się zdania na „Dziś". Bez niego zawodnik czeka na pobieranie, którego nie ma');

  check('⛔ (I2-0) licznik otwartych materiałów liczy `libraryCountLine`, a nie ekran',
    /libraryCountLine\(\s*library\.length\s*\)/.test(biblioteka),
    'ekran zaczął sam składać zdanie o liczbie; ta reguła odmienia liczebnik („1 materiał otwarty", '
    + '„3 materiały otwarte", „11 materiałów otwartych") i druga kopia rozjedzie się na pierwszej nastce');

  check('⛔ (I2-0) wejście w „Ja" ma podpis z modułu (`libraryEntryHint`), nie własny napis',
    /libraryEntryHint\(\s*libraryCount\s*\)/.test(ja) && !ja.includes(LIBRARY_SECTION_LABEL),
    'w „Ja" stoi wpisany ręcznie podpis wejścia; ten podpis ma się MIEŚCIĆ W JEDNEJ LINII wiersza '
    + 'menu (≤ 36 znaków — asercja niżej), bo dłuższy zawija się i podnosi cały ekran „Ja", '
    + 'z którego biblioteka wyprowadziła się właśnie po to, żeby go obniżyć');

  // ── ⭐ ZAPADKA NA SKASOWANIE ──
  // Bez tych dwóch asercji wszystko powyższe spełnia też produkt, w którym
  // biblioteki NIE DA SIĘ OTWORZYĆ. Strażnik nagradzałby wtedy skasowanie.
  check('⭐ (I2-0) biblioteka NAPRAWDĘ rysuje listę materiałów — `library.map` idzie do widoku',
    /library\.map\(/.test(biblioteka),
    'zniknęło renderowanie listy; wszystkie asercje wyżej spełnia też ekran, który nie pokazuje '
    + 'ani jednego materiału — a wtedy strażnik NAGRADZA skasowanie funkcji');

  // ⚠️ Element `<Tabs.Screen name="biblioteka" … />` wycinany W CAŁOŚCI, a nie
  // szukany oknem znaków. ZMIERZONE 16.08.2026: okno `[\s\S]{0,160}?href: null`
  // PRZECHODZIŁO po skasowaniu `href: null` z tego wpisu, bo dosięgało `href:
  // null` NASTĘPNEGO wpisu w pliku. `[^>]*` zatrzymuje się na `/>` i nie ma jak
  // przeczytać cudzej trasy. To jest dokładnie ten rodzaj asercji, która
  // wygląda na zieloną i nie pilnuje niczego.
  const wpisBiblioteki = layout.match(/<Tabs\.Screen\s+name="biblioteka"[^>]*\/>/)?.[0] ?? '';
  check('⭐ (I2-0) do biblioteki DA SIĘ DOJŚĆ: trasa jest chowana, a wejście stoi w „Ja"',
    /href:\s*null/.test(wpisBiblioteki)
    && /renderRow\(\s*'\/biblioteka'\s*,\s*LIBRARY_SECTION_LABEL/.test(ja),
    'albo zniknęło wejście w „Ja", albo trasa przestała być chowana. Ubytek wejścia znaczy, że '
    + 'biblioteka istnieje i NIKT nie może do niej wejść (trasa `href: null` nie ma zakładki) — '
    + 'funkcja zbudowana i niewidoczna. Nadmiar (brak `href: null`) znaczy PIĄTĄ ZAKŁADKĘ w pasku, '
    + 'czyli skasowanie decyzji B8 — Expo Router pokazuje KAŻDY plik z `app/(tabs)/` (znalezisko B14)');
}

// ═════════════════════════════════════════════════════════════
// 1. 11 MATERIAŁÓW NA 13 SEGMENTÓW (decyzja B2) — bez dziur i bez nakładek
// ═════════════════════════════════════════════════════════════
check('Jest dokładnie 11 materiałów (decyzja B2)',
  MATERIALS.length === 11, String(MATERIALS.length));

{
  const covered = MATERIALS.flatMap((m) => m.segments);
  check('Każdy z 13 segmentów ma swój materiał',
    SEGMENT_ORDER.every((s) => !!MATERIAL_BY_SEGMENT[s]),
    SEGMENT_ORDER.filter((s) => !MATERIAL_BY_SEGMENT[s]).join(', '));
  check('Żaden segment nie należy do dwóch materiałów naraz',
    new Set(covered).size === covered.length, JSON.stringify(covered));
  check('Nie ma materiału dla segmentu spoza SEGMENT_ORDER (literówka w id)',
    covered.every((s) => SEGMENT_ORDER.includes(s)),
    covered.filter((s) => !SEGMENT_ORDER.includes(s)).join(', '));
  check('13 segmentów pokrytych łącznie',
    covered.length === 13, String(covered.length));
}

check('Dokładnie dwa materiały obsługują po dwa segmenty i oba TŁUMACZĄ dlaczego',
  MATERIALS.filter((m) => m.segments.length > 1).length === 2
  && MATERIALS.filter((m) => m.segments.length > 1).every((m) => !!m.sharedNote && m.sharedNote.length > 20),
  JSON.stringify(MATERIALS.filter((m) => m.segments.length > 1).map((m) => [m.id, !!m.sharedNote])));
check('Materiał dla jednego segmentu NIE ma zbędnej noty o współdzieleniu',
  MATERIALS.filter((m) => m.segments.length === 1).every((m) => !m.sharedNote), 'któryś ma');
check('techSpec dzieli materiał z techFund (decyzja B2)',
  MATERIAL_BY_SEGMENT['techSpec'] === MATERIAL_BY_SEGMENT['techFund'], 'różne materiały');
check('percepcja dzieli materiał z decyzja (decyzja B2)',
  MATERIAL_BY_SEGMENT['percepcja'] === MATERIAL_BY_SEGMENT['decyzja'], 'różne materiały');
check('Każdy materiał ma tytuł, opis i unikalne id',
  MATERIALS.every((m) => m.id.trim() && m.title.trim() && m.about.trim())
  && new Set(MATERIALS.map((m) => m.id)).size === MATERIALS.length, 'brak pola albo duplikat id');
check('Kolejność materiałów idzie za SEGMENT_ORDER (jeden porządek w całej appce)',
  MATERIALS.map((m) => SEGMENT_ORDER.indexOf(m.segments[0]))
    .every((v, i, arr) => i === 0 || arr[i - 1] < v),
  JSON.stringify(MATERIALS.map((m) => [m.id, SEGMENT_ORDER.indexOf(m.segments[0])])));

// ═════════════════════════════════════════════════════════════
// 2. SZEW Z PODPOWIEDZIAMI — biblioteka i źródło na Dziś mówią TYM SAMYM słowem
// To jest asercja przeciwko rozjazdowi z rodziny „jedna rzecz, dwie nazwy":
// zawodnik widzi na Dziś „Moc, s. 8", a w „Ja" pozycję — muszą się nazywać tak
// samo, inaczej nie ma jak skojarzyć jednego z drugim.
// ═════════════════════════════════════════════════════════════
{
  const ZRODLA_Z_MIGRACJI: [string, string][] = [
    ['moc', 'Moc — System Gamechange (pełny)'],
    ['wytrzymalosc', 'Wytrzymałość — System Gamechange (pełny)'],
    ['fizycznosc', 'Fizyczność — System Gamechange (pełny)'],
    ['techFund', 'Technika fundamentalna — System Gamechange (pełny)'],
    ['techSpec', 'Technika fundamentalna — System Gamechange (pełny)'],
    ['tolerancja', 'Tolerancja obciążeń — System Gamechange (pełny)'],
    ['regeneracja', 'Regeneracja — System Gamechange (pełny)'],
    ['odpornosc', 'Odporność organizmu — System Gamechange (pełny)'],
    ['odzywianie', 'Odżywienie organizmu — System Gamechange (pełny)'],
    ['koncentracja', 'Koncentracja — System Gamechange (pełny)'],
    ['mental', 'Stan mentalny — System Gamechange (pełny)'],
    ['percepcja', 'Percepcja i szybkość decyzji — System Gamechange (pełny)'],
    ['decyzja', 'Percepcja i szybkość decyzji — System Gamechange (pełny)'],
  ];
  const rozjazdy = ZRODLA_Z_MIGRACJI.filter(([seg, zrodlo]) =>
    formatHintSource(zrodlo, null) !== MATERIAL_BY_SEGMENT[seg]?.title);
  check('Tytuł w bibliotece = nazwa źródła pokazywana przy podpowiedzi (13/13 segmentów)',
    rozjazdy.length === 0,
    JSON.stringify(rozjazdy.map(([seg, z]) => [seg, formatHintSource(z, null), MATERIAL_BY_SEGMENT[seg]?.title])));
}

// ═════════════════════════════════════════════════════════════
// 3. ODBLOKOWANIE — konsekwencja pracy, nie zapłaty (decyzja C1)
// ═════════════════════════════════════════════════════════════
check('Nowy zawodnik (bez Celu, bez diagnozy) ma pustą bibliotekę',
  unlockedMaterials({ goalSegmentIds: [], deficitSegmentIds: [] }).length === 0, 'coś odblokowane');

{
  const r = unlockedMaterials({ goalSegmentIds: ['moc'], deficitSegmentIds: [] });
  check('Sam Cel odblokowuje dokładnie jeden materiał',
    r.length === 1 && r[0].material.id === 'moc', JSON.stringify(r.map((u) => u.material.id)));
  check('Powód „goal" mówi o Celu, nie o diagnozie',
    r[0].reason === 'goal' && r[0].why === 'Bo pracujesz nad Celem w obszarze Moc.', r[0].why);
}

{
  const r = unlockedMaterials({ goalSegmentIds: [], deficitSegmentIds: ['regeneracja', 'tolerancja'] });
  check('Sama diagnoza odblokowuje materiały dla wąskich gardeł',
    r.length === 2 && r.every((u) => u.reason === 'diagnosis'), JSON.stringify(r.map((u) => u.material.id)));
  check('Zdanie „dlaczego" dla jednego gardła nazywa je po imieniu',
    r[0].why.includes(SEGMENT_LABELS['tolerancja']) || r[0].why.includes(SEGMENT_LABELS['regeneracja']), r[0].why);
}

{
  // Nazwa segmentu w zdaniu MUSI stać w mianowniku, czyli dokładnie tak, jak
  // w lib/labels.ts i na wyniku diagnozy — inaczej powstaje druga lista nazw
  // (biernik) i rozjazd, który likwidował blok B1. Sprawdzane na wszystkich 13.
  const zle = SEGMENT_ORDER.filter((seg) => {
    const cel = unlockedMaterials({ goalSegmentIds: [seg], deficitSegmentIds: [] })[0];
    const diag = unlockedMaterials({ goalSegmentIds: [], deficitSegmentIds: [seg] })[0];
    return !cel?.why.includes(SEGMENT_LABELS[seg]) || !diag?.why.includes(SEGMENT_LABELS[seg]);
  });
  check('Wszystkie 13 nazw stoi w zdaniu w MIANOWNIKU, znak w znak jak w lib/labels.ts',
    zle.length === 0, zle.join(', '));
}

{
  const r = unlockedMaterials({ goalSegmentIds: ['techFund', 'techSpec'], deficitSegmentIds: [] })[0];
  // PRAKTYKA-EKRAN B6 08.08.2026 — oczekiwany napis składany z SEGMENT_LABELS,
  // a nie wpisany ręcznie. Poprzednia wersja miała nazwy przepisane w treści
  // asercji („Technika Fundamentalna i Technika Specjalistyczna") i przez to
  // pilnowała DWÓCH rzeczy naraz: odmiany „w obszarach" i tego, jak brzmią
  // nazwy. Przy decyzji Kuby o małej literze wywaliła się na tej drugiej,
  // choć odmiana była w porządku — a od nazw jest lib/labels.selftest.ts.
  check('Materiał na dwa segmenty odmienia „w obszarach", nie „w obszarze"',
    r.why === `Bo pracujesz nad Celem w obszarach ${SEGMENT_LABELS['techFund']} `
      + `i ${SEGMENT_LABELS['techSpec']}.`, r.why);
}

{
  const r = unlockedMaterials({ goalSegmentIds: ['moc'], deficitSegmentIds: ['moc', 'regeneracja'] });
  check('Cel + diagnoza na tym samym segmencie → JEDNA pozycja, nie dwie',
    r.filter((u) => u.material.id === 'moc').length === 1, JSON.stringify(r.map((u) => u.material.id)));
  check('Powód „both" mówi o obu naraz',
    r.find((u) => u.material.id === 'moc')?.reason === 'both',
    String(r.find((u) => u.material.id === 'moc')?.reason));
  check('Materiał do Celu stoi PRZED materiałem z diagnozy',
    r[0].material.id === 'moc', JSON.stringify(r.map((u) => u.material.id)));
}

{
  const r = unlockedMaterials({ goalSegmentIds: ['techSpec'], deficitSegmentIds: ['techFund'] });
  check('Cel w techSpec + gardło w techFund → jedna pozycja (ten sam materiał)',
    r.length === 1 && r[0].material.id === 'technika-fundamentalna', JSON.stringify(r.map((u) => u.material.id)));
  check('…i jest opisana jako „both", bo obie drogi ją otwierają',
    r[0].reason === 'both', r[0].reason);
}

{
  const r = unlockedMaterials({ goalSegmentIds: ['percepcja'], deficitSegmentIds: ['decyzja'] });
  check('Percepcja i Szybkość Decyzji nigdy nie dublują pozycji',
    r.length === 1 && r[0].material.id === 'percepcja-i-szybkosc-decyzji', JSON.stringify(r.map((u) => u.material.id)));
}

check('Nieznany segment_id (śmieć z bazy) nie wywraca biblioteki',
  unlockedMaterials({ goalSegmentIds: ['nie-ma-takiego'], deficitSegmentIds: [''] }).length === 0, 'coś odblokowane');

{
  const r = unlockedMaterials({ goalSegmentIds: ['moc', 'moc'], deficitSegmentIds: ['moc'] });
  check('Dwa Cele w tym samym segmencie → nadal jedna pozycja',
    r.length === 1, JSON.stringify(r.map((u) => u.material.id)));
}

check('Każda odblokowana pozycja ma niepuste zdanie „dlaczego akurat to"',
  unlockedMaterials({ goalSegmentIds: ['moc'], deficitSegmentIds: ['mental', 'decyzja'] })
    .every((u) => u.why.trim().length > 10 && u.why.trim().endsWith('.')),
  'któreś zdanie puste albo bez kropki');

// ═════════════════════════════════════════════════════════════
// 4. TEKSTY NA EKRAN (decyzja A10)
// ═════════════════════════════════════════════════════════════
check('Liczebnik: 1 / 2 / 5 odmieniają się po polsku',
  libraryCountLine(1) === '1 materiał otwarty dla Ciebie'
  && libraryCountLine(2) === '2 materiały otwarte dla Ciebie'
  && libraryCountLine(5) === '5 materiałów otwartych dla Ciebie',
  [libraryCountLine(1), libraryCountLine(2), libraryCountLine(5)].join(' | '));
check('Liczebnik: 12 to „materiałów", nie „materiały" (wyjątek 12–14)',
  libraryCountLine(12) === '12 materiałów otwartych dla Ciebie', libraryCountLine(12));
check('Liczebnik: 0 nie pokazuje zera, tylko zdanie',
  libraryCountLine(0) === 'Jeszcze nic nie otworzyłeś', libraryCountLine(0));
check('Pusty stan mówi, JAK przestać być pusty (a nie tylko, że jest pusto)',
  LIBRARY_EMPTY_TEXT.includes('Cel') && LIBRARY_EMPTY_TEXT.includes('diagnoz'), LIBRARY_EMPTY_TEXT);
check('Stopka NIE obiecuje pobierania ani nie zgaduje, skąd bierze się plik',
  !/pobier|ściąg|link|mail/i.test(LIBRARY_NO_DOWNLOAD_TEXT), LIBRARY_NO_DOWNLOAD_TEXT);
check('Nagłówek sekcji jest o zawodniku, nie o systemie',
  LIBRARY_SECTION_LABEL === 'Twoje materiały', LIBRARY_SECTION_LABEL);

// ═════════════════════════════════════════════════════════════
// 4b. WŁASNY EKRAN BIBLIOTEKI (ZMIANA OBRAZU B5 08.08.2026)
// ═════════════════════════════════════════════════════════════
check('Tytuł ekranu to TEN SAM napis co etykieta sekcji, z której biblioteka wyszła',
  LIBRARY_SCREEN_TITLE === LIBRARY_SECTION_LABEL, LIBRARY_SCREEN_TITLE);
check('Wstęp ekranu mówi, skąd bierze się otwarcie: Cel albo diagnoza',
  /Cel/.test(LIBRARY_SCREEN_INTRO) && /diagnoz/.test(LIBRARY_SCREEN_INTRO), LIBRARY_SCREEN_INTRO);
check('Wstęp ekranu NIE obiecuje pobierania pliku',
  !/pobier|ściąg|link|mail|PDF/i.test(LIBRARY_SCREEN_INTRO), LIBRARY_SCREEN_INTRO);
check('Podpis wejścia przy zerze mówi, JAK to otworzyć — nie „0 materiałów"',
  /Cel/.test(libraryEntryHint(0)) && /diagnoz/.test(libraryEntryHint(0))
  && !libraryEntryHint(0).includes('0'), libraryEntryHint(0));
check('Podpis wejścia przy liczbie > 0 to ten sam liczebnik co na ekranie',
  libraryEntryHint(3) === libraryCountLine(3), libraryEntryHint(3));
// 36 znaków to nie liczba z sufitu: podpis wiersza menu ma fontSize 12, a na
// najmniejszym telefonie zostaje mu ~218 dp szerokości (320 − padding
// ScrollView 40 − padding wiersza 32 − szewron 22 − odstęp 8). Przy 0,5 em na
// znak daje to ~36 znaków w linii. Dłuższy podpis zawija się i podnosi CAŁY
// wiersz — czyli podnosi ekran „Ja", z którego biblioteka właśnie się
// wyprowadziła, żeby go obniżyć.
check('Podpis wejścia mieści się w jednej linii wiersza menu (≤ 36 znaków)',
  [0, 1, 3, 11].every((n) => libraryEntryHint(n).length <= 36),
  [0, 1, 3, 11].map((n) => `${n}:${libraryEntryHint(n).length}`).join(' '));

// ═════════════════════════════════════════════════════════════
// 5. WYPIS — co zobaczy zawodnik z Celem w Mocy i diagnozą wskazującą
//    Regenerację i Tolerancję. To jest treść sekcji 11 raportu.
// ═════════════════════════════════════════════════════════════
console.log('\n─── BIBLIOTEKA: zawodnik z Celem „Moc", gardła: Regeneracja, Tolerancja ───');
for (const u of unlockedMaterials({ goalSegmentIds: ['moc'], deficitSegmentIds: ['regeneracja', 'tolerancja'] })) {
  console.log(`\n  ${u.material.title}`);
  console.log(`    ${u.material.about}`);
  console.log(`    ${u.why}`);
  if (u.material.sharedNote) console.log(`    ${u.material.sharedNote}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
// Celowo `throw`, a nie `process.exit(1)`: `process` wymaga `@types/node`,
// których tsconfig appki nie zaciąga — a te pliki są objęte `npx tsc --noEmit`
// (include: `**/*.ts`). Rzucony wyjątek daje ten sam niezerowy kod wyjścia,
// więc `tests/run-selftests.mjs` rozpoznaje porażkę tak samo.
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
