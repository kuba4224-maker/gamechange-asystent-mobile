// PLAN-D-E 08.2026 (11.08.2026) — NOWY PLIK. Mapa drogi: czysta logika.
//
//   npx tsx lib/mapaDrogi.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// Ten plik NIE zna Reacta i NIE robi zapytań. Zapytanie i rysowanie siedzą
// w `components/MojaDroga.tsx`; tutaj mieszkają wyłącznie reguły, które da się
// zepsuć po cichu — a w Mapie są cztery takie:
//
//   1. WYBÓR ODCINKA po roczniku. Rocznik jest DANĄ OSOBOWĄ, więc w koncie
//      OGRANICZONYM odcinka nie wolno pokazać. Pomyłka w tę stronę to nie
//      brzydki ekran, tylko przetwarzanie danych nieletniego bez zgody.
//   2. REGUŁA P7 — każdy odcinek MUSI mieć dokładnie jedną rzecz do zrobienia
//      jutro. Odcinek bez niej jest odcinkiem wadliwym i ma to POWIEDZIEĆ,
//      a nie pokazać pustkę.
//   3. TŁO (`is_controllable = false`) nie jest wypełniaczem. Pokazanie, że
//      część czynników nie zależy od zawodnika, jest samo w sobie działaniem —
//      przenosi przyczynę niepowodzenia z niego na system. Sekcja, która
//      „czasem się nie renderuje", kasuje tę wartość po cichu.
//   4. BRAK TABELI ≠ BRAK TREŚCI. Migracja osi decyzji na 11.08.2026 NIE JEST
//      wykonana. Dopóki nie jest, Mapa ma mówić „treść jeszcze nie wgrana",
//      a nie „nie masz nic".
//
// ⚠️ MAPA NIGDY NIE ZABIERA GŁOSU I NIGDY NIE PUSHA (spec 1.4, budżet 0
// ZAWSZE). Dlatego jako jedyne narzędzie działa w koncie OGRANICZONYM —
// działa wyłącznie na przyciąganie. W tym pliku nie ma i nie może się pojawić
// nic, co planuje powiadomienie.
//
// Treść: `claude/TRESC_MAPY_DROGI_11_08_2026.md` (PRZYJĘTA przez Kubę 11.08).
// Treść żyje w bazie (`road_segments` + `road_factors`), nie tutaj — poprawka
// brzmienia nie może wymagać wydania aplikacji.
import { isMissingTableError, minimumPossibleAge } from './componentHints';

// ─────────────────────────────────────────────────────────────────────
// 1. KSZTAŁT DANYCH — jeden do jednego z migracją osi decyzji
// ─────────────────────────────────────────────────────────────────────

export type Wariant = 'base' | 'after_deselection' | 'witness';

export type SilaDowodu = 'najwyzsza' | 'wysoka' | 'srednia' | 'posrednia' | 'brak';

export type RoadSegment = {
  id: string;
  slug: string;
  label: string;
  age_from: number;
  age_to: number;
  sort_order: number;
};

export type RoadFactor = {
  id: string;
  segment_id: string;
  slug: string;
  title: string;
  body: string;
  evidence_level: SilaDowodu;
  evidence_number: string | null;
  source_ref: string | null;
  is_controllable: boolean;
  is_tomorrow: boolean;
  variant: Wariant;
  sort_order: number;
};

export const SEGMENT_COLUMNS = 'id,slug,label,age_from,age_to,sort_order';
export const FACTOR_COLUMNS =
  'id,segment_id,slug,title,body,evidence_level,evidence_number,source_ref,is_controllable,is_tomorrow,variant,sort_order';

// ─────────────────────────────────────────────────────────────────────
// 2. BRAMKA KONTA — rocznik jest daną osobową
// ─────────────────────────────────────────────────────────────────────

/** Zwracane przez `rpc('account_state')` (mechanizm zgody rodzica, 11.08.2026). */
export type AccountState = 'full' | 'limited' | 'suspended' | 'unknown_age';

export type DostepMapy = {
  /** Czy wolno pokazać odcinek wiekowy. Wymaga rocznika, a rocznik jest daną. */
  odcinek: boolean;
  dziennik: boolean;
  diagnoza: boolean;
  /** Zdanie dla zawodnika — nigdy pusty ekran bez powodu. */
  powod: string;
  /**
   * Ustawione TYLKO wtedy, gdy `account_state` zwróciło wartość spoza czterech
   * znanych. Nie jest dla zawodnika — jest dla logu, żeby dało się odróżnić
   * „wywołanie padło" od „baza mówi coś, czego appka nie rozumie".
   */
  nieznanaWartosc?: string;
};

/**
 * MAPA jest jedynym narzędziem działającym w koncie OGRANICZONYM — ale
 * BEZ ODCINKA WIEKOWEGO.
 *
 * Kierunek błędu jest wybrany świadomie: nieznany stan konta traktujemy jak
 * ograniczony. Błąd w tę stronę znaczy „zawodnik nie zobaczył swojego odcinka".
 * Błąd w drugą stronę znaczy „pokazaliśmy treść wyliczoną z rocznika komuś,
 * kto nie ma na to zgody rodzica". To nie są koszty tej samej wagi.
 */
export function dostepMapy(state: AccountState | string | null | undefined): DostepMapy {
  switch (state) {
    case 'full':
      return { odcinek: true, dziennik: true, diagnoza: true, powod: '' };
    case 'limited':
      return {
        odcinek: false, dziennik: false, diagnoza: false,
        powod: 'Twoje konto czeka na zgodę rodzica. Mapa działa bez niej — ale odcinek dla Twojego wieku pokażemy dopiero, gdy zgoda będzie.',
      };
    case 'unknown_age':
      return {
        odcinek: false, dziennik: false, diagnoza: false,
        powod: 'Nie mamy Twojego rocznika, więc nie wiemy, który odcinek jest Twój. Całą mapę możesz czytać bez tego.',
      };
    case 'suspended':
      return {
        odcinek: false, dziennik: false, diagnoza: false,
        powod: 'Twoje konto jest wstrzymane. Mapa zostaje dostępna do czytania — reszta nie.',
      };
    default:
      // PLAN-D-E 08.2026, poprawka po pierwszym uruchomieniu na telefonie.
      // ⚠️ „NIE ODCZYTAŁEM STANU" i „ODCZYTAŁEM WARTOŚĆ, KTÓREJ NIE ZNAM" to
      // DWIE RÓŻNE RZECZY, a pierwsza wersja dawała na nie jeden ekran.
      // Zawodnik widział to samo zdanie niezależnie od tego, czy wywołanie
      // padło, czy funkcja zwróciła piąty stan, o którym appka nie wie —
      // czyli własny „cichy brak" w kodzie, który ma go tępić.
      if (typeof state === 'string' && state.length > 0) {
        return {
          odcinek: false, dziennik: false, diagnoza: false,
          nieznanaWartosc: state,
          powod: 'Twoje konto jest w stanie, którego ta wersja aplikacji jeszcze nie zna. Nie pokazuję odcinka wyliczonego z rocznika. Całą mapę możesz czytać bez tego.',
        };
      }
      return {
        odcinek: false, dziennik: false, diagnoza: false,
        powod: 'Nie udało się sprawdzić stanu Twojego konta, więc nie pokazuję odcinka wyliczonego z rocznika. Całą mapę możesz czytać bez tego.',
      };
  }
}

// ─────────────────────────────────────────────────────────────────────
// 3. WYBÓR ODCINKA
// ─────────────────────────────────────────────────────────────────────

export type WyborOdcinka =
  | { stan: 'wybrany'; odcinek: RoadSegment }
  /** Wiek poza zakresem mapy — pokazujemy najbliższy i MÓWIMY o tym. */
  | { stan: 'przyblizony'; odcinek: RoadSegment; powod: string }
  | { stan: 'nie_wiem'; powod: string };

/**
 * Appka zna wyłącznie ROCZNIK (`public.users.birth_year`), nie datę urodzenia.
 * Liczymy WIEK NAJNIŻSZY MOŻLIWY — tą samą funkcją co bramka wiekowa A9
 * (`lib/componentHints.ts`), żeby w produkcie był jeden rachunek wieku, nie dwa.
 *
 * Kierunek błędu: zawodnik dostanie odcinek MŁODSZY, a treść młodszych
 * odcinków mówi „mniej i szerzej". Odwrotny błąd podsuwałby szesnastolatkowi
 * treść dla osiemnastolatka. To nie są koszty tej samej wagi.
 */
export function wybierzOdcinek(
  birthYear: number | null | undefined,
  odcinki: RoadSegment[],
  teraz: Date = new Date(),
): WyborOdcinka {
  if (!odcinki || odcinki.length === 0) {
    return { stan: 'nie_wiem', powod: 'brak odcinków w bazie' };
  }
  const wiek = minimumPossibleAge(birthYear, teraz);
  if (wiek === null) {
    return { stan: 'nie_wiem', powod: 'nie znam rocznika zawodnika' };
  }
  const posort = [...odcinki].sort((a, b) => a.age_from - b.age_from);
  const trafiony = posort.find((s) => wiek >= s.age_from && wiek <= s.age_to);
  if (trafiony) return { stan: 'wybrany', odcinek: trafiony };

  const pierwszy = posort[0];
  const ostatni = posort[posort.length - 1];
  if (wiek < pierwszy.age_from) {
    return {
      stan: 'przyblizony', odcinek: pierwszy,
      powod: `Mapa zaczyna się od ${pierwszy.age_from} lat. Pokazuję pierwszy odcinek — jest najbliżej tego, co jest teraz Twoje.`,
    };
  }
  return {
    stan: 'przyblizony', odcinek: ostatni,
    powod: `Mapa kończy się na ${ostatni.age_to} latach. Pokazuję ostatni odcinek.`,
  };
}

// ─────────────────────────────────────────────────────────────────────
// 4. WARIANT (reguła P8)
// ─────────────────────────────────────────────────────────────────────

/**
 * `exit_mode` aktywny → wariant „odpadłem". Zawodnik, który został, ale koledzy
 * odpadli → wariant „świadek". W obu: ta sama liczba systemowa zamiast pocieszenia.
 */
export function wybierzWariant(params: {
  exitAktywny: boolean | null;
  swiadekDeselekcji: boolean | null;
}): Wariant {
  if (params.exitAktywny === true) return 'after_deselection';
  if (params.swiadekDeselekcji === true) return 'witness';
  return 'base';
}

// ─────────────────────────────────────────────────────────────────────
// 5. TRZY SEKCJE ODCINKA — w tej kolejności, zawsze
// ─────────────────────────────────────────────────────────────────────

export type OdcinekWidok =
  | {
    stan: 'gotowy';
    odcinek: RoadSegment;
    wariant: Wariant;
    naJutro: RoadFactor;
    wTwoichRekach: RoadFactor[];
    tlo: RoadFactor[];
  }
  | {
    /**
     * Odcinek bez dokładnie jednej pozycji „na jutro" jest ODCINKIEM WADLIWYM
     * (reguła P7) i mówi to wprost. Pokazujemy resztę treści — ale nie udajemy,
     * że wszystko jest w porządku.
     */
    stan: 'wadliwy';
    odcinek: RoadSegment;
    wariant: Wariant;
    powod: string;
    wTwoichRekach: RoadFactor[];
    tlo: RoadFactor[];
  }
  | { stan: 'brak_tresci'; odcinek: RoadSegment; wariant: Wariant; powod: string };

export const BRAK_TRESCI_ODCINKA =
  'Treść tego odcinka nie jest jeszcze wgrana do bazy. To nie znaczy, że nic tu nie ma — znaczy, że jeszcze nie została wklejona.';

export const WADLIWY_BEZ_JUTRA =
  'Ten odcinek nie ma jednej rzeczy do zrobienia jutro. To błąd treści, nie Twój — reszta odcinka jest niżej.';

export const WADLIWY_WIELE_JUTER =
  'Ten odcinek ma więcej niż jedną rzecz „na jutro". To błąd treści — pokazuję pozostałe sekcje.';

/**
 * Buduje widok odcinka z surowych wierszy. Zakres wejścia jest celowo szeroki
 * (wszystkie wiersze zawodnika), a filtrowanie po odcinku i wariancie dzieje się
 * tutaj — żeby dało się to sprawdzić bez bazy.
 */
export function zbudujOdcinek(
  odcinek: RoadSegment,
  wariant: Wariant,
  wszystkie: RoadFactor[],
): OdcinekWidok {
  const moje = wszystkie
    .filter((f) => f.segment_id === odcinek.id && f.variant === wariant)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (moje.length === 0) {
    return { stan: 'brak_tresci', odcinek, wariant, powod: BRAK_TRESCI_ODCINKA };
  }

  const juter = moje.filter((f) => f.is_tomorrow);
  const reszta = moje.filter((f) => !f.is_tomorrow);
  const wTwoichRekach = reszta.filter((f) => f.is_controllable);
  const tlo = reszta.filter((f) => !f.is_controllable);

  if (juter.length === 1) {
    return { stan: 'gotowy', odcinek, wariant, naJutro: juter[0], wTwoichRekach, tlo };
  }
  return {
    stan: 'wadliwy',
    odcinek,
    wariant,
    powod: juter.length === 0 ? WADLIWY_BEZ_JUTRA : WADLIWY_WIELE_JUTER,
    wTwoichRekach,
    tlo,
  };
}

// ─────────────────────────────────────────────────────────────────────
// 6. STAN CAŁEGO EKRANU
// ─────────────────────────────────────────────────────────────────────

export type StanMapy =
  | { stan: 'ladowanie' }
  /** Migracja osi decyzji nie jest wykonana. To NIE to samo, co „brak treści". */
  | { stan: 'brak_tabel'; powod: string }
  | { stan: 'blad'; powod: string }
  /** Konto ograniczone / nieznany rocznik — mapa bez odcinka. */
  | { stan: 'bez_odcinka'; powod: string; odcinki: RoadSegment[] }
  | { stan: 'gotowa'; widok: OdcinekWidok; odcinki: RoadSegment[]; przyblizenie: string | null };

export const BRAK_TABEL_TEXT =
  'Mapa drogi czeka na wgranie do bazy. Nie ma tu pustki do wypełnienia — jest treść, której jeszcze nie wklejono.';

export const BLAD_ODCZYTU_TEXT =
  'Nie udało się wczytać Mapy. To błąd po naszej stronie, nie brak treści — spróbuj odświeżyć.';

/**
 * Jedno miejsce, w którym z surowego wyniku zapytania powstaje stan ekranu.
 *
 * ⚠️ REGUŁA: pusty wynik i brak dostępu to DWIE RÓŻNE RZECZY. `error` z kodem
 * „nie ma takiej tabeli" daje `brak_tabel`, każdy inny błąd daje `blad`,
 * a pusta tablica bez błędu daje `brak_tresci` na poziomie odcinka.
 * Nigdzie tu nie ma ścieżki, którą pustka udaje odpowiedź.
 */
export function zbudujStanMapy(params: {
  laduje: boolean;
  error: unknown | null;
  odcinki: RoadSegment[] | null;
  czynniki: RoadFactor[] | null;
  accountState: AccountState | string | null;
  birthYear: number | null;
  exitAktywny: boolean | null;
  swiadekDeselekcji: boolean | null;
  teraz?: Date;
}): StanMapy {
  if (params.laduje) return { stan: 'ladowanie' };

  if (params.error) {
    return isMissingTableError(params.error)
      ? { stan: 'brak_tabel', powod: BRAK_TABEL_TEXT }
      : { stan: 'blad', powod: BLAD_ODCZYTU_TEXT };
  }

  const odcinki = params.odcinki ?? [];
  const czynniki = params.czynniki ?? [];
  if (odcinki.length === 0) {
    // Zapytanie przeszło, ale treści nie ma. To jest stan „migracja treści
    // niewklejona", nie „zawodnik nic nie ma".
    return { stan: 'brak_tabel', powod: BRAK_TABEL_TEXT };
  }

  const dostep = dostepMapy(params.accountState);
  if (!dostep.odcinek) {
    return { stan: 'bez_odcinka', powod: dostep.powod, odcinki };
  }

  const wybor = wybierzOdcinek(params.birthYear, odcinki, params.teraz ?? new Date());
  if (wybor.stan === 'nie_wiem') {
    return {
      stan: 'bez_odcinka',
      powod: `Nie wiem, który odcinek jest Twój (${wybor.powod}). Całą mapę możesz czytać bez tego.`,
      odcinki,
    };
  }

  const wariant = wybierzWariant({
    exitAktywny: params.exitAktywny,
    swiadekDeselekcji: params.swiadekDeselekcji,
  });

  return {
    stan: 'gotowa',
    widok: zbudujOdcinek(wybor.odcinek, wariant, czynniki),
    odcinki,
    przyblizenie: wybor.stan === 'przyblizony' ? wybor.powod : null,
  };
}

// ─────────────────────────────────────────────────────────────────────
// 7. ETYKIETY WIDOCZNE DLA ZAWODNIKA
// ─────────────────────────────────────────────────────────────────────
// Brzmienia z `claude/TRESC_MAPY_DROGI_11_08_2026.md`, przyjęte przez Kubę.
// Nagłówki sekcji NIE są treścią czynników — treść siedzi w bazie.

export const MAPA_TITLE = 'Moja droga';
export const MAPA_ENTRY_LABEL = 'Moja droga';
export const SEKCJA_JUTRO = 'Jedna rzecz do zrobienia jutro';
export const SEKCJA_W_RECE = 'Co jest w Twoich rękach';
export const SEKCJA_TLO = 'Co jest tłem';

/**
 * Podpis sekcji „tło". To jest jedyne zdanie na tym ekranie, które produkt
 * mówi od siebie — i jest tu, bo bez niego trzecia sekcja czyta się jak lista
 * wymówek zamiast jak zdjęcie ciężaru.
 */
export const SEKCJA_TLO_PODPIS = 'Te rzeczy nie zależą od Ciebie. Są tu po to, żebyś nie brał ich na siebie.';

export const MAPA_ENTRY_HINT_DOSTEPNA = 'Cztery odcinki, siedemnaście rzeczy, które naprawdę robią różnicę';
export const MAPA_ENTRY_HINT_BEZ_ODCINKA = 'Możesz czytać całą mapę — Twój odcinek pokażemy później';

export const SILA_DOWODU_LABEL: Record<SilaDowodu, string> = {
  najwyzsza: 'Najmocniejszy dowód',
  wysoka: 'Mocny dowód',
  srednia: 'Średni dowód',
  posrednia: 'Dowód pośredni',
  brak: 'Bez dowodu podłużnego',
};

/** „12–13 lat" — bez skracania, bez myślnika ASCII. */
export function zakresWieku(s: RoadSegment): string {
  return `${s.age_from}–${s.age_to} lat`;
}
