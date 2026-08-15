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

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
