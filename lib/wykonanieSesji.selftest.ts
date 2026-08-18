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

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  rozstrzygnijWykonanie,
  rozstrzygnijObowiazywanie,
  plakietkaPozycji,
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
// GRUPA 1 — PIĘĆ STANÓW TO PIĘĆ RÓŻNYCH WARTOŚCI
// ═══════════════════════════════════════════════════════════════════════════
function grupa1(zasady: ZasadyWykonania): void {
  console.log('\n1. PIĘĆ STANÓW, NIE DWA POD PIĘCIOMA NAZWAMI');

  const odbyte = stan({ wpisyDziennika: new Set([1]) }, zasady);
  // ⭐ PLAN-D-K1 — „nie odbyło się" ma dziś DOKŁADNIE JEDNO źródło: werdykt
  // zawodnika. Do 16.08.2026 dawało je też odwołanie — i to był cały defekt.
  const nieodbyte = stan({ idWydarzenia: 9, dzien: '2026-08-11',
    werdykty: jest(w(9, '2026-08-11', 'nie_odbylo_sie')) }, zasady);
  const odwolane = stan({ status: 'cancelled' }, zasady);
  const bez = stan({}, zasady);
  const nieodczytane = stan({ wpisyDziennika: null }, zasady);

  check('stan 1/5 — „odbyło się" (wpis w dzienniku wskazuje tę pozycję)',
    odbyte === 'odbylo_sie', String(odbyte));
  check('stan 2/5 — „nie odbyło się" (WERDYKT ZAWODNIKA — jedyne źródło)',
    nieodbyte === 'nie_odbylo_sie', String(nieodbyte));
  check('⭐ stan 3/5 — POZYCJA ODWOŁANA to `odwolane`, a NIE „nie odbyło się"',
    odwolane === 'odwolane', String(odwolane));
  check('stan 4/5 — „brak wpisu"',
    bez === 'brak_wpisu', String(bez));
  check('⛔ stan 5/5 — NIEUDANY ODCZYT dziennika ≠ „brak wpisu"',
    nieodczytane === 'nie_odczytano', String(nieodczytane));

  const wszystkie = [odbyte, nieodbyte, odwolane, bez, nieodczytane];
  check('⭐ pięć stanów to PIĘĆ RÓŻNYCH wartości',
    new Set(wszystkie).size === 5, JSON.stringify(wszystkie));

  check('wystąpienie przed nami nie ma stanu (nie ma o czym orzekać)',
    stan({ przeszle: false }, zasady) === null, String(stan({ przeszle: false }, zasady)));

  check('każdy z pięciu stanów ma własną plakietkę, żadne dwie nie są tym samym napisem',
    new Set(Object.values(PLAKIETKI_WYKONANIA)).size === 5,
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
    // ⛔ PLAN-D-K1 — ODWOŁANIE NADAL WCHODZI DO `nieodbyte`. Plakietka
    // zmieniła się na „Odwołane", licznik pracy NIE ZMIENIŁ SIĘ ANI O JEDEN
    // (D6). Ta liczba jest przypięta z pomiaru sprzed pasa K1.
    check('nieodbyte = 2 (jedno ODWOŁANIE + jeden werdykt zawodnika) — D6',
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
  check('⭐ odwołanie DAJE `odwolane` (a NIE „nie odbyło się") — PLAN-D-K1',
    zOdwolania === 'odwolane', String(zOdwolania));
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
// ⭐ PLAN-D-K1 08.2026 (16.08.2026) — PLAKIETKA, KTÓRA OBWINIAŁA ZAWODNIKA
//    ZA SESJĘ ZDJĘTĄ Z PLANU PRZEZ PRODUKT
// ═══════════════════════════════════════════════════════════════════════════
//
// ── CO BYŁO ZMIERZONE ───────────────────────────────────────────────────────
// 16.08.2026, produkcja `kqrbztsvepjtggjmmcdx`:
//   • 24 z 24 wydarzeń w bazie ma `source='system'`;
//   • 12 z 24 ma `status='cancelled'` — wszystkie odwołane przez
//     `gamechange-app/lib/focus-block-adaptation.js :: adaptFocusBlock`;
//   • z tych 12 na dzień 16.08 DWA wystąpienia były już przeszłe (12.08, 14.08)
//     u JEDNEGO zawodnika — czyli dwie plakietki „Nie odbyło się" postawione
//     przy sesjach, których produkt sam nie dał wykonać. Pozostałe dziesięć
//     (17.08–07.09) zapaliłoby się samo z upływem dat.
//
// ── DLACZEGO TE ASERCJE, A NIE INNE ─────────────────────────────────────────
// Grupy 8–11 są napisane pod błędy, które POPEŁNIŁY POPRZEDNIE PASY:
//   (8)  D6 — plakietka to NIE licznik. Zmiana stanu nie ma prawa ruszyć ani
//        jednej liczby licznika pracy. Liczby są PRZYPIĘTE z pomiaru sprzed
//        pasa K1, nie policzone z bieżącego kodu (inaczej asercja mierzyłaby
//        kod samym sobą).
//   (9)  KOLEJNOŚĆ REGUŁ — wycinamy CIAŁO funkcji, nie szukamy w całym pliku
//        (O71): wzorzec `werdyktLiczySie` stoi w tym pliku pięć razy.
//   (10) EKRAN — asercje czytają PLIK EKRANU, nie ten moduł (O75). Brak pliku
//        to FAIL z nazwą, nigdy `POMINIETE` (O76).
//   (11) JEDNO SŁOWO NA JEDEN FAKT — przemiatamy CAŁE repozytorium, nie listę
//        plików (O69), i zapadka stoi na RÓWNOŚCI (O73).
// ═══════════════════════════════════════════════════════════════════════════

// ⚠️ TO SŁOWO JEST TU SKLEJONE Z DWÓCH KAWAŁKÓW CELOWO I NIE JEST OZDOBĄ.
// Grupa 11 przemiata CAŁE repozytorium w poszukiwaniu tego napisu. Gdyby stał
// tu w całości, strażnik znalazłby sam siebie i zapalałby się zawsze — czyli
// byłby albo wyłączony, albo obudowany wyjątkiem na własną nazwę, a wyjątek
// na własną nazwę to pierwszy krok do wyjątku na cudzą.
const SLOWO_PORZUCONE = 'Anul' + 'owane';

/** Czyta plik repozytorium. ⛔ O75/O76 — brak pliku NIE JEST pominięciem. */
function czytajPlikRepo(...czesci: string[]): string | null {
  try {
    return readFileSync(join(root, ...czesci), 'utf8');
  } catch {
    return null;
  }
}

/** Usuwa komentarze — asercja ma pytać o KOD, nie o zdanie o kodzie. */
function zywyKod(s: string): string {
  return s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Wycina ciało funkcji od jej nagłówka do `koniec`. ⛔ O71 — asercja szukająca
 * wzorca w CAŁYM pliku nie pilnuje jednej instrukcji.
 */
function wytnij(zrodlo: string, od: string, do_: string): string | null {
  const i = zrodlo.indexOf(od);
  if (i < 0) return null;
  const j = zrodlo.indexOf(do_, i + od.length);
  if (j < 0) return null;
  return zrodlo.slice(i, j);
}

/**
 * Wpis katalogu w kształcie, którego ten strażnik używa.
 * ⚠️ Opisany TU, a nie zaimportowany jako `import('node:fs').Dirent` — bo tamten
 * zapis dokłada jeden błąd `TS2591` w środowisku bez `@types/node`, a strażnik
 * nie ma prawa dokładać szumu do pomiaru, którym sam się mierzy.
 */
type WpisKatalogu = { name: string; isDirectory(): boolean; isFile(): boolean };

/** Przemiata katalog po plikach `.ts`/`.tsx`. ⛔ O69 — zero list na sztywno. */
function przemiec(katalog: string, akumulator: string[] = []): string[] {
  let wpisy: WpisKatalogu[];
  try {
    wpisy = readdirSync(katalog, { withFileTypes: true });
  } catch {
    return akumulator;
  }
  for (const e of wpisy) {
    const p = join(katalog, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === '_diag_backup'
        || e.name === '.expo' || e.name === 'assets') continue;
      przemiec(p, akumulator);
    } else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))) {
      akumulator.push(p);
    }
  }
  return akumulator;
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPA 8 — ⛔ D6: PLAKIETKA TO NIE LICZNIK. ANI JEDNA LICZBA SIĘ NIE RUSZA
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n8. ⛔ PLAN-D-K1 / D6 — ZMIANA PLAKIETKI NIE RUSZA LICZNIKA PRACY');
{
  // ⭐ WEJŚCIE I WYNIK ZMIERZONE NA KODZIE SPRZED PASA K1 (`origin/main`
  // = e34a523, 16.08.2026) i PRZYPIĘTE TU JAKO LICZBY. ⛔ Gdyby asercja
  // liczyła oczekiwanie z bieżącego kodu, mierzyłaby kod samym sobą i przeszła
  // przy każdej zmianie — dokładnie tak, jak przechodzi test, który sprawdza,
  // że `f(x) === f(x)`.
  const WEJSCIE: WystapienieDoLicznika[] = [
    { idWydarzenia: 1, dzien: '2026-08-12', status: 'scheduled', zRegulyCyklicznej: false },
    { idWydarzenia: 2, dzien: '2026-08-11', status: 'cancelled', zRegulyCyklicznej: false },
    { idWydarzenia: 3, dzien: '2026-08-10', status: 'cancelled', zRegulyCyklicznej: false },
    { idWydarzenia: 4, dzien: '2026-08-09', status: 'completed', zRegulyCyklicznej: false },
    { idWydarzenia: 5, dzien: '2026-08-08', status: 'scheduled', zRegulyCyklicznej: false },
  ];
  const PRZED_K1 = { odbyte: 2, nieodbyte: 2, bezWpisu: 1, nieodczytane: 0, mianownik: 4 };

  const po = policzWykonanaPrace({
    dzis: DZIS, oknoDni: 14, wystapienia: WEJSCIE,
    wpisyDziennika: new Set([1]), werdykty: BRAK,
  });

  check('⭐ D6 — licznik na tym samym wejściu nadal się LICZY, nie „brak podstawy"',
    po.rodzaj === 'policzony', JSON.stringify(po));
  if (po.rodzaj === 'policzony') {
    check('⭐ D6 — WSZYSTKIE PIĘĆ LICZB licznika jest CO DO JEDNEGO takich, jak przed pasem K1',
      po.odbyte === PRZED_K1.odbyte && po.nieodbyte === PRZED_K1.nieodbyte
      && po.bezWpisu === PRZED_K1.bezWpisu && po.nieodczytane === PRZED_K1.nieodczytane
      && po.mianownik === PRZED_K1.mianownik,
      `${JSON.stringify(po)} ≠ ${JSON.stringify(PRZED_K1)}`);
    check('⛔ D6 — DWIE ODWOŁANE SESJE SIEDZĄ W `nieodbyte`, a NIE w „bez wpisu"',
      po.nieodbyte === 2 && po.bezWpisu === 1,
      `nieodbyte=${po.nieodbyte} bezWpisu=${po.bezWpisu} — odwołane wpadły do „bez wpisu", `
      + 'czyli mianownik zmalał i zawodnik z 12 odwołaniami dostanie „brak podstawy"');
    check('⛔ D6 — MIANOWNIK nie zmalał: odwołana sesja to nadal PRACA NIEWYKONANA',
      po.mianownik === po.odbyte + po.nieodbyte && po.mianownik === 4, String(po.mianownik));
  }

  // ⭐ TA SAMA LICZBA Z DWÓCH RÓŻNYCH DRÓG: odwołanie i werdykt zawodnika
  // „nie odbyłem" mają dla LICZNIKA znaczyć dokładnie to samo, choć dla
  // ZAWODNIKA znaczą co innego. To jest cała treść rozdzielenia z pasa K1.
  const przezWerdykt = policzWykonanaPrace({
    dzis: DZIS, oknoDni: 14,
    wystapienia: WEJSCIE.map((x) => (x.status === 'cancelled' ? { ...x, status: 'scheduled' } : x)),
    wpisyDziennika: new Set([1]),
    werdykty: jest(w(2, '2026-08-11', 'nie_odbylo_sie'), w(3, '2026-08-10', 'nie_odbylo_sie')),
  });
  check('⭐ D6 — ODWOŁANIE i WERDYKT „nie odbyłem" dają licznikowi TĘ SAMĄ liczbę',
    przezWerdykt.rodzaj === 'policzony' && po.rodzaj === 'policzony'
    && przezWerdykt.odbyte === po.odbyte && przezWerdykt.nieodbyte === po.nieodbyte
    && przezWerdykt.mianownik === po.mianownik && przezWerdykt.bezWpisu === po.bezWpisu,
    `${JSON.stringify(przezWerdykt)} vs ${JSON.stringify(po)}`);

  // …a dla ZAWODNIKA nie znaczą tego samego — i to też ma być asercją, bo bez
  // niej powyższa równość byłaby spełniona także przez sklejenie obu stanów.
  check('⭐ …ale ZAWODNIK czyta przy nich DWA RÓŻNE zdania — licznik zrównał, ekran nie',
    PLAKIETKI_WYKONANIA.odwolane !== PLAKIETKI_WYKONANIA.nie_odbylo_sie,
    `${PLAKIETKI_WYKONANIA.odwolane} / ${PLAKIETKI_WYKONANIA.nie_odbylo_sie}`);

  // ── ZAPADKA NA KOMPLETNOŚĆ TABELI PLAKIETEK ──────────────────────────
  const klucze = Object.keys(PLAKIETKI_WYKONANIA);
  const zdania = Object.values(PLAKIETKI_WYKONANIA);
  check('⭐ zapadka na RÓWNOŚĆ — `PLAKIETKI_WYKONANIA` ma DOKŁADNIE 5 kluczy (O73)',
    klucze.length === 5, `${klucze.length}: ${klucze.join(', ')}`);
  check('⛔ KAŻDA z pięciu plakietek ma NIEPUSTE zdanie',
    zdania.every((z) => typeof z === 'string' && z.trim().length > 0), JSON.stringify(zdania));
  check('⛔ ŻADNE DWIE plakietki nie są tym samym napisem',
    new Set(zdania).size === 5, JSON.stringify(zdania));
  check('⛔ plakietka `odwolane` NIE JEST tym samym zdaniem, co `nie_odbylo_sie` ani co `brak_wpisu`',
    PLAKIETKI_WYKONANIA.odwolane !== PLAKIETKI_WYKONANIA.nie_odbylo_sie
    && PLAKIETKI_WYKONANIA.odwolane !== PLAKIETKI_WYKONANIA.brak_wpisu,
    JSON.stringify(PLAKIETKI_WYKONANIA));
  check('⛔ plakietka `odwolane` NIE ZAWIERA słowa oskarżającego („nie odbył", „opuść", „pominął")',
    !/(nie odby|opuszcz|opuść|pominą|pominię|zawiod|zaniedb)/i.test(PLAKIETKI_WYKONANIA.odwolane),
    PLAKIETKI_WYKONANIA.odwolane);
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPA 9 — ⭐ REGUŁA URUCHOMIONA, NIE PRZECZYTANA. I KOLEJNOŚĆ REGUŁ (D2)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n9. ⭐ PLAN-D-K1 — REGUŁA ODPALONA NA WEJŚCIU, NIE WYSZUKANA W TEKŚCIE');
{
  // ⭐ ASERCJA URUCHOMIENIOWA. Asercja tekstowa („czy w pliku stoi `odwolane`")
  // przepuściłaby dowolną INNĄ gałąź zwracającą tę wartość — na przykład taką,
  // która oddaje `odwolane` dla `completed`, a dla `cancelled` nadal
  // `nie_odbylo_sie`.
  const odwolanePrzeszle = rozstrzygnijWykonanie({
    idWydarzenia: 100, dzien: '2026-08-11', przeszle: true, status: 'cancelled',
    zRegulyCyklicznej: false, wpisyDziennika: new Set<number>(), werdykty: BRAK,
  });
  check('⭐ ODPALONA reguła na `{status:cancelled, przeszłe:true}` oddaje `odwolane`',
    odwolanePrzeszle === 'odwolane', String(odwolanePrzeszle));
  check('⛔ …i NIE oddaje `nie_odbylo_sie` — to była plakietka obwiniająca zawodnika',
    odwolanePrzeszle !== 'nie_odbylo_sie', String(odwolanePrzeszle));
  check('⛔ …i NIE oddaje `brak_wpisu` — odwołanie JEST wiedzą, nie jej brakiem',
    odwolanePrzeszle !== 'brak_wpisu', String(odwolanePrzeszle));

  // ⭐ ASERCJA ODWROTNA — WERDYKT ZAWODNIKA NADAL WYGRYWA (reguła 2 przed 3).
  const werdyktNaOdwolanym = rozstrzygnijWykonanie({
    idWydarzenia: 101, dzien: '2026-08-11', przeszle: true, status: 'cancelled',
    zRegulyCyklicznej: false, wpisyDziennika: new Set<number>(),
    werdykty: jest(w(101, '2026-08-11', 'nie_odbylo_sie')),
  });
  const werdyktTakNaOdwolanym = rozstrzygnijWykonanie({
    idWydarzenia: 102, dzien: '2026-08-11', przeszle: true, status: 'cancelled',
    zRegulyCyklicznej: false, wpisyDziennika: new Set<number>(),
    werdykty: jest(w(102, '2026-08-11', 'odbylo_sie')),
  });
  check('⭐ WERDYKT ZAWODNIKA „nie odbyłem" WYGRYWA z odwołaniem (reguła 2 przed 3)',
    werdyktNaOdwolanym === 'nie_odbylo_sie', String(werdyktNaOdwolanym));
  check('⭐ WERDYKT „odbyłem" też wygrywa — zawodnik mógł zrobić sesję zdjętą z planu',
    werdyktTakNaOdwolanym === 'odbylo_sie', String(werdyktTakNaOdwolanym));

  check('⛔ odwołanie w PRZYSZŁOŚCI nadal nie ma stanu — nie ma o czym orzekać',
    rozstrzygnijWykonanie({
      idWydarzenia: 103, dzien: '2026-08-30', przeszle: false, status: 'cancelled',
      zRegulyCyklicznej: false, wpisyDziennika: new Set<number>(), werdykty: BRAK,
    }) === null);

  check('⛔ odwołana REGUŁA CYKLICZNA też daje `odwolane` — reguła 3 stoi przed regułą 4',
    rozstrzygnijWykonanie({
      idWydarzenia: 104, dzien: '2026-08-11', przeszle: true, status: 'cancelled',
      zRegulyCyklicznej: true, wpisyDziennika: new Set<number>(), werdykty: BRAK,
    }) === 'odwolane');

  // ── O71 — KOLEJNOŚĆ REGUŁ Z CIAŁA FUNKCJI, NIE Z CAŁEGO PLIKU ────────
  const modul = czytajPlikRepo('lib', 'wykonanieSesji.ts');
  check('⛔ O75 — `lib/wykonanieSesji.ts` DA SIĘ ODCZYTAĆ (brak pliku to FAIL, nie pominięcie)',
    modul !== null, 'nie udało się odczytać lib/wykonanieSesji.ts');
  if (modul !== null) {
    const cialo = wytnij(zywyKod(modul), 'export function rozstrzygnijWykonanie', 'function brakAlboNieodczytano');
    check('⛔ O71 — ciało `rozstrzygnijWykonanie` da się wyciąć (asercja pyta o JEDNĄ funkcję)',
      cialo !== null && cialo.length > 100, `cialo=${cialo === null ? 'BRAK' : cialo.length + 'B'}`);
    if (cialo !== null) {
      const iWerdykt = cialo.indexOf('werdyktLiczySie');
      const iOdwolanie = cialo.indexOf("we.status === 'cancelled'");
      const iCykl = cialo.indexOf('zRegulyCyklicznej');
      check('⛔ D2 — w CIELE reguły gałąź `cancelled` w ogóle jest',
        iOdwolanie > 0, String(iOdwolanie));
      check('⭐ D2 — WERDYKT ZAWODNIKA stoi w ciele PRZED gałęzią `cancelled` (reguła 2 przed 3)',
        iWerdykt > 0 && iOdwolanie > iWerdykt, `werdykt@${iWerdykt} cancelled@${iOdwolanie}`);
      check('⭐ D2 — gałąź `cancelled` stoi PRZED gałęzią reguły cyklicznej (reguła 3 przed 4)',
        iCykl > 0 && iCykl > iOdwolanie, `cancelled@${iOdwolanie} cykliczna@${iCykl}`);
      check('⛔ gałąź `cancelled` zwraca `odwolane`, a NIE `nie_odbylo_sie`',
        /we\.status === 'cancelled'\)\s*return 'odwolane'/.test(cialo),
        'gałąź odwołania nie zwraca piątej wartości');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPA 10 — ⭐ EKRAN. O75: ASERCJA CZYTA PLIK EKRANU, NIE WŁASNY MODUŁ
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n10. ⭐ PLAN-D-K1 — EKRAN MÓWI JEDNO SŁOWO I BIERZE JE ZE STAŁEJ');
{
  const surowy = czytajPlikRepo('app', '(tabs)', 'kalendarz.tsx');
  check('⛔ O75/O76 — `app/(tabs)/kalendarz.tsx` DA SIĘ ODCZYTAĆ (brak pliku = FAIL z nazwą)',
    surowy !== null, 'nie udało się odczytać app/(tabs)/kalendarz.tsx');
  if (surowy !== null) {
    const ekran = zywyKod(surowy);

    check('⭐ ekran BIERZE brzmienie odwołania ZE STAŁEJ, a nie wpisuje go wprost',
      /PLAKIETKI_STANU_PRZESZLEGO\.odwolane/.test(ekran),
      'ekran nie sięga po `PLAKIETKI_STANU_PRZESZLEGO.odwolane`');

    // ⛔ O71 — pytamy o CIAŁO `renderEventCard`, nie o cały plik: w pliku
    // o 1000+ liniach wzorzec „gdzieś jest" nie pilnuje TEJ jednej gałęzi.
    const karta = wytnij(ekran, 'function renderEventCard', 'function renderPozycja');
    check('⛔ O71 — ciało `renderEventCard` da się wyciąć',
      karta !== null && karta.length > 200, `karta=${karta === null ? 'BRAK' : karta.length + 'B'}`);
    if (karta !== null) {
      check('⭐ gałąź `status === cancelled` NA KARCIE stawia plakietkę ZE STAŁEJ',
        /status === 'cancelled'\) badges\.push\(PLAKIETKI_STANU_PRZESZLEGO\.odwolane\)/.test(karta),
        'karta wpisuje brzmienie odwołania wprost albo zgubiła gałąź');
      check(`⛔ ciało karty NIE ZAWIERA napisu „${SLOWO_PORZUCONE}" wpisanego wprost`,
        !new RegExp(SLOWO_PORZUCONE).test(karta), 'wróciła druga nazwa tego samego faktu');
    }

    const wiersz = wytnij(ekran, 'function renderPozycja', 'const styles');
    check('⛔ O71 — ciało `renderPozycja` da się wyciąć',
      wiersz !== null && wiersz.length > 200, `wiersz=${wiersz === null ? 'BRAK' : wiersz.length + 'B'}`);
    if (wiersz !== null) {
      check('⭐ D7 — wiersz dnia ma JAWNĄ gałąź dla piątej wartości (`odwolane`)',
        /'odwolane'/.test(wiersz),
        'wiersz dnia przemilczał piątą wartość — przekreślenie zniknęłoby po cichu');
    }

    check('⭐ ekran ma czasownik „odwołaj" ZE STAŁEJ (`AKCJA_ODWOLAJ`), nie wpisany wprost',
      /AKCJA_ODWOLAJ/.test(ekran), 'przycisk odwołania nie bierze brzmienia ze stałej');
    check('⛔ ekran NIE STAWIA „Nie odbyło się" wpisanego wprost',
      !/'Nie odbyło się'/.test(ekran), 'wróciła kopia napisu na ekranie');
  }

  // ⭐ TA SAMA REGUŁA MUSI DOJŚĆ DO POZYCJI NA EKRANIE, a nie tylko dać się
  // zawołać osobno (O58) — przez `zbudujTydzien`, czyli tak, jak woła ją ekran.
  const t = zbudujTydzien({
    poniedzialek: '2026-08-10',
    dzisiaj: DZIS,
    wydarzenia: [
      { id: 71, title: 'Sesja Bloku (zdjęta z planu przez produkt)', event_type: 'micro_session',
        status: 'cancelled', scheduled_date: '2026-08-11', scheduled_time: null,
        recurrence_rule: null, source: 'system' },
    ],
    planLekcji: null,
    wpisyDziennika: new Set<number>(),
    werdykty: BRAK,
  });
  const odwolanaPozycja = t.dni.flatMap((d) => d.pozycje).find((p) => p.id === 71) ?? null;
  check('⭐ TYDZIEŃ NIESIE `odwolane` do pozycji dnia — reguła dochodzi na ekran (O58)',
    odwolanaPozycja?.stanPrzeszly === 'odwolane', String(odwolanaPozycja?.stanPrzeszly));
  check('⛔ …i pozycja odwołana NADAL nie liczy się do wagi dnia',
    odwolanaPozycja?.liczonaDoWagi === false, String(odwolanaPozycja?.liczonaDoWagi));
  check('⛔ …i NADAL nie ma nad nią przycisku werdyktu — dowód już jest',
    odwolanaPozycja?.akcja.rodzaj === 'brak', String(odwolanaPozycja?.akcja.rodzaj));
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPA 11 — ⭐ JEDNO SŁOWO NA JEDEN FAKT. PRZEMIATANIE, NIE LISTA (O69/O73)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n11. ⭐ PLAN-D-K1 — JEDEN FAKT MA W PRODUKCIE JEDNĄ NAZWĘ');
{
  const wszystkie = przemiec(root);
  check('⛔ O69 — przemiatanie repozytorium w ogóle coś znalazło',
    wszystkie.length > 50, `plików .ts/.tsx: ${wszystkie.length}`);

  // ── ZAPADKA NA JEDNO SŁOWO ───────────────────────────────────────────
  // ⚠️ Pytamy o ŻYWY KOD, nie o komentarze: zdanie „do 16.08 nazywało się tak"
  // jest ZAPISEM HISTORII i ma prawo zostać (O67 chce komentarzy, które mówią
  // prawdę, a nie komentarzy skasowanych). Zakazany jest NAPIS, który zawodnik
  // może zobaczyć na ekranie.
  const zNapisem = wszystkie.filter((p) => {
    const t = zywyKod(readFileSync(p, 'utf8'));
    return new RegExp(`['"\`]${SLOWO_PORZUCONE}['"\`]`).test(t)
      || new RegExp(`>\\s*${SLOWO_PORZUCONE}\\s*<`).test(t)
      || new RegExp(`\\}\\s*${SLOWO_PORZUCONE}`).test(t);
  }).map((p) => p.slice(root.length + 1));
  check(`⛔ ZAPADKA NA JEDNO SŁOWO — w CAŁYM repozytorium ZERO wystąpień napisu „${SLOWO_PORZUCONE}"`,
    zNapisem.length === 0,
    `znaleziono w: ${zNapisem.join(', ')} — ten sam fakt znów ma dwie nazwy`);

  // ── ZAPADKA NA LICZBĘ KONSUMENTÓW (O69 + O73) ────────────────────────
  //
  // ⛔ TA LICZBA NIE JEST OZDOBĄ. `Record<StanWykonania, …>` wywali się na
  // `tsc`, ale `if/else` i `switch` bez `default` NIE WYWALĄ SIĘ i przemilczą
  // piątą wartość — dokładnie tak, jak przemilczałby ją licznik pracy bez
  // gałęzi dodanej w tym pasie. Nowy konsument ma ZAPALIĆ tę asercję, żeby
  // CZŁOWIEK spojrzał, czy ma jawną gałąź. ⛔ NIE PODNOŚ tej liczby bez
  // dopisania gałęzi w nowym pliku.
  const WZORZEC_KONSUMENTA =
    /nie_odbylo_sie|odbylo_sie|brak_wpisu|nie_odczytano|PLAKIETKI_WYKONANIA|PLAKIETKI_STANU_PRZESZLEGO|rozstrzygnijWykonanie|StanWykonania|StanPozycjiPrzeszlej/;
  const konsumenci = wszystkie
    .filter((p) => WZORZEC_KONSUMENTA.test(readFileSync(p, 'utf8')))
    .map((p) => p.slice(root.length + 1))
    .sort();
  // ⭐ AKTUALIZACJA 17.08.2026, PAS L1: 11 → 12. Doszedł
  // `lib/obciazenieOstatnichDni.ts` i ⚠️ NIE JEST TO konsument `StanWykonania`.
  // Wpada tu przez człon `nie_odczytano` wzorca wyżej, który w tym pliku należy
  // do `WejscieZrodla` z `lib/nagrodaZaPrace.ts` (nieodczytane ŹRÓDŁO PRACY),
  // a nie do rozstrzygnięcia wystąpienia. Moduł NIE ROZGAŁĘZIA SIĘ po wartości
  // `StanWykonania` — potwierdza to asercja D7 niżej, która przeszła. Liczba
  // podniesiona świadomie, z nazwą pliku i z powodem (O73).
  // ⭐ AKTUALIZACJA 18.08.2026, PAS S1: 13 → 15. Doszły `lib/ekranProfilu.ts`
  // i `lib/ekranProfilu.selftest.ts` (pas A3, ekran „Profil") i ⚠️ ŻADEN
  // Z NICH NIE JEST konsumentem `StanWykonania` — wpadają tu przez człon
  // `nie_odczytano` wzorca wyżej, który w tamtym module nazywa NIEODCZYTANE
  // ŹRÓDŁO PRACY (`OdczytTabeli`), a nie rozstrzygnięcie wystąpienia. Żaden
  // z nich nie rozgałęzia się po wartości `StanWykonania` — potwierdza to
  // asercja D7 niżej, która przechodzi. Podniesione dokładnie tym samym
  // wzorcem, którym pas L1 podniósł 11 → 12, i o DWA, nie o trzy: pas A3
  // przeniósł rozpoznanie nieudanego odczytu z `ja.tsx` do `odczytTabeli()`,
  // więc ekran nie ma już literału `'nie_odczytano'`.
  // ⚠️ Nowe pliki pasa S1 (`components/WgladPozycji.tsx`) NIE SĄ na tej liście
  // — sprawdzone uruchomieniem 18.08.2026.
  const KONSUMENTOW_18_08_2026 = 15;
  check(`⭐ O73 — konsumentów \`StanWykonania\` jest DOKŁADNIE ${KONSUMENTOW_18_08_2026} (zapadka na RÓWNOŚĆ, nie na „≥1")`,
    konsumenci.length === KONSUMENTOW_18_08_2026,
    `${konsumenci.length}: ${konsumenci.join(', ')}`);
  check('⛔ na liście konsumentów są OBA ekrany, które rysują plakietkę',
    konsumenci.includes('app/(tabs)/kalendarz.tsx') && konsumenci.includes('app/(tabs)/dzis.tsx'),
    konsumenci.join(', '));
  check('⛔ i oba moduły, które regułę wołają',
    konsumenci.includes('lib/widokTygodnia.ts') && konsumenci.includes('lib/pytanieOWystapienie.ts'),
    konsumenci.join(', '));

  // ── D7 — KAŻDY KONSUMENT Z GAŁĘZIAMI MA GAŁĄŹ PIĄTĄ ──────────────────
  //
  // Konsument, który rozgałęzia się PO WARTOŚCI stanu (a nie indeksuje po
  // `Record`), musi wymienić `odwolane` z nazwy. Wypisujemy takich po TREŚCI
  // (O88), a nie po nazwie pliku.
  const rozgalezieni = konsumenci.filter((rel) => {
    if (rel.endsWith('.selftest.ts')) return false;
    const t = zywyKod(readFileSync(join(root, rel), 'utf8'));
    return /=== 'nie_odbylo_sie'|=== 'brak_wpisu'|stan === 'odbylo_sie'/.test(t);
  });
  const bezPiatej = rozgalezieni.filter((rel) => {
    const t = zywyKod(readFileSync(join(root, rel), 'utf8'));
    return !/'odwolane'/.test(t);
  });
  check('⭐ D7 — KAŻDY konsument rozgałęziający się PO WARTOŚCI stanu wymienia `odwolane` z nazwy',
    bezPiatej.length === 0,
    `bez jawnej gałęzi: ${bezPiatej.join(', ')} (z ${rozgalezieni.length} rozgałęziających się)`);
  check('⛔ …i takich konsumentów w ogóle jest więcej niż zero (inaczej asercja wyżej jest pusta)',
    rozgalezieni.length >= 2, `${rozgalezieni.length}: ${rozgalezieni.join(', ')}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPA 12 — ⭐ PLAN-D-Q1: ODWOŁANIE WIDAĆ TAKŻE W PRZYSZŁOŚCI
// ═══════════════════════════════════════════════════════════════════════════
//
// ⛔ CO BYŁO ZEPSUTE I JAK TO ZMIERZONO (17.08.2026, `kqrbztsvepjtggjmmcdx`):
// plan tygodnia czytał wydarzenia BEZ filtra statusu, a plakietkę brał
// WYŁĄCZNIE ze `stanPrzeszly`. `rozstrzygnijWykonanie` oddaje dla przyszłości
// `null` — i słusznie, bo o WYKONANIU przyszłości nie ma czego orzekać.
// Skutek: sesja odwołana z datą w przyszłości rysowała się w planie identycznie
// jak zaplanowana. W bazie było wtedy 9 takich wydarzeń u 1 zawodnika
// (plus 1 z datą dzisiejszą, bo „dziś" też nie jest przeszłością), na 25
// wydarzeń ogółem. Produkt pokazywał zawodnikowi w planie sesję, którą sam
// zdjął z planu — złamanie Z0.
console.log('\n12. ⭐ PLAN-D-Q1 — POZYCJA ODWOŁANA W PRZYSZŁOŚCI NIESIE „Odwołane"');
{
  // ⭐ ASERCJA URUCHOMIENIOWA — PRZEZ CAŁY PLAN TYGODNIA, nie przez samą regułę.
  // ⛔ Asercja tekstowa („czy w ekranie stoi `plakietkaPozycji`") nic tu nie
  // pilnuje: przepuściłaby producenta, który dla odwołania w przyszłości nadal
  // oddaje `null`.
  const PON = '2026-08-17';
  const wiersz = (id: number, status: string, data: string): WierszWydarzenia => ({
    id, title: `poz-${id}`, event_type: 'club_training', status,
    scheduled_date: data, scheduled_time: '18:00', recurrence_rule: null, source: 'system',
  });
  const tydzien = zbudujTydzien({
    poniedzialek: PON,
    dzisiaj: PON,
    wydarzenia: [
      wiersz(900, 'cancelled', '2026-08-20'),  // przyszłość, odwołana
      wiersz(901, 'scheduled', '2026-08-20'),  // przyszłość, obowiązuje
      wiersz(902, 'cancelled', PON),           // DZIŚ — też nie jest przeszłością
      wiersz(903, 'cancelled', '2026-08-17'),  // ten sam dzień, kontrola duplikatu id
    ],
    planLekcji: null,
    wpisyDziennika: new Set<number>(),
    werdykty: BRAK,
  });
  const wszystkiePozycje = tydzien.dni.flatMap((d) => d.pozycje);
  const poz = (id: number) => wszystkiePozycje.find((x) => x.id === id) ?? null;

  check('⛔ O76 — plan w ogóle zbudował te cztery pozycje (inaczej asercje niżej są puste)',
    wszystkiePozycje.length === 4, `pozycji: ${wszystkiePozycje.length}`);

  const odwolanaPrzyszla = poz(900);
  const zaplanowanaPrzyszla = poz(901);
  const odwolanaDzis = poz(902);

  check('⭐ D1 URUCHOMIENIOWO — pozycja ODWOŁANA z datą w PRZYSZŁOŚCI niesie „Odwołane"',
    odwolanaPrzyszla !== null && plakietkaPozycji(odwolanaPrzyszla) === PLAKIETKI_WYKONANIA.odwolane,
    `plakietka=${odwolanaPrzyszla === null ? 'BRAK POZYCJI' : String(plakietkaPozycji(odwolanaPrzyszla))}`);
  check('⛔ …i brzmienie jest DOKŁADNIE tym ze stałej pasa K1 — zero nowych słów (O92)',
    odwolanaPrzyszla !== null && plakietkaPozycji(odwolanaPrzyszla) === 'Odwołane',
    PLAKIETKI_WYKONANIA.odwolane);
  check('⭐ D1 URUCHOMIENIOWO — pozycja ZAPLANOWANA z datą w przyszłości nie niesie NIC',
    zaplanowanaPrzyszla !== null && plakietkaPozycji(zaplanowanaPrzyszla) === null,
    `plakietka=${zaplanowanaPrzyszla === null ? 'BRAK POZYCJI' : String(plakietkaPozycji(zaplanowanaPrzyszla))}`);
  check('⛔ …i „Zaplanowane" nie powstało jako nowe słowo dokładane do planu',
    zaplanowanaPrzyszla !== null && plakietkaPozycji(zaplanowanaPrzyszla) !== 'Zaplanowane',
    String(zaplanowanaPrzyszla === null ? 'BRAK' : plakietkaPozycji(zaplanowanaPrzyszla)));
  check('⭐ pozycja odwołana z datą DZISIEJSZĄ też niesie „Odwołane" (dziś nie jest przeszłością)',
    odwolanaDzis !== null && plakietkaPozycji(odwolanaDzis) === PLAKIETKI_WYKONANIA.odwolane,
    `plakietka=${odwolanaDzis === null ? 'BRAK POZYCJI' : String(plakietkaPozycji(odwolanaDzis))}`);

  // ⭐ ASERCJA ODWROTNA — TEN PAS NIE MA PRAWA RUSZYĆ `rozstrzygnijWykonanie`.
  // Odwołanie jest drugą, OSOBNĄ informacją; gdyby ktoś „uprościł" to tak, że
  // reguła wykonania zaczyna orzekać o przyszłości, produkt zacząłby mówić
  // o dniu, który jeszcze nie nastał.
  const wykonaniePrzyszle = rozstrzygnijWykonanie({
    idWydarzenia: 900, dzien: '2026-08-20', przeszle: false, status: 'cancelled',
    zRegulyCyklicznej: false, wpisyDziennika: new Set<number>(), werdykty: BRAK,
  });
  check('⭐ ASERCJA ODWROTNA — `rozstrzygnijWykonanie` dla PRZYSZŁOŚCI nadal oddaje `null`',
    wykonaniePrzyszle === null, String(wykonaniePrzyszle));
  check('⛔ …także dla pozycji ZAPLANOWANEJ w przyszłości',
    rozstrzygnijWykonanie({
      idWydarzenia: 901, dzien: '2026-08-20', przeszle: false, status: 'scheduled',
      zRegulyCyklicznej: false, wpisyDziennika: new Set<number>(), werdykty: BRAK,
    }) === null, 'reguła wykonania zaczęła orzekać o przyszłości');
  check('⛔ …i pozycja odwołana PRZESZŁA nadal ma stan `odwolane` (nic się nie cofnęło)',
    rozstrzygnijWykonanie({
      idWydarzenia: 902, dzien: '2026-08-10', przeszle: true, status: 'cancelled',
      zRegulyCyklicznej: false, wpisyDziennika: new Set<number>(), werdykty: BRAK,
    }) === 'odwolane');

  // ── OBOWIĄZYWANIE — REGUŁA BEZ DATY W WEJŚCIU ────────────────────────
  check('⭐ `rozstrzygnijObowiazywanie` oddaje `odwolane` dla `cancelled`',
    rozstrzygnijObowiazywanie({ status: 'cancelled' }) === 'odwolane');
  check('⛔ …i `obowiazuje` dla `scheduled` oraz `completed`',
    rozstrzygnijObowiazywanie({ status: 'scheduled' }) === 'obowiazuje'
    && rozstrzygnijObowiazywanie({ status: 'completed' }) === 'obowiazuje');
  check('⛔ …i `obowiazuje` dla statusu SPOZA znanych — nie zgadujemy odwołania',
    rozstrzygnijObowiazywanie({ status: 'cokolwiek_nowego' }) === 'obowiazuje');

  // ⛔ STAN WYKONANIA WYGRYWA, GDY ISTNIEJE — inaczej pozycja odwołana, którą
  // zawodnik oświadczył jako odbytą („Zrobione"), dostałaby „Odwołane".
  check('⭐ `plakietkaPozycji` przy istniejącym stanie wykonania oddaje TEN stan',
    plakietkaPozycji({ stanPrzeszly: 'odbylo_sie', obowiazywanie: 'odwolane' })
      === PLAKIETKI_WYKONANIA.odbylo_sie,
    String(plakietkaPozycji({ stanPrzeszly: 'odbylo_sie', obowiazywanie: 'odwolane' })));
  check('⛔ …i nic nie niesie, gdy nie ma ani stanu, ani odwołania',
    plakietkaPozycji({ stanPrzeszly: null, obowiazywanie: 'obowiazuje' }) === null);

  // ── O71 — EKRANY BIORĄ PLAKIETKĘ Z PRODUCENTA, NIE INDEKSUJĄ SAME ────
  //
  // ⛔ Ekran, który sam pisze `PLAKIETKI_…[p.stanPrzeszly]` pod warunkiem
  // `p.stanPrzeszly !== null`, JEST tym defektem. Pytamy o żywy kod obu
  // ekranów planu.
  for (const ekran of ['app/(tabs)/dzis.tsx', 'app/(tabs)/kalendarz.tsx']) {
    const tresc = czytajPlikRepo('app', ekran.slice('app/'.length));
    check(`⛔ O75 — \`${ekran}\` da się odczytać`, tresc !== null, `brak pliku: ${ekran}`);
    if (tresc === null) continue;
    const zywy = zywyKod(tresc);
    check(`⭐ \`${ekran}\` bierze plakietkę WIERSZA z \`plakietkaPozycji\``,
      /plakietkaPozycji\(/.test(zywy), 'ekran nie woła jedynego producenta plakietki');
    check(`⛔ …i NIE indeksuje tabeli po \`p.stanPrzeszly\` na własną rękę`,
      !/PLAKIETKI_STANU_PRZESZLEGO\[\s*p\.stanPrzeszly\s*\]/.test(zywy),
      'wróciło indeksowanie po samym stanie przeszłym — pozycja odwołana w przyszłości znów zniknie');
  }
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
