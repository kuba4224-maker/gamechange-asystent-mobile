// Ekran MECZ — PRZEPROJEKTOWANY (29.07.2026), wg
// TRYB_MECZU_PRZEPROJEKTOWANIE_DECYZJE.md +
// MECZ_PRZEPROJEKTOWANIE_PROCEDURA_WDROZENIA.md (Project Knowledge).
// Poprzedni stan (1:1 z panel-mecz w asystent_app.html) opisany w starym
// docs/KONTRAKT_MECZ.md — ZASTĄPIONY tą wersją. Kontrakt zostanie
// przepisany od zera po Kroku 5 (test na urządzeniu), zgodnie z Krokiem 6
// procedury.
//
// Kolejność pól w formularzu (Krok 4 procedury, nie przypadkowa):
// 1. Pola już istniejące (rodzaj gry, wynik, rola, minuty)
// 2. Pozycja dziś (jeśli inna niż zwykle)
// 3. Stan regeneracji przed meczem
// 4. Warunki meczu
// 5. RPE, samoocena gry, stan mentalny
// 6. Sekcja bólu (reuse 1:1 z Dziennika)
// 7. 2-3 pytania segmentowe (z kaskady) + pogłębienia
// 8. Wolna notatka
import { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import ScalePicker from '../../components/ScalePicker';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';
// JEDNA DROGA B2 08.08.2026 — jedno źródło nazw segmentów i lokalizacji bólu.
import { SEGMENT_LABELS, BODY_LOCATIONS, NON_LATERAL_LOCATIONS } from '../../lib/labels';
import { MATCH_QUESTION_BANK } from '../../lib/matchQuestionBank';
import { selectSegmentForMatch, resolveWordingKey, SegmentSelection, RecoveryState } from '../../lib/matchCascade';
import { fetchPlayerMatchSelectionContext } from '../../lib/matchSegmentSelection';
// PLAN-D-T 08.2026 (14.08.2026), zadanie T6 — komunikat o braku dostępu
// zamiast surowego błędu RLS. Ten sam, którym pas K zastąpił błąd
// w Dzienniku (`lib/dostepKonta.ts`). Zero nowej treści.
import { toJestBrakDostepu, ZAPIS_ODRZUCONY_BRAK_DOSTEPU } from '../../lib/dostepKonta';
// ⭐ PLAN-D-C3 15.08.2026 — cztery pustki na ścieżkach odczytu tego ekranu.
import { rozpoznajPustke, opisBleduOdczytuDoLogu } from '../../lib/trzyPustki';
// ═══════════════════════════════════════════════════════════════════
// PLAN-D-A7 08.2026 (14.08.2026) — MECZ WCHODZI DO KALENDARZA, JEDNYM TOREM.
//
// CO BYŁO ZŁE. Ten ekran zapisywał WYŁĄCZNIE `match_contexts`. Zmierzone
// 14.08.2026 na żywej bazie:
//
//   select count(*) as meczow, count(*) filter (where exists (select 1
//     from public.calendar_events c where c.user_id=m.user_id
//      and c.event_type='match')) as z_odpowiednikiem
//     from public.match_contexts m;   →   meczow = 2,  z_odpowiednikiem = 0
//
// Czyli: zawodnicy opisali dwa mecze i ANI JEDEN nie istnieje w kalendarzu.
// Makieta widoku tygodnia stawia mecz w sobotę jako kafel z kropką `d-mecz`
// i tagiem godziny — nie ma go z czego narysować. Rytm push `pre_match`
// (`api/cron-send-notifications.js`) czeka na wiersze `event_type='match'`,
// których nikt nigdy nie założył.
//
// ⛔ DLACZEGO NIE DRUGI FORMULARZ. Kalendarz UMIE zaplanować mecz na
// przyszłość (`event_type='match'` jest w jego Pickerze od 28.07.2026). Gdyby
// ten ekran po prostu wstawiał nowy wiersz, zawodnik, który zaplanował sobotni
// mecz, a potem go opisał, miałby ten mecz w kalendarzu DWA RAZY — a oba
// zapisy byłyby z osobna poprawne, więc nic by tego nie zgłosiło. Dlatego
// decyzję „nowy wiersz czy domknięcie istniejącego" podejmuje CZYSTA FUNKCJA
// `zdecydujOWierszuMeczu` z `lib/meczWKalendarzu.ts`, która ma selftest
// i mutacje. Ten ekran ją WYKONUJE, nie podejmuje.
//
// ⚠️ ZAPIS MECZU NIE ZALEŻY OD ZAPISU DO KALENDARZA (warunek 3 polecenia).
// Ale porażka nie jest cicha: zawodnik czyta zdanie po polsku, a konsola
// dostaje powód, po którym da się to zdiagnozować (reguła R5).
// ═══════════════════════════════════════════════════════════════════
import { toLocalDateStr } from '../../lib/date-utils';
import {
  przygotujGodzineDoZapisu,
  zdecydujOWierszuMeczu,
  MECZ_ZAPISANY_BEZ_KALENDARZA,
  opisNieudanegoZapisuMeczuDoLogu,
  RODZAJ_MECZ,
  type WierszKalendarzaDoDecyzji,
} from '../../lib/meczWKalendarzu';

const GAME_TYPE_LABELS: Record<string, string> = {
  official_match: 'Mecz oficjalny', friendly: 'Sparing',
  training_game: 'Gierka treningowa', tournament: 'Turniej',
};
const SEGMENT_AVAILABILITY_LABELS: Record<string, string> = {
  available: 'dostępne', partial: 'częściowo dostępne', unavailable: 'niedostępne',
};
// JEDNA DROGA B2 08.08.2026 — lokalna kopia 13 nazw segmentów usunięta,
// nazwy pochodzą teraz z lib/labels.ts (jedno źródło dla całej appki).
// Treść niezmieniona co do znaku — `SEG_LABELS` to alias na tę samą mapę,
// żeby nie ruszać ani jednego miejsca użycia w tym pliku.
const SEG_LABELS = SEGMENT_LABELS;

// Treść potwierdzona przez Kubę wcześniej w projekcie (architektura_
// techniczna.md, Domena 04) — przeniesiona 1:1 z asystent_app.html.
const INJURY_MODE_ROUTING: Record<string, { label: string; segments: Record<string, string> }> = {
  lower_body: {
    label: 'Dół ciała (noga, kolano, kostka)',
    segments: {
      moc: 'unavailable', wytrzymalosc: 'unavailable', fizycznosc: 'unavailable',
      techFund: 'partial', techSpec: 'partial',
      regeneracja: 'available', odpornosc: 'available', odzywianie: 'available', tolerancja: 'available',
      koncentracja: 'available', mental: 'available',
      percepcja: 'available', decyzja: 'available',
    },
  },
  upper_body: {
    label: 'Góra ciała (ręka, bark)',
    segments: {
      moc: 'available', wytrzymalosc: 'available', fizycznosc: 'available',
      techFund: 'available', techSpec: 'available',
      regeneracja: 'available', odpornosc: 'available', odzywianie: 'available', tolerancja: 'available',
      koncentracja: 'available', mental: 'available',
      percepcja: 'available', decyzja: 'available',
    },
  },
  general: {
    label: 'Ogólne (przeciążenie, choroba)',
    segments: {
      moc: 'unavailable', wytrzymalosc: 'unavailable', fizycznosc: 'unavailable',
      techFund: 'unavailable', techSpec: 'unavailable',
      regeneracja: 'available', odpornosc: 'available', odzywianie: 'available', tolerancja: 'partial',
      koncentracja: 'available', mental: 'available',
      percepcja: 'available', decyzja: 'available',
    },
  },
};

// Krok 4: te same 8 etykiet co w Profilu, BEZ "Nie dotyczy" — pole
// odpowiada na "jaką pozycję dziś grałeś", nie ma sensu jako "nie dotyczy".
const POSITIONS_TODAY = [
  'Bramkarz', 'Środkowy obrońca', 'Boczny obrońca', 'Defensywny pomocnik',
  'Środkowy pomocnik', 'Ofensywny pomocnik', 'Skrzydłowy', 'Napastnik',
];

const RECOVERY_STATE_OPTIONS: { value: RecoveryState; label: string }[] = [
  { value: 'entered_fatigued', label: 'Ciało wciąż czuło zmęczenie z ostatnich dni' },
  { value: 'entered_fresh', label: 'Wchodziłem w pełni zregenerowany' },
  { value: 'uncertain', label: 'Nie jestem pewien' },
];

// JEDNA DROGA B2 08.08.2026 — lokalne kopie 17 lokalizacji bólu i listy
// lokalizacji bez strony ciała usunięte; obie pochodzą teraz z lib/labels.ts
// (były w trzech identycznych kopiach: dziennik.tsx, mecz.tsx, profil.tsx).

type MatchRow = {
  id: number; created_at: string; game_type: string;
  own_score: number | null; opponent_score: number | null;
  role: string | null; minutes_played: number | null; match_rpe: number | null;
  self_rating: number | null;
};

// Jeden "slot" pytania segmentowego wyświetlanego na ekranie.
type SegmentSlot = SegmentSelection & {
  wordingKey: string | null;
  baseAnswerCode: string | null;
  followupAnswerCode: string | null;
};

export default function MeczScreen() {
  const { currentUser } = useAuth();

  // Pola już istniejące
  const [gameType, setGameType] = useState('official_match');
  const [ownScore, setOwnScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [role, setRole] = useState('');
  const [minutes, setMinutes] = useState('');
  const [matchRpe, setMatchRpe] = useState<number>();
  // PLAN-D-A7 — godzina rozpoczęcia meczu, WYŁĄCZNIE do kafla w kalendarzu.
  // ⚠️ `match_contexts` NIE MA kolumny na czas ani na datę meczu (zmierzone
  // 14.08.2026, `information_schema.columns`: 15 kolumn, jedyny czas to
  // `created_at`, czyli moment ZAPISU). Ta godzina nie idzie więc do
  // `match_contexts` — nie ma dokąd — tylko do `calendar_events.scheduled_time`.
  // Tekst, nie `DateTimePicker`: pole zegarkowe zawsze pokazuje jakąś godzinę
  // i nie umie wyrazić „nie podałem", a to jest stan poprawny.
  const [godzinaMeczu, setGodzinaMeczu] = useState('');

  // Pozycja dziś
  const [playedDifferentPosition, setPlayedDifferentPosition] = useState(false);
  const [positionPlayedToday, setPositionPlayedToday] = useState('');
  const [profilePosition, setProfilePosition] = useState<string | null>(null);

  // Regeneracja / warunki
  const [enteredRecoveryState, setEnteredRecoveryState] = useState<RecoveryState>(null);
  const [demandingConditions, setDemandingConditions] = useState(false);

  // Rdzeń
  const [selfRating, setSelfRating] = useState<number>();
  const [mentalState, setMentalState] = useState<number>();

  // Ból — reuse 1:1 wzorca z Dziennika
  const [hasPain, setHasPain] = useState(false);
  const [painLocation, setPainLocation] = useState<string>(BODY_LOCATIONS[0][0]);
  const [painSide, setPainSide] = useState('');
  const [painIntensity, setPainIntensity] = useState<number>();
  const [painExcludes, setPainExcludes] = useState(false);

  // Pytania segmentowe
  const [segmentSlots, setSegmentSlots] = useState<SegmentSlot[]>([]);
  const [thirdQuestionOffered, setThirdQuestionOffered] = useState(false);
  const slotsComputedRef = useRef(false);

  // Notatka
  const [freeNote, setFreeNote] = useState('');

  const [routing, setRouting] = useState<{ label: string; segments: Record<string, string> } | null>(null);
  const [history, setHistory] = useState<MatchRow[]>([]);
  // ⭐ PLAN-D-C3 15.08.2026 — trzy wartości, nie dwie. `null` = jeszcze nie czytałem.
  const [odczytHistoriiUdanySie, setOdczytHistoriiUdanySie] = useState<boolean | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadMecz = useCallback(async () => {
    if (!currentUser) return;

    try {
      const { data, error: err } = await supabase
        .from('player_profiles')
        .select('injury_mode_active,injury_mode_category,position_primary')
        .eq('user_id', currentUser.id)
        .limit(1);
      if (err) throw err;
      const profile = data?.[0];
      setProfilePosition(profile?.position_primary ?? null);
      if (profile?.injury_mode_active && INJURY_MODE_ROUTING[profile.injury_mode_category]) {
        setRouting(INJURY_MODE_ROUTING[profile.injury_mode_category]);
      } else {
        setRouting(null);
      }
    } catch (e) {
      // Status trybu kontuzji to dodatkowa informacja — jego brak nie
      // powinien blokować reszty ekranu.
      //
      // ⚠️ PLAN-D-C3 15.08.2026 — ZOSTAJE, ALE PRZESTAJE BYĆ CICHE. Ten `catch`
      // zlewa „nie udało się odczytać profilu" z „zawodnik nie jest w trybie
      // kontuzji": w obu przypadkach `routing` jest `null` i zawodnik dostaje
      // ZWYKŁY formularz meczowy. Dla kogoś w trybie kontuzji to jest inny
      // zestaw pytań — czyli decyzja o nim podjęta bez danych o nim.
      // ⛔ Tu NIE MA listy ani zdania o pustce, więc trzy pustki nie mają czego
      // zamienić; jedyne, co ten pas może zrobić, to nie pozwolić temu zniknąć.
      console.warn(opisBleduOdczytuDoLogu('mecz.loadMecz → player_profiles (tryb kontuzji)', e));
      setRouting(null);
    }

    const { data: rows, error: histErr } = await supabase
      .from('match_contexts')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (histErr) {
      // ⭐ PLAN-D-C3 15.08.2026 — było: `if (histErr) return;` z komentarzem
      // „load* nie pokazuje banera błędu — konwencja z web". Konwencja zostaje
      // (nie ma tu banera), ale jej SKUTEK już nie: `history` zostawało puste
      // i ekran pisał „Brak zapisanych meczów — dodaj pierwszy powyżej."
      // zawodnikowi, który ma ich dwadzieścia. Wiersze sprzed nieudanego
      // odświeżenia zostają nietknięte.
      console.warn(opisBleduOdczytuDoLogu('mecz.loadMecz → match_contexts (historia)', histErr));
      setOdczytHistoriiUdanySie(false);
      return;
    }
    setOdczytHistoriiUdanySie(true);
    setHistory((rows ?? []) as MatchRow[]);
  }, [currentUser]);

  // Wybór 2 pytań segmentowych z kaskady (Krok 3) — liczone RAZ, dopiero
  // gdy zawodnik odpowiedział na pytanie rdzenia o regenerację (od tego
  // zależy dostępność segmentu 'regeneracja' w kaskadzie, patrz punkt 10
  // dokumentu decyzji). Kolejne odpowiedzi w trakcie wypełniania formularza
  // NIE przeliczają slotów ponownie — nie chcemy gubić już udzielonych
  // odpowiedzi na pytania segmentowe.
  const loadSegmentSlots = useCallback(async (recoveryState: RecoveryState) => {
    if (!currentUser) return;
    try {
      const ctx = await fetchPlayerMatchSelectionContext(currentUser.id, recoveryState);
      const first = selectSegmentForMatch(ctx);
      const exclude = first ? [first.segmentId] : [];
      const second = selectSegmentForMatch(ctx, exclude);
      const slots: SegmentSlot[] = [];
      [first, second].forEach((sel) => {
        if (!sel) return;
        slots.push({
          ...sel,
          wordingKey: resolveWordingKey(positionPlayedToday || null, ctx.profilePosition),
          baseAnswerCode: null,
          followupAnswerCode: null,
        });
      });
      setSegmentSlots(slots);
    } catch (e) {
      // Brak pytań segmentowych nie powinien blokować reszty formularza —
      // zawodnik nadal może zapisać mecz z polami rdzenia.
      //
      // ⚠️ PLAN-D-C3 15.08.2026 — ZOSTAJE, ALE PRZESTAJE BYĆ CICHE.
      // `setSegmentSlots([])` po nieudanym odczycie kontekstu wygląda dokładnie
      // tak samo jak „kaskada nie miała czego wybrać". Skutek jest podwójny:
      // formularz jest krótszy, a walidacja „minimum jeden sygnał"
      // (`hasSegmentAnswer`) liczy z pustej listy. Ekran nie stawia tu zdania
      // o zawodniku, więc trzy pustki nie mają czego zamienić — ale defekt
      // przestaje być niewidoczny.
      console.warn(opisBleduOdczytuDoLogu('mecz.loadSegmentSlots → kontekst kaskady', e));
      setSegmentSlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const loadThirdQuestion = useCallback(async () => {
    if (!currentUser) return;
    // ⭐ PLAN-D-C3 15.08.2026 — ta funkcja NIE MIAŁA `try` w ogóle. Odrzucony
    // odczyt kontekstu nie dodawał trzeciego pytania i NIE ustawiał
    // `thirdQuestionOffered`, więc zawodnik klikał w przycisk, po którym nic
    // się nie działo — i nikt (łącznie z autorem kodu) nie miał jak się
    // dowiedzieć, że coś padło. To nie jest zdanie o zawodniku, więc trzy
    // pustki nie mają czego zamienić; jest to CICHY BRAK i tyle wystarczy,
    // żeby go nazwać.
    try {
      const ctx = await fetchPlayerMatchSelectionContext(currentUser.id, enteredRecoveryState);
      const exclude = segmentSlots.map((s) => s.segmentId);
      const third = selectSegmentForMatch(ctx, exclude);
      if (third) {
        setSegmentSlots((prev) => [
          ...prev,
          { ...third, wordingKey: resolveWordingKey(positionPlayedToday || null, ctx.profilePosition), baseAnswerCode: null, followupAnswerCode: null },
        ]);
      }
    } catch (e) {
      console.warn(opisBleduOdczytuDoLogu('mecz.loadThirdQuestion → kontekst kaskady', e));
    }
    setThirdQuestionOffered(true);
  }, [currentUser, enteredRecoveryState, segmentSlots, positionPlayedToday]);

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadMecz(); }, [loadMecz]));

  // Przeliczenie slotów pytań segmentowych następuje jednorazowo, wywołane
  // bezpośrednio z handlera zmiany pola regeneracji poniżej (patrz komentarz
  // przy loadSegmentSlots) — prostsze i bardziej przewidywalne niż useEffect
  // ścigający się z RefreshControl.
  const handleRecoveryStateChange = (value: RecoveryState) => {
    setEnteredRecoveryState(value);
    if (!slotsComputedRef.current) {
      slotsComputedRef.current = true;
      loadSegmentSlots(value);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMecz();
    setRefreshing(false);
  }, [loadMecz]);

  // ⭐ PLAN-D-C3 15.08.2026 — jedna funkcja decyzyjna zamiast `history.length === 0`.
  const pustkaHistorii = rozpoznajPustke({
    maWpisy: history.length > 0,
    planLekcjiZnany: null,
    // Ten ekran ZAPISUJE, ale odmowę dostępu przy zapisie obsługuje już
    // `toJestBrakDostepu` + `ZAPIS_ODRZUCONY_BRAK_DOSTEPU` (pas K). Tutaj
    // mówimy wyłącznie o pustce HISTORII, więc gałąź uprawnień zostaje `null`
    // — dwa zdania o wygasłym dostępie na jednym ekranie to jedno za dużo.
    moznaZapisywac: null,
    odczytUdanySie: odczytHistoriiUdanySie,
    daSieOdswiezyc: true,
    tekstBrakuDanych: 'Brak zapisanych meczów — dodaj pierwszy powyżej.',
  });

  const resetForm = () => {
    setOwnScore(''); setOpponentScore(''); setRole(''); setMinutes(''); setMatchRpe(undefined);
    setGodzinaMeczu('');
    setPlayedDifferentPosition(false); setPositionPlayedToday('');
    setEnteredRecoveryState(null); setDemandingConditions(false);
    setSelfRating(undefined); setMentalState(undefined);
    setHasPain(false); setPainSide(''); setPainIntensity(undefined); setPainExcludes(false);
    setSegmentSlots([]); setThirdQuestionOffered(false); slotsComputedRef.current = false;
    setFreeNote('');
  };

  const setSlotBaseAnswer = (index: number, code: string) => {
    setSegmentSlots((prev) => prev.map((s, i) => (i === index ? { ...s, baseAnswerCode: code, followupAnswerCode: null } : s)));
  };
  const setSlotFollowupAnswer = (index: number, code: string) => {
    setSegmentSlots((prev) => prev.map((s, i) => (i === index ? { ...s, followupAnswerCode: code } : s)));
  };

  /**
   * PLAN-D-A7 — ODBICIE MECZU W KALENDARZU. Jeden tor, zero drugiego formularza.
   *
   * Zwraca `null`, gdy się udało, albo POWÓD porażki (do logu). Ta funkcja
   * ŚWIADOMIE NIE RZUCA: mecz jest już w `match_contexts` i nic, co stanie się
   * tutaj, nie ma prawa tego cofnąć ani zamienić w komunikat o awarii zapisu.
   *
   * ⚠️ `scheduled_date` to DZIŚ, i to jest granica, którą trzeba znać.
   * `match_contexts` nie ma pola „kiedy był mecz" — ma `created_at`, czyli
   * kiedy zawodnik go zapisał, i to tę datę ekran pokazuje w historii meczów
   * (`renderMatchCard` niżej). Kafel w kalendarzu stoi więc dokładnie tam,
   * gdzie produkt i tak już ten mecz umieszcza. Zawodnik, który opisuje mecz
   * trzy dni po fakcie, dostanie kafel w złym dniu — to jest znalezisko tej
   * rundy, opisane w nocie przekazania, a NIE rzecz, którą wolno tu zgadywać.
   */
  async function dopiszMeczDoKalendarza(godzina: string | null): Promise<string | null> {
    if (!currentUser) return 'brak zalogowanego zawodnika';
    const data = toLocalDateStr(new Date());
    const tytul = GAME_TYPE_LABELS[gameType] || 'Mecz';

    // Krok 1 — CZY TEN MECZ JUŻ JEST W KALENDARZU. Bez tego odczytu nie da się
    // odróżnić „zaplanowałem i opisuję" od „opisuję bez planu", a to jest cała
    // różnica między jednym torem a dwoma.
    const { data: istniejaceSurowe, error: odczytErr } = await supabase
      .from('calendar_events')
      .select('id,event_type,status,scheduled_date,scheduled_time')
      .eq('user_id', currentUser.id)
      .eq('event_type', RODZAJ_MECZ)
      .eq('scheduled_date', data);
    if (odczytErr) {
      // ⛔ NIE wstawiamy „w ciemno" po nieudanym odczycie. Wstawienie bez
      // wiedzy o tym, co już jest, jest dokładnie tym drugim torem, którego
      // ta runda zakazuje — a duplikat w kalendarzu jest gorszy niż jego brak,
      // bo wygląda na prawdziwy.
      return `odczyt istniejących wierszy: ${odczytErr.message}`;
    }

    const decyzja = zdecydujOWierszuMeczu({
      userId: currentUser.id,
      data,
      godzina,
      tytul,
      istniejace: (istniejaceSurowe ?? []) as WierszKalendarzaDoDecyzji[],
    });
    console.log(`[PLAN-D-A7] mecz → kalendarz: ${decyzja.powod}`);

    if (decyzja.rodzaj === 'aktualizuj') {
      const { data: zmienione, error: updErr } = await supabase
        .from('calendar_events')
        .update(decyzja.zmiany)
        .eq('id', decyzja.id)
        .select('id');
      if (updErr) return `aktualizacja id=${decyzja.id}: ${updErr.message}`;
      // ⚠️ PostgREST przy odmowie RLS na UPDATE nie zwraca błędu — zwraca ZERO
      // zmienionych wierszy. Bez tego sprawdzenia „nie mam uprawnień" byłoby
      // nieodróżnialne od „zapisano" (ten sam wzorzec, który pas A1 opisał
      // w `lib/focusBlockJournalLink.ts`).
      if (!zmienione || zmienione.length === 0) {
        return `aktualizacja id=${decyzja.id} nie zmieniła ANI JEDNEGO wiersza (najczęściej RLS: calendar_events_update_own)`;
      }
      return null;
    }

    const { error: insErr } = await supabase.from('calendar_events').insert(decyzja.wiersz);
    if (insErr) return `zapis nowego wiersza: ${insErr.message}`;
    return null;
  }

  async function submitMatchContext() {
    if (!currentUser) return;
    setError(null); setOk(null);

    // Walidacja (punkt 3 dokumentu decyzji): minimum JEDEN sensowny sygnał.
    const hasSegmentAnswer = segmentSlots.some((s) => s.baseAnswerCode !== null || s.segmentId === 'regeneracja');
    const hasSignal = matchRpe !== undefined || selfRating !== undefined || hasSegmentAnswer;
    if (!hasSignal) {
      setError('Zaznacz przynajmniej jeden sygnał: RPE, samoocenę gry, albo odpowiedz na któreś pytanie poniżej.');
      return;
    }
    if (hasPain && painIntensity === undefined) {
      setError('Zaznacz intensywność bólu.');
      return;
    }
    if (playedDifferentPosition && !positionPlayedToday) {
      setError('Wybierz pozycję, na której dziś grałeś (albo odznacz pole wyżej).');
      return;
    }
    // PLAN-D-A7 — godzina rozstrzyga się PRZED jakimkolwiek zapisem. Gdyby ta
    // bramka stała niżej, mecz byłby już w bazie, a zawodnik dostałby błąd
    // o godzinie — czyli komunikat porażki po udanym zapisie.
    const wynikGodziny = przygotujGodzineDoZapisu(godzinaMeczu);
    if (!wynikGodziny.zapisz) { setError(wynikGodziny.powod); return; }

    setSaving(true);
    try {
      const body = {
        user_id: currentUser.id,
        game_type: gameType,
        own_score: ownScore !== '' ? Number(ownScore) : null,
        opponent_score: opponentScore !== '' ? Number(opponentScore) : null,
        role: role.trim() || null,
        minutes_played: minutes !== '' ? Number(minutes) : null,
        match_rpe: matchRpe !== undefined ? matchRpe : null,
        self_rating: selfRating !== undefined ? selfRating : null,
        mental_state: mentalState !== undefined ? mentalState : null,
        free_note: freeNote.trim() || null,
        position_played_today: playedDifferentPosition ? positionPlayedToday : null,
        entered_recovery_state: enteredRecoveryState,
        demanding_conditions: demandingConditions,
      };
      const { data: inserted, error: insErr } = await supabase.from('match_contexts').insert(body).select();
      if (insErr) throw insErr;
      const matchContextId = inserted?.[0]?.id;

      // ⭐ PLAN-D-A7 — ODBICIE W KALENDARZU. Stoi TU, zaraz po udanym zapisie
      // meczu, a przed bólem i pytaniami segmentowymi, świadomie: tamte kroki
      // rzucają wyjątkiem przy własnej porażce, więc gdyby kalendarz był pod
      // nimi, jeden nieudany wpis bólowy zjadałby także kafel meczu.
      // Wynik NIE jest rzucany — zbieramy go i zamieniamy na zdanie niżej.
      let bladKalendarza: string | null = null;
      if (matchContextId) {
        bladKalendarza = await dopiszMeczDoKalendarza(wynikGodziny.wartosc);
        if (bladKalendarza) {
          console.error(opisNieudanegoZapisuMeczuDoLogu(
            bladKalendarza.startsWith('odczyt') ? 'odczyt'
              : bladKalendarza.startsWith('aktualizacja') ? 'aktualizuj' : 'utworz',
            bladKalendarza,
          ));
        }
      }

      if (hasPain && matchContextId) {
        const side = NON_LATERAL_LOCATIONS.has(painLocation) ? null : (painSide || null);
        const { error: painErr } = await supabase.from('pain_entries').insert({
          match_context_id: matchContextId,
          user_id: currentUser.id,
          body_location: painLocation,
          side,
          intensity: painIntensity,
          excludes_from_training: painExcludes,
        });
        if (painErr) throw new Error('Mecz zapisany, ale wpis bólowy się nie udał: ' + painErr.message);
      }

      if (matchContextId) {
        for (const slot of segmentSlots) {
          // Segment bez żadnej odpowiedzi (użytkownik pominął pytanie) —
          // nie zapisujemy pustego wiersza, poza regeneracją (patrz niżej).
          if (slot.segmentId !== 'regeneracja' && slot.baseAnswerCode === null) continue;

          const responseValue = slot.segmentId === 'regeneracja' ? enteredRecoveryState : slot.baseAnswerCode;
          const { error: ansErr } = await supabase.from('match_context_answers').insert({
            match_context_id: matchContextId,
            user_id: currentUser.id,
            segment_id: slot.segmentId,
            was_goal_segment: slot.selectionSource === 'goal',
            selection_source: slot.selectionSource,
            response_value: responseValue,
            followup_value: slot.followupAnswerCode,
          });
          if (ansErr) throw new Error('Mecz zapisany, ale nie udało się zapisać odpowiedzi segmentowej (' + slot.segmentId + '): ' + ansErr.message);
        }
      }

      // PLAN-D-A7 — porażka kalendarza NIE jest cicha i NIE jest awarią.
      // Mecz jest zapisany; zdanie mówi obie te rzeczy naraz i daje wyjście.
      setOk(bladKalendarza ? MECZ_ZAPISANY_BEZ_KALENDARZA : 'Mecz zapisany.');
      resetForm();
      await loadMecz();
    } catch (e: any) {
      // PLAN-D-T 08.2026 (14.08.2026), zadanie T6 — ODMOWA DOSTĘPU NIE JEST
      // AWARIĄ I NIE MA TAK WYGLĄDAĆ. Do tej rundy zawodnik z wygasłym
      // okresem próbnym dostawał tu surowy błąd bazy („new row violates
      // row-level security policy"), z którego nie da się wyczytać ani co się
      // stało, ani że nic nie zginęło. Ten sam komunikat, którym pas K
      // zastąpił błąd w Dzienniku — zero nowej treści.
      // ⚠️ To NIE jest ścieżka odzysku: nie ponawiamy zapisu i nie zmieniamy
      // jego treści. Zmienia się WYŁĄCZNIE zdanie, które zawodnik czyta.
      setError(toJestBrakDostepu(e) ? ZAPIS_ODRZUCONY_BRAK_DOSTEPU : 'Nie udało się zapisać meczu: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function renderRoutingBlock() {
    if (!routing) return null;
    const grouped: Record<string, string[]> = { unavailable: [], partial: [], available: [] };
    Object.entries(routing.segments).forEach(([segId, status]) => grouped[status].push(SEG_LABELS[segId] || segId));

    return (
      <View style={[styles.block, styles.injuryBlock]}>
        <Text style={styles.sectionLabel}>Tryb kontuzji — co jest teraz dostępne</Text>
        <Text style={styles.injuryCategory}>{routing.label}</Text>
        {(['unavailable', 'partial', 'available'] as const).map((status) =>
          grouped[status].length ? (
            <Text key={status} style={styles.injuryRow}>
              <Text style={styles.injuryStatusLabel}>{SEGMENT_AVAILABILITY_LABELS[status].toUpperCase()}: </Text>
              {grouped[status].join(', ')}
            </Text>
          ) : null
        )}
        <Text style={styles.injuryHint}>Zmień lub wyłącz tryb kontuzji w Profilu.</Text>
      </View>
    );
  }

  function renderMatchCard(row: MatchRow) {
    const dateLabel = new Date(row.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
    const typeLabel = GAME_TYPE_LABELS[row.game_type] || row.game_type;
    const parts: string[] = [];
    if (row.own_score !== null && row.own_score !== undefined && row.opponent_score !== null && row.opponent_score !== undefined) {
      parts.push(`wynik: ${row.own_score}:${row.opponent_score}`);
    }
    if (row.minutes_played !== null && row.minutes_played !== undefined) parts.push(`${row.minutes_played} min`);
    if (row.match_rpe !== null && row.match_rpe !== undefined) parts.push(`RPE: ${row.match_rpe}/10`);
    if (row.self_rating !== null && row.self_rating !== undefined) parts.push(`Samoocena: ${row.self_rating}/10`);
    if (row.role) parts.push(row.role);
    const detail = parts.join(' · ') || '—';

    return (
      <View key={row.id} style={styles.historyCard}>
        <View style={styles.historyTop}>
          <Text style={styles.historyType}>{typeLabel}</Text>
          <Text style={styles.historyDate}>{dateLabel}</Text>
        </View>
        <Text style={styles.historyDetail}>{detail}</Text>
      </View>
    );
  }

  function renderSegmentSlot(slot: SegmentSlot, index: number) {
    const bank = MATCH_QUESTION_BANK[slot.segmentId];
    if (!bank) return null;
    const label = SEG_LABELS[slot.segmentId] || slot.segmentId;

    // Regeneracja: pytanie bazowe już zebrane w rdzeniu — tu tylko
    // pogłębienie (zawsze dostępne, bo slot pojawia się WYŁĄCZNIE gdy
    // entered_recovery_state === 'entered_fatigued', patrz matchCascade.ts).
    if (slot.segmentId === 'regeneracja') {
      const followup = bank.followup!;
      return (
        <View key={`${slot.segmentId}-${index}`} style={styles.segmentCard}>
          <Text style={styles.segmentLabel}>{label}</Text>
          <Text style={styles.segmentQuestionText}>{followup.t}</Text>
          <View style={styles.answerList}>
            {followup.answers.map((a) => (
              <TouchableOpacity
                key={a.code}
                style={[styles.answerBtn, slot.followupAnswerCode === a.code && styles.answerBtnActive]}
                onPress={() => setSlotFollowupAnswer(index, a.code)}
              >
                <Text style={[styles.answerBtnText, slot.followupAnswerCode === a.code && styles.answerBtnTextActive]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    const wording = (bank.hasPositionVariants && slot.wordingKey && bank.positionVariants?.[slot.wordingKey])
      ? bank.positionVariants[slot.wordingKey]
      : bank.universal;

    const showFollowup = bank.followup && slot.baseAnswerCode === bank.followup.triggerCode;

    return (
      <View key={`${slot.segmentId}-${index}`} style={styles.segmentCard}>
        <Text style={styles.segmentLabel}>{label}</Text>
        <Text style={styles.segmentQuestionText}>{wording.t}</Text>
        <Text style={styles.segmentCtxText}>{wording.ctx}</Text>
        <View style={styles.answerList}>
          {bank.answers.map((a) => (
            <TouchableOpacity
              key={a.code}
              style={[styles.answerBtn, slot.baseAnswerCode === a.code && styles.answerBtnActive]}
              onPress={() => setSlotBaseAnswer(index, a.code)}
            >
              <Text style={[styles.answerBtnText, slot.baseAnswerCode === a.code && styles.answerBtnTextActive]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {showFollowup && (
          <View style={styles.followupWrap}>
            <Text style={styles.segmentQuestionText}>{bank.followup!.t}</Text>
            <View style={styles.answerList}>
              {bank.followup!.answers.map((a) => (
                <TouchableOpacity
                  key={a.code}
                  style={[styles.answerBtn, slot.followupAnswerCode === a.code && styles.answerBtnActive]}
                  onPress={() => setSlotFollowupAnswer(index, a.code)}
                >
                  <Text style={[styles.answerBtnText, slot.followupAnswerCode === a.code && styles.answerBtnTextActive]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <Text style={styles.title}>Mecz</Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {ok && <Text style={styles.ok}>{ok}</Text>}

      {renderRoutingBlock()}

      {/* AUDYT 06.08.2026 — KOLEJNOŚĆ ODWRÓCONA.
          Wcześniej "Stan przed meczem" leżał w połowie formularza, a pytania
          segmentowe DOPIERO na czwartym ekranie scrolla, pod wynikiem, golami,
          minutami i całym blokiem bólu — i pojawiały się dopiero po odpowiedzi
          o regeneracji. Tymczasem walidacja zapisu (`hasSignal`) przepuszcza mecz
          już po samym RPE, więc zawodnik, który po meczu chciał "szybko zapisać",
          nigdy tych pytań nie widział. A to jedyne dane, dla których ten ekran
          został przeprojektowany: `match_context_answers` karmi silnik rekomendacji
          i meczowy wymiar Gotowości. Teraz są pierwsze. Wynik, minuty, RPE i ból
          zostają — tylko niżej. */}
      {/* Regeneracja przed meczem */}
      <View style={styles.block}>
        <Text style={styles.sectionLabel}>Stan przed meczem</Text>
        <Text style={styles.label}>
          Czy wchodziłeś dziś w mecz w pełni zregenerowany, czy ciało wciąż czuło zmęczenie z ostatnich dni?
        </Text>
        <View style={styles.answerList}>
          {RECOVERY_STATE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.answerBtn, enteredRecoveryState === opt.value && styles.answerBtnActive]}
              onPress={() => handleRecoveryStateChange(opt.value)}
            >
              <Text style={[styles.answerBtnText, enteredRecoveryState === opt.value && styles.answerBtnTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Pytania segmentowe z kaskady */}
      {segmentSlots.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.sectionLabel}>Kilka pytań o dzisiejszy mecz</Text>
          {segmentSlots.map(renderSegmentSlot)}
          {!thirdQuestionOffered && (
            <TouchableOpacity style={styles.btnSecondary} onPress={loadThirdQuestion}>
              <Text style={styles.btnSecondaryText}>Pokaż dodatkowe pytanie (opcjonalnie)</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {segmentSlots.length === 0 && enteredRecoveryState === null && (
        <Text style={styles.hint}>Pytania o dzisiejszy mecz pojawią się po zaznaczeniu stanu regeneracji powyżej.</Text>
      )}

      <View style={styles.block}>
        <Text style={styles.sectionLabel}>Zapisz mecz</Text>

        <Text style={styles.label}>Rodzaj</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={gameType} onValueChange={setGameType}>
            {Object.entries(GAME_TYPE_LABELS).map(([id, label]) => <Picker.Item key={id} label={label} value={id} />)}
          </Picker>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Twój zespół — gole</Text>
            <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} keyboardType="number-pad" value={ownScore} onChangeText={setOwnScore} placeholder="np. 2" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Przeciwnik — gole</Text>
            <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} keyboardType="number-pad" value={opponentScore} onChangeText={setOpponentScore} placeholder="np. 1" />
          </View>
        </View>

        <Text style={styles.label}>Twoja rola (opcjonalnie)</Text>
        <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} value={role} onChangeText={setRole} placeholder="np. w podstawowym składzie" />

        <Text style={styles.label}>Minuty na boisku</Text>
        <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} keyboardType="number-pad" value={minutes} onChangeText={setMinutes} placeholder="np. 90" />

        {/* PLAN-D-A7 08.2026 — GODZINA ROZPOCZĘCIA, WYŁĄCZNIE DO KALENDARZA.
            To NIE jest kolejne pole ankiety meczowej: nie idzie do
            `match_contexts` (nie ma tam kolumny na czas) i nie karmi kaskady.
            Idzie do `calendar_events.scheduled_time`, żeby kafel meczu
            w widoku tygodnia mógł mieć tag „11:00" — dokładnie tak, jak
            pokazuje makieta. Pusto jest poprawne i najczęstsze. */}
        <Text style={styles.label}>O której zaczynał się mecz (opcjonalnie)</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textSecondary}
          keyboardType="numbers-and-punctuation"
          value={godzinaMeczu}
          onChangeText={setGodzinaMeczu}
          placeholder="np. 11:00 — trafi do Twojego kalendarza"
        />
      </View>

      {/* Pozycja dziś */}
      <View style={styles.block}>
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setPlayedDifferentPosition((v) => !v)}>
          <Checkbox value={playedDifferentPosition} onValueChange={setPlayedDifferentPosition} />
          <Text style={styles.checkboxLabel}>Dziś grałem na innej pozycji niż zwykle</Text>
        </TouchableOpacity>
        {playedDifferentPosition && (
          <>
            <Text style={styles.hint}>
              Twoja zwykła pozycja z profilu: {profilePosition || 'nie podano'}. Zaznacz, jeśli dziś zagrałeś
              gdzie indziej — np. wszedłeś z ławki na innej pozycji, albo trener ustawił Cię inaczej niż zwykle.
            </Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={positionPlayedToday} onValueChange={setPositionPlayedToday}>
                <Picker.Item label="— wybierz —" value="" />
                {POSITIONS_TODAY.map((p) => <Picker.Item key={p} label={p} value={p} />)}
              </Picker>
            </View>
          </>
        )}
      </View>

      {/* Warunki meczu */}
      <View style={styles.block}>
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setDemandingConditions((v) => !v)}>
          <Checkbox value={demandingConditions} onValueChange={setDemandingConditions} />
          <Text style={styles.checkboxLabel}>Warunki dziś były wymagające (upał, zimno, deszcz, ciężka murawa)</Text>
        </TouchableOpacity>
      </View>

      {/* RPE / samoocena / stan mentalny */}
      <View style={styles.block}>
        <Text style={styles.sectionLabel}>Jak oceniasz dzisiejszy występ</Text>
        <Text style={styles.label}>RPE meczowe (0 = brak wysiłku, 10 = maksymalny)</Text>
        <ScalePicker value={matchRpe} onChange={setMatchRpe} />
        <Text style={styles.label}>Samoocena gry (0 = bardzo słabo, 10 = doskonale)</Text>
        <ScalePicker value={selfRating} onChange={setSelfRating} />
        <Text style={styles.label}>Stan mentalny / pewność siebie (0-10)</Text>
        <ScalePicker value={mentalState} onChange={setMentalState} />
      </View>

      {/* Ból — reuse 1:1 z Dziennika */}
      <View style={styles.block}>
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setHasPain((v) => !v)}>
          <Checkbox value={hasPain} onValueChange={setHasPain} />
          <Text style={styles.checkboxLabel}>Boli Cię dziś coś?</Text>
        </TouchableOpacity>
        {hasPain && (
          <>
            <Text style={styles.label}>Lokalizacja</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={painLocation} onValueChange={setPainLocation}>
                {BODY_LOCATIONS.map(([id, label]) => <Picker.Item key={id} label={label} value={id} />)}
              </Picker>
            </View>
            {!NON_LATERAL_LOCATIONS.has(painLocation) && (
              <>
                <Text style={styles.label}>Strona</Text>
                <View style={styles.pickerWrap}>
                  <Picker selectedValue={painSide} onValueChange={setPainSide}>
                    <Picker.Item label="—" value="" />
                    <Picker.Item label="Lewa" value="left" />
                    <Picker.Item label="Prawa" value="right" />
                  </Picker>
                </View>
              </>
            )}
            <Text style={styles.label}>Intensywność (0 = ledwo wyczuwalny, 10 = nie do zniesienia)</Text>
            <ScalePicker value={painIntensity} onChange={setPainIntensity} />
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setPainExcludes((v) => !v)}>
              <Checkbox value={painExcludes} onValueChange={setPainExcludes} />
              <Text style={styles.checkboxLabel}>To wyklucza mnie z treningu</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Wolna notatka */}
      <View style={styles.block}>
        <Text style={styles.label}>Wolna notatka (opcjonalnie)</Text>
        <TextInput
          style={[styles.input, styles.textarea]} placeholderTextColor={colors.textSecondary} value={freeNote} onChangeText={setFreeNote}
          multiline placeholder="Coś jeszcze warto zapisać o dzisiejszym meczu?"
        />
      </View>

      <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} disabled={saving} onPress={submitMatchContext}>
        <Text style={styles.btnText}>{saving ? 'Zapisuję...' : 'Zapisz mecz'}</Text>
      </TouchableOpacity>

      <View style={{ marginTop: 40 }}>
        <Text style={styles.sectionLabel}>Historia meczów</Text>
        {/* ⭐ PLAN-D-C3 15.08.2026 — brzmienie „Brak zapisanych meczów — dodaj
            pierwszy powyżej." idzie CO DO ZNAKU (zakaz 4), razem z krokiem,
            który już w nim siedzi. Zmienia się wyłącznie to, KIEDY zawodnik
            je czyta: nie wtedy, gdy odczyt padł. */}
        {pustkaHistorii ? (
          <>
            <Text style={styles.empty}>{pustkaHistorii.tekst}</Text>
            {pustkaHistorii.krokWTekscie ? null : (
              <Text style={styles.empty}>{pustkaHistorii.cta}</Text>
            )}
          </>
        ) : null}
        {history.map(renderMatchCard)}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 28, marginBottom: spacing.lg, color: colors.textPrimary },
  label: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6, marginTop: 4 }, // W1: ink3
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 14 }, // W1: ink3
  hint: { ...typography.body, fontSize: 12, color: colors.textSecondary, marginBottom: 10, lineHeight: 17 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 10, fontSize: 14, marginBottom: 8, color: colors.textPrimary },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  pickerWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, marginBottom: 8 },
  block: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 16, marginBottom: 20 },
  injuryBlock: { borderLeftWidth: 3, borderLeftColor: colors.brand, marginBottom: 28 },
  injuryCategory: { fontSize: 14, color: colors.textPrimary, marginBottom: 14 },
  injuryRow: { fontSize: 13, color: colors.textPrimary, marginBottom: 8 },
  injuryStatusLabel: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.textSecondary },
  injuryHint: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 10 },
  checkboxLabel: { ...typography.body, fontSize: 14, color: colors.textPrimary, flexShrink: 1 },
  btn: { minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.4 },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  btnSecondary: { minHeight: minTouchHeight, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, alignItems: 'center', marginTop: 4, marginBottom: 20 },
  btnSecondaryText: { ...typography.bodyMedium, color: colors.textPrimary, fontSize: 13, letterSpacing: 0.3 },
  error: { color: colors.error, fontSize: 13, marginBottom: 12 },
  ok: { color: colors.success, fontSize: 13, marginBottom: 12 },
  empty: { textAlign: 'center', padding: 24, color: colors.textSecondary, fontSize: 14 },
  historyCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 14, marginBottom: 10 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  historyType: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary },
  historyDate: { fontSize: 12, color: colors.textSecondary },
  historyDetail: { ...typography.body, fontSize: 13, color: colors.textSecondary },
  segmentCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 16, marginBottom: 14 },
  // WIZUAL-1 sekcja 8, decyzja Kuby 08.08.2026 — nadtytuł segmentu zszedł
  // z koloru marki na ink3, czyli na to samo, czym są WSZYSTKIE pozostałe
  // nadtytuły w tym pliku (`label`, `sectionLabel`). Nazwa segmentu to opis
  // danych, nie akcja; marka zostaje przy tym, co da się nacisnąć.
  segmentLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 10 },
  segmentQuestionText: { ...typography.bodyMedium, fontSize: 15, color: colors.textPrimary, marginBottom: 6, lineHeight: 21 },
  segmentCtxText: { ...typography.body, fontSize: 12, color: colors.textSecondary, marginBottom: 12, lineHeight: 17 },
  answerList: { gap: 8 },
  answerBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background, paddingVertical: 12, paddingHorizontal: 14 },
  answerBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  answerBtnText: { ...typography.body, fontSize: 14, color: colors.textPrimary },
  answerBtnTextActive: { ...typography.bodyMedium, color: colors.white },
  followupWrap: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
});
