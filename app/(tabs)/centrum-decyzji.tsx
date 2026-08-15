// Ekran WSZYSTKIE REKOMENDACJE (dawniej „Centrum Decyzji") — Krok 11 checklisty.
// Implementacja wg docs/KONTRAKT_CENTRUM_DECYZJI.md (spisanego z panel-centrum
// w asystent_app.html).
//
// AUDYT 27.07.2026: `Linking.openURL` (system browser) -> `expo-web-browser`,
// `useEffect` -> `useFocusEffect` (ekran nie odmontowuje się przy przełączaniu
// zakładek — bez tego lista nie odświeżyłaby się po powrocie z Dziennika).
//
// DODANE 06.08.2026 (BRIEF_DELEGACJA_PROMINENCJA_CELU.md, Zakres 2) — wskaźnik
// „nowe/nieprzeczytane" oparty o kolumnę `viewed_at` (patrz
// docs/INTEGRACJA_WSKAZNIK_NOWE_SQL.md).
//
// ═══════════════════════════════════════════════════════════════════
// JEDNA DROGA B2 08.08.2026 — CO Z TEGO EKRANU ZOSTAŁO PO SCALENIU
// (blok B1 „jedna droga, jeden słownik")
//
// Najnowszy `training_focus` przeniósł się na ekran Dziś RAZEM z przyciskami
// feedbacku — to była jedna rzecz pokazywana w dwóch miejscach pod dwiema
// nazwami („Co dziś zrobić" kontra „Priorytet tygodnia"). Tutaj ta sekcja już
// NIE istnieje; ekran przestał być drugą drogą do tej samej rekomendacji i stał
// się tym, czym naprawdę jest: pełną listą wszystkiego, co system Ci powiedział.
//
// Zakładka zniknęła z paska (o jedną mniej, zgodnie z kierunkiem na cztery
// zakładki). Trasa `/centrum-decyzji` ŻYJE — `href: null` w (tabs)/_layout.tsx,
// ten sam wzorzec co Profil/Diagnoza/Mecz. Wejścia: link „Wszystkie
// rekomendacje →" na ekranie Dziś oraz pozycja w zakładce „Więcej".
//
// NAPRAWIONY `markAsViewed()`. Do 08.08.2026 oznaczał przy KAŻDYM wejściu
// wszystkie wczytane rekomendacje — łącznie z tymi siedzącymi w ZWINIĘTEJ
// sekcji „Historia rekomendacji". Zawodnik wchodził na ekran, badge spadał do
// zera, a on niczego nie przeczytał. Teraz oznaczane jest wyłącznie to, co jest
// NA EKRANIE WIDOCZNE: sekcja „Warto sprawdzić" od razu, a wiersze historii
// dopiero w momencie jej rozwinięcia (i tylko one).
//
// Karta rekomendacji to `components/RecommendationCard.tsx` — TEN SAM komponent
// co na ekranie Dziś. Tam też przeniosły się dwie naprawy wskazane w audycie:
// przełącznik pola komentarza działający w obie strony i komunikat sukcesu
// renderowany przy karcie, a nie na górze ekranu.
import { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, typography, spacing, minTouchHeight } from '../../constants/theme';
import RecommendationCard, { RECOMMENDATION_COLUMNS, type Recommendation } from '../../components/RecommendationCard';
// ⭐ PLAN-D-C3 15.08.2026 — patrz blok w `loadRecommendations` niżej.
import { rozpoznajPustke, opisBleduOdczytuDoLogu } from '../../lib/trzyPustki';

export default function CentrumDecyzjiScreen() {
  const { currentUser } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  // ⭐ PLAN-D-C3 15.08.2026 — trzy wartości, nie dwie. `null` = jeszcze nie czytałem.
  const [odczytUdanySie, setOdczytUdanySie] = useState<boolean | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Migawka „co było nieprzeczytane w chwili wejścia na ekran" — kropka „Nowe"
  // ma zniknąć dopiero przy KOLEJNEJ wizycie, nie w trakcie tej samej.
  const unreadSnapshotRef = useRef<Set<number>>(new Set());
  // Które wiersze już oznaczyliśmy w tej wizycie — żeby rozwinięcie historii
  // nie wysyłało UPDATE-u na te same id po raz drugi.
  const markedRef = useRef<Set<number>>(new Set());

  // JEDNA DROGA B2 08.08.2026 — oznacza WYŁĄCZNIE przekazane wiersze i wyłącznie
  // te, które są w tym momencie widoczne na ekranie. Patrz nagłówek pliku.
  const markAsViewed = useCallback(async (rows: Recommendation[]) => {
    const unseenIds = rows
      .filter((r) => !r.viewed_at && !markedRef.current.has(r.id))
      .map((r) => r.id);
    if (unseenIds.length === 0) return;
    unseenIds.forEach((id) => markedRef.current.add(id));
    const nowIso = new Date().toISOString();
    const { error: err } = await supabase
      .from('decision_recommendations')
      .update({ viewed_at: nowIso })
      .in('id', unseenIds);
    if (err) {
      // Nie blokujemy UI błędem — brak oznaczenia to tylko kropka, która
      // zostanie przy następnej wizycie, nie utrata danych.
      unseenIds.forEach((id) => markedRef.current.delete(id));
      console.error('centrum-decyzji: nie udało się oznaczyć rekomendacji jako przeczytane:', err);
      return;
    }
    setRecommendations((prev) => prev.map((r) => (unseenIds.includes(r.id) ? { ...r, viewed_at: nowIso } : r)));
  }, []);

  const loadRecommendations = useCallback(async () => {
    if (!currentUser) return;
    setLoadError(null);
    const { data, error: err } = await supabase
      .from('decision_recommendations')
      .select(RECOMMENDATION_COLUMNS)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (err) {
      // ═══════════════════════════════════════════════════════════════
      // ⭐ PLAN-D-C3 15.08.2026 — DWA ZDANIA, KTÓRE MÓWIŁY SOBIE NAWZAJEM
      //    W OCZY, ŻE KŁAMIĄ
      //
      // ⛔ USUNIĘTE Z FUNKCJI `loadRecommendations()`: `setRecommendations([])`.
      //    To był wzorzec „błąd → pusta lista" w najczystszej postaci — i to
      //    na ekranie, który JEDNOCZEŚNIE pokazywał komunikat o błędzie.
      //    Zawodnik po nieudanym odczycie czytał trzy rzeczy naraz:
      //      „Nie udało się wczytać rekomendacji."   (prawda)
      //      „Nic do sprawdzenia w tej chwili."      (nieprawda)
      //      „Brak historii."                        (nieprawda, po rozwinięciu)
      //    Sam komunikat błędu NIE WYSTARCZY, dopóki obok stoi zdanie, które
      //    mówi coś przeciwnego. To jest różnica między „ekran ma komunikat"
      //    a „ekran rozróżnia" — i dlatego liczba komunikatów nie jest miarą.
      //
      // Wiersze sprzed nieudanego odświeżenia ZOSTAJĄ: lista sprzed chwili jest
      // prawdziwsza niż jej wyczyszczenie (ten sam kierunek co `maWpisy`
      // stojące przed wszystkim w `rozpoznajPustke`).
      // ═══════════════════════════════════════════════════════════════
      console.warn(opisBleduOdczytuDoLogu('centrum-decyzji.loadRecommendations → decision_recommendations', err));
      setLoadError('Nie udało się wczytać rekomendacji.');
      setOdczytUdanySie(false);
      return;
    }
    setOdczytUdanySie(true);
    const rows = (data ?? []) as unknown as Recommendation[];
    unreadSnapshotRef.current = new Set(rows.filter((r) => !r.viewed_at).map((r) => r.id));
    markedRef.current = new Set();
    setRecommendations(rows);

    // Widoczne od razu = „Warto sprawdzić". Historia jest zwinięta, więc jej
    // wierszy tu NIE dotykamy (naprawa opisana w nagłówku pliku).
    const visibleNow = rows.filter((r) =>
      (r.recommendation_type === 'specialist_referral' || r.recommendation_type === 'position_fit_signal')
      && !r.feedback_response);
    markAsViewed(visibleNow);
  }, [currentUser, markAsViewed]);

  useFocusEffect(useCallback(() => { loadRecommendations(); }, [loadRecommendations]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  }, [loadRecommendations]);

  const openActionable = recommendations.filter((r) =>
    (r.recommendation_type === 'specialist_referral' || r.recommendation_type === 'position_fit_signal')
    && !r.feedback_response
  );

  // JEDNA DROGA B2 08.08.2026 — historia to teraz „wszystko poza sekcją Warto
  // sprawdzić". Najnowszy training_focus nie jest już wyjmowany do osobnej
  // sekcji „Priorytet tygodnia" (stoi na ekranie Dziś), ale ZOSTAJE na liście —
  // inaczej zniknąłby z appki w chwili, gdy zawodnik chce do niego wrócić.
  const openIds = new Set(openActionable.map((r) => r.id));
  const history = recommendations.filter((r) => !openIds.has(r.id));

  // ⭐ PLAN-D-C3 15.08.2026 — dwie sekcje, dwie pustki, jedna funkcja decyzyjna.
  // Oba zdania idą tu CO DO ZNAKU — ten pas ich nie przepisuje (zakaz 4).
  // ⚠️ Żadne z nich nie niesie następnego kroku i nie musi: „nic do
  // sprawdzenia" to stan, w którym zawodnik nie ma co robić, i tak ma być
  // nazwany. Kroku wymaga wyłącznie `blad_odczytu` — i tam go dostaje.
  const wejscie = {
    planLekcjiZnany: null,
    moznaZapisywac: null,
    odczytUdanySie,
    daSieOdswiezyc: true,
  } as const;
  const pustkaWarto = rozpoznajPustke({
    ...wejscie,
    maWpisy: openActionable.length > 0,
    tekstBrakuDanych: 'Nic do sprawdzenia w tej chwili.',
  });
  const pustkaHistorii = rozpoznajPustke({
    ...wejscie,
    maWpisy: history.length > 0,
    tekstBrakuDanych: 'Brak historii.',
  });

  const renderPustke = (p: ReturnType<typeof rozpoznajPustke>) => (p ? (
    <>
      <Text style={styles.empty}>{p.tekst}</Text>
      {p.krokWTekscie ? null : <Text style={styles.empty}>{p.cta}</Text>}
    </>
  ) : null);

  const toggleHistory = () => {
    setShowHistory((prev) => {
      const next = !prev;
      // Oznaczamy jako przeczytane DOPIERO gdy historia faktycznie się otwiera.
      if (next) markAsViewed(history);
      return next;
    });
  };

  const renderCard = (r: Recommendation) => (
    currentUser ? (
      <RecommendationCard
        key={r.id}
        rec={r}
        currentUserId={currentUser.id}
        isUnread={unreadSnapshotRef.current.has(r.id)}
        onSubmitted={loadRecommendations}
      />
    ) : null
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <Text style={styles.title}>Wszystkie rekomendacje</Text>
      <Text style={styles.subtitle}>
        Wszystko, co system Ci dotąd powiedział. To, na czym masz się skupić dziś, stoi na ekranie Dziś.
      </Text>

      {loadError && <Text style={styles.error}>{loadError}</Text>}

      <View style={{ marginTop: 8 }}>
        <Text style={styles.sectionLabel}>Warto sprawdzić</Text>
        {pustkaWarto ? renderPustke(pustkaWarto) : openActionable.map(renderCard)}
      </View>

      <View style={{ marginTop: 32 }}>
        <TouchableOpacity style={styles.historyToggle} onPress={toggleHistory}>
          <Text style={styles.sectionLabel}>{showHistory ? '▾' : '▸'} Historia rekomendacji</Text>
        </TouchableOpacity>
        {showHistory && (
          pustkaHistorii ? renderPustke(pustkaHistorii) : history.map(renderCard)
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 28, marginBottom: 6, color: colors.textPrimary },
  subtitle: { ...typography.body, fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: spacing.md },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 14 }, // W1: ink3
  historyToggle: { minHeight: minTouchHeight, justifyContent: 'center' },
  error: { color: colors.error, fontSize: 13, marginBottom: 12 },
  empty: { textAlign: 'center', padding: 24, color: colors.textSecondary, fontSize: 14 },
});
