// Pobieranie danych wejściowych dla kaskady (lib/matchCascade.ts) z
// Supabase — celowo OSOBNO od czystej logiki, żeby dało się ją testować
// bez sieci/RN (Krok 3 procedury wdrożenia, patrz test_cascade.ts z tej
// samej sesji).
import { supabase } from './supabase';
import { opisBleduOdczytuDoLogu } from './trzyPustki';
import type { PlayerMatchSelectionContext, RecoveryState } from './matchCascade';

// ═════════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-E1 15.08.2026 — STAN ODCZYTU, WSPÓLNY DLA WARSTW I/O
// ═════════════════════════════════════════════════════════════════════
//
// ── PO CO TO TU JEST ─────────────────────────────────────────────────
// Do dziś ten plik ZJADAŁ błąd odczytu: `answersRes.error` nie występował
// w nim ANI RAZU, a `answersRes.data ?? []` sprawiał, że funkcja po odmowie
// RLS nie rzucała, tylko zwracała pustą historię pytań. Skutki były dwa
// i oba niewidoczne:
//
//   1. kaskada meczowa dostawała „o tym segmencie nigdy nie pytaliśmy"
//      zamiast „nie wiem, o co pytaliśmy" — i pytała o to samo drugi raz;
//   2. ⚠️ `catch` z logiem, który pas C3 dołożył w `mecz.tsx ::
//      loadSegmentSlots`, NIE MIAŁ SIĘ NA CZYM ODPALIĆ. Funkcja nie rzucała,
//      więc wczorajsza naprawa była tam POZORNA — a to jest gorszy stan niż
//      jej brak, bo wygląda na zrobioną.
//
// ── DLACZEGO STAN, A NIE ZDANIE ──────────────────────────────────────
// ⛔ `lib/*.ts` to warstwa I/O bez ekranu. Jej zadaniem jest PRZEKAZAĆ WYŻEJ,
// że odczyt padł — nie narysować zdanie. Zdanie należy do ekranu, bo tylko on
// wie, gdzie jest na nie miejsce i jakie wyjście z niego prowadzi.
//
// ── DLACZEGO `boolean`, A NIE `boolean | null` ───────────────────────
// Trzy wartości (`null` = „jeszcze nie czytałem") są kształtem dla EKRANU,
// który istnieje ZANIM cokolwiek przeczyta. Ta funkcja jest samym odczytem:
// zanim się nie wykona, nie ma żadnej wartości do zwrócenia. Wpisanie tu
// stanu, który nie może zajść, byłoby modelowaniem nieistniejącej niepewności
// — czyli tą samą chorobą co Z0, tylko od drugiej strony.
// ⭐ Trzy wartości trzyma WOŁAJĄCY: `null` do pierwszego odczytu, potem
// `udanySie` stąd.

export type StanOdczytuKontekstu = {
  /** `true` — WSZYSTKIE zapytania tego kontekstu przeszły. */
  udanySie: boolean;
  /** Tabele, których odczyt padł, w kolejności zapytań. Puste, gdy `udanySie`. */
  zrodlaKtorePadly: string[];
  /**
   * Powody z bazy — WYŁĄCZNIE do logu.
   * ⛔ Nigdy na ekran: komunikat PostgREST nie mieści się w żadnym z trzech
   * rejestrów Z0 i nie jest problemem zawodnika (ten sam ruch, którym pas C3
   * zdjął `'…: ' + e.message` z ekranu Diagnozy).
   */
  powody: string[];
};

/**
 * ⭐ JEDNA IMPLEMENTACJA DLA OBU WARSTW I/O — woła ją też
 * `lib/livingDiagnosisPulses.ts`. Dwie kopie rozjechałyby się, a wtedy jedna
 * warstwa meldowałaby błąd, a druga milczała na tym samym kształcie danych
 * (ten sam powód, dla którego C3b przeprowadził regułę R11 do jednego miejsca).
 *
 * ⚠️ Loguje TYLKO wtedy, gdy coś naprawdę padło — log przy każdym odczycie
 * zamieniłby konsolę w szum, w którym prawdziwy błąd tonie.
 */
export function zbierzStanOdczytu(
  gdzie: string,
  odczyty: ReadonlyArray<readonly [tabela: string, blad: { message: string } | null]>,
): StanOdczytuKontekstu {
  const zrodlaKtorePadly: string[] = [];
  const powody: string[] = [];
  for (const [tabela, blad] of odczyty) {
    if (!blad) continue;
    zrodlaKtorePadly.push(tabela);
    powody.push(blad.message);
    console.warn(opisBleduOdczytuDoLogu(`${gdzie} → ${tabela}`, blad));
  }
  return { udanySie: zrodlaKtorePadly.length === 0, zrodlaKtorePadly, powody };
}

/**
 * ⭐ PLAN-D-E1: typ zwracany to PRZECIĘCIE, nie nowy kształt.
 *
 * Dzięki temu `mecz.tsx` — plik domknięty przez C3 i ZAKAZANY dla tego pasa —
 * kompiluje się bez jednej zmiany: wszędzie, gdzie oczekiwany jest
 * `PlayerMatchSelectionContext`, przecięcie jest przypisywalne. Informacja
 * jedzie wyżej od dziś; decyzja, co z nią zrobić, należy do wołającego
 * i jest wypisana w nocie pasa jako pozycja do rozdzielenia.
 */
export type KontekstMeczuZOdczytem = PlayerMatchSelectionContext & {
  odczyt: StanOdczytuKontekstu;
};

export async function fetchPlayerMatchSelectionContext(
  userId: string,
  enteredRecoveryState: RecoveryState
): Promise<KontekstMeczuZOdczytem> {
  const [profileRes, diagnosisRes, goalRes, answersRes] = await Promise.all([
    supabase.from('player_profiles').select('position_primary').eq('user_id', userId).limit(1),
    // 'event=email_submitted' — ten sam filtr co diagnoza.tsx: to jedyny
    // wiersz w logu zdarzeń diagnostics, który odpowiada faktycznemu
    // wynikowi diagnozy, nie każdemu zdarzeniu pośredniemu.
    supabase.from('diagnostics').select('scores,created_at').eq('user_id', userId).eq('event', 'email_submitted').order('created_at', { ascending: false }).limit(1),
    // "Aktywny cel" = cel PRIORYTETOWY (is_priority=true) — DECYZJA
    // PROGRAMISTYCZNA (29.07.2026): dokument decyzji nie rozróżnia
    // wielu równoległych aktywnych celów; is_priority to jedyne pole w
    // schemacie (Domena 05) modelujące "TEN jeden, wiodący cel" (unikalny
    // indeks: co najwyżej jeden priorytetowy na użytkownika). Gdy żaden
    // aktywny cel nie jest priorytetowy, kaskada traktuje to jak brak celu
    // (przechodzi do źródła 3).
    supabase.from('goals').select('segment_id').eq('user_id', userId).eq('status', 'active').eq('is_priority', true).limit(1),
    supabase.from('match_context_answers').select('segment_id,created_at').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);

  const profilePosition: string | null = profileRes.data?.[0]?.position_primary ?? null;

  let latestScores: Record<string, number> | null = null;
  const scoresRaw = diagnosisRes.data?.[0]?.scores;
  if (scoresRaw) {
    try {
      latestScores = typeof scoresRaw === 'string' ? JSON.parse(scoresRaw) : scoresRaw;
    } catch {
      // scores nie do sparsowania — kaskada traktuje to jak brak diagnozy,
      // nie przerywa reszty ekranu (ten sam wzorzec "cichego fallbacku" co
      // reszta appki, np. loadGoalDirectionContext w cele.tsx).
      latestScores = null;
    }
  }

  const activeGoalSegmentId: string | null = goalRes.data?.[0]?.segment_id ?? null;

  // ⭐ PLAN-D-E1 15.08.2026 — TU BYŁA DZIURA. Wszystkie cztery odpowiedzi mają
  // pole `.error` i do dziś nie czytała go żadna. Odmowa RLS wraca z PostgREST
  // jako `{ data: null, error: {...} }`, a NIE jako odrzucona obietnica — więc
  // `?? []` niżej zamieniał ją w „historia pytań jest pusta" i nikt (łącznie
  // z `catch` w `mecz.tsx`) nie miał się jak dowiedzieć, że coś padło.
  const odczyt = zbierzStanOdczytu('matchSegmentSelection.fetchPlayerMatchSelectionContext', [
    ['player_profiles', profileRes.error],
    ['diagnostics', diagnosisRes.error],
    ['goals', goalRes.error],
    ['match_context_answers', answersRes.error],
  ]);

  const segmentLastAskedAt: Partial<Record<string, string>> = {};
  for (const row of answersRes.data ?? []) {
    // Wiersze posortowane malejąco po created_at — pierwsze napotkane
    // wystąpienie danego segmentu to jego najnowsza data, kolejne pomijamy.
    if (!segmentLastAskedAt[row.segment_id]) {
      segmentLastAskedAt[row.segment_id] = row.created_at;
    }
  }

  return { profilePosition, latestScores, activeGoalSegmentId, segmentLastAskedAt, enteredRecoveryState, odczyt };
}
