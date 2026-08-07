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
