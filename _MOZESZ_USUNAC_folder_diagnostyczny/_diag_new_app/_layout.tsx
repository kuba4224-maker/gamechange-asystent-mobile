// TYMCZASOWY plik diagnostyczny — Kuba/Cowork 28.07.2026. Oryginał w
// _diag_backup/app/_layout.tsx. Absolutne minimum, żeby sprawdzić czy
// Expo Router + Expo Go w ogóle działają w tym projekcie, bez ŻADNEGO
// naszego kodu (bez fontów, Supabase, auth, push, biometrii, 7 ekranów).
import { Slot } from 'expo-router';
import { View, Text } from 'react-native';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0E0D0B', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 24 }}>DIAG OK — działa</Text>
      <Slot />
    </View>
  );
}
