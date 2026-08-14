// PLAN-D-A4 08.2026 (14.08.2026) — NOWY PLIK. TABELA ZADAŃ: TYPY I CZYSTA LOGIKA.
//
// ═════════════════════════════════════════════════════════════════════
// ── CO TEN PLIK JEST, A CZYM NIE JEST ────────────────────────────────
//
// JEST: kształtem pozycji z makiety `claude/MAKIETA_WIDOK_TYGODNIA.html`
// (kolumna 2, „Ja → Moje zadania") i jedyną funkcją, która zamienia surowy
// wiersz z bazy na tę pozycję — albo na jawne „nie wiem".
//
// ⛔ NIE JEST EKRANEM. Listy „Moje zadania" nie ma i po tej rundzie nadal
//    nie będzie — buduje ją pas C2.
// ⛔ NIE JEST RANKEREM. Kolejność i kubełki `Teraz / W tym tygodniu / Kiedyś`
//    liczy `lib/kolejkaPodania.ts` (pas B1). Tego pliku tu nie ma i ta sesja
//    go nie zakłada.
// ⛔ NIE DOTYKA SUPABASE. Zero importu klienta, zero `fetch`, zero Reacta.
//    Odczyt pisze C2 i podaje tutaj to, co dostał.
// ⛔ NIE CZYTA ZEGARA. Ani `Date.now()`, ani `new Date()`. Wszystkie momenty
//    zostają napisami ISO dokładnie takimi, jakie przyszły z bazy; kto
//    potrzebuje „dziś", dostaje je parametrem. Pilnuje tego strażnik.
//
// ── DLACZEGO TO NIE JEST ZWYKŁA LISTA ZADAŃ ──────────────────────────
// Makieta nie pokazuje listy zadań. Pokazuje LISTĘ ZADAŃ Z POWODEM:
//
//     ☐ Zamów wizytę u fizjo
//       Kolano boli od 5 dni — zapisałeś to trzy razy w tym tygodniu.
//       Ty to dodałeś · środa
//
// Cztery rzeczy naraz: CO · DLACZEGO · ILE ZAJMIE · SKĄD TO WIEMY.
// Każda z nich ma tu swoje pole i żadnej nie da się dopisać jako domysłu.
//
// ── REGUŁA R5, PO RAZ CZWARTY W TYM PRODUKCIE ────────────────────────
// `lib/componentHints.ts` („nie ma tabeli" ≠ „pusto"), `lib/ograniczenia.ts`
// („nie obowiązuje" ≠ „nie wiem"), `lib/trzyPustki.ts` (trzy powody pustki) —
// i teraz tutaj. ⚠️ Defekt, którego ten plik ma NIE DAĆ SIĘ NAPISAĆ:
//
//     const { data } = await supabase.from('player_tasks').select(...);
//     const zadania = data ?? [];          // ⛔ TO JEST TEN BŁĄD
//
// Klient Supabase przy odmowie polityki, braku tabeli i przy zerwanej sieci
// zwraca `{ data: null, error }` — nie rzuca wyjątku. `data ?? []` czyni
// „nie ma tabeli" nieodróżnialnym od „nie masz nic do zrobienia", a zawodnik
// dostaje pogodne „Nie masz nic do zrobienia" w chwili, w której produkt się
// zepsuł. Dlatego `odczytZadan()` NIE PRZYJMUJE TABLICY. Przyjmuje całą
// odpowiedź, razem z błędem — żeby nie dało się jej zawołać, wyrzuciwszy
// wcześniej informację o awarii.
// ═════════════════════════════════════════════════════════════════════

import { toJestBrakDostepu } from './dostepKonta';

// ─────────────────────────────────────────────────────────────────────
// 1. NAZWY W BAZIE — jedno źródło, żeby literówka nie żyła w trzech plikach
// ─────────────────────────────────────────────────────────────────────

export const TABELA_ZADAN = 'player_tasks';

/**
 * Kolumny, które wolno odczytać. Świadomie NIE MA TU `user_id`:
 * polityka RLS i tak zwraca wyłącznie własne wiersze, a wyciągnięcie
 * identyfikatora konta na ekran nie ma żadnego odbiorcy.
 */
export const KOLUMNY_ZADANIA = [
  'id',
  'title',
  'reason_fact',
  'reason_text',
  'reason_register',
  'reason_key',
  'origin',
  'source_table',
  'source_row_id',
  'effort_seconds',
  'due_on',
  'state',
  'state_changed_at',
  'raised_at',
  'system_key',
  'created_at',
] as const;

/** Gotowy argument do `.select(...)` — żeby C2 nie przepisywał listy ręcznie. */
export const SELECT_ZADANIA = KOLUMNY_ZADANIA.join(', ');

/**
 * ⚠️ WG-18 — JEDYNE DOZWOLONE ZACHOWANIE PRODUCENTA PRZY POWTÓRCE.
 * `do nothing`, nigdy `do update`. Dwa powody, oba zmierzalne:
 *   1. `do update` odświeżyłby zamrożony powód — „od 5 dni" zmieniłoby się
 *      w „od 12 dni" i zadanie zaczęłoby kłamać o tym, czemu powstało (Z0);
 *   2. `do update` wskrzesiłby zadanie, które zawodnik właśnie PORZUCIŁ.
 *      Produkt dokładałby mu w kółko rzecz, której świadomie odmówił.
 * Skutek uboczny, przyjęty świadomie: otwarte zadanie się nie odświeża.
 * Jeżeli nowy tydzień ma dać nowe zadanie — ma dać NOWY KLUCZ.
 */
export const UPSERT_ZADANIA_SYSTEMOWEGO =
  'on conflict (user_id, system_key) do nothing';

// ─────────────────────────────────────────────────────────────────────
// 2. KSZTAŁT POZYCJI
// ─────────────────────────────────────────────────────────────────────

/** Rejestry Z0. Zmieszanie ich jest tym, czego Z0 zabrania. */
export const REJESTRY_Z0 = ['fakt_o_tobie', 'fakt_o_innych', 'propozycja'] as const;
export type RejestrZ0 = (typeof REJESTRY_Z0)[number];

/**
 * Skończony zbiór źródeł — „skąd to wiemy" (WG-17).
 * ⚠️ TO SĄ KLUCZE, NIE BRZMIENIA. Makieta zatwierdza trzy zdania („Ty to
 * dodałeś", „z Twojego kalendarza", „Odblokowana w Twoim Bloku Skupienia");
 * mapa klucz → zdanie należy do pasa C2, bo to jest tekst dla zawodnika.
 */
export const ZRODLA_ZADANIA = [
  'player',
  'calendar',
  'focus_block',
  'journal',
  'profile',
  'system',
] as const;
export type ZrodloZadania = (typeof ZRODLA_ZADANIA)[number];

/** ⚠️ „Odhaczone" i „porzucone" to NIE JEST to samo. Patrz komentarz w migracji. */
export const STANY_ZADANIA = ['open', 'done', 'abandoned'] as const;
export type StanZadania = (typeof STANY_ZADANIA)[number];

/**
 * Powód, dla którego zadanie stoi na liście.
 *
 * ⚠️ `fakt` JEST ZAMROŻONY. Przyszedł z bazy taki, jaki był w chwili powstania
 * zadania, i nie wolno go przeliczać przy odczycie. Funkcja, która by go
 * przeliczyła, powiedziałaby zawodnikowi liczbę, której produkt wtedy nie miał.
 */
export type PowodZadania = {
  /**
   * Część zmierzona, u zawodnika pogrubiona: „Kolano boli od 5 dni".
   * `null`, gdy powód nie niesie żadnego pomiaru — makieta ma dwa takie
   * („Odblokowana w Twoim Bloku Skupienia.", „Bez tego nie pokażemy Ci
   * części materiałów.").
   */
  fakt: string | null;
  /** Reszta zdania — nasze wyjaśnienie. `null`, gdy powód to sam pomiar. */
  wyjasnienie: string | null;
  /**
   * Rejestr Z0 dla `fakt`. ⚠️ NIEPUSTY DOKŁADNIE WTEDY, GDY `fakt` jest
   * niepusty — to jest ta sama reguła, którą baza trzyma CHECK-iem
   * `player_tasks_reason_register_enum`. `wyjasnienie` rejestru nie ma,
   * bo jest zawsze naszym zdaniem, nigdy pomiarem.
   */
  rejestr: RejestrZ0 | null;
  /** Maszynowy rodzaj powodu — po tym waży ranker (B1), nie po polskim zdaniu. */
  klucz: string | null;
};

/** Wskazanie rekordu, z którego powstał powód (WG-17: „skąd to wiemy"). */
export type SladZrodlowy = {
  /** Nazwa tabeli, np. `pain_entries`. */
  tabela: string;
  /** Identyfikator wiersza. ⛔ NIGDY NIE POKAZUJEMY GO ZAWODNIKOWI. */
  idWiersza: string;
};

export type Zadanie = {
  id: string;
  /** Jedna linia: „Zamów wizytę u fizjo". */
  tytul: string;
  /**
   * `null` znaczy „to zadanie nie ma powodu" — dopuszczalne WYŁĄCZNIE, gdy
   * `zrodlo === 'player'`, bo wtedy powodem jest zawodnik.
   */
  powod: PowodZadania | null;
  /** `null` = źródło spoza znanego zbioru; patrz `nieznaneZrodlo`. */
  zrodlo: ZrodloZadania | null;
  /**
   * Surowa wartość źródła, gdy baza zna wartość, której nie zna ta wersja
   * appki. ⚠️ Wtedy C2 ma NIE RYSOWAĆ wiersza „skąd to wiemy" — zgadywane
   * brzmienie jest gorsze niż jego brak (Z0).
   */
  nieznaneZrodlo: string | null;
  sladZrodlowy: SladZrodlowy | null;
  /** „30 sekund", „10 sekund". `null` = nie wiemy, ile zajmie — nie „zero". */
  ileZajmieSekund: number | null;
  /** „do niedzieli", „środa". `YYYY-MM-DD` albo `null` = bez terminu. */
  termin: string | null;
  stan: StanZadania;
  /** ISO. `null` wtedy i tylko wtedy, gdy `stan === 'open'`. */
  stanZmienionyO: string | null;
  /**
   * WT-29 — ręczne podniesienie do „Teraz": FAKT I MOMENT.
   * ⚠️ To jest WEJŚCIE rankera, nie wynik. Ile waży — rozstrzyga pas B1.
   */
  podniesioneO: string | null;
  /** Klucz naturalny zadania systemowego (WG-18). `null` dla zadań zawodnika. */
  kluczSystemowy: string | null;
  utworzoneO: string;
};

// ─────────────────────────────────────────────────────────────────────
// 3. CZTERY STANY ODCZYTU (R5) — nigdy trzy, nigdy pusta tablica na wszystko
// ─────────────────────────────────────────────────────────────────────

/** Wiersz, którego nie dało się przeczytać — z powodem, nie po cichu. */
export type WierszOdrzucony = {
  /** Identyfikator, jeśli dało się go odczytać. */
  id: string | null;
  powod: string;
};

export type OdczytZadan =
  /**
   * Odczyt się udał i coś jest.
   * ⚠️ `odrzucone` MOŻE BYĆ NIEPUSTE mimo `sa_zadania` — wtedy lista jest
   * niepełna i C2 ma o tym powiedzieć. Patrz `czyOdczytNiepelny`.
   */
  | { rodzaj: 'sa_zadania'; zadania: Zadanie[]; odrzucone: WierszOdrzucony[] }
  /** Odczyt się udał, lista jest pusta. Zawodnik naprawdę nie ma nic do zrobienia. */
  | { rodzaj: 'brak_danych' }
  /** Baza odmówiła. To NIE jest pustka — zawodnik ma zadania, tylko ich nie dostał. */
  | { rodzaj: 'brak_uprawnien'; powod: string }
  /** Wszystko inne: brak tabeli, timeout, zerwana sieć, nieznany kształt. */
  | { rodzaj: 'nie_wiem'; powod: string };

/**
 * Kształt odpowiedzi klienta Supabase — dokładnie taki, jaki zwraca
 * `await supabase.from(...).select(...)`.
 *
 * ⚠️ TO JEST CAŁA OBRONA PRZED CICHYM BRAKIEM. `odczytZadan` przyjmuje
 * OBIEKT Z BŁĘDEM, a nie tablicę. Nie da się jej zawołać, odrzuciwszy
 * wcześniej `error` — a to jest jedyny ruch, którym powstaje ten defekt.
 */
export type OdpowiedzBazy = {
  data: unknown;
  error: unknown;
};

/**
 * Surowa odpowiedź bazy → jeden z czterech stanów.
 *
 * ⚠️ NIGDY nie zwraca pustej tablicy w zastępstwie błędu. Kolejność
 * rozstrzygania i jej powód:
 *   1. BŁĄD ODMOWY — bo to jedyny przypadek, w którym problem jest po naszej
 *      stronie i zawodnik nie naprawi go, dodając zadanie.
 *   2. INNY BŁĄD → `nie_wiem`. Nie zgadujemy, czy to pustka.
 *   3. `data` nie jest tablicą → `nie_wiem`. Kształt, którego nie rozumiemy,
 *      nie jest pustką.
 *   4. Tablica pusta → `brak_danych`.
 *   5. Wszystkie wiersze odrzucone → `nie_wiem`. Baza coś miała, a my nie
 *      zrozumieliśmy z tego ani jednej pozycji — powiedzenie wtedy „nie masz
 *      nic do zrobienia" byłoby nieprawdą o zawodniku.
 */
export function odczytZadan(odpowiedz: OdpowiedzBazy): OdczytZadan {
  const { data, error } = odpowiedz;

  if (error) {
    if (toJestBrakDostepu(error)) {
      return { rodzaj: 'brak_uprawnien', powod: opisBledu(error) };
    }
    return { rodzaj: 'nie_wiem', powod: `odczyt zadań nie powiódł się: ${opisBledu(error)}` };
  }

  if (data === null || data === undefined) {
    return { rodzaj: 'nie_wiem', powod: 'baza nie zwróciła ani danych, ani błędu' };
  }

  if (!Array.isArray(data)) {
    return { rodzaj: 'nie_wiem', powod: `odpowiedź nie jest listą (${typeof data})` };
  }

  if (data.length === 0) return { rodzaj: 'brak_danych' };

  const zadania: Zadanie[] = [];
  const odrzucone: WierszOdrzucony[] = [];
  for (const wiersz of data) {
    const wynik = zadanieZWiersza(wiersz);
    if (wynik.ok) zadania.push(wynik.zadanie);
    else odrzucone.push({ id: wynik.id, powod: wynik.powod });
  }

  if (zadania.length === 0) {
    return {
      rodzaj: 'nie_wiem',
      powod:
        `baza zwróciła ${data.length} wierszy i ani jednego nie dało się odczytać `
        + `(pierwszy powód: ${odrzucone[0]?.powod ?? 'nieznany'})`,
    };
  }

  return { rodzaj: 'sa_zadania', zadania, odrzucone };
}

/**
 * Czy lista, którą właśnie pokazujemy, jest niepełna.
 * ⚠️ C2 ma to sprawdzać. Zadanie, które wypadło po cichu, jest dokładnie tym
 * samym defektem co pusta tablica zamiast błędu, tylko o jedną pozycję mniejszym.
 */
export function czyOdczytNiepelny(o: OdczytZadan): boolean {
  return o.rodzaj === 'sa_zadania' && o.odrzucone.length > 0;
}

// ─────────────────────────────────────────────────────────────────────
// 4. JEDEN WIERSZ → POZYCJA ALBO POWÓD ODMOWY
// ─────────────────────────────────────────────────────────────────────

export type WynikMapowania =
  | { ok: true; zadanie: Zadanie }
  | { ok: false; id: string | null; powod: string };

/**
 * Surowy wiersz z bazy → `Zadanie`. Bez sieci, bez zegara, bez wyjątków.
 *
 * ⚠️ CZTERY RZECZY, PRZY KTÓRYCH WIERSZ WYPADA, KAŻDA Z POWODEM:
 *   • brak `id`, `title`, `state`, `origin` lub `created_at` — pozycji nie ma
 *     czym narysować;
 *   • `state` spoza zbioru — nie wiemy, czy rzecz jest zrobiona. Narysowanie
 *     jej w „Teraz" byłoby nieprawdą o zawodniku;
 *   • `reason_fact` bez rejestru Z0 albo z rejestrem spoza zbioru — powód,
 *     którego nie umiemy przypisać, nie wychodzi na ekran (Z0). A obietnica
 *     WT-21 mówi, że przy pozycji STOI uzasadnienie — więc pozycja bez
 *     czytelnego uzasadnienia nie jest tą pozycją;
 *   • zadanie systemowe bez powodu — baza tego nie wpuszcza, a jeśli mimo to
 *     przyszło, to znaczy, że czytamy coś innego, niż myślimy.
 *
 * ⚠️ CZEGO NIE ROBI: nie odrzuca wiersza z NIEZNANYM ŹRÓDŁEM. Wtedy zadanie
 * zostaje, a `zrodlo` jest `null` — C2 pokaże pozycję bez wiersza „skąd to
 * wiemy". Utrata jednej linijki jest mniejszą szkodą niż zniknięcie zadania,
 * a zgadnięcie brzmienia byłoby złamaniem Z0.
 */
export function zadanieZWiersza(wiersz: unknown): WynikMapowania {
  if (wiersz === null || typeof wiersz !== 'object' || Array.isArray(wiersz)) {
    return { ok: false, id: null, powod: `wiersz nie jest obiektem (${typeof wiersz})` };
  }
  const w = wiersz as Record<string, unknown>;
  const id = napis(w.id);
  const odmowa = (powod: string): WynikMapowania => ({ ok: false, id, powod });

  if (!id) return odmowa('wiersz bez `id`');

  const tytul = napis(w.title);
  if (!tytul) return odmowa('wiersz bez `title` — nie ma czego pokazać');

  const utworzoneO = napis(w.created_at);
  if (!utworzoneO) return odmowa('wiersz bez `created_at`');

  const stanSurowy = napis(w.state);
  if (!stanSurowy) return odmowa('wiersz bez `state`');
  if (!(STANY_ZADANIA as readonly string[]).includes(stanSurowy)) {
    return odmowa(`nieznany stan „${stanSurowy}" — nie wiem, czy to jest zrobione`);
  }
  const stan = stanSurowy as StanZadania;

  const stanZmienionyO = napis(w.state_changed_at);
  if (stan === 'open' && stanZmienionyO) {
    return odmowa('stan `open` z datą zmiany — sprzeczność, której baza nie wpuszcza');
  }
  if (stan !== 'open' && !stanZmienionyO) {
    return odmowa(`stan „${stanSurowy}" bez daty zmiany — fakt bez momentu`);
  }

  const zrodloSurowe = napis(w.origin);
  if (!zrodloSurowe) return odmowa('wiersz bez `origin` — nie wiadomo, skąd to zadanie');
  const zrodloZnane = (ZRODLA_ZADANIA as readonly string[]).includes(zrodloSurowe);
  const zrodlo = zrodloZnane ? (zrodloSurowe as ZrodloZadania) : null;

  // ── POWÓD ──────────────────────────────────────────────────────────
  const fakt = napis(w.reason_fact);
  const wyjasnienie = napis(w.reason_text);
  const rejestrSurowy = napis(w.reason_register);
  const kluczPowodu = napis(w.reason_key);

  if (fakt) {
    if (!rejestrSurowy) {
      return odmowa('powód bez rejestru Z0 — nie umiem powiedzieć, czym jest to zdanie');
    }
    if (!(REJESTRY_Z0 as readonly string[]).includes(rejestrSurowy)) {
      return odmowa(`rejestr Z0 spoza zbioru: „${rejestrSurowy}"`);
    }
    if (!kluczPowodu) {
      return odmowa('powód bez `reason_key` — ranker nie ma po czym go zważyć');
    }
  } else if (rejestrSurowy || kluczPowodu) {
    return odmowa('rejestr albo klucz powodu bez samego pomiaru');
  }

  // ⚠️ Zadanie BEZ POWODU wolno mieć wyłącznie zawodnikowi — bo wtedy
  // powodem jest on sam. Wszystko, co wyprodukował produkt, musi umieć
  // powiedzieć, dlaczego istnieje.
  if (!fakt && !wyjasnienie && zrodloSurowe !== 'player') {
    return odmowa(`zadanie o źródle „${zrodloSurowe}" nie mówi, dlaczego istnieje`);
  }

  const powod: PowodZadania | null =
    fakt || wyjasnienie
      ? {
          fakt,
          wyjasnienie,
          rejestr: fakt ? (rejestrSurowy as RejestrZ0) : null,
          klucz: fakt ? kluczPowodu : null,
        }
      : null;

  // ── ŚLAD ŹRÓDŁOWY ─────────────────────────────────────────────────
  const tabelaZrodlowa = napis(w.source_table);
  const idWierszaZrodlowego = napis(w.source_row_id);
  if (Boolean(tabelaZrodlowa) !== Boolean(idWierszaZrodlowego)) {
    return odmowa('ślad źródłowy jest połowiczny — sama tabela albo samo id');
  }
  const sladZrodlowy: SladZrodlowy | null =
    tabelaZrodlowa && idWierszaZrodlowego
      ? { tabela: tabelaZrodlowa, idWiersza: idWierszaZrodlowego }
      : null;

  // ── KOSZT I TERMIN ────────────────────────────────────────────────
  let ileZajmieSekund: number | null = null;
  if (w.effort_seconds !== null && w.effort_seconds !== undefined) {
    const n = Number(w.effort_seconds);
    if (!Number.isInteger(n) || n <= 0) {
      return odmowa(`koszt czasowy nie jest dodatnią liczbą sekund: ${String(w.effort_seconds)}`);
    }
    ileZajmieSekund = n;
  }

  const termin = napis(w.due_on);
  if (termin && !/^\d{4}-\d{2}-\d{2}$/.test(termin)) {
    return odmowa(`termin ma nieznany kształt: „${termin}"`);
  }

  return {
    ok: true,
    zadanie: {
      id,
      tytul,
      powod,
      zrodlo,
      nieznaneZrodlo: zrodloZnane ? null : zrodloSurowe,
      sladZrodlowy,
      ileZajmieSekund,
      termin,
      stan,
      stanZmienionyO,
      podniesioneO: napis(w.raised_at),
      kluczSystemowy: napis(w.system_key),
      utworzoneO,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────
// 5. STRONA ZAPISU — dla producentów systemowych (pas B3) i dla C2
// ─────────────────────────────────────────────────────────────────────

/**
 * Klucz naturalny zadania systemowego (WG-18).
 *
 * ⚠️ ZIARNISTOŚĆ KLUCZA JEST REGUŁĄ ODDUPLIKOWANIA — nie ozdobą. Klucz
 * `bol_kolano` znaczy „raz na zawsze"; `bol_kolano:2026-W33` znaczy „raz na
 * tydzień". Producent, który nie wybierze świadomie, wybierze przypadkiem.
 * Ta funkcja istnieje po to, żeby ten napis powstawał w JEDNYM miejscu —
 * klucz sklejany ręcznie w trzech cronach rozjedzie się co do znaku, a skutek
 * (dublet u zawodnika) zobaczy dopiero on.
 */
export function zbudujKluczSystemowy(rodzaj: string, okno: string | null): string | null {
  const r = rodzaj.trim();
  if (!r || /\s/.test(r)) return null;
  if (okno === null) return r;
  const o = okno.trim();
  if (!o || /\s/.test(o)) return null;
  return `${r}:${o}`;
}

/** Wiersz gotowy do wstawienia — nazwy kolumn, nie nazwy z `Zadanie`. */
export type WierszDoZapisu = {
  user_id: string;
  title: string;
  reason_fact: string | null;
  reason_text: string | null;
  reason_register: RejestrZ0 | null;
  reason_key: string | null;
  origin: ZrodloZadania;
  source_table: string | null;
  source_row_id: string | null;
  effort_seconds: number | null;
  due_on: string | null;
  system_key: string | null;
};

export type WynikBudowy =
  | { ok: true; wiersz: WierszDoZapisu }
  | { ok: false; powod: string };

/**
 * Buduje zadanie SYSTEMOWE albo odmawia z powodem.
 *
 * ⚠️ PO CO TO ISTNIEJE, SKORO BAZA MA CHECK-I: bo `check_violation` z crona
 * o 4 rano zobaczy log, a nie człowiek. Ta funkcja przenosi tę samą regułę
 * o jeden krok wcześniej — tam, gdzie strażnik `lib/zadania.selftest.ts`
 * potrafi ją sprawdzić bez bazy. ⛔ NIE ZASTĘPUJE CHECK-ÓW i nie ma ich
 * zastępować: baza jest ostatnią linią, ta funkcja pierwszą.
 *
 * ⚠️ CZAS NIE WCHODZI TU W OGÓLE. `created_at` stawia baza, a liczby w powodzie
 * przelicza producent PRZED wywołaniem — bo tylko on wie, co zmierzył.
 */
export function zbudujZadanieSystemowe(wejscie: {
  userId: string;
  tytul: string;
  zrodlo: Exclude<ZrodloZadania, 'player'>;
  faktZLiczbami: string;
  wyjasnienie: string | null;
  rejestr: RejestrZ0;
  kluczPowodu: string;
  kluczSystemowy: string;
  slad: SladZrodlowy | null;
  ileZajmieSekund?: number | null;
  termin?: string | null;
}): WynikBudowy {
  if (!wejscie.userId.trim()) return { ok: false, powod: 'brak `userId`' };

  const tytul = wejscie.tytul.trim();
  if (!tytul) return { ok: false, powod: 'tytuł jest pusty' };
  if (tytul.length > 120) {
    return { ok: false, powod: `tytuł ma ${tytul.length} znaków, mieści się 120` };
  }

  const fakt = wejscie.faktZLiczbami.trim();
  if (!fakt) {
    return {
      ok: false,
      powod: 'zadanie systemowe bez powodu — powód jest dopuszczalny tylko u zadań zawodnika',
    };
  }
  if (!(REJESTRY_Z0 as readonly string[]).includes(wejscie.rejestr)) {
    return { ok: false, powod: `rejestr Z0 spoza zbioru: „${wejscie.rejestr}"` };
  }
  if (!wejscie.kluczPowodu.trim()) {
    return { ok: false, powod: 'brak klucza powodu — ranker nie ma po czym go zważyć' };
  }
  if (!wejscie.kluczSystemowy.trim()) {
    return { ok: false, powod: 'brak klucza systemowego — bez niego zadanie zdubluje się (WG-18)' };
  }
  // ⚠️ Sprawdzane w RUNTIME, nie tylko w typach: producentów systemowych pisze
  // pas B3 i część z nich stoi w JavaScripcie (`gamechange-app/api/`), gdzie
  // `Exclude<…,'player'>` nie istnieje.
  const zrodlo = String(wejscie.zrodlo);
  if (!(ZRODLA_ZADANIA as readonly string[]).includes(zrodlo)) {
    return { ok: false, powod: `źródło spoza zbioru: „${zrodlo}"` };
  }
  if (zrodlo === 'player') {
    return { ok: false, powod: 'zadanie systemowe nie może mieć źródła `player`' };
  }
  const ile = wejscie.ileZajmieSekund ?? null;
  if (ile !== null && (!Number.isInteger(ile) || ile <= 0)) {
    return { ok: false, powod: `koszt czasowy musi być dodatnią liczbą sekund, jest ${String(ile)}` };
  }
  const termin = wejscie.termin ?? null;
  if (termin !== null && !/^\d{4}-\d{2}-\d{2}$/.test(termin)) {
    return { ok: false, powod: `termin ma nieznany kształt: „${termin}"` };
  }

  return {
    ok: true,
    wiersz: {
      user_id: wejscie.userId,
      title: tytul,
      reason_fact: fakt,
      reason_text: wejscie.wyjasnienie?.trim() || null,
      reason_register: wejscie.rejestr,
      reason_key: wejscie.kluczPowodu.trim(),
      origin: wejscie.zrodlo,
      source_table: wejscie.slad?.tabela ?? null,
      source_row_id: wejscie.slad?.idWiersza ?? null,
      effort_seconds: ile,
      due_on: termin,
      system_key: wejscie.kluczSystemowy.trim(),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────
// 6. DROBIAZGI
// ─────────────────────────────────────────────────────────────────────

/** Zdanie do konsoli — żeby dało się odpowiedzieć, czemu lista była wtedy pusta. */
export function opisOdczytuDoLogu(o: OdczytZadan): string {
  switch (o.rodzaj) {
    case 'sa_zadania':
      return o.odrzucone.length === 0
        ? `zadania: ${o.zadania.length}`
        : `zadania: ${o.zadania.length}, ⚠️ ODRZUCONE WIERSZE: ${o.odrzucone.length} `
          + `(${o.odrzucone.map((r) => r.powod).join(' | ')})`;
    case 'brak_danych':
      return 'zadania: pusto — odczyt się udał, zawodnik nie ma nic do zrobienia';
    case 'brak_uprawnien':
      return `zadania: BRAK UPRAWNIEŃ — ${o.powod}`;
    case 'nie_wiem':
      return `zadania: NIE WIEM — ${o.powod}`;
  }
}

function napis(x: unknown): string | null {
  return typeof x === 'string' && x.trim().length > 0 ? x : null;
}

function opisBledu(e: unknown): string {
  const err = e as { code?: unknown; message?: unknown } | null;
  if (!err) return 'błąd bez treści';
  const kod = typeof err.code === 'string' ? err.code : null;
  const tresc = typeof err.message === 'string' ? err.message : String(e);
  return kod ? `${kod}: ${tresc}` : tresc;
}
