// JEDNA DROGA B2 08.08.2026 — NOWY PLIK.
// Wskaźnik PRACY w hero Celu na ekranie Dziś: „N z M sesji Bloku Skupienia
// zrobione". Czysta logika, zero I/O — ten sam rozdział co
// lib/livingDiagnosisCascade.ts (logika) vs lib/livingDiagnosisPulses.ts (I/O).
// Dzięki temu daje się uruchomić i sprawdzić bez appki (patrz
// lib/focusBlockProgress.selftest.ts).
//
// DLACZEGO TO ISTNIEJE: audyt 06.08.2026 usunął z hero Celu dwa wskaźniki, bo
// kłamały — „Aktywny od N tygodni" mierzył upływ czasu (im dłużej Cel stał w
// miejscu, tym większa liczba: nagroda za stagnację), a „N rekomendacji"
// liczyło wszystkie typy rekomendacji wbrew własnej etykiecie. W to miejsce
// wchodzi liczba, która mierzy PRACĘ i którą zawodnik może zmienić jednym
// wpisem w Dzienniku.
//
// SKĄD DANE (zero nowych pytań do zawodnika — wszystko już jest w bazie):
//  • `focus_blocks`  — aktywny Blok Skupienia; ma `segment_id`, więc wiadomo,
//                      pod który Cel jest prowadzony.
//  • `calendar_events.focus_block_id` — sesje tego Bloku (zakłada je
//                      FocusBlockPlanner przy tworzeniu Bloku).
//  • `daily_logs.calendar_event_id`   — wykonanie sesji. DOKŁADNIE ten sam
//                      wzorzec, co plakietki „Wykonano / Nie wykonano"
//                      w app/(tabs)/kalendarz.tsx — jedno rozumienie
//                      „zrobione" w całej appce, nie drugie.

export type FocusBlockLike = { id: string; segment_id: string };
export type BlockEventLike = { id: number; focus_block_id: string | null };

/** `null` = nie ma czego pokazać. Ekran ma wtedy zaprosić do zaplanowania pracy, NIE podstawić innej liczby. */
export type FocusBlockProgress = { done: number; total: number } | null;

/**
 * Postęp Bloku Skupienia prowadzonego pod WSKAZANY Cel.
 *
 * Świadome decyzje:
 *  • Wiązanie po `segment_id` Celu, nie „dowolny aktywny Blok". Zawodnik może
 *    mieć Blok w innym filarze (baza dopuszcza po jednym na filar) — pokazanie
 *    tamtej liczby pod tym Celem byłoby liczbą nie na temat.
 *  • `total` to liczba realnie zaplanowanych sesji w kalendarzu, nie iloczyn
 *    `sessions_per_week × target_weeks`. Zawodnik odhacza to, co widzi w
 *    kalendarzu; iloczyn potrafiłby się z tym rozjechać (np. po anulowaniu
 *    sesji) i wskaźnik znów zacząłby kłamać.
 *  • Blok bez ani jednej sesji w kalendarzu → `null`. Nie pokazujemy „0 z 0".
 *
 * `events` mają być WYŁĄCZNIE wydarzeniami o statusie `scheduled` — anulowane
 * nie są pracą do zrobienia i nie mogą podbijać mianownika.
 */
export function computeFocusBlockProgress(params: {
  goalSegmentId: string | null;
  activeBlocks: FocusBlockLike[];
  scheduledEvents: BlockEventLike[];
  doneEventIds: Set<number>;
}): FocusBlockProgress {
  const { goalSegmentId, activeBlocks, scheduledEvents, doneEventIds } = params;
  if (!goalSegmentId) return null;

  const block = activeBlocks.find((b) => b.segment_id === goalSegmentId);
  if (!block) return null;

  const blockEvents = scheduledEvents.filter((e) => e.focus_block_id === block.id);
  if (blockEvents.length === 0) return null;

  return {
    done: blockEvents.filter((e) => doneEventIds.has(e.id)).length,
    total: blockEvents.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// PLAN-D-A1 08.2026 — TRZECI STAN LICZNIKA: „NIE WIEM"
//
// CO ZMIERZONO 14.08.2026 na żywej bazie:
//   select count(*), count(calendar_event_id) from public.daily_logs;
//   → 10 wpisów, 0 powiązanych.
// Przy 24 zaplanowanych sesjach Bloku `computeFocusBlockProgress` zwraca
// dziś `{ done: 0, total: M }`, a ekran rysuje z tego „0 z M sesji zrobione".
//
// DLACZEGO TO JEST ZŁAMANIE Z0. „0 z M" to zdanie w rejestrze FAKT O TOBIE:
// twierdzi, że zawodnik nie odbył ani jednej sesji. Prawda jest inna —
// NIE WIEMY, ile odbył, bo ani jeden wpis nie przeszedł przez powiązanie.
// Produkt podaje prawdopodobne (a właściwie: nieprawdziwe) jako pewne,
// i robi to w sprawie, w której się myli na niekorzyść zawodnika.
//
// DYSKRYMINATOR — jedno zdanie: rozróżniamy po tym, czy ten zawodnik ma
// W OGÓLE JAKIEKOLWIEK powiązanie wpisu z wydarzeniem (`doneEventIds`
// niepuste, obojętnie którego Bloku dotyczy). Jeśli ma choć jedno —
// mechanizm demonstrowalnie do niego dotarł, więc „0 z M" dla TEGO Bloku
// jest uczciwą liczbą. Jeśli nie ma ani jednego — nie mamy dowodu, że
// mechanizm w ogóle miał okazję zadziałać, i wtedy liczba nie wychodzi
// na ekran.
//
// ⚠️ Stanem domyślnym przy braku danych do rozróżnienia jest NIE_WIEM,
// nigdy „0 z M".
// ═══════════════════════════════════════════════════════════════════════

export type FocusBlockProgressState =
  /** Są powiązania albo jest dowód, że mechanizm u tego zawodnika działał. */
  | { stan: 'WIADOMO'; done: number; total: number }
  /** Nie ma aktywnego Bloku pod tym Celem albo Blok nie ma ani jednej sesji. */
  | { stan: 'BRAK_PLANU' }
  /** M > 0, N = 0 i ZERO dowodu, że którykolwiek wpis przeszedł przez powiązanie. */
  | { stan: 'NIE_WIEM'; total: number };

// ── Brzmienie stanu NIE_WIEM ───────────────────────────────────────────
// ⚠️⚠️ DO PRZEJRZENIA PRZEZ KUBĘ — to jest treść widoczna dla zawodnika,
// a brzmienia należą do niego. Poniższe to PROPOZYCJA, nie decyzja.
//
// Dwie rzeczy, których to brzmienie pilnuje, bo bez nich byłoby szkodliwe:
//  • ZERO OCENY PRACY ZAWODNIKA. Puste powiązania to defekt produktu, nie
//    jego zaniedbanie. „Nie odhaczasz sesji" byłoby postawieniem mu zarzutu
//    za nasz błąd (M1: zakazana jest ocena charakteru i konfrontacja).
//  • RZECZ DO ZROBIENIA (M4). Komunikat bez wyjścia jest zakazany —
//    zawodnik ma wiedzieć, co zrobić, żeby liczba się pojawiła.

export const NIE_WIEM_TYTUL = (total: number) =>
  `Nie wiemy, ile z ${total} sesji się odbyło`;

export const NIE_WIEM_POWOD =
  'Żaden wpis w Dzienniku nie jest jeszcze połączony z sesją z kalendarza, '
  + 'więc nie ma z czego tego policzyć.';

export const NIE_WIEM_RZECZ_DO_ZROBIENIA =
  'Po najbliższym treningu otwórz Dziennik → Wpis potreningowy i odpowiedz '
  + 'na pytanie o sesję Bloku. Od tego wpisu licznik pokaże liczbę.';

/** Ekran, który brzmienie NIE_WIEM wskazuje zawodnikowi jako wyjście. */
export const NIE_WIEM_EKRAN_WYJSCIA = 'Dziennik';

/**
 * Ten sam postęp co `computeFocusBlockProgress`, ale z jawnym stanem
 * w typie zwracanym — żeby ekran NIE MÓGŁ pomylić „zero zrobionych"
 * z „nie wiemy, ile zrobionych".
 *
 * `computeFocusBlockProgress` zostaje bez zmian: konsumuje ją dziś
 * `app/(tabs)/dzis.tsx` (pas T, plik poza tym pasem). Podmiana wywołania
 * jest KONTRAKTEM dla pasa T / sesji nawigującej, nie tej rundy.
 */
export function computeFocusBlockProgressState(params: {
  goalSegmentId: string | null;
  activeBlocks: FocusBlockLike[];
  scheduledEvents: BlockEventLike[];
  /** WSZYSTKIE powiązania tego zawodnika, nie tylko z tego Bloku — to jest dyskryminator. */
  doneEventIds: Set<number>;
}): FocusBlockProgressState {
  const postep = computeFocusBlockProgress(params);
  if (postep === null) return { stan: 'BRAK_PLANU' };

  const { done, total } = postep;
  if (done > 0) return { stan: 'WIADOMO', done, total };

  // done === 0 — i tu przebiega cała różnica.
  const maJakikolwiekDowod = params.doneEventIds.size > 0;
  return maJakikolwiekDowod
    ? { stan: 'WIADOMO', done: 0, total }
    : { stan: 'NIE_WIEM', total };
}

// ═══════════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-E2 08.2026 (15.08.2026) — DRUGA LICZBA, KTÓREJ NIC NIE KASUJE
//
// CO ZMIERZONO 15.08.2026 na produkcji (projekt kqrbztsvepjtggjmmcdx,
// wyłącznie `select`):
//
//   select fb.status, ce.status, count(*) from calendar_events ce
//     join focus_blocks fb on fb.id = ce.focus_block_id group by 1,2;
//   → active/scheduled = 12 · completed/cancelled = 12
//
//   focus_blocks: 2 wiersze — 1 `active`, 1 `completed`.
//   Zawodnik 0be298a2… ma DOKŁADNIE JEDEN Blok i jest on `completed`,
//   a wszystkie jego 12 sesji ma status `cancelled`.
//
// CO Z TEGO WYNIKA — DEFEKT JEST OSIĄGALNY DZIŚ, NA PRAWDZIWYM WIERSZU.
// `computeFocusBlockProgress` dostaje z ekranu WYŁĄCZNIE bloki `active`
// (`blocksRes` ma `.eq('status','active')`) i WYŁĄCZNIE wydarzenia
// `scheduled`. Dla tego zawodnika oba zbiory są puste, więc funkcja zwraca
// `null`, a ekran rysuje zaproszenie do zaplanowania pracy. Zawodnik, który
// przepracował czterotygodniowy Blok, czyta nazajutrz, że nie ma planu.
//
// ⛔ TO JEST DOKŁADNIE TO, CZEGO ZAKAZUJE N1: nagroda cofnięta za coś, co
// zawodnik zrobił dobrze. Licznik nie „spadł do zera" — on ZNIKNĄŁ, co jest
// gorsze, bo nie zostawia nawet śladu, że praca była.
//
// ⚠️ I DRUGA RZECZ, WAŻNIEJSZA OD PIERWSZEJ: rozszerzenie samego zbioru
// Bloków o `completed` DEFEKTU NIE NAPRAWIA. Zmierzone wyżej: domknięciu
// Bloku towarzyszy zmiana statusu jego sesji na `cancelled`, więc drugi filtr
// — ten po statusie WYDARZENIA — wyciąłby tę pracę tak samo skutecznie.
// Filtry są dwa i oba trzeba wyjąć.
//
// ── CO TA SEKCJA ZMIENIA, A CZEGO NIE ─────────────────────────────────
// `computeFocusBlockProgress` i `computeFocusBlockProgressState` ZOSTAJĄ
// NIETKNIĘTE. Odpowiadają na pytanie „ile z sesji BIEŻĄCEGO Bloku mam za
// sobą" i na takie pytanie odpowiedź MUSI się zerować przy nowym Bloku —
// inaczej nie jest odpowiedzią na nie. To ta sama różnica, co w pasie C4
// między licznikiem okna a dorobkiem: tamta liczba opisuje RYTM, ta — DOROBEK.
//
//   | liczba                        | czy może zmaleć |
//   |-------------------------------|-----------------|
//   | postęp w TYM Bloku            | tak i tak ma być |
//   | praca we WSZYSTKICH Blokach   | ⛔ NIGDY         |
//
// ── ⭐ DLACZEGO TEGO ZAKAZU NIE DA SIĘ ZŁAMAĆ DYSCYPLINĄ ──────────────
// Wzorzec przeniesiony co do sensu z `lib/nagrodaZaPrace.ts` §7.1: regułę,
// której nie wolno złamać, wymuszamy KSZTAŁTEM TYPU, a nie czujnością
// kolejnej sesji.
//
//   • funkcja NIE PRZYJMUJE listy Bloków — Bloki wyprowadza z samych sesji,
//     przez `focus_block_id`. Nie mając wiersza Bloku, nie ma czym odsiać
//     Bloku domkniętego. Filtr po statusie Bloku jest tu NIE DO NAPISANIA;
//   • typ sesji (`BlockEventLike`) nie ma pola ze statusem ANI z datą, więc
//     poniżej tej granicy nie istnieje nic, czym dałoby się policzyć „ile dni
//     temu" ani odsiać sesji anulowanej.
//
// ⛔ ZOSTAJE JEDNO MIEJSCE, W KTÓRYM DA SIĘ TO ZEPSUĆ: wywołanie. Ekran,
// który poda tu zbiór już odsiany zapytaniem (`status='scheduled'`), dostanie
// liczbę mniejszą od prawdy. Tego typ nie obroni — broni tego asercja
// `(E2-4)` w `lib/focusBlockProgress.selftest.ts`, czytająca wywołania
// w `app/` i `components/`. Nazwa pola jest częścią tej obrony i dlatego jest
// tak długa: `wszystkieSesjeBlokow` ma się źle czytać, gdy podstawi się pod
// nią `scheduledEvents`.
//
// ⛔ ZERO SERII DNI, PASSY, „CODZIENNIE" I „NIE PRZERWIJ" — tak samo jak
// w pasie C4. Pilnuje tego asercja czytająca ten plik jako tekst.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Dorobek zawodnika ze WSZYSTKICH Bloków Skupienia — bieżących i domkniętych.
 *
 * ⚠️ TRZECI STAN (R5) NIE MA POLA `sesje`. „Nie udało się policzyć" i „zero
 * pracy" to dwa różne zdania, a stan, z którego nie da się wyjąć liczby, nie
 * da się przez pomyłkę narysować jako zero. Ten sam kształt co `nie_policzona`
 * w `lib/nagrodaZaPrace.ts`.
 */
export type DorobekWBlokach =
  | { rodzaj: 'policzony'; sesje: number; bloki: number }
  | { rodzaj: 'nie_policzony'; nieodczytaneZrodlo: string };

/** Nazwy źródeł — wchodzą do zdania „nie udało mi się policzyć (…)". */
export const ZRODLO_SESJE_BLOKOW = 'sesje Bloków z kalendarza';
export const ZRODLO_POWIAZANIA_WPISOW = 'powiązania wpisów w Dzienniku z sesjami';

/**
 * Liczy pracę wykonaną we WSZYSTKICH Blokach Skupienia zawodnika.
 *
 * ⚠️ `null` w którymkolwiek wejściu znaczy „nie odczytałem", a nie „puste",
 * i przewraca CAŁY wynik na `nie_policzony`. Uzasadnienie jest to samo, co
 * w `lib/nagrodaZaPrace.ts` §7.3: liczba wyliczona z jednego źródła zamiast
 * dwóch jest MNIEJSZA od tej samej liczby sprzed godziny — czyli licznik
 * malejący przy awarii sieci. To jest ten sam defekt, którego cała ta sekcja
 * zakazuje, tylko taki, o którym nikt się nie dowie.
 *
 * Dowodem wykonania jest DOKŁADNIE TO SAMO, co w `computeFocusBlockProgress`:
 * powiązanie wpisu w Dzienniku z pozycją kalendarza (`daily_logs
 * .calendar_event_id`). Jedno rozumienie „zrobione" w całej appce, nie drugie.
 */
export function policzPraceWeWszystkichBlokach(params: {
  /**
   * WSZYSTKIE sesje Bloków tego zawodnika — bez odsiewania po statusie Bloku
   * i bez odsiewania po statusie sesji. `null` = odczyt się nie udał.
   */
  wszystkieSesjeBlokow: BlockEventLike[] | null;
  /** WSZYSTKIE powiązania wpisów tego zawodnika. `null` = odczyt się nie udał. */
  zrobioneEventIds: ReadonlySet<number> | null;
}): DorobekWBlokach {
  const { wszystkieSesjeBlokow, zrobioneEventIds } = params;
  if (wszystkieSesjeBlokow === null) {
    return { rodzaj: 'nie_policzony', nieodczytaneZrodlo: ZRODLO_SESJE_BLOKOW };
  }
  if (zrobioneEventIds === null) {
    return { rodzaj: 'nie_policzony', nieodczytaneZrodlo: ZRODLO_POWIAZANIA_WPISOW };
  }

  // Odsiewanie po kluczu wiersza, nie po pozycji w tablicy: ten sam wiersz
  // podany dwa razy ma się policzyć raz. Bez tego liczba rosłaby od samego
  // odświeżenia ekranu, czyli byłaby nagrodą za obecność (N1).
  const policzoneSesje = new Set<number>();
  const dotknieteBloki = new Set<string>();
  for (const sesja of wszystkieSesjeBlokow) {
    if (sesja.focus_block_id === null) continue;
    if (!zrobioneEventIds.has(sesja.id)) continue;
    if (policzoneSesje.has(sesja.id)) continue;
    policzoneSesje.add(sesja.id);
    dotknieteBloki.add(sesja.focus_block_id);
  }

  return { rodzaj: 'policzony', sesje: policzoneSesje.size, bloki: dotknieteBloki.size };
}

// ── Brzmienia drugiej liczby ───────────────────────────────────────────
// ⚠️⚠️ DO PRZEJRZENIA PRZEZ KUBĘ — treść widoczna dla zawodnika. Zebrane
// w jednym miejscu i wypisane w nocie pasa E2, sekcja „BRZMIENIA".
// ⛔ ŻADNE Z NICH NIE JEST DZIŚ NIGDZIE NARYSOWANE: jedyny konsument tego
// pliku, `app/(tabs)/dzis.tsx`, jest plikiem pasa C4 i pas E2 go nie dotyka.
// Podpięcie należy do sesji nawigującej — patrz nota, sekcja „POZA PASEM".

/** Odmiana przez liczbę — trzy formy, reguła polska (1 · 2–4 · 5+ i 12–14). */
export function odmienPrzezLiczbe(n: number, formy: [string, string, string]): string {
  const setki = Math.abs(n) % 100;
  const jednosci = Math.abs(n) % 10;
  if (n === 1) return formy[0];
  if (jednosci >= 2 && jednosci <= 4 && !(setki >= 12 && setki <= 14)) return formy[1];
  return formy[2];
}

export const DOROBEK_BLOKOW_NAGLOWEK = 'PRACA W BLOKACH SKUPIENIA';

/**
 * ⛔ BEZ ZAKRESU CZASU. Zakres czasu jest dokładnie tym, co pozwala liczbie
 * zmaleć — to jest ta sama decyzja, co w bloku „TWÓJ DOROBEK" pasa C4.
 */
export const dorobekBlokowLiczba = (sesje: number, bloki: number): string =>
  `${sesje} ${odmienPrzezLiczbe(sesje, ['sesja', 'sesje', 'sesji'])}`
  + ` · w ${bloki} ${bloki === 1 ? 'Bloku' : 'Blokach'}`;

/**
 * Stan „policzone, ale jeszcze nic nie ma". ⚠️ Mówi o wiedzy produktu i daje
 * rzecz do zrobienia (M4); nie ocenia pracy zawodnika (M1).
 */
export const DOROBEK_BLOKOW_PUSTO =
  'Tu pokaże się praca, którą masz za sobą w Blokach Skupienia — licząc także '
  + 'Bloki już domknięte.';

export const DOROBEK_BLOKOW_RZECZ_DO_ZROBIENIA = NIE_WIEM_RZECZ_DO_ZROBIENIA;

/** Stan „nie udało się policzyć" — inne zdanie niż „jeszcze nic nie ma" (R5). */
export const dorobekBlokowNiePoliczony = (zrodlo: string): string =>
  `Nie udało mi się policzyć Twojej pracy w Blokach (nie odczytałem: ${zrodlo}). `
  + 'To nie znaczy, że jej nie masz — pociągnij w dół.';
