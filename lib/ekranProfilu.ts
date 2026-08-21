// PLAN-D-A3 08.2026 (18.08.2026) — NOWY PLIK. Model ekranu 2 „Profil".
//
// ═════════════════════════════════════════════════════════════════════
// PO CO TO ISTNIEJE
// ═════════════════════════════════════════════════════════════════════
// Ekran „Profil" pokazuje DWIE MIARY obok siebie, jedno zdanie o pracy
// dodatkowej i pięć pozycji za dotknięciem. Każda z tych rzeczy ma regułę,
// którą da się zepsuć po cichu — a ekran Reacta nie jest miejscem, w którym
// reguła może mieszkać: nie da się jej uruchomić bez telefonu.
//
// Dlatego CAŁA arytmetyka i WSZYSTKIE brzmienia ekranu 2 stoją tutaj,
// a `app/(tabs)/ja.tsx` wyłącznie je rysuje.
//
// ⛔ CZEGO W TYM PLIKU NIE MA I NIE MA PRAWA BYĆ:
//   • Reacta i Supabase — ten plik nie wie, skąd biorą się wiersze,
//   • zegara — dzisiejszą datę podaje wołający (i dziś nikt jej nie podaje,
//     bo żadna liczba tego ekranu nie ma okna),
//   • kopii `MAPA_PRACY_WLASNEJ` ani kopii tabeli `PROGI` — obie są czytane
//     z modułów produktu na żywo. Kopia rozjechałaby się przy pierwszej
//     poprawce i OBA miejsca wyglądałyby poprawnie.
//
// ═════════════════════════════════════════════════════════════════════
// ⭐⛔ NAJWAŻNIEJSZE ZDANIE TEGO PLIKU — SKĄD BIERZE SIĘ OBCIĄŻENIE
// ═════════════════════════════════════════════════════════════════════
// ⚠️ CO BYŁO ZEPSUTE DO 18.08.2026 (pas A3 nazwał to, pas D1 naprawił):
// `policzObciazenieWOknie` WYGLĄDAŁO na gotową miarę obciążenia i nią NIE
// BYŁO. Sumowało `j.punkty`, a `j.punkty` niesie w sobie TRAFNOŚĆ: ta sama
// sesja 30 min × RPE 5 ważyła 1,0 przy trafności 1,0 i 1,5 przy 1,5.
// Podpięcie tego pod liczbę nazwaną „OBCIĄŻENIE" powiedziałoby zawodnikowi,
// że TRAFNIEJSZA PRACA BARDZIEJ OBCIĄŻA CIAŁO — czyli odwrotność tezy
// produktu (ROZWÓJ = OBCIĄŻENIE × TRAFNOŚĆ).
//
// ⭐ OD PASA D1 (18.08.2026) obciążenie liczy `lib/obciazenie.ts` wzorem
// `minuty × ciężkość ⁄ przelicznik`, a okno kroczące — `lib/obciazenieOstatnichDni.ts`.
// ⛔ ŻADEN Z TYCH DWÓCH PLIKÓW NIE IMPORTUJE ANI JEDNEJ NAZWY
// z `lib/nagrodaZaPrace.ts` ani z `lib/zwrotObszaru.ts`. Trafność nie ma
// tam drogi — to jest brak połączenia, a nie dyscyplina do zapamiętania.
//
// ⛔ ZAPADKA PRZECELOWANA, NIE SKASOWANA. Pas A3 pilnował, że `obciazenie7`
// ma jeden osiągalny wariant `nie_policzone`. Od pasa D1 w jej miejsce stoi
// asercja mocniejsza i URUCHAMIANA: te same odczyty, raz ze zwrotem obszarów
// i raz bez niego, muszą dać RÓŻNY rozwój i IDENTYCZNE obciążenie.
//
// ⛔ TEN PLIK MA JEDNO POLE, KTÓREGO WCZEŚNIEJ NIE MIAŁ: `dzis`. Okno
// kroczące bez dzisiejszej daty nie istnieje. ⛔ Zegara tu nadal nie ma —
// datę podaje ekran, tak samo jak wszędzie indziej w tym repozytorium.

import {
  PROGI,
  type NagrodaZaPrace,
  type Prog,
  type WejscieNagrody,
  type WejscieZrodla,
  type SegmentyCelow,
  type WierszDziennika,
  type WierszOdpowiedziKontrolnej,
  type WierszWydarzeniaDoNagrody,
  jednostkiZDziennika,
  policzNagrode,
  jednostkiZMeczow,
  jednostkiZOdpowiedziKontrolnych,
  zrodloSesji,
  zrodloNieczytane,
} from './nagrodaZaPrace';
import {
  dzienZeZnacznika,
  liczbaObciazeniaNaEkran,
  type SesjaObciazenia,
} from './obciazenie';
import {
  OKNO_OBCIAZENIA_DNI,
  OKNO_ODNIESIENIA_DNI,
  policzObciazenieWOknie,
  zrodloObciazeniaNieczytane,
  type ObciazenieWOknie,
  type WejscieObciazenia,
} from './obciazenieOstatnichDni';
// ⭐⭐ PAS P1 19.08.2026 — PRZEMIANOWANIE WIERSZA MECZU MA JEDNO MIEJSCE
// W CAŁYM PRODUKCIE, i to nie jest ten plik. `lib/wejsciaWgladow.ts` jest
// czytane, nie kopiowane — druga kopia rozjechałaby się przy pierwszej
// poprawce i OBA miejsca wyglądałyby poprawnie.
import { meczDlaNagrody, type WierszMeczuWgl } from './wejsciaWgladow';
import { WERDYKTY_NIEPODANE } from './wykonanieSesji';
import {
  MAPA_PRACY_WLASNEJ,
  ocenPraceWlasna,
  policzZwrotObszarow,
  type ObszarZeZwrotem,
  type OcenaPracyWlasnej,
  type ZwrotObszarow,
} from './zwrotObszaru';

// ═════════════════════════════════════════════════════════════════════
// 1. SKĄD BIERZE SIĘ POZYCJA — i dlaczego to jedna linijka decyduje o tym,
//    czy zdanie o pracy dodatkowej w ogóle padnie
// ═════════════════════════════════════════════════════════════════════
//
// ⛔ ZMIERZONE 18.08.2026 NA PRODUKCJI, nie założone. Konto `adam.bar@op.pl`:
//   `player_profiles.position_primary` = NULL
//   `diagnostics.position`             = „Boczny obrońca"
// Czytane z profilu: „nie znam pozycji" i zdanie NIE PADA. Czytane z diagnozy:
// sześć obszarów trafnych i „z 4 rzeczy trafiają 2" — dosłownie zdanie
// z makiety, u zawodnika BEZ ANI JEDNEGO WPISU.
//
// ⭐ Dlatego pozycja czyta się Z DIAGNOZY, z odwrotem do profilu — i produkt
// ZAPISUJE, z którego źródła wyszła (Z0: nie podajemy prawdopodobnego jako
// pewnego, więc źródło musi być widoczne w wyniku, a nie domyślane).

export type ZrodloPozycji = 'diagnoza' | 'profil' | 'nie_znam';

export type WybranaPozycja = {
  /** ⛔ `null` znaczy „nie znam", a nie „zawodnik nie ma pozycji". */
  pozycja: string | null;
  zrodlo: ZrodloPozycji;
};

function niepustyNapis(x: unknown): string | null {
  return typeof x === 'string' && x.trim().length > 0 ? x.trim() : null;
}

/**
 * ⭐ Pozycja zawodnika: NAJPIERW diagnoza, POTEM profil. Wynik zawsze niesie
 * źródło — liczba bez źródła jest zgadywaniem.
 */
export function wybierzPozycje(args: {
  /** `diagnostics.position` najnowszej diagnozy z czytelnymi wynikami. */
  zDiagnozy: string | null;
  /** `player_profiles.position_primary`. */
  zProfilu: string | null;
}): WybranaPozycja {
  const d = niepustyNapis(args.zDiagnozy);
  if (d !== null) return { pozycja: d, zrodlo: 'diagnoza' };
  const p = niepustyNapis(args.zProfilu);
  if (p !== null) return { pozycja: p, zrodlo: 'profil' };
  return { pozycja: null, zrodlo: 'nie_znam' };
}

// ═════════════════════════════════════════════════════════════════════
// 2. TRZY WARTOŚCI W KAŻDYM POLU — nie dwie (R5)
// ═════════════════════════════════════════════════════════════════════

/**
 * ⭐ ROZWÓJ. ⛔ NIE MA OKNA i NIGDY NIE MALEJE — dlatego w tym typie nie ma
 * ani słowa o dniach, a `nie_policzone` ŚWIADOMIE NIE MA POLA `punkty`:
 * gdyby miało, dałoby się narysować „0" na miejscu, w którym prawdą jest
 * „nie wiem".
 */
export type RozwojNaEkranie =
  | { rodzaj: 'jest'; punkty: number; jednostki: number }
  /** ⭐ Policzyłem i wyszło zero. ⛔ To NIE JEST to samo co „nie policzyłem". */
  | { rodzaj: 'jeszcze_nic' }
  | { rodzaj: 'nie_policzone'; powod: string };

/**
 * ⭐ OBCIĄŻENIE · OKNO KROCZĄCE. TRZY WARTOŚCI, I TRZECIA NIE JEST OZDOBĄ (R5).
 *
 *   `policzone`    — jest liczba i jest z czego ją policzyć;
 *   `nic_nie_wazy` — odczyt się udał i w oknie nic nie waży. ⛔ To NIE JEST awaria
 *                    i ⛔ NIE MA POLA `liczba` — zera nie ma z czego narysować;
 *   `nie_policzone`— któregoś źródła nie odczytałem.
 *
 * ⛔ Ani w jednym wariancie nie ma miejsca na przymiotnik, próg ani barwę.
 * Obciążenie jest faktem o zawodniku, nie werdyktem o nim.
 */
export type ObciazenieNaEkranie =
  | {
    rodzaj: 'policzone';
    /** ⭐ Gotowy napis, zaokrąglony RAZ. ⛔ Ekran nie zaokrągla po raz drugi. */
    liczba: string;
    podpis: string;
    /** ⭐ Okno odniesienia jako FAKT. `null` = nie ma czym go podać. */
    odniesienie: string | null;
    /** ⛔ Sesje w oknie bez minut albo bez ciężkości — nazwane, nie doliczone. */
    bezLiczby: number;
  }
  | { rodzaj: 'nic_nie_wazy'; powod: string }
  | { rodzaj: 'nie_policzone'; powod: string };

/** Dlaczego zdania o pracy dodatkowej nie ma. ⛔ Cztery różne braki, cztery zdania. */
export type PowodBrakuPracyDodatkowej =
  | 'brak_diagnozy'
  | 'brak_pozycji'
  | 'nie_umiem_policzyc'
  | 'brak_deklaracji';

export type PracaDodatkowaNaEkranie =
  | {
    rodzaj: 'jest';
    /** Ile rzeczy zawodnik robi dodatkowo (rozpoznanych przez mapę). */
    ile: number;
    /** Ile z nich trafia w największy zwrot. */
    trafia: number;
    trafiaja: readonly string[];
    nieTrafiaja: readonly string[];
    /** ⭐ Rodzaje spoza mapy — nazwane, nie pominięte. */
    nieznaneRodzaje: readonly string[];
  }
  | { rodzaj: 'nie_wiemy'; powod: PowodBrakuPracyDodatkowej; szczegol: string };

// ═════════════════════════════════════════════════════════════════════
// 3. BRZMIENIA — wszystkie w jednym miejscu
// ═════════════════════════════════════════════════════════════════════
// ⚠️ BRZMIENIA — DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-A3, 18.08.2026).

export const BRZMIENIE_DO_PRZEJRZENIA_A3 = 'DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-A3, 18.08.2026)';

export const TYTUL_EKRANU = 'TWÓJ PROFIL';

/** ⛔ Dwa rzeczowniki, dwa różne słowa. Nigdy sklejone w jedno (N1, O92). */
export const NAZWA_ROZWOJU = 'Rozwój';
/**
 * ⛔ DŁUGOŚĆ OKNA WCHODZI TU ZE STAŁEJ, a nie z palca. Do 18.08 stała tu
 * siódemka wpisana ręcznie — czyli druga kopia liczby, która przy pierwszej
 * poprawce rozjechałaby się z oknem i nadal wyglądała poprawnie.
 */
export const NAZWA_OBCIAZENIA = `Obciążenie · ${OKNO_OBCIAZENIA_DNI} dni`;

/** ⛔ Jednostka rozwoju. Słowo „jednostka pracy" nie wraca — nie ma desygnatu. */
export const JEDNOSTKA_ROZWOJU_WIELE = 'punktów rozwoju';
export const JEDNOSTKA_ROZWOJU_JEDEN = 'punkt rozwoju';
/** ⛔ Druga miara ma WŁASNY rzeczownik. Nigdy „punkty" bez przymiotnika. */
export const JEDNOSTKA_OBCIAZENIA_WIELE = 'punktów obciążenia';

/** ⭐ Rozwój nie ma okna — i to zdanie jest jedyną rzeczą, która to mówi. */
export const ROZWOJ_PODPIS = 'rośnie, nigdy nie maleje';
export const ROZWOJ_JESZCZE_NIC =
  'Jeszcze żadnego. Ruszy z pierwszą rzeczą, którą oznaczysz jako zrobioną — i nigdy potem nie wróci do zera.';
export const ROZWOJ_NIE_POLICZONE = (powod: string) =>
  `Nie udało mi się tego policzyć (${powod}). To nie znaczy, że nie masz dorobku — pociągnij w dół.`;

/**
 * ⭐ BRZMIENIA OBCIĄŻENIA — wszystkie tutaj. ⛔ Ani jednego przymiotnika
 * o tym, jaka ta liczba jest, ani jednego progu, ani jednej barwy.
 * ⛔ Słowa skali dnia („lekko", „bardzo ciężko") NIE PADAJĄ na tym ekranie:
 * `slowoObciazenia` opisuje POJEDYNCZY DZIEŃ na widoku tygodnia, a nie sumę
 * z okna — a przy sumie każde takie słowo byłoby werdyktem o zawodniku.
 */
export const OBCIAZENIE_NIE_POLICZONE_POWOD =
  'nie udało mi się odczytać wszystkiego, z czego liczy się obciążenie';
export const OBCIAZENIE_NIE_POLICZONE_ZDANIE = (powod: string) =>
  `Nie policzone — ${powod}. To nie znaczy, że nic nie robisz; znaczy, że nie mam z czego policzyć.`;
/** ⛔ Znak w miejscu liczby. Nie „0" — zero byłoby pomiarem, którego nie ma. */
export const OBCIAZENIE_ZAMIAST_LICZBY = '—';

/** ⭐ Jednostka i jedyna własność miary, którą wolno napisać obok liczby. */
export const OBCIAZENIE_PODPIS = `${JEDNOSTKA_OBCIAZENIA_WIELE}, ostatnie ${OKNO_OBCIAZENIA_DNI} dni · może spaść i to jest w porządku`;

/**
 * ⭐ OKNO ODNIESIENIA JAKO GOŁY FAKT. ⛔ Bez procentu, bez przymiotnika
 * i bez prognozy: model jest liniowy, a ryzyko urazu nie jest (Z0).
 */
export const OBCIAZENIE_ODNIESIENIE = (liczba: string) =>
  `Ostatnie ${OKNO_ODNIESIENIA_DNI} dni: ${liczba} ${JEDNOSTKA_OBCIAZENIA_WIELE}.`;

/**
 * ⛔ NIC NIE WAŻY W OKNIE — i to jest coś innego niż „nie policzyłem".
 * ⚠️ Dwa różne zdania, bo to są dwa różne fakty o zawodniku (R5): brak zapisów
 * kontra zapisy bez dwóch liczb, z których obciążenie w ogóle powstaje.
 */
export const OBCIAZENIE_NIC_NIE_WAZY =
  'W tym oknie nie ma ani jednej pracy. To nie jest zero — to jest brak zapisu.';
export const OBCIAZENIE_BEZ_LICZBY = (ile: number) =>
  `${ile === 1 ? 'Jedna praca w tym oknie nie ma' : `${ile} prace w tym oknie nie mają`} `
  + 'podanych minut albo tego, jak było — a bez obu tych liczb nie ma z czego policzyć obciążenia. '
  + 'To nie jest zero.';

export const PRACA_DODATKOWA_ZDANIE = (ile: number, trafia: number) =>
  `Z ${liczebnikDopelniacz(ile)} rzeczy, które robisz dodatkowo, w Twój największy zwrot `
  + `${trafia === 1 ? 'trafia' : 'trafiają'} ${liczebnikMianownik(trafia)}.`;
export const PRACA_DODATKOWA_ZERO_TRAFIEN =
  'Nic z tego, co robisz dodatkowo, nie trafia dziś w Twój największy zwrot. ⛔ To nie znaczy, że ta praca jest bez wartości — znaczy, że ta sama godzina gdzie indziej daje więcej.';
export const PRACA_DODATKOWA_WEJSCIE = 'Skąd to wiemy →';

/**
 * ⭐ CZTERY RÓŻNE BRAKI, CZTERY RÓŻNE ZDANIA (D3).
 * ⛔ Sklejenie dwóch w jedno zapala strażnika: zawodnik, który czyta jedno
 * zdanie na cztery różne przyczyny, nie wie, co ma zrobić.
 */
export const PRACA_DODATKOWA_BRAK: Readonly<Record<PowodBrakuPracyDodatkowej, string>> = {
  brak_diagnozy:
    'Nie wiemy jeszcze, w co celujesz — nie masz wyników diagnozy. Bez nich nie ma z czego policzyć, co daje Ci największy zwrot.',
  brak_pozycji:
    'Nie wiemy jeszcze, w co celujesz — nie znamy Twojej pozycji. Ten sam wynik znaczy co innego u bramkarza i u napastnika.',
  nie_umiem_policzyc:
    'Nie umiem tego policzyć z Twojej diagnozy. Nie zgadujemy — puste miejsce nazywamy, a nie wypełniamy założeniem.',
  brak_deklaracji:
    'Nie powiedziałeś jeszcze, co robisz dodatkowo poza treningiem z drużyną. Dopóki tego nie wiemy, nie ma czego z czym porównać.',
};

/**
 * ⭐ PIĘĆ POZYCJI. ⛔ Wiersz „Moje zadania" ZDJĘTY z tego ekranu świadomie —
 * zadanie żyje w dniu i należy do ekranu 1 (wpis w
 * `claude/REJESTR_UTRACONEGO_DOSTEPU.md`).
 */
export type KluczPozycji = 'odznaki' | 'dane' | 'skad' | 'nazewnatrz' | 'ustawienia';

export const KOLEJNOSC_POZYCJI: readonly KluczPozycji[] =
  ['odznaki', 'dane', 'skad', 'nazewnatrz', 'ustawienia'];

export const TYTULY_POZYCJI: Readonly<Record<KluczPozycji, string>> = {
  odznaki: 'Odznaki i progi',
  dane: 'Moje dane i cel',
  skad: 'Skąd to wiemy',
  nazewnatrz: 'Co o Tobie wychodzi na zewnątrz',
  ustawienia: 'Ustawienia i konto',
};

/**
 * ⭐ PRZYPIS EKRANU. ⚠️ TO JEST JEDYNE MIEJSCE W TYM PLIKU, W KTÓRYM WOLNO
 * UŻYĆ SŁÓW O PORÓWNANIU I O SERII — bo ono mówi, że TEGO TU NIE MA.
 * Strażnik N3 sprawdza ten plik po USUNIĘCIU tej stałej i wtedy nie wolno
 * mu znaleźć ani jednego takiego słowa.
 */
export const PRZYPIS_CZEGO_TU_NIE_MA =
  'Czego tu nie ma: miejsca w tabeli, poziomów, serii dni z rzędu i ani jednej liczby o tym, ile robią inni.';

/**
 * ⭐ Podpis nagłówka: imię i wiek. ⛔ Ani jednej z tych rzeczy nie zgadujemy —
 * brak rocznika daje NAZWANY brak, nie „0 lat".
 * ⛔ Ten moduł nie ma zegara: rok bieżący podaje wołający.
 */
export function podpisNaglowka(a: {
  imie: string | null;
  rocznik: number | null;
  rokTeraz: number;
}): string {
  const imie = niepustyNapis(a.imie);
  const wiek = typeof a.rocznik === 'number' && Number.isFinite(a.rocznik) && a.rocznik > 1900
    ? a.rokTeraz - a.rocznik
    : null;
  if (imie === null && wiek === null) return 'nie znamy jeszcze ani imienia, ani rocznika';
  if (wiek === null) return `${imie} · rocznik nie podany`;
  if (imie === null) return `${wiek} lat · imię nie podane`;
  return `${imie}, ${wiek} lat`;
}

/**
 * ⚠️ DWA PRZYPADKI, NIE JEDEN. „Z **czterech** rzeczy … trafiają **dwie**" —
 * pierwsza liczba jest w dopełniaczu, druga w mianowniku. Jedna tablica dawała
 * „trafiają dwóch", czyli zdanie, którego piętnastolatek nie przeczyta jako
 * poprawnego. ⛔ Zmierzone na prawdziwych kontach A i C, nie wyobrażone.
 */
function liczebnikDopelniacz(n: number): string {
  const slowa = ['zera', 'jednej', 'dwóch', 'trzech', 'czterech', 'pięciu', 'sześciu', 'siedmiu', 'ośmiu', 'dziewięciu'];
  return n >= 0 && n < slowa.length ? slowa[n] : String(n);
}
function liczebnikMianownik(n: number): string {
  const slowa = ['zero', 'jedna', 'dwie', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'];
  return n >= 0 && n < slowa.length ? slowa[n] : String(n);
}

/**
 * ⚠️ POLSKI MA TRZY FORMY, NIE DWIE: 1 wpis · 3 wpisy · 7 wpisów.
 * ⛔ Dwie formy dawały „3 wpisów" — liczbę poprawną w zdaniu niepoprawnym.
 */
export function formaLiczby(n: number, jeden: string, kilka: string, wiele: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a === 1) return jeden;
  if (b >= 2 && b <= 4 && (a < 12 || a > 14)) return kilka;
  return wiele;
}

// ═════════════════════════════════════════════════════════════════════
// 4. ⚠️ SZEŚĆ PROGÓW, A NIE PIĘĆ — rozstrzygnięte świadomie
// ═════════════════════════════════════════════════════════════════════
//
// Makieta rysuje PIĘĆ progów (1 · 10 · 40 · 150 · 400, wszystkie w mierze
// `punkty`). `PROGI` w `lib/nagrodaZaPrace.ts` ma SZEŚĆ: szósty to
// `praca_w_celu`, w mierze `punkty_w_celu`.
//
// ⭐ ROZSTRZYGNIĘCIE TEGO PASA: NA EKRAN WCHODZĄ WSZYSTKIE, KTÓRE ZNA SILNIK.
// ⛔ Odfiltrowanie szóstego byłoby zniknięciem bez wpisu (B3): próg istnieje,
// zawodnik może go zdobyć i `policzNagrode` już dziś go liczy. Odznaka, która
// przysługuje, a nie jest widoczna, jest gorsza niż odznaka, której nie ma.
//
// Filtr JEST — nazwany i z powodem — ale jest TOŻSAMOŚCIOWY. Gdyby kiedyś
// zawężał, jego nazwa i powód muszą się zmienić razem z nim, a strażnik
// porównuje liczbę progów na ekranie z `PROGI.length` PO tym filtrze.
export const NAZWA_FILTRU_PROGOW = 'wszystkie progi, które silnik umie policzyć';
export const POWOD_FILTRU_PROGOW =
  'Makieta zna pięć progów w mierze „punkty". Silnik ma szósty — „Praca nad swoim celem" '
  + 'w mierze „punkty w celu". Zawężenie do pięciu ukryłoby przed zawodnikiem próg, który '
  + 'mu przysługuje i który produkt już liczy. Dlatego filtr jest tożsamościowy, a szósty '
  + 'próg ma na ekranie napisane, w czym się liczy.';

export function progiNaEkranie(): readonly Prog[] {
  return PROGI.filter(() => true);
}

/** Nazwy miar w dopełniaczu — do zdania „brakuje Ci N …". */
export const NAZWA_MIARY: Readonly<Record<string, string>> = {
  punkty: JEDNOSTKA_ROZWOJU_WIELE,
  odpowiedzi_kontrolne: 'rzeczy domkniętych odpowiedzią',
  punkty_w_celu: 'punktów rozwoju w tym, co sam nazwałeś celem',
};

// ═════════════════════════════════════════════════════════════════════
// 5. MODEL EKRANU
// ═════════════════════════════════════════════════════════════════════

/** ⛔ `null` w każdym polu = „nie odczytałem", nigdy „nie masz". */
export type LiczbyZrodel = {
  wpisy: number | null;
  oceny: number | null;
  mecze: number | null;
  pomiary: number | null;
};

/** Cztery pola „Moje dane i cel" — każde w trzech stanach. */
export type DaneICel = {
  rocznik: number | null;
  wzrostPomiarow: number | null;
  pozycja: WybranaPozycja;
  cel: string | null;
};

export type PozycjaNaEkranie = {
  klucz: KluczPozycji;
  tytul: string;
  podpis: string;
  /** ⭐ Czy podpis mówi o TREŚCI, czy o jej braku. Dwa różne teksty, zawsze. */
  maTresc: boolean;
};

export type ModelProfilu = {
  tytul: string;
  rozwoj: RozwojNaEkranie;
  /** ⭐ Nazwa pola została — zmieniła się WYŁĄCZNIE wartość, którą niesie. */
  obciazenie7: ObciazenieNaEkranie;
  pracaDodatkowa: PracaDodatkowaNaEkranie;
  pozycje: readonly PozycjaNaEkranie[];
  przypis: string;
};

export type WejscieModelu = {
  nagroda: NagrodaZaPrace;
  /** Wynik `policzZwrotObszarow` dla tego zawodnika. */
  zwrot: ZwrotObszarow;
  /** Wynik `ocenPraceWlasna` dla tego zawodnika. */
  pracaWlasna: OcenaPracyWlasnej;
  /** Czy w ogóle mamy czytelną diagnozę (`diagnostics.scores`). */
  maDiagnoze: boolean;
  pozycja: WybranaPozycja;
  /** Surowe `diagnostics.own_training_types`. `null` = nie podał. */
  rodzajePracy: string | null;
  liczby: LiczbyZrodel;
  daneICel: DaneICel;
  /** Czy cokolwiek o zawodniku wychodzi na zewnątrz. `null` = nie odczytałem. */
  raportRodzicaIstnieje: boolean | null;
  /** ⭐ Okno kroczące 7 dni — wynik `policzObciazenieZOdczytow`. */
  obciazenieOkna: ObciazenieWOknie;
  /** ⭐ Okno odniesienia 28 dni — z tego samego wejścia, w jednym przebiegu. */
  obciazenieOdniesienia: ObciazenieWOknie;
};

/**
 * ⭐ ROZWÓJ NA EKRANIE. Trzy wartości i ani jednego okna.
 * ⛔ `nie_policzone` nie ma pola `punkty` — patrz komentarz przy typie.
 */
export function rozwojZNagrody(n: NagrodaZaPrace): RozwojNaEkranie {
  if (n.rodzaj === 'nie_policzona') {
    return { rodzaj: 'nie_policzone', powod: n.powod };
  }
  if (n.punkty <= 0) return { rodzaj: 'jeszcze_nic' };
  return { rodzaj: 'jest', punkty: n.punkty, jednostki: n.jednostki };
}

/**
 * ⭐⭐ OBCIĄŻENIE NA EKRANIE — z dwóch okien, bez ani jednego przymiotnika.
 *
 * ⛔ Ta funkcja NIE LICZY NICZEGO SAMA: dostaje dwa gotowe wyniki okna
 * i zamienia je na napisy. Cała arytmetyka stoi w `lib/obciazenie.ts`,
 * całe okno w `lib/obciazenieOstatnichDni.ts`.
 *
 * ⛔ Zaokrąglenie następuje RAZ, w `liczbaObciazeniaNaEkran`. Ekran dostaje
 * gotowy napis i nie ma go czym zaokrąglić drugi raz.
 */
export function obciazenieNaEkranie(
  okno: ObciazenieWOknie,
  odniesienie: ObciazenieWOknie,
): ObciazenieNaEkranie {
  if (okno.rodzaj === 'nie_policzone') {
    return { rodzaj: 'nie_policzone', powod: okno.powod };
  }
  if (okno.rodzaj === 'brak_pracy_w_oknie') {
    return {
      rodzaj: 'nic_nie_wazy',
      powod: okno.bezLiczby.length > 0
        ? OBCIAZENIE_BEZ_LICZBY(okno.bezLiczby.length)
        : OBCIAZENIE_NIC_NIE_WAZY,
    };
  }
  return {
    rodzaj: 'policzone',
    liczba: liczbaObciazeniaNaEkran(okno.punkty),
    podpis: OBCIAZENIE_PODPIS,
    // ⛔ Okno odniesienia wchodzi WYŁĄCZNIE wtedy, gdy samo jest policzone.
    // Podanie go z pustki byłoby wpisaniem zera tam, gdzie prawdą jest „nie wiem".
    odniesienie: odniesienie.rodzaj === 'policzone'
      ? OBCIAZENIE_ODNIESIENIE(liczbaObciazeniaNaEkran(odniesienie.punkty))
      : null,
    bezLiczby: okno.bezLiczby.length,
  };
}

/** Który z czterech braków zaszedł — rozstrzygane ze STANU, nie z tekstu powodu. */
export function powodBrakuPracyDodatkowej(args: {
  maDiagnoze: boolean;
  pozycja: WybranaPozycja;
  zwrot: ZwrotObszarow;
  rodzajePracy: string | null;
}): { powod: PowodBrakuPracyDodatkowej; szczegol: string } | null {
  if (!args.maDiagnoze) {
    return { powod: 'brak_diagnozy', szczegol: 'nie mam wyników diagnozy tego zawodnika' };
  }
  if (args.pozycja.pozycja === null) {
    return { powod: 'brak_pozycji', szczegol: 'nie znam pozycji tego zawodnika' };
  }
  if (args.zwrot.rodzaj !== 'jest') {
    return { powod: 'nie_umiem_policzyc', szczegol: args.zwrot.powod };
  }
  if (niepustyNapis(args.rodzajePracy) === null) {
    return { powod: 'brak_deklaracji', szczegol: 'zawodnik nie podał, co robi dodatkowo' };
  }
  return null;
}

export function pracaDodatkowaNaEkranie(we: {
  maDiagnoze: boolean;
  pozycja: WybranaPozycja;
  zwrot: ZwrotObszarow;
  rodzajePracy: string | null;
  pracaWlasna: OcenaPracyWlasnej;
}): PracaDodatkowaNaEkranie {
  const brak = powodBrakuPracyDodatkowej(we);
  if (brak !== null) return { rodzaj: 'nie_wiemy', ...brak };
  if (we.pracaWlasna.rodzaj !== 'jest') {
    // ⛔ Gałąź osiągalna wyłącznie wtedy, gdy `ocenPraceWlasna` odmówiła
    // z powodu, którego cztery gałęzie wyżej nie objęły. Nie milczymy.
    return { rodzaj: 'nie_wiemy', powod: 'nie_umiem_policzyc', szczegol: we.pracaWlasna.powod };
  }
  const trafiaja = we.pracaWlasna.trafiaja;
  const nieTrafiaja = we.pracaWlasna.nieTrafiaja;
  return {
    rodzaj: 'jest',
    ile: trafiaja.length + nieTrafiaja.length,
    trafia: trafiaja.length,
    trafiaja,
    nieTrafiaja,
    nieznaneRodzaje: we.pracaWlasna.nieznaneRodzaje,
  };
}

/** Zdanie o pracy dodatkowej — jedno miejsce, w którym powstaje jego treść. */
export function zdanieOPracyDodatkowej(p: PracaDodatkowaNaEkranie): string {
  if (p.rodzaj === 'nie_wiemy') return PRACA_DODATKOWA_BRAK[p.powod];
  if (p.trafia === 0) return PRACA_DODATKOWA_ZERO_TRAFIEN;
  return PRACA_DODATKOWA_ZDANIE(p.ile, p.trafia);
}

// ── Podpisy pięciu pozycji: DWA WARIANTY KAŻDY (D6) ─────────────────

function podpisOdznaki(n: NagrodaZaPrace): { podpis: string; maTresc: boolean } {
  const ile = progiNaEkranie().length;
  if (n.rodzaj === 'nie_policzona') {
    return { podpis: `${ile} progów — nie udało mi się sprawdzić, które masz`, maTresc: false };
  }
  const zdobyte = n.odznaki.length;
  if (zdobyte === 0) {
    return { podpis: `0 z ${ile} — pokazujemy progi, a nie puste miejsca`, maTresc: false };
  }
  return { podpis: `${zdobyte} z ${ile} zdobytych — wszystkie za pracę, żadna za wejście do aplikacji`, maTresc: true };
}

function podpisDane(d: DaneICel): { podpis: string; maTresc: boolean } {
  const podane: string[] = [];
  const brakujace: string[] = [];
  (d.rocznik === null ? brakujace : podane).push('rocznik');
  (d.wzrostPomiarow === null || d.wzrostPomiarow === 0 ? brakujace : podane).push('wzrost');
  (d.pozycja.pozycja === null ? brakujace : podane).push('pozycja');
  (niepustyNapis(d.cel) === null ? brakujace : podane).push('cel');
  if (podane.length === 0) {
    return { podpis: 'rocznik, wzrost, pozycja i cel — żadne z nich nie jest jeszcze podane', maTresc: false };
  }
  if (brakujace.length === 0) {
    return { podpis: 'rocznik, wzrost, pozycja i cel — komplet', maTresc: true };
  }
  return { podpis: `podane: ${podane.join(', ')} · brakuje: ${brakujace.join(', ')}`, maTresc: true };
}

/**
 * ⭐ „Skąd to wiemy". ⛔ KAŻDE ZERO MA OBOK SIEBIE ZDANIE, CZYM JEST — a każde
 * `null` mówi „nie sprawdziłem", nie „nie masz". ⛔ Ani jedna z tych liczb nie
 * przechodzi przez `?? 0`.
 */
export function opiszLiczbe(n: number | null, jeden: string, kilka: string, wiele: string): string {
  if (n === null) return `${wiele}: nie sprawdziłem`;
  if (n === 0) return `0 ${wiele} — nie ma jeszcze z czego liczyć`;
  return `${n} ${formaLiczby(n, jeden, kilka, wiele)}`;
}

function podpisSkad(l: LiczbyZrodel): { podpis: string; maTresc: boolean } {
  const czesci = [
    opiszLiczbe(l.wpisy, 'wpis', 'wpisy', 'wpisów'),
    opiszLiczbe(l.oceny, 'ocena', 'oceny', 'ocen'),
    opiszLiczbe(l.mecze, 'mecz', 'mecze', 'meczów'),
    opiszLiczbe(l.pomiary, 'pomiar', 'pomiary', 'pomiarów'),
  ];
  const maTresc = [l.wpisy, l.oceny, l.mecze, l.pomiary].some((x) => x !== null && x > 0);
  return { podpis: czesci.join(' · '), maTresc };
}

function podpisNaZewnatrz(raport: boolean | null): { podpis: string; maTresc: boolean } {
  if (raport === null) {
    return { podpis: 'nie udało mi się sprawdzić, co o Tobie wychodzi', maTresc: false };
  }
  if (raport) {
    return { podpis: 'raport dla rodzica istnieje — zobacz, co dokładnie zawiera', maTresc: true };
  }
  return { podpis: 'nic o Tobie nie wychodzi — sprawdź, co to znaczy', maTresc: true };
}

/**
 * ⭐ „Ustawienia i konto". ⛔ MAKIETA OBIECUJE „powiadomienia, hasło,
 * usunięcie konta" i ŻADNEJ Z TYCH TRZECH RZECZY W PRODUKCIE NIE MA
 * (zmierzone `grep`, 18.08.2026: zero trafień). Podpis mówi to, co JEST.
 */
export const USTAWIENIA_PODPIS = 'dostęp, kod drużyny, logowanie odciskiem, wylogowanie';
export const USTAWIENIA_CZEGO_NIE_MA =
  'Czego tu jeszcze nie ma: powiadomień, zmiany hasła i usunięcia konta. To nie są ukryte przełączniki — tych trzech rzeczy produkt dziś nie umie i nie udajemy, że umie.';

export function pozycjeProfilu(we: WejscieModelu): readonly PozycjaNaEkranie[] {
  const wybor: Record<KluczPozycji, { podpis: string; maTresc: boolean }> = {
    odznaki: podpisOdznaki(we.nagroda),
    dane: podpisDane(we.daneICel),
    skad: podpisSkad(we.liczby),
    nazewnatrz: podpisNaZewnatrz(we.raportRodzicaIstnieje),
    ustawienia: { podpis: USTAWIENIA_PODPIS, maTresc: true },
  };
  return KOLEJNOSC_POZYCJI.map((k) => ({
    klucz: k,
    tytul: TYTULY_POZYCJI[k],
    podpis: wybor[k].podpis,
    maTresc: wybor[k].maTresc,
  }));
}

export function zbudujModelProfilu(we: WejscieModelu): ModelProfilu {
  return {
    tytul: TYTUL_EKRANU,
    rozwoj: rozwojZNagrody(we.nagroda),
    obciazenie7: obciazenieNaEkranie(we.obciazenieOkna, we.obciazenieOdniesienia),
    pracaDodatkowa: pracaDodatkowaNaEkranie(we),
    pozycje: pozycjeProfilu(we),
    przypis: PRZYPIS_CZEGO_TU_NIE_MA,
  };
}

// ═════════════════════════════════════════════════════════════════════
// 6. WEJŚCIE NAGRODY Z SUROWYCH ODCZYTÓW
// ═════════════════════════════════════════════════════════════════════
//
// ⛔ TO NIE MA PRAWA MIESZKAĆ NA EKRANIE. Ekran `ja.tsx` czyta wiersze
// i podaje je TUTAJ — reguła „co jest źródłem pracy" ma jedną kopię.
//
// ⛔ ANI JEDNEGO `?? []`: nieudany odczyt każdego z czterech źródeł przewraca
// całą liczbę na `nie_policzona`, bo suma z trzech źródeł zamiast czterech
// jest MNIEJSZA od prawdy — a rozwój nie ma prawa maleć.

export type OdczytTabeli<T> =
  | { rodzaj: 'jest'; wiersze: readonly T[] }
  | { rodzaj: 'nie_odczytano'; powod: string };

/**
 * ⭐ WIERSZE Z SUPABASE → `OdczytTabeli`. ⛔ Ta zamiana NIE MA PRAWA stać
 * na ekranie: literał `'nie_odczytano'` wpisany w plik ekranu jest drugą kopią
 * słownika, którym cały produkt nazywa nieudany odczyt.
 */
export function odczytTabeli<T>(
  blad: unknown,
  dane: unknown,
  gdzie: string,
  zaloguj?: (zdanie: string) => void,
): OdczytTabeli<T> {
  if (blad || !Array.isArray(dane)) {
    if (blad && zaloguj) zaloguj(`nie odczytałem ${gdzie}: ${String(blad)}`);
    return { rodzaj: 'nie_odczytano', powod: `nie odczytałem ${gdzie}` };
  }
  return { rodzaj: 'jest', wiersze: dane as readonly T[] };
}

/**
 * ⭐ PAS P1 19.08.2026 — WIERSZ `focus_blocks` TAK, JAK LEŻY W BAZIE.
 * ⛔ `segment_id` bywa `null` i to jest STAN, nie błąd: Blok bez obszaru
 * istnieje, tylko nie mówi, czego dotyczy praca.
 */
export type WierszBlokuSkupienia = { id: string; segment_id: string | null };

/**
 * ⭐ PAS P1 19.08.2026 — WIERSZ ODPOWIEDZI KONTROLNEJ TAK, JAK LEŻY W BAZIE.
 * ⛔ BEZ pola `segment` — bo segmentu W TEJ TABELI NIE MA. Dokłada go TEN
 * moduł z mapy Bloków. Do 19.08.2026 typ udawał, że ekran poda `segment`,
 * a ekran podawał surowy wiersz z `focus_block_id` — więc `segment` schodził
 * do `undefined` i każda odpowiedź kontrolna traciła przynależność do celu.
 */
export type WierszOdpowiedziKontrolnejZBazy = {
  id: string;
  answered_at: string | null;
  focus_block_id?: string | null;
};

export type OdczytyDoRozwoju = {
  wydarzenia: OdczytTabeli<WierszWydarzeniaDoNagrody>;
  dziennik: OdczytTabeli<WierszDziennika & { calendar_event_id?: number | null }>;
  odpowiedziKontrolne: OdczytTabeli<WierszOdpowiedziKontrolnejZBazy>;
  /**
   * ⭐⭐ PAS P1 19.08.2026 — WIERSZ MECZU TAK, JAK LEŻY W BAZIE (`WierszMeczuWgl`),
   * a nie `WierszMeczu`. ⛔ ZNALEZISKO GŁÓWNEJ ASERCJI TEGO PASA: ekran „Profil"
   * podawał tu surowe wiersze `match_contexts` udające `WierszMeczu`, więc
   * `dlugoscMeczu` NIGDY nie powstawało (w bazie kolumna nazywa się
   * `match_length_minutes`) i `wagaMeczu()` podstawiała 90 minut ZAWSZE.
   * ⛔ Skutek dla zawodnika U13, który zagrał pełne 60 minut meczu
   * 60-minutowego: na „Dziś" 4 punkty, na „Profilu" 3. Ta sama praca, dwie
   * liczby — dokładnie ten sam defekt, co `segmentBloku: null`.
   * ⭐ Przemianowanie robi `meczDlaNagrody()`, jedno miejsce, uruchamiane.
   * ⛔ OBCIĄŻENIA TO NIE RUSZA: liczy je `minutes_played` × `match_rpe`,
   * czyli dwie kolumny, które w obu kształtach nazywają się tak samo.
   */
  mecze: OdczytTabeli<WierszMeczuWgl>;
  /** ⭐ Zbiór celów BEZ filtra po statusie — cel domknięty to sukces, nie utrata. */
  cele: OdczytTabeli<{ segment_id: string | null }>;
  /**
   * ⭐⭐ PAS P1 19.08.2026 — BLOKI SKUPIENIA TEGO ZAWODNIKA. To jest
   * NOŚNIK TRAFNOŚCI: `calendar_events.focus_block_id` → `focus_blocks.id`
   * → `segment_id` → „czy ta praca szła w obszar o wysokim zwrocie".
   *
   * ⛔ POLE JEST WYMAGANE, NIE OPCJONALNE, i to jest cała poprawka pasa P1.
   * Do 19.08.2026 ekran „Profil" podawał do `zrodloSesji` `segmentBloku: null`
   * na sztywno, więc KAŻDA sesja dostawała tu trafność 1,0 — także ta, która
   * naprawdę jest trafna i na „Dziś" dostaje 1,5. Ta sama praca dawała dwie
   * różne liczby na dwóch ekranach, a niższa stała pod słowem ROZWÓJ.
   * ⛔ Gdyby pole było opcjonalne, następny ekran mógłby je PRZEOCZYĆ i wrócić
   * do tego samego defektu bez ani jednego błędu kompilacji.
   */
  bloki: OdczytTabeli<WierszBlokuSkupienia>;
  /**
   * ⭐ Zwrot obszarów tego zawodnika — wchodzi do TRAFNOŚCI sesji własnej pracy.
   * ⛔ `null` NIE odbiera nikomu punktów: trafność spada wtedy do bazy 1,0.
   */
  zwrot: ZwrotObszarow | null;
};

// ═════════════════════════════════════════════════════════════════════
// ⭐⭐ 6a. PAS P1 19.08.2026 — SEGMENT PRACY, CZYLI NOŚNIK TRAFNOŚCI
// ═════════════════════════════════════════════════════════════════════
//
// ⛔ CO BYŁO ZEPSUTE. `wejscieNagrodyZOdczytow` podawało do `zrodloSesji`
// `segmentBloku: null` NA SZTYWNO. Skutek zmierzony, nie założony: na ekranie
// „Profil" każda sesja dostawała trafność 1,0, także ta, która na ekranie
// „Dziś" dostaje 1,5. ⛔ Zawodnik widział pod słowem ROZWÓJ MNIEJ, niż
// naprawdę zrobił — i ta sama praca dawała dwie różne liczby na dwóch
// ekranach. To łamie zdanie, na którym stoi cały produkt:
// ROZWÓJ = OBCIĄŻENIE × TRAFNOŚĆ. Liczba, która milczy o trafności, mówi
// zawodnikowi, że celowanie w słabe strony nic nie daje.
//
// ⛔ OBCIĄŻENIA TO NIE DOTYKA I NIE MA PRAWA DOTKNĄĆ. `wejscieObciazeniaZOdczytow`
// nie zna słowa „segment" i nie ma parametru, którym dałoby się trafność podać
// (zapadki pasa D1: A2c „żaden plik obciążenia nie importuje trafności" i B3c
// „te same wiersze z trafnością i bez → obciążenie identyczne").

/**
 * ⭐⭐ TRZY RÓŻNE RZECZY, KTÓRE DO 19.08.2026 DAWAŁY JEDNĄ LICZBĘ (1,0).
 *
 * ⛔ R5 — „nie wiem" nie ma prawa wyglądać jak „zmierzyłem i wyszło nisko".
 *   • `nie_znam_mapy`  — odczyt Bloków padł. Wtedy trafność CAŁEJ pracy jest
 *     NIEWIEDZĄ, a nie pomiarem. Zawodnik nie stracił punktów przez to, jak
 *     trenował, tylko przez to, że nie odczytaliśmy jednej tabeli.
 *   • `spozaBloku`     — sesja nie ma `focus_block_id`. Trafność 1,0 jest tu
 *     POPRAWNA i ma powód: praca poza Blokiem nie deklaruje obszaru.
 *   • `blokNieznany`   — sesja wskazuje Blok, którego w odczycie nie ma
 *     (skasowany, cudzy, odcięty przez RLS). Trafność 1,0 jest tu NIEWIEDZĄ.
 *
 * ⛔ ŚWIADOMIE NIE ZMIENIAMY LICZBY, kiedy segmentu nie znamy. Podniesienie
 * trafności „na wszelki wypadek" byłoby premią bez pokrycia, a obniżenie —
 * karą za brak danych. Ten typ istnieje po to, żeby stan dało się NAZWAĆ
 * i policzyć, a nie po to, żeby po cichu przesunąć liczbę.
 */
export type StanSegmentowSesji =
  | { rodzaj: 'nie_znam_mapy'; powod: string; sesji: number }
  | { rodzaj: 'znam_mape'; zSegmentem: number; spozaBloku: number; blokNieznany: number };

/**
 * ⭐ `focus_block_id` → `segment_id`, zbudowane z TYCH SAMYCH wierszy, które
 * ekran już czyta (`focus_blocks`, kolumny `id,segment_id,status`).
 * ⛔ BEZ FILTRA PO `status`: Blok domknięty to praca WYKONANA, a nie utracona.
 * Zmierzone 15.08.2026 na produkcji — Blok `completed` ma wszystkie sesje
 * w statusie `cancelled`, więc każdy filtr z osobna kasuje cztery tygodnie pracy.
 * ⛔ `null` znaczy „nie odczytałem", nigdy „nie ma Bloków".
 */
export function mapaSegmentowBlokow(
  o: OdczytTabeli<WierszBlokuSkupienia>,
): ReadonlyMap<string, string> | null {
  if (o.rodzaj === 'nie_odczytano') return null;
  const mapa = new Map<string, string>();
  for (const b of o.wiersze) {
    if (!b || typeof b.id !== 'string' || b.id.length === 0) continue;
    if (typeof b.segment_id !== 'string' || b.segment_id.length === 0) continue;
    mapa.set(b.id, b.segment_id);
  }
  return mapa;
}

/**
 * ⭐ STAN WIEDZY O SEGMENTACH, policzony na TYCH SAMYCH wierszach, z których
 * powstaje rozwój. ⛔ Ekran ma to wypisać do logu, kiedy niewiedza istnieje —
 * inaczej zaniżona liczba wraca po cichu przy pierwszym błędzie odczytu.
 */
export function stanSegmentowSesji(o: OdczytyDoRozwoju): StanSegmentowSesji {
  const wiersze = o.wydarzenia.rodzaj === 'nie_odczytano' ? [] : o.wydarzenia.wiersze;
  const mapa = mapaSegmentowBlokow(o.bloki);
  if (mapa === null) {
    return {
      rodzaj: 'nie_znam_mapy',
      powod: o.bloki.rodzaj === 'nie_odczytano' ? o.bloki.powod : 'nie odczytałem Bloków Skupienia',
      sesji: wiersze.length,
    };
  }
  let zSegmentem = 0;
  let spozaBloku = 0;
  let blokNieznany = 0;
  for (const w of wiersze) {
    const id = w?.focus_block_id;
    if (typeof id !== 'string' || id.length === 0) { spozaBloku++; continue; }
    if (mapa.has(id)) zSegmentem++; else blokNieznany++;
  }
  return { rodzaj: 'znam_mape', zSegmentem, spozaBloku, blokNieznany };
}

/**
 * ⭐ ZDANIE DO KONSOLI, NIE NA EKRAN. ⛔ `null` = nie ma o czym mówić.
 * ⚠️ Brzmienie widoczne dla zawodnika to OSOBNA decyzja Kuby — dołożenie
 * zdania na ekran „Profil" ruszyłoby zapadkę wysokości (pas M2), a ten pas
 * zmienia WARTOŚĆ, nie układ.
 */
export function zdanieOSegmentachDoLogu(s: StanSegmentowSesji): string | null {
  if (s.rodzaj === 'nie_znam_mapy') {
    return `profil: NIE ZNAM SEGMENTÓW ${s.sesji} sesji — ${s.powod}. `
      + 'Trafność całej pracy spada do 1,0 z NIEWIEDZY, nie z pomiaru.';
  }
  if (s.blokNieznany > 0) {
    return `profil: ${s.blokNieznany} sesji wskazuje Blok, którego nie ma w odczycie `
      + '— ich trafność to 1,0 z NIEWIEDZY, nie z pomiaru.';
  }
  return null;
}

/**
 * ⭐ `calendar_events.id` → ZMIERZONA długość sesji i ZMIERZONE RPE, wyjęte
 * z `daily_logs.payload` wpisu wskazującego TĘ pozycję.
 * ⛔ Przy dwóch wpisach o tej samej sesji wygrywa WYŻSZA wartość: pomiar może
 * wagę podnieść, nigdy obniżyć (decyzja C Kuby, 17.08.2026).
 * ⛔ `null` = nie odczytałem Dziennika. Pusta mapa = odczytałem i nic nie ma.
 */
export function pomiaryZWpisow(
  o: OdczytTabeli<WierszDziennika & { calendar_event_id?: number | null }>,
): { minuty: ReadonlyMap<number, number> | null; rpe: ReadonlyMap<number, number> | null } {
  if (o.rodzaj === 'nie_odczytano') return { minuty: null, rpe: null };
  const minuty = new Map<number, number>();
  const rpe = new Map<number, number>();
  for (const w of o.wiersze) {
    const id = w?.calendar_event_id;
    if (typeof id !== 'number' || !Number.isFinite(id)) continue;
    const p = w?.payload;
    if (p === null || typeof p !== 'object') continue;
    const min = (p as Record<string, unknown>).duration_minutes;
    if (typeof min === 'number' && Number.isFinite(min) && min > 0) {
      minuty.set(id, Math.max(minuty.get(id) ?? 0, min));
    }
    const r = (p as Record<string, unknown>).rpe;
    if (typeof r === 'number' && Number.isFinite(r) && r > 0 && r <= 10) {
      rpe.set(id, Math.max(rpe.get(id) ?? 0, r));
    }
  }
  return { minuty, rpe };
}

function zrodlo<T>(o: OdczytTabeli<T>, nazwa: string, na: (w: readonly T[]) => WejscieZrodla): WejscieZrodla {
  return o.rodzaj === 'nie_odczytano' ? zrodloNieczytane(`${nazwa}: ${o.powod}`) : na(o.wiersze);
}

export function wejscieNagrodyZOdczytow(o: OdczytyDoRozwoju): WejscieNagrody {
  const wpisyDziennika: ReadonlySet<number> | null = o.dziennik.rodzaj === 'nie_odczytano'
    ? null
    : new Set(o.dziennik.wiersze
      .map((w) => w.calendar_event_id)
      .filter((x): x is number => typeof x === 'number' && Number.isFinite(x)));

  // ⭐ SEGMENTY CELÓW — ⛔ ŚWIADOMIE BEZ FILTRA `status='active'`.
  // Cel domknięty zostaje w zbiorze: odznaka „praca nad swoim celem" policzona
  // ze zbioru aktywnych przepadłaby W DNIU DOMKNIĘCIA CELU, czyli licznik
  // cofnąłby się z powodu sukcesu.
  const segmentyCelow: SegmentyCelow = o.cele.rodzaj === 'nie_odczytano'
    ? { rodzaj: 'niepelne', powod: `nie odczytałem listy Twoich celów — ${o.cele.powod}` }
    : {
      rodzaj: 'pelne',
      segmenty: new Set(o.cele.wiersze
        .map((g) => g?.segment_id)
        .filter((s): s is string => typeof s === 'string' && s.length > 0)),
    };

  const pomiary = pomiaryZWpisow(o.dziennik);

  // ⭐⭐ PAS P1 19.08.2026 — TU BYŁO `null`. Mapa powstaje z wierszy, które ekran
  // JUŻ CZYTA (`focus_blocks`: `id,segment_id,status`) — zero nowych zapytań.
  // ⛔ `null` zostaje TYLKO wtedy, gdy odczyt Bloków naprawdę padł, i wtedy
  // ekran wypisuje o tym zdanie (`zdanieOSegmentachDoLogu`).
  const segmentBloku = mapaSegmentowBlokow(o.bloki);
  const segmentDlaBloku = (idBloku: unknown): string | null => {
    if (segmentBloku === null || typeof idBloku !== 'string' || idBloku.length === 0) return null;
    return segmentBloku.get(idBloku) ?? null;
  };

  return {
    sesje: o.wydarzenia.rodzaj === 'nie_odczytano'
      ? zrodloNieczytane(`kalendarz: ${o.wydarzenia.powod}`)
      : zrodloSesji({
        wydarzenia: o.wydarzenia.wiersze,
        // ⚠️ Ekran „Profil" NIE CZYTA werdyktów — mówi to wprost, zamiast
        // podawać pustą listę udającą „nie było żadnego".
        werdykty: WERDYKTY_NIEPODANE,
        wpisyDziennika,
        segmentBloku,
        minutyZWpisow: pomiary.minuty,
        rpeZWpisow: pomiary.rpe,
        zwrot: o.zwrot,
      }),
    dziennik: zrodlo(o.dziennik, 'Dziennik', (w) => ({ rodzaj: 'jest', jednostki: jednostkiZDziennika(w) })),
    // ⭐ PAS P1 — SEGMENT ODPOWIEDZI KONTROLNEJ DOKŁADA MODUŁ, NIE EKRAN.
    // ⛔ Do 19.08.2026 typ żądał gotowego `segment`, a ekran „Profil" podawał
    // surowy wiersz z `focus_block_id` — pole schodziło do `undefined`, więc
    // odpowiedzi kontrolne traciły przynależność do celu (0 punktów wagi,
    // ale odznaka „praca nad swoim celem" liczy jednostki, nie punkty).
    odpowiedziKontrolne: zrodlo(o.odpowiedziKontrolne, 'odpowiedzi kontrolne Bloku',
      (w) => ({
        rodzaj: 'jest',
        jednostki: jednostkiZOdpowiedziKontrolnych(w.map((c): WierszOdpowiedziKontrolnej => ({
          id: c?.id,
          answered_at: c?.answered_at ?? null,
          segment: segmentDlaBloku(c?.focus_block_id),
        }))),
      })),
    // ⭐ PAS P1 — `meczDlaNagrody` przemianowuje `match_length_minutes`
    // na `dlugoscMeczu`. ⛔ Bez tego mecz 60-minutowy rozegrany w całości
    // dawał na „Profilu" 3 punkty zamiast 4 — a na „Dziś" 4.
    mecze: zrodlo(o.mecze, 'mecze',
      (w) => ({ rodzaj: 'jest', jednostki: jednostkiZMeczow(w.map(meczDlaNagrody)) })),
    segmentyCelow,
  };
}

/**
 * ⭐ JEDNO WEJŚCIE → GOTOWY ROZWÓJ. ⛔ Ekran nie woła `policzNagrode` sam:
 * gdyby wołał, reguła „co jest pracą" miałaby drugą kopię na ekranie.
 */
export function policzRozwojZOdczytow(o: OdczytyDoRozwoju): NagrodaZaPrace {
  return policzNagrode(wejscieNagrodyZOdczytow(o));
}

// ═════════════════════════════════════════════════════════════════════
// 6b. ⭐ WEJŚCIE OBCIĄŻENIA Z TYCH SAMYCH ODCZYTÓW
// ═════════════════════════════════════════════════════════════════════
//
// ⭐⛔ TO JEST MIEJSCE, W KTÓRYM DWIE MIARY SIĘ ROZCHODZĄ — i jedyne.
// Te same wiersze wchodzą do dwóch funkcji. Rozwój dostaje `zwrot` (czyli
// trafność); obciążenie NIE DOSTAJE GO W OGÓLE i nie ma parametru, którym
// dałoby się go podać. Dzięki temu „ta sama praca, inny cel" daje INNY rozwój
// i IDENTYCZNE obciążenie — a to jest cała teza produktu, sprowadzona
// do jednej różnicy w dwóch wywołaniach obok siebie.
//
// ⛔ CO JEST DOWODEM, ŻE SESJA W OGÓLE SIĘ ODBYŁA. Ekran „Profil" nie czyta
// werdyktów (mówi to wprost przez `WERDYKTY_NIEPODANE`), więc zostają dwa
// dowody: `status='completed'` na wierszu i wpis w Dzienniku wskazujący TĘ
// pozycję. ⛔ Reguła cykliczna nie ma prawa wejść: jeden jej wiersz ma wiele
// wystąpień, a `status` i wpis opisują WIERSZ — policzenie ich znaczyłoby
// obciążenie za każdy wtorek w historii z jednego wpisu.
//
// ⚠️ SESJA, KTÓRA SIĘ ODBYŁA I NIE MA OBU LICZB, NIE JEST POMIJANA. Wchodzi
// do okna i wychodzi z niego jako `bezLiczby` — nazwana, policzona, nie
// doliczona do sumy. ⛔ Zero byłoby zdaniem „ciało nic nie wzięło" (R5).

const POWOD_BEZ_DATY_SESJI = 'sesja bez daty w kalendarzu';
const POWOD_BEZ_DATY_MECZU = 'zapisany mecz bez daty powstania wiersza';

export function wejscieObciazeniaZOdczytow(o: OdczytyDoRozwoju): WejscieObciazenia {
  // ⛔ Bez Dziennika nie ma ani minut, ani ciężkości — czyli nie ma obciążenia.
  // To jest „nie odczytałem", a nie „nic nie ważyło".
  if (o.wydarzenia.rodzaj === 'nie_odczytano' || o.dziennik.rodzaj === 'nie_odczytano') {
    const powod = o.wydarzenia.rodzaj === 'nie_odczytano'
      ? `kalendarz: ${o.wydarzenia.powod}`
      : `Dziennik: ${o.dziennik.rodzaj === 'nie_odczytano' ? o.dziennik.powod : ''}`;
    return {
      sesje: zrodloObciazeniaNieczytane(powod),
      mecze: o.mecze.rodzaj === 'nie_odczytano'
        ? zrodloObciazeniaNieczytane(`mecze: ${o.mecze.powod}`)
        : { rodzaj: 'jest', sesje: [] },
    };
  }

  const pomiary = pomiaryZWpisow(o.dziennik);
  const minutyMapa = pomiary.minuty;
  const rpeMapa = pomiary.rpe;
  const liczbaZMapy = (m: ReadonlyMap<number, number> | null, id: number): number | null => {
    if (m === null) return null;
    const x = m.get(id);
    return typeof x === 'number' && Number.isFinite(x) ? x : null;
  };

  const sesje: SesjaObciazenia[] = [];
  for (const w of o.wydarzenia.wiersze) {
    if (!w || typeof w.id !== 'number' || !Number.isFinite(w.id)) continue;
    if (typeof w.recurrence_rule === 'string' && w.recurrence_rule.length > 0) continue;
    const minuty = liczbaZMapy(minutyMapa, w.id);
    const ciezkosc = liczbaZMapy(rpeMapa, w.id);
    const odbylaSie = w.status === 'completed' || minuty !== null || ciezkosc !== null;
    if (!odbylaSie) continue;
    const dzien = dzienZeZnacznika(w.scheduled_date);
    sesje.push({
      klucz: `sesja:${w.id}`,
      rodzaj: 'sesja',
      kiedy: dzien === null
        ? { rodzaj: 'nieznana', powod: POWOD_BEZ_DATY_SESJI }
        : { rodzaj: 'dzien_pracy', dzien },
      pomiar: { minuty, ciezkosc },
    });
  }

  const mecze: SesjaObciazenia[] = [];
  if (o.mecze.rodzaj === 'jest') {
    for (const w of o.mecze.wiersze) {
      if (!w || typeof w.id !== 'number' || !Number.isFinite(w.id)) continue;
      const dzien = dzienZeZnacznika(w.created_at);
      mecze.push({
        klucz: `mecz:${w.id}`,
        rodzaj: 'mecz',
        // ⛔ Mecz odbył się kiedyś, a wiersz powstał, gdy zawodnik go zapisał.
        // Nie mamy czym tego rozróżnić, więc nie udajemy, że mamy (Z0).
        kiedy: dzien === null
          ? { rodzaj: 'nieznana', powod: POWOD_BEZ_DATY_MECZU }
          : { rodzaj: 'dzien_zapisu', dzien },
        pomiar: {
          minuty: typeof w.minutes_played === 'number' ? w.minutes_played : null,
          ciezkosc: typeof w.match_rpe === 'number' ? w.match_rpe : null,
        },
      });
    }
  }

  return {
    sesje: { rodzaj: 'jest', sesje },
    mecze: o.mecze.rodzaj === 'nie_odczytano'
      ? zrodloObciazeniaNieczytane(`mecze: ${o.mecze.powod}`)
      : { rodzaj: 'jest', sesje: mecze },
  };
}

/**
 * ⭐ JEDNO WEJŚCIE → OBA OKNA, w jednym przebiegu i z jednego zbioru wierszy.
 *
 * ⛔ DWA WYWOŁANIA, NIE DWA ZAPYTANIA. Gdyby okna liczyły się z dwóch odczytów,
 * zawodnik zobaczyłby obok siebie dwie liczby, których nie da się ze sobą
 * pogodzić — a rozjazd wyglądałby wtedy jak zmiana obciążenia.
 */
/**
 * ⭐ NAZWANY KSZTAŁT, A NIE OBIEKT W PODPISIE — i to nie jest kosmetyka.
 * ⚠️ ZMIERZONE 18.08.2026: strażnik F1-2 („funkcje liczące pracę bez ani
 * jednego konsumenta") wycina ciało funkcji, szukając PIERWSZEGO `{` po
 * nawiasach podpisu. Typ wyniku zapisany w podpisie jako `{ … }` jest tym
 * pierwszym nawiasem, więc strażnik czytał TYP zamiast CIAŁA i nie widział
 * w nim wywołania `policzObciazenieWOknie`. Skutek: silnik podpięty do ekranu
 * nadal figurowałby na liście długu jako „NIEPODPIĘTY".
 */
export type ObciazenieDwochOkien = {
  okno: ObciazenieWOknie;
  odniesienie: ObciazenieWOknie;
};

export function policzObciazenieZOdczytow(
  o: OdczytyDoRozwoju,
  args: { dzis: string },
): ObciazenieDwochOkien {
  const we = wejscieObciazeniaZOdczytow(o);
  return {
    okno: policzObciazenieWOknie(we, { dzis: args.dzis, oknoDni: OKNO_OBCIAZENIA_DNI }),
    odniesienie: policzObciazenieWOknie(we, { dzis: args.dzis, oknoDni: OKNO_ODNIESIENIA_DNI }),
  };
}

// ═════════════════════════════════════════════════════════════════════
// 7. ARKUSZ „SKĄD BIERZE SIĘ TRAFNOŚĆ"
// ═════════════════════════════════════════════════════════════════════
// ⛔ Ten arkusz NIE LICZY zwrotu sam. Czyta `policzZwrotObszarow`, a mapę
// rodzajów pracy — z `MAPA_PRACY_WLASNEJ`. Kopii tu nie ma i nie będzie.

export const TRAFNOSC_TYTUL = 'Skąd bierze się trafność';
export const TRAFNOSC_WZOR =
  'Trafne to nie jest to, co masz najsłabsze. Trafne to to, gdzie ta sama godzina pracy daje najwięcej: (100 − Twój wynik) × waga obszaru na Twojej pozycji. Obszar z wynikiem 40 lub niżej wchodzi zawsze.';
export const TRAFNOSC_REMIS =
  'Remis wchodzi w komplecie. Jeżeli kilka obszarów ma identyczny zwrot, nie wybieramy z nich jednego — nie ma czym.';
export const TRAFNOSC_ZAWSZE_JEDEN =
  'Trening klubowy i mecz mają trafność 1,0 zawsze — nie decydujesz o ich treści. Trafność nigdy nie schodzi poniżej 1,0: nic, co zrobisz, nie może być warte mniej niż praca.';
/** ⛔ Pustka arkusza przy braku diagnozy — INNA niż przy braku pozycji. */
export const TRAFNOSC_PUSTKA_BRAK_DIAGNOZY =
  'Nie mamy z czego tego policzyć — nie masz jeszcze wyników diagnozy. Nie zgadujemy: puste miejsce nazywamy, a nie wypełniamy założeniem.';
export const TRAFNOSC_PUSTKA_BRAK_POZYCJI =
  'Nie mamy z czego tego policzyć — nie znamy Twojej pozycji. Ten sam wynik obszaru znaczy co innego u bramkarza i u napastnika.';

export type WierszPracyDodatkowej = {
  rodzaj: string;
  /** Obszary, w które ten rodzaj celuje — ⛔ czytane z `MAPA_PRACY_WLASNEJ`. */
  obszary: readonly string[];
  trafia: boolean;
  /** ⭐ Rodzaj spoza mapy — nazwany, nie pominięty. */
  znany: boolean;
};

export function wierszePracyDodatkowej(args: {
  rodzajePracy: string | null;
  zwrot: ZwrotObszarow;
}): readonly WierszPracyDodatkowej[] {
  const surowe = niepustyNapis(args.rodzajePracy);
  if (surowe === null) return [];
  // ⛔ Zbiór trafnych wyjęty PRZED pętlę, a nie zawężany w domknięciu.
  // ⚠️ `tsc` (18.08) słusznie odmówił zawężenia `args.zwrot` wewnątrz `.some(...)`:
  // zawężenie unii nie przechodzi przez granicę funkcji. Pusty zbiór przy
  // „nie wiemy" daje ten sam wynik co brak trafienia i nie udaje wiedzy (R5).
  const trafne: ReadonlySet<string> = args.zwrot.rodzaj === 'jest'
    ? args.zwrot.trafne : new Set<string>();
  return surowe.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0)
    .map((r) => {
      const obszary = MAPA_PRACY_WLASNEJ[r];
      if (!obszary) return { rodzaj: r, obszary: [], trafia: false, znany: false };
      const trafia = obszary.some((o) => trafne.has(o));
      return { rodzaj: r, obszary, trafia, znany: true };
    });
}

/**
 * ⭐ Jedno wejście → cały arkusz trafności. ⛔ Zero arytmetyki po stronie
 * komponentu: komponent dostaje gotową listę i ją rysuje.
 */
export type ArkuszTrafnosci =
  | {
    rodzaj: 'jest';
    obszary: readonly ObszarZeZwrotem[];
    trafne: ReadonlySet<string>;
    praca: readonly WierszPracyDodatkowej[];
  }
  | { rodzaj: 'pusto'; zdanie: string };

export function arkuszTrafnosci(we: {
  maDiagnoze: boolean;
  pozycja: WybranaPozycja;
  zwrot: ZwrotObszarow;
  rodzajePracy: string | null;
}): ArkuszTrafnosci {
  if (!we.maDiagnoze) return { rodzaj: 'pusto', zdanie: TRAFNOSC_PUSTKA_BRAK_DIAGNOZY };
  if (we.pozycja.pozycja === null) return { rodzaj: 'pusto', zdanie: TRAFNOSC_PUSTKA_BRAK_POZYCJI };
  if (we.zwrot.rodzaj !== 'jest') return { rodzaj: 'pusto', zdanie: we.zwrot.powod };
  return {
    rodzaj: 'jest',
    obszary: we.zwrot.obszary,
    trafne: we.zwrot.trafne,
    praca: wierszePracyDodatkowej({ rodzajePracy: we.rodzajePracy, zwrot: we.zwrot }),
  };
}

/**
 * Skrót, który ekran woła RAZ: z surowych danych diagnozy robi wszystko,
 * czego potrzebuje zdanie o pracy dodatkowej i jego arkusz.
 */
export function trafnoscZawodnika(args: {
  wyniki: Readonly<Record<string, unknown>> | null;
  pozycjaZDiagnozy: string | null;
  pozycjaZProfilu: string | null;
  rodzajePracy: string | null;
}): { pozycja: WybranaPozycja; zwrot: ZwrotObszarow; pracaWlasna: OcenaPracyWlasnej; maDiagnoze: boolean } {
  const pozycja = wybierzPozycje({ zDiagnozy: args.pozycjaZDiagnozy, zProfilu: args.pozycjaZProfilu });
  const zwrot = policzZwrotObszarow({ wyniki: args.wyniki, pozycja: pozycja.pozycja });
  return {
    pozycja,
    zwrot,
    pracaWlasna: ocenPraceWlasna({ zwrot, rodzaje: args.rodzajePracy }),
    maDiagnoze: args.wyniki !== null && typeof args.wyniki === 'object',
  };
}
