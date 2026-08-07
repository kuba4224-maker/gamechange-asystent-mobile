// WIEDZA B4 08.08.2026 — weryfikacja biblioteki materiałów (lib/materials.ts).
// Czysta logika, bez Supabase i bez React Native:
//
//   npx tsx lib/materials.selftest.ts
//
// Albo razem z resztą: `node tests/run-selftests.mjs`.
// Uruchom ponownie po każdej zmianie w lib/materials.ts ORAZ po każdej zmianie
// w lib/labels.ts (test 2 pilnuje zgodności obu plików).
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
