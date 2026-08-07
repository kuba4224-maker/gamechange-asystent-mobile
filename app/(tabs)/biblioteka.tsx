// Ekran TWOJE MATERIAŁY — NOWY PLIK, ZMIANA OBRAZU B5 08.08.2026.
// Pozycja M2 audytu po bloku 4: biblioteka wyprowadza się z ekranu „Ja" na
// własną trasę.
//
// ⚠️ TRASA CHOWANA, NIE PIĄTA ZAKŁADKA. Expo Router pokazuje w pasku KAŻDY
// plik z `app/(tabs)/` — także ten, którego nikt nie wymienił w `_layout.tsx`.
// Ten ekran MA wpis `<Tabs.Screen name="biblioteka" … href: null />` i bez
// niego pasek natychmiast urósłby do pięciu pozycji, kasując decyzję B8. To
// jest znalezisko B14 tego samego pasa i tym razem miało gdzie zadziałać —
// w rundzie 4 żaden nowy plik nie trafił do tego katalogu, więc pułapka nie
// mogła się odpalić.
//
// DLACZEGO OSOBNY EKRAN — miara, nie przeczucie. Runda 4 dołożyła bibliotekę
// jako sekcję „Ja" i zmierzyła skutek: 803 dp → 1 353 dp, a w najgorszym
// realnym przypadku (Cel + trzy różne wąskie gardła) 1 578 dp, czyli 2,64
// ekranu scrolla na małym telefonie. Ten sam raport postawił próg: „2,5 ekranu
// → biblioteka dostaje własną trasę". Próg został przekroczony, więc trasa
// powstała. Pomiar jest odtwarzalny: `npx tsx tests/measure-heights.ts`.
//
// ZERO NOWYCH ZAPYTAŃ WZGLĘDEM TEGO, CO ROBIŁO „JA". Dwa odczyty — segmenty
// aktywnych Celów i `scores` ostatniej diagnozy — dokładnie te same, które
// karmiły sekcję przed przeprowadzką. Ekran wyłącznie CZYTA: ani jednego
// `insert`/`update`/`upsert`/`delete`.
//
// ⚠️ KARTY NADAL NIE SĄ KLIKALNE — i to jest świadome, nie przeoczenie.
// Appka nie ma dziś ŻADNEGO mechanizmu wydania pliku PDF (zero Supabase
// Storage, zero linków), a sposób wydania jest osobną, nierozstrzygniętą
// pozycją (M3 audytu, decyzja sesji głównej: Supabase Storage, ale nie w tej
// rundzie). Uzasadnienie z rundy 4 zostaje w mocy co do słowa: kafelek, który
// wygląda na przycisk i nim nie jest, byłby gorszy niż zwykły tekst — i byłby
// „cichym brakiem" z audytu po bloku 3. Gdy hosting zostanie rozstrzygnięty,
// zamiana `View` na `TouchableOpacity` to jedna linia.
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, typography, spacing, radii } from '../../constants/theme';
import { parseScores, getRelativeDeficits } from '../../components/diagnosisProfile';
import {
  unlockedMaterials,
  libraryCountLine,
  LIBRARY_SCREEN_TITLE,
  LIBRARY_SCREEN_INTRO,
  LIBRARY_EMPTY_TEXT,
  LIBRARY_NO_DOWNLOAD_TEXT,
  type UnlockedMaterial,
} from '../../lib/materials';

export default function BibliotekaScreen() {
  const { currentUser } = useAuth();
  const [library, setLibrary] = useState<UnlockedMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!currentUser) return;

    const [diagRes, goalsRes] = await Promise.all([
      // `diagnostics` to log zdarzeń, nie jeden wiersz na diagnozę — filtr
      // `event='email_submitted'` jest konieczny (ten sam co w diagnoza.tsx,
      // ja.tsx i lib/livingDiagnosisPulses.ts).
      supabase.from('diagnostics').select('scores')
        .eq('user_id', currentUser.id).eq('event', 'email_submitted')
        .order('created_at', { ascending: false }).limit(1),
      supabase.from('goals').select('segment_id')
        .eq('user_id', currentUser.id).eq('status', 'active'),
    ]);

    const goalSegmentIds = ((goalsRes.data ?? []) as { segment_id: string }[])
      .map((g) => g.segment_id)
      .filter((s): s is string => !!s);

    // Błąd odczytu diagnozy NIE wywala ekranu — biblioteka opiera się wtedy
    // wyłącznie na Celach. To ten sam wybór co w „Ja": lista krótsza niż
    // powinna jest lepsza niż pusty ekran z komunikatem o błędzie.
    let deficitSegmentIds: string[] = [];
    if (!diagRes.error && diagRes.data?.length) {
      const scores = parseScores((diagRes.data[0] as { scores: unknown }).scores);
      if (scores) deficitSegmentIds = getRelativeDeficits(scores, 3).map(([id]) => id);
    }

    setLibrary(unlockedMaterials({ goalSegmentIds, deficitSegmentIds }));
    setLoading(false);
  }, [currentUser]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        <Text style={styles.title}>{LIBRARY_SCREEN_TITLE}</Text>
        <Text style={styles.intro}>{LIBRARY_SCREEN_INTRO}</Text>

        {/* Stan ładowania, a nie migotanie pustką — dług N2 z rundy 4 nauczył,
            że pierwsze zdanie, jakie appka mówi po wejściu, musi być prawdziwe.
            „Nic tu jeszcze nie ma" pokazane przez ułamek sekundy każdemu
            zawodnikowi z Celem byłoby nieprawdą. */}
        {loading ? (
          <Text style={styles.loading}>Sprawdzam, co jest dla Ciebie otwarte…</Text>
        ) : library.length === 0 ? (
          <View style={styles.materialCard}>
            <Text style={styles.materialWhy}>{LIBRARY_EMPTY_TEXT}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.count}>{libraryCountLine(library.length)}</Text>
            {library.map((u) => (
              <View key={u.material.id} style={styles.materialCard}>
                <Text style={styles.materialTitle}>{u.material.title}</Text>
                <Text style={styles.materialAbout}>{u.material.about}</Text>
                {/* Jedno zdanie „dlaczego akurat to" — to jest cała różnica
                    między biblioteką a półką. */}
                <Text style={styles.materialWhy}>{u.why}</Text>
                {/* Decyzja B2: 11 materiałów na 13 segmentów NIE jest dziurą.
                    Appka mówi to jako wiedzę o grze, nie jako przeprosiny. */}
                {u.material.sharedNote ? (
                  <Text style={styles.materialShared}>{u.material.sharedNote}</Text>
                ) : null}
              </View>
            ))}
            <Text style={styles.footnote}>{LIBRARY_NO_DOWNLOAD_TEXT}</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Style przeniesione 1:1 z sekcji „Twoje materiały" w app/(tabs)/ja.tsx —
// zawodnik ma zobaczyć tę samą listę, tylko na własnym ekranie, a nie nowy
// język wizualny.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 32, marginBottom: spacing.sm, color: colors.textPrimary },
  intro: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginBottom: spacing.lg },
  loading: { ...typography.body, fontSize: 14, color: colors.textSecondary },
  count: { ...typography.body, fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  materialCard: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
  },
  materialTitle: { ...typography.bodySemiBold, fontSize: 15, color: colors.textPrimary, marginBottom: 4 },
  materialAbout: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textPrimary, marginBottom: 8 },
  materialWhy: { ...typography.body, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  materialShared: { ...typography.body, fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 8, fontStyle: 'italic' },
  footnote: { ...typography.body, fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 2 },
});
