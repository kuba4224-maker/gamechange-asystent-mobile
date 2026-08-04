// Czysta logika kaskady priorytetu wyboru segmentu (Krok 3 procedury
// wdrożenia, pseudokod w punkcie 12 dokumentu decyzji). Świadomie BEZ
// importu Supabase/React Native — testowalne w izolacji, w zwykłym
// Node/tsx, przed podpięciem do UI (zgodnie z wyraźnym zaleceniem
// procedury). Pobieranie danych z Supabase żyje osobno w
// lib/matchSegmentSelection.ts.
import { MATCH_QUESTION_BANK, SEGMENT_ORDER } from './matchQuestionBank';
import { getPositionCriticalSegments, getPositionWordingKey } from './positionProfiles';

export type SelectionSource = 'goal' | 'deficit' | 'position' | 'rotation';
export type RecoveryState = 'entered_fatigued' | 'entered_fresh' | 'uncertain' | null;

export type PlayerMatchSelectionContext = {
  profilePosition: string | null;
  latestScores: Record<string, number> | null;
  activeGoalSegmentId: string | null;
  // Segment -> ISO timestamp ostatniego zadanego pytania o ten segment
  // (dowolny mecz w przeszłości). Brak klucza = nigdy nie pytano.
  segmentLastAskedAt: Partial<Record<string, string>>;
  enteredRecoveryState: RecoveryState;
};

export type SegmentSelection = {
  segmentId: string;
  selectionSource: SelectionSource;
};

export function hasQuestionBank(segmentId: string): boolean {
  return !!MATCH_QUESTION_BANK[segmentId];
}

// Port 1:1 z getRelativeDeficits() w index.html (zweryfikowane fresh z
// produkcyjnego kodu 29.07.2026) — mediana ± 0.5×odchylenie standardowe,
// min. bezwzględna różnica 9 pkt. Bez limitu domyślnego obcięcia do top-4
// (jak w index.html, gdzie limit=4 służył WYŚWIETLANIU) — tu potrzebujemy
// pełnej listy kwalifikujących się deficytów do testu przynależności.
export function getRelativeDeficits(scores: Record<string, number>, limit = 13): [string, number][] {
  const entries = Object.entries(scores);
  const values = entries.map(([, v]) => v).sort((a, b) => a - b);
  const n = values.length;
  if (n === 0) return [];

  const median = n % 2 === 0 ? (values[n / 2 - 1] + values[n / 2]) / 2 : values[(n - 1) / 2];
  const variance = values.reduce((sum, v) => sum + Math.pow(v - median, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  const MIN_ABS_GAP = 9;
  const DEV_MULTIPLIER = 0.5;

  const deficits = entries.filter(([, score]) => {
    const statisticallyLow = score < median - DEV_MULTIPLIER * stdDev;
    const meaningfulGap = median - score >= MIN_ABS_GAP;
    return statisticallyLow && meaningfulGap;
  });

  deficits.sort((a, b) => a[1] - b[1]);
  return deficits.slice(0, limit) as [string, number][];
}

function sortByLeastRecentlyAsked(segmentIds: string[], lastAsked: Partial<Record<string, string>>): string[] {
  return [...segmentIds].sort((a, b) => {
    const ta = lastAsked[a] ? new Date(lastAsked[a] as string).getTime() : -Infinity;
    const tb = lastAsked[b] ? new Date(lastAsked[b] as string).getTime() : -Infinity;
    return ta - tb; // najdawniej pytane (albo nigdy) pierwsze
  });
}

/**
 * Kaskada priorytetu (punkt 4 dokumentu decyzji + pseudokod punkt 12).
 * Czysta funkcja — ten sam wejście zawsze daje ten sam wynik, bez efektów
 * ubocznych. excludeSegmentIds: segmenty już wybrane w TYM meczu (drugie/
 * trzecie pytanie).
 *
 * DECYZJA PROGRAMISTYCZNA (29.07.2026, dokumentowana): schemat
 * (match_context_answers.selection_source, punkt 9 dokumentu decyzji) ma
 * tylko 4 wartości enum: goal/deficit/position/rotation. Pseudokod (punkt
 * 12) nazywał źródło 1 'position_deficit' — wartość spoza tego enuma,
 * zapisanie jej wprost naruszyłoby CHECK constraint. Rozstrzygnięcie:
 * źródło 1 (pozycja-kluczowa + deficyt) zapisywane jako 'deficit'
 * (fundamentalnie to deficyt; 'position' zarezerwowane dla źródła 4, gdzie
 * NIE ma deficytu). Do rewizji przez Kubę, jeśli wolał odwrotnie.
 */
export function selectSegmentForMatch(
  ctx: PlayerMatchSelectionContext,
  excludeSegmentIds: string[] = []
): SegmentSelection | null {
  const deficitEntries = ctx.latestScores ? getRelativeDeficits(ctx.latestScores) : [];
  const deficitIds = new Set(deficitEntries.map(([id]) => id));
  // Źródło 1/4 zawsze liczone z pozycji PROFILU, nigdy z position_played_today
  // (patrz punkt 4 dokumentu decyzji, rozróżnienie priorytet/treść pytania).
  const positionCritical = getPositionCriticalSegments(ctx.profilePosition);

  const isAvailable = (segId: string): boolean => {
    if (!hasQuestionBank(segId)) return false;
    if (excludeSegmentIds.includes(segId)) return false;
    // Regeneracja: dostępna do pogłębienia TYLKO gdy zawodnik wszedł
    // zmęczony — inaczej "nie ma nic do zaoferowania" w tym meczu.
    if (segId === 'regeneracja' && ctx.enteredRecoveryState !== 'entered_fatigued') return false;
    return true;
  };

  const candidates: SegmentSelection[] = [];
  const alreadyCandidate = (segId: string) => candidates.some((c) => c.segmentId === segId);

  // Źródło 1: kluczowe dla pozycji (tier 'key') I zdiagnozowane jako deficyt.
  const source1 = sortByLeastRecentlyAsked(
    positionCritical.filter((id) => deficitIds.has(id) && isAvailable(id)),
    ctx.segmentLastAskedAt
  );
  candidates.push(...source1.map((segmentId) => ({ segmentId, selectionSource: 'deficit' as const })));

  // Źródło 2: aktywny cel zawodnika (priorytetowy), jeśli inny niż już dodane.
  if (ctx.activeGoalSegmentId && isAvailable(ctx.activeGoalSegmentId) && !alreadyCandidate(ctx.activeGoalSegmentId)) {
    candidates.push({ segmentId: ctx.activeGoalSegmentId, selectionSource: 'goal' });
  }

  // Źródło 3: największy deficyt sam w sobie (niezależnie od pozycji).
  const topDeficit = deficitEntries.find(([id]) => isAvailable(id) && !alreadyCandidate(id));
  if (topDeficit) {
    candidates.push({ segmentId: topDeficit[0], selectionSource: 'deficit' });
  }

  // Źródło 4: kluczowe dla pozycji, bez (jeszcze) wykrytego deficytu.
  const source4 = sortByLeastRecentlyAsked(
    positionCritical.filter((id) => !deficitIds.has(id) && isAvailable(id) && !alreadyCandidate(id)),
    ctx.segmentLastAskedAt
  );
  candidates.push(...source4.map((segmentId) => ({ segmentId, selectionSource: 'position' as const })));

  if (candidates.length > 0) {
    return candidates[0];
  }

  // Źródło 5: rotacja — segment o który pytano najdawniej spośród
  // wszystkich z gotowym bankiem, z pominięciem niedostępnych/wykluczonych.
  const rotationCandidates = SEGMENT_ORDER.filter((id) => isAvailable(id));
  const rotation = sortByLeastRecentlyAsked(rotationCandidates, ctx.segmentLastAskedAt);
  if (rotation.length === 0) return null; // nie powinno się zdarzyć przy pełnym banku 13/13

  return { segmentId: rotation[0], selectionSource: 'rotation' };
}

/** Wariant TREŚCI pytania: dzisiejsza pozycja jeśli podana, inaczej profilowa (punkt 4). */
export function resolveWordingKey(positionPlayedToday: string | null, profilePosition: string | null): string | null {
  return getPositionWordingKey(positionPlayedToday ?? profilePosition);
}
