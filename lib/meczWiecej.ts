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
  // ── arkusz „powiedz więcej o tym meczu" — SIEDEM rzeczy ──────────────
  // ⭐⭐ PLAN-D-M3 21.08.2026 — RODZAJ MECZU STOI TU, A NIE W PEŁNEJ KARCIE.
  // ⛔ CO BYŁO ZŁE, zmierzone 21.08: `game_type` stał w miejscu `pelna_karta`,
  // a ścieżka oceny z kafla wpisywała `RODZAJ_MECZU_Z_KAFLA` NA SZTYWNO. Skutek:
  // zawodnik, który zagrał SPARING i ocenił go z kafla, miał w bazie „Mecz
  // oficjalny" — i żeby to poprawić, musiał przejść cztery dotknięcia
  // (kafel → arkusz → „Otwórz pełną kartę meczu" → arkusz pełnej karty).
  // ⛔ To jest złamanie Z0: produkt podawał PRAWDOPODOBNE jako PEWNE.
  // ⭐ Po przeniesieniu rodzaj stoi w arkuszu otwieranym JEDNYM dotknięciem
  // z kafla. Koszt: 0 dp — arkusz jest `Modal`-em (osobne drzewo nad ekranem).
  { kolumna: 'game_type', napis: 'Jaki to był mecz',
    miejsce: 'arkusz_wiecej', stan: 'dziala' },
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
  { kolumna: 'entered_recovery_state', napis: 'Z jakim ciałem w to wchodziłeś',
    miejsce: 'pelna_karta', stan: 'dziala' },
  { kolumna: 'match_context_answers', napis: 'Pytania dobrane do Twojej pozycji',
    miejsce: 'pelna_karta', stan: 'dziala' },
  // ⭐⭐ PLAN-D-M3 21.08.2026 — DWIE RZECZY, KTÓRYCH TA TABELA DO DZIŚ NIE MIAŁA.
  // ⛔ ZMIERZONE: tabela twierdziła, że karta meczu ma TRZYNAŚCIE rzeczy. Ma
  // PIĘTNAŚCIE. Obie poniżej stoją dziś w arkuszu „Powiedz więcej o tym meczu"
  // W PEŁNEJ KARCIE (`app/(tabs)/mecz.tsx`, gałąź `arkusz === 'wiecej'`) —
  // czyli w `pelna_karta`, nie w arkuszu spod kafla.
  // ⛔ To jest dokładnie ta milcząca niepełność listy zamkniętej, której
  // `MiejsceRzeczy` miało zapobiec (B3): rzecz, której tu nie ma, nie ma się
  // gdzie narysować, a rzecz, która JEST na ekranie i nie ma tu wiersza,
  // znika z inwentarza po cichu.
  { kolumna: 'role', napis: 'Twoja rola',
    miejsce: 'pelna_karta', stan: 'dziala' },
  // ⚠️ JEDYNA RZECZ W TEJ TABELI, KTÓREJ KOLUMNA NIE LEŻY W `match_contexts`.
  // `match_contexts` NIE MA pola na czas meczu (zmierzone 14.08.2026: jedyny
  // czas to `created_at`, czyli moment ZAPISU). Godzina idzie do
  // `calendar_events.scheduled_time`, żeby kafel w widoku tygodnia mógł mieć
  // tag godziny. ⛔ Nazwa kolumny jest podana Z TABELĄ właśnie po to, żeby
  // nikt nie szukał jej w `match_contexts` i nie uznał, że jej nie ma.
  { kolumna: 'calendar_events.scheduled_time', napis: 'O której zaczynał się mecz',
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

/**
 * ⭐⭐ PLAN-D-M3 21.08.2026 — PODPIS ZALEŻNY OD MIEJSCA WYWOŁANIA.
 *
 * ⛔ CO BYŁO ZŁE. Podpis kończył się zawsze zdaniem „Kolejne N zapisujesz
 * w pełnej karcie meczu". Na „Dziś" to jest WSKAZÓWKA — mówi, dokąd iść.
 * ⛔ W `app/(tabs)/mecz.tsx`, gdzie ten sam podpis stoi od 19.08 (pas M2),
 * to jest ODESŁANIE TAM, GDZIE ZAWODNIK JUŻ STOI — czyli ślepy zaułek.
 *
 * ⭐ ROZWIĄZANE PARAMETREM, A NIE DRUGIM BRZMIENIEM WPISANYM W EKRAN.
 * Drugie brzmienie tej samej rzeczy w pliku ekranu byłoby drugim słownikiem
 * (O92) i rozjechałoby się przy pierwszej zmianie liczby rzeczy.
 * ⛔ PARAMETR JEST OBOWIĄZKOWY. Wartość domyślna znaczyłaby, że nowy wołający
 * dostaje wariant „idź do pełnej karty" po cichu — czyli dokładnie ten defekt,
 * który ten pas usuwa.
 *
 * ⚠️ OBIE LICZBY SĄ WYLICZANE Z `RZECZY_O_MECZU`. ⛔ Ani jednej nie wolno
 * wpisać ręcznie: po przeniesieniu rzeczy między miejscami ręczna liczba
 * zostałaby stara, a zdanie brzmiałoby dalej wiarygodnie.
 */
export function podpisArkuszaMeczu(gdzie: 'ocena_z_kafla' | 'pelna_karta'): string {
  const wArkuszu = rzeczyMeczu('arkusz_wiecej').length;
  const wKarcie = rzeczyMeczu('pelna_karta').length;
  const wstep = `${wArkuszu} rzeczy, których nie ma w ocenie z kafla. `
    + 'Żadna nie jest obowiązkowa. ';
  if (gdzie === 'pelna_karta') {
    // ⛔ BRZMIENIE DO PRZEJRZENIA PRZEZ KUBĘ — widoczne dla zawodnika, nowe
    // w tym pasie. Mówi, że pozostałe rzeczy są NA TYM EKRANIE, i nie wysyła
    // nikogo tam, gdzie już jest.
    return `${wstep}Pozostałe ${wKarcie} masz na tym ekranie.`;
  }
  return `${wstep}Kolejne ${wKarcie} zapisujesz w pełnej karcie meczu.`;
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

/**
 * ⭐ PLAN-D-M3 21.08.2026 — ⛔ ZERO NOWYCH SŁÓW. To jest CO DO ZNAKU `napis`
 * wiersza `game_type` w `RZECZY_O_MECZU`; ta stała istnieje wyłącznie po to,
 * żeby ekran miał co narysować i żeby strażnik miał czego szukać.
 */
export const POLE_RODZAJ_MECZU = 'Jaki to był mecz';
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
  // ⭐⭐ PLAN-D-M3 21.08.2026 — RODZAJ MECZU STOI PIERWSZY, tak jak w pełnej
  // karcie. ⛔ Kolejność NIE JEST kosmetyką: strażnik porównuje tę listę
  // z `rzeczyMeczu('arkusz_wiecej')` NA RÓWNOŚĆ, razem z kolejnością.
  { kolumna: 'game_type', stala: 'POLE_RODZAJ_MECZU', etykieta: POLE_RODZAJ_MECZU },
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
 * ⭐⭐ PLAN-D-M3 21.08.2026 — CZTERY RODZAJE MECZU, JEDNO ŹRÓDŁO NAZW.
 *
 * ⛔ DECYZJA KUBY Z 21.08.2026, jego słowami: „Skoro jest mecz oficjalny,
 * to musi być też mecz sparingowy."
 *
 * ⛔ DLACZEGO TU, A NIE W EKRANIE. Do 21.08 ta mapa (`GAME_TYPE_LABELS`) żyła
 * WYŁĄCZNIE w `app/(tabs)/mecz.tsx`. Od tego pasa rodzaj meczu stoi także
 * w arkuszu spod kafla (`app/(tabs)/dzis.tsx`), więc druga ręczna kopia
 * czterech napisów rozjechałaby się przy pierwszej zmianie (O92).
 * ⚠️ Wartości są CO DO ZNAKU te, które stoją w CHECK-u `match_contexts.game_type`
 * (zmierzone 21.08.2026: `official_match`, `friendly`, `training_game`,
 * `tournament`), a napisy — te, które stały w `GAME_TYPE_LABELS`.
 * ⛔ ZERO NOWYCH SŁÓW WIDOCZNYCH DLA ZAWODNIKA.
 */
export const RODZAJE_MECZU: readonly { wartosc: string; napis: string }[] = [
  { wartosc: 'official_match', napis: 'Mecz oficjalny' },
  { wartosc: 'friendly', napis: 'Sparing' },
  { wartosc: 'training_game', napis: 'Gierka treningowa' },
  { wartosc: 'tournament', napis: 'Turniej' },
];

/**
 * ⛔⛔ RODZAJ MECZU, GDY ZAWODNIK NIC NIE WSKAZAŁ — PODSTAWIENIE, NIE POMIAR.
 *
 * ⚠️ TO JEST WARTOŚĆ ZAPISYWANA, A NIE ODPOWIEDŹ ZAWODNIKA.
 * `match_contexts.game_type` jest `NOT NULL` z CHECK-iem na cztery wartości,
 * więc przy zapisie trzeba wpisać COKOLWIEK, także wtedy, gdy nikt o rodzaj
 * nie zapytał albo zawodnik świadomie nie wskazał (Z6 — ani jedna wartość nie
 * jest zaznaczona z góry).
 *
 * ⭐ GDZIE ZAWODNIK TO POPRAWIA — JEDNYM DOTKNIĘCIEM. W arkuszu „powiedz
 * więcej o tym meczu", otwieranym prosto z kafla na „Dziś": pozycja
 * `game_type` stoi w `RZECZY_O_MECZU` w miejscu `arkusz_wiecej` (od 21.08),
 * a `POLA_ARKUSZA` wiąże ją ze stałą `POLE_RODZAJ_MECZU`, którą rysuje ekran.
 * Ta sama rzecz stoi też w pełnej karcie meczu (`app/(tabs)/mecz.tsx`).
 *
 * ⛔ CO Z TEGO WYNIKA DLA BRZMIEŃ. Wiersz z tą wartością znaczy „oficjalny
 * ALBO nikt nie zapytał" — tych dwóch stanów NIE DA SIĘ w bazie odróżnić.
 * Dlatego produktowi NIE WOLNO napisać o takim wierszu „Mecz oficjalny" jako
 * o fakcie; służy do tego `napisRodzajuZapisanegoMeczu()`.
 */
export const RODZAJ_MECZU_Z_KAFLA = 'official_match';

/**
 * ⛔ ZERO NOWYCH SŁÓW: ten napis stał już w `app/(tabs)/mecz.tsx` jako
 * `GAME_TYPE_LABELS[gameType] || 'Mecz'`. Jest neutralny i prawdziwy w obu
 * stanach, których nie umiemy rozróżnić.
 */
export const MECZ_RODZAJ_BEZ_WSKAZANIA = 'Mecz';

/** Napis rodzaju albo `null`, gdy wartość jest spoza słownika. */
function napisZeSlownika(wartosc: string | null): string | null {
  if (typeof wartosc !== 'string') return null;
  return RODZAJE_MECZU.find((r) => r.wartosc === wartosc)?.napis ?? null;
}

/**
 * ⭐ CO ZAWODNIK WSKAZAŁ W TEJ WIZYCIE — tu wiemy, więc mówimy.
 * `null` = jeszcze nie wskazał → napis neutralny.
 */
export function napisRodzajuMeczu(wybor: string | null): string {
  return napisZeSlownika(wybor) ?? MECZ_RODZAJ_BEZ_WSKAZANIA;
}

/**
 * ⛔⛔ CO WOLNO POWIEDZIEĆ O WIERSZU, KTÓRY JUŻ LEŻY W BAZIE (Z0).
 *
 * ⛔ `official_match` w bazie NIE ZNACZY „zawodnik powiedział, że to był mecz
 * oficjalny". Znaczy „albo powiedział, albo nikt go nie zapytał i produkt
 * podstawił `RODZAJ_MECZU_Z_KAFLA`". Napisanie o takim wierszu „Mecz oficjalny"
 * jest podaniem PRAWDOPODOBNEGO jako PEWNEGO — czyli tym samym defektem,
 * który ten pas usuwa u źródła.
 * ⭐ Trzy pozostałe wartości mogły wziąć się WYŁĄCZNIE ze wskazania zawodnika
 * (produkt nigdy ich nie podstawia), więc te wolno podać jako fakt.
 */
export function napisRodzajuZapisanegoMeczu(gameType: string | null): string {
  if (gameType === RODZAJ_MECZU_Z_KAFLA) return MECZ_RODZAJ_BEZ_WSKAZANIA;
  return napisZeSlownika(gameType) ?? MECZ_RODZAJ_BEZ_WSKAZANIA;
}

/**
 * ⛔ STANY CIAŁA PRZED MECZEM — te same trzy, które zna `lib/matchCascade.ts`
 * i CHECK kolumny `match_contexts.entered_recovery_state`. ⛔ Wartość spoza
 * tej listy nie idzie do bazy: baza odrzuciłaby ją komunikatem, którego
 * zawodnik nie umie przeczytać.
 */
export const STANY_CIALA_PRZED_MECZEM: readonly string[] =
  ['entered_fatigued', 'entered_fresh', 'uncertain'];

/**
 * ⭐ WSZYSTKO O MECZU POZA CZTEREMA RZECZAMI ZE ŚCIEŻKI OCENY.
 * ⚠️ PLAN-D-M3 21.08.2026 — ten typ przestał być „sześcioma polami arkusza"
 * i jest dziś WEJŚCIEM JEDNEJ DECYZJI O ZAPISIE dla OBU ekranów. Pola, których
 * dany ekran nie rysuje, przychodzą jako `null` i nie idą do bazy.
 * ⛔ Nazwanie ich tutaj jest tańsze niż drugi typ i druga funkcja zapisu —
 * a druga funkcja zapisu znaczyłaby dwa wiersze na jeden mecz.
 */
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
  /**
   * ⭐⭐ PLAN-D-M3 — RODZAJ MECZU WSKAZANY PRZEZ ZAWODNIKA.
   * ⛔ `null` = NIE WSKAZAŁ. To NIE JEST `official_match` (R5): przy zapisie
   * podstawiamy `RODZAJ_MECZU_Z_KAFLA`, bo kolumna jest `NOT NULL`, ale ten
   * typ trzyma te dwa stany osobno — inaczej produkt nie umiałby powiedzieć,
   * czy ktokolwiek o rodzaj zapytał.
   */
  rodzajMeczu?: string | null;
  /** ⭐ PLAN-D-M3 — `match_contexts.role`. Wolny tekst, `null` = nie podał. */
  rola?: string | null;
  /**
   * ⭐ PLAN-D-M3 — `match_contexts.entered_recovery_state`.
   * ⛔ Wartość z `STANY_CIALA_PRZED_MECZEM` albo `null`.
   */
  stanCiala?: string | null;
};

export const PUSTE_WIECEJ_O_MECZU: WiecejOMeczu = {
  samoocena: null, stanMentalny: null, wymagajaceWarunki: null,
  pozycja: null, bramkiMy: null, bramkiOni: null, notatka: null,
  rodzajMeczu: null, rola: null, stanCiala: null,
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
  /**
   * ⭐⭐ PLAN-D-M3 21.08.2026 — DWIE KOLUMNY, KTÓRE ZAPISYWAŁA WYŁĄCZNIE
   * PEŁNA KARTA MECZU WŁASNĄ DROGĄ.
   * ⛔ Bez nich podpięcie `app/(tabs)/mecz.tsx` pod tę funkcję PRZESTAŁOBY
   * ZAPISYWAĆ dwa pytania, które ten ekran od zawsze zadaje — czyli byłoby
   * kasowaniem pytań z pełnej karty pod pozorem porządkowania (B3).
   */
  role: string | null;
  entered_recovery_state: string | null;
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
  & { calendar_event_id?: number }
  /**
   * ⭐⭐ PLAN-D-M3 21.08.2026 — RODZAJ MECZU DA SIĘ POPRAWIĆ W ISTNIEJĄCYM
   * WIERSZU. Bez tego zawodnik, który ocenił sparing z kafla, a rodzaj wskazał
   * dopiero przy drugim dotknięciu, zostawałby z podstawioną wartością na stałe.
   * ⛔ `string`, nie `string | null`: kolumna jest `NOT NULL`, a dokładanie
   * NIE MA PRAWA skasować rodzaju, który wiersz już ma — to ten sam zakaz,
   * co przy `calendar_event_id` (pas D2).
   */
  & { game_type?: string };

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

function tekstAlbo(x: string | null | undefined): string | null {
  if (typeof x !== 'string') return null;
  const t = x.trim();
  return t === '' ? null : t;
}

/** ⛔ Wartość spoza słownika nie idzie do bazy — CHECK i tak by ją odrzucił. */
function zeSlownikaAlbo(x: string | null | undefined, slownik: readonly string[]): string | null {
  const t = tekstAlbo(x ?? null);
  return t !== null && slownik.includes(t) ? t : null;
}

/**
 * ⭐⭐ PLAN-D-M3 21.08.2026 — CO WPISUJEMY W `game_type` I CZY TO POMIAR.
 *
 * ⛔ DWA STANY, KTÓRE MUSZĄ ZOSTAĆ ROZRÓŻNIONE PO DRODZE, choć w bazie
 * zlewają się w jedną wartość:
 *   • `wskazany: true`  — zawodnik wskazał rodzaj. To jest ODPOWIEDŹ.
 *   • `wskazany: false` — nie wskazał (albo wskazał coś spoza słownika).
 *     Wtedy idzie `RODZAJ_MECZU_Z_KAFLA`, bo kolumna jest `NOT NULL` —
 *     ⛔ to jest PODSTAWIENIE, nie pomiar, i tylko dzięki temu polu produkt
 *     wie, że przy DOKŁADANIU nie wolno nadpisać cudzego wskazania.
 */
export function ustalRodzajMeczu(wybor: string | null | undefined): {
  wartosc: string; wskazany: boolean; powod: string;
} {
  const wskazanie = zeSlownikaAlbo(wybor, RODZAJE_MECZU.map((r) => r.wartosc));
  if (wskazanie === null) {
    return {
      wartosc: RODZAJ_MECZU_Z_KAFLA,
      wskazany: false,
      powod: `⚠️ rodzaju meczu nikt nie wskazał — podstawiam \`${RODZAJ_MECZU_Z_KAFLA}\`, `
        + 'bo kolumna jest NOT NULL; to jest podstawienie, nie pomiar',
    };
  }
  return { wartosc: wskazanie, wskazany: true, powod: `rodzaj wskazany: ${wskazanie}` };
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
  // ⭐⭐ PLAN-D-M3 — RODZAJ MECZU LICZY SIĘ TAK SAMO JAK WIĄZANIE: przed
  // zapisem, jedną regułą, dla obu ekranów.
  const rodzaj = ustalRodzajMeczu(w.wiecej.rodzajMeczu);

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
    // ⭐⭐ PLAN-D-M3 — DWA PYTANIA PEŁNEJ KARTY. Ekran, który ich nie zadaje,
    // podaje `null` i nic tu nie zapisuje.
    role: tekstAlbo(w.wiecej.rola),
    entered_recovery_state: zeSlownikaAlbo(w.wiecej.stanCiala, STANY_CIALA_PRZED_MECZEM),
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
      // ⛔ Wiązanie DOKŁADAMY, gdy je mamy, i NIGDY nie kasujemy, gdy go nie mamy.
      // ⛔ TAK SAMO RODZAJ MECZU (M3): idzie do `update` WYŁĄCZNIE wtedy, gdy
      // zawodnik go wskazał. Wysłanie podstawienia przy każdym dokładaniu
      // NADPISYWAŁOBY „Sparing" na „official_match" po cichu — czyli produkt
      // kasowałby odpowiedź, którą sam dostał.
      zmiany: {
        ...pola,
        ...(wiazanie.rodzaj === 'jest' ? { calendar_event_id: wiazanie.idWydarzenia } : {}),
        ...(rodzaj.wskazany ? { game_type: rodzaj.wartosc } : {}),
      },
      powod: `dokładam do wiersza ${w.stan.id} — ⛔ drugi wiersz liczyłby ten sam mecz drugi raz`
        + ` · wiązanie: ${wiazanie.rodzaj === 'jest' ? `wydarzenie ${wiazanie.idWydarzenia}` : wiazanie.powod}`
        + ` · ${rodzaj.powod}`,
    };
  }
  return {
    rodzaj: 'wstaw',
    wiersz: {
      user_id: w.idZawodnika,
      // ⭐⭐ PLAN-D-M3 21.08.2026 — WSKAZANIE ZAWODNIKA, A DOPIERO POTEM
      // PODSTAWIENIE. Do 21.08 stała szła tu NA SZTYWNO, więc sparing oceniony
      // z kafla lądował w bazie jako „Mecz oficjalny".
      game_type: rodzaj.wartosc,
      // ⭐⭐ PLAN-D-D2 §4.1 — TO JEST TA JEDNA KOLUMNA. Bez niej licznik pracy
      // nie ma czym zestawić wiersza meczu z wydarzeniem i liczy oba.
      calendar_event_id: wiazanie.rodzaj === 'jest' ? wiazanie.idWydarzenia : null,
      ...pola,
    },
    powod: 'pierwszy zapis tego meczu w tej wizycie'
      + ` · wiązanie: ${wiazanie.rodzaj === 'jest' ? `wydarzenie ${wiazanie.idWydarzenia}` : wiazanie.powod}`
      + ` · ${rodzaj.powod}`,
  };
}

/** ⛔ Jedno zdanie do logu — ten sam kształt, co reszta ekranu „Dziś". */
export function opisZapisuMeczuDoLogu(d: DecyzjaZapisuMeczu): string {
  if (d.rodzaj === 'nie_zapisuj') return `mecz: NIE ZAPISUJĘ — ${d.powod}`;
  if (d.rodzaj === 'aktualizuj') return `mecz: aktualizuję id=${d.id} — ${d.powod}`;
  return `mecz: wstawiam nowy wiersz — ${d.powod}`;
}
