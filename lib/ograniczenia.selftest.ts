// PLAN-D-J 08.2026 (12.08.2026) — NOWY PLIK. STRAŻNIK ZADANIA J3.
//
//   npx tsx lib/ograniczenia.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ── CO TEN PLIK PILNUJE I DLACZEGO AKURAT TO ─────────────────────────
// Defekt naprawiany w rundzie J nie polegał na złym kodzie. Drabina zwracała
// pole `ograniczenia`, cron je wyrzucał, appka o nim nie wiedziała — i KAŻDA
// Z TYCH TRZECH CZĘŚCI DZIAŁAŁA POPRAWNIE Z OSOBNA. Testy były zielone,
// raporty mówiły „zrobione", a produkt przez kilka rund nie miał jak powiedzieć
// zawodnikowi, co obowiązuje. To jest wzorzec „cichego braku" w najczystszej
// postaci: nie awaria, tylko brak, który o sobie nie mówi.
//
// ⚠️ DLATEGO TEN STRAŻNIK NIE SPRAWDZA DZISIEJSZEJ LISTY OGRANICZEŃ.
// Sprawdza REGUŁĘ: „każde ograniczenie, które drabina potrafi zwrócić, ma
// konsumenta, a konsument naprawdę o nim wie". Asercja na siedem dzisiejszych
// kluczy przepuściłaby ósmy — czyli dokładnie ten sam defekt jeszcze raz.
//
// Cztery warstwy, każda łapie co innego:
//   1. REJESTR KOMPLETNY  — klucz bez wpisu w `REJESTR_OGRANICZEN`;
//   2. KONSUMENT ISTNIEJE — wpis wskazujący plik, którego nie ma na dysku;
//   3. KONSUMENT WIE      — plik bez dosłownej nazwy klucza i bez nazwy symbolu
//                           (czyli wpis, który już nie odpowiada kodowi);
//   4. ZGODNOŚĆ Z BACKENDEM — lista kluczy tej appki kontra
//      `KLUCZE_OGRANICZEN` w `gamechange-app/lib/arbiter-glosu.js`.
//      To jest granica DWÓCH REPOZYTORIÓW, więc warstwa działa tylko wtedy,
//      gdy oba leżą obok siebie. ⚠️ GDY NIE LEŻĄ — MÓWI TO GŁOŚNO i liczy jako
//      POMINIĘTE. Strażnik, który po cichu nie sprawdza połowy, jest gorszy niż
//      jego brak, bo daje fałszywą zieloną odpowiedź.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  KLUCZE_OGRANICZEN,
  REJESTR_OGRANICZEN,
  WERSJA_OGRANICZEN_ZNANA,
  czytajOgraniczenia,
  obowiazuje,
  opisOgraniczenDoLogu,
  isMissingOgraniczeniaColumnError,
  coPokazacNaDzis,
  type KluczOgraniczenia,
  type StanOgraniczen,
} from './ograniczenia';
import { sufitObjetosci, sufitTygodni, ograniczLiczbeDni, TYGODNI_PRZY_CZEKAM_NA_DECYZJE } from './budzetUwagi';
import { stanZmiany, progZmiany } from './kalibracja';
import { zbudujOdcinek, LICZBA_SYSTEMOWA_ROTACJI, type RoadSegment, type RoadFactor } from './mapaDrogi';

let passed = 0;
let failed = 0;
let pominiete = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}
function pomin(label: string, powod: string) {
  pominiete++;
  console.log(`POMINIETE - ${label}: ${powod}`);
}

const libDir = dirname(fileURLToPath(import.meta.url));
const appRoot = dirname(libDir);

/** Koperta „wszystko znane, nic nie obowiązuje". */
function koperta(aktywne: string[] = [], nieroz: string[] = [], nieznane: string[] = []) {
  return { wersja: WERSJA_OGRANICZEN_ZNANA, aktywne, nieznane_ograniczenia: nieroz, nieznane };
}
const PUSTE = czytajOgraniczenia(koperta());

// ═════════════════════════════════════════════════════════════════════
// 1. TRZY STANY ODCZYTU — NIGDY DWA
// ═════════════════════════════════════════════════════════════════════
{
  const nieOdczytane = czytajOgraniczenia(undefined, 'timeout');
  check('błąd zapytania → nie_odczytane (nie „nic nie obowiązuje")',
    nieOdczytane.rodzaj === 'nie_odczytane', JSON.stringify(nieOdczytane));

  const brakKolumny = czytajOgraniczenia(undefined, null);
  check('kolumny nie było w zapytaniu → nie_odczytane, a NIE nie_zapisane',
    brakKolumny.rodzaj === 'nie_odczytane', JSON.stringify(brakKolumny));

  const sprzedMigracji = czytajOgraniczenia(null, null);
  check('NULL w bazie → nie_zapisane (wiersz sprzed migracji J1)',
    sprzedMigracji.rodzaj === 'nie_zapisane', JSON.stringify(sprzedMigracji));

  check('nie_zapisane i nie_odczytane to DWA RÓŻNE stany, nie jeden',
    sprzedMigracji.rodzaj !== brakKolumny.rodzaj, 'skleiły się w jeden');

  const pusta = czytajOgraniczenia(koperta());
  check('pusta koperta → znane, zero aktywnych (policzone i wyszło zero)',
    pusta.rodzaj === 'znane' && pusta.aktywne.length === 0, JSON.stringify(pusta));

  check('pusta lista ≠ brak zapisu — to są dwa różne stany',
    pusta.rodzaj !== sprzedMigracji.rodzaj, 'skleiły się w jeden');

  const obcaWersja = czytajOgraniczenia({ ...koperta(), wersja: 99 });
  check('koperta w nieznanej wersji → nieznana_wersja, appka NIE zgaduje',
    obcaWersja.rodzaj === 'nieznana_wersja', JSON.stringify(obcaWersja));

  const smiec = czytajOgraniczenia(['blokNieZwiekszaObjetosci']);
  check('tablica zamiast koperty → nie_odczytane, nie cicha pustka',
    smiec.rodzaj === 'nie_odczytane', JSON.stringify(smiec));
}

// ═════════════════════════════════════════════════════════════════════
// 2. `obowiazuje` — trzeci stan naprawdę istnieje
// ═════════════════════════════════════════════════════════════════════
{
  const zOslona = czytajOgraniczenia(koperta(['blokNieZwiekszaObjetosci']));
  check('klucz w `aktywne` → tak',
    obowiazuje(zOslona, 'blokNieZwiekszaObjetosci') === 'tak', '');
  check('klucza nie ma nigdzie → nie',
    obowiazuje(zOslona, 'systemMilczyOCelach') === 'nie', '');

  const nieroz = czytajOgraniczenia(koperta([], ['blokNieZwiekszaObjetosci'], ['tempo wzrostu']));
  check('klucz w `nieznane_ograniczenia` → nie_wiem, a NIE nie',
    obowiazuje(nieroz, 'blokNieZwiekszaObjetosci') === 'nie_wiem', '');

  for (const stan of [
    czytajOgraniczenia(undefined, 'blad'),
    czytajOgraniczenia(null, null),
    czytajOgraniczenia({ ...koperta(), wersja: 99 }),
  ] as StanOgraniczen[]) {
    check(`stan „${stan.rodzaj}" daje nie_wiem dla KAŻDEGO klucza`,
      KLUCZE_OGRANICZEN.every((k) => obowiazuje(stan, k) === 'nie_wiem'), stan.rodzaj);
  }

  const zObcymKluczem = czytajOgraniczenia(koperta(['blokNieZwiekszaObjetosci', 'ograniczenieZPrzyszlosci']));
  check('klucz spoza tej wersji appki jest ZGŁOSZONY, nie zignorowany',
    zObcymKluczem.rodzaj === 'znane' && zObcymKluczem.nieznaneKlucze.includes('ograniczenieZPrzyszlosci'),
    JSON.stringify(zObcymKluczem));
  check('…i nie psuje kluczy, które appka zna',
    obowiazuje(zObcymKluczem, 'blokNieZwiekszaObjetosci') === 'tak', '');
  check('…a log mówi o tym wprost',
    opisOgraniczenDoLogu(zObcymKluczem).includes('SPOZA TEJ WERSJI APPKI'),
    opisOgraniczenDoLogu(zObcymKluczem));
}

// ═════════════════════════════════════════════════════════════════════
// 3. ROZPOZNANIE BRAKU KOLUMNY — kolejność wdrożenia nie gasi ekranu
// ═════════════════════════════════════════════════════════════════════
{
  check('kod 42703 → rozpoznane jako brak kolumny',
    isMissingOgraniczeniaColumnError({ code: '42703', message: 'x' }), '');
  check('komunikat PostgREST o nieznanej kolumnie → rozpoznane',
    isMissingOgraniczeniaColumnError({ message: 'column weekly_voice.ograniczenia does not exist' }), '');
  check('zwykły błąd sieci → NIE udaje braku kolumny',
    !isMissingOgraniczeniaColumnError({ message: 'network request failed' }), '');
  check('null → nie rzuca i nie zgaduje', !isMissingOgraniczeniaColumnError(null), '');
}

// ═════════════════════════════════════════════════════════════════════
// 4. KONSUMENT: EKRAN „DZIŚ"
// ═════════════════════════════════════════════════════════════════════
{
  const pelny = coPokazacNaDzis(PUSTE);
  check('bez ograniczeń „Dziś" wygląda dokładnie jak przed rundą J',
    pelny.pokazacPostepPracy && pelny.pokazacWezwanieDoPracy
    && pelny.pokazacRekomendacje && pelny.pokazacPodpowiedz, JSON.stringify(pelny));

  const wyjscie = coPokazacNaDzis(czytajOgraniczenia(koperta(['wszystkoMilczy'])));
  check('ścieżka wyjścia → zero liczników, zero wezwań, zero rekomendacji (spec 1.2 priorytet 0)',
    !wyjscie.pokazacPostepPracy && !wyjscie.pokazacWezwanieDoPracy
    && !wyjscie.pokazacRekomendacje && !wyjscie.pokazacPodpowiedz, JSON.stringify(wyjscie));

  const kontuzja = coPokazacNaDzis(czytajOgraniczenia(koperta(['systemMilczyOCelach'])));
  check('kontuzja → system milczy o celach (spec 1.2 priorytet 1)',
    !kontuzja.pokazacPostepPracy && !kontuzja.pokazacWezwanieDoPracy
    && !kontuzja.pokazacRekomendacje, JSON.stringify(kontuzja));

  const nieWiem = coPokazacNaDzis(czytajOgraniczenia(null, null));
  check('nie_wiem NIE wycisza ekranu — brak danych nie jest decyzją o milczeniu',
    nieWiem.pokazacRekomendacje && nieWiem.pokazacPostepPracy, JSON.stringify(nieWiem));

  check('każdy wariant ma powód dla logu (milczenie musi mieć nazwane źródło)',
    [pelny, wyjscie, kontuzja, nieWiem].every((w) => w.powod.length > 10), '');
}

// ═════════════════════════════════════════════════════════════════════
// 5. KONSUMENT: BUDŻET UWAGI — „Blok nie zwiększa objętości"
// ═════════════════════════════════════════════════════════════════════
{
  const budzet = {
    kind: 'ready' as const,
    stan: {
      limit_blokow: 2, uzyte_bloki: 1, limit_jednostek: 4,
      uzyte_jednostki: 2, wolne_jednostki: 2, mozna_zaczac: true,
    },
  };

  const bez = sufitObjetosci(budzet, PUSTE);
  check('bez Osłony sufit to normalny limit (4) i 2 wolne',
    bez.maxJednostek === 4 && bez.wolneJednostki === 2 && !bez.proponowacRedukcje, JSON.stringify(bez));

  const zOslona = sufitObjetosci(budzet, czytajOgraniczenia(koperta(['blokNieZwiekszaObjetosci'])));
  check('Osłona → sufit spada z 4 do 2 (tyle, ile zawodnik już robi)',
    zOslona.maxJednostek === 2, JSON.stringify(zOslona));
  check('Osłona → ZERO wolnych jednostek: objętość nie rośnie',
    zOslona.wolneJednostki === 0, JSON.stringify(zOslona));
  check('Osłona przy zajętym tygodniu → planer proponuje REDUKCJĘ (spec 3.2, druga połowa zdania)',
    zOslona.proponowacRedukcje, JSON.stringify(zOslona));

  const pusty = { kind: 'ready' as const, stan: { ...budzet.stan, uzyte_jednostki: 0, wolne_jednostki: 4, uzyte_bloki: 0 } };
  const zOslonaOdZera = sufitObjetosci(pusty, czytajOgraniczenia(koperta(['blokNieZwiekszaObjetosci'])));
  check('Osłona u zawodnika bez ani jednego Bloku → wolno zacząć JEDNĄ sesję, produkt nie zamiera',
    zOslonaOdZera.maxJednostek === 1 && zOslonaOdZera.wolneJednostki === 1, JSON.stringify(zOslonaOdZera));
  check('…i wtedy nie ma czego redukować',
    !zOslonaOdZera.proponowacRedukcje, JSON.stringify(zOslonaOdZera));

  const nieroz = sufitObjetosci(budzet, czytajOgraniczenia(koperta([], ['blokNieZwiekszaObjetosci'])));
  check('NIEROZSTRZYGNIĘTE nie zaciska sufitu (inaczej odcięłoby planowanie wszystkim bez pomiarów wzrostu)',
    nieroz.maxJednostek === 4 && nieroz.ograniczenie === 'nie_wiem', JSON.stringify(nieroz));
  check('…ale stan jest NAZWANY w powodzie, a nie przemilczany',
    nieroz.powod.includes('NIEROZSTRZYGNIĘTE'), nieroz.powod);

  const bezBudzetu = sufitObjetosci({ kind: 'unknown' }, PUSTE);
  check('brak budżetu → sufit `null`, nigdy zmyślone zero (R5)',
    bezBudzetu.maxJednostek === null && bezBudzetu.wolneJednostki === null, JSON.stringify(bezBudzetu));

  check('ograniczLiczbeDni tnie zaznaczone dni do sufitu',
    ograniczLiczbeDni(5, zOslona) === 2, String(ograniczLiczbeDni(5, zOslona)));
  check('ograniczLiczbeDni nie podnosi, gdy zaznaczono mniej',
    ograniczLiczbeDni(1, bez) === 1, String(ograniczLiczbeDni(1, bez)));
  check('ograniczLiczbeDni przy nieznanym suficie NIE tnie na ślepo',
    ograniczLiczbeDni(5, bezBudzetu) === 5, String(ograniczLiczbeDni(5, bezBudzetu)));
}

// ═════════════════════════════════════════════════════════════════════
// 6. KONSUMENT: HORYZONT BLOKU — P5 „czekam na decyzję"
// ═════════════════════════════════════════════════════════════════════
{
  const bez = sufitTygodni(8, PUSTE);
  check('bez P5 horyzont zostaje taki, jaki zaproponowało dozowanie',
    bez.maxTygodni === 8, JSON.stringify(bez));

  const zP5 = sufitTygodni(8, czytajOgraniczenia(koperta(['blokSkracaHoryzontDoDecyzji'])));
  check(`P5 → horyzont skrócony do ${TYGODNI_PRZY_CZEKAM_NA_DECYZJE} tyg. (spec 6.4)`,
    zP5.maxTygodni === TYGODNI_PRZY_CZEKAM_NA_DECYZJE, JSON.stringify(zP5));

  const krotszy = sufitTygodni(2, czytajOgraniczenia(koperta(['blokSkracaHoryzontDoDecyzji'])));
  check('P5 NIE wydłuża horyzontu krótszego niż sufit',
    krotszy.maxTygodni === 2, JSON.stringify(krotszy));

  const nieWiem = sufitTygodni(8, czytajOgraniczenia(null, null));
  check('nie_wiem nie skraca horyzontu',
    nieWiem.maxTygodni === 8 && nieWiem.ograniczenie === 'nie_wiem', JSON.stringify(nieWiem));
}

// ═════════════════════════════════════════════════════════════════════
// 7. KONSUMENT: KALIBRACJA — przeramowanie spadku
// ═════════════════════════════════════════════════════════════════════
{
  const prog = progZmiany(1);
  const bez = stanZmiany(-5, prog);
  check('bez Osłony spadek nadal nazywa się spadkiem',
    bez.stan === 3 && bez.tytul === 'Wynik spadł', JSON.stringify(bez));

  const zOslona = stanZmiany(-5, prog, czytajOgraniczenia(koperta(['kalibracjaPrzeramowujeSpadek'])));
  check('Osłona → stan 3 NIE nazywa spadku spadkiem (spec 3.2)',
    zOslona.stan === 3 && zOslona.tytul !== 'Wynik spadł', JSON.stringify(zOslona));
  check('…i mówi wprost, że to nie jest cofnięcie się',
    zOslona.tresc.toLowerCase().includes('nie jest cofnięcie'), zOslona.tresc);
  check('…i nadal ZERO liczb o dojrzałości biologicznej (zakaz bezwzględny, spec 3.3)',
    !/wiek biologiczn|phv|dojrzałoś|przewidywany wzrost/i.test(`${zOslona.tytul} ${zOslona.tresc}`),
    zOslona.tresc);
  check('…i nie chwali ani nie porównuje z rówieśnikami',
    !/świetnie|brawo|gratul|rówieśnik|inni zawodnicy/i.test(`${zOslona.tytul} ${zOslona.tresc}`),
    zOslona.tresc);

  const nieWiem = stanZmiany(-5, prog, czytajOgraniczenia(null, null));
  check('nie_wiem → brzmienie ostrożne, nie przeramowane',
    nieWiem.tytul === 'Wynik spadł', JSON.stringify(nieWiem));

  check('stan 2 (poniżej progu) jest nietknięty przez ograniczenie',
    stanZmiany(0.5, prog, czytajOgraniczenia(koperta(['kalibracjaPrzeramowujeSpadek']))).stan === 2, '');
  check('stan 1 (realna poprawa) jest nietknięty przez ograniczenie',
    stanZmiany(5, prog, czytajOgraniczenia(koperta(['kalibracjaPrzeramowujeSpadek']))).stan === 1, '');
}

// ═════════════════════════════════════════════════════════════════════
// 8. KONSUMENT: MAPA DROGI — P5, tło i liczba systemowa
// ═════════════════════════════════════════════════════════════════════
{
  const odc: RoadSegment = { id: 's1', slug: 's1', label: 'Odcinek', age_from: 13, age_to: 15, sort_order: 1 };
  const f = (slug: string, ctrl: boolean, jutro: boolean): RoadFactor => ({
    id: slug, segment_id: 's1', slug, title: slug, body: slug,
    evidence_level: 'wysoka', evidence_number: null, source_ref: null,
    is_controllable: ctrl, is_tomorrow: jutro, variant: 'base', sort_order: 1,
  });
  const czynniki = [f('jutro', true, true), f('reka', true, false), f('tlo1', false, false), f('tlo2', false, false)];

  const bez = zbudujOdcinek(odc, 'base', czynniki, PUSTE);
  check('bez P5 Mapa pokazuje tło (odciążenie atrybucyjne, spec 2.2 punkt 3)',
    bez.stan === 'gotowy' && bez.tlo.length === 2 && bez.tloUkryte === false, JSON.stringify(bez));
  check('…i nie dokłada liczby systemowej',
    bez.stan === 'gotowy' && bez.liczbaSystemowa === null, JSON.stringify(bez));

  const zP5 = zbudujOdcinek(odc, 'base', czynniki,
    czytajOgraniczenia(koperta(['mapaTylkoWTwoichRekach', 'pokazacLiczbeSystemowa'])));
  check('P5 → Mapa zostawia wyłącznie to, co jest w rękach zawodnika (spec 6.4)',
    zP5.stan === 'gotowy' && zP5.tlo.length === 0 && zP5.tloUkryte === true, JSON.stringify(zP5));
  check('…i tło jest UKRYTE świadomie, a nie puste z braku treści',
    zP5.stan === 'gotowy' && zP5.tloUkryte === true && czynniki.filter((c) => !c.is_controllable).length === 2, '');
  check('…i dochodzi liczba systemowa',
    zP5.stan === 'gotowy' && zP5.liczbaSystemowa === LICZBA_SYSTEMOWA_ROTACJI, JSON.stringify(zP5));
  check('…a liczba systemowa mówi o SYSTEMIE, nie o zawodniku',
    LICZBA_SYSTEMOWA_ROTACJI.toLowerCase().includes('o systemie, nie o tobie'), LICZBA_SYSTEMOWA_ROTACJI);

  const nieWiem = zbudujOdcinek(odc, 'base', czynniki, czytajOgraniczenia(null, null));
  check('nie_wiem nie zabiera zawodnikowi tła',
    nieWiem.stan === 'gotowy' && nieWiem.tlo.length === 2, JSON.stringify(nieWiem));

  const bezStanu = zbudujOdcinek(odc, 'base', czynniki);
  check('wywołanie bez stanu (kod sprzed rundy J) zachowuje się jak dotąd',
    bezStanu.stan === 'gotowy' && bezStanu.tlo.length === 2 && bezStanu.liczbaSystemowa === null, '');
}

// ═════════════════════════════════════════════════════════════════════
// 9. STRAŻNIK J3 — KAŻDE OGRANICZENIE MA KONSUMENTA
// ═════════════════════════════════════════════════════════════════════
// ⚠️ To jest asercja na REGUŁĘ, nie na dzisiejszą listę. Ósme ograniczenie
// dołożone bez odbiorcy zapala ten blok, choć nikt go tu nie wpisze.
{
  const brakWpisu = KLUCZE_OGRANICZEN.filter((k) => !REJESTR_OGRANICZEN[k]);
  check('(J3) każdy klucz z KLUCZE_OGRANICZEN ma wpis w REJESTR_OGRANICZEN',
    brakWpisu.length === 0, `bez konsumenta: ${brakWpisu.join(', ')}`);

  const nadmiarowe = Object.keys(REJESTR_OGRANICZEN)
    .filter((k) => !(KLUCZE_OGRANICZEN as readonly string[]).includes(k));
  check('(J3) rejestr nie opisuje ograniczeń, których drabina nie zwraca',
    nadmiarowe.length === 0, `zbędne wpisy: ${nadmiarowe.join(', ')}`);

  for (const klucz of KLUCZE_OGRANICZEN) {
    const wpis = REJESTR_OGRANICZEN[klucz];
    if (!wpis) continue;
    const sciezka = join(appRoot, wpis.plik);
    if (!existsSync(sciezka)) {
      check(`(J3) konsument „${klucz}" — plik ${wpis.plik} istnieje`, false, `nie ma pliku ${sciezka}`);
      continue;
    }
    const zrodlo = readFileSync(sciezka, 'utf8');
    check(`(J3) konsument „${klucz}" — ${wpis.plik} zawiera symbol ${wpis.symbol}`,
      zrodlo.includes(wpis.symbol), `symbol ${wpis.symbol} nie występuje w ${wpis.plik}`);
    // Dosłowna nazwa klucza w pliku konsumenta jest jedynym mechanicznym
    // dowodem, że ten plik NAPRAWDĘ o tym ograniczeniu wie. Wpis w rejestrze
    // jest deklaracją; to jest sprawdzenie.
    check(`(J3) konsument „${klucz}" — ${wpis.plik} naprawdę pyta o ten klucz`,
      zrodlo.includes(`'${klucz}'`), `w ${wpis.plik} nie ma dosłownego '${klucz}'`);
    check(`(J3) konsument „${klucz}" — wpis mówi, co się dzieje`,
      wpis.coRobi.length > 30, wpis.coRobi);
  }
}

// ═════════════════════════════════════════════════════════════════════
// 10. STRAŻNIK J3, WARSTWA DRUGA — ZGODNOŚĆ Z DRABINĄ W BACKENDZIE
// ═════════════════════════════════════════════════════════════════════
// Drabina mieszka w OSOBNYM REPOZYTORIUM (`gamechange-app`). Ta warstwa działa
// wyłacznie wtedy, gdy oba leżą obok siebie na jednym dysku — czyli u Kuby
// i w sesji delegowanej, a nie na CI appki. Dlatego jej brak jest MELDOWANY,
// nie przemilczany, a drugą połowę tej samej reguły pilnuje strażnik po
// stronie backendu: `gamechange-app/tests/test-ograniczenia-maja-konsumenta.js`.
{
  const kandydaci = [
    join(dirname(appRoot), 'gamechange-app', 'lib', 'arbiter-glosu.js'),
    join(appRoot, '..', 'gamechange-app', 'lib', 'arbiter-glosu.js'),
  ];
  const sciezka = kandydaci.find((p) => existsSync(p));
  if (!sciezka) {
    pomin('(J3) zgodność kluczy z drabiną backendu',
      `nie znalazłem gamechange-app/lib/arbiter-glosu.js (szukałem: ${kandydaci.join(' | ')}). `
      + 'Ta warstwa NIE ZOSTAŁA SPRAWDZONA — drugą połowę reguły pilnuje strażnik w repozytorium backendu.');
  } else {
    const zrodlo = readFileSync(sciezka, 'utf8');
    const blok = /const KLUCZE_OGRANICZEN\s*=\s*\[([\s\S]*?)\]/.exec(zrodlo);
    if (!blok) {
      check('(J3) umiem odczytać KLUCZE_OGRANICZEN z drabiny backendu', false,
        `nie znalazłem stałej w ${sciezka} — zmienił się jej kształt`);
    } else {
      const zBackendu = Array.from(blok[1].matchAll(/'([A-Za-z]+)'/g)).map((m) => m[1]).sort();
      const zAppki = [...KLUCZE_OGRANICZEN].sort();
      check('(J3) lista kluczy appki jest IDENTYCZNA z listą drabiny backendu',
        JSON.stringify(zBackendu) === JSON.stringify(zAppki),
        `backend: ${zBackendu.join(', ')} | appka: ${zAppki.join(', ')}`);

      // Drugi bezpiecznik: klucze wypisane w literale `ograniczenia` wewnątrz
      // `rozstrzygnijGlos` muszą pokrywać się z tą samą listą. Bez tego można
      // dołożyć ograniczenie do wyniku i zapomnieć o stałej.
      const literal = /const ograniczenia = \{([\s\S]*?)\n  \};/.exec(zrodlo);
      if (!literal) {
        check('(J3) umiem odczytać literał `ograniczenia` z drabiny', false, 'zmienił się jego kształt');
      } else {
        const zLiteralu = Array.from(literal[1].matchAll(/^\s{4}([A-Za-z]+):/gm)).map((m) => m[1]).sort();
        check('(J3) literał `ograniczenia` w drabinie nie zawiera klucza spoza KLUCZE_OGRANICZEN',
          JSON.stringify(zLiteralu) === JSON.stringify(zBackendu),
          `literał: ${zLiteralu.join(', ')} | stała: ${zBackendu.join(', ')}`);
      }
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed${pominiete > 0 ? `, ${pominiete} POMINIETE (patrz wyżej)` : ''}`);
if (failed > 0) process.exit(1);
