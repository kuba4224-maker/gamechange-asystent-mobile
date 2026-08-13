// PLAN-D-F 08.2026 (12.08.2026) — NOWY PLIK.
//
//   npx tsx lib/glosTygodnia.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// PO CO TO ISTNIEJE. Ekran „Dziś" ma teraz trzy powody, żeby nie pokazać
// niczego: nie odczytał wiersza, wiersza jeszcze nie ma, albo arbiter
// zdecydował o CISZY. Na ekranie wyglądają identycznie. Gdyby wyglądały
// identycznie także w kodzie, „appka nic nie pokazuje" byłoby nie do
// zdiagnozowania — a to jest dokładnie ten cichy brak, przed którym cała
// oś decyzji ma bronić.
//
// ⚠️ CZEGO TEN PLIK NIE SPRAWDZA: czy zapytanie do Supabase zwraca to, co
// trzeba (to jest w `app/(tabs)/dzis.tsx`), ani jak karta wygląda.
import { readFileSync } from 'node:fs';
// ⚠️ NIE `new URL(...)` (poprawka 13.08.2026, błąd TS2769). `tsconfig.json` appki
// ciągnie bibliotekę DOM, więc `URL` rozstrzyga się na typ DOM-owy, a `readFileSync`
// oczekuje `URL` z `node:url`. Te dwa typy są niezgodne i kontrola typów pada —
// mimo że w czasie działania wszystko chodzi. Wzorzec niżej jest w tym repozytorium
// sprawdzony: tak samo czyta pliki `lib/ostatniCentymetr.selftest.ts` i `tsc` go przepuszcza.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  stanGlosu,
  pokazacKarte,
  podniescPunktPomocy,
  opisDoLogu,
  poniedzialekTygodnia,
  type WierszGlosu,
  type Glos,
} from './glosTygodnia';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

// ⚠️ ZMIANA Z 13.08.2026 (N3). Do tej pory ten pomocnik ustawiał `spoke_at: null`
// dla KAŻDEGO wiersza — czyli wszystkie testy niżej opisywały tydzień, w którym
// arbiter ZDECYDOWAŁ NIE MÓWIĆ, i mimo to sprawdzały, że karta się rysuje.
// Testy przechodziły, bo ekran tej kolumny w ogóle nie czytał. Teraz `wiersz()`
// znaczy „arbiter w tym tygodniu mówi", a milczenie trzeba poprosić jawnie.
const SPOKE_AT = '2026-08-10T06:00:00.000Z';

function wiersz(voice: Glos, reason = 'powód z bazy'): WierszGlosu {
  return { week_start: '2026-08-10', voice, reason, spoke_at: SPOKE_AT };
}

/** Ten sam wiersz, ale arbiter policzył tydzień i ZDECYDOWAŁ NIE ZABIERAĆ GŁOSU. */
function wierszMilczacy(voice: Glos, reason = 'refrakcja: stan obowiązuje, ale w tym tygodniu nie mówimy'): WierszGlosu {
  return { week_start: '2026-08-10', voice, reason, spoke_at: null };
}

// ═══════════════════════════════════════════════════════════════════
// 1. TYDZIEŃ — ten sam poniedziałek co liczy backend
// ═══════════════════════════════════════════════════════════════════
check('poniedziałek z poniedziałku to ten sam dzień',
  poniedzialekTygodnia(new Date(2026, 7, 10)) === '2026-08-10', poniedzialekTygodnia(new Date(2026, 7, 10)));
check('poniedziałek z niedzieli to poniedziałek TEGO SAMEGO tygodnia',
  poniedzialekTygodnia(new Date(2026, 7, 16)) === '2026-08-10', poniedzialekTygodnia(new Date(2026, 7, 16)));
check('poniedziałek z soboty', poniedzialekTygodnia(new Date(2026, 7, 15)) === '2026-08-10', poniedzialekTygodnia(new Date(2026, 7, 15)));
check('przejście przez początek miesiąca', poniedzialekTygodnia(new Date(2026, 8, 2)) === '2026-08-31', poniedzialekTygodnia(new Date(2026, 8, 2)));
check('przejście przez początek roku', poniedzialekTygodnia(new Date(2027, 0, 1)) === '2026-12-28', poniedzialekTygodnia(new Date(2027, 0, 1)));
check('data ma dwucyfrowy miesiąc i dzień (format bazy)',
  /^\d{4}-\d{2}-\d{2}$/.test(poniedzialekTygodnia(new Date(2026, 0, 5))), poniedzialekTygodnia(new Date(2026, 0, 5)));

// ═══════════════════════════════════════════════════════════════════
// 2. TRZY POWODY MILCZENIA — nie wolno ich skleić (R5)
// ═══════════════════════════════════════════════════════════════════
{
  const bl = stanGlosu(null, 'network request failed');
  const brak = stanGlosu(null, null);
  const cisza = stanGlosu(wiersz('silence', 'żadne narzędzie nie ma nic do powiedzenia: …'));

  check('błąd odczytu → „nie wiem", NIE cisza', bl.rodzaj === 'nie_wiem', bl.rodzaj);
  check('brak wiersza → „brak_wiersza", NIE cisza', brak.rodzaj === 'brak_wiersza', brak.rodzaj);
  check('voice=silence → „cisza"', cisza.rodzaj === 'cisza', cisza.rodzaj);
  check('trzy różne przyczyny dają TRZY różne stany',
    new Set([bl.rodzaj, brak.rodzaj, cisza.rodzaj]).size === 3, `${bl.rodzaj}/${brak.rodzaj}/${cisza.rodzaj}`);
  check('…ale ŻADEN z nich nie rysuje karty (cisza jest decyzją, nie pustym stanem)',
    !pokazacKarte(bl) && !pokazacKarte(brak) && !pokazacKarte(cisza), 'karta');
  check('…i każdy tłumaczy się w logu innym zdaniem',
    new Set([opisDoLogu(bl), opisDoLogu(brak), opisDoLogu(cisza)]).size === 3,
    [opisDoLogu(bl), opisDoLogu(brak), opisDoLogu(cisza)].join(' | '));
  check('log ciszy niesie POWÓD z bazy, nie samo słowo „cisza"',
    opisDoLogu(cisza).includes('żadne narzędzie'), opisDoLogu(cisza));
  check('błąd odczytu jest w logu nazwany treścią błędu',
    opisDoLogu(bl).includes('network request failed'), opisDoLogu(bl));
}

// ═══════════════════════════════════════════════════════════════════
// 3. GŁOSY, KTÓRE MAJĄ KARTĘ
// ═══════════════════════════════════════════════════════════════════
for (const g of ['exit', 'injury', 'growth', 'compass'] as Glos[]) {
  const s = stanGlosu(wiersz(g));
  check(`${g}: rysuje kartę`, pokazacKarte(s), s.rodzaj);
  check(`${g}: karta ma tytuł i treść, obie niepuste`,
    s.rodzaj === 'glos' && s.tytul.length > 5 && s.tresc.length > 30, JSON.stringify(s));
  check(`${g}: powód z bazy jest zachowany (do logu, nie na ekran)`,
    s.rodzaj === 'glos' && s.powod === 'powód z bazy', JSON.stringify(s));
}
{
  const s = stanGlosu(wiersz('block'));
  check('block: NIE rysuje osobnej karty — ma już kafelek na górze ekranu',
    !pokazacKarte(s), JSON.stringify(s));
  check('…ale to nadal jest GŁOS, nie cisza (log ma o tym mówić)',
    s.rodzaj === 'glos' && opisDoLogu(s).includes('block'), opisDoLogu(s));
}
{
  const s = stanGlosu({ week_start: '2026-08-10', voice: 'cokolwiek' as Glos, reason: 'x', spoke_at: null });
  check('głos spoza znanego zbioru → „nie wiem", NIE pusty ekran bez wyjaśnienia',
    s.rodzaj === 'nie_wiem', JSON.stringify(s));
  check('…i mówi wprost, że appka jest starsza niż baza',
    s.rodzaj === 'nie_wiem' && s.powod.includes('starsza niż baza'), JSON.stringify(s));
}

// ═══════════════════════════════════════════════════════════════════
// 3b. ZADANIE N3 (13.08.2026) — STAN BEZ ODEZWANIA
// ═══════════════════════════════════════════════════════════════════
// Arbiter rozstrzyga dwie rzeczy naraz: KTO ma pierwszeństwo i CZY SIĘ ODZYWA.
// Drugie z nich jest całym budżetem uwagi: refrakcje (Osłona co kilka tygodni,
// kontuzja pytająca o powrót po sześciu) polegają na tym, że wiersz istnieje,
// stan obowiązuje, a produkt MILCZY. Do 13.08.2026 ekran czytał tylko pierwsze.
for (const g of ['exit', 'injury', 'growth', 'compass'] as Glos[]) {
  const milczy = stanGlosu(wierszMilczacy(g));
  const mowi = stanGlosu(wiersz(g));

  // Strażnik strażnika: bez tej asercji test niżej przechodziłby także wtedy,
  // gdyby karta nie rysowała się NIGDY — czyli sprawdzałby nic.
  check(`(N3) ${g}: gdy arbiter MÓWI, karta jest`, pokazacKarte(mowi), JSON.stringify(mowi));
  check(`(N3) ${g}: gdy arbiter NIE mówi (spoke_at = null), karty NIE MA`,
    !pokazacKarte(milczy), JSON.stringify(milczy));
  check(`(N3) ${g}: …ale to NADAL jest głos, nie cisza i nie brak wiersza — stan obowiązuje`,
    milczy.rodzaj === 'glos' && milczy.voice === g, JSON.stringify(milczy));
  check(`(N3) ${g}: log odróżnia „stan bez odezwania" od odezwania`,
    opisDoLogu(milczy) !== opisDoLogu(mowi) && opisDoLogu(milczy).includes('STAN BEZ ODEZWANIA'),
    opisDoLogu(milczy));
}
{
  const cisza = stanGlosu(wiersz('silence'));
  const milczacaOslona = stanGlosu(wierszMilczacy('growth'));
  check('(N3) CISZA i STAN BEZ ODEZWANIA to dwie różne rzeczy — nie wolno ich skleić (R5)',
    cisza.rodzaj === 'cisza' && milczacaOslona.rodzaj === 'glos'
    && opisDoLogu(cisza) !== opisDoLogu(milczacaOslona),
    `${opisDoLogu(cisza)} || ${opisDoLogu(milczacaOslona)}`);
}
{
  // ⚠️ ŚWIADOMY WYJĄTEK. Punkt pomocy reaguje na STAN, nie na GŁOS. Kontuzja
  // i ścieżka wyjścia trwają tygodniami, a arbiter odzywa się w nich rzadko —
  // numer, który znika w tygodniu milczenia, znika przez większość czasu,
  // w którym jest potrzebny.
  check('(N3) kontuzja BEZ odezwania nadal podnosi punkt pomocy',
    podniescPunktPomocy(stanGlosu(wierszMilczacy('injury'))), 'injury/milczy');
  check('(N3) ścieżka wyjścia BEZ odezwania nadal podnosi punkt pomocy',
    podniescPunktPomocy(stanGlosu(wierszMilczacy('exit'))), 'exit/milczy');
}

// ═══════════════════════════════════════════════════════════════════
// 3a. ⚠️ TU BYŁO ZADANIE I1 („KARTA MA DOKĄD PROWADZIĆ") — 10 ASERCJI
// ═══════════════════════════════════════════════════════════════════
// PLAN-D-P 08.2026 (13.08.2026). Pilnowały, że karta „Czas na pomiar" prowadzi
// do modala Kalibracji w zakładce „Ja", że parametr trasy jest JEDNĄ stałą,
// i że pozostałe głosy NIE prowadzą nigdzie.
//
// Kalibracja została usunięta z produktu w całości
// (claude/DECYZJA_KALIBRACJA_USUNIETA_13_08_2026.md), a była JEDYNYM głosem
// z wejściem — więc `wejscieZKarty()`, `OTWORZ_KALIBRACJE`
// i `KARTA_WEJSCIE_LABEL` odeszły razem z nią, zamiast zostać funkcją, która
// zawsze zwraca `null`. Nie ma czego testować i nazywam to wprost, zamiast po
// cichu skrócić plik.
//
// ⚠️ CO ZOSTAJE PILNOWANE: nowa asercja niżej sprawdza, że karta głosu tygodnia
// NIE DOSTAŁA po cichu wejścia z powrotem — bo gdyby dostała, byłoby to
// zaproszenie do ekranu, którego nie ma.
{
  const zrodlo = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'glosTygodnia.ts'), 'utf8');
  check('(P) karta głosu tygodnia nie ma wejścia i nikt go nie przywrócił',
    !/export function wejscieZKarty/.test(zrodlo) && !/OTWORZ_KALIBRACJE/.test(zrodlo.replace(/\/\/.*$/gm, '')),
    'wróciło wejście z karty — a ekranu, do którego prowadziło, nie ma');
}

// ═══════════════════════════════════════════════════════════════════
// 4. ZAKAZY W TREŚCI — sprawdzane, nie obiecane
// ═══════════════════════════════════════════════════════════════════
{
  // Zakaz bezwzględny ze specyfikacji, sekcja 3.3: żadnej liczby o dojrzałości
  // biologicznej na ekranie zawodnika. Błąd tych szacunków idzie w najgorszą
  // stronę — 0 trafień na 39 przypadków u wcześnie dojrzewających.
  const osl = stanGlosu(wiersz('growth'));
  const tresc = osl.rodzaj === 'glos' ? `${osl.tytul} ${osl.tresc}` : '';
  for (const zakazane of ['PHV', 'wiek biologiczny', 'wieku biologicznego', 'dojrzałoś', 'przewidywany wzrost']) {
    check(`Osłona nie mówi o dojrzałości biologicznej: brak „${zakazane}"`,
      !tresc.toLowerCase().includes(zakazane.toLowerCase()), tresc);
  }
  check('Osłona NIE nazywa spadku cofnięciem się', /nie jest cofnięcie/.test(tresc), tresc);
  check('Osłona mówi wprost, czego nie robić w tym tygodniu', /nie zwiększaj objętości/.test(tresc), tresc);
}
{
  const kont = stanGlosu(wiersz('injury'));
  const tresc = kont.rodzaj === 'glos' ? kont.tresc : '';
  check('kontuzja mówi, że brak odpowiedzi UTRZYMUJE stan (poprawka A3, na ekranie)',
    /ten stan zostaje/.test(tresc), tresc);
  check('kontuzja mówi, że kończy go zawodnik, nie system', /sam powiesz/.test(tresc), tresc);
}
{
  const wyj = stanGlosu(wiersz('exit'));
  const tresc = wyj.rodzaj === 'glos' ? wyj.tresc : '';
  check('ścieżka wyjścia mówi, że liczniki są WYŁĄCZONE, a nie że „nic nie ma"',
    /wyłączone/.test(tresc), tresc);
  check('…i nie żąda niczego od zawodnika', /Nic nie musisz/.test(tresc), tresc);
}
{
  const kom = stanGlosu(wiersz('compass'));
  const tresc = kom.rodzaj === 'glos' ? kom.tresc : '';
  check('Kompas mówi, że nic się nie zmieni bez decyzji zawodnika (spec 6.2)',
    /bez Twojej decyzji/.test(tresc), tresc);
}

// ═══════════════════════════════════════════════════════════════════
// 5. ZADANIE E2 — PUNKT POMOCY WYŻEJ W KONTUZJI I ŚCIEŻCE WYJŚCIA
// ═══════════════════════════════════════════════════════════════════
check('kontuzja → punkt pomocy podniesiony', podniescPunktPomocy(stanGlosu(wiersz('injury'))), 'injury');
check('ścieżka wyjścia → punkt pomocy podniesiony', podniescPunktPomocy(stanGlosu(wiersz('exit'))), 'exit');
for (const g of ['growth', 'compass', 'block', 'silence'] as Glos[]) {
  check(`${g} → punkt pomocy NIE jest podnoszony (to nie klasyfikator ryzyka)`,
    !podniescPunktPomocy(stanGlosu(wiersz(g))), g);
}
check('błąd odczytu NIE podnosi punktu pomocy (brak danych to nie sygnał)',
  !podniescPunktPomocy(stanGlosu(null, 'timeout')), 'nie_wiem');
check('brak wiersza NIE podnosi punktu pomocy', !podniescPunktPomocy(stanGlosu(null, null)), 'brak_wiersza');

console.log(`\n${passed} passed, ${failed} failed`);
// Celowo `throw`, a nie `process.exit(1)`: `process` wymaga `@types/node`,
// których tsconfig appki nie zaciąga — a te pliki są objęte `npx tsc --noEmit`.
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
