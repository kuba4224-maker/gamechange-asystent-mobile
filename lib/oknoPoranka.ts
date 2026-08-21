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

// ═════════════════════════════════════════════════════════════════════
// 4. ⭐⭐ PAS D3 (21.08.2026) — CZTERY STANY ANKIETY, NIE DWA (R5)
// ═════════════════════════════════════════════════════════════════════
// ⭐ ZNALEZISKO PASA T2, §7.4 — ZGŁOSZONE I NIEZROBIONE, JEGO WŁASNYMI SŁOWAMI:
//
//     „Nie sprawdziłem, co widzi zawodnik, który wypełnił ankietę rano,
//      a wraca po 12:00. Historia wpisów pokaże wpis, ale kafel będzie
//      zaszarzony tak samo jak u kogoś, kto nie wypełnił."
//
// ⛔ TO JEST DOKŁADNIE TA JEDNA RZECZ, KTÓREJ ZABRANIA R5. Do 21.08.2026
// zaszarzony kafel i zdanie „Dziś już nie — ankieta mierzy poranek." widział
// TAK SAMO zawodnik, który ankietę wypełnił o 7:00, jak ten, któremu przepadła.
// Produkt mówił mu wtedy o jego własnej pracy coś, czego nie wiedział —
// bo sam też nie wiedział: ten ekran NIGDY nie czytał dzisiejszego wiersza.
//
// ⭐ TRZY WARTOŚCI, NIE DWIE — I DLATEGO CZTERY STANY.
// Odczyt dzisiejszego wpisu ma trzy wyniki: JEST · NIE MA · NIE WIEM.
// ⛔ „Nie wiem" NIE JEST „nie ma". Odczyt, który padł (RLS, brak sieci,
// wygasły dostęp), zamieniony w „nie wypełniłeś" to ta sama cisza, którą
// pas C3 wyciągał z `?? []` — tyle że wymierzona w zawodnika, który akurat
// wypełnił.
//
// ⛔⛔ CZEGO TU NIE MA I NIE BĘDZIE — TE SAME DWA ZAKAZY CO WYŻEJ:
//  • ⛔ ZERO LICZENIA. Ani dni z ankietą, ani dni bez niej, ani serii, ani
//    paska postępu. Stan jest odpowiedzią o DZIŚ i o niczym więcej (N1).
//    Ta funkcja nie przyjmuje historii — nie ma z czego policzyć serii.
//  • ⛔ ZERO POCHWAŁY. Zdanie potwierdzenia mówi, ŻE WPIS JEST. Nie mówi,
//    że zawodnik jest dobry, punktualny ani systematyczny (N1).
//  • ⛔ ZERO CZERWIENI (Z2) — a wygląd i tak rozstrzyga ekran.

/**
 * ⭐ WYNIK ODCZYTU DZISIEJSZEGO WPISU PORANNEGO — trzy wartości.
 *
 * ⛔ `nieznany` jest wartością POCZĄTKOWĄ, nie awaryjną: dopóki odczyt nie
 * wrócił, produkt naprawdę nie wie, i ma to powiedzieć zamiast zgadywać.
 */
export type OdczytDzisiejszegoWpisu = 'jest' | 'niema' | 'nieznany';

/**
 * ⭐ CZTERY STANY ANKIETY PORANNEJ — dokładnie tyle, ile wierszy ma tabela
 * z polecenia D3 §4. ⛔ Ani jeden nie jest zlany z innym.
 */
export type StanAnkietyPorannej =
  /** okno otwarte — formularz, jak dotąd. */
  | 'okno_otwarte'
  /** okno zamknięte, wpis z dzisiaj JEST — potwierdzenie, ⛔ nie ta sama szarość. */
  | 'zamkniete_wpis_jest'
  /** okno zamknięte, wpisu NIE MA — zdanie pasa T2, bez zmian. */
  | 'zamkniete_wpisu_nie_ma'
  /** ⛔ odczyt padł — czwarty stan, nazwany, ⛔ NIE zlewany z „nie ma". */
  | 'zamkniete_nie_wiemy';

/**
 * ⭐ JEDYNE MIEJSCE, W KTÓRYM POWSTAJE STAN ANKIETY.
 *
 * ⛔ `teraz` i `odczyt` są PARAMETRAMI — bez tego nie dałoby się sprawdzić
 * asercją ani jednego z czterech stanów inaczej niż przestawianiem zegara
 * maszyny i psuciem bazy.
 *
 * ⛔ Przy OTWARTYM oknie odczyt nie zmienia niczego: formularz stoi tak samo
 * dla tego, kto już wypełnił (zapis go POPRAWIA — deduplikacja z 10.08.2026),
 * jak dla tego, kto jeszcze nie. To jest stan pierwszy z tabeli i został
 * nietknięty.
 */
export function stanAnkietyPorannej(
  teraz: Date, odczyt: OdczytDzisiejszegoWpisu,
): StanAnkietyPorannej {
  if (czyOknoPorankaOtwarte(teraz)) return 'okno_otwarte';
  switch (odczyt) {
    case 'jest': return 'zamkniete_wpis_jest';
    case 'niema': return 'zamkniete_wpisu_nie_ma';
    case 'nieznany': return 'zamkniete_nie_wiemy';
  }
}

/**
 * ⚠️ BRZMIENIE — DO PRZEJRZENIA PRZEZ KUBĘ (PAS D3, 21.08.2026).
 *
 * ⛔ MÓWI, ŻE WPIS JEST. Nie chwali, nie ocenia, nie liczy (N1) i nie
 * zawiera ani jednej cyfry. Zawodnik ma się dowiedzieć JEDNEJ rzeczy:
 * że jego poranna praca jest zapisana i nic nie przepadło.
 */
export const ANKIETA_PORANNA_WYPELNIONA_ZDANIE =
  'Poranny wpis z dzisiaj jest zapisany.';

/**
 * ⚠️ BRZMIENIE — DO PRZEJRZENIA PRZEZ KUBĘ (PAS D3, 21.08.2026).
 *
 * ⛔ CZWARTY STAN MÓWI, ŻE NIE WIE. Nie udaje „nie wypełniłeś" i nie udaje
 * „wypełniłeś". ⭐ Podaje też jedyną rzecz, którą zawodnik może z tym zrobić:
 * pociągnąć ekran w dół (ten ekran ma `RefreshControl` od 27.07.2026).
 */
export const ANKIETA_PORANNA_STAN_NIEZNANY_ZDANIE =
  'Nie udało się sprawdzić, czy dzisiejszy wpis jest. Pociągnij ekran w dół.';
