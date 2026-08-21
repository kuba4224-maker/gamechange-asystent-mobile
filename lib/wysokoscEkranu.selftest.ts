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
// ⭐ PAS W2 21.08.2026 (W2-7, W2-9): strażnik pyta o TĘ SAMĄ umowę o wyglądzie,
// z której korzysta produkt — żeby „tło aplikacji" nie było dwiema różnymi barwami,
// a zadeklarowana interlinia kroju nie rozjechała się z plikiem `.ttf`.
import { colors, INTERLINIA_KROJU } from '../constants/theme';

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
  // ⭐⭐ PRZESTAWIONA 21.08.2026 (PAS D3) — 3 712 → 743 dp, czyli −2 969 dp,
  // i 21 → 16 rzeczy. ⛔ To jest TRZECIE przestawienie zapadki W DÓŁ w tym
  // projekcie (pierwsze: pas A1 na „Dziś", drugie: pas M2 na meczu).
  // JEDNYM ZDANIEM, CO GO ZDJĘŁO: sześć rzeczy zeszło z ekranu do arkuszy
  // (`components/Arkusz.tsx` jest `Modal`-em, więc kosztuje 0 dp) — nastrój
  // / motywacja, notatka, powiązanie z wydarzeniem kalendarza, zmęczenie po
  // treningu, ból i historia wpisów — a każda z nich dostała NA EKRANIE
  // wiersz wejścia ze strzałką „→" z DOKŁADNIE tą etykietą, która nad nią
  // stała.
  // ⛔ NIC NIE ZNIKNĘŁO: równości arkusz↔wejście pilnuje strażnik `D3-B1`
  // w sekcji 15, a tabela „co gdzie wylądowało" stoi w nocie
  // `claude/PRZEKAZANIE_PAS_D3_21_08_2026.md`.
  // ⭐ 743 < 808: ekran mieści się nad zgięciem W CAŁOŚCI, `przecietych`
  // spadło z 1 na 0, a `widocznych` zrównało się z `pozycji` (16 z 16).
  { ekran: 'dziennik', pozycji: 16, widocznych: 16, przecietych: 0, wysokoscDp: 743,
    ustawiona: '21.08.2026',
    powod: 'pas D3 — dziennik chudnie do makiety: nastrój/motywacja, notatka, '
      + 'powiązanie z wydarzeniem, zmęczenie po treningu, ból i historia wpisów zeszły '
      + 'z ekranu do arkuszy (0 dp), a na ekranie stanęły cztery wiersze wejścia; '
      + '3 712 → 743 dp, zero rzeczy pod zgięciem, zero przeciętych' },
  // ⭐⭐ PRZESTAWIONA 19.08.2026 (PAS M2) — 5 863 → 785 dp, czyli −5 078 dp,
  // i 20 → 10 rzeczy. ⛔ To jest DRUGIE przestawienie zapadki W DÓŁ w tym
  // projekcie (pierwsze zrobił pas A1 na „Dziś") i jedyne zdanie, jakie tu
  // pasuje, brzmi: ekran meczu przestał wymagać przewijania.
  // JEDNYM ZDANIEM, CO GO ZDJĘŁO: pięć rzeczy zeszło z ekranu do arkusza
  // (`components/Arkusz.tsx` jest `Modal`-em, więc kosztuje 0 dp) — stan przed
  // meczem z pytaniami segmentowymi, „powiedz więcej o tym meczu", ból,
  // historia meczów i lista trybu kontuzji — a dwie liczby minut stanęły
  // w jednym wierszu zamiast jedna pod drugą.
  // ⛔ NIC NIE ZNIKNĘŁO: każda z tych pięciu rzeczy ma wejście NA EKRANIE
  // (wiersz ze strzałką „→"), a tabela „co gdzie wylądowało" stoi w nocie
  // `claude/PRZEKAZANIE_PAS_M2_19_08_2026.md`.
  // ⭐ 785 < 808: ekran mieści się nad zgięciem W CAŁOŚCI, `przecietych`
  // spadło z 1 na 0, a cel z makiety v3 dla ścieżki meczu wynosił 803 dp.
  { ekran: 'mecz', pozycji: 10, widocznych: 10, przecietych: 0, wysokoscDp: 785,
    ustawiona: '19.08.2026',
    powod: 'pas M2 — ekran meczu chudnie do makiety (decyzja Kuby 18.08, punkt 3): '
      + 'stan przed meczem z pytaniami segmentowymi, „powiedz więcej o tym meczu", ból, '
      + 'historia meczów i lista trybu kontuzji zeszły z ekranu do arkusza (0 dp), '
      + 'a minuty na boisku i długość meczu stanęły w jednym wierszu; 5 863 → 785 dp, '
      + 'zero rzeczy pod zgięciem, zero przeciętych' },
  // ⭐⭐ PRZESTAWIONA 21.08.2026 (PAS K1) — 2 802 → 767 dp, 16 → 7 rzeczy,
  // 4 → 7 widocznych bez przewijania, 1 → 0 przeciętych zgięciem.
  // ⚠️⚠️ TO JEST JEDYNA ZAPADKA, KTÓRĄ PAS K1 RUSZYŁ W TYM PLIKU — reszta
  // (w tym `ZAPADKA_TYDZIEN` niżej: 1 466 dp / 15 / 12) stoi NIETKNIĘTA,
  // sprawdzone uruchomieniem. ⛔ Heads-up dla pasa D3, który trzyma ten plik
  // w tej fali: jeżeli scalasz swoją wersję, ta jedna pozycja jest moja.
  //
  // JEDNYM ZDANIEM, CO GO ZDJĘŁO: ⛔ właściciel produktu nie umiał dodać meczu
  // we własnej aplikacji, bo „+" zostawiało go na zakładce „Tydzień", a
  // formularz stał pod zakładką „Listy" wśród czterech sekcji kart o łącznej
  // wysokości 1 058 dp. Cztery sekcje wpisów (nadchodzące · cykliczne ·
  // minione · odwołane) i cztery pola formularza opisane „(opcjonalnie)"
  // (długość · notatka · godzina · wąskie gardło) zeszły z ekranu do arkuszy
  // (`components/Arkusz.tsx` jest `Modal`-em, więc kosztuje 0 dp), a siedem
  // wierszy `Checkbox` z dniami tygodnia stanęło chipami w jednym rzędzie
  // zamiast jeden pod drugim (840 → 18 dp).
  // ⛔ NIC NIE ZNIKNĘŁO: każdy z dwóch arkuszy ma NA EKRANIE wiersz wejścia,
  // a strażnik `K1-B5` (`lib/drogaDodania.selftest.ts`) porównuje ZBIÓR
  // rodzajów arkusza ze ZBIOREM wierszy wejścia NA RÓWNOŚĆ — arkusz bez
  // wejścia i wejście bez arkusza zapalają czerwień tak samo.
  // ⭐ 767 < 808: zakładka „Listy" — ta, na której od 21.08 ląduje „+" —
  // mieści się nad zgięciem W CAŁOŚCI.
  // ⚠️ MIERZONA JEST NADAL ZAKŁADKA „Listy", a „Tydzień" nadal jest gałęzią
  // pominiętą (asercja niżej) — pas K1 NIE zmienił, której zakładki ta liczba
  // dotyczy. Zakładki „Tydzień" ten pas świadomie NIE odchudzał: 863 z jej
  // 1 466 dp to siedem wierszy dni, a tydzień, który kurczy się do dni
  // z treścią, przestaje być tygodniem (WT-06, WG-02).
  { ekran: 'kalendarz', pozycji: 7, widocznych: 7, przecietych: 0, wysokoscDp: 767,
    ustawiona: '21.08.2026',
    powod: 'pas K1 — droga dodania rzeczy: cztery sekcje wpisów i cztery pola opcjonalne '
      + 'zeszły do arkuszy (0 dp), dni tygodnia z siedmiu wierszy Checkbox na chipy '
      + 'w jednym rzędzie, rodzaj wydarzenia z Pickera na pięć widocznych chipów; '
      + '2 802 → 767 dp, zero rzeczy pod zgięciem, zero przeciętych. ⛔ Nic nie zniknęło — '
      + 'strażnik K1-B5 porównuje arkusze z wejściami na RÓWNOŚĆ' },
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
  // ⭐ PRZESTAWIONA 19.08.2026 (pas M2): 13 → 10. Liczba SPADŁA O TRZY i to jest
  // dobra wiadomość, ale ⚠️ NIE ZNACZY, że miara nauczyła się trzech nowych
  // konstrukcji. JEDNYM ZDANIEM, CO JĄ ZMIENIŁO: `Checkbox` oraz trzy listy
  // odpowiedzi na pytania segmentowe (`bank.answers.map(…)` i dwa warianty
  // pogłębienia) zeszły z ekranu meczu do arkusza, czyli POZA `ScrollView`,
  // więc miara ekranu ich już nie widzi — bo i zawodnik nie widzi ich na ekranie.
  // ⛔ Te cztery konstrukcje NIE ZNIKNĘŁY z produktu: pilnuje ich osobna
  // zapadka „listy w arkuszu" w sekcji 13 tego pliku.
  // ⭐ PRZESTAWIONA 21.08.2026 (pas D3): 10 → 9. ⚠️ I TU JEST RZECZ, KTÓREJ NIE
  // WOLNO PRZEMILCZEĆ: liczba spadła, bo `lista pains.map(…) — ile wierszy`
  // zeszła z ekranu DZIENNIKA do arkusza „Historia wpisów", czyli poza
  // `ScrollView`. ⛔ Sama ta zapadka nie odróżnia „przeniesione" od
  // „SKASOWANE" — obie rzeczy dają dokładnie ten sam spadek o jeden.
  // ⭐ Dlatego niżej stoi DRUGA zapadka, na RÓWNOŚĆ, która mierzy, CO
  // dokładnie arkusz dziennika zdejmuje z pomiaru — przez wsunięcie treści
  // arkusza z powrotem na ekran i porównanie obu list.
  // ⛔ `Checkbox` NIE ZNIKNĄŁ z listy: zszedł z dziennika, ale nadal stoi
  // na innym ekranie zakładek.
  // ⭐ PRZESTAWIONA 21.08.2026 (pas K1): 9 → 8. Liczba SPADŁA O JEDEN i to jest
  // dobra wiadomość. JEDNYM ZDANIEM, CO JĄ ZMIENIŁO: `Checkbox` zniknął
  // z OSTATNIEGO ekranu, na którym stał — siedem wierszy `Checkbox` z dniami
  // tygodnia na Kalendarzu (840 dp!) stanęło chipami w jednym rzędzie (18 dp).
  // ⛔ TO NIE JEST „przeniesione do arkusza" ani „skasowane": pole „Dni
  // tygodnia" stoi dokładnie tam, gdzie stało, robi dokładnie to samo
  // (zaznaczenie wielokrotne) i nadal jest w pomiarze — zmienił się WYŁĄCZNIE
  // komponent, którym jest narysowane, a ten nowy miara umie policzyć.
  // ⚠️⚠️ HEADS-UP DLA PASA D3, który trzyma ten plik: to jest DRUGA i OSTATNIA
  // rzecz, którą pas K1 tu ruszył (pierwsza to zapadka `kalendarz` wyżej).
  ile: 8,
  ustawiona: '21.08.2026',
  powod: 'pas D3 — 10 → 9: `lista pains.map(…) — ile wierszy` zeszła z ekranu dziennika '
    + 'do arkusza „Historia wpisów" (Modal, poza przewijaniem ekranu), więc miara ekranu '
    + 'jej nie widzi — bo i zawodnik nie widzi jej na ekranie. ⛔ Nie zniknęła z produktu: '
    + 'pilnuje tego zapadka „co arkusz dziennika zdejmuje z pomiaru" kilka linii niżej '
    + 'oraz strażnik D3-B6 w sekcji 15. Wszystkie 9 pozostałych pozycji to listy '
    + 'o długości zależnej od danych zawodnika albo klocki spoza repozytorium',
};

/**
 * ⭐⭐ PAS D3 21.08.2026 — CO DOKŁADNIE ARKUSZ DZIENNIKA ZDEJMUJE Z POMIARU.
 *
 * ⛔ ZAPADKA NA RÓWNOŚĆ, MIERZONA, A NIE DEKLAROWANA. Powstaje przez
 * wsunięcie treści arkusza Z POWROTEM na ekran (mutacja tekstu w pamięci)
 * i porównanie listy „nie da się wyprowadzić" przed i po. Różnica to
 * dokładnie to, czego pomiar ekranu nie widzi Z POWODU arkusza.
 *
 * ⛔ Po co osobno od zapadki wyżej: liczba, która spadła o jeden, wygląda
 * identycznie po PRZENIESIENIU rzeczy do arkusza i po jej SKASOWANIU.
 * Ta zapadka odróżnia jedno od drugiego, bo wymienia rzeczy Z NAZWY i pyta
 * o RÓWNOŚĆ zbiorów — kto przeniesie do arkusza rzecz siódmą, zobaczy
 * czerwień i dopisze ją tu świadomie, z datą i powodem.
 */
const POZA_POMIAREM_W_ARKUSZU_DZIENNIKA_21_08_2026 = [
  'Checkbox',
  'lista pains.map(…) — ile wierszy',
].sort();
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

  // ═════════════════════════════════════════════════════════════════
  // ⭐⭐ PAS D3 21.08.2026 — ZAPADKA NA RÓWNOŚĆ: CO ARKUSZ DZIENNIKA ZDEJMUJE
  // ═════════════════════════════════════════════════════════════════
  {
    const katEkranow = join(root, 'app', '(tabs)');
    const dziennikPrawdziwy = readFileSync(join(katEkranow, 'dziennik.tsx'), 'utf8');
    // ⛔ MUTUJEMY TEKST WCZYTANY Z DYSKU, NIE PLIK NA DYSKU (wzorzec pasa M2):
    // przerwanie procesu w dowolnym momencie nie ma czego zepsuć.
    const zTrescioArkuszaNaEkranie = dziennikPrawdziwy.replace(
      '    </ScrollView>\n', '      {trescArkusza()}\n    </ScrollView>\n');
    check('⭐ (D3, O70) mutacja „treść arkusza wraca na ekran" NAPRAWDĘ zmienia tekst',
      zTrescioArkuszaNaEkranie !== dziennikPrawdziwy,
      'wzorzec podmiany nie trafił — zapadka niżej badałaby nic');

    const bezArkusza = zmierzEkranZTekstu('dziennik', dziennikPrawdziwy, katEkranow);
    const zArkuszem = zmierzEkranZTekstu('dziennik+arkusz', zTrescioArkuszaNaEkranie, katEkranow);
    const zdjete = [...zArkuszem.niewyprowadzalne]
      .filter((n) => !bezArkusza.niewyprowadzalne.includes(n)).sort();

    console.log(`   co arkusz dziennika zdejmuje z pomiaru: ${zdjete.length}`);
    for (const n of zdjete) console.log(`   • ${n}`);

    check('⛔⛔ (D3, O73) ZAPADKA NA RÓWNOŚĆ: arkusz dziennika zdejmuje z pomiaru DOKŁADNIE to, '
      + 'co 21.08.2026 — nie „co najwyżej tyle"',
      zdjete.length === POZA_POMIAREM_W_ARKUSZU_DZIENNIKA_21_08_2026.length
      && zdjete.every((n, i) => n === POZA_POMIAREM_W_ARKUSZU_DZIENNIKA_21_08_2026[i]),
      `jest [${zdjete.join(' · ') || '—'}], zapadka `
      + `[${POZA_POMIAREM_W_ARKUSZU_DZIENNIKA_21_08_2026.join(' · ')}] — doszło: ktoś wyprowadził `
      + 'kolejną rzecz z pomiaru przez arkusz, dopisz ją tu z powodem; ubyło: rzecz wróciła '
      + 'na ekran albo ZNIKŁA z produktu — sprawdź KTÓRE, bo to są dwie różne rzeczy');

    // ⛔ STRAŻNIK STRAŻNIKA: „w arkuszu" ma znaczyć „POZA `ScrollView`".
    check('⛔ (D3) arkusz dziennika stoi POZA `ScrollView` — inaczej nic nie zdejmuje',
      dziennikPrawdziwy.indexOf('</ScrollView>') < dziennikPrawdziwy.indexOf('<Arkusz')
      && dziennikPrawdziwy.indexOf('<Arkusz') > 0,
      'arkusz wpięty do przewijania ekranu — wtedy „przeniesione do arkusza" jest nieprawdą');

    // ⛔ …i wsunięcie treści arkusza na ekran MA podnieść wysokość. Bez tego
    // mutacja wyżej mogłaby nic nie zdejmować, a zapadka i tak by przeszła.
    check('⭐ (D3, O70) treść arkusza wsunięta na ekran PODNOSI zmierzoną wysokość dziennika',
      zArkuszem.wysokoscRazemDp > bezArkusza.wysokoscRazemDp + 1000,
      `${bezArkusza.wysokoscRazemDp} → ${zArkuszem.wysokoscRazemDp}`);
  }

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

  // ═════════════════════════════════════════════════════════════════
  // ⭐⭐ PLAN-D-M2 19.08.2026 — CZWARTE MIEJSCE: „W ARKUSZU".
  // ═════════════════════════════════════════════════════════════════
  // ⛔ DLACZEGO TO NIE JEST POLUZOWANIE STRAŻNIKA. Trzy miejsca wypisane
  // wyżej powstały 17.08, kiedy produkt nie miał ANI JEDNEGO arkusza
  // (`grep -rn "Modal" app/(tabs)` wracał pusty). Od 18.08 ma: nakładka jest
  // `Modal`-em, czyli OSOBNYM DRZEWEM nad ekranem, więc jej treść naprawdę
  // NIE WCHODZI do przewijania ekranu pod spodem — i miara ma rację, że jej
  // nie liczy. ⛔ Ale „miara ma rację, że nie liczy" to nie to samo, co
  // „wolno o tym nie mówić": lista, która przeniosła się do arkusza, znika
  // z pomiaru tak samo cicho jak lista, którą ktoś skasował.
  //
  // ⭐ CO ROBI TO MIEJSCE. Nie ucisza pytania — ZAMIENIA CISZĘ NA LICZBĘ.
  // Lista wolno jest „w arkuszu" tylko wtedy, gdy DOWIEDZIONE są trzy rzeczy:
  //   1. plik montuje `<Arkusz>` POZA `ScrollView` (inaczej nakładka
  //      podnosiłaby ekran i wykręcenie się nią byłoby kłamstwem),
  //   2. lista leży w ciele procedury, którą ten `<Arkusz>` dostaje jako
  //      dzieci — a nie gdziekolwiek w pliku,
  //   3. jest wymieniona Z NAZWY w zapadce na RÓWNOŚĆ niżej.
  // ⛔ Bez punktu 3 „przeniosłem to do arkusza" byłoby zdaniem, którym da się
  // wyprowadzić z pomiaru dowolną rzecz, raz na zawsze i bez śladu.

  /** Nazwy procedur, których wynik trafia do `<Arkusz>` jako dzieci. */
  const procedurArkusza = (src: string): string[] => {
    const iScroll = src.indexOf('</ScrollView>');
    const iArkusz = src.indexOf('<Arkusz');
    // ⛔ Arkusz WEWNĄTRZ przewijania nie zdejmuje ani jednego dp — wtedy to
    // miejsce nie istnieje i lista wraca do trzech pozostałych.
    if (iArkusz === -1 || iScroll === -1 || iScroll > iArkusz) return [];
    const koniec = src.indexOf('</Arkusz>', iArkusz);
    if (koniec === -1) return [];
    const wnetrze = src.slice(src.indexOf('>', iArkusz), koniec);
    return [...wnetrze.matchAll(/([A-Za-z_$][\w$]*)\s*\(\s*\)/g)].map((m) => m[1]);
  };

  /** Co naprawdę leży w arkuszach — zbierane po drodze, sprawdzane zapadką. */
  const listyWArkuszu: string[] = [];

  let listPoNazwie = 0;
  for (const e of ['dzis', 'ja', 'dziennik', 'mecz', 'kalendarz']) {
    const src = readFileSync(join(kat, `${e}.tsx`), 'utf8');
    const r = zmierzEkranZTekstu(e, src, kat);
    const zakresyArkusza = procedurArkusza(src)
      .map((n) => cialoProcedury(src, n))
      .filter((x): x is [number, number] => x !== null);

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
      // ⭐ M2 — CZWARTE MIEJSCE: lista leży w treści arkusza, czyli poza
      // przewijaniem ekranu. ⛔ NIE jest przez to „załatwiona" — jest
      // POLICZONA I NAZWANA w zapadce niżej.
      if (zakresyArkusza.some(([a, b]) => m.index > a && m.index < b)) {
        listyWArkuszu.push(`${e}: ${lista}.map(${m[2]})`);
        continue;
      }
      zgubione.push(`${lista}.map(${m[2]})`);
    }

    check(`⛔ (M2-13, O97) ekran „${e}": każda lista rysowana procedurą PO NAZWIE jest policzona albo NAZWANA`,
      zgubione.length === 0,
      `zgubione bez śladu: ${zgubione.join(', ')} — miara ma je policzyć, wpisać na listę `
      + 'nieznanych albo powiedzieć, w której pominiętej gałęzi leżą');
  }

  // ═════════════════════════════════════════════════════════════════
  // ⛔ ZAPADKA NA RÓWNOŚĆ — CO DOKŁADNIE LEŻY W ARKUSZACH (M2, 19.08.2026)
  // ═════════════════════════════════════════════════════════════════
  // ⚠️ ZMIERZONE 19.08.2026, nie przepisane z pamięci. Zapadka jest NA
  // RÓWNOŚĆ, a nie na „co najwyżej tyle": gdyby wolno było dokładać, to
  // miejsce zamieniłoby się w worek, do którego wpada wszystko, czego nie
  // chce się mieć w pomiarze. Kto przeniesie SZÓSTĄ listę do arkusza,
  // zobaczy czerwień i dopisze ją tutaj świadomie — z datą i powodem.
  const LISTY_W_ARKUSZU_19_08_2026 = [
    'mecz: history.map(renderMatchCard)',
    'mecz: segmentSlots.map(renderSegmentSlot)',
  ].sort();
  const wArkuszu = [...listyWArkuszu].sort();
  console.log(`   list rysowanych procedurą PO NAZWIE, które leżą W ARKUSZU: ${wArkuszu.length}`);
  for (const l of wArkuszu) console.log(`   • ${l}`);
  check('⛔ (M2-13, O97, O73) ZAPADKA: listy przeniesione do arkusza to DOKŁADNIE te, '
    + 'co 19.08.2026 — nie „co najwyżej tyle"',
    wArkuszu.length === LISTY_W_ARKUSZU_19_08_2026.length
    && wArkuszu.every((n, i) => n === LISTY_W_ARKUSZU_19_08_2026[i]),
    `jest [${wArkuszu.join(' · ') || '—'}], zapadka [${LISTY_W_ARKUSZU_19_08_2026.join(' · ')}] — `
    + 'doszło: ktoś wyprowadził kolejną rzecz z pomiaru przez arkusz, dopisz ją tu z powodem; '
    + 'ubyło: rzecz wróciła na ekran albo ZNIKŁA z produktu — sprawdź które');

  // ⛔ STRAŻNIK STRAŻNIKA: „w arkuszu" ma znaczyć „POZA `ScrollView`".
  // Bez tej asercji wystarczyłoby wpiąć `<Arkusz>` do przewijania, żeby
  // czwarte miejsce zaczęło uciszać listy, które NAPRAWDĘ podnoszą ekran.
  {
    const mecz = readFileSync(join(kat, 'mecz.tsx'), 'utf8');
    check('⛔ (M2-13) arkusz ekranu meczu stoi POZA `ScrollView` — inaczej nic nie zdejmuje',
      mecz.indexOf('</ScrollView>') < mecz.indexOf('<Arkusz')
      && mecz.indexOf('<Arkusz') > 0,
      'arkusz wpięty do przewijania ekranu — wtedy „przeniesione do arkusza" jest nieprawdą');
    check('⛔ (M2-13) …i procedura treści arkusza NIE JEST wołana w ciele `ScrollView`',
      !/\{\s*trescArkusza\(\)\s*\}/.test(
        mecz.slice(mecz.indexOf('<ScrollView'), mecz.indexOf('</ScrollView>'))),
      'treść arkusza wróciła na ekran');
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

// ═══════════════════════════════════════════════════════════════════
// ⭐⭐ 14. PLAN-D-M2 19.08.2026 — BATERIA MUTACJI EKRANU MECZU
// ═══════════════════════════════════════════════════════════════════
// ⛔ PO CO TA SEKCJA ISTNIEJE. Ten pas zdjął z ekranu meczu 5 078 dp — i to
// jest dokładnie ten rodzaj zmiany, którą najłatwiej zrobić ŹLE i pokazać
// jako sukces: wystarczy skasować pytania zamiast je przenieść, a zapadka
// wysokości zaświeci na zielono TYM MOCNIEJ. Liczba spadła, obietnica zginęła.
//
// ⭐ DLATEGO KOLEJNOŚĆ JEST ODWROTNA NIŻ INTUICYJNA: najpierw ASERCJA
// ODWROTNA (na prawdziwym pliku bateria ma dać ZERO zapaleń), a dopiero potem
// mutacje. Bateria, która na zdrowym kodzie coś zapala, nie dowodzi niczego —
// mierzy własny błąd.
//
// ⭐ MUTUJEMY TEKST WCZYTANY Z DYSKU, NIE PLIK NA DYSKU. To nie jest
// ustępstwo: pomiar (`zmierzEkranZTekstu`) i wszystkie predykaty niżej biorą
// ŹRÓDŁO JAKO NAPIS, więc mutacja nie musi dotykać dysku. ⛔ Skutek uboczny
// jest ważniejszy od wygody: przerwanie procesu w dowolnym momencie
// (SIGTERM, `Ctrl-C`, padnięcie kontenera) NIE MA CZEGO zepsuć — nie ma stanu
// do przywrócenia, więc nie ma też przywracania, które mogłoby się nie udać.
{
  const KAT_EKRANOW = join(root, 'app', '(tabs)');
  const meczPrawdziwy = readFileSync(join(KAT_EKRANOW, 'mecz.tsx'), 'utf8');

  /** Wycinek ciała `ScrollView` — czyli to, co NAPRAWDĘ stoi na ekranie. */
  const cialoEkranu = (src: string): string => {
    const a = src.indexOf('<ScrollView');
    const b = src.indexOf('</ScrollView>');
    return a >= 0 && b > a ? src.slice(a, b) : '';
  };

  /** Rodzaje arkusza wymienione w typie — czyli WSZYSTKO, co zeszło z ekranu. */
  const rodzajeZTypu = (src: string): string[] => {
    const m = /type RodzajArkuszaMeczu =([^;]*);/.exec(src);
    return m === null ? [] : [...m[1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]).sort();
  };

  /** Rodzaje, do których NA EKRANIE stoi wiersz wejścia ze strzałką. */
  const rodzajeZWejsciem = (src: string): string[] =>
    [...new Set([...cialoEkranu(src).matchAll(/wejscieArkusza\('([a-z]+)'/g)].map((x) => x[1]))].sort();

  /** Styl `uwaga` — zdanie o sprzeczności dwóch liczb. */
  const stylUwagi = (src: string): string => {
    const i = src.indexOf('  uwaga: {');
    if (i < 0) return '';
    const j = src.indexOf('\n  },', i);
    return j < 0 ? src.slice(i) : src.slice(i, j);
  };

  type Predykat = { nazwa: string; sprawdz: (src: string) => boolean };

  const BATERIA_M2: Predykat[] = [
    {
      // ⭐⭐ TO JEST WARUNEK 2 I 3 POLECENIA NARAZ (B3). Zbiór rodzajów arkusza
      // i zbiór wejść na ekranie muszą być IDENTYCZNE. ⛔ Nie „wejść jest co
      // najmniej tyle": arkusz bez wejścia to pytanie, którego zawodnik nigdy
      // nie zobaczy, a wejście bez arkusza to przycisk donikąd.
      nazwa: 'M2-B1 ⛔ KAŻDY arkusz meczu ma wejście NA EKRANIE — równość zbiorów, nie „co najmniej"',
      sprawdz: (src) => {
        const t = rodzajeZTypu(src);
        const w = rodzajeZWejsciem(src);
        return t.length > 0 && t.length === w.length && t.every((r, i) => r === w[i]);
      },
    },
    {
      // ═══════════════════════════════════════════════════════════════
      // ⚠️ PRZECELOWANE PRZEZ PAS M3 21.08.2026 — ⛔ NIE OSŁABIONE.
      //
      // ⛔ CO SIĘ ZMIENIŁO W MIERZONYM PLIKU. Do 21.08 `app/(tabs)/mecz.tsx`
      // budował wiersz `match_contexts` WŁASNĄ RĘKĄ i miał w nim linię
      // `match_length_minutes: dlugoscMeczu.trim() !== '' ? … : null`.
      // Pas M3 podpiął ten ekran pod `zdecydujOZapisieMeczu` (jedno źródło
      // decyzji o zapisie meczu dla obu ekranów), więc długość jedzie dziś
      // przez `ocena.dlugoscMeczu`, a nazwa kolumny powstaje w regule.
      // ⛔ TAMTEGO NAPISU W PLIKU JUŻ NIE MA I NIGDY NIE WRÓCI — asercja
      // na niego świeciłaby na czerwono ZA NAPRAWĘ, nie za defekt (O73).
      //
      // ⭐ WARUNEK ZAPALENIA JEST TEN SAM: „długość całego meczu ma dojechać
      // do `match_contexts.match_length_minutes`". Zmieniła się DROGA, którą
      // ta asercja go sprawdza — czyta dziś, czy ekran podaje długość regule
      // (a nie zeruje jej po cichu) I czy w ogóle woła tę regułę.
      // ⭐ SIŁA NIE SPADŁA: to, że reguła mapuje `dlugoscMeczu` na kolumnę,
      // jest sprawdzone URUCHOMIENIEM w `lib/meczWiecej.selftest.ts`
      // (`M3-B27`, `M3-B28` i mutacja `M3-M1`) — czyli mocniej niż napisem.
      // ═══════════════════════════════════════════════════════════════
      nazwa: 'M2-B2 ⛔ długość całego meczu idzie do `match_contexts.match_length_minutes` (znalezisko D8)',
      sprawdz: (src) => {
        const z = bezKomentarzy(src);
        // ⛔ WYCINEK, NIE CAŁY PLIK. `dlugoscMeczu.trim()` pada w tym ekranie
        // w TRZECH miejscach (sprzeczność minut, kalendarz, ocena meczu).
        // Pytanie „czy napis pada gdziekolwiek" przeszłoby także wtedy, gdy
        // z drogi do `match_contexts` znika — a wtedy mutacja gaśnie po cichu.
        const i = z.indexOf('const ocena: OcenaMeczu = {');
        const j = i < 0 ? -1 : z.indexOf('};', i);
        const ocena = i < 0 || j < 0 ? '' : z.slice(i, j);
        return ocena.length > 60
          && /dlugoscMeczu: dlugoscMeczu\.trim\(\) === '' \? null : Number\(dlugoscMeczu\)/.test(ocena)
          && /zdecydujOZapisieMeczu\(\{/.test(z);
      },
    },
    {
      // ⛔ „Przed zapisem", a nie „gdziekolwiek": bramka postawiona PO
      // `insert` zatrzymałaby sprzeczność dopiero po tym, jak baza już ją
      // odrzuciła kodem 23514 — czyli nie zatrzymałaby niczego.
      nazwa: 'M2-B3 ⛔ sprzeczność minut zatrzymana PRZED zapisem, nie kodem 23514 z bazy',
      sprawdz: (src) => {
        const z = bezKomentarzy(src);
        const brama = z.indexOf('if (sprzecznoscMinut)');
        const zapis = z.indexOf("from('match_contexts').insert(");
        return brama > 0 && zapis > 0 && brama < zapis && /minutyPonadDlugosc\(/.test(z);
      },
    },
    {
      // ⛔ Brzmienie ma DOKŁADNIE JEDNO miejsce — `lib/meczWiecej.ts`.
      // Wpisanie go tu drugi raz „żeby było widać" tworzy drugi słownik (O92),
      // który rozjedzie się z pierwszym przy pierwszej poprawce.
      nazwa: 'M2-B4 ⭐ zdanie o sprzeczności stoi NA EKRANIE i pochodzi z modułu, nie z literału',
      sprawdz: (src) => {
        const ekran = bezKomentarzy(cialoEkranu(src));
        return /\{sprzecznoscMinut && <Text[^>]*>\{MECZ_MINUTY_PONAD_DLUGOSC\}<\/Text>\}/.test(ekran)
          && !/Podałeś więcej minut na boisku/.test(bezKomentarzy(src));
      },
    },
    {
      nazwa: 'M2-B5 ⭐⭐ ekran meczu MIEŚCI SIĘ nad zgięciem w całości',
      sprawdz: (src) =>
        zmierzEkranZTekstu('mecz.tsx', src, KAT_EKRANOW).wysokoscRazemDp <= WIDOCZNE_NAD_ZGIECIEM_DP,
    },
    {
      nazwa: 'M2-B6 ⛔ arkusz stoi POZA `ScrollView` — inaczej nie zdejmuje ani jednego dp',
      sprawdz: (src) => {
        const s = src.indexOf('</ScrollView>');
        const a = src.indexOf('<Arkusz');
        return a > 0 && s > 0 && s < a;
      },
    },
    {
      // ⛔ Z2 — czerwień jest w tym produkcie zarezerwowana dla bólu i stanu
      // ochronnego. Dwie liczby, które się nie zgadzają, to rzecz do
      // poprawienia, a nie ostrzeżenie o ciele.
      // ⭐ K4 — i dlatego nośnikiem jest ZDANIE: jeden na dwunastu chłopców nie
      // rozróżnia części barw i ma przeczytać dokładnie to samo, co reszta.
      nazwa: 'M2-B7 ⛔ zdanie o sprzeczności NIE JEST czerwone (Z2) i niesie treść słowami (K4)',
      sprawdz: (src) => {
        const u = stylUwagi(src);
        return u.length > 0 && !/colors\.error/.test(u);
      },
    },
    {
      // ⛔ ZAPADKA NA SKASOWANIE. Bez niej wszystkie predykaty wyżej spełnia
      // także ekran, z którego pytania segmentowe po prostu USUNIĘTO —
      // a wtedy „schudł o 5 078 dp" jest prawdą i katastrofą naraz.
      nazwa: 'M2-B8 ⛔ pytania segmentowe są PRZENIESIONE, a nie skasowane',
      sprawdz: (src) => /segmentSlots\.map\(renderSegmentSlot\)/.test(bezKomentarzy(src))
        && /function renderSegmentSlot\(/.test(src),
    },
    {
      nazwa: 'M2-B9 ⛔ historia meczów jest PRZENIESIONA, a nie skasowana',
      sprawdz: (src) => /history\.map\(renderMatchCard\)/.test(bezKomentarzy(src)),
    },
    {
      nazwa: 'M2-B10 ⛔ lista trybu kontuzji jest PRZENIESIONA, a nie skasowana',
      sprawdz: (src) => /renderRoutingBlock\(\)/.test(bezKomentarzy(src))
        && /function renderRoutingBlock\(/.test(src),
    },
  ];

  // ── 14.1 ⭐⭐ ASERCJA ODWROTNA — NAJPIERW, NIE NA KOŃCU ──────────────
  console.log('\n14.1 ⭐⭐ ASERCJA ODWROTNA — bateria M2 na PRAWDZIWYM pliku (musi dać 0 zapaleń)');
  const zapaloneNaPrawdzie: string[] = [];
  for (const p of BATERIA_M2) {
    const ok = p.sprawdz(meczPrawdziwy);
    check(p.nazwa, ok, 'predykat zapala się na NIEZMUTOWANYM pliku — bateria mierzy własny błąd');
    if (!ok) zapaloneNaPrawdzie.push(p.nazwa);
  }
  check('⭐⭐ (M2-14) ASERCJA ODWROTNA: na prawdziwym `mecz.tsx` bateria ma ZERO zapaleń',
    zapaloneNaPrawdzie.length === 0, zapaloneNaPrawdzie.join(' · '));

  // ── 14.2 ⭐⭐ MUTACJE ───────────────────────────────────────────────
  type Mutacja = { nazwa: string; coPsuje: string; zastosuj: (src: string) => string };
  const MUTACJE_M2: Mutacja[] = [
    {
      nazwa: 'M2-M1 ⛔⛔ pytanie ZNIKA Z EKRANU BEZ WEJŚCIA ZASTĘPCZEGO',
      coPsuje: 'B3 / warunek 3 polecenia — ból zostaje w kodzie arkusza, ale nie ma go '
        + 'jak otworzyć: zawodnik nie zobaczy pytania o ból już nigdy',
      zastosuj: (src) => src.replace(
        "        {wejscieArkusza('bol', 'Boli Cię dziś coś?', 'miejsce, strona, natężenie')}\n", ''),
    },
    {
      nazwa: 'M2-M2 ⛔⛔ długość meczu PRZESTAJE SIĘ ZAPISYWAĆ do `match_contexts`',
      coPsuje: 'znalezisko D8 — mecz U13 na 60 minut liczy się jak 90, więc zawodnik '
        + 'dostaje 3 punkty zamiast 4: karę za to, że jego mecz jest krótszy',
      // ⚠️ PRZECELOWANE PRZEZ PAS M3 21.08.2026 razem z `M2-B2` (patrz komentarz
      // przy tamtym predykacie). ⛔ Mutacja robi DOKŁADNIE to samo co wcześniej —
      // zdejmuje długość meczu z drogi do bazy — tyle że w miejscu, w którym ta
      // droga dziś przebiega. Stara podmiana nie trafiłaby w nic i mutacja
      // ZGASŁABY PO CICHU, choć strażnik działa.
      zastosuj: (src) => src.replace(
        "        dlugoscMeczu: dlugoscMeczu.trim() === '' ? null : Number(dlugoscMeczu),\n",
        "        dlugoscMeczu: null,\n"),
    },
    {
      nazwa: 'M2-M3 ⛔⛔ SPRZECZNOŚĆ MINUT PRZEPUSZCZONA DO BAZY',
      coPsuje: '§3 polecenia — zawodnik z 90 minutami w meczu 60-minutowym dostaje '
        + 'kod `23514` zamiast zdania, z którego wynika, którą liczbę poprawić',
      zastosuj: (src) => src.replace(
        '    if (sprzecznoscMinut) { setError(MECZ_MINUTY_PONAD_DLUGOSC); return; }\n', ''),
    },
    {
      nazwa: 'M2-M4 ⛔ zdanie o sprzeczności znika Z EKRANU (zostaje sama bramka zapisu)',
      coPsuje: '§3 — zawodnik dowiaduje się o sprzeczności dopiero po dotknięciu '
        + '„Zapisz mecz", zamiast widzieć ją w chwili, w której ją tworzy',
      zastosuj: (src) => src.replace(
        '        {sprzecznoscMinut && <Text style={styles.uwaga}>{MECZ_MINUTY_PONAD_DLUGOSC}</Text>}\n', ''),
    },
    {
      nazwa: 'M2-M5 ⛔⛔ pytania segmentowe SKASOWANE zamiast przeniesione',
      coPsuje: 'B3 — najtańszy sposób na „ekran schudł": zapadka wysokości świeci '
        + 'mocniej niż przy poprawnej naprawie, a `match_context_answers` przestaje '
        + 'dostawać cokolwiek — czyli kaskada meczowa traci jedyne wejście',
      zastosuj: (src) => src.replace('{segmentSlots.map(renderSegmentSlot)}', '{null}'),
    },
    {
      nazwa: 'M2-M6 ⛔ arkusz wpięty DO `ScrollView` — czyli nie zdejmuje ani jednego dp',
      coPsuje: 'cała teza tego pasa: nakładka zdejmuje wysokość WYŁĄCZNIE dlatego, '
        + 'że stoi poza przewijaniem ekranu',
      zastosuj: (src) => src.replace('    </ScrollView>\n', '')
        .replace('    </Arkusz>\n', '    </Arkusz>\n    </ScrollView>\n'),
    },
    {
      nazwa: 'M2-M7 ⛔ zdanie o sprzeczności dostaje CZERWIEŃ (Z2)',
      coPsuje: 'Z2 — czerwień przestaje znaczyć „ból albo stan ochronny" i zaczyna '
        + 'znaczyć „pomyliłeś się"; ⭐ K4: kolor i tak nie niesie nic dla jednego '
        + 'chłopca na dwunastu, więc jedyne, co ta zmiana robi, to psuje alfabet',
      zastosuj: (src) => src.replace(
        "    color: colors.textPrimary,\n    backgroundColor: colors.surfaceElevated,",
        "    color: colors.error,\n    backgroundColor: colors.surfaceElevated,"),
    },
    {
      nazwa: 'M2-M8 ⛔ dwie liczby minut wracają JEDNA POD DRUGĄ',
      coPsuje: 'wysokość — ekran rośnie o 102 dp i wychodzi spod zgięcia; '
        + '⭐ to jest mutacja na WRAŻLIWOŚĆ samej miary, nie na treść',
      zastosuj: (src) => src.replace('<View style={styles.wiersz}>', '<View style={styles.kolumna}>'),
    },
  ];

  console.log('\n14.2 ⭐⭐ BATERIA MUTACJI — osiem mutacji na prawdziwym `app/(tabs)/mecz.tsx`');
  let niemeM2 = 0;
  for (const m of MUTACJE_M2) {
    const zmutowany = m.zastosuj(meczPrawdziwy);
    const zmienil = zmutowany !== meczPrawdziwy;
    const zapalone = BATERIA_M2.filter((p) => !p.sprawdz(zmutowany)).map((p) => p.nazwa);
    console.log(`\n   ${m.nazwa}\n   co psuje: ${m.coPsuje}`);
    console.log(`   zapalone predykaty: ${zapalone.length} / ${BATERIA_M2.length}`);
    zapalone.forEach((n) => console.log(`      ↳ ${n}`));
    check(`⭐ (M2-14) mutacja „${m.nazwa}" NAPRAWDĘ zmienia plik (inaczej bateria bada nic)`,
      zmienil, 'wzorzec podmiany nie trafił — mutacja jest atrapą');
    check(`⭐ (M2-14) mutacja „${m.nazwa}" ZAPALA strażnika imiennie`,
      zapalone.length > 0, 'mutacja przeszła niezauważona — strażnika na tę regułę NIE MA');
    if (zapalone.length === 0) niemeM2++;
  }
  check('⭐⭐ (M2-14) ANI JEDNA z ośmiu mutacji nie przeszła niezauważona',
    niemeM2 === 0, `nieme mutacje: ${niemeM2}`);

  // ── 14.3 ⛔ …I PRAWDZIWE ŹRÓDŁO JEST PO BATERII NIETKNIĘTE ──────────
  // ⚠️ Asercja wygląda na zbędną, dopóki ktoś nie zamieni mutacji w pamięci
  // na mutację na dysku. Wtedy przestaje być zbędna w tej samej sekundzie.
  check('⛔ (M2-14) po całej baterii plik na dysku jest CO DO ZNAKU taki sam',
    readFileSync(join(KAT_EKRANOW, 'mecz.tsx'), 'utf8') === meczPrawdziwy,
    'bateria zostawiła po sobie zmieniony plik produktu');
}

// ═══════════════════════════════════════════════════════════════════
// ⭐⭐ 15. PLAN-D-D3 21.08.2026 — BATERIA MUTACJI EKRANU DZIENNIKA
// ═══════════════════════════════════════════════════════════════════
// ⛔ PO CO TA SEKCJA ISTNIEJE. Ten pas zdjął z ekranu dziennika 2 969 dp —
// i to jest dokładnie ten rodzaj zmiany, którą najłatwiej zrobić ŹLE i pokazać
// jako sukces: wystarczy SKASOWAĆ pytania zamiast je przenieść, a zapadka
// wysokości zaświeci TYM MOCNIEJ. Liczba spadła, obietnica zginęła (B3).
//
// ⭐ KOLEJNOŚĆ JEST ODWROTNA NIŻ INTUICYJNA: najpierw ASERCJA ODWROTNA (na
// prawdziwych plikach bateria ma dać ZERO zapaleń), dopiero potem mutacje.
// Bateria, która na zdrowym kodzie cokolwiek zapala, mierzy własny błąd.
//
// ⭐ MUTUJEMY TEKST WCZYTANY Z DYSKU, NIE PLIK NA DYSKU (wzorzec pasa M2).
// Przerwanie procesu w dowolnym momencie NIE MA CZEGO zepsuć: nie ma stanu
// do przywrócenia, więc nie ma przywracania, które mogłoby się nie udać.
{
  const KAT_EKRANOW = join(root, 'app', '(tabs)');
  const dziennikPrawdziwy = readFileSync(join(KAT_EKRANOW, 'dziennik.tsx'), 'utf8');
  const narzedziePrawdziwe = readFileSync(join(root, NARZEDZIE), 'utf8');

  /** ⛔ Stan badany to PARA: ekran i narzędzie pomiaru. Model wysokości mieszka w drugim. */
  type StanD3 = { dziennik: string; narzedzie: string };
  const PRAWDA_D3: StanD3 = { dziennik: dziennikPrawdziwy, narzedzie: narzedziePrawdziwe };

  /** Wycinek ciała `ScrollView` — czyli to, co NAPRAWDĘ stoi na ekranie. */
  const cialoEkranuD3 = (src: string): string => {
    const a = src.indexOf('<ScrollView');
    const b = src.indexOf('</ScrollView>');
    return a >= 0 && b > a ? src.slice(a, b) : '';
  };

  /** Rodzaje arkusza wymienione w typie — czyli WSZYSTKO, co zeszło z ekranu. */
  const rodzajeZTypuD3 = (src: string): string[] => {
    const m = /type RodzajArkuszaDziennika =([^;]*);/.exec(src);
    return m === null ? [] : [...m[1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]).sort();
  };

  /** Rodzaje, do których NA EKRANIE stoi wiersz wejścia ze strzałką. */
  const rodzajeZWejsciemD3 = (src: string): string[] =>
    [...new Set([...cialoEkranuD3(src).matchAll(/wejscieArkusza\('([a-z]+)'\)/g)].map((x) => x[1]))].sort();

  /** Rodzaje, które mają napis w jedynej tablicy brzmień tego ekranu. */
  const rodzajeZNapisemD3 = (src: string): string[] => {
    const m = /const NAPIS_ARKUSZA: Record<RodzajArkuszaDziennika, string> = \{([\s\S]*?)\n\};/.exec(src);
    return m === null ? [] : [...m[1].matchAll(/^\s{2}([a-z]+):/gm)].map((x) => x[1]).sort();
  };

  /** Ciało procedury rysującej treść arkusza — czyli to, co zeszło z ekranu, ale ŻYJE. */
  const trescArkuszaD3 = (src: string): string => {
    const a = src.indexOf('function trescArkusza()');
    const b = src.indexOf('function wejscieArkusza(', a);
    return a >= 0 && b > a ? src.slice(a, b) : '';
  };

  /** Model wysokości dziennika, wyjęty Z TEKSTU narzędzia: nazwy i liczby dp. */
  const modelDziennika = (narz: string): [string, number][] => {
    const m = /const DZIENNIK_DO_PYTANIA: \[string, number\]\[\] = \[([\s\S]*?)\n\];/.exec(narz);
    if (m === null) return [];
    return [...m[1].matchAll(/\[\s*'([^']*)',\s*([0-9.]+)\s*\]/g)]
      .map((x) => [x[1], Number(x[2])] as [string, number]);
  };

  /**
   * ⭐ POMIAR GAŁĘZI POTRENINGOWEJ — tej, której dotyczy próg pytania o sesję
   * Bloku. Gałąź poranna jest wyższa, więc pomiar domyślny opisuje ją; tutaj
   * jest wygaszana W TEKŚCIE, nigdy na dysku.
   */
  const nadPytaniemD3 = (src: string): { ile: number; goraDp: number } | null => {
    const a = src.indexOf(") : entryType === 'morning' ? (");
    const b = src.indexOf('      ) : (', a);
    if (a < 0 || b < 0) return null;
    const tylkoPotreningowy = src.slice(0, a) + ") : entryType === 'morning' ? (\n        <></>\n" + src.slice(b);
    const r = zmierzEkranZTekstu('dziennik-potreningowy', tylkoPotreningowy, KAT_EKRANOW);
    const i = r.pozycje.findIndex((x) => /blockPrompt/i.test(x.nazwa));
    return i < 0 ? null : { ile: i, goraDp: r.pozycje[i].goraDp };
  };

  type PredykatD3 = { nazwa: string; sprawdz: (s: StanD3) => boolean };

  const BATERIA_D3: PredykatD3[] = [
    {
      // ⭐⭐ TO JEST WARUNEK 4 POLECENIA (i warunki 2 i 3 naraz). Zbiór rodzajów
      // arkusza, zbiór wierszy wejścia NA EKRANIE i zbiór brzmień muszą być
      // IDENTYCZNE. ⛔ Nie „co najmniej tyle": arkusz bez wejścia to pytanie,
      // którego zawodnik nigdy nie zobaczy, a wejście bez arkusza to przycisk
      // donikąd. ⛔ OBIE STRONY ZAPALAJĄ CZERWIEŃ.
      nazwa: 'D3-B1 ⛔⛔ KAŻDY arkusz dziennika ma wejście NA EKRANIE i brzmienie — RÓWNOŚĆ trzech zbiorów',
      sprawdz: (s) => {
        const t = rodzajeZTypuD3(s.dziennik);
        const w = rodzajeZWejsciemD3(s.dziennik);
        const n = rodzajeZNapisemD3(s.dziennik);
        return t.length > 0
          && t.length === w.length && t.every((r, i) => r === w[i])
          && t.length === n.length && t.every((r, i) => r === n[i]);
      },
    },
    {
      nazwa: 'D3-B2 ⭐⭐ ekran dziennika MIEŚCI SIĘ nad zgięciem w całości',
      sprawdz: (s) =>
        zmierzEkranZTekstu('dziennik.tsx', s.dziennik, KAT_EKRANOW).wysokoscRazemDp
          <= WIDOCZNE_NAD_ZGIECIEM_DP,
    },
    {
      nazwa: 'D3-B3 ⛔ arkusz stoi POZA `ScrollView` — inaczej nie zdejmuje ani jednego dp',
      sprawdz: (s) => {
        const a = s.dziennik.indexOf('<Arkusz');
        const b = s.dziennik.indexOf('</ScrollView>');
        return a > 0 && b > 0 && b < a
          && !/\{\s*trescArkusza\(\)\s*\}/.test(cialoEkranuD3(s.dziennik));
      },
    },
    {
      // ⛔ Napis wiersza i tytuł arkusza z DWÓCH miejsc rozjadą się przy
      // pierwszej poprawce — i wtedy zawodnik dotyka wiersza „Notatka",
      // a trafia do arkusza o innej nazwie (O92).
      nazwa: 'D3-B4 ⛔ napis wiersza wejścia i tytuł arkusza pochodzą z JEDNEGO miejsca',
      sprawdz: (s) => /\{NAPIS_ARKUSZA\[rodzaj\]\} →/.test(s.dziennik)
        && /tytul: NAPIS_ARKUSZA\[rodzaj\]/.test(bezKomentarzy(s.dziennik)),
    },
    {
      // ⛔ ZAPADKI NA SKASOWANIE. Bez nich wszystkie predykaty wyżej spełnia
      // także ekran, z którego pytania po prostu USUNIĘTO — a wtedy „schudł
      // o 2 969 dp" jest prawdą i katastrofą naraz.
      nazwa: 'D3-B5 ⛔ ból jest PRZENIESIONY do arkusza, a nie skasowany',
      sprawdz: (s) => {
        const t = bezKomentarzy(trescArkuszaD3(s.dziennik));
        return /<Checkbox value=\{hasPain\}/.test(t) && /setPainIntensity/.test(t)
          && /setPainExcludes/.test(t) && /BODY_LOCATIONS\.map/.test(t);
      },
    },
    {
      nazwa: 'D3-B6 ⛔ historia wpisów jest PRZENIESIONA do arkusza, a nie skasowana',
      sprawdz: (s) => {
        const t = bezKomentarzy(trescArkuszaD3(s.dziennik));
        return /history\.map\(/.test(t) && /pustkaHistorii/.test(t) && /pains\.map\(/.test(t);
      },
    },
    {
      nazwa: 'D3-B7 ⛔ nastrój, notatka, powiązanie i zmęczenie są PRZENIESIONE, a nie skasowane',
      sprawdz: (s) => {
        const t = bezKomentarzy(trescArkuszaD3(s.dziennik));
        return /setMoodMotivation/.test(t) && /setFreeNote/.test(t)
          && /calendarLinkOptions\.map/.test(t) && /setPostFatigue/.test(t);
      },
    },
    {
      // ⛔ Z2 — czerwień należy w tym produkcie WYŁĄCZNIE do bólu i stanu
      // ochronnego. Ani „wpis jest", ani „nie udało się sprawdzić" nie są
      // ostrzeżeniem o ciele.
      nazwa: 'D3-B8 ⛔ zdania o stanie ankiety NIE SĄ czerwone (Z2)',
      sprawdz: (s) => {
        // ⛔ Wycinek DWÓCH konkretnych stylów, a nie zakresu „od–do" w arkuszu
        // stylów. Pierwsza wersja tego predykatu brała wszystko od
        // `stanAnkietyBox` do `painTag` — a między nimi stoi styl `error`,
        // który `colors.error` ma z definicji. Predykat zapalał się na zdrowym
        // pliku, czyli mierzył własny błąd; złapała to asercja odwrotna 15.1
        // i po to ona stoi PRZED mutacjami.
        const kod = bezKomentarzy(s.dziennik);
        const styl = (nazwa: string): string => {
          const i = kod.indexOf(`${nazwa}: {`);
          if (i < 0) return '';
          const j = kod.indexOf('}', i);
          return j < 0 ? kod.slice(i) : kod.slice(i, j);
        };
        const box = styl('stanAnkietyBox');
        const txt = styl('stanAnkietyTxt');
        return box.length > 0 && txt.length > 0
          && !/colors\.error/.test(box) && !/colors\.error/.test(txt);
      },
    },
    {
      // ⭐⭐ TO JEST SEDNO ZADANIA §4. Szarość kafla ma znaczyć DOKŁADNIE JEDNO:
      // „okno zamknięte i wpisu z dzisiaj nie ma". Warunek na samym
      // `!oknoPorankaOtwarte` zlewa wypełnioną ankietę z przepadniętą — i to
      // jest dokładnie ten stan, który pas T2 zostawił i zgłosił (§7.4).
      nazwa: 'D3-B9 ⛔⛔ kafel szarzeje TYLKO przy „okno zamknięte i wpisu nie ma"',
      sprawdz: (s) => {
        const kod = bezKomentarzy(s.dziennik);
        return /stanAnkiety === 'zamkniete_wpisu_nie_ma' && styles\.toggleBtnPoOknie/.test(kod)
          && !/!oknoPorankaOtwarte && styles\.toggleBtnPoOknie/.test(kod);
      },
    },
    {
      // ⛔ Strzałka „→" jest afordancją dotknięcia. Napis ze strzałką bez
      // `onPress` to fałszywy przycisk, a nie wejście zastępcze.
      nazwa: 'D3-B10 ⛔ wiersz wejścia jest DOTYKALNY, a nie samym napisem ze strzałką',
      sprawdz: (s) => /function wejscieArkusza\([\s\S]{0,400}?<TouchableOpacity[\s\S]{0,300}?onPress=\{\(\) => setArkusz\(rodzaj\)\}/
        .test(s.dziennik),
    },
    {
      // ⭐⭐ TO JEST NAPRAWA ZNALEZISKA T2 §8 — sprawdzana, a nie opisana.
      // Model wysokości w `tests/measure-heights.ts` ma mieć DOKŁADNIE tyle
      // pozycji i DOKŁADNIE tyle dp, co pomiar z pliku ekranu.
      nazwa: 'D3-B11 ⛔⛔ model wysokości dziennika ZGADZA SIĘ z plikiem ekranu — pozycje i dp, na RÓWNOŚĆ',
      sprawdz: (s) => {
        const model = modelDziennika(s.narzedzie);
        const pomiar = nadPytaniemD3(s.dziennik);
        if (model.length === 0 || pomiar === null) return false;
        const suma = model.reduce((a, [, v]) => a + v, 0);
        return model.length === pomiar.ile && Math.round(suma) === Math.round(pomiar.goraDp);
      },
    },
  ];

  // ── 15.1 ⭐⭐ ASERCJA ODWROTNA — NAJPIERW, NIE NA KOŃCU ─────────────
  console.log('\n15.1 ⭐⭐ ASERCJA ODWROTNA — bateria D3 na PRAWDZIWYCH plikach (musi dać 0 zapaleń)');
  const zapaloneNaPrawdzieD3: string[] = [];
  for (const p of BATERIA_D3) {
    const ok = p.sprawdz(PRAWDA_D3);
    check(p.nazwa, ok, 'predykat zapala się na NIEZMUTOWANYCH plikach — bateria mierzy własny błąd');
    if (!ok) zapaloneNaPrawdzieD3.push(p.nazwa);
  }
  check('⭐⭐ (D3-15) ASERCJA ODWROTNA: na prawdziwych plikach bateria D3 ma ZERO zapaleń',
    zapaloneNaPrawdzieD3.length === 0, zapaloneNaPrawdzieD3.join(' · '));

  // ── 15.2 ⭐⭐ MUTACJE ───────────────────────────────────────────────
  type MutacjaD3 = { nazwa: string; coPsuje: string; zastosuj: (s: StanD3) => StanD3 };
  const MUTACJE_D3: MutacjaD3[] = [
    {
      nazwa: 'D3-M1 ⛔⛔ pole ZNIKA Z EKRANU BEZ WEJŚCIA ZASTĘPCZEGO',
      coPsuje: 'B3 / warunek 3 polecenia — ból zostaje w kodzie arkusza, ale nie ma go '
        + 'jak otworzyć: zawodnik nie zobaczy pytania o ból już nigdy',
      zastosuj: (s) => ({ ...s, dziennik: s.dziennik.replace("        {wejscieArkusza('bol')}\n", '') }),
    },
    {
      nazwa: 'D3-M2 ⛔⛔ historia wpisów SKASOWANA zamiast przeniesionej',
      coPsuje: 'B3 — najtańsze „ekran schudł": zapadka wysokości świeci mocniej niż '
        + 'przy poprawnej naprawie, a zawodnik traci jedyne miejsce, w którym widzi '
        + 'swoje wpisy z ostatnich dni',
      zastosuj: (s) => ({ ...s, dziennik: s.dziennik.replace('{history.map((row) => {', '{[].map((row: any) => {') }),
    },
    {
      nazwa: 'D3-M3 ⛔ arkusz wpięty DO `ScrollView` — czyli nie zdejmuje ani jednego dp',
      coPsuje: 'cała teza tego pasa: nakładka zdejmuje wysokość WYŁĄCZNIE dlatego, '
        + 'że stoi poza przewijaniem ekranu',
      zastosuj: (s) => ({
        ...s,
        dziennik: s.dziennik.replace('    </ScrollView>\n', '')
          .replace('    </Arkusz>\n', '    </Arkusz>\n    </ScrollView>\n'),
      }),
    },
    {
      nazwa: 'D3-M4 ⛔⛔ WYPEŁNIONA I NIEWYPEŁNIONA ANKIETA ZLEWAJĄ SIĘ W JEDEN STAN',
      coPsuje: '§4 / R5 — zawodnik, który wypełnił ankietę o 7:00, dostaje po 12:00 '
        + 'dokładnie tę samą szarość, co ten, któremu przepadła. To jest stan sprzed '
        + 'tego pasa, zgłoszony przez T2 (§7.4) i przez niego niezrobiony',
      zastosuj: (s) => ({
        ...s,
        dziennik: s.dziennik.replace(
          "            stanAnkiety === 'zamkniete_wpisu_nie_ma' && styles.toggleBtnPoOknie,",
          '            !oknoPorankaOtwarte && styles.toggleBtnPoOknie,'),
      }),
    },
    {
      nazwa: 'D3-M5 ⛔ rzecz WRACA NA EKRAN zamiast stać w arkuszu',
      coPsuje: 'wysokość — treść arkusza wsunięta w miejsce wiersza wejścia podnosi '
        + 'ekran ponad linię zgięcia i naraz odbiera bólowi jego wejście; '
        + '⭐ to jest mutacja na WRAŻLIWOŚĆ samej miary, nie na treść',
      zastosuj: (s) => ({
        ...s,
        dziennik: s.dziennik.replace("        {wejscieArkusza('bol')}\n", '        {trescArkusza()}\n'),
      }),
    },
    {
      nazwa: 'D3-M6 ⛔ napis wiersza rozjeżdża się z tytułem arkusza',
      coPsuje: 'O92 — dwa miejsca na to samo brzmienie; zawodnik dotyka wiersza '
        + 'o jednej nazwie i trafia do arkusza o innej',
      zastosuj: (s) => ({
        ...s,
        dziennik: s.dziennik.replace('{NAPIS_ARKUSZA[rodzaj]} →', "{'Więcej'} →"),
      }),
    },
    {
      nazwa: 'D3-M7 ⛔⛔ MODEL WYSOKOŚCI ROZJEŻDŻA SIĘ Z PLIKIEM EKRANU',
      coPsuje: 'znalezisko T2 §8 — model, który nie zgadza się z plikiem, mówi '
        + 'o ekranie sprzed rozjazdu; „schudł do 800 dp" staje się wtedy zdaniem, '
        + 'a nie pomiarem',
      zastosuj: (s) => ({
        ...s,
        narzedzie: s.narzedzie.replace("  ['baner potwierdzenia', 17],\n", ''),
      }),
    },
    {
      nazwa: 'D3-M8 ⛔ zdanie o stanie ankiety dostaje CZERWIEŃ (Z2)',
      coPsuje: 'Z2 — czerwień przestaje znaczyć „ból albo stan ochronny" i zaczyna '
        + 'znaczyć „coś jest nie tak z Twoją ankietą"; ⭐ K4: kolor i tak nie niesie '
        + 'nic dla jednego chłopca na dwunastu, więc jedyne, co ta zmiana robi, '
        + 'to psuje alfabet',
      zastosuj: (s) => ({
        ...s,
        dziennik: s.dziennik.replace(
          'stanAnkietyTxt: { ...typography.body, fontSize: 14, lineHeight: 19, color: colors.textPrimary }',
          'stanAnkietyTxt: { ...typography.body, fontSize: 14, lineHeight: 19, color: colors.error }'),
      }),
    },
  ];

  console.log('\n15.2 ⭐⭐ BATERIA MUTACJI — osiem mutacji na prawdziwym `app/(tabs)/dziennik.tsx`');
  let niemeD3 = 0;
  for (const m of MUTACJE_D3) {
    const zmutowany = m.zastosuj(PRAWDA_D3);
    const zmienil = zmutowany.dziennik !== PRAWDA_D3.dziennik
      || zmutowany.narzedzie !== PRAWDA_D3.narzedzie;
    const zapalone = BATERIA_D3.filter((p) => !p.sprawdz(zmutowany)).map((p) => p.nazwa);
    console.log(`\n   ${m.nazwa}\n   co psuje: ${m.coPsuje}`);
    console.log(`   zapalone predykaty: ${zapalone.length} / ${BATERIA_D3.length}`);
    zapalone.forEach((n) => console.log(`      ↳ ${n}`));
    check(`⭐ (D3-15) mutacja „${m.nazwa}" NAPRAWDĘ zmienia plik (inaczej bateria bada nic)`,
      zmienil, 'wzorzec podmiany nie trafił — mutacja jest atrapą');
    check(`⭐ (D3-15) mutacja „${m.nazwa}" ZAPALA strażnika imiennie`,
      zapalone.length > 0, 'mutacja przeszła niezauważona — strażnika na tę regułę NIE MA');
    if (zapalone.length === 0) niemeD3++;
  }
  check('⭐⭐ (D3-15) ANI JEDNA z ośmiu mutacji nie przeszła niezauważona',
    niemeD3 === 0, `nieme mutacje: ${niemeD3}`);

  // ── 15.3 ⛔ …I PRAWDZIWE ŹRÓDŁA SĄ PO BATERII NIETKNIĘTE ────────────
  check('⛔ (D3-15) po całej baterii oba pliki na dysku są CO DO ZNAKU takie same',
    readFileSync(join(KAT_EKRANOW, 'dziennik.tsx'), 'utf8') === dziennikPrawdziwy
    && readFileSync(join(root, NARZEDZIE), 'utf8') === narzedziePrawdziwe,
    'bateria zostawiła po sobie zmieniony plik produktu');
}


// ═════════════════════════════════════════════════════════════════════
// 16. ⭐⭐ PAS W2 21.08.2026 — UMOWA O KROJU I EKRAN STARTOWY
// ═════════════════════════════════════════════════════════════════════
// ⛔ PO CO TO STOI W TYM PLIKU, A NIE W NOWYM. Zmiana kroju rusza wysokość
// KAŻDEGO wiersza tekstu, więc jej strażnik należy do pliku, w którym stoją
// zapadki wysokości. Rozdzielenie ich na dwa pliki znaczyłoby, że da się
// zmienić krój bez oglądania ani jednej liczby dp.
//
// CO PILNUJE — dziewięć rzeczy, każda z powodem:
//  W2-1  nazwa kroju NIE PADA w żadnym pliku ekranu (§2.5 polecenia);
//  W2-2  pada wyłącznie w `constants/theme.ts`, w stałej `KROJE` (§2.4);
//  W2-3  `app/_layout.tsx` wczytuje DOKŁADNIE te rodziny, które deklaruje
//        `KROJE` — na RÓWNOŚĆ zbiorów, i bierze je z `KROJE`, nie z ręki;
//  W2-4  `typography.*` nie zna ani jednej nazwy spoza `KROJE`;
//  W2-5  ⛔ krój wyświetlaniowy NIE WCHODZI do tekstu ciągłego (§2.3);
//  W2-6  ⛔ jest jawny stan „kroje jeszcze się nie wczytały" i w tym stanie
//        produkt NIE JEST rysowany (§2.1) — inaczej zawodnik zobaczyłby
//        ekran w kroju systemowym, a potem podmianę w locie;
//  W2-7  tło ekranu startowego i tło ikony = tło aplikacji, z JEDNEGO
//        miejsca (§4.3) — trzy wpisy `app.json` kontra `colors.background`;
//  W2-8  ⛔⛔ POLSKIE ZNAKI. Czytamy pliki `.ttf` z paczek i sprawdzamy,
//        że każdy z ośmiu znaków `ĄĆĘŁŃÓŚŹŻ` (obie wielkości) ma WŁASNY
//        glif o niezerowej liczbie konturów. ⚠️ Sama obecność w `cmap`
//        nie wystarcza: wskazanie na pusty glif to kwadrat na ekranie;
//  W2-9  zadeklarowana w `INTERLINIA_KROJU` interlinia zgadza się co do
//        trzeciego miejsca z tym, co naprawdę stoi w tablicach `head`
//        i `hhea` pliku kroju — deklaracja, której nikt nie sprawdza,
//        starzeje się jak komentarz (O84).
{
  const KAT_EKRANOW = join(root, 'app', '(tabs)');
  // ⚠️ NAZWA POLA ZAPADKI SKŁADANA Z DWÓCH CZĘŚCI — celowo. Ten sam plik
  // przemiata SAM SIEBIE (W2-10), więc napis wpisany tu w całości byłby
  // policzony jako szósta zapadka i strażnik strażnika świeciłby na czerwono
  // na zdrowym kodzie. To ta sama pułapka co „napis pada gdziekolwiek w pliku".
  const POLE_ZAPADKI = `wysokosc${'Dp'}`;
  const PLIKI_EKRANOW = ['dzis.tsx', 'ja.tsx', 'mecz.tsx', 'dziennik.tsx',
    'kalendarz.tsx', 'profil.tsx', 'cele.tsx', 'biblioteka.tsx'] as const;

  const zrodloEkranu = (n: string) => bezKomentarzy(readFileSync(join(KAT_EKRANOW, n), 'utf8'));
  const UMOWA = zrodlo(join('constants', 'theme.ts'));
  const UMOWA_Z_KOMENTARZAMI = readFileSync(join(root, 'constants', 'theme.ts'), 'utf8');
  const LAYOUT = zrodlo(join('app', '_layout.tsx'));
  const APP_JSON = readFileSync(join(root, 'app.json'), 'utf8');
  const SZPACHLA = zrodlo(join('lib', 'theme.ts'));

  // ── W2-0 ⛔ STRAŻNIK STRAŻNIKA — wycinki NIE SĄ PUSTE ───────────────
  // ⚠️ Pułapka zmierzona w tym projekcie: pusty wycinek przechodzi każdy
  // predykat postaci „nie znajduję zakazanego". Bez tej asercji cała
  // grupa 16 świeciłaby na zielono także wtedy, gdyby pliki zniknęły.
  check('⛔ (W2-0) STRAŻNIK STRAŻNIKA — źródła umowy, korzenia i app.json NIE SĄ puste',
    UMOWA.length > 500 && LAYOUT.length > 500 && APP_JSON.length > 200 && SZPACHLA.length > 50,
    `theme ${UMOWA.length} · _layout ${LAYOUT.length} · app.json ${APP_JSON.length} · lib/theme ${SZPACHLA.length}`);
  check('⛔ (W2-0) STRAŻNIK STRAŻNIKA — każdy z ośmiu plików ekranu jest na dysku i niepusty',
    PLIKI_EKRANOW.every((n) => existsSync(join(KAT_EKRANOW, n)) && zrodloEkranu(n).length > 500),
    PLIKI_EKRANOW.map((n) => `${n}:${existsSync(join(KAT_EKRANOW, n)) ? zrodloEkranu(n).length : 'BRAK'}`).join(' · '));

  // ── W2-1 ⛔ ANI JEDEN PLIK EKRANU NIE PODAJE NAZWY KROJU ────────────
  // ⛔ Predykat celuje w DEKLARACJĘ (`fontFamily: '…'`), a nie w napis
  // „Inter" gdziekolwiek w pliku: komentarz historyczny wolno mieć, wpis
  // do arkusza stylów — nie. To jest ten sam kształt co reguła §2.4:
  // umowa o kroju stoi w jednym miejscu i tym miejscem nie jest ekran.
  const deklaracjeKroju = (src: string) => [...src.matchAll(/fontFamily\s*:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  {
    const winni = PLIKI_EKRANOW
      .map((n) => [n, deklaracjeKroju(zrodloEkranu(n))] as const)
      .filter(([, d]) => d.length > 0);
    check('⛔⛔ (W2-1, §2.5) ŻADEN plik ekranu nie podaje nazwy kroju wprost',
      winni.length === 0,
      winni.map(([n, d]) => `${n}: ${d.join(', ')}`).join(' · ')
      + ' — krój należy do `constants/theme.ts`, nie do ekranu');
  }

  // ── W2-2 NAZWA KROJU PADA W PRODUKCIE W JEDNYM MIEJSCU ─────────────
  // ⚠️ `lib/theme.ts` re-eksportuje `KROJE`, więc SŁOWO `KROJE` tam stoi —
  // ⛔ ale ani jedna WARTOŚĆ (napis z nazwą rodziny) nie ma prawa tam paść.
  const NAZWY_RODZIN = [...UMOWA.matchAll(/^\s*(?:wyswietlaniowy|tekstRegular|tekstMedium|tekstSemiBold)\s*:\s*'([^']+)'/gm)].map((m) => m[1]);
  check('⭐ (W2-2) `KROJE` w umowie deklaruje CZTERY rodziny, każdą raz',
    NAZWY_RODZIN.length === 4 && new Set(NAZWY_RODZIN).size === 4,
    `znalazłem: [${NAZWY_RODZIN.join(', ')}]`);
  check('⛔ (W2-2, §2.4) `lib/theme.ts` tylko RE-EKSPORTUJE — nie ma w nim ani jednej nazwy rodziny',
    NAZWY_RODZIN.every((n) => !SZPACHLA.includes(`'${n}'`)),
    `w lib/theme.ts padły: ${NAZWY_RODZIN.filter((n) => SZPACHLA.includes(`'${n}'`)).join(', ')}`);

  // ── W2-3 KORZEŃ WCZYTUJE DOKŁADNIE TE RODZINY, KTÓRE DEKLARUJE UMOWA ─
  // ⛔ RÓWNOŚĆ ZBIORÓW (O73), nie „co najmniej": rodzina wczytana, a nieużywana,
  // jest martwym megabajtem w paczce; rodzina używana, a niewczytana, jest
  // ekranem w kroju systemowym.
  const kluczeUseFonts = [...LAYOUT.matchAll(/\[KROJE\.([A-Za-z]+)\]\s*:/g)].map((m) => m[1]);
  const kluczeUmowy = [...UMOWA.matchAll(/^\s*(wyswietlaniowy|tekstRegular|tekstMedium|tekstSemiBold)\s*:/gm)].map((m) => m[1]);
  check('⛔⛔ (W2-3, §2.1) `useFonts` wczytuje DOKŁADNIE rodziny z `KROJE` — równość zbiorów',
    kluczeUseFonts.length === 4
    && [...new Set(kluczeUseFonts)].sort().join('|') === [...new Set(kluczeUmowy)].sort().join('|'),
    `_layout: [${kluczeUseFonts.join(', ')}] · umowa: [${[...new Set(kluczeUmowy)].join(', ')}]`);
  check('⛔ (W2-3) ani jedna rodzina NIE jest wpisana w `_layout.tsx` napisem — wszystkie przez `KROJE`',
    deklaracjeKroju(LAYOUT).length === 0 && NAZWY_RODZIN.every((n) => !LAYOUT.includes(`'${n}'`)),
    `napisy w _layout: ${NAZWY_RODZIN.filter((n) => LAYOUT.includes(`'${n}'`)).join(', ') || deklaracjeKroju(LAYOUT).join(', ')}`);

  // ── W2-4 `typography` NIE ZNA NAZWY SPOZA `KROJE` ──────────────────
  const rodzinyTypografii = [...UMOWA.matchAll(/fontFamily\s*:\s*KROJE\.([A-Za-z]+)/g)].map((m) => m[1]);
  check('⭐ (W2-4) każdy z pięciu stopni `typography` bierze rodzinę z `KROJE`, nie z napisu',
    rodzinyTypografii.length === 5 && deklaracjeKroju(UMOWA).length === 0,
    `stopni z KROJE: ${rodzinyTypografii.length}, napisów wprost: ${deklaracjeKroju(UMOWA).length}`);

  // ── W2-5 ⛔ KRÓJ WYŚWIETLANIOWY NIE WCHODZI DO TEKSTU CIĄGŁEGO ──────
  // ⛔ REGUŁA, KTÓREJ TO PILNUJE (§2.3 polecenia W2): „Bebas Neue jest krojem
  // wersalikowym i wyświetlaniowym — nie wchodzi do tekstu ciągłego ani do
  // zdań dla zawodnika. Nagłówki, etykiety, liczby."
  // ⭐ ZAKRES RZECZYWISTY (O101): asercja pilnuje TRZECH stopni tekstowych
  // (`body`, `bodyMedium`, `bodySemiBold`) i ⛔ NICZEGO WIĘCEJ. Nie zabrania
  // kroju wyświetlaniowego w `display` ani w `displayExtraBold`, bo reguła
  // tego nie zabrania — tam jest jego miejsce.
  {
    const stopnieTekstowe = ['body', 'bodyMedium', 'bodySemiBold'];
    const wycinek = (nazwa: string) => {
      const i = UMOWA.indexOf(`\n  ${nazwa}: {`);
      if (i < 0) return '';
      const k = UMOWA.indexOf('},', i);
      return k < 0 ? '' : UMOWA.slice(i, k);
    };
    check('⛔ (W2-5) STRAŻNIK STRAŻNIKA — wycinek każdego stopnia tekstowego NIE JEST pusty',
      stopnieTekstowe.every((n) => wycinek(n).length > 20),
      stopnieTekstowe.map((n) => `${n}:${wycinek(n).length}`).join(' · '));
    const zlamane = stopnieTekstowe.filter((n) => /KROJE\.wyswietlaniowy/.test(wycinek(n)));
    check('⛔⛔ (W2-5, §2.3) krój WYŚWIETLANIOWY nie stoi w ŻADNYM z trzech stopni tekstu ciągłego',
      zlamane.length === 0,
      `złamane: ${zlamane.join(', ')} — krój wersalikowy w zdaniu dla zawodnika`);
    check('⭐ (W2-5) …a stopnie nagłówkowe biorą go NAPRAWDĘ (inaczej asercja wyżej jest o niczym)',
      /display:\s*\{[^}]*KROJE\.wyswietlaniowy/.test(UMOWA)
      && /displayExtraBold:\s*\{[^}]*KROJE\.wyswietlaniowy/.test(UMOWA),
      'nagłówki nie używają kroju wyświetlaniowego — wtedy zakaz wyżej niczego nie kosztuje');
  }

  // ── W2-6 ⛔ JAWNY STAN „KROJE JESZCZE SIĘ NIE WCZYTAŁY" ─────────────
  // ⛔ REGUŁA (§2.1): „nie wolno pokazać ekranu w innym kroju, a potem
  // podmienić go w locie". Predykat pyta o DWIE rzeczy naraz, bo pierwsza
  // bez drugiej nic nie znaczy: (a) stan jest nazwany, (b) w tym stanie
  // funkcja korzenia KOŃCZY SIĘ zwrotem bez produktu.
  {
    const i = LAYOUT.indexOf("stanKrojow === 'wczytuje'");
    const wycinek = i < 0 ? '' : LAYOUT.slice(i, i + 200);
    check('⛔ (W2-6) STRAŻNIK STRAŻNIKA — wycinek gałęzi „wczytuje" NIE JEST pusty',
      wycinek.length > 30, `długość wycinka: ${wycinek.length}`);
    check('⛔⛔ (W2-6, §2.1) korzeń MA jawny stan „kroje się wczytują" i w nim NIE RYSUJE produktu',
      /stanKrojow === 'wczytuje'\)\s*\{\s*return null;/.test(LAYOUT),
      'gałąź „wczytuje" albo nie istnieje, albo nie kończy się `return null` — '
      + 'wtedy ekran pada w kroju systemowym i podmienia się w locie');
    check('⭐ (W2-6) trzy stany kroju są NAZWANE, nie zaszyte w warunku',
      /'wczytuje'\s*\|\s*'gotowe'\s*\|\s*'nie_udalo_sie'/.test(LAYOUT)
      && LAYOUT.includes("'nie_udalo_sie'"),
      'brak nazwanego typu StanKrojow — „nie udało się" musi być osobnym stanem, nie „gotowe"');
  }

  // ── W2-7 TŁO EKRANU STARTOWEGO I IKONY = TŁO APLIKACJI ─────────────
  // ⛔ REGUŁA (§4.3): „Kolor tła ekranu startowego = kolor tła aplikacji,
  // z jednego miejsca. Dwie liczby w dwóch plikach rozjadą się przy pierwszej
  // zmianie motywu." ⚠️ `app.json` to JSON — nie zaimportuje `constants/theme.ts`.
  // Dlatego „jedno miejsce" jest tu WYMUSZONE ASERCJĄ, a nie importem: liczba
  // stoi w dwóch plikach, ale nie ma prawa być inna.
  {
    const tlaAppJson = [...APP_JSON.matchAll(/"backgroundColor"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
    check('⛔ (W2-7) STRAŻNIK STRAŻNIKA — `app.json` ma DOKŁADNIE trzy tła (splash · adaptiveIcon · wtyczka)',
      tlaAppJson.length === 3, `znalazłem ${tlaAppJson.length}: [${tlaAppJson.join(', ')}]`);
    check('⛔⛔ (W2-7, §4.3) KAŻDE z trzech teł w `app.json` = `colors.background` co do znaku',
      tlaAppJson.length === 3 && tlaAppJson.every((t) => t.toLowerCase() === colors.background.toLowerCase()),
      `app.json: [${tlaAppJson.join(', ')}] · colors.background: ${colors.background}`);
    check('⭐ (W2-7) motyw appki zadeklarowany w `app.json` jest JASNY — tak jak paleta',
      /"userInterfaceStyle"\s*:\s*"light"/.test(APP_JSON),
      'appka jest jasna od pasa W1; ciemna deklaracja daje przeskok przy starcie');
    check('⭐ (W2-7) ekran startowy i ikona biorą logo Z PAMIĘCI PROJEKTU, nie z nowego rysunku',
      /"image"\s*:\s*"\.\/assets\/splash\.png"/.test(APP_JSON)
      && /"foregroundImage"\s*:\s*"\.\/assets\/adaptive-icon\.png"/.test(APP_JSON)
      && existsSync(join(root, 'assets', 'splash.png'))
      && existsSync(join(root, 'Logo Gamechange.png')),
      'brak wskazania na logo albo brak pliku logo w repozytorium');
  }

  // ── W2-8 i W2-9 ⛔⛔ CO NAPRAWDĘ STOI W PLIKU KROJU ─────────────────
  // ⚠️ Poniższy czytnik jest CELOWO minimalny: tablice `head`, `hhea`, `maxp`,
  // `cmap` (format 4 i 12), `loca` i `glyf`. Tyle wystarcza, żeby odpowiedzieć
  // na dwa pytania, których nie wolno przyjąć na wiarę:
  //   (1) czy krój MA glif dla polskiego znaku i czy ten glif ma kontury,
  //   (2) jaka jest jego domyślna interlinia.
  // ⛔ Bez (1) nagłówek „ŚRODA" traci „Ś" i nikt tego nie zobaczy, dopóki
  // ktoś nie uruchomi aplikacji — a to jest ten sam mechanizm, przez który
  // ten projekt stracił już raz funkcję dodania meczu przy zielonej suicie.
  type Krój = { glifow: number; interlinia: number; kontury: (z: string) => number | null };
  const czytajKrój = (sciezka: string): Krój => {
    const b = readFileSync(sciezka);
    const tab: Record<string, number> = {};
    const ile = b.readUInt16BE(4);
    for (let i = 0; i < ile; i++) {
      const o = 12 + i * 16;
      tab[b.toString('ascii', o, o + 4)] = b.readUInt32BE(o + 8);
    }
    const upem = b.readUInt16BE(tab.head + 18);
    const dlugaLoca = b.readInt16BE(tab.head + 50) !== 0;
    const glifow = b.readUInt16BE(tab.maxp + 4);
    const interlinia = (b.readInt16BE(tab.hhea + 4) - b.readInt16BE(tab.hhea + 6)
      + b.readInt16BE(tab.hhea + 8)) / upem;

    // cmap: bierzemy najlepszą podtablicę (3,10/format 12 › 3,1/format 4)
    const c = tab.cmap;
    let naj = { off: 0, fmt: 0, pkt: -1 };
    for (let i = 0; i < b.readUInt16BE(c + 2); i++) {
      const p = c + 4 + i * 8;
      const plat = b.readUInt16BE(p); const enc = b.readUInt16BE(p + 2);
      const off = c + b.readUInt32BE(p + 4); const fmt = b.readUInt16BE(off);
      const pkt = (plat === 3 && enc === 10 && fmt === 12) ? 3
        : (plat === 3 && enc === 1 && fmt === 4) ? 2 : (fmt === 4 || fmt === 12) ? 1 : 0;
      if (pkt > naj.pkt) naj = { off, fmt, pkt };
    }
    const mapa = new Map<number, number>();
    if (naj.fmt === 4) {
      const o = naj.off; const segX2 = b.readUInt16BE(o + 6);
      const koniecO = o + 14; const startO = koniecO + segX2 + 2;
      const deltaO = startO + segX2; const zakresO = deltaO + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const kon = b.readUInt16BE(koniecO + s * 2); const sta = b.readUInt16BE(startO + s * 2);
        const del = b.readInt16BE(deltaO + s * 2); const zak = b.readUInt16BE(zakresO + s * 2);
        if (sta === 0xffff) continue;
        for (let z = sta; z <= kon && z !== 0x10000; z++) {
          let g: number;
          if (zak === 0) g = (z + del) & 0xffff;
          else {
            const gi = zakresO + s * 2 + zak + (z - sta) * 2;
            if (gi + 1 >= b.length) continue;
            g = b.readUInt16BE(gi);
            if (g !== 0) g = (g + del) & 0xffff;
          }
          if (g !== 0) mapa.set(z, g);
        }
      }
    } else if (naj.fmt === 12) {
      const o = naj.off;
      for (let i = 0; i < b.readUInt32BE(o + 12); i++) {
        const p = o + 16 + i * 12;
        const s = b.readUInt32BE(p); const e = b.readUInt32BE(p + 4); const gs = b.readUInt32BE(p + 8);
        for (let z = s; z <= e; z++) mapa.set(z, gs + (z - s));
      }
    }
    const loca = (g: number) => dlugaLoca
      ? b.readUInt32BE(tab.loca + g * 4) : b.readUInt16BE(tab.loca + g * 2) * 2;
    const konturyGlifu = (g: number, gl = 0): number => {
      if (g >= glifow || gl > 5) return 0;
      const a = loca(g); const z = loca(g + 1);
      if (z <= a) return 0;
      const o = tab.glyf + a; const nc = b.readInt16BE(o);
      if (nc >= 0) return nc;
      let p = o + 10; let suma = 0; let flagi = 0;
      do {
        flagi = b.readUInt16BE(p);
        suma += konturyGlifu(b.readUInt16BE(p + 2), gl + 1);
        p += 4;
        p += (flagi & 1) ? 4 : 2;
        if (flagi & 8) p += 2; else if (flagi & 0x40) p += 4; else if (flagi & 0x80) p += 8;
      } while (flagi & 0x20);
      return suma;
    };
    return {
      glifow,
      interlinia,
      kontury: (z: string) => {
        const g = mapa.get(z.codePointAt(0) as number);
        return g === undefined ? null : konturyGlifu(g);
      },
    };
  };

  const KROJE_NA_DYSKU = [
    ['wyświetlaniowy · Bebas Neue 400', '@expo-google-fonts/bebas-neue/400Regular/BebasNeue_400Regular.ttf', INTERLINIA_KROJU.wyswietlaniowy],
    ['tekst · DM Sans 400', '@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf', INTERLINIA_KROJU.tekst],
    ['tekst · DM Sans 500', '@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf', INTERLINIA_KROJU.tekst],
    ['tekst · DM Sans 600', '@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf', INTERLINIA_KROJU.tekst],
  ] as const;
  const POLSKIE_WIELKIE = [...'ĄĆĘŁŃÓŚŹŻ'];
  const POLSKIE_MALE = [...'ąćęłńóśźż'];

  for (const [nazwa, wzgledna, zadeklarowana] of KROJE_NA_DYSKU) {
    const sciezka = join(root, 'node_modules', ...wzgledna.split('/'));
    // ⛔ Brak pliku to NIE jest „pominięte": to jest krój, którego appka nie ma
    // czym narysować. Czerwień z nazwą paczki jest tu jedyną uczciwą odpowiedzią.
    if (!existsSync(sciezka)) {
      check(`⛔⛔ (W2-8) plik kroju „${nazwa}" leży w node_modules`, false,
        `brak ${wzgledna} — paczka nie jest zainstalowana, appka nie ma czym rysować`);
      continue;
    }
    const k = czytajKrój(sciezka);
    const brakujace = [...POLSKIE_WIELKIE, ...POLSKIE_MALE]
      .filter((z) => { const kon = k.kontury(z); return kon === null || kon <= 0; });
    check(`⛔⛔ (W2-8, §2.2) „${nazwa}" ma WŁASNY, NIEPUSTY glif dla wszystkich 18 polskich znaków`,
      brakujace.length === 0,
      `bez glifu albo z pustym glifem: ${brakujace.join(' ')} (glifów w kroju: ${k.glifow}) — `
      + 'nagłówek „ŚRODA" bez „Ś" jest gorszy niż nagłówek w Archivo');
    check(`⭐ (W2-9) „${nazwa}": interlinia z pliku zgadza się z `
      + `\`INTERLINIA_KROJU\` (${zadeklarowana})`,
      Math.abs(k.interlinia - zadeklarowana) < 0.002,
      `w pliku ${k.interlinia.toFixed(4)}, zadeklarowano ${zadeklarowana} — `
      + 'deklaracja, której nikt nie sprawdza, starzeje się jak komentarz (O84)');
  }

  // ⛔ ZNALEZISKO PASA W2, ZAPISANE JAKO ASERCJA, A NIE JAKO PRZYPIS.
  // Bebas Neue NIE MA znaku `→` (U+2192), a ten znak pada w produkcie
  // (m.in. „Nowa porcja w Twoim Bloku →"). Dopóki strzałka stoi wyłącznie
  // w tekście ciągłym, rysuje ją DM Sans i wszystko jest w porządku.
  // ⭐ Ta asercja pilnuje, że tak zostanie: gdyby ktoś wstawił strzałkę
  // do stopnia nagłówkowego, zobaczyłby kwadrat zamiast strzałki.
  {
    const sciezkaBebas = join(root, 'node_modules', '@expo-google-fonts', 'bebas-neue',
      '400Regular', 'BebasNeue_400Regular.ttf');
    const sciezkaDm = join(root, 'node_modules', '@expo-google-fonts', 'dm-sans',
      '400Regular', 'DMSans_400Regular.ttf');
    if (existsSync(sciezkaBebas) && existsSync(sciezkaDm)) {
      const bebas = czytajKrój(sciezkaBebas);
      const dm = czytajKrój(sciezkaDm);
      check('⚠️ (W2-8) ZNALEZISKO W2: krój wyświetlaniowy NIE MA znaku „→" — i to jest udokumentowane, nie ukryte',
        bebas.kontury('→') === null,
        'Bebas Neue dostał glif „→" — wtedy ten wpis w nocie pasa W2 jest nieaktualny');
      check('⭐ (W2-8) …ale krój tekstu ciągłego MA go, więc strzałka w zdaniu rysuje się poprawnie',
        (dm.kontury('→') ?? 0) > 0,
        'DM Sans nie ma „→" — strzałka w tekście zawodnika narysuje się jako kwadrat');
    }
  }

  // ── W2-10 ⛔ ŻADNA ZAPADKA PIĘCIU EKRANÓW NIE STOI PONAD ZGIĘCIEM ───
  // ⛔ REGUŁA, KTÓREJ TO PILNUJE (§3.2 polecenia W2): „Żaden ekran nie może
  // przekroczyć linii zgięcia. Jeżeli przekroczy — ZATRZYMAJ SIĘ I NAPISZ,
  // nie podnoś zapadki ponad zgięcie."
  //
  // ⭐⭐ ZAKRES RZECZYWISTY, NIE SKRÓT (O101). Reguła mówi o PIĘCIU EKRANACH
  // ZAKŁADEK i o niczym więcej. ⛔ Predykat „każda liczba `wysokosc*Dp` w tym
  // pliku mieści się nad zgięciem" byłby SZERSZY NIŻ REGUŁA i zapaliłby się
  // na `ZAPADKA_TYDZIEN` (1 466 dp) — a to jest zapadka ZAKŁADKI Kalendarza,
  // o której ten sam plik 60 wierszy niżej asercją stwierdza, że nad zgięciem
  // się NIE MIEŚCI, i tak ma być. Strażnik szerszy niż jego reguła jest
  // defektem strażnika, nie odkryciem — dlatego wycinek jest zakotwiczony
  // na `ZAPADKA_DZIS` … `ZAPADKI_POZOSTALE`.
  {
    const ja = readFileSync(fileURLToPath(import.meta.url), 'utf8');
    const od = ja.indexOf(`const ZAPADKA${'_DZIS'} = {`);
    const doo = ja.indexOf('\n];', ja.indexOf(`const ZAPADKI${'_POZOSTALE'} = [`));
    const wycinek = (od >= 0 && doo > od) ? ja.slice(od, doo) : '';
    check('⛔ (W2-10) STRAŻNIK STRAŻNIKA — wycinek z zapadkami pięciu ekranów NIE JEST pusty',
      wycinek.length > 500, `długość wycinka: ${wycinek.length} — kotwica przestała pasować`);
    const zapadki = [...wycinek.matchAll(new RegExp(`${POLE_ZAPADKI}:\\s*(\\d+)`, 'g'))].map((m) => Number(m[1]));
    check('⛔ (W2-10) STRAŻNIK STRAŻNIKA — w wycinku stoi DOKŁADNIE PIĘĆ zapadek wysokości',
      zapadki.length === 5, `znalazłem ${zapadki.length}: [${zapadki.join(', ')}]`);
    check('⛔⛔ (W2-10, §3.2) ANI JEDNA zapadka PIĘCIU EKRANÓW nie została podniesiona ponad zgięcie',
      zapadki.length === 5 && zapadki.every((z) => z <= WIDOCZNE_NAD_ZGIECIEM_DP),
      `ponad ${WIDOCZNE_NAD_ZGIECIEM_DP} dp: [${zapadki.filter((z) => z > WIDOCZNE_NAD_ZGIECIEM_DP).join(', ')}]`);
  }

  // ── W2-11 ⛔⛔ ZAPADKA NA ROZJAZD MODELU Z KROJEM ───────────────────
  // ⭐⭐ TO JEST NAJWAŻNIEJSZE ZNALEZISKO PASA W2 I STOI TU JAKO ZAPADKA,
  // A NIE JAKO PRZYPIS.
  //
  // `lib/wysokoscEkranu.ts` szacuje wysokość wiersza tekstu STAŁĄ, gdy styl
  // nie podaje `lineHeight`. Ta stała opisuje krój — a krój właśnie się zmienił:
  //     Archivo 1,088 · Inter 1,210   →   Bebas 1,200 · DM Sans 1,302
  // ⛔ Dla starej pary stała 1,25 była GÓRNYM szacunkiem (błąd w górę, czyli
  // w stronę bezpieczną przy linii zgięcia). Dla nowej pary jest NIŻSZA niż
  // interlinia kroju tekstu — czyli po raz pierwszy myli się OPTYMISTYCZNIE.
  //
  // ⛔ PAS W2 TEJ STAŁEJ NIE RUSZYŁ: `lib/wysokoscEkranu.ts` nie jest jego
  // plikiem, a jej zmiana pociąga zapadkę w `lib/drogaDodania.selftest.ts`
  // (pas K1). Skutek policzony co do dp i oddany jako kontrakt w nocie
  // `claude/PRZEKAZANIE_PAS_W2_21_08_2026.md`.
  //
  // ⭐ CZEGO PILNUJE TA ZAPADKA: żeby rozjazd nie urósł ani nie zniknął PO CICHU.
  // Zmiana stałej w silniku ALBO zmiana kroju zapala ją na czerwono i każe
  // przepisać obie liczby z datą i powodem — dokładnie tak jak każdą inną
  // zapadkę w tym pliku. ⛔ Zapadka nie twierdzi, że stan jest dobry.
  // Twierdzi, że jest ZNANY.
  {
    // ⭐ SONDA — odzyskuje stałą interlinii z SILNIKA, nie z jego źródła.
    // Jeden `Text` bez `lineHeight`, o rozmiarze, przy którym jedno „x" na pewno
    // mieści się w jednym wierszu: wysokość podzielona przez rozmiar pisma JEST
    // tą stałą. ⛔ Czytanie liczby z tekstu pliku dałoby to samo tylko dopóty,
    // dopóki nikt nie policzy jej ze zmiennej.
    const ROZMIAR_SONDY = 100;
    const SONDA = `
import { View, Text, StyleSheet } from 'react-native';
export default function Sonda() {
  return (<View style={styles.k}><Text style={styles.t}>x</Text></View>);
}
const styles = StyleSheet.create({ k: {}, t: { fontSize: ${ROZMIAR_SONDY} } });
`;
    const sonda = zmierzEkranZTekstu('sonda-interlinii.tsx', SONDA, KAT_EKRANOW);
    const interliniaModelu = Math.round((sonda.wysokoscRazemDp / ROZMIAR_SONDY) * 1000) / 1000;

    const ZAPADKA_ROZJAZDU = {
      /** Stała, którą liczy `lib/wysokoscEkranu.ts`, gdy styl nie podaje `lineHeight`. */
      interliniaModelu: 1.25,
      /** Największa interlinia WCZYTANEGO kroju — DM Sans, sprawdzona z pliku `.ttf` (W2-9). */
      interliniaKroju: 1.302,
      ustawiona: '21.08.2026',
      powod: 'pas W2 — kroje zmienione na Bebas Neue + DM Sans; stała modelu (1,25) '
        + 'przestała być górnym szacunkiem, bo DM Sans ma interlinię 1,302. '
        + 'Pas W2 nie ruszył `lib/wysokoscEkranu.ts` (nie jego plik) i oddał to '
        + 'jako kontrakt: przy stałej 1,31 pięć ekranów mierzy się na 803,7 · 638,0 · '
        + '763,1 · 798,0 · 782,1 dp, czyli WSZYSTKIE nadal nad zgięciem, ale „Dziś" '
        + 'z zapasem 4,3 dp zamiast 17,5',
    };

    check('⛔ (W2-11) STRAŻNIK STRAŻNIKA — sonda interlinii mierzy JEDEN wiersz, nie dwa',
      sonda.pozycje.length === 1 && sonda.wysokoscRazemDp > ROZMIAR_SONDY,
      `pozycji ${sonda.pozycje.length}, dp ${sonda.wysokoscRazemDp} — sonda nie mierzy tego, co miała`);
    check('⛔⛔ (W2-11) ZAPADKA: stała interlinii w MODELE nie zmieniła się po cichu',
      interliniaModelu === ZAPADKA_ROZJAZDU.interliniaModelu,
      `sonda oddała ${interliniaModelu}, zapadka ${ZAPADKA_ROZJAZDU.interliniaModelu} `
      + `(${ZAPADKA_ROZJAZDU.ustawiona}). Jeżeli to Ty ją przestawiłeś — przepisz obie liczby `
      + 'w tej zapadce z datą i powodem, i przelicz zapadki pięciu ekranów.');
    check('⛔⛔ (W2-11) ZAPADKA: interlinia KROJU tekstu nie zmieniła się po cichu',
      INTERLINIA_KROJU.tekst === ZAPADKA_ROZJAZDU.interliniaKroju,
      `umowa mówi ${INTERLINIA_KROJU.tekst}, zapadka ${ZAPADKA_ROZJAZDU.interliniaKroju}`);
    check('⚠️ (W2-11) ROZJAZD JEST ZNANY I NAZWANY — model liczy NIŻSZĄ interlinię niż krój tekstu',
      ZAPADKA_ROZJAZDU.interliniaModelu < ZAPADKA_ROZJAZDU.interliniaKroju,
      'rozjazd zniknął — to dobra wiadomość, ale zapadkę trzeba wtedy zdjąć z datą i powodem, '
      + 'a nie zostawić zieloną o nieistniejącym stanie');
    check('⭐ (W2-11) zapadka rozjazdu ma datę i powód — bez nich jest liczbą bez właściciela',
      /^\d{2}\.\d{2}\.\d{4}$/.test(ZAPADKA_ROZJAZDU.ustawiona) && ZAPADKA_ROZJAZDU.powod.length > 20,
      `${ZAPADKA_ROZJAZDU.ustawiona} / ${ZAPADKA_ROZJAZDU.powod.length} znaków powodu`);

    console.log(`\n   ⚠️ ROZJAZD MODELU Z KROJEM (kontrakt W2): model liczy ${interliniaModelu}, `
      + `krój tekstu ma ${INTERLINIA_KROJU.tekst}, krój nagłówków ${INTERLINIA_KROJU.wyswietlaniowy}.`);
    console.log('   ⛔ Skutek policzony: pięć ekranów zakładek przy stałej 1,31 → '
      + '803,7 · 638,0 · 763,1 · 798,0 · 782,1 dp. Wszystkie nadal nad zgięciem.');
    console.log('   ⭐ Pełny rachunek i jednolinijkowy kontrakt: claude/PRZEKAZANIE_PAS_W2_21_08_2026.md');
  }

  // ═══════════════════════════════════════════════════════════════════
  // 16.1 ⭐⭐ BATERIA MUTACJI PASA W2 — na PRAWDZIWYCH plikach, w pamięci
  // ═══════════════════════════════════════════════════════════════════
  // ⭐ WZORZEC: mutujemy TEKST wczytany do pamięci, nie plik na dysku.
  // Nie ma stanu na dysku, więc nie ma czego przywracać — przerwanie
  // procesu nie zostawia zatrutego pliku produktu.
  // ⭐ KOLEJNOŚĆ NIENEGOCJOWALNA: asercja odwrotna NAJPIERW.
  type PrawdaW2 = { umowa: string; layout: string; appjson: string; ekran: string; zapadki: string };
  const PRAWDA_W2: PrawdaW2 = {
    umowa: UMOWA_Z_KOMENTARZAMI,
    layout: readFileSync(join(root, 'app', '_layout.tsx'), 'utf8'),
    appjson: APP_JSON,
    ekran: readFileSync(join(KAT_EKRANOW, 'dzis.tsx'), 'utf8'),
    zapadki: readFileSync(fileURLToPath(import.meta.url), 'utf8'),
  };

  const BATERIA_W2: { nazwa: string; sprawdz: (s: PrawdaW2) => boolean }[] = [
    {
      nazwa: 'W2-1 ⛔ żaden plik ekranu nie podaje nazwy kroju wprost',
      sprawdz: (s) => deklaracjeKroju(bezKomentarzy(s.ekran)).length === 0,
    },
    {
      nazwa: 'W2-3 ⛔ `useFonts` bierze rodziny z `KROJE`, nie z napisu',
      sprawdz: (s) => {
        const l = bezKomentarzy(s.layout);
        return deklaracjeKroju(l).length === 0
          && [...l.matchAll(/\[KROJE\.([A-Za-z]+)\]\s*:/g)].length === 4;
      },
    },
    {
      nazwa: 'W2-5 ⛔ krój wyświetlaniowy nie wchodzi do tekstu ciągłego',
      sprawdz: (s) => {
        const u = bezKomentarzy(s.umowa);
        return ['body', 'bodyMedium', 'bodySemiBold'].every((n) => {
          const i = u.indexOf(`\n  ${n}: {`);
          if (i < 0) return false;
          const k = u.indexOf('},', i);
          return k > i && !/KROJE\.wyswietlaniowy/.test(u.slice(i, k));
        });
      },
    },
    {
      nazwa: 'W2-6 ⛔ jest jawny stan „wczytuje" i w nim produkt NIE jest rysowany',
      sprawdz: (s) => /stanKrojow === 'wczytuje'\)\s*\{\s*return null;/.test(bezKomentarzy(s.layout)),
    },
    {
      nazwa: 'W2-7 ⛔ tło ekranu startowego i ikony = tło aplikacji',
      sprawdz: (s) => {
        const t = [...s.appjson.matchAll(/"backgroundColor"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
        return t.length === 3 && t.every((x) => x.toLowerCase() === colors.background.toLowerCase());
      },
    },
    {
      nazwa: 'W2-9 ⛔ zadeklarowana interlinia zgadza się z plikiem kroju',
      sprawdz: (s) => {
        const m = /tekst:\s*([0-9.]+)/.exec(bezKomentarzy(s.umowa));
        const sciezka = join(root, 'node_modules', '@expo-google-fonts', 'dm-sans',
          '400Regular', 'DMSans_400Regular.ttf');
        if (!m || !existsSync(sciezka)) return false;
        return Math.abs(czytajKrój(sciezka).interlinia - Number(m[1])) < 0.002;
      },
    },
    {
      nazwa: 'W2-10 ⛔ żadna zapadka pięciu ekranów nie stoi ponad zgięciem',
      sprawdz: (s) => {
        const od = s.zapadki.indexOf(`const ZAPADKA${'_DZIS'} = {`);
        const doo = s.zapadki.indexOf('\n];', s.zapadki.indexOf(`const ZAPADKI${'_POZOSTALE'} = [`));
        if (od < 0 || doo <= od) return false;
        const z = [...s.zapadki.slice(od, doo).matchAll(new RegExp(`${POLE_ZAPADKI}:\\s*(\\d+)`, 'g'))]
          .map((m) => Number(m[1]));
        return z.length === 5 && z.every((w) => w <= WIDOCZNE_NAD_ZGIECIEM_DP);
      },
    },
  ];

  // ── 16.1a ⭐⭐ ASERCJA ODWROTNA — NAJPIERW ──────────────────────────
  // ⛔ Bez niej „każda mutacja coś zapala" jest prawdą także dla baterii,
  // która zapala się ZAWSZE. Na prawdziwych plikach ma być ZERO zapaleń.
  {
    const zapalone = BATERIA_W2.filter((p) => !p.sprawdz(PRAWDA_W2)).map((p) => p.nazwa);
    check('⭐⭐ (W2-B0) ASERCJA ODWROTNA: na PRAWDZIWYCH plikach bateria W2 ma ZERO zapaleń',
      zapalone.length === 0,
      `zapalone bez żadnej mutacji: ${zapalone.join(' · ')}`);
  }

  const MUTACJE_W2: { nazwa: string; coPsuje: string; zastosuj: (s: PrawdaW2) => PrawdaW2 }[] = [
    {
      nazwa: 'nazwa kroju wraca do pliku ekranu',
      coPsuje: 'umowa o kroju przestaje stać w jednym miejscu — ekran dyktuje własny krój',
      zastosuj: (s) => ({ ...s, ekran: s.ekran.replace('...typography.display, fontSize: 26', "fontFamily: 'Inter-Regular', fontSize: 26") }),
    },
    {
      nazwa: 'krój wczytywany BEZ obsługi stanu „jeszcze nie ma"',
      coPsuje: 'produkt rysuje się w kroju systemowym i podmienia go w locie (§2.1)',
      zastosuj: (s) => ({ ...s, layout: s.layout.replace(/if \(stanKrojow === 'wczytuje'\) \{\s*\n\s*return null;\s*\n\s*\}/, '') }),
    },
    {
      nazwa: 'tło ekranu startowego rozjeżdża się z tłem aplikacji',
      coPsuje: 'przy każdym uruchomieniu widać przeskok z ciemnego na jasne (§4.1, §4.3)',
      zastosuj: (s) => ({ ...s, appjson: s.appjson.replace('"backgroundColor": "#f5f2ec"', '"backgroundColor": "#0E0D0B"') }),
    },
    {
      nazwa: 'krój wyświetlaniowy wchodzi do tekstu ciągłego',
      coPsuje: 'zdanie dla zawodnika rysuje się wersalikami krojem wyświetlaniowym (§2.3)',
      zastosuj: (s) => ({ ...s, umowa: s.umowa.replace('fontFamily: KROJE.tekstRegular', 'fontFamily: KROJE.wyswietlaniowy') }),
    },
    {
      nazwa: 'zapadka wysokości podniesiona ponad linię zgięcia',
      coPsuje: 'zgoda na ekran, którego nie widać bez przewijania (§3.2)',
      zastosuj: (s) => ({ ...s, zapadki: s.zapadki.replace(`${POLE_ZAPADKI}: 791`, `${POLE_ZAPADKI}: 891`) }),
    },
    {
      nazwa: 'rodzina wpisana w `_layout.tsx` napisem zamiast z `KROJE`',
      coPsuje: 'przemianowanie rodziny w umowie przestaje docierać do tego, co appka wczytuje',
      zastosuj: (s) => ({ ...s, layout: s.layout.replace('[KROJE.tekstMedium]:', "'DMSans-Medium':") }),
    },
    {
      nazwa: 'zadeklarowana interlinia kroju rozjeżdża się z plikiem TTF',
      coPsuje: 'miara wysokości liczy z liczby, której w pliku kroju nie ma (O84)',
      zastosuj: (s) => ({ ...s, umowa: s.umowa.replace(/tekst:\s*1\.302/, 'tekst: 1.21') }),
    },
  ];

  console.log('\n16.1b ⭐⭐ BATERIA MUTACJI W2 — siedem mutacji na prawdziwych plikach');
  let niemeW2 = 0;
  for (const m of MUTACJE_W2) {
    const zm = m.zastosuj(PRAWDA_W2);
    const zmienil = (Object.keys(PRAWDA_W2) as (keyof PrawdaW2)[]).some((k) => zm[k] !== PRAWDA_W2[k]);
    const zapalone = BATERIA_W2.filter((p) => !p.sprawdz(zm)).map((p) => p.nazwa);
    console.log(`\n   ${m.nazwa}\n   co psuje: ${m.coPsuje}`);
    console.log(`   zapalone predykaty: ${zapalone.length} / ${BATERIA_W2.length}`);
    zapalone.forEach((n) => console.log(`      ↳ ${n}`));
    check(`⭐ (W2-B) mutacja „${m.nazwa}" NAPRAWDĘ zmienia źródło (inaczej bateria bada nic)`,
      zmienil, 'wzorzec podmiany nie trafił — mutacja jest atrapą');
    check(`⭐ (W2-B) mutacja „${m.nazwa}" ZAPALA strażnika imiennie`,
      zapalone.length > 0, 'mutacja przeszła niezauważona — strażnika na tę regułę NIE MA');
    if (zapalone.length === 0) niemeW2++;
  }
  check('⭐⭐ (W2-B) ANI JEDNA z siedmiu mutacji nie przeszła niezauważona',
    niemeW2 === 0, `nieme mutacje: ${niemeW2}`);

  // ── 16.1c ⛔ …I PLIKI NA DYSKU SĄ PO BATERII NIETKNIĘTE ─────────────
  check('⛔ (W2-B) po całej baterii pięć plików źródłowych jest CO DO ZNAKU takich samych',
    readFileSync(join(root, 'constants', 'theme.ts'), 'utf8') === PRAWDA_W2.umowa
    && readFileSync(join(root, 'app', '_layout.tsx'), 'utf8') === PRAWDA_W2.layout
    && readFileSync(join(root, 'app.json'), 'utf8') === PRAWDA_W2.appjson
    && readFileSync(join(KAT_EKRANOW, 'dzis.tsx'), 'utf8') === PRAWDA_W2.ekran
    && readFileSync(fileURLToPath(import.meta.url), 'utf8') === PRAWDA_W2.zapadki,
    'bateria zostawiła po sobie zmieniony plik — mutowaliśmy dysk, nie pamięć');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
