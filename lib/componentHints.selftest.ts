// WIEDZA B4 08.08.2026 — weryfikacja reguł podpowiedzi z materiałów
// (lib/componentHints.ts). Czysta logika, bez Supabase i bez React Native,
// uruchamiana poza appką:
//
//   npx tsx lib/componentHints.selftest.ts
//
// (jeśli brak `tsx`: `npm install --no-save tsx`, potem to samo polecenie).
// Albo razem z resztą: `node tests/run-selftests.mjs`.
//
// ⚠️ TRZY RZECZY SPRAWDZANE TU SĄ WAŻNIEJSZE NIŻ RESZTA I NIE DA SIĘ ICH
// SPRAWDZIĆ NA URZĄDZENIU:
//  1. BRAMKA WIEKOWA (decyzja A9) — żeby ją przetestować na żywo, trzeba by
//     mieć konto piętnastolatka z Celem w segmencie z dawkami i tabelę w bazie.
//     Tutaj to trzy asercje, które przechodzą albo nie.
//  2. REGUŁA R5 — rozróżnienie „nie ma tabeli" od „tabela pusta". Na urządzeniu
//     oba wyglądają identycznie do momentu, aż ktoś zajrzy do bazy.
//  3. WYBÓR JEDNEJ PODPOWIEDZI — determinizm w obrębie dnia. Na oko nie do
//     odróżnienia od losowania, dopóki tekst nie podmieni się pod palcem.
//
// Uruchom ponownie po każdej zmianie w lib/componentHints.ts.
import {
  COMPONENT_HINT_COLUMNS,
  COMPONENT_HINT_COLUMNS_WITH_ALWAYS,
  ALWAYS_VISIBLE_COLUMN_MISSING_WARN,
  shouldRetryWithoutAlwaysVisible,
  isAlwaysVisible,
  isMissingTableError,
  minimumPossibleAge,
  passesAgeGate,
  isForPlayer,
  ADULT_MIN_AGE,
  isAdultLowerBound,
  isParentReferralRow,
  audienceAllowsPlayer,
  formatHintSource,
  selectHintsForPlayer,
  pickHintOfDay,
  dayIndex,
  buildHintState,
  hintKindLabel,
  hintEyebrow,
  HINT_EYEBROW,
  HINT_EYEBROW_NO_SOURCE,
  HINT_TABLE_MISSING_TEXT,
  HINT_ERROR_TEXT,
  HINT_EMPTY_TEXT,
  type ComponentHintRow,
} from './componentHints';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

// ─────────────────────────────────────────────────────────────
// Dane testowe — WIERSZE PRZEPISANE CO DO ZNAKU z migracji
// claude/PODPOWIEDZI_Z_MATERIALOW_A.md, sekcja 4.3. Nie wymyślone: dzięki temu
// sekcja 11 raportu („co zawodnik realnie zobaczy") jest wypisem z tego pliku,
// a nie osobną opowieścią.
// ─────────────────────────────────────────────────────────────
const row = (over: Partial<ComponentHintRow>): ComponentHintRow => ({
  klucz: 'x', segment_id: 'moc', component_id: null, obszar_name: null, element_name: null,
  hint: 'tekst', odbiorca: 'zawodnik', min_age: null, rodzaj: 'zrobic',
  zrodlo: 'Moc — System Gamechange (pełny)', strony: '1', dowody: null, pozycja: 1, active: true,
  ...over,
});

/** `moc`, podpowiedź celowana w Element „Trening balistyczny…" (Moc, s. 8). */
const MOC_TARGETED = row({
  klucz: 'moc-trening-balistyczny-olimpijski-o-niskim-obci-01',
  segment_id: 'moc', component_id: 'cmp-balistyczny',
  obszar_name: 'Wykorzystanie siły / RFD',
  element_name: 'Trening balistyczny/olimpijski o niskim obciążeniu',
  hint: 'Każde powtórzenie w bloku plyometrii wykonuj z maksymalną eksplozją, a między seriami odpoczywaj 60–120 sekund. W tym bloku nie ma miejsca na zmęczenie.',
  strony: '8', pozycja: 1,
});

/** `moc`, reguła przekrojowa segmentu (Moc, s. 4). */
const MOC_SEGMENT = row({
  klucz: 'moc-segment-01', segment_id: 'moc', component_id: null,
  hint: 'Między sesjami zostaw minimum 48 godzin przerwy, szczególnie po plyometrii. Mecz powinien być co najmniej 48 godzin po sesji plyometrycznej.',
  strony: '4', dowody: 'materiał podaje jako regułę bezwzględną', pozycja: 1,
});

/** `regeneracja`, DAWKA — `odbiorca='rodzic'` + `min_age=16`. Test bramki A9. */
const REGEN_DAWKA_RODZIC = row({
  klucz: 'regeneracja-segment-08', segment_id: 'regeneracja', component_id: null,
  hint: 'Dawka bazowa dla zawodnika ok. 70 kg: 200–400 mg magnezu elementarnego dziennie, wieczorem przed snem. W okresach dużych obciążeń 300–500 mg.',
  odbiorca: 'rodzic', min_age: 16, zrodlo: 'Regeneracja — System Gamechange (pełny)', strony: '5, 13', pozycja: 8,
});

/**
 * Wiersz, którego dziś w migracji NIE MA, ale który jest całym powodem, dla
 * którego bramka wiekowa siedzi w kodzie: podpowiedź Z DAWKĄ skierowana do
 * ZAWODNIKA. Dziś każdy wiersz z `min_age` ma `odbiorca='rodzic'`, więc filtr
 * odbiorcy sam by wystarczył — ale wystarczy JEDEN taki wiersz dopisany
 * w przyszłości, żeby filtr odbiorcy przestał chronić cokolwiek.
 */
const REGEN_DAWKA_ZAWODNIK_16 = row({
  klucz: 'test-dawka-dla-zawodnika-16plus', segment_id: 'regeneracja', component_id: null,
  hint: 'Magnez: 300–400 mg magnezu elementarnego dziennie w dobrze przyswajalnej formie.',
  odbiorca: 'zawodnik', min_age: 16, zrodlo: 'Regeneracja — System Gamechange (pełny)', strony: '13', pozycja: 20,
});

/** `regeneracja`, bez bramki, dla zawodnika (Regeneracja, s. 4). */
const REGEN_ODDECH = row({
  klucz: 'regeneracja-regeneracja-psychologiczna-01', segment_id: 'regeneracja', component_id: null,
  hint: 'Bezpośrednio po treningu, zanim zrobisz cokolwiek innego, usiądź lub połóż się na 3–5 minut. Wdech nosem 4 sekundy, zatrzymanie 2, wydech ustami 6. Ręka na brzuchu ma się unosić, nie klatka.',
  zrodlo: 'Regeneracja — System Gamechange (pełny)', strony: '4', pozycja: 1,
});

/** Zdanie systemowe z decyzji A9 — jedyny wiersz BEZ źródła. */
const REGEN_DO_RODZICA = row({
  klucz: 'regeneracja-segment-07', segment_id: 'regeneracja', component_id: null,
  hint: 'Magnez to sprawa do ustalenia z rodzicem — to on kupuje i pilnuje dawki. Pełne wytyczne z liczbami są w jego egzemplarzu materiału.',
  rodzaj: 'zrozumiec', zrodlo: 'decyzja A9 (tekst systemowy — nie z materiału)', strony: '—', pozycja: 7,
});

// ═════════════════════════════════════════════════════════════
// 1. REGUŁA R5 — „nie ma tabeli" ≠ „pusto"
// ═════════════════════════════════════════════════════════════
check('R5: kod Postgresa 42P01 = brak tabeli',
  isMissingTableError({ code: '42P01', message: 'relation "component_hints" does not exist' }), 'nie rozpoznane');
check('R5: kod PostgREST PGRST205 = brak tabeli',
  isMissingTableError({ code: 'PGRST205', message: "Could not find the table 'public.component_hints' in the schema cache" }), 'nie rozpoznane');
check('R5: sam komunikat, bez kodu, też wystarcza',
  isMissingTableError({ message: "Could not find the table 'public.component_hints' in the schema cache" }), 'nie rozpoznane');
check('R5: błąd sieci to NIE brak tabeli (ma dać stan „error", nie „w przygotowaniu")',
  !isMissingTableError({ message: 'Network request failed' }), 'fałszywie rozpoznane jako brak tabeli');
check('R5: odmowa RLS to NIE brak tabeli',
  !isMissingTableError({ code: '42501', message: 'permission denied for table component_hints' }), 'fałszywie rozpoznane');
check('R5: null/undefined nie wywraca funkcji',
  !isMissingTableError(null) && !isMissingTableError(undefined), 'wywróciło się');
// TERMINARZ A7 08.08.2026 (M22) — brak KOLUMNY przestał udawać brak TABELI (B34):
check('M22: PGRST204 (brak kolumny) to NIE brak tabeli',
  !isMissingTableError({ code: 'PGRST204', message: "Could not find the 'zawsze_widoczna' column of 'component_hints' in the schema cache" }),
  'komunikat o niewdrożonej migracji przy błędzie, który migracji nie dotyczy');
check('M22: 42703 (undefined_column) to NIE brak tabeli',
  !isMissingTableError({ code: '42703', message: 'column component_hints.nowa_kolumna does not exist' }), 'jw.');
check('M22: sam komunikat o kolumnie (bez kodu) też NIE jest brakiem tabeli',
  !isMissingTableError({ message: 'column component_hints.nowa_kolumna does not exist' }),
  'tekst zawiera nazwę tabeli i "does not exist", ale tabela istnieje');

// ═════════════════════════════════════════════════════════════
// 2. BRAMKA WIEKOWA — decyzja A9. Najważniejsze asercje w tym pliku.
// ═════════════════════════════════════════════════════════════
const NOW = new Date('2026-08-08T12:00:00Z');
check('A9: rocznik 2012 w 2026 → wiek najniższy możliwy 13',
  minimumPossibleAge(2012, NOW) === 13, String(minimumPossibleAge(2012, NOW)));
check('A9: rocznik 2010 w 2026 → 15, NIE 16 (urodziny mogły jeszcze nie być)',
  minimumPossibleAge(2010, NOW) === 15, String(minimumPossibleAge(2010, NOW)));
check('A9: rocznik 2009 w 2026 → 16 (pewne, niezależnie od miesiąca urodzin)',
  minimumPossibleAge(2009, NOW) === 16, String(minimumPossibleAge(2009, NOW)));
check('A9: brak rocznika → null („appka nie zna wieku"), nie 0 i nie 18',
  minimumPossibleAge(null, NOW) === null && minimumPossibleAge(undefined, NOW) === null, 'inna wartość');
check('A9: literówka w roczniku (np. 20) → null, nie wiek 2006 lat',
  minimumPossibleAge(20, NOW) === null, String(minimumPossibleAge(20, NOW)));

check('A9: podpowiedź bez bramki przechodzi przy nieznanym wieku',
  passesAgeGate({ min_age: null }, null), 'zablokowana bez powodu');
check('A9: DAWKA + nieznany wiek = ZABLOKOWANA (błąd w bezpieczną stronę)',
  !passesAgeGate({ min_age: 16 }, null), 'PRZESZŁA — to jest dokładnie ten błąd, którego nie wolno popełnić');
check('A9: DAWKA + 15 lat = ZABLOKOWANA',
  !passesAgeGate({ min_age: 16 }, 15), 'PRZESZŁA');
check('A9: DAWKA + 16 lat = przechodzi',
  passesAgeGate({ min_age: 16 }, 16), 'zablokowana');
check('A9: DAWKA + 17 lat = przechodzi',
  passesAgeGate({ min_age: 16 }, 17), 'zablokowana');

check('Odbiorca: „rodzic" nie trafia do zawodnika',
  !isForPlayer({ odbiorca: 'rodzic' }), 'trafia');
check('Odbiorca: „zawodnik" i „oba" trafiają',
  isForPlayer({ odbiorca: 'zawodnik' }) && isForPlayer({ odbiorca: 'oba' }), 'nie trafiają');

// ─── DOROSŁY R11 — „18+ = własny rodzic" ───
check('R11: dolna granica 18 dowodzi pełnoletności, 17 nie, null nie (fail-closed)',
  isAdultLowerBound(18) && isAdultLowerBound(25) && !isAdultLowerBound(17) && !isAdultLowerBound(null),
  `${isAdultLowerBound(18)}/${isAdultLowerBound(17)}/${isAdultLowerBound(null)}`);
check('R11: ADULT_MIN_AGE = 18 (pełnoletność, nie inna liczba)',
  ADULT_MIN_AGE === 18, String(ADULT_MIN_AGE));
check('R11: rocznik 2008 w 2026 → dolna granica 17 → warstwa rodzica JESZCZE nie wchodzi '
  + '(ten sam konserwatyzm co bramka A9)',
  !isAdultLowerBound(minimumPossibleAge(2008, NOW)), String(minimumPossibleAge(2008, NOW)));
check('R11: rocznik 2007 w 2026 → dolna granica 18 → pełnoletność PEWNA',
  isAdultLowerBound(minimumPossibleAge(2007, NOW)), String(minimumPossibleAge(2007, NOW)));
check('R11: `rodzic` u dorosłego przechodzi filtr odbiorcy, u 17-latka i przy nieznanym wieku NIE',
  audienceAllowsPlayer({ odbiorca: 'rodzic' }, 18)
  && !audienceAllowsPlayer({ odbiorca: 'rodzic' }, 17)
  && !audienceAllowsPlayer({ odbiorca: 'rodzic' }, null), 'routing dorosłego przecieka');
check('R11: `zawodnik` i `oba` przechodzą niezależnie od wieku (nic nie zabrano)',
  audienceAllowsPlayer({ odbiorca: 'zawodnik' }, null) && audienceAllowsPlayer({ odbiorca: 'oba' }, 13),
  'dawny odbiorca przestał przechodzić');
check('R11: tekst systemowy A9 („ustal z rodzicem") jest rozpoznawany po `zrodlo`',
  isParentReferralRow({ zrodlo: 'decyzja A9 (tekst systemowy — nie z materiału)' })
  && !isParentReferralRow({ zrodlo: 'Moc — System Gamechange (pełny)' })
  && !isParentReferralRow({ zrodlo: null }), 'rozpoznanie odesłania nie działa');

// ═════════════════════════════════════════════════════════════
// 3. ŹRÓDŁO — to, co odróżnia podpowiedź od tekstu dowolnego modelu
// ═════════════════════════════════════════════════════════════
check('Źródło: „Moc — System Gamechange (pełny)" + „8" → „Moc, s. 8"',
  formatHintSource('Moc — System Gamechange (pełny)', '8') === 'Moc, s. 8',
  String(formatHintSource('Moc — System Gamechange (pełny)', '8')));
check('Źródło: zakres stron zostaje w oryginale („6–7")',
  formatHintSource('Wytrzymałość — System Gamechange (pełny)', '6–7') === 'Wytrzymałość, s. 6–7',
  String(formatHintSource('Wytrzymałość — System Gamechange (pełny)', '6–7')));
check('Źródło: wprowadzenie („szybkosc-decyzji.pdf (wprowadzenie)") → „szybkosc-decyzji, s. 1"',
  formatHintSource('szybkosc-decyzji.pdf (wprowadzenie)', '1') === 'szybkosc-decyzji, s. 1',
  String(formatHintSource('szybkosc-decyzji.pdf (wprowadzenie)', '1')));
check('Źródło: tekst systemowy z decyzji A9 NIE dostaje zmyślonego źródła',
  formatHintSource('decyzja A9 (tekst systemowy — nie z materiału)', '—') === null,
  String(formatHintSource('decyzja A9 (tekst systemowy — nie z materiału)', '—')));
check('Źródło: puste strony → sam tytuł, bez „s."',
  formatHintSource('Regeneracja — System Gamechange (pełny)', null) === 'Regeneracja',
  String(formatHintSource('Regeneracja — System Gamechange (pełny)', null)));
check('Źródło: brak `zrodlo` → null',
  formatHintSource(null, '8') === null, 'coś zwrócone');

// ═════════════════════════════════════════════════════════════
// 4. WYBÓR — co w ogóle trafia do puli
// ═════════════════════════════════════════════════════════════
{
  const rows = [REGEN_ODDECH, REGEN_DAWKA_RODZIC, REGEN_DAWKA_ZAWODNIK_16, REGEN_DO_RODZICA];
  const forFourteen = selectHintsForPlayer({ rows, age: 13, componentId: null });
  check('Pula 14-latka: ZERO wierszy z dawką',
    forFourteen.every((r) => r.min_age == null), JSON.stringify(forFourteen.map((r) => r.klucz)));
  check('Pula 14-latka: zero wierszy dla rodzica',
    forFourteen.every((r) => r.odbiorca !== 'rodzic'), JSON.stringify(forFourteen.map((r) => r.klucz)));
  check('Pula 14-latka: zostają dwa zdania bez dawek (oddech + odesłanie do rodzica)',
    forFourteen.length === 2, JSON.stringify(forFourteen.map((r) => r.klucz)));

  const forSeventeen = selectHintsForPlayer({ rows, age: 16, componentId: null });
  check('Pula 17-latka: dawka DLA ZAWODNIKA wchodzi',
    forSeventeen.some((r) => r.klucz === 'test-dawka-dla-zawodnika-16plus'), JSON.stringify(forSeventeen.map((r) => r.klucz)));
  check('Pula 17-latka: dawka DLA RODZICA nadal nie wchodzi (to nie jego egzemplarz)',
    !forSeventeen.some((r) => r.odbiorca === 'rodzic'), JSON.stringify(forSeventeen.map((r) => r.klucz)));

  const unknownAge = selectHintsForPlayer({ rows, age: null, componentId: null });
  check('Pula przy NIEZNANYM wieku = ta sama co u 14-latka (bramka zamknięta)',
    JSON.stringify(unknownAge.map((r) => r.klucz)) === JSON.stringify(forFourteen.map((r) => r.klucz)),
    JSON.stringify(unknownAge.map((r) => r.klucz)));

  // ─── DOROSŁY R11 na pełnej puli ───
  const forAdult = selectHintsForPlayer({ rows, age: 18, componentId: null });
  check('R11: pula DOROSŁEGO zawiera dawkę z warstwy rodzica (regeneracja-segment-08)',
    forAdult.some((r) => r.klucz === 'regeneracja-segment-08'), JSON.stringify(forAdult.map((r) => r.klucz)));
  check('R11: pula dorosłego NIE zawiera odesłania „ustal z rodzicem" (regeneracja-segment-07) '
    + '— u dorosłego to zdanie fałszywe i stałoby obok właściwej dawki',
    !forAdult.some((r) => r.klucz === 'regeneracja-segment-07'), JSON.stringify(forAdult.map((r) => r.klucz)));
  check('R11: pula dorosłego = oddech + dawka zawodnika 16+ + dawka z warstwy rodzica (3 wiersze)',
    forAdult.length === 3, JSON.stringify(forAdult.map((r) => r.klucz)));
  check('R11: u 17-latka (dolna granica) NIC się nie zmieniło — rodzic nie wchodzi, odesłanie zostaje',
    JSON.stringify(selectHintsForPlayer({ rows, age: 17, componentId: null }).map((r) => r.klucz))
    === JSON.stringify(selectHintsForPlayer({ rows, age: 16, componentId: null }).map((r) => r.klucz)),
    'pula 17-latka rozjechała się z pulą 16-latka');
}

{
  const OTHER_COMPONENT = row({ klucz: 'moc-inny-element', component_id: 'cmp-inny', strony: '2' });
  const rows = [MOC_SEGMENT, OTHER_COMPONENT, MOC_TARGETED];
  const withBlock = selectHintsForPlayer({ rows, age: 15, componentId: 'cmp-balistyczny' });
  check('Wybór: podpowiedź celowana w Element Bloku stoi PIERWSZA',
    withBlock[0]?.klucz === MOC_TARGETED.klucz, JSON.stringify(withBlock.map((r) => r.klucz)));
  check('Wybór: podpowiedź przypięta do INNEGO Elementu wypada z puli',
    !withBlock.some((r) => r.klucz === 'moc-inny-element'), JSON.stringify(withBlock.map((r) => r.klucz)));

  const withoutBlock = selectHintsForPlayer({ rows, age: 15, componentId: null });
  check('Wybór: bez Bloku zostają wyłącznie reguły segmentowe',
    withoutBlock.length === 1 && withoutBlock[0].klucz === MOC_SEGMENT.klucz,
    JSON.stringify(withoutBlock.map((r) => r.klucz)));
}

{
  // Podpowiedź ZE ŹRÓDŁEM ma pierwszeństwo przed bezźródłową o tej samej
  // specyficzności — źródło jest całym powodem, dla którego to pokazujemy.
  const rows = [REGEN_DO_RODZICA, REGEN_ODDECH]; // pozycja 7 vs 1, obie segmentowe
  const sorted = selectHintsForPlayer({ rows, age: 15, componentId: null });
  check('Wybór: wiersz ze źródłem przed wierszem bez źródła',
    sorted[0].klucz === REGEN_ODDECH.klucz, JSON.stringify(sorted.map((r) => r.klucz)));

  const shuffled = selectHintsForPlayer({ rows: [REGEN_ODDECH, REGEN_DO_RODZICA], age: 15, componentId: null });
  check('Wybór: kolejność wierszy z bazy nie zmienia wyniku (determinizm)',
    JSON.stringify(shuffled.map((r) => r.klucz)) === JSON.stringify(sorted.map((r) => r.klucz)),
    JSON.stringify(shuffled.map((r) => r.klucz)));
}

check('Wybór: wiersz `active=false` nie wchodzi do puli',
  selectHintsForPlayer({ rows: [row({ active: false })], age: 20 }).length === 0, 'wszedł');
check('Wybór: pusty `hint` nie wchodzi do puli',
  selectHintsForPlayer({ rows: [row({ hint: '   ' })], age: 20 }).length === 0, 'wszedł');

// ═════════════════════════════════════════════════════════════
// 5. ROTACJA — jedna podpowiedź dziennie, ta sama przez cały dzień
// ═════════════════════════════════════════════════════════════
{
  const pool = ['a', 'b', 'c'];
  check('Rotacja: ten sam dzień → ten sam wynik (odświeżenie nie podmienia tekstu pod palcem)',
    pickHintOfDay(pool, 100) === pickHintOfDay(pool, 100), 'różne wyniki');
  check('Rotacja: kolejny dzień → inna podpowiedź',
    pickHintOfDay(pool, 100) !== pickHintOfDay(pool, 101), 'ta sama');
  check('Rotacja: po wyczerpaniu puli wraca na początek',
    pickHintOfDay(pool, 100) === pickHintOfDay(pool, 103), 'nie wróciła');
  check('Rotacja: jedna podpowiedź w puli → zawsze ona, bez dzielenia przez zero',
    pickHintOfDay(['jedyna'], 7) === 'jedyna', 'inny wynik');
  check('Rotacja: pusta pula → null',
    pickHintOfDay([], 7) === null, 'coś zwrócone');
  check('Rotacja: ujemny numer dnia (zegar urządzenia sprzed 1970) nie wychodzi poza tablicę',
    pool.includes(pickHintOfDay(pool, -5) as string), String(pickHintOfDay(pool, -5)));
  check('Rotacja: numer dnia rośnie o 1 na dobę',
    dayIndex(new Date('2026-08-09T00:30:00')) - dayIndex(new Date('2026-08-08T23:30:00')) === 1,
    String(dayIndex(new Date('2026-08-09T00:30:00')) - dayIndex(new Date('2026-08-08T23:30:00'))));
}

// ═════════════════════════════════════════════════════════════
// 6. STAN EKRANU — pięć stanów, każdy JAWNY (R1 + R5)
// ═════════════════════════════════════════════════════════════
check('Stan: brak Celu → „no_goal" (ekran nie rysuje bloku podpowiedzi)',
  buildHintState({ hasGoal: false, error: null, rows: [MOC_SEGMENT], age: 20 }).state === 'no_goal', 'inny stan');
check('Stan: brak tabeli → „table_missing", nie „empty"',
  buildHintState({ hasGoal: true, error: { code: '42P01', message: 'relation "component_hints" does not exist' }, rows: null, age: 20 }).state === 'table_missing', 'inny stan');
check('Stan: błąd sieci → „error", nie „empty" i nie „table_missing"',
  buildHintState({ hasGoal: true, error: { message: 'Network request failed' }, rows: null, age: 20 }).state === 'error', 'inny stan');
check('Stan: tabela jest, zero wierszy dla segmentu → „empty"',
  buildHintState({ hasGoal: true, error: null, rows: [], age: 20 }).state === 'empty', 'inny stan');
check('Stan: wiersze są, ale wszystkie za bramką → „empty" (nie „ready" z pustym tekstem)',
  buildHintState({ hasGoal: true, error: null, rows: [REGEN_DAWKA_RODZIC], age: 14 }).state === 'empty', 'inny stan');
check('Stan: rows === null bez błędu → „loading"',
  buildHintState({ hasGoal: true, error: null, rows: null, age: 20 }).state === 'loading', 'inny stan');
{
  const s = buildHintState({ hasGoal: true, error: null, rows: [MOC_TARGETED], componentId: 'cmp-balistyczny', age: 14, day: 0 });
  check('Stan: „ready" niesie ze sobą gotowe źródło do wyświetlenia',
    s.state === 'ready' && s.source === 'Moc, s. 8', JSON.stringify(s));
}

check('Cztery teksty stanów są niepuste i różne od siebie',
  new Set([HINT_TABLE_MISSING_TEXT, HINT_ERROR_TEXT, HINT_EMPTY_TEXT, HINT_EYEBROW]).size === 4
  && [HINT_TABLE_MISSING_TEXT, HINT_ERROR_TEXT, HINT_EMPTY_TEXT, HINT_EYEBROW].every((t) => t.trim().length > 0),
  'teksty się powtarzają albo są puste');
check('Nadtytuł mówi „Z materiałów Gamechange" TYLKO gdy jest źródło',
  hintEyebrow('Moc, s. 8') === HINT_EYEBROW && hintEyebrow(null) === HINT_EYEBROW_NO_SOURCE,
  hintEyebrow('Moc, s. 8') + ' / ' + hintEyebrow(null));
check('Zdanie systemowe A9 nie dostaje nadtytułu „Z materiałów" (nie ma go w żadnym materiale)',
  hintEyebrow(formatHintSource(REGEN_DO_RODZICA.zrodlo, REGEN_DO_RODZICA.strony)) === HINT_EYEBROW_NO_SOURCE,
  hintEyebrow(formatHintSource(REGEN_DO_RODZICA.zrodlo, REGEN_DO_RODZICA.strony)));
check('Etykieta rodzaju: „zrobic" → „Do zrobienia", „zrozumiec" → „Warto wiedzieć"',
  hintKindLabel('zrobic') === 'Do zrobienia' && hintKindLabel('zrozumiec') === 'Warto wiedzieć',
  hintKindLabel('zrobic') + ' / ' + hintKindLabel('zrozumiec'));

// ═════════════════════════════════════════════════════════════
// 7. PRAKTYKA-EKRAN B6 08.08.2026 — `zawsze_widoczna`
// To jest FUNKCJA BEZPIECZEŃSTWA, nie funkcja UI: bez niej treść z telefonem
// zaufania, po wejściu do bazy, pokazywałaby się raz na kilkanaście dni
// w losowy dzień. Trzy rzeczy sprawdzane tu są ważniejsze od reszty:
//  (a) że `zawsze_widoczna` NIE JEST obejściem bramki wiekowej ani odbiorcy,
//  (b) że wiersz zawsze widoczny WYPADA z rotacji (nie zajmuje jej miejsca),
//  (c) że przy BRAKU kolumny w bazie zachowanie jest bajt w bajt dzisiejsze.
// ═════════════════════════════════════════════════════════════
{
  /** Treść bezpieczeństwa — kształt, w jakim ma wejść do bazy: bez `min_age`, do zawodnika. */
  const SAFETY = row({
    klucz: 'bezpieczenstwo-telefon-zaufania-01', segment_id: 'regeneracja', component_id: null,
    hint: 'Jeśli jest Ci źle i nie masz z kim pogadać, zadzwoń pod 116 111. To bezpłatny telefon zaufania dla młodych, czynny całą dobę.',
    rodzaj: 'zrozumiec', odbiorca: 'zawodnik', min_age: null,
    zrodlo: null, strony: null, pozycja: 99, zawsze_widoczna: true,
  });
  /** Ten sam wiersz, ale z bramką wiekową — czyli próba obejścia A9 przez `zawsze_widoczna`. */
  const ALWAYS_WITH_AGE_GATE = row({
    klucz: 'test-zawsze-widoczna-z-dawka-16plus', segment_id: 'regeneracja', component_id: null,
    hint: 'Magnez: 300–400 mg magnezu elementarnego dziennie.',
    odbiorca: 'zawodnik', min_age: 16, pozycja: 98, zawsze_widoczna: true,
  });
  const ALWAYS_FOR_PARENT = row({
    klucz: 'test-zawsze-widoczna-dla-rodzica', segment_id: 'regeneracja',
    odbiorca: 'rodzic', pozycja: 97, zawsze_widoczna: true,
  });
  const ALWAYS_INACTIVE = row({
    klucz: 'test-zawsze-widoczna-wylaczona', segment_id: 'regeneracja',
    active: false, pozycja: 96, zawsze_widoczna: true,
  });

  // (a) NAJWAŻNIEJSZE: te same filtry, co dla każdego innego wiersza.
  check('B6/A9: `zawsze_widoczna` NIE OMIJA bramki wiekowej — dawka 16+ nie trafia do 14-latka',
    buildHintState({ hasGoal: true, error: null, rows: [ALWAYS_WITH_AGE_GATE, REGEN_ODDECH], age: 14, day: 0 })
      .alwaysVisible.length === 0,
    JSON.stringify(buildHintState({ hasGoal: true, error: null, rows: [ALWAYS_WITH_AGE_GATE], age: 14, day: 0 }).alwaysVisible));
  check('B6/A9: `zawsze_widoczna` NIE OMIJA bramki także przy NIEZNANYM wieku',
    buildHintState({ hasGoal: true, error: null, rows: [ALWAYS_WITH_AGE_GATE], age: null, day: 0 })
      .alwaysVisible.length === 0, 'przeszła');
  check('B6/A9: ta sama dawka U 16-LATKA przechodzi — bramka działa w obie strony, nie blokuje wszystkiego',
    buildHintState({ hasGoal: true, error: null, rows: [ALWAYS_WITH_AGE_GATE], age: 16, day: 0 })
      .alwaysVisible.length === 1, 'zablokowana');
  check('B6: `zawsze_widoczna` NIE OMIJA filtru odbiorcy — treść dla rodzica nie trafia do NIELETNIEGO '
    + '(R11: u dorosłego wejście warstwy rodzica jest CELOWE, więc własność sprawdzamy na 15-latku)',
    buildHintState({ hasGoal: true, error: null, rows: [ALWAYS_FOR_PARENT], age: 15, day: 0 })
      .alwaysVisible.length === 0, 'przeszła');
  check('B6/R11: ta sama treść dla rodzica U DOROSŁEGO wchodzi — przez zwykły filtr, nie przez obejście',
    buildHintState({ hasGoal: true, error: null, rows: [ALWAYS_FOR_PARENT], age: 20, day: 0 })
      .alwaysVisible.length === 1, 'nie weszła');
  check('B6: `zawsze_widoczna` NIE OMIJA `active=false`',
    buildHintState({ hasGoal: true, error: null, rows: [ALWAYS_INACTIVE], age: 20, day: 0 })
      .alwaysVisible.length === 0, 'przeszła');

  // (b) Wypada z rotacji i stoi obok niej.
  {
    const rows = [SAFETY, REGEN_ODDECH, REGEN_DO_RODZICA];
    let wRotacji = 0;
    let brakBezpieczenstwa = 0;
    for (let day = 0; day < 40; day++) {
      const s = buildHintState({ hasGoal: true, error: null, rows, age: 15, day });
      if (s.state === 'ready' && s.hint.klucz === SAFETY.klucz) wRotacji++;
      if (!s.alwaysVisible.some((p) => p.hint.klucz === SAFETY.klucz)) brakBezpieczenstwa++;
    }
    check('B6: treść bezpieczeństwa NIE WYPADA w rotacji ANI RAZU przez 40 dni',
      wRotacji === 0, `wypadła ${wRotacji} razy`);
    check('B6: treść bezpieczeństwa jest widoczna KAŻDEGO z 40 dni',
      brakBezpieczenstwa === 0, `zniknęła w ${brakBezpieczenstwa} dniach`);
    const s0 = buildHintState({ hasGoal: true, error: null, rows, age: 15, day: 0 });
    check('B6: „obie naraz" jest możliwe — rotacyjna i zawsze widoczna stoją obok siebie',
      s0.state === 'ready' && s0.alwaysVisible.length === 1, JSON.stringify(s0.state));
    check('B6: rotacja nie straciła treści — bez wiersza zawsze widocznego wybór jest ten sam',
      (buildHintState({ hasGoal: true, error: null, rows, age: 15, day: 0 }) as any).hint.klucz
      === (buildHintState({ hasGoal: true, error: null, rows: [REGEN_ODDECH, REGEN_DO_RODZICA], age: 15, day: 0 }) as any).hint.klucz,
      'rotacja się rozjechała');
  }
  check('B6: sama treść zawsze widoczna → stan „always_only", NIE „empty" '
    + '(inaczej ekran powiedziałby „nie mamy podpowiedzi", mając ją w ręku)',
    buildHintState({ hasGoal: true, error: null, rows: [SAFETY], age: 15, day: 0 }).state === 'always_only',
    buildHintState({ hasGoal: true, error: null, rows: [SAFETY], age: 15, day: 0 }).state);
  check('B6: pusta tabela nadal daje „empty", a nie „always_only"',
    buildHintState({ hasGoal: true, error: null, rows: [], age: 15, day: 0 }).state === 'empty', 'inny stan');

  // (c) ŚCIEŻKA ODZYSKU — zachowanie bez kolumny musi być BAJT W BAJT dzisiejsze.
  const bezKolumny = [REGEN_ODDECH, REGEN_DO_RODZICA]; // wiersze BEZ pola `zawsze_widoczna`
  check('B6/ODZYSK: wiersz bez pola `zawsze_widoczna` nie jest zawsze widoczny',
    !isAlwaysVisible(REGEN_ODDECH), 'jest');
  check('B6/ODZYSK: `zawsze_widoczna: false` i `null` zachowują się jak brak pola',
    !isAlwaysVisible(row({ zawsze_widoczna: false })) && !isAlwaysVisible(row({ zawsze_widoczna: null })), 'różnią się');
  {
    let rozjazd = 0;
    for (let day = 0; day < 40; day++) {
      const s = buildHintState({ hasGoal: true, error: null, rows: bezKolumny, age: 15, day });
      const staraPula = pickHintOfDay(selectHintsForPlayer({ rows: bezKolumny, age: 15 }), day);
      if (s.state !== 'ready' || s.hint.klucz !== staraPula?.klucz) rozjazd++;
      if (s.alwaysVisible.length !== 0) rozjazd++;
    }
    check('B6/ODZYSK: przy braku kolumny wybór rotacji jest identyczny jak przed tą rundą '
      + '(40 dni, zero różnic) i nic nie jest „zawsze widoczne"', rozjazd === 0, `${rozjazd} różnic`);
  }

  check('B6/ODZYSK: stara lista kolumn NIE wymienia `zawsze_widoczna` '
    + '(inaczej brak migracji zabrałby zawodnikowi WSZYSTKIE podpowiedzi)',
    !COMPONENT_HINT_COLUMNS.includes('zawsze_widoczna'), COMPONENT_HINT_COLUMNS);
  check('B6/ODZYSK: rozszerzona lista to stara + jedna kolumna',
    COMPONENT_HINT_COLUMNS_WITH_ALWAYS === `${COMPONENT_HINT_COLUMNS},zawsze_widoczna`,
    COMPONENT_HINT_COLUMNS_WITH_ALWAYS);
  check('B6/ODZYSK: `42703` → powtórz zapytanie starą listą kolumn',
    shouldRetryWithoutAlwaysVisible({ code: '42703', message: 'column component_hints.zawsze_widoczna does not exist' }), 'nie');
  check('B6/ODZYSK: `PGRST204` z nazwą kolumny → powtórz',
    shouldRetryWithoutAlwaysVisible({ code: 'PGRST204', message: "Could not find the 'zawsze_widoczna' column in the schema cache" }), 'nie');
  check('B6/ODZYSK (zmienione w A7/M22): `PGRST204` BEZ nazwy kolumny → POWTÓRZ — po naprawie B34 '
    + 'ten kod nie wpada już w isMissingTableError, więc powtórka niczego nie zjada, a jedyną '
    + 'kolumną spoza migracji w tym zapytaniu jest zawsze_widoczna',
    shouldRetryWithoutAlwaysVisible({ code: 'PGRST204', message: 'schema cache' }), 'nie powtórzyło');
  check('B6/ODZYSK: BRAK TABELI to NIE powód do powtórki — to osobny, jawny stan ekranu (R5)',
    !shouldRetryWithoutAlwaysVisible({ code: 'PGRST205', message: "Could not find the table 'public.component_hints' in the schema cache" }),
    'zamieniłoby brak migracji na ciszę');
  check('B6/ODZYSK: błąd sieci to NIE powód do powtórki',
    !shouldRetryWithoutAlwaysVisible({ message: 'Network request failed' }), 'powtórzyłoby');
  check('B6/ODZYSK: log mówi, CZEGO ZAWODNIK NIE ZOBACZY, i zakazuje wpuszczania treści '
    + 'bezpieczeństwa przed migracją',
    ALWAYS_VISIBLE_COLUMN_MISSING_WARN.includes('telefon zaufania')
    && ALWAYS_VISIBLE_COLUMN_MISSING_WARN.includes('NIE WPUSZCZAJ'), ALWAYS_VISIBLE_COLUMN_MISSING_WARN);
}

// ═════════════════════════════════════════════════════════════
// 8. TRZY PRZYPADKI Z SEKCJI 11 RAPORTU — wypis tego, co zawodnik zobaczy
// Nie jest to asercja dla samej asercji: reguła R1 mówi „zadanie nie jest
// skończone, dopóki człowiek tego nie widzi", więc to, co człowiek zobaczy,
// musi dać się wypisać bez uruchamiania appki. To jest ten wypis.
// ═════════════════════════════════════════════════════════════
const CASE_ROWS = [REGEN_ODDECH, REGEN_DO_RODZICA, REGEN_DAWKA_RODZIC, REGEN_DAWKA_ZAWODNIK_16];

console.log('\n─── CO ZAWODNIK REALNIE ZOBACZY (segment Celu: Regeneracja) ───');
for (const c of [
  { label: '14 lat (rocznik 2011), Cel: Regeneracja', age: minimumPossibleAge(2011, NOW), rows: CASE_ROWS, hasGoal: true },
  { label: '17 lat (rocznik 2008), Cel: Regeneracja', age: minimumPossibleAge(2008, NOW), rows: CASE_ROWS, hasGoal: true },
  { label: '18 lat (rocznik 2007) — DOROSŁY, Cel: Regeneracja (R11)', age: minimumPossibleAge(2007, NOW), rows: CASE_ROWS, hasGoal: true },
  { label: 'wiek nieznany (pusty rocznik), Cel: Regeneracja', age: null, rows: CASE_ROWS, hasGoal: true },
  { label: 'bez Celu', age: 20, rows: CASE_ROWS, hasGoal: false },
]) {
  const s = buildHintState({ hasGoal: c.hasGoal, error: null, rows: c.rows, age: c.age, day: 0 });
  console.log(`\n  • ${c.label}  (wiek najniższy możliwy: ${c.age ?? 'nieznany'})`);
  if (s.state === 'ready') {
    console.log(`      ${hintEyebrow(s.source)}${s.source ? '  ·  ' + s.source : ''}`);
    console.log(`      ${hintKindLabel(s.hint.rodzaj)}`);
    console.log(`      ${s.hint.hint}`);
  } else if (s.state === 'no_goal') {
    console.log('      (bloku podpowiedzi nie ma na ekranie)');
  } else {
    console.log(`      stan: ${s.state}`);
  }
  const pula = selectHintsForPlayer({ rows: c.rows, age: c.age });
  console.log(`      pula: ${pula.length} podpowiedzi — ${pula.map((r) => r.klucz).join(', ') || 'brak'}`);
}

// Twarda asercja pod ten wypis: 14-latek NIGDY nie widzi żadnej z dwóch dawek.
{
  const forFourteen = selectHintsForPlayer({ rows: CASE_ROWS, age: minimumPossibleAge(2011, NOW) });
  const dawki = ['regeneracja-segment-08', 'test-dawka-dla-zawodnika-16plus'];
  check('\nA9 KONTROLA KOŃCOWA: 14-latek nie widzi ŻADNEJ dawki',
    forFourteen.every((r) => !dawki.includes(r.klucz)), JSON.stringify(forFourteen.map((r) => r.klucz)));
}
// I lustrzana kontrola R11: dorosły widzi obie dawki, a odesłanie do rodzica znika.
{
  const forAdult = selectHintsForPlayer({ rows: CASE_ROWS, age: minimumPossibleAge(2007, NOW) });
  const klucze = forAdult.map((r) => r.klucz);
  check('R11 KONTROLA KOŃCOWA: dorosły widzi OBIE dawki i NIE widzi „ustal z rodzicem"',
    klucze.includes('regeneracja-segment-08') && klucze.includes('test-dawka-dla-zawodnika-16plus')
    && !klucze.includes('regeneracja-segment-07'), JSON.stringify(klucze));
}

// ═════════════════════════════════════════════════════════════
// TEST KONTRAKTOWY A9 — FIXTURE KANONICZNY v2 (TERMINARZ A7 08.08.2026, M20)
// ═════════════════════════════════════════════════════════════
// Ten sam fixture co `gamechange-app/tests/fixtures/bramka-a9-fixture.json`
// (wersja 2, pola `hint`/`strony` = prawdziwe kolumny). Strona JS:
// `tests/test-bramka-a9-kontrakt.js` (50 scenariuszy). Jeśli któraś strona
// przestanie się zgadzać, jeden z dwóch testów spadnie na czerwono — to jest
// cała wartość tego bloku. KONTRAKTEM JEST BRAMKA (zbiór przepuszczonych
// + liczba ukrytych z powodu wieku), NIE kolejność: ekran sortuje inaczej niż
// prompt, celowo. Wiersze przepisane 1:1 z polecenia, bez skracania kluczy —
// skrót nie rzuca błędem, tylko cicho psuje dopasowanie.
{
  const FX_NOW = new Date('2026-08-08T12:00:00Z');
  const fx = (w: Omit<ComponentHintRow, 'segment_id' | 'dowody'>): ComponentHintRow =>
    ({ ...w, segment_id: 'fx', dowody: null });
  const FX_ROWS: ComponentHintRow[] = [
    fx({ klucz: 'fx-01-zawodnik-bez-wieku', odbiorca: 'zawodnik', min_age: null, active: true, component_id: null, obszar_name: null, element_name: null, pozycja: 1, rodzaj: 'zrobic', hint: 'A', zrodlo: 'M', strony: '1' }),
    fx({ klucz: 'fx-02-zawodnik-16plus', odbiorca: 'zawodnik', min_age: 16, active: true, component_id: null, obszar_name: null, element_name: null, pozycja: 2, rodzaj: 'zrobic', hint: 'B', zrodlo: 'M', strony: '2' }),
    fx({ klucz: 'fx-03-oba-16plus', odbiorca: 'oba', min_age: 16, active: true, component_id: null, obszar_name: null, element_name: null, pozycja: 3, rodzaj: 'zrozumiec', hint: 'C', zrodlo: 'M', strony: '3' }),
    fx({ klucz: 'fx-04-rodzic-16plus', odbiorca: 'rodzic', min_age: 16, active: true, component_id: null, obszar_name: null, element_name: null, pozycja: 4, rodzaj: 'zrobic', hint: 'D', zrodlo: 'M', strony: '4' }),
    fx({ klucz: 'fx-05-rodzic-bez-wieku', odbiorca: 'rodzic', min_age: null, active: true, component_id: null, obszar_name: null, element_name: null, pozycja: 5, rodzaj: 'zrobic', hint: 'E', zrodlo: 'M', strony: '5' }),
    fx({ klucz: 'fx-06-element-celu', odbiorca: 'zawodnik', min_age: null, active: true, component_id: 'comp-cel', obszar_name: 'Obszar X', element_name: 'Element Y', pozycja: 9, rodzaj: 'zrobic', hint: 'F', zrodlo: 'M', strony: '6' }),
    fx({ klucz: 'fx-07-obszar', odbiorca: 'oba', min_age: null, active: true, component_id: 'comp-obszar', obszar_name: 'Obszar X', element_name: null, pozycja: 8, rodzaj: 'zrobic', hint: 'G', zrodlo: 'M', strony: '7' }),
    fx({ klucz: 'fx-08-inny-element', odbiorca: 'zawodnik', min_age: null, active: true, component_id: 'comp-inny', obszar_name: 'Obszar X', element_name: 'Element Z', pozycja: 1, rodzaj: 'zrobic', hint: 'H', zrodlo: 'M', strony: '8' }),
    fx({ klucz: 'fx-09-niedopasowany', odbiorca: 'zawodnik', min_age: null, active: true, component_id: null, obszar_name: 'Obszar X', element_name: null, pozycja: 2, rodzaj: 'zrobic', hint: 'I', zrodlo: 'M', strony: '9' }),
    fx({ klucz: 'fx-10-nieaktywny', odbiorca: 'zawodnik', min_age: null, active: false, component_id: null, obszar_name: null, element_name: null, pozycja: 3, rodzaj: 'zrobic', hint: 'J', zrodlo: 'M', strony: '10' }),
    fx({ klucz: 'fx-11-zawodnik-16plus-el', odbiorca: 'zawodnik', min_age: 16, active: true, component_id: 'comp-cel', obszar_name: 'Obszar X', element_name: 'Element Y', pozycja: 3, rodzaj: 'zrobic', hint: 'K', zrodlo: 'M', strony: '11' }),
  ];
  const GATE_14 = ['fx-01-zawodnik-bez-wieku', 'fx-06-element-celu', 'fx-07-obszar', 'fx-08-inny-element', 'fx-09-niedopasowany'];
  const GATE_16 = [...GATE_14, 'fx-02-zawodnik-16plus', 'fx-03-oba-16plus', 'fx-11-zawodnik-16plus-el'];
  // DOROSŁY R11 (fixture v3): pełnoletni dostaje dodatkowo warstwę rodzica.
  const GATE_18 = [...GATE_16, 'fx-04-rodzic-16plus', 'fx-05-rodzic-bez-wieku'];
  const FX_CASES: { przypadek: string; birthYear: number | null; ageLowerBound: number | null; przechodza: string[]; ukryte: number }[] = [
    { przypadek: 'rocznik 2011 (wiek 14)', birthYear: 2011, ageLowerBound: 14, przechodza: GATE_14, ukryte: 3 },
    { przypadek: 'rocznik 2009 (wiek 16)', birthYear: 2009, ageLowerBound: 16, przechodza: GATE_16, ukryte: 0 },
    { przypadek: 'rocznik 2007 (wiek 18 — dorosły)', birthYear: 2007, ageLowerBound: 18, przechodza: GATE_18, ukryte: 0 },
    { przypadek: 'rocznik nieznany (null)', birthYear: null, ageLowerBound: null, przechodza: GATE_14, ukryte: 3 },
  ];
  // Ta sama droga co `selectHintsForPlayer`: odbiorca Z WIEKIEM (R11) + odesłania
  // A9 wyjęte u dorosłego + bramka A9. Wiersze fixture'u mają `zrodlo: 'M'`,
  // więc filtr odesłań niczego tu nie zmienia — pilnuje go osobna asercja wyżej.
  const brama = (age: number | null) =>
    FX_ROWS.filter((r) => r.active !== false && audienceAllowsPlayer(r, age)
      && !(isAdultLowerBound(age) && isParentReferralRow(r)) && passesAgeGate(r, age));
  for (const c of FX_CASES) {
    const age = minimumPossibleAge(c.birthYear, FX_NOW);
    check(`A9-KONTRAKT ageLowerBound (${c.przypadek})`, age === c.ageLowerBound, String(age));
    const pass = brama(age).map((r) => r.klucz).sort();
    check(`A9-KONTRAKT zbiór przepuszczonych (${c.przypadek})`,
      JSON.stringify(pass) === JSON.stringify([...c.przechodza].sort()), JSON.stringify(pass));
    const ukryte = FX_ROWS.filter((r) => r.active !== false && audienceAllowsPlayer(r, age)
      && r.min_age != null && !passesAgeGate(r, age)).length;
    check(`A9-KONTRAKT ukryte z powodu wieku = ${c.ukryte} (${c.przypadek})`, ukryte === c.ukryte, String(ukryte));
  }
  check('A9-KONTRAKT: nieznany rocznik ⇒ wiersz z min_age NIE przechodzi, a stan jest ODRÓŻNIALNY (age === null)',
    minimumPossibleAge(null, FX_NOW) === null && !passesAgeGate({ min_age: 16 }, null)
    && minimumPossibleAge(2011, FX_NOW) !== null,
    'nieznany wiek otworzył bramkę albo zlał się z 14-latkiem');
  check('A9-KONTRAKT: granica KONSERWATYWNA — rocznik 2010 (dolna granica 15) zachowuje się jak 14-latek, '
    + 'bo `rok − rocznik − 1`, nie `rok − rocznik`',
    minimumPossibleAge(2010, FX_NOW) === 15 && !passesAgeGate({ min_age: 16 }, minimumPossibleAge(2010, FX_NOW)),
    String(minimumPossibleAge(2010, FX_NOW)));
  {
    const dif = brama(16).map((r) => r.klucz).filter((k) => !brama(14).map((r) => r.klucz).includes(k)).sort();
    check('A9-KONTRAKT: 16-latek dostaje DOKŁADNIE trzy wiersze więcej i są to te z min_age = 16 '
      + '(różnica zbiorów, nie porównanie długości)',
      JSON.stringify(dif) === JSON.stringify(['fx-02-zawodnik-16plus', 'fx-03-oba-16plus', 'fx-11-zawodnik-16plus-el']),
      JSON.stringify(dif));
  }
  {
    // DOROSŁY R11 (fixture v3): różnica 18-latek vs 16-latek to DOKŁADNIE warstwa rodzica.
    const dif = brama(18).map((r) => r.klucz).filter((k) => !brama(16).map((r) => r.klucz).includes(k)).sort();
    check('R11-KONTRAKT: dorosły dostaje DOKŁADNIE dwa wiersze więcej niż 16-latek i są to te '
      + 'z odbiorca=rodzic (różnica zbiorów)',
      JSON.stringify(dif) === JSON.stringify(['fx-04-rodzic-16plus', 'fx-05-rodzic-bez-wieku']),
      JSON.stringify(dif));
    check('R11-KONTRAKT: 17-latek (rocznik 2008) NIE dostaje warstwy rodzica — pełnoletność musi być pewna',
      JSON.stringify(brama(minimumPossibleAge(2008, FX_NOW)).map((r) => r.klucz).sort())
      === JSON.stringify([...GATE_16].sort()),
      JSON.stringify(brama(minimumPossibleAge(2008, FX_NOW)).map((r) => r.klucz)));
  }
  // Pomiar OSOBNYM logiem, wypisywany zawsze (zasada 14 / wzorzec B32):
  console.log(`[pomiar] A9-KONTRAKT v3 (R11): bramka przepuszcza ${brama(14).length}/11 (wiek 14 i nieznany), `
    + `${brama(16).length}/11 (wiek 16), ${brama(18).length}/11 (wiek 18 — dorosły); `
    + 'ukryte z powodu wieku 3/3/0/0; zgodne ze stroną JS (test-bramka-a9-kontrakt.js).');
}

console.log(`\n${passed} passed, ${failed} failed`);
// Celowo `throw`, a nie `process.exit(1)`: `process` wymaga `@types/node`,
// których tsconfig appki nie zaciąga — a te pliki są objęte `npx tsc --noEmit`
// (include: `**/*.ts`). Rzucony wyjątek daje ten sam niezerowy kod wyjścia,
// więc `tests/run-selftests.mjs` rozpoznaje porażkę tak samo.
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
