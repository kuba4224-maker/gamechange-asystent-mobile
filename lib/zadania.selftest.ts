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
//   ⭐ R8 (PLAN-D-T1, 16.08.2026). TABELA MA PRODUCENTA — I DOKŁADNIE JEDNEGO
//      W APPCE. Do 16.08 w całym produkcie nie było ani jednego `insert` do
//      `player_tasks`: ekran z trzema kubełkami i polem odhaczenia nie mógł
//      dostać ani jednej rzeczy do odhaczenia. Sekcja 0a pilnuje, że producent
//      (a) — zadanie własne zawodnika — JEST na ekranie, i że producent (b) —
//      zadanie systemowe z wglądu — ZOSTAJE POZA APPKĄ.
//
// ── CZEGO TEN STRAŻNIK NIE SPRAWDZA ──────────────────────────────────
// ⚠️ PLAN-D-T1 16.08.2026 — POPRAWKA ZDANIA, KTÓRE STARZAŁO SIĘ CICHO (O67).
//    Stało tu: „⛔ Nie sprawdza EKRANU — ekranu nie ma, buduje go pas C2".
//    Ekran JEST od `e1845e4` (pas C2, 14.08.2026), a od pasa I2 ten plik go
//    CZYTA (sekcja 0). To zdanie usprawiedliwiało zasięg, którego nic już nie
//    usprawiedliwiało — i przez dwie doby nikt go nie przeczytał ponownie.
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

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  odczytZadan,
  zadanieZWiersza,
  czyOdczytNiepelny,
  opisOdczytuDoLogu,
  zbudujKluczSystemowy,
  zbudujZadanieSystemowe,
  // ⭐ PLAN-D-T1 08.2026 — dwaj producenci i ich reguły.
  zbudujZadanieWlasne,
  zbudujZadanieSystemoweZWgladu,
  zdanieZnaczeniaWgladu,
  MAKS_DLUGOSC_TYTULU,
  ZRODLO_ZADANIA_Z_WGLADU,
  TABELA_ZADAN,
  KOLUMNY_ZADANIA,
  SELECT_ZADANIA,
  UPSERT_ZADANIA_SYSTEMOWEGO,
  REJESTRY_Z0,
  ZRODLA_ZADANIA,
  STANY_ZADANIA,
  type OdpowiedzBazy,
} from './zadania';
// ⭐ PLAN-D-T1 — zapadka na RÓWNOŚĆ z drugą kopią reguły sklejania znaczenia.
// ⚠️ To jest import WARTOŚCI i wolno go tu zrobić: cykl domyka się dopiero
// wtedy, gdy wartość z tego modułu importuje `lib/zadania.ts` (patrz komentarz
// przy `import type` na górze tamtego pliku). Strażnik nie jest w tym łańcuchu.
import {
  policzWglady,
  naKandydata,
  zbudujWglad,
  KLUCZE_WGLADOW,
  type WejsciaWgladow,
  type Wglad,
} from './wgladyZAlgorytmu';
// ⭐ PLAN-D-T1 — brzmienia producenta (a). Strażnik sprawdza, że ekran bierze
// je STĄD, a nie ma własnej kopii polskiego zdania.
import {
  zdanieOdmowyDodania,
  BLAD_DODANIA,
  DODAJ_NAGLOWEK,
  DODAJ_PLACEHOLDER,
  DODAJ_PRZYCISK,
  DODAJ_ZAPISUJE,
  DODANE_PREFIKS,
  ODMOWA_BRAK_KONTA,
  ODMOWA_TYTUL_PUSTY,
  ODMOWA_TYTUL_ZA_DLUGI,
} from './listaZadan';

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

const PLIK_MIGRACJI = 'docs/MIGRACJA_A4_ZADANIA_14_08_2026.sql';
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
  `⛔ NIE MA PLIKU MIGRACJI ${PLIK_MIGRACJI}. Szukałem: ${KANDYDACI_MIGRACJI.join(' | ')}. `
  + 'To NIE JEST powód, żeby przejść na zielono — warstwa, która pilnuje, żeby zawodnik '
  + 'nie czytał cudzych zadań, po prostu się nie wykonała. Odtwórz plik z pomiaru '
  + 'produkcji (patrz RLS_ZMIERZONE_NA_PRODUKCJI niżej) albo powiedz wprost, że tej '
  + 'warstwy nie pilnujemy.';

/**
 * ⭐ PAS I1 16.08.2026 — OCZEKIWANY KSZTAŁT RLS, ZMIERZONY NA PRODUKCJI.
 *
 * ── PO CO TO TU STOI ────────────────────────────────────────────────
 * Do 16.08.2026 dziewięć asercji o RLS nie wykonywało się w ogóle: plik
 * migracji nie istniał, strażnik mówił `POMINIETE`, a podsumowanie suity
 * liczyło to jako przejście („44/44 przeszło", wyjście 0). Runda H1 nazwała
 * to klasą K5, a ograniczenie O76 brzmi: `POMINIETE` NIE JEST PRZEJŚCIEM.
 *
 * ── DLACZEGO STAŁA, A NIE SAM PLIK `.sql` ───────────────────────────
 * Migracja opisuje PRZESZŁOŚĆ — to, co kiedyś wykonano. Strażnik ma pilnować
 * TERAŹNIEJSZOŚCI. Plik odtworzony z pomiaru zestarzeje się cicho przy
 * pierwszej zmianie polityki (O67), więc źródłem oczekiwania jest TA STAŁA,
 * a plik `.sql` jest tym, co strażnik z nią PORÓWNUJE.
 *
 * ── CZEGO TO NIE ZAŁATWIA — POWIEDZIANE WPROST ──────────────────────
 * ⛔ Strażnik NIE ŁĄCZY SIĘ Z BAZĄ (CI nie ma i nie będzie miał hasła
 *    produkcji). Rozjazd PRODUKCJI z tą stałą jest niewidoczny dla suity.
 *    Kontrola migracji dzieje się na produkcji, nie w CI (O65).
 * ⭐ ZMIERZONE 16.08.2026, projekt `kqrbztsvepjtggjmmcdx`, zapytania do
 *    `pg_policy`, `pg_class`, `pg_constraint`, `pg_indexes`, `pg_trigger`,
 *    `information_schema.role_table_grants`. Zero zapisu do bazy.
 *    Wynik: rls=t · polityki=3 · polityka_delete=0 · checki=8 · indeksy=3
 *    · wyzwalacz=1 · granty_authenticated=3 · granty_anon=0 · wierszy=0.
 * ⭐ WNIOSEK Z POMIARU (O74 działa w obie strony): H1 postawił tę pozycję
 *    najwyżej, bo „cudze zadania mogą być czytelne". POMIAR TEGO NIE
 *    POTWIERDZIŁ. Nie ma dziury — był brak dowodu.
 */
const RLS_ZMIERZONE_NA_PRODUKCJI = {
  data: '16.08.2026',
  rlsWlaczone: true,
  liczbaPolityk: 3,
  liczbaPolitykDelete: 0,
  grantyAnon: 0,
  grantyAuthenticated: 3,
  /** Nazwa polityki → komenda SQL, do której jest przypięta. */
  polityki: {
    player_tasks_select_own: 'select',
    player_tasks_insert_own: 'insert',
    player_tasks_update_own: 'update',
  } as Record<string, string>,
  /** Rola, do której przypięta jest KAŻDA polityka. Nigdy `public`, nigdy `anon`. */
  rola: 'authenticated',
  /** Warunek izolacji: własny wiersz i nic poza nim. */
  izolacja: 'user_id = (select auth.uid())',
  /**
   * `with check` polityki INSERT — pięć warunków. Zawodnik nie wstawi wiersza
   * udającego zadanie systemowe: ani cudzego, ani z kluczem systemowym,
   * ani ze źródłem, którego nie ma.
   */
  insertWithCheck: [
    "user_id = (select auth.uid())",
    "origin = 'player'",
    'system_key is null',
    'source_table is null',
    'source_row_id is null',
  ],
} as const;

console.log('zadania.selftest.ts — strażnik tabeli zadań (pas A4)\n');
console.log(sciezkaMigracji
  ? `migracja czytana z: ${sciezkaMigracji}\n`
  : `⛔ ${BRAK_MIGRACJI}\n`);

// ═════════════════════════════════════════════════════════════════════
console.log('⭐ 0. (I2) EKRAN, KTÓRY RYSUJE ZADANIA ZAWODNIKA (K4 / O75)');
// ═════════════════════════════════════════════════════════════════════
//
// ── CO BYŁO ZEPSUTE — nazwane liczbą, nie odczuciem ──────────────────
//
// Ten plik miał 69 asercji i ANI JEDNEJ, która czytałaby jakikolwiek EKRAN.
// Cały jego zasięg to `readFileSync(lib/zadania.ts)` plus plik migracji.
// Pas I1 zdjął go z listy ślepych za chorobę K5 (`POMINIETE` udające
// przejście przy asercjach RLS) — ale K5 i **K4** NIE SĄ ROZŁĄCZNE i K4
// tu został: strażnik nadal nie widział ekranu.
//
// ⚠️ NAGŁÓWEK TEGO PLIKU MÓWIŁ „Nie sprawdza EKRANU — ekranu nie ma,
// buduje go pas C2". To była prawda 14.08 przez kilka godzin. EKRAN JEST
// OD `e1845e4` (pas C2, 14.08.2026): `components/ListaZadan.tsx`.
// Zdanie „ekranu nie ma" zestarzało się cicho i przez dwie doby usprawiedliwiało
// zasięg, którego nic już nie usprawiedliwiało (**O67**).
//
// ── CO TU PILNUJEMY, A CZEGO PILNUJE KTO INNY ───────────────────────
// ⛔ `lib/listaZadan.selftest.ts` (naprawiony przez I1) czyta TEN SAM ekran
// i pilnuje KOLEJKI: sortowania, kubełków, sum, czterech zdań `zdanieOdczytu`,
// zapisu odhaczenia i podniesienia. TEGO TU NIE POWTARZAMY.
//
// Ten blok pilnuje ZADAŃ ZAWODNIKA (`player_tasks`) — czyli tej części
// łańcucha, którą liczy `lib/zadania.ts`:
//   1. zadanie napisane przez zawodnika DOCHODZI z bazy na ekran
//      (te same nazwy tabeli i kolumn, jedna kopia);
//   2. POCHODZENIE (`origin`) jest WIDOCZNE i ROZRÓŻNIANE — „Ty to dodałeś."
//      to nie jest to samo zdanie co „To wstawił system, nie Ty.";
//   3. zadanie systemowe NIE UDAJE zadania zawodnika, a wartość `origin`,
//      której ta wersja appki nie zna, nie wychodzi na ekran surowa.
//
// ── DLACZEGO TO JEST GROŹNE AKURAT TUTAJ ────────────────────────────
// `zadanieZWiersza` ODRZUCA wiersz, którego nie umie przeczytać — i robi to
// SŁUSZNIE. Skutek jest jednak taki, że rozjazd między zapytaniem na ekranie
// a regułą w module NIE DAJE BŁĘDU: zadanie zawodnika po prostu ZNIKA
// z listy, a odrzucenie ląduje w `odrzucone`. Ekran mówi wtedy „lista jest
// niepełna", zawodnik nie wie, czego brakuje, a te 69 asercji świeci 69/69.
//
// ⚠️ CZEGO TEN BLOK NIE UDAJE. Czyta źródło ekranu JAKO TEKST. Nie uruchamia
// Reacta i nie wie, czy ekran się rysuje. Podmiana wywołania na inne, równie
// zepsute, przejdzie tu niezauważona.
{
  const bezKom = bezKomentarzyTS;

  // ── ⛔ BRAK PLIKU JEST FAIL-em Z NAZWĄ, nie wyjątkiem `ENOENT` (O76) ──
  // Strażnik, który pada przed pierwszą asercją, w CI wygląda jak awaria
  // narzędzia — a jest EKRANEM, KTÓRY ZNIKNĄŁ Z REPOZYTORIUM.
  const BRAK_PLIKOW: string[] = [];
  const surowe = (wzgledna: string): string => {
    const p = join(appRoot, wzgledna);
    if (!existsSync(p)) { BRAK_PLIKOW.push(wzgledna); return ''; }
    return readFileSync(p, 'utf8');
  };

  const PLIK_LISTY = 'components/ListaZadan.tsx';
  const PLIK_KARTY = 'components/PozycjaKolejkiCard.tsx';
  const PLIK_RANKERA = 'lib/kolejkaPodania.ts';
  const lista = bezKom(surowe(PLIK_LISTY));
  const karta = bezKom(surowe(PLIK_KARTY));
  const ranker = bezKom(surowe(PLIK_RANKERA));

  check('⛔ (I2-0) każdy plik z listy strażnika istnieje i daje się odczytać',
    BRAK_PLIKOW.length === 0,
    `NIE MA TYCH PLIKÓW: ${BRAK_PLIKOW.join(', ')} — zmieniła się nazwa albo miejsce ekranu. `
    + 'Popraw listę w tym pliku ALBO przywróć ekran; do tego czasu asercje niżej '
    + 'czytają PUSTY tekst i nie znaczą nic.');

  // ── Odkrywanie z katalogu, nie lista na sztywno (O69) ──
  // ⚠️ Lista na sztywno KŁAMIE NA ZIELONO: dopisany konsument, który czyta
  // `player_tasks` po swojemu, nie pojawiłby się w niej nigdy.
  const POMIN_KAT = new Set(['_diag_backup', 'node_modules', '.git', '.expo', 'assets']);
  const chodz = (katalog: string, out: string[] = []): string[] => {
    if (!existsSync(katalog)) return out;
    for (const wpis of readdirSync(katalog)) {
      if (POMIN_KAT.has(wpis)) continue;
      const p = join(katalog, wpis);
      if (statSync(p).isDirectory()) chodz(p, out);
      else if (p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p);
    }
    return out;
  };
  const EKRANY = ['app', 'components']
    .flatMap((k) => chodz(join(appRoot, k)))
    .map((p) => relative(appRoot, p).split(sep).join('/'))
    .filter((p) => !p.endsWith('.selftest.ts'))
    .sort();

  const konsumenci = EKRANY.filter(
    (p) => /from\s+'[^']*\/zadania'/.test(bezKom(readFileSync(join(appRoot, p), 'utf8'))));
  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c` (po D2 i I1), nie przepisane
  // z pamięci. RÓWNOŚĆ, nie „≥ 1" (**O73**): „co najmniej jeden konsument"
  // przeszłoby także wtedy, gdy modal „Moje zadania" przestanie czytać
  // `player_tasks`, a zostanie sam podpis wejścia na ekranie „Ja".
  const KONSUMENCI = ['app/(tabs)/dzis.tsx', 'app/(tabs)/ja.tsx', PLIK_LISTY].sort();
  const brakujacy = KONSUMENCI.filter((p) => !konsumenci.includes(p));
  const nadmiarowi = konsumenci.filter((p) => !KONSUMENCI.includes(p));
  check('⭐ (I2-0) zadania zawodnika czytają DOKŁADNIE te pliki, co 16.08 — RÓWNOŚĆ, nie „≥ 1" (O73)',
    brakujacy.length === 0 && nadmiarowi.length === 0,
    `BRAKUJE: ${brakujacy.join(', ') || '—'} · NADMIAROWI: ${nadmiarowi.join(', ') || '—'} `
    + '→ ubył: zawodnik przestał gdzieś widzieć swoje zadania, a te 69 asercji niżej nadal jest zielonych; '
    + 'doszedł: sprawdź, czy nowe miejsce nie czyta `player_tasks` z własną listą kolumn.');

  // ── ⛔ JEDNA NAZWA TABELI I JEDNA LISTA KOLUMN ────────────────────
  // Defekt, którego pilnuje: ekran wpisuje `'player_tasks'` i listę kolumn
  // ręcznie. Wtedy nowa kolumna dołożona do `KOLUMNY_ZADANIA` NIE PRZYCHODZI
  // z bazy, `zadanieZWiersza` odrzuca wiersz z powodem „wiersz bez `…`",
  // a ZADANIE ZAWODNIKA ZNIKA MU Z LISTY BEZ ANI JEDNEGO BŁĘDU.
  check('⛔ (I2-0) ekran pyta bazę NAZWĄ Z MODUŁU (`TABELA_ZADAN`), nie napisem wpisanym u siebie',
    /\.from\(\s*TABELA_ZADAN\s*\)/.test(lista) && !new RegExp(`['"]${TABELA_ZADAN}['"]`).test(lista),
    `na ekranie stoi kopia nazwy tabeli „${TABELA_ZADAN}" — literówka albo zmiana nazwy `
    + 'rozjedzie się po cichu, a zawodnik dostanie „nie masz nic do zrobienia" zamiast swoich zadań');

  check('⛔ (I2-0) ekran pyta bazę LISTĄ KOLUMN Z MODUŁU (`SELECT_ZADANIA`), nie wpisaną ręcznie',
    /\.select\(\s*SELECT_ZADANIA\s*\)/.test(lista)
    && !/\.select\(\s*['"][^'"]*\breason_fact\b/.test(lista),
    'lista kolumn wpisana na ekranie rozjedzie się ze stałą po cichu — brakująca kolumna '
    + 'nie daje błędu, tylko odrzucenie wiersza przez `zadanieZWiersza`, czyli ZNIKNIĘCIE zadania');

  // ── ⛔ ZAPIS MUSI SPEŁNIAĆ REGUŁĘ ODCZYTU ────────────────────────
  // `zadanieZWiersza` odrzuca wiersz w stanie innym niż `open` BEZ daty zmiany
  // („fakt bez momentu"). Ekran, który zapisze samo `state: 'done'`, sprawi,
  // że odhaczone zadanie stanie się wierszem NIECZYTELNYM — zniknie z listy
  // nie dlatego, że jest zrobione, tylko dlatego, że jest zepsute.
  const zapisOdhaczenia = /\.update\(\{[^}]*\bstate:\s*'done'[^}]*\}\)/.exec(lista)?.[0] ?? '';
  check('⛔ (I2-0) odhaczenie zapisuje `state` I `state_changed_at` naraz — stan bez momentu jest odrzucany przy odczycie',
    zapisOdhaczenia.length > 0 && /state_changed_at\s*:/.test(zapisOdhaczenia),
    `zapis odhaczenia na ekranie: ${zapisOdhaczenia || '(nie znalazłem `state: \'done\'`)'} — `
    + 'bez `state_changed_at` `zadanieZWiersza` odrzuci ten wiersz z powodem „fakt bez momentu", '
    + 'więc zadanie zniknie zawodnikowi jako NIECZYTELNE, a nie jako zrobione');

  // ── ⭐ POCHODZENIE ZADANIA JEST WIDOCZNE I ROZRÓŻNIANE (WG-17) ────
  // ⚠️ Kanał jest długi: `origin` z bazy → `Zadanie.zrodlo` (moduł) →
  // `skadToWiemy.klucz` (ranker) → zdanie `SKAD_TO_WIEMY` (karta). Rozerwanie
  // go w KTÓRYMKOLWIEK miejscu daje pozycję bez wiersza „skąd to wiemy" —
  // i wtedy zadanie wstawione przez system wygląda dokładnie tak samo,
  // jak zadanie, które zawodnik napisał sobie sam.
  check('⭐ (I2-0) ranker bierze klucz pochodzenia Z MODUŁU (`z.zrodlo`), nie liczy go po swojemu',
    /klucz:\s*z\.zrodlo\s*\?\?/.test(ranker),
    'ranker przestał przekazywać `zrodlo` zadania do śladu — wiersz „skąd to wiemy" '
    + 'zniknie albo powie coś, czego moduł nie stwierdził');

  const brakZdania = (ZRODLA_ZADANIA as readonly string[])
    .filter((z) => !new RegExp(`(^|\\n)\\s*${z}\\s*:\\s*['"]`).test(karta));
  check('⭐ (I2-0) KAŻDE znane źródło z `ZRODLA_ZADANIA` ma na ekranie swoje zdanie „skąd to wiemy"',
    brakZdania.length === 0,
    `źródła bez zdania w SKAD_TO_WIEMY: ${brakZdania.join(', ')} — pozycja z takim `
    + '`origin` traci wiersz „skąd to wiemy" (`SKAD_TO_WIEMY[klucz]` = `undefined`), '
    + 'a zawodnik nie ma jak odróżnić rzeczy, którą dodał sobie sam, od tej, którą wstawił mu produkt');

  // ⛔ ZADANIE SYSTEMOWE NIE UDAJE ZADANIA ZAWODNIKA — dwa różne zdania.
  const zdanieDla = (z: string): string | null =>
    new RegExp(`(^|\\n)\\s*${z}\\s*:\\s*'((?:[^'\\\\]|\\\\.)*)'`).exec(karta)?.[2] ?? null;
  const zdaniePlayer = zdanieDla('player');
  const zdanieSystem = zdanieDla('system');
  check('⛔ ⭐ (I2-0) „Ty to dodałeś" i „to wstawił system" to DWA RÓŻNE zdania, nie jedno',
    zdaniePlayer !== null && zdanieSystem !== null && zdaniePlayer !== zdanieSystem,
    `player: „${zdaniePlayer ?? '(brak)'}" · system: „${zdanieSystem ?? '(brak)'}" — `
    + 'gdy oba brzmią tak samo, produkt przypisuje zawodnikowi rzecz, której nie wybrał, '
    + 'albo odbiera mu autorstwo rzeczy, którą wybrał (Z0: fakt_o_tobie ≠ propozycja)');

  // ⛔ WARTOŚĆ SPOZA ZBIORU NIE WYCHODZI NA EKRAN SUROWA.
  // `lib/zadania.ts` przy nieznanym `origin` daje `zrodlo: null` i chowa
  // surowiec w `nieznaneZrodlo`; ranker wstawia wtedy klucz `nieznane`.
  // Karta MA dla tego klucza nie mieć zdania — wiersz się wtedy nie rysuje.
  check('⛔ (I2-0) nieznane źródło NIE dostaje zgadniętego zdania — klucza `nieznane` nie ma w `SKAD_TO_WIEMY`',
    !/(^|\n)\s*nieznane\s*:\s*['"]/.test(karta)
    && /SKAD_TO_WIEMY\[\s*pozycja\.skadToWiemy\.klucz\s*\]/.test(karta)
    && /skad\s*!==\s*undefined/.test(karta),
    'karta albo zgaduje brzmienie dla źródła, którego ta wersja appki nie zna, albo przestała '
    + 'sprawdzać `undefined` — w obu wypadkach zawodnik czyta o pochodzeniu zdanie, '
    + 'którego produkt nie ma prawa postawić (Z0)');

  check('⛔ (I2-0) surowa wartość `origin` z bazy nie jest rysowana zawodnikowi',
    !/\{\s*[A-Za-z_$][\w$.]*\.nieznaneZrodlo\s*\}/.test(karta)
    && !/\{\s*[A-Za-z_$][\w$.]*\.nieznaneZrodlo\s*\}/.test(lista),
    'na ekranie stoi `{…nieznaneZrodlo}` — zawodnik zobaczy surową wartość z kolumny '
    + '(„club_import" wygląda jak etykieta, więc nikt nigdy nie zgłosi, że etykiety brakuje)');

  // ── ⭐ ZAPADKA NA SKASOWANIE ─────────────────────────────────────
  // Bez niej WSZYSTKIE asercje wyżej spełnia też ekran, który zadań
  // zawodnika nie pokazuje wcale — a strażnik nagradzałby wtedy skasowanie.
  check('⭐ (I2-0) ekran NAPRAWDĘ czyta zadania modułem: `odczytZadan({ data, error })` z całej odpowiedzi',
    /odczytZadan\(\s*\{[^}]*\bdata:[^}]*\berror:[^}]*\}\s*\)/.test(lista),
    'zniknęło wywołanie `odczytZadan` z pełną odpowiedzią bazy — cztery stany R5 nie mają '
    + 'z czego powstać, a `data ?? []` zamieni odmowę RLS w pogodne „nic nie masz do zrobienia"');

  check('⭐ (I2-0) …i NAPRAWDĘ oddaje ten odczyt kolejce — bez tego zadania są policzone i nienarysowane',
    /\bzadania:\s*weZadania\b/.test(lista) && /\bodczyt:\s*weZadania\b/.test(lista),
    'wynik `odczytZadan` nie dociera do wejść kolejki albo do stanu ekranu — zadanie zawodnika '
    + 'jest wtedy odczytane bezbłędnie i nie pojawia się na żadnej liście');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n⭐ 0a. (T1) DWAJ PRODUCENCI — TABELA, KTÓRA MOŻE DOSTAĆ ZADANIE');
// ═════════════════════════════════════════════════════════════════════
//
// ── CO BYŁO ZEPSUTE — nazwane liczbą, nie odczuciem ──────────────────
//
// > W CAŁYM PRODUKCIE NIE BYŁO ANI JEDNEGO `insert` DO `player_tasks`.
//
// Zmierzone 16.08.2026: `player_tasks` występowała WYŁĄCZNIE w `select`
// (`ListaZadan.tsx`, `dzis.tsx`, `ja.tsx`), w `update` (`state:'done'`,
// `raised_at`) i w stałej `UPSERT_ZADANIA_SYSTEMOWEGO`, której jedynym
// czytelnikiem był jej własny strażnik. Ekran „Moje zadania" — trzy kubełki,
// pole odhaczenia, podnoszenie do „Teraz", suma czasu — NIE MÓGŁ DOSTAĆ ANI
// JEDNEJ rzeczy do odhaczenia, choćby zawodnik używał aplikacji rok.
// Tabela z RLS, trzema politykami, ośmioma CHECK-ami i wyzwalaczem stała
// pusta, bo nikt do niej nie pisał. **88 asercji tego pliku świeciło 88/88.**
//
// ── DWA PRODUCENTY, DWA RÓŻNE MIEJSCA — I TO JEST SEDNO TEJ SEKCJI ──
//   (a) ZADANIE WŁASNE ZAWODNIKA — wstawia EKRAN, przez RLS.
//   (b) ZADANIE SYSTEMOWE Z WGLĄDU — buduje `lib/zadania.ts`, ⛔ a wstawia
//       BACKEND na `service_role`. Polityka `player_tasks_insert_own` ma pięć
//       warunków `with check` i trzy z nich (`system_key is null`,
//       `source_table is null`, `source_row_id is null`) NIE POZWOLĄ appce
//       wstawić zadania udającego zadanie produktu.
//
// ⭐ **TO JEST ZABEZPIECZENIE NIELETNIEGO, NIE PRZESZKODA** — i dlatego ma
// tu WŁASNĄ, IMIENNĄ ASERCJĘ (T1-A3), a nie sam komentarz.
//
// ── ⚠️ DWIE ZAPADKI, KTÓRE MUSZĄ STAĆ RAZEM (O86) ───────────────────
// Asercję „żaden plik appki nie wstawia `system_key`" ucisza się najtaniej
// NIE naprawą, tylko ZDJĘCIEM CAŁEGO `insert`. Dlatego obok niej stoi
// zapadka na RÓWNOŚĆ: plików wstawiających do `player_tasks` ma być
// DOKŁADNIE JEDEN, imiennie ten. Zero też zapala strażnika.
//
// ⚠️ CZEGO TA SEKCJA NIE UDAJE. Czyta źródło ekranu JAKO TEKST — nie
// uruchamia Reacta ani Supabase. Że `insert` NAPRAWDĘ dochodzi do bazy,
// nie wie; wie tylko, że stoi w kodzie i że buduje go moduł, nie ekran.
{
  const bezKom = bezKomentarzyTS;
  const BRAK_PLIKOW_T1: string[] = [];
  const surowe = (wzgledna: string): string => {
    const p = join(appRoot, wzgledna);
    if (!existsSync(p)) { BRAK_PLIKOW_T1.push(wzgledna); return ''; }
    return readFileSync(p, 'utf8');
  };

  const PLIK_LISTY = 'components/ListaZadan.tsx';
  const PLIK_BRZMIEN = 'lib/listaZadan.ts';
  const lista = bezKom(surowe(PLIK_LISTY));
  const brzmienia = bezKom(surowe(PLIK_BRZMIEN));

  check('⛔ (T1-A1) plik EKRANU i plik BRZMIEŃ istnieją — brak jest FAIL-em z nazwą, nie `ENOENT` (O76)',
    BRAK_PLIKOW_T1.length === 0,
    `NIE MA TYCH PLIKÓW: ${BRAK_PLIKOW_T1.join(', ')} — asercje niżej czytają PUSTY tekst `
    + 'i nie znaczą nic. Popraw listę ALBO przywróć plik.');

  // ── ODKRYWANIE Z KATALOGU, NIE LISTA NA SZTYWNO (O69) ─────────────
  const POMIN_KAT_T1 = new Set(['_diag_backup', 'node_modules', '.git', '.expo', 'assets']);
  const chodzT1 = (katalog: string, out: string[] = []): string[] => {
    if (!existsSync(katalog)) return out;
    for (const wpis of readdirSync(katalog)) {
      if (POMIN_KAT_T1.has(wpis)) continue;
      const p = join(katalog, wpis);
      if (statSync(p).isDirectory()) chodzT1(p, out);
      else if (p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p);
    }
    return out;
  };
  const PLIKI_APPKI = ['app', 'components']
    .flatMap((k) => chodzT1(join(appRoot, k)))
    .map((p) => relative(appRoot, p).split(sep).join('/'))
    .filter((p) => !p.endsWith('.selftest.ts'))
    .sort();
  const zrodloAppki = new Map<string, string>(
    PLIKI_APPKI.map((p) => [p, bezKom(readFileSync(join(appRoot, p), 'utf8'))]),
  );

  check('⛔ (T1-A2) przemiatanie w ogóle coś znalazło — pusty zbiór plików uczyniłby wszystko niżej zielonym',
    PLIKI_APPKI.length > 0 && PLIKI_APPKI.includes(PLIK_LISTY),
    `plików appki: ${PLIKI_APPKI.length}; ekranu ${PLIK_LISTY} `
    + `${PLIKI_APPKI.includes(PLIK_LISTY) ? 'nie brakuje' : 'NIE MA W ZBIORZE'}`);

  // ⭐ KTO WSTAWIA DO `player_tasks` — RÓWNOŚĆ, nie „≥ 1" (O73).
  const wstawiajacy = PLIKI_APPKI.filter((p) => {
    const s = zrodloAppki.get(p) ?? '';
    return /\.from\(\s*TABELA_ZADAN\s*\)[\s\S]{0,400}?\.insert\(/.test(s);
  });
  check('⭐ (T1-A2) do `player_tasks` wstawia DOKŁADNIE JEDEN plik appki — imiennie ekran „Moje zadania"',
    wstawiajacy.length === 1 && wstawiajacy[0] === PLIK_LISTY,
    `wstawiają: ${wstawiajacy.join(', ') || '⛔ ŻADEN — to jest dokładnie stan sprzed 16.08.2026: '
      + 'ekran z trzema kubełkami, który nie może dostać ani jednej rzeczy do odhaczenia'} `
    + `(oczekiwany dokładnie jeden: ${PLIK_LISTY})`);

  // ⛔ ⭐ ASERCJA IMIENNA — ZABEZPIECZENIE NIELETNIEGO PRZED PODSZYCIEM SIĘ
  // POD PRODUKT. Zadanie z `system_key` wygląda na liście dokładnie tak samo
  // jak rzecz, którą wstawił produkt („To wstawił system, nie Ty."). Gdyby
  // appka umiała je napisać, zawodnik mógłby przypisać produktowi zdanie,
  // którego produkt nigdy nie powiedział — i nikt by tego nie odróżnił.
  const zPolemSystemowym = PLIKI_APPKI.filter((p) =>
    /\bsystem_key\b|\bsource_row_id\b|\bsource_table\b/.test(zrodloAppki.get(p) ?? ''));
  check('⛔ ⭐ (T1-A3) ŻADEN plik appki nie dotyka pól systemowych zadania (`system_key`, `source_table`, `source_row_id`)',
    zPolemSystemowym.length === 0,
    `dotykają: ${zPolemSystemowym.join(', ')} — polityka player_tasks_insert_own odrzuci taki `
    + 'wiersz, ale kod, który go buduje, znaczy, że ktoś tej drogi szukał. Zadanie systemowe '
    + 'wstawia BACKEND na `service_role`, nie appka.');

  const wolajacyProducentaSystemowego = PLIKI_APPKI.filter((p) =>
    /zbudujZadanieSystemowe/.test(zrodloAppki.get(p) ?? ''));
  check('⛔ ⭐ (T1-A3) ŻADEN plik appki nie woła producenta zadań SYSTEMOWYCH',
    wolajacyProducentaSystemowego.length === 0,
    `wołają: ${wolajacyProducentaSystemowego.join(', ')} — ta funkcja jest dla backendu `
    + '(`service_role`). Wywołana w appce zbuduje wiersz, którego RLS nie wpuści, '
    + 'a zawodnik dostanie błąd zamiast zadania.');

  // ── ⭐ EKRAN RYSUJE POLE I PRZYCISK (O75) ─────────────────────────
  check('⭐ (T1-A4) ekran ma POLE TEKSTOWE wpięte w stan („Dopisz coś swojego")',
    /<TextInput[\s\S]{0,400}?value=\{nowyTytul\}/.test(lista)
    && /onChangeText=\{setNowyTytul\}/.test(lista),
    'nie znalazłem `<TextInput>` z `value={nowyTytul}` i `onChangeText={setNowyTytul}` — '
    + 'bez pola producent (a) nie istnieje, a lista wraca do stanu „nie ma jak nic dopisać"');

  check('⭐ (T1-A4) ekran ma PRZYCISK, który woła zapis (`onPress={dodaj}`)',
    /onPress=\{dodaj\}/.test(lista),
    'pole bez przycisku jest polem, które nic nie zapisuje — a pole, które nic nie robi, '
    + 'uczy zawodnika, że pola nic nie robią');

  check('⛔ (T1-A4) ekran wstawia WIERSZ ZBUDOWANY PRZEZ MODUŁ, nie sklejony u siebie',
    /zbudujZadanieWlasne\(\s*\{[^}]*userId[^}]*tytul/.test(lista)
    && /\.insert\(\s*zbudowane\.wiersz\s*\)/.test(lista),
    'ekran skleja obiekt do `insert` sam — wtedy pięć warunków polityki '
    + '`player_tasks_insert_own` żyje w pliku, którego nikt nie sprawdzi bez uruchomienia appki');

  // ── ⛔ BŁĄD ZAPISU MA WŁASNE ZDANIE I NIE ZABIERA TEKSTU (R5) ────
  const cialoDodaj = /const dodaj = useCallback\(async \(\) => \{([\s\S]*?)\n  \}, \[/.exec(lista)?.[1] ?? '';
  check('⛔ (T1-A5) w ekranie w ogóle jest funkcja `dodaj` — bez niej asercje niżej czytają pustkę (O71)',
    cialoDodaj.trim().length > 0,
    'nie wyciąłem ciała `const dodaj = useCallback(async () => { … }, [` — zmienił się kształt, '
    + 'popraw wycięcie, zamiast zostawiać asercje czytające pusty napis');

  const poBledzie = cialoDodaj.split('if (error) {')[1] ?? '';
  const galazBledu = poBledzie.split('return;')[0] ?? '';
  check('⛔ ⭐ (T1-A5) błąd zapisu ma WŁASNE ZDANIE i NIE CZYŚCI POLA — tekst zawodnika nie przepada',
    poBledzie.length > 0
    && /setBladDodania\(BLAD_DODANIA\)/.test(galazBledu)
    && !/setNowyTytul/.test(galazBledu),
    `gałąź błędu: „${galazBledu.trim().slice(0, 200)}" — pole wyczyszczone po NIEUDANYM zapisie `
    + 'wygląda dokładnie tak samo jak po udanym: zawodnik traci tekst i myśli, że zadanie jest na liście');

  check('⛔ (T1-A5) …a po UDANYM zapisie pole SIĘ czyści — inaczej to samo zadanie wejdzie dwa razy',
    /setNowyTytul\(''\)/.test(cialoDodaj)
    && cialoDodaj.indexOf("setNowyTytul('')") > cialoDodaj.indexOf('setBladDodania(BLAD_DODANIA)'),
    'nie znalazłem czyszczenia pola PO gałęzi błędu — albo stoi przed nią, czyli czyści także '
    + 'wtedy, gdy zapis się nie udał');

  check('⛔ (T1-A5) odmowa PRZED bazą dostaje INNE zdanie niż awaria zapisu',
    /setBladDodania\(zdanieOdmowyDodania\(/.test(cialoDodaj)
    && /setBladDodania\(BLAD_DODANIA\)/.test(cialoDodaj),
    '„nic nie napisałeś" i „nie udało się zapisać" to dwie różne rzeczy i tylko jedna z nich '
    + 'jest o produkcie — jedno zdanie na oba przypadki mówi zawodnikowi nieprawdę');

  // ── ⛔ BRZMIENIA MIESZKAJĄ W `lib/`, NIE NA EKRANIE ──────────────
  const BRZMIENIA_T1: Array<[string, string]> = [
    ['DODAJ_NAGLOWEK', DODAJ_NAGLOWEK],
    ['DODAJ_PLACEHOLDER', DODAJ_PLACEHOLDER],
    ['DODAJ_PRZYCISK', DODAJ_PRZYCISK],
    ['DODAJ_ZAPISUJE', DODAJ_ZAPISUJE],
    ['DODANE_PREFIKS', DODANE_PREFIKS],
    ['BLAD_DODANIA', BLAD_DODANIA],
  ];
  const bezStalej = BRZMIENIA_T1.filter(([nazwa]) => !new RegExp(`\\b${nazwa}\\b`).test(lista));
  check('⛔ (T1-A6) ekran bierze WSZYSTKIE brzmienia producenta (a) ze stałych, nie z własnych literałów',
    bezStalej.length === 0,
    `stałe nieużyte na ekranie: ${bezStalej.map(([n]) => n).join(', ')}`);

  // ⚠️ SZUKAMY LITERAŁU W POZYCJI NAPISU, NIE PODCIĄGU (O71). Pierwsza wersja
  // tej asercji robiła `lista.includes('Dodaj')` i ZAPALIŁA SIĘ NA `setDodaje`.
  // Asercja wołająca na fałszywych przestaje być czytana po drugim dniu —
  // to jest dokładnie znalezisko I2 §10.3, złapane tu przy pierwszym uruchomieniu.
  const jakoNapis = (t: string): RegExp => {
    const e = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(['"\`]${e}['"\`])|(>\\s*${e}\\s*<)`);
  };
  const literalNaEkranie = BRZMIENIA_T1.filter(([, tekst]) => jakoNapis(tekst).test(lista));
  check('⛔ (T1-A6) …i nie ma na ekranie ANI JEDNEJ kopii tych zdań wpisanej wprost',
    literalNaEkranie.length === 0,
    `kopie zdań na ekranie: ${literalNaEkranie.map(([n]) => n).join(', ')} — dwie kopie zdania `
    + 'widocznego dla zawodnika rozjadą się przy pierwszej zmianie brzmienia (to samo znalezisko co I2-9)');

  check('⛔ (T1-A6) brzmienia producenta (a) stoją w `lib/listaZadan.ts`, razem z pozostałymi',
    /export const DODAJ_NAGLOWEK/.test(brzmienia) && /export const BLAD_DODANIA/.test(brzmienia),
    'brzmienia rozjechały się po plikach — Kuba ma je przeglądać w jednym miejscu');

  // ── TRZY POWODY ODMOWY = TRZY RÓŻNE ZDANIA ──────────────────────
  const zdaniaOdmowy = [
    zdanieOdmowyDodania('brak_konta'),
    zdanieOdmowyDodania('tytul_pusty'),
    zdanieOdmowyDodania('tytul_za_dlugi'),
  ];
  check('⭐ (T1-B7) trzy powody odmowy dają TRZY RÓŻNE zdania, żadne puste',
    new Set(zdaniaOdmowy).size === 3 && zdaniaOdmowy.every((z) => z.trim().length > 0),
    zdaniaOdmowy.join(' | '));
  check('(T1-B7) zdania odmowy to te same stałe, które eksportuje moduł brzmień',
    zdaniaOdmowy[0] === ODMOWA_BRAK_KONTA
    && zdaniaOdmowy[1] === ODMOWA_TYTUL_PUSTY
    && zdaniaOdmowy[2] === ODMOWA_TYTUL_ZA_DLUGI,
    zdaniaOdmowy.join(' | '));
  check('⭐ (T1-B7) zdanie o za długim tytule NIESIE GRANICĘ ZE STAŁEJ, nie liczbę wpisaną ręcznie',
    ODMOWA_TYTUL_ZA_DLUGI.includes(String(MAKS_DLUGOSC_TYTULU)),
    `„${ODMOWA_TYTUL_ZA_DLUGI}" nie zawiera ${MAKS_DLUGOSC_TYTULU} — zmiana granicy w bazie `
    + 'rozjedzie się ze zdaniem, które czyta zawodnik');

  // ── PRODUCENT (a): REGUŁA, URUCHOMIONA ──────────────────────────
  const UZYTKOWNIK = '8d7e1ebb-52d7-4440-a105-e14b2a6ffbf5';
  const wlasne = zbudujZadanieWlasne({ userId: UZYTKOWNIK, tytul: '  Kupić nowe wkładki do korków ' });
  check('⭐ (T1-B1) zadanie własne spełnia CZTERY z pięciu warunków polityki `player_tasks_insert_own`',
    wlasne.ok === true
    && wlasne.wiersz.origin === 'player'
    && wlasne.wiersz.system_key === null
    && wlasne.wiersz.source_table === null
    && wlasne.wiersz.source_row_id === null,
    JSON.stringify(wlasne));
  check('(T1-B1) …a piątym jest `user_id` wzięte z sesji, nie zmyślone',
    wlasne.ok === true && wlasne.wiersz.user_id === UZYTKOWNIK, JSON.stringify(wlasne));
  check('(T1-B1) tytuł jest przycięty z białych znaków, ale nie okrojony po cichu',
    wlasne.ok === true && wlasne.wiersz.title === 'Kupić nowe wkładki do korków',
    JSON.stringify(wlasne));
  check('⛔ (T1-B1) zadanie własne NIE MA POWODU — i to jest poprawne (powodem jest zawodnik)',
    wlasne.ok === true
    && wlasne.wiersz.reason_fact === null && wlasne.wiersz.reason_text === null
    && wlasne.wiersz.reason_register === null && wlasne.wiersz.reason_key === null,
    JSON.stringify(wlasne));
  check('⛔ ⭐ (T1-B1) zadanie własne NIE MA TERMINU (D5) — termin jest karą w przebraniu (N1)',
    wlasne.ok === true && wlasne.wiersz.due_on === null, JSON.stringify(wlasne));

  // ⭐ ZAPADKA ODWROTNA: wiersz zbudowany tu musi PRZEJŚĆ przez regułę odczytu.
  // Bez niej producent mógłby budować wiersz, którego `zadanieZWiersza` nie
  // przyjmie — i zadanie znikałoby zawodnikowi zaraz po dodaniu.
  const wlasnePoOdczycie = wlasne.ok
    ? zadanieZWiersza({ ...wlasne.wiersz, id: 'z-nowe', state: 'open', state_changed_at: null, raised_at: null, created_at: '2026-08-16T10:00:00Z' })
    : { ok: false as const, id: null, powod: 'nie zbudowało się' };
  check('⭐ (T1-B1) wiersz producenta (a) PRZECHODZI regułę odczytu — zadanie nie zniknie zaraz po dodaniu',
    wlasnePoOdczycie.ok === true && wlasnePoOdczycie.zadanie.zrodlo === 'player'
    && wlasnePoOdczycie.zadanie.powod === null,
    JSON.stringify(wlasnePoOdczycie));

  check('(T1-B2) pusty tytuł i sam biały znak dają kod `tytul_pusty`, nie wiersz',
    zbudujZadanieWlasne({ userId: UZYTKOWNIK, tytul: '' }).ok === false
    && zbudujZadanieWlasne({ userId: UZYTKOWNIK, tytul: '   ' }).ok === false,
    JSON.stringify(zbudujZadanieWlasne({ userId: UZYTKOWNIK, tytul: '   ' })));
  check('(T1-B3) brak konta daje kod `brak_konta`, a nie wiersz z pustym `user_id`',
    zbudujZadanieWlasne({ userId: null, tytul: 'x' }).ok === false
    && zbudujZadanieWlasne({ userId: '  ', tytul: 'x' }).ok === false,
    JSON.stringify(zbudujZadanieWlasne({ userId: null, tytul: 'x' })));

  const naGranicy = zbudujZadanieWlasne({ userId: UZYTKOWNIK, tytul: 'x'.repeat(MAKS_DLUGOSC_TYTULU) });
  const zaGranica = zbudujZadanieWlasne({ userId: UZYTKOWNIK, tytul: 'x'.repeat(MAKS_DLUGOSC_TYTULU + 1) });
  check('⭐ (T1-B4) granica długości jest DOKŁADNA — 120 przechodzi, 121 nie',
    naGranicy.ok === true && zaGranica.ok === false,
    `${MAKS_DLUGOSC_TYTULU}: ${naGranicy.ok} · ${MAKS_DLUGOSC_TYTULU + 1}: ${zaGranica.ok}`);
  check('⛔ (T1-B4) za długi tytuł jest ODRZUCANY, a nie OBCINANY po cichu',
    zaGranica.ok === false && zaGranica.kod === 'tytul_za_dlugi',
    JSON.stringify(zaGranica).slice(0, 160));

  // ⭐ ZAPADKA NA RÓWNOŚĆ Z BAZĄ: granica w kodzie = granica w CHECK-u.
  const granicaZMigracji = migracja
    ? /char_length\(\s*title\s*\)\s*<=\s*(\d+)/i.exec(migracja)?.[1]
      ?? /char_length\(\s*title\s*\)\s+between\s+\d+\s+and\s+(\d+)/i.exec(migracja)?.[1]
      ?? null
    : null;
  check('⭐ (T1-B6) `MAKS_DLUGOSC_TYTULU` zgadza się CO DO JEDNOŚCI z CHECK-iem `player_tasks_title_len`',
    migracja !== null && granicaZMigracji !== null
    && Number(granicaZMigracji) === MAKS_DLUGOSC_TYTULU,
    migracja === null
      ? BRAK_MIGRACJI
      : `w kodzie ${MAKS_DLUGOSC_TYTULU}, w migracji ${granicaZMigracji ?? '(nie znalazłem)'} — `
        + 'produkt przyjąłby tytuł, którego baza nie przyjmie, a zawodnik straciłby to, co napisał');

  // ═══════════════════════════════════════════════════════════════
  // PRODUCENT (b) — WGLĄD → ZADANIE SYSTEMOWE, URUCHOMIONY NA SZEŚCIU
  // ═══════════════════════════════════════════════════════════════
  // ⚠️ Kształty wejść odwzorowują PRODUKCJĘ zmierzoną 16.08.2026:
  // `pain_entries.id`, `daily_logs.id`, `calendar_events.id`
  // i `match_contexts.id` są typu **bigint** (napisy „1", „6", „29"),
  // a `public.users.id` jest **uuid**. To nie jest fikcja wygodna dla testu.
  const DZIS_T1 = '2026-08-16';
  const WEJSCIA_T1: WejsciaWgladow = {
    dzis: DZIS_T1,
    dziennik: {
      rodzaj: 'jest',
      dane: [
        { idWiersza: '4', dzien: '2026-08-11', senGodziny: 5.5, rpe: null },
        { idWiersza: '5', dzien: '2026-08-12', senGodziny: 5, rpe: null },
        { idWiersza: '6', dzien: '2026-08-13', senGodziny: 4.5, rpe: null },
        { idWiersza: '7', dzien: '2026-08-14', senGodziny: 7, rpe: null },
        { idWiersza: '8', dzien: '2026-08-12', senGodziny: null, rpe: 8 },
        { idWiersza: '9', dzien: '2026-08-13', senGodziny: null, rpe: 9 },
        { idWiersza: '10', dzien: '2026-08-14', senGodziny: null, rpe: 9 },
      ],
    },
    kalendarz: {
      rodzaj: 'jest',
      dane: [
        { id: '6', dzien: '2026-08-08', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Blok: bieg ciągły' },
        { id: '7', dzien: '2026-08-11', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Blok: bieg ciągły' },
        { id: '8', dzien: '2026-08-13', rodzaj: 'micro_session', status: 'scheduled', tytul: 'Blok: bieg ciągły' },
        { id: '9', dzien: '2026-08-14', rodzaj: 'micro_session', status: 'cancelled', tytul: 'Odwołana' },
        { id: '29', dzien: '2026-08-19', rodzaj: 'match', status: 'scheduled', tytul: 'Mecz ligowy' },
      ],
    },
    powiazania: {
      rodzaj: 'jest',
      dane: [
        { idWpisu: '4', idWydarzenia: '6' },
        { idWpisu: '5', idWydarzenia: '7' },
        { idWpisu: '6', idWydarzenia: null },
      ],
    },
    bol: {
      rodzaj: 'jest',
      dane: [
        { idWiersza: '1', dzien: '2026-08-08', miejsce: 'kolano', intensywnosc: 3, wykluczaZTreningu: false },
        { idWiersza: '2', dzien: '2026-08-11', miejsce: 'kolano', intensywnosc: 5, wykluczaZTreningu: false },
        { idWiersza: '3', dzien: '2026-08-14', miejsce: 'kolano', intensywnosc: 6, wykluczaZTreningu: false },
      ],
    },
    mecze: {
      rodzaj: 'jest',
      dane: [
        { idWiersza: '2', dzien: '2026-08-02', ciezkosc: 7, stanWejscia: 'entered_fresh' },
        { idWiersza: '3', dzien: '2026-08-09', ciezkosc: 8, stanWejscia: 'entered_fatigued' },
        { idWiersza: '4', dzien: '2026-08-14', ciezkosc: 9, stanWejscia: 'entered_fatigued' },
      ],
    },
    profil: {
      rodzaj: 'jest',
      dane: {
        rokUrodzenia: null, podpowiedziZaBramkaWieku: 0,
        podpowiedziRazem: 274, odcinkowMapyDrogi: 4,
      },
    },
  };

  const policzone = policzWglady(WEJSCIA_T1);
  const zywe = policzone.wyniki.filter(
    (w): w is Extract<typeof w, { rodzaj: 'jest' }> => w.rodzaj === 'jest');

  check('⭐ (T1-C1) fixture daje WSZYSTKIE SZEŚĆ wglądów — RÓWNOŚĆ, nie „≥ 1" (O73)',
    zywe.length === KLUCZE_WGLADOW.length,
    `policzonych: ${zywe.length} z ${KLUCZE_WGLADOW.length} — `
    + policzone.wyniki.map((w) => `${w.klucz}:${w.rodzaj}`).join(', ')
    + ' · gdyby fixture przestał produkować komplet, asercje niżej sprawdzałyby mniej, '
    + 'a liczba passed by nie spadła');

  const zbudowane = zywe.map((w) => ({
    klucz: w.klucz,
    wglad: w.wglad,
    kandydat: w.kandydat,
    wynik: zbudujZadanieSystemoweZWgladu({
      wglad: w.wglad,
      userId: UZYTKOWNIK,
      slad: w.kandydat.skadToWiemy === null
        ? null
        : { skad: w.kandydat.skadToWiemy.skad, idWiersza: w.kandydat.skadToWiemy.idWiersza },
      okno: null,
      ileZajmieSekund: w.kandydat.ileZajmieSekund,
    }),
  }));
  const udane = zbudowane.filter((z) => z.wynik.ok);
  const wiersze = zbudowane
    .map((z) => (z.wynik.ok ? z.wynik.kandydat : null))
    .filter((k): k is NonNullable<typeof k> => k !== null);

  check('⭐ (T1-C1) KAŻDY z sześciu wglądów daje wiersz gotowy do wstawienia — zero odmów',
    udane.length === zywe.length && zywe.length > 0,
    zbudowane.filter((z) => !z.wynik.ok)
      .map((z) => `${z.klucz}: ${z.wynik.ok ? '' : z.wynik.powod}`).join(' | '));

  // ⭐ ZAPADKA NA RÓWNOŚĆ Z DRUGĄ KOPIĄ REGUŁY (patrz komentarz przy
  // `zdanieZnaczeniaWgladu` w `lib/zadania.ts`). Rozjazd znaczy, że zawodnik
  // czyta DWA RÓŻNE uzasadnienia tej samej rzeczy na dwóch ekranach.
  const rozjazdZnaczenia = zbudowane.filter((z) => zdanieZnaczeniaWgladu(z.wglad) !== z.kandydat.dlaczego);
  check('⭐ (T1-C2) `zdanieZnaczeniaWgladu` oddaje CO DO ZNAKU to samo, co `naKandydata(...).dlaczego`',
    rozjazdZnaczenia.length === 0 && zbudowane.length > 0,
    rozjazdZnaczenia.map((z) => `${z.klucz}: „${zdanieZnaczeniaWgladu(z.wglad)}" ≠ „${z.kandydat.dlaczego}"`).join(' | '));

  // ⚠️ Obie gałęzie reguły osobno — komplet z fixture'u mógłby mieć same mocne
  // dowody i wtedy asercja wyżej nie sprawdziłaby doklejania zastrzeżenia.
  const mocny = zbudujWglad({
    klucz: 'powtarzajacy_sie_bol', liczba: '3 razy w 14 dni', znaczenie: 'To wraca.',
    doZrobienia: 'Zamów wizytę.', czegoNieMowi: null, silaDowodu: 'mocny',
    rejestrZnaczenia: 'propozycja', os: [], ilePomiarow: 3,
  });
  const slaby = zbudujWglad({
    klucz: 'odbyte_sesje', liczba: '2 z 3 sesji', znaczenie: 'Licznik pokazuje zapisaną pracę.',
    doZrobienia: 'Dopisz sesję.', czegoNieMowi: 'O jednej nic nie wiemy.', silaDowodu: 'slaby',
    rejestrZnaczenia: 'propozycja', os: [], ilePomiarow: 2,
  });
  const jakKandydat = (w: Wglad): string | null => naKandydata({
    wglad: w, id: 'x', skadToWiemy: null, rodzajPracy: 'inne', ileZajmieSekund: null, termin: null,
  }).dlaczego;
  check('⭐ (T1-C2) …w OBU gałęziach: przy mocnym dowodzie bez zastrzeżenia, przy słabym z nim',
    mocny !== null && slaby !== null
    && zdanieZnaczeniaWgladu(mocny) === jakKandydat(mocny)
    && zdanieZnaczeniaWgladu(slaby) === jakKandydat(slaby)
    && zdanieZnaczeniaWgladu(slaby).includes('O jednej nic nie wiemy.'),
    `mocny: ${mocny === null ? 'nie zbudował się' : zdanieZnaczeniaWgladu(mocny)} · `
    + `słaby: ${slaby === null ? 'nie zbudował się' : zdanieZnaczeniaWgladu(slaby)}`);

  check('⛔ ⭐ (T1-C3) ŻADNE zadanie z wglądu nie dostaje terminu (D5, N1) — RÓWNOŚĆ na zerze',
    wiersze.length > 0 && wiersze.every((k) => k.wiersz.due_on === null),
    wiersze.filter((k) => k.wiersz.due_on !== null)
      .map((k) => `${k.wiersz.system_key}: ${k.wiersz.due_on}`).join(', ')
    + ' — wglądy niosą `termin` do rankera i to jest w porządku, ale termin W BAZIE jest '
    + 'zobowiązaniem wobec zawodnika, czyli karą za nieobecność w przebraniu');

  check('(T1-C4) każde zadanie z wglądu ma `origin` = `system`, a `system` jest w zamkniętym zbiorze źródeł',
    wiersze.every((k) => k.wiersz.origin === ZRODLO_ZADANIA_Z_WGLADU)
    // ⛔ Kolejność warunków jest CELOWA: „nie `player`" stoi przed „= `system`",
    // bo po zawężeniu typu do `'system'` kompilator uznałby drugi warunek za
    // martwy i zgasił go ostrzeżeniem, zamiast pilnować reguły.
    && ZRODLO_ZADANIA_Z_WGLADU !== 'player'
    && (ZRODLA_ZADANIA as readonly string[]).includes(ZRODLO_ZADANIA_Z_WGLADU)
    && ZRODLO_ZADANIA_Z_WGLADU === 'system',
    wiersze.map((k) => k.wiersz.origin).join(', '));

  // ⛔ ⭐ DWA REJESTRY Z0, JEDNA KOLUMNA. `reason_register` opisuje `reason_fact`,
  // czyli CZĘŚĆ 1 wglądu (pomiar) — a ta jest ZAWSZE `fakt_o_tobie`.
  // `Wglad.rejestrZnaczenia` opisuje CZĘŚĆ 2 i tabela nie ma na niego kolumny.
  const zRejestremZnaczenia = zbudowane.filter(
    (z) => z.wynik.ok && z.wynik.kandydat.wiersz.reason_register === z.wglad.rejestrZnaczenia
      && z.wglad.rejestrZnaczenia !== 'fakt_o_tobie');
  check('⛔ ⭐ (T1-C5) `reason_register` opisuje POMIAR (`fakt_o_tobie`), nigdy rejestr ZNACZENIA',
    wiersze.every((k) => k.wiersz.reason_register === 'fakt_o_tobie')
    && zRejestremZnaczenia.length === 0,
    `rejestry: ${wiersze.map((k) => k.wiersz.reason_register).join(', ')} — wpisanie tu `
    + '`rejestrZnaczenia` („propozycja" przy pięciu z sześciu wglądów) podpisałoby POMIAR '
    + 'jako propozycję, czyli zmieszałoby dwa rejestry Z0 pod jednym podpisem');

  const klucze = wiersze.map((k) => k.wiersz.system_key);
  check('⭐ (T1-C6) sześć wglądów daje SZEŚĆ RÓŻNYCH kluczy systemowych — zero dubletów',
    new Set(klucze).size === klucze.length && klucze.length === KLUCZE_WGLADOW.length,
    klucze.join(', '));
  check('(T1-C6) klucz systemowy to klucz wglądu — ten sam wgląd u tego samego zawodnika nie da drugiego wiersza (D4)',
    zbudowane.every((z) => !z.wynik.ok || z.wynik.kandydat.wiersz.system_key === z.klucz),
    zbudowane.map((z) => `${z.klucz}→${z.wynik.ok ? z.wynik.kandydat.wiersz.system_key : '—'}`).join(', '));

  const pierwszy = zywe[0];
  const raz = pierwszy === undefined ? null : zbudujZadanieSystemoweZWgladu({
    wglad: pierwszy.wglad, userId: UZYTKOWNIK, slad: null, okno: null,
  });
  const dwa = pierwszy === undefined ? null : zbudujZadanieSystemoweZWgladu({
    wglad: pierwszy.wglad, userId: UZYTKOWNIK, slad: null, okno: null,
  });
  check('⭐ (T1-C7) producent jest DETERMINISTYCZNY — dwa wywołania dają wiersz co do znaku ten sam',
    raz !== null && dwa !== null && raz.ok && dwa.ok
    && JSON.stringify(raz.kandydat.wiersz) === JSON.stringify(dwa.kandydat.wiersz),
    JSON.stringify(raz !== null && raz.ok ? raz.kandydat.wiersz : raz));

  const zOknem = pierwszy === undefined ? null : zbudujZadanieSystemoweZWgladu({
    wglad: pierwszy.wglad, userId: UZYTKOWNIK, slad: null, okno: '2026-W33',
  });
  check('(T1-C13) ziarnistość klucza DZIAŁA — okno daje INNY klucz („raz na tydzień" ≠ „raz na zawsze")',
    zOknem !== null && zOknem.ok && raz !== null && raz.ok
    && zOknem.kandydat.wiersz.system_key === `${raz.kandydat.wiersz.system_key}:2026-W33`,
    JSON.stringify(zOknem !== null && zOknem.ok ? zOknem.kandydat.wiersz.system_key : zOknem));

  // ⛔ ⭐ ŚLAD, KTÓREGO KOLUMNA NIE PRZYJMIE — ZMIERZONE NA PRODUKCJI 16.08.2026.
  // `player_tasks.source_row_id` jest typu `uuid`, a wszystkie cztery tabele
  // źródłowe wglądów mają `id` typu `bigint`. `select '12'::uuid` kończy się
  // `22P02 invalid input syntax for type uuid`.
  const zPominietymSladem = wiersze.filter((k) => k.sladPominiety !== null);
  const przezUuid = wiersze.filter((k) => k.sladPominiety?.powod === 'id_nie_jest_uuid');
  const przezBrakWiersza = wiersze.filter((k) => k.sladPominiety?.powod === 'brak_wiersza');
  check('⛔ ⭐ (T1-C8) DOKŁADNIE PIĘĆ z sześciu wglądów traci ślad PRZEZ TYP KOLUMNY — RÓWNOŚĆ, nie „≥ 1" (O73)',
    przezUuid.length === 5,
    `śladów odrzuconych jako nie-uuid: ${przezUuid.length} z ${wiersze.length} `
    + `(pominiętych w ogóle: ${zPominietymSladem.length}) — to jest ZNALEZISKO T1, nie usterka `
    + 'tego testu: `source_row_id` jest `uuid`, a `pain_entries.id`, `daily_logs.id`, '
    + '`calendar_events.id` i `match_contexts.id` są `bigint`. Gdy ta liczba SPADNIE, ktoś '
    + 'naprawił schemat — i wtedy ta asercja ma zapytać, czy producent zaczął ślad zapisywać.');
  check('⭐ (T1-C8) …a szósty traci go z INNEGO powodu i jest to powód uczciwy (fakt o BRAKU wartości)',
    przezBrakWiersza.length === 1
    && przezUuid.length + przezBrakWiersza.length === zPominietymSladem.length,
    `przez brak wiersza: ${przezBrakWiersza.length} · przez uuid: ${przezUuid.length} · `
    + `razem pominiętych: ${zPominietymSladem.length}`);
  check('⛔ (T1-C8) pominięty ślad jest NAZWANY, nie połknięty — i zostawia OBA pola puste (CHECK `zrodlo_calosc`)',
    zPominietymSladem.every((k) =>
      (k.sladPominiety?.zdanie ?? '').trim().length > 0
      && k.wiersz.source_table === null && k.wiersz.source_row_id === null),
    zPominietymSladem.map((k) => `${k.wiersz.system_key}: ${k.sladPominiety?.powod}`).join(' | '));

  // ⭐ KONTROLA ODWROTNA. Bez niej asercję wyżej spełnia też producent,
  // który ślad odrzuca ZAWSZE — czyli nigdy go nie zapisze, także po naprawie.
  const zPrawdziwymUuid = pierwszy === undefined ? null : zbudujZadanieSystemoweZWgladu({
    wglad: pierwszy.wglad,
    userId: UZYTKOWNIK,
    slad: { skad: 'pain_entries', idWiersza: '3f1b2c44-8a9e-4a1b-9f2d-1c0e5b7a9d33' },
    okno: null,
  });
  check('⭐ (T1-C9) ślad w kształcie `uuid` WCHODZI — producent nie odrzuca śladu zawsze',
    zPrawdziwymUuid !== null && zPrawdziwymUuid.ok
    && zPrawdziwymUuid.kandydat.wiersz.source_table === 'pain_entries'
    && zPrawdziwymUuid.kandydat.wiersz.source_row_id === '3f1b2c44-8a9e-4a1b-9f2d-1c0e5b7a9d33'
    && zPrawdziwymUuid.kandydat.sladPominiety === null,
    JSON.stringify(zPrawdziwymUuid !== null && zPrawdziwymUuid.ok ? zPrawdziwymUuid.kandydat : zPrawdziwymUuid));

  check('(T1-C10) każdy kandydat niesie kontrakt powtórki i mówi on `do nothing` (WG-18)',
    wiersze.length > 0 && wiersze.every((k) => k.konflikt === UPSERT_ZADANIA_SYSTEMOWEGO)
    && /do\s+nothing/i.test(UPSERT_ZADANIA_SYSTEMOWEGO),
    wiersze.map((k) => k.konflikt).join(' | '));

  check('⭐ (T1-C12) tytuł zadania to CZĘŚĆ 3 wglądu, a powód to CZĘŚĆ 1 — nic nie jest przepisane',
    zbudowane.every((z) => !z.wynik.ok
      || (z.wynik.kandydat.wiersz.title === z.wglad.doZrobienia.trim()
        && z.wynik.kandydat.wiersz.reason_fact === z.wglad.liczba.trim()
        && z.wynik.kandydat.wiersz.reason_key === z.wglad.klucz)),
    zbudowane.filter((z) => z.wynik.ok && z.wynik.kandydat.wiersz.title !== z.wglad.doZrobienia.trim())
      .map((z) => z.klucz).join(', '));

  // ⭐ POZYCJA, OD KTÓREJ ZACZĄŁ SIĘ TEN PAS — imiennie.
  const bol = zbudowane.find((z) => z.klucz === 'powtarzajacy_sie_bol');
  check('⭐ (T1-C12) wgląd `powtarzajacy_sie_bol` staje się zadaniem „Zamów wizytę u fizjoterapeuty."',
    bol !== undefined && bol.wynik.ok
    && bol.wynik.kandydat.wiersz.title === 'Zamów wizytę u fizjoterapeuty.'
    && (bol.wynik.kandydat.wiersz.reason_fact ?? '').length > 0,
    JSON.stringify(bol === undefined ? null : (bol.wynik.ok ? bol.wynik.kandydat.wiersz : bol.wynik)));

  // ⛔ WGLĄD BEZ CZĘŚCI 3 NIE POWSTAJE — czyli zadania bez tytułu nie da się
  // tą drogą zrobić w ogóle. Bramka stoi w `zbudujWglad`, nie tutaj.
  check('⛔ (T1-C11) wgląd bez CZĘŚCI 3 nie powstaje — zadanie bez tytułu nie ma jak wejść tą drogą',
    zbudujWglad({
      klucz: 'powtarzajacy_sie_bol', liczba: '3 razy', znaczenie: 'x', doZrobienia: '   ',
      czegoNieMowi: null, silaDowodu: 'mocny', rejestrZnaczenia: 'propozycja', os: [], ilePomiarow: 1,
    }) === null, 'zbudował się wgląd bez rzeczy do zrobienia');

  // ── ⛔ CYKL MODUŁÓW: `zadania.ts` IMPORTUJE TYLKO TYP ────────────
  // `wgladyZAlgorytmu` → `kolejkaPodania` → `zadania`. Import WARTOŚCI stąd
  // domknąłby cykl ESM i `REJESTRY_Z0` bywałoby `undefined` przy inicjalizacji.
  const importWgladow = /import\s+(type\s+)?\{[^}]*\}\s+from\s+'\.\/wgladyZAlgorytmu'/.exec(zywyTS);
  check('⛔ ⭐ (T1-D1) `zadania.ts` importuje z `wgladyZAlgorytmu` WYŁĄCZNIE TYP — inaczej domknie się cykl modułów',
    importWgladow !== null && importWgladow[1] !== undefined,
    `znalazłem: ${importWgladow?.[0] ?? '(brak importu — jeśli funkcja z wglądu zniknęła, popraw tę asercję)'} `
    + '— import wartości zamknąłby łańcuch `wgladyZAlgorytmu → kolejkaPodania → zadania`');

  check('⛔ (T1-D2) `okno` nie ma wartości domyślnej — producent MUSI wybrać ziarnistość świadomie (D4)',
    !/okno\s*(\?)?\s*:\s*string\s*\|\s*null\s*=/.test(zywyTS)
    && /okno:\s*string\s*\|\s*null;/.test(zywyTS),
    'ziarnistość klucza jest regułą odduplikowania: producent, który nie wybierze świadomie, '
    + 'wybierze przypadkiem, a skutek (to samo zadanie codziennie od nowa) zobaczy zawodnik');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\nR1. KUBEŁEK NIE JEST KOLUMNĄ');
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
    // ⭐ I1 16.08.2026: było `pomin(...)` — czyli cisza, którą podsumowanie
    // czytało jako zieleń. Brak pliku to FAIL Z NAZWĄ PLIKU (O76).
    check('⛔ migracja nie tworzy kolumny kubełka ani kolejności',
      false, BRAK_MIGRACJI);
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
    // ⭐ I1 16.08.2026: było `pomin(...)`. Patrz komentarz w R1.
    check('⛔ wyzwalacz chroni powód systemowy przed skasowaniem i nadpisaniem',
      false, BRAK_MIGRACJI);
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
    // ⭐ I1 16.08.2026: było `pomin(...)`. Patrz komentarz w R1.
    check('istnieje UNIKALNY indeks po (user_id, system_key)', false, BRAK_MIGRACJI);
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
// ⭐ PAS I1 16.08.2026 — TA SEKCJA NIE MA JUŻ GAŁĘZI `POMINIETE`.
// Do 16.08 cały blok stał pod `if (migracja)`, a `else` mówiło `POMINIETE`
// i suita szła na zielono. Teraz jest odwrotnie: BRAK PLIKU TO FAIL, jeden
// na każdą asercję, którą brak pliku unieważnia — żeby liczba czerwonych
// mówiła, ILE warstw nie zostało sprawdzonych, a nie tylko ŻE któraś.
{
  const M = migracja ?? '';
  const jest = !!migracja;
  /** Asercja o migracji: bez pliku FAIL z jego nazwą, nigdy POMINIETE (O76). */
  const oMigracji = (label: string, cond: boolean, detail: string) =>
    check(label, jest && cond, jest ? detail : BRAK_MIGRACJI);

  oMigracji('migracja tworzy tabelę idempotentnie (`if not exists`)',
    /create\s+table\s+if\s+not\s+exists\s+public\.player_tasks/i.test(M), '');

  oMigracji('⛔ RLS włączone W TYM SAMYM PLIKU — nie ma wersji „włączymy jutro"',
    /alter\s+table\s+public\.player_tasks\s+enable\s+row\s+level\s+security/i.test(M)
      === RLS_ZMIERZONE_NA_PRODUKCJI.rlsWlaczone,
    'tabela bez RLS to tabela, z której da się czytać cudze zadania');

  // ⭐ RÓWNOŚĆ, NIE „≥" (O73). „Co najmniej trzy polityki" przeszłoby także
  // wtedy, gdy ktoś dołoży czwartą, szerszą — czyli dokładnie przy defekcie.
  const polityki = (M.match(/create\s+policy/gi) ?? []).length;
  oMigracji(`są DOKŁADNIE ${RLS_ZMIERZONE_NA_PRODUKCJI.liczbaPolityk} polityki — tyle, ile zmierzono `
    + `na produkcji ${RLS_ZMIERZONE_NA_PRODUKCJI.data}`,
    polityki === RLS_ZMIERZONE_NA_PRODUKCJI.liczbaPolityk,
    `znalazłem ${polityki}, oczekiwane ${RLS_ZMIERZONE_NA_PRODUKCJI.liczbaPolityk}`);

  // Nazwy polityk i komendy — z pomiaru, co do znaku.
  const brakPolityk = Object.entries(RLS_ZMIERZONE_NA_PRODUKCJI.polityki).filter(
    ([nazwa, komenda]) => !new RegExp(
      `create\\s+policy\\s+${nazwa}[\\s\\S]{0,80}?for\\s+${komenda}\\b`, 'i').test(M));
  oMigracji('każda polityka zmierzona na produkcji stoi w migracji pod SWOJĄ nazwą i komendą',
    brakPolityk.length === 0,
    `brakuje: ${brakPolityk.map(([n, k]) => `${n} (for ${k})`).join(', ')}`);

  const politykiDelete = (M.match(/create\s+policy[\s\S]{0,200}?for\s+delete/gi) ?? []).length;
  oMigracji('⛔ nie ma polityki DELETE — zadanie się porzuca, nie kasuje',
    politykiDelete === RLS_ZMIERZONE_NA_PRODUKCJI.liczbaPolitykDelete,
    `znalazłem ${politykiDelete} polityk DELETE`);

  // ⚠️ Liczymy `for <komenda> to authenticated`, a NIE samo `to authenticated`:
  // to drugie łapie także wiersz `grant … to authenticated`, więc równość
  // rozjeżdżałaby się o jeden bez żadnego defektu.
  const politykiDoRoli = (M.match(
    new RegExp(`for\\s+\\w+\\s+to\\s+${RLS_ZMIERZONE_NA_PRODUKCJI.rola}\\b`, 'gi')) ?? []).length;
  oMigracji('każda z polityk jest przypięta do `authenticated`, nie do `public`',
    politykiDoRoli === RLS_ZMIERZONE_NA_PRODUKCJI.liczbaPolityk,
    `polityk przypiętych do \`${RLS_ZMIERZONE_NA_PRODUKCJI.rola}\`: ${politykiDoRoli}, `
    + `polityk w pliku: ${polityki} — polityka bez \`to authenticated\` dotyczy też roli \`anon\``);

  // ⛔ Granty dla `anon` to druga połowa tej samej reguły. Polityka nic nie
  // znaczy, jeżeli rola anonimowa ma grant na tabelę.
  oMigracji(`⛔ migracja odbiera rola \`anon\` wszystko (na produkcji zmierzone: `
    + `${RLS_ZMIERZONE_NA_PRODUKCJI.grantyAnon} grantów)`,
    /revoke\s+all\s+on\s+public\.player_tasks\s+from\s+anon/i.test(M),
    'brak `revoke all … from anon` — polityka RLS nie chroni przed grantem dla anonimowego');

  oMigracji('polityki porównują `user_id` z `auth.uid()` — nie z parametrem z aplikacji',
    (M.match(/user_id\s*=\s*\(\s*select\s+auth\.uid\(\)\s*\)/gi) ?? []).length
      >= RLS_ZMIERZONE_NA_PRODUKCJI.liczbaPolityk,
    'polityka bez `auth.uid()` nie ogranicza niczego');

  // ⭐ PIĘĆ WARUNKÓW `with check` — z pomiaru, nie z pamięci. Do 16.08 asercja
  // sprawdzała TYLKO `origin = 'player'`, więc polityka, z której ktoś zdjąłby
  // `system_key is null`, przeszłaby na zielono: zawodnik wstawiłby wiersz
  // z kluczem systemowym, czyli zadanie udające zadanie produktu.
  const withCheck = M.match(/with\s+check\s*\(([\s\S]{0,600}?)\)\s*;/i);
  const trescWithCheck = withCheck?.[1] ?? '';
  const brakWarunkow = RLS_ZMIERZONE_NA_PRODUKCJI.insertWithCheck.filter(
    (w) => !trescWithCheck.replace(/\s+/g, ' ').toLowerCase()
      .includes(w.replace(/\s+/g, ' ').toLowerCase()));
  oMigracji('⛔ zawodnik nie wstawi wiersza udającego zadanie systemowe — '
    + `wszystkie ${RLS_ZMIERZONE_NA_PRODUKCJI.insertWithCheck.length} warunków \`with check\``,
    brakWarunkow.length === 0,
    `brakuje w \`with check\` polityki INSERT: ${brakWarunkow.join(' · ')}`);

  // ⚠️ REGUŁA: liczby, których Kuba ma się spodziewać, mają MIEĆ SKĄD wyjść.
  // Zapytanie kontrolne bez którejkolwiek z nich zostawia go z „wygląda OK".
  const KONTROLNE = ['tabela', 'rls', 'polityki', 'polityka_delete', 'checki',
    'indeksy', 'wyzwalacz', 'wierszy', 'granty_authenticated', 'granty_anon'];
  const brakujace = KONTROLNE.filter((k) => !new RegExp(`as\\s+${k}\\b`, 'i').test(M));
  oMigracji('migracja kończy się zapytaniem kontrolnym ze WSZYSTKIMI liczbami do porównania',
    brakujace.length === 0, `brakuje w zapytaniu kontrolnym: ${brakujace.join(', ')}`);

  oMigracji('kolumny z `zadania.ts` naprawdę istnieją w migracji',
    KOLUMNY_ZADANIA.every((k) => new RegExp(`\\b${k}\\b`).test(M)),
    KOLUMNY_ZADANIA.filter((k) => !new RegExp(`\\b${k}\\b`).test(M)).join(', '));

  oMigracji('nazwa tabeli w kodzie i w migracji to ta sama nazwa',
    new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${TABELA_ZADAN}\\b`, 'i').test(M),
    `${TABELA_ZADAN} vs migracja`);

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ DWIE ASERCJE, KTÓRYCH BRAK PLIKU NIE UNIEWAŻNIA.
  // Powyższe pilnują ARTEFAKTU. Te pilnują ZGODNOŚCI KODU Z POLITYKĄ
  // zmierzoną na produkcji — czyli tej połowy reguły, którą można złamać
  // w `lib/zadania.ts`, nie ruszając bazy. Wykonują się ZAWSZE.
  // ═══════════════════════════════════════════════════════════════════
  const wstawianePrzezZawodnika = bezKomentarzyTS(zrodloZadan);
  check('⛔ kod nie próbuje wstawiać zadania z pochodzeniem innym niż `player` — '
    + 'polityka INSERT i tak by je odrzuciła, a appka pokazałaby zawodnikowi błąd bazy',
    !/\borigin\s*:\s*'(?!player')/.test(wstawianePrzezZawodnika),
    'znalazłem w kodzie appki wstawianie z `origin` innym niż `player`');

  check('⛔ lista kolumn odczytu nie zawiera `user_id` — polityka SELECT '
    + `(${RLS_ZMIERZONE_NA_PRODUKCJI.izolacja}) i tak zwraca tylko własne wiersze`,
    !KOLUMNY_ZADANIA.includes('user_id' as never), KOLUMNY_ZADANIA.join(', '));
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
