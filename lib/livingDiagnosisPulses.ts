// Warstwa I/O Supabase dla "diagnozy żywej" (Funkcja 10, część 2). Wzorem
// lib/matchSegmentSelection.ts — celowo OSOBNO od czystej logiki kaskady
// (lib/livingDiagnosisCascade.ts), żeby dało się ją testować bez sieci/RN.
import { supabase } from './supabase';
import { zbierzStanOdczytu, type StanOdczytuKontekstu } from './matchSegmentSelection';
import type { PlayerLivingDiagnosisContext } from './livingDiagnosisCascade';

export type LivingDiagnosisLoadResult = {
  context: PlayerLivingDiagnosisContext;
  lastAnyPulseAt: string | null;
  /**
   * ⭐ PLAN-D-E1 15.08.2026 — stan odczytu, ten sam kształt i TA SAMA
   * implementacja co w `lib/matchSegmentSelection.ts` (importowana, nie
   * przepisana: dwie kopie rozjechałyby się i jedna warstwa meldowałaby błąd,
   * a druga milczała na tym samym kształcie danych).
   *
   * ⚠️ Do dziś `pulsesRes.error` nie występował w tym pliku ANI RAZU.
   * `pulsesRes.data ?? []` po odmowie RLS dawał „zawodnik nigdy nie
   * odpowiedział na żaden puls" — a `isPulseDueToday(null)` czyta to jako
   * „pierwszy puls w życiu, pokaż go dziś". Zawodnik dostawał pytanie,
   * na które być może odpowiadał wczoraj.
   *
   * ⛔ Warstwa I/O NIE rysuje z tego zdania. Przekazuje wyżej; decyduje ekran.
   */
  odczyt: StanOdczytuKontekstu;
};

export async function fetchPlayerLivingDiagnosisContext(userId: string): Promise<LivingDiagnosisLoadResult> {
  const [profileRes, diagnosisRes, goalRes, pulsesRes] = await Promise.all([
    supabase.from('player_profiles').select('position_primary').eq('user_id', userId).limit(1),
    // 'event=email_submitted' — ten sam filtr co diagnoza.tsx i
    // matchSegmentSelection.ts: jedyny wiersz w logu zdarzeń diagnostics,
    // który odpowiada faktycznemu wynikowi diagnozy.
    supabase.from('diagnostics').select('scores,created_at').eq('user_id', userId).eq('event', 'email_submitted').order('created_at', { ascending: false }).limit(1),
    // "Aktywny cel" = cel PRIORYTETOWY (is_priority=true) — ten sam wzorzec
    // co lib/matchSegmentSelection.ts (DECYZJA PROGRAMISTYCZNA 29.07.2026,
    // reużyta tu bez zmian: is_priority to jedyne pole modelujące "TEN
    // jeden, wiodący cel").
    supabase.from('goals').select('segment_id').eq('user_id', userId).eq('status', 'active').eq('is_priority', true).limit(1),
    // Cała historia pulsów zawodnika — jeden wiersz = jedna ODPOWIEDZIANA
    // sesja pytania (pominięcia nigdy nie trafiają do tej tabeli, patrz
    // saveLivingDiagnosisPulse niżej i INTEGRACJA_DIAGNOZA_ZYWA.md decyzja
    // 4). Malejąco po created_at, bez limitu — 13 segmentów, realistycznie
    // rzadko więcej niż kilkadziesiąt wierszy nawet po latach.
    supabase.from('living_diagnosis_pulses').select('segment_id,created_at').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);

  const profilePosition: string | null = profileRes.data?.[0]?.position_primary ?? null;

  let latestScores: Record<string, number> | null = null;
  const scoresRaw = diagnosisRes.data?.[0]?.scores;
  if (scoresRaw) {
    try {
      latestScores = typeof scoresRaw === 'string' ? JSON.parse(scoresRaw) : scoresRaw;
    } catch {
      // scores nie do sparsowania — kaskada traktuje to jak brak diagnozy,
      // ten sam wzorzec "cichego fallbacku" co matchSegmentSelection.ts.
      latestScores = null;
    }
  }

  const activeGoalSegmentId: string | null = goalRes.data?.[0]?.segment_id ?? null;

  // ⭐ PLAN-D-E1 15.08.2026 — ten sam defekt co w `matchSegmentSelection.ts`
  // i ten sam kształt co w `biblioteka.tsx` naprawionej rano przez C3:
  // cztery odpowiedzi z polem `.error`, którego nie czytała żadna.
  const odczyt = zbierzStanOdczytu('livingDiagnosisPulses.fetchPlayerLivingDiagnosisContext', [
    ['player_profiles', profileRes.error],
    ['diagnostics', diagnosisRes.error],
    ['goals', goalRes.error],
    ['living_diagnosis_pulses', pulsesRes.error],
  ]);

  const segmentLastPulsedAt: Partial<Record<string, string>> = {};
  let lastAnyPulseAt: string | null = null;
  for (const row of pulsesRes.data ?? []) {
    // Wiersze posortowane malejąco po created_at — pierwsze napotkane
    // wystąpienie danego segmentu to jego najnowsza data.
    if (!segmentLastPulsedAt[row.segment_id]) {
      segmentLastPulsedAt[row.segment_id] = row.created_at;
    }
    if (!lastAnyPulseAt) {
      lastAnyPulseAt = row.created_at; // pierwszy wiersz = najnowszy ze wszystkich
    }
  }

  return {
    context: { profilePosition, latestScores, activeGoalSegmentId, segmentLastPulsedAt },
    lastAnyPulseAt,
    odczyt,
  };
}

/**
 * Zapisuje odpowiedź na pulse. Świadomie NIE wołane przy pominięciu
 * (INTEGRACJA_DIAGNOZA_ZYWA.md, decyzja 4) — pominięcie zostaje wyłącznie
 * lokalnym stanem ekranu, nigdy nie trafia do bazy, więc pominięty segment
 * może wrócić przy najbliższej okazji zamiast czekać na koniec bramy
 * świeżości.
 */
export async function saveLivingDiagnosisPulse(
  userId: string,
  segmentId: string,
  responseValue: number
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('living_diagnosis_pulses').insert({
    user_id: userId,
    segment_id: segmentId,
    response_value: responseValue,
  });
  return { error: error ? error.message : null };
}
