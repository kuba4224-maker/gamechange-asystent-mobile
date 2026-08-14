// PLAN-D-B3 08.2026 (14.08.2026) — NOWY PLIK. PRODUCENT WGLĄDÓW Z ALGORYTMU.
//
// ── CO TO JEST ────────────────────────────────────────────────────────
// Jedna czysta funkcja `policzWglady()`. Dostaje dane argumentem, oddaje
// `Kandydat[]` w kształcie, który przyjmuje ranker z `lib/kolejkaPodania.ts`.
// ⛔ ZERO Supabase, ZERO renderowania, ZERO importu z `app/` i `components/`,
// ZERO odczytu zegara — dzień wchodzi argumentem, tak samo jak w rankerze.
//
// ── DLACZEGO WGLĄD JEST WEJŚCIEM RANKERA, A NIE NOWĄ KARTĄ ────────────
// Ekran „Dziś" był kolażem sześciu niezależnych nadawców. Pas T wyciął
// siódmego. Gdyby wglądy weszły jako własna karta, byłyby ósmym — i liczba
// elementów na ekranie znów zaczęłaby rosnąć razem z liczbą funkcji.
// Dlatego ten plik nie rysuje niczego: oddaje kandydatów do `WejsciaKolejki.
// dodatkowi`, a o kolejności rozstrzyga wyłącznie ranker (zasada podania §3).
//
// ── ⭐ TRZY CZĘŚCI WGLĄDU, W STAŁEJ KOLEJNOŚCI (WG-25) ────────────────
//   1. LICZBA zmierzona u TEGO zawodnika   → pole `liczba`
//   2. CO TO ZNACZY                        → pole `znaczenie`
//   3. JEDNA RZECZ DO ZROBIENIA            → pole `doZrobienia`
// Kolejność jest wymuszona typem i sprawdzana asercją. Wgląd bez liczby
// NIE POWSTAJE — `zbudujWglad()` zwraca wtedy `null` (WG-26).
//
// ── ⛔ GRANICA, KTÓREJ TEN PLIK NIE PRZEKRACZA (zasady B1 / B1-a) ─────
// Wgląd o stanie TRENINGOWYM — sen, zmęczenie, obciążenie, ból, regeneracja
// — jest dozwolony i pożądany. Wgląd o stanie PSYCHICZNYM — nigdy.
// Klasyfikatory ryzyka mają trafność 6–17%, więc produkt twierdzący coś na
// tej podstawie podaje zgadywanie jako fakt w sprawie o najwyższej stawce.
// ⚠️ `payload.mood_motivation` (8 wierszy w bazie) NIE WCHODZI DO TEGO PLIKU
// ANI JAKO LICZBA, ANI JAKO PRZESŁANKA. Wolno by z niego liczyć obciążenie,
// ale każde zdanie zbudowane na tym kluczu jest o jedną zmianę nazwy zmiennej
// od zdania o nastroju — a granica biegnie po SKUTKU, nie po danych
// wejściowych. Decyzja B3-b, opisana w nocie.
// ⛔ Nikogo też automatycznie nie powiadamiamy (zasada B3). Ten plik nie ma
// ani jednego wyjścia poza `Kandydat[]`.
//
// ── ⛔ CZEGO TU NIE MA I MIEĆ NIE MOŻE ────────────────────────────────
// • ani jednej liczby o INNYM zawodniku, o normie dla wieku i o miejscu
//   w tabeli (N3). Wgląd porządkuje dane zawodnika, nie zawodników;
// • ani jednego wejścia o stanie arbitra i o kopercie ograniczeń — i to jest
//   celowe. Wgląd, który przegrał z arbitrem, NIE ZNIKA: oddaję go normalnie,
//   a `ulozKolejke()` nada mu `milczy` z powodem i warunkiem powrotu (WG-32).
//   Gdyby ten plik znał stan arbitra, mógłby filtrować za rankera — więc go
//   nie zna. To jest gwarancja z kształtu typu, nie z dobrych chęci.
import {
  OKNO_WPISOW,
  PROG_SNU_GODZINY,
  WAGA_BAZOWA,
  czyPrawdziwySlad,
  dzienNaLiczbe,
  odstepDni,
  slad,
} from './kolejkaPodania';
import type {
  Kandydat,
  NieWiem,
  RodzajPracy,
  Slad,
  Wejscie,
} from './kolejkaPodania';
// ⚠️ Nazwa miejsca bólu po polsku MA JUŻ WŁAŚCICIELA (`lib/labels.ts`, 17 pozycji,
// pilnowane asercją w `labels.selftest.ts`). Druga mapa w tym pliku rozjechałaby
// się z Pickerem w Dzienniku i zawodnik zobaczyłby dwie różne nazwy tej samej rzeczy.
import { BODY_LOCATION_LABELS } from './labels';

// ─────────────────────────────────────────────────────────────────────
// 1. SZEŚĆ WGLĄDÓW — lista zamknięta, kolejność stała
// ─────────────────────────────────────────────────────────────────────
// ⚠️ Kolejność w tej tablicy jest kolejnością w wyniku. `policzWglady()`
// oddaje ZAWSZE sześć pozycji — także te, które dziś nie mają z czego
// powstać. Wgląd, który znika z listy, znika też z pola widzenia, a to jest
// dokładnie ten sposób, w jaki funkcja przestaje działać niezauważenie.

export const KLUCZE_WGLADOW = [
  'sen_wobec_obciazenia',
  'odbyte_sesje',
  'zblizajacy_sie_mecz',
  'sygnal_kaskady_meczowej',
  'powtarzajacy_sie_bol',
  'brak_roku_urodzenia',
] as const;
export type KluczWgladu = (typeof KLUCZE_WGLADOW)[number];

// ─────────────────────────────────────────────────────────────────────
// 2. KSZTAŁT WGLĄDU
// ─────────────────────────────────────────────────────────────────────

/** Jeden punkt osi pomiarów (WG-34). Data jest obowiązkowa — pomiar bez daty nie jest pomiarem. */
export type PomiarNaOsi = {
  /** 'YYYY-MM-DD'. */
  dzien: string;
  wartosc: number;
  /** Co to za liczba — 'h snu', 'ciężkość 1–10'. ⚠️ Krótko, to idzie pod oś na ekranie. */
  jednostka: string;
};

/**
 * Siła dowodu — steruje TYM, CZY doklejamy zastrzeżenie (Z0-a).
 * Przy `mocny` nie doklejamy niczego; przy `slaby` wgląd MUSI powiedzieć,
 * czego liczba nie mówi, i bez tego się nie zbuduje.
 */
export type SilaDowodu = 'mocny' | 'slaby';

/** Rejestr Z0 — ten sam podział co w `lib/kolejkaPodania.ts`. Nigdy zmieszany. */
export type RejestrZnaczenia = 'fakt_o_tobie' | 'fakt_o_innych' | 'propozycja';

export type Wglad = {
  klucz: KluczWgladu;
  /**
   * ⭐ CZĘŚĆ 1 — LICZBA ZMIERZONA U TEGO ZAWODNIKA.
   * ⛔ Musi zawierać cyfrę. Zdanie bez liczby jest opinią, a opinii produkt
   * nie sprzedaje jako wiedzy (Z0). Sprawdzane przy budowie, nie w teście.
   */
  liczba: string;
  /** ⭐ CZĘŚĆ 2 — CO TO ZNACZY. */
  znaczenie: string;
  /** ⭐ CZĘŚĆ 3 — JEDNA RZECZ DO ZROBIENIA. Czynność, nie rada (M4). */
  doZrobienia: string;
  /**
   * WG-33 — czego liczba NIE mówi.
   * `null` przy dowodzie mocnym (Z0-a: przy rzeczy dobrze udowodnionej nie
   * doklejamy zastrzeżeń). ⛔ Przy `slaby` obowiązkowe.
   */
  czegoNieMowi: string | null;
  silaDowodu: SilaDowodu;
  /** Do którego rejestru Z0 należy CZĘŚĆ 2. Część 1 jest zawsze `fakt_o_tobie`. */
  rejestrZnaczenia: RejestrZnaczenia;
  /** WG-34 — oś pomiarów z datami. Pusta tablica, gdy wgląd nie jest osią. */
  os: PomiarNaOsi[];
  /** Ile pomiarów stoi za wglądem. Strażnik czyta to zamiast zgadywać z tekstu. */
  ilePomiarow: number;
};

/**
 * Wynik JEDNEGO wglądu — trzy stany, nigdy dwa (R5).
 * ⛔ `brak_danych` i `nie_wiem` to NIE jest to samo:
 *   • `brak_danych` — odczyt się udał, danych naprawdę nie ma albo jest za mało;
 *   • `nie_wiem`    — odczytu NIE BYŁO. Wgląd mógłby istnieć i nie wiemy.
 * Zlanie tych dwóch w jeden pusty wynik czyni defekt niewidocznym także dla
 * autora — to jest ten defekt, który metoda pracy równoległej nazywa „cichym brakiem".
 */
export type WynikWgladu =
  | { klucz: KluczWgladu; rodzaj: 'jest'; wglad: Wglad; kandydat: Kandydat }
  | { klucz: KluczWgladu; rodzaj: 'brak_danych'; powod: string; czegoBrakuje: string }
  | { klucz: KluczWgladu; rodzaj: 'nie_wiem'; powod: string };

export type WynikiWgladow = {
  /** ZAWSZE sześć, w kolejności `KLUCZE_WGLADOW`. */
  wyniki: WynikWgladu[];
  /** ⭐ To wchodzi do `ulozKolejke({ …, dodatkowi })`. Nic więcej. */
  kandydaci: Kandydat[];
  /** Wejścia, których nie udało się odczytać (R5). */
  nieWiem: NieWiem[];
  /** Wglądy, które się nie policzyły, z powodem. ⛔ Nie znikają po cichu. */
  brakDanych: { klucz: KluczWgladu; powod: string }[];
  /** `true`, gdy którekolwiek wejście było nieodczytane — lista jest wtedy NIEPEŁNA. */
  niepelna: boolean;
  /** Zdanie do konsoli. ⛔ Nie dla zawodnika. */
  powod: string;
};

// ─────────────────────────────────────────────────────────────────────
// 3. WEJŚCIA — każde z własnym „nie wiem"
// ─────────────────────────────────────────────────────────────────────
// ⚠️ Kształty są 1:1 z kolumnami zmierzonymi w bazie 14.08.2026 wieczorem.
// Producent NIE czyta bazy — mapowanie wiersz → wejście robi wołający,
// a dokładne zapytania stoją w nocie przekazania, w sekcji KONTRAKT.

/**
 * Wpis Dziennika. Jeden wiersz `daily_logs` niesie ALBO sen (`entry_type='morning'`),
 * ALBO ciężkość wysiłku (`entry_type='post_training'`) — nigdy oba naraz
 * (zmierzone: 8 porannych, 2 potreningowe, rozłączne klucze `payload`).
 */
export type WpisDziennikaWglad = {
  /** `daily_logs.id` jako napis. ⛔ NIGDY nie pokazywany zawodnikowi. */
  idWiersza: string;
  /** 'YYYY-MM-DD'. */
  dzien: string;
  /** `payload.sleep_hours`. `null` = ten wiersz nie jest o śnie. */
  senGodziny: number | null;
  /** `payload.rpe`. `null` = ten wiersz nie jest o ciężkości wysiłku. */
  rpe: number | null;
};

export type WydarzenieWglad = {
  /** `calendar_events.id` jako napis. */
  id: string;
  /** `scheduled_date`. `null` przy wydarzeniu cyklicznym — wtedy nie wchodzi do okna. */
  dzien: string | null;
  /** `event_type` — 'micro_session', 'club_training', 'match'… */
  rodzaj: string;
  /** `status` — 'scheduled', 'cancelled', 'completed'. */
  status: string;
  /** Tytuł. Używany wyłącznie przy meczu, żeby wgląd nie zmyślał nazwy. */
  tytul: string;
};

/** `daily_logs.calendar_event_id` — połączenie wpisu z wydarzeniem (otworzył je pas A1). */
export type PowiazanieWpisu = {
  idWpisu: string;
  /** `null` = wpis nie wskazuje żadnego wydarzenia. To jest DZIŚ stan 10 z 10. */
  idWydarzenia: string | null;
};

export type WpisBoluWglad = {
  /** `pain_entries.id` jako napis. */
  idWiersza: string;
  dzien: string;
  /** `body_location` — klucz maszynowy, np. 'lydka'. ⚠️ NIE brzmienie. */
  miejsce: string;
  /** `intensity` 1–10. */
  intensywnosc: number;
  wykluczaZTreningu: boolean;
};

export type WpisMeczuWglad = {
  /** `match_contexts.id` jako napis. */
  idWiersza: string;
  dzien: string;
  /** `match_rpe` 1–10. `null` = zawodnik nie podał. */
  ciezkosc: number | null;
  /** `entered_recovery_state`: 'entered_fresh' | 'entered_fatigued' | 'uncertain'. `null` = nie podał. */
  stanWejscia: string | null;
};

export type ProfilWglad = {
  /** `public.users.birth_year`. `null` = zawodnik go nie podał — to jest WT-26. */
  rokUrodzenia: number | null;
  /**
   * Ile podpowiedzi **widocznych dla ZAWODNIKA** blokuje bramka wiekowa:
   * `min_age is not null AND odbiorca in ('zawodnik','oba')`.
   * ⛔ **NIE liczy się tu samego `min_age is not null`.** Zmierzone 14.08.2026:
   * 18 wierszy ma `min_age`, ale **wszystkie 18 ma `odbiorca='rodzic'`**, więc
   * zawodnik i tak by ich nie zobaczył. Zdanie „18 podpowiedzi zostaje przed Tobą
   * zamkniętych" byłoby wtedy nieprawdą o nim (Z0) — przy zielonych testach.
   * Wartość dla zawodnika wynosi dziś **0** i wgląd stoi wtedy na samej Mapie drogi.
   */
  podpowiedziZaBramkaWieku: number;
  /**
   * Ile podpowiedzi widzi zawodnik w ogóle — mianownik zdania.
   * Ten sam filtr odbiorcy. Zmierzone 14.08.2026: **274 z 297**.
   */
  podpowiedziRazem: number;
  /** Ile odcinków ma Mapa drogi (`road_segments`). 0 = mapy nie ma i nie o rocznik chodzi. */
  odcinkowMapyDrogi: number;
};

export type WejsciaWgladow = {
  /** ⚠️ DZIEŃ WCHODZI ARGUMENTEM. Ten plik nie czyta zegara. */
  dzis: string;
  dziennik: Wejscie<WpisDziennikaWglad[]>;
  kalendarz: Wejscie<WydarzenieWglad[]>;
  /** Wpisy Dziennika wskazujące wydarzenie. Osobne wejście, bo osobne zapytanie. */
  powiazania: Wejscie<PowiazanieWpisu[]>;
  bol: Wejscie<WpisBoluWglad[]>;
  mecze: Wejscie<WpisMeczuWglad[]>;
  profil: Wejscie<ProfilWglad>;
};

// ─────────────────────────────────────────────────────────────────────
// 4. PROGI — jedna tabela, żeby zmiana była jedną linią
// ─────────────────────────────────────────────────────────────────────
// ⚠️ ŻADNA Z TYCH LICZB NIE MA ZA SOBĄ BADANIA I ŻADNA NIE UDAJE, ŻE MA.
// To są decyzje produktowe (O48). Próg snu i okno wpisów biorę z rankera
// (`PROG_SNU_GODZINY`, `OKNO_WPISOW`) — dwie kopie tej samej reguły
// rozjechałyby się po cichu i odpowiadałyby różnie.

/** Ile nocy z zapisanym snem musi być w oknie, żeby w ogóle mówić o serii. */
export const MIN_NOCY_NA_SERIE = 3;
/** Ile pomiarów ciężkości wysiłku potrzeba, żeby zestawiać sen z obciążeniem. */
export const MIN_POMIAROW_RPE = 3;
/** Okno licznika odbytych sesji. Z makiety: „N z M w 14 dni". */
export const OKNO_SESJI_DNI = 14;
/** Ile najbliższych dni uznajemy za „zbliżający się" mecz. */
export const OKNO_ZBLIZAJACEGO_MECZU_DNI = 7;
/** Ile meczów musi być, żeby mówić o kierunku, a nie o jednym gorszym dniu. */
export const MIN_MECZOW_NA_OS = 3;
/** Ile zgłoszeń bólu w tym samym miejscu robi z niego ból POWTARZAJĄCY SIĘ. */
export const MIN_ZGLOSZEN_BOLU = 3;
/** W jakim oknie liczymy powtórzenia bólu. */
export const OKNO_BOLU_DNI = 14;
/** Ile pomiarów pokazuje oś (WG-34). */
export const DLUGOSC_OSI = 3;

/** Znacznik dla Kuby i dla strażnika. ⛔ Nie usuwać do czasu zatwierdzenia brzmień. */
export const BRZMIENIE_DO_PRZEJRZENIA = 'DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-B3, 14.08.2026)';

// ─────────────────────────────────────────────────────────────────────
// 5. NARZĘDZIA — bez `Date`, bez `Intl`, bez zegara
// ─────────────────────────────────────────────────────────────────────

const MIESIACE_DOPELNIACZ = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
] as const;

/**
 * '2026-08-08' → '8 sierpnia'. `null`, gdy data jest nieczytelna —
 * ⛔ NIGDY napis zastępczy, bo data z niczego jest zgadywaniem.
 */
export function dataPoPolsku(iso: string): string | null {
  if (dzienNaLiczbe(iso) === null) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const mies = Number(m[2]);
  const dzien = Number(m[3]);
  return `${dzien} ${MIESIACE_DOPELNIACZ[mies - 1]}`;
}

/** Liczba godzin → '6', '7,5'. Przecinek, bo to zdanie po polsku dla nastolatka. */
export function liczbaPoPolsku(x: number): string {
  const zaokr = Math.round(x * 10) / 10;
  return Number.isInteger(zaokr) ? String(zaokr) : String(zaokr).replace('.', ',');
}

/** 'noc' / 'noce' / 'nocy' — bez tego zdanie z liczbą brzmi jak wygenerowane. */
export function odmiana(n: number, jeden: string, dwaCztery: string, wiele: string): string {
  const abs = Math.abs(n);
  if (abs === 1) return jeden;
  const ost = abs % 10;
  const ostDwie = abs % 100;
  if (ost >= 2 && ost <= 4 && (ostDwie < 12 || ostDwie > 14)) return dwaCztery;
  return wiele;
}

/** Ostatnie `ile` pozycji, w kolejności rosnącej po dniu. Wejście nie jest mutowane. */
function ostatnie<T extends { dzien: string }>(xs: T[], ile: number): T[] {
  const posort = [...xs].sort((a, b) => (a.dzien < b.dzien ? -1 : a.dzien > b.dzien ? 1 : 0));
  return posort.slice(Math.max(0, posort.length - ile));
}

/** Czy `dzien` mieści się w oknie `ile` dni wstecz od `dzis` (włącznie z dziś). */
function wOknieWstecz(dzis: string, dzien: string, ile: number): boolean {
  const d = odstepDni(dzien, dzis);
  // ⚠️ `null` znaczy „data nieczytelna" — NIE „mieści się". Nieczytelna data
  // wypada z okna, bo wgląd zbudowany na niej byłby zbudowany na niczym.
  if (d === null) return false;
  return d >= 0 && d < ile;
}

// ─────────────────────────────────────────────────────────────────────
// 6. ⭐ JEDYNA DROGA, KTÓRĄ POWSTAJE WGLĄD
// ─────────────────────────────────────────────────────────────────────
// Ten sam wzorzec co `slad()` w rankerze i z tego samego powodu: gdyby
// istniała druga droga, ktoś by z niej skorzystał — i to jest dokładnie ten
// sposób, w jaki produkt zaczyna mówić zdania bez pokrycia.

/** Czy zdanie NIESIE LICZBĘ. To jest cała obrona WG-26, wykonana przy budowie. */
export function niesieLiczbe(s: string): boolean {
  return /\d/.test(s);
}

export function zbudujWglad(w: {
  klucz: KluczWgladu;
  liczba: string;
  znaczenie: string;
  doZrobienia: string;
  czegoNieMowi?: string | null;
  silaDowodu: SilaDowodu;
  rejestrZnaczenia: RejestrZnaczenia;
  os?: PomiarNaOsi[];
  ilePomiarow: number;
}): Wglad | null {
  const liczba = w.liczba.trim();
  const znaczenie = w.znaczenie.trim();
  const doZrobienia = w.doZrobienia.trim();
  const czegoNieMowi = (w.czegoNieMowi ?? '').trim();

  // WG-26 — wgląd bez liczby z danych tego zawodnika NIE POWSTAJE.
  if (!niesieLiczbe(liczba)) return null;
  // Trzy części są obowiązkowe. Dwie z trzech to nie jest wgląd, tylko zdanie.
  if (liczba.length === 0 || znaczenie.length === 0 || doZrobienia.length === 0) return null;
  // WG-33 — przy słabym dowodzie MUSI stać, czego liczba nie mówi.
  if (w.silaDowodu === 'slaby' && czegoNieMowi.length === 0) return null;
  // Z0-a — przy mocnym dowodzie NIE doklejamy zastrzeżeń.
  if (w.silaDowodu === 'mocny' && czegoNieMowi.length > 0) return null;
  if (w.ilePomiarow < 1) return null;

  // ⚠️ Rozpisane, a nie `w.os ?? []` — ten zapis wygląda identycznie jak
  // `rows = data ?? []`, czyli jak połknięty błąd, i strażnik go nie odróżnia.
  // Tu chodzi o brak ARGUMENTU (oś jest opcjonalna), nie o nieudany odczyt.
  const osWejsciowa: PomiarNaOsi[] = w.os === undefined ? [] : w.os;
  const os = osWejsciowa.filter((p) => dzienNaLiczbe(p.dzien) !== null).slice(-DLUGOSC_OSI);

  return {
    klucz: w.klucz,
    liczba,
    znaczenie,
    doZrobienia,
    czegoNieMowi: czegoNieMowi.length > 0 ? czegoNieMowi : null,
    silaDowodu: w.silaDowodu,
    rejestrZnaczenia: w.rejestrZnaczenia,
    os,
    ilePomiarow: w.ilePomiarow,
  };
}

/**
 * Wgląd → `Kandydat` dla rankera. ⭐ ODWZOROWANIE TRZECH CZĘŚCI (WG-25):
 *
 *   `co`       ← CZĘŚĆ 1, LICZBA. Pomiar stoi jako pierwszy, tak jak w makiecie.
 *   `dlaczego` ← CZĘŚĆ 2, ZNACZENIE. Przy dowodzie SŁABYM doklejone jest do
 *                niego zdanie „czego liczba nie mówi" — ⚠️ CELOWO, bo inaczej
 *                zastrzeżenie zostałoby o jedno dotknięcie dalej, a zawodnik,
 *                który nic nie kliknie, przeczytałby słaby dowód jak pewnik
 *                (Z0-a każe pokazywać zastrzeżenie DOKŁADNIE tam, gdzie dowód
 *                jest słaby — nie wszędzie i nie o poziom głębiej).
 *   CZĘŚĆ 3, RZECZ DO ZROBIENIA — pole `Wglad.doZrobienia`. ⚠️ `Kandydat` nie
 *   ma na nią miejsca, więc ekran MUSI ją wziąć przez `wgladDlaPozycji()`.
 *   Bez tego wgląd kończy się na wiedzy, a to jest złamanie M4 — patrz sekcja
 *   KONTRAKT w nocie przekazania.
 *
 * ⚠️ `skadToWiemy` opisuje pochodzenie CZĘŚCI 1 (liczby), dlatego jego rejestr
 * to `fakt_o_tobie`. Rejestr CZĘŚCI 2 stoi osobno w `Wglad.rejestrZnaczenia` —
 * dwa rejestry Z0 nigdy nie idą pod jednym podpisem.
 */
export function naKandydata(w: {
  wglad: Wglad;
  id: string;
  skadToWiemy: Slad | null;
  rodzajPracy: RodzajPracy;
  ileZajmieSekund: number | null;
  termin: string | null;
}): Kandydat {
  const dlaczego = w.wglad.czegoNieMowi === null
    ? w.wglad.znaczenie
    : `${w.wglad.znaczenie} ${w.wglad.czegoNieMowi}`;
  return {
    id: w.id,
    co: w.wglad.liczba,
    dlaczego,
    ileZajmieSekund: w.ileZajmieSekund,
    // ⛔ `null` przechodzi dalej ŚWIADOMIE. Bramka rankera odrzuci takiego
    // kandydata i wpisze go do `Kolejka.odrzucone` z powodem. Podstawienie
    // tutaj wypełniacza obeszłoby Z0 w jedynym miejscu, w którym da się je obejść.
    skadToWiemy: w.skadToWiemy,
    wagaBazowa: WAGA_BAZOWA.wglad,
    zrodlo: 'wglad',
    rodzajPracy: w.rodzajPracy,
    podniesioneRecznie: false,
    termin: w.termin,
    godzina: null,
  };
}

/** Deterministyczny identyfikator. Ten sam dzień i ten sam wgląd → to samo `id`. */
export function idWgladu(klucz: KluczWgladu, dzis: string): string {
  return `wglad:${klucz}:${dzis}`;
}

// ─────────────────────────────────────────────────────────────────────
// 7. ⭐ BRZMIENIA — WSZYSTKIE DO PRZEJRZENIA PRZEZ KUBĘ
// ─────────────────────────────────────────────────────────────────────
// ⚠️ To są zdania, które przeczyta nastolatek. Ten pas ich NIE ZATWIERDZA —
// oddaje je w całości w nocie przekazania, sekcja BRZMIENIA. Każde zdanie
// niżej stoi w kodzie jako wynik funkcji, więc zmiana brzmienia jest zmianą
// w jednym miejscu, a nie polowaniem po pliku.
//
// Trzy rzeczy, których w tych zdaniach NIE MA i mieć nie może:
//   • porównania z innym zawodnikiem, normy dla wieku, miejsca w tabeli (N3);
//   • zdania o nastroju, motywacji i samopoczuciu psychicznym (B1);
//   • oceny charakteru („brakuje Ci dyscypliny") — ocena PRACY jest dozwolona
//     w całości, ocena człowieka nie mieści się w żadnym rejestrze Z0 (M1-a).

// ─────────────────────────────────────────────────────────────────────
// 8. SZEŚĆ PRODUCENTÓW
// ─────────────────────────────────────────────────────────────────────
// Każdy ma tę samą sygnaturę i każdy zwraca DOKŁADNIE JEDEN `WynikWgladu`.
// Stoją osobno, a nie w środku `policzWglady()`, z tego samego powodu co
// zasady rankera: strażnik ma umieć podmienić JEDEN z nich na zepsuty
// i policzyć, ile asercji się na tym zapali. Test mutacyjny, który nie ma
// gdzie wstawić mutacji, nie jest testem mutacyjnym.

export type Producent = (w: WejsciaWgladow) => WynikWgladu;

export type ZasadyWgladow = {
  sen_wobec_obciazenia: Producent;
  odbyte_sesje: Producent;
  zblizajacy_sie_mecz: Producent;
  sygnal_kaskady_meczowej: Producent;
  powtarzajacy_sie_bol: Producent;
  brak_roku_urodzenia: Producent;
};

function nieWiem(klucz: KluczWgladu, powod: string): WynikWgladu {
  return { klucz, rodzaj: 'nie_wiem', powod };
}
function brakDanych(klucz: KluczWgladu, powod: string, czegoBrakuje: string): WynikWgladu {
  return { klucz, rodzaj: 'brak_danych', powod, czegoBrakuje };
}

// ── 8.1. SEN WOBEC OBCIĄŻENIA (WG-27, WG-33, WG-34) ──────────────────
// Źródło liczby: `daily_logs.payload.sleep_hours` i `payload.rpe`.
// ⚠️ RPE istnieje DZIŚ w dwóch wierszach w całej historii produktu. Wgląd
// „seria snu wobec ROSNĄCEGO RPE" nie ma z czego powstać w pełnej postaci —
// i mówi to wprost zamiast liczyć kierunek z dwóch punktów.

const senWobecObciazenia: Producent = (w) => {
  const klucz: KluczWgladu = 'sen_wobec_obciazenia';
  if (w.dziennik.rodzaj === 'nie_wiem') return nieWiem(klucz, w.dziennik.powod);
  if (w.dziennik.rodzaj === 'brak') {
    return brakDanych(klucz, 'Dziennik odczytany, zero wpisów', 'choć jeden wpis ze snem');
  }

  const wpisy = w.dziennik.dane.filter((x) => dzienNaLiczbe(x.dzien) !== null);
  const zeSnem = ostatnie(wpisy.filter((x) => x.senGodziny !== null), OKNO_WPISOW);
  const zRpe = ostatnie(wpisy.filter((x) => x.rpe !== null), OKNO_WPISOW);

  if (zeSnem.length < MIN_NOCY_NA_SERIE) {
    return brakDanych(
      klucz,
      `nocy z zapisanym snem: ${zeSnem.length}; serię liczymy od ${MIN_NOCY_NA_SERIE}`,
      `jeszcze ${MIN_NOCY_NA_SERIE - zeSnem.length} ${odmiana(MIN_NOCY_NA_SERIE - zeSnem.length, 'noc', 'noce', 'nocy')} ze snem w Dzienniku`,
    );
  }

  const krotkie = zeSnem.filter((x) => (x.senGodziny as number) < PROG_SNU_GODZINY);
  if (krotkie.length === 0) {
    const naj = zeSnem.reduce((a, b) => ((a.senGodziny as number) <= (b.senGodziny as number) ? a : b));
    return brakDanych(
      klucz,
      `${zeSnem.length} ${odmiana(zeSnem.length, 'noc', 'noce', 'nocy')} w oknie, żadna poniżej ${PROG_SNU_GODZINY} h (najkrótsza ${liczbaPoPolsku(naj.senGodziny as number)} h)`,
      'nie ma czego pokazać — i to jest dobra wiadomość, nie brak funkcji',
    );
  }

  const najkrotsza = krotkie.reduce((a, b) => ((a.senGodziny as number) <= (b.senGodziny as number) ? a : b));
  const dataNajkrotszej = dataPoPolsku(najkrotsza.dzien);
  if (dataNajkrotszej === null) {
    return brakDanych(klucz, `data wpisu nieczytelna: ${najkrotsza.dzien}`, 'poprawnej daty wpisu');
  }

  const dowodMocny = zRpe.length >= MIN_POMIAROW_RPE;
  const liczba = `Spałeś krócej niż ${PROG_SNU_GODZINY} h w ${krotkie.length} z ostatnich `
    + `${zeSnem.length} nocy — najkrócej `
    + `${liczbaPoPolsku(najkrotsza.senGodziny as number)} h, ${dataNajkrotszej}.`;

  const znaczenie = dowodMocny
    ? `Przy takim śnie i ciężkości wysiłku, jaką zapisałeś (${zRpe.length} ${odmiana(zRpe.length, 'pomiar', 'pomiary', 'pomiarów')}), `
      + 'organizm nie nadąża z odbudową — dołożona teraz praca zwykle daje gorszą sesję, nie lepszą.'
    : 'Poniżej sześciu godzin organizm nie odbudowuje się w całości — dołożona wtedy praca '
      + 'zwykle daje gorszą sesję, nie lepszą.';

  const wglad = zbudujWglad({
    klucz,
    liczba,
    znaczenie,
    doZrobienia: 'Dziś połóż się o godzinę wcześniej, niż położyłeś się wczoraj.',
    czegoNieMowi: dowodMocny
      ? null
      : `Ciężkość wysiłku masz zapisaną ${zRpe.length} ${odmiana(zRpe.length, 'raz', 'razy', 'razy')} — `
        + 'to za mało, żeby powiedzieć, czy to krótki sen ciągnie obciążenie, czy obciążenie sen.',
    silaDowodu: dowodMocny ? 'mocny' : 'slaby',
    rejestrZnaczenia: 'propozycja',
    os: ostatnie(zeSnem, DLUGOSC_OSI).map((x) => ({
      dzien: x.dzien, wartosc: x.senGodziny as number, jednostka: 'h snu',
    })),
    ilePomiarow: zeSnem.length + zRpe.length,
  });
  if (wglad === null) {
    return brakDanych(klucz, 'zdanie nie przeszło budowy wglądu', 'liczby w części pierwszej');
  }

  return {
    klucz,
    rodzaj: 'jest',
    wglad,
    kandydat: naKandydata({
      wglad,
      id: idWgladu(klucz, w.dzis),
      skadToWiemy: slad({
        rejestr: 'fakt_o_tobie', skad: 'daily_logs', idWiersza: najkrotsza.idWiersza, klucz: 'journal',
      }),
      // ⚠️ 'zdrowie', nie 'wiecej_objetosci'. Ten wgląd NIE dokłada pracy — mówi
      // o regeneracji. Gdyby był 'wiecej_objetosci', hamulec bólu i Osłona
      // wyciszyłyby go dokładnie wtedy, kiedy jest najbardziej potrzebny.
      rodzajPracy: 'zdrowie',
      ileZajmieSekund: null,
      termin: w.dzis,
    }),
  };
};

// ── 8.2. ODBYTE SESJE: N Z M W 14 DNI (WG-28) ────────────────────────
// Źródło liczby: `daily_logs.calendar_event_id` × `calendar_events`.
// ⛔ NAJWAŻNIEJSZA BRAMKA W CAŁYM PLIKU. Gdy ŻADNA sesja z okna nie ma wpisu,
// licznik pokazałby „0 z 12" — a to nie jest prawda o zawodniku, tylko brak
// zapisu. Zdanie „odbyłeś 0 z 12" jest twierdzeniem o nim, którego nie
// zmierzyliśmy; złamałoby Z0 przy zielonych testach i pełnej bazie.

const odbyteSesje: Producent = (w) => {
  const klucz: KluczWgladu = 'odbyte_sesje';
  if (w.kalendarz.rodzaj === 'nie_wiem') return nieWiem(klucz, w.kalendarz.powod);
  if (w.powiazania.rodzaj === 'nie_wiem') return nieWiem(klucz, w.powiazania.powod);
  if (w.kalendarz.rodzaj === 'brak') {
    return brakDanych(klucz, 'kalendarz odczytany, zero wydarzeń', 'choć jednej zaplanowanej sesji');
  }

  const wOknie = w.kalendarz.dane.filter(
    (e) => e.rodzaj !== 'match'
      && e.status !== 'cancelled'
      && e.dzien !== null
      && wOknieWstecz(w.dzis, e.dzien, OKNO_SESJI_DNI),
  );
  if (wOknie.length === 0) {
    return brakDanych(
      klucz,
      `zaplanowanych sesji w oknie ${OKNO_SESJI_DNI} dni: 0`,
      'choć jednej sesji w ostatnich dwóch tygodniach',
    );
  }

  const zWpisem = w.powiazania.rodzaj === 'jest'
    ? new Set(w.powiazania.dane.map((p) => p.idWydarzenia).filter((x): x is string => x !== null))
    : new Set<string>();

  const odbyte = wOknie.filter((e) => zWpisem.has(e.id));
  const bezWpisu = wOknie.length - odbyte.length;

  if (odbyte.length === 0) {
    return brakDanych(
      klucz,
      `${wOknie.length} zaplanowanych sesji w oknie, 0 z wpisem w Dzienniku — licznik pokazałby `
      + `„0 z ${wOknie.length}", a to nie jest prawda o zawodniku, tylko brak zapisu (Z0)`,
      'choć jednego wpisu Dziennika wskazującego wydarzenie (`daily_logs.calendar_event_id`)',
    );
  }

  const liczba = `W ostatnich ${OKNO_SESJI_DNI} dniach masz wpis przy ${odbyte.length} z `
    + `${wOknie.length} zaplanowanych ${odmiana(wOknie.length, 'sesji', 'sesji', 'sesji')}`
    + (bezWpisu > 0
      ? `. Przy ${bezWpisu} ${odmiana(bezWpisu, 'sesji', 'sesjach', 'sesjach')} wpisu nie ma.`
      : '.');

  const wglad = zbudujWglad({
    klucz,
    liczba,
    znaczenie: 'Licznik pokazuje pracę, którą naprawdę zapisałeś. Sesja bez wpisu nie jest '
      + 'ani zrobiona, ani niezrobiona — i dopóki nie ma wpisu, nikt jej za Ciebie nie policzy.',
    doZrobienia: 'Otwórz Dziennik i dopisz ostatnią sesję.',
    czegoNieMowi: bezWpisu > 0
      ? `Sesji bez wpisu nie liczymy jako opuszczonych — o ${odmiana(bezWpisu, 'tej jednej', 'tych', 'tych')} `
        + `${bezWpisu} po prostu nic nie wiemy.`
      : null,
    silaDowodu: bezWpisu > 0 ? 'slaby' : 'mocny',
    rejestrZnaczenia: 'propozycja',
    os: [],
    ilePomiarow: odbyte.length,
  });
  if (wglad === null) {
    return brakDanych(klucz, 'zdanie nie przeszło budowy wglądu', 'liczby w części pierwszej');
  }

  return {
    klucz,
    rodzaj: 'jest',
    wglad,
    kandydat: naKandydata({
      wglad,
      id: idWgladu(klucz, w.dzis),
      skadToWiemy: slad({
        rejestr: 'fakt_o_tobie', skad: 'daily_logs', idWiersza: odbyte[0].id, klucz: 'journal',
      }),
      rodzajPracy: 'porzadek',
      ileZajmieSekund: 60,
      termin: null,
    }),
  };
};

// ── 8.3. ZBLIŻAJĄCY SIĘ MECZ (WG-30) ─────────────────────────────────
// Źródło liczby: `calendar_events` z `event_type='match'`.
// ⚠️ Zmierzone 14.08: 24 z 24 wierszy to `micro_session`. Ani jednego meczu
// w kalendarzu w całej bazie — ten wgląd nie ma dziś czego wykryć u nikogo.

const zblizajacySieMecz: Producent = (w) => {
  const klucz: KluczWgladu = 'zblizajacy_sie_mecz';
  if (w.kalendarz.rodzaj === 'nie_wiem') return nieWiem(klucz, w.kalendarz.powod);
  if (w.kalendarz.rodzaj === 'brak') {
    return brakDanych(klucz, 'kalendarz odczytany, zero wydarzeń', 'meczu w kalendarzu');
  }

  const mecze = w.kalendarz.dane
    .filter((e) => e.rodzaj === 'match' && e.status !== 'cancelled' && e.dzien !== null)
    .map((e) => ({ e, za: odstepDni(w.dzis, e.dzien as string) }))
    .filter((x): x is { e: WydarzenieWglad; za: number } => x.za !== null)
    .filter((x) => x.za >= 0 && x.za <= OKNO_ZBLIZAJACEGO_MECZU_DNI)
    .sort((a, b) => a.za - b.za);

  if (mecze.length === 0) {
    return brakDanych(
      klucz,
      `meczów w kalendarzu na najbliższe ${OKNO_ZBLIZAJACEGO_MECZU_DNI} dni: 0`,
      "wydarzenia z `event_type='match'` (w całej bazie jest ich dziś zero)",
    );
  }

  const najblizszy = mecze[0];
  const data = dataPoPolsku(najblizszy.e.dzien as string);
  if (data === null) {
    return brakDanych(klucz, `data meczu nieczytelna: ${najblizszy.e.dzien}`, 'poprawnej daty meczu');
  }

  const liczba = najblizszy.za === 0
    ? `Mecz masz dziś, ${data}.`
    : `Mecz masz za ${najblizszy.za} ${odmiana(najblizszy.za, 'dzień', 'dni', 'dni')} — ${data}.`;

  const wglad = zbudujWglad({
    klucz,
    liczba,
    // ⚠️ Zdanie zależy od tego, ILE dni zostało. Jedno brzmienie na oba przypadki
    // mówiłoby „to, co zrobisz jutro" w dniu meczu — czyli nieprawdę.
    znaczenie: najblizszy.za === 0
      ? 'W dniu meczu nie dokładasz pracy. To, co zrobisz przed wyjściem, ma Cię do niego '
        + 'dowieźć — nie zmęczyć.'
      : 'Im bliżej meczu, tym objętość schodzi, a nie rośnie. To, co zrobisz przez najbliższe '
        + 'dni, ma Cię do niego dowieźć — nie zmęczyć.',
    doZrobienia: najblizszy.za === 0
      ? 'Przejrzyj plan na dziś i zdejmij z niego jedną najcięższą rzecz.'
      : 'Przejrzyj plan na jutro i zdejmij z niego jedną najcięższą rzecz.',
    czegoNieMowi: null,
    silaDowodu: 'mocny',
    rejestrZnaczenia: 'propozycja',
    os: [],
    ilePomiarow: 1,
  });
  if (wglad === null) {
    return brakDanych(klucz, 'zdanie nie przeszło budowy wglądu', 'liczby w części pierwszej');
  }

  return {
    klucz,
    rodzaj: 'jest',
    wglad,
    kandydat: naKandydata({
      wglad,
      id: idWgladu(klucz, w.dzis),
      skadToWiemy: slad({
        rejestr: 'fakt_o_tobie', skad: 'calendar_events', idWiersza: najblizszy.e.id, klucz: 'calendar',
      }),
      rodzajPracy: 'inne',
      ileZajmieSekund: 60,
      termin: najblizszy.e.dzien,
    }),
  };
};

// ── 8.4. SYGNAŁ Z KASKADY MECZOWEJ (WG-30, WG-34) ────────────────────
// Źródło liczby: `match_contexts` — `match_rpe` i `entered_recovery_state`.
// ⚠️ Zmierzone 14.08: 2 wiersze w całej bazie, oba z tego samego dnia.
// Oś TRZECH pomiarów nie da się narysować z dwóch punktów i ten producent
// tego nie udaje — oddaje `brak_danych` z podaną liczbą, nie zmyśloną osią.

const sygnalKaskadyMeczowej: Producent = (w) => {
  const klucz: KluczWgladu = 'sygnal_kaskady_meczowej';
  if (w.mecze.rodzaj === 'nie_wiem') return nieWiem(klucz, w.mecze.powod);
  if (w.mecze.rodzaj === 'brak') {
    return brakDanych(klucz, 'mecze odczytane, zero opisanych', 'choć jednego opisanego meczu');
  }

  const zCiezkoscia = w.mecze.dane
    .filter((m) => m.ciezkosc !== null && dzienNaLiczbe(m.dzien) !== null);

  if (zCiezkoscia.length < MIN_MECZOW_NA_OS) {
    return brakDanych(
      klucz,
      `opisanych meczów z ciężkością: ${zCiezkoscia.length}; oś rysujemy od ${MIN_MECZOW_NA_OS}`,
      `jeszcze ${MIN_MECZOW_NA_OS - zCiezkoscia.length} ${odmiana(MIN_MECZOW_NA_OS - zCiezkoscia.length, 'opisanego meczu', 'opisane mecze', 'opisanych meczów')}`,
    );
  }

  const trzy = ostatnie(zCiezkoscia, DLUGOSC_OSI);
  const ciag = trzy.map((m) => String(m.ciezkosc)).join(' → ');
  const daty = trzy
    .map((m) => dataPoPolsku(m.dzien))
    .filter((d): d is string => d !== null);
  if (daty.length !== trzy.length) {
    return brakDanych(klucz, 'któraś z dat meczu jest nieczytelna', 'poprawnych dat trzech meczów');
  }

  const pierwszy = trzy[0].ciezkosc as number;
  const ostatniM = trzy[trzy.length - 1].ciezkosc as number;
  const rosnie = ostatniM > pierwszy;
  const swiezoWszedl = trzy.filter((m) => m.stanWejscia === 'entered_fatigued').length;

  const liczba = `Ostatnie ${trzy.length} mecze — ciężkość ${ciag} (${daty.join(', ')}).`
    + (swiezoWszedl > 0
      ? ` W ${swiezoWszedl} z nich wszedłeś zmęczony.`
      : '');

  const wglad = zbudujWglad({
    klucz,
    liczba,
    znaczenie: rosnie
      ? 'Trzy pomiary z rzędu w tę samą stronę to już kierunek, a nie jeden gorszy dzień. '
        + 'Rosnąca ciężkość znaczy, że ten sam mecz kosztuje Cię coraz więcej.'
      : 'Trzy pomiary z rzędu bez wzrostu znaczą, że mecz kosztuje Cię tyle samo co wcześniej — '
        + 'to jest baza, na której da się dokładać pracę.',
    doZrobienia: 'Otwórz zakładkę Mecz i opisz ostatni mecz — kaskada czeka na jeden segment.',
    czegoNieMowi: null,
    silaDowodu: 'mocny',
    rejestrZnaczenia: 'propozycja',
    os: trzy.map((m) => ({ dzien: m.dzien, wartosc: m.ciezkosc as number, jednostka: 'ciężkość 1–10' })),
    ilePomiarow: trzy.length,
  });
  if (wglad === null) {
    return brakDanych(klucz, 'zdanie nie przeszło budowy wglądu', 'liczby w części pierwszej');
  }

  return {
    klucz,
    rodzaj: 'jest',
    wglad,
    kandydat: naKandydata({
      wglad,
      id: idWgladu(klucz, w.dzis),
      skadToWiemy: slad({
        rejestr: 'fakt_o_tobie',
        skad: 'match_contexts',
        idWiersza: trzy[trzy.length - 1].idWiersza,
        klucz: 'mecz',
      }),
      rodzajPracy: 'inne',
      ileZajmieSekund: 180,
      termin: null,
    }),
  };
};

// ── 8.5. POWTARZAJĄCY SIĘ BÓL → ZADANIE (WT-25) ──────────────────────
// Źródło liczby: `pain_entries` — `body_location`, `intensity`, `created_at`.
// ⚠️ Zmierzone 14.08: 1 wiersz w całej bazie. Próg trzech zgłoszeń w 14 dniach
// jest DECYZJĄ PRODUKTOWĄ, nie liczbą z badania — stoi w tabeli progów §4.

const powtarzajacySieBol: Producent = (w) => {
  const klucz: KluczWgladu = 'powtarzajacy_sie_bol';
  if (w.bol.rodzaj === 'nie_wiem') return nieWiem(klucz, w.bol.powod);
  if (w.bol.rodzaj === 'brak') {
    return brakDanych(klucz, 'wpisy bólowe odczytane, zero wpisów', 'choć jednego zgłoszenia bólu');
  }

  const wOknie = w.bol.dane.filter((b) => wOknieWstecz(w.dzis, b.dzien, OKNO_BOLU_DNI));
  const poMiejscu = new Map<string, WpisBoluWglad[]>();
  for (const b of wOknie) {
    const lista = poMiejscu.get(b.miejsce);
    if (lista) lista.push(b);
    else poMiejscu.set(b.miejsce, [b]);
  }

  let najczestsze: WpisBoluWglad[] | null = null;
  for (const lista of poMiejscu.values()) {
    if (najczestsze === null || lista.length > najczestsze.length) najczestsze = lista;
  }

  if (najczestsze === null || najczestsze.length < MIN_ZGLOSZEN_BOLU) {
    const ile = najczestsze === null ? 0 : najczestsze.length;
    return brakDanych(
      klucz,
      `najwięcej zgłoszeń bólu w jednym miejscu w oknie ${OKNO_BOLU_DNI} dni: ${ile}; `
      + `„powtarzający się" liczymy od ${MIN_ZGLOSZEN_BOLU}`,
      `jeszcze ${MIN_ZGLOSZEN_BOLU - ile} ${odmiana(MIN_ZGLOSZEN_BOLU - ile, 'zgłoszenie', 'zgłoszenia', 'zgłoszeń')} tego samego miejsca`,
    );
  }

  const posort = ostatnie(najczestsze, najczestsze.length);
  const pierwszy = posort[0];
  const ostatniB = posort[posort.length - 1];
  const dni = odstepDni(pierwszy.dzien, w.dzis);
  const najmocniej = posort.reduce((a, b) => (a.intensywnosc >= b.intensywnosc ? a : b));
  const dataOstatniego = dataPoPolsku(ostatniB.dzien);
  if (dni === null || dataOstatniego === null) {
    return brakDanych(klucz, 'data zgłoszenia bólu nieczytelna', 'poprawnych dat zgłoszeń');
  }

  // ⚠️ `miejsce` jest kluczem maszynowym. Nazwę po polsku bierzemy z mapy, która
  // ma właściciela; klucza spoza mapy NIE ZGADUJEMY — wtedy zdanie mówi „ten sam
  // ból" bez nazwy, co jest prawdą, a zgadnięta nazwa byłaby zmyśleniem.
  const nazwaMiejsca = BODY_LOCATION_LABELS[najmocniej.miejsce];
  const opisBolu = nazwaMiejsca === undefined
    ? 'Ten sam ból'
    : `${nazwaMiejsca}: ten sam ból`;
  const liczba = `${opisBolu} zapisałeś ${posort.length} ${odmiana(posort.length, 'raz', 'razy', 'razy')} `
    + `w ostatnich ${OKNO_BOLU_DNI} dniach — pierwszy raz ${dni} `
    + `${odmiana(dni, 'dzień', 'dni', 'dni')} temu, ostatni ${dataOstatniego}, najmocniej `
    + `${najmocniej.intensywnosc} na 10.`;

  const wglad = zbudujWglad({
    klucz,
    liczba,
    znaczenie: 'Ból, który wraca trzeci raz, przestaje być zmęczeniem po treningu. '
      + 'To jest rzecz do sprawdzenia przez człowieka, który może Cię obejrzeć i dotknąć — '
      + 'appka tego nie zrobi.',
    doZrobienia: 'Zamów wizytę u fizjoterapeuty.',
    czegoNieMowi: null,
    silaDowodu: 'mocny',
    rejestrZnaczenia: 'propozycja',
    os: posort.slice(-DLUGOSC_OSI).map((b) => ({
      dzien: b.dzien, wartosc: b.intensywnosc, jednostka: 'ból 1–10',
    })),
    ilePomiarow: posort.length,
  });
  if (wglad === null) {
    return brakDanych(klucz, 'zdanie nie przeszło budowy wglądu', 'liczby w części pierwszej');
  }

  return {
    klucz,
    rodzaj: 'jest',
    wglad,
    kandydat: naKandydata({
      wglad,
      id: idWgladu(klucz, w.dzis),
      skadToWiemy: slad({
        rejestr: 'fakt_o_tobie', skad: 'pain_entries', idWiersza: ostatniB.idWiersza, klucz: 'journal',
      }),
      rodzajPracy: 'zdrowie',
      ileZajmieSekund: 120,
      termin: w.dzis,
    }),
  };
};

// ── 8.6. BRAK ROKU URODZENIA → POZYCJA ZE SKUTKIEM BRAKU (WT-26) ─────
// Źródło liczby: `public.users.birth_year` + policzalny SKUTEK braku.
// ⚠️ Sam brak nie jest liczbą, więc wgląd bez skutku by NIE POWSTAŁ (WG-26).
// Liczbą jest to, co przez ten brak nie dociera do zawodnika: bramka wiekowa
// `lib/componentHints.ts#passesAgeGate` przy nieznanym wieku przepuszcza
// WYŁĄCZNIE podpowiedzi bez bramki, a `lib/mapaDrogi.ts#wybierzOdcinek`
// oddaje `nie_wiem: 'nie znam rocznika zawodnika'`.

const brakRokuUrodzenia: Producent = (w) => {
  const klucz: KluczWgladu = 'brak_roku_urodzenia';
  if (w.profil.rodzaj === 'nie_wiem') return nieWiem(klucz, w.profil.powod);
  if (w.profil.rodzaj === 'brak') {
    return brakDanych(klucz, 'profil odczytany, brak wiersza', 'wiersza profilu zawodnika');
  }

  const p = w.profil.dane;
  if (p.rokUrodzenia !== null) {
    return brakDanych(
      klucz,
      `rok urodzenia podany (${p.rokUrodzenia}) — nie ma czego uzupełniać`,
      'nic; ta pozycja pojawia się wyłącznie przy braku rocznika',
    );
  }
  if (p.podpowiedziZaBramkaWieku <= 0 && p.odcinkowMapyDrogi <= 0) {
    // ⛔ Bez policzalnego skutku zostałoby samo „uzupełnij dane" — zdanie bez
    // liczby, czyli opinia. WT-26 wymaga PODANEGO SKUTKU, nie prośby.
    return brakDanych(
      klucz,
      'rocznika nie ma, ale skutek braku wynosi dziś zero (0 podpowiedzi za bramką wieku, 0 odcinków Mapy)',
      'treści, która naprawdę zależy od rocznika',
    );
  }

  const czesci: string[] = [];
  if (p.podpowiedziZaBramkaWieku > 0) {
    czesci.push(
      `${p.podpowiedziZaBramkaWieku} z ${p.podpowiedziRazem} podpowiedzi `
      + `${odmiana(p.podpowiedziZaBramkaWieku, 'zostaje', 'zostają', 'zostaje')} przed Tobą `
      + odmiana(p.podpowiedziZaBramkaWieku, 'zamknięta', 'zamknięte', 'zamkniętych'),
    );
  }
  if (p.odcinkowMapyDrogi > 0) {
    czesci.push(`z ${p.odcinkowMapyDrogi} ${odmiana(p.odcinkowMapyDrogi, 'odcinka', 'odcinków', 'odcinków')} Mapy drogi nie umiemy wybrać Twojego`);
  }

  const liczba = `Nie znamy Twojego rocznika — przez to ${czesci.join(', a ')}.`;

  const wglad = zbudujWglad({
    klucz,
    liczba,
    znaczenie: 'Rocznik jest jedyną rzeczą, po której dobieramy treść do etapu. '
      + 'Bez niego dostajesz wersję najostrożniejszą, czyli nie swoją.',
    doZrobienia: 'Wpisz rok urodzenia w zakładce Ja.',
    czegoNieMowi: null,
    silaDowodu: 'mocny',
    rejestrZnaczenia: 'propozycja',
    os: [],
    ilePomiarow: 1,
  });
  if (wglad === null) {
    return brakDanych(klucz, 'zdanie nie przeszło budowy wglądu', 'liczby w części pierwszej');
  }

  return {
    klucz,
    rodzaj: 'jest',
    wglad,
    kandydat: naKandydata({
      wglad,
      id: idWgladu(klucz, w.dzis),
      // ⚠️ `idWiersza: null` jest tu POPRAWNY: to jest fakt o BRAKU wartości
      // w wierszu profilu, a nie o konkretnym rekordzie. Ślad zostaje prawdziwy,
      // bo `slad()` wymaga rejestru, źródła i klucza — nie identyfikatora.
      skadToWiemy: slad({
        rejestr: 'fakt_o_tobie', skad: 'users', idWiersza: null, klucz: 'profile',
      }),
      rodzajPracy: 'porzadek',
      ileZajmieSekund: 20,
      termin: null,
    }),
  };
};

export const ZASADY_WGLADOW: ZasadyWgladow = {
  sen_wobec_obciazenia: senWobecObciazenia,
  odbyte_sesje: odbyteSesje,
  zblizajacy_sie_mecz: zblizajacySieMecz,
  sygnal_kaskady_meczowej: sygnalKaskadyMeczowej,
  powtarzajacy_sie_bol: powtarzajacySieBol,
  brak_roku_urodzenia: brakRokuUrodzenia,
};

// ─────────────────────────────────────────────────────────────────────
// 9. JEDNA FUNKCJA WEJŚCIOWA
// ─────────────────────────────────────────────────────────────────────

/**
 * Liczy wszystkie sześć wglądów i oddaje kandydatów dla rankera.
 *
 * ⛔ DRUGIEGO ARGUMENTU NIE PODAJE PRODUKCJA. Podmiana producentów istnieje
 * wyłącznie dla strażnika mutacyjnego — tak samo jak `Zasady` w rankerze.
 *
 * ⚠️ Ta funkcja NIE FILTRUJE za rankera. Kandydat, który przegra z arbitrem,
 * wychodzi stąd normalnie; wyciszenie z powodem i warunkiem powrotu nadaje
 * `ulozKolejke()` (WG-32). Filtrowanie tutaj sprawiłoby, że wgląd znika
 * po cichu, a nikt nie umie powiedzieć, czego zawodnik nie zobaczył.
 */
export function policzWglady(
  w: WejsciaWgladow,
  zasady: ZasadyWgladow = ZASADY_WGLADOW,
): WynikiWgladow {
  if (dzienNaLiczbe(w.dzis) === null) {
    // ⛔ Bez czytelnego dnia każde okno („ostatnie 14 dni") jest zgadywaniem.
    // Nie oddajemy pustki — oddajemy „nie wiem" na wszystkich sześciu (R5).
    return {
      wyniki: KLUCZE_WGLADOW.map((k) => nieWiem(k, `dzień nieczytelny: ${w.dzis}`)),
      kandydaci: [],
      nieWiem: [{ wejscie: 'dzis', powod: `dzień nieczytelny: ${w.dzis}` }],
      brakDanych: [],
      niepelna: true,
      powod: `wglądów nie policzono: dzień wejściowy nieczytelny (${w.dzis})`,
    };
  }

  const wyniki: WynikWgladu[] = KLUCZE_WGLADOW.map((k) => zasady[k](w));

  const kandydaci: Kandydat[] = [];
  const nieWiemy: NieWiem[] = [];
  const brakiDanych: { klucz: KluczWgladu; powod: string }[] = [];

  for (const wy of wyniki) {
    if (wy.rodzaj === 'jest') kandydaci.push(wy.kandydat);
    else if (wy.rodzaj === 'nie_wiem') nieWiemy.push({ wejscie: `wglad:${wy.klucz}`, powod: wy.powod });
    else brakiDanych.push({ klucz: wy.klucz, powod: wy.powod });
  }

  return {
    wyniki,
    kandydaci,
    nieWiem: nieWiemy,
    brakDanych: brakiDanych,
    niepelna: nieWiemy.length > 0,
    powod: `wglądów policzonych: ${kandydaci.length} z ${KLUCZE_WGLADOW.length}; `
      + `bez danych: ${brakiDanych.length}; nieodczytanych wejść: ${nieWiemy.length}`,
  };
}

/**
 * Trzy części wglądu po `id` pozycji kolejki — dla ekranu, który chce pokazać
 * pełną kartę (WG-25), a nie sam wiersz listy. `null`, gdy pozycja o takim `id`
 * nie jest wglądem. ⛔ Nie zgaduj: brak wpisu znaczy „to nie jest wgląd".
 */
export function wgladDlaPozycji(wyniki: WynikiWgladow, id: string): Wglad | null {
  for (const w of wyniki.wyniki) {
    if (w.rodzaj === 'jest' && w.kandydat.id === id) return w.wglad;
  }
  return null;
}

/**
 * Czy każdy oddany kandydat ma PRAWDZIWY ślad. Wołane przez strażnika
 * i dostępne dla ekranu diagnostycznego — kandydat bez śladu zostałby
 * odrzucony przez ranker i wgląd zniknąłby, a nikt by nie zauważył.
 */
export function wszyscyKandydaciMajaSlad(wyniki: WynikiWgladow): boolean {
  return wyniki.kandydaci.every((k) => czyPrawdziwySlad(k.skadToWiemy));
}
