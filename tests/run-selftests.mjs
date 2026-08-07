// WIEDZA B4 08.08.2026 — NOWY PLIK. Jedno polecenie na wszystkie selftesty
// appki mobilnej.
//
//   node tests/run-selftests.mjs
//
// Wymaga `tsx` (selftesty są w TypeScripcie). Jeśli go nie ma:
//   npm install --no-save tsx
//
// PO CO TO ISTNIEJE — znalezisko N7 z audytu po bloku 3. Runda 3 napisała 55
// scenariuszy dla panelu trenera i 12 asercji dla `lib/labels.ts`, po czym
// WSZYSTKIE zniknęły razem z sesją, bo `tests/` nie należało do żadnego pasa
// i nikt ich nie zapisał na dysk. Od rundy 4 zasada brzmi: `tests/` wchodzi
// do pasa sesji, która zmienia testowany plik (ograniczenie O11).
//
// Ten runner NIE JEST frameworkiem i nie ma nim być. Instalowanie Jesta pod
// appkę Expo to konfiguracja transformerów React Native, mocki `react-native`
// i pół dnia pracy — a wszystkie reguły, które w tym projekcie da się zepsuć po
// cichu (bramka wiekowa, kolejność Pickera, rozróżnienie „pusto" od „nie ma
// tabeli"), są CZYSTYMI FUNKCJAMI bez Reacta. Ich sprawdzenie nie potrzebuje
// frameworka, tylko tego, żeby ktoś je uruchomił.
//
// ⚠️ CZEGO TEN RUNNER NIE SPRAWDZA — i nie udaje, że sprawdza:
//   • zgodności propsów z React Native (to robi `npx tsc --noEmit`),
//   • niczego, co dotyka Supabase albo ekranu.
// Uruchomienie go na zielono NIE znaczy „appka działa". Znaczy „reguły, które
// spisaliśmy, nadal obowiązują".

import { readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const libDir = join(root, 'lib');

if (!existsSync(libDir)) {
  console.error(`Nie znajduję katalogu lib/ pod ${root}. Uruchom z katalogu projektu appki.`);
  process.exit(2);
}

// Odkrywanie zamiast listy na sztywno: nowy selftest wpada tu sam, bez edycji
// tego pliku. Lista na sztywno prędzej czy później rozjechałaby się z katalogiem
// — a runner, który po cichu nie uruchamia połowy testów, jest gorszy niż brak
// runnera, bo daje fałszywą zieloną odpowiedź.
const selftests = readdirSync(libDir)
  .filter((f) => f.endsWith('.selftest.ts'))
  .sort();

if (selftests.length === 0) {
  console.error('Nie znalazłem ani jednego pliku lib/*.selftest.ts — to samo w sobie jest błędem.');
  process.exit(2);
}

console.log(`Uruchamiam ${selftests.length} selftestów z lib/\n`);

const results = [];
for (const file of selftests) {
  const path = join(libDir, file);
  const shown = relative(root, path);
  console.log(`${'═'.repeat(66)}\n▶  ${shown}\n${'═'.repeat(66)}`);
  const run = spawnSync('npx', ['tsx', path], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (run.error) {
    console.error(`\nNie udało się uruchomić ${shown}: ${run.error.message}`);
    console.error('Jeśli brakuje `tsx`: npm install --no-save tsx');
    results.push({ file: shown, ok: false });
    continue;
  }
  results.push({ file: shown, ok: run.status === 0 });
  console.log('');
}

console.log('═'.repeat(66));
console.log('PODSUMOWANIE');
console.log('═'.repeat(66));
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.file}`);

const failedFiles = results.filter((r) => !r.ok);
console.log(`\n${results.length - failedFiles.length}/${results.length} plików przeszło.`);
process.exit(failedFiles.length > 0 ? 1 : 0);
