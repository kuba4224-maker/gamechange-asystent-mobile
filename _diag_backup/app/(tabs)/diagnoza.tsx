// Ekran DIAGNOZA — Krok 10 checklisty. Implementacja wg
// docs/KONTRAKT_DIAGNOZA.md (spisanego z panel-diagnoza w asystent_app.html).
//
// AUDYT 27.07.2026 (na prośbę Kuby — przegląd całej appki pod kątem rzeczy
// "zbudowanych pod starą infrastrukturę"): pierwotnie `Linking.openURL`
// (system browser, appka znika z ekranu całkowicie, użytkownik musi ręcznie
// wrócić przez przełączanie aplikacji) — to było 1:1 tłumaczenie web-owego
// `target="_blank"`, ale appka natywna ma lepsze, tańsze w koszcie
// narzędzie: `expo-web-browser` otwiera przeglądarkę WEWNĄTRZ appki (Safari
// View Controller na iOS / Chrome Custom Tabs na Androidzie) — użytkownik
// zostaje "w kontekście" appki, ma przycisk "Gotowe" i wraca jednym
// dotknięciem, bez przełączania aplikacji. To NIE jest WebView (żadnych
// problemów z izolacją ciasteczek/local storage strony trzeciej) — to
// oficjalnie rekomendowany przez Expo wzorzec dokładnie na ten przypadek
// (krótki zewnętrzny formularz/ankieta, bez potrzeby budowania go od nowa
// natywnie).
//
// Druga zmiana z tego samego audytu: `useEffect` -> `useFocusEffect`.
// Ekrany w natywnym pasku zakładek NIE są odmontowywane przy przełączaniu
// zakładek (w przeciwieństwie do web, gdzie przełączenie panelu = ponowne
// wywołanie load*()) — bez tej zmiany status diagnozy pokazywałby się
// tylko raz, przy pierwszym wejściu na zakładkę, i NIE odświeżyłby się po
// powrocie z ankiety diagnozy otwartej w przeglądarce.
import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';

const DIAGNOZA_URL = 'https://gamechange-diagnoza.vercel.app';
const DIAGNOSIS_TYPE_LABELS: Record<string, string> = {
  initial: 'Pierwsza diagnoza', rediagnosis: 'Rediagnoza',
};

type Status = 'loading' | 'done' | 'missing' | 'error';

export default function DiagnozaScreen() {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadDiagnoza = useCallback(async () => {
    if (!currentUser) return;
    setStatus('loading');
    setError(null);
    try {
      // `diagnostics` to log zdarzeń, nie jeden wiersz na diagnozę — filtr
      // `event=eq.email_submitted` jest konieczny (patrz kontrakt sekcja 3).
      const { data, error: err } = await supabase
        .from('diagnostics')
        .select('diagnosis_type,created_at')
        .eq('user_id', currentUser.id)
        .eq('event', 'email_submitted')
        .order('created_at', { ascending: false })
        .limit(1);
      if (err) throw err;

      const latest = data?.[0];
      if (latest) {
        const typeLabel = DIAGNOSIS_TYPE_LABELS[latest.diagnosis_type] || latest.diagnosis_type || 'Diagnoza';
        const dateLabel = new Date(latest.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
        setDetail(`${typeLabel} — ${dateLabel}`);
        setStatus('done');
      } else {
        setStatus('missing');
      }
    } catch (e: any) {
      setError('Nie udało się sprawdzić statusu diagnozy: ' + e.message);
      setStatus('error');
    }
  }, [currentUser]);

  useFocusEffect(useCallback(() => { loadDiagnoza(); }, [loadDiagnoza]));

  const openDiagnoza = () => WebBrowser.openBrowserAsync(DIAGNOZA_URL);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Diagnoza</Text>

      {status === 'loading' && <Text style={styles.empty}>Sprawdzam status...</Text>}

      {status === 'done' && (
        <View style={styles.block}>
          <Text style={styles.sectionLabel}>Ostatnia diagnoza</Text>
          <Text style={styles.detail}>{detail}</Text>
          <TouchableOpacity style={styles.btn} onPress={openDiagnoza}>
            <Text style={styles.btnText}>Zrób nową diagnozę</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'missing' && (
        <View style={styles.block}>
          <Text style={styles.missingText}>
            Nie masz jeszcze wykonanej diagnozy powiązanej z tym kontem.
          </Text>
          <Text style={styles.missingHint}>
            Diagnoza to osobna, krótka ankieta oceniająca Twoją formę we wszystkich 13 obszarach —
            to podstawa pod resztę systemu (cele, rekomendacje). Jeśli robiłeś już wcześniej diagnozę
            bez logowania, na ten sam adres email, którym się teraz logujesz — jest już połączona z
            Twoim kontem. Pierwszy cel i pierwsza rekomendacja w Centrum Decyzji pojawią się
            automatycznie (może to potrwać do 24 godzin). Jeśli robiłeś diagnozę na inny email albo
            jeszcze jej nie robiłeś, zrób ją teraz.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={openDiagnoza}>
            <Text style={styles.btnText}>Wykonaj diagnozę</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'error' && error && <Text style={styles.error}>{error}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 28, marginBottom: spacing.lg, color: colors.textPrimary },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 14 },
  block: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: spacing.lg, marginBottom: spacing.lg },
  detail: { ...typography.body, fontSize: 15, color: colors.textPrimary, marginBottom: spacing.md },
  missingText: { ...typography.body, fontSize: 15, color: colors.textPrimary, marginBottom: 12 },
  missingHint: { ...typography.body, fontSize: 13, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 19 },
  btn: { minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center' },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  empty: { textAlign: 'center', padding: 32, color: colors.textSecondary, fontSize: 14 },
  error: { color: colors.error, fontSize: 13, marginTop: spacing.sm },
});
