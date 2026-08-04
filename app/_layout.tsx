// Root layout — Krok 3.1/3.2 checklisty:
// 1) AuthProvider (lib/auth-context.tsx) udostępnia sesję każdemu ekranowi.
// 2) Brama: bez sesji -> LoginScreen (odpowiednik #view-login), z sesją ->
//    <Slot /> (renderuje app/(tabs) z natywnym paskiem zakładek).
//
// AUDYT 27.07.2026: USUNIĘTA obsługa deep linku po magic linku (parsowanie
// `#access_token=...&refresh_token=...` z URL) — logowanie przepisane na kod
// OTP (patrz components/LoginScreen.tsx + lib/supabase.ts), więc appka nigdy
// nie jest "otwierana z zewnątrz" przy logowaniu i nie potrzebuje już
// nasłuchiwać na `gamechange://auth-callback`. Jeśli w przyszłości pojawi
// się inny powód do deep linków (np. link z powiadomienia push prowadzący
// do konkretnego ekranu), to osobna, nowa funkcjonalność — nie wraca się do
// tego tylko z tego powodu.
//
// Krok 3.4 (28.07.2026): biometryczny re-login DODANY — logika w
// lib/biometric-auth.ts, ekran w components/BiometricLockScreen.tsx,
// przełącznik włącz/wyłącz w Profilu (sekcja "Bezpieczeństwo"). Niżej w
// RootGate: gdy sesja istnieje ORAZ blokada jest włączona, pokazuje
// BiometricLockScreen zamiast <Slot />. NIEPRZETESTOWANE na urządzeniu —
// dopiero Krok 3.6 GATE.
//
// (28.07.2026, kontynuacja): ekran "ładowania profilu" gdy profileReady=false
// DODANY — components/ProfileNotReadyScreen.tsx, z ręcznym retry
// (auth-context.tsx: refreshProfileReady) na wypadek gdyby standardowe 5
// prób co 400ms nie wystarczyło.
//
// Krok 4.6 checklisty (powiadomienia push): usePushRegistration() rejestruje
// token push gdy uprawnienie już przyznane, i pokazuje PushPrimingBanner
// (patrz lib/push-notifications.ts) gdy jeszcze nie pytano — nad <Slot />,
// żeby był widoczny niezależnie od tego, na której zakładce jest zawodnik.
//
// AUDYT 27.07.2026 (kontynuacja): `SafeAreaProvider` dodany na samym korzeniu
// appki — każdy z 7 ekranów + LoginScreen owinięty w `SafeAreaView`.
//
// RESTYLE 28.07.2026 (Krok 2.3 — fundament wizualny, ustalony PO napisaniu
// pierwszej wersji tego ekranu): appka miała jasne tło (#f5f2ec, 1:1 z
// asystent_app.html) — teraz tryb ciemny jako jedyny, wg constants/theme.ts.
// Dodane: ładowanie fontów (Barlow Condensed + Inter, Krok 2.3) przez
// expo-font, i expo-splash-screen zostaje widoczny dopóki fonty się nie
// załadują, żeby uniknąć "mignięcia" appki bez fontów przy starcie.
//
// KROK 1 TORU 7 (30.07.2026, SESJA_START_UX_MOBILE_ONBOARDING_NAWIGACJA.md):
// onboarding pierwszego uruchomienia DODANY — components/OnboardingFlow.tsx,
// znacznik w lib/onboarding.ts (player_profiles.onboarding_completed_at,
// Supabase, nie tylko lokalnie — przetrwa zmianę urządzenia/reinstalację).
// W RootGate: gdy sesja+profil gotowe ORAZ onboarding jeszcze nie widziany,
// pokazuje OnboardingFlow zamiast PushPrimingBanner+<Slot />. Ostatni ekran
// onboardingu (powiadomienia) używa DOKŁADNIE tego samego
// requestPermission/dismissPriming z usePushRegistration() co
// PushPrimingBanner poniżej — zero duplikacji mechanizmu proszenia o zgodę,
// tylko druga, kontekstowa "wejściówka" do tej samej logiki.
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { usePushRegistration } from '../lib/push-notifications';
import { isBiometricLockEnabled } from '../lib/biometric-auth';
import { getOnboardingSeen, markOnboardingSeen } from '../lib/onboarding';
import LoginScreen from '../components/LoginScreen';
import PushPrimingBanner from '../components/PushPrimingBanner';
import BiometricLockScreen from '../components/BiometricLockScreen';
import ProfileNotReadyScreen from '../components/ProfileNotReadyScreen';
import OnboardingFlow from '../components/OnboardingFlow';
import { colors } from '../constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootGate() {
  const { session, loading, currentUser, profileReady, refreshProfileReady, signOut } = useAuth();
  const { showPriming, requestPermission, dismissPriming } = usePushRegistration(currentUser);

  // Krok 3.4 — blokada biometryczna. `null` = jeszcze nie sprawdzono (świeża
  // sesja albo dopiero co się pojawiła); sprawdzane RAZ na pojawienie się
  // sesji, nie przy każdym renderze — włączenie/wyłączenie opcji w Profilu
  // w trakcie trwającej sesji celowo NIE blokuje appki od razu, dopiero przy
  // następnym zimnym starcie (standardowe zachowanie "app lock").
  const [locked, setLocked] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) { setLocked(null); return; }
    let mounted = true;
    isBiometricLockEnabled().then((enabled) => { if (mounted) setLocked(enabled); });
    return () => { mounted = false; };
  }, [session]);

  // Krok 1 Toru 7 — onboarding. `null` = jeszcze nie sprawdzono. Sprawdzane
  // dopiero gdy profil jest gotowy (profileReady) — brak sensu odpytywać
  // player_profiles wcześniej, bo waitForProfileRow w auth-context.tsx i tak
  // jeszcze nie skończył. Reset do `null` przy zniknięciu sesji/wylogowaniu,
  // ten sam wzorzec co `locked` wyżej.
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    if (!currentUser || !profileReady) { setOnboardingSeen(null); return; }
    let mounted = true;
    getOnboardingSeen(currentUser.id).then((seen) => { if (mounted) setOnboardingSeen(seen); });
    return () => { mounted = false; };
  }, [currentUser, profileReady]);

  if (loading || (session && locked === null)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (locked) {
    return <BiometricLockScreen onUnlock={() => setLocked(false)} onSignOut={signOut} />;
  }

  if (!profileReady) {
    return <ProfileNotReadyScreen onRetry={refreshProfileReady} onSignOut={signOut} />;
  }

  if (onboardingSeen === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!onboardingSeen) {
    return (
      <OnboardingFlow
        onFinish={() => setOnboardingSeen(true)}
        requestPushPermission={async () => {
          await requestPermission();
          if (currentUser) await markOnboardingSeen(currentUser.id);
        }}
        dismissPushPriming={async () => {
          await dismissPriming();
          if (currentUser) await markOnboardingSeen(currentUser.id);
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {showPriming && <PushPrimingBanner onEnable={requestPermission} onDismiss={dismissPriming} />}
      <Slot />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'BarlowCondensed-Bold': BarlowCondensed_700Bold,
    'BarlowCondensed-ExtraBold': BarlowCondensed_800ExtraBold,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  // AUDYT 28.07.2026: awaryjny limit czasu na ładowanie fontów. Bez tego,
  // jeśli `useFonts` z jakiegokolwiek powodu nigdy nie rozstrzygnie (ani
  // `fontsLoaded`, ani `fontError`) — co zaobserwowano na urządzeniu Kuby,
  // appka utyka na zawsze na ekranie ładowania Expo Go (`return null`
  // niżej nigdy się nie kończy, więc React Native nigdy nie renderuje
  // pierwszej realnej klatki). Po 4s appka rusza dalej i tak, nawet bez
  // fontów niestandardowych — React Native po cichu użyje fontu
  // systemowego zamiast 'BarlowCondensed-Bold' itd., appka wygląda gorzej,
  // ale DZIAŁA, zamiast wisieć w nieskończoność na białym ekranie.
  const [fontTimedOut, setFontTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const fontsSettled = fontsLoaded || !!fontError || fontTimedOut;

  useEffect(() => {
    if (fontsSettled) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsSettled]);

  if (!fontsSettled) {
    return null; // splash zostaje widoczny, maks. 4s
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.background} />
      <AuthProvider>
        <RootGate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
