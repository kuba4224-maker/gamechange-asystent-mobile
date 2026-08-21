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
// ⭐⭐ TYPOGRAFIA — PAS W2, 21.08.2026: BEBAS NEUE + DM SANS.
//
// DECYZJA KUBY z 18.08.2026, punkt 6: przyjęte. Pas W1 tego NIE ZROBIŁ,
// bo w jego kontenerze `npm install` oddawał 403; od 19.08 działa.
//
// CO ZDJĘTE (B3 — nic nie znika po cichu):
//   • `Archivo-Bold` / `Archivo-ExtraBold` (pas W1, 18.08) — nagłówki i liczby
//   • `Inter-Regular` / `Inter-Medium` / `Inter-SemiBold` (od 07.2026) — tekst
//   • wcześniej jeszcze: `BarlowCondensed` (28.07.2026, pierwszy motyw ciemny)
// CO STOI W TYM MIEJSCU: `Bebas-Regular` (makieta: `'Bebas Neue'`)
//   i `DMSans-Regular/Medium/SemiBold` (makieta: `body{font-family:'DM Sans'}`).
//
// ⭐ POLSKIE ZNAKI — SPRAWDZONE, NIE ZAŁOŻONE. Bebas Neue w wersji
// podstawowej bywa bez `ĄĆĘŁŃÓŚŹŻ`. Pas W2 przeczytał tablice `cmap`,
// `loca` i `glyf` z pliku `BebasNeue_400Regular.ttf` (paczka
// `@expo-google-fonts/bebas-neue@0.4.1`, 497 glifów) i wyrenderował
// wszystkie osiem par: ⭐ **KOMPLET JEST — wielkie i małe, każdy z własnym
// glifem o niezerowej liczbie konturów.** To samo dla DM Sans (486 glifów).
// ⚠️ Jedyny znak z korpusu produktu, którego Bebas NIE MA: `→` (U+2192).
// Nie stoi to na przeszkodzie, bo strzałka pada wyłącznie w tekście ciągłym
// (DM Sans ją ma) — pilnuje tego asercja w `lib/wysokoscEkranu.selftest.ts`.
//
// ⛔ BEBAS JEST KROJEM WERSALIKOWYM I WYŚWIETLANIOWYM. Nie wchodzi do
// tekstu ciągłego ani do zdań dla zawodnika: nagłówki, etykiety, liczby.
// W makiecie stoi dokładnie tam: `h1/h2/h3`, `.shd .t`, `.wd .dn`,
// `.cnt .n`, `.cnt .two .v`, `.shead .st2`, `.meas h4` — wszystkie
// z `text-transform:uppercase`. ⚠️ Małe litery Bebas TO WERSALIKI, więc
// „Dziś" narysuje się jako „DZIŚ" nawet bez `textTransform`.
//
// ⚠️ `displayExtraBold` WSKAZUJE TEN SAM KROJ CO `display` — Bebas Neue
// ma JEDNĄ grubość (400) i paczka Google Fonts nie ma innej. ⛔ To nie jest
// przeoczenie: klucz zostaje, bo woła go kod ekranów, ale drugiego stopnia
// nagłówka w kroju już nie ma. Wypisane w nocie pasa W2 jako strata.
// ⛔ `fontWeight` schodzi na '400' przy obu: podanie '700'/'800' przy kroju,
// który ma tylko 400, każe systemowi pogrubić syntetycznie albo (na
// Androidzie) podmienić rodzinę na systemową — czyli stracić krój.
// ═══════════════════════════════════════════════════════════════════

/**
 * ⭐ NAZWY RODZIN — jedyne miejsce w produkcie, w którym pada nazwa kroju.
 * ⛔ `app/_layout.tsx` ładuje DOKŁADNIE te klucze; pilnuje tego asercja
 * „klucze `useFonts` = wartości `typography`" w `lib/wysokoscEkranu.selftest.ts`.
 * ⛔ Ani jeden plik ekranu nie ma prawa podać nazwy kroju wprost (osobna asercja).
 */
export const KROJE = {
  wyswietlaniowy: 'Bebas-Regular',
  tekstRegular: 'DMSans-Regular',
  tekstMedium: 'DMSans-Medium',
  tekstSemiBold: 'DMSans-SemiBold',
} as const;

/**
 * ⭐ ZMIERZONA INTERLINIA DOMYŚLNA KROJU — `(ascender − descender + lineGap) / unitsPerEm`
 * z tablic `head` i `hhea` plików TTF, odczytana przez pas W2 21.08.2026.
 * ⛔ To NIE jest liczba przepisana z dokumentacji: policzył ją skrypt z bajtów
 * paczek `@expo-google-fonts/bebas-neue@0.4.1` i `@expo-google-fonts/dm-sans@0.4.2`.
 *
 * ⚠️ PO CO TU STOI. `lib/wysokoscEkranu.ts` szacuje wysokość wiersza stałą
 * `INTERLINIA = 1.25`, gdy styl nie podaje `lineHeight`. Dla starej pary
 * (Archivo 1,088 · Inter 1,210) ta stała była GÓRNYM szacunkiem. Dla nowej
 * pary DM Sans daje **1,302**, czyli 1,25 przestało być górnym szacunkiem
 * i zaczęło być optymistyczne — a to jest kierunek błędu, którego przy
 * linii zgięcia popełniać nie wolno.
 * ⛔ Pas W2 tej stałej NIE RUSZYŁ: `lib/wysokoscEkranu.ts` nie jest jego
 * plikiem. Skutek policzony co do dp i oddany jako kontrakt w nocie
 * `claude/PRZEKAZANIE_PAS_W2_21_08_2026.md`.
 */
export const INTERLINIA_KROJU = {
  /** Bebas Neue 400 — hhea (1000 upem). Było: Archivo 700/800 = 1,088. */
  wyswietlaniowy: 1.2,
  /** DM Sans 400–700 — hhea (1000 upem). Było: Inter 400–600 = 1,210. */
  tekst: 1.302,
} as const;

export const typography = {
  /** Nagłówki, etykiety i LICZBY. ⛔ Nigdy tekst ciągły ani zdanie dla zawodnika. */
  display: {
    fontFamily: KROJE.wyswietlaniowy,
    fontWeight: '400' as const,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
  },
  /** ⚠️ Ten sam krój co `display` — Bebas Neue ma jedną grubość. Patrz nagłówek. */
  displayExtraBold: {
    fontFamily: KROJE.wyswietlaniowy,
    fontWeight: '400' as const,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
  },
  body: {
    fontFamily: KROJE.tekstRegular,
    fontWeight: '400' as const,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
  },
  bodyMedium: {
    fontFamily: KROJE.tekstMedium,
    fontWeight: '500' as const,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
  },
  bodySemiBold: {
    fontFamily: KROJE.tekstSemiBold,
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
