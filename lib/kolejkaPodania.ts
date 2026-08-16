// PLAN-D-B1 08.2026 (14.08.2026) — NOWY PLIK. JEDEN RANKER, JEDNO ŹRÓDŁO KOLEJNOŚCI.
//
// ═════════════════════════════════════════════════════════════════════
// ── CO TEN PLIK JEST, A CZYM NIE JEST ────────────────────────────────
//
// JEST: jedną czystą funkcją `ulozKolejke()`, która z wejść produktu układa
// UPORZĄDKOWANĄ LISTĘ RZECZY, każdą z powodem. Trzy widoki („Dziś", „Tydzień",
// „Moje zadania") biorą z niej różną liczbę pozycji i różną głębokość —
// ⛔ ŻADEN Z NICH NIE USTALA KOLEJNOŚCI.
//
// ⛔ NIE RENDERUJE NICZEGO. Ekran „Dziś" to pas B2, widok tygodnia C1,
//    lista zadań C2. Tu nie ma ani jednego JSX-a i ani jednego importu
//    z React Native.
// ⛔ NIE DOTYKA SUPABASE. Zero klienta, zero `fetch`. Wszystko wchodzi
//    argumentem — bo inaczej nie da się tego sprawdzić bez bazy i bez telefonu.
// ⛔ NIE CZYTA ZEGARA. Ani `Date.now()`, ani `new Date()`, ani obiektu `Date`
//    w ogóle. Dzień wchodzi napisem 'YYYY-MM-DD' (reguła E-N2). Arytmetyka dat
//    niżej jest czystą arytmetyką liczb całkowitych.
// ⛔ NIE PISZE TREŚCI WIDOCZNEJ DLA ZAWODNIKA. Teksty pozycji pochodzą z bazy
//    albo z pasa T; brzmienia, które musiały tu powstać (powody milczenia),
//    stoją w jednym miejscu i są oznaczone `BRZMIENIE_DO_PRZEJRZENIA`.
// ⛔ NIE ZAPISUJE NICZEGO DO BAZY. Kubełek i waga są WYNIKIEM, nie danymi
//    (decyzja D5). Kolejność zamrożona w danych unieważnia ten plik.
//
// ── PO CO TO ISTNIEJE ────────────────────────────────────────────────
// Ekran „Dziś" był kolażem siedmiu niezależnych producentów. Pas T zbił GÓRĘ
// ekranu w jedną odpowiedź, ale kolejność wszystkiego pozostałego nadal
// ustalał każdy ekran po swojemu: cele po `is_priority`, rekomendacje po
// `created_at`, kalendarz po dacie. Trzy niezależne porządki na jednym ekranie.
//
//   Dopóki każdy ekran sam decyduje, co pokazać, każda nowa funkcja jest
//   NOWYM NADAWCĄ. Po tym pliku nowa funkcja jest NOWYM WEJŚCIEM DO RANKERA.
//   Liczba elementów na ekranie przestaje rosnąć razem z liczbą funkcji.
//
// ── PIĘĆ REGUŁ, KTÓRYCH TEN PLIK PILNUJE ─────────────────────────────
//  1. ARBITER JEST PIERWSZYM WEJŚCIEM, NIE KONKURENTEM. Ranker nie omija
//     drabiny sześciu szczebli — to ona rozstrzyga, kto stoi na górze.
//     Pozycja, która przegrała, NIE ZNIKA: dostaje `milczy` z POWODEM
//     i WARUNKIEM POWROTU. Milczenie bez nazwanego źródła to defekt,
//     którego nikt nie zobaczy.
//  2. Z0 NA POZIOMIE TYPU. Pozycja bez `skadToWiemy` NIE MOŻE POWSTAĆ —
//     pilnuje tego marka `Slad` (sekcja 1), nie komentarz.
//  3. REGUŁA R5. „Brak pozycji" i „nie udało się odczytać wejścia" to DWA
//     RÓŻNE WYNIKI. Każde wejście ma własne, jawne „nie wiem".
//  4. RĘCZNE PODNIESIENIE DO „TERAZ" NIE KASUJE POWODU SYSTEMOWEGO.
//     Pozycja niesie `kubelek` (po podniesieniu) I `kubelekSystemowy`
//     (co sądzi system) — oba widoczne.
//  5. DETERMINIZM. Te same wejścia → ta sama kolejność. Zero zegara, zero
//     losowości, porównanie jest PORZĄDKIEM CAŁKOWITYM (rozstrzyga `id`),
//     więc nie polega na stabilności `Array.prototype.sort`.
//
// ── CZEGO TEN PLIK ŚWIADOMIE NIE ROBI ────────────────────────────────
// ⚠️ NIE PRODUKUJE WGLĄDÓW Z DZIENNIKA ANI Z MECZU. Sen, energia, RPE, ból
// i kaskada meczowa wchodzą tu jako MODYFIKATORY WAGI i jako przesłanki
// wyciszenia — nie jako nowe karty. Producent wglądów („co zmierzono →
// co to znaczy → jedna rzecz") to pas B3 i wpina się przez `dodatkowi`
// (sekcja 3), czyli JAKO WEJŚCIE DO RANKERA, a nie jako kolejny nadawca.
// To nie jest brak — to jest cała teza tego pasa.
//
// ⚠️ NIE POWTARZA REGUŁ, KTÓRE JUŻ MAJĄ WŁAŚCICIELA. Co ekran w ogóle
// pokazuje, rozstrzyga `coPokazacNaDzis()` z `lib/ograniczenia.ts`; czy trwa
// Osłona — `czyOslonaAktywna()` stamtąd samo. Druga kopia tej samej reguły
// to gwarantowany cichy rozjazd: obie działają, obie mają zielone testy,
// a odpowiadają różnie.
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS B2 16.08.2026 — PIĘĆ RAZY TO SAMO ZDANIE (sekcja 9b)
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — nazwane liczbą, zmierzone na produkcji 16.08.2026
// (zawodnik `8d7e1ebb…`, projekt `kqrbztsvepjtggjmmcdx`):
//
//   `calendar_events` = 12 wierszy · JEDEN tytuł („Blok Skupienia: Bieg
//   ciągły w strefie tlenowej") · JEDEN `focus_block_id` · 12 RÓŻNYCH dat.
//
// Ranker robił z tego PIĘĆ osobnych pozycji (daty ≥ dziś), stojących na
// miejscach 4–8 z wagami 650/650/650/500/500. Skutek zmierzony
// uruchomieniem, nie odczytany z kodu: JEDYNY wgląd mówiący coś o tym
// zawodniku (`brak_roku_urodzenia`) stał na miejscu DZIEWIĄTYM — poza
// prefiksem „Dziś" (4) i poza prefiksem „Tydzień" (8). Był policzony,
// przeszedł bramkę, miał `id` — i nie było widoku, który by go wydał.
//
// To łamie P0 (rzecz ważna nie może wymagać dotknięcia — tu nie wystarczało
// nawet dotknięcie) i N1 (ekran zajmuje się powtórzeniem WŁASNEGO planu
// zamiast tym, co zmierzył u zawodnika).
//
// CO ROBI TERAZ. `ulozKolejke()` — po posortowaniu, nigdy na ekranie —
// scala pozycje o tym samym RODZAJU i tym samym ZDANIU w JEDEN wiersz,
// który NIESIE LICZBĘ scalonych rzeczy. Reguły stoją w sekcji 9b.
// ⛔ Zwijanie NIE JEST filtrowaniem: nic nie znika bez śladu, bo wiersz
// mówi wprost, ile rzeczy w sobie ma (Z0).
// ═════════════════════════════════════════════════════════════════════

import { coPokazacNaDzis, czyOslonaAktywna, obowiazuje } from './ograniczenia';
import type { Obowiazuje, StanOgraniczen, WidokDzis } from './ograniczenia';
import { REJESTRY_Z0 } from './zadania';
import type { OdczytZadan, RejestrZ0, Zadanie } from './zadania';
import type { Glos, StanGlosu } from './glosTygodnia';
import type { JednaOdpowiedz } from './jednaOdpowiedz';
import { formatujGodzine } from './godzinaWydarzenia';

// ─────────────────────────────────────────────────────────────────────
// 0. ARYTMETYKA DNI — bez obiektu `Date`, żeby determinizm był sprawdzalny
// ─────────────────────────────────────────────────────────────────────
// ⚠️ ŚWIADOMIE NIE UŻYWAM `lib/wzrost.ts#dniOdEpoki` ani `lib/sladZachowania.ts
// #przesunDzien`. Obie są poprawne, ale obie budują obiekt `Date` — a strażnik
// tego pliku ma móc powiedzieć „w tym pliku nie ma słowa `Date`" i nie mieć
// przy tym wyjątku, który za pół roku ktoś rozszerzy. Algorytm niżej to
// days_from_civil / civil_from_days (Howard Hinnant): czysta arytmetyka
// całkowita, ta sama odpowiedź na każdej maszynie i w każdej strefie.

/** 'YYYY-MM-DD' → dni od 1970-01-01. `null`, gdy to nie jest ISTNIEJĄCA data. */
export function dzienNaLiczbe(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const rok = Number(m[1]);
  const mies = Number(m[2]);
  const dzien = Number(m[3]);
  if (mies < 1 || mies > 12 || dzien < 1 || dzien > 31) return null;
  const y = rok - (mies <= 2 ? 1 : 0);
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (mies + (mies > 2 ? -3 : 9)) + 2) / 5) + dzien - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  const liczba = era * 146097 + doe - 719468;
  // 31 lutego przewinąłby się cicho — odbijamy go porównaniem w drugą stronę.
  return liczbaNaDzien(liczba) === iso ? liczba : null;
}

/** Dni od 1970-01-01 → 'YYYY-MM-DD'. */
export function liczbaNaDzien(liczba: number): string {
  const z = Math.trunc(liczba) + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const dzien = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const mies = mp + (mp < 10 ? 3 : -9);
  const rok = y + (mies <= 2 ? 1 : 0);
  return `${String(rok).padStart(4, '0')}-${String(mies).padStart(2, '0')}-${String(dzien).padStart(2, '0')}`;
}

/**
 * Ile dni dzieli `od` od `do_`. Dodatnie = `do_` jest w przyszłości.
 * `null`, gdy którakolwiek data jest nieczytelna — ⚠️ NIGDY zero, bo zero
 * znaczy „ten sam dzień" i pomylenie tych dwóch jest dokładnie tym błędem,
 * przed którym broni się reguła R5.
 */
export function odstepDni(od: string, do_: string): number | null {
  const a = dzienNaLiczbe(od);
  const b = dzienNaLiczbe(do_);
  if (a === null || b === null) return null;
  return b - a;
}

// ─────────────────────────────────────────────────────────────────────
// 1. ŚLAD ŹRÓDŁOWY — Z0 NA POZIOMIE TYPU
// ─────────────────────────────────────────────────────────────────────
// ⚠️ TO JEST CAŁA OBRONA PRZED POZYCJĄ BEZ ŹRÓDŁA — i jest to obrona TYPEM,
// nie komentarzem i nie asercją w teście.
//
// `ZNAK_SLADU` jest symbolem, którego ten moduł NIE EKSPORTUJE. Skutek jest
// podwójny i celowo taki sam na obu poziomach:
//   • KOMPILACJA — literał obiektu bez tego pola nie ma typu `Slad`, więc
//     `const p: PozycjaKolejki = { …, skadToWiemy: { skad: 'x' } }` NIE DA SIĘ
//     napisać. `tsc --noEmit` zapala się na tym miejscu, nie na ekranie;
//   • URUCHOMIENIE — selftesty idą przez `tsx`, który typy ODRZUCA. Dlatego
//     bramka `zbudujPozycje()` sprawdza obecność tego samego symbolu jeszcze
//     raz, w czasie działania. Podrobienie śladu poza tym plikiem wymagałoby
//     symbolu, którego nie ma jak zdobyć.
//
// ⚠️ DLACZEGO NIE WYSTARCZYŁO `skadToWiemy: string`. Bo napis da się zbudować
// z niczego — `''`, `'system'`, `'z danych'` — i każdy taki napis wygląda na
// ekranie jak źródło. Puste miejsce jest uczciwe, wypełniacz łamie jedyną
// zasadę twardą.
const ZNAK_SLADU = Symbol('PLAN-D-B1: ślad źródłowy pozycji kolejki');

export type Slad = {
  /** Rejestr Z0, do którego należy TREŚĆ powodu. Nigdy zmieszany. */
  readonly rejestr: RejestrZ0;
  /**
   * Skąd to wiemy — nazwa tabeli w bazie (`player_tasks`, `calendar_events`)
   * albo NAZWANY MECHANIZM (`lib/jednaOdpowiedz.ts`). Nigdy puste.
   */
  readonly skad: string;
  /** Identyfikator wiersza. ⛔ NIGDY NIE POKAZUJEMY GO ZAWODNIKOWI. `null` = mechanizm bez wiersza. */
  readonly idWiersza: string | null;
  /**
   * Maszynowy klucz brzmienia „skąd to wiemy" — po nim ekran wybiera zdanie
   * („Ty to dodałeś", „z Twojego kalendarza"). ⚠️ TO NIE JEST BRZMIENIE.
   * Mapa klucz → zdanie należy do pasów B2 i C2, bo to jest tekst dla zawodnika.
   */
  readonly klucz: string;
  readonly [ZNAK_SLADU]: true;
};

/**
 * JEDYNA droga, którą powstaje `Slad`.
 *
 * Zwraca `null`, gdy dowodu naprawdę nie ma — i wtedy pozycja NIE POWSTANIE.
 * ⛔ Tu nie ma gałęzi „a jak nie ma źródła, to wpisz coś ogólnego". Gdyby była,
 * ktoś by z niej skorzystał, i to jest dokładnie ten sposób, w jaki produkt
 * zaczyna podawać prawdopodobne jako pewne.
 */
export function slad(w: {
  rejestr: RejestrZ0;
  skad: string;
  klucz: string;
  idWiersza?: string | null;
}): Slad | null {
  if (!(REJESTRY_Z0 as readonly string[]).includes(w.rejestr)) return null;
  const skad = (w.skad || '').trim();
  const klucz = (w.klucz || '').trim();
  if (skad.length === 0 || klucz.length === 0) return null;
  return {
    rejestr: w.rejestr,
    skad,
    klucz,
    idWiersza: w.idWiersza ?? null,
    [ZNAK_SLADU]: true,
  };
}

/** Czy to jest ślad wyprodukowany przez `slad()`, a nie obiekt udający. */
export function czyPrawdziwySlad(x: unknown): x is Slad {
  if (x === null || typeof x !== 'object') return false;
  const s = x as Record<string | symbol, unknown>;
  if (s[ZNAK_SLADU] !== true) return false;
  if (typeof s.skad !== 'string' || s.skad.trim().length === 0) return false;
  if (typeof s.klucz !== 'string' || s.klucz.trim().length === 0) return false;
  return (REJESTRY_Z0 as readonly string[]).includes(s.rejestr as string);
}

// ─────────────────────────────────────────────────────────────────────
// 2. KSZTAŁT POZYCJI
// ─────────────────────────────────────────────────────────────────────

/** ⚠️ LICZONY W LOCIE, NIGDY KOLUMNA W BAZIE (decyzja D5). */
export const KUBELKI = ['teraz', 'w_tym_tygodniu', 'kiedys'] as const;
export type Kubelek = (typeof KUBELKI)[number];

/** Który mechanizm wyprodukował pozycję. Nowa funkcja dokłada tu wartość, nie nową kartę. */
export const ZRODLA_POZYCJI = [
  'jedna_odpowiedz',
  'zadanie_zawodnika',
  'zadanie_systemowe',
  'kalendarz',
  'wglad',
] as const;
export type ZrodloPozycji = (typeof ZRODLA_POZYCJI)[number];

/**
 * Czym ta pozycja jest DLA REGUŁ — po tym waży i wycisza ranker, nigdy
 * po polskim zdaniu. ⚠️ To są klucze maszynowe, nie brzmienia.
 */
export const RODZAJE_PRACY = [
  /** Ból, uraz, wizyta u fizjo — rzecz o ciele. */
  'zdrowie',
  /** Propozycja DOŁOŻENIA pracy. Podlega hamulcom O1 (ból, Osłona, przeciążenie). */
  'wiecej_objetosci',
  /** Praca nad aktywnym celem albo Blokiem. Milknie przy kontuzji. */
  'praca_nad_celem',
  /** Uzupełnienie danych, konfiguracja, porządki. */
  'porzadek',
  'inne',
] as const;
export type RodzajPracy = (typeof RODZAJE_PRACY)[number];

/** Dlaczego pozycja milczy — i co musi się stać, żeby wróciła. Nigdy jedno bez drugiego. */
export type Milczenie = {
  /** Zdanie z nazwanym źródłem decyzji. ⛔ Nigdy puste. */
  powod: string;
  /** ⛔ Nigdy puste. Milczenie bez drogi powrotu jest wyrokiem, nie stanem. */
  warunekPowrotu: string;
};

/** Jeden nazwany składnik wagi — żeby na pytanie „czemu to jest wyżej" dało się odpowiedzieć. */
export type SkladnikWagi = { nazwa: string; wartosc: number };

export type PozycjaKolejki = {
  /** Stabilny, deterministyczny klucz. Rozstrzyga remisy w porządku. */
  id: string;
  /** CO. Treść z bazy albo z pasa T — ten plik jej nie wymyśla. */
  co: string;
  /** DLACZEGO, jednym zdaniem. `null` = nie mam uzasadnienia, którego bym nie zmyślił. */
  dlaczego: string | null;
  /** ILE ZAJMIE. `null` = nie wiemy — ⛔ nie „zero". */
  ileZajmieSekund: number | null;
  /** SKĄD TO WIEMY. ⚠️ Pola nie da się pominąć — patrz sekcja 1. */
  skadToWiemy: Slad;
  /** WAGA — liczba, po której idzie kolejność w kubełku. */
  waga: number;
  /** Z czego waga się wzięła. Wejście dla ekranu diagnostycznego i dla strażnika. */
  skladnikiWagi: SkladnikWagi[];
  /** ŹRÓDŁO — który mechanizm ją wyprodukował. */
  zrodlo: ZrodloPozycji;
  rodzajPracy: RodzajPracy;
  /** KUBEŁEK — po ręcznym podniesieniu. Liczony w locie (D5). */
  kubelek: Kubelek;
  /**
   * Kubełek, który wybrałby SAM SYSTEM, gdyby zawodnik niczego nie podnosił.
   * ⚠️ ISTNIEJE PO TO, ŻEBY OBA BYŁY WIDOCZNE. Ręczne podniesienie do „Teraz"
   * NIE KASUJE powodu systemowego: zawodnik ma prawo decydować i ma prawo
   * wiedzieć, co system o tym sądzi (M1, M2).
   */
  kubelekSystemowy: Kubelek;
  /** WT-29 — fakt ręcznego podniesienia przez zawodnika. */
  podniesioneRecznie: boolean;
  /** `null` = pozycja mówi. Inaczej: powód milczenia i warunek powrotu. */
  milczy: Milczenie | null;
  /** 'YYYY-MM-DD' albo `null` = bez terminu. */
  termin: string | null;
  /** Godzina 'HH:MM' albo `null` = zawodnik jej nie podał (D10). */
  godzina: string | null;
  /**
   * ⭐ PAS B2 — ILE POZYCJI NIESIE TEN JEDEN WIERSZ, RAZEM Z NIM SAMYM.
   *
   * `1` = pozycja pojedyncza, nic nie zwinięto. `5` = ranker zastał pięć
   * pozycji o tym samym rodzaju i tym samym zdaniu i wydał jedną.
   *
   * ⛔ POLE JEST OBOWIĄZKOWE I NIE MA WARTOŚCI DOMYŚLNEJ. Zwijanie, które
   * chowa liczbę, jest ukryciem, nie porządkiem (Z0): zawodnik ma przeczytać
   * jedno zdanie PLUS informację, że to samo czeka go jeszcze N razy.
   * Gdyby to pole było opcjonalne, ekran musiałby zgadywać `?? 1` — czyli
   * mówić „jedna rzecz" o pięciu.
   */
  ileRazem: number;
};

/** Kandydat — to, co producent oddaje bramce. ⚠️ `skadToWiemy` może tu być `null`: bramka go wtedy ODRZUCI z powodem. */
export type Kandydat = {
  id: string;
  co: string;
  dlaczego: string | null;
  ileZajmieSekund: number | null;
  skadToWiemy: Slad | null;
  wagaBazowa: number;
  zrodlo: ZrodloPozycji;
  rodzajPracy: RodzajPracy;
  podniesioneRecznie: boolean;
  termin: string | null;
  godzina: string | null;
};

/** Kandydat, który nie przeszedł bramki. ⚠️ NIE ZNIKA — ląduje w `Kolejka.odrzucone`. */
export type Odrzucona = { id: string | null; zrodlo: ZrodloPozycji | null; powod: string };

/** Wejście, którego nie udało się odczytać. R5: to NIE jest to samo, co „nic nie ma". */
export type NieWiem = { wejscie: string; powod: string };

/** Pozycja pominięta świadomie, z nazwanym powodem (np. zadanie odhaczone). */
export type Pominieta = { id: string; powod: string };

export type StanKolejki = 'sa_pozycje' | 'pusto' | 'nie_wiem';

export type Kolejka = {
  /** Uporządkowane — RAZEM z milczącymi. Milczące stoją niżej, nie znikają. */
  pozycje: PozycjaKolejki[];
  stan: StanKolejki;
  /** `true`, gdy cokolwiek wypadło albo czegoś nie odczytano. Lista jest wtedy NIEPEŁNA. */
  niepelna: boolean;
  nieWiem: NieWiem[];
  odrzucone: Odrzucona[];
  pominiete: Pominieta[];
  /**
   * Ścieżka wyjścia: „wszystko inne milczy. Zero przypomnień, zero liczników,
   * zero porównań". Pozycje ZOSTAJĄ w `pozycje` (z powodem milczenia — żeby
   * dało się odpowiedzieć, czego zawodnik nie zobaczył i dlaczego), ale
   * `wezDlaWidoku()` nie wyda ani jednej.
   */
  wyciszonaCalkowicie: boolean;
  /** Zdanie do konsoli — dlaczego kolejka wygląda tak, a nie inaczej. */
  powod: string;
};

// ─────────────────────────────────────────────────────────────────────
// 3. WEJŚCIA — każde z własnym „nie wiem" (reguła R5)
// ─────────────────────────────────────────────────────────────────────
// ⚠️ DEFEKT, KTÓREGO TEN KSZTAŁT MA NIE DAĆ SIĘ NAPISAĆ:
//
//     const { data } = await supabase.from('calendar_events').select(…);
//     const wydarzenia = data ?? [];        // ⛔ TO JEST TEN BŁĄD
//
// `data ?? []` czyni „nie ma tabeli" nieodróżnialnym od „nic nie masz na dziś".
// Dlatego KAŻDE wejście tego rankera ma trzy stany, nie dwa — a `zadania`
// mają cztery, bo `lib/zadania.ts` rozróżnia jeszcze odmowę polityki.

export type Wejscie<T> =
  /** Odczyt się udał i coś jest. */
  | { rodzaj: 'jest'; dane: T }
  /** Odczyt się udał, nie ma nic. To jest PRAWDZIWA pustka. */
  | { rodzaj: 'brak' }
  /** Nie udało się odczytać. ⛔ To NIE jest pustka. */
  | { rodzaj: 'nie_wiem'; powod: string };

/** Wydarzenie kalendarza — dokładnie w kształcie, w jakim wraca z Supabase. */
export type WydarzenieKalendarza = {
  id: number | string;
  title: string;
  event_type: string;
  /** `null` przy wydarzeniu cyklicznym — `chk_recurrence_xor_date` (D10). */
  scheduled_date: string | null;
  /** `null` = zawodnik nie podał godziny. ⛔ To NIE jest północ (D10). */
  scheduled_time: string | null;
  status: string;
  focus_block_id: string | null;
};

/** Ostatnie wpisy Dziennika — wejście WAŻĄCE, nie producent (patrz nagłówek). */
export type WpisDziennikaWejscie = {
  /** 'YYYY-MM-DD' dnia wpisu. */
  dzien: string;
  /** Godziny snu. `null` = zawodnik nie podał. */
  senGodziny: number | null;
  /** Samoocena energii/zmęczenia porannego 1–10. `null` = nie podał. */
  energia: number | null;
  /** Ciężkość wysiłku (RPE) 1–10. `null` = nie podał. */
  rpe: number | null;
};

/** Wpis bólowy — hamulec O1 punkt 2. */
export type WpisBolu = {
  dzien: string;
  intensywnosc: number;
  wykluczaZTreningu: boolean;
};

export type WejscieCelu = {
  /** Aktywny cel (wąskie gardło). `null` = zawodnik go nie ma. */
  segmentCelu: string | null;
  /** Czy pod celem stoi AKTYWNY Blok. */
  maAktywnyBlok: boolean;
};

export type WejscieMeczu = {
  /** 'YYYY-MM-DD' ostatniego meczu. */
  dzien: string;
  /** Czy kaskada meczowa ma dla zawodnika otwarty segment do opisania. */
  kaskadaCzeka: boolean;
};

export type WejsciaKolejki = {
  /** ⚠️ DZIEŃ WCHODZI ARGUMENTEM (E-N2). Ten plik nie czyta zegara. */
  dzis: string;
  /**
   * ARBITER — PIERWSZE WEJŚCIE, nie konkurent. Rozstrzyga, kto stoi na górze.
   * Kształt jeden do jednego z `lib/glosTygodnia.ts#stanGlosu()`.
   */
  glos: StanGlosu;
  /** Koperta ograniczeń, 3 klucze. Rozstrzyga, kto MILCZY. */
  ograniczenia: StanOgraniczen;
  /** Jedna odpowiedź z pasa T. `null` = ekran jej nie policzył. */
  jednaOdpowiedz: JednaOdpowiedz | null;
  /** Zadania zawodnika — `lib/zadania.ts#odczytZadan()`, cztery stany R5. */
  zadania: OdczytZadan;
  kalendarz: Wejscie<WydarzenieKalendarza[]>;
  dziennik: Wejscie<WpisDziennikaWejscie[]>;
  bol: Wejscie<WpisBolu[]>;
  cel: Wejscie<WejscieCelu>;
  mecz: Wejscie<WejscieMeczu>;
  /**
   * ⭐ PUNKT WPIĘCIA DLA PASA B3 I DLA KAŻDEJ NASTĘPNEJ FUNKCJI.
   * Wgląd z algorytmu wchodzi tędy — JAKO WEJŚCIE DO RANKERA, nie jako nowa
   * karta na ekranie. To jest cała teza tego pasa, zapisana jako pole.
   */
  dodatkowi?: Kandydat[];
};

// ─────────────────────────────────────────────────────────────────────
// 4. BRZMIENIA — ⚠️ WSZYSTKIE DO PRZEJRZENIA PRZEZ KUBĘ
// ─────────────────────────────────────────────────────────────────────
// ⚠️ TEN PAS NIE PISZE TREŚCI DLA ZAWODNIKA. Poniższe zdania powstały, bo
// makieta wymaga, żeby pozycja wyciszona była WIDOCZNA Z PODANYM POWODEM —
// czyli powód musi mieć jakieś słowa. Oddaję KSZTAŁT (powód + warunek
// powrotu), nie ostateczne brzmienie.

/** Znacznik dla Kuby i dla strażnika. Nie usuwać do czasu zatwierdzenia brzmień. */
export const BRZMIENIE_DO_PRZEJRZENIA = 'DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-B1, 14.08.2026)';

export const MILCZENIE_SCIEZKA_WYJSCIA: Milczenie = {
  powod: 'Zmieniła się Twoja sytuacja — w tym tygodniu nie przypominamy o niczym.',
  warunekPowrotu: 'Wróci, kiedy wyłączysz ten tryb.',
};

export const MILCZENIE_KONTUZJA: Milczenie = {
  powod: 'Wracasz po urazie — o celach teraz nie rozmawiamy.',
  warunekPowrotu: 'Wróci, kiedy powiesz, że wróciłeś do treningu.',
};

export const MILCZENIE_OSLONA: Milczenie = {
  powod: 'Rośniesz teraz szybko — w takim okresie nie dokładamy objętości.',
  warunekPowrotu: 'Wróci, kiedy kolejny pomiar wzrostu pokaże wolniejsze tempo.',
};

export const MILCZENIE_BOL: Milczenie = {
  powod: 'Zapisałeś ból — dokładanie pracy czeka.',
  warunekPowrotu: 'Wróci, kiedy w Dzienniku przestaniesz go zgłaszać.',
};

// ─────────────────────────────────────────────────────────────────────
// 5. WAGI — jedna tabela, żeby nie było dwóch
// ─────────────────────────────────────────────────────────────────────

export const WAGA_BAZOWA: Record<ZrodloPozycji, number> = {
  /** Pas T już rozstrzygnął, że to JEST jedna rzecz na dziś. Ranker tego nie podważa. */
  jedna_odpowiedz: 1000,
  zadanie_systemowe: 500,
  zadanie_zawodnika: 450,
  kalendarz: 400,
  wglad: 300,
};

export const PREMIE = {
  /** Termin dziś albo zaległy. */
  terminDzisiaj: 300,
  /** Termin w najbliższych 7 dniach. */
  terminWTygodniu: 150,
  /** WT-29 — zawodnik podniósł to sam. */
  podniesioneRecznie: 400,
  /** Ból zgłoszony → rzecz o ciele idzie do góry. */
  bolPodnosiZdrowie: 200,
  /** Głos tygodnia wspiera ten mechanizm (arbiter rozstrzyga, kto stoi na górze). */
  glosTygodniaWspiera: 250,
  /** Pozycja dotyczy aktywnego celu albo Bloku. */
  powiazaneZCelem: 100,
  /** Mecz w ciągu ostatnich 3 dni, kaskada czeka — opis meczu się starzeje. */
  swiezyMecz: 200,
  /** Wysokie obciążenie z Dziennika → propozycja DOŁOŻENIA pracy schodzi niżej. */
  wysokieObciazenie: -200,
} as const;

export const PROG_TERAZ = 700;
export const PROG_W_TYM_TYGODNIU = 400;

/** Poniżej tylu godzin snu (mediana z okna) uznajemy obciążenie za wysokie. */
export const PROG_SNU_GODZINY = 6;
/** Od tego RPE w górę uznajemy obciążenie za wysokie. */
export const PROG_RPE = 8;
/** Ile ostatnich wpisów Dziennika bierzemy pod uwagę. */
export const OKNO_WPISOW = 5;
/** Ile dni mecz jest „świeży". */
export const SWIEZOSC_MECZU_DNI = 3;

// ─────────────────────────────────────────────────────────────────────
// 6. ZASADY — cztery funkcje, jeden punkt wpięcia
// ─────────────────────────────────────────────────────────────────────
// ⚠️ PO CO TE CZTERY FUNKCJE STOJĄ OSOBNO, A NIE W ŚRODKU `ulozKolejke()`.
// Bo strażnik ma umieć JE ZEPSUĆ i policzyć, ile asercji się na tym zapali.
// Test mutacyjny, który nie ma gdzie wstawić mutacji, nie jest testem
// mutacyjnym — a strażnik, który zawsze świeci na zielono, nie jest strażnikiem.
//
// ⛔ PRODUKCJA NIGDY NIE PODAJE DRUGIEGO ARGUMENTU `ulozKolejke()`. Podmiana
// zasad istnieje dla strażnika i dla pasa B3, nie dla ekranu.

/** Kontekst, w którym zasady rozstrzygają. Wszystko policzone raz, na wejściach. */
export type Kontekst = {
  dzis: string;
  widok: WidokDzis;
  wszystkoMilczy: Obowiazuje;
  systemMilczyOCelach: Obowiazuje;
  oslona: Obowiazuje;
  blokNieZwiekszaObjetosci: Obowiazuje;
  bolZgloszony: boolean;
  wysokieObciazenie: boolean;
  swiezyMeczZKaskada: boolean;
  glosWspiera: ZrodloPozycji | null;
  maAktywnyCel: boolean;
};

export type WynikBramki =
  | { ok: true; skadToWiemy: Slad }
  | { ok: false; powod: string };

export type Zasady = {
  /** Z0 — pozycja bez prawdziwego śladu NIE POWSTAJE. */
  bramka: (k: Kandydat) => WynikBramki;
  /** Arbiter i koperta — kto milczy, z jakiego powodu i pod jakim warunkiem wraca. */
  wycisz: (k: Kandydat, ctx: Kontekst) => Milczenie | null;
  /** Waga i jej nazwane składniki. */
  wazenie: (k: Kandydat, ctx: Kontekst) => SkladnikWagi[];
  /** Porządek CAŁKOWITY — nie polega na stabilności sortowania. */
  porownaj: (a: PozycjaKolejki, b: PozycjaKolejki) => number;
  /** Które wejścia są nieodczytane. R5. */
  zbierzNieWiem: (w: WejsciaKolejki) => NieWiem[];
};

function bramka(k: Kandydat): WynikBramki {
  if (!czyPrawdziwySlad(k.skadToWiemy)) {
    return {
      ok: false,
      powod:
        'pozycja bez śladu źródłowego — Z0 nie wpuszcza na ekran zdania, którego nie da się '
        + 'przypisać do rejestru i do rekordu (puste miejsce jest uczciwe, wypełniacz nie)',
    };
  }
  if ((k.co || '').trim().length === 0) {
    return { ok: false, powod: 'pozycja bez treści `co` — nie ma czego pokazać' };
  }
  return { ok: true, skadToWiemy: k.skadToWiemy };
}

function wycisz(k: Kandydat, ctx: Kontekst): Milczenie | null {
  // Priorytet 0 — ŚCIEŻKA WYJŚCIA. Wycisza wszystko, bez wyjątku dla zdrowia:
  // spec 1.2 mówi „wszystko inne milczy", a licznik i przypomnienie o wizycie
  // są w tym stanie tak samo wyrzutem jak rekomendacja treningowa.
  if (ctx.wszystkoMilczy === 'tak') return MILCZENIE_SCIEZKA_WYJSCIA;

  // Priorytet 1 — KONTUZJA. Milkną CELE, nie cały ekran. Rzecz o ciele
  // i porządki zostają: zawodnik z urazem ma prawo zamówić fizjoterapeutę.
  if (
    ctx.systemMilczyOCelach === 'tak'
    && (k.rodzajPracy === 'praca_nad_celem' || k.rodzajPracy === 'wiecej_objetosci')
  ) {
    return MILCZENIE_KONTUZJA;
  }

  // Priorytet 2 — OSŁONA. Milknie WYŁĄCZNIE dokładanie objętości (O1 pkt 3).
  // ⚠️ `czyOslonaAktywna` liczy się z DWÓCH kluczy naraz — bo sam
  // `blokNieZwiekszaObjetosci` znaczy „Osłona ALBO kontuzja" i użycie go tutaj
  // powiedziałoby zawodnikowi z urazem, że rośnie (Z0).
  if (ctx.oslona === 'tak' && k.rodzajPracy === 'wiecej_objetosci') {
    return MILCZENIE_OSLONA;
  }

  // Hamulec O1 punkt 2 — ZGŁOSZONY BÓL. Nie jest szczeblem drabiny; jest
  // regułą obciążeniową i dlatego stoi po Osłonie, a nie zamiast niej.
  if (ctx.bolZgloszony && k.rodzajPracy === 'wiecej_objetosci') {
    return MILCZENIE_BOL;
  }

  return null;
}

function wazenie(k: Kandydat, ctx: Kontekst): SkladnikWagi[] {
  const s: SkladnikWagi[] = [{ nazwa: `baza:${k.zrodlo}`, wartosc: k.wagaBazowa }];

  if (k.termin !== null) {
    const dni = odstepDni(ctx.dzis, k.termin);
    // ⚠️ `null` znaczy „termin nieczytelny" — NIE „termin dzisiaj". Nieczytelna
    // data nie daje premii, bo premia z niczego jest zgadywaniem.
    if (dni !== null) {
      if (dni <= 0) s.push({ nazwa: 'termin:dzis_lub_zaleglosc', wartosc: PREMIE.terminDzisiaj });
      else if (dni <= 7) s.push({ nazwa: 'termin:w_tym_tygodniu', wartosc: PREMIE.terminWTygodniu });
    }
  }

  if (k.podniesioneRecznie) {
    s.push({ nazwa: 'zawodnik:podniesione_recznie', wartosc: PREMIE.podniesioneRecznie });
  }
  if (ctx.bolZgloszony && k.rodzajPracy === 'zdrowie') {
    s.push({ nazwa: 'dziennik:bol_zgloszony', wartosc: PREMIE.bolPodnosiZdrowie });
  }
  if (ctx.wysokieObciazenie && k.rodzajPracy === 'wiecej_objetosci') {
    s.push({ nazwa: 'dziennik:wysokie_obciazenie', wartosc: PREMIE.wysokieObciazenie });
  }
  if (ctx.glosWspiera !== null && ctx.glosWspiera === k.zrodlo) {
    s.push({ nazwa: 'arbiter:glos_tygodnia_wspiera', wartosc: PREMIE.glosTygodniaWspiera });
  }
  if (ctx.maAktywnyCel && k.rodzajPracy === 'praca_nad_celem') {
    s.push({ nazwa: 'cel:powiazane', wartosc: PREMIE.powiazaneZCelem });
  }
  if (ctx.swiezyMeczZKaskada && k.skadToWiemy?.klucz === 'mecz') {
    s.push({ nazwa: 'mecz:swiezy', wartosc: PREMIE.swiezyMecz });
  }
  return s;
}

const RANGA_KUBELKA: Record<Kubelek, number> = { teraz: 0, w_tym_tygodniu: 1, kiedys: 2 };

/**
 * PORZĄDEK CAŁKOWITY. ⚠️ `id` na końcu NIE JEST OZDOBNIKIEM: bez niego dwie
 * pozycje o równej wadze wychodziłyby w kolejności wejścia, a ta zależy od
 * kolejności zapytań do bazy — czyli kolejność na ekranie zmieniałaby się bez
 * zmiany danych. Wtedy selftest determinizmu jest bezwartościowy.
 */
function porownaj(a: PozycjaKolejki, b: PozycjaKolejki): number {
  const rk = RANGA_KUBELKA[a.kubelek] - RANGA_KUBELKA[b.kubelek];
  if (rk !== 0) return rk;
  const mk = (a.milczy ? 1 : 0) - (b.milczy ? 1 : 0);
  if (mk !== 0) return mk;
  if (a.waga !== b.waga) return b.waga - a.waga;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function zbierzNieWiem(w: WejsciaKolejki): NieWiem[] {
  const n: NieWiem[] = [];
  if (w.glos.rodzaj === 'nie_wiem') n.push({ wejscie: 'glos', powod: w.glos.powod });
  if (w.ograniczenia.rodzaj === 'nie_odczytane') {
    n.push({ wejscie: 'ograniczenia', powod: w.ograniczenia.powod });
  }
  if (w.ograniczenia.rodzaj === 'nieznana_wersja') {
    n.push({ wejscie: 'ograniczenia', powod: w.ograniczenia.powod });
  }
  if (w.zadania.rodzaj === 'nie_wiem') n.push({ wejscie: 'zadania', powod: w.zadania.powod });
  if (w.zadania.rodzaj === 'brak_uprawnien') {
    n.push({ wejscie: 'zadania', powod: `baza odmówiła: ${w.zadania.powod}` });
  }
  for (const [nazwa, we] of [
    ['kalendarz', w.kalendarz],
    ['dziennik', w.dziennik],
    ['bol', w.bol],
    ['cel', w.cel],
    ['mecz', w.mecz],
  ] as const) {
    if (we.rodzaj === 'nie_wiem') n.push({ wejscie: nazwa, powod: we.powod });
  }
  return n;
}

export const ZASADY: Zasady = { bramka, wycisz, wazenie, porownaj, zbierzNieWiem };

// ─────────────────────────────────────────────────────────────────────
// 7. KUBEŁEK — LICZONY, NIGDY ODCZYTANY (D5)
// ─────────────────────────────────────────────────────────────────────

export function kubelekDla(params: {
  waga: number;
  termin: string | null;
  dzis: string;
  podniesioneRecznie: boolean;
}): Kubelek {
  if (params.podniesioneRecznie) return 'teraz';
  const dni = params.termin === null ? null : odstepDni(params.dzis, params.termin);
  if (dni !== null && dni <= 0) return 'teraz';
  if (params.waga >= PROG_TERAZ) return 'teraz';
  if (dni !== null && dni <= 7) return 'w_tym_tygodniu';
  if (params.waga >= PROG_W_TYM_TYGODNIU) return 'w_tym_tygodniu';
  return 'kiedys';
}

// ─────────────────────────────────────────────────────────────────────
// 8. PRODUCENCI — każdy wiąże pozycję z KONKRETNYM rekordem
// ─────────────────────────────────────────────────────────────────────
// ⚠️ Producent, który nie ma czego wskazać, oddaje kandydata z `skadToWiemy:
// null` — a bramka go odrzuca z powodem. Nie ma drogi, którą pozycja bez
// źródła wejdzie do kolejki „bo tak wyszło".

/** Rejestr Z0 zadania: powód zmierzony u zawodnika ma swój rejestr; zadanie własne to fakt o nim. */
function rejestrZadania(z: Zadanie): RejestrZ0 {
  if (z.powod?.rejestr) return z.powod.rejestr;
  // Zadanie bez powodu jest dopuszczalne WYŁĄCZNIE dla `zrodlo === 'player'`
  // (`lib/zadania.ts`), a wtedy źródłem jest sam zawodnik.
  return 'fakt_o_tobie';
}

/**
 * Rodzaj pracy zadania. ⚠️ Liczony z MASZYNOWEGO klucza powodu, nigdy
 * z polskiego zdania — zdanie jest brzmieniem i zmieni je Kuba.
 */
function rodzajPracyZadania(z: Zadanie): RodzajPracy {
  const klucz = (z.powod?.klucz || '').toLowerCase();
  if (klucz.includes('bol') || klucz.includes('pain') || klucz.includes('uraz')) return 'zdrowie';
  if (klucz.includes('objetosc') || klucz.includes('volume') || klucz.includes('wiecej')) {
    return 'wiecej_objetosci';
  }
  if (z.zrodlo === 'focus_block' || klucz.includes('cel') || klucz.includes('blok')) {
    return 'praca_nad_celem';
  }
  if (z.zrodlo === 'profile') return 'porzadek';
  return 'inne';
}

function zZadan(w: WejsciaKolejki): { kandydaci: Kandydat[]; pominiete: Pominieta[] } {
  if (w.zadania.rodzaj !== 'sa_zadania') return { kandydaci: [], pominiete: [] };
  const kandydaci: Kandydat[] = [];
  const pominiete: Pominieta[] = [];
  for (const z of w.zadania.zadania) {
    if (z.stan !== 'open') {
      // ⚠️ NIE PO CICHU. Odhaczone i porzucone nie są rzeczami do zrobienia,
      // ale ich zniknięcie ma być POLICZALNE — inaczej za miesiąc nikt nie
      // odpowie na pytanie, gdzie się podziało zadanie zawodnika.
      pominiete.push({ id: z.id, powod: `zadanie w stanie „${z.stan}" — nie jest rzeczą do zrobienia` });
      continue;
    }
    const czesci = [z.powod?.fakt, z.powod?.wyjasnienie].filter(
      (x): x is string => typeof x === 'string' && x.trim().length > 0,
    );
    kandydaci.push({
      id: `zadanie:${z.id}`,
      co: z.tytul,
      // ⚠️ TREŚĆ Z BAZY, ZAMROŻONA W CHWILI POWSTANIA ZADANIA (D8).
      // ⛔ Nie przeliczamy jej przy odczycie: zdanie policzone tydzień później
      // powiedziałoby „od 12 dni" zamiast „od 5 dni" — to jest Z0 wstecz.
      dlaczego: czesci.length > 0 ? czesci.join(' ') : null,
      ileZajmieSekund: z.ileZajmieSekund,
      skadToWiemy: slad({
        rejestr: rejestrZadania(z),
        skad: 'player_tasks',
        idWiersza: z.id,
        // `nieznaneZrodlo` znaczy „baza wie więcej niż ta wersja appki" —
        // wtedy klucz brzmienia jest nieznany i ekran ma NIE rysować wiersza
        // „skąd to wiemy" (`lib/zadania.ts`). Ślad zostaje, brzmienia nie ma.
        klucz: z.zrodlo ?? 'nieznane',
      }),
      wagaBazowa: WAGA_BAZOWA[z.kluczSystemowy ? 'zadanie_systemowe' : 'zadanie_zawodnika'],
      zrodlo: z.kluczSystemowy ? 'zadanie_systemowe' : 'zadanie_zawodnika',
      rodzajPracy: rodzajPracyZadania(z),
      podniesioneRecznie: z.podniesioneO !== null,
      termin: z.termin,
      godzina: null,
    });
  }
  return { kandydaci, pominiete };
}

function zKalendarza(w: WejsciaKolejki): Kandydat[] {
  if (w.kalendarz.rodzaj !== 'jest') return [];
  const k: Kandydat[] = [];
  for (const e of w.kalendarz.dane) {
    if (e.status !== 'scheduled') continue;
    if (e.scheduled_date === null) continue; // wydarzenie cykliczne — nie ma dnia (D10)
    if (e.scheduled_date < w.dzis) continue;
    k.push({
      id: `kalendarz:${String(e.id)}`,
      co: e.title,
      dlaczego: null, // ⛔ Uzasadnienie wydarzenia to brzmienie — należy do C1.
      ileZajmieSekund: null,
      skadToWiemy: slad({
        rejestr: 'fakt_o_tobie',
        skad: 'calendar_events',
        idWiersza: String(e.id),
        klucz: 'calendar',
      }),
      wagaBazowa: WAGA_BAZOWA.kalendarz,
      zrodlo: 'kalendarz',
      rodzajPracy: e.focus_block_id ? 'praca_nad_celem' : 'inne',
      podniesioneRecznie: false,
      termin: e.scheduled_date,
      // ⚠️ `null` = zawodnik nie podał godziny. NIE '' i NIE '—' (D10).
      godzina: formatujGodzine(e.scheduled_time),
    });
  }
  return k;
}

function zJednejOdpowiedzi(w: WejsciaKolejki): Kandydat[] {
  const o = w.jednaOdpowiedz;
  if (!o || !o.pokazac) return [];
  const tekst = (o.coZrobic.tekst || '').trim();
  if (tekst.length === 0) {
    // ⚠️ `tekst === null` przy źródle `rekomendacja` jest POPRAWNE — treść
    // niesie wtedy karta rekomendacji, a nie kolejka. Taka pozycja nie ma
    // czego pokazać JAKO WIERSZ KOLEJKI, więc nie wchodzi.
    return [];
  }
  return [{
    id: `jedna_odpowiedz:${o.coZrobic.zrodlo}`,
    co: tekst,
    dlaczego: o.dlaczego,
    ileZajmieSekund: null,
    skadToWiemy: slad({
      rejestr: 'propozycja',
      skad: 'lib/jednaOdpowiedz.ts',
      idWiersza: null,
      klucz: o.coZrobic.zrodlo,
    }),
    wagaBazowa: WAGA_BAZOWA.jedna_odpowiedz,
    zrodlo: 'jedna_odpowiedz',
    rodzajPracy: o.coZrobic.zrodlo === 'brak' ? 'inne' : 'praca_nad_celem',
    podniesioneRecznie: false,
    termin: w.dzis,
    godzina: null,
  }];
}

// ─────────────────────────────────────────────────────────────────────
// 9. KONTEKST — wejścia policzone raz
// ─────────────────────────────────────────────────────────────────────

/**
 * Który mechanizm głos tygodnia stawia na górze.
 *
 * ⚠️ TO NIE JEST DRABINA. Drabina sześciu szczebli mieszka w backendzie
 * (`gamechange-app/lib/arbiter-glosu.js`) i już rozstrzygnęła, kto ma głos.
 * Ta funkcja tylko TŁUMACZY jej werdykt na wagę — dwie kopie drabiny to
 * gwarantowany cichy rozjazd (`lib/arbiterGlosu.ts`).
 */
export function glosWspiera(glos: StanGlosu): ZrodloPozycji | null {
  if (glos.rodzaj !== 'glos') return null;
  if (!glos.mowi) return null; // `spoke_at = null` — arbiter policzył i NIE mówi
  const mapa: Partial<Record<Glos, ZrodloPozycji>> = {
    block: 'jedna_odpowiedz',
    compass: 'jedna_odpowiedz',
  };
  return mapa[glos.voice] ?? null;
}

function policzKontekst(w: WejsciaKolejki): Kontekst {
  const bolZgloszony = w.bol.rodzaj === 'jest'
    && w.bol.dane.some((b) => b.wykluczaZTreningu || b.intensywnosc > 0);

  let wysokieObciazenie = false;
  if (w.dziennik.rodzaj === 'jest') {
    const okno = w.dziennik.dane
      .slice()
      .sort((a, b) => (a.dzien < b.dzien ? 1 : a.dzien > b.dzien ? -1 : 0))
      .slice(0, OKNO_WPISOW);
    const senNiski = okno.some((x) => x.senGodziny !== null && x.senGodziny < PROG_SNU_GODZINY);
    const rpeWysokie = okno.some((x) => x.rpe !== null && x.rpe >= PROG_RPE);
    wysokieObciazenie = senNiski || rpeWysokie;
  }

  const swiezyMeczZKaskada = w.mecz.rodzaj === 'jest'
    && w.mecz.dane.kaskadaCzeka
    && (() => {
      const d = odstepDni(w.mecz.dane.dzien, w.dzis);
      return d !== null && d >= 0 && d <= SWIEZOSC_MECZU_DNI;
    })();

  return {
    dzis: w.dzis,
    // ⚠️ JEDYNY WŁAŚCICIEL REGUŁY „co ekran w ogóle pokazuje". Nie kopiuję jej.
    widok: coPokazacNaDzis(w.ograniczenia),
    wszystkoMilczy: obowiazuje(w.ograniczenia, 'wszystkoMilczy'),
    systemMilczyOCelach: obowiazuje(w.ograniczenia, 'systemMilczyOCelach'),
    oslona: czyOslonaAktywna(w.ograniczenia),
    blokNieZwiekszaObjetosci: obowiazuje(w.ograniczenia, 'blokNieZwiekszaObjetosci'),
    bolZgloszony,
    wysokieObciazenie,
    swiezyMeczZKaskada,
    glosWspiera: glosWspiera(w.glos),
    maAktywnyCel: w.cel.rodzaj === 'jest' && w.cel.dane.segmentCelu !== null,
  };
}

// ─────────────────────────────────────────────────────────────────────
// 9b. ZWIJANIE POWTÓRZEŃ (PAS B2, 16.08.2026)
// ─────────────────────────────────────────────────────────────────────
// ⛔ TO ROBI RANKER, NIE EKRAN — i to jest cała decyzja D1 tego pasa.
// Ekran, który sam scala pozycje, jest DRUGIM PRODUCENTEM tego, co zawodnik
// widzi. Rozjechałby się z pierwszym przy pierwszej zmianie i oba byłyby
// przy tym zielone. Kolejność ma jedno źródło (WG-22) — liczba wierszy też.

/**
 * KLUCZ ZWIJANIA — „to samo" znaczy: ten sam RODZAJ i to samo ZDANIE,
 * KTÓRE CZYTA ZAWODNIK (decyzja D2).
 *
 * ⛔ NIE `id` i NIE `focus_block_id`. Zawodnik nie widzi ani jednego, ani
 * drugiego; dwanaście wierszy `calendar_events` o jednym tytule ma dwanaście
 * różnych `id` i JEDEN `focus_block_id`, więc oba te klucze odpowiadają na
 * inne pytanie niż „czy zawodnik czyta pięć razy to samo".
 *
 * ⛔ TERMINU I GODZINY W KLUCZU NIE MA — CELOWO. To jest dokładnie ta rzecz,
 * która się w powtórzeniu RÓŻNI (12 dat) i którą zwinięty wiersz niesie
 * osobno (D5). Wpisanie terminu do klucza znaczyłoby „nie zwijaj nigdy".
 *
 * ⚠️ STAN POZYCJI WCHODZI DO KLUCZA (decyzja D3). Pozycja MILCZĄCA i pozycja
 * mówiąca to dwa różne fakty, nawet przy identycznym zdaniu: karta rysuje
 * przy milczącej powód i warunek powrotu, a scalenie jej z mówiącą schowałoby
 * jedno i drugie. Tak samo `podniesioneRecznie`: decyzja zawodnika ma zostać
 * widoczna (M1, M2), a nie wtopić się w wiersz, którego sam nie podnosił.
 *
 * ⚠️ ZMIERZONE 16.08.2026 — CZEGO W TYM KLUCZU NIE MA I DLACZEGO.
 * `status` wydarzenia (`scheduled` / `cancelled` / `completed`) NIE DOCHODZI
 * do rankera: `zKalendarza()` przepuszcza wyłącznie `status === 'scheduled'`,
 * więc pozycja odwołana nigdy nie powstaje i nie ma jak wpaść do grupy.
 * PIĄTY stan `odwolane` z pasa K1 (`lib/wykonanieSesji.ts`) żyje po stronie
 * LICZNIKA PRACY, a nie kolejki — `WejsciaKolejki` nie ma pola, którym by tu
 * wszedł. Dzień, w którym stan wykonania zacznie docierać do rankera, jest
 * dniem, w którym ta funkcja MUSI go dopisać do klucza; do tego czasu rolę
 * „stanu" pełnią tu `milczy` i `podniesioneRecznie`.
 */
export function kluczZwijania(p: PozycjaKolejki): string {
  const stan = `${p.milczy === null ? '' : p.milczy.powod}|${p.podniesioneRecznie ? 'R' : '-'}`;
  // ⚠️ ROZDZIELACZ `\x1f` (ASCII Unit Separator), nie ':' i nie spacja — tytuł
  // wydarzenia MOŻE zawierać jedno i drugie („Blok Skupienia: Bieg ciągły…"),
  // a rozdzielacz, który da się wpisać w treść, sklei dwie RÓŻNE pozycje w jedną.
  return [p.zrodlo, p.rodzajPracy, p.co.trim(), p.dlaczego ?? '', stan].join('\x1f');
}

/**
 * ⭐ ZWIJANIE. Wejście MUSI być już posortowane `porownaj` — ta funkcja
 * NIE SORTUJE i nie ma prawa sortować: kolejność ustala jedno miejsce.
 *
 * CO ODDAJE. Tę samą listę, w tej samej kolejności, z grupami powtórzeń
 * zastąpionymi JEDNYM wierszem, który:
 *   • stoi TAM, GDZIE STAŁA NAJWYŻSZA pozycja grupy (nie wyżej, nie niżej);
 *   • jest PRAWDZIWĄ, NIEZMIENIONĄ pozycją z tej grupy — z własnym `id`,
 *     własnym śladem i własnym terminem. ⛔ Nie jest zlepkiem: wiersz, którego
 *     `skadToWiemy` wskazuje inny rekord niż jego termin, jest zapisem
 *     nieprawdy (to jest dokładnie defekt T1-2, który ten pas prostuje obok);
 *   • niesie `ileRazem` = liczebność grupy (D4).
 *
 * KTÓRA POZYCJA ZOSTAJE GŁOWĄ — i dlaczego to załatwia D5 i D6 naraz:
 *   1. NAJWYŻSZA WAGA w grupie. To jest D6 wprost: waga zwiniętego wiersza
 *      RÓWNA SIĘ wadze najwyżej stojącej z grupy. ⛔ NIE SUMA. Suma
 *      podniosłaby powtórzenie PONAD rzeczy niepowtórzone — produkt
 *      nagradzałby sam siebie za to, że coś powiedział pięć razy, czyli
 *      robiłby dokładnie odwrotność tego, po co ten pas powstał (N1).
 *   2. Przy równej wadze — NAJBLIŻSZY TERMIN (D5). ⚠️ TO NIE JEST OZDOBNIK.
 *      Zmierzone 16.08.2026: trzy pozycje grupy miały wagę 650 i terminy
 *      20, 22 i 18 sierpnia, a remis w `porownaj` rozstrzyga `id` PORÓWNANIEM
 *      NAPISÓW — więc najwyżej stała pozycja z 20 sierpnia. Wiersz mówiący
 *      „20 sierpnia" u zawodnika, który ma to samo 18 sierpnia, jest zdaniem
 *      nieprawdziwym o jego planie. Bez tego kroku D5 i D6 stoją w sprzeczności.
 *      `termin === null` jest NAJDALEJ, nie najbliżej: „bez terminu" to nie
 *      jest „dzisiaj".
 *   3. Przy równej wadze i równym terminie — kolejność z `porownaj`.
 *
 * ⚠️ Krok 2 nie może złamać kroku 1: premia terminowa jest MONOTONICZNA
 * (`terminDzisiaj` 300 > `terminWTygodniu` 150 > 0), a wszystkie pozostałe
 * składniki wagi zależą od pól, które SĄ w kluczu grupy. Bliższy termin
 * nigdy nie ma niższej wagi w obrębie grupy — i asercja `zwiniętego` w
 * strażniku sprawdza to na wyniku, nie na tym zdaniu.
 */
export function zwinPowtorzenia(pozycje: PozycjaKolejki[]): PozycjaKolejki[] {
  /** Data jako liczba porównywalna; `null` (bez terminu) = najdalej, jaka jest. */
  const bliskosc = (p: PozycjaKolejki): number => {
    if (p.termin === null) return Number.POSITIVE_INFINITY;
    const d = dzienNaLiczbe(p.termin);
    // ⚠️ Data NIECZYTELNA to nie jest „bez terminu" — ale też nie jest
    // dowodem bliskości. Ląduje tuż przed brakiem terminu, nigdy przed datą.
    return d === null ? Number.MAX_SAFE_INTEGER : d;
  };

  const kolejnoscGrup: string[] = [];
  const grupy = new Map<string, PozycjaKolejki[]>();
  for (const p of pozycje) {
    const k = kluczZwijania(p);
    const g = grupy.get(k);
    if (g === undefined) { grupy.set(k, [p]); kolejnoscGrup.push(k); } else { g.push(p); }
  }

  const wynik: PozycjaKolejki[] = [];
  for (const k of kolejnoscGrup) {
    const grupa = grupy.get(k) as PozycjaKolejki[];
    if (grupa.length === 1) {
      // ⛔ POZYCJA NIEPOWTÓRZONA WYCHODZI CO DO ZNAKU TAKA, JAKA WESZŁA.
      // Zwijanie nie ma prawa ruszyć niczego, co nie było powtórzone.
      wynik.push(grupa[0]);
      continue;
    }
    let glowa = grupa[0];
    for (const p of grupa) {
      if (p.waga > glowa.waga) { glowa = p; continue; }
      if (p.waga === glowa.waga && bliskosc(p) < bliskosc(glowa)) glowa = p;
    }
    wynik.push({ ...glowa, ileRazem: grupa.length });
  }
  return wynik;
}

// ─────────────────────────────────────────────────────────────────────
// 10. JEDNA FUNKCJA WEJŚCIOWA (B1-3)
// ─────────────────────────────────────────────────────────────────────

/**
 * Te same wejścia → ta sama kolejka → trzy widoki.
 *
 * ⚠️ TO JEST JEDYNE MIEJSCE W PRODUKCIE, KTÓRE USTALA KOLEJNOŚĆ. Ekran wybiera
 * wyłącznie, ile pozycji bierze i jak głęboko — `wezDlaWidoku()` niżej.
 *
 * @param zasady ⛔ WYŁĄCZNIE dla strażnika mutacyjnego i dla pasa B3.
 *               Produkcja woła tę funkcję z JEDNYM argumentem.
 */
export function ulozKolejke(w: WejsciaKolejki, zasady: Zasady = ZASADY): Kolejka {
  const ctx = policzKontekst(w);
  const zZad = zZadan(w);
  const kandydaci: Kandydat[] = [
    ...zJednejOdpowiedzi(w),
    ...zZad.kandydaci,
    ...zKalendarza(w),
    ...(w.dodatkowi ?? []),
  ];

  const pozycje: PozycjaKolejki[] = [];
  const odrzucone: Odrzucona[] = [];

  for (const k of kandydaci) {
    const b = zasady.bramka(k);
    if (!b.ok) {
      odrzucone.push({ id: k.id ?? null, zrodlo: k.zrodlo ?? null, powod: b.powod });
      continue;
    }
    const skladniki = zasady.wazenie(k, ctx);
    const waga = skladniki.reduce((s, x) => s + x.wartosc, 0);
    // ⚠️ REGUŁA 4. Kubełek systemowy liczymy BEZ ręcznego podniesienia i BEZ
    // jego premii — po to, żeby zawodnik widział jedno i drugie naraz.
    const wagaSystemowa = skladniki
      .filter((x) => x.nazwa !== 'zawodnik:podniesione_recznie')
      .reduce((s, x) => s + x.wartosc, 0);

    pozycje.push({
      id: k.id,
      co: k.co,
      dlaczego: k.dlaczego,
      ileZajmieSekund: k.ileZajmieSekund,
      skadToWiemy: b.skadToWiemy,
      waga,
      skladnikiWagi: skladniki,
      zrodlo: k.zrodlo,
      rodzajPracy: k.rodzajPracy,
      kubelek: kubelekDla({
        waga,
        termin: k.termin,
        dzis: w.dzis,
        podniesioneRecznie: k.podniesioneRecznie,
      }),
      kubelekSystemowy: kubelekDla({
        waga: wagaSystemowa,
        termin: k.termin,
        dzis: w.dzis,
        podniesioneRecznie: false,
      }),
      podniesioneRecznie: k.podniesioneRecznie,
      milczy: zasady.wycisz(k, ctx),
      termin: k.termin,
      godzina: k.godzina,
      // ⭐ PAS B2 — kandydat jest ZAWSZE jedną rzeczą. Liczba rośnie dopiero
      // przy zwijaniu, niżej. ⛔ Nie `undefined`: pole bez wartości kazałoby
      // ekranowi zgadywać.
      ileRazem: 1,
    });
  }

  pozycje.sort(zasady.porownaj);

  // ⭐ PAS B2 — ZWIJANIE POWTÓRZEŃ. ⛔ PO sortowaniu i PRZED wydaniem kolejki:
  // grupa musi wiedzieć, która jej pozycja stała najwyżej, a widoki (`wezDlaWidoku`,
  // `wezKubelek`) mają dostać JUŻ ZWINIĘTĄ listę — inaczej każdy z nich zwijałby
  // po swojemu i liczba wierszy przestałaby mieć jedno źródło.
  const zwiniete = zwinPowtorzenia(pozycje);

  const nieWiem = zasady.zbierzNieWiem(w);
  const wyciszonaCalkowicie = ctx.wszystkoMilczy === 'tak';
  const stan: StanKolejki = zwiniete.length > 0
    ? 'sa_pozycje'
    : (nieWiem.length > 0 ? 'nie_wiem' : 'pusto');

  return {
    pozycje: zwiniete,
    stan,
    niepelna: nieWiem.length > 0 || odrzucone.length > 0,
    nieWiem,
    odrzucone,
    pominiete: zZad.pominiete,
    wyciszonaCalkowicie,
    powod: opisKolejkiDoLogu({
      stan,
      liczba: zwiniete.length,
      milczacych: zwiniete.filter((p) => p.milczy !== null).length,
      nieWiem,
      odrzucone,
      wyciszonaCalkowicie,
      widokPowod: ctx.widok.powod,
      // ⭐ PAS B2 — ile pozycji ZNIKNĘŁO z listy przez zwinięcie. ⛔ Zwinięcie,
      // którego nie widać w logu, jest zwinięciem nie do zdiagnozowania:
      // „kolejka ma 5 pozycji" i „kolejka ma 9 pozycji, z czego 5 to jedno
      // powtórzenie" to dwie różne odpowiedzi na pytanie, czemu ekran wygląda tak.
      przedZwinieciem: pozycje.length,
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────
// 11. TRZY WIDOKI — biorą, NIGDY nie sortują (B1-3)
// ─────────────────────────────────────────────────────────────────────

export const WIDOKI = ['dzis', 'tydzien', 'zadania'] as const;
export type Widok = (typeof WIDOKI)[number];

/**
 * Ile pozycji bierze który widok. ⚠️ TO JEST JEDYNA RZECZ, KTÓRĄ WIDOK
 * WYBIERA. `null` = wszystkie.
 *
 * „Dziś": jedna odpowiedź + dwie–trzy kolejne (zasada podania, §3).
 * „Tydzień": tyle, ile mieści się nad siatką dni.
 * „Moje zadania": wszystko — to jest widok dla dociekliwych (głębokość 2).
 */
export const DOMYSLNA_LICZBA: Record<Widok, number | null> = {
  dzis: 4,
  tydzien: 8,
  zadania: null,
};

/**
 * ⛔ TA FUNKCJA NIE SORTUJE I NIE FILTRUJE PO REGULE. Bierze PREFIKS kolejki.
 * Gdyby wybierała „co pasuje do tego ekranu", kolejność wróciłaby do ekranów
 * — czyli dokładnie tam, skąd ten pas ją zabrał.
 *
 * ⚠️ JEDYNY WYJĄTEK: przy `wyciszonaCalkowicie` nie wydaje NICZEGO. Ścieżka
 * wyjścia znaczy „zero przypomnień, zero liczników, zero porównań", a lista
 * czterech wyszarzonych przypomnień jest nadal listą przypomnień. Pozycje
 * ZOSTAJĄ w `kolejka.pozycje` z powodem milczenia, więc na pytanie „czego
 * zawodnik nie zobaczył i dlaczego" nadal da się odpowiedzieć.
 */
export function wezDlaWidoku(k: Kolejka, widok: Widok, ile?: number): PozycjaKolejki[] {
  if (k.wyciszonaCalkowicie) return [];
  const limit = ile ?? DOMYSLNA_LICZBA[widok];
  return limit === null ? k.pozycje.slice() : k.pozycje.slice(0, Math.max(0, limit));
}

/** Pozycje jednego kubełka, w kolejności kolejki. Dla listy „Moje zadania" (C2). */
export function wezKubelek(k: Kolejka, kubelek: Kubelek): PozycjaKolejki[] {
  if (k.wyciszonaCalkowicie) return [];
  return k.pozycje.filter((p) => p.kubelek === kubelek);
}

// ─────────────────────────────────────────────────────────────────────
// 12. LOG — żeby dało się odpowiedzieć ZDANIEM, a nie zgadywaniem
// ─────────────────────────────────────────────────────────────────────

export function opisKolejkiDoLogu(p: {
  stan: StanKolejki;
  liczba: number;
  milczacych: number;
  nieWiem: NieWiem[];
  odrzucone: Odrzucona[];
  wyciszonaCalkowicie: boolean;
  widokPowod: string;
  /** ⭐ PAS B2 — ile pozycji było PRZED zwinięciem powtórzeń. */
  przedZwinieciem?: number;
}): string {
  const czesci = [
    `kolejka: ${p.stan} (${p.liczba} pozycji, w tym ${p.milczacych} milczących)`,
    p.widokPowod,
  ];
  if (p.przedZwinieciem !== undefined && p.przedZwinieciem > p.liczba) {
    czesci.push(`ZWINIĘTE POWTÓRZENIA: ${p.przedZwinieciem} → ${p.liczba} pozycji`);
  }
  if (p.wyciszonaCalkowicie) {
    czesci.push('WYCISZONA CAŁKOWICIE — żaden widok nie wyda ani jednej pozycji');
  }
  if (p.nieWiem.length > 0) {
    czesci.push(`NIE ODCZYTANE: ${p.nieWiem.map((n) => `${n.wejscie} (${n.powod})`).join('; ')}`);
  }
  if (p.odrzucone.length > 0) {
    czesci.push(`ODRZUCONE: ${p.odrzucone.map((o) => `${o.id ?? '?'} — ${o.powod}`).join('; ')}`);
  }
  return czesci.join(' · ');
}
