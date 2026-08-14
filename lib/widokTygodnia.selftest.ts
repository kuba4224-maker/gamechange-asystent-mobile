// PLAN-D-C1 08.2026 (14.08.2026) — STRAŻNIK WIDOKU TYGODNIA.
//
//   npx tsx lib/widokTygodnia.selftest.ts
//
// (albo `node tests/run-selftests.mjs`, który odkrywa ten plik sam — runner
// czyta katalog `lib/`, więc nie ma listy, do której trzeba by dopisać ten plik;
// zero konfliktu z pasami, które pracują równolegle w tym samym repozytorium.)
//
// ⛔ ZAKAZ `new URL(...)` — O53, TS2769.
//
// ═══════════════════════════════════════════════════════════════════════════
// SZEŚĆ GRUP ASERCJI — I DLACZEGO SZÓSTA ISTNIEJE
//
//   (1) siedem dni ZAWSZE, także przy zerze wydarzeń,
//   (2) zdanie nad tygodniem NIE POWSTAJE bez policzonych liczb,
//   (3) kolizja wymaga OBU godzin,
//   (4) godzina wychodzi TYLKO wtedy, gdy zawodnik ją podał,
//   (5) dzień przeszły bez wpisu ≠ „nie wykonano",
//   (6) ⭐ KOMPLET DANYCH → tydzień MUSI mieć pozycje, wagę i zdanie.
//
// Grupy 1–5 są spełnialne przez FUNKCJĘ, KTÓRA NIGDY NIC NIE ZWRACA: pusty
// tydzień nie ma godzin, nie ma kolizji, nie ma zdania i nie ma stanów dnia
// przeszłego. Suita byłaby zielona, a produkt pusty. Grupa (6) podaje dane,
// przy których tydzień MUSI mieć treść, i sprawdza, że ją ma. To jest ta sama
// dziura, którą pas A7 zamknął asercją „rysuje OBIE gałęzie".
//
// (7) to grupa ponad wymagane sześć: asercje na ŹRÓDŁO ekranu. Reguła, która
// żyje wyłącznie w `lib/`, nie jest obietnicą spełnioną — obietnica jest
// spełniona wtedy, gdy ekran ją rysuje (O58).
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parsujPlanLekcji, type WierszPlanuLekcji } from './planLekcji';
import { RODZAJE_WYDARZEN } from './meczWKalendarzu';
import {
  zbudujTydzien,
  czyPlanLekcjiZnany,
  datyTygodnia,
  przesunTydzien,
  zakresDat,
  dniReguly,
  klasaKropki,
  liczbaPozycji,
  opisTygodniaDoLogu,
  PUNKTY_RODZAJU,
  PROGI_WAGI,
  SLOWA_WAGI,
  KOLEJNOSC_SLOW_WAGI,
  LEGENDA_KROPEK,
  PODPIS_DNIA_BEZ_POZYCJI,
  OPIS_WAGI_DZIEN_MECZOWY,
  PASEK_WOLNE,
  type PozycjaDnia,
  type WierszWydarzenia,
  type WejscieTygodnia,
} from './widokTygodnia';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

// ── DANE ───────────────────────────────────────────────────────────────────
// Tydzień 10–16.08.2026 — ten sam, który rysuje makieta. „Dziś" = poniedziałek
// 10.08, więc wtorek…niedziela są przyszłe, a nic nie jest przeszłe; osobny
// blok niżej przesuwa „dziś" na piątek, żeby dostać dni przeszłe.
const PONIEDZIALEK = '2026-08-10';
const DZIS_PONIEDZIALEK = '2026-08-10';

const e = (
  id: number, title: string, event_type: string, scheduled_date: string | null,
  extra: Partial<WierszWydarzenia> = {},
): WierszWydarzenia => ({
  id,
  title,
  event_type,
  status: 'scheduled',
  scheduled_date,
  scheduled_time: null,
  recurrence_rule: null,
  source: 'player',
  ...extra,
});

const w = (
  on_date: string, weekday: number, timetable_id: number | null,
  starts_at: string | null, ends_at: string | null,
): WierszPlanuLekcji => ({ on_date, weekday, timetable_id, starts_at, ends_at });

/** Plan lekcji zawodnika, który go PODAŁ: szkoła pon–pt, weekend wolny. */
const PLAN_PODANY = parsujPlanLekcji([
  w('2026-08-10', 1, 7, '08:00:00', '15:30:00'),
  w('2026-08-11', 2, 7, '08:00:00', '16:30:00'),
  w('2026-08-12', 3, 7, '08:00:00', '15:30:00'),
  w('2026-08-13', 4, 7, '08:00:00', '15:30:00'),
  w('2026-08-14', 5, 7, '08:00:00', '14:00:00'),
  w('2026-08-15', 6, 7, null, null),
  w('2026-08-16', 7, 7, null, null),
]);

/** Ten sam tydzień u zawodnika, który planu NIE PODAŁ. */
const PLAN_NIEPODANY = parsujPlanLekcji([
  w('2026-08-10', 1, null, null, null),
  w('2026-08-11', 2, null, null, null),
]);

/** Odczyt planu, który SIĘ NIE UDAŁ. To jest coś innego niż brak planu. */
const PLAN_NIEODCZYTANY = parsujPlanLekcji(null);

/** ⭐ KOMPLET: dokładnie ten tydzień, który rysuje makieta. */
const TYDZIEN_MAKIETY: WierszWydarzenia[] = [
  e(1, 'Blok: Moc — sesja 12 z 24', 'micro_session', '2026-08-10', { source: 'system' }),
  e(2, 'Trening klubowy', 'club_training', '2026-08-10'),
  e(3, 'Trening klubowy', 'club_training', '2026-08-11', { scheduled_time: '18:00:00' }),
  e(4, 'Blok: Moc — sesja 13 z 24', 'micro_session', '2026-08-12', { source: 'system' }),
  e(5, 'Zamów wizytę u fizjo', 'task', '2026-08-12'),
  e(6, 'Trening klubowy', 'club_training', '2026-08-14'),
  e(7, 'Mecz — Parasol vs Orzeł', 'match', '2026-08-15', { scheduled_time: '11:00:00' }),
  // czwartek 13.08 i niedziela 16.08 — bez niczego (dwa dni bez nic)
];

const bazowe = (nad: Partial<WejscieTygodnia> = {}): WejscieTygodnia => ({
  poniedzialek: PONIEDZIALEK,
  dzisiaj: DZIS_PONIEDZIALEK,
  wydarzenia: [],
  planLekcji: null,
  wpisyDziennika: new Set<number>(),
  ...nad,
});

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n(1) SIEDEM DNI ZAWSZE — tydzień nie kurczy się do dni z treścią');
// ═══════════════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: implementacja „po wydarzeniach" (grupuj po dacie,
// wypisz klucze) daje tyle wierszy, ile jest dni Z TREŚCIĄ. Wtedy pusty tydzień
// to pusty ekran, a tydzień z dwoma wpisami to dwa wiersze — i zawodnik nie ma
// jak zobaczyć, że czwartek jest wolny. Cały sens tego widoku znika po cichu.
{
  const pusty = zbudujTydzien(bazowe({ wydarzenia: [] }));
  check('zero wydarzeń → nadal SIEDEM wierszy dni',
    pusty.dni.length === 7, `${pusty.dni.length}`);

  const nieodczytany = zbudujTydzien(bazowe({ wydarzenia: null }));
  check('nieudany odczyt wydarzeń → nadal SIEDEM wierszy dni',
    nieodczytany.dni.length === 7, `${nieodczytany.dni.length}`);

  const pelny = zbudujTydzien(bazowe({ wydarzenia: TYDZIEN_MAKIETY }));
  check('komplet wydarzeń → też dokładnie SIEDEM, ani jednego więcej',
    pelny.dni.length === 7, `${pelny.dni.length}`);

  check('dni idą po kolei od poniedziałku do niedzieli, bez dziur',
    pelny.dni.map((d) => d.data).join(',')
      === '2026-08-10,2026-08-11,2026-08-12,2026-08-13,2026-08-14,2026-08-15,2026-08-16',
    pelny.dni.map((d) => d.data).join(','));

  check('numeracja dnia tygodnia jest ISO (1 = poniedziałek … 7 = niedziela)',
    pelny.dni.map((d) => d.dzienTygodnia).join(',') === '1,2,3,4,5,6,7',
    pelny.dni.map((d) => d.dzienTygodnia).join(','));

  check('⛔ nieudany odczyt to NIE jest pustka — dzień ma stan `nie_wiem`, nie `pusto`',
    nieodczytany.dni.every((d) => d.stan === 'nie_wiem')
    && pusty.dni.every((d) => d.stan === 'pusto'),
    `${nieodczytany.dni[0].stan} / ${pusty.dni[0].stan}`);

  check('⛔ …i nieodczytany dzień NIE dostaje podpisu „Nic zaplanowanego."',
    nieodczytany.dni.every((d) => d.podpisPustegoDnia === null)
    && pusty.dni.every((d) => d.podpisPustegoDnia === PODPIS_DNIA_BEZ_POZYCJI),
    String(nieodczytany.dni[0].podpisPustegoDnia));

  check('dzisiejszy dzień jest wyróżniony DOKŁADNIE JEDEN raz (WT-07)',
    pelny.dni.filter((d) => d.dzisiaj).length === 1
    && pelny.dni.find((d) => d.dzisiaj)?.data === DZIS_PONIEDZIALEK,
    JSON.stringify(pelny.dni.filter((d) => d.dzisiaj).map((d) => d.data)));

  check('nagłówek podaje zakres dat (WT-05)',
    pelny.zakresDat === '10–16 SIERPNIA', pelny.zakresDat);

  check('zakres dat przez granicę miesiąca podaje oba miesiące',
    zakresDat('2026-08-31', '2026-09-06') === '31 SIERPNIA–6 WRZEŚNIA',
    zakresDat('2026-08-31', '2026-09-06'));

  check('strzałki ‹ › przesuwają o dokładnie siedem dni (WT-04)',
    przesunTydzien(PONIEDZIALEK, -1) === '2026-08-03'
    && przesunTydzien(PONIEDZIALEK, 1) === '2026-08-17',
    `${przesunTydzien(PONIEDZIALEK, -1)} / ${przesunTydzien(PONIEDZIALEK, 1)}`);

  check('strzałka przez granicę roku nie gubi się',
    przesunTydzien('2026-12-28', 1) === '2027-01-04', String(przesunTydzien('2026-12-28', 1)));

  check('zła data nie daje losowego tygodnia, tylko `null` / pustą listę',
    przesunTydzien('nie-data', 1) === null && datyTygodnia('nie-data').length === 0,
    String(przesunTydzien('nie-data', 1)));

  check('etykieta wiersza ma skrót dnia i numer, jak w makiecie („PON 10")',
    pelny.dni[0].etykieta === 'PON 10' && pelny.dni[5].etykieta === 'SOB 15',
    `${pelny.dni[0].etykieta} / ${pelny.dni[5].etykieta}`);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n(2) ZDANIE NAD TYGODNIEM NIE POWSTAJE BEZ LICZB');
// ═══════════════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: zdanie „ogólne" zamiast policzonego. Produkt, który
// przy zerze danych mówi „spokojny tydzień", mówi zawodnikowi rzecz, której nie
// zmierzył (Z0). Ma wtedy MILCZEĆ, a o pustce mówi `lib/trzyPustki.ts`.
{
  const pusty = zbudujTydzien(bazowe({ wydarzenia: [] }));
  check('⛔ zero pozycji → zdanie NIE POWSTAJE (jest `null`, nie puste, nie ogólne)',
    pusty.zdanie === null, JSON.stringify(pusty.zdanie));

  const nieodczytany = zbudujTydzien(bazowe({ wydarzenia: null }));
  check('⛔ nieudany odczyt → zdanie NIE POWSTAJE',
    nieodczytany.zdanie === null, JSON.stringify(nieodczytany.zdanie));

  const tylkoAnulowane = zbudujTydzien(bazowe({
    wydarzenia: [e(9, 'Trening klubowy', 'club_training', '2026-08-11', { status: 'cancelled' })],
  }));
  check('⛔ same anulowane pozycje → zdanie NIE POWSTAJE (nie ma czego podsumować)',
    tylkoAnulowane.zdanie === null, JSON.stringify(tylkoAnulowane.zdanie));

  const jedenTrening = zbudujTydzien(bazowe({
    wydarzenia: [e(10, 'Trening klubowy', 'club_training', '2026-08-11')],
  }));
  check('jedna pozycja WYSTARCZY, żeby zdanie powstało — i jest policzone',
    jedenTrening.zdanie?.podsumowanie === 'Jeden trening, sześć dni bez nic.',
    String(jedenTrening.zdanie?.podsumowanie));

  check('⛔ część o napięciu jest OSOBNA i bez planu lekcji nie powstaje',
    jedenTrening.zdanie?.napiecie === null, String(jedenTrening.zdanie?.napiecie));

  const dwaMecze = zbudujTydzien(bazowe({
    wydarzenia: [
      e(11, 'Mecz A', 'match', '2026-08-15'),
      e(12, 'Mecz B', 'match', '2026-08-16'),
    ],
  }));
  check('dwa mecze — zdanie podaje liczbę, a nie zgaduje jednego dnia',
    dwaMecze.zdanie?.podsumowanie === 'Dwa mecze, pięć dni bez nic.',
    String(dwaMecze.zdanie?.podsumowanie));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n(3) KOLIZJA WYMAGA OBU GODZIN — inaczej NIE MA OSTRZEŻENIA');
// ═══════════════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: ostrzeżenie „na wszelki wypadek". Ostrzeżenie
// o ciasnocie, które powstaje bez godziny szkoły ALBO bez godziny wydarzenia,
// jest zgadywaniem o dniu zawodnika — i to zgadywaniem, które popycha go do
// zmiany planu. Brak którejkolwiek liczby = brak ostrzeżenia, kropka.
{
  const trening18 = e(20, 'Trening klubowy', 'club_training', '2026-08-11', { scheduled_time: '18:00:00' });
  const treningBezGodziny = e(21, 'Trening klubowy', 'club_training', '2026-08-11');

  const obie = zbudujTydzien(bazowe({ wydarzenia: [trening18], planLekcji: PLAN_PODANY }));
  const wtorek = obie.dni[1];
  check('OBIE godziny są → ostrzeżenie powstaje i podaje liczbę minut',
    wtorek.napiecie?.stan === 'CIASNO' && wtorek.napiecie?.minut === 90,
    JSON.stringify(wtorek.napiecie));

  check('…i jego treść nazywa obie strony (WT-11)',
    wtorek.napiecie?.tekst === 'ciasno — szkoła do 16:30, Trening klubowy o 18:00',
    String(wtorek.napiecie?.tekst));

  const bezGodzinyWydarzenia = zbudujTydzien(bazowe({
    wydarzenia: [treningBezGodziny], planLekcji: PLAN_PODANY,
  }));
  check('⛔ brak godziny WYDARZENIA → BRAK ostrzeżenia',
    bezGodzinyWydarzenia.dni[1].napiecie === null,
    JSON.stringify(bezGodzinyWydarzenia.dni[1].napiecie));

  const bezPlanu = zbudujTydzien(bazowe({ wydarzenia: [trening18], planLekcji: PLAN_NIEPODANY }));
  check('⛔ brak godzin SZKOŁY → BRAK ostrzeżenia',
    bezPlanu.dni[1].napiecie === null, JSON.stringify(bezPlanu.dni[1].napiecie));

  check('⛔ …a zamiast niego jawne „nie wiemy, kiedy masz szkołę" (WT-31)',
    bezPlanu.planLekcjiZnany === false && bezPlanu.dni[1].pasekZajetosci.stan === 'NIE_WIEM',
    `${String(bezPlanu.planLekcjiZnany)} / ${bezPlanu.dni[1].pasekZajetosci.stan}`);

  const nieodczytanyPlan = zbudujTydzien(bazowe({
    wydarzenia: [trening18], planLekcji: PLAN_NIEODCZYTANY,
  }));
  check('⛔ NIEUDANY ODCZYT planu ≠ „zawodnik nie podał planu" — `null`, nie `false`',
    nieodczytanyPlan.planLekcjiZnany === null && czyPlanLekcjiZnany(PLAN_NIEPODANY) === false
    && czyPlanLekcjiZnany(PLAN_PODANY) === true && czyPlanLekcjiZnany(null) === null,
    String(nieodczytanyPlan.planLekcjiZnany));

  const kolizja = zbudujTydzien(bazowe({
    wydarzenia: [e(22, 'Trening klubowy', 'club_training', '2026-08-11', { scheduled_time: '16:00:00' })],
    planLekcji: PLAN_PODANY,
  }));
  check('wydarzenie PRZED końcem szkoły to KOLIZJA, a nie „ciasno"',
    kolizja.dni[1].napiecie?.stan === 'KOLIZJA' && kolizja.dni[1].napiecie?.minut === -30,
    JSON.stringify(kolizja.dni[1].napiecie));

  check('dzień WOLNY od szkoły nie produkuje ostrzeżenia, choć ma godzinę',
    zbudujTydzien(bazowe({
      wydarzenia: [e(23, 'Mecz', 'match', '2026-08-15', { scheduled_time: '11:00:00' })],
      planLekcji: PLAN_PODANY,
    })).dni[5].napiecie === null, 'sobota jest wolna od szkoły');

  check('pasek zajętości podaje godziny szkoły albo „wolne" (WT-10)',
    obie.dni[0].pasekZajetosci.podpis === '08:00–15:30'
    && obie.dni[5].pasekZajetosci.podpis === PASEK_WOLNE,
    `${String(obie.dni[0].pasekZajetosci.podpis)} / ${String(obie.dni[5].pasekZajetosci.podpis)}`);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n(4) GODZINA WYCHODZI TYLKO WTEDY, GDY ZAWODNIK JĄ PODAŁ');
// ═══════════════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: `'—'` albo `''` w miejscu godziny. Jedno i drugie
// WYGLĄDA NA EKRANIE JAK DANA — zawodnik widzi pole, w którym „coś jest", i nie
// odróżni „nie podałem" od „system zgubił". Stopka makiety rozstrzyga to jednym
// zdaniem: „Godzina przy kaflu pojawia się tylko wtedy, gdy zawodnik ją podał".
{
  const t = zbudujTydzien(bazowe({ wydarzenia: TYDZIEN_MAKIETY }));
  // ⚠️ Dostęp przez `?.` — strażnik ma ZGŁOSIĆ FAIL, a nie wywrócić się
  // wyjątkiem, gdy tydzień przestanie zwracać pozycje. Wywrócony strażnik też
  // nie daje zielonego, ale nie mówi, KTÓRA reguła padła.
  const wtorek = t.dni[1].pozycje[0] as PozycjaDnia | undefined;
  const poniedzialek = t.dni[0].pozycje[0] as PozycjaDnia | undefined;

  check('godzina podana → `HH:MM`, znormalizowane z `18:00:00` z PostgREST',
    wtorek?.godzina === '18:00', String(wtorek?.godzina));

  check('⛔ godzina NIEpodana → `null`, czyli BRAK POLA — nie „—" i nie ""',
    poniedzialek !== undefined && poniedzialek.godzina === null, JSON.stringify(poniedzialek?.godzina));

  const wszystkie = t.dni.flatMap((d) => d.pozycje).map((p) => p.godzina);
  check('⛔ w całym tygodniu nie ma ani jednej godziny będącej pustym napisem lub myślnikiem',
    wszystkie.every((g) => g === null || /^\d{2}:\d{2}$/.test(g)),
    JSON.stringify(wszystkie));

  check('dokładnie DWIE pozycje mają godzinę — te dwie, które ją mają w danych',
    wszystkie.filter((g) => g !== null).length === 2,
    JSON.stringify(wszystkie.filter((g) => g !== null)));

  check('godzina spoza zegara (z bazy) nie jest „naprawiana", tylko znika',
    zbudujTydzien(bazowe({
      wydarzenia: [e(30, 'X', 'task', '2026-08-10', { scheduled_time: '25:00:00' })],
    })).dni[0].pozycje[0]?.godzina === null, 'godzina 25:00 nie ma prawa być pokazana');
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n(5) ⭐ DZIEŃ PRZESZŁY MA TRZY STANY — brak wpisu ≠ „nie wykonano"');
// ═══════════════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje — i to jest defekt, który BYŁ NA EKRANIE do 14.08.2026:
// `kalendarz.tsx` renderował KAŻDĄ przeszłą pozycję bez wpisu w dzienniku jako
// „Nie wykonano". Czyli produkt ZGADYWAŁ PRZECIWKO ZAWODNIKOWI: brak danych
// zamieniał w oskarżenie. Trzy stany z WG-05 są odpowiedzią:
//   odbyło się · nie odbyło się · brak wpisu (nie wiemy).
{
  const DZIS_PIATEK = '2026-08-14';
  const przeszle: WierszWydarzenia[] = [
    e(40, 'Sesja zaliczona', 'micro_session', '2026-08-10', { status: 'completed' }),
    e(41, 'Trening odwołany', 'club_training', '2026-08-11', { status: 'cancelled' }),
    e(42, 'Trening bez wpisu', 'club_training', '2026-08-12'),
    e(43, 'Trening z wpisem', 'club_training', '2026-08-13'),
  ];
  const t = zbudujTydzien(bazowe({
    wydarzenia: przeszle, dzisiaj: DZIS_PIATEK, wpisyDziennika: new Set([43]),
  }));
  const stan = (id: number) =>
    t.dni.flatMap((d) => d.pozycje).find((p) => p.id === id)?.stanPrzeszly ?? null;

  check('stan 1/3 — „odbyło się" (status `completed` albo wpis w dzienniku)',
    stan(40) === 'odbylo_sie' && stan(43) === 'odbylo_sie',
    `${String(stan(40))} / ${String(stan(43))}`);

  check('stan 2/3 — „nie odbyło się" (ktoś tę pozycję anulował)',
    stan(41) === 'nie_odbylo_sie', String(stan(41)));

  check('⛔ stan 3/3 — „brak wpisu" JEST OSOBNY i NIE jest „nie odbyło się"',
    stan(42) === 'brak_wpisu' && stan(42) !== stan(41) && stan(42) !== stan(40),
    String(stan(42)));

  check('trzy stany są trzema RÓŻNYMI wartościami, a nie dwiema pod trzema nazwami',
    new Set([stan(40), stan(41), stan(42)]).size === 3,
    JSON.stringify([stan(40), stan(41), stan(42)]));

  check('⛔ dzień PRZYSZŁY nie dostaje żadnego z tych stanów — nie ma o czym rozstrzygać',
    zbudujTydzien(bazowe({ wydarzenia: TYDZIEN_MAKIETY }))
      .dni.flatMap((d) => d.pozycje).every((p) => p.stanPrzeszly === null),
    'przyszła pozycja dostała stan dnia przeszłego');

  const bezDziennika = zbudujTydzien(bazowe({
    wydarzenia: przeszle, dzisiaj: DZIS_PIATEK, wpisyDziennika: null,
  }));
  const stanBez = (id: number) =>
    bezDziennika.dni.flatMap((d) => d.pozycje).find((p) => p.id === id)?.stanPrzeszly ?? null;
  check('⛔ NIEUDANY ODCZYT dziennika ≠ „brak wpisu" — czwarty stan, `nie_odczytano`',
    stanBez(42) === 'nie_odczytano' && stanBez(41) === 'nie_odbylo_sie'
    && stanBez(40) === 'odbylo_sie',
    `${String(stanBez(42))} / ${String(stanBez(41))}`);

  // Cykliczne: wpis w dzienniku wskazuje na WIERSZ REGUŁY, nie na pojedynczy
  // wtorek. Użycie go tutaj oznaczałoby „odbyło się" dla każdego wtorku
  // w historii po jednym wpisie — czyli produkt policzyłby zawodnikowi pracę,
  // której nie wykonał.
  const cykliczne = zbudujTydzien(bazowe({
    dzisiaj: DZIS_PIATEK,
    wydarzenia: [e(50, 'Trening klubowy', 'club_training', null, {
      recurrence_rule: 'weekly:MON,TUE',
    })],
    wpisyDziennika: new Set([50]),
  }));
  check('⛔ pozycja z reguły cyklicznej NIGDY nie dostaje „odbyło się" z wpisu reguły',
    cykliczne.dni[0].pozycje[0]?.stanPrzeszly === 'brak_wpisu'
    && cykliczne.dni[0].pozycje[0]?.zRegulyCyklicznej === true,
    String(cykliczne.dni[0].pozycje[0]?.stanPrzeszly));

  check('reguła cykliczna rozwija się w KAŻDY swój dzień (inaczej znika z tygodnia)',
    cykliczne.dni[0].pozycje.length === 1 && cykliczne.dni[1].pozycje.length === 1
    && cykliczne.dni[2].pozycje.length === 0,
    JSON.stringify(cykliczne.dni.map((d) => d.pozycje.length)));

  check('reguła ANULOWANA nie obowiązuje w żaden dzień',
    liczbaPozycji(zbudujTydzien(bazowe({
      wydarzenia: [e(51, 'X', 'club_training', null, {
        recurrence_rule: 'weekly:MON', status: 'cancelled',
      })],
    }))) === 0, 'anulowana reguła nadal się rozwija');

  check('⛔ reguły, której nie umiem przeczytać, NIE GUBIĘ PO CICHU',
    (() => {
      const t2 = zbudujTydzien(bazowe({
        wydarzenia: [e(52, 'Dziwna reguła', 'club_training', null, {
          recurrence_rule: 'monthly:3',
        })],
      }));
      return t2.nieumieszczone.length === 1 && t2.nieumieszczone[0].id === 52;
    })(),
    'pozycja z nieczytelną regułą zniknęła bez śladu');

  check('czytanie reguł ma jedno źródło kodów dni (`DAYS_OF_WEEK`)',
    JSON.stringify(dniReguly('weekly:MON,WED,SUN')) === '[1,3,7]'
    && dniReguly('weekly:XYZ') === null && dniReguly(null) === null,
    JSON.stringify(dniReguly('weekly:MON,WED,SUN')));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n(6) ⭐ ASERCJA DOMYKAJĄCA — komplet danych MUSI dać treść');
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ PIĘĆ POWYŻSZYCH GRUP JEST SPEŁNIALNYCH PRZEZ FUNKCJĘ, KTÓRA NIGDY NIC NIE
// ZWRACA. Pusty tydzień nie ma godzin (4), nie ma kolizji (3), nie ma zdania (2),
// nie ma stanów dnia przeszłego (5) i bez trudu ma siedem pustych wierszy (1).
// Ta grupa podaje KOMPLET danych — dokładnie tydzień z makiety — i sprawdza, że
// tydzień MA pozycje, MA wagę i MA zdanie. Bez niej „zielono" nie znaczy nic.
{
  const t = zbudujTydzien(bazowe({
    wydarzenia: TYDZIEN_MAKIETY, planLekcji: PLAN_PODANY, wpisyDziennika: new Set<number>(),
  }));

  check('⭐ tydzień MA pozycje — siedem, tyle ile podano',
    liczbaPozycji(t) === 7, `${liczbaPozycji(t)}`);

  check('⭐ pozycje trafiły w te dni, w które trafić miały',
    t.dni.map((d) => d.pozycje.length).join(',') === '2,1,2,0,1,1,0',
    t.dni.map((d) => d.pozycje.length).join(','));

  check('⭐ tydzień MA zdanie podsumowujące, policzone z wierszy (WT-08)',
    t.zdanie?.podsumowanie === 'Trzy treningi, dwie sesje, mecz w sobotę, dwa dni bez nic.',
    String(t.zdanie?.podsumowanie));

  check('⭐ tydzień MA zdanie o napięciu i mówi, KTÓRY dzień jest najciaśniejszy (WT-09)',
    t.zdanie?.napiecie === 'Najciaśniej we wtorek — zostaje ci tam 90 minut.'
    && t.dzienNajciasniejszy === '2026-08-11',
    `${String(t.zdanie?.napiecie)} / ${String(t.dzienNajciasniejszy)}`);

  check('⭐ KAŻDY dzień z pozycjami MA wagę różną od „pusty" i „nie_wiem"',
    t.dni.filter((d) => d.pozycje.length > 0).every((d) => d.waga !== 'pusty' && d.waga !== 'nie_wiem'),
    JSON.stringify(t.dni.map((d) => `${d.data}:${d.waga}`)));

  check('⭐ KAŻDY dzień z pozycjami MA opis wagi (WG-07)',
    t.dni.filter((d) => d.pozycje.length > 0).every((d) => (d.opisWagi ?? '').length > 0),
    JSON.stringify(t.dni.map((d) => d.opisWagi)));

  check('⭐ opis wagi brzmi tak jak w makiecie („Sesja + klub", „Dzień meczowy")',
    t.dni[0].opisWagi === 'Sesja + klub' && t.dni[5].opisWagi === OPIS_WAGI_DZIEN_MECZOWY,
    `${String(t.dni[0].opisWagi)} / ${String(t.dni[5].opisWagi)}`);

  check('⭐ WG-03 — dzień meczowy jest NAJCIĘŻSZY sam z siebie, bez czytania legendy',
    t.dni[5].waga === 'ciezki'
    && t.dni.filter((d) => d.waga === 'ciezki').length === 1
    && PUNKTY_RODZAJU.match >= PROGI_WAGI[0].odPunktow,
    JSON.stringify(t.dni.map((d) => `${d.etykieta}:${d.waga}`)));

  check('⭐ dwa dni bez nic mają podpis, a nie znikają (WT-16)',
    t.dni[3].podpisPustegoDnia === PODPIS_DNIA_BEZ_POZYCJI
    && t.dni[6].podpisPustegoDnia === PODPIS_DNIA_BEZ_POZYCJI
    && t.dni[3].stan === 'pusto',
    JSON.stringify([t.dni[3].podpisPustegoDnia, t.dni[6].podpisPustegoDnia]));

  check('⭐ każda pozycja ma kropkę rozstrzygniętą regułą, żadna nie jest „nieznana"',
    t.dni.flatMap((d) => d.pozycje).every((p) => p.kropka !== 'nieznana'),
    JSON.stringify(t.dni.flatMap((d) => d.pozycje).map((p) => p.kropka)));

  check('⭐ źródło pozycji jest rozstrzygnięte przez `opiszZrodlo` i rozróżnia system od zawodnika',
    t.dni[0].pozycje[0]?.zrodlo.opis === 'system zaplanował'
    && t.dni[0].pozycje[1]?.zrodlo.opis === 'Ty to dodałeś',
    `${t.dni[0].pozycje[0]?.zrodlo.opis} / ${t.dni[0].pozycje[1]?.zrodlo.opis}`);

  check('⭐ nic się nie zgubiło — lista „nieumieszczonych" jest pusta',
    t.nieumieszczone.length === 0, JSON.stringify(t.nieumieszczone));

  check('⭐ log niesie stan trzech odczytów, żeby dało się to zdiagnozować po fakcie',
    /odczyt\(wydarzenia=true, dziennik=true, plan=true\)/.test(opisTygodniaDoLogu(t)),
    opisTygodniaDoLogu(t));

  // ── Tabela stałych: komplet i porządek ─────────────────────────────
  check('tabela punktów zna KAŻDY z pięciu rodzajów, które przepuszcza baza',
    RODZAJE_WYDARZEN.every((r) => typeof PUNKTY_RODZAJU[r] === 'number')
    && Object.keys(PUNKTY_RODZAJU).length === RODZAJE_WYDARZEN.length,
    JSON.stringify(PUNKTY_RODZAJU));

  check('…i tabela słów opisu wagi też — rodzaj z bazy nie może zostać bez słowa',
    RODZAJE_WYDARZEN.every((r) => (SLOWA_WAGI[r] ?? '').length > 0)
    && RODZAJE_WYDARZEN.every((r) => KOLEJNOSC_SLOW_WAGI.includes(r))
    && KOLEJNOSC_SLOW_WAGI.length === RODZAJE_WYDARZEN.length,
    JSON.stringify(SLOWA_WAGI));

  check('progi wagi stoją malejąco — inaczej pierwszy pasujący byłby zawsze ten sam',
    PROGI_WAGI.every((p, i) => i === 0 || PROGI_WAGI[i - 1].odPunktow > p.odPunktow)
    && PROGI_WAGI[PROGI_WAGI.length - 1].odPunktow === 0,
    JSON.stringify(PROGI_WAGI));

  check('legenda opisuje każdą klasę kropki, która może wyjść z reguły (WT-18)',
    LEGENDA_KROPEK.length === 4
    && RODZAJE_WYDARZEN.every((r) =>
      LEGENDA_KROPEK.some((l) => l.kropka === klasaKropki({ znany: true, id: r }, opisZrodlaPusty()))),
    JSON.stringify(LEGENDA_KROPEK.map((l) => l.kropka)));

  check('⛔ rodzaj spoza piątki gasi wagę dnia zamiast po cichu jej zaniżyć',
    (() => {
      const dziwny = zbudujTydzien(bazowe({
        wydarzenia: [
          e(60, 'Trening na plaży', 'trening_na_plazy', '2026-08-10'),
          e(61, 'Trening klubowy', 'club_training', '2026-08-10'),
        ],
      }));
      return dziwny.dni[0].waga === 'nie_wiem'
        && dziwny.dni[0].pozycje[0]?.kropka === 'nieznana'
        && dziwny.dni[0].pozycje[0]?.rodzaj.znany === false;
    })(),
    'dzień z nieznanym rodzajem udaje, że wie, ile waży');
}

function opisZrodlaPusty() {
  return { znane: false as const, surowy: 'x', opis: 'nie wiemy, skąd ta pozycja' };
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n(7) EKRAN NAPRAWDĘ TO RYSUJE — asercje na źródło (ponad wymagane sześć)');
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ Reguła, która żyje wyłącznie w `lib/`, nie jest obietnicą spełnioną (O58).
// Komentarze wypadają — ten plik i ekran CYTUJĄ zepsute wzorce w wyjaśnieniach,
// więc strażnik czytający surowy tekst zapalałby się na własnej dokumentacji.
{
  const zywy = (s: string) => s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const kalendarz = zywy(readFileSync(join(root, 'app', '(tabs)', 'kalendarz.tsx'), 'utf8'));

  check('kalendarz buduje tydzień wspólną regułą, a nie własną kopią',
    /zbudujTydzien\(/.test(kalendarz), 'brak wywołania `zbudujTydzien`');

  check('kalendarz rysuje SIEDEM wierszy z `tydzien.dni`, a nie z listy dni z treścią',
    /tydzien\.dni\.map\(/.test(kalendarz) || /\.dni\.map\(/.test(kalendarz),
    'brak renderu wierszy dni');

  check('są zakładki Tydzień / Listy (WT-03)',
    /'tydzien'\s*\|\s*'listy'/.test(kalendarz) && /Tydzień/.test(kalendarz) && /Listy/.test(kalendarz),
    'brak przełącznika zakładek');

  check('⛔ WT-34 NIETKNIĘTA — na ekranie nie ma siatki godzinowej',
    !/(godzinyDnia|siatkaGodzin|hourGrid|HOURS\s*=|for\s*\(\s*let\s+h\s*=\s*0;\s*h\s*<\s*24)/.test(kalendarz),
    'w kalendarzu pojawiła się siatka godzinowa — gasi spełnioną obietnicę WT-34');

  check('⛔ `planLekcjiZnany` NIE jest już przybity na stałe do `null` (WT-31)',
    !/planLekcjiZnany:\s*null/.test(kalendarz) && /czyPlanLekcjiZnany\(/.test(kalendarz),
    'gałąź „brak konfiguracji" znów jest nieosiągalna');

  check('⛔ ekran nie zamienia nieudanego odczytu w pustą listę (`?? []`)',
    !/\?\?\s*\[\]/.test(kalendarz), 'wrócił wzorzec `?? []` — „nie odczytałem" udaje „nic nie masz"');

  check('⛔ ekran nie renderuje „Nie wykonano" bez rozstrzygnięcia trzech stanów',
    !/'Nie wykonano'/.test(kalendarz) || /stanPrzeszly/.test(kalendarz),
    'plakietka „Nie wykonano" wróciła jako domysł o zawodniku');

  check('legenda kropek jest na ekranie (WT-18)',
    /LEGENDA_KROPEK/.test(kalendarz), 'brak legendy');

  check('godzinę rysuje wspólna reguła, nie `if (e.scheduled_time)`',
    !/if\s*\(\s*\w+\.scheduled_time\s*\)/.test(kalendarz), 'ekran ma własną regułę godziny');

  check('stare grupowanie NIE ZNIKŁO — żyje pod zakładką „Listy"',
    /Cykliczne/.test(kalendarz) && /Nadchodzące/.test(kalendarz)
    && /Minione/.test(kalendarz) && /Anulowane/.test(kalendarz),
    'cztery sekcje zniknęły z ekranu bez decyzji');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
