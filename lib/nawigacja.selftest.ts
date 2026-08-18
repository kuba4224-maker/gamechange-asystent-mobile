// PLAN-D-A1 08.2026 (18.08.2026) — NOWY PLIK. STRAŻNIK PASKA ZAKŁADEK
// I OSIĄGALNOŚCI TRAS (A4).
//
// ═════════════════════════════════════════════════════════════════════
// PO CO TO ISTNIEJE — i co było zamiast tego
// ═════════════════════════════════════════════════════════════════════
// Do 18.08.2026 jedyną obroną przed piątą zakładką był KOMENTARZ
// w `app/(tabs)/_layout.tsx` („Expo Router pokazuje w pasku KAŻDY plik z tego
// katalogu"). ⛔ Komentarz nie jest asercją: plik dołożony do `app/(tabs)/`
// bez wpisu `href: null` wchodzi do paska i nikt się o tym nie dowie.
//
// ⭐ DRUGA RZECZ, KTÓREJ NIKT NIE PILNOWAŁ, I TO JEST GORSZE. Zmierzone
// 18.08.2026 przez pas rozpoznawczy INW-A1: `app/(tabs)/mecz.tsx` ma
// **961 linii i ZERO `router.push('/mecz')` w całym repozytorium**. Jego
// jedynym wejściem była widoczna zakładka. Zdjęcie jej — a to robi ten
// pas — skasowałoby cały ekran razem z jedynym wejściem do `match_contexts`
// i `match_context_answers`, i nie zapaliłoby ani jednej asercji.
//
// Ten strażnik pilnuje obu rzeczy naraz:
//   1. ⛔ zakładek widocznych jest DOKŁADNIE tyle, ile mówi decyzja (dwie);
//   2. ⛔ każdy plik ekranu ma wpis w `_layout.tsx` (inaczej wraca do paska);
//   3. ⭐ każda trasa CHOWANA ma co najmniej jedno wejście spoza własnego
//      pliku — czyli da się do niej dojść.
//
// ⚠️ CZEGO TEN STRAŻNIK NIE ROBI: nie uruchamia nawigacji i nie wie, czy
// `router.push` naprawdę się wykona. Sprawdza OSIĄGALNOŚĆ Z KODU, nie
// z aplikacji. To jest granica jego dowodu i jest wypisana, nie przemilczana.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const katalogEkranow = join(root, 'app', '(tabs)');

let bledy = 0;
let ok = 0;
function check(nazwa: string, warunek: boolean, szczegol = '') {
  if (warunek) { ok += 1; console.log(`OK   - ${nazwa}`); }
  else { bledy += 1; console.log(`FAIL - ${nazwa}${szczegol ? ': ' + szczegol : ''}`); }
}

/** ⛔ Wycinamy komentarze: zakładka wymieniona w komentarzu nie jest zakładką. */
function bezKomentarzy(t: string): string {
  return t.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .filter((l) => !/^\s*\/\//.test(l)).join('\n');
}

// ═════════════════════════════════════════════════════════════════════
// 1. PASEK: DWIE ZAKŁADKI WIDOCZNE, RESZTA CHOWANA
// ═════════════════════════════════════════════════════════════════════
const PLIK_LAYOUT = join(katalogEkranow, '_layout.tsx');
check('⛔ (A4) `app/(tabs)/_layout.tsx` istnieje i daje się odczytać', existsSync(PLIK_LAYOUT));
const layout = bezKomentarzy(readFileSync(PLIK_LAYOUT, 'utf8'));

/** Wszystkie wpisy `<Tabs.Screen name="…" …/>` razem z tym, czy mają `href: null`. */
const wpisy = [...layout.matchAll(/<Tabs\.Screen\s+name="([^"]+)"([\s\S]*?)\/>/g)]
  .map((m) => ({ nazwa: m[1], chowany: /href:\s*null/.test(m[2]) }));

check('⛔ (A4) strażnik w ogóle coś znalazł — inaczej wszystko niżej jest puste',
  wpisy.length > 3, `wpisów: ${wpisy.length}`);

/**
 * ⭐ DECYZJA KUBY 17/18.08.2026: DWIE ZAKŁADKI. „Ja" zmienia NAPIS na „Profil";
 * ⛔ nazwa TRASY zostaje `ja`, bo `app/(tabs)/wiecej.tsx` przekierowuje na
 * `/ja` i zmiana nazwy zerwałaby to wejście.
 */
const WIDOCZNE_ZAKLADKI = ['dzis', 'ja'];
const widoczne = wpisy.filter((w) => !w.chowany).map((w) => w.nazwa).sort();
check('⭐⛔ (A4) ZAPADKA NA RÓWNOŚĆ: zakładek widocznych są DOKŁADNIE DWIE',
  widoczne.length === WIDOCZNE_ZAKLADKI.length
  && widoczne.every((n, i) => n === [...WIDOCZNE_ZAKLADKI].sort()[i]),
  `jest [${widoczne.join(', ')}], oczekiwane [${[...WIDOCZNE_ZAKLADKI].sort().join(', ')}]`);

check('⭐ (A4) zakładka „Ja" nosi napis „Profil" — decyzja Kuby 18.08',
  /name="ja"[\s\S]*?title:\s*'Profil'/.test(layout),
  'trasa `ja` nie ma tytułu „Profil"');

// ⛔ EXPO ROUTER POKAZUJE KAŻDY PLIK Z KATALOGU. Plik bez wpisu wraca do paska.
const plikiEkranow = readdirSync(katalogEkranow)
  .filter((f) => f.endsWith('.tsx') && f !== '_layout.tsx')
  .map((f) => f.replace(/\.tsx$/, ''))
  .sort();
const bezWpisu = plikiEkranow.filter((e) => !wpisy.some((w) => w.nazwa === e));
check('⛔ (A4) KAŻDY plik z `app/(tabs)/` ma wpis w pasku — inaczej wraca jako zakładka',
  bezWpisu.length === 0, `bez wpisu: ${bezWpisu.join(', ') || '—'}`);

const wpisyBezPliku = wpisy.filter((w) => !plikiEkranow.includes(w.nazwa)).map((w) => w.nazwa);
check('⛔ (A4) pasek nie wymienia ekranu, którego nie ma na dysku',
  wpisyBezPliku.length === 0, `wpisy bez pliku: ${wpisyBezPliku.join(', ') || '—'}`);

// ═════════════════════════════════════════════════════════════════════
// 2. ⭐ OSIĄGALNOŚĆ — KAŻDA CHOWANA TRASA MA WEJŚCIE SPOZA SIEBIE
// ═════════════════════════════════════════════════════════════════════
// Metoda: `router.push('/trasa')` albo `<Redirect href="/trasa" />` w dowolnym
// pliku `app/`, `components/` albo `lib/` — Z ODJĘCIEM pliku samej trasy
// (ekran, który prowadzi sam do siebie, nie jest wejściem).
const KORZENIE = ['app', 'components', 'lib'];
function przemiec(kat: string): string[] {
  if (!existsSync(kat)) return [];
  return readdirSync(kat, { withFileTypes: true }).flatMap((d) => {
    const p = join(kat, d.name);
    if (d.isDirectory()) return przemiec(p);
    return /\.(ts|tsx)$/.test(d.name) && !d.name.endsWith('.selftest.ts') ? [p] : [];
  });
}
const wszystkiePliki = KORZENIE.flatMap((k) => przemiec(join(root, k)));

function wejsciaDo(trasa: string): string[] {
  const wzorzec = new RegExp(`(router\\.(push|replace)\\(\\s*['"]/${trasa}['"]|href=["']/${trasa}["'])`);
  return wszystkiePliki
    .filter((f) => f !== join(katalogEkranow, `${trasa}.tsx`))
    .filter((f) => wzorzec.test(bezKomentarzy(readFileSync(f, 'utf8'))))
    .map((f) => f.slice(root.length + 1))
    .sort();
}

const chowane = wpisy.filter((w) => w.chowany).map((w) => w.nazwa);
check('⛔ (A4) strażnik osiągalności ma co sprawdzać', chowane.length > 0, `chowanych: ${chowane.length}`);

/**
 * ⭐ TRASY, KTÓRE PAS A1 MUSI UTRZYMAĆ PRZY ŻYCIU — asercja BEZWZGLĘDNA.
 * To są dwie trasy, którym ten pas zabrał albo przebudował jedyne wejście:
 * `mecz` stracił zakładkę, `kalendarz` stracił link „Kalendarz — dodaj
 * i zaplanuj →". ⛔ Obie muszą mieć wejście i to nie podlega zapadce.
 */
const MOJE_TRASY = ['mecz', 'kalendarz'];
for (const trasa of MOJE_TRASY) {
  const we = wejsciaDo(trasa);
  check(`⭐⛔ (A1) /${trasa} MA WEJŚCIE — ten pas ruszył jego jedyną drogę`,
    we.length >= 1, `wejść: ${we.join(', ') || 'ZERO'}`);
}

/**
 * ⚠️ ZAPADKA NA RÓWNOŚĆ, NIE „≥ 1" — i to jest decyzja, nie ustępstwo (O73).
 *
 * Zmierzone 18.08.2026, w trakcie pasa A1: TRZY chowane trasy nie mają
 * w repozytorium ANI JEDNEGO wejścia. ⛔ Żadnej z nich nie zabrał ten pas
 * jako pierwszy — wszystkie trzy miały wejście w `app/(tabs)/ja.tsx`, który
 * w tej samej rundzie przebudowuje **pas A3** (630 → 358 linii).
 * ⚠️ `diagnoza` straciła DRUGIE wejście tutaj: hero wąskiego gardła na „Dziś"
 * prowadziło na `/diagnoza` przy `showFirstStep` i zostało zdjęte razem
 * z hero (nota `claude/PRZEKAZANIE_PAS_A1_18_08_2026.md`).
 *
 * ⛔ TA LISTA MA MALEĆ. Kiedy pas A3 postawi wejścia w „Profilu", ta asercja
 * ZAPALI SIĘ NA SUKCESIE i wtedy trzeba ją skrócić — dokładnie tak, jak
 * zaprojektowano. Zamiana jej na „≥ 1" ukryłaby, że trzy ekrany są dziś
 * zbudowane i nieosiągalne.
 */
const BEZ_WEJSCIA_18_08_2026 = ['biblioteka', 'centrum-decyzji', 'diagnoza'].sort();
const BEZ_WEJSCIA_SWIADOMIE: Record<string, string> = {
  wiecej: 'plik jest tylko <Redirect href="/ja" /> — nie jest ekranem produktu',
};

const nieosiagalne: string[] = [];
for (const trasa of chowane) {
  const we = wejsciaDo(trasa);
  if (we.length === 0 && BEZ_WEJSCIA_SWIADOMIE[trasa] === undefined) nieosiagalne.push(trasa);
  console.log(`   · /${trasa} — wejść: ${we.length}${we.length ? ' → ' + we.join(', ') : ''}`);
}
nieosiagalne.sort();
check('⚠️⛔ (A4) ZAPADKA: trasy bez ani jednego wejścia to DOKŁADNIE te trzy, '
  + 'co 18.08.2026 — a nie „co najwyżej tyle"',
  nieosiagalne.length === BEZ_WEJSCIA_18_08_2026.length
  && nieosiagalne.every((n, i) => n === BEZ_WEJSCIA_18_08_2026[i]),
  `jest [${nieosiagalne.join(', ') || '—'}], zapadka [${BEZ_WEJSCIA_18_08_2026.join(', ')}]`);

// ⭐ NAJWAŻNIEJSZA ASERCJA TEGO PLIKU. Wymieniona z nazwy, bo to jest ta
// jedna trasa, którą ten pas mógł skasować po cichu.
const wejsciaMeczu = wejsciaDo('mecz');
check('⭐⛔ (A4) `/mecz` MA WEJŚCIE — bez tego zdjęcie zakładki kasuje 961 linii '
  + 'i jedyną drogę do `match_contexts`',
  wejsciaMeczu.length >= 1, `wejść do /mecz: ${wejsciaMeczu.join(', ') || 'ZERO'}`);

check('⭐ (A4) wejście do `/mecz` prowadzi z ekranu „Dziś" — tam, gdzie stoi kafel meczu',
  wejsciaMeczu.includes('app/(tabs)/dzis.tsx'),
  `wejścia: ${wejsciaMeczu.join(', ') || 'ZERO'}`);

// ═════════════════════════════════════════════════════════════════════
// 3. ⛔ PASEK NIE NIESIE LICZB — N1/N3 NA PASKU, NIE TYLKO NA EKRANIE
// ═════════════════════════════════════════════════════════════════════
check('⛔ (N1) pasek nie ma znaczków z liczbą (`tabBarBadge`) — nagroda za wejście',
  !/tabBarBadge/.test(layout), 'w pasku stoi badge');

// ⛔ PODSUMOWANIE W KSZTAŁCIE, KTÓRY CZYTA `tests/run-selftests.mjs`.
// Bez tej linii runner nie odróżnia strażnika, który wszystko sprawdził,
// od takiego, który nie uruchomił ani jednej asercji (znalezisko H1, O76).
console.log(`\n${ok} passed, ${bledy} failed`);
if (bledy > 0) throw new Error(`${bledy} asercji nie przeszło`);
