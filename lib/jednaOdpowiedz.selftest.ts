// PLAN-D-T 08.2026 (13.08.2026) — NOWY PLIK. STRAŻNIK ZADAŃ T1, T3, T7 i T8.
//
//   npx tsx lib/jednaOdpowiedz.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ═════════════════════════════════════════════════════════════════════
// ── CO TEN PLIK PILNUJE I DLACZEGO AKURAT TO ─────────────────────────
//
// Ekran „Dziś" był kolażem SZEŚCIU niezależnych producentów. Każdy z nich
// był poprawny z osobna — dlatego kolaż przeżył kilka rund i dwa audyty.
// Defekt nie polegał na złym kodzie, tylko na tym, że NIC NIE PILNOWAŁO
// LICZBY NADAWCÓW. Siódmy dołożony za pół roku wyglądałby dokładnie tak samo
// jak sześć poprzednich: jak porządna, przemyślana karta.
//
// ⚠️ DLATEGO TEN STRAŻNIK NIE SPRAWDZA DZISIEJSZEGO UKŁADU EKRANU.
// Sprawdza REGUŁY — cztery, dokładnie te z polecenia T8:
//
//   R1. Na „Dziś" nie ma elementu POZA jedną odpowiedzią i POZA rejestrem.
//       Lista elementów jest CZYTANA ZE ŹRÓDŁA `app/(tabs)/dzis.tsx`, nie
//       wpisana tutaj. Siódmy kafelek zapala ten blok, choć nikt go tu
//       nie dopisze.
//   R2. „Co to zmieni" nie da się wyrenderować BEZ ŹRÓDŁA.
//   R3. Odpowiedź to DOKŁADNIE JEDNA rzecz — nigdy lista.
//   R4. Porządek ekranu wynika ze stanu: element, który stan wycisza, nie
//       stoi wyżej niż karta mówiąca o wyciszeniu (T3).
//
//   Czwarta reguła z polecenia T8 — „rytm push wychodzi bez odczytania
//   `weekly_voice`" — siedzi po stronie backendu, bo tam siedzi cron:
//   `gamechange-app/tests/test-glos-a-rytmy.js`, reguła R2. Piąta —
//   „klucz koperty jest zawsze `false`" — w `test-ograniczenia-maja-konsumenta.js`
//   (kategoria `BEZ_PRZESLANKI`, po tej rundzie PUSTA).
//   ⚠️ Mówię o tym tutaj, zamiast zostawić wrażenie, że ten plik pilnuje
//   wszystkich czterech punktów T8.
//
// ⚠️ O53 (13.08.2026): NIE UŻYWAM `new URL(...)` DO CZYTANIA PLIKÓW.
// `tsconfig.json` appki ciągnie bibliotekę DOM i kontrola typów pada na
// TS2769 — kosztowało to jedną rundę 13.08. Wzorzec niżej jest jedyny
// dozwolony w tym repozytorium.
// ═════════════════════════════════════════════════════════════════════

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  zbudujJednaOdpowiedz,
  zbudujCoToZmieni,
  REJESTR_ELEMENTOW_DZIS,
  BRAK_PROPOZYCJI,
  BLOK_NOWA_PORCJA,
  ZAPROSZENIE_ZAPLANUJ_BLOK,
  DLACZEGO_OSLONA,
  NAGLOWEK_CO_ZROBIC,
  NAGLOWEK_DLACZEGO,
  NAGLOWEK_CO_ZMIENI,
  type WejscieOdpowiedzi,
} from './jednaOdpowiedz';
import { coPokazacNaDzis, czytajOgraniczenia, WERSJA_OGRANICZEN_ZNANA } from './ograniczenia';
import { buildHintState, najblizszaDoZrobienia, type ComponentHintRow, type HintState } from './componentHints';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

const libDir = dirname(fileURLToPath(import.meta.url));
const appRoot = dirname(libDir);
const SCIEZKA_DZIS = join(appRoot, 'app', '(tabs)', 'dzis.tsx');

/**
 * ⚠️ SUFIT LICZBY ELEMENTÓW EKRANU „DZIŚ".
 *
 * Zmierzone 14.08.2026 na źródle, przez policzenie BLOKÓW NAJWYŻSZEGO POZIOMU
 * wewnątrz `<ScrollView>`: **PRZED pasem T — 10, PO pasie T — 9.**
 * Do tego, czego ta liczba NIE WIDZI, a co też zniknęło: z kafelka wąskiego
 * gardła wyszły dwa wezwania do pracy („Nowa porcja…", „Zaplanuj Blok"),
 * podpowiedź dnia przestała być osobnym kafelkiem, a trzy stany R5
 * („nie ma tabeli" / „błąd" / „pusto") przestały rysować własny komunikat.
 *
 * ⛔ TA LICZBA MA MALEĆ, NIGDY ROSNĄĆ — ta sama zasada, którą pas T wykonał
 * na kluczach koperty (T5) i którą pas P zapisał przy `BEZ_PRZESLANKI`.
 * Podniesienie jej jest DECYZJĄ PRODUKTOWĄ i wymaga zdania w raporcie rundy,
 * a nie zmiany liczby w teście. Każdy element ponad ten sufit to kolejny
 * niezależny nadawca mówiący naraz z resztą — czyli powrót do kolażu.
 */
const SUFIT_ELEMENTOW_DZIS = 9;

console.log('jednaOdpowiedz.selftest.ts — strażnik kręgosłupa „Dziś" (T1, T3, T7, T8)\n');

// ─────────────────────────────────────────────────────────────────────
// Pomocniki budujące wejście. ⚠️ O46: wartości TYPOWE, nie skrajne.
// ─────────────────────────────────────────────────────────────────────
function koperta(aktywne: string[] = [], nieroz: string[] = []) {
  return { wersja: WERSJA_OGRANICZEN_ZNANA, aktywne, nieznane_ograniczenia: nieroz, nieznane: [] };
}
const PUSTE = czytajOgraniczenia(koperta());

function wiersz(over: Partial<ComponentHintRow> = {}): ComponentHintRow {
  return {
    klucz: 'moc-segment-01', segment_id: 'moc', component_id: null,
    obszar_name: 'Moc', element_name: 'Skok dosiężny',
    hint: 'Między sesjami zostaw minimum 48 godzin przerwy.',
    odbiorca: 'oba', min_age: null, rodzaj: 'zrobic',
    zrodlo: 'Moc — System Gamechange', strony: '4',
    dowody: 'materiał podaje jako regułę bezwzględną',
    pozycja: 1, active: true, ...over,
  };
}

function stanPodpowiedzi(rows: ComponentHintRow[] | null, day = 0): HintState {
  return buildHintState({ hasGoal: true, error: null, rows, age: 16, day });
}

function wejscie(over: Partial<WejscieOdpowiedzi> = {}): WejscieOdpowiedzi {
  return {
    widok: coPokazacNaDzis(PUSTE),
    laduje: false,
    maGardlo: true,
    etykietaGardla: 'Moc',
    maAktywnyBlok: false,
    nowaPorcjaCzeka: false,
    rekomendacja: { jest: false, powiazanaZGardlem: false },
    podpowiedz: stanPodpowiedzi(null),
    oslona: 'nie',
    ...over,
  };
}

// ═════════════════════════════════════════════════════════════════════
console.log('1. (T1/R3) DOKŁADNIE JEDNA RZECZ — nigdy lista');
// ═════════════════════════════════════════════════════════════════════
{
  const wszystkieWejscia: Array<[string, WejscieOdpowiedzi]> = [
    ['Blok z nową porcją + rekomendacja + podpowiedź', wejscie({
      maAktywnyBlok: true, nowaPorcjaCzeka: true,
      rekomendacja: { jest: true, powiazanaZGardlem: true },
      podpowiedz: stanPodpowiedzi([wiersz()]),
    })],
    ['rekomendacja + podpowiedź', wejscie({
      rekomendacja: { jest: true, powiazanaZGardlem: true },
      podpowiedz: stanPodpowiedzi([wiersz()]),
    })],
    ['sama podpowiedź', wejscie({ podpowiedz: stanPodpowiedzi([wiersz()]) })],
    ['nic', wejscie({ maGardlo: false })],
  ];
  for (const [opis, w] of wszystkieWejscia) {
    const o = zbudujJednaOdpowiedz(w);
    check(`(${opis}) odpowiedź ma DOKŁADNIE jedno źródło`,
      typeof o.coZrobic.zrodlo === 'string' && !Array.isArray(o.coZrobic as unknown),
      JSON.stringify(o.coZrobic));
  }

  check('(T1) pierwszeństwo 1: Blok z nową porcją wygrywa z rekomendacją i podpowiedzią',
    zbudujJednaOdpowiedz(wejscie({
      maAktywnyBlok: true, nowaPorcjaCzeka: true,
      rekomendacja: { jest: true, powiazanaZGardlem: true },
      podpowiedz: stanPodpowiedzi([wiersz()]),
    })).coZrobic.zrodlo === 'blok', '');

  check('(T1) pierwszeństwo 2: rekomendacja wygrywa z podpowiedzią',
    zbudujJednaOdpowiedz(wejscie({
      rekomendacja: { jest: true, powiazanaZGardlem: true },
      podpowiedz: stanPodpowiedzi([wiersz()]),
    })).coZrobic.zrodlo === 'rekomendacja', '');

  check('(T1) pierwszeństwo 3: podpowiedź, gdy nie ma nic wyżej',
    zbudujJednaOdpowiedz(wejscie({ podpowiedz: stanPodpowiedzi([wiersz()]) })).coZrobic.zrodlo === 'podpowiedz', '');

  // ⚠️ TO JEST DECYZJA, KTÓRĄ WARTO ZNAĆ, I DLATEGO MA WŁASNĄ ASERCJĘ.
  // „Aktywny Blok" znaczy „Blok, który ma coś NA DZIŚ", a nie „Blok istnieje".
  // Gdyby samo istnienie Bloku wygrywało, zawodnik z Blokiem NIGDY nie
  // zobaczyłby rekomendacji ani jej przycisków — czyli jedynej akcji
  // decyzyjnej na tym ekranie.
  check('(T1) Blok BEZ nowej porcji NIE zabiera pierwszeństwa rekomendacji',
    zbudujJednaOdpowiedz(wejscie({
      maAktywnyBlok: true, nowaPorcjaCzeka: false,
      rekomendacja: { jest: true, powiazanaZGardlem: true },
    })).coZrobic.zrodlo === 'rekomendacja', '');

  check('(T1) brak wszystkiego → zaproszenie do zaplanowania Bloku (też JEDNA rzecz)',
    zbudujJednaOdpowiedz(wejscie()).coZrobic.tekst === ZAPROSZENIE_ZAPLANUJ_BLOK, '');

  const brak = zbudujJednaOdpowiedz(wejscie({ maGardlo: false }));
  check('(T1) gdy nie ma czego zaproponować — MÓWIMY TO WPROST, nie zostawiamy pustki',
    brak.coZrobic.zrodlo === 'brak' && brak.coZrobic.tekst === BRAK_PROPOZYCJI && brak.pokazac, '');
  check('…i to zdanie nie przeprasza ani nie obiecuje terminu',
    !/przepraszam|wkrótce|niedługo|pracujemy/i.test(BRAK_PROPOZYCJI), BRAK_PROPOZYCJI);

  check('(T1) przy źródle `rekomendacja` tekst jest `null` — treść niesie RecommendationCard',
    zbudujJednaOdpowiedz(wejscie({ rekomendacja: { jest: true, powiazanaZGardlem: true } })).coZrobic.tekst === null, '');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n2. (T8/R2) „CO TO ZMIENI" NIE ISTNIEJE BEZ ŹRÓDŁA');
// ═════════════════════════════════════════════════════════════════════
// ⚠️ NAJWAŻNIEJSZY BLOK TEGO PLIKU. Zasada twarda Z0: nie podajemy
// prawdopodobnego jako pewnego. Zdanie ogólne w tym miejscu („to pomoże Ci się
// rozwijać") byłoby propozycją podaną jako fakt — bez źródła i bez siły dowodu.
{
  check('dowód BEZ źródła → `co to zmieni` NIE powstaje',
    zbudujCoToZmieni({ hint: wiersz({ dowody: 'silne' }), source: null }) === null, '');
  check('źródło BEZ dowodu → `co to zmieni` NIE powstaje',
    zbudujCoToZmieni({ hint: wiersz({ dowody: null }), source: 'Moc, s. 4' }) === null, '');
  check('puste napisy (same spacje) też NIE wystarczają',
    zbudujCoToZmieni({ hint: wiersz({ dowody: '   ' }), source: '  ' }) === null, '');
  check('brak podpowiedzi → `null`, nie wyjątek',
    zbudujCoToZmieni(null) === null, '');

  const z = zbudujCoToZmieni({ hint: wiersz(), source: 'Moc — System Gamechange, s. 4' });
  check('dowód I źródło razem → część powstaje, z jednym i drugim',
    z !== null && z.tekst.length > 0 && z.zrodlo.length > 0, JSON.stringify(z));

  // Przemiatanie po WSZYSTKICH wejściach: nie ma ścieżki, którą `coToZmieni`
  // powstaje bez źródła. To jest asercja na regułę, nie na przykład.
  const bezZrodla = [wiersz({ zrodlo: null, strony: null })];
  const kombinacje: WejscieOdpowiedzi[] = [
    wejscie({ podpowiedz: stanPodpowiedzi(bezZrodla) }),
    wejscie({ rekomendacja: { jest: true, powiazanaZGardlem: true }, podpowiedz: stanPodpowiedzi(bezZrodla) }),
    wejscie({ maAktywnyBlok: true, nowaPorcjaCzeka: true, podpowiedz: stanPodpowiedzi(bezZrodla) }),
    wejscie({ podpowiedz: stanPodpowiedzi([wiersz({ dowody: null })]) }),
    wejscie({ podpowiedz: stanPodpowiedzi(null) }),
    wejscie({ podpowiedz: stanPodpowiedzi([]) }),
  ];
  const zle = kombinacje
    .map(zbudujJednaOdpowiedz)
    .filter((o) => o.coToZmieni !== null && (!o.coToZmieni.zrodlo || o.coToZmieni.zrodlo.trim().length === 0));
  check('ŻADNE wejście nie produkuje „co to zmieni" bez źródła',
    zle.length === 0, JSON.stringify(zle));

  const puste = kombinacje.map(zbudujJednaOdpowiedz).filter((o) => o.coToZmieni === null).length;
  check('…a większość wejść ma tę część PUSTĄ i tak ma być (zmierzone: dowody w 21 z 297 wierszy)',
    puste >= 4, `pustych: ${puste} z ${kombinacje.length}`);

  check('Blok NIE dokłada sobie dowodu, którego nie ma',
    zbudujJednaOdpowiedz(wejscie({ maAktywnyBlok: true, nowaPorcjaCzeka: true })).coToZmieni === null, '');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n3. (T1) DLACZEGO AKURAT TO — jedno zdanie albo NIC');
// ═════════════════════════════════════════════════════════════════════
{
  const zGardlem = zbudujJednaOdpowiedz(wejscie({ rekomendacja: { jest: true, powiazanaZGardlem: true } }));
  check('rekomendacja powiązana z wąskim gardłem → uzasadnienie z nazwy gardła',
    zGardlem.dlaczego === 'Pomaga Ci przy: Moc', String(zGardlem.dlaczego));

  const bezPowiazania = zbudujJednaOdpowiedz(wejscie({ rekomendacja: { jest: true, powiazanaZGardlem: false } }));
  check('rekomendacja NIEpowiązana → `null`, a nie zmyślone zdanie',
    bezPowiazania.dlaczego === null, String(bezPowiazania.dlaczego));

  const zOslona = zbudujJednaOdpowiedz(wejscie({
    oslona: 'tak', rekomendacja: { jest: true, powiazanaZGardlem: true },
  }));
  check('⚠️ Osłona ma PIERWSZEŃSTWO w uzasadnieniu — stan bije wąskie gardło',
    zOslona.dlaczego === DLACZEGO_OSLONA, String(zOslona.dlaczego));
  check('…a to zdanie NIE zawiera ani jednej liczby o dojrzewaniu (zakaz bezwzględny)',
    !/[0-9]|dojrzał|phv|wiek biologiczn/i.test(DLACZEGO_OSLONA), DLACZEGO_OSLONA);

  check('`nie_wiem` o Osłonie NIE produkuje zdania o Osłonie (Z0)',
    zbudujJednaOdpowiedz(wejscie({
      oslona: 'nie_wiem', rekomendacja: { jest: true, powiazanaZGardlem: true },
    })).dlaczego === 'Pomaga Ci przy: Moc', '');

  const zPodpowiedzi = zbudujJednaOdpowiedz(wejscie({ podpowiedz: stanPodpowiedzi([wiersz()]) }));
  check('podpowiedź → uzasadnienie z nazwy Elementu Z BAZY, nie z naszego zdania',
    zPodpowiedzi.dlaczego === 'Pomaga Ci przy: Skok dosiężny', String(zPodpowiedzi.dlaczego));
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n4. (T3) PORZĄDEK EKRANU WYNIKA ZE STANU — pięć stanów');
// ═════════════════════════════════════════════════════════════════════
{
  const stany: Array<[string, ReturnType<typeof coPokazacNaDzis>]> = [
    ['normalny', coPokazacNaDzis(PUSTE)],
    ['Osłona', coPokazacNaDzis(czytajOgraniczenia(koperta(['blokNieZwiekszaObjetosci'])))],
    ['kontuzja', coPokazacNaDzis(czytajOgraniczenia(koperta(['systemMilczyOCelach'])))],
    ['ścieżka wyjścia', coPokazacNaDzis(czytajOgraniczenia(koperta(['wszystkoMilczy'])))],
    ['cisza / brak odczytu', coPokazacNaDzis(czytajOgraniczenia(null, 'timeout'))],
  ];
  for (const [opis, widok] of stany) {
    const pelne = zbudujJednaOdpowiedz(wejscie({
      widok, maAktywnyBlok: true, nowaPorcjaCzeka: true,
      rekomendacja: { jest: true, powiazanaZGardlem: true },
      podpowiedz: stanPodpowiedzi([wiersz()]),
    }));
    const maWyciszac = !widok.pokazacRekomendacje;
    check(`stan „${opis}" → odpowiedź ${maWyciszac ? 'NIE JEST' : 'jest'} rysowana`,
      pelne.pokazac === !maWyciszac, `${pelne.pokazac} / ${pelne.powod}`);
  }

  check('kontuzja → odpowiedź NIE jest zastępowana innym komunikatem (cisza to decyzja, nie brak)',
    zbudujJednaOdpowiedz(wejscie({
      widok: coPokazacNaDzis(czytajOgraniczenia(koperta(['systemMilczyOCelach']))),
      rekomendacja: { jest: true, powiazanaZGardlem: true },
    })).coZrobic.tekst === null, '');

  check('Osłona NIE wycisza odpowiedzi — zmienia jej uzasadnienie',
    zbudujJednaOdpowiedz(wejscie({
      widok: coPokazacNaDzis(czytajOgraniczenia(koperta(['blokNieZwiekszaObjetosci']))),
      oslona: 'tak', rekomendacja: { jest: true, powiazanaZGardlem: true },
    })).pokazac, '');

  check('ładowanie → NIE udajemy, że czegoś nie ma',
    !zbudujJednaOdpowiedz(wejscie({ laduje: true })).pokazac, '');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n5. (T7) KARTA „WARTO WIEDZIEĆ" ZOSTAWIA COŚ DO ZROBIENIA');
// ═════════════════════════════════════════════════════════════════════
// Zmierzone na żywej bazie 14.08.2026: 114 `zrozumiec` / 183 `zrobic` / 297.
// ⚠️ Sprostowanie z polecenia: większość treści `zrozumiec` ZAWIERA polecenie.
// Problemem był szablon karty („Warto wiedzieć"), nie treść — dlatego NIE
// przepisujemy 114 treści, tylko zmieniamy miejsce, w którym stoją.
{
  const tylkoZrozumiec = [
    wiersz({ klucz: 'a', rodzaj: 'zrozumiec', hint: 'Wydech musi być dłuższy niż wdech.' }),
    wiersz({ klucz: 'b', rodzaj: 'zrozumiec', hint: 'Cel to jasnosłomkowy kolor moczu.' }),
  ];
  const mieszane = [
    wiersz({ klucz: 'a', rodzaj: 'zrozumiec', hint: 'Wydech musi być dłuższy niż wdech.', pozycja: 1 }),
    wiersz({ klucz: 'b', rodzaj: 'zrobic', hint: 'Zrób dziś 10 wydechów po 6 sekund.', pozycja: 2 }),
  ];

  const stanMieszany = stanPodpowiedzi(mieszane, 0);
  check('(T7) w puli JEST podpowiedź „zrobic" → to ONA trafia do „co dziś zrobić"',
    stanMieszany.state === 'ready' && stanMieszany.doZrobienia?.hint.rodzaj === 'zrobic',
    JSON.stringify(stanMieszany.state === 'ready' ? stanMieszany.doZrobienia?.hint.klucz : null));

  const odpMieszana = zbudujJednaOdpowiedz(wejscie({ podpowiedz: stanMieszany }));
  check('…i odpowiedź niesie jej treść, nie treść „zrozumiec"',
    odpMieszana.coZrobic.tekst === 'Zrób dziś 10 wydechów po 6 sekund.', String(odpMieszana.coZrobic.tekst));

  const stanTylkoWiedza = stanPodpowiedzi(tylkoZrozumiec, 0);
  check('(T7) w puli NIE MA „zrobic" → `doZrobienia` jest jawnie `null`, nie zmyślone',
    stanTylkoWiedza.state === 'ready' && stanTylkoWiedza.doZrobienia === null, '');

  const odpWiedza = zbudujJednaOdpowiedz(wejscie({ podpowiedz: stanTylkoWiedza }));
  check('…a odpowiedź MIMO TO niesie treść — bo ta treść zawiera polecenie (sprostowanie T7)',
    odpWiedza.coZrobic.tekst === 'Wydech musi być dłuższy niż wdech.', String(odpWiedza.coZrobic.tekst));
  check('…i mówi w logu WPROST, że wzięła wylosowaną z braku „zrobic"',
    odpWiedza.powod.includes('BRAK w puli'), odpWiedza.powod);

  check('(T7) `najblizszaDoZrobienia` na pustej puli → `null`, nie wyjątek',
    najblizszaDoZrobienia([], 0) === null, '');
  check('(T7) …a gdy wylosowana JEST „zrobic", zwraca ją samą — zero drugiej linii bez powodu',
    najblizszaDoZrobienia([wiersz({ rodzaj: 'zrobic' })], 0)?.hint.rodzaj === 'zrobic', '');

  // ⚠️ Wynik jest funkcją dnia i listy, więc W OBRĘBIE DNIA jest STAŁY —
  // odświeżenie ekranu nie podmienia tekstu pod palcem.
  const a = najblizszaDoZrobienia(mieszane, 5)?.hint.klucz;
  const b = najblizszaDoZrobienia(mieszane, 5)?.hint.klucz;
  check('(T7) wynik jest stały w obrębie dnia (RefreshControl nie podmienia tekstu)',
    a === b && a !== undefined, `${a} / ${b}`);

  // ⛔ Nagłówek „Warto wiedzieć" NIE MOŻE wrócić nad podpowiedź dnia — to on
  // był defektem M4, nie treść pod nim.
  const zrodloDzis = readFileSync(SCIEZKA_DZIS, 'utf8');
  const bezKomentarzy = zrodloDzis.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');
  check('(T7) w jednej odpowiedzi nie ma nagłówka `hintKindLabel` — „Warto wiedzieć" zostało tylko przy treści bezpieczeństwa',
    (bezKomentarzy.match(/hintKindLabel\(/g) || []).length === 1,
    `wystąpień hintKindLabel: ${(bezKomentarzy.match(/hintKindLabel\(/g) || []).length}`);
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n6. (T8/R1) NA „DZIŚ" NIE MA ELEMENTU POZA REJESTREM');
// ═════════════════════════════════════════════════════════════════════
// ⚠️ ASERCJA NA REGUŁĘ. Lista elementów jest CZYTANA ZE ŹRÓDŁA — blok
// najwyższego poziomu wewnątrz `<ScrollView>` to jeden element ekranu.
// Siódmy kafelek dołożony za rok tworzy nowy blok bez znanego znacznika
// i zapala ten test, choć nikt go nigdzie nie dopisze.
{
  check('(strażnik strażnika) źródło `app/(tabs)/dzis.tsx` jest czytelne',
    existsSync(SCIEZKA_DZIS), SCIEZKA_DZIS);

  const zrodlo = readFileSync(SCIEZKA_DZIS, 'utf8');
  const odScrollView = zrodlo.indexOf('<ScrollView');
  const doScrollView = zrodlo.indexOf('</ScrollView>');
  check('(strażnik strażnika) umiem znaleźć ciało `<ScrollView>`',
    odScrollView > 0 && doScrollView > odScrollView,
    `${odScrollView} / ${doScrollView} — jeśli -1, ten blok niczego nie pilnuje`);

  // ⭐ PAS W1 18.08.2026 — „CIAŁO EKRANU” TO OD DZIŚ DWIE RZECZY.
  // JEDNYM ZDANIEM: obie gałęzie przełącznika („Dziś” i „Tydzień”) są od
  // pasa W1 WYWOŁANIAMI PO NAZWIE — bez tego miara wysokości nie umie
  // NAZWAĆ gałęzi, której nie opisuje, i gałąź „Dziś” wypadałaby z raportu
  // bez śladu (O97). Ciało `ScrollView` samo w sobie zawiera więc już tylko
  // nagłówek, przełącznik i dwa wywołania — a treść ekranu siedzi w ciele
  // `renderDzisNaEkranie()`. ⛔ To NIE JEST osłabienie asercji: arkusz
  // (`trescArkusza`) nadal NIE należy do żadnej z tych funkcji, więc każda
  // reguła „to ma / nie ma stać na ekranie” działa tak samo jak dotąd.
  const cialoGalezi = (nazwa: string): string => {
    const od = zrodlo.indexOf(`function ${nazwa}(`);
    if (od < 0) return '';
    const start = zrodlo.indexOf('{', od);
    let g = 0;
    for (let i = start; i < zrodlo.length; i++) {
      if (zrodlo[i] === '{') g++;
      else if (zrodlo[i] === '}') { g--; if (g === 0) return zrodlo.slice(start, i + 1); }
    }
    return '';
  };
  const cialoScroll = zrodlo.slice(odScrollView, doScrollView);
  const cialoDzis = cialoGalezi('renderDzisNaEkranie');
  const cialoTydzien = cialoGalezi('renderTydzienNaKarcie');
  const cialo = (cialoScroll + cialoDzis + cialoTydzien
    + cialoGalezi('renderWierszDnia')
    + cialoGalezi('renderTrzyFakty')
    + cialoGalezi('renderKafel')).replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  /** Numery linii, od których zaczyna się blok JSX na zadanym wcięciu. */
  const poczatkiNa = (linie: string[], od: number, doExcl: number, wciecie: number): number[] => {
    const w = ' '.repeat(wciecie);
    const out: number[] = [];
    for (let i = od; i < doExcl; i++) {
      const l = linie[i];
      if (!l.startsWith(`${w}<`) && !l.startsWith(`${w}{`)) continue;
      if (l[wciecie] === ' ') continue;
      if (l.startsWith(`${w}</`) || l.startsWith(`${w})}`)) continue;
      out.push(i);
    }
    return out;
  };
  const wytnij = (linie: string[], poczatki: number[], koniec: number): string[] =>
    poczatki.map((i, j) => linie.slice(i, j + 1 < poczatki.length ? poczatki[j + 1] : koniec).join('\n'));

  // ═════════════════════════════════════════════════════════════════
  // ⭐ PRZEPISANE 18.08.2026 (PAS W1) — WYCINANIE PO GAŁĘZIACH, NIE PO
  //    JEDNYM CIELE.
  //
  // JEDNYM ZDANIEM: obie gałęzie ekranu są od pasa W1 WYWOŁANIAMI PO NAZWIE
  // (`renderDzisNaEkranie()` i `renderTydzienNaKarcie()`), bo bez tego miara
  // wysokości nie umie nazwać gałęzi, której nie opisuje (O97) — więc bloki
  // trzeba wycinać z CIAŁ TYCH FUNKCJI, a nie z ciała `ScrollView`.
  //
  // ⛔ REGUŁA NIE ZOSTAŁA OSŁABIONA, ZOSTAŁA ZAOSTRZONA. Do 18.08 sufit
  // dziewięciu elementów liczył OBIE gałęzie razem, więc przełożenie rzeczy
  // z „Dziś" na „Tydzień" nie zmieniało nic. Od dziś sufit obowiązuje KAŻDĄ
  // gałąź OSOBNO: ekran, który zawodnik naprawdę widzi naraz, to jedna gałąź.
  // ═════════════════════════════════════════════════════════════════
  const blokiGalezi = (cialoGalezi_: string, wciecie: number): string[] => {
    const l = cialoGalezi_.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').split('\n');
    return wytnij(l, poczatkiNa(l, 0, l.length, wciecie), l.length);
  };
  const blokiDzis = blokiGalezi(cialoDzis, 12);
  const blokiTydzien = blokiGalezi(cialoTydzien, 8);
  const linieScroll = cialoScroll.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').split('\n');
  const poczatkiScroll = poczatkiNa(linieScroll, 0, linieScroll.length, 8);
  const blokiScroll = wytnij(linieScroll, poczatkiScroll, linieScroll.length)
    .filter((b) => !/^ {8}\{[^\n]*\?\s*\($/.test(b.split('\n')[0]));
  const otwartychGalezi = poczatkiScroll.length - blokiScroll.length;
  const bloki = [...blokiScroll, ...blokiDzis, ...blokiTydzien];

  check('(strażnik strażnika) umiem wyciąć bloki najwyższego poziomu',
    blokiDzis.length >= 5 && blokiTydzien.length >= 3 && blokiScroll.length >= 2,
    `Dziś ${blokiDzis.length} · Tydzień ${blokiTydzien.length} · ScrollView ${blokiScroll.length} `
    + '— jeśli któraś jest 0, reguła niżej niczego nie pilnuje');

  // ⛔ ZAPADKA NA RÓWNOŚĆ — ILE STANÓW MA TEN EKRAN.
  // Ustawiona 18.08.2026 na JEDEN (`Dziś / Tydzień`). Drugi przełącznik stanu
  // znaczy, że ekran zaczął mieć cztery twarze — i wtedy „dziewięć rzeczy nad
  // zgięciem" przestaje być prawdą o tym, co widzi zawodnik.
  const PRZELACZNIKOW_STANU_18_08_2026 = 1;
  check(`(strażnik strażnika) ekran ma DOKŁADNIE ${PRZELACZNIKOW_STANU_18_08_2026} przełącznik stanu`,
    otwartychGalezi === PRZELACZNIKOW_STANU_18_08_2026,
    `otwartych gałęzi: ${otwartychGalezi} — każdy kolejny przełącznik mnoży liczbę ekranów, `
    + 'które trzeba zmierzyć osobno, a rejestr opisuje je jako jeden');

  const znaczniki = REJESTR_ELEMENTOW_DZIS.map((e) => e.znacznik);
  const nierozpoznane = bloki.filter((b) => !znaczniki.some((z) => b.includes(z)));
  check('(T8) KAŻDY element ekranu „Dziś" ma wpis w REJESTR_ELEMENTOW_DZIS',
    nierozpoznane.length === 0,
    `element bez wpisu (pierwsza linia): ${nierozpoznane.map((b) => b.split('\n')[0].trim().slice(0, 80)).join(' | ')}`);

  check(`(T8) liczba elementów KAŻDEJ gałęzi nie przekracza sufitu ${SUFIT_ELEMENTOW_DZIS} — ta liczba ma MALEĆ, nigdy rosnąć`,
    blokiScroll.length + blokiDzis.length <= SUFIT_ELEMENTOW_DZIS
    && blokiScroll.length + blokiTydzien.length <= SUFIT_ELEMENTOW_DZIS,
    `gałąź „Dziś": ${blokiScroll.length + blokiDzis.length} · gałąź „Tydzień": `
    + `${blokiScroll.length + blokiTydzien.length}`);

  // Odwrotna strona tej samej reguły: rejestr nie opisuje rzeczy, których
  // na ekranie już nie ma. Bez tego lista rosłaby o martwe wpisy.
  const martwe = REJESTR_ELEMENTOW_DZIS.filter((e) => !zrodlo.includes(e.znacznik));
  check('(T8) rejestr nie opisuje elementów, których w pliku nie ma',
    martwe.length === 0, `martwe wpisy: ${martwe.map((e) => e.znacznik).join(', ')}`);

  const bezOpisu = REJESTR_ELEMENTOW_DZIS.filter((e) => e.coTo.length < 20);
  check('(T8) każdy wpis rejestru MÓWI, czym jest — nie samą nazwą stylu',
    bezOpisu.length === 0, bezOpisu.map((e) => e.znacznik).join(', '));

  // ⚠️ JEDNA ODPOWIEDŹ MA BYĆ JEDNYM BLOKIEM, NIE TRZEMA. Gdyby trzy części
  // rozjechały się na trzy bloki najwyższego poziomu, wróciłby kolaż — tylko
  // pod nową nazwą.
  const wJednej = REJESTR_ELEMENTOW_DZIS.filter((e) => e.wJednejOdpowiedzi).map((e) => e.znacznik);
  const blokiZOdpowiedzia = bloki.filter((b) => wJednej.some((z) => b.includes(z)));
  check('(T8) jedna odpowiedź jest JEDNYM blokiem ekranu, nie trzema',
    blokiZOdpowiedzia.length === 1, `bloków niosących części odpowiedzi: ${blokiZOdpowiedzia.length}`);

  // ═════════════════════════════════════════════════════════════════
  // ⭐ (T3) PRZEPISANE 18.08.2026 (PAS S1) — TRZY NAGROBKI I JEDNA
  //          PRZEPROWADZKA. ⛔ ANI JEDNA ASERCJA NIE ZOSTAŁA SKASOWANA.
  // ═════════════════════════════════════════════════════════════════
  // Do 18.08.2026 te trzy asercje pilnowały KOLEJNOŚCI trzech kart na „Dziś":
  // kafelek wąskiego gardła → głos tygodnia → punkt pomocy → jedna odpowiedź.
  // Dwie z tych kart ZDJĘTO DECYZJĄ, jedną WCHŁONIĘTO. Kolejność, której już
  // nie ma, nie da się pilnować — ale to, ŻE TYCH RZECZY TAM NIE MA, pilnować
  // się da i od dziś jest pilnowane. Zapadka odwrócona: z „stoi w tym miejscu"
  // na „nie ma go tu i nie ma prawa wrócić bez decyzji".
  const iOdpowiedz = cialo.indexOf('styles.odpowiedzCard');

  // ⭐ 1. GŁOS TYGODNIA — WCHŁONIĘTY, nie usunięty (przeprowadzka).
  // ⛔ Zdania są te same CO DO ZNAKU (`glos.tytul`, `glos.tresc`) i rysują się
  // WEWNĄTRZ karty jednej odpowiedzi, bo to ten sam gatunek zdania, a makieta
  // v3 ma tu JEDEN blok, nie dwa. Asercja żąda obu rzeczy naraz: żeby głos
  // nadal padał i żeby nie odzyskał własnej karty.
  const kartaOdpowiedzi = (() => {
    if (iOdpowiedz < 0) return null;
    const koniec = cialo.indexOf('styles.sectionLabel', iOdpowiedz);
    return koniec < 0 ? cialo.slice(iOdpowiedz) : cialo.slice(iOdpowiedz, koniec);
  })();
  // ⭐ PRZECELOWANE 18.08.2026 (PAS W1, defekt D-1 + decyzja D-B Kuby).
  // JEDNYM ZDANIEM: karta „co dziś zrobić" pokazuje od dziś DWA ZDANIA
  // (co zrobić · dlaczego akurat to), a cały materiał — w tym PEŁNĄ treść
  // głosu tygodnia — otwiera się dotknięciem, w arkuszu, za 0 dp. Dlatego
  // `glos.tresc` nie stoi już w ciele `ScrollView`.
  // ⛔ ASERCJA NIE ZOSTAŁA OSŁABIONA — żąda teraz TRZECH rzeczy zamiast dwóch:
  //   1. `glos.tytul` NADAL PADA NA EKRANIE (trzeci fakt „Z Twoich wpisów"),
  //      czyli głos się nie schował w całości za dotknięciem;
  //   2. `glos.tresc` istnieje W PLIKU, czyli pełna treść nie wyparowała
  //      przy okazji skracania karty (B3);
  //   3. `styles.glosCard` nadal NIE ISTNIEJE — głos nie odzyskał własnej karty.
  check('(T3) ⭐ głos tygodnia: tytuł NA EKRANIE, treść w arkuszu, ⛔ własnej karty brak',
    kartaOdpowiedzi !== null
    && /glos\.tytul/.test(kartaOdpowiedzi)
    && /glos\.tresc/.test(zrodlo)
    && !cialo.includes('styles.glosCard'),
    kartaOdpowiedzi === null
      ? 'nie znajduję karty jednej odpowiedzi — nie da się powiedzieć, gdzie stoi głos'
      : `tytuł na ekranie: ${/glos\.tytul/.test(kartaOdpowiedzi)} · treść w pliku: `
        + `${/glos\.tresc/.test(zrodlo)} · własna karta wróciła: `
        + `${cialo.includes('styles.glosCard')} — głos tygodnia albo zniknął z ekranu, `
        + 'albo zgubił treść, albo odzyskał osobny blok, czyli wrócił kolaż pod nową nazwą');

  // ⛔ 2. PUNKT POMOCY — ZDJĘTY DECYZJĄ KUBY 17.08.2026. CYTAT:
  //    „najważniejsza jest prostota. Nie chcę, żebyś nawrzucał mi tam rzeczy
  //     takich jak jakaś linia telefoniczna pomocy. Czyste «mięcho» sportowe."
  // Ścieżka kryzysowa żyje z tyłu, uruchamiana danymi; jedyne wejście z ekranu
  // stoi w „Profilu". ⛔ Ta asercja jest ZAPADKĄ NA POWRÓT, nie nagrobkiem
  // biernym: dołożenie punktu pomocy do „Dziś" zapala ją z nazwą decyzji.
  check('(T3) ⛔ punktu pomocy NIE MA na „Dziś" — decyzja Kuby z 17.08.2026',
    !cialo.includes('styles.pomocCard') && !/POMOC_PRZYCISK/.test(cialo),
    'na „Dziś" wróciła linia pomocy. Decyzja Kuby 17.08.2026: „najważniejsza jest prostota. '
    + 'Nie chcę, żebyś nawrzucał mi tam rzeczy takich jak jakaś linia telefoniczna pomocy. '
    + 'Czyste «mięcho» sportowe." Wejście do punktu pomocy stoi w „Profilu" i tam ma zostać.');

  // ⛔ 3. KAFELEK WĄSKIEGO GARDŁA — ZDJĘTY 18.08.2026 (pas A1).
  // Decyzja Kuby z 06.08.2026 mówiła „kafelek zostaje pierwszy" i obowiązywała,
  // dopóki kafelek był na ekranie. Zastąpiła ją makieta v3 (PAS MK5): „Dziś"
  // odpowiada na „co dziś zrobić", nie „nad czym pracujesz", i NIE MA na tym
  // ekranie żadnego kafla celu. Wąskie gardło stoi dziś na „Profilu".
  check('(T3) ⛔ kafla celu NIE MA na „Dziś" — makieta v3 (18.08.2026), wąskie gardło stoi na „Profilu"',
    !cialo.includes('styles.heroGoal'),
    'na „Dziś" wrócił kafelek wąskiego gardła (190 dp). Makieta v3 nie ma go na tym ekranie; '
    + 'jeżeli to jest świadoma zmiana, zmień makietę i tę asercję razem, a nie samą asercję.');

  // ── (T1) DWA WEZWANIA DO PRACY MAJĄ BYĆ W JEDNEJ ODPOWIEDZI ───────
  // ⭐ PRZECELOWANE 18.08.2026 (pas S1). Do 18.08 pytaliśmy, czy wyszły
  // z kafelka wąskiego gardła. Kafelka nie ma, więc pytanie „czy ich tam nie
  // ma" przechodziło na PUSTYM tekście — czyli nie znaczyło nic (dosłownie:
  // `cialo.slice(-1, …)` oddawało pustkę). Od dziś pytamy o to samo od drugiej
  // strony i MOCNIEJ: oba wezwania mają w `dzis.tsx` NIE PADAĆ WCALE, bo ekran
  // bierze je z `zbudujJednaOdpowiedz()`, a nie wypisuje sam.
  check('(T1) „Nowa porcja w Twoim Bloku" NIE JEST wpisana na ekranie — przychodzi z jednej odpowiedzi',
    !cialo.includes(BLOK_NOWA_PORCJA),
    'ekran wypisuje wezwanie do pracy sam, obok jednej odpowiedzi — czyli ma drugie źródło tego, '
    + 'co zawodnik ma dziś zrobić');
  check('(T1) …i tak samo „Zaplanuj Blok"',
    !cialo.includes(ZAPROSZENIE_ZAPLANUJ_BLOK),
    'ekran wypisuje wezwanie do pracy sam, obok jednej odpowiedzi');
  check('(T1) ⭐ …a oba brzmienia NAPRAWDĘ istnieją w `lib/` i wychodzą przez jedną odpowiedź',
    BLOK_NOWA_PORCJA.length > 0 && ZAPROSZENIE_ZAPLANUJ_BLOK.length > 0,
    `${BLOK_NOWA_PORCJA} / ${ZAPROSZENIE_ZAPLANUJ_BLOK} — puste brzmienie sprawiłoby, `
    + 'że dwie asercje wyżej przechodzą, nie sprawdzając niczego');

  // ── Trzy nagłówki jednej odpowiedzi naprawdę są na ekranie ────────
  // ⚠️ Sprawdzamy STAŁE, nie napisy: brzmienie należy do Kuby i może się
  // zmienić, a struktura „trzy części" ma zostać. Test na literał zapalałby
  // się przy poprawce brzmienia, czyli pilnowałby nie tego, co trzeba.
  // ⭐ PRZECELOWANE 18.08.2026 (PAS W1, defekt D-1 + decyzja D-B Kuby).
  // JEDNYM ZDANIEM: zmierzone `lib/wysokoscEkranu.ts` — karta „co dziś zrobić"
  // niosła 547 dp z 806,5, czyli 68% ekranu, i Kuba nazwał ją „ścianą tekstu";
  // od dziś na ekranie stoi nagłówek karty i dwa zdania, a NAZWANE części
  // „dlaczego akurat to" i „co to zmieni" stoją w arkuszu „cały materiał".
  // ⛔ TRZY CZĘŚCI NADAL MUSZĄ BYĆ RYSOWANE — zmienia się tylko to, że dwie
  // z nich są o jedno dotknięcie dalej i kosztują 0 dp. Sprawdzamy je
  // W PLIKU EKRANU, a nie w ciele `ScrollView`.
  check('(T1) jedna odpowiedź renderuje część NAGLOWEK_CO_ZROBIC — NA EKRANIE',
    cialo.includes('{NAGLOWEK_CO_ZROBIC}'), 'brak {NAGLOWEK_CO_ZROBIC} w ciele ScrollView');
  for (const stala of ['NAGLOWEK_DLACZEGO', 'NAGLOWEK_CO_ZMIENI']) {
    check(`(T1) jedna odpowiedź renderuje część `.concat(stala).concat(' — w arkuszu „cały materiał"'),
      zrodlo.includes(`{${stala}}`), `brak {${stala}} w całym pliku ekranu`);
  }
  // ⛔ ZAPADKA NA POWRÓT ŚCIANY TEKSTU: pełna pozycja kolejki (z rozwiniętym
  // „skąd to wiemy", 215 dp) ma stać W ARKUSZU, a nie w ciele `ScrollView`.
  check('(T1, W1) ⛔ pełna `<PozycjaKolejkiCard>` NIE stoi w ciele `ScrollView` — '
    + 'inaczej wraca 215 dp ściany tekstu',
    !cialo.includes('<PozycjaKolejkiCard') && zrodlo.includes('<PozycjaKolejkiCard'),
    'pozycja kolejki wróciła na ekran albo zniknęła z pliku w całości');
  check('(T1) …a same brzmienia stoją w lib/, nie w JSX (dają się sprawdzić bez appki)',
    NAGLOWEK_CO_ZROBIC.length > 0 && NAGLOWEK_DLACZEGO.length > 0 && NAGLOWEK_CO_ZMIENI.length > 0,
    `${NAGLOWEK_CO_ZROBIC} / ${NAGLOWEK_DLACZEGO} / ${NAGLOWEK_CO_ZMIENI}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
