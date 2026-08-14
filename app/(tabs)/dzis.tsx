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
//
// ═══════════════════════════════════════════════════════════════════
// WIEDZA B4 08.08.2026 — PODPOWIEDŹ Z MATERIAŁU PRZY REKOMENDACJI
// (decyzje B1 i C1 warstwa 1, claude/DECYZJE_PRODUKTOWE_07_08_2026.md;
//  treść i kształt tabeli: claude/PODPOWIEDZI_Z_MATERIALOW_A.md 4.3 i 4.5)
//
// CO SIĘ ZMIENIŁO: pod przyciskami karty rekomendacji stoi jedna podpowiedź
// z materiałów Kuby, Z WIDOCZNYM ŹRÓDŁEM („Moc, s. 8"). To źródło jest całą
// różnicą — zdanie bez niego mógłby napisać dowolny model; zdanie z nim pochodzi
// z konkretnej strony konkretnej książki i da się je sprawdzić.
//
// SKĄD BIERZEMY DANE — i dlaczego tą drogą. Polecenie dawało dwie: (1) czytać
// podpowiedź już przypiętą do rekordu rekomendacji przez pas A tej samej rundy,
// (2) czytać `component_hints` bezpośrednio po `segment_id` aktywnego Celu.
// SPRAWDZIŁEM PIERWSZĄ: raportu A rundy 4 nie ma w pamięci projektu (najnowszy
// to `RAPORT_ZWROTNY_A_RUNDA_3.md`), więc kontraktu na przypięcie nie ma, a
// `RECOMMENDATION_COLUMNS` nie zawiera żadnej kolumny z podpowiedzią. Idę
// drugą drogą. Gdy pas A dopnie podpowiedź do rekordu, ten ekran przestawia się
// na nią zmianą w jednym miejscu (`loadHint`), bez ruszania reguł z
// `lib/componentHints.ts`.
//
// ⚠️ BRAMKA WIEKOWA (decyzja A9) jest twarda i jest w `lib/componentHints.ts`:
// poniżej 16 lat zawodnik nie dostaje podpowiedzi z dawkami suplementacyjnymi,
// a gdy appka NIE ZNA wieku — też ich nie dostaje. Appka zna wyłącznie rocznik
// (`users.birth_year`), więc liczymy wiek NAJNIŻSZY MOŻLIWY. Uzasadnienie
// kierunku błędu stoi przy `minimumPossibleAge`.
//
// ⚠️ REGUŁA R5: „nie ma tabeli" i „tabela jest, ale pusta" to DWIE RÓŻNE RZECZY
// i ekran je rozróżnia. Migracja `component_hints` (214 wierszy) czeka na
// wklejenie przez Kubę — do tego czasu ekran mówi wprost „materiały dla tego
// obszaru są w przygotowaniu", zamiast pokazać pustkę udającą, że nic nie ma.
//
// ═══════════════════════════════════════════════════════════════════
// WIEDZA B4 08.08.2026 — STAN ŁADOWANIA (dług N2 / znalezisko B18, otwarte
// od rundy 2). `loading` było ustawiane i NIGDY nie czytane: przy pierwszym
// wejściu zawodnik widział przez chwilę „Nie masz jeszcze Celu" i pusty stan
// rekomendacji, po czym ekran się przemalowywał. To nie jest kosmetyka —
// pierwsze zdanie, jakie appka mówi zawodnikowi po zalogowaniu, brzmiało
// nieprawdziwie. `loading` startuje jako `true` i schodzi do `false` po
// pierwszym `load()`; kolejne odświeżenia (`useFocusEffect`, `RefreshControl`)
// go NIE podnoszą, bo wtedy na ekranie są już prawdziwe dane i migotanie
// byłoby gorsze niż jego brak.
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
// WIEDZA B4 08.08.2026 — wszystkie reguły podpowiedzi (bramka wiekowa A9,
// rozróżnienie R5, wybór jednej z kilkunastu) siedzą w czystych funkcjach
// z własnym selftestem. Tutaj zostaje wyłącznie zapytanie i rysowanie.
import {
  COMPONENT_HINT_COLUMNS,
  // ZAPIS B7 08.08.2026 (M19) — treść zawsze widoczna: rozszerzona lista kolumn
  // + ścieżka odzysku, gdy migracja `zawsze_widoczna` nie jest wklejona.
  COMPONENT_HINT_COLUMNS_WITH_ALWAYS,
  shouldRetryWithoutAlwaysVisible,
  ALWAYS_VISIBLE_COLUMN_MISSING_WARN,
  buildHintState,
  minimumPossibleAge,
  hintKindLabel,
  hintEyebrow,
  // ⚠️ PLAN-D-T 08.2026 — `HINT_EYEBROW` stracił tu konsumenta razem
  // z kafelkiem stanów R5 podpowiedzi. Stała ZOSTAJE w lib/componentHints.ts:
  // czyta ją `hintEyebrow()`, którego ten ekran nadal używa dla treści zawsze
  // widocznej. Zniknął import, nie stała.
  HINT_TABLE_MISSING_TEXT,
  HINT_ERROR_TEXT,
  HINT_EMPTY_TEXT,
  type ComponentHintRow,
  type HintState,
} from '../../lib/componentHints';
// ZAPIS B7 08.08.2026 (M23/B35) — „Nowa porcja w Twoim Bloku": odczyt dawki
// i listy „przeczytane" tymi samymi czystymi funkcjami co ekran Bloku.
import {
  CONTENT_DOSE_COLUMN,
  CONTENT_DOSE_SEEN_COLUMN,
  CONTENT_DOSE_SEEN_COLUMN_MISSING_WARN,
  isMissingContentDoseColumnError,
  isMissingSeenColumnError,
  parseContentDoses,
  parseSeenKeys,
  isDoseSeen,
} from '../../lib/contentDose';
import { colors, typography, spacing, radii, minTouchHeight, skew } from '../../constants/theme';
// PLAN-D-E 12.08.2026, zaktualizowane 12.08.2026 wieczorem — ZASADA PUNKTU
// POMOCY I JEJ JEDYNY WYJATEK. Czytaj razem z komentarzem "ZADANIE E2" nizej;
// wczesniej te dwa miejsca mowily co innego, a to jest dokladnie taki defekt,
// ktory nastepna sesja rozstrzyga po tym, na ktory komentarz trafi pierwsza.
//
// ZASADA (decyzja Kuby z 12.08.2026): zadnego przycisku pomocy na ekranach,
// na ktorych stoja glowne rzeczy produktu. Podstawowe wejscie to nazwany wiersz
// w sekcji "Pomoc" na dole zakladki "Ja". NIE DOKLADAC tu nic "przy okazji".
// `paddingBottom` zostaje 60 dp.
//
// WYJATEK ("ZADANIE E2", pas F, 12.08.2026): wiersz pomocy pokazuje sie na tym
// ekranie przy glosie `injury` albo `exit` — i przy zadnym innym. Warunek stoi
// w jednym miejscu: `podniescPunktPomocy()` w `lib/glosTygodnia.ts`.
// DECYZJA KUBY z 12.08.2026, wieczorem: ZOSTAWIC TAK, JAK JEST. Wyjatek jest
// zatwierdzony przez wlasciciela produktu i przestaje byc otwarta sprawa
// (znalezisko E-N15 w `claude/RAPORT_E_OS_DECYZJI_11_08_2026.md` — zamkniete).
// Zakres wyjatku jest ZAMKNIETY na dwa stany: `injury` i `exit`. Dolozenie
// trzeciego stanu, drugiego ekranu albo drugiego wejscia jest cofnieciem
// decyzji wlasciciela, nie ulepszeniem — tego dotyczy ZASADA wyzej.
import LivingDiagnosisPulseCard from '../../components/LivingDiagnosisPulseCard';
import RecommendationCard, { RECOMMENDATION_COLUMNS, type Recommendation } from '../../components/RecommendationCard';
// PLAN-D-F 08.2026 (12.08.2026) — GŁOS TYGODNIA. Ekran czyta gotowy wiersz
// `weekly_voice`; drabinę liczy backend (gamechange-app/lib/arbiter-glosu.js,
// wołany raz dziennie przez api/cron-weekly-voice.js). Appka NIE rozstrzyga,
// kto ma głos — czyta wynik i decyduje, co z nim zrobić na ekranie.
import {
  stanGlosu,
  pokazacKarte,
  podniescPunktPomocy,
  opisDoLogu,
  poniedzialekTygodnia as poniedzialekGlosu,
  type StanGlosu,
  type WierszGlosu,
} from '../../lib/glosTygodnia';
// PLAN-D-J 08.2026 (12.08.2026) — CO OBOWIĄZUJE W TYM TYGODNIU.
// Do dziś ekran wiedział, KTO MÓWI (`weekly_voice.voice`), i nie miał skąd
// wiedzieć, CO OBOWIĄZUJE: cron wyrzucał `ograniczenia` przed zapisem.
// Skutek na TYM ekranie: zawodnik z kontuzją, o którym produkt WIEDZIAŁ, że ma
// kontuzję, dostawał licznik „3 z 6 sesji zrobione", zaproszenie „Zaplanuj
// Blok →" i rekomendację treningową — czyli dokładnie to, o czym spec 1.2 mówi
// „system milczy o celach". Decyzja, co zdjąć z ekranu, siedzi jako CZYSTA
// FUNKCJA w `lib/ograniczenia.ts`; ten ekran ją WYKONUJE, nie podejmuje.
import {
  czytajOgraniczenia,
  coPokazacNaDzis,
  czyOslonaAktywna,
  opisOgraniczenDoLogu,
  isMissingOgraniczeniaColumnError,
  KOLUMNA_OGRANICZEN,
  type StanOgraniczen,
} from '../../lib/ograniczenia';
// ═══════════════════════════════════════════════════════════════════
// PLAN-D-T 08.2026 (13.08.2026), zadanie T1 — KRĘGOSŁUP.
//
// Ten ekran był KOLAŻEM SZEŚCIU NIEZALEŻNYCH PRODUCENTÓW: kafelek Bloku ·
// karta rekomendacji · podpowiedź dnia · karta głosu tygodnia · punkt pomocy ·
// piętnaście rytmów push. Każdy powstał w innej rundzie i żaden nie wiedział
// o pozostałych. Trzy pierwsze łączą się od tej rundy w JEDNĄ ODPOWIEDŹ
// o trzech częściach: CO DZIŚ ZROBIĆ · DLACZEGO AKURAT TO · CO TO ZMIENI.
//
// ⚠️ DECYZJA JEST CZYSTĄ FUNKCJĄ (`lib/jednaOdpowiedz.ts`); ten ekran ją
// WYKONUJE, nie podejmuje. ZERO NOWYCH ZAPYTAŃ DO BAZY — wszystkie trzy części
// biorą się z danych, które ekran i tak już miał.
// ═══════════════════════════════════════════════════════════════════
import {
  zbudujJednaOdpowiedz,
  NAGLOWEK_CO_ZROBIC,
  NAGLOWEK_DLACZEGO,
  NAGLOWEK_CO_ZMIENI,
} from '../../lib/jednaOdpowiedz';
// PLAN-D-T 08.2026 (14.08.2026), zadanie T6 — TRZY PUSTKI.
// Karta „Dziś w kalendarzu" mówiła „Nic zaplanowanego na dziś." zawodnikowi,
// który nic nie zaplanował, I zawodnikowi, któremu wygasł dostęp i którego
// wpisu baza i tak by nie przyjęła. To są dwie różne rzeczy i od tej rundy
// mają dwa różne zdania. Rozstrzygnięcie: `lib/trzyPustki.ts`.
import { rozpoznajPustke, opisPustkiDoLogu } from '../../lib/trzyPustki';
import { czytajStanDostepu, RPC_STAN_DOSTEPU } from '../../lib/dostepKonta';
// ZADANIE E2 12.08.2026 — punkt pomocy wyżej w kontuzji i ścieżce wyjścia.
// Stąd idzie WYŁĄCZNIE prośba o otwarcie tego samego, jedynego modala
// zamontowanego w app/_layout.tsx. Zero drugiego egzemplarza.
import { otworzPunktPomocy } from '../../components/PunktPomocy';
import { POMOC_PRZYCISK, POMOC_WIERSZ_PODPIS } from '../../lib/labels';
// PLAN-D 14.08.2026 — RODZAJ, KTÓREGO NIE ZNAMY, MA SIĘ NAZWAĆ.
// Pas A7 domknął to w `kalendarz.tsx` i postawił tam strażnika. Ten sam wzorzec
// (`EVENT_TYPE_LABELS[e.event_type] || e.event_type`) żył dalej TUTAJ, na ekranie,
// który zawodnik otwiera pierwszy — czyli reguła obowiązywała na ekranie rzadziej
// oglądanym, a nie obowiązywała na tym, który widać zawsze. Rozstrzygnięcie idzie
// z tej samej czystej funkcji, nie z kopii.
import { opiszRodzaj, opisNieznanegoRodzajuDoLogu } from '../../lib/meczWKalendarzu';

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
// WIEDZA B4 08.08.2026 — doszło `component_id`: to jest Element, nad którym
// zawodnik faktycznie pracuje, więc podpowiedź wycelowana w ten Element jest
// trafniejsza niż reguła przekrojowa segmentu. `computeFocusBlockProgress`
// tej kolumny nie czyta i nie zmienia przez to zachowania.
type FocusBlockRow = { id: string; segment_id: string; status: string; component_id?: string | null };

function dayCodeFor(date: Date) {
  const idx = (date.getDay() + 6) % 7; // 0=Pon..6=Nd — ta sama konwencja co lib/date-utils.ts
  return DAYS_OF_WEEK[idx][0];
}

export default function DzisScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();

  const [priorityGoal, setPriorityGoal] = useState<Goal | null>(null);
  const [hasAnyGoal, setHasAnyGoal] = useState(false);
  // PIERWSZE URUCHOMIENIE 10.08.2026 (zatwierdzone przez Kubę) — ekran Dziś
  // do dziś NIE MIAŁ ANI JEDNEGO odwołania do diagnozy, więc nie potrafił
  // odróżnić zawodnika, który ją ma, od takiego, który jej nie ma, i obu
  // mówił to samo: „załóż Cel". A `api/cron-onboard-diagnosis.js` onboarduje
  // WYŁĄCZNIE zawodników Z diagnozą — kto jej nie zrobi, nie dostanie ani
  // zaproponowanego Celu, ani pierwszej rekomendacji, nigdy. Jedyne miejsce,
  // które o diagnozie wspominało, siedziało dwa dotknięcia dalej, w zakładce
  // „Ja", pod nazwą „WYNIK diagnozy" — co dla kogoś, kto jej nie robił,
  // brzmi jak raport, nie jak zaproszenie. Znalezione przy przejściu ścieżki
  // na świeżym koncie 10.08.2026 (zgłosił Kuba).
  const [hasDiagnosis, setHasDiagnosis] = useState<boolean | null>(null);
  const [loggedToday, setLoggedToday] = useState(false);
  const [focusRec, setFocusRec] = useState<RecommendationRow | null>(null);
  const [otherUnreadCount, setOtherUnreadCount] = useState(0);
  const [openActionableCount, setOpenActionableCount] = useState(0);
  const [todayEvents, setTodayEvents] = useState<CalEvent[]>([]);
  const [workProgress, setWorkProgress] = useState<FocusBlockProgress>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  // WIEDZA B4 08.08.2026 — podpowiedź z materiału. Osobny stan, bo zapytanie
  // o nią rusza dopiero wtedy, gdy wiadomo, jaki jest segment Celu.
  // PLAN-D-E 08.2026 — dopisane `alwaysVisible: []`. Wariant `loading` typu
  // `HintState` wymaga tego pola od rundy ZAPIS B7; stan początkowy go nie
  // podawał i `npx tsc --noEmit` zgłaszał tu TS2345. Zachowanie bez zmian:
  // `renderHint` wychodzi przez `return null` przy `state === 'loading'`,
  // zanim w ogóle sięgnie po `alwaysVisible`.
  const [hintState, setHintState] = useState<HintState>({ state: 'loading', alwaysVisible: [] });

  // PLAN-D-F 08.2026 — głos tygodnia. Stan początkowy to `brak_wiersza`, a NIE
  // `cisza`: przed odczytem nie wiadomo, czy arbiter policzył ten tydzień, a
  // cisza jest DECYZJĄ arbitra i nie wolno jej udawać. Patrz lib/glosTygodnia.ts.
  const [glos, setGlos] = useState<StanGlosu>({ rodzaj: 'brak_wiersza' });

  // PLAN-D-T (T6) — `null` znaczy „nie odczytałem", a NIE „nie ma dostępu".
  const [moznaZapisywac, setMoznaZapisywac] = useState<boolean | null>(null);

  // PLAN-D-J 08.2026 — stan nałożony przez arbitra. Stan początkowy to
  // `nie_odczytane`, a NIE „nic nie obowiązuje": przed odczytem nie wiadomo,
  // czy zawodnik jest w Osłonie albo po urazie, a udawanie, że nie jest, to
  // dokładnie ten defekt, który ta runda likwiduje.
  const [ograniczenia, setOgraniczenia] = useState<StanOgraniczen>(
    { rodzaj: 'nie_odczytane', powod: 'jeszcze nie odczytano' },
  );

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

  // WIEDZA B4 08.08.2026 — jedno zapytanie o podpowiedzi z materiałów.
  // Rusza dopiero po `load()`, bo dopiero wtedy znany jest segment Celu.
  //
  // ⚠️ TU MIESZKA REGUŁA R5. `supabase-js` NIE RZUCA wyjątku, gdy tabeli nie
  // ma — zwraca `{ data: null, error }`. Gdyby ten kod zrobił
  // `rows = data ?? []`, brak tabeli byłby nieodróżnialny od „nie ma treści dla
  // tego segmentu": ekran pokazałby spokojny pusty stan, wszystko wyglądałoby
  // na wdrożone i nikt nigdy by nie wrócił. Dlatego `error` idzie do
  // `buildHintState` NIETKNIĘTY i to ono rozstrzyga, co zawodnik zobaczy.
  // ZAPIS B7 08.08.2026 (M23/B35) — czy w Bloku pod tym Celem czeka NOWA,
  // nieotwarta dawka treści. Osobne, wąskie zapytanie (nie kolumny w selecie
  // z Promise.all — PostgREST przy nieznanej kolumnie odrzuca CAŁE zapytanie,
  // a `content_doses`/`content_dose_seen` to najmłodsze migracje). Każdy brak
  // — kolumny, koperty, klucza — znaczy po prostu „nie pokazuj linii";
  // pierwszy z nich dodatkowo mówi w logu dlaczego.
  const [newDoseWaiting, setNewDoseWaiting] = useState(false);
  const loadNewDose = useCallback(async (blockId: string | null) => {
    if (!blockId) { setNewDoseWaiting(false); return; }
    let { data, error: err } = await supabase
      .from('focus_blocks')
      .select(`${CONTENT_DOSE_COLUMN},${CONTENT_DOSE_SEEN_COLUMN}`)
      .eq('id', blockId)
      .maybeSingle();
    if (err && isMissingSeenColumnError(err) && !isMissingContentDoseColumnError(err)) {
      console.warn(CONTENT_DOSE_SEEN_COLUMN_MISSING_WARN);
      setNewDoseWaiting(false);
      return; // bez kolumny „seen" nie ma jak odróżnić nowej od przeczytanej
    }
    if (err || !data) { setNewDoseWaiting(false); return; }
    const row = data as Record<string, unknown>;
    const parsed = parseContentDoses(row[CONTENT_DOSE_COLUMN]);
    if (parsed.kind !== 'ready' || parsed.doses.length === 0) { setNewDoseWaiting(false); return; }
    const seen = parseSeenKeys(row[CONTENT_DOSE_SEEN_COLUMN]);
    setNewDoseWaiting(!isDoseSeen(seen, parsed.doses[0].klucz));
  }, []);

  const loadHint = useCallback(async (params: {
    segmentId: string | null;
    componentId: string | null;
    birthYear: number | null;
  }) => {
    const { segmentId, componentId, birthYear } = params;
    if (!segmentId) {
      setHintState(buildHintState({ hasGoal: false, error: null, rows: null, age: null }));
      return;
    }
    const age = minimumPossibleAge(birthYear);
    // ZAPIS B7 08.08.2026 (M19) — pytamy rozszerzoną listą kolumn (z
    // `zawsze_widoczna`); gdy migracji nie ma, powtarzamy starą listą i
    // zachowanie wraca bajt w bajt do stanu sprzed rundy 6. Diff wprost
    // z raportu B rundy 6, sekcja 8.1 — to jest WARUNEK wejścia treści
    // bezpieczeństwa do bazy.
    // PLAN-D-E 08.2026 — rozbite na dwie osobne odpowiedzi zamiast ponownego
    // przypisania do tej samej pary zmiennych. Powód jest wyłącznie typowy:
    // druga próba pyta KRÓTSZĄ listą kolumn, więc supabase-js wywodzi dla niej
    // inny kształt `data` niż dla pierwszej, i `npx tsc --noEmit` zgłaszał tu
    // TS2322 (`GenericStringError[]`). Zachowanie jest bajt w bajt to samo:
    // pierwsze zapytanie, warunek powtórki, drugie zapytanie, ten sam `console.warn`.
    const pierwsza = await supabase
      .from('component_hints')
      .select(COMPONENT_HINT_COLUMNS_WITH_ALWAYS)
      .eq('segment_id', segmentId)
      .eq('active', true);
    let data: ComponentHintRow[] | null = pierwsza.data as unknown as ComponentHintRow[] | null;
    let err: unknown = pierwsza.error;
    if (err && shouldRetryWithoutAlwaysVisible(err)) {
      console.warn(ALWAYS_VISIBLE_COLUMN_MISSING_WARN);
      const druga = await supabase
        .from('component_hints')
        .select(COMPONENT_HINT_COLUMNS)
        .eq('segment_id', segmentId)
        .eq('active', true);
      data = druga.data as unknown as ComponentHintRow[] | null;
      err = druga.error;
    }
    setHintState(buildHintState({
      hasGoal: true,
      error: err,
      rows: err ? null : ((data ?? []) as unknown as ComponentHintRow[]),
      componentId,
      age,
    }));
  }, []);

  const load = useCallback(async () => {
    if (!currentUser) return;
    const todayStr = toLocalDateStr(new Date());
    const todayCode = dayCodeFor(new Date());
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [goalsRes, logsRes, recsRes, eventsRes, blocksRes, doneLogsRes, userRes, diagRes, glosRes] = await Promise.all([
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
      // ⚠️ PLAN-D 14.08.2026 — WARUNEK WSTĘPNY MIGRACJI A1, NIE KOSMETYKA.
      // Do 14.08.2026 stało tu `.eq('status', 'scheduled')`.
      // Pas A1 rozszerza `calendar_events_status_check` o wartość `'completed'`.
      // Gdyby ten filtr został przy `'scheduled'`, PIERWSZA sesja oznaczona jako
      // wykonana WYPADŁABY Z MIANOWNIKA licznika „N z M sesji" — czyli licznik
      // MALAŁBY DOKŁADNIE WTEDY, GDY ZAWODNIK PRACUJE. Odwrócenie sensu.
      // Ta linia MUSI być wdrożona PRZED migracją A1 (kolejność zmierzona 14.08).
      supabase.from('calendar_events').select('id,title,event_type,scheduled_date,recurrence_rule,focus_block_id')
        .eq('user_id', currentUser.id).in('status', ['scheduled', 'completed']),
      // WIEDZA B4 08.08.2026 — doszło `component_id` (Element Bloku Skupienia),
      // żeby podpowiedź dało się wycelować w to, nad czym zawodnik pracuje.
      supabase.from('focus_blocks').select('id,segment_id,status,component_id')
        .eq('user_id', currentUser.id).eq('status', 'active'),
      // Wykonanie sesji rozpoznajemy po `daily_logs.calendar_event_id` — ten sam
      // wzorzec co plakietki „Wykonano / Nie wykonano" w kalendarz.tsx.
      supabase.from('daily_logs').select('calendar_event_id')
        .eq('user_id', currentUser.id).not('calendar_event_id', 'is', null),
      // WIEDZA B4 08.08.2026 — rocznik. JEDYNE źródło wieku, jakie appka ma
      // (`app/(tabs)/profil.tsx`, etap 0 kreatora). Karmi wyłącznie bramkę
      // wiekową A9 i nie jest nigdzie pokazywany.
      supabase.from('users').select('birth_year').eq('id', currentUser.id).limit(1),
      // PIERWSZE URUCHOMIENIE 10.08.2026 — samo ISTNIENIE diagnozy, nic więcej.
      // `head: true` + `count: 'exact'` nie ściąga ani jednego wiersza, więc
      // dokładamy do tej paczki zapytanie o zerowym koszcie transferu.
      // Warunek `scores is not null` jest ten sam, którego używa
      // `fetchLatestDiagnosisPerUser()` w cronie onboardującym — żeby appka
      // i silnik liczyły „ma diagnozę" DOKŁADNIE tak samo. Bez tego appka
      // mogłaby uznać za wypełnioną ankietę, której cron nie widzi.
      supabase.from('diagnostics').select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id).not('scores', 'is', null),
      // PLAN-D-F 08.2026 — głos tygodnia na BIEŻĄCY tydzień. Poniedziałek liczony
      // tą samą regułą co w backendzie (`poniedzialekGlosu`), więc appka pyta
      // dokładnie o ten wiersz, który zapisał cron.
      // ⚠️ `weekly_voice` ma politykę `select_own` — to zapytanie idzie tokenem
      // zawodnika i zobaczy WYŁĄCZNIE jego wiersz. Zapis robi cron rolą
      // service_role, appka nigdy tu nie pisze.
      // PLAN-D-J 08.2026 — doszła kolumna `ograniczenia`. ⚠️ PostgREST przy
      // nieznanej kolumnie odrzuca CAŁE zapytanie, więc dopóki migracja J1 nie
      // jest wykonana, ten select by się wywrócił i karta głosu ZNIKNĘŁABY
      // z ekranu. Dlatego niżej stoi jawne ponowienie bez tej kolumny — patrz
      // `isMissingOgraniczeniaColumnError`.
      supabase.from('weekly_voice').select(`week_start, voice, reason, spoke_at, ${KOLUMNA_OGRANICZEN}`)
        .eq('user_id', currentUser.id).eq('week_start', poniedzialekGlosu(new Date())).limit(1),
    ]);

    // PLAN-D-F 08.2026 — trzy różne powody, dla których tu może nic nie być:
    // błąd odczytu / arbiter jeszcze nie policzył / arbiter policzył CISZĘ.
    // `stanGlosu` je rozdziela, a `opisDoLogu` mówi który zaszedł — bez tego
    // „Dziś nic nie pokazuje" jest nie do zdiagnozowania.
    // PLAN-D-J 08.2026 — gdy migracja J1 nie jest jeszcze wykonana, PostgREST
    // odrzuca CAŁE zapytanie z powodu jednej nieznanej kolumny. Ponawiamy bez
    // niej: głos tygodnia ma się pokazać, a ograniczenia zostają jawnym
    // „nie wiem". Kolejność wdrożenia nie może gasić ekranu.
    // ⚠️ TYP JAWNY, NIE WYWNIOSKOWANY (poprawka 13.08.2026, błąd TS2322).
    // Bez tego `glosData` bierze typ z pierwszego zapytania — czyli Z kolumną
    // `ograniczenia` — i przypisanie wyniku ponowienia, które tej kolumny nie
    // pobiera, nie kompiluje się. Wąski typ mówi wprost, na czym od tego miejsca
    // POLEGAMY: na czterech kolumnach głosu. Ograniczenia jadą osobną drogą,
    // przez `ograniczeniaSurowe`, i nikt ich stąd nie czyta.
    type WierszGlosuSurowy = { week_start: unknown; voice: unknown; reason: unknown; spoke_at: unknown };
    let glosData: WierszGlosuSurowy[] | null = glosRes.data;
    let glosError: { message: string } | null = glosRes.error;
    let ograniczeniaSurowe: unknown = ((glosRes.data ?? [])[0] as Record<string, unknown> | undefined)?.[KOLUMNA_OGRANICZEN];
    let bladOgraniczen: string | null = glosRes.error ? glosRes.error.message : null;
    if (glosRes.error && isMissingOgraniczeniaColumnError(glosRes.error)) {
      console.warn(`dzis: kolumny „${KOLUMNA_OGRANICZEN}" nie ma w bazie — migracja J1 niewykonana. `
        + 'Czytam głos tygodnia bez niej; ograniczenia zostają jawnym „nie wiem".');
      const drugi = await supabase.from('weekly_voice').select('week_start, voice, reason, spoke_at')
        .eq('user_id', currentUser.id).eq('week_start', poniedzialekGlosu(new Date())).limit(1);
      glosData = drugi.data;
      glosError = drugi.error;
      ograniczeniaSurowe = undefined;
      bladOgraniczen = `kolumny „${KOLUMNA_OGRANICZEN}" nie ma jeszcze w bazie`;
    }

    const stanTygodnia = stanGlosu(
      ((glosData ?? [])[0] as WierszGlosu | undefined) ?? null,
      glosError ? glosError.message : null,
    );
    setGlos(stanTygodnia);
    if (stanTygodnia.rodzaj === 'nie_wiem') console.error(`dzis: ${opisDoLogu(stanTygodnia)}`);
    else console.log(`dzis: ${opisDoLogu(stanTygodnia)}`);

    const stanOgraniczen = czytajOgraniczenia(ograniczeniaSurowe, bladOgraniczen);
    setOgraniczenia(stanOgraniczen);
    console.log(`dzis: ${opisOgraniczenDoLogu(stanOgraniczen)}`);

    const goals = (goalsRes.data ?? []) as Goal[];
    const goal = goals.find((g) => g.is_priority) ?? goals[0] ?? null;
    setPriorityGoal(goal);
    setHasAnyGoal(goals.length > 0);
    // PIERWSZE URUCHOMIENIE 10.08.2026 — przy błędzie zapytania NIE udajemy,
    // że diagnozy nie ma (to wepchnęłoby zawodnika z gotową diagnozą w ekran
    // pierwszego kroku). Błąd = zostawiamy `null`, czyli stan „nie wiem",
    // a ekran zachowuje się wtedy jak dotąd.
    setHasDiagnosis(diagRes.error ? null : (diagRes.count ?? 0) > 0);

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

    // PLAN-D-T 08.2026 (14.08.2026), zadanie T6 — STAN DOSTĘPU DO ZAPISU.
    // ⚠️ ŚWIADOMIE OSOBNE, WĄSKIE WYWOŁANIE: gdyby RPC `stan_dostepu` padło
    // albo nie istniało, ekran „Dziś" ma działać dalej. Nieudany odczyt daje
    // `null`, czyli „nie wiem" — a „nie wiem" NIE mówi zawodnikowi, że
    // stracił dostęp (kierunek błędu jak przy ograniczeniach).
    const dostepRes = await supabase.rpc(RPC_STAN_DOSTEPU);
    const stanDostepu = czytajStanDostepu(
      dostepRes.data, dostepRes.error ? dostepRes.error.message : null,
    );
    setMoznaZapisywac(stanDostepu.rodzaj === 'znany' ? stanDostepu.maDostep : null);

    // ─── Wskaźnik pracy (patrz nagłówek pliku, punkt 4) ───────────────
    // Cała logika (i uzasadnienie każdej decyzji) siedzi w
    // lib/focusBlockProgress.ts — czysta funkcja, uruchamiana i sprawdzana bez
    // appki przez lib/focusBlockProgress.selftest.ts. Tutaj tylko dane.
    const activeBlocks = (blocksRes.data ?? []) as FocusBlockRow[];
    setWorkProgress(computeFocusBlockProgress({
      goalSegmentId: goal?.segment_id ?? null,
      activeBlocks,
      scheduledEvents: events, // wyłącznie status='scheduled' — patrz zapytanie wyżej
      doneEventIds: new Set(((doneLogsRes.data ?? []) as { calendar_event_id: number }[])
        .map((l) => l.calendar_event_id)),
    }));

    setLoading(false);

    // ─── Podpowiedź z materiału (WIEDZA B4 08.08.2026) ────────────────
    // Świadomie POZA `Promise.all` wyżej: zapytanie potrzebuje `segment_id`
    // Celu, którego przed tamtym zapytaniem nie znamy. Ekran ma na to własny
    // stan ładowania, więc rekomendacja nie czeka na podpowiedź.
    // Blok Skupienia bierzemy ten, który stoi pod Celem — nie dowolny aktywny.
    const blockForGoal = goal
      ? activeBlocks.find((b) => b.segment_id === goal.segment_id) ?? null
      : null;
    const birthYear = (userRes.data?.[0] as { birth_year: number | null } | undefined)?.birth_year ?? null;
    loadHint({
      segmentId: goal?.segment_id ?? null,
      componentId: blockForGoal?.component_id ?? null,
      // Błąd odczytu rocznika daje `null`, czyli „appka nie zna wieku", czyli
      // bramka A9 zamknięta. Nie ma tu cichego fallbacku „załóżmy, że dorosły".
      birthYear: userRes.error ? null : birthYear,
    });
    loadNewDose(blockForGoal?.id ?? null);
  }, [currentUser, markShownAsViewed, loadHint, loadNewDose]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const todayLabel = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  const goalSegmentLabel = priorityGoal ? (SEG_LABELS[priorityGoal.segment_id] ?? priorityGoal.segment_id) : null;
  const isRecLinkedToGoal = !!focusRec && !!priorityGoal && focusRec.goal_id === priorityGoal.id;

  // PIERWSZE URUCHOMIENIE 10.08.2026 — stan „zawodnik zero": ani diagnozy,
  // ani Celu. Świadomie WYMAGA OBU warunków: kto zdążył założyć Cel sam,
  // dostaje ekran Celu jak dotąd — nie odbieramy mu tego, co już zrobił.
  // `hasDiagnosis === false` (a nie `!hasDiagnosis`) jest celowe: `null`
  // oznacza „nie udało się sprawdzić" i wtedy ekran zachowuje się po staremu.
  const showFirstStep = hasDiagnosis === false && !hasAnyGoal;

  // WIEDZA B4 08.08.2026 — podpowiedź z materiału, blok pod przyciskami karty.
  // Uzasadnienie miejsca (a nie nad przyciskami) stoi przy `footerSlot`
  // w components/RecommendationCard.tsx. Cztery stany, każdy JAWNY — reguła R5:
  // pusty wynik i brak tabeli to dwie różne rzeczy i zawodnik ma je rozróżniać
  // po tekście, nie zgadywać z ciszy.
  // ⚠️ PLAN-D-T 08.2026 (13.08.2026), zadanie T1 — `renderHint()` PRZESTAŁ
  // BYĆ SZÓSTYM PRODUCENTEM I ZOSTAŁ TREŚCIĄ ZAWSZE WIDOCZNĄ.
  //
  // Do tej rundy ta funkcja rysowała DWIE rzeczy naraz:
  //   (a) treść ZAWSZE WIDOCZNĄ (`zawsze_widoczna`, m.in. telefon zaufania) —
  //       to jest funkcja BEZPIECZEŃSTWA i zostaje nietknięta;
  //   (b) podpowiedź dnia z rotacji — czyli trzeciego z sześciu producentów,
  //       który mówił zawodnikowi, co ma zrobić, nie wiedząc o dwóch
  //       pozostałych.
  //
  // (b) WCHODZI DO JEDNEJ ODPOWIEDZI (`lib/jednaOdpowiedz.ts`) i przestaje
  // istnieć jako osobny kafelek. Zostaje wyłącznie (a).
  //
  // ⚠️ ZNIKA TEŻ NAGŁÓWEK „Warto wiedzieć" nad podpowiedzią dnia — a razem
  // z nim znika stan, w którym 114 z 297 treści kończyło się na wiedzy (M4).
  // W jednej odpowiedzi ta sama treść stoi pod nagłówkiem „Co dziś zrobić".
  // Przy treści ZAWSZE WIDOCZNEJ nagłówek ZOSTAJE: tam „warto wiedzieć" jest
  // prawdą — to są granice bezpieczeństwa, nie zadania na dziś.
  const renderTrescZawszeWidoczna = () => {
    // Treść zawsze widoczna jest bezpieczeństwem, nie treścią o pracy —
    // ale przy ścieżce wyjścia milczy WSZYSTKO poza kartą głosu i punktem
    // pomocy, więc warunek zostaje bez zmiany.
    if (!widokDzis.pokazacPodpowiedz) return null;
    if (hintState.state === 'no_goal' || hintState.state === 'loading') return null;
    if (hintState.alwaysVisible.length === 0) return null;
    return (
      <>
        {hintState.alwaysVisible.map((p) => (
          <View key={p.hint.klucz} style={styles.hintBox}>
            {/* Nadtytuł mówi PRAWDĘ o pochodzeniu zdania: „Z materiałów Gamechange"
                tylko wtedy, gdy da się pokazać źródło. Wiersz bez źródła
                (zdanie kierujące po dawki do rodzica, decyzja A9) dostaje
                „Zasada Gamechange" — patrz `hintEyebrow` w lib/componentHints.ts. */}
            <Text style={styles.hintEyebrow}>
              {hintEyebrow(p.source)}
              {p.source ? <Text style={styles.hintSource}>{'  ·  ' + p.source}</Text> : null}
            </Text>
            <Text style={styles.hintKind}>{hintKindLabel(p.hint.rodzaj)}</Text>
            <Text style={styles.hintText}>{p.hint.hint}</Text>
          </View>
        ))}
      </>
    );
  };

  // ⚠️ PLAN-D-T (T1) — STANY R5 PODPOWIEDZI („nie ma tabeli" / „błąd odczytu" /
  // „pusto") NIE RYSUJĄ JUŻ WŁASNEGO KAFELKA. Rozróżnienie NIE ZGINĘŁO: idzie
  // do konsoli razem z powodem odpowiedzi. Powód jest twardy — te trzy zdania
  // mówiły zawodnikowi o STANIE NASZEJ BAZY („materiały są w przygotowaniu"),
  // czyli o nas, a nie o nim, i zajmowały miejsce jednej odpowiedzi. Gdy nie
  // mamy czego zaproponować, mówi to `BRAK_PROPOZYCJI` — jednym zdaniem,
  // w jednym miejscu.
  const powodBrakuPodpowiedzi =
    hintState.state === 'table_missing' ? HINT_TABLE_MISSING_TEXT
      : hintState.state === 'error' ? HINT_ERROR_TEXT
        : hintState.state === 'empty' ? HINT_EMPTY_TEXT
          : null;

  // PLAN-D-J 08.2026 — CO OBOWIĄZUJE. Decyzja jest czystą funkcją
  // (`lib/ograniczenia.ts`), tu zostaje wyłącznie jej wykonanie.
  // ⚠️ TO NIE DODAJE NA EKRAN ANI JEDNEGO SŁOWA. Karta głosu tygodnia
  // („Wracasz po urazie" / „Zmieniła się Twoja sytuacja") już mówi zawodnikowi,
  // co się dzieje. To ZDEJMUJE z ekranu to, co w tych stanach jest wyrzutem:
  // licznik zrobionych sesji, zaproszenie do planowania i rekomendację.
  const widokDzis = coPokazacNaDzis(ograniczenia);

  // ═══════════════════════════════════════════════════════════════════
  // PLAN-D-T 08.2026 (13.08.2026), zadanie T1 — JEDNA ODPOWIEDŹ.
  // Decyzja jest CZYSTĄ FUNKCJĄ (`lib/jednaOdpowiedz.ts`); ten ekran ją
  // WYKONUJE, nie podejmuje. Wszystkie trzy części biorą się z rzeczy, które
  // ekran już miał — zero nowych zapytań do bazy.
  // ═══════════════════════════════════════════════════════════════════
  const odpowiedz = zbudujJednaOdpowiedz({
    widok: widokDzis,
    laduje: loading,
    maGardlo: !!priorityGoal,
    etykietaGardla: goalSegmentLabel,
    maAktywnyBlok: !!workProgress,
    nowaPorcjaCzeka: newDoseWaiting,
    rekomendacja: { jest: !!focusRec && !!currentUser, powiazanaZGardlem: isRecLinkedToGoal },
    podpowiedz: hintState,
    // ⚠️ Osłona liczona z DWÓCH kluczy naraz (`czyOslonaAktywna`), nigdy
    // z samego `blokNieZwiekszaObjetosci` — bo ten zapala także kontuzja,
    // a wtedy zdanie „Twój Blok nie zwiększa objętości" sugerowałoby wzrost
    // komuś, kto leży z urazem. To jest Z0.
    oslona: czyOslonaAktywna(ograniczenia),
  });

  // ⚠️ ROZRÓŻNIENIE R5 NIE ZGINĘŁO — ZESZŁO DO KONSOLI. „Nie ma tabeli",
  // „błąd odczytu" i „pusto" to nadal trzy różne rzeczy i nadal da się je
  // odróżnić przy pytaniu „dlaczego ekran wyglądał wtedy tak". Przestały być
  // trzema różnymi zdaniami NA EKRANIE, bo mówiły zawodnikowi o stanie NASZEJ
  // bazy („materiały dla tego obszaru są w przygotowaniu"), a nie o jego
  // pracy — i zajmowały miejsce jednej odpowiedzi.
  if (powodBrakuPodpowiedzi) console.log(`dzis: podpowiedź niedostępna — ${powodBrakuPodpowiedzi}`);
  console.log(`dzis: jedna odpowiedź — ${odpowiedz.powod}`);

  // PLAN-D-T (T6) — KTÓRA TO PUSTKA w karcie „Dziś w kalendarzu".
  // ⚠️ `planLekcjiZnany: null` — planu lekcji nie ma w bazie (zmierzone
  // 14.08.2026: zero tabel %school% / %szkol% / %lesson%), więc gałąź
  // „brak konfiguracji" jest nieosiągalna. Włącza ją pas A3.
  const pustkaDzis = rozpoznajPustke({
    maWpisy: todayEvents.length > 0,
    planLekcjiZnany: null,
    moznaZapisywac,
    zakres: 'dzis',
  });
  if (pustkaDzis) console.log(`dzis: ${opisPustkiDoLogu(pustkaDzis)}`);

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
        {/* PIERWSZE URUCHOMIENIE 10.08.2026 — kafelek prowadzi do diagnozy,
            dopóki zawodnik nie ma ani diagnozy, ani Celu. Patrz `showFirstStep`
            wyżej i komentarz przy `hasDiagnosis` na górze pliku. */}
        <TouchableOpacity style={styles.heroGoal} onPress={() => router.push(showFirstStep ? '/diagnoza' : '/cele')}>
          {/* W1: krecha 12° — motyw ścięcia z logo, karta „to jest o Tobie" */}
          <View style={styles.heroStripe} />
          {/* PLAN-D-A 08.2026 — kafelek pokazuje `goals`, czyli WĄSKIE GARDŁO
              (miesiące), a nie CEL (lata). Słowo „Cel" jest w produkcie
              zarezerwowane dla kierunku na lata — patrz lib/labels.ts. */}
          <Text style={styles.heroEyebrow}>{showFirstStep ? 'Twój pierwszy krok' : 'Nad czym pracujesz'}</Text>
          {/* WIEDZA B4 08.08.2026 — dług N2 (znalezisko B18, otwarte od rundy 2).
              Bez tego zawodnik przy pierwszym wejściu widział przez ułamek
              sekundy „Nie masz jeszcze Celu" — zdanie nieprawdziwe dla większości
              zalogowanych. Patrz nagłówek pliku. */}
          {loading ? (
            <Text style={styles.heroLoading}>Wczytuję…</Text>
          ) : showFirstStep ? (
            /* Brzmienie zatwierdzone przez Kubę 10.08.2026 */
            <>
              <Text style={styles.heroTitle}>Zacznij od diagnozy</Text>
              <Text style={styles.heroFirstStepBody}>
                Odpowiadasz na pytania o swoją grę, a system pokazuje, co ogranicza Cię dziś
                najbardziej. Z wyniku sam wskaże Ci pierwsze wąskie gardło — nie musisz zgadywać.
              </Text>
              <Text style={styles.heroAction}>Zrób diagnozę →</Text>
            </>
          ) : priorityGoal ? (
            <>
              <Text style={styles.heroTitle} numberOfLines={1}>{goalSegmentLabel}</Text>

              {/* Wskaźnik PRACY, nie upływu czasu (JEDNA DROGA B2 08.08.2026).
                  NAWIGACJA B3 08.08.2026 — skrócony do brzmienia z decyzji B5:
                  „3 z 6 sesji zrobione". Słowa „Bloku Skupienia" zeszły razem
                  z resztą kontekstu do szczegółów Celu; pod nazwą Celu nie ma
                  wątpliwości, o jakich sesjach mowa. */}
              {/* ⚠️ PLAN-D-T 08.2026 (13.08.2026), zadanie T1 — Z TEGO KAFELKA
                  ZNIKNĘŁY DWA WEZWANIA DO PRACY: „Nowa porcja w Twoim Bloku →"
                  i „Zaplanuj Blok →". Oba były rzeczami DO ZROBIENIA, wypowiadanymi
                  przez kafelek, który miał mówić wyłącznie, NAD CZYM zawodnik
                  pracuje. To był pierwszy z sześciu producentów mówiących naraz.
                  Oba brzmienia przeniosły się CO DO ZNACZENIA do jednej odpowiedzi
                  (`lib/jednaOdpowiedz.ts`, stałe BLOK_NOWA_PORCJA
                  i ZAPROSZENIE_ZAPLANUJ_BLOK) — nie zginęły, zmieniły miejsce
                  na to, w którym zawodnik szuka odpowiedzi „co dziś zrobić".
                  ⚠️ KAFELEK ZOSTAJE PIERWSZY (decyzja Kuby z 06.08.2026) i nadal
                  jest w całości przyciskiem do szczegółów wąskiego gardła. */}
              {workProgress && widokDzis.pokazacPostepPracy ? (
                <>
                  <Text style={styles.workText}>
                    {workProgress.done} z {workProgress.total} sesji zrobione
                  </Text>
                  <View style={styles.workTrack}>
                    <View style={[styles.workFill, { width: `${Math.round((workProgress.done / workProgress.total) * 100)}%` }]} />
                  </View>
                </>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.heroTitle}>Nie masz jeszcze wąskiego gardła</Text>
              <Text style={styles.heroAction}>Wskaż pierwsze wąskie gardło →</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════════════════════
            PLAN-D-T 08.2026 (13.08.2026), zadanie T3 — PORZĄDEK EKRANU
            WYNIKA ZE STANU.

            REGUŁA: element, który stan WYCISZA, nie może stać wyżej niż
            karta MÓWIĄCA o wyciszeniu.

            Do tej rundy było odwrotnie: jedna odpowiedź (wtedy: sekcja
            „Co dziś zrobić") stała NAD kartą głosu tygodnia. Przy kontuzji
            zawodnik widział więc najpierw dziurę po wyciszonej sekcji,
            a dopiero pod nią zdanie „Wracasz po urazie", które tę dziurę
            tłumaczyło. Kolejność kazała mu domyślić się przyczyny, zanim ją
            podaliśmy — i wyglądało to jak awaria, a nie jak decyzja.

            Od tej rundy KARTA GŁOSU I PUNKT POMOCY STOJĄ NAD JEDNĄ
            ODPOWIEDZIĄ. Zysk jest w każdym z pięciu stanów:
              • normalny        — karta głosu zwykle się nie rysuje, więc
                                  jedna odpowiedź i tak jest pierwsza;
              • Osłona          — powód („Blok nie zwiększa objętości") stoi
                                  nad odpowiedzią, która z niego wynika;
              • kontuzja        — „Wracasz po urazie" stoi tam, gdzie ekran
                                  zamilkł, zamiast pod pustym miejscem;
              • ścieżka wyjścia — to samo, plus punkt pomocy tuż pod spodem;
              • cisza           — arbiter policzył i nie ma nic do
                                  powiedzenia; karta się nie rysuje i jedna
                                  odpowiedź jest pierwsza, tak jak w stanie
                                  normalnym.
            ═══════════════════════════════════════════════════════════ */}

        {/* PLAN-D-F 08.2026 — GŁOS TYGODNIA.
            Karta pojawia się WYŁĄCZNIE wtedy, gdy arbiter dał głos jednemu
            z narzędzi osi decyzji. Trzy sytuacje NIE rysują tu niczego i to
            jest zamierzone:
              • CISZA — arbiter policzył i zdecydował, że w tym tygodniu żadne
                narzędzie nie ma nic do powiedzenia. To DECYZJA, nie brak danych;
                zastępczy komunikat („nic nowego") zamieniłby ją w kolejne
                odezwanie i unieważnił cały budżet uwagi;
              • brak wiersza — cron jeszcze nie policzył tego tygodnia;
              • błąd odczytu — powód idzie do konsoli, nie na ekran.
            BLOK też nie dostaje karty: ma już kafelek na górze ekranu. */}
        {/* ⚠️ PLAN-D-P 08.2026 (13.08.2026) — KARTA GŁOSU NIE PROWADZI JUŻ NIGDZIE.
            Od 12.08.2026 (zadanie I1) miała jedno wejście: „Otwórz Kalibrację".
            Kalibracja została usunięta z produktu w całości
            (claude/DECYZJA_KALIBRACJA_USUNIETA_13_08_2026.md), a była JEDYNYM
            głosem, który miał dokąd prowadzić — pozostałe cztery były kartami
            bez dotknięcia świadomie (exit i injury mają punkt pomocy, growth
            i compass nie mają ekranu, do którego dałoby się prowadzić).
            Dlatego `wejscieZKarty()` zniknęło razem z nią, zamiast zostać
            funkcją, która ZAWSZE zwraca `null` — martwa funkcja wygląda
            następnym razem jak defekt do naprawienia, a nie jak decyzja. */}
        {pokazacKarte(glos) && glos.rodzaj === 'glos' && (
          <View style={{ marginTop: 24 }}>
            <View style={styles.glosCard}>
              <View style={styles.glosStripe} />
              <Text style={styles.glosTytul}>{glos.tytul}</Text>
              <Text style={styles.glosTresc}>{glos.tresc}</Text>
            </View>
          </View>
        )}

        {/* ZADANIE E2 12.08.2026 — PUNKT POMOCY WYŻEJ W DWÓCH STANACH.
            Kontuzja i ścieżka wyjścia trwają tygodniami i w obu zawodnik ma
            powód czuć się poza drużyną. W tych dwóch — i TYLKO w tych dwóch —
            numer przysuwa się bliżej, zamiast czekać, aż ktoś go poszuka
            w zakładce „Ja".
            ⚠️ To jest podniesienie WIDOCZNOŚCI, nie powiadomienie: nic nie
            wysyła, nic nie zapisuje, nikogo nie zawiadamia — ani rodzica, ani
            trenera (claude/R2a_SCIEZKA_ESKALACJI_KRYZYS_11_08_2026.md).
            ⚠️ I nie jest klasyfikatorem ryzyka: reaguje na dwa JAWNE stany,
            nie na treść wpisów zawodnika. */}
        {podniescPunktPomocy(glos) && (
          <TouchableOpacity
            style={[styles.card, styles.pomocCard, { marginTop: 12 }]}
            onPress={otworzPunktPomocy}
            accessibilityRole="button"
          >
            <Text style={styles.cardLabel}>{POMOC_PRZYCISK}</Text>
            <Text style={styles.pomocPodpis}>{POMOC_WIERSZ_PODPIS}</Text>
          </TouchableOpacity>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PLAN-D-T 08.2026 (13.08.2026), zadanie T1 — JEDNA ODPOWIEDŹ.

            TU STAŁY TRZY NIEZALEŻNE KARTY: kafelek Bloku (jego wezwania do
            pracy), karta rekomendacji i podpowiedź dnia. Każda powstała
            w innej rundzie i żadna nie wiedziała o pozostałych. Teraz jest
            JEDNA ODPOWIEDŹ o trzech częściach:

                CO DZIŚ ZROBIĆ · DLACZEGO AKURAT TO · CO TO ZMIENI

            ⚠️ TO NIE JEST CZWARTA KARTA OBOK TRZECH. Kafelek stracił oba
            wezwania, podpowiedź dnia przestała być osobnym kafelkiem, a stany
            R5 („nie ma tabeli" / „błąd" / „pusto") przestały rysować własny
            komunikat o stanie NASZEJ bazy. Elementów na ekranie jest MNIEJ,
            nie więcej — i to jest kryterium tej rundy.

            ⚠️ „CO TO ZMIENI" JEST PUSTE W ~93% PRZYPADKÓW I TAK MA BYĆ:
            wychodzi wyłącznie, gdy istnieje dowód Z ŹRÓDŁEM (zmierzone
            14.08.2026: `component_hints.dowody` wypełnione w 21 z 297 wierszy).
            Wypełniacz w rodzaju „to pomoże Ci się rozwijać" łamałby Z0.
            ═══════════════════════════════════════════════════════════ */}
        {odpowiedz.pokazac && (
          <View style={{ marginTop: 24 }}>
            <View style={styles.odpowiedzCard}>
              <View style={styles.odpowiedzStripe} />

              {/* ── CZĘŚĆ 1: CO DZIŚ ZROBIĆ — DOKŁADNIE JEDNA RZECZ ───── */}
              <Text style={styles.odpowiedzNaglowek}>{NAGLOWEK_CO_ZROBIC}</Text>
              {odpowiedz.coZrobic.zrodlo === 'rekomendacja' && focusRec && currentUser ? (
                /* Treść i przyciski niesie TEN SAM komponent, który renderuje
                   Centrum decyzji — zero drugiej kopii kodu karty. To jedyna
                   akcja decyzyjna na tym ekranie i dlatego rekomendacja, gdy
                   istnieje, jest ważniejsza od zdania z materiału. */
                <RecommendationCard
                  rec={focusRec}
                  currentUserId={currentUser.id}
                  isUnread={unreadSnapshotRef.current.has(focusRec.id)}
                  headerSlot={null}
                  footerSlot={null}
                  onSubmitted={load}
                />
              ) : (
                <Text style={styles.odpowiedzTresc}>{odpowiedz.coZrobic.tekst}</Text>
            )}

              {/* Jedno dotknięcie prowadzi tam, gdzie ta jedna rzecz się dzieje.
                  ⚠️ Trasa wynika ZE ŹRÓDŁA odpowiedzi, nie z osobnej decyzji
                  ekranu — dzięki temu nie da się pokazać zdania o Bloku
                  i wysłać zawodnika do wąskich gardeł. */}
              {odpowiedz.coZrobic.zrodlo === 'blok' || odpowiedz.coZrobic.zrodlo === 'zaproszenie' ? (
                <TouchableOpacity style={styles.inlineLink} onPress={() => router.push('/cele')}>
                  <Text style={styles.cardAction}>{odpowiedz.coZrobic.tekst} →</Text>
                </TouchableOpacity>
              ) : null}

              {/* ── CZĘŚĆ 2: DLACZEGO AKURAT TO — JEDNO ZDANIE ────────── */}
              {/* ⚠️ `null` znaczy „nie mam uzasadnienia, którego bym nie zmyślił".
                  Zmyślone uzasadnienie jest gorsze niż jego brak, bo brzmi
                  wiarygodnie. Dlatego ta część potrafi zniknąć w całości. */}
              {odpowiedz.dlaczego ? (
                <View style={styles.odpowiedzCzesc}>
                  <Text style={styles.odpowiedzNaglowek}>{NAGLOWEK_DLACZEGO}</Text>
                  <Text style={styles.odpowiedzDlaczego}>{odpowiedz.dlaczego}</Text>
                </View>
              ) : null}

              {/* ── CZĘŚĆ 3: CO TO ZMIENI — TYLKO Z DOWODEM I ŹRÓDŁEM ─── */}
              {/* ⛔ Tej części NIE DA SIĘ zbudować bez źródła: pilnuje tego typ
                  `CoToZmieni` w lib/jednaOdpowiedz.ts, nie ten komentarz. */}
              {odpowiedz.coToZmieni ? (
                <View style={styles.odpowiedzCzesc}>
                  <Text style={styles.odpowiedzNaglowek}>{NAGLOWEK_CO_ZMIENI}</Text>
                  <Text style={styles.odpowiedzDowod}>{odpowiedz.coToZmieni.tekst}</Text>
                  <Text style={styles.hintSource}>{odpowiedz.coToZmieni.zrodlo}</Text>
                </View>
              ) : null}

              {/* Treść ZAWSZE WIDOCZNA (bezpieczeństwo) — NIE jest podpowiedzią
                  dnia i nie konkuruje z jedną odpowiedzią. Stoi na dole tej samej
                  karty, żeby nie stać się kolejnym kafelkiem. */}
              {renderTrescZawszeWidoczna()}
            </View>

            {/* Jedyne wyjście do reszty rekomendacji. Zostaje, bo jest DROGĄ,
                nie treścią — i dlatego nie liczy się jako drugi producent. */}
            {hasAnyGoal ? (
              <TouchableOpacity style={styles.inlineLink} onPress={() => router.push('/centrum-decyzji')}>
                <Text style={styles.cardAction}>{allRecsLinkLabel}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.inlineLink} onPress={() => router.push(showFirstStep ? '/diagnoza' : '/cele')}>
                <Text style={styles.cardAction}>{showFirstStep ? 'Zrób diagnozę →' : 'Przejdź do wąskich gardeł →'}</Text>
              </TouchableOpacity>
          )}
          </View>
        )}

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
            {/* ⚠️ PLAN-D-T 08.2026 (14.08.2026), zadanie T6 — TRZY PUSTKI.
                Stało tu jedno zdanie („Nic zaplanowanego na dziś.") na trzy
                różne sytuacje. Zawodnik z wygasłym dostępem czytał, że nic nie
                ma — zamiast dowiedzieć się, że produkt przestał przyjmować
                jego wpisy. */}
            {pustkaDzis ? (
              <>
                <Text style={styles.cardBody}>{pustkaDzis.tekst}</Text>
                <Text style={styles.cardAction}>{pustkaDzis.cta} →</Text>
              </>
            ) : (
              todayEvents.map((e) => {
                // ⚠️ PLAN-D 14.08.2026 — DO DZIŚ STAŁO TU
                // `EVENT_TYPE_LABELS[e.event_type] || e.event_type`.
                // Rodzaj spoza piątki znanej appce (dołożony do CHECK-a w bazie
                // i nie dołożony tutaj) pokazywał się zawodnikowi jako SUROWA
                // WARTOŚĆ Z KOLUMNY — „club_training" wygląda jak etykieta, więc
                // nikt nigdy nie zgłosiłby, że etykiety brakuje. Reguła R5: brak
                // wiedzy ma mieć własny, jawny stan, a nie udawać wiedzę.
                const opisRodzaju = opiszRodzaj(e.event_type);
                if (!opisRodzaju.znany) console.warn(opisNieznanegoRodzajuDoLogu(opisRodzaju));
                return (
                  <Text key={e.id} style={styles.eventLine}>
                    <Text style={styles.eventTitle}>{e.title}</Text>
                    {'  ·  '}
                    {opisRodzaju.znany ? EVENT_TYPE_LABELS[opisRodzaju.id] : opisRodzaju.komunikat}
                  </Text>
                );
              })
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
  // W1: nadtytuły/etykiety sekcji na ink3 (koncepcja: ink3 = podpisy, nadtytuły)
  eyebrow: { ...typography.bodyMedium, fontSize: 12, letterSpacing: 1, textTransform: 'capitalize', color: colors.textTertiary, marginBottom: 4 },
  title: { ...typography.display, fontSize: 32, marginBottom: spacing.lg, color: colors.textPrimary },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 16, marginBottom: 10 },
  cardMuted: { opacity: 0.7 },
  // PLAN-D-F 08.2026 — karta głosu tygodnia. Ta sama rodzina co `card`,
  // z krechą 12° jak hero: to jest zdanie o zawodniku, nie pozycja listy.
  glosCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 16, overflow: 'hidden' },
  glosStripe: { ...skew.stripe, height: 6, backgroundColor: colors.brand, marginBottom: 12 },
  glosTytul: { ...typography.bodySemiBold, fontSize: 17, color: colors.textPrimary, marginBottom: 6 },
  glosTresc: { ...typography.body, fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  // PLAN-D-I 08.2026 — wejście z karty głosu tygodnia (I1). Te same wartości
  // co `cardAction`: to jest ta sama rzecz co „zobacz" na innych kartach,
  // więc nie ma powodu, żeby wyglądała inaczej.
  // ZADANIE E2 12.08.2026 — wiersz punktu pomocy.
  pomocCard: { borderColor: colors.brand },
  pomocPodpis: { ...typography.body, fontSize: 12, color: colors.textTertiary, lineHeight: 17 },
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
  // W1: prosta krecha borderLeft → krecha ŚCIĘTA 12° (transform, nie obrazek;
  // koncepcja 08.2026, komponent 1 — wyłącznie karty „to jest o Tobie").
  // Absolutna, więc wysokość hero bez zmian (~101 dp, rachunek wyżej aktualny).
  heroGoal: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: 12, paddingLeft: 24, paddingRight: 16, marginBottom: 4,
  },
  heroStripe: { ...skew.stripe, height: 44, backgroundColor: colors.brand },
  heroEyebrow: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 4 },
  heroTitle: { ...typography.displayExtraBold, fontSize: 21, color: colors.textPrimary, marginBottom: 6 },
  heroAction: { ...typography.bodyMedium, fontSize: 13, color: colors.brand },
  // WIEDZA B4 08.08.2026 — dług N2. Wysokość dobrana tak, żeby stan ładowania
  // NIE był wyższy niż stan docelowy (21 px nazwa + 6 marginesu + 13 px wskaźnik
  // + 5 + 4 pasek ≈ 49 dp; tu 20 + 5 + 4 + 20 = 49). Ekran nie skacze w dół,
  // gdy dane dojdą — a to jest cały sens tego stanu.
  heroLoading: { ...typography.body, fontSize: 15, lineHeight: 20, color: colors.textSecondary, marginBottom: 29 },
  // PIERWSZE URUCHOMIENIE 10.08.2026 — jedyny akapit opisowy w tym kafelku.
  // Te same wartości co `heroBody` w zakładce „Ja", żeby oba ekrany pierwszego
  // uruchomienia czytały się jak jeden głos.
  heroFirstStepBody: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: 4, marginBottom: 10 },
  // JEDNA DROGA B2 08.08.2026 — wskaźnik pracy.
  workText: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary, marginBottom: 5 },
  // W1: ścięty koniec paska postępu (motyw 12°) — skewX na wypełnieniu,
  // lewa krawędź prostowana clipem toru (overflow hidden). Wysokość bez zmian.
  workTrack: { height: 4, borderRadius: 2, backgroundColor: colors.track, overflow: 'hidden' },
  workFill: { height: 4, backgroundColor: colors.brand, transform: [{ skewX: skew.angle }] },
  // ═══════════════════════════════════════════════════════════════
  // PLAN-D-T 08.2026 (13.08.2026), zadanie T1 — JEDNA ODPOWIEDŹ.
  //
  // Ta sama rodzina co `glosCard` i `heroGoal`: krecha 12° z logo, bo to jest
  // karta „to jest o Tobie", a nie pozycja listy. ⚠️ ŚWIADOMIE JEDNA RAMKA
  // NA TRZY CZĘŚCI — gdyby każda część miała własną, na ekranie stałyby trzy
  // kafelki zamiast trzech akapitów jednej odpowiedzi, czyli dokładnie to,
  // co ta runda likwiduje.
  odpowiedzCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, padding: 16, overflow: 'hidden',
  },
  odpowiedzStripe: { ...skew.stripe, height: 6, backgroundColor: colors.brand, marginBottom: 12 },
  // Nadtytuły trzech części. Te same wartości co `sectionLabel`, bo to JEST
  // etykieta sekcji — tyle że wewnątrz karty, nie nad nią.
  odpowiedzNaglowek: {
    ...typography.bodyMedium, fontSize: 11, letterSpacing: 1,
    textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6,
  },
  // Jedna rzecz do zrobienia. Największy tekst w karcie — bo to jest
  // odpowiedź na pytanie, z którym zawodnik na ten ekran wchodzi.
  odpowiedzTresc: { ...typography.bodySemiBold, fontSize: 16, lineHeight: 23, color: colors.textPrimary },
  odpowiedzCzesc: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  odpowiedzDlaczego: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  odpowiedzDowod: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textPrimary, marginBottom: 4 },
  // WIEDZA B4 08.08.2026 — PODPOWIEDŹ Z MATERIAŁU.
  // ⚠️ PLAN-D-T 08.2026 — od tej rundy `hintBox` rysuje WYŁĄCZNIE treść
  // ZAWSZE WIDOCZNĄ (bezpieczeństwo, m.in. telefon zaufania). Podpowiedź dnia
  // weszła do jednej odpowiedzi i nie ma już własnego kafelka.
  // Kreska u góry zamiast własnej ramki: to jest część TEJ karty, a nie druga
  // karta pod nią. Zawodnik ma przeczytać „to należy do tej rekomendacji", nie
  // „doszedł kolejny kafelek".
  hintBox: {
    marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  hintEyebrow: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6 }, // W1: ink3
  // Źródło w kolorze marki — to JEDYNA rzecz na tym ekranie, która mówi
  // zawodnikowi, że zdanie obok pochodzi z konkretnej strony konkretnej książki,
  // a nie z generatora. Dlatego nie jest szare.
  hintSource: { ...typography.bodySemiBold, color: colors.brand, letterSpacing: 0.5 },
  hintKind: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary, marginBottom: 4 },
  hintText: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textPrimary },
  // Stan „nie mam skąd wziąć" (reguła R5) — spokojny, szary, JAWNY. Nigdy pustka.
  hintQuiet: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  inlineLink: { minHeight: minTouchHeight, justifyContent: 'center' },
  eventLine: { ...typography.body, fontSize: 14, color: colors.textPrimary, marginBottom: 6, lineHeight: 20 },
  eventTitle: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary },
});
