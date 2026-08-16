// Weryfikacja logiki "wzmocnienia znaczenia" Celu (app/(tabs)/dzis.tsx) —
// czysta logika, bez Supabase/RN, uruchamiana lokalnie poza appką:
//
//   npx tsx lib/goal-prominence.selftest.ts
//
// (jeśli brak `tsx` w projekcie: `npm install --no-save tsx`, potem to
// samo polecenie). Ten sam wzorzec co lib/matchCascade.selftest.ts.
// Uruchom ponownie po każdej zmianie w lib/goal-prominence.ts.
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75)
// ═════════════════════════════════════════════════════════════════════
// ⚠️ KOREKTA NAGŁÓWKA TEGO PLIKU. Pierwsza linia mówi „(app/(tabs)/dzis.tsx)".
// TO JUŻ NIEPRAWDA i było nieprawdą, zanim ten pas zaczął. Jedyny konsument
// `goal-prominence` w całym repozytorium to `app/(tabs)/cele.tsx` (karta Celu,
// pod nazwą filaru) — hero Celu wyprowadzono z ekranu domowego, bo linia
// kosztowała tam wysokość potrzebną na przyciski feedbacku. Nagłówek został
// świadomie, żeby korekta była widoczna; adres pilnuje sekcja 0 niżej.
//
// CO BYŁO ZEPSUTE — nazwane liczbą. Ten plik miał 24 ASERCJE i ANI JEDNEJ,
// która czytałaby jakikolwiek EKRAN. Sprawdzał wyłącznie własny moduł przez
// `import`. Audyt H1 (15.08) zmierzył: nie istnieje stan repozytorium
// z pilnowanym defektem, na którym ten strażnik by się zapalił.
//
// DLACZEGO TO JEST GROŹNE TUTAJ. `goalOriginContext` rozstrzyga PIERWSZEŃSTWO
// (notatka trenera > notatka zawodnika > etykieta wg `origin`) i JEST JEDYNYM
// miejscem, w którym zawodnik dowiaduje się, CZYJ jest jego Cel. Ekran, który
// ominie tę funkcję albo narysuje obok niej surowe `refinement_note`, pokazuje
// Cel zasugerowany przez trenera dokładnie tak samo, jak wybrany samodzielnie
// — albo dubluje ten sam tekst dwa razy. Przechodziło to na zielono 24 na 24.
//
// ⭐ ZNALEZISKO: PRODUCENT BEZ KONSUMENTA. Z pięciu funkcji tego modułu ekran
// woła DOKŁADNIE JEDNĄ. `weeksActiveSince`, `pluralizePl`, `weekNounPl`
// i `recommendationNounPl` nie mają w `app/` ani `components/` ANI JEDNEGO
// wywołania — mają za to 19 z 24 asercji tego pliku. To nie jest porażka
// i nie zapala CI na czerwono: to zmierzony stan, pilnowany asercją na RÓWNOŚĆ
// niżej, żeby nikt nie dołożył piątej sieroty i żeby powrót któregoś z tych
// brzmień na ekran był widoczny, a nie cichy.
//
// ⚠️ CZEGO TA SEKCJA NIE UDAJE. Czyta źródło ekranu JAKO TEKST — nie uruchamia
// Reacta i nie wie, czy ekran się rysuje.
// ⚠️ NIE UŻYWAĆ `new URL(...)` (O53): `tsconfig.json` ciągnie DOM, więc `tsc`
// pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { weeksActiveSince, weekNounPl, recommendationNounPl, pluralizePl, goalOriginContext } from './goal-prominence';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ 0. PAS I2 16.08.2026 — EKRAN, KTÓRY RYSUJE POCHODZENIE CELU (K4 / O75)
// ═══════════════════════════════════════════════════════════════════

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — `cele.tsx` CYTUJE w komentarzach i nazwę funkcji,
 * i powód jej istnienia („DLACZEGO `goalOriginContext`, A NIE POWTÓRZENIE
 * `refinement_note` NIŻEJ"), więc strażnik czytający surowy tekst przechodziłby
 * na własnej dokumentacji ekranu.
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

const PLIK_CELE = 'app/(tabs)/cele.tsx';
const cele = bezKomentarzy(surowe(PLIK_CELE));

{
  console.log('0. EKRAN, KTÓRY RYSUJE POCHODZENIE CELU (K4 / O75)');

  check('⛔ (I2-0) plik ekranu z listy strażnika istnieje i daje się odczytać',
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
  const ZRODLA = new Map(EKRANY.map(
    (p) => [p, bezKomentarzy(readFileSync(join(root, p), 'utf8'))] as const));

  const konsumenci = EKRANY.filter((p) => /from\s+'[^']*\/goal-prominence'/.test(ZRODLA.get(p) ?? ''));
  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c`, nie przepisane z pamięci.
  // RÓWNOŚĆ, nie „≥ 1" (O73).
  const KONSUMENCI = [PLIK_CELE].sort();
  const brakujacy = KONSUMENCI.filter((p) => !konsumenci.includes(p));
  const nadmiarowi = konsumenci.filter((p) => !KONSUMENCI.includes(p));
  check('⭐ (I2-0) pochodzenie Celu rysuje DOKŁADNIE ten plik, co 16.08 — RÓWNOŚĆ, nie „≥ 1" (O73)',
    brakujacy.length === 0 && nadmiarowi.length === 0,
    `BRAKUJE: ${brakujacy.join(', ') || '—'} · NADMIAROWI: ${nadmiarowi.join(', ') || '—'} `
    + '→ ubył: Cel zasugerowany przez trenera znów wygląda tak samo jak wybrany samodzielnie, '
    + 'a 24 asercje niżej nadal są zielone; doszedł: sprawdź, czy nowe miejsce nie rysuje '
    + 'surowego `refinement_note` OBOK zdania z funkcji.');

  // ── ⭐ PRODUCENT BEZ KONSUMENTA — stan ZMIERZONY, nie życzenie ──
  // Bez tej asercji cztery funkcje z 19 asercjami mogą zniknąć albo namnożyć
  // się bez śladu. Z nią: ubytek znaczy „ktoś skasował funkcję, która i tak
  // nic nie rysowała" (w porządku, ale świadomie), nadmiar znaczy „doszła
  // piąta sierota", a WYPADNIĘCIE Z LISTY znaczy, że któreś brzmienie WRÓCIŁO
  // na ekran i od tej chwili trzeba go pilnować asercją o treści.
  const EKSPORTY = ['weeksActiveSince', 'pluralizePl', 'weekNounPl', 'recommendationNounPl', 'goalOriginContext'];
  const bezEkranu = EKSPORTY
    .filter((nazwa) => !EKRANY.some((p) => new RegExp(`\\b${nazwa}\\s*\\(`).test(ZRODLA.get(p) ?? '')))
    .sort();
  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c`.
  const BEZ_EKRANU = ['pluralizePl', 'recommendationNounPl', 'weekNounPl', 'weeksActiveSince'];
  check('⭐ (I2-0) DOKŁADNIE cztery funkcje modułu nie mają ani jednego ekranu — stan ZMIERZONY 16.08',
    bezEkranu.length === BEZ_EKRANU.length && bezEkranu.every((n, i) => n === BEZ_EKRANU[i]),
    `BEZ EKRANU DZIŚ: ${bezEkranu.join(', ') || '—'} · OCZEKIWANE: ${BEZ_EKRANU.join(', ')} `
    + '→ jeśli któraś WYPADŁA z listy, wróciła na ekran i potrzebuje własnej asercji o treści; '
    + 'jeśli DOSZŁA nowa — właśnie przestała być rysowana i zawodnik czegoś już nie widzi, '
    + 'a asercje tego pliku nadal będą zielone.');

  // ── Ekran nie pisze zdania o pochodzeniu sam ──
  check('⛔ (I2-0) ekran woła `goalOriginContext(g)` — całym Celem, nie wybranym polem',
    /goalOriginContext\(\s*g\s*\)/.test(cele),
    'ekran przestał wołać funkcję albo podaje jej okrojony obiekt; pierwszeństwo (notatka '
    + 'trenera > notatka zawodnika > etykieta wg `origin`) liczy się wtedy na niepełnych danych '
    + 'i notatka trenera przepada — zawodnik widzi swój Cel jako „wybrany przez siebie"');

  // ── Brzmienia pochodzą z modułu, nie z ekranu ──
  // ⚠️ Teksty budowane WYWOŁANIEM MODUŁU, nie przepisane tutaj.
  const TRENER = goalOriginContext({ origin: 'coach_suggested', suggestion_note: null, refinement_note: null }) ?? '';
  const ZAWODNIK = goalOriginContext({ origin: 'player_chosen', suggestion_note: null, refinement_note: null }) ?? '';
  const kopie = [
    ['etykieta Celu od trenera', TRENER],
    ['etykieta Celu wybranego samodzielnie', ZAWODNIK],
    ['prefiks „Twoja notatka:"', 'Twoja notatka:'],
  ].filter(([, tekst]) => tekst !== '' && cele.includes(tekst)).map(([co]) => co);
  check('⛔ (I2-0) na ekranie NIE STOI kopia żadnej etykiety pochodzenia z modułu',
    kopie.length === 0,
    `KOPIE NA EKRANIE: ${kopie.join(', ')} — od tej chwili ta sama etykieta ma DWA źródła; `
    + 'zmiana pierwszeństwa w module przestanie docierać do karty Celu, a obie wersje '
    + 'będą wyglądać poprawnie');

  // ── Surowa notatka tylko jako ODWRÓT, nigdy obok ──
  check('⛔ (I2-0) surowe `refinement_note` rysuje się WYŁĄCZNIE, gdy funkcja zwróciła `null`',
    /originContext[\s\S]{0,200}?\?[\s\S]{0,200}?:\s*g\.refinement_note/.test(cele),
    'notatka zawodnika przestała być odwrotem, a stała się drugim wierszem obok zdania '
    + 'z funkcji — `goalOriginContext` ZAWIERA JĄ W SOBIE (wariant „Twoja notatka: …"), '
    + 'więc zawodnik czyta ten sam tekst dwa razy pod rząd');

  // ── ⭐ ZAPADKA NA SKASOWANIE ──
  // Bez tej asercji wszystkie powyższe spełnia też karta, która wyniku funkcji
  // NIE RYSUJE. Strażnik nagradzałby wtedy skasowanie linii z karty Celu.
  check('⭐ (I2-0) karta Celu NAPRAWDĘ rysuje wynik funkcji — `{originContext}` idzie do widoku',
    /\{\s*originContext\s*\}/.test(cele),
    'zniknęło renderowanie zdania o pochodzeniu Celu; wszystkie asercje wyżej spełnia też karta, '
    + 'na której Cel zasugerowany przez trenera wygląda identycznie jak wybrany samodzielnie — '
    + 'a to była cała treść tej funkcji');
}

// --- weeksActiveSince ---
{
  const now = new Date('2026-08-06T12:00:00.000Z');
  check('0 tygodni — cel założony dziś', weeksActiveSince('2026-08-06T08:00:00.000Z', now) === 0, String(weeksActiveSince('2026-08-06T08:00:00.000Z', now)));
  check('0 tygodni — cel założony 3 dni temu', weeksActiveSince('2026-08-03T12:00:00.000Z', now) === 0, String(weeksActiveSince('2026-08-03T12:00:00.000Z', now)));
  check('1 tydzień — cel założony dokładnie 7 dni temu', weeksActiveSince('2026-07-30T12:00:00.000Z', now) === 1, String(weeksActiveSince('2026-07-30T12:00:00.000Z', now)));
  check('3 tygodnie — cel założony 25 dni temu', weeksActiveSince('2026-07-12T12:00:00.000Z', now) === 3, String(weeksActiveSince('2026-07-12T12:00:00.000Z', now)));
  check('0 (nigdy ujemne) — data w przyszłości', weeksActiveSince('2026-08-10T12:00:00.000Z', now) === 0, String(weeksActiveSince('2026-08-10T12:00:00.000Z', now)));
}

// --- pluralizePl / weekNounPl / recommendationNounPl ---
{
  check('pluralizePl(1) -> jeden', pluralizePl(1, ['jeden', 'kilka', 'wiele']) === 'jeden', pluralizePl(1, ['jeden', 'kilka', 'wiele']));
  check('pluralizePl(3) -> kilka', pluralizePl(3, ['jeden', 'kilka', 'wiele']) === 'kilka', pluralizePl(3, ['jeden', 'kilka', 'wiele']));
  check('pluralizePl(13) -> wiele (wyjątek 12-14)', pluralizePl(13, ['jeden', 'kilka', 'wiele']) === 'wiele', pluralizePl(13, ['jeden', 'kilka', 'wiele']));

  check('weekNounPl(1) -> tydzień', weekNounPl(1) === 'tydzień', weekNounPl(1));
  check('weekNounPl(2) -> tygodnie', weekNounPl(2) === 'tygodnie', weekNounPl(2));
  check('weekNounPl(4) -> tygodnie', weekNounPl(4) === 'tygodnie', weekNounPl(4));
  check('weekNounPl(5) -> tygodni', weekNounPl(5) === 'tygodni', weekNounPl(5));
  check('weekNounPl(12) -> tygodni (wyjątek 12-14)', weekNounPl(12) === 'tygodni', weekNounPl(12));
  check('weekNounPl(22) -> tygodnie', weekNounPl(22) === 'tygodnie', weekNounPl(22));
  check('weekNounPl(0) -> tygodni', weekNounPl(0) === 'tygodni', weekNounPl(0));

  check('recommendationNounPl(1) -> rekomendacja', recommendationNounPl(1) === 'rekomendacja', recommendationNounPl(1));
  check('recommendationNounPl(2) -> rekomendacje', recommendationNounPl(2) === 'rekomendacje', recommendationNounPl(2));
  check('recommendationNounPl(5) -> rekomendacji', recommendationNounPl(5) === 'rekomendacji', recommendationNounPl(5));
}

// --- goalOriginContext ---
{
  check(
    'coach_suggested + notatka trenera',
    goalOriginContext({ origin: 'coach_suggested', suggestion_note: 'Deficyt w diagnozie', refinement_note: null })
      === 'Zasugerowany przez trenera: „Deficyt w diagnozie”',
    String(goalOriginContext({ origin: 'coach_suggested', suggestion_note: 'Deficyt w diagnozie', refinement_note: null }))
  );
  check(
    'coach_suggested bez notatki',
    goalOriginContext({ origin: 'coach_suggested', suggestion_note: null, refinement_note: null }) === 'Zasugerowany przez trenera',
    String(goalOriginContext({ origin: 'coach_suggested', suggestion_note: null, refinement_note: null }))
  );
  check(
    'player_chosen + notatka zawodnika',
    goalOriginContext({ origin: 'player_chosen', suggestion_note: null, refinement_note: 'Chcę szybciej biegać' })
      === 'Twoja notatka: „Chcę szybciej biegać”',
    String(goalOriginContext({ origin: 'player_chosen', suggestion_note: null, refinement_note: 'Chcę szybciej biegać' }))
  );
  check(
    'player_chosen bez notatki',
    goalOriginContext({ origin: 'player_chosen', suggestion_note: null, refinement_note: null }) === 'Wybrany przez Ciebie',
    String(goalOriginContext({ origin: 'player_chosen', suggestion_note: null, refinement_note: null }))
  );
  check(
    'nieznany origin -> null',
    goalOriginContext({ origin: null, suggestion_note: null, refinement_note: null }) === null,
    String(goalOriginContext({ origin: null, suggestion_note: null, refinement_note: null }))
  );
  // coach_suggested ma priorytet nad refinement_note, gdyby oba jakoś współistniały
  check(
    'coach_suggested wygrywa nad refinement_note',
    goalOriginContext({ origin: 'coach_suggested', suggestion_note: null, refinement_note: 'notatka zawodnika' }) === 'Zasugerowany przez trenera',
    String(goalOriginContext({ origin: 'coach_suggested', suggestion_note: null, refinement_note: 'notatka zawodnika' }))
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
