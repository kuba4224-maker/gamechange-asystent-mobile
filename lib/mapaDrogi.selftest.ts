// PLAN-D-E 08.2026 (11.08.2026) — NOWY PLIK.
//
//   npx tsx lib/mapaDrogi.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// PO CO TO ISTNIEJE. Mapa jest jedynym narzędziem działającym w koncie
// OGRANICZONYM — i dokładnie dlatego jest jedynym miejscem, w którym pomyłka
// w bramce kosztuje więcej niż brzydki ekran: odcinek wiekowy wylicza się
// z ROCZNIKA, a rocznik jest daną osobową nieletniego.
//
// Drugie: Mapa czyta z tabel, których na 11.08.2026 NIE MA w bazie. Ekran,
// który przy braku tabeli pokazuje pustkę, wygląda identycznie jak ekran
// zawodnika bez treści — i nikt nigdy do tego nie wróci. To jest wzorzec
// „cichy brak" i ma tu trzy osobne asercje.
//
// ⚠️ CZEGO TEN PLIK NIE SPRAWDZA: czy `rpc('account_state')` w ogóle zwraca
// te cztery wartości (wymaga żywej bazy), ani czy treść w bazie jest zgodna
// z dokumentem — to sprawdza zapytanie kontrolne z raportu E, sekcja 7.
import {
  dostepMapy,
  wybierzOdcinek,
  wybierzWariant,
  zbudujOdcinek,
  zbudujStanMapy,
  zakresWieku,
  BRAK_TABEL_TEXT,
  BLAD_ODCZYTU_TEXT,
  WADLIWY_BEZ_JUTRA,
  WADLIWY_WIELE_JUTER,
  SEKCJA_TLO_PODPIS,
  type RoadSegment,
  type RoadFactor,
  type AccountState,
} from './mapaDrogi';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

const TERAZ = new Date(Date.UTC(2026, 7, 11)); // 11.08.2026

const ODCINKI: RoadSegment[] = [
  { id: 's1', slug: 'wejscie', label: 'Wejście', age_from: 12, age_to: 13, sort_order: 1 },
  { id: 's2', slug: 'selekcja', label: 'Selekcja', age_from: 14, age_to: 15, sort_order: 2 },
  { id: 's3', slug: 'okno', label: 'Okno', age_from: 16, age_to: 17, sort_order: 3 },
  { id: 's4', slug: 'prog', label: 'Próg', age_from: 18, age_to: 19, sort_order: 4 },
];

function f(over: Partial<RoadFactor> & { id: string; segment_id: string }): RoadFactor {
  return {
    slug: over.id, title: 't', body: 'b', evidence_level: 'srednia',
    evidence_number: null, source_ref: null, is_controllable: true,
    is_tomorrow: false, variant: 'base', sort_order: 0, ...over,
  };
}

const CZYNNIKI: RoadFactor[] = [
  f({ id: 'a', segment_id: 's3', is_tomorrow: true, sort_order: 0, title: 'Rozgrzewka prewencyjna' }),
  f({ id: 'b', segment_id: 's3', is_controllable: true, sort_order: 1 }),
  f({ id: 'c', segment_id: 's3', is_controllable: true, sort_order: 2 }),
  f({ id: 'd', segment_id: 's3', is_controllable: false, sort_order: 3, title: 'Skauci widzą Cię w kilku meczach' }),
  f({ id: 'e', segment_id: 's3', is_controllable: false, sort_order: 4 }),
  // inny odcinek — nie ma prawa wyciec do widoku s3
  f({ id: 'x', segment_id: 's2', is_tomorrow: true }),
  // inny wariant — też nie ma prawa wyciec
  f({ id: 'y', segment_id: 's3', variant: 'after_deselection', is_tomorrow: true }),
  f({ id: 'z', segment_id: 's3', variant: 'after_deselection', is_controllable: false }),
];

// ═══════════════════════════════════════════════════════════════════
// 1. BRAMKA KONTA — rocznik jest daną osobową
// ═══════════════════════════════════════════════════════════════════
check('konto pełne: odcinek widoczny', dostepMapy('full').odcinek, JSON.stringify(dostepMapy('full')));
for (const s of ['limited', 'unknown_age', 'suspended'] as AccountState[]) {
  const d = dostepMapy(s);
  check(`konto ${s}: BEZ odcinka`, !d.odcinek, JSON.stringify(d));
  check(`konto ${s}: zero dziennika`, !d.dziennik, JSON.stringify(d));
  check(`konto ${s}: zero diagnozy`, !d.diagnoza, JSON.stringify(d));
  check(`konto ${s}: powód jest ZDANIEM dla zawodnika, nie kodem`, d.powod.length > 30, d.powod);
}
check('NIEZNANY stan konta jest traktowany jak ograniczony, nie jak pełny',
  !dostepMapy(null).odcinek, JSON.stringify(dostepMapy(null)));

// PLAN-D-E 12.08.2026 — „nie odczytałem stanu" i „odczytałem piąty stan,
// którego nie znam" to DWIE RÓŻNE RZECZY. Pierwsza wersja dawała na nie jeden
// ekran, czyli własny cichy brak w kodzie, który ma go tępić.
{
  const nieznany = dostepMapy('jakis_nowy_stan');
  const brak = dostepMapy(null);
  check('piąty, nieznany stan konta też NIE pokazuje odcinka (fail closed)',
    !nieznany.odcinek, JSON.stringify(nieznany));
  check('…ale ma INNE zdanie niż „nie udało się sprawdzić"',
    nieznany.powod !== brak.powod, `${nieznany.powod}\n${brak.powod}`);
  check('…i niesie surową wartość do logu, nie na ekran',
    nieznany.nieznanaWartosc === 'jakis_nowy_stan' && !nieznany.powod.includes('jakis_nowy_stan'),
    JSON.stringify(nieznany));
  check('brak odczytu NIE niesie żadnej wartości',
    brak.nieznanaWartosc === undefined, JSON.stringify(brak));
  check('pusty string traktowany jak brak odczytu, nie jak nieznany stan',
    dostepMapy('').nieznanaWartosc === undefined, JSON.stringify(dostepMapy('')));
  check('cztery znane stany NIE ustawiają nieznanaWartosc',
    (['full', 'limited', 'suspended', 'unknown_age'] as AccountState[])
      .every((st) => dostepMapy(st).nieznanaWartosc === undefined), 'znane stany');
}
check('…i mówi wprost, że nie udało się sprawdzić',
  dostepMapy(null).powod.includes('nie udało się sprawdzić') || dostepMapy(null).powod.includes('Nie udało się sprawdzić'),
  dostepMapy(null).powod);
check('konto pełne nie dostaje pustego ekranu z powodem', dostepMapy('full').powod === '', dostepMapy('full').powod);

// ═══════════════════════════════════════════════════════════════════
// 2. WYBÓR ODCINKA — po WIEKU NAJNIŻSZYM MOŻLIWYM
// ═══════════════════════════════════════════════════════════════════
// Rocznik 2010 w 2026 → minimalny wiek 15 → odcinek „Selekcja" (14–15),
// nie „Okno". Zawodnik ze stycznia dostanie młodszy odcinek — treść młodszych
// odcinków mówi „mniej i szerzej", więc błąd idzie w bezpieczną stronę.
{
  const w = wybierzOdcinek(2010, ODCINKI, TERAZ);
  check('rocznik 2010 w 2026 → odcinek Selekcja (wiek najniższy możliwy = 15)',
    w.stan === 'wybrany' && w.odcinek.slug === 'selekcja', JSON.stringify(w));
}
{
  const w = wybierzOdcinek(2009, ODCINKI, TERAZ);
  check('rocznik 2009 → Okno (16–17)', w.stan === 'wybrany' && w.odcinek.slug === 'okno', JSON.stringify(w));
}
{
  const w = wybierzOdcinek(2007, ODCINKI, TERAZ);
  check('rocznik 2007 → Próg (18–19)', w.stan === 'wybrany' && w.odcinek.slug === 'prog', JSON.stringify(w));
}
{
  const w = wybierzOdcinek(2016, ODCINKI, TERAZ); // wiek 9
  check('za młody → odcinek PRZYBLIŻONY, nie po cichu pierwszy',
    w.stan === 'przyblizony' && w.odcinek.slug === 'wejscie', JSON.stringify(w));
  check('…i mówi, że mapa zaczyna się później', w.stan === 'przyblizony' && w.powod.includes('12'), JSON.stringify(w));
}
{
  const w = wybierzOdcinek(1999, ODCINKI, TERAZ); // wiek 26
  check('za stary → odcinek PRZYBLIŻONY (ostatni), z powodem',
    w.stan === 'przyblizony' && w.odcinek.slug === 'prog', JSON.stringify(w));
}
for (const zly of [null, undefined, 0, 1899, 2200, Number.NaN]) {
  const w = wybierzOdcinek(zly as number | null, ODCINKI, TERAZ);
  check(`rocznik ${String(zly)} → „nie wiem", NIGDY domyślny odcinek`,
    w.stan === 'nie_wiem', JSON.stringify(w));
}
check('brak odcinków w bazie → „nie wiem", nie wywrotka',
  wybierzOdcinek(2010, [], TERAZ).stan === 'nie_wiem', 'pusta lista');
check('zakres wieku pisany półpauzą, tak jak w dokumencie',
  zakresWieku(ODCINKI[0]) === '12–13 lat', zakresWieku(ODCINKI[0]));

// ═══════════════════════════════════════════════════════════════════
// 3. WARIANT (reguła P8)
// ═══════════════════════════════════════════════════════════════════
check('stan normalny → wariant base',
  wybierzWariant({ exitAktywny: false, swiadekDeselekcji: false }) === 'base', 'base');
check('ścieżka wyjścia → wariant „odpadłem"',
  wybierzWariant({ exitAktywny: true, swiadekDeselekcji: false }) === 'after_deselection', 'after_deselection');
check('świadek deselekcji → wariant „świadek"',
  wybierzWariant({ exitAktywny: false, swiadekDeselekcji: true }) === 'witness', 'witness');
check('ścieżka wyjścia wygrywa nad świadkiem (własna sytuacja przed cudzą)',
  wybierzWariant({ exitAktywny: true, swiadekDeselekcji: true }) === 'after_deselection', 'kolizja');
check('nieznane wejścia → base, nie wywrotka',
  wybierzWariant({ exitAktywny: null, swiadekDeselekcji: null }) === 'base', 'null');

// ═══════════════════════════════════════════════════════════════════
// 4. TRZY SEKCJE — kolejność i szczelność
// ═══════════════════════════════════════════════════════════════════
{
  const w = zbudujOdcinek(ODCINKI[2], 'base', CZYNNIKI);
  check('odcinek gotowy', w.stan === 'gotowy', JSON.stringify(w).slice(0, 200));
  if (w.stan === 'gotowy') {
    check('sekcja 1: dokładnie jedna rzecz na jutro', w.naJutro.id === 'a', w.naJutro.id);
    check('sekcja 2: „w Twoich rękach" ma is_controllable = true',
      w.wTwoichRekach.every((x) => x.is_controllable), w.wTwoichRekach.map((x) => x.id).join(','));
    check('sekcja 3: „tło" ma is_controllable = false',
      w.tlo.every((x) => !x.is_controllable), w.tlo.map((x) => x.id).join(','));
    check('pozycja „na jutro" NIE dubluje się w sekcji 2',
      !w.wTwoichRekach.some((x) => x.is_tomorrow), w.wTwoichRekach.map((x) => x.id).join(','));
    check('tło NIE JEST puste — trzecia sekcja jest działaniem, nie wypełniaczem',
      w.tlo.length === 2, String(w.tlo.length));
    check('czynniki innego ODCINKA nie wyciekają',
      ![...w.wTwoichRekach, ...w.tlo].some((x) => x.segment_id !== 's3'), 'szczelność odcinka');
    check('czynniki innego WARIANTU nie wyciekają',
      ![...w.wTwoichRekach, ...w.tlo].some((x) => x.variant !== 'base'), 'szczelność wariantu');
    check('kolejność wg sort_order, nie wg kolejności z bazy',
      w.wTwoichRekach.map((x) => x.id).join(',') === 'b,c', w.wTwoichRekach.map((x) => x.id).join(','));
  }
}
{
  const w = zbudujOdcinek(ODCINKI[2], 'after_deselection', CZYNNIKI);
  check('wariant „odpadłem" bierze SWOJE wiersze',
    w.stan === 'gotowy' && w.naJutro.id === 'y', JSON.stringify(w).slice(0, 160));
  check('…i ma własne tło', w.stan === 'gotowy' && w.tlo.length === 1, JSON.stringify(w).slice(0, 160));
}
{
  const w = zbudujOdcinek(ODCINKI[2], 'witness', CZYNNIKI);
  check('wariant bez treści → „brak treści", NIE ciche zejście na base',
    w.stan === 'brak_tresci', JSON.stringify(w).slice(0, 200));
}
{
  // Reguła P7 złamana w danych: zero pozycji „na jutro".
  const bezJutra = CZYNNIKI.filter((x) => x.segment_id === 's3' && x.variant === 'base' && !x.is_tomorrow);
  const w = zbudujOdcinek(ODCINKI[2], 'base', bezJutra);
  check('(P7) odcinek bez rzeczy „na jutro" jest WADLIWY, nie pusty',
    w.stan === 'wadliwy', JSON.stringify(w).slice(0, 200));
  check('(P7) …i mówi to zdaniem', w.stan === 'wadliwy' && w.powod === WADLIWY_BEZ_JUTRA, JSON.stringify(w).slice(0, 200));
  check('(P7) …a reszta odcinka jest nadal pokazana',
    w.stan === 'wadliwy' && w.wTwoichRekach.length === 2 && w.tlo.length === 2, JSON.stringify(w).slice(0, 200));
}
{
  const dwaJutra = [...CZYNNIKI, f({ id: 'a2', segment_id: 's3', is_tomorrow: true, sort_order: 9 })];
  const w = zbudujOdcinek(ODCINKI[2], 'base', dwaJutra);
  check('(P7) dwie pozycje „na jutro" też są WADLIWE — wyzwalacz bazy tego pilnuje, appka nie ufa',
    w.stan === 'wadliwy' && w.powod === WADLIWY_WIELE_JUTER, JSON.stringify(w).slice(0, 200));
}

// ═══════════════════════════════════════════════════════════════════
// 5. CICHY BRAK — brak tabeli ≠ brak treści ≠ błąd
// ═══════════════════════════════════════════════════════════════════
const bazaOK = {
  laduje: false, error: null as unknown,
  odcinki: ODCINKI, czynniki: CZYNNIKI,
  accountState: 'full' as AccountState | null, birthYear: 2009,
  exitAktywny: false as boolean | null, swiadekDeselekcji: false as boolean | null,
  teraz: TERAZ,
};

check('ładowanie ma własny stan, nie udaje pustki',
  zbudujStanMapy({ ...bazaOK, laduje: true }).stan === 'ladowanie', 'ladowanie');
{
  const s = zbudujStanMapy({ ...bazaOK, error: { code: '42P01', message: 'relation "road_factors" does not exist' } });
  check('brak TABELI → stan „brak_tabel", nie „brak treści"', s.stan === 'brak_tabel', JSON.stringify(s));
  check('…z komunikatem, który mówi, że treść ISTNIEJE, tylko nie wgrana',
    s.stan === 'brak_tabel' && s.powod === BRAK_TABEL_TEXT, JSON.stringify(s));
}
{
  const s = zbudujStanMapy({ ...bazaOK, error: { code: 'PGRST205', message: 'Could not find the table' } });
  check('PGRST205 też jest brakiem tabeli', s.stan === 'brak_tabel', JSON.stringify(s));
}
{
  const s = zbudujStanMapy({ ...bazaOK, error: { code: '42501', message: 'permission denied' } });
  check('BRAK UPRAWNIEŃ to BŁĄD, nie pustka i nie brak tabeli', s.stan === 'blad', JSON.stringify(s));
  check('…i mówi, że to nasza wina, nie brak treści',
    s.stan === 'blad' && s.powod === BLAD_ODCZYTU_TEXT, JSON.stringify(s));
}
{
  const s = zbudujStanMapy({ ...bazaOK, odcinki: [] });
  check('zapytanie przeszło, ale zero odcinków → „treść niewgrana", nie „nic nie masz"',
    s.stan === 'brak_tabel', JSON.stringify(s));
}
{
  const s = zbudujStanMapy({ ...bazaOK, odcinki: null, czynniki: null });
  check('null zamiast tablic (odczyt bez danych) też daje jawny stan, nie wywrotkę',
    s.stan === 'brak_tabel', JSON.stringify(s));
}

// ═══════════════════════════════════════════════════════════════════
// 6. STAN EKRANU — bramka konta wygrywa nad rocznikiem
// ═══════════════════════════════════════════════════════════════════
{
  const s = zbudujStanMapy(bazaOK);
  check('konto pełne + znany rocznik → mapa gotowa z odcinkiem', s.stan === 'gotowa', JSON.stringify(s).slice(0, 160));
  check('…i to jest odcinek „Okno" dla rocznika 2009',
    s.stan === 'gotowa' && s.widok.odcinek.slug === 'okno', JSON.stringify(s).slice(0, 160));
  check('…bez ostrzeżenia o przybliżeniu', s.stan === 'gotowa' && s.przyblizenie === null, 'przyblizenie');
}
for (const st of ['limited', 'unknown_age', 'suspended', null] as (AccountState | null)[]) {
  const s = zbudujStanMapy({ ...bazaOK, accountState: st });
  check(`konto ${String(st)}: mapa BEZ odcinka, mimo że rocznik jest znany`,
    s.stan === 'bez_odcinka', JSON.stringify(s).slice(0, 160));
  check(`konto ${String(st)}: lista odcinków nadal do czytania`,
    s.stan === 'bez_odcinka' && s.odcinki.length === 4, JSON.stringify(s).slice(0, 160));
}
{
  const s = zbudujStanMapy({ ...bazaOK, birthYear: null });
  check('konto pełne, ale brak rocznika → mapa bez odcinka, z powodem',
    s.stan === 'bez_odcinka' && s.powod.includes('rocznika'), JSON.stringify(s).slice(0, 200));
}
{
  const s = zbudujStanMapy({ ...bazaOK, exitAktywny: true });
  check('ścieżka wyjścia przełącza mapę na wariant „odpadłem"',
    s.stan === 'gotowa' && s.widok.wariant === 'after_deselection', JSON.stringify(s).slice(0, 160));
}
{
  const s = zbudujStanMapy({ ...bazaOK, birthYear: 2016 });
  check('wiek poza mapą → ostrzeżenie o przybliżeniu jest WIDOCZNE, nie połknięte',
    s.stan === 'gotowa' && typeof s.przyblizenie === 'string' && s.przyblizenie.length > 0,
    JSON.stringify(s).slice(0, 200));
}

// ═══════════════════════════════════════════════════════════════════
// 7. BRZMIENIA — Mapa nie ocenia zawodnika
// ═══════════════════════════════════════════════════════════════════
check('podpis sekcji „tło" zdejmuje ciężar, a nie tłumaczy porażkę',
  SEKCJA_TLO_PODPIS.includes('nie zależą od Ciebie') && SEKCJA_TLO_PODPIS.includes('nie brał ich na siebie'),
  SEKCJA_TLO_PODPIS);
for (const [nazwa, tekst] of [
  ['brak tabel', BRAK_TABEL_TEXT],
  ['błąd', BLAD_ODCZYTU_TEXT],
  ['wadliwy bez jutra', WADLIWY_BEZ_JUTRA],
  ['limited', dostepMapy('limited').powod],
] as [string, string][]) {
  check(`[${nazwa}] bez surowego tekstu z bazy na ekranie zawodnika`,
    !/road_factors|road_segments|PGRST|42P01|null/.test(tekst), tekst);
  check(`[${nazwa}] bez zakazanego „a jeśli się nie uda" (zakaz 8)`,
    !tekst.includes('jeśli się nie uda'), tekst);
}

console.log(`\n${passed} passed, ${failed} failed`);
// Celowo `throw`, a nie `process.exit(1)` — patrz komentarz w budzetUwagi.selftest.ts.
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
