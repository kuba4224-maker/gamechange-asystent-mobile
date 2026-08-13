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
import {
  stanGlosu,
  pokazacKarte,
  wejscieZKarty,
  OTWORZ_KALIBRACJE,
  KARTA_WEJSCIE_LABEL,
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
for (const g of ['exit', 'injury', 'growth', 'compass', 'calibration'] as Glos[]) {
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
for (const g of ['exit', 'injury', 'growth', 'compass', 'calibration'] as Glos[]) {
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
  check('(N3) milcząca kalibracja nie ma też wejścia — nie zapraszamy do ekranu bez odezwania',
    wejscieZKarty(stanGlosu(wierszMilczacy('calibration'))) === null, 'calibration/milczy');
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
// 3a. PLAN-D-I 08.2026 (12.08.2026) — I1: KARTA MA DOKĄD PROWADZIĆ
// ═══════════════════════════════════════════════════════════════════
{
  const s = stanGlosu(wiersz('calibration'));
  const w = wejscieZKarty(s);
  check('(I1) karta „Czas na pomiar" PROWADZI gdzieś — do 12.08.2026 nie prowadziła nigdzie',
    w !== null, JSON.stringify(w));
  check('(I1) …i prowadzi do ISTNIEJĄCEGO ekranu w zakładce „Ja", nie do nowej trasy',
    w !== null && w.trasa === '/ja', JSON.stringify(w));
  check('(I1) …parametrem, po którym „Ja" otwiera swój JEDYNY egzemplarz modala',
    w !== null && w.otworz === OTWORZ_KALIBRACJE && OTWORZ_KALIBRACJE === 'kalibracja', JSON.stringify(w));
  check('(I1) …i ma niepustą etykietę wejścia', w !== null && w.etykieta === KARTA_WEJSCIE_LABEL && w.etykieta.length > 5, JSON.stringify(w));
}
for (const g of ['exit', 'injury', 'growth', 'compass'] as Glos[]) {
  check(`(I1) ${g}: karta NIE prowadzi nigdzie — nie ma dokąd, a link donikąd jest gorszy niż jego brak`,
    wejscieZKarty(stanGlosu(wiersz(g))) === null, g);
}
{
  check('(I1) block nie ma karty, więc nie ma i wejścia',
    wejscieZKarty(stanGlosu(wiersz('block'))) === null, 'block');
  check('(I1) cisza nie ma wejścia — cisza jest decyzją, a nie zaproszeniem',
    wejscieZKarty(stanGlosu(wiersz('silence'))) === null, 'silence');
  check('(I1) brak wiersza nie ma wejścia', wejscieZKarty(stanGlosu(null, null)) === null, 'brak_wiersza');
  check('(I1) błąd odczytu nie ma wejścia — nie zapraszamy do ekranu na podstawie niewiedzy',
    wejscieZKarty(stanGlosu(null, 'network request failed')) === null, 'nie_wiem');
}
{
  // Strażnik dubla: wejście z karty i wiersz w „Ja" MUSZĄ prowadzić do tego
  // samego modala. Ten test nie umie tego udowodnić sam — pilnuje tego, żeby
  // parametr był JEDNĄ stałą, a nie napisem powtórzonym w dwóch plikach.
  check('(I1) parametr wejścia jest stałą eksportowaną, nie napisem wklepanym w ekranie',
    typeof OTWORZ_KALIBRACJE === 'string' && OTWORZ_KALIBRACJE.length > 0, OTWORZ_KALIBRACJE);
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
  const kal = stanGlosu(wiersz('calibration'));
  const tresc = kal.rodzaj === 'glos' ? kal.tresc : '';
  check('kalibracja wymienia WSZYSTKIE trzy warunki standaryzacji',
    /pora dnia/.test(tresc) && /nawierzchnia/.test(tresc) && /obuwie/.test(tresc), tresc);
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
for (const g of ['growth', 'compass', 'calibration', 'block', 'silence'] as Glos[]) {
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
