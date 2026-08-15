// PLAN-D-D1 08.2026 (14.08.2026) — STRAŻNIK „TEJ SESJI NIE ODBYŁEM".
//
//   npx tsx lib/wykonanieSesji.selftest.ts
//
// (albo `node tests/run-selftests.mjs`, który odkrywa ten plik sam — runner
// czyta katalog `lib/`, więc nie ma listy, do której trzeba by dopisać ten plik.)
//
// ⛔ ZAKAZ `new URL(...)` — O53, TS2769.
//
// ═══════════════════════════════════════════════════════════════════════════
// PIĘĆ GRUP ASERCJI — I DLACZEGO PIĄTA ISTNIEJE
//
//   (1) cztery stany są CZTEREMA RÓŻNYMI wartościami, nie dwiema pod czterema
//       nazwami,
//   (2) ⭐ `brak_wpisu` NIE ZAMIENIA SIĘ w `nie_odbylo_sie` przy ŻADNYM upływie
//       czasu — asercja na zasadę Z0,
//   (3) licznik nie liczy „bez wpisu" ani do licznika, ani do mianownika,
//   (4) werdykt dotyczy WYSTĄPIENIA — dwa różne wtorki tej samej reguły mają
//       niezależne stany,
//   (5) ⭐ KOMPLET DANYCH → wynik MUSI być `odbylo_sie` i `nie_odbylo_sie`.
//
// Grupy 1–4 są w całości spełnialne przez funkcję, która ZAWSZE oddaje
// `brak_wpisu`: nic się wtedy nie zamienia w oskarżenie, licznik niczego nie
// liczy, a dwa wtorki mają identyczny — czyli „niezależny" — stan. Suita byłaby
// zielona, a produkt nadal nie umiałby zapisać ani jednej odbytej sesji.
// Grupa (5) podaje dane, przy których obie odpowiedzi MUSZĄ paść, i sprawdza,
// że padają. To jest ta sama dziura, którą pas C1 zamknął grupą 6, a pas B3
// grupą „komplet danych → sześć wglądów z sześciu".
//
// (6) to grupa ponad wymagane pięć: asercje na ŹRÓDŁO ekranu i na plik
// migracji. Reguła, która żyje wyłącznie w `lib/`, nie jest obietnicą spełnioną
// — obietnica jest spełniona wtedy, gdy ekran ją rysuje (O58).
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  rozstrzygnijWykonanie,
  policzWykonanaPrace,
  akcjaDlaWystapienia,
  czytajWerdykty,
  werdyktDlaWystapienia,
  kluczWystapienia,
  przesunDate,
  opisLicznikaDoLogu,
  PLAKIETKI_WYKONANIA,
  AKCJA_NIE_ODBYLEM,
  AKCJA_COFNIJ,
  KODY_BRAKU_TABELI,
  WERDYKTY_NIEPODANE,
  ZASADY_PRAWDZIWE,
  type StanWykonania,
  type Werdykt,
  type WejscieWerdyktow,
  type ZasadyWykonania,
  type WystapienieDoLicznika,
} from './wykonanieSesji';
import { zbudujTydzien, type WierszWydarzenia } from './widokTygodnia';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

let passed = 0;
let failed = 0;
function check(nazwa: string, warunek: boolean, szczegol = ''): void {
  if (warunek) { passed += 1; console.log(`OK   - ${nazwa}`); }
  else { failed += 1; console.log(`FAIL - ${nazwa}${szczegol ? ': ' + szczegol : ''}`); }
}

// ── Pomoce budujące wejścia ──────────────────────────────────────────
const DZIS = '2026-08-14';

function jest(...w: Werdykt[]): WejscieWerdyktow {
  return { rodzaj: 'jest', werdykty: w };
}
const BRAK: WejscieWerdyktow = { rodzaj: 'brak', powod: 'test: tabeli nie ma' };
const NIEODCZYTANE: WejscieWerdyktow = { rodzaj: 'nie_odczytano', powod: 'test: odczyt padł' };

function w(
  idWydarzenia: number,
  dzien: string,
  werdykt: 'odbylo_sie' | 'nie_odbylo_sie',
  wycofany = false,
): Werdykt {
  return { idWydarzenia, dzien, werdykt, wycofany };
}

function stan(
  nad: Partial<Parameters<typeof rozstrzygnijWykonanie>[0]>,
  zasady: ZasadyWykonania = ZASADY_PRAWDZIWE,
): StanWykonania | null {
  return rozstrzygnijWykonanie({
    idWydarzenia: 1,
    dzien: '2026-08-11',
    przeszle: true,
    status: 'scheduled',
    zRegulyCyklicznej: false,
    wpisyDziennika: new Set<number>(),
    werdykty: BRAK,
    ...nad,
  }, zasady);
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPA 1 — CZTERY STANY SĄ CZTEREMA RÓŻNYMI WARTOŚCIAMI
// ═══════════════════════════════════════════════════════════════════════════
function grupa1(zasady: ZasadyWykonania): void {
  console.log('\n1. CZTERY STANY, NIE DWA POD CZTEREMA NAZWAMI');

  const odbyte = stan({ wpisyDziennika: new Set([1]) }, zasady);
  const nieodbyte = stan({ status: 'cancelled' }, zasady);
  const bez = stan({}, zasady);
  const nieodczytane = stan({ wpisyDziennika: null }, zasady);

  check('stan 1/4 — „odbyło się" (wpis w dzienniku wskazuje tę pozycję)',
    odbyte === 'odbylo_sie', String(odbyte));
  check('stan 2/4 — „nie odbyło się" (pozycja odwołana)',
    nieodbyte === 'nie_odbylo_sie', String(nieodbyte));
  check('stan 3/4 — „brak wpisu"',
    bez === 'brak_wpisu', String(bez));
  check('⛔ stan 4/4 — NIEUDANY ODCZYT dziennika ≠ „brak wpisu"',
    nieodczytane === 'nie_odczytano', String(nieodczytane));

  const wszystkie = [odbyte, nieodbyte, bez, nieodczytane];
  check('⭐ cztery stany są CZTEREMA RÓŻNYMI wartościami',
    new Set(wszystkie).size === 4, JSON.stringify(wszystkie));

  check('wystąpienie przed nami nie ma stanu (nie ma o czym orzekać)',
    stan({ przeszle: false }, zasady) === null, String(stan({ przeszle: false }, zasady)));

  check('każdy z czterech stanów ma własną plakietkę, żadne dwie nie są tym samym napisem',
    new Set(Object.values(PLAKIETKI_WYKONANIA)).size === 4,
    JSON.stringify(PLAKIETKI_WYKONANIA));
  check('⛔ w plakietkach nie ma „Nie wykonano" — to było oskarżenie z braku danych',
    !Object.values(PLAKIETKI_WYKONANIA).includes('Nie wykonano'),
    JSON.stringify(PLAKIETKI_WYKONANIA));

  // ⚠️ Nieodczytane WERDYKTY też muszą być rozróżnialne od „sprawdziłem i nic
  // nie ma" — inaczej awaria odczytu werdyktów mówi „bez wpisu", czyli twierdzi,
  // że sprawdziliśmy.
  check('⛔ nieudany odczyt WERDYKTÓW przy braku innych dowodów ≠ „brak wpisu"',
    stan({ werdykty: NIEODCZYTANE }, zasady) === 'nie_odczytano',
    String(stan({ werdykty: NIEODCZYTANE }, zasady)));
  check('…ale BRAK TABELI werdyktów to wiedza, nie niewiedza — zostaje „brak wpisu"',
    stan({ werdykty: BRAK }, zasady) === 'brak_wpisu',
    String(stan({ werdykty: BRAK }, zasady)));
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPA 2 — ⭐ ASERCJA NA Z0: UPŁYW CZASU NICZEGO NIE ZMIENIA
// ═══════════════════════════════════════════════════════════════════════════
function grupa2(zasady: ZasadyWykonania): void {
  console.log('\n2. ⭐ „BRAK WPISU" NIE STAJE SIĘ „NIE ODBYŁO SIĘ" Z UPŁYWEM CZASU (Z0)');

  const dni = ['2026-08-13', '2026-08-01', '2026-07-14', '2026-02-14', '2025-08-14', '2019-01-01'];
  const wyniki = dni.map((d) => stan({ dzien: d }, zasady));

  check('⛔ dzień sprzed roku NADAL jest „brak wpisu", nie „nie odbyło się"',
    stan({ dzien: '2025-08-14' }, zasady) === 'brak_wpisu',
    String(stan({ dzien: '2025-08-14' }, zasady)));
  check('⛔ dzień sprzed siedmiu lat — to samo',
    stan({ dzien: '2019-01-01' }, zasady) === 'brak_wpisu',
    String(stan({ dzien: '2019-01-01' }, zasady)));
  check('⭐ SZEŚĆ różnych dat wstecz daje DOKŁADNIE JEDEN stan — czas nie jest wejściem reguły',
    new Set(wyniki).size === 1 && wyniki[0] === 'brak_wpisu', JSON.stringify(wyniki));

  // Ta sama asercja od strony ŹRÓDŁA: reguła, która nie ma w sobie ani jednego
  // porównania dat, nie może się zepsuć przez pomyłkę w progu.
  const zrodlo = readFileSync(join(root, 'lib', 'wykonanieSesji.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const cialoReguly = zrodlo.slice(
    zrodlo.indexOf('export function rozstrzygnijWykonanie'),
    zrodlo.indexOf('export type AkcjaWystapienia'),
  );
  check('⛔ ciało reguły NIE ZAWIERA ani jednego porównania dat ani odejmowania dni',
    !/(Date\.|getTime|86400000|dniTemu|ileDni|<\s*we\.dzis|>\s*we\.dzis)/.test(cialoReguly),
    'w regule pojawiła się arytmetyka czasu — to jest droga do „minęła data, więc nie odbył"');
  check('⛔ reguła nie czyta zegara (`new Date()` / `Date.now()`) w całym pliku poza przesunDate',
    (zrodlo.match(/new Date\(/g) || []).length <= 1,
    'reguła, która sama patrzy na zegar, nie da się sprawdzić dla konkretnego dnia');
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPA 3 — LICZNIK NIE LICZY „BEZ WPISU"
// ═══════════════════════════════════════════════════════════════════════════
function grupa3(zasady: ZasadyWykonania): void {
  console.log('\n3. ⛔ „BEZ WPISU" NIE WCHODZI ANI DO LICZNIKA, ANI DO MIANOWNIKA');

  const wystapienia: WystapienieDoLicznika[] = [
    { idWydarzenia: 1, dzien: '2026-08-12', status: 'scheduled', zRegulyCyklicznej: false },
    { idWydarzenia: 2, dzien: '2026-08-11', status: 'scheduled', zRegulyCyklicznej: false },
    { idWydarzenia: 3, dzien: '2026-08-10', status: 'cancelled', zRegulyCyklicznej: false },
    { idWydarzenia: 4, dzien: '2026-08-09', status: 'scheduled', zRegulyCyklicznej: false },
    { idWydarzenia: 5, dzien: '2026-08-08', status: 'scheduled', zRegulyCyklicznej: false },
  ];
  const l = policzWykonanaPrace({
    dzis: DZIS,
    oknoDni: 14,
    wystapienia,
    wpisyDziennika: new Set([1, 2]),
    werdykty: jest(w(4, '2026-08-09', 'nie_odbylo_sie')),
  }, zasady);

  check('licznik się policzył', l.rodzaj === 'policzony', JSON.stringify(l));
  if (l.rodzaj === 'policzony') {
    check('odbyte = 2 (dwa wpisy w dzienniku)', l.odbyte === 2, String(l.odbyte));
    check('nieodbyte = 2 (jedno odwołanie + jeden werdykt zawodnika)',
      l.nieodbyte === 2, String(l.nieodbyte));
    check('bez wpisu = 1 (piąte wystąpienie)', l.bezWpisu === 1, String(l.bezWpisu));
    check('⭐ MIANOWNIK = 4, a NIE 5 — „bez wpisu" jest poza nim',
      l.mianownik === 4, String(l.mianownik));
    check('⭐ licznik + mianownik nie zawiera „bez wpisu" ani „nieodczytanych"',
      l.mianownik === l.odbyte + l.nieodbyte, `${l.odbyte}+${l.nieodbyte}≠${l.mianownik}`);
    check('zdanie do logu podaje wszystkie trzy liczby, nie tylko dwie',
      /2 z 4/.test(opisLicznikaDoLogu(l)) && /bez wpisu 1/.test(opisLicznikaDoLogu(l)),
      opisLicznikaDoLogu(l));
  }

  // ⛔ Rzecz, dla której ta grupa istnieje: licznik NIE MALEJE, gdy zawodnik
  // pracuje i nie zapisuje. Dokładamy trzy wystąpienia bez wpisu i sprawdzamy,
  // że NIC się nie zmieniło.
  const zDokladką = policzWykonanaPrace({
    dzis: DZIS,
    oknoDni: 14,
    wystapienia: [
      ...wystapienia,
      { idWydarzenia: 6, dzien: '2026-08-07', status: 'scheduled', zRegulyCyklicznej: false },
      { idWydarzenia: 7, dzien: '2026-08-06', status: 'scheduled', zRegulyCyklicznej: false },
      { idWydarzenia: 8, dzien: '2026-08-05', status: 'scheduled', zRegulyCyklicznej: false },
    ],
    wpisyDziennika: new Set([1, 2]),
    werdykty: jest(w(4, '2026-08-09', 'nie_odbylo_sie')),
  }, zasady);
  check('⭐ TRZY sesje bez wpisu NIE ZMIENIAJĄ licznika ani mianownika',
    zDokladką.rodzaj === 'policzony' && l.rodzaj === 'policzony'
      && zDokladką.odbyte === l.odbyte && zDokladką.mianownik === l.mianownik,
    JSON.stringify(zDokladką));

  const samBrak = policzWykonanaPrace({
    dzis: DZIS,
    oknoDni: 14,
    wystapienia: [
      { idWydarzenia: 9, dzien: '2026-08-12', status: 'scheduled', zRegulyCyklicznej: false },
      { idWydarzenia: 10, dzien: '2026-08-11', status: 'scheduled', zRegulyCyklicznej: false },
    ],
    wpisyDziennika: new Set<number>(),
    werdykty: BRAK,
  }, zasady);
  check('⛔ same „bez wpisu" → BRAK PODSTAWY, a nie „0 z 2"',
    samBrak.rodzaj === 'brak_podstawy', JSON.stringify(samBrak));
  check('⛔ przy braku podstawy NIE MA pola, z którego dałoby się narysować „0 z 0"',
    !('odbyte' in samBrak) && !('mianownik' in samBrak), JSON.stringify(samBrak));

  check('⛔ nieodczytane wydarzenia to BRAK PODSTAWY, nie zero pracy',
    policzWykonanaPrace({
      dzis: DZIS, oknoDni: 14, wystapienia: null,
      wpisyDziennika: new Set<number>(), werdykty: BRAK,
    }, zasady).rodzaj === 'brak_podstawy');

  check('okno odcina to, co starsze — wystąpienie sprzed 20 dni nie wchodzi do 14-dniowego okna',
    policzWykonanaPrace({
      dzis: DZIS,
      oknoDni: 14,
      wystapienia: [{ idWydarzenia: 11, dzien: '2026-07-25', status: 'scheduled', zRegulyCyklicznej: false }],
      wpisyDziennika: new Set([11]),
      werdykty: BRAK,
    }, zasady).rodzaj === 'brak_podstawy');
  check('…a wystąpienie DZISIEJSZE wchodzi (sesję z dziś można już dziś odbyć)',
    policzWykonanaPrace({
      dzis: DZIS,
      oknoDni: 14,
      wystapienia: [{ idWydarzenia: 12, dzien: DZIS, status: 'scheduled', zRegulyCyklicznej: false }],
      wpisyDziennika: new Set([12]),
      werdykty: BRAK,
    }, zasady).rodzaj === 'policzony');
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPA 4 — WERDYKT DOTYCZY WYSTĄPIENIA, NIE WIERSZA
// ═══════════════════════════════════════════════════════════════════════════
function grupa4(zasady: ZasadyWykonania): void {
  console.log('\n4. ⭐ WERDYKT DOTYCZY WYSTĄPIENIA — DWA WTORKI TEJ SAMEJ REGUŁY SĄ NIEZALEŻNE');

  const werdykty = jest(
    w(77, '2026-08-04', 'odbylo_sie'),
    w(77, '2026-08-11', 'nie_odbylo_sie'),
  );
  const pierwszy = stan({ idWydarzenia: 77, dzien: '2026-08-04', zRegulyCyklicznej: true, werdykty }, zasady);
  const drugi = stan({ idWydarzenia: 77, dzien: '2026-08-11', zRegulyCyklicznej: true, werdykty }, zasady);
  const trzeci = stan({ idWydarzenia: 77, dzien: '2026-07-28', zRegulyCyklicznej: true, werdykty }, zasady);

  check('⭐ pierwszy wtorek: „odbyło się"', pierwszy === 'odbylo_sie', String(pierwszy));
  check('⭐ drugi wtorek: „nie odbyło się"', drugi === 'nie_odbylo_sie', String(drugi));
  check('⭐ DWA WTORKI TEGO SAMEGO WIERSZA MAJĄ RÓŻNE STANY',
    pierwszy !== drugi, `${pierwszy} / ${drugi}`);
  check('trzeci wtorek, bez werdyktu, zostaje „bez wpisu" — werdykt nie rozlewa się na inne dni',
    trzeci === 'brak_wpisu', String(trzeci));

  check('⛔ wpis w dzienniku wskazujący WIERSZ reguły NIE zalicza żadnego wtorku',
    stan({ idWydarzenia: 77, dzien: '2026-07-28', zRegulyCyklicznej: true,
      wpisyDziennika: new Set([77]), werdykty: BRAK }, zasady) === 'brak_wpisu',
    String(stan({ idWydarzenia: 77, dzien: '2026-07-28', zRegulyCyklicznej: true,
      wpisyDziennika: new Set([77]), werdykty: BRAK }, zasady)));

  check('klucz wystąpienia to PARA (id, dzień), a nie samo id',
    kluczWystapienia(77, '2026-08-04') !== kluczWystapienia(77, '2026-08-11'),
    kluczWystapienia(77, '2026-08-04'));

  check('werdykt WYCOFANY nie obowiązuje — wystąpienie wraca do „brak wpisu"',
    stan({ idWydarzenia: 5, dzien: '2026-08-11',
      werdykty: jest(w(5, '2026-08-11', 'nie_odbylo_sie', true)) }, zasady) === 'brak_wpisu',
    String(stan({ idWydarzenia: 5, dzien: '2026-08-11',
      werdykty: jest(w(5, '2026-08-11', 'nie_odbylo_sie', true)) }, zasady)));
  check('…i `werdyktDlaWystapienia` też go nie oddaje',
    werdyktDlaWystapienia(jest(w(5, '2026-08-11', 'nie_odbylo_sie', true)), 5, '2026-08-11') === null);

  check('⭐ werdykt zawodnika przebija znacznik `completed` postawiony na wierszu',
    stan({ idWydarzenia: 5, dzien: '2026-08-11', status: 'completed',
      werdykty: jest(w(5, '2026-08-11', 'nie_odbylo_sie')) }, zasady) === 'nie_odbylo_sie',
    String(stan({ idWydarzenia: 5, dzien: '2026-08-11', status: 'completed',
      werdykty: jest(w(5, '2026-08-11', 'nie_odbylo_sie')) }, zasady)));

  // ── AKCJA: jedna, odwracalna, i widać, że jest ────────────────────
  const bezWerdyktu = akcjaDlaWystapienia({
    idWydarzenia: 5, dzien: '2026-08-11', przeszle: true, status: 'scheduled',
    zRegulyCyklicznej: false, wpisyDziennika: new Set<number>(), werdykty: jest(),
  });
  const zWerdyktem = akcjaDlaWystapienia({
    idWydarzenia: 5, dzien: '2026-08-11', przeszle: true, status: 'scheduled',
    zRegulyCyklicznej: false, wpisyDziennika: new Set<number>(),
    werdykty: jest(w(5, '2026-08-11', 'nie_odbylo_sie')),
  });
  check('bez werdyktu akcją jest „Nie odbyłem"',
    bezWerdyktu.rodzaj === 'oznacz' && bezWerdyktu.etykieta === AKCJA_NIE_ODBYLEM,
    JSON.stringify(bezWerdyktu));
  check('⭐ po werdykcie akcją jest „Cofnij" — akcja jest ODWRACALNA i widać, że jest',
    zWerdyktem.rodzaj === 'cofnij' && zWerdyktem.etykieta === AKCJA_COFNIJ,
    JSON.stringify(zWerdyktem));
  check('⛔ etykieta akcji („Nie odbyłem") NIE jest tym samym napisem, co plakietka stanu',
    AKCJA_NIE_ODBYLEM !== PLAKIETKI_WYKONANIA.nie_odbylo_sie,
    `${AKCJA_NIE_ODBYLEM} / ${PLAKIETKI_WYKONANIA.nie_odbylo_sie}`);
  check('⛔ bez tabeli werdyktów NIE MA przycisku — nie ma gdzie zapisać',
    akcjaDlaWystapienia({
      idWydarzenia: 5, dzien: '2026-08-11', przeszle: true, status: 'scheduled',
      zRegulyCyklicznej: false, wpisyDziennika: new Set<number>(), werdykty: BRAK,
    }).rodzaj === 'brak');
  check('⛔ nad przyszłym wystąpieniem NIE MA akcji',
    akcjaDlaWystapienia({
      idWydarzenia: 5, dzien: '2026-08-20', przeszle: false, status: 'scheduled',
      zRegulyCyklicznej: false, wpisyDziennika: new Set<number>(), werdykty: jest(),
    }).rodzaj === 'brak');
  check('⛔ nad pozycją ODWOŁANĄ nie ma akcji — to nie jest werdykt zawodnika',
    akcjaDlaWystapienia({
      idWydarzenia: 5, dzien: '2026-08-11', przeszle: true, status: 'cancelled',
      zRegulyCyklicznej: false, wpisyDziennika: new Set<number>(), werdykty: jest(),
    }).rodzaj === 'brak');
  check('⛔ nad pozycją z dowodem „Zrobione" nie ma akcji — dowód już jest',
    akcjaDlaWystapienia({
      idWydarzenia: 5, dzien: '2026-08-11', przeszle: true, status: 'scheduled',
      zRegulyCyklicznej: false, wpisyDziennika: new Set([5]), werdykty: jest(),
    }).rodzaj === 'brak');
  check('⛔ nad pozycją „Nie wiemy" (padł odczyt dziennika) nie ma akcji',
    akcjaDlaWystapienia({
      idWydarzenia: 5, dzien: '2026-08-11', przeszle: true, status: 'scheduled',
      zRegulyCyklicznej: false, wpisyDziennika: null, werdykty: jest(),
    }).rodzaj === 'brak');
  check('⭐ …a nad „Bez wpisu" akcja JEST — dokładnie tam, gdzie jest dziura',
    akcjaDlaWystapienia({
      idWydarzenia: 5, dzien: '2026-08-11', przeszle: true, status: 'scheduled',
      zRegulyCyklicznej: false, wpisyDziennika: new Set<number>(), werdykty: jest(),
    }).rodzaj === 'oznacz');

  // ── ODCZYT: brak tabeli ≠ nieudany odczyt ─────────────────────────
  check('⛔ „tabeli nie ma" (42P01) → `brak`, czyli WIEDZA, nie niewiedza',
    czytajWerdykty({ dane: null, blad: { code: '42P01', message: 'relation does not exist' } }).rodzaj === 'brak');
  check('⛔ „tabeli nie ma" (PGRST205, po polsku PostgRESTa) → też `brak`',
    czytajWerdykty({ dane: null, blad: { code: 'PGRST205', message: "Could not find the table 'public.session_verdicts'" } }).rodzaj === 'brak');
  check('⛔ KAŻDY INNY błąd → `nie_odczytano`',
    czytajWerdykty({ dane: null, blad: { code: '42501', message: 'RLS' } }).rodzaj === 'nie_odczytano');
  check('oba kody braku tabeli są nazwane w jednym miejscu, nie wpisane w warunek',
    KODY_BRAKU_TABELI.length === 2 && KODY_BRAKU_TABELI.includes('42P01'),
    JSON.stringify(KODY_BRAKU_TABELI));
  check('pusta odpowiedź bez błędu to `jest` z zerem werdyktów — sprawdziłem i nic nie ma',
    czytajWerdykty({ dane: [], blad: null }).rodzaj === 'jest');
  check('⛔ wiersz o nieznanej wartości werdyktu jest POMIJANY, a nie zamieniany w werdykt',
    (() => {
      const r = czytajWerdykty({ dane: [
        { calendar_event_id: 1, occurred_on: '2026-08-11', verdict: 'missed', withdrawn_at: null },
        { calendar_event_id: 2, occurred_on: '2026-08-11', verdict: 'odbylo_sie', withdrawn_at: null },
      ], blad: null });
      return r.rodzaj === 'jest' && r.werdykty.length === 1 && r.werdykty[0].idWydarzenia === 2;
    })());
  check('`withdrawn_at` z bazy przekłada się na `wycofany`',
    (() => {
      const r = czytajWerdykty({ dane: [
        { calendar_event_id: 3, occurred_on: '2026-08-11', verdict: 'odbylo_sie', withdrawn_at: '2026-08-14T10:00:00Z' },
      ], blad: null });
      return r.rodzaj === 'jest' && r.werdykty[0].wycofany === true;
    })());
  check('⛔ `WERDYKTY_NIEPODANE` niesie POWÓD — wejście bez powodu wraca za miesiąc jako zagadka',
    WERDYKTY_NIEPODANE.rodzaj === 'brak' && WERDYKTY_NIEPODANE.powod.length > 20);

  check('`przesunDate` nie udaje, że umie policzyć z bzdury',
    przesunDate('nie data', -13) === null && przesunDate('2026-08-14', -13) === '2026-08-01',
    String(przesunDate('2026-08-14', -13)));
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPA 5 — ⭐ KOMPLET DANYCH → OBIE ODPOWIEDZI MUSZĄ PAŚĆ
// ═══════════════════════════════════════════════════════════════════════════
//
// Cztery poprzednie grupy przechodzą w całości funkcja, która ZAWSZE oddaje
// `brak_wpisu`. Ta grupa podaje komplet danych, przy którym `odbylo_sie`
// i `nie_odbylo_sie` MUSZĄ się pojawić — i sprawdza, że się pojawiają.
function grupa5(zasady: ZasadyWykonania): void {
  console.log('\n5. ⭐ KOMPLET DANYCH → WYNIK MUSI BYĆ „ODBYŁO SIĘ" I „NIE ODBYŁO SIĘ"');

  const werdykty = jest(
    w(31, '2026-08-11', 'nie_odbylo_sie'),
    w(32, '2026-08-12', 'odbylo_sie'),
  );

  const zWerdyktuNie = stan({ idWydarzenia: 31, dzien: '2026-08-11', werdykty }, zasady);
  const zWerdyktuTak = stan({ idWydarzenia: 32, dzien: '2026-08-12', werdykty }, zasady);
  const zDziennika = stan({ idWydarzenia: 40, dzien: '2026-08-10', wpisyDziennika: new Set([40]) }, zasady);
  const zeZnacznika = stan({ idWydarzenia: 41, dzien: '2026-08-10', status: 'completed' }, zasady);
  const zOdwolania = stan({ idWydarzenia: 42, dzien: '2026-08-10', status: 'cancelled' }, zasady);

  check('⭐ werdykt „nie odbyłem" DAJE `nie_odbylo_sie`',
    zWerdyktuNie === 'nie_odbylo_sie', String(zWerdyktuNie));
  check('⭐ werdykt „odbyłem" DAJE `odbylo_sie`',
    zWerdyktuTak === 'odbylo_sie', String(zWerdyktuTak));
  check('⭐ wpis w dzienniku DAJE `odbylo_sie`', zDziennika === 'odbylo_sie', String(zDziennika));
  check('⭐ znacznik `completed` DAJE `odbylo_sie`', zeZnacznika === 'odbylo_sie', String(zeZnacznika));
  check('⭐ odwołanie DAJE `nie_odbylo_sie`', zOdwolania === 'nie_odbylo_sie', String(zOdwolania));
  check('⭐ przy komplecie danych ŻADEN z pięciu wyników nie jest `brak_wpisu`',
    ![zWerdyktuNie, zWerdyktuTak, zDziennika, zeZnacznika, zOdwolania].includes('brak_wpisu'),
    JSON.stringify([zWerdyktuNie, zWerdyktuTak, zDziennika, zeZnacznika, zOdwolania]));

  const l = policzWykonanaPrace({
    dzis: DZIS,
    oknoDni: 14,
    wystapienia: [
      { idWydarzenia: 31, dzien: '2026-08-11', status: 'scheduled', zRegulyCyklicznej: false },
      { idWydarzenia: 32, dzien: '2026-08-12', status: 'scheduled', zRegulyCyklicznej: false },
      { idWydarzenia: 40, dzien: '2026-08-10', status: 'scheduled', zRegulyCyklicznej: false },
    ],
    wpisyDziennika: new Set([40]),
    werdykty,
  }, zasady);
  check('⭐ LICZNIK PRZY KOMPLECIE DANYCH MÓWI „2 z 3", a nie „brak podstawy"',
    l.rodzaj === 'policzony' && l.odbyte === 2 && l.mianownik === 3, JSON.stringify(l));

  // ⭐ To samo przez cały widok tygodnia — reguła ma dojść do POZYCJI NA EKRANIE,
  // a nie tylko dać się zawołać osobno (O58).
  const wydarzenia: WierszWydarzenia[] = [
    { id: 31, title: 'Sesja Bloku', event_type: 'micro_session', status: 'scheduled',
      scheduled_date: '2026-08-11', scheduled_time: null, recurrence_rule: null, source: 'system' },
    { id: 40, title: 'Trening klubowy', event_type: 'club_training', status: 'scheduled',
      scheduled_date: '2026-08-10', scheduled_time: null, recurrence_rule: null, source: 'player' },
  ];
  const t = zbudujTydzien({
    poniedzialek: '2026-08-10',
    dzisiaj: DZIS,
    wydarzenia,
    planLekcji: null,
    wpisyDziennika: new Set([40]),
    werdykty,
  });
  const poniedzialkowa = t.dni[0].pozycje[0];
  const wtorkowa = t.dni[1].pozycje[0];
  check('⭐ tydzień NIESIE stan z werdyktu do pozycji dnia (wtorek: „nie odbyło się")',
    wtorkowa?.stanPrzeszly === 'nie_odbylo_sie', String(wtorkowa?.stanPrzeszly));
  check('⭐ tydzień NIESIE „odbyło się" z dziennika (poniedziałek)',
    poniedzialkowa?.stanPrzeszly === 'odbylo_sie', String(poniedzialkowa?.stanPrzeszly));
  check('⭐ KAŻDA pozycja niesie DATĘ SWOJEGO WYSTĄPIENIA — bez niej ekran nie ma czego zapisać',
    poniedzialkowa?.dzien === '2026-08-10' && wtorkowa?.dzien === '2026-08-11',
    `${poniedzialkowa?.dzien} / ${wtorkowa?.dzien}`);
  check('⭐ pozycja z werdyktem dostaje „Cofnij", a pozycja z dowodem z Dziennika — ŻADNEJ akcji',
    wtorkowa?.akcja.rodzaj === 'cofnij' && poniedzialkowa?.akcja.rodzaj === 'brak',
    `${wtorkowa?.akcja.rodzaj} / ${poniedzialkowa?.akcja.rodzaj}`);

  // ⚠️ Dowód, że opcjonalne pole `werdykty` NIE JEST cichym trzecim znaczeniem:
  // pominięcie go daje DOKŁADNIE to samo, co jawne `{rodzaj:'brak'}`.
  const bezPola = zbudujTydzien({
    poniedzialek: '2026-08-10', dzisiaj: DZIS, wydarzenia, planLekcji: null,
    wpisyDziennika: new Set([40]),
  });
  const zJawnymBrakiem = zbudujTydzien({
    poniedzialek: '2026-08-10', dzisiaj: DZIS, wydarzenia, planLekcji: null,
    wpisyDziennika: new Set([40]), werdykty: BRAK,
  });
  check('⛔ POMINIĘTE pole `werdykty` znaczy DOKŁADNIE tyle co jawne „brak" — zero cichych domyślnych',
    JSON.stringify(bezPola.dni.map((d) => d.pozycje.map((p) => p.stanPrzeszly)))
      === JSON.stringify(zJawnymBrakiem.dni.map((d) => d.pozycje.map((p) => p.stanPrzeszly))),
    'pominięcie pola zachowuje się inaczej niż jawne „brak"');
}

// ═══════════════════════════════════════════════════════════════════════════
// 1–5. NA PRAWDZIWYCH ZASADACH — MUSI DAĆ 0 FAIL
// ═══════════════════════════════════════════════════════════════════════════
grupa1(ZASADY_PRAWDZIWE);
grupa2(ZASADY_PRAWDZIWE);
grupa3(ZASADY_PRAWDZIWE);
grupa4(ZASADY_PRAWDZIWE);
grupa5(ZASADY_PRAWDZIWE);

const NA_PRAWDZIWYCH = failed;
const ASERCJI_BATERII = passed + failed;

// ═══════════════════════════════════════════════════════════════════════════
// 6. GRUPA PONAD WYMAGANE — ŹRÓDŁO EKRANU I PLIK MIGRACJI (O58)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n6. EKRAN — reguła, która żyje tylko w lib/, nie jest obietnicą spełnioną');
{
  const zywy = (s: string) => s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const kalendarz = zywy(readFileSync(join(root, 'app', '(tabs)', 'kalendarz.tsx'), 'utf8'));

  check('ekran CZYTA werdykty z `session_verdicts`',
    /from\('session_verdicts'\)/.test(kalendarz), 'brak odczytu werdyktów');
  check('ekran rozstrzyga odczyt wspólną regułą `czytajWerdykty`, a nie własnym `if`',
    /czytajWerdykty\(/.test(kalendarz), 'ekran ma własną regułę odczytu');
  check('⭐ ekran RYSUJE akcję rozstrzygniętą regułą (`p.akcja`), a nie własnym warunkiem',
    /p\.akcja\.rodzaj === 'oznacz'/.test(kalendarz) && /p\.akcja\.rodzaj === 'cofnij'/.test(kalendarz),
    'ekran sam decyduje, kiedy pokazać przycisk');
  check('⭐ ekran ZAPISUJE werdykt zawodnika (`origin: player`, `nie_odbylo_sie`)',
    /verdict: 'nie_odbylo_sie'/.test(kalendarz) && /origin: 'player'/.test(kalendarz),
    'brak zapisu werdyktu');
  check('⭐ ekran umie WYCOFAĆ werdykt (`withdrawn_at`), a NIE kasuje wiersza',
    /withdrawn_at/.test(kalendarz) && !/from\('session_verdicts'\)\s*\.delete\(/.test(kalendarz),
    'kasowanie werdyktu skasowałoby ślad zmiany zdania (P1)');
  check('⛔ O61 — ekran sprawdza, czy zapis DOTKNĄŁ WIERSZA, a nie tylko czy nie rzucił błędu',
    /\.select\('id'\)/.test(kalendarz) && /length === 0/.test(kalendarz),
    'zapis odrzucony przez RLS wygląda jak sukces z pustą listą');
  check('⛔ ekran NIE PYTA „dlaczego nie" przy opuszczonej sesji (M1)',
    !/[Dd]laczego/.test(kalendarz), 'wróciło pytanie o powód — to jest konfrontacja');
  check('⛔ ekran NIE MÓWI nic oceniającego po zapisie werdyktu',
    !/(Szkoda|szkoda|nic straconego|Nic straconego|Trudno|Nie martw)/.test(kalendarz),
    'po zapisie pojawiło się zdanie oceniające albo pocieszające');
  check('⛔ ekran nie zamienia nieudanego odczytu w pustą listę (`?? []`)',
    !/\?\?\s*\[\]/.test(kalendarz), 'wrócił wzorzec `?? []`');
  check('⛔ ekran nie stawia „Nie wykonano"',
    !/'Nie wykonano'/.test(kalendarz), 'wróciło oskarżenie z braku danych');
  check('ekran woła WSPÓLNĄ regułę, a nie własną kopię czterech stanów',
    /rozstrzygnijWykonanie\(/.test(kalendarz)
    && !/'brak_wpisu'\s*:\s*'nie_odbylo_sie'/.test(kalendarz),
    'ekran ma drugą kopię reguły');

  // ── JEDNA KOPIA REGUŁY, NIE DWIE ────────────────────────────────
  const tydzien = zywy(readFileSync(join(root, 'lib', 'widokTygodnia.ts'), 'utf8'));
  check('⭐ `widokTygodnia.ts` NIE MA WŁASNEJ kopii reguły — woła `rozstrzygnijWykonanie`',
    /rozstrzygnijWykonanie\(/.test(tydzien)
    && !/if \(args\.status === 'cancelled'\) return 'nie_odbylo_sie'/.test(tydzien),
    'druga kopia reguły wróciła do widoku tygodnia');
  check('⭐ tabela plakietek stoi w JEDNYM pliku — tydzień ją re-eksportuje',
    /PLAKIETKI_STANU_PRZESZLEGO = PLAKIETKI_WYKONANIA/.test(tydzien),
    'plakietki rozdwoiły się na dwie tabele');

  // ── MIGRACJA ────────────────────────────────────────────────────
  // ⚠️ Plik migracji leży w pamięci projektu, nie w repozytorium — ekran ma
  // działać także wtedy, gdy migracji jeszcze nie ma, i to jest tu sprawdzane.
  check('⛔ appka NIE ZAKŁADA, że tabela werdyktów istnieje — brak tabeli ma własną gałąź',
    /42P01/.test(readFileSync(join(root, 'lib', 'wykonanieSesji.ts'), 'utf8')),
    'brak obsługi „tabeli nie ma"');
  check('⛔ nigdzie w appce nie ma czwartego statusu `missed` w `calendar_events`',
    !/'missed'/.test(kalendarz) && !/'missed'/.test(tydzien),
    'wrócił czwarty status — patrz odrzucony projekt 1');
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. ⭐ TEST MUTACYJNY — PIĘĆ MUTACJI, PO JEDNEJ NA GRUPĘ
// ═══════════════════════════════════════════════════════════════════════════
//
// Punkt wpięcia: drugi argument `rozstrzygnijWykonanie(we, zasady)`.
// ⛔ Produkcyjny wołający go NIE PODAJE — mutacja nie ma jak wejść na ekran.
console.log('\n7. ⭐ TEST MUTACYJNY — pięć mutacji, liczba FAIL-i przy każdej');
console.log(`\nbateria ma ${ASERCJI_BATERII} asercji · na prawdziwych zasadach FAIL-i: ${NA_PRAWDZIWYCH}`);

const MUTACJE: ReadonlyArray<{ nazwa: string; zasady: ZasadyWykonania }> = [
  { nazwa: 'M1 · werdykt zawodnika przestaje się liczyć',
    zasady: { ...ZASADY_PRAWDZIWE, werdyktLiczySie: false } },
  { nazwa: 'M2 · ⛔ brak dowodu uznany za „nie odbyło się" (złamanie Z0)',
    zasady: { ...ZASADY_PRAWDZIWE, brakWolnoUznacZaNieodbyte: true } },
  { nazwa: 'M3 · reguła cykliczna bierze wpis wskazujący WIERSZ reguły',
    zasady: { ...ZASADY_PRAWDZIWE, regulaBierzeWpisReguly: true } },
  { nazwa: 'M4 · werdykt nie liczy się I brak uznany za nieodbyty',
    zasady: { werdyktLiczySie: false, brakWolnoUznacZaNieodbyte: true, regulaBierzeWpisReguly: false } },
  { nazwa: 'M5 · wszystkie trzy reguły wyłączone naraz',
    zasady: { werdyktLiczySie: false, brakWolnoUznacZaNieodbyte: true, regulaBierzeWpisReguly: true } },
];

let mutacjeOk = 0;
for (const m of MUTACJE) {
  const przedP = passed;
  const przedF = failed;
  const cichy = console.log;
  const zebrane: string[] = [];
  console.log = (...a: unknown[]) => { const s = String(a[0]); if (s.startsWith('FAIL')) zebrane.push(s); };
  grupa1(m.zasady); grupa2(m.zasady); grupa3(m.zasady); grupa4(m.zasady); grupa5(m.zasady);
  const faili = failed - przedF;
  console.log = cichy;
  // Mutacja nie ma prawa zmienić wyniku baterii prawdziwej — cofamy licznik.
  passed = przedP;
  failed = przedF;

  console.log(`\n   „${m.nazwa}"`);
  console.log(`   FAIL-i przy tej mutacji: ${faili} / ${ASERCJI_BATERII}`);
  for (const f of zebrane.slice(0, 6)) console.log(`      ↳ ${f.replace(/^FAIL - /, '')}`);
  if (zebrane.length > 6) console.log(`      ↳ …i ${zebrane.length - 6} dalszych`);
  if (faili > 0) mutacjeOk += 1;
}

check(`⭐ KAŻDA z ${MUTACJE.length} mutacji zapala strażnika`,
  mutacjeOk === MUTACJE.length, `zapaliło ${mutacjeOk} z ${MUTACJE.length}`);
check('⭐ na PRAWDZIWYCH zasadach bateria jest zielona',
  NA_PRAWDZIWYCH === 0, `${NA_PRAWDZIWYCH} FAIL-i`);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
