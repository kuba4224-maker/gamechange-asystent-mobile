// WIEDZA B4 08.08.2026 — NOWY PLIK, ale NIE nowe asercje.
//
// Runda 3 uruchomiła 12 asercji na `lib/labels.ts` po rename `mental` →
// „Odwaga w grze" (decyzja A1) i wszystkie przeszły — ale nigdzie ich nie
// zapisała, więc zniknęły razem z sesją. To jest dokładnie znalezisko N7
// z audytu po bloku 3: „tests/ nie należy do żadnego pasa, 55 scenariuszy
// zniknęło razem z sesją". Od rundy 4 `tests/` jest w pasie sesji, która rusza
// testowany plik — więc te asercje wracają na dysk.
//
//   npx tsx lib/labels.selftest.ts
//
// Albo razem z resztą: `node tests/run-selftests.mjs`.
//
// PRAKTYKA-EKRAN B6 08.08.2026 — doszło siedem asercji na formę kanoniczną
// nazw. NOTA: od 08.08.2026 formą kanoniczną jest MAŁA LITERA, zgodna
// z `coach.html`, `asystent_app.html`, e-mailami i pushami (decyzja Kuby).
// Cztery nazwy zmienione, klucze i „Odwaga w grze" nietknięte.
//
// PO CO ONE SĄ: `lib/labels.ts` jest jedynym źródłem nazw dla całej appki
// (blok B1). Każda zmiana w tym pliku zmienia jednocześnie Picker na ekranie
// Cele, hero Celu na Dziś, wynik diagnozy, kartę meczu i — od tej rundy —
// bibliotekę materiałów. Najgroźniejsza pomyłka nie jest widoczna na oko:
// przestawienie kolejności w `SEGMENTS_BY_PILLAR_IDS` po cichu zmienia
// kolejność pozycji w Pickerze, przez który zawodnik zakłada Cel.
import {
  SEGMENT_ORDER,
  SEGMENT_LABELS,
  segmentLabel,
  SEGMENTS_BY_PILLAR,
  SEGMENTS_BY_PILLAR_IDS,
  SEGMENT_PILLAR,
  BODY_LOCATIONS,
  BODY_LOCATION_LABELS,
  NON_LATERAL_LOCATIONS,
  // PLAN-D-A 08.2026 — słownik trzech poziomów (asercje na końcu pliku).
  CEL_LABEL,
  GARDLO_LABEL,
  GARDLO_LABEL_D,
  GARDLO_LABEL_B,
  GARDLO_LABEL_PL,
  GARDLO_LABEL_PL_D,
  BLOK_LABEL,
  BLOK_LABEL_D,
  BLOK_LABEL_PL,
  BLOK_CLOSE_LABEL,
  GARDLO_STOP_LABEL,
  GARDLO_DONE_LABEL,
  GARDLO_BADGE_DONE,
  GARDLO_BADGE_CLOSED,
  GARDLA_SCREEN_TITLE,
} from './labels';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

// PLAN-D-E 08.2026 — porównanie dwóch brzmień, celowo przez parametry typu
// `string`. Stałe z `lib/labels.ts` mają typy LITERAŁOWE, więc `A !== B`
// pisane wprost jest dla TypeScriptu porównaniem dwóch różnych literałów
// i `npx tsc --noEmit` zgłaszał tu osiem razy TS2367 („comparison appears to
// be unintentional").
//
// ⚠️ TA ASERCJA NIE JEST BEZCELOWA, mimo co mówi TypeScript. Pilnuje sytuacji,
// w której ktoś zrobi dwa brzmienia IDENTYCZNYMI — a wtedy typy się pokryją,
// TS2367 zniknie sam i jedyną rzeczą, która to złapie, będzie ten test.
// Przepuszczenie przez `string` zdejmuje szum, nie zdejmując sprawdzenia.
function rozne(a: string, b: string): boolean { return a !== b; }

// ─── 13 segmentów ───
check('13 segmentów w SEGMENT_ORDER', SEGMENT_ORDER.length === 13, String(SEGMENT_ORDER.length));
check('Zero duplikatów w SEGMENT_ORDER',
  new Set(SEGMENT_ORDER).size === 13, JSON.stringify(SEGMENT_ORDER));
check('Każde id ma nazwę',
  SEGMENT_ORDER.every((id) => !!SEGMENT_LABELS[id]),
  SEGMENT_ORDER.filter((id) => !SEGMENT_LABELS[id]).join(', '));
check('SEGMENT_LABELS nie ma nazwy dla id spoza SEGMENT_ORDER',
  Object.keys(SEGMENT_LABELS).every((id) => SEGMENT_ORDER.includes(id)),
  Object.keys(SEGMENT_LABELS).filter((id) => !SEGMENT_ORDER.includes(id)).join(', '));
check('Zero powtórzonych nazw (dwa segmenty pod jedną nazwą byłyby nie do rozróżnienia)',
  new Set(Object.values(SEGMENT_LABELS)).size === 13, JSON.stringify(Object.values(SEGMENT_LABELS)));

// ─── PRAKTYKA-EKRAN B6 08.08.2026: forma kanoniczna = MAŁA LITERA ───
// Decyzja Kuby z 08.08.2026. Cztery nazwy dostosowane do tego, jak mówi reszta
// systemu (`coach.html`, `asystent_app.html`, e-maile, pushe). Asercje są
// literalne, a nie regułowe („żadnej wielkiej litery w środku"), bo nazwa
// własna w środku nazwy segmentu jest w tym projekcie dopuszczalna i regułowa
// asercja wywaliłaby się przy pierwszej takiej.
check('B6: techFund = „Technika fundamentalna" (było „Fundamentalna")',
  SEGMENT_LABELS['techFund'] === 'Technika fundamentalna', SEGMENT_LABELS['techFund']);
check('B6: techSpec = „Technika specjalistyczna"',
  SEGMENT_LABELS['techSpec'] === 'Technika specjalistyczna', SEGMENT_LABELS['techSpec']);
check('B6: tolerancja = „Tolerancja obciążeń" (bez nawiasu — patrz nagłówek labels.ts)',
  SEGMENT_LABELS['tolerancja'] === 'Tolerancja obciążeń', SEGMENT_LABELS['tolerancja']);
check('B6: decyzja = „Szybkość decyzji"',
  SEGMENT_LABELS['decyzja'] === 'Szybkość decyzji', SEGMENT_LABELS['decyzja']);
check('B6: nawias zniknął z WSZYSTKICH nazw segmentów (był tylko w jednej)',
  !Object.values(SEGMENT_LABELS).some((v) => v.includes('(') || v.includes(')')),
  JSON.stringify(Object.values(SEGMENT_LABELS).filter((v) => v.includes('('))));
check('B6: KLUCZE nietknięte — to są id w bazie, nie etykiety',
  ['techFund', 'techSpec', 'tolerancja', 'decyzja'].every((k) => SEGMENT_ORDER.includes(k)),
  JSON.stringify(SEGMENT_ORDER));
check('B6: żadna z dziewięciu pozostałych nazw nie została przy okazji ruszona',
  SEGMENT_LABELS['moc'] === 'Moc' && SEGMENT_LABELS['wytrzymalosc'] === 'Wytrzymałość'
  && SEGMENT_LABELS['fizycznosc'] === 'Fizyczność' && SEGMENT_LABELS['regeneracja'] === 'Regeneracja'
  && SEGMENT_LABELS['odpornosc'] === 'Odporność' && SEGMENT_LABELS['odzywianie'] === 'Odżywienie'
  && SEGMENT_LABELS['koncentracja'] === 'Koncentracja' && SEGMENT_LABELS['percepcja'] === 'Percepcja'
  && SEGMENT_LABELS['mental'] === 'Odwaga w grze',
  JSON.stringify(SEGMENT_LABELS));

// ─── Rename `mental` (decyzja A1) ───
check('A1: `mental` = „Odwaga w grze"',
  SEGMENT_LABELS['mental'] === 'Odwaga w grze', SEGMENT_LABELS['mental']);
check('A1: stara nazwa „Stan Mentalny" nie została NIGDZIE w nazwach segmentów',
  !Object.values(SEGMENT_LABELS).some((v) => v.toLowerCase().includes('stan mentaln')),
  JSON.stringify(Object.values(SEGMENT_LABELS)));

// ─── Filary ───
check('Wypłaszczone SEGMENTS_BY_PILLAR daje DOKŁADNIE SEGMENT_ORDER '
  + '(czyli kolejność pozycji w Pickerze na ekranie Cele jest niezmieniona)',
  JSON.stringify(SEGMENTS_BY_PILLAR_IDS.flatMap(([, ids]) => ids)) === JSON.stringify(SEGMENT_ORDER),
  JSON.stringify(SEGMENTS_BY_PILLAR_IDS.flatMap(([, ids]) => ids)));
check('Pięć filarów', SEGMENTS_BY_PILLAR.length === 5, String(SEGMENTS_BY_PILLAR.length));
check('SEGMENTS_BY_PILLAR niesie nazwy zgodne z SEGMENT_LABELS (zero drugiej listy nazw)',
  SEGMENTS_BY_PILLAR.every(([, pairs]) => pairs.every(([id, name]) => SEGMENT_LABELS[id] === name)),
  'rozjazd nazw');
check('Każdy segment ma filar',
  SEGMENT_ORDER.every((id) => !!SEGMENT_PILLAR[id]),
  SEGMENT_ORDER.filter((id) => !SEGMENT_PILLAR[id]).join(', '));
check('Picker pokazuje nową nazwę w Filarze 4',
  SEGMENTS_BY_PILLAR.find(([p]) => p.startsWith('Filar 4'))?.[1]
    // PLAN-D-E 08.2026 — `=== true` dopisane: `?.` daje `boolean | undefined`,
    // a `check` bierze `boolean` (TS2345). Brak Filaru 4 to `undefined`,
    // czyli od teraz jawnie FAIL — i tak być powinno.
    .some(([id, name]) => id === 'mental' && name === 'Odwaga w grze') === true,
  JSON.stringify(SEGMENTS_BY_PILLAR.find(([p]) => p.startsWith('Filar 4'))));

// ─── Odwrót na surowe id ───
check('segmentLabel zwraca nazwę dla znanego id',
  segmentLabel('moc') === 'Moc', segmentLabel('moc'));
check('segmentLabel NIGDY nie zwraca pustego — nieznane id wraca jako id',
  segmentLabel('nie-ma-takiego') === 'nie-ma-takiego', segmentLabel('nie-ma-takiego'));

// ─── 17 lokalizacji bólu ───
check('17 lokalizacji bólu', BODY_LOCATIONS.length === 17, String(BODY_LOCATIONS.length));
check('BODY_LOCATION_LABELS zgodne z BODY_LOCATIONS',
  BODY_LOCATIONS.every(([id, name]) => BODY_LOCATION_LABELS[id] === name), 'rozjazd');
check('Każda lokalizacja bez strony (lewa/prawa) istnieje na liście lokalizacji',
  Array.from(NON_LATERAL_LOCATIONS).every((id) => BODY_LOCATIONS.some(([bid]) => bid === id)),
  Array.from(NON_LATERAL_LOCATIONS).join(', '));

// ═══════════════════════════════════════════════════════════════
// PLAN-D-A 08.2026 (11.08.2026) — SŁOWNIK TRZECH POZIOMÓW
//
// Decyzja Kuby z 10.08.2026: CEL (lata, jeden) · WĄSKIE GARDŁO (miesiące) ·
// BLOK (4–8 tygodni). Do tej daty produkt mówił „Cel" na dwie różne rzeczy
// naraz, a trzecia nazywała się „Blok Skupienia".
//
// PO CO TE ASERCJE. Zmiana nazw wygląda na najbezpieczniejszą rzecz w całym
// projekcie i właśnie dlatego jest groźna: nikt jej nie testuje, a cofnąć ją
// można jedną literą przy okazji zupełnie innej pracy. Trzy rzeczy, które
// muszą zostać prawdziwe:
//   1. słowo „Porzuć" NIE WRACA — zawodnik nie porzuca niczego;
//   2. „Blok Skupienia" NIE WRACA — to nazwa, której nikt nie używa w rozmowie;
//   3. słowo „Cel" zostaje WYŁĄCZNIE dla poziomu 1 — moment, w którym wróci
//      do `goals`, jest momentem, w którym cały słownik przestaje działać.
// ═══════════════════════════════════════════════════════════════

const POZIOMY: [string, string][] = [
  ['CEL_LABEL', CEL_LABEL],
  ['GARDLO_LABEL', GARDLO_LABEL],
  ['GARDLO_LABEL_D', GARDLO_LABEL_D],
  ['GARDLO_LABEL_B', GARDLO_LABEL_B],
  ['GARDLO_LABEL_PL', GARDLO_LABEL_PL],
  ['GARDLO_LABEL_PL_D', GARDLO_LABEL_PL_D],
  ['BLOK_LABEL', BLOK_LABEL],
  ['BLOK_LABEL_D', BLOK_LABEL_D],
  ['BLOK_LABEL_PL', BLOK_LABEL_PL],
  ['BLOK_CLOSE_LABEL', BLOK_CLOSE_LABEL],
  ['GARDLO_STOP_LABEL', GARDLO_STOP_LABEL],
  ['GARDLO_DONE_LABEL', GARDLO_DONE_LABEL],
  ['GARDLO_BADGE_DONE', GARDLO_BADGE_DONE],
  ['GARDLO_BADGE_CLOSED', GARDLO_BADGE_CLOSED],
  ['GARDLA_SCREEN_TITLE', GARDLA_SCREEN_TITLE],
];

// ─── Nic nie jest puste ───
check('żadne brzmienie słownika nie jest puste',
  POZIOMY.every(([, v]) => typeof v === 'string' && v.trim().length > 0),
  POZIOMY.filter(([, v]) => !v || !v.trim()).map(([k]) => k).join(', ') || 'ok');

// ─── Zakaz 1: „Porzuć" znika z produktu ───
check('ani jedno brzmienie nie zawiera „Porzuć"/„Porzucony"',
  POZIOMY.every(([, v]) => !/porzu/i.test(v)),
  POZIOMY.filter(([, v]) => /porzu/i.test(v)).map(([k, v]) => `${k}="${v}"`).join(', ') || 'ok');
check('odznaka statusu abandoned NIE brzmi „Porzucony"',
  rozne(GARDLO_BADGE_CLOSED, 'Porzucony'), GARDLO_BADGE_CLOSED);

// ─── Zakaz 2: „Blok Skupienia" znika z produktu ───
check('ani jedno brzmienie nie zawiera „Blok Skupienia"',
  POZIOMY.every(([, v]) => !/Blok\w*\s+Skupienia/i.test(v)),
  POZIOMY.filter(([, v]) => /Skupienia/i.test(v)).map(([k]) => k).join(', ') || 'ok');

// ─── Zakaz 3: słowo „Cel" należy WYŁĄCZNIE do poziomu 1 ───
// To jest najważniejsza asercja w tej sekcji. Jeśli „Cel" wróci do brzmień
// opisujących `goals` albo `focus_blocks`, zawodnik znowu zobaczy jedno słowo
// w dwóch znaczeniach — czyli dokładnie to, co ta decyzja miała usunąć.
check('„Cel" pada TYLKO w CEL_LABEL, w żadnym brzmieniu wąskiego gardła ani Bloku',
  POZIOMY.filter(([k]) => k !== 'CEL_LABEL').every(([, v]) => !/\bcel/i.test(v)),
  POZIOMY.filter(([k, v]) => k !== 'CEL_LABEL' && /\bcel/i.test(v)).map(([k, v]) => `${k}="${v}"`).join(', ') || 'ok');
check('CEL_LABEL to dokładnie „Cel" — kierunek na lata, jeden',
  CEL_LABEL === 'Cel', CEL_LABEL);

// ─── Trzy poziomy są od siebie odróżnialne ───
check('CEL, WĄSKIE GARDŁO i BLOK to trzy RÓŻNE słowa',
  new Set([CEL_LABEL, GARDLO_LABEL, BLOK_LABEL]).size === 3,
  [CEL_LABEL, GARDLO_LABEL, BLOK_LABEL].join(' / '));
check('WĄSKIE GARDŁO to „Wąskie gardło"', GARDLO_LABEL === 'Wąskie gardło', GARDLO_LABEL);
check('BLOK to „Blok" — bez przymiotnika', BLOK_LABEL === 'Blok', BLOK_LABEL);

// ─── Odmiana jest wypisana, nie sklejana ───
// Polskiego dopełniacza nie da się wyprowadzić z mianownika regułą, której ktoś
// później nie odczyta — dlatego formy stoją w pliku osobno. Ta asercja łapie
// najczęstszą pomyłkę przy dopisywaniu: skopiowanie mianownika w miejsce odmiany.
check('dopełniacz liczby pojedynczej różni się od mianownika',
  rozne(GARDLO_LABEL_D, GARDLO_LABEL), `${GARDLO_LABEL} / ${GARDLO_LABEL_D}`);
check('liczba mnoga różni się od pojedynczej',
  rozne(GARDLO_LABEL_PL, GARDLO_LABEL), `${GARDLO_LABEL} / ${GARDLO_LABEL_PL}`);
check('dopełniacz liczby mnogiej różni się od mianownika mnogiego',
  rozne(GARDLO_LABEL_PL_D, GARDLO_LABEL_PL), `${GARDLO_LABEL_PL} / ${GARDLO_LABEL_PL_D}`);
check('dopełniacz Bloku różni się od mianownika',
  rozne(BLOK_LABEL_D, BLOK_LABEL), `${BLOK_LABEL} / ${BLOK_LABEL_D}`);
check('wszystkie formy wąskiego gardła mówią o gardle',
  [GARDLO_LABEL, GARDLO_LABEL_D, GARDLO_LABEL_B, GARDLO_LABEL_PL, GARDLO_LABEL_PL_D]
    .every((v) => /gard/i.test(v)), 'rozjazd form');

// ─── Przyciski rozdzielają odpowiedzialność (sekcja 2 decyzji) ───
check('przycisk zamknięcia Bloku mówi o Bloku', /blok/i.test(BLOK_CLOSE_LABEL), BLOK_CLOSE_LABEL);
check('wyjście awaryjne z wąskiego gardła NIE mówi o Bloku (to inny poziom)',
  !/blok/i.test(GARDLO_STOP_LABEL), GARDLO_STOP_LABEL);
check('dwa wyjścia z wąskiego gardła to dwa RÓŻNE brzmienia',
  rozne(GARDLO_DONE_LABEL, GARDLO_STOP_LABEL), `${GARDLO_DONE_LABEL} / ${GARDLO_STOP_LABEL}`);
check('odznaki w historii są rozróżnialne',
  rozne(GARDLO_BADGE_DONE, GARDLO_BADGE_CLOSED), `${GARDLO_BADGE_DONE} / ${GARDLO_BADGE_CLOSED}`);

// ─── Tytuł ekranu ───
check('tytuł ekranu to liczba mnoga wąskich gardeł',
  GARDLA_SCREEN_TITLE === GARDLO_LABEL_PL, `${GARDLA_SCREEN_TITLE} / ${GARDLO_LABEL_PL}`);
check('tytuł ekranu NIE brzmi już „Cele"', rozne(GARDLA_SCREEN_TITLE, 'Cele'), GARDLA_SCREEN_TITLE);

console.log(`\n${passed} passed, ${failed} failed`);
// Celowo `throw`, a nie `process.exit(1)`: `process` wymaga `@types/node`,
// których tsconfig appki nie zaciąga — a te pliki są objęte `npx tsc --noEmit`
// (include: `**/*.ts`). Rzucony wyjątek daje ten sam niezerowy kod wyjścia,
// więc `tests/run-selftests.mjs` rozpoznaje porażkę tak samo.
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
