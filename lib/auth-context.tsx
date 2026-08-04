// Kontekst auth — Krok 3.1/3.2 checklisty. Udostępnia sesję/usera każdemu
// ekranowi (odpowiednik currentUser z asystent_app.html: { id, email,
// accessToken }). Logika 1:1 z initApp()/handleSignedIn() w wersji webowej:
// - przy starcie: supabase.auth.getSession() — jeśli jest sesja, wejdź od razu.
// - onAuthStateChange: SIGNED_IN -> ustaw usera, SIGNED_OUT -> wyczyść.
// - profileReady retry (public.users tworzony triggerem on_auth_user_created,
//   Domena 01) — krótki retry na wypadek dziwnego porządku zdarzeń przy
//   pierwszym logowaniu, tak jak w handleSignedIn() w wersji webowej.
//
// CELOWO bez ekranu logowania w tym pliku — to osobna odpowiedzialność
// (patrz app/_layout.tsx). Ten plik tylko dostarcza stan.
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { unregisterPushToken } from './push-notifications';
import { disableBiometricLock, updateStoredRefreshToken } from './biometric-auth';

export type CurrentUser = {
  id: string;
  email: string;
  accessToken: string;
};

type AuthContextValue = {
  session: Session | null;
  currentUser: CurrentUser | null;
  loading: boolean;
  profileReady: boolean;
  refreshProfileReady: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function waitForProfileRow(userId: string, accessToken: string): Promise<boolean> {
  // Ten sam retry co handleSignedIn() w asystent_app.html: do 5 prób co 400ms.
  for (let i = 0; i < 5; i++) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .limit(1);
      if (!error && Array.isArray(data) && data.length > 0) return true;
    } catch {
      // ignorujemy pojedynczy błąd sieci w pętli retry, próbujemy dalej
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        const ready = await waitForProfileRow(session.user.id, session.access_token);
        if (mounted) setProfileReady(ready);
      }
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && newSession?.user) {
        setSession(newSession);
        const ready = await waitForProfileRow(newSession.user.id, newSession.access_token);
        if (mounted) setProfileReady(ready);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfileReady(false);
      } else if (event === 'TOKEN_REFRESHED' && newSession?.refresh_token) {
        // Krok 3.4: kopia refresh tokenu w SecureStore (blokada biometryczna)
        // musi nadążać za rotacją tokenów Supabase — patrz lib/biometric-auth.ts.
        setSession(newSession);
        updateStoredRefreshToken(newSession.refresh_token);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const currentUser: CurrentUser | null = session?.user
    ? { id: session.user.id, email: session.user.email ?? '', accessToken: session.access_token }
    : null;

  // Wystawione dla ekranu "przygotowujemy Twój profil" (patrz
  // components/ProfileNotReadyScreen.tsx) — na wypadek gdyby 5 prób co
  // 400ms w waitForProfileRow nie wystarczyło (np. wolniejsza sieć),
  // zawodnik może ręcznie sprawdzić jeszcze raz zamiast utknąć na ekranie
  // ładowania bez wyjścia.
  const refreshProfileReady = async () => {
    if (!session?.user) return;
    const ready = await waitForProfileRow(session.user.id, session.access_token);
    setProfileReady(ready);
  };

  const signOut = async () => {
    // Krok 4.6: usuń token push TEGO urządzenia przed wylogowaniem, żeby
    // kolejny zawodnik logujący się na tym samym urządzeniu nie odziedziczył
    // cudzej rejestracji push_tokens (patrz lib/push-notifications.ts).
    await unregisterPushToken();
    // Krok 3.4: to samo dotyczy blokady biometrycznej — bez tego kolejny
    // zawodnik logujący się na tym samym urządzeniu mógłby Face ID/Touch ID
    // odblokować sesję PIERWSZEGO zawodnika (dane wciąż by były w SecureStore).
    await disableBiometricLock();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, currentUser, loading, profileReady, refreshProfileReady, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth musi być używane wewnątrz <AuthProvider>');
  return ctx;
}
