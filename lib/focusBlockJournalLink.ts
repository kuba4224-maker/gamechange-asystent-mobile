// ZAPIS B7 08.08.2026 — NOWY PLIK. Stacja „Zapis" łączy się z Celem.
//
// PROBLEM (sedno rundy 7): zawodnik wypełniał dziennik wieczorem, a wskaźnik
// „N z M sesji" w hero Celu liczył się z powiązania `daily_logs.
// calendar_event_id` — którego prawie nikt nie ustawiał, bo było biernym,
// opcjonalnym pickerem „Powiąż z zaplanowanym wydarzeniem" z domyślnym
// „— nie dotyczy —". Dwie rzeczy się nie widziały: wpis nie przesuwał niczego,
// co zawodnik ogląda, a pasek Celu nie wiedział o zapisanym wysiłku.
//
// ROZWIĄZANIE: przy wpisie potreningowym, jeśli w ostatnich dniach była
// ZAPLANOWANA SESJA BLOKU SKUPIENIA, dziennik zadaje JEDNO warunkowe pytanie
// („Czy to był ten trening?") z odpowiedzią na jedno dotknięcie. „Tak"
// ustawia dokładnie to samo powiązanie, które od zawsze zaliczało sesję —
// zero nowych tabel, zero migracji, zero nowego znaczenia w bazie. Zasada 4
// („zbieramy tylko wtedy, gdy oddajemy") jest spełniona dosłownie: odpowiedź
// przesuwa pasek, który zawodnik widzi na Dziś następnego ranka — i komunikat
// sukcesu mówi to wprost.
//
// CZYSTA LOGIKA, zero I/O — rozdział jak livingDiagnosisCascade (logika)
// vs livingDiagnosisPulses (I/O). Asercje: lib/focusBlockJournalLink.selftest.ts.

export type LinkableCalendarEvent = {
  id: number;
  /** `YYYY-MM-DD` (lokalna data z `calendar_events.scheduled_date`). */
  scheduled_date: string;
  title: string;
  focus_block_id: string | null;
};

/**
 * Która sesja Bloku zasługuje na pytanie przy DZISIEJSZYM wpisie potreningowym.
 *
 * Świadome decyzje:
 *  • wyłącznie sesje BLOKU (`focus_block_id != null`) — o zwykłe wydarzenia
 *    nie pytamy, od tego jest (i zostaje) ręczny picker;
 *  • dziś przed wczoraj: zawodnik loguje zwykle tego samego wieczora, ale
 *    wpis „po wczorajszym treningu" jest realny — dlatego okno sięga wstecz;
 *  • NIGDY sesja z przyszłości — pytanie „czy zrobiłeś jutrzejszy trening"
 *    podważałoby zaufanie do całego dziennika;
 *  • przy dwóch sesjach tego samego dnia bierzemy pierwszą — to przypadek
 *    teoretyczny (planner nie zakłada dwóch sesji jednego dnia w jednym Bloku),
 *    a pytanie o obie naraz kosztowałoby drugi picker, czyli dokładnie to,
 *    co ta zmiana usuwa.
 */
export function pickBlockSessionToConfirm(
  events: LinkableCalendarEvent[],
  todayStr: string,
): LinkableCalendarEvent | null {
  const block = events.filter((e) => e.focus_block_id != null && e.scheduled_date <= todayStr);
  if (block.length === 0) return null;
  // `YYYY-MM-DD` sortuje się leksykograficznie — najpóźniejsza data (≤ dziś) wygrywa.
  block.sort((a, b) => (a.scheduled_date < b.scheduled_date ? 1 : a.scheduled_date > b.scheduled_date ? -1 : a.id - b.id));
  return block[0];
}

/** Pytanie przy sesji z dziś vs z poprzednich dni — inne brzmienie, ta sama decyzja. */
export function blockSessionQuestion(session: LinkableCalendarEvent, todayStr: string): string {
  return session.scheduled_date === todayStr
    // PLAN-D-A 08.2026 — słownik trzech poziomów: dla zawodnika to jest BLOK.
    ? 'Czy to był ten trening z Twojego Bloku?'
    : 'Czy to był Twój trening z Bloku z ostatnich dni?';
}

export const BLOCK_LINK_YES_LABEL = 'Tak, to ten';
export const BLOCK_LINK_NO_LABEL = 'Nie';

/**
 * Komunikat po zapisie. Gdy wpis zaliczył sesję Bloku, mówimy to WPROST —
 * to jest ta część „oddajemy": zawodnik ma wiedzieć, że jego wpis właśnie
 * przesunął pasek Celu, zanim jutro zobaczy to na Dziś.
 */
export function journalSavedMessage(linkedToBlockSession: boolean): string {
  return linkedToBlockSession
    ? 'Zapisano. Sesja doliczona do paska Twojego Celu ✓'
    : 'Zapisano.';
}
