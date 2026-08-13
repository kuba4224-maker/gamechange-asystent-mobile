// PLAN-D-F 08.2026 (12.08.2026) — TEN PLIK PRZESTAŁ ZAWIERAĆ DRABINĘ.
//
// ══════════════════════════════════════════════════════════════════════
// GDZIE TERAZ MIESZKA ARBITER
//
//   logika (drabina, refrakcje, budżet):  gamechange-app/lib/arbiter-glosu.js
//   odczyty z bazy:                        gamechange-app/lib/arbiter-glosu-io.js
//   kto to woła:                           gamechange-app/api/cron-weekly-voice.js
//   testy (101 asercji):                   gamechange-app/tests/test-arbiter-glosu.js
//   przebieg 52 tygodni na 3 profilach:    gamechange-app/tests/test-arbiter-52-tygodni.js
//
// A CO ROBI APPKA: czyta gotowy wiersz `weekly_voice` i decyduje, co z nim
// zrobić na ekranie — `lib/glosTygodnia.ts` (+ `lib/glosTygodnia.selftest.ts`).
// ══════════════════════════════════════════════════════════════════════
//
// DLACZEGO SIĘ WYPROWADZIŁ. Od 11.08.2026 arbiter stał tutaj: 604 linie czystej
// logiki, 90 zielonych asercji, przebieg 52 tygodni — i ANI JEDEN importer.
// Sprawdzone `grep`em 12.08.2026: jedynym plikiem, który go wołał, był jego
// własny selftest. Tabela `weekly_voice` miała zero wierszy. Kod był gotowy
// i martwy jednocześnie, bo mieszkał po niewłaściwej stronie: liczyć go musi
// backend raz w tygodniu dla KAŻDEGO zawodnika, także wtedy, gdy nikt nie
// otworzył appki. Appka nie ma jak tego zrobić.
//
// ⚠️ NIE ODTWARZAJ TU DRABINY. Dwie kopie tej samej drabiny to gwarantowany
// cichy rozjazd: obie działają, obie mają zielone testy, a odpowiadają różnie
// — i nikt się nie dowie, która wersja rozstrzygnęła tydzień zawodnika.
// Pilnuje tego selftest obok (`arbiterGlosu.selftest.ts`): zapala się na
// czerwono, jeśli w tym pliku pojawi się cokolwiek, co rozstrzyga o głosie.
//
// Port do JS został ZMIERZONY, nie zadeklarowany: 143 360 stanów przepuszczonych
// przez oryginał TS i przez port JS dało 0 różnic (plus 191 porównań funkcji
// pobocznych i stałych). Pomiarnik sprawdzony mutacją.

/**
 * Wartości kolumny `weekly_voice.voice` — jedno do jednego z CHECK w bazie.
 * ZOSTAJE TUTAJ, bo jest kontraktem danych, nie logiką: appka musi umieć nazwać
 * to, co odczyta. Rozstrzyganie, KTÓRY z nich obowiązuje, jest w backendzie.
 */
// ⚠️ PLAN-D-P 08.2026 (13.08.2026) — SZEŚĆ WARTOŚCI, NIE SIEDEM.
// `calibration` zniknęło razem z narzędziem
// (claude/DECYZJA_KALIBRACJA_USUNIETA_13_08_2026.md). Ta lista, `Glos`
// w `lib/glosTygodnia.ts`, `GLOSY` w backendzie i CHECK `weekly_voice_voice_check`
// w bazie to CZTERY KOPIE tego samego zbioru — muszą się zgadzać co do sztuki.
export type Voice =
  | 'exit'
  | 'injury'
  | 'growth'
  | 'compass'
  | 'block'
  | 'silence';

/** Ścieżka jedynego źródła drabiny. Stała, żeby dało się ją sprawdzić testem, a nie tylko przeczytać w komentarzu. */
export const ZRODLO_DRABINY = 'gamechange-app/lib/arbiter-glosu.js';

/** Gdzie w appce mieszka to, co zostało: zamiana wiersza `weekly_voice` na ekran. */
export const WARSTWA_EKRANU = 'lib/glosTygodnia.ts';
