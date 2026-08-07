// Ekran PROFIL — Krok 3.5 checklisty. Implementacja wg
// docs/KONTRAKT_PROFIL.md (spisanego z panel-profil w asystent_app.html
// PRZED tym kodem). Pierwszy ekran w kolejności Fazy 2 — czeka na
// potwierdzenie "zgadza się" po porównaniu z wersją webową, zanim ruszy
// Dziennik (Krok 6).
// AUDYT 27.07.2026: ŚWIADOMIE bez useFocusEffect (w przeciwieństwie do
// pozostałych 6 ekranów — patrz uzasadnienie w app/(tabs)/dziennik.tsx).
// Profil to jedyny ekran, który wczytuje dane do EDYTOWALNEGO formularza
// (imię, pozycja, poziom, cel kierunkowy, sprzęt, tryb kontuzji), nie do
// listy tylko-do-odczytu/formularza-dodawania-nowego-wpisu jak pozostałe
// ekrany. useFocusEffect nadpisywałby niezapisane zmiany w polach za każdym
// powrotem na tę zakładkę (np. zawodnik zaczął edytować imię, przełączył się
// na Kalendarz sprawdzić coś, wrócił — stracił to, co wpisał). Nic innego w
// appce nie zapisuje do tych samych pól w tle, więc ryzyko "danych
// nieaktualnych" tu nie występuje tak jak np. w Meczu (zależnym od trybu
// kontuzji ustawianego właśnie tutaj) — jednokrotne wczytanie przy
// montowaniu zostaje poprawnym zachowaniem.
//
// TOR 7 KROK 3 (SESJA_START_UX_MOBILE_PROFIL_ETAPY.md, 30.07.2026) — podział
// na 5 etapów zamiast jednego długiego ScrollView (audyt UX,
// PLAN_SPOJNEJ_SCIEZKI.md, "Profil jako jeden długi formularz"). Zmiana
// WYŁĄCZNIE organizacji UI/zapisu — żadna reguła walidacji ani kształt
// zapytań do Supabase się nie zmienił, tylko moment i grupowanie zapisu
// (patrz saveStage() niżej). Etapy, w kolejności:
//   0 — Dane podstawowe (+ Wzrost, Tor 5 — logicznie pasuje jako kolejna
//       podstawowa informacja o zawodniku, nie do klasyfikacji piłkarskiej
//       w etapie 1)
//   1 — Pozycja i poziom gry
//   2 — Cel kierunkowy (logika roli tego pola BEZ ZMIAN — patrz
//       KONTRAKT_PROFIL.md sekcja 3 i cele.tsx/loadGoalDirectionContext,
//       to tylko przeniesienie istniejącego bloku do właściwego etapu)
//   3 — Dostęp do sprzętu
//   4 — Tryb kontuzji + historia kontuzji (pod-formularz "Dodaj wpis" i
//       lista pozostają NIEZALEŻNE od zapisu etapu, dokładnie jak wcześniej)
// "Bezpieczeństwo" (blokada biometryczna) świadomie POZA numeracją etapów —
// to ustawienie urządzenia, nie pole formularza profilu, więc widoczne na
// każdym etapie, nie tylko na jednym.
//
// PAKIET 9 (03.08.2026, noc — decyzja Kuby w rozmowie: appka mobilna, ten
// ekran). Nowy blok "Raport dla rodzica" w Etapie 0, ten sam wzorzec co
// Wzrost tuż nad nim: formularz NIEZALEŻNY od zapisu etapu, własny stan,
// własny handler zapisu. Zapisuje WYŁĄCZNIE nowy wiersz do
// public.parent_report_subscriptions (player_user_id, parent_email) —
// backend (tabela, get_parent_report, parent_report_unsubscribe) już
// istnieje na żywo, potwierdzone 03.08.2026 (RAPORT_RODZICA_SQL.md). Bez
// odczytu istniejącej subskrypcji z powrotem — tabela świadomie NIE ma
// polityki RLS SELECT dla zwykłego zawodnika (dostęp tylko przez token,
// patrz RAPORT_RODZICA_SQL.md), więc appka nie próbuje pokazać "już
// zapisane", tylko potwierdza sam fakt udanego zapisu. `access_token`
// świadomie NIE wysyłany z appki — zakładam DEFAULT po stronie bazy
// (ten sam wzorzec co reszta tokenów w projekcie, np. session_bridge_codes)
// — do potwierdzenia przy pierwszym realnym teście, patrz DO_ZROBIENIA_
// PRZEZ_KUBE.md, Pakiet 9.
//
// KOD DRUŻYNY W APPCE MOBILNEJ (05.08.2026 — na wyraźną prośbę Kuby:
// "pracujmy tylko na appce mobilnej", w kontekście pilotażu Parasol
// Wrocław U12). Wcześniej pole "kod drużyny" (K3) istniało WYŁĄCZNIE w
// wersji webowej (asystent_app.html, ekran logowania) — appka mobilna nie
// miała żadnego odpowiednika, co odkryła sesja przygotowująca wdrożenie
// (patrz claude/PLAN_WDROZENIA_PARASOL_WROCLAW_U12.md). Blok niżej woła
// DOKŁADNIE tę samą, już istniejącą i przetestowaną funkcję SQL
// (join_team_with_code, patrz claude/INTEGRACJA_K3_ZAWODNIK_SQL.md) —
// zero nowego SQL, wyłącznie nowe wywołanie RPC z appki mobilnej. Ten sam
// wzorzec formularza co Raport dla rodzica wyżej: NIEZALEŻNY od zapisu
// etapu, własny stan, własny handler. Funkcja SQL ma wbudowany bezpieczny
// no-op, jeśli zawodnik już jest w aktywnej drużynie — więc ponowne
// kliknięcie nie szkodzi (w przeciwieństwie do Raportu dla rodzica, gdzie
// każdy zapis tworzy nowy wiersz, tu backend sam pilnuje duplikatów).
import { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { toLocalDateStr } from '../../lib/date-utils';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';
// JEDNA DROGA B2 08.08.2026 — jedno źródło nazw lokalizacji bólu.
import { BODY_LOCATIONS, BODY_LOCATION_LABELS, NON_LATERAL_LOCATIONS } from '../../lib/labels';
import {
  isBiometricHardwareAvailable,
  isBiometricLockEnabled,
  enableBiometricLock,
  disableBiometricLock,
} from '../../lib/biometric-auth';

// ── Stałe — 1:1 z asystent_app.html (kontrakt, sekcje 1-4) ──
const POSITIONS = [
  'Bramkarz', 'Środkowy obrońca', 'Boczny obrońca', 'Defensywny pomocnik',
  'Środkowy pomocnik', 'Ofensywny pomocnik', 'Skrzydłowy', 'Napastnik', 'Nie dotyczy',
];
const CURRENT_LEVELS = [
  'Amator / rekreacyjnie', 'Juniorski klub', 'Seniorski klub amatorski',
  'Półprofesjonalny', 'Profesjonalny',
];
const GOAL_DIRECTION_LABELS: Record<string, string> = {
  more_minutes: 'Więcej minut w meczach',
  move_up: 'Awans na wyższy poziom',
  improve_element: 'Poprawa konkretnego elementu gry',
  avoid_relegation_from_team: 'Utrzymanie miejsca w składzie',
  other: 'Inne',
};
const EQUIPMENT_LABELS: Record<string, string> = {
  silownia: 'Siłownia',
  biezna: 'Bieżnia',
  gumy_oporowe: 'Gumy oporowe',
  boisko: 'Dostęp do boiska',
  brak_dostepu: 'Brak dostępu do sprzętu',
};
const INJURY_MODE_CATEGORY_LABELS: Record<string, string> = {
  lower_body: 'Dolna część ciała',
  upper_body: 'Górna część ciała',
  general: 'Ogólne / całe ciało',
};
// JEDNA DROGA B2 08.08.2026 — lokalne kopie 17 lokalizacji bólu, ich mapy nazw
// i listy lokalizacji bez strony ciała usunięte; wszystkie trzy pochodzą teraz
// z lib/labels.ts. Były w trzech identycznych kopiach (dziennik.tsx, mecz.tsx,
// profil.tsx) — treść niezmieniona co do znaku, porównana maszynowo.

const STAGE_COUNT = 5;

type InjuryRow = {
  id: number;
  injury_type: string;
  body_location: string;
  side: string | null;
  period_from: string | null;
  period_to: string | null;
  fully_healed: boolean;
};

function formatDatePl(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProfilScreen() {
  const { currentUser } = useAuth();

  // Etap wieloetapowego formularza — Tor 7 Krok 3. Początkowa wartość 0,
  // nadpisywana w loadProfile() na "pierwszy niewypełniony etap" po
  // wczytaniu prawdziwych danych (patrz komentarz przy tamtej funkcji).
  const [step, setStep] = useState(0);
  const [savingStage, setSavingStage] = useState(false);

  // Sekcja 1-2
  const [fullName, setFullName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [posPrimary, setPosPrimary] = useState('');
  const [posSecondary, setPosSecondary] = useState('');
  const [currentLevel, setCurrentLevel] = useState('');
  const [highestLevel, setHighestLevel] = useState('');

  // Sekcja 2b — Wzrost (Tor 5, SESJA_START_WZROST_MOBILE.md). Log pomiarów w
  // czasie (INSERT do height_logs, NIE UPDATE — jeden zawodnik może mieć wiele
  // pomiarów), formularz NIEZALEŻNY od zapisu etapu, ten sam wzorzec co
  // Sekcja 7 (historia kontuzji) niżej. Appka tylko zbiera surowe pomiary,
  // zero liczenia tempa wzrostu (PHV) tutaj — to liczy backend
  // (get_parent_report / wątek 9 biblioteki trenerskiej).
  const [heightInput, setHeightInput] = useState('');
  const [savingHeight, setSavingHeight] = useState(false);
  const [lastHeight, setLastHeight] = useState<{ height_cm: number; measured_at: string } | null>(null);

  // Sekcja 2c — Raport dla rodzica (Pakiet 9, 03.08.2026 noc). INSERT do
  // parent_report_subscriptions, formularz NIEZALEŻNY od zapisu etapu, ten
  // sam wzorzec co Wzrost tuż wyżej — patrz komentarz na górze pliku.
  const [parentEmailInput, setParentEmailInput] = useState('');
  const [savingParentEmail, setSavingParentEmail] = useState(false);
  // AUDYT 06.08.2026 — pamięć lokalna ostatnio zapisanego adresu rodzica.
  // `parent_report_subscriptions` świadomie NIE ma polityki RLS SELECT dla
  // zawodnika (dostęp tylko przez token, RAPORT_RODZICA_SQL.md), więc appka nie
  // ma jak zapytać bazy "czy już zapisałem". Skutkiem było to, że zawodnik nie
  // widział żadnego śladu wcześniejszego zapisu i przy każdym wejściu w Profil
  // klikał jeszcze raz — a każde kliknięcie tworzyło NOWY wiersz subskrypcji,
  // czyli rodzic dostawałby raport tyle razy, ile razy dziecko kliknęło.
  // To obejście po stronie urządzenia: nie przetrwa reinstalacji ani zmiany
  // telefonu, ale odcina najczęstszy przypadek (kliknięcie dwa razy z rzędu).
  // PEŁNE ROZWIĄZANIE WYMAGA SQL — patrz REJESTR_NAPRAW_AUDYT_06_08_2026.md:
  // unikalny indeks na (player_user_id, parent_email) + polityka SELECT dla
  // właściciela wiersza. Do wklejenia przez Kubę, nie przez sesję.
  const [savedParentEmail, setSavedParentEmail] = useState<string | null>(null);

  // Sekcja 2d — Kod drużyny (05.08.2026). RPC join_team_with_code, formularz
  // NIEZALEŻNY od zapisu etapu, ten sam wzorzec co Raport dla rodzica wyżej
  // — patrz komentarz na górze pliku.
  const [teamCodeInput, setTeamCodeInput] = useState('');
  const [savingTeamCode, setSavingTeamCode] = useState(false);

  // Sekcja 3
  const [goalDirection, setGoalDirection] = useState('');
  const [goalNote, setGoalNote] = useState('');

  // Sekcja 4
  const [equipment, setEquipment] = useState<Record<string, boolean>>({});

  // Sekcja 5
  const [injuryModeActive, setInjuryModeActive] = useState(false);
  const [injuryModeCategory, setInjuryModeCategory] = useState('');

  // Sekcja 6 — Krok 3.4: blokada biometryczna (Face ID/Touch ID zamiast kodu OTP przy kolejnych otwarciach)
  const [biometricHardwareOk, setBiometricHardwareOk] = useState(false);
  const [biometricLockOn, setBiometricLockOn] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileOk, setProfileOk] = useState<string | null>(null);

  // Sekcja 7 — nowy wpis historii kontuzji (formularz niezależny)
  const [injuryType, setInjuryType] = useState('');
  const [injuryLocation, setInjuryLocation] = useState<string>(BODY_LOCATIONS[0][0]);
  const [injurySide, setInjurySide] = useState('');
  // AUDYT 28.07.2026 (ta sama luka co Kalendarz — web używa natywnego
  // <input type="date"> dla tych dwóch pól, patrz KONTRAKT_PROFIL.md,
  // "Uwaga o wierności" przy sekcji 7): Date zamiast zwykłego tekstu +
  // @react-native-community/datetimepicker (już zależność z Kroku 8).
  const [injuryFrom, setInjuryFrom] = useState<Date | null>(null);
  const [injuryTo, setInjuryTo] = useState<Date | null>(null);
  const [showInjuryFromPicker, setShowInjuryFromPicker] = useState(false);
  const [showInjuryToPicker, setShowInjuryToPicker] = useState(false);
  const [injuryHealed, setInjuryHealed] = useState(true);
  const [addingInjury, setAddingInjury] = useState(false);

  // Sekcja 8
  const [injuryHistory, setInjuryHistory] = useState<InjuryRow[]>([]);

  const loadProfile = useCallback(async () => {
    // Konwencja z web: load* NIE czyści banerów błędu/OK — patrz kontrakt sekcja 9.
    if (!currentUser) return;
    try {
      const [userRes, profileRes, injuryRes, heightRes] = await Promise.all([
        supabase.from('users').select('full_name,birth_year').eq('id', currentUser.id).limit(1),
        supabase.from('player_profiles').select('*').eq('user_id', currentUser.id).limit(1),
        supabase.from('injury_history').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }),
        supabase.from('height_logs').select('height_cm,measured_at').eq('user_id', currentUser.id)
          .order('measured_at', { ascending: false }).order('created_at', { ascending: false }).limit(1),
      ]);

      const u = userRes.data?.[0];
      setFullName(u?.full_name ?? '');
      setBirthYear(u?.birth_year != null ? String(u.birth_year) : '');

      const p = profileRes.data?.[0];
      setPosPrimary(p?.position_primary ?? '');
      setPosSecondary(p?.position_secondary ?? '');
      setCurrentLevel(p?.current_level ?? '');
      setHighestLevel(p?.highest_level_ever ?? '');
      setGoalDirection(p?.goal_direction ?? '');
      setGoalNote(p?.goal_direction_note ?? '');
      const equip: Record<string, boolean> = {};
      (p?.equipment_access ?? []).forEach((id: string) => { equip[id] = true; });
      setEquipment(equip);
      setInjuryModeActive(!!p?.injury_mode_active);
      setInjuryModeCategory(p?.injury_mode_category ?? '');

      setInjuryHistory(injuryRes.data ?? []);
      setLastHeight(heightRes.data?.[0] ?? null);

      // Tor 7 Krok 3 — "wróć później": ustaw etap startowy na PIERWSZYM
      // niewypełnionym, nie zawsze na 0. Żadne pole w tym formularzu nie
      // jest twardo wymagane (poza kategorią trybu kontuzji, sprawdzaną
      // dopiero przy zapisie etapu 4) — więc "wypełniony" to tu heurystyka
      // "zawiera choć jedną sensowną wartość", nie formalna walidacja.
      // Świadomie liczone z danych z bazy (u/p), nie z nowego, osobnego
      // stanu "ukończone etapy" — dokument startowy wprost zabrania zmian
      // schematu bazy dla tej sesji, a dodatkowy stan tylko na urządzeniu
      // (AsyncStorage) nie przetrwałby reinstalacji/zmiany telefonu, w
      // odróżnieniu od tego podejścia.
      const stage0Filled = !!(u?.full_name || u?.birth_year);
      const stage1Filled = !!(p?.position_primary || p?.current_level);
      const stage2Filled = !!p?.goal_direction;
      const stage3Filled = !!(p?.equipment_access && p.equipment_access.length > 0);
      if (!stage0Filled) setStep(0);
      else if (!stage1Filled) setStep(1);
      else if (!stage2Filled) setStep(2);
      else if (!stage3Filled) setStep(3);
      else setStep(4);
    } catch (e: any) {
      setProfileError('Nie udało się wczytać profilu: ' + e.message);
    }
  }, [currentUser]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // AUDYT 06.08.2026 — odczyt lokalnie zapamiętanego adresu rodzica (patrz wyżej).
  useEffect(() => {
    if (!currentUser) return;
    AsyncStorage.getItem(`parent_report_email:${currentUser.id}`)
      .then((v) => setSavedParentEmail(v))
      .catch(() => { /* brak pamięci lokalnej nie może blokować ekranu */ });
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;
    Promise.all([isBiometricHardwareAvailable(), isBiometricLockEnabled()]).then(([hw, enabled]) => {
      if (!mounted) return;
      setBiometricHardwareOk(hw);
      setBiometricLockOn(enabled);
    });
    return () => { mounted = false; };
  }, []);

  const toggleBiometricLock = async (next: boolean) => {
    setBiometricBusy(true);
    setProfileError(null);
    try {
      if (next) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.refresh_token) throw new Error('Brak aktywnej sesji.');
        await enableBiometricLock(session.refresh_token);
      } else {
        await disableBiometricLock();
      }
      setBiometricLockOn(next);
    } catch (e: any) {
      setProfileError('Nie udało się zmienić ustawienia logowania biometrycznego: ' + e.message);
    } finally {
      setBiometricBusy(false);
    }
  };

  // Tor 7 Krok 3 — zapis CZĘŚCIOWY, od razu po zatwierdzeniu każdego etapu
  // (audyt UX: appka wcześniej nie zapisywała nic aż do samego końca
  // formularza). Etap 0 zapisuje do public.users (kontrakt sekcja 6, GRANT
  // ograniczony do full_name/birth_year); etapy 1-4 zapisują do
  // player_profiles przez UPSERT z TYLKO polami danego etapu — kolumny spoza
  // etapu (w tym te z wcześniejszych/późniejszych etapów) świadomie
  // pominięte w payloadzie, więc Postgres UPDATE...SET dotyka wyłącznie ich,
  // nie nadpisuje reszty wiersza pustymi wartościami. Bezpieczne przy
  // INSERCIE pierwszego wiersza też — wszystkie pominięte kolumny w
  // player_profiles mają DEFAULT albo są nullable (zweryfikowane w schemacie,
  // asystent_sportowca_01_tozsamosc_profil.sql, nie zgadywane).
  const saveStage = async (targetStep: number) => {
    if (!currentUser) return;
    setProfileError(null);
    setProfileOk(null);

    // Walidacja twarda — kontrakt sekcja 5, teraz uruchamiana dopiero przy
    // zapisie etapu 4 (wcześniej: przy jedynym, końcowym "Zapisz profil").
    if (targetStep === 4 && injuryModeActive && !injuryModeCategory) {
      setProfileError('Wybierz kategorię ograniczenia dla trybu kontuzji.');
      return;
    }

    setSavingStage(true);
    try {
      if (targetStep === 0) {
        const { error } = await supabase
          .from('users')
          .update({
            full_name: fullName || null,
            birth_year: birthYear !== '' ? Number(birthYear) : null,
          })
          .eq('id', currentUser.id);
        if (error) throw error;
      } else {
        const payload: Record<string, any> = { user_id: currentUser.id, updated_at: new Date().toISOString() };
        if (targetStep === 1) {
          payload.position_primary = posPrimary || null;
          payload.position_secondary = posSecondary || null;
          payload.current_level = currentLevel || null;
          payload.highest_level_ever = highestLevel || null;
        } else if (targetStep === 2) {
          payload.goal_direction = goalDirection || null;
          payload.goal_direction_note = goalDirection === 'other' ? (goalNote.trim() || null) : null;
        } else if (targetStep === 3) {
          payload.equipment_access = Object.keys(EQUIPMENT_LABELS).filter((id) => equipment[id]);
        } else if (targetStep === 4) {
          payload.injury_mode_active = injuryModeActive;
          payload.injury_mode_category = injuryModeActive ? injuryModeCategory : null;
        }
        const { error } = await supabase.from('player_profiles').upsert(payload, { onConflict: 'user_id' });
        if (error) throw error;
      }

      if (targetStep < STAGE_COUNT - 1) {
        setStep(targetStep + 1);
      } else {
        setProfileOk('Profil zapisany.');
      }
    } catch (e: any) {
      setProfileError('Nie udało się zapisać profilu: ' + e.message);
    } finally {
      setSavingStage(false);
    }
  };

  const addHeightLog = async () => {
    if (!currentUser) return;
    setProfileError(null);
    setProfileOk(null);
    const normalized = heightInput.trim().replace(',', '.');
    const value = normalized !== '' ? Number(normalized) : NaN;
    if (!normalized || Number.isNaN(value)) {
      setProfileError('Podaj wzrost w centymetrach.');
      return;
    }
    // Ten sam zakres co CHECK height_cm BETWEEN 50 AND 250 w tabeli height_logs
    // (asystent_sportowca_21_narzedzie_trenera.sql) — walidacja klient-side to
    // tylko szybszy komunikat, baza i tak pilnuje tego ostatecznie.
    if (value < 50 || value > 250) {
      setProfileError('Wzrost musi być w zakresie 50–250 cm.');
      return;
    }
    setSavingHeight(true);
    try {
      // INSERT, nie UPDATE — height_logs to log pomiarów w czasie, measured_at
      // ustawia baza (DEFAULT CURRENT_DATE), appka go nie wysyła.
      const { data, error } = await supabase
        .from('height_logs')
        .insert({ user_id: currentUser.id, height_cm: value })
        .select('height_cm,measured_at')
        .limit(1);
      if (error) throw error;

      if (data && data[0]) {
        setLastHeight(data[0] as { height_cm: number; measured_at: string });
      }
      setHeightInput('');
      setProfileOk('Wzrost zapisany.');
    } catch (e: any) {
      setProfileError('Nie udało się zapisać wzrostu: ' + e.message);
    } finally {
      setSavingHeight(false);
    }
  };

  // Pakiet 9 (03.08.2026 noc) — zapisuje NOWĄ subskrypcję raportu dla
  // rodzica. Walidacja "zawiera @" — ten sam, świadomie prosty wzorzec co
  // logowanie (components/LoginScreen.tsx), nie pełny regex. `access_token`
  // świadomie pominięty w payloadzie — patrz komentarz na górze pliku.
  const addParentReportSubscription = async () => {
    if (!currentUser) return;
    setProfileError(null);
    setProfileOk(null);
    const trimmedEmail = parentEmailInput.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setProfileError('Podaj prawidłowy adres email rodzica.');
      return;
    }
    // AUDYT 06.08.2026 — nie twórz drugiej subskrypcji na ten sam adres.
    if (savedParentEmail && trimmedEmail.toLowerCase() === savedParentEmail.toLowerCase()) {
      setParentEmailInput('');
      setProfileOk('Ten adres jest już zapisany — nie trzeba go dodawać drugi raz.');
      return;
    }
    setSavingParentEmail(true);
    try {
      const { error } = await supabase
        .from('parent_report_subscriptions')
        .insert({ player_user_id: currentUser.id, parent_email: trimmedEmail });
      if (error) throw error;

      setParentEmailInput('');
      setSavedParentEmail(trimmedEmail);
      AsyncStorage.setItem(`parent_report_email:${currentUser.id}`, trimmedEmail).catch(() => {});
      setProfileOk('Zapisano e-mail rodzica — raporty zaczną przychodzić po włączeniu wysyłki.');
    } catch (e: any) {
      setProfileError('Nie udało się zapisać e-maila rodzica: ' + e.message);
    } finally {
      setSavingParentEmail(false);
    }
  };

  // 05.08.2026 — woła istniejącą, już przetestowaną funkcję SQL
  // join_team_with_code(p_team_code). Walidacja "niepuste" — reszta reguł
  // (kod nieprawidłowy, już w drużynie, itd.) obsłużona po stronie funkcji,
  // która zwraca jsonb {ok: boolean, error?: string, club_name?: string}.
  const joinTeamWithCode = async () => {
    if (!currentUser) return;
    setProfileError(null);
    setProfileOk(null);
    const code = teamCodeInput.trim();
    if (!code) {
      setProfileError('Podaj kod drużyny.');
      return;
    }
    setSavingTeamCode(true);
    try {
      const { data, error } = await supabase.rpc('join_team_with_code', { p_team_code: code });
      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error ?? 'Sprawdź, czy kod drużyny jest poprawny.');
      }
      setTeamCodeInput('');
      setProfileOk(data.club_name ? `Dołączono do drużyny „${data.club_name}”.` : 'Dołączono do drużyny.');
    } catch (e: any) {
      setProfileError('Nie udało się dołączyć do drużyny: ' + e.message);
    } finally {
      setSavingTeamCode(false);
    }
  };

  const addInjuryHistory = async () => {
    if (!currentUser) return;
    setProfileError(null);
    setProfileOk(null);
    if (!injuryType.trim()) {
      setProfileError('Podaj rodzaj kontuzji.');
      return;
    }
    setAddingInjury(true);
    try {
      const side = NON_LATERAL_LOCATIONS.has(injuryLocation) ? null : (injurySide || null);
      const { data, error } = await supabase
        .from('injury_history')
        .insert({
          user_id: currentUser.id,
          injury_type: injuryType,
          body_location: injuryLocation,
          side,
          period_from: injuryFrom ? toLocalDateStr(injuryFrom) : null,
          period_to: injuryTo ? toLocalDateStr(injuryTo) : null,
          fully_healed: injuryHealed,
        })
        .select();
      if (error) throw error;

      if (data && data[0]) {
        setInjuryHistory((prev) => [data[0] as InjuryRow, ...prev]);
      }
      // Reset — lokalizacja/strona CELOWO nieresetowane, patrz kontrakt sekcja 7.
      setInjuryType('');
      setInjuryFrom(null);
      setInjuryTo(null);
      setInjuryHealed(true);
      setProfileOk('Dodano do historii kontuzji.');
    } catch (e: any) {
      setProfileError('Nie udało się dodać wpisu: ' + e.message);
    } finally {
      setAddingInjury(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={styles.title}>Profil</Text>

      {profileError && <Text style={styles.error}>{profileError}</Text>}
      {profileOk && <Text style={styles.ok}>{profileOk}</Text>}

      {/* Wskaźnik postępu — Tor 7 Krok 3 */}
      <View style={styles.stepHeader}>
        <Text style={styles.stepLabel}>Etap {step + 1} z {STAGE_COUNT}</Text>
        <View style={styles.dots}>
          {Array.from({ length: STAGE_COUNT }).map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
      </View>

      {/* Etap 0 — Dane podstawowe (+ Wzrost) */}
      {step === 0 && (
        <>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Dane podstawowe</Text>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.staticValue}>{currentUser?.email ?? '—'}</Text>
            <Text style={styles.label}>Imię i nazwisko</Text>
            <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} value={fullName} onChangeText={setFullName} placeholder="np. Jan Kowalski" />
            <Text style={styles.label}>Rok urodzenia</Text>
            <TextInput
              style={styles.input} placeholderTextColor={colors.textSecondary} value={birthYear} onChangeText={setBirthYear}
              keyboardType="number-pad" placeholder="np. 2008"
            />
          </View>

          {/* Wzrost — log pomiarów w czasie (height_logs), formularz NIEZALEŻNY
              od zapisu etapu, ten sam wzorzec co historia kontuzji w etapie 4. */}
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Wzrost</Text>
            {lastHeight && (
              <Text style={styles.hint}>
                Ostatni zapisany pomiar: {lastHeight.height_cm} cm ({formatDatePl(lastHeight.measured_at)})
              </Text>
            )}
            <Text style={styles.label}>Wzrost (cm) — opcjonalnie</Text>
            <TextInput
              style={styles.input} placeholderTextColor={colors.textSecondary} value={heightInput} onChangeText={setHeightInput}
              keyboardType="decimal-pad" placeholder="np. 178"
            />
            <TouchableOpacity
              style={[styles.btnSecondary, savingHeight && styles.btnDisabled]}
              disabled={savingHeight}
              onPress={addHeightLog}
            >
              <Text style={styles.btnSecondaryText}>{savingHeight ? 'Zapisuję...' : 'Zapisz pomiar wzrostu'}</Text>
            </TouchableOpacity>
          </View>

          {/* Raport dla rodzica — Pakiet 9 (03.08.2026 noc). Formularz
              NIEZALEŻNY od zapisu etapu, ten sam wzorzec co Wzrost wyżej. */}
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Raport dla rodzica</Text>
            <Text style={styles.hint}>
              Podaj e-mail rodzica lub opiekuna, żeby cyklicznie dostawał krótkie
              podsumowanie Twojego rozwoju — bez logowania, bez dostępu do Twojego
              dziennika czy samopoczucia.
            </Text>
            {/* AUDYT 06.08.2026 — potwierdzenie, że adres już jest zapisany.
                Bez tego ekran nie dawał ŻADNEGO śladu wcześniejszego zapisu. */}
            {savedParentEmail ? (
              <Text style={styles.hint}>
                Zapisany adres: {savedParentEmail}. Jeśli wpiszesz inny, raport będzie chodził
                na oba — ten sam adres nie zostanie dodany drugi raz.
              </Text>
            ) : null}
            <Text style={styles.label}>Email rodzica</Text>
            <TextInput
              style={styles.input} placeholderTextColor={colors.textSecondary} value={parentEmailInput} onChangeText={setParentEmailInput}
              autoCapitalize="none" keyboardType="email-address" placeholder="np. rodzic@przyklad.pl"
            />
            <TouchableOpacity
              style={[styles.btnSecondary, savingParentEmail && styles.btnDisabled]}
              disabled={savingParentEmail}
              onPress={addParentReportSubscription}
            >
              <Text style={styles.btnSecondaryText}>{savingParentEmail ? 'Zapisuję...' : 'Zapisz e-mail rodzica'}</Text>
            </TouchableOpacity>
          </View>

          {/* Kod drużyny — 05.08.2026, patrz komentarz na górze pliku. Ten sam
              wzorzec formularza co Raport dla rodzica wyżej. */}
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Kod drużyny</Text>
            <Text style={styles.hint}>
              Masz kod drużyny od trenera? Wpisz go tutaj, żeby dołączyć — odblokowuje
              dłuższy okres próbny dopasowany do całej drużyny.
            </Text>
            <Text style={styles.label}>Kod drużyny</Text>
            <TextInput
              style={styles.input} placeholderTextColor={colors.textSecondary} value={teamCodeInput} onChangeText={setTeamCodeInput}
              autoCapitalize="characters" placeholder="np. PARASOLW3283"
            />
            <TouchableOpacity
              style={[styles.btnSecondary, savingTeamCode && styles.btnDisabled]}
              disabled={savingTeamCode}
              onPress={joinTeamWithCode}
            >
              <Text style={styles.btnSecondaryText}>{savingTeamCode ? 'Dołączam...' : 'Dołącz do drużyny'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Etap 1 — Pozycja i poziom */}
      {step === 1 && (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Pozycja i poziom</Text>
          <Text style={styles.label}>Pozycja podstawowa</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={posPrimary} onValueChange={setPosPrimary}>
              <Picker.Item label="— wybierz —" value="" />
              {POSITIONS.map((p) => <Picker.Item key={p} label={p} value={p} />)}
            </Picker>
          </View>
          <Text style={styles.label}>Pozycja dodatkowa (opcjonalnie)</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={posSecondary} onValueChange={setPosSecondary}>
              <Picker.Item label="— brak —" value="" />
              {POSITIONS.map((p) => <Picker.Item key={p} label={p} value={p} />)}
            </Picker>
          </View>
          <Text style={styles.label}>Obecny poziom gry</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={currentLevel} onValueChange={setCurrentLevel}>
              <Picker.Item label="— wybierz —" value="" />
              {CURRENT_LEVELS.map((l) => <Picker.Item key={l} label={l} value={l} />)}
            </Picker>
          </View>
          <Text style={styles.label}>Najwyższy poziom, na jakim kiedykolwiek grałeś</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={highestLevel} onValueChange={setHighestLevel}>
              <Picker.Item label="— wybierz —" value="" />
              {CURRENT_LEVELS.map((l) => <Picker.Item key={l} label={l} value={l} />)}
            </Picker>
          </View>
        </View>
      )}

      {/* Etap 2 — Cel kierunkowy (logika roli tego pola bez zmian, patrz nagłówek pliku) */}
      {step === 2 && (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Cel kierunkowy</Text>
          <Text style={styles.hint}>
            To ogólny kierunek, nie konkretny, śledzony cel — przy zakładaniu Twojego
            pierwszego celu w zakładce Cele przypomnimy Ci o nim, żebyś mógł wybrać
            konkretny segment, którego dotyczy.
          </Text>
          <Text style={styles.label}>Co jest dla Ciebie teraz najważniejsze?</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={goalDirection} onValueChange={setGoalDirection}>
              <Picker.Item label="— wybierz —" value="" />
              {Object.entries(GOAL_DIRECTION_LABELS).map(([id, label]) => (
                <Picker.Item key={id} label={label} value={id} />
              ))}
            </Picker>
          </View>
          {goalDirection === 'other' && (
            <>
              <Text style={styles.label}>Doprecyzowanie</Text>
              <TextInput
                style={[styles.input, styles.textarea]} placeholderTextColor={colors.textSecondary} value={goalNote} onChangeText={setGoalNote}
                placeholder="Opisz swój cel własnymi słowami" multiline
              />
            </>
          )}
        </View>
      )}

      {/* Etap 3 — Dostęp do sprzętu */}
      {step === 3 && (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Dostęp do sprzętu</Text>
          {Object.entries(EQUIPMENT_LABELS).map(([id, label]) => (
            <TouchableOpacity
              key={id} style={styles.checkboxRow}
              onPress={() => setEquipment((e) => ({ ...e, [id]: !e[id] }))}
            >
              <Checkbox value={!!equipment[id]} onValueChange={(v) => setEquipment((e) => ({ ...e, [id]: v }))} />
              <Text style={styles.checkboxLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Etap 4 — Tryb kontuzji + historia kontuzji */}
      {step === 4 && (
        <>
          <View style={styles.block}>
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setInjuryModeActive((v) => !v)}>
              <Checkbox value={injuryModeActive} onValueChange={setInjuryModeActive} />
              <Text style={styles.checkboxLabel}>
                Jestem teraz w trybie kontuzji (wykluczony z normalnego treningu)
              </Text>
            </TouchableOpacity>
            {injuryModeActive && (
              <>
                <Text style={styles.label}>Której części ciała to dotyczy?</Text>
                <View style={styles.pickerWrap}>
                  <Picker selectedValue={injuryModeCategory} onValueChange={setInjuryModeCategory}>
                    <Picker.Item label="— wybierz —" value="" />
                    {Object.entries(INJURY_MODE_CATEGORY_LABELS).map(([id, label]) => (
                      <Picker.Item key={id} label={label} value={id} />
                    ))}
                  </Picker>
                </View>
              </>
            )}
          </View>

          {/* Dodaj wpis do historii kontuzji — formularz niezależny */}
          <View style={{ marginTop: spacing.lg }}>
            <Text style={styles.sectionLabel}>Dodaj wpis do historii kontuzji</Text>
            <View style={styles.block}>
              <Text style={styles.label}>Rodzaj kontuzji</Text>
              <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} value={injuryType} onChangeText={setInjuryType} placeholder="np. skręcenie kostki" />

              <Text style={styles.label}>Lokalizacja</Text>
              <View style={styles.pickerWrap}>
                <Picker selectedValue={injuryLocation} onValueChange={setInjuryLocation}>
                  {BODY_LOCATIONS.map(([id, label]) => <Picker.Item key={id} label={label} value={id} />)}
                </Picker>
              </View>

              {!NON_LATERAL_LOCATIONS.has(injuryLocation) && (
                <>
                  <Text style={styles.label}>Strona</Text>
                  <View style={styles.pickerWrap}>
                    <Picker selectedValue={injurySide} onValueChange={setInjurySide}>
                      <Picker.Item label="—" value="" />
                      <Picker.Item label="Lewa" value="left" />
                      <Picker.Item label="Prawa" value="right" />
                    </Picker>
                  </View>
                </>
              )}

              <Text style={styles.label}>Od kiedy (opcjonalnie)</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowInjuryFromPicker(true)}>
                <Text style={{ color: injuryFrom ? colors.textPrimary : colors.textSecondary }}>
                  {injuryFrom ? injuryFrom.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Wybierz datę'}
                </Text>
              </TouchableOpacity>
              {showInjuryFromPicker && (
                <DateTimePicker
                  value={injuryFrom ?? new Date()}
                  mode="date"
                  onChange={(_event, selected) => {
                    setShowInjuryFromPicker(false);
                    if (selected) setInjuryFrom(selected);
                  }}
                />
              )}

              <Text style={styles.label}>Do kiedy (opcjonalnie, jeśli już zagojona)</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowInjuryToPicker(true)}>
                <Text style={{ color: injuryTo ? colors.textPrimary : colors.textSecondary }}>
                  {injuryTo ? injuryTo.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Wybierz datę'}
                </Text>
              </TouchableOpacity>
              {showInjuryToPicker && (
                <DateTimePicker
                  value={injuryTo ?? new Date()}
                  mode="date"
                  onChange={(_event, selected) => {
                    setShowInjuryToPicker(false);
                    if (selected) setInjuryTo(selected);
                  }}
                />
              )}

              <TouchableOpacity style={styles.checkboxRow} onPress={() => setInjuryHealed((v) => !v)}>
                <Checkbox value={injuryHealed} onValueChange={setInjuryHealed} />
                <Text style={styles.checkboxLabel}>Już w pełni zagojona</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnSecondary, addingInjury && styles.btnDisabled]}
                disabled={addingInjury}
                onPress={addInjuryHistory}
              >
                <Text style={styles.btnSecondaryText}>{addingInjury ? 'Dodaję...' : 'Dodaj do historii'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Historia kontuzji */}
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.sectionLabel}>Historia kontuzji</Text>
            {injuryHistory.length === 0 && <Text style={styles.empty}>Brak wpisów w historii kontuzji.</Text>}
            {injuryHistory.map((row) => {
              const loc = BODY_LOCATION_LABELS[row.body_location] ?? row.body_location;
              const side = row.side === 'left' ? ' (L)' : row.side === 'right' ? ' (P)' : '';
              const dates: string[] = [];
              if (row.period_from) dates.push('od ' + formatDatePl(row.period_from));
              if (row.period_to) dates.push('do ' + formatDatePl(row.period_to));
              return (
                <View key={row.id} style={styles.historyCard}>
                  <View style={styles.historyTop}>
                    <Text style={styles.historyType}>{row.injury_type}</Text>
                    <Text style={styles.historyDate}>{row.fully_healed ? 'Zagojona' : 'W trakcie leczenia'}</Text>
                  </View>
                  <Text style={styles.historyDetail}>
                    {loc}{side}{dates.length ? ' · ' + dates.join(' – ') : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Nawigacja między etapami — zapisuje etap do bazy PRZED przejściem dalej (Tor 7 Krok 3) */}
      <View style={styles.stepNav}>
        {step > 0 && (
          <TouchableOpacity
            style={[styles.btnSecondary, styles.stepNavBack, savingStage && styles.btnDisabled]}
            disabled={savingStage}
            onPress={() => setStep((s) => Math.max(0, s - 1))}
          >
            <Text style={styles.btnSecondaryText}>Wstecz</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.btn, styles.stepNavNext, savingStage && styles.btnDisabled]}
          disabled={savingStage}
          onPress={() => saveStage(step)}
        >
          <Text style={styles.btnText}>
            {savingStage ? 'Zapisuję...' : step === STAGE_COUNT - 1 ? 'Zapisz' : 'Dalej'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bezpieczeństwo — Krok 3.4. Świadomie POZA etapami (ustawienie
          urządzenia, nie pole profilu) — widoczne niezależnie od tego, na
          którym etapie jest zawodnik. */}
      {biometricHardwareOk && (
        <View style={[styles.block, { marginTop: spacing.lg }]}>
          <Text style={styles.blockLabel}>Bezpieczeństwo</Text>
          <TouchableOpacity
            style={styles.checkboxRow}
            disabled={biometricBusy}
            onPress={() => toggleBiometricLock(!biometricLockOn)}
          >
            <Checkbox value={biometricLockOn} onValueChange={(v) => toggleBiometricLock(v)} disabled={biometricBusy} />
            <Text style={styles.checkboxLabel}>
              Loguj się Face ID / Touch ID zamiast kodu z maila przy kolejnych otwarciach appki
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 28, marginBottom: spacing.lg, color: colors.textPrimary },
  block: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.md },
  blockLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: spacing.md },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: spacing.md },
  label: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 6, marginTop: 4 },
  hint: { ...typography.body, fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
  staticValue: { ...typography.body, fontSize: 14, color: colors.textPrimary, marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background, padding: 10,
    fontSize: 14, marginBottom: spacing.sm, color: colors.textPrimary,
  },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  pickerWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background, marginBottom: spacing.sm },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 10 },
  checkboxLabel: { ...typography.body, fontSize: 14, color: colors.textPrimary, flexShrink: 1 },
  btn: { minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  btnSecondary: { minHeight: minTouchHeight, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, alignItems: 'center', marginTop: spacing.sm },
  btnSecondaryText: { ...typography.bodyMedium, color: colors.textPrimary, fontSize: 13, letterSpacing: 0.3 },
  error: { color: colors.error, fontSize: 13, marginBottom: spacing.md },
  ok: { color: colors.success, fontSize: 13, marginBottom: spacing.md },
  empty: { textAlign: 'center', padding: spacing.lg, color: colors.textSecondary, fontSize: 14 },
  historyCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 14, marginBottom: 10 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  historyType: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary },
  historyDate: { fontSize: 12, color: colors.textSecondary },
  historyDetail: { ...typography.body, fontSize: 13, color: colors.textSecondary },
  // Tor 7 Krok 3 — wskaźnik postępu i nawigacja między etapami
  stepHeader: { marginBottom: spacing.md, alignItems: 'center' },
  stepLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.brand, width: 18 },
  stepNav: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  stepNavBack: { flex: 1, marginTop: 0 },
  stepNavNext: { flex: 1 },
});
