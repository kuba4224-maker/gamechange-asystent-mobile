// Krok 4.6 checklisty — rejestracja tokenu push. NOWA funkcjonalność, BEZ
// odpowiednika w asystent_app.html/web (PWA ma tylko szkielet pod web
// push/VAPID, którego architektura mobilna świadomie NIE używa — patrz
// APLIKACJA_MOBILNA_ARCHITEKTURA_I_RYZYKA.md, sekcja 0, akapit o VAPID).
// Dlatego ten plik nie ma "kontraktu zachowania" spisanego z web —
// zaprojektowany od zera wg checklisty (Krok 4.5-4.6) i architektury
// (sekcja 6.3): expo-notifications skonfigurowany pod bezpośrednie FCM V1
// (NIE przekaźnik Expo Push Service), token zapisywany do ISTNIEJĄCEJ
// tabeli push_tokens (Domena 09, asystent_sportowca_09_powiadomienia.sql —
// zero zmian w schemacie).
//
// Ekran "priming" PRZED systemowym oknem zgody (mitygacja ryzyka R9 —
// niski opt-in przy złym momencie pytania) — UI w
// components/PushPrimingBanner.tsx, wpięty w app/_layout.tsx. Ten plik to
// wyłącznie logika (permission/token/upsert/cleanup), bez UI.
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import type { CurrentUser } from './auth-context';

const PRIMING_DISMISSED_KEY = 'gc_push_priming_dismissed';
const LAST_TOKEN_KEY = 'gc_push_last_token';

// AUDYT 28.07.2026 (znaleziony przy diagnozowaniu appki wiszącej na
// zawsze na ekranie ładowania na urządzeniu Kuby, Krok 1.5 GATE):
// `expo-notifications` remote push jest CAŁKOWICIE usunięte z Expo Go od
// SDK 53 (patrz ostrzeżenie tego modułu w terminalu). Wywoływanie API
// push (setNotificationHandler, getPermissionsAsync, getDevicePushTokenAsync
// itd.) w Expo Go — zamiast w prawdziwym development buildzie — może się
// zawiesić/zachować nieprzewidywalnie zamiast po prostu rzucić czytelny
// błąd, bo to ścieżka natywna świadomie wyłączona przez sam Expo, nie
// nasz kod. `setNotificationHandler` wcześniej wołane było BEZWARUNKOWO
// na poziomie modułu (import time) — wykonywało się natychmiast przy
// starcie appki, ZANIM cokolwiek innego (w tym drzewo Reacta) zdążyło się
// zamontować. Teraz cały moduł jest cichy w Expo Go — testowanie push i
// tak wymaga development buildu (Krok 4.10/5.2 checklisty), nie Expo Go,
// więc nic tu nie tracimy, blokując się na tym teraz.
//
// POPRAWKA 29.07.2026 (Cowork, samodzielnie, po zgłoszeniu Kuby "znowu
// się nie ładuje" w Expo Go — ten sam OBJAW co przy audycie 28.07.2026):
// `Constants.appOwnership` jest OFICJALNIE usunięte w większości przez
// expo-constants ("Remove most of Constants.appOwnership", changelog
// wersji 16.0.0, kwiecień 2024) i formalnie deprecated od wersji 17.0.0
// — SDK 54 (ta appka) korzysta z dużo nowszej wersji expo-constants niż
// 16/17, więc `Constants.appOwnership === 'expo'` bardzo prawdopodobnie
// ZAWSZE zwracał false, nawet w prawdziwym Expo Go — czyli guard z
// audytu 28.07 realnie NIC nie blokował, mimo że wyglądał poprawnie.
// Zweryfikowane wprost w oficjalnej dokumentacji Expo (docs.expo.dev/
// versions/latest/sdk/constants/), nie zgadywane z pamięci. Zamiennik:
// `Constants.executionEnvironment === ExecutionEnvironment.StoreClient`
// — UWAGA, ta wartość obejmuje WEDŁUG DOKUMENTACJI zarówno Expo Go JAK
// I development build (`expo-dev-client`) — nie da się ich rozróżnić
// tym jednym polem. Świadomie zaakceptowane tutaj: dziś (Krok 5.1
// jeszcze nie wykonany) liczy się wyłącznie odróżnienie od Expo Go, więc
// nadmiarowe blokowanie w przyszłym dev-buildzie nie ma dziś znaczenia
// — ALE gdy Kuba przejdzie do testowania na dev buildzie (Krok 4.10/5.2)
// i push nadal się nie zarejestruje, TO JEST PIERWSZE MIEJSCE DO
// SPRAWDZENIA — trzeba będzie doprecyzować ten warunek (np. przez
// dodanie `expo-application` i porównanie Application.applicationId z
// `host.exp.exponent`, jedynym stałym identyfikatorem samego Expo Go).
//
// DIAGNOSTYKA TYMCZASOWA z 29.07.2026 (wymuszenie `isExpoGo = true` na
// sztywno, żeby bisekcją sprawdzić czy ten moduł jest przyczyną
// zawieszania appki) PRZYWRÓCONA do docelowej poprawki 29.07.2026
// (audyt Cowork, wieczór) — prawdziwa przyczyna zawieszania appki
// okazała się być czymś zupełnie innym (brakujący `app/index.tsx`, patrz
// `claude/SESJA_29_07_2026_MECZ_WDROZENIE_STATUS.md` i sekcja alarmowa
// "część 4" w tym dokumencie), więc sztywne `true` nie było już
// potrzebne i tylko wyłączało całą rejestrację push bez powodu — na
// żywym urządzeniu Kuby zostało jednak przypadkiem nigdy nie cofnięte.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    // NAPRAWA 06.08.2026: `expo-notifications` (dziś ~0.32.17) podzielił
    // dawne `shouldShowAlert` na dwa osobne pola — `shouldShowBanner`
    // (powiadomienie "na górze ekranu" gdy appka jest otwarta) i
    // `shouldShowList` (obecność w centrum powiadomień systemu). Typ
    // `NotificationBehavior` w tej wersji biblioteki WYMAGA obu — ich brak
    // to błąd typów (znaleziony `npx tsc --noEmit`), nie zmiana logiki:
    // oba ustawione na `true`, żeby zachować dokładnie to samo zachowanie,
    // co dawne `shouldShowAlert: true` (widoczne w obu miejscach).
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Gamechange',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

// Surowy token urządzenia (FCM na Androidzie, APNs na iOS) — CELOWO
// getDevicePushTokenAsync(), NIE getExpoPushTokenAsync(): appka wysyła
// bezpośrednio przez firebase-admin (FCM V1, patrz architektura 6.3),
// nie przez przekaźnik Expo Push Service. Ten sam surowy token trafia
// 1:1 do push_tokens.token, który api_send_push.js woła przez
// firebase-admin messaging().sendEachForMulticast().
async function getDeviceToken(): Promise<string | null> {
  try {
    const result = await Notifications.getDevicePushTokenAsync();
    return result.data;
  } catch (e) {
    console.warn('push-notifications: nie udało się pobrać tokenu urządzenia:', e);
    return null;
  }
}

async function upsertToken(userId: string, token: string) {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, platform, last_seen_at: new Date().toISOString() },
      { onConflict: 'token' }
    );
  if (error) {
    console.warn('push-notifications: nie udało się zapisać tokenu push:', error.message);
    return;
  }
  await AsyncStorage.setItem(LAST_TOKEN_KEY, token);
}

// Wołane przy wylogowaniu (patrz lib/auth-context.tsx signOut) — usuwa
// WŁASNY wiersz push_tokens tego urządzenia, żeby kolejny użytkownik
// logujący się na tym samym urządzeniu nie odziedziczył cudzej
// rejestracji (patrz komentarz w Domenie 09 SQL o poprawnym przepływie
// zmiany użytkownika na tym samym urządzeniu — token unikalny globalnie).
export async function unregisterPushToken() {
  try {
    const token = await AsyncStorage.getItem(LAST_TOKEN_KEY);
    if (!token) return;
    await supabase.from('push_tokens').delete().eq('token', token);
    await AsyncStorage.removeItem(LAST_TOKEN_KEY);
  } catch (e) {
    console.warn('push-notifications: nie udało się usunąć tokenu push przy wylogowaniu:', e);
  }
}

export function usePushRegistration(currentUser: CurrentUser | null) {
  const [showPriming, setShowPriming] = useState(false);

  const registerIfGranted = useCallback(async () => {
    if (!currentUser) return;
    // AUDYT 28.07.2026: ta sama przyczyna co przy module-level guardzie wyżej —
    // w Expo Go te wywołania są niewspierane, więc w ogóle ich nie odpalamy.
    if (isExpoGo) return;
    await ensureAndroidChannel();
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') {
      const token = await getDeviceToken();
      if (token) await upsertToken(currentUser.id, token);
      setShowPriming(false);
      return;
    }
    if (status === 'undetermined') {
      const dismissed = await AsyncStorage.getItem(PRIMING_DISMISSED_KEY);
      if (!dismissed) setShowPriming(true);
    }
    // status === 'denied' — appka nie może już sama poprosić ponownie
    // (ograniczenie systemowe iOS/Android); priming pokazywany tylko raz,
    // zmiana wymaga ustawień systemowych urządzenia.
  }, [currentUser]);

  useEffect(() => {
    registerIfGranted();
  }, [registerIfGranted]);

  const requestPermission = useCallback(async () => {
    setShowPriming(false);
    if (isExpoGo) {
      await AsyncStorage.setItem(PRIMING_DISMISSED_KEY, 'true');
      return;
    }
    await ensureAndroidChannel();
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted' && currentUser) {
      const token = await getDeviceToken();
      if (token) await upsertToken(currentUser.id, token);
    }
    await AsyncStorage.setItem(PRIMING_DISMISSED_KEY, 'true');
  }, [currentUser]);

  const dismissPriming = useCallback(async () => {
    setShowPriming(false);
    await AsyncStorage.setItem(PRIMING_DISMISSED_KEY, 'true');
  }, []);

  return { showPriming, requestPermission, dismissPriming };
}
