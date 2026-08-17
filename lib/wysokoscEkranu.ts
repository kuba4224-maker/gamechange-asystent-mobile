// PLAN-D-M1 08.2026 (17.08.2026) — NOWY PLIK. Miara wysokości ekranu
// wyprowadzana Z EKRANU.
//
// ═════════════════════════════════════════════════════════════════════
// PO CO TO ISTNIEJE — i co zastępuje
// ═════════════════════════════════════════════════════════════════════
// Do 17.08.2026 jedynym narzędziem, które odpowiadało na pytanie „czy to się
// mieści na telefonie", był `tests/measure-heights.ts`. Miał trzy wady, każdą
// zmierzoną, nie założoną:
//
//   1. MODEL EKRANU BYŁ WPISANY RĘCZNIE. Stała `DZIS_DO_PRZYCISKOW` wymieniała
//      pięć bloków ekranu „Dziś" ze stanu z 08.08.2026 i od tamtej pory nie
//      zmieniła się ani razu, choć ekran urósł z 40 439 B do 213 914 B
//      i doszły do niego m.in. kolejka podania i karta głosu. Atrapa jest
//      założeniem o świecie i starzeje się jak komentarz (O84).
//   2. JEDYNA RZECZ, KTÓRĄ NAPRAWDĘ CZYTAŁ Z EKRANU, TO ROZMIAR PLIKU
//      W BAJTACH. `statSync(dzis.tsx).size > 48 000` → wyjątek. Bajty nigdy
//      nie były miarą wysokości: 63 % objętości tego pliku to KOMENTARZE,
//      więc próg karał dokumentowanie decyzji, a nie dokładanie rzeczy
//      na ekran.
//   3. NIE BYŁ W SUICIE. `node tests/run-selftests.mjs` odkrywa wyłącznie
//      `lib/*.selftest.ts`, więc 45/45 przechodziło bez niego przez 32 commity.
//
// Ten moduł odpowiada na JEDNO pytanie, po ludzku:
//
//   ⭐ „Ile rzeczy zawodnik zobaczy na tym ekranie, zanim cokolwiek przewinie
//      — i które to są?"
//
// Robi to PRZEMIATAJĄC DRZEWO KOMPONENTÓW z pliku ekranu. Nie ma tu ani jednej
// listy elementów utrzymywanej ręcznie: dołożenie karty do `dzis.tsx` zmienia
// wynik tego modułu bez dotykania tego pliku. Test historyczny (O70) na wersji
// `dzis.tsx` sprzed pasa B4 daje INNĄ liczbę — to jest dowód, że model idzie
// z ekranu, a nie z ręki.
//
// ═════════════════════════════════════════════════════════════════════
// ⚠️ CZEGO TEN MODUŁ NIE ROBI — i nie udaje, że robi
// ═════════════════════════════════════════════════════════════════════
//   • NIE URUCHAMIA REACT NATIVE. Nie zna prawdziwego łamania wierszy, czcionki
//     ani `flex`. Wysokości są SZACUNKAMI liczonymi ze stylów zapisanych
//     w pliku, w kierunku świadomie pesymistycznym (to samo założenie, co
//     w `tests/measure-heights.ts`: 0,5 em na znak, 1,25 na interlinię).
//   • NIE JEST MIARĄ ESTETYKI. Odpowiada na pytanie „ile rzeczy jest nad
//     zgięciem", nie „czy ekran wygląda dobrze".
//   • GAŁĄŹ WARUNKOWA LICZY SIĘ NAJGORSZYM PRZYPADKIEM. `{a ? <X/> : <Y/>}`
//     to wyższy z dwóch, `{a && <X/>}` to <X/> pokazany. Ekran, który
//     „czasem" ma dwadzieścia pozycji, MA dwadzieścia pozycji.
//   • LISTA (`.map`) LICZY SIĘ JAKO JEDEN ELEMENT. Ekran z listą jest
//     zawsze co najmniej tak wysoki, jak pokazuje ten moduł, nigdy niższy.
//
// ⛔ Wniosek, który musi zostać wypowiedziany: zielony wynik tego modułu
// NIE ZNACZY „ekran jest dobry". Znaczy „liczba rzeczy nad zgięciem nie
// urosła od ostatniej świadomej decyzji".

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// ═════════════════════════════════════════════════════════════════════
// ⭐ D5 — MIARA „NAD ZGIĘCIEM" STOI W JEDNYM MIEJSCU
// ═════════════════════════════════════════════════════════════════════
// Telefon odniesienia: 430 × 950 dp (duży, współczesny — celowo NIE najmniejszy,
// bo pytanie brzmi „czy cokolwiek się mieści", a nie „czy mieści się wszędzie";
// na mniejszym telefonie nad zgięciem zmieści się MNIEJ rzeczy niż tu).
//
//   950  wysokość ekranu
//   −59  obszar bezpieczny na górze (pasek stanu / wcięcie) — ekrany zakładek
//        rysują `<SafeAreaView edges={['top']}>`, więc ten pas jest odjęty
//   −49  pasek zakładek (domyślna wysokość React Navigation bottom tabs)
//   −34  obszar bezpieczny na dole (pasek gestów)
//   ────
//   808  ⭐ tyle dp zawodnik widzi, zanim czegokolwiek dotknie
//
// ⛔ TA LICZBA MA WYSTĘPOWAĆ W REPOZYTORIUM DOKŁADNIE RAZ. Pilnuje tego
// asercja w `lib/wysokoscEkranu.selftest.ts`. Trzy kopie progu w trzech
// asercjach to trzy progi, które rozjadą się po cichu.
export const WIDOCZNE_NAD_ZGIECIEM_DP = 808;

/** Szerokość telefonu odniesienia (430 dp). Wchodzi w szacunek łamania wierszy. */
export const SZEROKOSC_ODNIESIENIA_DP = 430;

// ─────────────────────────────────────────────────────────────────────
// ZAŁOŻENIA SZACUNKU — wypisane wprost, bo od nich zależy wynik
// ─────────────────────────────────────────────────────────────────────
/** Interlinia, gdy styl nie podaje `lineHeight`. Ta sama reguła co w rundzie 3. */
const INTERLINIA = 1.25;
/** Średnia szerokość znaku w em. Świadomie pesymistyczna (szeroko = wyżej). */
const EM_NA_ZNAK = 0.5;
/** Domyślny `fontSize`, gdy styl go nie podaje (React Native: 14). */
const DOMYSLNY_FONT = 14;
/** Ile znaków „warte" jest wyrażenie `{cos}` w treści tekstu — górny szacunek. */
const ZNAKI_NA_WYRAZENIE = 12;
/**
 * Wysokość elementu, którego nie umiemy wyprowadzić (obcy komponent bez pliku
 * w repozytorium). ⛔ Taki element jest ZAWSZE wymieniany z nazwy w polu
 * `niewyprowadzalne` — cicha zerowa wysokość byłaby kłamstwem w dół.
 */
const NIEWYPROWADZALNY_DP = 120;
/** Bezpiecznik przed pętlą przy komponentach wołających się nawzajem. */
const MAKS_ZAGNIEZDZENIE = 6;

// ═════════════════════════════════════════════════════════════════════
// 1. LEKSER — jedno przejście po pliku, świadome trybu JSX
// ═════════════════════════════════════════════════════════════════════
// Nie da się użyć zwykłego maskowania cudzysłowów: w treści JSX apostrof jest
// znakiem, a nie początkiem napisu. Dlatego lekser trzyma stos trybów:
//   KOD   — wyrażenie/kod: napisy i komentarze są napisami i komentarzami
//   ZNACZNIK — wnętrze `<Tag ...>`: to samo, plus `{` otwiera KOD
//   TEKST — treść JSX między znacznikami: apostrof to apostrof

type Token =
  | { t: 'otw'; nazwa: string; poz: number; koniec: number }
  | { t: 'sam'; nazwa: string; poz: number; koniec: number }
  | { t: 'zam'; nazwa: string; poz: number; koniec: number }
  | { t: 'wyrOtw'; poz: number }
  | { t: 'wyrZam'; poz: number };

const PRZED_JSX = new Set(['(', '{', '[', ',', '=', '>', ':', '?', '&', '|', '!', ';', '\n', '+']);

/** Czy `<` na pozycji `i` zaczyna znacznik JSX, czy jest znakiem „mniejsze"? */
function toZnacznik(src: string, i: number): boolean {
  const nast = src[i + 1];
  if (!nast) return false;
  if (!/[A-Za-z_>/]/.test(nast)) return false;
  let j = i - 1;
  while (j >= 0 && /\s/.test(src[j]) && src[j] !== '\n') j--;
  if (j < 0) return true;
  const p = src[j];
  if (PRZED_JSX.has(p)) return true;
  // `return <View>` — słowo kluczowe tuż przed
  const przed = src.slice(Math.max(0, j - 8), j + 1);
  return /\b(return|=>)\s*$/.test(przed + ' ') || /\breturn$/.test(przed);
}

/**
 * Przemiata `src` od `od` do `do_` i oddaje płaską listę zdarzeń JSX.
 * ⚠️ To nie jest parser TypeScriptu i nie ma nim być — potrzebujemy wyłącznie
 * granic elementów, a te da się znaleźć bez tablicy symboli.
 */
function tokenizuj(src: string, od: number, do_: number): Token[] {
  const out: Token[] = [];
  // stos trybów; na dnie zawsze KOD
  const stos: ('KOD' | 'ZNACZNIK' | 'TEKST')[] = ['KOD'];
  // dla trybu KOD: głębokość klamr, żeby wiedzieć, kiedy `}` zamyka wyrażenie JSX
  const klamry: number[] = [0];
  let i = od;
  const tryb = () => stos[stos.length - 1];

  while (i < do_) {
    const c = src[i];
    const t = tryb();

    // komentarze — we wszystkich trybach poza TEKST (w TEKST `//` to zwykłe znaki)
    if (t !== 'TEKST' && c === '/' && src[i + 1] === '/') {
      const n = src.indexOf('\n', i);
      i = n === -1 ? do_ : n;
      continue;
    }
    if (t !== 'TEKST' && c === '/' && src[i + 1] === '*') {
      const n = src.indexOf('*/', i + 2);
      i = n === -1 ? do_ : n + 2;
      continue;
    }
    // napisy — tylko w KOD i ZNACZNIK
    if (t !== 'TEKST' && (c === "'" || c === '"')) {
      i++;
      while (i < do_ && src[i] !== c) i += src[i] === '\\' ? 2 : 1;
      i++;
      continue;
    }
    if (t !== 'TEKST' && c === '`') {
      i++;
      while (i < do_) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '`') { i++; break; }
        if (src[i] === '$' && src[i + 1] === '{') {
          // wnętrze `${}` to KOD — przeskakujemy je licząc klamry
          let g = 1; i += 2;
          while (i < do_ && g > 0) {
            if (src[i] === '{') g++;
            else if (src[i] === '}') g--;
            else if (src[i] === "'" || src[i] === '"' || src[i] === '`') {
              const q = src[i]; i++;
              while (i < do_ && src[i] !== q) i += src[i] === '\\' ? 2 : 1;
            }
            i++;
          }
          continue;
        }
        i++;
      }
      continue;
    }

    if (t === 'TEKST') {
      if (c === '{') { out.push({ t: 'wyrOtw', poz: i }); stos.push('KOD'); klamry.push(0); i++; continue; }
      if (c === '<') {
        if (src[i + 1] === '/') { i = zamkniecie(src, i, do_, out); continue; }
        i = otwarcie(src, i, do_, out, stos);
        continue;
      }
      i++;
      continue;
    }

    if (t === 'ZNACZNIK') {
      if (c === '{') { stos.push('KOD'); klamry.push(0); i++; continue; }
      if (c === '/' && src[i + 1] === '>') { i += 2; stos.pop(); i = domkniecieSam(out, i); continue; }
      if (c === '>') { i++; stos.pop(); stos.push('TEKST'); domknijOtw(out); continue; }
      i++;
      continue;
    }

    // KOD
    if (c === '{') { klamry[klamry.length - 1]++; i++; continue; }
    if (c === '}') {
      if (klamry[klamry.length - 1] === 0 && stos.length > 1) {
        stos.pop(); klamry.pop();
        if (tryb() === 'TEKST') out.push({ t: 'wyrZam', poz: i });
        i++; continue;
      }
      klamry[klamry.length - 1]--; i++; continue;
    }
    if (c === '<' && toZnacznik(src, i)) {
      if (src[i + 1] === '/') { i = zamkniecie(src, i, do_, out); continue; }
      i = otwarcie(src, i, do_, out, stos);
      continue;
    }
    i++;
  }
  return out;

  function otwarcie(s: string, p: number, kres: number, o: Token[], st: typeof stos): number {
    const m = /^<([A-Za-z_][A-Za-z0-9_.]*)?/.exec(s.slice(p, Math.min(kres, p + 64)));
    const nazwa = m?.[1] ?? ''; // pusta = fragment `<>`
    o.push({ t: 'otw', nazwa, poz: p, koniec: -1 });
    st.push('ZNACZNIK');
    return p + 1 + nazwa.length;
  }
  function zamkniecie(s: string, p: number, kres: number, o: Token[]): number {
    const g = s.indexOf('>', p);
    const koniec = g === -1 ? kres : g + 1;
    const nazwa = s.slice(p + 2, koniec - 1).trim();
    o.push({ t: 'zam', nazwa, poz: p, koniec });
    // `</Tag>` zamyka bieżący TEKST
    if (stos[stos.length - 1] === 'TEKST') stos.pop();
    return koniec;
  }
  function domknijOtw(o: Token[]) {
    for (let k = o.length - 1; k >= 0; k--) {
      if (o[k].t === 'otw' && (o[k] as { koniec: number }).koniec === -1) { (o[k] as { koniec: number }).koniec = i; return; }
    }
  }
  function domkniecieSam(o: Token[], koniec: number): number {
    for (let k = o.length - 1; k >= 0; k--) {
      if (o[k].t === 'otw' && (o[k] as { koniec: number }).koniec === -1) {
        const w = o[k] as { t: string; koniec: number };
        w.t = 'sam'; w.koniec = koniec; return koniec;
      }
    }
    return koniec;
  }
}

// ═════════════════════════════════════════════════════════════════════
// 2. DRZEWO
// ═════════════════════════════════════════════════════════════════════
export type Wezel = {
  nazwa: string;              // nazwa znacznika; '' = fragment; '{}' = wyrażenie
  poz: number;                // początek w źródle
  koniec: number;             // koniec w źródle (za znacznikiem zamykającym)
  otwKoniec: number;          // koniec znacznika otwierającego
  dzieci: Wezel[];
};

function zbudujDrzewo(tokeny: Token[], src: string): Wezel[] {
  const korzenie: Wezel[] = [];
  const stos: Wezel[] = [];
  const dodaj = (w: Wezel) => (stos.length ? stos[stos.length - 1].dzieci : korzenie).push(w);
  for (const tk of tokeny) {
    if (tk.t === 'sam') {
      dodaj({ nazwa: tk.nazwa, poz: tk.poz, koniec: tk.koniec, otwKoniec: tk.koniec, dzieci: [] });
    } else if (tk.t === 'otw') {
      const w: Wezel = { nazwa: tk.nazwa, poz: tk.poz, koniec: tk.koniec, otwKoniec: tk.koniec, dzieci: [] };
      dodaj(w); stos.push(w);
    } else if (tk.t === 'zam') {
      const w = stos.pop();
      if (w) w.koniec = tk.koniec;
    } else if (tk.t === 'wyrOtw') {
      const w: Wezel = { nazwa: '{}', poz: tk.poz, koniec: tk.poz, otwKoniec: tk.poz + 1, dzieci: [] };
      dodaj(w); stos.push(w);
    } else {
      const w = stos.pop();
      if (w) w.koniec = tk.poz + 1;
    }
  }
  void src;
  return korzenie;
}

// ═════════════════════════════════════════════════════════════════════
// 3. STYLE — czytane z `StyleSheet.create` tego samego pliku
// ═════════════════════════════════════════════════════════════════════
export type Styl = Record<string, number | string>;

/**
 * ⭐ Zbiera obiekty stylów z pliku i z jego RELATYWNYCH importów (dwa skoki).
 * Bez tego `...skew.stripe` byłoby niewidzialne — a to jest styl `position:
 * 'absolute'`, który decyduje, czy krecha karty liczy się do wysokości, czy nie.
 * Pomiar, który tego nie widzi, dokłada 44 dp za każdą kartę z krechą.
 */
function zbierzObiekty(
  src: string, katalog: string, glebokosc = 0, widziane = new Set<string>(),
): Record<string, Styl> {
  const out: Record<string, Styl> = {};
  for (const m of src.matchAll(/(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\{/g)) {
    const otw = m.index + m[0].length - 1;
    let g = 0; let koniec = otw;
    for (let i = otw; i < src.length; i++) {
      if (src[i] === '{') g++;
      else if (src[i] === '}') { g--; if (g === 0) { koniec = i; break; } }
    }
    const blok = src.slice(otw + 1, koniec);
    out[m[1]] = wlasciwosci(blok.replace(/\{[^{}]*\}/g, '0'));
    const re = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{/g;
    let n: RegExpExecArray | null;
    while ((n = re.exec(blok))) {
      let d = 1; let k = re.lastIndex;
      while (k < blok.length && d > 0) { if (blok[k] === '{') d++; else if (blok[k] === '}') d--; k++; }
      out[`${m[1]}.${n[1]}`] = wlasciwosci(blok.slice(re.lastIndex, k - 1).replace(/\{[^{}]*\}/g, '0'));
      re.lastIndex = k;
    }
  }
  if (glebokosc < 2) {
    for (const m of src.matchAll(/from\s+'(\.[^']+)'/g)) {
      for (const ext of ['.ts', '.tsx', '/index.ts']) {
        const p = resolve(join(katalog, m[1] + ext));
        if (widziane.has(p) || !existsSync(p)) continue;
        widziane.add(p);
        Object.assign(out, zbierzObiekty(readFileSync(p, 'utf8'), dirname(p), glebokosc + 1, widziane), out);
        break;
      }
    }
  }
  return out;
}

function wlasciwosci(plaski: string): Styl {
  const styl: Styl = {};
  for (const p of plaski.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(-?\d+(?:\.\d+)?|'[^']*'|"[^"]*")/g)) {
    const v = p[2];
    styl[p[1]] = /^[-\d]/.test(v) ? Number(v) : v.slice(1, -1);
  }
  return styl;
}

export function czytajStyle(src: string, obiekty: Record<string, Styl> = {}): Record<string, Styl> {
  const out: Record<string, Styl> = {};
  const start = src.indexOf('StyleSheet.create(');
  if (start === -1) return out;
  let i = src.indexOf('{', start);
  if (i === -1) return out;
  let g = 0; let koniec = i;
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') g++;
    else if (src[k] === '}') { g--; if (g === 0) { koniec = k; break; } }
  }
  const body = src.slice(i + 1, koniec);
  // klucz: { ... } — jeden poziom zagnieżdżenia (shadowOffset itp.) pomijamy
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    let d = 1; let k = re.lastIndex;
    while (k < body.length && d > 0) { if (body[k] === '{') d++; else if (body[k] === '}') d--; k++; }
    const blok = body.slice(re.lastIndex, k - 1);
    if (/^\s*$/.test(blok)) { out[m[1]] = {}; continue; }
    // zagnieżdżone obiekty (shadowOffset) — wycinamy, żeby nie mylić kluczy
    const plaski = blok.replace(/\{[^{}]*\}/g, '0');
    const styl: Styl = {};
    // ⭐ rozwinięcia `...skew.stripe` — najpierw one, potem własne właściwości,
    // bo własne mają nadpisywać rozwinięte (tak samo jak w JavaScripcie)
    for (const sp of blok.matchAll(/\.\.\.([A-Za-z_][A-Za-z0-9_.]*)/g)) {
      Object.assign(styl, obiekty[sp[1]] ?? out[sp[1]] ?? {});
    }
    Object.assign(styl, wlasciwosci(plaski));
    out[m[1]] = styl;
    re.lastIndex = k;
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════
// 4. SZACUNEK WYSOKOŚCI
// ═════════════════════════════════════════════════════════════════════
const num = (s: Styl | undefined, ...klucze: string[]): number => {
  if (!s) return 0;
  for (const k of klucze) { const v = s[k]; if (typeof v === 'number') return v; }
  return 0;
};

type Kontekst = {
  src: string;
  style: Record<string, Styl>;
  komponent: (nazwa: string) => { src: string; korzen: Wezel | null; style: Record<string, Styl> } | null;
  niewyprowadzalne: Set<string>;
  glebokosc: number;
};

/** Style przypisane elementowi przez `style={styles.x}` / `style={[styles.x, …]}`. */
function styleWezla(w: Wezel, ctx: Kontekst): Styl {
  const naglowek = ctx.src.slice(w.poz, w.otwKoniec);
  const zebrane: Styl = {};
  for (const m of naglowek.matchAll(/styles\.([A-Za-z0-9_]+)/g)) Object.assign(zebrane, ctx.style[m[1]] ?? {});
  // style wpisane wprost: style={{ marginTop: 8 }}
  for (const m of naglowek.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(-?\d+(?:\.\d+)?)/g)) zebrane[m[1]] = Number(m[2]);
  return zebrane;
}

/** Ile znaków tekstu niesie ten węzeł (treść JSX + wyrażenia jako `ZNAKI_NA_WYRAZENIE`). */
function dlugoscTekstu(w: Wezel, ctx: Kontekst): number {
  const wnetrze = ctx.src.slice(w.otwKoniec, Math.max(w.otwKoniec, w.koniec));
  const bezZnacznikow = wnetrze.replace(/<[^>]*>/g, '');
  const bezKomentarzy = bezZnacznikow.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');
  let n = 0;
  let reszta = bezKomentarzy;
  const wyr = reszta.match(/\{[^{}]*\}/g) ?? [];
  n += wyr.length * ZNAKI_NA_WYRAZENIE;
  reszta = reszta.replace(/\{[^{}]*\}/g, '');
  n += reszta.replace(/\s+/g, ' ').trim().length;
  return n;
}

function wysokoscTekstu(w: Wezel, ctx: Kontekst, szer: number): number {
  const s = styleWezla(w, ctx);
  const fs = num(s, 'fontSize') || DOMYSLNY_FONT;
  const lh = num(s, 'lineHeight') || Math.round(fs * INTERLINIA * 10) / 10;
  const wewSzer = Math.max(40, szer - num(s, 'paddingHorizontal') * 2 - num(s, 'paddingLeft') - num(s, 'paddingRight'));
  const znaki = dlugoscTekstu(w, ctx);
  let linie = Math.max(1, Math.ceil((znaki * fs * EM_NA_ZNAK) / wewSzer));
  const nol = /numberOfLines=\{(\d+)\}/.exec(ctx.src.slice(w.poz, w.otwKoniec));
  if (nol) linie = Math.min(linie, Number(nol[1]));
  return linie * lh + marginesyIPaddingi(s);
}

function marginesyIPaddingi(s: Styl): number {
  const pv = num(s, 'paddingVertical');
  const p = num(s, 'padding');
  const mv = num(s, 'marginVertical');
  return num(s, 'marginTop') + num(s, 'marginBottom') + mv * 2
    + num(s, 'paddingTop') + num(s, 'paddingBottom') + pv * 2 + p * 2
    + num(s, 'borderTopWidth') + num(s, 'borderBottomWidth') + num(s, 'borderWidth') * 2;
}

const PUSTE = new Set(['RefreshControl', 'StatusBar', 'Modal', 'ActivityIndicator']);

/**
 * Prymitywy React Native i klocki bez własnego pliku w repozytorium. ⚠️ To NIE
 * jest lista, która może cicho zardzewieć (O69): komponent spoza tej listy
 * i bez pliku w repozytorium ląduje w `niewyprowadzalne` i jest wymieniany
 * z nazwy w raporcie — nie ginie po cichu.
 */
const PRYMITYWY = new Set([
  'View', 'Text', 'ScrollView', 'SafeAreaView', 'TouchableOpacity', 'TouchableHighlight',
  'TouchableWithoutFeedback', 'Pressable', 'Fragment', 'Image', 'ImageBackground',
  'KeyboardAvoidingView', 'FlatList', 'SectionList', 'Switch', 'Animated',
]);
/** Klocki o znanej, stałej wysokości — wpisane raz, z powodem. */
const STALE_WYSOKOSCI: Record<string, number> = {
  TextInput: 48,   // minimalna wysokość dotknięcia (constants/theme.ts)
  Ionicons: 24,    // domyślny rozmiar ikony
  Slider: 40,
  Picker: 52,
};

function wysokoscWezla(w: Wezel, ctx: Kontekst, szer: number): number {
  if (w.nazwa === '{}') {
    // Wyrażenie: bierzemy NAJWYŻSZĄ gałąź (worst case) — `a ? <X/> : <Y/>`.
    const dz = dzieciWyrazenia(w, ctx);
    if (dz.length === 0) return 0;
    return Math.max(...dz.map((d) => wysokoscWezla(d.w, d.ctx, szer)));
  }
  if (PUSTE.has(w.nazwa)) return 0;

  const s = styleWezla(w, ctx);
  // ⛔ Element wyjęty z układu (`position: 'absolute'`) NIE PODNOSI ekranu.
  // Wszystkie krechy kart (`...skew.stripe`) są właśnie takie — liczenie ich
  // dokładało po 44 dp za kartę do liczby, na podstawie której Kuba ma
  // decydować, co zdjąć z ekranu.
  if (s.position === 'absolute') return 0;
  const dodatek = marginesyIPaddingi(s);
  const wewSzer = Math.max(
    40,
    szer - num(s, 'paddingHorizontal') * 2 - num(s, 'padding') * 2 - num(s, 'paddingLeft') - num(s, 'paddingRight'),
  );

  const h = num(s, 'height');
  if (h) return h + num(s, 'marginTop') + num(s, 'marginBottom') + num(s, 'marginVertical') * 2;

  if (w.nazwa === 'Text') return wysokoscTekstu(w, ctx, szer);

  if (STALE_WYSOKOSCI[w.nazwa] !== undefined) return STALE_WYSOKOSCI[w.nazwa] + dodatek;

  // Komponent z repozytorium — wchodzimy do jego pliku (O75: czytamy plik, nie atrapę)
  if (/^[A-Z]/.test(w.nazwa) && !PRYMITYWY.has(w.nazwa)) {
    if (ctx.glebokosc < MAKS_ZAGNIEZDZENIE) {
      const k = ctx.komponent(w.nazwa);
      if (k?.korzen) {
        const pod: Kontekst = { ...ctx, src: k.src, style: k.style, glebokosc: ctx.glebokosc + 1 };
        return wysokoscWezla(k.korzen, pod, szer) + dodatek;
      }
    }
    ctx.niewyprowadzalne.add(w.nazwa);
    return NIEWYPROWADZALNY_DP + dodatek;
  }

  const wiersz = s.flexDirection === 'row';
  const dzieci = w.dzieci.map((d) => wysokoscWezla(d, ctx, wewSzer));
  const suma = dzieci.length === 0 ? 0 : wiersz ? Math.max(...dzieci) : dzieci.reduce((a, b) => a + b, 0);
  // element bez dzieci, ale z własną treścią tekstową (np. <TouchableOpacity>tekst)
  const wlasnyTekst = dzieci.length === 0 && dlugoscTekstu(w, ctx) > 0 ? wysokoscTekstu(w, ctx, wewSzer) : 0;
  const min = num(s, 'minHeight');
  return Math.max(min, Math.max(suma, wlasnyTekst) + dodatek);
}

// ═════════════════════════════════════════════════════════════════════
// 5. NAZWA POZYCJI — słowami, które stoją na ekranie
// ═════════════════════════════════════════════════════════════════════
function nazwijPozycje(w: Wezel, ctx: Kontekst): string {
  const naglowek = ctx.src.slice(w.poz, w.otwKoniec);

  // A. ETYKIETA — czym ta rzecz jest w kodzie ekranu
  let etykieta = '';
  if (/^[A-Z]/.test(w.nazwa) && !PRYMITYWY.has(w.nazwa)) etykieta = `<${w.nazwa}>`;
  else {
    const styl = /styles\.([A-Za-z0-9_]+)/.exec(naglowek);
    if (styl) etykieta = styl[1];
    else if (w.nazwa) etykieta = w.nazwa;
  }

  // B. TREŚĆ — co zawodnik na tej rzeczy czyta. ⚠️ Szukamy WYŁĄCZNIE w środku,
  // za znacznikiem otwierającym: `style={styles.x}` w atrybutach to nie treść.
  let tresc = '';
  const srodek = ctx.src.slice(w.otwKoniec, Math.max(w.otwKoniec, w.koniec));
  const tekst = /<Text[^>]*>[\s\n]*([^<>{}\s][^<>{}]{2,})/.exec(srodek);
  const stala = /\{\s*([A-Z][A-Z0-9_]{4,})\s*\}/.exec(srodek);
  const zmienna = /\{\s*(?!styles\.)([a-z][A-Za-z0-9_.]{2,})\s*\}/.exec(srodek);
  const wlasny = /^[\s\n]*([^<>{}\s][^<>{}]{2,})/.exec(srodek);
  const pierwsze = [
    wlasny ? { i: -1, s: `„${skroc(wlasny[1])}"` } : null,
    tekst ? { i: tekst.index, s: `„${skroc(tekst[1])}"` } : null,
    stala ? { i: stala.index, s: `«${stala[1]}»` } : null,
    zmienna ? { i: zmienna.index, s: `{${zmienna[1]}}` } : null,
  ].filter(Boolean).sort((a, b) => a!.i - b!.i)[0];
  if (pierwsze) tresc = pierwsze.s;

  const razem = [etykieta, tresc].filter((x) => x).join(' · ');
  return razem || w.nazwa || '(bez nazwy)';
}

const skroc = (s: string) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > 58 ? `${t.slice(0, 57)}…` : t;
};

// ═════════════════════════════════════════════════════════════════════
// 6. WEJŚCIE PUBLICZNE
// ═════════════════════════════════════════════════════════════════════
export type Pozycja = {
  /** Numer po kolei, od góry ekranu. */
  nr: number;
  /** Co to jest — słowami z ekranu. */
  nazwa: string;
  wysokoscDp: number;
  goraDp: number;
  dolDp: number;
  /** Czy zawodnik zobaczy to bez ani jednego przewinięcia (cała pozycja). */
  nadZgieciem: boolean;
  /** Rozpis wnętrza — jeden poziom w głąb, materiał dla fazy hierarchii. */
  czesci: Pozycja[];
  /** Czy to jeden wiersz listy — wtedy prawdziwa wysokość jest WIĘKSZA. */
  lista: boolean;
};

export type PomiarEkranu = {
  plik: string;
  pozycje: Pozycja[];
  /** Ile rzeczy zawodnik widzi w CAŁOŚCI przed przewinięciem. */
  nadZgieciem: number;
  /** Ile rzeczy jest pod zgięciem (w tym przecięte zgięciem). */
  podZgieciem: number;
  wysokoscRazemDp: number;
  /** Nazwy komponentów, których wysokości NIE dało się wyprowadzić z repozytorium. */
  niewyprowadzalne: string[];
};

function znajdzKorzenRender(src: string): { korzen: Wezel | null; drzewo: Wezel[] } {
  const tokeny = tokenizuj(src, 0, src.length);
  const drzewo = zbudujDrzewo(tokeny, src);
  // Korzeń pomiaru: pierwszy przewijalny pojemnik; bez niego — pierwszy element
  // najwyższego poziomu o największej liczbie dzieci (czyli treść ekranu).
  let najlepszy: Wezel | null = null;
  const chodz = (w: Wezel) => {
    if (w.nazwa === 'ScrollView' || w.nazwa === 'FlatList') { if (!najlepszy) najlepszy = w; return; }
    w.dzieci.forEach(chodz);
  };
  drzewo.forEach(chodz);
  if (!najlepszy) {
    let best: Wezel | null = null;
    const chodz2 = (w: Wezel) => {
      if (!best || w.dzieci.length > best.dzieci.length) best = w;
      w.dzieci.forEach(chodz2);
    };
    drzewo.forEach(chodz2);
    najlepszy = best;
  }
  return { korzen: najlepszy, drzewo };
}

/**
 * ⭐ SPŁASZCZANIE — bo zawodnik nie liczy węzłów drzewa, tylko RZECZY.
 *
 * `{warunek && (<>karta A · karta B · karta C</>)}` to w drzewie JEDEN węzeł,
 * a na ekranie TRZY rzeczy. Ta funkcja rozkłada opakowania, które nic same
 * nie rysują:
 *   • wyrażenie `{…}` — schodzimy w NAJWYŻSZĄ gałąź (worst case; `a ? X : Y`
 *     to ekran z wyższym z dwojga, bo taki ekran zawodnik może zobaczyć),
 *   • fragment `<>` / `<Fragment>` — rozkładamy na dzieci,
 *   • `{/* komentarz *\/}` — znika, bo nic nie rysuje.
 */
export type Kandydat = { w: Wezel; ctx: Kontekst; lista?: boolean };

function rozbij(k: Kandydat, szer: number): Kandydat[] {
  const { w, ctx } = k;
  if (tylkoKomentarz(w, ctx.src)) return [];
  if (czystyPojemnik(w, ctx)) return w.dzieci.flatMap((d) => rozbij({ w: d, ctx }, szer));
  if (w.nazwa === '{}') {
    const dz = dzieciWyrazenia(w, ctx);
    if (dz.length === 0) return [];
    let best = dz[0];
    let bestH = -1;
    for (const d of dz) {
      const h = wysokoscWezla(d.w, d.ctx, szer);
      if (h > bestH) { bestH = h; best = d; }
    }
    // ⚠️ `{cos.map(...)}` — z drzewa da się wyprowadzić JEDEN wiersz listy,
    // nie ich liczbę. Nie zgadujemy jej: pozycja dostaje znacznik LISTA
    // i wiadomo, że prawdziwy ekran jest WYŻSZY, nigdy niższy.
    // ⚠️ Tylko PRZEDROSTEK wyrażenia — tekst przed wybraną gałęzią JSX.
    // Szukanie `.map(` w całym poddrzewie oznaczałoby jako listę wszystko,
    // co gdziekolwiek głębiej ma pętlę.
    const czyLista = /\.map\s*\(/.test(ctx.src.slice(w.poz, best.w.poz));
    return rozbij(best, szer).map((r) => (czyLista ? { ...r, lista: true } : r));
  }
  if (w.nazwa === '' || w.nazwa === 'Fragment') {
    return w.dzieci.flatMap((d) => rozbij({ w: d, ctx }, szer));
  }
  return [k];
}

/**
 * ⭐ Dzieci wyrażenia `{…}`. Zwykle to po prostu JSX w środku. Ale ekran
 * `kalendarz.tsx` pisze `{zakladka === 'tydzien' ? renderTydzien() : renderListy()}`
 * — czyli CAŁA jego treść siedzi w funkcjach pomocniczych. Pomiar, który tego
 * nie rozwija, oddaje 4 pozycje i 128 dp na ekranie o objętości 67 kB, czyli
 * liczbę bezużyteczną i wyglądającą na dobrą. Dlatego wywołania funkcji
 * z tego samego pliku są rozwijane, a te, których nie da się rozwinąć,
 * lądują w `niewyprowadzalne` — z nazwy.
 */
function dzieciWyrazenia(w: Wezel, ctx: Kontekst): Kandydat[] {
  if (w.dzieci.length > 0) return w.dzieci.map((d) => ({ w: d, ctx }));
  if (ctx.glebokosc >= MAKS_ZAGNIEZDZENIE) return [];
  const tresc = ctx.src.slice(w.poz, w.koniec);
  const out: Kandydat[] = [];
  // ⚠️ Także wywołania Z ARGUMENTAMI: `{renderRow('/diagnoza', 'Wynik diagnozy', …)}`.
  // Ekran `ja.tsx` rysuje tak WSZYSTKIE swoje wejścia — pomiar, który widzi
  // tylko `render…()` bez argumentów, oddaje same nagłówki sekcji i ani jednego
  // wiersza menu. Identyfikator, którego nie da się rozwinąć do drzewa JSX,
  // jest po prostu pomijany (to zwykłe `Math.round(` i podobne).
  const widziane = new Set<string>();
  for (const m of tresc.matchAll(/\b([a-zA-Z_][A-Za-z0-9_]*)\s*\(/g)) {
    if (widziane.has(m[1] + m.index)) continue;
    widziane.add(m[1] + m.index);
    const k = ctx.komponent(m[1]);
    if (k?.korzen) {
      out.push({ w: k.korzen, ctx: { ...ctx, src: k.src, style: k.style, glebokosc: ctx.glebokosc + 1 } });
    } else if (/^render[A-Z]/.test(m[1])) {
      ctx.niewyprowadzalne.add(`${m[1]}()`);
    }
  }
  return out;
}

/**
 * Czy to `<View>` istniejące wyłącznie po to, żeby coś odsunąć — bez tła,
 * ramki, zaokrąglenia i wypełnienia. Taki pojemnik nie jest RZECZĄ na ekranie
 * i zawodnik go nie widzi; jego dzieci są rzeczami.
 * ⚠️ Świadomy koszt: marginesy samego pojemnika wypadają z sumy (rząd 24 dp
 * na pojemnik). Kierunek błędu jest w DÓŁ, więc ekran jest zawsze co najmniej
 * tak wysoki, jak mówi ten moduł.
 */
const WIDOCZNE_CECHY = [
  'backgroundColor', 'borderWidth', 'borderTopWidth', 'borderBottomWidth', 'borderLeftWidth',
  'borderRightWidth', 'borderRadius', 'padding', 'paddingVertical', 'paddingTop',
  'paddingBottom', 'height', 'minHeight',
];
function czystyPojemnik(w: Wezel, ctx: Kontekst): boolean {
  if (w.nazwa !== 'View' || w.dzieci.length === 0) return false;
  const s = styleWezla(w, ctx);
  return !WIDOCZNE_CECHY.some((k) => s[k] !== undefined);
}

/** Czy ten węzeł to wyłącznie komentarz `{/* … *\/}` — nic nie rysuje. */
function tylkoKomentarz(w: Wezel, src: string): boolean {
  if (w.nazwa !== '{}') return false;
  const t = src.slice(w.poz + 1, Math.max(w.poz + 1, w.koniec - 1)).trim();
  return /^\/\*[\s\S]*\*\/$/.test(t);
}

/**
 * ⭐ GŁÓWNE WEJŚCIE. Zmierz ekran z pliku.
 * ⛔ O76: brak pliku to PORAŻKA Z NAZWĄ, nie zero pozycji.
 */
export function zmierzEkran(sciezka: string): PomiarEkranu {
  if (!existsSync(sciezka)) {
    throw new Error(`Nie znajduję pliku ekranu: ${sciezka} — bez pliku nie ma pomiaru, `
      + 'a pomiar z pustki byłby liczbą udającą wiedzę.');
  }
  return zmierzEkranZTekstu(sciezka, readFileSync(sciezka, 'utf8'), dirname(sciezka));
}

/**
 * Ten sam pomiar, ale z tekstu — po to, żeby dało się zmierzyć STARĄ wersję
 * ekranu wyjętą z `git show` bez zapisywania jej na dysk (test historyczny O70).
 * `katalog` służy wyłącznie do znalezienia plików komponentów.
 */
export function zmierzEkranZTekstu(nazwaPliku: string, src: string, katalog: string): PomiarEkranu {
  const obiekty = zbierzObiekty(src, katalog);
  const style = czytajStyle(src, obiekty);
  const niewyprowadzalne = new Set<string>();
  const cacheKomponentow = new Map<string, { src: string; korzen: Wezel | null; style: Record<string, Styl> } | null>();

  const ctx: Kontekst = {
    src,
    style,
    niewyprowadzalne,
    glebokosc: 0,
    komponent: (nazwa) => szukajKomponentu(nazwa, src, katalog, cacheKomponentow),
  };

  const { korzen } = znajdzKorzenRender(src);
  if (!korzen) {
    throw new Error(`Nie znajduję drzewa komponentów w ${nazwaPliku} — plik nie wygląda na ekran.`);
  }

  const szerWew = (() => {
    const naglowek = src.slice(korzen.poz, korzen.otwKoniec);
    const pad = /padding:\s*(\d+)/.exec(naglowek);
    const padH = /paddingHorizontal:\s*(\d+)/.exec(naglowek);
    const p = Number(pad?.[1] ?? padH?.[1] ?? 0);
    return SZEROKOSC_ODNIESIENIA_DP - p * 2;
  })();

  const { pozycje, koniecDp } = pozycjeZDzieci(
    (korzen as Wezel).dzieci.map((d) => ({ w: d, ctx })), szerWew, 0, 0,
  );

  const nad = pozycje.filter((p) => p.nadZgieciem).length;
  return {
    plik: nazwaPliku,
    pozycje,
    nadZgieciem: nad,
    podZgieciem: pozycje.length - nad,
    wysokoscRazemDp: koniecDp,
    niewyprowadzalne: [...niewyprowadzalne].sort(),
  };
}

/**
 * Rozkłada dzieci pojemnika na pozycje ułożone jedna pod drugą.
 * `poziom === 0` to odpowiedź na pytanie D1 („ile rzeczy widzi zawodnik").
 * `poziom === 1` rozpisuje WNĘTRZE każdej pozycji — materiał dla fazy
 * hierarchii, żeby dało się zobaczyć, co siedzi w karcie wyższej niż ekran.
 */
function pozycjeZDzieci(
  dzieci: Kandydat[], szer: number, odDp: number, poziom: number,
): { pozycje: Pozycja[]; koniecDp: number } {
  const pozycje: Pozycja[] = [];
  let kursor = odDp;
  let nr = 0;
  for (const k of dzieci.flatMap((x) => rozbij(x, szer))) {
    const h = Math.round(wysokoscWezla(k.w, k.ctx, szer) * 10) / 10;
    if (h === 0) continue;
    nr++;
    const gora = Math.round(kursor * 10) / 10;
    const dol = Math.round((kursor + h) * 10) / 10;
    const s = styleWezla(k.w, k.ctx);
    const wewSzer = Math.max(40, szer - num(s, 'paddingHorizontal') * 2 - num(s, 'padding') * 2);
    const wewOd = gora + num(s, 'paddingTop') + num(s, 'paddingVertical') + num(s, 'padding');
    const czesci = poziom < 1 && k.w.dzieci.length > 0
      ? pozycjeZDzieci(k.w.dzieci.map((d) => ({ w: d, ctx: k.ctx })), wewSzer, wewOd, poziom + 1).pozycje
      : [];
    pozycje.push({
      nr, nazwa: nazwijPozycje(k.w, k.ctx), wysokoscDp: h, goraDp: gora, dolDp: dol,
      nadZgieciem: dol <= WIDOCZNE_NAD_ZGIECIEM_DP, czesci, lista: !!k.lista,
    });
    kursor += h;
  }
  return { pozycje, koniecDp: Math.round(kursor * 10) / 10 };
}

function szukajKomponentu(
  nazwa: string,
  src: string,
  katalog: string,
  cache: Map<string, { src: string; korzen: Wezel | null; style: Record<string, Styl> } | null>,
): { src: string; korzen: Wezel | null; style: Record<string, Styl> } | null {
  if (cache.has(nazwa)) return cache.get(nazwa) ?? null;
  let wynik: { src: string; korzen: Wezel | null; style: Record<string, Styl> } | null = null;

  // 1. funkcja zdefiniowana w tym samym pliku
  const lokalna = new RegExp(`(?:function\\s+${nazwa}\\s*\\(|const\\s+${nazwa}\\s*=\\s*\\()`).exec(src);
  if (lokalna) {
    let ciało = wytnijCialo(src, lokalna.index);
    // jeden skok dalej, gdy ciałem było wywołanie kolejnej funkcji rysującej
    if (ciało?.startsWith('@')) {
      const dalejNazwa = ciało.slice(1);
      const dalejDekl = new RegExp(`(?:function\\s+${dalejNazwa}\\s*\\(|const\\s+${dalejNazwa}\\s*=\\s*\\()`).exec(src);
      ciało = dalejDekl ? wytnijCialo(src, dalejDekl.index) : null;
      if (ciało?.startsWith('@')) ciało = null;
    }
    if (ciało) {
      const tok = tokenizuj(ciało, 0, ciało.length);
      const drzewo = zbudujDrzewo(tok, ciało);
      wynik = { src: ciało, korzen: drzewo[0] ?? null, style: czytajStyle(src, zbierzObiekty(src, katalog)) };
    }
  }

  // 2. import z repozytorium
  if (!wynik) {
    const imp = new RegExp(`import\\s+(?:${nazwa}|\\{[^}]*\\b${nazwa}\\b[^}]*\\})[^;]*from\\s+'([^']+)'`).exec(src);
    const rel = imp?.[1];
    if (rel && rel.startsWith('.')) {
      for (const ext of ['.tsx', '.ts', '/index.tsx']) {
        const p = resolve(join(katalog, rel + ext));
        if (existsSync(p)) {
          const tekst = readFileSync(p, 'utf8');
          const { korzen } = znajdzKorzenRender(tekst);
          wynik = { src: tekst, korzen, style: czytajStyle(tekst, zbierzObiekty(tekst, dirname(p))) };
          break;
        }
      }
    }
  }

  cache.set(nazwa, wynik);
  return wynik;
}

/**
 * Ciało funkcji od jej deklaracji. ⚠️ NIE wolno wziąć pierwszej `{` po nazwie —
 * to bywa rozpakowanie argumentów (`function WgladPozycji({ wglad }: …)`),
 * i właśnie na tym ten pomiar raz już się wyłożył. Najpierw przeskakujemy
 * nawiasy argumentów, dopiero potem szukamy klamry ciała.
 */
function wytnijCialo(src: string, od: number): string | null {
  // 1. przeskocz nawiasy argumentów
  const otwNawias = src.indexOf('(', od);
  let po = od;
  if (otwNawias !== -1) {
    let n = 0;
    for (let i = otwNawias; i < src.length; i++) {
      if (src[i] === '(') n++;
      else if (src[i] === ')') { n--; if (n === 0) { po = i + 1; break; } }
    }
  }
  // 2. strzałka z ciałem w nawiasie: `=> ( <View/> )` — tak wygląda KAŻDY
  //    wiersz menu na ekranie „Ja"; szukanie klamry złapałoby `style={…}`
  const strzalka = src.indexOf('=>', po);
  const klamra = src.indexOf('{', po);
  if (strzalka !== -1 && (klamra === -1 || strzalka < klamra)) {
    let i = strzalka + 2;
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src[i] === '(') return zbalansowane(src, i, '(', ')');
    if (src[i] === '{') return zbalansowane(src, i, '{', '}');
    // ⚠️ `const renderRow = (…) => renderRowRaw(…)` — ciałem jest WYWOŁANIE
    // innej funkcji rysującej. Bez tego skoku dziesięć wierszy menu ekranu
    // „Ja" liczyłoby się jako zero i zniknęłoby z listy po cichu.
    const dalej = /^([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec(src.slice(i, i + 80));
    if (dalej) return `@${dalej[1]}`;
    return null;
  }
  if (klamra === -1) return null;
  return zbalansowane(src, klamra, '{', '}');
}

function zbalansowane(src: string, otw: number, a: string, b: string): string | null {
  let g = 0;
  for (let i = otw; i < src.length; i++) {
    if (src[i] === a) g++;
    else if (src[i] === b) { g--; if (g === 0) return src.slice(otw + 1, i); }
  }
  return null;
}

/** Wiersz raportu — jedno miejsce, żeby narzędzie i selftest mówiły tak samo. */
export function opiszPozycje(p: Pozycja): string {
  const znak = p.nadZgieciem ? '👁' : (p.goraDp < WIDOCZNE_NAD_ZGIECIEM_DP ? '✂' : '↓');
  return `  ${znak} ${String(p.nr).padStart(2)}. ${String(Math.round(p.wysokoscDp)).padStart(5)} dp  `
    + `(${String(Math.round(p.goraDp)).padStart(5)}–${String(Math.round(p.dolDp)).padStart(5)})  `
    + `${p.nazwa}${p.lista ? '  [LISTA — 1 wiersz z wielu]' : ''}`;
}

/** Ile pozycji przecina zgięcie: zaczyna się nad nim, kończy pod. */
export function przeciete(p: PomiarEkranu): number {
  return p.pozycje.filter((x) => !x.nadZgieciem && x.goraDp < WIDOCZNE_NAD_ZGIECIEM_DP).length;
}
