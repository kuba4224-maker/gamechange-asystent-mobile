// PLAN-D-H 08.2026 (12.08.2026) — NOWY PLIK. Ekran ścieżki wyjścia.
//
// Reguły i cały rachunek: `lib/sciezkaWyjscia.ts` (czysta logika + selftest).
// Tutaj są WYŁĄCZNIE zapytania i rysowanie. Ani jednej reguły w tym pliku.
//
// ── DLACZEGO MODAL, A NIE PLIK W `app/(tabs)/` ────────────────────────
// Expo Router pokazuje w pasku KAŻDY plik z `app/(tabs)/`, także ten, którego
// nie ma w `(tabs)/_layout.tsx`. Nowa trasa byłaby PIĄTĄ ZAKŁADKĄ i skasowała
// decyzję B8 (zakaz 10 z kontraktu budowy). Ten sam powód i to samo rozwiązanie
// co w `components/MojaDroga.tsx`.
//
// ── CO TEN EKRAN ROBI Z RESZTĄ PRODUKTU ───────────────────────────────
// Otwarty wiersz `exit_mode` włącza szczebel 0 drabiny arbitra: przy najbliższym
// przebiegu crona `weekly_voice` dostaje `voice = 'exit'`, ekran „Dziś" pokazuje
// kartę wyjścia i PODNOSI PUNKT POMOCY, a Mapa drogi przełącza się na wariant
// `after_deselection` (32 wiersze treści czekają w `road_factors` od 11.08.2026).
// Jedno dotknięcie tutaj przestawia trzy rzeczy naraz — i dlatego wejście ma
// dwa kroki, a wyjście jedno.
//
// ── CZEGO TU NIE MA I NIE MOŻE BYĆ ────────────────────────────────────
//   • żadnej detekcji, żadnego klasyfikatora, żadnego czytania treści wpisów
//     (zakaz 14) — ten ekran reaguje WYŁĄCZNIE na dotknięcie zawodnika;
//   • żadnego powiadomienia rodzica ani trenera; kolumna `parent_notified_at`
//     istnieje w tabeli i ZOSTAJE PUSTA — mechanizm zgody na taki kontakt nie
//     jest rozstrzygnięty prawnie (`PYTANIA_DO_PRAWNIKA_WERSJA_ZYWA.md`);
//   • żadnej ścieżki odzysku: gdy zapytanie padnie, mówimy to i logujemy.
//     Druga próba z innym zestawem argumentów ukryła w tym projekcie defekt
//     A-N1 na całą rundę.
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, typography, radii, spacing, minTouchHeight } from '../constants/theme';
import {
  stanSciezki,
  wierszWlaczenia,
  patchWylaczenia,
  KOLUMNY_WYJSCIA,
  WYJSCIE_TYTUL,
  WYJSCIE_CO_SIE_ZMIENI,
  WYJSCIE_PYTANIE_ZDARZENIE,
  WYJSCIE_PYTANIE_PODPIS,
  WYJSCIE_ODPOWIEDZI,
  WYJSCIE_POTWIERDZENIE,
  WYJSCIE_NIE_TERAZ,
  WYJSCIE_WLACZONA_TYTUL,
  WYJSCIE_WLACZONA_TRESC,
  WYJSCIE_LICZBY,
  WYJSCIE_NA_JUTRO,
  WYJSCIE_WYLACZ,
  WYJSCIE_WYLACZ_PODPIS,
  WYJSCIE_NIE_WIEM,
  type RodzajZdarzenia,
  type StanSciezki,
  type WierszWyjscia,
} from '../lib/sciezkaWyjscia';

export const WYJSCIE_ODCZYT_WARN =
  '[PLAN-D-H] odczyt exit_mode nie powiódł się — ekran pokazuje „nie wiem", NIE stan wyłączony. '
  + 'Pokazanie „wyłączona" przy błędzie odczytu podpowiadałoby zawodnikowi w ścieżce wyjścia, że nic się nie stało.';

export const WYJSCIE_ZAPIS_WARN =
  '[PLAN-D-H] zapis exit_mode nie powiódł się. ZERO ścieżki odzysku: nie ponawiamy z innym ładunkiem. '
  + 'Jeśli błąd to naruszenie exit_mode_jedna_otwarta, zawodnik ma już otwartą ścieżkę — odśwież ekran.';

type Props = { visible: boolean; onClose: () => void; userId: string | null };
type Krok = 'wyjasnienie' | 'pytanie';

export default function SciezkaWyjscia({ visible, onClose, userId }: Props) {
  const [stan, setStan] = useState<StanSciezki | null>(null);
  const [krok, setKrok] = useState<Krok>('wyjasnienie');
  const [wybor, setWybor] = useState<RodzajZdarzenia | null>(null);
  const [wybrano, setWybrano] = useState(false);
  const [zapisuje, setZapisuje] = useState(false);
  const [bladZapisu, setBladZapisu] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setStan({ rodzaj: 'nie_wiem', powod: 'nie wiem, kto jest zalogowany' });
      return;
    }
    setStan(null);
    // ⚠️ A-N12: jawny filtr po `user_id` w każdym zapytaniu o dane zawodnika.
    const res = await supabase
      .from('exit_mode')
      .select(KOLUMNY_WYJSCIA)
      .eq('user_id', userId)
      .is('closed_at', null)
      .limit(1);
    if (res.error) console.warn(WYJSCIE_ODCZYT_WARN, res.error);
    setStan(stanSciezki(
      ((res.data ?? [])[0] as WierszWyjscia | undefined) ?? null,
      res.error ? res.error.message : null,
    ));
  }, [userId]);

  useEffect(() => {
    if (visible) {
      setKrok('wyjasnienie');
      setWybor(null);
      setWybrano(false);
      setBladZapisu(null);
      load();
    }
  }, [visible, load]);

  const wlacz = useCallback(async () => {
    if (!userId || zapisuje) return;
    setZapisuje(true);
    setBladZapisu(null);
    const res = await supabase
      .from('exit_mode')
      .insert(wierszWlaczenia({ userId, rodzaj: wybor, teraz: new Date() }));
    setZapisuje(false);
    if (res.error) {
      console.warn(WYJSCIE_ZAPIS_WARN, res.error);
      setBladZapisu('Nie udało się tego teraz włączyć. Nic się nie zmieniło — spróbuj jeszcze raz.');
      return;
    }
    await load();
  }, [userId, wybor, zapisuje, load]);

  const wylacz = useCallback(async () => {
    if (!userId || zapisuje || !stan || stan.rodzaj !== 'wlaczona') return;
    setZapisuje(true);
    setBladZapisu(null);
    const res = await supabase
      .from('exit_mode')
      .update(patchWylaczenia(new Date()))
      .eq('user_id', userId)
      .eq('id', stan.id);
    setZapisuje(false);
    if (res.error) {
      console.warn(WYJSCIE_ZAPIS_WARN, res.error);
      setBladZapisu('Nie udało się tego teraz wyłączyć. Nic się nie zmieniło — spróbuj jeszcze raz.');
      return;
    }
    await load();
  }, [userId, zapisuje, stan, load]);

  const naglowek = (
    <View style={styles.headRow}>
      <Text style={styles.title}>{WYJSCIE_TYTUL}</Text>
      <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Zamknij">
        <Text style={styles.close}>Zamknij</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          {naglowek}

          {stan === null && (
            <View style={{ paddingVertical: 40 }}><ActivityIndicator color={colors.brand} /></View>
          )}

          {/* Błąd odczytu NIE udaje stanu wyłączonego. */}
          {stan?.rodzaj === 'nie_wiem' && (
            <>
              <Text style={styles.quiet}>{WYJSCIE_NIE_WIEM}</Text>
              <TouchableOpacity style={styles.secondary} onPress={load}>
                <Text style={styles.secondaryText}>Spróbuj jeszcze raz</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── STAN WYŁĄCZONY: dwa kroki, żeby wejście nie było jednym
              kliknięciem bez odwrotu ───────────────────────────────── */}
          {stan?.rodzaj === 'wylaczona' && krok === 'wyjasnienie' && (
            <>
              <Text style={styles.lead}>Zanim to włączysz — tak zmieni się aplikacja:</Text>
              {WYJSCIE_CO_SIE_ZMIENI.map((l) => (
                <View key={l} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>·</Text>
                  <Text style={styles.bullet}>{l}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.primary} onPress={() => setKrok('pytanie')}>
                <Text style={styles.primaryText}>Dalej</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondary} onPress={onClose}>
                <Text style={styles.secondaryText}>{WYJSCIE_NIE_TERAZ}</Text>
              </TouchableOpacity>
            </>
          )}

          {stan?.rodzaj === 'wylaczona' && krok === 'pytanie' && (
            <>
              <Text style={styles.lead}>{WYJSCIE_PYTANIE_ZDARZENIE}</Text>
              <Text style={styles.quiet}>{WYJSCIE_PYTANIE_PODPIS}</Text>

              {/* Trzy gotowe odpowiedzi, nigdy puste pole (reguła P4).
                  Trzecia jest pełnoprawna i wygląda tak samo jak pozostałe. */}
              {WYJSCIE_ODPOWIEDZI.map((o) => {
                const aktywna = wybrano && wybor === o.rodzaj;
                return (
                  <TouchableOpacity
                    key={o.label}
                    style={[styles.option, aktywna && styles.optionActive]}
                    onPress={() => { setWybor(o.rodzaj); setWybrano(true); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: aktywna }}
                  >
                    <Text style={[styles.optionText, aktywna && styles.optionTextActive]}>{o.label}</Text>
                  </TouchableOpacity>
                );
              })}

              {bladZapisu ? <Text style={styles.error}>{bladZapisu}</Text> : null}

              <TouchableOpacity
                style={[styles.primary, (!wybrano || zapisuje) && styles.primaryDisabled]}
                disabled={!wybrano || zapisuje}
                onPress={wlacz}
              >
                <Text style={styles.primaryText}>{zapisuje ? 'Włączam…' : WYJSCIE_POTWIERDZENIE}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondary} onPress={() => setKrok('wyjasnienie')}>
                <Text style={styles.secondaryText}>Wróć</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── STAN WŁĄCZONY ─────────────────────────────────────── */}
          {stan?.rodzaj === 'wlaczona' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{WYJSCIE_WLACZONA_TYTUL}</Text>
                <Text style={styles.cardBody}>{WYJSCIE_WLACZONA_TRESC}</Text>
              </View>

              {/* Liczby systemowe zamiast pocieszenia — bez komentarza. */}
              <View style={{ marginTop: spacing.lg }}>
                {WYJSCIE_LICZBY.map((l) => (
                  <Text key={l} style={styles.liczba}>{l}</Text>
                ))}
              </View>

              {/* Zakaz 17: żadna treść nie kończy się na wiedzy. */}
              <View style={styles.jutro}>
                <Text style={styles.jutroTitle}>Jedna rzecz na jutro</Text>
                <Text style={styles.jutroBody}>{WYJSCIE_NA_JUTRO}</Text>
              </View>

              {bladZapisu ? <Text style={styles.error}>{bladZapisu}</Text> : null}

              <TouchableOpacity
                style={[styles.secondary, zapisuje && styles.primaryDisabled]}
                disabled={zapisuje}
                onPress={wylacz}
              >
                <Text style={styles.secondaryText}>{zapisuje ? 'Wyłączam…' : WYJSCIE_WYLACZ}</Text>
              </TouchableOpacity>
              <Text style={styles.quiet}>{WYJSCIE_WYLACZ_PODPIS}</Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { ...typography.display, fontSize: 28, color: colors.textPrimary, flex: 1, paddingRight: 12 },
  close: { ...typography.bodyMedium, fontSize: 14, color: colors.textSecondary, textDecorationLine: 'underline' },

  lead: { ...typography.bodySemiBold, fontSize: 16, color: colors.textPrimary, marginBottom: 10 },
  quiet: { ...typography.body, fontSize: 14, lineHeight: 21, color: colors.textSecondary, marginBottom: spacing.md },
  error: { ...typography.bodyMedium, fontSize: 14, lineHeight: 21, color: colors.brand, marginTop: spacing.md },

  bulletRow: { flexDirection: 'row', marginBottom: 8 },
  bulletDot: { ...typography.body, fontSize: 14, color: colors.textTertiary, width: 14 },
  bullet: { ...typography.body, fontSize: 14, lineHeight: 21, color: colors.textSecondary, flex: 1 },

  option: {
    minHeight: minTouchHeight, justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10,
  },
  optionActive: { borderColor: colors.brand, backgroundColor: colors.surfaceElevated },
  optionText: { ...typography.body, fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  optionTextActive: { ...typography.bodySemiBold, color: colors.textPrimary },

  primary: {
    minHeight: minTouchHeight, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.brand, borderRadius: radii.md, marginTop: spacing.lg,
  },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { ...typography.bodySemiBold, fontSize: 16, color: '#FFFFFF' },

  secondary: {
    minHeight: minTouchHeight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, marginTop: 10,
  },
  secondaryText: { ...typography.bodyMedium, fontSize: 15, color: colors.textSecondary },

  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: 18,
  },
  cardTitle: { ...typography.display, fontSize: 22, color: colors.textPrimary, marginBottom: 8 },
  cardBody: { ...typography.body, fontSize: 14, lineHeight: 21, color: colors.textSecondary },

  liczba: { ...typography.body, fontSize: 13, lineHeight: 20, color: colors.textSecondary, marginBottom: 12 },

  jutro: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.brand,
    borderRadius: radii.md, padding: 16, marginTop: spacing.md,
  },
  jutroTitle: { ...typography.bodySemiBold, fontSize: 16, color: colors.textPrimary, marginBottom: 6 },
  jutroBody: { ...typography.body, fontSize: 14, lineHeight: 21, color: colors.textSecondary },
});
