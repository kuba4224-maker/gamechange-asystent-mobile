// Ekran DZIŚ — NOWY, Krok 2 Toru 7 (SESJA_START_UX_MOBILE_ONBOARDING_NAWIGACJA.md).
// Nowy ekran domowy appki, zastępuje Dziennik jako domyślna zakładka po
// zalogowaniu (patrz app/index.tsx).
//
// DECYZJA ODWRÓCONA 06.08.2026 (BRIEF_DELEGACJA_PROMINENCJA_CELU.md, zatwierdzone
// przez Kubę) — Cel aktywny jest tu dużym, stałym, PIERWSZYM elementem ekranu,
// nie small-printem. Rekomendacja training_focus stoi pod Celem, jawnie z nim
// powiązana (patrz `linkedToGoal` niżej).
//
// ═══════════════════════════════════════════════════════════════════
// JEDNA DROGA B2 08.08.2026 — SCALENIE Z CENTRUM DECYZJI
// (blok B1 „jedna droga, jeden słownik", claude/KREGOSLUP_PRODUKTU_I_DROGA_07_08_2026.md)
//
// PROBLEM, KTÓRY TO ZAMYKA: ten sam rekord bazy — najnowszy `training_focus` —
// był pokazywany w dwóch miejscach, pod dwiema nazwami („Co dziś zrobić" tutaj
// i „Priorytet tygodnia" w Centrum Decyzji), w dwóch ramach czasowych, z niemal
// identycznymi pustymi stanami. Na Dziś nie dało się kliknąć NIC poza przejściem
// dalej — przyciski Wykonałem / Nie wykonałem / Nie miało to sensu były o
// zakładkę dalej. Jedna rzecz, dwie drogi.
//
// CO SIĘ ZMIENIŁO:
//  1. Karta „Co dziś zrobić" pokazuje PEŁNĄ treść rekomendacji i ma realne
//     przyciski feedbacku. Zawodnik odpowiada systemowi bez opuszczania ekranu
//     domowego. Karta to `components/RecommendationCard.tsx` — TEN SAM komponent,
//     który renderuje Centrum Decyzji (zero drugiej kopii kodu karty).
//  2. Ten ekran oznacza jako przeczytaną WYŁĄCZNIE tę jedną rekomendację, którą
//     faktycznie pokazuje. Stary `markAsViewed()` w Centrum Decyzji oznaczał przy
//     każdym wejściu wszystkie wczytane rekomendacje, łącznie z tymi w ZWINIĘTEJ
//     historii — badge spadał do zera, choć zawodnik niczego nie przeczytał.
//  3. Reszta Centrum Decyzji (historia + specialist_referral / position_fit_signal /
//     coach_recommendation) jest dostępna z linku „Wszystkie rekomendacje" niżej.
//     Zakładka zniknęła z paska; trasa żyje (`href: null`, patrz (tabs)/_layout.tsx).
//  4. Wskaźnik pracy w hero Celu — „N z M sesji Bloku Skupienia zrobione",
//     policzone z `focus_blocks` + `calendar_events` + `daily_logs.calendar_event_id`.
//     To zamiennik dwóch wskaźników usuniętych w audycie 06.08.2026 („Aktywny od
//     N tygodni" mierzył upływ czasu i nagradzał stagnację; „N rekomendacji"
//     liczyło wszystkie typy wbrew własnej etykiecie). Ten mierzy PRACĘ.
//     Bez aktywnego Bloku pod tym Celem NIE pokazujemy zastępczej liczby, tylko
//     zaproszenie do zaplanowania pracy.
//
// CO USTĄPIŁO, ŻEBY EKRAN NIE URÓSŁ (zasada „jedno wchodzi, jedno wychodzi"):
//  • Linia „Twój profil z diagnozy →" przestała być osobnym blokiem 48 px pod
//    hero i weszła do środka hero, w jeden rząd z „Zobacz szczegóły celu →".
//    Merytorycznie to jej właściwe miejsce: diagnoza jest uzasadnieniem Celu.
//  • Sekcja „Dziś w kalendarzu" to JEDNA karta z listą pozycji, nie osobna karta
//    na każde wydarzenie. Przy trzech treningach dziennie oszczędza dwie karty.
//  • Z karty rekomendacji zniknął odsyłacz „Zobacz w Centrum Decyzji →" — jest
//    zbędny, skoro treść i przyciski są już tutaj.
//
// Świadomie NIE duplikuje ciężkiej logiki „znajdź wolny dzień w tygodniu"
// z app/(tabs)/kalendarz.tsx (computeCalendarSuggestion) — to jest ekran
// DZISIAJ, węższe pytanie niż planowanie na cały tydzień do przodu.
//
// ═══════════════════════════════════════════════════════════════════
// NAWIGACJA B3 08.08.2026 — HERO CELU KURCZY SIĘ, KALENDARZ I CELE
// WCHŁONIĘTE (decyzje B5 i B8, claude/DECYZJE_PRODUKTOWE_07_08_2026.md)
//
// 1. HERO CELU: ~220 dp → ~101 dp. Zostały trzy rzeczy: nazwa Celu, wskaźnik
//    pracy („3 z 6 sesji zrobione") i pasek. Zeszły do szczegółów Celu
//    (ekran `/cele`): kontekst „skąd się wziął" (`goalOriginContext`) i rząd
//    linków. CEL ZOSTAJE PIERWSZY — decyzja Kuby z 06.08.2026 jest w mocy,
//    tylko spełniona taniej.
//    PO CO TO: żeby przyciski feedbacku rekomendacji („Wykonałem / Nie
//    wykonałem / Nie miało to sensu") weszły NAD ZGIĘCIE. W rundzie 2 stały
//    ~607 dp od góry, czyli poniżej pierwszego ekranu na mniejszym telefonie
//    (iPhone SE ma ~598 dp widocznego obszaru) — jedyna akcja decyzyjna
//    zawodnika wymagała tam scrolla. Teraz ~491 dp, czyli z zapasem.
//    Pomiar i założenia: raport zwrotny B runda 3, sekcja 12.
//    CAŁY KAFELEK JEST PRZYCISKIEM do `/cele` — to są „szczegóły Celu".
//    Osobnych linków w hero nie ma: jeden kafelek, jedno miejsce docelowe.
//
// 2. LINK „TWÓJ PROFIL Z DIAGNOZY" WYPROWADZONY STĄD do zakładki „Ja"
//    (app/(tabs)/ja.tsx), gdzie stoi jako skrót profilu + wejście „Wynik
//    diagnozy". Nie zniknął — zmienił dom na ten, który powstał właśnie po to.
//
// 3. KALENDARZ jest wchłonięty przez ten ekran: zakładki „Kalendarz" nie ma
//    w pasku, trasa `/kalendarz` żyje (`href: null`), a karta „Dziś w
//    kalendarzu" niżej jest jej JEDYNYM wejściem — stąd link mówi wprost
//    „dodaj i zaplanuj", a nie tylko „otwórz". Formularz dodawania,
//    cykliczne, nadchodzące, minione i anulowane są nietknięte, jedno
//    dotknięcie stąd.
import { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { toLocalDateStr, DAYS_OF_WEEK } from '../../lib/date-utils';
// NAWIGACJA B3 08.08.2026 — `goalOriginContext` (lib/goal-prominence.ts) stracił
// tu konsumenta razem ze skurczeniem hero (punkt 1 w nagłówku). Plik ZOSTAJE
// nietknięty; kontekst „skąd się wziął ten Cel" należy teraz do szczegółów Celu
// na ekranie `/cele`, gdzie jest miejsce, żeby go rozwinąć, a nie skracać.
// JEDNA DROGA B2 08.08.2026 — jedno źródło nazw segmentów (lib/labels.ts);
// lokalna kopia 13 nazw usunięta, treść niezmieniona co do znaku.
import { SEGMENT_LABELS } from '../../lib/labels';
import { computeFocusBlockProgress, type FocusBlockProgress } from '../../lib/focusBlockProgress';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';
import LivingDiagnosisPulseCard from '../../components/LivingDiagnosisPulseCard';
import RecommendationCard, { RECOMMENDATION_COLUMNS, type Recommendation } from '../../components/RecommendationCard';

const SEG_LABELS = SEGMENT_LABELS;

const EVENT_TYPE_LABELS: Record<string, string> = {
  club_training: 'Trening klubowy', own_training: 'Trening własny',
  micro_session: 'Mikro-sesja', task: 'Zadanie', match: 'Mecz',
};

type Goal = {
  id: number; segment_id: string; is_priority: boolean; created_at: string;
  origin: string | null; suggestion_note: string | null; refinement_note: string | null;
};
type RecommendationRow = Recommendation & { goal_id: number | null };
type CalEvent = {
  id: number; title: string; event_type: string; scheduled_date: string | null;
  recurrence_rule: string | null; focus_block_id: string | null;
};
type FocusBlockRow = { id: string; segment_id: string; status: string };

function dayCodeFor(date: Date) {
  const idx = (date.getDay() + 6) % 7; // 0=Pon..6=Nd — ta sama konwencja co lib/date-utils.ts
  return DAYS_OF_WEEK[idx][0];
}

export default function DzisScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();

  const [priorityGoal, setPriorityGoal] = useState<Goal | null>(null);
  const [hasAnyGoal, setHasAnyGoal] = useState(false);
  const [loggedToday, setLoggedToday] = useState(false);
  const [focusRec, setFocusRec] = useState<RecommendationRow | null>(null);
  const [otherUnreadCount, setOtherUnreadCount] = useState(0);
  const [openActionableCount, setOpenActionableCount] = useState(0);
  const [todayEvents, setTodayEvents] = useState<CalEvent[]>([]);
  const [workProgress, setWorkProgress] = useState<FocusBlockProgress>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Migawka „co było nieprzeczytane w chwili wejścia na ekran" — ten sam wzorzec
  // co w centrum-decyzji.tsx: kropka „Nowe" nie może zniknąć w trakcie tej samej
  // wizyty, zaraz po asynchronicznym oznaczeniu jako przeczytane.
  const unreadSnapshotRef = useRef<Set<number>>(new Set());

  // JEDNA DROGA B2 08.08.2026 — oznaczamy JEDNĄ rekomendację: tę, którą ten ekran
  // faktycznie wyrenderował. Nigdy hurtem, nigdy niewidocznych. Patrz nagłówek, punkt 2.
  const markShownAsViewed = useCallback(async (rec: RecommendationRow | null) => {
    if (!rec || rec.viewed_at) return;
    const nowIso = new Date().toISOString();
    const { error: err } = await supabase
      .from('decision_recommendations')
      .update({ viewed_at: nowIso })
      .eq('id', rec.id);
    if (err) {
      // Brak oznaczenia to tylko kropka przy kolejnej wizycie, nie utrata danych.
      console.error('dzis: nie udało się oznaczyć rekomendacji jako przeczytanej:', err);
      return;
    }
    setFocusRec((prev) => (prev && prev.id === rec.id ? { ...prev, viewed_at: nowIso } : prev));
  }, []);

  const load = useCallback(async () => {
    if (!currentUser) return;
    const todayStr = toLocalDateStr(new Date());
    const todayCode = dayCodeFor(new Date());
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [goalsRes, logsRes, recsRes, eventsRes, blocksRes, doneLogsRes] = await Promise.all([
      supabase.from('goals').select('id,segment_id,is_priority,status,created_at,origin,suggestion_note,refinement_note')
        .eq('user_id', currentUser.id).eq('status', 'active')
        .order('is_priority', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('daily_logs').select('id')
        .eq('user_id', currentUser.id).gte('created_at', startOfDay.toISOString()).limit(1),
      // JEDNA DROGA B2 08.08.2026 — pełne kolumny karty (nie skrót jak dotąd),
      // bo karta pokazuje teraz całą treść i przyciski. Ta sama lista kolumn co
      // w Centrum Decyzji (RECOMMENDATION_COLUMNS) — jedno źródło.
      supabase.from('decision_recommendations').select(RECOMMENDATION_COLUMNS)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false }),
      supabase.from('calendar_events').select('id,title,event_type,scheduled_date,recurrence_rule,focus_block_id')
        .eq('user_id', currentUser.id).eq('status', 'scheduled'),
      supabase.from('focus_blocks').select('id,segment_id,status')
        .eq('user_id', currentUser.id).eq('status', 'active'),
      // Wykonanie sesji rozpoznajemy po `daily_logs.calendar_event_id` — ten sam
      // wzorzec co plakietki „Wykonano / Nie wykonano" w kalendarz.tsx.
      supabase.from('daily_logs').select('calendar_event_id')
        .eq('user_id', currentUser.id).not('calendar_event_id', 'is', null),
    ]);

    const goals = (goalsRes.data ?? []) as Goal[];
    const goal = goals.find((g) => g.is_priority) ?? goals[0] ?? null;
    setPriorityGoal(goal);
    setHasAnyGoal(goals.length > 0);

    setLoggedToday(!!(logsRes.data && logsRes.data.length > 0));

    const recs = (recsRes.data ?? []) as unknown as RecommendationRow[];
    const rec = recs.find((r) => r.recommendation_type === 'training_focus') ?? null;
    unreadSnapshotRef.current = new Set(recs.filter((r) => !r.viewed_at).map((r) => r.id));
    setFocusRec(rec);
    // „N nowe" na linku do wszystkich rekomendacji liczy WYŁĄCZNIE te, których
    // ten ekran nie pokazuje — inaczej etykieta kłamałaby zaraz po wejściu.
    setOtherUnreadCount(recs.filter((r) => !r.viewed_at && r.id !== rec?.id).length);
    setOpenActionableCount(recs.filter((r) =>
      (r.recommendation_type === 'specialist_referral' || r.recommendation_type === 'position_fit_signal')
      && !r.feedback_response).length);
    markShownAsViewed(rec);

    const events = (eventsRes.data ?? []) as CalEvent[];
    const forToday = events.filter((e) =>
      e.scheduled_date === todayStr ||
      (!!e.recurrence_rule && e.recurrence_rule.replace('weekly:', '').split(',').includes(todayCode))
    );
    setTodayEvents(forToday);

    // ─── Wskaźnik pracy (patrz nagłówek pliku, punkt 4) ───────────────
    // Cała logika (i uzasadnienie każdej decyzji) siedzi w
    // lib/focusBlockProgress.ts — czysta funkcja, uruchamiana i sprawdzana bez
    // appki przez lib/focusBlockProgress.selftest.ts. Tutaj tylko dane.
    setWorkProgress(computeFocusBlockProgress({
      goalSegmentId: goal?.segment_id ?? null,
      activeBlocks: (blocksRes.data ?? []) as FocusBlockRow[],
      scheduledEvents: events, // wyłącznie status='scheduled' — patrz zapytanie wyżej
      doneEventIds: new Set(((doneLogsRes.data ?? []) as { calendar_event_id: number }[])
        .map((l) => l.calendar_event_id)),
    }));

    setLoading(false);
  }, [currentUser, markShownAsViewed]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const todayLabel = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  const goalSegmentLabel = priorityGoal ? (SEG_LABELS[priorityGoal.segment_id] ?? priorityGoal.segment_id) : null;
  const isRecLinkedToGoal = !!focusRec && !!priorityGoal && focusRec.goal_id === priorityGoal.id;

  const allRecsLinkLabel = otherUnreadCount > 0
    ? `Wszystkie rekomendacje (${otherUnreadCount} nowe) →`
    : openActionableCount > 0
      ? `Wszystkie rekomendacje (${openActionableCount} do sprawdzenia) →`
      : 'Wszystkie rekomendacje →';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        <Text style={styles.eyebrow}>{todayLabel}</Text>
        <Text style={styles.title}>Dziś</Text>

        {/* CEL — element PIERWSZY ekranu (zatwierdzone 06.08.2026), od
            08.08.2026 mały: nazwa + wskaźnik pracy + pasek, nic więcej.
            Cały kafelek to przycisk do szczegółów Celu (`/cele`) — patrz
            punkt 1 w nagłówku pliku.
            `numberOfLines={1}` na nazwie trzyma wysokość przewidywalną —
            i wszystkie 13 nazw segmentów faktycznie się w tej jednej linii
            mieści, także najdłuższa („Technika Specjalistyczna", 24 znaki),
            także na ekranie 320 dp szerokości. Policzone, nie założone —
            raport zwrotny B runda 3, sekcja 12. Dlatego rozmiar to 21 px,
            a nie 22: przy 22 px najdłuższa nazwa wychodziła 5 dp za wąski
            ekran i zostałaby ucięta wielokropkiem. */}
        <TouchableOpacity style={styles.heroGoal} onPress={() => router.push('/cele')}>
          <Text style={styles.heroEyebrow}>Twój aktywny Cel</Text>
          {priorityGoal ? (
            <>
              <Text style={styles.heroTitle} numberOfLines={1}>{goalSegmentLabel}</Text>

              {/* Wskaźnik PRACY, nie upływu czasu (JEDNA DROGA B2 08.08.2026).
                  NAWIGACJA B3 08.08.2026 — skrócony do brzmienia z decyzji B5:
                  „3 z 6 sesji zrobione". Słowa „Bloku Skupienia" zeszły razem
                  z resztą kontekstu do szczegółów Celu; pod nazwą Celu nie ma
                  wątpliwości, o jakich sesjach mowa. */}
              {workProgress ? (
                <>
                  <Text style={styles.workText}>
                    {workProgress.done} z {workProgress.total} sesji zrobione
                  </Text>
                  <View style={styles.workTrack}>
                    <View style={[styles.workFill, { width: `${Math.round((workProgress.done / workProgress.total) * 100)}%` }]} />
                  </View>
                </>
              ) : (
                // Brak Bloku pod ten Cel → ŻADNEJ zastępczej liczby (nigdy
                // „0 z 0"), tylko zaproszenie. Zwykły tekst, nie osobny
                // przycisk: cały kafelek prowadzi w to samo miejsce.
                <Text style={styles.heroAction}>Zaplanuj pracę nad tym Celem →</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.heroTitle}>Nie masz jeszcze Celu</Text>
              <Text style={styles.heroAction}>Załóż pierwszy Cel →</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Rekomendacja dnia — od 08.08.2026 PEŁNA, z przyciskami. Jedyna akcja
            decyzyjna na ekranie domowym. */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionLabel}>Co dziś zrobić</Text>
          {focusRec && currentUser ? (
            <>
              <RecommendationCard
                rec={focusRec}
                currentUserId={currentUser.id}
                isUnread={unreadSnapshotRef.current.has(focusRec.id)}
                headerSlot={isRecLinkedToGoal && goalSegmentLabel
                  ? <Text style={styles.linkedToGoal}>Pomaga Ci w celu: {goalSegmentLabel}</Text>
                  : null}
                onSubmitted={load}
              />
              <TouchableOpacity style={styles.inlineLink} onPress={() => router.push('/centrum-decyzji')}>
                <Text style={styles.cardAction}>{allRecsLinkLabel}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardBody}>
                {hasAnyGoal
                  ? 'Jeszcze nie mamy dla Ciebie gotowej rekomendacji — pojawi się tu, gdy silnik Centrum Decyzji zacznie działać.'
                  : 'Załóż swój pierwszy Cel, żeby system zaczął podpowiadać, na czym się skupić.'}
              </Text>
              <TouchableOpacity style={styles.inlineLink} onPress={() => router.push(hasAnyGoal ? '/centrum-decyzji' : '/cele')}>
                <Text style={styles.cardAction}>{hasAnyGoal ? allRecsLinkLabel : 'Przejdź do Celów →'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Diagnoza żywa — Funkcja 10, część 2 (INTEGRACJA_DIAGNOZA_ZYWA.md).
            Renderuje się sama w null, gdy pulse nie jest dziś należny.
            ⛔ Zamrożona 06.08.2026 (LIVING_DIAGNOSIS_PULSE_ENABLED = false) —
            nietknięta w tej sesji, nie odmrażana. */}
        <LivingDiagnosisPulseCard />

        {/* Wpis dnia */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionLabel}>Dziennik</Text>
          <TouchableOpacity style={[styles.card, loggedToday && styles.cardMuted]} onPress={() => router.push('/dziennik')}>
            <Text style={styles.cardLabel}>
              {loggedToday ? 'Dzisiejszy wpis zapisany' : 'Nie masz jeszcze dzisiejszego wpisu'}
            </Text>
            <Text style={styles.cardAction}>{loggedToday ? 'Dodaj kolejny wpis →' : 'Zapisz dzisiejszy wpis →'}</Text>
          </TouchableOpacity>
        </View>

        {/* Dzisiejszy kalendarz. JEDNA DROGA B2 08.08.2026 — jedna karta z listą
            zamiast osobnej karty na każde wydarzenie (patrz nagłówek: co ustąpiło). */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionLabel}>Dziś w kalendarzu</Text>
          <TouchableOpacity style={styles.card} onPress={() => router.push('/kalendarz')}>
            {todayEvents.length === 0 ? (
              <Text style={styles.cardBody}>Nic zaplanowanego na dziś.</Text>
            ) : (
              todayEvents.map((e) => (
                <Text key={e.id} style={styles.eventLine}>
                  <Text style={styles.eventTitle}>{e.title}</Text>
                  {'  ·  '}{EVENT_TYPE_LABELS[e.event_type] || e.event_type}
                </Text>
              ))
            )}
            {/* NAWIGACJA B3 08.08.2026 — to jest JEDYNE wejście do Kalendarza
                po zabraniu jego zakładki z paska, więc link musi nazywać obie
                rzeczy, które są po drugiej stronie: przeglądanie i dodawanie.
                „Otwórz Kalendarz →" nie mówiłoby zawodnikowi, że stamtąd
                planuje się trening. */}
            <Text style={styles.cardAction}>Kalendarz — dodaj i zaplanuj →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  eyebrow: { ...typography.bodyMedium, fontSize: 12, letterSpacing: 1, textTransform: 'capitalize', color: colors.textSecondary, marginBottom: 4 },
  title: { ...typography.display, fontSize: 32, marginBottom: spacing.lg, color: colors.textPrimary },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 16, marginBottom: 10 },
  cardMuted: { opacity: 0.7 },
  cardLabel: { ...typography.bodySemiBold, fontSize: 15, color: colors.textPrimary, marginBottom: 4 },
  cardBody: { ...typography.body, fontSize: 14, color: colors.textSecondary, marginBottom: 8, lineHeight: 20 },
  cardAction: { ...typography.bodyMedium, fontSize: 13, color: colors.brand },
  linkedToGoal: { ...typography.bodyMedium, fontSize: 12, color: colors.brand, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  // NAWIGACJA B3 08.08.2026 — hero Celu skurczone z ~220 dp do ~102 dp
  // (decyzja B5). Wysokość składa się z: 24 (padding pionowy 12+12)
  // + 17,8 (nadtytuł 11 px + 4 marginesu) + 32,3 (nazwa 21 px, jedna linia,
  // + 6 marginesu) + 21,3 (wskaźnik 13 px + 5) + 4 (pasek) + 2 (ramka) ≈ 101 dp.
  // Cel B5 brzmiał „~90" — jesteśmy 12 dp wyżej i to jest świadome: zejście
  // niżej wymagałoby usunięcia jednej z trzech rzeczy, które B5 kazała
  // zostawić (nazwa / wskaźnik / pasek) albo zwężenia oddechu do 8 px.
  // Zmienione względem stanu z rundy 2: `padding` 20 → 12/16, `heroTitle`
  // 30 px → 22 px, usunięte `heroContext` i `heroLinksRow`.
  // Cały kafelek jest dotykalny, więc nie potrzebuje własnych stref dotyku
  // 48 dp w środku — i to jest połowa oszczędzonej wysokości.
  heroGoal: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 4, borderLeftColor: colors.brand, borderRadius: radii.lg,
    paddingVertical: 12, paddingHorizontal: 16, marginBottom: 4,
  },
  heroEyebrow: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 4 },
  heroTitle: { ...typography.displayExtraBold, fontSize: 21, color: colors.textPrimary, marginBottom: 6 },
  heroAction: { ...typography.bodyMedium, fontSize: 13, color: colors.brand },
  // JEDNA DROGA B2 08.08.2026 — wskaźnik pracy.
  workText: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary, marginBottom: 5 },
  workTrack: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  workFill: { height: 4, borderRadius: 2, backgroundColor: colors.brand },
  inlineLink: { minHeight: minTouchHeight, justifyContent: 'center' },
  eventLine: { ...typography.body, fontSize: 14, color: colors.textPrimary, marginBottom: 6, lineHeight: 20 },
  eventTitle: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary },
});
