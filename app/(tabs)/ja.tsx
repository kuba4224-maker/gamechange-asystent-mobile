// Ekran JA — NOWY PLIK, NAWIGACJA B3 08.08.2026
// (decyzja B8 + B12, claude/DECYZJE_PRODUKTOWE_07_08_2026.md).
//
// CZYM TEN EKRAN JEST: punktem zbornym dla wszystkiego, co NIE jest codzienną
// pętlą — profil, wynik diagnozy, wszystkie rekomendacje, cele i ich historia,
// ustawienia konta. Czwarta i ostatnia zakładka: Dziś · Dziennik · Mecz · Ja.
//
// CZYM NIE JEST: listą linków. Poprzednik („Więcej", app/(tabs)/wiecej.tsx)
// był czterema wierszami menu i nie mówił zawodnikowi ani jednej rzeczy o nim
// samym — zawodnik nie miał powodu tam wchodzić, więc Diagnoza i Mecz były
// w praktyce niewidoczne. Ten ekran zaczyna się od SKRÓTU PROFILU Z DIAGNOZY:
// nagłówek scenariuszowy i nazwy wąskich gardeł, czyli od zdania o nim.
// Wejścia stoją dopiero pod tym.
//
// ZERO NOWYCH PYTAŃ, ZERO ZAPISU. Ekran wyłącznie czyta i wyłącznie oddaje.
// Cały skrót liczy się z `diagnostics.scores`, które system ma od dnia
// diagnozy. Ani jeden `insert`/`update` nie wychodzi z tego pliku — w
// szczególności NIE oznacza rekomendacji jako przeczytanych (to robią
// wyłącznie ekrany, które je faktycznie pokazują: Dziś i Wszystkie
// rekomendacje).
//
// SKĄD SIĘ BIERZE TREŚĆ SKRÓTU: `components/diagnosisProfile.ts` — dokładnie
// te same funkcje, których używa pełny ekran Diagnoza (`parseScores`,
// `detectScenario`, `scenarioHeadline`, `getRelativeDeficits`). Świadomie
// ŻADNEJ własnej logiki liczenia tutaj: gdyby skrót liczył się inaczej niż
// pełny profil, zawodnik zobaczyłby na dwóch ekranach dwie różne prawdy o
// sobie — czyli dokładnie ten defekt, który blok B1 („jedna droga, jeden
// słownik") likwiduje.
//
// ⛔ RUNDA OPINII (decyzja B12) — ŚWIADOMIE NIEZROBIONA, patrz raport zwrotny
// B runda 3, sekcje 4 i 7. Krótko: rozpoznanie „czy runda jest otwarta dla
// drużyny tego zawodnika" wymaga odczytu `public.coach_feedback_rounds`, a ta
// tabela ma dziś DOKŁADNIE JEDNĄ politykę SELECT —
// `coach_feedback_rounds_select_own`, `using (coach_user_id = auth.uid())`.
// Zawodnik nie jest trenerem, więc dostaje pustkę, nie odmowę — czyli kod
// „działałby" i po cichu nigdy nic nie pokazywał. Bez migracji (nowa polityka
// RLS dla członków drużyny) tej pozycji nie da się zrobić uczciwie, a polecenie
// mówi wprost: nie zgaduj. Gotowy SQL leży w raporcie, sekcja 7.
// Pozycja wejdzie tutaj, między „Wszystkie rekomendacje" a „Cele".
import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';
import { segmentLabel } from '../../lib/labels';
import {
  parseScores,
  getRelativeDeficits,
  detectScenario,
  scenarioHeadline,
} from '../../components/diagnosisProfile';

type DiagnosisSummary =
  | { state: 'loading' }
  | { state: 'none' }
  | { state: 'unreadable' }
  | { state: 'ready'; headline: string; desc: string; deficitLabels: string[] };

type MenuRoute = '/diagnoza' | '/centrum-decyzji' | '/cele' | '/profil';

export default function JaScreen() {
  const { currentUser, signOut } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<DiagnosisSummary>({ state: 'loading' });
  const [unreadRecs, setUnreadRecs] = useState(0);
  const [openActionableRecs, setOpenActionableRecs] = useState(0);
  const [activeGoals, setActiveGoals] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!currentUser) return;

    // Cztery zapytania równolegle, żaden nie czeka na inny — ten sam wzorzec
    // co `load()` na ekranie Dziś. Każde z nich to WYŁĄCZNIE odczyt.
    const [diagRes, profileRes, recsRes, goalsRes] = await Promise.all([
      // `diagnostics` to log zdarzeń, nie jeden wiersz na diagnozę — filtr
      // `event='email_submitted'` jest konieczny (ten sam co w diagnoza.tsx).
      supabase.from('diagnostics').select('scores')
        .eq('user_id', currentUser.id).eq('event', 'email_submitted')
        .order('created_at', { ascending: false }).limit(1),
      supabase.from('player_profiles').select('position_primary')
        .eq('user_id', currentUser.id).limit(1),
      supabase.from('decision_recommendations').select('id,recommendation_type,feedback_response,viewed_at')
        .eq('user_id', currentUser.id),
      supabase.from('goals').select('id,status').eq('user_id', currentUser.id),
    ]);

    // ─── Skrót profilu z diagnozy ─────────────────────────────────
    if (diagRes.error || !diagRes.data || diagRes.data.length === 0) {
      // Błąd odczytu i brak diagnozy dają ten sam ekran świadomie: dla
      // zawodnika obie sytuacje znaczą „nie mam tu jeszcze nic o sobie",
      // a wejście „Wynik diagnozy →" niżej i tak prowadzi do ekranu, który
      // pokaże prawdziwy powód (tam jest osobny stan błędu).
      setSummary({ state: 'none' });
    } else {
      const scores = parseScores((diagRes.data[0] as { scores: unknown }).scores);
      if (!scores) {
        setSummary({ state: 'unreadable' });
      } else {
        const hasPosition = !profileRes.error && !!profileRes.data?.[0]?.position_primary;
        const deficits = getRelativeDeficits(scores, 3);
        const scenario = detectScenario(scores, hasPosition);
        const { headline, desc } = scenarioHeadline(scenario, deficits.length);
        setSummary({
          state: 'ready',
          headline,
          desc,
          deficitLabels: deficits.map(([id]) => segmentLabel(id)),
        });
      }
    }

    // ─── Liczby przy wejściach ────────────────────────────────────
    // Te same dwie miary co przy linku „Wszystkie rekomendacje" na ekranie
    // Dziś (lib: brak — to trzy linijki filtra, wspólny plik byłby cięższy
    // od problemu). Nie mylić z badge'em na pasku zakładek: ten SKASOWANO
    // 08.08.2026 i nie wraca (decyzja B7).
    const recs = (recsRes.data ?? []) as {
      id: number; recommendation_type: string; feedback_response: string | null; viewed_at: string | null;
    }[];
    setUnreadRecs(recs.filter((r) => !r.viewed_at).length);
    setOpenActionableRecs(recs.filter((r) =>
      (r.recommendation_type === 'specialist_referral' || r.recommendation_type === 'position_fit_signal')
      && !r.feedback_response).length);

    const goals = (goalsRes.data ?? []) as { id: number; status: string }[];
    setActiveGoals(goals.filter((g) => g.status === 'active').length);
  }, [currentUser]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Podpis przy „Wszystkie rekomendacje". Kolejność ważności ta sama co na
  // Dziś: najpierw nieprzeczytane, potem otwarte do sprawdzenia, na końcu opis.
  const recsHint = unreadRecs > 0
    ? `${unreadRecs} ${unreadRecs === 1 ? 'nowa' : 'nowe'} — jeszcze tego nie czytałeś`
    : openActionableRecs > 0
      ? `${openActionableRecs} do sprawdzenia`
      : 'Wszystko, co system Ci dotąd powiedział';

  const goalsHint = activeGoals > 0
    ? `${activeGoals} ${activeGoals === 1 ? 'aktywny cel' : 'aktywne cele'} · historia i planowanie pracy`
    : 'Załóż cel — to on napędza resztę appki';

  const renderRow = (route: MenuRoute, label: string, hint: string, dot = false) => (
    <TouchableOpacity key={route} style={styles.row} onPress={() => router.push(route)}>
      <View style={{ flex: 1 }}>
        <View style={styles.rowLabelLine}>
          <Text style={styles.rowLabel}>{label}</Text>
          {dot ? <View style={styles.rowDot} /> : null}
        </View>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        <Text style={styles.title}>Ja</Text>

        {/* ── SKRÓT PROFILU Z DIAGNOZY ────────────────────────────────
            Cały kafelek jest przyciskiem do pełnego wyniku — zawodnik, który
            przeczytał o sobie jedno zdanie, ma chcieć przeczytać resztę, a nie
            szukać osobnego linku. */}
        <TouchableOpacity style={styles.hero} onPress={() => router.push('/diagnoza')}>
          <Text style={styles.heroEyebrow}>Twój profil z diagnozy</Text>

          {summary.state === 'loading' && (
            <Text style={styles.heroBody}>Wczytuję Twój profil…</Text>
          )}

          {summary.state === 'none' && (
            <>
              <Text style={styles.heroTitle}>Nie masz jeszcze diagnozy</Text>
              <Text style={styles.heroBody}>
                Diagnoza pokazuje, co dziś najbardziej Cię ogranicza — i dlaczego. Bez niej system
                zgaduje, na czym masz się skupić.
              </Text>
            </>
          )}

          {summary.state === 'unreadable' && (
            <>
              <Text style={styles.heroTitle}>Profil nie jest jeszcze gotowy</Text>
              <Text style={styles.heroBody}>
                Twoja diagnoza nie ma zapisanych szczegółowych wyników — widzisz tylko jej datę.
                Nowa diagnoza wypełni ten ekran.
              </Text>
            </>
          )}

          {summary.state === 'ready' && (
            <>
              <Text style={styles.heroTitle}>{summary.headline}</Text>
              {summary.deficitLabels.length > 0 ? (
                <Text style={styles.heroSegments}>{summary.deficitLabels.join('  ·  ')}</Text>
              ) : null}
              <Text style={styles.heroBody}>{summary.desc}</Text>
            </>
          )}

          <Text style={styles.heroLink}>Zobacz cały profil →</Text>
        </TouchableOpacity>

        {/* ── TWÓJ ROZWÓJ ──────────────────────────────────────────── */}
        <View style={{ marginTop: 28 }}>
          <Text style={styles.sectionLabel}>Twój rozwój</Text>
          {renderRow('/diagnoza', 'Wynik diagnozy', '13 obszarów, wąskie gardła i ich przyczyny')}
          {renderRow('/centrum-decyzji', 'Wszystkie rekomendacje', recsHint, unreadRecs > 0)}
          {renderRow('/cele', 'Cele', goalsHint)}
        </View>

        {/* ── USTAWIENIA ───────────────────────────────────────────── */}
        <View style={{ marginTop: 28 }}>
          <Text style={styles.sectionLabel}>Ustawienia</Text>
          {renderRow('/profil', 'Profil', 'Dane, pozycja, wzrost, sprzęt, tryb kontuzji, e-mail rodzica')}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Wyloguj się</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 32, marginBottom: spacing.lg, color: colors.textPrimary },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 10 },
  // Hero — ten sam język wizualny co hero Celu na ekranie Dziś (lewa krecha
  // w kolorze marki), żeby zawodnik rozpoznał „to jest o mnie" bez czytania.
  hero: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 4, borderLeftColor: colors.brand, borderRadius: radii.lg,
    padding: 20,
  },
  heroEyebrow: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 8 },
  heroTitle: { ...typography.display, fontSize: 24, color: colors.textPrimary, marginBottom: 8 },
  heroSegments: { ...typography.bodySemiBold, fontSize: 14, color: colors.brand, marginBottom: 8 },
  heroBody: { ...typography.body, fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  heroLink: { ...typography.bodyMedium, fontSize: 13, color: colors.brand },
  row: {
    flexDirection: 'row', alignItems: 'center', minHeight: minTouchHeight + 12,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10,
  },
  rowLabelLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  rowLabel: { ...typography.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  rowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, marginLeft: 8 },
  rowHint: { ...typography.body, fontSize: 12, color: colors.textSecondary },
  chevron: { fontSize: 22, color: colors.textSecondary, marginLeft: 8 },
  signOutBtn: { marginTop: spacing.xl, minHeight: minTouchHeight, justifyContent: 'center', alignItems: 'center' },
  signOutText: { ...typography.body, fontSize: 13, color: colors.textSecondary, textDecorationLine: 'underline' },
});
