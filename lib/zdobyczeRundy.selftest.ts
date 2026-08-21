// ═══════════════════════════════════════════════════════════════════
// ⭐⭐ STRAŻNIK TRZECH ZDOBYCZY RUNDY — PAS S3, 18.08.2026.
//
// PO CO ISTNIEJE. Pas F2 przepuścił pięć obietnic przez mutację NA PLIKACH
// PRODUKTU i zmierzył, że TRZY Z PIĘCIU nie zapalają niczego. Najważniejsza
// z nich to obietnica 23 — „ocena należy do rzeczy: dotykasz kafla" — czyli
// rzecz, dla której cała runda przebudowy dwóch ekranów w ogóle powstała.
// ⛔ Dało się skasować JEDNĄ LINIĄ wywołanie, które otwiera arkusz oceny,
// i suita nadal pokazywała komplet zielony.
//
// ⭐ POWTÓRZONE W TYM PASIE, JUŻ PO PASIE W1 (51/51 · 3 240 asercji):
//   M-F1  NAZWA_ROZWOJU → 'TWÓJ DOROBEK'          ⛔ zapaliło 0 plików
//   M-F3  JEDNOSTKA_ROZWOJU_WIELE → 'punktów pracy' ⛔ zapaliło 0 plików
//   M-F4  kafel dnia przestaje otwierać arkusz     ⛔ zapaliło 0 plików
//   M-F5  znika znak „+" z przycisku „+"           ⛔ zapaliło 0 plików
//   M-F2  OBCIAZENIE_ZAMIAST_LICZBY '—' → '0'      ✅ zapaliło ekranProfilu
// Diagnoza F2 potwierdzona co do znaku: `lib/arkusz.selftest.ts` pilnuje, że
// ocena NIE STOI w ciele `ScrollView`. ⛔ Nikt nie pilnował, że cokolwiek
// ją OTWIERA. Ten plik jest tym strażnikiem.
//
// ⭐ KOLEJNOŚĆ BUDOWY BYŁA ODWROTNA NIŻ ZWYKLE (§5 polecenia S3):
// najpierw mutacja na prawdziwym pliku, potem sprawdzenie, że NIKT nie krzyczy,
// dopiero potem asercja. Każdy predykat niżej ma za sobą mutację, która
// przeszła niezauważona, zanim on powstał.
//
// ⛔ TRZY PUŁAPKI ZMIERZONE W TYM PROJEKCIE 18.08 — omijane tu świadomie:
//   1. asercja pytająca „czy stała pada GDZIEKOLWIEK w pliku" zamiast o kafel
//      → dlatego każdy predykat pracuje na WYCINKU, nie na całym pliku;
//   2. asercja badająca PUSTY wycinek (`indexOf` = −1 → zawsze zielono)
//      → dlatego sekcja 0 to „strażnicy strażnika": każdy wycinek musi istnieć
//        i musi zawierać kotwicę, inaczej jest PORAŻKĄ, nie ciszą;
//   3. `\w` w JavaScripcie NIE ŁAPIE polskich znaków, a rdzeń dopełniacza to
//      `jednost`, nie `jednostk` → dlatego zakazany wzorzec ma klasę polską.
// ═══════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RODZAJE_ARKUSZA } from './arkusz';
import {
  NAZWA_ROZWOJU, NAZWA_OBCIAZENIA,
  JEDNOSTKA_ROZWOJU_WIELE, JEDNOSTKA_ROZWOJU_JEDEN,
} from './ekranProfilu';
import { PROGI } from './nagrodaZaPrace';
import { WIDOCZNE_NAD_ZGIECIEM_DP } from './wysokoscEkranu';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail = ''): void {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}${detail ? `: ${detail}` : ''}`); }
}

const libDir = dirname(fileURLToPath(import.meta.url));
const root = dirname(libDir);
const SCIEZKA_DZIS = join(root, 'app', '(tabs)', 'dzis.tsx');
const SCIEZKA_JA = join(root, 'app', '(tabs)', 'ja.tsx');
const SCIEZKA_PROFIL = join(root, 'lib', 'ekranProfilu.ts');
const SCIEZKA_ARKUSZE = join(root, 'components', 'ArkuszeProfilu.tsx');
const SCIEZKA_NAGRODA = join(root, 'lib', 'nagrodaZaPrace.ts');

const dzis = readFileSync(SCIEZKA_DZIS, 'utf8');
const ja = readFileSync(SCIEZKA_JA, 'utf8');
const profil = readFileSync(SCIEZKA_PROFIL, 'utf8');
const arkusze = readFileSync(SCIEZKA_ARKUSZE, 'utf8');
const nagroda = readFileSync(SCIEZKA_NAGRODA, 'utf8');

/** ⛔ JEDNO przejście tekstu, nigdy dwa — inaczej wzorzec zjada własne źródło (O69). */
const bezKomentarzy = (t: string): string => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');

type Zrodla = { dzis: string; ja: string; profil: string; arkusze: string; nagroda: string };
type Predykat = { nazwa: string; sprawdz: (z: Zrodla) => boolean };

// ═══════════════════════════════════════════════════════════════════
// WYCINKI — ⛔ każdy z nich MOŻE nie istnieć i wtedy predykat ma być
// CZERWONY, nie zielony. `null` znaczy „nie znalazłem", a nie „w porządku".
// ═══════════════════════════════════════════════════════════════════

const KOTWICA_KAFLI = '(todayEvents === null ? [] : todayEvents).map(';
const KOTWICA_WIERSZA = '{bezOceny.length > 0 ? (';
const KOTWICA_PRZYPISU = 'PRZYPIS_OCENA_NALEZY_DO_RZECZY';
const KOTWICA_FAB = 'style={styles.fab}';

/** Lista kafli dnia — od pętli po wydarzeniach do wiersza „Bez oceny". */
function wycinekKafliDnia(src: string): string | null {
  const s = bezKomentarzy(src);
  const od = s.indexOf(KOTWICA_KAFLI);
  if (od < 0) return null;
  const doo = s.indexOf(KOTWICA_WIERSZA, od);
  if (doo <= od) return null;
  return s.slice(od, doo);
}

/** Wiersz „Bez oceny: N rzeczy →" — drugie wejście do oceny. */
function wycinekWierszaBezOceny(src: string): string | null {
  const s = bezKomentarzy(src);
  const od = s.indexOf(KOTWICA_WIERSZA);
  if (od < 0) return null;
  // ⛔ Koniec wycinka to zamknięcie SAMEGO wiersza, a nie przypis pod nim.
  // Pierwsza wersja kończyła go na `PRZYPIS_OCENA_NALEZY_DO_RZECZY` i przez to
  // zapalała się na zdjęciu PRZYPISU — czyli na czymś, czego pilnuje
  // `kartaDzisILicznik`. Strażnik ma krzyczeć o swojej rzeczy, nie o cudzej.
  const doo = s.indexOf(') : null}', od);
  if (doo <= od) return null;
  return s.slice(od, doo);
}

/** Ciało przycisku „+" — od otwarcia `TouchableOpacity` do jego zamknięcia. */
function wycinekPrzyciskuPlus(src: string): string | null {
  const s = bezKomentarzy(src);
  const i = s.indexOf(KOTWICA_FAB);
  if (i < 0) return null;
  const od = s.lastIndexOf('<TouchableOpacity', i);
  const doo = s.indexOf('</TouchableOpacity>', i);
  if (od < 0 || doo <= od) return null;
  return s.slice(od, doo);
}

/** Arkusz stylów przycisku „+". */
function stylPrzyciskuPlus(src: string): string | null {
  const s = bezKomentarzy(src);
  const od = s.indexOf('\n  fab: {');
  if (od < 0) return null;
  const doo = s.indexOf('},', od);
  if (doo <= od) return null;
  return s.slice(od, doo);
}

/** Panel dwóch miar na ekranie 2 — od `panelMiar` do zdania o pracy dodatkowej. */
function wycinekPanelMiar(src: string): string | null {
  const s = bezKomentarzy(src);
  const od = s.indexOf('<View style={styles.panelMiar}>');
  if (od < 0) return null;
  const doo = s.indexOf('styles.pracaDodatkowa', od);
  if (doo <= od) return null;
  return s.slice(od, doo);
}

/** Rozgałęzienie arkusza — co ekran rysuje dla rodzaju `ocena` i `oceny`. */
function wycinekArkusza(src: string): string | null {
  const s = bezKomentarzy(src);
  const od = s.indexOf("if (arkusz.rodzaj === 'ocena')");
  if (od < 0) return null;
  const doo = s.indexOf("if (arkusz.rodzaj === 'plus')", od);
  return s.slice(od, doo > od ? doo : od + 1200);
}

/**
 * ⛔⛔ ZAKAZANE POŁĄCZENIE — waluta nazywa się ROZWÓJ (decyzja D4 / O92).
 * ⚠️ KLASA ZNAKÓW JEST POLSKA I TO NIE JEST OZDOBA: `\w` to [A-Za-z0-9_],
 * więc wzorzec na `\w` NIE ŁAPIE „punktÓW" i świeciłby na zielono, nie
 * pilnując niczego. Rdzeń dopełniacza mnogiego to `jednost` („jednostEK"),
 * nie `jednostk`.
 */
const ZAKAZ_WALUTY = /(punkt|jednost)[a-ząćęłńóśźż]*\s+prac[a-ząćęłńóśźż]*/gi;

/**
 * ⭐ SEDNO OBIETNICY 42. Samo wystąpienie zakazanego słowa w pliku NIE jest
 * defektem — `app/(tabs)/dzis.tsx` niesie sześć MARTWYCH stałych po zdjętej
 * karcie „TWÓJ DOROBEK" i one nikogo nie oszukują, dopóki nikt ich nie woła.
 * ⛔ Defektem jest stała, która mówi „punktów pracy" I JEST UŻYWANA.
 * Dlatego liczę WYWOŁANIA, nie wystąpienia.
 */
function zyweStaleZZakazanymSlowem(src: string): string[] {
  const s = bezKomentarzy(src);
  const zle: string[] = [];
  for (const m of s.matchAll(ZAKAZ_WALUTY)) {
    const przed = s.slice(0, m.index ?? 0);
    const i = przed.lastIndexOf('const ');
    const nazwa = i < 0 ? null
      : (/^const ([A-Za-z_$][A-Za-z0-9_$]*)/.exec(przed.slice(i))?.[1] ?? null);
    if (nazwa === null) { zle.push(`⛔ „${m[0]}" poza jakąkolwiek stałą`); continue; }
    const uzyc = s.split(new RegExp(`\\b${nazwa}\\b`)).length - 1;
    if (uzyc > 1) zle.push(`${nazwa} („${m[0]}") — ${uzyc} wystąpień, czyli ŻYWA`);
  }
  return zle;
}

console.log('zdobyczeRundy.selftest.ts — strażnik obietnic 23 · 68 · 42 (pas S3)\n');

// ═══════════════════════════════════════════════════════════════════
// 0. ⛔ STRAŻNICY STRAŻNIKA — czy wycinki w ogóle istnieją
//    Bez tej sekcji cała reszta mogłaby badać pustkę i świecić na zielono.
// ═══════════════════════════════════════════════════════════════════
console.log('0. STRAŻNICY STRAŻNIKA — wycinki nie są puste\n');
{
  const k = wycinekKafliDnia(dzis);
  check('⛔ wycinek „lista kafli dnia" istnieje i zawiera wywołanie `renderKafel`',
    k !== null && k.includes('renderKafel({'),
    k === null ? 'nie znalazłem kotwicy — przecelować wycinek, NIE kasować asercji' : k.slice(0, 80));
  const w = wycinekWierszaBezOceny(dzis);
  check('⛔ wycinek „wiersz Bez oceny" istnieje i zawiera `WIERSZ_BEZ_OCENY`',
    w !== null && w.includes('WIERSZ_BEZ_OCENY'), w === null ? 'brak kotwicy' : '');
  const f = wycinekPrzyciskuPlus(dzis);
  check('⛔ wycinek „przycisk +" istnieje i zawiera `styles.fabZnak`',
    f !== null && f.includes('styles.fabZnak'), f === null ? 'brak kotwicy' : '');
  const sf = stylPrzyciskuPlus(dzis);
  check('⛔ arkusz stylów przycisku „+" istnieje', sf !== null && sf.includes('borderRadius'),
    sf === null ? 'brak kotwicy' : '');
  const a = wycinekArkusza(dzis);
  check('⛔ wycinek „rozgałęzienie arkusza" istnieje i zna rodzaj `oceny`',
    a !== null && a.includes("arkusz.rodzaj === 'oceny'"), a === null ? 'brak kotwicy' : '');
  const pm = wycinekPanelMiar(ja);
  check('⛔ wycinek „panel dwóch miar" istnieje i zawiera `miaraLiczba`',
    pm !== null && pm.includes('styles.miaraLiczba'), pm === null ? 'brak kotwicy' : '');
  check('⛔ pliki źródłowe nie są puste (dzis · ja · ekranProfilu · ArkuszeProfilu · nagrodaZaPrace)',
    dzis.length > 10000 && ja.length > 1000 && profil.length > 1000
    && arkusze.length > 1000 && nagroda.length > 1000);
}

// ═══════════════════════════════════════════════════════════════════
// BATERIA PREDYKATÓW — trzy obietnice, szesnaście reguł.
// ⛔ Bateria dostaje ŹRÓDŁA W ARGUMENCIE, żeby dało się ją puścić także
// na kodzie ZMUTOWANYM. To jest cała różnica między asercją, która coś
// sprawdza, a asercją, która o czymś opowiada.
// ═══════════════════════════════════════════════════════════════════
const BATERIA: Predykat[] = [
  // ── ⭐⭐ OBIETNICA 23 · OCENA NALEŻY DO RZECZY: DOTYKASZ KAFLA ────
  {
    nazwa: '⭐⭐ 23a — kafel dnia OTWIERA ARKUSZ OCENY (istnieje wywołanie, nie sam arkusz)',
    sprawdz: (z) => {
      const k = wycinekKafliDnia(z.dzis);
      if (k === null) return false;
      return /onPress:/.test(k) && /setArkusz\(\{\s*rodzaj:\s*'ocena'/.test(k);
    },
  },
  {
    nazwa: '⛔ 23b — dotknięcie kafla NAPRAWDĘ coś robi (`onPress` nie jest pustym ciałem)',
    sprawdz: (z) => {
      const k = wycinekKafliDnia(z.dzis);
      if (k === null) return false;
      return !/onPress:\s*\(\)\s*=>\s*\{\s*\}/.test(k);
    },
  },
  {
    nazwa: '⭐ 23c — DRUGIE wejście do oceny: wiersz „Bez oceny" otwiera arkusz `oceny`',
    sprawdz: (z) => {
      const w = wycinekWierszaBezOceny(z.dzis);
      if (w === null) return false;
      return /setArkusz\(\{\s*rodzaj:\s*'oceny'\s*\}\)/.test(w);
    },
  },
  {
    nazwa: '⛔ 23d — otwarty arkusz oceny RYSUJE PYTANIA, a nie pustkę',
    sprawdz: (z) => {
      const a = wycinekArkusza(z.dzis);
      if (a === null) return false;
      return /arkusz\.rodzaj === 'ocena'\)\s*return\s*<>\{renderPytaniaOWystapienia\(arkusz\.klucz\)\}<\/>/.test(a)
        && /arkusz\.rodzaj === 'oceny'\)\s*return\s*<>\{renderPytaniaOWystapienia\(\)\}<\/>/.test(a);
    },
  },
  {
    nazwa: '⭐ 23e — kafel, który CZEKA NA OCENĘ, mówi to plakietką (drugi nośnik, K4)',
    sprawdz: (z) => {
      const k = wycinekKafliDnia(z.dzis);
      if (k === null) return false;
      return /KAFEL_CZEKA_NA_OCENE/.test(k) && /pyt === null \?/.test(k);
    },
  },
  {
    nazwa: '⛔⛔ 23f — SPÓJNOŚĆ: skoro ekran pisze „dotykasz kafla", kafel MUSI otwierać ocenę',
    sprawdz: (z) => {
      const s = bezKomentarzy(z.dzis);
      const przypisNaEkranie = new RegExp(
        `<Text style=\\{styles\\.licznikPodpis\\}>\\{${KOTWICA_PRZYPISU}\\}</Text>`).test(s);
      if (!przypisNaEkranie) return true; // przypisu pilnuje `kartaDzisILicznik`
      const k = wycinekKafliDnia(z.dzis);
      return k !== null && /setArkusz\(\{\s*rodzaj:\s*'ocena'/.test(k);
    },
  },

  // ── OBIETNICA 68 · PRZYCISK „+" JEST WIDOCZNY I JEST PRZYCISKIEM ──
  {
    nazwa: '⛔ 68a — przycisk „+" NIESIE ZNAK (pusty przycisk to nie jest przycisk)',
    sprawdz: (z) => {
      const f = wycinekPrzyciskuPlus(z.dzis);
      if (f === null) return false;
      return /<Text style=\{styles\.fabZnak\}>\s*\+\s*<\/Text>/.test(f);
    },
  },
  {
    nazwa: '⛔ 68b — „+" MA WEJŚCIE: dotknięcie otwiera arkusz `plus`',
    sprawdz: (z) => {
      const f = wycinekPrzyciskuPlus(z.dzis);
      if (f === null) return false;
      return /setArkusz\(\{\s*rodzaj:\s*'plus'\s*\}\)/.test(f)
        && !/onPress=\{\(\)\s*=>\s*\{\s*\}\}/.test(f);
    },
  },
  {
    nazwa: '⛔ 68c — „+" ma rolę przycisku i NIEPUSTĄ etykietę (jedyny znak to „+", sam nic nie mówi)',
    sprawdz: (z) => {
      const f = wycinekPrzyciskuPlus(z.dzis);
      if (f === null) return false;
      return /accessibilityRole="button"/.test(f)
        && /accessibilityLabel=\{PLUS_ETYKIETA\}/.test(f);
    },
  },
  {
    nazwa: '⛔ 68d — „+" leży `absolute`: nie podnosi ekranu ani o dp i nie jedzie z treścią',
    sprawdz: (z) => {
      const sf = stylPrzyciskuPlus(z.dzis);
      if (sf === null) return false;
      return /position:\s*'absolute'/.test(sf) && /bottom:\s*\d+/.test(sf);
    },
  },
  {
    nazwa: '⛔ 68e — „+" stoi POZA `ScrollView` — inaczej ucieka pod zgięcie razem z treścią',
    sprawdz: (z) => {
      const s = bezKomentarzy(z.dzis);
      const fab = s.indexOf(KOTWICA_FAB);
      const koniec = s.lastIndexOf('</ScrollView>');
      return fab > 0 && koniec > 0 && fab > koniec;
    },
  },

  // ── OBIETNICA 42 · MIARA NAZYWA SIĘ ROZWÓJ (D4 / O92) ────────────
  {
    nazwa: "⛔ 42a — `NAZWA_ROZWOJU` to 'Rozwój' — nazwy miary nie wolno przemianować bez decyzji",
    sprawdz: (z) => /export const NAZWA_ROZWOJU = 'Rozwój';/.test(z.profil),
  },
  {
    nazwa: "⛔ 42b — jednostka to 'punktów rozwoju' / 'punkt rozwoju', nigdy „pracy”",
    sprawdz: (z) => /export const JEDNOSTKA_ROZWOJU_WIELE = 'punktów rozwoju';/.test(z.profil)
      && /export const JEDNOSTKA_ROZWOJU_JEDEN = 'punkt rozwoju';/.test(z.profil),
  },
  {
    nazwa: '⭐ 42c — nazwa miary i jej jednostka mają WSPÓLNY RDZEŃ (tytuł nie kłamie obok podpisu)',
    sprawdz: (z) => {
      const nazwa = /export const NAZWA_ROZWOJU = '([^']*)';/.exec(z.profil)?.[1] ?? '';
      const jedn = /export const JEDNOSTKA_ROZWOJU_WIELE = '([^']*)';/.exec(z.profil)?.[1] ?? '';
      return /rozw/i.test(nazwa) && /rozw/i.test(jedn);
    },
  },
  {
    nazwa: '⛔⛔ 42d — ŻADNA ŻYWA stała obu ekranów nie mówi „punktów pracy" (martwe wolno, żywe nie)',
    sprawdz: (z) => [z.dzis, z.ja, z.profil, z.arkusze, z.nagroda]
      .every((src) => zyweStaleZZakazanymSlowem(src).length === 0),
  },
  {
    nazwa: '⭐ 42e — ekran 2 bierze nazwę miary Z MODUŁU, nie z własnego literału',
    sprawdz: (z) => /<Text style=\{styles\.miaraNazwa\}>\{NAZWA_ROZWOJU\}<\/Text>/.test(bezKomentarzy(z.ja)),
  },

  // ── ⭐ CZTERY DZIURY ZNALEZIONE PRZY OKAZJI (druga fala sond pasa S3) ──
  // ⛔ Polecenie §8 mówi wprost: „jeżeli po drodze znajdziesz kolejne
  // obietnice bez strażnika — dopisz je do tego pasa". Te cztery mutacje
  // też przeszły przez 52 strażników bez ani jednego zapalenia.
  {
    nazwa: '⭐ 49a — zdanie o pracy dodatkowej JEST wejściem do arkusza trafności',
    sprawdz: (z) => /onPress=\{\(\) => setOtwarty\('trafnosc'\)\}/.test(bezKomentarzy(z.ja)),
  },
  {
    nazwa: '⭐ 9a — kafel dostaje rodzaj POLICZONY z `opiszRodzaj`, a nie wpisany na sztywno',
    sprawdz: (z) => {
      const k = wycinekKafliDnia(z.dzis);
      if (k === null) return false;
      return /rodzaj: rodzajKafla,/.test(k)
        && /const rodzajKafla = /.test(k)
        && /opisRodzaju\.id === 'match'/.test(k);
    },
  },
  {
    nazwa: '⭐ 3b — tytuł ekranu 1 mówi, KTÓRY z dwóch widoków jest otwarty',
    sprawdz: (z) => /\{zakresKarty === 'dzis' \? KARTA_ZAKRES_DZIS : KARTA_ZAKRES_TYDZIEN\}/
      .test(bezKomentarzy(z.dzis)),
  },
  {
    nazwa: '⛔⛔ 65a (R5) — w miejscu NIEPOLICZONEJ liczby stoi ZNAK, nigdy zero',
    sprawdz: (z) => {
      const pm = wycinekPanelMiar(z.ja);
      if (pm === null) return false;
      // ⛔ Obie miary muszą sięgać po tę samą nazwaną pustkę…
      const ile = pm.split('OBCIAZENIE_ZAMIAST_LICZBY').length - 1;
      // …a w panelu nie wolno postawić zera ani „domyślnego" zera z `??`.
      return ile >= 2 && !/:\s*'0'/.test(pm) && !/\?\?\s*0\b/.test(pm) && !/\|\|\s*0\b/.test(pm);
    },
  },
];

const zrodlaPrawdziwe: Zrodla = { dzis, ja, profil, arkusze, nagroda };

// ═══════════════════════════════════════════════════════════════════
// 1. BATERIA NA PRAWDZIWYM KODZIE — ⛔ MUSI DAĆ ZERO ZAPALEŃ
// ═══════════════════════════════════════════════════════════════════
console.log('\n1. BATERIA NA PRAWDZIWYM KODZIE (musi dać 0 zapaleń)\n');
const zapaloneNaPrawdzie: string[] = [];
for (const p of BATERIA) {
  const ok = p.sprawdz(zrodlaPrawdziwe);
  check(p.nazwa, ok);
  if (!ok) zapaloneNaPrawdzie.push(p.nazwa);
}
check('⭐⭐ ASERCJA ODWROTNA — na PRAWDZIWYM kodzie bateria ma ZERO zapaleń',
  zapaloneNaPrawdzie.length === 0, zapaloneNaPrawdzie.join(' · '));

// ═══════════════════════════════════════════════════════════════════
// 2. ⭐⭐ BATERIA MUTACJI — SIEDEMNAŚCIE MUTACJI, KAŻDA MA ZAPALIĆ IMIENNIE
//
// ⛔ CZTERNAŚCIE z nich zmierzono NA PLIKACH PRODUKTU zanim ten plik powstał
// i WSZYSTKIE CZTERNAŚCIE przeszły niezauważone przez 51 (potem 52) strażników.
// Trzy pozostałe (S3-M4, S3-M10 w wersji „plakietka", S3-M13) mają obok siebie
// strażnika w innym pliku i stoją tu jako kontrola: gdyby tamten zamilkł,
// ten plik krzyknie.
// ═══════════════════════════════════════════════════════════════════
console.log('\n2. BATERIA MUTACJI — siedemnaście mutacji łamiących obietnice 23 · 68 · 42 · 49 · 9 · 3 · 65\n');

type Mutacja = { nazwa: string; coPsuje: string; zastosuj: (z: Zrodla) => Zrodla };
const MUTACJE: Mutacja[] = [
  {
    nazwa: 'S3-M1 ⛔⛔ kafel dnia przestaje otwierać arkusz oceny (mutacja M-F4 pasa F2)',
    coPsuje: '23 — sedno całej rundy przebudowy: ocena przestaje należeć do rzeczy',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      "                    if (pyt !== null) setArkusz({ rodzaj: 'ocena', klucz: pyt.klucz });\n"
      + "                    else router.push('/kalendarz');",
      "                    router.push('/kalendarz');") }),
  },
  {
    nazwa: 'S3-M2 ⛔ kafel dnia przestaje cokolwiek robić (`onPress` pusty)',
    coPsuje: '23 — kafel wygląda na dotykalny i nie jest; najgorszy rodzaj martwej obietnicy',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      "                  onPress: () => {\n"
      + "                    if (pyt !== null) setArkusz({ rodzaj: 'ocena', klucz: pyt.klucz });\n"
      + "                    else router.push('/kalendarz');\n"
      + "                  },",
      '                  onPress: () => {},') }),
  },
  {
    nazwa: 'S3-M3 ⛔ drugie wejście do oceny prowadzi do Kalendarza zamiast do arkusza',
    coPsuje: '23 — rzecz z wczoraj traci JEDYNĄ ścieżkę oceny, bo nie ma jej już na dzisiejszej liście',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      "onPress={() => setArkusz({ rodzaj: 'oceny' })}",
      "onPress={() => router.push('/kalendarz')}") }),
  },
  {
    nazwa: 'S3-M4 ⛔ arkusz oceny otwiera się PUSTY',
    coPsuje: '23 — dotknięcie działa, arkusz wjeżdża, pytań nie ma',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      "if (arkusz.rodzaj === 'ocena') return <>{renderPytaniaOWystapienia(arkusz.klucz)}</>;",
      "if (arkusz.rodzaj === 'ocena') return null;") }),
  },
  {
    nazwa: 'S3-M5 ⛔ znika znak „+" z przycisku „+" (mutacja M-F5 pasa F2)',
    coPsuje: '68 — jedyne wejście do dodawania czegokolwiek staje się pustym kołem',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      '<Text style={styles.fabZnak}>+</Text>', '<Text style={styles.fabZnak}></Text>') }),
  },
  {
    nazwa: 'S3-M6 ⛔ „+" przestaje być przyciskiem (`onPress` pusty)',
    coPsuje: '68 — przycisk jest widoczny i nic nie otwiera',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      "onPress={() => setArkusz({ rodzaj: 'plus' })}", 'onPress={() => {}}') }),
  },
  {
    nazwa: 'S3-M7 ⛔ „+" traci `position: absolute` — wchodzi w układ i jedzie z treścią',
    coPsuje: '68 — przycisk zaczyna podnosić ekran i ucieka pod zgięcie razem z listą',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      "    position: 'absolute', right: 16, bottom: 24, width: 60, height: 60, borderRadius: 30,",
      '    right: 16, bottom: 24, width: 60, height: 60, borderRadius: 30,') }),
  },
  {
    nazwa: 'S3-M8 ⛔ „+" wjeżdża DO `ScrollView`',
    coPsuje: '68 — przycisk przewija się razem z treścią, czyli znika przy dłuższym dniu',
    zastosuj: (z) => ({ ...z, dzis: z.dzis
      .replace('      </ScrollView>\n', '')
      .replace('        <Text style={styles.fabZnak}>+</Text>\n      </TouchableOpacity>',
        '        <Text style={styles.fabZnak}>+</Text>\n      </TouchableOpacity>\n      </ScrollView>') }),
  },
  {
    nazwa: 'S3-M9 ⛔ „+" traci etykietę dostępności',
    coPsuje: '68 — dla czytnika ekranu przycisk nazywa się „plus" i nic nie znaczy',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      'accessibilityLabel={PLUS_ETYKIETA}', "accessibilityLabel={''}") }),
  },
  {
    nazwa: 'S3-M10 ⛔ kafel przestaje mówić, że czeka na ocenę (plakietka na sztywno)',
    coPsuje: '23/13 — znika jedyny znak na ekranie, że ta rzecz czeka na Twoje słowo',
    // ⚠️ PRZECELOWANIE, NIE OSŁABIENIE — PAS B1, 21.08.2026. JEDNA LINIA.
    // ⛔ POWÓD: pas B1 naprawił defekt R1 #10 („kafel rzeczy JUŻ OCENIONEJ mówi
    // «do zrobienia» i prowadzi do Kalendarza"), więc wyrażenie plakietki ma
    // dziś TRZY stany zamiast dwóch: `ocenione ? PLAKIETKA_OCENIONE : pyt ===
    // null ? PLAKIETKA_DO_ZROBIENIA : KAFEL_CZEKA_NA_OCENE`. Stara kotwica
    // („plakietka: pyt === null ? …") przestała pasować, więc mutacja NIC NIE
    // ZMIENIAŁA i przechodziła jako niema — czyli bateria badała nic.
    // ⭐ DOWÓD, ŻE TO PRZECELOWANIE: mutacja nadal usuwa `KAFEL_CZEKA_NA_OCENE`
    // z wycinka kafli dnia, więc nadal zapala asercję „23e — kafel, który CZEKA
    // NA OCENĘ, mówi to plakietką". Każdy stan, który zapalał starą, zapala nową.
    // ⛔ Jeżeli się nie zgadzasz — to jest JEDNA LINIA do cofnięcia (kotwica).
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      ': pyt === null ? PLAKIETKA_DO_ZROBIENIA : KAFEL_CZEKA_NA_OCENE,',
      ': PLAKIETKA_DO_ZROBIENIA,') }),
  },
  {
    nazwa: "S3-M11 ⛔ NAZWA_ROZWOJU → 'TWÓJ DOROBEK' (mutacja M-F1 pasa F2)",
    coPsuje: '42 — miara wraca do nazwy zdjętej decyzją D4/O92',
    zastosuj: (z) => ({ ...z, profil: z.profil.replace(
      "export const NAZWA_ROZWOJU = 'Rozwój';", "export const NAZWA_ROZWOJU = 'TWÓJ DOROBEK';") }),
  },
  {
    nazwa: "S3-M12 ⛔ JEDNOSTKA_ROZWOJU_WIELE → 'punktów pracy' (mutacja M-F3 pasa F2)",
    coPsuje: '42 — słowo uśmiercone decyzją D4/O92 wraca na ekran 2, pod nagłówkiem „Rozwój"',
    zastosuj: (z) => ({ ...z, profil: z.profil.replace(
      "export const JEDNOSTKA_ROZWOJU_WIELE = 'punktów rozwoju';",
      "export const JEDNOSTKA_ROZWOJU_WIELE = 'punktów pracy';") }),
  },
  {
    nazwa: '⭐⭐ S3-M13 ⛔ stała „punktów pracy" WRACA na ekran 1 razem z podpięciem',
    coPsuje: '42 — ⭐ PRZECELOWANE 19.08.2026 PRZEZ PAS D2, imiennie i z powodem. '
      + 'Do 19.08 `NAGRODA_PUNKTY` LEŻAŁA w `dzis.tsx` jako martwa stała po zdjętej '
      + 'karcie „TWÓJ DOROBEK", więc mutacji wystarczyło ją PODPIĄĆ pod `Text`. '
      + 'Pas D2 §4.4 usunął dwanaście martwych stałych tego bloku — od tego dnia '
      + 'wstrzyknięcie samego wywołania nie niosłoby już zakazanego słowa i mutacja '
      + 'zgasłaby po cichu, chociaż strażnik działa. ⛔ Dlatego mutacja przywraca '
      + 'teraz STAŁĄ RAZEM Z PODPIĘCIEM — czyli robi dokładnie to, co zrobi pierwsza '
      + 'osoba, która zechce odbudować dorobek na ekranie 1. To jest przecelowanie, '
      + 'NIE osłabienie: warunek zapalenia (żywa stała mówiąca „punktów pracy") '
      + 'jest ten sam, zmieniła się wyłącznie droga, którą mutacja go osiąga.',
    // ⚠️ KOTWICA WSTRZYKNIĘCIA CELOWO LEŻY WE WŁASNYM PODWÓRKU (znak „+"),
    // a nie przy przypisie „Ocena należy do rzeczy". Pierwsza wersja brała
    // przypis — i wtedy zdjęcie CUDZEJ rzeczy, pilnowanej przez
    // `kartaDzisILicznik`, wywracało MOJĄ baterię. Kotwica, której pilnuje
    // predykat 68a, znika wyłącznie razem z zapaleniem tego predykatu.
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      '        <Text style={styles.fabZnak}>+</Text>',
      '        <Text style={styles.fabZnak}>+</Text>\n'
      + '        <Text style={styles.licznikPodpis}>{NAGRODA_PUNKTY(12, 3)}</Text>')
      // ⛔ …i DEFINICJA, bez której powyższe wywołanie byłoby tylko nazwą.
      // Kotwica: pierwsza linia pliku po dyrektywach — `const` na poziomie modułu.
      .replace(
        'const KARTA_ZAKRES_DZIS =',
        'const NAGRODA_PUNKTY = (punkty: number, jednostki: number) =>\n'
        + '  `${punkty} punktów pracy · ${jednostki} zapisanych rzeczy`;\n'
        + 'const KARTA_ZAKRES_DZIS =') }),
  },
  {
    nazwa: 'S3-M14 ⛔ zdanie o trafności przestaje otwierać arkusz „skąd bierze się trafność"',
    coPsuje: '49 — rachunek trafności zostaje zbudowany i nieosiągalny; kliknięcie nic nie robi',
    zastosuj: (z) => ({ ...z, ja: z.ja.replace(
      "onPress={() => setOtwarty('trafnosc')}", 'onPress={() => {}}') }),
  },
  {
    nazwa: 'S3-M15 ⛔ kafel traci rozróżnienie rodzaju lewą krawędzią',
    coPsuje: '9 / D-3 — trzy rodzaje pozycji znowu wyglądają tak samo, a nośnik zostaje',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      '                  rodzaj: rodzajKafla,', "                  rodzaj: 'zob',") }),
  },
  {
    nazwa: 'S3-M16 ⛔ tytuł ekranu 1 zawsze mówi „Dziś", także w widoku Tydzień',
    coPsuje: '3 — zawodnik nie wie, na co patrzy; nagłówek kłamie o stanie ekranu',
    zastosuj: (z) => ({ ...z, dzis: z.dzis.replace(
      "{zakresKarty === 'dzis' ? KARTA_ZAKRES_DZIS : KARTA_ZAKRES_TYDZIEN}", '{KARTA_ZAKRES_DZIS}') }),
  },
  {
    nazwa: '⭐⭐ S3-M17 ⛔ pustka rozwoju wypełniona ZEREM zamiast znakiem',
    coPsuje: 'R5 / 65 — zero podane po nieudanym odczycie mówi dziecku, że nic nie zrobiło. '
      + '⛔ Strażnik pilnował STAŁEJ `OBCIAZENIE_ZAMIAST_LICZBY`; ekran mógł ją ominąć własnym literałem.',
    zastosuj: (z) => ({ ...z, ja: z.ja.replace(
      "{rozwoj !== null && rozwoj.rodzaj === 'jest' ? String(rozwoj.punkty) : OBCIAZENIE_ZAMIAST_LICZBY}",
      "{rozwoj !== null && rozwoj.rodzaj === 'jest' ? String(rozwoj.punkty) : '0'}") }),
  },
];

let mutacjeNieme = 0;
for (const m of MUTACJE) {
  const zmutowane = m.zastosuj(zrodlaPrawdziwe);
  const zmienil = (Object.keys(zrodlaPrawdziwe) as (keyof Zrodla)[])
    .some((k) => zmutowane[k] !== zrodlaPrawdziwe[k]);
  const zapalone = BATERIA.filter((p) => !p.sprawdz(zmutowane)).map((p) => p.nazwa);
  console.log(`\n   ${m.nazwa}\n   co psuje: ${m.coPsuje}`);
  console.log(`   zapalone predykaty: ${zapalone.length} / ${BATERIA.length}`);
  zapalone.forEach((n) => console.log(`      ↳ ${n}`));
  check(`⭐ mutacja „${m.nazwa}" NAPRAWDĘ zmienia kod (inaczej bateria bada nic)`, zmienil);
  check(`⭐ mutacja „${m.nazwa}" zapala strażnika IMIENNIE`, zapalone.length > 0,
    'mutacja przeszła niezauważona — strażnika na tę regułę NIE MA');
  if (zapalone.length === 0) mutacjeNieme++;
}

check('⭐⭐ ANI JEDNA z siedemnastu mutacji nie przeszła niezauważona',
  mutacjeNieme === 0, `nieme mutacje: ${mutacjeNieme}`);

// ═══════════════════════════════════════════════════════════════════
// 3. URUCHOMIENIOWO — WARTOŚCI, NIE TEKST PLIKU
//    ⛔ Sekcja 1 i 2 czytają ŹRÓDŁO. Ta czyta to, co naprawdę zaimportuje
//    ekran — bo stała może stać w pliku i nie być tą, którą widać.
// ═══════════════════════════════════════════════════════════════════
console.log('\n3. URUCHOMIENIOWO — wartości, które naprawdę pójdą na ekran\n');

check("⭐ arkusz `ocena` i `oceny` SĄ rodzajami arkusza, nie wymysłem ekranu",
  RODZAJE_ARKUSZA.includes('ocena') && RODZAJE_ARKUSZA.includes('oceny'),
  RODZAJE_ARKUSZA.join(' · '));

check("⛔ (42) `NAZWA_ROZWOJU` = 'Rozwój'", String(NAZWA_ROZWOJU) === 'Rozwój', String(NAZWA_ROZWOJU));
check("⛔ (42) jednostki mówią o ROZWOJU, nie o pracy",
  String(JEDNOSTKA_ROZWOJU_WIELE) === 'punktów rozwoju'
  && String(JEDNOSTKA_ROZWOJU_JEDEN) === 'punkt rozwoju',
  `${JEDNOSTKA_ROZWOJU_WIELE} / ${JEDNOSTKA_ROZWOJU_JEDEN}`);
check('⛔ (42) dwie miary NADAL mają dwie różne nazwy',
  String(NAZWA_ROZWOJU) !== String(NAZWA_OBCIAZENIA),
  `${NAZWA_ROZWOJU} / ${NAZWA_OBCIAZENIA}`);

{
  // ⛔ To samo pytanie co predykat 42d, ale zadane WARTOŚCIOM progów.
  const zle = PROGI.filter((p) => [p.nazwa, p.zaJakaPrace]
    .some((t) => typeof t === 'string' && new RegExp(ZAKAZ_WALUTY.source, 'i').test(t)));
  check('⛔ (42) ani jeden PRÓG widoczny w arkuszu „Odznaki i progi" nie mówi „punktów pracy"',
    zle.length === 0, JSON.stringify(zle.map((p) => [p.id, p.nazwa])));
}

{
  // ⭐ 68 — geometria przycisku, policzona ze stylu, a nie z wrażenia.
  const sf = stylPrzyciskuPlus(dzis) ?? '';
  const bottom = Number(/bottom:\s*(\d+)/.exec(sf)?.[1] ?? NaN);
  const height = Number(/height:\s*(\d+)/.exec(sf)?.[1] ?? NaN);
  check('⛔ (68) da się odczytać `bottom` i `height` przycisku „+" (inaczej liczba niżej jest zmyślona)',
    Number.isFinite(bottom) && Number.isFinite(height), `${bottom} / ${height}`);
  check(`⛔ (68) górna krawędź „+" leży NAD zgięciem (${WIDOCZNE_NAD_ZGIECIEM_DP} dp)`,
    bottom + height <= WIDOCZNE_NAD_ZGIECIEM_DP && bottom >= 0,
    `bottom ${bottom} + height ${height} = ${bottom + height}`);
}

{
  // ⭐⭐ PRZECELOWANE 19.08.2026 PRZEZ PAS D2 (§4.4), IMIENNIE I Z POWODEM.
  //
  // CO TU STAŁO DO 19.08: inwentarz MARTWYCH stałych z zakazanym słowem
  // i asercja `martwe.length >= 1` — czyli „niech ktoś je policzy i nazwie".
  // Jej własny komunikat mówił wprost: „jeżeli spadło do zera — ktoś je usunął
  // i to dobra wiadomość: popraw tę asercję". Pas D2 usunął dwanaście martwych
  // stałych bloku „TWÓJ DOROBEK" (nagrobek w `app/(tabs)/dzis.tsx`), więc
  // inwentarz spadł do zera i stara asercja świeciłaby na czerwono ZA NAPRAWĘ.
  //
  // ⛔ TO NIE JEST OSŁABIENIE — nowa asercja jest ŚCIŚLE MOCNIEJSZA.
  // Stara dopuszczała stałe z zakazanym słowem, dopóki były martwe (i wymagała,
  // żeby co najmniej jedna taka była!). Nowa nie dopuszcza ANI JEDNEJ — ani
  // żywej, ani martwej. Każdy stan, który zapalał starą asercję jako defekt,
  // zapala i tę; dochodzi stan, którego stara nie umiała zobaczyć: zakazane
  // słowo wracające do pliku jako świeża stała jeszcze niepodpięta.
  // ⭐ Predykat `42d` (żywa stała = czerwień) stoi NIETKNIĘTY — pilnuje
  // pięciu plików naraz i to on jest głównym strażnikiem tej obietnicy.
  const s = bezKomentarzy(dzis);
  const trafienia = [...s.matchAll(new RegExp(ZAKAZ_WALUTY.source, 'gi'))].map((m) => {
    const przed = s.slice(0, m.index ?? 0);
    const i = przed.lastIndexOf('const ');
    const nazwa = i < 0 ? null : (/^const ([A-Za-z_$][A-Za-z0-9_$]*)/.exec(przed.slice(i))?.[1] ?? null);
    const uzyc = nazwa === null ? 0 : s.split(new RegExp(`\\b${nazwa}\\b`)).length - 1;
    return `${nazwa ?? '(poza stałą)'} („${m[0]}") — ${uzyc > 1 ? 'ŻYWA' : 'martwa'}`;
  });
  console.log(`   stałe z zakazanym słowem w dzis.tsx: ${trafienia.join(', ') || '(ani jednej)'}`);
  check('⛔⛔ (42) w `dzis.tsx` NIE MA zakazanego słowa ANI RAZU — ani w żywej stałej, ani w martwej',
    trafienia.length === 0,
    `${trafienia.length}: ${trafienia.join(' | ')} — ⛔ jeżeli liczba WZROSŁA, ktoś wniósł `
    + '„punktów pracy" z powrotem na ekran 1. Martwa stała nie jest wyjątkiem: '
    + 'pierwsza osoba odbudowująca dorobek podepnie ją pod `Text`.');
  // ⛔ STRAŻNIK STRAŻNIKA — bez tego powyższe zero byłoby nieodróżnialne
  // od pustego pliku albo od zjedzonego wycinka.
  check('⛔ …i mierzone źródło NIE JEST puste (inaczej zero wyżej nic nie znaczy)',
    s.length > 10000 && s.includes('styles.fabZnak'), `${s.length} znaków`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
