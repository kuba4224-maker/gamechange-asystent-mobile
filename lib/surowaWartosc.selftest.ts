// PLAN-D-F2 08.2026 (15.08.2026) — NOWY PLIK. STRAŻNIK ZADANIA F2.3.
//
//   npx tsx lib/surowaWartosc.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ═════════════════════════════════════════════════════════════════════
// ── PO CO TEN PLIK ISTNIEJE, SKORO `(E2-5)` JUŻ PRZEMIATA REPOZYTORIUM ─
//
// Bo `(E2-5)` w `lib/meczWKalendarzu.selftest.ts` szuka JEDNEGO ZAPISU:
// `SLOWNIK[x] ?? x`. To jest dobry detektor i ten plik go NIE POWTARZA —
// powtórzona lista długu rozjechałaby się z pierwszą i wtedy jeden strażnik
// świeciłby na zielono na tym, na czym drugi świeci na czerwono (ta sama
// decyzja, co w `pustkaWCalymRepo.selftest.ts` wobec `trzyPustki`).
//
// ⭐ POMIAR PASA F2, 15.08.2026: ta sama choroba ma DWIE POSTACIE, których
// tamten detektor NIE WIDZI. Jedna z nich siedzi dziś w repozytorium
// w 12 miejscach; druga nie ma ani jednego potwierdzonego przypadku — i jedno,
// i drugie jest wynikiem pomiaru, nie hipotezą.
//
//   ┌─ POSTAĆ 2 · SUROWY RENDER ────────────────────────────────────────
//   │ `<Text>{row.jakas_kolumna}</Text>` — wartość z bazy idzie na ekran
//   │ BEZ ŻADNEGO SŁOWNIKA. Nie ma tu `??`, więc `(E2-5)` przechodzi obok.
//   │
//   │ ⭐⭐ WYNIK POMIARU 15.08.2026, I JEST TO WYNIK NEGATYWNY: **ZERO
//   │ POTWIERDZONYCH DEFEKTÓW TEJ POSTACI**. Detektor dał JEDNEGO kandydata
//   │ (`profil.tsx :: addInjuryHistory`, `{row.injury_type}`), a przeczytanie
//   │ DROGI ZAPISU tej kolumny UNIEWINNIŁO go: `injury_type` nie jest
//   │ identyfikatorem — jest polem tekstowym, które zawodnik wypełnia sam
//   │ (`<TextInput … placeholder="np. skręcenie kostki">`). Renderowanie tego
//   │ wprost jest POPRAWNE. Zapisuję to jako uniewinnienie z dowodem (§3),
//   │ żeby następna sesja nie badała tego po raz drugi (**O55**).
//   │
//   │ ⛔ I DLATEGO TA KLASA MA TU STRAŻNIKA MIMO ZERA. Nazwa kolumny NIE
//   │ ROZSTRZYGA, czy wartość jest identyfikatorem — rozstrzyga to droga
//   │ zapisu. Detektor produkuje KANDYDATÓW; werdykt wymaga przeczytania,
//   │ skąd wartość pochodzi. Strażnik pilnuje, żeby każdy nowy kandydat
//   │ dostał ten werdykt, zamiast wejść do produktu bez pytania.
//   └───────────────────────────────────────────────────────────────────
//
//   ┌─ POSTAĆ 3 · WYCIEK PRZEZ HELPER ──────────────────────────────────
//   │ `segmentLabel(id)` w pliku, który rysuje, wygląda CZYSTO. Zepsuty
//   │ jest odwrót SCHOWANY WEWNĄTRZ funkcji (`lib/labels.ts`). Detektor
//   │ czytający plik rysujący nie ma jak tego zobaczyć — E2 zgłosił to sam
//   │ jako swoje Ryzyko 3 („nie widzi mapowania schowanego w funkcji
//   │ pomocniczej"), ale nikt tego nie policzył.
//   │ ⭐ ZMIERZONE: 12 wywołań w 5 plikach. ANI JEDEN z tych pięciu nie stoi
//   │ na liście długu `(E2-5)` — czyli cała ta piątka była do dziś NIEWIDZIALNA.
//   └───────────────────────────────────────────────────────────────────
//
// ⛔ ⭐ TEN PLIK NICZEGO NIE NAPRAWIA I NIE MA PRAWA ZACZĄĆ. Jego jedynym
// wynikiem jest LISTA MIEJSC z nazwą pliku i nazwą funkcji (**O63**: nazwa
// funkcji, nie numer linii — dopisany komentarz przesuwa numer i przypisuje
// cudzy błąd nie temu, kto go popełnił).
//
// ── DLACZEGO ZACZYNA NA ZIELONO ──────────────────────────────────────
// Strażnik czerwony od pierwszego dnia przestaje być czytany, a wtedy prawdziwy
// nowy błąd tonie w zastanym szumie. Stoi tu **ZAPADKA**: zastane trafienia są
// wymienione z nazwy, POLICZONE i wypisywane przy każdym uruchomieniu.
//
// ⭐ ZAPADKA JEST NA RÓWNOŚĆ, NIE NA „NIE MNIEJ NIŻ" — I TO JEST ŚWIADOMA
// ZMIANA WOBEC `(E2-5)`. Pas E2 zgłosił własną słabość (nota E2 §5.3): jego
// asercja wymaga JEDNEGO trafienia, więc naprawa 2 z 3 miejsc w pliku przechodzi
// bez śladu. Tutaj każda zmiana liczby — w górę i w dół — zapala strażnika
// z poleceniem zaktualizowania listy. ⚠️ Kosztem jest czerwień przy częściowej
// naprawie i to jest cena, którą płacę świadomie: dług, którego rozmiaru nikt
// nie zna, jest długiem, o którym nikt nie mówi. Siedem pozycji w jednym pliku
// docelowym to nie jest lista, przy której ten koszt boli.
//
// ⚠️ O53: żadnego `new URL(...)` — `tsconfig.json` ciągnie DOM, `tsc` pada z TS2769.
// ⚠️ O62: to nie zastępuje pełnej suity; `node tests/run-selftests.mjs`.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// ⭐ JEDNA implementacja „kod bez komentarzy" i „nazwa funkcji nad trafieniem",
// dwóch czytelników. Druga kopia rozjechałaby się z pierwszą — a wtedy dwa
// strażniki przypisywałyby to samo trafienie dwóm różnym funkcjom (**O63**).
import { zyweZrodlo, nazwaFunkcjiNad } from './trzyPustki';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

const libDir = dirname(fileURLToPath(import.meta.url));
const appRoot = dirname(libDir);

// ─────────────────────────────────────────────────────────────────────
// 1. CO PRZEMIATAMY I CZEGO NIE — obie decyzje z asercją, nie z wygody
// ─────────────────────────────────────────────────────────────────────

const KATALOGI = ['app', 'components', 'lib'];

/**
 * ⛔ `_diag_backup/` — STARA KOPIA EKRANÓW (29–30.07.2026), pomijana świadomie.
 *
 * ZMIERZONE 15.08.2026 przez pas F2: **9 plików `.tsx`, 1 trafienie** postaci
 * „surowy render" (`profil.tsx :: addInjuryHistory`) i **0** postaci „wyciek
 * przez helper" (`lib/labels.ts` powstał dopiero 08.08). Przemiatanie tego
 * katalogu raportowałoby stan sprzed dwóch tygodni jako żywy.
 *
 * ⭐ ALE TEN KATALOG NIE JEST BEZUŻYTECZNY: sekcja 5 puszcza na nim detektor
 * jako KONTROLĘ HISTORYCZNĄ (**O70**) — bez niej nie wiedzielibyśmy, czy
 * detektor postaci 2 w ogóle umie się zapalić, skoro dziś nie ma na czym.
 */
const KATALOGI_POMINIETE = new Set(['_diag_backup', 'node_modules', '.git', '.expo', 'assets']);

/**
 * ⛔ `*.selftest.ts` — strażniki, pomijane świadomie.
 *
 * Strażnik CYTUJE badany wzorzec w tekstach asercji i w atrapach wejścia, więc
 * przemiatanie go po sobie daje wyłącznie fałszywe trafienia. Ten sam wyjątek
 * mają `(E2-5)` i `pustkaWCalymRepo`, oba po pomiarze.
 *
 * ⚠️ WYJĄTEK MUSI BYĆ ZASŁUŻONY — i sprawdza to asercja niżej: plik, który nie
 * importuje klienta Supabase i nie jest importowany przez żaden ekran, nie ma
 * jak niczego zawodnikowi narysować.
 */
function czyPomijamy(rel: string): boolean {
  return rel.endsWith('.selftest.ts');
}

function chodzPo(katalog: string, out: string[] = []): string[] {
  if (!existsSync(katalog)) return out;
  for (const wpis of readdirSync(katalog)) {
    if (KATALOGI_POMINIETE.has(wpis)) continue;
    const p = join(katalog, wpis);
    if (statSync(p).isDirectory()) chodzPo(p, out);
    else if (p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const relatywnie = (p: string): string => relative(appRoot, p).split(sep).join('/');

const WSZYSTKIE_PLIKI = KATALOGI.flatMap((k) => chodzPo(join(appRoot, k))).map(relatywnie).sort();
const PLIKI_PRZEMIATANE = WSZYSTKIE_PLIKI.filter((p) => !czyPomijamy(p));

// ─────────────────────────────────────────────────────────────────────
// 2. DWA DETEKTORY — obie postacie, których `(E2-5)` nie widzi
// ─────────────────────────────────────────────────────────────────────

export type Trafienie = { funkcja: string; fragment: string };

/**
 * ⭐ POSTAĆ 2 — SUROWY RENDER: wartość z bazy jako DZIECKO TEKSTOWE JSX,
 * bez żadnego słownika po drodze: `<Text …>{row.injury_type}</Text>`.
 *
 * ⚠️ Warunkiem trafienia jest stanie MIĘDZY `>` a `<`. To nie jest ozdoba
 * składniowa — to jedyna rzecz, która odróżnia napis na ekranie od
 * `key={row.segment_id}`, `segmentId={focusBlock.segment_id}` i
 * `style={styles.cardSegment}`. ZMIERZONE 15.08.2026: bez tego warunku
 * detektor dawał **5 trafień, z czego 4 fałszywe** (dwa `key`, jeden prop,
 * jeden styl). Z warunkiem: 1 trafienie, prawdziwe.
 *
 * ⚠️ CZEGO NIE UMIE, wprost: nie widzi wartości wplecionej w szablon
 * (`{`${x.segment_id} — …`}`) ani przepuszczonej przez zmienną pomocniczą
 * dwie linie wyżej. Łapie zapis, który ludzie naprawdę piszą.
 */
export function surowyRenderNazwy(zywy: string): Trafienie[] {
  // Kolumny, których wartość jest IDENTYFIKATOREM, a nie zdaniem dla człowieka.
  // ⚠️ `_note`, `_description`, `title` celowo poza listą: tam treść pisze
  // człowiek i renderowanie jej wprost jest poprawne, nie wyciekiem.
  const PODEJRZANY_OGON = /(_type|_id|_location|_reason|_category|_response|_direction|segment|segmentId)$/i;
  const re = />\s*\{\s*([A-Za-z_$][\w$]*(?:\??\.[\w$]+)*)\s*\}\s*</g;
  const out: Trafienie[] = [];
  let m: RegExpExecArray | null = re.exec(zywy);
  while (m !== null) {
    const ogon = m[1].split('.').pop() ?? '';
    if (PODEJRZANY_OGON.test(ogon)) {
      out.push({ funkcja: nazwaFunkcjiNad(zywy, m.index), fragment: m[0].replace(/\s+/g, ' ').trim() });
    }
    m = re.exec(zywy);
  }
  return out;
}

/** Czy plik w ogóle sprowadza do siebie ten helper (bezpośrednio albo przez re-eksport). */
export function importujeHelper(zywy: string, nazwa: string): boolean {
  return new RegExp(`import\\s*\\{[^}]*\\b${nazwa}\\b[^}]*\\}\\s*from`, 'm').test(zywy);
}

/**
 * ⭐ POSTAĆ 3 — WYCIEK PRZEZ HELPER: wywołanie funkcji, która przy nieznanej
 * wartości oddaje SUROWE `id`. Miejsce wywołania wygląda czysto; zepsuty jest
 * odwrót w środku funkcji.
 *
 * ⚠️ Trzy rzeczy, które trzeba wyciąć, żeby liczba znaczyła to, co mówi
 * (wszystkie ZMIERZONE 15.08.2026 jako fałszywe trafienia):
 *   • listy importów — `import { …, segmentLabel, … }` (1 fałszywe);
 *   • DEKLARACJA funkcji — `export function segmentLabel(` (1 fałszywe);
 *   • ⭐ `props.segmentLabel` / `styles.segmentLabel` / `segmentLabel={…}` —
 *     `components/FocusBlockPlanner.tsx` ma PROP o tej samej nazwie i nie woła
 *     tej funkcji ani razu (3 fałszywe). Wycina je warunek „plik musi
 *     importować helper".
 */
export function wywolaniaHelpera(zywy: string, nazwa: string): Trafienie[] {
  // Linie importu zamieniam na spacje, a nie kasuję — inaczej przesunąłby się
  // każdy indeks i `nazwaFunkcjiNad` przypisałaby trafienie cudzej funkcji.
  const bezImportow = zywy.replace(/^\s*import\s[\s\S]*?from\s*['"][^'"]*['"];?/gm,
    (m) => m.replace(/[^\n]/g, ' '));
  const re = new RegExp(`\\b${nazwa}\\s*\\(|[(,]\\s*${nazwa}\\s*[),]`, 'g');
  const out: Trafienie[] = [];
  let m: RegExpExecArray | null = re.exec(bezImportow);
  while (m !== null) {
    const przed = bezImportow.slice(Math.max(0, m.index - 20), m.index);
    if (!/(?:^|\W)function\s+$/.test(przed)) {
      out.push({
        funkcja: nazwaFunkcjiNad(bezImportow, m.index),
        fragment: bezImportow.slice(m.index, m.index + 46).replace(/\s+/g, ' ').trim(),
      });
    }
    m = re.exec(bezImportow);
  }
  return out;
}

/** Helper, którego pilnujemy. Definicja i dowód defektu: `lib/labels.ts`. */
const HELPER = 'segmentLabel';
const PLIK_HELPERA = 'lib/labels.ts';

// ─────────────────────────────────────────────────────────────────────
// 3. ⭐ DŁUG ZASTANY — zapadka. Wymieniony z nazwy, POLICZONY, wypisywany.
// ─────────────────────────────────────────────────────────────────────
// ⚠️ Klucz to `plik :: funkcja` (**O63**), a `ile` to liczba miejsc pod tym
// kluczem w dniu wpisania. Obie liczby są WYNIKIEM pasa F2, nie jego porażką:
// polecenie mówi wprost, że pas ma ZMIERZYĆ dwudziestkę i naprawić to, co
// naprawialne z `lib/labels.ts` — a nie wejść w cudze ekrany.

type PozycjaDlugu = { klucz: string; kto: string; co: string; ile: number };

/**
 * ⭐ POSTAĆ 2 — surowy render. **LISTA PUSTA I TO JEST WYNIK, NIE BRAK PRACY.**
 * Zmierzone 15.08.2026: jeden kandydat, uniewinniony niżej z dowodem.
 */
const DLUG_SUROWY_RENDER: PozycjaDlugu[] = [];

/**
 * ⭐ KANDYDACI SPRAWDZENI I UNIEWINNIENI — z dowodem, nie z opinii.
 *
 * ⛔ TO NIE JEST LISTA WYJĄTKÓW „BO TAK WYGODNIE". Detektor umie zobaczyć
 * tylko KSZTAŁT (`<Text>{x.y}</Text>` przy nazwie wyglądającej na identyfikator).
 * O tym, czy to defekt, rozstrzyga DROGA ZAPISU tej kolumny — a tego żaden
 * regex nie przeczyta. Dlatego każde uniewinnienie stoi tu razem z asercją,
 * która UPADNIE, gdy przesłanka przestanie być prawdziwa.
 */
type Uniewinniony = { klucz: string; dlaczego: string; dowod: (zrodlo: string) => boolean };

const KANDYDACI_UNIEWINNIENI: Uniewinniony[] = [
  {
    klucz: 'app/(tabs)/profil.tsx :: addInjuryHistory',
    dlaczego: '`{row.injury_type}` NIE jest wyciekiem: `injury_history.injury_type` to POLE '
      + 'TEKSTOWE, które zawodnik wypełnia sam (`<TextInput … placeholder="np. skręcenie kostki">`, '
      + 'zapis `injury_type: injuryType`). Kolumna nie ma FK ani CHECK-a i nie ma ich mieć — '
      + 'to nie jest identyfikator, tylko zdanie napisane przez człowieka. '
      + '⭐ Pokazanie go wprost jest POPRAWNE; podstawienie tam słownika byłoby błędem. '
      + '⚠️ DOWÓD PONIŻEJ UPADNIE, gdy ktoś zamieni to pole na Picker ze słownikiem — '
      + 'i wtedy ten sam render STANIE SIĘ wyciekiem, a strażnik o tym powie',
    dowod: (zrodlo) => /injury_type\s*:\s*injuryType/.test(zrodlo)
      && /<TextInput[^>]*value=\{injuryType\}/.test(zrodlo),
  },
];

/**
 * ⭐ POSTAĆ 3 — wyciek przez `segmentLabel()`. Zmierzone 15.08.2026 przez pas F2.
 *
 * ⛔ TO JEST TA PIĄTKA PLIKÓW, O KTÓREJ MÓWI POLECENIE F2 — ale NIE jest to
 * piątka wskazana w nocie E2 §11 poz. 2 (`cele`, `kalendarz`, `mecz`, `dzis`,
 * `materials`). Tamte pięć plików **nie woła `segmentLabel()` ani razu**;
 * indeksują `SEGMENT_LABELS` wprost i dlatego stoją na liście `(E2-5)`.
 * Poniższe pięć woła helper — i dlatego były niewidzialne.
 */
const WYCIEK_PRZEZ_HELPER: PozycjaDlugu[] = [
  {
    klucz: 'app/(tabs)/ja.tsx :: load',
    kto: '⛔ DŁUG BEZ WŁAŚCICIELA — ekran „Ja", nieprzydzielony',
    co: '`deficits.map(([id]) => segmentLabel(id))` — lista deficytów zawodnika',
    ile: 1,
  },
  {
    klucz: 'components/DiagnosisProfileView.tsx :: tiers',
    kto: '⛔ DŁUG BEZ WŁAŚCICIELA — widok profilu diagnozy, nieprzydzielony',
    co: 'nazwa deficytu, nazwa ukrytej przyczyny i lista `map(segmentLabel).join(", ")` '
      + '— ⭐ TU nazwa stoi SAMODZIELNIE, więc komunikat „nie znam" wchodzi wprost',
    ile: 3,
  },
  {
    klucz: 'components/DiagnosisProfileView.tsx :: SekcjaWaskiegoGardla',
    kto: '⛔ DŁUG BEZ WŁAŚCICIELA — widok profilu diagnozy, nieprzydzielony',
    co: '⭐ NAJWAŻNIEJSZE MIEJSCE CAŁEJ LISTY: `Twoje wąskie gardło to ${segmentLabel(cel.segmentId)} '
      + '— obszar z grupy …`. Zawodnik czyta tu nazwę obszaru, KTÓRY SAM WYBRAŁ. '
      + '⚠️ Nazwa jest WPLECIONA W ZDANIE, więc naprawa nie może być podmianą napisu '
      + '— ekran musi narysować obie gałęzie osobno',
    ile: 3,
  },
  {
    klucz: 'components/diagnosisProfile.ts :: nameOf',
    kto: '⛔ DŁUG BEZ WŁAŚCICIELA — warstwa danych profilu diagnozy, nieprzydzielony',
    co: '`map(segmentLabel).join(" + ")` i `segmentLabel(inf.from)` — nazwy w grafie przyczyn',
    ile: 2,
  },
  {
    klucz: 'components/diagnosisProfile.ts :: classify',
    kto: '⛔ DŁUG BEZ WŁAŚCICIELA — warstwa danych profilu diagnozy, nieprzydzielony',
    co: '`name: segmentLabel(id)` w `GroupedSegment` — nazwa idzie dalej do widoku',
    ile: 1,
  },
  {
    klucz: 'lib/rediagnosis.ts :: buildRediagnosisView',
    kto: '⛔ DŁUG BEZ WŁAŚCICIELA — rediagnoza przy zamykaniu Bloku, nieprzydzielony',
    co: '`const segmentName = segmentLabel(segmentId)` — wplatane w zdania rediagnozy',
    ile: 1,
  },
  {
    klucz: `${PLIK_HELPERA} :: ${HELPER}`,
    kto: '⚠️ PAS F2 — jedyna pozycja W MOIM PLIKU. NIE jest wyciekiem: wejściem jest '
      + '`SEGMENTS_BY_PILLAR_IDS`, lista wpisana ręcznie, a osobna asercja w '
      + '`labels.selftest.ts` pilnuje, że każde jej id jest nazywalne',
    co: '`SEGMENTS_BY_PILLAR` woła `segmentLabel(id)` dla id z listy filarów',
    ile: 1,
  },
];

// ─────────────────────────────────────────────────────────────────────
// 4. BATERIA — te same asercje na prawdziwych i na zepsutych zasadach
// ─────────────────────────────────────────────────────────────────────
// ⚠️ MUTACJA, KTÓRA NIE PODNOSI LICZBY FAIL-i, OZNACZA ASERCJĘ, KTÓRA NICZEGO
// NIE PILNUJE (**O71** + znalezisko E1: dwie mutacje pasa C3b przestały cokolwiek
// łapać i świeciły na zielono). Wszystko żyje w obiekcie `Zasady` — ani jedna
// mutacja nie dotyka dysku, więc cofnięcie jest STRUKTURALNE, nie edycją pliku.

type Zasady = {
  szukajRenderu: (zywy: string) => Trafienie[];
  szukajHelpera: (zywy: string) => Trafienie[];
  /** Czy w tym pliku w ogóle patrzymy na helper. Osobne pole, żeby dało się je oślepić. */
  patrzNaHelper: (plik: string, zywy: string) => boolean;
  /** Ścieżka → treść. Wstrzykiwane, żeby mutacja nie musiała dotykać dysku. */
  zrodla: Record<string, string>;
  dlugRender: PozycjaDlugu[];
  dlugHelper: PozycjaDlugu[];
  uniewinnieni: Uniewinniony[];
};

type Znalezione = { klucz: string; fragment: string };

function przemiec(z: Zasady, co: 'render' | 'helper'): Znalezione[] {
  const out: Znalezione[] = [];
  for (const plik of Object.keys(z.zrodla).sort()) {
    const zywy = zyweZrodlo(z.zrodla[plik]);
    if (co === 'helper' && !z.patrzNaHelper(plik, zywy)) continue;
    const traf = co === 'render' ? z.szukajRenderu(zywy) : z.szukajHelpera(zywy);
    for (const t of traf) out.push({ klucz: `${plik} :: ${t.funkcja}`, fragment: t.fragment });
  }
  return out;
}

type WynikBaterii = { label: string; ok: boolean; detail: string };

/** Zapadka na RÓWNOŚĆ liczby, w obie strony — patrz nagłówek pliku. */
function zapadka(
  nazwa: string, znalezione: Znalezione[], dlug: PozycjaDlugu[],
  uniewinnieni: Uniewinniony[], zapisz: (l: string, ok: boolean, d?: string) => void,
): void {
  const teraz = new Map<string, number>();
  for (const t of znalezione) teraz.set(t.klucz, (teraz.get(t.klucz) ?? 0) + 1);

  // ⭐ Nowy kandydat to taki, który nie jest ani znanym długiem, ani sprawdzonym
  // i uniewinnionym. Nie mówię „nowy defekt", bo detektor tego nie wie — mówię
  // „nowy kandydat" i żądam werdyktu.
  const nowe = [...teraz.keys()]
    .filter((k) => !dlug.some((d) => d.klucz === k) && !uniewinnieni.some((u) => u.klucz === k));
  zapisz(`⭐ ${nazwa}: ANI JEDNEGO nowego kandydata poza długiem i uniewinnionymi`,
    nowe.length === 0,
    `${nowe.length} NOWYCH — przeczytaj DROGĘ ZAPISU każdej z tych kolumn i wydaj werdykt: `
    + `dług (identyfikator z zamkniętej dziedziny) albo uniewinnienie (tekst pisany przez człowieka). `
    + `${nowe.join(' | ')}`);

  const zniknietе = dlug.filter((d) => (teraz.get(d.klucz) ?? 0) === 0);
  zapisz(`⭐ ${nazwa}: każda pozycja długu NADAL istnieje — naprawione wypada z listy`,
    zniknietе.length === 0,
    `NAPRAWIONE, usuń z listy: ${zniknietе.map((d) => d.klucz).join(' | ')}`);

  const rozjazd = dlug.filter((d) => (teraz.get(d.klucz) ?? 0) !== 0 && (teraz.get(d.klucz) ?? 0) !== d.ile);
  zapisz(`⭐ ${nazwa}: liczba miejsc pod każdym kluczem zgadza się CO DO JEDNEGO`,
    rozjazd.length === 0,
    rozjazd.map((d) => `${d.klucz}: było ${d.ile}, jest ${teraz.get(d.klucz)}`).join(' | '));
}

function bateria(z: Zasady): WynikBaterii[] {
  const r: WynikBaterii[] = [];
  const zapisz = (label: string, ok: boolean, detail = '') => r.push({ label, ok, detail });

  const render = przemiec(z, 'render');
  const helper = przemiec(z, 'helper');

  zapadka('postać 2 (surowy render)', render, z.dlugRender, z.uniewinnieni, zapisz);
  zapadka('postać 3 (wyciek przez helper)', helper, z.dlugHelper, [], zapisz);

  // ⭐ UNIEWINNIENIE NIE MA PRAWA ZGNIĆ — dwie asercje, obie potrzebne.
  //
  //  1. kandydat MUSI nadal istnieć. Gdy zniknie (ktoś przestał to rysować),
  //     uniewinnienie mówi o kodzie, którego nie ma — i wisi tu jako wyjątek,
  //     pod którym za tydzień da się przemycić prawdziwy defekt.
  const zgubieni = z.uniewinnieni.filter((u) => !render.some((t) => t.klucz === u.klucz));
  zapisz('⭐ każdy UNIEWINNIONY kandydat nadal istnieje — inaczej wyjątek wisi nad pustką',
    zgubieni.length === 0,
    `zniknęły, usuń z KANDYDACI_UNIEWINNIENI: ${zgubieni.map((u) => u.klucz).join(' | ')}`);

  //  2. ⭐ PRZESŁANKA uniewinnienia musi być NADAL PRAWDZIWA. To jest sedno:
  //     `{row.injury_type}` jest poprawne WYŁĄCZNIE dopóty, dopóki `injury_type`
  //     wypełnia człowiek. W dniu, w którym ktoś zamieni to pole na Picker ze
  //     słownikiem, ten sam render stanie się wyciekiem — i ta asercja to powie,
  //     zamiast milczeć, bo „przecież było sprawdzone".
  const zwietrzale = z.uniewinnieni
    .filter((u) => !u.dowod(zyweZrodlo(z.zrodla[u.klucz.split(' :: ')[0]] ?? '')));
  zapisz('⛔ ⭐ przesłanka KAŻDEGO uniewinnienia jest nadal prawdziwa — inaczej werdykt wygasa',
    zwietrzale.length === 0,
    `dowód upadł, kandydat wraca pod ocenę: ${zwietrzale.map((u) => u.klucz).join(' | ')}`);

  // ── Strażnik strażnika: milczenie z powodu awarii wygląda jak czystość.
  zapisz('(strażnik strażnika) mam co przemiatać',
    Object.keys(z.zrodla).length >= 50, `plików: ${Object.keys(z.zrodla).length}`);

  // ⚠️ Sformułowane na KANDYDATÓW, nie na defekty. Postać 2 ma dziś ZERO
  // potwierdzonych defektów i wymaganie od niej trafienia byłoby wymaganiem,
  // żeby produkt był zepsuty. Ale reguła musi COŚ widzieć — inaczej milczy
  // przez awarię, a wygląda, jakby milczała przez czystość.
  zapisz('(strażnik strażnika) OBIE reguły coś widzą — zero jest podejrzane, nie dobre',
    render.length > 0 && helper.length > 0, `kandydatów: ${render.length} · wywołań: ${helper.length}`);

  // ⛔ Ani jedno trafienie nie jest anonimowe (**O63**).
  const bezNazwy = [...render, ...helper]
    .filter((t) => t.klucz.endsWith(':: ') || t.klucz.includes(':: undefined'));
  zapisz('⛔ każde trafienie ma NAZWĘ PLIKU I FUNKCJI, nie numer linii (O63)',
    bezNazwy.length === 0, bezNazwy.map((t) => t.klucz).join(' | '));

  // ⛔ Wyciek przez helper ma sens tylko dopóty, dopóki helper NAPRAWDĘ oddaje
  // surową wartość. W dniu, w którym ktoś to naprawi, ta lista ma zniknąć,
  // a nie zostać jako pomnik.
  const zrodloHelpera = z.zrodla[PLIK_HELPERA] ?? '';
  zapisz('⛔ ⭐ helper NADAL oddaje surowe id — inaczej cała postać 3 jest nieaktualna',
    /SEGMENT_LABELS\s*\[\s*id\s*\]\s*\?\?\s*id/.test(zyweZrodlo(zrodloHelpera)),
    `${PLIK_HELPERA} zmieniony — sprawdź, czy defekt naprawiony; jeśli tak, skasuj WYCIEK_PRZEZ_HELPER`);

  return r;
}

const ZRODLA_PRAWDZIWE: Record<string, string> = Object.fromEntries(
  PLIKI_PRZEMIATANE.map((p) => [p, readFileSync(join(appRoot, p), 'utf8')]),
);

const ZASADY_PRAWDZIWE: Zasady = {
  szukajRenderu: surowyRenderNazwy,
  szukajHelpera: (zywy) => wywolaniaHelpera(zywy, HELPER),
  patrzNaHelper: (plik, zywy) => plik === PLIK_HELPERA || importujeHelper(zywy, HELPER),
  zrodla: ZRODLA_PRAWDZIWE,
  dlugRender: DLUG_SUROWY_RENDER,
  dlugHelper: WYCIEK_PRZEZ_HELPER,
  uniewinnieni: KANDYDACI_UNIEWINNIENI,
};

console.log('surowaWartosc.selftest.ts — surowa wartość z bazy na ekranie, POSTACIE 2 i 3 (F2.3)\n');

// ═════════════════════════════════════════════════════════════════════
console.log('1. CO PRZEMIATAM, A CZEGO NIE — obie decyzje zmierzone');
// ═════════════════════════════════════════════════════════════════════
{
  const selftesty = WSZYSTKIE_PLIKI.filter((p) => p.endsWith('.selftest.ts'));
  console.log(`   katalogi: ${KATALOGI.join(', ')}`);
  console.log(`   plików znalezionych: ${WSZYSTKIE_PLIKI.length}`
    + ` · przemiatanych: ${PLIKI_PRZEMIATANE.length} · pominiętych selftestów: ${selftesty.length}`);
  console.log('   ⛔ pominięty katalog _diag_backup/: 9 plików .tsx — 1 trafienie postaci 2, '
    + '0 postaci 3 (zmierzone 15.08.2026). Kontrola historyczna na nich: sekcja 5');

  check('przemiatam wszystkie trzy katalogi',
    KATALOGI.every((k) => PLIKI_PRZEMIATANE.some((p) => p.startsWith(`${k}/`))),
    KATALOGI.filter((k) => !PLIKI_PRZEMIATANE.some((p) => p.startsWith(`${k}/`))).join(', '));

  check('⛔ `_diag_backup/` NIE jest przemiatany — stan sprzed dwóch tygodni nie wraca jako żywy',
    !PLIKI_PRZEMIATANE.some((p) => p.includes('_diag_backup')), '');

  // ⚠️ WYJĄTEK MUSI BYĆ ZASŁUŻONY. Selftest, który zostałby zaimportowany przez
  // ekran, przestaje być czystym strażnikiem i musi wrócić pod regułę.
  const importowaneSelftesty = selftesty.filter((s) => {
    const modul = s.replace(/\.ts$/, '');
    return PLIKI_PRZEMIATANE.some((p) =>
      new RegExp(`from\\s*['"][^'"]*${modul.split('/').pop()}['"]`).test(ZRODLA_PRAWDZIWE[p] ?? ''));
  });
  check('⛔ ⭐ pominięcie selftestów jest ZASŁUŻONE — żaden nie jest importowany przez plik produkcyjny',
    importowaneSelftesty.length === 0,
    `selftest w drodze na ekran: ${importowaneSelftesty.join(', ')}`);

  check('⛔ pominięte są WYŁĄCZNIE selftesty — nic produkcyjnego nie wypadło',
    WSZYSTKIE_PLIKI.filter((p) => !PLIKI_PRZEMIATANE.includes(p)).every((p) => p.endsWith('.selftest.ts')),
    WSZYSTKIE_PLIKI.filter((p) => !PLIKI_PRZEMIATANE.includes(p) && !p.endsWith('.selftest.ts')).join(', '));
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n2. ⛔ ZERO POWTÓRZEŃ — postać 1 należy do `(E2-5)` i tylko do niego');
// ═════════════════════════════════════════════════════════════════════
// Dwie listy tego samego długu rozjeżdżają się w tydzień. Ten plik NIE mierzy
// wzorca `SLOWNIK[x] ?? x` i ta asercja pilnuje, że tamta lista nadal istnieje
// tam, gdzie ma — inaczej postać 1 zniknęłaby po cichu razem z jej strażnikiem.
{
  const PLIK_E2 = 'lib/meczWKalendarzu.selftest.ts';
  const zrodloE2 = existsSync(join(appRoot, PLIK_E2)) ? readFileSync(join(appRoot, PLIK_E2), 'utf8') : '';

  check('⛔ ⭐ lista długu postaci 1 nadal żyje w `(E2-5)` — nie kopiuję jej tutaj',
    /DLUG_SUROWEJ_WARTOSCI/.test(zrodloE2) && /surowaWartoscJakoNazwa/.test(zrodloE2),
    `${PLIK_E2} przestał trzymać listę postaci 1 — albo przenieś ją tutaj świadomie, albo przywróć`);

  // ⚠️ Pytam o DEKLARACJĘ, nie o wystąpienie nazwy. Ten plik wymienia
  // `surowaWartoscJakoNazwa` w komentarzach i w treści asercji — gdyby asercja
  // szukała samej nazwy, zapalałaby się na własnej dokumentacji i jedynym
  // sposobem na jej uciszenie byłoby skasowanie wyjaśnienia.
  const mojeZrodlo = readFileSync(join(libDir, 'surowaWartosc.selftest.ts'), 'utf8');
  check('⛔ ten plik NIE ma drugiej kopii detektora postaci 1',
    !/function\s+surowaWartoscJakoNazwa/.test(mojeZrodlo)
    && !/SLOWNIK\?\?|DLUG_SUROWEJ_WARTOSCI\s*[:=]\s*\[/.test(mojeZrodlo),
    'powstała druga kopia detektora `SLOWNIK[x] ?? x` — dwie listy rozjadą się');

  // ⭐ …i nie ma też przecięcia list: plik, który jest w długu `(E2-5)`, nie ma
  // prawa stać w moich listach pod tym samym tytułem. Wolno mu stać tu z INNEJ
  // postaci — i `profil.tsx` właśnie tak stoi (postać 1 u E2, postać 2 u mnie).
  const mojePliki = [...DLUG_SUROWY_RENDER, ...WYCIEK_PRZEZ_HELPER].map((d) => d.klucz.split(' :: ')[0]);
  console.log(`   pliki w moich dwóch listach: ${[...new Set(mojePliki)].join(', ')}`);
  console.log('   ⚠️ `app/(tabs)/profil.tsx` i `lib/labels.ts` stoją TAKŻE w `(E2-5)` — '
    + 'z INNEJ postaci choroby, nie z tej samej. To nie jest powtórzenie.');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n3. ⭐ CO ZNALAZŁEM — pełna lista, nazwa pliku i funkcji');
// ═════════════════════════════════════════════════════════════════════
{
  const render = przemiec(ZASADY_PRAWDZIWE, 'render');
  const helper = przemiec(ZASADY_PRAWDZIWE, 'helper');

  const wypisz = (tytul: string, znal: Znalezione[], dlug: PozycjaDlugu[]) => {
    const pliki = new Set(znal.map((t) => t.klucz.split(' :: ')[0]));
    console.log(`\n   ── ${tytul}: ${znal.length} miejsc w ${pliki.size} plikach`);
    for (const d of dlug) {
      const ile = znal.filter((t) => t.klucz === d.klucz).length;
      console.log(`      • ${d.klucz} — ${ile} miejsc`);
      console.log(`        ${d.kto}`);
      console.log(`        ${d.co}`);
    }
    for (const t of znal.filter((x) => !dlug.some((d) => d.klucz === x.klucz))) {
      console.log(`      • ${t.klucz} — ⛔ NOWE, nie ma go w długu zastanym`);
      console.log(`        ${t.fragment}`);
    }
  };

  console.log('\n   ── POSTAĆ 2 · surowy render wartości z bazy');
  console.log(`      ⭐ POTWIERDZONYCH DEFEKTÓW: ${DLUG_SUROWY_RENDER.length} — `
    + 'klasa jest dziś PUSTA i to jest wynik pomiaru, nie brak pracy');
  console.log(`      kandydatów z detektora: ${render.length}, wszyscy sprawdzeni:`);
  for (const u of KANDYDACI_UNIEWINNIENI) {
    console.log(`      • ${u.klucz} — ✅ UNIEWINNIONY`);
    console.log(`        ${u.dlaczego}`);
  }
  for (const t of render.filter((x) => !KANDYDACI_UNIEWINNIENI.some((u) => u.klucz === x.klucz)
    && !DLUG_SUROWY_RENDER.some((d) => d.klucz === x.klucz))) {
    console.log(`      • ${t.klucz} — ⛔ NOWY KANDYDAT, bez werdyktu: ${t.fragment}`);
  }

  wypisz('POSTAĆ 3 · wyciek przez `segmentLabel()`', helper, WYCIEK_PRZEZ_HELPER);
  console.log('');

  for (const w of bateria(ZASADY_PRAWDZIWE)) check(w.label, w.ok, w.detail);

  check('⭐ dług jest POLICZONY i wypisany, nie schowany',
    [...DLUG_SUROWY_RENDER, ...WYCIEK_PRZEZ_HELPER]
      .every((d) => d.kto.length > 10 && d.co.length > 20 && d.ile > 0),
    'pozycja bez właściciela, bez opisu defektu albo z zerową liczbą');

  // ⛔ Uniewinnienie bez uzasadnienia i bez sprawdzalnego dowodu jest zwykłym
  // wyciszeniem strażnika. Nazwa pola `dowod` tego nie gwarantuje — ta asercja tak.
  check('⛔ ⭐ każde uniewinnienie ma UZASADNIENIE i DOWÓD, który da się obalić',
    KANDYDACI_UNIEWINNIENI.every((u) => u.dlaczego.length > 60 && typeof u.dowod === 'function'
      && u.dowod('') === false),
    'uniewinnienie, którego dowód przechodzi na pustym pliku, nie jest dowodem');

  const niczyje = [...DLUG_SUROWY_RENDER, ...WYCIEK_PRZEZ_HELPER].filter((d) => d.kto.includes('BEZ WŁAŚCICIELA'));
  console.log(`   ⭐ z tego DO ROZDZIELENIA przez sesję nawigującą: ${niczyje.length} pozycji, `
    + `${niczyje.reduce((s, d) => s + d.ile, 0)} miejsc`);
  check('⭐ każda niczyja pozycja mówi, CO dokładnie jest zepsute',
    niczyje.every((d) => /`/.test(d.co)), '');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n4. ⭐ TEST MUTACYJNY — liczba FAIL-i przy każdej mutacji');
// ═════════════════════════════════════════════════════════════════════
{
  const ROZMIAR = bateria(ZASADY_PRAWDZIWE).length;
  const failePrawdziwe = bateria(ZASADY_PRAWDZIWE).filter((w) => !w.ok).length;

  const zeZrodlem = (plik: string, tresc: string): Record<string, string> =>
    ({ ...ZRODLA_PRAWDZIWE, [plik]: tresc });

  const MUTACJE: { nazwa: string; opis: string; zasady: Zasady }[] = [
    {
      nazwa: 'M1 · nowy ekran renderuje surową wartość z bazy',
      opis: 'ktoś dokłada `<Text>{row.session_type}</Text>` w pliku spoza długu',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: zeZrodlem('app/(tabs)/biblioteka.tsx',
          'export default function Biblioteka(){ return (<View><Text style={s.t}>{row.session_type}</Text></View>); }'),
      },
    },
    {
      nazwa: 'M2 · nowy plik zaczyna wołać `segmentLabel()`',
      opis: 'wyciek przez helper rozlewa się na szósty plik',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: zeZrodlem('lib/materials.ts',
          "import { segmentLabel } from './labels';\n"
          + 'export function opisz(id: string){ return segmentLabel(id); }'),
      },
    },
    {
      nazwa: 'M3 · ⭐ uniewinniony kandydat znika z kodu, a wyjątek zostaje',
      opis: 'wyjątek wisi nad pustką i za tydzień da się pod nim przemycić prawdziwy defekt',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: zeZrodlem('app/(tabs)/profil.tsx', 'export const nic = 1;'),
      },
    },
    {
      nazwa: 'M9 · ⭐⭐ PRZESŁANKA UNIEWINNIENIA UPADA — pole tekstowe staje się Pickerem',
      opis: '`injury_type` przestaje być zdaniem człowieka, a staje się identyfikatorem ze '
        + 'słownika — ten sam render, który był POPRAWNY, staje się wyciekiem. Bez tej mutacji '
        + 'uniewinnienie byłoby zdaniem raz napisanym i nigdy więcej niesprawdzonym',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: zeZrodlem('app/(tabs)/profil.tsx',
          'const INJURY_TYPE_LABELS = { skrecenie: "Skręcenie", naderwanie: "Naderwanie" };\n'
          + 'const addInjuryHistory = async () => { await q().insert({ injury_type: injuryTypeId }); };\n'
          + 'const R = () => (<View><Picker selectedValue={injuryTypeId} />'
          + '<Text style={s.historyType}>{row.injury_type}</Text></View>);'),
      },
    },
    {
      nazwa: 'M4 · ⭐ dług URÓSŁ pod kluczem, który już jest na liście',
      opis: 'wzorzec mnoży się w pliku raz wpisanym na listę — to jest ta dziura, '
        + 'którą pas E2 zgłosił u siebie jako słabość (nota E2 §5.3)',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: zeZrodlem('lib/rediagnosis.ts',
          "import { segmentLabel } from './labels';\n"
          + 'export const buildRediagnosisView = (segmentId: string) => {\n'
          + '  const a = segmentLabel(segmentId); const b = segmentLabel(segmentId); return a + b; };'),
      },
    },
    {
      nazwa: 'M5 · ⭐ dług ZMALAŁ po cichu — naprawione 2 z 3 miejsc',
      opis: 'częściowa naprawa przechodzi bez śladu; DOKŁADNIE ten przypadek '
        + 'przepuszcza asercja „co najmniej jedno trafienie" z `(E2-5)`',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: zeZrodlem('components/diagnosisProfile.ts',
          "import { segmentLabel } from '../lib/labels';\n"
          + 'export const nameOf = (x: string) => segmentLabel(x);\n'
          + 'export const classify = (id: string) => ({ name: segmentLabel(id) });'),
      },
    },
    {
      nazwa: 'M6 · reguła oślepiona — warunek „dziecko tekstowe JSX" zdjęty',
      opis: '`key={row.segment_id}` i `style={styles.cardSegment}` wracają jako trafienia, '
        + 'czyli strażnik zaczyna wołać na fałszywych i nikt go już nie czyta',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        szukajRenderu: (zywy) => {
          const re = /\{\s*([A-Za-z_$][\w$]*(?:\??\.[\w$]+)+)\s*\}/g;
          const out: Trafienie[] = [];
          let m: RegExpExecArray | null = re.exec(zywy);
          while (m !== null) {
            if (/(_type|_id|_location|segment|segmentId)$/i.test(m[1].split('.').pop() ?? '')) {
              out.push({ funkcja: nazwaFunkcjiNad(zywy, m.index), fragment: m[0] });
            }
            m = re.exec(zywy);
          }
          return out;
        },
      },
    },
    {
      nazwa: 'M7 · reguła oślepiona — helper liczony we WSZYSTKICH plikach',
      opis: '`props.segmentLabel` z `FocusBlockPlanner.tsx` wraca jako wywołanie; '
        + 'ZMIERZONE: to jest 3 fałszywe trafienia w pliku, który tej funkcji nie woła ani razu',
      zasady: { ...ZASADY_PRAWDZIWE, patrzNaHelper: () => true },
    },
    {
      nazwa: 'M8 · ⭐ helper NAPRAWIONY, a lista postaci 3 zostaje jako pomnik',
      opis: 'ktoś naprawia `segmentLabel()`, a strażnik nadal liczy 12 wycieków, '
        + 'których już nie ma — czyli mówi o długu spłaconym',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: zeZrodlem(PLIK_HELPERA,
          'export const SEGMENT_LABELS: Record<string,string> = { moc: "Moc" };\n'
          + 'export function segmentLabel(id: string){ const o = opiszSegment(id); '
          + 'return o.znany ? o.etykieta : o.komunikat; }'),
      },
    },
  ];

  console.log(`\nbateria ma ${ROZMIAR} asercji · na prawdziwych zasadach FAIL-i: ${failePrawdziwe}\n`);
  check('⭐ bateria na PRAWDZIWYCH zasadach nie zapala ani jednej asercji',
    failePrawdziwe === 0, `FAIL-i: ${failePrawdziwe}`);

  let bezEfektu = 0;
  for (const m of MUTACJE) {
    const zapalone = bateria(m.zasady).filter((w) => !w.ok);
    console.log(`${m.nazwa}`);
    console.log(`   co psuje: ${m.opis}`);
    console.log(`   FAIL-i przy tej mutacji: ${zapalone.length} / ${ROZMIAR}`);
    for (const z of zapalone) console.log(`     • ${z.label}`);
    if (zapalone.length === 0) bezEfektu++;
  }

  // ⚠️ **O71** + znalezisko E1: mutacja bez efektu to asercja, która niczego nie
  // pilnuje. E1 zmierzył, że dwie mutacje pasa C3b przestały cokolwiek łapać PO
  // naprawie i świeciły na zielono — więc ta asercja jest tu, żeby taki stan
  // zapalił się sam, a nie czekał na następny pas.
  check('⭐ KAŻDA z dziewięciu mutacji zapala co najmniej jedną asercję (O71)',
    bezEfektu === 0, `mutacji bez żadnego efektu: ${bezEfektu}`);

  // ⛔ Cofnięcie jest STRUKTURALNE: mutanty to osobne obiekty `Zasady`, nie
  // edycje na dysku. Nie ma czego cofać i nie ma jak tego wypchnąć na produkcję.
  check('⛔ cofnięcie mutacji jest strukturalne — prawdziwe źródła nietknięte',
    ZASADY_PRAWDZIWE.zrodla === ZRODLA_PRAWDZIWE
    && Object.keys(ZRODLA_PRAWDZIWE).length === PLIKI_PRZEMIATANE.length,
    'obiekt prawdziwych zasad został podmieniony przez mutację');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n5. ⭐ KONTROLA HISTORYCZNA (O70) — detektor puszczony na chorobie');
// ═════════════════════════════════════════════════════════════════════
// „Strażnik, który nigdy nie zapalił się na prawdziwym defekcie, jest zbiorem
// zdań." Tu nie ma zgadywania: `_diag_backup/` to KOPIE EKRANÓW z 29–30.07.2026
// leżące na dysku — czyli stan produktu sprzed pasów A7, C3, C3b i E2.
//
// ⚠️ MÓWIĘ WPROST, CZEGO TA KONTROLA DOWODZI, A CZEGO NIE.
// DOWODZI: detektor postaci 2 UMIE się zapalić na kodzie, którego nie widział —
// i zapala się na tym samym kandydacie co dziś, czyli jego zachowanie nie zależy
// od tego, że został napisany pod dzisiejsze repozytorium.
// ⛔ NIE DOWODZI, że złapał defekt: to jest ten sam kandydat, którego §3
// UNIEWINNIŁ. Postać 2 nie ma dziś ANI JEDNEGO potwierdzonego defektu — ani
// w kodzie z dziś, ani w kopii z lipca. Napisanie tu „strażnik złapał
// siedemnastodniowy dług" byłoby zdaniem ładniejszym i nieprawdziwym.
//
// ⭐ PRAWDZIWĄ kontrolą historyczną tego pasa jest ta z `lib/labels.selftest.ts`:
// asercja usunięta stamtąd 15.08 przechodziła na ZEPSUTYM `segmentLabel`
// i przewracała się na NAPRAWIONYM. Zmierzone, nota F2 §8.5.
{
  const backup = join(appRoot, '_diag_backup');
  if (!existsSync(backup)) {
    check('⚠️ kontrola historyczna wymaga `_diag_backup/` — katalogu nie ma', false,
      'skasowanie `_diag_backup/` odbiera tej kontroli jedyne źródło stanu historycznego');
  } else {
    const stare = chodzPo(backup).map((p) => relative(backup, p).split(sep).join('/')).sort();
    const trafieniaStare = stare.flatMap((p) =>
      surowyRenderNazwy(zyweZrodlo(readFileSync(join(backup, p), 'utf8')))
        .map((t) => `${p} :: ${t.funkcja} — ${t.fragment}`));
    const helperStare = stare.flatMap((p) => {
      const zywy = zyweZrodlo(readFileSync(join(backup, p), 'utf8'));
      return importujeHelper(zywy, HELPER) ? wywolaniaHelpera(zywy, HELPER) : [];
    });

    console.log(`   plików w _diag_backup/: ${stare.length}`);
    for (const t of trafieniaStare) console.log(`   ⭐ ZAPALIŁ SIĘ: ${t}`);

    check('⭐ (O70) detektor postaci 2 ZAPALA SIĘ na kodzie, którego nie widział (29–30.07.2026)',
      trafieniaStare.length > 0, 'zero trafień na starym kodzie — detektor nie działa albo nie ma na czym');

    check('⚠️ (O70) …ale to ten sam KANDYDAT, którego §3 uniewinnił — nie defekt. '
      + 'Postać 2 nie ma potwierdzonego defektu ani dziś, ani w lipcu',
      trafieniaStare.every((t) => KANDYDACI_UNIEWINNIENI.some((u) => t.startsWith(u.klucz))),
      `⛔ NOWE w kopii historycznej, spoza uniewinnionych — sprawdź: ${trafieniaStare.join(' | ')}`);

    check('(O70) detektor postaci 3 NIE zapala się na kodzie sprzed powstania `lib/labels.ts`',
      helperStare.length === 0,
      `${helperStare.length} trafień — a `
      + '`lib/labels.ts` powstał 08.08.2026, więc w kopii z 29.07 nie ma czego wołać');
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
// Celowo `throw`, a nie `process.exit(1)` — ten sam powód, co w
// `lib/labels.selftest.ts`: `process` wymaga `@types/node`, których tsconfig
// appki nie zaciąga, a te pliki są objęte `npx tsc --noEmit`.
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
