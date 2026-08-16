// ONBOARDING R8 08.08.2026 — asercje dla lib/postOnboardingTarget.ts.
// Czysta logika, bez Supabase/RN, uruchamiana lokalnie poza appką:
//
//   npx tsx lib/postOnboardingTarget.selftest.ts
//
// Ten sam wzorzec co lib/focusBlockProgress.selftest.ts. Uruchom ponownie po
// każdej zmianie w lib/postOnboardingTarget.ts.
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75)
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — nazwane liczbą. Ten plik miał 5 ASERCJI i ANI JEDNEJ,
// która czytałaby jakikolwiek EKRAN. Sprawdzał wyłącznie własny moduł przez
// `import`. Audyt H1 (15.08) zmierzył: nie istnieje stan repozytorium
// z pilnowanym defektem, na którym ten strażnik by się zapalił.
//
// DLACZEGO TO JEST GROŹNE TUTAJ. Te pięć asercji decyduje o PIERWSZEJ MINUCIE
// KONTAKTU z produktem — dokąd ląduje zawodnik po trzech ekranach powitalnych.
// Cała funkcja ma trzy linie i nie da się jej zepsuć niezauważenie; zepsuć da
// się DROGĘ, którą jej wynik dociera do routera, a ta droga ma dwa odcinki
// i ANI JEDNEJ asercji:
//   • `lib/onboarding.ts` (I/O) — pyta bazę i woła funkcję. Gdy w gałęzi błędu
//     poda `false` zamiast `null`, zawodnik Z UKOŃCZONĄ DIAGNOZĄ trafia na
//     zakładanie Celu przy każdym czknięciu sieci; reguła R5 (błąd ≠ pustka)
//     jest wtedy zielona w module i złamana w praktyce;
//   • `app/_layout.tsx` (ekran) — wykonuje `router.replace`. Gdy wpisze tam
//     trasę na sztywno, funkcja liczy się i idzie do kosza, a onboarding znów
//     kończy się PUSTYM EKRANEM: świeże konto ląduje na Dziś bez Celu i bez
//     rekomendacji, czyli w miejscu, w którym nie ma nic do zrobienia. To był
//     dokładnie ten defekt, dla którego ten moduł powstał (przegląd 4.2).
//
// ⚠️ TEN MODUŁ MA POŚREDNIKA. Ekran NIE importuje funkcji — bierze z niej tylko
// TYP, a decyzję dostaje przez `getPostOnboardingTarget` z `lib/onboarding.ts`.
// Dlatego sekcja 0 czyta OBA pliki: asercja tylko na ekranie przepuściłaby
// zepsucie w pośredniku, a asercja tylko na pośredniku — trasę wpisaną
// na sztywno w routerze.
//
// ⚠️ CZEGO TA SEKCJA NIE UDAJE. Czyta źródła JAKO TEKST — nie uruchamia Reacta
// ani expo-routera i nie wie, czy nawigacja naprawdę się wykonała.
// ⚠️ NIE UŻYWAĆ `new URL(...)` (O53): `tsconfig.json` ciągnie DOM, więc `tsc`
// pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { postOnboardingTarget } from './postOnboardingTarget';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ 0. PAS I2 16.08.2026 — DROGA, KTÓRĄ WYNIK DOCIERA DO ROUTERA (K4 / O75)
// ═══════════════════════════════════════════════════════════════════

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — oba pliki CYTUJĄ w komentarzach nazwę funkcji i całe
 * uzasadnienie trzech wyjść („przy błędzie odczytu — Dziś, bez udawania"),
 * więc strażnik czytający surowy tekst przechodziłby na własnej dokumentacji.
 */
const bezKomentarzy = (s: string): string => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .join('\n');

/** ⛔ BRAK PLIKU JEST FAIL-em Z NAZWĄ, nie wyjątkiem `ENOENT` (O76). */
const BRAK_PLIKOW: string[] = [];
const surowe = (wzgledna: string): string => {
  const p = join(root, wzgledna);
  if (!existsSync(p)) { BRAK_PLIKOW.push(wzgledna); return ''; }
  return readFileSync(p, 'utf8');
};

const PLIK_LAYOUT = 'app/_layout.tsx';
const PLIK_POSREDNIK = 'lib/onboarding.ts';
const layout = bezKomentarzy(surowe(PLIK_LAYOUT));
const posrednik = bezKomentarzy(surowe(PLIK_POSREDNIK));

{
  console.log('0. DROGA, KTÓRĄ WYNIK DOCIERA DO ROUTERA (K4 / O75)');

  check('⛔ (I2-0) ekran i pośrednik z listy strażnika istnieją i dają się odczytać',
    BRAK_PLIKOW.length === 0,
    `NIE MA TYCH PLIKÓW: ${BRAK_PLIKOW.join(', ')} — zmieniła się nazwa albo miejsce pliku. `
    + 'Popraw listę w tym pliku ALBO przywróć plik; do tego czasu asercje niżej '
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
    (p) => /getPostOnboardingTarget\s*\(/.test(bezKomentarzy(readFileSync(join(root, p), 'utf8'))));
  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c`, nie przepisane z pamięci.
  // RÓWNOŚĆ, nie „≥ 1" (O73): trasa po onboardingu ma być liczona w JEDNYM
  // miejscu — dwa miejsca to dwa przekierowania walczące o ten sam moment.
  const KONSUMENCI = [PLIK_LAYOUT].sort();
  const brakujacy = KONSUMENCI.filter((p) => !konsumenci.includes(p));
  const nadmiarowi = konsumenci.filter((p) => !KONSUMENCI.includes(p));
  check('⭐ (I2-0) trasę po onboardingu liczy DOKŁADNIE ten plik, co 16.08 — RÓWNOŚĆ, nie „≥ 1" (O73)',
    brakujacy.length === 0 && nadmiarowi.length === 0,
    `BRAKUJE: ${brakujacy.join(', ') || '—'} · NADMIAROWI: ${nadmiarowi.join(', ') || '—'} `
    + '→ ubył: onboarding znów kończy się tam, gdzie router zaprowadzi domyślnie, a 5 asercji '
    + 'niżej nadal jest zielonych; doszedł: dwa miejsca przekierowują ten sam pierwszy start.');

  // ── POŚREDNIK: decyzja należy do modułu, nie do warstwy I/O ──
  check('⛔ (I2-0) pośrednik `lib/onboarding.ts` woła `postOnboardingTarget(` — nie wybiera trasy sam',
    /postOnboardingTarget\(/.test(posrednik)
    && !/'\/(diagnoza|cele|dzis)'/.test(posrednik),
    'w warstwie I/O stanęła trasa wpisana na sztywno; wtedy reguła „błąd ≠ pustka" ma DWA '
    + 'źródła — te trzy asercje niżej i drugi rachunek w `onboarding.ts` — i rozjeżdżają się po cichu');

  // ⛔ NAJDROŻSZA ASERCJA TEGO PLIKU. `postOnboardingTarget(false)` w gałęzi
  // błędu to nie literówka: to zawodnik z GOTOWĄ diagnozą wysłany na zakładanie
  // Celu przy każdym czknięciu sieci — czyli dokładnie zlanie stanów, którego
  // zakazuje R5, popełnione o jedną warstwę wyżej niż patrzą asercje niżej.
  check('⛔ (I2-0) R5 w pośredniku: OBIE gałęzie porażki odczytu podają `null`, nigdy `false`',
    (posrednik.match(/postOnboardingTarget\(null\)/g) ?? []).length === 2
    && !/postOnboardingTarget\(false\)/.test(posrednik),
    'gałąź błędu albo `catch` w `lib/onboarding.ts` podaje `false` zamiast `null` (albo jednej '
    + 'z nich w ogóle nie ma): „nie udało się sprawdzić" staje się wtedy nieodróżnialne od '
    + '„nie ma diagnozy" i zawodnik z gotowym wynikiem ląduje na zakładaniu Celu');

  check('⛔ (I2-0) pośrednik pyta o diagnozę TYM SAMYM filtrem, którym ekran Diagnoza rozpoznaje wynik',
    /\.from\('diagnostics'\)/.test(posrednik)
    && /\.eq\('event',\s*'email_submitted'\)/.test(posrednik)
    && /\.not\('scores',\s*'is',\s*null\)/.test(posrednik),
    'filtr „ukończonej diagnozy" rozjechał się z tym, co ekran Diagnoza uznaje za wynik; '
    + 'wtedy `/diagnoza` obiecuje wynik, a pokazuje pustkę — appka otwiera się w PUSTYM MIEJSCU '
    + 'przy pierwszym kontakcie, czyli robi dokładnie to, przed czym ten moduł miał chronić');

  // ── EKRAN: policzona trasa naprawdę trafia do routera ──
  check('⛔ (I2-0) ekran trzyma trasę w stanie typowanym `PostOnboardingTarget`, nie w `string`',
    /useState<PostOnboardingTarget\s*\|\s*null>/.test(layout),
    'stan rozluźniony do `string`; od tej chwili literówka w trasie („/diagnza") kompiluje się '
    + 'i router po cichu nie przekierowuje nigdzie');

  check('⛔ (I2-0) ekran nie wpisuje `/diagnoza` ani `/cele` na sztywno — obie trasy pochodzą z funkcji',
    !/'\/(diagnoza|cele)'/.test(layout),
    'w `_layout.tsx` stanęła trasa wpisana ręcznie; policzony wynik idzie wtedy do kosza, '
    + 'a zawodnik trafia tam, gdzie ktoś wpisał — niezależnie od tego, czy ma diagnozę');

  check('⛔ (I2-0) odwrót przy niepoliczonej trasie to `/dzis`, nigdy `/cele`',
    /router\.replace\(\s*postOnboardingRoute\s*\?\?\s*'\/dzis'\s*\)/.test(layout),
    'zmienił się odwrót na wypadek, gdy odczyt jeszcze nie wrócił; `/cele` w tym miejscu każe '
    + 'zakładać Cel komuś, kto może go już mieć, a `/diagnoza` obiecuje wynik, którego może nie być');

  // ── ⭐ ZAPADKA NA SKASOWANIE ──
  // Bez tej asercji wszystkie powyższe spełnia też ekran, który trasę liczy
  // i NIGDY jej nie wykonuje. Strażnik nagradzałby wtedy skasowanie skoku.
  check('⭐ (I2-0) koniec onboardingu NAPRAWDĘ uruchamia przekierowanie (`onFinish` → `setRedirectPending(true)`)',
    /onFinish=\{[^}]*setRedirectPending\(true\)/.test(layout)
    && /router\.replace\(/.test(layout),
    'zniknął zapalnik przekierowania albo samo `router.replace`; trasa liczy się i nie wykonuje, '
    + 'więc onboarding znów kończy się PUSTYM EKRANEM — świeże konto ląduje na Dziś bez Celu '
    + 'i bez rekomendacji, czyli tam, gdzie nie ma nic do zrobienia');
}

check('ma diagnozę → /diagnoza (wynik, nie pusty ekran)',
  postOnboardingTarget(true) === '/diagnoza', postOnboardingTarget(true));

check('nie ma diagnozy → /cele (założenie Celu, nie pusty ekran)',
  postOnboardingTarget(false) === '/cele', postOnboardingTarget(false));

check('R5: błąd odczytu (null) → /dzis, NIE /cele — „nie wiem" to nie „nie ma"',
  postOnboardingTarget(null) === '/dzis', postOnboardingTarget(null));

check('błąd odczytu nie udaje wyniku diagnozy',
  postOnboardingTarget(null) !== '/diagnoza', postOnboardingTarget(null));

check('trzy wejścia dają trzy różne wyjścia (żaden stan nie jest zlany z innym)',
  new Set([postOnboardingTarget(true), postOnboardingTarget(false), postOnboardingTarget(null)]).size === 3,
  JSON.stringify([postOnboardingTarget(true), postOnboardingTarget(false), postOnboardingTarget(null)]));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
