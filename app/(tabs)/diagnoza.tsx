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
//
// ═══════════════════════════════════════════════════════════════════════
// WYNIK DIAGNOZY 07.08.2026 — PRZEBUDOWA ZE STATUSU NA WYNIK
// (BRIEF_DELEGACJA_WYNIK_DIAGNOZY_W_APCE.md)
//
// Do 06.08.2026 ten ekran pokazywał zawodnikowi WYŁĄCZNIE datę ("Pierwsza
// diagnoza — 12 marca 2026"), mimo że `diagnostics.scores` — 13 obszarów,
// treść na której stoi cały produkt — leży w bazie i jest już czytane przez
// lib/livingDiagnosisPulses.ts. Od teraz ekran pokazuje profil: nagłówek
// scenariuszowy bez surowej liczby, wąskie gardła z opisem PRZYCZYNOWYM,
// 13 obszarów w grupach ważonych pozycją, powiązanie z aktywnym Celem.
// Data i przycisk rediagnozy zeszły na dół — to już nie jest sedno ekranu.
//
// Język prezentacji NIE jest wymyślony od nowa — jest przeniesiony 1:1 z
// `gamechange-diagnoza/index.html` (renderResults), czyli z ekranu, na
// którym zawodnik zobaczył swój wynik po ankiecie. Logika portu:
// components/diagnosisProfile.ts, widok: components/DiagnosisProfileView.tsx.
//
// RLS — SPRAWDZONE NA ŻYWO PRZED NAPISANIEM TEGO KODU (Supabase Dashboard →
// Database → Policies, projekt kqrbztsvepjtggjmmcdx, 07.08.2026, tylko
// odczyt): na `public.diagnostics` jest 5 polityk, w tym `diagnostics_
// select_own` (SELECT, authenticated, `USING (auth.uid() = user_id)`).
// RLS w Postgresie działa na WIERSZACH, nie na kolumnach — skoro zawodnik
// czyta swój wiersz po `diagnosis_type,created_at`, czyta też `scores`.
// ŻADNA MIGRACJA NIE JEST POTRZEBNA do tego ekranu. Przy okazji znalezione
// osobne, niezwiązane z tym ekranem ryzyko bezpieczeństwa — patrz raport
// zwrotny B, sekcja 7.
//
// Ekran NIE zadaje ani jednego nowego pytania i niczego nie zapisuje —
// całość jest po stronie oddawania wartości (brief, sekcja OGRANICZENIA).
// Diagnoza żywa pozostaje ZAMROŻONA — ten plik jej nie dotyka.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';
import DiagnosisProfileView, { type StanCelu } from '../../components/DiagnosisProfileView';
// ⭐ PLAN-D-C3 15.08.2026 — patrz blok „TRZY PUSTKI" przy `loadDiagnoza`.
import { rozpoznajPustke, opisBleduOdczytuDoLogu } from '../../lib/trzyPustki';

const DIAGNOZA_URL = 'https://gamechange-diagnoza.vercel.app';
const DIAGNOSIS_TYPE_LABELS: Record<string, string> = {
  initial: 'Pierwsza diagnoza', rediagnosis: 'Rediagnoza',
};

type Status = 'loading' | 'done' | 'missing' | 'error';

export default function DiagnozaScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [detail, setDetail] = useState('');
  // WYNIK DIAGNOZY 07.08.2026 — nowy stan ekranu.
  const [scoresRaw, setScoresRaw] = useState<unknown>(null);
  const [positionLabel, setPositionLabel] = useState<string | null>(null);
  // ⭐ PLAN-D-C3b 15.08.2026 — TRZY STANY, NIE DWA. Było
  // `useState<string | null>(null)`, gdzie `null` znaczyło naraz „nie ma
  // wąskiego gardła" i „nie udało się go odczytać". Pas C3 zmierzył, że to
  // drugie znaczenie docierało do zawodnika jako pierwsze.
  const [cel, setCel] = useState<StanCelu>({ stan: 'nie_wiem' });

  const loadDiagnoza = useCallback(async () => {
    if (!currentUser) return;
    setStatus('loading');
    try {
      // `diagnostics` to log zdarzeń, nie jeden wiersz na diagnozę — filtr
      // `event=eq.email_submitted` jest konieczny (patrz kontrakt sekcja 3).
      //
      // WYNIK DIAGNOZY 07.08.2026 — do listy kolumn dołączone `scores`.
      // Kontrakt (sekcja 3) mówił "tylko `diagnosis_type,created_at` — jedyne,
      // których istnienie potwierdza SQL Domeny 02". `scores` jest potwierdzone
      // niezależnie i mocniej: czyta je dziś lib/livingDiagnosisPulses.ts,
      // api/cron-onboard-diagnosis.js i coach.html, a tabela jest widoczna w
      // Supabase. Kontrakt do aktualizacji przez Kubę — nie edytuję
      // docs/KONTRAKT_DIAGNOZA.md w tej sesji (nie jest na mojej liście plików).
      //
      // Pozycja i aktywny Cel dociągane RÓWNOLEGLE (Promise.all), ten sam
      // wzorzec co fetchPlayerLivingDiagnosisContext() — trzy sekwencyjne
      // zapytania dołożyłyby dwa pełne obroty sieci do ekranu, który i tak
      // odświeża się przy każdym wejściu na zakładkę (useFocusEffect).
      const [diagRes, profileRes, goalRes] = await Promise.all([
        supabase
          .from('diagnostics')
          .select('diagnosis_type,created_at,scores')
          .eq('user_id', currentUser.id)
          .eq('event', 'email_submitted')
          .order('created_at', { ascending: false })
          .limit(1),
        supabase.from('player_profiles').select('position_primary').eq('user_id', currentUser.id).limit(1),
        // "Aktywny cel" = cel PRIORYTETOWY (is_priority=true) — ten sam
        // wzorzec co lib/matchSegmentSelection.ts i lib/livingDiagnosisPulses.ts.
        supabase.from('goals').select('segment_id').eq('user_id', currentUser.id)
          .eq('status', 'active').eq('is_priority', true).limit(1),
      ]);
      if (diagRes.error) throw diagRes.error;

      // Profil i Cel to KONTEKST wzbogacający, nie warunek działania ekranu:
      // ich błąd nie może wywalić całego wyniku diagnozy. Bez pozycji ekran
      // pokazuje 3 grupy zamiast 4 (fallback już obsłużony w
      // groupSegmentsForDisplay), bez Celu — sekcję zachęty do jego założenia.
      //
      // ⚠️ PLAN-D-C3 15.08.2026 — OBA `? null :` BYŁY CICHE: zlewały
      // „nie udało się odczytać" z „zawodnik tego nie ma" i renderowały na tej
      // podstawie zdanie o zawodniku:
      //   • pozycja  → inne grupowanie 13 obszarów i inny scenariusz nagłówka,
      //   • cel      → „Nie masz jeszcze wąskiego gardła."
      //
      // ⭐ PLAN-D-C3b 15.08.2026 — DRUGI Z NICH JEST ZAMKNIĘTY.
      // Blokada z noty C3 §15 zdjęta: `components/DiagnosisProfileView.tsx`
      // wszedł do zakresu tego pasa, a prop `goalSegmentId: string | null`
      // ustąpił miejsca WYMAGANEMU `cel: StanCelu` z trzema stanami. Zawodnik
      // po nieudanym odczycie `goals` czyta „Nie udało się sprawdzić.",
      // a nie zdanie o sobie.
      //
      // ⚠️ ŚCIEŻKA `player_profiles` ZOSTAJE CICHA i to jest świadome: nie
      // stawia zdania, tylko po cichu zmienia grupowanie 13 obszarów. Naprawa
      // wymaga miejsca na ekranie, czyli decyzji o układzie — poza zakazem 5
      // tego pasa. Log zostaje, żeby nie była niewidoczna.
      if (profileRes.error) {
        console.warn(opisBleduOdczytuDoLogu('diagnoza.loadDiagnoza → player_profiles', profileRes.error));
      }
      setPositionLabel(profileRes.error ? null : (profileRes.data?.[0]?.position_primary ?? null));

      if (goalRes.error) {
        console.warn(opisBleduOdczytuDoLogu('diagnoza.loadDiagnoza → goals', goalRes.error));
        setCel({ stan: 'nie_wiem' });
      } else {
        const segmentId = goalRes.data?.[0]?.segment_id ?? null;
        setCel(segmentId ? { stan: 'jest', segmentId } : { stan: 'brak' });
      }

      const latest = diagRes.data?.[0];
      if (latest) {
        const typeLabel = DIAGNOSIS_TYPE_LABELS[latest.diagnosis_type] || latest.diagnosis_type || 'Diagnoza';
        const dateLabel = new Date(latest.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
        setDetail(`${typeLabel} — ${dateLabel}`);
        setScoresRaw(latest.scores ?? null);
        setStatus('done');
      } else {
        setScoresRaw(null);
        setStatus('missing');
      }
    } catch (e: any) {
      // ⭐ PLAN-D-C3 15.08.2026 — POWÓD IDZIE DO LOGU, NIE NA EKRAN.
      // Było: `'Nie udało się sprawdzić statusu diagnozy: ' + e.message`, czyli
      // surowy komunikat bazy wprost do zawodnika. To nie jest jego problem
      // i nie mieści się w żadnym z trzech rejestrów Z0 — a jednocześnie
      // gubiło jedyną rzecz, której zawodnik w tym momencie potrzebuje:
      // co ma zrobić dalej. Teraz zdanie i wyjście dają trzy pustki, a powód
      // ląduje w konsoli, gdzie da się na niego odpowiedzieć.
      console.warn(opisBleduOdczytuDoLogu('diagnoza.loadDiagnoza → diagnostics', e));
      setStatus('error');
    }
  }, [currentUser]);

  useFocusEffect(useCallback(() => { loadDiagnoza(); }, [loadDiagnoza]));

  // ⭐ PLAN-D-C3 15.08.2026 — stan `error` przechodzi przez tę samą funkcję
  // decyzyjną co sześć pozostałych ekranów.
  // ⚠️ `daSieOdswiezyc: false` — ZMIERZONE 15.08.2026: ten ScrollView jako
  // JEDYNY z siedmiu ekranów pasa nie ma `refreshControl`. Odświeża się przez
  // `useFocusEffect`, więc jego wyjściem jest ponowne wejście na ekran,
  // a nie pociągnięcie w dół, którego tu po prostu nie ma.
  const pustkaOdczytu = rozpoznajPustke({
    maWpisy: false,
    planLekcjiZnany: null,
    moznaZapisywac: null,
    odczytUdanySie: status === 'error' ? false : null,
    daSieOdswiezyc: false,
  });

  const openDiagnoza = () => WebBrowser.openBrowserAsync(DIAGNOZA_URL);

  // WYNIK DIAGNOZY 07.08.2026 — wariant awaryjny stanu `done`: wiersz
  // diagnozy istnieje, ale `scores` jest puste albo nieczytelne (mniej niż 3
  // wartości liczbowe — patrz parseScores). Zawodnik dostaje wtedy DOKŁADNIE
  // to, co widział przed tą zmianą (etykieta + data + przycisk rediagnozy w
  // stopce niżej), plus jedno zdanie mówiące prawdę o tym, czego brakuje.
  // Świadomie nie pokazujemy pustych grup ani zer.
  const doneWithoutScores = (
    <View style={styles.block}>
      <Text style={styles.missingText}>Twój profil nie jest jeszcze gotowy do pokazania.</Text>
      <Text style={[styles.missingHint, { marginBottom: 0 }]}>
        Ta diagnoza nie ma zapisanych szczegółowych wyników — widzisz tylko jej datę. Nowa diagnoza wypełni ten ekran
        Twoim pełnym profilem: 13 obszarów, wąskie gardła i ich przyczyny.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* AUDYT 06.08.2026 — dodany ScrollView. Wcześniej treść siedziała w zwykłym
          View: na mniejszym telefonie stan "missing" (tytuł + dwa akapity + przycisk)
          mógł się nie zmieścić, a przycisk "Wykonaj diagnozę" stawał się fizycznie
          nieklikalny — na ekranie, który sam siebie nazywa "podstawą pod resztę systemu". */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Diagnoza</Text>

      {status === 'loading' && <Text style={styles.empty}>Sprawdzam status...</Text>}

      {status === 'done' && (
        <>
          <DiagnosisProfileView
            scoresRaw={scoresRaw}
            positionLabel={positionLabel}
            cel={cel}
            onOpenGoals={() => router.push('/cele')}
            onOpenProfile={() => router.push('/profil')}
            fallback={doneWithoutScores}
          />

          {/* Data + rediagnoza — WYNIK DIAGNOZY 07.08.2026: zeszły na dół
              ekranu, zgodnie z briefem. To kontekst, nie treść główna. */}
          <View style={styles.footerBlock}>
            <Text style={styles.sectionLabel}>Ostatnia diagnoza</Text>
            <Text style={styles.detail}>{detail}</Text>
            <TouchableOpacity style={styles.btn} onPress={openDiagnoza}>
              <Text style={styles.btnText}>Zrób nową diagnozę</Text>
            </TouchableOpacity>
          </View>
        </>
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

      {/* ⭐ PLAN-D-C3 15.08.2026 — dwa zdania zamiast jednego surowego błędu:
          CO SIĘ STAŁO i CO Z TYM ZROBIĆ. Blok `styles.block` jest tym samym,
          którego używa stan `missing` — układ ekranu bez zmian (zakaz 5). */}
      {status === 'error' && pustkaOdczytu && (
        <View style={styles.block}>
          <Text style={styles.missingText}>{pustkaOdczytu.tekst}</Text>
          <Text style={[styles.missingHint, { marginBottom: 0 }]}>{pustkaOdczytu.cta}</Text>
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: 60 },
  title: { ...typography.display, fontSize: 28, marginBottom: spacing.lg, color: colors.textPrimary },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 14 }, // W1: ink3
  block: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: spacing.lg, marginBottom: spacing.lg },
  // WYNIK DIAGNOZY 07.08.2026 — ten sam wygląd co `block`, ale z odstępem od
  // profilu powyżej; osobna nazwa, żeby było widać w kodzie, że to stopka
  // ekranu, nie jego treść główna.
  footerBlock: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: spacing.lg, marginTop: spacing.xl },
  detail: { ...typography.body, fontSize: 15, color: colors.textPrimary, marginBottom: spacing.md },
  missingText: { ...typography.body, fontSize: 15, color: colors.textPrimary, marginBottom: 12 },
  missingHint: { ...typography.body, fontSize: 13, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 19 },
  btn: { minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center' },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  empty: { textAlign: 'center', padding: 32, color: colors.textSecondary, fontSize: 14 },
});
