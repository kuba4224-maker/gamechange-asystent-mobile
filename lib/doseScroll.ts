// SCROLL R13 08.08.2026 — NOWY PLIK. Dokąd przewinąć ekran Cele po wejściu
// z pusha o nowej dawce (M23/B35: „dawka za dwoma kliknięciami"; kontrakt
// trasy: lib/pushDeepLink.ts — '/cele?dawka=1&fb=<focusBlockId>').
//
// DLACZEGO OSOBNY PLIK: sama decyzja „czy i dokąd scrollować" jest czystą
// funkcją z trzema pułapkami, których nie widać na urządzeniu, dopóki się
// nie trafi w złe dane: (1) parametr z URL-a jest zewnętrznego pochodzenia
// (R4) i bywa tablicą, nie stringiem (expo-router przy powtórzonym parametrze);
// (2) scroll do NIEWŁAŚCIWEJ karty jest gorszy niż brak scrolla — przy braku
// pewności nie ruszamy ekranu; (3) layout kart spływa asynchronicznie i decyzja
// musi być odporna na „jeszcze nie zmierzone". Selftest: lib/doseScroll.selftest.ts.
//
// CZEGO TEN PLIK NIE ROBI: nie zna Reacta ani ScrollView. Wejście to parametry
// trasy + pomiary layoutu, wyjście to liczba (y) albo null. Samo przewinięcie
// robi cele.tsx.

/** Odstęp nad kartą po przewinięciu — karta nie ma kleić się do krawędzi. */
export const DOSE_SCROLL_MARGIN = 12;

/** Parametr z expo-routera: string | string[] | undefined → string | null. */
export function firstParam(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}

/**
 * Pozycja Y, do której ekran Cele ma się przewinąć — albo null („nie ruszaj").
 *
 * Reguły:
 *  • bez `dawka=1` w trasie: null — zwykłe wejście w zakładkę nie skacze;
 *  • `fb` wskazany i ZMIERZONY: scroll do jego karty (minus margines);
 *  • `fb` wskazany, ale karta niezmierzona/nieznana: null — czekamy na layout
 *    (wywołujący ponowi próbę po kolejnym pomiarze), a jeśli Blok już nie
 *    istnieje, po prostu nigdy nie skoczymy — to bezpieczna strona błędu;
 *  • BEZ `fb`: scroll tylko, gdy zmierzona jest DOKŁADNIE jedna karta Bloku —
 *    przy kilku Blokach zgadywanie mogłoby zawieźć zawodnika do złej dawki.
 */
export function doseScrollY(params: {
  dawka: string | null;
  fb: string | null;
  cardYByBlockId: ReadonlyMap<string, number>;
}): number | null {
  const { dawka, fb, cardYByBlockId } = params;
  if (dawka !== '1') return null;
  if (fb) {
    const y = cardYByBlockId.get(fb);
    return typeof y === 'number' ? Math.max(0, y - DOSE_SCROLL_MARGIN) : null;
  }
  if (cardYByBlockId.size === 1) {
    const y = cardYByBlockId.values().next().value as number;
    return Math.max(0, y - DOSE_SCROLL_MARGIN);
  }
  return null;
}
