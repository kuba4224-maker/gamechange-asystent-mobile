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
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I1 16.08.2026 — `POMINIETE` PRZESTAJE BYĆ PRZEJŚCIEM (O76)
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE. Do 16.08.2026 ten runner puszczał wyjście strażników
// przez `stdio:'inherit'`, więc NICZEGO Z NIEGO NIE CZYTAŁ. Liczył wyłącznie
// kody wyjścia. Skutek zmierzony w rundzie H1: podsumowanie mówiło
// „44/44 plików przeszło", wyjście 0 — a DZIESIĘĆ ASERCJI SIĘ NIE WYKONAŁO,
// w tym dziewięć pilnujących RLS na tabeli zadań („tabela bez RLS to tabela,
// z której da się czytać cudze zadania"). Zdanie „44/44 przeszło" było
// prawdziwe i bezużyteczne naraz.
//
// CO ROBI TERAZ. Czyta wyjście każdego strażnika i:
//   1. LICZY POMINIĘCIA i podaje je osobno — przy każdym pliku i w sumie.
//      Nie da się już zobaczyć „44/44" i nie zobaczyć, że coś odpadło.
//   2. DZIELI POMINIĘCIA NA DWA RODZAJE:
//      • DOPUSZCZONE — warstwa mieszka w INNYM REPOZYTORIUM, którego w tym
//        drzewie nie ma. W CI to jest stan trwały: `actions/checkout@v4`
//        pobiera JEDNO repozytorium, więc te warstwy nie mają jak się
//        wykonać. Czerwień na nich znaczyłaby „CI czerwone zawsze", a CI
//        czerwone zawsze jest tak samo bezużyteczne jak zielone zawsze.
//      • NIEDOPUSZCZONE — wszystko inne. Brakujący plik W TYM repozytorium,
//        brakująca migracja, niewykonana gałąź. ⛔ ZAPALA WYJŚCIE NIEZEROWE.
//   3. NIE WIERZY ETYKIECIE NA SŁOWO. Pominięcie dopuszczone musi NAZWAĆ
//      ścieżkę, której szukało: bezwzględną, spoza tego repozytorium
//      i faktycznie nieistniejącą. Runner to sprawdza sam. Dopisanie sobie
//      `[poza-repo]` do pominięcia, które siedzi w tym repozytorium, kończy
//      się czerwienią z nazwą pliku.
//   4. WYMAGA PODSUMOWANIA OD KAŻDEGO STRAŻNIKA. Plik, który nie wypisze
//      linii „N passed, M failed" (albo jednej z uznanych odmian), jest
//      PORAŻKĄ, nie ciszą — inaczej strażnik, który po cichu nie uruchomił
//      ani jednej asercji, przechodziłby jako zielony.
//   5. SPRAWDZA, CZY STRAŻNIK NIE KŁAMIE O SOBIE. Liczba pominięć w jego
//      własnym podsumowaniu musi zgadzać się z liczbą wypisanych linii
//      `POMINIETE`. Rozjazd = porażka.
//
// ⚠️ CZEGO TO NADAL NIE ZAŁATWIA. Dopuszczone pominięcie to wciąż warstwa
// NIESPRAWDZONA — tyle że policzona i nazwana. Żeby sprawdzić ją naprawdę,
// CI musiałby pobierać trzy repozytoria obok siebie. Propozycja zmiany
// w `.github/workflows/kontrola.yml` leży w nocie pasa I1; nie wchodzi tutaj,
// bo zależy od decyzji D-C (uprywatnienie repozytoriów).

import { readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, isAbsolute } from 'node:path';
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

// ─────────────────────────────────────────────────────────────────────
// CZYTANIE WYJŚCIA STRAŻNIKA
// ─────────────────────────────────────────────────────────────────────

/**
 * Uznane kształty podsumowania. ⚠️ To NIE jest lista, która może cicho
 * zardzewieć (O69): plik, którego podsumowania tu nie ma, kończy się
 * PORAŻKĄ Z NAZWĄ PLIKU, a nie przemilczeniem. Nowy kształt dopisuje się
 * tutaj świadomie albo — lepiej — nowy strażnik używa pierwszego.
 */
const KSZTALT_PODSUMOWANIA =
  /^(\d+)\s+(?:passed|zaliczone|przeszło)\s*[,·]?\s+(\d+)\s+(?:failed|nieudane|nie przeszło)\.?(?:,\s*(\d+) POMINIETE)?/m;

/** Linia pominięcia. `[poza-repo]` = zgłoszenie „warstwa jest w innym repozytorium". */
const LINIA_POMINIECIA = /^POMINIETE(\s*\[poza-repo\])?\s*[-–]\s*(.*)$/gm;

/** Ścieżki bezwzględne wyłuskane z treści pominięcia (Windows i POSIX). */
const SCIEZKA_W_TRESCI = /(?:[A-Za-z]:\\[^\s|)]+|\/[^\s|)]+)/g;

/**
 * Pominięcie jest DOPUSZCZONE, jeżeli nazwało co najmniej jedną ścieżkę,
 * która (a) jest bezwzględna, (b) leży POZA tym repozytorium i (c) naprawdę
 * nie istnieje. Sama etykieta nie wystarcza — inaczej „dopuszczone" byłoby
 * słowem, którym da się uciszyć dowolną dziurę.
 */
function dopuszczone(tresc) {
  const kandydaci = tresc.match(SCIEZKA_W_TRESCI) ?? [];
  const dowody = kandydaci.filter((p) => {
    if (!isAbsolute(p)) return false;
    const wzgledna = relative(root, p);
    const wRepo = wzgledna !== '' && !wzgledna.startsWith('..') && !isAbsolute(wzgledna);
    return !wRepo && !existsSync(p);
  });
  return { ok: dowody.length > 0, dowody, kandydaci };
}

function czytajWyjscie(tekst) {
  const pominiecia = [];
  for (const m of tekst.matchAll(LINIA_POMINIECIA)) {
    const oznaczone = !!m[1];
    const tresc = m[2] ?? '';
    const d = dopuszczone(tresc);
    pominiecia.push({
      tresc,
      oznaczone,
      dopuszczone: oznaczone && d.ok,
      powodOdmowy: !oznaczone
        ? 'bez etykiety [poza-repo]'
        : (d.ok ? '' : `etykieta [poza-repo] bez dowodu — żadna z nazwanych ścieżek `
            + `nie jest jednocześnie spoza repozytorium i nieistniejąca `
            + `(znalezione: ${d.kandydaci.join(' , ') || 'żadne'})`),
    });
  }
  const p = tekst.match(KSZTALT_PODSUMOWANIA);
  return {
    pominiecia,
    podsumowanie: p
      ? { asercje: Number(p[1]) + Number(p[2]), fail: Number(p[2]), pominiete: p[3] ? Number(p[3]) : 0 }
      : null,
  };
}

// ─────────────────────────────────────────────────────────────────────
// PRZEBIEG
// ─────────────────────────────────────────────────────────────────────

console.log(`Uruchamiam ${selftests.length} selftestów z lib/\n`);

const results = [];
for (const file of selftests) {
  const path = join(libDir, file);
  const shown = relative(root, path);
  console.log(`${'═'.repeat(66)}\n▶  ${shown}\n${'═'.repeat(66)}`);
  // W1-fix 08.08.2026: `shell: true` na Windows skleja argumenty BEZ cudzysłowów,
  // więc absolutna ścieżka ze spacjami („…\Kuba - Gamechange\…") była cięta na
  // pierwszej spacji (objaw: url 'file:///C:/Users/Marta/Desktop/Kuba', 0/13 FAIL,
  // zweryfikowane na żywo 08.08.2026). Ścieżka WZGLĘDNA względem cwd=root nie
  // zawiera spacji (`lib/xxx.selftest.ts`), więc przechodzi przez powłokę w całości.
  //
  // ⭐ I1 16.08.2026: było `stdio:'inherit'`, czyli runner NIE WIDZIAŁ wyjścia
  // i nie mógł policzyć pominięć. Teraz przechwytuje je i wypisuje w całości —
  // zawodnik… to znaczy Kuba widzi dokładnie to samo, co widział, plus liczby.
  const run = spawnSync('npx', ['tsx', join('lib', file)], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === 'win32',
  });
  if (run.error) {
    console.error(`\nNie udało się uruchomić ${shown}: ${run.error.message}`);
    console.error('Jeśli brakuje `tsx`: npm install --no-save tsx');
    results.push({ file: shown, ok: false, powod: `nie udało się uruchomić: ${run.error.message}`, pominiecia: [], podsumowanie: null });
    continue;
  }

  const tekst = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);

  const { pominiecia, podsumowanie } = czytajWyjscie(tekst);
  const niedopuszczone = pominiecia.filter((p) => !p.dopuszczone);

  const powody = [];
  if (run.status !== 0) powody.push(`kod wyjścia ${run.status}`);
  if (!podsumowanie) {
    powody.push('⛔ strażnik NIE PODAŁ PODSUMOWANIA w rozpoznawanym kształcie '
      + '(„N passed, M failed" albo uznana odmiana) — bez niego nie da się odróżnić '
      + 'strażnika, który wszystko sprawdził, od takiego, który nie uruchomił ani jednej asercji');
  } else {
    if (podsumowanie.asercje === 0) powody.push('⛔ zero asercji — strażnik nic nie sprawdził');
    if (podsumowanie.pominiete !== pominiecia.length) {
      powody.push(`⛔ podsumowanie strażnika mówi o ${podsumowanie.pominiete} pominięciach, `
        + `a wypisanych linii POMINIETE jest ${pominiecia.length}`);
    }
  }
  for (const p of niedopuszczone) {
    powody.push(`⛔ POMINIĘCIE NIEDOPUSZCZONE (${p.powodOdmowy}): ${p.tresc.slice(0, 160)}`);
  }

  results.push({ file: shown, ok: powody.length === 0, powod: powody.join(' · '), pominiecia, podsumowanie });
  console.log('');
}

// ─────────────────────────────────────────────────────────────────────
// PODSUMOWANIE ZBIORCZE
// ─────────────────────────────────────────────────────────────────────
console.log('═'.repeat(66));
console.log('PODSUMOWANIE');
console.log('═'.repeat(66));

const szerokosc = Math.max(...results.map((r) => r.file.length));
for (const r of results) {
  const dop = r.pominiecia.filter((p) => p.dopuszczone).length;
  const nie = r.pominiecia.length - dop;
  const liczby = r.podsumowanie
    ? `${String(r.podsumowanie.asercje).padStart(4)} asercji`
    : '   ? asercji';
  const ogon = r.pominiecia.length === 0
    ? ''
    : `  ·  ${r.pominiecia.length} POMINIETE (dopuszczonych ${dop}${nie > 0 ? `, ⛔ NIEDOPUSZCZONYCH ${nie}` : ''})`;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.file.padEnd(szerokosc)}  ${liczby}${ogon}`);
  if (!r.ok && r.powod) console.log(`      ↳ ${r.powod}`);
}

const zle = results.filter((r) => !r.ok);
const wszystkiePominiecia = results.flatMap((r) => r.pominiecia.map((p) => ({ ...p, plik: r.file })));
const dopuszczoneP = wszystkiePominiecia.filter((p) => p.dopuszczone);
const niedopuszczoneP = wszystkiePominiecia.filter((p) => !p.dopuszczone);
const asercje = results.reduce((s, r) => s + (r.podsumowanie?.asercje ?? 0), 0);

console.log(`\n${results.length - zle.length}/${results.length} plików przeszło · ${asercje} asercji wykonanych.`);

// ⭐ TA LINIA JEST CAŁYM SENSEM PASA I1. Ma się wypisać ZAWSZE — także przy
// zerze — żeby „0 pominięć" było zdaniem, które ktoś przeczytał, a nie ciszą,
// którą wzięto za zero.
console.log(`POMINIĘTE: ${wszystkiePominiecia.length} `
  + `(dopuszczonych ${dopuszczoneP.length} · ⛔ NIEDOPUSZCZONYCH ${niedopuszczoneP.length})`);

if (dopuszczoneP.length > 0) {
  console.log('\n⚠️ POMINIĘCIA DOPUSZCZONE — warstwy w INNYCH repozytoriach, których tu nie ma.');
  console.log('   NIE SĄ ZIELONE. Są NIESPRAWDZONE — policzone i nazwane, nie ukryte:');
  for (const p of dopuszczoneP) console.log(`   • [${p.plik}] ${p.tresc}`);
}
if (niedopuszczoneP.length > 0) {
  console.log('\n⛔ POMINIĘCIA NIEDOPUSZCZONE — to jest powód czerwieni:');
  for (const p of niedopuszczoneP) console.log(`   • [${p.plik}] ${p.powodOdmowy}\n     ${p.tresc}`);
}

process.exit(zle.length > 0 ? 1 : 0);
