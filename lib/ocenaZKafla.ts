// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-O1 08.2026 (17.08.2026) — NOWY PLIK. „JAK POSZŁO" NA KAFLU W DNIU.
//
//   npx tsx lib/pytanieOWystapienie.selftest.ts   (strażnik tego pliku mieszka tam)
//   albo razem z resztą: node tests/run-selftests.mjs
//
// Ten plik odpowiada na JEDNO pytanie: CO ZAWODNIK MOŻE POWIEDZIEĆ O POZYCJI
// W DNIU I CO Z TEJ ODPOWIEDZI POWSTAJE W BAZIE.
// Zero Reacta, zero Supabase, zero zegara — wszystko wchodzi argumentem.
//
// ── ⛔ POMIAR, KTÓRY GO UZASADNIA (17.08.2026, produkcja kqrbztsvepjtggjmmcdx)
//   `session_verdicts`                                    1 wiersz
//   `daily_logs`                                         10 wierszy
//   `daily_logs` z `calendar_event_id`                    ⛔ 0 z 10
//   `daily_logs.data_sources` użyte gdziekolwiek w kodzie ⛔ 0 miejsc
//   `pain_entries`                                        1 wiersz
//   wydarzeń przeszłych bez werdyktu                      7, u 1 zawodnika
//
// ⚠️ PIERWSZE ZDANIE POLECENIA O1 („`session_verdicts` ma DZIŚ ZERO WIERSZY")
// BYŁO PRAWDZIWE RANO I PRZESTAŁO BYĆ PRAWDZIWE PRZED STARTEM TEGO PASA.
// Pierwszy werdykt w historii produktu powstał 17.08.2026 o 13:00:45 UTC,
// `origin='player'`, wartość `odbylo_sie`, wydarzenie 33. ⭐ Zapisała go
// ŚCIEŻKA PASA D2 — czyli pytanie „ZROBIŁEŚ?" z karty „Dziś". To NIE unieważnia
// tego pasa, tylko przesuwa jego sedno: droga zapisu DZIAŁA, a nie ma po niej
// ani czasu trwania, ani RPE, ani bólu, ani powodu nieobecności — i wpis
// w Dzienniku nadal nie wskazuje wydarzenia (0 z 10).
//
// ── ⭐ DZIESIĘĆ DECYZJI KUBY, KTÓRE SĄ KSZTAŁTEM TEGO PLIKU (17.08.2026) ──
//  D1 ocena należy do KAFLA W DNIU i nie ma drugiego miejsca;
//  D2 cztery kroki, z których PIERWSZY SAM WYSTARCZA, a 2–4 są zwinięte;
//  D3 ⛔ RPE NIGDY nie jest podpowiedziane, czas trwania — tak;
//  D4 `data_sources` wypełniane przy KAŻDEJ wartości;
//  D5 wpis po treningu WSKAZUJE WYDARZENIE;
//  D6 trzy rodzaje pozycji, rozpoznawane z DANYCH, nie z listy nazw;
//  D7 podział powodów mieszka TU, w jednym miejscu, i ma TRZY wartości;
//  D8 ⛔ nic nie odejmuje dorobku;
//  D9 werdykt można ZMIENIĆ — ślad stawia wyzwalacz, nie ten plik;
//  D10 zapis idzie klientem zalogowanego zawodnika, przez RLS.
//
// ── ⛔ CZEGO TU NIE MA I NIE PRZEZ PRZEOCZENIE ──────────────────────
// 1. ⛔ ZDANIA O WYSTARCZALNOŚCI WOBEC CELU. Ten plik rozstrzyga wyłącznie
//    „czy ten powód liczy się przeciwko zawodnikowi" (D7). Zdanie „to za mało,
//    żebyś doszedł tam, gdzie chcesz" (M1-a) to osobny pas i osobna decyzja.
// 2. ⛔ DRUGIEGO SILNIKA WERDYKTU. Kształt `WartoscWerdyktu` i cała reguła
//    „co wiemy o tym wystąpieniu" stoją w `lib/wykonanieSesji.ts` (pas D1)
//    i ten plik ich NIE DOTYKA — pas L1 na nich stoi.
// 3. ⛔ TRZECIEJ WARTOŚCI WERDYKTU. Makieta MK3 rysuje przy „jak poszło" trzy
//    przyciski: „Odbyło się · Skróciłem · Nie odbyło się". `CHECK`
//    `session_verdicts_verdict_enum` dopuszcza DWIE wartości, a §0 polecenia
//    O1 zabrania ruszać kształt typu werdyktu. „Skróciłem" nie ma więc gdzie
//    się zapisać i tego pasa nie ma. ⚠️ To jest ROZJAZD Z MAKIETĄ, nazwany
//    w nocie — nie przeoczenie. Jego naturalny nośnik już istnieje i jest nim
//    `duration_minutes` KRÓTSZY OD PODPOWIEDZI: skrócenie jest LICZBĄ, nie
//    trzecim werdyktem.
// 4. ⛔ ARYTMETYKI NA DNIACH. Nie da się stąd policzyć serii ani przerwy (N1).
// ═══════════════════════════════════════════════════════════════════

import { czyZnanyRodzaj, opiszRodzaj } from './meczWKalendarzu';
import type { WartoscWerdyktu } from './wykonanieSesji';

// ═══════════════════════════════════════════════════════════════════
// 0. ⛔ PUNKT WPIĘCIA MUTACJI — WYŁĄCZNIE DLA STRAŻNIKA
// ═══════════════════════════════════════════════════════════════════

/**
 * ⛔ PRODUKCYJNY WOŁAJĄCY NIE PODAJE TEGO ARGUMENTU. Ten sam wzorzec, co
 * `ZasadyWykonania` (pas D1) i `ZasadyPytan` (pas D2): mutacja strażnika nie
 * ma wtedy żadnej drogi na ekran zawodnika, a „cofnięcie" mutacji jest
 * STRUKTURALNE — nie ma czego cofać, bo nic nie zostało zmienione.
 */
export type ZasadyOceny = {
  /** ⭐ D3. Czy RPE zostaje BEZ wartości. ⛔ `false` = produkt podpowiada RPE. */
  rpeBezPodpowiedzi: boolean;
  /** ⭐ D3, strona odwrotna. Czy czas trwania MA podpowiedź. ⛔ `false` = nie ma. */
  czasMaPodpowiedz: boolean;
  /** ⭐ D4. Czy każda wartość zapisuje swoje źródło. ⛔ `false` = `data_sources` puste. */
  zrodloPrzyKazdejWartosci: boolean;
  /** ⭐ D5. Czy wpis wskazuje wydarzenie. ⛔ `false` = `calendar_event_id` znika. */
  wpisWskazujeWydarzenie: boolean;
  /** ⭐ D6. Czy zobowiązania nie da się usunąć. ⛔ `false` = da się usunąć wszystko. */
  zobowiazaniaNieUsuwalne: boolean;
  /** ⭐ D7. Czy brak powodu to TRZECIA wartość. ⛔ `false` = brak liczy się jak „inny". */
  brakPowoduToNieWiemy: boolean;
};

export const ZASADY_PRAWDZIWE_OCENY: ZasadyOceny = {
  rpeBezPodpowiedzi: true,
  czasMaPodpowiedz: true,
  zrodloPrzyKazdejWartosci: true,
  wpisWskazujeWydarzenie: true,
  zobowiazaniaNieUsuwalne: true,
  brakPowoduToNieWiemy: true,
};

// ═══════════════════════════════════════════════════════════════════
// 1. ⭐ D6 — TRZY RODZAJE POZYCJI, ROZPOZNAWANE Z DANYCH
// ═══════════════════════════════════════════════════════════════════
//
// ⛔ O84: LISTA NAZW ZESTARZEJE SIĘ PRZY PIERWSZYM NOWYM RODZAJU WYDARZENIA.
// Dlatego rozpoznanie NIE zaczyna się od `event_type` — zaczyna się od pytania
// KOGO TA POZYCJA WIĄŻE, a to widać w kolumnach, które istnieją niezależnie od
// tego, ile rodzajów przybędzie: `coach_session_id`, `source`, obecność wiersza
// w kalendarzu. `event_type` wchodzi DOPIERO po sprawdzeniu, czy w ogóle jest
// znany — a rodzaj nieznany kończy się JAWNYM „nie wiem", nie cichym wpadnięciem
// do „własnej pracy" (bo tamto pozwala usuwać).

export type RodzajPozycji =
  /** trening klubowy, mecz — wiąże KOGOŚ POZA zawodnikiem */
  | 'zobowiazanie'
  /** własny trening, sesja Bloku, zadanie zawodnika — wiąże wyłącznie jego */
  | 'wlasna_praca'
  /** ankieta, wgląd — prosi o to PRODUKT, nikt inny nie jest związany */
  | 'rzecz_produktu';

/**
 * Fakty o pozycji w dniu — ⛔ WYŁĄCZNIE KOLUMNY, ZERO TYTUŁU.
 * Tytuł jest napisem zawodnika i nie ma prawa rozstrzygać o tym, czy coś da
 * się usunąć: „Trening klubowy" wpisany ręcznie w tytuł własnego treningu
 * zamieniłby własną pracę w zobowiązanie.
 */
export type FaktyPozycji = {
  /** `calendar_events.id` albo `null` — `null` znaczy „nie ma wiersza w kalendarzu". */
  idWydarzenia: number | null;
  /** `calendar_events.event_type` albo `null`. */
  eventType: string | null;
  /** `calendar_events.source` albo `null`. */
  source: string | null;
  /** `calendar_events.coach_session_id is not null`. */
  maSesjeTrenera: boolean;
};

export type RozpoznanieRodzaju =
  | { znany: true; rodzaj: RodzajPozycji; przeslanka: string }
  | { znany: false; powod: string };

/**
 * ⭐ Rodzaje wydarzeń, których wykonanie WIĄŻE KOGOŚ POZA ZAWODNIKIEM.
 * ⚠️ To NIE jest lista nazw z ekranu — to podzbiór `chk_calendar_events_event_type`,
 * czyli wartości, które baza już zna. Rodzaj SPOZA tej enumeracji nie wpada tu
 * po cichu: `rozpoznajRodzajPozycji` odcina go wcześniej stanem „nie wiem".
 */
const RODZAJE_WIAZACE_KOGOS_INNEGO: readonly string[] = ['club_training', 'match'];

/** ⭐ Rodzaje, które zawodnik wykonuje sam i o których sam decyduje. */
const RODZAJE_WLASNEJ_PRACY: readonly string[] = ['own_training', 'micro_session', 'task'];

/**
 * ⭐ CO TO ZA POZYCJA — i czy wolno ją usunąć.
 *
 * KOLEJNOŚĆ JEST TREŚCIĄ:
 *  1. brak wiersza w kalendarzu → RZECZ PRODUKTU. Ankieta i wgląd nie są
 *     wydarzeniami; produkt sam je stawia w dniu i sam je zdejmuje.
 *  2. sesja trenera → ZOBOWIĄZANIE. Kolumna `coach_session_id` istnieje
 *     niezależnie od tego, ile rodzajów wydarzeń przybędzie.
 *  3. `source='coach'` → ZOBOWIĄZANIE. Pozycję wstawił ktoś inny.
 *  4. ⛔ RODZAJ NIEZNANY → „NIE WIEM". Tu i tylko tu O84 ma zęby: nowy rodzaj
 *     wydarzenia NIE dostaje ścieżki usunięcia z rozpędu.
 *  5. rodzaj wiążący kogoś innego → ZOBOWIĄZANIE.
 *  6. rodzaj własnej pracy → WŁASNA PRACA.
 *  7. ⛔ ŹRÓDŁO NIEZNANE → „NIE WIEM". Ta gałąź jest nieosiągalna dla trzech
 *     wartości z CHECK-a i ma zostać nieosiągalna — jest tu po to, żeby
 *     czwarta wartość `source` nie przeszła niezauważona.
 */
export function rozpoznajRodzajPozycji(f: FaktyPozycji): RozpoznanieRodzaju {
  if (f.idWydarzenia === null || !Number.isFinite(f.idWydarzenia)) {
    return {
      znany: true,
      rodzaj: 'rzecz_produktu',
      przeslanka: 'pozycja nie ma wiersza w kalendarzu — postawił ją produkt',
    };
  }
  if (f.maSesjeTrenera === true) {
    return { znany: true, rodzaj: 'zobowiazanie', przeslanka: 'pozycja ma sesję trenera' };
  }
  if (f.source === 'coach') {
    return { znany: true, rodzaj: 'zobowiazanie', przeslanka: 'pozycję wstawił ktoś inny (source=coach)' };
  }

  const rodzaj = opiszRodzaj(f.eventType);
  if (!rodzaj.znany) {
    return {
      znany: false,
      powod: `nie znam rodzaju wydarzenia „${rodzaj.surowy}" — nie wiem, kogo ta pozycja wiąże`,
    };
  }
  if (RODZAJE_WIAZACE_KOGOS_INNEGO.includes(rodzaj.id)) {
    return { znany: true, rodzaj: 'zobowiazanie', przeslanka: `rodzaj ${rodzaj.id} wiąże kogoś poza zawodnikiem` };
  }
  if (RODZAJE_WLASNEJ_PRACY.includes(rodzaj.id)) {
    return { znany: true, rodzaj: 'wlasna_praca', przeslanka: `rodzaj ${rodzaj.id} wiąże wyłącznie zawodnika` };
  }
  return {
    znany: false,
    powod: `rodzaj ${rodzaj.id} jest w CHECK-u bazy, ale nie ma przypisanego rodzaju pozycji`,
  };
}

export type SciezkaUsuniecia =
  | { jest: true }
  | { jest: false; powod: string };

/**
 * ⭐ CZY POZYCJĘ DA SIĘ USUNĄĆ. ⛔ Jedyne miejsce, które to rozstrzyga.
 *
 * ⛔ „NIE WIEM" ZACHOWUJE SIĘ JAK ZOBOWIĄZANIE, a nie jak własna praca —
 * bo z dwóch możliwych pomyłek ta druga jest nieodwracalna. Pozycja, której
 * rodzaju nie znamy, ma zostać w kalendarzu do czasu, aż ktoś ten rodzaj nazwie.
 */
export function sciezkaUsuniecia(
  r: RozpoznanieRodzaju,
  zasady: ZasadyOceny = ZASADY_PRAWDZIWE_OCENY,
): SciezkaUsuniecia {
  if (!zasady.zobowiazaniaNieUsuwalne) return { jest: true };
  if (!r.znany) return { jest: false, powod: r.powod };
  if (r.rodzaj === 'wlasna_praca') return { jest: true };
  if (r.rodzaj === 'zobowiazanie') {
    return { jest: false, powod: 'to jest zobowiązanie — nieobecność zapisuje się powodem, nie usunięciem' };
  }
  return { jest: false, powod: 'to jest rzecz produktu — wygasa sama' };
}

/**
 * ⭐ CZY TĘ POZYCJĘ W OGÓLE SIĘ OCENIA. Rzeczy produktu — nie (D6).
 * ⛔ Pozycja o nieznanym rodzaju TEŻ NIE: nie wiemy, czy pytanie „zrobiłeś?"
 * jest o niej prawdziwe, a pytanie o rzecz, której nie umiemy nazwać, jest
 * pytaniem, na które nie da się odpowiedzieć sensownie.
 */
export function czyOceniamy(r: RozpoznanieRodzaju): boolean {
  return r.znany && r.rodzaj !== 'rzecz_produktu';
}

// ═══════════════════════════════════════════════════════════════════
// 2. ⭐ D7 — POWÓD NIEOBECNOŚCI. TRZY WARTOŚCI, NIE DWIE
// ═══════════════════════════════════════════════════════════════════
//
// ⚠️ ZBIÓR PRZEPISANY Z BAZY, Z DATĄ I ŹRÓDŁEM (R4). Zapytanie z 17.08.2026,
// projekt kqrbztsvepjtggjmmcdx:
//   select conname, pg_get_constraintdef(oid) from pg_constraint
//    where conrelid='public.session_verdicts'::regclass and contype='c';
// Wynik, co do znaku:
//   session_verdicts_absence_reason_enum
//     CHECK (absence_reason IS NULL OR absence_reason = ANY (ARRAY[
//       'kontuzja','choroba','szkola','rodzina','inny','nie_podam']))
//
// ⭐ SZÓSTY POWÓD DOŁOŻONY 18.08.2026 — decyzja Kuby. CHECK rozszerzony na
// produkcji tego samego dnia i sprawdzony wykonaniem jego własnego wyrażenia:
// przyjmuje 'nie_podam', ⛔ odrzuca 'nie podam' (ze spacją) i 'szkoła'.
//   session_verdicts_powod_tylko_przy_nieodbyciu
//     CHECK (absence_reason IS NULL OR verdict = 'nie_odbylo_sie')
//
// ⛔ `szkola` BEZ POLSKICH ZNAKÓW — tak stoi w CHECK-u. Skrót albo „poprawka"
// ortograficzna przy przepisywaniu do kodu nie rzuca błędem: po cichu rozjeżdża
// dopasowanie i baza odrzuca wiersz kodem `23514` dopiero u zawodnika.

// ⛔ `nie_podam` z PODKREŚLNIKIEM, nie ze spacją — tak stoi w CHECK-u.
export const POWODY_NIEOBECNOSCI =
  ['kontuzja', 'choroba', 'szkola', 'rodzina', 'inny', 'nie_podam'] as const;
export type PowodNieobecnosci = (typeof POWODY_NIEOBECNOSCI)[number];

/**
 * ⭐ TRZY WARTOŚCI I TRZECIA NIE JEST OZDOBĄ (R5).
 *
 *   `nie_liczy_sie` — powód, który NIE LICZY SIĘ PRZECIWKO ZAWODNIKOWI.
 *   `liczy_sie`     — powód, który się liczy.
 *   `nie_wiemy`     — ⛔ NIE „bez powodu". Zawodnik nie musiał go podać
 *                     i milczenie nie jest oświadczeniem o niczym.
 */
export type WagaPowodu = 'nie_liczy_sie' | 'liczy_sie' | 'nie_wiemy';

export type RozstrzygnieciePowodu = {
  waga: WagaPowodu;
  /** ⛔ OBOWIĄZKOWY także przy `nie_wiemy` — inaczej za miesiąc nikt nie odtworzy dlaczego. */
  powod: string;
};

/** ⭐ POWODY ZDROWOTNE — jedyny podzbiór, który ma uzasadnienie POZA decyzją produktową. */
const POWODY_ZDROWOTNE: readonly string[] = ['kontuzja', 'choroba'];

/**
 * ⭐ POWODY, KTÓRE TEŻ NIE LICZĄ SIĘ PRZECIWKO ZAWODNIKOWI — DECYZJA PRODUKTOWA
 * KUBY z 17.08.2026, ⛔ NIE wynik badania (O48: zakaz szerszy niż jego dowód
 * podpisuje się nazwiskiem, nie liczbą). Piętnastolatek nie decyduje o tym,
 * czy ma sprawdzian ani czy rodzina jedzie w odwiedziny.
 */
const POWODY_NIEZALEZNE_OD_ZAWODNIKA: readonly string[] = ['szkola', 'rodzina'];

/**
 * ⭐ CZY TEN POWÓD LICZY SIĘ PRZECIWKO ZAWODNIKOWI.
 *
 * ⛔ TO JEST CAŁE ROZSTRZYGNIĘCIE TEGO PASA I NIC WIĘCEJ. Zdanie o tym, czy
 * zawodnik robi wystarczająco dużo wobec swojego celu, jest osobnym pasem
 * i osobną decyzją — tu nie ma ani progu, ani wagi, ani liczby dni.
 *
 * ⚠️ ASERCJE W CIELE, nie tylko w strażniku: funkcja czysta, którą ktoś kiedyś
 * zawoła z wartością spoza CHECK-a, ma się o to potknąć głośno.
 */
export function rozstrzygnijPowod(
  wartosc: string | null | undefined,
  zasady: ZasadyOceny = ZASADY_PRAWDZIWE_OCENY,
): RozstrzygnieciePowodu {
  if (wartosc === null || wartosc === undefined || wartosc === '') {
    if (!zasady.brakPowoduToNieWiemy) {
      return { waga: 'liczy_sie', powod: 'brak powodu potraktowany jak „inny"' };
    }
    return { waga: 'nie_wiemy', powod: 'zawodnik nie podał powodu — i nie musiał' };
  }
  if (POWODY_ZDROWOTNE.includes(wartosc)) {
    return { waga: 'nie_liczy_sie', powod: `powód zdrowotny (${wartosc})` };
  }
  if (POWODY_NIEZALEZNE_OD_ZAWODNIKA.includes(wartosc)) {
    return { waga: 'nie_liczy_sie', powod: `powód niezależny od zawodnika (${wartosc}) — decyzja produktowa` };
  }
  if (wartosc === 'inny') {
    return { waga: 'liczy_sie', powod: 'powód inny niż zdrowotny i niezależny' };
  }
  // ⭐⛔ „NIE PODAM" — DECYZJA KUBY 18.08.2026, I TO NIE JEST TO SAMO CO MILCZENIE.
  //
  // Milczenie (`null`) znaczy „nie zapytaliśmy albo zawodnik przewinął dalej".
  // `nie_podam` znaczy „ZAPYTALIŚMY, a zawodnik świadomie odmówił odpowiedzi".
  // To są dwa różne fakty o zawodniku i baza je od 18.08 rozróżnia.
  //
  // ⛔ DLACZEGO `nie_wiemy`, A NIE `nie_liczy_sie` ANI `liczy_sie`:
  //   • `liczy_sie` policzyłoby odmowę PRZECIWKO zawodnikowi — czyli produkt
  //     karałby go za skorzystanie z przycisku, który sam mu podstawił.
  //     Przycisk, który kosztuje, przestaje być wyjściem i staje się pułapką.
  //   • `nie_liczy_sie` twierdziłoby, że powód był od niego niezależny —
  //     a tego NIE WIEMY. To byłoby podanie prawdopodobnego jako pewnego (Z0).
  // Jedyne prawdziwe zdanie brzmi: zapytaliśmy, nie wiemy. Trzecia wartość (R5)
  // jest tu nie ozdobą, tylko jedyną uczciwą odpowiedzią.
  if (wartosc === 'nie_podam') {
    return { waga: 'nie_wiemy', powod: 'zawodnik świadomie nie podał powodu — i miał do tego prawo' };
  }
  // ⛔ WARTOŚĆ SPOZA CHECK-A. Nie zgadujemy i nie wpadamy do „liczy się":
  // baza jej nie przepuści, więc jedyne, co możemy tu prawdziwie powiedzieć,
  // to że jej nie znamy.
  return { waga: 'nie_wiemy', powod: `nie znam powodu „${wartosc}" — jest spoza CHECK-a bazy` };
}

/** Czy wartość jest jednym z sześciu powodów, które baza przyjmie. */
export function czyZnanyPowod(w: unknown): w is PowodNieobecnosci {
  return typeof w === 'string' && (POWODY_NIEOBECNOSCI as readonly string[]).includes(w);
}

// ═══════════════════════════════════════════════════════════════════
// 3. ⭐ D2 i D3 — CZTERY KROKI, Z KTÓRYCH PIERWSZY SAM WYSTARCZA
// ═══════════════════════════════════════════════════════════════════

export type IdKroku = 'odbylo_sie' | 'czas_i_rpe' | 'bol' | 'powod';

export type Krok = {
  id: IdKroku;
  /** ⛔ Tylko pierwszy. Reszta jest opcjonalna i to jest cała decyzja D2. */
  obowiazkowy: boolean;
  /** Czy krok ma się w ogóle pokazać przy tej odpowiedzi. */
  widoczny: boolean;
  /** ⭐ Zwinięty = zawodnik musi go rozwinąć. Lepszy jeden werdykt bez RPE
   *  niż trzy pola bez ani jednej odpowiedzi. */
  zwiniety: boolean;
};

/**
 * ⭐ KTÓRE KROKI SĄ DZIŚ NA EKRANIE.
 *
 *  • przed odpowiedzią — WYŁĄCZNIE krok 1. ⛔ Nie pokazujemy pól, których
 *    zawodnik jeszcze nie ma po co widzieć: to jest cała różnica między
 *    ekranem, na który się odpowiada, a formularzem, który się porzuca.
 *  • po „tak"  — krok 2 (czas i RPE) i krok 3 (ból), oba ZWINIĘTE.
 *  • po „nie"  — krok 4 (powód) i krok 3 (ból), oba ZWINIĘTE.
 *    ⛔ Krok 2 znika: pytanie o RPE sesji, której nie było, nie ma treści.
 */
export function krokiOceny(werdykt: WartoscWerdyktu | null): readonly Krok[] {
  const odbyloSie = werdykt === 'odbylo_sie';
  const nieOdbyloSie = werdykt === 'nie_odbylo_sie';
  return [
    { id: 'odbylo_sie', obowiazkowy: true, widoczny: true, zwiniety: false },
    { id: 'czas_i_rpe', obowiazkowy: false, widoczny: odbyloSie, zwiniety: true },
    { id: 'bol', obowiazkowy: false, widoczny: odbyloSie || nieOdbyloSie, zwiniety: true },
    { id: 'powod', obowiazkowy: false, widoczny: nieOdbyloSie, zwiniety: true },
  ];
}

/**
 * ⭐⛔ D3 — RPE NIGDY NIE JEST PODPOWIEDZIANE, I TO JEST TWIERDZENIE O POMIARZE,
 * NIE O ESTETYCE.
 *
 * RPE mierzy WYŁĄCZNIE subiektywny stan zawodnika. Nie ma zewnętrznej prawdy,
 * z którą dałoby się je porównać — więc wartość podpowiedziana nie jest punktem
 * odniesienia, tylko STAJE SIĘ pomiarem. Produkt zmierzyłby wtedy własny plan
 * zamiast zawodnika i nie miałby jak tego zauważyć, bo liczby wyglądałyby
 * dokładnie tak samo.
 *
 * ⛔ ŻADNEGO SUWAKA. Suwak ma uchwyt, a uchwyt stoi gdzieś — i to „gdzieś" jest
 * podpowiedzią, choćby nikt jej tak nie nazwał. Dziesięć przycisków, ani jeden
 * zaznaczony.
 */
export const RPE_WARTOSCI = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type WartoscRpe = (typeof RPE_WARTOSCI)[number];

/**
 * ⛔ STAN POCZĄTKOWY RPE. Zwraca `null` i ma zwracać `null` — funkcja istnieje
 * po to, żeby dało się to sprawdzić URUCHOMIENIOWO, a nie tylko przeczytać
 * w komentarzu (O88: sprawdzamy po TREŚCI, nie po nazwie stałej).
 */
export function rpePoczatkowe(zasady: ZasadyOceny = ZASADY_PRAWDZIWE_OCENY): WartoscRpe | null {
  if (!zasady.rpeBezPodpowiedzi) return 5;
  return null;
}

export type PodpowiedzCzasu =
  | { jest: true; minuty: number; zrodlo: 'plan' }
  | { jest: false; powod: string };

/**
 * ⭐ CZAS TRWANIA PODPOWIADAMY — I TO JEST DRUGA POŁOWA D3, NIE WYJĄTEK OD NIEJ.
 *
 * Czas trwania jest FAKTEM ZEWNĘTRZNYM: zawodnik zna go niezależnie od tego,
 * co produkt napisze, i umie poprawić podpowiedź, bo ma z czym ją porównać.
 * RPE nie ma takiego punktu odniesienia — i cała różnica siedzi dokładnie tutaj.
 *
 * ⚠️ `minutyZPlanu` przychodzi z pozycji (sesja Bloku zna swoją długość).
 * `null` znaczy „plan nie mówi, ile to trwa" — wtedy podpowiedzi NIE MA
 * i pole zostaje puste. ⛔ Nigdy wypełniacz „60".
 */
export function podpowiedzCzasu(
  minutyZPlanu: number | null,
  zasady: ZasadyOceny = ZASADY_PRAWDZIWE_OCENY,
): PodpowiedzCzasu {
  if (!zasady.czasMaPodpowiedz) {
    return { jest: false, powod: 'podpowiedź czasu wyłączona' };
  }
  if (minutyZPlanu === null || !Number.isFinite(minutyZPlanu)) {
    return { jest: false, powod: 'plan nie podaje, ile ta pozycja trwa' };
  }
  if (minutyZPlanu <= 0 || minutyZPlanu > MAKS_MINUT) {
    return { jest: false, powod: `plan podaje ${minutyZPlanu} min — poza zakresem, którego baza nie przyjmie` };
  }
  return { jest: true, minuty: Math.round(minutyZPlanu), zrodlo: 'plan' };
}

/**
 * ⚠️ GRANICE PRZEPISANE Z BAZY, Z DATĄ I ŹRÓDŁEM (R4). `chk_daily_logs_payload_ranges`,
 * odczytane 17.08.2026: `rpe` 0–10, `post_fatigue` 0–10, `duration_minutes` 0–360.
 * ⛔ Zapadka na RÓWNOŚĆ z bazą stoi w strażniku — te liczby mają dwa domy
 * i rozjazd między nimi kończy się kodem `23514` u zawodnika.
 */
export const MAKS_MINUT = 360;
export const MAKS_RPE = 10;

// ═══════════════════════════════════════════════════════════════════
// 4. ⭐ D4 — KAŻDA WARTOŚĆ ZAPISUJE, SKĄD POCHODZI
// ═══════════════════════════════════════════════════════════════════
//
// ⛔ BEZ TEGO PRODUKT PO ROKU NIE ODRÓŻNI WŁASNYCH PROPOZYCJI OD ODPOWIEDZI
// ZAWODNIKA (Z0) — a gdyby podpowiadanie psuło pomiar, NIE DAŁOBY SIĘ TEGO
// POLICZYĆ, TYLKO PODEJRZEWAĆ. Kolumna `daily_logs.data_sources` istnieje od
// dawna i 17.08.2026 nie była używana w kodzie ANI RAZU (zmierzone `grep`em).

export type ZrodloWartosci = 'zawodnik' | 'plan';

export type WartoscZeZrodlem = {
  klucz: string;
  liczba: number;
  zrodlo: ZrodloWartosci;
};

export type PayloadZeZrodlami = {
  payload: Record<string, number>;
  data_sources: Record<string, ZrodloWartosci>;
};

/**
 * ⭐ BUDUJE OBA OBIEKTY NARAZ — i to jest cała obrona D4.
 *
 * ⛔ Nie ma tu drogi, którą wartość weszłaby do `payload` bez wpisu
 * w `data_sources`: obie mapy powstają w JEDNEJ pętli, z JEDNEJ listy.
 * Strażnik pilnuje tego zapadką NA RÓWNOŚĆ liczby kluczy — zapadka na „≥"
 * przepuściłaby dokładnie ten defekt, przed którym stoi.
 *
 * ⚠️ Wartości nieliczbowe i spoza zakresu bazy NIE WCHODZĄ — ani do jednej
 * mapy, ani do drugiej. Wiersz odrzucony przez `chk_daily_logs_payload_ranges`
 * zabrałby ze sobą także te wartości, które były poprawne.
 */
export function zbudujPayloadIZrodla(
  wartosci: readonly WartoscZeZrodlem[],
  zasady: ZasadyOceny = ZASADY_PRAWDZIWE_OCENY,
): PayloadZeZrodlami {
  const payload: Record<string, number> = {};
  const data_sources: Record<string, ZrodloWartosci> = {};
  for (const w of wartosci) {
    if (!w || typeof w.klucz !== 'string' || w.klucz === '') continue;
    if (typeof w.liczba !== 'number' || !Number.isFinite(w.liczba)) continue;
    if (!granicaZachowana(w.klucz, w.liczba)) continue;
    payload[w.klucz] = w.liczba;
    if (zasady.zrodloPrzyKazdejWartosci) data_sources[w.klucz] = w.zrodlo;
  }
  return { payload, data_sources };
}

function granicaZachowana(klucz: string, liczba: number): boolean {
  if (klucz === 'duration_minutes') return liczba >= 0 && liczba <= MAKS_MINUT;
  if (klucz === 'rpe' || klucz === 'post_fatigue') return liczba >= 0 && liczba <= MAKS_RPE;
  return false;
}

/**
 * ⭐ Ile wartości zostało bez wpisu o źródle. ⛔ Ma być ZERO i jest to
 * sprawdzane URUCHOMIENIOWO, nie deklarowane.
 */
export function wartosciBezZrodla(p: PayloadZeZrodlami): readonly string[] {
  return Object.keys(p.payload).filter((k) => p.data_sources[k] === undefined).sort();
}

// ═══════════════════════════════════════════════════════════════════
// 5. ⭐ D5, D9, D10 — WIERSZE, KTÓRE POWSTAJĄ Z DOTKNIĘCIA
// ═══════════════════════════════════════════════════════════════════

/**
 * Wiersz `session_verdicts` w kształcie, w jakim idzie do `upsert`-a.
 *
 * ⛔ NIE MA TU `previous_verdict` ANI `changed_at` I NIE PRZEZ PRZEOCZENIE (D9).
 * Ślad zmiany zdania stawia wyzwalacz `session_verdicts_pilnuj` w bazie —
 * odczytany 17.08.2026: przy zmianie `verdict` sam wpisuje `previous_verdict`
 * i `now()`. Drugi mechanizm śladu rozjechałby się z pierwszym, a polityka RLS
 * `session_verdicts_insert_own` wprost ZABRANIA wstawiania wiersza z historią.
 *
 * ⭐ `absence_reason` JEST TU ZAWSZE, także jako `null` — i to jest obrona
 * przed CHECK-iem `session_verdicts_powod_tylko_przy_nieodbyciu`. Gdyby pole
 * było pomijane przy „odbyło się", `upsert` zostawiłby powód z poprzedniej
 * odpowiedzi „nie odbyło się" i baza odrzuciłaby zmianę zdania kodem `23514` —
 * zawodnik zobaczyłby błąd przy ruchu, który jest jego prawem (D9).
 */
export type WierszWerdyktu = {
  user_id: string;
  calendar_event_id: number;
  occurred_on: string;
  verdict: WartoscWerdyktu;
  origin: 'player';
  withdrawn_at: null;
  absence_reason: PowodNieobecnosci | null;
};

/**
 * ⭐ `origin: 'player'` NA SZTYWNO — wymaga tego polityka RLS
 * (`with check (… and origin = 'player' …)`), więc każda inna wartość
 * skończyłaby się odmową, a nie innym zapisem.
 */
export function wierszWerdyktu(args: {
  idZawodnika: string;
  idWydarzenia: number;
  dzien: string;
  werdykt: WartoscWerdyktu;
  powod: PowodNieobecnosci | null;
}): WierszWerdyktu {
  // ⛔ POWÓD WOLNO ZAPISAĆ WYŁĄCZNIE PRZY „NIE ODBYŁO SIĘ". Ta jedna linia jest
  // całym CHECK-iem `session_verdicts_powod_tylko_przy_nieodbyciu`, przeniesionym
  // przed wysyłkę — żeby zawodnik dostał poprawny zapis, a nie komunikat bazy.
  const powod = args.werdykt === 'nie_odbylo_sie' && czyZnanyPowod(args.powod) ? args.powod : null;
  return {
    user_id: args.idZawodnika,
    calendar_event_id: args.idWydarzenia,
    occurred_on: args.dzien,
    verdict: args.werdykt,
    origin: 'player',
    withdrawn_at: null,
    absence_reason: powod,
  };
}

/**
 * Wiersz `daily_logs` — WPIS PO TRENINGU, KTÓRY WSKAZUJE WYDARZENIE (D5).
 *
 * ⛔ `calendar_event_id` JEST SEDNEM TEGO KSZTAŁTU. 17.08.2026 wpisów
 * wskazujących wydarzenie było 0 z 10 — i przez to licznik pracy nie umiał
 * powiązać wpisu z sesją, choć obie rzeczy leżały w tej samej bazie.
 */
export type WierszWpisuPoTreningu = {
  user_id: string;
  entry_type: 'post_training';
  session_type: string;
  calendar_event_id: number | null;
  payload: Record<string, number>;
  data_sources: Record<string, ZrodloWartosci>;
};

/**
 * ⚠️ `chk_session_type_matches_entry` (odczytane 17.08.2026) wymaga, żeby wpis
 * `post_training` MIAŁ `session_type`. Zbiór dopuszczalnych wartości
 * (`daily_logs_session_type_check`) to `club_training · own_training ·
 * micro_session · match · other` — czyli piątka rodzajów wydarzeń MINUS `task`
 * PLUS `other`.
 *
 * ⛔ RODZAJ, KTÓREGO NIE ZNAMY, IDZIE DO `other` I JEST TO ZAPISANE WPROST.
 * Alternatywą byłoby wysłać surową wartość i dostać `23514` — czyli zamienić
 * nieznany rodzaj w utraconą odpowiedź zawodnika.
 */
export function rodzajSesjiDoWpisu(eventType: string | null): string {
  if (!czyZnanyRodzaj(eventType)) return 'other';
  if (eventType === 'task') return 'other';
  return eventType;
}

export function wierszWpisuPoTreningu(args: {
  idZawodnika: string;
  idWydarzenia: number;
  eventType: string | null;
  wartosci: readonly WartoscZeZrodlem[];
}, zasady: ZasadyOceny = ZASADY_PRAWDZIWE_OCENY): WierszWpisuPoTreningu {
  const { payload, data_sources } = zbudujPayloadIZrodla(args.wartosci, zasady);
  return {
    user_id: args.idZawodnika,
    entry_type: 'post_training',
    session_type: rodzajSesjiDoWpisu(args.eventType),
    // ⛔ D5 — TU I TYLKO TU MUTACJA MOŻE ZERWAĆ WSKAZANIE. Produkcyjny
    // wołający drugiego argumentu nie podaje, więc na ekran nie ma jak wejść.
    calendar_event_id: zasady.wpisWskazujeWydarzenie ? args.idWydarzenia : null,
    payload,
    data_sources,
  };
}

/**
 * Wiersz `pain_entries`. ⚠️ Polityka `pain_entries_owner` (odczytana 17.08.2026)
 * wymaga, żeby wpis bólu WISIAŁ NA WPISIE DZIENNIKA albo na karcie meczu —
 * `daily_log_id` nie jest tu ozdobą, tylko warunkiem przyjęcia wiersza.
 * ⛔ Dlatego ból zapisuje się PO wpisie, nigdy zamiast niego.
 */
export type WierszBolu = {
  user_id: string;
  daily_log_id: number;
  body_location: string;
  side: string | null;
  intensity: number;
  excludes_from_training: boolean;
};

export function wierszBolu(args: {
  idZawodnika: string;
  idWpisu: number;
  miejsce: string;
  strona: string | null;
  natezenie: number;
  wykluczaZTreningu: boolean;
}): WierszBolu | null {
  if (typeof args.miejsce !== 'string' || args.miejsce.trim() === '') return null;
  if (!Number.isFinite(args.natezenie)) return null;
  const natezenie = Math.max(0, Math.min(MAKS_RPE, Math.round(args.natezenie)));
  return {
    user_id: args.idZawodnika,
    daily_log_id: args.idWpisu,
    body_location: args.miejsce.trim(),
    side: args.strona === null || args.strona === '' ? null : args.strona,
    intensity: natezenie,
    excludes_from_training: args.wykluczaZTreningu === true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 6. ⭐ D8 — NIC NIE ODEJMUJE DOROBKU
// ═══════════════════════════════════════════════════════════════════

export type JednostkiZOceny = {
  /** ⛔ NIGDY UJEMNE. Nieobecność daje ZERO, nie minus. */
  jednostki: number;
  powod: string;
};

/**
 * ⭐ ILE PRACY POWSTAŁO Z TEJ ODPOWIEDZI.
 *
 * ⛔ TRZY WYJŚCIA I ANI JEDNO NIE JEST UJEMNE — bo N1 nagradza WYKONANĄ PRACĘ,
 * a rzecz, której nie było, nie jest pracą ujemną. Jest zerem.
 * ⚠️ Ten pas ⛔ NIE DOTYKA `lib/nagrodaZaPrace.ts` (pas L1) i nie zna jego wag.
 * Oddaje LICZBĘ JEDNOSTEK, a nie punkty — wpięcie jej w dorobek należy do L1
 * albo do osobnego pasa, i jest to napisane wprost, żeby nie wyglądało na
 * przeoczenie.
 */
export function jednostkiZOceny(werdykt: WartoscWerdyktu | null): JednostkiZOceny {
  if (werdykt === null) {
    return { jednostki: 0, powod: 'brak odpowiedzi — nie ma z czego liczyć pracy' };
  }
  return JEDNOSTKI_ZA_WERDYKT[werdykt];
}

/**
 * ⛔ `Record`, A NIE `if/else`, I TO JEST CAŁA JEGO TREŚĆ. `if/else` bez
 * `default` przemilcza wartość, o której zapomniano, a `tsc` nie powie ani
 * słowa — dokładnie tak licznik pracy przemilczał piąty stan przed pasem K1.
 * `Record` wywali się na kontroli typów w tej samej sekundzie, w której ktoś
 * doda trzecią wartość werdyktu.
 */
const JEDNOSTKI_ZA_WERDYKT: Record<WartoscWerdyktu, JednostkiZOceny> = {
  odbylo_sie: { jednostki: 1, powod: 'zawodnik powiedział, że sesja się odbyła' },
  nie_odbylo_sie: { jednostki: 0, powod: 'sesja się nie odbyła — zero, nie minus' },
};

/**
 * ⭐ PIĄTA WARTOŚĆ `StanWykonania` (`odwolane`, pas K1) — CO Z NIĄ ROBI TEN MODUŁ.
 *
 * ⛔ NIC, I JEST TO SPRAWDZONE, A NIE ZAŁOŻONE (D7 pasa K1). `odwolane` jest
 * FAKTEM O PLANIE — pozycję zdjął z planu produkt albo zawodnik, a `calendar_events`
 * nie ma kolumny mówiącej, kto. Ten moduł zapisuje wyłącznie to, co zawodnik
 * MÓWI O SOBIE, czyli `WartoscWerdyktu`, i dlatego odwołanie nie ma tu żadnej
 * gałęzi. ⭐ Ta stała i funkcja niżej istnieją po to, żeby to zdanie dało się
 * URUCHOMIĆ, zamiast wierzyć komentarzowi, który zestarzeje się jak każdy inny.
 */
export const STAN_SPOZA_OCENY = 'odwolane';

/** Czy z tego stanu wykonania w ogóle powstaje odpowiedź zawodnika. */
export function stanNalezyDoOceny(stan: string): boolean {
  if (stan === STAN_SPOZA_OCENY) return false;
  return Object.prototype.hasOwnProperty.call(JEDNOSTKI_ZA_WERDYKT, stan);
}

// ═══════════════════════════════════════════════════════════════════
// 7. ⚠️ BRZMIENIA — DO PRZEJRZENIA PRZEZ KUBĘ
// ═══════════════════════════════════════════════════════════════════
//
// ⚠️ DO PRZEJRZENIA — O1. To są WSZYSTKIE nowe napisy tego pasa. Reszta —
// „Zrobione", „Nie odbyło się", „ZROBIŁEŚ?" — to stałe z pasów C1/D1/D2,
// użyte co do znaku. Trzecie słowo na to samo byłoby rozjazdem słownika.
//
// ⛔ CZEGO W TYCH NAPISACH NIE MA:
//   • pytania „dlaczego nie" — to konfrontacja (M1). Powód jest OFERTĄ,
//     nie warunkiem zapisu, i tak też brzmi;
//   • słów „seria", „passa", „z rzędu", „codziennie" (N1);
//   • pochwały za samo odpowiedzenie — nagradzamy PRACĘ, nie obecność (N1);
//   • porównania z kimkolwiek (N3);
//   • oceny odpowiedzi („szkoda", „nic straconego") — jedno ocenia, drugie kłamie.

/** ⚠️ DO PRZEJRZENIA — O1. Nagłówek kroku 2. */
export const KROK_CZAS_I_RPE = 'Ile trwało i jak ciężko było';
/** ⚠️ DO PRZEJRZENIA — O1. Podpis pola czasu. */
export const POLE_CZAS = 'Ile trwało';
/** ⚠️ DO PRZEJRZENIA — O1. Podpis pola RPE. ⛔ Bez liczby przykładowej w treści. */
export const POLE_RPE = 'Jak ciężko było';
/** ⚠️ DO PRZEJRZENIA — O1. Nagłówek kroku 3. */
export const KROK_BOL = 'Coś Cię boli?';
/** ⚠️ DO PRZEJRZENIA — O1. Nagłówek kroku 4 — ⛔ OFERTA, nie żądanie. */
export const KROK_POWOD = 'Powód — jeśli chcesz go podać';
/** ⚠️ DO PRZEJRZENIA — O1. Zdanie, które mówi, że reszta jest dobrowolna. */
export const RESZTA_DOBROWOLNA = 'Reszta jest dobrowolna — to, co powyżej, już się zapisało.';

/**
 * ⚠️ DO PRZEJRZENIA — O1. Sześć powodów, brzmienia dla zawodnika.
 *
 * ⭐ SZÓSTY DOŁOŻONY 18.08.2026 (decyzja Kuby). ⛔ Brzmienie jest CELOWO suche:
 * „Nie podam" nie przeprasza i nie tłumaczy się za zawodnika. Przycisk, który
 * każe się tłumaczyć z odmowy, przestaje być wyjściem.
 * ⚠️ Ten typ jest `Record<PowodNieobecnosci, …>` i to NIE jest formalność:
 * dopisanie powodu bez brzmienia przestaje się kompilować. Tak właśnie ten
 * brak został złapany — przez `tsc`, nie przez suitę.
 */
export const POWOD_NAPIS: Record<PowodNieobecnosci, string> = {
  kontuzja: 'Kontuzja',
  choroba: 'Choroba',
  szkola: 'Szkoła',
  rodzina: 'Rodzina',
  inny: 'Inny',
  nie_podam: 'Nie podam',
};

/** ⚠️ DO PRZEJRZENIA — O1. Zdanie przy pozycji, której nie da się usunąć. */
export const BEZ_USUNIECIA = 'Tego nie zdejmiesz z planu — jeśli Cię nie było, powiedz to wyżej.';

/** ⚠️ DO PRZEJRZENIA — O1. Przycisk dokładający szczegół do werdyktu, który już jest. */
export const ZAPISZ_SZCZEGOL = 'Dodaj do odpowiedzi';

/** ⚠️ DO PRZEJRZENIA — O1. Przycisk usunięcia własnej pracy z planu. */
export const ZDEJMIJ_Z_PLANU = 'Zdejmij z planu';

/**
 * ⚠️ DO PRZEJRZENIA — O1. Sześć długości do wyboru.
 *
 * ⛔ TO JEST DECYZJA PRODUKTOWA, NIE WYNIK POMIARU, i podpisuję ją jako taką
 * (O48: zakaz — i tak samo lista — szerszy niż jego dowód nie ma prawa udawać
 * liczby z badania). Powód wyboru akurat tych sześciu: pokrywają całą
 * rozpiętość od mikro-sesji Bloku do meczu z dojazdem, mieszczą się w jednym
 * rzędzie przycisków i ⛔ ŻADNA Z NICH NIE JEST ZAZNACZONA Z GÓRY.
 *
 * ⚠️ ZMIERZONE 17.08.2026: w całej bazie NIE MA kolumny z planowanym czasem
 * trwania — `information_schema.columns` po wzorcach `%duration%` i `%minut%`
 * oddaje wyłącznie `match_contexts.minutes_played` i `player_school_slots.minutes_range`,
 * oba o czymś innym. Dlatego `podpowiedzCzasu` dostaje dziś `null` i mówi
 * o tym wprost, zamiast wstawiać wypełniacz. ⭐ Gdy taka kolumna powstanie,
 * zmienia się JEDEN argument, a nie ta lista.
 */
export const MINUTY_DO_WYBORU = [15, 30, 45, 60, 90, 120] as const;

// ═══════════════════════════════════════════════════════════════════
// 8. LOG — ŻEBY DAŁO SIĘ ZDIAGNOZOWAĆ OCENĘ PO FAKCIE
// ═══════════════════════════════════════════════════════════════════

export function opisOcenyDoLogu(args: {
  werdykt: WartoscWerdyktu | null;
  payload: PayloadZeZrodlami;
  powod: RozstrzygnieciePowodu;
  rodzaj: RozpoznanieRodzaju;
}): string {
  const wartosci = Object.keys(args.payload.payload).sort();
  const zrodla = wartosci.map((k) => `${k}=${args.payload.data_sources[k] ?? '⛔BEZ ŹRÓDŁA'}`);
  const rodzaj = args.rodzaj.znany ? args.rodzaj.rodzaj : `NIE WIEM (${args.rodzaj.powod})`;
  return `ocena z kafla: werdykt ${args.werdykt ?? 'brak'} · rodzaj ${rodzaj} `
    + `· wartości ${wartosci.length} [${zrodla.join(', ')}] `
    + `· powód ${args.powod.waga} (${args.powod.powod}) `
    + `· jednostki ${jednostkiZOceny(args.werdykt).jednostki}`;
}
