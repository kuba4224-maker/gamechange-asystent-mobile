// ═════════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-S1 08.2026 (18.08.2026) — NOWY PLIK. TRZECIA CZĘŚĆ WGLĄDU
// WRACA DO PRODUKTU.
// ═════════════════════════════════════════════════════════════════════
//
// ── CO SIĘ STAŁO 18.08.2026 (i dlaczego ten plik istnieje) ──────────
// Pas A1 zszedł z ekranem „Dziś" z 6 669 dp na 807 dp. Razem z blokiem
// `WgladPozycji` (330 dp z 927) zeszła z produktu TRZECIA CZĘŚĆ WGLĄDU —
// „jedna rzecz do zrobienia" (M4). ⛔ Nikt tego nie zdecydował: nota A1 §3
// wiersz 10 kieruje ten blok na „Profil → Skąd to wiemy" i wymienia go jako
// „najdroższą rzecz na tej liście i pierwszą do odzyskania", a pas A3 go tam
// nie postawił. Między jednym pasem a drugim wgląd zaczął kończyć się na
// WIEDZY — czyli dokładnie na tym, czego zakazuje M4.
//
// ── DLACZEGO KOMPONENT, A NIE KOD W EKRANIE ────────────────────────
// Domknięcie zostało nazwane w repozytorium PRZED tym pasem, w nagłówku
// `components/ListaZadan.tsx`:
//
//   „⚠️ CZEGO TA LISTA NADAL NIE RYSUJE: TRZECIEJ CZĘŚCI wglądu (…). Rysuje ją
//    komponent `WgladPozycji`, który mieszka DZIŚ WEWNĄTRZ `app/(tabs)/dzis.tsx`
//    — przepisanie go tutaj byłoby drugą kopią rysowania. Domknięcie:
//    wyprowadzić `WgladPozycji` do `components/` i podpiąć oba ekrany."
//
// Ten plik jest tym wyprowadzeniem. ⛔ JEDNA KOPIA RYSOWANIA — tak samo jak
// `PozycjaKolejkiCard` jest jedyną kopią rysowania pozycji (pas B2).
//
// ── GDZIE JEST DZIŚ WPIĘTY ─────────────────────────────────────────
// `components/ListaZadan.tsx`, wewnątrz `renderPozycja` — czyli WEWNĄTRZ pętli
// po pozycjach, które wydał RANKER (`wezKubelek` → `pozycje.map`). To jest
// warunek, nie szczegół: wgląd wchodzi na ekran tą samą drogą co każda inna
// pozycja i podlega wyciszeniu przy kontuzji, hamulcowi bólu i ścieżce wyjścia.
// Wgląd rysowany OBOK rankera byłby siódmym producentem — patrz zakazy
// w nagłówku `lib/wgladyZAlgorytmu.ts`.
//
// ⚠️ Lista zadań jest `Modal`-em montowanym przez `app/(tabs)/ja.tsx` (arkusz
// „Skąd to wiemy"), więc ten blok NIE KOSZTUJE ANI JEDNEGO dp na żadnym
// z dwóch ekranów produktu. Profil ma 601,8 dp przy zgięciu 808 i po tym
// pasie ma je nadal.
//
// ⛔ CZEGO TEN PLIK NIE ROBI: nie liczy wglądu, nie wybiera go i nie przepisuje
// ani jednego jego zdania. Bierze gotowy `Wglad` z `wgladDlaPozycji()`
// i rysuje jego trzecią część. Decyzja o brzmieniu należy do Kuby.
// ═════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, minTouchHeight } from '../constants/theme';
import { dataPoPolsku, liczbaPoPolsku, type Wglad } from '../lib/wgladyZAlgorytmu';

// ═════════════════════════════════════════════════════════════════════
// BRZMIENIA — ⛔ WSZYSTKIE DO PRZEJRZENIA PRZEZ KUBĘ
// ═════════════════════════════════════════════════════════════════════
// ⚠️ Zdania samego wglądu przychodzą gotowe z `lib/wgladyZAlgorytmu.ts` i ten
// plik ich NIE ZMIENIA. Własne są tu TRZY: nagłówek trzeciej części i dwa
// stany przełącznika osi — te same co do znaku, co stały w `dzis.tsx`
// od 14.08.2026 do 18.08.2026.
/** Znacznik dla Kuby i dla strażnika. Nie usuwać do czasu zatwierdzenia brzmień. */
export const BRZMIENIE_DO_PRZEJRZENIA_B4 = 'DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-B4, 14.08.2026)';

/**
 * Nagłówek trzeciej części wglądu. ⚠️ Ten sam kształt, co „CO DZIŚ ZROBIĆ" /
 * „DLACZEGO AKURAT TO" / „CO TO ZMIENI" — bo to jest część TEJ SAMEJ karty,
 * a nie nowy kafelek.
 */
const WGLAD_DO_ZROBIENIA = 'JEDNA RZECZ DO ZROBIENIA';
/** WG-34 — oś pomiarów. Głębokość 1: jedno dotknięcie, bez opuszczania ekranu (P0). */
const OS_POKAZ = 'Pokaż pomiary';
const OS_UKRYJ = 'Ukryj pomiary';

/**
 * ⭐ TRZECIA CZĘŚĆ WGLĄDU I OŚ POMIARÓW (PLAN-D-B4).
 *
 * ── DLACZEGO RYSUJE TO OSOBNY KOMPONENT, A NIE `PozycjaKolejkiCard` ──
 * Bo `doZrobienia` i `os` NIE SĄ POLAMI POZYCJI KOLEJKI — ranker ich nie zna
 * i znać nie powinien. Karta pozycji należy do pasa B2; wgląd dokłada swoją
 * trzecią część POD pozycją, wewnątrz tego samego wiersza.
 *
 * ── DWIE GŁĘBOKOŚCI (P0) ────────────────────────────────────────────
 *   głębokość 0: rzecz do zrobienia — ZERO dotknięć. Wgląd, który kończy się
 *                na wiedzy, łamie M4, więc czynność nie ma prawa być schowana.
 *   głębokość 1: oś pomiarów (WG-34) — jedno dotknięcie, bez opuszczania
 *                ekranu. Trzy daty z liczbami to materiał do sprawdzenia
 *                „skąd to wiesz", a nie odpowiedź na „co mam dziś zrobić".
 *
 * ⛔ PUNKT OSI BEZ CZYTELNEJ DATY NIE JEST RYSOWANY. `dataPoPolsku` oddaje
 * wtedy `null`, a surowe „2026-13-45" na ekranie jest gorsze niż brak punktu.
 *
 * ⛔ `null` znaczy „ta pozycja nie jest wglądem" — i wtedy nie rysuje się NIC.
 * Nie ma tu gałęzi, która pokazałaby cudzy wgląd przy cudzym wierszu.
 */
export default function WgladPozycji({ wglad }: { wglad: Wglad | null }) {
  const [osWidoczna, setOsWidoczna] = useState(false);
  if (wglad === null) return null;

  const punkty = wglad.os
    .map((p) => ({ data: dataPoPolsku(p.dzien), wartosc: p.wartosc, jednostka: p.jednostka }))
    .filter((p): p is { data: string; wartosc: number; jednostka: string } => p.data !== null);

  return (
    <View style={styles.wgladCzesc}>
      <Text style={styles.wgladNaglowek}>{WGLAD_DO_ZROBIENIA}</Text>
      <Text style={styles.wgladDoZrobienia}>{wglad.doZrobienia}</Text>

      {/* ── GŁĘBOKOŚĆ 1: OŚ POMIARÓW (WG-34) ────────────────────────── */}
      {/* ⛔ Przełącznik rysuje się WYŁĄCZNIE wtedy, gdy oś naprawdę ma punkty.
          Pusty przycisk „Pokaż pomiary", po którym nic się nie pokazuje, jest
          obietnicą bez pokrycia — a wgląd bez osi to poprawny stan, nie defekt. */}
      {punkty.length > 0 ? (
        <>
          <TouchableOpacity
            style={styles.osPrzelacznik}
            onPress={() => setOsWidoczna((x) => !x)}
            accessibilityRole="button"
          >
            <Text style={styles.osAkcja}>{osWidoczna ? OS_UKRYJ : OS_POKAZ}</Text>
          </TouchableOpacity>
          {osWidoczna ? punkty.map((p) => (
            <Text key={p.data} style={styles.osPunkt}>
              {p.data}
              {'  ·  '}
              {liczbaPoPolsku(p.wartosc)}
              {' '}
              {p.jednostka}
            </Text>
          )) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // ⚠️ Te same wartości, co miał `styles.wgladCzesc` w `dzis.tsx`: kreska
  // u góry zamiast własnej ramki, bo to jest CZĘŚĆ TEJ POZYCJI, a nie kafelek
  // pod nią. Zawodnik ma przeczytać „to należy do tego wglądu", nie „doszła
  // kolejna karta".
  wgladCzesc: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  // Nadtytuł trzeciej części — te same wartości co `odpowiedzNaglowek` na „Dziś".
  wgladNaglowek: {
    ...typography.bodyMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: 6,
  },
  // Rzecz do zrobienia jest CZYNNOŚCIĄ, więc waży tyle, co treść, a nie tyle,
  // co przypis. Wgląd, którego trzecia część wygląda jak stopka, kończy się
  // na wiedzy mimo że formalnie ją ma (M4).
  wgladDoZrobienia: { ...typography.bodySemiBold, fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  osPrzelacznik: { minHeight: minTouchHeight, justifyContent: 'center' },
  osAkcja: { ...typography.bodyMedium, fontSize: 13, color: colors.brand },
  // WG-34 — punkt osi: data i liczba, nic więcej. ⛔ Bez wykresu i bez
  // strzałek: „rośnie" jest interpretacją, a trzy daty z liczbami są pomiarem.
  osPunkt: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
});
