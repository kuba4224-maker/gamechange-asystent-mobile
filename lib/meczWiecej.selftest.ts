// PLAN-D-A1 08.2026 (18.08.2026) — NOWY PLIK. STRAŻNIK EKRANU MECZU
// PO DECYZJI KUBY Z 18.08 (M1 §3, wariant A).
//
// ⛔⛔ CO TEN STRAŻNIK NAPRAWDĘ PILNUJE. `app/(tabs)/mecz.tsx` ma 961 linii
// i do 18.08.2026 rano miał ZERO odnośników w całym repozytorium poza własną
// zakładką. Ten pas zakładkę zdejmuje. Jeżeli wejście z kafla kiedykolwiek
// zniknie, ekran zniknie razem z nim — a razem z ekranem jedyne wejście do
// `match_contexts` i `match_context_answers`, czyli, słowami makiety,
// „najcenniejszych danych, jakie produkt zbiera".
//
// ⛔ TEN STRAŻNIK MA PRAWO ZAPALIĆ SIĘ NA SUKCESIE. Kiedy pola meczu naprawdę
// przeniosą się do arkusza, tabela `RZECZY_O_MECZU` zmieni stany z
// `czeka_na_ekran` na `dziala` i asercje o liczbach trzeba będzie przestawić.
// To jest zaprojektowane, a nie przeoczone (O73).

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RZECZY_O_MECZU, rzeczyMeczu, podpisArkuszaMeczu, czegoNieUmiemyZapisac,
  MECZ_WIECEJ_WEJSCIE, MECZ_CZEKA_NA_KOLUMNE,
} from './meczWiecej';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let bledy = 0; let ok = 0;
function check(nazwa: string, warunek: boolean, szczegol = '') {
  if (warunek) { ok += 1; console.log(`OK   - ${nazwa}`); }
  else { bledy += 1; console.log(`FAIL - ${nazwa}${szczegol ? ': ' + szczegol : ''}`); }
}
const bezKomentarzy = (t: string): string =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

// ═════════════════════════════════════════════════════════════════════
// 1. PODZIAŁ Z DECYZJI KUBY — CZTERY NA WIERZCHU, SZEŚĆ W ARKUSZU
// ═════════════════════════════════════════════════════════════════════
const naWierzchu = rzeczyMeczu('ocena_z_kafla');
const wArkuszu = rzeczyMeczu('arkusz_wiecej');
check('⭐ (M1 §3) ścieżka oceny CHUDNIE do czterech rzeczy — tak rysuje makieta v3',
  naWierzchu.length === 4, `${naWierzchu.length}: ${naWierzchu.map((r) => r.napis).join(' · ')}`);
check('⭐ (M1 §3) arkusz „powiedz więcej" niesie SZEŚĆ rzeczy',
  wArkuszu.length === 6, `${wArkuszu.length}`);
check('⛔ każda rzecz stoi DOKŁADNIE w jednym miejscu — suma się zgadza',
  naWierzchu.length + wArkuszu.length === RZECZY_O_MECZU.length);

const NA_WIERZCHU_KUBY = ['minutes_played', 'match_length_minutes', 'match_rpe', '—'];
check('⭐ (M1 §3) na wierzchu stoi DOKŁADNIE to, co wymienił Kuba: minuty na boisku · '
  + 'długość meczu · ciężkość · ból',
  naWierzchu.map((r) => r.kolumna).join(',') === NA_WIERZCHU_KUBY.join(','),
  naWierzchu.map((r) => r.kolumna).join(','));

const W_ARKUSZU_KUBY = ['self_rating', 'mental_state', 'demanding_conditions',
  'position_played_today', 'result', 'notes'];
check('⭐ (M1 §3) w arkuszu stoi DOKŁADNIE reszta: samoocena · stan mentalny · '
  + 'warunki · rola · wynik · notatka',
  wArkuszu.map((r) => r.kolumna).join(',') === W_ARKUSZU_KUBY.join(','),
  wArkuszu.map((r) => r.kolumna).join(','));

check('⛔ każda rzecz ma napis, który da się przeczytać — kolumna to nie jest brzmienie',
  RZECZY_O_MECZU.every((r) => r.napis.length > 5 && !/_/.test(r.napis)));

// ═════════════════════════════════════════════════════════════════════
// 2. ⭐ Z0 — PRODUKT MÓWI, CZEGO NIE UMIE, ZAMIAST UDAWAĆ, ŻE UMIE
// ═════════════════════════════════════════════════════════════════════
const brakujace = czegoNieUmiemyZapisac();
check('⭐⛔ (Z0) DŁUGOŚĆ CAŁEGO MECZU jest nazwana jako rzecz, której NIE MA W BAZIE',
  brakujace.length === 1 && brakujace[0].kolumna === 'match_length_minutes',
  brakujace.map((r) => r.kolumna).join(', ') || 'żadna');
check('⛔ (Z0) zdanie o braku NAZYWA rzecz po imieniu, a nie mówi „coś nie działa"',
  MECZ_CZEKA_NA_KOLUMNE(brakujace[0].napis).includes(brakujace[0].napis)
  && /nie udajemy/.test(MECZ_CZEKA_NA_KOLUMNE(brakujace[0].napis)));
check('⛔ (R5) stany są TRZY, nie dwa — „działa", „czeka na ekran", „czeka na kolumnę"',
  new Set(RZECZY_O_MECZU.map((r) => r.stan)).size === 3,
  [...new Set(RZECZY_O_MECZU.map((r) => r.stan))].join(', '));
check('⭐ podpis arkusza mówi PRAWDĘ o tym, gdzie te pola dziś mieszkają',
  /karcie meczu/.test(podpisArkuszaMeczu()) && /6 rzeczy/.test(podpisArkuszaMeczu()),
  podpisArkuszaMeczu());

// ═════════════════════════════════════════════════════════════════════
// 3. ⭐⭐ WEJŚCIE ISTNIEJE — NAJWAŻNIEJSZA GRUPA TEGO PLIKU
// ═════════════════════════════════════════════════════════════════════
const ekran = bezKomentarzy(readFileSync(join(root, 'app', '(tabs)', 'dzis.tsx'), 'utf8'));
const layout = bezKomentarzy(readFileSync(join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8'));

check('⭐⛔ zakładka „Mecz" JEST ZDJĘTA z paska (`href: null`)',
  /name="mecz"[\s\S]{0,120}href:\s*null/.test(layout), 'mecz nadal jest zakładką');
check('⭐⛔⛔ ekran „Dziś" MA `router.push(\'/mecz\')` — bez tego zdjęcie zakładki '
  + 'kasuje 961 linii i jedyną drogę do `match_contexts`',
  /router\.push\('\/mecz'\)/.test(ekran), 'ZERO wejść do /mecz');
// ⛔ SPRAWDZAMY NAZWĘ STAŁEJ, NIE JEJ TREŚĆ. Ekran ma rysować `{MECZ_WIECEJ_WEJSCIE}`,
// a nie przepisany napis — przepisany rozjechałby się przy pierwszej poprawce brzmienia.
check('⭐ wejście prowadzi Z ARKUSZA meczu, a nie z przypadkowego miejsca',
  /rodzaj: 'meczWiecej'/.test(ekran) && /\{MECZ_WIECEJ_WEJSCIE\}/.test(ekran));
check('⛔ napis wejścia bierze się ze stałej modułu — na ekranie nie stoi jego kopia',
  !ekran.includes(MECZ_WIECEJ_WEJSCIE), 'napis przepisany do ekranu');
check('⭐ arkusz meczu otwiera się Z KAFLA MECZU, a nie z osobnego wiersza — '
  + 'rozpoznanie po `eventType === \'match\'`',
  /eventType === 'match'/.test(ekran), 'kafel meczu nie jest rozpoznawany');
check('⭐⛔ arkusz WYPISUJE sześć rzeczy z modułu, a nie własną listę',
  /rzeczyMeczu\('arkusz_wiecej'\)/.test(ekran));
check('⭐⛔ (Z0) arkusz WYPISUJE na ekranie to, czego produkt nie umie zapisać',
  /czegoNieUmiemyZapisac\(\)/.test(ekran) && /MECZ_CZEKA_NA_KOLUMNE/.test(ekran));

// ⛔ KOLEJNOŚĆ, KTÓRA BYŁA NIENEGOCJOWALNA — sprawdzona, nie zadeklarowana.
check('⭐⛔ KOLEJNOŚĆ: wejście zastępcze i zdjęcie zakładki stoją w tym samym '
  + 'stanie repozytorium — nie ma chwili, w której zakładki nie ma, a wejścia jeszcze nie',
  /router\.push\('\/mecz'\)/.test(ekran) && /name="mecz"[\s\S]{0,120}href:\s*null/.test(layout));

// ⛔ PODSUMOWANIE W KSZTAŁCIE, KTÓRY CZYTA `tests/run-selftests.mjs`.
// Bez tej linii runner nie odróżnia strażnika, który wszystko sprawdził,
// od takiego, który nie uruchomił ani jednej asercji (znalezisko H1, O76).
console.log(`\n${ok} passed, ${bledy} failed`);
if (bledy > 0) throw new Error(`${bledy} asercji nie przeszło`);
