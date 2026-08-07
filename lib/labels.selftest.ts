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
} from './labels';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

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
    .some(([id, name]) => id === 'mental' && name === 'Odwaga w grze'),
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

console.log(`\n${passed} passed, ${failed} failed`);
// Celowo `throw`, a nie `process.exit(1)`: `process` wymaga `@types/node`,
// których tsconfig appki nie zaciąga — a te pliki są objęte `npx tsc --noEmit`
// (include: `**/*.ts`). Rzucony wyjątek daje ten sam niezerowy kod wyjścia,
// więc `tests/run-selftests.mjs` rozpoznaje porażkę tak samo.
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
