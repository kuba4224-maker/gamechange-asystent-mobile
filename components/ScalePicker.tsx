// Wspólny komponent skali 0-10 — odpowiednik renderScalePicker()/pickScale()
// z asystent_app.html. Używany w Dzienniku (sleep_quality, morning_fatigue,
// mood_motivation, rpe, post_fatigue, pain_intensity) i Meczu (match_rpe).
//
// RESTYLE 28.07.2026 (Krok 2.3): pierwsza wersja miała 11 małych przycisków
// (~30px każdy — na granicy trafienia kciukiem, kopiowane 1:1 z web, gdzie
// dotyka się myszką, nie palcem). Krok 2.3 checklisty wprost wymaga
// przeprojektowania tej kontrolki — "suwak z jednym uchwytem albo 5
// większych segmentów po 2 wartości". Wybrany wariant: suwak (jeden duży,
// łatwy do trafienia uchwyt, wartość 0-10 skokowo co 1) — pełna precyzja
// (11 wartości), bez kompromisu partycjonowania nieparzystej liczby wartości
// w pary. Duża liczba nad suwakiem pokazuje aktualnie wybraną wartość
// (Barlow Condensed, zgodnie z typografią Kroku 2.3).
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, typography, spacing, radii } from '../constants/theme';

export default function ScalePicker({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const displayValue = value ?? 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.valueRow}>
        <Text style={styles.valueText}>{value ?? '—'}</Text>
        <Text style={styles.valueMax}>/ 10</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={10}
        step={1}
        value={displayValue}
        onValueChange={onChange}
        minimumTrackTintColor={colors.brand}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.brand}
      />
      <View style={styles.endsRow}>
        <Text style={styles.endLabel}>0</Text>
        <Text style={styles.endLabel}>10</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  valueText: { ...typography.display, fontSize: 34, color: colors.brand },
  valueMax: { ...typography.body, fontSize: 14, color: colors.textSecondary, marginBottom: 6 },
  slider: { width: '100%', height: 40 },
  endsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  endLabel: { ...typography.body, fontSize: 11, color: colors.textSecondary },
});
