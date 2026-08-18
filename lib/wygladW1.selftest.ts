// ═══════════════════════════════════════════════════════════════════
// ⭐⭐ STRAŻNIK WYGLĄDU — PAS W1, 18.08.2026.
//
// PO CO ISTNIEJE. Pas W1 nanosił na produkt UMOWĘ O WYGLĄDZIE z makiety v3
// i sześć reguł z §7 polecenia („czego nie wolno"). Bateria mutacji tego
// pasa (§11) wykazała, że PIĘĆ Z SZEŚCIU tych reguł nie miało w repozytorium
// ANI JEDNEJ ASERCJI: dało się dołożyć czerwień do słupka obciążenia,
// pokolorować kropkę wg progu, zdjąć kaflowi jeden z dwóch nośników,
// wpisać na ekran „AU" i wsunąć tekst pod nieprzezroczysty przycisk „+" —
// i wszystkie 50 plików strażników przechodziło na zielono.
//
// ⛔ Mutacja, która nie zapala niczego, znaczy, że strażnika nie ma. Ten plik
// jest tym strażnikiem — dopisanym, a nie przemilczanym.
//
// ⭐ KAŻDA REGUŁA MA TU DWIE STRONY: asercję na prawdziwym kodzie ORAZ
// mutację, która ją zapala. Asercja bez mutacji nie wie, czy cokolwiek
// pilnuje; mutacja bez asercji nie wie, co złamała.
// ═══════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  colors, barwaObciazenia, wysokoscObciazenia, SKLADOWE_OBCIAZENIA,
  SUFIT_SLUPKA, wymiary,
} from '../constants/theme';
import {
  zmierzEkran, zmierzEkranZTekstu, przeciete, WIDOCZNE_NAD_ZGIECIEM_DP,
} from './wysokoscEkranu';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}${detail ? `: ${detail}` : ''}`); }
}

const libDir = dirname(fileURLToPath(import.meta.url));
const root = dirname(libDir);
const SCIEZKA_DZIS = join(root, 'app', '(tabs)', 'dzis.tsx');
const SCIEZKA_JA = join(root, 'app', '(tabs)', 'ja.tsx');
const SCIEZKA_TABS = join(root, 'app', '(tabs)', '_layout.tsx');
const SCIEZKA_TEMAT = join(root, 'constants', 'theme.ts');

const dzis = readFileSync(SCIEZKA_DZIS, 'utf8');
const ja = readFileSync(SCIEZKA_JA, 'utf8');
const tabs = readFileSync(SCIEZKA_TABS, 'utf8');
const temat = readFileSync(SCIEZKA_TEMAT, 'utf8');

const bezKomentarzy = (t: string): string => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');

console.log('wygladW1.selftest.ts — strażnik umowy o wyglądzie (§7 polecenia W1)\n');

// ═══════════════════════════════════════════════════════════════════
// BATERIA PREDYKATÓW — każdy z nich to JEDNA reguła z §7 polecenia.
// ⛔ Bateria dostaje ŹRÓDŁA jako argument, żeby dało się ją puścić także
// na kodzie ZMUTOWANYM. To jest cała różnica między asercją, która coś
// sprawdza, a asercją, która o czymś opowiada.
// ═══════════════════════════════════════════════════════════════════
type Zrodla = { dzis: string; ja: string; tabs: string; temat: string };
type Predykat = { nazwa: string; sprawdz: (z: Zrodla) => boolean };

/** Ile składowej czerwonej ma barwa słupka w całym zakresie skali. */
function skladowaCzerwonaSlupka(src: string): number[] {
  // ⛔ Czytamy Z TEKSTU MODUŁU, nie z zaimportowanej funkcji: mutacja
  // podmienia tekst, a import zostałby ten sam i bateria nic by nie zobaczyła.
  const m = /SKLADOWE_OBCIAZENIA = \{ r: (\d+), g: (\d+), b: (\d+) \}/.exec(src);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [-1, -1, -1];
}

const BATERIA: Predykat[] = [
  // ── §7.1 · CZERWIEŃ TYLKO PRZY OSTRZEŻENIU (Z2, P4) ──────────────
  {
    nazwa: '⛔ Z2 — słupek obciążenia NIE MA składowej czerwieni',
    sprawdz: (z) => {
      const [r, g, b] = skladowaCzerwonaSlupka(z.temat);
      // Zieleń: składowa czerwona MUSI być najniższa i wyraźnie niższa od zielonej.
      return r >= 0 && r < g && r < b && r <= 60;
    },
  },
  {
    nazwa: '⛔ Z2 — kolor marki (działanie, aktywna rzecz) NIE JEST czerwienią',
    sprawdz: (z) => /brand: '#2E6B5E'/.test(z.temat),
  },
  {
    nazwa: '⛔ Z2 — aktywna zakładka paska NIE bierze koloru marki jako jedynego nośnika',
    sprawdz: (z) => /tabBarActiveTintColor: colors\.textPrimary/.test(z.tabs)
      && /tabBarActiveBackgroundColor: colors\.surfaceElevated/.test(z.tabs),
  },
  // ── §7.2 · PRZY OBCIĄŻENIU ZERO OCENY, PROGU I KOLORU (D4) ───────
  {
    nazwa: '⛔ D4 — kropka przy „Obciążeniu" NIE JEST barwiona wg wartości',
    sprawdz: (z) => {
      const src = bezKomentarzy(z.dzis);
      const i = src.indexOf('function renderTrzyFakty');
      if (i < 0) return false;
      const ciało = src.slice(i, src.indexOf('function rejestrDnia', i));
      // ⛔ Kropka wolno rozróżniać WYŁĄCZNIE „jest liczba / nie ma liczby"
      // i „ostrzeżenie miękkie". ⛔ Nigdy wg progu ani wg wartości.
      return !/faktKropka[A-Za-z]*\s*\]?\s*,?\s*\}?\s*\)?\s*=>/.test(ciało)
        && !/barwaObciazenia\(/.test(ciało)
        && !/obciazenie\s*[><]=?\s*\d/.test(ciało);
    },
  },
  // ── §7.3 · SŁOWO „AU" NIE PADA NA EKRANIE ANI RAZU ───────────────
  {
    nazwa: '⛔ „AU" ani „jednostki umowne" nie padają na żadnym z dwóch ekranów',
    sprawdz: (z) => {
      const napisy = [...bezKomentarzy(z.dzis).matchAll(/'((?:[^'\\]|\\.)*)'/g)]
        .concat([...bezKomentarzy(z.ja).matchAll(/'((?:[^'\\]|\\.)*)'/g)])
        .map((m) => m[1]);
      return !napisy.some((n) => /\bAU\b/.test(n) || /jednostk\w* umown/i.test(n));
    },
  },
  // ── ⭐ K4 · KAŻDY KAFEL MA DWA NOŚNIKI, NIE JEDEN ─────────────────
  {
    nazwa: '⭐ K4 — kafel niesie rodzaj KRAWĘDZIĄ i stan PLAKIETKĄ (dwa nośniki)',
    sprawdz: (z) => {
      const src = bezKomentarzy(z.dzis);
      const i = src.indexOf('function renderKafel');
      if (i < 0) return false;
      const ciało = src.slice(i, src.indexOf('function renderTrzyFakty', i));
      return /styles\.kafelZobowiazanie/.test(ciało)
        && /styles\.kafelWlasnaPraca/.test(ciało)
        && /styles\.kafelRzeczProduktu/.test(ciało)
        && /styles\.plakietka/.test(ciało)
        && /\{k\.plakietka\}/.test(ciało);
    },
  },
  {
    nazwa: '⭐ K4 — słupek niesie WYSOKOŚĆ i NASYCENIE, obie z tej samej liczby',
    sprawdz: (z) => {
      const src = bezKomentarzy(z.dzis);
      const i = src.indexOf('function renderSlupek');
      if (i < 0) return false;
      const ciało = src.slice(i, i + 2000);
      return /wysokoscObciazenia\(wartosc\)/.test(ciało) && /barwaObciazenia\(wartosc\)/.test(ciało);
    },
  },
  // ── ⛔⛔ D-1 · KARTA „CO DZIŚ ZROBIĆ" NIE JEST ŚCIANĄ TEKSTU ──────
  // ⚠️ PREDYKAT DOPISANY PO ZRZUTACH Z 18.08, 16:46 — i najważniejszy w tym
  // pliku. `pozycja.co` bywa CAŁYM akapitem z materiałów Gamechange
  // (zmierzone na zrzucie: 443 znaki, piętnaście linii). Ekran, który rysuje
  // go surowo, jest ścianą tekstu niezależnie od tego, ile innych rzeczy
  // z karty zdejmiemy — i pierwsza wersja pasa W1 tego nie widziała.
  // ⛔ Dwa niezależne hamulce, oba wymagane: składanie pierwszego zdania
  // ORAZ `numberOfLines`. Jeden z nich to za mało — producent może kiedyś
  // oddać tekst bez kropki i bez spacji.
  {
    nazwa: '⛔⛔ D-1 — karta „co dziś zrobić" NIE rysuje surowego `pozycja.co`',
    sprawdz: (z) => {
      const src = bezKomentarzy(z.dzis);
      const od = src.indexOf('function renderDzisNaEkranie');
      if (od < 0) return false;
      const ciało = src.slice(od, src.indexOf('\n  }', od));
      return !/\{pozycjeNaDzis\[0\]\.co\}/.test(ciało)
        && /pierwszeZdanieNaEkran\(pozycjeNaDzis\[0\]\.co\)/.test(ciało)
        && /numberOfLines=\{2\}/.test(ciało);
    },
  },
  // ── §2 T-4 · MAKIETA NIGDY NIE PRZEKREŚLA (Z7) ───────────────────
  {
    nazwa: '⛔ T-4 — ani jednego przekreślenia na ekranie „Dziś / Tydzień"',
    sprawdz: (z) => !/textDecorationLine:\s*'line-through'/.test(bezKomentarzy(z.dzis)),
  },
  // ── §2 D-6 · NIC NIE WCHODZI POD NIEPRZEZROCZYSTY „+" (P0) ───────
  {
    nazwa: '⛔ D-6 — kafel, wiersz odsyłacza i przypis mają odstęp na przycisk „+"',
    sprawdz: (z) => {
      const src = bezKomentarzy(z.dzis);
      const style = src.slice(src.indexOf('const styles = StyleSheet.create'));
      const ma = (nazwa: string) => {
        const i = style.indexOf(`${nazwa}: {`);
        if (i < 0) return false;
        return /paddingRight: wymiary\.odstepPodPlusem/.test(style.slice(i, style.indexOf('},', i)));
      };
      return ma('kafel') && ma('inlineLink') && ma('licznikPodpis');
    },
  },
  // ── §8 · ⛔ ZERO RZECZY PRZECIĘTYCH LINIĄ ZGIĘCIA ────────────────
  {
    // ⛔ MIERZY ŹRÓDŁO PODANE W ARGUMENCIE, a nie plik z dysku — inaczej
    // mutacja „ekran przekracza 808 dp" nie miałaby jak niczego zapalić.
    nazwa: '⛔ §8 — oba ekrany mieszczą się nad zgięciem, 0 rzeczy przeciętych',
    sprawdz: (z) => {
      const katalog = join(root, 'app', '(tabs)');
      const d = zmierzEkranZTekstu('dzis.tsx', z.dzis, katalog);
      const j = zmierzEkranZTekstu('ja.tsx', z.ja, katalog);
      return d.wysokoscRazemDp <= WIDOCZNE_NAD_ZGIECIEM_DP && przeciete(d) === 0
        && j.wysokoscRazemDp <= WIDOCZNE_NAD_ZGIECIEM_DP && przeciete(j) === 0;
    },
  },
];

const zrodlaPrawdziwe: Zrodla = { dzis, ja, tabs, temat };

// ═══════════════════════════════════════════════════════════════════
// 1. BATERIA NA PRAWDZIWYM KODZIE — ⛔ MUSI DAĆ ZERO ZAPALEŃ
// ═══════════════════════════════════════════════════════════════════
console.log('1. BATERIA NA PRAWDZIWYM KODZIE (musi dać 0 zapaleń)\n');
const zapaloneNaPrawdzie: string[] = [];
for (const p of BATERIA) {
  const ok = p.sprawdz(zrodlaPrawdziwe);
  check(p.nazwa, ok);
  if (!ok) zapaloneNaPrawdzie.push(p.nazwa);
}
check('⭐⭐ ASERCJA ODWROTNA — na PRAWDZIWYCH regułach bateria ma ZERO zapaleń',
  zapaloneNaPrawdzie.length === 0, zapaloneNaPrawdzie.join(' · '));

// ═══════════════════════════════════════════════════════════════════
// 2. ⭐⭐ BATERIA MUTACJI (§11 polecenia) — DZIEWIĘĆ MUTACJI,
//    KAŻDA MA ZAPALIĆ STRAŻNIKA IMIENNIE
// ═══════════════════════════════════════════════════════════════════
console.log('\n2. BATERIA MUTACJI — dziewięć mutacji łamiących §7\n');

type Mutacja = { nazwa: string; coPsuje: string; zastosuj: (z: Zrodla) => Zrodla };
const MUTACJE: Mutacja[] = [
  {
    nazwa: 'M1 ⛔ słupek obciążenia dostaje składową czerwieni',
    coPsuje: 'Z2/P4 — obciążenie zaczyna wyglądać jak ostrzeżenie, choć nie jest werdyktem',
    zastosuj: (z) => ({ ...z, temat: z.temat.replace(
      'SKLADOWE_OBCIAZENIA = { r: 46, g: 107, b: 94 }',
      'SKLADOWE_OBCIAZENIA = { r: 232, g: 67, b: 45 }') }),
  },
  {
    nazwa: 'M2 ⛔ przy obciążeniu wraca kolor wg progu',
    coPsuje: 'D4 — liczba obciążenia dostaje ocenę kolorem, a obciążenie nie jest werdyktem',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      'styles.faktKropka,\n          !jest && styles.faktKropkaPustka,',
      'styles.faktKropka,\n          { backgroundColor: barwaObciazenia(4.5) },\n          !jest && styles.faktKropkaPustka,') }),
  },
  {
    nazwa: 'M3 ⛔ kafel traci jeden z dwóch nośników (plakietka znika)',
    coPsuje: 'K4 — stan zostaje wyłącznie kształtem ramki, którego 1 na 12 chłopców nie odczyta',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      '<Text style={[styles.plakietka, stylPlakietki]}>{k.plakietka}</Text>', '') }),
  },
  {
    nazwa: 'M4 ⛔ na ekran wchodzi „AU"',
    coPsuje: '§7.3 — jednostki umowne padają na ekranie, choć zawodnik czyta punkty',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      "const FAKT_OBCIAZENIE = 'Obciążenie';",
      "const FAKT_OBCIAZENIE = 'Obciążenie w AU';") }),
  },
  {
    nazwa: 'M5 ⛔ tekst ląduje pod nieprzezroczystym „+"',
    coPsuje: 'P0/D-6 — przypis wjeżdża pod przycisk i przestaje być czytelny',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      '    paddingRight: wymiary.odstepPodPlusem,\n  },', '  },') }),
  },
  {
    nazwa: 'M6 ⛔ przekreślenie wraca na pozycję odwołaną',
    coPsuje: 'T-4/Z7 — nieobecność zaczyna się czytać jako kara, a jest wiedzą',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      "  wdOdwolana: { ...typography.body, fontSize: 12.5, color: colors.textSecondary },",
      "  wdOdwolana: { ...typography.body, fontSize: 12.5, color: colors.textSecondary, textDecorationLine: 'line-through' },") }),
  },
  {
    nazwa: 'M9 ⛔ ściana tekstu wraca na ekran (surowe `pozycja.co`)',
    coPsuje: 'D-1 — karta „co dziś zrobić" znowu niesie cały akapit z materiałów, '
      + 'czyli defekt, który Kuba nazwał pierwszym słowem po obejrzeniu appki',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      '<Text style={styles.odpowiedzTresc} numberOfLines={2}>\n'
      + '                    {pierwszeZdanieNaEkran(pozycjeNaDzis[0].co).tekst}\n'
      + '                  </Text>',
      '<Text style={styles.odpowiedzTresc}>{pozycjeNaDzis[0].co}</Text>') }),
  },
  {
    nazwa: `M8 ⛔ ekran przekracza linię zgięcia (${WIDOCZNE_NAD_ZGIECIEM_DP} dp)`,
    coPsuje: '§8 — rzecz przecięta zgięciem albo pod nim; „widzę to bez przewijania" przestaje być prawdą',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      '        {zakresKarty === \'tydzien\' ? (',
      '        <View style={styles.card}><Text style={styles.cardBody}>'
      + 'x'.repeat(4000)
      + '</Text></View>\n        {zakresKarty === \'tydzien\' ? (') }),
  },
  {
    nazwa: 'M7 ⛔ aktywna zakładka wraca na sam kolor marki',
    coPsuje: 'P-2 — aktywna rzecz zostaje z jednym nośnikiem zamiast trzech',
    zastosuj: (z) => ({ ...z, tabs: z.tabs.replace(
      'tabBarActiveTintColor: colors.textPrimary', 'tabBarActiveTintColor: colors.brand') }),
  },
];

let mutacjeNieme = 0;
for (const m of MUTACJE) {
  const zmutowane = m.zastosuj(zrodlaPrawdziwe);
  const zmienil = zmutowane.dzis !== dzis || zmutowane.ja !== ja
    || zmutowane.tabs !== tabs || zmutowane.temat !== temat;
  const zapalone = BATERIA.filter((p) => !p.sprawdz(zmutowane)).map((p) => p.nazwa);
  console.log(`\n   ${m.nazwa}\n   co psuje: ${m.coPsuje}`);
  console.log(`   zapalone predykaty: ${zapalone.length} / ${BATERIA.length}`);
  zapalone.forEach((n) => console.log(`      ↳ ${n}`));
  check(`⭐ mutacja „${m.nazwa}" NAPRAWDĘ zmienia kod (inaczej bateria bada nic)`, zmienil);
  check(`⭐ mutacja „${m.nazwa}" zapala strażnika IMIENNIE`, zapalone.length > 0,
    'mutacja przeszła niezauważona — strażnika na tę regułę NIE MA');
  if (zapalone.length === 0) mutacjeNieme++;
}

check('⭐⭐ ANI JEDNA z dziewięciu mutacji nie przeszła niezauważona',
  mutacjeNieme === 0, `nieme mutacje: ${mutacjeNieme}`);

// ═══════════════════════════════════════════════════════════════════
// 3. UMOWA O WYGLĄDZIE MA JEDNO MIEJSCE (KROK 2 POLECENIA)
// ═══════════════════════════════════════════════════════════════════
console.log('\n3. UMOWA O WYGLĄDZIE — JEDNO MIEJSCE\n');

check('⭐ `lib/theme.ts` jest RE-EKSPORTEM `constants/theme.ts`, nie drugą kopią wartości',
  /from '\.\.\/constants\/theme'/.test(readFileSync(join(root, 'lib', 'theme.ts'), 'utf8'))
  && !/#[0-9a-fA-F]{6}/.test(bezKomentarzy(readFileSync(join(root, 'lib', 'theme.ts'), 'utf8'))),
  'w `lib/theme.ts` stoi wartość koloru — to jest druga kopia umowy');

check('⛔ żaden z dwóch ekranów NIE TRZYMA koloru sam (zero wartości heksowych)',
  !/#[0-9a-fA-F]{3,8}\b/.test(bezKomentarzy(dzis)) && !/#[0-9a-fA-F]{3,8}\b/.test(bezKomentarzy(ja)),
  'ekran trzyma kolor na sztywno — zmiana motywu go ominie');

check('⭐ motyw jest JASNY — tło ekranu i karta z makiety v3, co do znaku',
  colors.background === '#f5f2ec' && colors.surface === '#fffdfa' && colors.textPrimary === '#1a1a1a',
  `${colors.background} / ${colors.surface} / ${colors.textPrimary}`);

check('⛔ JEDYNA czerwień w produkcie to `error` — i nic poza nią',
  colors.error === '#E8432D'
  && ![colors.brand, colors.success, colors.caution, colors.warning].includes('#E8432D' as never),
  `error=${colors.error} brand=${colors.brand}`);

// ⭐ K4 sprawdzone WYWOŁANIEM, nie lekturą: wysokość i nasycenie rosną razem.
{
  const wartosci = [0, 1, 2, 3.5, 5, 7, 12];
  const wysokosci = wartosci.map(wysokoscObciazenia);
  const rosnie = wysokosci.every((h, i) => i === 0 || h >= wysokosci[i - 1]);
  const sufit = wysokoscObciazenia(SUFIT_SLUPKA) === wysokoscObciazenia(99);
  check('⭐ K4 — wysokość słupka rośnie z wartością i ZATRZYMUJE SIĘ na suficie',
    rosnie && sufit, `${wysokosci.join('/')} · sufit ${SUFIT_SLUPKA}`);
  const barwy = wartosci.map(barwaObciazenia);
  check('⛔ Z2 — ŻADNA barwa słupka w całym zakresie nie ma składowej czerwonej powyżej 46',
    barwy.every((b) => b.startsWith(`rgba(${SKLADOWE_OBCIAZENIA.r},`)) && SKLADOWE_OBCIAZENIA.r <= 46,
    barwy.join(' · '));
}

check('⭐ odstęp na przycisk „+" jest STAŁĄ z umowy, a nie liczbą w ekranie',
  wymiary.odstepPodPlusem === 76 && /wymiary\.odstepPodPlusem/.test(dzis),
  `${wymiary.odstepPodPlusem}`);

// ═══════════════════════════════════════════════════════════════════
// 4. ⭐⭐ SKŁADANIE PIERWSZEGO ZDANIA — SPRAWDZONE WYWOŁANIEM
//
// ⛔ Predykat wyżej dowodzi, że ekran WOŁA tę funkcję. Nie dowodzi, że ona
// cokolwiek skraca. Poniżej jest wywołanie na PRAWDZIWYM tekście ze zrzutu
// z 18.08 — 443 znaki materiału o wąskim gardle.
// ⚠️ Funkcja mieszka w pliku ekranu, którego nie da się zaimportować bez
// React Native, więc wycinam ją ze źródła i uruchamiam. ⛔ Nieudane wycięcie
// jest PORAŻKĄ, nie ciszą — inaczej ta sekcja przechodziłaby, nie sprawdzając nic.
// ═══════════════════════════════════════════════════════════════════
console.log('\n4. SKŁADANIE PIERWSZEGO ZDANIA — WYWOŁANIEM\n');
{
  const od = dzis.indexOf('export function pierwszeZdanieNaEkran');
  const doo = dzis.indexOf('\n}\n', od);
  check('(strażnik strażnika) umiem wyciąć funkcję ze źródła ekranu',
    od > 0 && doo > od, 'bez tego sekcja 4 nie sprawdza niczego');
  const ciało = dzis.slice(od, doo + 3)
    .replace('export function', 'function')
    .replace(/:\s*string(\s*[,)])/g, '$1')
    .replace(/:\s*number\s*=\s*ZNAKOW_PIERWSZEGO_ZDANIA/, ' = 120')
    .replace(/\):\s*\{[^}]*\}\s*\{/, ') {');
  const f = new Function(`${ciało}; return pierwszeZdanieNaEkran;`)() as
    (t: string) => { tekst: string; skrocone: boolean };

  const SCIANA = 'Prosta diagnoza wąskiego gardła z materiału: Potencjał — skok dosiężny '
    + '(poniżej 35 cm nisko, powyżej 50 cm wysoko) lub skok w dal z miejsca '
    + '(1,80-2,20 m to środek skali); Wykorzystanie — przysiad i martwy ciąg z poprawną '
    + 'techniką pod rosnącym obciążeniem; Recykling — szybkie skoki sprężynowe: jeśli '
    + 'skaczesz wysoko, ale kontakt z podłożem jest długi, tam jest Twój deficyt. '
    + 'Szukasz elementu najsłabszego WZGLĘDEM pozostałych.';
  const w = f(SCIANA);
  check('⭐⭐ ŚCIANA TEKSTU ZE ZRZUTU schodzi do dwóch linii',
    w.tekst.length <= 121 && w.skrocone, `${w.tekst.length} znaków, skrócone=${w.skrocone}`);
  check('⛔ skrócenie JEST WIDOCZNE — kończy się wielokropkiem, nie urywa po cichu',
    w.tekst.endsWith('…'), w.tekst.slice(-20));
  check('⛔ cięcie wypada na granicy słowa, nie w środku wyrazu',
    / \S+…$/.test(w.tekst) || /^\S+…$/.test(w.tekst), w.tekst.slice(-24));

  const KROTKIE = 'Zrób sesję Bloku przed treningiem klubowym, nie po nim.';
  const k = f(KROTKIE);
  check('⛔ KRÓTKIE zdanie producenta przechodzi CO DO ZNAKU — bez wielokropka',
    k.tekst === KROTKIE && !k.skrocone, `${k.tekst} / skrocone=${k.skrocone}`);

  check('⛔ pusty tekst nie wybucha i nie zmyśla',
    f('').tekst === '' && !f('').skrocone);

  const BEZ_KROPKI = 'Jedno długie zdanie bez kropki '.repeat(8);
  check('⛔ tekst BEZ kropki też się skraca — `numberOfLines` jest drugim hamulcem, nie jedynym',
    f(BEZ_KROPKI).tekst.length <= 121 && f(BEZ_KROPKI).skrocone,
    `${f(BEZ_KROPKI).tekst.length}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
