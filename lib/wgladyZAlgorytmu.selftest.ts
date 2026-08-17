// PLAN-D-B3 08.2026 (14.08.2026) — NOWY PLIK. STRAŻNIK PRODUCENTA WGLĄDÓW.
//
//   npx tsx lib/wgladyZAlgorytmu.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ── PO CO TEN PLIK ISTNIEJE ───────────────────────────────────────────
// `lib/wgladyZAlgorytmu.ts` produkuje ZDANIA, które przeczyta nastolatek,
// i robi to z liczb, których dziś w bazie prawie nie ma. Dwa najgroźniejsze
// defekty tego pliku są NIEWIDOCZNE przy zielonych testach i pełnym ekranie:
//   • wgląd, który mówi coś bez pokrycia w danych TEGO zawodnika (łamie Z0);
//   • producent, który po cichu nic nie oddaje — bo wtedy „wglądy działają",
//     tylko nikt ich nigdy nie widzi, i nikt nie umie powiedzieć dlaczego.
//
// ── ⭐ SZÓSTA GRUPA JEST TU NAJWAŻNIEJSZA ────────────────────────────
// Pierwsze pięć grup asercji jest SPEŁNIALNYCH przez producenta, który nigdy
// niczego nie oddaje. Grupa 6 podaje KOMPLET danych, przy którym wgląd MUSI
// powstać, i sprawdza, że powstał. Bez niej ten strażnik nagradzałby funkcję,
// która nic nie robi — a to jest dokładnie ten „cichy brak", którego szukamy.
//
// ── ⭐ TEN PLIK ŁAMIE KOD CELOWO (sekcja 9) ──────────────────────────
// Sześć mutacji, po jednej na grupę. Punktem wpięcia jest drugi argument
// `policzWglady(w, zasady)` — ten sam wzorzec co `ulozKolejke(w, zasady)`
// w pasie B1. Mutacja, która nie podnosi liczby FAIL-i, oznacza grupę, która
// niczego nie pilnuje.
//
// ⚠️ ZAKAZ `new URL(...)` (O53) — `tsconfig` ciągnie bibliotekę DOM i kontrola
// typów pada z TS2769. Ścieżka idzie przez `readFileSync(join(dirname(...)))`.
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75)
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — nazwane liczbą. Ten plik miał 81 ASERCJI i ANI JEDNEJ,
// która czytałaby EKRAN: `readFileSync` sięgał po `wgladyZAlgorytmu.ts`, czyli
// po WŁASNY moduł. Sześć wglądów mogło być policzonych bezbłędnie i nigdzie
// nienarysowanych — 81 na 81 świeciło na zielono. Tak właśnie wyglądał ten plik
// przez pierwszą dobę życia: nagłówek `app/(tabs)/dzis.tsx` cytuje pomiar
// z 15.08 — „grep -rn wgladyZAlgorytmu app components → ZERO".
//
// ⚠️ KOREKTA WOBEC H1 (O74). H1 podał dla tego strażnika commit z defektem
// `276a717` (2026-08-14 20:40). Moduł `lib/wgladyZAlgorytmu.ts` I ten strażnik
// powstały RAZEM dopiero w `42a3f87` (2026-08-14 21:30) — pięćdziesiąt minut
// PÓŹNIEJ. Na `276a717` nie istniał ani moduł, ani strażnik, więc podany
// „stan z defektem" nie mógł niczego pokazać. To jest błąd H1.
//
// ⚠️ TEN STRAŻNIK JEST TEŻ K3: jeden commit narodzin dla modułu i dla strażnika,
// więc testu historycznego „stan sprzed naprawy" nie da się zrobić — dowód idzie
// mutacją ekranu (O77).
//
// ⚠️ CZEGO TA SEKCJA ŚWIADOMIE NIE POWTARZA. Wpięcia wglądów w ekran „Dziś"
// pilnuje już `lib/wgladyNaDzis.selftest.ts` (pas B4): że ekran woła
// `policzWglady` i `wgladDlaPozycji`, wsuwa kandydatów do `dodatkowi` rankera,
// buduje sześć wejść bez `?? []` i naprawdę rysuje trzecią część wglądu.
// Sekcja 0-EK niżej dokłada to, czego tamten strażnik NIE MA: odkrywanie
// konsumentów z katalogu i równość ich zbioru (O69/O73), FAIL z nazwą zamiast
// `ENOENT` (O76), oraz cztery reguły o tym, czego ekranowi NIE WOLNO wiedzieć
// i co z wglądu MUSI dojść do zawodnika.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { czyPrawdziwySlad, ulozKolejke, WAGA_BAZOWA, slad } from './kolejkaPodania';
import type { Kandydat, WejsciaKolejki } from './kolejkaPodania';
import type { StanGlosu } from './glosTygodnia';
import { czytajOgraniczenia } from './ograniczenia';
import { odczytZadan } from './zadania';
import {
  DLUGOSC_OSI,
  KLUCZE_WGLADOW,
  MIN_MECZOW_NA_OS,
  MIN_NOCY_NA_SERIE,
  MIN_POMIAROW_RPE,
  MIN_ZGLOSZEN_BOLU,
  OKNO_BOLU_DNI,
  OKNO_SESJI_DNI,
  OKNO_ZBLIZAJACEGO_MECZU_DNI,
  ZASADY_WGLADOW,
  dataPoPolsku,
  idWgladu,
  liczbaPoPolsku,
  naKandydata,
  niesieLiczbe,
  odmiana,
  policzWglady,
  wgladDlaPozycji,
  wszyscyKandydaciMajaSlad,
  zbudujWglad,
} from './wgladyZAlgorytmu';
import type {
  KluczWgladu,
  WejsciaWgladow,
  Wglad,
  WynikWgladu,
  ZasadyWgladow,
} from './wgladyZAlgorytmu';

const katalog = dirname(fileURLToPath(import.meta.url));

/**
 * Źródło BEZ komentarzy — ten sam wzorzec co `lib/kolejkaPodania.selftest.ts`.
 * ⚠️ Nagłówek `wgladyZAlgorytmu.ts` CYTUJE zakazane słowa („`mood_motivation`
 * NIE WCHODZI", „ZERO Supabase"). Strażnik czytający surowy tekst zapalałby
 * się na własnym wyjaśnieniu, więc jedynym sposobem, żeby go uciszyć, byłoby
 * skasowanie tej wiedzy, dla której powstał.
 */
const bezKomentarzy = (s: string): string => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .join('\n');

const ZRODLO_SUROWE = readFileSync(join(katalog, 'wgladyZAlgorytmu.ts'), 'utf8');
const ZRODLO = bezKomentarzy(ZRODLO_SUROWE);

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string): void {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

console.log('wgladyZAlgorytmu.selftest.ts — strażnik producenta wglądów (pas B3)\n');

// ═════════════════════════════════════════════════════════════════════
// ⭐ 0-EK. PAS I2 16.08.2026 — EKRAN, KTÓRY RYSUJE WGLĄDY (K4 / O75)
// ═════════════════════════════════════════════════════════════════════
// Wszystkie asercje niżej czytają ŹRÓDŁA EKRANÓW, nie moduł. Bez nich 81
// asercji tego pliku opisuje sześć wglądów, których nikt nie musi pokazać.
{
  const root = dirname(katalog);

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

  const PLIK_DZIS = 'app/(tabs)/dzis.tsx';
  /** ⭐ PLAN-D-A2 — DRUGI KONSUMENT wglądów, od 17.08.2026. */
  const PLIK_LISTA = 'components/ListaZadan.tsx';
  /** Wgląd wychodzi do zawodnika jako POZYCJA KOLEJKI — rysuje ją ta karta. */
  const PLIK_KARTA = 'components/PozycjaKolejkiCard.tsx';
  const dzis = bezKomentarzy(surowe(PLIK_DZIS));
  const karta = bezKomentarzy(surowe(PLIK_KARTA));

  console.log('0-EK. EKRAN, KTÓRY RYSUJE WGLĄDY (K4 / O75)');

  check('⛔ (I2-0) każdy ekran z listy strażnika istnieje i daje się odczytać',
    BRAK_PLIKOW.length === 0,
    `NIE MA TYCH PLIKÓW: ${BRAK_PLIKOW.join(', ')} — zmieniła się nazwa albo miejsce ekranu. `
    + 'Popraw listę w tym pliku ALBO przywróć ekran; do tego czasu asercje niżej '
    + 'czytają PUSTY tekst i nie znaczą nic.');

  // ── Odkrywanie z katalogu, nie lista na sztywno (O69) ──
  const POMIN_KAT = new Set(['_diag_backup', 'node_modules', '.git', '.expo', 'assets']);
  function chodz(kat: string, out: string[] = []): string[] {
    if (!existsSync(kat)) return out;
    for (const wpis of readdirSync(kat)) {
      if (POMIN_KAT.has(wpis)) continue;
      const p = join(kat, wpis);
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
    (p) => /from\s+'[^']*\/wgladyZAlgorytmu'/.test(bezKomentarzy(readFileSync(join(root, p), 'utf8'))));

  // ── Powierzchnia importu: ekran bierze z modułu DOKŁADNIE cztery funkcje ──
  // ⚠️ To jest ta sama rzecz co „ekran nie liczy tego drugi raz", tylko zmierzona
  // po stronie wejścia. Progi (`MIN_NOCY_NA_SERIE`, `OKNO_BOLU_DNI`, …) należą
  // do producenta; ekran, który je zaimportuje, prędzej czy później zacznie coś
  // na nich rozstrzygać — i wtedy ta sama reguła istnieje w dwóch miejscach.
  // ⚠️ `[^}]*`, NIE `[\s\S]*?`: zmierzone 16.08.2026 — leniwa wersja tego wyrażenia
  // złapała blok od PIERWSZEGO `import {` w pliku (a `dzis.tsx` ma ich kilkadziesiąt)
  // aż do klamry przy `wgladyZAlgorytmu` i naliczyła 76 „funkcji modułu" zamiast
  // czterech. Strażnik, który liczy nie to, co myśli, jest gorszy niż jego brak.
  const importyRuntime = Array.from(
    dzis.matchAll(/import\s*\{([^}]*)\}\s*from\s*'[^']*\/wgladyZAlgorytmu'/g))
    .flatMap((m) => m[1].split(','))
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('type '))
    .sort();
  const IMPORTY_ZMIERZONE = ['dataPoPolsku', 'liczbaPoPolsku', 'policzWglady', 'wgladDlaPozycji'];

  console.log('[pomiar] 16.08.2026, main=123e09c — lib/wgladyZAlgorytmu.ts: '
    + `konsumenci w app/+components/ = ${konsumenci.length} [${konsumenci.join(', ') || '—'}] · `
    + `funkcje modułu wołane z ekranu = ${importyRuntime.length} [${importyRuntime.join(', ') || '—'}] · `
    + `przeszukane pliki: ${EKRANY.length}`);

  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c`, nie przepisane z pamięci.
  // RÓWNOŚĆ, nie „≥ 1" (O73): „co najmniej jeden konsument" przeszłoby także
  // wtedy, gdyby „Dziś" przestało rysować wglądy, a zaczął je rysować ktoś inny.
  // ⭐ PLAN-D-A2 17.08.2026 — ZAPADKA PRZESTAWIONA Z JEDNEGO EKRANU NA DWA.
  // ⚠️ POPRAWIONA ZOSTAŁA ASERCJA, NIE KOD. Do 16.08.2026 stało tu
  // `[PLIK_DZIS]` i to była prawda: wglądy rysował DOKŁADNIE JEDEN ekran,
  // a `components/ListaZadan.tsx` — który woła TEGO SAMEGO rankera — nie
  // pokazywał ani jednego (zmierzone 17.08 na żywych danych: 1 pozycja
  // zamiast 3). Pas A2 dołożył drugiego KONSUMENTA, nie drugiego producenta:
  // `policzWglady` jest czystą funkcją z jednym argumentem i nadal ma w całym
  // produkcie JEDNĄ definicję.
  // ⛔ ZAPADKA ZOSTAJE NA RÓWNOŚĆ (O73): „co najmniej dwa" przepuściłoby
  // trzeci ekran, który zacznie rysować wglądy obok rankera.
  const KONSUMENCI = [PLIK_DZIS, PLIK_LISTA].sort();
  const brakujacy = KONSUMENCI.filter((p) => !konsumenci.includes(p));
  const nadmiarowi = konsumenci.filter((p) => !KONSUMENCI.includes(p));
  check('⭐ (A2-0) wglądy rysują DOKŁADNIE te dwa ekrany, co 17.08 — RÓWNOŚĆ, nie „≥ 1" (O73)',
    brakujacy.length === 0 && nadmiarowi.length === 0,
    `BRAKUJE: ${brakujacy.join(', ') || '—'} · NADMIAROWI: ${nadmiarowi.join(', ') || '—'} `
    + '→ ubył: producent wrócił do stanu z 15.08, w którym liczył sześć wglądów dla nikogo '
    + '(49 261 B kodu i 81 zielonych asercji bez ani jednego widza); doszedł: sprawdź, czy nowe '
    + 'miejsce podaje wglądy przez `dodatkowi` rankera, a nie obok niego — wgląd o objętości '
    + 'pokazany zawodnikowi po urazie jest dokładnie tym, czemu ranker zapobiega.');

  check('⛔ (I2-0) ekran bierze z modułu DOKŁADNIE te cztery funkcje, co 16.08 — ani jednego progu',
    JSON.stringify(importyRuntime) === JSON.stringify(IMPORTY_ZMIERZONE),
    `zaimportowane z modułu: ${JSON.stringify(importyRuntime)} (zmierzone 16.08: `
    + `${JSON.stringify(IMPORTY_ZMIERZONE)}) — doszło: ekran sięgnął po próg albo po producenta `
    + 'i zacznie rozstrzygać u siebie; ubyło: któraś funkcja przestała być wołana, '
    + 'a wtedy albo ekran liczy to samo drugi raz, albo przestał to pokazywać.');

  // ── ⛔ (I2-0a) PROGI NALEŻĄ DO PRODUCENTA, NIE DO EKRANU ──
  // Defekt, którego pilnuje: `if (noce.length >= 3)` na ekranie. Wtedy próg
  // istnieje dwa razy i pierwsza jego zmiana ominie jedną z kopii: producent
  // przestanie budować wgląd, a ekran nadal będzie miał gałąź, która go rysuje
  // (albo odwrotnie — zawodnik zobaczy zdanie oparte na dwóch nocach zamiast trzech).
  const NAZWY_PROGOW: [string, number][] = [
    ['MIN_NOCY_NA_SERIE', MIN_NOCY_NA_SERIE],
    ['MIN_POMIAROW_RPE', MIN_POMIAROW_RPE],
    ['MIN_MECZOW_NA_OS', MIN_MECZOW_NA_OS],
    ['MIN_ZGLOSZEN_BOLU', MIN_ZGLOSZEN_BOLU],
    ['OKNO_SESJI_DNI', OKNO_SESJI_DNI],
    ['OKNO_ZBLIZAJACEGO_MECZU_DNI', OKNO_ZBLIZAJACEGO_MECZU_DNI],
    ['OKNO_BOLU_DNI', OKNO_BOLU_DNI],
    ['DLUGOSC_OSI', DLUGOSC_OSI],
  ];
  const progiNaEkranie = NAZWY_PROGOW.filter(([n]) => dzis.includes(n) || karta.includes(n));
  check('⛔ (I2-0) ŻADEN z ośmiu progów producenta nie stoi na ekranie — jeden próg, jedno miejsce',
    progiNaEkranie.length === 0,
    `progi, które wyciekły na ekran: ${progiNaEkranie.map(([n, w]) => `${n}=${w}`).join(', ')} — `
    + 'reguła „ile pomiarów wystarczy, żeby coś powiedzieć zawodnikowi" ma DOKŁADNIE jedno miejsce '
    + '(lib/wgladyZAlgorytmu.ts). Druga kopia znaczy, że po zmianie progu zawodnik czyta zdanie '
    + 'oparte na mniejszej liczbie pomiarów, niż producent uznaje za wystarczającą — czyli opinię '
    + 'sprzedaną jako wiedza (Z0).');

  // ── ⛔ (I2-0b) EKRAN NIE ZNA SZEŚCIU KLUCZY ──
  // Defekt, którego pilnuje: `if (wglad.klucz === 'powtarzajacy_sie_bol') return null`.
  // Producent oddaje ZAWSZE sześć wyników w stałej kolejności, a o tym, który
  // zawodnik zobaczy, rozstrzyga RANKER (waga, kubełek, wyciszenia). Ekran,
  // który zna klucze, jest DRUGIM arbitrem — i to takim, który nie zna ani
  // hamulca bólu, ani osłony wzrostowej, ani ścieżki wyjścia.
  const kluczeNaEkranie = KLUCZE_WGLADOW.filter((k) => dzis.includes(k) || karta.includes(k));
  check('⛔ (I2-0) ekran NIE ROZGAŁĘZIA SIĘ po kluczach wglądów — wybór należy do rankera',
    kluczeNaEkranie.length === 0,
    `klucze wpisane na ekranie: ${kluczeNaEkranie.join(', ')} — ekran zaczął decydować, który `
    + 'z sześciu wglądów pokazać. Ten wybór ma jedno miejsce (ranker), bo tylko ono zna '
    + 'wyciszenie przy kontuzji, hamulec bólu i osłonę wzrostową; ekran wyciszy wgląd, '
    + 'którego ranker by przepuścił, albo pokaże ten, który ranker wstrzymał.');

  // ── ⭐ (I2-0c) ZASTRZEŻENIE WG-33 MA DOJŚĆ DO ZAWODNIKA ──
  // `naKandydata` doszywa `czegoNieMowi` do `dlaczego` — to jest JEDYNA droga,
  // którą „czego ta liczba nie mówi" (Z0-a, obowiązkowe przy dowodzie słabym)
  // wychodzi na ekran. Jeżeli którakolwiek z dwóch ścieżek rysowania przestanie
  // pokazywać `dlaczego`, liczba oparta na słabym dowodzie zostanie zawodnikowi
  // podana jako fakt bez zastrzeżenia — i nikt tego nie zobaczy, bo część 1
  // i część 3 nadal będą na miejscu.
  check('⭐ (I2-0) `dlaczego` (z doszytym `czegoNieMowi`) rysują OBIE ścieżki — pierwsza i reszta',
    /\{p\.dlaczego\}/.test(dzis) && /pokazacDlaczego=\{i !== 0\}/.test(dzis)
    && /\{pozycja\.dlaczego\}/.test(karta),
    'zniknęła jedna z dwóch ścieżek rysowania `dlaczego`: pierwsza pozycja rysuje je sama '
    + '(`{p.dlaczego}` pod nagłówkiem „dlaczego akurat to"), pozostałe przez kartę '
    + '(`pokazacDlaczego={i !== 0}`). `czegoNieMowi` wchodzi WYŁĄCZNIE tędy (WG-33 / Z0-a), '
    + 'więc bez tego zawodnik czyta liczbę ze słabego dowodu bez ani jednego zastrzeżenia.');

  // ── ⛔ (I2-0d) CZEGO ZAWODNIK NIE MA ZOBACZYĆ ──
  // Pola maszynowe wglądu. „Siła dowodu: słaby" i „rejestr: propozycja" to są
  // zdania o NAS, o naszym sposobie liczenia — nie o zawodniku. `ilePomiarow`
  // istnieje po to, żeby strażnik nie musiał zgadywać liczby z tekstu.
  const POLA_MASZYNOWE = ['silaDowodu', 'rejestrZnaczenia', 'ilePomiarow'];
  const maszynoweNaEkranie = POLA_MASZYNOWE.filter(
    (p) => new RegExp(`\\{[^}]*\\b(wglad|pozycja)\\.${p}\\b`).test(dzis + karta));
  check('⛔ (I2-0) pola maszynowe wglądu NIE wychodzą do zawodnika (`silaDowodu`, `rejestr`, `ilePomiarow`)',
    maszynoweNaEkranie.length === 0,
    `narysowane pola maszynowe: ${maszynoweNaEkranie.join(', ')} — to są zdania o naszym sposobie `
    + 'liczenia, nie o zawodniku. „Siła dowodu: słaby" nic mu nie mówi, a „3 pomiary" zaprasza '
    + 'do porównywania się (N3). Zastrzeżenie ma iść zdaniem (`czegoNieMowi`), nie etykietą.');

  // ── ⭐ (I2-0e) ZAPADKA NA SKASOWANIE ──
  // Cztery zakazy wyżej („nie importuj progów", „nie znaj kluczy", „nie rysuj
  // pól maszynowych") spełnia w komplecie ekran, który NIE RYSUJE WGLĄDU WCALE.
  // Ta asercja wymaga, żeby oś pomiarów naprawdę niosła LICZBĘ I JEDNOSTKĘ:
  // sama lista dat nie jest osią, tylko listą dat.
  check('⭐ (I2-0) oś pomiarów NAPRAWDĘ niesie liczbę i jednostkę, formatowane funkcją modułu',
    /liczbaPoPolsku\(p\.wartosc\)/.test(dzis) && /\{p\.jednostka\}/.test(dzis)
    && /dataPoPolsku\(p\.dzien\)/.test(dzis),
    'z osi zniknęła wartość, jednostka albo data — a wtedy cztery zakazy wyżej są spełnione '
    + 'przez ekran, który wglądu nie pokazuje. Zawodnik traci jedyne miejsce, w którym może '
    + 'sprawdzić, na jakich pomiarach stoi zdanie o nim (WG-34); zostaje mu samo twierdzenie.');
}

// ═════════════════════════════════════════════════════════════════════
// 0. WEJŚCIA TESTOWE
// ═════════════════════════════════════════════════════════════════════
// ⚠️ Kształty wierszy są 1:1 z tym, co zmierzone w bazie `kqrbztsvepjtggjmmcdx`
// 14.08.2026 wieczorem. Dane do testu budowane są TUTAJ — do bazy nie wchodzi
// ani jeden wiersz „na próbę", bo wymyślony wpis o śnie zawodnika to wymyślony
// fakt o nim (Z0).

const DZIS = '2026-08-14';

/** Wszystkie wejścia odczytane, wszystkie puste. To jest PRAWDZIWA pustka. */
const PUSTE: WejsciaWgladow = {
  dzis: DZIS,
  dziennik: { rodzaj: 'brak' },
  kalendarz: { rodzaj: 'brak' },
  powiazania: { rodzaj: 'brak' },
  bol: { rodzaj: 'brak' },
  mecze: { rodzaj: 'brak' },
  profil: { rodzaj: 'brak' },
};

/** Żadne wejście nie zostało odczytane. ⛔ To NIE jest pustka. */
const NIEODCZYTANE: WejsciaWgladow = {
  dzis: DZIS,
  dziennik: { rodzaj: 'nie_wiem', powod: 'daily_logs: timeout połączenia' },
  kalendarz: { rodzaj: 'nie_wiem', powod: 'calendar_events: 500' },
  powiazania: { rodzaj: 'nie_wiem', powod: 'daily_logs.calendar_event_id: 500' },
  bol: { rodzaj: 'nie_wiem', powod: 'pain_entries: odmowa polityki dostępu' },
  mecze: { rodzaj: 'nie_wiem', powod: 'match_contexts: timeout' },
  profil: { rodzaj: 'nie_wiem', powod: 'users: odmowa polityki dostępu' },
};

/** Jedno wejście nieodczytane, reszta pusta — pustka i „nie wiem" naraz. */
const MIESZANE: WejsciaWgladow = { ...PUSTE, dziennik: NIEODCZYTANE.dziennik };

/**
 * ⭐ KOMPLET — dane, przy których KAŻDY z sześciu wglądów MUSI powstać.
 * To jest wejście grupy 6. Gdyby producent oddawał pustkę, tu się to wyda.
 */
const KOMPLET: WejsciaWgladow = {
  dzis: DZIS,
  dziennik: {
    rodzaj: 'jest',
    dane: [
      { idWiersza: '101', dzien: '2026-08-09', senGodziny: 5.5, rpe: null },
      { idWiersza: '102', dzien: '2026-08-10', senGodziny: 7, rpe: null },
      { idWiersza: '103', dzien: '2026-08-11', senGodziny: 5, rpe: null },
      { idWiersza: '104', dzien: '2026-08-12', senGodziny: 4.5, rpe: null },
      { idWiersza: '105', dzien: '2026-08-13', senGodziny: 7.5, rpe: null },
      { idWiersza: '201', dzien: '2026-08-10', senGodziny: null, rpe: 8 },
      { idWiersza: '202', dzien: '2026-08-12', senGodziny: null, rpe: 9 },
      { idWiersza: '203', dzien: '2026-08-13', senGodziny: null, rpe: 9 },
    ],
  },
  kalendarz: {
    rodzaj: 'jest',
    dane: [
      { id: '10', dzien: '2026-08-06', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Blok Skupienia: Bieg ciągły' },
      { id: '11', dzien: '2026-08-08', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Blok Skupienia: Bieg ciągły' },
      { id: '12', dzien: '2026-08-11', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Blok Skupienia: Bieg ciągły' },
      { id: '13', dzien: '2026-08-13', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Blok Skupienia: Bieg ciągły' },
      { id: '14', dzien: '2026-08-09', rodzaj: 'micro_session', status: 'cancelled', tytul: 'Odwołana' },
      { id: '50', dzien: '2026-08-16', rodzaj: 'match', status: 'scheduled', tytul: 'Mecz ligowy' },
    ],
  },
  powiazania: {
    rodzaj: 'jest',
    dane: [
      { idWpisu: '301', idWydarzenia: '10' },
      { idWpisu: '302', idWydarzenia: '12' },
      { idWpisu: '303', idWydarzenia: null },
    ],
  },
  bol: {
    rodzaj: 'jest',
    dane: [
      { idWiersza: '401', dzien: '2026-08-06', miejsce: 'kolano', intensywnosc: 3, wykluczaZTreningu: false },
      { idWiersza: '402', dzien: '2026-08-09', miejsce: 'kolano', intensywnosc: 5, wykluczaZTreningu: false },
      { idWiersza: '403', dzien: '2026-08-12', miejsce: 'kolano', intensywnosc: 6, wykluczaZTreningu: false },
      { idWiersza: '404', dzien: '2026-08-10', miejsce: 'lydka', intensywnosc: 2, wykluczaZTreningu: false },
    ],
  },
  mecze: {
    rodzaj: 'jest',
    dane: [
      { idWiersza: '501', dzien: '2026-07-19', ciezkosc: 5, stanWejscia: 'entered_fresh' },
      { idWiersza: '502', dzien: '2026-07-26', ciezkosc: 7, stanWejscia: 'entered_fatigued' },
      { idWiersza: '503', dzien: '2026-08-02', ciezkosc: 8, stanWejscia: 'entered_fatigued' },
    ],
  },
  profil: {
    rodzaj: 'jest',
    dane: {
      rokUrodzenia: null,
      // ⚠️ Liczba HIPOTETYCZNA — dziś zawodnik ma za bramką wieku ZERO podpowiedzi
      // (wszystkie 18 z `min_age` ma `odbiorca='rodzic'`). Tu sprawdzamy gałąź,
      // która włączy się, gdy powstanie pierwsza treść wiekowa dla zawodnika.
      podpowiedziZaBramkaWieku: 12,
      podpowiedziRazem: 274,
      odcinkowMapyDrogi: 4,
    },
  },
};

/**
 * ⭐ STAN BAZY 14.08.2026, ZAWODNIK `8d7e1ebb…` — wiersze przepisane
 * z produkcji jeden do jednego (`user_id` pominięty, bo producent go nie widzi).
 * 7 wpisów Dziennika (5 ze snem, 2 z RPE) · 12 wydarzeń, 0 powiązań ·
 * 1 wpis bólowy · 2 mecze · `birth_year` = NULL.
 * ⚠️ To jest jedyne miejsce w tym pliku, gdzie liczby NIE są wymyślone,
 * i dlatego to na nim stoi asercja „dziś powstają dokładnie dwa wglądy".
 */
const STAN_BAZY_14_08: WejsciaWgladow = {
  dzis: DZIS,
  dziennik: {
    rodzaj: 'jest',
    dane: [
      { idWiersza: '4', dzien: '2026-08-05', senGodziny: 7.5, rpe: null },
      { idWiersza: '5', dzien: '2026-08-05', senGodziny: null, rpe: 6 },
      { idWiersza: '6', dzien: '2026-08-06', senGodziny: 7, rpe: null },
      { idWiersza: '7', dzien: '2026-08-06', senGodziny: 7.5, rpe: null },
      { idWiersza: '8', dzien: '2026-08-08', senGodziny: null, rpe: 5 },
      { idWiersza: '9', dzien: '2026-08-08', senGodziny: 7.5, rpe: null },
      { idWiersza: '10', dzien: '2026-08-08', senGodziny: 3, rpe: null },
    ],
  },
  kalendarz: {
    rodzaj: 'jest',
    dane: [
      { id: '14', dzien: '2026-08-01', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Blok Skupienia: Bieg ciągły w strefie tlenowej' },
      { id: '6', dzien: '2026-08-04', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Blok Skupienia: Bieg ciągły w strefie tlenowej' },
      { id: '10', dzien: '2026-08-06', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Blok Skupienia: Bieg ciągły w strefie tlenowej' },
      { id: '15', dzien: '2026-08-08', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Blok Skupienia: Bieg ciągły w strefie tlenowej' },
      { id: '7', dzien: '2026-08-11', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Blok Skupienia: Bieg ciągły w strefie tlenowej' },
      { id: '11', dzien: '2026-08-13', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Blok Skupienia: Bieg ciągły w strefie tlenowej' },
      { id: '16', dzien: '2026-08-15', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Blok Skupienia: Bieg ciągły w strefie tlenowej' },
      { id: '8', dzien: '2026-08-18', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Blok Skupienia: Bieg ciągły w strefie tlenowej' },
    ],
  },
  // ⚠️ 0 z 10 wpisów w całej bazie wskazuje wydarzenie — pas A1 otworzył
  // kolumnę, ale nikt do niej jeszcze nie pisze.
  powiazania: { rodzaj: 'jest', dane: [{ idWpisu: '9', idWydarzenia: null }] },
  bol: {
    rodzaj: 'jest',
    dane: [{ idWiersza: '1', dzien: '2026-08-08', miejsce: 'lydka', intensywnosc: 2, wykluczaZTreningu: false }],
  },
  mecze: {
    rodzaj: 'jest',
    dane: [
      { idWiersza: '2', dzien: '2026-07-29', ciezkosc: 6, stanWejscia: 'entered_fresh' },
      { idWiersza: '3', dzien: '2026-07-29', ciezkosc: 5, stanWejscia: 'entered_fresh' },
    ],
  },
  // ⭐ 0 podpowiedzi za bramką wieku WIDOCZNYCH DLA ZAWODNIKA: 18 wierszy ma
  // `min_age`, ale wszystkie 18 ma `odbiorca='rodzic'` (zmierzone). Zawodnik traci
  // dziś przez brak rocznika WYŁĄCZNIE odcinek Mapy drogi — i tylko to ma usłyszeć.
  profil: {
    rodzaj: 'jest',
    dane: { rokUrodzenia: null, podpowiedziZaBramkaWieku: 0, podpowiedziRazem: 274, odcinkowMapyDrogi: 4 },
  },
};

/** Mocny dowód snu: 5 nocy + 3 pomiary RPE. */
const SEN_MOCNY: WejsciaWgladow = { ...PUSTE, dziennik: KOMPLET.dziennik };

/** Słaby dowód snu: te same noce, ale tylko 2 pomiary RPE (stan bazy 14.08). */
const SEN_SLABY: WejsciaWgladow = {
  ...PUSTE,
  dziennik: {
    rodzaj: 'jest',
    dane: [
      { idWiersza: '101', dzien: '2026-08-09', senGodziny: 5.5, rpe: null },
      { idWiersza: '102', dzien: '2026-08-10', senGodziny: 7, rpe: null },
      { idWiersza: '103', dzien: '2026-08-11', senGodziny: 5, rpe: null },
      { idWiersza: '104', dzien: '2026-08-12', senGodziny: 4.5, rpe: null },
      { idWiersza: '105', dzien: '2026-08-13', senGodziny: 7.5, rpe: null },
      { idWiersza: '201', dzien: '2026-08-12', senGodziny: null, rpe: 8 },
      { idWiersza: '202', dzien: '2026-08-13', senGodziny: null, rpe: 9 },
    ],
  },
};

const wynikDla = (wyniki: WynikWgladu[], klucz: KluczWgladu): WynikWgladu => {
  const w = wyniki.find((x) => x.klucz === klucz);
  if (!w) throw new Error(`brak wyniku dla klucza ${klucz} — lista wyników jest niepełna`);
  return w;
};

const wglady = (wyniki: WynikWgladu[]): { wglad: Wglad; kandydat: Kandydat }[] => wyniki
  .filter((x): x is Extract<WynikWgladu, { rodzaj: 'jest' }> => x.rodzaj === 'jest')
  .map((x) => ({ wglad: x.wglad, kandydat: x.kandydat }));

// ═════════════════════════════════════════════════════════════════════
// BATERIA — sześć grup. Ta sama bateria idzie raz na PRAWDZIWYCH zasadach
// (musi dać zero FAIL-i) i sześć razy na ZEPSUTYCH (każda mutacja musi
// podnieść liczbę FAIL-i).
// ═════════════════════════════════════════════════════════════════════

type Wynik = { label: string; ok: boolean; detail: string };

function bateria(zasady: ZasadyWgladow): Wynik[] {
  const w: Wynik[] = [];
  const add = (label: string, ok: boolean, detail: string): void => { w.push({ label, ok, detail }); };

  const puste = policzWglady(PUSTE, zasady);
  const nieodczytane = policzWglady(NIEODCZYTANE, zasady);
  const mieszane = policzWglady(MIESZANE, zasady);
  const komplet = policzWglady(KOMPLET, zasady);
  const senMocny = policzWglady(SEN_MOCNY, zasady);
  const senSlaby = policzWglady(SEN_SLABY, zasady);

  // ── GRUPA 1. WGLĄD BEZ LICZBY NIE POWSTAJE (WG-26) ─────────────────
  add('G1 wejście bez danych → ZERO kandydatów, nie kandydat z pustym `dlaczego`',
    puste.kandydaci.length === 0,
    `oddano ${puste.kandydaci.length}: ${puste.kandydaci.map((k) => k.id).join(', ')}`);

  add('G1 każdy oddany kandydat niesie CYFRĘ w `co` (część 1 = liczba)',
    komplet.kandydaci.length > 0 && komplet.kandydaci.every((k) => niesieLiczbe(k.co)),
    komplet.kandydaci.filter((k) => !niesieLiczbe(k.co)).map((k) => `${k.id}: „${k.co}"`).join(' | '));

  add('G1 żaden oddany kandydat nie ma pustego `dlaczego`',
    komplet.kandydaci.every((k) => k.dlaczego !== null && k.dlaczego.trim().length > 0),
    komplet.kandydaci.filter((k) => !k.dlaczego || k.dlaczego.trim().length === 0).map((k) => k.id).join(', '));

  add('G1 żaden oddany kandydat nie ma pustego `co`',
    komplet.kandydaci.every((k) => k.co.trim().length > 0),
    komplet.kandydaci.filter((k) => k.co.trim().length === 0).map((k) => k.id).join(', '));

  // ── GRUPA 2. `skadToWiemy` NIGDY NIE JEST `null` ───────────────────
  // Bo bramka rankera wyrzuciłaby takiego kandydata do `odrzucone`, wgląd
  // zniknąłby z ekranu, a nikt by tego nie zauważył.
  add('G2 każdy oddany kandydat ma PRAWDZIWY ślad (`slad()`, nie obiekt udający)',
    wszyscyKandydaciMajaSlad(komplet) && komplet.kandydaci.length > 0,
    komplet.kandydaci.filter((k) => !czyPrawdziwySlad(k.skadToWiemy)).map((k) => k.id).join(', '));

  add('G2 ślad wskazuje NAZWANE źródło (tabela albo mechanizm), nigdy puste',
    komplet.kandydaci.every((k) => czyPrawdziwySlad(k.skadToWiemy) && k.skadToWiemy.skad.trim().length > 0),
    komplet.kandydaci.map((k) => `${k.id}→${czyPrawdziwySlad(k.skadToWiemy) ? k.skadToWiemy.skad : 'BRAK'}`).join(', '));

  add('G2 ⭐ żaden oddany kandydat nie zostaje ODRZUCONY przez bramkę rankera',
    (() => {
      const kolejka = ulozKolejke(wejsciaRankera(komplet.kandydaci));
      return komplet.kandydaci.length > 0 && kolejka.odrzucone.length === 0;
    })(),
    JSON.stringify(ulozKolejke(wejsciaRankera(komplet.kandydaci)).odrzucone));

  add('G2 każdy kandydat wchodzi jako `zrodlo: wglad` z wagą bazową wglądu',
    komplet.kandydaci.every((k) => k.zrodlo === 'wglad' && k.wagaBazowa === WAGA_BAZOWA.wglad),
    komplet.kandydaci.map((k) => `${k.id}: ${k.zrodlo}/${k.wagaBazowa}`).join(', '));

  // ── GRUPA 3. TRZY CZĘŚCI W STAŁEJ KOLEJNOŚCI (WG-25) ───────────────
  // ⚠️ Asercje na KSZTAŁT, nie na dosłowne brzmienie: brzmienia należą do Kuby
  // i zmienią się bez zmiany reguły.
  const kompletParami = wglady(komplet.wyniki);

  add('G3 `co` niesie CZĘŚĆ 1 (liczbę) — dokładnie ją, nie jej streszczenie',
    kompletParami.length > 0 && kompletParami.every((p) => p.kandydat.co === p.wglad.liczba),
    kompletParami.filter((p) => p.kandydat.co !== p.wglad.liczba).map((p) => p.wglad.klucz).join(', '));

  add('G3 `dlaczego` zaczyna się od CZĘŚCI 2 (znaczenia)',
    kompletParami.every((p) => (p.kandydat.dlaczego ?? '').startsWith(p.wglad.znaczenie)),
    kompletParami.filter((p) => !(p.kandydat.dlaczego ?? '').startsWith(p.wglad.znaczenie)).map((p) => p.wglad.klucz).join(', '));

  add('G3 CZĘŚĆ 3 (rzecz do zrobienia) ISTNIEJE i jest inna niż części 1 i 2',
    kompletParami.every((p) => p.wglad.doZrobienia.trim().length > 0
      && p.wglad.doZrobienia !== p.wglad.liczba
      && p.wglad.doZrobienia !== p.wglad.znaczenie),
    kompletParami.map((p) => `${p.wglad.klucz}: „${p.wglad.doZrobienia}"`).join(' | '));

  add('G3 CZĘŚĆ 3 jest osiągalna z ekranu po `id` pozycji (`wgladDlaPozycji`)',
    kompletParami.every((p) => wgladDlaPozycji(komplet, p.kandydat.id)?.doZrobienia === p.wglad.doZrobienia),
    kompletParami.filter((p) => wgladDlaPozycji(komplet, p.kandydat.id) === null).map((p) => p.wglad.klucz).join(', '));

  add('G3 kolejność wyników jest STAŁA i pełna — zawsze sześć kluczy, zawsze te same',
    komplet.wyniki.length === KLUCZE_WGLADOW.length
      && komplet.wyniki.every((x, i) => x.klucz === KLUCZE_WGLADOW[i]),
    komplet.wyniki.map((x) => x.klucz).join(' → '));

  // ── GRUPA 4. SŁABY DOWÓD MÓWI, CZEGO LICZBA NIE MÓWI (WG-33) ───────
  const senSlabyWynik = wynikDla(senSlaby.wyniki, 'sen_wobec_obciazenia');
  const senMocnyWynik = wynikDla(senMocny.wyniki, 'sen_wobec_obciazenia');

  add('G4 ⭐ przy DWÓCH pomiarach RPE wgląd ALBO nie powstaje, ALBO niesie zastrzeżenie',
    senSlabyWynik.rodzaj !== 'jest'
      || (senSlabyWynik.wglad.silaDowodu === 'slaby' && senSlabyWynik.wglad.czegoNieMowi !== null),
    JSON.stringify(senSlabyWynik));

  add('G4 rozstrzygnięcie jest twarde: przy dwóch pomiarach RPE wgląd POWSTAJE ze słabym dowodem',
    senSlabyWynik.rodzaj === 'jest' && senSlabyWynik.wglad.silaDowodu === 'slaby',
    `rodzaj=${senSlabyWynik.rodzaj}`);

  add('G4 zastrzeżenie dociera na poziom 0 dotknięć — jest w `dlaczego`, nie o poziom głębiej',
    senSlabyWynik.rodzaj !== 'jest'
      || (senSlabyWynik.wglad.czegoNieMowi !== null
        && (senSlabyWynik.kandydat.dlaczego ?? '').includes(senSlabyWynik.wglad.czegoNieMowi)),
    JSON.stringify(senSlabyWynik.rodzaj === 'jest' ? senSlabyWynik.kandydat.dlaczego : null));

  add('G4 przy MOCNYM dowodzie NIE doklejamy zastrzeżenia (Z0-a)',
    senMocnyWynik.rodzaj === 'jest'
      && senMocnyWynik.wglad.silaDowodu === 'mocny'
      && senMocnyWynik.wglad.czegoNieMowi === null,
    JSON.stringify(senMocnyWynik.rodzaj === 'jest' ? senMocnyWynik.wglad.czegoNieMowi : senMocnyWynik.rodzaj));

  // ── GRUPA 5. PUSTKA I „NIE WIEM" TO DWA RÓŻNE WYJŚCIA (R5) ─────────
  add('G5 pustka: sześć razy `brak_danych`, zero `nie_wiem`, lista PEŁNA',
    puste.brakDanych.length === KLUCZE_WGLADOW.length
      && puste.nieWiem.length === 0
      && puste.niepelna === false,
    `brakDanych=${puste.brakDanych.length} nieWiem=${puste.nieWiem.length} niepelna=${puste.niepelna}`);

  add('G5 nieodczytane: sześć razy `nie_wiem`, zero `brak_danych`, lista NIEPEŁNA',
    nieodczytane.nieWiem.length === KLUCZE_WGLADOW.length
      && nieodczytane.brakDanych.length === 0
      && nieodczytane.niepelna === true,
    `nieWiem=${nieodczytane.nieWiem.length} brakDanych=${nieodczytane.brakDanych.length} niepelna=${nieodczytane.niepelna}`);

  add('G5 każdy `brak_danych` niesie POWÓD i to, czego brakuje — nie znika po cichu',
    puste.wyniki.every((x) => x.rodzaj !== 'brak_danych'
      || (x.powod.trim().length > 0 && x.czegoBrakuje.trim().length > 0)),
    JSON.stringify(puste.wyniki.filter((x) => x.rodzaj === 'brak_danych' && x.powod.trim().length === 0)));

  add('G5 każdy `nie_wiem` CYTUJE powód odczytu, nie własne zdanie',
    nieodczytane.wyniki.every((x) => x.rodzaj !== 'nie_wiem' || x.powod.trim().length > 0),
    JSON.stringify(nieodczytane.wyniki.filter((x) => x.rodzaj === 'nie_wiem' && x.powod.trim().length === 0)));

  add('G5 jedno wejście nieodczytane + reszta pusta → 1 `nie_wiem` i 5 `brak_danych`',
    mieszane.nieWiem.length === 1 && mieszane.brakDanych.length === 5 && mieszane.niepelna === true,
    `nieWiem=${mieszane.nieWiem.length} brakDanych=${mieszane.brakDanych.length}`);

  // ── GRUPA 6. ⭐ ASERCJA DOMYKAJĄCA DZIURĘ ──────────────────────────
  // Pięć powyższych grup jest spełnialnych przez producenta, który nigdy
  // niczego nie oddaje. Ta grupa podaje KOMPLET i wymaga, żeby powstało
  // wszystkie sześć.
  add('G6 ⭐ przy komplecie danych POWSTAJE wszystkie sześć wglądów',
    komplet.kandydaci.length === KLUCZE_WGLADOW.length,
    `powstało ${komplet.kandydaci.length}: `
    + komplet.wyniki.map((x) => `${x.klucz}=${x.rodzaj}`).join(', '));

  add('G6 ⭐ żaden z sześciu nie kończy jako `brak_danych` ani `nie_wiem` przy komplecie',
    komplet.wyniki.every((x) => x.rodzaj === 'jest'),
    komplet.wyniki.filter((x) => x.rodzaj !== 'jest').map((x) => `${x.klucz}=${x.rodzaj}`).join(', '));

  add('G6 ⭐ wgląd o serii snu POWSTAJE, gdy trzy noce i trzy pomiary RPE są w danych',
    wynikDla(komplet.wyniki, 'sen_wobec_obciazenia').rodzaj === 'jest',
    wynikDla(komplet.wyniki, 'sen_wobec_obciazenia').rodzaj);

  add('G6 ⭐ oś pomiarów z datami jest niepusta tam, gdzie wgląd jest osią (WG-34)',
    (['sen_wobec_obciazenia', 'sygnal_kaskady_meczowej', 'powtarzajacy_sie_bol'] as KluczWgladu[])
      .every((k) => {
        const x = wynikDla(komplet.wyniki, k);
        return x.rodzaj === 'jest' && x.wglad.os.length >= 2 && x.wglad.os.length <= DLUGOSC_OSI
          && x.wglad.os.every((p) => p.dzien.length === 10 && p.jednostka.trim().length > 0);
      }),
    komplet.wyniki.map((x) => `${x.klucz}: ${x.rodzaj === 'jest' ? x.wglad.os.length : '-'}`).join(', '));

  add('G6 ⭐ licznik sesji powstaje DOPIERO, gdy istnieje choć jedno powiązanie wpisu z wydarzeniem',
    wynikDla(komplet.wyniki, 'odbyte_sesje').rodzaj === 'jest'
      && wynikDla(policzWglady({ ...KOMPLET, powiazania: { rodzaj: 'brak' } }, zasady).wyniki, 'odbyte_sesje').rodzaj === 'brak_danych',
    `komplet=${wynikDla(komplet.wyniki, 'odbyte_sesje').rodzaj}`);

  return w;
}

/** Ranker z jednym wejściem: kandydatami wglądów. Reszta pusta — bramka i tak zadziała. */
function wejsciaRankera(dodatkowi: Kandydat[]): WejsciaKolejki {
  const glos: StanGlosu = { rodzaj: 'cisza', powod: 'test bramki' };
  return {
    dzis: DZIS,
    glos,
    ograniczenia: czytajOgraniczenia({ wersja: 1, aktywne: [], nieznane_ograniczenia: [], nieznane: [] }),
    jednaOdpowiedz: null,
    zadania: odczytZadan({ data: [], error: null }),
    kalendarz: { rodzaj: 'brak' },
    dziennik: { rodzaj: 'brak' },
    bol: { rodzaj: 'brak' },
    cel: { rodzaj: 'brak' },
    mecz: { rodzaj: 'brak' },
    dodatkowi,
  };
}

// ═════════════════════════════════════════════════════════════════════
// 1. BATERIA NA PRAWDZIWYCH ZASADACH — musi dać ZERO FAIL-i
// ═════════════════════════════════════════════════════════════════════
console.log('\n── 1. BATERIA NA PRAWDZIWYCH ZASADACH ──');
const bazowa = bateria(ZASADY_WGLADOW);
for (const r of bazowa) check(r.label, r.ok, r.detail);
const FAILE_BAZOWE = bazowa.filter((r) => !r.ok).length;

// ═════════════════════════════════════════════════════════════════════
// 2. STAN BAZY 14.08.2026 — na prawdziwych wierszach, nie na atrapie
// ═════════════════════════════════════════════════════════════════════
console.log('\n── 2. STAN BAZY 14.08.2026 ──');
const dzis = policzWglady(STAN_BAZY_14_08);

check('dziś powstają DOKŁADNIE DWA wglądy: sen i brak rocznika',
  dzis.kandydaci.length === 2,
  dzis.wyniki.map((x) => `${x.klucz}=${x.rodzaj}`).join(', '));

check('cztery pozostałe oddają `brak_danych` z powodem — nie znikają po cichu',
  dzis.brakDanych.length === 4 && dzis.brakDanych.every((b) => b.powod.trim().length > 0),
  JSON.stringify(dzis.brakDanych));

check('⭐ licznik sesji NIE mówi „0 z 6" — przy zerze powiązań oddaje `brak_danych`',
  wynikDla(dzis.wyniki, 'odbyte_sesje').rodzaj === 'brak_danych',
  JSON.stringify(wynikDla(dzis.wyniki, 'odbyte_sesje')));

check('wgląd o meczu nie powstaje: w kalendarzu nie ma ani jednego `event_type=match`',
  wynikDla(dzis.wyniki, 'zblizajacy_sie_mecz').rodzaj === 'brak_danych',
  JSON.stringify(wynikDla(dzis.wyniki, 'zblizajacy_sie_mecz')));

check('oś meczowa nie powstaje przy dwóch meczach — nie rysujemy trzech punktów z dwóch',
  wynikDla(dzis.wyniki, 'sygnal_kaskady_meczowej').rodzaj === 'brak_danych',
  JSON.stringify(wynikDla(dzis.wyniki, 'sygnal_kaskady_meczowej')));

check('ból nie produkuje zadania przy jednym zgłoszeniu (próg: trzy)',
  wynikDla(dzis.wyniki, 'powtarzajacy_sie_bol').rodzaj === 'brak_danych',
  JSON.stringify(wynikDla(dzis.wyniki, 'powtarzajacy_sie_bol')));

check('wgląd o śnie powstaje ze SŁABYM dowodem — dwa pomiary RPE to nie jest seria',
  (() => {
    const x = wynikDla(dzis.wyniki, 'sen_wobec_obciazenia');
    return x.rodzaj === 'jest' && x.wglad.silaDowodu === 'slaby' && x.wglad.czegoNieMowi !== null;
  })(),
  JSON.stringify(wynikDla(dzis.wyniki, 'sen_wobec_obciazenia')));

check('⭐ brak rocznika wychodzi ze SKUTKIEM, który zawodnik naprawdę ponosi (WT-26)',
  (() => {
    const x = wynikDla(dzis.wyniki, 'brak_roku_urodzenia');
    // Dziś jedynym realnym skutkiem jest Mapa drogi (4 odcinki). ⛔ Zdanie NIE MOŻE
    // mówić o zamkniętych podpowiedziach, bo zawodnik i tak żadnej z nich nie widzi.
    return x.rodzaj === 'jest'
      && /4/.test(x.wglad.liczba)
      && !x.wglad.liczba.includes('podpowiedzi');
  })(),
  JSON.stringify(wynikDla(dzis.wyniki, 'brak_roku_urodzenia')));

check('⭐ przy zerowym skutku braku rocznika i braku Mapy pozycja NIE powstaje',
  (() => {
    const x = wynikDla(policzWglady({
      ...STAN_BAZY_14_08,
      profil: { rodzaj: 'jest', dane: { rokUrodzenia: null, podpowiedziZaBramkaWieku: 0, podpowiedziRazem: 274, odcinkowMapyDrogi: 0 } },
    }).wyniki, 'brak_roku_urodzenia');
    return x.rodzaj === 'brak_danych' && x.powod.includes('skutek braku wynosi dziś zero');
  })(),
  'pozycja powstała bez policzalnego skutku — to byłaby prośba, nie wgląd');

check('rocznik PODANY → pozycja znika i mówi dlaczego (nie ma czego uzupełniać)',
  (() => {
    const zRokiem = policzWglady({
      ...STAN_BAZY_14_08,
      profil: { rodzaj: 'jest', dane: { rokUrodzenia: 2009, podpowiedziZaBramkaWieku: 0, podpowiedziRazem: 274, odcinkowMapyDrogi: 4 } },
    });
    const x = wynikDla(zRokiem.wyniki, 'brak_roku_urodzenia');
    return x.rodzaj === 'brak_danych' && /2009/.test(x.powod);
  })(),
  'pozycja nie zniknęła albo zniknęła bez powodu');

// ═════════════════════════════════════════════════════════════════════
// ⭐ 2b. PAS B2 16.08.2026 — ŚLAD WSKAZUJE TĘ TABELĘ, Z KTÓREJ JEST `id`
// ═════════════════════════════════════════════════════════════════════
// ZNALEZISKO T1-2, zmierzone i naprawione przy pasie B2. Wgląd `odbyte_sesje`
// budował ślad `skad: 'daily_logs'` z `idWiersza: odbyte[0].id`, a `odbyte`
// filtruje `w.kalendarz.dane` — czyli `id` był identyfikatorem `calendar_events`.
// ŚLAD WSKAZYWAŁ WIERSZ, KTÓREGO W TAMTEJ TABELI NIE MA.
//
// ⚠️ TA ASERCJA NIE CZYTA KODU, TYLKO WYNIK (O90). Sprawdza, że `idWiersza`
// naprawdę należy do zbioru identyfikatorów, którym `skad` się nazywa —
// asercja „czy w pliku stoi `calendar_events`" przeszłaby także wtedy, gdyby
// napis stał przy zupełnie innym `id`.
console.log('\n── 2b. ŚLAD ODBYTYCH SESJI (T1-2, pas B2) ──');
{
  const kompletDlaSladu = policzWglady(KOMPLET);
  const wynik = wynikDla(kompletDlaSladu.wyniki, 'odbyte_sesje');
  const kandydatSesji = kompletDlaSladu.kandydaci.find((k) => k.id.includes('odbyte_sesje')) ?? null;
  const idyKalendarza = KOMPLET.kalendarz.rodzaj === 'jest' ? KOMPLET.kalendarz.dane.map((e) => e.id) : [];
  const idyDziennika = KOMPLET.dziennik.rodzaj === 'jest' ? KOMPLET.dziennik.dane.map((l) => l.idWiersza) : [];
  const s = kandydatSesji !== null && czyPrawdziwySlad(kandydatSesji.skadToWiemy) ? kandydatSesji.skadToWiemy : null;

  check('⭐ (B2/T1-2) licznik odbytych sesji w ogóle powstaje na komplecie — bez tego asercja niżej nic nie znaczy',
    wynik.rodzaj === 'jest' && s !== null,
    `wynik: ${wynik.rodzaj} · kandydat: ${kandydatSesji?.id ?? 'BRAK'}`);

  check('⭐ (B2/T1-2) ślad wglądu `odbyte_sesje` nazywa `calendar_events` — TĘ tabelę, z której jest jego `id`',
    s !== null && s.skad === 'calendar_events'
    && s.idWiersza !== null && idyKalendarza.includes(s.idWiersza)
    && !idyDziennika.includes(s.idWiersza),
    `ślad: ${JSON.stringify({ skad: s?.skad, idWiersza: s?.idWiersza })} · `
    + `id wydarzeń: ${JSON.stringify(idyKalendarza)} · id wpisów Dziennika: ${JSON.stringify(idyDziennika)} — `
    + 'ślad wskazujący wiersz, którego w nazwanej tabeli nie ma, jest zapisem nieprawdy (Z0): dziś '
    + 'nieszkodliwym, bo `idWiersza` nikt nie rozwiązuje, ale w dniu, w którym cokolwiek po nim sięgnie '
    + 'do bazy, produkt powie zawodnikowi „wiemy to stąd" o miejscu, w którym tego nie ma');

  check('⭐ (B2/T1-2) `klucz` brzmienia ZOSTAJE `journal` — `skad` nazywa tabelę, `klucz` wybiera zdanie',
    s !== null && s.klucz === 'journal',
    `klucz: ${s?.klucz} — to są dwa różne pytania: z jakiej tabeli jest \`id\` (`
    + '`calendar_events`) i co zawodnik ma przeczytać („Z Twojego Dziennika."). '
    + 'Zmiana klucza razem ze `skad` przestawiłaby zawodnikowi brzmienie bez powodu');
}

// ═════════════════════════════════════════════════════════════════════
// 3. GRANICA B1 / B1-a — NIC O STANIE PSYCHICZNYM
// ═════════════════════════════════════════════════════════════════════
console.log('\n── 3. GRANICA B1 / B1-a ──');

const WSZYSTKIE_BRZMIENIA: string[] = (() => {
  const zrodla = [KOMPLET, STAN_BAZY_14_08, SEN_SLABY, SEN_MOCNY, PUSTE, NIEODCZYTANE];
  const teksty: string[] = [];
  for (const we of zrodla) {
    const wy = policzWglady(we);
    for (const x of wy.wyniki) {
      if (x.rodzaj !== 'jest') continue;
      teksty.push(x.wglad.liczba, x.wglad.znaczenie, x.wglad.doZrobienia, x.kandydat.co, x.kandydat.dlaczego ?? '');
      if (x.wglad.czegoNieMowi) teksty.push(x.wglad.czegoNieMowi);
    }
  }
  return teksty;
})();

const ZAKAZANE_PSYCHIKA = [
  'nastroj', 'nastrój', 'motywacj', 'samopoczuci', 'psychicz', 'depres',
  'lęk', 'lek u ciebie', 'stan psychiczny', 'wypalen',
];
check('⛔ ani jedno brzmienie nie mówi o nastroju, motywacji ani stanie psychicznym (B1)',
  WSZYSTKIE_BRZMIENIA.every((t) => !ZAKAZANE_PSYCHIKA.some((z) => t.toLowerCase().includes(z))),
  WSZYSTKIE_BRZMIENIA.filter((t) => ZAKAZANE_PSYCHIKA.some((z) => t.toLowerCase().includes(z))).join(' | '));

check('⛔ `mood_motivation` nie jest w tym pliku ani czytany, ani wymieniony w kodzie',
  !ZRODLO.includes('mood_motivation'),
  'klucz nastrojowy pojawił się w kodzie — granica B1 biegnie po skutku, nie po danych');

const ZAKAZANE_POROWNANIA = [
  'ranking', 'inni zawodnicy', 'innych zawodników', 'średnia dla', 'norma dla wieku',
  'lepszy niż', 'gorszy niż', 'miejsce w tabeli', 'rówieśnic',
];
check('⛔ ani jedno brzmienie nie porównuje zawodnika z innymi (N3)',
  WSZYSTKIE_BRZMIENIA.every((t) => !ZAKAZANE_POROWNANIA.some((z) => t.toLowerCase().includes(z))),
  WSZYSTKIE_BRZMIENIA.filter((t) => ZAKAZANE_POROWNANIA.some((z) => t.toLowerCase().includes(z))).join(' | '));

check('⛔ producent nie zna stanu arbitra ani koperty ograniczeń — nie może filtrować za rankera (WG-32)',
  !/WejsciaWgladow\s*=\s*\{[\s\S]*?\n\};/.exec(ZRODLO)?.[0].includes('glos')
    && !/WejsciaWgladow\s*=\s*\{[\s\S]*?\n\};/.exec(ZRODLO)?.[0].includes('ograniczenia'),
  'typ wejść zna arbitra albo kopertę — to jest furtka do cichego znikania wglądów');

check('każde brzmienie kończy się czynnością, nie samą wiedzą (M4)',
  (() => {
    const wy = policzWglady(KOMPLET);
    return wglady(wy.wyniki).every((p) => p.wglad.doZrobienia.trim().length > 0);
  })(),
  'któryś wgląd nie ma rzeczy do zrobienia');

// ═════════════════════════════════════════════════════════════════════
// 4. CZYSTOŚĆ PLIKU — czego w nim NIE MA
// ═════════════════════════════════════════════════════════════════════
console.log('\n── 4. CZYSTOŚĆ PLIKU ──');

check('⛔ zero Supabase — producent dostaje dane argumentem',
  !ZRODLO.includes('supabase') && !ZRODLO.includes('Supabase'),
  'plik dotyka bazy — zapytanie w czystej funkcji zabija jej testowalność');

check('⛔ zero importów z `app/` i `components/`',
  !/from\s+['"](@\/)?(\.\.\/)*(app|components)\//.test(ZRODLO),
  'plik importuje z warstwy ekranu');

check('⛔ zero Reacta i zero React Native',
  !/from\s+['"]react/.test(ZRODLO) && !ZRODLO.includes('StyleSheet'),
  'plik renderuje');

check('⛔ zero odczytu zegara — dzień wchodzi argumentem',
  !/\bDate\b/.test(ZRODLO) && !ZRODLO.includes('Date.now'),
  'plik czyta zegar — ten sam wgląd dałby dwie różne odpowiedzi zależnie od strefy');

check('⛔ zero połykania błędów: brak `catch {}` i brak `?? []`',
  !/catch\s*\{\s*\}/.test(ZRODLO) && !/\?\?\s*\[\]/.test(ZRODLO),
  'pustka zamiast błędu czyni defekt niewidocznym także dla autora');

check('⛔ zero `new URL(` (O53 — `tsc` pada z TS2769)',
  !ZRODLO.includes('new URL('),
  'plik używa new URL');

check('znacznik `BRZMIENIE_DO_PRZEJRZENIA` stoi w pliku — brzmienia czekają na Kubę',
  ZRODLO.includes('BRZMIENIE_DO_PRZEJRZENIA'),
  'znacznik zniknął przed zatwierdzeniem brzmień');

check('progi snu i okno wpisów są WZIĘTE z rankera, a nie przepisane drugi raz',
  ZRODLO.includes('PROG_SNU_GODZINY') && ZRODLO.includes('OKNO_WPISOW')
    && !/const\s+PROG_SNU_GODZINY\s*=/.test(ZRODLO),
  'druga kopia progu — dwie kopie tej samej reguły rozjeżdżają się po cichu');

// ═════════════════════════════════════════════════════════════════════
// 5. `zbudujWglad` — JEDYNA DROGA, KTÓRĄ POWSTAJE WGLĄD
// ═════════════════════════════════════════════════════════════════════
console.log('\n── 5. BUDOWA WGLĄDU ──');

const szkic = {
  klucz: 'sen_wobec_obciazenia' as KluczWgladu,
  liczba: 'Spałeś krócej niż 6 h w 3 z 5 nocy.',
  znaczenie: 'Organizm nie nadąża z odbudową.',
  doZrobienia: 'Połóż się dziś godzinę wcześniej.',
  silaDowodu: 'mocny' as const,
  rejestrZnaczenia: 'propozycja' as const,
  ilePomiarow: 5,
};

check('⛔ zdanie BEZ CYFRY nie zbuduje wglądu (WG-26)',
  zbudujWglad({ ...szkic, liczba: 'Ostatnio śpisz słabiej.' }) === null,
  'zbudował się wgląd bez liczby — to jest opinia sprzedana jako wiedza');

check('zdanie Z CYFRĄ buduje wgląd',
  zbudujWglad(szkic) !== null, 'nie zbudował się mimo liczby');

check('⛔ brak rzeczy do zrobienia nie zbuduje wglądu (M4)',
  zbudujWglad({ ...szkic, doZrobienia: '   ' }) === null,
  'wgląd skończył się na wiedzy');

check('⛔ słaby dowód BEZ „czego liczba nie mówi" nie zbuduje wglądu (WG-33)',
  zbudujWglad({ ...szkic, silaDowodu: 'slaby' }) === null,
  'słaby dowód wyszedł bez zastrzeżenia');

check('⛔ mocny dowód Z zastrzeżeniem też nie zbuduje wglądu (Z0-a — bez doklejek)',
  zbudujWglad({ ...szkic, czegoNieMowi: 'to nie mówi wszystkiego' }) === null,
  'przy mocnym dowodzie doklejono zastrzeżenie');

check('oś przycina się do trzech pomiarów i odrzuca nieczytelne daty (WG-34)',
  (() => {
    const w = zbudujWglad({
      ...szkic,
      os: [
        { dzien: '2026-02-31', wartosc: 1, jednostka: 'h snu' },
        { dzien: '2026-08-10', wartosc: 7, jednostka: 'h snu' },
        { dzien: '2026-08-11', wartosc: 5, jednostka: 'h snu' },
        { dzien: '2026-08-12', wartosc: 4.5, jednostka: 'h snu' },
        { dzien: '2026-08-13', wartosc: 7.5, jednostka: 'h snu' },
      ],
    });
    return w !== null && w.os.length === DLUGOSC_OSI && w.os.every((p) => p.dzien !== '2026-02-31');
  })(),
  'oś przepuściła 31 lutego albo nie przycięła się do trzech');

check('`naKandydata` nie podstawia wypełniacza pod brakujący ślad',
  (() => {
    const w = zbudujWglad(szkic);
    if (w === null) return false;
    const k = naKandydata({ wglad: w, id: 'x', skadToWiemy: null, rodzajPracy: 'zdrowie', ileZajmieSekund: null, termin: null });
    return k.skadToWiemy === null;
  })(),
  'ślad został wypełniony z niczego — to jest jedyne miejsce, w którym da się obejść Z0');

check('kandydat bez śladu ZOSTAJE ODRZUCONY przez ranker i trafia do `odrzucone` z powodem',
  (() => {
    const w = zbudujWglad(szkic);
    if (w === null) return false;
    const k = naKandydata({ wglad: w, id: 'wglad:bez_zrodla', skadToWiemy: null, rodzajPracy: 'zdrowie', ileZajmieSekund: null, termin: null });
    const kolejka = ulozKolejke(wejsciaRankera([k]));
    return !kolejka.pozycje.some((p) => p.id === 'wglad:bez_zrodla')
      && kolejka.odrzucone.some((o) => o.id === 'wglad:bez_zrodla' && o.powod.length > 0);
  })(),
  'kandydat bez śladu wszedł na ekran albo zniknął bez powodu');

check('`id` jest deterministyczne — ten sam dzień i klucz dają to samo',
  idWgladu('sen_wobec_obciazenia', DZIS) === idWgladu('sen_wobec_obciazenia', DZIS)
    && idWgladu('sen_wobec_obciazenia', DZIS) !== idWgladu('powtarzajacy_sie_bol', DZIS),
  idWgladu('sen_wobec_obciazenia', DZIS));

check('dwa przebiegi na tych samych danych dają IDENTYCZNY wynik',
  JSON.stringify(policzWglady(KOMPLET).kandydaci) === JSON.stringify(policzWglady(KOMPLET).kandydaci),
  'producent nie jest deterministyczny');

check('nieczytelny dzień → sześć razy `nie_wiem`, ⛔ nie pustka',
  (() => {
    const x = policzWglady({ ...KOMPLET, dzis: '2026-02-31' });
    return x.kandydaci.length === 0
      && x.wyniki.length === KLUCZE_WGLADOW.length
      && x.wyniki.every((r) => r.rodzaj === 'nie_wiem')
      && x.brakDanych.length === 0
      && x.nieWiem.some((n) => n.wejscie === 'dzis')
      && x.niepelna;
  })(),
  JSON.stringify(policzWglady({ ...KOMPLET, dzis: '2026-02-31' })));

// ═════════════════════════════════════════════════════════════════════
// 6. NARZĘDZIA JĘZYKOWE — bo zdanie z liczbą czyta nastolatek
// ═════════════════════════════════════════════════════════════════════
console.log('\n── 6. NARZĘDZIA ──');

check('`dataPoPolsku` zamienia ISO na datę po polsku', dataPoPolsku('2026-08-08') === '8 sierpnia', String(dataPoPolsku('2026-08-08')));
check('`dataPoPolsku` odrzuca 31 lutego, zamiast go przewinąć', dataPoPolsku('2026-02-31') === null, String(dataPoPolsku('2026-02-31')));
check('`liczbaPoPolsku` daje przecinek, nie kropkę', liczbaPoPolsku(7.5) === '7,5' && liczbaPoPolsku(6) === '6', liczbaPoPolsku(7.5));
check('`odmiana` odmienia 1 / 3 / 5', odmiana(1, 'noc', 'noce', 'nocy') === 'noc' && odmiana(3, 'noc', 'noce', 'nocy') === 'noce' && odmiana(5, 'noc', 'noce', 'nocy') === 'nocy', 'zła odmiana');
check('`odmiana` obsługuje 12–14 jako „nocy"', odmiana(12, 'noc', 'noce', 'nocy') === 'nocy' && odmiana(22, 'noc', 'noce', 'nocy') === 'noce', 'zła odmiana nastek');
check('`niesieLiczbe` widzi cyfrę i odrzuca zdanie bez niej', niesieLiczbe('3 noce') && !niesieLiczbe('trzy noce'), 'zła detekcja liczby');
check('progi wglądów są jawne i sensowne', MIN_NOCY_NA_SERIE === 3 && MIN_POMIAROW_RPE === 3 && MIN_MECZOW_NA_OS === 3 && MIN_ZGLOSZEN_BOLU === 3 && OKNO_SESJI_DNI === 14 && DLUGOSC_OSI === 3, 'próg zmieniony bez wpisu w nocie');
check('ślad wglądu buduje się tylko przez `slad()`', czyPrawdziwySlad(slad({ rejestr: 'fakt_o_tobie', skad: 'daily_logs', klucz: 'journal' })), 'slad() nie zbudował śladu');

// ═════════════════════════════════════════════════════════════════════
// 7. ⭐ SZEŚĆ MUTACJI — po jednej na grupę
// ═════════════════════════════════════════════════════════════════════
// Każda podmienia producenta snu na zepsuty i przepuszcza TĘ SAMĄ baterię.
// Mutacja, która nie podnosi liczby FAIL-i, oznacza grupę, która niczego nie
// pilnuje — i taką grupę trzeba napisać od nowa, a nie zgłaszać zielone.
console.log('\n── 7. MUTACJE ──');

const wgladSnu = (w: WejsciaWgladow): Wglad | null => {
  const x = wynikDla(policzWglady(w).wyniki, 'sen_wobec_obciazenia');
  return x.rodzaj === 'jest' ? x.wglad : null;
};

function zPodmienionymSnem(p: ZasadyWgladow['sen_wobec_obciazenia']): ZasadyWgladow {
  return { ...ZASADY_WGLADOW, sen_wobec_obciazenia: p };
}

/** M1 — wgląd bez liczby wchodzi na ekran (bramka WG-26 wyłączona). */
const M1 = zPodmienionymSnem((w) => {
  const g = wgladSnu(w);
  if (g === null) return ZASADY_WGLADOW.sen_wobec_obciazenia(w);
  const zepsuty: Wglad = { ...g, liczba: 'Ostatnio śpisz słabiej.' };
  return {
    klucz: 'sen_wobec_obciazenia', rodzaj: 'jest', wglad: zepsuty,
    kandydat: { ...naKandydata({ wglad: zepsuty, id: idWgladu('sen_wobec_obciazenia', w.dzis), skadToWiemy: slad({ rejestr: 'fakt_o_tobie', skad: 'daily_logs', klucz: 'journal' }), rodzajPracy: 'zdrowie', ileZajmieSekund: null, termin: null }), dlaczego: null },
  };
});

/** M2 — kandydat bez śladu wychodzi z producenta (Z0 obchodzone). */
const M2 = zPodmienionymSnem((w) => {
  const g = wgladSnu(w);
  if (g === null) return ZASADY_WGLADOW.sen_wobec_obciazenia(w);
  return {
    klucz: 'sen_wobec_obciazenia', rodzaj: 'jest', wglad: g,
    kandydat: naKandydata({ wglad: g, id: idWgladu('sen_wobec_obciazenia', w.dzis), skadToWiemy: null, rodzajPracy: 'zdrowie', ileZajmieSekund: null, termin: null }),
  };
});

/** M3 — trzy części w złej kolejności: znaczenie w `co`, liczba w `dlaczego`. */
const M3 = zPodmienionymSnem((w) => {
  const g = wgladSnu(w);
  if (g === null) return ZASADY_WGLADOW.sen_wobec_obciazenia(w);
  const k = naKandydata({ wglad: g, id: idWgladu('sen_wobec_obciazenia', w.dzis), skadToWiemy: slad({ rejestr: 'fakt_o_tobie', skad: 'daily_logs', klucz: 'journal' }), rodzajPracy: 'zdrowie', ileZajmieSekund: null, termin: null });
  return {
    klucz: 'sen_wobec_obciazenia', rodzaj: 'jest', wglad: g,
    kandydat: { ...k, co: g.znaczenie, dlaczego: g.liczba },
  };
});

/** M4 — słaby dowód przestaje mówić, czego liczba nie mówi (WG-33 wyłączone). */
const M4 = zPodmienionymSnem((w) => {
  const g = wgladSnu(w);
  if (g === null) return ZASADY_WGLADOW.sen_wobec_obciazenia(w);
  const zepsuty: Wglad = { ...g, czegoNieMowi: null, silaDowodu: g.silaDowodu };
  return {
    klucz: 'sen_wobec_obciazenia', rodzaj: 'jest', wglad: zepsuty,
    kandydat: naKandydata({ wglad: zepsuty, id: idWgladu('sen_wobec_obciazenia', w.dzis), skadToWiemy: slad({ rejestr: 'fakt_o_tobie', skad: 'daily_logs', klucz: 'journal' }), rodzajPracy: 'zdrowie', ileZajmieSekund: null, termin: null }),
  };
});

/** M5 — nieodczytane wejście udaje pustkę (R5 wyłączone). */
const M5 = zPodmienionymSnem((w) => {
  const x = ZASADY_WGLADOW.sen_wobec_obciazenia(w);
  if (x.rodzaj === 'nie_wiem') {
    return { klucz: 'sen_wobec_obciazenia', rodzaj: 'brak_danych', powod: x.powod, czegoBrakuje: 'danych' };
  }
  return x;
});

/** M6 — producent, który nigdy niczego nie oddaje. ⭐ Mutacja, którą łapie WYŁĄCZNIE grupa 6. */
const M6 = zPodmienionymSnem((w) => {
  const x = ZASADY_WGLADOW.sen_wobec_obciazenia(w);
  if (x.rodzaj === 'nie_wiem') return x;
  return { klucz: 'sen_wobec_obciazenia', rodzaj: 'brak_danych', powod: 'wyciszone', czegoBrakuje: 'nic' };
});

const MUTACJE: { nazwa: string; grupa: string; zasady: ZasadyWgladow }[] = [
  { nazwa: 'M1 — wgląd bez liczby wchodzi na ekran', grupa: 'G1', zasady: M1 },
  { nazwa: 'M2 — kandydat bez śladu wychodzi z producenta', grupa: 'G2', zasady: M2 },
  { nazwa: 'M3 — trzy części w złej kolejności', grupa: 'G3', zasady: M3 },
  { nazwa: 'M4 — słaby dowód milczy o tym, czego nie mówi', grupa: 'G4', zasady: M4 },
  { nazwa: 'M5 — „nie odczytałem" udaje „nic nie ma"', grupa: 'G5', zasady: M5 },
  { nazwa: 'M6 — producent, który nigdy nic nie oddaje', grupa: 'G6', zasady: M6 },
];

const RAPORT_MUTACJI: string[] = [];
for (const m of MUTACJE) {
  const wynikiM = bateria(m.zasady);
  const zapalone = wynikiM.filter((r) => !r.ok);
  RAPORT_MUTACJI.push(`${m.nazwa} [${m.grupa}] → ${zapalone.length} / ${wynikiM.length} FAIL`);
  for (const z of zapalone) RAPORT_MUTACJI.push(`      ↳ ${z.label}`);
  check(`MUTACJA ${m.nazwa} — bateria się ZAPALA`,
    zapalone.length > FAILE_BAZOWE,
    `mutacja przeszła niezauważona (FAIL-e: ${zapalone.length}, bazowo: ${FAILE_BAZOWE})`);
  check(`MUTACJA ${m.nazwa} — zapala grupę ${m.grupa}`,
    zapalone.some((z) => z.label.startsWith(m.grupa)),
    `zapaliły się wyłącznie: ${zapalone.map((z) => z.label.slice(0, 2)).join(',')}`);
}

console.log('\n── RAPORT MUTACJI ──');
for (const l of RAPORT_MUTACJI) console.log(l);
console.log(`Na prawdziwych zasadach: ${FAILE_BAZOWE} / ${bazowa.length} FAIL.`);

// ═════════════════════════════════════════════════════════════════════
console.log(`\n${passed} passed · ${failed} failed`);
if (failed > 0) process.exit(1);
