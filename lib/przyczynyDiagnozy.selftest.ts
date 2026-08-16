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
//
// ═════════════════════════════════════════════════════════════════════
// ⭐ PAS I2 16.08.2026 — CHOROBA K4 (ograniczenie O75)
// ═════════════════════════════════════════════════════════════════════
// CO BYŁO ZEPSUTE — nazwane liczbą. Ten plik miał 20 ASERCJI i ANI JEDNEJ,
// która czytałaby jakikolwiek EKRAN. Sprawdzał wyłącznie `components/
// diagnosisProfile.ts` przez `import`. Cała logika przyczynowa mogła być
// policzona bezbłędnie i narysowana ZŁE — albo nie narysowana wcale —
// a te 20 asercji nadal świeciło 20 na 20.
//
// ⚠️ NAZWA TEGO PLIKU KŁAMIE I TO JEST PIERWSZE ZNALEZISKO PASA I2.
// **`lib/przyczynyDiagnozy.ts` NIE ISTNIEJE** — sprawdzone `existsSync`
// niżej, żeby nikt nie musiał tego badać po raz trzeci (O55). Modułem
// pilnowanym jest `components/diagnosisProfile.ts`, a EKRANEM, który jego
// wynik rysuje zawodnikowi, jest `components/DiagnosisProfileView.tsx`
// montowany przez `app/(tabs)/diagnoza.tsx`.
//
// ⚠️ KOREKTA WOBEC AUDYTU H1 (15.08). H1 zapisał ten plik jako „⛔ WYJĄTEK"
// z powodem „`meaningfulWeakness is not a function` na każdej starszej
// `diagnosisProfile.ts`". Fakt jest prawdziwy, ale nazywa NIE TĘ OŚ:
//   • `components/diagnosisProfile.ts` powstał `f54bc0b` (07.08.2026),
//     strażnik `e3cce2b` (12.08.2026) — pliki są z RÓŻNYCH commitów;
//   • ale `meaningfulWeakness` I deduplikacja w `getRankedInfluences`
//     I ten strażnik weszły W JEDNYM commicie `e3cce2b`. To jest **K3**
//     na osi FUNKCJI, nie na osi pliku — i dlatego testu historycznego
//     nie da się zrobić NA MODULE.
//   • ⭐ ALE DA SIĘ GO ZROBIĆ NA EKRANIE: `components/DiagnosisProfileView.tsx`
//     ma cztery commity (`f54bc0b` 07.08 → `d893d38` 16.08) i w trzech z nich
//     rysuje przyczynę INNYM kształtem niż dziś. Sekcja 0 jest sprawdzona
//     dokładnie na tym stanie (pomiar w nocie I2).
//
// ⚠️ CZEGO SEKCJA 0 NIE UDAJE. Czyta źródło ekranu JAKO TEKST — nie uruchamia
// Reacta i nie wie, czy ekran się rysuje. Podmiana wywołania na inne, równie
// zepsute, przejdzie tu niezauważona.
//
// ⚠️ NIE UŻYWAĆ `new URL(...)` (O53): `tsconfig.json` ciągnie DOM, `tsc` pada
// wtedy z TS2769. Ścieżka idzie przez `fileURLToPath`.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getRankedInfluences, meaningfulWeakness, getRelativeDeficits, playerMedianAndSpread, DEPENDENCY_NETWORK, getHiddenCauses } from '../components/diagnosisProfile';

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

// ═══════════════════════════════════════════════════════════════════
// ⭐ 0. PAS I2 16.08.2026 — EKRAN, KTÓRY RYSUJE PRZYCZYNY (K4 / O75)
// ═══════════════════════════════════════════════════════════════════
// Wszystkie asercje niżej czytają ŹRÓDŁO EKRANU, nie moduł. Bez nich
// 20 asercji tego pliku opisuje funkcję, której nikt nie musi wołać.
{
  console.log('0. EKRAN, KTÓRY RYSUJE PRZYCZYNY (K4 / O75)');

  const root = dirname(dirname(fileURLToPath(import.meta.url)));

  /**
   * Źródło BEZ komentarzy — pliki tego projektu CYTUJĄ w komentarzach nazwy
   * funkcji i zepsute wywołania („było `segmentLabel(id)`", „patrz
   * `describeCause`"), więc strażnik czytający surowy tekst przechodziłby
   * na własnej dokumentacji. Wtedy jedynym sposobem, żeby go zapalić, byłoby
   * skasowanie wyjaśnienia.
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

  const PLIK_WIDOK = 'components/DiagnosisProfileView.tsx';
  const PLIK_DIAGNOZA = 'app/(tabs)/diagnoza.tsx';
  const PLIK_JA = 'app/(tabs)/ja.tsx';
  const PLIK_BIBLIOTEKA = 'app/(tabs)/biblioteka.tsx';
  const widok = bezKomentarzy(surowe(PLIK_WIDOK));
  const diagnoza = bezKomentarzy(surowe(PLIK_DIAGNOZA));
  const ja = bezKomentarzy(surowe(PLIK_JA));
  const biblioteka = bezKomentarzy(surowe(PLIK_BIBLIOTEKA));

  check('⛔ (I2-0) każdy plik ekranu z listy strażnika istnieje i daje się odczytać',
    BRAK_PLIKOW.length === 0,
    `NIE MA TYCH PLIKÓW: ${BRAK_PLIKOW.join(', ')} — zmieniła się nazwa albo miejsce ekranu. `
    + 'Popraw listę w tym pliku ALBO przywróć ekran; do tego czasu asercje niżej '
    + 'czytają PUSTY tekst i nie znaczą nic.');

  // ⚠️ Nazwa tego pliku obiecuje moduł, którego nie ma. Asercja stoi tu po to,
  // żeby dzień, w którym ktoś taki plik założy, nie skończył się dwoma
  // rozjeżdżającymi się rachunkami przyczyn (ten sam ruch, co `(G1)`
  // w `nazwaObszaruNaEkranie.selftest.ts` wobec `lib/diagnosisProfile.ts`).
  check('⭐ (I2-0) `lib/przyczynyDiagnozy.ts` NIE ISTNIEJE — modułem tego strażnika jest `components/diagnosisProfile.ts`',
    !existsSync(join(root, 'lib/przyczynyDiagnozy.ts')),
    'powstał drugi plik o nazwie tego strażnika — od dziś dwa miejsca liczą przyczyny i nikt nie wie, które rysuje ekran');

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
  const PLIKI = ['app', 'components', 'lib']
    .flatMap((k) => chodz(join(root, k)))
    .map((p) => relative(root, p).split(sep).join('/'))
    .filter((p) => !p.endsWith('.selftest.ts'))
    .sort();
  const zywe = (p: string): string => bezKomentarzy(readFileSync(join(root, p), 'utf8'));

  const konsumenci = PLIKI.filter((p) => /from\s+'[^']*\/diagnosisProfile'/.test(zywe(p)));
  // ⚠️ ZMIERZONE 16.08.2026 na `main` = `123e09c`, nie przepisane z pamięci.
  // RÓWNOŚĆ, nie „≥ 1" (O73): „co najmniej jeden konsument" przeszłoby także
  // wtedy, gdy ekran wyniku diagnozy przestanie liczyć deficyty, a zostanie
  // sama Biblioteka. Przemiatam TAKŻE `lib/`, bo `lib/rediagnosisIO.ts` jest
  // czwartym konsumentem i jego zniknięcie też jest wynikiem, nie szumem.
  const KONSUMENCI = [PLIK_BIBLIOTEKA, PLIK_JA, PLIK_WIDOK, 'lib/rediagnosisIO.ts'].sort();
  const brakujacy = KONSUMENCI.filter((p) => !konsumenci.includes(p));
  const nadmiarowi = konsumenci.filter((p) => !KONSUMENCI.includes(p));
  check('⭐ (I2-0) logikę diagnozy sprowadzają DOKŁADNIE te pliki, co 16.08 — RÓWNOŚĆ, nie „≥ 1" (O73)',
    brakujacy.length === 0 && nadmiarowi.length === 0,
    `BRAKUJE: ${brakujacy.join(', ') || '—'} · NADMIAROWI: ${nadmiarowi.join(', ') || '—'} `
    + '→ ubył: zawodnik przestał gdzieś widzieć wynik diagnozy, a 20 asercji niżej nadal jest zielonych; '
    + 'doszedł: sprawdź, czy nowe miejsce nie liczy deficytów po swojemu.');

  // ⭐ ZAPADKA PIERWSZEGO STOPNIA: cały ten łańcuch jest rysowany zawodnikowi
  // WYŁĄCZNIE przez `diagnoza.tsx`. Gdy zniknie stamtąd montaż widoku, logika
  // przyczynowa staje się funkcją bez konsumenta, a ten plik nadal świeci.
  const montujacy = PLIKI.filter((p) => /from\s+'[^']*\/DiagnosisProfileView'/.test(zywe(p)));
  check('⭐ (I2-0) `diagnoza.tsx` NAPRAWDĘ montuje `<DiagnosisProfileView` — i jest jedynym miejscem, które to robi',
    montujacy.length === 1 && montujacy[0] === PLIK_DIAGNOZA && /<DiagnosisProfileView\b/.test(diagnoza),
    `montujący: ${montujacy.join(', ') || '(ani jeden)'} — zniknął montaż: cała logika przyczynowa jest liczona `
    + 'i nigdzie nierysowana, a zawodnik nie ma gdzie zobaczyć wąskich gardeł; '
    + 'doszedł drugi: dwa ekrany rysują ten sam wynik i rozjadą się po cichu');

  // ── EKRAN NIE LICZY DRUGI RAZ TEGO, CO POLICZYŁ MODUŁ ──
  // Defekt, którego pilnuje: ekran dokłada własny rachunek istotności. Wtedy
  // w produkcie są DWA progi „co jest deficytem", oba przekonane, że są jedyne.
  // Skutek dla zawodnika: obszar w normie (77 na 100) wraca jako „główna
  // przyczyna" — dokładnie pomiar z 12.08.2026 opisany na górze tego pliku.
  check('⛔ (I2-0) ekran NIE ma własnego progu istotności — ani `meaningfulWeakness(`, ani `playerMedianAndSpread(`',
    !/meaningfulWeakness\(/.test(widok) && !/playerMedianAndSpread\(/.test(widok),
    'na ekranie pojawił się drugi rachunek progu; „co jest wąskim gardłem" ma JEDNO miejsce '
    + '— `components/diagnosisProfile.ts`. Dwa progi rozjadą się po cichu i zawodnik zobaczy '
    + 'jako przyczynę obszar, którego produkt nie uznaje nawet za deficyt');

  check('⛔ (I2-0) ekran NIE robi drugiego rankingu — ani jednego `getRankedInfluences(` poza modułem',
    !/getRankedInfluences\(/.test(widok),
    'ekran zaczął sam rankować wpływy; deduplikacja z 12.08 siedzi WEWNĄTRZ `getRankedInfluences`, '
    + 'więc drugi ranking na ekranie wskrzesza defekt „Odżywianie, Odżywianie" — ten sam segment '
    + 'wypisany zawodnikowi dwa razy jako przyczyna');

  check('⛔ (I2-0) zdanie o przyczynie składa `describeCause(scores, id)` — z PEŁNYM profilem, nie z wycinkiem',
    /describeCause\(\s*scores\s*,\s*id\s*\)/.test(widok),
    'ekran przestał wołać `describeCause` z całym `scores`; mediana i rozrzut liczą się WEWNĄTRZ '
    + 'modułu z tego, co dostanie — podany wycinek profilu przesuwa próg i zawodnik czyta przyczynę '
    + 'wyliczoną na innym zbiorze niż ten, który widzi');

  check('⛔ (I2-0) ukryta przyczyna dostaje TEN SAM zbiór deficytów, który ekran rysuje',
    /getHiddenCauses\(\s*scores\s*,\s*deficits\s*,/.test(widok)
    && /const\s+deficits\s*=\s*getRelativeDeficits\(\s*scores\s*,/.test(widok),
    'ekran podaje do `getHiddenCauses` inną listę niż `deficits` z `getRelativeDeficits`; wtedy '
    + '„ukryta przyczyna" jest liczona względem deficytów, których zawodnik na tym ekranie nie widzi');

  check('⛔ (I2-0) ekran NIE sortuje, nie tnie i nie filtruje wyniku `getRelativeDeficits`',
    !/\bdeficits\s*\.\s*(sort|slice|filter|reverse)\s*\(/.test(widok),
    'ekran zawęża albo przestawia listę deficytów po module; kolejność „tu zacznij pracę" '
    + 'ma DOKŁADNIE jedno miejsce, a limit 4 stoi w wywołaniu `getRelativeDeficits(scores, 4)`');

  // ── EKRAN ROZRÓŻNIA WSZYSTKIE STANY, KTÓRE ROZRÓŻNIA MODUŁ ──
  // ⚠️ TO JEST TA ASERCJA, KTÓRA ZAPALA SIĘ NA HISTORII. Do `d893d38`
  // (16.08) ekran składał zdanie o przyczynie DWUGAŁĘZIOWYM `?:` wprost
  // w JSX. Gdy moduł dostał trzeci rodzaj `nieznana_przyczyna` (G1), taki
  // zapis narysowałby zawodnikowi `undefined` sklejone z `undefined` —
  // po cichu, bo TypeScript nie ma tam czego sprawdzić.
  check('⛔ (I2-0) rodzaj przyczyny rozstrzyga JEDNA funkcja ekranu, nie `?:` wpisane w JSX',
    /<Text\s+style=\{styles\.deficitCause\}>\s*\{\s*opisPrzyczyny\(\s*cause\s*\)\s*\}\s*<\/Text>/.test(widok),
    'zdanie o przyczynie jest znów składane wprost w JSX; każdy nowy rodzaj `CauseText` '
    + 'wejdzie tam po cichu i zawodnik przeczyta zlepek `undefined` zamiast przyczyny');

  check('⭐ (I2-0) czwarty rodzaj `CauseText` NIE przejdzie po cichu — `never` domyka rozgałęzienie',
    /:\s*never\s*=\s*cause\b/.test(widok),
    'zniknęła zapadka wyczerpania rodzajów; dołożenie czwartego rodzaju w module przestanie '
    + 'być błędem kompilacji, a ekran narysuje go jako pustkę');

  // ── ⭐⭐ DEDUPLIKACJA, KTÓRA MIESZKA NA EKRANIE, A NIE W MODULE ──
  // ZNALEZISKO I2: defekt „ten sam segment dwa razy" (12.08) naprawiono
  // w `getRankedInfluences`, ale `getHiddenCauses` NADAL oddaje powtórzenia —
  // sieć zależności ma parę `odzywianie→wytrzymalosc` DWA RAZY, obie z wagą
  // ≥ 0.5. Jedyne, co dziś dzieli zawodnika od zdania „…wpływa na obszary
  // wypisane wyżej (Wytrzymałość, Wytrzymałość)", to `new Set` NA EKRANIE.
  // Dlatego są tu DWIE asercje: jedna dowodzi, że powtórzenie naprawdę
  // wychodzi z modułu, druga — że ekran je zdejmuje.
  const F: Record<string, number> = {};
  IDS.forEach((id) => { F[id] = 80; });
  F.wytrzymalosc = 45;
  const ukryteF = getHiddenCauses(F, getRelativeDeficits(F, 4), 0.5);
  const zPowtorzeniem = ukryteF.filter((h) => h.causesFor.length !== new Set(h.causesFor).size);
  check('⭐ (I2-0) PRZESŁANKA: `getHiddenCauses` NAPRAWDĘ oddaje powtórzone `causesFor` — asercja niżej ma czego pilnować',
    zPowtorzeniem.length > 0,
    'moduł przestał powtarzać wyliczenie (albo zmieniły się wagi w DEPENDENCY_NETWORK) — '
    + 'wtedy asercja o `new Set` na ekranie sprawdza nic i trzeba ją przepisać, a nie zostawić zieloną');

  check('⭐⭐ (I2-0) ekran ZDEJMUJE powtórzenia z `causesFor` przed narysowaniem',
    /new\s+Set\(\s*hiddenCauseRaw\.causesFor\s*\)/.test(widok),
    'zniknęła deduplikacja wyliczenia w bloku „Ukryta przyczyna" — zawodnik przeczyta '
    + '„wpływa na obszary wypisane wyżej (Wytrzymałość, Wytrzymałość)", czyli defekt z 12.08 '
    + 'w jedynym miejscu, w którym nigdy go nie naprawiono w module');

  // ── ⭐ ZAPADKA NA SKASOWANIE ──
  // Bez tych dwóch asercji wszystkie powyższe spełnia się przez USUNIĘCIE
  // rysowania wąskich gardeł. Strażnik nagradzałby wtedy skasowanie funkcji.
  check('⭐ (I2-0) ekran NAPRAWDĘ rysuje listę wąskich gardeł — `deficits.map(` idzie do widoku',
    /\{\s*deficits\.map\(/.test(widok) || /deficits\.map\(\s*\(\s*\[/.test(widok),
    'zniknęło renderowanie deficytów; wszystkie asercje wyżej spełnia też ekran, '
    + 'który nie pokazuje zawodnikowi ani jednego wąskiego gardła');

  check('⭐ (I2-0) ekran NAPRAWDĘ rysuje blok „Ukryta przyczyna", a nie tylko go liczy',
    /hiddenCause\s*\?\s*\(/.test(widok) && /Ukryta przyczyna/.test(widok),
    'blok ukrytej przyczyny zniknął z widoku; `getHiddenCauses` liczy się nadal, '
    + 'a zawodnik nie dowie się o obszarze, który blokuje mu wszystkie pozostałe');

  // ── DWA POZOSTAŁE EKRANY: deficyty liczone funkcją modułu, nie u siebie ──
  check('⛔ (I2-0) „Ja" i „Biblioteka" liczą deficyty `getRelativeDeficits(`, a nie własnym sortowaniem',
    /getRelativeDeficits\(/.test(ja) && /getRelativeDeficits\(/.test(biblioteka)
    && !/\bObject\.entries\(\s*scores\s*\)[\s\S]{0,120}?\.sort\(/.test(ja)
    && !/\bObject\.entries\(\s*scores\s*\)[\s\S]{0,120}?\.sort\(/.test(biblioteka),
    'jeden z tych ekranów zaczął wybierać deficyty po swojemu; wtedy skrót na „Ja" i otwarte '
    + 'materiały w Bibliotece pokazują INNE wąskie gardła niż ekran wyniku diagnozy');
}

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
