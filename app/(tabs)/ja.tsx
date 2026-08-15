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
//
// ═══════════════════════════════════════════════════════════════════
// ZMIANA OBRAZU B5 08.08.2026 — BIBLIOTEKA WYPROWADZIŁA SIĘ STĄD
// (pozycja M2 audytu po bloku 4)
//
// Sekcja „Twoje materiały" — dołożona tu w rundzie 4 (decyzja C1 warstwa 3)
// — ma od tej rundy WŁASNY EKRAN: `app/(tabs)/biblioteka.tsx`, trasa chowana
// (`href: null`). Tutaj zostaje NAZWANE WEJŚCIE w sekcji „Twój rozwój", tym
// samym wzorcem co „Wynik diagnozy", „Wszystkie rekomendacje" i „Cele".
//
// POWÓD JEST ZMIERZONY, NIE ODCZUTY. Runda 4 podniosła ten ekran z 803 dp do
// 1 353 dp, a w najgorszym realnym przypadku (Cel + trzy różne wąskie gardła)
// do 1 578 dp — 2,64 ekranu scrolla na małym telefonie. Ten sam raport
// postawił próg: „2,5 ekranu → biblioteka dostaje własną trasę". Skutek:
// „Ustawienia" i „Wyloguj się" wracają w zasięg jednego przewinięcia.
// Pomiar odtwarzalny: `npx tsx tests/measure-heights.ts`.
//
// CO ZOSTAJE TUTAJ: wyłącznie LICZBA otwartych materiałów w podpisie wejścia.
// Liczy się z dwóch rzeczy, które ten ekran i tak już pobiera (segmenty
// aktywnych Celów i wąskie gardła z diagnozy) — ZERO nowych zapytań, tak samo
// jak przed przeprowadzką.
//
// ⚠️ Karty materiałów NADAL nie są klikalne — sposób wydania pliku PDF jest
// nierozstrzygnięty (M3). Uzasadnienie w nagłówku nowego ekranu.
//
// ═══════════════════════════════════════════════════════════════════
// WIEDZA B4 08.08.2026 — DŁUG N3 (znalezisko B16). Ten ekran pobierał
// WSZYSTKIE wiersze `decision_recommendations` zawodnika po to, żeby wyliczyć
// dwie liczby przy podpisach. Po roku gry to kilkaset wierszy przy każdym
// wejściu na zakładkę. Teraz są to dwa zapytania `head: true` +
// `count: 'exact'` — baza liczy u siebie i odsyła same liczby, zero wierszy.
import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, typography, spacing, radii, minTouchHeight, skew } from '../../constants/theme';
// ⭐ PLAN-D-G1 08.2026 (15.08.2026) — było `segmentLabel`, czyli funkcja
// oddająca surowe `id` z bazy przy segmencie spoza słownika. Teraz
// `opiszSegment()` z dwiema gałęziami (pas F2) — patrz `load()`.
import { opiszSegment, opisNieznanegoSegmentuDoLogu } from '../../lib/labels';
import {
  parseScores,
  getRelativeDeficits,
  detectScenario,
  scenarioHeadline,
} from '../../components/diagnosisProfile';
import { unlockedMaterials, libraryEntryHint, LIBRARY_SECTION_LABEL } from '../../lib/materials';
// PLAN-D-E 08.2026 — OŚ DECYZJI wchodzi tym ekranem.
//
// ⚠️ PUNKTU POMOCY TU NIE MA I NIE MA GO TU DOKŁADAĆ jako komponentu. Jest
// zamontowany raz, w `app/_layout.tsx`, nad `<Slot />` — czyli leży nad KAŻDYM
// ekranem, także nad Dziennikiem i Meczem (decyzja Kuby 11.08.2026). Druga
// kopia tutaj znaczyłaby dwa `useEffect` czytające tę samą flagę „ekran prawdy
// już był" i wyścig, w którym oba mogą otworzyć modal.
// Stąd idzie WYŁĄCZNIE prośba o otwarcie: `otworzPunktPomocy()`.
//
// MAPA DROGI — pełnoekranowy modal, NIE nowa trasa w `app/(tabs)/`.
// Powód (piąta zakładka, zakaz 10) jest w nagłówku `components/MojaDroga.tsx`.
import MojaDroga from '../../components/MojaDroga';
import { MAPA_ENTRY_LABEL, MAPA_ENTRY_HINT_DOSTEPNA } from '../../lib/mapaDrogi';
// PLAN-D-H 08.2026 (12.08.2026) — ŚCIEŻKA WYJŚCIA dostaje wejście: `exit_mode`
// miało ZERO wierszy, bo żaden ekran do niej nie pisał, a czytnik arbitra pytał
// o stan, którego nikt nie umiał włączyć. Wchodzi jako pełnoekranowy modal, nie
// jako trasa: powód (piąta zakładka, zakaz 10) w nagłówku `components/MojaDroga.tsx`.
// ⚠️ PLAN-D-P 08.2026 (13.08.2026) — DRUGIE WEJŚCIE, KALIBRACJA, ZNIKŁO STĄD
// RAZEM Z CAŁYM NARZĘDZIEM (claude/DECYZJA_KALIBRACJA_USUNIETA_13_08_2026.md).
// Razem z nim odszedł parametr trasy `otworz`: kalibracja była JEDYNYM głosem
// tygodnia, który miał dokąd prowadzić, więc karta na ekranie „Dziś" nie
// nawiguje już nigdzie i ta zakładka nie ma czego otwierać z parametru.
import SciezkaWyjscia from '../../components/SciezkaWyjscia';
import { WYJSCIE_WEJSCIE_LABEL, WYJSCIE_WEJSCIE_PODPIS } from '../../lib/sciezkaWyjscia';
// ⭐ PLAN-D-C2 08.2026 (14.08.2026) — LISTA „MOJE ZADANIA" (WT-19).
//
// Pełnoekranowy modal, NIE nowa trasa w `app/(tabs)/` — ten sam wzorzec i ten
// sam powód co przy Mapie drogi i Ścieżce wyjścia: nagłówek `_layout.tsx` mówi
// wprost, że nowy plik w tym katalogu bez wpisu `href: null` wraca jako PIĄTA
// ZAKŁADKA, a wpisu w `_layout.tsx` ten pas zrobić nie może (zasada A1).
// Pełne uzasadnienie w nagłówku `components/ListaZadan.tsx`.
//
// ⚠️ TEN EKRAN NIE LICZY KOLEJKI. Kolejność i kubełki liczy ranker
// (`lib/kolejkaPodania.ts`) — i to WEWNĄTRZ modala, nie tutaj. Stąd idzie
// wyłącznie jedno: cztery stany odczytu `player_tasks`, żeby podpis wejścia
// odróżniał „nie masz zadań" od „nie dostałem Twoich zadań" (R5). Bez tego
// wiersz miałby opis na sztywno, czyli ten sam defekt, który 10.08 poprawiono
// przy „Wyniku diagnozy".
import ListaZadan from '../../components/ListaZadan';
import { odczytZadan, SELECT_ZADANIA, TABELA_ZADAN, type OdczytZadan } from '../../lib/zadania';
import { WEJSCIE_LISTA_LABEL, zdanieOdczytu } from '../../lib/listaZadan';
import { otworzPunktPomocy } from '../../components/PunktPomocy';
import { POMOC_PRZYCISK, POMOC_WIERSZ_PODPIS } from '../../lib/labels';

// ⭐ PLAN-D-C3 15.08.2026 — patrz `load()` i blok „TRZY PUSTKI" niżej.
import { rozpoznajPustke, opisBleduOdczytuDoLogu } from '../../lib/trzyPustki';

type DiagnosisSummary =
  | { state: 'loading' }
  | { state: 'none' }
  | { state: 'unreadable' }
  // ⭐ PLAN-D-C3 15.08.2026 — PIĄTY STAN. Do dziś odczyt `diagnostics`, który
  // padł, wpadał do `'none'` razem z „zawodnik nie zrobił diagnozy" — i karta
  // mówiła mu wprost „Nie masz jeszcze diagnozy". Komentarz przy tamtym
  // zlaniu bronił go tym, że ekran „Wynik diagnozy" niżej i tak pokaże
  // prawdziwy powód. Nie pokaże, dopóki zawodnik tam nie wejdzie — a wejdzie
  // rzadziej właśnie dlatego, że przed chwilą przeczytał, że nie ma czego
  // oglądać. Zdanie, które gasi ciekawość, nie może być zgadywaniem.
  | { state: 'blad_odczytu' }
  | { state: 'ready'; headline: string; desc: string; deficitLabels: string[] };

type MenuRoute = '/diagnoza' | '/centrum-decyzji' | '/cele' | '/biblioteka' | '/profil';

export default function JaScreen() {
  const { currentUser, signOut } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<DiagnosisSummary>({ state: 'loading' });
  const [unreadRecs, setUnreadRecs] = useState(0);
  const [openActionableRecs, setOpenActionableRecs] = useState(0);
  const [activeGoals, setActiveGoals] = useState(0);
  // ⭐ PLAN-D-C3 15.08.2026 — trzy wartości, nie dwie. `null` = jeszcze nie
  // czytałem. Rozstrzyga podpisy przy „Cele" i przy bibliotece, bo OBA liczą
  // się z tego samego odczytu `goals`.
  const [odczytCelowUdanySie, setOdczytCelowUdanySie] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // ZMIANA OBRAZU B5 08.08.2026 — po przeprowadzce biblioteki został tu sam
  // LICZNIK do podpisu wejścia. Liczony z dwóch rzeczy, które ekran i tak już
  // pobiera: segmentów aktywnych Celów i wąskich gardeł z diagnozy.
  // ZERO nowych zapytań i zero nowych pytań do zawodnika.
  const [libraryCount, setLibraryCount] = useState(0);
  // PLAN-D-E 08.2026 — Mapa drogi. Stan lokalny ekranu, ZERO zapisu:
  // otwarcie Mapy nie jest zdarzeniem o zawodniku i nie zostawia śladu.
  const [drogaOtwarta, setDrogaOtwarta] = useState(false);
  // PLAN-D-H 08.2026 — stan lokalny, ZERO zapisu przy samym otwarciu.
  // Otwarcie ekranu nie jest zdarzeniem o zawodniku i nie zostawia śladu;
  // ścieżkę wyjścia włącza dopiero jawne potwierdzenie w środku modala.
  const [wyjscieOtwarte, setWyjscieOtwarte] = useState(false);
  // PLAN-D-C2 08.2026 — lista zadań. Stan lokalny, ZERO zapisu przy otwarciu:
  // otwarcie listy nie jest zdarzeniem o zawodniku i nie zostawia śladu.
  const [zadaniaOtwarte, setZadaniaOtwarte] = useState(false);
  // ⚠️ CZTERY STANY, NIE DWA. `null` znaczy „jeszcze nie czytałem", a nie
  // „nie masz zadań" — podpis wejścia startuje wtedy pusty zamiast kłamać.
  const [odczytZadanStan, setOdczytZadanStan] = useState<OdczytZadan | null>(null);

  const load = useCallback(async () => {
    if (!currentUser) return;

    // Sześć zapytań równolegle, żadne nie czeka na inne — ten sam wzorzec
    // co `load()` na ekranie Dziś. Każde z nich to WYŁĄCZNIE odczyt.
    // ⚠️ PLAN-D-C2 14.08.2026 — szóste zapytanie doszło razem z wejściem
    // „Moje zadania". Zmierzone: `player_tasks` = 0 wierszy, więc jego koszt
    // jest dziś zerowy, a bez niego podpis wejścia nie odróżniłby czterech
    // stanów R5 i musiałby stać na sztywnym zdaniu.
    const [diagRes, profileRes, unreadRes, actionableRes, goalsRes, zadaniaRes] = await Promise.all([
      // `diagnostics` to log zdarzeń, nie jeden wiersz na diagnozę — filtr
      // `event='email_submitted'` jest konieczny (ten sam co w diagnoza.tsx).
      supabase.from('diagnostics').select('scores')
        .eq('user_id', currentUser.id).eq('event', 'email_submitted')
        .order('created_at', { ascending: false }).limit(1),
      supabase.from('player_profiles').select('position_primary')
        .eq('user_id', currentUser.id).limit(1),
      // WIEDZA B4 08.08.2026 — dług N3. Dwie liczby, dwa zapytania liczące,
      // ZERO pobranych wierszy (`head: true` nie ściąga ciała odpowiedzi).
      // Rozdzielone na dwa, bo to dwa różne warunki — jednym zapytaniem dałoby
      // się je policzyć tylko pobierając wiersze, czyli wracając do problemu.
      supabase.from('decision_recommendations').select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id).is('viewed_at', null),
      supabase.from('decision_recommendations').select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .in('recommendation_type', ['specialist_referral', 'position_fit_signal'])
        .is('feedback_response', null),
      // WIEDZA B4 08.08.2026 — doszło `segment_id` (karmi bibliotekę) i filtr
      // `status='active'` przeniesiony do bazy. Było: wszystkie cele zawodnika,
      // filtrowane w appce tylko po to, żeby policzyć aktywne.
      supabase.from('goals').select('segment_id').eq('user_id', currentUser.id).eq('status', 'active'),
      // PLAN-D-C2 08.2026 — zadania zawodnika. ⛔ CAŁA odpowiedź idzie do
      // `odczytZadan`, nie `data ?? []`: „nie udało się odczytać" i „nic nie
      // masz" to dwie różne rzeczy i tylko jedna z nich jest o zawodniku.
      supabase.from(TABELA_ZADAN).select(SELECT_ZADANIA).eq('user_id', currentUser.id),
    ]);

    // WIEDZA B4 08.08.2026 — segmenty aktywnych Celów: podpis przy „Cele"
    // i pierwsze źródło odblokowań w bibliotece.
    //
    // ⛔ PLAN-D-C3 15.08.2026 — USUNIĘTE Z FUNKCJI `load()`: `(goalsRes.data ?? [])`.
    //    Odmowa RLS na `goals` dawała zero segmentów, a z tego zera brały się
    //    DWA zdania o zawodniku naraz: „Wskaż wąskie gardło — to ono napędza
    //    resztę appki" przy wierszu „Cele" i „Otwiera je Cel albo diagnoza"
    //    przy bibliotece. Oba czytał ktoś, kto wąskie gardło ma.
    const odczytCelowOk = !goalsRes.error;
    if (goalsRes.error) {
      console.warn(opisBleduOdczytuDoLogu('ja.load → goals', goalsRes.error));
    }
    setOdczytCelowUdanySie(odczytCelowOk);
    // ⚠️ Pusta lista przy `odczytCelowOk === false` NIE JEST już twierdzeniem:
    // od tej rundy nie ona rozstrzyga podpisy, tylko `odczytCelowUdanySie`.
    const wierszeCelow: { segment_id: string }[] = odczytCelowOk
      ? (goalsRes.data as { segment_id: string }[])
      : [];
    const goalSegmentIds = wierszeCelow
      .map((g) => g.segment_id)
      .filter((s): s is string => !!s);
    setActiveGoals(goalSegmentIds.length);

    // Wąskie gardła z diagnozy — drugie źródło odblokowań. Wypełniane tylko
    // w stanie `ready`; przy braku albo nieczytelnej diagnozie zostaje pusta
    // lista i biblioteka opiera się wyłącznie na Celach.
    let deficitSegmentIds: string[] = [];

    // ─── Skrót profilu z diagnozy ─────────────────────────────────
    // ⭐ PLAN-D-C3 15.08.2026 — ROZDZIELONE. Było jedno `if`:
    //   `if (diagRes.error || !diagRes.data || diagRes.data.length === 0)`
    //   → `setSummary({ state: 'none' })` → „Nie masz jeszcze diagnozy".
    // Uzasadnienie tamtego zlania („wejście niżej i tak pokaże prawdziwy
    // powód") nie broni się: prowadzi tam link, w który zawodnik właśnie
    // przestał mieć powód klikać.
    if (diagRes.error) {
      console.warn(opisBleduOdczytuDoLogu('ja.load → diagnostics', diagRes.error));
      setSummary({ state: 'blad_odczytu' });
    } else if (!diagRes.data || diagRes.data.length === 0) {
      setSummary({ state: 'none' });
    } else {
      const scores = parseScores((diagRes.data[0] as { scores: unknown }).scores);
      if (!scores) {
        setSummary({ state: 'unreadable' });
      } else {
        // ⚠️ PLAN-D-C3 15.08.2026 — ZOSTAJE, ALE PRZESTAJE BYĆ CICHE: nieudany
      // odczyt profilu daje `hasPosition === false`, czyli INNY scenariusz
      // nagłówka o zawodniku, nieodróżnialny od „nie ustawił pozycji".
      if (profileRes.error) {
        console.warn(opisBleduOdczytuDoLogu('ja.load → player_profiles', profileRes.error));
      }
      const hasPosition = !profileRes.error && !!profileRes.data?.[0]?.position_primary;
        const deficits = getRelativeDeficits(scores, 3);
        const scenario = detectScenario(scores, hasPosition);
        const { headline, desc } = scenarioHeadline(scenario, deficits.length);
        deficitSegmentIds = deficits.map(([id]) => id);
        // ═══════════════════════════════════════════════════════════════
        // ⭐ PLAN-D-G1 08.2026 (15.08.2026) — KONIEC `segmentLabel()` TUTAJ
        // ═══════════════════════════════════════════════════════════════
        //
        // Do dziś stało tu `deficits.map(([id]) => segmentLabel(id))`, a ta
        // funkcja przy segmencie spoza słownika oddaje SUROWE `id` z bazy.
        // Trzy nazwy z tej listy idą prosto na kartę profilu, sklejone „ · ",
        // więc zawodnik czytałby `Moc · explosive_power · Regeneracja` i nie
        // miałby jak zgłosić, że drugiej pozycji nie rozumie — surowa wartość
        // WYGLĄDA jak nazwa.
        //
        // ── DZIEDZINA: OTWARTA, ZERO OGRANICZEŃ (znalezisko F2-4) ────────
        // `id` to KLUCZ z `diagnostics.scores` (jsonb). Ta kolumna nie ma
        // ani FK, ani CHECK-a, ani niczego — dziedziny nie domyka nic poza
        // tym, co zapisze ankieta. Jeden `insert` z nowym kluczem wystarczy.
        //
        // ── KSZTAŁT MIEJSCA: ETYKIETA W WYLICZENIU ───────────────────────
        // Wynik trafia do `<Text style={heroSegments}>{…join('  ·  ')}</Text>`,
        // czyli każda pozycja stoi SAMODZIELNIE między separatorami. Komunikat
        // „nie znam" czyta się tu poprawnie i nie trzeba osobnego zdania —
        // inaczej niż w `SekcjaWaskiegoGardla`, gdzie nazwa jest wpleciona.
        const opisyDeficytow = deficits.map(([id]) => opiszSegment(id));
        for (const opis of opisyDeficytow) {
          const doLogu = opisNieznanegoSegmentuDoLogu(opis);
          if (doLogu) console.warn(doLogu);
        }
        setSummary({
          state: 'ready',
          headline,
          desc,
          deficitLabels: opisyDeficytow.map((o) => (o.znany ? o.etykieta : o.komunikat)),
        });
      }
    }

    // ─── Liczby przy wejściach ────────────────────────────────────
    // Te same dwie miary co przy linku „Wszystkie rekomendacje" na ekranie
    // Dziś. Nie mylić z badge'em na pasku zakładek: ten SKASOWANO
    // 08.08.2026 i nie wraca (decyzja B7).
    // WIEDZA B4 08.08.2026 — dług N3: liczby przychodzą z `count`, nie z
    // policzonych w appce wierszy. Błąd zapytania daje 0, czyli podpis spada na
    // wariant opisowy — nigdy na zmyśloną liczbę.
    //
    // ⚠️ PLAN-D-C3 15.08.2026 — ZOSTAJE, ALE PRZESTAJE BYĆ CICHE. Oba `? 0`
    // zlewają „nie policzyłem" z „nie ma nic nowego": podpis spada wtedy na
    // wariant opisowy („Wszystko, co system Ci dotąd powiedział") i gaśnie
    // kropka przy wierszu. Żadne z tych dwóch nie jest ZDANIEM o zawodniku,
    // więc trzy pustki nie mają czego zamienić — ale cichy zerowy licznik jest
    // dokładnie tym, przez co defekt potrafi żyć tygodniami.
    if (unreadRes.error) console.warn(opisBleduOdczytuDoLogu('ja.load → decision_recommendations (nieprzeczytane)', unreadRes.error));
    if (actionableRes.error) console.warn(opisBleduOdczytuDoLogu('ja.load → decision_recommendations (do sprawdzenia)', actionableRes.error));
    setUnreadRecs(unreadRes.error ? 0 : (unreadRes.count ?? 0));
    setOpenActionableRecs(actionableRes.error ? 0 : (actionableRes.count ?? 0));

    // ─── Licznik biblioteki (ZMIANA OBRAZU B5 08.08.2026) ─────────
    setLibraryCount(unlockedMaterials({ goalSegmentIds, deficitSegmentIds }).length);

    // ─── Cztery stany odczytu zadań (PLAN-D-C2 14.08.2026) ────────
    setOdczytZadanStan(odczytZadan({ data: zadaniaRes.data, error: zadaniaRes.error }));
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

  // ⭐ PLAN-D-C3 15.08.2026 — DWA PODPISY Z JEDNEGO ODCZYTU, JEDNA FUNKCJA
  // DECYZYJNA. Oba brzmienia („Wskaż wąskie gardło…", „Otwiera je Cel albo
  // diagnoza") idą CO DO ZNAKU — ten pas ich nie przepisuje (zakaz 4).
  // Zmienia się wyłącznie to, że po nieudanym odczycie `goals` zawodnik czyta
  // „Nie udało się sprawdzić." zamiast zdania o sobie.
  const pustkaDiagnozy = rozpoznajPustke({
    maWpisy: false,
    planLekcjiZnany: null,
    moznaZapisywac: null,
    odczytUdanySie: summary.state === 'blad_odczytu' ? false : null,
    daSieOdswiezyc: true,
  });
  const pustkaCelow = rozpoznajPustke({
    maWpisy: activeGoals > 0,
    planLekcjiZnany: null,
    moznaZapisywac: null,
    odczytUdanySie: odczytCelowUdanySie,
    daSieOdswiezyc: true,
    // PLAN-D-A 08.2026 — `goals` to WĄSKIE GARDŁO. Słowo „cel" jest od teraz
    // zarezerwowane dla kierunku na lata (`player_profiles.goal_direction`).
    tekstBrakuDanych: 'Wskaż wąskie gardło — to ono napędza resztę appki',
  });
  const pustkaBiblioteki = rozpoznajPustke({
    maWpisy: libraryCount > 0,
    planLekcjiZnany: null,
    moznaZapisywac: null,
    // ⚠️ TEN SAM odczyt `goals` karmi licznik biblioteki (razem z diagnozą),
    // więc jego padnięcie znaczy tu dokładnie to samo.
    odczytUdanySie: odczytCelowUdanySie,
    daSieOdswiezyc: true,
    tekstBrakuDanych: libraryEntryHint(0),
  });

  // Wiersz menu ma JEDNĄ linię podpisu, więc zdanie i wyjście łączymy w nią.
  const podpisPustki = (p: ReturnType<typeof rozpoznajPustke>) =>
    (p && !p.krokWTekscie ? `${p.tekst} ${p.cta}` : (p ? p.tekst : ''));

  const goalsHint = pustkaCelow
    ? podpisPustki(pustkaCelow)
    : `${activeGoals} ${activeGoals === 1 ? 'aktywne wąskie gardło' : 'aktywne wąskie gardła'} · historia i planowanie pracy`;

  // PLAN-D-E 08.2026 — jeden wygląd wiersza, dwa sposoby otwarcia. Bez tego
  // wejście do Mapy wyglądałoby inaczej niż pozostałe i czytałoby się jak
  // element obcy, a nie jak druga oś tego samego produktu.
  const renderRowRaw = (key: string, label: string, hint: string, onPress: () => void, dot = false) => (
    <TouchableOpacity key={key} style={styles.row} onPress={onPress}>
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

  const renderRow = (route: MenuRoute, label: string, hint: string, dot = false) =>
    renderRowRaw(route, label, hint, () => router.push(route), dot);

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
          {/* W1: krecha 12° — ten sam motyw co hero Celu na Dziś */}
          <View style={styles.heroStripe} />
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

          {/* ⭐ PLAN-D-C3 15.08.2026 — PIĄTY STAN KARTY. Ten sam układ i te same
              style co pozostałe cztery (zakaz 5): zmienia się wyłącznie to, że
              „nie mam Twojej diagnozy" i „nie udało mi się jej sprawdzić"
              przestały być jednym zdaniem. */}
          {summary.state === 'blad_odczytu' && pustkaDiagnozy && (
            <>
              <Text style={styles.heroTitle}>{pustkaDiagnozy.tekst}</Text>
              <Text style={styles.heroBody}>{pustkaDiagnozy.cta}</Text>
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

          {/* PIERWSZE URUCHOMIENIE 10.08.2026 (zatwierdzone przez Kubę) —
              karta mówiła „Nie masz jeszcze diagnozy", a przycisk pod nią
              proponował obejrzenie profilu, którego nie ma. Przy braku
              diagnozy jedyną sensowną akcją jest jej zrobienie.
              Stan `unreadable` ZOSTAJE przy „Zobacz cały profil" świadomie:
              tam diagnoza istnieje, tylko nie ma szczegółowych wyników —
              jest więc co otworzyć. */}
          <Text style={styles.heroLink}>
            {summary.state === 'none' ? 'Zrób diagnozę →' : 'Zobacz cały profil →'}
          </Text>
        </TouchableOpacity>

        {/* ── TWÓJ ROZWÓJ ──────────────────────────────────────────── */}
        <View style={{ marginTop: 28 }}>
          <Text style={styles.sectionLabel}>Twój rozwój</Text>
          {/* PIERWSZE URUCHOMIENIE 10.08.2026 — jako jedyny wiersz w tej sekcji
              miał opis na sztywno. `goalsHint`, `recsHint` i `libraryEntryHint()`
              od dawna dostosowują się do pustego stanu; ten obiecywał WYNIK
              komuś, kto diagnozy nigdy nie wypełnił. Brzmienie zatwierdzone
              przez Kubę. */}
          {renderRow('/diagnoza', 'Wynik diagnozy',
            summary.state === 'none'
              ? 'Jeszcze nie wypełniona — od niej zaczyna się reszta'
              : '13 obszarów, wąskie gardła i ich przyczyny')}
          {/* PLAN-D-E 08.2026 — DRUGA OŚ. Stoi zaraz pod diagnozą, bo to jest
              ta sama para pytań: diagnoza mówi, CO POTRAFISZ, Mapa mówi,
              CO ROBISZ. Jedenaście z siedemnastu czynników, które w badaniach
              podłużnych przewidują dojście do zawodowstwa, to decyzje — i do
              11.08.2026 żaden z nich nie miał w produkcie ani jednego miejsca.
              Podpis jest STAŁY: Mapa działa też w koncie ograniczonym, więc
              nie ma tu liczby, która mogłaby skłamać przy braku dostępu. */}
          {renderRowRaw('moja-droga', MAPA_ENTRY_LABEL, MAPA_ENTRY_HINT_DOSTEPNA, () => setDrogaOtwarta(true))}
          {/* ⚠️ PLAN-D-P 08.2026 (13.08.2026) — TU STAŁA KALIBRACJA I JEJ NIE MA.
              Sekcja schodzi z SZEŚCIU wierszy do pięciu. Powód nie jest
              porządkowy: Kalibracja była przyrządem, który kazał zawodnikowi
              odrobić protokół pomiaru i samemu odczytać z tabeli, co znaczy
              jego wynik — a produkt ma MÓWIĆ, nie dawać do przeczytania
              (claude/DECYZJA_KALIBRACJA_USUNIETA_13_08_2026.md).
              Wniosek „przecenia się" ma wyciągać system z danych
              długoterminowych i cicho zmieniać to, co podpowiada. */}
          {renderRow('/centrum-decyzji', 'Wszystkie rekomendacje', recsHint, unreadRecs > 0)}
          {renderRow('/cele', 'Cele', goalsHint)}
          {/* ⭐ PLAN-D-C2 08.2026 — WT-19. Stoi POD „Celami" i NAD biblioteką:
              lista jest rzeczą do zrobienia, a biblioteka treścią do czytania
              (o kolejności biblioteki mówi komentarz niżej, z rundy B5).
              ⚠️ Podpis pochodzi z CZTERECH STANÓW odczytu — dopóki nie
              czytaliśmy, jest pusty, a nie zmyślony. */}
          {renderRowRaw('moje-zadania', WEJSCIE_LISTA_LABEL,
            odczytZadanStan === null ? '' : zdanieOdczytu(odczytZadanStan),
            () => setZadaniaOtwarte(true))}
          {/* ZMIANA OBRAZU B5 08.08.2026 — wejście do biblioteki. Stoi jako
              ostatnie w „Twoim rozwoju": to jest treść do czytania, a nie
              rzecz, po którą zawodnik wchodzi tu codziennie. */}
          {renderRow('/biblioteka', LIBRARY_SECTION_LABEL,
            pustkaBiblioteki ? podpisPustki(pustkaBiblioteki) : libraryEntryHint(libraryCount))}
        </View>

        {/* ── USTAWIENIA ───────────────────────────────────────────── */}
        <View style={{ marginTop: 28 }}>
          <Text style={styles.sectionLabel}>Ustawienia</Text>
          {renderRow('/profil', 'Profil', 'Dane, pozycja, wzrost, sprzęt, tryb kontuzji, e-mail rodzica')}
        </View>

        {/* ── POMOC ────────────────────────────────────────────────
            PLAN-D-E 12.08.2026, po obejrzeniu na telefonie. Pigułka zeszła
            wizualnie do tła, więc punkt pomocy dostaje DRUGIE, NAZWANE wejście —
            w miejscu, w którym zawodnik szuka rzeczy o sobie i o koncie.
            Otwiera TEN SAM modal co pigułka, nie drugi egzemplarz. */}
        {/* ── TWOJA SYTUACJA ───────────────────────────────────────
            PLAN-D-H 08.2026 — ŚCIEŻKA WYJŚCIA. Osobna sekcja, nie „Ustawienia":
            to nie jest ustawienie aplikacji, tylko zdanie o tym, co się stało
            zawodnikowi. Stoi nisko i bez wyróżnienia świadomie — ma być
            do znalezienia wtedy, gdy jest potrzebna, a nie podsuwana.
            ⚠️ Ten wiersz NICZEGO NIE WŁĄCZA. Otwiera ekran, który najpierw
            mówi, co dokładnie się zmieni, i dopiero potem pyta. */}
        <View style={{ marginTop: 28 }}>
          <Text style={styles.sectionLabel}>Twoja sytuacja</Text>
          {renderRowRaw('sciezka-wyjscia', WYJSCIE_WEJSCIE_LABEL, WYJSCIE_WEJSCIE_PODPIS,
            () => setWyjscieOtwarte(true))}
        </View>

        <View style={{ marginTop: 28 }}>
          <Text style={styles.sectionLabel}>Pomoc</Text>
          {renderRowRaw('punkt-pomocy', POMOC_PRZYCISK, POMOC_WIERSZ_PODPIS, otworzPunktPomocy)}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Wyloguj się</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* PLAN-D-E 08.2026 — Mapa poza ScrollView, bo to modal, nie treść.
          Punkt pomocy montuje `app/_layout.tsx`, patrz nagłówek pliku. */}
      <MojaDroga
        visible={drogaOtwarta}
        onClose={() => setDrogaOtwarta(false)}
        userId={currentUser?.id ?? null}
      />
      {/* PLAN-D-H 08.2026 — poza ScrollView, bo to modal, nie treść. */}
      <SciezkaWyjscia
        visible={wyjscieOtwarte}
        onClose={() => setWyjscieOtwarte(false)}
        userId={currentUser?.id ?? null}
      />
      {/* PLAN-D-C2 08.2026 — lista zadań. Poza ScrollView, bo to modal,
          nie treść. ⚠️ Po zamknięciu odświeżamy podpis wejścia: zawodnik mógł
          w środku coś odhaczyć i wiersz nie ma prawa pokazywać starego stanu. */}
      <ListaZadan
        visible={zadaniaOtwarte}
        onClose={() => { setZadaniaOtwarte(false); load(); }}
        userId={currentUser?.id ?? null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 32, marginBottom: spacing.lg, color: colors.textPrimary },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 10 }, // W1: ink3
  // Hero — ten sam język wizualny co hero Celu na ekranie Dziś (lewa krecha
  // w kolorze marki), żeby zawodnik rozpoznał „to jest o mnie" bez czytania.
  // W1: prosta krecha borderLeft → krecha ŚCIĘTA 12° (koncepcja, komponent 1);
  // absolutna, wysokość hero bez zmian. paddingLeft 24 robi miejsce na krechę.
  hero: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: 20, paddingLeft: 24, paddingRight: 20,
  },
  heroStripe: { ...skew.stripe, height: 52, top: 18, backgroundColor: colors.brand },
  heroEyebrow: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 8 }, // W1: ink3
  heroTitle: { ...typography.display, fontSize: 24, color: colors.textPrimary, marginBottom: 8 },
  // WIZUAL-1 sekcja 8, decyzja Kuby 08.08.2026 — nazwy wąskich gardeł zeszły
  // z koloru marki na ink. Powód jest wprost zasadą nadrzędną z lib/theme.ts:
  // marka oznacza DZIAŁANIE i TOŻSAMOŚĆ, nigdy ocenę danych. A to są dane
  // o zawodniku, w dodatku o jego słabych stronach — czerwień na trzech
  // nazwach czytała się jak alarm („system mówi, że jesteś w tym słaby”),
  // zamiast jak mapa, od czego zacząć. Hierarchię niesie tu rozmiar i grubość.
  heroSegments: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary, marginBottom: 8 },
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
