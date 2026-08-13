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
//
// ⚠️ 13.08.2026 (PLAN-D-P): plik schodzi z 12 asercji do 5. Zniknęły dwie całe
// sekcje — (N4) i (N2) — obie razem z rzeczami, których pilnowały. Powody
// stoją w sekcji 2 niżej, wypisane co do sztuki, zamiast po cichu.
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
// 2. ⚠️ TU BYŁY DWIE SEKCJE I OBIE ZNIKŁY 13.08.2026 (PLAN-D-P)
// ═══════════════════════════════════════════════════════════════════
// Nazywam to wprost, zamiast po cichu skrócić plik — spadek liczby asercji
// bez powodu wygląda przy następnym czytaniu jak zgubiony test.
//
// (N4) „CZEKAM NA DECYZJĘ" TO NIE JEST „ODPADŁEM" — trzy asercje.
// Pilnowały, żeby Mapa przełączała wariant „po deselekcji" wyłącznie przy
// `exit_mode.state = 'active'`, a nie przy każdym otwartym wierszu.
// ⚠️ TA RUNDA COFA ZADANIE N4 I TAK MA BYĆ. Stan `paused_decision` został
// skasowany w całości (pas P, zadanie P8): nie dało się go nigdzie włączyć,
// a CHECK w bazie zwęża się do `('active','closed')`. Po tej zmianie „otwarty
// wiersz" i „wiersz aktywny" to jedno i to samo, więc asercja pilnowałaby
// rozróżnienia, którego już nie ma. Gdyby stan kiedyś wrócił, ta sekcja MUSI
// wrócić razem z nim — opis, czym był, jest w nocie przekazania pasa P.
//
// (N2) CZTERY LICZNIKI ZACHOWANIA — cztery asercje.
// Pilnowały KOLEJNOŚCI: `setSladLinie(opiszSlad…)` po `await load()`, nie
// przed. Czytały `components/Kalibracja.tsx`, a tego pliku nie ma
// (claude/DECYZJA_KALIBRACJA_USUNIETA_13_08_2026.md), więc `readFileSync`
// rzuciłby wyjątkiem i wywrócił CAŁY ten strażnik — łącznie z asercjami (N1),
// które mają zostać nietknięte.
// ⚠️ SAM `lib/sladZachowania.ts` ZOSTAJE i jego selftest nadal przechodzi.
// Znikła karta, nie licznik. W dniu, w którym ślad zachowania dostanie nowego
// konsumenta (runda systematyczności, zasada N1), ta sekcja wraca — z nową
// ścieżką i tym samym pytaniem: czy zawodnik na pewno zdąży to zobaczyć.

// ═══════════════════════════════════════════════════════════════════
// 4. STRAŻNIK STRAŻNIKA
// ═══════════════════════════════════════════════════════════════════
// Wszystkie asercje wyżej czytają pliki z dysku. Gdyby ścieżka się rozjechała,
// `readFileSync` rzuci — ale gdyby plik istniał i był pusty albo gdyby ktoś
// przeniósł logikę gdzie indziej, testy przechodziłyby, nie sprawdzając nic.
{
  const mapa = zrodlo('components/MojaDroga.tsx');
  check('plik, który ten strażnik czyta, naprawdę zawiera badaną logikę',
    mapa.includes('supabase.rpc(') && mapa.includes('exit_mode'),
    `MojaDroga=${mapa.length}B`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
