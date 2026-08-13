// PLAN-D-H 08.2026 (12.08.2026) — NOWY PLIK. Ślad zachowania: czysta logika.
//
//   node --experimental-strip-types lib/sladZachowania.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ── PO CO TO ISTNIEJE ────────────────────────────────────────────────
// `behavioural_trace` powstała w migracji osi decyzji 11.08.2026 i do
// 12.08.2026 miała ZERO wierszy — nikt do niej nie pisał. Bez niej nie da się
// odpowiedzieć na pytanie „czy zawodnik ruszył z miejsca", bo wszystkie cztery
// liczniki liczyłyby się w locie z danych, które z czasem przestają być
// dostępne w tym samym kształcie (spec 5.1: materializacja okresowa,
// nie liczenie w locie).
//
// Ten plik NIE robi zapytań i NIE zna Reacta — dostaje gotowe wiersze
// i oddaje jeden wiersz `behavioural_trace`.
//
// ═══════════════════════════════════════════════════════════════════
// ⚠️ 13.08.2026 (PLAN-D-P) — TEN PLIK NIE MA DZIŚ ANI JEDNEGO KONSUMENTA
//     I JEST TO STAN ŚWIADOMY, NIE PRZEOCZENIE.
//
// Jedynym miejscem, w którym te cztery liczniki były pokazywane, była karta
// „Ostatnie 28 dni, policzone" na ekranie Kalibracji. Kalibracja została
// usunięta z produktu w całości 13.08.2026
// (claude/DECYZJA_KALIBRACJA_USUNIETA_13_08_2026.md) — i słusznie, bo była
// panelem do odczytania, a nie asystentem, który mówi.
//
// PLIK I TABELA `behavioural_trace` ZOSTAJĄ NIETKNIĘTE. Powód nie jest
// sentymentalny. Tego samego dnia Kuba odwrócił zakazy 1 i 3: grywalizacja
// wchodzi do produktu, a ciągłość pracy ma być pokazywana jako liczba
// SKUMULOWANA, która nigdy nie wraca do zera (zasada N1 w
// claude/ZASADY_OBOWIAZUJACE_13_08_2026.md). Ten plik liczy dokładnie te
// liczby, jest przetestowany (`lib/sladZachowania.selftest.ts`, uruchamiany
// przez `tests/run-selftests.mjs`) i za rundę albo dwie dostanie konsumenta
// w rundzie systematyczności. Skasowanie działającego, sprawdzonego kodu po to,
// żeby napisać go od nowa za dwa tygodnie, nie jest sprzątaniem.
//
// ⚠️ CZEGO TO NIE ZNACZY. Nie znaczy, że wolno tę kartę wskrzesić w dawnej
// postaci. Cztery liczniki to są dane, z których WNIOSEK MA WYCIĄGAĆ SYSTEM
// i cicho zmieniać to, co podpowiada — a nie panel, który zawodnik ma odczytać
// i sam sobie zinterpretować. Wracają jako wejście do nagrody za WYKONANĄ
// PRACĘ, nie jako ekran.
//
// ⚠️ I JEDNA LICZBA, KTÓRA MUSI BYĆ ROZWIĄZANA, ZANIM COKOLWIEK TO POKAŻE:
// `daily_logs.calendar_event_id` było 13.08.2026 puste w 10 z 10 wpisów, więc
// licznik „zaplanowane vs odbyte" pokazałby dziś „24 / 0". To nie jest wada
// tego pliku — to jest brak danych na wejściu i musi zostać domknięty w tej
// samej rundzie, w której pojawi się konsument.
// ═══════════════════════════════════════════════════════════════════
//
// ── ZAKAZ 5 Z KONTRAKTU, WPISANY TU JAKO MECHANIZM ───────────────────
// NIGDY nie liczyć „zrobione" po `calendar_events.status = 'completed'` —
// ta wartość nie jest w systemie NIGDZIE zapisywana, więc licznik oparty
// na niej pokazywałby zero i wyglądał jak prawda. „Zrobione" liczy się
// WYŁĄCZNIE po `daily_logs.calendar_event_id`, odduplikowanym: jeden dzień
// z dwoma wpisami do tego samego wydarzenia to jedna odbyta sesja, nie dwie.
//
// ── ODSTĄPIENIE OD SPECYFIKACJI, ŚWIADOME I ZMIERZONE ────────────────
// Spec 5.1 i kontrakt 1.2 definiują „sesje własne poza treningiem drużyny"
// jako `calendar_events` BEZ `focus_block_id`. Zmierzone na żywej bazie
// 12.08.2026: **24 z 24 wydarzeń ma `focus_block_id`** i wszystkie mają
// `event_type = 'micro_session'` — bo w tym produkcie wydarzenia powstają
// z Bloku. Ta definicja dawałaby więc STAŁE ZERO u każdego zawodnika,
// na zawsze, i wyglądałaby jak prawda o nim. To jest dokładnie wzorzec
// „cichego braku".
// Dlatego liczymy sesje własne z tego, co zawodnik NAPRAWDĘ ZROBIŁ:
// `daily_logs.session_type` należący do treningu poza drużyną. Odstąpienie
// jest nazwane w raporcie H i pilnowane asercją.

/** `daily_logs.session_type` uznawane za pracę własną poza treningiem drużyny. */
export const SESJE_WLASNE_TYPY: readonly string[] = ['own_training', 'micro_session'];

/** Wiersz `daily_logs` w kształcie potrzebnym do liczenia. */
export type WpisDziennika = {
  /** Dzień lokalny 'YYYY-MM-DD' — przeliczony przez wywołującego, nie tutaj. */
  dzien: string;
  session_type: string | null;
  calendar_event_id: number | null;
  /** `payload.sleep_hours`, gdy jest; inaczej `null`. */
  sleep_hours: number | null;
};

/** Wiersz `calendar_events` w kształcie potrzebnym do liczenia. */
export type WydarzenieKalendarza = {
  id: number;
  /** `scheduled_date`, 'YYYY-MM-DD'. */
  dzien: string;
};

export type Okno = { od: string; do_: string };

export type Slad = {
  planned_sessions: number;
  done_sessions: number;
  own_sessions: number;
  sleep_median_h: number | null;
  days_with_entry: number;
};

export const KOLUMNY_SLADU =
  'window_start,window_end,planned_sessions,done_sessions,own_sessions,sleep_median_h,days_with_entry,computed_at';

/** Domyślne okno Lustra i osi B kalibracji: cztery tygodnie wstecz. */
export const OKNO_DNI = 28;

/** 'YYYY-MM-DD' przesunięte o `dni` — w UTC, bez pułapek strefowych. */
export function przesunDzien(dzien: string, dni: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dzien);
  if (!m) throw new Error(`przesunDzien: „${dzien}" nie jest datą 'YYYY-MM-DD'`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // Sprawdzenie, czy data w ogóle istnieje (31 lutego przewinąłby się cicho).
  if (d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) {
    throw new Error(`przesunDzien: „${dzien}" nie jest istniejącą datą`);
  }
  d.setUTCDate(d.getUTCDate() + dni);
  return d.toISOString().slice(0, 10);
}

/** Okno `OKNO_DNI` dni kończące się dniem `dzis` włącznie. */
export function oknoWstecz(dzis: string, dni: number = OKNO_DNI): Okno {
  return { od: przesunDzien(dzis, -(dni - 1)), do_: dzis };
}

function wOknie(dzien: string, okno: Okno): boolean {
  return dzien >= okno.od && dzien <= okno.do_;
}

/** Mediana — z jawnym „nie wiem" przy pustym wejściu, nigdy z zerem. */
export function mediana(liczby: number[]): number | null {
  const s = liczby.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (s.length === 0) return null;
  const i = Math.floor(s.length / 2);
  const m = s.length % 2 === 1 ? s[i] : (s[i - 1] + s[i]) / 2;
  return Math.round(m * 10) / 10;
}

/**
 * Cztery liczniki Lustra dla jednego okna.
 *
 * ⚠️ Ta funkcja NIE MA prawa dostać `null` zamiast tablicy. Gdy odczyt się
 * nie udał, wywołujący ma NIE WOŁAĆ tej funkcji i NIE ZAPISYWAĆ wiersza —
 * inaczej w `behavioural_trace` na stałe wylądowałyby zera, których nikt
 * już nigdy nie odróżni od prawdziwego „nic nie zrobił". Materializacja
 * różni się tym od liczenia w locie: kłamstwo zostaje na zawsze.
 */
export function policzSlad(params: {
  okno: Okno;
  wpisy: WpisDziennika[];
  wydarzenia: WydarzenieKalendarza[];
}): Slad {
  const { okno } = params;
  const wpisy = params.wpisy.filter((w) => wOknie(w.dzien, okno));
  const wydarzenia = params.wydarzenia.filter((e) => wOknie(e.dzien, okno));

  const idWOknie = new Set(wydarzenia.map((e) => e.id));

  // ODDUPLIKOWANE: `Set`, nie `length`. Dwa wpisy do tego samego wydarzenia
  // to jedna odbyta sesja — inaczej zawodnik, który poprawił wpis, wyglądałby
  // na pracowitszego.
  const odbyte = new Set<number>();
  for (const w of wpisy) {
    if (w.calendar_event_id !== null && idWOknie.has(w.calendar_event_id)) {
      odbyte.add(w.calendar_event_id);
    }
  }

  const wlasne = wpisy.filter(
    (w) => w.session_type !== null && SESJE_WLASNE_TYPY.includes(w.session_type),
  ).length;

  const sen = wpisy
    .map((w) => w.sleep_hours)
    .filter((h): h is number => typeof h === 'number' && Number.isFinite(h));

  const dni = new Set(wpisy.map((w) => w.dzien));

  return {
    planned_sessions: wydarzenia.length,
    done_sessions: odbyte.size,
    own_sessions: wlasne,
    sleep_median_h: mediana(sen),
    days_with_entry: dni.size,
  };
}

/**
 * Wiersz do `upsert` po kluczu `(user_id, window_start, window_end)`.
 * `computed_at` idzie z appki, nie z domyślnej wartości bazy — wiersz ma
 * mówić, kiedy został POLICZONY, a nie kiedy dotarł.
 */
export function wierszSladu(params: {
  userId: string;
  okno: Okno;
  slad: Slad;
  teraz: Date;
}): Record<string, unknown> {
  return {
    user_id: params.userId,
    window_start: params.okno.od,
    window_end: params.okno.do_,
    planned_sessions: params.slad.planned_sessions,
    done_sessions: params.slad.done_sessions,
    own_sessions: params.slad.own_sessions,
    sleep_median_h: params.slad.sleep_median_h,
    days_with_entry: params.slad.days_with_entry,
    computed_at: params.teraz.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────
// TREŚĆ — ⚠️ DO PRZEJRZENIA PRZEZ KUBĘ
// ─────────────────────────────────────────────────────────────────────
// ⚠️ REGUŁA WYPOWIEDZI, BEZWZGLĘDNA (spec 5.2, zakaz 11): system KŁADZIE
// FAKTY OBOK SIEBIE I MILCZY. Nigdy nie formułuje wniosku o zawodniku.
// Dlatego poniżej nie ma i nie może się pojawić ani jedno zdanie oceniające —
// styl konfrontacyjny korelował z oporem i GORSZYM wynikiem po 12 miesiącach.

/** Ile dni obejmuje okno, z obiema granicami włącznie. */
export function dniOkna(okno: Okno): number {
  const naMs = (d: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    if (!m) throw new Error(`dniOkna: „${d}" nie jest datą 'YYYY-MM-DD'`);
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  };
  return 1 + Math.round((naMs(okno.do_) - naMs(okno.od)) / 86400000);
}

/** Fakty w zdaniach, bez wniosku. Zwraca listę linii do wyświetlenia. */
export function opiszSlad(slad: Slad, okno: Okno): string[] {
  const linie: string[] = [];
  linie.push(`Ostatnie ${dniOkna(okno)} dni.`);
  linie.push(`Zaplanowane sesje: ${slad.planned_sessions}. Odbyte: ${slad.done_sessions}.`);
  linie.push(`Sesje poza treningiem drużyny: ${slad.own_sessions}.`);
  linie.push(
    slad.sleep_median_h === null
      ? 'Sen: nie masz w tym okresie ani jednego wpisu o śnie.'
      : `Mediana snu: ${String(slad.sleep_median_h).replace('.', ',')} h.`,
  );
  linie.push(`Dni z jakimkolwiek wpisem: ${slad.days_with_entry}.`);
  return linie;
}
