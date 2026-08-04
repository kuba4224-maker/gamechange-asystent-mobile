// Ekran blokady biometrycznej — Krok 3.4 checklisty. Pokazywany zamiast
// <Slot /> w app/_layout.tsx, gdy zawodnik ma już aktywną sesję (zalogowany
// wcześniej kodem OTP) ORAZ włączył blokadę Face ID/Touch ID w Profilu
// (sekcja "Bezpieczeństwo"). Logika w lib/biometric-auth.ts.
//
// UWAGA: budowane 28.07.2026, PRZED przejściem Kroku 1.5 GATE — nieprzetestowane
// na prawdziwym urządzeniu (dopiero Krok 3.6 GATE).
import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii, minTouchHeight } from '../constants/theme';
import { authenticateWithBiometrics } from '../lib/biometric-auth';

type Props = { onUnlock: () => void; onSignOut: () => void };

export default function BiometricLockScreen({ onUnlock, onSignOut }: Props) {
  const [attempting, setAttempting] = useState(false);
  const [failed, setFailed] = useState(false);

  const tryUnlock = useCallback(async () => {
    setAttempting(true);
    setFailed(false);
    const ok = await authenticateWithBiometrics();
    setAttempting(false);
    if (ok) {
      onUnlock();
    } else {
      setFailed(true);
    }
  }, [onUnlock]);

  // Poproś od razu przy wejściu na ekran — zawodnik nie musi dodatkowo
  // dotykać przycisku, żeby zobaczyć systemowy prompt Face ID/Touch ID.
  useEffect(() => { tryUnlock(); }, [tryUnlock]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Gamechange</Text>
        <Text style={styles.subtitle}>Zablokowane</Text>
        <Text style={styles.hint}>
          {failed
            ? 'Nie udało się potwierdzić tożsamości. Spróbuj ponownie.'
            : 'Potwierdź tożsamość, żeby wejść do appki.'}
        </Text>

        <TouchableOpacity style={[styles.btn, attempting && styles.btnDisabled]} disabled={attempting} onPress={tryUnlock}>
          <Text style={styles.btnText}>{attempting ? 'Sprawdzam...' : 'Odblokuj'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutBtn} onPress={onSignOut}>
          <Text style={styles.signOutText}>Wyloguj się</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  title: { ...typography.displayExtraBold, fontSize: 32, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.bodyMedium, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: spacing.lg },
  hint: { ...typography.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 20 },
  btn: { width: '100%', minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  signOutBtn: { marginTop: spacing.lg, minHeight: minTouchHeight, justifyContent: 'center' },
  signOutText: { ...typography.body, fontSize: 13, color: colors.textSecondary, textDecorationLine: 'underline' },
});
