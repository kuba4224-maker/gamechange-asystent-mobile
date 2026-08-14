// PLAN-D-T 08.2026 (14.08.2026) — NOWY PLIK. ZADANIE T6, ROZSZERZONE
// PRZEZ SESJĘ NAWIGUJĄCĄ: JEDEN KOMUNIKAT → TRZY PUSTKI.
//
// ═════════════════════════════════════════════════════════════════════
// ── DEFEKT, KTÓRY TEN PLIK ZAMYKA ────────────────────────────────────
//
// Dziś appka ZLEWA TRZY RÓŻNE SYTUACJE W JEDEN PUSTY EKRAN:
//
//   1. zawodnik naprawdę nic nie zaplanował,
//   2. zawodnik zaplanował, ale produkt nie zna jego planu lekcji, więc
//      cały tydzień wygląda na wolny,
//   3. zawodnikowi WYGASŁ DOSTĘP — baza odrzuca zapis, a on widzi
//      „Brak zaplanowanych wydarzeń" i nie ma jak się dowiedzieć,
//      że coś jest nie tak.
//
// Trzeci przypadek jest najgorszy: produkt milczy o tym, że przestał
// przyjmować pracę zawodnika, i podaje to jako jego pustkę. To jest to samo,
// co pas K naprawił w Dzienniku (surowy błąd RLS zamiast zdania), tylko
// o jeden poziom wcześniej — zanim zawodnik w ogóle spróbuje coś zapisać.
//
// ── REGUŁA R5, TRZECI RAZ W TYM PRODUKCIE ────────────────────────────
// „Nie ma danych" i „nie umiem tego sprawdzić" to dwie różne rzeczy — tak
// samo jak w `lib/componentHints.ts` („nie ma tabeli" ≠ „pusto") i w
// `lib/ograniczenia.ts` („nie obowiązuje" ≠ „nie wiem"). Tutaj stany są trzy,
// bo doszedł trzeci powód pustki: BRAK UPRAWNIEŃ.
//
// ── BRZMIENIA ────────────────────────────────────────────────────────
// Wszystkie trzy pochodzą CO DO ZNAKU z `claude/MAKIETA_WIDOK_TYGODNIA.html`
// (kolumna 3, „Trzy różne pustki"). Nie są moje i nie zmieniam ich.
//
// ⚠️ CZEGO TEN PLIK NIE ROBI — I TO JEST WAŻNE:
// ⛔ NIE BUDUJE WIDOKU TYGODNIA. ⛔ NIE BUDUJE PLANU LEKCJI.
// Obie rzeczy mają własne pasy (C1 i A3 w `claude/ZASADA_PODANIA_I_PLAN_14_08_2026.md`).
// Ten plik buduje wyłącznie ROZRÓŻNIENIE — czystą funkcję z trzema wyjściami,
// gotową do podpięcia w dniu, w którym te pasy dostarczą jej wejścia.
// ═════════════════════════════════════════════════════════════════════

/** Trzy powody, dla których lista może być pusta. Nigdy dwa. */
export type RodzajPustki =
  /** Zapytanie przeszło, uprawnienia są, konfiguracja jest — po prostu nic nie ma. */
  | 'brak_danych'
  /** Produkt nie zna czegoś, bez czego pustka jest MYLĄCA (dziś: plan lekcji). */
  | 'brak_konfiguracji'
  /** Baza nie przyjmie nowego zapisu. Zawodnik widzi swoje dane, ale nie dołoży nowych. */
  | 'brak_uprawnien';

export type Pustka = {
  rodzaj: RodzajPustki;
  /** Zdanie dla zawodnika. Mówi, CO SIĘ DZIEJE — nie „brak wydarzeń". */
  tekst: string;
  /** Jedno wyjście. Każda pustka ma inne — pustka bez wyjścia jest ślepym zaułkiem. */
  cta: string;
  /**
   * Czy ta gałąź da się dziś w ogóle osiągnąć.
   * ⚠️ `false` przy `brak_konfiguracji` — patrz `POWOD_NIEOSIAGALNOSCI`.
   */
  osiagalne: boolean;
};

// ─────────────────────────────────────────────────────────────────────
// BRZMIENIA — co do znaku z makiety widoku tygodnia (14.08.2026)
// ─────────────────────────────────────────────────────────────────────

export const PUSTKA_BRAK_DANYCH_TEKST = 'Nic nie masz zaplanowane w tym tygodniu.';
export const PUSTKA_BRAK_DANYCH_CTA = 'Dodaj trening';

export const PUSTKA_BRAK_KONFIGURACJI_TEKST =
  'Nie wiemy, kiedy masz szkołę — dlatego cały tydzień wygląda na wolny.';
export const PUSTKA_BRAK_KONFIGURACJI_CTA = 'Wpisz swój plan lekcji';

export const PUSTKA_BRAK_UPRAWNIEN_TEKST =
  'Twój okres próbny się skończył. Widzisz swój tydzień, ale nie możesz dodawać nowych rzeczy.';
export const PUSTKA_BRAK_UPRAWNIEN_CTA = 'Przedłuż dostęp';

/**
 * Warianty dzienne. Makieta mówi o TYGODNIU, a dwa dzisiejsze miejsca w appce
 * („Dziś w kalendarzu" i „Nadchodzące") mówią o krótszym zakresie — zdanie
 * o tygodniu byłoby tam po prostu nieprawdziwe.
 *
 * ⚠️ BRZMIENIA DO PRZEJRZENIA PRZEZ KUBĘ. Są przepisaniem zdania z makiety
 * na inny zakres czasu, nie nową treścią — ale to nadal jest zmiana słów,
 * które czyta zawodnik, więc decyzja należy do Kuby.
 */
export const PUSTKA_BRAK_DANYCH_TEKST_DZIS = 'Nic nie masz zaplanowane na dziś.';
export const PUSTKA_BRAK_DANYCH_TEKST_NADCHODZACE = 'Nic nie masz zaplanowane na najbliższe dni.';

/** Znacznik dla Kuby i dla strażnika. Nie usuwać do czasu zatwierdzenia brzmień dziennych. */
export const BRZMIENIE_DO_PRZEJRZENIA = 'DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-T, 14.08.2026)';

/**
 * ⚠️ DLACZEGO GAŁĄŹ „BRAK KONFIGURACJI" JEST DZIŚ NIEOSIĄGALNA.
 *
 * ZMIERZONE 14.08.2026 przez sesję nawigującą: w bazie NIE MA ANI JEDNEJ
 * tabeli pasującej do `%school%`, `%szkol%` ani `%lesson%`. Produkt nie ma
 * skąd wiedzieć, kiedy zawodnik ma szkołę — a więc nie ma też jak stwierdzić,
 * że tej wiedzy MU BRAKUJE.
 *
 * ⛔ TO NIE JEST POWÓD, ŻEBY GAŁĘZI NIE BYŁO. Jest odwrotnie: rozróżnienie
 * ma powstać RAZEM z resztą, żeby w dniu, w którym pas A3 doda plan lekcji,
 * nie trzeba było wracać do trzech ekranów i dokładać trzeciego stanu do
 * kodu, który przez pół roku znał dwa. Wejście jest gotowe, przesłanka
 * przyjdzie.
 *
 * ⚠️ ORAZ: to jest ŚWIADOMA, NAZWANA odwrotność tego, co pas T właśnie wyciął
 * z koperty ograniczeń (T5 — klucze bez przesłanki). Różnica jest jedna
 * i rozstrzygająca: TAM przesłanka ZNIKNĘŁA i nikt jej nie budował, TU
 * przesłanka MA WŁASNY PAS z numerem i miejscem w kolejności (A3). Gdyby pas
 * A3 wypadł z planu, ta gałąź ma zniknąć razem z nim — pilnuje tego asercja
 * w `lib/trzyPustki.selftest.ts`, nie ten komentarz.
 */
export const POWOD_NIEOSIAGALNOSCI =
  'Gałąź „brak konfiguracji" jest dziś NIEOSIĄGALNA: 14.08.2026 zmierzono, że w bazie nie ma '
  + 'żadnej tabeli %school% / %szkol% / %lesson%, więc `planLekcjiZnany` jest zawsze `null`. '
  + 'Włącza ją pas A3 (plan lekcji zawodnika) z claude/ZASADA_PODANIA_I_PLAN_14_08_2026.md.';

export type WejsciePustki = {
  /** Czy lista, którą ekran właśnie rysuje, ma cokolwiek. */
  maWpisy: boolean;
  /**
   * Czy produkt zna plan lekcji zawodnika.
   * ⚠️ `null` znaczy „nie ma czego znać" — dziś ZAWSZE `null`, patrz
   * `POWOD_NIEOSIAGALNOSCI`. `false` (wie, że nie zna) włączy pas A3.
   */
  planLekcjiZnany: boolean | null;
  /**
   * Czy zawodnik może dziś cokolwiek zapisać.
   * ⚠️ `null` znaczy „nie odczytałem stanu dostępu" — i wtedy NIE MÓWIMY,
   * że dostępu nie ma. Fail-open, ten sam kierunek co przy ograniczeniach:
   * powiedzenie „skończył Ci się okres próbny" komuś, komu się nie skończył,
   * jest gorsze niż niepokazanie tego zdania.
   */
  moznaZapisywac: boolean | null;
  /** Zakres czasu, o którym mówi ta lista. Rozstrzyga brzmienie. */
  zakres?: 'dzis' | 'nadchodzace' | 'tydzien';
};

function tekstBrakuDanych(zakres: WejsciePustki['zakres']): string {
  if (zakres === 'dzis') return PUSTKA_BRAK_DANYCH_TEKST_DZIS;
  if (zakres === 'nadchodzace') return PUSTKA_BRAK_DANYCH_TEKST_NADCHODZACE;
  return PUSTKA_BRAK_DANYCH_TEKST;
}

/**
 * Rozstrzyga, KTÓRA to pustka. `null`, gdy lista nie jest pusta — wtedy nie
 * ma o czym mówić.
 *
 * KOLEJNOŚĆ PRIORYTETÓW I JEJ POWÓD:
 *   1. BRAK UPRAWNIEŃ — bo to jedyny stan, w którym problem leży PO NASZEJ
 *      STRONIE i zawodnik nie ma jak sam go rozwiązać przez dodanie wpisu.
 *      Powiedzenie mu „dodaj trening", gdy baza i tak odrzuci zapis, wysyła
 *      go w ślepy zaułek.
 *   2. BRAK KONFIGURACJI — pustka jest MYLĄCA, choć prawdziwa.
 *   3. BRAK DANYCH — pustka jest prawdziwa i niemyląca.
 */
export function rozpoznajPustke(w: WejsciePustki): Pustka | null {
  if (w.maWpisy) return null;

  if (w.moznaZapisywac === false) {
    return {
      rodzaj: 'brak_uprawnien',
      tekst: PUSTKA_BRAK_UPRAWNIEN_TEKST,
      cta: PUSTKA_BRAK_UPRAWNIEN_CTA,
      osiagalne: true,
    };
  }

  if (w.planLekcjiZnany === false) {
    return {
      rodzaj: 'brak_konfiguracji',
      tekst: PUSTKA_BRAK_KONFIGURACJI_TEKST,
      cta: PUSTKA_BRAK_KONFIGURACJI_CTA,
      // ⚠️ Jawnie `false` — patrz POWOD_NIEOSIAGALNOSCI. Ekran, który tę
      // gałąź dostanie, ma prawo o tym wiedzieć.
      osiagalne: false,
    };
  }

  return {
    rodzaj: 'brak_danych',
    tekst: tekstBrakuDanych(w.zakres),
    cta: PUSTKA_BRAK_DANYCH_CTA,
    osiagalne: true,
  };
}

/** Zdanie do konsoli — żeby dało się odpowiedzieć, czemu ekran był wtedy pusty. */
export function opisPustkiDoLogu(p: Pustka | null): string {
  if (!p) return 'pustka: lista NIE jest pusta';
  return `pustka: ${p.rodzaj}${p.osiagalne ? '' : ' (GAŁĄŹ NIEOSIĄGALNA — ' + POWOD_NIEOSIAGALNOSCI + ')'}`;
}
