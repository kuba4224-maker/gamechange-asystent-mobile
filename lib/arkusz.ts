// PLAN-D-A1 08.2026 (18.08.2026) — NOWY PLIK. ARKUSZ JAKO WZORZEC NAWIGACJI.
//
// ═════════════════════════════════════════════════════════════════════
// PO CO TO ISTNIEJE
// ═════════════════════════════════════════════════════════════════════
// Do 18.08.2026 produkt nawigował WYŁĄCZNIE trasami: żeby cokolwiek zrobić,
// zawodnik opuszczał ekran. Skutek zmierzony na „Dziś" (pas O1, miara
// `lib/wysokoscEkranu.ts`): pytanie „ZROBIŁEŚ?" i cztery kroki oceny stały
// WEWNĄTRZ karty kalendarza, czyli 4 663 dp pod górną krawędzią ekranu —
// pięć i pół ekranu przewijania. Silnik oceny był gotowy i podłączony,
// a mimo to `session_verdicts` miało 1 wiersz w całej bazie.
//
// Makieta v3 rozstrzyga to inaczej: rzecz, którą się ROBI, otwiera się
// NAKŁADKĄ nad ekranem, a nie zabiera z ekranu. Ten moduł trzyma to, co
// w nakładce jest DECYZJĄ (jakie są rodzaje arkuszy i co każdy z nich mówi
// w nagłówku); `components/Arkusz.tsx` trzyma to, co jest RYSOWANIEM.
//
// ⛔ CZEGO TU NIE MA I NIE BĘDZIE: ani jednego `import` z `react-native`.
// Ten plik ma się dać uruchomić w strażniku bez Reacta — i o to chodzi.

/**
 * ⭐ WYSOKOŚĆ CIEMNEGO NAGŁÓWKA ARKUSZA. Liczba jest z makiety v3
 * (`shead`, blok „nagłówek arkusza", 92 dp) i stoi tutaj RAZ, żeby nie
 * rozjechała się między komponentem a strażnikiem.
 */
export const WYSOKOSC_NAGLOWKA_ARKUSZA_DP = 92;

/** Napis zamknięcia. ⛔ Jedno słowo, ten sam w każdym arkuszu (makieta: `sk`). */
export const ARKUSZ_ZAMKNIJ = 'zamknij';

/**
 * ⭐ RODZAJE ARKUSZY. ⛔ Lista jest ZAMKNIĘTA i pilnuje jej strażnik: arkusz
 * bez wiersza w tabeli brzmień nie ma jak się narysować, a arkusz w tabeli
 * bez wejścia z ekranu jest martwym kodem. Obie strony są sprawdzane.
 */
export type RodzajArkusza =
  | 'ocena'        // ocena jednej rzeczy z planu — sedno ekranu „Dziś" (A2)
  | 'oceny'        // wszystkie rzeczy bez oceny naraz („wczoraj bez oceny")
  | 'meczWiecej'   // ⭐ decyzja Kuby 18.08: reszta pytań o mecz (M1 §3)
  | 'plus'         // ścieżka „+" — co dodajesz (A5)
  | 'kolizja';     // „+" z datą, która minęła → najpierw nieocenione (A5)

export const RODZAJE_ARKUSZA: readonly RodzajArkusza[] =
  ['ocena', 'oceny', 'meczWiecej', 'plus', 'kolizja'] as const;

export type NaglowekArkusza = {
  /** Lewy górny napis — dokąd wraca zamknięcie. */
  kicker: string;
  /** Tytuł arkusza. */
  tytul: string;
  /** Jedno zdanie pod tytułem. Pusty napis = nie rysujemy nic. */
  podpis: string;
};

/**
 * ⭐ BRZMIENIA NAGŁÓWKÓW — jedno miejsce, pięć wierszy.
 *
 * ⛔ ZERO NOWYCH SŁÓW O PRACY ZAWODNIKA. Te zdania mówią WYŁĄCZNIE, gdzie
 * zawodnik jest i jak stąd wyjść. Ani jedno nie ocenia, nie liczy dni
 * z rzędu (N1, N3) i nie porównuje go z nikim.
 *
 * @param tytulRzeczy nazwa rzeczy, której arkusz dotyczy (kafel, mecz).
 *   ⛔ Pusty napis jest DOZWOLONY i wtedy tytuł jest ogólny — nie zmyślamy
 *   nazwy, której nie mamy (Z0).
 */
export function naglowekArkusza(rodzaj: RodzajArkusza, tytulRzeczy = ''): NaglowekArkusza {
  const nazwa = tytulRzeczy.trim();
  switch (rodzaj) {
    case 'ocena':
      return {
        kicker: 'Dziś',
        tytul: nazwa === '' ? 'Jak poszło?' : nazwa,
        podpis: 'Ta rzecz już minęła. Powiedz, jak było — albo wyjdź bez odpowiedzi.',
      };
    case 'oceny':
      return {
        kicker: 'Dziś',
        tytul: 'Rzeczy bez oceny',
        podpis: 'Odpowiadasz na tyle, na ile chcesz. Nic tu nie przepada.',
      };
    case 'meczWiecej':
      return {
        kicker: nazwa === '' ? 'Dziś' : nazwa,
        tytul: 'Powiedz więcej o tym meczu',
        podpis: 'Sześć rzeczy, których nie ma w ocenie. Żadna nie jest obowiązkowa.',
      };
    case 'plus':
      return {
        kicker: 'Dziś',
        tytul: 'Co dodajesz?',
        podpis: 'Mecz jest jednym z rodzajów — nie ma dla niego osobnego miejsca.',
      };
    case 'kolizja':
      return {
        kicker: 'Dziś',
        tytul: 'Zanim dodamy',
        podpis: 'Ten dzień już minął — sprawdzamy, czy to nie stało już w planie.',
      };
  }
}
