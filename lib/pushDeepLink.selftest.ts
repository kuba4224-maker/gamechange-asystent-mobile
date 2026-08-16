// DEEPLINK R8 08.08.2026 — asercje dla lib/pushDeepLink.ts.
// SCROLL R13 08.08.2026 — trasa niesie parametry scrolla (?dawka=1&fb=…).
// Czysta logika, bez Supabase/RN, uruchamiana lokalnie poza appką:
//
//   npx tsx lib/pushDeepLink.selftest.ts
//
// Ten sam wzorzec co lib/focusBlockProgress.selftest.ts. Uruchom ponownie po
// każdej zmianie w lib/pushDeepLink.ts.
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75)
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — nazwane liczbą, nie odczuciem. Ten plik miał 11 ASERCJI
// i ANI JEDNEJ, która czytałaby jakikolwiek EKRAN. Sprawdzał wyłącznie własny
// moduł przez `import`: jedenaście razy „przy takim `data` trasa ma być taka".
// Ani razu „ktokolwiek tę trasę bierze i ktokolwiek na nią odpowiada".
//
// ⚠️ ZMIERZONE 16.08.2026: ŻADEN plik w `app/` ani `components/` nie importuje
// `lib/pushDeepLink`. Jedynym konsumentem jest `lib/push-notifications.ts`
// (hook `usePushDeepLink`), a ten jest montowany z `app/_layout.tsx`. Ekranem
// DOCELOWYM jest `app/(tabs)/cele.tsx` — i on nie wie nic o module, tylko czyta
// parametry trasy. Ścieżka, którą pilnuje sekcja 0, ma więc cztery ogniwa:
//
//   lib/pushDeepLink.ts → lib/push-notifications.ts → app/_layout.tsx
//                                                   → app/(tabs)/cele.tsx
//
// ⛔ Każde z tych ogniw da się urwać bez zapalenia jednej z 11 asercji niżej,
// a zawodnik dotyka wtedy powiadomienia „masz nową dawkę" i ląduje gdzie
// indziej — albo nie ląduje nigdzie.
//
// ⭐ EKRAN DOCELOWY NIE JEST TU WPISANY RĘCZNIE. Jest WYPROWADZONY z trasy,
// którą zwraca sam moduł (`routeForPushData`) — nazwa pliku z części
// ścieżkowej, nazwy parametrów z części zapytania. Dzięki temu podmiana trasy
// w module na taką, której nie obsługuje żaden ekran, zapala tę sekcję.
//
// ⚠️ CZEGO TA SEKCJA NIE UDAJE. Czyta źródła JAKO TEKST. Nie uruchamia Reacta
// ani routera i nie wie, czy nawigacja naprawdę doszła. Podmiana wywołania na
// inne, równie zepsute, przejdzie tu niezauważona.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (O53): `tsconfig.json` ciągnie DOM, więc `tsc`
// pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { routeForPushData, safeFocusBlockId } from './pushDeepLink';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ 0. PAS I2 16.08.2026 — DOKĄD PROWADZI DOTKNIĘCIE PUSHA (K4 / O75)
// ═══════════════════════════════════════════════════════════════════

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — `app/(tabs)/cele.tsx` CYTUJE w komentarzu całą trasę
 * („Push z dawką prowadzi na '/cele?dawka=1&fb=<id Bloku>'"), a
 * `lib/push-notifications.ts` cytuje nazwę hooka. Strażnik czytający surowy
 * tekst przechodziłby więc na cudzej dokumentacji, a jedynym sposobem, żeby go
 * zapalić, byłoby skasowanie wyjaśnienia.
 */
const bezKomentarzy = (s: string): string => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .join('\n');

/**
 * ⛔ BRAK PLIKU JEST FAIL-em Z NAZWĄ, nie wyjątkiem `ENOENT` (O76).
 * Strażnik, który pada przed pierwszą asercją, w CI wygląda jak awaria
 * narzędzia — a jest EKRANEM, KTÓRY ZNIKNĄŁ Z REPOZYTORIUM.
 */
const BRAK_PLIKOW: string[] = [];
const surowe = (wzgledna: string): string => {
  const p = join(root, wzgledna);
  if (!existsSync(p)) { BRAK_PLIKOW.push(wzgledna); return ''; }
  return readFileSync(p, 'utf8');
};

const PLIK_POSREDNIK = 'lib/push-notifications.ts';
const PLIK_LAYOUT = 'app/_layout.tsx';
const posrednik = bezKomentarzy(surowe(PLIK_POSREDNIK));
const layout = bezKomentarzy(surowe(PLIK_LAYOUT));

{
  console.log('0. DOKĄD PROWADZI DOTKNIĘCIE PUSHA (K4 / O75)');

  check('⛔ (I2-0) każdy plik z listy strażnika istnieje i daje się odczytać',
    BRAK_PLIKOW.length === 0,
    `NIE MA TYCH PLIKÓW: ${BRAK_PLIKOW.join(', ')} — zmieniła się nazwa albo miejsce pliku. `
    + 'Popraw listę w tym pliku ALBO przywróć plik; do tego czasu asercje niżej '
    + 'czytają PUSTY tekst i nie znaczą nic.');

  // ── Odkrywanie z katalogu, nie lista na sztywno (O69) ──
  const POMIN_KAT = new Set(['_diag_backup', 'node_modules', '.git', '.expo', 'assets']);
  function chodz(katalog: string, out: string[] = []): string[] {
    if (!existsSync(katalog)) return out;
    for (const wpis of readdirSync(katalog)) {
      if (POMIN_KAT.has(wpis)) continue;
      const p = join(katalog, wpis);
      if (statSync(p).isDirectory()) chodz(p, out);
      else if (p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p);
    }
    return out;
  }
  const wzgledne = (k: string[]) => k
    .flatMap((x) => chodz(join(root, x)))
    .map((p) => relative(root, p).split(sep).join('/'))
    .filter((p) => !p.endsWith('.selftest.ts'))
    .sort();
  const EKRANY = wzgledne(['app', 'components']);
  const CALE_REPO = wzgledne(['app', 'components', 'lib']);
  const tresc = new Map<string, string>(
    CALE_REPO.map((p) => [p, bezKomentarzy(readFileSync(join(root, p), 'utf8'))]));

  const rowneZbiory = (zmierzone: string[], oczekiwane: string[]) => {
    const brakujacy = oczekiwane.filter((p) => !zmierzone.includes(p));
    const nadmiarowi = zmierzone.filter((p) => !oczekiwane.includes(p));
    return { ok: brakujacy.length === 0 && nadmiarowi.length === 0, brakujacy, nadmiarowi };
  };

  // ⭐ ZMIERZONE 16.08.2026 na `main` = `123e09c`: ZERO. To jest ZNALEZISKO,
  // nie porażka — decyzja „dokąd prowadzi dotknięcie" mieszka CELOWO w warstwie
  // nasłuchu (`usePushDeepLink`), nie na ekranie. Asercja pilnuje RÓWNOŚCI
  // z zerem (O73): drugi konsument na ekranie znaczyłby DWIE odpowiedzi na to
  // samo pytanie, a rozjazd między nimi jest niewidoczny do chwili, w której
  // zawodnik dotknie powiadomienia.
  const wprost = EKRANY.filter((p) => /from\s+'[^']*\/pushDeepLink'/.test(tresc.get(p) ?? ''));
  check('⭐ (I2-0) ŻADEN ekran nie importuje `pushDeepLink` wprost — RÓWNOŚĆ z zerem zmierzonym 16.08 (O73)',
    wprost.length === 0,
    `importują wprost: ${wprost.join(', ')} — pojawiło się drugie miejsce, które rozstrzyga, dokąd `
    + 'prowadzi dotknięcie pusha. Dwa rozstrzygnięcia rozjadą się po cichu i zawodnik z tym samym '
    + 'powiadomieniem trafi raz tu, raz tam.');

  // ⚠️ Bez `lib/pushDeepLink.ts` — to jest sam moduł, czyli miejsce DEFINICJI
  // funkcji, nie jej konsument. Wpuszczenie go tu robiłoby ze strażnika kółko:
  // „moduł woła sam siebie" spełniałoby asercję o istnieniu konsumenta.
  const woalajacy = CALE_REPO
    .filter((p) => p !== 'lib/pushDeepLink.ts')
    .filter((p) => /\brouteForPushData\s*\(/.test(tresc.get(p) ?? ''));
  const rw = rowneZbiory(woalajacy, [PLIK_POSREDNIK]);
  check('⭐ (I2-0) trasę wylicza DOKŁADNIE jeden plik w repozytorium — pośrednik (O73)',
    rw.ok,
    `WOŁAJĄ routeForPushData: ${woalajacy.join(', ') || 'ŻADEN PLIK'} (oczekiwany dokładnie: ${PLIK_POSREDNIK}) `
    + '→ ZERO znaczy, że moduł jest producentem bez konsumenta i 11 asercji niżej opisuje funkcję, '
    + 'której nikt nie woła; więcej niż jeden znaczy dwie trasy z jednego dotknięcia.');

  const konsumenciPosrednika = EKRANY.filter((p) => /from\s+'[^']*\/push-notifications'/.test(tresc.get(p) ?? ''));
  const rp = rowneZbiory(konsumenciPosrednika, [PLIK_LAYOUT]);
  check('⭐ (I2-0) nasłuch dotknięć montuje DOKŁADNIE `app/_layout.tsx` — zmierzone 16.08 (O73)',
    rp.ok,
    `BRAKUJE: ${rp.brakujacy.join(', ') || '—'} · NADMIAROWI: ${rp.nadmiarowi.join(', ') || '—'} `
    + '→ ubył: nikt nie nasłuchuje dotknięć powiadomień i dotknięcie „masz nową dawkę" nie robi NIC; '
    + 'doszedł: dwa nasłuchy na jedno dotknięcie, czyli dwa skoki routera pod palcem zawodnika.');

  // ── ⭐ ZAPADKA NA SKASOWANIE: hook musi być NAPRAWDĘ zamontowany ──
  check('⭐ (I2-0) `_layout.tsx` NAPRAWDĘ woła `usePushDeepLink(` — sam import niczego nie nasłuchuje',
    /\busePushDeepLink\s*\(/.test(layout),
    'został import bez wywołania; wszystkie asercje o kształcie trasy spełnia też appka, w której '
    + 'dotknięcie powiadomienia z nową dawką nie prowadzi donikąd');

  // ⚠️ `router.push` przed montażem nawigatora jest ignorowany albo rzuca —
  // dlatego hook dostaje warunek, a nie `true`.
  const argHooka = (layout.match(/usePushDeepLink\(([^;]*)\)/) ?? ['', ''])[1];
  check('⛔ (I2-0) nasłuch włączony DOPIERO przy zamontowanym nawigatorze — nie na sztywno `true`',
    /session/.test(argHooka) && /locked/.test(argHooka)
    && /profileReady/.test(argHooka) && /onboardingSeen/.test(argHooka),
    `argument \`usePushDeepLink\`: ${argHooka.trim() || '(nie znalazłem wywołania)'} — nasłuch włączony `
    + 'zanim `<Slot />` jest zamontowany znaczy, że `router.push` z zimnego startu idzie w próżnię: '
    + 'zawodnik dotyka powiadomienia, appka się otwiera i staje tam, gdzie stała');

  check('⭐ (I2-0) `_layout.tsx` NAPRAWDĘ renderuje `<Slot />` — bez nawigatora nie ma dokąd nawigować',
    /<\s*Slot\s*\/?>/.test(layout),
    'zniknął nawigator; warunek włączenia hooka jest wtedy spełniony wobec czegoś, czego nie ma, '
    + 'a trasa z pusha nie ma się gdzie otworzyć');

  check('⛔ (I2-0) `_layout.tsx` NIE rozstrzyga sam, dokąd prowadzi push',
    !/routeForPushData/.test(layout) && !/dawka=/.test(layout),
    'na ekranie startowym pojawiło się drugie miejsce, które buduje trasę z pusha; wtedy filtr kształtu '
    + '`safeFocusBlockId` (R4 — wartość zewnętrznego pochodzenia) przestaje obowiązywać na tej ścieżce');

  // ── Pośrednik: OBIE ścieżki dotknięcia, nie jedna ──
  // Zimny start (push OTWORZYŁ appkę) i appka już otwarta to DWA różne
  // wywołania systemu. Obsłużenie jednego z nich wygląda w kodzie na komplet.
  const ileTras = (posrednik.match(/routeForPushData\s*\(/g) ?? []).length;
  check('⛔ (I2-0) pośrednik pyta o trasę na OBU ścieżkach — zimny start i appka otwarta',
    ileTras === 2
    && /getLastNotificationResponseAsync\(/.test(posrednik)
    && /addNotificationResponseReceivedListener\(/.test(posrednik),
    `wywołań routeForPushData w pośredniku: ${ileTras} (mają być 2, po jednym na ścieżkę) — `
    + 'brak ścieżki zimnego startu znaczy, że zawodnik, który dotknął powiadomienia przy WYŁĄCZONEJ '
    + 'appce (czyli w najczęstszym przypadku), otwiera appkę na ekranie „Dziś" i sam ma szukać dawki');

  // ⛔ `null` z modułu znaczy „NIE nawiguj". Wymuszenie (`route!`) zamienia
  // zwykłe pytanie kontrolne w teleport.
  const ilePush = (posrednik.match(/if\s*\(route\)\s*router\.push\(route\)/g) ?? []).length;
  check('⛔ (I2-0) pośrednik nawiguje WYŁĄCZNIE gdy moduł zwrócił trasę — `null` znaczy „nie ruszaj"',
    ilePush === ileTras && !/router\.push\(\s*route\s*!/.test(posrednik),
    `strzeżonych \`router.push\`: ${ilePush} przy ${ileTras} wyliczeniach trasy — dotknięcie ZWYKŁEGO `
    + 'pytania kontrolnego (bez dawki) zaczęło przenosić zawodnika na Cele; moduł mówi wtedy `null`, '
    + 'a pośrednik i tak skacze');

  check('⛔ (I2-0) pośrednik NIE skleja trasy sam — cały tekst trasy pochodzi z modułu',
    !/['"`]\/cele/.test(posrednik) && !/dawka=/.test(posrednik),
    'w warstwie nasłuchu stanęła kopia trasy; kopia rozjedzie się z `PushDeepLinkRoute` po cichu, '
    + 'a `tsc` tego nie złapie, bo to zwykły napis');

  // ── ⭐ EKRAN DOCELOWY WYPROWADZONY Z TRASY MODUŁU, nie wpisany ręcznie ──
  const TRASA_PROBNA = routeForPushData({
    type: 'focus_block_checkin', contentDose: true, focusBlockId: 'fbI2TEST',
  });
  const [sciezka, zapytanie] = (TRASA_PROBNA ?? '').split('?');
  const nazwaTrasy = sciezka.replace(/^\//, '');
  const pary = (zapytanie ?? '').split('&').filter(Boolean).map((p) => p.split('='));
  const PARAMY = pary.map(([k]) => k);
  const wartoscDawki = (pary.find(([k]) => k === 'dawka') ?? ['', ''])[1];

  const kandydaci = EKRANY.filter((p) => p.startsWith('app/') && p.endsWith(`/${nazwaTrasy}.tsx`));
  check('⭐ (I2-0) trasa z modułu wskazuje DOKŁADNIE JEDEN istniejący ekran (odkryty z katalogu)',
    !!TRASA_PROBNA && !!nazwaTrasy && kandydaci.length === 1,
    `trasa modułu: ${TRASA_PROBNA ?? 'null'} → szukany ekran: app/**/${nazwaTrasy || '???'}.tsx → `
    + `znalezione: ${kandydaci.join(', ') || 'ŻADEN'} — moduł prowadzi zawodnika pod adres, pod którym `
    + 'w tym repozytorium nie ma ekranu; dotknięcie powiadomienia kończy się pustym ekranem albo powrotem');

  const PLIK_CEL = kandydaci[0] ?? '';
  const cel = tresc.get(PLIK_CEL) ?? '';

  check('⭐ (I2-0) ekran docelowy CZYTA wszystkie parametry, które moduł wkłada w trasę',
    PARAMY.length > 0 && /useLocalSearchParams/.test(cel)
    && PARAMY.every((n) => new RegExp(`\\b${n}\\s*\\??\\s*:`).test(cel) && new RegExp(`\\.${n}\\b`).test(cel)),
    `parametry trasy modułu: ${PARAMY.join(', ') || '(brak)'} · ekran: ${PLIK_CEL || '(nie znaleziony)'} — `
    + 'ekran przestał czytać któryś z parametrów; zawodnik dotyka „masz nową dawkę", trafia na właściwą '
    + 'zakładkę i ląduje na jej GÓRZE, a dawka leży w karcie Bloku gdzieś niżej — czyli dokładnie ta '
    + 'jedna rzecz, po którą przyszedł, znów jest za szukaniem');

  check('⛔ (I2-0) ekran porównuje `dawka` z TĄ SAMĄ wartością, którą wkłada moduł',
    !!wartoscDawki && new RegExp(`dawka\\s*!==\\s*'${wartoscDawki}'`).test(cel),
    `moduł wkłada dawka=${wartoscDawki || '(brak)'}, a ekran ${PLIK_CEL} nie porównuje z tą wartością — `
    + 'wartości rozeszły się i skok nie wykona się nigdy, choć obie strony wyglądają na poprawne');

  // ── ⭐ ZAPADKA NA SKASOWANIE ──
  check('⭐ (I2-0) ekran docelowy NAPRAWDĘ przewija do karty Bloku — decyzję dokąd bierze z `doseScrollY`',
    /const\s+target\s*=\s*doseScrollY\(/.test(cel) && /scrollTo\(\{\s*y:\s*target/.test(cel),
    'zniknął sam skok albo ekran zaczął liczyć cel skoku sam; wszystkie asercje wyżej spełnia też ekran, '
    + 'który czyta parametry i nic z nimi nie robi');

  check('⛔ (I2-0) ekran NIE przewija, gdy `doseScrollY` nie wie dokąd (`null`) — zły skok gorszy niż żaden',
    /if\s*\(target\s*===\s*null\)\s*return/.test(cel),
    'ekran skacze także wtedy, gdy pozycja karty nie jest jeszcze zmierzona albo `fb` jest nieznane — '
    + 'zawodnik trafia na przypadkowe miejsce listy i nie wie, czy to jest ta dawka');
}

check('push z nową dawką (boolean true) → /cele z parametrami scrolla i id Bloku',
  routeForPushData({ type: 'focus_block_checkin', focusBlockId: 'fb1', checkinId: 'c1', contentDose: true }) === '/cele?dawka=1&fb=fb1',
  String(routeForPushData({ type: 'focus_block_checkin', focusBlockId: 'fb1', contentDose: true })));

check("push z nową dawką PO FCM (string 'true' — send-push.js stringifikuje data) → ta sama trasa",
  routeForPushData({ type: 'focus_block_checkin', focusBlockId: 'fb1', checkinId: 'c1', contentDose: 'true' }) === '/cele?dawka=1&fb=fb1',
  String(routeForPushData({ type: 'focus_block_checkin', focusBlockId: 'fb1', contentDose: 'true' })));

check('dawka BEZ focusBlockId → /cele?dawka=1 (nawigacja działa, scroll po prostu nie wie dokąd)',
  routeForPushData({ type: 'focus_block_checkin', contentDose: true }) === '/cele?dawka=1',
  String(routeForPushData({ type: 'focus_block_checkin', contentDose: true })));

check('R13/R4: focusBlockId o podejrzanym kształcie NIE wchodzi do URL-a — trasa bez fb',
  routeForPushData({ type: 'focus_block_checkin', focusBlockId: 'a&b=c?d', contentDose: true }) === '/cele?dawka=1'
  && routeForPushData({ type: 'focus_block_checkin', focusBlockId: 'x'.repeat(65), contentDose: true }) === '/cele?dawka=1'
  && routeForPushData({ type: 'focus_block_checkin', focusBlockId: 123, contentDose: true }) === '/cele?dawka=1',
  String(routeForPushData({ type: 'focus_block_checkin', focusBlockId: 'a&b=c?d', contentDose: true })));

check('R13: safeFocusBlockId przepuszcza uuid, odrzuca separatory URL-a i nie-stringi',
  safeFocusBlockId('550e8400-e29b-41d4-a716-446655440000') === '550e8400-e29b-41d4-a716-446655440000'
  && safeFocusBlockId('fb_1-A') === 'fb_1-A'
  && safeFocusBlockId('a/b') === null && safeFocusBlockId('a b') === null
  && safeFocusBlockId('') === null && safeFocusBlockId(null) === null,
  'filtr kształtu przecieka');

check('zwykłe pytanie kontrolne (bez contentDose) → null, domyślne zachowanie systemu',
  routeForPushData({ type: 'focus_block_checkin', focusBlockId: 'fb1', checkinId: 'c1' }) === null,
  String(routeForPushData({ type: 'focus_block_checkin' })));

check("contentDose: 'false' (kształt po FCM) → null — string nie jest prawdą",
  routeForPushData({ type: 'focus_block_checkin', contentDose: 'false' }) === null,
  String(routeForPushData({ type: 'focus_block_checkin', contentDose: 'false' })));

check('contentDose bez właściwego type → null (pole nie działa w oderwaniu od typu pusha)',
  routeForPushData({ type: 'focus_block_maintenance', contentDose: true }) === null,
  String(routeForPushData({ type: 'focus_block_maintenance', contentDose: true })));

check('pusty data → null', routeForPushData({}) === null, String(routeForPushData({})));
check('null → null (dotknięcie pusha bez data nie teleportuje)',
  routeForPushData(null) === null, String(routeForPushData(null)));
check('nie-obiekt → null', routeForPushData('focus_block_checkin') === null,
  String(routeForPushData('focus_block_checkin')));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
