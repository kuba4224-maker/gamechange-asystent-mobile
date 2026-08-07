// WYNIK DIAGNOZY 07.08.2026 — NOWY PLIK.
// Czysta logika prezentacji wyniku diagnozy (bez importu Supabase i bez
// React Native) — ten sam wzorzec rozdziału co lib/livingDiagnosisCascade.ts
// (logika) vs lib/livingDiagnosisPulses.ts (I/O). Warstwa UI siedzi osobno w
// components/DiagnosisProfileView.tsx.
//
// CAŁA ZAWARTOŚĆ TEGO PLIKU TO PORT Z `gamechange-diagnoza/index.html`
// (odczytane fresh z dysku 07.08.2026, nie z pamięci): getRelativeDeficits,
// groupSegmentsForDisplay, relativeBarWidth, pairSignificance,
// cascadeSignificance, getRankedInfluences, getHiddenCauses,
// detectDiagnosisScenario + DEPENDENCY_NETWORK (81 par) i
// DEPENDENCY_CASCADES (6 kaskad). Zgodnie z briefem: NIE wymyślamy nowego
// sposobu prezentacji, przenosimy istniejący.
//
// CO ŚWIADOMIE POMINIĘTE przy porcie:
//  • pole `ai` każdej relacji (kilka zdań promptu dla modelu) — nigdy nie
//    trafia na ekran zawodnika, w index.html służy wyłącznie do budowy
//    promptu AI. Przeniesienie go tutaj dołożyłoby ~60 kB tekstu do bundla
//    appki bez żadnego efektu widocznego dla zawodnika.
//  • `type` relacji ('mechanism'/'efficiency') — nie wpływa na ranking ani na
//    tekst widoczny dla zawodnika (patrz getRankedInfluences: liczy się
//    wyłącznie `significance` i `weight`).
// Zachowane są dokładnie te pola, które wpływają na WYNIK: from/to/weight,
// path/weight, oraz wszystkie progi liczbowe 1:1.

// ─────────────────────────────────────────────────────────────
// NAZWY SEGMENTÓW — JEDEN ZESTAW, patrz raport zwrotny sekcja 11.
//
// JEDNA DROGA B2 08.08.2026 — definicje PRZENIESIONE do `lib/labels.ts`
// (jedno źródło nazw dla całej appki; wcześniej ta sama treść leżała w pięciu
// plikach). Tutaj zostaje wyłącznie re-eksport, żeby nie trzeba było ruszać
// components/DiagnosisProfileView.tsx ani żadnego innego konsumenta —
// `import { segmentLabel } from './diagnosisProfile'` działa jak działało.
// TREŚĆ NIEZMIENIONA: przeniesione wartości są identyczne co do znaku
// (porównane maszynowo ze wszystkimi pięcioma kopiami przed usunięciem).
// ─────────────────────────────────────────────────────────────
import { SEGMENT_ORDER, SEGMENT_LABELS, segmentLabel } from '../lib/labels';

export { SEGMENT_ORDER, SEGMENT_LABELS, segmentLabel };


// ─────────────────────────────────────────────────────────────
// ODCZYT `diagnostics.scores` — obie postacie zapisu
// ─────────────────────────────────────────────────────────────

/**
 * `scores` bywa w bazie zapisane raz jako obiekt (JSONB), raz jako string
 * JSON — ta sama defensywna obsługa co parseScores() w coach.html,
 * pickTopDeficitSegment() w api/cron-onboard-diagnosis.js i
 * fetchPlayerLivingDiagnosisContext() w lib/livingDiagnosisPulses.ts.
 *
 * Dodatkowo (czego tamte trzy miejsca nie robią, bo nie liczą mediany z
 * całego zestawu): odfiltrowuje klucze spoza 13 znanych segmentów i wartości
 * nieliczbowe. Bez tego pojedynczy śmieciowy klucz w JSON-ie przesuwałby
 * medianę zawodnika i cicho zmieniał WSZYSTKIE grupy na ekranie.
 */
export function parseScores(raw: unknown): Record<string, number> | null {
  if (raw === null || raw === undefined) return null;
  let obj: any = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return null; }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;

  const clean: Record<string, number> = {};
  for (const id of SEGMENT_ORDER) {
    const v = (obj as Record<string, unknown>)[id];
    const n = typeof v === 'string' ? Number(v) : v;
    if (typeof n === 'number' && Number.isFinite(n)) clean[id] = n;
  }
  // Mediana z 1-2 wartości nie niesie informacji o "odstawaniu od reszty
  // własnego profilu" — to jest cała podstawa tego ekranu, więc poniżej 3
  // wartości traktujemy diagnozę jak nieczytelną (ekran pokazuje wtedy
  // wariant awaryjny: typ + data, tak jak przed 07.08.2026).
  return Object.keys(clean).length >= 3 ? clean : null;
}

// ─────────────────────────────────────────────────────────────
// STATYSTYKA WZGLĘDNA — porównanie WYŁĄCZNIE do własnych wyników zawodnika
// (port 1:1, w tym oba progi: 0.5 × odchylenie i min. 9 punktów różnicy)
// ─────────────────────────────────────────────────────────────

const MIN_ABS_GAP = 9;
const DEV_MULTIPLIER = 0.5;

export function playerMedianAndSpread(scores: Record<string, number>): { median: number; stdDev: number } {
  const values = Object.values(scores).sort((a, b) => a - b);
  const n = values.length;
  if (n === 0) return { median: 50, stdDev: 0 };
  const median = n % 2 === 0 ? (values[n / 2 - 1] + values[n / 2]) / 2 : values[(n - 1) / 2];
  const variance = values.reduce((sum, v) => sum + Math.pow(v - median, 2), 0) / n;
  return { median, stdDev: Math.sqrt(variance) };
}

export function getRelativeDeficits(scores: Record<string, number>, limit = 4): [string, number][] {
  const { median, stdDev } = playerMedianAndSpread(scores);
  const deficits = Object.entries(scores).filter(([, score]) =>
    score < median - DEV_MULTIPLIER * stdDev && median - score >= MIN_ABS_GAP
  );
  deficits.sort((a, b) => a[1] - b[1]);
  return deficits.slice(0, limit);
}

/**
 * Szerokość paska 0-100% — pozycja wyniku względem WŁASNEJ mediany i rozrzutu
 * zawodnika, nie względem uniwersalnej skali 0-100. Wyłącznie do wizualizacji,
 * nigdy nie pokazywana jako liczba (odejście od punktacji liczbowej).
 */
export function relativeBarWidth(score: number, median: number, stdDev: number): number {
  const spread = Math.max(stdDev * 3, 15);
  const rel = 50 + ((score - median) / spread) * 50;
  return Math.max(6, Math.min(100, Math.round(rel)));
}

// ─────────────────────────────────────────────────────────────
// SIEĆ ZALEŻNOŚCI — 81 par + 6 kaskad (from/to/weight, path/weight)
// ─────────────────────────────────────────────────────────────

type Pair = { from: string; to: string; weight: number };

export const DEPENDENCY_NETWORK: Pair[] = [
  { from: 'wytrzymalosc', to: 'moc', weight: 0.7 },
  { from: 'moc', to: 'wytrzymalosc', weight: 0.4 },
  { from: 'moc', to: 'fizycznosc', weight: 0.7 },
  { from: 'fizycznosc', to: 'moc', weight: 0.7 },
  { from: 'tolerancja', to: 'moc', weight: 0.3 },
  { from: 'techFund', to: 'moc', weight: 0.3 },
  { from: 'moc', to: 'tolerancja', weight: 0.8 },
  { from: 'tolerancja', to: 'moc', weight: 0.8 },
  { from: 'moc', to: 'regeneracja', weight: 0.6 },
  { from: 'regeneracja', to: 'moc', weight: 0.6 },
  { from: 'odzywianie', to: 'moc', weight: 0.5 },
  { from: 'odzywianie', to: 'moc', weight: 0.4 },
  { from: 'odpornosc', to: 'moc', weight: 0.4 },
  { from: 'koncentracja', to: 'moc', weight: 0.3 },
  { from: 'mental', to: 'moc', weight: 0.4 },
  { from: 'mental', to: 'moc', weight: 0.3 },
  { from: 'percepcja', to: 'moc', weight: 0.4 },
  { from: 'decyzja', to: 'moc', weight: 0.6 },
  { from: 'fizycznosc', to: 'wytrzymalosc', weight: 0.4 },
  { from: 'techFund', to: 'wytrzymalosc', weight: 0.3 },
  { from: 'wytrzymalosc', to: 'tolerancja', weight: 0.7 },
  { from: 'tolerancja', to: 'wytrzymalosc', weight: 0.7 },
  { from: 'tolerancja', to: 'wytrzymalosc', weight: 0.4 },
  { from: 'wytrzymalosc', to: 'regeneracja', weight: 0.6 },
  { from: 'regeneracja', to: 'wytrzymalosc', weight: 0.6 },
  { from: 'odzywianie', to: 'wytrzymalosc', weight: 0.8 },
  { from: 'odzywianie', to: 'wytrzymalosc', weight: 0.5 },
  { from: 'odpornosc', to: 'wytrzymalosc', weight: 0.6 },
  { from: 'koncentracja', to: 'wytrzymalosc', weight: 0.3 },
  { from: 'mental', to: 'wytrzymalosc', weight: 0.5 },
  { from: 'mental', to: 'wytrzymalosc', weight: 0.3 },
  { from: 'percepcja', to: 'wytrzymalosc', weight: 0.4 },
  { from: 'decyzja', to: 'wytrzymalosc', weight: 0.5 },
  { from: 'tolerancja', to: 'fizycznosc', weight: 0.5 },
  { from: 'techFund', to: 'fizycznosc', weight: 0.3 },
  { from: 'regeneracja', to: 'fizycznosc', weight: 0.4 },
  { from: 'odpornosc', to: 'fizycznosc', weight: 0.4 },
  { from: 'koncentracja', to: 'fizycznosc', weight: 0.4 },
  { from: 'mental', to: 'fizycznosc', weight: 0.5 },
  { from: 'mental', to: 'fizycznosc', weight: 0.3 },
  { from: 'percepcja', to: 'fizycznosc', weight: 0.6 },
  { from: 'odzywianie', to: 'fizycznosc', weight: 0.6 },
  { from: 'odzywianie', to: 'fizycznosc', weight: 0.4 },
  { from: 'decyzja', to: 'fizycznosc', weight: 0.5 },
  { from: 'tolerancja', to: 'techFund', weight: 0.3 },
  { from: 'regeneracja', to: 'techFund', weight: 0.4 },
  { from: 'regeneracja', to: 'techFund', weight: 0.3 },
  { from: 'odzywianie', to: 'techFund', weight: 0.4 },
  { from: 'odpornosc', to: 'techFund', weight: 0.3 },
  { from: 'techFund', to: 'koncentracja', weight: 0.5 },
  { from: 'koncentracja', to: 'techFund', weight: 0.5 },
  { from: 'mental', to: 'techFund', weight: 0.4 },
  { from: 'mental', to: 'techFund', weight: 0.3 },
  { from: 'techFund', to: 'percepcja', weight: 0.5 },
  { from: 'percepcja', to: 'techFund', weight: 0.5 },
  { from: 'decyzja', to: 'techFund', weight: 0.4 },
  { from: 'techFund', to: 'techSpec', weight: 0.7 },
  { from: 'regeneracja', to: 'techSpec', weight: 0.3 },
  { from: 'regeneracja', to: 'techSpec', weight: 0.3 },
  { from: 'odzywianie', to: 'techSpec', weight: 0.4 },
  { from: 'odpornosc', to: 'techSpec', weight: 0.3 },
  { from: 'koncentracja', to: 'techSpec', weight: 0.4 },
  { from: 'mental', to: 'techSpec', weight: 0.6 },
  { from: 'mental', to: 'techSpec', weight: 0.4 },
  { from: 'percepcja', to: 'techSpec', weight: 0.7 },
  { from: 'decyzja', to: 'techSpec', weight: 0.9 },
  { from: 'tolerancja', to: 'techSpec', weight: 0.4 },
  { from: 'tolerancja', to: 'odpornosc', weight: 0.4 },
  { from: 'tolerancja', to: 'koncentracja', weight: 0.3 },
  { from: 'tolerancja', to: 'mental', weight: 0.4 },
  { from: 'tolerancja', to: 'regeneracja', weight: 0.4 },
  { from: 'odzywianie', to: 'regeneracja', weight: 0.7 },
  { from: 'odpornosc', to: 'regeneracja', weight: 0.6 },
  { from: 'mental', to: 'regeneracja', weight: 0.4 },
  { from: 'odpornosc', to: 'odzywianie', weight: 0.3 },
  { from: 'mental', to: 'odzywianie', weight: 0.4 },
  { from: 'mental', to: 'odzywianie', weight: 0.3 },
  { from: 'mental', to: 'odpornosc', weight: 0.5 },
  { from: 'mental', to: 'koncentracja', weight: 0.5 },
  { from: 'decyzja', to: 'mental', weight: 0.3 },
  { from: 'decyzja', to: 'percepcja', weight: 0.2 },
];

type Cascade = { path: string[]; weight: number };

export const DEPENDENCY_CASCADES: Cascade[] = [
  { path: ['fizycznosc', 'moc', 'fizycznosc'], weight: 0.49 },
  { path: ['tolerancja', 'wytrzymalosc', 'tolerancja'], weight: 0.49 },
  { path: ['moc', 'regeneracja', 'wytrzymalosc', 'moc'], weight: 0.25 },
  { path: ['koncentracja', 'techFund', 'koncentracja'], weight: 0.25 },
  { path: ['percepcja', 'techFund', 'percepcja'], weight: 0.25 },
  { path: ['decyzja', 'moc', 'wytrzymalosc', 'moc'], weight: 0.168 },
];

const CASCADE_DAMPING = 0.75;

function pairSignificance(scores: Record<string, number>, from: string, to: string, weight: number, median: number): number {
  const a = scores[from];
  const b = scores[to];
  if (a === undefined || b === undefined) return 0;
  return Math.max(0, median - a) * Math.max(0, median - b) * weight;
}

function cascadeSignificance(scores: Record<string, number>, path: string[], weight: number, median: number): number {
  const uniqueNodes = Array.from(new Set(path));
  let product = weight * CASCADE_DAMPING;
  for (const node of uniqueNodes) {
    const val = scores[node];
    if (val === undefined) return 0;
    const weak = Math.max(0, median - val);
    if (weak === 0) return 0; // dowolny węzeł w normie => kaskada nieaktywna
    product *= weak;
  }
  return product;
}

export type Influence =
  | { kind: 'pair'; significance: number; weight: number; from: string; to: string; nodes: string[] }
  | { kind: 'cascade'; significance: number; weight: number; nodes: string[] };

export function getRankedInfluences(scores: Record<string, number>, targetId: string, limit = 3): Influence[] {
  const { median } = playerMedianAndSpread(scores);
  const results: Influence[] = [];

  for (const rec of DEPENDENCY_NETWORK) {
    if (rec.to !== targetId) continue;
    const sig = pairSignificance(scores, rec.from, rec.to, rec.weight, median);
    if (sig > 0) {
      results.push({ kind: 'pair', significance: sig, weight: rec.weight, from: rec.from, to: rec.to, nodes: [rec.from, rec.to] });
    }
  }

  for (const casc of DEPENDENCY_CASCADES) {
    if (!casc.path.includes(targetId)) continue;
    const sig = cascadeSignificance(scores, casc.path, casc.weight, median);
    if (sig > 0) {
      results.push({ kind: 'cascade', significance: sig, weight: casc.weight, nodes: Array.from(new Set(casc.path)) });
    }
  }

  results.sort((a, b) => b.significance - a.significance);
  return results.slice(0, limit);
}

/**
 * Segmenty spoza wykrytych deficytów, które mimo to są silną, strukturalną
 * przyczyną tych deficytów (Plan A z index.html). W index.html trafiają
 * wyłącznie do promptu AI — tutaj są pokazywane zawodnikowi wprost, jednym
 * zdaniem i maksymalnie jedna (patrz raport zwrotny sekcja 5).
 */
export function getHiddenCauses(
  scores: Record<string, number>,
  knownDeficits: [string, number][],
  minWeight = 0.5
): { id: string; score: number; causesFor: string[]; totalWeight: number }[] {
  const deficitIds = new Set(knownDeficits.map(([id]) => id));
  const candidates: Record<string, { id: string; score: number; causesFor: string[]; totalWeight: number }> = {};

  DEPENDENCY_NETWORK.forEach((rec) => {
    if (rec.weight < minWeight) return;
    if (!deficitIds.has(rec.to)) return;
    if (deficitIds.has(rec.from)) return;
    if (scores[rec.from] === undefined) return;
    if (!candidates[rec.from]) {
      candidates[rec.from] = { id: rec.from, score: scores[rec.from], causesFor: [], totalWeight: 0 };
    }
    candidates[rec.from].causesFor.push(rec.to);
    candidates[rec.from].totalWeight += rec.weight;
  });

  return Object.values(candidates).sort((a, b) => b.totalWeight - a.totalWeight);
}

// ─────────────────────────────────────────────────────────────
// TEKST PRZYCZYNOWY — ten sam komunikat co w index.html (renderResults ->
// causeText), rozbity na kawałki, żeby React Native mógł pogrubić nazwę
// segmentu bez wstawiania HTML-a.
//
// DWIE ŚWIADOME POPRAWKI WZGLĘDEM ORYGINAŁU (patrz raport zwrotny sekcja 5
// i 6 — index.html ma oba te defekty do dziś, ale jego nie dotykam):
//
// 1) DEDUPLIKACJA. DEPENDENCY_NETWORK zawiera powtórzone pary (from,to) o
//    różnych wagach (np. regeneracja→techSpec 0.3 dwa razy, mental→odzywianie
//    0.4 i 0.3). Ranking bierze je jako osobne pozycje, więc oryginał
//    potrafi wypisać zawodnikowi "Dodatkowy wpływ: Regeneracja, Regeneracja",
//    albo — gorzej — wymienić ten sam segment jako główną I dodatkową
//    przyczynę w jednym zdaniu. Deduplikacja po NAZWIE, z zachowaniem
//    kolejności rankingu: nie zmienia który segment wygrywa, tylko usuwa
//    powtórzenia z tekstu.
//
// 2) GRAMATYKA. Oryginał składa zdanie "słabe ${nazwa}" — w index.html
//    nazwy są krótkimi wersalikami ('TECH. FUND.'), więc czyta się to jak
//    etykietę. W appce nazwy są pełnymi słowami o różnym rodzaju, więc
//    "słabe Stan Mentalny" / "słabe Regeneracja" byłoby po prostu
//    niepoprawne. Zdanie przeformułowane tak, żeby było neutralne rodzajowo,
//    z zachowaniem KAŻDEGO elementu znaczeniowego oryginału: "główna
//    przyczyna", "słabość", "blokuje", "to objaw, nie problem sam w sobie",
//    "zacznij od".
// ─────────────────────────────────────────────────────────────

export type CauseText =
  | { kind: 'standalone'; text: string }
  | { kind: 'blocked'; before: string; primaryName: string; after: string };

export function describeCause(scores: Record<string, number>, segmentId: string): CauseText {
  const influences = getRankedInfluences(scores, segmentId, 3);
  if (!influences.length) {
    return {
      kind: 'standalone',
      text: 'Ten obszar jest samodzielnym wąskim gardłem — nie wynika z innych deficytów. Wymaga bezpośredniej pracy.',
    };
  }

  const nameOf = (inf: Influence): string =>
    inf.kind === 'cascade'
      ? inf.nodes.filter((n) => n !== segmentId).map(segmentLabel).join(' + ')
      : segmentLabel(inf.from);

  const primary = influences[0];
  const primaryName = nameOf(primary);
  const strength = primary.weight >= 0.8 ? 'bezpośrednio' : 'wyraźnie';

  const restNames: string[] = [];
  for (const inf of influences.slice(1)) {
    const n = nameOf(inf);
    if (n !== primaryName && !restNames.includes(n)) restNames.push(n);
  }

  if (restNames.length) {
    return {
      kind: 'blocked',
      before: 'Główna przyczyna: ',
      primaryName,
      after: ` — słabość w tym obszarze ${strength} blokuje to, co widzisz na boisku. Dodatkowy wpływ: ${restNames.join(', ')}. Zacznij od fundamentów — poprawa przyczyny poprawi też ten obszar.`,
    };
  }
  return {
    kind: 'blocked',
    before: 'Główna przyczyna: ',
    primaryName,
    after: ` — słabość w tym obszarze ${strength} blokuje to, co widzisz na boisku. To nie jest problem sam w sobie — to objaw. Zacznij od: ${primaryName}.`,
  };
}

// ─────────────────────────────────────────────────────────────
// GRUPOWANIE 13 OBSZARÓW — odchylenie × waga pozycyjna
// ─────────────────────────────────────────────────────────────

export type SegmentTier = 'key' | 'important' | 'minor';
export type SegmentClass = 'deficit' | 'strength' | 'neutral';
export type GroupKey = 'g1' | 'g2' | 'g3' | 'g4';

export type GroupedSegment = {
  id: string;
  name: string;
  barW: number;
  cls: SegmentClass;
  tier: SegmentTier | null;
};

export function groupSegmentsForDisplay(
  scores: Record<string, number>,
  tiers: Record<string, SegmentTier> | null
): { groups: Record<GroupKey, GroupedSegment[]>; hasTiers: boolean } {
  const { median, stdDev } = playerMedianAndSpread(scores);

  const classify = (score: number): SegmentClass => {
    const diff = score - median;
    const statSig = Math.abs(diff) > DEV_MULTIPLIER * stdDev;
    const absSig = Math.abs(diff) >= MIN_ABS_GAP;
    if (statSig && absSig) return diff > 0 ? 'strength' : 'deficit';
    return 'neutral';
  };

  const groups: Record<GroupKey, GroupedSegment[]> = { g1: [], g2: [], g3: [], g4: [] };

  // Iteracja po SEGMENT_ORDER (display_order z public.segments), nie po
  // Object.entries(scores) — kolejność kluczy w JSON-ie z bazy nie jest
  // niczym gwarantowana, a grupy g3/g4 nie mają własnego sortowania.
  for (const id of SEGMENT_ORDER) {
    const score = scores[id];
    if (score === undefined) continue;
    const cls = classify(score);
    const tier = tiers ? (tiers[id] || 'minor') : null;
    const entry: GroupedSegment = { id, name: segmentLabel(id), barW: relativeBarWidth(score, median, stdDev), cls, tier };

    if (!tiers) {
      if (cls === 'deficit') groups.g1.push(entry);
      else if (cls === 'strength') groups.g2.push(entry);
      else groups.g4.push(entry);
      continue;
    }
    if ((tier === 'key' || tier === 'important') && cls === 'deficit') groups.g1.push(entry);
    else if ((tier === 'key' || tier === 'important') && cls === 'strength') groups.g2.push(entry);
    else if (tier === 'important' || (tier === 'key' && cls === 'neutral')) groups.g3.push(entry);
    else groups.g4.push(entry);
  }

  groups.g1.sort((a, b) => scores[a.id] - scores[b.id]);
  groups.g2.sort((a, b) => scores[b.id] - scores[a.id]);

  return { groups, hasTiers: !!tiers };
}

export const GROUP_HEADINGS_WITH_POSITION: Record<GroupKey, { title: string; badge: string; desc: string }> = {
  g1: { title: 'Tu jest Twoja szansa', badge: 'PRIORYTET', desc: 'Bardzo ważne na Twojej pozycji, a jednocześnie Cię dziś ogranicza.' },
  g2: { title: 'Twoja przewaga', badge: 'WYKORZYSTAJ', desc: 'Bardzo ważne na Twojej pozycji i już dziś mocna strona.' },
  g3: { title: 'Warto wzmocnić', badge: 'ROZWIJAJ', desc: 'Ważne na Twojej pozycji. Nie pali się, ale to dobra inwestycja czasu.' },
  g4: { title: 'Solidne, drugorzędne', badge: 'W TLE', desc: 'Na Twojej pozycji to ma mniejsze znaczenie.' },
};

export const GROUP_HEADINGS_NO_POSITION: Record<GroupKey, { title: string; badge: string; desc: string }> = {
  g1: { title: 'Wąskie gardła', badge: 'DO PRACY', desc: 'Wyraźnie słabsze od reszty Twojej gry.' },
  g2: { title: 'Mocne strony', badge: 'PRZEWAGA', desc: 'Wyraźnie mocniejsze od reszty Twojej gry.' },
  g3: { title: '', badge: '', desc: '' }, // nieużywana bez karty pozycyjnej
  g4: { title: 'W normie', badge: 'STABILNIE', desc: 'Na podobnym poziomie co reszta — nic tu nie odstaje.' },
};

// ─────────────────────────────────────────────────────────────
// SCENARIUSZ + NAGŁÓWEK BEZ SUROWEJ LICZBY
// ─────────────────────────────────────────────────────────────

export type Scenario = 1 | 2 | 3;

export function detectScenario(scores: Record<string, number>, hasPositionProfile: boolean): Scenario {
  if (getRelativeDeficits(scores, 4).length > 0) return 1;
  if (hasPositionProfile) return 2;
  return 3;
}

export function scenarioHeadline(scenario: Scenario, deficitCount: number): { headline: string; desc: string } {
  if (scenario === 1) {
    return {
      headline: deficitCount === 1 ? 'Jedno wyraźne wąskie gardło' : 'Kilka wyraźnych wąskich gardeł',
      desc: 'Reszta Twojej gry jest solidna — to jest miejsce gdzie warto zacząć.',
    };
  }
  if (scenario === 2) {
    return {
      headline: 'Profil wyrównany',
      desc: 'Nic wyraźnie nie odstaje — dla Twojej pozycji największą różnicę zrobią obszary poniżej.',
    };
  }
  // Scenariusz 3 — ODSTĄPIENIE OD TEKSTU ŹRÓDŁOWEGO, patrz raport sekcja 5.
  // index.html mówi tu "Odpowiedz na pytanie w diagnozie", co odsyła do
  // diagnozy żywej — ZAMROŻONEJ 06.08.2026 (LIVING_DIAGNOSIS_PULSE_ENABLED
  // = false). Zdanie kierujące do wyłączonej funkcji byłoby ślepą uliczką,
  // więc kieruje tam, gdzie zawodnik faktycznie może coś zrobić: uzupełnić
  // pozycję w Profilu, co odblokowuje cztery grupy zamiast trzech.
  return {
    headline: 'Profil wyrównany',
    desc: 'Nic wyraźnie nie odstaje. Uzupełnij pozycję w Profilu — wtedy pokażemy, które obszary są najważniejsze akurat na Twojej roli.',
  };
}
