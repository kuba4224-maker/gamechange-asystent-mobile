// W1: 08.2026 — JEDYNE ŹRÓDŁO TOKENÓW języka wizualnego appki (runda WIZUAL-1).
//
// Wartości pochodzą 1:1 z `claude/IDENTYFIKACJA_WIZUALNA_KONCEPCJA_08_2026.md`
// (koncepcja 1.0, zwalidowana walidatorem palet; kontrasty: ink 15,9:1 na
// surface, ink2 7,1:1). Poprzednik tego pliku — `constants/theme.ts`
// (28.07.2026, paleta „ciemny brąz" + Barlow Condensed) — został szpachlą
// re-eksportującą stąd, żeby 22 istniejące importy ekranów nie musiały się
// zmienić. Nowe pliki importują z `lib/theme`; stare importy z
// `constants/theme` dostają dokładnie te same obiekty.
//
// ZASADA NADRZĘDNA KONCEPCJI: kolor marki (#EE5342) oznacza DZIAŁANIE
// i TOŻSAMOŚĆ (akcje, aktywna zakładka, krecha, linki) — NIGDY ocenę danych.
// Ocena danych to wyłącznie ok/mid/warn/bad niżej; „bad" to karmazyn
// #DE3D5B, celowo rozróżnialny strukturalnie (nie optycznie — ΔE 4,9–11,8)
// od koralu marki: rozdzielenie ról jest w regułach użycia, nie w odcieniu.

export const colors = {
  // ── Tła i powierzchnie (koncepcja 08.2026, tabela tokenów) ───────────
  background: '#0B0C0F', // bg — tło ekranu („boisko nocą")
  surface: '#14161B', // karta
  surfaceElevated: '#1C1F26', // elevated — karta na karcie, pola, chipy
  border: '#262A33', // line — obrysy (zastępuje rgba(154,148,136,0.15))

  // ── Tekst (koncepcja: ink / ink2 / ink3) ─────────────────────────────
  textPrimary: '#F4F5F7', // ink — tekst główny (15,9:1 na surface)
  textSecondary: '#A7ADB8', // ink2 — tekst drugi (7,1:1)
  textTertiary: '#6B7280', // ink3 — podpisy, nadtytuły

  // ── Marka (koncepcja: brand / brand-press, z logo) ───────────────────
  brand: '#EE5342', // JEDYNY kolor marki — akcje, aktywna zakładka, krecha, linki
  brandPressed: '#D6432F', // stan wciśnięty

  // ── Semantyka danych na ciemnym (koncepcja: ok / mid / warn / bad) ───
  success: '#3DC97E', // ok
  caution: '#E8C33F', // mid — krok pośredni gradientu suwaków (scale-colors)
  warning: '#F2933D', // warn
  error: '#DE3D5B', // bad — KARMAZYN, świadomie NIE koral marki

  // ── Domknięte 08.08.2026 (WIZUAL-1 sekcja 8, decyzja Kuby) ───────────
  // „Moment specjalny" przestał być kwaśną limonką #D4FF00 (28.07.2026).
  // Koncepcja identyfikacji tego koloru nie wymienia — jako jedyny akcent
  // spoza palety rozbijał spójność. Token ZOSTAJE (jedno użycie w całej
  // appce: obrys CTA w components/FocusBlockActiveView.tsx), ale jest już
  // tylko aliasem na markę. NOWY KOD GO NIE UŻYWA — użyj wprost `brand`.
  special: '#EE5342',
  white: '#FFFFFF',

  // ── Miękkie tła / tory — jedyne dozwolone przezroczystości ───────────
  // (wyprowadzone z tokenów wyżej; zastępują rgba(...) trzymane dotąd
  // na sztywno w ekranach — od WIZUAL-1 żaden ekran nie trzyma koloru sam)
  brandSofter: 'rgba(238,83,66,0.06)', // tło boxów akcji (pytanie o Blok itp.)
  brandSoft: 'rgba(238,83,66,0.08)', // tło wybranego wiersza
  brandTint: 'rgba(238,83,66,0.15)', // baner momentu (przegląd zamknięcia Bloku)
  okSoft: 'rgba(61,201,126,0.14)', // tło odznak „Ukończony" / walidacji OK
  warnSoft: 'rgba(242,147,61,0.14)', // tło odznak „Priorytet" / podpowiedzi walidacji
  track: 'rgba(167,173,184,0.18)', // tor pasków postępu (z ink2)
} as const;

// ── Typografia (koncepcja: Archivo nagłówki i liczby, Inter reszta) ────
// Klucze fontów ładuje app/_layout.tsx przez expo-font (@expo-google-fonts).
// `fontVariant: tabular-nums` na wariantach Inter: liczby tabelaryczne
// wszędzie tam, gdzie wartości się zmieniają — bez per-ekranowych wyjątków
// (dla liter nic nie zmienia, dla cyfr stała szerokość).
export const typography = {
  display: {
    fontFamily: 'Archivo-Bold',
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
  },
  displayExtraBold: {
    fontFamily: 'Archivo-ExtraBold',
    fontWeight: '800' as const,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontWeight: '400' as const,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
  },
  bodyMedium: {
    fontFamily: 'Inter-Medium',
    fontWeight: '500' as const,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
  },
  bodySemiBold: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600' as const,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
  },
};

// ── Motyw „ścięcie 12°" (z pochylenia równoległoboku logo) ─────────────
// Żyje w: kresze kart „to jest o Tobie", ściętym końcu pasków postępu.
// NIE żyje w: tekście, polach formularzy, wykresach danych.
export const skew = {
  angle: '-12deg' as const, // transform: [{ skewX: skew.angle }]
  // Gotowy styl krechy karty osobistej: absolutny, przy lewej krawędzi,
  // wysokość ustawia karta (height w stylu nadpisującym).
  stripe: {
    position: 'absolute' as const,
    left: 10,
    top: 14,
    width: 4,
    borderRadius: 2,
    transform: [{ skewX: '-12deg' as const }],
  },
};

export const radii = { sm: 8, md: 12, lg: 16 };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const minTouchHeight = 48;

export const theme = { colors, typography, radii, spacing, minTouchHeight, skew };
export type Theme = typeof theme;
export default theme;
