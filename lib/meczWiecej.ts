// PLAN-D-A1 08.2026 (18.08.2026) — NOWY PLIK. CO Z KARTY MECZU STOI NA
// WIERZCHU, A CO ZA JEDNYM DOTKNIĘCIEM.
//
// ═════════════════════════════════════════════════════════════════════
// SKĄD TO SIĘ WZIĘŁO — decyzja Kuby z 18.08.2026 (M1 §3, wariant A)
// ═════════════════════════════════════════════════════════════════════
// `app/(tabs)/mecz.tsx` ma 961 linii i do 18.08.2026 miał ZERO odnośników
// w całym repozytorium poza własną zakładką (`grep -rn "'/mecz'" app
// components lib` → 0 trafień). Zejście paska do dwóch zakładek skasowałoby
// go w całości — razem z jedynym wejściem do `match_contexts`
// i `match_context_answers`.
//
// Rozstrzygnięcie Kuby:
//   > „Ścieżka meczu chudnie do makiety. Reszta pytań ląduje w arkuszu
//   >  »powiedz więcej o tym meczu«, dostępnym z tego samego kafla."
//
// Ten moduł trzyma TĘ TABELĘ — i tylko ją. ⛔ Nie zapisuje niczego, nie zna
// Supabase i nie rysuje. Odpowiada na jedno pytanie: **która rzecz o meczu
// stoi w ocenie z kafla, a która w arkuszu.**
//
// ⛔ CZEGO TU NIE MA, i to jest granica dowodu (Z0): długość całego meczu
// (`match_contexts.match_length_minutes`) NIE ISTNIEJE W BAZIE. Bez niej
// minuty na boisku nic nie znaczą (45′ z 60′ ≠ 45′ z 90′), więc ta pozycja
// jest tu wymieniona ze stanem `czeka_na_kolumne`, a nie udaje, że działa.

/** Gdzie rzecz o meczu żyje po decyzji z 18.08.2026. */
export type MiejsceRzeczy =
  /** w ścieżce oceny na „Dziś" — to rysuje makieta v3 */
  | 'ocena_z_kafla'
  /** w arkuszu „powiedz więcej o tym meczu", z tego samego kafla */
  | 'arkusz_wiecej';

/** Czy produkt UMIE dziś tę rzecz zapisać. ⛔ Trzy wartości, nie dwie (R5). */
export type StanRzeczy =
  /** kolumna jest, ekran ją zapisuje */
  | 'dziala'
  /** kolumna jest, ale żaden ekran w nowej ścieżce jej nie zapisuje */
  | 'czeka_na_ekran'
  /** kolumny NIE MA w bazie — zmierzone 18.08.2026 */
  | 'czeka_na_kolumne';

export type RzeczOMeczu = {
  /** Nazwa kolumny w `match_contexts` albo `—`, gdy rzecz nie ma kolumny. */
  kolumna: string;
  /** Napis, który czyta zawodnik. */
  napis: string;
  miejsce: MiejsceRzeczy;
  stan: StanRzeczy;
};

/**
 * ⭐ DZIESIĘĆ RZECZY O MECZU — cała karta meczu rozłożona na dwa miejsca.
 * ⛔ Lista jest ZAMKNIĘTA: rzecz, której tu nie ma, nie ma się gdzie narysować,
 * a rzecz, która tu jest bez wejścia z ekranu, zapala strażnika.
 */
export const RZECZY_O_MECZU: readonly RzeczOMeczu[] = [
  // ── ścieżka oceny na „Dziś" — cztery rzeczy, tak rysuje makieta ──────
  { kolumna: 'minutes_played', napis: 'Ile minut byłeś na boisku',
    miejsce: 'ocena_z_kafla', stan: 'czeka_na_ekran' },
  { kolumna: 'match_length_minutes', napis: 'Ile trwał cały mecz',
    miejsce: 'ocena_z_kafla', stan: 'czeka_na_kolumne' },
  { kolumna: 'match_rpe', napis: 'Jak ciężko było · 1–10',
    miejsce: 'ocena_z_kafla', stan: 'dziala' },
  { kolumna: '—', napis: 'Czy coś Cię boli',
    miejsce: 'ocena_z_kafla', stan: 'dziala' },
  // ── arkusz „powiedz więcej o tym meczu" — sześć rzeczy ───────────────
  { kolumna: 'self_rating', napis: 'Jak sam oceniasz swoją grę',
    miejsce: 'arkusz_wiecej', stan: 'czeka_na_ekran' },
  { kolumna: 'mental_state', napis: 'Z jaką głową w to wszedłeś',
    miejsce: 'arkusz_wiecej', stan: 'czeka_na_ekran' },
  { kolumna: 'demanding_conditions', napis: 'Warunki, w jakich graliście',
    miejsce: 'arkusz_wiecej', stan: 'czeka_na_ekran' },
  { kolumna: 'position_played_today', napis: 'Na jakiej pozycji zagrałeś',
    miejsce: 'arkusz_wiecej', stan: 'czeka_na_ekran' },
  { kolumna: 'result', napis: 'Wynik meczu',
    miejsce: 'arkusz_wiecej', stan: 'czeka_na_ekran' },
  { kolumna: 'notes', napis: 'Cokolwiek chcesz zapamiętać',
    miejsce: 'arkusz_wiecej', stan: 'czeka_na_ekran' },
];

/** Rzeczy, które mają stanąć w danym miejscu. */
export function rzeczyMeczu(miejsce: MiejsceRzeczy): RzeczOMeczu[] {
  return RZECZY_O_MECZU.filter((r) => r.miejsce === miejsce);
}

/**
 * ⭐ ZDANIE POD LISTĄ W ARKUSZU — mówi PRAWDĘ o tym, gdzie te pola dziś
 * mieszkają. ⛔ Dopóki pola nie są przepisane do arkusza, arkusz ma
 * powiedzieć wprost, że prowadzi do pełnej karty meczu — inaczej byłby
 * obietnicą, która nic nie zapisuje (Z0).
 */
export const MECZ_WIECEJ_WEJSCIE = 'Otwórz pełną kartę meczu →';

export function podpisArkuszaMeczu(): string {
  const wArkuszu = rzeczyMeczu('arkusz_wiecej').length;
  return `${wArkuszu} rzeczy, których nie ma w ocenie z kafla. `
    + 'Zapisujesz je w pełnej karcie meczu — ta ścieżka jeszcze nie przeniosła się tutaj.';
}

/**
 * ⭐ CZEGO PRODUKT NIE UMIE ZAPISAĆ — imiennie, na ekranie, nie w przypisie.
 * ⛔ To nie jest ozdoba: bez `match_length_minutes` minuty na boisku nie mają
 * z czym się porównać, więc arkusz mówi to zawodnikowi, zamiast pokazywać
 * pole, które nic nie zapisze (Z0, R5).
 */
export function czegoNieUmiemyZapisac(): RzeczOMeczu[] {
  return RZECZY_O_MECZU.filter((r) => r.stan === 'czeka_na_kolumne');
}

export const MECZ_CZEKA_NA_KOLUMNE = (napis: string) =>
  `„${napis}" — tego jeszcze nie zapiszemy. Nie ma na to miejsca w bazie i nie udajemy, że jest.`;
