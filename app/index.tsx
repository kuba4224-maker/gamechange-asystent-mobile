// ROOT INDEX (29.07.2026) — Expo Router wymaga jawnej trasy dla "/", inaczej
// nie wie, gdzie skierować po starcie (grupa "(tabs)" sama w sobie nie jest
// trasą dla "/"). Przy braku tego pliku appka wisi na natywnym splash
// screenie (biały ekran + ikona appki na środku, appka nigdy nie rusza
// dalej) przy pełnym _layout.tsx z zarządzaniem splash screenem/fontami —
// znaleziono i potwierdzono przez bisekcję 29.07.2026 (patrz
// claude/SESJA_29_07_2026_MECZ_WDROZENIE_STATUS.md).
//
// AUDYT 27.07.2026 usunął wcześniejszy plik index.tsx jako "zapomniany" i
// powiązany z obsługą starego deep linku po magic linku — słusznie usunął
// TĘ starą logikę, ale nie zostawił w zamian prostego przekierowania do
// domyślnej zakładki, co przez jakiś czas nie ujawniało się (deep link
// przy starcie czasem trafiał gdzie indziej), aż ujawniło się dziś jako
// realny problem z ładowaniem appki.
//
// KROK 2 TORU 7 (30.07.2026, SESJA_START_UX_MOBILE_ONBOARDING_NAWIGACJA.md):
// domyślna zakładka zmieniona z Dziennika na nowy ekran domowy "Dziś"
// (app/(tabs)/dzis.tsx) — zgodnie z decyzją "Cel jako silnik w tle"
// (PLAN_SPOJNEJ_SCIEZKI.md, sekcja 2): appka ma jeden wspólny punkt
// startowy, który spina Dziennik/Centrum Decyzji/Kalendarz/Cele w jedną
// pętlę, zamiast lądować od razu w jednej z siedmiu równorzędnych zakładek.
// Dziennik dalej istnieje jako osobna zakładka, tylko przestaje być
// domyślnym ekranem po zalogowaniu.
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/dzis" />;
}
