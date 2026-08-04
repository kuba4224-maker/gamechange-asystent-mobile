// Baner "priming" PRZED systemowym oknem zgody na powiadomienia —
// mitygacja ryzyka R9 (niski opt-in przez zły moment pytania), patrz
// APLIKACJA_MOBILNA_ARCHITEKTURA_I_RYZYKA.md, rejestr ryzyk. Pokazywany
// TYLKO gdy status uprawnień to 'undetermined' i zawodnik jeszcze nie
// zamknął tego banera (logika w lib/push-notifications.ts).
//
// RESTYLE 28.07.2026 (Krok 2.3): jasny motyw -> ciemny, wg constants/theme.ts.
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, radii, minTouchHeight } from '../constants/theme';

type Props = { onEnable: () => void; onDismiss: () => void };

export default function PushPrimingBanner({ onEnable, onDismiss }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Włącz powiadomienia</Text>
      <Text style={styles.text}>
        Gamechange przypomni Ci o porannym wpisie, zalogowaniu treningu i nowych rekomendacjach —
        bez zalewu, tylko to, co faktycznie wartościowe.
      </Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss}>
          <Text style={styles.secondaryBtnText}>Nie teraz</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={onEnable}>
          <Text style={styles.btnText}>Włącz powiadomienia</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
    borderRadius: radii.md,
    padding: spacing.md,
    margin: spacing.md,
    marginBottom: 0,
  },
  title: { ...typography.bodySemiBold, fontSize: 15, color: colors.textPrimary, marginBottom: 6 },
  text: { ...typography.body, fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 18 },
  row: { flexDirection: 'row', gap: spacing.sm },
  secondaryBtn: {
    flex: 1, minHeight: minTouchHeight, justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.sm, alignItems: 'center',
  },
  secondaryBtnText: { ...typography.bodyMedium, fontSize: 13, color: colors.textPrimary },
  btn: {
    flex: 1, minHeight: minTouchHeight, justifyContent: 'center',
    backgroundColor: colors.brand, borderRadius: radii.sm, alignItems: 'center',
  },
  btnText: { ...typography.bodySemiBold, fontSize: 13, color: colors.white },
});
