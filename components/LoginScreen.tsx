// Ekran logowania — odpowiednik #view-login w asystent_app.html.
//
// AUDYT 27.07.2026: przepisane z magic linku na kod OTP (6 cyfr) — patrz
// uzasadnienie w lib/supabase.ts. Dwuetapowy formularz:
// 1) email -> supabase.auth.signInWithOtp({ email }) wysyła e-mail z kodem
//    (ten sam mechanizm co magic link pod spodem, ta sama treść e-maila —
//    UWAGA dla Kuby: szablon e-maila "Magic Link" w Supabase Dashboard musi
//    zawierać {{ .Token }} żeby użytkownik w ogóle widział kod, nie tylko
//    link — patrz PROCEDURA_KROK_PO_KROK.md, sekcja o szablonie e-maila).
// 2) kod -> supabase.auth.verifyOtp({ email, token: kod, type: 'email' }) —
//    sukces ustawia sesję automatycznie w kliencie supabase (ten sam obiekt
//    zaimportowany z lib/supabase.ts, ta sama pamięć AsyncStorage).
//
// Zachowane z oryginalnego kontraktu: walidacja "email musi zawierać @",
// przycisk disabled + tekst "Wysyłam..."/"Loguję..." w trakcie wywołania,
// te same komunikaty błędów w tym samym stylu ("Nie udało się ... : " + msg).
// AUDYT 27.07.2026: owinięte w SafeAreaView (patrz app/_layout.tsx) — bez
// tego tytuł "Zaloguj się" renderowałby się tuż pod notchem/paskiem statusu.
// RESTYLE 28.07.2026 (Krok 2.3): jasny motyw -> ciemny, wg constants/theme.ts.
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, typography, spacing, radii, minTouchHeight } from '../constants/theme';

const RESEND_COOLDOWN_SECONDS = 30; // Supabase rate-limit to 60s/wysyłkę — margines bezpieczeństwa

export default function LoginScreen() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    const interval = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) { clearInterval(interval); return 0; }
        return v - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    setError(null);
    if (!email || !email.includes('@')) {
      setError('Podaj prawidłowy adres email.');
      return;
    }
    setSending(true);
    const { error: authError } = await supabase.auth.signInWithOtp({ email });
    setSending(false);
    if (authError) {
      setError('Nie udało się wysłać kodu: ' + authError.message);
    } else {
      setStep('code');
      setInfo('Wysłaliśmy kod logowania na Twój email. Sprawdź skrzynkę i wpisz go poniżej.');
      startCooldown();
    }
  };

  const handleVerifyCode = async () => {
    setError(null);
    // AUDYT 28.07.2026: Supabase (GOTRUE_MAILER_OTP_LENGTH, ustawienie
    // projektu) NIE zawsze generuje kod 6-cyfrowy — w tym projekcie
    // wysyła 8 cyfr, mimo że web/wcześniejszy kod zakładał sztywno 6.
    // Walidacja MUSI być luźniejsza niż to, czego faktycznie broni
    // serwer (supabase.auth.verifyOtp) — nie zgadujemy dokładnej
    // długości, tylko sprawdzamy sensowny zakres.
    if (!code || code.trim().length < 6 || code.trim().length > 10) {
      setError('Podaj kod logowania z emaila.');
      return;
    }
    setVerifying(true);
    const { error: authError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    });
    setVerifying(false);
    if (authError) {
      setError('Nieprawidłowy lub wygasły kod: ' + authError.message);
    }
    // Sukces: onAuthStateChange w lib/auth-context.tsx przełączy appkę
    // automatycznie na widok zalogowany — nic więcej nie trzeba tu robić.
  };

  const handleChangeEmail = () => {
    setStep('email');
    setCode('');
    setError(null);
    setInfo(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Zaloguj się</Text>

      {step === 'email' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Twój email"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity style={[styles.btn, sending && styles.btnDisabled]} disabled={sending} onPress={handleSendCode}>
            <Text style={styles.btnText}>{sending ? 'Wysyłam...' : 'Wyślij kod logowania'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.emailLabel}>Kod wysłany na: {email}</Text>
          <TextInput
            style={styles.input}
            placeholder="Kod logowania"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            maxLength={10}
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity style={[styles.btn, verifying && styles.btnDisabled]} disabled={verifying} onPress={handleVerifyCode}>
            <Text style={styles.btnText}>{verifying ? 'Loguję...' : 'Zaloguj się'}</Text>
          </TouchableOpacity>
          <View style={styles.secondaryRow}>
            <TouchableOpacity onPress={handleChangeEmail}>
              <Text style={styles.linkText}>Zmień email</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={resendCooldown > 0 || sending} onPress={handleSendCode}>
              <Text style={[styles.linkText, (resendCooldown > 0 || sending) && styles.linkTextDisabled]}>
                {resendCooldown > 0 ? `Wyślij ponownie (${resendCooldown}s)` : 'Wyślij ponownie'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {info && <Text style={styles.ok}>{info}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, paddingTop: 40, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 32, marginBottom: spacing.lg, color: colors.textPrimary },
  emailLabel: { ...typography.body, fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
  input: {
    width: '100%', minHeight: minTouchHeight, padding: 12, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, backgroundColor: colors.surface,
    fontSize: 15, marginBottom: spacing.md, color: colors.textPrimary,
  },
  btn: { width: '100%', minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  secondaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  linkText: { ...typography.body, fontSize: 13, color: colors.textPrimary, textDecorationLine: 'underline' },
  linkTextDisabled: { color: colors.textSecondary, textDecorationLine: 'none' },
  ok: { color: colors.success, fontSize: 13, marginTop: spacing.md },
  error: { color: colors.error, fontSize: 13, marginTop: spacing.sm },
});
