// PLAN-D-M1 08.2026 (17.08.2026) — NOWY PLIK. STRAŻNIK STRAŻNIKA WYSOKOŚCI.
//
//   npx tsx lib/wysokoscEkranu.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ═════════════════════════════════════════════════════════════════════
// ⛔ PO CO TEN PLIK ISTNIEJE — to jest połowa wartości pasa M1
// ═════════════════════════════════════════════════════════════════════
// `tests/measure-heights.ts` był JEDYNYM narzędziem w tym projekcie, które
// odpowiadało na pytanie „czy to się mieści na telefonie". 17.08.2026
// zmierzono, że:
//
//   • kończy WYJĄTKIEM (`REGRESJA: dzis.tsx ma 213 914 B przy progu 48 000`),
//   • ten wyjątek pada od commita `e3cce2b` (12.08.2026), czyli od commita,
//     który sam ten próg dołożył — narzędzie NIE PRZESZŁO ANI RAZU,
//   • od tamtej pory weszły 32 commity, z czego 15 dotykało `dzis.tsx`,
//   • ⛔ i NIKT TEGO NIE ZOBACZYŁ, bo `node tests/run-selftests.mjs` odkrywa
//     wyłącznie `lib/*.selftest.ts`. Suita mówiła „45/45 · 2 791 asercji ·
//     POMINIĘTE 0" i to była prawda — o czterdziestu pięciu plikach, wśród
//     których tego narzędzia nie było.
//
// ⭐ WNIOSEK, KTÓRY TEN PLIK WYKONUJE: narzędzie poza suitą umiera po cichu.
// Ten plik JEST wejściem narzędzia do suity. Woła je naprawdę — uruchamia
// proces — i sprawdza, że oddaje LICZBĘ I LISTĘ, a nie wyjątek.
//
// ⚠️ Asercja „plik istnieje" nic by tu nie pilnowała: plik istniał przez całe
// dziewięć dni, w których nie działał.
//
// ═════════════════════════════════════════════════════════════════════
// CO PILNUJE — pięć rzeczy, każda z powodem
// ═════════════════════════════════════════════════════════════════════
//  1. URUCHOMIENIE (D3). Narzędzie odpalone na `app/(tabs)/dzis.tsx` kończy
//     kodem 0 i wypisuje listę pozycji. Wyjątek = czerwień z nazwą pliku.
//  2. MODEL Z EKRANU (D2). Nazwy bloków ekranu NIE MOGĄ stać w źródle
//     strażnika — mają być przemiecione z pliku ekranu. Dopisanie karty
//     do ekranu zmienia wynik bez dotykania miary.
//  3. ⛔ ZAPADKA NA RÓWNOŚĆ (D4). Liczba rzeczy na „Dziś", liczba rzeczy
//     widocznych bez przewijania i wysokość ekranu są przybite na `===`.
//     Kto doda coś do „Dziś", zobaczy czerwień i albo coś zdejmie, albo
//     świadomie przestawi zapadkę — z datą i powodem, poniżej.
//  4. JEDNA MIARA (D5). Liczba dp „nad zgięciem" występuje w repozytorium
//     dokładnie raz. Trzy kopie progu to trzy progi.
//  5. ⛔ PRÓG BAJTOWY NIE WRACA. `dzis.tsx > 48 000 B` nie był miarą
//     wysokości i nie ma prawa wrócić pod tą nazwą.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  zmierzEkran, zmierzEkranZTekstu, przeciete, WIDOCZNE_NAD_ZGIECIEM_DP,
} from './wysokoscEkranu';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy.
 *
 * ⚠️ KOLEJNOŚĆ JEST TU ISTOTNA I KOSZTOWAŁA JEDNĄ CZERWONĄ ASERCJĘ. Wersja
 * z innych strażników wycina najpierw bloki `/* … *\/`, a potem linie `//`.
 * W tym repozytorium komentarze cytują ścieżki w rodzaju `lib/*.selftest.ts`
 * — a `/*` w środku linii komentarza otwiera dla takiego wycinania FAŁSZYWY
 * blok, który zjada 3 000 znaków prawdziwego kodu razem z badaną stałą.
 * Dlatego najpierw linie, dopiero potem bloki.
 */
const bezKomentarzy = (s: string): string => s
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');

const zrodlo = (wzgledna: string): string => bezKomentarzy(readFileSync(join(root, wzgledna), 'utf8'));

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

const EKRAN_DZIS = join(root, 'app', '(tabs)', 'dzis.tsx');
const NARZEDZIE = join('tests', 'measure-heights.ts');

// ═══════════════════════════════════════════════════════════════════
// 1. ⭐ ASERCJA URUCHOMIENIOWA (D3) — narzędzie NAPRAWDĘ SIĘ ODPALA
// ═══════════════════════════════════════════════════════════════════
// ⛔ To jest asercja przeciw dokładnie tej chorobie, która ten pas spowodowała:
// plik leżał na dysku, wyglądał na strażnika i przez dziewięć dni kończył
// wyjątkiem, którego nikt nie oglądał.
{
  check('narzędzie tests/measure-heights.ts w ogóle jest na dysku',
    existsSync(join(root, NARZEDZIE)), `brak ${NARZEDZIE}`);

  const run = spawnSync('npx', ['tsx', NARZEDZIE], {
    cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === 'win32',
  });
  const wyjscie = `${run.stdout ?? ''}${run.stderr ?? ''}`;

  check('⭐ (M1-1) narzędzie tests/measure-heights.ts kończy kodem 0, a nie wyjątkiem',
    run.status === 0,
    `kod ${run.status}; ostatnie 400 znaków: ${wyjscie.slice(-400)}`);

  check('⭐ (M1-1) narzędzie NIE kończy słowem REGRESJA z progu objętości pliku',
    !/REGRESJA: dzis\.tsx ma \d+ B/.test(wyjscie),
    'wrócił próg bajtowy — to nie jest miara wysokości');

  check('⭐ (M1-1) narzędzie ODDAJE LISTĘ pozycji ekranu, a nie samą sumę',
    (wyjscie.match(/^\s+[👁✂↓]\s+\d+\.\s+\d+ dp/gm) ?? []).length >= 8,
    `znalezionych wierszy listy: ${(wyjscie.match(/^\s+[👁✂↓]\s+\d+\.\s+\d+ dp/gm) ?? []).length}`);

  check('⭐ (M1-1) narzędzie ODDAJE LICZBĘ rzeczy widocznych bez przewijania',
    /Zawodnik widzi w całości \d+ z \d+ rzeczy/.test(wyjscie) || /Cały ekran „Dziś" mieści się/.test(wyjscie),
    'brak zdania z liczbą — sama tabela nie odpowiada na pytanie D1');

  check('⭐ (M1-1, D3) nazwa pliku narzędzia PADA W WYJŚCIU — suita go widzi',
    wyjscie.includes('tests/measure-heights.ts'),
    'narzędzie nie mówi, jak się nazywa; w wyjściu suity byłoby anonimowe');

  check('(M1-1) narzędzie liczy WSZYSTKIE PIĘĆ ekranów zakładek (D7)',
    ['dzis', 'ja', 'dziennik', 'mecz', 'kalendarz'].every((e) => new RegExp(`^\\s+${e}\\s`, 'm').test(wyjscie)),
    'któregoś ekranu nie ma w tabeli');
}

// ═══════════════════════════════════════════════════════════════════
// 2. ⭐ MODEL POCHODZI Z EKRANU, NIE Z RĘKI (D2, O69, O75)
// ═══════════════════════════════════════════════════════════════════
// Poprzednia miara trzymała listę pięciu bloków ekranu „Dziś" wpisaną ręcznie
// 08.08.2026 i nie zmieniła jej ani razu, choć ekran urósł pięciokrotnie.
// Atrapa jest założeniem o świecie i starzeje się jak komentarz (O84).
{
  const dzis = zmierzEkran(EKRAN_DZIS);
  const nazwy = dzis.pozycje.map((p) => p.nazwa).join(' | ');
  const miara = zrodlo('lib/wysokoscEkranu.ts');

  check('⭐ (M1-2, D2) nazwy bloków ekranu NIE STOJĄ w źródle miary — są przemiecione',
    !['heroGoal', 'odpowiedzCard', 'glosCard', 'sectionLabel'].some((n) => miara.includes(n)),
    `miara zawiera nazwę z ekranu: ${['heroGoal', 'odpowiedzCard', 'glosCard', 'sectionLabel'].filter((n) => miara.includes(n)).join(', ')}`);

  check('(M1-2) pomiar nazywa bloki słowami Z EKRANU (a nie „element 1, element 2")',
    /heroGoal|odpowiedzCard|glosCard/.test(nazwy),
    `nazwy: ${nazwy.slice(0, 200)}`);

  // ⛔ DOWÓD, ŻE MIARA CZYTA PLIK: dokładamy kartę do TEKSTU ekranu i liczba
  // pozycji ma urosnąć o jeden. Miara z ręki dałaby tę samą liczbę.
  const tekst = readFileSync(EKRAN_DZIS, 'utf8');
  const dopisany = tekst.replace('</ScrollView>',
    '<View style={styles.card}><Text style={styles.cardBody}>Karta doklejona przez strażnika</Text></View>\n      </ScrollView>');
  const zDopiskiem = zmierzEkranZTekstu('dzis+1', dopisany, join(root, 'app', '(tabs)'));
  check('⭐ (M1-2, O75) dołożenie karty DO PLIKU EKRANU zmienia wynik miary o jedną pozycję',
    zDopiskiem.pozycje.length === dzis.pozycje.length + 1,
    `bez dopisku ${dzis.pozycje.length}, z dopiskiem ${zDopiskiem.pozycje.length}`);

  check('⭐ (M1-2, O75) dołożenie karty PODNOSI zmierzoną wysokość ekranu',
    zDopiskiem.wysokoscRazemDp > dzis.wysokoscRazemDp,
    `${dzis.wysokoscRazemDp} → ${zDopiskiem.wysokoscRazemDp}`);

  // ⛔ ZDJĘCIE karty ma wynik ZMNIEJSZYĆ. Miara, która tylko rośnie, nie
  // zauważyłaby, że faza hierarchii cokolwiek zdjęła.
  const bezKarty = tekst.replace(/<LivingDiagnosisPulseCard \/>/, '');
  const zdjeta = zmierzEkranZTekstu('dzis-1', bezKarty, join(root, 'app', '(tabs)'));
  check('⭐ (M1-2, O70) ZDJĘCIE karty z ekranu też zmienia wynik — miara działa w obie strony',
    zdjeta.pozycje.length === dzis.pozycje.length - 1 && zdjeta.wysokoscRazemDp < dzis.wysokoscRazemDp,
    `pozycji ${zdjeta.pozycje.length} (było ${dzis.pozycje.length}), dp ${zdjeta.wysokoscRazemDp} (było ${dzis.wysokoscRazemDp})`);

  // ⛔ ZAPADKA NA RĘCZNĄ LISTĘ, KTÓRA W NARZĘDZIU ZOSTAŁA (D2, drugie zdanie).
  // `DZIS_DO_PRZYCISKOW` opisuje ekran z 08.08.2026 i jest tam nadal, bo służy
  // porównaniu z rundą 3. Nie wolno jej cicho rozbudowywać: jej długość jest
  // przybita, żeby każdy rozjazd z ekranem był czerwony.
  const narz = readFileSync(join(root, NARZEDZIE), 'utf8');
  const blok = /DZIS_DO_PRZYCISKOW[^=]*=\s*\[([\s\S]*?)\n\];/.exec(narz);
  const pozycjiWRecznej = blok ? (blok[1].match(/\[\s*'/g) ?? []).length : -1;
  check('⭐ (M1-2, D2) ręczna lista bloków w narzędziu ma DOKŁADNIE 5 pozycji (zapadka na równość)',
    pozycjiWRecznej === 5,
    `${pozycjiWRecznej} — jeżeli lista urosła, przemieć ją zamiast dopisywać`);

  check('(M1-2) ręczna lista jest OZNACZONA jako model historyczny, nie jako pomiar dzisiejszego ekranu',
    /MODEL RĘCZNY/.test(narz),
    'brak ostrzeżenia — czytelnik weźmie stary model za pomiar');
}

// ═══════════════════════════════════════════════════════════════════
// 3. ⛔ ZAPADKA NA RÓWNOŚĆ (D4, O73)
// ═══════════════════════════════════════════════════════════════════
// ⚠️ EKRAN „DZIŚ" PRZEKRACZA MIARĘ WIELOKROTNIE I TO NIE JEST TU AWARIĄ.
// Strażnik czerwony od pierwszego dnia zostaje wyciszony w tydzień — ten
// projekt ma na to dowód w postaci progu, który nie przeszedł ani razu przez
// dziewięć dni i nikomu nie przeszkadzał. Dlatego przekroczenie jest
// OSTRZEŻENIEM Z LICZBĄ (wypisuje je narzędzie), a czerwienią jest WZROST.
//
// ⛔ JAK PRZESTAWIĆ TĘ ZAPADKĘ. Wolno — ale świadomie: zmieniasz liczbę,
// dopisujesz datę i JEDNO ZDANIE, co dołożyłeś i dlaczego nie dało się nic
// zdjąć. Zapadka bez powodu to zapadka, której nie ma.
const ZAPADKA_DZIS = {
  /** Ile rzeczy stoi na ekranie „Dziś" po kolei od góry. */
  pozycji: 10,
  /** Ile z nich zawodnik widzi W CAŁOŚCI, zanim czegokolwiek dotknie. */
  widocznychBezPrzewijania: 5,
  /** Ile rzeczy przecina zgięcie — zaczyna się nad nim, kończy pod. */
  przecietychZgieciem: 1,
  /** Cała wysokość ekranu w dp (miara: `lib/wysokoscEkranu.ts`). */
  wysokoscDp: 2237,
  ustawiona: '17.08.2026',
  powod: 'pas M1 — pierwszy prawdziwy pomiar tego ekranu; stan zastany, nie stan pożądany',
};
{
  const d = zmierzEkran(EKRAN_DZIS);
  check('⛔ (M1-3, D4) ZAPADKA: liczba rzeczy na „Dziś" NIE UROSŁA',
    d.pozycje.length === ZAPADKA_DZIS.pozycji,
    `jest ${d.pozycje.length}, zapadka ${ZAPADKA_DZIS.pozycji} (${ZAPADKA_DZIS.ustawiona}). `
    + 'Zdejmij coś z ekranu albo przestaw zapadkę z datą i powodem.');

  check('⛔ (M1-3, D4) ZAPADKA: liczba rzeczy widocznych BEZ PRZEWIJANIA nie zmieniła się',
    d.nadZgieciem === ZAPADKA_DZIS.widocznychBezPrzewijania,
    `jest ${d.nadZgieciem}, zapadka ${ZAPADKA_DZIS.widocznychBezPrzewijania}`);

  check('⛔ (M1-3, D4) ZAPADKA: liczba rzeczy przeciętych zgięciem nie zmieniła się',
    przeciete(d) === ZAPADKA_DZIS.przecietychZgieciem,
    `jest ${przeciete(d)}, zapadka ${ZAPADKA_DZIS.przecietychZgieciem}`);

  check('⛔ (M1-3, D4) ZAPADKA: wysokość ekranu „Dziś" w dp NIE UROSŁA',
    Math.round(d.wysokoscRazemDp) === ZAPADKA_DZIS.wysokoscDp,
    `jest ${Math.round(d.wysokoscRazemDp)} dp, zapadka ${ZAPADKA_DZIS.wysokoscDp} dp`);

  check('(M1-3) zapadka ma datę i powód — bez nich jest liczbą bez właściciela',
    /^\d{2}\.\d{2}\.\d{4}$/.test(ZAPADKA_DZIS.ustawiona) && ZAPADKA_DZIS.powod.length > 20,
    `${ZAPADKA_DZIS.ustawiona} / ${ZAPADKA_DZIS.powod}`);

  check('(M1-3) ekran „Dziś" NADAL nie mieści się nad zgięciem — i to jest wypowiedziane, nie przemilczane',
    d.wysokoscRazemDp > WIDOCZNE_NAD_ZGIECIEM_DP,
    `${d.wysokoscRazemDp} dp ≤ ${WIDOCZNE_NAD_ZGIECIEM_DP} dp — jeżeli to prawda, przepisz tę asercję`);
}

// ═══════════════════════════════════════════════════════════════════
// 4. ⭐ JEDNA MIARA „NAD ZGIĘCIEM" (D5)
// ═══════════════════════════════════════════════════════════════════
// Próg wpisany w trzech asercjach to trzy progi. Ta asercja przemiata całe
// repozytorium (bez `node_modules`) i liczy, ile razy liczba stoi W KODZIE —
// komentarze nie liczą się, bo wyjaśnienie, skąd się wzięła, jest pożądane.
{
  const pliki: string[] = [];
  const chodz = (kat: string) => {
    for (const wpis of readdirSync(kat)) {
      if (['node_modules', '.git', '.expo', 'android', 'ios'].includes(wpis)) continue;
      const p = join(kat, wpis);
      if (statSync(p).isDirectory()) chodz(p);
      else if (/\.(ts|tsx|mjs|js)$/.test(wpis)) pliki.push(p);
    }
  };
  chodz(root);

  const trafienia: string[] = [];
  for (const p of pliki) {
    const kod = bezKomentarzy(readFileSync(p, 'utf8'));
    const n = (kod.match(new RegExp(`(?<![\\d_])${WIDOCZNE_NAD_ZGIECIEM_DP}(?![\\d_])`, 'g')) ?? []).length;
    for (let i = 0; i < n; i++) trafienia.push(relative(root, p));
  }

  check(`⭐ (M1-4, D5) liczba „nad zgięciem" (${WIDOCZNE_NAD_ZGIECIEM_DP}) stoi w kodzie DOKŁADNIE RAZ`,
    trafienia.length === 1,
    `wystąpień ${trafienia.length}: ${trafienia.join(', ')}`);

  check('(M1-4, D5) i stoi w module miary, a nie w asercji',
    trafienia[0] === join('lib', 'wysokoscEkranu.ts'),
    `stoi w: ${trafienia[0]}`);

  const miara = readFileSync(join(root, 'lib', 'wysokoscEkranu.ts'), 'utf8');
  check('(M1-4, D5) przy liczbie stoi rachunek, skąd się wzięła',
    /950/.test(miara) && /pasek zakładek/.test(miara) && /obszar bezpieczny/.test(miara),
    'brak wyprowadzenia — próg bez rachunku jest liczbą z sufitu');
}

// ═══════════════════════════════════════════════════════════════════
// 5. ⛔ CO SIĘ ZEPSUŁO RAZ, NIE MA PRAWA WRÓCIĆ
// ═══════════════════════════════════════════════════════════════════
{
  const narz = zrodlo(NARZEDZIE);
  check('⛔ (M1-5) próg objętości pliku `DZIS_MAX_BYTES` NIE WRÓCIŁ do narzędzia',
    !narz.includes('DZIS_MAX_BYTES'),
    'bajty nigdy nie były miarą wysokości — 63 % tego pliku to komentarze');

  check('⛔ (M1-5) narzędzie nie mierzy ekranu przez `statSync(...).size`',
    !/statSync\([^)]*\)\.size/.test(narz),
    'rozmiar pliku to nie wysokość ekranu');

  check('(M1-5) narzędzie woła prawdziwy pomiar z lib/wysokoscEkranu',
    /from '\.\.\/lib\/wysokoscEkranu'/.test(narz) && /zmierzEkran\(/.test(narz),
    'narzędzie nie korzysta z modułu przemiatającego ekran');
}

// ═══════════════════════════════════════════════════════════════════
// 6. ⛔ BRAK PLIKU TO PORAŻKA Z NAZWĄ, NIE ZERO POZYCJI (O76)
// ═══════════════════════════════════════════════════════════════════
{
  const sciezka = join(root, 'app', '(tabs)', 'ekranu-nie-ma.tsx');
  let komunikat = '';
  try { zmierzEkran(sciezka); } catch (e) { komunikat = (e as Error).message; }
  check('⛔ (M1-6, O76) pomiar nieistniejącego ekranu RZUCA, zamiast oddać zero',
    komunikat.length > 0, 'brak wyjątku — pomiar z pustki byłby liczbą udającą wiedzę');
  check('⛔ (M1-6, O76) i podaje ŚCIEŻKĘ pliku, którego szukał',
    komunikat.includes('ekranu-nie-ma.tsx'), `komunikat: ${komunikat}`);
}

// ═══════════════════════════════════════════════════════════════════
// 7. ⭐ CZY TEN STRAŻNIK W OGÓLE POTRAFI SIĘ ZAPALIĆ (O70)
// ═══════════════════════════════════════════════════════════════════
// Audyt 15.08.2026: 25 z 43 strażników nie umiało się zapalić. Poniżej stoją
// ekrany syntetyczne o ZNANEJ odpowiedzi — jeżeli miara przestanie liczyć,
// te asercje zczerwienieją, nawet gdyby `dzis.tsx` akurat się nie zmienił.
{
  const ramka = (srodek: string) => `
import { View, Text, StyleSheet } from 'react-native';
export default function Ekran() {
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
${srodek}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  karta: { height: 200, backgroundColor: '#111', marginBottom: 10 },
  krecha: { position: 'absolute', height: 44, width: 4 },
  napis: { fontSize: 16, lineHeight: 20 },
});
`;
  const karta = '      <View style={styles.karta}><Text style={styles.napis}>Karta</Text></View>';

  const jedna = zmierzEkranZTekstu('syntetyk-1', ramka(karta), root);
  check('⭐ (M1-7, O70) ekran z JEDNĄ kartą 200 dp daje 1 pozycję i 210 dp',
    jedna.pozycje.length === 1 && Math.round(jedna.wysokoscRazemDp) === 210,
    `pozycji ${jedna.pozycje.length}, dp ${jedna.wysokoscRazemDp}`);

  const piec = zmierzEkranZTekstu('syntetyk-5', ramka(Array(5).fill(karta).join('\n')), root);
  check('⭐ (M1-7, O70) pięć takich kart to 5 pozycji i 1 050 dp — miara SUMUJE, nie zgaduje',
    piec.pozycje.length === 5 && Math.round(piec.wysokoscRazemDp) === 1050,
    `pozycji ${piec.pozycje.length}, dp ${piec.wysokoscRazemDp}`);

  check('⭐ (M1-7) przy pięciu kartach zawodnik widzi w całości TYLKO te, które mieszczą się w progu',
    piec.nadZgieciem === Math.floor(WIDOCZNE_NAD_ZGIECIEM_DP / 210),
    `nad zgięciem ${piec.nadZgieciem}, spodziewane ${Math.floor(WIDOCZNE_NAD_ZGIECIEM_DP / 210)}`);

  // ⛔ Krecha karty (`position: 'absolute'`) NIE PODNOSI ekranu. Liczenie jej
  // dokładało po 44 dp za kartę do liczby, na której ma stanąć decyzja Kuby.
  const zKrecha = zmierzEkranZTekstu('syntetyk-krecha',
    ramka('      <View style={styles.karta}><View style={styles.krecha} /><Text style={styles.napis}>Karta</Text></View>'), root);
  check('⭐ (M1-7) element `position: absolute` NIE podnosi wysokości ekranu',
    Math.round(zKrecha.wysokoscRazemDp) === Math.round(jedna.wysokoscRazemDp),
    `z krechą ${zKrecha.wysokoscRazemDp}, bez ${jedna.wysokoscRazemDp}`);

  // ⛔ Gałąź warunkowa liczy się NAJGORSZYM przypadkiem.
  const warunek = zmierzEkranZTekstu('syntetyk-warunek', ramka(
    '      {a ? <View style={styles.karta} /> : <Text style={styles.napis}>krótko</Text>}'), root);
  check('⭐ (M1-7) `{a ? wysokie : niskie}` liczy się WYŻSZĄ gałęzią (najgorszy przypadek)',
    Math.round(warunek.wysokoscRazemDp) === 210,
    `dp ${warunek.wysokoscRazemDp}`);

  // ⛔ Ekran bez drzewa komponentów to porażka, nie zero.
  let pusty = '';
  try { zmierzEkranZTekstu('syntetyk-pusty', 'const x = 1;\n', root); } catch (e) { pusty = (e as Error).message; }
  check('⛔ (M1-7) plik bez drzewa komponentów RZUCA z nazwą, zamiast oddać pusty pomiar',
    pusty.includes('syntetyk-pusty'), `komunikat: ${pusty}`);
}

// ═══════════════════════════════════════════════════════════════════
// 8. ⭐ CZTERY POZOSTAŁE EKRANY TEŻ SĄ MIERZONE (D7)
// ═══════════════════════════════════════════════════════════════════
// ⚠️ BEZ ZAPADKI — celowo. Zapadka stoi tylko na „Dziś", jedynym ekranie,
// o którym wiadomo, że jest za długi. Tu pilnujemy wyłącznie tego, żeby pomiar
// w ogóle się wykonał: ekran zmierzony na zero pozycji to nie „ekran pusty",
// tylko zepsuta miara.
{
  for (const e of ['ja', 'dziennik', 'mecz', 'kalendarz']) {
    const r = zmierzEkran(join(root, 'app', '(tabs)', `${e}.tsx`));
    check(`(M1-8, D7) ekran „${e}" daje niepusty pomiar (pozycje i wysokość)`,
      r.pozycje.length > 0 && r.wysokoscRazemDp > 0,
      `pozycji ${r.pozycje.length}, dp ${r.wysokoscRazemDp}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
