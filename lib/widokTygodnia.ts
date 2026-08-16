// PLAN-D-C1 08.2026 (14.08.2026) — WIDOK TYGODNIA. NOWY PLIK.
//
//   npx tsx lib/widokTygodnia.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// Czysta logika: ZERO Reacta, ZERO Supabase. Wejścia argumentem, jak w rankerze
// (`lib/kolejkaPodania.ts`). Powód jest ten sam co tam: reguła, której nie da
// się sprawdzić bez ekranu i bez sieci, po cichu przestaje obowiązywać.
//
// ═══════════════════════════════════════════════════════════════════════════
// ── PO CO TEN PLIK ISTNIEJE ────────────────────────────────────────────────
//
// `app/(tabs)/kalendarz.tsx` grupuje wiersze PO STATUSIE (Cykliczne /
// Nadchodzące / Minione / Anulowane). `claude/MAKIETA_WIDOK_TYGODNIA.html`
// pokazuje coś zupełnie innego: SIEDEM WIERSZY DNI, cały tydzień naraz,
// z wagą każdego dnia widoczną bez czytania legendy.
//
// Rejestr obietnic (`claude/REJESTR_WT_WIDOK_TYGODNIA.md`) nazwał to jedną
// liczbą: JEDENAŚCIE obietnic czeka na JEDEN brakujący element — wiersz dnia.
// Nie na jedenaście funkcji.
//
// ── TRZY RZECZY, KTÓRE SĄ TU, A NIE NA EKRANIE, I DLACZEGO ─────────────────
//
//  1. **WAGA DNIA** — reguła, nie wrażenie. Progi stoją w JEDNEJ tabeli stałych
//     (`PUNKTY_RODZAJU` + `PROGI_WAGI`), tak jak w rankerze, żeby zmiana każdej
//     z nich była jedną linią, a nie polowaniem po pliku ekranu.
//  2. **ZDANIE NAD TYGODNIEM** (WT-08, WT-09) — powstaje WYŁĄCZNIE z policzonych
//     wierszy. Brak danych → zdanie NIE POWSTAJE. Nie powstaje puste i nie
//     powstaje ogólne (Z0: produkt nie mówi zawodnikowi rzeczy, których nie
//     zmierzył).
//  3. **KOLIZJA** (WT-11) — wymaga OBU liczb: końca szkoły i godziny wydarzenia.
//     Brak którejkolwiek → NIE MA ostrzeżenia, jest jawne „nie wiem".
//
// ── CZEGO TEN PLIK NIE ROBI ────────────────────────────────────────────────
// ⛔ NIE BUDUJE SIATKI GODZINOWEJ i nie da się go o to poprosić. Obietnica
//    WT-34 („nie ma siatki godzinowej") jest dziś w stanie JEST i siatka
//    ZGASIŁABY spełnioną obietnicę. Uzasadnienie stoi w stopce makiety:
//    `calendar_events.scheduled_date` to data BEZ godziny, więc siatka
//    rysowałaby pozycje w miejscach, których nie znamy.
// ⛔ NIE MAPUJE RODZAJU ANI ŹRÓDŁA PO SWOJEMU. Jedno i drugie rozstrzygają
//    `opiszRodzaj` i `opiszZrodlo` z `lib/meczWKalendarzu.ts` — ten plik tylko
//    ich WYNIKI przekłada na wagę i na klasę kropki.
// ⛔ NIE CZYTA ZEGARA. Dzisiejsza data wchodzi parametrem (reguła E-N2).
// ⛔ NIE UŻYWA `?? []` NA WEJŚCIACH. „Nie udało się odczytać" i „nic nie masz"
//    to dwa różne zdania (R5) i tydzień bez danych ma powiedzieć, CZEGO NIE WIE.
// ═══════════════════════════════════════════════════════════════════════════

import { DAYS_OF_WEEK, MONTHS_GENITIVE_PL } from './date-utils';
import { formatujGodzine } from './godzinaWydarzenia';
import {
  oknoDnia,
  wykryjCiasno,
  isoDzienTygodnia,
  PROG_CIASNO_MINUT,
  type PlanTygodnia,
  type OknoSzkolne,
} from './planLekcji';
import {
  opiszRodzaj,
  opiszZrodlo,
  type OpisRodzaju,
  type OpisZrodla,
  type RodzajWydarzenia,
} from './meczWKalendarzu';
// ⭐ PLAN-D-D1 08.2026 (14.08.2026) — REGUŁA CZTERECH STANÓW WYPROWADZIŁA SIĘ
// STĄD DO `lib/wykonanieSesji.ts` i ten plik ją WOŁA, zamiast trzymać drugą
// kopię. Powód jest policzalny: od pasa D1 ta sama reguła musi rozstrzygać
// także POJEDYNCZE WYSTĄPIENIE reguły cyklicznej i uwzględniać werdykt
// zawodnika („nie odbyłem"), a dwie kopie rozjechałyby się przy pierwszej
// poprawce — każda z osobna wyglądając poprawnie.
import {
  rozstrzygnijWykonanie,
  akcjaDlaWystapienia,
  PLAKIETKI_WYKONANIA,
  WERDYKTY_NIEPODANE,
  type StanWykonania,
  type WejscieWerdyktow,
  type AkcjaWystapienia,
} from './wykonanieSesji';

// ═══════════════════════════════════════════════════════════════════
// 1. WEJŚCIA — KAŻDE Z JAWNYM STANEM „NIE ODCZYTAŁEM"
// ═══════════════════════════════════════════════════════════════════

/**
 * Wiersz `calendar_events` w kształcie, w jakim przychodzi z PostgREST.
 * Nie „wygodny obiekt" — kształt bazy, bo to on przyjdzie do appki.
 */
export type WierszWydarzenia = {
  id: number;
  title: string;
  event_type: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  recurrence_rule: string | null;
  source: string | null;
};

export type WejscieTygodnia = {
  /** Poniedziałek oglądanego tygodnia, `YYYY-MM-DD`. */
  poniedzialek: string;
  /**
   * Dzisiejsza data, `YYYY-MM-DD`.
   * ⚠️ PARAMETREM, nie z zegara — inaczej nie da się sprawdzić testem
   * dla konkretnego dnia (reguła E-N2, ta sama co w `glosTygodnia.ts`).
   */
  dzisiaj: string;
  /**
   * Wydarzenia zawodnika.
   * ⚠️ `null` znaczy ODCZYT SIĘ NIE UDAŁ — nie „pusto". Pusta tablica znaczy
   * „odczytałem i nic nie ma". Sklejenie tych dwóch to dokładnie ten defekt,
   * przed którym broni się `lib/planLekcji.ts` polem `odczytany`.
   */
  wydarzenia: readonly WierszWydarzenia[] | null;
  /**
   * Plan lekcji po `parsujPlanLekcji`. `null` = w ogóle nie próbowano odczytać.
   * Nieudany odczyt to `{ odczytany: false }`, a to jest COŚ INNEGO niż
   * „zawodnik nie podał planu".
   */
  planLekcji: PlanTygodnia | null;
  /**
   * `calendar_event_id` z `daily_logs` — czyli te pozycje, które mają wpis.
   * ⚠️ `null` = odczyt się nie udał. Wtedy przeszła pozycja dostaje stan
   * `nie_odczytano`, a NIE „brak wpisu" i tym bardziej nie „nie wykonano".
   */
  wpisyDziennika: ReadonlySet<number> | null;
  /**
   * ⭐ PLAN-D-D1 — WERDYKTY ZAWODNIKA („odbyłem" / „nie odbyłem") o KONKRETNYCH
   * WYSTĄPIENIACH, z `session_verdicts`.
   *
   * ⚠️ POLE JEST OPCJONALNE I TO JEST DECYZJA, NIE NIEDOPATRZENIE. Wołający,
   * który o werdyktach nie wie (starszy ekran, test sprzed pasa D1), dostaje
   * `WERDYKTY_NIEPODANE` — jawne wejście z powodem, zachowujące się identycznie
   * jak `{rodzaj:'brak'}`. ⛔ To NIE JEST `?? []`: „brak" i „nie odczytałem"
   * pozostają rozróżnialne, bo `nie_odczytano` trzeba podać JAWNIE i nie da się
   * go dostać przez pominięcie pola.
   */
  werdykty?: WejscieWerdyktow;
};

// ═══════════════════════════════════════════════════════════════════
// 2. ⭐ WAGA DNIA — JEDNA TABELA STAŁYCH, ZMIANA KAŻDEJ TO JEDNA LINIA
// ═══════════════════════════════════════════════════════════════════
//
// ⚠️ TE LICZBY NIE SĄ ZMIERZONE i nie udają, że są. Baza nie zna czasu trwania
// wydarzenia (jedyna liczba o czasie pracy to `daily_logs.payload->>
// 'duration_minutes'`, n = 2 — patrz `lib/planLekcji.ts`, sekcja o progu
// „ciasno"). Punkty są UPORZĄDKOWANIEM, nie pomiarem: mówią wyłącznie, że mecz
// waży więcej niż trening klubowy, a ten więcej niż zadanie.
//
// SKĄD KOLEJNOŚĆ: z obietnicy WG-03 — „dzień meczowy widać jako najcięższy BEZ
// CZYTANIA LEGENDY". Mecz musi więc sam z siebie przeskakiwać najwyższy próg.
//
// ⚠️ ZMIANA PROGU = ZMIANA JEDNEJ LICZBY TUTAJ. Liczba wpisana w warunek
// zamiast stałej byłaby nie do znalezienia i nie do zmiany w jednym miejscu.

/** Ile „waży" jedna pozycja danego rodzaju. Klucze = pięć rodzajów z CHECK-a bazy. */
export const PUNKTY_RODZAJU: Record<RodzajWydarzenia, number> = {
  match: 6,
  club_training: 3,
  own_training: 2,
  micro_session: 2,
  task: 1,
};

/** Pięć wag dnia. `nie_wiem` NIE jest wagą — jest brakiem wagi i ma to widać. */
export type WagaDnia = 'pusty' | 'lekki' | 'sredni' | 'ciezki' | 'nie_wiem';

/**
 * Progi, od największego. Pierwszy pasujący wygrywa.
 * ⚠️ Kolejność malejąca jest częścią reguły — pilnuje jej asercja w selfteście.
 */
export const PROGI_WAGI: ReadonlyArray<{ odPunktow: number; waga: WagaDnia }> = [
  { odPunktow: 6, waga: 'ciezki' },
  { odPunktow: 3, waga: 'sredni' },
  { odPunktow: 1, waga: 'lekki' },
  { odPunktow: 0, waga: 'pusty' },
];

// ⭐ NIEZMIENNIK WG-03, PILNOWANY PRZEZ STRAŻNIKA:
//    `PUNKTY_RODZAJU.match >= PROGI_WAGI[0].odPunktow`
// czyli SAM MECZ, bez niczego obok, sięga najwyższej wagi. To jest cała treść
// obietnicy „dzień meczowy widać jako najcięższy bez czytania legendy" —
// zapisana jako liczba, a nie jako intencja w komentarzu.

/**
 * Słowo, którym waga dnia opisuje pozycję tego rodzaju (WG-07: „Sesja + klub").
 *
 * ⚠️ TO NIE JEST DRUGA MAPA NAZW RODZAJÓW obok `EVENT_TYPE_LABELS`. Tamta
 * odpowiada na pytanie „jak nazywa się ta pozycja" („Trening klubowy"), ta —
 * „z czego składa się ten dzień" („klub"). Makieta wymaga obu rejestrów naraz
 * w tym samym wierszu. Strażnik wymusza komplet pięciu kluczy, więc rodzaj
 * dołożony do bazy nie może po cichu zostać bez słowa.
 */
export const SLOWA_WAGI: Record<RodzajWydarzenia, string> = {
  match: 'mecz',
  micro_session: 'sesja',
  club_training: 'klub',
  own_training: 'trening własny',
  task: 'zadanie',
};

/** Kolejność członów opisu wagi. Stała, żeby ten sam dzień zawsze brzmiał tak samo. */
export const KOLEJNOSC_SLOW_WAGI: readonly RodzajWydarzenia[] = [
  'match', 'micro_session', 'club_training', 'own_training', 'task',
];

// ═══════════════════════════════════════════════════════════════════
// 3. BRZMIENIA — ⚠️ WSZYSTKIE DO PRZEJRZENIA PRZEZ KUBĘ
// ═══════════════════════════════════════════════════════════════════
// Pochodzenie każdego jest podane przy nim: „z makiety" znaczy co do znaku
// z `claude/MAKIETA_WIDOK_TYGODNIA.html`, „nowe" znaczy, że makieta tego
// przypadku nie pokazuje i zdanie powstało tutaj.

/** Z makiety, kolumna 1, dzień bez pozycji (WT-16). */
export const PODPIS_DNIA_BEZ_POZYCJI = 'Nic zaplanowanego.';

/** Z makiety, WG-07 — dzień, w którym jedynym rodzajem jest mecz. */
export const OPIS_WAGI_DZIEN_MECZOWY = 'Dzień meczowy';

/** NOWE — makieta nie pokazuje dnia z rodzajem spoza piątki znanej appce. */
export const OPIS_WAGI_NIE_WIEM = 'Nie znam wszystkiego, co masz tego dnia';

/** Z makiety, pasek zajętości dnia bez szkoły. */
export const PASEK_WOLNE = 'wolne';

/** NOWE — tydzień, którego nie udało się odczytać. R5: to nie jest pustka. */
export const NIE_UDALO_SIE_ODCZYTAC_TYGODNIA =
  'Nie udało się odczytać Twojego kalendarza. To nie znaczy, że nic w nim nie masz — pociągnij w dół, żeby spróbować jeszcze raz.';

/** Znacznik dla Kuby i dla strażnika — jak w `lib/trzyPustki.ts`. */
export const BRZMIENIE_DO_PRZEJRZENIA = 'DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-C1, 14.08.2026)';

/**
 * Legenda kropek (WT-18) — co do znaku z makiety, kolumna 3.
 * Kolejność też z makiety.
 */
export const LEGENDA_KROPEK: ReadonlyArray<{ kropka: KlasaKropki; opis: string }> = [
  { kropka: 'blok', opis: 'Sesja Bloku Skupienia (system zaplanował)' },
  { kropka: 'klub', opis: 'Trening — Ty dodałeś' },
  { kropka: 'mecz', opis: 'Mecz' },
  { kropka: 'zadanie', opis: 'Zadanie wstawione w dzień' },
];

// ═══════════════════════════════════════════════════════════════════
// 4. KSZTAŁTY WYJŚCIA
// ═══════════════════════════════════════════════════════════════════

/** Klasa kropki przy pozycji. `nieznana` = rodzaj spoza piątki (R5). */
export type KlasaKropki = 'blok' | 'klub' | 'mecz' | 'zadanie' | 'nieznana';

/**
 * ⭐ TRZY STANY DNIA PRZESZŁEGO (WG-05) — plus czwarty, który jest brakiem
 * odpowiedzi, a nie odpowiedzią.
 *
 * ⚠️ PLAN-D-D1 14.08.2026 — DEFINICJA WYPROWADZIŁA SIĘ DO `lib/wykonanieSesji.ts`.
 * Tu zostaje wyłącznie NAZWA, pod którą znają ją istniejące ekrany, żeby
 * przeprowadzka nie kosztowała ani jednej zmiany u wołających.
 * ⛔ NIE DOPISUJ TU KOLEJNEGO STANU ANI DRUGIEJ TABELI PLAKIETEK — jedno
 * miejsce, i jest nim `lib/wykonanieSesji.ts`. ⚠️ PLAN-D-K1 16.08.2026 —
 * piąty stan (`odwolane`) POWSTAŁ WŁAŚNIE TAM i przyszedł tu re-eksportem,
 * bez ani jednej linii zmiany u wołających. O to w tym zdaniu chodziło.
 */
export type StanPozycjiPrzeszlej = StanWykonania;

/**
 * Plakietki pięciu stanów. ⚠️ PLAN-D-D1 — re-eksport, jedno źródło.
 * ⛔ Nie ma tu „Nie wykonano" i nie będzie: to zdanie było oskarżeniem
 * postawionym na podstawie braku danych.
 * ⚠️ PLAN-D-K1 — od 16.08.2026 stanów jest PIĘĆ, nie cztery; piąty to
 * `odwolane` („Odwołane"), czyli pozycja zdjęta z planu.
 */
export const PLAKIETKI_STANU_PRZESZLEGO = PLAKIETKI_WYKONANIA;

export type PozycjaDnia = {
  id: number;
  /**
   * ⭐ PLAN-D-D1 — DATA TEGO WYSTĄPIENIA, `YYYY-MM-DD`. Bez niej ekran nie ma
   * jak zapisać werdyktu o konkretnym wtorku reguły cyklicznej: `id` jest dla
   * wszystkich wtorków ten sam. Para `(id, dzien)` jest kluczem wystąpienia.
   */
  dzien: string;
  tytul: string;
  /** Z `opiszRodzaj` — NIE własne mapowanie. Ekran rysuje obie gałęzie. */
  rodzaj: OpisRodzaju;
  /** Z `opiszZrodlo` — NIE własne mapowanie. */
  zrodlo: OpisZrodla;
  /**
   * `HH:MM` albo `null`. `null` znaczy NIE RYSUJ POLA — nigdy `''`, nigdy `'—'`
   * (WT-12, WG-06; reguła z `lib/godzinaWydarzenia.ts`).
   */
  godzina: string | null;
  kropka: KlasaKropki;
  /** `null`, gdy dzień nie jest przeszły. Wtedy nie ma o czym rozstrzygać. */
  stanPrzeszly: StanPozycjiPrzeszlej | null;
  /** Pozycja rozwinięta z reguły cyklicznej, a nie z własnej daty. */
  zRegulyCyklicznej: boolean;
  /**
   * Czy pozycja liczy się do wagi dnia. Odwołana — nie.
   * ⚠️ PLAN-D-K1 — liczone Z `status === 'cancelled'`, NIE ze `stanPrzeszly`,
   * więc piąta wartość stanu tego pola nie dotyka: pozycja odwołana W PRZYSZŁYM
   * dniu też nie ma ciążyć na wadze, a stanu przeszłego wtedy nie ma (D7).
   */
  liczonaDoWagi: boolean;
  /**
   * ⭐ PLAN-D-D1 — CO ZAWODNIK MOŻE Z TYM WYSTĄPIENIEM ZROBIĆ: oznaczyć jako
   * nieodbyte, cofnąć swój werdykt, albo nic. ⛔ Rozstrzyga to REGUŁA
   * (`akcjaDlaWystapienia`), nie ekran — ekran, który sam liczy, kiedy pokazać
   * przycisk, jest drugą kopią reguły pod inną nazwą.
   */
  akcja: AkcjaWystapienia;
};

export type PasekZajetosci =
  | { stan: 'SZKOLA'; podpis: string; poczatek: string; koniec: string; okna: OknoSzkolne[] }
  | { stan: 'WOLNE'; podpis: string }
  | { stan: 'NIE_WIEM'; podpis: null };

/** Ostrzeżenie o kolizji przy dniu (WT-11). Powstaje TYLKO, gdy są OBIE liczby. */
export type NapiecieDnia = {
  stan: 'CIASNO' | 'KOLIZJA';
  /** Surowa różnica w minutach. Ujemna = wydarzenie zaczyna się przed końcem szkoły. */
  minut: number;
  /** Zdanie dla zawodnika, np. „ciasno — szkoła do 16:30, Trening klubowy o 18:00". */
  tekst: string;
  /** Której pozycji dotyczy — żeby ekran mógł ją podświetlić. */
  pozycjaId: number;
  tytulPozycji: string;
};

/** Trzy stany wiersza dnia. `nie_wiem` ≠ `pusto`. */
export type StanDnia = 'sa_pozycje' | 'pusto' | 'nie_wiem';

export type WierszDnia = {
  /** `YYYY-MM-DD`. */
  data: string;
  /** 1 = poniedziałek … 7 = niedziela (ISO-8601, ta sama numeracja co w bazie). */
  dzienTygodnia: number;
  /** „PON 10" — jak w makiecie. */
  etykieta: string;
  dzisiaj: boolean;
  przeszly: boolean;
  stan: StanDnia;
  pozycje: PozycjaDnia[];
  waga: WagaDnia;
  /** Suma punktów albo `null`, gdy nie było czego sumować. */
  punktyWagi: number | null;
  /** WG-07. `null`, gdy nie da się go zbudować uczciwie. */
  opisWagi: string | null;
  pasekZajetosci: PasekZajetosci;
  napiecie: NapiecieDnia | null;
  /** WT-16. `null`, gdy dzień ma pozycje albo gdy odczyt się nie udał. */
  podpisPustegoDnia: string | null;
};

/** Zdanie nad tygodniem. Obie części osobno — każda może nie powstać. */
export type ZdanieTygodnia = {
  /** WT-08, np. „Trzy treningi, mecz w sobotę, dwa dni bez nic." */
  podsumowanie: string;
  /** WT-09, np. „Najciaśniej we wtorek — zostaje ci tam 90 minut." `null`, gdy brak danych. */
  napiecie: string | null;
};

/** Pozycja, której NIE DA SIĘ położyć w tygodniu. Nie wolno jej zgubić po cichu. */
export type PozycjaNieumieszczona = { id: number; tytul: string; powod: string };

export type Tydzien = {
  poniedzialek: string;
  niedziela: string;
  /** „10–16 SIERPNIA" (WT-05). */
  zakresDat: string;
  /** ⭐ ZAWSZE SIEDEM. Tydzień nie kurczy się do dni z treścią. */
  dni: WierszDnia[];
  /** `null`, gdy nie ma z czego zbudować. NIGDY zdanie ogólne. */
  zdanie: ZdanieTygodnia | null;
  /** Data dnia, w którym jest najciaśniej, albo `null`. */
  dzienNajciasniejszy: string | null;
  /** Co udało się odczytać. Trzy osobne odpowiedzi, bo to trzy osobne zapytania. */
  odczyt: { wydarzenia: boolean; dziennik: boolean; planLekcji: boolean };
  /**
   * Wejście dla `rozpoznajPustke` z `lib/trzyPustki.ts` (WT-31).
   * `null` = nie wiemy, czy znamy · `false` = wiemy, że NIE znamy · `true` = znamy.
   */
  planLekcjiZnany: boolean | null;
  nieumieszczone: PozycjaNieumieszczona[];
};

// ═══════════════════════════════════════════════════════════════════
// 5. DATY — BEZ `new Date(tekst)`, BEZ ZEGARA
// ═══════════════════════════════════════════════════════════════════
// ⚠️ `new Date('2026-08-10')` czyta datę jako UTC i w strefie ujemnej cofa ją
// o dzień. Rozbieramy na części, tak samo jak `isoDzienTygodnia`
// w `lib/planLekcji.ts`.

const WZORZEC_DATY = /^(\d{4})-(\d{2})-(\d{2})$/;

function naDate(data: string): Date | null {
  if (typeof data !== 'string') return null;
  const m = WZORZEC_DATY.exec(data.slice(0, 10));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function naTekst(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Data przesunięta o `ile` dni. `null`, gdy wejście nie jest datą. */
export function dodajDni(data: string, ile: number): string | null {
  const d = naDate(data);
  if (d === null) return null;
  d.setDate(d.getDate() + ile);
  return naTekst(d);
}

/**
 * Poniedziałek tygodnia sąsiedniego (strzałki ‹ ›, WT-04).
 * `null`, gdy wejście nie jest datą — ekran nie ma wtedy dokąd przejść
 * i lepiej, żeby to wiedział, niż żeby wylądował w losowym tygodniu.
 */
export function przesunTydzien(poniedzialek: string, oIleTygodni: number): string | null {
  return dodajDni(poniedzialek, oIleTygodni * 7);
}

/** Siedem dat tygodnia zaczynającego się `poniedzialek`. Pusta lista = zła data. */
export function datyTygodnia(poniedzialek: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = dodajDni(poniedzialek, i);
    if (d === null) return [];
    out.push(d);
  }
  return out;
}

const SKROTY_DNI = ['PON', 'WT', 'ŚR', 'CZW', 'PT', 'SOB', 'ND'] as const;

/** „w poniedziałek", „we wtorek" … — do zdania nad tygodniem. */
const DNI_W_LOKATYWIE = [
  'w poniedziałek', 'we wtorek', 'w środę', 'w czwartek',
  'w piątek', 'w sobotę', 'w niedzielę',
] as const;

/**
 * Zakres dat w nagłówku (WT-05): „10–16 SIERPNIA" albo — gdy tydzień przechodzi
 * przez granicę miesiąca — „31 SIERPNIA–6 WRZEŚNIA".
 *
 * ⚠️ Miesiące z `MONTHS_GENITIVE_PL` (lib/date-utils.ts), a nie z `Intl`:
 * na Hermesie (Android) `toLocaleDateString('pl-PL')` potrafi dać miesiąc po
 * angielsku albo jako liczbę (znalezisko B37).
 */
export function zakresDat(poniedzialek: string, niedziela: string): string {
  const a = naDate(poniedzialek);
  const b = naDate(niedziela);
  if (a === null || b === null) return '';
  const mA = MONTHS_GENITIVE_PL[a.getMonth()].toUpperCase();
  const mB = MONTHS_GENITIVE_PL[b.getMonth()].toUpperCase();
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()}–${b.getDate()} ${mA}`;
  }
  return `${a.getDate()} ${mA}–${b.getDate()} ${mB}`;
}

// ═══════════════════════════════════════════════════════════════════
// 6. CYKLICZNE — ROZWIJANE, ALE NIE ZGADYWANE
// ═══════════════════════════════════════════════════════════════════
// `chk_recurrence_xor_date` wymusza DOKŁADNIE JEDNO z dwóch: albo `scheduled_date`,
// albo `recurrence_rule`. Wydarzenie cykliczne NIE MA WIĘC DATY — a widok tygodnia
// pokazuje dni. Bez rozwinięcia reguły trening w każdy wtorek zniknąłby z tygodnia,
// choć zawodnik go zaplanował. To byłby „cichy brak" w czystej postaci.
//
// ⚠️ CO ROZWIJAMY, A CZEGO NIE:
//   • `weekly:MON,TUE` → pozycja w każdym z wymienionych dni. Kody dni biorą się
//     z `DAYS_OF_WEEK` (lib/date-utils.ts) — JEDNO źródło, żeby nie powstała
//     druga numeracja dni tygodnia obok tamtej.
//   • reguła ANULOWANA nie jest rozwijana w ogóle: anulowana reguła nie obowiązuje
//     w żaden dzień, także w przeszłości.
//   • reguła, której nie umiemy przeczytać, NIE ZNIKA — ląduje w `nieumieszczone`
//     z powodem. Pozycja skasowana po cichu jest gorsza niż pozycja w złym dniu,
//     bo nikt się o niej nie dowie.

const KOD_DNIA_NA_ISO: Record<string, number> = Object.fromEntries(
  DAYS_OF_WEEK.map(([kod], i) => [kod, i + 1]),
);

const WZORZEC_REGULY = /^weekly:(.+)$/;

/** Numery dni tygodnia (ISO), w które obowiązuje reguła. `null` = nie umiem przeczytać. */
export function dniReguly(regula: string | null | undefined): number[] | null {
  if (typeof regula !== 'string') return null;
  const m = WZORZEC_REGULY.exec(regula.trim());
  if (!m) return null;
  const kody = m[1].split(',').map((k) => k.trim()).filter((k) => k !== '');
  if (kody.length === 0) return null;
  const dni: number[] = [];
  for (const kod of kody) {
    const iso = KOD_DNIA_NA_ISO[kod];
    if (iso === undefined) return null;
    if (!dni.includes(iso)) dni.push(iso);
  }
  return dni;
}

// ═══════════════════════════════════════════════════════════════════
// 7. KROPKA — KLASA, NIE NAZWA
// ═══════════════════════════════════════════════════════════════════
// Legenda makiety rozróżnia kropki po RODZAJU I ŹRÓDLE naraz: „Sesja Bloku
// Skupienia (system zaplanował)" kontra „Trening — Ty dodałeś". To są dwie
// kolumny, nie jedna, i dlatego ta funkcja bierze oba opisy.
//
// ⚠️ Rodzaj spoza piątki NIE dostaje kropki „na oko" — dostaje `nieznana`.

export function klasaKropki(rodzaj: OpisRodzaju, _zrodlo: OpisZrodla): KlasaKropki {
  if (!rodzaj.znany) return 'nieznana';
  switch (rodzaj.id) {
    case 'match': return 'mecz';
    case 'micro_session': return 'blok';
    case 'task': return 'zadanie';
    case 'club_training':
    case 'own_training': return 'klub';
  }
}

// ═══════════════════════════════════════════════════════════════════
// 8. CZY ZNAMY PLAN LEKCJI — JEDNA LINIA, KTÓRA ODBLOKOWUJE WT-31
// ═══════════════════════════════════════════════════════════════════
// Do 14.08.2026 `kalendarz.tsx` miał `planLekcjiZnany: null` NA STAŁE, więc
// gałąź „brak konfiguracji" w `lib/trzyPustki.ts` była NIEOSIĄGALNA — brzmienie
// istniało i nikt go nigdy nie zobaczył. Od pasa A2+A3 istnieje funkcja
// `school_week()` i dwie tabele, więc da się to ZMIERZYĆ zamiast zakładać.
//
// Trzy odpowiedzi, nie dwie:
//   `null`  — nie próbowaliśmy albo odczyt padł. Nie wiemy, czy wiemy.
//   `false` — odczytaliśmy i ANI JEDEN dzień nie ma nagłówka planu.
//   `true`  — odczytaliśmy i przynajmniej jeden dzień jest znany.

export function czyPlanLekcjiZnany(plan: PlanTygodnia | null | undefined): boolean | null {
  if (!plan) return null;
  if (!plan.odczytany) return null;
  const dni = Object.values(plan.dni);
  if (dni.length === 0) return false;
  return dni.some((d) => d.stan !== 'NIE_WIEM');
}

// ═══════════════════════════════════════════════════════════════════
// 9. LICZEBNIKI I ODMIANA — ŻEBY ZDANIE BYŁO PO POLSKU
// ═══════════════════════════════════════════════════════════════════

// ⚠️ DWA ZESTAWY LICZEBNIKÓW, BO POLSZCZYZNA MA RODZAJ. „Dwa treningi", ale
// „DWIE sesje". Jeden zestaw dawał „dwa sesje" — czyli produkt mówiący do
// zawodnika łamanym polskim. Złapał to strażnik, nie korekta.
const LICZEBNIKI_MESKIE = [
  'zero', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem',
] as const;
const LICZEBNIKI_ZENSKIE = [
  'zero', 'jedna', 'dwie', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem',
] as const;

function slownie(n: number, rodzaj: 'm' | 'z' = 'm'): string {
  const lista = rodzaj === 'z' ? LICZEBNIKI_ZENSKIE : LICZEBNIKI_MESKIE;
  return n >= 0 && n < lista.length ? lista[n] : String(n);
}

/** Polska odmiana: 1 → poj., 2–4 → mnoga „kilka", 5+ → dopełniacz. */
function forma(n: number, poj: string, kilka: string, wiele: string): string {
  if (n === 1) return poj;
  const dziesiatki = n % 100;
  const jednosci = n % 10;
  if (jednosci >= 2 && jednosci <= 4 && !(dziesiatki >= 12 && dziesiatki <= 14)) return kilka;
  return wiele;
}

function zWielkiej(s: string): string {
  return s.length === 0 ? s : s[0].toLocaleUpperCase('pl-PL') + s.slice(1);
}

// ═══════════════════════════════════════════════════════════════════
// 10. ⭐ BUDOWA TYGODNIA
// ═══════════════════════════════════════════════════════════════════

type Zebrane = { pozycja: PozycjaDnia; rodzajZnany: RodzajWydarzenia | null };

function zbudujPozycje(
  w: WierszWydarzenia,
  opcje: {
    dzien: string;
    przeszly: boolean;
    zRegulyCyklicznej: boolean;
    wpisyDziennika: ReadonlySet<number> | null;
    werdykty: WejscieWerdyktow;
  },
): Zebrane {
  const rodzaj = opiszRodzaj(w.event_type);
  const zrodlo = opiszZrodlo(w.source);
  const anulowane = w.status === 'cancelled';

  // ⭐ PLAN-D-D1 — WSPÓLNA REGUŁA, WOŁANA O WYSTĄPIENIE `(id, dzien)`.
  const weWykonania = {
    idWydarzenia: w.id,
    dzien: opcje.dzien,
    przeszle: opcje.przeszly,
    status: w.status,
    zRegulyCyklicznej: opcje.zRegulyCyklicznej,
    wpisyDziennika: opcje.wpisyDziennika,
    werdykty: opcje.werdykty,
  };
  const stanPrzeszly = rozstrzygnijWykonanie(weWykonania);
  const akcja = akcjaDlaWystapienia(weWykonania);

  return {
    rodzajZnany: rodzaj.znany ? rodzaj.id : null,
    pozycja: {
      id: w.id,
      dzien: opcje.dzien,
      tytul: w.title,
      rodzaj,
      zrodlo,
      godzina: formatujGodzine(w.scheduled_time),
      kropka: klasaKropki(rodzaj, zrodlo),
      stanPrzeszly,
      zRegulyCyklicznej: opcje.zRegulyCyklicznej,
      liczonaDoWagi: !anulowane,
      akcja,
    },
  };
}

function wagaZPunktow(punkty: number): WagaDnia {
  for (const prog of PROGI_WAGI) {
    if (punkty >= prog.odPunktow) return prog.waga;
  }
  return 'pusty';
}

/**
 * WG-07 — krótki opis wagi dnia. `null`, gdy nie da się go zbudować uczciwie.
 *
 * ⚠️ Dzień z rodzajem spoza piątki dostaje `OPIS_WAGI_NIE_WIEM`, a nie opis
 * z pominięciem tej pozycji. Opis, który milczy o części dnia, jest gorszy niż
 * jawne „nie znam wszystkiego" — bo wygląda na pełny.
 */
function opiszWage(rodzaje: RodzajWydarzenia[], sanieznane: boolean): string | null {
  if (sanieznane) return OPIS_WAGI_NIE_WIEM;
  if (rodzaje.length === 0) return null;
  const obecne = KOLEJNOSC_SLOW_WAGI.filter((r) => rodzaje.includes(r));
  if (obecne.length === 1 && obecne[0] === 'match') return OPIS_WAGI_DZIEN_MECZOWY;
  return zWielkiej(obecne.map((r) => SLOWA_WAGI[r]).join(' + '));
}

function pasekDnia(plan: PlanTygodnia | null, data: string): PasekZajetosci {
  const okno = oknoDnia(plan, data);
  if (okno.stan === 'SZKOLA') {
    return {
      stan: 'SZKOLA',
      podpis: `${okno.poczatek}–${okno.koniec}`,
      poczatek: okno.poczatek,
      koniec: okno.koniec,
      okna: okno.okna,
    };
  }
  if (okno.stan === 'WOLNE') return { stan: 'WOLNE', podpis: PASEK_WOLNE };
  return { stan: 'NIE_WIEM', podpis: null };
}

/**
 * WT-11 — ostrzeżenie o kolizji. ⛔ WYMAGA OBU LICZB.
 * Brak którejkolwiek → `null`, czyli BRAK OSTRZEŻENIA. Nie „prawdopodobnie
 * ciasno", nie ostrzeżenie „na wszelki wypadek".
 */
function napiecieDnia(
  plan: PlanTygodnia | null,
  data: string,
  pozycje: PozycjaDnia[],
): NapiecieDnia | null {
  const okno = oknoDnia(plan, data);
  let naj: NapiecieDnia | null = null;
  for (const p of pozycje) {
    if (!p.liczonaDoWagi) continue;
    const wynik = wykryjCiasno(okno, p.godzina, p.tytul);
    if (wynik.stan !== 'CIASNO' && wynik.stan !== 'KOLIZJA') continue;
    if (wynik.minut === null || wynik.powod === null) continue;
    const tekst = wynik.stan === 'CIASNO'
      ? `ciasno — ${wynik.powod}`
      : `nachodzi na szkołę — ${wynik.powod}`;
    const kandydat: NapiecieDnia = {
      stan: wynik.stan,
      minut: wynik.minut,
      tekst,
      pozycjaId: p.id,
      tytulPozycji: p.tytul,
    };
    if (naj === null || kandydat.minut < naj.minut) naj = kandydat;
  }
  return naj;
}

/**
 * ⭐ WT-08 + WT-09 — zdanie nad tygodniem.
 *
 * ⛔ POWSTAJE WYŁĄCZNIE Z POLICZONYCH WIERSZY. Zero policzonych pozycji →
 * `null`. Nie „masz spokojny tydzień", nie „nic tu nie ma" — o pustce mówi
 * `lib/trzyPustki.ts`, i to jest jej jedyne miejsce.
 */
function zbudujZdanie(dni: WierszDnia[], odczytWydarzen: boolean): ZdanieTygodnia | null {
  if (!odczytWydarzen) return null;

  let treningi = 0;
  let sesje = 0;
  let mecze = 0;
  let dzienMeczu: number | null = null;
  let dniBezNic = 0;

  for (const d of dni) {
    if (d.stan === 'pusto') dniBezNic++;
    for (const p of d.pozycje) {
      if (!p.liczonaDoWagi || !p.rodzaj.znany) continue;
      if (p.rodzaj.id === 'club_training' || p.rodzaj.id === 'own_training') treningi++;
      else if (p.rodzaj.id === 'micro_session') sesje++;
      else if (p.rodzaj.id === 'match') { mecze++; dzienMeczu = d.dzienTygodnia; }
    }
  }

  const czlony: string[] = [];
  if (treningi > 0) {
    czlony.push(`${slownie(treningi)} ${forma(treningi, 'trening', 'treningi', 'treningów')}`);
  }
  if (sesje > 0) {
    czlony.push(`${slownie(sesje, 'z')} ${forma(sesje, 'sesja', 'sesje', 'sesji')}`);
  }
  if (mecze === 1 && dzienMeczu !== null) {
    czlony.push(`mecz ${DNI_W_LOKATYWIE[dzienMeczu - 1]}`);
  } else if (mecze > 1) {
    czlony.push(`${slownie(mecze)} ${forma(mecze, 'mecz', 'mecze', 'meczów')}`);
  }

  // ⛔ BRAMKA: bez ani jednej policzonej pozycji zdanie NIE POWSTAJE.
  // Samo „siedem dni bez nic" nie jest podsumowaniem tygodnia — jest pustką,
  // a pustka ma własne brzmienie i własne wyjście.
  if (czlony.length === 0) return null;

  if (dniBezNic > 0) {
    czlony.push(`${slownie(dniBezNic)} ${forma(dniBezNic, 'dzień bez nic', 'dni bez nic', 'dni bez nic')}`);
  }

  const podsumowanie = `${zWielkiej(czlony.join(', '))}.`;

  // ── WT-09: który dzień jest najciaśniejszy ──────────────────────────
  let najciasniejszy: WierszDnia | null = null;
  for (const d of dni) {
    if (d.napiecie === null) continue;
    if (najciasniejszy === null || d.napiecie.minut < najciasniejszy.napiecie!.minut) {
      najciasniejszy = d;
    }
  }

  let napiecie: string | null = null;
  if (najciasniejszy !== null && najciasniejszy.napiecie !== null) {
    const n = najciasniejszy.napiecie;
    const gdzie = DNI_W_LOKATYWIE[najciasniejszy.dzienTygodnia - 1];
    napiecie = n.stan === 'CIASNO'
      // ⚠️ ŚWIADOME ODSTĄPIENIE OD MAKIETY. Makieta pisze przy 90 minutach
      // „zostaje ci tam około godziny". 90 minut to półtorej godziny, więc
      // to zdanie zaokrągla W DÓŁ czas, który zawodnik ma — czyli mówi mu
      // o jego dniu rzecz nieprawdziwą. Podajemy policzoną liczbę.
      ? `Najciaśniej ${gdzie} — zostaje ci tam ${n.minut} ${forma(n.minut, 'minuta', 'minuty', 'minut')}.`
      : `Najciaśniej ${gdzie} — „${n.tytulPozycji}" zaczyna się, zanim skończy się szkoła.`;
  }

  return { podsumowanie, napiecie };
}

/**
 * ⭐ GŁÓWNE WEJŚCIE. Zwraca ZAWSZE siedem wierszy dni — także wtedy, gdy
 * wydarzeń jest zero i gdy odczyt się nie udał. Tydzień, który kurczy się do
 * dni z treścią, przestaje być tygodniem.
 */
export function zbudujTydzien(we: WejscieTygodnia): Tydzien {
  const daty = datyTygodnia(we.poniedzialek);
  const poniedzialek = daty.length === 7 ? daty[0] : we.poniedzialek;
  const niedziela = daty.length === 7 ? daty[6] : we.poniedzialek;

  const odczytWydarzen = we.wydarzenia !== null;
  const odczytDziennika = we.wpisyDziennika !== null;
  const odczytPlanu = we.planLekcji !== null && we.planLekcji.odczytany;

  const nieumieszczone: PozycjaNieumieszczona[] = [];

  // ⭐ PLAN-D-D1 — pominięte pole ≠ nieudany odczyt. Patrz `WejscieTygodnia.werdykty`.
  const werdykty: WejscieWerdyktow =
    we.werdykty === undefined ? WERDYKTY_NIEPODANE : we.werdykty;

  // ── Rozłożenie wydarzeń na dni ────────────────────────────────────
  const wDniu: Record<string, Zebrane[]> = {};
  for (const d of daty) wDniu[d] = [];

  if (we.wydarzenia !== null) {
    for (const w of we.wydarzenia) {
      if (!w || typeof w.id !== 'number') continue;

      if (w.scheduled_date) {
        const dzien = w.scheduled_date.slice(0, 10);
        if (!(dzien in wDniu)) continue; // poza oglądanym tygodniem — to nie jest zgubienie
        const przeszly = dzien < we.dzisiaj;
        wDniu[dzien].push(zbudujPozycje(w, {
          dzien, przeszly, zRegulyCyklicznej: false, wpisyDziennika: we.wpisyDziennika, werdykty,
        }));
        continue;
      }

      if (w.recurrence_rule) {
        if (w.status === 'cancelled') continue; // anulowana reguła nie obowiązuje w żaden dzień
        const dni = dniReguly(w.recurrence_rule);
        if (dni === null) {
          nieumieszczone.push({
            id: w.id, tytul: w.title,
            powod: `nie umiem przeczytać reguły cyklicznej „${w.recurrence_rule}"`,
          });
          continue;
        }
        for (const iso of dni) {
          const dzien = daty[iso - 1];
          if (dzien === undefined) continue;
          const przeszly = dzien < we.dzisiaj;
          wDniu[dzien].push(zbudujPozycje(w, {
            dzien, przeszly, zRegulyCyklicznej: true, wpisyDziennika: we.wpisyDziennika, werdykty,
          }));
        }
        continue;
      }

      // Ani daty, ani reguły — baza tego nie dopuszcza (`chk_recurrence_xor_date`),
      // więc jeżeli to widzimy, coś się zmieniło i ma zostać nazwane.
      nieumieszczone.push({
        id: w.id, tytul: w.title,
        powod: 'wiersz nie ma ani `scheduled_date`, ani `recurrence_rule`',
      });
    }
  }

  // ── Siedem wierszy ────────────────────────────────────────────────
  const dni: WierszDnia[] = daty.map((data, i) => {
    const zebrane = wDniu[data] ?? [];
    const pozycje = zebrane.map((z) => z.pozycja);
    const przeszly = data < we.dzisiaj;

    let punkty = 0;
    const rodzaje: RodzajWydarzenia[] = [];
    let sanieznane = false;
    for (const z of zebrane) {
      if (!z.pozycja.liczonaDoWagi) continue;
      if (z.rodzajZnany === null) { sanieznane = true; continue; }
      punkty += PUNKTY_RODZAJU[z.rodzajZnany];
      if (!rodzaje.includes(z.rodzajZnany)) rodzaje.push(z.rodzajZnany);
    }

    const stan: StanDnia = !odczytWydarzen
      ? 'nie_wiem'
      : pozycje.length > 0 ? 'sa_pozycje' : 'pusto';

    const waga: WagaDnia = !odczytWydarzen
      ? 'nie_wiem'
      : sanieznane ? 'nie_wiem' : wagaZPunktow(punkty);

    return {
      data,
      dzienTygodnia: i + 1,
      etykieta: `${SKROTY_DNI[i]} ${Number(data.slice(8, 10))}`,
      dzisiaj: data === we.dzisiaj,
      przeszly,
      stan,
      pozycje,
      waga,
      punktyWagi: odczytWydarzen ? punkty : null,
      opisWagi: odczytWydarzen ? opiszWage(rodzaje, sanieznane) : null,
      pasekZajetosci: pasekDnia(we.planLekcji, data),
      napiecie: napiecieDnia(we.planLekcji, data, pozycje),
      podpisPustegoDnia: stan === 'pusto' ? PODPIS_DNIA_BEZ_POZYCJI : null,
    };
  });

  const zdanie = zbudujZdanie(dni, odczytWydarzen);
  let dzienNajciasniejszy: string | null = null;
  for (const d of dni) {
    if (d.napiecie === null) continue;
    if (dzienNajciasniejszy === null) { dzienNajciasniejszy = d.data; continue; }
    const obecny = dni.find((x) => x.data === dzienNajciasniejszy);
    if (obecny?.napiecie && d.napiecie.minut < obecny.napiecie.minut) dzienNajciasniejszy = d.data;
  }

  return {
    poniedzialek,
    niedziela,
    zakresDat: zakresDat(poniedzialek, niedziela),
    dni,
    zdanie,
    dzienNajciasniejszy,
    odczyt: { wydarzenia: odczytWydarzen, dziennik: odczytDziennika, planLekcji: odczytPlanu },
    planLekcjiZnany: czyPlanLekcjiZnany(we.planLekcji),
    nieumieszczone,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 11. PASEK ZAJĘTOŚCI — GEOMETRIA TEŻ JEST REGUŁĄ
// ═══════════════════════════════════════════════════════════════════
// ⚠️ TO NIE JEST SIATKA GODZINOWA i nie wolno jej w to zamienić. Siatka
// rysowałaby POZYCJE w miejscach czasu, których nie znamy (`scheduled_date` to
// data bez godziny) — WT-34. Pasek rysuje wyłącznie GODZINY SZKOŁY, czyli
// jedyne dane, które godzinę naprawdę mają (stopka makiety). Pozycje zostają
// listą pod nim.
//
// Okno doby dobrane tak, żeby szkoła zajmowała czytelną część paska. Zmiana =
// zmiana tych dwóch liczb.
export const OKNO_PASKA_ZAJETOSCI = { odMinut: 6 * 60, doMinut: 22 * 60 };

/** Odcinki paska w procentach (0–100). Pusta lista = nie ma czego rysować. */
export function segmentyPaska(pasek: PasekZajetosci): Array<{ lewo: number; szerokosc: number }> {
  if (pasek.stan !== 'SZKOLA') return [];
  const rozpietosc = OKNO_PASKA_ZAJETOSCI.doMinut - OKNO_PASKA_ZAJETOSCI.odMinut;
  if (rozpietosc <= 0) return [];
  const out: Array<{ lewo: number; szerokosc: number }> = [];
  for (const okno of pasek.okna) {
    const od = minutyZGodziny(okno.poczatek);
    const doG = minutyZGodziny(okno.koniec);
    if (od === null || doG === null || doG <= od) continue;
    const a = Math.max(0, Math.min(100, ((od - OKNO_PASKA_ZAJETOSCI.odMinut) / rozpietosc) * 100));
    const b = Math.max(0, Math.min(100, ((doG - OKNO_PASKA_ZAJETOSCI.odMinut) / rozpietosc) * 100));
    if (b <= a) continue;
    out.push({ lewo: a, szerokosc: b - a });
  }
  return out;
}

function minutyZGodziny(g: string): number | null {
  const s = formatujGodzine(g);
  if (s === null) return null;
  return Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
}

/** Zdanie do konsoli — żeby dało się po fakcie odpowiedzieć, czemu tydzień tak wyglądał. */
export function opisTygodniaDoLogu(t: Tydzien): string {
  const pozycji = t.dni.reduce((n, d) => n + d.pozycje.length, 0);
  return `widokTygodnia: ${t.poniedzialek}..${t.niedziela}, pozycji ${pozycji}, `
    + `odczyt(wydarzenia=${t.odczyt.wydarzenia}, dziennik=${t.odczyt.dziennik}, plan=${t.odczyt.planLekcji}), `
    + `planLekcjiZnany=${String(t.planLekcjiZnany)}, zdanie=${t.zdanie ? 'jest' : 'NIE POWSTAŁO'}, `
    + `nieumieszczonych=${t.nieumieszczone.length}, prógCiasno=${PROG_CIASNO_MINUT}min`;
}

/** Ile pozycji ma cały tydzień — używa tego ekran, żeby wybrać pustkę. */
export function liczbaPozycji(t: Tydzien): number {
  return t.dni.reduce((n, d) => n + d.pozycje.length, 0);
}
