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
/**
 * ⭐ PAS I2 16.08.2026 — DRUGA POŁOWA SŁOWNIKA OGONÓW, ZMIERZONA MUTACJAMI.
 *
 * ── CO BYŁO ZEPSUTE, CO DO POZYCJI ───────────────────────────────────
 * Lista ogonów wyżej opisuje NAZWY KOLUMN W BAZIE (`segment_id`, `injury_type`).
 * Ale surowa wartość NIE DOCHODZI DZIŚ NA EKRAN POD NAZWĄ KOLUMNY — dochodzi
 * pod nazwą POLA, do którego przepakował ją produkt. Pas F2 nadał temu polu
 * nazwę `surowy` (`OpisSegmentu = { znany: false; surowy; komunikat }`
 * w `lib/labels.ts`), a klucz z `diagnostics.scores` chodzi po ekranie wyniku
 * diagnozy jako gołe `id`.
 *
 * ⛔ ZMIERZONE 16.08.2026 TRZEMA MUTACJAMI NA DYSKU (nota I2):
 *   • `components/DiagnosisProfileView.tsx`, wiersz deficytu —
 *     `{opisDeficytu.surowy}` zamiast dwugałęziowego wyrażenia: **0 FAIL-i**;
 *   • ten sam wiersz, `{id}` (klucz z `diagnostics.scores`):  **0 FAIL-i**;
 *   • `app/(tabs)/biblioteka.tsx`, `{u.material.surowy}`:      **0 FAIL-i**
 *     — i to w pliku, którego NIE pilnuje ani `nazwaObszaruNaEkranie`
 *     (cztery pliki pasa G1), ani `(E2-5)`. Trzy strażniki, zero czerwieni.
 *   KONTROLA: ta sama pozycja z ogonem ze starej listy (`{opisDeficytu.surowy_id}`)
 *   dawała **2 FAIL-e** — czyli ślepota była w SŁOWNIKU, nie w regule „dziecko
 *   tekstowe JSX" ani w białych znakach.
 *
 * ⭐ ROZSZERZENIE KOSZTUJE DZIŚ ZERO: na `main` = `123e09c` daje **0 nowych
 * trafień** w 83 przemiatanych plikach i **0** w `_diag_backup/`. To nie jest
 * poszerzenie „na wszelki wypadek" — to zamknięcie dziury zmierzonej mutacją.
 *
 * ⚠️ `^id$` musi być ZAKOTWICZONE z obu stron: bez tego łapałoby `valid`,
 * `hybrid` i każdą nazwę kończącą się na „id".
 */
const OGON_PASA_I2 = /^(id|surowy|surowa|klucz)$|_surowy$|_klucz$/i;

export function surowyRenderNazwy(zywy: string): Trafienie[] {
  // Kolumny, których wartość jest IDENTYFIKATOREM, a nie zdaniem dla człowieka.
  // ⚠️ `_note`, `_description`, `title` celowo poza listą: tam treść pisze
  // człowiek i renderowanie jej wprost jest poprawne, nie wyciekiem.
  const PODEJRZANY_OGON = /(_type|_id|_location|_reason|_category|_response|_direction|segment|segmentId)$|^(id|surowy|surowa|klucz)$|_surowy$|_klucz$/i;
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

// ═════════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-G1 08.2026 (15.08.2026) — PRÓBKI SYNTETYCZNE.
// ⛔ MATERIAŁ DLA „CZY DETEKTOR ŻYJE" NIE MOŻE POCHODZIĆ Z BRUDU, KTÓRY
//    WŁAŚNIE SPRZĄTAMY.
// ═════════════════════════════════════════════════════════════════════
//
// ── DLACZEGO TO WCHODZI DOPIERO TERAZ ────────────────────────────────
// Pas F2 napisał tu asercję „obie reguły coś widzą" jako
// `render.length > 0 && helper.length > 0` — czyli policzył trafienia
// W PRAWDZIWYM REPOZYTORIUM. Dopóki dług istniał, to działało. Ten pas zdjął
// **11 z 12 wywołań** helpera i pod tą asercją został **jeden**, w `lib/labels.ts`.
// W dniu, w którym ktoś skasuje `segmentLabel()` — a jest to wprost zalecone
// w komentarzu przy tej funkcji — asercja ZAPALI SIĘ NA SUKCESIE.
//
// ⭐ To jest znalezisko **F1-1** („asercja licząca defekty w repozytorium zapala
// się na sukcesie", nota F1 §6.1 i §16 poz. 4) oraz **F2-8**, zastosowane do
// pliku, który sam je opisywał. Lekarstwo jest to samo, co zastosował pas F1:
// materiał SYNTETYCZNY, z próbką „MUSI TRAFIĆ" **i** próbką „MUSI NIE TRAFIĆ".
// Bez tej drugiej „detektor działa" znaczyłoby tylko „detektor cokolwiek
// znajduje" — a detektor trafiający we wszystko jest bezużyteczny tak samo,
// jak ten, który nie trafia w nic.

type Probka = { nazwa: string; co: 'render' | 'helper'; maTrafic: boolean; zrodlo: string };

const PROBKI: Probka[] = [
  {
    nazwa: 'postać 2 · surowa wartość jako dziecko tekstowe JSX',
    co: 'render', maTrafic: true,
    zrodlo: 'export const Karta = () => (<View><Text style={s.a}>{row.segment_id}</Text></View>);',
  },
  {
    nazwa: 'postać 2 · to samo `row.segment_id`, ale w `key`, w propie i w stylu',
    co: 'render', maTrafic: false,
    zrodlo: 'export const Karta = () => (<View key={row.segment_id} segmentId={x.segment_id} '
      + 'style={styles.cardSegment}><Text>{row.title}</Text></View>);',
  },
  // ── ⭐ PAS I2 16.08.2026 — dwie próbki na dziurę zmierzoną mutacją ──
  {
    nazwa: '⭐ (I2) postać 2 · surowa wartość pod nazwą POLA `surowy`, nie kolumny',
    co: 'render', maTrafic: true,
    zrodlo: 'export const Wiersz = () => (<View><Text style={s.n}>{opisDeficytu.surowy}</Text></View>);',
  },
  {
    nazwa: '⭐ (I2) postać 2 · gołe `id` — klucz z `diagnostics.scores` jako nazwa obszaru',
    co: 'render', maTrafic: true,
    zrodlo: 'export const Wiersz = () => (<View><Text style={s.n}>{id}</Text></View>);',
  },
  {
    nazwa: '⭐ (I2) postać 2 · KONTROLA rozszerzenia — `valid`, `hybrid`, `title` NIE są identyfikatorami',
    co: 'render', maTrafic: false,
    zrodlo: 'export const Wiersz = () => (<View><Text>{row.valid}</Text><Text>{o.hybrid}</Text>'
      + '<Text>{u.material.title}</Text></View>);',
  },
  {
    nazwa: 'postać 3 · zwykłe wywołanie helpera',
    co: 'helper', maTrafic: true,
    zrodlo: "import { segmentLabel } from './labels';\n"
      + 'export const opisz = (id: string) => segmentLabel(id);',
  },
  {
    nazwa: 'postać 3 · DEKLARACJA helpera, prop o tej samej nazwie i styl',
    co: 'helper', maTrafic: false,
    zrodlo: "import { segmentLabel } from './labels';\n"
      + 'export function segmentLabel(id: string){ return id; }\n'
      + 'const s = styles.segmentLabel;\n'
      + 'export const R = () => (<Planner segmentLabel={etykieta} />);',
  },
];

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
  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-G1 08.2026 (15.08.2026) — SZEŚĆ POZYCJI ZDJĘTYCH, JEDNA ZOSTAJE
  // ═══════════════════════════════════════════════════════════════════
  //
  // Pas G1 podmienił **11 z 12 wywołań** `segmentLabel()` na `opiszSegment()`
  // w czterech plikach, które pas F2 wypisał, i zdjął stąd sześć kluczy:
  //
  //   app/(tabs)/ja.tsx :: load                                   (1)
  //   components/DiagnosisProfileView.tsx :: tiers                (3)
  //   components/DiagnosisProfileView.tsx :: SekcjaWaskiegoGardla (3)
  //   components/diagnosisProfile.ts :: nameOf                    (2)
  //   components/diagnosisProfile.ts :: classify                  (1)
  //   lib/rediagnosis.ts :: buildRediagnosisView                  (1)
  //
  // ⭐ ZAPADKA ZAPALIŁA SIĘ PRZED USUNIĘCIEM I TO JEST JEDYNY DOWÓD, ŻE ŻYJE.
  // Po naprawie, a przed skreśleniem pozycji, asercja „każda pozycja długu
  // NADAL istnieje" wypisała wszystkie sześć kluczy z nazwy. Zapadka działa
  // w obie strony: pozycja naprawiona, ale zostawiona tu, też zapala.
  //
  // ⚠️ ZERO — I TO JEST WYNIK, NIE BRAK PRACY. Lista `WYCIEK_PRZEZ_HELPER`
  // nie zeszła jednak do zera i nie ma zejść: została w niej jedna pozycja
  // w `lib/labels.ts`, która NIE jest wyciekiem (dziedzina zamknięta listą
  // filarów). ⭐ Dzięki temu ten plik NIE wpadł w pułapkę F1-1 / F2-8:
  // asercja „obie reguły coś widzą" (`helper.length > 0`) nadal ma materiał.
  // ⛔ Ale nie polegam na tym — patrz asercje na PRÓBKACH SYNTETYCZNYCH niżej,
  // dołożone przez ten pas dokładnie po to, żeby „czy detektor żyje" nie
  // opierało się na brudzie, który sprzątamy.
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

  // ⭐ PLAN-D-G1 — „CZY DETEKTOR ŻYJE" LICZONE NA PRÓBKACH SYNTETYCZNYCH.
  //
  // ⛔ Było: `render.length > 0 && helper.length > 0`, czyli policzone
  // w prawdziwym repozytorium. Ta wersja zapala się na sukcesie sprzątania
  // (F1-1, F2-8) — patrz komentarz przy `PROBKI`. Teraz każda z czterech
  // próbek ma z góry znaną odpowiedź i nie zależy od tego, ile długu zostało.
  //
  // ⚠️ Próbki idą przez `z.szukajRenderu` / `z.szukajHelpera`, czyli przez
  // REGUŁY Z MUTOWANEGO OBIEKTU — dzięki temu każda mutacja, która oślepia
  // detektor albo każe mu trafiać we wszystko, zapala je od razu.
  for (const p of PROBKI) {
    const traf = p.co === 'render' ? z.szukajRenderu(p.zrodlo) : z.szukajHelpera(p.zrodlo);
    zapisz(`⭐ (próbka syntetyczna) ${p.nazwa} — ${p.maTrafic ? 'MUSI trafić' : 'MUSI NIE trafić'}`,
      (traf.length > 0) === p.maTrafic,
      `trafień: ${traf.length} (oczekiwane: ${p.maTrafic ? '≥1' : '0'})`);
  }

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

    // ═══════════════════════════════════════════════════════════════════
    // ⭐ PLAN-D-G1 08.2026 — SZEŚĆ MUTACJI TEGO PASA
    // ═══════════════════════════════════════════════════════════════════
    // ⚠️ Wszystkie sześć to KSZTAŁTY, KTÓRE NAPRAWDĘ BYŁY w tym repozytorium
    // godzinę temu, na `main` (`1e0bfcaa`, pas F2) — albo takie, w które ten
    // pas mógł się osunąć. To jest kontrola historyczna zapisana strukturalnie:
    // mutanty żyją w obiektach `Zasady`, żaden nie dotyka dysku.
    {
      nazwa: 'G1-M1 · ⭐ `ja.tsx` WRACA do `segmentLabel()` — stan `main` sprzed pasa G1',
      opis: 'regresja: ekran znów oddaje surowe `id` z `diagnostics.scores` jako nazwę obszaru. '
        + 'Klucza nie ma już na liście długu, więc MUSI wyjść jako NOWY KANDYDAT',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: zeZrodlem('app/(tabs)/ja.tsx',
          "import { segmentLabel } from '../../lib/labels';\n"
          + 'export const load = async () => ({ deficitLabels: deficits.map(([id]) => segmentLabel(id)) });'),
      },
    },
    {
      nazwa: 'G1-M2 · ⭐ naprawiony plik ZOSTAJE na liście długu jako pomnik',
      opis: 'dokładnie to, przed czym ostrzega polecenie G1.3: „pozycja naprawiona, ale '
        + 'zostawiona na liście, też zapala strażnika". Bez tej mutacji zapadka '
        + 'działałaby tylko w jedną stronę',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        dlugHelper: [
          ...WYCIEK_PRZEZ_HELPER,
          {
            klucz: 'components/DiagnosisProfileView.tsx :: SekcjaWaskiegoGardla',
            kto: 'POMNIK — pozycja zdjęta przez pas G1, wpisana z powrotem',
            co: 'wywołania `segmentLabel()` już tam nie ma, a lista nadal o nim mówi',
            ile: 3,
          },
        ],
      },
    },
    {
      nazwa: 'G1-M3 · detektor helpera OŚLEPIONY — nie widzi żadnego wywołania',
      opis: '⭐ najgroźniejsza postać awarii po tym pasie: lista długu jest prawie pusta, '
        + 'więc martwy detektor wygląda IDENTYCZNIE jak czyste repozytorium. '
        + 'Łapie to WYŁĄCZNIE próbka syntetyczna „MUSI trafić"',
      zasady: { ...ZASADY_PRAWDZIWE, szukajHelpera: () => [] },
    },
    {
      nazwa: 'G1-M4 · detektor renderu TRAFIA WE WSZYSTKO',
      opis: 'odwrotna awaria: reguła bez warunku „dziecko tekstowe JSX" wygląda na bardzo '
        + 'czujną, a jest bezużyteczna. Łapie to próbka syntetyczna „MUSI NIE trafić"',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        szukajRenderu: (zywy) => [{ funkcja: nazwaFunkcjiNad(zywy, 0), fragment: 'wszystko' }],
      },
    },
    {
      nazwa: 'G1-M5 · ⭐⭐ LISTA DŁUGU OPRÓŻNIONA DO ZERA, a wywołanie nadal jest',
      opis: '⛔ TO JEST ZNALEZISKO F1-1 I F2-8 W POSTACI MUTACJI: ktoś wycisza strażnika, '
        + 'kasując listę zamiast defektów. Zapadka na RÓWNOŚĆ musi wtedy zgłosić '
        + 'pozostałe wywołanie jako NOWEGO KANDYDATA, a nie zamilknąć',
      zasady: { ...ZASADY_PRAWDZIWE, dlugHelper: [] },
    },
    {
      nazwa: 'G1-M6 · ⭐ regresja w pliku NAPRAWIONYM przez ten pas',
      opis: 'ktoś dokłada `segmentLabel()` z powrotem do `components/diagnosisProfile.ts` '
        + 'obok `opiszSegment()`. Plik zniknął z listy długu, więc jedyną obroną jest '
        + 'wykrycie NOWEGO KANDYDATA — sprawdzam, że nadal działa',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: zeZrodlem('components/diagnosisProfile.ts',
          "import { segmentLabel, opiszSegment } from '../lib/labels';\n"
          + 'export const nameOf = (x: string) => segmentLabel(x);\n'
          + 'export const opis = (x: string) => opiszSegment(x);'),
      },
    },

    // ═══════════════════════════════════════════════════════════════════
    // ⭐ PAS I2 16.08.2026 — DWIE MUTACJE ODWZOROWUJĄCE POMIAR NA DYSKU
    // ═══════════════════════════════════════════════════════════════════
    // ⚠️ Obie były PUSZCZONE NAPRAWDĘ, `perl -0pi -e` na pliku produkcyjnym
    // i cofnięte przez `git checkout HEAD --`. Przed rozszerzeniem słownika
    // ogonów dawały **0 FAIL-i** w tym pliku. Tutaj są zapisane strukturalnie,
    // żeby nikt nie musiał powtarzać tego na dysku (O55).
    {
      nazwa: 'I2-M1 · ⭐⭐ surowa wartość na ekranie pod nazwą POLA `surowy`',
      opis: 'wiersz wąskiego gardła rysuje `{opisDeficytu.surowy}` zamiast dwóch gałęzi. '
        + 'Zawodnik czyta „explosive_power" jako nazwę SWOJEGO obszaru. ZMIERZONE 16.08: '
        + 'przed rozszerzeniem słownika ogonów ta mutacja dawała 0 FAIL-i',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: zeZrodlem('components/DiagnosisProfileView.tsx',
          'export const Wiersz = () => (<View><Text style={s.deficitName}>{opisDeficytu.surowy}</Text></View>);'),
      },
    },
    {
      nazwa: 'I2-M2 · ⭐⭐ gołe `id` z `diagnostics.scores` na ekranie spoza pasa G1',
      opis: 'Biblioteka rysuje `{u.material.surowy}`. ⛔ TEGO PLIKU NIE PILNUJE ANI '
        + '`nazwaObszaruNaEkranie` (cztery pliki pasa G1), ANI `(E2-5)` — zmierzone 16.08: '
        + 'trzy strażniki, zero czerwieni. To jest dziura, którą zamyka rozszerzenie ogonów',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: zeZrodlem('app/(tabs)/biblioteka.tsx',
          'export default function Biblioteka(){ return (<View><Text style={s.t}>{u.material.surowy}</Text></View>); }'),
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
  check(`⭐ KAŻDA z ${MUTACJE.length} mutacji zapala co najmniej jedną asercję (O71)`,
    bezEfektu === 0, `mutacji bez żadnego efektu: ${bezEfektu}`);

  // ⭐ PLAN-D-G1 — O71 W MOCNIEJSZEJ POSTACI: mutacja, która przestała cokolwiek
  // łapać, jest tu wypisana Z NAZWY, a nie zliczona. E1 zmierzył, że dwie
  // mutacje pasa C3b zgasły po naprawie i świeciły na zielono — zliczenie do
  // jednej liczby nie powiedziałoby, KTÓRA. Ten pas zdjął 11 z 12 wywołań
  // helpera, czyli zabrał mutacjom materiał; to jest dokładnie ta chwila,
  // w której mutacje gasną.
  const zgasle = MUTACJE.filter((m) => bateria(m.zasady).every((w) => w.ok)).map((m) => m.nazwa);
  check('⭐ ŻADNA mutacja nie zgasła po naprawie — z nazwy, nie z licznika (O71 + E1)',
    zgasle.length === 0, `zgasły: ${zgasle.join(' | ')}`);

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

// ═════════════════════════════════════════════════════════════════════
console.log('\n6. ⭐ PAS I2 16.08.2026 — SŁOWNIK OGONÓW SPRZĘŻONY Z KODEM (K4 / O75)');
// ═════════════════════════════════════════════════════════════════════
// ⚠️ KOREKTA KLASY WOBEC AUDYTU H1. H1 zaliczył ten plik do „ślepych"
// z powodu §5: „pilnuje LISTY DŁUGU, nie naprawy; F2 nic nie naprawił
// w produkcji, więc commit z «jego» defektem nie istnieje". Pierwsza część
// jest prawdziwa, DRUGA SIĘ ZDEZAKTUALIZOWAŁA: pas G1 (`d893d38`, 16.08)
// zdjął 11 z 12 wywołań `segmentLabel()`, więc stan „z defektem" to dziś
// po prostu `d893d38^`. **Ten plik NIE JEST K4** — czyta 83 pliki
// produkcyjne z `app/`, `components/` i `lib/`, w tym każdy ekran.
//
// ⭐ ALE MA WŁASNĄ CHOROBĘ, ZMIERZONĄ MUTACJĄ 16.08 I OPISANĄ PRZY
// `OGON_PASA_I2`: przemiata wszystkie ekrany i NIE WIDZI na nich surowej
// wartości, jeżeli ta nie nazywa się jak kolumna w bazie. Sekcja niżej
// SPRZĘGA słownik ogonów z kodem, żeby przy następnej zmianie nazwy pola
// zapalił się strażnik, a nie zawodnik.
{
  const root = dirname(libDir);
  const BRAK: string[] = [];
  const zrodlo = (wzgledna: string): string => {
    const p = join(root, wzgledna);
    if (!existsSync(p)) { BRAK.push(wzgledna); return ''; }
    return zyweZrodlo(readFileSync(p, 'utf8'));
  };

  const PLIK_LABELS = 'lib/labels.ts';
  const PLIK_WIDOK = 'components/DiagnosisProfileView.tsx';
  const labels = zrodlo(PLIK_LABELS);
  const widok = zrodlo(PLIK_WIDOK);

  check('⛔ (I2-0) oba pliki, z których wyprowadzam słownik ogonów, istnieją',
    BRAK.length === 0,
    `NIE MA: ${BRAK.join(', ')} — asercje niżej czytają PUSTY tekst i nie znaczą nic`);

  // ── SPRZĘŻENIE 1: nazwa pola, którym surowa wartość chodzi po produkcie ──
  // `OpisSegmentu = { znany: false; surowy: string; komunikat: string }`.
  // Detektor musi znać nazwę TEGO pola, bo to pod nią wartość dojeżdża na ekran.
  const poleSurowe = /znany:\s*false;\s*(\w+):\s*string/.exec(labels)?.[1] ?? '';
  check('⭐ (I2-0) pole z surową wartością w `lib/labels.ts` nadal nazywa się tak, jak zna je detektor',
    poleSurowe !== '' && OGON_PASA_I2.test(poleSurowe),
    `gałąź „nieznany" w \`OpisSegmentu\` niesie surową wartość w polu \`${poleSurowe || '(nie znalazłem)'}\`, `
    + 'którego SŁOWNIK OGONÓW NIE ZNA — od tej chwili `<Text>{opis.' + (poleSurowe || 'x') + '}</Text>` '
    + 'przechodzi tu na zielono, a zawodnik czyta surowe id z bazy jako nazwę swojego obszaru. '
    + 'Dopisz ten ogon do `OGON_PASA_I2`');

  // ── SPRZĘŻENIE 2: nazwa zmiennej, pod którą klucz `diagnostics.scores`
  //    chodzi po ekranie wyniku diagnozy. Dziś to gołe `id`. ──
  const kluczDeficytu = /deficits\.map\(\s*\(\s*\[\s*(\w+)\s*\]/.exec(widok)?.[1] ?? '';
  check('⭐ (I2-0) klucz deficytu na ekranie nadal nosi nazwę, którą detektor rozpoznaje',
    kluczDeficytu !== '' && OGON_PASA_I2.test(kluczDeficytu),
    `\`${PLIK_WIDOK}\` wiąże klucz z \`diagnostics.scores\` pod nazwą \`${kluczDeficytu || '(nie znalazłem)'}\`, `
    + 'spoza słownika ogonów — regresja `<Text>{' + (kluczDeficytu || 'x') + '}</Text>` przeszłaby tu bez śladu. '
    + 'Dopisz ten ogon do `OGON_PASA_I2` albo popraw tę asercję, ale nie zostawiaj jej zielonej');

  // ── ZAPADKA: rozszerzenie ma DZIŚ zero trafień — RÓWNOŚĆ, nie „≥ 0" ──
  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c`: 0 trafień w 83 przemiatanych
  // plikach. Nie „prawie zero" — zero. Każde nowe wymaga werdyktu tak samo,
  // jak wymaga go trafienie starego słownika (§3).
  const NOWY_OGON_TYLKO = />\s*\{\s*([A-Za-z_$][\w$]*(?:\??\.[\w$]+)*)\s*\}\s*</g;
  const trafieniaI2: string[] = [];
  for (const plik of PLIKI_PRZEMIATANE) {
    const zywy = zyweZrodlo(ZRODLA_PRAWDZIWE[plik]);
    const re = new RegExp(NOWY_OGON_TYLKO.source, 'g');
    let m: RegExpExecArray | null = re.exec(zywy);
    while (m !== null) {
      const ogon = m[1].split('.').pop() ?? '';
      if (OGON_PASA_I2.test(ogon)) trafieniaI2.push(`${plik} :: ${nazwaFunkcjiNad(zywy, m.index)} — ${m[0].replace(/\s+/g, ' ').trim()}`);
      m = re.exec(zywy);
    }
  }
  console.log(`   ogony pasa I2 (${OGON_PASA_I2.source}) — trafień dziś: ${trafieniaI2.length} (zmierzone 16.08: 0)`);
  check('⭐ (I2-0) rozszerzenie słownika ogonów daje DOKŁADNIE 0 trafień — tyle, co 16.08 (O73)',
    trafieniaI2.length === 0,
    `${trafieniaI2.length} NOWYCH pod ogonami pasa I2 — przeczytaj DROGĘ ZAPISU i wydaj werdykt: `
    + `${trafieniaI2.join(' | ')}`);

  // ── ZAPADKA NA WYPADNIĘCIE EKRANU Z PRZEMIATANIA ──
  // Bez tej asercji dziura zamknięta wyżej otwiera się z powrotem przez
  // wyłączenie pliku ze zbioru — a licznik „mam co przemiatać ≥ 50" tego nie widzi.
  const EKRANY_OBOWIAZKOWE = [PLIK_WIDOK, 'app/(tabs)/biblioteka.tsx', 'app/(tabs)/ja.tsx', PLIK_LABELS];
  const wypadly = EKRANY_OBOWIAZKOWE.filter((p) => !PLIKI_PRZEMIATANE.includes(p));
  check('⛔ (I2-0) ekrany, na których zmierzono dziurę, SĄ w zbiorze przemiatanym',
    wypadly.length === 0,
    `wypadły z przemiatania: ${wypadly.join(', ')} — detektor przestał widzieć ścieżkę, `
    + 'na której 16.08 zmierzono trzy mutacje z zerem FAIL-i');
}

console.log(`\n${passed} passed, ${failed} failed`);
// Celowo `throw`, a nie `process.exit(1)` — ten sam powód, co w
// `lib/labels.selftest.ts`: `process` wymaga `@types/node`, których tsconfig
// appki nie zaciąga, a te pliki są objęte `npx tsc --noEmit`.
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
