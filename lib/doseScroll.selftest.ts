// SCROLL R13 08.08.2026 — asercje dla lib/doseScroll.ts. Czysta logika:
//
//   npx tsx lib/doseScroll.selftest.ts
//
// Uruchom ponownie po każdej zmianie w lib/doseScroll.ts.
import { doseScrollY, firstParam, DOSE_SCROLL_MARGIN } from './doseScroll';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

const mapa = (obj: Record<string, number>) => new Map(Object.entries(obj));

check('bez dawka=1 → null (zwykłe wejście w zakładkę Cele nie skacze)',
  doseScrollY({ dawka: null, fb: 'fb1', cardYByBlockId: mapa({ fb1: 400 }) }) === null
  && doseScrollY({ dawka: '0', fb: 'fb1', cardYByBlockId: mapa({ fb1: 400 }) }) === null,
  'skoczyło bez powodu');

check('dawka=1 + fb zmierzony → y karty minus margines',
  doseScrollY({ dawka: '1', fb: 'fb1', cardYByBlockId: mapa({ fb1: 400, fb2: 900 }) }) === 400 - DOSE_SCROLL_MARGIN,
  String(doseScrollY({ dawka: '1', fb: 'fb1', cardYByBlockId: mapa({ fb1: 400, fb2: 900 }) })));

check('karta blisko góry: wynik nigdy nie jest ujemny',
  doseScrollY({ dawka: '1', fb: 'fb1', cardYByBlockId: mapa({ fb1: 4 }) }) === 0,
  String(doseScrollY({ dawka: '1', fb: 'fb1', cardYByBlockId: mapa({ fb1: 4 }) })));

check('fb wskazany, ale jeszcze niezmierzony → null (czekamy na layout, nie zgadujemy)',
  doseScrollY({ dawka: '1', fb: 'fb9', cardYByBlockId: mapa({ fb1: 400 }) }) === null, 'skoczyło do złej karty');

check('bez fb: dokładnie jedna karta Bloku → scroll do niej',
  doseScrollY({ dawka: '1', fb: null, cardYByBlockId: mapa({ fb1: 700 }) }) === 700 - DOSE_SCROLL_MARGIN,
  String(doseScrollY({ dawka: '1', fb: null, cardYByBlockId: mapa({ fb1: 700 }) })));

check('bez fb: kilka kart → null (scroll do złej dawki gorszy niż brak scrolla)',
  doseScrollY({ dawka: '1', fb: null, cardYByBlockId: mapa({ fb1: 700, fb2: 1200 }) }) === null, 'zgadywało');

check('bez fb: zero zmierzonych kart → null (nic do pokazania)',
  doseScrollY({ dawka: '1', fb: null, cardYByBlockId: new Map() }) === null, 'skoczyło w pustkę');

check('firstParam: string zostaje, tablica bierze pierwszy, reszta → null (kształt z expo-routera, R4)',
  firstParam('x') === 'x' && firstParam(['a', 'b']) === 'a'
  && firstParam(undefined) === null && firstParam(7) === null && firstParam([]) === null,
  'parametr trasy źle znormalizowany');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
