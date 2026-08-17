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
  // ⭐ PLAN-D-F1 15.08.2026 — DWIE OSTATNIE POZYCJE ZDJĘTE. LISTA JEST PUSTA.
  //
  // Historia tej listy, bo jest w niej cała treść trzech pasów:
  //   • C3b (15.08) zmierzył 7 trafień w całym repozytorium i wpisał je tutaj
  //     zamiast naprawiać — polecenie kazało ZMIERZYĆ dziurę, nie zasypać;
  //   • E1  (15.08) naprawił pięć „niczyich miejsc" i zdjął je stąd. Zapadka
  //     w dół zapaliła się dokładnie wtedy, kiedy miała: po naprawie, przed
  //     usunięciem pozycji;
  //   • F1  (15.08) naprawił dwie ostatnie — `dzis.tsx :: (poziom modułu)`
  //     (`eventsRes.data ?? []`) i `profil.tsx :: loadProfile`
  //     (`injuryRes.data ?? []`). Obie były DŁUGIEM BEZ WŁAŚCICIELA: pasy C4
  //     i L2 skończyły się i wypchnęły (`931bb16`, `1ad6eaf`), a defekty
  //     zostały. Zapadka w dół zapaliła się i tu — dosłownie:
  //     „NAPRAWIONE, usuń z DLUG_ZASTANY: app/(tabs)/dzis.tsx :: (poziom
  //     modułu) | app/(tabs)/profil.tsx :: loadProfile".
  //
  // ⛔ PUSTA LISTA JEST TU STANEM DOCELOWYM, A NIE AWARIĄ — ale WYŁĄCZNIE
  // wtedy, gdy przemiatanie nie znajduje ani jednego trafienia. Pilnuje tego
  // asercja „pusty dług jest dozwolony TYLKO przy zerze trafień" niżej: bez
  // niej ktoś mógłby wyciszyć strażnika, kasując listę zamiast defektów.
  //
  // ⚠️ I RZECZ, KTÓRA KOSZTOWAŁA PAS F1 OSOBNĄ POPRAWKĘ (**O71**, znalezisko
  // E1 §10 zastosowane do jego własnego strażnika): TRZY ASERCJE TEGO PLIKU
  // BYŁY NAPISANE PRZY MILCZĄCYM ZAŁOŻENIU, ŻE DŁUG NIGDY NIE BĘDZIE PUSTY —
  // „reguła w ogóle coś znajduje" (≥1 trafienie w repozytorium), „dług jest
  // policzony" (≥1 pozycja) i mutacja M2 (celowała w istniejącą pozycję).
  // Wszystkie trzy zgasłyby albo zapaliły się na SUKCESIE. Naprawa kodu
  // potrafi wyciszyć test mutacyjny, bo zabiera mu materiał — i dlatego
  // materiał tych trzech asercji jest od dziś SYNTETYCZNY, nie prawdziwy.
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

// ═════════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-F1 15.08.2026 — PRÓBKI WZORCOWE, czyli sprawdzian dla DETEKTORA
// ═════════════════════════════════════════════════════════════════════
//
// ⛔ PO CO TO ISTNIEJE — i to jest najważniejsza zmiana tego pasa w tym pliku.
//
// Do 15.08 „czy detektor w ogóle działa" sprawdzała asercja
// *„reguła w ogóle coś znajduje — inaczej milczy przez błąd, nie przez
// czystość"*, czyli warunek `znalezione.length > 0` NA PRAWDZIWYM
// REPOZYTORIUM. Póki dług był niepusty, działało. **Pas F1 naprawił dwa
// ostatnie miejsca i ta asercja zapaliła się NA SUKCESIE** — powiedziała
// „zero trafień w całym repozytorium jest podejrzane", w chwili gdy zero
// trafień było dokładnie tym, po co ten strażnik powstał.
//
// Strażnik, który świeci na czerwono, gdy repozytorium jest czyste, zostanie
// wyciszony przy pierwszej okazji — i wtedy przestanie pilnować czegokolwiek.
//
// ⭐ ROZWIĄZANIE JEST MOCNIEJSZE OD TEGO, CO ZASTĄPIŁO. Detektor dostaje dwie
// próbki, których treść znamy: jedną, na której MUSI się zapalić, i jedną, na
// której MUSI milczeć. To sprawdza go bez względu na to, czy repozytorium jest
// brudne — a przy okazji utrzymuje przy życiu mutacje M5 i M6, które oślepiają
// regułę na jedną z dwóch postaci wzorca i po opróżnieniu długu nie miałyby
// się na czym wyłożyć (**O71**).
//
// ⚠️ PRÓBKI SĄ SYNTETYCZNE I TAK MA BYĆ: materiał, który znika razem z naprawą
// kodu, jest materiałem, na którym nie da się oprzeć testu mutacyjnego.

/** Ma trafić — postać „niezauważony": `?? []` przy odczycie bez pytania o `.error`. */
const PROBKA_TRAFIA_NIEZAUWAZONY =
  'export async function probaNiezauwazona() {'
  + ' const res = await supabase.from("x").select("*");'
  + ' const rows = res.data ?? []; return rows; }';

/** Ma trafić — postać „gałąź": `catch`, który czyści listę i milczy. */
const PROBKA_TRAFIA_GALAZ =
  'const probaGalaz = useCallback(async () => {'
  + ' try { const { data, error: err } = await q(); if (err) throw err; setPozycje(data); }'
  + ' catch { setPozycje([]); } }, []);';

/**
 * ⛔ MA NIE TRAFIĆ. Ten sam `?? []`, ale błąd JEST przeczytany tuż obok —
 * czyli dokładnie ten kształt, który pasy C3, C3b, E1 i F1 zostawiały jako
 * poprawny. Bez tej próbki „detektor działa" znaczyłoby tylko „detektor
 * cokolwiek znajduje", a detektor trafiający we wszystko jest bezużyteczny
 * tak samo jak ten, który nie trafia w nic.
 */
const PROBKA_NIE_TRAFIA =
  'export async function probaCzysta() {'
  + ' const res = await supabase.from("x").select("*");'
  + ' if (res.error) { console.warn("ODCZYT PADŁ", res.error.message); return null; }'
  + ' const rows = res.data ?? []; return rows; }';

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

  // ⭐ PLAN-D-F1 15.08.2026 — SPRAWDZIAN DETEKTORA NA PRÓBKACH, nie na
  // brudzie w repozytorium. Do 15.08 stało tu `znalezione.length > 0`, czyli
  // asercja, która zapala się dokładnie wtedy, gdy repozytorium jest CZYSTE.
  // Powód i pełne uzasadnienie: nagłówek przy `PROBKA_TRAFIA_*` wyżej.
  const trafiaNiezauwazony = z.szukaj(PROBKA_TRAFIA_NIEZAUWAZONY);
  const trafiaGalaz = z.szukaj(PROBKA_TRAFIA_GALAZ);
  const nieTrafia = z.szukaj(PROBKA_NIE_TRAFIA);

  zapisz('⭐ (strażnik strażnika) detektor ZAPALA SIĘ na próbce „niezauważony błąd"',
    trafiaNiezauwazony.some((t) => t.postac === 'niezauwazony'),
    `postacie: ${trafiaNiezauwazony.map((t) => t.postac).join(', ') || '(zero trafień)'}`);

  zapisz('⭐ (strażnik strażnika) detektor ZAPALA SIĘ na próbce „gałąź czyszcząca listę"',
    trafiaGalaz.some((t) => t.postac === 'galaz'),
    `postacie: ${trafiaGalaz.map((t) => t.postac).join(', ') || '(zero trafień)'}`);

  zapisz('⛔ (strażnik strażnika) detektor MILCZY na `?? []` z przeczytanym błędem obok',
    nieTrafia.length === 0,
    `fałszywe trafienie: ${nieTrafia.map((t) => t.postac).join(', ')}`);

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

  // ⭐ PLAN-D-F1 15.08.2026 — do 15.08 warunek zaczynał się od
  // `DLUG_ZASTANY.length > 0`, czyli asercja WYMAGAŁA, żeby dług istniał.
  // Zapaliła się w chwili, gdy ten pas zdjął z listy dwie ostatnie pozycje —
  // na sukcesie. Zostaje wymaganie JAKOŚCI opisu (każda pozycja ma właściciela
  // i defekt), znika wymaganie ILOŚCI.
  check('⭐ każda pozycja długu ma WŁAŚCICIELA i opis defektu, nie sam klucz',
    DLUG_ZASTANY.every((d) => d.kto.length > 10 && d.co.length > 20),
    'pozycja bez właściciela albo bez opisu defektu');

  // ⛔ …ale pusta lista NIE MOŻE BYĆ WYGODNYM WYJŚCIEM. Wyciszenie tego
  // strażnika przez skasowanie listy zamiast defektów zapala TĘ asercję.
  check('⛔ ⭐ pusty dług jest dozwolony WYŁĄCZNIE przy zerze trafień w repozytorium',
    DLUG_ZASTANY.length > 0 || znalezione.length === 0,
    `dług pusty, a przemiatanie znajduje ${znalezione.length}: `
    + `${znalezione.map((t) => t.klucz).join(' | ')}`);

  console.log(znalezione.length === 0 && DLUG_ZASTANY.length === 0
    ? '   ⭐ ZERO TRAFIEŃ I PUSTY DŁUG — to jest stan docelowy, nie awaria.\n'
      + '      Detektor sprawdzony osobno, na próbkach wzorcowych (patrz bateria).'
    : `   ⚠️ trafień: ${znalezione.length} · pozycji długu: ${DLUG_ZASTANY.length}`);

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
        // ⚠️ PLAN-D-E1: było `lib/matchSegmentSelection.ts` — plik, który tamten
        // pas NAPRAWIŁ i zdjął z listy, więc mutacja przestała cokolwiek
        // udowadniać. E1 przecelował ją na `app/(tabs)/profil.tsx`, czyli na
        // JEDNĄ Z DWÓCH POZYCJI, KTÓRE WTEDY BYŁY NA LIŚCIE.
        //
        // ⭐ PLAN-D-F1 15.08.2026 — I DOKŁADNIE TO SAMO STAŁO SIĘ DRUGI RAZ,
        // dobę później: ten pas naprawił `profil.tsx`, lista jest pusta,
        // a mutacja przecelowana na prawdziwą pozycję znowu nie miałaby czego
        // złapać. **Przecelowywanie jej po każdej naprawie jest samo w sobie
        // wzorcem, nie przypadkiem** — więc materiał przestaje być prawdziwy.
        //
        // Od dziś mutacja wstrzykuje WŁASNY, SYNTETYCZNY klucz długu, którego
        // nie ma w żadnym źródle. `zniknietе` ma wtedy dokładnie jeden element
        // niezależnie od tego, co jest w repozytorium — więc zapadka w dół
        // ma na czym się wyłożyć także wtedy, gdy repozytorium jest czyste.
        dlug: new Set([...KLUCZE_DLUGU, 'lib/atrapaDlugu.ts :: funkcjaKtorejNieMa']),
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

// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CZY PUSTKA MA DOKĄD PROWADZIĆ (K4 / O75)
// ═════════════════════════════════════════════════════════════════════
//
// ── CO BYŁO ZEPSUTE — nazwane liczbą, nie odczuciem ──────────────────
//
// ZMIERZONE 16.08.2026 przy przeliczaniu rejestru WT: w CAŁYM tym pliku
// nie było ANI JEDNEGO wystąpienia słowa `onPress` ani `Touchable`.
// To samo w `lib/trzyPustki.selftest.ts` (zmierzone tego samego dnia: zero).
// Czyli: dwa strażniki pilnujące pustek sprawdzały, JAK PUSTKA BRZMI
// i CZY PRODUKT JĄ ROZPOZNAJE — a ani jeden nie sprawdzał, CZY PUSTKA
// MA DOKĄD PROWADZIĆ.
//
// ⛔ CO PRZEZ TO PRZESZŁO NA ZIELONO — DWA MIEJSCA, NIE JEDNO.
//   • `app/(tabs)/kalendarz.tsx`, zakładka „Listy", sekcja „Nadchodzące":
//     CTA pustki było gołym `<Text>` ze strzałką „→", bez `onPress`.
//     ⛔ Pustka ŚLEPA CAŁKOWICIE — w tej sekcji nie było żadnego innego wejścia.
//   • `app/(tabs)/dzis.tsx`, karta „Dziś w kalendarzu": to samo
//     (`<Text style={styles.cardAction}>{pustkaDzis.cta} →</Text>`).
// Zawodnik widział coś, co WYGLĄDA jak przycisk, dotykał go i NIE DZIAŁO SIĘ
// NIC — a to jest gorsze niż brak wyjścia, bo produkt obiecał wyjście
// i go nie dał. Nie zakładaj, że defekt jest jeden, bo ktoś wymienił jeden:
// PRZEMIEĆ.
//
// ⚠️ OBA WESZŁY COMMITEM `0705760` (pas T, 14.08.2026) i OBA PRZEŻYŁY PAS C1
// (`e4be45d`), KTÓRY OGŁOSIŁ NAPRAWĘ OBIETNICY WT-33 („każda pustka kończy
// się dokładnie jedną akcją"). C1 dodał wyjście w widoku tygodnia i pominął
// je w „Nadchodzących", przemianowując przy tym zmienną w tej samej linii.
// Dowód: `git log -S 'pustkaNadchodzace.cta'`, `git log -L 983,988`.
//
// ── ✅ NAPRAWIONE 16.08.2026 — DECYZJA KUBY NA PYTANIE B3: „NIE MA" ──
// Kuba rozstrzygnął, że napis ze strzałką bez `onPress` NIE SPEŁNIA WT-33,
// czyli że obietnica stała na `JEST` przez dwa pasy nieprawdziwie. Oba miejsca
// dostały `TouchableOpacity` z `onPress`, który TĘ pustkę zamyka:
//   • „Nadchodzące" → `brak_danych` przewija do formularza „Dodaj do
//     kalendarza" stojącego wyżej NA TYM SAMYM ekranie (`setZakladka('listy')`
//     byłoby tam ruchem donikąd — już tam jesteśmy);
//   • karta „Dziś w kalendarzu" → `brak_danych` prowadzi do Kalendarza,
//     reszta do Profilu.
// ⚠️ `blad_odczytu` ZOSTAJE NAPISEM w obu miejscach (decyzja Kuby tego samego
// dnia): jego CTA to INSTRUKCJA („Pociągnij w dół, żeby sprawdzić jeszcze
// raz."), wyjściem jest `RefreshControl`, a strzałka jest obietnicą akcji.
//
// ── DLACZEGO ASERCJA JEST BEZWZGLĘDNA, A NIE ZAPADKĄ NA RÓWNOŚĆ ──
// Bo dług został spłacony do zera, a próg „tyle, co wczoraj" przepuszczałby
// go w nieskończoność — „zgadza się z pomiarem" jest wtedy zdaniem prawdziwym
// i bezużytecznym naraz. `falszywePrzyciski.length === 0` NIE MA LISTY
// WYJĄTKÓW: nie da się jej uciszyć skreśleniem pozycji, tylko naprawą ekranu.
// Zapadki na równość zostają obok i pilnują drugiej strony: żeby nikt nie
// ZDJĄŁ pustki, jej wyjścia ani strzałki (ten ostatni ruch jest najtańszym
// sposobem schowania długu przed asercją bezwzględną).
//
// ⚠️ CZEGO TEN BLOK NIE UDAJE. Czyta źródło ekranu JAKO TEKST i liczy
// przodków JSX. Nie uruchamia Reacta i nie wie, czy `onPress` cokolwiek
// robi — `onPress={() => {}}` przejdzie tu niezauważone. Sprawdza
// AFORDANCJĘ, nie skutek.
{
  console.log('\n4. ⭐ (I2) PUSTKA, KTÓRA MA DOKĄD PROWADZIĆ — wyjścia w CAŁYM repozytorium');

  /**
   * Źródło bez komentarzy, ale Z ZACHOWANIEM NUMERÓW LINII — inaczej numer
   * w komunikacie FAIL-a wskazywałby nie to miejsce, co trzeba.
   *
   * ⚠️ Nie da się tu użyć `zyweZrodlo` z `lib/trzyPustki.ts`: ta wersja
   * KASUJE komentarze blokowe razem z ich znakami nowej linii (i słusznie —
   * tamtym asercjom numery linii są niepotrzebne, **O63**).
   * Tutaj komentarz zamieniany jest na spacje tej samej długości.
   *
   * ⛔ TA FUNKCJA MIAŁA DEFEKT KOLEJNOŚCI I ZMIERZONO GO 17.08.2026 (pas Q1).
   * Do 17.08 wycinała najpierw bloki `/* … *\/`, a DOPIERO POTEM linie `//`.
   * Blok był więc wycinany z tekstu, w którym komentarze `//` jeszcze były,
   * a linia 15 tego pliku cytuje `app/**` — czyli otwiera „blok", który leci
   * aż do następnego `*\/`. ⛔ ZMIERZONE: strażnik nie widział 3 778 znaków
   * znaczących w 15 z zamiatanych plików (najwięcej `lib/wysokoscEkranu.ts`
   * — 2 690, i 487 z tego pliku: własne `import`y i własną funkcję `check`).
   * Asercje przechodziły, bo pytały o tekst, którego już nie było.
   *
   * ⛔ KOLEJNOŚCI NIE DA SIĘ USTAWIĆ DOBRZE — przy odwrotnej blok zawierający
   * `//` gubi zamknięcie. Tekst przechodzimy RAZ, tak jak w
   * `lib/wysokoscEkranu.selftest.ts` (pas M2) i `lib/ostatniCentymetr.selftest.ts`.
   * ⚠️ Skaner zjada też `{/* … *\/}` (JSX), bo `{` zostaje, a `/* … *\/` w środku
   * wpada w gałąź bloku — dawny pierwszy `replace` był tylko doprecyzowaniem.
   */
  const bezKomentarzy = (s: string): string => {
    let out = '';
    const spacje = (t: string) => t.replace(/[^\n]/g, ' ');
    for (let i = 0; i < s.length;) {
      const c = s[i];
      if (c === '/' && s[i + 1] === '/') {
        const k = s.indexOf('\n', i);
        out += spacje(k === -1 ? s.slice(i) : s.slice(i, k));
        i = k === -1 ? s.length : k;
        continue;
      }
      if (c === '/' && s[i + 1] === '*') {
        const k = s.indexOf('*/', i + 2);
        out += spacje(k === -1 ? s.slice(i) : s.slice(i, k + 2));
        i = k === -1 ? s.length : k + 2;
        continue;
      }
      // ⛔ NAPIS NIE JEST KOMENTARZEM — i bez tej gałęzi naprawa byłaby
      // STRATĄ NETTO. Ten strażnik zamiata `app/` i `components/`, gdzie stoją
      // stałe w rodzaju `'https://gamechange-diagnoza.vercel.app'`. Odcinanie
      // od `//` do końca linii gubi 11 524 znaki znaczące w 17 plikach
      // (zmierzone 17.08.2026) — czyli więcej, niż odzyskuje sama naprawa
      // kolejności. Dawny `replace` z kotwicą `^[ \t]*` napisów nie ruszał
      // i to trzeba było zachować.
      if (c === '\'' || c === '"' || c === '`') {
        const cudz = c;
        out += c;
        i++;
        while (i < s.length) {
          if (s[i] === '\\') { out += s[i] + (s[i + 1] ?? ''); i += 2; continue; }
          if (s[i] === cudz) { out += s[i]; i++; break; }
          if (cudz !== '`' && s[i] === '\n') break;
          out += s[i];
          i++;
        }
        continue;
      }
      out += c;
      i++;
    }
    return out;
  };

  // ── ⛔ BRAK PLIKU JEST FAIL-em Z NAZWĄ, nie wyjątkiem `ENOENT` (O76) ──
  // Strażnik, który pada przed pierwszą asercją, w CI wygląda jak awaria
  // narzędzia — a jest EKRANEM, KTÓRY ZNIKNĄŁ Z REPOZYTORIUM. Wymienione są
  // DWA ekrany, na których 16.08 spłacono dług WT-33: gdyby któryś zmienił
  // nazwę, zapadki niżej i tak by zapaliły, ale powiedziałyby „ubyło pustki"
  // o ekranie, który po prostu nazywa się inaczej.
  const EKRANY_NAPRAWY_B3 = ['app/(tabs)/kalendarz.tsx', 'app/(tabs)/dzis.tsx'];
  const BRAK_PLIKOW = EKRANY_NAPRAWY_B3.filter((p) => !existsSync(join(appRoot, p)));

  check('⛔ (I2-0) oba ekrany naprawione 16.08 (B3) istnieją i dają się odczytać',
    BRAK_PLIKOW.length === 0,
    `NIE MA TYCH PLIKÓW: ${BRAK_PLIKOW.join(', ')} — zmieniła się nazwa albo miejsce ekranu. `
    + 'Popraw listę w tym pliku ALBO przywróć ekran; do tego czasu zapadki niżej '
    + 'zameldują „ubyło pustki" o czymś, czego nikt nie usunął.');

  // ─────────────────────────────────────────────────────────────────
  // DETEKTOR — czyj to przodek w JSX
  // ─────────────────────────────────────────────────────────────────
  const DOTYKALNE = new Set([
    'TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback', 'Pressable', 'Button',
  ]);

  /**
   * Czy `<` w tym miejscu OTWIERA znacznik JSX, a nie jest znakiem „mniejsze"
   * albo nawiasem typu generycznego.
   *
   * ⚠️ ROZSTRZYGA ZNAK PRZED, NIE PO. `useState<Goal[]>` i `Wejscie<T>` mają
   * przed `<` znak identyfikatora; `return (\n <View>` i `{x ? <Text>` nie mają.
   * Bez tego rozróżnienia typy generyczne wchodziłyby na stos jako elementy
   * i przodkowie byliby zmyśleni.
   */
  const otwieraZnacznik = (s: string, i: number): boolean => {
    const nastepny = s[i + 1];
    if (nastepny !== '/' && nastepny !== '>' && !(nastepny >= 'A' && nastepny <= 'Z')) return false;
    return !/[A-Za-z0-9_$.]/.test(i > 0 ? s[i - 1] : '\n');
  };

  /** Koniec znacznika — z przeskokiem napisów i zbalansowanych `{}`, żeby `=>` w propie nie udawało `>`. */
  const koniecZnacznika = (s: string, od: number): number => {
    let i = od;
    let klamry = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === '"' || c === "'" || c === '`') {
        const cudz = c;
        i++;
        while (i < s.length && s[i] !== cudz) { if (s[i] === '\\') i++; i++; }
        i++;
        continue;
      }
      if (c === '{') { klamry++; i++; continue; }
      if (c === '}') { klamry--; i++; continue; }
      if (c === '>' && klamry === 0) return i;
      i++;
    }
    return -1;
  };

  /** Stos otwartych elementów JSX w danym miejscu pliku — czyli lista PRZODKÓW. */
  const przodkowieJSX = (zywy: string, cel: number): string[] => {
    const stos: string[] = [];
    let i = 0;
    while (i < cel) {
      if (zywy[i] !== '<' || !otwieraZnacznik(zywy, i)) { i++; continue; }
      const zamykajacy = zywy[i + 1] === '/';
      const nazwa = /^[A-Za-z0-9_.]*/.exec(zywy.slice(i + (zamykajacy ? 2 : 1)))![0];
      const koniec = koniecZnacznika(zywy, i + 1);
      if (koniec < 0) { i++; continue; }
      if (koniec >= cel) break;
      if (zamykajacy) {
        const gdzie = stos.lastIndexOf(nazwa);
        if (gdzie >= 0) stos.length = gdzie;
      } else if (zywy[koniec - 1] !== '/') stos.push(nazwa);
      i = koniec + 1;
    }
    return stos;
  };

  type MiejscePustki = { klucz: string; linia: number; maWyjscie: boolean; strzalka: boolean; tresc: string };

  /**
   * Wszystkie miejsca, w których ekran RYSUJE WYJŚCIE Z PUSTKI: `{cokolwiek.cta}`
   * albo stałą `PUSTKA_…_CTA…` z `lib/trzyPustki.ts`.
   *
   * ⚠️ Klucz to `plik :: wyrażenie #n`, NIE numer linii (**O63**): dopisany
   * komentarz przesuwa numer i przypisuje cudzy błąd nie temu, kto go popełnił.
   * Numer linii idzie do KOMUNIKATU, żeby dało się to znaleźć bez zgadywania.
   */
  const WYJSCIE_PUSTKI = /\{\s*(?:[A-Za-z_$][\w$]*\.cta|PUSTKA_[A-Z_]*CTA[A-Z_]*)\s*\}/g;

  const zmierzPlik = (sciezka: string, surowe: string): MiejscePustki[] => {
    const zywy = bezKomentarzy(surowe);
    const linie = surowe.split('\n');
    const licznik = new Map<string, number>();
    const out: MiejscePustki[] = [];
    for (const m of zywy.matchAll(WYJSCIE_PUSTKI)) {
      const i = m.index!;
      // ⛔ `${p.cta}` w szablonie to SKLEJANIE NAPISU, nie rysowanie wyjścia
      // (`app/(tabs)/ja.tsx` robi tak przy budowaniu podpisu karty).
      if (zywy[i - 1] === '$') continue;
      const wyrazenie = m[0].replace(/[{}\s]/g, '');
      const n = (licznik.get(wyrazenie) ?? 0) + 1;
      licznik.set(wyrazenie, n);
      const linia = zywy.slice(0, i).split('\n').length;
      const koniecLinii = zywy.indexOf('\n', i);
      out.push({
        klucz: `${sciezka} :: ${wyrazenie} #${n}`,
        linia,
        maWyjscie: przodkowieJSX(zywy, i).some((e) => DOTYKALNE.has(e)),
        strzalka: /→/.test(zywy.slice(i, koniecLinii < 0 ? undefined : koniecLinii)),
        tresc: (linie[linia - 1] ?? '').trim(),
      });
    }
    return out;
  };

  // ── Odkrywanie z katalogu, nie lista na sztywno (O69) ──
  // ⭐ `PLIKI_PRZEMIATANE` jest już policzone wyżej przez `chodzPo` i ma
  // odjęte `_diag_backup/` oraz selftesty. Druga lista rozjechałaby się
  // z pierwszą — lista na sztywno kłamie na zielono.
  const EKRANY = PLIKI_PRZEMIATANE.filter((p) => p.startsWith('app/') || p.startsWith('components/'));
  const MIEJSCA = EKRANY.flatMap((p) => zmierzPlik(p, ZRODLA_PRAWDZIWE[p]));

  const zWyjsciem = MIEJSCA.filter((m) => m.maWyjscie);
  // ⭐ FAŁSZYWY PRZYCISK: napis ze strzałką „→" i BEZ elementu dotykalnego
  // nad sobą. Strzałka jest w tym produkcie afordancją dotknięcia — stoi
  // pod nią `styles.pustkaCta` / `styles.cardAction`, kolor marki.
  const falszywePrzyciski = MIEJSCA.filter((m) => !m.maWyjscie && m.strzalka);

  // ── ⭐ POMIAR WYPISANY GŁOŚNO, przy każdym uruchomieniu ──
  console.log(`   [pomiar] miejsc rysujących wyjście z pustki: ${MIEJSCA.length}`
    + ` · z prawdziwym wyjściem: ${zWyjsciem.length}`
    + ` · ⛔ FAŁSZYWYCH PRZYCISKÓW (strzałka bez onPress): ${falszywePrzyciski.length}`);
  for (const m of MIEJSCA) {
    const znak = m.maWyjscie ? '  wyjście  ' : (m.strzalka ? '⛔ FAŁSZYWY ' : '  napis    ');
    console.log(`   [pomiar] ${znak} ${m.klucz}  (linia ${m.linia})  ${m.tresc}`);
  }

  // ═════════════════════════════════════════════════════════════════
  // ⭐ ZAPADKI NA RÓWNOŚĆ — wartości ZMIERZONE 16.08.2026, `main` = `123e09c`
  // ═════════════════════════════════════════════════════════════════
  // ⚠️ Poniższe trzy listy są POMIAREM, nie przepisaniem z pamięci. Każda
  // porównywana jest na RÓWNOŚĆ, nie na „≥ 1" (**O73**): „co najmniej jedna
  // pustka ma wyjście" przeszłoby także wtedy, gdy wyjście zniknie
  // z czternastu miejsc na piętnaście.

  // ═════════════════════════════════════════════════════════════════
  // ⛔ ⭐ ASERCJA BEZWZGLĘDNA — DECYZJA KUBY, 16.08.2026, PYTANIE B3: „NIE MA"
  // ═════════════════════════════════════════════════════════════════
  // Obietnica WT-33 brzmi: „każda pustka kończy się dokładnie jedną akcją".
  // Kuba rozstrzygnął, że napis ze strzałką bez `onPress` **NIE SPEŁNIA** tej
  // obietnicy — czyli WT-33 stała na `JEST` przez dwa pasy nieprawdziwie.
  //
  // ⭐ TA ASERCJA NIE MA LISTY. Nie ma czego skreślić, nie ma czego dopisać
  // i nie da się jej uciszyć inaczej niż naprawą ekranu. Miejsca są ODKRYWANE
  // Z KATALOGU (`PLIKI_PRZEMIATANE` wyżej), a próg to ZERO — nie „tyle, co
  // wczoraj". Zapadka na równość ze zmierzonym długiem byłaby tu słabsza:
  // przepuszczałaby dług w nieskończoność, bo „zgadza się z pomiarem".
  //
  // Dwa fałszywe przyciski, które ta asercja zdjęła 16.08.2026 (oba weszły
  // commitem `0705760`, pas T, i oba przeżyły pas C1, który ogłosił naprawę
  // WT-33):
  //   • `app/(tabs)/kalendarz.tsx`, zakładka „Listy", sekcja „Nadchodzące" —
  //     pustka ŚLEPA CAŁKOWICIE, w tej sekcji nie było żadnego innego wejścia;
  //   • `app/(tabs)/dzis.tsx`, karta „Dziś w kalendarzu" — „Dodaj trening →"
  //     bez odbioru dotknięcia.
  check('⛔ ⭐ (I2-0) KAŻDE CTA pustki obiecujące akcję (strzałka „→") siedzi w elemencie '
    + 'dotykalnym z `onPress` — ZERO fałszywych przycisków, bez listy wyjątków (decyzja Kuby, B3)',
    falszywePrzyciski.length === 0,
    `⛔ FAŁSZYWE PRZYCISKI (${falszywePrzyciski.length}): `
    + `${falszywePrzyciski.map((m) => `${m.klucz} (linia ${m.linia}) ${m.tresc}`).join('  |  ') || '—'} `
    + '→ pustka rysuje „coś →", zawodnik dotyka obietnicy i NIC SIĘ NIE DZIEJE. '
    + 'Naprawa: owinąć CTA w `TouchableOpacity` z `onPress`, który TĘ pustkę zamyka '
    + '(wzorzec: `app/(tabs)/kalendarz.tsx`, sekcja „Nadchodzące"). '
    + '⛔ NIE WOLNO uciszyć tej asercji zdjęciem strzałki z CTA, które akcję ma — '
    + 'to łapie zapadka „NAPISÓW jest dokładnie tyle" niżej.');

  // ═════════════════════════════════════════════════════════════════
  // ⭐ ZAPADKI NA RÓWNOŚĆ — wartości ZMIERZONE 16.08.2026, po naprawie B3
  // ═════════════════════════════════════════════════════════════════
  // ⚠️ Poniższe listy są POMIAREM, nie przepisaniem z pamięci. Każda
  // porównywana na RÓWNOŚĆ, nie na „≥ 1" (**O73**): „co najmniej jedna pustka
  // ma wyjście" przeszłoby także wtedy, gdy wyjście zniknie z czterech miejsc
  // na pięć. Asercja bezwzględna wyżej pilnuje, że nikt nie DOŁOŻY fałszywego
  // przycisku; te trzy pilnują, że nikt nie ZDEJMIE pustki ani jej wyjścia.

  /** Wszystkie miejsca rysujące CTA pustki. Ubytek = pustka zniknęła z ekranu. */
  const MIEJSCA_16_08 = [
    'app/(tabs)/biblioteka.tsx :: pustka.cta #1',
    'app/(tabs)/cele.tsx :: p.cta #1',
    'app/(tabs)/centrum-decyzji.tsx :: p.cta #1',
    'app/(tabs)/diagnoza.tsx :: pustkaOdczytu.cta #1',
    'app/(tabs)/dziennik.tsx :: pustkaHistorii.cta #1',
    'app/(tabs)/dzis.tsx :: pustka.cta #1',
    'app/(tabs)/dzis.tsx :: pustkaDzis.cta #1',
    'app/(tabs)/dzis.tsx :: pustkaDzis.cta #2',
    'app/(tabs)/ja.tsx :: pustkaDiagnozy.cta #1',
    'app/(tabs)/kalendarz.tsx :: PUSTKA_BRAK_KONFIGURACJI_CTA #1',
    'app/(tabs)/kalendarz.tsx :: pustkaTygodnia.cta #1',
    'app/(tabs)/kalendarz.tsx :: pustkaTygodnia.cta #2',
    'app/(tabs)/kalendarz.tsx :: pustkaTygodnia.cta #3',
    'app/(tabs)/mecz.tsx :: pustkaHistorii.cta #1',
    'app/(tabs)/profil.tsx :: pustkaKontuzji.cta #1',
    'components/DiagnosisProfileView.tsx :: pustka.cta #1',
    'components/FocusBlockPlanner.tsx :: p.cta #1',
  ];

  /**
   * ⭐ Miejsca z PRAWDZIWYM wyjściem — dotknięcie CTA coś robi.
   * Piątka po naprawie z 16.08: dwa nowe (`dzis.tsx #2`, `kalendarz.tsx #3`)
   * doszły do trzech, które wyjście miały wcześniej.
   */
  const Z_WYJSCIEM_16_08 = [
    'app/(tabs)/dzis.tsx :: pustkaDzis.cta #2',
    'app/(tabs)/ja.tsx :: pustkaDiagnozy.cta #1',
    'app/(tabs)/kalendarz.tsx :: PUSTKA_BRAK_KONFIGURACJI_CTA #1',
    'app/(tabs)/kalendarz.tsx :: pustkaTygodnia.cta #1',
    'app/(tabs)/kalendarz.tsx :: pustkaTygodnia.cta #3',
  ];

  /**
   * ⭐ NAPISY — CTA BEZ strzałki. To **nie jest** dług i to jest decyzja Kuby
   * z 16.08.2026, podjęta razem z B3: wszystkie dwanaście rysują CTA rodzaju
   * `blad_odczytu` („Pociągnij w dół, żeby sprawdzić jeszcze raz." albo „Wejdź
   * tu jeszcze raz za chwilę." przy `daSieOdswiezyc: false`) — czyli
   * INSTRUKCJĘ, nie przycisk. Wyjściem jest tam `RefreshControl` albo ponowne
   * wejście. Owinięcie instrukcji w `TouchableOpacity` zrobiłoby z niej DRUGI
   * RODZAJ FAŁSZYWEGO PRZYCISKU: element, który wygląda na dotykalny i nie ma
   * dokąd prowadzić.
   *
   * ⛔ PO CO TU ZAPADKA. Bez niej asercję bezwzględną wyżej da się uciszyć
   * najtańszym możliwym ruchem: **zdjęciem strzałki** z CTA, które akcję ma.
   * Fałszywy przycisk znika z pomiaru, obietnica WT-33 znika z ekranu,
   * a suita świeci. Wzrost tej listy zapala asercję i każe sprawdzić, CZY
   * nowy napis naprawdę jest instrukcją, czy jest ukrytym długiem.
   */
  const NAPISY_16_08 = MIEJSCA_16_08.filter((k) => !Z_WYJSCIEM_16_08.includes(k));

  const roznica = (zmierzone: string[], oczekiwane: string[]) => ({
    brakujacy: oczekiwane.filter((k) => !zmierzone.includes(k)),
    nadmiarowi: zmierzone.filter((k) => !oczekiwane.includes(k)),
  });

  const rWszystkie = roznica(MIEJSCA.map((m) => m.klucz), MIEJSCA_16_08);
  check('⭐ (I2-0) CTA pustki rysują DOKŁADNIE te miejsca, co 16.08 — RÓWNOŚĆ, nie „≥ 1" (O73)',
    rWszystkie.brakujacy.length === 0 && rWszystkie.nadmiarowi.length === 0,
    `UBYŁO: ${rWszystkie.brakujacy.join(' | ') || '—'} · DOSZŁO: ${rWszystkie.nadmiarowi.join(' | ') || '—'} `
    + '→ ubyło: zawodnik przestał gdzieś widzieć wyjście z pustki i żadna asercja tego pliku tego nie zauważa; '
    + 'doszło: sprawdź, czy NOWE miejsce kończy się elementem dotykalnym, a nie samym napisem ze strzałką.');

  const rWyjscia = roznica(zWyjsciem.map((m) => m.klucz), Z_WYJSCIEM_16_08);
  check('⭐ (I2-0) pustki z PRAWDZIWYM wyjściem to dokładnie te PIĘĆ, co po naprawie B3 16.08',
    rWyjscia.brakujacy.length === 0 && rWyjscia.nadmiarowi.length === 0,
    `STRACIŁY WYJŚCIE: ${rWyjscia.brakujacy.join(' | ') || '—'} · ZYSKAŁY: ${rWyjscia.nadmiarowi.join(' | ') || '—'} `
    + '→ straciło: ktoś zdjął `TouchableOpacity` i został sam napis — zawodnik dotyka i nic się nie dzieje; '
    + 'zyskało: to jest NAPRAWA, dopisz ją do `Z_WYJSCIEM_16_08`.');

  const rNapisy = roznica(MIEJSCA.filter((m) => !m.maWyjscie).map((m) => m.klucz), NAPISY_16_08);
  check('⛔ (I2-0) NAPISÓW (CTA bez strzałki, instrukcja przy `blad_odczytu`) jest dokładnie tyle, '
    + 'co 16.08 — tędy nie da się uciszyć asercji bezwzględnej zdjęciem strzałki',
    rNapisy.brakujacy.length === 0 && rNapisy.nadmiarowi.length === 0,
    `PRZESTAŁO BYĆ NAPISEM: ${rNapisy.brakujacy.join(' | ') || '—'} · `
    + `⛔ ZOSTAŁO NAPISEM: ${rNapisy.nadmiarowi.join(' | ') || '—'} `
    + '→ doszło: albo to nowa instrukcja `blad_odczytu` (wtedy dopisz), albo ktoś ZDJĄŁ STRZAŁKĘ z CTA, '
    + 'które obiecywało akcję — czyli schował dług przed asercją bezwzględną zamiast go spłacić.');

  // ⭐ ZAPADKA NA SKASOWANIE (wzorzec B2-5). Bez niej wszystkie trzy asercje
  // wyżej spełnia się przez USUNIĘCIE pustek z ekranów — strażnik nagradzałby
  // wtedy skasowanie. Pustka ma być LICZONA PRZEZ MODUŁ, nie zmyślona na ekranie.
  const ekranyBezModulu = [...new Set(MIEJSCA.map((m) => m.klucz.split(' :: ')[0]))]
    .filter((p) => !/rozpoznajPustke\s*\(/.test(bezKomentarzy(ZRODLA_PRAWDZIWE[p])));
  check('⭐ (I2-0) każdy ekran z pustką liczy ją `rozpoznajPustke()`, a nie sam u siebie',
    ekranyBezModulu.length === 0,
    `ekran rysuje wyjście z pustki, ale nie woła modułu: ${ekranyBezModulu.join(', ')} — `
    + 'drugi rachunek „którą to pustkę pokazać" rozjedzie się z `lib/trzyPustki.ts` po cichu, '
    + 'a zawodnik przeczyta „nic nie masz zaplanowane" wtedy, gdy odczyt padł');

  // ═════════════════════════════════════════════════════════════════
  // ⭐ STRAŻNIK STRAŻNIKA — detektor sprawdzony na PRÓBKACH, nie na brudzie
  // ═════════════════════════════════════════════════════════════════
  // ⚠️ Ta sama lekcja, co przy `PROBKA_TRAFIA_*` wyżej (**O71**): materiał,
  // który znika razem z naprawą kodu, jest materiałem, na którym nie da się
  // oprzeć testu. Gdy Kuba rozstrzygnie B3 i obie pustki dostaną `onPress`,
  // `falszywePrzyciski` będzie puste — a detektor nadal musi być dowiedziony.
  {
    const PROBKA_Z_WYJSCIEM =
      'const A = () => (<View>'
      + '<Text style={s.empty}>{p.tekst}</Text>'
      + '<TouchableOpacity onPress={() => router.push("/profil")}>'
      + '<Text style={s.cta}>{p.cta} →</Text></TouchableOpacity></View>);';
    const PROBKA_BEZ_WYJSCIA =
      'const B = () => (<View>'
      + '<Text style={s.empty}>{p.tekst}</Text>'
      + '<Text style={s.cta}>{p.cta} →</Text></View>);';
    // ⛔ Próbka, na której detektor MA MILCZEĆ mimo obecności `TouchableOpacity`
    // w pliku: przycisk jest ZAMKNIĘTY przed pustką, więc nie jest jej przodkiem.
    // Bez niej „detektor działa" znaczyłoby tylko „detektor widzi słowo
    // TouchableOpacity gdziekolwiek", a taki detektor jest bezużyteczny.
    const PROBKA_PRZYCISK_OBOK =
      'const C = () => (<View>'
      + '<TouchableOpacity onPress={x}><Text>co innego</Text></TouchableOpacity>'
      + '<Text style={s.cta}>{p.cta} →</Text></View>);';

    const zProbki = (zrodlo: string) => zmierzPlik('probka.tsx', zrodlo)[0];

    check('⭐ (I2-0) (strażnik strażnika) detektor WIDZI wyjście, gdy CTA siedzi w `TouchableOpacity`',
      zProbki(PROBKA_Z_WYJSCIEM)?.maWyjscie === true,
      'detektor nie rozpoznaje poprawnego kształtu — wtedy zapadka zgłaszałaby jako dług także naprawione miejsca');

    check('⭐ (I2-0) (strażnik strażnika) detektor NAZYWA fałszywy przycisk: strzałka bez `onPress`',
      zProbki(PROBKA_BEZ_WYJSCIA)?.maWyjscie === false && zProbki(PROBKA_BEZ_WYJSCIA)?.strzalka === true,
      'detektor przepuszcza goły `<Text>` ze strzałką — czyli dokładnie ten defekt, dla którego ten blok powstał');

    check('⛔ (I2-0) (strażnik strażnika) detektor MILCZY, gdy przycisk stoi OBOK pustki, nie nad nią',
      zProbki(PROBKA_PRZYCISK_OBOK)?.maWyjscie === false,
      'detektor liczy zamknięty `</TouchableOpacity>` jako przodka — wtedy każda pustka na ekranie '
      + 'z jakimkolwiek przyciskiem wyglądałaby na naprawioną');
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
