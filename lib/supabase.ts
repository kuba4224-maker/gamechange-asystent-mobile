// Klient Supabase dla appki natywnej — ten sam projekt Supabase co
// asystent_app.html / index.html / specialist_panel.html (wersja webowa).
// Różnica względem wersji webowej (patrz architektura, sekcja 6.4):
// `localStorage` (istnieje tylko w przeglądarce) zastąpiony przez
// AsyncStorage jako magazyn sesji Supabase Auth. Refresh token dodatkowo
// trzymany przez expo-secure-store (szyfrowane), używane przy
// biometrycznym re-loginie (Krok 3.4 checklisty) — do dopięcia razem z
// ekranem logowania, nie w tym pliku.
//
// UWAGA: wartości SUPABASE_URL / SUPABASE_KEY skopiowane 1:1 z
// asystent_app.html (kopia z Project Knowledge, 27.07.2026) — ten sam
// projekt Supabase, żadnych nowych kluczy.
//
// AUDYT 27.07.2026 (na prośbę Kuby "spójrz na całą appkę pod kątem rzeczy
// zbudowanych pod starą infrastrukturę"): logowanie zmienione z magic linku
// (link + deep link `gamechange://auth-callback` + parsowanie tokenów z
// fragmentu URL w app/_layout.tsx) na kod OTP (6 cyfr wpisywany ręcznie w
// components/LoginScreen.tsx, supabase.auth.verifyOtp()). Powód: appka
// natywna nie ma "tego samego originu" co przeglądarka, więc magic link
// wymagał osobnej infrastruktury (redirect URL w Supabase Auth, deep link
// listener, parsowanie #access_token z URL) tylko po to, żeby obejść
// ograniczenie, które w ogóle nie istnieje przy kodzie OTP — użytkownik
// wpisuje 6 cyfr wprost w appce, appka nigdy nie musi być "otwierana z
// zewnątrz". Usuwa to całą klasę błędów deep linku (cold start/warm start,
// różnice Android/iOS) i cały punkt 🛑 STOP dot. redirect URL w Supabase —
// nie trzeba go w ogóle dodawać. Web zostaje bez zmian (tam magic link nie
// ma tego problemu, bo przeglądarka ma zwykły adres https).
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kqrbztsvepjtggjmmcdx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EoYRIZpDhUSdNSJDXWl4Ew_SG8aJABP';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
