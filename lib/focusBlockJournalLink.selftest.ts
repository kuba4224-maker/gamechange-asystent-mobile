// ZAPIS B7 08.08.2026 — asercje logiki „dziennik zasila wskaźnik Celu".
// Uruchomienie: npx tsx lib/focusBlockJournalLink.selftest.ts
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75)
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — nazwane liczbą, nie odczuciem. Ten plik miał 28 ASERCJI
// i ANI JEDNEJ, która czytałaby jakikolwiek EKRAN. Jedyny `readFileSync`
// czytał `lib/focusBlockJournalLink.ts`, czyli WŁASNY MODUŁ. Audyt H1 (15.08)
// podał commit „z defektem" `f54bc0b` — STARSZY niż commit narodzin modułu
// i tego strażnika (`d3eecad`, 07.08). To jest błąd H1 (O74): na `f54bc0b`
// tego modułu jeszcze nie było.
//
// DLACZEGO TO JEST GROŹNE AKURAT TUTAJ. Ten moduł pilnuje, żeby ZALICZENIE
// SESJI BLOKU miało JEDEN nośnik prawdy (`daily_logs.calendar_event_id`)
// i jedną decyzję (`decideSessionCompletion`). Zawodnik po treningu dostaje
// JEDNO pytanie zamiast pickera, a jego „Tak" ma przesunąć pasek Celu
// i postawić `status='completed'` na wydarzeniu. Gdyby ekran policzył ten sam
// warunek DRUGI RAZ u siebie — a przed pasem A1 właśnie tak było — produkt
// stawia znacznik i mówi „Zapisano." albo odwrotnie: mówi „Sesja doliczona
// do paska Twojego Celu ✓" i nie dolicza jej nigdzie. Zawodnik nie ma jak
// tej różnicy zobaczyć, a 28 asercji świeciło 28 na 28.
//
// ⚠️ CZEGO TA SEKCJA NIE UDAJE. Czyta źródło ekranu JAKO TEKST. Nie uruchamia
// Reacta i nie wie, czy ekran się rysuje. Podmiana wywołania na inne, równie
// zepsute, przejdzie tu niezauważona.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (O53): `tsconfig.json` ciągnie DOM, więc `tsc`
// pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.

import {
  pickBlockSessionToConfirm,
  blockSessionQuestion,
  journalSavedMessage,
  BLOCK_LINK_YES_LABEL,
  BLOCK_LINK_NO_LABEL,
  type LinkableCalendarEvent,
  decideSessionCompletion,
  completionFailureLog,
  completionNoRowsLog,
} from './focusBlockJournalLink';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.error(`FAIL - ${label}\n       ${detail}`); }
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ 0. PAS I2 16.08.2026 — EKRAN, KTÓRY ZALICZA SESJĘ (K4 / O75)
// ═══════════════════════════════════════════════════════════════════
// Wszystkie asercje niżej czytają ŹRÓDŁO EKRANU, nie moduł. Bez nich
// 28 asercji tego pliku opisuje funkcję, której nikt nie musi wołać.

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — `app/(tabs)/dziennik.tsx` CYTUJE w komentarzach
 * brzmienia i nazwy pól („zawodnik ma wiedzieć, że jego wpis przesunął pasek",
 * „`status='completed'`"), więc strażnik czytający surowy tekst zapalałby się
 * — albo przechodził — NA WŁASNEJ DOKUMENTACJI. Wtedy jedynym sposobem, żeby
 * go uciszyć, byłoby skasowanie wyjaśnienia.
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

const PLIK_DZIENNIK = 'app/(tabs)/dziennik.tsx';
const dziennik = bezKomentarzy(surowe(PLIK_DZIENNIK));

{
  console.log('0. EKRAN, KTÓRY ZALICZA SESJĘ Z DZIENNIKA (K4 / O75)');

  check('⛔ (I2-0) każdy plik z listy strażnika istnieje i daje się odczytać',
    BRAK_PLIKOW.length === 0,
    `NIE MA TYCH PLIKÓW: ${BRAK_PLIKOW.join(', ')} — zmieniła się nazwa albo miejsce ekranu. `
    + 'Popraw listę w tym pliku ALBO przywróć ekran; do tego czasu asercje niżej '
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
  const EKRANY = ['app', 'components']
    .flatMap((k) => chodz(join(root, k)))
    .map((p) => relative(root, p).split(sep).join('/'))
    .filter((p) => !p.endsWith('.selftest.ts'))
    .sort();

  check('(I2-0) (strażnik strażnika) mam co przemiatać — katalogi ekranów nie są puste',
    EKRANY.length >= 20,
    `przemiotłem ${EKRANY.length} plików w app/ i components/ — jeżeli to zero albo garstka, `
    + 'to nie „nikt nie zalicza sesji", tylko przemiatanie trafiło w zły katalog, '
    + 'a asercja na RÓWNOŚĆ niżej przeszłaby na pustym zbiorze');

  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c`, nie przepisane z pamięci.
  // RÓWNOŚĆ, nie „≥ 1" (O73): zaliczenie sesji ma DOKŁADNIE JEDNO miejsce
  // w appce. Drugie miejsce znaczyłoby drugi tor zaliczania — a moduł mówi
  // wprost, że nośnikiem prawdy jest powiązanie i tylko ono.
  const konsumenci = EKRANY.filter(
    (p) => /from\s+'[^']*\/focusBlockJournalLink'/.test(bezKomentarzy(readFileSync(join(root, p), 'utf8'))));
  const KONSUMENCI = [PLIK_DZIENNIK];
  const brakujacy = KONSUMENCI.filter((p) => !konsumenci.includes(p));
  const nadmiarowi = konsumenci.filter((p) => !KONSUMENCI.includes(p));
  check('⭐ (I2-0) sesję zalicza DOKŁADNIE ten jeden ekran, co 16.08 — RÓWNOŚĆ, nie „≥ 1" (O73)',
    brakujacy.length === 0 && nadmiarowi.length === 0,
    `BRAKUJE: ${brakujacy.join(', ') || '—'} · NADMIAROWI: ${nadmiarowi.join(', ') || '—'} `
    + '→ ubył: zawodnik nie ma już jednym dotknięciem zaliczyć sesji Bloku i wraca do pickera '
    + '(3+ dotknięcia); doszedł: sprawdź, czy nowe miejsce nie jest DRUGIM TOREM zaliczania — '
    + 'moduł mówi wprost, że prawdą jest powiązanie `daily_logs.calendar_event_id`.');

  // ── ⛔ WYBÓR SESJI NALEŻY DO MODUŁU ──
  // Defekt, którego pilnuje: ekran sam szuka sesji Bloku (`opts.find(o =>
  // o.focusBlockId)`). Wtedy reguły „nigdy z przyszłości" i „najpóźniejsza
  // ≤ dziś wygrywa" obowiązują już tylko w module, a zawodnik dostaje pytanie
  // o trening, którego jeszcze nie było — i „Tak" zalicza mu sesję z przyszłości.
  check('⛔ (I2-0) ekran pyta MODUŁ, o którą sesję zapytać (`pickBlockSessionToConfirm`)',
    /setBlockSession\(\s*pickBlockSessionToConfirm\(/.test(dziennik),
    'ekran przestał oddawać wybór sesji modułowi — decyzja „o co zapytać po treningu" '
    + 'ma DOKŁADNIE jedno miejsce, bo tylko tam da się ją sprawdzić bez appki');

  // ⚠️ Asercja czyta SAM ARGUMENT wywołania, nie cały plik: „nigdzie nie ma
  // `.filter(`" byłoby nieprawdą już dziś i nie mówiłoby nic o tym, CO dostaje
  // moduł.
  const argPick = /pickBlockSessionToConfirm\(([\s\S]{0,400}?)\)\s*\)\s*;/.exec(dziennik)?.[1] ?? '';
  check('⛔ (I2-0) ekran oddaje modułowi CAŁE okno wydarzeń — nie wybiera za niego',
    argPick.length > 0 && !/\.\s*(filter|sort|slice|reverse|find)\s*\(/.test(argPick),
    `argument \`pickBlockSessionToConfirm\`: ${argPick.trim() || '(nie znalazłem wywołania)'} — `
    + 'ekran zawęża listę przed oddaniem jej modułowi, więc reguła „nigdy z przyszłości" '
    + 'i reguła „najpóźniejsza sesja ≤ dziś" liczą się na innym zbiorze, niż widzi zawodnik');

  // ── ⛔ JEDEN WARUNEK „CZY WPIS ZALICZYŁ SESJĘ", NIE DWA ──
  // To jest defekt, który pas A1 nazwał wprost: DWIE KOPIE tego samego
  // warunku to droga do produktu, który stawia znacznik i mówi „Zapisano.",
  // albo mówi „Sesja doliczona do paska Twojego Celu ✓" i nie stawia znacznika.
  check('⛔ (I2-0) zdanie po zapisie i znacznik liczą się TĄ SAMĄ decyzją modułu',
    /const\s+linkedToBlock\s*=\s*decyzjaZnacznika\.oznacz\s*;/.test(dziennik)
    && (dziennik.match(/decideSessionCompletion\(/g) ?? []).length === 1,
    'ekran liczy „czy wpis zaliczył sesję" drugi raz u siebie albo woła decyzję dwa razy; '
    + 'dwa rachunki tej samej rzeczy rozjeżdżają się po cichu, a zawodnik czyta '
    + '„Sesja doliczona do paska Twojego Celu ✓" przy wydarzeniu, którego nikt nie oznaczył');

  check('⛔ (I2-0) rodzaj wpisu rozstrzyga MODUŁ — ekran podaje `entryType`, nie własną gałąź',
    /decideSessionCompletion\(\{[\s\S]{0,300}?\bentryType\b/.test(dziennik),
    'ekran nie oddaje modułowi rodzaju wpisu — reguła „wpis poranny NIGDY nie zalicza sesji" '
    + 'przestaje obowiązywać tam, gdzie jest wykonywana');

  // ── ⭐ ZAPADKA NA SKASOWANIE (część 1: znacznik) ──
  // Bez tej asercji wszystkie powyższe spełnia też ekran, który znacznika
  // nie stawia wcale. Strażnik nagradzałby wtedy skasowanie funkcji.
  check('⭐ (I2-0) ekran NAPRAWDĘ stawia znacznik — `update status=completed` pod decyzją modułu',
    /if\s*\(\s*decyzjaZnacznika\.oznacz\s*\)/.test(dziennik)
    && /\.update\(\{\s*status:\s*'completed'\s*\}\)/.test(dziennik),
    'zniknęło stawianie `status=\'completed\'` albo przestało zależeć od decyzji modułu; '
    + 'kalendarz i cron przestają widzieć to, co widzi licznik „N z M" — a rozjazdu nikt nie zauważy');

  // ── ⛔ CICHY BRAK PRZEZ RLS MA WŁASNY ŚLAD ──
  // Zmierzone: polityka `calendar_events_update_own` wymaga
  // `user_has_active_access`, więc zawodnikowi bez aktywnego dostępu PostgREST
  // odpowie SUKCESEM i pustą listą — czyli dokładnie tak, jak wygląda
  // powodzenie. Bez `.select('id')` nie ma czego policzyć.
  check('⛔ (I2-0) „zero dotkniętych wierszy" jest rozpoznawane, nie mylone z sukcesem',
    /\.select\('id'\)/.test(dziennik)
    && /length\s*===\s*0[\s\S]{0,120}?completionNoRowsLog\(/.test(dziennik),
    'ekran nie odróżnia „update przeszedł" od „update nic nie dotknął"; przy odciętym dostępie '
    + '(RLS) znacznik nie powstaje, a w konsoli nie ma po tym śladu — defekt niewidoczny dla autora '
    + 'jest defektem, którego nikt nie naprawi');

  check('⛔ (I2-0) porażka znacznika idzie do KONSOLI, a nie w twarz zawodnikowi',
    /console\.warn\(\s*completionFailureLog\(/.test(dziennik)
    && !/set(Error|Ok)\([^;]*completion(FailureLog|NoRowsLog)\(/.test(dziennik),
    'nieudany znacznik pokazuje się zawodnikowi jako błąd zapisu — a jego wpis I POWIĄZANIE, '
    + 'z którego liczy się pasek Celu, leżą już w bazie; produkt skłamałby mu o jego własnej pracy');

  // ── ⭐ ZAPADKA NA SKASOWANIE (część 2: pytanie i zdanie po zapisie) ──
  check('⭐ (I2-0) ekran NAPRAWDĘ rysuje jedno pytanie o sesję Bloku, z obiema odpowiedziami',
    /\{\s*blockSessionQuestion\(/.test(dziennik)
    && /\{\s*BLOCK_LINK_YES_LABEL\s*\}/.test(dziennik)
    && /\{\s*BLOCK_LINK_NO_LABEL\s*\}/.test(dziennik),
    'zniknęło pytanie o sesję Bloku albo jedna z odpowiedzi; zawodnik wraca do biernego pickera '
    + '(otwórz → znajdź wydarzenie → wybierz = 3+ dotknięcia zamiast jednego)');

  check('⭐ (I2-0) „Tak" ustawia DOKŁADNIE to powiązanie, o które ekran zapytał',
    /setCalendarLinkId\(\s*String\(\s*blockSession\.id\s*\)\s*\)/.test(dziennik),
    'przycisk „Tak" ustawia coś innego niż sesję z pytania albo nie ustawia nic; '
    + 'zawodnik potwierdza jeden trening, a produkt zalicza mu inny — albo żaden');

  check('⭐ (I2-0) zdanie po zapisie NAPRAWDĘ dociera do zawodnika (`setOk(journalSavedMessage(`)',
    /setOk\([^;]*journalSavedMessage\(/.test(dziennik),
    'zniknęło zdanie po zapisie; zawodnik nie dowiaduje się, że jego wpis właśnie przesunął '
    + 'pasek Celu — a to jest ta część umowy, w której produkt ODDAJE za to, co zebrał');

  // ── BRZMIENIA POCHODZĄ Z MODUŁU, NA EKRANIE NIE STOI ICH KOPIA ──
  check('⛔ (I2-0) brzmienia widoczne dla zawodnika NIE mają kopii na ekranie',
    !dziennik.includes(BLOCK_LINK_YES_LABEL)
    && !dziennik.includes(journalSavedMessage(true))
    && !dziennik.includes(journalSavedMessage(false))
    && !dziennik.includes(blockSessionQuestion(
      { id: 1, scheduled_date: '2026-08-08', title: 't', focus_block_id: 'fb' }, '2026-08-08')),
    'na ekranie stoi KOPIA zdania z modułu — od tej chwili poprawka brzmienia w module '
    + 'nie dociera do zawodnika, a suita tego nie zauważy, bo obie wersje są „poprawne"');
}

const TODAY = '2026-08-08';
const ev = (id: number, date: string, blockId: string | null, title = 'Blok Skupienia: skoki (20 min)'): LinkableCalendarEvent =>
  ({ id, scheduled_date: date, title, focus_block_id: blockId });

// ── wybór sesji ──────────────────────────────────────────────
check('bez żadnych wydarzeń → brak pytania (dziennik wygląda jak wczoraj)',
  pickBlockSessionToConfirm([], TODAY) === null, 'pytanie z powietrza');
check('same wydarzenia spoza Bloku → brak pytania (od nich jest ręczny picker)',
  pickBlockSessionToConfirm([ev(1, TODAY, null, 'Mecz ligowy')], TODAY) === null, 'pytanie o nie-sesję');
check('sesja Bloku DZIŚ → pytanie o nią',
  pickBlockSessionToConfirm([ev(1, TODAY, 'fb-1')], TODAY)?.id === 1, 'nie wybrało dzisiejszej');
check('sesja Bloku tylko WCZORAJ → pytanie o wczorajszą (wpis po wczorajszym treningu jest realny)',
  pickBlockSessionToConfirm([ev(2, '2026-08-07', 'fb-1')], TODAY)?.id === 2, 'nie wybrało wczorajszej');
check('dziś wygrywa z wczoraj',
  pickBlockSessionToConfirm([ev(2, '2026-08-07', 'fb-1'), ev(3, TODAY, 'fb-1')], TODAY)?.id === 3, 'wczoraj wygrało');
check('sesja z JUTRA nigdy nie dostaje pytania — nawet gdy jest jedyna',
  pickBlockSessionToConfirm([ev(4, '2026-08-09', 'fb-1')], TODAY) === null,
  'pytanie „czy zrobiłeś jutrzejszy trening" podważa zaufanie do dziennika');
check('miks: jutrzejsza sesja Bloku + dzisiejszy mecz + wczorajsza sesja Bloku → wczorajsza',
  pickBlockSessionToConfirm([ev(4, '2026-08-09', 'fb-1'), ev(1, TODAY, null, 'Mecz'), ev(2, '2026-08-07', 'fb-1')], TODAY)?.id === 2,
  'zły wybór');
check('dwie sesje tego samego dnia → deterministycznie pierwsza (mniejsze id)',
  pickBlockSessionToConfirm([ev(9, TODAY, 'fb-1'), ev(5, TODAY, 'fb-2')], TODAY)?.id === 5, 'niedeterministyczne');

// ── brzmienia (test 15-latka: krótko, zero oceniania) ────────
check('pytanie o dzisiejszą sesję mówi „ten trening"',
  blockSessionQuestion(ev(1, TODAY, 'fb-1'), TODAY).includes('ten trening'), blockSessionQuestion(ev(1, TODAY, 'fb-1'), TODAY));
check('pytanie o wcześniejszą sesję mówi o „ostatnich dniach"',
  blockSessionQuestion(ev(1, '2026-08-07', 'fb-1'), TODAY).includes('ostatnich dni'), '');
check('„Nie" jest równie dobrą odpowiedzią — bez „niestety", bez wykrzykników',
  BLOCK_LINK_NO_LABEL === 'Nie' && !BLOCK_LINK_YES_LABEL.includes('!'), BLOCK_LINK_NO_LABEL);
check('komunikat po zaliczeniu sesji mówi WPROST, że pasek Celu się przesunął (zasada 4: oddajemy)',
  journalSavedMessage(true).includes('paska Twojego Celu'), journalSavedMessage(true));
check('zwykły zapis brzmi jak dotąd — co do znaku',
  journalSavedMessage(false) === 'Zapisano.', journalSavedMessage(false));

// ═══════════════════════════════════════════════════════════════════════
// PLAN-D-A1 08.2026 — STRAŻNIK ZNACZNIKA WYKONANIA I WARUNKU PYTANIA
// ═══════════════════════════════════════════════════════════════════════

// ── (5) WARUNEK PYTANIA NIE MOŻE DOPUŚCIĆ SESJI Z PRZYSZŁOŚCI.
//        To było jawnie zakazane w kontrakcie Dziennika („pytanie »czy zrobiłeś
//        jutrzejszy trening« podważałoby zaufanie do całego dziennika") i nie
//        wolno tego zgubić przy naprawie. Asercja na REGUŁĘ: dla dowolnego
//        przesunięcia w przód wynik ma być pusty.
{
  const przod = ['2026-08-09', '2026-08-10', '2026-08-15', '2026-09-01', '2027-01-01'];
  for (const d of przod) {
    check(`sesja z przyszłości (${d}) → NIGDY pytania`,
      pickBlockSessionToConfirm([ev(1, d, 'fb-1')], TODAY) === null,
      'pytanie o sesję, która się jeszcze nie odbyła');
  }
  check('sesja z przyszłości nie wygrywa nawet obok sesji z dziś',
    pickBlockSessionToConfirm([ev(7, '2026-08-20', 'fb-1'), ev(3, TODAY, 'fb-1')], TODAY)?.id === 3,
    'wybrało sesję z przyszłości');
  // Ta sama reguła czytana z kodu — żeby porównanie dat nie zniknęło po cichu.
  {
    const tu = dirname(fileURLToPath(import.meta.url));
    const zrodlo = readFileSync(join(tu, 'focusBlockJournalLink.ts'), 'utf8');
    check('kod nadal odcina przyszłość porównaniem scheduled_date <= dziś',
      /scheduled_date\s*<=\s*todayStr/.test(zrodlo), 'zniknął warunek odcinający przyszłość');
  }
}

// ── ZNACZNIK: decyzja jest POCHODNĄ powiązania, nie drugim torem ────────
{
  const opcje = [
    { id: 11, focusBlockId: 'fb-1' },
    { id: 12, focusBlockId: null },
  ];
  const d1 = decideSessionCompletion({ entryType: 'post_training', calendarLinkId: '11', options: opcje });
  check('wpis potreningowy powiązany z sesją Bloku → oznacz to wydarzenie',
    d1.oznacz === true && d1.eventId === 11, JSON.stringify(d1));

  const d2 = decideSessionCompletion({ entryType: 'morning', calendarLinkId: '11', options: opcje });
  check('wpis poranny NIGDY nie stawia znacznika',
    d2.oznacz === false && d2.powod === 'wpis-poranny', JSON.stringify(d2));

  const d3 = decideSessionCompletion({ entryType: 'post_training', calendarLinkId: '', options: opcje });
  check('bez powiązania nie ma czego oznaczać',
    d3.oznacz === false && d3.powod === 'brak-powiazania', JSON.stringify(d3));

  const d4 = decideSessionCompletion({ entryType: 'post_training', calendarLinkId: '12', options: opcje });
  check('wydarzenie spoza Bloku → bez znacznika (znacznik odpowiada licznikowi)',
    d4.oznacz === false && d4.powod === 'wydarzenie-spoza-bloku', JSON.stringify(d4));

  const d5 = decideSessionCompletion({ entryType: 'post_training', calendarLinkId: '99', options: opcje });
  check('powiązanie do wydarzenia spoza okna → bez znacznika, nie wyjątek',
    d5.oznacz === false, JSON.stringify(d5));
}

// ── PORAŻKA ZNACZNIKA MA BYĆ WIDOCZNA I MA MÓWIĆ, ŻE LICZNIK JEST CAŁY ──
{
  const l1 = completionFailureLog(11, 'kod 23514');
  check('ślad porażki niesie id wydarzenia i powód',
    l1.includes('11') && l1.includes('23514'), l1);
  check('ślad porażki mówi wprost, że licznik nie ucierpiał',
    /licznik/i.test(l1) && /calendar_event_id/.test(l1), l1);
  const l2 = completionNoRowsLog(11);
  check('„zero dotkniętych wierszy" ma własny ślad (cichy brak przez RLS)',
    /ani jednego wiersza/i.test(l2) && /RLS/.test(l2), l2);
}

// Pomiar OSOBNYM logiem (zasada 14): ile dotknięć kosztuje zaliczenie sesji.
console.log('[pomiar] Zaliczenie sesji Bloku z dziennika: 1 dotknięcie (było: otwórz picker → znajdź wydarzenie → wybierz = 3+).');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
