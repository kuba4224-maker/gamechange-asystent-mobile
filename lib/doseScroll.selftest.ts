// SCROLL R13 08.08.2026 — asercje dla lib/doseScroll.ts. Czysta logika:
//
//   npx tsx lib/doseScroll.selftest.ts
//
// Uruchom ponownie po każdej zmianie w lib/doseScroll.ts.
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75)
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — nazwane liczbą. Ten plik miał 8 ASERCJI i ANI JEDNEJ,
// która czytałaby jakikolwiek EKRAN. Sprawdzał wyłącznie własny moduł przez
// `import`. Audyt H1 (15.08) zmierzył: nie istnieje stan repozytorium
// z pilnowanym defektem, na którym ten strażnik by się zapalił.
//
// DLACZEGO TO JEST GROŹNE TUTAJ. Ten moduł nie rysuje NICZEGO — zwraca liczbę
// albo `null`. Cała jego wartość jest w tym, co ekran z tą liczbą zrobi.
// Wszystkie trzy pułapki, które moduł rozstrzyga, ekran może otworzyć z powrotem
// u siebie, nie ruszając ani jednej linii `doseScroll.ts`:
//   • parametr trasy czytany SUROWO, bez `firstParam` — expo-router przy
//     powtórzonym parametrze daje TABLICĘ, a `['1'] === '1'` jest fałszem,
//     więc push z dawką po cichu przestaje skakać (R4);
//   • `null` z modułu potraktowany jak liczba — `scrollTo({ y: null })`
//     zawozi zawodnika na sam początek ekranu zamiast do dawki;
//   • współrzędne kart oddane WZGLĘDEM sekcji zamiast względem `ScrollView` —
//     skok trafia obok karty, a to jest gorsze niż brak skoku.
// Każdy z tych trzech defektów przechodził tu na zielono 8 na 8.
//
// ⚠️ CZEGO TA SEKCJA NIE UDAJE. Czyta źródło ekranu JAKO TEKST — nie uruchamia
// Reacta, nie mierzy layoutu i nie wie, czy ekran naprawdę się przewinął.
// ⚠️ NIE UŻYWAĆ `new URL(...)` (O53): `tsconfig.json` ciągnie DOM, więc `tsc`
// pada wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { doseScrollY, firstParam, DOSE_SCROLL_MARGIN } from './doseScroll';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ 0. PAS I2 16.08.2026 — EKRAN, KTÓRY PRZEWIJA DO DAWKI (K4 / O75)
// ═══════════════════════════════════════════════════════════════════

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy — `cele.tsx` CYTUJE w komentarzach i nazwę funkcji,
 * i kształt trasy („'/cele?dawka=1&fb=…'"), więc strażnik czytający surowy
 * tekst przechodziłby na własnej dokumentacji ekranu.
 */
const bezKomentarzy = (s: string): string => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .join('\n');

/** ⛔ BRAK PLIKU JEST FAIL-em Z NAZWĄ, nie wyjątkiem `ENOENT` (O76). */
const BRAK_PLIKOW: string[] = [];
const surowe = (wzgledna: string): string => {
  const p = join(root, wzgledna);
  if (!existsSync(p)) { BRAK_PLIKOW.push(wzgledna); return ''; }
  return readFileSync(p, 'utf8');
};

const PLIK_CELE = 'app/(tabs)/cele.tsx';
const PLIK_TRASA = 'lib/pushDeepLink.ts';
const cele = bezKomentarzy(surowe(PLIK_CELE));
const trasa = bezKomentarzy(surowe(PLIK_TRASA));

{
  console.log('0. EKRAN, KTÓRY PRZEWIJA DO DAWKI (K4 / O75)');

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

  const konsumenci = EKRANY.filter(
    (p) => /from\s+'[^']*\/doseScroll'/.test(bezKomentarzy(readFileSync(join(root, p), 'utf8'))));
  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c`, nie przepisane z pamięci.
  // RÓWNOŚĆ, nie „≥ 1" (O73): ten moduł ma DOKŁADNIE JEDNEGO konsumenta i musi
  // mieć jednego — dwa miejsca przewijające ekran to dwa skoki na jedno wejście.
  const KONSUMENCI = [PLIK_CELE].sort();
  const brakujacy = KONSUMENCI.filter((p) => !konsumenci.includes(p));
  const nadmiarowi = konsumenci.filter((p) => !KONSUMENCI.includes(p));
  check('⭐ (I2-0) do dawki przewija DOKŁADNIE ten plik, co 16.08 — RÓWNOŚĆ, nie „≥ 1" (O73)',
    brakujacy.length === 0 && nadmiarowi.length === 0,
    `BRAKUJE: ${brakujacy.join(', ') || '—'} · NADMIAROWI: ${nadmiarowi.join(', ') || '—'} `
    + '→ ubył: push o nowej dawce ląduje na górze ekranu Cele i zawodnik musi jej szukać sam, '
    + 'a 8 asercji niżej nadal jest zielonych; doszedł: dwa miejsca przewijają jeden ekran.');

  // ── R4: parametr trasy jest DANYMI Z ZEWNĄTRZ ──
  check('⛔ (I2-0) ekran czyta OBA parametry trasy przez `firstParam` — nigdy surowo',
    /firstParam\(\s*doseParams\.dawka\s*\)/.test(cele)
    && /firstParam\(\s*doseParams\.fb\s*\)/.test(cele)
    && !/doseParams\.(dawka|fb)\s*===/.test(cele),
    'parametr z URL-a porównywany surowo; expo-router przy POWTÓRZONYM parametrze daje '
    + 'TABLICĘ, a `[\'1\'] === \'1\'` jest fałszem — push o nowej dawce po cichu przestaje '
    + 'skakać i zawodnik ląduje na górze ekranu Cele');

  check('⛔ (I2-0) nazwy parametrów zgadzają się z tym, co WYSTAWIA `lib/pushDeepLink.ts`',
    /dawka=1/.test(trasa) && /fb=\$\{/.test(trasa)
    && /doseParams\.dawka/.test(cele) && /doseParams\.fb/.test(cele),
    'nadawca trasy i jej odbiorca rozjechały się w nazwie parametru — push prowadzi na ekran Cele, '
    + 'ekran nie rozpoznaje, po co przyszedł, i nie przewija do dawki; nic nie rzuca błędem');

  // ── Decyzja „czy i dokąd" ma JEDNO miejsce ──
  check('⛔ (I2-0) o tym, dokąd przewinąć, rozstrzyga `doseScrollY` — ekran nie liczy tego sam',
    /doseScrollY\(\{/.test(cele) && !/DOSE_SCROLL_MARGIN\s*=/.test(cele),
    'ekran zaczął liczyć pozycję docelową u siebie; wtedy margines nad kartą i reguła '
    + '„przy kilku Blokach nie zgaduj" mają DWA źródła i rozjeżdżają się po cichu');

  check('⛔ (I2-0) ekran oddaje modułowi współrzędne WZGLĘDEM `ScrollView` (`activeSectionY + y`)',
    /activeSectionY\s*\+\s*y/.test(cele) && /cardYByBlockId:\s*absolute/.test(cele),
    'do modułu idą pozycje kart mierzone WZGLĘDEM sekcji „Aktywne cele", a nie względem '
    + 'przewijanego widoku; skok trafia wtedy o wysokość nagłówka obok karty z dawką — '
    + 'a skok do złej dawki jest gorszy niż brak skoku');

  check('⛔ (I2-0) `null` z modułu znaczy NIE RUSZAJ EKRANU — jest wyjście przed `scrollTo`',
    /if\s*\(\s*target\s*===\s*null\s*\)\s*return/.test(cele),
    'ekran przestał rozróżniać „nie wiem, dokąd" od liczby; `scrollTo({ y: null })` zawozi '
    + 'zawodnika na sam początek ekranu Cele zamiast do dawki, o której dostał pusha');

  check('⛔ (I2-0) ekran NAPRAWDĘ mierzy karty Bloków i sekcję — inaczej mapa jest zawsze pusta',
    /registerBlockCardY\(/.test(cele) && /setActiveSectionY\(/.test(cele)
    && /onLayout=/.test(cele),
    'zniknął pomiar layoutu; `cardYByBlockId` jest wtedy zawsze pusta, `doseScrollY` zawsze '
    + 'zwraca `null` i ekran nigdy nie skacze — a wszystkie asercje o „nie ruszaj przy braku '
    + 'pewności" są przy tym zielone');

  // ── ⭐ ZAPADKA NA SKASOWANIE ──
  // Bez tej asercji wszystkie powyższe spełnia też ekran, który wyniku modułu
  // NIE UŻYWA. Strażnik nagradzałby wtedy skasowanie przewijania.
  check('⭐ (I2-0) ekran NAPRAWDĘ przewija do wyniku modułu — `scrollTo({ y: target })`',
    /scrollRef\.current\?\.scrollTo\(\{\s*y:\s*target/.test(cele),
    'zniknęło samo przewinięcie; wszystkie asercje wyżej spełnia też ekran, który liczy `target` '
    + 'i nic z nim nie robi — zawodnik dotyka pusha „masz nową dawkę" i ląduje na górze listy Celów');
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
