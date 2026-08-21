// PLAN-D-A1 08.2026 (18.08.2026) — NOWY PLIK. CO Z KARTY MECZU STOI NA
// WIERZCHU, A CO ZA JEDNYM DOTKNIĘCIEM.
// ⭐⭐ PLAN-D-D8 18.08.2026 — ROZSZERZONY: ten moduł przestaje być samą tabelą
// „gdzie co stoi" i zaczyna nieść REGUŁY ścieżki meczu (dwie liczby, wynik,
// osobny stan zera minut i kształt wiersza do zapisu).
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
// ⛔ CO SIĘ ZMIENIŁO 18.08 WIECZOREM (PAS D8) I DLACZEGO TO NIE JEST KOSMETYKA.
// Pas A1 zbudował arkusz, ale POLA SIĘ DO NIEGO NIE PRZENIOSŁY: arkusz
// wypisywał sześć NAPISÓW i odsyłał do pełnej karty meczu. Napis, który nic
// nie zapisuje, jest obietnicą, nie funkcją (R1). Od tego pasa arkusz naprawdę
// zapisuje wszystkie sześć rzeczy do `match_contexts`.
//
// ⛔ CO PRZESTAŁO BYĆ PRAWDĄ: do 18.08 stało tu, że długość całego meczu
// (`match_contexts.match_length_minutes`) NIE ISTNIEJE W BAZIE. ⭐ Kolumna
// została założona na produkcji 18.08.2026 razem z dwiema zapadkami:
//   CHECK (match_length_minutes is null or (match_length_minutes > 0
//                                           and match_length_minutes <= 150))
//   CHECK (minutes_played is null or match_length_minutes is null
//          or minutes_played <= match_length_minutes)
// ⭐ Druga zapadka jest po to, żeby baza nie przepuściła defektu, który makieta
// dopuszcza do wyklikania („6 z 4 punktów za ten mecz"). Ten moduł zna tę samą
// regułę i zatrzymuje ją O JEDEN KROK WCZEŚNIEJ — na ekranie, zdaniem, zamiast
// komunikatem bazy. ⛔ To NIE jest drugie źródło prawdy: baza zostaje ostatnim
// słowem, a ekran ma tylko nie prosić zawodnika o coś, co i tak zostanie odrzucone.

import {
  wagaMeczu,
  punktyRozwojuNaEkranie,
  MAKS_PUNKTOW_ZA_MECZ,
  DOMYSLNA_DLUGOSC_MECZU_MIN,
  MECZ_BEZ_MINUT_NA_BOISKU,
} from './nagrodaZaPrace';
import { LABEL_TO_POSITION_KEY } from './positionProfiles';

/** Gdzie rzecz o meczu żyje po decyzji z 18.08.2026. */
export type MiejsceRzeczy =
  /** w ścieżce oceny na „Dziś" — to rysuje makieta v3 */
  | 'ocena_z_kafla'
  /** w arkuszu „powiedz więcej o tym meczu", z tego samego kafla */
  | 'arkusz_wiecej'
  /**
   * ⭐ PLAN-D-D8 — TRZECIE MIEJSCE, DOPISANE ŚWIADOMIE.
   * Karta meczu (`app/(tabs)/mecz.tsx`) ma rzeczy, których decyzja Kuby
   * NIE wymieniła w żadnym z dwóch miejsc — a one nie przestały istnieć.
   * ⛔ Bez tej wartości tabela twierdziłaby, że „cała karta meczu" to dziesięć
   * rzeczy, a karta ma ich więcej. Milcząca niepełność listy zamkniętej jest
   * gorsza niż lista, która mówi, czego nie obejmuje (B3).
   */
  | 'pelna_karta';

/** Czy produkt UMIE dziś tę rzecz zapisać. ⛔ Trzy wartości, nie dwie (R5). */
export type StanRzeczy =
  /** kolumna jest, ekran ją zapisuje */
  | 'dziala'
  /** kolumna jest, ale żaden ekran w nowej ścieżce jej nie zapisuje */
  | 'czeka_na_ekran'
  /** kolumny NIE MA w bazie */
  | 'czeka_na_kolumne';

/**
 * ⛔ TRZY STANY WYMIENIONE Z NAZWY, ŻEBY DAŁO SIĘ JE POLICZYĆ.
 * Strażnik nie umie przeliczyć typu; umie przeliczyć tę listę. Bez niej
 * asercja „stany są trzy" musiałaby liczyć stany UŻYTE — a wtedy domknięcie
 * ostatniej dziury (czyli sukces) wyglądałoby jak skasowanie stanu (O73).
 */
export const STANY_RZECZY: readonly StanRzeczy[] =
  ['dziala', 'czeka_na_ekran', 'czeka_na_kolumne'] as const;

export type RzeczOMeczu = {
  /** Nazwa kolumny w `match_contexts` albo `—`, gdy rzecz nie ma kolumny. */
  kolumna: string;
  /** Napis, który czyta zawodnik. */
  napis: string;
  miejsce: MiejsceRzeczy;
  stan: StanRzeczy;
};

/**
 * ⭐ CAŁA KARTA MECZU ROZŁOŻONA NA TRZY MIEJSCA.
 * ⛔ Lista jest ZAMKNIĘTA: rzecz, której tu nie ma, nie ma się gdzie narysować,
 * a rzecz, która tu jest bez wejścia z ekranu, zapala strażnika.
 */
export const RZECZY_O_MECZU: readonly RzeczOMeczu[] = [
  // ── ścieżka oceny na „Dziś" — cztery rzeczy, tak rysuje makieta ──────
  { kolumna: 'minutes_played', napis: 'Ile minut byłeś na boisku',
    miejsce: 'ocena_z_kafla', stan: 'dziala' },
  { kolumna: 'match_length_minutes', napis: 'Ile trwał cały mecz',
    miejsce: 'ocena_z_kafla', stan: 'dziala' },
  { kolumna: 'match_rpe', napis: 'Jak ciężko było · 1–10',
    miejsce: 'ocena_z_kafla', stan: 'dziala' },
  { kolumna: '—', napis: 'Czy coś Cię boli',
    miejsce: 'ocena_z_kafla', stan: 'dziala' },
  // ── arkusz „powiedz więcej o tym meczu" — sześć rzeczy ───────────────
  { kolumna: 'self_rating', napis: 'Jak sam oceniasz swoją grę',
    miejsce: 'arkusz_wiecej', stan: 'dziala' },
  { kolumna: 'mental_state', napis: 'Z jaką głową w to wszedłeś',
    miejsce: 'arkusz_wiecej', stan: 'dziala' },
  { kolumna: 'demanding_conditions', napis: 'Warunki, w jakich graliście',
    miejsce: 'arkusz_wiecej', stan: 'dziala' },
  { kolumna: 'position_played_today', napis: 'Na jakiej pozycji zagrałeś',
    miejsce: 'arkusz_wiecej', stan: 'dziala' },
  // ⚠️ NAZWA KOLUMNY POPRAWIONA 18.08.2026 (PAS D8). Do dziś stało tu `result`
  // i `notes` — takich kolumn w `match_contexts` NIE MA (zmierzone
  // `information_schema.columns`, 16 kolumn). Wynik to DWIE kolumny, a notatka
  // nazywa się `free_note`. ⛔ Skrócona nazwa nie rzuca błędem — po cichu
  // rozjeżdża dopasowanie, a strażnik czytający napis nadal świeci na zielono.
  { kolumna: 'own_score+opponent_score', napis: 'Wynik meczu',
    miejsce: 'arkusz_wiecej', stan: 'dziala' },
  { kolumna: 'free_note', napis: 'Cokolwiek chcesz zapamiętać',
    miejsce: 'arkusz_wiecej', stan: 'dziala' },
  // ── pełna karta meczu — rzeczy, których decyzja Kuby nie przeniosła ──
  // ⛔ ONE NIE ZNIKNĘŁY. Wejście do nich prowadzi z tego samego arkusza
  // (`MECZ_WIECEJ_WEJSCIE` → `/mecz`) i to jest jedyne wejście, jakie mają.
  { kolumna: 'game_type', napis: 'Jaki to był mecz',
    miejsce: 'pelna_karta', stan: 'dziala' },
  { kolumna: 'entered_recovery_state', napis: 'Z jakim ciałem w to wchodziłeś',
    miejsce: 'pelna_karta', stan: 'dziala' },
  { kolumna: 'match_context_answers', napis: 'Pytania dobrane do Twojej pozycji',
    miejsce: 'pelna_karta', stan: 'dziala' },
];

/** Rzeczy, które mają stanąć w danym miejscu. */
export function rzeczyMeczu(miejsce: MiejsceRzeczy): RzeczOMeczu[] {
  return RZECZY_O_MECZU.filter((r) => r.miejsce === miejsce);
}

/**
 * ⭐ ZDANIE POD LISTĄ W ARKUSZU.
 * ⛔ PRZEPISANE 18.08.2026 (PAS D8), bo poprzednie przestało być prawdą:
 * mówiło „ta ścieżka jeszcze nie przeniosła się tutaj", a od tego pasa
 * przeniosła się. Zdanie o produkcie starzeje się szybciej niż kod (O84).
 */
export const MECZ_WIECEJ_WEJSCIE = 'Otwórz pełną kartę meczu →';

export function podpisArkuszaMeczu(): string {
  const wArkuszu = rzeczyMeczu('arkusz_wiecej').length;
  const wKarcie = rzeczyMeczu('pelna_karta').length;
  return `${wArkuszu} rzeczy, których nie ma w ocenie z kafla. Żadna nie jest obowiązkowa. `
    + `Kolejne ${wKarcie} zapisujesz w pełnej karcie meczu.`;
}

/**
 * ⭐ CZEGO PRODUKT NIE UMIE ZAPISAĆ — imiennie, na ekranie, nie w przypisie.
 *
 * ⛔ TA FUNKCJA ZOSTAJE, CHOĆ ODDAJE DZIŚ PUSTĄ LISTĘ. Skasowanie jej razem
 * z ostatnią dziurą znaczyłoby, że następna dziura nie ma gdzie się pokazać —
 * a mechanizm, który znika w dniu swojego sukcesu, trzeba potem zbudować
 * drugi raz i zwykle po fakcie. Pusta lista rysuje ZERO wierszy, więc nie
 * kosztuje ani jednego dp.
 */
export function czegoNieUmiemyZapisac(): RzeczOMeczu[] {
  return RZECZY_O_MECZU.filter((r) => r.stan === 'czeka_na_kolumne');
}

export const MECZ_CZEKA_NA_KOLUMNE = (napis: string) =>
  `„${napis}" — tego jeszcze nie zapiszemy. Nie ma na to miejsca w bazie i nie udajemy, że jest.`;

// ═════════════════════════════════════════════════════════════════════
// ⭐⭐ ŚCIEŻKA OCENY MECZU — DWIE LICZBY W JEDNYM BLOKU
// ═════════════════════════════════════════════════════════════════════
// ⛔ DLACZEGO DWIE, A NIE JEDNA. 45 minut w meczu 60-minutowym to 3 punkty,
// a 45 minut w meczu 90-minutowym to 2. Bez pola „ile trwał cały mecz"
// pierwsza liczba nie znaczy nic — a produkt, który jej nie ma, po cichu
// podstawia 90 i karze każdego, kto gra krótsze mecze.

/**
 * Minuty na boisku do wyboru. ⛔ Wartości co do znaku z makiety v3
 * (`arkuszOcena`, gałąź `p.typ === "mecz"`). ⭐ ZERO JEST PIERWSZE i to nie
 * jest przypadek: „nie wszedłem" ma być jednym dotknięciem, a nie brakiem
 * odpowiedzi. ⛔ Żadna wartość nie jest zaznaczona z góry.
 */
export const MINUTY_NA_BOISKU: readonly number[] = [0, 15, 30, 45, 60, 90];

/**
 * Długość całego meczu do wyboru. ⛔ Wartości z makiety v3.
 * ⚠️ 60 minut to typowy mecz U13, 90 — dorosły. ⛔ Ani jedna nie jest
 * podpowiedzią: uchwyt, który gdzieś stoi, jest podpowiedzią (Z6).
 */
export const DLUGOSCI_MECZU: readonly number[] = [60, 70, 80, 90];

export const POLE_MINUTY_NA_BOISKU = 'Ile minut byłeś na boisku';
export const POLE_DLUGOSC_MECZU = 'Ile trwał cały mecz';

/**
 * ⛔ Zdanie stoi, DOPÓKI minuty nie są podane. Potem jest już tylko wysokością
 * — ten sam wzorzec, którym makieta v3 zeszła z 923 dp do 803 dp: zdejmujemy
 * zdanie, nigdy pole.
 */
export const MECZ_BEZ_ZAZNACZENIA =
  'Żaden przycisk nie jest zaznaczony z góry — ani tu, ani przy ciężkości. Te liczby znasz tylko Ty.';

/**
 * ⭐ TRAFNOŚĆ MECZU — zdanie z makiety v3, przeniesione co do znaku.
 * ⛔ To nie jest zarzut wobec zawodnika: trafność nigdy nie schodzi poniżej
 * 1,0, więc brak premii nie odejmuje ani jednego punktu.
 */
export const MECZ_TRAFNOSC_ZAWSZE_JEDEN =
  'Trafność meczu to 1,0 zawsze: nie decydujesz o jego treści.';

/** ⭐ Osobny stan zera minut — brzmienie zatwierdzone przez Kubę 18.08.2026. */
export const MECZ_ZERO_MINUT = MECZ_BEZ_MINUT_NA_BOISKU;

/**
 * ⛔ ZAPADKA, KTÓRĄ ZNA TAKŻE BAZA. Zawodnik może wyklikać 90 minut w meczu
 * 60-minutowym — makieta na to pozwala i pokazuje wtedy „6 z 4 punktów".
 * ⛔ Ekran ma nie prosić o coś, co `match_contexts_minuty_nie_wieksze_niz_mecz`
 * i tak odrzuci, a zawodnik ma zobaczyć FAKT, nie komunikat bazy.
 * ⛔ ZERO OCENY OSOBY: zdanie mówi, co się nie zgadza, i oddaje decyzję jemu —
 * bo to on wie, która z dwóch liczb jest prawdziwa, a my nie (Z0).
 */
export const MECZ_MINUTY_PONAD_DLUGOSC =
  'Podałeś więcej minut na boisku niż trwał cały mecz. '
  + 'Popraw jedną z tych dwóch liczb — nie zgadniemy, która jest prawdziwa.';

export type OcenaMeczu = {
  /** `null` = zawodnik nic nie zaznaczył. ⛔ To NIE jest zero (R5). */
  minutyNaBoisku: number | null;
  /** `null` = nie wiemy, ile trwał mecz. ⛔ To NIE jest 90. */
  dlugoscMeczu: number | null;
  /** RPE meczu, `null` = nie podane. */
  rpe: number | null;
};

/**
 * ⭐ CZY DWIE PODANE LICZBY DAJĄ SIĘ POGODZIĆ.
 * ⛔ Sprzeczność jest możliwa TYLKO wtedy, gdy obie są znane — brak jednej
 * z nich to „nie wiemy", a „nie wiemy" nie jest błędem zawodnika.
 */
export function minutyPonadDlugosc(o: OcenaMeczu): boolean {
  if (typeof o.minutyNaBoisku !== 'number' || !Number.isFinite(o.minutyNaBoisku)) return false;
  if (typeof o.dlugoscMeczu !== 'number' || !Number.isFinite(o.dlugoscMeczu)) return false;
  return o.minutyNaBoisku > o.dlugoscMeczu;
}

/** Co ma stać w TRZECIEJ linii bloku minut. ⛔ Cztery stany, nie dwa. */
export type WynikMeczu =
  /** zawodnik nie zaznaczył minut — stoi zdanie o braku podpowiedzi */
  | { rodzaj: 'brak_minut'; zdanie: string }
  /** dwie liczby się wykluczają — stoi zdanie o sprzeczności, wyniku NIE MA */
  | { rodzaj: 'sprzecznosc'; zdanie: string }
  /** zero minut na boisku — osobny stan, mecz zostaje w historii */
  | { rodzaj: 'zero_minut'; zdanie: string }
  /** policzone: „N z 4 punktów za ten mecz" */
  | { rodzaj: 'policzony'; punkty: number; zdanie: string };

/**
 * ⭐⭐ WYNIK OCENY MECZU — TRZECIA LINIA TEGO SAMEGO BLOKU.
 *
 * ⛔ LICZY GO `wagaMeczu()`, A NIE TEN PLIK. To jest cała różnica wobec
 * makiety: makietowe `punktyMeczu()` NIE MA SUFITU i przy 90 minutach w meczu
 * 60-minutowym pokazuje „6 z 4 punktów za ten mecz". Silnik ma sufit i ma
 * rację — ⛔ nie przepisujemy błędu z makiety do produktu.
 *
 * ⛔ RPE WCHODZI DO RACHUNKU. Gdy zawodnik poda ciężkość, `wagaMeczu()` liczy
 * mecz TĄ SAMĄ formułą co każdą inną sesję (`minuty × RPE ⁄ 180`). Pominięcie
 * RPE tutaj dałoby na ekranie inną liczbę niż w liczniku pracy — czyli dwa
 * źródła jednej prawdy, i to takie, których rozjazdu nikt by nie zauważył.
 */
export function wynikMeczu(o: OcenaMeczu): WynikMeczu {
  if (typeof o.minutyNaBoisku !== 'number' || !Number.isFinite(o.minutyNaBoisku)) {
    return { rodzaj: 'brak_minut', zdanie: MECZ_BEZ_ZAZNACZENIA };
  }
  if (minutyPonadDlugosc(o)) {
    return { rodzaj: 'sprzecznosc', zdanie: MECZ_MINUTY_PONAD_DLUGOSC };
  }
  if (o.minutyNaBoisku <= 0) {
    return { rodzaj: 'zero_minut', zdanie: MECZ_ZERO_MINUT };
  }
  const punkty = punktyRozwojuNaEkranie(wagaMeczu(o.minutyNaBoisku, o.dlugoscMeczu, o.rpe).punkty);
  const dlugosc = typeof o.dlugoscMeczu === 'number' && Number.isFinite(o.dlugoscMeczu) && o.dlugoscMeczu > 0
    ? o.dlugoscMeczu : DOMYSLNA_DLUGOSC_MECZU_MIN;
  // ⚠️ „z 90" przy nieznanej długości NIE jest pomiarem — to podstawienie
  // produktowe i zdanie mówi to wprost, zamiast pokazywać liczbę bez źródła.
  const zKtorej = o.dlugoscMeczu === null
    ? `${o.minutyNaBoisku} minut; długości meczu nie podałeś, więc liczymy z ${DOMYSLNA_DLUGOSC_MECZU_MIN}`
    : `${o.minutyNaBoisku} minut z ${dlugosc}`;
  return {
    rodzaj: 'policzony',
    punkty,
    zdanie: `${punkty} z ${MAKS_PUNKTOW_ZA_MECZ} punktów za ten mecz — ${zKtorej}. `
      + MECZ_TRAFNOSC_ZAWSZE_JEDEN,
  };
}

// ═════════════════════════════════════════════════════════════════════
// ⭐ ARKUSZ „POWIEDZ WIĘCEJ" — SZEŚĆ RZECZY, KTÓRE NAPRAWDĘ SIĘ ZAPISUJĄ
// ═════════════════════════════════════════════════════════════════════

export const SKALA_OCENY: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const POLE_SAMOOCENA = 'Jak sam oceniasz swoją grę · 1–10';
export const POLE_STAN_MENTALNY = 'Z jaką głową w to wszedłeś · 1–10';
export const POLE_WARUNKI = 'Warunki, w jakich graliście';
export const POLE_POZYCJA = 'Na jakiej pozycji zagrałeś';
export const POLE_WYNIK = 'Wynik meczu';
export const POLE_NOTATKA = 'Cokolwiek chcesz zapamiętać';

/**
 * ⭐ POZYCJE DO WYBORU — WYPROWADZONE, NIE PRZEPISANE.
 * ⛔ `match_contexts.position_played_today` ma klucz obcy do `positions(id)`,
 * a `positions.id` to POLSKIE ETYKIETY (zmierzone 18.08.2026: nine wierszy,
 * `Bramkarz`, `Środkowy obrońca`, …). Trzecia ręczna kopia tej listy
 * (pierwsza w bazie, druga w `app/(tabs)/mecz.tsx`) rozjechałaby się przy
 * pierwszej literówce — a klucz obcy odrzuciłby zapis dopiero u zawodnika.
 * ⚠️ `Nie dotyczy` świadomie NIE WCHODZI: pole odpowiada na „na jakiej
 * pozycji dziś zagrałeś", a „nie dotyczy" nie jest odpowiedzią na to pytanie.
 */
export const POZYCJE_DO_WYBORU: readonly string[] = Object.keys(LABEL_TO_POSITION_KEY);

export const WARUNKI_TAK = 'wymagające';
export const WARUNKI_NIE = 'zwyczajne';
export const WYNIK_MY = 'my';
export const WYNIK_ONI = 'oni';

/**
 * ⛔ ZDANIE O DOBROWOLNOŚCI, NIE O ZALEGŁOŚCI. Arkusz, który liczy, ile pól
 * zostało pustych, jest listą zaległości — a lista zaległości u piętnastolatka
 * działa dokładnie odwrotnie do zamierzenia (N1).
 */
export const MECZ_WIECEJ_DOBROWOLNE =
  'Zapisujesz tyle, ile chcesz. Puste pole zostaje puste — nie zgadujemy za Ciebie.';

/**
 * ⭐⭐ SZEŚĆ PÓL ARKUSZA — WIĄZANIE MIĘDZY TABELĄ A EKRANEM.
 *
 * ⛔ PO CO TO ISTNIEJE. `RZECZY_O_MECZU` mówi, CO ma stać w arkuszu; ekran
 * rysuje SZEŚĆ RÓŻNYCH widżetów, bo skala 1–10, klucz obcy i pole tekstowe
 * nie dają się narysować jedną pętlą. Bez tej tabeli obie listy byłyby
 * niezależne: dopisanie siódmej rzeczy do `RZECZY_O_MECZU` nie zapaliłoby
 * niczego, a arkusz nadal rysowałby sześć — czyli rzecz „przeniesiona"
 * zniknęłaby po cichu (B3).
 * ⭐ `stala` to NAZWA stałej, którą ekran ma narysować. Strażnik sprawdza
 * jej obecność w pliku ekranu, więc nowy wiersz tutaj wymusza nowe pole tam.
 */
export const POLA_ARKUSZA: readonly { kolumna: string; stala: string; etykieta: string }[] = [
  { kolumna: 'self_rating', stala: 'POLE_SAMOOCENA', etykieta: POLE_SAMOOCENA },
  { kolumna: 'mental_state', stala: 'POLE_STAN_MENTALNY', etykieta: POLE_STAN_MENTALNY },
  { kolumna: 'demanding_conditions', stala: 'POLE_WARUNKI', etykieta: POLE_WARUNKI },
  { kolumna: 'position_played_today', stala: 'POLE_POZYCJA', etykieta: POLE_POZYCJA },
  { kolumna: 'own_score+opponent_score', stala: 'POLE_WYNIK', etykieta: POLE_WYNIK },
  { kolumna: 'free_note', stala: 'POLE_NOTATKA', etykieta: POLE_NOTATKA },
];

export const MECZ_WIECEJ_ZAPISZ = 'Zapisz to, co podałem';
export const MECZ_WIECEJ_ZAPISANO = 'Zapisane. Możesz to zmienić — ta ocena należy do Ciebie.';
export const MECZ_WIECEJ_NIC_DO_ZAPISU =
  'Nic tu jeszcze nie zaznaczyłeś. Nie zapiszemy pustego meczu, żeby nie liczył się jako praca.';

/**
 * ⛔ RODZAJ MECZU PRZY ZAPISIE Z KAFLA. `match_contexts.game_type` jest
 * `NOT NULL` z CHECK-iem na cztery wartości, a kafel na „Dziś" niesie
 * WYŁĄCZNIE `event_type = 'match'` — czyli nie wie, czy to był mecz ligowy,
 * sparing, turniej czy gra treningowa.
 * ⚠️ To jest DECYZJA PRODUKTOWA nazwana z imienia, a nie pomiar (Z0):
 * podstawiamy tę samą wartość, którą od zawsze podstawia `app/(tabs)/mecz.tsx`,
 * a zawodnik może ją poprawić w pełnej karcie meczu.
 */
export const RODZAJ_MECZU_Z_KAFLA = 'official_match';

export type WiecejOMeczu = {
  samoocena: number | null;
  stanMentalny: number | null;
  /** ⛔ `null` to „nie zapytaliśmy", `false` to „zwyczajne". Trzy wartości (R5). */
  wymagajaceWarunki: boolean | null;
  /** Klucz z `public.positions.id` — polska etykieta. `null` = nie podał. */
  pozycja: string | null;
  bramkiMy: number | null;
  bramkiOni: number | null;
  notatka: string | null;
};

export const PUSTE_WIECEJ_O_MECZU: WiecejOMeczu = {
  samoocena: null, stanMentalny: null, wymagajaceWarunki: null,
  pozycja: null, bramkiMy: null, bramkiOni: null, notatka: null,
};

/** Wiersz `match_contexts` w kształcie, w jakim idzie do bazy. */
export type WierszKontekstuMeczu = {
  user_id: string;
  game_type: string;
  /**
   * ⭐⭐ PLAN-D-D2 19.08.2026 — WYSTĄPIENIE, KTÓREGO TEN WIERSZ DOTYCZY.
   * Kolumna założona na produkcji 19.08.2026 (`bigint`, FK → `calendar_events(id)`
   * `on delete set null`, unikalny indeks częściowy po `calendar_event_id`).
   * ⛔ `null` = nie wiem, z którego wystąpienia to jest. Wtedy licznik pracy
   * policzy ten wiersz OSOBNO, bo nie ma czym go z wydarzeniem zestawić.
   */
  calendar_event_id: number | null;
  minutes_played: number | null;
  match_length_minutes: number | null;
  match_rpe: number | null;
  self_rating: number | null;
  mental_state: number | null;
  demanding_conditions: boolean | null;
  position_played_today: string | null;
  own_score: number | null;
  opponent_score: number | null;
  free_note: string | null;
};

/** Co ekran wie o wierszu meczu w TEJ wizycie. ⛔ Trzy wartości, nie dwie. */
/**
 * ⭐ PLAN-D-D2 — CO WOLNO ZMIENIĆ W ISTNIEJĄCYM WIERSZU.
 * ⛔ `calendar_event_id` jest OPCJONALNE i nigdy nie idzie jako `null`:
 * dokładanie do wiersza NIE MA PRAWA skasować wiązania, które ten wiersz
 * już ma. Odebranie wiązania przywróciłoby podwójne liczenie po cichu.
 */
export type ZmianyKontekstuMeczu =
  Omit<WierszKontekstuMeczu, 'user_id' | 'game_type' | 'calendar_event_id'>
  & { calendar_event_id?: number };

/**
 * ⭐⭐ PLAN-D-D2 19.08.2026 — CZY WOLNO ZWIĄZAĆ TEN WIERSZ Z TYM WYSTĄPIENIEM.
 *
 * ⛔ GRANICA, KTÓREJ KLUCZ OBCY NIE PILNUJE (§3 polecenia D2). FK sprawdza,
 * że `calendar_events.id` ISTNIEJE — ⛔ nie sprawdza, że należy do TEGO
 * zawodnika. Wiersz meczu z cudzym wystąpieniem przeszedłby przez bazę bez
 * mrugnięcia i pochłonąłby cudzą jednostkę pracy.
 */
export type WiazanieZWydarzeniem =
  | { rodzaj: 'jest'; idWydarzenia: number }
  | { rodzaj: 'brak'; powod: string };

export function ustalWiazanieMeczu(w: {
  /** `calendar_events.id` wystąpienia, z którego kafla wyszedł zapis. */
  idWydarzenia: number | null;
  /**
   * ⛔ Wystąpienia, KTÓRE ZAWODNIK MA NA SWOIM EKRANIE. `null` znaczy
   * „nie znam tej listy" i jest TRZECIM STANEM (R5), nie pustym zbiorem:
   * przy nieznanej liście NIE wiążemy, bo nie mamy czym sprawdzić właściciela.
   */
  wydarzeniaZawodnika: ReadonlySet<number> | null;
}): WiazanieZWydarzeniem {
  const id = w.idWydarzenia;
  if (typeof id !== 'number' || !Number.isFinite(id)) {
    return { rodzaj: 'brak', powod: 'ekran nie podał wystąpienia — wiersz zostaje niezwiązany' };
  }
  if (w.wydarzeniaZawodnika === null) {
    return {
      rodzaj: 'brak',
      powod: '⛔ nie znam listy wydarzeń tego zawodnika — nie wiążę wiersza '
        + 'z wystąpieniem, którego właściciela nie umiem sprawdzić',
    };
  }
  if (!w.wydarzeniaZawodnika.has(id)) {
    return {
      rodzaj: 'brak',
      powod: `⛔ wystąpienie ${id} NIE JEST na ekranie tego zawodnika — `
        + 'klucz obcy tego nie pilnuje, więc pilnuję tutaj',
    };
  }
  return { rodzaj: 'jest', idWydarzenia: id };
}

/**
 * ⭐⭐ PLAN-D-D2 19.08.2026 — DRUGI WIERSZ NA TO SAMO WYSTĄPIENIE.
 *
 * Unikalny indeks częściowy `match_contexts_jeden_wiersz_na_wydarzenie`
 * zamienia cichy duplikat w BŁĄD. ⛔ Zawodnikowi nie wolno pokazać kodu
 * `23505` — ekran ma powiedzieć zdanie (§4.3 polecenia D2).
 */
export const INDEKS_JEDEN_WIERSZ_NA_WYDARZENIE = 'match_contexts_jeden_wiersz_na_wydarzenie';

export const MECZ_JUZ_MA_WIERSZ =
  'Ten mecz jest już u nas zapisany — pociągnij ekran w dół, a dołożę to do tego, co masz.';

/** ⛔ Rozpoznajemy PO KODZIE `23505` albo po nazwie indeksu, nie po zgadywaniu. */
export function toJestDrugiWierszNaMecz(blad: unknown): boolean {
  if (blad === null || typeof blad !== 'object') return false;
  const b = blad as { code?: unknown; message?: unknown; details?: unknown };
  const kod = typeof b.code === 'string' ? b.code : '';
  const tekst = `${typeof b.message === 'string' ? b.message : ''} `
    + `${typeof b.details === 'string' ? b.details : ''}`;
  return kod === '23505' || tekst.includes(INDEKS_JEDEN_WIERSZ_NA_WYDARZENIE);
}

export type StanKontekstuMeczu =
  /** nie zapisaliśmy jeszcze nic — pierwszy zapis będzie wstawieniem */
  | { rodzaj: 'brak' }
  /** znamy wiersz, dokładamy do niego */
  | { rodzaj: 'zapisany'; id: number };

export type DecyzjaZapisuMeczu =
  | { rodzaj: 'wstaw'; wiersz: WierszKontekstuMeczu; powod: string }
  | { rodzaj: 'aktualizuj'; id: number; zmiany: ZmianyKontekstuMeczu; powod: string }
  | { rodzaj: 'nie_zapisuj'; powod: string; zdanie: string | null };

function liczbaAlbo(x: number | null, min: number, max: number): number | null {
  if (typeof x !== 'number' || !Number.isFinite(x)) return null;
  if (x < min || x > max) return null;
  return Math.round(x);
}

function tekstAlbo(x: string | null): string | null {
  if (typeof x !== 'string') return null;
  const t = x.trim();
  return t === '' ? null : t;
}

/**
 * ⭐⭐ JEDYNE MIEJSCE, KTÓRE ROZSTRZYGA, CO SIĘ DZIEJE Z WIERSZEM MECZU.
 *
 * ⛔ DLACZEGO TO JEST OSOBNA, CZYSTA FUNKCJA. `match_contexts` NIE MA kolumny
 * wskazującej `calendar_events` (zmierzone 18.08.2026), więc produkt nie umie
 * po ponownym otwarciu appki odnaleźć wiersza, który sam założył. Bez reguły
 * KAŻDE dotknięcie „Zapisz" wstawiałoby nowy wiersz, a licznik pracy liczyłby
 * ten sam mecz tyle razy, ile razy zawodnik go dotknął (klucz `mecz:${id}`
 * w `jednostkiZMeczow()` rozróżnia wiersze, nie mecze).
 * ⭐ Ta funkcja domyka to W GRANICACH JEDNEJ WIZYTY na ekranie i nazywa,
 * czego nie domyka: `StanKontekstuMeczu` żyje w stanie ekranu, więc po
 * zamknięciu aplikacji wraca `{ rodzaj: 'brak' }`. To jest granica dowodu
 * (Z0), a nie przeoczenie — pełne domknięcie wymaga kolumny wiążącej
 * i jest wypisane w nocie pasa.
 *
 * ⛔ PUSTY MECZ SIĘ NIE ZAPISUJE. Wiersz bez ani jednej wartości nie niesie
 * wiedzy, a w liczniku pracy waży 1 punkt („mecz bez minut jest deklaracją") —
 * czyli nagrodę za dotknięcie przycisku, nie za pracę (N1).
 */
export function zdecydujOZapisieMeczu(w: {
  idZawodnika: string;
  stan: StanKontekstuMeczu;
  ocena: OcenaMeczu;
  wiecej: WiecejOMeczu;
  /**
   * ⭐⭐ PLAN-D-D2 19.08.2026 — wystąpienie, z którego kafla wyszedł zapis.
   * ⛔ Nieobowiązkowe wyłącznie po to, żeby stary wołający nie przestał się
   * kompilować; produkcyjny ekran PODAJE JE ZAWSZE i pilnuje tego strażnik.
   */
  idWydarzenia?: number | null;
  /** ⛔ Wystąpienia zawodnika. `null` = nie znam listy → nie wiążę. */
  wydarzeniaZawodnika?: ReadonlySet<number> | null;
}): DecyzjaZapisuMeczu {
  if (typeof w.idZawodnika !== 'string' || w.idZawodnika.trim() === '') {
    return { rodzaj: 'nie_zapisuj', powod: 'brak identyfikatora zawodnika', zdanie: null };
  }
  if (minutyPonadDlugosc(w.ocena)) {
    // ⛔ Ten sam warunek, który stoi w bazie jako CHECK. Zatrzymujemy go tutaj,
    // żeby zawodnik dostał zdanie po ludzku, a nie kod `23514`.
    return { rodzaj: 'nie_zapisuj', powod: 'minuty na boisku > długość meczu', zdanie: MECZ_MINUTY_PONAD_DLUGOSC };
  }

  // ⭐⭐ PLAN-D-D2 — WIĄZANIE LICZY SIĘ PRZED ZAPISEM, nie po nim.
  const wiazanie = ustalWiazanieMeczu({
    idWydarzenia: w.idWydarzenia ?? null,
    wydarzeniaZawodnika: w.wydarzeniaZawodnika ?? null,
  });

  const pola: ZmianyKontekstuMeczu = {
    minutes_played: liczbaAlbo(w.ocena.minutyNaBoisku, 0, 130),
    match_length_minutes: liczbaAlbo(w.ocena.dlugoscMeczu, 1, 150),
    match_rpe: liczbaAlbo(w.ocena.rpe, 0, 10),
    self_rating: liczbaAlbo(w.wiecej.samoocena, 0, 10),
    mental_state: liczbaAlbo(w.wiecej.stanMentalny, 0, 10),
    demanding_conditions: typeof w.wiecej.wymagajaceWarunki === 'boolean' ? w.wiecej.wymagajaceWarunki : null,
    position_played_today: tekstAlbo(w.wiecej.pozycja),
    own_score: liczbaAlbo(w.wiecej.bramkiMy, 0, 99),
    opponent_score: liczbaAlbo(w.wiecej.bramkiOni, 0, 99),
    free_note: tekstAlbo(w.wiecej.notatka),
  };

  const cokolwiek = Object.values(pola).some((v) => v !== null);
  if (!cokolwiek) {
    return { rodzaj: 'nie_zapisuj', powod: 'ani jedno pole nie ma wartości', zdanie: MECZ_WIECEJ_NIC_DO_ZAPISU };
  }

  if (w.stan.rodzaj === 'zapisany') {
    return {
      rodzaj: 'aktualizuj',
      id: w.stan.id,
      // ⛔ Wiązanie DOKŁADAMY, gdy je mamy, i NIGDY nie kasujemy, gdy go nie mamy.
      zmiany: wiazanie.rodzaj === 'jest'
        ? { ...pola, calendar_event_id: wiazanie.idWydarzenia }
        : pola,
      powod: `dokładam do wiersza ${w.stan.id} — ⛔ drugi wiersz liczyłby ten sam mecz drugi raz`
        + ` · wiązanie: ${wiazanie.rodzaj === 'jest' ? `wydarzenie ${wiazanie.idWydarzenia}` : wiazanie.powod}`,
    };
  }
  return {
    rodzaj: 'wstaw',
    wiersz: {
      user_id: w.idZawodnika,
      game_type: RODZAJ_MECZU_Z_KAFLA,
      // ⭐⭐ PLAN-D-D2 §4.1 — TO JEST TA JEDNA KOLUMNA. Bez niej licznik pracy
      // nie ma czym zestawić wiersza meczu z wydarzeniem i liczy oba.
      calendar_event_id: wiazanie.rodzaj === 'jest' ? wiazanie.idWydarzenia : null,
      ...pola,
    },
    powod: 'pierwszy zapis tego meczu w tej wizycie'
      + ` · wiązanie: ${wiazanie.rodzaj === 'jest' ? `wydarzenie ${wiazanie.idWydarzenia}` : wiazanie.powod}`,
  };
}

/** ⛔ Jedno zdanie do logu — ten sam kształt, co reszta ekranu „Dziś". */
export function opisZapisuMeczuDoLogu(d: DecyzjaZapisuMeczu): string {
  if (d.rodzaj === 'nie_zapisuj') return `mecz: NIE ZAPISUJĘ — ${d.powod}`;
  if (d.rodzaj === 'aktualizuj') return `mecz: aktualizuję id=${d.id} — ${d.powod}`;
  return `mecz: wstawiam nowy wiersz — ${d.powod}`;
}
