// Ekran WIĘCEJ — NOWY, Krok 2 Toru 7 (SESJA_START_UX_MOBILE_ONBOARDING_NAWIGACJA.md).
// Menu-rozdzielacz do rzadziej odwiedzanych ekranów (Profil, Diagnoza, Mecz)
// — patrz uzasadnienie w app/(tabs)/_layout.tsx. Trasy docelowe
// (profil.tsx/diagnoza.tsx/mecz.tsx) fizycznie nietknięte — ten ekran tylko
// nawiguje do nich (`router.push`), nie zna nic o ich zawartości.
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';

const ITEMS: { href: '/profil' | '/diagnoza' | '/mecz'; label: string; hint: string }[] = [
  { href: '/profil', label: 'Profil', hint: 'Dane, pozycja, cel kierunkowy, sprzęt, tryb kontuzji' },
  { href: '/diagnoza', label: 'Diagnoza', hint: 'Status Twojej diagnozy i możliwość zrobienia nowej' },
  { href: '/mecz', label: 'Mecz', hint: 'Zapis kontekstu i przebiegu rozegranego meczu' },
];

export default function WiecejScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ padding: 20 }}>
        <Text style={styles.title}>Więcej</Text>

        {ITEMS.map((item) => (
          <TouchableOpacity key={item.href} style={styles.row} onPress={() => router.push(item.href)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowHint}>{item.hint}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Wyloguj się</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 28, marginBottom: spacing.lg, color: colors.textPrimary },
  row: {
    flexDirection: 'row', alignItems: 'center', minHeight: minTouchHeight + 12,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10,
  },
  rowLabel: { ...typography.bodySemiBold, fontSize: 15, color: colors.textPrimary, marginBottom: 2 },
  rowHint: { ...typography.body, fontSize: 12, color: colors.textSecondary },
  chevron: { fontSize: 22, color: colors.textSecondary, marginLeft: 8 },
  signOutBtn: { marginTop: spacing.lg, minHeight: minTouchHeight, justifyContent: 'center', alignItems: 'center' },
  signOutText: { ...typography.body, fontSize: 13, color: colors.textSecondary, textDecorationLine: 'underline' },
});
