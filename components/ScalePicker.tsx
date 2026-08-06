// Wspólny komponent skali 0-10 — odpowiednik renderScalePicker()/pickScale()
// z asystent_app.html. Używany w Dzienniku (sleep_hours, sleep_quality, poranny
// poziom energii, mood_motivation, rpe, post_fatigue, pain_intensity) i Meczu
// (match_rpe).
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
//
// ROZSZERZENIE 05.08.2026: min/max/step/suffix/formatValue — wszystkie
// opcjonalne, domyślne wartości (0, 10, 1, "/ {max}") odtwarzają dokładnie
// poprzednie zachowanie, więc WSZYSTKIE dotychczasowe wywołania (sleep_quality,
// morning_fatigue, mood_motivation, rpe, post_fatigue, pain_intensity,
// match_rpe) działają bez żadnej zmiany. Dodane na prośbę Kuby, żeby "Ile
// godzin spałeś?" w Dzienniku mogło używać tego samego, sprawdzonego suwaka
// zamiast pola tekstowego — patrz dziennik.tsx.
//
// ROZSZERZENIE 06.08.2026 (na prośbę Kuby — kolorowanie suwaków + wariant
// "bateria" dla porannego poziomu energii): trzy nowe, w pełni opcjonalne
// propsy, zero regresji dla wywołań, które ich nie przekazują.
// - `colorForValue(v)`: koloruje duży numer i tor suwaka wg wartości — funkcje
//   gotowe w `lib/scale-colors.ts` (gradient/progi/neutralna intensywność,
//   dobrane per pole w dziennik.tsx). Bez tego propsa: dokładnie stary,
//   jednolity kolor marki, identyczne zachowanie jak przed tą zmianą.
// - `describeValue(v)`: opcjonalny krótki opis słowny pod dużym numerem (np.
//   "Dobry poziom energii") — dodatkowa warstwa intuicyjności, używana dziś
//   tylko dla porannego poziomu energii.
// - `variant="battery"`: zamiast cienkiego paska, rysuje kształt baterii
//   (obudowa + "nub" jak prawdziwa bateria) wypełniany kolorem z
//   `colorForValue`. Pod spodem dalej ten sam, sprawdzony
//   `@react-native-community/slider` — wyłącznie JEGO WŁASNY tor jest
//   przezroczysty (`minimumTrackTintColor`/`maximumTrackTintColor` =
//   "transparent", oficjalnie wspierana wartość tej biblioteki na obu
//   platformach), więc cała logika przeciągania/dotyku jest nietknięta — to
//   dokładnie ten sam mechanizm, który Kuba już potwierdził jako wygodny w
//   dotyku (28.07/05.08.2026). Suwak (przezroczysty) leży jako ODDZIELNY
//   element NAD grafiką baterii (nie jej dzieckiem), więc `overflow:hidden`
//   grafiki (potrzebny do zaokrąglonych rogów wypełnienia) nigdy nie przytnie
//   uchwytu suwaka.
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, typography, spacing, radii } from '../constants/theme';

export default function ScalePicker({
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  suffix,
  formatValue,
  colorForValue,
  describeValue,
  variant = 'default',
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  formatValue?: (v: number) => string;
  colorForValue?: (v: number) => string;
  describeValue?: (v: number) => string;
  variant?: 'default' | 'battery';
}) {
  const displayValue = value ?? min;
  const shownValue = value === undefined ? '—' : (formatValue ? formatValue(value) : String(value));
  const shownSuffix = suffix ?? `/ ${max}`;
  const dynamicColor = colorForValue ? colorForValue(displayValue) : colors.brand;
  const fillPct = max > min ? ((displayValue - min) / (max - min)) * 100 : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.valueRow}>
        <Text style={[styles.valueText, { color: dynamicColor }]}>{shownValue}</Text>
        <Text style={styles.valueMax}>{shownSuffix}</Text>
      </View>

      {describeValue && value !== undefined && (
        <Text style={[styles.describeText, { color: dynamicColor }]}>{describeValue(value)}</Text>
      )}

      {variant === 'battery' ? (
        <View style={styles.batteryRow}>
          <View style={styles.batteryStack}>
            <View style={styles.batteryVisual} pointerEvents="none">
              <View style={[styles.batteryFill, { width: `${fillPct}%`, backgroundColor: dynamicColor }]} />
            </View>
            <Slider
              style={styles.batterySliderOverlay}
              minimumValue={min}
              maximumValue={max}
              step={step}
              value={displayValue}
              onValueChange={onChange}
              minimumTrackTintColor="transparent"
              maximumTrackTintColor="transparent"
              thumbTintColor={colors.white}
            />
          </View>
          <View style={styles.batteryNub} />
        </View>
      ) : (
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          step={step}
          value={displayValue}
          onValueChange={onChange}
          minimumTrackTintColor={dynamicColor}
          maximumTrackTintColor={colors.border}
          thumbTintColor={dynamicColor}
        />
      )}

      <View style={styles.endsRow}>
        <Text style={styles.endLabel}>{min}</Text>
        <Text style={styles.endLabel}>{max}</Text>
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
  describeText: { ...typography.bodySemiBold, fontSize: 13, textAlign: 'center', marginTop: -2, marginBottom: 6 },
  slider: { width: '100%', height: 40 },
  // Wariant "bateria" — patrz komentarz na górze pliku dla uzasadnienia
  // struktury (grafika + suwak jako niezależne, nakładające się warstwy).
  batteryRow: { flexDirection: 'row', alignItems: 'center', height: 48, marginBottom: 4 },
  batteryStack: { flex: 1, height: 48, justifyContent: 'center' },
  batteryVisual: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 10,
    bottom: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.surfaceElevated,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  batteryFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  batterySliderOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  batteryNub: { width: 6, height: 14, borderRadius: 2, backgroundColor: colors.surfaceElevated, marginLeft: 3 },
  endsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  endLabel: { ...typography.body, fontSize: 11, color: colors.textSecondary },
});
