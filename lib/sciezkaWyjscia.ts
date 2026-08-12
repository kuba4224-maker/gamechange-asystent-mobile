// PLAN-D-H 08.2026 (12.08.2026) — NOWY PLIK. Ścieżka wyjścia: czysta logika.
//
//   node --experimental-strip-types lib/sciezkaWyjscia.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// Ten plik NIE zna Reacta i NIE robi zapytań. Ekran siedzi
// w `components/SciezkaWyjscia.tsx`; tutaj mieszkają wyłącznie reguły, które
// da się zepsuć po cichu.
//
// ── CO TO JEST I DLACZEGO JEST NAJTRUDNIEJSZE W PRODUKCIE ────────────
// Ścieżka wyjścia to jedyny stan, w którym produkt mówi zawodnikowi coś,
// czego on nie chce usłyszeć — i jedyny, w którym MILCZENIE jest właściwą
// odpowiedzią. Po włączeniu (spec 1.2, priorytet 0) arbiter wycisza WSZYSTKO:
// zero przypomnień, zero liczników, zero porównań. Mapa drogi przełącza się
// na wariant `after_deselection` (`lib/mapaDrogi.ts`, `wybierzWariant`),
// a punkt pomocy podnosi się na ekran „Dziś" (`app/(tabs)/dzis.tsx`).
//
// ── CZTERY REGUŁY, KTÓRYCH TU NIE WOLNO ZŁAMAĆ ───────────────────────
//   1. WŁĄCZA CZŁOWIEK ALBO NAZWANE ZDARZENIE — nigdy klasyfikator i nigdy
//      domysł z danych (zakaz 14 z kontraktu budowy). W tym pliku nie ma
//      i nie może się pojawić nic, co czyta treść wpisów zawodnika.
//   2. WEJŚCIE NIE JEST JEDNYM KLIKNIĘCIEM BEZ ODWROTU i nie wymaga
//      tłumaczenia się. Powód wolno podać, ale „Nie chcę tego nazywać"
//      jest pełnoprawną odpowiedzią i zapisuje się jako `event_kind = null`.
//   3. WYJŚCIE ZE STANU MUSI ISTNIEĆ. Stan, z którego nie da się wrócić,
//      to nie stan, to wyrok. `patchWylaczenia()` jest zawsze dostępny
//      i nigdy o nic nie pyta.
//   4. STAN KOŃCZY SIĘ ZDARZENIEM, NIGDY WYGAŚNIĘCIEM OKNA DANYCH
//      (reguła P9, poprawka A3). W tym pliku NIE MA i nie może być żadnego
//      liczenia „ile dni bez wpisu" ani żadnego progu, po którym stan
//      sam by się zamknął. Pilnuje tego selftest, który czyta źródło.
//
// ── KONTRAKT Z CZYTNIKIEM ARBITRA — nazwy przepisane, nie wymyślone ──
// `gamechange-app/lib/arbiter-glosu-io.js`:
//   • `czytajWyjscie()` bierze wiersz `exit_mode` z `closed_at IS NULL`
//     (kolumny: `state, opened_at, contact_m4_at, contact_m6_at,
//     contact_m9_at, contact_m12_at`) i uznaje ścieżkę za aktywną,
//     gdy `state <> 'closed'`;
//   • `czytajWyzwalacze()` bierze `event_kind, event_at` i rozpoznaje
//     DOKŁADNIE dwie wartości: `'deselekcja'` i `'zmiana_klubu_pozycji_poziomu'`.
// Skrót albo literówka w którejkolwiek z tych nazw NIE RZUCI BŁĘDEM —
// po cichu rozjedzie dopasowanie. Dlatego stoją tu jako stałe, są sprawdzane
// selftestem i dodatkowo zamknięte CHECK-iem w bazie
// (`exit_mode_event_kind_check`, migracja PLAN-D-H z 12.08.2026).

/** Wartości `exit_mode.event_kind` rozpoznawane przez czytnik arbitra. */
export const ZDARZENIE_DESELEKCJA = 'deselekcja';
export const ZDARZENIE_ZMIANA = 'zmiana_klubu_pozycji_poziomu';

export type RodzajZdarzenia =
  | typeof ZDARZENIE_DESELEKCJA
  | typeof ZDARZENIE_ZMIANA;

/** Zamknięty zbiór — jeden do jednego z czytnikiem i z CHECK-iem w bazie. */
export const RODZAJE_ZDARZEN: readonly RodzajZdarzenia[] = [
  ZDARZENIE_DESELEKCJA,
  ZDARZENIE_ZMIANA,
];

/**
 * Wartości `exit_mode.state` dopuszczone przez CHECK w bazie.
 *
 * ⚠️ `paused_decision` (reguła P5, „czekam na decyzję") JEST w CHECK-u bazy,
 * ale APPKA GO NIE ZAPISUJE i ta runda go nie buduje. Powód jest konkretny,
 * nie estetyczny: czytnik arbitra uznaje za aktywną ścieżkę KAŻDY otwarty
 * wiersz o `state <> 'closed'` — więc wiersz `paused_decision` wyciszyłby
 * produkt w całości (priorytet 0), a spec 6.4 chce dla tego stanu czegoś
 * zupełnie innego (skrócony horyzont Bloku, przełączona Mapa, liczba
 * systemowa — ale NIE ciszy). Zapisanie go dziś dałoby zawodnikowi
 * „czekam na decyzję", które w praktyce znaczy „produkt zamilkł".
 * Pilnuje tego selftest.
 */
export const STAN_AKTYWNA = 'active';
export const STAN_ZAMKNIETA = 'closed';

/** Wiersz `exit_mode` w kształcie, w jakim wraca z Supabase. */
export type WierszWyjscia = {
  id: string;
  state: string;
  event_kind: string | null;
  event_at: string | null;
  opened_at: string;
  closed_at: string | null;
};

/** Kolumny do `select()` — jedno miejsce, żeby ekran nie zgadywał nazw. */
export const KOLUMNY_WYJSCIA = 'id,state,event_kind,event_at,opened_at,closed_at';

/**
 * Stan ścieżki wyjścia dla ekranu.
 *
 * ⚠️ TRZY STANY, KTÓRYCH NIE WOLNO SKLEIĆ (reguła R5). `nie_wiem` (odczyt się
 * nie udał) i `wylaczona` (odczyt się udał i nie ma otwartego wiersza) to dwie
 * różne rzeczy. Sklejenie ich znaczyłoby, że zawodnikowi w ścieżce wyjścia
 * pokazujemy przycisk „Włącz" przy chwilowym braku sieci — czyli podpowiadamy
 * mu, że nic się nie stało.
 */
export type StanSciezki =
  | { rodzaj: 'nie_wiem'; powod: string }
  | { rodzaj: 'wylaczona' }
  | {
    rodzaj: 'wlaczona';
    id: string;
    otwartaOd: string;
    zdarzenie: RodzajZdarzenia | null;
    /** `true`, gdy baza zwróciła `state` spoza znanych — do logu, nie na ekran. */
    nieznanyStan?: string;
  };

/**
 * Wiersz z bazy → stan ekranu.
 *
 * @param wiersz otwarty wiersz `exit_mode` (`closed_at IS NULL`) albo `null`
 * @param bladOdczytu komunikat błędu, gdy zapytanie padło; inaczej `null`
 */
export function stanSciezki(
  wiersz: WierszWyjscia | null,
  bladOdczytu: string | null = null,
): StanSciezki {
  if (bladOdczytu) {
    return { rodzaj: 'nie_wiem', powod: `nie odczytałem ścieżki wyjścia: ${bladOdczytu}` };
  }
  if (!wiersz) return { rodzaj: 'wylaczona' };
  // Wiersz z wypełnionym `closed_at` nie jest otwarty. Zapytanie filtruje po
  // `is('closed_at', null)`, ale ta funkcja nie ma prawa na to liczyć: gdyby
  // filtr kiedyś wypadł z zapytania, ekran pokazałby zamkniętą ścieżkę jako
  // trwającą i zawodnik zobaczyłby „Twoja sytuacja się zmieniła" po powrocie.
  if (wiersz.closed_at) return { rodzaj: 'wylaczona' };
  if (wiersz.state === STAN_ZAMKNIETA) return { rodzaj: 'wylaczona' };

  const zdarzenie = (RODZAJE_ZDARZEN as readonly string[]).includes(wiersz.event_kind ?? '')
    ? (wiersz.event_kind as RodzajZdarzenia)
    : null;

  const stan: StanSciezki = {
    rodzaj: 'wlaczona',
    id: wiersz.id,
    otwartaOd: wiersz.opened_at,
    zdarzenie,
  };
  if (wiersz.state !== STAN_AKTYWNA) stan.nieznanyStan = wiersz.state;
  return stan;
}

/**
 * Wiersz do INSERT-u przy włączaniu ścieżki.
 *
 * ⚠️ `closed_at` NIE JEST tu ustawiane i nie wolno go tu dołożyć — wiersz
 * powstaje otwarty. `event_at` idzie razem z rodzajem zdarzenia, bo czytnik
 * wyzwalaczy Kompasu filtruje po `event_at` w oknie tygodnia; zdarzenie bez
 * daty byłoby zdarzeniem, którego nikt nigdy nie zobaczy.
 */
export function wierszWlaczenia(params: {
  userId: string;
  rodzaj: RodzajZdarzenia | null;
  teraz: Date;
}): {
    user_id: string;
    state: string;
    event_kind: RodzajZdarzenia | null;
    event_at: string | null;
    opened_at: string;
  } {
  const iso = params.teraz.toISOString();
  return {
    user_id: params.userId,
    state: STAN_AKTYWNA,
    event_kind: params.rodzaj,
    event_at: params.rodzaj ? iso : null,
    opened_at: iso,
  };
}

/**
 * Patch do UPDATE-u przy wyłączaniu ścieżki. Bez parametrów poza czasem —
 * wyłączenie nie może o nic pytać ani od niczego zależeć.
 */
export function patchWylaczenia(teraz: Date): { state: string; closed_at: string } {
  return { state: STAN_ZAMKNIETA, closed_at: teraz.toISOString() };
}

// ─────────────────────────────────────────────────────────────────────
// TREŚĆ — ⚠️ DO PRZEJRZENIA PRZEZ KUBĘ (brzmienia widoczne dla zawodnika)
// ─────────────────────────────────────────────────────────────────────
// Reguły, które te teksty spełniają i które selftest sprawdza:
//   • zakaz 8 — nigdzie nie pada „a jeśli się nie uda" ani żaden cel zapasowy;
//   • zero pytania „dlaczego";
//   • zero pocieszenia; zamiast niego liczba systemowa (spec 2.3);
//   • zero obietnicy, że ktoś to przeczyta (R2a);
//   • po włączeniu produkt mówi wprost, że o nic nie poprosi.

export const WYJSCIE_WEJSCIE_LABEL = 'Zmieniła się moja sytuacja w klubie';
export const WYJSCIE_WEJSCIE_PODPIS =
  'Wyłącza przypomnienia, liczniki i porównania. Możesz to cofnąć w każdej chwili.';

export const WYJSCIE_TYTUL = 'Zmieniła się Twoja sytuacja';

/** Co dokładnie się zmieni — pokazywane PRZED włączeniem, nie po. */
export const WYJSCIE_CO_SIE_ZMIENI: readonly string[] = [
  'Znikają wszystkie przypomnienia o treningu.',
  'Znikają liczniki postępu i porównania.',
  'Aplikacja przestaje wysyłać powiadomienia.',
  'Twoje dane zostają nietknięte — nic nie jest kasowane i możesz do nich wrócić.',
  'Możesz to wyłączyć jednym dotknięciem, kiedy zechcesz.',
];

export const WYJSCIE_PYTANIE_ZDARZENIE = 'Co się stało?';
export const WYJSCIE_PYTANIE_PODPIS =
  'To pytanie jest po to, żeby aplikacja wiedziała, czego Ci nie pokazywać. Nie musisz odpowiadać.';

/**
 * Trzy gotowe odpowiedzi zamiast pustego pola (reguła P4). Trzecia jest
 * pełnoprawna i nie jest gorsza od pozostałych — puste pole u nastolatka
 * nie jest zaproszeniem, a wymuszona odpowiedź jest tłumaczeniem się.
 */
export const WYJSCIE_ODPOWIEDZI: readonly { rodzaj: RodzajZdarzenia | null; label: string }[] = [
  { rodzaj: ZDARZENIE_DESELEKCJA, label: 'Odpadłem albo nie dostałem miejsca' },
  { rodzaj: ZDARZENIE_ZMIANA, label: 'Zmieniłem klub, pozycję albo poziom' },
  { rodzaj: null, label: 'Nie chcę tego nazywać' },
];

export const WYJSCIE_POTWIERDZENIE = 'Włącz';
export const WYJSCIE_NIE_TERAZ = 'Nie teraz';

/** Ekran stanu włączonego. Bez zadania, bez licznika, bez prośby. */
export const WYJSCIE_WLACZONA_TYTUL = 'Aplikacja o nic nie prosi';
export const WYJSCIE_WLACZONA_TRESC =
  'Przypomnienia, liczniki i porównania są wyłączone. Twoje dane są na miejscu — nic nie zostało skasowane.';

/** Liczby systemowe — te same trzy co w wariancie Mapy po deselekcji, bez komentarza. */
export const WYJSCIE_LICZBY: readonly string[] = [
  'W akademiach wymienia się od jednej czwartej do dwóch piątych składu rocznie. Mniej niż połowa zawodników jest w tym samym miejscu po trzech latach.',
  '68% tych, którzy podpisali kontrakt zawodowy, trafiło do akademii po dwunastym roku życia.',
  '14–24% reprezentantów seniorskich nigdy nie było w kadrze młodzieżowej.',
];

export const WYJSCIE_WYLACZ = 'Wyłącz ten tryb';
export const WYJSCIE_WYLACZ_PODPIS =
  'Wraca wszystko, co było przedtem. Możesz włączyć to ponownie, kiedy zechcesz.';

/** Odczyt się nie udał — mówimy to wprost, zamiast pokazywać stan wyłączony. */
export const WYJSCIE_NIE_WIEM =
  'Nie udało się sprawdzić, czy ten tryb jest włączony. Spróbuj jeszcze raz — nic się przez to nie zmieniło.';

/**
 * Jedna rzecz do zrobienia jutro w tym stanie (zakaz 17: żadna treść nie
 * kończy się na wiedzy). Ta sama, co w wariancie `after_deselection` Mapy —
 * jedyna, która nie wymaga klubu, trenera ani niczyjej zgody.
 */
export const WYJSCIE_NA_JUTRO =
  'Zagraj. Gdziekolwiek, z kimkolwiek, bez wyniku. Nie po to, żeby wrócić do formy — po to, żeby nie przestać.';
