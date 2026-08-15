// JEDNA DROGA B2 08.08.2026 — weryfikacja wskaźnika pracy w hero Celu
// (lib/focusBlockProgress.ts). Czysta logika, bez Supabase/RN, uruchamiana
// lokalnie poza appką:
//
//   npx tsx lib/focusBlockProgress.selftest.ts
//
// (jeśli brak `tsx` w projekcie: `npm install --no-save tsx`, potem to samo
// polecenie). Ten sam wzorzec co lib/goal-prominence.selftest.ts.
// Uruchom ponownie po każdej zmianie w lib/focusBlockProgress.ts.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeFocusBlockProgress,
  computeFocusBlockProgressState,
  NIE_WIEM_TYTUL, NIE_WIEM_POWOD, NIE_WIEM_RZECZ_DO_ZROBIENIA, NIE_WIEM_EKRAN_WYJSCIA,
  // ⭐ PLAN-D-E2 15.08.2026 — druga liczba, której nic nie kasuje.
  policzPraceWeWszystkichBlokach,
  odmienPrzezLiczbe,
  dorobekBlokowLiczba,
  dorobekBlokowNiePoliczony,
  DOROBEK_BLOKOW_PUSTO,
  DOROBEK_BLOKOW_RZECZ_DO_ZROBIENIA,
  ZRODLO_SESJE_BLOKOW,
  ZRODLO_POWIAZANIA_WPISOW,
} from './focusBlockProgress';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

const BLOCK = { id: 'fb-1', segment_id: 'moc' };
const OTHER_BLOCK = { id: 'fb-2', segment_id: 'regeneracja' };
const ev = (id: number, fb: string | null) => ({ id, focus_block_id: fb });

// Sesje Bloku wymieszane z wydarzeniami niezwiązanymi z Blokiem (trening
// klubowy, mecz) — dokładnie to, co przyjdzie z zapytania w dzis.tsx.
const EVENTS = [
  ev(1, 'fb-1'), ev(2, 'fb-1'), ev(3, 'fb-1'),
  ev(4, 'fb-1'), ev(5, 'fb-1'), ev(6, 'fb-1'),
  ev(90, null), ev(91, null),
  ev(50, 'fb-2'), ev(51, 'fb-2'),
];

{
  const r = computeFocusBlockProgress({
    goalSegmentId: 'moc', activeBlocks: [BLOCK], scheduledEvents: EVENTS,
    doneEventIds: new Set([1, 2, 3, 90]), // 90 to wydarzenie spoza Bloku — nie może się liczyć
  });
  check('3 z 6 — wydarzenia spoza Bloku nie wpadają do licznika',
    r?.done === 3 && r?.total === 6, JSON.stringify(r));
}

{
  const r = computeFocusBlockProgress({
    goalSegmentId: 'moc', activeBlocks: [BLOCK], scheduledEvents: EVENTS, doneEventIds: new Set(),
  });
  check('0 z 6 — zaplanowane, nic nie zrobione', r?.done === 0 && r?.total === 6, JSON.stringify(r));
}

{
  const r = computeFocusBlockProgress({
    goalSegmentId: 'moc', activeBlocks: [BLOCK], scheduledEvents: EVENTS,
    doneEventIds: new Set([1, 2, 3, 4, 5, 6]),
  });
  check('6 z 6 — Blok wyrobiony', r?.done === 6 && r?.total === 6, JSON.stringify(r));
}

{
  // Zawodnik ma aktywny Blok, ale w INNYM filarze niż jego Cel.
  const r = computeFocusBlockProgress({
    goalSegmentId: 'moc', activeBlocks: [OTHER_BLOCK], scheduledEvents: EVENTS, doneEventIds: new Set([50]),
  });
  check('null — Blok istnieje, ale nie pod ten Cel (żadnej cudzej liczby)', r === null, JSON.stringify(r));
}

{
  const r = computeFocusBlockProgress({
    goalSegmentId: 'moc', activeBlocks: [], scheduledEvents: EVENTS, doneEventIds: new Set(),
  });
  check('null — brak aktywnego Bloku', r === null, JSON.stringify(r));
}

{
  const r = computeFocusBlockProgress({
    goalSegmentId: null, activeBlocks: [BLOCK], scheduledEvents: EVENTS, doneEventIds: new Set([1]),
  });
  check('null — brak Celu', r === null, JSON.stringify(r));
}

{
  // Blok jest, ale ani jednej sesji w kalendarzu (np. wszystkie anulowane —
  // zapytanie w dzis.tsx bierze wyłącznie status='scheduled').
  const r = computeFocusBlockProgress({
    goalSegmentId: 'moc', activeBlocks: [BLOCK],
    scheduledEvents: [ev(90, null), ev(50, 'fb-2')], doneEventIds: new Set(),
  });
  check('null — Blok bez ani jednej sesji (nie pokazujemy „0 z 0")', r === null, JSON.stringify(r));
}

{
  // Dwa aktywne Bloki w różnych filarach — wybieramy ten pod Cel.
  const r = computeFocusBlockProgress({
    goalSegmentId: 'regeneracja', activeBlocks: [BLOCK, OTHER_BLOCK],
    scheduledEvents: EVENTS, doneEventIds: new Set([50, 1, 2, 3]),
  });
  check('1 z 2 — właściwy Blok przy dwóch aktywnych', r?.done === 1 && r?.total === 2, JSON.stringify(r));
}

// ═══════════════════════════════════════════════════════════════════════
// PLAN-D-A1 08.2026 — STRAŻNIK TRZECIEGO STANU
//
// Asercje pilnują REGUŁY, nie dzisiejszych danych: nigdzie nie pada liczba
// 24 ani 10, bo test „jest 24 sesje" zgaśnie przy 25 i niczego nie upilnuje.
// ═══════════════════════════════════════════════════════════════════════

// ── (1) Licznik NIE MOŻE zwrócić liczby „0 z M", gdy nie ma ŻADNEGO powiązania.
//        To jest punkt 1 strażnika z polecenia i najważniejsza asercja w pliku.
{
  const r = computeFocusBlockProgressState({
    goalSegmentId: 'moc', activeBlocks: [BLOCK], scheduledEvents: EVENTS, doneEventIds: new Set(),
  });
  check('NIE_WIEM — M > 0, zero powiązań: stanu NIE DA SIĘ ominąć',
    r.stan === 'NIE_WIEM', JSON.stringify(r));
  check('NIE_WIEM niesie M, żeby dało się powiedzieć „ile z ilu"',
    r.stan === 'NIE_WIEM' && r.total === 6, JSON.stringify(r));
  check('NIE_WIEM nie ma pola `done` — nie da się z niego wyliczyć „0 z M"',
    !Object.prototype.hasOwnProperty.call(r, 'done'), JSON.stringify(r));
}

// Ta sama sytuacja przy KAŻDYM rozmiarze Bloku — reguła, nie jedna liczba.
{
  for (const ile of [1, 2, 7, 30]) {
    const evs = Array.from({ length: ile }, (_, i) => ev(1000 + i, 'fb-1'));
    const r = computeFocusBlockProgressState({
      goalSegmentId: 'moc', activeBlocks: [BLOCK], scheduledEvents: evs, doneEventIds: new Set(),
    });
    check(`NIE_WIEM niezależnie od rozmiaru Bloku (M = ${ile})`,
      r.stan === 'NIE_WIEM' && r.total === ile, JSON.stringify(r));
  }
}

// ── Dyskryminator: powiązanie do CUDZEGO Bloku też jest dowodem, że
//    mechanizm u tego zawodnika zadziałał — wtedy „0 z M" jest uczciwe.
{
  const r = computeFocusBlockProgressState({
    goalSegmentId: 'moc', activeBlocks: [BLOCK], scheduledEvents: EVENTS,
    doneEventIds: new Set([50]), // powiązanie do sesji INNEGO Bloku
  });
  check('WIADOMO 0 z 6 — jest dowód, że mechanizm u tego zawodnika działał',
    r.stan === 'WIADOMO' && r.done === 0 && r.total === 6, JSON.stringify(r));
}

{
  const r = computeFocusBlockProgressState({
    goalSegmentId: 'moc', activeBlocks: [BLOCK], scheduledEvents: EVENTS,
    doneEventIds: new Set([1, 2, 90]),
  });
  check('WIADOMO 2 z 6 — są powiązania w tym Bloku',
    r.stan === 'WIADOMO' && r.done === 2 && r.total === 6, JSON.stringify(r));
}

{
  const r = computeFocusBlockProgressState({
    goalSegmentId: 'moc', activeBlocks: [], scheduledEvents: EVENTS, doneEventIds: new Set(),
  });
  check('BRAK_PLANU — brak Bloku mówi o braku planu, nie o zerze pracy',
    r.stan === 'BRAK_PLANU', JSON.stringify(r));
}

{
  const r = computeFocusBlockProgressState({
    goalSegmentId: 'moc', activeBlocks: [BLOCK],
    scheduledEvents: [ev(90, null)], doneEventIds: new Set(),
  });
  check('BRAK_PLANU — Blok bez ani jednej sesji (M = 0), nie NIE_WIEM',
    r.stan === 'BRAK_PLANU', JSON.stringify(r));
}

// ── (2) Brzmienie NIE_WIEM MUSI mieć rzecz do zrobienia (M4) i NIE MOŻE
//        oceniać pracy zawodnika (M1). Asercje na regułę, nie na literę tekstu.
{
  check('brzmienie NIE_WIEM ma rzecz do zrobienia (niepusta, konkretna)',
    NIE_WIEM_RZECZ_DO_ZROBIENIA.trim().length >= 40, NIE_WIEM_RZECZ_DO_ZROBIENIA);
  check('rzecz do zrobienia wskazuje ekran, w który zawodnik ma wejść',
    NIE_WIEM_RZECZ_DO_ZROBIENIA.includes(NIE_WIEM_EKRAN_WYJSCIA), NIE_WIEM_RZECZ_DO_ZROBIENIA);
  check('tytuł NIE_WIEM mówi „nie wiemy", a nie podaje liczby zrobionych',
    NIE_WIEM_TYTUL(6).toLowerCase().includes('nie wiemy') && !/\b0 z \d/.test(NIE_WIEM_TYTUL(6)),
    NIE_WIEM_TYTUL(6));

  // Zakazane są ZWROTY OCENIAJĄCE PRACĘ ZAWODNIKA za defekt produktu.
  const OCENA = [
    'nie odhaczasz', 'nie odhaczyłeś', 'zapomniałeś', 'nie zrobiłeś',
    'brakuje ci', 'nie uzupełniasz', 'zaniedb', 'powinieneś był',
  ];
  const calosc = `${NIE_WIEM_TYTUL(6)} ${NIE_WIEM_POWOD} ${NIE_WIEM_RZECZ_DO_ZROBIENIA}`.toLowerCase();
  const znalezione = OCENA.filter((z) => calosc.includes(z));
  check('brzmienie NIE_WIEM nie ocenia pracy zawodnika (M1)',
    znalezione.length === 0, `znaleziono: ${znalezione.join(', ')}`);
}

// ── (4) ŻADNEGO DRUGIEGO TORU ZALICZANIA SESJI w plikach tego pasa.
//        Asercja na treść plików: obok `calendar_event_id` nie wolno pojawić
//        się nowej nazwie kolumny/tabeli niosącej „wykonanie".
//        ⚠️ O53: czytamy przez readFileSync + fileURLToPath, NIE przez `new URL`
//        (tsconfig appki ciągnie DOM i `new URL` pada na TS2769).
//        ⚠️ Sprawdzamy KOD, nie komentarze: strażnik, który czyta prozę,
//        zapala się na własnym uzasadnieniu (zmierzone przy pisaniu tej rundy:
//        słowo „throw" w komentarzu „ŻADNEGO throw" wywalało asercję niżej).
const bezKomentarzy = (src: string) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');
{
  const tu = dirname(fileURLToPath(import.meta.url));
  const zrodla: [string, string][] = [
    ['lib/focusBlockProgress.ts', join(tu, 'focusBlockProgress.ts')],
    ['lib/focusBlockJournalLink.ts', join(tu, 'focusBlockJournalLink.ts')],
    ['app/(tabs)/dziennik.tsx', join(tu, '..', 'app', '(tabs)', 'dziennik.tsx')],
  ];
  // Nazwy w kształcie kolumny/tabeli — nie słowa z prozy.
  const ZAKAZANE = [
    'completed_at', 'done_at', 'is_done', 'executed_at', 'session_completed',
    'sessions_done', 'session_done', 'completions', 'session_completions',
    'daily_log_completed', 'wykonane_sesje',
  ];
  for (const [nazwa, sciezka] of zrodla) {
    const kod = bezKomentarzy(readFileSync(sciezka, 'utf8'));
    const trafienia = ZAKAZANE.filter((z) => kod.includes(z));
    check(`${nazwa} — zero nowych nazw niosących „wykonanie" obok calendar_event_id`,
      trafienia.length === 0, `znaleziono: ${trafienia.join(', ')}`);
  }
}

// ── (3) ZAPIS WPISU NIE MOŻE ZALEŻEĆ od powodzenia znacznika `completed`.
//        Blok znacznika w dziennik.tsx ma własne `try`/`catch`, zero `throw`
//        i ślad w konsoli przy każdej porażce.
{
  const tu = dirname(fileURLToPath(import.meta.url));
  const dziennik = readFileSync(join(tu, '..', 'app', '(tabs)', 'dziennik.tsx'), 'utf8');
  const POCZ = 'ZNACZNIK WYKONANIA: POCZĄTEK';
  const KON = 'ZNACZNIK WYKONANIA: KONIEC';
  const i = dziennik.indexOf(POCZ);
  const j = dziennik.indexOf(KON);
  check('dziennik.tsx ma oznaczony blok znacznika wykonania', i > 0 && j > i, `i=${i} j=${j}`);
  const blok = bezKomentarzy(i > 0 && j > i ? dziennik.slice(i, j) : '');
  check('blok znacznika łapie własny wyjątek (nie wywraca zapisu wpisu)',
    /catch\s*\(/.test(blok), 'brak catch w bloku znacznika');
  check('blok znacznika NIE rzuca dalej — wpis zapisuje się mimo 23514',
    !/\bthrow\b/.test(blok), 'w bloku znacznika jest throw');
  check('porażka znacznika zostawia ślad (zero cichego catch {})',
    /console\.(warn|error)/.test(blok) && !/catch\s*\([^)]*\)\s*\{\s*\}/.test(blok),
    'brak śladu w konsoli albo pusty catch');
  check('znacznik pisze WYŁĄCZNIE do calendar_events.status, bez nowych pól',
    blok.includes("status: 'completed'") && !/insert\(/.test(blok),
    'znacznik robi coś więcej niż update statusu');

  // Cichy odczyt kalendarza — ten sam wzorzec, ta sama reguła.
  check('odczyt okna kalendarza nie połyka błędu (koniec `const { data } =`)',
    /const \{ data, error: calErr \}/.test(dziennik) && /console\.warn\(\'\[PLAN-D-A1\]/.test(dziennik),
    'błąd odczytu calendar_events znów jest odrzucany przy destrukturyzacji');
}


// ═══════════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-E2 08.2026 (15.08.2026) — DRUGA LICZBA, KTÓREJ NIC NIE KASUJE
//
// ⚠️ ASERCJE SĄ NA REGUŁĘ, NIE NA DANE. Nigdzie niżej nie ma liczby wierszy
// z produkcji — test „są 24 sesje" zgasłby przy 25 i niczego by nie pilnował.
// Liczby z produkcji stoją w nocie pasa.
// ═══════════════════════════════════════════════════════════════════════

console.log('\n── (E2) PRACA WE WSZYSTKICH BLOKACH ──────────────────────────');

// ── (E2-0) KONTRAKT PLIKU — czego w nim NIE WOLNO ─────────────────────
{
  const tu = dirname(fileURLToPath(import.meta.url));
  const surowy = readFileSync(join(tu, 'focusBlockProgress.ts'), 'utf8');
  const kod = bezKomentarzy(surowy);

  check('(E2-0) plik nie importuje Supabase ani Reacta',
    !/from\s+['"]@supabase|from\s+['"]react/.test(kod), 'czysta logika przestała być czysta');

  // ⭐ BEZ ZEGARA — bo zegar jest jedynym sposobem, żeby liczba zmalała sama.
  check('(E2-0) ⭐ plik nie czyta zegara (`Date.now`, `new Date`)',
    !/\bDate\.now\b|\bnew Date\b/.test(kod), 'w pliku pojawił się zegar — liczba może zacząć maleć');

  // ⛔ ZAKAZ IDENTYCZNY JAK W PASIE C4, z własną asercją na tekst pliku.
  const ZAKAZANE_BRZMIENIA = [
    'z rzędu', 'seria', 'serie', 'serii', 'passa', 'passy',
    'codziennie', 'nie przerwij', 'streak',
  ];
  const trafienia = ZAKAZANE_BRZMIENIA.filter((z) => kod.toLowerCase().includes(z));
  check('(E2-0) ⛔ zero serii dni, passy, „codziennie" i „nie przerwij" w KODZIE pliku',
    trafienia.length === 0, `znalezione: ${trafienia.join(', ')}`);

  // ⭐ KSZTAŁT TYPU JAKO REGUŁA (wzorzec z lib/nagrodaZaPrace.ts §7.1).
  const deklaracjaSesji = /export type BlockEventLike = \{[^}]*\}/.exec(kod)?.[0] ?? '';
  check('(E2-0) ⭐ typ sesji Bloku nie ma pola z DATĄ — nie ma czym policzyć przerwy',
    deklaracjaSesji.length > 0 && !/date|data|dzien|created_at|scheduled_/i.test(deklaracjaSesji),
    `deklaracja: ${deklaracjaSesji}`);
  check('(E2-0) ⭐ typ sesji Bloku nie ma pola ze STATUSEM — nie ma czym odsiać anulowanej',
    deklaracjaSesji.length > 0 && !/status|cancelled|completed|active/i.test(deklaracjaSesji),
    `deklaracja: ${deklaracjaSesji}`);

  // ⭐ NAJWAŻNIEJSZE: funkcja NIE PRZYJMUJE listy Bloków, więc filtr po
  //    statusie Bloku jest w niej NIE DO NAPISANIA.
  const podpis = /export function policzPraceWeWszystkichBlokach\(params: \{[\s\S]*?\}\)/.exec(kod)?.[0] ?? '';
  check('(E2-0) ⭐ funkcja dorobku nie przyjmuje listy Bloków (nie ma czego odsiać po statusie)',
    podpis.length > 0 && !/activeBlocks|bloki\s*:|status/i.test(podpis), `podpis: ${podpis.slice(0, 220)}`);

  // Stary licznik zostaje nietknięty — to jest odpowiedź na INNE pytanie.
  check('(E2-0) `computeFocusBlockProgress` nadal istnieje i nadal bierze `activeBlocks`',
    /export function computeFocusBlockProgress\(/.test(kod) && /activeBlocks/.test(kod),
    'licznik bieżącego Bloku zniknął — to nie było zadaniem tego pasa');
}

// ── (E2-1) PODSTAWOWE ZACHOWANIE DRUGIEJ LICZBY ───────────────────────
const sesja = (id: number, blok: string | null) => ({ id, focus_block_id: blok });

{
  const wszystkie = [sesja(1, 'A'), sesja(2, 'A'), sesja(3, 'B'), sesja(9, null)];
  const r = policzPraceWeWszystkichBlokach({
    wszystkieSesjeBlokow: wszystkie, zrobioneEventIds: new Set([1, 2, 3, 9]),
  });
  check('(E2-1) liczy sesje z DWÓCH Bloków i pomija wydarzenie spoza Bloku',
    r.rodzaj === 'policzony' && r.sesje === 3 && r.bloki === 2, JSON.stringify(r));
}

{
  const r = policzPraceWeWszystkichBlokach({
    wszystkieSesjeBlokow: [sesja(1, 'A'), sesja(1, 'A'), sesja(1, 'A')],
    zrobioneEventIds: new Set([1]),
  });
  check('(E2-1) ten sam wiersz podany trzy razy liczy się RAZ (zero nagrody za odświeżenie)',
    r.rodzaj === 'policzony' && r.sesje === 1, JSON.stringify(r));
}

{
  const r = policzPraceWeWszystkichBlokach({
    wszystkieSesjeBlokow: [sesja(1, 'A'), sesja(2, 'A')], zrobioneEventIds: new Set(),
  });
  check('(E2-1) zaplanowane, ale bez dowodu wykonania ⇒ POMIAR zero, nie awaria',
    r.rodzaj === 'policzony' && r.sesje === 0 && r.bloki === 0, JSON.stringify(r));
}

// ── (E2-2) TRZECI STAN (R5) — „nie policzone" ≠ „zero" ────────────────
{
  const bezSesji = policzPraceWeWszystkichBlokach({
    wszystkieSesjeBlokow: null, zrobioneEventIds: new Set([1]),
  });
  check('(E2-2) nieodczytane sesje Bloków ⇒ `nie_policzony` z nazwą źródła',
    bezSesji.rodzaj === 'nie_policzony' && bezSesji.nieodczytaneZrodlo === ZRODLO_SESJE_BLOKOW,
    JSON.stringify(bezSesji));

  const bezPowiazan = policzPraceWeWszystkichBlokach({
    wszystkieSesjeBlokow: [sesja(1, 'A')], zrobioneEventIds: null,
  });
  check('(E2-2) nieodczytane powiązania ⇒ `nie_policzony` z nazwą źródła',
    bezPowiazan.rodzaj === 'nie_policzony'
    && bezPowiazan.nieodczytaneZrodlo === ZRODLO_POWIAZANIA_WPISOW,
    JSON.stringify(bezPowiazan));

  // ⭐ KSZTAŁT, NIE WARTOŚĆ: „0 sesji" jest w tym stanie NIE DO NARYSOWANIA.
  check('(E2-2) ⭐ `nie_policzony` NIE MA pola `sesje` — zera nie da się z niego wyjąć',
    !Object.prototype.hasOwnProperty.call(bezSesji, 'sesje')
    && !Object.prototype.hasOwnProperty.call(bezSesji, 'bloki'),
    JSON.stringify(bezSesji));

  check('(E2-2) zdanie „nie policzone" jest INNE niż zdanie „jeszcze nic nie ma" (R5)',
    dorobekBlokowNiePoliczony(ZRODLO_SESJE_BLOKOW) !== DOROBEK_BLOKOW_PUSTO
    && dorobekBlokowNiePoliczony(ZRODLO_SESJE_BLOKOW).includes(ZRODLO_SESJE_BLOKOW),
    dorobekBlokowNiePoliczony(ZRODLO_SESJE_BLOKOW));

  check('(E2-2) stan „jeszcze nic nie ma" ma rzecz do zrobienia (M4)',
    DOROBEK_BLOKOW_RZECZ_DO_ZROBIENIA.trim().length >= 40
    && DOROBEK_BLOKOW_RZECZ_DO_ZROBIENIA.includes(NIE_WIEM_EKRAN_WYJSCIA),
    DOROBEK_BLOKOW_RZECZ_DO_ZROBIENIA);
}

// ── (E2-3) ⭐ ASERCJA TABELARYCZNA: KILKADZIESIĄT WEJŚĆ RÓŻNIĄCYCH SIĘ
//        WYŁĄCZNIE TYM, ILE BLOKÓW JEST `completed`
//
// ⚠️ GENERATOR JEST DETERMINISTYCZNY (LCG ze stałym ziarnem), a NIE
// `Math.random()`. Strażnik świecący na czerwono raz na sto uruchomień, na
// wejściu nie do odtworzenia, uczy, że czerwony bywa przypadkiem.
//
// ⚠️ JAK MODELUJĘ DOMKNIĘCIE BLOKU — z pomiaru, nie z wyobraźni. 15.08.2026
// na produkcji: Blok `completed` ma WSZYSTKIE 12 sesji w statusie `cancelled`,
// Blok `active` — wszystkie 12 w `scheduled`. Domknięcie Bloku wycina więc
// jego pracę DWA RAZY: raz filtrem po statusie Bloku, drugi raz filtrem po
// statusie sesji. Dlatego „STARE" niżej odsiewa jedno i drugie.
{
  let ziarno = 20260815;
  const losuj = (n: number): number => {
    ziarno = (ziarno * 1103515245 + 12345) % 2147483648;
    return ziarno % n;
  };

  let wejsc = 0;
  let spadkiNowej = 0;
  let scenariuszeZeSpadkiemStarej = 0;
  let nowaZawszeRowna = true;

  for (let scen = 0; scen < 14; scen++) {
    const ileBlokow = 2 + losuj(5);
    const sesje: { id: number; focus_block_id: string | null }[] = [];
    const zrobione = new Set<number>();
    let nastepneId = 1;

    for (let b = 0; b < ileBlokow; b++) {
      const ileSesji = 1 + losuj(8);
      for (let s = 0; s < ileSesji; s++) {
        const id = nastepneId++;
        sesje.push(sesja(id, `blok-${b}`));
        if (losuj(3) > 0) zrobione.add(id);
      }
    }
    // Kilka wydarzeń spoza Bloków — mają nie wpływać na nic.
    for (let i = 0; i < 3; i++) { const id = nastepneId++; sesje.push(sesja(id, null)); zrobione.add(id); }

    let poprzedniaNowa: number | null = null;
    let pierwszaNowa: number | null = null;
    let poprzedniaStara: number | null = null;
    let staraSpadla = false;

    // ⭐ JEDYNA RZECZ, KTÓRA SIĘ ZMIENIA MIĘDZY WIERSZAMI TEJ TABELI:
    //    ile pierwszych Bloków jest DOMKNIĘTYCH.
    for (let domknietych = 0; domknietych <= ileBlokow; domknietych++) {
      const czyDomkniety = (blok: string | null): boolean => {
        if (blok === null) return false;
        const nr = Number(blok.slice('blok-'.length));
        return nr < domknietych;
      };

      // STARE — dzisiejsza droga danych: tylko Bloki aktywne i tylko sesje
      // niezanulowane. Ta liczba MOŻE maleć i właśnie dlatego pas E2 istnieje.
      const stara = sesje.filter((s) => s.focus_block_id !== null
        && !czyDomkniety(s.focus_block_id) && zrobione.has(s.id)).length;

      // NOWE — pełny zbiór, bez odsiewania czegokolwiek.
      const wynik = policzPraceWeWszystkichBlokach({
        wszystkieSesjeBlokow: sesje, zrobioneEventIds: zrobione,
      });
      const nowa = wynik.rodzaj === 'policzony' ? wynik.sesje : -1;

      wejsc++;
      if (pierwszaNowa === null) pierwszaNowa = nowa;
      if (nowa !== pierwszaNowa) nowaZawszeRowna = false;
      if (poprzedniaNowa !== null && nowa < poprzedniaNowa) spadkiNowej++;
      if (poprzedniaStara !== null && stara < poprzedniaStara) staraSpadla = true;
      poprzedniaNowa = nowa;
      poprzedniaStara = stara;
    }
    if (staraSpadla) scenariuszeZeSpadkiemStarej++;
  }

  console.log(`   (E2-3) wejść w tabeli: ${wejsc} · scenariuszy: 14`);

  check(`⭐ (E2-3) ⛔ „praca we wszystkich Blokach" NIE ZMALAŁA ANI RAZU na ${wejsc} wejściach`,
    spadkiNowej === 0, `spadków: ${spadkiNowej}`);

  check('⭐ (E2-3) …i nie zmieniła się w ogóle — domknięcie Bloku jest dla niej niewidzialne',
    nowaZawszeRowna, 'liczba drgnęła przy zmianie liczby domkniętych Bloków');

  // ⚠️ BEZ TEJ ASERCJI POWYŻSZA NIE ZNACZY NIC. Liczba, która nie maleje, bo
  // wejście nie ma jak jej zmienić, jest tautologią, a nie dowodem. Ta pokazuje,
  // że na TYCH SAMYCH wejściach dzisiejsza droga danych naprawdę spada.
  check('⭐ (E2-3) ⛔ dzisiejsza droga danych na tych samych wejściach SPADA (defekt jest realny)',
    scenariuszeZeSpadkiemStarej >= 10, `scenariuszy ze spadkiem: ${scenariuszeZeSpadkiemStarej}/14`);
}

// ── (E2-4) MONOTONICZNOŚĆ PRZY DOKŁADANIU PRACY ───────────────────────
{
  const sesje: { id: number; focus_block_id: string | null }[] = [];
  const zrobione = new Set<number>();
  let poprzednia = -1;
  let spadki = 0;
  for (let i = 1; i <= 120; i++) {
    sesje.push(sesja(i, `blok-${i % 7}`));
    if (i % 3 !== 0) zrobione.add(i);
    const r = policzPraceWeWszystkichBlokach({
      wszystkieSesjeBlokow: sesje, zrobioneEventIds: zrobione,
    });
    const teraz = r.rodzaj === 'policzony' ? r.sesje : -1;
    if (teraz < poprzednia) spadki++;
    poprzednia = teraz;
  }
  check('(E2-4) 120 kroków dokładania pracy — liczba nie spadła ani razu',
    spadki === 0 && poprzednia > 0, `spadków: ${spadki}, koniec: ${poprzednia}`);
}

// ── (E2-5) ODMIANA PRZEZ LICZBĘ ───────────────────────────────────────
{
  const s = (n: number) => `${n} ${odmienPrzezLiczbe(n, ['sesja', 'sesje', 'sesji'])}`;
  check('(E2-5) odmiana: 1 sesja · 2 sesje · 5 sesji · 12 sesji · 22 sesje · 25 sesji',
    s(1) === '1 sesja' && s(2) === '2 sesje' && s(5) === '5 sesji'
    && s(12) === '12 sesji' && s(22) === '22 sesje' && s(25) === '25 sesji',
    [s(1), s(2), s(5), s(12), s(22), s(25)].join(' | '));

  check('(E2-5) zdanie z liczbą NIE zawiera zakresu czasu',
    !/dni|tygodni|ostatni|14|28/.test(dorobekBlokowLiczba(7, 2)), dorobekBlokowLiczba(7, 2));
  check('(E2-5) „w 1 Bloku" i „w 2 Blokach" — miejscownik się odmienia',
    dorobekBlokowLiczba(1, 1) === '1 sesja · w 1 Bloku'
    && dorobekBlokowLiczba(7, 2) === '7 sesji · w 2 Blokach',
    `${dorobekBlokowLiczba(1, 1)} / ${dorobekBlokowLiczba(7, 2)}`);
}

// ── (E2-6) ⭐ KONTRAKT DLA EKRANU — jedyne miejsce, w którym da się to zepsuć
//
// ⛔ TA ASERCJA JEST DZIŚ PUSTA I MÓWI O TYM WPROST. Jedyny konsument
// `lib/focusBlockProgress.ts` to `app/(tabs)/dzis.tsx` — plik pasa C4, którego
// pas E2 nie dotyka (§4 polecenia). Dopóki nikt tego nie podepnie, pętla niżej
// nie ma po czym chodzić, i strażnik, który by o tym milczał, dawałby fałszywe
// poczucie pokrycia. Dlatego obok pętli stoi asercja na SAM DETEKTOR.
{
  const tu = dirname(fileURLToPath(import.meta.url));
  const appRoot = dirname(tu);
  const katalogi: [string, string][] = [
    [join(appRoot, 'app', '(tabs)'), 'app/(tabs)/'],
    [join(appRoot, 'components'), 'components/'],
  ];
  const pliki = katalogi.flatMap(([kat, pref]) => readdirSync(kat)
    .filter((f) => f.endsWith('.tsx')).sort().map((f) => [`${pref}${f}`, join(kat, f)] as [string, string]));

  const podejrzanyArgument = (kod: string): string | null => {
    const m = /wszystkieSesjeBlokow\s*:\s*([^,\n]+)/.exec(kod);
    if (m === null) return null;
    return /scheduled|active|aktywn|tylkoZaplanowane/i.test(m[1]) ? m[1].trim() : null;
  };

  const wolajacy = pliki.filter(([, p]) =>
    bezKomentarzy(readFileSync(p, 'utf8')).includes('policzPraceWeWszystkichBlokach('));

  console.log(`   (E2-6) ekranów wołających dorobek Bloków: ${wolajacy.length}`
    + (wolajacy.length === 0 ? ' — ⚠️ NIKT TEGO JESZCZE NIE PODPIĄŁ, ta asercja nic dziś nie sprawdza' : ''));

  const zleWolajacy = wolajacy
    .map(([nazwa, p]) => ({ nazwa, arg: podejrzanyArgument(bezKomentarzy(readFileSync(p, 'utf8'))) }))
    .filter((x) => x.arg !== null);
  check('(E2-6) żaden ekran nie podaje do dorobku zbioru odsianego po statusie',
    zleWolajacy.length === 0,
    zleWolajacy.map((x) => `${x.nazwa}: ${x.arg}`).join(', '));

  // ⭐ ASERCJA NA SAM DETEKTOR — żeby „zero złych wywołań" nie znaczyło
  //    „detektor nie działa". Bez niej pusta pętla wyglądałaby jak sukces.
  check('(E2-6) ⭐ (strażnik strażnika) detektor złego wywołania naprawdę zapala',
    podejrzanyArgument('policzPraceWeWszystkichBlokach({ wszystkieSesjeBlokow: scheduledEvents, x: 1 })') !== null
    && podejrzanyArgument('policzPraceWeWszystkichBlokach({ wszystkieSesjeBlokow: wszystkieSesje, x: 1 })') === null,
    'detektor nie odróżnia zbioru odsianego od pełnego');
}

// ── (E2-7) ⭐ BATERIA MUTACYJNA — sześć wariantów, każdy zapala ────────
//
// ⚠️ MUTACJE SĄ OSOBNYMI FUNKCJAMI W TYM PLIKU, a nie przełącznikami wpiętymi
// w kod produkcyjny — dzięki temu żadna z nich nie ma jak wyjechać na
// produkcję i nie ma czego „cofać". Cofnięcie jest STRUKTURALNE: prawdziwa
// funkcja przechodzi tę samą baterię, którą mutanty oblewają.
//
// ⚠️ Bateria jest wąska (6 predykatów). Szerokość niosą grupy E2-0…E2-6.
{
  type Wejscie = { sesje: { id: number; focus_block_id: string | null }[]; zrobione: ReadonlySet<number> | null };
  type Licznik = (we: Wejscie) => number | null;

  // Umowa TEGO PLIKU, nie kodu produkcyjnego: Blok o id zaczynającym się od
  // `zamkniety-` jest domknięty, sesja o id >= 10000 jest anulowana. Prawdziwa
  // funkcja nie ma jak tego zobaczyć — i o to właśnie chodzi.
  const PRAWDZIWY: Licznik = (we) => {
    const r = policzPraceWeWszystkichBlokach({
      wszystkieSesjeBlokow: we.sesje, zrobioneEventIds: we.zrobione,
    });
    return r.rodzaj === 'policzony' ? r.sesje : null;
  };

  const M1_filtrStatusuBloku: Licznik = (we) => we.zrobione === null ? null
    : we.sesje.filter((s) => s.focus_block_id !== null
      && !s.focus_block_id.startsWith('zamkniety-') && we.zrobione!.has(s.id)).length;

  const M2_filtrStatusuSesji: Licznik = (we) => we.zrobione === null ? null
    : new Set(we.sesje.filter((s) => s.focus_block_id !== null && s.id < 10000
      && we.zrobione!.has(s.id)).map((s) => s.id)).size;

  const M3_bezOdsiewaniaDuplikatow: Licznik = (we) => we.zrobione === null ? null
    : we.sesje.filter((s) => s.focus_block_id !== null && we.zrobione!.has(s.id)).length;

  const M4_nieodczytaneJakPuste: Licznik = (we) => {
    const zr = we.zrobione ?? new Set<number>();
    return new Set(we.sesje.filter((s) => s.focus_block_id !== null && zr.has(s.id)).map((s) => s.id)).size;
  };

  const M5_bezDowoduWykonania: Licznik = (we) => we.zrobione === null ? null
    : new Set(we.sesje.filter((s) => s.focus_block_id !== null).map((s) => s.id)).size;

  const M6_takzeSpozaBlokow: Licznik = (we) => we.zrobione === null ? null
    : new Set(we.sesje.filter((s) => we.zrobione!.has(s.id)).map((s) => s.id)).size;

  const PODSTAWA: Wejscie = {
    sesje: [sesja(1, 'blok-0'), sesja(2, 'blok-0'), sesja(3, 'blok-1'), sesja(77, null)],
    zrobione: new Set([1, 2, 3, 77]),
  };
  const PO_DOMKNIECIU: Wejscie = {
    sesje: [sesja(1, 'zamkniety-0'), sesja(2, 'zamkniety-0'), sesja(3, 'blok-1'), sesja(77, null)],
    zrobione: new Set([1, 2, 3, 77]),
  };
  const PO_ANULOWANIU: Wejscie = {
    sesje: [sesja(10001, 'blok-0'), sesja(10002, 'blok-0'), sesja(3, 'blok-1'), sesja(77, null)],
    zrobione: new Set([10001, 10002, 3, 77]),
  };

  const predykaty: { nazwa: string; ok: (f: Licznik) => boolean }[] = [
    {
      nazwa: 'P1 domknięcie Bloku nie zmniejsza dorobku',
      ok: (f) => f(PO_DOMKNIECIU) === f(PODSTAWA),
    },
    {
      nazwa: 'P2 anulowanie sesji Bloku nie zmniejsza dorobku',
      ok: (f) => f(PO_ANULOWANIU) === f(PODSTAWA),
    },
    {
      nazwa: 'P3 ten sam wiersz liczy się raz',
      ok: (f) => f({ sesje: [sesja(1, 'blok-0'), sesja(1, 'blok-0')], zrobione: new Set([1]) }) === 1,
    },
    {
      nazwa: 'P4 nieodczytane źródło ⇒ brak liczby, nie zero',
      ok: (f) => f({ sesje: [sesja(1, 'blok-0')], zrobione: null }) === null,
    },
    {
      nazwa: 'P5 sesja bez dowodu wykonania nie liczy się',
      ok: (f) => f({ sesje: [sesja(1, 'blok-0'), sesja(2, 'blok-0')], zrobione: new Set([1]) }) === 1,
    },
    {
      nazwa: 'P6 wydarzenie spoza Bloku nie liczy się',
      ok: (f) => f({ sesje: [sesja(1, 'blok-0'), sesja(77, null)], zrobione: new Set([1, 77]) }) === 1,
    },
  ];

  const oblane = (f: Licznik) => predykaty.filter((p) => !p.ok(f)).map((p) => p.nazwa);

  check('⭐ (E2-7) prawdziwa funkcja przechodzi CAŁĄ baterię (0 / 6 FAIL)',
    oblane(PRAWDZIWY).length === 0, `oblane: ${oblane(PRAWDZIWY).join(' · ')}`);

  const mutacje: [string, Licznik][] = [
    ['M1 · ⭐ wraca filtr po statusie BLOKU (dzisiejszy defekt)', M1_filtrStatusuBloku],
    ['M2 · ⭐ wraca filtr po statusie SESJI (drugi filtr, ten ukryty)', M2_filtrStatusuSesji],
    ['M3 · duplikaty liczone wielokrotnie', M3_bezOdsiewaniaDuplikatow],
    ['M4 · nieodczytane źródło liczone jak puste', M4_nieodczytaneJakPuste],
    ['M5 · praca zaliczana bez dowodu wykonania', M5_bezDowoduWykonania],
    ['M6 · wydarzenia spoza Bloków wliczane do dorobku', M6_takzeSpozaBlokow],
  ];

  for (const [nazwa, f] of mutacje) {
    const padly = oblane(f);
    check(`(E2-7) ${nazwa} — zapala baterię`,
      padly.length > 0, 'mutacja przeszła baterię — strażnik jej nie widzi');
    if (padly.length > 0) console.log(`        ↳ ${padly.length} / 6 FAIL: ${padly.join(' · ')}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
