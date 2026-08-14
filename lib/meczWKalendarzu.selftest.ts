// PLAN-D-A7 08.2026 (14.08.2026) — NOWY PLIK.
//
//   npx tsx lib/meczWKalendarzu.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ── CZEGO PILNUJE ─────────────────────────────────────────────────────
// Pięciu rzeczy, każda z nich zapala się na innym defekcie. Numeracja jest ta
// sama, co w poleceniu A7 (zadanie A7.4), żeby dało się je zestawić jeden do
// jednego:
//
//   (A7-1) rodzaj jest ZAPISYWANY, a nie RENDEROWANY;
//   (A7-2) `source` nie jest POBIERANY w zapytaniu ekranu, który go POKAZUJE;
//   (A7-3) rodzaj spoza pięciu dopuszczonych przechodzi bez stanu
//          „nie znam tego rodzaju";
//   (A7-4) mecz powstaje DWOMA torami;
//   (A7-5) godzina idzie do bazy z sekundami albo `>= 24:00`.
//
// ⚠️ ASERCJE SĄ NA REGUŁĘ, NIE NA DANE. Nigdzie niżej nie ma liczby wierszy
// w bazie ani listy istniejących wydarzeń — test „jest 24 wydarzenia" zgasłby
// przy 25 i niczego by nie pilnował. Pilnujemy kształtu decyzji i kształtu
// wywołań, bo to są rzeczy, które da się zepsuć po cichu.
//
// ⚠️ CZEGO TEN PLIK NIE UDAJE. Część asercji czyta ŹRÓDŁA EKRANÓW JAKO TEKST
// (wzorzec z `lib/ostatniCentymetr.selftest.ts`). To nie jest test — to jest
// strażnik regresji. Nie uruchamia Reacta, nie dotyka Supabase i nie wie, czy
// ekran się rysuje. Zamiana wywołania na inne, równie zepsute, przejdzie tu
// niezauważona. Dlatego każda asercja mówi wprost, co dokładnie było zepsute.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (ograniczenie O53): `tsconfig.json` ciągnie DOM,
// więc `tsc` pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RODZAJE_WYDARZEN,
  ZRODLA_WYDARZEN,
  STATUSY_WYDARZEN,
  RODZAJ_MECZ,
  RODZAJ_TRENING_KLUBOWY,
  czyZnanyRodzaj,
  opiszRodzaj,
  opisNieznanegoRodzajuDoLogu,
  opiszZrodlo,
  przygotujGodzineDoZapisu,
  zdecydujOWierszuMeczu,
  MECZ_ZAPISANY_BEZ_KALENDARZA,
  opisNieudanegoZapisuMeczuDoLogu,
  type WierszKalendarzaDoDecyzji,
} from './meczWKalendarzu';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — ten sam powód co w `ostatniCentymetr.selftest.ts`:
 * pliki tego projektu CYTUJĄ w komentarzach zepsute wywołania („do 14.08.2026
 * stało tu `|| e.event_type`"), więc strażnik czytający surowy tekst
 * zapalałby się na własnej dokumentacji, a jedynym sposobem, żeby go uciszyć,
 * byłoby skasowanie wyjaśnienia — czyli tej wiedzy, dla której powstał.
 */
const bezKomentarzy = (s: string): string => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .join('\n');

const zrodlo = (wzgledna: string): string => bezKomentarzy(readFileSync(join(root, wzgledna), 'utf8'));

const PLIK_KALENDARZ = 'app/(tabs)/kalendarz.tsx';
const PLIK_MECZ = 'app/(tabs)/mecz.tsx';
const PLIK_DZIS = 'app/(tabs)/dzis.tsx';

/** Klucze mapy etykiet rodzajów wydarzeń, wyjęte ze źródła ekranu. */
function kluczeEtykietRodzajow(kod: string): string[] {
  const m = /EVENT_TYPE_LABELS[^=]*=\s*\{([\s\S]*?)\}/.exec(kod);
  if (!m) return [];
  return Array.from(m[1].matchAll(/(\w+)\s*:/g)).map((x) => x[1]);
}

/** Lista kolumn, o które ekran prosi PostgREST dla `calendar_events`. */
function kolumnyZapytaniaKalendarza(kod: string): string | null {
  const m = /from\(\s*['"]calendar_events['"]\s*\)\s*\.select\(\s*['"]([^'"]*)['"]/.exec(kod);
  return m ? m[1] : null;
}

function pobieraKolumne(kolumny: string | null, nazwa: string): boolean {
  if (kolumny === null) return false;
  if (kolumny.trim() === '*') return true;
  return kolumny.split(',').map((c) => c.trim()).includes(nazwa);
}

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

// ═══════════════════════════════════════════════════════════════════
// 0. LISTY MUSZĄ ZGADZAĆ SIĘ Z OGRANICZENIAMI BAZY
// ═══════════════════════════════════════════════════════════════════
// Zmierzone 14.08.2026 (`pg_constraint`, projekt kqrbztsvepjtggjmmcdx) —
// pełne definicje w nagłówku `lib/meczWKalendarzu.ts`.
{
  check('(A7-0) pięć rodzajów, dokładnie te, które przepuszcza CHECK w bazie',
    RODZAJE_WYDARZEN.length === 5
    && ['club_training', 'own_training', 'micro_session', 'task', 'match']
      .every((r) => (RODZAJE_WYDARZEN as readonly string[]).includes(r)),
    JSON.stringify(RODZAJE_WYDARZEN));

  check('(A7-0) trzy źródła i trzy statusy, zgodnie z CHECK-ami',
    ZRODLA_WYDARZEN.length === 3 && STATUSY_WYDARZEN.length === 3
    && (ZRODLA_WYDARZEN as readonly string[]).includes('player')
    && (STATUSY_WYDARZEN as readonly string[]).includes('completed'),
    `${JSON.stringify(ZRODLA_WYDARZEN)} / ${JSON.stringify(STATUSY_WYDARZEN)}`);

  check('(A7-0) stałe rodzajów wskazują na wartości z listy',
    czyZnanyRodzaj(RODZAJ_MECZ) && czyZnanyRodzaj(RODZAJ_TRENING_KLUBOWY),
    `${RODZAJ_MECZ} / ${RODZAJ_TRENING_KLUBOWY}`);
}

// ═══════════════════════════════════════════════════════════════════
// (A7-1) RODZAJ ZAPISYWANY, A NIE RENDEROWANY
// ═══════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: baza dostaje nowy rodzaj (albo appka zaczyna go
// zapisywać), a ekran nie ma dla niego nazwy. Wtedy zawodnik czyta w kalendarzu
// „own_training" — surową wartość z kolumny — i wygląda to na etykietę, więc
// nikt nigdy nie zgłosi, że nazwy brakuje. Formularz w `kalendarz.tsx` UMIE
// zapisać wszystkie pięć rodzajów (Picker jest budowany z tej samej mapy),
// więc każdy z nich musi mieć też nazwę TAM, GDZIE SIĘ RYSUJE — a rysuje się
// w dwóch miejscach: w kalendarzu i na „Dziś".
{
  const kalendarz = zrodlo(PLIK_KALENDARZ);
  const dzis = zrodlo(PLIK_DZIS);

  const wKalendarzu = kluczeEtykietRodzajow(kalendarz);
  const brakujeWKalendarzu = RODZAJE_WYDARZEN.filter((r) => !wKalendarzu.includes(r));
  check('(A7-1) kalendarz ma nazwę dla KAŻDEGO z pięciu rodzajów, które umie zapisać',
    wKalendarzu.length > 0 && brakujeWKalendarzu.length === 0,
    `mapa w ${PLIK_KALENDARZ} = ${JSON.stringify(wKalendarzu)}, brakuje: ${JSON.stringify(brakujeWKalendarzu)}`);

  const wDzis = kluczeEtykietRodzajow(dzis);
  const brakujeWDzis = RODZAJE_WYDARZEN.filter((r) => !wDzis.includes(r));
  check('(A7-1) „Dziś" ma nazwę dla każdego rodzaju, bo rysuje te same wiersze',
    wDzis.length > 0 && brakujeWDzis.length === 0,
    `mapa w ${PLIK_DZIS} = ${JSON.stringify(wDzis)}, brakuje: ${JSON.stringify(brakujeWDzis)}`);

  // Ekran Mecz zapisuje do kalendarza WYŁĄCZNIE mecze. Gdyby zaczął zapisywać
  // cokolwiek innego, ta asercja to pokaże, zanim pokaże to zawodnik.
  const mecz = zrodlo(PLIK_MECZ);
  const rodzajeWpisywanePrzezMecz = Array.from(mecz.matchAll(/event_type:\s*([A-Za-z_.']+)/g)).map((m) => m[1]);
  check('(A7-1) ekran Mecz nie wpisuje do kalendarza żadnego rodzaju poza meczem',
    rodzajeWpisywanePrzezMecz.every((r) => r === 'RODZAJ_MECZ' || r === "'match'"),
    JSON.stringify(rodzajeWpisywanePrzezMecz));
}

// ═══════════════════════════════════════════════════════════════════
// (A7-2) `source` POKAZYWANY, ALE NIEPOBIERANY
// ═══════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: ekran rysuje „Ty to dodałeś" z kolumny, której jego
// zapytanie nie przynosi. PostgREST nie rzuca wtedy błędem — pole po prostu
// jest `undefined`, a `opiszZrodlo(undefined)` da „nie wiemy, skąd ta pozycja"
// KAŻDEJ pozycji. Legenda makiety przestaje cokolwiek rozróżniać, a wygląda,
// jakby działała. Reguła jest w obie strony i dlatego sprawdzamy oba ekrany:
// KTO RYSUJE, TEN MUSI POBRAĆ. Ekran, który nie rysuje, nie musi pobierać —
// i nie jest za to karany (`dzis.tsx` na 14.08 nie rysuje źródła).
{
  for (const plik of [PLIK_KALENDARZ, PLIK_DZIS]) {
    const kod = zrodlo(plik);
    const rysuje = kod.includes('opiszZrodlo(');
    const kolumny = kolumnyZapytaniaKalendarza(kod);
    check(`(A7-2) ${plik}: rysuje źródło ⇒ pobiera kolumnę \`source\``,
      !rysuje || pobieraKolumne(kolumny, 'source'),
      `rysuje=${rysuje}, kolumny w zapytaniu = ${JSON.stringify(kolumny)}`);
  }

  // To samo dla godziny: kalendarz rysuje tag „18:00", więc musi ją pobrać.
  const kalendarz = zrodlo(PLIK_KALENDARZ);
  check('(A7-2) kalendarz rysuje godzinę ⇒ pobiera kolumnę `scheduled_time`',
    !kalendarz.includes('formatujGodzine(')
    || pobieraKolumne(kolumnyZapytaniaKalendarza(kalendarz), 'scheduled_time'),
    `kolumny = ${JSON.stringify(kolumnyZapytaniaKalendarza(kalendarz))}`);

  // Typ `CalEvent` jest jedynym miejscem, w którym TypeScript może powiedzieć,
  // że ekran sięga po pole spoza zapytania. Pusty typ = wyłączona kontrola.
  check('(A7-2) typ wiersza w kalendarzu deklaruje `source` i `scheduled_time`',
    /type CalEvent = \{[\s\S]*?source:[\s\S]*?\}/.test(kalendarz)
    && /type CalEvent = \{[\s\S]*?scheduled_time:[\s\S]*?\}/.test(kalendarz),
    'typ CalEvent nie zna obu kolumn — TypeScript przestaje pilnować zapytania');

  // Odwrotność: wartość spoza trójki ma dostać JAWNE „nie wiem", a nie ładnie
  // wyglądającą nazwę. `undefined` znaczy tu „ekran nie pobrał kolumny",
  // bo w bazie `source` jest NOT NULL.
  const nieznane = opiszZrodlo(undefined);
  check('(A7-2) nieznane źródło ma jawny stan „nie wiemy", nie zgadniętą nazwę',
    nieznane.znane === false && nieznane.opis.includes('nie wiemy')
    && opiszZrodlo('player').opis !== opiszZrodlo('system').opis,
    JSON.stringify(nieznane));
}

// ═══════════════════════════════════════════════════════════════════
// (A7-3) RODZAJ SPOZA PIĄTKI PRZECHODZI BEZ STANU „NIE ZNAM"
// ═══════════════════════════════════════════════════════════════════
{
  const nieznany = opiszRodzaj('trening_na_plazy');
  check('(A7-3) rodzaj spoza piątki daje stan „nie znam", a nie zgadniętą etykietę',
    nieznany.znany === false
    && nieznany.znany === false && nieznany.komunikat.length > 0
    && nieznany.komunikat !== 'trening_na_plazy',
    JSON.stringify(nieznany));

  check('(A7-3) …i niesie surową wartość do logu, żeby dało się to naprawić',
    (opisNieznanegoRodzajuDoLogu(nieznany) ?? '').includes('trening_na_plazy')
    && opisNieznanegoRodzajuDoLogu(opiszRodzaj('match')) === null,
    String(opisNieznanegoRodzajuDoLogu(nieznany)));

  // ⚠️ DO 14.08.2026 W `kalendarz.tsx` STAŁO `EVENT_TYPE_LABELS[e.event_type]
  // || e.event_type`. Ten wzorzec jest cichą awarią: przy nieznanym rodzaju
  // pokazuje zawodnikowi wartość z kolumny bazy, udającą nazwę.
  //
  // ⚠️ ROZSZERZONE 14.08.2026 WIECZOREM — I DLACZEGO TO NIE JEST KOSMETYKA.
  // Pas A7 postawił ten strażnik WYŁĄCZNIE na `kalendarz.tsx`. Wzorzec żył
  // dalej w `dzis.tsx` — czyli reguła obowiązywała na ekranie, który zawodnik
  // otwiera rzadko, i nie obowiązywała na ekranie, który widzi po każdym
  // uruchomieniu appki. Strażnik pilnujący JEDNEGO z dwóch miejsc tego samego
  // wzorca jest gorszy niż jego brak: daje zielone światło i nazwę „domknięte".
  // Pętla niżej ma rosnąć razem z listą ekranów rysujących rodzaj wydarzenia.
  const EKRANY_Z_RODZAJEM: Array<[string, string]> = [
    ['kalendarz', PLIK_KALENDARZ],
    ['dziś', PLIK_DZIS],
  ];

  for (const [nazwa, sciezka] of EKRANY_Z_RODZAJEM) {
    const kod = zrodlo(sciezka);

    check(`(A7-3) ${nazwa} nie pokazuje surowej wartości z bazy jako nazwy rodzaju`,
      !/\|\|\s*e\.event_type/.test(kod),
      `w ${sciezka} znów jest \`|| e.event_type\` — nieznany rodzaj pokaże się jako nazwa`);

    check(`(A7-3) ${nazwa} rozstrzyga rodzaj przez \`opiszRodzaj\`, a nie po swojemu`,
      kod.includes('opiszRodzaj('),
      `${sciezka} przestał wołać wspólną regułę i zapewne ma własną kopię`);

    // ⚠️ TA ASERCJA ZAMYKA DZIURĘ W DWÓCH POWYŻSZYCH. Obie są spełnialne przez
    // USUNIĘCIE rysowania rodzaju w ogóle: bez `|| e.event_type` i bez wołania
    // `opiszRodzaj` wystarczy skasować linię z etykietą. Wtedy zawodnik nie widzi
    // rodzaju wcale, a suita jest zielona. Dlatego wymagamy TU obecności obu
    // gałęzi rozstrzygnięcia — znanej i nieznanej.
    check(`(A7-3) ${nazwa} rysuje OBIE gałęzie: etykietę znanego i komunikat nieznanego`,
      /EVENT_TYPE_LABELS\[\s*opisRodzaju\.id\s*\]/.test(kod) && /opisRodzaju\.komunikat/.test(kod),
      `${sciezka} woła \`opiszRodzaj\`, ale nie rysuje obu wyników — rodzaj mógł zniknąć z ekranu`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// (A7-4) ⭐ MECZ POWSTAJE DWOMA TORAMI
// ═══════════════════════════════════════════════════════════════════
// Najdroższy defekt tej rundy, gdyby przeszedł: zawodnik planuje sobotni mecz
// w Kalendarzu, w sobotę wieczorem opisuje go na ekranie Mecz — i ma ten sam
// mecz w kalendarzu dwa razy. Oba wiersze są poprawne z osobna, żaden zapis
// nie zwraca błędu, więc NIC tego nie zgłosi.
{
  const wspolne = { userId: 'u-1', godzina: null as string | null, tytul: 'Mecz oficjalny' };
  const zaplanowany: WierszKalendarzaDoDecyzji = {
    id: 7, event_type: 'match', status: 'scheduled',
    scheduled_date: '2026-08-15', scheduled_time: null,
  };

  const bezNiczego = zdecydujOWierszuMeczu({ ...wspolne, data: '2026-08-15', istniejace: [] });
  check('(A7-4) pusty kalendarz ⇒ zakładamy wiersz meczu (source=player, status=completed)',
    bezNiczego.rodzaj === 'utworz'
    && bezNiczego.rodzaj === 'utworz' && bezNiczego.wiersz.source === 'player'
    && bezNiczego.wiersz.event_type === 'match'
    && bezNiczego.wiersz.status === 'completed'
    && bezNiczego.wiersz.scheduled_date === '2026-08-15',
    JSON.stringify(bezNiczego));

  const zPlanem = zdecydujOWierszuMeczu({ ...wspolne, data: '2026-08-15', istniejace: [zaplanowany] });
  check('(A7-4) mecz JUŻ zaplanowany na ten dzień ⇒ DOMYKAMY go, nie zakładamy drugiego',
    zPlanem.rodzaj === 'aktualizuj' && zPlanem.rodzaj === 'aktualizuj' && zPlanem.id === 7,
    JSON.stringify(zPlanem));

  const innyDzien = zdecydujOWierszuMeczu({ ...wspolne, data: '2026-08-16', istniejace: [zaplanowany] });
  check('(A7-4) mecz w INNYM dniu to inny mecz — dopasowanie nie może być po samym rodzaju',
    innyDzien.rodzaj === 'utworz', JSON.stringify(innyDzien));

  const anulowany = zdecydujOWierszuMeczu({
    ...wspolne, data: '2026-08-15',
    istniejace: [{ ...zaplanowany, status: 'cancelled' }],
  });
  check('(A7-4) anulowany mecz nie jest tym meczem — anulowanego nie wskrzeszamy',
    anulowany.rodzaj === 'utworz', JSON.stringify(anulowany));

  const dwaPasujace = zdecydujOWierszuMeczu({
    ...wspolne, data: '2026-08-15',
    istniejace: [{ ...zaplanowany, id: 12 }, zaplanowany],
  });
  check('(A7-4) przy duplikatach bierzemy najstarszy i MÓWIMY o tym, zamiast dołożyć trzeci',
    dwaPasujace.rodzaj === 'aktualizuj'
    && dwaPasujace.rodzaj === 'aktualizuj' && dwaPasujace.id === 7
    && dwaPasujace.powod.includes('2'),
    JSON.stringify(dwaPasujace));

  const zGodzinaNaPustym = zdecydujOWierszuMeczu({
    ...wspolne, godzina: '11:00', data: '2026-08-15', istniejace: [zaplanowany],
  });
  check('(A7-4) godzina uzupełnia PUSTKĘ w zaplanowanym meczu',
    zGodzinaNaPustym.rodzaj === 'aktualizuj'
    && zGodzinaNaPustym.rodzaj === 'aktualizuj'
    && zGodzinaNaPustym.zmiany.scheduled_time === '11:00',
    JSON.stringify(zGodzinaNaPustym));

  const zGodzinaNaZajetym = zdecydujOWierszuMeczu({
    ...wspolne, godzina: '11:00', data: '2026-08-15',
    istniejace: [{ ...zaplanowany, scheduled_time: '10:00' }],
  });
  check('(A7-4) …ale NIE nadpisuje godziny, którą zawodnik podał, planując mecz',
    zGodzinaNaZajetym.rodzaj === 'aktualizuj'
    && zGodzinaNaZajetym.rodzaj === 'aktualizuj'
    && zGodzinaNaZajetym.zmiany.scheduled_time === undefined,
    JSON.stringify(zGodzinaNaZajetym));

  // Strażnik na kodzie: ekran ma tę decyzję WYKONYWAĆ, nie podejmować.
  const mecz = zrodlo(PLIK_MECZ);
  const wstawienia = Array.from(
    mecz.matchAll(/from\(\s*['"]calendar_events['"]\s*\)\s*\.insert\(\s*([A-Za-z_.]+)\s*\)/g),
  ).map((m) => m[1]);
  check('(A7-4) ekran Mecz wstawia do kalendarza dokładnie raz i wyłącznie wiersz z decyzji',
    mecz.includes('zdecydujOWierszuMeczu(')
    && wstawienia.length === 1 && wstawienia[0] === 'decyzja.wiersz',
    `wywołania insert: ${JSON.stringify(wstawienia)}`);

  check('(A7-4) …i nie wstawia niczego, zanim sprawdzi, co już jest w kalendarzu',
    mecz.indexOf('.select(\'id,event_type,status,scheduled_date,scheduled_time\')')
      < mecz.indexOf('.insert(decyzja.wiersz)'),
    'zapis stoi przed odczytem — przy nieudanym odczycie powstałby duplikat');

  check('(A7-4) porażka zapisu do kalendarza ma zdanie dla zawodnika i powód do logu',
    MECZ_ZAPISANY_BEZ_KALENDARZA.includes('Mecz zapisany')
    && opisNieudanegoZapisuMeczuDoLogu('utworz', 'RLS').includes('RLS')
    && mecz.includes('MECZ_ZAPISANY_BEZ_KALENDARZA'),
    'brak jawnego stanu porażki — to jest „cichy brak", nie awaria');
}

// ═══════════════════════════════════════════════════════════════════
// (A7-5) GODZINA Z SEKUNDAMI ALBO `>= 24:00`
// ═══════════════════════════════════════════════════════════════════
// `chk_calendar_events_scheduled_time` odrzuca jedno i drugie kodem `23514`.
// Bez tej bramki zawodnik dostaje surowy błąd bazy po wypełnieniu formularza.
{
  const zSekundami = przygotujGodzineDoZapisu('17:30:45');
  check('(A7-5) godzina z sekundami NIE idzie do bazy (CHECK odrzuci ją kodem 23514)',
    zSekundami.zapisz === false, JSON.stringify(zSekundami));

  const polnocDoby = przygotujGodzineDoZapisu('24:00');
  check('(A7-5) `24:00` nie przechodzi, mimo że PostgreSQL zna taki `time`',
    polnocDoby.zapisz === false, JSON.stringify(polnocDoby));

  check('(A7-5) `25:00` i `8:70` nie przechodzą',
    przygotujGodzineDoZapisu('25:00').zapisz === false
    && przygotujGodzineDoZapisu('8:70').zapisz === false,
    'walidacja zakresu przestała działać');

  const pusto = przygotujGodzineDoZapisu('');
  const spacje = przygotujGodzineDoZapisu('   ');
  const brak = przygotujGodzineDoZapisu(null);
  check('(A7-5) BRAK godziny to nie błąd — to `null`, i tak ma zostać',
    pusto.zapisz === true && pusto.zapisz === true && pusto.wartosc === null
    && spacje.zapisz === true && spacje.zapisz === true && spacje.wartosc === null
    && brak.zapisz === true && brak.zapisz === true && brak.wartosc === null,
    `${JSON.stringify(pusto)} / ${JSON.stringify(spacje)} / ${JSON.stringify(brak)}`);

  const jednocyfrowa = przygotujGodzineDoZapisu('8:00');
  check('(A7-5) `8:00` przechodzi i normalizuje się do `08:00` (jeden zapis jednej godziny)',
    jednocyfrowa.zapisz === true && jednocyfrowa.zapisz === true && jednocyfrowa.wartosc === '08:00',
    JSON.stringify(jednocyfrowa));

  // ⚠️ KOLEJNOŚĆ: najpierw pustka, potem format. Odwrotna kolejność zamienia
  // „25:00" w „nie podano godziny" i zapisuje po cichu decyzję, której
  // zawodnik nie podjął. Ten sam błąd złapał u siebie pas A2+A3 (mutacja M7).
  check('(A7-5) błędna godzina NIE zamienia się po cichu w „nie podano"',
    przygotujGodzineDoZapisu('25:00').zapisz === false
    && przygotujGodzineDoZapisu('').zapisz === true,
    'zła godzina jest połykana jako brak godziny');

  // Strażnik na kodzie: oba ekrany, które piszą godzinę, mają iść tą bramką.
  for (const plik of [PLIK_KALENDARZ, PLIK_MECZ]) {
    const kod = zrodlo(plik);
    check(`(A7-5) ${plik}: godzina idzie przez \`przygotujGodzineDoZapisu\`, nie surowym stanem`,
      kod.includes('przygotujGodzineDoZapisu(')
      && !/scheduled_time\s*[:=]\s*(godzina|godzinaMeczu)\b/.test(kod),
      'ekran buduje `scheduled_time` z pola formularza z pominięciem bramki');
  }
}

// ═══════════════════════════════════════════════════════════════════
// STRAŻNIK STRAŻNIKA
// ═══════════════════════════════════════════════════════════════════
// Wszystkie asercje na tekście czytają pliki z dysku. Gdyby ścieżka się
// rozjechała, `readFileSync` rzuci — ale gdyby plik istniał i nie zawierał już
// badanej logiki, część asercji przechodziłaby, nie sprawdzając niczego.
{
  const kalendarz = zrodlo(PLIK_KALENDARZ);
  const mecz = zrodlo(PLIK_MECZ);
  const dzis = zrodlo(PLIK_DZIS);
  check('pliki, które ten strażnik czyta, naprawdę zawierają badaną logikę',
    kalendarz.includes("from('calendar_events')") && kalendarz.includes('EVENT_TYPE_LABELS')
    && mecz.includes("from('match_contexts')") && mecz.includes("from('calendar_events')")
    && dzis.includes('EVENT_TYPE_LABELS'),
    `kalendarz=${kalendarz.length}B mecz=${mecz.length}B dzis=${dzis.length}B`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
