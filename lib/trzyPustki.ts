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

/**
 * Powody, dla których lista może być pusta. Nigdy dwa naraz.
 *
 * ⭐ PLAN-D-C3 15.08.2026 — DOSZEDŁ CZWARTY I JEST NAJWAŻNIEJSZY Z CZTERECH.
 * Uzasadnienie dołożenia (wymagane przez polecenie C3.2) stoi przy
 * `PUSTKA_BLAD_ODCZYTU_TEKST`.
 */
export type RodzajPustki =
  /**
   * ⭐ Odczyt PADŁ. Nie wiemy, czy jest pusto — i nie wolno nam zgadywać.
   * To jedyny rodzaj, który NIE JEST zdaniem o zawodniku.
   */
  | 'blad_odczytu'
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
  /**
   * Jedno wyjście. Każda pustka ma inne — pustka bez wyjścia jest ślepym zaułkiem.
   * ⚠️ Wolno mu być pusty WYŁĄCZNIE wtedy, gdy `krokWTekscie === true`.
   */
  cta: string;
  /**
   * ⭐ PLAN-D-C3 15.08.2026 — `true`, gdy ekran BIERZE NA SIEBIE następny krok:
   * albo siedzi on już w jego zdaniu („…dodaj pierwszy powyżej", „Materiały
   * otwierają się, gdy…"), albo ten stan kroku nie wymaga („Nic do sprawdzenia
   * w tej chwili." — nie ma czego zrobić i to jest prawda, nie ślepy zaułek).
   *
   * Bez tego pola ekran musiałby albo dublować krok pod zdaniem, albo pas
   * musiałby przepisać brzmienie zatwierdzone przez Kubę — a tego zakazuje
   * punkt 5.4 polecenia C3.
   *
   * ⛔ `blad_odczytu` NIGDY nie ma tu `true`. To jedyny rodzaj, w którym
   * zawodnik ZAWSZE ma co zrobić — i zostawienie go bez wyjścia byłoby
   * dokładnie tym ślepym zaułkiem, przed którym stoi cały ten plik.
   */
  krokWTekscie: boolean;
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

// ═════════════════════════════════════════════════════════════════════
// ⭐ CZWARTY RODZAJ — PLAN-D-C3, 15.08.2026
// ═════════════════════════════════════════════════════════════════════
//
// ── DLACZEGO TRZY RODZAJE NIE WYSTARCZYŁY (odpowiedź na C3.2) ────────
//
// Wszystkie trzy istniejące rodzaje zakładają, że ODCZYT SIĘ UDAŁ. Widać to
// wprost w `WejsciePustki`: pierwsze pole nazywa się `maWpisy: boolean` —
// dwuwartościowe. Nie ma w nim miejsca na „nie wiem, czy ma wpisy".
//
// Zmierzone 15.08.2026 na siedmiu ekranach pasa C3: **25 ścieżek odczytu,
// z czego 15 po nieudanym odczycie renderuje zawodnikowi coś, co on przeczyta
// jako fakt o sobie.** Ani jednej z tych 15 nie da się opisać istniejącymi
// trzema rodzajami:
//
//   • `brak_danych`      — twierdzi, że sprawdziliśmy i nie ma. Nie sprawdziliśmy.
//   • `brak_uprawnien`   — twierdzi, że wiemy, iż dostęp wygasł. Nie wiemy.
//   • `brak_konfiguracji`— twierdzi, że wiemy, czego nam brakuje. Nie wiemy.
//
// EKRAN, KTÓRY SIĘ NIE MIEŚCI, Z NAZWY: `app/(tabs)/biblioteka.tsx`. Odczyt
// `goals` przechodził przez `goalsRes.data ?? []`, więc odmowa RLS dawała zero
// segmentów, a zawodnik z założonym wąskim gardłem czytał `LIBRARY_EMPTY_TEXT`
// — „Nic tu jeszcze nie ma" — czyli zdanie z rodzaju `brak_danych` postawione
// dokładnie wtedy, gdy `brak_danych` NIE ZACHODZI.
//
// ── CO ZAWODNIK MA ZROBIĆ PO ZOBACZENIU TEJ PUSTKI (warunek z C3.2) ──
// Sprawdzić jeszcze raz. Sześć z siedmiu ekranów ma `RefreshControl`, więc
// wyjściem jest pociągnięcie w dół. `diagnoza.tsx` go NIE MA (zmierzone
// 15.08.2026: `<ScrollView contentContainerStyle={styles.scrollContent}>`,
// bez `refreshControl`) — i odświeża się przez `useFocusEffect`, więc jego
// wyjściem jest ponowne wejście na ekran. Stąd DWA wyjścia, nie jedno.
//
// ⚠️ To NIE jest pustka bez następnego kroku. Pustka bez kroku jest ślepym
// zaułkiem i tego rodzaju nie wolno było dokładać.
//
// ⚠️ BRZMIENIA PONIŻEJ SĄ NOWE I NIE PRZESZŁY PRZEZ KUBĘ.
// Komplet nowych zdań tej rundy stoi w jednym miejscu w
// `claude/PRZEKAZANIE_PAS_C3_15_08_2026.md`, sekcja „NOWE BRZMIENIA".

/** Co do znaku z polecenia C3, sekcja C3.3 („błąd odczytu → «Nie udało się sprawdzić.»"). */
export const PUSTKA_BLAD_ODCZYTU_TEKST = 'Nie udało się sprawdzić.';

/** Sześć ekranów z `RefreshControl`. */
export const PUSTKA_BLAD_ODCZYTU_CTA = 'Pociągnij w dół, żeby sprawdzić jeszcze raz.';

/** `diagnoza.tsx` — jedyny z siedmiu bez `RefreshControl`, odświeża się na wejściu. */
export const PUSTKA_BLAD_ODCZYTU_CTA_BEZ_ODSWIEZANIA = 'Wejdź tu jeszcze raz za chwilę.';

/** Znacznik dla Kuby i dla strażnika — brzmienia czwartego rodzaju. */
export const BRZMIENIE_DO_PRZEJRZENIA_C3 = 'DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-C3, 15.08.2026)';

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

  // ── ⭐ PLAN-D-C3 15.08.2026 ────────────────────────────────────────
  /**
   * Czy odczyt, z którego wzięła się ta lista, PRZESZEDŁ.
   *
   * ⚠️ Trzy wartości, nie dwie — ten sam kształt co `moznaZapisywac`:
   *   `false`               → odczyt padł, mówimy „Nie udało się sprawdzić.";
   *   `true`                → odczyt przeszedł, lista naprawdę jest pusta;
   *   `null` / pominięte    → ekran nie powiedział, więc NIE ZGADUJEMY i
   *                           zachowujemy się dokładnie jak przed tym pasem.
   *
   * Ostatni wariant jest tym, co czyni to pole wstecznie zgodnym: `dzis.tsx`
   * i `kalendarz.tsx` wołają `rozpoznajPustke` bez niego i mają dostać to samo
   * co dotąd, co do znaku.
   */
  odczytUdanySie?: boolean | null;
  /**
   * Czy ekran da się odświeżyć pociągnięciem w dół. Rozstrzyga WYJŚCIE
   * z pustki `blad_odczytu`, nie jej treść. Pominięte = `true` (sześć z siedmiu
   * ekranów C3 ma `RefreshControl`; wyjątkiem jest `diagnoza.tsx`).
   */
  daSieOdswiezyc?: boolean;
  /**
   * ⭐ Zdanie „pusto" właściwe dla TEGO ekranu.
   *
   * Istnieje po to, żeby pas C3 mógł przepuścić siedem ekranów przez jedną
   * funkcję decyzyjną, NIE DOTYKAJĄC brzmień, które już przeszły przez Kubę
   * (zakaz 4 polecenia C3). Bez tego pola `rozpoznajPustke` odpowiadałaby
   * bibliotece zdaniem o tygodniu w kalendarzu.
   *
   * Pominięte → brzmienie z makiety widoku tygodnia, jak dotąd.
   */
  tekstBrakuDanych?: string;
  /**
   * Wyjście dla własnego zdania ekranu. Pominięte → `krokWTekscie: true`,
   * czyli „następny krok siedzi już w tym zdaniu".
   * ⚠️ Podanie własnego zdania BEZ wyjścia i BEZ kroku w zdaniu jest błędem,
   * który zapala strażnik — patrz `lib/trzyPustki.selftest.ts`, sekcja 7.
   */
  ctaBrakuDanych?: string;
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
 *   0. ⭐ BŁĄD ODCZYTU — bo to jedyny stan, w którym NIE MAMY ŻADNEJ WIEDZY
 *      o zawodniku, a każdy z trzech pozostałych rodzajów jakąś wiedzę
 *      twierdzi. Postawienie któregokolwiek z nich po nieudanym odczycie jest
 *      podaniem prawdopodobnego jako pewnego — czyli złamaniem Z0.
 *      ⚠️ W szczególności bije BRAK UPRAWNIEŃ, choć ten jest niżej „ważny":
 *      `moznaZapisywac === false` mówi o ZAPISIE, a tu nie udał się ODCZYT.
 *      Powiedzenie „skończył Ci się okres próbny" komuś, komu po prostu
 *      urwało się połączenie, to ten sam błąd, przed którym stoi reguła R3
 *      strażnika (fail-open), tylko wejściem od drugiej strony.
 *   1. BRAK UPRAWNIEŃ — bo to jedyny stan, w którym problem leży PO NASZEJ
 *      STRONIE i zawodnik nie ma jak sam go rozwiązać przez dodanie wpisu.
 *      Powiedzenie mu „dodaj trening", gdy baza i tak odrzuci zapis, wysyła
 *      go w ślepy zaułek.
 *   2. BRAK KONFIGURACJI — pustka jest MYLĄCA, choć prawdziwa.
 *   3. BRAK DANYCH — pustka jest prawdziwa i niemyląca.
 *
 * ⚠️ `maWpisy` NADAL STOI PRZED WSZYSTKIM. Ekran, który ma co pokazać, ma to
 * pokazać — także wtedy, gdy odświeżenie padło. Lista sprzed chwili jest
 * prawdziwsza niż komunikat o błędzie zamiast niej.
 */
export function rozpoznajPustke(w: WejsciePustki): Pustka | null {
  if (w.maWpisy) return null;

  // ⭐ PLAN-D-C3 15.08.2026 — czwarty rodzaj, pierwszy w kolejności.
  if (w.odczytUdanySie === false) {
    return {
      rodzaj: 'blad_odczytu',
      tekst: PUSTKA_BLAD_ODCZYTU_TEKST,
      cta: w.daSieOdswiezyc === false
        ? PUSTKA_BLAD_ODCZYTU_CTA_BEZ_ODSWIEZANIA
        : PUSTKA_BLAD_ODCZYTU_CTA,
      krokWTekscie: false,
      // ⚠️ Jawnie `true` i to jest cała różnica wobec `brak_konfiguracji`:
      // ta gałąź jest osiągalna DZIŚ, na siedmiu ekranach, 16 ścieżkami.
      osiagalne: true,
    };
  }

  if (w.moznaZapisywac === false) {
    return {
      rodzaj: 'brak_uprawnien',
      tekst: PUSTKA_BRAK_UPRAWNIEN_TEKST,
      cta: PUSTKA_BRAK_UPRAWNIEN_CTA,
      krokWTekscie: false,
      osiagalne: true,
    };
  }

  if (w.planLekcjiZnany === false) {
    return {
      rodzaj: 'brak_konfiguracji',
      tekst: PUSTKA_BRAK_KONFIGURACJI_TEKST,
      cta: PUSTKA_BRAK_KONFIGURACJI_CTA,
      krokWTekscie: false,
      // ⚠️ Jawnie `false` — patrz POWOD_NIEOSIAGALNOSCI. Ekran, który tę
      // gałąź dostanie, ma prawo o tym wiedzieć.
      osiagalne: false,
    };
  }

  // ⭐ PLAN-D-C3 — ekran może podać SWOJE zdanie „pusto". Brzmienia
  // zatwierdzone przez Kubę zostają na swoich ekranach co do znaku; zmienia
  // się wyłącznie to, że przechodzą przez tę funkcję.
  if (typeof w.tekstBrakuDanych === 'string' && w.tekstBrakuDanych.length > 0) {
    const wlasneCta = w.ctaBrakuDanych ?? '';
    return {
      rodzaj: 'brak_danych',
      tekst: w.tekstBrakuDanych,
      cta: wlasneCta,
      krokWTekscie: wlasneCta.length === 0,
      osiagalne: true,
    };
  }

  return {
    rodzaj: 'brak_danych',
    tekst: tekstBrakuDanych(w.zakres),
    cta: PUSTKA_BRAK_DANYCH_CTA,
    krokWTekscie: false,
    osiagalne: true,
  };
}

/** Zdanie do konsoli — żeby dało się odpowiedzieć, czemu ekran był wtedy pusty. */
export function opisPustkiDoLogu(p: Pustka | null): string {
  if (!p) return 'pustka: lista NIE jest pusta';
  return `pustka: ${p.rodzaj}${p.osiagalne ? '' : ' (GAŁĄŹ NIEOSIĄGALNA — ' + POWOD_NIEOSIAGALNOSCI + ')'}`;
}

/**
 * ⭐ PLAN-D-C3 15.08.2026 — „+ log z powodem" z kształtu wymaganego przez
 * polecenie C3.3. Bez tego czwarty rodzaj byłby ładniejszym milczeniem:
 * zawodnik czyta „Nie udało się sprawdzić.", a NIKT nie wie dlaczego.
 *
 * ⚠️ Powód idzie WYŁĄCZNIE do konsoli. Zawodnik nigdy nie czyta komunikatu
 * bazy — to nie jest jego problem i nie jest w żadnym z trzech rejestrów Z0.
 */
export function opisBleduOdczytuDoLogu(gdzie: string, powod: unknown): string {
  const tresc =
    powod && typeof powod === 'object' && 'message' in powod
      ? String((powod as { message: unknown }).message)
      : String(powod ?? 'bez powodu');
  return `[trzyPustki] ${gdzie}: ODCZYT PADŁ — ${tresc}. `
    + `Zawodnik widzi „${PUSTKA_BLAD_ODCZYTU_TEKST}", NIE zdanie o sobie.`;
}
