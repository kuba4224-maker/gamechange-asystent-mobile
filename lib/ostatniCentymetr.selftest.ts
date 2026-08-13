// PLAN-D-N 08.2026 (13.08.2026) — NOWY PLIK.
//
//   npx tsx lib/ostatniCentymetr.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ── PO CO TEN PLIK ISTNIEJE ───────────────────────────────────────────
// Audyt zgodności z wizją (pas M, 12.08.2026) policzył 84 obietnice makiet
// i ustaleń. Z tego 26 miało stan „JEST, ALE MARTWE": kod istnieje, jest
// poprawny, ma testy — i zawodnik nigdy tego nie zobaczy, bo ostatni centymetr
// (jedno wywołanie, jedna kolejność linijek, jeden warunek) był poza zakresem
// pasa, który daną rzecz budował. Każda z tych 26 pozycji przeszła przez raport
// jako ZROBIONA i każda naprawdę była zrobiona.
//
// Wszystkie selftesty w tym katalogu sprawdzają CZYSTE FUNKCJE. Żaden z nich
// nie umiał złapać żadnego z tych 26 defektów, bo one nie siedzą w funkcjach,
// tylko w SPOSOBIE, W JAKI EKRAN JE WOŁA. Ten plik pilnuje dokładnie tego —
// czyta źródła komponentów jako tekst i sprawdza kształt wywołań.
//
// ⚠️ CZEGO TEN PLIK NIE UDAJE. To nie jest test — to jest strażnik regresji na
// tekście źródłowym. Nie uruchamia Reacta, nie dotyka Supabase i nie wie, czy
// ekran się rysuje. Przechodzi, dopóki nikt nie przywrócił KONKRETNEGO defektu,
// który już raz kosztował produkt cały ekran. Zamiana wywołania na inne, równie
// zepsute, przejdzie tu niezauważona — i dlatego każda asercja niżej mówi
// wprost, co dokładnie było zepsute i jak to zmierzono.
//
// ⚠️ REGUŁA, KTÓREJ TO SŁUŻY (audyt M, sekcja 6.7): zadanie nie jest skończone,
// dopóki zawodnik tego nie widzi. Ten plik jest pierwszym miejscem, w którym ta
// reguła cokolwiek MIERZY, zamiast być zdaniem w kontrakcie.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy.
 *
 * ⚠️ TO NIE JEST OZDOBNIK. Pliki w tym projekcie mają długie komentarze, które
 * CYTUJĄ zepsute wywołania („do 13.08.2026 stało tu `rpc('account_state', …)`").
 * Strażnik czytający surowy tekst zapalałby się na własnej dokumentacji, więc
 * jedynym sposobem, żeby go uciszyć, byłoby usunięcie wyjaśnienia — czyli
 * dokładnie tej wiedzy, dla której ten plik powstał. Odcinamy całe linie
 * komentarza i bloki `/* *\/`; komentarz doklejony za kodem zostaje (nie
 * przeszkadza, a jego cięcie psułoby napisy zawierające „//").
 */
const bezKomentarzy = (s: string): string => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .join('\n');

const zrodlo = (wzgledna: string): string => bezKomentarzy(readFileSync(join(root, wzgledna), 'utf8'));

/** Surowy plik — do asercji, które mają widzieć także komentarze i napisy. */
const zrodloSurowe = (wzgledna: string): string => readFileSync(join(root, wzgledna), 'utf8');

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

// ═══════════════════════════════════════════════════════════════════
// 1. `account_state` — WYWOŁANIE MUSI PASOWAĆ DO PODPISU W BAZIE
// ═══════════════════════════════════════════════════════════════════
// PODPIS ZMIERZONY NA ŻYWEJ BAZIE 13.08.2026:
//     select pronargs, pg_get_function_identity_arguments(oid)
//       from pg_proc where proname = 'account_state';
//     → pronargs = 0, argumenty []
//
// CO SIĘ STAŁO. 11.08.2026 funkcja miała podpis `(p_user uuid DEFAULT auth.uid())`
// i Mapa słusznie podawała `p_user` jawnie. 12.08.2026 migracja `20260812135901`
// skasowała wariant `(uuid)` z uzasadnieniem „Appka woła ją bez argumentów" —
// zdaniem nieprawdziwym, którego nikt nie sprawdził `grep`em. PostgREST dopasowuje
// funkcje po NAZWACH parametrów (O33), więc wywołanie z `{ p_user }` przestało
// trafiać w cokolwiek, `accountState` schodziło na `null`, `dostepMapy(null)`
// dawało `odcinek: false` — i CAŁA MAPA DROGI BYŁA MARTWA U KAŻDEGO ZAWODNIKA.
// Nie rzuciło to żadnego wyjątku i nie zapaliło żadnego testu.
{
  const mapa = zrodlo('components/MojaDroga.tsx');
  const wszystkie = mapa.match(/supabase\.rpc\(\s*['"]account_state['"][^)]*\)/g) ?? [];

  check('(N1) Mapa woła `account_state` dokładnie raz — bez cichej ścieżki odzysku',
    wszystkie.length === 1, JSON.stringify(wszystkie));
  check('(N1) …i woła ją BEZ ARGUMENTÓW, bo funkcja w bazie ma pronargs = 0',
    wszystkie.length === 1 && /supabase\.rpc\(\s*['"]account_state['"]\s*\)/.test(wszystkie[0]),
    `wywołanie w kodzie: ${wszystkie[0] ?? '(brak)'} — argumenty nie pasują do podpisu z bazy, `
    + 'PostgREST nie dopasuje funkcji i Mapa zgaśnie u WSZYSTKICH');
  check('(N1) nigdzie nie wróciło `p_user` przy tym wywołaniu',
    !/rpc\(\s*['"]account_state['"]\s*,/.test(mapa), 'wywołanie znów podaje argument');

  // Wiedza, która kosztowała cały ekran, ma zostać w pliku. Gdyby ktoś skasował
  // wyjaśnienie, następna osoba „poprawiłaby" to wywołanie z powrotem.
  const surowe = zrodloSurowe('components/MojaDroga.tsx');
  check('(N1) plik nadal tłumaczy, DLACZEGO bez argumentów — z datą pomiaru',
    surowe.includes('pronargs = 0') && surowe.includes('13.08.2026'),
    'zniknęło uzasadnienie zmierzonego podpisu — bez niego ta linijka wygląda na literówkę');
}

// ═══════════════════════════════════════════════════════════════════
// 2. „CZEKAM NA DECYZJĘ" TO NIE JEST „ODPADŁEM"
// ═══════════════════════════════════════════════════════════════════
// `exit_mode.state` ma trzy wartości (CHECK zmierzony w bazie 13.08.2026):
// `active`, `paused_decision`, `closed`. Backend rozróżniał je od pasa I;
// Mapa brała KAŻDY otwarty wiersz (`length > 0`) i przełączała się na wariant
// „po deselekcji". Dopóki nikt nie ustawia `paused_decision`, defekt jest
// niewidoczny — zapala się w dniu, w którym wejście do tego stanu powstanie,
// czyli dokładnie wtedy, kiedy nikt już nie będzie pamiętał tej linijki.
{
  const mapa = zrodlo('components/MojaDroga.tsx');
  check('(N4) wariant „po deselekcji" włącza WYŁĄCZNIE stan `active`',
    /state\s*===\s*['"]active['"]/.test(mapa),
    'brak jawnego warunku na `active` — Mapa może powiedzieć „odpadłeś" komuś, kto wstrzymał decyzję');
  check('(N4) …a nie „jakikolwiek otwarty wiersz `exit_mode`"',
    !/\(\s*exitRes\.data\s*\?\?\s*\[\]\s*\)\.length\s*>\s*0/.test(mapa),
    'wrócił warunek `length > 0`');
  check('(N4) stan spoza znanych dwóch jest głośny, a nie milcząco traktowany jak deselekcja',
    /NIEZNANY_STAN_WYJSCIA_WARN/.test(mapa),
    'brak ostrzeżenia o nieznanym stanie — cichy brak wróciłby tylnymi drzwiami');
}

// ═══════════════════════════════════════════════════════════════════
// 3. CZTERY LICZNIKI ZACHOWANIA — KOLEJNOŚĆ, NIE ISTNIENIE
// ═══════════════════════════════════════════════════════════════════
// `lib/sladZachowania.ts` liczy cztery liczniki poprawnie i ma własny selftest.
// Jedyne miejsce w produkcie, w którym zawodnik miał je ZOBACZYĆ, ustawiało je
// linijkę przed `await load()`, a `load()` zaczyna się od `setSladLinie(null)`.
// Licznik kasował się natychmiast po policzeniu. Funkcja: poprawna. Test:
// zielony. Zawodnik: nie zobaczył nigdy.
{
  const kal = zrodlo('components/Kalibracja.tsx');
  const iPokazania = kal.indexOf('setSladLinie(opiszSlad');
  const przedPokazaniem = iPokazania >= 0 ? kal.slice(0, iPokazania) : '';
  const iOstatniegoLoad = przedPokazaniem.lastIndexOf('await load()');
  const poPokazaniu = iPokazania >= 0 ? kal.slice(iPokazania) : '';

  check('(N2) licznik śladu jest w ogóle ustawiany',
    iPokazania >= 0, 'nie znalazłem `setSladLinie(opiszSlad` — licznika nie ma gdzie zobaczyć');
  check('(N2) `await load()` stoi PRZED ustawieniem licznika, nie po nim',
    iPokazania >= 0 && iOstatniegoLoad >= 0,
    'ustawienie licznika nie jest poprzedzone `await load()` w tej samej funkcji — '
    + 'jeśli `load()` przyjdzie później, skasuje licznik, zanim ktokolwiek go zobaczy');
  check('(N2) …i po ustawieniu licznika nie ma już kolejnego `load()`, które by go skasowało',
    iPokazania >= 0 && !/await\s+load\(\)/.test(poPokazaniu.slice(0, 400)),
    'zaraz po ustawieniu licznika wołane jest `load()` — dokładnie defekt sprzed 13.08.2026');
  check('(N2) `load()` nadal czyści licznik na wejściu (to jest poprawne — chodzi o kolejność)',
    /setSladLinie\(null\)/.test(kal),
    'zniknęło czyszczenie licznika — po przeładowaniu danych zostałaby stara, nieaktualna linijka');
}

// ═══════════════════════════════════════════════════════════════════
// 4. STRAŻNIK STRAŻNIKA
// ═══════════════════════════════════════════════════════════════════
// Wszystkie asercje wyżej czytają pliki z dysku. Gdyby ścieżka się rozjechała,
// `readFileSync` rzuci — ale gdyby plik istniał i był pusty albo gdyby ktoś
// przeniósł logikę gdzie indziej, testy przechodziłyby, nie sprawdzając nic.
{
  const mapa = zrodlo('components/MojaDroga.tsx');
  const kal = zrodlo('components/Kalibracja.tsx');
  check('pliki, które ten strażnik czyta, naprawdę zawierają badaną logikę',
    mapa.includes('supabase.rpc(') && mapa.includes('exit_mode') && kal.includes('opiszSlad'),
    `MojaDroga=${mapa.length}B, Kalibracja=${kal.length}B`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
