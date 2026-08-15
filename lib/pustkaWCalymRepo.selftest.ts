// PLAN-D-C3b 08.2026 (15.08.2026) — NOWY PLIK. STRAŻNIK ZADANIA C3b.3.
//
//   npx tsx lib/pustkaWCalymRepo.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ═════════════════════════════════════════════════════════════════════
// ── PO CO TEN PLIK ISTNIEJE ──────────────────────────────────────────
//
// `lib/trzyPustki.selftest.ts` pilnuje EKRANÓW ZAKŁADEK. Pas C3 zmierzył
// 15.08.2026, że `components/` (18 plików) i `lib/` **nie były przemiecione
// ani razu** — a reguła, której szuka, znalazła w `biblioteka.tsx` defekt,
// którego NIE BYŁO WIDAĆ w kodzie: `goalsRes.data ?? []` przy odczycie,
// o którego `.error` nikt nigdy nie zapytał.
//
// Ten strażnik przemiata `app/**`, `components/` i `lib/` tą samą regułą.
//
// ⛔ ⭐ TEN PLIK NICZEGO NIE NAPRAWIA I NIE MA PRAWA ZACZĄĆ.
// Jego jedynym wynikiem jest LISTA MIEJSC z nazwą pliku i nazwą funkcji
// (**O63**: nazwa funkcji, nie numer linii — dopisany komentarz przesuwa
// numer i przypisuje cudzy błąd nie temu, kto go popełnił).
//
// ── DLACZEGO ZACZYNA NA ZIELONO, A NIE NA CZERWONO ───────────────────
// Bo strażnik, który świeci na czerwono od pierwszego dnia, przestaje być
// czytany — a wtedy prawdziwy nowy błąd utonie w zastanym szumie. Zamiast
// tego stoi tu **ZAPADKA**: zastane trafienia są WYMIENIONE Z NAZWY, policzone
// i wypisywane przy każdym uruchomieniu, a strażnik zapala się, gdy pojawi się
// **choć jedno nowe**. Dług nie może urosnąć po cichu.
//
// ⚠️ ZAPADKA DZIAŁA W OBIE STRONY. Pozycja NAPRAWIONA przez właściciela też
// zapala strażnika — z poleceniem usunięcia jej z listy. Bez tego `DLUG_ZASTANY`
// zamieniłby się w listę, na której da się przenocować dowolnie długo, a nikt
// nie wiedziałby, czy te pliki są jeszcze zepsute, czy tylko zapomniane.
//
// ⚠️ O53: żadnego `new URL(...)` — `readFileSync` + `fileURLToPath`.
// ⚠️ O62: to nie zastępuje pełnej suity; `node tests/run-selftests.mjs`.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// ⭐ JEDNA implementacja wzorca, dwóch czytelników — patrz nagłówek bloku
// „WZORZEC «BŁĄD → PUSTA LISTA»" w `lib/trzyPustki.ts`. Druga kopia rozjechałaby
// się z pierwszą i wtedy jeden strażnik świeciłby na zielono na tym,
// na czym drugi świeci na czerwono (polecenie C3b, zadanie 3).
import { znajdzWzorzecPustki, type TrafienieWzorca } from './trzyPustki';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

const libDir = dirname(fileURLToPath(import.meta.url));
const appRoot = dirname(libDir);

// ─────────────────────────────────────────────────────────────────────
// CO PRZEMIATAMY I CZEGO NIE — obie decyzje ZMIERZONE, nie założone
// ─────────────────────────────────────────────────────────────────────

const KATALOGI = ['app', 'components', 'lib'];

/**
 * ⛔ `_diag_backup/` — STARA KOPIA, pomijana świadomie.
 *
 * ZMIERZONE 15.08.2026: 9 plików `.ts`/`.tsx`, **3 trafienia** — w tym
 * `centrum-decyzji.tsx :: loadRecommendations` i
 * `dziennik.tsx :: populateCalendarLinkSelect`, czyli DOKŁADNIE te dwa
 * defekty, które pas C3 naprawił tego samego dnia. Przemiatanie tego katalogu
 * raportowałoby jako żywe rzeczy, których od rana nie ma — i to jest ten sam
 * powód, dla którego `STAN_DELEGACJI` ostrzega, że `_diag_backup/` myli `grep`.
 */
const KATALOGI_POMINIETE = new Set(['_diag_backup', 'node_modules', '.git', '.expo', 'assets']);

/**
 * ⛔ `*.selftest.ts` — strażniki, pomijane świadomie.
 *
 * Strażnik CYTUJE wzorzec w tekstach asercji i w danych testowych, więc
 * przemiatanie go po sobie daje wyłącznie fałszywe trafienia. ZMIERZONE
 * 15.08.2026: 4 z 13 trafień w całym repozytorium siedziały w selftestach
 * i **żadne z nich nie było defektem** — były to napisy w asercjach
 * (`raportRodzica`, `trzyPustki`) i atrapa wejścia (`listaZadan`).
 *
 * ⚠️ WYJĄTEK JEST ZASŁUŻONY, NIE WPISANY — i sprawdza to asercja niżej:
 * ZMIERZONE 15.08.2026, że **ani jeden** z 41 selftestów nie importuje klienta
 * Supabase, podczas gdy robią to 22 pliki produkcyjne. Plik, który nie ma
 * jak czytać z bazy, nie ma jak zamienić błędu odczytu w pustkę.
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

/** Ścieżki względem katalogu projektu, z ukośnikami — żeby nota była czytelna. */
function relatywnie(p: string): string {
  return relative(appRoot, p).split(sep).join('/');
}

const WSZYSTKIE_PLIKI = KATALOGI
  .flatMap((k) => chodzPo(join(appRoot, k)))
  .map(relatywnie)
  .sort();

const PLIKI_PRZEMIATANE = WSZYSTKIE_PLIKI.filter((p) => !czyPomijamy(p));

// ─────────────────────────────────────────────────────────────────────
// ⭐ DŁUG ZASTANY — zapadka. Wymieniony z nazwy, policzony, wypisywany.
// ─────────────────────────────────────────────────────────────────────
//
// ⚠️ Klucz to `plik :: funkcja`, nie numer linii (**O63**).
// ⚠️ Ta lista jest WYNIKIEM pasa C3b, nie jego porażką. Polecenie mówi wprost:
// ten pas ma ZMIERZYĆ rozmiar dziury, nie zasypać ją. Naprawa pięciu plików
// w pasie, który miał zamknąć jeden prop, to ten sam ruch, który 14.08
// wywrócił CI.

type PozycjaDlugu = { klucz: string; kto: string; co: string };

const DLUG_ZASTANY: PozycjaDlugu[] = [
  // ⭐ PLAN-D-E1 15.08.2026 — PIĘĆ POZYCJI ZDJĘTYCH, DWIE ZOSTAJĄ.
  //
  // Zdjęte (naprawione w pasie E1): `lib/matchSegmentSelection.ts`,
  // `lib/livingDiagnosisPulses.ts` i trzy miejsca w
  // `components/FocusBlockPlanner.tsx`. Zapadka w dół zapaliła się dokładnie
  // wtedy, kiedy miała — po naprawie, przed usunięciem ich stąd — i to jest
  // jedyny dowód, że ta lista nie gnije.
  //
  // ⚠️ DWIE ZOSTAJĄCE MIAŁY OPIS, KTÓRY PRZESTAŁ BYĆ PRAWDĄ, I ZOSTAŁ POPRAWIONY
  // POMIAREM, NIE Z PAMIĘCI. C3b zapisał je jako „PAS W LOCIE". Zmierzone
  // 15.08.2026 ok. 17:20 CEST: oba pasy są WYPCHNIĘTE (`1ad6eaf` L2, `931bb16`
  // C4, oba w `origin/main`), a mimo to **oba defekty nadal są w kodzie** —
  // ten strażnik znajduje je na tym samym `main`. Czyli nie są już „w locie";
  // są długiem bez właściciela. Zostawienie ich z etykietą „w locie" kazałoby
  // następnemu pasowi czekać na coś, co już się skończyło (**O55**).
  {
    klucz: 'app/(tabs)/dzis.tsx :: (poziom modułu)',
    kto: '⛔ DŁUG BEZ WŁAŚCICIELA — pas C4 WYPCHNIĘTY (`931bb16`), defekt ZOSTAŁ. Zmierzone 15.08.2026 przez E1',
    co: '`eventsRes.data ?? []` przy odczycie kalendarza',
  },
  {
    klucz: 'app/(tabs)/profil.tsx :: loadProfile',
    kto: '⛔ DŁUG BEZ WŁAŚCICIELA — pas L2 WYPCHNIĘTY (`1ad6eaf`), defekt ZOSTAŁ. Zmierzone 15.08.2026 przez E1',
    co: '`injuryRes.data ?? []` — historia kontuzji po nieudanym odczycie wygląda jak jej brak',
  },
];

const KLUCZE_DLUGU = new Set(DLUG_ZASTANY.map((d) => d.klucz));

// ─────────────────────────────────────────────────────────────────────
// BATERIA — te same asercje na prawdziwych i na zepsutych zasadach
// ─────────────────────────────────────────────────────────────────────
// ⚠️ Mutacja, która nie podnosi liczby FAIL-i, oznacza asercję, która niczego
// nie pilnuje (ten sam wzorzec co sekcja 9 w `lib/trzyPustki.selftest.ts`).

type Zasady = {
  szukaj: (zrodlo: string) => TrafienieWzorca[];
  /** Ścieżka → treść. Wstrzykiwane, żeby mutacja nie musiała dotykać dysku. */
  zrodla: Record<string, string>;
  dlug: Set<string>;
};

type Znalezione = { klucz: string; postac: string; fragment: string };

function przemiec(z: Zasady): Znalezione[] {
  const out: Znalezione[] = [];
  for (const plik of Object.keys(z.zrodla).sort()) {
    for (const t of z.szukaj(z.zrodla[plik])) {
      out.push({ klucz: `${plik} :: ${t.funkcja}`, postac: t.postac, fragment: t.fragment });
    }
  }
  return out;
}

type WynikBaterii = { label: string; ok: boolean; detail: string };

function bateria(z: Zasady): WynikBaterii[] {
  const r: WynikBaterii[] = [];
  const zapisz = (label: string, ok: boolean, detail = '') => r.push({ label, ok, detail });

  const znalezione = przemiec(z);
  const nowe = znalezione.filter((t) => !z.dlug.has(t.klucz));
  const zniknietе = [...z.dlug].filter((k) => !znalezione.some((t) => t.klucz === k));

  // ⭐ SEDNO: zapadka w górę. Dług nie ma prawa urosnąć po cichu.
  zapisz('⭐ ANI JEDNEGO nowego miejsca „błąd → pusta lista" poza długiem zastanym',
    nowe.length === 0,
    `${nowe.length} NOWYCH: ${nowe.map((t) => `${t.klucz} (${t.postac})`).join(' | ')}`);

  // ⭐ Zapadka w dół. Naprawione wypada z listy, inaczej lista gnije.
  zapisz('⭐ każda pozycja długu NADAL istnieje — naprawione wypada z listy',
    zniknietе.length === 0,
    `NAPRAWIONE, usuń z DLUG_ZASTANY: ${zniknietе.join(' | ')}`);

  // Strażnik strażnika: mam co przemiatać i wynik nie jest pusty przez pomyłkę.
  zapisz('(strażnik strażnika) mam co przemiatać',
    Object.keys(z.zrodla).length >= 50,
    `plików: ${Object.keys(z.zrodla).length}`);

  zapisz('(strażnik strażnika) reguła w ogóle coś znajduje — inaczej milczy przez błąd, nie przez czystość',
    znalezione.length > 0, 'zero trafień w całym repozytorium jest podejrzane, nie dobre');

  // ⛔ Ani jedno trafienie nie jest anonimowe (O63).
  const bezNazwy = znalezione.filter((t) => t.klucz.endsWith(':: ') || t.klucz.includes(':: undefined'));
  zapisz('⛔ każde trafienie ma NAZWĘ PLIKU I FUNKCJI, nie numer linii (O63)',
    bezNazwy.length === 0, bezNazwy.map((t) => t.klucz).join(' | '));

  return r;
}

const ZRODLA_PRAWDZIWE: Record<string, string> = Object.fromEntries(
  PLIKI_PRZEMIATANE.map((p) => [p, readFileSync(join(appRoot, p), 'utf8')]),
);

const ZASADY_PRAWDZIWE: Zasady = {
  szukaj: znajdzWzorzecPustki,
  zrodla: ZRODLA_PRAWDZIWE,
  dlug: KLUCZE_DLUGU,
};

console.log('pustkaWCalymRepo.selftest.ts — wzorzec „błąd → pusta lista" w CAŁYM repozytorium (C3b.3)\n');

// ═════════════════════════════════════════════════════════════════════
console.log('1. CO PRZEMIATAM, A CZEGO NIE — obie decyzje zmierzone');
// ═════════════════════════════════════════════════════════════════════
{
  const selftesty = WSZYSTKIE_PLIKI.filter((p) => p.endsWith('.selftest.ts'));
  console.log(`   katalogi: ${KATALOGI.join(', ')}`);
  console.log(`   plików znalezionych: ${WSZYSTKIE_PLIKI.length} · przemiatanych: ${PLIKI_PRZEMIATANE.length} · pominiętych selftestów: ${selftesty.length}`);
  console.log('   ⛔ pominięty katalog _diag_backup/: 9 plików .ts/.tsx, 3 trafienia '
    + '(zmierzone 15.08.2026) — stare kopie defektów naprawionych w A1, C1 i C3');

  check('przemiatam wszystkie trzy katalogi',
    KATALOGI.every((k) => PLIKI_PRZEMIATANE.some((p) => p.startsWith(`${k}/`))),
    KATALOGI.filter((k) => !PLIKI_PRZEMIATANE.some((p) => p.startsWith(`${k}/`))).join(', '));

  check('⛔ `_diag_backup/` NIE jest przemiatany — stare defekty nie wracają jako żywe',
    !PLIKI_PRZEMIATANE.some((p) => p.includes('_diag_backup')), '');

  // ⚠️ WYJĄTEK MUSI BYĆ ZASŁUŻONY. Selftest, który sięgnąłby do bazy, przestaje
  // być czystym strażnikiem i musi wrócić pod regułę.
  const selftestyZKlientem = selftesty.filter((p) =>
    /from\s+['"](?:\.\/|\.\.\/lib\/)supabase['"]/.test(readFileSync(join(appRoot, p), 'utf8')));
  check('⛔ ⭐ pominięcie selftestów jest ZASŁUŻONE — żaden nie importuje klienta Supabase',
    selftestyZKlientem.length === 0,
    `selftest z odczytem do bazy: ${selftestyZKlientem.join(', ')}`);

  check('⛔ pominięte są WYŁĄCZNIE selftesty — nic produkcyjnego nie wypadło',
    WSZYSTKIE_PLIKI.filter((p) => !PLIKI_PRZEMIATANE.includes(p)).every((p) => p.endsWith('.selftest.ts')),
    WSZYSTKIE_PLIKI.filter((p) => !PLIKI_PRZEMIATANE.includes(p) && !p.endsWith('.selftest.ts')).join(', '));
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n2. ⭐ CO ZNALAZŁEM — pełna lista, nazwa pliku i funkcji');
// ═════════════════════════════════════════════════════════════════════
{
  const znalezione = przemiec(ZASADY_PRAWDZIWE);
  console.log(`   TRAFIEŃ: ${znalezione.length} w ${new Set(znalezione.map((t) => t.klucz.split(' :: ')[0])).size} plikach\n`);
  for (const t of znalezione) {
    const poz = DLUG_ZASTANY.find((d) => d.klucz === t.klucz);
    console.log(`   • ${t.klucz}`);
    console.log(`     ${poz ? poz.kto : '⛔ NOWE — nie ma go w długu zastanym'}`);
    console.log(`     ${poz ? poz.co : t.fragment}`);
  }
  console.log('');

  for (const w of bateria(ZASADY_PRAWDZIWE)) check(w.label, w.ok, w.detail);

  check('⭐ dług zastany jest POLICZONY i wypisany, nie schowany',
    DLUG_ZASTANY.length > 0 && DLUG_ZASTANY.every((d) => d.kto.length > 10 && d.co.length > 20),
    'pozycja bez właściciela albo bez opisu defektu');

  const niczyje = DLUG_ZASTANY.filter((d) => d.kto.includes('NICZYJ'));
  console.log(`   ⭐ z tego DO ROZDZIELENIA przez sesję nawigującą: ${niczyje.length}`);
  check('⭐ każda niczyja pozycja mówi, CO dokładnie jest zepsute',
    niczyje.every((d) => /`/.test(d.co)), '');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n3. ⭐ TEST MUTACYJNY — liczba FAIL-i przy każdej mutacji');
// ═════════════════════════════════════════════════════════════════════
// ⚠️ MUTACJA, KTÓRA NIE PODNOSI LICZBY FAIL-i, OZNACZA ASERCJĘ, KTÓRA NICZEGO
// NIE PILNUJE. Wszystkie żyją w obiektach `Zasady` — ani jedna nie dotyka
// dysku, `znajdzWzorzecPustki` ani `DLUG_ZASTANY`.
{
  const ROZMIAR = bateria(ZASADY_PRAWDZIWE).length;
  const failePrawdziwe = bateria(ZASADY_PRAWDZIWE).filter((w) => !w.ok).length;

  const zeZrodlem = (plik: string, tresc: string): Record<string, string> =>
    ({ ...ZRODLA_PRAWDZIWE, [plik]: tresc });

  const MUTACJE: { nazwa: string; opis: string; zasady: Zasady }[] = [
    {
      nazwa: 'M1 · nowy defekt w pliku produkcyjnym',
      opis: 'ktoś dokłada `?? []` przy odczycie, o którego błąd nikt nie pyta',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: zeZrodlem('lib/onboarding.ts',
          'export async function x(){ const res = await q(); const rows = res.data ?? []; return rows; }'),
      },
    },
    {
      nazwa: 'M2 · pozycja długu naprawiona, ale nadal na liście',
      opis: 'lista długu gnije i nikt nie wie, co jest jeszcze zepsute',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        // ⚠️ PLAN-D-E1: było `lib/matchSegmentSelection.ts` — plik, który ten pas
        // NAPRAWIŁ i zdjął z listy, więc mutacja przestałaby cokolwiek udowadniać.
        // Musi wskazywać na pozycję, która NA LIŚCIE JEST.
        zrodla: zeZrodlem('app/(tabs)/profil.tsx', 'export const nic = 1;'),
      },
    },
    {
      nazwa: 'M3 · `_diag_backup/` wraca do przemiatania',
      opis: 'trzy defekty naprawione rano wracają jako żywe znaleziska',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: {
          ...ZRODLA_PRAWDZIWE,
          '_diag_backup/centrum-decyzji.tsx':
            'const load = async () => { if (err) { setLoadError("x"); setRecommendations([]); return; } };',
        },
      },
    },
    {
      nazwa: 'M4 · selftesty wracają do przemiatania',
      opis: 'strażnik zapala się na CUDZYSŁOWACH we własnych asercjach',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: zeZrodlem('lib/atrapa.selftest.ts',
          'check("w ekranie nie ma wzorca", !/x/.test(s), "goalsRes.data ?? [] w opisie asercji");'),
      },
    },
    {
      nazwa: 'M5 · reguła oślepiona — okno rozciągnięte na cały plik',
      opis: '„.error gdziekolwiek w pliku" przepuszcza defekt `biblioteka.tsx`',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        szukaj: (zrodlo) => znajdzWzorzecPustki(zrodlo).filter((t) => t.postac !== 'niezauwazony'),
      },
    },
    {
      nazwa: 'M6 · reguła oślepiona — gałęzie błędu przestają się liczyć',
      opis: '`catch { setObszary([]) }` znowu przechodzi bez słowa',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        szukaj: (zrodlo) => znajdzWzorzecPustki(zrodlo).filter((t) => t.postac !== 'galaz'),
        // ⚠️ PLAN-D-E1 — ZMIERZONE, ŻE TA MUTACJA PRZESTAŁA COKOLWIEK ŁAPAĆ.
        // Do dziś opierała się na tym, że trzy pozycje długu (`FocusBlockPlanner`)
        // miały postać „gałąź". Ten pas je naprawił, więc po naprawie oślepienie
        // reguły na gałęzie NIE ZMIENIAŁO ANI JEDNEGO WYNIKU — mutacja świeciła
        // na zielono, udając, że coś sprawdza.
        // ⭐ Dlatego dostaje własną pozycję długu w postaci „gałąź": bez tego
        // druga połowa reguły nie ma dziś w repozytorium NICZEGO, na czym mogłaby
        // się wyłożyć — a to jest dokładnie ten stan, w którym strażnik zaczyna
        // być zbiorem zdań (**O70**).
        zrodla: zeZrodlem('app/(tabs)/profil.tsx',
          'const loadProfile = useCallback(async () => {'
          + ' try { const { data, error: err } = await q(); if (err) throw err; setInjuries(data); }'
          + ' catch { setInjuries([]); } }, []);'),
      },
    },
    // ═══════════════════════════════════════════════════════════════════
    // ⭐ PLAN-D-E1 15.08.2026 — DWIE MUTACJE, KTÓRE COFAJĄ NAPRAWĘ TEGO PASA
    // ═══════════════════════════════════════════════════════════════════
    // Sześć mutacji wyżej pochodzi z C3b i pilnuje strażnika. Te dwie pilnują
    // NAPRAWY: podstawiają kształt SPRZED pasa E1 i sprawdzają, czy strażnik
    // zapala się na obu postaciach wzorca, które ten pas usunął.
    //
    // ⚠️ Bez nich zejście z 7 na 2 byłoby twierdzeniem, że kod się zmienił —
    // a nie dowodem, że to WŁAŚNIE naprawa go wyciszyła. Strażnik, którego nie
    // puszczono na chorobie, dla której powstał, jest zbiorem zdań (**O70**).
    {
      nazwa: 'M7 · naprawa E1 cofnięta w `lib/matchSegmentSelection.ts` (postać „niezauważony")',
      opis: '`answersRes.data ?? []` wraca bez ani jednego odczytu `.error` — kaskada meczowa znowu połyka odmowę RLS',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: zeZrodlem('lib/matchSegmentSelection.ts',
          'export async function fetchPlayerMatchSelectionContext(userId, st) {'
          + ' const [profileRes, answersRes] = await Promise.all([qa(), qb()]);'
          + ' const profilePosition = profileRes.data?.[0]?.position_primary ?? null;'
          + ' const segmentLastAskedAt = {};'
          + ' for (const row of answersRes.data ?? []) { segmentLastAskedAt[row.segment_id] = row.created_at; }'
          + ' return { profilePosition, segmentLastAskedAt }; }'),
      },
    },
    {
      nazwa: 'M8 · naprawa E1 cofnięta w `components/FocusBlockPlanner.tsx` (postać „gałąź")',
      opis: '`catch { setElementy([]) }` wraca bez słowa — bliźniak defektu z `cele.tsx` odtworzony co do znaku',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: zeZrodlem('components/FocusBlockPlanner.tsx',
          'const loadElementy = useCallback(async (obszarId) => {'
          + ' setElementyLoading(true);'
          + ' try { const { data, error: err } = await q(); if (err) throw err; setElementy(data); }'
          + ' catch { setElementy([]); }'
          + ' finally { setElementyLoading(false); } }, []);'),
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
    check(`⭐ mutacja „${m.nazwa}" podnosi liczbę FAIL-i`,
      zapalone.length > 0, 'mutacja przeszła niezauważona — ta bateria niczego nie pilnuje');
    console.log('');
  }

  // ⚠️ Liczba mutacji jest LICZONA, nie wpisana — etykieta „sześć" zestarzałaby
  // się po cichu przy pierwszej dołożonej mutacji (**O71**: asercja, której
  // treść rozjeżdża się z tym, czego pilnuje).
  check(`⭐ KAŻDA z ${MUTACJE.length} mutacji została złapana`, bezEfektu === 0, `mutacji bez efektu: ${bezEfektu}`);
  check(`⭐ po ${MUTACJE.length} mutacjach prawdziwe zasady są nadal nietknięte`,
    bateria(ZASADY_PRAWDZIWE).filter((w) => !w.ok).length === 0,
    'mutacja wyciekła poza swój obiekt Zasady');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
