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
import { sufitObjetosci, ograniczLiczbeDni } from './budzetUwagi';
// PLAN-D-P 08.2026 (13.08.2026) — konsument reguły „spadku nie nazywa się
// spadkiem u kogoś, kto szybko rośnie" przeniósł się z Kalibracji do rediagnozy.
import { buildRediagnosisView } from './rediagnosis';
// ⚠️ PLAN-D-T 08.2026 — `LICZBA_SYSTEMOWA_ROTACJI` zniknęła z `mapaDrogi.ts`
// razem z ograniczeniem, które ją zapalało. Sam fakt (rotacja 24,5–41%) żyje
// dalej w `lib/sciezkaWyjscia.ts` i tam jest pilnowany.
import { zbudujOdcinek, type RoadSegment, type RoadFactor } from './mapaDrogi';

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
// 6. ⚠️ TU BYŁ KONSUMENT „HORYZONT BLOKU" (P5) — 4 ASERCJE, SKASOWANY
// ═════════════════════════════════════════════════════════════════════
// PLAN-D-P 08.2026 (13.08.2026). `sufitTygodni()` skracała horyzont Bloku do
// czterech tygodni przy ograniczeniu `blokSkracaHoryzontDoDecyzji`. Jedyną
// przesłanką tego ograniczenia był stan `exit_mode.state = 'paused_decision'`,
// którego NIE DAŁO SIĘ NIGDZIE WŁĄCZYĆ — cała gałąź została skasowana
// (zadanie P8), razem z funkcją, ze stałą `TYGODNI_PRZY_CZEKAM_NA_DECYZJE`
// i z samym kluczem. Nazywam to tutaj, zamiast po cichu skrócić plik.

// ═════════════════════════════════════════════════════════════════════
// 7. KONSUMENT: REDIAGNOZA — przeramowanie spadku przy Osłonie
// ═════════════════════════════════════════════════════════════════════
// ⚠️ TO JEST TA SAMA REGUŁA, KTÓRA DO 13.08.2026 MIESZKAŁA W KALIBRACJI.
// Zmieniły się dwie rzeczy i tylko dwie: MIEJSCE (zamknięcie Bloku zamiast
// osobnego ekranu pomiaru) i SPOSÓB ODCZYTU stanu Osłony — zamiast własnego
// klucza `kalibracjaPrzeramowujeSpadek` idzie przez `czyOslonaAktywna()`,
// czyli przez `blokNieZwiekszaObjetosci` ODJĄĆ kontuzję. Pełne uzasadnienie
// stoi w `lib/ograniczenia.ts` przy tej funkcji.
{
  const READY = { state: 'ready' as const, score: 42 };
  const widok = (v: number, ogr: unknown) => buildRediagnosisView({
    segmentId: 'regeneracja', baseline: READY, answerValue: v, weeks: 6,
    ograniczenia: ogr as never,
  }) as { headline: string; body: string; oslona: string; direction: string };

  const bez = widok(2, PUSTE);
  check('bez Osłony spadek nadal nazywa się spadkiem',
    bez.direction === 'down' && /w dół/i.test(bez.headline), JSON.stringify(bez));

  const zOslona = widok(2, czytajOgraniczenia(koperta(['blokNieZwiekszaObjetosci'])));
  check('Osłona → spadek NIE nazywa się spadkiem',
    zOslona.direction === 'down' && zOslona.oslona === 'tak' && !/w dół/i.test(zOslona.headline),
    JSON.stringify(zOslona));
  check('…i mówi wprost, że to nie jest cofnięcie się',
    zOslona.body.toLowerCase().includes('nie jest cofnięcie'), zOslona.body);
  check('…i nadal ZERO liczb o dojrzałości biologicznej (zakaz bezwzględny)',
    !/wiek biologiczn|phv|dojrzałoś|przewidywany wzrost|[0-9]/i.test(`${zOslona.headline} ${zOslona.body}`),
    zOslona.body);
  check('…i nie chwali ani nie porównuje z rówieśnikami',
    !/świetnie|brawo|gratul|rówieśnik|inni zawodnicy/i.test(`${zOslona.headline} ${zOslona.body}`),
    zOslona.body);

  // ⛔ KONTUZJA WŁĄCZA `blokNieZwiekszaObjetosci` DOKŁADNIE TAK SAMO JAK OSŁONA.
  // Bez odjęcia kontuzji produkt powiedziałby „rośniesz" komuś, kto leży z urazem.
  const zKontuzja = widok(2, czytajOgraniczenia(koperta(['blokNieZwiekszaObjetosci', 'systemMilczyOCelach'])));
  check('⛔ kontuzja NIE przeramowuje spadku — przesłanek nie da się rozróżnić',
    zKontuzja.oslona === 'nie_wiem' && /w dół/i.test(zKontuzja.headline), JSON.stringify(zKontuzja));

  const nieWiem = widok(2, czytajOgraniczenia(null, null));
  check('nie_wiem → brzmienie ostrożne, nie przeramowane',
    /w dół/i.test(nieWiem.headline), JSON.stringify(nieWiem));

  check('brak zmiany przy Osłonie jest NAZWANY osiągnięciem (zasada P1)',
    /utrzyma/i.test(widok(3, czytajOgraniczenia(koperta(['blokNieZwiekszaObjetosci']))).headline), '');
  check('wzrost jest nietknięty przez ograniczenie',
    widok(5, czytajOgraniczenia(koperta(['blokNieZwiekszaObjetosci']))).body === widok(5, PUSTE).body, '');
}

// ═════════════════════════════════════════════════════════════════════
// 8. ⚠️ MAPA DROGI PRZESTAŁA BYĆ KONSUMENTEM — PLAN-D-T 08.2026, ZADANIE T5
// ═════════════════════════════════════════════════════════════════════
// TU BYŁO 6 ASERCJI NA REGUŁĘ P5 (`mapaTylkoWTwoichRekach`,
// `pokazacLiczbeSystemowa`). Oba klucze zostały skasowane decyzją D6 razem
// z konsumentami w `lib/mapaDrogi.ts` — nie miały ani jednej przesłancy od
// pasa P, więc pilnowały zachowania, którego nie dało się wywołać.
//
// ⚠️ ASERCJE NIE ZNIKAJĄ BEZ ZASTĄPIENIA. W ich miejsce wchodzą trzy nowe,
// pilnujące dokładnie tego, co jest teraz PRAWDĄ o Mapie — i pilnujące tego
// MOCNIEJ, bo bezwarunkowo:
//   1. sekcja „Co jest tłem" jest budowana ZAWSZE, z samej treści;
//   2. Mapa nie ma jak zawęzić się do rzeczy zależnych od zawodnika — czyli
//      odciążenie atrybucyjne (spec 2.2, punkt 3) nie da się już wyłączyć;
//   3. `zbudujOdcinek` przyjmuje TRZY argumenty; czwarty (stan ograniczeń)
//      zniknął z podpisu, więc nikt nie przywróci odczytu po cichu.
{
  const odc: RoadSegment = { id: 's1', slug: 's1', label: 'Odcinek', age_from: 13, age_to: 15, sort_order: 1 };
  const f = (slug: string, ctrl: boolean, jutro: boolean): RoadFactor => ({
    id: slug, segment_id: 's1', slug, title: slug, body: slug,
    evidence_level: 'wysoka', evidence_number: null, source_ref: null,
    is_controllable: ctrl, is_tomorrow: jutro, variant: 'base', sort_order: 1,
  });
  const czynniki = [f('jutro', true, true), f('reka', true, false), f('tlo1', false, false), f('tlo2', false, false)];

  const widok = zbudujOdcinek(odc, 'base', czynniki);
  check('(T5) Mapa pokazuje tło ZAWSZE — odciążenia atrybucyjnego nie da się wyłączyć (spec 2.2 punkt 3)',
    widok.stan === 'gotowy' && widok.tlo.length === 2, JSON.stringify(widok));
  check('(T5) widok odcinka nie niesie już pól `tloUkryte` ani `liczbaSystemowa`',
    !('tloUkryte' in widok) && !('liczbaSystemowa' in widok), JSON.stringify(Object.keys(widok)));
  check('(T5) `zbudujOdcinek` ma DOKŁADNIE trzy parametry — czwarty (stan ograniczeń) zniknął z podpisu',
    zbudujOdcinek.length === 3, `arity: ${zbudujOdcinek.length}`);

  // ⚠️ NAJWAŻNIEJSZA Z TEJ TRÓJKI: klucz skasowany po stronie appki, ale wciąż
  // obecny w STARYM wierszu bazy (koperta sprzed 13.08.2026), nie może niczego
  // włączyć ani zgasić. Ląduje w `nieznaneKlucze` — jawnie, z nazwą.
  const staryWiersz = czytajOgraniczenia(koperta(['mapaTylkoWTwoichRekach', 'pokazacLiczbeSystemowa']));
  check('(T5) stara koperta z dwoma skasowanymi kluczami → NIC nie obowiązuje, a klucze są NAZWANE',
    staryWiersz.rodzaj === 'znane'
    && staryWiersz.aktywne.length === 0
    && staryWiersz.nieznaneKlucze.length === 2,
    JSON.stringify(staryWiersz));
  check('(T5) …i widok „Dziś" przy takiej kopercie jest PEŁNY, nie wyciszony',
    coPokazacNaDzis(staryWiersz).pokazacRekomendacje
    && coPokazacNaDzis(staryWiersz).pokazacPostepPracy,
    JSON.stringify(coPokazacNaDzis(staryWiersz)));
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
      'nie znalazłem gamechange-app/lib/arbiter-glosu.js. '
      + 'Ta warstwa NIE ZOSTAŁA SPRAWDZONA — drugą połowę reguły pilnuje strażnik w repozytorium backendu.',
      kandydaci);
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
