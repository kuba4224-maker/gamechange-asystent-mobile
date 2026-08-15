// PLAN-D-T 08.2026 (14.08.2026) — NOWY PLIK. STRAŻNIK ZADANIA T6.
//
//   npx tsx lib/trzyPustki.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ── CO PILNUJE ───────────────────────────────────────────────────────
//   R1. Trzy pustki są TRZY, nie dwie — każda z innym tekstem i innym CTA.
//   R2. Brak uprawnień ma PIERWSZEŃSTWO: to jedyny stan, w którym problem
//       leży po naszej stronie i „dodaj trening" byłoby ślepym zaułkiem.
//   R3. „Nie wiem" NIE mówi zawodnikowi, że stracił dostęp (fail-open).
//   R4. ⚠️ GAŁĄŹ „BRAK KONFIGURACJI" JEST OZNACZONA JAKO NIEOSIĄGALNA
//       i ma NAPISANY powód razem z numerem pasa, który ją włączy.
//       To jest ta sama choroba, którą pas T wyciął z koperty (T5 — klucze
//       bez przesłanki), więc musi być pilnowana, a nie tylko skomentowana.
//   R5. Brzmienia zgadzają się CO DO ZNAKU z makietą widoku tygodnia.
//   R6. Ekrany naprawdę tę funkcję wołają (asercja na źródło, nie na wiarę).
//
// ── ⭐ PLAN-D-C3 15.08.2026 — CO DOSZŁO (sekcje 7–9) ─────────────────
//   R7.  „Nie wiem" bije KAŻDĄ wiedzę o zawodniku — także brak uprawnień.
//   R8.  Pustka `blad_odczytu` NIGDY nie jest ślepym zaułkiem, a jej wyjście
//        zależy od tego, czy ekran w ogóle da się pociągnąć w dół.
//   R9.  Wsteczna zgodność: wołanie bez `odczytUdanySie` działa jak przed C3
//        (to jest asercja o `dzis.tsx` i `kalendarz.tsx`, których ten pas
//        nie dotyka).
//   R10. Siedem ekranów pasa C3 NAPRAWDĘ woła `rozpoznajPustke`.
//   R11. Żaden z siedmiu nie ma wzorca „błąd → pusta lista" w ŻADNEJ z jego
//        dwóch postaci — ani gałęzi błędu, która po cichu czyści listę,
//        ani `?? []` przy odczycie, o którego błąd nikt nie pyta.
//   R12. Brzmienia czwartego rodzaju są nowe i oznaczone jako nieprzejrzane.
//
// ⚠️ SIEDEM MUTACJI (sekcja 9). Mutacja, która nie podnosi liczby FAIL-i,
// oznacza asercję, która niczego nie pilnuje. Wszystkie żyją w obiektach
// `Zasady` — ani jedna nie dotyka dysku, więc cofnięcie jest strukturalne,
// a nie obietnicą; pilnuje tego osobna asercja na końcu.
//
// ⚠️ O68: sekcja 6 czyta `dzis.tsx` i `kalendarz.tsx`, czyli CUDZE pliki.
// Przy pasach równoległych czerwień w tej sekcji najprawdopodobniej NIE
// należy do tego strażnika — patrz nota przekazania pasa C3.
//
// ⚠️ O53: żadnego `new URL(...)` — `readFileSync` + `fileURLToPath`.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  rozpoznajPustke,
  opisPustkiDoLogu,
  POWOD_NIEOSIAGALNOSCI,
  PUSTKA_BRAK_DANYCH_TEKST,
  PUSTKA_BRAK_DANYCH_TEKST_DZIS,
  PUSTKA_BRAK_DANYCH_TEKST_NADCHODZACE,
  PUSTKA_BRAK_DANYCH_CTA,
  PUSTKA_BRAK_KONFIGURACJI_TEKST,
  PUSTKA_BRAK_KONFIGURACJI_CTA,
  PUSTKA_BRAK_UPRAWNIEN_TEKST,
  PUSTKA_BRAK_UPRAWNIEN_CTA,
  // ⭐ PLAN-D-C3 15.08.2026 — czwarty rodzaj pustki.
  opisBleduOdczytuDoLogu,
  PUSTKA_BLAD_ODCZYTU_TEKST,
  PUSTKA_BLAD_ODCZYTU_CTA,
  PUSTKA_BLAD_ODCZYTU_CTA_BEZ_ODSWIEZANIA,
  BRZMIENIE_DO_PRZEJRZENIA_C3,
  type Pustka,
  type WejsciePustki,
} from './trzyPustki';
import { ZAPIS_ODRZUCONY_BRAK_DOSTEPU } from './dostepKonta';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

const libDir = dirname(fileURLToPath(import.meta.url));
const appRoot = dirname(libDir);

function we(over: Partial<WejsciePustki> = {}): WejsciePustki {
  return { maWpisy: false, planLekcjiZnany: null, moznaZapisywac: true, ...over };
}

console.log('trzyPustki.selftest.ts — strażnik trzech pustek (T6)\n');

// ═════════════════════════════════════════════════════════════════════
console.log('1. TRZY PUSTKI SĄ TRZY — nigdy dwie');
// ═════════════════════════════════════════════════════════════════════
{
  check('lista NIEpusta → nie ma o czym mówić (`null`)',
    rozpoznajPustke(we({ maWpisy: true })) === null, '');

  const daneP = rozpoznajPustke(we());
  const konfP = rozpoznajPustke(we({ planLekcjiZnany: false }));
  const uprP = rozpoznajPustke(we({ moznaZapisywac: false }));

  check('brak danych → rodzaj `brak_danych`', daneP?.rodzaj === 'brak_danych', JSON.stringify(daneP));
  check('brak planu lekcji → rodzaj `brak_konfiguracji`', konfP?.rodzaj === 'brak_konfiguracji', JSON.stringify(konfP));
  check('brak dostępu do zapisu → rodzaj `brak_uprawnien`', uprP?.rodzaj === 'brak_uprawnien', JSON.stringify(uprP));

  const teksty = [daneP?.tekst, konfP?.tekst, uprP?.tekst];
  check('⚠️ trzy RÓŻNE teksty — bez tego rozróżnienie nie dociera do zawodnika',
    new Set(teksty).size === 3, JSON.stringify(teksty));

  const cta = [daneP?.cta, konfP?.cta, uprP?.cta];
  check('⚠️ trzy RÓŻNE wyjścia — pustka bez własnego wyjścia jest ślepym zaułkiem',
    new Set(cta).size === 3, JSON.stringify(cta));

  check('żadna pustka nie jest bez wyjścia',
    [daneP, konfP, uprP].every((p) => !!p && p.cta.length > 0), '');

  // ⛔ Zdanie o wygasłym dostępie NIE SPRZEDAJE i NIE STRASZY — ta sama
  // granica, którą pas K postawił przy KOMUNIKAT_WYGASNIECIA.
  check('⛔ zdanie o braku uprawnień nie straszy i nie odlicza dni',
    !/stracisz|ostatnia szansa|tylko dziś|zostało \d+ dni/i.test(PUSTKA_BRAK_UPRAWNIEN_TEKST),
    PUSTKA_BRAK_UPRAWNIEN_TEKST);
  check('…i mówi WPROST, co nadal działa („widzisz swój tydzień")',
    /widzisz/i.test(PUSTKA_BRAK_UPRAWNIEN_TEKST), PUSTKA_BRAK_UPRAWNIEN_TEKST);
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n2. PIERWSZEŃSTWO — brak uprawnień bije wszystko');
// ═════════════════════════════════════════════════════════════════════
{
  check('brak uprawnień + brak konfiguracji → mówimy o UPRAWNIENIACH',
    rozpoznajPustke(we({ moznaZapisywac: false, planLekcjiZnany: false }))?.rodzaj === 'brak_uprawnien', '');
  check('…bo „Dodaj trening" przy odrzucanym zapisie jest ślepym zaułkiem',
    rozpoznajPustke(we({ moznaZapisywac: false }))?.cta === PUSTKA_BRAK_UPRAWNIEN_CTA, '');
  check('brak konfiguracji bije brak danych (pustka myląca > pustka prawdziwa)',
    rozpoznajPustke(we({ planLekcjiZnany: false }))?.rodzaj === 'brak_konfiguracji', '');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n3. „NIE WIEM" NIE MÓWI ZAWODNIKOWI, ŻE STRACIŁ DOSTĘP');
// ═════════════════════════════════════════════════════════════════════
// ⚠️ Ten sam kierunek błędu co przy ograniczeniach: powiedzenie „skończył Ci
// się okres próbny" komuś, komu się nie skończył, jest gorsze niż
// niepokazanie tego zdania.
{
  check('nieodczytany stan dostępu (`null`) → NIE mówimy o braku uprawnień',
    rozpoznajPustke(we({ moznaZapisywac: null }))?.rodzaj === 'brak_danych', '');
  check('nieznany plan lekcji (`null`) → NIE mówimy o braku konfiguracji',
    rozpoznajPustke(we({ planLekcjiZnany: null }))?.rodzaj === 'brak_danych', '');
  check('oba `null` → zwykły brak danych, bez zgadywania',
    rozpoznajPustke(we({ moznaZapisywac: null, planLekcjiZnany: null }))?.rodzaj === 'brak_danych', '');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n4. ⚠️ GAŁĄŹ NIEOSIĄGALNA JEST NAZWANA, NIE PRZEMILCZANA');
// ═════════════════════════════════════════════════════════════════════
// To jest ta sama choroba, którą pas T wyciął z koperty ograniczeń (T5 —
// klucz bez przesłanki). Różnica: tam przesłanka ZNIKNĘŁA i nikt jej nie
// budował; tu przesłanka MA WŁASNY PAS z numerem. Gdyby ten pas wypadł
// z planu, gałąź ma zniknąć razem z nim — i o to pytają te asercje.
{
  const konf = rozpoznajPustke(we({ planLekcjiZnany: false }));
  check('gałąź „brak konfiguracji" jest oznaczona jako NIEOSIĄGALNA',
    konf?.osiagalne === false, JSON.stringify(konf));
  check('…a dwie pozostałe jako osiągalne',
    rozpoznajPustke(we())?.osiagalne === true
    && rozpoznajPustke(we({ moznaZapisywac: false }))?.osiagalne === true, '');

  check('powód nieosiągalności podaje POMIAR, nie ogólnik',
    /14\.08\.2026/.test(POWOD_NIEOSIAGALNOSCI) && /%school%/.test(POWOD_NIEOSIAGALNOSCI),
    POWOD_NIEOSIAGALNOSCI);
  check('⚠️ …i podaje NUMER PASA, który ją włączy — bez tego to jest obietnica bez pokrycia',
    /pas A3/i.test(POWOD_NIEOSIAGALNOSCI), POWOD_NIEOSIAGALNOSCI);
  check('log mówi o nieosiągalności GŁOŚNO, a nie po cichu',
    opisPustkiDoLogu(konf).includes('NIEOSIĄGALNA'), opisPustkiDoLogu(konf));
  check('…a przy osiągalnych pustkach log tego nie dokleja',
    !opisPustkiDoLogu(rozpoznajPustke(we())).includes('NIEOSIĄGALNA'), '');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n5. BRZMIENIA CO DO ZNAKU Z MAKIETY WIDOKU TYGODNIA');
// ═════════════════════════════════════════════════════════════════════
{
  check('„brak danych" — brzmienie z makiety',
    PUSTKA_BRAK_DANYCH_TEKST === 'Nic nie masz zaplanowane w tym tygodniu.', PUSTKA_BRAK_DANYCH_TEKST);
  check('„brak konfiguracji" — brzmienie z makiety',
    PUSTKA_BRAK_KONFIGURACJI_TEKST === 'Nie wiemy, kiedy masz szkołę — dlatego cały tydzień wygląda na wolny.',
    PUSTKA_BRAK_KONFIGURACJI_TEKST);
  check('„brak uprawnień" — brzmienie z makiety',
    PUSTKA_BRAK_UPRAWNIEN_TEKST === 'Twój okres próbny się skończył. Widzisz swój tydzień, ale nie możesz dodawać nowych rzeczy.',
    PUSTKA_BRAK_UPRAWNIEN_TEKST);
  check('trzy wyjścia — brzmienia z makiety',
    PUSTKA_BRAK_DANYCH_CTA === 'Dodaj trening'
    && PUSTKA_BRAK_KONFIGURACJI_CTA === 'Wpisz swój plan lekcji'
    && PUSTKA_BRAK_UPRAWNIEN_CTA === 'Przedłuż dostęp', '');

  // Warianty zakresu — makieta mówi o tygodniu, a dwa miejsca w appce
  // mówią o krótszym czasie. Zdanie o tygodniu byłoby tam nieprawdziwe.
  check('zakres „dziś" ma własne brzmienie, nie zdanie o tygodniu',
    rozpoznajPustke(we({ zakres: 'dzis' }))?.tekst === PUSTKA_BRAK_DANYCH_TEKST_DZIS, '');
  check('zakres „nadchodzące" ma własne brzmienie',
    rozpoznajPustke(we({ zakres: 'nadchodzace' }))?.tekst === PUSTKA_BRAK_DANYCH_TEKST_NADCHODZACE, '');
  check('bez podanego zakresu — brzmienie tygodniowe z makiety',
    rozpoznajPustke(we())?.tekst === PUSTKA_BRAK_DANYCH_TEKST, '');
  check('⚠️ żadne z brzmień nie mówi „brak wydarzeń" — to jest zdanie, które ta runda kasuje',
    ![PUSTKA_BRAK_DANYCH_TEKST, PUSTKA_BRAK_DANYCH_TEKST_DZIS, PUSTKA_BRAK_DANYCH_TEKST_NADCHODZACE,
      PUSTKA_BRAK_KONFIGURACJI_TEKST, PUSTKA_BRAK_UPRAWNIEN_TEKST]
      .some((t) => /brak wydarze|brak zaplanowanych/i.test(t)), '');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n6. (T6) EKRANY NAPRAWDĘ PODPIĘŁY KOMUNIKAT — asercja na źródło');
// ═════════════════════════════════════════════════════════════════════
// ⚠️ ASERCJA NA REGUŁĘ: każdy ekran, który ZAPISUJE coś do bazy i pokazuje
// błąd zawodnikowi, musi rozpoznawać odmowę dostępu. Przemiatane po liście
// ekranów zapisujących, nie po jednym znanym pliku.
{
  const EKRANY_ZAPISUJACE = [
    { plik: 'app/(tabs)/cele.tsx', coZapisuje: 'nowe wąskie gardło, zmiana priorytetu, zamknięcie' },
    { plik: 'app/(tabs)/kalendarz.tsx', coZapisuje: 'nowe wydarzenie, anulowanie' },
    { plik: 'app/(tabs)/mecz.tsx', coZapisuje: 'zapis meczu' },
    { plik: 'app/(tabs)/dziennik.tsx', coZapisuje: 'wpis dnia (podpięte przez pas K)' },
  ];

  check('(strażnik strażnika) mam co przemiatać',
    EKRANY_ZAPISUJACE.every((e) => existsSync(join(appRoot, e.plik))),
    EKRANY_ZAPISUJACE.filter((e) => !existsSync(join(appRoot, e.plik))).map((e) => e.plik).join(', '));

  const bezRozpoznania: string[] = [];
  for (const e of EKRANY_ZAPISUJACE) {
    const sciezka = join(appRoot, e.plik);
    if (!existsSync(sciezka)) continue;
    const zrodlo = readFileSync(sciezka, 'utf8').replace(/^\s*\/\/.*$/gm, '');
    if (!/toJestBrakDostepu\(/.test(zrodlo)) bezRozpoznania.push(e.plik);
  }
  check('KAŻDY ekran zapisujący rozpoznaje odmowę dostępu (`toJestBrakDostepu`)',
    bezRozpoznania.length === 0,
    `pokazują surowy błąd bazy: ${bezRozpoznania.join(', ')}`);

  const bezKomunikatu: string[] = [];
  for (const e of EKRANY_ZAPISUJACE) {
    const sciezka = join(appRoot, e.plik);
    if (!existsSync(sciezka)) continue;
    const zrodlo = readFileSync(sciezka, 'utf8').replace(/^\s*\/\/.*$/gm, '');
    if (!/ZAPIS_ODRZUCONY_BRAK_DOSTEPU/.test(zrodlo)) bezKomunikatu.push(e.plik);
  }
  check('…i KAŻDY pokazuje ten sam komunikat, a nie własną wersję',
    bezKomunikatu.length === 0, bezKomunikatu.join(', '));

  check('komunikat mówi, że NIC NIE ZGINĘŁO — to jest jego najważniejsze zdanie',
    /nic nie zgin/i.test(ZAPIS_ODRZUCONY_BRAK_DOSTEPU), ZAPIS_ODRZUCONY_BRAK_DOSTEPU);

  // Trzy pustki są podpięte tam, gdzie ekran rysuje pustą listę.
  // ⚠️ Komentarze wypadają — inaczej strażnik zapala się na własnej
  // dokumentacji cytującej skasowane zdanie (ten sam wzorzec co
  // `tests/test-zasady-w-promptach.js` z pasa S). Wycinamy OBA rodzaje:
  // `//` i JSX-owe `{/* … */}`.
  const zywy = (zrodlo: string) => zrodlo
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const kalendarz = zywy(readFileSync(join(appRoot, 'app', '(tabs)', 'kalendarz.tsx'), 'utf8'));
  const dzis = zywy(readFileSync(join(appRoot, 'app', '(tabs)', 'dzis.tsx'), 'utf8'));
  check('Kalendarz rozpoznaje trzy pustki zamiast pisać „Brak zaplanowanych wydarzeń"',
    /rozpoznajPustke\(/.test(kalendarz) && !/Brak zaplanowanych wydarzeń/.test(kalendarz),
    'kalendarz nadal zlewa trzy przypadki w jeden');
  check('„Dziś w kalendarzu" też — nie ma dwóch różnych odpowiedzi na tę samą pustkę',
    /rozpoznajPustke\(/.test(dzis) && !/Nic zaplanowanego na dziś\./.test(dzis),
    'ekran Dziś nadal ma własne zdanie o pustce');
}

// ═════════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-C3 15.08.2026 — CZWARTY RODZAJ I SIEDEM EKRANÓW
// ═════════════════════════════════════════════════════════════════════
//
// ── CO PILNUJE (ponad R1–R6 wyżej) ───────────────────────────────────
//   R7.  „Nie wiem" bije KAŻDĄ wiedzę o zawodniku — także brak uprawnień.
//   R8.  Pustka `blad_odczytu` NIGDY nie jest ślepym zaułkiem.
//   R9.  Wsteczna zgodność: wołanie bez `odczytUdanySie` działa jak przed C3.
//   R10. Siedem ekranów NAPRAWDĘ woła `rozpoznajPustke` (asercja na źródło).
//   R11. Żaden z siedmiu nie ma gałęzi błędu, która OPRÓŻNIA LISTĘ, nie
//        nazywając tego ani logiem, ani stanem odczytu.
//   R12. Brzmienia czwartego rodzaju są oznaczone jako nieprzejrzane.

const SIEDEM_EKRANOW_C3 = [
  'app/(tabs)/biblioteka.tsx',
  'app/(tabs)/diagnoza.tsx',
  'app/(tabs)/centrum-decyzji.tsx',
  'app/(tabs)/mecz.tsx',
  'app/(tabs)/ja.tsx',
  'app/(tabs)/dziennik.tsx',
  'app/(tabs)/cele.tsx',
];

/** Kod BEZ komentarzy — inaczej strażnik zapala się na własnej dokumentacji. */
function zyweZrodlo(zrodlo: string): string {
  return zrodlo
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function wczytajZywe(plik: string): string {
  const sciezka = join(appRoot, plik);
  return existsSync(sciezka) ? zyweZrodlo(readFileSync(sciezka, 'utf8')) : '';
}

/**
 * Wycina ciała gałęzi błędu: każdy `catch (…) { … }` i każdy
 * `if (<warunek zawierający err/error/Err>) { … }`. Dopasowanie nawiasów, nie
 * regex na całość — inaczej pierwszy `}` w środku ucinałby blok w połowie.
 */
function galezieBledu(zywy: string): string[] {
  const out: string[] = [];
  const naglowek = /\bcatch\s*(\([^)]*\))?\s*\{|\bif\s*\(([^)]*(?:err|error|Err|Error)[^)]*)\)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = naglowek.exec(zywy)) !== null) {
    let i = zywy.indexOf('{', m.index);
    let glebokosc = 0;
    let koniec = -1;
    for (let k = i; k < zywy.length; k++) {
      if (zywy[k] === '{') glebokosc++;
      else if (zywy[k] === '}') {
        glebokosc--;
        if (glebokosc === 0) { koniec = k; break; }
      }
    }
    if (koniec > i) out.push(zywy.slice(i, koniec + 1));
  }
  return out;
}

/** Czy ta gałąź błędu OPRÓŻNIA jakąś listę — jawnie albo przez `?? []`. */
function oprozniaListe(cialo: string): boolean {
  return /\bset[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9_]*\(\s*\[\s*\]\s*\)/.test(cialo)
    || /\?\?\s*\[\s*\]/.test(cialo)
    || /\|\|\s*\[\s*\]/.test(cialo);
}

/** Czy ta gałąź NAZYWA to, co się stało — logiem albo stanem odczytu. */
function nazywaOdczyt(cialo: string): boolean {
  return /opisBleduOdczytuDoLogu\s*\(/.test(cialo)
    || /setOdczyt[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9_]*\(/.test(cialo);
}

/**
 * ⚠️ DRUGA POŁOWA WZORCA „BŁĄD → PUSTA LISTA", I TA GROŹNIEJSZA.
 *
 * ZMIERZONE 15.08.2026 na źródłach z `main`: sama analiza gałęzi `catch` /
 * `if (err)` łapie 4 z 7 ekranów. Trzech nie łapie — `biblioteka.tsx`,
 * `ja.tsx` i `dziennik.tsx` — bo ich defekt NIE MIAŁ gałęzi błędu. Miał
 * `goalsRes.data ?? []` w głównym przepływie, przy odczycie, którego `.error`
 * nikt nigdy nie czytał. Błąd nie był obsłużony źle; był NIEZAUWAŻONY.
 *
 * Reguła: wynik zapytania wolno podeprzeć pustą listą tylko wtedy, gdy tuż
 * przed tym ktoś zapytał o błąd. „Tuż przed" = 600 znaków żywego kodu — gałąź
 * błędu odczytu zawsze stoi kilka linii nad jego użyciem, a szersze okno
 * przepuściłoby plik, w którym słowo `error` pada gdziekolwiek indziej.
 *
 * ⛔ Wąsko dobrana lista nazw (`data`, `rows`, `…Res`, `…Surowe`) jest
 * świadoma: `row.pain_entries || []` to zagnieżdżona relacja, która ma prawo
 * być pusta, a nie wynik odczytu udający pustkę.
 */
function niezauwazonyBlad(zywy: string): string[] {
  const wynikZapytania =
    /(?:(\w+)\.)?\b(\w*[Dd]ata|\w*[Rr]ows|\w+Res|\w*Surowe)\b\s*(?:\?\?|\|\|)\s*\[\s*\]/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = wynikZapytania.exec(zywy)) !== null) {
    const okno = zywy.slice(Math.max(0, m.index - 600), m.index);
    if (!/error|Err\b|\bErr/.test(okno)) {
      out.push(zywy.slice(Math.max(0, m.index - 60), m.index + m[0].length).replace(/\s+/g, ' '));
    }
  }
  return out;
}

// ── BATERIA — te same asercje na prawdziwych i na zepsutych zasadach ──
// ⚠️ Mutacja, która nie podnosi liczby FAIL-i, oznacza asercję, która niczego
// nie pilnuje (ten sam wzorzec co sekcja 8 w `kolejkaPodania.selftest.ts`).
type Zasady = {
  decyduj: (w: WejsciePustki) => Pustka | null;
  zrodla: Record<string, string>;
};

type WynikBaterii = { label: string; ok: boolean; detail: string };

function bateria(z: Zasady): WynikBaterii[] {
  const r: WynikBaterii[] = [];
  const zapisz = (label: string, ok: boolean, detail = '') => r.push({ label, ok, detail });
  const wc = (over: Partial<WejsciePustki> = {}): WejsciePustki =>
    ({ maWpisy: false, planLekcjiZnany: null, moznaZapisywac: true, ...over });

  // ── R7 · „nie wiem" bije każdą wiedzę o zawodniku ──────────────────
  const bladSam = z.decyduj(wc({ odczytUdanySie: false }));
  zapisz('R7 · nieudany odczyt → rodzaj `blad_odczytu`, nie `brak_danych`',
    bladSam?.rodzaj === 'blad_odczytu', JSON.stringify(bladSam));
  zapisz('R7 · …i NIE mówi zawodnikowi „nic nie masz"',
    bladSam?.tekst === PUSTKA_BLAD_ODCZYTU_TEKST, JSON.stringify(bladSam?.tekst));
  zapisz('⛔ R7 · nieudany ODCZYT nie jest zgłaszany jako wygasły dostęp',
    z.decyduj(wc({ odczytUdanySie: false, moznaZapisywac: false }))?.rodzaj === 'blad_odczytu',
    'brak uprawnień przebił „nie wiem" — appka twierdzi coś, czego nie zmierzyła');
  zapisz('⛔ R7 · …ani jako brak konfiguracji',
    z.decyduj(wc({ odczytUdanySie: false, planLekcjiZnany: false }))?.rodzaj === 'blad_odczytu', '');
  zapisz('R7 · lista NIEpusta bije wszystko — dane sprzed chwili są prawdziwsze niż komunikat',
    z.decyduj(wc({ maWpisy: true, odczytUdanySie: false })) === null, '');

  // ── R8 · pustka „nie wiem" ma zawsze wyjście ───────────────────────
  zapisz('R8 · `blad_odczytu` ma wyjście i NIE chowa go w zdaniu ekranu',
    !!bladSam && bladSam.cta.length > 0 && bladSam.krokWTekscie === false,
    JSON.stringify(bladSam));
  zapisz('R8 · ekran z odświeżaniem dostaje wyjście przez pociągnięcie w dół',
    z.decyduj(wc({ odczytUdanySie: false, daSieOdswiezyc: true }))?.cta === PUSTKA_BLAD_ODCZYTU_CTA, '');
  zapisz('R8 · ⚠️ ekran BEZ odświeżania (`diagnoza.tsx`) dostaje INNE wyjście',
    z.decyduj(wc({ odczytUdanySie: false, daSieOdswiezyc: false }))?.cta
      === PUSTKA_BLAD_ODCZYTU_CTA_BEZ_ODSWIEZANIA,
    'zawodnik dostaje instrukcję gestu, którego na tym ekranie nie ma');
  zapisz('R8 · gałąź „nie wiem" jest OSIĄGALNA — inaczej niż „brak konfiguracji"',
    bladSam?.osiagalne === true, '');

  // ── R9 · wsteczna zgodność z `dzis.tsx` i `kalendarz.tsx` ──────────
  zapisz('R9 · bez `odczytUdanySie` zachowanie jest takie jak przed pasem C3',
    z.decyduj(wc())?.rodzaj === 'brak_danych'
    && z.decyduj(wc())?.tekst === PUSTKA_BRAK_DANYCH_TEKST, '');
  zapisz('R9 · `odczytUdanySie: null` (nie czytałem) też NIE zgaduje błędu',
    z.decyduj(wc({ odczytUdanySie: null }))?.rodzaj === 'brak_danych', '');
  zapisz('R9 · `odczytUdanySie: true` → zwykły brak danych',
    z.decyduj(wc({ odczytUdanySie: true }))?.rodzaj === 'brak_danych', '');

  // ── własne zdanie ekranu ───────────────────────────────────────────
  const wlasne = z.decyduj(wc({ tekstBrakuDanych: 'Brak wpisów — dodaj pierwszy powyżej.' }));
  zapisz('ekran może podać SWOJE zdanie „pusto" — brzmienia Kuby zostają na miejscu',
    wlasne?.tekst === 'Brak wpisów — dodaj pierwszy powyżej.' && wlasne?.krokWTekscie === true,
    JSON.stringify(wlasne));
  zapisz('⛔ własne zdanie NIE przebija „nie wiem"',
    z.decyduj(wc({ odczytUdanySie: false, tekstBrakuDanych: 'Brak wpisów.' }))?.tekst
      === PUSTKA_BLAD_ODCZYTU_TEKST,
    'ekran po nieudanym odczycie nadal mówi zawodnikowi, że nic nie ma');

  // ── R10 · siedem ekranów woła `rozpoznajPustke` ────────────────────
  for (const plik of SIEDEM_EKRANOW_C3) {
    zapisz(`R10 · ${plik} woła \`rozpoznajPustke\``,
      /rozpoznajPustke\s*\(/.test(z.zrodla[plik] ?? ''),
      'ekran nadal sam decyduje, co znaczy jego pustka');
  }

  // ── R11 · żadnego wzorca „błąd → pusta lista", w OBU jego postaciach ──
  // (a) gałąź błędu, która opróżnia listę i nic nie mówi;
  // (b) wynik zapytania podparty pustą listą tam, gdzie nikt nie pytał o błąd.
  for (const plik of SIEDEM_EKRANOW_C3) {
    const zywy = z.zrodla[plik] ?? '';
    const cicheGalezie = galezieBledu(zywy).filter((c) => oprozniaListe(c) && !nazywaOdczyt(c));
    const niezauwazone = niezauwazonyBlad(zywy);
    const winne = [
      ...cicheGalezie.map((c) => `gałąź: ${c.replace(/\s+/g, ' ').slice(0, 80)}`),
      ...niezauwazone.map((c) => `niezauważony błąd: …${c.slice(0, 80)}`),
    ];
    zapisz(`R11 · ${plik} — ani jednego „błąd → pusta lista"`,
      winne.length === 0,
      `${winne.length}: ${winne.join(' | ')}`);
  }

  return r;
}

const ZASADY_PRAWDZIWE: Zasady = {
  decyduj: rozpoznajPustke,
  zrodla: Object.fromEntries(SIEDEM_EKRANOW_C3.map((p) => [p, wczytajZywe(p)])),
};

// ═════════════════════════════════════════════════════════════════════
console.log('\n7. ⭐ (C3) CZWARTY RODZAJ + SIEDEM EKRANÓW — bateria na prawdziwych zasadach');
// ═════════════════════════════════════════════════════════════════════
{
  check('(strażnik strażnika) mam co przemiatać — siedem plików istnieje',
    SIEDEM_EKRANOW_C3.every((p) => existsSync(join(appRoot, p))),
    SIEDEM_EKRANOW_C3.filter((p) => !existsSync(join(appRoot, p))).join(', '));

  for (const w of bateria(ZASADY_PRAWDZIWE)) check(w.label, w.ok, w.detail);
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n8. ⭐ (C3) BRZMIENIA CZWARTEGO RODZAJU — nowe, więc oznaczone');
// ═════════════════════════════════════════════════════════════════════
{
  check('zdanie „nie wiem" brzmi co do znaku jak w poleceniu C3',
    PUSTKA_BLAD_ODCZYTU_TEKST === 'Nie udało się sprawdzić.', PUSTKA_BLAD_ODCZYTU_TEKST);
  check('⛔ …i NIE pokazuje zawodnikowi komunikatu bazy',
    !/\{|\}|SQLSTATE|row-level|RLS|\bcode\b/i.test(PUSTKA_BLAD_ODCZYTU_TEKST), PUSTKA_BLAD_ODCZYTU_TEKST);
  check('⛔ …i NIE mówi „nic nie masz" żadnym słowem',
    !/nic nie masz|nie masz|brak /i.test(PUSTKA_BLAD_ODCZYTU_TEKST), PUSTKA_BLAD_ODCZYTU_TEKST);
  // ⚠️ Przez `Set` na napisach, nie `!==` na stałych: `tsc --strict` uznaje
  // porównanie dwóch różnych typów literalnych za pomyłkę (TS2367) i strażnik
  // przestałby się kompilować — a strażnik, który nie przechodzi `tsc`,
  // nie dojedzie do CI (to samo ograniczenie co O53 przy `new URL`).
  check('dwa wyjścia są RÓŻNE — bo dwa ekrany odświeżają się inaczej',
    new Set<string>([PUSTKA_BLAD_ODCZYTU_CTA, PUSTKA_BLAD_ODCZYTU_CTA_BEZ_ODSWIEZANIA]).size === 2,
    `${PUSTKA_BLAD_ODCZYTU_CTA} | ${PUSTKA_BLAD_ODCZYTU_CTA_BEZ_ODSWIEZANIA}`);
  check('⚠️ znacznik „do przejrzenia przez Kubę" istnieje i wskazuje ten pas',
    /PLAN-D-C3/.test(BRZMIENIE_DO_PRZEJRZENIA_C3) && /KUB/i.test(BRZMIENIE_DO_PRZEJRZENIA_C3),
    BRZMIENIE_DO_PRZEJRZENIA_C3);

  // Log — „+ log z powodem" z kształtu wymaganego przez polecenie C3.3.
  const log = opisBleduOdczytuDoLogu('ekran.load → tabela', { message: 'permission denied' });
  check('log podaje MIEJSCE i POWÓD — inaczej „nie wiem" jest ładniejszym milczeniem',
    log.includes('ekran.load → tabela') && log.includes('permission denied'), log);
  check('log mówi wprost, co zamiast tego czyta zawodnik',
    log.includes(PUSTKA_BLAD_ODCZYTU_TEKST), log);
  check('log nie wywraca się na powodzie bez `message`',
    opisBleduOdczytuDoLogu('x', undefined).length > 0, '');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n9. ⭐ (C3) TEST MUTACYJNY — siedem mutacji, liczba FAIL-i przy każdej');
// ═════════════════════════════════════════════════════════════════════
// ⚠️ MUTACJA, KTÓRA NIE PODNOSI LICZBY FAIL-i, OZNACZA ASERCJĘ, KTÓRA NICZEGO
// NIE PILNUJE. Wtedy trzeba napisać ją od nowa, a nie zgłaszać zielone.
{
  const ROZMIAR = bateria(ZASADY_PRAWDZIWE).length;
  const failePrawdziwe = bateria(ZASADY_PRAWDZIWE).filter((w) => !w.ok).length;

  const bezZrodla = (plik: string, jak: (s: string) => string): Record<string, string> => ({
    ...ZASADY_PRAWDZIWE.zrodla,
    [plik]: jak(ZASADY_PRAWDZIWE.zrodla[plik]),
  });

  const MUTACJE: { nazwa: string; opis: string; zasady: Zasady }[] = [
    {
      nazwa: 'M1 · „nie wiem" znowu udaje pustkę',
      opis: 'decyzja ignoruje `odczytUdanySie` — dokładnie stan sprzed pasa C3',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        decyduj: (w) => rozpoznajPustke({ ...w, odczytUdanySie: null }),
      },
    },
    {
      nazwa: 'M2 · brak uprawnień przebija „nie wiem"',
      opis: 'nieudany ODCZYT zgłaszany zawodnikowi jako wygasły okres próbny',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        decyduj: (w) => (w.odczytUdanySie === false && w.moznaZapisywac === false
          ? rozpoznajPustke({ ...w, odczytUdanySie: null })
          : rozpoznajPustke(w)),
      },
    },
    {
      nazwa: 'M3 · pustka „nie wiem" bez wyjścia',
      opis: 'zawodnik czyta, że nie wyszło, i nie ma co z tym zrobić',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        decyduj: (w) => {
          const p = rozpoznajPustke(w);
          return p && p.rodzaj === 'blad_odczytu' ? { ...p, cta: '', krokWTekscie: true } : p;
        },
      },
    },
    {
      nazwa: 'M4 · jedno wyjście na wszystkie ekrany',
      opis: '`diagnoza.tsx` każe pociągnąć w dół ekran, który nie ma odświeżania',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        decyduj: (w) => rozpoznajPustke({ ...w, daSieOdswiezyc: true }),
      },
    },
    {
      nazwa: 'M5 · ekran znowu sam decyduje o swojej pustce',
      opis: '`biblioteka.tsx` przestaje wołać `rozpoznajPustke`',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: bezZrodla('app/(tabs)/biblioteka.tsx',
          (s) => s.replace(/rozpoznajPustke\s*\(/g, 'wlasnaDecyzja(')),
      },
    },
    {
      nazwa: 'M6 · cicha gałąź „błąd → pusta lista" wraca',
      opis: '`dziennik.tsx` dostaje `catch`, który czyści historię i nic nie mówi',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: bezZrodla('app/(tabs)/dziennik.tsx',
          (s) => `${s}\nfunction __mutacja() { try { nic(); } catch (e) { setHistory([]); } }\n`),
      },
    },
    {
      // ⚠️ TA MUTACJA ODTWARZA DEFEKT SPRZED PASA CO DO ZNAKU — patrz
      // `niezauwazonyBlad`. Bez niej strażnik pilnowałby tylko tej połowy
      // wzorca, którą i tak widać w kodzie.
      nazwa: 'M7 · wraca `?? []` przy odczycie, o którego błąd nikt nie pyta',
      opis: '`biblioteka.tsx` znowu zamienia odmowę RLS na „Nic tu jeszcze nie ma"',
      zasady: {
        ...ZASADY_PRAWDZIWE,
        zrodla: bezZrodla('app/(tabs)/biblioteka.tsx',
          (s) => `${s}\nfunction __mutacja() { const x = (goalsRes.data ?? []).map(g => g.id); return x; }\n`),
      },
    },
  ];

  console.log(`\nbateria ma ${ROZMIAR} asercji · na prawdziwych zasadach FAIL-i: ${failePrawdziwe}\n`);
  check('⭐ bateria na PRAWDZIWYCH zasadach nie zapala ani jednej asercji',
    failePrawdziwe === 0, `FAIL-i: ${failePrawdziwe}`);

  let bezEfektu = 0;
  for (const m of MUTACJE) {
    const zapalone = bateria(m.zasady).filter((w) => !w.ok);
    console.log(`${m.nazwa}`);
    console.log(`   co psuje: ${m.opis}`);
    console.log(`   FAIL-i przy tej mutacji: ${zapalone.length} / ${ROZMIAR}`);
    for (const z of zapalone) console.log(`     • ${z.label}`);
    if (zapalone.length === 0) bezEfektu++;
    check(`⭐ mutacja „${m.nazwa}" podnosi liczbę FAIL-i`,
      zapalone.length > 0, 'mutacja przeszła niezauważona — ta bateria niczego nie pilnuje');
    console.log('');
  }

  check('⭐ KAŻDA z siedmiu mutacji została złapana — i KAŻDA jest cofnięta',
    bezEfektu === 0, `mutacji bez efektu: ${bezEfektu}`);
  // ⚠️ Cofnięcie jest strukturalne, nie deklaratywne: mutacje żyją wyłącznie
  // w obiektach `Zasady` przekazywanych do `bateria()`. Ani jedna nie dotyka
  // dysku, `rozpoznajPustke` ani `ZASADY_PRAWDZIWE` — poniższa asercja
  // sprawdza to pomiarem, a nie obietnicą.
  check('⭐ po siedmiu mutacjach prawdziwe zasady są nadal nietknięte',
    bateria(ZASADY_PRAWDZIWE).filter((w) => !w.ok).length === 0,
    'mutacja wyciekła poza swój obiekt Zasady');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
