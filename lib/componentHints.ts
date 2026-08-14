// WIEDZA B4 08.08.2026 — NOWY PLIK.
//
// PO CO ISTNIEJE: żeby zawodnik zobaczył na ekranie Dziś JEDNĄ konkretną rzecz
// z materiałów Gamechange — z widocznym źródłem („Moc, s. 8") — zamiast kolejnej
// ogólnej rady. To źródło jest całą różnicą: zdanie bez niego mógłby napisać
// dowolny model, zdanie z nim pochodzi z materiału Kuby i da się je sprawdzić.
// (decyzja B1 + C1 warstwa 1, claude/DECYZJE_PRODUKTOWE_07_08_2026.md;
//  treść i kształt tabeli: claude/PODPOWIEDZI_Z_MATERIALOW_A.md, sekcje 4.3 i 4.5)
//
// DLACZEGO OSOBNY PLIK, A NIE KOD W `dzis.tsx`: tu siedzą trzy reguły, których
// nie wolno pomylić i których nie da się sprawdzić przez uruchomienie appki —
// bramka wiekowa (A9), rozróżnienie „pusto" od „nie ma tabeli" (R5) i wybór
// jednej podpowiedzi z kilkunastu. Wszystkie trzy są czystymi funkcjami i mają
// swój selftest (`lib/componentHints.selftest.ts` + `tests/`), uruchamiany bez
// appki i bez bazy. Ten sam wzorzec co `lib/focusBlockProgress.ts`.
//
// CZEGO TEN PLIK NIE ROBI: nie dotyka Supabase (zapytanie składa ekran) i nie
// zna Reacta. Wejście to surowe wiersze, wyjście to gotowy stan do narysowania.

// ─────────────────────────────────────────────────────────────
// KSZTAŁT WIERSZA — 1:1 z migracją z PODPOWIEDZI_Z_MATERIALOW_A.md, sekcja 4.3
// ─────────────────────────────────────────────────────────────

export type HintAudience = 'zawodnik' | 'rodzic' | 'oba';
export type HintKind = 'zrobic' | 'zrozumiec';

export type ComponentHintRow = {
  klucz: string;
  segment_id: string;
  /** NULL = podpowiedź wisi na całym segmencie (reguła przekrojowa). */
  component_id: string | null;
  obszar_name: string | null;
  element_name: string | null;
  hint: string;
  odbiorca: HintAudience;
  /** Decyzja A9 — 16 dla treści z dawkami suplementacyjnymi. NULL = bez bramki. */
  min_age: number | null;
  rodzaj: HintKind;
  zrodlo: string | null;
  strony: string | null;
  dowody: string | null;
  pozycja: number;
  active: boolean;
  /**
   * PRAKTYKA-EKRAN B6 08.08.2026 — `component_hints.zawsze_widoczna boolean
   * default false`. Migracja u Kuby, MOŻE JESZCZE NIE BYĆ WKLEJONA — dlatego
   * pole jest OPCJONALNE. Wiersz bez tego pola (odczyt starą listą kolumn)
   * jest poprawnym wierszem i zachowuje się dokładnie jak dotąd.
   */
  zawsze_widoczna?: boolean | null;
};

/**
 * Kolumny, o które ekran pyta bazę — jedno źródło listy, jak RECOMMENDATION_COLUMNS.
 *
 * ⚠️ PRAKTYKA-EKRAN B6 08.08.2026 — TA STAŁA CELOWO NIE ZAWIERA
 * `zawsze_widoczna`. To nie jest przeoczenie. PostgREST przy nieznanej
 * kolumnie odrzuca CAŁE zapytanie (`42703`), a nie tylko tę kolumnę — więc
 * dopisanie jej tutaj sprawiłoby, że w dniu, w którym migracja nie jest
 * jeszcze wklejona, zawodnik przestaje widzieć JAKĄKOLWIEK podpowiedź.
 * Nowa funkcja zabiłaby starą.
 *
 * Rozszerzona lista jest osobno (`COMPONENT_HINT_COLUMNS_WITH_ALWAYS`) razem
 * z predykatem ścieżki odzysku (`shouldRetryWithoutAlwaysVisible`).
 */
export const COMPONENT_HINT_COLUMNS =
  'klucz,segment_id,component_id,obszar_name,element_name,hint,odbiorca,min_age,'
  + 'rodzaj,zrodlo,strony,dowody,pozycja,active';

/**
 * Ta sama lista + `zawsze_widoczna`. Wolno jej użyć WYŁĄCZNIE razem ze ścieżką
 * odzysku — wzorzec dwóch prób, ten sam co przy `goals.component_id`
 * w `app/(tabs)/cele.tsx` (runda 5, sekcja 3.6 raportu B):
 *
 *   let { data, error } = await supabase.from('component_hints')
 *     .select(COMPONENT_HINT_COLUMNS_WITH_ALWAYS).eq('segment_id', s).eq('active', true);
 *   if (error && shouldRetryWithoutAlwaysVisible(error)) {
 *     console.warn(ALWAYS_VISIBLE_COLUMN_MISSING_WARN);
 *     ({ data, error } = await supabase.from('component_hints')
 *       .select(COMPONENT_HINT_COLUMNS).eq('segment_id', s).eq('active', true));
 *   }
 *
 * Po drugiej próbie wiersze nie mają pola `zawsze_widoczna`, więc
 * `isAlwaysVisible()` daje `false` dla każdego i całe zachowanie ekranu jest
 * BAJT W BAJT dzisiejsze. To jest warunek, pod którym treść bezpieczeństwa
 * może w ogóle wejść do bazy.
 */
export const COMPONENT_HINT_COLUMNS_WITH_ALWAYS = `${COMPONENT_HINT_COLUMNS},zawsze_widoczna`;

/**
 * Czy ten błąd znaczy „nie ma kolumny `zawsze_widoczna`" — czyli czy należy
 * powtórzyć zapytanie starą listą kolumn.
 *
 * ⚠️ ROZMYŚLNIE WĘŻSZY niż `isMissingTableError`: brak TABELI to osobny,
 * jawny stan ekranu (`table_missing`, reguła R5) i nie wolno go zamienić na
 * cichy powrót do starej listy kolumn — bo wtedy „migracja podpowiedzi nie
 * weszła" przestałoby być widoczne.
 */
export function shouldRetryWithoutAlwaysVisible(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const text = [e.message, e.details, e.hint]
    .map((v) => (typeof v === 'string' ? v : ''))
    .join(' ')
    .toLowerCase();
  // NAZWA KOLUMNY W KOMUNIKACIE jest najmocniejszym sygnałem i nie da się jej
  // pomylić z brakiem tabeli — komunikat o braku tabeli nigdy jej nie zawiera.
  if (text.includes('zawsze_widoczna')) return true;
  // `42703` to w Postgresie `undefined_column`. Brak TABELI ma kod `42P01`,
  // więc ten warunek nie może przypadkiem zjeść stanu `table_missing`.
  if (code === '42703') return true;
  // TERMINARZ A7 08.08.2026 (M22): po naprawie B34 `PGRST204` NIE wpada już
  // w `isMissingTableError()`, więc powtórka niczego nie zjada. Goły
  // `PGRST204` przy zapytaniu rozszerzoną listą kolumn znaczy w praktyce
  // „PostgREST nie zna którejś z kolumn" — a jedyną kolumną spoza migracji
  // podpowiedzi w tym zapytaniu jest właśnie `zawsze_widoczna`. Powtórka
  // starą listą wraca do zachowania sprzed rundy 6 = ścieżka odzysku.
  if (code === 'PGRST204') return true;
  return false;
}

/** Log ścieżki odzysku — mówi wprost, CZEGO ZAWODNIK NIE ZOBACZY. */
export const ALWAYS_VISIBLE_COLUMN_MISSING_WARN =
  '[podpowiedzi] Kolumna component_hints.zawsze_widoczna nie istnieje w bazie — podpowiedzi '
  + 'oznaczone jako zawsze widoczne (m.in. treść bezpieczeństwa: telefon zaufania) NIE BĘDĄ '
  + 'pokazywane zawsze, tylko wpadną do rotacji dziennej, czyli pokażą się raz na kilkanaście '
  + 'dni w losowy dzień. Do czasu wklejenia migracji NIE WPUSZCZAJ treści bezpieczeństwa do '
  + 'tabeli (audyt spójności po 5 rundach, sekcja 1).';

// ─────────────────────────────────────────────────────────────
// REGUŁA R5 — „pusto" i „nie ma tabeli" to DWIE RÓŻNE RZECZY
// ─────────────────────────────────────────────────────────────
// Migracja `component_hints` (214 wierszy) czeka na wklejenie przez Kubę —
// punkt 6 listy z audytu po bloku 3. Do tego czasu każde zapytanie o tę tabelę
// wraca z błędem, a nie z pustym wynikiem. Gdyby ekran traktował jedno jak
// drugie, pokazałby „nic tu nie ma" i nikt nigdy by się nie dowiedział, że
// funkcja jest niewdrożona — czyli dokładnie „cichy brak" z audytu po bloku 3.
//
// PostgREST zgłasza brak tabeli na dwa sposoby, zależnie od wersji i od tego,
// czy pytanie w ogóle dotarło do Postgresa: kodem `42P01` (Postgres,
// undefined_table) albo `PGRST205` („Could not find the table … in the schema
// cache"). Sprawdzamy oba, plus tekst — bo kod bywa pusty, a wtedy jedyną
// informacją jest komunikat.
export function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  if (code === '42P01' || code === 'PGRST205') return true;
  // TERMINARZ A7 08.08.2026 (M22, naprawa znaleziska B34 z rundy 6):
  // `PGRST204` znaczy w PostgREST „nie znaleziono KOLUMNY", a `42703` to
  // Postgresowe `undefined_column`. Do tej rundy oba wpadały tutaj i ekran
  // mówił „materiały w przygotowaniu" (= migracja nie weszła) przy błędzie,
  // który migracji tabeli w ogóle nie dotyczy. Brak kolumny to stan BŁĘDU
  // („nie udało się wczytać"), nie stan „braku migracji podpowiedzi".
  if (code === 'PGRST204' || code === '42703') return false;
  const text = [e.message, e.details, e.hint]
    .map((v) => (typeof v === 'string' ? v : ''))
    .join(' ')
    .toLowerCase();
  if (!text.includes('component_hints')) return false;
  // Komunikat wymieniający słowo „column" opisuje kolumnę, nie tabelę —
  // np. "column component_hints.zawsze_widoczna does not exist" zawiera
  // nazwę tabeli i frazę "does not exist", a tabela istnieje (M22/B34).
  if (text.includes('column')) return false;
  return text.includes('does not exist')
    || text.includes('could not find')
    || text.includes('schema cache')
    || text.includes('undefined table');
}

// ─────────────────────────────────────────────────────────────
// BRAMKA WIEKOWA — decyzja A9, twarda
// ─────────────────────────────────────────────────────────────
// „Poniżej 16 lat zawodnik nie widzi podpowiedzi z dawkami suplementacyjnymi,
// kropka." Appka zna wyłącznie ROCZNIK (`public.users.birth_year`) — nie datę
// urodzenia. Rocznik 2010 w sierpniu 2026 znaczy „ten zawodnik ma 15 ALBO 16
// lat", zależnie od tego, czy urodziny już były.
//
// Dlatego liczymy WIEK NAJNIŻSZY MOŻLIWY (`rok bieżący − rocznik − 1`), a nie
// średni. Konsekwencja jest świadoma: szesnastolatek ze stycznia zobaczy te
// podpowiedzi dopiero po Nowym Roku. Błąd w tę stronę oznacza „zawodnik nie
// dostał zdania, które mógłby dostać". Błąd w drugą stronę oznacza „piętnastolatek
// dostał dawkę suplementu". To nie są koszty tej samej wagi.
export function minimumPossibleAge(birthYear: number | null | undefined, now: Date = new Date()): number | null {
  if (typeof birthYear !== 'number' || !Number.isFinite(birthYear)) return null;
  if (birthYear < 1900 || birthYear > 2100) return null; // literówka w profilu, nie wiek
  const age = now.getFullYear() - birthYear - 1;
  return age < 0 ? 0 : age;
}

/**
 * Czy ta podpowiedź przechodzi bramkę wiekową.
 * `age === null` znaczy „appka NIE ZNA wieku" — wtedy przechodzą wyłącznie
 * podpowiedzi bez bramki. Nieznany wiek nigdy nie otwiera bramki.
 */
export function passesAgeGate(row: Pick<ComponentHintRow, 'min_age'>, age: number | null): boolean {
  if (row.min_age == null) return true;
  if (age == null) return false;
  return age >= row.min_age;
}

/**
 * Odbiorca: zawodnik widzi `zawodnik` i `oba`. `rodzic` należy do raportu
 * rodzica (A3/C3) — ale patrz `audienceAllowsPlayer` niżej: od rundy 11
 * zawodnik PEŁNOLETNI jest własnym rodzicem i tę warstwę dostaje wprost.
 * Ta funkcja zostaje czysta (sam wiersz, bez wieku), bo tak używa jej
 * kontrakt A9 i raport rodzica po stronie backendu.
 */
export function isForPlayer(row: Pick<ComponentHintRow, 'odbiorca'>): boolean {
  return row.odbiorca === 'zawodnik' || row.odbiorca === 'oba';
}

// ─────────────────────────────────────────────────────────────
// DOROSŁY R11 08.08.2026 — „18+ = własny rodzic"
// ─────────────────────────────────────────────────────────────
// Routing `odbiorca='rodzic'` istnieje po to, żeby LICZBOWE dawki suplementów
// szły do osoby, która u nieletniego kupuje i pilnuje dawki. U zawodnika
// PEŁNOLETNIEGO tą osobą jest on sam — dotychczas nie widział tej warstwy
// wcale, bo dorosły amator nie ma konta rodzica (audyt ograniczeń wiekowych,
// AUDYT_OGRANICZEN_WIEKOWYCH_R11.md, rekomendacja 1).
//
// DWIE reguły, obie zależne od DOLNEJ granicy wieku (`minimumPossibleAge`,
// ten sam konserwatyzm co bramka A9 — rocznik 2008 w 2026 daje dolną 17,
// więc warstwa rodzica wejdzie dopiero, gdy pełnoletność jest PEWNA):
//   1. wiersze `odbiorca='rodzic'` WCHODZĄ do puli zawodnika,
//   2. odesłania do rodzica (teksty systemowe decyzji A9, `zrodlo` zawiera
//      „decyzja A9") WYCHODZĄ z puli — „ustal z rodzicem, on pilnuje dawki"
//      jest u dorosłego zdaniem fałszywym, a od tej rundy stałaby OBOK
//      właściwej dawki.
// Nieznany wiek NIGDY nie włącza warstwy rodzica (fail-closed, jak A9).

/** Dolna granica pełnoletności. */
export const ADULT_MIN_AGE = 18;

/** Czy DOLNA granica wieku dowodzi pełnoletności. `null` = nie dowodzi. */
export function isAdultLowerBound(age: number | null): boolean {
  return age != null && age >= ADULT_MIN_AGE;
}

/** Tekst systemowy kierujący po dawki do rodzica (decyzja A9) — nie z materiału. */
export function isParentReferralRow(row: Pick<ComponentHintRow, 'zrodlo'>): boolean {
  return (row.zrodlo ?? '').toLowerCase().includes('decyzja a9');
}

/**
 * Filtr odbiorcy Z WIEKIEM — tego używa `selectHintsForPlayer`.
 * Nieletni i nieznany wiek: dokładnie dawne `isForPlayer` (bajt w bajt).
 * Dorosły: dodatkowo wiersze `rodzic`. Bramka A9 (`passesAgeGate`) działa
 * na tych wierszach dalej, bez zmian — 18 ≥ 16, więc niczego nie ukryje,
 * ale gdyby kiedyś powstał wiersz `min_age=21`, bramka go przytrzyma.
 */
export function audienceAllowsPlayer(
  row: Pick<ComponentHintRow, 'odbiorca'>,
  age: number | null,
): boolean {
  if (isForPlayer(row)) return true;
  return row.odbiorca === 'rodzic' && isAdultLowerBound(age);
}

// ─────────────────────────────────────────────────────────────
// ŹRÓDŁO — to, co odróżnia tę podpowiedź od tekstu dowolnego modelu
// ─────────────────────────────────────────────────────────────
// W bazie `zrodlo` brzmi „Moc — System Gamechange (pełny)", a `strony` to „8"
// albo „5, 13" albo „6–7". Na ekranie ma stać „Moc, s. 8" — nazwa materiału
// i strona, nic więcej. Reszta to szum dla zawodnika.
//
// Zwraca `null`, gdy źródła NIE MA — a taki przypadek istnieje i jest jeden:
// zdanie kierujące po dawki do rodzica (`decyzja A9 (tekst systemowy — nie
// z materiału)`, `strony = '—'`). Nie wolno mu dorobić strony, której nie ma.
const SOURCE_SUFFIXES = [
  ' — System Gamechange (pełny)',
  ' (wprowadzenie)',
  '.pdf',
];

export function formatHintSource(
  zrodlo: string | null | undefined,
  strony: string | null | undefined,
): string | null {
  const raw = (zrodlo ?? '').trim();
  if (!raw) return null;
  if (raw.toLowerCase().includes('decyzja a9')) return null; // tekst systemowy, nie materiał
  let title = raw;
  for (const suffix of SOURCE_SUFFIXES) {
    if (title.toLowerCase().endsWith(suffix.toLowerCase())) {
      title = title.slice(0, title.length - suffix.length).trim();
    }
  }
  if (!title) return null;
  const pages = (strony ?? '').trim();
  if (!pages || pages === '—' || pages === '-') return title;
  return `${title}, s. ${pages}`;
}

// ─────────────────────────────────────────────────────────────
// WYBÓR — z kilkunastu podpowiedzi ma zostać JEDNA
// ─────────────────────────────────────────────────────────────

/**
 * Wiersze, które ten zawodnik może dziś zobaczyć, w kolejności trafności.
 *
 * Kolejność (ta sama, co proponuje zapytanie z PODPOWIEDZI_Z_MATERIALOW_A.md 4.5):
 *  1. podpowiedzi wycelowane w Element jego Bloku Skupienia (`component_id`),
 *  2. potem reguły przekrojowe segmentu (`component_id IS NULL`),
 *  3. w obu grupach: najpierw te ze ŹRÓDŁEM (bez źródła podpowiedź traci to,
 *     po czym zawodnik ma poznać, że to nie jest wymyślone zdanie),
 *  4. na końcu `pozycja`, a przy remisie `klucz` — żeby wynik był ten sam przy
 *     każdym uruchomieniu, niezależnie od kolejności wierszy z bazy.
 */
export function selectHintsForPlayer(params: {
  rows: ComponentHintRow[];
  /** Element aktywnego Bloku Skupienia. `null` = zawodnik nie ma Bloku. */
  componentId?: string | null;
  /** Wiek najniższy możliwy (patrz `minimumPossibleAge`). `null` = appka nie zna. */
  age: number | null;
}): ComponentHintRow[] {
  const { rows, componentId = null, age } = params;
  const eligible = rows.filter((r) =>
    r.active !== false
    // DOROSŁY R11: odbiorca zależy od wieku — u pełnoletniego wchodzi też
    // warstwa `rodzic`, a odesłania do rodzica (teksty A9) wypadają.
    && audienceAllowsPlayer(r, age)
    && !(isAdultLowerBound(age) && isParentReferralRow(r))
    && passesAgeGate(r, age)
    && typeof r.hint === 'string'
    && r.hint.trim().length > 0
    // Podpowiedź przypięta do INNEGO Elementu niż ten, nad którym zawodnik
    // pracuje, jest dla niego szumem — segmentowe (component_id = NULL)
    // zostają zawsze, bo dotyczą całego obszaru.
    && (r.component_id == null || (componentId != null && r.component_id === componentId))
  );

  return eligible.sort((a, b) => {
    const aTargeted = a.component_id != null ? 0 : 1;
    const bTargeted = b.component_id != null ? 0 : 1;
    if (aTargeted !== bTargeted) return aTargeted - bTargeted;
    const aSourced = formatHintSource(a.zrodlo, a.strony) ? 0 : 1;
    const bSourced = formatHintSource(b.zrodlo, b.strony) ? 0 : 1;
    if (aSourced !== bSourced) return aSourced - bSourced;
    const aPos = Number.isFinite(a.pozycja) ? a.pozycja : 999;
    const bPos = Number.isFinite(b.pozycja) ? b.pozycja : 999;
    if (aPos !== bPos) return aPos - bPos;
    return a.klucz < b.klucz ? -1 : a.klucz > b.klucz ? 1 : 0;
  });
}

// ─────────────────────────────────────────────────────────────
// PRAKTYKA-EKRAN B6 08.08.2026 — TREŚĆ, KTÓRA NIE MOŻE CZEKAĆ NA SWOJĄ KOLEJ
// ─────────────────────────────────────────────────────────────
// To jest funkcja bezpieczeństwa, nie funkcja UI.
//
// Rotacja z rundy 4 pokazuje JEDNĄ podpowiedź dziennie, wybraną numerem dnia.
// Dla treści z materiałów to jest dokładnie to, czego trzeba. Dla treści
// bezpieczeństwa (telefon zaufania, „co zrobić, gdy jest źle") to jest wada
// wprost zagrażająca: przy kilkunastu podpowiedziach w segmencie taka treść
// pokazałaby się RAZ NA TRZY TYGODNIE, w losowy dzień — a zawodnik, któremu
// jest źle, najczęściej nie szuka (audyt spójności po 5 rundach, sekcja 1).
//
// Kolumna `zawsze_widoczna` rozwiązuje to jedną regułą: wiersze `true`
// WYPADAJĄ Z ROTACJI i są pokazywane zawsze, gdy segment jest aktywny.
//
// ⚠️ `zawsze_widoczna` NIE JEST OBEJŚCIEM BRAMKI WIEKOWEJ ANI FILTRU ODBIORCY.
// Wiersz zawsze widoczny przechodzi dokładnie te same filtry co każdy inny
// (A9 + `odbiorca`) — inaczej wystarczyłoby jedno `true` w bazie, żeby dawka
// suplementacyjna trafiła do czternastolatka. Osobna asercja tego pilnuje
// i jest to najważniejsza asercja tej części.

/** Wiersz oznaczony jako zawsze widoczny. Brak pola (stara lista kolumn) = `false`. */
export function isAlwaysVisible(row: Pick<ComponentHintRow, 'zawsze_widoczna'>): boolean {
  return row.zawsze_widoczna === true;
}

/**
 * Wiersze zawsze widoczne — te, które mają stać na ekranie niezależnie od dnia.
 * Wejście: WYNIK `selectHintsForPlayer()`, czyli pula już po bramce wiekowej,
 * filtrze odbiorcy i dopasowaniu do Elementu. Ta funkcja nie filtruje niczego
 * poza `zawsze_widoczna` — i to jest celowe, żeby nie dało się jej użyć
 * zamiast tamtych filtrów.
 */
export function selectAlwaysVisibleHints(eligible: ComponentHintRow[]): ComponentHintRow[] {
  return eligible.filter(isAlwaysVisible);
}

/** Wiersze wchodzące do rotacji dziennej — czyli wszystkie POZA zawsze widocznymi. */
export function selectRotatingHints(eligible: ComponentHintRow[]): ComponentHintRow[] {
  return eligible.filter((r) => !isAlwaysVisible(r));
}

/**
 * Numer dnia — ziarno rotacji. Liczony z DATY LOKALNEJ, nie z `Date.now()`,
 * żeby podpowiedź zmieniała się o północy zawodnika, a nie o północy UTC.
 */
export function dayIndex(now: Date = new Date()): number {
  return Math.floor(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000
  );
}

/**
 * Jedna podpowiedź z listy — ta sama przez cały dzień, inna jutro.
 *
 * DLACZEGO ROTACJA, A NIE „ZAWSZE PIERWSZA": pierwsza podpowiedź segmentu
 * przestaje być nowa po drugim wejściu na ekran, a Blok Skupienia trwa 4–8
 * tygodni — zawodnik widziałby jedno zdanie przez dwa miesiące. Rotacja po dniu
 * nie wymaga ANI JEDNEGO nowego pytania i ANI JEDNEGO zapisu do bazy (zakaz
 * z polecenia), a mimo to przez miesiąc pokazuje kilkanaście różnych rzeczy.
 *
 * DLACZEGO NIE LOSOWO: przy losowaniu ta sama podpowiedź mogłaby wypaść dwa
 * razy pod rząd, a odświeżenie ekranu (`RefreshControl`) podmieniałoby tekst
 * pod palcem. Wynik jest funkcją dnia i listy, więc w obrębie dnia jest stały.
 */
export function pickHintOfDay<T>(sorted: T[], day: number): T | null {
  if (sorted.length === 0) return null;
  const idx = ((day % sorted.length) + sorted.length) % sorted.length;
  return sorted[idx];
}

// ─────────────────────────────────────────────────────────────
// STAN DO NARYSOWANIA
// ─────────────────────────────────────────────────────────────

/**
 * PRAKTYKA-EKRAN B6 08.08.2026 — podpowiedź gotowa do narysowania.
 * Ten sam kształt dla rotacyjnej i dla zawsze widocznej, żeby ekran rysował
 * je JEDNYM kawałkiem kodu i nie dało się ich przypadkiem różnie potraktować.
 */
export type HintPresentation = { hint: ComponentHintRow; source: string | null };

const present = (hint: ComponentHintRow): HintPresentation =>
  ({ hint, source: formatHintSource(hint.zrodlo, hint.strony) });

/**
 * ⚠️ PRAKTYKA-EKRAN B6 08.08.2026 — KAŻDY wariant niesie `alwaysVisible`.
 * Nie jest to pole „tylko przy ready": treść bezpieczeństwa ma stać na ekranie
 * także wtedy, gdy rotacja nie ma czego pokazać. Dlatego doszedł też szósty
 * stan, `always_only` — „rotacja pusta, ale jest treść zawsze widoczna". Bez
 * niego ten przypadek wpadłby do `empty` i ekran powiedziałby „nie mamy jeszcze
 * podpowiedzi", mając w ręku treść, którą właśnie kazano pokazywać zawsze.
 *
 * Dzisiaj (kolumna niewklejona) `alwaysVisible` jest ZAWSZE pustą tablicą,
 * a `always_only` nie może wystąpić — zachowanie jest bajt w bajt dzisiejsze.
 */
export type HintState =
  /** Zawodnik nie ma aktywnego Celu — nie ma o co pytać, ekran nie rysuje nic. */
  | { state: 'no_goal'; alwaysVisible: HintPresentation[] }
  | { state: 'loading'; alwaysVisible: HintPresentation[] }
  /** R5: tabeli nie ma w bazie. Migracja czeka. To NIE jest „pusto". */
  | { state: 'table_missing'; alwaysVisible: HintPresentation[] }
  /** R5: zapytanie padło z innego powodu (sieć, RLS). Też nie jest „pusto". */
  | { state: 'error'; alwaysVisible: HintPresentation[] }
  /** Tabela jest, dla tego segmentu nie ma jeszcze treści. */
  | { state: 'empty'; alwaysVisible: HintPresentation[] }
  /** Rotacja pusta, ale jest treść zawsze widoczna — rysujemy samą ją. */
  | { state: 'always_only'; alwaysVisible: HintPresentation[] }
  | {
    state: 'ready';
    hint: ComponentHintRow;
    source: string | null;
    alwaysVisible: HintPresentation[];
    /**
     * ⭐ PLAN-D-T 08.2026 (13.08.2026), zadanie T7 — NAJBLIŻSZA PODPOWIEDŹ
     * `rodzaj = 'zrobic'` Z TEJ SAMEJ PULI.
     *
     * PO CO: 114 z 297 podpowiedzi ma `rodzaj = 'zrozumiec'` (zmierzone na
     * żywej bazie 14.08.2026: 114 / 183 / 297) i renderowało się jako karta
     * „Warto wiedzieć" — czyli wypowiedź kończąca się na wiedzy, wprost
     * przeciw M4 („żaden materiał nie kończy się na wiedzy").
     *
     * ⚠️ SPROSTOWANIE, KTÓRE ZMIENIA CAŁE ROZWIĄZANIE: te treści W WIĘKSZOŚCI
     * ZAWIERAJĄ POLECENIE („wydech musi być dłuższy niż wdech", „cel to
     * jasnosłomkowy kolor moczu"). Problemem nie była treść, tylko szablon,
     * który podawał je pod nagłówkiem „Warto wiedzieć" zamiast „Co dziś
     * zrobić". ⛔ DLATEGO NIE PRZEPISUJEMY 114 TREŚCI — zmieniamy szablon,
     * a to pole jest zapasem na wypadek, gdyby wylosowana podpowiedź naprawdę
     * nie niosła nic do zrobienia.
     *
     * `null` znaczy: w całej puli tego zawodnika nie ma ani jednej podpowiedzi
     * `'zrobic'`. Wtedy ekran bierze wylosowaną — bo jej treść i tak najczęściej
     * jest poleceniem — i mówi o tym jawnie w logu, zamiast udawać, że ma zapas.
     */
    doZrobienia: HintPresentation | null;
  };

export function buildHintState(params: {
  hasGoal: boolean;
  error: unknown | null;
  rows: ComponentHintRow[] | null;
  componentId?: string | null;
  age: number | null;
  day?: number;
}): HintState {
  const { hasGoal, error, rows, componentId = null, age, day = dayIndex() } = params;
  const none: HintPresentation[] = [];
  if (!hasGoal) return { state: 'no_goal', alwaysVisible: none };
  if (error) {
    return isMissingTableError(error)
      ? { state: 'table_missing', alwaysVisible: none }
      : { state: 'error', alwaysVisible: none };
  }
  if (rows == null) return { state: 'loading', alwaysVisible: none };

  // Jedna pula, te same filtry co dotąd (A9 + odbiorca + Element + `active`),
  // i DOPIERO potem podział na „zawsze" i „w rotacji". Kolejność jest ważna:
  // gdyby wiersze zawsze widoczne były wyjmowane PRZED filtrami, `zawsze_widoczna`
  // stałoby się obejściem bramki wiekowej.
  const eligible = selectHintsForPlayer({ rows, componentId, age });
  const alwaysVisible = selectAlwaysVisibleHints(eligible).map(present);
  const rotacja = selectRotatingHints(eligible);
  const picked = pickHintOfDay(rotacja, day);

  if (!picked) {
    return alwaysVisible.length > 0
      ? { state: 'always_only', alwaysVisible }
      : { state: 'empty', alwaysVisible };
  }
  return {
    state: 'ready',
    hint: picked,
    source: formatHintSource(picked.zrodlo, picked.strony),
    alwaysVisible,
    // ⭐ PLAN-D-T (T7) — patrz opis pola przy `HintState`.
    doZrobienia: najblizszaDoZrobienia(rotacja, day),
  };
}

/**
 * ⭐ PLAN-D-T 08.2026 (13.08.2026), zadanie T7 — NAJBLIŻSZA PODPOWIEDŹ
 * `rodzaj = 'zrobic'` z tej samej, już przefiltrowanej puli.
 *
 * „Najbliższa" znaczy: idąc OD WYLOSOWANEJ NA DZIŚ, cyklicznie w przód, po tej
 * samej posortowanej liście. Dwa powody, oba praktyczne:
 *   • wynik jest funkcją dnia i listy, więc w obrębie dnia jest STAŁY —
 *     odświeżenie ekranu nie podmienia tekstu pod palcem (ta sama własność,
 *     na której stoi `pickHintOfDay`);
 *   • idąc od wylosowanej, trzymamy się tego samego sąsiedztwa treści —
 *     podpowiedzi są posortowane po trafności (Element → źródło → pozycja),
 *     więc sąsiad jest bliższy tematycznie niż pierwszy z brzegu.
 *
 * ⚠️ Gdy wylosowana JEST `'zrobic'`, zwraca ją samą — wtedy ekran nie ma czego
 * dokładać i nie dokłada. Zero drugiej linii bez powodu.
 *
 * Wejście: WYNIK `selectRotatingHints(selectHintsForPlayer(...))`, czyli pula
 * po bramce wiekowej A9, filtrze odbiorcy i dopasowaniu do Elementu. Ta funkcja
 * NIE FILTRUJE NICZEGO — i to jest celowe, żeby nie dało się jej użyć zamiast
 * tamtych filtrów (ten sam powód, co przy `selectAlwaysVisibleHints`).
 */
export function najblizszaDoZrobienia(
  rotacja: ComponentHintRow[],
  day: number,
): HintPresentation | null {
  if (rotacja.length === 0) return null;
  const start = ((day % rotacja.length) + rotacja.length) % rotacja.length;
  for (let i = 0; i < rotacja.length; i++) {
    const kandydat = rotacja[(start + i) % rotacja.length];
    if (kandydat.rodzaj === 'zrobic') return present(kandydat);
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// TEKSTY NA EKRAN — wszystkie przechodzą test 15-latka (decyzja A10)
// ─────────────────────────────────────────────────────────────
// Trzymane tutaj, a nie w JSX, żeby selftest mógł je sprawdzić literalnie —
// reguła R1 mówi „zadanie nie jest skończone, dopóki człowiek tego nie widzi",
// więc to, co człowiek zobaczy, musi dać się wypisać bez uruchamiania appki.

export const HINT_EYEBROW = 'Z materiałów Gamechange';

/**
 * Nadtytuł dla podpowiedzi BEZ źródła. Dziś taki wiersz jest dokładnie jeden —
 * zdanie kierujące po dawki do rodzica, oznaczone w migracji jako
 * `decyzja A9 (tekst systemowy — nie z materiału)`.
 *
 * DLACZEGO OSOBNY NAPIS: „Z materiałów Gamechange" nad zdaniem, którego w żadnym
 * materiale nie ma, byłoby drobnym, ale prawdziwym kłamstwem — a cała wartość
 * tego bloku stoi na tym, że nadtytuł mówi prawdę o pochodzeniu zdania.
 */
export const HINT_EYEBROW_NO_SOURCE = 'Zasada Gamechange';

/** Nadtytuł zależny od tego, czy podpowiedź ma źródło, które da się pokazać. */
export function hintEyebrow(source: string | null): string {
  return source ? HINT_EYEBROW : HINT_EYEBROW_NO_SOURCE;
}

/** Nagłówek nad podpowiedzią — mówi, czy to rzecz do zrobienia, czy do zrozumienia. */
export function hintKindLabel(rodzaj: HintKind): string {
  return rodzaj === 'zrobic' ? 'Do zrobienia' : 'Warto wiedzieć';
}

/** R5 — jawny, spokojny stan „nie mam skąd wziąć", nigdy pustka udająca brak treści. */
export const HINT_TABLE_MISSING_TEXT =
  'Materiały dla tego obszaru są w przygotowaniu. Wrócimy tu z konkretem z książki, gdy będzie gotowy.';

export const HINT_ERROR_TEXT =
  'Nie udało się teraz wczytać podpowiedzi z materiałów. Spróbuj odświeżyć ekran za chwilę.';

export const HINT_EMPTY_TEXT =
  'Do tego obszaru nie mamy jeszcze podpowiedzi z materiałów. Pracujemy nad tym.';
