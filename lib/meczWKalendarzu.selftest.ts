// PLAN-D-A7 08.2026 (14.08.2026) — NOWY PLIK.
//
//   npx tsx lib/meczWKalendarzu.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ── CZEGO PILNUJE ─────────────────────────────────────────────────────
// Pięciu rzeczy, każda z nich zapala się na innym defekcie. Numeracja jest ta
// sama, co w poleceniu A7 (zadanie A7.4), żeby dało się je zestawić jeden do
// jednego:
//
//   (A7-1) rodzaj jest ZAPISYWANY, a nie RENDEROWANY;
//   (A7-2) `source` nie jest POBIERANY w zapytaniu ekranu, który go POKAZUJE;
//   (A7-3) rodzaj spoza pięciu dopuszczonych przechodzi bez stanu
//          „nie znam tego rodzaju";
//   (A7-4) mecz powstaje DWOMA torami;
//   (A7-5) godzina idzie do bazy z sekundami albo `>= 24:00`.
//
// ⚠️ ASERCJE SĄ NA REGUŁĘ, NIE NA DANE. Nigdzie niżej nie ma liczby wierszy
// w bazie ani listy istniejących wydarzeń — test „jest 24 wydarzenia" zgasłby
// przy 25 i niczego by nie pilnował. Pilnujemy kształtu decyzji i kształtu
// wywołań, bo to są rzeczy, które da się zepsuć po cichu.
//
// ⚠️ CZEGO TEN PLIK NIE UDAJE. Część asercji czyta ŹRÓDŁA EKRANÓW JAKO TEKST
// (wzorzec z `lib/ostatniCentymetr.selftest.ts`). To nie jest test — to jest
// strażnik regresji. Nie uruchamia Reacta, nie dotyka Supabase i nie wie, czy
// ekran się rysuje. Zamiana wywołania na inne, równie zepsute, przejdzie tu
// niezauważona. Dlatego każda asercja mówi wprost, co dokładnie było zepsute.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (ograniczenie O53): `tsconfig.json` ciągnie DOM,
// więc `tsc` pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RODZAJE_WYDARZEN,
  ZRODLA_WYDARZEN,
  STATUSY_WYDARZEN,
  RODZAJ_MECZ,
  RODZAJ_TRENING_KLUBOWY,
  czyZnanyRodzaj,
  opiszRodzaj,
  opisNieznanegoRodzajuDoLogu,
  opiszZrodlo,
  przygotujGodzineDoZapisu,
  zdecydujOWierszuMeczu,
  MECZ_ZAPISANY_BEZ_KALENDARZA,
  opisNieudanegoZapisuMeczuDoLogu,
  type WierszKalendarzaDoDecyzji,
} from './meczWKalendarzu';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — ten sam powód co w `ostatniCentymetr.selftest.ts`:
 * pliki tego projektu CYTUJĄ w komentarzach zepsute wywołania („do 14.08.2026
 * stało tu `|| e.event_type`"), więc strażnik czytający surowy tekst
 * zapalałby się na własnej dokumentacji, a jedynym sposobem, żeby go uciszyć,
 * byłoby skasowanie wyjaśnienia — czyli tej wiedzy, dla której powstał.
 */
const bezKomentarzy = (s: string): string => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .join('\n');

const zrodlo = (wzgledna: string): string => bezKomentarzy(readFileSync(join(root, wzgledna), 'utf8'));

const PLIK_KALENDARZ = 'app/(tabs)/kalendarz.tsx';
const PLIK_MECZ = 'app/(tabs)/mecz.tsx';
const PLIK_DZIS = 'app/(tabs)/dzis.tsx';
const PLIK_DZIENNIK = 'app/(tabs)/dziennik.tsx';

// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-E2 15.08.2026 — PRZEMIATANIE ZAMIAST LISTY NA SZTYWNO (O69)
// ═══════════════════════════════════════════════════════════════════
// „Strażnik z listą plików na sztywno zaczyna kłamać przy pierwszym nowym
// pliku — i robi to NA ZIELONO." Tu jest odkrywanie katalogu; wyjątki są
// jawne, nazwane i mają własne asercje dowodzące, że są zasłużone.

function plikiKatalogu(katalog: string, prefiks: string, pasuje: (f: string) => boolean): string[] {
  return readdirSync(katalog).filter(pasuje).sort().map((f) => `${prefiks}${f}`);
}

/**
 * Wszystko, co może narysować zawodnikowi wartość z bazy: ekrany zakładek,
 * komponenty i `lib/` (helper zwracający etykietę jest tą samą drogą na ekran,
 * tylko o jeden skok dalej). ⛔ Selftesty są pominięte — cytują zepsute
 * wzorce w asercjach, więc przemiatanie ich po sobie daje same fałszywe
 * trafienia. To jest ta sama decyzja, co w `pustkaWCalymRepo.selftest.ts`.
 */
const PRZEMIATANE: string[] = [
  ...plikiKatalogu(join(root, 'app', '(tabs)'), 'app/(tabs)/', (f) => f.endsWith('.tsx')),
  ...plikiKatalogu(join(root, 'components'), 'components/', (f) => f.endsWith('.tsx')),
  ...plikiKatalogu(join(root, 'lib'), 'lib/', (f) => /\.tsx?$/.test(f) && !f.endsWith('.selftest.ts')),
];

/** Ekrany, które NAPRAWDĘ rysują nazwę rodzaju wydarzenia — odkryte, nie wpisane. */
const EKRANY_Z_ETYKIETAMI_RODZAJU: string[] =
  PRZEMIATANE.filter((p) => /EVENT_TYPE_LABELS/.test(zrodlo(p)));

/** Pierwszy człon wyrażenia w postaci `a.b.c` — do porównania klucza z zapasem. */
function sciezkaWyrazenia(wyrazenie: string): string | null {
  const m = /^\s*([\w$]+(?:\.[\w$]+)*)/.exec(wyrazenie);
  return m ? m[1] : null;
}

export type SuroweTrafienie = { linia: number; tekst: string };

/**
 * ⭐ DETEKTOR CHOROBY, NIE JEDNEJ KOLUMNY.
 *
 * Szuka zapisu „słownik zapytany kluczem, a przy pudle oddający TEN SAM
 * klucz": `SLOWNIK[x.y] ?? x.y` albo `SLOWNIK[x.y] || x.y`. Taki zapis nigdy
 * nie jest poprawny — znaczy „gdy nie mam słowa, pokażę identyfikator z bazy,
 * a on będzie wyglądał jak słowo, więc nikt nie zgłosi, że słowa brakuje".
 *
 * ⚠️ `SLOWNIK[x] ?? null` i `SLOWNIK[x] || 'Mecz'` to NIE jest ten defekt —
 * tam zapas jest świadomą decyzją, a nie wyciekiem kolumny na ekran. Dlatego
 * warunkiem trafienia jest RÓWNOŚĆ klucza i zapasu, nie sama obecność `??`.
 */
function surowaWartoscJakoNazwa(kod: string): SuroweTrafienie[] {
  const trafienia: SuroweTrafienie[] = [];
  const re = /([A-Za-z_$][\w$]*)\s*\[([^\]\n]+)\]\s*(\?\?|\|\|)([^\n,;)}]+)/g;
  let m: RegExpExecArray | null = re.exec(kod);
  while (m !== null) {
    const klucz = sciezkaWyrazenia(m[2]);
    const zapas = sciezkaWyrazenia(m[4]);
    if (klucz !== null && klucz === zapas) {
      trafienia.push({
        linia: kod.slice(0, m.index).split('\n').length,
        tekst: m[0].trim().slice(0, 80),
      });
    }
    m = re.exec(kod);
  }
  return trafienia;
}

/**
 * ⚠️ DŁUG ZGŁOSZONY, NIE NAPRAWIONY — ZMIERZONY 15.08.2026 PRZEZ PAS E2.
 *
 * ⛔ To NIE jest lista wyjątków „bo tak wygodnie". To są pliki, które łamią
 * regułę i **należą do innych pasów albo do nikogo**. O68: cudzy plik
 * naprawiony przez ten pas znika bez śladu przy jego pushu, a jego autor widzi
 * zielone i nie dowiaduje się, że coś było nie tak.
 *
 * `zmierzone` to liczba miejsc w dniu wpisania. Asercje niżej pilnują dwóch
 * rzeczy naraz: że pozycja NADAL jest zepsuta (inaczej trzeba ją stąd usunąć)
 * i że NIE UROSŁA (dług wolno spłacać, nie wolno dokładać).
 */
const DLUG_SUROWEJ_WARTOSCI: { plik: string; pas: string; zmierzone: number }[] = [
  { plik: 'app/(tabs)/cele.tsx', pas: 'nieprzydzielony', zmierzone: 3 },
  { plik: 'app/(tabs)/diagnoza.tsx', pas: 'C3 / C3b — pasy domknięte 15.08.2026', zmierzone: 1 },
  { plik: 'app/(tabs)/dzis.tsx', pas: 'C4 — pas domknięty 15.08.2026', zmierzone: 2 },
  { plik: 'app/(tabs)/kalendarz.tsx', pas: 'nieprzydzielony', zmierzone: 3 },
  { plik: 'app/(tabs)/mecz.tsx', pas: 'nieprzydzielony', zmierzone: 3 },
  { plik: 'app/(tabs)/profil.tsx', pas: 'L2 — pas domknięty 15.08.2026', zmierzone: 1 },
  { plik: 'components/RecommendationCard.tsx', pas: 'nieprzydzielony', zmierzone: 3 },
  { plik: 'lib/labels.ts', pas: 'nieprzydzielony — `segmentLabel()` oddaje surowy `id`', zmierzone: 1 },
  { plik: 'lib/materials.ts', pas: 'nieprzydzielony', zmierzone: 1 },
];

/** Klucze mapy etykiet rodzajów wydarzeń, wyjęte ze źródła ekranu. */
function kluczeEtykietRodzajow(kod: string): string[] {
  const m = /EVENT_TYPE_LABELS[^=]*=\s*\{([\s\S]*?)\}/.exec(kod);
  if (!m) return [];
  return Array.from(m[1].matchAll(/(\w+)\s*:/g)).map((x) => x[1]);
}

/** Lista kolumn, o które ekran prosi PostgREST dla `calendar_events`. */
function kolumnyZapytaniaKalendarza(kod: string): string | null {
  const m = /from\(\s*['"]calendar_events['"]\s*\)\s*\.select\(\s*['"]([^'"]*)['"]/.exec(kod);
  return m ? m[1] : null;
}

function pobieraKolumne(kolumny: string | null, nazwa: string): boolean {
  if (kolumny === null) return false;
  if (kolumny.trim() === '*') return true;
  return kolumny.split(',').map((c) => c.trim()).includes(nazwa);
}

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

// ═══════════════════════════════════════════════════════════════════
// 0. LISTY MUSZĄ ZGADZAĆ SIĘ Z OGRANICZENIAMI BAZY
// ═══════════════════════════════════════════════════════════════════
// Zmierzone 14.08.2026 (`pg_constraint`, projekt kqrbztsvepjtggjmmcdx) —
// pełne definicje w nagłówku `lib/meczWKalendarzu.ts`.
{
  check('(A7-0) pięć rodzajów, dokładnie te, które przepuszcza CHECK w bazie',
    RODZAJE_WYDARZEN.length === 5
    && ['club_training', 'own_training', 'micro_session', 'task', 'match']
      .every((r) => (RODZAJE_WYDARZEN as readonly string[]).includes(r)),
    JSON.stringify(RODZAJE_WYDARZEN));

  check('(A7-0) trzy źródła i trzy statusy, zgodnie z CHECK-ami',
    ZRODLA_WYDARZEN.length === 3 && STATUSY_WYDARZEN.length === 3
    && (ZRODLA_WYDARZEN as readonly string[]).includes('player')
    && (STATUSY_WYDARZEN as readonly string[]).includes('completed'),
    `${JSON.stringify(ZRODLA_WYDARZEN)} / ${JSON.stringify(STATUSY_WYDARZEN)}`);

  check('(A7-0) stałe rodzajów wskazują na wartości z listy',
    czyZnanyRodzaj(RODZAJ_MECZ) && czyZnanyRodzaj(RODZAJ_TRENING_KLUBOWY),
    `${RODZAJ_MECZ} / ${RODZAJ_TRENING_KLUBOWY}`);
}

// ═══════════════════════════════════════════════════════════════════
// (A7-1) RODZAJ ZAPISYWANY, A NIE RENDEROWANY
// ═══════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: baza dostaje nowy rodzaj (albo appka zaczyna go
// zapisywać), a ekran nie ma dla niego nazwy. Wtedy zawodnik czyta w kalendarzu
// „own_training" — surową wartość z kolumny — i wygląda to na etykietę, więc
// nikt nigdy nie zgłosi, że nazwy brakuje. Formularz w `kalendarz.tsx` UMIE
// zapisać wszystkie pięć rodzajów (Picker jest budowany z tej samej mapy),
// więc każdy z nich musi mieć też nazwę TAM, GDZIE SIĘ RYSUJE — a rysuje się
// w dwóch miejscach: w kalendarzu i na „Dziś".
{
  const kalendarz = zrodlo(PLIK_KALENDARZ);
  const dzis = zrodlo(PLIK_DZIS);

  const wKalendarzu = kluczeEtykietRodzajow(kalendarz);
  const brakujeWKalendarzu = RODZAJE_WYDARZEN.filter((r) => !wKalendarzu.includes(r));
  check('(A7-1) kalendarz ma nazwę dla KAŻDEGO z pięciu rodzajów, które umie zapisać',
    wKalendarzu.length > 0 && brakujeWKalendarzu.length === 0,
    `mapa w ${PLIK_KALENDARZ} = ${JSON.stringify(wKalendarzu)}, brakuje: ${JSON.stringify(brakujeWKalendarzu)}`);

  const wDzis = kluczeEtykietRodzajow(dzis);
  const brakujeWDzis = RODZAJE_WYDARZEN.filter((r) => !wDzis.includes(r));
  check('(A7-1) „Dziś" ma nazwę dla każdego rodzaju, bo rysuje te same wiersze',
    wDzis.length > 0 && brakujeWDzis.length === 0,
    `mapa w ${PLIK_DZIS} = ${JSON.stringify(wDzis)}, brakuje: ${JSON.stringify(brakujeWDzis)}`);

  // Ekran Mecz zapisuje do kalendarza WYŁĄCZNIE mecze. Gdyby zaczął zapisywać
  // cokolwiek innego, ta asercja to pokaże, zanim pokaże to zawodnik.
  const mecz = zrodlo(PLIK_MECZ);
  const rodzajeWpisywanePrzezMecz = Array.from(mecz.matchAll(/event_type:\s*([A-Za-z_.']+)/g)).map((m) => m[1]);
  check('(A7-1) ekran Mecz nie wpisuje do kalendarza żadnego rodzaju poza meczem',
    rodzajeWpisywanePrzezMecz.every((r) => r === 'RODZAJ_MECZ' || r === "'match'"),
    JSON.stringify(rodzajeWpisywanePrzezMecz));
}

// ═══════════════════════════════════════════════════════════════════
// (A7-2) `source` POKAZYWANY, ALE NIEPOBIERANY
// ═══════════════════════════════════════════════════════════════════
// Defekt, którego pilnuje: ekran rysuje „Ty to dodałeś" z kolumny, której jego
// zapytanie nie przynosi. PostgREST nie rzuca wtedy błędem — pole po prostu
// jest `undefined`, a `opiszZrodlo(undefined)` da „nie wiemy, skąd ta pozycja"
// KAŻDEJ pozycji. Legenda makiety przestaje cokolwiek rozróżniać, a wygląda,
// jakby działała. Reguła jest w obie strony i dlatego sprawdzamy oba ekrany:
// KTO RYSUJE, TEN MUSI POBRAĆ. Ekran, który nie rysuje, nie musi pobierać —
// i nie jest za to karany (`dzis.tsx` na 14.08 nie rysuje źródła).
{
  for (const plik of [PLIK_KALENDARZ, PLIK_DZIS]) {
    const kod = zrodlo(plik);
    const rysuje = kod.includes('opiszZrodlo(');
    const kolumny = kolumnyZapytaniaKalendarza(kod);
    check(`(A7-2) ${plik}: rysuje źródło ⇒ pobiera kolumnę \`source\``,
      !rysuje || pobieraKolumne(kolumny, 'source'),
      `rysuje=${rysuje}, kolumny w zapytaniu = ${JSON.stringify(kolumny)}`);
  }

  // To samo dla godziny: kalendarz rysuje tag „18:00", więc musi ją pobrać.
  const kalendarz = zrodlo(PLIK_KALENDARZ);
  check('(A7-2) kalendarz rysuje godzinę ⇒ pobiera kolumnę `scheduled_time`',
    !kalendarz.includes('formatujGodzine(')
    || pobieraKolumne(kolumnyZapytaniaKalendarza(kalendarz), 'scheduled_time'),
    `kolumny = ${JSON.stringify(kolumnyZapytaniaKalendarza(kalendarz))}`);

  // Typ `CalEvent` jest jedynym miejscem, w którym TypeScript może powiedzieć,
  // że ekran sięga po pole spoza zapytania. Pusty typ = wyłączona kontrola.
  check('(A7-2) typ wiersza w kalendarzu deklaruje `source` i `scheduled_time`',
    /type CalEvent = \{[\s\S]*?source:[\s\S]*?\}/.test(kalendarz)
    && /type CalEvent = \{[\s\S]*?scheduled_time:[\s\S]*?\}/.test(kalendarz),
    'typ CalEvent nie zna obu kolumn — TypeScript przestaje pilnować zapytania');

  // Odwrotność: wartość spoza trójki ma dostać JAWNE „nie wiem", a nie ładnie
  // wyglądającą nazwę. `undefined` znaczy tu „ekran nie pobrał kolumny",
  // bo w bazie `source` jest NOT NULL.
  const nieznane = opiszZrodlo(undefined);
  check('(A7-2) nieznane źródło ma jawny stan „nie wiemy", nie zgadniętą nazwę',
    nieznane.znane === false && nieznane.opis.includes('nie wiemy')
    && opiszZrodlo('player').opis !== opiszZrodlo('system').opis,
    JSON.stringify(nieznane));
}

// ═══════════════════════════════════════════════════════════════════
// (A7-3) RODZAJ SPOZA PIĄTKI PRZECHODZI BEZ STANU „NIE ZNAM"
// ═══════════════════════════════════════════════════════════════════
{
  const nieznany = opiszRodzaj('trening_na_plazy');
  check('(A7-3) rodzaj spoza piątki daje stan „nie znam", a nie zgadniętą etykietę',
    nieznany.znany === false
    && nieznany.znany === false && nieznany.komunikat.length > 0
    && nieznany.komunikat !== 'trening_na_plazy',
    JSON.stringify(nieznany));

  check('(A7-3) …i niesie surową wartość do logu, żeby dało się to naprawić',
    (opisNieznanegoRodzajuDoLogu(nieznany) ?? '').includes('trening_na_plazy')
    && opisNieznanegoRodzajuDoLogu(opiszRodzaj('match')) === null,
    String(opisNieznanegoRodzajuDoLogu(nieznany)));

  // ⚠️ DO 14.08.2026 W `kalendarz.tsx` STAŁO `EVENT_TYPE_LABELS[e.event_type]
  // || e.event_type`. Ten wzorzec jest cichą awarią: przy nieznanym rodzaju
  // pokazuje zawodnikowi wartość z kolumny bazy, udającą nazwę.
  //
  // ⚠️ ROZSZERZONE 14.08.2026 WIECZOREM — I DLACZEGO TO NIE JEST KOSMETYKA.
  // Pas A7 postawił ten strażnik WYŁĄCZNIE na `kalendarz.tsx`. Wzorzec żył
  // dalej w `dzis.tsx` — czyli reguła obowiązywała na ekranie, który zawodnik
  // otwiera rzadko, i nie obowiązywała na ekranie, który widzi po każdym
  // uruchomieniu appki. Strażnik pilnujący JEDNEGO z dwóch miejsc tego samego
  // wzorca jest gorszy niż jego brak: daje zielone światło i nazwę „domknięte".
  // Pętla niżej ma rosnąć razem z listą ekranów rysujących rodzaj wydarzenia.
  //
  // ⭐⭐ PLAN-D-E2 15.08.2026 — I DOKŁADNIE TEGO NIE ROBIŁA.
  // Powyższe zdanie („ma rosnąć razem z listą") było OBIETNICĄ ZŁOŻONĄ
  // CZŁOWIEKOWI, a nie mechanizmem. Lista `EKRANY_Z_RODZAJEM` stała na
  // sztywno na dwóch pozycjach, więc trzeci ekran wchodził do repozytorium
  // NIEPRZEMIECIONY — i wszedł: `app/(tabs)/dziennik.tsx` niósł ten sam
  // wzorzec (`SESSION_TYPE_LABELS[row.session_type] ?? row.session_type`)
  // przez cały czas, kiedy ten strażnik świecił na zielono. To jest O69
  // w czystej postaci: strażnik z listą na sztywno zaczyna kłamać przy
  // pierwszym nowym pliku i robi to NA ZIELONO.
  //
  // Od E2 lista jest ODKRYWANA Z KATALOGU, a wyjątki są jawne i zasłużone —
  // ten sam ruch, który pas C3b wykonał w `trzyPustki.selftest.ts`.
  const EKRANY_Z_RODZAJEM = EKRANY_Z_ETYKIETAMI_RODZAJU;

  check('(A7-3) (strażnik strażnika) mam co przemiatać — ekrany z etykietami rodzaju',
    EKRANY_Z_RODZAJEM.length >= 2, `znalazłem ${EKRANY_Z_RODZAJEM.length}`);

  // ⚠️ POKRYCIE Z PASA A7 NIE MOŻE PO CICHU ZNIKNĄĆ. Gdyby ktoś przestał
  // rysować rodzaj na jednym z tych dwóch ekranów, przemiatanie po prostu
  // przestałoby go widzieć — i nikt by się nie dowiedział.
  const DWA_EKRANY_A7 = [PLIK_KALENDARZ, PLIK_DZIS];
  const zgubione = DWA_EKRANY_A7.filter((p) => !EKRANY_Z_RODZAJEM.includes(p));
  check('(A7-3) ⛔ żaden z dwóch ekranów pasa A7 nie wypadł z przemiatania',
    zgubione.length === 0, `wypadły: ${zgubione.join(', ')}`);

  for (const sciezka of EKRANY_Z_RODZAJEM) {
    const nazwa = sciezka.split('/').pop() ?? sciezka;
    const kod = zrodlo(sciezka);

    check(`(A7-3) ${nazwa} nie pokazuje surowej wartości z bazy jako nazwy rodzaju`,
      !/\|\|\s*e\.event_type/.test(kod),
      `w ${sciezka} znów jest \`|| e.event_type\` — nieznany rodzaj pokaże się jako nazwa`);

    check(`(A7-3) ${nazwa} rozstrzyga rodzaj przez \`opiszRodzaj\`, a nie po swojemu`,
      kod.includes('opiszRodzaj('),
      `${sciezka} przestał wołać wspólną regułę i zapewne ma własną kopię`);

    // ⚠️ TA ASERCJA ZAMYKA DZIURĘ W DWÓCH POWYŻSZYCH. Obie są spełnialne przez
    // USUNIĘCIE rysowania rodzaju w ogóle: bez `|| e.event_type` i bez wołania
    // `opiszRodzaj` wystarczy skasować linię z etykietą. Wtedy zawodnik nie widzi
    // rodzaju wcale, a suita jest zielona. Dlatego wymagamy TU obecności obu
    // gałęzi rozstrzygnięcia — znanej i nieznanej.
    check(`(A7-3) ${nazwa} rysuje OBIE gałęzie: etykietę znanego i komunikat nieznanego`,
      /EVENT_TYPE_LABELS\[\s*opisRodzaju\.id\s*\]/.test(kod) && /opisRodzaju\.komunikat/.test(kod),
      `${sciezka} woła \`opiszRodzaj\`, ale nie rysuje obu wyników — rodzaj mógł zniknąć z ekranu`);
  }

  // ⚠️ Pliki, które DOTYKAJĄ `event_type`, ale nie mają słownika etykiet, są
  // poza pętlą wyżej — i to jest poprawne tylko dopóty, dopóki naprawdę nie
  // rysują rodzaju żadnym innym słownikiem. Ta asercja tego pilnuje, więc
  // wyjście z przemiatania nie jest możliwe przez zmianę nazwy mapy.
  const DOTYKAJA_EVENT_TYPE = PRZEMIATANE
    .filter((p) => /event_type/.test(zrodlo(p)) && !EKRANY_Z_RODZAJEM.includes(p));
  console.log(`   (A7-3) przemiatam ${EKRANY_Z_RODZAJEM.length} ekranów z etykietami rodzaju: `
    + EKRANY_Z_RODZAJEM.map((p) => p.split('/').pop()).join(', '));
  console.log(`   (A7-3) dotyka \`event_type\` bez słownika etykiet (${DOTYKAJA_EVENT_TYPE.length}): `
    + DOTYKAJA_EVENT_TYPE.map((p) => p.split('/').pop()).join(', '));

  const rysujaInnymSlownikiem = DOTYKAJA_EVENT_TYPE
    .filter((p) => /[A-Z_]+LABELS\s*\[[^\]]*event_type/.test(zrodlo(p)));
  check('(A7-3) ⛔ nikt nie rysuje rodzaju DRUGIM słownikiem, żeby wyjść z przemiatania',
    rysujaInnymSlownikiem.length === 0, `rysują po swojemu: ${rysujaInnymSlownikiem.join(', ')}`);
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ (E2-5) SUROWA WARTOŚĆ Z BAZY JAKO NAZWA — CAŁE REPOZYTORIUM
// ═══════════════════════════════════════════════════════════════════
// Pas A7 opisał chorobę wąsko: „`EVENT_TYPE_LABELS[e.event_type] || e.event_type`
// w trzech plikach appki". Pomiar 15.08.2026 (pas E2, detektor niżej puszczony
// po `app/(tabs)`, `components/` i `lib/`) pokazuje, że to jest choroba
// OGÓLNA, a nie sprawa jednej kolumny: **20 miejsc w 10 plikach**.
//
// ⛔ Dlatego ten strażnik nie pyta już o `event_type`. Pyta o WZORZEC:
// „słownik zapytany kluczem, a przy pudle oddający ten sam klucz". Taki
// zapis nigdy nie jest poprawny — zawsze znaczy „gdy nie mam słowa, pokażę
// zawodnikowi identyfikator z bazy i będzie wyglądał jak słowo".
//
// ⚠️ CZEGO TA ASERCJA NIE UMIE: nie widzi mapowania rozbitego na kilka linii
// ani zrobionego funkcją pomocniczą. Łapie zapis, który ludzie naprawdę piszą.
{
  check('(E2-5) (strażnik strażnika) detektor zapala się na wzorcu, który zna z historii',
    surowaWartoscJakoNazwa('const x = EVENT_TYPE_LABELS[e.event_type] || e.event_type;').length === 1
    && surowaWartoscJakoNazwa('const x = SESSION_TYPE_LABELS[row.session_type] ?? row.session_type;').length === 1
    && surowaWartoscJakoNazwa("const t = GAME_TYPE_LABELS[gameType] || 'Mecz';").length === 0
    && surowaWartoscJakoNazwa('const p = POSITION_PROFILES[key] ?? null;').length === 0,
    'detektor nie odróżnia surowej wartości od porządnego zapasowego słowa');

  const nazwyDlugu = new Set(DLUG_SUROWEJ_WARTOSCI.map((d) => d.plik));

  check('(E2-5) (strażnik strażnika) każdy plik z listy długu naprawdę istnieje',
    DLUG_SUROWEJ_WARTOSCI.every((d) => existsSync(join(root, d.plik))),
    DLUG_SUROWEJ_WARTOSCI.filter((d) => !existsSync(join(root, d.plik))).map((d) => d.plik).join(', '));

  check('(E2-5) (strażnik strażnika) przemiatam trzy katalogi, nie jeden',
    PRZEMIATANE.some((p) => p.startsWith('app/'))
    && PRZEMIATANE.some((p) => p.startsWith('components/'))
    && PRZEMIATANE.some((p) => p.startsWith('lib/')),
    `przemiatanych plików: ${PRZEMIATANE.length}`);

  // ── ⭐ SEDNO: każdy przemiatany plik SPOZA listy długu ma być czysty.
  //    Nowy ekran z tym wzorcem zapali się tu SAM, bez edycji tego pliku.
  const brudneSpozaDlugu = PRZEMIATANE
    .filter((p) => !nazwyDlugu.has(p))
    .map((p) => ({ plik: p, trafienia: surowaWartoscJakoNazwa(zrodlo(p)) }))
    .filter((x) => x.trafienia.length > 0);

  check('⭐ (E2-5) ⛔ żaden plik spoza listy długu nie pokazuje surowej wartości jako nazwy',
    brudneSpozaDlugu.length === 0,
    brudneSpozaDlugu.map((x) => `${x.plik}: ${x.trafienia.map((t) => t.tekst).join(' | ')}`).join('\n       '));

  // ── ⚠️ LISTA DŁUGU KASUJE SIĘ SAMA (O68 + zakaz cichego zniknięcia).
  //    Pozycja naprawiona przez właściciela przestaje mieć prawo tu stać —
  //    inaczej za tydzień nikt nie odróżni „jeszcze zepsute" od „zapomniane".
  const stanDlugu = DLUG_SUROWEJ_WARTOSCI
    .map((d) => ({ ...d, teraz: surowaWartoscJakoNazwa(zrodlo(d.plik)).length }));

  console.log(`   ⚠️ (E2-5) DŁUG ZGŁOSZONY, NIE NAPRAWIONY — cudze pliki, O68 (${stanDlugu.length}):`);
  for (const d of stanDlugu) console.log(`      • ${d.plik} — ${d.teraz} miejsc — pas: ${d.pas}`);
  console.log(`   ⚠️ (E2-5) razem miejsc w długu: ${stanDlugu.reduce((s, d) => s + d.teraz, 0)}`);

  const juzNaprawione = stanDlugu.filter((d) => d.teraz === 0);
  check('(E2-5) ⛔ dług NADAL istnieje — naprawione pozycje wypadają z listy',
    juzNaprawione.length === 0,
    `NAPRAWIONE przez właściciela, usuń z DLUG_SUROWEJ_WARTOSCI: ${juzNaprawione.map((d) => d.plik).join(', ')}`);

  // ⚠️ Dług wolno spłacać, nie wolno dokładać. Bez tego plik raz wpisany na
  // listę stawałby się miejscem, w którym wzorzec może się mnożyć bez śladu.
  const urosly = stanDlugu.filter((d) => d.teraz > d.zmierzone);
  check('(E2-5) ⛔ żadna pozycja długu nie UROSŁA od pomiaru 15.08.2026',
    urosly.length === 0,
    urosly.map((d) => `${d.plik}: było ${d.zmierzone}, jest ${d.teraz}`).join(', '));
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ (E2-6) DZIENNIK: DLACZEGO NIE `opiszRodzaj` — DOWÓD, NIE ZDANIE
// ═══════════════════════════════════════════════════════════════════
// Polecenie pasa E2 kazało podpiąć w `dziennik.tsx` funkcję `opiszRodzaj`
// „co do znaku jak w dzis.tsx". Pomiar `pg_constraint` z 15.08.2026 pokazał,
// że to są dwie różne dziedziny i że podpięcie zamieniłoby poprawną etykietę
// „Inne" w komunikat „nie znam". Te asercje trzymają ten pomiar maszynowo,
// żeby następna sesja nie „naprawiła" dziennika z powrotem.
{
  // Zmierzone 15.08.2026 (projekt kqrbztsvepjtggjmmcdx):
  //   daily_logs_session_type_check → club_training, own_training,
  //   micro_session, match, other
  const DZIEDZINA_SESSION_TYPE = [
    'club_training', 'own_training', 'micro_session', 'match', 'other',
  ];

  check('(E2-6) ⭐ dziedziny `session_type` i `event_type` NIE są tą samą piątką',
    !DZIEDZINA_SESSION_TYPE.includes('task')
    && (RODZAJE_WYDARZEN as readonly string[]).includes('task')
    && !(RODZAJE_WYDARZEN as readonly string[]).includes('other')
    && DZIEDZINA_SESSION_TYPE.includes('other'),
    `session_type=${DZIEDZINA_SESSION_TYPE.join(',')} event_type=${RODZAJE_WYDARZEN.join(',')}`);

  check('(E2-6) ⛔ `opiszRodzaj(\'other\')` mówi „nie znam" — a `other` jest legalną sesją',
    opiszRodzaj('other').znany === false && czyZnanyRodzaj('match') === true,
    'gdyby to przestało być prawdą, dziennik MOŻE wołać opiszRodzaj — zmień tę asercję świadomie');

  const dziennik = zrodlo(PLIK_DZIENNIK);

  // Słownik ekranu ma pokrywać dziedzinę bazy CO DO ZNAKU. Rozjazd znaczy,
  // że gałąź „nie znam" zapali się na wartości, którą appka sama zapisuje.
  const kluczeSlownika = Array.from(
    (/SESSION_TYPE_LABELS[^=]*=\s*\{([\s\S]*?)\}/.exec(dziennik)?.[1] ?? '').matchAll(/(\w+)\s*:/g),
  ).map((m) => m[1]);
  check('(E2-6) słownik rodzajów sesji w dzienniku pokrywa dziedzinę CHECK-a co do znaku',
    kluczeSlownika.length === DZIEDZINA_SESSION_TYPE.length
    && DZIEDZINA_SESSION_TYPE.every((w) => kluczeSlownika.includes(w)),
    `słownik=${kluczeSlownika.join(',')}`);

  check('(E2-6) dziennik rozstrzyga rodzaj sesji jawną gałęzią, a nie surową wartością',
    /opiszRodzajSesji\(/.test(dziennik) && !/SESSION_TYPE_LABELS\[[^\]]*\]\s*(\?\?|\|\|)/.test(dziennik),
    'w dzienniku znów stoi słownik z zapasem w postaci surowej wartości');

  check('(E2-6) dziennik rysuje OBIE gałęzie rodzaju sesji — etykietę i komunikat',
    /opisRodzaju\.etykieta/.test(dziennik) && /opisRodzaju\.komunikat/.test(dziennik),
    'rodzaj sesji mógł zniknąć z ekranu zamiast dostać nazwę');

  check('(E2-6) dziennik rysuje OBIE gałęzie miejsca bólu — etykietę i komunikat',
    /opisMiejsca\.etykieta/.test(dziennik) && /opisMiejsca\.komunikat/.test(dziennik),
    'miejsce bólu mógł zniknąć z ekranu zamiast dostać nazwę');

  check('(E2-6) nieznana wartość zostawia ślad w konsoli, nie znika po cichu',
    /opisNieznanejWartosciDoLogu\(/.test(dziennik)
    && (dziennik.match(/console\.warn\(opisNieznanejWartosciDoLogu\(/g) ?? []).length === 2,
    'brak logu przy którejś z dwóch nieznanych wartości');
}

// ═══════════════════════════════════════════════════════════════════
// (A7-4) ⭐ MECZ POWSTAJE DWOMA TORAMI
// ═══════════════════════════════════════════════════════════════════
// Najdroższy defekt tej rundy, gdyby przeszedł: zawodnik planuje sobotni mecz
// w Kalendarzu, w sobotę wieczorem opisuje go na ekranie Mecz — i ma ten sam
// mecz w kalendarzu dwa razy. Oba wiersze są poprawne z osobna, żaden zapis
// nie zwraca błędu, więc NIC tego nie zgłosi.
{
  const wspolne = { userId: 'u-1', godzina: null as string | null, tytul: 'Mecz oficjalny' };
  const zaplanowany: WierszKalendarzaDoDecyzji = {
    id: 7, event_type: 'match', status: 'scheduled',
    scheduled_date: '2026-08-15', scheduled_time: null,
  };

  const bezNiczego = zdecydujOWierszuMeczu({ ...wspolne, data: '2026-08-15', istniejace: [] });
  check('(A7-4) pusty kalendarz ⇒ zakładamy wiersz meczu (source=player, status=completed)',
    bezNiczego.rodzaj === 'utworz'
    && bezNiczego.rodzaj === 'utworz' && bezNiczego.wiersz.source === 'player'
    && bezNiczego.wiersz.event_type === 'match'
    && bezNiczego.wiersz.status === 'completed'
    && bezNiczego.wiersz.scheduled_date === '2026-08-15',
    JSON.stringify(bezNiczego));

  const zPlanem = zdecydujOWierszuMeczu({ ...wspolne, data: '2026-08-15', istniejace: [zaplanowany] });
  check('(A7-4) mecz JUŻ zaplanowany na ten dzień ⇒ DOMYKAMY go, nie zakładamy drugiego',
    zPlanem.rodzaj === 'aktualizuj' && zPlanem.rodzaj === 'aktualizuj' && zPlanem.id === 7,
    JSON.stringify(zPlanem));

  const innyDzien = zdecydujOWierszuMeczu({ ...wspolne, data: '2026-08-16', istniejace: [zaplanowany] });
  check('(A7-4) mecz w INNYM dniu to inny mecz — dopasowanie nie może być po samym rodzaju',
    innyDzien.rodzaj === 'utworz', JSON.stringify(innyDzien));

  const anulowany = zdecydujOWierszuMeczu({
    ...wspolne, data: '2026-08-15',
    istniejace: [{ ...zaplanowany, status: 'cancelled' }],
  });
  check('(A7-4) anulowany mecz nie jest tym meczem — anulowanego nie wskrzeszamy',
    anulowany.rodzaj === 'utworz', JSON.stringify(anulowany));

  const dwaPasujace = zdecydujOWierszuMeczu({
    ...wspolne, data: '2026-08-15',
    istniejace: [{ ...zaplanowany, id: 12 }, zaplanowany],
  });
  check('(A7-4) przy duplikatach bierzemy najstarszy i MÓWIMY o tym, zamiast dołożyć trzeci',
    dwaPasujace.rodzaj === 'aktualizuj'
    && dwaPasujace.rodzaj === 'aktualizuj' && dwaPasujace.id === 7
    && dwaPasujace.powod.includes('2'),
    JSON.stringify(dwaPasujace));

  const zGodzinaNaPustym = zdecydujOWierszuMeczu({
    ...wspolne, godzina: '11:00', data: '2026-08-15', istniejace: [zaplanowany],
  });
  check('(A7-4) godzina uzupełnia PUSTKĘ w zaplanowanym meczu',
    zGodzinaNaPustym.rodzaj === 'aktualizuj'
    && zGodzinaNaPustym.rodzaj === 'aktualizuj'
    && zGodzinaNaPustym.zmiany.scheduled_time === '11:00',
    JSON.stringify(zGodzinaNaPustym));

  const zGodzinaNaZajetym = zdecydujOWierszuMeczu({
    ...wspolne, godzina: '11:00', data: '2026-08-15',
    istniejace: [{ ...zaplanowany, scheduled_time: '10:00' }],
  });
  check('(A7-4) …ale NIE nadpisuje godziny, którą zawodnik podał, planując mecz',
    zGodzinaNaZajetym.rodzaj === 'aktualizuj'
    && zGodzinaNaZajetym.rodzaj === 'aktualizuj'
    && zGodzinaNaZajetym.zmiany.scheduled_time === undefined,
    JSON.stringify(zGodzinaNaZajetym));

  // Strażnik na kodzie: ekran ma tę decyzję WYKONYWAĆ, nie podejmować.
  const mecz = zrodlo(PLIK_MECZ);
  const wstawienia = Array.from(
    mecz.matchAll(/from\(\s*['"]calendar_events['"]\s*\)\s*\.insert\(\s*([A-Za-z_.]+)\s*\)/g),
  ).map((m) => m[1]);
  check('(A7-4) ekran Mecz wstawia do kalendarza dokładnie raz i wyłącznie wiersz z decyzji',
    mecz.includes('zdecydujOWierszuMeczu(')
    && wstawienia.length === 1 && wstawienia[0] === 'decyzja.wiersz',
    `wywołania insert: ${JSON.stringify(wstawienia)}`);

  check('(A7-4) …i nie wstawia niczego, zanim sprawdzi, co już jest w kalendarzu',
    mecz.indexOf('.select(\'id,event_type,status,scheduled_date,scheduled_time\')')
      < mecz.indexOf('.insert(decyzja.wiersz)'),
    'zapis stoi przed odczytem — przy nieudanym odczycie powstałby duplikat');

  check('(A7-4) porażka zapisu do kalendarza ma zdanie dla zawodnika i powód do logu',
    MECZ_ZAPISANY_BEZ_KALENDARZA.includes('Mecz zapisany')
    && opisNieudanegoZapisuMeczuDoLogu('utworz', 'RLS').includes('RLS')
    && mecz.includes('MECZ_ZAPISANY_BEZ_KALENDARZA'),
    'brak jawnego stanu porażki — to jest „cichy brak", nie awaria');
}

// ═══════════════════════════════════════════════════════════════════
// (A7-5) GODZINA Z SEKUNDAMI ALBO `>= 24:00`
// ═══════════════════════════════════════════════════════════════════
// `chk_calendar_events_scheduled_time` odrzuca jedno i drugie kodem `23514`.
// Bez tej bramki zawodnik dostaje surowy błąd bazy po wypełnieniu formularza.
{
  const zSekundami = przygotujGodzineDoZapisu('17:30:45');
  check('(A7-5) godzina z sekundami NIE idzie do bazy (CHECK odrzuci ją kodem 23514)',
    zSekundami.zapisz === false, JSON.stringify(zSekundami));

  const polnocDoby = przygotujGodzineDoZapisu('24:00');
  check('(A7-5) `24:00` nie przechodzi, mimo że PostgreSQL zna taki `time`',
    polnocDoby.zapisz === false, JSON.stringify(polnocDoby));

  check('(A7-5) `25:00` i `8:70` nie przechodzą',
    przygotujGodzineDoZapisu('25:00').zapisz === false
    && przygotujGodzineDoZapisu('8:70').zapisz === false,
    'walidacja zakresu przestała działać');

  const pusto = przygotujGodzineDoZapisu('');
  const spacje = przygotujGodzineDoZapisu('   ');
  const brak = przygotujGodzineDoZapisu(null);
  check('(A7-5) BRAK godziny to nie błąd — to `null`, i tak ma zostać',
    pusto.zapisz === true && pusto.zapisz === true && pusto.wartosc === null
    && spacje.zapisz === true && spacje.zapisz === true && spacje.wartosc === null
    && brak.zapisz === true && brak.zapisz === true && brak.wartosc === null,
    `${JSON.stringify(pusto)} / ${JSON.stringify(spacje)} / ${JSON.stringify(brak)}`);

  const jednocyfrowa = przygotujGodzineDoZapisu('8:00');
  check('(A7-5) `8:00` przechodzi i normalizuje się do `08:00` (jeden zapis jednej godziny)',
    jednocyfrowa.zapisz === true && jednocyfrowa.zapisz === true && jednocyfrowa.wartosc === '08:00',
    JSON.stringify(jednocyfrowa));

  // ⚠️ KOLEJNOŚĆ: najpierw pustka, potem format. Odwrotna kolejność zamienia
  // „25:00" w „nie podano godziny" i zapisuje po cichu decyzję, której
  // zawodnik nie podjął. Ten sam błąd złapał u siebie pas A2+A3 (mutacja M7).
  check('(A7-5) błędna godzina NIE zamienia się po cichu w „nie podano"',
    przygotujGodzineDoZapisu('25:00').zapisz === false
    && przygotujGodzineDoZapisu('').zapisz === true,
    'zła godzina jest połykana jako brak godziny');

  // Strażnik na kodzie: oba ekrany, które piszą godzinę, mają iść tą bramką.
  for (const plik of [PLIK_KALENDARZ, PLIK_MECZ]) {
    const kod = zrodlo(plik);
    check(`(A7-5) ${plik}: godzina idzie przez \`przygotujGodzineDoZapisu\`, nie surowym stanem`,
      kod.includes('przygotujGodzineDoZapisu(')
      && !/scheduled_time\s*[:=]\s*(godzina|godzinaMeczu)\b/.test(kod),
      'ekran buduje `scheduled_time` z pola formularza z pominięciem bramki');
  }
}

// ═══════════════════════════════════════════════════════════════════
// STRAŻNIK STRAŻNIKA
// ═══════════════════════════════════════════════════════════════════
// Wszystkie asercje na tekście czytają pliki z dysku. Gdyby ścieżka się
// rozjechała, `readFileSync` rzuci — ale gdyby plik istniał i nie zawierał już
// badanej logiki, część asercji przechodziłaby, nie sprawdzając niczego.
{
  const kalendarz = zrodlo(PLIK_KALENDARZ);
  const mecz = zrodlo(PLIK_MECZ);
  const dzis = zrodlo(PLIK_DZIS);
  check('pliki, które ten strażnik czyta, naprawdę zawierają badaną logikę',
    kalendarz.includes("from('calendar_events')") && kalendarz.includes('EVENT_TYPE_LABELS')
    && mecz.includes("from('match_contexts')") && mecz.includes("from('calendar_events')")
    && dzis.includes('EVENT_TYPE_LABELS'),
    `kalendarz=${kalendarz.length}B mecz=${mecz.length}B dzis=${dzis.length}B`);
}


// ═══════════════════════════════════════════════════════════════════
// W2. ⭐ „ILE TO POTRWA" — kalendarz zaczyna znać długość (17.08.2026)
// ═══════════════════════════════════════════════════════════════════
console.log('\nW2. ⭐ DŁUGOŚĆ WYDARZENIA W KALENDARZU');
{
  const MIEJSCA_WSTAWIAJACE = [
    'app/(tabs)/kalendarz.tsx',
    'app/(tabs)/mecz.tsx',
    'components/FocusBlockPlanner.tsx',
    'components/FocusBlockActiveView.tsx',
  ] as const;

  // ⛔ ZAPADKA NA RÓWNOŚĆ, nie na „≥1": kto dołoży PIĄTE miejsce wstawiające
  // wiersz do kalendarza, zobaczy czerwień, a nie ciszę.
  {
    const wstawiajace = MIEJSCA_WSTAWIAJACE.filter((f) =>
      /from\('calendar_events'\)\s*\.?\s*\n?\s*\.insert\(|from\('calendar_events'\)\.insert\(/.test(zrodlo(f)));
    const zDlugoscia = MIEJSCA_WSTAWIAJACE.filter((f) => /planned_minutes/.test(zrodlo(f)));
    check('⭐⭐ (W2, D1) KAŻDE miejsce wstawiające wydarzenie podaje `planned_minutes` — zapadka na RÓWNOŚĆ',
      zDlugoscia.length === MIEJSCA_WSTAWIAJACE.length,
      `z długością: ${zDlugoscia.length} z ${MIEJSCA_WSTAWIAJACE.length} — brakuje: `
      + MIEJSCA_WSTAWIAJACE.filter((f) => !zDlugoscia.includes(f)).join(', '));
    check('⛔ (W2) lista miejsc wstawiających jest AKTUALNA — żadne z czterech nie przestało wstawiać',
      wstawiajace.length + (/insert\(decyzja\.wiersz\)/.test(zrodlo('app/(tabs)/mecz.tsx')) ? 1 : 0) >= 4,
      `wstawiających: ${wstawiajace.join(', ')}`);
  }

  // ⛔ D2 — pominięte pole daje `null`, a NIE zero.
  {
    const kal = zrodlo('app/(tabs)/kalendarz.tsx');
    check('⛔ (W2, D2, R5) pominięta długość NIE JEST wysyłana jako 0 — pole idzie tylko wtedy, gdy zawodnik je wskazał',
      /if \(dlugoscMin !== null\) body\.planned_minutes = dlugoscMin;/.test(kal)
      && !/planned_minutes:\s*0\b/.test(kal),
      'ekran kalendarza wysyła długość bezwarunkowo albo zerem');

    const decyzja = zdecydujOWierszuMeczu({
      userId: 'u', data: '2026-08-17', godzina: null, tytul: 'Mecz', istniejace: [],
    });
    check('⭐ (W2, D2, R5) mecz BEZ podanej długości daje wiersz z `null`, ⛔ nie z 90 i nie z 0',
      decyzja.rodzaj === 'utworz' && decyzja.wiersz.planned_minutes === null,
      JSON.stringify(decyzja.rodzaj === 'utworz' ? decyzja.wiersz : decyzja));

    const zDlugoscia = zdecydujOWierszuMeczu({
      userId: 'u', data: '2026-08-17', godzina: null, tytul: 'Mecz', dlugoscMeczu: 60, istniejace: [],
    });
    check('⭐ (W2) …a mecz Z podaną długością niesie DOKŁADNIE tę liczbę',
      zDlugoscia.rodzaj === 'utworz' && zDlugoscia.wiersz.planned_minutes === 60,
      JSON.stringify(zDlugoscia.rodzaj === 'utworz' ? zDlugoscia.wiersz : zDlugoscia));

    const bezsens = zdecydujOWierszuMeczu({
      userId: 'u', data: '2026-08-17', godzina: null, tytul: 'Mecz', dlugoscMeczu: 0, istniejace: [],
    });
    check('⛔ (W2) długość 0 albo ujemna NIE WCHODZI do wiersza — zero minut meczu nie istnieje',
      bezsens.rodzaj === 'utworz' && bezsens.wiersz.planned_minutes === null,
      JSON.stringify(bezsens.rodzaj === 'utworz' ? bezsens.wiersz : bezsens));
  }

  // ⛔ D3 — Blok nie pyta zawodnika o rzecz, którą produkt wie.
  {
    const planer = zrodlo('components/FocusBlockPlanner.tsx');
    check('⭐ (W2, D3, P0) planer Bloku NIE PYTA o długość — bierze `suggestion.durationMinutes`, którą zawodnik już podał',
      /planned_minutes: suggestion\.durationMinutes/.test(planer),
      'planer nie przekazuje długości z konfiguracji Bloku');

    const widok = zrodlo('components/FocusBlockActiveView.tsx');
    check('⭐ (W2, D3) przedłużenie Bloku ODTWARZA długość z ostatniej sesji, ⛔ nie podstawia liczby domyślnej',
      /planned_minutes: dlugoscZOstatniejSesji/.test(widok)
      && /let dlugoscZOstatniejSesji: number \| null = null/.test(widok),
      'przedłużenie Bloku zmyśla długość albo jej nie niesie');
    check('⛔ (W2, O83) …i odczytuje `error` tej dodatkowej rozmowy z bazą — cichy brak nie przechodzi',
      /if \(dlErr\)/.test(widok),
      'nowy odczyt nie ma odczytanego błędu');
  }

  // ⭐ D4 — jedna lista długości w całym produkcie (O92).
  {
    const kal = zrodlo('app/(tabs)/kalendarz.tsx');
    check('⭐ (W2, D4, O92) ekran kalendarza bierze szóstkę długości ZE STAŁEJ `MINUTY_DO_WYBORU`, nie z własnej listy',
      /import \{ MINUTY_DO_WYBORU \} from '\.\.\/\.\.\/lib\/ocenaZKafla'/.test(kal)
      && /MINUTY_DO_WYBORU\.map/.test(kal)
      && !/\[15, 30, 45, 60, 90, 120\]/.test(kal),
      'ekran kalendarza ma własną kopię listy długości');
    check('⛔ (W2, D4) ⛔ ani jedna długość nie jest zaznaczona na starcie',
      /useState<number \| null>\(null\)/.test(kal),
      'pole długości startuje z wartością — czyli podpowiada');
  }

  // ⛔ D5 — próg punktowy nie pokazuje się zawodnikowi.
  {
    const kal = readFileSync(join(root, 'app', '(tabs)', 'kalendarz.tsx'), 'utf8');
    const napisy = (kal.match(/(?:placeholder|label)[^\n]*?["'`]([^"'`]{3,})["'`]/g) ?? []).join(' ')
      + (kal.match(/>\s*\{?\s*['"`][^'"`]{3,}['"`]/g) ?? []).join(' ');
    check('⛔ (W2, D5) na ekranie kalendarza NIE MA ani słowa o punktach ani o progu 45 minut',
      !/punkt|Punkt|próg 45|45 minut/.test(napisy),
      'ekran zdradza skalę punktową — zawodnik zacznie wpisywać liczbę pod skalę, a nie prawdę');
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
