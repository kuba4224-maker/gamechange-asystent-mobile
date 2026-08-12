// Karta "diagnozy żywej" (Funkcja 10, część 2) — INTEGRACJA_DIAGNOZA_ZYWA.md,
// decyzje 2-4. Wstawiana na ekranie Dziś (app/(tabs)/dzis.tsx), między kartą
// rekomendacji a kartą kalendarza. Renderuje SIĘ SAMĄ w null, gdy pulse nie
// jest dziś należny — dzięki temu ekran Dziś nic nie musi wiedzieć o
// wewnętrznej logice kaskady/harmonogramu, tylko wstawia komponent.
//
// Jedno pytanie na raz (qs[0] segmentu, wariant pozycyjny jeśli dotyczy),
// odpowiedź natychmiast zapisuje pulse i chowa kartę. Pominięcie NIE
// zapisuje nic w bazie (patrz lib/livingDiagnosisPulses.ts) — tylko chowa
// kartę na czas tej sesji ekranu.
import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/auth-context';
import { colors, typography, spacing, radii, minTouchHeight } from '../constants/theme';
import { selectSegmentForLivingDiagnosis, isPulseDueToday } from '../lib/livingDiagnosisCascade';
import { fetchPlayerLivingDiagnosisContext, saveLivingDiagnosisPulse } from '../lib/livingDiagnosisPulses';
import { resolveLivingDiagnosisWording, LIVING_DIAGNOSIS_QUESTION_BANK } from '../lib/livingDiagnosisQuestionBank';
import { getPositionWordingKey } from '../lib/positionProfiles';

// ⛔ ZAMROŻONE 06.08.2026 (decyzja Kuby po audycie wartości produktu).
// Cała mechanika (kaskada, bank pytań, zapis do living_diagnosis_pulses) zostaje
// nietknięta — wyłączone jest wyłącznie WYŚWIETLANIE karty na ekranie Dziś.
//
// Powód: puls zbierał odpowiedzi co ~3 dni, a `response_value` nie było czytane
// nigdzie w produkcie — nie zmieniało rekomendacji, obrazu formy ani niczego, co
// zawodnik widzi. Przy pięciu równoległych kanałach pytań (dziennik poranny,
// dziennik potreningowy, puls, check-in Bloku Skupienia, ankieta meczowa) to był
// podatek uwagi bez zwrotu — najdroższy przy nastolatku w pilotażu.
//
// ŻEBY WŁĄCZYĆ Z POWROTEM: ustaw flagę na `true`. Zrób to dopiero wtedy, gdy
// odpowiedzi z pulsu będą realnie coś zmieniać i zawodnik będzie to widział.
// Przy okazji włączania napraw dwie rzeczy opisane w audycie:
//   • karta w fazie 'done' ("Dzięki, zapisano.") nie znika do restartu appki,
//     bo ekrany w Tabs się nie odmontowują — powinna być toastem albo `null`;
//   • pominięcie nie jest nigdzie zapamiętywane, więc zawodnik, który zawsze
//     pomija, dostaje to samo pytanie przy każdym zimnym starcie w nieskończoność.
const LIVING_DIAGNOSIS_PULSE_ENABLED = false;

const SCALE: [number, string][] = [
  [1, 'Prawie nigdy'], [2, 'Rzadko'], [3, 'Raczej rzadko'],
  [4, 'Raczej często'], [5, 'Często'], [6, 'Prawie zawsze'],
];

type PendingPulse = { segmentId: string; segmentName: string; t: string; ctx: string };
type Phase = 'loading' | 'none' | 'pending' | 'saving' | 'done' | 'skipped' | 'error';

export default function LivingDiagnosisPulseCard() {
  const { currentUser } = useAuth();
  const [phase, setPhase] = useState<Phase>('loading');
  const [pending, setPending] = useState<PendingPulse | null>(null);

  const load = useCallback(async () => {
    if (!LIVING_DIAGNOSIS_PULSE_ENABLED) { setPhase('none'); return; }
    if (!currentUser) return;
    setPhase('loading');
    try {
      const { context, lastAnyPulseAt } = await fetchPlayerLivingDiagnosisContext(currentUser.id);
      const now = new Date();
      if (!isPulseDueToday(lastAnyPulseAt, now)) {
        setPhase('none');
        return;
      }
      const selection = selectSegmentForLivingDiagnosis(context, now);
      if (!selection) {
        // Wszystkie 13 segmentów "świeże" (mało prawdopodobne przy
        // zalecanym tempie, ale możliwe) — po prostu brak pulsu dziś.
        setPhase('none');
        return;
      }
      const seg = LIVING_DIAGNOSIS_QUESTION_BANK[selection.segmentId];
      const wordingKey = getPositionWordingKey(context.profilePosition);
      const wording = resolveLivingDiagnosisWording(selection.segmentId, wordingKey);
      if (!seg || !wording) {
        setPhase('none'); // zabezpieczenie, nie powinno się zdarzyć przy pełnym banku
        return;
      }
      setPending({ segmentId: selection.segmentId, segmentName: seg.name, t: wording.t, ctx: wording.ctx });
      setPhase('pending');
    } catch {
      // Cichy fallback — diagnoza żywa jest mechanizmem w tle, błąd nie
      // powinien blokować ani straszyć banerem reszty ekranu Dziś.
      setPhase('none');
    }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  const answer = async (value: number) => {
    if (!currentUser || !pending) return;
    setPhase('saving');
    const { error } = await saveLivingDiagnosisPulse(currentUser.id, pending.segmentId, value);
    setPhase(error ? 'error' : 'done');
  };

  const skip = () => setPhase('skipped');

  if (!LIVING_DIAGNOSIS_PULSE_ENABLED) return null;
  if (phase === 'loading' || phase === 'none' || phase === 'skipped') return null;

  if (phase === 'done') {
    return (
      <View style={[styles.card, styles.cardMuted]}>
        <Text style={styles.cardBody}>Dzięki, zapisano.</Text>
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <View style={[styles.card, styles.cardMuted]}>
        <Text style={styles.cardBody}>Nie udało się zapisać — spróbujemy przy najbliższej okazji.</Text>
      </View>
    );
  }

  if (!pending) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>{pending.segmentName}</Text>
      <Text style={styles.questionText}>{pending.t}</Text>
      <Text style={styles.ctxText}>{pending.ctx}</Text>
      {phase === 'saving' ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.md }} />
      ) : (
        <>
          <View style={styles.scaleGrid}>
            {SCALE.map(([value, label]) => (
              <TouchableOpacity key={value} style={styles.scaleBtn} onPress={() => answer(value)}>
                <Text style={styles.scaleNum}>{value}</Text>
                <Text style={styles.scaleLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.skipLink} onPress={skip}>
            <Text style={styles.skipLinkText}>Zapytaj innym razem</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 16, marginBottom: 10 },
  cardMuted: { opacity: 0.7 },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 8 }, // W1: ink3
  questionText: { ...typography.bodySemiBold, fontSize: 15, color: colors.textPrimary, marginBottom: 6, lineHeight: 21 },
  ctxText: { ...typography.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.md },
  cardBody: { ...typography.body, fontSize: 14, color: colors.textSecondary },
  scaleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scaleBtn: { width: '31%', minHeight: minTouchHeight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background, paddingVertical: 8 },
  scaleNum: { ...typography.bodySemiBold, fontSize: 16, color: colors.textPrimary },
  scaleLabel: { ...typography.body, fontSize: 10, color: colors.textSecondary, textAlign: 'center', marginTop: 2 },
  skipLink: { marginTop: spacing.md, alignItems: 'center', minHeight: minTouchHeight, justifyContent: 'center' },
  skipLinkText: { ...typography.body, fontSize: 13, color: colors.textSecondary },
});
