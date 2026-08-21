// PLAN-D 08.2026 · PAS T2 (19.08.2026) — NOWY PLIK.
//
//   node --experimental-strip-types --import ./tests/rejestracja-hooka.mjs lib/oknoPoranka.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ═════════════════════════════════════════════════════════════════════
// PO CO TEN PLIK ISTNIEJE
// ═════════════════════════════════════════════════════════════════════
// ⭐ DECYZJA KUBY Z 17.08.2026, DO 19.08.2026 BEZ ANI JEDNEJ LINII KODU.
// Jego słowa, przepisane co do znaku:
//
//     „nie można wypełniać ankiety wstecz. To byłoby nierzetelne"
//
// Do dziś `app/(tabs)/dziennik.tsx` przyjmował wpis poranny o KAŻDEJ porze —
// także o 23:50. Zawodnik odtwarzał wtedy z pamięci sen i energię sprzed
// piętnastu godzin, a `computeReadinessSignals()` w silniku rekomendacji
// (drugie repozytorium) czytał to jako pomiar poranka. To nie jest niedokładność
// — to jest liczba, która UDAJE pomiar, czyli Z0.
//
// ⚠️ TO JEST DECYZJA PRODUKTOWA, NIE LICZBA Z BADANIA (reguła R4).
// ⛔ Nie ma badania, które mówi „ankieta senna traci trafność po 12:00".
// Godzinę 12:00 wybrał Kuba i tylko on może ją zmienić. Gdyby kiedyś ktoś
// zapytał „skąd dwanaście", odpowiedź brzmi: „z decyzji Kuby z 17.08.2026,
// zapisanej w makiecie v3 jako `OKNO_PORANKA_DO`" — a nie „z literatury".
// Dlatego stała ma nazwę i komentarz, a nie stoi jako `12` w warunku.
//
// ═════════════════════════════════════════════════════════════════════
// ⛔⛔ CZEGO TU NIE MA I NIE MOŻE BYĆ — REGUŁA N1
// ═════════════════════════════════════════════════════════════════════
// ⛔ ZERO LICZENIA DNI BEZ ANKIETY. Nie ma tu serii, nie ma „trzeci dzień
// z rzędu bez wpisu", nie ma narastającej czerwieni i nie ma cichego licznika
// „do logu". Reguła N1 brzmi: NAGRADZAMY WYKONANĄ PRACĘ, NIGDY OBECNOŚĆ.
// Licznik nieobecności jest tą samą mechaniką co seria — tyle że odwróconą
// i wymierzoną w zawodnika, który akurat miał zawody, chorobę albo szkołę.
// ⛔ Ten zakaz ma własną asercję w `lib/oknoPoranka.selftest.ts` (sekcja 5)
// i własną mutację w baterii — nie jest samym zdaniem w komentarzu.
//
// ⛔ ZERO CZERWIENI. Zamknięte okno to STAN, nie ostrzeżenie (Z2 — czerwień
// należy wyłącznie do bólu). Kafel szarzeje. Wygląd rozstrzyga ekran,
// ten plik oddaje mu tylko stan i zdanie.

// ═════════════════════════════════════════════════════════════════════
// 1. GODZINA GRANICZNA I JEJ ZEGAR
// ═════════════════════════════════════════════════════════════════════

/**
 * ⭐ GODZINA GRANICZNA OKNA PORANKA — 12:00.
 *
 * Źródło: **decyzja produktowa Kuby z 17.08.2026**, zapisana w makiecie v3
 * pod nazwą `OKNO_PORANKA_DO`. ⛔ NIE JEST TO LICZBA Z BADANIA (R4).
 *
 * Znaczenie: wpis poranny da się zapisać, dopóki na zegarze jest **mniej niż
 * 12:00**. O 12:00:00 okno jest już ZAMKNIĘTE — „do 12:00" czytamy jako
 * granicę wyłączną, bo „wypełnione o 12:00" nie jest już porankiem.
 */
export const OKNO_PORANKA_DO_GODZINY = 12;

/**
 * ⭐ CZYJEGO ZEGARA JEST TA GODZINA — pytanie, które musi mieć odpowiedź
 * w kodzie, a nie w czyjejś głowie (Z0).
 *
 * ⭐ ZEGAR LOKALNY URZĄDZENIA ZAWODNIKA. `Date.prototype.getHours()` zwraca
 * godzinę w strefie systemu, na którym appka działa — czyli w strefie telefonu
 * zawodnika. ⛔ NIE UTC i ⛔ nie strefa serwera Supabase.
 *
 * Dlaczego tak, a nie UTC: „poranek" jest faktem z życia zawodnika, nie
 * z bazy. Zawodnik w Polsce latem (UTC+2) o 11:00 swojego czasu ma 09:00 UTC;
 * gdyby zaporę postawić na UTC, wypełniałby ankietę poranną do 14:00 swojego
 * czasu. Zawodnik na obozie w innej strefie miałby okno przesunięte o tyle,
 * ile wynosi różnica — czyli o wartość, o której nikt mu nie powiedział.
 *
 * ⚠️ Ten sam zegar rozstrzyga już DEDUPLIKACJĘ wpisu porannego
 * w `app/(tabs)/dziennik.tsx` (`startOfDay.setHours(0, 0, 0, 0)` — czas
 * lokalny). Dwa mechanizmy na tym samym ekranie muszą mierzyć TYM SAMYM
 * zegarem, inaczej istnieje godzina, w której „dziś" znaczy dwie różne rzeczy.
 */
export const OKNO_PORANKA_ZEGAR =
  'zegar lokalny urządzenia zawodnika (Date#getHours), nie UTC i nie zegar serwera';

// ═════════════════════════════════════════════════════════════════════
// 2. STAN OKNA
// ═════════════════════════════════════════════════════════════════════

/**
 * Dwa stany, nie trzy. ⛔ Nie ma stanu „nie wiem, która godzina" — zegar
 * urządzenia jest zawsze dostępny, a udawanie trzeciego stanu otwierałoby
 * furtkę „skoro nie wiem, to przepuszczam".
 */
export type StanOknaPoranka = 'otwarte' | 'zamkniete';

/**
 * ⭐ JEDYNE MIEJSCE, W KTÓRYM PORÓWNUJEMY GODZINĘ Z GRANICĄ.
 *
 * ⛔ `teraz` jest PARAMETREM, a nie `new Date()` w środku. Bez tego zapory
 * nie dałoby się sprawdzić asercją inaczej niż przestawianiem zegara maszyny,
 * czyli w praktyce wcale.
 */
export function stanOknaPoranka(teraz: Date): StanOknaPoranka {
  return teraz.getHours() < OKNO_PORANKA_DO_GODZINY ? 'otwarte' : 'zamkniete';
}

/** Skrót czytelny w warunku ekranu. Ta sama reguła, jedno źródło. */
export function czyOknoPorankaOtwarte(teraz: Date): boolean {
  return stanOknaPoranka(teraz) === 'otwarte';
}

// ═════════════════════════════════════════════════════════════════════
// 3. BRZMIENIE
// ═════════════════════════════════════════════════════════════════════

/**
 * ⚠️ BRZMIENIE — DO PRZEJRZENIA PRZEZ KUBĘ (PAS T2, 19.08.2026).
 *
 * ⛔ KAFEL ANKIETY NIE ZNIKA WIECZOREM. Szarzeje i MÓWI, DLACZEGO.
 * Powód jest zmierzony w regule R5: zniknięcie kafla sprawia, że zawodnik
 * nie odróżnia „wypełniłem" od „przepadło" — a to są dwie zupełnie różne
 * rzeczy i tylko jedna z nich jest jego.
 *
 * Zdanie świadomie:
 *   • nie przeprasza,
 *   • nie obiecuje przypomnienia (pchnięcie to osobna decyzja, W3),
 *   • ⛔ nie mówi, ile dni z rzędu zawodnik nie wypełnił (N1),
 *   • podaje POWÓD, nie zakaz: ankieta mierzy poranek, więc wieczorem nie ma
 *     czego mierzyć.
 */
export const OKNO_PORANKA_ZAMKNIETE_ZDANIE = 'Dziś już nie — ankieta mierzy poranek.';

/**
 * ⭐ TO SAMO ZDANIE WRACA PRZY PRÓBIE ZAPISU — świadomie JEDNO, nie dwa.
 * Zawodnik, który zostawił ekran otwarty przez południe i dotknął „Zapisz",
 * ma przeczytać dokładnie to samo, co czyta na zaszarzonym kaflu. Dwa różne
 * zdania o tej samej rzeczy to dwa brzmienia do zatwierdzania i dwa miejsca,
 * w których mogą się rozjechać.
 *
 * Zwraca `null`, gdy okno jest otwarte — czyli „nie ma powodu odmowy".
 */
export function powodOdmowyZapisuPoranka(teraz: Date): string | null {
  return czyOknoPorankaOtwarte(teraz) ? null : OKNO_PORANKA_ZAMKNIETE_ZDANIE;
}
