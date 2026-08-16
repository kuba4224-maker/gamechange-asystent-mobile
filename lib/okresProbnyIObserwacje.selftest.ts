// PLAN-D-K 08.2026 (13.08.2026) — NOWY PLIK. STRAŻNIK ZADANIA K4.
//
//   node --experimental-strip-types lib/okresProbnyIObserwacje.selftest.ts
//
// ── CO TEN PLIK PILNUJE ──────────────────────────────────────────────
// Trzy mutacje wymienione wprost w poleceniu K4. Każda z nich jest defektem,
// który NIE ZEPSUJE ANI JEDNEGO EKRANU i przejdzie przez zwykły przegląd kodu:
//
//   M1. obserwacja BEZ ZWERYFIKOWANEGO POWIĄZANIA trafia do ładunku promptu
//       diagnozy — czyli prawdopodobne podane modelowi jako pewne (Z0);
//   M2. wygaśnięcie okresu próbnego WYCISZA MAPĘ DROGI — czyli jedyne
//       narzędzie, które ma działać bez ani jednej danej o zawodniku,
//       przestaje działać dokładnie wtedy, gdy zostaje samo;
//   M3. data końca pilotażu stoi GDZIEKOLWIEK poza nazwaną stałą — czyli
//       ktoś kiedyś przesunie jedną z kopii i produkt zacznie odcinać
//       zawodników w dniu, którego nikt nie planował.
//
// ⚠️ STRAŻNIK SPRAWDZA REGUŁĘ, NIE DZISIEJSZY KOD. Asercja „w linii 3775
// nie ma fetcha" przepuściłaby ten sam fetch w linii 3900. Dlatego M1 i M3
// szukają WZORCA w całym pliku, a nie konkretnego miejsca.
//
// ⚠️ WARSTWY DOTYKAJĄCE INNYCH REPOZYTORIÓW działają tylko wtedy, gdy leżą
// obok siebie. GDY NIE LEŻĄ — strażnik MÓWI TO GŁOŚNO i liczy jako POMINIĘTE.
// Strażnik, który po cichu nie sprawdza połowy, jest gorszy niż jego brak.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RPC_STAN_DOSTEPU,
  czytajStanDostepu,
  toJestBrakDostepu,
  coDzialaBezDostepu,
  opisDostepuDoLogu,
  KOMUNIKAT_WYGASNIECIA,
  BRZMIENIE_DO_PRZEJRZENIA,
  DATA_KONCA_PILOTAZU_ZYJE_W_BAZIE,
  ZAPIS_ODRZUCONY_BRAK_DOSTEPU,
} from './dostepKonta';

let passed = 0;
let failed = 0;
let pominiete = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}
/**
 * ⭐ PAS I1 16.08.2026 — POMINIĘCIE MUSI NAZWAĆ ŚCIEŻKĘ, KTÓREJ SZUKAŁO.
 *
 * `tests/run-selftests.mjs` dzieli pominięcia na DOPUSZCZONE (warstwa mieszka
 * w INNYM repozytorium, którego w tym drzewie nie ma — w CI stan trwały)
 * i NIEDOPUSZCZONE (⛔ zapalają wyjście niezerowe). Etykieta `[poza-repo]`
 * nie wystarcza: runner sam sprawdza, czy któraś z nazwanych ścieżek jest
 * bezwzględna, leży POZA repozytorium i naprawdę nie istnieje.
 */
function pomin(label: string, powod: string, sciezki?: string[]) {
  pominiete++;
  const pozaRepo = !!sciezki && sciezki.length > 0;
  const gdzie = pozaRepo ? ` (szukałem: ${sciezki!.join(' | ')})` : '';
  console.log(`POMINIETE${pozaRepo ? ' [poza-repo]' : ''} - ${label}: ${powod}${gdzie}`);
}

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const obokAppki = dirname(appRoot);

function czytaj(...czesci: string[]): string | null {
  const p = join(...czesci);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

// ═════════════════════════════════════════════════════════════════════
// WARSTWA 0 — CZYSTA LOGIKA `dostepKonta.ts`
// ═════════════════════════════════════════════════════════════════════
console.log('\n--- warstwa 0: czytanie stanu dostępu ---');

check('(K0) błąd odczytu daje „nie odczytane", NIE „brak dostępu"',
  czytajStanDostepu(null, 'network error').rodzaj === 'nie_odczytane',
  JSON.stringify(czytajStanDostepu(null, 'network error')));

check('(K0) brak odpowiedzi daje „nie odczytane"',
  czytajStanDostepu(undefined, null).rodzaj === 'nie_odczytane',
  JSON.stringify(czytajStanDostepu(undefined, null)));

check('(K0) rozpoznane:false daje „niezalogowany", a nie „brak dostępu"',
  czytajStanDostepu({ rozpoznane: false, powod: 'niezalogowany' }, null).rodzaj === 'niezalogowany',
  JSON.stringify(czytajStanDostepu({ rozpoznane: false }, null)));

{
  const stan = czytajStanDostepu({
    rozpoznane: true, ma_dostep: false, zrodlo: 'brak',
    okres_probny_do: '2026-09-11T17:46:27Z', subskrypcja_status: 'canceled', // DANE STRAŻNIKA
    koniec_pilotazu: '2027-06-30T21:59:59Z', teraz: '2026-10-01T00:00:00Z',  // DANE STRAŻNIKA
  }, null);
  check('(K0) wygaśnięcie czyta się jako znany stan bez dostępu',
    stan.rodzaj === 'znany' && stan.maDostep === false && stan.zrodlo === 'brak',
    JSON.stringify(stan));
  check('(K0) data końca pilotażu PRZYCHODZI Z BAZY, nie z appki',
    stan.rodzaj === 'znany' && stan.koniecPilotazu?.getUTCFullYear() === 2027,
    JSON.stringify(stan));
}

{
  const stan = czytajStanDostepu({ rozpoznane: true, ma_dostep: true, zrodlo: 'cos_nowego' }, null);
  check('(K0) źródło spoza znanych nazywa się wprost, zamiast udawać znane',
    stan.rodzaj === 'znany' && stan.zrodlo === 'nieznane' && stan.nieznaneZrodlo === 'cos_nowego',
    JSON.stringify(stan));
  check('(K0) opis do logu krzyczy o źródle spoza tej wersji appki',
    opisDostepuDoLogu(stan).includes('SPOZA TEJ WERSJI APPKI'),
    opisDostepuDoLogu(stan));
}

check('(K0) 42501 rozpoznane jako odmowa dostępu',
  toJestBrakDostepu({ code: '42501', message: 'x' }), 'nie rozpoznane');
check('(K0) komunikat RLS bez kodu też rozpoznany',
  toJestBrakDostepu({ message: 'new row violates row-level security policy for table "daily_logs"' }),
  'nie rozpoznane');
check('(K0) zwykła awaria NIE jest brana za brak dostępu',
  !toJestBrakDostepu({ code: '08006', message: 'connection failure' }), 'wzięta za brak dostępu');

// ═════════════════════════════════════════════════════════════════════
// MUTACJA 2 — WYGAŚNIĘCIE NIE WYCISZA MAPY DROGI
// ═════════════════════════════════════════════════════════════════════
console.log('\n--- M2: wygaśnięcie a Mapa drogi ---');

{
  const co = coDzialaBezDostepu();
  check('(M2) Mapa drogi DZIAŁA bez ważnego dostępu',
    co.mapaDrogi === true,
    'ktoś ustawił mapaDrogi:false — to jest dokładnie ta mutacja, którą ten strażnik ma łapać');
  check('(M2) odczyt własnych danych działa bez ważnego dostępu',
    co.odczytWlasnychDanych === true, 'polityki SELECT nie mają bramki dostępu');
  check('(M2) punkt pomocy działa bez ważnego dostępu',
    co.punktPomocy === true, 'punkt pomocy ma być dostępny z każdego ekranu, zawsze');
  check('(M2) nowy zapis jest odcięty — inaczej ten plik opisywałby nieprawdę',
    co.nowyZapis === false, 'RLS z bramką user_has_active_access odrzuca insert/update');
}

{
  // Sedno mutacji: gdyby Mapa zaczęła pytać o dostęp, przestałaby być
  // narzędziem działającym bez danych. Sprawdzamy to na ŹRÓDLE ekranu,
  // nie na deklaracji — deklarację łatwo poprawić i zapomnieć o kodzie.
  const mapa = czytaj(appRoot, 'components', 'MojaDroga.tsx');
  const mapaLib = czytaj(appRoot, 'lib', 'mapaDrogi.ts');
  if (!mapa || !mapaLib) {
    check('(M2) znajduję ekran Mapy drogi', false,
      'brak components/MojaDroga.tsx albo lib/mapaDrogi.ts — strażnik nie ma czego pilnować');
  } else {
    const zakazane = [RPC_STAN_DOSTEPU, 'dostepKonta', 'user_has_active_access', 'trial_ends_at', 'subscriptions'];
    const trafienia = zakazane.filter((z) => mapa.includes(z) || mapaLib.includes(z));
    check('(M2) Mapa drogi NIE SIĘGA po stan dostępu ani po okres próbny',
      trafienia.length === 0,
      `Mapa zaczęła czytać: ${trafienia.join(', ')} — wygaśnięcie mogłoby ją wyciszyć`);
  }
}

// ═════════════════════════════════════════════════════════════════════
// MUTACJA 3 — DATA KOŃCA PILOTAŻU TYLKO W NAZWANEJ STAŁEJ
// ═════════════════════════════════════════════════════════════════════
console.log('\n--- M3: data końca pilotażu ---');

// Wzorzec, nie konkretna data: każda data z lat 2026–2039 wpisana wprost
// w kodzie appki jest podejrzana. Gdyby strażnik szukał jednej, dosłownej
// daty, przesunięcie stałej o dzień rozbroiłoby go po cichu.
const WZORZEC_DATY = /['"`]20(2[6-9]|3\d)-\d{2}-\d{2}/g;

// Linie z tym znacznikiem to WŁASNE DANE TESTOWE strażnika, nie kod produktu.
// Znacznik jest jawny i widoczny — wyłączenie po nazwach pól byłoby cichą
// furtką, przez którą prawdziwy literał wśliznąłby się razem z fixture'em.
const ZNACZNIK_DANYCH_STRAZNIKA = 'DANE STRAŻNIKA';

const PLIKI_APPKI_DO_SPRAWDZENIA = [
  ['lib', 'dostepKonta.ts'],
  ['lib', 'okresProbnyIObserwacje.selftest.ts'],
  ['app', '(tabs)', 'profil.tsx'],
  ['app', '(tabs)', 'dziennik.tsx'],
];

check('(M3) stała mówi wprost, że data żyje w bazie',
  DATA_KONCA_PILOTAZU_ZYJE_W_BAZIE.includes('koniec_okresu_probnego_pilotazu'),
  DATA_KONCA_PILOTAZU_ZYJE_W_BAZIE);

for (const czesci of PLIKI_APPKI_DO_SPRAWDZENIA) {
  const nazwa = czesci.join('/');
  const tresc = czytaj(appRoot, ...czesci);
  if (tresc === null) {
    check(`(M3) znajduję ${nazwa}`, false, 'pliku nie ma na dysku');
    continue;
  }
  // Linie oznaczone znacznikiem to dane testowe samego strażnika — jawnie
  // wyłączone, inaczej zapalałby się na własnym zestawie danych.
  const bezTestowych = tresc
    .split('\n')
    .filter((l) => !l.includes(ZNACZNIK_DANYCH_STRAZNIKA))
    .join('\n');
  const trafienia = Array.from(bezTestowych.matchAll(WZORZEC_DATY)).map((m) => m[0].slice(1));
  check(`(M3) ${nazwa} nie ma wpisanej wprost daty granicznej`,
    trafienia.length === 0,
    `znalazłem daty: ${trafienia.join(', ')} — data końca pilotażu ma stać WYŁĄCZNIE `
    + 'w public.koniec_okresu_probnego_pilotazu()');
}

// ═════════════════════════════════════════════════════════════════════
// MUTACJA 1 — OBSERWACJA BEZ ZWERYFIKOWANEGO POWIĄZANIA W PROMPCIE
// ═════════════════════════════════════════════════════════════════════
console.log('\n--- M1: obserwacje w prompcie diagnozy ---');

{
  const kandydaci = [
    join(obokAppki, 'gamechange-diagnoza', 'index.html'),
    join(appRoot, '..', 'gamechange-diagnoza', 'index.html'),
  ];
  const sciezka = kandydaci.find((p) => existsSync(p));
  if (!sciezka) {
    pomin('(M1) lejek diagnozy — obserwacje wchodzą do promptu tylko po weryfikacji',
      'nie znalazłem gamechange-diagnoza/index.html. '
      + 'TA WARSTWA NIE ZOSTAŁA SPRAWDZONA.',
      kandydaci);
  } else {
    const src = readFileSync(sciezka, 'utf8');

    // 1a. Zero odczytów tabeli `player_insights` wprost z przeglądarki.
    // To jest wzorzec, nie linia: każdy `rest/v1/player_insights` z metodą
    // GET jest odczytem kluczem publicznym, niezależnie od tego, gdzie stoi.
    const wprost = Array.from(src.matchAll(/rest\/v1\/player_insights/g)).length;
    check('(M1) lejek NIE czyta tabeli player_insights wprost kluczem publicznym',
      wprost === 0,
      `${wprost} odczytów wprost — polityka anon SELECT została zdjęta 13.08.2026, `
      + 'więc taki odczyt cicho zwróci pustkę i wygląda jak „zawodnik nie ma obserwacji"');

    // 1b. Prompt bierze obserwacje WYŁĄCZNIE z funkcji o nazwie mówiącej
    // o weryfikacji. Gdyby ktoś podpiął tam cokolwiek innego, ta asercja padnie.
    const budowanie = /let insightsText = '';([\s\S]{0,900}?)\n  \/\/ Wcześniejszy samoopis/.exec(src);
    if (!budowanie) {
      check('(M1) umiem odczytać miejsce, w którym obserwacje wchodzą do promptu', false,
        'zmienił się kształt bloku `insightsText` w _buildDiagData — strażnik wymaga aktualizacji');
    } else {
      check('(M1) obserwacje do promptu idą przez `wczytajObserwacjeZweryfikowane`',
        budowanie[1].includes('wczytajObserwacjeZweryfikowane'),
        'blok budujący insightsText nie woła czytnika bramkowanego weryfikacją');
      check('(M1) blok NIE woła wycofanego `loadPlayerInsights`',
        !budowanie[1].includes('loadPlayerInsights('),
        'wrócił odczyt po adresie e-mail podanym w formularzu');
    }

    // 1c. Czytnik zweryfikowany naprawdę wymaga tokenu.
    const czytnik = /async function wczytajObserwacjeZweryfikowane\(([\s\S]*?)\n\}/.exec(src);
    if (!czytnik) {
      check('(M1) znajduję `wczytajObserwacjeZweryfikowane`', false, 'funkcji nie ma w pliku');
    } else {
      check('(M1) czytnik odrzuca sesję bez tokenu (fail closed)',
        /rodzaj\s*!==\s*'token'/.test(czytnik[1]) && czytnik[1].includes('obserwacje: []'),
        'czytnik nie zamyka się przy braku weryfikacji');
      check('(M1) czytnik używa funkcji bazy bramkowanej tokenem',
        czytnik[1].includes('get_player_insights_recent'),
        'czytnik nie woła get_player_insights_recent');
    }

    // 1d. Panel trenera rozstrzyga KODEM DRUŻYNY, nie adresem e-mail.
    check('(M1) panel trenera czyta obserwacje przez `get_coach_insight_for_team`',
      src.includes('get_coach_insight_for_team'),
      'odczyt trenera nie idzie przez funkcję bramkowaną kodem drużyny');
  }
}

{
  // Druga strona tej samej reguły: silnik rekomendacji w backendzie wiąże
  // obserwacje KONTEM (`user_id`), nie napisem. `user_id` trafia do
  // `player_insights` wyłącznie przez dopasowanie do wiersza w `public.users`,
  // a ten powstaje z `auth.users` (wyzwalacz `on_auth_user_created`) — czyli
  // z adresu, który przeszedł logowanie kodem z e-maila.
  const kandydaci = [
    join(obokAppki, 'gamechange-app', 'api', 'generate-recommendation.js'),
    join(appRoot, '..', 'gamechange-app', 'api', 'generate-recommendation.js'),
  ];
  const sciezka = kandydaci.find((p) => existsSync(p));
  if (!sciezka) {
    pomin('(M1) silnik rekomendacji — obserwacje wiązane kontem, nie adresem',
      'nie znalazłem gamechange-app/api/generate-recommendation.js. '
      + 'TA WARSTWA NIE ZOSTAŁA SPRAWDZONA.',
      kandydaci);
  } else {
    const src = readFileSync(sciezka, 'utf8');
    const fn = /async function fetchPlayerInsights\(([\s\S]*?)\n\}/.exec(src);
    if (!fn) {
      check('(M1) znajduję `fetchPlayerInsights` w silniku rekomendacji', false,
        'funkcji nie ma — zmienił się kształt pliku');
    } else {
      check('(M1) silnik filtruje obserwacje po `user_id` (konto), nie po adresie',
        fn[1].includes(".eq('user_id'") && !fn[1].includes('player_email'),
        'silnik zaczął wiązać obserwacje adresem e-mail — to jest ta mutacja');
    }
  }
}

// ═════════════════════════════════════════════════════════════════════
// BRZMIENIE — MA BYĆ OZNACZONE I MA NIE SPRZEDAWAĆ
// ═════════════════════════════════════════════════════════════════════
console.log('\n--- brzmienie komunikatu o wygaśnięciu ---');

check('(K2) komunikat jest oznaczony do przejrzenia przez Kubę',
  KOMUNIKAT_WYGASNIECIA.doPrzejrzenia === BRZMIENIE_DO_PRZEJRZENIA
  && BRZMIENIE_DO_PRZEJRZENIA.includes('DO PRZEJRZENIA'),
  KOMUNIKAT_WYGASNIECIA.doPrzejrzenia);

check('(K2) komunikat mówi, CO NADAL DZIAŁA — z Mapą drogi po nazwie',
  /mapa drogi/i.test(KOMUNIKAT_WYGASNIECIA.coDziala),
  KOMUNIKAT_WYGASNIECIA.coDziala);

check('(K2) komunikat mówi, że NIC NIE ZOSTAŁO SKASOWANE',
  /nic nie zosta/i.test(KOMUNIKAT_WYGASNIECIA.czegoNieStracil),
  KOMUNIKAT_WYGASNIECIA.czegoNieStracil);

{
  const caly = [
    KOMUNIKAT_WYGASNIECIA.tytul, KOMUNIKAT_WYGASNIECIA.coWygaslo,
    KOMUNIKAT_WYGASNIECIA.coDziala, KOMUNIKAT_WYGASNIECIA.czegoNieStracil,
    ZAPIS_ODRZUCONY_BRAK_DOSTEPU,
  ].join(' ').toLowerCase();

  const sprzedaz = ['zł', 'kup', 'wykup', 'cena', 'płatn', 'subskrybuj', 'przejdź na', 'odblokuj', 'promocj'];
  const trafionaSprzedaz = sprzedaz.filter((s) => caly.includes(s));
  check('(K2) ZERO SPRZEDAŻY w komunikacie o wygaśnięciu',
    trafionaSprzedaz.length === 0,
    `znalazłem: ${trafionaSprzedaz.join(', ')} — polecenie K2 zabrania sprzedaży w tym miejscu`);

  const straszenie = ['stracisz', 'utracisz', 'ostatnia szansa', 'zostało ci', 'uwaga!', 'niestety'];
  const trafioneStraszenie = straszenie.filter((s) => caly.includes(s));
  check('(K2) ZERO STRASZENIA w komunikacie o wygaśnięciu',
    trafioneStraszenie.length === 0,
    `znalazłem: ${trafioneStraszenie.join(', ')}`);
}

{
  // Komunikat ma DOTRZEĆ, nie tylko istnieć (reguła R1: skończone = zawodnik
  // to widzi). Sprawdzamy, że oba miejsca wyświetlania naprawdę go używają.
  const profil = czytaj(appRoot, 'app', '(tabs)', 'profil.tsx');
  const dziennik = czytaj(appRoot, 'app', '(tabs)', 'dziennik.tsx');
  check('(R1) Profil pokazuje komunikat o wygaśnięciu',
    !!profil && profil.includes('KOMUNIKAT_WYGASNIECIA') && profil.includes(RPC_STAN_DOSTEPU),
    'app/(tabs)/profil.tsx nie czyta stanu dostępu albo nie pokazuje komunikatu');
  check('(R1) Dziennik zamienia surowy błąd RLS na zdanie po ludzku',
    !!dziennik && dziennik.includes('toJestBrakDostepu') && dziennik.includes('ZAPIS_ODRZUCONY_BRAK_DOSTEPU'),
    'app/(tabs)/dziennik.tsx nadal pokazuje surowy komunikat bazy');
}

console.log(`\n${passed} passed, ${failed} failed${pominiete > 0 ? `, ${pominiete} POMINIETE (patrz wyżej)` : ''}`);
if (failed > 0) process.exit(1);
