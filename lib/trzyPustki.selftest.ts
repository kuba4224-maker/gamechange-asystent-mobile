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

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
