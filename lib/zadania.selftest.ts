// PLAN-D-A4 08.2026 (14.08.2026) — NOWY PLIK. STRAŻNIK TABELI ZADAŃ.
//
//   npx tsx lib/zadania.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ── SZEŚĆ REGUŁ, KTÓRYCH TEN PLIK PILNUJE ────────────────────────────
//   R1. ⛔ KUBEŁEK NIE JEST KOLUMNĄ. W migracji ani w `zadania.ts` nie ma
//       nazwy kubełka ani kolejności. Kolejność liczy ranker (pas B1);
//       zamrożona w danych unieważnia cały ten pas.
//   R2. ⛔ POWODU SYSTEMOWEGO NIE DA SIĘ SKASOWAĆ podniesieniem do „Teraz".
//       Pilnuje tego wyzwalacz w bazie — bo do tabeli pisze także cron.
//   R3. ⚠️ ODCZYT NIE ZWRACA PUSTKI TAM, GDZIE MA ZWRÓCIĆ „NIE WIEM".
//       To jest ten sam defekt, który reguła R5 leczy w trzech innych
//       plikach: `{data:null, error}` + `data ?? []` = awaria podana jako
//       spokój.
//   R4. WG-18 — zadania systemowego nie da się wstawić dwa razy tym samym
//       kluczem.
//   R5. WG-17 — rekord nie wychodzi bez źródła, a powód bez rejestru Z0
//       nie wychodzi w ogóle.
//   R6. RLS jest włączone W TEJ SAMEJ migracji, co `create table`.
//
// ── CZEGO TEN STRAŻNIK NIE SPRAWDZA ──────────────────────────────────
// ⛔ Nie sprawdza EKRANU — ekranu nie ma, buduje go pas C2.
// ⛔ Nie sprawdza KOLEJNOŚCI — rankera nie ma, buduje go pas B1.
// ⛔ Nie łączy się z bazą. Sześć asercji o migracji czyta PLIK `.sql`;
//    gdy go nie znajdzie, mówi POMINIETE i nazywa, czego nie sprawdziło.
//    ⚠️ Migracja mieszka w pamięci projektu, nie w repozytorium — żeby te
//    sześć asercji działało też u Ciebie, wystarczy zapisać plik
//    `MIGRACJA_A4_ZADANIA_14_08_2026.sql` do `Asystent Gamechange/docs/`.
//
// ⚠️ O53: żadnego `new URL(...)` do czytania plików — `readFileSync`
// + `fileURLToPath`. `tsconfig.json` appki ciągnie DOM i `new URL` wywraca
// kontrolę typów na TS2769 (kosztowało rundę 13.08).

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  odczytZadan,
  zadanieZWiersza,
  czyOdczytNiepelny,
  opisOdczytuDoLogu,
  zbudujKluczSystemowy,
  zbudujZadanieSystemowe,
  TABELA_ZADAN,
  KOLUMNY_ZADANIA,
  SELECT_ZADANIA,
  UPSERT_ZADANIA_SYSTEMOWEGO,
  REJESTRY_Z0,
  ZRODLA_ZADANIA,
  STANY_ZADANIA,
  type OdpowiedzBazy,
} from './zadania';

let passed = 0;
let failed = 0;
let pominiete = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}
function pomin(label: string, powod: string) {
  pominiete++;
  console.log(`POMINIETE - ${label}: ${powod} TA WARSTWA NIE ZOSTAŁA SPRAWDZONA.`);
}

const libDir = dirname(fileURLToPath(import.meta.url));
const appRoot = dirname(libDir);

/** Komentarze wypadają — inaczej strażnik zapala się na własnej dokumentacji. */
const bezKomentarzySQL = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*--.*$/gm, '').replace(/\s--.*$/gm, '');
/**
 * Dodatkowo zdejmuje NAPISY SQL (`'…'`). Potrzebne WYŁĄCZNIE do szukania nazw
 * kolumn: identyfikator nigdy nie mieszka w napisie, a `comment on … is '…'`
 * opisuje tabelę po ludzku i ma prawo użyć słowa „pozycja". ⚠️ Nie używamy
 * tego do pozostałych asercji — tam napisy (`origin = 'player'`) są sednem.
 */
const samIdentyfikatorSQL = (s: string) => bezKomentarzySQL(s).replace(/'(?:[^']|'')*'/g, "''");
const bezKomentarzyTS = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const zrodloZadan = readFileSync(join(libDir, 'zadania.ts'), 'utf8');
const zywyTS = bezKomentarzyTS(zrodloZadan);

const KANDYDACI_MIGRACJI = [
  join(appRoot, 'docs', 'MIGRACJA_A4_ZADANIA_14_08_2026.sql'),
  join(appRoot, 'MIGRACJA_A4_ZADANIA_14_08_2026.sql'),
  join(appRoot, '..', 'MIGRACJA_A4_ZADANIA_14_08_2026.sql'),
  join(appRoot, '..', 'claude', 'MIGRACJA_A4_ZADANIA_14_08_2026.sql'),
];
const sciezkaMigracji = KANDYDACI_MIGRACJI.find((p) => existsSync(p)) ?? null;
const migracjaSurowa = sciezkaMigracji ? readFileSync(sciezkaMigracji, 'utf8') : null;
const migracja = migracjaSurowa ? bezKomentarzySQL(migracjaSurowa) : null;
const BRAK_MIGRACJI =
  `nie znalazłem pliku migracji (szukałem: ${KANDYDACI_MIGRACJI.join(' | ')}).`;

console.log('zadania.selftest.ts — strażnik tabeli zadań (pas A4)\n');
console.log(sciezkaMigracji
  ? `migracja czytana z: ${sciezkaMigracji}\n`
  : '⚠️ migracji nie znalazłem — sześć asercji o bazie będzie POMINIETE\n');

// ═════════════════════════════════════════════════════════════════════
console.log('R1. KUBEŁEK NIE JEST KOLUMNĄ');
// ═════════════════════════════════════════════════════════════════════
{
  // ⚠️ ASERCJA NA REGUŁĘ, NIE NA DZISIEJSZĄ LISTĘ PÓL: nowa kolumna z dowolną
  // z tych nazw zapali strażnika, niezależnie od tego, ile pól ma tabela.
  const ZAKAZANE = [
    'kubelek', 'bucket', 'priorytet', 'priority', 'waga',
    'kolejnosc', 'sort_order', 'rank', 'pozycja',
  ];
  const znajdz = (tekst: string) =>
    ZAKAZANE.filter((n) => new RegExp(`\\b${n}\\b`, 'i').test(tekst));

  const wTS = znajdz(zywyTS);
  check('⛔ `zadania.ts` nie zna nazwy kubełka ani kolejności',
    wTS.length === 0, `znalazłem: ${wTS.join(', ')}`);

  if (migracja) {
    const wSQL = znajdz(samIdentyfikatorSQL(migracjaSurowa as string));
    check('⛔ migracja nie tworzy kolumny kubełka ani kolejności',
      wSQL.length === 0, `znalazłem: ${wSQL.join(', ')}`);
  } else {
    pomin('⛔ migracja nie tworzy kolumny kubełka ani kolejności', BRAK_MIGRACJI);
  }

  // Druga strona tej samej reguły: kubełki mają być POLICZONE, więc nie wolno
  // ich odczytywać z wiersza.
  check('lista kolumn odczytu nie zawiera niczego, co przypomina kolejność',
    !KOLUMNY_ZADANIA.some((k) => /rank|order|prio|weight|bucket|position/i.test(k)),
    KOLUMNY_ZADANIA.join(', '));

  // ⚠️ ZMIENIONE 14.08.2026 (sesja naprawcza po odbiorze pasów A7/B1/X).
  // CO TU STAŁO WCZEŚNIEJ:
  //     check('⛔ pas A4 nie założył `lib/kolejkaPodania.ts` (to jest plik pasa B1)',
  //       !existsSync(join(libDir, 'kolejkaPodania.ts')), …);
  // DLACZEGO ZNIKNĘŁO: asercja pilnowała NIEOBECNOŚCI CUDZEGO PLIKU. Pas B1
  // ten plik 14.08.2026 założył — zgodnie z planem — więc asercja stała się
  // fałszywa z dnia na dzień i wywracała całą suitę (jedyny FAIL w 32 plikach).
  // Strażnik, który czerwienieje od poprawnej pracy sąsiedniego pasa, uczy
  // ludzi ignorować czerwone.
  // CO PILNUJEMY ZAMIAST TEGO — INTENCJI, NIE NIEOBECNOŚCI: pas A4 nie miał
  // budować rankera i nadal go nie buduje. Kolejność liczy `kolejkaPodania.ts`
  // (pas B1), a `zadania.ts` ma jej NIE ZNAĆ: nie sortować, nie liczyć
  // kubełków i nie importować rankera. Kubełek jako NAZWA POLA jest już wyżej
  // (lista ZAKAZANE) — tu chodzi o logikę.
  const IMPORT_RANKERA =
    /(?:from|require\s*\()\s*['"][^'"]*kolejkaPodania['"]/;
  check('⛔ `zadania.ts` nie importuje rankera `kolejkaPodania` — kolejność nie jest sprawą tego pliku',
    !IMPORT_RANKERA.test(zywyTS),
    'znalazłem import/require `kolejkaPodania` w zadania.ts');

  const SORTOWANIE = /\.sort\s*\(|\.reverse\s*\(|localeCompare|\border\s+by\b/i;
  check('⛔ `zadania.ts` nie ustawia niczego w kolejności (żadnego `.sort(`, `.reverse(`, `order by`)',
    !SORTOWANIE.test(zywyTS),
    'znalazłem własne sortowanie — to jest robota rankera z pasa B1');

  // Nazwy, którymi ranker liczy kubełki. Gdyby któraś pojawiła się tutaj,
  // znaczyłoby to, że logika kolejności została przepisana do tego pliku
  // pod innym słowem, zamiast zaimportowana.
  const LICZENIE_KUBELKOW =
    /\bkubelekDla\b|\bwezKubelek\b|\bPROG_TERAZ\b|\bWAGA_BAZOWA\b|\bPREMIE\b|\bulozKolejke\b/;
  check('⛔ `zadania.ts` nie liczy kubełków ani wag — nie ma u siebie kopii rankera',
    !LICZENIE_KUBELKOW.test(zywyTS),
    'znalazłem liczenie kubełka/wagi w zadania.ts');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\nR2. POWODU SYSTEMOWEGO NIE DA SIĘ SKASOWAĆ ANI NADPISAĆ');
// ═════════════════════════════════════════════════════════════════════
{
  if (migracja) {
    const maWyzwalacz = /create\s+trigger\s+\S+\s+before\s+update\s+on\s+public\.player_tasks/i.test(migracja);
    check('istnieje wyzwalacz BEFORE UPDATE na tabeli zadań',
      maWyzwalacz, 'nie znalazłem `create trigger … before update on public.player_tasks`');

    // Reguła, nie lista: KAŻDE pole powodu ma być porównywane w wyzwalaczu.
    const POLA_POWODU = ['reason_fact', 'reason_text', 'reason_register', 'reason_key', 'origin', 'system_key'];
    const niepilnowane = POLA_POWODU.filter(
      (p) => !new RegExp(`new\\.${p}\\s+is\\s+distinct\\s+from\\s+old\\.${p}`, 'i').test(migracja),
    );
    check('⛔ wyzwalacz porównuje KAŻDE pole powodu i pochodzenia',
      niepilnowane.length === 0, `niepilnowane: ${niepilnowane.join(', ')}`);

    check('wyzwalacz przerywa zapis wyjątkiem, a nie po cichu poprawia wiersz',
      /raise\s+exception/i.test(migracja), 'brak `raise exception` w funkcji wyzwalacza');

    check('wyzwalacz dotyczy WYŁĄCZNIE zadań nie-zawodnika',
      /old\.origin\s*<>\s*'player'/i.test(migracja),
      'brak warunku `old.origin <> \'player\'` — zawodnik straciłby prawo do edycji własnego zadania');

    // Podniesienie jest osobnym polem, więc nie ma jak wejść w powód.
    check('podniesienie do „Teraz" jest OSOBNYM polem (moment, nie flaga)',
      /raised_at\s+timestamptz/i.test(migracja), 'nie znalazłem kolumny `raised_at timestamptz`');
    check('⛔ podniesienie nie jest polem typu boolean',
      !/raised(_at)?\s+bool/i.test(migracja), 'podniesienie jako boolean gubi moment');
  } else {
    pomin('⛔ wyzwalacz chroni powód systemowy przed skasowaniem i nadpisaniem', BRAK_MIGRACJI);
  }

  // Warstwa `lib/` nie może obejść tej reguły od drugiej strony: nie da się
  // zbudować zadania systemowego bez powodu.
  const bezPowodu = zbudujZadanieSystemowe({
    userId: 'u1', tytul: 'x', zrodlo: 'journal', faktZLiczbami: '   ',
    wyjasnienie: null, rejestr: 'fakt_o_tobie', kluczPowodu: 'k',
    kluczSystemowy: 's', slad: null,
  });
  check('nie da się zbudować zadania systemowego z pustym powodem',
    bezPowodu.ok === false, JSON.stringify(bezPowodu));

  const zeZrodlemGracza = zbudujZadanieSystemowe({
    userId: 'u1', tytul: 'x', zrodlo: 'player' as never, faktZLiczbami: 'coś',
    wyjasnienie: null, rejestr: 'fakt_o_tobie', kluczPowodu: 'k',
    kluczSystemowy: 's', slad: null,
  });
  check('⛔ producent systemowy nie podszyje się pod zawodnika (`origin=player`)',
    zeZrodlemGracza.ok === false, JSON.stringify(zeZrodlemGracza));
}

// ═════════════════════════════════════════════════════════════════════
console.log('\nR3. ODCZYT NIE ZWRACA PUSTKI TAM, GDZIE MA POWIEDZIEĆ „NIE WIEM"');
// ═════════════════════════════════════════════════════════════════════
{
  const wiersz = (over: Record<string, unknown> = {}) => ({
    id: 'z1', title: 'Zamów wizytę u fizjo', reason_fact: 'Kolano boli od 5 dni',
    reason_text: 'zapisałeś to trzy razy w tym tygodniu.', reason_register: 'fakt_o_tobie',
    reason_key: 'bol_utrzymuje_sie', origin: 'journal', source_table: 'pain_entries',
    source_row_id: 'p1', effort_seconds: 30, due_on: '2026-08-16', state: 'open',
    state_changed_at: null, raised_at: null, system_key: 'bol_kolano:2026-W33',
    created_at: '2026-08-14T10:00:00Z', ...over,
  });

  // ⚠️ SEDNO CAŁEJ REGUŁY. Cztery różne awarie, cztery różne odpowiedzi,
  // ANI RAZU pusta lista.
  const brakTabeli = odczytZadan({ data: null, error: { code: '42P01', message: 'relation "player_tasks" does not exist' } });
  check('brak tabeli → `nie_wiem`, NIE pustka',
    brakTabeli.rodzaj === 'nie_wiem', JSON.stringify(brakTabeli));

  const odmowa = odczytZadan({ data: null, error: { code: '42501', message: 'permission denied' } });
  check('odmowa dostępu → `brak_uprawnien`, NIE pustka i NIE „nie wiem"',
    odmowa.rodzaj === 'brak_uprawnien', JSON.stringify(odmowa));

  const rls = odczytZadan({ data: null, error: { message: 'new row violates row-level security policy' } });
  check('odmowa polityki RLS bez kodu → `brak_uprawnien`',
    rls.rodzaj === 'brak_uprawnien', JSON.stringify(rls));

  const siec = odczytZadan({ data: null, error: { message: 'Network request failed' } });
  check('zerwana sieć → `nie_wiem`', siec.rodzaj === 'nie_wiem', JSON.stringify(siec));

  const nicNic = odczytZadan({ data: null, error: null });
  check('ani danych, ani błędu → `nie_wiem`', nicNic.rodzaj === 'nie_wiem', JSON.stringify(nicNic));

  const nieLista = odczytZadan({ data: { cos: 1 }, error: null });
  check('odpowiedź nie jest listą → `nie_wiem`', nieLista.rodzaj === 'nie_wiem', JSON.stringify(nieLista));

  const pusto = odczytZadan({ data: [], error: null });
  check('pusta lista i BRAK błędu → `brak_danych` (jedyny przypadek pustki)',
    pusto.rodzaj === 'brak_danych', JSON.stringify(pusto));

  const sa = odczytZadan({ data: [wiersz()], error: null });
  check('poprawny wiersz → `sa_zadania`', sa.rodzaj === 'sa_zadania', JSON.stringify(sa));

  // ⚠️ Cztery stany są CZTERY i wykluczają się.
  const rodzaje = new Set([brakTabeli.rodzaj, odmowa.rodzaj, pusto.rodzaj, sa.rodzaj]);
  check('cztery stany odczytu są rozróżnialne, nie zlewają się w jeden',
    rodzaje.size === 4, [...rodzaje].join(', '));

  // Wszystkie wiersze nieczytelne → to NIE jest pustka.
  const wszystkieZle = odczytZadan({ data: [{ nic: 1 }, { tez_nic: 2 }], error: null });
  check('baza dała wiersze, ale żadnego nie zrozumieliśmy → `nie_wiem`, nie „nic nie masz"',
    wszystkieZle.rodzaj === 'nie_wiem', JSON.stringify(wszystkieZle));

  // Częściowa strata jest widoczna, a nie cicha.
  const polowicznie = odczytZadan({ data: [wiersz(), { nic: 1 }], error: null });
  check('jeden wiersz nieczytelny → lista jest, ale odczyt oznaczony jako NIEPEŁNY',
    polowicznie.rodzaj === 'sa_zadania' && czyOdczytNiepelny(polowicznie),
    JSON.stringify(polowicznie));
  check('log mówi wprost, ile wierszy wypadło i dlaczego',
    /ODRZUCONE WIERSZE: 1/.test(opisOdczytuDoLogu(polowicznie)),
    opisOdczytuDoLogu(polowicznie));

  // ⚠️ ASERCJA NA KSZTAŁT PODPISU, NIE NA ZACHOWANIE: gdyby `odczytZadan`
  // przyjmowała tablicę, defekt `data ?? []` dałoby się napisać z powrotem.
  check('⛔ `odczytZadan` przyjmuje CAŁĄ odpowiedź z błędem, nie samą tablicę',
    /export\s+function\s+odczytZadan\s*\(\s*\w+\s*:\s*OdpowiedzBazy\s*\)/.test(zywyTS)
    && /data\s*:\s*unknown;[\s\S]{0,80}error\s*:\s*unknown;/.test(zywyTS),
    'podpis `odczytZadan` nie wymusza przekazania błędu');

  check('⛔ w `zadania.ts` nie ma wzorca `data ?? []`',
    !/\bdata\s*\?\?\s*\[\]/.test(zywyTS), 'znalazłem `data ?? []`');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\nR4. WG-18 — SYSTEM NIE DOKŁADA TEGO SAMEGO CO PRZEBIEG');
// ═════════════════════════════════════════════════════════════════════
{
  if (migracja) {
    check('istnieje UNIKALNY indeks po (user_id, system_key)',
      /create\s+unique\s+index[\s\S]{0,120}?player_tasks\s*\(\s*user_id\s*,\s*system_key\s*\)/i.test(migracja),
      'brak unikalnego indeksu — producent zdubluje zadanie przy każdym przebiegu');
  } else {
    pomin('istnieje UNIKALNY indeks po (user_id, system_key)', BRAK_MIGRACJI);
  }

  check('kontrakt powtórki mówi `do nothing`',
    /do\s+nothing/i.test(UPSERT_ZADANIA_SYSTEMOWEGO), UPSERT_ZADANIA_SYSTEMOWEGO);
  check('⛔ kontrakt powtórki NIE mówi `do update` — to wskrzesiłoby porzucone zadanie',
    !/do\s+update/i.test(UPSERT_ZADANIA_SYSTEMOWEGO), UPSERT_ZADANIA_SYSTEMOWEGO);
  check('kontrakt powtórki celuje w ten sam klucz, co indeks',
    /\(\s*user_id\s*,\s*system_key\s*\)/.test(UPSERT_ZADANIA_SYSTEMOWEGO), UPSERT_ZADANIA_SYSTEMOWEGO);

  check('zadania systemowego nie da się zbudować bez klucza naturalnego',
    zbudujZadanieSystemowe({
      userId: 'u1', tytul: 'x', zrodlo: 'journal', faktZLiczbami: 'f',
      wyjasnienie: null, rejestr: 'fakt_o_tobie', kluczPowodu: 'k',
      kluczSystemowy: '  ', slad: null,
    }).ok === false, 'zbudowało się bez `system_key`');

  check('klucz systemowy powstaje w jednym miejscu i skleja się przewidywalnie',
    zbudujKluczSystemowy('bol_kolano', '2026-W33') === 'bol_kolano:2026-W33',
    String(zbudujKluczSystemowy('bol_kolano', '2026-W33')));
  check('klucz bez okna też jest poprawny („raz na zawsze")',
    zbudujKluczSystemowy('brak_roku_urodzenia', null) === 'brak_roku_urodzenia',
    String(zbudujKluczSystemowy('brak_roku_urodzenia', null)));
  check('klucz z białym znakiem jest odrzucany, a nie po cichu przycinany',
    zbudujKluczSystemowy('bol kolano', null) === null
    && zbudujKluczSystemowy('bol_kolano', '2026 W33') === null, 'przeszedł klucz ze spacją');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\nR5. WG-17 — REKORD NIE WYCHODZI BEZ ŹRÓDŁA, POWÓD BEZ REJESTRU Z0 NIE WYCHODZI');
// ═════════════════════════════════════════════════════════════════════
{
  const w = (over: Record<string, unknown> = {}) => ({
    id: 'z1', title: 'Zamów wizytę u fizjo', reason_fact: 'Kolano boli od 5 dni',
    reason_text: 'zapisałeś to trzy razy w tym tygodniu.', reason_register: 'fakt_o_tobie',
    reason_key: 'bol_utrzymuje_sie', origin: 'journal', source_table: 'pain_entries',
    source_row_id: 'p1', effort_seconds: 30, due_on: null, state: 'open',
    state_changed_at: null, raised_at: null, system_key: 'k', created_at: '2026-08-14T10:00:00Z',
    ...over,
  });

  check('każdy rekord niesie źródło — wiersz bez `origin` wypada',
    zadanieZWiersza(w({ origin: null })).ok === false, '');

  const nieznaneZrodlo = zadanieZWiersza(w({ origin: 'cos_nowego' }));
  check('źródło spoza zbioru NIE kasuje zadania — kasuje wiersz „skąd to wiemy"',
    nieznaneZrodlo.ok === true
    && nieznaneZrodlo.zadanie.zrodlo === null
    && nieznaneZrodlo.zadanie.nieznaneZrodlo === 'cos_nowego',
    JSON.stringify(nieznaneZrodlo));

  check('⛔ powód bez rejestru Z0 nie wychodzi na ekran',
    zadanieZWiersza(w({ reason_register: null })).ok === false, '');
  check('⛔ rejestr spoza zbioru Z0 nie wychodzi na ekran',
    zadanieZWiersza(w({ reason_register: 'wymyslony' })).ok === false, '');
  check('⛔ powód bez klucza maszynowego nie wychodzi — ranker nie ma po czym go zważyć',
    zadanieZWiersza(w({ reason_key: null })).ok === false, '');
  check('rejestr bez pomiaru też jest sprzecznością',
    zadanieZWiersza(w({ reason_fact: null, reason_text: null })).ok === false, '');

  check('⛔ zadanie o źródle systemowym BEZ powodu wypada',
    zadanieZWiersza(w({ reason_fact: null, reason_text: null, reason_register: null, reason_key: null })).ok === false, '');
  const wlasne = zadanieZWiersza(w({
    reason_fact: null, reason_text: null, reason_register: null, reason_key: null,
    origin: 'player', source_table: null, source_row_id: null, system_key: null,
  }));
  check('…ale zadanie ZAWODNIKA bez powodu jest poprawne — powodem jest on sam',
    wlasne.ok === true && wlasne.zadanie.powod === null, JSON.stringify(wlasne));

  // Powód złożony z samego wyjaśnienia — makieta ma dwa takie.
  const bezPomiaru = zadanieZWiersza(w({
    reason_fact: null, reason_register: null, reason_key: null,
    reason_text: 'Odblokowana w Twoim Bloku Skupienia.', origin: 'focus_block',
  }));
  check('powód bez pomiaru („Odblokowana w Twoim Bloku Skupienia.") jest poprawny i nie ma rejestru',
    bezPomiaru.ok === true && bezPomiaru.zadanie.powod?.fakt === null
    && bezPomiaru.zadanie.powod?.rejestr === null, JSON.stringify(bezPomiaru));

  check('połowiczny ślad źródłowy wypada — sama nazwa tabeli wygląda na ślad, a nim nie jest',
    zadanieZWiersza(w({ source_row_id: null })).ok === false, '');

  // ⚠️ Rekord ma unieść WSZYSTKIE CZTERY rzeczy z makiety naraz.
  const pelne = zadanieZWiersza(w({ effort_seconds: 30, due_on: '2026-08-16' }));
  check('⭐ jedna pozycja niesie naraz: CO · DLACZEGO · ILE ZAJMIE · SKĄD TO WIEMY',
    pelne.ok === true
    && pelne.zadanie.tytul.length > 0
    && pelne.zadanie.powod?.fakt === 'Kolano boli od 5 dni'
    && pelne.zadanie.ileZajmieSekund === 30
    && pelne.zadanie.sladZrodlowy?.tabela === 'pain_entries',
    JSON.stringify(pelne));

  check('stan spoza zbioru wypada — nie wiadomo, czy rzecz jest zrobiona',
    zadanieZWiersza(w({ state: 'moze_kiedys' })).ok === false, '');
  check('„odhaczone" i „porzucone" to dwa różne stany, nie jeden boolean',
    STANY_ZADANIA.includes('done') && STANY_ZADANIA.includes('abandoned')
    && STANY_ZADANIA.length === 3, STANY_ZADANIA.join(', '));
  check('stan zamknięty bez daty zmiany wypada — fakt bez momentu',
    zadanieZWiersza(w({ state: 'done', state_changed_at: null })).ok === false, '');
  check('stan otwarty Z datą zmiany też wypada — to sprzeczność',
    zadanieZWiersza(w({ state: 'open', state_changed_at: '2026-08-14T10:00:00Z' })).ok === false, '');

  check('koszt czasowy 0 sekund wypada — „nie wiem, ile zajmie" to `null`, nie zero',
    zadanieZWiersza(w({ effort_seconds: 0 })).ok === false, '');
  check('termin o nieznanym kształcie wypada, zamiast trafić na ekran',
    zadanieZWiersza(w({ due_on: '16 sierpnia' })).ok === false, '');

  check('zbiór rejestrów Z0 jest ZAMKNIĘTY i ma dokładnie trzy elementy',
    REJESTRY_Z0.length === 3, REJESTRY_Z0.join(', '));
  check('zbiór źródeł jest ZAMKNIĘTY i zawiera te, które makieta nazywa',
    ZRODLA_ZADANIA.includes('player') && ZRODLA_ZADANIA.includes('calendar')
    && ZRODLA_ZADANIA.includes('focus_block'), ZRODLA_ZADANIA.join(', '));

  // ⛔ Identyfikatory rekordów źródłowych nie są dla zawodnika.
  check('⛔ ślad źródłowy jest osobnym polem, a nie doklejonym do powodu',
    !/sladZrodlowy[\s\S]{0,40}fakt/.test(zywyTS) && /idWiersza/.test(zywyTS),
    'ślad wmieszany w powód trafiłby na ekran razem z nim');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\nR6. RLS WCHODZI W TEJ SAMEJ MIGRACJI, CO `create table`');
// ═════════════════════════════════════════════════════════════════════
{
  if (migracja) {
    const tworzyTabele = /create\s+table\s+if\s+not\s+exists\s+public\.player_tasks/i.test(migracja);
    check('migracja tworzy tabelę idempotentnie (`if not exists`)', tworzyTabele, '');

    check('⛔ RLS włączone W TYM SAMYM PLIKU — nie ma wersji „włączymy jutro"',
      /alter\s+table\s+public\.player_tasks\s+enable\s+row\s+level\s+security/i.test(migracja),
      'tabela bez RLS to tabela, z której da się czytać cudze zadania');

    const polityki = (migracja.match(/create\s+policy/gi) ?? []).length;
    check('są trzy polityki: select, insert, update', polityki === 3, `znalazłem ${polityki}`);

    check('⛔ nie ma polityki DELETE — zadanie się porzuca, nie kasuje',
      !/create\s+policy[\s\S]{0,200}?for\s+delete/i.test(migracja), 'znalazłem politykę DELETE');

    check('każda polityka jest przypięta do `authenticated`, nie do `public`',
      (migracja.match(/to\s+authenticated/gi) ?? []).length >= 3,
      'polityka bez `to authenticated` dotyczy też roli `anon`');

    check('polityki porównują `user_id` z `auth.uid()` — nie z parametrem z aplikacji',
      (migracja.match(/user_id\s*=\s*\(\s*select\s+auth\.uid\(\)\s*\)/gi) ?? []).length >= 3,
      'polityka bez `auth.uid()` nie ogranicza niczego');

    check('⛔ zawodnik nie wstawi wiersza udającego zadanie systemowe',
      /with\s+check\s*\([\s\S]{0,300}?origin\s*=\s*'player'/i.test(migracja),
      'polityka INSERT nie wymusza `origin = player`');

    // ⚠️ REGUŁA: liczby, których Kuba ma się spodziewać, mają MIEĆ SKĄD wyjść.
    // Zapytanie kontrolne bez którejkolwiek z nich zostawia go z „wygląda OK".
    const KONTROLNE = ['tabela', 'rls', 'polityki', 'polityka_delete', 'checki',
      'indeksy', 'wyzwalacz', 'wierszy', 'granty_authenticated', 'granty_anon'];
    const brakujace = KONTROLNE.filter((k) => !new RegExp(`as\\s+${k}\\b`, 'i').test(migracja));
    check('migracja kończy się zapytaniem kontrolnym ze WSZYSTKIMI liczbami do porównania',
      brakujace.length === 0, `brakuje w zapytaniu kontrolnym: ${brakujace.join(', ')}`);

    check('kolumny z `zadania.ts` naprawdę istnieją w migracji',
      KOLUMNY_ZADANIA.every((k) => new RegExp(`\\b${k}\\b`).test(migracja)),
      KOLUMNY_ZADANIA.filter((k) => !new RegExp(`\\b${k}\\b`).test(migracja)).join(', '));

    check('nazwa tabeli w kodzie i w migracji to ta sama nazwa',
      new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${TABELA_ZADAN}\\b`, 'i').test(migracja),
      `${TABELA_ZADAN} vs migracja`);
  } else {
    pomin('⛔ RLS włączone w tej samej migracji, co `create table` (9 asercji)', BRAK_MIGRACJI);
  }
}

// ═════════════════════════════════════════════════════════════════════
console.log('\nR7. TEN PLIK MA ZOSTAĆ CZYSTY');
// ═════════════════════════════════════════════════════════════════════
{
  check('⛔ `zadania.ts` nie importuje Supabase', !/supabase/i.test(zywyTS), 'znalazłem import klienta');
  check('⛔ `zadania.ts` nie importuje Reacta', !/from\s+'react/i.test(zywyTS), 'znalazłem import Reacta');
  check('⛔ `zadania.ts` nie czyta zegara (`Date.now`, `new Date`)',
    !/Date\.now\(|new\s+Date\(/.test(zywyTS),
    'czas ma wchodzić parametrem — inaczej logiki nie da się przetestować');
  check('⛔ `zadania.ts` nie robi `fetch` ani niczego sieciowego',
    !/\bfetch\s*\(/.test(zywyTS), 'znalazłem `fetch`');
  check('lista kolumn do `select` jest jedna i pochodzi z jednego miejsca',
    SELECT_ZADANIA === KOLUMNY_ZADANIA.join(', ') && SELECT_ZADANIA.includes('reason_fact'),
    SELECT_ZADANIA);
  check('⛔ `user_id` nie wychodzi do appki — polityka i tak zwraca tylko własne wiersze',
    !KOLUMNY_ZADANIA.includes('user_id' as never), KOLUMNY_ZADANIA.join(', '));
}

console.log(`\n${passed} passed, ${failed} failed${pominiete > 0 ? `, ${pominiete} POMINIETE (patrz wyżej)` : ''}`);
if (failed > 0) process.exit(1);
