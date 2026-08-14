// PLAN-D-A2A3 08.2026 (14.08.2026) — STRAŻNIK GODZINY OPCJONALNEJ.
//
//   npx tsx lib/godzinaWydarzenia.selftest.ts
//
// (albo `node tests/run-selftests.mjs`, który odkrywa ten plik sam).
// Ten sam wzorzec co lib/focusBlockProgress.selftest.ts.
//
// ⚠️ Ten strażnik pilnuje REGUŁY, nie dzisiejszej listy wartości. Reguła brzmi:
// BRAK GODZINY MA ZOSTAĆ BRAKIEM — a nie zamienić się w napis, który na ekranie
// wygląda jak dane.
//
// ⛔ ZAKAZ `new URL(...)` w tym pliku: `tsconfig.json` appki ciągnie bibliotekę
// DOM i kontrola typów pada (O53, TS2769). Wzorzec z `readFileSync(join(...))`.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  walidujGodzine,
  formatujGodzine,
  czyPokazacGodzine,
  godzinaWMinutach,
} from './godzinaWydarzenia';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

// ── (1) WALIDACJA WPISU ZAWODNIKA ──────────────────────────────────────────
{
  const dobre: Array<[string, string]> = [
    ['08:00', '08:00'],
    ['8:00', '08:00'],     // baza przyjmuje `time '8:00'` — appka nie może być surowsza
    ['00:00', '00:00'],
    ['23:59', '23:59'],
    ['18:00', '18:00'],
    ['  18:00  ', '18:00'],
    ['11:00', '11:00'],
    ['17:30', '17:30'],
  ];
  for (const [wejscie, oczekiwane] of dobre) {
    const r = walidujGodzine(wejscie);
    check(`walidujGodzine przyjmuje ${JSON.stringify(wejscie)} → ${oczekiwane}`,
      r.ok === true && r.wartosc === oczekiwane, JSON.stringify(r));
  }

  check('walidujGodzine normalizuje do dwóch cyfr — jedna godzina, jeden zapis w bazie',
    (walidujGodzine('8:00') as any).wartosc === (walidujGodzine('08:00') as any).wartosc,
    'dwa różne zapisy tej samej godziny');

  const zle: unknown[] = [
    '25:00', '8:70', '24:00', '18:00:30', '', '   ', 'abc', '18', '18:0',
    '1 8:00', '-1:00', '08:00 rano', null, undefined, 1800, {}, [], NaN,
  ];
  for (const wejscie of zle) {
    const r = walidujGodzine(wejscie);
    check(`walidujGodzine odrzuca ${JSON.stringify(wejscie)}`,
      r.ok === false && typeof (r as any).powod === 'string' && (r as any).powod.length > 0,
      JSON.stringify(r));
  }
}

// ── (2) REGUŁA: BRAK ZWRACA `null`, NIGDY NAPIS ────────────────────────────
//
// To jest asercja na regułę. Nie sprawdza jednej wartości, tylko WSZYSTKIE
// kształty „braku", jakie mogą przyjść z bazy, z formularza i z pustego stanu
// Reacta — i wymaga, żeby każdy z nich dał DOKŁADNIE `null`. Gdyby ktoś zwrócił
// `''` albo `'—'`, ekran narysowałby pusty tag, którego zawodnik nie odróżni
// od danych.
{
  const braki: unknown[] = [
    null, undefined, '', '   ', '\t', '—', '-', 'brak', 'null', 'undefined',
    0, false, NaN, {}, [], '25:00', '8:70', 'nie wiem',
  ];
  let zleZwroty: string[] = [];
  for (const b of braki) {
    const r = formatujGodzine(b);
    if (r !== null) zleZwroty.push(`${JSON.stringify(b)} → ${JSON.stringify(r)}`);
  }
  check('formatujGodzine zwraca DOKŁADNIE null dla każdego kształtu braku (nigdy "" ani "—")',
    zleZwroty.length === 0, zleZwroty.join(' · '));

  check('czyPokazacGodzine mówi „nie" dokładnie wtedy, gdy formatujGodzine daje null',
    braki.every((b) => czyPokazacGodzine(b) === false), 'rozjazd między dwiema funkcjami');
}

// ── (3) TOLERANCJA PRZY ODCZYCIE — inaczej appka nie pokaże tego, co zapisała ─
{
  const zBazy: Array<[string, string]> = [
    ['18:00:00', '18:00'],        // tak PostgREST podaje `time`
    ['08:00:00', '08:00'],
    ['18:00', '18:00'],
    ['08:00:00.000', '08:00'],
    ['23:59:00', '23:59'],
    ['00:00:00', '00:00'],
  ];
  for (const [wejscie, oczekiwane] of zBazy) {
    check(`formatujGodzine czyta z bazy ${wejscie} → ${oczekiwane}`,
      formatujGodzine(wejscie) === oczekiwane, String(formatujGodzine(wejscie)));
  }

  // Asymetria surowości jest CELOWA i ma tu swoją asercję: to, co wraca z bazy,
  // musi dać się pokazać, nawet jeśli nie przeszłoby przez walidację wpisu.
  check('asymetria celowa: "18:00:00" nie przechodzi walidacji wpisu, ale DA SIĘ pokazać',
    walidujGodzine('18:00:00').ok === false && formatujGodzine('18:00:00') === '18:00',
    'appka nie pokazałaby godziny, którą sama zapisała');

  // Zapis → odczyt → zapis: to samo, bez dryfu.
  for (const wejscie of ['8:00', '08:00', '18:00', '23:59', '00:00']) {
    const zapis = walidujGodzine(wejscie);
    const odczyt = formatujGodzine(`${(zapis as any).wartosc}:00`);
    check(`obieg bez dryfu dla ${wejscie}`, odczyt === (zapis as any).wartosc,
      `${(zapis as any).wartosc} → ${odczyt}`);
  }
}

// ── (4) ZERO TO NIE BRAK ───────────────────────────────────────────────────
//
// Północ jest prawidłową godziną. Zwrócenie dla niej `null` byłoby dokładnie
// tym błędem, przed którym broni się migracja A2 (zakaz `DEFAULT '00:00'`).
{
  check('godzinaWMinutach("00:00") === 0, a nie null — północ to godzina',
    godzinaWMinutach('00:00') === 0, String(godzinaWMinutach('00:00')));
  check('godzinaWMinutach(null) === null, a nie 0 — brak to nie północ',
    godzinaWMinutach(null) === null, String(godzinaWMinutach(null)));
  check('godzinaWMinutach("18:00") === 1080', godzinaWMinutach('18:00') === 1080,
    String(godzinaWMinutach('18:00')));
  check('godzinaWMinutach("16:30") === 990', godzinaWMinutach('16:30') === 990,
    String(godzinaWMinutach('16:30')));
  check('godzinaWMinutach("00:00") !== godzinaWMinutach(null) — dwie różne rzeczy',
    godzinaWMinutach('00:00') !== godzinaWMinutach(null), 'zero sklejone z brakiem');
}

// ── (5) STRAŻNIK NA ŹRÓDLE — reguła, nie wartość ───────────────────────────
{
  const tu = dirname(fileURLToPath(import.meta.url));
  const zrodlo = readFileSync(join(tu, 'godzinaWydarzenia.ts'), 'utf8');
  const kod = zrodlo
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'))
    .join('\n');

  check('formatujGodzine nie ma ŻADNEJ ścieżki zwracającej pusty napis',
    !/return\s*(''|""|`\s*`)\s*;/.test(kod), 'w kodzie jest `return \'\'`');
  check('nigdzie nie zwracamy myślnika jako „godziny"',
    !/return\s*['"`]\s*[—–-]\s*['"`]/.test(kod), 'w kodzie jest `return \'—\'`');
  check('brak godziny reprezentuje `null`, a nie wartość zastępcza',
    /return null/.test(kod), 'nie ma ani jednego `return null`');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
