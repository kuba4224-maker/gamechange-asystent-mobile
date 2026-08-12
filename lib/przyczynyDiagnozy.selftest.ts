// PRZYCZYNY 12.08.2026 — NOWY PLIK. Asercje dla logiki przyczynowej diagnozy
// (components/diagnosisProfile.ts: getRankedInfluences, meaningfulWeakness).
//
//   npx tsx lib/przyczynyDiagnozy.selftest.ts
//
// PO CO TEN PLIK ISTNIEJE
// Dwa defekty zgłoszono 07.08.2026 i przeleżały jedenaście rund, bo nic ich nie
// pilnowało. Potwierdzono je 12.08.2026 wywołaniem prawdziwej funkcji na żywym
// lejku diagnozy — profil „Moc 30, reszta 77-81" zwracał:
//
//     ["decyzja", "odzywianie", "odzywianie"]
//
// czyli (1) ten sam segment wypisany dwa razy jako „dodatkowy wpływ" i (2) jako
// GŁÓWNĄ przyczynę słabej Mocy — Szybkość Decyzji z wynikiem 77 na 100.
// Ten plik zamienia tamten pomiar w asercję. Kolejna zmiana progu albo sortowania
// zapali się tutaj, zanim zobaczy to zawodnik.
//
// UWAGA: identyczna poprawka siedzi w gamechange-diagnoza/index.html, który nie ma
// harnessu testowego. Zmieniając cokolwiek tutaj — zmień tam, i odwrotnie.
// Sprawdzone 12.08.2026: obie strony zwracają dla tych samych profili identyczne listy.
import { getRankedInfluences, meaningfulWeakness, getRelativeDeficits, playerMedianAndSpread, DEPENDENCY_NETWORK } from '../components/diagnosisProfile';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

const IDS = ['moc', 'fizycznosc', 'wytrzymalosc', 'tolerancja', 'regeneracja', 'odzywianie',
  'odpornosc', 'technika', 'techSpec', 'percepcja', 'decyzja', 'koncentracja', 'mental'];

const zrodla = (s: Record<string, number>, target: string, limit = 3): string[] =>
  getRankedInfluences(s, target, limit).map((inf) =>
    inf.kind === 'cascade' ? 'kaskada:' + inf.nodes.join('>') : inf.from);

// ── profile testowe ──────────────────────────────────────────
// A: dokładnie ten, którym zmierzono defekt na produkcji 12.08.2026
const A: Record<string, number> = {};
IDS.forEach((id, i) => { A[id] = 77 + (i % 5); });
A.moc = 30;

// B: realistyczny profil z kilkoma prawdziwymi deficytami — strażnik anty-regresji
const B: Record<string, number> = {
  moc: 45, fizycznosc: 70, wytrzymalosc: 52, tolerancja: 48, regeneracja: 44, odzywianie: 50,
  odpornosc: 72, technika: 75, techSpec: 68, percepcja: 71, decyzja: 66, koncentracja: 73, mental: 58,
};

// C: profil płaski z jedną zapadnią
const C: Record<string, number> = {};
IDS.forEach((id) => { C[id] = 60; });
C.moc = 25;

// D: wszystko słabe równo — nie ma deficytu WZGLĘDNEGO
const D: Record<string, number> = {};
IDS.forEach((id) => { D[id] = 35; });

// E: profil zbudowany CELOWO tak, żeby uruchomić deduplikację.
// DEPENDENCY_NETWORK ma 13 par występujących dwukrotnie (różne wagi/typy), m.in.
// odzywianie→moc, tolerancja→moc i mental→moc. Żeby strażnik deduplikacji cokolwiek
// sprawdzał, wszystkie trzy źródła muszą być ISTOTNIE słabe naraz — inaczej próg
// istotności usuwa je wcześniej i asercja przechodzi z niewłaściwego powodu.
const E: Record<string, number> = {};
IDS.forEach((id) => { E[id] = 82; });
E.moc = 40; E.odzywianie = 50; E.tolerancja = 52; E.mental = 48;

// ── 1. defekt zmierzony na produkcji nie wraca ───────────────

check('profil z pomiaru (Moc 30 / reszta 77-81): ZERO przyczyn zewnętrznych',
  zrodla(A, 'moc').length === 0,
  'wskazano przyczynę: ' + JSON.stringify(zrodla(A, 'moc')));

check('profil z pomiaru: Szybkość Decyzji z wynikiem 77 NIE jest przyczyną słabej Mocy',
  !zrodla(A, 'moc').includes('decyzja'),
  'obszar w normie wskazany jako przyczyna');

check('profil płaski z jedną zapadnią: deficyt samodzielny, nie zmyślona przyczyna',
  zrodla(C, 'moc').length === 0,
  JSON.stringify(zrodla(C, 'moc')));

check('wszystko słabe równo: brak deficytu względnego, brak przyczyn',
  zrodla(D, 'moc').length === 0,
  JSON.stringify(zrodla(D, 'moc')));

// ── 2. żadna lista nie powtarza źródła (defekt „Odżywienie, Odżywienie") ──

const bezPowtorzen = (s: Record<string, number>): string[] => {
  const zle: string[] = [];
  for (const id of IDS) {
    const lista = zrodla(s, id, 3);
    if (lista.length !== new Set(lista).size) zle.push(`${id}: ${JSON.stringify(lista)}`);
  }
  return zle;
};

for (const [nazwa, profil] of [['A', A], ['B', B], ['C', C], ['D', D], ['E', E]] as [string, Record<string, number>][]) {
  const zle = bezPowtorzen(profil);
  check(`profil ${nazwa}: żaden z 13 segmentów nie wypisuje tej samej przyczyny dwa razy`,
    zle.length === 0, zle.join(' | '));
}

// Strażnik strażnika: profil E MUSI realnie produkować powtórzone krawędzie przed
// deduplikacją. Gdyby przestał (bo ktoś zmienił wagi w DEPENDENCY_NETWORK), asercja
// wyżej zaczęłaby przechodzić nic nie sprawdzając — i nikt by tego nie zauważył.
// Publiczne API już deduplikuje, więc powtórzeń nie da się zobaczyć na jego wyjściu.
// Sprawdzamy więc materiał wejściowy: czy w sieci zależności naprawdę są dwie krawędzie
// z tego samego, ISTOTNIE SŁABEGO w profilu E źródła do „moc".
const { median: medE, stdDev: sdE } = playerMedianAndSpread(E);
const doMocy = (DEPENDENCY_NETWORK as { from: string; to: string }[]).filter((r) => r.to === 'moc');
const zrodlaZDuplikatem = doMocy
  .map((r) => r.from)
  .filter((f, _i, arr) => arr.filter((x) => x === f).length > 1 && meaningfulWeakness(E[f], medE, sdE) > 0);
check('profil E realnie uruchamia deduplikację (≥1 źródło z dwiema krawędziami do „moc", istotnie słabe)',
  new Set(zrodlaZDuplikatem).size > 0,
  'żadne powtórzone źródło nie jest w tym profilu istotnie słabe — test deduplikacji sprawdzałby nic');

// ── 3. anty-regresja: próg nie zabił funkcji ─────────────────

check('realistyczny profil nadal DOSTAJE przyczyny (próg nie wyciszył mechanizmu)',
  zrodla(B, 'moc').length > 0 && zrodla(B, 'tolerancja').length > 0 && zrodla(B, 'regeneracja').length > 0,
  'moc=' + JSON.stringify(zrodla(B, 'moc')) + ' tolerancja=' + JSON.stringify(zrodla(B, 'tolerancja')));

check('realistyczny profil: przyczyny są sensowne (Moc ↔ regeneracja/tolerancja/wytrzymałość)',
  zrodla(B, 'moc').join(' ').includes('regeneracja') || zrodla(B, 'moc').join(' ').includes('tolerancja'),
  JSON.stringify(zrodla(B, 'moc')));

// ── 4. spójność z definicją wąskiego gardła ──────────────────
// Segment nie może być „przyczyną", jeśli produkt nie uznaje go nawet za deficyt.

const niespojne: string[] = [];
for (const [nazwa, profil] of [['A', A], ['B', B], ['C', C], ['D', D]] as [string, Record<string, number>][]) {
  const deficyty = new Set(getRelativeDeficits(profil, 13).map(([id]) => id));
  for (const target of IDS) {
    for (const inf of getRankedInfluences(profil, target, 3)) {
      if (inf.kind !== 'pair') continue;
      if (!deficyty.has(inf.from)) niespojne.push(`${nazwa}/${target}: ${inf.from}`);
    }
  }
}
check('każda wskazana przyczyna jest jednocześnie względnym deficytem tego zawodnika',
  niespojne.length === 0,
  niespojne.slice(0, 5).join(' | '));

// ── 5. sam próg: dokładne granice ────────────────────────────

check('meaningfulWeakness: różnica poniżej 9 punktów NIE liczy się jako przyczyna',
  meaningfulWeakness(92, 100, 20) === 0 && meaningfulWeakness(91.5, 100, 20) === 0,
  'przepuszczono nieistotną różnicę');

check('meaningfulWeakness: różnica 9+ punktów i poniżej 0.5 odchylenia — liczy się',
  meaningfulWeakness(90, 100, 18) === 10,
  String(meaningfulWeakness(90, 100, 18)));

// Granica jest WYŁĄCZAJĄCA, dokładnie jak w getRelativeDeficits (`score < median - 0.5σ`).
// Wynik stojący co do punktu na progu NIE jest jeszcze przyczyną — inaczej dwie funkcje
// opisujące to samo pojęcie rozjechałyby się o jeden punkt.
check('meaningfulWeakness: wynik dokładnie na granicy 0.5 odchylenia jeszcze nie liczy się',
  meaningfulWeakness(90, 100, 20) === 0,
  String(meaningfulWeakness(90, 100, 20)));

check('meaningfulWeakness: duża różnica, ale mieszcząca się w 0.5 odchylenia — nie liczy się',
  meaningfulWeakness(85, 100, 40) === 0,
  'zignorowano rozrzut profilu');

check('meaningfulWeakness: wynik powyżej mediany nigdy nie jest przyczyną',
  meaningfulWeakness(120, 100, 10) === 0 && meaningfulWeakness(100, 100, 10) === 0,
  'mocna strona wskazana jako przyczyna');

check('meaningfulWeakness: brak danych to nie zero-słabość, tylko brak',
  meaningfulWeakness(undefined, 100, 10) === 0,
  'undefined potraktowane jak wynik');

// ── 6. mediana i rozrzut liczone z profilu zawodnika, nie ze sztywnego progu ──

const { median: medA } = playerMedianAndSpread(A);
check('mediana profilu A wynosi 79 (kontrola, że progi liczą się z profilu zawodnika)',
  medA === 79, String(medA));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
