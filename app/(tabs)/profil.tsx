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
// ekran). Blok "Raport dla rodzica". Zapisuje do
// public.parent_report_subscriptions (player_user_id, parent_email);
// `access_token` świadomie NIE wysyłany z appki — baza ma DEFAULT
// gen_random_uuid() (zmierzone w information_schema.columns 15.08.2026,
// nie zakładane).
//
// PLAN-D-L2 08.2026 (15.08.2026) — RAPORT O MNIE JEST MÓJ.
//
// ⚠️ SPROSTOWANIE ZDANIA, KTÓRE STAŁO TU OD 06.08.2026. Ten nagłówek i blok
// przy stanie `savedParentEmail` twierdziły, że `parent_report_subscriptions`
// świadomie nie wystawia zawodnikowi odczytu jego własnego wiersza, więc appka
// nie ma jak zapytać bazy. TO BYŁA NIEPRAWDA — dosłowne brzmienie tamtego
// zdania stoi w `claude/PRZEKAZANIE_PAS_L2_15_08_2026.md` i strażnik pilnuje,
// żeby nie wróciło do tego pliku. Zmierzone 15.08.2026 zapytaniem do
// `pg_policies` na produkcji (projekt kqrbztsvepjtggjmmcdx) — polityki są
// TRZY, wszystkie właściciela:
//   parent_report_owner_select [SELECT] using (auth.uid() = player_user_id)
//   parent_report_owner_insert [INSERT] check (auth.uid() = player_user_id)
//   parent_report_owner_update [UPDATE] using + check (auth.uid() = player_user_id)
// Skutek nieaktualnego komentarza: przez dziewięć dni appka NIE PYTAŁA bazy
// o coś, o co wolno jej było zapytać, opierała się na pamięci urządzenia
// (AsyncStorage) i dziecko nie mogło ani zobaczyć, ani wyłączyć raportu,
// który co miesiąc opisuje jego życie obcej osobie (O67).
//
// CO SIĘ ZMIENIŁO: appka PYTA BAZĘ (`wczytajRaportRodzica`), rozróżnia
// CZTERY stany odczytu (nie pytałem / nie ma / jest / nie udało się —
// reguła R5) i ma przycisk wyłączenia. Blok wyszedł z Etapu 0 poza numerację
// etapów, tym samym wzorcem i z tego samego powodu co Plan lekcji niżej:
// zawodnik z wypełnionym profilem ląduje na etapie 5 z 5, więc w Etapie 0
// rzecz kosztowała SZEŚĆ dotknięć (Ja → Profil → cztery razy „Wstecz").
// Poza etapami kosztuje DWA.
//
// ⛔ Wypisanie to `active = false` + `unsubscribed_at`. Wiersza NIE KASUJEMY
//    i polityki DELETE nie ma — jej brak jest stanem prawidłowym.
// ⛔ Wyłączenie NIE POWIADAMIA nikogo. Rodzic nie dostaje maila „dziecko Cię
//    wyłączyło" — to jest decyzja o relacji i należy do Kuby, nie do pasa.
// ⚠️ Cała logika bez ekranu stoi w `lib/raportRodzica.ts` i ma tam własnego
//    strażnika (`lib/raportRodzica.selftest.ts`). Druga implementacja
//    rozróżnienia stanów po tej stronie to gwarantowany rozjazd.
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
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { toLocalDateStr } from '../../lib/date-utils';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';
// JEDNA DROGA B2 08.08.2026 — jedno źródło nazw lokalizacji bólu.
import { BODY_LOCATIONS, BODY_LOCATION_LABELS, NON_LATERAL_LOCATIONS } from '../../lib/labels';
// PLAN-D-F 08.2026 (12.08.2026) — walidacja pomiaru wzrostu i opis stanu.
// ⚠️ Ten moduł NIE liczy tempa wzrostu i nie zna progu 7,2 cm/rok. Klasyfikację
// robi wyłącznie backend (gamechange-app/lib/arbiter-glosu.js), a jej wynik
// wraca do appki wierszem `weekly_voice`. Druga implementacja progu po tej
// stronie to gwarantowany cichy rozjazd.
import { sprawdzPomiar, opiszPomiary, naDateLokalna, type PomiarWzrostu } from '../../lib/wzrost';
import {
  isBiometricHardwareAvailable,
  isBiometricLockEnabled,
  enableBiometricLock,
  disableBiometricLock,
} from '../../lib/biometric-auth';
// PLAN-D-K 08.2026 (13.08.2026) — CO SIĘ DZIEJE, GDY DOSTĘP WYGASA.
// ⚠️ Ten moduł NIE ZNA daty końca pilotażu i nie wolno mu jej znać. Data stoi
// w jednym miejscu: `public.koniec_okresu_probnego_pilotazu()`. Appka ją
// odczytuje wraz z resztą stanu, nigdy nie pamięta.
import {
  RPC_STAN_DOSTEPU,
  czytajStanDostepu,
  opisDostepuDoLogu,
  KOMUNIKAT_WYGASNIECIA,
  type StanDostepu,
} from '../../lib/dostepKonta';
// PLAN-D-A2A3 08.2026 (14.08.2026) — PLAN LEKCJI.
// ⚠️ Ten ekran NIE rysuje tygodnia i nie liczy progu „ciasno" — widok tygodnia
// jest osobnym pasem (C1). Tutaj jest wyłącznie miejsce, w którym zawodnik podaje
// godziny szkoły, bo bez nich pasek zajętości nie ma z czego powstać.
// ⚠️ Rozróżnienie „nie podał planu" (NIE_WIEM) od „podał i tego dnia nie ma
// szkoły" (WOLNE) robi `lib/planLekcji.ts` i NIE WOLNO go tu odtwarzać drugi
// raz — to jest reguła R5 i druga implementacja znaczy rozjazd.
import {
  parsujPlanLekcji,
  oknoDnia,
  zbudujOknaDoZapisu,
  isoDzienTygodnia,
  type PlanTygodnia,
  type WierszPlanuLekcji,
} from '../../lib/planLekcji';
// PLAN-D-L2 08.2026 (15.08.2026) — RAPORT O MNIE JEST MÓJ.
// ⚠️ Ten ekran NIE ROZSTRZYGA sam, co znaczy pusta odpowiedź bazy — robi to
// `czytajSubskrypcje`, żeby dało się to sprawdzić testem bez ekranu. Druga
// implementacja rozróżnienia „nie ma" od „nie udało się odczytać" jest tym
// samym rozjazdem, przed którym stoi ostrzeżenie przy planie lekcji niżej.
import {
  TABELA_SUBSKRYPCJI,
  KOLUMNY_SUBSKRYPCJI,
  czytajSubskrypcje,
  opisStanuRaportu,
  opisOstatniejWysylki,
  sprawdzEmail,
  sciezkaZapisu,
  wynikZmiany,
  ladunekWylaczenia,
  ladunekReaktywacji,
  toJestDuplikat,
  KOMUNIKAT_JUZ_DOSTAJE,
  KOMUNIKAT_WYLACZONY,
  KOMUNIKAT_WLACZONY_PONOWNIE,
  KOMUNIKAT_ZAPISANY,
  KOMUNIKAT_BLAD_WYLACZENIA,
  KOMUNIKAT_BLAD_ZAPISU,
  ETYKIETA_WYLACZ,
  type StanRaportuRodzica,
  type WierszSubskrypcji,
} from '../../lib/raportRodzica';

// ── Stałe — 1:1 z asystent_app.html (kontrakt, sekcje 1-4) ──
const POSITIONS = [
  'Bramkarz', 'Środkowy obrońca', 'Boczny obrońca', 'Defensywny pomocnik',
  'Środkowy pomocnik', 'Ofensywny pomocnik', 'Skrzydłowy', 'Napastnik', 'Nie dotyczy',
];
const CURRENT_LEVELS = [
  'Amator / rekreacyjnie', 'Juniorski klub', 'Seniorski klub amatorski',
  'Półprofesjonalny', 'Profesjonalny',
];
// ── PLAN-D-Q 08.2026 (13.08.2026) — ETYKIETY CELU: CZTERY KOPIE JEDNEJ LISTY ──
// Zmieniasz tutaj — zmień w POZOSTAŁYCH TRZECH, w tej samej kolejności:
//   • Asystent Gamechange/app/(tabs)/cele.tsx    — GOAL_DIRECTION_LABELS
//   • Asystent Gamechange/app/(tabs)/profil.tsx  — GOAL_DIRECTION_LABELS, kreator etap 2 ← TEN PLIK
//   • gamechange-app/asystent_app.html           — GOAL_DIRECTION_LABELS
//   • gamechange-diagnoza/index.html             — #goal-buttons + CTX_LABELS.goal + GOAL_DIRECTION_KEYS
// KOLEJNOŚĆ JEST CZĘŚCIĄ DECYZJI: `zawodowo` PIERWSZE, `other` OSTATNIE. Nie sortuj.
// `other` wpada do istniejącego pola `goal_direction_note` — nie ma osobnego pola.
// Strażnik: Asystent Gamechange/lib/etykietyCelu.selftest.ts (porównuje ZBIORY KLUCZY).
// 12.08.2026 dokładnie ten kształt — jedna kopia zmieniona, trzy nie — zabił Mapę drogi.
const GOAL_DIRECTION_LABELS: Record<string, string> = {
  zawodowo: 'Dojść do futbolu zawodowego',
  najwyzej_jak_moge: 'Zajść tak wysoko, jak zdołam',
  nie_do_pominiecia: 'Być zawodnikiem, którego trudno pominąć',
  jedna_rzecz: 'Doprowadzić do końca jedną rzecz w swojej grze',
  w_grze_na_dlugo: 'Zostać w grze na długo',
  other: 'Coś innego — napiszę własnymi słowami',
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

// PLAN-D-A2A3 08.2026 — dni tygodnia w numeracji ISO-8601 (1 = poniedziałek),
// TEJ SAMEJ, którą trzyma `player_school_slots.weekday` i którą zwraca
// `extract(isodow from date)` w bazie. JavaScript liczy inaczej (`getDay()`:
// 0 = niedziela) i przeliczenie stoi w JEDNYM miejscu — `lib/planLekcji.ts`,
// `isoDzienTygodnia`. Dwa przeliczenia = szkoła w niedzielę i nikt nie wie dlaczego.
const DNI_TYGODNIA: Array<[number, string]> = [
  [1, 'Poniedziałek'], [2, 'Wtorek'], [3, 'Środa'], [4, 'Czwartek'],
  [5, 'Piątek'], [6, 'Sobota'], [7, 'Niedziela'],
];

// Brzmienie WPROST Z MAKIETY `claude/MAKIETA_WIDOK_TYGODNIA.html` (kolumna 3,
// pustka „brak konfiguracji"). Nie jest przepisane ani skrócone.
const PLAN_LEKCJI_PUSTKA = 'Nie wiemy, kiedy masz szkołę — dlatego cały tydzień wygląda na wolny.';

type WierszFormularzaPlanu = { weekday: number; od: string; do_: string };

const PUSTY_FORMULARZ_PLANU: WierszFormularzaPlanu[] =
  DNI_TYGODNIA.map(([weekday]) => ({ weekday, od: '', do_: '' }));

/** Poniedziałek tygodnia, w którym jest podana data — w czasie LOKALNYM. */
function poniedzialekTygodnia(dzis: Date): Date {
  const iso = isoDzienTygodnia(toLocalDateStr(dzis)) ?? 1;
  const p = new Date(dzis);
  p.setDate(dzis.getDate() - (iso - 1));
  return p;
}

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
  // PLAN-D-F 08.2026 — CAŁA historia pomiarów, nie tylko ostatni.
  // Powód jest mechaniczny, nie estetyczny: Osłona (szczebel 2 drabiny arbitra)
  // potrzebuje DWÓCH pomiarów oddalonych o co najmniej pół roku. Zawodnik, który
  // widzi wyłącznie ostatni wpis, nie ma jak stwierdzić, czy już je ma.
  const [heightRows, setHeightRows] = useState<PomiarWzrostu[]>([]);
  // Data pomiaru. DOMYŚLNIE DZISIAJ, ale zmienialna — to jest cała ta zmiana.
  // Do 12.08.2026 `measured_at` ustawiała baza (DEFAULT CURRENT_DATE), więc
  // każdy pomiar był z dnia wpisania i pierwsze okno ≥ pół roku mogło powstać
  // najwcześniej pół roku po założeniu konta. Wzrost sprzed roku zna prawie
  // każdy zawodnik — z bilansu albo z pomiaru w klubie — i nie było jak go podać.
  const [heightDate, setHeightDate] = useState<Date>(new Date());
  const [showHeightPicker, setShowHeightPicker] = useState(false);

  // Sekcja 2c — Raport dla rodzica (Pakiet 9, 03.08.2026 noc). INSERT do
  // parent_report_subscriptions, formularz NIEZALEŻNY od zapisu etapu, ten
  // sam wzorzec co Wzrost tuż wyżej — patrz komentarz na górze pliku.
  const [parentEmailInput, setParentEmailInput] = useState('');
  const [savingParentEmail, setSavingParentEmail] = useState(false);
  // PLAN-D-L2 15.08.2026 — STAN SUBSKRYPCJI CZYTANY Z BAZY, nie z pamięci
  // urządzenia. Do 15.08 stał tu `savedParentEmail` z AsyncStorage, bo
  // komentarz w tym pliku twierdził, że baza nie wpuści zawodnika do jego
  // własnego wiersza. Wpuszcza
  // (`pg_policies`, zmierzone 15.08.2026 — patrz nagłówek pliku), a pamięć
  // urządzenia nie przeżywała reinstalacji ani zmiany telefonu: dziecko po
  // przesiadce nie widziało ŻADNEGO śladu tego, że raport o nim chodzi.
  //
  // `null` znaczy „jeszcze nie pytałem" — CZWARTY stan obok „nie ma", „jest"
  // i „nie udało się odczytać". Ten sam wzorzec co `stanDostepu`
  // i `stanPlanuLekcji` niżej.
  const [stanRaportu, setStanRaportu] = useState<StanRaportuRodzica | null>(null);
  // Wszystkie wiersze zawodnika, także wypisane — bez nich nie da się
  // odróżnić „zapisz nowy" od „włącz z powrotem ten, który już był".
  const [wierszeRaportu, setWierszeRaportu] = useState<WierszSubskrypcji[]>([]);
  // Id subskrypcji, którą właśnie wyłączamy — żeby zablokować sam ten
  // przycisk, a nie wszystkie naraz, gdy adresów jest kilka.
  const [wylaczanyId, setWylaczanyId] = useState<number | null>(null);

  // Sekcja 2d — Kod drużyny (05.08.2026). RPC join_team_with_code, formularz
  // NIEZALEŻNY od zapisu etapu, ten sam wzorzec co Raport dla rodzica wyżej
  // — patrz komentarz na górze pliku.
  const [teamCodeInput, setTeamCodeInput] = useState('');
  const [savingTeamCode, setSavingTeamCode] = useState(false);

  // Sekcja 2e — Plan lekcji (PLAN-D-A2A3 08.2026, 14.08.2026). Formularz
  // NIEZALEŻNY od zapisu etapu, ten sam wzorzec co Wzrost / Raport dla rodzica
  // / Kod drużyny. Zapis idzie JEDNYM wywołaniem `set_school_timetable` —
  // atomowo, bo nagłówek bez okien znaczy w bazie „nie mam szkoły w żaden
  // dzień", więc zerwane połączenie w połowie zapisu skłamałoby o zawodniku.
  const [planLekcji, setPlanLekcji] = useState<WierszFormularzaPlanu[]>(PUSTY_FORMULARZ_PLANU);
  const [savingPlanLekcji, setSavingPlanLekcji] = useState(false);
  // `null` znaczy „jeszcze nie pytałem" — trzeci stan obok „wiem" i „nie udało
  // się odczytać". Ten sam wzorzec co `stanDostepu` wyżej.
  const [stanPlanuLekcji, setStanPlanuLekcji] = useState<PlanTygodnia | null>(null);
  // Plan z okienkiem (dwa okna jednego dnia) jest w bazie POPRAWNY, a ten
  // formularz ma jedno pole „od–do" na dzień. Zapis z niego SKASOWAŁBY drugie
  // okno po cichu — więc przy takim planie formularz się nie włącza.
  const [planLekcjiZOkienkami, setPlanLekcjiZOkienkami] = useState(false);

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

  // PLAN-D-K 08.2026 — stan dostępu. `null` znaczy „jeszcze nie pytałem",
  // co jest trzecim stanem obok „wiem" i „nie udało się odczytać".
  const [stanDostepu, setStanDostepu] = useState<StanDostepu | null>(null);

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
        // PLAN-D-F 08.2026 — bez `.limit(1)`: potrzebna jest cała historia,
        // żeby dało się pokazać, ile pomiarów zawodnik ma i co je dzieli.
        supabase.from('height_logs').select('height_cm,measured_at').eq('user_id', currentUser.id)
          .order('measured_at', { ascending: false }).order('created_at', { ascending: false }),
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
      // Błąd odczytu NIE udaje pustej historii: pusta lista przy błędzie
      // znaczyłaby „nie masz żadnego pomiaru" komuś, kto ma ich pięć (reguła R5).
      if (heightRes.error) {
        console.error('profil: nie odczytałem height_logs:', heightRes.error.message);
      } else {
        setHeightRows((heightRes.data ?? []) as PomiarWzrostu[]);
      }

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

  // PLAN-D-K 08.2026 (13.08.2026) — STAN DOSTĘPU.
  //
  // ⚠️ ZAKAZ ŚCIEŻKI ODZYSKU: wołamy DOKŁADNIE RAZ, bez argumentów
  // (`stan_dostepu()` ma `pronargs = 0`, zmierzone 13.08.2026 — PostgREST
  // dopasowuje funkcje po NAZWACH parametrów, O33, więc dołożenie tu
  // jakiegokolwiek argumentu urwałoby dopasowanie po cichu). Gdy wywołanie
  // padnie, karta mówi „nie wiem", a nie „nie masz dostępu" — to są dwie
  // różne rzeczy i zawodnik ma prawo je rozróżnić.
  useEffect(() => {
    let mounted = true;
    if (!currentUser) return;
    supabase.rpc(RPC_STAN_DOSTEPU).then(({ data, error }) => {
      if (!mounted) return;
      const stan = czytajStanDostepu(data, error ? error.message : null);
      setStanDostepu(stan);
      console.log('[PLAN-D-K]', opisDostepuDoLogu(stan));
    });
    return () => { mounted = false; };
  }, [currentUser]);

  // PLAN-D-A2A3 08.2026 (14.08.2026) — ODCZYT PLANU LEKCJI.
  //
  // ⚠️ ŚWIADOMIE OSOBNE, WĄSKIE WYWOŁANIE, poza paczką w `loadProfile`: gdyby
  // funkcja `school_week` nie istniała (migracja jeszcze nie wklejona) albo
  // padła, cały ekran Profilu ma działać dalej. Ten sam wzorzec co odczyt
  // stanu dostępu wyżej.
  // ⚠️ Nieudany odczyt daje `parsujPlanLekcji(null)`, czyli `odczytany: false`
  // — a to jest COŚ INNEGO niż „zawodnik nie podał planu". Ekran, który by je
  // skleił, wysłałby do pustego formularza kogoś, kto już wszystko wpisał.
  const wczytajPlanLekcji = useCallback(async () => {
    if (!currentUser) return;
    const odKiedy = toLocalDateStr(poniedzialekTygodnia(new Date()));
    const { data, error } = await supabase.rpc('school_week', { p_from: odKiedy });
    if (error) {
      // ⚠️ Nieudany odczyt NIE UDAJE pustego planu. `parsujPlanLekcji(null)`
      // daje `odczytany: false`, więc ekran powie „nie udało się odczytać",
      // a nie „nie wiemy, kiedy masz szkołę" komuś, kto już wszystko wpisał.
      console.warn('[PLAN-D-A2A3] nie odczytałem planu lekcji:', error.message);
      setStanPlanuLekcji(parsujPlanLekcji(null));
      return;
    }
    const plan = parsujPlanLekcji((data ?? []) as WierszPlanuLekcji[]);
    setStanPlanuLekcji(plan);

    // Wypełnienie formularza tym, co NAPRAWDĘ obowiązuje w tym tygodniu.
    let sokienka = false;
    const wiersze = DNI_TYGODNIA.map(([weekday]) => {
      const dzien = Object.keys(plan.dni).find((d) => isoDzienTygodnia(d) === weekday);
      // Brak daty dla tego dnia tygodnia → `oknoDnia` odpowiada NIE_WIEM.
      // Nie budujemy tu drugiego stanu „domyślnego" obok tamtego.
      const okno = oknoDnia(plan, dzien ?? '');
      if (okno.stan !== 'SZKOLA') return { weekday, od: '', do_: '' };
      if (okno.okna.length > 1) sokienka = true;
      return { weekday, od: okno.okna[0].poczatek, do_: okno.okna[0].koniec };
    });
    setPlanLekcjiZOkienkami(sokienka);
    setPlanLekcji(wiersze);
  }, [currentUser]);

  useEffect(() => { wczytajPlanLekcji(); }, [wczytajPlanLekcji]);

  // PLAN-D-L2 08.2026 (15.08.2026) — ODCZYT SUBSKRYPCJI RAPORTU DLA RODZICA.
  //
  // ⚠️ ŚWIADOMIE OSOBNE, WĄSKIE WYWOŁANIE, poza paczką w `loadProfile` — ten
  // sam wzorzec co stan dostępu i plan lekcji. Gdyby polityka SELECT zniknęła
  // albo odczyt padł, cały ekran Profilu ma działać dalej.
  //
  // ⛔ ŻADNEGO `data ?? []`. Odpowiedź z błędem i pusta lista to DWIE RÓŻNE
  // rzeczy, a sklejenie ich napisałoby dziecku „Nikt nie dostaje raportu
  // o Tobie" w chwili, w której nie wiemy, czy ktoś dostaje. Rozróżnienie
  // robi `czytajSubskrypcje`, które dostaje CAŁĄ odpowiedź.
  const wczytajRaportRodzica = useCallback(async () => {
    if (!currentUser) return;
    const { data, error } = await supabase
      .from(TABELA_SUBSKRYPCJI)
      .select(KOLUMNY_SUBSKRYPCJI)
      .eq('player_user_id', currentUser.id)
      .order('created_at', { ascending: false });

    const stan = czytajSubskrypcje(data, error ? error.message : null);
    setStanRaportu(stan);
    setWierszeRaportu(
      stan.rodzaj === 'nie_udalo_sie' || !Array.isArray(data) ? [] : (data as unknown as WierszSubskrypcji[]),
    );
    if (error) console.warn('[PLAN-D-L2] nie odczytałem subskrypcji raportu:', error.message);
  }, [currentUser]);

  useEffect(() => { wczytajRaportRodzica(); }, [wczytajRaportRodzica]);

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

    // PLAN-D-F 08.2026 — walidacja wyprowadzona do `lib/wzrost.ts`, żeby dało
    // się ją sprawdzić testem bez ekranu (50 asercji, cztery sprawdzone
    // mutacyjnie). Zakres 50–250 cm jest lustrem CHECK-u w bazie; data pomiaru
    // ma własne strażniki, bo literówka w roku („2016" zamiast „2026") NIE
    // rzuca błędem — daje backendowi okno dziesięcioletnie, tempo bliskie zeru
    // i cichy brak alertu u zawodnika, który rośnie 9 cm rocznie.
    const dataIso = naDateLokalna(heightDate);
    const wynik = sprawdzPomiar(heightInput, dataIso, naDateLokalna(new Date()), heightRows);
    if (!wynik.ok) {
      setProfileError(wynik.blad);
      return;
    }

    setSavingHeight(true);
    try {
      // INSERT, nie UPDATE — height_logs to log pomiarów w czasie.
      // `measured_at` idzie TERAZ z appki (dotąd ustawiała je baza przez
      // DEFAULT CURRENT_DATE), żeby dało się dopisać pomiar sprzed roku.
      const { data, error } = await supabase
        .from('height_logs')
        .insert({ user_id: currentUser.id, height_cm: wynik.wartosc, measured_at: wynik.data })
        .select('height_cm,measured_at')
        .limit(1);
      if (error) throw error;

      if (data && data[0]) {
        const nowy = data[0] as PomiarWzrostu;
        setHeightRows((poprzednie) => [nowy, ...poprzednie]
          .sort((a, b) => (a.measured_at < b.measured_at ? 1 : a.measured_at > b.measured_at ? -1 : 0)));
      }
      setHeightInput('');
      setHeightDate(new Date());
      // Ostrzeżenie NIE jest błędem — zapis się udał i trzeba to powiedzieć
      // razem z zastrzeżeniem, a nie zamiast niego.
      setProfileOk(wynik.ostrzezenie ? `Wzrost zapisany. ${wynik.ostrzezenie}` : 'Wzrost zapisany.');
    } catch (e: any) {
      setProfileError('Nie udało się zapisać wzrostu: ' + e.message);
    } finally {
      setSavingHeight(false);
    }
  };

  // Pakiet 9 (03.08.2026 noc) → PRZEPISANE W PLAN-D-L2 (15.08.2026).
  //
  // ⚠️ DRUGA POŁÓWKA MIGRACJI `MIGRACJA_L2_JEDNA_SUBSKRYPCJA.sql`. Po założeniu
  // częściowego unikatu na `(player_user_id, lower(parent_email)) where active`
  // drugie kliknięcie „Zapisz" na ten sam adres przestaje po cichu tworzyć
  // duplikat i zaczyna zwracać `23505`. Sam surowy błąd bazy na ekranie
  // dziecka jest tak samo zły jak cichy duplikat — dlatego appka najpierw
  // czyta, co NAPRAWDĘ jest, i wybiera ścieżkę.
  //
  // ⚠️ DLACZEGO NIE `upsert`: PostgREST przyjmuje w `on_conflict` wyłącznie
  // nazwy kolumn, a unikat stoi na WYRAŻENIU `lower(parent_email)`. Postgres
  // odpowiada wtedy `42P10 there is no unique or exclusion constraint matching
  // the ON CONFLICT specification` — zmierzone na PostgreSQL 16, nie założone
  // (patrz nota pasa L2). `23505` zostaje jako siatka na wyścig dwóch urządzeń.
  const addParentReportSubscription = async () => {
    if (!currentUser) return;
    setProfileError(null);
    setProfileOk(null);

    const sprawdzony = sprawdzEmail(parentEmailInput);
    if (!sprawdzony.ok) {
      setProfileError(sprawdzony.blad);
      return;
    }

    const sciezka = sciezkaZapisu(stanRaportu, sprawdzony.email, wierszeRaportu);
    // ⛔ Nie wiemy, co jest w bazie → NIE ZGADUJEMY. Zapis „na ślepo" wprost
    // pod unikat kończy się surowym błędem bazy na ekranie dziecka.
    if (sciezka.rodzaj === 'nie_wiem') {
      setProfileError(KOMUNIKAT_BLAD_ZAPISU);
      return;
    }
    if (sciezka.rodzaj === 'juz_aktywny') {
      setParentEmailInput('');
      setProfileOk(KOMUNIKAT_JUZ_DOSTAJE);
      return;
    }

    setSavingParentEmail(true);
    try {
      if (sciezka.rodzaj === 'reaktywuj') {
        // ⛔ NIE drugi `insert`. Wiersz historyczny wraca do życia razem
        // ze skasowanym znacznikiem wypisania — inaczej dziennik kłamie.
        const { data, error } = await supabase
          .from(TABELA_SUBSKRYPCJI)
          .update(ladunekReaktywacji())
          .eq('id', sciezka.id)
          .select('id');
        // O61: dowodem jest LICZBA wierszy, nie brak błędu.
        const wynik = wynikZmiany(data, error ? error.message : null);
        if (!wynik.ok) {
          // ⚠️ `23505` znaczy, że baza wie coś, czego ekran nie wiedział
          // (drugie urządzenie zdążyło zapisać). Wtedy trzeba ODCZYTAĆ PONOWNIE,
          // inaczej lista dalej pokazuje nieaktualny stan obok komunikatu,
          // który mu przeczy.
          if (toJestDuplikat(error)) { setProfileError(KOMUNIKAT_JUZ_DOSTAJE); await wczytajRaportRodzica(); }
          else setProfileError(KOMUNIKAT_BLAD_ZAPISU);
          return;
        }
        setParentEmailInput('');
        setProfileOk(KOMUNIKAT_WLACZONY_PONOWNIE);
      } else {
        const { data, error } = await supabase
          .from(TABELA_SUBSKRYPCJI)
          .insert({ player_user_id: currentUser.id, parent_email: sprawdzony.email })
          .select('id');
        const wynik = wynikZmiany(data, error ? error.message : null);
        if (!wynik.ok) {
          // Ten sam powód co przy reaktywacji wyżej: duplikat znaczy, że stan
          // ekranu jest starszy niż stan bazy.
          if (toJestDuplikat(error)) { setProfileError(KOMUNIKAT_JUZ_DOSTAJE); await wczytajRaportRodzica(); }
          else setProfileError(KOMUNIKAT_BLAD_ZAPISU);
          return;
        }
        setParentEmailInput('');
        setProfileOk(KOMUNIKAT_ZAPISANY);
      }
      // Stan bierzemy z POWTÓRNEGO ODCZYTU, nie z tego, co chcieliśmy zapisać
      // — ten sam powód co przy planie lekcji: inaczej ekran pokazuje życzenie
      // appki, a nie zawartość bazy, i różnicy nikt nie zobaczy.
      await wczytajRaportRodzica();
    } finally {
      setSavingParentEmail(false);
    }
  };

  // PLAN-D-L2 (15.08.2026) — WYŁĄCZENIE RAPORTU.
  //
  // ⛔ `update`, NIE `delete`. Polityki DELETE nie ma i nie ma być: wiersz jest
  //    zapisem tego, co wyszło na zewnątrz o nieletnim, i zostaje.
  // ⛔ ZERO AUTOMATYCZNEGO POWIADOMIENIA. Rodzic nie dostaje maila „dziecko Cię
  //    wyłączyło". To jest decyzja o relacji — należy do Kuby, nie do pasa.
  // ⚠️ O61: `update` pod RLS, który nie trafił w żaden wiersz, NIE RZUCA
  //    wyjątku. Bez `.select('id')` i sprawdzenia liczby wierszy ekran
  //    powiedziałby „Raport wyłączony." komuś, komu nic nie wyłączył.
  const wylaczRaport = async (id: number) => {
    if (!currentUser) return;
    setProfileError(null);
    setProfileOk(null);
    setWylaczanyId(id);
    try {
      const { data, error } = await supabase
        .from(TABELA_SUBSKRYPCJI)
        .update(ladunekWylaczenia(new Date().toISOString()))
        .eq('id', id)
        .select('id');
      const wynik = wynikZmiany(data, error ? error.message : null);
      if (!wynik.ok) {
        console.warn('[PLAN-D-L2] wyłączenie nie objęło wiersza:', wynik.powod, 'wierszy:', wynik.ile);
        setProfileError(KOMUNIKAT_BLAD_WYLACZENIA);
        return;
      }
      // FAKT O TOBIE — i tylko tyle. Zdanie „rodzic nie dostanie kolejnego"
      // jest PROPOZYCJĄ (dyspozytor go nie potwierdził) i nie wychodzi na ekran.
      setProfileOk(KOMUNIKAT_WYLACZONY);
      await wczytajRaportRodzica();
    } finally {
      setWylaczanyId(null);
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

  // PLAN-D-A2A3 08.2026 (14.08.2026) — ZAPIS PLANU LEKCJI.
  //
  // ⚠️ JEDNO wywołanie `set_school_timetable`, nie dwa zapisy z appki.
  // Nagłówek bez okien znaczy w bazie „podałem plan i nie mam szkoły w żaden
  // dzień" — więc zapis w dwóch krokach, przerwany po pierwszym, zamieniłby
  // utratę pakietu w deklarację, której zawodnik nie złożył.
  //
  // ⚠️ Walidacja stoi w `lib/planLekcji.ts` (`zbudujOknaDoZapisu`), żeby dało
  // się ją sprawdzić bez ekranu. Baza ma te same reguły w CHECK-ach — appka
  // jest tu grzecznością, nie zabezpieczeniem.
  const zapiszPlanLekcji = async () => {
    if (!currentUser) return;
    setProfileError(null);
    setProfileOk(null);

    const wynik = zbudujOknaDoZapisu(planLekcji);
    if (!wynik.ok) {
      setProfileError(wynik.powod);
      return;
    }

    setSavingPlanLekcji(true);
    try {
      // Data obowiązywania z czasu LOKALNEGO zawodnika, nie z `CURRENT_DATE`
      // bazy — ten sam powód co przy dacie pomiaru wzrostu: baza liczy w UTC.
      const { error } = await supabase.rpc('set_school_timetable', {
        p_slots: wynik.okna,
        p_valid_from: toLocalDateStr(new Date()),
      });
      if (error) throw error;

      // Stan bierzemy z POWTÓRNEGO ODCZYTU, nie z tego, co chcieliśmy zapisać.
      // Zbudowanie go z własnego żądania znaczyłoby, że ekran pokazuje życzenie
      // appki, a nie zawartość bazy — i różnicy nikt by nie zobaczył.
      await wczytajPlanLekcji();
      setProfileOk(wynik.okna.length === 0
        ? 'Zapisane: w tym okresie nie masz szkoły w żaden dzień.'
        : 'Plan lekcji zapisany.');
    } catch (e: any) {
      setProfileError('Nie udało się zapisać planu lekcji: ' + e.message);
    } finally {
      setSavingPlanLekcji(false);
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

      {/*
        PLAN-D-K 08.2026 (13.08.2026) — KARTA DOSTĘPU.
        Świadomie POZA numeracją etapów, tym samym wzorcem co „Bezpieczeństwo":
        to nie jest pole formularza, tylko stan konta, i ma być widoczne
        niezależnie od tego, na którym etapie zawodnik stoi.

        ⛔ ZAKAZ SPRZEDAŻY W TYM MIEJSCU (polecenie K2). Ani ceny, ani przycisku
        zakupu, ani odliczania dni. Karta mówi, co się stało — nie namawia.
        ⚠️ BRZMIENIE DO PRZEJRZENIA PRZEZ KUBĘ — patrz `lib/dostepKonta.ts`,
        stała `KOMUNIKAT_WYGASNIECIA`. Nie jest zatwierdzone jako ostateczne.
      */}
      {stanDostepu?.rodzaj === 'znany' && !stanDostepu.maDostep && (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>{KOMUNIKAT_WYGASNIECIA.tytul}</Text>
          <Text style={styles.hint}>{KOMUNIKAT_WYGASNIECIA.coWygaslo}</Text>
          <Text style={styles.hint}>{KOMUNIKAT_WYGASNIECIA.coDziala}</Text>
          <Text style={styles.hint}>{KOMUNIKAT_WYGASNIECIA.czegoNieStracil}</Text>
        </View>
      )}

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

            {/* PLAN-D-F 08.2026 — zdanie o stanie pomiarów. Mówi, CO ZROBIĆ,
                nie tylko czego brakuje: „nie mam dość danych" bez wskazania
                ruchu jest komunikatem o systemie, nie o zawodniku.
                ⚠️ Nie zawiera ŻADNEJ oceny ani progu — ocena („rośniesz teraz
                szybko") przychodzi z arbitra przez `weekly_voice` i pokazuje ją
                ekran „Dziś". Tu są wyłącznie fakty: ile pomiarów, co je dzieli.
                ⚠️ I żadnej liczby o dojrzałości biologicznej (zakaz spec 3.3) —
                pilnowane asercjami w lib/wzrost.selftest.ts. */}
            <Text style={styles.hint}>{opiszPomiary(heightRows).zdanie}</Text>

            <Text style={styles.label}>Wzrost (cm) — opcjonalnie</Text>
            <TextInput
              style={styles.input} placeholderTextColor={colors.textSecondary} value={heightInput} onChangeText={setHeightInput}
              keyboardType="decimal-pad" placeholder="np. 178"
            />

            {/* Data pomiaru — ten sam wzorzec co daty w historii kontuzji niżej. */}
            <Text style={styles.label}>Kiedy zmierzony</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowHeightPicker(true)}>
              <Text style={{ color: colors.textPrimary }}>
                {heightDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
            {showHeightPicker && (
              <DateTimePicker
                value={heightDate}
                mode="date"
                maximumDate={new Date()}
                onChange={(_event, selected) => {
                  setShowHeightPicker(false);
                  if (selected) setHeightDate(selected);
                }}
              />
            )}

            <TouchableOpacity
              style={[styles.btnSecondary, savingHeight && styles.btnDisabled]}
              disabled={savingHeight}
              onPress={addHeightLog}
            >
              <Text style={styles.btnSecondaryText}>{savingHeight ? 'Zapisuję...' : 'Zapisz pomiar wzrostu'}</Text>
            </TouchableOpacity>

            {/* Historia pomiarów. Pięć ostatnich — tyle wystarczy, żeby
                zawodnik zobaczył, czy ma już dwa oddalone pomiary, a lista nie
                rozpycha etapu 0 kreatora. */}
            {heightRows.length > 0 && (
              <View style={{ marginTop: 12 }}>
                {heightRows.slice(0, 5).map((h) => (
                  <Text key={`${h.measured_at}-${h.height_cm}`} style={styles.hint}>
                    {h.height_cm} cm · {formatDatePl(h.measured_at)}
                  </Text>
                ))}
                {heightRows.length > 5 && (
                  <Text style={styles.hint}>…i jeszcze {heightRows.length - 5}</Text>
                )}
              </View>
            )}
          </View>

          {/* PLAN-D-L2 15.08.2026 — blok „Raport dla rodzica" WYSZEDŁ STĄD poza
              numerację etapów (stoi pod nawigacją etapów, razem z Planem lekcji
              i Bezpieczeństwem). Powód policzalny, nie estetyczny: zawodnik
              z wypełnionym profilem ląduje na etapie 5 z 5, więc rzecz w Etapie 0
              kosztowała SZEŚĆ dotknięć (Ja → Profil → cztery razy „Wstecz").
              Poza etapami kosztuje DWA. Zasada podania P0. */}

          {/* Kod drużyny — 05.08.2026, patrz komentarz na górze pliku. Ten sam
              wzorzec formularza co Raport dla rodzica. */}
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
          {/* PLAN-D-A 08.2026 — TO jest CEL w słowniku trzech poziomów:
              kierunek na lata, jeden. Przymiotnik „kierunkowy" był potrzebny
              tylko po to, żeby odróżnić go od `goals` — a te nazywają się
              teraz wąskimi gardłami. */}
          <Text style={styles.blockLabel}>Twój Cel</Text>
          <Text style={styles.hint}>
            To kierunek na lata, nie konkretne zadanie — przy wskazywaniu Twojego
            pierwszego wąskiego gardła przypomnimy Ci o nim, żebyś mógł wybrać
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

      {/*
        PLAN-D-L2 08.2026 (15.08.2026) — RAPORT DLA RODZICA.

        ŚWIADOMIE POZA NUMERACJĄ ETAPÓW, tym samym wzorcem i z tego samego,
        policzalnego powodu co Plan lekcji niżej: `loadProfile` ustawia etap
        startowy na PIERWSZYM NIEWYPEŁNIONYM, więc zawodnik z gotowym profilem
        ląduje na etapie 5 z 5. W Etapie 0 ten blok kosztował SZEŚĆ dotknięć od
        otwarcia appki (Ja → Profil → cztery razy „Wstecz"). Tu kosztuje DWA.

        ⚠️ CZTERY STANY, NIE DWA (reguła R5). Rozróżnienie robi
        `czytajSubskrypcje` w `lib/raportRodzica.ts`, nie ten plik.
        ⛔ „Nie udało się sprawdzić" NIGDY nie renderuje się jako „nikt nie
           dostaje" — to jest jedyny powód, dla którego ten ekran istnieje.
      */}
      <View style={[styles.block, { marginTop: spacing.lg }]}>
        <Text style={styles.blockLabel}>Raport dla rodzica</Text>

        {/* Brzmienie z Pakietu 9 (03.08.2026) — NIETKNIĘTE. */}
        <Text style={styles.hint}>
          Podaj e-mail rodzica lub opiekuna, żeby cyklicznie dostawał krótkie
          podsumowanie Twojego rozwoju — bez logowania, bez dostępu do Twojego
          dziennika czy samopoczucia.
        </Text>

        {/* Zdanie o stanie — jedno z czterech, nigdy sklejone. */}
        <Text style={styles.hint}>{opisStanuRaportu(stanRaportu).zdanie.tekst}</Text>

        {stanRaportu?.rodzaj === 'jest' && stanRaportu.aktywne.map((s) => (
          <View key={s.id} style={styles.historyCard}>
            <Text style={styles.historyType}>{s.email}</Text>
            <Text style={styles.historyDetail}>{opisOstatniejWysylki(s.ostatniaWysylka).tekst}</Text>
            <TouchableOpacity
              style={[styles.btnSecondary, wylaczanyId === s.id && styles.btnDisabled]}
              disabled={wylaczanyId !== null}
              onPress={() => wylaczRaport(s.id)}
            >
              <Text style={styles.btnSecondaryText}>
                {wylaczanyId === s.id ? 'Wyłączam...' : ETYKIETA_WYLACZ}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

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

      {/*
        PLAN-D-A2A3 08.2026 (14.08.2026) — PLAN LEKCJI.

        ŚWIADOMIE POZA NUMERACJĄ ETAPÓW, tym samym wzorcem co „Bezpieczeństwo"
        i karta dostępu — i ma to jeden, policzalny powód. `loadProfile` ustawia
        etap startowy na PIERWSZYM NIEWYPEŁNIONYM, więc zawodnik z gotowym
        profilem ląduje na etapie 5 z 5. Gdyby plan lekcji siedział w etapie 0,
        trzeba by go było szukać CZTEREMA kliknięciami „Wstecz" — razem sześć
        dotknięć od otwarcia appki. Poza etapami są dwa (Ja → Profil).
        Zasada podania P0: rzecz ważna nie może wymagać szukania.

        ⛔ TU NIE MA WIDOKU TYGODNIA ANI PASKA ZAJĘTOŚCI — to jest pas C1.
        Tu jest wyłącznie źródło danych, z których tamten pasek powstanie.
      */}
      <View style={[styles.block, { marginTop: spacing.lg }]}>
        <Text style={styles.blockLabel}>Plan lekcji</Text>

        {stanPlanuLekcji === null ? (
          <Text style={styles.hint}>Wczytuję Twój plan lekcji…</Text>
        ) : !stanPlanuLekcji.odczytany ? (
          /* ⚠️ TRZECI STAN, NIE DRUGI. „Nie udało się odczytać" to nie to samo
             co „nie podałeś planu" — i formularz jest tu WYŁĄCZONY, bo zapis
             z pustych pól skasowałby plan, którego właśnie nie widzimy. */
          <Text style={styles.hint}>
            Nie udało się teraz odczytać Twojego planu lekcji. Nie zmieniamy go, dopóki
            go nie zobaczymy — spróbuj wejść tu jeszcze raz za chwilę.
          </Text>
        ) : (
          <>
            {/* Brzmienie WPROST Z MAKIETY (pustka „brak konfiguracji"). */}
            <Text style={styles.hint}>
              {Object.values(stanPlanuLekcji.dni).every((d) => d.stan === 'NIE_WIEM')
                ? `${PLAN_LEKCJI_PUSTKA} Podaj godziny, w których jesteś w szkole — resztę policzymy sami.`
                : 'Godziny szkoły. Dzień bez godzin znaczy, że tego dnia nie masz szkoły.'}
            </Text>

            {planLekcjiZOkienkami ? (
              /* ⚠️ Plan z przerwą w środku dnia jest w bazie POPRAWNY, a to pole
                 ma jedno „od–do" na dzień. Zapis stąd skasowałby drugie okno
                 po cichu — więc formularz się nie włącza i mówi o tym wprost.
                 ⚠️ BRZMIENIE DO PRZEJRZENIA PRZEZ KUBĘ. */
              <Text style={styles.hint}>
                Twój plan ma dzień z przerwą w środku (dwa okna zajęć). Tego pola nie
                otwieramy, żeby zapis nie skasował drugiego okna — napisz do nas, a poprawimy to ręcznie.
              </Text>
            ) : (
              <>
                {DNI_TYGODNIA.map(([weekday, nazwa]) => {
                  const wiersz = planLekcji.find((r) => r.weekday === weekday)
                    ?? { weekday, od: '', do_: '' };
                  const ustaw = (pole: 'od' | 'do_', v: string) =>
                    setPlanLekcji((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, [pole]: v } : r)));
                  return (
                    <View key={weekday} style={styles.planDzien}>
                      <Text style={styles.planDzienNazwa}>{nazwa}</Text>
                      <TextInput
                        style={[styles.input, styles.planGodzina]}
                        placeholderTextColor={colors.textSecondary}
                        value={wiersz.od}
                        onChangeText={(v) => ustaw('od', v)}
                        placeholder="8:00"
                        autoCapitalize="none"
                      />
                      <Text style={styles.planMysl}>–</Text>
                      <TextInput
                        style={[styles.input, styles.planGodzina]}
                        placeholderTextColor={colors.textSecondary}
                        value={wiersz.do_}
                        onChangeText={(v) => ustaw('do_', v)}
                        placeholder="15:30"
                        autoCapitalize="none"
                      />
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={[styles.btnSecondary, savingPlanLekcji && styles.btnDisabled]}
                  disabled={savingPlanLekcji}
                  onPress={zapiszPlanLekcji}
                >
                  <Text style={styles.btnSecondaryText}>
                    {savingPlanLekcji ? 'Zapisuję...' : 'Zapisz plan lekcji'}
                  </Text>
                </TouchableOpacity>

                {/* Plan lekcji zmienia się co semestr i baza trzyma HISTORIĘ:
                    nowy zapis obowiązuje od dziś, a tygodnie sprzed zmiany
                    zostają narysowane starymi godzinami. */}
                <Text style={styles.hint}>
                  Zapisany plan obowiązuje od dziś. Tygodnie sprzed zmiany zostają
                  z godzinami, które wtedy miałeś.
                </Text>
              </>
            )}
          </>
        )}
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
  blockLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: spacing.md }, // W1: ink3
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: spacing.md }, // W1: ink3
  label: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6, marginTop: 4 }, // W1: ink3
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
  stepLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 8 }, // W1: ink3
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.brand, width: 18 },
  // PLAN-D-A2A3 08.2026 — wiersz jednego dnia planu lekcji.
  planDzien: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  planDzienNazwa: { ...typography.body, fontSize: 13, color: colors.textPrimary, width: 104 },
  planGodzina: { flex: 1, marginBottom: 0, textAlign: 'center' },
  planMysl: { ...typography.body, fontSize: 13, color: colors.textSecondary },
  stepNav: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  stepNavBack: { flex: 1, marginTop: 0 },
  stepNavNext: { flex: 1 },
});
