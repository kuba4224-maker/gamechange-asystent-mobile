// PLAN-D-L2 08.2026 (15.08.2026) — NOWY PLIK. STRAŻNIK PASA L2.
//
//   npx tsx lib/raportRodzica.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ── CO PILNUJE ───────────────────────────────────────────────────────
//   R1. CZTERY stany odczytu są rozróżnialne aż do zdania na ekranie:
//       „jeszcze nie pytałem" · „nikt nie dostaje" · „dostaje X" ·
//       „nie udało się sprawdzić". Cztery, nie dwa (reguła R5).
//   R2. ⛔ NIE ISTNIEJE ŚCIEŻKA, w której błąd odczytu renderuje się jako
//       „Nikt nie dostaje raportu o Tobie." Błąd uprawnień, który wygląda jak
//       brak subskrypcji, mówi dziecku nieprawdę o tym, kto o nim czyta —
//       i jest gorszy niż brak całego ekranu.
//   R3. Wyłączenie raportu dowodzi się LICZBĄ ZMIENIONYCH WIERSZY, nie brakiem
//       błędu (O61): `update` pod RLS, który nie trafił w nic, kończy się
//       sukcesem i pustą tablicą.
//   R4. Ponowny zapis tego samego adresu REAKTYWUJE wiersz, zamiast wstawiać
//       drugi — druga połówka `MIGRACJA_L2_JEDNA_SUBSKRYPCJA.sql`.
//   R5. ⛔ Nieaktualne zdanie o RLS z 06.08.2026 NIE WRACA do kodu (O67).
//   R6. Migracja jest częściowa (`where active`) i po `lower()`, ma hamulec na
//       duplikaty i zapytanie kontrolne — a NIE ma polityki DELETE ani `delete`.
//   R7. `lib/raportRodzica.ts` zostaje czysty: bez Reacta, Supabase, zegara i sieci.
//
// ⚠️ CZEGO TEN PLIK NIE SPRAWDZA — i nie udaje, że sprawdza:
//   • czy migracja została WYKONANA na produkcji (pas jej nie wykonuje),
//   • czy polityki RLS faktycznie stoją w bazie — to jest pomiar w `pg_policies`,
//     spisany w nocie pasa, a nie coś, co plik w repozytorium może udowodnić,
//   • niczego, co dotyka ekranu w locie (żadnego renderu Reacta).
//
// ⚠️ O53: żadnego `new URL(...)` — `readFileSync` + `fileURLToPath`.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  czytajSubskrypcje,
  opisStanuRaportu,
  opisOstatniejWysylki,
  normalizujEmail,
  sprawdzEmail,
  sciezkaZapisu,
  wynikZmiany,
  ladunekWylaczenia,
  ladunekReaktywacji,
  toJestDuplikat,
  KOLUMNY_SUBSKRYPCJI,
  TABELA_SUBSKRYPCJI,
  ZDANIE_NIE_PYTALEM,
  ZDANIE_NIKT_NIE_DOSTAJE,
  ZDANIE_NIE_UDALO_SIE,
  ZDANIE_JEST_NAGLOWEK,
  KOMUNIKAT_JUZ_DOSTAJE,
  KOMUNIKAT_WYLACZONY,
  ETYKIETA_WYLACZ,
  type WierszSubskrypcji,
} from './raportRodzica';
import { REJESTRY_Z0 } from './zadania';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

const libDir = dirname(fileURLToPath(import.meta.url));
const appRoot = dirname(libDir);
const PLIK_EKRANU = join(appRoot, 'app', '(tabs)', 'profil.tsx');
const PLIK_MODULU = join(libDir, 'raportRodzica.ts');
const PLIK_MIGRACJI = join(appRoot, 'MIGRACJA_L2_JEDNA_SUBSKRYPCJA.sql');

function w(over: Partial<WierszSubskrypcji> = {}): WierszSubskrypcji {
  return { id: 1, parent_email: 'mama@dom.pl', active: true, last_sent_at: null, ...over };
}

console.log('raportRodzica.selftest.ts — strażnik pasa L2 („raport o mnie jest mój")\n');

// ═════════════════════════════════════════════════════════════════════
console.log('1. CZTERY STANY ODCZYTU — nigdy dwa (R5)');
// ═════════════════════════════════════════════════════════════════════
{
  const niePytalem = opisStanuRaportu(null);
  const brak = opisStanuRaportu(czytajSubskrypcje([], null));
  const jest = opisStanuRaportu(czytajSubskrypcje([w()], null));
  const blad = opisStanuRaportu(czytajSubskrypcje(null, 'permission denied for table parent_report_subscriptions'));

  // Cztery osobne asercje — jedna na stan, dokładnie jak żąda polecenie L2.5.
  check('stan 1/4 — `null` znaczy „jeszcze nie pytałem", nie „nie ma"',
    niePytalem.klucz === 'nie_pytalem' && niePytalem.zdanie.tekst === ZDANIE_NIE_PYTALEM, JSON.stringify(niePytalem));
  check('stan 2/4 — pusta lista BEZ błędu znaczy „nikt nie dostaje"',
    brak.klucz === 'brak' && brak.zdanie.tekst === ZDANIE_NIKT_NIE_DOSTAJE, JSON.stringify(brak));
  check('stan 3/4 — wiersz aktywny znaczy „jest" i pokazuje listę',
    jest.klucz === 'jest' && jest.pokazListe === true, JSON.stringify(jest));
  check('stan 4/4 — błąd odczytu ma WŁASNY stan i własne zdanie',
    blad.klucz === 'nie_udalo_sie' && blad.zdanie.tekst === ZDANIE_NIE_UDALO_SIE, JSON.stringify(blad));

  const klucze = [niePytalem.klucz, brak.klucz, jest.klucz, blad.klucz];
  check('⚠️ cztery RÓŻNE klucze — bez tego rozróżnienie nie dociera do ekranu',
    new Set(klucze).size === 4, JSON.stringify(klucze));

  const zdania = [niePytalem.zdanie.tekst, brak.zdanie.tekst, jest.zdanie.tekst, blad.zdanie.tekst];
  check('⚠️ cztery RÓŻNE zdania — bez tego rozróżnienie nie dociera do zawodnika',
    new Set(zdania).size === 4, JSON.stringify(zdania));

  check('każde zdanie ma rejestr Z0 — zdanie bez rejestru nie wychodzi na ekran',
    [niePytalem, brak, jest, blad].every((o) => (REJESTRY_Z0 as readonly string[]).includes(o.zdanie.rejestr)),
    JSON.stringify(zdania));
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n2. ⛔ BŁĄD ODCZYTU NIGDY NIE UDAJE, ŻE „NIKT NIE DOSTAJE" (R2)');
// ═════════════════════════════════════════════════════════════════════
{
  check('⛔ zdanie o błędzie NIE ZAWIERA zdania „nikt nie dostaje"',
    !ZDANIE_NIE_UDALO_SIE.toLowerCase().includes('nikt nie dostaje'), ZDANIE_NIE_UDALO_SIE);
  check('…i mówi WPROST „Nie udało się sprawdzić"',
    /Nie udało się sprawdzić/.test(ZDANIE_NIE_UDALO_SIE), ZDANIE_NIE_UDALO_SIE);

  // Przemiecenie, nie jeden przypadek: KAŻDA odpowiedź z błędem — niezależnie
  // od tego, co przyszło w `data` — musi dać `nie_udalo_sie`.
  const bledy = ['permission denied', 'JWT expired', 'network error', '  spacja  ', '42501'];
  const dane: unknown[] = [null, undefined, [], [w()], [w({ active: false })], 'bzdura', {}, 0];
  const zle: string[] = [];
  for (const b of bledy) {
    for (const d of dane) {
      const s = czytajSubskrypcje(d, b);
      if (s.rodzaj !== 'nie_udalo_sie') zle.push(`${b} × ${JSON.stringify(d)} → ${s.rodzaj}`);
    }
  }
  check(`⛔ ${bledy.length * dane.length} kombinacji (błąd × dowolne dane) → ZAWSZE „nie udało się"`,
    zle.length === 0, zle.join(' | '));

  // Druga połowa tej samej reguły: brak błędu, ale odpowiedź, która nie jest listą.
  check('⛔ `data = null` BEZ błędu to NIE jest pusta lista',
    czytajSubskrypcje(null, null).rodzaj === 'nie_udalo_sie', JSON.stringify(czytajSubskrypcje(null, null)));
  check('⛔ odpowiedź, która nie jest tablicą, to NIE jest pusta lista',
    czytajSubskrypcje({ ok: true }, null).rodzaj === 'nie_udalo_sie', '');
  check('⛔ wiersze przyszły, ale ŻADNEGO nie dało się odczytać → „nie udało się", nie „nikt nie dostaje"',
    czytajSubskrypcje([{ cos: 'innego' }, { id: 'tekst' }], null).rodzaj === 'nie_udalo_sie', '');

  // A to jest przypadek, w którym „nikt nie dostaje" jest PRAWDĄ i ma paść.
  {
    const s = czytajSubskrypcje([w({ active: false }), w({ id: 2, active: false })], null);
    check('zawodnik, który się wypisał → „nikt nie dostaje" JEST prawdą i pada',
      s.rodzaj === 'brak' && s.wypisanych === 2, JSON.stringify(s));
  }
  {
    // Jeden wiersz nieczytelny obok dobrego: lista jest, wiersz wypada — ale
    // to nie zamienia się w „nie ma subskrypcji".
    const s = czytajSubskrypcje([w(), { id: 'tekst' }], null);
    check('jeden wiersz nieczytelny → reszta zostaje, stan to nadal „jest"',
      s.rodzaj === 'jest' && s.aktywne.length === 1, JSON.stringify(s));
  }
  {
    const s = czytajSubskrypcje([w(), w({ id: 2, parent_email: 'tata@dom.pl' })], null);
    check('dwa różne adresy są DOZWOLONE i widać oba (unikat jest na PARZE)',
      s.rodzaj === 'jest' && s.aktywne.length === 2, JSON.stringify(s));
  }
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n3. KIEDY POSZEDŁ OSTATNI RAPORT — czwarta liczba P0');
// ═════════════════════════════════════════════════════════════════════
{
  check('brak wysyłki → jawne zdanie, nie pusty ekran',
    /Jeszcze żaden raport nie poszedł/.test(opisOstatniejWysylki(null).tekst), opisOstatniejWysylki(null).tekst);
  check('data wysyłki po polsku, bez `Intl` (Hermes potrafi oddać angielski miesiąc — B37)',
    opisOstatniejWysylki('2026-08-12T10:00:00Z').tekst === 'Ostatni raport poszedł 12 sierpnia 2026.',
    opisOstatniejWysylki('2026-08-12T10:00:00Z').tekst);
  check('⛔ nieczytelna data daje jawne „nie wiadomo", a nie „Invalid Date"',
    /Nie wiadomo, kiedy/.test(opisOstatniejWysylki('bzdura').tekst) &&
    !/Invalid|NaN/.test(opisOstatniejWysylki('bzdura').tekst), opisOstatniejWysylki('bzdura').tekst);
  check('pusty łańcuch traktowany jak brak wysyłki, nie jak zła data',
    /Jeszcze żaden raport/.test(opisOstatniejWysylki('   ').tekst), opisOstatniejWysylki('   ').tekst);
  check('zdanie o ostatniej wysyłce też ma rejestr Z0',
    (REJESTRY_Z0 as readonly string[]).includes(opisOstatniejWysylki(null).rejestr), '');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n4. WYŁĄCZENIE — dowodem jest LICZBA WIERSZY, nie brak błędu (O61, R3)');
// ═════════════════════════════════════════════════════════════════════
{
  check('⛔ zero zmienionych wierszy BEZ błędu to PORAŻKA, nie sukces',
    wynikZmiany([], null).ok === false, JSON.stringify(wynikZmiany([], null)));
  {
    const r = wynikZmiany([], null);
    check('…i mówi wprost, że objęła zero wierszy', r.ok === false && r.ile === 0, JSON.stringify(r));
  }
  check('dokładnie jeden wiersz → sukces i znany identyfikator',
    wynikZmiany([{ id: 7 }], null).ok === true, JSON.stringify(wynikZmiany([{ id: 7 }], null)));
  check('⛔ więcej niż jeden wiersz → PORAŻKA (zmiana miała objąć własny wiersz, jeden)',
    wynikZmiany([{ id: 7 }, { id: 8 }], null).ok === false, '');
  check('błąd bazy → porażka, nawet gdy przyszły wiersze',
    wynikZmiany([{ id: 7 }], 'permission denied').ok === false, '');
  check('odpowiedź, która nie jest listą → porażka, nie sukces',
    wynikZmiany(null, null).ok === false, '');
  check('wiersz bez identyfikatora → porażka (nie wiadomo, co się zmieniło)',
    wynikZmiany([{ cos: 1 }], null).ok === false, '');

  const wyl = ladunekWylaczenia('2026-08-15T12:00:00Z');
  check('wypisanie to `active = false`, NIE skasowanie wiersza',
    wyl.active === false && typeof wyl.unsubscribed_at === 'string', JSON.stringify(wyl));
  check('⛔ ładunek wypisania nie zawiera NICZEGO poza dwoma polami — żadnego powiadomienia',
    Object.keys(wyl).sort().join(',') === 'active,unsubscribed_at', JSON.stringify(wyl));

  const reak = ladunekReaktywacji();
  check('reaktywacja KASUJE znacznik wypisania — inaczej dziennik kłamie',
    reak.active === true && reak.unsubscribed_at === null, JSON.stringify(reak));
  check('„Raport wyłączony." jest FAKTEM O TOBIE i niczym więcej',
    KOMUNIKAT_WYLACZONY === 'Raport wyłączony.', KOMUNIKAT_WYLACZONY);
  check('⛔ żaden komunikat wyłączenia nie twierdzi, co dostanie albo czego nie dostanie rodzic',
    !/rodzic|opiekun|nie dostanie|powiadom/i.test(KOMUNIKAT_WYLACZONY), KOMUNIKAT_WYLACZONY);
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n5. JEDEN ZAPIS NA PARĘ — reaktywacja zamiast drugiego INSERT (R4)');
// ═════════════════════════════════════════════════════════════════════
{
  const aktywny = [w({ id: 5, parent_email: 'mama@dom.pl', active: true })];
  const wypisany = [w({ id: 5, parent_email: 'mama@dom.pl', active: false })];

  check('ten sam adres, wiersz AKTYWNY → „już dostaje", zero zapisów',
    sciezkaZapisu(czytajSubskrypcje(aktywny, null), 'mama@dom.pl', aktywny).rodzaj === 'juz_aktywny', '');
  check('⭐ ten sam adres, wiersz WYPISANY → REAKTYWACJA istniejącego wiersza',
    JSON.stringify(sciezkaZapisu(czytajSubskrypcje(wypisany, null), 'mama@dom.pl', wypisany))
      === JSON.stringify({ rodzaj: 'reaktywuj', id: 5 }),
    JSON.stringify(sciezkaZapisu(czytajSubskrypcje(wypisany, null), 'mama@dom.pl', wypisany)));
  check('nowy adres → `nowy` (INSERT), bo pary jeszcze nie ma',
    sciezkaZapisu(czytajSubskrypcje(aktywny, null), 'tata@dom.pl', aktywny).rodzaj === 'nowy', '');
  check('⭐ `Mama@Dom.PL` to TEN SAM rodzic co `mama@dom.pl` — lustro `lower()` z migracji',
    sciezkaZapisu(czytajSubskrypcje(aktywny, null), '  Mama@Dom.PL  ', aktywny).rodzaj === 'juz_aktywny',
    JSON.stringify(sciezkaZapisu(czytajSubskrypcje(aktywny, null), '  Mama@Dom.PL  ', aktywny)));
  check('⛔ nie pytałem bazy → NIE ZGADUJEMY, żaden zapis nie rusza',
    sciezkaZapisu(null, 'mama@dom.pl', []).rodzaj === 'nie_wiem', '');
  check('⛔ nie udało się odczytać → NIE ZGADUJEMY (inaczej zapis wprost pod unikat)',
    sciezkaZapisu(czytajSubskrypcje(null, 'blad'), 'mama@dom.pl', []).rodzaj === 'nie_wiem', '');

  check('normalizacja adresu = `trim` + `lower`, co do znaku jak `lower(parent_email)`',
    normalizujEmail('  Mama@Dom.PL ') === 'mama@dom.pl', normalizujEmail('  Mama@Dom.PL '));
  check('adres bez `@` odrzucony przed jakimkolwiek zapytaniem',
    sprawdzEmail('mama').ok === false, '');
  check('pusty adres odrzucony', sprawdzEmail('   ').ok === false, '');
  check('poprawny adres przechodzi i wraca przycięty',
    JSON.stringify(sprawdzEmail('  mama@dom.pl ')) === JSON.stringify({ ok: true, email: 'mama@dom.pl' }), '');

  check('`23505` po kodzie rozpoznane jako duplikat', toJestDuplikat({ code: '23505' }) === true, '');
  check('`23505` po treści komunikatu też', toJestDuplikat({ message: 'duplicate key value violates unique constraint' }) === true, '');
  check('inny błąd NIE jest duplikatem', toJestDuplikat({ code: '42501', message: 'permission denied' }) === false, '');
  check('brak błędu NIE jest duplikatem', toJestDuplikat(null) === false, '');
  check('zdanie po ludzku zamiast surowego `23505`',
    KOMUNIKAT_JUZ_DOSTAJE === 'Ten adres już dostaje raport.', KOMUNIKAT_JUZ_DOSTAJE);
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n6. ⛔ NIEAKTUALNE ZDANIE O RLS NIE WRACA DO KODU (O67, R5)');
// ═════════════════════════════════════════════════════════════════════
{
  check('(strażnik strażnika) mam co przemiatać',
    existsSync(PLIK_EKRANU) && existsSync(PLIK_MODULU), `${PLIK_EKRANU} | ${PLIK_MODULU}`);

  const ekran = readFileSync(PLIK_EKRANU, 'utf8');
  const modul = readFileSync(PLIK_MODULU, 'utf8');

  // ⚠️ TU NIE WYCINAMY KOMENTARZY. Defekt, którego pilnujemy, ŻYŁ WYŁĄCZNIE
  // w komentarzu — wycięcie ich zgasiłoby dokładnie ten strażnik, który ma
  // się zapalić. (To jest różnica względem wzorca z `trzyPustki.selftest.ts`,
  // gdzie strażnik pilnuje kodu, a komentarze zapalały go fałszywie.)
  const ZAKAZANE: Array<[RegExp, string]> = [
    [/nie\s+ma\s+polityki\s+RLS\s+SELECT/i, 'twierdzenie, że nie ma polityki SELECT'],
    [/świadomie\s+NIE\s+ma\s+polityki/i, 'twierdzenie „świadomie NIE ma polityki"'],
    [/dostęp\s+tylko\s+przez\s+token/i, 'twierdzenie, że dostęp jest tylko przez token'],
    [/polityki\s+SELECT\s+nie\s+ma/i, 'to samo twierdzenie w odwrotnej kolejności'],
  ];
  for (const [wzorzec, opis] of ZAKAZANE) {
    check(`⛔ ekran NIE zawiera: ${opis}`, !wzorzec.test(ekran), String(wzorzec));
    check(`⛔ moduł NIE zawiera: ${opis}`, !wzorzec.test(modul), String(wzorzec));
  }

  // Zdanie skasowane to za mało — na jego miejscu ma stać POMIAR (O67).
  check('⭐ na miejscu skasowanego zdania stoi POMIAR: nazwa katalogu systemowego',
    /pg_policies/.test(ekran), 'brak odwołania do pg_policies');
  check('…z DATĄ pomiaru', /15\.08\.2026/.test(ekran), 'brak daty pomiaru');
  check('…i z nazwami wszystkich trzech zmierzonych polityk',
    ['parent_report_owner_select', 'parent_report_owner_insert', 'parent_report_owner_update']
      .every((p) => ekran.includes(p)), 'brak nazw polityk');

  // Pamięć urządzenia przestała być źródłem prawdy o tym, kto czyta o dziecku.
  // ⚠️ Tu JUŻ wycinamy komentarze: nazwa skasowanego stanu ma prawo stać
  // w zdaniu opisującym, co się zmieniło — zakazane jest jej UŻYCIE.
  const ekranZywy = ekran
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  check('⛔ ekran nie trzyma już adresu rodzica w pamięci urządzenia',
    !/parent_report_email/.test(ekranZywy) && !/savedParentEmail/.test(ekranZywy) && !/AsyncStorage/.test(ekranZywy),
    'AsyncStorage nadal jest źródłem prawdy o subskrypcji');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n7. EKRAN NAPRAWDĘ TO PODPIĄŁ — asercje na źródło, nie na wiarę');
// ═════════════════════════════════════════════════════════════════════
{
  const ekran = readFileSync(PLIK_EKRANU, 'utf8');
  // Kod bez komentarzy — tu pilnujemy ZACHOWANIA, więc komentarz cytujący
  // `.delete(` nie może zapalić strażnika.
  const zywy = ekran
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  check('ekran PYTA BAZĘ przez wspólną funkcję, zamiast rozstrzygać sam',
    /czytajSubskrypcje\(/.test(zywy) && /\.from\(TABELA_SUBSKRYPCJI\)/.test(zywy),
    'brak odczytu subskrypcji z bazy');
  check('…i nie ma w nim przepisanej ręcznie nazwy tabeli',
    !zywy.includes(`'${TABELA_SUBSKRYPCJI}'`), 'nazwa tabeli przepisana drugi raz');
  check('…listą kolumn z jednego miejsca, nie przepisaną ręcznie',
    /KOLUMNY_SUBSKRYPCJI/.test(zywy) && !zywy.includes(KOLUMNY_SUBSKRYPCJI), 'lista kolumn przepisana drugi raz');
  check('⛔ w ekranie nie ma wzorca `data ?? []` na subskrypcjach',
    !/czytajSubskrypcje\(\s*data\s*\?\?/.test(zywy), 'sklejenie pustki z błędem');
  check('zdania o stanie pochodzą z modułu, nie są wpisane w JSX drugi raz',
    !zywy.includes(ZDANIE_NIKT_NIE_DOSTAJE) && !zywy.includes(ZDANIE_JEST_NAGLOWEK) && /opisStanuRaportu\(/.test(zywy),
    'ekran ma własną kopię brzmienia');
  check('przycisk wyłączenia istnieje i bierze etykietę z modułu',
    /ETYKIETA_WYLACZ/.test(zywy) && ETYKIETA_WYLACZ === 'Przestań wysyłać raport', ETYKIETA_WYLACZ);

  // ── O61 na poziomie ekranu: bez `.select('id')` nie ma czego policzyć ──
  const wylaczBody = /const wylaczRaport[\s\S]*?\n {2}\};/.exec(zywy)?.[0] ?? '';
  check('(strażnik strażnika) znalazłem funkcję wyłączenia w źródle', wylaczBody.length > 0, 'nie znalazłem `wylaczRaport`');
  check('⭐ wyłączenie prosi o zwrot wiersza (`.select(\'id\')`) — bez tego nie ma dowodu',
    /\.select\('id'\)/.test(wylaczBody), wylaczBody.slice(0, 200));
  check('⭐ …i liczy wynik przez `wynikZmiany`, zamiast ufać brakowi błędu (O61)',
    /wynikZmiany\(/.test(wylaczBody), wylaczBody.slice(0, 200));
  check('⛔ wyłączenie NIE KASUJE wiersza', !/\.delete\(/.test(wylaczBody), wylaczBody.slice(0, 200));
  check('⛔ wyłączenie NIE POWIADAMIA nikogo — zero RPC, zero sieci, zero insertów',
    !/\.rpc\(|fetch\(|\.insert\(|functions\.invoke/.test(wylaczBody), wylaczBody.slice(0, 300));

  check('⛔ w całym ekranie nie ma `delete` na subskrypcjach (polityki DELETE nie ma i nie ma być)',
    !/from\(TABELA_SUBSKRYPCJI\)[\s\S]{0,120}\.delete\(/.test(zywy), 'ekran próbuje kasować wiersz');

  // ── R4 na poziomie ekranu ──
  check('⭐ ekran wybiera ścieżkę zapisu z tego, co ODCZYTAŁ (`sciezkaZapisu`)',
    /sciezkaZapisu\(/.test(zywy), 'zapis idzie na ślepo');
  check('⭐ reaktywacja idzie `update`-em, nie drugim `insert`-em',
    /ladunekReaktywacji\(\)/.test(zywy), 'brak ścieżki reaktywacji');
  check('dokładnie JEDEN `insert` na subskrypcjach w całym ekranie',
    (zywy.match(/\.insert\(\{ player_user_id/g) ?? []).length === 1,
    String((zywy.match(/\.insert\(\{ player_user_id/g) ?? []).length));
  check('naruszenie unikatu tłumaczone po ludzku, nie surowym `23505`',
    /toJestDuplikat\(/.test(zywy) && /KOMUNIKAT_JUZ_DOSTAJE/.test(zywy), 'brak obsługi 23505');

  // ── P0: rzecz ważna nie może wymagać szukania ──
  const idxNaglowka = ekran.indexOf('<Text style={styles.blockLabel}>Raport dla rodzica</Text>');
  const idxNawigacji = ekran.indexOf('styles.stepNav}');
  check('(strażnik strażnika) znalazłem blok i nawigację etapów',
    idxNaglowka > 0 && idxNawigacji > 0, `${idxNaglowka} / ${idxNawigacji}`);
  check('⭐ P0: blok raportu stoi POZA numeracją etapów (pod nawigacją), nie w Etapie 0',
    idxNaglowka > idxNawigacji,
    'blok wrócił do etapu — zawodnik z gotowym profilem ma do niego sześć dotknięć zamiast dwóch');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n8. MIGRACJA — częściowa, po `lower()`, z hamulcem (R6)');
// ═════════════════════════════════════════════════════════════════════
{
  check('(strażnik strażnika) plik migracji leży w repozytorium',
    existsSync(PLIK_MIGRACJI), PLIK_MIGRACJI);
  const sql = existsSync(PLIK_MIGRACJI) ? readFileSync(PLIK_MIGRACJI, 'utf8') : '';
  // ⚠️ Zakazy i kolejność liczymy na SAMYM SQL-u, bez komentarzy `--`.
  // Inaczej zdanie „ta migracja NIE rusza parent_report_snapshots" zapalałoby
  // strażnika, który ma pilnować, żeby ich nie ruszała.
  const male = sql.replace(/^\s*--.*$/gm, '').toLowerCase();

  check('zakłada UNIKALNY indeks, idempotentnie',
    /create unique index if not exists idx_parent_report_unique_active_email/.test(male), '');

  // ⚠️ Sprawdzamy SAMĄ INSTRUKCJĘ `create unique index`, aż do jej średnika —
  // nie cały plik. `where active` występuje też w zapytaniu kontrolnym
  // i w wykrywaniu duplikatów, więc szukanie go w całym pliku przepuściłoby
  // unikat, który przestał być częściowy. (Zmierzone mutacją M10: wersja
  // sprawdzająca cały plik NIE ZAPALIŁA SIĘ.)
  const instrukcjaUnikatu = /create unique index if not exists[\s\S]*?;/.exec(male)?.[0] ?? '';
  check('(strażnik strażnika) wyciąłem samą instrukcję zakładającą unikat',
    instrukcjaUnikatu.length > 0, 'nie znalazłem instrukcji create unique index');
  check('⭐ unikat jest CZĘŚCIOWY (`where active`) — inaczej wypisany zawodnik nie zapisze się ponownie',
    /where active/.test(instrukcjaUnikatu), instrukcjaUnikatu);
  check('⭐ …i po `lower(parent_email)` — `Mama@dom.pl` i `mama@dom.pl` to jedna skrzynka',
    /lower\(parent_email\)/.test(instrukcjaUnikatu), instrukcjaUnikatu);
  check('⭐ …a para to (zawodnik, adres), nie sam adres',
    /\(player_user_id, lower\(parent_email\)\)/.test(instrukcjaUnikatu), instrukcjaUnikatu);
  check('⛔ unikat NIE stoi na samym `parent_email` (to zabroniłoby dwóm dzieciom jednego rodzica)',
    !/\(\s*lower\(parent_email\)\s*\)/.test(instrukcjaUnikatu), instrukcjaUnikatu);

  const idxWykrycia = male.indexOf('having count(*) > 1');
  const idxUnikatu = male.indexOf('create unique index if not exists');
  check('⭐ wykrycie duplikatów stoi PRZED założeniem unikatu, nie po',
    idxWykrycia > -1 && idxUnikatu > -1 && idxWykrycia < idxUnikatu, `${idxWykrycia} / ${idxUnikatu}`);
  check('⭐ migracja ma HAMULEC: zatrzymuje się sama, gdy duplikaty istnieją',
    /raise exception/.test(male), '');
  check('zapytanie kontrolne oddaje JEDEN wiersz z wartościami podanymi wprost',
    /unikat_pary/.test(male) && /duplikatow/.test(male) && /wierszy_aktywnych/.test(male) && /rls/.test(male), '');
  // Ta jedna asercja celuje w KOMENTARZ, nie w SQL — spodziewany wynik jest
  // dokumentacją, a bez niej zapytanie kontrolne nie ma czego odhaczyć.
  check('…i podaje SPODZIEWANY wynik, żeby dało się go odhaczyć bez zgadywania',
    /unikat_pary=1/.test(sql) && /duplikatow=0/.test(sql), '');
  check('kontrola potwierdza, że unikat jest częściowy i po `lower()`',
    /unikat_czesciowy/.test(male) && /unikat_po_lower/.test(male), '');
  check('indeks ma komentarz — następna sesja nie musi zgadywać, po co jest',
    /comment on index/.test(male), '');

  check('⛔ migracja NIE dodaje polityki DELETE (jej brak jest stanem prawidłowym)',
    !/create policy[\s\S]{0,200}for delete/.test(male), '');
  check('⛔ migracja NIE kasuje ani nie scala wierszy',
    !/delete from/.test(male) && !/truncate/.test(male), '');
  check('⛔ migracja NIE rusza `parent_report_snapshots`',
    !male.includes('parent_report_snapshots'), '');
  check('⛔ migracja NIE zmienia polityk, które już stoją',
    !/drop policy/.test(male) && !/alter policy/.test(male), '');
  check('⛔ plik mówi WPROST, że sesja go nie wykonała',
    /nie wykona/i.test(sql), '');

  // Lustro appka ↔ migracja. Zmiana po jednej stronie bez drugiej to rozjazd.
  check('⭐ migracja WSKAZUJE swoje lustro w appce (`normalizujEmail`)',
    /normalizujEmail/.test(sql), 'migracja nie mówi, gdzie stoi jej druga połówka');
  check('⭐ …a appka normalizuje dokładnie tak, jak indeks',
    normalizujEmail('Mama@Dom.PL') === 'Mama@Dom.PL'.trim().toLowerCase(), '');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n9. MODUŁ MA ZOSTAĆ CZYSTY (R7)');
// ═════════════════════════════════════════════════════════════════════
{
  const modul = readFileSync(PLIK_MODULU, 'utf8');
  const zywy = modul.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  check('⛔ `raportRodzica.ts` nie importuje Supabase', !/from '.*supabase'/.test(zywy), '');
  check('⛔ …nie importuje Reacta', !/from 'react/.test(zywy), '');
  check('⛔ …nie robi niczego sieciowego', !/fetch\(|XMLHttpRequest/.test(zywy), '');
  check('⛔ …nie czyta zegara (czas przychodzi z zewnątrz, żeby dało się go ustawić w teście)',
    !/Date\.now\(|new Date\(\)/.test(zywy), '');
  check('nazwa tabeli stoi w JEDNYM miejscu', TABELA_SUBSKRYPCJI === 'parent_report_subscriptions', TABELA_SUBSKRYPCJI);
  check('⛔ `access_token` NIE jest czytany do pamięci ekranu — to klucz do pełnego raportu',
    !KOLUMNY_SUBSKRYPCJI.includes('access_token'), KOLUMNY_SUBSKRYPCJI);
}

console.log(`\n${passed} passed, ${failed} failed`);
// Celowo `throw`, a nie `process.exit(1)`: `process` wymaga `@types/node`,
// których tsconfig appki nie zaciąga — ten sam wzorzec co `wzrost.selftest.ts`.
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
