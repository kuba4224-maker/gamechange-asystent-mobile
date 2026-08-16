// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-D2 08.2026 (15.08.2026) — „ZROBIŁEŚ?". PRODUKT WRESZCIE PYTA.
//
// Ten plik odpowiada na JEDNO pytanie: O CO PRODUKT MA DZIŚ ZAPYTAĆ ZAWODNIKA.
// Zero Reacta, zero Supabase, zero zegara — „dziś" wchodzi argumentem.
//
// ── ⛔ POMIAR, KTÓRY GO UZASADNIA (15.08.2026, produkcja) ────────────
//   `session_verdicts`                                    0 wierszy
//   `calendar_events` ze `status='completed'`             0 z 24
//   `daily_logs` z `calendar_event_id`                    0 z 10
//   `focus_block_checkins` odpowiedzianych                0 z 1
//   co zapisuje `app/(tabs)/kalendarz.tsx`   WYŁĄCZNIE `nie_odbylo_sie`
//   `CHECK` w bazie dopuszcza                 OBIE wartości werdyktu
//
// Zawodnik nie miał dziś jak powiedzieć, że coś ZROBIŁ. Mógł powiedzieć
// wyłącznie, że czegoś NIE zrobił — i przez cały czas istnienia produktu nie
// zrobił tego ani razu. Na tych zerach stoi arbiter, dorobek, odznaki
// i połowa wglądów.
//
// ── ⭐ DWIE DECYZJE KUBY, KTÓRE SĄ KSZTAŁTEM TEGO PLIKU ─────────────
// 1. PRODUKT PYTA SAM, na karcie „Dziś". Nie czeka, aż zawodnik wejdzie
//    do Kalendarza. Powód zmierzony: przycisk „Nie odbyłem" istnieje
//    w Kalendarzu od 14.08 i ma ZERO użyć.
// 2. ⛔ PYTA WYŁĄCZNIE O WCZORAJ I DZIŚ. Sesje starsze zostają bez
//    odpowiedzi NA ZAWSZE, a produkt mówi o nich wprost „nie wiem".
//    Powód: zawodnik wracający po tygodniu choroby ma dostać JEDNO pytanie,
//    nie dwanaście. Powrót po przerwie to najgorszy moment na listę zaległości.
//
//    ⭐ TA DECYZJA JEST TU MASZYNOWA, NIE DEKLARATYWNA. Okno ma dokładnie
//    dwie wartości (`wczoraj`, `dzis`) i nie ma w tym pliku ANI JEDNEJ
//    arytmetyki na dniach poza jednym wywołaniem `przesunDate(dzis, -1)`.
//    Nie da się stąd policzyć „ile dni z rzędu", „od ilu dni nie było wpisu"
//    ani „ile pytań zostało bez odpowiedzi" — bo nie ma z czego (N1).
//
// ── ⛔ CZEGO TU NIE MA I NIE PRZEZ PRZEOCZENIE ──────────────────────
// 1. ⛔ DRUGIEGO SILNIKA WERDYKTU. Reguła „co wiemy o tym wystąpieniu"
//    stoi w `lib/wykonanieSesji.ts` (pas D1) i ten plik JĄ WOŁA:
//    `akcjaDlaWystapienia` rozstrzyga, czy pytać, `werdyktDlaWystapienia` —
//    co zawodnik już odpowiedział. Drugi silnik rozjechałby się z pierwszym,
//    a każdy z osobna wyglądałby poprawnie.
// 2. ⛔ LICZBY PYTAŃ BEZ ODPOWIEDZI. Kształt wyniku jej nie niesie i nie da
//    się jej z niego odtworzyć poza oknem — bo to byłaby lista zaległości,
//    czyli dokładnie to, co decyzja 2 wyklucza.
// 3. ⛔ WNIOSKOWANIA Z UPŁYWU CZASU. Sesja sprzed trzech dni bez werdyktu
//    nie staje się „nieodbytą" i nie wraca jako pytanie. Zostaje bez
//    odpowiedzi i produkt mówi o niej „nie wiem" (Z0).
// ═══════════════════════════════════════════════════════════════════

import {
  akcjaDlaWystapienia,
  werdyktDlaWystapienia,
  kluczWystapienia,
  przesunDate,
  type WartoscWerdyktu,
  type WejscieWerdyktow,
  type WejscieWykonania,
} from './wykonanieSesji';

// ═══════════════════════════════════════════════════════════════════
// 1. WEJŚCIE — WYSTĄPIENIE, NIE WIERSZ
// ═══════════════════════════════════════════════════════════════════

/**
 * Jedno WYSTĄPIENIE z kalendarza. ⚠️ Nie wiersz: reguła cykliczna ma jeden
 * wiersz i wiele wystąpień, a kluczem jest para `(idWydarzenia, dzien)` —
 * dokładnie ta sama, co unikat `session_verdicts_jeden_na_wystapienie`
 * w bazie.
 */
export type WystapienieDoPytania = {
  idWydarzenia: number;
  /** `YYYY-MM-DD` — data TEGO wystąpienia. */
  dzien: string;
  /** Tytuł wpisany przez zawodnika. ⛔ NIGDY surowa wartość kolumny. */
  tytul: string;
  /**
   * Nazwa rodzaju, GOTOWA DO POKAZANIA, albo `null`.
   *
   * ⛔ TEN PLIK RODZAJU NIE ROZSTRZYGA i nie ma słownika rodzajów. Rozstrzyga
   * go `opiszRodzaj()` z `lib/meczWKalendarzu.ts` (pas A7), a nazwę podaje
   * ekran. `null` znaczy „appka nie zna tego rodzaju" — wtedy zdanie bierze
   * TYTUŁ, czyli napis zawodnika, a NIE surową wartość z bazy ani komunikat
   * diagnostyczny (R5, wzorzec pasa A7/F2).
   */
  nazwaRodzaju: string | null;
  /**
   * `HH:MM` albo `null`. ⛔ TEN PLIK GODZINY NIE FORMATUJE — robi to
   * `formatujGodzine()` z `lib/godzinaWydarzenia.ts`. `null` znaczy
   * „nie rysuj godziny", nigdy `''` i nigdy północ (WT-12, WG-06).
   */
  godzina: string | null;
  /** `calendar_events.status` tego wiersza. */
  status: string;
  /** Pozycja rozwinięta z reguły cyklicznej, a nie z własnej daty. */
  zRegulyCyklicznej: boolean;
};

export type WejsciePytan = {
  /** ⚠️ ARGUMENTEM, NIE Z ZEGARA — inaczej reguły nie da się sprawdzić dla dnia. */
  dzis: string;
  /** ⚠️ `null` = ODCZYT WYDARZEŃ SIĘ NIE UDAŁ, a nie „nic nie ma". */
  wystapienia: readonly WystapienieDoPytania[] | null;
  /** ⚠️ `null` = ODCZYT DZIENNIKA SIĘ NIE UDAŁ. */
  wpisyDziennika: ReadonlySet<number> | null;
  werdykty: WejscieWerdyktow;
};

// ═══════════════════════════════════════════════════════════════════
// 2. WYJŚCIE — LISTA PYTAŃ DO ZADANIA
// ═══════════════════════════════════════════════════════════════════

/** ⛔ Dwie wartości i tylko dwie. Okno ma dwa dni, więc `kiedy` ma dwa stany. */
export type KiedyBylo = 'wczoraj' | 'dzis';

/**
 * ⭐ DWA STANY POZYCJI I DRUGI NIE JEST OZDOBĄ.
 *
 *   `pytam`         — produkt nie wie i pyta.
 *   `odpowiedziane` — zawodnik już odpowiedział. Pozycja ZOSTAJE na ekranie,
 *                     pokazuje, co wybrał, i pozwala to zmienić w tym samym
 *                     miejscu. ⛔ NIE jest zadawana ponownie jako pytanie.
 *
 * ⚠️ Gdyby odpowiedziana pozycja znikała, zawodnik, który dotknął nie tego
 * przycisku, nie miałby jak tego naprawić bez wchodzenia do Kalendarza —
 * czyli poprawka byłaby głębiej niż odpowiedź (złamanie P0).
 */
export type StanPytania =
  | { rodzaj: 'pytam' }
  | { rodzaj: 'odpowiedziane'; werdykt: WartoscWerdyktu };

export type Pytanie = {
  /** `kluczWystapienia(id, dzien)` — ten sam klucz, co unikat w bazie. */
  klucz: string;
  idWydarzenia: number;
  dzien: string;
  kiedy: KiedyBylo;
  tytul: string;
  /** `HH:MM` albo `null` — przepisane z wejścia, NIE wyliczone tutaj. */
  godzina: string | null;
  /** ⚠️ BRZMIENIE NOWE — DO PRZEJRZENIA PRZEZ KUBĘ. Patrz sekcja 4. */
  zdanie: string;
  stan: StanPytania;
};

/**
 * ⭐ TRZY WYNIKI, NIE DWA (R5).
 *
 *   `pytania`    — mam o co zapytać (lista niepusta).
 *   `brak_pytan` — SPRAWDZIŁEM i nie ma o co pytać. Z powodem.
 *   `nie_wiem`   — nie odczytałem czegoś, więc NIE WIEM, czy jest o co pytać.
 *
 * ⛔ Sklejenie dwóch ostatnich zamieniłoby awarię odczytu w zdanie
 * „nic wczoraj nie miałeś" — czyli w nieprawdę o zawodniku (Z0).
 */
export type WynikPytan =
  | { rodzaj: 'pytania'; pytania: readonly Pytanie[] }
  | { rodzaj: 'brak_pytan'; powod: string }
  | { rodzaj: 'nie_wiem'; powod: string };

// ═══════════════════════════════════════════════════════════════════
// 3. ⛔ PUNKT WPIĘCIA MUTACJI — WYŁĄCZNIE DLA STRAŻNIKA
// ═══════════════════════════════════════════════════════════════════

/**
 * ⛔ PRODUKCYJNY WOŁAJĄCY NIE PODAJE TEGO ARGUMENTU. To jedyny sposób, żeby
 * mutacja strażnika nie miała drogi na ekran zawodnika — ten sam wzorzec,
 * co `ZasadyWykonania` w `lib/wykonanieSesji.ts` (pas D1).
 */
export type ZasadyPytan = {
  /** Czy okno to „wczoraj i dziś". ⛔ `false` = cała historia wstecz. */
  oknoWczorajIDzis: boolean;
  /** Czy klucz to `(id, dzien)`. ⛔ `false` = klucz to sam wiersz. */
  jednoNaWystapienie: boolean;
  /** Czy pytamy wyłącznie tam, gdzie NIE MA dowodu. ⛔ `false` = pytamy zawsze. */
  pytamTylkoBezDowodu: boolean;
  /** Czy nieodczytane wejście daje `nie_wiem`. ⛔ `false` = udaje „brak pytań". */
  trzeciStanNieWiem: boolean;
  /** Czy werdykt wycofany znaczy „brak werdyktu". ⛔ `false` = wycofany zamyka pytanie. */
  wycofanyToBrakWerdyktu: boolean;
};

export const ZASADY_PRAWDZIWE_PYTAN: ZasadyPytan = {
  oknoWczorajIDzis: true,
  jednoNaWystapienie: true,
  pytamTylkoBezDowodu: true,
  trzeciStanNieWiem: true,
  wycofanyToBrakWerdyktu: true,
};

// ═══════════════════════════════════════════════════════════════════
// 4. ⚠️ BRZMIENIE — JEDNO NOWE ZDANIE W CAŁYM PASIE
// ═══════════════════════════════════════════════════════════════════
//
// ⚠️ DO PRZEJRZENIA PRZEZ KUBĘ. To jest JEDYNY nowy napis tego pasa.
// Wszystko inne — „Zrobione" i „Nie odbyło się" — to `PLAKIETKI_WYKONANIA`
// z pasa C1/D1, użyte co do znaku. Trzecie słowo na to samo byłoby rozjazdem
// słownika: te same dwa napisy zawodnik widzi w Kalendarzu i w widoku tygodnia.
//
// ⛔ CZEGO W TYM ZDANIU NIE MA:
//   • pytania „dlaczego nie" — to konfrontacja (M1), a kolumny na powód
//     nie ma nawet w migracji;
//   • słowa „passa", „seria", „z rzędu", „codziennie", „nie przerwij" (N1);
//   • pochwały za samo odpowiedzenie — nagradzamy PRACĘ, nie obecność (N1);
//   • porównania z kimkolwiek (N3);
//   • liczby pytań bez odpowiedzi — to byłaby lista zaległości.
//
// ⚠️ ODSTĄPIENIE OD PROPOZYCJI W POLECENIU, ŚWIADOME I DO ZATWIERDZENIA.
// Polecenie proponuje „Trening klubowy, wtorek 17:00 — zrobiłeś?", czyli
// NAZWĘ DNIA TYGODNIA. Piszę „wczoraj" / „dziś" z dwóch policzalnych powodów:
//   1. okno ma DWA dni, więc „wczoraj" jest ściślejsze niż „w sobotę" —
//      nazwa dnia każe zawodnikowi ją sobie przeliczyć na „to było wczoraj";
//   2. pełnych nazw dni ta appka NIE MA. `DAYS_OF_WEEK` w `lib/date-utils.ts`
//      niesie skróty („Pon", „Wt"), a `toLocaleDateString('pl-PL')` bywa
//      na Hermesie przycięte i oddaje angielski (znalezisko B37, 08.08.2026,
//      opisane przy `formatDatePl`). Nazwa dnia znaczyłaby więc NOWY SŁOWNIK
//      SIEDMIU NAPISÓW, a nie jedno zdanie.
// ⭐ Jeżeli wolisz nazwę dnia — to jest zmiana JEDNEJ stałej niżej plus
//    ten słownik. Nie robię jej sam, bo brzmienia należą do Ciebie.

/** ⚠️ BRZMIENIE — DO PRZEJRZENIA PRZEZ KUBĘ. */
export const KIEDY_NAPIS: Record<KiedyBylo, string> = {
  wczoraj: 'wczoraj',
  dzis: 'dziś',
};

/** ⚠️ BRZMIENIE — DO PRZEJRZENIA PRZEZ KUBĘ. Nadtytuł bloku na karcie „Dziś". */
export const PYTANIE_NAGLOWEK = 'ZROBIŁEŚ?';

/**
 * ⚠️ BRZMIENIE — DO PRZEJRZENIA PRZEZ KUBĘ. Całe nowe zdanie tego pasa.
 *
 * „Blok Skupienia: Bieg ciągły wczoraj o 17:00 — zrobiłeś?"
 * „Trening z klubem wczoraj — zrobiłeś?"     (gdy godziny nie podano)
 * „Mikro-sesja dziś — zrobiłeś?"             (gdy wystąpienie nie ma tytułu)
 *
 * ⚠️ CO STOI NA POCZĄTKU — TYTUŁ, A NIE NAZWA RODZAJU. To jest odstąpienie
 * od propozycji w poleceniu („Trening klubowy, wtorek 17:00") i ma powód
 * ZMIERZONY, nie estetyczny: 15.08.2026 wszystkie 24 wydarzenia w bazie mają
 * `event_type = 'micro_session'`, więc nazwa rodzaju brzmiałaby dla KAŻDEGO
 * pytania identycznie („Mikro-sesja"). Tytuł jest jedyną rzeczą, która dziś
 * te wystąpienia od siebie odróżnia — i jest tym samym napisem, który zawodnik
 * widzi w wierszu dnia w Kalendarzu.
 *
 * ⛔ TYTUŁ NIE JEST SUROWĄ WARTOŚCIĄ KOLUMNY W ROZUMIENIU E2-5/F2. Tamten
 * defekt to `SLOWNIK[x] ?? x`, czyli WARTOŚĆ ENUMU pokazana zamiast etykiety,
 * której zabrakło („club_training"). Tu po obu stronach stoją napisy dla
 * ludzi: tytuł wpisany przez zawodnika i nazwa rodzaju JUŻ ROZSTRZYGNIĘTA
 * przez `opiszRodzaj()`. Przy nieznanym rodzaju ekran podaje `null`, a nie
 * surową wartość — i to jest cała różnica.
 */
export function zdaniePytania(args: {
  nazwaRodzaju: string | null;
  tytul: string;
  kiedy: KiedyBylo;
  godzina: string | null;
}): string {
  const tytul = typeof args.tytul === 'string' ? args.tytul.trim() : '';
  const rodzaj = typeof args.nazwaRodzaju === 'string' ? args.nazwaRodzaju.trim() : '';
  const co = tytul !== '' ? tytul : rodzaj;
  const kiedy = KIEDY_NAPIS[args.kiedy];
  const godzina = args.godzina === null || args.godzina === '' ? '' : ` o ${args.godzina}`;
  // ⛔ Gdy wystąpienie nie ma ani tytułu, ani znanego rodzaju, zdanie NIE
  // dostaje wypełniacza w rodzaju „Zaplanowana sesja" — to byłoby nowe
  // brzmienie i twierdzenie o czymś, czego nie umiemy nazwać. Zostaje ten
  // sam szablon z pustym miejscem, zaczęty od wielkiej litery.
  if (co === '') return `${kiedy.charAt(0).toUpperCase()}${kiedy.slice(1)}${godzina} — zrobiłeś?`;
  return `${co} ${kiedy}${godzina} — zrobiłeś?`;
}

// ═══════════════════════════════════════════════════════════════════
// 5. ⭐ REGUŁA — O CO PRODUKT MA ZAPYTAĆ
// ═══════════════════════════════════════════════════════════════════

/**
 * ⭐ LISTA PYTAŃ DO ZADANIA. Sześć reguł, każda z osobną asercją strażnika:
 *
 *  1. ⛔ OKNO = WCZORAJ I DZIŚ. Sesja z przedwczoraj NIE WCHODZI, choćby nie
 *     miała werdyktu i choćby przerwa trwała miesiąc (decyzja Kuby nr 2).
 *  2. ⭐ JEDNO PYTANIE NA WYSTĄPIENIE, NIE NA WIERSZ. Klucz to
 *     `(idWydarzenia, dzien)` — ten sam, co unikat w bazie. Reguła cykliczna
 *     ma jeden wiersz i dwa wystąpienia w oknie: to są DWA pytania.
 *  3. SESJA Z WERDYKTEM NIE JEST PYTANA PONOWNIE — ale zostaje widoczna
 *     ze stanem `odpowiedziane`, żeby dało się ją zmienić w tym samym miejscu.
 *  4. WERDYKT WYCOFANY (`withdrawn_at`) = BRAK WERDYKTU. Pytanie wraca.
 *  5. ⛔ TRZECI STAN. Nie odczytałem wydarzeń, Dziennika albo werdyktów →
 *     `nie_wiem`, NIGDY „brak pytań" (R5).
 *  6. ⛔ ZERO ARYTMETYKI NA DNIACH POZA OKNEM. W całym pliku jest DOKŁADNIE
 *     JEDNO wywołanie `przesunDate` i jest to `-1`. Nie da się stąd policzyć
 *     serii, przerwy ani zaległości (N1) — tak samo jak `JednostkaPracy`
 *     w `lib/nagrodaZaPrace.ts` nie ma pola z datą.
 *
 * ⚠️ `przeszle: true` DLA OBU DNI OKNA I TO JEST DECYZJA, NIE NIEDOPATRZENIE.
 * Sesja dzisiejsza jest do orzeczenia DZIŚ — zawodnik otwiera appkę wieczorem
 * po treningu, a nie nazajutrz. Baza to dopuszcza: wyzwalacz `session_verdicts_pilnuj`
 * przyjmuje `occurred_on <= current_date + 1` (próba P20 pasa D1), czyli
 * z zapasem jednego dnia na strefę czasową. ⛔ Wystąpienie z JUTRA do okna
 * nie wchodzi — reguła 1 je odcina, zanim ktokolwiek o nie zapyta.
 */
export function zbudujPytaniaOWystapienia(
  we: WejsciePytan,
  zasady: ZasadyPytan = ZASADY_PRAWDZIWE_PYTAN,
): WynikPytan {
  // ── REGUŁA 5, część pierwsza: trzy wejścia, trzy powody niewiedzy ──
  const wczoraj = przesunDate(we.dzis, -1);
  if (wczoraj === null) {
    return { rodzaj: 'nie_wiem', powod: `nie umiem odczytać dzisiejszej daty („${we.dzis}")` };
  }
  if (we.wystapienia === null) {
    return niewiedzaAlboCisza(zasady, 'nie odczytałem wydarzeń z kalendarza');
  }
  if (we.wpisyDziennika === null) {
    return niewiedzaAlboCisza(zasady, 'nie odczytałem powiązań wpisów w Dzienniku z sesjami');
  }
  if (we.werdykty.rodzaj !== 'jest') {
    return niewiedzaAlboCisza(zasady, we.werdykty.powod);
  }

  const oknoDwaDni: readonly string[] = [wczoraj, we.dzis];
  const widziane = new Set<string>();
  const pytania: Pytanie[] = [];

  for (const w of we.wystapienia) {
    if (!w || typeof w.idWydarzenia !== 'number' || !Number.isFinite(w.idWydarzenia)) continue;
    if (typeof w.dzien !== 'string' || w.dzien.length < 10) continue;
    const dzien = w.dzien.slice(0, 10);

    // ── REGUŁA 1 — OKNO. ⛔ Porównanie NA RÓWNOŚĆ z dwiema wartościami,
    // a nie zakresem: zakres kusi, żeby go rozszerzyć „o jeden dzień",
    // a dwie wartości trzeba rozszerzyć świadomie.
    const kiedy: KiedyBylo | null = dzien === we.dzis
      ? 'dzis'
      : (dzien === wczoraj ? 'wczoraj' : null);
    if (zasady.oknoWczorajIDzis && kiedy === null) continue;
    const kiedyPewne: KiedyBylo = kiedy ?? 'wczoraj';

    // ── REGUŁA 2 — JEDNO PYTANIE NA WYSTĄPIENIE.
    const klucz = zasady.jednoNaWystapienie
      ? kluczWystapienia(w.idWydarzenia, dzien)
      : String(w.idWydarzenia);
    if (widziane.has(klucz)) continue;
    widziane.add(klucz);

    const weWykonania: WejscieWykonania = {
      idWydarzenia: w.idWydarzenia,
      dzien,
      przeszle: true,
      status: typeof w.status === 'string' ? w.status : '',
      zRegulyCyklicznej: w.zRegulyCyklicznej === true,
      wpisyDziennika: we.wpisyDziennika,
      werdykty: we.werdykty,
    };

    // ── REGUŁY 3 i 4 — WOŁANE, NIE PRZEPISANE.
    // `akcjaDlaWystapienia` (pas D1) rozstrzyga trzy rzeczy naraz: czy jest
    // gdzie zapisać, czy zawodnik już odpowiedział i czy dowód już istnieje.
    // ⛔ Drugi silnik tej reguły rozjechałby się z pierwszym przy pierwszej
    // poprawce, a oba wyglądałyby poprawnie z osobna.
    //
    // ⚠️ PLAN-D-K1 16.08.2026 — PIĄTA WARTOŚĆ `StanWykonania` (`odwolane`)
    // NIE ZMIENIA TU NICZEGO I JEST TO SPRAWDZONE, NIE ZAŁOŻONE (D7).
    // Ten moduł nie czyta `StanWykonania` w ogóle: pyta `akcjaDlaWystapienia`,
    // a ta zwraca `brak` dla wszystkiego, co nie jest `brak_wpisu` — więc
    // sesja odwołana nie była pytana przed pasem K1 i nie jest po nim.
    // Asercja `(3) ⛔ sesja ODWOŁANA nie jest pytana` w strażniku tego pliku
    // trzyma to zdanie prawdziwym.
    const werdykt = znajdzWerdykt(we.werdykty, w.idWydarzenia, dzien, zasady);
    const akcja = akcjaDlaWystapienia(weWykonania);

    let stan: StanPytania | null = null;
    if (werdykt !== null) {
      stan = { rodzaj: 'odpowiedziane', werdykt: werdykt.werdykt };
    } else if (akcja.rodzaj === 'oznacz' || !zasady.pytamTylkoBezDowodu) {
      stan = { rodzaj: 'pytam' };
    }
    if (stan === null) continue;

    const tytul = typeof w.tytul === 'string' ? w.tytul : '';
    const godzina = typeof w.godzina === 'string' && w.godzina !== '' ? w.godzina : null;
    const nazwaRodzaju = typeof w.nazwaRodzaju === 'string' ? w.nazwaRodzaju : null;

    pytania.push({
      klucz: kluczWystapienia(w.idWydarzenia, dzien),
      idWydarzenia: w.idWydarzenia,
      dzien,
      kiedy: kiedyPewne,
      tytul,
      godzina,
      zdanie: zdaniePytania({ nazwaRodzaju, tytul, kiedy: kiedyPewne, godzina }),
      stan,
    });
  }

  if (pytania.length === 0) {
    return {
      rodzaj: 'brak_pytan',
      powod: 'sprawdziłem wczoraj i dziś — nie ma wystąpienia, o które trzeba zapytać',
    };
  }

  // ⚠️ KOLEJNOŚĆ JEST CZĘŚCIĄ ODPOWIEDZI, nie kosmetyką: wczoraj przed dziś
  // (starsze pierwsze, bo o nim najłatwiej zapomnieć), w dniu — po godzinie,
  // a przy równych po `id`, żeby kolejność była POWTARZALNA. Lista, która
  // przeskakuje między renderami, zaprasza do dotknięcia nie tego przycisku.
  return { rodzaj: 'pytania', pytania: pytania.slice().sort(porownajPytania) };
}

/**
 * ⛔ REGUŁA 5 — jedyne miejsce, w którym niewiedza może udawać ciszę,
 * i wchodzi tam WYŁĄCZNIE mutacja strażnika.
 */
function niewiedzaAlboCisza(zasady: ZasadyPytan, powod: string): WynikPytan {
  if (!zasady.trzeciStanNieWiem) return { rodzaj: 'brak_pytan', powod };
  return { rodzaj: 'nie_wiem', powod };
}

/**
 * ⚠️ Produkcyjnie to jest JEDNA LINIA: wołanie `werdyktDlaWystapienia` z pasa
 * D1, które samo pomija wiersze wycofane. Druga gałąź istnieje WYŁĄCZNIE po
 * to, żeby mutacja `wycofanyToBrakWerdyktu: false` miała się o co wyłożyć —
 * i nie jest osiągalna bez podania drugiego argumentu.
 */
function znajdzWerdykt(
  we: WejscieWerdyktow,
  idWydarzenia: number,
  dzien: string,
  zasady: ZasadyPytan,
) {
  if (zasady.wycofanyToBrakWerdyktu) return werdyktDlaWystapienia(we, idWydarzenia, dzien);
  if (we.rodzaj !== 'jest') return null;
  const klucz = kluczWystapienia(idWydarzenia, dzien);
  for (const w of we.werdykty) {
    if (kluczWystapienia(w.idWydarzenia, w.dzien) === klucz) return w;
  }
  return null;
}

function porownajPytania(a: Pytanie, b: Pytanie): number {
  if (a.dzien !== b.dzien) return a.dzien < b.dzien ? -1 : 1;
  const ga = godzinaDoPorownania(a);
  const gb = godzinaDoPorownania(b);
  if (ga !== gb) return ga - gb;
  return a.idWydarzenia - b.idWydarzenia;
}

/**
 * Pozycje bez godziny idą na KONIEC dnia, a między sobą porządkuje je `id`.
 * ⚠️ `24 * 60` to nie jest godzina — to wartownik „brak godziny", większy od
 * każdej prawdziwej. ⛔ To NIE JEST arytmetyka na dniach (reguła 6): dotyczy
 * minut w jednym dniu i nie wychodzi poza porządkowanie listy.
 */
const BEZ_GODZINY = 24 * 60;
function godzinaDoPorownania(p: Pytanie): number {
  if (p.godzina === null) return BEZ_GODZINY;
  const m = /^(\d{1,2}):(\d{2})$/.exec(p.godzina);
  if (m === null) return BEZ_GODZINY;
  return Number(m[1]) * 60 + Number(m[2]);
}

// ═══════════════════════════════════════════════════════════════════
// 6. POMOCNICZE — DLA EKRANU I DLA LOGU
// ═══════════════════════════════════════════════════════════════════

/**
 * Ile pozycji CZEKA NA ODPOWIEDŹ. ⚠️ To jest liczba dla STRAŻNIKA i dla logu,
 * ⛔ NIE dla zawodnika: „masz 3 pytania bez odpowiedzi" byłoby listą
 * zaległości, a okno ma dwa dni właśnie po to, żeby jej nie było.
 */
export function ilePytamy(w: WynikPytan): number {
  if (w.rodzaj !== 'pytania') return 0;
  return w.pytania.filter((p) => p.stan.rodzaj === 'pytam').length;
}

/** Zdanie do konsoli — żeby dało się zdiagnozować pytania po fakcie. */
export function opisPytanDoLogu(w: WynikPytan): string {
  if (w.rodzaj === 'nie_wiem') return `pytania o wystąpienia: NIE WIEM — ${w.powod}`;
  if (w.rodzaj === 'brak_pytan') return `pytania o wystąpienia: brak — ${w.powod}`;
  const odpowiedziane = w.pytania.length - ilePytamy(w);
  return `pytania o wystąpienia: ${ilePytamy(w)} do zadania, ${odpowiedziane} odpowiedzianych `
    + `(${w.pytania.map((p) => `${p.klucz}:${p.stan.rodzaj}`).join(', ')})`;
}
