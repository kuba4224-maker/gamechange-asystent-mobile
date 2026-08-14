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
