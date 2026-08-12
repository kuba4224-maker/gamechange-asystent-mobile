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
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
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
