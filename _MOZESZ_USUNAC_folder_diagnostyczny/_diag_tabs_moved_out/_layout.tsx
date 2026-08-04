// Natywny pasek zakładek "za darmo" przez Expo Router (patrz architektura
// 6.1) — 7 ekranów asystent_app.html, w tej samej kolejności co nav w
// wersji webowej: Dziennik, Cele, Centrum Decyzji, Kalendarz, Profil,
// Diagnoza, Mecz.
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dziennik" options={{ title: 'Dziennik' }} />
      <Tabs.Screen name="cele" options={{ title: 'Cele' }} />
      <Tabs.Screen name="centrum-decyzji" options={{ title: 'Centrum Decyzji' }} />
      <Tabs.Screen name="kalendarz" options={{ title: 'Kalendarz' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
      <Tabs.Screen name="diagnoza" options={{ title: 'Diagnoza' }} />
      <Tabs.Screen name="mecz" options={{ title: 'Mecz' }} />
    </Tabs>
  );
}
