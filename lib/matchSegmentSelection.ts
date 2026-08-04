// Pobieranie danych wejściowych dla kaskady (lib/matchCascade.ts) z
// Supabase — celowo OSOBNO od czystej logiki, żeby dało się ją testować
// bez sieci/RN (Krok 3 procedury wdrożenia, patrz test_cascade.ts z tej
// samej sesji).
import { supabase } from './supabase';
import type { PlayerMatchSelectionContext, RecoveryState } from './matchCascade';

export async function fetchPlayerMatchSelectionContext(
  userId: string,
  enteredRecoveryState: RecoveryState
): Promise<PlayerMatchSelectionContext> {
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

  const segmentLastAskedAt: Partial<Record<string, string>> = {};
  for (const row of answersRes.data ?? []) {
    // Wiersze posortowane malejąco po created_at — pierwsze napotkane
    // wystąpienie danego segmentu to jego najnowsza data, kolejne pomijamy.
    if (!segmentLastAskedAt[row.segment_id]) {
      segmentLastAskedAt[row.segment_id] = row.created_at;
    }
  }

  return { profilePosition, latestScores, activeGoalSegmentId, segmentLastAskedAt, enteredRecoveryState };
}
