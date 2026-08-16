// PLAN-D-Q 08.2026 (13.08.2026) — NOWY PLIK. STRAŻNIK ZADANIA Q3.
//
//   node --experimental-strip-types lib/etykietyCelu.selftest.ts
//   (albo razem z resztą: node tests/run-selftests.mjs)
//
// ── CO TEN PLIK PILNUJE ──────────────────────────────────────────────
// Menu Celu istnieje w CZTERECH kopiach, w TRZECH repozytoriach:
//
//   1. Asystent Gamechange/app/(tabs)/cele.tsx     — GOAL_DIRECTION_LABELS
//   2. Asystent Gamechange/app/(tabs)/profil.tsx   — GOAL_DIRECTION_LABELS (kreator, etap 2)
//   3. gamechange-app/asystent_app.html            — GOAL_DIRECTION_LABELS
//   4. gamechange-diagnoza/index.html              — #goal-buttons + CTX_LABELS.goal
//                                                    + GOAL_DIRECTION_KEYS
//
// To jest dokładnie ten kształt, który 12.08.2026 zabił Mapę drogi: jedna
// strona zmieniona, trzy nie. Piąta zmiana trafi w jedno miejsce z czterech,
// jeżeli nikt tego nie policzy maszynowo. Ten plik to liczy.
//
// TRZY MUTACJE WYMIENIONE W POLECENIU Q3, każda przechodzi przez przegląd kodu:
//   M1. jedna z czterech list ROZJEŻDŻA SIĘ z pozostałymi — zawodnik widzi
//       inny zestaw ambicji w appce niż w lejku, a diagnoza dostaje w promptcie
//       cel, którego w appce nie da się wybrać;
//   M2. wraca STARY KLUCZ (`more_minutes`, `move_up`, `improve_element`,
//       `avoid_relegation_from_team`) albo fraza „Nie odpaść z drużyny" —
//       czyli cel, którego osiągnięcie rozstrzyga trener albo klub (reguła C1);
//   M3. `zawodowo` przestaje być PIERWSZE — najwyższa ambicja spada pod inne
//       i zawodnik znów zaczyna od obcięcia siebie.
//
// ⚠️ STRAŻNIK PORÓWNUJE ZBIORY KLUCZY, NIE NAPISY. Asercja na treść etykiety
// zapala się przy poprawce literówki i gaśnie przy prawdziwym rozjeździe.
// Napisy sprawdzane są OSOBNO i osobno raportowane.
//
// ⚠️ WARSTWY DOTYKAJĄCE INNYCH REPOZYTORIÓW działają tylko wtedy, gdy trzy
// repozytoria leżą obok siebie. GDY NIE LEŻĄ — strażnik MÓWI TO GŁOŚNO
// i liczy jako POMINIĘTE. Strażnik, który po cichu nie sprawdza połowy,
// jest gorszy niż jego brak (wzór: lib/okresProbnyIObserwacje.selftest.ts).
//
// ⚠️ NIE UŻYWAJ `new URL(...)` do czytania plików — tsconfig.json appki ciągnie
// bibliotekę DOM i kontrola typów pada (TS2769, ograniczenie z pasa K).
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let passed = 0;
let failed = 0;
let pominiete = 0;

function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}
/**
 * ⭐ PAS I1 16.08.2026 — POMINIĘCIE MUSI NAZWAĆ ŚCIEŻKĘ, KTÓREJ SZUKAŁO.
 *
 * `tests/run-selftests.mjs` dzieli pominięcia na dwa rodzaje: DOPUSZCZONE
 * (warstwa mieszka w INNYM repozytorium, którego w tym drzewie nie ma —
 * w CI stan trwały) i NIEDOPUSZCZONE (⛔ zapalają wyjście niezerowe).
 * Etykieta `[poza-repo]` nie wystarcza: runner sam sprawdza, czy któraś
 * z nazwanych ścieżek jest bezwzględna, leży POZA repozytorium i naprawdę
 * nie istnieje. Pominięcie bez `sciezki` jest NIEDOPUSZCZONE — i słusznie,
 * bo brak pliku WŁASNEGO repozytorium to błąd, nie brak sąsiada.
 */
function pomin(label: string, powod: string, sciezki?: string[]) {
  pominiete++;
  const pozaRepo = sciezki && sciezki.length > 0;
  const gdzie = pozaRepo ? ` (szukałem: ${sciezki!.join(' | ')})` : '';
  console.log(`POMINIETE${pozaRepo ? ' [poza-repo]' : ''} - ${label}: ${powod}${gdzie}`);
}

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const obokAppki = dirname(appRoot);

/** Ścieżki, pod którymi szukamy sąsiedniego repozytorium — do pominięcia (I1). */
function kandydaci(...czesci: string[]): string[] {
  return [join(obokAppki, ...czesci), join(appRoot, '..', ...czesci)];
}
function znajdz(...czesci: string[]): string | null {
  return kandydaci(...czesci).find((p) => existsSync(p)) ?? null;
}
function czytajWRepoAppki(...czesci: string[]): string | null {
  const p = join(appRoot, ...czesci);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

// ═════════════════════════════════════════════════════════════════════
// ŹRÓDŁO PRAWDY — sześć pozycji, w kolejności, która jest częścią decyzji
// (claude/PROPOZYCJA_ETYKIET_CELU_13_08_2026.md, decyzja D4)
// ═════════════════════════════════════════════════════════════════════
const OCZEKIWANE: Array<[string, string]> = [
  ['zawodowo',          'Dojść do futbolu zawodowego'],
  ['najwyzej_jak_moge', 'Zajść tak wysoko, jak zdołam'],
  ['nie_do_pominiecia', 'Być zawodnikiem, którego trudno pominąć'],
  ['jedna_rzecz',       'Doprowadzić do końca jedną rzecz w swojej grze'],
  ['w_grze_na_dlugo',   'Zostać w grze na długo'],
  ['other',             'Coś innego — napiszę własnymi słowami'],
];
const OCZEKIWANE_KLUCZE = OCZEKIWANE.map(([k]) => k);
const OCZEKIWANE_ETYKIETY = OCZEKIWANE.map(([, e]) => e);

const STARE_KLUCZE = ['more_minutes', 'move_up', 'improve_element', 'avoid_relegation_from_team'];
const ZAKAZANA_FRAZA = 'Nie odpaść z drużyny';

// ═════════════════════════════════════════════════════════════════════
// WYDOBYCIE LIST Z PLIKÓW ŹRÓDŁOWYCH
// ═════════════════════════════════════════════════════════════════════
type Lista = { klucze: string[]; etykiety: string[] };

/** Obiekt `const GOAL_DIRECTION_LABELS[: typ] = { klucz: 'etykieta', … };` */
function zObiektu(src: string): Lista | null {
  const m = src.match(/const\s+GOAL_DIRECTION_LABELS[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!m) return null;
  const klucze: string[] = [];
  const etykiety: string[] = [];
  const wiersz = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*'([^']*)'\s*,?\s*$/gm;
  let w: RegExpExecArray | null;
  while ((w = wiersz.exec(m[1])) !== null) { klucze.push(w[1]); etykiety.push(w[2]); }
  return klucze.length > 0 ? { klucze, etykiety } : null;
}

/** Lejek: `const GOAL_DIRECTION_KEYS = ['…','…'];` + `goal: ['…','…'],` */
function zLejka(src: string): { klucze: string[]; etykiety: string[]; przyciski: string[]; indeksy: number[] } | null {
  const mk = src.match(/const\s+GOAL_DIRECTION_KEYS\s*=\s*\[([\s\S]*?)\];/);
  const me = src.match(/\n\s*goal:\s*\[([\s\S]*?)\],\n/);
  if (!mk || !me) return null;
  const napisy = (blok: string) => Array.from(blok.matchAll(/'([^']*)'/g)).map((x) => x[1]);
  const przyciskiBlok = src.match(/id="goal-buttons"[\s\S]*?<\/div>/);
  const przyciski: string[] = [];
  const indeksy: number[] = [];
  if (przyciskiBlok) {
    const btn = /presurveyPick\('goal',(\d+),this\)"[^>]*>([^<]*)</g;
    let b: RegExpExecArray | null;
    while ((b = btn.exec(przyciskiBlok[0])) !== null) { indeksy.push(Number(b[1])); przyciski.push(b[2].trim()); }
  }
  return { klucze: napisy(mk[1]), etykiety: napisy(me[1]), przyciski, indeksy };
}

const rowne = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

// ═════════════════════════════════════════════════════════════════════
// WARSTWA 1 — DWIE KOPIE W REPOZYTORIUM APPKI (zawsze dostępne)
// ═════════════════════════════════════════════════════════════════════
console.log('\n--- warstwa 1: appka mobilna (cele.tsx, profil.tsx) ---');

const zebrane = new Map<string, Lista>();

for (const [nazwa, sciezka] of [
  ['cele.tsx', join('app', '(tabs)', 'cele.tsx')],
  ['profil.tsx', join('app', '(tabs)', 'profil.tsx')],
] as Array<[string, string]>) {
  const src = czytajWRepoAppki(sciezka);
  if (src === null) {
    pomin(`(Q3) ${nazwa}`, `nie znalazłem ${join(appRoot, sciezka)} — to plik WŁASNEGO repozytorium, więc to jest błąd, nie brak sąsiada`);
    continue;
  }
  const lista = zObiektu(src);
  if (!lista) {
    check(`(Q3) ${nazwa} — GOAL_DIRECTION_LABELS da się odczytać`, false,
      'nie znalazłem obiektu GOAL_DIRECTION_LABELS albo ma zerową długość');
    continue;
  }
  zebrane.set(nazwa, lista);
  check(`(Q3-M1) ${nazwa} — zbiór kluczy zgodny ze źródłem prawdy`,
    rowne(lista.klucze, OCZEKIWANE_KLUCZE),
    `jest [${lista.klucze.join(', ')}], ma być [${OCZEKIWANE_KLUCZE.join(', ')}]`);
  check(`(Q3-M3) ${nazwa} — \`zawodowo\` stoi PIERWSZE`,
    lista.klucze[0] === 'zawodowo',
    `pierwsze jest \`${lista.klucze[0]}\``);
  check(`(Q3) ${nazwa} — \`other\` stoi OSTATNIE`,
    lista.klucze[lista.klucze.length - 1] === 'other',
    `ostatnie jest \`${lista.klucze[lista.klucze.length - 1]}\``);
  check(`(Q3) ${nazwa} — etykiety co do znaku (brzmienia zatwierdzone, D4)`,
    rowne(lista.etykiety, OCZEKIWANE_ETYKIETY),
    `jest [${lista.etykiety.join(' | ')}]`);
  check(`(Q3-M2) ${nazwa} — żaden stary klucz nie wrócił`,
    !STARE_KLUCZE.some((k) => new RegExp(`(^|[^A-Za-z0-9_])${k}([^A-Za-z0-9_]|$)`).test(src)),
    `znalazłem: ${STARE_KLUCZE.filter((k) => new RegExp(`(^|[^A-Za-z0-9_])${k}([^A-Za-z0-9_]|$)`).test(src)).join(', ')}`);
  check(`(Q3-M2) ${nazwa} — nie ma frazy „${ZAKAZANA_FRAZA}"`,
    !src.includes(ZAKAZANA_FRAZA), 'fraza jest w pliku');
}

// ═════════════════════════════════════════════════════════════════════
// WARSTWA 2 — PANEL WEBOWY (gamechange-app/asystent_app.html)
// ═════════════════════════════════════════════════════════════════════
console.log('\n--- warstwa 2: panel webowy (gamechange-app) ---');
{
  const sciezka = znajdz('gamechange-app', 'asystent_app.html');
  if (!sciezka) {
    pomin('(Q3) asystent_app.html — cała warstwa 2',
      'nie znalazłem gamechange-app/asystent_app.html obok tego repozytorium. ' +
      'Ta warstwa NIE ZOSTAŁA SPRAWDZONA — zielone wyżej jej nie obejmuje.',
      kandydaci('gamechange-app', 'asystent_app.html'));
  } else {
    const src = readFileSync(sciezka, 'utf8');
    const lista = zObiektu(src);
    if (!lista) {
      check('(Q3) asystent_app.html — GOAL_DIRECTION_LABELS da się odczytać', false,
        `nie znalazłem obiektu w ${sciezka}`);
    } else {
      zebrane.set('asystent_app.html', lista);
      check('(Q3-M1) asystent_app.html — zbiór kluczy zgodny ze źródłem prawdy',
        rowne(lista.klucze, OCZEKIWANE_KLUCZE),
        `jest [${lista.klucze.join(', ')}]`);
      check('(Q3-M3) asystent_app.html — `zawodowo` stoi PIERWSZE',
        lista.klucze[0] === 'zawodowo', `pierwsze jest \`${lista.klucze[0]}\``);
      check('(Q3) asystent_app.html — `other` stoi OSTATNIE',
        lista.klucze[lista.klucze.length - 1] === 'other',
        `ostatnie jest \`${lista.klucze[lista.klucze.length - 1]}\``);
      check('(Q3) asystent_app.html — etykiety co do znaku',
        rowne(lista.etykiety, OCZEKIWANE_ETYKIETY), `jest [${lista.etykiety.join(' | ')}]`);
    }
    check('(Q3-M2) asystent_app.html — żaden stary klucz nie wrócił',
      !STARE_KLUCZE.some((k) => new RegExp(`(^|[^A-Za-z0-9_])${k}([^A-Za-z0-9_]|$)`).test(src)),
      `znalazłem: ${STARE_KLUCZE.filter((k) => new RegExp(`(^|[^A-Za-z0-9_])${k}([^A-Za-z0-9_]|$)`).test(src)).join(', ')}`);
    check(`(Q3-M2) asystent_app.html — nie ma frazy „${ZAKAZANA_FRAZA}"`,
      !src.includes(ZAKAZANA_FRAZA), 'fraza jest w pliku');
  }
}

// ═════════════════════════════════════════════════════════════════════
// WARSTWA 3 — LEJEK (gamechange-diagnoza/index.html)
// ═════════════════════════════════════════════════════════════════════
console.log('\n--- warstwa 3: lejek (gamechange-diagnoza) ---');
{
  const sciezka = znajdz('gamechange-diagnoza', 'index.html');
  if (!sciezka) {
    pomin('(Q3) gamechange-diagnoza/index.html — cała warstwa 3',
      'nie znalazłem gamechange-diagnoza/index.html obok tego repozytorium. ' +
      'Ta warstwa NIE ZOSTAŁA SPRAWDZONA — zielone wyżej jej nie obejmuje.',
      kandydaci('gamechange-diagnoza', 'index.html'));
  } else {
    const src = readFileSync(sciezka, 'utf8');
    const lejek = zLejka(src);
    if (!lejek) {
      check('(Q3) lejek — GOAL_DIRECTION_KEYS i CTX_LABELS.goal dają się odczytać', false,
        `nie znalazłem jednej z dwóch list w ${sciezka}`);
    } else {
      zebrane.set('index.html (lejek)', { klucze: lejek.klucze, etykiety: lejek.etykiety });
      check('(Q3-M1) lejek — zbiór kluczy zgodny ze źródłem prawdy',
        rowne(lejek.klucze, OCZEKIWANE_KLUCZE), `jest [${lejek.klucze.join(', ')}]`);
      check('(Q3-M3) lejek — `zawodowo` stoi PIERWSZE',
        lejek.klucze[0] === 'zawodowo', `pierwsze jest \`${lejek.klucze[0]}\``);
      check('(Q3) lejek — `other` stoi OSTATNIE',
        lejek.klucze[lejek.klucze.length - 1] === 'other',
        `ostatnie jest \`${lejek.klucze[lejek.klucze.length - 1]}\``);
      check('(Q3) lejek — CTX_LABELS.goal co do znaku',
        rowne(lejek.etykiety, OCZEKIWANE_ETYKIETY), `jest [${lejek.etykiety.join(' | ')}]`);
      // Lejek zapisuje INDEKS i dopiero z niego bierze etykietę — rozjazd
      // przycisków z tablicą daje ciche przekłamanie w `player_goal`
      // i w promptcie diagnozy, bez żadnego błędu na ekranie.
      check('(Q3-M1) lejek — przyciski #goal-buttons mają te same etykiety co CTX_LABELS.goal',
        rowne(lejek.przyciski, lejek.etykiety),
        `przyciski: [${lejek.przyciski.join(' | ')}]`);
      check('(Q3-M1) lejek — indeksy presurveyPick idą 0..n bez dziur i przestawień',
        rowne(lejek.indeksy.map(String), lejek.etykiety.map((_, i) => String(i))),
        `indeksy: [${lejek.indeksy.join(', ')}]`);
    }
    check('(Q3-M2) lejek — żaden stary klucz nie wrócił',
      !STARE_KLUCZE.some((k) => new RegExp(`(^|[^A-Za-z0-9_])${k}([^A-Za-z0-9_]|$)`).test(src)),
      `znalazłem: ${STARE_KLUCZE.filter((k) => new RegExp(`(^|[^A-Za-z0-9_])${k}([^A-Za-z0-9_]|$)`).test(src)).join(', ')}`);
    check(`(Q3-M2) lejek — nie ma frazy „${ZAKAZANA_FRAZA}"`,
      !src.includes(ZAKAZANA_FRAZA), 'fraza jest w pliku');
  }
}

// ═════════════════════════════════════════════════════════════════════
// WARSTWA 4 — CZTERY KOPIE MIĘDZY SOBĄ
// Porównanie ze źródłem prawdy wyżej nie zastępuje tego: gdyby ktoś
// zmienił źródło prawdy w tym pliku razem z jedną kopią, tamte asercje
// zapaliłyby się na trzech pozostałych — ale nie powiedziałyby wprost,
// że kopie się rozjechały. To mówi.
// ═════════════════════════════════════════════════════════════════════
console.log('\n--- warstwa 4: cztery kopie między sobą ---');
{
  const nazwy = [...zebrane.keys()];
  if (nazwy.length < 4) {
    // ⭐ I1 16.08.2026: to pominięcie jest NASTĘPSTWEM braku sąsiadów, więc
    // wolno mu być dopuszczone TYLKO wtedy, gdy sąsiada faktycznie nie ma.
    // Dlatego nazywa te same ścieżki, co warstwy 2 i 3 — a gdy brakującą
    // kopią jest plik WŁASNEGO repozytorium, żadna ścieżka spoza repo się
    // nie znajdzie i runner zapali czerwień. I słusznie.
    const brakujaceSasiady = [
      ...kandydaci('gamechange-app', 'asystent_app.html'),
      ...kandydaci('gamechange-diagnoza', 'index.html'),
    ].filter((p) => !existsSync(p));
    pomin('(Q3-M1) porównanie wszystkich czterech kopii',
      `odczytałem tylko ${nazwy.length} z 4 (${nazwy.join(', ') || 'żadnej'}) — ` +
      'porównanie krzyżowe jest NIEPEŁNE',
      brakujaceSasiady);
  }
  if (nazwy.length >= 2) {
    const [pierwsza, ...reszta] = nazwy;
    const wzorzec = zebrane.get(pierwsza)!.klucze;
    for (const n of reszta) {
      check(`(Q3-M1) ${n} ma ten sam ZBIÓR KLUCZY co ${pierwsza}`,
        rowne(zebrane.get(n)!.klucze, wzorzec),
        `${n}: [${zebrane.get(n)!.klucze.join(', ')}] vs ${pierwsza}: [${wzorzec.join(', ')}]`);
    }
  }
  check('(Q3) każda odczytana kopia ma dokładnie 6 pozycji',
    nazwy.every((n) => zebrane.get(n)!.klucze.length === 6),
    nazwy.map((n) => `${n}=${zebrane.get(n)!.klucze.length}`).join(', '));
}

console.log(`\n${passed} passed, ${failed} failed${pominiete > 0 ? `, ${pominiete} POMINIETE (patrz wyżej)` : ''}`);
if (pominiete > 0) {
  console.log('⚠️ POMINIĘTE WARSTWY NIE SĄ ZIELONE — są niesprawdzone. Trzy repozytoria');
  console.log('   muszą leżeć obok siebie w jednym katalogu, żeby ten strażnik działał w całości.');
}
process.exit(failed > 0 ? 1 : 0);
