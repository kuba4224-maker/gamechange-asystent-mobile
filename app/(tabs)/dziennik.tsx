// Ekran DZIENNIK — Krok 6 checklisty. Implementacja wg
// docs/KONTRAKT_DZIENNIK.md (spisanego z panel-dziennik w asystent_app.html).
//
// AUDYT 27.07.2026: `useEffect` -> `useFocusEffect` (ekran nie odmontowuje
// się przy przełączaniu zakładek, więc bez tego historia wpisów nie
// odświeżyłaby się po powrocie z innej zakładki) + `RefreshControl`
// (standardowy natywny gest "pociągnij żeby odświeżyć" — czego web w ogóle
// nie ma, ale użytkownik appki mobilnej będzie go instynktownie próbował).
import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import ScalePicker from '../../components/ScalePicker';
import { toLocalDateStr } from '../../lib/date-utils';
// ZAPIS B7 08.08.2026 (SEDNO RUNDY 7) — dziennik zasila wskaźnik Celu:
// logika pytania o sesję Bloku jest czysta i ma własny selftest.
import {
  pickBlockSessionToConfirm,
  blockSessionQuestion,
  journalSavedMessage,
  BLOCK_LINK_YES_LABEL,
  BLOCK_LINK_NO_LABEL,
  type LinkableCalendarEvent,
  // PLAN-D-A1 08.2026 — znacznik wykonania sesji (pochodna powiązania).
  decideSessionCompletion,
  completionFailureLog,
  completionNoRowsLog,
} from '../../lib/focusBlockJournalLink';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';
// JEDNA DROGA B2 08.08.2026 — jedno źródło nazw lokalizacji bólu.
import { BODY_LOCATIONS, BODY_LOCATION_LABELS, NON_LATERAL_LOCATIONS } from '../../lib/labels';
// DODANE 06.08.2026 — kolorowanie suwaków + wariant "bateria" dla energii,
// patrz lib/scale-colors.ts dla pełnego uzasadnienia per funkcja.
import { higherIsBetterColor, higherIsWorseColor, sleepHoursColor, neutralIntensityColor } from '../../lib/scale-colors';
// PLAN-D-K 08.2026 (13.08.2026) — rozpoznanie odmowy dostępu (RLS, kod 42501)
// i zdanie, które zawodnik wtedy czyta. ⚠️ BRZMIENIE DO PRZEJRZENIA PRZEZ KUBĘ.
import { toJestBrakDostepu, ZAPIS_ODRZUCONY_BRAK_DOSTEPU } from '../../lib/dostepKonta';
// ⭐ PLAN-D-C3 15.08.2026 — trzy pustki na ścieżkach odczytu tego ekranu.
import { rozpoznajPustke, opisBleduOdczytuDoLogu } from '../../lib/trzyPustki';
// ⭐ PLAN-D PAS T2 19.08.2026 — OKNO PORANKA DO 12:00 (decyzja Kuby z 17.08:
// „nie można wypełniać ankiety wstecz. To byłoby nierzetelne"). Cała reguła
// i cały jej powód stoją w `lib/oknoPoranka.ts`; ten ekran jej UŻYWA i nigdzie
// nie porównuje godziny sam.
import {
  czyOknoPorankaOtwarte,
  powodOdmowyZapisuPoranka,
  OKNO_PORANKA_ZAMKNIETE_ZDANIE,
  // ⭐ PLAN-D PAS D3 21.08.2026 — CZTERY STANY ANKIETY, NIE DWA (R5).
  // Zgłoszone przez pas T2 (§7.4) i przez niego NIEZROBIONE: do 21.08 zawodnik,
  // który wypełnił ankietę rano, widział po 12:00 DOKŁADNIE to samo, co ten,
  // któremu przepadła. Cała reguła stoi w `lib/oknoPoranka.ts`; ten ekran ją
  // WYKONUJE i nigdzie nie rozstrzyga sam.
  stanAnkietyPorannej,
  ANKIETA_PORANNA_WYPELNIONA_ZDANIE,
  ANKIETA_PORANNA_STAN_NIEZNANY_ZDANIE,
  type OdczytDzisiejszegoWpisu,
} from '../../lib/oknoPoranka';
// ⭐⭐ PLAN-D PAS D3 21.08.2026 — NAKŁADKA, KTÓRA NIE ZABIERA Z EKRANU.
// ⛔ `components/Arkusz.tsx` jest `Modal`-em, czyli osobnym drzewem NAD ekranem:
// stoi POZA `ScrollView`, więc jego treść kosztuje ekran ZERO dp. To jest
// prawda o React Native, nie pomiar urządzenia — i miara `lib/wysokoscEkranu.ts`
// liczy to tak samo, więc zapadka i ekran mówią jedno.
import Arkusz from '../../components/Arkusz';
import type { NaglowekArkusza } from '../../lib/arkusz';

// JEDNA DROGA B2 08.08.2026 — lokalne kopie 17 lokalizacji bólu, ich mapy nazw
// i listy lokalizacji bez strony ciała usunięte; wszystkie trzy pochodzą teraz
// z lib/labels.ts. Były w trzech identycznych kopiach (dziennik.tsx, mecz.tsx,
// profil.tsx) — treść niezmieniona co do znaku, porównana maszynowo.
const SESSION_TYPE_LABELS: Record<string, string> = {
  club_training: 'Trening klubowy', own_training: 'Trening własny',
  micro_session: 'Mikro-sesja', match: 'Mecz', other: 'Inne',
};

// ═════════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-E2 08.2026 (15.08.2026) — SUROWA WARTOŚĆ Z BAZY NIE WYCHODZI
// NA EKRAN JAKO NAZWA
//
// DO 15.08.2026 W TYM PLIKU STAŁY DWA WYWOŁANIA TEGO SAMEGO WZORCA:
//   SESSION_TYPE_LABELS[row.session_type] ?? row.session_type
//   BODY_LOCATION_LABELS[pe.body_location] ?? pe.body_location
// Wartość z kolumny renderowana zawodnikowi jako etykieta. „club_training"
// wygląda jak nazwa, więc nikt nigdy nie zgłosi, że nazwy brakuje — reguła R5
// łamana po cichu. Ten sam wzorzec pas A7 usunął z `kalendarz.tsx` i `dzis.tsx`.
//
// ⚠️ DLACZEGO NIE `opiszRodzaj()` Z `lib/meczWKalendarzu.ts` — ZMIERZONE,
// NIE ZAŁOŻONE. Polecenie pasa E2 kazało podpiąć tamtą funkcję „co do znaku
// jak w dzis.tsx". Zapytanie do `pg_constraint` 15.08.2026 (projekt
// kqrbztsvepjtggjmmcdx) pokazuje, że to są DWIE RÓŻNE DZIEDZINY:
//
//   daily_logs_session_type_check      → club_training, own_training,
//                                        micro_session, match, other
//   chk_calendar_events_event_type     → club_training, own_training,
//                                        micro_session, match, task
//
// Cztery wartości wspólne, po jednej własnej z każdej strony. `opiszRodzaj`
// zna `task` (którego `session_type` nie przyjmie) i NIE ZNA `other` —
// a `other` podaje zawodnikowi Picker w tym pliku, kilkadziesiąt linii niżej,
// pod nazwą „Inne". Podpięcie tamtej funkcji tutaj zamieniłoby poprawną
// etykietę „Inne" w komunikat „Nie znam tego rodzaju wydarzenia" — czyli
// produkt przestałby rozumieć wartość, którą sam przed chwilą zapisał.
// To jest defekt WIĘKSZY niż ten, który polecenie kazało naprawić, i osiągalny
// dziś, bez żadnej zmiany w bazie. Asercja `(E2-6)` w
// `lib/meczWKalendarzu.selftest.ts` trzyma ten pomiar maszynowo.
//
// Zostaje więc KSZTAŁT rozstrzygnięcia z `opiszRodzaj` — dwie gałęzie plus
// ślad w konsoli — a dziedzina pochodzi z tego słownika, który ten ekran
// naprawdę rysuje. ⛔ Słowników NIE SCALAM: polecenie mówi wprost, że to
// osobna decyzja o brzmieniach.
// ═════════════════════════════════════════════════════════════════════

type OpisWartosci =
  | { znany: true; etykieta: string }
  | { znany: false; surowy: string; komunikat: string };

/**
 * Rozstrzyga, czy dla wartości z bazy mamy słowo.
 *
 * ⛔ Przy braku NIE oddaje surowej wartości jako nazwy — oddaje jawny stan
 * „nie znam", żeby ekran miał co narysować, a autor po czym poznać, że baza
 * urosła o wartość, której appka nie zna.
 *
 * ⚠️ Zbiór znanych wartości bierze się z SAMEGO SŁOWNIKA, a nie z osobnej
 * listy obok niego. Dwie listy, które trzeba trzymać zgodne ręcznie, rozjadą
 * się przy pierwszej zmianie — i to jest ta klasa błędu, która robi to cicho.
 */
function opiszWartoscZeSlownika(
  slownik: Record<string, string>, wartosc: unknown, komunikat: string,
): OpisWartosci {
  if (typeof wartosc === 'string' && Object.prototype.hasOwnProperty.call(slownik, wartosc)) {
    return { znany: true, etykieta: slownik[wartosc] };
  }
  const surowy = typeof wartosc === 'string' ? wartosc : String(wartosc);
  return { znany: false, surowy, komunikat };
}

// ⚠️⚠️ DWA NOWE BRZMIENIA WIDOCZNE DLA ZAWODNIKA — DO PRZEJRZENIA PRZEZ KUBĘ.
// Zbudowane co do sensu jak „Nie znam tego rodzaju wydarzenia" z pasa A7.
const NIEZNANY_RODZAJ_SESJI = 'Nie znam tego rodzaju sesji';
const NIEZNANE_MIEJSCE_BOLU = 'Nie znam tego miejsca';

function opiszRodzajSesji(wartosc: unknown): OpisWartosci {
  return opiszWartoscZeSlownika(SESSION_TYPE_LABELS, wartosc, NIEZNANY_RODZAJ_SESJI);
}

function opiszMiejsceBolu(wartosc: unknown): OpisWartosci {
  return opiszWartoscZeSlownika(BODY_LOCATION_LABELS, wartosc, NIEZNANE_MIEJSCE_BOLU);
}

/** Tekst do konsoli — ma nazwać kolumnę i wartość, której appka nie rozumie. */
function opisNieznanejWartosciDoLogu(
  kolumna: string, opis: OpisWartosci, znane: string[],
): string | null {
  if (opis.znany) return null;
  return `[PLAN-D-E2] ${kolumna} = „${opis.surowy}" — poza wartościami znanymi appce `
    + `(${znane.join(', ')}). Wiersz jest w bazie i zawodnik widzi go bez nazwy.`;
}

// NAPRAWA 05.08.2026: klawiatura decimal-pad na polskim locale (iOS/Android)
// pokazuje przecinek jako separator dziesiętny, nie kropkę — Number("6,25")
// to NaN. NaN wysłany do Supabase (JSON.stringify) zamienia się w jawny JSON
// null zamiast brakującego klucza, co narusza CHECK chk_daily_logs_payload_ranges
// w bazie (jsonb null to nie to samo co SQL NULL, więc "payload->'x' IS NULL"
// nie łapie tego przypadku). Ta funkcja akceptuje oba separatory — dziś już
// tylko dla "Czas trwania" (post-training); "Ile godzin spałeś?" od tej samej
// daty niżej to suwak (ScalePicker), więc tam ten problem w ogóle nie może
// wystąpić — wartość zawsze pochodzi z kontrolowanego zakresu (0-12h co 0.5,
// zawężone z 0-24h na prośbę Kuby 06.08.2026, patrz niżej).
function parseLocaleNumber(raw: string): number {
  return Number(raw.trim().replace(',', '.'));
}

// DODANE 06.08.2026 — krótki opis słowny pod suwakiem "poranny poziom energii"
// (wariant "bateria" w ScalePicker), dodatkowa warstwa intuicyjności obok
// koloru. Progi zgrubnie odpowiadają propozycji Kuby z 05.08.2026 ("0-2
// czerwony, 3-4 pomarańczowy, 5-6 żółty, 7+ zielony"), rozszerzonej o piąty,
// najwyższy stopień.
function describeEnergyLevel(energy: number): string {
  if (energy <= 2) return 'Bardzo niski poziom energii';
  if (energy <= 4) return 'Niski poziom energii';
  if (energy <= 6) return 'Średni poziom energii';
  if (energy <= 8) return 'Dobry poziom energii';
  return 'Bardzo wysoki poziom energii';
}

// ZAPIS B7 08.08.2026 — `focusBlockId`/`scheduledDate` potrzebne do pytania
// „czy to była sesja Bloku" i do komunikatu sukcesu; picker ich nie pokazuje.
type CalendarLinkOption = { id: number; label: string; focusBlockId: string | null; scheduledDate: string };
type HistoryRow = {
  id: number; created_at: string; entry_type: 'morning' | 'post_training';
  session_type: string | null; payload: any; pain_entries: any[];
};

// ═══════════════════════════════════════════════════════════════════
// ⭐⭐ D3 — SZEŚĆ ARKUSZY TEGO EKRANU I ICH NAGŁÓWKI
// ═══════════════════════════════════════════════════════════════════
// ⛔ ZERO NOWYCH SŁÓW WIDOCZNYCH DLA ZAWODNIKA. Tytuł każdego arkusza to
// DOKŁADNIE ten napis, który stał nad tą rzeczą, kiedy leżała na ekranie —
// co do znaku, razem z nawiasem i zakresem skali. Kicker „Dziennik" też nie
// jest nowy: to `title` tej zakładki w `app/(tabs)/_layout.tsx`.
//
// ⚠️ `RODZAJE_ARKUSZA` w `lib/arkusz.ts` jest listą ZAMKNIĘTĄ i pilnuje jej
// strażnik wymagający wejścia z ekranu „Dziś" dla każdej pozycji. ⛔ Tego
// ekranu tam nie ma, więc dopisanie tu sześciu rodzajów zapaliłoby CUDZĄ
// zapadkę. Dlatego rodzaje arkuszy DZIENNIKA żyją tutaj — tak samo jak
// rodzaje arkuszy meczu żyją w `mecz.tsx` od pasa M2 — a wspólny jest
// KOMPONENT i wspólna reguła („nakładka nie zabiera z ekranu").
//
// ⛔ PODPIS JEST PUSTY WE WSZYSTKICH SZEŚCIU. Każdy z tych arkuszy trzyma
// DOKŁADNIE JEDNĄ rzecz, której własna etykieta jest już jego tytułem;
// zdanie pod tytułem byłoby parafrazą tytułu, czyli nowym słowem bez nowej
// informacji. Arkusze meczu mają podpisy, bo tam jeden arkusz zbiera po
// osiem pól i bez spisu treści nie wiadomo, co w nim jest.
type RodzajArkuszaDziennika =
  | 'nastroj'     // wpis poranny: nastrój / motywacja
  | 'notatka'     // wpis poranny: wolna notatka
  | 'powiazanie'  // wpis potreningowy: powiązanie z wydarzeniem kalendarza
  | 'zmeczenie'   // wpis potreningowy: zmęczenie po treningu
  | 'bol'         // wspólne dla obu wpisów: ból
  | 'historia';   // wspólne dla obu wpisów: historia wpisów

/**
 * ⛔ NAPISY WIERSZY WEJŚCIA I TYTUŁY ARKUSZY POCHODZĄ Z JEDNEGO MIEJSCA.
 * Dwa miejsca to dwa brzmienia do zatwierdzania i dwa, które się rozjadą —
 * a wtedy zawodnik dotyka wiersza „Notatka" i trafia do arkusza „Uwagi".
 */
const NAPIS_ARKUSZA: Record<RodzajArkuszaDziennika, string> = {
  nastroj: 'Nastrój / motywacja (0 = fatalny, 10 = świetny)',
  notatka: 'Notatka (opcjonalnie)',
  powiazanie: 'Powiąż z zaplanowanym wydarzeniem (opcjonalnie)',
  zmeczenie: 'Zmęczenie po treningu (0 = brak, 10 = wykończony)',
  bol: 'Boli Cię dziś coś?',
  historia: 'Historia wpisów',
};

function naglowekArkuszaDziennika(rodzaj: RodzajArkuszaDziennika): NaglowekArkusza {
  return { kicker: 'Dziennik', tytul: NAPIS_ARKUSZA[rodzaj], podpis: '' };
}

export default function DziennikScreen() {
  const { currentUser } = useAuth();
  const [entryType, setEntryType] = useState<'morning' | 'post_training'>('morning');

  // Morning
  // ZMIANA 05.08.2026: było pole tekstowe (string) — zamienione na suwak
  // (ScalePicker), więc stan trzyma teraz liczbę wprost, tak jak reszta pól
  // 0-10 tego formularza (sleepQuality/morningEnergy/moodMotivation niżej).
  const [sleepHours, setSleepHours] = useState<number>();
  const [sleepQuality, setSleepQuality] = useState<number>();
  // ZMIANA 06.08.2026, na prośbę Kuby: było "poranne zmęczenie" (im wyżej tym
  // GORZEJ — jedyny suwak w tym formularzu działający odwrotnie niż reszta,
  // mylący przy wypełnianiu). Appka dziś zbiera i pokazuje ENERGIĘ (im wyżej
  // tym LEPIEJ, spójnie z resztą suwaków) — konwersja z powrotem na
  // `morning_fatigue` dzieje się TUŻ PRZED zapisem (patrz submitDailyLog
  // niżej), żeby nie ruszać `payload.morning_fatigue`, które
  // `api/generate-recommendation.js` już dziś na żywo czyta z założeniem
  // "wyżej = bardziej zmęczony" (drugie repo, gamechange-app) — zero zmian
  // backendu, zero ryzyka dla już zebranych danych testerów.
  const [morningEnergy, setMorningEnergy] = useState<number>();
  const [moodMotivation, setMoodMotivation] = useState<number>();
  const [freeNote, setFreeNote] = useState('');

  // Post-training
  const [sessionType, setSessionType] = useState('club_training');
  const [duration, setDuration] = useState('');
  const [calendarLinkId, setCalendarLinkId] = useState('');
  const [calendarLinkOptions, setCalendarLinkOptions] = useState<CalendarLinkOption[]>([]);
  // ZAPIS B7 08.08.2026 — sesja Bloku, o którą pyta wpis potreningowy,
  // i czy zawodnik już odpowiedział (żeby pytanie nie wracało po „Nie").
  const [blockSession, setBlockSession] = useState<LinkableCalendarEvent | null>(null);
  const [blockPromptAnswered, setBlockPromptAnswered] = useState(false);
  const [rpe, setRpe] = useState<number>();
  const [postFatigue, setPostFatigue] = useState<number>();

  // Ból
  const [hasPain, setHasPain] = useState(false);
  const [painLocation, setPainLocation] = useState<string>(BODY_LOCATIONS[0][0]);
  const [painSide, setPainSide] = useState('');
  const [painIntensity, setPainIntensity] = useState<number>();
  const [painExcludes, setPainExcludes] = useState(false);

  // ⭐⭐ D3 21.08.2026 — WEJŚCIE I TREŚĆ ARKUSZA ŻYJĄ W JEDNYM STANIE.
  // ⛔ TO JEST WARUNEK 3 POLECENIA (kolejność nienegocjowalna): `trescArkusza()`
  // rysuje WYŁĄCZNIE rodzaj, który jest otwarty, a otworzyć go da się wyłącznie
  // wierszem wejścia. Nie istnieje stan tego pliku, w którym pole zeszło
  // z ekranu, a wejścia do niego jeszcze nie ma.
  const [arkusz, setArkusz] = useState<RodzajArkuszaDziennika | null>(null);
  // ⭐⭐ D3 — ODCZYT DZISIEJSZEGO WPISU PORANNEGO, KTÓREGO TEN EKRAN NIGDY NIE ROBIŁ.
  // ⛔ Wartość początkowa to `nieznany`, a nie `niema`: zanim odczyt wróci,
  // produkt NAPRAWDĘ nie wie — i ma to powiedzieć, zamiast zgadywać (R5).
  const [dzisiejszyPoranek, setDzisiejszyPoranek] = useState<OdczytDzisiejszegoWpisu>('nieznany');

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  // ⭐ PLAN-D-C3 15.08.2026 — trzy wartości, nie dwie. `null` = jeszcze nie czytałem.
  const [odczytHistoriiUdanySie, setOdczytHistoriiUdanySie] = useState<boolean | null>(null);

  const populateCalendarLinkSelect = useCallback(async () => {
    if (!currentUser) return;
    const from = new Date(); from.setDate(from.getDate() - 2);
    const to = new Date(); to.setDate(to.getDate() + 1);
    // PLAN-D-A1 08.2026 — TU BYŁA CISZA (R5, zakaz 9).
    //
    // Do 14.08.2026 ta linia brzmiała `const { data } = await supabase…`:
    // błąd odczytu był ODRZUCANY PRZY DESTRUKTURYZACJI, a `data ?? []` niżej
    // zamieniało go w pustą listę. Skutek: nieudany odczyt kalendarza wygląda
    // DOKŁADNIE tak samo jak brak sesji — picker jest pusty, pytanie o sesję
    // Bloku się nie pokazuje, wpis zapisuje się bez powiązania i NIKT (łącznie
    // z autorem kodu) nie ma jak się dowiedzieć, że coś padło.
    //
    // ⚠️ To NIE zmienia niczego, co widzi zawodnik: pusty picker nadal jest
    // pustym pickerem, a Dziennik ma działać także wtedy, gdy kalendarz się
    // nie wczytał. Zmienia się wyłącznie to, że defekt przestaje być niewidoczny.
    const { data, error: calErr } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('status', 'scheduled')
      .gte('scheduled_date', toLocalDateStr(from))
      .lte('scheduled_date', toLocalDateStr(to));
    if (calErr) {
      console.warn('[PLAN-D-A1] Nie udało się wczytać okna kalendarza do Dziennika: '
        + `${calErr.message} (kod ${calErr.code ?? 'brak'}). Picker i pytanie o sesję `
        + 'Bloku będą puste — to NIE znaczy, że zawodnik nie ma zaplanowanych sesji.');
      console.warn(opisBleduOdczytuDoLogu('dziennik.populateCalendarLinkSelect → calendar_events', calErr));
    }
    // ⛔ PLAN-D-C3 15.08.2026 — USUNIĘTE Z `populateCalendarLinkSelect()`:
    //    `(data ?? [])`. Zostaje ten sam skutek widoczny dla zawodnika (pusty
    //    picker; ten ekran NIE stawia przy nim zdania „nie masz zaplanowanych
    //    sesji", więc nie ma tu czego zamieniać na trzy pustki) — ale gałąź
    //    błędu przestaje być wpisana w wyrażenie, w którym da się jej nie
    //    zauważyć. To jest to samo `?? []`, które pas A1 opisał trzy linie
    //    wyżej i którego wtedy nie usunął.
    const wiersze: any[] = calErr ? [] : (data as any[]);
    const opts = wiersze.map((e: any) => ({
      id: e.id,
      label: `${new Date(e.scheduled_date + 'T00:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} — ${e.title}`,
      focusBlockId: (e.focus_block_id ?? null) as string | null,
      scheduledDate: e.scheduled_date as string,
    }));
    setCalendarLinkOptions(opts);
    // ZAPIS B7 08.08.2026 (SEDNO RUNDY) — jeśli w oknie jest sesja Bloku
    // Skupienia (dziś albo z ostatnich dni, nigdy z przyszłości), wpis
    // potreningowy dostanie JEDNO pytanie zamiast biernego pickera. Logika
    // wyboru jest czysta i ma własny selftest.
    setBlockSession(pickBlockSessionToConfirm(
      opts.map((o) => ({ id: o.id, scheduled_date: o.scheduledDate, title: o.label, focus_block_id: o.focusBlockId })),
      toLocalDateStr(new Date()),
    ));
    setBlockPromptAnswered(false);
  }, [currentUser]);

  /**
   * ⭐⭐ D3 21.08.2026 — CZY DZISIEJSZY WPIS PORANNY JEST.
   *
   * ⛔ TRZY WARTOŚCI, NIE DWIE. Nieudany odczyt zostawia `nieznany`, a NIE
   * `niema` — inaczej odmowa dostępu (RLS), brak sieci albo wygasły okres
   * próbny mówiłyby zawodnikowi „nie wypełniłeś", czyli produkt kłamałby mu
   * o jego własnej pracy. To ta sama cisza, którą pas C3 wyciągał z `?? []`.
   *
   * ⛔ ZERO LICZENIA (N1). Pytamy o JEDEN wiersz z DZISIAJ i o nic więcej:
   * `limit(1)` i `select('id')`. Nie ma tu historii, z której dałoby się
   * policzyć serię — i nie ma jej mieć.
   *
   * ⚠️ „Dziś" liczone jest TYM SAMYM zegarem lokalnym, co deduplikacja
   * w `submitDailyLog` i co okno poranka (`OKNO_PORANKA_ZEGAR`). Dwa różne
   * zegary na jednym ekranie dają godzinę, w której „dziś" znaczy dwie rzeczy.
   */
  const loadDzisiejszyPoranek = useCallback(async () => {
    if (!currentUser) return;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data, error: err } = await supabase
      .from('daily_logs')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('entry_type', 'morning')
      .gte('created_at', startOfDay.toISOString())
      .limit(1);
    if (err) {
      console.warn(opisBleduOdczytuDoLogu('dziennik.loadDzisiejszyPoranek → daily_logs', err));
      setDzisiejszyPoranek('nieznany');
      return;
    }
    setDzisiejszyPoranek((data as any[]).length > 0 ? 'jest' : 'niema');
  }, [currentUser]);

  const loadHistory = useCallback(async () => {
    if (!currentUser) return;
    const { data, error: err } = await supabase
      .from('daily_logs')
      .select('*,pain_entries(*)')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (err) {
      // ⭐ PLAN-D-C3 15.08.2026 — było: `if (err) return;` z komentarzem
      // „load* nie pokazuje banera błędu — konwencja z web". Konwencja zostaje
      // (banera nadal nie ma), ale jej skutek już nie: `history` zostawało
      // puste i ekran pisał „Brak wpisów — dodaj pierwszy powyżej."
      // zawodnikowi, który prowadzi dziennik od miesiąca. Wiersze sprzed
      // nieudanego odświeżenia zostają nietknięte.
      console.warn(opisBleduOdczytuDoLogu('dziennik.loadHistory → daily_logs', err));
      setOdczytHistoriiUdanySie(false);
      return;
    }
    setOdczytHistoriiUdanySie(true);
    setHistory((data ?? []) as HistoryRow[]);
  }, [currentUser]);

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { populateCalendarLinkSelect(); loadHistory(); loadDzisiejszyPoranek(); }, [populateCalendarLinkSelect, loadHistory, loadDzisiejszyPoranek]));

  // ⭐ PLAN-D-C3 15.08.2026 — jedna funkcja decyzyjna zamiast `history.length === 0`.
  const pustkaHistorii = rozpoznajPustke({
    maWpisy: history.length > 0,
    planLekcjiZnany: null,
    // Odmowę dostępu przy ZAPISIE obsługuje już `toJestBrakDostepu` +
    // `ZAPIS_ODRZUCONY_BRAK_DOSTEPU` (pas K). Tu mówimy o pustce HISTORII.
    moznaZapisywac: null,
    odczytUdanySie: odczytHistoriiUdanySie,
    daSieOdswiezyc: true,
    tekstBrakuDanych: 'Brak wpisów — dodaj pierwszy powyżej.',
  });

  // ⭐ PAS T2 19.08.2026 — stan okna poranka liczony PRZY KAŻDYM RENDERZE.
  // ⚠️ Świadomie NIE jest w `useState`: gdyby był, zawodnik, który zostawił
  // ekran otwarty przez południe, widziałby otwarte okno do końca dnia.
  // ⛔ Tu rozstrzyga się wyłącznie WYGLĄD. O tym, czy zapis przejdzie,
  // rozstrzyga zegar odczytany w `submitDailyLog` w chwili dotknięcia.
  const oknoPorankaOtwarte = czyOknoPorankaOtwarte(new Date());

  // ⭐⭐ D3 21.08.2026 — CZTERY STANY ANKIETY, NIE DWA (R5).
  // ⛔ Liczony przy KAŻDYM renderze, z tego samego powodu co linia wyżej:
  // zawodnik, który zostawił ekran otwarty przez południe, ma zobaczyć
  // południe, a nie poranek. ⛔ Rozstrzyga `lib/oknoPoranka.ts`, nie ten plik.
  const stanAnkiety = stanAnkietyPorannej(new Date(), dzisiejszyPoranek);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([populateCalendarLinkSelect(), loadHistory(), loadDzisiejszyPoranek()]);
    setRefreshing(false);
  }, [populateCalendarLinkSelect, loadHistory, loadDzisiejszyPoranek]);

  const resetForm = () => {
    // AUDYT 28.07.2026: brakujący `setEntryType('morning')` — kontrakt sekcja 1
    // wymaga, żeby przełącznik wracał do "Wpis poranny" po KAŻDYM udanym
    // zapisie (także po zapisie potreningowym), nie tylko czyścić pola.
    setEntryType('morning');
    setBlockPromptAnswered(false); // pytanie o sesję Bloku wraca przy następnym wpisie
    setSleepHours(undefined); setFreeNote(''); setDuration(''); setCalendarLinkId('');
    setHasPain(false); setPainExcludes(false);
    setSleepQuality(undefined); setMorningEnergy(undefined); setMoodMotivation(undefined);
    setRpe(undefined); setPostFatigue(undefined); setPainIntensity(undefined);
  };

  const submitDailyLog = async () => {
    if (!currentUser) return;
    setError(null); setOk(null);

    // ════════════════════════════════════════════════════════════
    // ⭐⛔ ZAPORA OKNA PORANKA — STOI W ZAPISIE, NIE W WYGLĄDZIE.
    //
    // Zaszarzony kafel niżej jest UPRZEJMOŚCIĄ wobec zawodnika. TĄ zaporą
    // jest ten warunek. Powód jest praktyczny, nie teoretyczny: wystarczy
    // otworzyć ekran o 11:58, wyjść do szkoły i dotknąć „Zapisz" o 15:00 —
    // `entryType` nadal brzmi `morning`, formularz nadal jest wypełniony,
    // a wygląd był rozstrzygnięty przy renderze, nie przy dotknięciu.
    // ⛔ Bez tej linijki istniałby stan, w którym zapis wstecz przechodzi (Z0).
    //
    // ⚠️ ZEGAR: `new Date()` to czas LOKALNY urządzenia zawodnika — ten sam,
    // którym niżej liczony jest `startOfDay` deduplikacji. Nazwane wprost
    // w `OKNO_PORANKA_ZEGAR`.
    // ⛔ Odmowa NICZEGO NIE LICZY: nie zapisuje nieudanej próby, nie zwiększa
    // żadnego licznika i nie zostawia śladu „kolejny dzień bez wpisu" (N1).
    // ════════════════════════════════════════════════════════════
    if (entryType === 'morning') {
      const odmowa = powodOdmowyZapisuPoranka(new Date());
      if (odmowa !== null) {
        setError(odmowa);
        return;
      }
    }

    if (hasPain && painIntensity === undefined) {
      setError('Zaznacz intensywność bólu.');
      return;
    }

    // Godziny snu nie wymagają już walidacji tekstu — suwak (ScalePicker)
    // fizycznie nie pozwala ustawić wartości spoza swojego zakresu (0-12h od
    // 06.08.2026), patrz JSX niżej.
    let durationValue: number | undefined;
    if (entryType === 'post_training' && duration !== '') {
      durationValue = parseLocaleNumber(duration);
      if (!Number.isFinite(durationValue) || durationValue < 0 || durationValue > 360) {
        setError('Podaj czas trwania w minutach w zakresie 0–360.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (entryType === 'morning') {
        if (sleepHours !== undefined) payload.sleep_hours = sleepHours;
        if (sleepQuality !== undefined) payload.sleep_quality = sleepQuality;
        // KONWERSJA 06.08.2026: appka zbiera "poziom energii" (0=bardzo niski,
        // 10=pełnia energii), baza dalej przechowuje `morning_fatigue` z
        // niezmienioną semantyką "wyżej = bardziej zmęczony" — patrz komentarz
        // przy deklaracji stanu `morningEnergy` wyżej dla pełnego uzasadnienia.
        if (morningEnergy !== undefined) payload.morning_fatigue = 10 - morningEnergy;
        if (moodMotivation !== undefined) payload.mood_motivation = moodMotivation;
        if (freeNote.trim()) payload.free_note = freeNote.trim();
      } else {
        if (durationValue !== undefined) payload.duration_minutes = durationValue;
        if (rpe !== undefined) payload.rpe = rpe;
        if (postFatigue !== undefined) payload.post_fatigue = postFatigue;
      }

      const insertBody: Record<string, any> = {
        user_id: currentUser.id,
        entry_type: entryType,
        session_type: entryType === 'post_training' ? sessionType : null,
        payload,
      };
      if (entryType === 'post_training' && calendarLinkId) {
        insertBody.calendar_event_id = Number(calendarLinkId);
      }

      // ════════════════════════════════════════════════════════════
      // KONIEC DUBLOWANIA WPISU PORANNEGO — 10.08.2026
      //
      // Znalezione przy przejściu ścieżki na świeżym koncie (Kuba, 10.08.2026:
      // dwa wpisy „Poranny" tego samego dnia, 15:46 i 15:47, oba zapisane).
      // Do dziś ten ekran ZAWSZE robił `insert`, bez żadnego zabezpieczenia.
      //
      // Dlaczego to nie jest kosmetyka: `computeReadinessSignals()` w silniku
      // rekomendacji oraz `api/generate-focus-block-dosing.js` liczą sygnały
      // Gotowości właśnie z tych wierszy. Zdublowany poranek przekrzywia wynik,
      // a zawodnik nie ma nawet jak zauważyć, że zdublował — formularz czyści
      // się po zapisie i nigdy nie wczytuje dzisiejszego wpisu.
      //
      // DLACZEGO TYLKO PORANNY. Wpisów potreningowych w jednym dniu może być
      // więcej niż jeden i to jest POPRAWNE — dwa treningi, dwa wpisy. Poranek
      // z definicji jest jeden. Deduplikacja obejmuje więc wyłącznie
      // `entry_type = 'morning'`.
      //
      // Baza na to pozwala: polityka `daily_logs_update_own` istnieje
      // (potwierdzone odczytem `pg_policies` 09.08.2026).
      // ════════════════════════════════════════════════════════════
      let dailyLogId: number | undefined;
      let updatedExisting = false;

      if (entryType === 'morning') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { data: existing, error: exErr } = await supabase
          .from('daily_logs')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('entry_type', 'morning')
          .gte('created_at', startOfDay.toISOString())
          .order('created_at', { ascending: false })
          .limit(1);
        // Błąd samego SPRAWDZENIA nie blokuje zapisu — w najgorszym razie
        // powstanie drugi wpis, czyli dokładnie to, co działo się dotąd.
        // Cisza zamiast wpisu byłaby dla zawodnika gorsza niż duplikat.
        if (!exErr && existing && existing.length > 0) {
          dailyLogId = existing[0].id;
          updatedExisting = true;
        }
      }

      if (updatedExisting) {
        const { error: updErr } = await supabase
          .from('daily_logs')
          .update({ payload })
          .eq('id', dailyLogId);
        if (updErr) throw updErr;
        // Wpisy bólowe wiszą na `daily_log_id`, więc przy poprawianiu trzeba
        // usunąć poprzedni, zanim wstawimy aktualny — inaczej zawodnik, który
        // odznaczył ból, zostawiłby go w bazie na zawsze.
        const { error: delErr } = await supabase.from('pain_entries').delete().eq('daily_log_id', dailyLogId);
        if (delErr) throw new Error('Wpis zaktualizowany, ale nie udało się odświeżyć wpisu bólowego: ' + delErr.message);
      } else {
        const { data: inserted, error: insErr } = await supabase.from('daily_logs').insert(insertBody).select();
        if (insErr) throw insErr;
        dailyLogId = inserted?.[0]?.id;
      }

      // ════════════════════════════════════════════════════════════
      // PLAN-D-A1 08.2026 — ZNACZNIK WYKONANIA: POCZĄTEK
      //
      // Wpis, który zaliczył sesję Bloku, stawia `calendar_events.status =
      // 'completed'` na tym wydarzeniu. `status` jest POCHODNĄ powiązania
      // `daily_logs.calendar_event_id` — nie drugim źródłem prawdy i nie
      // drugim torem zaliczania. Licznik „N z M" liczy z powiązania,
      // dokładnie tak jak dotąd.
      //
      // ⚠️ TRZY RZECZY, KTÓRE MUSZĄ TU ZOSTAĆ, cokolwiek się zmieni niżej:
      //  1. WPIS JUŻ JEST ZAPISANY. Ten blok stoi PO insercie i nie ma prawa
      //     go cofnąć ani zablokować. W chwili tej zmiany migracja CHECK-a
      //     (`claude/MIGRACJA_A1_STATUS_COMPLETED_14_08_2026.sql`) nie jest
      //     jeszcze na żywej bazie, więc ten `update` ZWRÓCI 23514 — i tak
      //     ma być. Wpis zapisuje się mimo to.
      //  2. ŻADNEGO `throw`. Dlatego własne `try`/`catch`, a nie wspólne
      //     z zapisem wpisu: wyjątek stąd trafiłby do bannera „Nie udało się
      //     zapisać" i skłamałby zawodnikowi o jego wpisie.
      //  3. ŻADNEJ CISZY. Każda porażka — błąd, wyjątek albo zero dotkniętych
      //     wierszy (RLS!) — zostawia ślad w konsoli z powodem. Zawodnikowi
      //     nie pokazujemy nic: dla niego wpis się udał i to jest prawda.
      // ════════════════════════════════════════════════════════════
      const decyzjaZnacznika = decideSessionCompletion({
        entryType,
        calendarLinkId,
        options: calendarLinkOptions.map((o) => ({ id: o.id, focusBlockId: o.focusBlockId })),
      });
      if (decyzjaZnacznika.oznacz) {
        const eventId = decyzjaZnacznika.eventId;
        try {
          const { data: oznaczone, error: statusErr } = await supabase
            .from('calendar_events')
            .update({ status: 'completed' })
            .eq('id', eventId)
            .eq('user_id', currentUser.id)
            .select('id');
          if (statusErr) {
            console.warn(completionFailureLog(eventId, `${statusErr.message} (kod ${statusErr.code ?? 'brak'})`));
          } else if (!oznaczone || oznaczone.length === 0) {
            console.warn(completionNoRowsLog(eventId));
          }
        } catch (statusEx: any) {
          console.warn(completionFailureLog(eventId, `wyjątek: ${statusEx?.message ?? String(statusEx)}`));
        }
      }
      // ════════════════ ZNACZNIK WYKONANIA: KONIEC ════════════════

      if (hasPain && dailyLogId) {
        const side = NON_LATERAL_LOCATIONS.has(painLocation) ? null : (painSide || null);
        const { error: painErr } = await supabase.from('pain_entries').insert({
          daily_log_id: dailyLogId,
          user_id: currentUser.id,
          body_location: painLocation,
          side,
          intensity: painIntensity,
          excludes_from_training: painExcludes,
        });
        if (painErr) throw new Error('Wpis zapisany, ale wpis bólowy się nie udał: ' + painErr.message);
      }

      // ZAPIS B7 08.08.2026 — gdy wpis zaliczył sesję Bloku, mówimy to wprost
      // (zasada 4: zbieramy tylko wtedy, gdy oddajemy). Zaliczenie = wybrane
      // wydarzenie ma `focus_block_id`, obojętnie czy przez pytanie, czy picker.
      // PLAN-D-A1 08.2026 — ten sam warunek, co decyzja o znaczniku wyżej,
      // liczony JEDNĄ funkcją zamiast dwoma kopiami. Dwie kopie tego samego
      // warunku to droga do produktu, który stawia znacznik i mówi „Zapisano."
      // albo odwrotnie — a różnicy nikt nie zauważy.
      const linkedToBlock = decyzjaZnacznika.oznacz;
      // 10.08.2026 — gdy poprawiliśmy dzisiejszy wpis zamiast tworzyć nowy,
      // mówimy to wprost. Brzmienie zatwierdzone przez Kubę. Wpis poranny nigdy
      // nie zalicza sesji Bloku (to robi wyłącznie wpis potreningowy), więc ta
      // gałąź nie potrzebuje wariantu z paskiem Celu.
      setOk(updatedExisting ? 'Wpis zaktualizowany.' : journalSavedMessage(linkedToBlock));
      // ⭐ D3 — po udanym zapisie porannym WIEMY, że wpis z dzisiaj jest.
      // ⛔ To NIE JEST licznik (N1): to jedna wartość o JEDNYM dniu, ta sama,
      // którą i tak odda odczyt przy następnym wejściu na ekran.
      if (entryType === 'morning') setDzisiejszyPoranek('jest');
      resetForm();
      await loadHistory();
    } catch (e: any) {
      // PLAN-D-K 08.2026 (13.08.2026) — TU BYŁA CISZA.
      //
      // `user_has_active_access` bramkuje w RLS `insert` i `update` na
      // `daily_logs`. W dniu wygaśnięcia okresu próbnego baza zaczynała
      // odrzucać zapis kodem `42501`, a zawodnik dostawał w twarz zdanie
      // „Nie udało się zapisać: new row violates row-level security policy".
      // Z tego zdania nie da się wyczytać ani co się stało, ani że nic nie
      // zginęło. ⚠️ Kod `42501` ZMIERZONY na produkcji 13.08.2026,
      // w transakcji cofniętej — nie zapamiętany.
      //
      // ⚠️ To NIE jest ścieżka odzysku: nie ponawiamy zapisu i nie zmieniamy
      // jego treści. Zmienia się WYŁĄCZNIE zdanie, które zawodnik czyta.
      setError(
        toJestBrakDostepu(e)
          ? ZAPIS_ODRZUCONY_BRAK_DOSTEPU
          : 'Nie udało się zapisać: ' + e.message,
      );
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // ⭐⭐ D3 — TREŚĆ ARKUSZY: DOKŁADNIE TO, CO DO 21.08 LEŻAŁO NA EKRANIE
  // ═══════════════════════════════════════════════════════════════
  // ⛔ ANI JEDNA POZYCJA NIE MA STANU „USUNIĘTE" (B3). Poniżej stoi ten sam
  // JSX, co dotąd — przeniesiony, nie przepisany. Etykieta każdej rzeczy
  // wyszła z ciała arkusza tylko dlatego, że stała się jego TYTUŁEM
  // (`NAPIS_ARKUSZA`), czyli tym samym napisem w innym miejscu.
  function trescArkusza() {
    if (arkusz === 'nastroj') {
      return (
        <ScalePicker value={moodMotivation} onChange={setMoodMotivation} colorForValue={higherIsBetterColor} />
      );
    }

    if (arkusz === 'notatka') {
      return (
        <TextInput style={[styles.input, styles.textarea]} placeholderTextColor={colors.textSecondary} value={freeNote} onChangeText={setFreeNote} multiline placeholder="Coś jeszcze warto zapisać?" />
      );
    }

    if (arkusz === 'powiazanie') {
      return (
        <View style={styles.pickerWrap}>
          <Picker selectedValue={calendarLinkId} onValueChange={setCalendarLinkId}>
            <Picker.Item label="— nie dotyczy —" value="" />
            {calendarLinkOptions.map((o) => <Picker.Item key={o.id} label={o.label} value={String(o.id)} />)}
          </Picker>
        </View>
      );
    }

    if (arkusz === 'zmeczenie') {
      return (
        <ScalePicker value={postFatigue} onChange={setPostFatigue} colorForValue={neutralIntensityColor} />
      );
    }

    if (arkusz === 'bol') {
      return (
        <View>
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
              {/* colorForValue: odwrócony gradient — tu im wyżej tym GORZEJ. */}
              <ScalePicker value={painIntensity} onChange={setPainIntensity} colorForValue={higherIsWorseColor} />
              <TouchableOpacity style={styles.checkboxRow} onPress={() => setPainExcludes((v) => !v)}>
                <Checkbox value={painExcludes} onValueChange={setPainExcludes} />
                <Text style={styles.checkboxLabel}>To wyklucza mnie z treningu</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      );
    }

    /* arkusz === 'historia' — pustka i do dwudziestu kart, co do znaku jak dotąd. */
    return (
      <View>
        {/* ⭐ PLAN-D-C3 15.08.2026 — brzmienie „Brak wpisów — dodaj pierwszy
            powyżej." idzie CO DO ZNAKU (zakaz 4), razem z krokiem, który już
            w nim siedzi. Zmienia się wyłącznie to, KIEDY zawodnik je czyta. */}
        {pustkaHistorii ? (
          <>
            <Text style={styles.empty}>{pustkaHistorii.tekst}</Text>
            {pustkaHistorii.krokWTekscie ? null : (
              <Text style={styles.empty}>{pustkaHistorii.cta}</Text>
            )}
          </>
        ) : null}
        {history.map((row) => {
          const dateLabel = new Date(row.created_at).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
          const typeLabel = row.entry_type === 'morning' ? 'Poranny' : 'Potreningowy';
          const p = row.payload || {};
          // OPTYMALIZACJA 06.08.2026 (przy okazji kolorowania suwaków — ten sam
          // zestaw funkcji z lib/scale-colors.ts, żeby historia dawała się
          // skanować wzrokiem tak samo intuicyjnie jak formularz powyżej, nie
          // tylko szarym, niezróżnicowanym tekstem jak dotąd). `detailParts`:
          // {text, color}[] zamiast pojedynczego stringa — renderowane niżej
          // jako osobne kolorowe fragmenty <Text> przedzielone neutralną kropką.
          const detailParts: { text: string; color?: string }[] = [];
          if (row.entry_type === 'morning') {
            if (p.sleep_hours !== undefined) detailParts.push({ text: `sen: ${p.sleep_hours}h`, color: sleepHoursColor(p.sleep_hours) });
            if (p.sleep_quality !== undefined) detailParts.push({ text: `jakość snu: ${p.sleep_quality}/10`, color: higherIsBetterColor(p.sleep_quality) });
            // `morning_fatigue` w bazie jest niezmienione (patrz konwersja w
            // submitDailyLog) — tu, na wyświetlaniu, przeliczane z powrotem na
            // energię, żeby cała historia mówiła tym samym językiem co formularz.
            if (p.morning_fatigue !== undefined) {
              const energy = 10 - p.morning_fatigue;
              detailParts.push({ text: `energia: ${energy}/10`, color: higherIsBetterColor(energy) });
            }
            if (p.mood_motivation !== undefined) detailParts.push({ text: `nastrój: ${p.mood_motivation}/10`, color: higherIsBetterColor(p.mood_motivation) });
          } else {
            // ⭐ PLAN-D-E2 15.08.2026 — patrz `opiszRodzajSesji` na górze pliku.
            if (row.session_type) {
              const opisRodzaju = opiszRodzajSesji(row.session_type);
              if (!opisRodzaju.znany) {
                console.warn(opisNieznanejWartosciDoLogu(
                  'daily_logs.session_type', opisRodzaju, Object.keys(SESSION_TYPE_LABELS),
                ));
              }
              detailParts.push({
                text: opisRodzaju.znany ? opisRodzaju.etykieta : opisRodzaju.komunikat,
              });
            }
            if (p.duration_minutes !== undefined) detailParts.push({ text: `${p.duration_minutes} min` });
            if (p.rpe !== undefined) detailParts.push({ text: `RPE: ${p.rpe}/10`, color: neutralIntensityColor(p.rpe) });
            if (p.post_fatigue !== undefined) detailParts.push({ text: `zmęczenie: ${p.post_fatigue}/10`, color: neutralIntensityColor(p.post_fatigue) });
          }
          const pains = row.pain_entries || [];
          return (
            <View key={row.id} style={styles.historyCard}>
              <View style={styles.historyTop}>
                <Text style={styles.historyType}>{typeLabel}</Text>
                <Text style={styles.historyDate}>{dateLabel}</Text>
              </View>
              <Text style={styles.historyDetail}>
                {detailParts.length === 0 && '—'}
                {detailParts.map((part, i) => (
                  <Text key={i}>
                    {i > 0 && <Text style={styles.historySeparator}> · </Text>}
                    <Text style={part.color ? { color: part.color } : undefined}>{part.text}</Text>
                  </Text>
                ))}
              </Text>
              {pains.map((pe: any, i: number) => {
                // ⭐ PLAN-D-E2 15.08.2026 — ta sama reguła, druga surowa wartość
                // w tym pliku. `pain_entries.body_location` też jest kolumną bazy
                // i też wychodziła na ekran bez słowa.
                const opisMiejsca = opiszMiejsceBolu(pe.body_location);
                if (!opisMiejsca.znany) {
                  console.warn(opisNieznanejWartosciDoLogu(
                    'pain_entries.body_location', opisMiejsca, Object.keys(BODY_LOCATION_LABELS),
                  ));
                }
                const loc = opisMiejsca.znany ? opisMiejsca.etykieta : opisMiejsca.komunikat;
                const side = pe.side === 'left' ? ' (L)' : pe.side === 'right' ? ' (P)' : '';
                return (
                  <Text key={i} style={[styles.painTag, { color: higherIsWorseColor(pe.intensity) }]}>
                    {loc}{side} — {pe.intensity}/10{pe.excludes_from_training ? ' · wyklucza z treningu' : ''}
                  </Text>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  }

  /**
   * ⭐ D3 — JEDNO WEJŚCIE DO ARKUSZA, JEDEN KSZTAŁT (wzorzec pasa M2).
   * ⛔ Strzałka „→" jest w tym produkcie afordancją dotknięcia, więc każdy
   * taki wiersz MUSI być `TouchableOpacity` z `onPress` — napis ze strzałką
   * bez akcji to fałszywy przycisk (pilnuje tego `pustkaWCalymRepo`).
   * ⛔ Napis bierze się z `NAPIS_ARKUSZA`, czyli z TEGO SAMEGO miejsca, co
   * tytuł arkusza — nie z drugiego literału obok.
   */
  function wejscieArkusza(rodzaj: RodzajArkuszaDziennika) {
    return (
      <TouchableOpacity
        style={styles.wejscie}
        accessibilityRole="button"
        onPress={() => setArkusz(rodzaj)}
      >
        <Text style={styles.wejscieNapis}>{NAPIS_ARKUSZA[rodzaj]} →</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <Text style={styles.title}>Dziennik zawodnika</Text>

      <View style={styles.toggle}>
        {/* ⭐⛔ PAS T2 19.08.2026 — KAFEL ANKIETY NIE ZNIKA PO 12:00.
            Szarzeje (`toggleBtnPoOknie`) i zostaje dotykalny, żeby zawodnik
            mógł dotknąć i PRZECZYTAĆ POWÓD. Reguła R5: kafel, który znika,
            sprawia, że zawodnik nie odróżnia „wypełniłem" od „przepadło" —
            a to są dwie różne rzeczy i tylko jedna z nich jest jego.
            ⛔ Zaszarzenie NIE JEST czerwienią i nie jest ostrzeżeniem (Z2).
            ⭐⭐ D3 21.08.2026 — I DLATEGO SZARZEJE DZIŚ TYLKO W JEDNYM
            Z CZTERECH STANÓW. Do 21.08 warunkiem było samo `!oknoPorankaOtwarte`,
            czyli zawodnik, który ankietę WYPEŁNIŁ, dostawał tę samą szarość,
            co ten, któremu PRZEPADŁA. Szarość znaczy od dziś dokładnie jedno:
            „okno zamknięte i wpisu z dzisiaj nie ma". */}
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            entryType === 'morning' && styles.toggleBtnActive,
            stanAnkiety === 'zamkniete_wpisu_nie_ma' && styles.toggleBtnPoOknie,
          ]}
          onPress={() => setEntryType('morning')}
        >
          <Text style={[styles.toggleTxt, entryType === 'morning' && styles.toggleTxtActive]}>Wpis poranny</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, entryType === 'post_training' && styles.toggleBtnActive]}
          onPress={() => setEntryType('post_training')}
        >
          <Text style={[styles.toggleTxt, entryType === 'post_training' && styles.toggleTxtActive]}>Wpis potreningowy</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {ok && <Text style={styles.ok}>{ok}</Text>}

      {entryType === 'morning' && stanAnkiety === 'zamkniete_wpis_jest' ? (
        /* ⭐⭐ D3 — STAN DRUGI Z CZTERECH: OKNO ZAMKNIĘTE, ALE WPIS JEST.
           ⛔ To jest cała treść zadania §4: zawodnik, który wypełnił rano, ma
           przeczytać, ŻE JEGO WPIS JEST — a nie to samo zdanie o przepadnięciu,
           które czyta ktoś, kto nie wypełnił. ⛔ Zdanie nie chwali go za to,
           że wypełnił, i nie liczy dni (N1). ⛔ Bez czerwieni (Z2). */
        <View style={styles.stanAnkietyBox}>
          <Text style={styles.stanAnkietyTxt}>{ANKIETA_PORANNA_WYPELNIONA_ZDANIE}</Text>
        </View>
      ) : entryType === 'morning' && stanAnkiety === 'zamkniete_nie_wiemy' ? (
        /* ⭐⭐ D3 — STAN CZWARTY: NIE WIEMY, BO ODCZYT PADŁ.
           ⛔ NIE ZLEWAMY GO Z „nie wypełniona". Odmowa dostępu, brak sieci
           albo wygasły okres próbny nie są dowodem na to, że zawodnik czegoś
           nie zrobił — a produkt, który to zrównuje, kłamie mu o jego pracy. */
        <View style={styles.stanAnkietyBox}>
          <Text style={styles.stanAnkietyTxt}>{ANKIETA_PORANNA_STAN_NIEZNANY_ZDANIE}</Text>
        </View>
      ) : entryType === 'morning' && stanAnkiety === 'zamkniete_wpisu_nie_ma' ? (
        /* ⭐⛔ PAS T2 19.08.2026 — ZAMKNIĘTE OKNO PORANKA MÓWI, DLACZEGO.
           ⛔ Formularz NIE JEST rysowany: pola, których nie da się zapisać,
           byłyby zaproszeniem do pracy, która przepada przy dotknięciu
           „Zapisz". ⭐ Ale kafel wyżej ZOSTAJE — to jest cała różnica między
           „szarzeje" a „znika".
           ⛔ To zdanie NIE MÓWI, ile dni z rzędu zawodnik nie wypełnił, bo
           takiej liczby w tym produkcie nie ma i mieć nie będzie (N1).
           ⛔ Wpis potreningowy jest nadal dostępny — okno dotyczy PORANKA. */
        <View style={styles.oknoZamknieteBox}>
          <Text style={styles.oknoZamknieteTxt}>{OKNO_PORANKA_ZAMKNIETE_ZDANIE}</Text>
        </View>
      ) : entryType === 'morning' ? (
        /* ⭐⭐ D3 — RDZEŃ WPISU PORANNEGO: TRZY RZECZY O NOCY, KTÓRA MINĘŁA.
           Sen w godzinach, jakość snu i poranna energia to trzy pomiary tego
           samego — stanu, w jakim zawodnik wstał. ⛔ Nastrój / motywacja
           i notatka NIE ZNIKNĘŁY: zeszły do arkuszy i mają wiersze wejścia
           pod przyciskiem zapisu. */
        <>
          <Text style={styles.label}>Ile godzin spałeś?</Text>
          {/* ZMIANA 05.08.2026, na prośbę Kuby: było pole tekstowe (ryzyko
              literówek/przecinka z klawiatury) — suwak, ten sam sprawdzony
              komponent co reszta skal w tym formularzu.
              ZMIANA 06.08.2026: zakres zawężony z 0-24 do 0-12 (realistyczny
              zakres snu — 0-24 dawało fałszywe wrażenie, że pół doby przespanej
              to "połowa suwaka"). `sleep_hours` nie ma węższego CHECK w bazie
              niż 0-24, więc zawężenie w UI mieści się w istniejącym ograniczeniu;
              silnik rekomendacji patrzy tylko na wartość, nie na max suwaka.
              colorForValue: progi dopasowane do progu silnika (7h), nie gradient
              ciągły — patrz lib/scale-colors.ts. */}
          <ScalePicker
            value={sleepHours}
            onChange={setSleepHours}
            min={0}
            max={12}
            step={0.5}
            suffix="godz."
            colorForValue={sleepHoursColor}
          />
          <Text style={styles.label}>Jakość snu (0 = fatalna, 10 = doskonała)</Text>
          <ScalePicker value={sleepQuality} onChange={setSleepQuality} colorForValue={higherIsBetterColor} />
          <Text style={styles.label}>Poranny poziom energii (0 = bardzo niski, 10 = pełnia energii)</Text>
          {/* ZMIANA 06.08.2026, na prośbę Kuby: było "poranne zmęczenie" (jedyny
              suwak w tej formie działający "im wyżej tym gorzej"). Dziś: energia
              (im wyżej tym lepiej, spójnie z resztą), pokazana jako wariant
              "bateria" ScalePickera — najbardziej intuicyjny sposób pokazania
              "co się uzupełnia" (pomysł Kuby 06.08.2026), z opisem słownym pod
              wartością. Konwersja na `morning_fatigue` przy zapisie, patrz
              submitDailyLog. */}
          <ScalePicker
            value={morningEnergy}
            onChange={setMorningEnergy}
            variant="battery"
            colorForValue={higherIsBetterColor}
            describeValue={describeEnergyLevel}
          />
        </>
      ) : (
        /* ⭐⭐ D3 — RDZEŃ WPISU POTRENINGOWEGO: co to była za sesja, ile
           trwała, czy to była sesja Bloku i jak ciężko było. ⛔ Powiązanie
           z wydarzeniem kalendarza i zmęczenie po treningu zeszły do arkuszy
           — obie rzeczy mają wiersze wejścia pod przyciskiem zapisu. */
        <>
          <Text style={styles.label}>Rodzaj sesji</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={sessionType} onValueChange={setSessionType}>
              {Object.entries(SESSION_TYPE_LABELS).map(([id, label]) => <Picker.Item key={id} label={label} value={id} />)}
            </Picker>
          </View>
          <Text style={styles.label}>Czas trwania (minuty)</Text>
          <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} keyboardType="number-pad" value={duration} onChangeText={setDuration} placeholder="np. 90" />
          {/* ZAPIS B7 08.08.2026 (SEDNO RUNDY 7) — zamiast liczyć na to, że
              zawodnik sam otworzy picker niżej, pytamy wprost o sesję Bloku.
              „Tak" ustawia DOKŁADNIE to samo powiązanie, które od zawsze
              zalicza sesję we wskaźniku „N z M" (daily_logs.calendar_event_id)
              — zero nowego znaczenia w bazie. „Nie" niczego nie ocenia i
              chowa pytanie; picker zostaje dla każdego innego przypadku —
              ⭐ od 21.08 w arkuszu „Powiąż z zaplanowanym wydarzeniem". */}
          {blockSession && !blockPromptAnswered && !calendarLinkId ? (
            <View style={styles.blockPromptBox}>
              <Text style={styles.blockPromptQuestion}>
                {blockSessionQuestion(blockSession, toLocalDateStr(new Date()))}
              </Text>
              <Text style={styles.blockPromptSession} numberOfLines={1}>{blockSession.title}</Text>
              <View style={styles.blockPromptRow}>
                <TouchableOpacity
                  style={[styles.blockPromptBtn, styles.blockPromptBtnYes]}
                  onPress={() => { setCalendarLinkId(String(blockSession.id)); setBlockPromptAnswered(true); }}
                >
                  <Text style={styles.blockPromptBtnYesTxt}>{BLOCK_LINK_YES_LABEL}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.blockPromptBtn}
                  onPress={() => setBlockPromptAnswered(true)}
                >
                  <Text style={styles.blockPromptBtnTxt}>{BLOCK_LINK_NO_LABEL}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          <Text style={styles.label}>RPE — odczuwany wysiłek (0 = brak, 10 = maksymalny)</Text>
          {/* colorForValue: świadomie NEUTRALNY (nie czerwony/zielony) — wysoki
              wysiłek treningowy nie jest z definicji "zły", często jest celem.
              Patrz lib/scale-colors.ts, neutralIntensityColor. */}
          <ScalePicker value={rpe} onChange={setRpe} colorForValue={neutralIntensityColor} />
        </>
      )}

      {/* ⭐ PAS T2 19.08.2026 — przycisk po 12:00 SZARZEJE przy wpisie porannym,
          a nie znika: zawodnik ma widzieć, że ekran jest ten sam i że to okno,
          a nie awaria. ⛔ To jest wygląd — prawdziwa zapora stoi w
          `submitDailyLog`, bo `disabled` przestaje obowiązywać w tej samej
          sekundzie, w której ktoś zmieni ten JSX. */}
      <TouchableOpacity
        style={[styles.btn, (saving || (entryType === 'morning' && !oknoPorankaOtwarte)) && styles.btnDisabled]}
        disabled={saving || (entryType === 'morning' && !oknoPorankaOtwarte)}
        onPress={submitDailyLog}
      >
        <Text style={styles.btnText}>{saving ? 'Zapisuję...' : 'Zapisz wpis'}</Text>
      </TouchableOpacity>

      {/* ⭐⭐ D3 — WEJŚCIA ZASTĘPCZE. ⛔ TO JEST WARUNEK 3 POLECENIA: nie ma
          stanu tego pliku, w którym pole zeszło z ekranu, a wejścia do niego
          jeszcze nie ma. Każdy wiersz otwiera arkusz z DOKŁADNIE tą treścią,
          która do 21.08 leżała na ekranie, i nosi DOKŁADNIE tę etykietę,
          która nad nią stała.
          ⛔ Dwa pierwsze wiersze zależą od rodzaju wpisu, bo zależą od niego
          same pola: „nastrój" i „notatka" należą do poranka, „powiązanie"
          i „zmęczenie" do wpisu potreningowego. ⭐ Ból i historia stoją
          BEZWARUNKOWO — obie rzeczy dotyczą obu wpisów. */}
      <View style={styles.wejscia}>
        {entryType === 'morning' ? (
          <>
            {wejscieArkusza('nastroj')}
            {wejscieArkusza('notatka')}
          </>
        ) : (
          <>
            {wejscieArkusza('powiazanie')}
            {wejscieArkusza('zmeczenie')}
          </>
        )}
        {wejscieArkusza('bol')}
        {wejscieArkusza('historia')}
      </View>
    </ScrollView>

    {/* ── ARKUSZ ────────────────────────────────────────────────────
        ⛔ STOI POZA `ScrollView`: to jest NAKŁADKA nad ekranem, a nie
        kolejna rzecz na nim. Dlatego zdejmuje wysokość, zamiast ją
        przesuwać — i dlatego miara ekranu liczy go na zero. */}
    <Arkusz
      widoczny={arkusz !== null}
      naglowek={arkusz === null ? null : naglowekArkuszaDziennika(arkusz)}
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
  toggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  toggleBtn: { flex: 1, minHeight: minTouchHeight, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  toggleTxt: { ...typography.bodyMedium, fontSize: 14, color: colors.textPrimary },
  toggleTxtActive: { color: colors.white },
  // ⭐ PAS T2 19.08.2026 — kafel ankiety po 12:00. ⛔ Sama przezroczystość,
  // ZERO czerwieni: zamknięte okno to stan, nie ostrzeżenie (Z2 — czerwień
  // należy w tym produkcie wyłącznie do bólu).
  toggleBtnPoOknie: { opacity: 0.4 },
  oknoZamknieteBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.md },
  oknoZamknieteTxt: { ...typography.body, fontSize: 14, color: colors.textSecondary },
  // ⭐⭐ D3 21.08.2026 — DWA POZOSTAŁE STANY ANKIETY (wpis JEST · NIE WIEMY).
  // ⛔ ZERO CZERWIENI (Z2): ani „wpis jest", ani „nie udało się sprawdzić"
  // nie są ostrzeżeniem o ciele. ⛔ Ramka jest wyraźniejsza niż przy
  // przepadnięciu (lewa krecha zamiast pełnego obramowania), żeby te trzy
  // stany dało się odróżnić W CIEMNO — ⭐ ale nośnikiem różnicy jest ZDANIE,
  // nie kolor (K4): jeden na dwunastu chłopców nie rozróżnia części barw
  // i czyta dokładnie to samo, co reszta.
  stanAnkietyBox: { borderLeftWidth: 3, borderLeftColor: colors.textPrimary, borderRadius: radii.sm, backgroundColor: colors.surfaceElevated, padding: spacing.md, marginBottom: spacing.md },
  stanAnkietyTxt: { ...typography.body, fontSize: 14, lineHeight: 19, color: colors.textPrimary },
  // W1: nadtytuły na ink3 (koncepcja: ink3 = podpisy, nadtytuły)
  label: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6, marginTop: 4 },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 10, fontSize: 14, marginBottom: spacing.sm, color: colors.textPrimary },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  pickerWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, marginBottom: spacing.sm },
  // ZAPIS B7 08.08.2026 — pytanie o sesję Bloku (sedno rundy 7).
  // W1: tło z tokenu brandSofter zamiast rgba na sztywno (stary koral #E8432D)
  blockPromptBox: { borderWidth: 1, borderColor: colors.brand, borderRadius: radii.md, backgroundColor: colors.brandSofter, padding: 12, marginBottom: spacing.sm },
  blockPromptQuestion: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary, marginBottom: 4 },
  blockPromptSession: { ...typography.body, fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  blockPromptRow: { flexDirection: 'row', gap: 8 },
  blockPromptBtn: { flex: 1, minHeight: minTouchHeight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  blockPromptBtnTxt: { ...typography.bodyMedium, fontSize: 14, color: colors.textPrimary },
  blockPromptBtnYes: { backgroundColor: colors.brand, borderColor: colors.brand },
  blockPromptBtnYesTxt: { ...typography.bodyMedium, fontSize: 14, color: colors.white }, // W1: token
  block: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: spacing.md, marginVertical: spacing.md },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 10 },
  checkboxLabel: { ...typography.body, fontSize: 14, color: colors.textPrimary, flexShrink: 1 },
  btn: { minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  error: { color: colors.error, fontSize: 13, marginBottom: spacing.md },
  ok: { color: colors.success, fontSize: 13, marginBottom: spacing.md },
  empty: { textAlign: 'center', padding: spacing.lg, color: colors.textSecondary, fontSize: 14 },
  historyCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 14, marginBottom: 10 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  historyType: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary },
  historyDate: { fontSize: 12, color: colors.textSecondary },
  historyDetail: { ...typography.body, fontSize: 13, color: colors.textSecondary },
  historySeparator: { color: colors.textSecondary },
  painTag: { fontSize: 11, marginTop: 4 },
  // ⭐⭐ D3 21.08.2026 — WIERSZE WEJŚCIA DO ARKUSZY (kształt z pasa M2).
  // ⛔ Bez podpisu pod napisem — patrz komentarz przy `RodzajArkuszaDziennika`:
  // każdy arkusz tego ekranu trzyma DOKŁADNIE JEDNĄ rzecz, której etykieta
  // jest już jego tytułem, więc podpis byłby parafrazą tytułu.
  wejscia: { marginTop: 28 },
  wejscie: {
    minHeight: minTouchHeight,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
  },
  wejscieNapis: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary },
});
