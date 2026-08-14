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

// ═══════════════════════════════════════════════════════════════════════
// PLAN-D-A1 08.2026 — ZNACZNIK WYKONANIA SESJI
//
// Zmierzone 14.08.2026 na żywej bazie: `calendar_events_status_check`
// dopuszczał WYŁĄCZNIE 'scheduled' i 'cancelled', więc `status='completed'`
// był w tej bazie NIEMOŻLIWY (błąd 23514). Zasada P3 nazywa skutek: „nie
// liczymy »zrobione« z pola, którego nikt nie zapisuje".
//
// ⛔ TO NIE JEST DRUGI TOR ZALICZANIA SESJI. Nośnikiem prawdy pozostaje
// `daily_logs.calendar_event_id` — licznik liczy z powiązania, tak jak dziś.
// `status='completed'` jest POCHODNĄ tego powiązania i istnieje po to, żeby
// kalendarz i cron widziały to samo, co widzi licznik. Gdyby kiedykolwiek
// rozjechało się jedno z drugim, prawdą jest powiązanie.
//
// Decyzja jest czysta (bez Supabase), żeby dała się sprawdzić bez appki.
// ═══════════════════════════════════════════════════════════════════════

/** Wydarzenie w oknie pickera — tyle, ile potrzeba do decyzji o znaczniku. */
export type CompletionCandidate = { id: number; focusBlockId: string | null };

export type CompletionDecision =
  | { oznacz: true; eventId: number }
  | { oznacz: false; powod: 'wpis-poranny' | 'brak-powiazania' | 'wydarzenie-spoza-bloku' };

/**
 * Czy ten wpis Dziennika ma postawić `status='completed'` na wydarzeniu — i na którym.
 *
 * Świadome decyzje:
 *  • wpis PORANNY nigdy nie zalicza sesji (kontrakt Dziennika, sekcja 1) —
 *    to samo rozstrzygnięcie, które ma render pytania;
 *  • bez powiązania nie ma czego oznaczać — zawodnik nie wskazał wydarzenia;
 *  • wydarzenie spoza Bloku (`focusBlockId == null`) też się nie oznacza:
 *    licznik „N z M" liczy wyłącznie sesje Bloku, a znacznik ma odpowiadać
 *    licznikowi, nie wyprzedzać go o własne znaczenie.
 */
export function decideSessionCompletion(params: {
  entryType: 'morning' | 'post_training';
  calendarLinkId: string;
  options: CompletionCandidate[];
}): CompletionDecision {
  const { entryType, calendarLinkId, options } = params;
  if (entryType !== 'post_training') return { oznacz: false, powod: 'wpis-poranny' };
  if (!calendarLinkId) return { oznacz: false, powod: 'brak-powiazania' };
  const wybrane = options.find((o) => String(o.id) === calendarLinkId);
  if (!wybrane || wybrane.focusBlockId == null) return { oznacz: false, powod: 'wydarzenie-spoza-bloku' };
  return { oznacz: true, eventId: wybrane.id };
}

/**
 * Zdanie do KONSOLI, gdy postawienie znacznika się nie udało.
 *
 * ⚠️ To NIE jest treść dla zawodnika i nigdy nie ma nią być: dla niego wpis
 * się zapisał i to jest prawda — powiązanie, z którego liczy się pasek, leży
 * już w bazie. Ale porażka nie może być cicha (R5, zakaz 9): defekt niewidoczny
 * dla autora jest defektem, którego nikt nie naprawi.
 */
export function completionFailureLog(eventId: number, powod: string): string {
  return `[PLAN-D-A1] Wpis zapisany, ale nie udało się postawić status='completed' `
    + `na calendar_events.id=${eventId}: ${powod}. `
    + `Licznik liczy z daily_logs.calendar_event_id i jest NIENARUSZONY.`;
}

/**
 * Zdanie do KONSOLI, gdy `update` przeszedł bez błędu, ale nie dotknął ani
 * jednego wiersza. Zmierzone 14.08.2026: polityka `calendar_events_update_own`
 * ma warunek `user_has_active_access(auth.uid())`, więc zawodnikowi bez
 * aktywnego dostępu PostgREST odpowie sukcesem i pustą listą — czyli
 * dokładnie tak, jak wygląda powodzenie. To jest „cichy brak" w czystej
 * postaci i dlatego ma własne zdanie.
 */
export function completionNoRowsLog(eventId: number): string {
  return `[PLAN-D-A1] update status='completed' na calendar_events.id=${eventId} `
    + `nie zmienił ANI JEDNEGO wiersza (najczęściej RLS: calendar_events_update_own `
    + `wymaga user_has_active_access). Wpis i powiązanie zapisane.`;
}
