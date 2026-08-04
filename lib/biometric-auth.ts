// Krok 3.4 checklisty — biometryczny re-login. To warstwa "blokady appki"
// NAD już zapisaną sesją Supabase (persistSession w AsyncStorage — patrz
// lib/supabase.ts), NIE zamiennik logowania OTP. Zawodnik loguje się kodem
// OTP raz; jeśli potem włączy tę opcję w Profilu (sekcja "Bezpieczeństwo"),
// każde kolejne otwarcie appki wymaga Face ID / Touch ID / PIN urządzenia
// zamiast automatycznego wejścia na podstawie samej zapisanej sesji.
//
// Zgodnie z checklistą ("zaszyfrowany refresh token przez expo-secure-store"):
// kopia refresh tokenu trzymana OSOBNO w SecureStore (szyfrowane
// Keychain/Keystore — w przeciwieństwie do AsyncStorage, które jest zwykłym,
// nieszyfrowanym magazynem). To ścieżka AWARYJNA odzyskania sesji, gdyby
// dane AsyncStorage kiedykolwiek zniknęły mimo wciąż ważnego tokenu.
// Normalny cykl NIE korzysta z tej ścieżki — Supabase sam odtwarza sesję
// z AsyncStorage przy starcie appki; biometria to tylko bramka UI przed
// pokazaniem <Slot />.
//
// UWAGA (budowane 28.07.2026, PRZED przejściem Kroku 1.5 GATE): kod
// napisany wg oficjalnej dokumentacji expo-local-authentication /
// expo-secure-store / supabase-js v2, ale NIEPRZETESTOWANY na prawdziwym
// urządzeniu — to nastąpi dopiero przy Kroku 3.6 GATE.
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const LOCK_ENABLED_KEY = 'gc_biometric_lock_enabled';
const REFRESH_TOKEN_KEY = 'gc_biometric_refresh_token';

export async function isBiometricHardwareAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

export async function isBiometricLockEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(LOCK_ENABLED_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function enableBiometricLock(refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  await SecureStore.setItemAsync(LOCK_ENABLED_KEY, 'true');
}

export async function disableBiometricLock(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(LOCK_ENABLED_KEY).catch(() => {});
}

export async function getStoredRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

// Refresh tokeny Supabase rotują przy każdym odświeżeniu sesji — kopia w
// SecureStore musi nadążać, inaczej ścieżka awaryjna użyłaby przeterminowanego
// tokenu. Wołane z lib/auth-context.tsx przy zdarzeniu TOKEN_REFRESHED.
// Zapisuje TYLKO jeśli blokada jest już włączona (nie włącza jej samo z siebie).
export async function updateStoredRefreshToken(refreshToken: string): Promise<void> {
  const enabled = await isBiometricLockEnabled();
  if (!enabled) return;
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Odblokuj Gamechange',
      cancelLabel: 'Anuluj',
      disableDeviceFallback: false, // pozwala na PIN/hasło urządzenia jako fallback — standard iOS/Android
    });
    return result.success;
  } catch {
    return false;
  }
}
