// ZMIANA OBRAZU B5 08.08.2026 — NOWY PLIK.
// Rediagnoza JEDNEGO segmentu przy zamknięciu Bloku Skupienia (decyzja A8,
// claude/DECYZJE_PRODUKTOWE_07_08_2026.md) — czysta logika, bez Supabase i bez
// React Native. Warstwa widoku siedzi osobno w
// components/BlockClosingRediagnosis.tsx, wpięta w przegląd zamknięcia
// (components/FocusBlockActiveView.tsx). Ten sam rozdział co
// livingDiagnosisCascade.ts (logika) vs livingDiagnosisPulses.ts (I/O).
//
// ═══════════════════════════════════════════════════════════════════
// CO TA STACJA MA ZROBIĆ — trzy rzeczy, wszystkie sprawdzone selftestem
//
//  1. Zawodnik widzi RÓŻNICĘ, nie nowy wynik. „Byłeś tu, jesteś tu" — dwa
//     paski jeden pod drugim. Sam nowy wynik bez punktu odniesienia nie
//     zamyka pętli, więc bez punktu odniesienia w ogóle NIE PYTAMY
//     (`absent: 'no_baseline'`) — zamiast zbierać liczbę, której nie da się
//     do niczego przyłożyć.
//  2. Różnica może być UJEMNA i wtedy też ją pokazujemy. Bez pocieszania,
//     bez oceny, z jednym zdaniem, co to może znaczyć (patrz TEKSTY niżej).
//  3. Rediagnoza jest POMIJALNA. Pominięcie nie zapisuje niczego i nie liczy
//     się jako spadek — `absent: 'skipped'` renderuje pustkę, a zawodnik
//     zamyka Blok normalnie.
//
// ZERO NOWYCH PYTAŃ. Treść pytania pochodzi wyłącznie z
// lib/livingDiagnosisQuestionBank.ts (przeniesiona 1:1 z `SEGS` w
// gamechange-diagnoza/index.html), razem z wariantami pozycyjnymi. Ten plik
// nie zawiera ANI JEDNEGO sformułowania pytania.
//
// ═══════════════════════════════════════════════════════════════════
// SKALA — I JEDYNE ZAŁOŻENIE, KTÓREGO NIE DA SIĘ SPRAWDZIĆ W TYM PASIE
//
// Punkt odniesienia to `diagnostics.scores[segment]` — liczba 0-100, którą
// `calcScores()` w `index.html` wylicza z DWÓCH odpowiedzi 1-6 tego segmentu
// (odwracając je wcześniej wg `dir`). Dzisiejsza odpowiedź to JEDNA surowa
// odpowiedź 1-6 na pytanie bazowe — bank appki mobilnej świadomie nie zawiera
// `qs[1]` (INTEGRACJA_DIAGNOZA_ZYWA.md, decyzja 4).
//
// Żeby postawić te dwie rzeczy obok siebie, obie sprowadzamy do POZYCJI NA
// WŁASNEJ SKALI (0 = dół skali, 1 = góra):
//   • dzisiejsza odpowiedź:  (v − 1) / 5,  a przy `dir: -1`  (6 − v) / 5;
//   • punkt odniesienia:     score / 100.
//
// ⚠️ Drugie z tych przeliczeń zakłada, że `calcScores()` mapuje skalę
// liniowo tak, że odpowiedź najgorsza daje 0, a najlepsza 100.
//
// ═══════════════════════════════════════════════════════════════════
// PRAKTYKA-EKRAN B6 08.08.2026 — TO ZAŁOŻENIE JEST OD DZIŚ POTWIERDZONE.
//
// Runda 5 nie mogła go sprawdzić (`index.html` leży w `gamechange-diagnoza/`,
// poza pasem B) i dlatego odgrodziła je martwą strefą JEDNEGO PEŁNEGO KROKU
// (0,2), większą od najgorszego możliwego błędu drugiej postaci przeliczenia
// (0,167). To było odgrodzenie, nie rozwiązanie — znalezisko B26.
//
// ODCZYT ŹRÓDŁA (sesja główna, `gamechange-diagnoza/index.html`, linia 6092,
// 08.08.2026 — R4: data i źródło, bo to jest wiedza o cudzym pliku):
//
//     sc[id] = Math.round(((raw - 1) / 5) * 100)
//
// gdzie `raw` to średnia odpowiedzi tego segmentu z JUŻ zastosowanym `dir`
// (`q.dir === 1 ? v : (7 - v)`). Czyli:
//   • mapowanie JEST liniowe od zera — najgorsza odpowiedź daje 0, najlepsza 100;
//   • `(raw − 1) / 5` to DOKŁADNIE ta sama pozycja, którą liczy `answerPosition()`
//     (dla `dir: -1`: `(7 − v − 1)/5 = (6 − v)/5 = 1 − (v−1)/5`, znak w znak);
//   • jedyna rozbieżność, jaka zostaje, to `Math.round` do pełnych punktów,
//     czyli **maksymalnie 0,005 pozycji**.
//
// Wariant „średnia / 6 × 100" jest tym samym odczytem WYKLUCZONY, więc próg
// 0,167 przestał obowiązywać.
//
// DLATEGO MARTWA STREFA SCHODZI Z JEDNEGO KROKU DO PÓŁ KROKU (0,2 → 0,1).
// 0,1 jest wciąż DWADZIEŚCIA RAZY większa niż jedyny realny błąd przeliczenia
// (0,005), więc „w dół" nadal oznacza spadek, a „w górę" wzrost — a zawodnik
// zaczyna widzieć zmiany o pół kroku skali, które dotąd znikały mu z ekranu
// jako „obraz wygląda tak samo".
//
// ⚠️ NADAL NIE WOLNO JEJ ZMNIEJSZAĆ PONIŻEJ PÓŁ KROKU bez osobnego
// uzasadnienia. Powód zmienił się z „nie znamy calcScores()" na „poniżej pół
// kroku nie ma już czego mierzyć": dzisiejsza odpowiedź to JEDNO pytanie na
// skali 1–6, a punkt odniesienia jest liczony ze ŚREDNIEJ DWÓCH (znalezisko
// B27 — bank appki nie zawiera `qs[1]`). Różnica mniejsza niż pół kroku mieści
// się w tym, co pochodzi z drugiego pytania, o które nie pytamy.
// Patrz `mobile/docs/KONTRAKT_DIAGNOZA.md`, sekcja 8.2.
// ═══════════════════════════════════════════════════════════════════
//
// DRUGA KONSEKWENCJA `dir`: dla `tolerancja`, `odpornosc` i `koncentracja`
// odpowiedź „6 — Prawie zawsze" jest NIEKORZYSTNA (pytania brzmią „jak często
// znowu boli / chorujesz / myśli wracają do błędu"). Dlatego ekran NIE
// pokazuje etykiety odpowiedzi jako „poziomu" zawodnika — pokazuje pasek w
// kierunku dobrym, policzony przez `answerPosition()`. Pokazanie samej
// etykiety dałoby trzem z trzynastu segmentów obraz odwrócony.
//
// ═══════════════════════════════════════════════════════════════════
// PLAN-D-P 08.2026 (13.08.2026) — REGUŁA URATOWANA Z KALIBRACJI
//
// Kalibracja została usunięta z produktu w całości
// (claude/DECYZJA_KALIBRACJA_USUNIETA_13_08_2026.md). Jedna rzecz z niej była
// warta uratowania i nigdy do niej nie należała:
//
//     SPADKU NIE NAZYWA SIĘ SPADKIEM U KOGOŚ, KTO AKURAT SZYBKO ROŚNIE.
//
// Jej miejsce jest tutaj — to jest ten jeden moment, w którym zawodnik ogląda
// spadek własnej samooceny. Do 13.08.2026 `rediagnosisBody('down')` podawało
// dwie interpretacje („jest trudniej" albo „widzisz ostrzej") i NIE WIEDZIAŁO
// NIC o wzrastaniu — więc zawodnikowi w szczycie skoku wzrostowego, o którym
// produkt WIE, że rośnie 8 cm na rok, mówiło dokładnie to samo co każdemu
// innemu. Warunek postawiony komuś, o kim znamy odpowiedź, jest gorszy niż
// jego brak: brzmi jak wymówka.
//
// ⚠️ ODCZYT STANU, NIE FLAGA. Osłona wchodzi tu z koperty `weekly_voice.
// ograniczenia`, przez `czyOslonaAktywna()` — patrz uzasadnienie tam, w tym
// dlaczego NIE wolno wziąć samego `blokNieZwiekszaObjetosci`.
// Parametr jest opcjonalny świadomie: wywołania sprzed tej rundy zachowują się
// co do znaku tak jak dotąd, a brak stanu daje `nie_wiem`, czyli brzmienie
// ostrożne, nie przeramowane.
//
// ⚠️ DWIE GAŁĘZIE, NIE JEDNA. Zasada P1 z `claude/ZASADY_OBOWIAZUJACE_13_08_2026.md`
// mówi wprost: „utrzymanie wyniku w trakcie skoku wzrostowego jest realnym
// osiągnięciem i tak ma być nazwane" — bo w tym okresie wynik zwykle spada.
// Dlatego Osłona zmienia zdanie NIE TYLKO przy spadku, ale też przy braku
// zmiany. Przy wzroście nie zmienia niczego: wzrost w tym okresie broni się sam
// i doklejanie do niego zdania o wzrastaniu byłoby odbieraniem zasługi.
//
// ⚠️ CZEGO TU NIE MA I NIE MOŻE BYĆ: ani jednej liczby o dojrzałości
// biologicznej (wiek biologiczny, przewidywany wzrost dorosłego, tempo w cm).
// Produkt mówi „rośniesz teraz szybko" — i tyle. To jest ta sama granica, którą
// trzyma karta głosu tygodnia `growth` w `lib/glosTygodnia.ts`.
//
// ⚠️ BRZMIENIA OBU NOWYCH ZDAŃ SĄ DO PRZEJRZENIA PRZEZ KUBĘ (nowe 13.08.2026).
// ═══════════════════════════════════════════════════════════════════
import {
  DIAGNOSIS_ANSWER_MIN,
  DIAGNOSIS_ANSWER_MAX,
  DIAGNOSIS_ANSWER_SCALE,
  LIVING_DIAGNOSIS_QUESTION_BANK,
  resolveLivingDiagnosisWording,
} from './livingDiagnosisQuestionBank';
import { segmentLabel } from './labels';
import { czyOslonaAktywna, type StanOgraniczen, type Obowiazuje } from './ograniczenia';

// ─────────────────────────────────────────────────────────────
// SKALA I POZYCJE
// ─────────────────────────────────────────────────────────────

/** Liczba przedziałów skali: 6 odpowiedzi = 5 kroków. */
export const REDIAGNOSIS_SCALE_STEPS = DIAGNOSIS_ANSWER_MAX - DIAGNOSIS_ANSWER_MIN;

/**
 * PRAKTYKA-EKRAN B6 08.08.2026 — martwa strefa = PÓŁ KROKU SKALI (0,1).
 * Było: jeden pełny krok (0,2), dopóki postać `calcScores()` była nieznana.
 * Uzasadnienie zmiany i odczyt źródła: nagłówek pliku. To nadal NIE jest próg
 * estetyczny — poniżej pół kroku różnica mieści się w szumie z drugiego
 * pytania segmentu, o które appka nie pyta (B27).
 */
export const REDIAGNOSIS_DEAD_ZONE = 0.5 / REDIAGNOSIS_SCALE_STEPS;

/**
 * Największy błąd, jaki wnosi `Math.round` w `calcScores()` (wynik jest
 * całkowity, pozycja jest ułamkiem). Trzymany jako stała, bo to on — a nie
 * dawne 0,167 — jest od tej rundy dolną granicą sensownej martwej strefy.
 */
export const CALC_SCORES_ROUNDING_ERROR = 0.005;

export type RediagnosisDirection = 'up' | 'down' | 'flat';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** `dir` segmentu z banku pytań; `null`, gdy segment nieznany. */
export function segmentDirection(segmentId: string): 1 | -1 | null {
  const seg = LIVING_DIAGNOSIS_QUESTION_BANK[segmentId];
  return seg ? seg.dir : null;
}

/**
 * Pozycja dzisiejszej odpowiedzi na skali, W KIERUNKU DOBRYM (0 = najgorzej,
 * 1 = najlepiej). `dir: -1` odwraca — dokładnie tak, jak robi to agregacja w
 * `calcScores()`, i dokładnie dlatego, że bez tego trzy segmenty pokazywałyby
 * zawodnikowi obraz odwrócony.
 */
export function answerPosition(value: number, dir: 1 | -1): number {
  const v = Math.max(DIAGNOSIS_ANSWER_MIN, Math.min(DIAGNOSIS_ANSWER_MAX, value));
  const raw = (v - DIAGNOSIS_ANSWER_MIN) / REDIAGNOSIS_SCALE_STEPS;
  return dir === 1 ? raw : 1 - raw;
}

/**
 * Pozycja punktu odniesienia (wynik segmentu z diagnozy) na tej samej skali.
 * Wynik z diagnozy jest JUŻ w kierunku dobrym (wyższy = lepiej dla wszystkich
 * 13 segmentów — na tym stoi `getRelativeDeficits`), więc `dir` się tu NIE
 * stosuje. Zastosowanie go drugi raz odwróciłoby te trzy segmenty z powrotem.
 */
export function baselinePosition(score: number): number {
  return clamp01(score / 100);
}

// ─────────────────────────────────────────────────────────────
// PUNKT ODNIESIENIA — pięć jawnych stanów, wzorem reguły R5
// ─────────────────────────────────────────────────────────────

/**
 * „Nie ma diagnozy" ≠ „diagnoza jest, ale bez tego segmentu" ≠ „nie udało się
 * odczytać". Wszystkie trzy kończą się tak samo dla zawodnika (stacji nie ma),
 * ale rozróżnienie ma znaczenie dla logu i dla następnej sesji — to ta sama
 * lekcja co „cichy brak" z audytu po bloku 3.
 */
export type RediagnosisBaseline =
  | { state: 'ready'; score: number }
  | { state: 'no_diagnosis' }
  | { state: 'no_segment_score' }
  | { state: 'unreadable' }
  | { state: 'error' };

/**
 * Wyciąga wynik segmentu z rozparsowanych `scores` diagnozy SPRZED bloku.
 * `scores === null` znaczy „nie dało się odczytać", `undefined` znaczy „nie
 * było diagnozy" — dwa różne stany, dwie różne odpowiedzi.
 */
export function baselineFromScores(
  scores: Record<string, number> | null | undefined,
  segmentId: string
): RediagnosisBaseline {
  if (scores === undefined) return { state: 'no_diagnosis' };
  if (scores === null) return { state: 'unreadable' };
  const raw = scores[segmentId];
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return { state: 'no_segment_score' };
  return { state: 'ready', score: raw };
}

// ─────────────────────────────────────────────────────────────
// PORÓWNANIE
// ─────────────────────────────────────────────────────────────

export type RediagnosisChange = {
  /** Pozycja przed blokiem, 0-1, kierunek dobry. */
  before: number;
  /** Pozycja dziś, 0-1, kierunek dobry. */
  after: number;
  /** `after − before`. Dodatnie = w górę. */
  delta: number;
  /** Ogłaszany kierunek — dopiero po przekroczeniu martwej strefy. */
  direction: RediagnosisDirection;
};

export function compareRediagnosis(params: {
  baselineScore: number;
  answerValue: number;
  dir: 1 | -1;
}): RediagnosisChange {
  const before = baselinePosition(params.baselineScore);
  const after = answerPosition(params.answerValue, params.dir);
  const delta = after - before;
  // EPSILON, nie kosmetyka: pozycje są ułamkami piątych i setnych, więc
  // `0.6 − 0.4` daje w zmiennoprzecinkowym 0,19999999999999998. Bez tego
  // dokładnie jeden pełny krok skali — czyli najczęstsza realna zmiana —
  // wpadałby raz na jakiś czas do martwej strefy i znikał zawodnikowi z ekranu.
  const EPS = 1e-9;
  const direction: RediagnosisDirection =
    delta >= REDIAGNOSIS_DEAD_ZONE - EPS ? 'up'
      : delta <= -(REDIAGNOSIS_DEAD_ZONE - EPS) ? 'down'
        : 'flat';
  return { before, after, delta, direction };
}

/**
 * Szerokość paska w procentach. Dolne odcięcie 6% — ta sama wartość co
 * `relativeBarWidth()` na ekranie Diagnoza: pasek o zerowej szerokości
 * wygląda jak błąd renderowania, a nie jak „na samym dole skali".
 */
export function barPercent(position: number): number {
  return Math.max(6, Math.min(100, Math.round(clamp01(position) * 100)));
}

// ─────────────────────────────────────────────────────────────
// CZAS PRACY — do zdania „pracowałeś nad tym X tygodni"
// ─────────────────────────────────────────────────────────────

/** Pełne tygodnie od startu Bloku do `now`; `null`, gdy data nieczytelna. */
export function weeksWorked(startedAt: string | null | undefined, now: Date): number | null {
  if (!startedAt) return null;
  const t = new Date(startedAt).getTime();
  if (!Number.isFinite(t)) return null;
  const weeks = Math.floor((now.getTime() - t) / (7 * 24 * 60 * 60 * 1000));
  return weeks >= 1 ? weeks : null;
}

/** „1 tydzień" / „3 tygodnie" / „6 tygodni" — polska odmiana, ten sam wzorzec
 *  co `libraryCountLine()` w lib/materials.ts. */
export function weeksPhrase(weeks: number): string {
  const lastDigit = weeks % 10;
  const lastTwo = weeks % 100;
  if (weeks === 1) return '1 tydzień';
  const few = lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
  return `${weeks} ${few ? 'tygodnie' : 'tygodni'}`;
}

// ─────────────────────────────────────────────────────────────
// TEKSTY (decyzja A10 — test 15-latka)
//
// Zdanie o SPADKU jest tu najtrudniejsze i było pisane osobno: ma nie oceniać,
// nie pocieszać i nie tłumaczyć spadku „na plus". Mówi jedno zdanie o tym, co
// spadek MOŻE znaczyć, wymieniając obie możliwości — bo obie są prawdziwe, a
// wybór między nimi należy do zawodnika, nie do appki. Zawodnik, którego
// system chwali niezależnie od wyniku, przestaje mu wierzyć.
// ─────────────────────────────────────────────────────────────

export const REDIAGNOSIS_EYEBROW = 'Zmiana obrazu';
export const REDIAGNOSIS_BEFORE_CAPTION = 'Przed blokiem';
export const REDIAGNOSIS_AFTER_CAPTION = 'Dziś';
export const REDIAGNOSIS_SKIP_LABEL = 'Nie chcę teraz odpowiadać';
export const REDIAGNOSIS_SKIP_NOTE = 'Blok zamkniesz normalnie. Nic się nie zapisze.';
export const REDIAGNOSIS_SAVING_LABEL = 'Zapisuję…';

/** Nie udało się zapisać — pokazujemy różnicę mimo to i mówimy wprost, że nie
 *  została zapamiętana. Milczenie w tym miejscu byłoby „cichym brakiem". */
export const REDIAGNOSIS_NOT_SAVED_TEXT =
  'Tego nie udało się zapisać. To, co widzisz wyżej, jest prawdziwe — ale system tego nie zapamięta.';

export function rediagnosisLead(weeks: number | null): string {
  const head = weeks ? `Pracowałeś nad tym ${weeksPhrase(weeks)}. ` : '';
  return `${head}To samo pytanie, co w diagnozie — odpowiedz szczerze, a pokażemy Ci, co się przez ten czas zmieniło.`;
}

/**
 * ⚠️ BRZMIENIE DO PRZEJRZENIA PRZEZ KUBĘ (zmienione 13.08.2026, PLAN-D-P).
 * Przy trwającej Osłonie nagłówek NIE mówi „w dół" ani „tak samo" — bo to
 * zdanie jest pierwszą rzeczą, którą zawodnik czyta, i samo w sobie nazywa
 * spadek spadkiem.
 */
export function rediagnosisHeadline(
  direction: RediagnosisDirection,
  oslona: Obowiazuje = 'nie_wiem',
): string {
  if (direction === 'up') return 'Obraz przesunął się w górę.';
  if (oslona === 'tak') {
    return direction === 'down'
      ? 'Rośniesz — i w tym okresie ta liczba potrafi spaść.'
      : 'Utrzymałeś obraz w okresie, w którym zwykle spada.';
  }
  if (direction === 'down') return 'Obraz przesunął się w dół.';
  return 'Obraz wygląda tak samo jak przed blokiem.';
}

export function rediagnosisBody(
  direction: RediagnosisDirection,
  // PLAN-D-P 08.2026 (13.08.2026) — KONSUMENT OGRANICZENIA
  // `blokNieZwiekszaObjetosci` (przez `czyOslonaAktywna`). Reguła przeniesiona
  // z `lib/kalibracja.ts`, patrz nagłówek pliku. `nie_wiem` NIE przeramowuje.
  oslona: Obowiazuje = 'nie_wiem',
): string {
  if (direction === 'up') {
    return 'Na to samo pytanie odpowiadasz dziś inaczej niż przed blokiem. To Twoja odpowiedź, '
      + 'nie ocena systemu — i dlatego coś znaczy.';
  }
  if (oslona === 'tak') {
    if (direction === 'down') {
      return 'To nie jest cofnięcie się. W okresie szybkiego wzrastania wynik potrafi chwilowo '
        + 'zejść niżej, a potem wraca wyżej, niż był. Nie zwiększaj teraz objętości treningu '
        + 'i pilnuj snu — to jest ta jedna rzecz, która w tym okresie robi różnicę.';
    }
    return 'W okresie szybkiego wzrastania wynik zwykle spada, a Twój się nie ruszył. '
      + 'To nie jest „bez zmian" — to jest praca, która utrzymała Cię na miejscu. '
      + 'Rób dalej to samo i pilnuj snu.';
  }
  if (direction === 'down') {
    return 'Może to znaczyć dwie rzeczy: albo w tym obszarze jest teraz trudniej niż było, '
      + 'albo po tych tygodniach pracy widzisz to ostrzej niż na starcie.';
  }
  return 'Kilka tygodni to często za krótko, żeby to jedno pytanie się przesunęło — '
    + 'łatwiej to zobaczyć po kolejnym bloku.';
}

// ─────────────────────────────────────────────────────────────
// WIDOK — jedna funkcja, która mówi DOKŁADNIE, co jest na ekranie
//
// Istnieje po to, żeby wypis w raporcie („co zawodnik realnie zobaczy") był
// WYJŚCIEM tego samego kodu, który rysuje ekran, a nie tekstem przepisanym
// ręcznie. Komponent nie dokłada do tego ani jednego zdania.
// ─────────────────────────────────────────────────────────────

export type RediagnosisAbsentReason =
  | 'loading'
  | 'no_baseline'      // brak punktu odniesienia — patrz RediagnosisBaseline
  | 'unknown_segment'  // segment spoza banku 13 pytań
  | 'skipped';         // zawodnik pominął

export type RediagnosisView =
  | { kind: 'absent'; reason: RediagnosisAbsentReason }
  | {
      kind: 'question';
      eyebrow: string;
      segmentName: string;
      lead: string;
      question: string;
      ctx: string;
      scale: readonly (readonly [number, string])[];
      skipLabel: string;
      skipNote: string;
    }
  | {
      kind: 'change';
      eyebrow: string;
      segmentName: string;
      direction: RediagnosisDirection;
      beforeCaption: string;
      afterCaption: string;
      beforeBarPercent: number;
      afterBarPercent: number;
      headline: string;
      body: string;
      notSavedText: string | null;
      /**
       * (PLAN-D-P) Czy zdanie zostało przeramowane trwającą Osłoną. Nie jest
       * dla zawodnika — jest dla logu i dla raportu, żeby dało się odpowiedzieć
       * na pytanie „dlaczego produkt powiedział wtedy akurat to".
       */
      oslona: Obowiazuje;
    };

export function buildRediagnosisView(params: {
  segmentId: string;
  baseline: RediagnosisBaseline;
  /** Odpowiedź zawodnika; `null` = jeszcze nie odpowiedział. */
  answerValue: number | null;
  /** `true`, gdy zawodnik pominął pytanie. */
  skipped?: boolean;
  /** `false`, gdy zapis do bazy się nie udał. */
  saved?: boolean;
  /** Klucz wariantu pozycyjnego z `getPositionWordingKey()`; `null` = wersja uniwersalna. */
  wordingKey?: string | null;
  /** Pełne tygodnie pracy nad Blokiem. */
  weeks?: number | null;
  loading?: boolean;
  /**
   * (PLAN-D-P 13.08.2026) Koperta `weekly_voice.ograniczenia`. `null` = ekran
   * jej nie podał; wtedy zdanie o spadku wygląda tak jak przed tą rundą.
   */
  ograniczenia?: StanOgraniczen | null;
}): RediagnosisView {
  const { segmentId, baseline, answerValue, skipped = false, saved = true,
    wordingKey = null, weeks = null, loading = false, ograniczenia = null } = params;

  if (loading) return { kind: 'absent', reason: 'loading' };
  if (skipped) return { kind: 'absent', reason: 'skipped' };

  const dir = segmentDirection(segmentId);
  const wording = resolveLivingDiagnosisWording(segmentId, wordingKey);
  if (!dir || !wording) return { kind: 'absent', reason: 'unknown_segment' };

  // Bez punktu odniesienia NIE PYTAMY. Wymóg „zawodnik widzi różnicę, nie nowy
  // wynik" znaczy, że pytanie bez czego porównać jest pytaniem bez wartości —
  // a każde pytanie kosztuje uwagę nastolatka.
  if (baseline.state !== 'ready') return { kind: 'absent', reason: 'no_baseline' };

  const segmentName = segmentLabel(segmentId);

  if (answerValue == null) {
    return {
      kind: 'question',
      eyebrow: REDIAGNOSIS_EYEBROW,
      segmentName,
      lead: rediagnosisLead(weeks),
      question: wording.t,
      ctx: wording.ctx,
      scale: DIAGNOSIS_ANSWER_SCALE,
      skipLabel: REDIAGNOSIS_SKIP_LABEL,
      skipNote: REDIAGNOSIS_SKIP_NOTE,
    };
  }

  const change = compareRediagnosis({ baselineScore: baseline.score, answerValue, dir });
  // (PLAN-D-P) Brak koperty = `nie_wiem`, nigdy `nie`. Ta różnica jest cała
  // reguła R5: „nie odczytałem" i „sprawdziłem, nie rośnie" to dwie rzeczy.
  const oslona: Obowiazuje = ograniczenia === null ? 'nie_wiem' : czyOslonaAktywna(ograniczenia);
  return {
    kind: 'change',
    eyebrow: REDIAGNOSIS_EYEBROW,
    segmentName,
    direction: change.direction,
    beforeCaption: REDIAGNOSIS_BEFORE_CAPTION,
    afterCaption: REDIAGNOSIS_AFTER_CAPTION,
    beforeBarPercent: barPercent(change.before),
    afterBarPercent: barPercent(change.after),
    headline: rediagnosisHeadline(change.direction, oslona),
    body: rediagnosisBody(change.direction, oslona),
    notSavedText: saved ? null : REDIAGNOSIS_NOT_SAVED_TEXT,
    oslona,
  };
}
