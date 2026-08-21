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
import {
  fetchPlayerMatchSelectionContext,
  // ⭐ PLAN-D-M3 21.08.2026 — odczyt „które segmenty ten mecz już ma" stoi
  // w WARSTWIE I/O, a nie tutaj: `lib/matchCascade.selftest.ts` (I2-0)
  // pilnuje, że ten ekran nie czyta wejść kaskady własnym zapytaniem, i ma
  // rację. ⛔ Strażnik nie jest osłabiony — odczyt stanął tam, gdzie chce.
  segmentyJuzZapisaneDlaMeczu,
} from '../../lib/matchSegmentSelection';
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
// ═══════════════════════════════════════════════════════════════════
// ⭐⭐ PLAN-D-M2 19.08.2026 — EKRAN MECZU CHUDNIE DO MAKIETY
//
// CO BYŁO ZŁE — ZMIERZONE, NIE PRZYPUSZCZONE. `zmierzEkran` (miara
// `lib/wysokoscEkranu.ts`) oddawał dla tego ekranu **5 863 dp** przy linii
// zgięcia **808 dp** — siedem ekranów w pionie. Pas A1 zdjął temu ekranowi
// zakładkę, więc wejście prowadzi dziś z arkusza „powiedz więcej o tym
// meczu": rzecz została PRZENIESIONA ZA DOTKNIĘCIE, a nie WCHŁONIĘTA.
// Decyzja Kuby z 18.08 (punkt 3) brzmi: „ścieżka meczu chudnie do makiety".
//
// ⭐ CZYM TO ZOSTAŁO ZAŁATWIONE. Tym samym wzorcem, którym pas A1 zdjął
// 5 862 dp z ekranu „Dziś": `components/Arkusz.tsx` jest `Modal`-em, czyli
// osobnym drzewem NAD ekranem, więc jego treść NIE WCHODZI do przewijania
// ekranu pod spodem i kosztuje **0 dp**. ⛔ To jest przeniesienie, nie
// kasowanie: ani jedno pytanie nie znika, każde ma imienne miejsce, a tabela
// „co gdzie wylądowało" stoi w `claude/PRZEKAZANIE_PAS_M2_19_08_2026.md`.
//
// ⛔ KOLEJNOŚĆ, KTÓRA NIE PODLEGA NEGOCJACJI (§4.3 polecenia): najpierw
// wejście zastępcze, potem zdjęcie rzeczy z ekranu. W tym pliku obie rzeczy
// stoją w JEDNYM stanie — `arkusz` — i pole bez wejścia nie ma jak się
// narysować, bo `trescArkusza()` rysuje WYŁĄCZNIE to, co ma otwarty rodzaj.
// ═══════════════════════════════════════════════════════════════════
import Arkusz from '../../components/Arkusz';
import { naglowekArkusza, type NaglowekArkusza } from '../../lib/arkusz';
// ⭐ PLAN-D-D8 → M2: reguła sprzeczności minut i podpis arkusza meczu mają
// DOKŁADNIE JEDNO miejsce — `lib/meczWiecej.ts` (pas D2). Ten ekran ich
// UŻYWA. ⛔ Drugie brzmienie tej samej reguły byłoby drugim słownikiem (O92).
// ═══════════════════════════════════════════════════════════════════
// ⭐⭐ PLAN-D-M3 21.08.2026 — PEŁNA KARTA MECZU PRZESTAJE MIEĆ WŁASNĄ DROGĘ
// ZAPISU I ZACZYNA WIĄZAĆ WYDARZENIE.
//
// ⛔⛔ CO BYŁO ZEPSUTE — ZMIERZONE, NIE PRZYPUSZCZONE. `grep` na
// `zdecydujOZapisieMeczu` i na `calendar_event_id` w tym pliku dawał 21.08
// ZERO TRAFIEŃ. Ten ekran budował `body` własną ręką i robił `insert` do
// `match_contexts` z pominięciem jedynej reguły zapisu meczu — a wiersz
// zakładał ZAWSZE NIEZWIĄZANY.
//
// SKUTEK DLA ZAWODNIKA: zagrał mecz, wypełnił PEŁNĄ kartę — i licznik pracy
// liczył ten mecz DWA RAZY (raz jako wydarzenie w kalendarzu, raz jako wiersz
// `match_contexts`), czyli **7 punktów zamiast 4**. Pas D2 zamknął to na
// ścieżce z kafla; ta ścieżka o tamtej naprawie nie wiedziała.
//
// ⭐ CO SIĘ ZMIENIŁO. Zapis idzie przez `zdecydujOZapisieMeczu` — JEDNO
// źródło decyzji o zapisie meczu dla obu ekranów — z `idWydarzenia`
// i `wydarzeniaZawodnika`, więc działa bramka właściciela z D2 §2.1.
// ⛔ Wystąpienie ustalamy PRZED zapisem meczu, ale jego porażka NIE JEST
// awarią zapisu: wiersz idzie wtedy z `calendar_event_id = null` i liczy się
// normalnie. ⛔ Nikomu nie odbieramy punktów.
// ═══════════════════════════════════════════════════════════════════
import {
  minutyPonadDlugosc,
  MECZ_MINUTY_PONAD_DLUGOSC,
  podpisArkuszaMeczu,
  zdecydujOZapisieMeczu,
  opisZapisuMeczuDoLogu,
  toJestDrugiWierszNaMecz,
  MECZ_JUZ_MA_WIERSZ,
  RODZAJE_MECZU,
  napisRodzajuMeczu,
  napisRodzajuZapisanegoMeczu,
  POLE_RODZAJ_MECZU,
  type OcenaMeczu,
  type WiecejOMeczu,
  type StanKontekstuMeczu,
} from '../../lib/meczWiecej';
// ⭐ PLAN-D-M3 — ten sam sposób odnajdywania własnego wiersza po restarcie,
// którego używa „Dziś" (pas D2). ⛔ Bez niego druga ocena tego samego meczu
// zakłada DRUGI wiersz, a licznik pracy liczy go drugi raz.
import { mapaWierszyMeczuPoWydarzeniu } from '../../lib/wejsciaWgladow';
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
  /**
   * ⭐⭐ PLAN-D-M3 21.08.2026 — WIĄZANIE Z WYSTĄPIENIEM, odczytane z bazy.
   * ⛔ To jest jedyna droga, którą ten ekran ODNAJDUJE swój wiersz po
   * restarcie aplikacji. Pole zapisane i nieodczytane wygląda dokładnie tak
   * samo jak pole, którego nie ma.
   */
  calendar_event_id: number | null;
};

// Jeden "slot" pytania segmentowego wyświetlanego na ekranie.
type SegmentSlot = SegmentSelection & {
  wordingKey: string | null;
  baseAnswerCode: string | null;
  followupAnswerCode: string | null;
};

// ═══════════════════════════════════════════════════════════════════
// ⭐ M2 — CZTERY ARKUSZE TEGO EKRANU I ICH NAGŁÓWKI
// ═══════════════════════════════════════════════════════════════════
// ⛔ ZERO NOWYCH SŁÓW WIDOCZNYCH DLA ZAWODNIKA. Tytuł każdego arkusza to
// DOKŁADNIE ten sam napis, który stał nad tą sekcją, kiedy leżała na ekranie
// („Stan przed meczem", „Boli Cię dziś coś?", „Historia meczów", „Tryb
// kontuzji — co jest teraz dostępne"). Jedyny arkusz z tytułem spoza tego
// pliku — `meczWiecej` — bierze go z `lib/arkusz.ts`, gdzie stoi od pasa A1.
//
// ⚠️ `RODZAJE_ARKUSZA` w `lib/arkusz.ts` jest listą ZAMKNIĘTĄ i pilnuje jej
// strażnik, który wymaga wejścia Z EKRANU „DZIŚ" dla każdej pozycji. ⛔ Tego
// ekranu tam nie ma, więc dopisanie tu czterech nowych rodzajów zapaliłoby
// CUDZĄ zapadkę. Dlatego rodzaje arkuszy MECZU żyją tutaj, a wspólny jest
// KOMPONENT i wspólna jest reguła („nakładka nie zabiera z ekranu").
type RodzajArkuszaMeczu = 'stan' | 'wiecej' | 'bol' | 'historia' | 'kontuzja';

function naglowekArkuszaMeczu(rodzaj: RodzajArkuszaMeczu, tytulMeczu: string): NaglowekArkusza {
  switch (rodzaj) {
    case 'stan':
      return {
        kicker: 'Mecz',
        tytul: 'Stan przed meczem',
        // ⛔ Zdanie przeniesione CO DO ZNAKU z ekranu — do 19.08 stało tam
        // jako `styles.hint` pod pustą listą pytań segmentowych.
        podpis: 'Pytania o dzisiejszy mecz pojawią się po zaznaczeniu stanu regeneracji powyżej.',
      };
    case 'wiecej':
      // ⭐ Tytuł i kicker z `lib/arkusz.ts` (pas A1), podpis z `lib/meczWiecej.ts`
      // (pas D8). ⛔ Ani jedno słowo nie powstaje w tym pliku.
      // ⭐⭐ PLAN-D-M3 21.08.2026 — PODPIS WIE, GDZIE STOI.
      // ⛔ Do 21.08 kończył się tu zdaniem „Kolejne N zapisujesz w pełnej
      // karcie meczu" — czyli odsyłał zawodnika tam, gdzie już jest.
      // ⛔ Wariant nie powstaje w tym pliku: rozstrzyga go `lib/meczWiecej.ts`,
      // a liczby wylicza z `RZECZY_O_MECZU`.
      return { ...naglowekArkusza('meczWiecej', tytulMeczu), podpis: podpisArkuszaMeczu('pelna_karta') };
    case 'bol':
      return { kicker: 'Mecz', tytul: 'Boli Cię dziś coś?', podpis: '' };
    case 'historia':
      return { kicker: 'Mecz', tytul: 'Historia meczów', podpis: '' };
    case 'kontuzja':
      return { kicker: 'Mecz', tytul: 'Tryb kontuzji — co jest teraz dostępne', podpis: '' };
  }
}

export default function MeczScreen() {
  const { currentUser } = useAuth();

  // Pola już istniejące
  /**
   * ⭐⭐ PLAN-D-M3 21.08.2026 (Z6) — ⛔ ANI JEDNA WARTOŚĆ NIE JEST ZAZNACZONA
   * Z GÓRY. Do 21.08 ten stan startował z `'official_match'`, więc zawodnik,
   * który zagrał sparing i nie ruszył Pickera, zapisywał „Mecz oficjalny"
   * i NIKT GO O TO NIE ZAPYTAŁ. Uchwyt, który gdzieś stoi, jest podpowiedzią.
   * ⛔ `null` = nie wskazał. To NIE JEST `official_match` (R5) — przy zapisie
   * podstawia się `RODZAJ_MECZU_Z_KAFLA`, ale te dwa stany są trzymane osobno.
   */
  const [gameType, setGameType] = useState<string | null>(null);
  const [ownScore, setOwnScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [role, setRole] = useState('');
  const [minutes, setMinutes] = useState('');
  /**
   * ⭐ PLAN-D-W2 17.08.2026 — DŁUGOŚĆ CAŁEGO MECZU, nie minuty zawodnika.
   * ⛔ To jest MIANOWNIK wagi meczu. Bez niego produkt zakłada 90 minut,
   * a zawodnik U13 grający pełne 60 dostaje 3 punkty zamiast 4 — czyli karę
   * za to, że jego mecz jest krótszy. Pusto = nie wiemy, i to jest dozwolone.
   */
  const [dlugoscMeczu, setDlugoscMeczu] = useState('');
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

  // ⭐ M2 — KTÓRY ARKUSZ JEST OTWARTY. `null` = ekran, nic nad nim.
  const [arkusz, setArkusz] = useState<RodzajArkuszaMeczu | null>(null);

  /**
   * ⭐⭐ PLAN-D-M3 21.08.2026 — DWA ŹRÓDŁA WIEDZY O TYM, CZY TEN MECZ JUŻ MA
   * WIERSZ. Ta sama para, którą ma „Dziś" (pas D2 §4.3):
   *   1. `idWierszaMeczuWWizycie` — wiersz założony W TEJ WIZYCIE.
   *   2. `wierszeMeczuPoWydarzeniu` — wiersz założony KIEDYKOLWIEK, odczytany
   *      z bazy po `calendar_event_id`.
   * ⛔ Bez drugiego źródła po restarcie aplikacji ten sam mecz zakładałby
   * DRUGI wiersz — czyli podwójne liczenie wracałoby tylnymi drzwiami.
   */
  const [idWierszaMeczuWWizycie, setIdWierszaMeczuWWizycie] = useState<number | null>(null);
  const [wierszeMeczuPoWydarzeniu, setWierszeMeczuPoWydarzeniu] =
    useState<Map<number, number>>(new Map());

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
    const wiersze = (rows ?? []) as MatchRow[];
    setHistory(wiersze);
    // ⭐⭐ PLAN-D-M3 — MAPA `calendar_events.id` → `match_contexts.id`.
    // ⛔ NIEUDANY ODCZYT NIE CZYŚCI TEJ MAPY (`return` wyżej): wyczyszczenie
    // znaczyłoby „ten mecz nie ma wiersza", czyli zaproszenie do założenia
    // drugiego (Z0, wzorzec pasa D2).
    setWierszeMeczuPoWydarzeniu(mapaWierszyMeczuPoWydarzeniu(
      wiersze.map((r) => ({
        id: r.id, created_at: r.created_at, match_rpe: r.match_rpe,
        entered_recovery_state: null, minutes_played: r.minutes_played,
        match_length_minutes: null, calendar_event_id: r.calendar_event_id,
      })),
    ));
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

  // ⭐⭐ PLAN-D-M2 19.08.2026 — SPRZECZNOŚĆ DWÓCH LICZB, ZATRZYMANA NA EKRANIE.
  // ⛔ Rachunek jest CUDZY i taki ma zostać: `minutyPonadDlugosc` z
  // `lib/meczWiecej.ts` ma selftest i baterię mutacji w pasie D2. Ten ekran go
  // WYKONUJE. ⛔ Sprzeczność jest możliwa TYLKO przy dwóch znanych liczbach —
  // brak jednej z nich to „nie wiemy", a „nie wiemy" nie jest błędem zawodnika.
  const sprzecznoscMinut = minutyPonadDlugosc({
    minutyNaBoisku: minutes.trim() === '' ? null : Number(minutes),
    dlugoscMeczu: dlugoscMeczu.trim() === '' ? null : Number(dlugoscMeczu),
    rpe: matchRpe === undefined ? null : matchRpe,
  });

  const resetForm = () => {
    // ⛔ PLAN-D-M3 — rodzaj wraca do „nie wskazał", a nie do `official_match`.
    // ⚠️ `idWierszaMeczuWWizycie` NIE JEST tu czyszczone i to jest zamierzone:
    // to on sprawia, że kolejne dotknięcie „Zapisz mecz" DOKŁADA do wiersza,
    // zamiast zakładać drugi.
    setGameType(null);
    setOwnScore(''); setOpponentScore(''); setRole(''); setMinutes(''); setDlugoscMeczu(''); setMatchRpe(undefined);
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
   * ⭐⭐ PLAN-D-M3 21.08.2026 — PRZEPISANE: ta funkcja ODDAJE TERAZ WYSTĄPIENIE.
   *
   * ⛔ DLACZEGO ODDAJE, A NIE TYLKO ZAPISUJE. Wiersz `match_contexts` musi
   * nieść `calendar_event_id` (pas D2 §4.1), bo inaczej licznik pracy nie ma
   * czym zestawić meczu z wydarzeniem i LICZY OBA. Identyfikator wystąpienia
   * powstaje właśnie tutaj — albo jest odnaleziony wśród istniejących, albo
   * wraca z `insert`-a. Zostawienie go w tej funkcji znaczyłoby, że pełna
   * karta meczu nadal zakłada wiersze niezwiązane.
   *
   * ⭐ ODDAJE TAKŻE LISTĘ WYSTĄPIEŃ ZAWODNIKA. `ustalWiazanieMeczu` sprawdza
   * WŁAŚCICIELA wystąpienia — klucz obcy tego nie pilnuje (D2 §3). Lista jest
   * zbudowana z odczytu filtrowanego po `user_id`, więc niesie wyłącznie jego
   * wystąpienia. ⛔ `null` znaczy „nie odczytałem" i NIE JEST pustym zbiorem
   * (R5): przy nieznanej liście nie wiążemy niczego.
   *
   * ⚠️ ŚWIADOMIE NIE RZUCA. Porażka kalendarza nie ma prawa cofnąć ani
   * zablokować zapisu meczu — wtedy `idWydarzenia` jest `null`, wiersz idzie
   * niezwiązany i ⛔ liczy się NORMALNIE. Nikomu nie odbieramy punktów.
   *
   * ⚠️ `scheduled_date` to DZIŚ, i to jest granica, którą trzeba znać.
   * `match_contexts` nie ma pola „kiedy był mecz" — ma `created_at`, czyli
   * kiedy zawodnik go zapisał, i to tę datę ekran pokazuje w historii meczów
   * (`renderMatchCard` niżej). Zawodnik, który opisuje mecz trzy dni po fakcie,
   * dostanie kafel w złym dniu — to jest znalezisko poprzedniej rundy, a NIE
   * rzecz, którą wolno tu zgadywać.
   */
  type WystapienieMeczu = {
    /** `calendar_events.id` albo `null`, gdy nie udało się go ustalić. */
    idWydarzenia: number | null;
    /** ⛔ `null` = odczyt nie doszedł do skutku. To NIE jest pusty zbiór (R5). */
    wydarzeniaZawodnika: ReadonlySet<number> | null;
    /** Powód porażki do logu, albo `null`. */
    blad: string | null;
  };

  async function ustalWystapienieMeczu(godzina: string | null): Promise<WystapienieMeczu> {
    const nic: WystapienieMeczu = { idWydarzenia: null, wydarzeniaZawodnika: null, blad: null };
    if (!currentUser) return { ...nic, blad: 'brak zalogowanego zawodnika' };
    const data = toLocalDateStr(new Date());
    // ⭐ PLAN-D-M3 — tytuł kafla NIE MOŻE twierdzić „Mecz oficjalny", kiedy
    // zawodnik rodzaju nie wskazał (Z0). `napisRodzajuMeczu(null)` oddaje
    // neutralne „Mecz" — ten sam napis, który stał tu wcześniej jako `|| 'Mecz'`.
    const tytul = napisRodzajuMeczu(gameType);

    // Krok 1 — CZY TEN MECZ JUŻ JEST W KALENDARZU. Bez tego odczytu nie da się
    // odróżnić „zaplanowałem i opisuję" od „opisuję bez planu", a to jest cała
    // różnica między jednym torem a dwoma.
    const { data: istniejaceSurowe, error: odczytErr } = await supabase
      .from('calendar_events')
      .select('id,event_type,status,scheduled_date,scheduled_time,planned_minutes')
      .eq('user_id', currentUser.id)
      .eq('event_type', RODZAJ_MECZ)
      .eq('scheduled_date', data);
    if (odczytErr) {
      // ⛔ NIE wstawiamy „w ciemno" po nieudanym odczycie. Wstawienie bez
      // wiedzy o tym, co już jest, jest dokładnie tym drugim torem, którego
      // ta runda zakazuje — a duplikat w kalendarzu jest gorszy niż jego brak,
      // bo wygląda na prawdziwy.
      return { ...nic, blad: `odczyt istniejących wierszy: ${odczytErr.message}` };
    }

    const istniejace = (istniejaceSurowe ?? []) as WierszKalendarzaDoDecyzji[];
    // ⭐ ODCZYT SIĘ UDAŁ — od tej chwili lista JEST znana, także gdy jest pusta.
    const moje = new Set<number>(
      istniejace.map((w) => Number(w.id)).filter((n) => Number.isFinite(n)),
    );

    const decyzja = zdecydujOWierszuMeczu({
      userId: currentUser.id,
      data,
      godzina,
      tytul,
      // ⭐ PLAN-D-W2 — pusto zostaje pustem: nie podstawiamy tu 90 minut,
      // bo zmyślona długość weszłaby do wagi pracy jako pomiar (Z0).
      dlugoscMeczu: dlugoscMeczu.trim() === '' ? null : Number(dlugoscMeczu),
      istniejace,
    });
    console.log(`[PLAN-D-A7] mecz → kalendarz: ${decyzja.powod}`);

    if (decyzja.rodzaj === 'aktualizuj') {
      const { data: zmienione, error: updErr } = await supabase
        .from('calendar_events')
        .update(decyzja.zmiany)
        .eq('id', decyzja.id)
        .select('id');
      if (updErr) {
        return { idWydarzenia: null, wydarzeniaZawodnika: moje, blad: `aktualizacja id=${decyzja.id}: ${updErr.message}` };
      }
      // ⚠️ PostgREST przy odmowie RLS na UPDATE nie zwraca błędu — zwraca ZERO
      // zmienionych wierszy. Bez tego sprawdzenia „nie mam uprawnień" byłoby
      // nieodróżnialne od „zapisano" (ten sam wzorzec, który pas A1 opisał
      // w `lib/focusBlockJournalLink.ts`).
      if (!zmienione || zmienione.length === 0) {
        return {
          idWydarzenia: null, wydarzeniaZawodnika: moje,
          blad: `aktualizacja id=${decyzja.id} nie zmieniła ANI JEDNEGO wiersza (najczęściej RLS: calendar_events_update_own)`,
        };
      }
      // ⭐ Wystąpienie JEST na liście zawodnika — wzięło się z niej.
      return { idWydarzenia: decyzja.id, wydarzeniaZawodnika: moje, blad: null };
    }

    const { data: wstawione, error: insErr } = await supabase
      .from('calendar_events').insert(decyzja.wiersz).select('id');
    if (insErr) {
      return { idWydarzenia: null, wydarzeniaZawodnika: moje, blad: `zapis nowego wiersza: ${insErr.message}` };
    }
    const noweId = Array.isArray(wstawione) && wstawione.length > 0 ? Number(wstawione[0].id) : NaN;
    if (!Number.isFinite(noweId)) {
      return {
        idWydarzenia: null, wydarzeniaZawodnika: moje,
        blad: 'zapis nowego wiersza kalendarza dotknął ZERO wierszy (najczęściej RLS)',
      };
    }
    // ⛔ NOWE WYSTĄPIENIE DOPISUJEMY DO LISTY, bo bramka właściciela sprawdza
    // przynależność WŁAŚNIE PO NIEJ. Bez tego wiersz, który sami przed chwilą
    // założyliśmy dla tego zawodnika, zostałby odrzucony jako „spoza ekranu".
    const zNowym = new Set<number>(moje);
    zNowym.add(noweId);
    return { idWydarzenia: noweId, wydarzeniaZawodnika: zNowym, blad: null };
  }

  /** ⛔ Ten sam powód, co wyżej — dla `pain_entries`. `null` = nie wiem. */
  async function maJuzWpisBolowy(matchContextId: number): Promise<boolean | null> {
    const { data, error: err } = await supabase
      .from('pain_entries')
      .select('id')
      .eq('match_context_id', matchContextId)
      .limit(1);
    if (err) {
      console.warn(opisBleduOdczytuDoLogu('mecz.maJuzWpisBolowy → pain_entries', err));
      return null;
    }
    return (data ?? []).length > 0;
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
    // ⭐⭐ PLAN-D-M2 19.08.2026 — ZNALEZISKO PASA D8, DOMKNIĘTE (§3 polecenia).
    // ⛔ `match_contexts` ma CHECK `minutes_played <= match_length_minutes`.
    // Bez tej bramki zawodnik, który wyklika 90 minut w meczu 60-minutowym,
    // dostaje kod `23514` z bazy zamiast zdania po polsku — a kod bazy nie mówi
    // mu, KTÓRĄ z dwóch liczb ma poprawić.
    // ⛔ ZDANIE NIE POWSTAJE TUTAJ: stoi w `lib/meczWiecej.ts` jako
    // `MECZ_MINUTY_PONAD_DLUGOSC`, a decyduje `minutyPonadDlugosc` — ten sam
    // rachunek, którym idzie ścieżka oceny z kafla (pas D2).
    if (sprzecznoscMinut) { setError(MECZ_MINUTY_PONAD_DLUGOSC); return; }
    // PLAN-D-A7 — godzina rozstrzyga się PRZED jakimkolwiek zapisem. Gdyby ta
    // bramka stała niżej, mecz byłby już w bazie, a zawodnik dostałby błąd
    // o godzinie — czyli komunikat porażki po udanym zapisie.
    const wynikGodziny = przygotujGodzineDoZapisu(godzinaMeczu);
    if (!wynikGodziny.zapisz) { setError(wynikGodziny.powod); return; }

    setSaving(true);
    try {
      // ═══════════════════════════════════════════════════════════════
      // ⭐⭐ PLAN-D-M3 21.08.2026 — KROK 1: WYSTĄPIENIE. ZMIENIONA KOLEJNOŚĆ.
      // ⛔ Do 21.08 kalendarz był domykany PO zapisie meczu, więc wiersz
      // `match_contexts` nie miał czym się z wydarzeniem związać i licznik
      // pracy liczył oba. ⚠️ Gwarancja z pasa A7 ZOSTAJE nienaruszona:
      // porażka kalendarza nie blokuje zapisu meczu — daje `idWydarzenia`
      // równe `null`, wiersz idzie niezwiązany i liczy się normalnie.
      // ═══════════════════════════════════════════════════════════════
      const wystapienie = await ustalWystapienieMeczu(wynikGodziny.wartosc);
      if (wystapienie.blad) {
        console.error(opisNieudanegoZapisuMeczuDoLogu(
          wystapienie.blad.startsWith('odczyt') ? 'odczyt'
            : wystapienie.blad.startsWith('aktualizacja') ? 'aktualizuj' : 'utworz',
          wystapienie.blad,
        ));
      }

      // ⭐⭐ KROK 2: CZY TEN MECZ JUŻ MA WIERSZ. Dwa źródła, w tej kolejności —
      // wizyta, potem baza. ⛔ Drugie źródło jest całą różnicą po restarcie.
      const idZBazy = wystapienie.idWydarzenia === null
        ? undefined
        : wierszeMeczuPoWydarzeniu.get(wystapienie.idWydarzenia);
      const idWiersza = idWierszaMeczuWWizycie ?? idZBazy ?? null;
      const stan: StanKontekstuMeczu = idWiersza === null
        ? { rodzaj: 'brak' }
        : { rodzaj: 'zapisany', id: idWiersza };

      const ocena: OcenaMeczu = {
        minutyNaBoisku: minutes.trim() === '' ? null : Number(minutes),
        dlugoscMeczu: dlugoscMeczu.trim() === '' ? null : Number(dlugoscMeczu),
        rpe: matchRpe === undefined ? null : matchRpe,
      };
      const wiecej: WiecejOMeczu = {
        samoocena: selfRating === undefined ? null : selfRating,
        stanMentalny: mentalState === undefined ? null : mentalState,
        // ⚠️ `demandingConditions` jest na tym ekranie `boolean`-em (checkbox),
        // więc „nie zapytaliśmy" tu nie występuje — pole jest widoczne zawsze.
        wymagajaceWarunki: demandingConditions,
        pozycja: playedDifferentPosition ? (positionPlayedToday || null) : null,
        bramkiMy: ownScore !== '' ? Number(ownScore) : null,
        bramkiOni: opponentScore !== '' ? Number(opponentScore) : null,
        notatka: freeNote,
        // ⭐ M3 — trzy rzeczy, które do 21.08 szły własną drogą tego ekranu.
        rodzajMeczu: gameType,
        rola: role,
        stanCiala: enteredRecoveryState,
      };

      // ⭐⭐ KROK 3: DECYZJA. ⛔ JEDNO ŹRÓDŁO ROZSTRZYGNIĘCIA DLA OBU EKRANÓW —
      // ten ekran ją WYKONUJE, nie podejmuje.
      const decyzja = zdecydujOZapisieMeczu({
        idZawodnika: currentUser.id,
        stan,
        ocena,
        wiecej,
        idWydarzenia: wystapienie.idWydarzenia,
        wydarzeniaZawodnika: wystapienie.wydarzeniaZawodnika,
      });
      console.log(`mecz: [PLAN-D-M3] ${opisZapisuMeczuDoLogu(decyzja)}`);

      if (decyzja.rodzaj === 'nie_zapisuj') {
        // ⛔ ZDANIE ALBO CISZA — nigdy „coś poszło nie tak".
        if (decyzja.zdanie !== null) setError(decyzja.zdanie);
        return;
      }

      let matchContextId: number | null = null;
      let dolozonoDoIstniejacego = false;
      if (decyzja.rodzaj === 'aktualizuj') {
        const { data: zmienione, error: updErr } = await supabase
          .from('match_contexts')
          .update(decyzja.zmiany)
          .eq('id', decyzja.id)
          .select('id');
        if (updErr) throw updErr;
        // ⚠️ O61 — PostgREST przy odmowie RLS na UPDATE nie zwraca błędu, tylko
        // ZERO zmienionych wierszy. Bez tego „nie mam uprawnień" byłoby
        // nieodróżnialne od „zapisano".
        if (!zmienione || zmienione.length === 0) {
          throw new Error('Nie udało się zapisać meczu: baza nie zmieniła ani jednego wiersza.');
        }
        matchContextId = decyzja.id;
        dolozonoDoIstniejacego = true;
      } else {
        const { data: wstawione, error: insErr } = await supabase
          .from('match_contexts').insert(decyzja.wiersz).select('id');
        if (insErr) {
          // ⭐⭐ PLAN-D-D2 §4.3 → M3: UNIKALNY INDEKS CZĘŚCIOWY ZAMIENIA CICHY
          // DUPLIKAT W BŁĄD, a ekran zamienia ten błąd w ZDANIE.
          // ⛔ Zawodnikowi nie wolno pokazać `23505`. ⛔ To jest TO SAMO
          // brzmienie, co na „Dziś" — drugie byłoby drugim słownikiem (O92).
          if (toJestDrugiWierszNaMecz(insErr)) { setError(MECZ_JUZ_MA_WIERSZ); return; }
          throw insErr;
        }
        const nowe = Array.isArray(wstawione) && wstawione.length > 0 ? Number(wstawione[0].id) : NaN;
        if (!Number.isFinite(nowe)) {
          throw new Error('Nie udało się zapisać meczu: baza nie przyjęła tego wiersza.');
        }
        matchContextId = nowe;
      }
      // ⭐ OD TEJ CHWILI KOLEJNE ZAPISY DOKŁADAJĄ, ZAMIAST WSTAWIAĆ.
      setIdWierszaMeczuWWizycie(matchContextId);

      // ── BÓL ────────────────────────────────────────────────────────
      if (hasPain && matchContextId !== null) {
        // ⭐ M3 — przy DOKŁADANIU sprawdzamy, czy wpis bólowy już jest.
        // ⛔ Drugi wpis na ten sam mecz byłby drugim zgłoszeniem tego samego
        // bólu, a `pain_entries` nie ma na to unikatu.
        const juzBoli = dolozonoDoIstniejacego ? await maJuzWpisBolowy(matchContextId) : false;
        if (juzBoli === null) {
          throw new Error('Mecz zapisany, ale nie udało się sprawdzić, czy wpis bólowy już istnieje — '
            + 'nie dokładam go drugi raz. Spróbuj ponownie za chwilę.');
        }
        if (!juzBoli) {
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
      }

      // ── ODPOWIEDZI SEGMENTOWE ──────────────────────────────────────
      if (matchContextId !== null && segmentSlots.length > 0) {
        const juzSa = dolozonoDoIstniejacego
          ? await segmentyJuzZapisaneDlaMeczu(matchContextId)
          : new Set<string>();
        if (juzSa === null) {
          throw new Error('Mecz zapisany, ale nie udało się sprawdzić, które odpowiedzi już są — '
            + 'nie dokładam ich drugi raz. Spróbuj ponownie za chwilę.');
        }
        for (const slot of segmentSlots) {
          // Segment bez żadnej odpowiedzi (użytkownik pominął pytanie) —
          // nie zapisujemy pustego wiersza, poza regeneracją (patrz niżej).
          if (slot.segmentId !== 'regeneracja' && slot.baseAnswerCode === null) continue;
          // ⛔ M3 — segment, który ma już wiersz, NIE dostaje drugiego.
          if (juzSa.has(slot.segmentId)) continue;

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
          juzSa.add(slot.segmentId);
        }
      }

      // PLAN-D-A7 — porażka kalendarza NIE jest cicha i NIE jest awarią.
      // Mecz jest zapisany; zdanie mówi obie te rzeczy naraz i daje wyjście.
      setOk(wystapienie.blad ? MECZ_ZAPISANY_BEZ_KALENDARZA : 'Mecz zapisany.');
      // ⭐ M2 — po zapisie zamykamy nakładkę, żeby potwierdzenie („Mecz
      // zapisany.") stało tam, gdzie zawodnik patrzy: na ekranie, a nie pod
      // arkuszem, którego już nie ma po co trzymać otwartego.
      setArkusz(null);
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
    // ⭐⭐ PLAN-D-M3 21.08.2026 — ZNALEZISKO §3.2/4, NAPRAWIONE.
    // ⛔ CO BYŁO ZŁE. Historia meczów pisała „Mecz oficjalny" nad KAŻDYM
    // wierszem z `game_type = 'official_match'` — także nad tym, którego
    // rodzaju NIKT ZAWODNIKA NIE ZAPYTAŁ, bo produkt podstawił tę wartość sam
    // (kolumna jest `NOT NULL`). To jest podanie PRAWDOPODOBNEGO jako PEWNEGO
    // o cudzym meczu, czyli złamanie Z0 wprost.
    // ⛔ TYCH DWÓCH STANÓW NIE DA SIĘ W BAZIE ODRÓŻNIĆ — dlatego nad takim
    // wierszem stoi neutralne „Mecz". Trzy pozostałe rodzaje mogły wziąć się
    // WYŁĄCZNIE ze wskazania zawodnika, więc te wolno podać jako fakt.
    // ⛔ Rozstrzyga `napisRodzajuZapisanegoMeczu` z `lib/meczWiecej.ts` —
    // reguła ma jedno miejsce, a nie kopię w każdym ekranie.
    const typeLabel = napisRodzajuZapisanegoMeczu(row.game_type);
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

  // ═════════════════════════════════════════════════════════════════
  // ⭐ M2 — TREŚĆ ARKUSZA. Cztery gałęzie, każda z imiennym rodzajem.
  // ⛔ To jest CAŁE „gdzie to wylądowało": pole, którego nie ma tu ani
  // w ciele `ScrollView` niżej, nie istnieje w produkcie — i taką rzecz
  // zapala bateria mutacji w `lib/wysokoscEkranu.selftest.ts`.
  // ═════════════════════════════════════════════════════════════════
  function trescArkusza() {
    if (arkusz === 'kontuzja') return renderRoutingBlock();

    if (arkusz === 'stan') {
      return (
        <>
          {/* Regeneracja przed meczem — pytanie rdzenia kaskady.
              ⛔ STOI PIERWSZE I TO NIE JEST KOSMETYKA: dopóki zawodnik na nie
              nie odpowie, `matchCascade` uznaje segment `regeneracja` za
              niedostępny i pytania segmentowe nie mają się z czego policzyć. */}
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

          {/* Pytania segmentowe z kaskady */}
          {segmentSlots.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.sectionLabel}>Kilka pytań o dzisiejszy mecz</Text>
              {segmentSlots.map(renderSegmentSlot)}
              {!thirdQuestionOffered && (
                <TouchableOpacity style={styles.btnSecondary} onPress={loadThirdQuestion}>
                  <Text style={styles.btnSecondaryText}>Pokaż dodatkowe pytanie (opcjonalnie)</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      );
    }

    if (arkusz === 'bol') {
      /* Ból — reuse 1:1 wzorca z Dziennika. */
      return (
        <>
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
        </>
      );
    }

    if (arkusz === 'historia') {
      return (
        <>
          {/* ⭐ PLAN-D-C3 15.08.2026 — brzmienie „Brak zapisanych meczów — dodaj
              pierwszy powyżej." idzie CO DO ZNAKU (zakaz 4), razem z krokiem,
              który już w nim siedzi. ⚠️ M2 19.08: zmienia się MIEJSCE, nie
              zdanie — „powyżej" wskazuje dziś ekran pod tą nakładką. */}
          {pustkaHistorii ? (
            <>
              <Text style={styles.empty}>{pustkaHistorii.tekst}</Text>
              {pustkaHistorii.krokWTekscie ? null : (
                <Text style={styles.empty}>{pustkaHistorii.cta}</Text>
              )}
            </>
          ) : null}
          {history.map(renderMatchCard)}
        </>
      );
    }

    /* arkusz === 'wiecej' — sześć rzeczy z `RZECZY_O_MECZU`, plus rola
       i godzina rozpoczęcia, które do 19.08 stały w bloku „Zapisz mecz". */
    return (
      <>
        {/* ⭐ M2 — RODZAJ MECZU. `RZECZY_O_MECZU` (lib/meczWiecej.ts) stawia
            `game_type` w miejscu `pelna_karta` — czyli tutaj, w karcie meczu.
            ⛔ Zeszedł z pierwszego widoku razem z wynikiem, bo obie rzeczy
            mówią, JAKI to był mecz, a nie ILE zawodnik w nim przepracował. */}
        {/* ⭐⭐ PLAN-D-M3 21.08.2026 — RODZAJ MECZU. `RZECZY_O_MECZU` stawia
            `game_type` w miejscu `arkusz_wiecej` — czyli TA SAMA rzecz stoi
            też w arkuszu spod kafla na „Dziś", jedno dotknięcie od zawodnika.
            ⛔ ANI JEDNA WARTOŚĆ NIE JEST ZAZNACZONA Z GÓRY (Z6): pierwsza
            pozycja to „— wybierz —" i odpowiada wartości `null`, tak samo jak
            przy pozycji zagranej dziś. ⛔ Napisy biorą się z `RODZAJE_MECZU`,
            a nie z kopii w tym pliku — druga kopia rozjechałaby się z arkuszem
            na „Dziś" przy pierwszej zmianie (O92). */}
        <Text style={styles.label}>{POLE_RODZAJ_MECZU}</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={gameType ?? ''}
            onValueChange={(v) => setGameType(v === '' ? null : String(v))}
          >
            <Picker.Item label="— wybierz —" value="" />
            {RODZAJE_MECZU.map((r) => <Picker.Item key={r.wartosc} label={r.napis} value={r.wartosc} />)}
          </Picker>
        </View>

        {/* Wynik */}
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

        {/* Pozycja dziś */}
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

        {/* Warunki meczu */}
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setDemandingConditions((v) => !v)}>
          <Checkbox value={demandingConditions} onValueChange={setDemandingConditions} />
          <Text style={styles.checkboxLabel}>Warunki dziś były wymagające (upał, zimno, deszcz, ciężka murawa)</Text>
        </TouchableOpacity>

        {/* Samoocena i stan mentalny */}
        <Text style={styles.sectionLabel}>Jak oceniasz dzisiejszy występ</Text>
        <Text style={styles.label}>Samoocena gry (0 = bardzo słabo, 10 = doskonale)</Text>
        <ScalePicker value={selfRating} onChange={setSelfRating} />
        <Text style={styles.label}>Stan mentalny / pewność siebie (0-10)</Text>
        <ScalePicker value={mentalState} onChange={setMentalState} />

        {/* Wolna notatka */}
        <Text style={styles.label}>Wolna notatka (opcjonalnie)</Text>
        <TextInput
          style={[styles.input, styles.textarea]} placeholderTextColor={colors.textSecondary} value={freeNote} onChangeText={setFreeNote}
          multiline placeholder="Coś jeszcze warto zapisać o dzisiejszym meczu?"
        />
      </>
    );
  }

  /**
   * ⭐ M2 — JEDNO WEJŚCIE DO ARKUSZA, JEDEN KSZTAŁT.
   * ⛔ Strzałka „→" jest w tym produkcie afordancją dotknięcia, więc każdy
   * taki wiersz MUSI być `TouchableOpacity` z `onPress` — napis ze strzałką
   * bez akcji to fałszywy przycisk (pilnuje tego `pustkaWCalymRepo`).
   */
  function wejscieArkusza(rodzaj: RodzajArkuszaMeczu, napis: string, podpis: string) {
    return (
      <TouchableOpacity
        style={styles.wejscie}
        accessibilityRole="button"
        onPress={() => setArkusz(rodzaj)}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.wejscieNapis}>{napis} →</Text>
          <Text style={styles.wejsciePodpis}>{podpis}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ⭐ PLAN-D-M3 — co zawodnik wskazał W TEJ WIZYCIE. Tu wiemy, więc mówimy;
  // gdy nie wskazał, stoi neutralne „Mecz".
  const tytulMeczu = napisRodzajuMeczu(gameType);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <Text style={styles.title}>Mecz</Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {ok && <Text style={styles.ok}>{ok}</Text>}

      {/* ⭐ M2 — TRYB KONTUZJI: na ekranie stoi JEDEN wiersz, cała lista
          trzynastu obszarów otwiera się nakładką. ⛔ Nic nie zniknęło:
          `renderRoutingBlock()` rysuje dokładnie tę samą treść, tyle że
          w arkuszu (koszt 0 dp). */}
      {routing && wejscieArkusza('kontuzja', 'Tryb kontuzji — co jest teraz dostępne', routing.label)}

      {/* ⭐⭐ M2 — RDZEŃ MECZU. Cztery rzeczy, które makieta v3 stawia
          w ścieżce oceny meczu: rodzaj, dwie liczby minut i ciężkość.
          ⛔ Dwie liczby stoją w JEDNYM bloku, bo bez siebie nic nie znaczą:
          45 minut w meczu 60-minutowym to nie to samo, co 45 minut w meczu
          90-minutowym (`lib/meczWiecej.ts`). */}
      <View style={styles.block}>
        <Text style={styles.sectionLabel}>Zapisz mecz</Text>

        {/* ⭐ PLAN-D-W2 → M2 — DWIE LICZBY, JEDEN WIERSZ. Do 19.08 stały jedna
            pod drugą i kosztowały 204 dp; obok siebie kosztują 102 i mówią to
            samo — a nawet więcej, bo widać od razu, że są PARĄ. „Ile grałeś"
            bez „ile trwał mecz" nie znaczy nic (`lib/meczWiecej.ts`).
            ⛔ Pusto jest poprawne przy obu. */}
        <View style={styles.wiersz}>
          <View style={styles.kolumna}>
            <Text style={styles.label}>Minuty na boisku</Text>
            <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} keyboardType="number-pad" value={minutes} onChangeText={setMinutes} placeholder="np. 90" />
          </View>
          <View style={styles.kolumna}>
            <Text style={styles.label}>Ile trwał cały mecz</Text>
            <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} keyboardType="number-pad" value={dlugoscMeczu} onChangeText={setDlugoscMeczu} placeholder="np. 60" />
          </View>
        </View>

        {/* ⛔ ZERO CZERWIENI (Z2): sprzeczność dwóch liczb NIE JEST bólem ani
            stanem ochronnym, więc nie ma prawa nosić barwy ostrzeżenia.
            ⭐ K4 — informację niesie ZDANIE, nie kolor: zawodnik, który nie
            rozróżnia części barw, czyta dokładnie to samo, co każdy inny. */}
        {sprzecznoscMinut && <Text style={styles.uwaga}>{MECZ_MINUTY_PONAD_DLUGOSC}</Text>}

        <Text style={styles.label}>RPE meczowe (0 = brak wysiłku, 10 = maksymalny)</Text>
        <ScalePicker value={matchRpe} onChange={setMatchRpe} />
      </View>

      <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} disabled={saving} onPress={submitMatchContext}>
        <Text style={styles.btnText}>{saving ? 'Zapisuję...' : 'Zapisz mecz'}</Text>
      </TouchableOpacity>

      {/* ⭐⭐ M2 — CZTERY WEJŚCIA ZASTĘPCZE. ⛔ TO JEST WARUNEK 3 POLECENIA:
          nie ma stanu tego pliku, w którym pytania już nie ma na ekranie,
          a wejścia do niego jeszcze nie ma. Każdy wiersz otwiera arkusz
          z DOKŁADNIE tą treścią, która do 19.08 leżała na ekranie. */}
      <View style={styles.wejscia}>
        {wejscieArkusza('stan', 'Stan przed meczem', 'regeneracja i pytania dobrane do Twojej pozycji')}
        {wejscieArkusza('wiecej', 'Powiedz więcej o tym meczu', 'rodzaj, wynik, rola, godzina, pozycja, warunki, samoocena, notatka')}
        {wejscieArkusza('bol', 'Boli Cię dziś coś?', 'miejsce, strona, natężenie')}
        {wejscieArkusza('historia', 'Historia meczów', 'ostatnie zapisane mecze')}
      </View>
    </ScrollView>

    {/* ── ARKUSZ ────────────────────────────────────────────────────
        ⛔ STOI POZA `ScrollView`: to jest NAKŁADKA nad ekranem, a nie
        kolejna rzecz na nim. Dlatego zdejmuje wysokość, zamiast ją
        przesuwać — i dlatego miara ekranu liczy go na zero. */}
    <Arkusz
      widoczny={arkusz !== null}
      naglowek={arkusz === null ? null : naglowekArkuszaMeczu(arkusz, tytulMeczu)}
      naZamkniecie={() => setArkusz(null)}
    >
      {arkusz === null ? null : trescArkusza()}
    </Arkusz>
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
  // ═══════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-M2 19.08.2026 — WIERSZ WEJŚCIA DO ARKUSZA (makieta v3: `prow`).
  // ⛔ ZERO NOWYCH BARW: `surface`, `border` i `brand` były w tym pliku
  // wcześniej. ⛔ Zero czerwieni (Z2) — to nie jest ostrzeżenie.
  // ═══════════════════════════════════════════════════════════════
  // ⭐ M2 — DWIE LICZBY OBOK SIEBIE. ⛔ Styl stoi w `StyleSheet`, a nie
  // w atrybucie: miara `lib/wysokoscEkranu.ts` czyta z atrybutu WYŁĄCZNIE
  // wartości liczbowe, więc `style={{ flexDirection: 'row' }}` wpisany wprost
  // byłby policzony jako kolumna — i liczba na zapadce mówiłaby o innym
  // ekranie niż ten, który widzi zawodnik.
  wiersz: { flexDirection: 'row', gap: 12 },
  kolumna: { flex: 1 },
  wejscia: { marginTop: 28 },
  wejscie: {
    minHeight: minTouchHeight,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
  },
  wejscieNapis: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  wejsciePodpis: { ...typography.body, fontSize: 11.5, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  // ⛔ UWAGA, KTÓRA NIE JEST OSTRZEŻENIEM. Sprzeczność dwóch liczb podanych
  // przez zawodnika to fakt do poprawienia, nie ból i nie stan ochronny —
  // dlatego NIE MA tu `colors.error` (Z2). Nośnikiem jest zdanie (K4).
  uwaga: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceElevated,
    borderLeftWidth: 3,
    borderLeftColor: colors.textPrimary,
    borderRadius: radii.sm,
    padding: 10,
    marginBottom: 8,
  },
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
