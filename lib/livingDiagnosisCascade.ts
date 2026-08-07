// Czysta logika wyboru segmentu dla "diagnozy żywej" (Funkcja 10, część 2).
// Adaptacja lib/matchCascade.ts (selectSegmentForMatch) — NIE kopia 1:1,
// uzasadnienie różnic w INTEGRACJA_DIAGNOZA_ZYWA.md, sekcja 3. Świadomie
// BEZ importu Supabase/React Native — testowalne w izolacji (patrz
// lib/livingDiagnosisCascade.selftest.ts), zanim podpięte do UI. Pobieranie
// danych z Supabase żyje osobno w lib/livingDiagnosisPulses.ts.
import { LIVING_DIAGNOSIS_SEGMENT_ORDER } from './livingDiagnosisQuestionBank';
import { getPositionCriticalSegments } from './positionProfiles';

export type LivingDiagnosisSelectionSource = 'goal' | 'deficit' | 'position' | 'rotation';

export type PlayerLivingDiagnosisContext = {
  profilePosition: string | null;
  latestScores: Record<string, number> | null;
  activeGoalSegmentId: string | null;
  // Segment -> ISO timestamp ostatniego pulsu odpowiedzianego (nie
  // pominiętego, patrz INTEGRACJA_DIAGNOZA_ZYWA.md decyzja 4). Brak klucza
  // = nigdy nie pytano.
  segmentLastPulsedAt: Partial<Record<string, string>>;
};

export type LivingDiagnosisSelection = {
  segmentId: string;
  selectionSource: LivingDiagnosisSelectionSource;
};

// Bramka świeżości (INTEGRACJA_DIAGNOZA_ZYWA.md, sekcja 3): segment
// odpytany w ciągu ostatnich N dni jest wykluczony z KAŻDEGO źródła
// kaskady, nie tylko z rotacji — inaczej źródło 'goal'/'deficit' wygrywa
// kaskadę bez końca, dopóki cel/deficyt się nie zmieni, i reszta banku
// nigdy się nie odświeża. 21 dni — ta sama liczba co już przyjęty w
// projekcie próg "ile dni to jeszcze świeże dane" (checkin_21d,
// index.html) — PROPOZYCJA robocza do potwierdzenia przez Kubę, nie
// ostateczna (ten sam status co ROTATION_CADENCE_DAYS w
// lib/training-focus-rotation.js). Stała, nie process.env — appka mobilna
// (Expo/RN) nigdzie indziej dziś nie stroi tego typu progów przez zmienne
// środowiskowe (to konwencja backendu, gamechange-app), więc zostaje
// prosta stała, łatwa do zmiany w jednym miejscu.
export const FRESHNESS_COOLDOWN_DAYS = 21;

// Port 1:1 z getRelativeDeficits() w lib/matchCascade.ts (samo pochodzi z
// index.html, zweryfikowane fresh 29.07.2026) — mediana ± 0.5×odchylenie
// standardowe, min. bezwzględna różnica 9 pkt.
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

function daysSince(iso: string | undefined, now: Date): number {
  if (!iso) return Infinity;
  return (now.getTime() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000);
}

function sortByLeastRecentlyPulsed(segmentIds: string[], lastPulsed: Partial<Record<string, string>>): string[] {
  return [...segmentIds].sort((a, b) => {
    const ta = lastPulsed[a] ? new Date(lastPulsed[a] as string).getTime() : -Infinity;
    const tb = lastPulsed[b] ? new Date(lastPulsed[b] as string).getTime() : -Infinity;
    return ta - tb; // najdawniej pytane (albo nigdy) pierwsze
  });
}

/**
 * Kaskada priorytetu dla diagnozy żywej (INTEGRACJA_DIAGNOZA_ZYWA.md,
 * sekcja 3). Czysta funkcja. `now` przyjmowana jako parametr (nie `new
 * Date()` wewnątrz) — testowalność, ten sam wzorzec co
 * shouldRotateTrainingFocus() w gamechange-app/lib/training-focus-
 * rotation.js. `excludeSegmentIds` zachowane dla spójności kształtu z
 * selectSegmentForMatch(), w praktyce diagnoza żywa woła zawsze z pustą
 * listą (jedno pytanie na pulse, patrz decyzja 4).
 */
export function selectSegmentForLivingDiagnosis(
  ctx: PlayerLivingDiagnosisContext,
  now: Date,
  excludeSegmentIds: string[] = []
): LivingDiagnosisSelection | null {
  const deficitEntries = ctx.latestScores ? getRelativeDeficits(ctx.latestScores) : [];
  const deficitIds = new Set(deficitEntries.map(([id]) => id));
  const positionCritical = getPositionCriticalSegments(ctx.profilePosition);

  const isFresh = (segId: string): boolean =>
    daysSince(ctx.segmentLastPulsedAt[segId], now) < FRESHNESS_COOLDOWN_DAYS;

  const isAvailable = (segId: string): boolean => {
    if (excludeSegmentIds.includes(segId)) return false;
    if (isFresh(segId)) return false;
    return true;
  };

  const candidates: LivingDiagnosisSelection[] = [];
  const alreadyCandidate = (segId: string) => candidates.some((c) => c.segmentId === segId);

  // Źródło 1: kluczowe dla pozycji (tier 'key') I zdiagnozowane jako deficyt.
  const source1 = sortByLeastRecentlyPulsed(
    positionCritical.filter((id) => deficitIds.has(id) && isAvailable(id)),
    ctx.segmentLastPulsedAt
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
  const source4 = sortByLeastRecentlyPulsed(
    positionCritical.filter((id) => !deficitIds.has(id) && isAvailable(id) && !alreadyCandidate(id)),
    ctx.segmentLastPulsedAt
  );
  candidates.push(...source4.map((segmentId) => ({ segmentId, selectionSource: 'position' as const })));

  if (candidates.length > 0) {
    return candidates[0];
  }

  // Źródło 5: rotacja — segment o który pytano najdawniej (albo nigdy)
  // spośród wszystkich 13, z pominięciem "świeżych" i wykluczonych.
  const rotationCandidates = LIVING_DIAGNOSIS_SEGMENT_ORDER.filter((id) => isAvailable(id));
  const rotation = sortByLeastRecentlyPulsed(rotationCandidates, ctx.segmentLastPulsedAt);
  if (rotation.length === 0) return null; // wszystkie 13 "świeże" — dziś brak pulsu

  return { segmentId: rotation[0], selectionSource: 'rotation' };
}

/**
 * Czy dziś w ogóle należy się pulse — niezależnie od TEGO, który segment
 * wypadnie w kaskadzie. `lastAnyPulseAt`: najnowszy created_at spośród
 * WSZYSTKICH pulsów zawodnika (dowolny segment), albo null gdy nigdy nie
 * było pulsu. PULSE_INTERVAL_DAYS = 3 — propozycja robocza (INTEGRACJA_
 * DIAGNOZA_ZYWA.md, sekcja 4), do potwierdzenia przez Kubę.
 */
export const PULSE_INTERVAL_DAYS = 3;

export function isPulseDueToday(lastAnyPulseAt: string | null, now: Date): boolean {
  if (!lastAnyPulseAt) return true;
  return daysSince(lastAnyPulseAt, now) >= PULSE_INTERVAL_DAYS;
}
