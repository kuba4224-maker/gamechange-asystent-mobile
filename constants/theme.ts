// ═══════════════════════════════════════════════════════════════════
// ⭐⭐ UMOWA O WYGLĄDZIE — JEDYNE ŹRÓDŁO TOKENÓW (PAS W1, 18.08.2026)
//
// Do 18.08.2026 ten plik był SZPACHLĄ re-eksportującą `lib/theme.ts`.
// Od pasa W1 jest ODWROTNIE: wartości mieszkają TUTAJ, a `lib/theme.ts`
// re-eksportuje stąd — po to, żeby żaden z 36 importów `constants/theme`
// ani z importów `lib/theme` nie musiał się zmienić w tej samej rundzie,
// w której zmieniają się WARTOŚCI. ⛔ Nie ma trzeciego miejsca z kolorem.
//
// KROK 2 POLECENIA W1: „wyciągnij umowę o wyglądzie do jednego miejsca
// i nazwij rzeczy tak, jak nazywa je makieta". Przy każdym tokenie stoi
// nazwa zmiennej z bloku `:root` w `claude/MAKIETA_APLIKACJI_V3.html`.
//
// ⭐⭐ DECYZJA KUBY D-A z 18.08.2026 — MOTYW JEST JASNY.
// „Appka jest dziś CZARNA. Makieta jest JASNA. To jest największa
//  pojedyncza różnica i to appka się myli."
// Paleta przeniesiona z makiety CO DO ZNAKU. Poprzedni stan (koncepcja
// identyfikacji 08.2026, „boisko nocą": bg #0B0C0F, karta #14161B,
// marka #EE5342) jest wypisany imiennie w nocie przekazania pasa W1 —
// ⛔ nie zniknął po cichu (B3).
//
// ⛔⛔ NAJWAŻNIEJSZA ZMIANA ZNACZENIOWA, NIE TYLKO BARWNA:
// do 18.08 `colors.brand` = #EE5342 (koral) i oznaczał DZIAŁANIE —
// akcje, aktywną zakładkę, lewą krawędź kafla, linki. To znaczyło, że
// czerwień stała na ekranie kilkanaście razy, w miejscach, które nie są
// ostrzeżeniem. Reguła Z2/P4 mówi: ⛔ CZERWIEŃ WYSTĘPUJE W JEDNYM
// MIEJSCU — ból, przeciążenie, stan ochronny. Dlatego:
//    • `brand` = ZIELEŃ MARKI #2E6B5E (makieta `--ok`) — działanie,
//      tożsamość, aktywna rzecz. ⛔ Nigdy ocena danych.
//    • `error` = #E8432D (makieta `--accent`) — JEDYNA czerwień
//      w produkcie i wyłącznie przy prawdziwym ostrzeżeniu.
// Jedna zmiana wartości gasi czerwień w KAŻDYM miejscu, które brało ją
// z tokenu — łącznie z `app/(tabs)/kalendarz.tsx:1232`, wymienionym
// imiennie w §7.1 polecenia.
// ═══════════════════════════════════════════════════════════════════

export const colors = {
  // ── Tła i powierzchnie ───────────────────────────────────────────
  background: '#f5f2ec', // makieta `--bg`   — tło ekranu
  surface: '#fffdfa', // makieta `--card` — karta
  surfaceElevated: '#efe9df', // makieta `--tint`  — wypełnienie, chip, aktywna zakładka
  surfaceSunken: '#e6dfd2', // makieta `--tint2` — tor przełącznika, plakietka wygasła
  border: '#ddd6cb', // makieta `--line`  — kreska

  // ── Tekst ────────────────────────────────────────────────────────
  // ⚠️ MAKIETA MA DWA POZIOMY TEKSTU, NIE TRZY: `--ink` i `--muted`.
  // `textTertiary` wskazuje więc na TEN SAM ZNAK co `textSecondary` —
  // to nie jest przeoczenie, tylko konsekwencja przeniesienia palety
  // co do znaku. ⛔ Trzeci odcień byłby wartością wymyśloną tutaj,
  // a nie przeniesioną z umowy. Wypisane w nocie przekazania.
  textPrimary: '#1a1a1a', // makieta `--ink`
  textSecondary: '#7d776b', // makieta `--muted`
  textTertiary: '#7d776b', // makieta `--muted` — ten sam znak, patrz wyżej

  // ── Tekst NA PANELU CIEMNYM (makieta `.cnt`, `.voice`, `.shead`) ──
  // Panel „to jest o Tobie" jest w makiecie odwrócony: tło `--ink`,
  // tekst `#f5f2ec`, podpis `#bdb6aa`. Bez tych tokenów ekran musiałby
  // brać `colors.surface` na tekst, czyli mówić „karta" tam, gdzie ma
  // na myśli „tekst na ciemnym".
  onInk: '#f5f2ec',
  onInkMuted: '#bdb6aa',
  onInkAccent: '#9fd8c8', // makieta: wyróżnienie w tekście na ciemnym
  onInkLine: '#3a3733', // makieta: kreska wewnątrz panelu ciemnego

  // ── Marka: DZIAŁANIE i TOŻSAMOŚĆ ⛔ NIGDY ocena danych ────────────
  brand: '#2E6B5E', // makieta `--ok` — zieleń marki
  brandPressed: '#245549',

  // ── Semantyka danych ─────────────────────────────────────────────
  success: '#2E6B5E', // makieta `--ok`
  caution: '#b8860b', // makieta `--gold` — ostrzeżenie MIĘKKIE
  warning: '#b8860b', // makieta `--gold`
  // ⛔⛔ JEDYNA CZERWIEŃ W PRODUKCIE. Wolno jej stać wyłącznie przy
  // bólu, przeciążeniu i stanie ochronnym (Z2, P4).
  error: '#E8432D', // makieta `--accent`

  // Alias historyczny — jedno użycie (obrys CTA w FocusBlockActiveView).
  // ⛔ NOWY KOD GO NIE UŻYWA: użyj wprost `brand`.
  special: '#2E6B5E',
  white: '#FFFFFF',

  // ── Miękkie tła ──────────────────────────────────────────────────
  brandSofter: 'rgba(46,107,94,0.06)',
  brandSoft: 'rgba(46,107,94,0.08)',
  brandTint: 'rgba(46,107,94,0.15)',
  okSoft: '#eef6f3', // makieta `--okbg`
  okBorder: '#c3ddd5', // makieta: obrys panelu „ok"
  warnSoft: '#f7f0dd', // makieta `--goldbg`
  warnBorder: '#e3d3a0',
  errSoft: '#fdf1ef', // makieta `--accbg` — tło panelu bólu
  track: 'rgba(125,119,107,0.18)',
} as const;

// ═══════════════════════════════════════════════════════════════════
// ⭐ OBCIĄŻENIE — BARWA I WYSOKOŚĆ (makieta: `--load`, `barwaObc`,
// `wysokoscObc`). ⛔ To NIE JEST czerwień i nigdy nią nie będzie (Z2).
//
// ⭐ K4 — WYSOKOŚĆ NIESIE TĘ SAMĄ INFORMACJĘ CO BARWA. Około 1 na 12
// chłopców nie rozróżnia części barw; słupek, który mówi tylko kolorem,
// nie mówi im nic. Dlatego obie funkcje liczą z tej samej liczby.
// ═══════════════════════════════════════════════════════════════════

/** Składowe RGB zieleni marki — makieta `--load: 46,107,94`. */
export const SKLADOWE_OBCIAZENIA = { r: 46, g: 107, b: 94 } as const;

/** Sufit skali — decyzja Kuby 18.08 (makieta `SUFIT_OBCIAZENIA`). */
export const SUFIT_SLUPKA = 7;

/** Wysokość toru słupka w dp (makieta `.load .tr` = 34 px). */
export const TOR_SLUPKA_DP = 34;

/**
 * Barwa wypełnienia słupka. ⛔ Składowa czerwona jest STAŁA i równa 46 —
 * to jest zieleń o różnej intensywności, a nie skala od zieleni do czerwieni.
 */
export function barwaObciazenia(wartosc: number): string {
  const r = Math.min(Math.max(wartosc, 0), SUFIT_SLUPKA) / SUFIT_SLUPKA;
  const a = (0.16 + 0.84 * r).toFixed(2);
  return `rgba(${SKLADOWE_OBCIAZENIA.r},${SKLADOWE_OBCIAZENIA.g},${SKLADOWE_OBCIAZENIA.b},${a})`;
}

/** Wysokość słupka w dp — DRUGI nośnik tej samej informacji (K4). */
export function wysokoscObciazenia(wartosc: number): number {
  const r = Math.min(Math.max(wartosc, 0), SUFIT_SLUPKA) / SUFIT_SLUPKA;
  return Math.round(4 + 30 * r);
}

// ═══════════════════════════════════════════════════════════════════
// ⚠️ TYPOGRAFIA — ZOSTAJE ARCHIVO + INTER, NIE BEBAS + DM SANS.
// Makieta rysuje nagłówki w Bebas Neue, a treść w DM Sans. Zmiana
// krojów wymaga nowych pakietów `@expo-google-fonts/*`, a `npm install`
// jest w tym kontenerze zablokowany (403). ⛔ NIE UDAJEMY, że to jest
// zrobione — pozycja stoi imiennie w nocie przekazania pasa W1.
// Archivo jest krojem wąskim i wielkoliterowym tak samo jak Bebas, więc
// RÓŻNICA JEST W ZNAKU, NIE W ROLI.
// ═══════════════════════════════════════════════════════════════════
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

// ── Motyw „ścięcie 12°" (z pochylenia równoległoboku logo) ─────────
// ⚠️ Makieta go nie ma, bo makieta nie zna logo. ZOSTAJE: to jest
// tożsamość, nie barwa, i nie łamie ani jednej reguły z §7 polecenia.
export const skew = {
  angle: '-12deg' as const,
  stripe: {
    position: 'absolute' as const,
    left: 10,
    top: 14,
    width: 4,
    borderRadius: 2,
    transform: [{ skewX: '-12deg' as const }],
  },
};

// ── Promienie: z makiety (kafel 12, karta 14, plakietka 5) ─────────
export const radii = { xs: 5, sm: 8, md: 12, lg: 14 };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const minTouchHeight = 48;

// ═══════════════════════════════════════════════════════════════════
// ⭐ TWARDE MIARY EKRANU — z §8 polecenia i z makiety.
// ⛔ Trzymane TUTAJ, a nie rozsypane po ekranach, bo to są liczby,
// od których zależy, czy coś jest przecięte linią zgięcia.
// ═══════════════════════════════════════════════════════════════════
export const wymiary = {
  // ⛔⛔ LINII ZGIĘCIA (808 dp) TU NIE MA I NIE BĘDZIE. Ta liczba stoi
  // w produkcie DOKŁADNIE RAZ, w `lib/wysokoscEkranu.ts`
  // (`WIDOCZNE_NAD_ZGIECIEM_DP`), i pilnuje tego strażnik M1-4/D5.
  // Druga kopia rozjechałaby się z miarą, a miara jest jedyną rzeczą,
  // która o zgięciu cokolwiek wie.
  /** Pas, w którym leży przycisk „+" (makieta `.fab`: top 730, 64 dp). */
  pasPrzyciskuPlus: { od: 730, do: 794 },
  /** ⛔ Odstęp z prawej dla WSZYSTKIEGO, co wpada w pas „+" (D-6). */
  odstepPodPlusem: 76,
  /** Kafel dnia (makieta `kafelHTML`). */
  wysokoscKafla: 54,
  /** Karta „co dziś zrobić" (makieta `kartaGlowna`) — D-1. */
  wysokoscKartyGlownej: 118,
  /** Trzy fakty o dniu (makieta `czteryInfo`) — D-2. */
  wysokoscTrzechFaktow: 86,
  /** Wiersz dnia w tygodniu (makieta `.wd`) — T-3. */
  wysokoscWierszaDnia: 66,
} as const;

export const theme = { colors, typography, radii, spacing, minTouchHeight, skew, wymiary };
export type Theme = typeof theme;
export default theme;
