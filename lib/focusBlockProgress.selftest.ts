// JEDNA DROGA B2 08.08.2026 — weryfikacja wskaźnika pracy w hero Celu
// (lib/focusBlockProgress.ts). Czysta logika, bez Supabase/RN, uruchamiana
// lokalnie poza appką:
//
//   npx tsx lib/focusBlockProgress.selftest.ts
//
// (jeśli brak `tsx` w projekcie: `npm install --no-save tsx`, potem to samo
// polecenie). Ten sam wzorzec co lib/goal-prominence.selftest.ts.
// Uruchom ponownie po każdej zmianie w lib/focusBlockProgress.ts.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeFocusBlockProgress,
  computeFocusBlockProgressState,
  NIE_WIEM_TYTUL, NIE_WIEM_POWOD, NIE_WIEM_RZECZ_DO_ZROBIENIA, NIE_WIEM_EKRAN_WYJSCIA,
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

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
