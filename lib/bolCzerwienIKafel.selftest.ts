// PLAN-D 08.2026 · FALA 5 · PAS B1 (21.08.2026) — NOWY PLIK.
// STRAŻNIK TRZECH RZECZY: ⛔ NATĘŻENIE BÓLU · ⛔ CZERWIEŃ (Z2) · KAFEL OCENIONEJ RZECZY.
//
// ═════════════════════════════════════════════════════════════════════
// PO CO TO ISTNIEJE — trzy defekty, ZERO strażników na każdy z nich
// ═════════════════════════════════════════════════════════════════════
//
// ⛔⛔ 1. PRODUKT ZMYŚLAŁ LICZBĘ O CIELE ZAWODNIKA.
// `app/(tabs)/dzis.tsx` budował wiersz `pain_entries` z `natezenie: rpeWybrane ?? 1`.
// Do kolumny „jak bardzo Cię boli" wchodziła odpowiedź na pytanie „jak ciężka była
// sesja", a gdy zawodnik ciężkości nie wybrał — liczba 1, czyli „prawie nie boli".
// ⛔ Nikt zawodnika o ból nie zapytał. `lib/wgladyZAlgorytmu.ts` podawał mu tę
// liczbę z powrotem w rejestrze `fakt_o_tobie`, czyli JAKO ZMIERZONY FAKT O JEGO
// CIELE — złamanie Z0 w rejestrze o najwyższej stawce. Ta sama liczba szła do
// raportu dla rodzica i do historii bólu.
//
// ⛔ 2. CZERWIEŃ ZNACZYŁA PIĘĆ RÓŻNYCH RZECZY.
// `lib/scale-colors.ts` malował niską jakość snu, niski poziom energii i niski
// nastrój kolorem `colors.error` — TĄ SAMĄ CZERWIENIĄ CO BÓL. Reguła Z2 mówi:
// czerwień jest zarezerwowana dla bólu i stanu ochronnego. Pas Z1 sprawdził
// `grep`em i podał: ZERO strażników na to.
//
// 3. KAFEL RZECZY JUŻ OCENIONEJ MÓWIŁ „do zrobienia" I PROWADZIŁ DO KALENDARZA
// (znalezisko pasa R1 #10). ⛔ To jest ta sama klasa defektu, przez którą
// właściciel produktu nie umiał dodać meczu we własnej aplikacji: DROGA PROWADZI
// GDZIE INDZIEJ NIŻ NAPIS OBIECUJE.
//
// ═════════════════════════════════════════════════════════════════════
// JAK TEN PLIK JEST ZBUDOWANY — i dlaczego akurat tak
// ═════════════════════════════════════════════════════════════════════
//
// ⭐ DWIE WARSTWY, ROZDZIELONE ŚWIADOMIE:
//   • STRAŻNICY (sekcja 3) czytają pliki JAKO TEKST i są jedyną warstwą, którą
//     bada bateria mutacji. Mutacja podmienia napis w pamięci i pyta, czy któryś
//     ze strażników zapala się IMIENNIE.
//   • URUCHOMIENIOWO (sekcja 4) woła PRAWDZIWE funkcje z prawdziwych modułów.
//     ⛔ Ta warstwa NIE JEST i nie może być częścią baterii: import wiąże się
//     z modułem na dysku, więc mutacja tekstu nie ma jak jej dosięgnąć.
//     Dowodzi ZACHOWANIA DZIŚ, nie odporności na przyszłą zmianę — i tak jest
//     to napisane, zamiast udawać, że bateria bada dwa razy więcej.
//
// ⛔ ASERCJA ODWROTNA STOI PIERWSZA (sekcja 3, ostatnia asercja): na prawdziwym
// kodzie bateria ma ZERO zapaleń. Bez niej „każda mutacja coś zapala" byłoby
// prawdą także dla baterii, która zapala się zawsze.
//
// ⛔ WYCINKI, NIE CAŁE PLIKI. Asercja „czy napis pada gdziekolwiek w pliku"
// przepuszcza mutację dopisującą słowo w innym miejscu — zmierzone w tym
// projekcie przez pasy D1, P1 i T2. Każdy wycinek ma osobną asercję,
// że NIE JEST PUSTY: pusty wycinek jest zawsze zielony.
//
// ⚠️ CZEGO TEN STRAŻNIK NIE ROBI: nie uruchamia aplikacji, nie dotyka Supabase
// i nie wie, czy zapis bólu przechodzi przez RLS. Sprawdza KSZTAŁT KODU
// i ZACHOWANIE CZYSTYCH FUNKCJI. To jest granica jego dowodu.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { colors } from '../constants/theme';
import { higherIsBetterColor, higherIsWorseColor, sleepHoursColor } from './scale-colors';
import { wierszBolu, stanZapisuBolu, bolNatezeniePoczatkowe, BOL_WARTOSCI, MAKS_BOLU } from './ocenaZKafla';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let bledy = 0;
let ok = 0;
function check(nazwa: string, warunek: boolean, szczegol = '') {
  if (warunek) { ok += 1; console.log(`OK   - ${nazwa}`); }
  else { bledy += 1; console.log(`FAIL - ${nazwa}${szczegol ? ': ' + szczegol : ''}`); }
}

// ═════════════════════════════════════════════════════════════════════
// 1. NARZĘDZIA
// ═════════════════════════════════════════════════════════════════════

/**
 * ⛔ KOMENTARZ NIE JEST KODEM. Przejście JEDNO, znak po znaku — ⛔ nie para
 * `replace`, w której blok idzie przed linią: ta kolejność zjada własne źródło
 * strażnikom i pilnuje jej zapadka na RÓWNOŚĆ w `lib/ostatniCentymetr.selftest.ts`
 * (stan: 39 plików). Ten plik ⛔ NIE MA prawa tej liczby podbić, więc idzie
 * pętlą, tak jak `bezKomentarzy` tam.
 * ⛔ NAPIS NIE JEST KOMENTARZEM — bez gałęzi cudzysłowu `'https://…'` urywałoby
 * się na `//`.
 */
function bezKomentarzy(s: string): string {
  let out = '';
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (c === '/' && s[i + 1] === '/') {
      const k = s.indexOf('\n', i);
      i = k === -1 ? s.length : k;
      continue;
    }
    if (c === '/' && s[i + 1] === '*') {
      const k = s.indexOf('*/', i + 2);
      i = k === -1 ? s.length : k + 2;
      continue;
    }
    if (c === '\'' || c === '"' || c === '`') {
      const cudz = c;
      out += c;
      i += 1;
      while (i < s.length) {
        if (s[i] === '\\') { out += s[i] + (s[i + 1] ?? ''); i += 2; continue; }
        if (s[i] === cudz) { out += s[i]; i += 1; break; }
        if (cudz !== '`' && s[i] === '\n') break;
        out += s[i];
        i += 1;
      }
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/**
 * Wycinek między dwoma kotwicami. ⛔ Oddaje `null`, gdy któraś nie pasuje —
 * ⛔ NIGDY pustego napisu: predykat „nie znajduję zakazanego" byłby na pustce
 * zielony, a to jest dokładnie ta pułapka, przez którą strażnicy w tym projekcie
 * milkły bez ani jednego zapalenia.
 */
function wycinek(tekst: string, od: string, doo: string): string | null {
  const a = tekst.indexOf(od);
  if (a === -1) return null;
  const b = tekst.indexOf(doo, a + od.length);
  if (b === -1) return null;
  return tekst.slice(a, b);
}

type Zrodla = {
  dzis: string;
  kolory: string;
  ocena: string;
  dziennik: string;
  picker: string;
};

function wczytaj(): Zrodla {
  return {
    dzis: readFileSync(join(root, 'app', '(tabs)', 'dzis.tsx'), 'utf8'),
    kolory: readFileSync(join(root, 'lib', 'scale-colors.ts'), 'utf8'),
    ocena: readFileSync(join(root, 'lib', 'ocenaZKafla.ts'), 'utf8'),
    dziennik: readFileSync(join(root, 'app', '(tabs)', 'dziennik.tsx'), 'utf8'),
    picker: readFileSync(join(root, 'components', 'ScalePicker.tsx'), 'utf8'),
  };
}

// ═════════════════════════════════════════════════════════════════════
// 2. WYCINKI — każdy zakotwiczony na KODZIE, nie na komentarzu
// ═════════════════════════════════════════════════════════════════════

/** Miejsce, w którym powstaje wiersz `pain_entries`. */
const wycinekZapisuBolu = (z: Zrodla): string | null =>
  wycinek(bezKomentarzy(z.dzis), 'const stanBolu = stanZapisuBolu(', '.insert(bol)');

/** Krok „Coś Cię boli?" w arkuszu oceny — miejsca i natężenie. */
const wycinekPytaniaOBol = (z: Zrodla): string | null =>
  // ⛔ KOTWICA NA `otwarty(k.id) && …`, NIE NA SAMYM `k.id === 'bol' ?`. Ten drugi
  // napis pada NAJPIERW w wierszu wybierającym NAGŁÓWEK kroku — wycinek zaczynałby
  // się przed blokiem czasu i ciężkości i połykał cały krok „czas i RPE".
  // Predykat „nie ma tu RPE" byłby wtedy CZERWONY NA PRAWDZIWYM KODZIE, a to jest
  // ta sama klasa błędu co pusty wycinek: asercja mierzy nie to, co obiecuje.
  wycinek(bezKomentarzy(z.dzis), "otwarty(k.id) && k.id === 'bol' ?", "otwarty(k.id) && k.id === 'powod' ?");

/** Deklaracja stanu natężenia bólu. */
const wycinekStanuBolu = (z: Zrodla): string | null =>
  wycinek(bezKomentarzy(z.dzis), 'const [bolNatezenie, setBolNatezenie]', ';');

/** Ciało `wierszBolu` w `lib/ocenaZKafla.ts`. */
const wycinekWierszaBolu = (z: Zrodla): string | null =>
  wycinek(bezKomentarzy(z.ocena), 'export function wierszBolu(', 'excludes_from_training');

/** Kafle dnia na ekranie „Dziś" — od pętli po wydarzeniach do wiersza „Bez oceny". */
const wycinekKafliDnia = (z: Zrodla): string | null =>
  wycinek(bezKomentarzy(z.dzis), '(todayEvents === null ? [] : todayEvents).map((e) =>', 'bezOceny.length > 0 ?');

/** Lista przystanków skali „im wyżej tym lepiej". */
const wycinekStopLepiej = (z: Zrodla): string | null =>
  wycinek(bezKomentarzy(z.kolory), 'const STOPY_IM_WYZEJ_TYM_LEPIEJ', ';');

/** Lista przystanków skali „im wyżej tym gorzej" (ból). */
const wycinekStopGorzej = (z: Zrodla): string | null =>
  wycinek(bezKomentarzy(z.kolory), 'const STOPY_IM_WYZEJ_TYM_GORZEJ', ';');

/** Ciało `higherIsBetterColor`. */
const wycinekLepiej = (z: Zrodla): string | null =>
  wycinek(bezKomentarzy(z.kolory), 'export function higherIsBetterColor', '\n}');

/** Ciało `higherIsWorseColor`. */
const wycinekGorzej = (z: Zrodla): string | null =>
  wycinek(bezKomentarzy(z.kolory), 'export function higherIsWorseColor', '\n}');

/** Ciało `sleepHoursColor`. */
const wycinekSnu = (z: Zrodla): string | null =>
  wycinek(bezKomentarzy(z.kolory), 'export function sleepHoursColor', '\n}');

/**
 * ⭐ K4 — czy każde wywołanie barwiące dane niesie OBOK SIEBIE liczbę.
 * Okno ±4 linie, bo `<ScalePicker>` bywa rozbity na wiele linii i `colorForValue`
 * stoi w środku. ⛔ Zwraca wywołania, które NIE MAJĄ niekolorowego nośnika.
 */
function wywolaniaBezLiczby(z: Zrodla): string[] {
  const WZORZEC_BARWY = /higherIsBetterColor|higherIsWorseColor|sleepHoursColor/;
  const WZORZEC_LICZBY = /<ScalePicker|\/10|\}h`|suffix=|\{pe\.intensity\}/;
  const linie = z.dziennik.split('\n');
  const zle: string[] = [];
  linie.forEach((l, i) => {
    if (!WZORZEC_BARWY.test(l)) return;
    if (/^\s*(\/\/|\*)/.test(l)) return;
    // ⛔ WIERSZ IMPORTU NIE JEST WYWOŁANIEM. Nic nie maluje, więc nie ma przy czym
    // stawiać liczby — a wliczony do listy czyniłby ten predykat CZERWONYM ZAWSZE.
    if (/^\s*import\s/.test(l)) return;
    // ⛔ OKNO WĄSKIE, DOPASOWANE DO KSZTAŁTU WYWOŁANIA — nie „±4 linie".
    // Szerokie okno przepuszczało mutację kasującą liczbę z JEDNEGO wiersza,
    // bo sąsiedni wiersz miał własną liczbę i wystarczał za dowód (zmierzone
    // w tym pasie, na mutacji `K4-M11`).
    //   • `colorForValue={…}` stoi WEWNĄTRZ elementu `<ScalePicker>`, który bywa
    //     rozbity na kilka linii — szukamy jego otwarcia w górę;
    //   • wszystko inne musi mieć liczbę W TYM SAMYM ZDANIU (linia + następna,
    //     bo treść `<Text>` stoi linijkę niżej niż jego `style`).
    const wOknie = /colorForValue=/.test(l)
      ? linie.slice(Math.max(0, i - 8), i + 1).join('\n')
      : linie.slice(i, i + 2).join('\n');
    const nosnik = /colorForValue=/.test(l)
      ? /<ScalePicker/.test(wOknie)
      : WZORZEC_LICZBY.test(wOknie);
    if (!nosnik) zle.push(`${i + 1}: ${l.trim().slice(0, 90)}`);
  });
  return zle;
}

// ═════════════════════════════════════════════════════════════════════
// 3. ⭐ STRAŻNICY — jedyna warstwa, którą bada bateria mutacji
// ═════════════════════════════════════════════════════════════════════

type Straznik = { nazwa: string; sprawdz: (z: Zrodla) => boolean };

/**
 * ⛔ NAZWA ASERCJI NIE JEST DOWODEM, CZEGO ONA PILNUJE (O101). Każda nazwa niżej
 * mówi ZAKRES RZECZYWISTY predykatu, a nie skrót, i cytuje regułę, na którą się
 * powołuje. Predykat, który łapałby szerzej niż reguła, jest defektem strażnika.
 */
const STRAZNICY: Straznik[] = [
  // ── ⛔⛔ RZECZ PIERWSZA · NATĘŻENIE BÓLU (Z0, R5, Z6) ───────────────
  {
    nazwa: '⛔⛔ B1-1 (Z0) — w miejscu, gdzie powstaje wiersz `pain_entries`, NIE MA ani jednego '
      + 'odwołania do RPE (ciężkości sesji)',
    sprawdz: (z) => {
      const w = wycinekZapisuBolu(z);
      if (w === null) return false;
      return !/rpe/i.test(w);
    },
  },
  {
    nazwa: '⛔ B1-1b — wycinek zapisu bólu NIE JEST PUSTY (inaczej asercja wyżej jest zielona z niczego)',
    sprawdz: (z) => {
      const w = wycinekZapisuBolu(z);
      return w !== null && w.length > 120;
    },
  },
  {
    nazwa: '⛔ B1-2 (Z0) — KAŻDE pole `natezenie` w drodze zapisu bólu bierze wartość ze stanu bólu '
      + '(`stanBolu.natezenie` albo `bolNatezenie`), a nie z żadnego innego pytania',
    sprawdz: (z) => {
      const w = wycinekZapisuBolu(z);
      if (w === null) return false;
      // ⛔ WSZYSTKIE WYSTĄPIENIA, NIE PIERWSZE. W tym wycinku pole `natezenie`
      // pada DWA RAZY: raz przy `stanZapisuBolu`, raz przy `wierszBolu`. Predykat
      // czytający tylko pierwsze przepuszczał mutację podmieniającą DRUGIE —
      // zmierzone w tym pasie, na mutacji `B1-M2`.
      const pola = [...w.matchAll(/natezenie:\s*([^,\n]+)/g)].map((m) => m[1]);
      return pola.length >= 2 && pola.every((v) => /stanBolu\.natezenie|bolNatezenie/.test(v));
    },
  },
  {
    nazwa: '⛔ B1-3 (R5) — ŻADNE pole `natezenie` w drodze zapisu bólu NIE MA WARTOŚCI DOMYŚLNEJ '
      + '(`??` ani `||`)',
    sprawdz: (z) => {
      const w = wycinekZapisuBolu(z);
      if (w === null) return false;
      const pola = [...w.matchAll(/natezenie:\s*([^,\n]+)/g)].map((m) => m[1]);
      return pola.length >= 2 && pola.every((v) => !/\?\?|\|\|/.test(v));
    },
  },
  {
    nazwa: '⛔ B1-4 (R5) — `wierszBolu` ODDAJE `null` przy natężeniu `null` '
      + '(„nie wiemy" nie zamienia się w liczbę)',
    sprawdz: (z) => {
      const w = wycinekWierszaBolu(z);
      if (w === null || w.length < 80) return false;
      return /if\s*\(\s*args\.natezenie\s*===\s*null\s*\)\s*return\s+null\s*;/.test(w);
    },
  },
  {
    nazwa: '⛔ B1-5 (Z6) — stan natężenia bólu startuje z `bolNatezeniePoczatkowe()`, '
      + 'a nie z liczby wpisanej na sztywno',
    sprawdz: (z) => {
      const w = wycinekStanuBolu(z);
      if (w === null || w.length < 30) return false;
      return /useState<[^>]*>\(\s*bolNatezeniePoczatkowe\(\)\s*\)/.test(w);
    },
  },
  {
    nazwa: '⭐ B1-6 — krok „Coś Cię boli?" ZADAJE PYTANIE O NATĘŻENIE: podpis `POLE_BOL_NATEZENIE` '
      + 'i przyciski z `BOL_WARTOSCI`',
    sprawdz: (z) => {
      const w = wycinekPytaniaOBol(z);
      if (w === null || w.length < 200) return false;
      return /POLE_BOL_NATEZENIE/.test(w) && /BOL_WARTOSCI\.map\(/.test(w);
    },
  },
  {
    nazwa: '⛔ B1-7 (Z6) — w kroku bólu ŻADNA wartość natężenia nie jest zaznaczona z góry: '
      + 'wyróżnienie bierze się wyłącznie z porównania z `bolNatezenie`',
    sprawdz: (z) => {
      const w = wycinekPytaniaOBol(z);
      if (w === null || w.length < 200) return false;
      const zaznaczenia = [...w.matchAll(/styles\.pytanieBtnWybrany/g)].length;
      return zaznaczenia > 0
        && [...w.matchAll(/bolNatezenie === b/g)].length >= 2
        && !/bolNatezenie\s*(\?\?|\|\|)/.test(w);
    },
  },
  {
    nazwa: '⛔ B1-8 (Z0) — krok bólu NIE CZYTA `rpeWybrane` (pytanie o ból nie zna odpowiedzi '
      + 'na pytanie o ciężkość)',
    sprawdz: (z) => {
      const w = wycinekPytaniaOBol(z);
      if (w === null || w.length < 200) return false;
      return !/rpe/i.test(w);
    },
  },

  // ── ⛔ RZECZ DRUGA · CZERWIEŃ (Z2, K4) ─────────────────────────────
  {
    nazwa: '⛔ Z2-1 — lista przystanków skali „im wyżej tym lepiej" (sen, energia, nastrój) '
      + 'NIE ZAWIERA `colors.error`',
    sprawdz: (z) => {
      const w = wycinekStopLepiej(z);
      if (w === null || w.length < 30) return false;
      return !/colors\.error/.test(w);
    },
  },
  {
    nazwa: '⛔ Z2-2 — `higherIsBetterColor` chodzi po liście „im wyżej tym lepiej" '
      + 'i nie sięga po `colors.error`',
    sprawdz: (z) => {
      const w = wycinekLepiej(z);
      if (w === null || w.length < 40) return false;
      return /STOPY_IM_WYZEJ_TYM_LEPIEJ/.test(w) && !/colors\.error/.test(w);
    },
  },
  {
    nazwa: '⛔ Z2-3 — `sleepHoursColor` (godziny snu to też skala „im wyżej tym lepiej") '
      + 'nie oddaje `colors.error` w żadnej gałęzi',
    sprawdz: (z) => {
      const w = wycinekSnu(z);
      if (w === null || w.length < 40) return false;
      return !/colors\.error/.test(w);
    },
  },
  {
    nazwa: '⛔ Z2-4 ASERCJA ODWROTNA — czerwień PRZY BÓLU ZOSTAJE: lista „im wyżej tym gorzej" '
      + 'MA `colors.error`, a `higherIsWorseColor` z niej korzysta',
    sprawdz: (z) => {
      const stopy = wycinekStopGorzej(z);
      const fun = wycinekGorzej(z);
      if (stopy === null || fun === null || stopy.length < 30 || fun.length < 40) return false;
      return /colors\.error/.test(stopy) && /STOPY_IM_WYZEJ_TYM_GORZEJ/.test(fun);
    },
  },
  {
    nazwa: '⛔ K4 — ŻADNE wywołanie barwiące dane nie jest JEDYNYM nośnikiem swojej informacji: '
      + 'przy każdym stoi liczba (suwak z wartością albo napis „x/10")',
    sprawdz: (z) => wywolaniaBezLiczby(z).length === 0,
  },
  {
    nazwa: '⛔ K4b — `ScalePicker` pokazuje WARTOŚĆ CYFRĄ i wypełnieniem toru, nie samą barwą',
    sprawdz: (z) => /\{shownValue\}/.test(z.picker) && /fillPct|minimumTrackTintColor/.test(z.picker),
  },

  // ── RZECZ TRZECIA · KAFEL RZECZY JUŻ OCENIONEJ (R5, Z-5) ───────────
  {
    nazwa: '⛔ R1-1 (R5) — kafel dnia szuka pytania w `pytaniaLista` (wszystkie stany), '
      + 'a NIE w `bezOceny` (tylko `pytam`)',
    sprawdz: (z) => {
      const w = wycinekKafliDnia(z);
      if (w === null || w.length < 200) return false;
      return /const pyt = pytaniaLista\.find\(/.test(w) && !/const pyt = bezOceny\.find\(/.test(w);
    },
  },
  {
    nazwa: '⛔ R1-2 (R5) — kafel rzeczy JUŻ OCENIONEJ ma własny stan `ocenione` i własną plakietkę '
      + '`PLAKIETKA_OCENIONE` — nie mówi „do zrobienia"',
    sprawdz: (z) => {
      const w = wycinekKafliDnia(z);
      if (w === null || w.length < 200) return false;
      return /const ocenione = pyt !== null && pyt\.stan\.rodzaj === 'odpowiedziane'/.test(w)
        && /ocenione \? PLAKIETKA_OCENIONE/.test(w);
    },
  },
  {
    nazwa: '⭐ R1-3 (Z-5) — kafel rzeczy, dla której ISTNIEJE pytanie, otwiera arkusz oceny '
      + 'JEDNYM dotknięciem, a do Kalendarza prowadzi wyłącznie gałąź `pyt === null`',
    sprawdz: (z) => {
      const w = wycinekKafliDnia(z);
      if (w === null || w.length < 200) return false;
      const onPress = wycinek(w, 'onPress: () => {', '},');
      if (onPress === null || onPress.length < 40) return false;
      return /if \(pyt !== null\) setArkusz\(\{ rodzaj: 'ocena', klucz: pyt\.klucz \}\);/.test(onPress)
        && /else router\.push\('\/kalendarz'\);/.test(onPress);
    },
  },
];

console.log('1. STRAŻNICY NA PRAWDZIWYM KODZIE\n');
const ZRODLA = wczytaj();
for (const s of STRAZNICY) check(s.nazwa, s.sprawdz(ZRODLA));

// ═════════════════════════════════════════════════════════════════════
// 4. URUCHOMIENIOWO — PRAWDZIWE FUNKCJE, PRAWDZIWE WEJŚCIA
//
// ⚠️ TA SEKCJA NIE JEST CZĘŚCIĄ BATERII i nie udaje, że jest: import wiąże się
// z modułem na dysku, więc mutacja tekstu jej nie dosięga. Dowodzi ZACHOWANIA
// DZIŚ — czyli tego, czego czytanie tekstu nie umie pokazać.
// ═════════════════════════════════════════════════════════════════════
console.log('\n2. URUCHOMIENIOWO — ZACHOWANIE, NIE KSZTAŁT TEKSTU\n');

check('⛔ (R5) `bolNatezeniePoczatkowe()` oddaje `null` — pustkę, nie liczbę',
  bolNatezeniePoczatkowe() === null, String(bolNatezeniePoczatkowe()));

check('⛔ (R5) `wierszBolu` z natężeniem `null` NIE ODDAJE WIERSZA',
  wierszBolu({ idZawodnika: 'u', idWpisu: 1, miejsce: 'lydka', strona: null, natezenie: null, wykluczaZTreningu: false }) === null);

check('⭐ ASERCJA ODWROTNA — `wierszBolu` z prawdziwym natężeniem ODDAJE WIERSZ z tą liczbą',
  wierszBolu({ idZawodnika: 'u', idWpisu: 1, miejsce: 'lydka', strona: null, natezenie: 7, wykluczaZTreningu: false })?.intensity === 7);

check('⛔ `wierszBolu` przycina do granicy z bazy (`pain_entries_intensity_check`: 0–10)',
  wierszBolu({ idZawodnika: 'u', idWpisu: 1, miejsce: 'lydka', strona: null, natezenie: 99, wykluczaZTreningu: false })?.intensity === MAKS_BOLU);

check('⛔ (R5) zaznaczone miejsce BEZ natężenia daje stan `nie_wiemy`, a nie liczbę',
  stanZapisuBolu({ miejsce: 'lydka', natezenie: null }).rodzaj === 'nie_wiemy');

check('⛔ (R5) brak miejsca daje `bez_bolu` — trzeci stan, nie sklejony z „nie wiemy"',
  stanZapisuBolu({ miejsce: null, natezenie: null }).rodzaj === 'bez_bolu');

check('⭐ ASERCJA ODWROTNA — miejsce ORAZ natężenie dają stan `zapisz` z tą samą liczbą',
  (() => {
    const s = stanZapisuBolu({ miejsce: 'lydka', natezenie: 3 });
    return s.rodzaj === 'zapisz' && s.natezenie === 3;
  })());

check('⛔ stan `nie_wiemy` NIESIE ZDANIE DLA ZAWODNIKA (samo „nie zapisałem" jest bezużyteczne)',
  (() => {
    const s = stanZapisuBolu({ miejsce: 'lydka', natezenie: null });
    return s.rodzaj === 'nie_wiemy' && s.zdanie.length > 40;
  })());

check('⛔ (Z6) `BOL_WARTOSCI` to dziesięć wartości 1–10 — bez zera i bez wartości wyróżnionej',
  BOL_WARTOSCI.length === 10 && BOL_WARTOSCI[0] === 1 && BOL_WARTOSCI[9] === 10);

/** Składowa czerwona z zapisu `rgb(r, g, b)` albo `#rrggbb`. */
function skladowaR(barwa: string): number {
  const rgb = barwa.match(/rgb\((\d+)/);
  if (rgb !== null) return Number(rgb[1]);
  const hex = barwa.match(/^#([0-9a-fA-F]{2})/);
  return hex === null ? -1 : parseInt(hex[1], 16);
}
const R_CZERWIENI = skladowaR(colors.error);

check('⛔ (Z2) w CAŁYM zakresie 0–10 `higherIsBetterColor` nie oddaje czerwieni — '
  + 'ani `colors.error`, ani niczego o jej składowej czerwonej',
  Array.from({ length: 11 }, (_, v) => higherIsBetterColor(v))
    .every((b) => b !== colors.error && skladowaR(b) < R_CZERWIENI),
  Array.from({ length: 11 }, (_, v) => `${v}:${higherIsBetterColor(v)}`).join(' '));

check('⛔ (Z2) w zakresie 0–14 godzin `sleepHoursColor` nie oddaje czerwieni',
  Array.from({ length: 29 }, (_, i) => sleepHoursColor(i / 2))
    .every((b) => b !== colors.error && skladowaR(b) < R_CZERWIENI));

check('⭐ …a mimo to `sleepHoursColor` NADAL ROZRÓŻNIA trzy poziomy (5 h ≠ 6,5 h ≠ 8 h) — '
  + 'zdjęta jest czerwień, nie informacja',
  new Set([sleepHoursColor(5), sleepHoursColor(6.5), sleepHoursColor(8)]).size === 3,
  `${sleepHoursColor(5)} | ${sleepHoursColor(6.5)} | ${sleepHoursColor(8)}`);

check('⛔ ASERCJA ODWROTNA (Z2) — CZERWIEŃ PRZY BÓLU ZOSTAJE: `higherIsWorseColor(10)` '
  + 'ma składową czerwoną czerwieni produktu',
  skladowaR(higherIsWorseColor(10)) >= R_CZERWIENI - 1,
  `${higherIsWorseColor(10)} wobec ${colors.error}`);

check('⭐ (Z2) …i ból przy dole skali czerwony NIE JEST',
  skladowaR(higherIsWorseColor(0)) < R_CZERWIENI, higherIsWorseColor(0));

// ═════════════════════════════════════════════════════════════════════
// 5. ⭐⭐ BATERIA MUTACJI — NA PRAWDZIWYCH PLIKACH, W PAMIĘCI
//
// ⛔ MUTUJEMY TEKST, NIE PLIK NA DYSKU. Nie ma stanu do przywrócenia, więc
// przerwanie procesu (`timeout`, `SIGINT`) nie zostawia zatrutego kodu produktu.
// Zmierzone w tym projekcie: sam `finally` nie wystarczył — `timeout` ubił
// przebieg i trzy kolejne uruchomienia suity mierzyły zmutowany plik.
// ═════════════════════════════════════════════════════════════════════
console.log('\n3. BATERIA MUTACJI — dziewięć mutacji na trzy naprawione rzeczy\n');

type Mutacja = { nazwa: string; coPsuje: string; zastosuj: (z: Zrodla) => Zrodla };

const MUTACJE: Mutacja[] = [
  {
    nazwa: 'B1-M1 ⛔⛔ natężenie bólu WRACA DO RPE (dokładnie defekt sprzed 21.08.2026)',
    coPsuje: 'Z0 — do kolumny „jak bardzo Cię boli" wraca odpowiedź na pytanie o ciężkość sesji, '
      + 'a produkt podaje ją zawodnikowi jako `fakt_o_tobie`',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      'natezenie: stanBolu.natezenie,', 'natezenie: rpeWybrane ?? 1,') }),
  },
  {
    nazwa: 'B1-M2 ⛔ natężenie dostaje WARTOŚĆ DOMYŚLNĄ 1 („prawie nie boli" wymyślone przez produkt)',
    coPsuje: 'R5 — stan „nie wiemy" znika i zamienia się w liczbę, której zawodnik nie podał',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      'natezenie: stanBolu.natezenie,', 'natezenie: stanBolu.natezenie ?? 1,') }),
  },
  {
    nazwa: 'B1-M3 ⛔ ból dostaje wartość ZAZNACZONĄ Z GÓRY (stan startuje z 5)',
    coPsuje: 'Z6 — przy bólu podpowiedziana liczba przekrzywia odpowiedź najmocniej ze wszystkich pól',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      'useState<WartoscBolu | null>(bolNatezeniePoczatkowe())', 'useState<WartoscBolu | null>(5)') }),
  },
  {
    nazwa: 'B1-M4 ⛔ `wierszBolu` przestaje odsiewać brak natężenia',
    coPsuje: 'R5 — „boli, nie wiem ile" przechodzi dalej i zostaje przycięte do liczby',
    zastosuj: (z) => ({ ...z, ocena: z.ocena.replace(
      '  if (args.natezenie === null) return null;\n', '') }),
  },
  {
    nazwa: 'B1-M5 ⛔ pytanie o natężenie ZNIKA z kroku bólu (zostaje samo miejsce)',
    coPsuje: 'Z0 — wracamy do stanu, w którym produkt zna miejsce bólu i sam dopisuje jego siłę',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace('BOL_WARTOSCI.map(', 'BOL_WARTOSCI.slice(0, 0).map(') }),
  },
  {
    nazwa: 'Z2-M6 ⛔ czerwień WRACA na sen, energię i nastrój',
    coPsuje: 'Z2 — zawodnik, który źle spał, dostaje ten sam sygnał co zawodnik, który zgłosił ból',
    zastosuj: (z) => ({ ...z, kolory: z.kolory.replace(
      'const STOPY_IM_WYZEJ_TYM_LEPIEJ = [colors.caution, colors.success];',
      'const STOPY_IM_WYZEJ_TYM_LEPIEJ = [colors.error, colors.caution, colors.success];') }),
  },
  {
    nazwa: 'Z2-M7 ⛔ czerwień wraca na PROGI GODZIN SNU',
    coPsuje: 'Z2 — ta sama czerwień co przy bólu, tylko drugą drogą (progi zamiast gradientu)',
    zastosuj: (z) => ({ ...z, kolory: z.kolory.replace(
      'if (hours < 6) return higherIsBetterColor(0);', 'if (hours < 6) return colors.error;') }),
  },
  {
    nazwa: 'Z2-M8 ⛔ czerwień ZNIKA Z BÓLU (mutacja w drugą stronę — odsiew, który odsiewa za dużo)',
    coPsuje: 'Z2 od drugiej strony — produkt traci JEDYNY sygnał, dla którego czerwień istnieje',
    zastosuj: (z) => ({ ...z, kolory: z.kolory.replace(
      'colors.warning, colors.error];', 'colors.warning, colors.caution];') }),
  },
  {
    nazwa: 'R1-M9 ⛔ kafel rzeczy JUŻ OCENIONEJ znów prowadzi do Kalendarza i mówi „do zrobienia"',
    coPsuje: 'R5 / Z-5 — droga prowadzi gdzie indziej niż napis obiecuje; dokładnie znalezisko R1 #10',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      'const pyt = pytaniaLista.find((q) => q.idWydarzenia === e.id) ?? null;',
      'const pyt = bezOceny.find((q) => q.idWydarzenia === e.id) ?? null;') }),
  },
  {
    nazwa: 'R1-M10 ⛔ plakietka rzeczy ocenionej wraca do „do zrobienia" (sama plakietka, bez drogi)',
    coPsuje: 'R5 — napis kłamie o stanie, choć dotknięcie prowadzi już dobrze',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      'ocenione ? PLAKIETKA_OCENIONE', 'ocenione ? PLAKIETKA_DO_ZROBIENIA') }),
  },
  {
    nazwa: 'K4-M11 ⛔ z Dziennika znika liczba obok barwy (zostaje sam kolor)',
    coPsuje: 'K4 — jeden na dwunastu chłopców przestaje czytać cokolwiek z tego wiersza',
    zastosuj: (z) => ({ ...z, dziennik: z.dziennik.replace(
      'text: `jakość snu: ${p.sleep_quality}/10`', 'text: \'jakość snu\'') }),
  },
];

const nieme: string[] = [];
for (const m of MUTACJE) {
  const zmutowane = m.zastosuj(ZRODLA);
  const naprawdeZmienil = zmutowane.dzis !== ZRODLA.dzis
    || zmutowane.kolory !== ZRODLA.kolory
    || zmutowane.ocena !== ZRODLA.ocena
    || zmutowane.dziennik !== ZRODLA.dziennik
    || zmutowane.picker !== ZRODLA.picker;
  check(`⭐ mutacja „${m.nazwa}" NAPRAWDĘ zmienia kod (inaczej bateria bada nic)`, naprawdeZmienil);

  const zapalone = STRAZNICY.filter((s) => !s.sprawdz(zmutowane)).map((s) => s.nazwa);
  const zapalila = naprawdeZmienil && zapalone.length > 0;
  if (!zapalila) nieme.push(m.nazwa);
  check(`⭐ mutacja „${m.nazwa}" zapala strażnika IMIENNIE`, zapalila,
    zapalone.length === 0
      ? 'mutacja przeszła NIEZAUWAŻONA — strażnika na tę regułę NIE MA'
      : zapalone.join(' | '));
  if (zapalone.length > 0) console.log(`   co psuje: ${m.coPsuje}`);
  if (zapalone.length > 0) console.log(`   zapaliło się: ${zapalone.length} — ${zapalone.map((n) => n.slice(0, 46)).join(' · ')}`);
}

check(`⭐⭐ ANI JEDNA z ${MUTACJE.length} mutacji nie przeszła niezauważona`,
  nieme.length === 0, `nieme: ${nieme.join(', ')}`);

// ⛔ ASERCJA ODWROTNA CAŁEJ BATERII — na PRAWDZIWYM kodzie zapaleń jest ZERO.
// Bez niej „każda mutacja coś zapala" byłoby prawdą także dla baterii, która
// zapala się zawsze — i cała sekcja wyżej nic by nie znaczyła.
const zapaloneNaPrawdziwym = STRAZNICY.filter((s) => !s.sprawdz(ZRODLA)).map((s) => s.nazwa);
check('⛔⭐ ASERCJA ODWROTNA BATERII — na NIEZMUTOWANYM kodzie zapala się ZERO strażników',
  zapaloneNaPrawdziwym.length === 0, zapaloneNaPrawdziwym.join(' | '));

// ⛔ PODSUMOWANIE W KSZTAŁCIE, KTÓRY CZYTA `tests/run-selftests.mjs`.
console.log(`\n${ok} passed, ${bledy} failed`);
if (bledy > 0) throw new Error(`${bledy} asercji nie przeszło`);
