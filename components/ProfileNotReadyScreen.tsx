// Ekran "przygotowujemy Twój profil" — odpowiednik komunikatu entry-error
// w handleSignedIn() z asystent_app.html. Pokazywany, gdy sesja Supabase już
// istnieje, ale wiersz public.users (tworzony triggerem on_auth_user_created,
// Domena 01) jeszcze nie zdążył powstać — zwykle trwa to ułamek sekundy,
// lib/auth-context.tsx próbuje 5x co 400ms automatycznie. Ten ekran to
// wyłącznie widoczny stan na czas tamtego okna + ręczny retry, gdyby
// zabrakło tych 5 prób (np. wolniejsza sieć).
//
// Zidentyfikowany jako brakujący w audycie 27.07.2026 (patrz komentarz w
// app/_layout.tsx), dobudowany 28.07.2026.
import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii, minTouchHeight } from '../constants/theme';

type Props = { onRetry: () => Promise<void>; onSignOut: () => void };

export default function ProfileNotReadyScreen({ onRetry, onSignOut }: Props) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    await onRetry();
    setRetrying(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator color={colors.brand} style={{ marginBottom: spacing.lg }} />
        <Text style={styles.title}>Przygotowujemy Twój profil</Text>
        <Text style={styles.hint}>To zwykle trwa ułamek sekundy. Jeśli ekran się nie zmienia dłużej niż kilka sekund, spróbuj ponownie.</Text>

        <TouchableOpacity style={[styles.btn, retrying && styles.btnDisabled]} disabled={retrying} onPress={handleRetry}>
          <Text style={styles.btnText}>{retrying ? 'Sprawdzam...' : 'Spróbuj ponownie'}</Text>
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
  title: { ...typography.bodySemiBold, fontSize: 17, color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
  hint: { ...typography.body, fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 18 },
  btn: { width: '100%', minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  signOutBtn: { marginTop: spacing.lg, minHeight: minTouchHeight, justifyContent: 'center' },
  signOutText: { ...typography.body, fontSize: 13, color: colors.textSecondary, textDecorationLine: 'underline' },
});
