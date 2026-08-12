// DEEPLINK R8 08.08.2026 — dokąd prowadzi DOTKNIĘCIE pusha.
// (Kontrakt: raport C rundy 6, sekcja 12 — pas C obiecał dołożyć pole
// `contentDose` do `data` pusha „w tej samej rundzie, w której appka je
// odczyta". To jest ta runda: dyspozytor dokłada pole przy nowej dawce,
// a ta funkcja je czyta.)
//
// CZYSTA FUNKCJA bez Supabase i React Native (wzorzec lib/focusBlockProgress.ts);
// I/O — nasłuch dotknięć powiadomień — robi usePushDeepLink()
// w lib/push-notifications.ts. Asercje: lib/pushDeepLink.selftest.ts.
//
// Decyzje:
//  • Deep-link WYŁĄCZNIE dla pusha z nową dawką (`type: 'focus_block_checkin'`
//    + `contentDose`). Zwykły push pytania kontrolnego zachowuje domyślne
//    zachowanie systemu (otwarcie appki tam, gdzie była) — zmieniamy
//    zachowanie tylko tam, gdzie mamy co pokazać: sekcję dawki w Bloku.
//  • Cel: '/cele' — ekran Cele renderuje aktywny Blok (FocusBlockActiveView)
//    razem z sekcją dawki „Z materiałów do tego Bloku".
//  • SCROLL R13 08.08.2026 — trasa niesie teraz parametry `?dawka=1` oraz
//    (gdy push je ma) `&fb=<focusBlockId>`: ekran Cele scrolluje do karty
//    Bloku, o który chodzi (M23/B35 — „dawka za dwoma kliknięciami"; zapis
//    z r8 „osobna pozycja, jeśli zawodnicy będą się gubić" — to jest ta
//    pozycja). `focusBlockId` idzie do URL-a wyłącznie po przejściu przez
//    ostry filtr kształtu (uuid/id bez znaków specjalnych) — wartość jest
//    zewnętrznego pochodzenia (R4) i nie ma prawa rozstroić routera.
//  • KSZTAŁT DANYCH (data zewnętrznego pochodzenia, R4): api/send-push.js
//    stringifikuje wartości `data` dla FCM (Record<string,string>, ~linia 92,
//    stan na 08.08.2026) — appka dostaje `'true'`, nie `true`. Akceptujemy
//    oba; każdy inny kształt (w tym `'false'`) NIE nawiguje.
//  • Nieznany/pusty `data` → null (żadnej nawigacji) — dotknięcie cudzego
//    albo starego pusha nie może teleportować zawodnika bez powodu.

/** Bazowa trasa dawki — plus opcjonalne parametry scrolla (R13). */
export type PushDeepLinkRoute =
  | '/cele?dawka=1'
  | `/cele?dawka=1&fb=${string}`;

/**
 * SCROLL R13 — filtr kształtu identyfikatora Bloku z danych pusha.
 * Dyspozytor wysyła uuid; przyjmujemy szerzej (litery/cyfry/myślnik/podkreślnik,
 * 1–64 znaki), bo to i tak tylko klucz do dopasowania karty na ekranie —
 * ale NIC, co mogłoby być separatorem URL-a ani znakiem specjalnym.
 */
export function safeFocusBlockId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null;
}

export function routeForPushData(data: unknown): PushDeepLinkRoute | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.type !== 'focus_block_checkin') return null;
  if (d.contentDose === true || d.contentDose === 'true') {
    const fb = safeFocusBlockId(d.focusBlockId);
    return fb ? `/cele?dawka=1&fb=${fb}` : '/cele?dawka=1';
  }
  return null;
}
