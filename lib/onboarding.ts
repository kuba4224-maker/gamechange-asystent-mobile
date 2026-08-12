// Krok 1 checklisty Toru 7 (SESJA_START_UX_MOBILE_ONBOARDING_NAWIGACJA.md) —
// znacznik "czy zawodnik widział onboarding pierwszego uruchomienia".
// CELOWO zapisywany w Supabase (player_profiles.onboarding_completed_at),
// NIE tylko lokalnie (AsyncStorage) — musi przetrwać zmianę urządzenia i
// reinstalację appki, nie tylko to samo urządzenie (wymóg z dokumentu
// startowego sesji).
//
// Wzorzec zapisu 1:1 z app/(tabs)/profil.tsx (saveProfile): upsert na
// user_id, tylko kolumny które faktycznie chcemy zmienić w payloadzie —
// Supabase upsert nie nadpisuje kolumn nieobecnych w obiekcie, więc to nie
// kasuje reszty profilu (pozycja, poziom, cel kierunkowy itd.), nawet jeśli
// wiersz player_profiles jeszcze nie istniał (brand new user, jeszcze nigdy
// nie zapisał Profilu).
import { supabase } from './supabase';
import { postOnboardingTarget, type PostOnboardingTarget } from './postOnboardingTarget';

// ONBOARDING R8 08.08.2026 (przegląd całości 4.2) — dokąd prowadzi ostatni
// ekran onboardingu: wynik diagnozy (jeśli jest), założenie Celu (jeśli nie
// ma), ekran domowy (jeśli nie wiemy — błąd odczytu; reguła R5, uzasadnienie
// w lib/postOnboardingTarget.ts). Filtr „ukończonej diagnozy" jest ten sam,
// którym ekran Diagnoza rozpoznaje wynik (event=email_submitted + scores) —
// dzięki temu nigdy nie wysyłamy zawodnika na ekran, który pokaże pustkę.
export async function getPostOnboardingTarget(userId: string): Promise<PostOnboardingTarget> {
  try {
    const { data, error } = await supabase
      .from('diagnostics')
      .select('created_at')
      .eq('user_id', userId)
      .eq('event', 'email_submitted')
      .not('scores', 'is', null)
      .limit(1);
    if (error) {
      console.warn('onboarding: nie udało się sprawdzić diagnozy pod cel nawigacji (leci /dzis):', error.message);
      return postOnboardingTarget(null);
    }
    return postOnboardingTarget((data?.length ?? 0) > 0);
  } catch (e) {
    console.warn('onboarding: nie udało się sprawdzić diagnozy pod cel nawigacji (leci /dzis):', e);
    return postOnboardingTarget(null);
  }
}

export async function getOnboardingSeen(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('player_profiles')
      .select('onboarding_completed_at')
      .eq('user_id', userId)
      .limit(1);
    // Fail-open: błąd sieci/zapytania nie może blokować appki onboardingiem
    // w nieskończoność — lepiej raz omyłkowo pominąć onboarding niż uwięzić
    // zawodnika, który już był w appce, na ekranie powitalnym przy każdym
    // chwilowym problemie z siecią.
    if (error) return true;
    const row = data?.[0] as { onboarding_completed_at: string | null } | undefined;
    return !!row?.onboarding_completed_at;
  } catch {
    return true;
  }
}

export async function markOnboardingSeen(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('player_profiles')
      .upsert(
        { user_id: userId, onboarding_completed_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) {
      console.warn('onboarding: nie udało się zapisać znacznika onboardingu:', error.message);
    }
  } catch (e) {
    console.warn('onboarding: nie udało się zapisać znacznika onboardingu:', e);
  }
}
