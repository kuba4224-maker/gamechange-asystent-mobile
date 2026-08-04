// Natywny pasek zakładek "za darmo" przez Expo Router (patrz architektura
// 6.1) — pierwotnie 7 ekranów asystent_app.html w tej samej kolejności co
// nav w wersji webowej: Dziennik, Cele, Centrum Decyzji, Kalendarz, Profil,
// Diagnoza, Mecz.
//
// KROK 2 TORU 7 (30.07.2026, SESJA_START_UX_MOBILE_ONBOARDING_NAWIGACJA.md)
// — przebudowa nawigacji, "Cel jako silnik w tle" (PLAN_SPOJNEJ_SCIEZKI.md,
// sekcja 2):
// 1) Nowa zakładka "Dziś" (app/(tabs)/dzis.tsx) DODANA na pierwszym miejscu
//    — nowy ekran domowy, cel: appka jako jedna spójna pętla
//    (Dziennik → Centrum Decyzji → Kalendarz → Cele), nie 7 osobnych funkcji.
//    Domyślne przekierowanie z app/index.tsx zmienione na tę zakładkę.
// 2) Profil/Diagnoza/Mecz — rzadziej odwiedzany kontekst wg tego samego
//    dokumentu (sekcja 2: "mogą się schować pod jednym Więcej") — z 8
//    zakładek (7 + Dziś) zrobiłoby to zdecydowanie za dużo na pasku
//    telefonu, więc rekomendacja zastosowana: chowamy je pod nową zakładką
//    "Więcej" (app/(tabs)/wiecej.tsx), zamiast pokazywać jako osobne
//    przyciski paska. WAŻNE: pliki profil.tsx/diagnoza.tsx/mecz.tsx
//    fizycznie NIE dotknięte (poza tym plikiem nawigacji) — celowa granica
//    tej sesji (mecz.tsx: Tryb Meczu świadomie wstrzymany; profil.tsx:
//    podział na etapy to osobny, późniejszy krok Toru 7). Trasy zostają w
//    pełni dostępne, tylko `href: null` chowa przycisk z paska — to
//    oficjalnie rekomendowany przez Expo Router wzorzec na ekran "Więcej"
//    (trasa nadal działa pod nawigacją Tabs, tylko bez własnego przycisku).
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dzis" options={{ title: 'Dziś' }} />
      <Tabs.Screen name="dziennik" options={{ title: 'Dziennik' }} />
      <Tabs.Screen name="centrum-decyzji" options={{ title: 'Centrum Decyzji' }} />
      <Tabs.Screen name="kalendarz" options={{ title: 'Kalendarz' }} />
      <Tabs.Screen name="cele" options={{ title: 'Cele' }} />
      <Tabs.Screen name="wiecej" options={{ title: 'Więcej' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', href: null }} />
      <Tabs.Screen name="diagnoza" options={{ title: 'Diagnoza', href: null }} />
      <Tabs.Screen name="mecz" options={{ title: 'Mecz', href: null }} />
    </Tabs>
  );
}
