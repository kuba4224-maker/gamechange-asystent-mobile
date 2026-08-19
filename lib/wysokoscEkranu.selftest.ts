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
  POWTORZENIA_LIST, powtorzeniaListy,
} from './wysokoscEkranu';
// ⭐ PLAN-D-M2 (D3): strażnik pyta o TĘ SAMĄ stałą produktu, z której korzysta
// miara — żeby „cztery pozycje kolejki" nie były dwiema różnymi czwórkami.
import { DOMYSLNA_LICZBA } from './kolejkaPodania';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy.
 *
 * ⚠️ TA FUNKCJA BYŁA ZEPSUTA I ZMIERZONO TO 17.08.2026 (pas M2). Wersja
 * z pasa M1 wycinała najpierw linie `//` i `*`, a POTEM bloki `/* … *\/`.
 * Skutek: wiersz otwierający blok (`/**`) zostawał, bo zaczyna się od `/`,
 * a wiersz zamykający (` *\/`) był wycinany razem z resztą bloku — więc
 * wycinanie bloków szło od pierwszego `/*` aż do NASTĘPNEGO ocalałego `*\/`,
 * ⛔ zjadając po drodze prawdziwy kod: 22 170 znaków z `lib/wysokoscEkranu.ts`
 * i 25 065 z tego pliku (87 % tego, co zostawało po pierwszym kroku).
 *
 * ⛔ To jest ta sama choroba, którą bada cały ten pas: asercja przechodziła,
 * bo pytała o tekst, którego już nie było. Kolejność kroków nie da się
 * ustawić dobrze — trzeba przejść tekst RAZ i pilnować, w czym się jest.
 */
const bezKomentarzy = (s: string): string => {
  let out = '';
  for (let i = 0; i < s.length;) {
    if (s[i] === '/' && s[i + 1] === '/') {
      const k = s.indexOf('\n', i);
      i = k === -1 ? s.length : k;
    } else if (s[i] === '/' && s[i + 1] === '*') {
      const k = s.indexOf('*/', i + 2);
      i = k === -1 ? s.length : k + 2;
    } else {
      out += s[i];
      i++;
    }
  }
  return out;
};

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

  // ⛔ POPRAWKA 18.08.2026, PAS S1 — DEFEKT STRAŻNIKA ZGŁOSZONY PRZEZ PAS A1.
  // Wzorzec nie miał flagi `u`, a `👁` jest PARĄ SUROGATÓW. Dopóki ekran „Dziś"
  // NIE MIEŚCIŁ się nad zgięciem, wiersze listy niosły znaczniki `↓` i `✂`
  // (jednoznakowe) i wzorzec działał. Odkąd 18.08.2026 mieści się w całości,
  // WSZYSTKIE wiersze mają `👁` — a klasa znaków bez `u` rozbija tę parę
  // na dwie połówki i nie łapie ani jednego wiersza. Strażnik zapalił się
  // NA SUKCESIE i to jest dokładnie ten rodzaj czerwieni, którego chcemy:
  // ⛔ liczba wierszy nie spadła do zera, spadła do zera ZDOLNOŚĆ LICZENIA.
  // ⚠️ Asercja NIE JEST osłabiona: próg `>= 8` zostaje bez zmiany.
  const WIERSZ_LISTY = /^\s+[👁✂↓]\s+\d+\.\s+\d+ dp/gmu;
  const wierszeListy = (wyjscie.match(WIERSZ_LISTY) ?? []).length;
  check('⭐ (M1-1) narzędzie ODDAJE LISTĘ pozycji ekranu, a nie samą sumę',
    wierszeListy >= 8,
    `znalezionych wierszy listy: ${wierszeListy} — ⛔ jeżeli 0 przy poprawnym raporcie, `
    + 'sprawdź NAJPIERW, czy wzorzec ma flagę `u`: bez niej `👁` (para surogatów) '
    + 'nie wpada do klasy znaków i strażnik milczy o działającym narzędziu');

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

  // ⭐ PRZECELOWANA 18.08.2026 (PAS W1). JEDNYM ZDANIEM: od dziś obie gałęzie
  // ekranu („Dziś” i „Tydzień”) są WYWOŁANIAMI PO NAZWIE, miara wybiera
  // WYŻSZĄ z nich — a wyższa jest gałąź „Tydzień” (790,5 dp wobec 437,1 dp),
  // więc `odpowiedzCard` nie ma prawa stać w domyślnym pomiarze.
  // ⛔ Asercja pilnuje tego samego co dotąd: że nazwy bloków POCHODZĄ
  // Z EKRANU, a nie z licznika „element 1, element 2”.
  check('(M1-2) pomiar nazywa bloki słowami Z EKRANU (a nie „element 1, element 2")',
    /heroGoal|odpowiedzCard|glosCard|kartaTydzienZakres/.test(nazwy),
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

  // ⛔ ZDJĘCIE elementu ma wynik ZMNIEJSZYĆ. Miara, która tylko rośnie, nie
  // zauważyłaby, że faza hierarchii cokolwiek zdjęła.
  //
  // ⭐ PRZECELOWANA 18.08.2026 (pas S1). Do 18.08 badanym elementem była
  // `<LivingDiagnosisPulseCard />`. Pas A1 zdjął ją z ekranu (442 dp z budżetu
  // 850 na komponent zamrożony od 06.08, rysujący `null`), więc `replace`
  // przestał cokolwiek zdejmować i asercja badała RÓŻNICĘ ZERA — czyli
  // przechodziłaby przy mierze, która nie umie liczyć w dół.
  // ⛔ ELEMENT BADANY MUSI BYĆ NA EKRANIE — pilnuje tego asercja niżej, żeby
  // ta sama dziura nie wróciła po cichu przy następnej przebudowie.
  // ⭐ PRZECELOWANY 18.08.2026 (PAS W1) — z przypisu ekranu „Dziś” na przypis
  // tygodnia. Powód jest ten sam, dla którego asercję przecelowano 18.08 rano:
  // ELEMENT BADANY MUSI STAĆ W GAŁĘZI, KTÓRĄ MIARA NAPRAWDĘ OPISUJE, inaczej
  // `replace` zdejmuje NIC i asercja przepuszcza miarę, która nie liczy w dół.
  // Od pasa W1 miara opisuje gałąź „Tydzień” (jest wyższa).
  const ELEMENT_BADANY = '<Text style={styles.licznikPodpis}>{PRZYPIS_TYGODNIA_BEZ_SKALI}</Text>';
  check('⭐ (M1-2, O70) element badany PRZEZ tę asercję naprawdę stoi na ekranie',
    tekst.includes(ELEMENT_BADANY),
    `nie znajduję na „Dziś" elementu ${ELEMENT_BADANY} — dopóki go tam nie ma, `
    + 'asercja niżej zdejmuje NIC i przepuszcza miarę, która nie liczy w dół');
  const bezElementu = tekst.replace(ELEMENT_BADANY, '');
  const zdjeta = zmierzEkranZTekstu('dzis-1', bezElementu, join(root, 'app', '(tabs)'));
  check('⭐ (M1-2, O70) ZDJĘCIE elementu z ekranu też zmienia wynik — miara działa w obie strony',
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
  // ⭐⭐ PRZESTAWIONA 18.08.2026 (PAS W1) — 9 → 7 rzeczy, 807 → 791 dp.
  // JEDNYM ZDANIEM: obie gałęzie ekranu są od dziś wywołaniami po nazwie
  // i miara opisuje WYŻSZĄ z nich, czyli „Tydzień” (791 dp); gałąź „Dziś”,
  // po zdjęciu ściany tekstu z karty „co dziś zrobić” (547 → 105 dp) i po
  // dołożeniu trzech faktów o dniu, ma 437 dp i stoi w `pominieteGalezie`.
  // ⛔ Zapadka nadal jest NA RÓWNOŚĆ i nadal pilnuje NAJWYŻSZEJ gałęzi.
  /** Ile rzeczy stoi na ekranie „Dziś" po kolei od góry. */
  pozycji: 7,
  /** Ile z nich zawodnik widzi W CAŁOŚCI, zanim czegokolwiek dotknie. */
  widocznychBezPrzewijania: 7,
  /** Ile rzeczy przecina zgięcie — zaczyna się nad nim, kończy pod. */
  przecietychZgieciem: 0,
  /**
   * Cała wysokość ekranu w dp (miara: `lib/wysokoscEkranu.ts`).
   *
   * ⭐⭐ PRZESTAWIONA 18.08.2026 przez pas A1: **6 669 → 807 dp**, czyli
   * −5 862 dp. ⛔ To jest PIERWSZE przestawienie tej zapadki W DÓŁ i jedyne
   * zdanie, jakie tu pasuje, brzmi: ekran przestał wymagać przewijania.
   * Cały nadmiar wziął się z TRZECH ruchów, nie z cięcia zdań:
   *   1. ocena z kafla zeszła do arkusza (`components/Arkusz.tsx`) — arkusz
   *      jest `Modal`-em, więc NIE WCHODZI do przewijania ekranu pod spodem;
   *   2. kolejka podania rysuje na „Dziś" JEDNĄ pozycję zamiast czterech;
   *   3. licznik pracy, „TWÓJ DOROBEK", praca w Blokach, hero wąskiego gardła,
   *      wgląd z osią pomiarów i karta pulsu diagnozy ZESZŁY Z TEGO EKRANU.
   * ⛔ Imienna tabela „co zdjęte · dlaczego · co stoi w tym miejscu" stoi
   * w `claude/PRZEKAZANIE_PAS_A1_18_08_2026.md` — nic nie zniknęło po cichu (B3).
   *
   * ⭐ 807 < 808: ekran mieści się nad zgięciem W CAŁOŚCI, a `przecietych`
   * spadło z 1 na 0. Cel z makiety v3 wynosił 850 dp; jest 807.
   */
  wysokoscDp: 791,
  ustawiona: '18.08.2026',
  powod: 'pas W1 — wygląd wg makiety v3: karta „co dziś zrobić" zeszła z 547 na 105 dp '
    + '(decyzja D-B Kuby: dwa zdania na ekranie, cały materiał w arkuszu za 0 dp), '
    + 'doszły trzy fakty o dniu (D-2), a wiersz tygodnia dostał słupek obciążenia (T-1). '
    + 'Miara opisuje od dziś gałąź „Tydzień" (791 dp), bo jest wyższa niż gałąź „Dziś" (437 dp); '
    + 'obie są wywołaniami po nazwie, więc pominięta stoi w raporcie z nazwy, a nie znika',
};

/**
 * ⛔ ZAPADKI POZOSTAŁYCH CZTERECH EKRANÓW (D4, O73) — PLAN-D-M2 17.08.2026.
 *
 * Pas M1 zostawił te ekrany bez zapadki („pilnujemy tylko »Dziś«"). ⚠️ Skutek
 * zmierzono trzy godziny później: „Kalendarz" oddawał 536 dp i zdanie
 * „mieści się w całości" o ekranie, na którym nad zgięciem stoją DWA dni
 * z siedmiu — i nikt tego nie zobaczył, bo żadna asercja o tę liczbę nie pytała.
 * Zapadka na jednym ekranie z pięciu pilnuje jednego ekranu z pięciu.
 *
 * ⛔ JAK JE PRZESTAWIAĆ: liczba + data + jedno zdanie powodu. Bez powodu
 * zapadka jest liczbą bez właściciela.
 */
const ZAPADKI_POZOSTALE = [
  // ⭐ PRZESTAWIONA 18.08.2026 (pas S1) — LICZBY PASA A3, nie moje.
  // JEDNO ZDANIE, CO JĄ ZMIENIŁO: pas A3 przebudował `app/(tabs)/ja.tsx`
  // w ekran „Profil" — szesnaście pozycji i 1 325 dp zeszło do sześciu pozycji
  // i 602 dp, a liczba rzeczy PRZECIĘTYCH zgięciem spadła z 1 na 0.
  // ⛔ To jest przestawienie zapadki, nie jej zdjęcie: nadal RÓWNOŚĆ.
  // ⭐ PRZESTAWIONA 18.08.2026 (PAS W1): 602 → 598 dp, liczba rzeczy BEZ ZMIANY.
  // JEDNYM ZDANIEM: panel dwóch miar dostał liczby w rozmiarze z makiety
  // (40 → 44 px, `.two .v`) i ciaśniejszy oddech (14 → 13 dp), a tytuł ekranu
  // dostał wysokość linii, żeby przestał gubić ogonki — razem −4 dp.
  // ⭐ PRZESTAWIONA 18.08.2026 (PAS D1): 598 → 629 dp, ⛔ LICZBA POZYCJI BEZ ZMIANY.
  // JEDNYM ZDANIEM: obciążenie przestało być nazwaną pustką i dostało liczbę,
  // a pod dwiema miarami stanęło JEDNO zdanie o oknie odniesienia (28 dni).
  // ⛔ Zdanie weszło DO WNĘTRZA istniejącego panelu, a nie jako szósta pozycja
  // ekranu — dlatego `pozycji` i `widocznych` zostają na szóstce, a „Profil"
  // ma nadal PIĘĆ pozycji za dotknięciem. Zapas do zgięcia: 808 − 629 = 179 dp.
  { ekran: 'ja', pozycji: 6, widocznych: 6, przecietych: 0, wysokoscDp: 629,
    ustawiona: '18.08.2026',
    powod: 'pas D1 — druga miara („Obciążenie · 7 dni") dostała PRAWDZIWĄ LICZBĘ '
      + 'z wzoru minuty × ciężkość ⁄ 180, a pod panelem dwóch miar stanęło jedno '
      + 'zdanie o oknie odniesienia 28 dni, jako goły fakt bez procentu i bez '
      + 'przymiotnika; 598 → 629 dp (+31), zero rzeczy pod zgięciem, zero przeciętych, '
      + 'liczba pozycji ekranu BEZ ZMIANY' },
  { ekran: 'dziennik', pozycji: 21, widocznych: 14, przecietych: 1, wysokoscDp: 3712,
    ustawiona: '17.08.2026',
    powod: 'pas M2 — historia wpisów rysuje do 20 wierszy (`.limit(20)` w tym ekranie), '
      + 'a liczyła się jako jeden; 1 570 → 3 712 dp' },
  { ekran: 'mecz', pozycji: 20, widocznych: 6, przecietych: 1, wysokoscDp: 5863,
    ustawiona: '17.08.2026',
    powod: 'pas M2 — cztery listy naraz: pytania segmentowe, opcje stanu, historia meczów '
      + 'i wiersze urazów; 3 229 → 5 761 dp' },
  { ekran: 'kalendarz', pozycji: 16, widocznych: 4, przecietych: 1, wysokoscDp: 2802,
    ustawiona: '17.08.2026',
    powod: 'pas M2 — ekran, od którego ten pas się zaczął: 536 → 2 650 dp. Mierzona jest '
      + 'zakładka „Listy" (najgorszy przypadek); zakładka „Tydzień" ma 1 466 dp i pilnuje jej '
      + 'osobna asercja o siedmiu wierszach dni' },
];
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

  // ⭐⭐ PRZEPISANA 18.08.2026 (pas A1) — I TO JEST CAŁY SENS TEGO PASA.
  // Do 18.08 ta asercja brzmiała: „ekran »Dziś« NADAL nie mieści się nad
  // zgięciem" i pilnowała, żeby prawda o nim była WYPOWIEDZIANA, a nie
  // przemilczana. Jej własny komunikat kończył się zdaniem „jeżeli to prawda,
  // przepisz tę asercję" — bo od początku wiadomo było, że zapali się na
  // SUKCESIE (O73). Zapaliła się 18.08.2026 przy 807 dp.
  // ⛔ Od teraz pilnuje kierunku ODWROTNEGO: ekran, który raz zmieścił się
  // nad zgięciem, nie ma prawa po cichu z niego wyjść.
  check('⭐ (M1-3, A1) ekran „Dziś" MIEŚCI SIĘ nad zgięciem w całości — i to jest '
    + 'pilnowane, a nie zakładane',
    d.wysokoscRazemDp <= WIDOCZNE_NAD_ZGIECIEM_DP,
    `${d.wysokoscRazemDp} dp > ${WIDOCZNE_NAD_ZGIECIEM_DP} dp — ekran wyszedł spod zgięcia`);

  // ⭐ CEL Z MAKIETY v3 — 850 dp. Stoi osobno od zapadki, bo zapadka pilnuje
  // ZMIANY, a to pilnuje UMOWY z makietą.
  check('⭐ (A1) ekran „Dziś" mieści się w celu z makiety v3 — 850 dp',
    d.wysokoscRazemDp <= 850, `${Math.round(d.wysokoscRazemDp)} dp`);
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

// ═══════════════════════════════════════════════════════════════════
// ⭐ 9. PLAN-D-M2 17.08.2026 (D1) — PROCEDURA PO NAZWIE I PROCEDURA WYWOŁANA
//        TO TA SAMA LICZBA DP
// ═══════════════════════════════════════════════════════════════════
// ⛔ ASERCJA URUCHOMIENIOWA NA PARZE. Asercja na tekście („czy w miarze stoi
// wzorzec `.map(`") nie pilnowałaby tu niczego: wzorzec można mieć i nadal
// oddawać zero. Dlatego mierzymy DWA EKRANY o tej samej treści, zapisanej
// dwoma sposobami, i porównujemy WYNIK.
//
// ⚠️ To jest dokładnie ta różnica, która 17.08.2026 kazała miarze powiedzieć
// o „Kalendarzu" 536 dp i „14 z 14 widocznych" — o ekranie rysującym siedem
// wierszy dni, z których nad zgięciem mieszczą się dwa.
{
  const ramka = (srodek: string) => `
import { View, Text, StyleSheet } from 'react-native';
export default function Ekran() {
  const dane = [1, 2, 3];
  function renderWiersz(d) {
    return <View style={styles.wiersz}><Text style={styles.napis}>Wiersz</Text></View>;
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
${srodek}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  wiersz: { height: 100, backgroundColor: '#111' },
  napis: { fontSize: 16, lineHeight: 20 },
});
`;
  const poNazwie = zmierzEkranZTekstu('para-po-nazwie', ramka('      {dane.map(renderWiersz)}'), root);
  const wywolana = zmierzEkranZTekstu('para-wywolana', ramka('      {dane.map((d) => renderWiersz(d))}'), root);

  check('⭐ (M2-9, D1) `.map(renderX)` i `.map((d) => renderX(d))` dają TĘ SAMĄ liczbę dp',
    poNazwie.wysokoscRazemDp === wywolana.wysokoscRazemDp && poNazwie.wysokoscRazemDp > 0,
    `po nazwie ${poNazwie.wysokoscRazemDp} dp, wywołana ${wywolana.wysokoscRazemDp} dp — `
    + 'lista przekazana po nazwie znowu wypada z pomiaru');

  check('⭐ (M2-9, D1) i TĘ SAMĄ liczbę pozycji',
    poNazwie.pozycje.length === wywolana.pozycje.length && poNazwie.pozycje.length > 0,
    `po nazwie ${poNazwie.pozycje.length}, wywołana ${wywolana.pozycje.length}`);

  check('⭐ (M2-9, D1) lista literalna `[1, 2, 3]` liczy się TRZY razy, a nie raz',
    Math.round(poNazwie.wysokoscRazemDp) === 300,
    `${poNazwie.wysokoscRazemDp} dp — spodziewane 3 × 100 dp`);

  // ⛔ To samo na PRAWDZIWYM ekranie, nie tylko na syntetyku: zakładka
  // „Tydzień" Kalendarza rysuje siedem wierszy dni procedurą przekazaną
  // po nazwie. Zero wierszy było odpowiedzią przez cały pas M1.
  const kal = readFileSync(join(root, 'app', '(tabs)', 'kalendarz.tsx'), 'utf8');
  const tylkoTydzien = zmierzEkranZTekstu(
    'kalendarz-tydzien',
    kal.replace("{zakladka === 'tydzien' ? renderTydzien() : renderListy()}", '{renderTydzien()}'),
    join(root, 'app', '(tabs)'),
  );
  const wierszeDni = [...tylkoTydzien.pozycje, ...tylkoTydzien.pozycje.flatMap((p) => p.czesci)]
    .filter((p) => (p.powtorzenia ? /(^|\.)dni$/.test(p.powtorzenia.nazwa) : false));
  check('⭐ (M2-9, D1) zakładka „Tydzień" Kalendarza rysuje SIEDEM wierszy dni, nie zero',
    wierszeDni.length > 0 && wierszeDni.every((p) => p.powtorzenia?.ile === 7),
    `znalezionych list dni: ${wierszeDni.length}, powtórzeń: ${wierszeDni.map((p) => p.powtorzenia?.ile).join('/')}`);

  check('⭐ (M2-9, D1) i przez to NIE mieści się nad zgięciem — obietnica „cały tydzień naraz" nie jest spełniona',
    tylkoTydzien.wysokoscRazemDp > WIDOCZNE_NAD_ZGIECIEM_DP,
    `${tylkoTydzien.wysokoscRazemDp} dp — jeżeli mieści się naprawdę, przepisz tę asercję z powodem`);

  // ⛔ ZAPADKA NA ZAKŁADKĘ, KTÓREJ POMIAR DOMYŚLNY NIE OPISUJE.
  // ⚠️ Doświadczenie parami z tego pasa: karta dołożona do zakładki „Tydzień"
  // NIE ZAPALAŁA żadnej zapadki, bo pomiar Kalendarza opisuje zakładkę „Listy"
  // (jest wyższa). Zakładka bez zapadki to zakładka, w której wolno rosnąć
  // po cichu — a to jest właśnie ten ekran, o który ten pas poszedł.
  const ZAPADKA_TYDZIEN = {
    pozycji: 15,
    widocznych: 12,
    wysokoscDp: 1466,
    ustawiona: '17.08.2026',
    powod: 'pas M2 — pierwszy pomiar zakładki „Tydzień" z siedmioma wierszami dni; '
      + 'jeden wiersz dnia = 123,3 dp, siedem = 863 dp, a nad nimi stoi 470 dp nagłówków',
  };
  check('⛔ (M2-9, D4) ZAPADKA zakładki „Tydzień": liczba rzeczy NIE ZMIENIŁA SIĘ',
    tylkoTydzien.pozycje.length === ZAPADKA_TYDZIEN.pozycji,
    `jest ${tylkoTydzien.pozycje.length}, zapadka ${ZAPADKA_TYDZIEN.pozycji} (${ZAPADKA_TYDZIEN.ustawiona}: ${ZAPADKA_TYDZIEN.powod})`);
  check('⛔ (M2-9, D4) ZAPADKA zakładki „Tydzień": wysokość w dp NIE ZMIENIŁA SIĘ',
    Math.round(tylkoTydzien.wysokoscRazemDp) === ZAPADKA_TYDZIEN.wysokoscDp,
    `jest ${Math.round(tylkoTydzien.wysokoscRazemDp)} dp, zapadka ${ZAPADKA_TYDZIEN.wysokoscDp} dp`);
  check('⛔ (M2-9, D4) ZAPADKA zakładki „Tydzień": liczba rzeczy widocznych bez przewijania NIE ZMIENIŁA SIĘ',
    tylkoTydzien.nadZgieciem === ZAPADKA_TYDZIEN.widocznych,
    `jest ${tylkoTydzien.nadZgieciem}, zapadka ${ZAPADKA_TYDZIEN.widocznych}`);
}

// ═══════════════════════════════════════════════════════════════════
// ⛔ 10. PLAN-D-M2 (D2) — CZEGO MIARA NIE UMIE ROZWINĄĆ, MÓWI Z NAZWY
// ═══════════════════════════════════════════════════════════════════
// ⛔ TO JEST SERCE TEGO PASA. Miara, która gubi rzecz i milczy, jest gorsza
// niż miara, która się nie kompiluje: fałszywe „mieści się w całości"
// uspokaja tego, kto pyta (R5). Sprawdzamy PODSTAWIENIEM WYMYŚLONEJ
// KONSTRUKCJI, a nie lekturą kodu miary.
const ZAPADKA_NIEWYPROWADZALNE = {
  /**
   * Ile RÓŻNYCH konstrukcji z pięciu ekranów zakładek miara umie nazwać,
   * ale nie umie wyprowadzić. ⛔ Zapadka na RÓWNOŚĆ: kto doda ekranowi
   * konstrukcję, której miara nie zna, zobaczy czerwień, a nie ciszę.
   * ⭐ Ustawiona 17.08.2026 przez pas M2: 1 → 17. Przed tym pasem lista
   * miała jedną pozycję (`Checkbox`), bo wszystko inne wypadało BEZ ŚLADU.
   */
  // ⭐ PRZESTAWIONA 18.08.2026 (pas S1): 18 → 13. Liczba SPADŁA O PIĘĆ i to jest
  // dobra wiadomość — mniej konstrukcji, których miara nie umie rozwinąć.
  // JEDNO ZDANIE, CO JĄ ZMIENIŁO: pas A1 przebudował „Dziś" (kolejka czterech
  // pozycji, oś pomiarów wglądu i lista kroków oceny zeszły z ekranu do arkusza
  // albo do jednej pozycji), a pas A3 przebudował „Ja" na sześć pozycji bez ani
  // jednej listy — razem ubyło pięć różnych konstrukcji z pięciu ekranów.
  // ⛔ Zapadka zostaje NA RÓWNOŚĆ: kto DOŁOŻY ekranowi konstrukcję, której
  // miara nie zna, zobaczy czerwień tak samo jak dotąd.
  ile: 13,
  ustawiona: '18.08.2026',
  powod: 'pas S1 — 18 → 13 po przebudowie obu ekranów produktu (pasy A1 i A3): '
    + 'z „Dziś" zeszła kolejka czterech pozycji, oś pomiarów wglądu i lista kroków oceny, '
    + 'a ekran „Ja" nie ma dziś ani jednej listy. 11 z 13 pozycji to listy o długości '
    + 'zależnej od danych zawodnika, dwie to klocki spoza repozytorium',
};
{
  const ramka = (srodek: string) => `
import { View, Text, StyleSheet } from 'react-native';
export default function Ekran() {
  const dane = [1, 2, 3];
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <View style={styles.karta}><Text style={styles.napis}>Karta</Text></View>
${srodek}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  karta: { height: 200, backgroundColor: '#111' },
  napis: { fontSize: 16, lineHeight: 20 },
});
`;
  // A. LISTA RYSOWANA PROCEDURĄ, KTÓREJ W OGÓLE NIE MA W PLIKU.
  const zjadliwa = zmierzEkranZTekstu('wymyslona-1',
    ramka('      {cosZupelnieNieznanego.map(renderCzegosCzegoNieMa)}'), root);
  check('⛔ (M2-10, D2) lista rysowana procedurą, której nie da się rozwinąć, TRAFIA NA LISTĘ z nazwy',
    zjadliwa.niewyprowadzalne.some((n) => n.includes('renderCzegosCzegoNieMa')
      || n.includes('cosZupelnieNieznanego')),
    `lista „nie da się wyprowadzić" = [${zjadliwa.niewyprowadzalne.join(', ')}] — `
    + 'konstrukcja wypadła BEZ ŚLADU, a to jest defekt, nie ograniczenie');

  // B. LISTA, KTÓREJ WIERSZ MIARA UMIE POLICZYĆ, ALE DŁUGOŚCI — NIE.
  const nieznanaDlugosc = zmierzEkranZTekstu('wymyslona-2',
    ramka('      {wynikiZapytaniaZawodnika.map((x) => <View style={styles.karta} />)}'), root);
  check('⛔ (M2-10, D2) lista o NIEZNANEJ DŁUGOŚCI też trafia na listę — jedynka w ciszy jest kłamstwem w dół',
    nieznanaDlugosc.niewyprowadzalne.some((n) => n.includes('wynikiZapytaniaZawodnika')),
    `lista „nie da się wyprowadzić" = [${nieznanaDlugosc.niewyprowadzalne.join(', ')}]`);

  // C. KOMPONENT SPOZA REPOZYTORIUM — reguła, która działała już w M1, ma działać dalej.
  const obcy = zmierzEkranZTekstu('wymyslona-3', ramka('      <ZupelnieObcyKlocek />'), root);
  check('⛔ (M2-10, D2) obcy komponent bez pliku w repozytorium nadal trafia na listę z nazwy',
    obcy.niewyprowadzalne.includes('ZupelnieObcyKlocek'),
    `lista = [${obcy.niewyprowadzalne.join(', ')}]`);

  // D. ⚠️ I ODWROTNIE: to, co miara UMIE policzyć, NIE MA prawa tam trafiać —
  //    lista, na której stoi wszystko, nie mówi nic.
  const znana = zmierzEkranZTekstu('wymyslona-4',
    ramka('      {[1, 2, 3].map((x) => <View style={styles.karta} />)}'), root);
  check('⚠️ (M2-10, D2) lista o długości WYPROWADZONEJ z kodu NIE trafia na listę nieznanych',
    znana.niewyprowadzalne.length === 0,
    `lista = [${znana.niewyprowadzalne.join(', ')}] — lista, na której stoi wszystko, nie mówi nic`);

  // E. ⛔ WYRAŻENIE, Z KTÓREGO NIE DA SIĘ WYCIĄGNĄĆ ANI JEDNEGO WĘZŁA.
  //    ⚠️ Ta asercja stoi osobno od A, bo A przechodziła także przy wyciętym
  //    zgłaszaniu — miała dwie drogi do prawdy i jedna wystarczała. Tu droga
  //    jest jedna: cała treść wyrażenia jest poza zasięgiem miary.
  const zeroWezlow = zmierzEkranZTekstu('wymyslona-5',
    ramka('      {tajemniczaLista.map((x) => budujWierszKtoregoNieMa(x))}'), root);
  check('⛔ (M2-10, D2) wyrażenie, z którego miara nie wyciąga ANI JEDNEGO węzła, i tak zostaje NAZWANE',
    zeroWezlow.niewyprowadzalne.some((n) => n.includes('tajemniczaLista')),
    `lista „nie da się wyprowadzić" = [${zeroWezlow.niewyprowadzalne.join(', ')}] — `
    + 'to jest dokładnie ten cichy brak, od którego zaczął się ten pas');

  // ⛔ ZAPADKA NA RÓWNOŚĆ — długość listy „nie da się wyprowadzić" z pięciu ekranów.
  const wszystkie = new Set<string>();
  for (const e of ['dzis', 'ja', 'dziennik', 'mecz', 'kalendarz']) {
    zmierzEkran(join(root, 'app', '(tabs)', `${e}.tsx`)).niewyprowadzalne.forEach((n) => wszystkie.add(n));
  }
  check('⛔ (M2-10, D2, O73) ZAPADKA: liczba konstrukcji „nie da się wyprowadzić" NIE ZMIENIŁA SIĘ',
    wszystkie.size === ZAPADKA_NIEWYPROWADZALNE.ile,
    `jest ${wszystkie.size}, zapadka ${ZAPADKA_NIEWYPROWADZALNE.ile} (${ZAPADKA_NIEWYPROWADZALNE.ustawiona}). `
    + `Lista: ${[...wszystkie].sort().join(' · ')}. Jeżeli dołożyłeś ekranowi konstrukcję, `
    + 'której miara nie zna — naucz jej miarę albo przestaw zapadkę z datą i powodem.');

  check('(M2-10, D2) zapadka listy nieznanych ma datę i powód',
    /^\d{2}\.\d{2}\.\d{4}$/.test(ZAPADKA_NIEWYPROWADZALNE.ustawiona)
    && ZAPADKA_NIEWYPROWADZALNE.powod.length > 20,
    `${ZAPADKA_NIEWYPROWADZALNE.ustawiona} / ${ZAPADKA_NIEWYPROWADZALNE.powod}`);

  check('⛔ (M2-10, D2) narzędzie WYPISUJE tę listę w raporcie, a nie tylko trzyma ją w pamięci',
    /nie da się wyprowadzić/i.test(readFileSync(join(root, NARZEDZIE), 'utf8')),
    'raport nie wymienia konstrukcji, których miara nie zna — czytelnik weźmie liczbę za pełną');
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ 11. PLAN-D-M2 (D3) — KAŻDA LICZBA POWTÓRZEŃ MA WSKAZANE ŹRÓDŁO
// ═══════════════════════════════════════════════════════════════════
// ⛔ Goła liczba w kodzie miary = FAIL z nazwą (O84). Model ręczny z 08.08.2026
// zestarzał się dokładnie tak: ktoś wpisał pięć bloków i nikt nie wiedział,
// skąd są, więc nikt nie miał podstawy ich ruszyć.
{
  for (const e of ['dzis', 'ja', 'dziennik', 'mecz', 'kalendarz']) {
    const r = zmierzEkran(join(root, 'app', '(tabs)', `${e}.tsx`));
    const wszystkie = [...r.pozycje, ...r.pozycje.flatMap((p) => p.czesci)];
    const listy = wszystkie.filter((p) => p.lista);
    const bezZrodla = listy.filter((p) => !p.powtorzenia || p.powtorzenia.zrodlo.trim().length < 20);
    check(`⭐ (M2-11, D3) każda lista na ekranie „${e}" ma podane ŹRÓDŁO liczby powtórzeń`,
      listy.length > 0 ? bezZrodla.length === 0 : true,
      `bez źródła: ${bezZrodla.map((p) => p.nazwa).join(', ')} (list razem: ${listy.length})`);

    const zleLiczby = listy.filter((p) => !p.powtorzenia || !Number.isInteger(p.powtorzenia.ile) || p.powtorzenia.ile < 1);
    check(`(M2-11, D3) i liczbę powtórzeń, która jest całkowita i dodatnia — ekran „${e}"`,
      zleLiczby.length === 0,
      `złe: ${zleLiczby.map((p) => `${p.nazwa}=${p.powtorzenia?.ile}`).join(', ')}`);
  }

  // ⛔ ŹRÓDŁO NAJMOCNIEJSZE: stała produktu czytana NA ŻYWO, a nie przepisana.
  //
  // ⭐ PRZECELOWANA 18.08.2026 (pas S1) — REGUŁA TA SAMA, MIEJSCE INNE.
  // Do 18.08 ta asercja mierzyła listę kolejki NA EKRANIE „Dziś" i miała rację:
  // ekran rysował `pozycjeNaDzis.map(...)`. Pas A1 zdjął trzy z czterech pozycji
  // (makieta v3 ma na „Dziś" JEDNĄ odpowiedź), więc listy tam już nie ma —
  // a asercja przypięta do MIEJSCA zapaliłaby się na zmianie, która sama
  // w sobie jest w porządku, i niczego by o regule nie powiedziała.
  // ⛔ Reguła brzmi: „liczba powtórzeń listy pochodzi ze STAŁEJ PRODUKTU
  // czytanej na żywo, a nie z tego, ile się komuś wydaje" — i sprawdzamy ją
  // PODSTAWIENIEM, tak jak sekcja 10 wyżej sprawdza konstrukcje nieznane.
  // ⭐ To jest MOCNIEJSZE niż wersja poprzednia: działa niezależnie od tego,
  // czy któryś ekran akurat rysuje tę listę, więc nie da się jej uciszyć
  // zdjęciem listy z ekranu.
  const EKRAN_Z_KOLEJKA = `
import { View, Text, StyleSheet } from 'react-native';
export default function Ekran() {
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      {pozycjeNaDzis.map((p) => (
        <View key={p.id} style={styles.karta}><Text style={styles.napis}>{p.co}</Text></View>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  karta: { height: 200, backgroundColor: '#111' },
  napis: { fontSize: 16, lineHeight: 20 },
});
`;
  const zKolejka = zmierzEkranZTekstu('kolejka-podstawiona', EKRAN_Z_KOLEJKA, root);
  const kolejka = [...zKolejka.pozycje, ...zKolejka.pozycje.flatMap((p) => p.czesci)]
    .filter((p) => p.powtorzenia?.nazwa === 'pozycjeNaDzis');
  check('⭐ (M2-11, D3) lista kolejki liczy się tyle razy, ile wynosi STAŁA PRODUKTU, a nie „ile się wydaje"',
    kolejka.length > 0 && kolejka.every((p) => p.powtorzenia?.ile === (DOMYSLNA_LICZBA.dzis ?? -1)),
    `list kolejki ${kolejka.length}, powtórzeń ${kolejka.map((p) => p.powtorzenia?.ile).join('/')}, `
    + `stała produktu ${DOMYSLNA_LICZBA.dzis}`);

  // ⛔ ZAPADKA NA RÓWNOŚĆ — ILE LIST STOI DZIŚ NA „DZIŚ".
  // ⚠️ Bez niej powyższe podstawienie byłoby ucieczką od pytania „a co
  // NAPRAWDĘ rysuje ekran". Zmierzona 18.08.2026 przez pas S1: JEDNA —
  // `hintBox · {p.hint.hint}`, czyli treść ZAWSZE WIDOCZNA (bezpieczeństwo),
  // rysowana z `hintState.alwaysVisible`. ⛔ Kolejki na tej liście NIE MA:
  // pas A1 zostawił na „Dziś" JEDNĄ pozycję (`pozycjeNaDzis[0]`), nie listę —
  // decyzja z makiety v3 („na Dziś jedna odpowiedź i kafle dnia").
  // ⛔ Dołożenie ekranowi drugiej listy zapala tę asercję I KAŻE PODAĆ JEJ
  // ŹRÓDŁO — dokładnie tak, jak dotąd.
  // ⭐ PRZESTAWIONA 18.08.2026 (PAS W1): 1 → 2. JEDNYM ZDANIEM: miara opisuje
  // od dziś gałąź „Tydzień” (jest wyższa) i widzi tam DWIE listy — siedem
  // wierszy dni (`tydzienBiezacy.dni`, długość WYPROWADZONA ze stałej
  // `ZALOZENIE_DNI_W_TYGODNIU = 7`) oraz listę pozycji, które w wierszu dnia
  // mają CO POWIEDZIEĆ o swoim stanie (odwołane / bez wpisu / nieodczytane).
  // ⛔ Ta druga jest DŁUGOŚCI ZALEŻNEJ OD DANYCH i miara mówi to wprost —
  // stoi na liście „nie da się wyprowadzić”, a nie znika po cichu.
  // ⛔ Powstała po to, żeby przy zdejmowaniu wyliczanki nazw pozycji (T-5)
  // NIE ZNIKŁO jedyne miejsce, w którym zawodnik widzi słowo „Odwołane” (B3).
  const LIST_NA_DZIS_18_08_2026 = 2;
  const dzis = zmierzEkran(EKRAN_DZIS);
  const listyDzis = [...dzis.pozycje, ...dzis.pozycje.flatMap((p) => p.czesci)].filter((p) => p.lista);
  check(`⭐ (M2-11, D3, O73) ZAPADKA: list na ekranie „Dziś" jest DOKŁADNIE ${LIST_NA_DZIS_18_08_2026}`,
    listyDzis.length === LIST_NA_DZIS_18_08_2026,
    `jest ${listyDzis.length}: ${listyDzis.map((p) => `${p.nazwa}=${p.powtorzenia?.ile ?? '?'}`).join(', ')} `
    + '(zapadka 18.08.2026, pas S1). Jeżeli dołożyłeś ekranowi listę — podaj jej ŹRÓDŁO '
    + 'w `POWTORZENIA_LIST` i przestaw tę liczbę z datą i powodem.');

  check('⭐ (M2-11, D3, O75) i ta stała jest IMPORTOWANA z produktu, a nie przepisana do miary',
    /import\s*\{[^}]*DOMYSLNA_LICZBA[^}]*\}\s*from\s*'\.\/kolejkaPodania'/.test(zrodlo('lib/wysokoscEkranu.ts')),
    'liczba pozycji kolejki jest przepisana — zestarzeje się jak model ręczny z 08.08.2026');

  // ⛔ GOŁA LICZBA W REJESTRZE = FAIL Z NAZWĄ.
  const miara = zrodlo('lib/wysokoscEkranu.ts');
  const rejestr = /POWTORZENIA_LIST:\s*ZrodloPowtorzen\[\]\s*=\s*\[([\s\S]*?)\n\];/.exec(miara);
  check('⛔ (M2-11, D3, O84) rejestr powtórzeń NIE ZAWIERA ani jednej gołej liczby — same nazwane stałe',
    rejestr !== null && !/\bile:\s*\d/.test(rejestr[1]),
    rejestr === null ? 'nie znajduję rejestru POWTORZENIA_LIST' : `gołe: ${(rejestr[1].match(/\bile:\s*\d+/g) ?? []).join(', ')}`);

  check('⛔ (M2-11, D3) i każdy wpis rejestru ma niepuste pole `zrodlo`',
    POWTORZENIA_LIST.length > 0 && POWTORZENIA_LIST.every((r) => r.zrodlo.trim().length > 30),
    `wpisów ${POWTORZENIA_LIST.length}, bez źródła: `
    + POWTORZENIA_LIST.filter((r) => r.zrodlo.trim().length <= 30).length);

  check('(M2-11, D3) każde jawne założenie mówi Z NAZWY, że jest założeniem',
    POWTORZENIA_LIST.every((r) => /STAŁA PRODUKTU|JAWNE ZAŁOŻENIE/.test(r.zrodlo)),
    'wpis bez rodzaju źródła — czytelnik nie wie, czy liczba jest zmierzona, czy przyjęta');

  // ⭐ Źródło działa też na literale i na stałej z repozytorium.
  check('(M2-11, D3) długość literału tablicy jest POLICZONA z jego treści (także z przecinkiem na końcu)',
    powtorzeniaListy("['a', 'b', 'c']").ile === 3 && powtorzeniaListy("['a', 'b', 'c',]").ile === 3,
    `${powtorzeniaListy("['a', 'b', 'c']").ile} / ${powtorzeniaListy("['a', 'b', 'c',]").ile}`);

  check('⛔ (M2-11, D3) lista bez rozpoznanego źródła MÓWI o tym wprost, zamiast udawać pewność',
    powtorzeniaListy('cosCzegoNieZnamy').wyprowadzone === false
    && /NIE DA SIĘ WYPROWADZIĆ/.test(powtorzeniaListy('cosCzegoNieZnamy').zrodlo),
    powtorzeniaListy('cosCzegoNieZnamy').zrodlo);
}

// ═══════════════════════════════════════════════════════════════════
// ⛔ 12. PLAN-D-M2 (D4) — ZAPADKI POZOSTAŁYCH CZTERECH EKRANÓW
// ═══════════════════════════════════════════════════════════════════
{
  for (const z of ZAPADKI_POZOSTALE) {
    const r = zmierzEkran(join(root, 'app', '(tabs)', `${z.ekran}.tsx`));
    check(`⛔ (M2-12, D4) ZAPADKA „${z.ekran}": liczba rzeczy NIE ZMIENIŁA SIĘ`,
      r.pozycje.length === z.pozycji,
      `jest ${r.pozycje.length}, zapadka ${z.pozycji} (${z.ustawiona}: ${z.powod})`);
    check(`⛔ (M2-12, D4) ZAPADKA „${z.ekran}": liczba rzeczy widocznych bez przewijania NIE ZMIENIŁA SIĘ`,
      r.nadZgieciem === z.widocznych,
      `jest ${r.nadZgieciem}, zapadka ${z.widocznych}`);
    check(`⛔ (M2-12, D4) ZAPADKA „${z.ekran}": wysokość w dp NIE ZMIENIŁA SIĘ`,
      Math.round(r.wysokoscRazemDp) === z.wysokoscDp,
      `jest ${Math.round(r.wysokoscRazemDp)} dp, zapadka ${z.wysokoscDp} dp`);
    check(`(M2-12, D4) zapadka „${z.ekran}" ma datę i powód`,
      /^\d{2}\.\d{2}\.\d{4}$/.test(z.ustawiona) && z.powod.length > 20,
      `${z.ustawiona} / ${z.powod}`);
  }

  // ⛔ ZAPADKA MA BYĆ NA RÓWNOŚĆ, NIE NA NIERÓWNOŚĆ (O73).
  // ⚠️ Doświadczenie parami (`>=` + dołożona karta) dowodzi tego dopiero wtedy,
  // gdy ktoś coś dołoży. Ta asercja mówi to samo O JEDNĄ RUNDĘ WCZEŚNIEJ:
  // `>=` przy zapadce znaczy „wolno rosnąć", a wtedy zapadki nie ma.
  const mojeZrodlo = zrodlo('lib/wysokoscEkranu.selftest.ts');
  const porownaniaZapadek = mojeZrodlo.match(/Math\.round\(\w+\.wysokoscRazemDp\)\s*(===|>=|<=|>|<|!==)/g) ?? [];
  check('⛔ (M2-12, D4, O73) WSZYSTKIE zapadki wysokości porównują na RÓWNOŚĆ, nie na „nie mniej niż"',
    porownaniaZapadek.length >= 2 && porownaniaZapadek.every((p) => p.endsWith('===')),
    `porównania: ${porownaniaZapadek.join(', ')} — zapadka z \`>=\` przepuszcza wzrost w ciszy`);

  check('⛔ (M2-12, D4) zapadki stoją na WSZYSTKICH pięciu ekranach zakładek, nie na jednym',
    ZAPADKI_POZOSTALE.length === 4,
    `zapadek pozostałych ekranów: ${ZAPADKI_POZOSTALE.length} — zapadka na jednym ekranie z pięciu `
    + 'pilnuje jednego ekranu z pięciu; tak właśnie przespano zaniżony „Kalendarz"');
}

// ═══════════════════════════════════════════════════════════════════
// ⛔ 13. PLAN-D-M2 (O97) — KOMPLETNOŚĆ SPRAWDZA SIĘ OSOBNO OD WRAŻLIWOŚCI
// ═══════════════════════════════════════════════════════════════════
// ⭐ OGRANICZENIE, KTÓRE TEN PAS POTWIERDZIŁ. Miara M1 przeszła mutację
// „dołóż kartę → liczba rośnie", bo DELTA była poprawna. Nikt nie sprawdził,
// czy SUMA obejmuje wszystko — a nie obejmowała dwóch ekranów z pięciu.
// Mutacja dowodzi wrażliwości, nie kompletności.
//
// ⛔ TA ASERCJA PYTA O KOMPLETNOŚĆ WPROST: przemiata pięć ekranów PO TREŚCI
// (O88, nie po nazwie stałej) i dla każdej listy rysowanej procedurą
// przekazaną po nazwie sprawdza, czy jest ONA W JEDNYM Z TRZECH MIEJSC:
//   • w wyniku pomiaru (policzona),
//   • na liście „nie da się wyprowadzić" (nazwana),
//   • w gałęzi świadomie pominiętej jako niższa — też NAZWANEJ.
// ⛔ Czwarte miejsce — cisza — jest defektem.
{
  const kat = join(root, 'app', '(tabs)');

  /** Zakres tekstu ciała procedury `nazwa` w pliku — po to, żeby wiedzieć, co w niej leży. */
  const cialoProcedury = (src: string, nazwa: string): [number, number] | null => {
    const d = new RegExp(`(?:function\\s+${nazwa}\\s*\\(|const\\s+${nazwa}\\s*=)`).exec(src);
    if (!d) return null;
    const otw = src.indexOf('{', src.indexOf('(', d.index));
    if (otw === -1) return null;
    let g = 0;
    for (let i = otw; i < src.length; i++) {
      if (src[i] === '{') g++;
      else if (src[i] === '}') { g--; if (g === 0) return [otw, i]; }
    }
    return null;
  };

  let listPoNazwie = 0;
  for (const e of ['dzis', 'ja', 'dziennik', 'mecz', 'kalendarz']) {
    const src = readFileSync(join(kat, `${e}.tsx`), 'utf8');
    const r = zmierzEkranZTekstu(e, src, kat);

    const znane = new Set<string>();
    for (const p of [...r.pozycje, ...r.pozycje.flatMap((x) => x.czesci)]) {
      if (p.powtorzenia) for (const n of p.powtorzenia.nazwa.split(' › ')) znane.add(n);
    }
    for (const n of r.niewyprowadzalne) {
      const m = /^lista (.+?)\.map/.exec(n);
      if (m) znane.add(m[1]);
    }
    const zakresyPominiete = (r.pominieteGalezie ?? [])
      .map((n) => cialoProcedury(src, n.replace('()', '')))
      .filter((x): x is [number, number] => x !== null);

    // ⚠️ Po TREŚCI, nie po nazwie stałej (O88): każde `X.map(renderY)`, gdzie
    // `renderY` jest procedurą RYSUJĄCĄ. Świadomie BEZ warunku „stoi w klamrze
    // JSX": jedna z dziewięciu takich list w produkcie stoi w gałęzi `:`
    // ternarnego operatora, po zamkniętym znaczniku, i warunek na klamrę
    // przepuszczał ją niezauważoną — czyli powtarzał chorobę, którą bada.
    const wzorzec = /([A-Za-z_$][A-Za-z0-9_$.]*)\s*\.\s*(?:map|flatMap)\s*\(\s*(render[A-Z][A-Za-z0-9_]*)\s*\)/g;
    const zgubione: string[] = [];
    for (const m of src.matchAll(wzorzec)) {
      listPoNazwie++;
      const lista = m[1];
      if (znane.has(lista) || [...znane].some((n) => n.endsWith(`.${lista.split('.').pop()}`) || lista.endsWith(n))) continue;
      if (zakresyPominiete.some(([a, b]) => m.index > a && m.index < b)) continue;
      zgubione.push(`${lista}.map(${m[2]})`);
    }

    check(`⛔ (M2-13, O97) ekran „${e}": każda lista rysowana procedurą PO NAZWIE jest policzona albo NAZWANA`,
      zgubione.length === 0,
      `zgubione bez śladu: ${zgubione.join(', ')} — miara ma je policzyć, wpisać na listę `
      + 'nieznanych albo powiedzieć, w której pominiętej gałęzi leżą');
  }

  // ⛔ Sam wzorzec musi coś znajdować — asercja, która nie ma czego sprawdzać,
  // przechodzi zawsze i pilnuje niczego (audyt 15.08: 25 z 43 strażników).
  check('⭐ (M2-13, O88) wzorzec „lista rysowana procedurą po nazwie" ZNAJDUJE takie miejsca w produkcie',
    listPoNazwie >= 9,
    `znalezionych ${listPoNazwie} — jeżeli spadło do zera, asercja wyżej przestała cokolwiek pilnować`);

  // ⛔ Gałąź pominięta ma być WYMIENIONA, a nie przemilczana.
  const kalendarz = zmierzEkran(join(kat, 'kalendarz.tsx'));
  check('⛔ (M2-13, O97) „Kalendarz" MÓWI, że mierzona jest jedna zakładka, a druga została pominięta',
    (kalendarz.pominieteGalezie ?? []).length === 1 && (kalendarz.pominieteGalezie ?? [])[0] === 'renderTydzien()',
    `pominięte gałęzie: [${(kalendarz.pominieteGalezie ?? []).join(', ')}] — liczba o ekranie z dwiema `
    + 'zakładkami bez powiedzenia, której dotyczy, jest liczbą wprowadzającą w błąd');

  check('(M2-13, O97) i narzędzie wypisuje te gałęzie w raporcie',
    /pominięt/i.test(readFileSync(join(root, NARZEDZIE), 'utf8')),
    'raport nie mówi, której zakładki liczba nie opisuje');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
