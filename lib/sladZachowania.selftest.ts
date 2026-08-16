// PLAN-D-H 08.2026 (12.08.2026) — NOWY PLIK.
//
//   npx tsx lib/sladZachowania.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// PO CO TO ISTNIEJE. `behavioural_trace` jest MATERIALIZACJĄ, a materializacja
// różni się od liczenia w locie jedną rzeczą: błąd zostaje w bazie na zawsze
// i po miesiącu nikt już nie odróżni „policzyliśmy źle" od „zawodnik nic
// nie zrobił". Trzy rzeczy, które da się tu zepsuć po cichu:
//   • liczenie odbytych sesji BEZ odduplikowania — zawodnik, który poprawił
//     wpis, wygląda na pracowitszego;
//   • liczenie odbytych po `calendar_events.status = 'completed'` — wartość,
//     której ten system NIGDZIE nie zapisuje, więc licznik pokazuje zero
//     i wygląda jak prawda (zakaz 5);
//   • mediana snu zwracająca 0 zamiast „nie wiem" przy braku wpisów —
//     zero godzin snu to zdanie o zawodniku, którego nikt nie wypowiedział.
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75), ZNALEZISKO
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — nazwane liczbą. Ten plik miał 66 ASERCJI i ANI JEDNEJ,
// która patrzyłaby POZA własny moduł. Audyt H1 (15.08) zaliczył go do klasy K4:
// nie istnieje stan repozytorium z pilnowanym defektem, na którym by się zapalił.
//
// ⚠️ KOREKTA WOBEC H1 (O74). H1 podał dla tego strażnika commit z defektem
// `d3eecad` (2026-08-07 18:28). Moduł `lib/sladZachowania.ts` I ten strażnik
// powstały RAZEM w `e3cce2b` (2026-08-12 19:46) — pięć dni PÓŹNIEJ. Na
// `d3eecad` nie istniał ani moduł, ani strażnik, więc podany „stan z defektem"
// nie mógł niczego pokazać. To jest błąd H1, nie własność tego pliku.
//
// ⚠️ TEN STRAŻNIK JEST TEŻ K3. Moduł i strażnik mają JEDEN commit narodzin
// (`e3cce2b`), więc testu historycznego „stan sprzed naprawy" nie da się
// zrobić w ogóle — dowód idzie mutacją (O77).
//
// ⭐ ZNALEZISKO, NIE PORAŻKA: PRODUCENT BEZ KONSUMENTA. Zmierzone 16.08.2026
// na `main` = `123e09c` odkrywaniem katalogu, nie z pamięci:
//   konsumenci w `app/` + `components/`  →  0
//   konsumenci w `lib/` (pośrednicy)     →  0
//   zapisy do tabeli `behavioural_trace` →  0
// Nie ma więc EKRANU, o którego treści dałoby się cokolwiek orzec. Zamiast
// asercji „ekran woła moduł" sekcja 0 niżej zapadkuje POMIAR: równość liczby
// konsumentów z zerem (O73), w obie strony. Konsument, który się pojawi,
// ZAPALA strażnika z poleceniem przeniesienia asercji na ten ekran; ubytek
// wpisu z rejestru długu zapala go z poleceniem odwrotnym.
//
// ⛔ CZERWONY „Z ZAŁOŻENIA" JEST ZAKAZANY: czerwień, która stoi drugi dzień,
// przestaje być sygnałem. Dlatego stan zmierzony dziś jest ZIELONY, a czerwony
// robi się dopiero ZMIANA tego stanu.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  policzSlad, wierszSladu, opiszSlad, mediana, oknoWstecz, przesunDzien, dniOkna,
  SESJE_WLASNE_TYPY, OKNO_DNI, KOLUMNY_SLADU,
  type WpisDziennika, type WydarzenieKalendarza,
} from './sladZachowania';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

const libDir = dirname(fileURLToPath(import.meta.url));
const TERAZ = new Date('2026-08-12T18:00:00.000Z');
const DZIS = '2026-08-12';

// ═══════════════════════════════════════════════════════════════════
// ⭐ 0. PAS I2 16.08.2026 — KTO TO RYSUJE (K4 / O75). ODPOWIEDŹ: NIKT
// ═══════════════════════════════════════════════════════════════════
// Wszystkie asercje niżej czytają PLIKI SPOZA tego modułu. Bez nich 66 asercji
// tego pliku opisuje cztery liczniki, których nikt nie musi wołać — a opis
// funkcji nieużywanej jest zielony zawsze, cokolwiek by się z produktem stało.
{
  const root = dirname(libDir);

  /**
   * Źródło BEZ komentarzy — pliki tego projektu CYTUJĄ w komentarzach nazwy
   * modułów i zepsute wywołania (nagłówek `lib/kolejkaPodania.ts` wymienia
   * `lib/sladZachowania.ts` z nazwy). Strażnik czytający surowy tekst
   * naliczyłby taki cytat jako konsumenta i przechodziłby na cudzej
   * dokumentacji — a to jest dokładnie odwrotność pomiaru.
   */
  const bezKomentarzy = (s: string): string => s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .join('\n');

  /**
   * ⛔ BRAK PLIKU JEST FAIL-em Z NAZWĄ, nie wyjątkiem `ENOENT` (O76).
   * Strażnik, który pada przed pierwszą asercją, w CI wygląda jak awaria
   * narzędzia, a jest plikiem, KTÓRY ZNIKNĄŁ Z REPOZYTORIUM.
   */
  const BRAK_PLIKOW: string[] = [];
  const surowe = (wzgledna: string): string => {
    const p = join(root, wzgledna);
    if (!existsSync(p)) { BRAK_PLIKOW.push(wzgledna); return ''; }
    return readFileSync(p, 'utf8');
  };

  const PLIK_MODUL = 'lib/sladZachowania.ts';
  /** Rejestr długu „silnik bez ekranu" — pas F1, pozycja 33. */
  const PLIK_REJESTR_DLUGU = 'lib/kartaDzisILicznik.selftest.ts';
  const modulSurowy = surowe(PLIK_MODUL);
  const modul = bezKomentarzy(modulSurowy);
  const rejestrDlugu = bezKomentarzy(surowe(PLIK_REJESTR_DLUGU));

  console.log('0. KTO TO RYSUJE (K4 / O75)');

  check('⛔ (I2-0) każdy plik z listy strażnika istnieje i daje się odczytać',
    BRAK_PLIKOW.length === 0,
    `NIE MA TYCH PLIKÓW: ${BRAK_PLIKOW.join(', ')} — zmieniła się nazwa albo miejsce. `
    + 'Popraw listę w tym pliku ALBO przywróć plik; do tego czasu asercje niżej '
    + 'czytają PUSTY tekst i nie znaczą nic.');

  // ── Odkrywanie z katalogu, nie lista na sztywno (O69) ──
  // Lista wpisana ręcznie KŁAMIE NA ZIELONO: nowy ekran, który sięgnie po ten
  // moduł, po prostu nie znalazłby się na niej i pomiar dalej pokazywałby zero.
  const POMIN_KAT = new Set(['_diag_backup', 'node_modules', '.git', '.expo', 'assets']);
  function chodz(katalog: string, out: string[] = []): string[] {
    if (!existsSync(katalog)) return out;
    for (const wpis of readdirSync(katalog)) {
      if (POMIN_KAT.has(wpis)) continue;
      const p = join(katalog, wpis);
      if (statSync(p).isDirectory()) chodz(p, out);
      else if (p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p);
    }
    return out;
  }
  const wszystkie = (katalogi: string[]): string[] => katalogi
    .flatMap((k) => chodz(join(root, k)))
    .map((p) => relative(root, p).split(sep).join('/'))
    .filter((p) => !p.endsWith('.selftest.ts'))
    .sort();

  const EKRANY = wszystkie(['app', 'components']);
  const MODULY_LIB = wszystkie(['lib']).filter((p) => p !== PLIK_MODUL);
  const siega = (p: string): boolean =>
    /from\s+'[^']*\/?sladZachowania'/.test(bezKomentarzy(readFileSync(join(root, p), 'utf8')));

  const konsumenciEkranow = EKRANY.filter(siega);
  const posrednicyWLib = MODULY_LIB.filter(siega);
  // ⚠️ `wierszSladu` buduje wiersz do `upsert` po `(user_id, window_start,
  // window_end)`. Jeżeli tego upsertu nikt nie wykonuje, materializacja nie
  // materializuje niczego — tabela zostaje pusta, tak jak była 12.08.2026.
  const piszacyDoTabeli = [...EKRANY, ...MODULY_LIB].filter(
    (p) => bezKomentarzy(readFileSync(join(root, p), 'utf8')).includes('behavioural_trace'));

  // ⭐ POMIAR WYPISANY GŁOŚNO. Ma stać w logu CI także wtedy, gdy wszystko jest
  // zielone — inaczej „zero konsumentów" jest wiedzą jednej osoby z jednego dnia.
  console.log(`[pomiar] 16.08.2026, main=123e09c — lib/sladZachowania.ts: `
    + `konsumenci w app/+components/ = ${konsumenciEkranow.length} `
    + `[${konsumenciEkranow.join(', ') || '—'}] · `
    + `pośrednicy w lib/ = ${posrednicyWLib.length} [${posrednicyWLib.join(', ') || '—'}] · `
    + `piszący do behavioural_trace = ${piszacyDoTabeli.length} [${piszacyDoTabeli.join(', ') || '—'}] · `
    + `przeszukane pliki: ${EKRANY.length} ekranów + ${MODULY_LIB.length} modułów lib/`);

  // ── ⭐ RÓWNOŚĆ Z WARTOŚCIĄ ZMIERZONĄ DZIŚ, nie „≥ 1" ani „≥ 0" (O73) ──
  check('⭐ (I2-0) ZERO EKRANÓW — dokładnie tylu konsumentów, ilu 16.08 (0), RÓWNOŚĆ nie „≥"',
    konsumenciEkranow.length === 0,
    `konsumenci w app/+components/: ${konsumenciEkranow.join(', ')} → ktoś WPIĄŁ ślad zachowania na ekran. `
    + 'To jest DOBRA wiadomość i mimo to strażnik ma prawo być czerwony: od tej chwili '
    + '66 asercji niżej opisuje funkcję, którą KTOŚ WIDZI, więc trzeba (a) przenieść asercje '
    + 'na treść tego ekranu — czy woła `policzSlad`, czy nie liczy median u siebie, czy rysuje '
    + '„nie masz ani jednego wpisu o śnie" zamiast „0 h" — i (b) skreślić pozycję '
    + '`lib/sladZachowania.ts :: policzSlad` z rejestru SILNIKI_BEZ_EKRANU w '
    + `${PLIK_REJESTR_DLUGU}. Dopóki tego nie ma, wpięcie jest niepilnowane.`);

  check('⭐ (I2-0) ZERO POŚREDNIKÓW w `lib/` — nikt nie ciągnie śladu okrężną drogą',
    posrednicyWLib.length === 0,
    `moduły lib/ sięgające po ślad: ${posrednicyWLib.join(', ')} → pomiar „zero ekranów" wyżej `
    + 'przestał znaczyć „nikt tego nie widzi": moduł-pośrednik MOŻE mieć własny ekran. '
    + 'Sprawdź, czy ten pośrednik jest gdzieś rysowany, i jeżeli tak — asercje o treści '
    + 'mają iść na TAMTEN ekran, a nie zostać tutaj.');

  check('⭐ (I2-0) ZERO ZAPISÓW do `behavioural_trace` — materializacja nadal nie materializuje',
    piszacyDoTabeli.length === 0,
    `piszący do tabeli: ${piszacyDoTabeli.join(', ')} → pojawił się upsert. `
    + '`wierszSladu` oddaje `computed_at` z appki, więc od tej chwili BŁĄD ZOSTAJE W BAZIE '
    + 'NA ZAWSZE i po miesiącu nikt nie odróżni „policzyliśmy źle" od „zawodnik nic nie zrobił". '
    + 'Ten strażnik musi wtedy dostać asercję na kształt zapisu, nie tylko na kształt liczenia.');

  // ── ⭐ ZAPADKA W DRUGĄ STRONĘ: dług nie znika po cichu z rejestru ──
  // Bez niej „zero konsumentów" da się przenocować dowolnie długo: wystarczy
  // usunąć pozycję z rejestru F1 i nikt już nie policzy, ile silników stoi bez
  // ekranu. Trzy asercje wyżej byłyby wtedy nadal zielone.
  check('⭐ (I2-0) dług „silnik bez ekranu" JEST wpisany w rejestrze F1, z kluczem i powodem',
    rejestrDlugu.includes('lib/sladZachowania.ts :: policzSlad')
    && rejestrDlugu.includes('SILNIKI_BEZ_EKRANU'),
    `pozycja zniknęła z ${PLIK_REJESTR_DLUGU} → cztery liczniki dalej nie mają ekranu, `
    + 'ale przestały być policzalne jako dług. „Zgłoszone i nienaprawione" bez rejestru '
    + 'jest nieodróżnialne od „naprawione" (O68).');

  // ── Brak konsumenta ma być DECYZJĄ Z DATĄ, a nie przeoczeniem ──
  // ⚠️ Ta jedna asercja czyta ŹRÓDŁO SUROWE, z komentarzami, i to jest celowe:
  // pilnuje właśnie komentarza. Decyzja o zachowaniu policzonego, nieużywanego
  // kodu jest ważna WYŁĄCZNIE wtedy, gdy da się przeczytać, kto i kiedy ją podjął.
  check('(I2-0) brak konsumenta jest UDOKUMENTOWANĄ decyzją z datą, nie przeoczeniem',
    modulSurowy.includes('NIE MA DZIŚ ANI JEDNEGO KONSUMENTA')
    && modulSurowy.includes('13.08.2026'),
    'z nagłówka `lib/sladZachowania.ts` zniknęło wyjaśnienie, dlaczego ten plik stoi bez ekranu '
    + '(usunięcie Kalibracji 13.08.2026, zasada N1). Bez daty i powodu „producent bez konsumenta" '
    + 'wygląda jak zapomniany kod i pierwsza osoba sprzątająca repo skasuje przetestowaną pracę.');

  // ── ⭐ ZAPADKA NA SKASOWANIE ──
  // Trzy zera wyżej spełnia też PUSTY REPOZYTORIUM: skasowanie
  // `lib/sladZachowania.ts` daje 0 konsumentów, 0 pośredników i 0 zapisów.
  // Bez tej asercji strażnik NAGRADZAŁBY usunięcie policzonej pracy, którą
  // decyzja z 13.08.2026 kazała zachować do rundy systematyczności.
  check('⭐ (I2-0) moduł nadal LICZY cztery liczniki — zera wyżej spełnia też jego skasowanie',
    modul.includes('planned_sessions') && modul.includes('done_sessions')
    && modul.includes('own_sessions') && modul.includes('days_with_entry')
    && modul.includes('sleep_median_h') && /export function policzSlad/.test(modul),
    'z modułu zniknął któryś z czterech liczników albo sama `policzSlad` — a wtedy trzy asercje '
    + '„zero konsumentów / zero pośredników / zero zapisów" są spełnione przez USUNIĘCIE funkcji. '
    + 'Zawodnik straci wtedy nie ekran, którego nie ma, tylko jedyną policzoną odpowiedź '
    + 'na pytanie „czy ruszyłem z miejsca".');
}

// ═══════════════════════════════════════════════════════════════════
// 1. OKNO I DATY
// ═══════════════════════════════════════════════════════════════════
check('domyślne okno to 28 dni', OKNO_DNI === 28, String(OKNO_DNI));
{
  const o = oknoWstecz(DZIS);
  check('okno 28 dni kończy się dzisiaj włącznie', o.do_ === DZIS, JSON.stringify(o));
  check('…i zaczyna się 27 dni wcześniej', o.od === '2026-07-16', JSON.stringify(o));
  check('…czyli obejmuje dokładnie 28 dni', dniOkna(o) === 28, String(dniOkna(o)));
}
check('przesunDzien przechodzi przez granicę miesiąca',
  przesunDzien('2026-03-01', -1) === '2026-02-28', przesunDzien('2026-03-01', -1));
check('przesunDzien przechodzi przez 29 lutego w roku przestępnym',
  przesunDzien('2024-03-01', -1) === '2024-02-29', przesunDzien('2024-03-01', -1));
{
  let rzucil = false;
  try { przesunDzien('2026-02-31', 0); } catch { rzucil = true; }
  check('31 lutego ODRZUCONE, a nie przewinięte cicho na 3 marca', rzucil, '2026-02-31');
}
{
  let rzucil = false;
  try { przesunDzien('wczoraj', 0); } catch { rzucil = true; }
  check('śmieć zamiast daty rzuca, a nie daje NaN', rzucil, 'wczoraj');
}

// ═══════════════════════════════════════════════════════════════════
// 2. MEDIANA — „nie wiem" zamiast zera
// ═══════════════════════════════════════════════════════════════════
check('mediana pustej listy to null, NIE zero', mediana([]) === null, String(mediana([])));
check('mediana nieparzystej liczby elementów', mediana([6, 8, 7]) === 7, String(mediana([6, 8, 7])));
check('mediana parzystej liczby elementów', mediana([6, 8]) === 7, String(mediana([6, 8])));
check('mediana z półgodzinami zaokrąglona do jednego miejsca',
  mediana([6.25, 7.75]) === 7, String(mediana([6.25, 7.75])));
check('mediana pomija NaN, zamiast zwrócić NaN',
  mediana([NaN, 7, 7]) === 7, String(mediana([NaN, 7, 7])));

// ═══════════════════════════════════════════════════════════════════
// 3. CZTERY LICZNIKI
// ═══════════════════════════════════════════════════════════════════
const okno = oknoWstecz(DZIS);

function wpis(n: Partial<WpisDziennika> = {}): WpisDziennika {
  return { dzien: DZIS, session_type: null, calendar_event_id: null, sleep_hours: null, ...n };
}
function ev(id: number, dzien = DZIS): WydarzenieKalendarza {
  return { id, dzien };
}

{
  const s = policzSlad({ okno, wpisy: [], wydarzenia: [] });
  check('puste dane: cztery liczniki jawnie wyzerowane',
    s.planned_sessions === 0 && s.done_sessions === 0 && s.own_sessions === 0 && s.days_with_entry === 0,
    JSON.stringify(s));
  check('…ale mediana snu to null, nie zero — to jest „nie wiem"',
    s.sleep_median_h === null, JSON.stringify(s));
}
{
  const s = policzSlad({
    okno,
    wydarzenia: [ev(1), ev(2), ev(3)],
    wpisy: [wpis({ calendar_event_id: 1 }), wpis({ calendar_event_id: 2 })],
  });
  check('zaplanowane liczone z kalendarza', s.planned_sessions === 3, JSON.stringify(s));
  check('odbyte liczone z daily_logs.calendar_event_id', s.done_sessions === 2, JSON.stringify(s));
}
{
  // SEDNO: dwa wpisy do TEGO SAMEGO wydarzenia to jedna odbyta sesja.
  const s = policzSlad({
    okno,
    wydarzenia: [ev(1), ev(2)],
    wpisy: [wpis({ calendar_event_id: 1 }), wpis({ calendar_event_id: 1, dzien: '2026-08-11' })],
  });
  check('ODDUPLIKOWANIE: dwa wpisy do jednego wydarzenia = jedna odbyta sesja',
    s.done_sessions === 1, JSON.stringify(s));
}
{
  const s = policzSlad({
    okno,
    wydarzenia: [ev(1)],
    wpisy: [wpis({ calendar_event_id: 999 })],
  });
  check('wpis wskazujący wydarzenie SPOZA okna nie zalicza sesji w tym oknie',
    s.done_sessions === 0, JSON.stringify(s));
}
{
  const s = policzSlad({
    okno,
    wydarzenia: [],
    wpisy: [
      wpis({ session_type: 'own_training' }),
      wpis({ session_type: 'micro_session' }),
      wpis({ session_type: 'club_training' }),
      wpis({ session_type: 'match' }),
      wpis({ session_type: null }),
    ],
  });
  check('sesje własne: własny trening i mikro-sesja liczą się', s.own_sessions === 2, JSON.stringify(s));
  check('…a trening klubowy i mecz NIE', s.own_sessions === 2, JSON.stringify(s));
}
check('zbiór typów pracy własnej jest zamknięty i nie zawiera treningu klubowego',
  SESJE_WLASNE_TYPY.length === 2 && !SESJE_WLASNE_TYPY.includes('club_training'),
  JSON.stringify(SESJE_WLASNE_TYPY));
{
  const s = policzSlad({
    okno,
    wydarzenia: [],
    wpisy: [
      wpis({ dzien: '2026-08-10', sleep_hours: 6 }),
      wpis({ dzien: '2026-08-10', sleep_hours: 8 }),
      wpis({ dzien: '2026-08-11' }),
    ],
  });
  check('dni z wpisem liczone po DNIU, nie po liczbie wpisów', s.days_with_entry === 2, JSON.stringify(s));
  check('mediana snu z dwóch wpisów', s.sleep_median_h === 7, JSON.stringify(s));
}
{
  const poza = policzSlad({
    okno,
    wydarzenia: [ev(1, '2026-07-15')],
    wpisy: [wpis({ dzien: '2026-07-15', session_type: 'own_training' })],
  });
  check('dzień o jeden przed oknem NIE wchodzi do liczników',
    poza.planned_sessions === 0 && poza.own_sessions === 0 && poza.days_with_entry === 0,
    JSON.stringify(poza));
  const brzeg = policzSlad({
    okno,
    wydarzenia: [ev(1, '2026-07-16')],
    wpisy: [wpis({ dzien: '2026-07-16', session_type: 'own_training' })],
  });
  check('pierwszy dzień okna WCHODZI (granica należy do okna)',
    brzeg.planned_sessions === 1 && brzeg.own_sessions === 1, JSON.stringify(brzeg));
}

// ═══════════════════════════════════════════════════════════════════
// 4. WIERSZ DO BAZY
// ═══════════════════════════════════════════════════════════════════
{
  const s = policzSlad({ okno, wpisy: [wpis({ sleep_hours: 7 })], wydarzenia: [ev(1)] });
  const r = wierszSladu({ userId: 'u1', okno, slad: s, teraz: TERAZ });
  for (const k of ['user_id', 'window_start', 'window_end', 'planned_sessions', 'done_sessions',
    'own_sessions', 'sleep_median_h', 'days_with_entry', 'computed_at']) {
    check(`wiersz ma pole „${k}"`, Object.prototype.hasOwnProperty.call(r, k), JSON.stringify(r));
  }
  check('klucz upserta zgadza się z UNIQUE (user_id, window_start, window_end)',
    r.window_start === okno.od && r.window_end === okno.do_, JSON.stringify(r));
  check('window_start < window_end — inaczej odrzuci CHECK trace_window_ok',
    String(r.window_start) < String(r.window_end), JSON.stringify(r));
  check('computed_at ustawia appka, nie domyślna wartość bazy',
    r.computed_at === TERAZ.toISOString(), JSON.stringify(r));
  for (const k of KOLUMNY_SLADU.split(',')) {
    check(`lista kolumn do odczytu zawiera „${k}" i pole istnieje w wierszu`,
      Object.prototype.hasOwnProperty.call(r, k), k);
  }
}
{
  const s = policzSlad({ okno, wpisy: [], wydarzenia: [] });
  const r = wierszSladu({ userId: 'u1', okno, slad: s, teraz: TERAZ });
  check('brak wpisów o śnie → w bazie ląduje NULL, a nie 0',
    r.sleep_median_h === null, JSON.stringify(r));
}

// ═══════════════════════════════════════════════════════════════════
// 5. WYPOWIEDŹ — fakty obok siebie i cisza (zakaz 11)
// ═══════════════════════════════════════════════════════════════════
{
  const s = policzSlad({
    okno, wydarzenia: [ev(1), ev(2), ev(3), ev(4)],
    wpisy: [wpis({ calendar_event_id: 1, sleep_hours: 6 })],
  });
  const linie = opiszSlad(s, okno).join(' ').toLowerCase();
  for (const zakazane of ['powinieneś', 'niestety', 'słabo', 'mało', 'za mało', 'dobrze',
    'świetnie', 'brawo', 'lepszy', 'gorszy', 'średnia', 'inni', 'rówieśnic']) {
    check(`opis nie zawiera oceny „${zakazane}"`, !linie.includes(zakazane), zakazane);
  }
  check('opis podaje zaplanowane I odbyte obok siebie',
    linie.includes('zaplanowane sesje: 4') && linie.includes('odbyte: 1'), linie);
  check('opis nie kończy się wnioskiem — nie ma ani jednego zdania o zawodniku',
    !/jesteś|robisz za|widać, że/.test(linie), linie);
}
{
  const s = policzSlad({ okno, wpisy: [], wydarzenia: [] });
  const linie = opiszSlad(s, okno).join(' ');
  check('brak wpisów o śnie opisany wprost, a nie jako „0 h"',
    linie.includes('ani jednego wpisu o śnie') && !linie.includes('0 h'), linie);
}

// ═══════════════════════════════════════════════════════════════════
// 6. ŹRÓDŁO — zakaz 5 jako mechanizm
// ═══════════════════════════════════════════════════════════════════
// Komentarze odfiltrowane: nagłówek tego pliku CYTUJE zakaz 5 razem z nazwą
// kolumny, a strażnik ma pilnować kodu, nie cytatu.
const zrodlo = readFileSync(join(libDir, 'sladZachowania.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .map((l) => l.replace(/(^|\s)\/\/.*$/, '$1'))
  .join('\n');
check('źródło NIGDZIE nie sięga po calendar_events.status',
  !/status\s*===?\s*['"]completed['"]/.test(zrodlo) && !zrodlo.includes(".status"), 'status');
check('źródło nie czyta zegara (czas i „dzisiaj" wchodzą parametrem)',
  !/new Date\(\)/.test(zrodlo) && !zrodlo.includes('Date.now('), 'zegar');
check('odbyte sesje liczone przez Set, czyli z odduplikowaniem',
  zrodlo.includes('new Set<number>()'), 'Set');

// ═══════════════════════════════════════════════════════════════════
console.log(`\n${passed} przeszło, ${failed} nie przeszło.`);
if (failed > 0) process.exit(1);
