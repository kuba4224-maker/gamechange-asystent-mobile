// Fundament systemu projektowego appki Gamechange (Krok 2.3 checklisty wdrożenia,
// ustalone 28.07.2026). Tryb ciemny jako jedyny na start — struktura pliku
// pozwala dodać jasny motyw później bez przepisywania, ale go tu NIE budujemy.
//
// Oparte na już istniejącej marce Gamechange (#E8432D używane w index.html),
// nie wymyślone od zera. Referencje stylistyczne: Nike Training Club, Strava.
//
// UŻYCIE: wszystkie ekrany zbudowane w pierwszym przebiegu (27.07.2026) miały
// jasny motyw skopiowany 1:1 z asystent_app.html (#f5f2ec tło, białe karty).
// Ten plik + restyle ekranów (28.07.2026) to zastosowanie decyzji z Kroku 2.3,
// która zapadła PO napisaniu tamtego kodu — patrz KONTRAKT_*.md dla logiki,
// która się NIE zmienia, tylko warstwa wizualna.

export const colors = {
  background: '#0E0D0B', // tło główne — już istniejące theme_color
  surface: '#1C1A17', // powierzchnia (karty) — nowy, ta sama rodzina
  surfaceElevated: '#3A3830', // powierzchnia podniesiona (modale) — już w palecie
  textPrimary: '#F5F2EC', // tekst główny — dotychczasowe tło, teraz jako tekst
  textSecondary: '#9A9488', // tekst drugorzędny — bez zmian
  brand: '#E8432D', // akcent marki — bez zmian, kolor marki
  success: '#4CAF6B', // rozjaśniony istniejący #2a7a3a
  warning: '#F0954B', // rozjaśniony istniejący #e08020
  caution: '#E8C547', // NOWY 06.08.2026 — krok pośredni gradientu suwaków Dziennika
  // (czerwony→pomarańczowy→żółty→zielony), patrz lib/scale-colors.ts. Ciepły
  // żółty świadomie różny od `special` (#D4FF00, limonkowy) — `special` zostaje
  // zarezerwowany dla "momentu specjalnego" (cel osiągnięty/streak), nie miesza
  // się znaczeniowo z tym gradientem.
  error: '#D7263D', // celowo INNY ton niż akcent marki (rozróżnialność)
  special: '#D4FF00', // moment specjalny (cel osiągnięty, streak) — już w palecie
  border: 'rgba(154,148,136,0.15)', // obwódka kart zamiast cienia
  white: '#FFFFFF',
} as const;

export const typography = {
  display: { fontFamily: 'BarlowCondensed-Bold', fontWeight: '700' as const },
  displayExtraBold: { fontFamily: 'BarlowCondensed-ExtraBold', fontWeight: '800' as const },
  body: { fontFamily: 'Inter-Regular', fontWeight: '400' as const },
  bodyMedium: { fontFamily: 'Inter-Medium', fontWeight: '500' as const },
  bodySemiBold: { fontFamily: 'Inter-SemiBold', fontWeight: '600' as const },
};

export const radii = { sm: 8, md: 12, lg: 16 };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const minTouchHeight = 48;

export const theme = { colors, typography, radii, spacing, minTouchHeight };
export type Theme = typeof theme;
export default theme;
