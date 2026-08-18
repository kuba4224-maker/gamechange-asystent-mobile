// PLAN-D-A1 08.2026 (18.08.2026) — NOWY PLIK. NAKŁADKA, KTÓRA NIE ZABIERA
// Z EKRANU.
//
// ═════════════════════════════════════════════════════════════════════
// PO CO TEN PLIK ISTNIEJE
// ═════════════════════════════════════════════════════════════════════
// Produkt do 18.08.2026 nie miał ANI JEDNEGO arkusza: `grep -rn "Modal"
// app/(tabs)` wracał pusty. Wszystko, co zawodnik miał zrobić, było albo
// wpisane w ekran (i wtedy podnosiło go o swoją wysokość), albo za trasą
// (i wtedy kosztowało opuszczenie ekranu). Ocena z kafla — sedno ekranu
// „Dziś" — stała przez to 4 663 dp pod górną krawędzią.
//
// Arkusz jest trzecią drogą: rzecz otwiera się NAD ekranem, ekran zostaje
// pod spodem, zamknięcie wraca dokładnie tam, gdzie zawodnik był.
//
// ⭐ DLACZEGO TO ZDEJMUJE WYSOKOŚĆ, A NIE PRZESUWA JEJ. `Modal` jest w React
// Native osobnym drzewem nad ekranem — nie wchodzi do przewijania ekranu
// pod spodem. Miara `lib/wysokoscEkranu.ts` liczy to tak samo (`PUSTE`
// zawiera `Modal`), więc liczba na zapadce i prawda o ekranie mówią to samo.
//
// ═════════════════════════════════════════════════════════════════════
// ⛔ CZTERY ZAKAZY, KAŻDY Z POWODEM
// ═════════════════════════════════════════════════════════════════════
//  1. ⛔ ZERO DECYZJI O TREŚCI. Ten komponent nie wie, co rysuje — dostaje
//     nagłówek z `lib/arkusz.ts` i dzieci od ekranu. Drugie miejsce, w którym
//     powstają brzmienia, to drugi słownik (O92).
//  2. ⛔ ZAMKNIĘCIE JEST ZAWSZE I W TYM SAMYM MIEJSCU. Arkusz, z którego
//     czasem nie da się wyjść, uczy, że wchodzenie kosztuje.
//  3. ⛔ ZERO PRZYCISKU „ZAPISZ" W SAMEJ NAKŁADCE. To, co zawodnik odpowiedział,
//     jest zapisane w chwili dotknięcia (silnik oceny działa tak od pasa D2).
//     Wyjście bez odpowiedzi ma nie zostawiać po sobie porzuconego formularza.
//  4. ⛔ ZERO ANIMACJI POWIADAMIAJĄCEJ O CZYMKOLWIEK. `animationType="slide"`
//     jest ruchem nakładki, nie nagrodą za jej otwarcie (N1).

import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';
import { colors, typography, spacing, radii } from '../constants/theme';
import {
  ARKUSZ_ZAMKNIJ,
  WYSOKOSC_NAGLOWKA_ARKUSZA_DP,
  type NaglowekArkusza,
} from '../lib/arkusz';

export default function Arkusz({
  widoczny,
  naglowek,
  naZamkniecie,
  children,
}: {
  widoczny: boolean;
  /** ⛔ `null` znaczy „nie ma czego pokazać" — wtedy nie rysujemy nic. */
  naglowek: NaglowekArkusza | null;
  naZamkniecie: () => void;
  children?: ReactNode;
}) {
  if (!widoczny || naglowek === null) return null;
  return (
    <Modal
      visible
      animationType="slide"
      transparent={false}
      onRequestClose={naZamkniecie}
      accessibilityViewIsModal
    >
      <View style={styles.tlo}>
        <View style={styles.naglowek}>
          <TouchableOpacity
            style={styles.pasek}
            onPress={naZamkniecie}
            accessibilityRole="button"
          >
            <Text style={styles.kicker}>{'‹ ' + naglowek.kicker}</Text>
            <Text style={styles.kicker}>{ARKUSZ_ZAMKNIJ}</Text>
          </TouchableOpacity>
          <Text style={styles.tytul}>{naglowek.tytul}</Text>
          {naglowek.podpis === '' ? null : <Text style={styles.podpis}>{naglowek.podpis}</Text>}
        </View>
        <ScrollView contentContainerStyle={styles.tresc}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tlo: { flex: 1, backgroundColor: colors.background },
  // ⭐ Wysokość nagłówka stoi w `lib/arkusz.ts` RAZ — tu jest jej użycie,
  // nie druga kopia liczby.
  naglowek: {
    minHeight: WYSOKOSC_NAGLOWKA_ARKUSZA_DP,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
  },
  pasek: { flexDirection: 'row', justifyContent: 'space-between' },
  kicker: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary },
  tytul: { ...typography.display, fontSize: 22, color: colors.textPrimary, marginTop: spacing.xs },
  podpis: { ...typography.body, fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  tresc: { padding: spacing.md, paddingBottom: 60 },
});
