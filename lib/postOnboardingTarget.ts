// ONBOARDING R8 08.08.2026 — dokąd prowadzi ostatni ekran onboardingu.
// (Przegląd całości 4.2: onboarding kończył się „pustym ekranem" — świeży
// zawodnik po trzech ekranach powitalnych lądował na Dziś bez Celu i bez
// rekomendacji, z niczym do zrobienia. Najtańszy lejek konwersji w produkcie.)
//
// CZYSTA FUNKCJA bez Supabase i React Native — dokładnie ten sam wzorzec co
// lib/focusBlockProgress.ts: I/O robi kto inny (lib/onboarding.ts), decyzję
// podejmuje funkcja, którą da się uruchomić poza appką.
// Asercje: lib/postOnboardingTarget.selftest.ts.
//
// Trzy wyjścia i DLACZEGO trzy, a nie dwa:
//  • zawodnik MA ukończoną diagnozę  → '/diagnoza' — ekran wyniku; najmocniejsza
//    rzecz, jaką appka może mu pokazać w pierwszej minucie;
//  • zawodnik NIE MA diagnozy        → '/cele' — założenie Celu; to on napędza
//    resztę appki („Załóż cel — to on napędza resztę appki", zakładka Ja);
//  • NIE WIEMY (błąd odczytu)        → '/dzis' — ekran domowy. Nie obiecujemy
//    wyniku, którego może nie być, i nie każemy zakładać Celu komuś, kto może
//    go mieć. Reguła R5: błąd i pustka to dwa RÓŻNE stany — zlanie ich w jedno
//    wysłałoby część zawodników w złe miejsce przy każdym czknięciu sieci.
export type PostOnboardingTarget = '/diagnoza' | '/cele' | '/dzis';

export function postOnboardingTarget(
  hasCompletedDiagnosis: boolean | null,
): PostOnboardingTarget {
  if (hasCompletedDiagnosis === null) return '/dzis';
  return hasCompletedDiagnosis ? '/diagnoza' : '/cele';
}
