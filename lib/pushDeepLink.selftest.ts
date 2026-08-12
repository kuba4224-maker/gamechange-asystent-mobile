// DEEPLINK R8 08.08.2026 — asercje dla lib/pushDeepLink.ts.
// SCROLL R13 08.08.2026 — trasa niesie parametry scrolla (?dawka=1&fb=…).
// Czysta logika, bez Supabase/RN, uruchamiana lokalnie poza appką:
//
//   npx tsx lib/pushDeepLink.selftest.ts
//
// Ten sam wzorzec co lib/focusBlockProgress.selftest.ts. Uruchom ponownie po
// każdej zmianie w lib/pushDeepLink.ts.
import { routeForPushData, safeFocusBlockId } from './pushDeepLink';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
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
