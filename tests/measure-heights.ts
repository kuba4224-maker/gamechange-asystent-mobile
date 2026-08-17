// WIEDZA B4 08.08.2026 — NOWY PLIK. Pomiar wysokości ekranów Dziś i Ja.
// ZMIANA OBRAZU B5 08.08.2026 — doszedł trzeci ekran (biblioteka na własnej
// trasie) i „Ja" liczy się bez sekcji materiałów, za to z czwartym wejściem.
//
//   npx tsx tests/measure-heights.ts
//
// PO CO TO ISTNIEJE NA DYSKU, A NIE W RAPORCIE. Runda 3 wywalczyła jedną
// konkretną rzecz: przyciski feedbacku rekomendacji weszły NAD ZGIĘCIE także na
// najmniejszym telefonie (607 → 489 dp, zapas 109 dp). Skrypt, który to policzył,
// żył wyłącznie w treści raportu — więc następna sesja, chcąc sprawdzić, czy
// zdobyczy nie straciła, musiałaby go napisać od nowa i policzyć trochę inaczej.
// To ten sam wzorzec co N7 (zniknięte testy). Od tej rundy skrypt leży na dysku
// i liczy z tych samych stałych, którymi posługują się ekrany.
//
// ⚠️ TO JEST OBLICZENIE Z ARKUSZY STYLÓW, NIE POMIAR NA URZĄDZENIU.
// Założenia, wypisane wprost, bo od nich zależy wynik:
//   • wysokość linii = `lineHeight` ze stylu, a gdy go nie ma → `fontSize × 1,25`
//     (React Native dla Inter i BarlowCondensed daje 1,2–1,3; 1,25 to środek,
//     świadomie nie optymistyczny) — ta sama reguła co w rundzie 3;
//   • średnia szerokość znaku Inter Regular = 0,50 em (ostrożny GÓRNY szacunek;
//     przy zaniżeniu wynik byłby zbyt optymistyczny, a to jest ten kierunek
//     błędu, którego tu nie wolno popełnić);
//   • scenariusz: zawodnik z aktywnym Celem, aktywnym Blokiem Skupienia
//     i świeżą rekomendacją (treść 3 linie, uzasadnienie 2 linie).
// Sekcje 1–6 ekranu Dziś są przepisane z raportu rundy 3 i tą rundą NIE
// ZMIENIONE — dlatego stoją tu jako stałe, a nie są liczone od nowa.
import {
  MATERIALS, unlockedMaterials, libraryCountLine, libraryEntryHint,
  LIBRARY_NO_DOWNLOAD_TEXT, LIBRARY_SCREEN_INTRO,
} from '../lib/materials';
import { HINT_EYEBROW, HINT_TABLE_MISSING_TEXT } from '../lib/componentHints';
// PORZADEK R8 08.08.2026 — teksty pytania o sesję Bloku brane z tego samego
// modułu, którym rysuje je dziennik (zero przepisywania co do znaku ręcznie).
import { blockSessionQuestion } from '../lib/focusBlockJournalLink';

import { join as joinPath, dirname as dirName } from 'node:path';
import { fileURLToPath as fileUrl } from 'node:url';

/** Korzeń repozytorium — ten plik leży w `tests/`. */
const KORZEN = dirName(dirName(fileUrl(import.meta.url)));

const lh = (fs: number, given?: number) => given ?? Math.round(fs * 1.25 * 10) / 10;
const lines = (text: string, availDp: number, fs: number, em = 0.5) =>
  Math.max(1, Math.ceil((text.length * fs * em) / availDp));

type Screen = { name: string; w: number; visible: number };
const SCREENS: Screen[] = [
  { name: 'mały / iPhone SE (320 dp szer., 598 dp widoczne)', w: 320, visible: 598 },
  { name: 'iPhone 14 (390 dp szer., 714 dp widoczne)', w: 390, visible: 714 },
  { name: 'typowy Android 6,1" (412 dp szer., 764 dp widoczne)', w: 412, visible: 764 },
];

// Szerokość tekstu w karcie rekomendacji: ekran − padding ScrollView 20×2
// − padding karty 20×2.
const recTextWidth = (w: number) => w - 40 - 40;
// Szerokość tekstu w karcie materiału: ekran − padding ScrollView 20×2
// − padding karty 16×2 − ramka.
const matTextWidth = (w: number) => w - 40 - 32 - 2;

// ═══════════════════════════════════════════════════════════
// EKRAN DZIŚ
// ═══════════════════════════════════════════════════════════
// ⚠️⚠️ MODEL RĘCZNY — STAN EKRANU Z 08.08.2026, NIE POMIAR DZISIEJSZEGO EKRANU.
// Ta lista pięciu bloków została wpisana ręcznie 08.08.2026 i od tamtej pory
// NIE ZMIENIŁA SIĘ ANI RAZU, choć `dzis.tsx` urósł z 40 439 B do 213 914 B
// i doszły do niego m.in. kolejka podania i karta głosu. ZOSTAJE WYŁĄCZNIE
// PO TO, żeby dało się porównać dzisiejszy ekran ze zdobyczą rundy 3.
// ⛔ NIE DOPISUJ TU NICZEGO. Prawdziwy pomiar stoi na końcu tego pliku
// (`lib/wysokoscEkranu.ts`) i przemiata drzewo komponentów z pliku ekranu.
// Długość tej listy jest przybita zapadką w `lib/wysokoscEkranu.selftest.ts`.
const DZIS_DO_PRZYCISKOW: [string, number][] = [
  ['padding górny', 20],
  ['data + „Dziś"', 83],
  ['hero Celu (nazwa + wskaźnik + pasek)', 107],
  ['etykieta „CO DZIŚ ZROBIĆ"', 48],
  ['karta rekomendacji — treść do przycisków', 232],
];
const PRZYCISKI = 104; // dwa rzędy po 48 dp + odstęp 8
const BUTTONS_TOP = DZIS_DO_PRZYCISKOW.reduce((a, [, v]) => a + v, 0);

/** Wysokość bloku podpowiedzi pod przyciskami, dla danego tekstu i szerokości. */
function hintBlockHeight(text: string, w: number, quiet = false) {
  let h = 16 + 14 + 1;            // marginTop + paddingTop + kreska
  h += lh(11) + 6;                // „Z materiałów Gamechange · Moc, s. 8"
  if (quiet) return h + lines(text, recTextWidth(w), 13) * 19;
  h += lh(13) + 4;                // „Do zrobienia" / „Warto wiedzieć"
  return h + lines(text, recTextWidth(w), 14) * 20;
}

// Podpowiedzi przepisane co do znaku z migracji
// claude/PODPOWIEDZI_Z_MATERIALOW_A.md — najkrótsza, dwie typowe i najdłuższa.
const HINTS: [string, string][] = [
  ['najkrótsza w korpusie (Stan mentalny, s. 6)',
    'Grasz dla siebie. Nie dla trenera, nie dla kibiców, nie żeby kogoś zadowolić.'],
  ['typowa (Moc, s. 8)',
    'Każde powtórzenie w bloku plyometrii wykonuj z maksymalną eksplozją, a między seriami odpoczywaj 60–120 sekund. W tym bloku nie ma miejsca na zmęczenie.'],
  ['typowa (Regeneracja, s. 4)',
    'Bezpośrednio po treningu, zanim zrobisz cokolwiek innego, usiądź lub połóż się na 3–5 minut. Wdech nosem 4 sekundy, zatrzymanie 2, wydech ustami 6. Ręka na brzuchu ma się unosić, nie klatka.'],
  ['najdłuższa w korpusie (Fizyczność, s. 3–4, 7)',
    'Zaplanuj dwa treningi siłowe w tygodniu. Jeden symetryczny z progresją ciężaru (przysiad, martwy ciąg, wyciskanie, podciąganie), drugi jednostronny z naciskiem na jakość ruchu (przysiad wykroczny, martwy ciąg jednonóż, wyciskanie jednorącz, wiosłowanie).'],
];

console.log('══════════════════════════════════════════════════════════════');
console.log('EKRAN DZIŚ — MODEL RĘCZNY Z 08.08.2026 (nie jest pomiarem dzisiejszego ekranu)');
console.log('══════════════════════════════════════════════════════════════\n');
let acc = 0;
for (const [n, v] of DZIS_DO_PRZYCISKOW) { acc += v; console.log(`  ${String(acc).padStart(4)} dp  ${n}`); }
console.log(`\n  GÓRA PRZYCISKÓW FEEDBACKU: ${BUTTONS_TOP} dp   (runda 3: 489 dp)`);
console.log('  Blok podpowiedzi stoi POD przyciskami, więc ta liczba się NIE ZMIENIA.\n');
let regres = false;
for (const s of SCREENS) {
  const zapas = s.visible - BUTTONS_TOP;
  if (zapas <= 0) regres = true;
  console.log(`    ${zapas > 0 ? '✅' : '❌'} ${s.name}: zapas ${zapas} dp`);
}

console.log('\n  Wysokość bloku podpowiedzi:');
for (const s of SCREENS) {
  console.log(`\n    ${s.name}`);
  for (const [k, t] of HINTS) {
    const h = Math.round(hintBlockHeight(t, s.w));
    const top = BUTTONS_TOP + PRZYCISKI + 16;
    console.log(`      ${String(h).padStart(4)} dp  ${k}  →  początek na ${top} dp `
      + `(${top < s.visible ? 'widoczny bez scrolla' : `${top - s.visible} dp poniżej zgięcia`})`);
  }
  console.log(`      ${String(Math.round(hintBlockHeight(HINT_TABLE_MISSING_TEXT, s.w, true))).padStart(4)} dp  stan R5 „${HINT_TABLE_MISSING_TEXT.slice(0, 34)}…"`);
}

console.log('\n  WARIANT ODRZUCONY — gdyby blok stał NAD przyciskami:');
for (const s of SCREENS) {
  const nowy = Math.round(BUTTONS_TOP + hintBlockHeight(HINTS[1][1], s.w));
  console.log(`    ${nowy < s.visible ? '✅' : '❌'} ${s.name}: przyciski na ${nowy} dp `
    + `(${nowy < s.visible ? `zapas ${s.visible - nowy} dp` : 'POD ZGIĘCIEM — zdobycz rundy 3 stracona'})`);
}

// ═══════════════════════════════════════════════════════════
// EKRAN JA — PO WYPROWADZCE BIBLIOTEKI + NOWY EKRAN BIBLIOTEKI
// ═══════════════════════════════════════════════════════════
function materialCardHeight(w: number, about: string, why: string, shared?: string) {
  const avail = matTextWidth(w);
  let h = 14 + 14 + 2;                          // paddingVertical + ramka
  h += lh(15) + 4;                              // tytuł
  h += lines(about, avail, 13) * 19 + 8;        // opis
  h += lines(why, avail, 12) * 18;              // „dlaczego akurat to"
  if (shared) h += 8 + lines(shared, avail, 12) * 18;
  return h + 10;                                // marginBottom
}

// Scenariusz: zawodnik z Celem w Mocy, wąskie gardła z diagnozy: Tolerancja
// i Regeneracja. `getRelativeDeficits(scores, 3)` zwraca najwyżej trzy, więc
// biblioteka ma najwyżej 4 pozycje przy jednym Celu.
const LIB = unlockedMaterials({ goalSegmentIds: ['moc'], deficitSegmentIds: ['tolerancja', 'regeneracja'] });
const LIB_WORST = unlockedMaterials({ goalSegmentIds: ['moc'], deficitSegmentIds: ['tolerancja', 'regeneracja', 'techFund'] });

// Wiersz menu: minHeight 48+12, marginBottom 10 → 70 dp. Cztery wejścia
// zamiast trzech, bo doszło „Twoje materiały".
const JA_BASE: [string, number][] = [
  ['padding górny + „Ja"', 84],
  ['hero: skrót profilu z diagnozy', 196],
  ['etykieta „TWÓJ ROZWÓJ"', 52],
  ['CZTERY wejścia (doszło „Twoje materiały")', 280],
];
const JA_TAIL: [string, number][] = [
  ['etykieta „USTAWIENIA"', 52],
  ['jedno wejście (Profil)', 70],
  ['„Wyloguj się"', 80],
  ['padding dolny', 60],
];

console.log('\n══════════════════════════════════════════════════════════════');
console.log('EKRAN JA — po przeprowadzce biblioteki (pozycja M2)');
console.log('══════════════════════════════════════════════════════════════\n');
const JA_TOTAL = [...JA_BASE, ...JA_TAIL].reduce((a, [, v]) => a + v, 0);
{
  let a = 0;
  for (const [n, v] of [...JA_BASE, ...JA_TAIL]) { a += v; console.log(`    ${String(v).padStart(4)} → ${String(a).padStart(4)}  ${n}`); }
}
console.log('');
for (const s of SCREENS) {
  console.log(`    ${s.name}: ${JA_TOTAL} dp  ·  scroll ${(JA_TOTAL / s.visible).toFixed(2)} ekranu`);
}
console.log('\n    Dla porównania — runda 3: 803 dp · 1,34 ekranu (mały telefon)');
console.log('                     runda 4: 1 353 dp · 2,26 ekranu, najgorszy przypadek 1 578 dp · 2,64');
console.log(`    Podpis wejścia „Twoje materiały": „${libraryEntryHint(LIB.length)}" (${libraryEntryHint(LIB.length).length} znaków)`);

// ── NOWY EKRAN: TWOJE MATERIAŁY ─────────────────────────────
function bibliotekaHeight(w: number, lib: typeof LIB) {
  let h = 20;                                                       // padding górny
  h += lh(32) + 8;                                                  // tytuł „Twoje materiały"
  h += lines(LIBRARY_SCREEN_INTRO, w - 40, 13) * 19 + 24;           // wstęp
  h += lh(12) + 10;                                                 // liczebnik
  for (const u of lib) h += materialCardHeight(w, u.material.about, u.why, u.material.sharedNote);
  h += 2 + lines(LIBRARY_NO_DOWNLOAD_TEXT, w - 40, 12) * 18;        // stopka
  return h + 60;                                                    // padding dolny
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log('EKRAN TWOJE MATERIAŁY — NOWY (trasa chowana, nie zakładka)');
console.log('══════════════════════════════════════════════════════════════\n');
for (const s of SCREENS) {
  const typ = Math.round(bibliotekaHeight(s.w, LIB));
  const worst = Math.round(bibliotekaHeight(s.w, LIB_WORST));
  console.log(`    ${s.name}`);
  console.log(`      ${String(typ).padStart(4)} dp  ${libraryCountLine(LIB.length)}  ·  scroll ${(typ / s.visible).toFixed(2)} ekranu`);
  console.log(`      ${String(worst).padStart(4)} dp  ${libraryCountLine(LIB_WORST.length)} (najgorszy realny)  ·  scroll ${(worst / s.visible).toFixed(2)} ekranu`);
}

// ═══════════════════════════════════════════════════════════
// PRAKTYKA-EKRAN B6 08.08.2026 — DAWKA TREŚCI W BLOKU SKUPIENIA
// ═══════════════════════════════════════════════════════════
// Miara, którą ta runda stawia I OD RAZU SPRAWDZA (rekomendacja B31 z rundy 5:
// każda miara postawiona w raporcie ma dostać swoją linię w tym pliku, inaczej
// następna sesja musi ją odnaleźć i policzyć od nowa).
//
// PYTANIE, NA KTÓRE ODPOWIADA: czy JEDNA dawka mieści się w jednym ekranie.
// Nie chodzi o estetykę — dawka to 2–4 zdania, które zawodnik ma przeczytać
// i wykonać. Jeśli sam „Praktyczny krok" wymaga przewinięcia, to znaczy, że
// pogłębienie albo przypis trzeba zwinąć, a nie że ekran jest „trochę długi".
//
// Blok Skupienia stoi wewnątrz ScrollView ekranu Cele (padding 20×2) i wewnątrz
// karty `wrap` (padding 14×2) — stąd szerokość tekstu.
const doseTextWidth = (w: number) => w - 40 - 28;
const doseSourceWidth = (w: number) => doseTextWidth(w) - 12; // paddingLeft 10 + ramka 2

// Teksty 1:1 z PRZYKŁADU PRAWDZIWEGO REKORDU (RAPORT_ZWROTNY_A_RUNDA_5.md,
// sekcja 11) — ten sam, na którym jedzie lib/contentDose.selftest.ts.
const DOSE_REAL = {
  step: 'Ustaw w telefonie alarm 30 minut przed swoją godziną snu i traktuj go jak sygnał do kończenia dnia, nie jak przypomnienie.',
  curious: 'Stała pora zasypiania synchronizuje wydzielanie melatoniny — organizm zaczyna szykować się do snu zanim się położysz.',
  hint: 'Wyznacz stałą godzinę snu i trzymaj się jej codziennie, także w weekendy. Zasypianie o różnych porach działa na organizm jak ciągła zmiana strefy czasowej.',
  ref: 'Regeneracja, s. 2',
};
// Górna granica z kontraktu: „krok_praktyczny — 2–4 zdania". Cztery długie
// zdania + pogłębienie + najdłuższa podpowiedź z korpusu (Fizyczność, s. 3–4, 7).
const DOSE_WORST = {
  step: 'Zaplanuj dwa treningi siłowe w tygodniu i wpisz je do kalendarza jako stałe punkty, a nie jako coś, co zrobisz, jeśli starczy czasu. '
    + 'Pierwszy niech będzie symetryczny, z progresją ciężaru. Drugi jednostronny, z naciskiem na jakość ruchu, nawet kosztem obciążenia. '
    + 'Między nimi zostaw co najmniej 48 godzin, szczególnie jeśli w tym tygodniu masz mecz.',
  curious: 'Trening jednostronny wyrównuje różnice między nogami, które przy samych ćwiczeniach obunóż potrafią rosnąć latami niezauważone — '
    + 'a to właśnie one stoją za częścią urazów przy zmianie kierunku.',
  hint: 'Zaplanuj dwa treningi siłowe w tygodniu. Jeden symetryczny z progresją ciężaru (przysiad, martwy ciąg, wyciskanie, podciąganie), '
    + 'drugi jednostronny z naciskiem na jakość ruchu (przysiad wykroczny, martwy ciąg jednonóż, wyciskanie jednorącz, wiosłowanie).',
  ref: 'Fizyczność, s. 3–4, 7',
};

const minTouchHeightDp = 48; // constants/theme.ts — ten sam próg dotknięcia co wszędzie

function doseHeight(w: number, d: typeof DOSE_REAL, opts: { curious: boolean; curiousOpen?: boolean; source: boolean; earlier: number }) {
  const avail = doseTextWidth(w);
  let h = 10 + 10 + 1;                       // marginTop + paddingTop + kreska (contentDoseBox)
  h += lh(11) + 8;                           // „Z MATERIAŁÓW DO TEGO BLOKU"
  h += lh(11) + 6;                           // „z 8 sierpnia"
  h += lh(12) + 2;                           // „Praktyczny krok"
  h += lines(d.step, avail, 13) * 18 + 12;   // treść kroku
  // „Dla chętnych" jest ZWINIĘTE domyślnie — kosztuje jeden przycisk, nie tekst.
  // Rozwinięcie liczymy osobno, żeby widać było, ile zawodnik dokłada dotknięciem.
  if (opts.curious) h += minTouchHeightDp;
  if (opts.curiousOpen) h += lines(d.curious, avail, 13) * 18 + 12;
  if (opts.source) {
    h += 2 + 6;                              // marginTop + marginBottom doseSourceBox
    h += lh(11) + 4;                         // „SKĄD TO WIEMY"
    h += lines(d.hint, doseSourceWidth(w), 12) * 17 + 3;
    h += lh(11);                             // „Regeneracja, s. 2"
  }
  h += 4;                                    // marginBottom doseCard
  if (opts.earlier > 0) h += 48 + 2;         // sam przełącznik — lista jest ZWINIĘTA
  return h;
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log('DAWKA TREŚCI W BLOKU SKUPIENIA — NOWA (PRAKTYKA-EKRAN B6)');
console.log('══════════════════════════════════════════════════════════════\n');

const DOSE_SCREEN_LIMIT = 1.0; // jedna dawka ma się mieścić w jednym ekranie
let doseWorstScroll = 0;
for (const s of SCREENS) {
  const sama = Math.round(doseHeight(s.w, DOSE_REAL, { curious: false, source: false, earlier: 0 }));
  const pelna = Math.round(doseHeight(s.w, DOSE_REAL, { curious: true, source: true, earlier: 0 }));
  const zHistoria = Math.round(doseHeight(s.w, DOSE_REAL, { curious: true, source: true, earlier: 2 }));
  const najgorsza = Math.round(doseHeight(s.w, DOSE_WORST, { curious: true, source: true, earlier: 2 }));
  const najgorszaOtwarta = Math.round(doseHeight(s.w, DOSE_WORST, { curious: true, curiousOpen: true, source: true, earlier: 2 }));
  doseWorstScroll = Math.max(doseWorstScroll, najgorsza / s.visible);
  console.log(`    ${s.name}`);
  console.log(`      ${String(sama).padStart(4)} dp  sam „Praktyczny krok" (bez pogłębienia i źródła)  ·  ${(sama / s.visible).toFixed(2)} ekranu`);
  console.log(`      ${String(pelna).padStart(4)} dp  PRAWDZIWY REKORD z kontraktu (krok + „Dla chętnych ▾" + źródło)  ·  ${(pelna / s.visible).toFixed(2)} ekranu`);
  console.log(`      ${String(zHistoria).padStart(4)} dp  to samo + zwinięte „Wcześniej w tym Bloku"  ·  ${(zHistoria / s.visible).toFixed(2)} ekranu`);
  console.log(`      ${String(najgorsza).padStart(4)} dp  NAJGORSZY REALNY, wszystko zwinięte  ·  ${(najgorsza / s.visible).toFixed(2)} ekranu`);
  console.log(`      ${String(najgorszaOtwarta).padStart(4)} dp  ten sam po ROZWINIĘCIU pogłębienia (świadome dotknięcie)  ·  ${(najgorszaOtwarta / s.visible).toFixed(2)} ekranu`);
}
console.log('\n    Zwinięta historia kosztuje dokładnie tyle, co jeden przycisk (48 dp) —');
console.log('    zawodnik z sześcioma dawkami w Bloku ma ten sam ekran, co zawodnik z jedną.');

// Miara postawiona przez ten sam pas w rundzie 4 — teraz sprawdzana, nie tylko
// zapisana. „Ja" jest ekranem wejść; jeśli znów przekroczy 2,5 ekranu, to
// znaczy, że coś do niego wróciło.
const JA_SCROLL_LIMIT = 2.5;
const jaWorstScroll = JA_TOTAL / SCREENS[0].visible;
console.log(`\n    Miara z rundy 4: „Ja" powyżej ${JA_SCROLL_LIMIT} ekranu → biblioteka na własną trasę.`);
console.log(`    Dziś: ${jaWorstScroll.toFixed(2)} ekranu na najmniejszym telefonie.`);

console.log(`\n  Sanity: ${MATERIALS.length} materiałów w katalogu, nadtytuł podpowiedzi = „${HINT_EYEBROW}".`);
// `throw` zamiast `process.exit` — patrz komentarz w lib/*.selftest.ts.
if (regres) throw new Error('REGRESJA: przyciski feedbacku zeszły pod zgięcie.');
console.log('\n✅ [MODEL RĘCZNY 08.08.2026] Przyciski feedbacku nad zgięciem na wszystkich trzech telefonach.');
console.log('   ⚠️ To zdanie mówi o ekranie z 08.08.2026, nie o dzisiejszym. Pomiar dzisiejszego ekranu — na końcu pliku.');
if (jaWorstScroll > JA_SCROLL_LIMIT) {
  throw new Error(`REGRESJA: ekran „Ja" ma ${jaWorstScroll.toFixed(2)} ekranu scrolla `
    + `(próg ${JA_SCROLL_LIMIT}) — coś do niego wróciło.`);
}
console.log(`✅ Ekran „Ja" zszedł do ${jaWorstScroll.toFixed(2)} ekranu scrolla (próg ${JA_SCROLL_LIMIT}).`);

// ═══════════════════════════════════════════════════════════
// PORZADEK R8 08.08.2026 — CZWARTY I PIĄTY PRÓG REGRESJI
// ═══════════════════════════════════════════════════════════
// Runda 7 dołożyła dwie rzeczy, które stoją NAD istniejącą treścią, więc obie
// dostają swój próg — wzorem trzech powyżej (przyciski feedbacku, „Ja", dawka).
//
// (4) LINIA „Nowa porcja w Twoim Bloku →" (M23) stoi WEWNĄTRZ hero Celu, czyli
// NAD przyciskami feedbacku — to PIERWSZA zmiana od rundy 3, która realnie
// podnosi BUTTONS_TOP, gdy czeka nieotwarta dawka. Stała hero (107 dp) w
// DZIS_DO_PRZYCISKOW celowo zostaje bez zmian: opisuje stan BEZ linii (linia
// jest warunkowa), a tu liczymy stan Z linią.
// heroAction w dzis.tsx: fontSize 13, bez lineHeight i bez marginesów
// (odczyt arkusza stylów 08.08.2026, nie założenie).
const HERO_DOSE_LINE = lh(13);
const BUTTONS_TOP_Z_LINIA = Math.round((BUTTONS_TOP + HERO_DOSE_LINE) * 10) / 10;

console.log('\n══════════════════════════════════════════════════════════════');
console.log('LINIA „Nowa porcja w Twoim Bloku →" W HERO (M23, runda 7)');
console.log('══════════════════════════════════════════════════════════════\n');
console.log(`    +${HERO_DOSE_LINE} dp  jedna linia heroAction (fontSize 13, bez marginesów)`);
console.log(`    GÓRA PRZYCISKÓW FEEDBACKU z linią: ${BUTTONS_TOP_Z_LINIA} dp (bez linii: ${BUTTONS_TOP} dp)`);
let doseLineRegres = false;
for (const s of SCREENS) {
  const zapas = Math.round((s.visible - BUTTONS_TOP_Z_LINIA) * 10) / 10;
  if (zapas <= 0) doseLineRegres = true;
  console.log(`    ${zapas > 0 ? '✅' : '❌'} ${s.name}: zapas ${zapas} dp`);
}

// (5) PYTANIE O SESJĘ BLOKU w dzienniku (sedno rundy 7). Pytanie, na które ten
// próg odpowiada: czy zawodnik widzi pytanie RAZEM z przyciskami „Tak, to ten"
// i „Nie" bez przewijania. Pytanie, którego nie widać w całości, to dokładnie
// ten sam bierny mechanizm, który runda 7 usuwała — tylko o jeden ekran niżej.
//
// Założenia (GÓRNE szacunki, ten sam kierunek błędu co 0,50 em wyżej):
//   • natywny Picker Androida ≈ 50 dp + ramka 2 (nie mierzone na urządzeniu);
//   • pole tekstowe: padding 10×2 + linia 14 px + ramka 2;
//   • reszta przepisana z arkusza stylów dziennik.tsx (08.08.2026): scroll
//     padding 20, tytuł 28 px + 24, przełącznik 48 + 24, etykieta 4+lh(11)+6,
//     odstępy spacing.sm = 8; box pytania: ramka 2 + padding 12×2, pytanie
//     bodySemiBold 14 (linia 20), tytuł sesji 12 px w JEDNEJ linii
//     (numberOfLines={1}), rząd przycisków 48.
const PICKER_H = 52;
const INPUT_H = Math.round(20 + lh(14) + 2);
const DZIENNIK_DO_PYTANIA: [string, number][] = [
  ['padding górny', 20],
  ['tytuł „Dziennik zawodnika"', lh(28) + 24],
  ['przełącznik poranny/potreningowy', 48 + 24],
  ['etykieta „RODZAJ SESJI"', 4 + lh(11) + 6],
  ['picker rodzaju sesji', PICKER_H + 8],
  ['etykieta „CZAS TRWANIA (MINUTY)"', 4 + lh(11) + 6],
  ['pole czasu trwania', INPUT_H + 8],
];
const PYTANIE_TOP = DZIENNIK_DO_PYTANIA.reduce((a, [, v]) => a + v, 0);

// Oba brzmienia pytania — z tego samego modułu, którym rysuje je ekran.
const PROMPT_TODAY = blockSessionQuestion(
  { id: 1, scheduled_date: '2026-08-08', title: 'x', focus_block_id: 'b' }, '2026-08-08');
const PROMPT_PAST = blockSessionQuestion(
  { id: 1, scheduled_date: '2026-08-06', title: 'x', focus_block_id: 'b' }, '2026-08-08');

function blockPromptHeight(w: number, question: string) {
  const avail = w - 40 - 26; // scroll padding 20×2 + padding boxu 12×2 + ramka
  let h = 2 + 24;                                  // ramka + padding pionowy
  h += lines(question, avail, 14) * 20 + 4;        // pytanie (bodySemiBold 14)
  h += lh(12) + 10;                                // tytuł sesji, JEDNA linia
  h += 48;                                         // rząd „Tak, to ten" / „Nie"
  return h;
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log('PYTANIE O SESJĘ BLOKU W DZIENNIKU (sedno rundy 7)');
console.log('══════════════════════════════════════════════════════════════\n');
{
  let a = 0;
  for (const [n, v] of DZIENNIK_DO_PYTANIA) { a += v; console.log(`    ${String(Math.round(a)).padStart(4)} dp  ${n}`); }
}
console.log(`\n    GÓRA BOXU PYTANIA: ${Math.round(PYTANIE_TOP)} dp (formularz potreningowy)`);
let promptRegres = false;
for (const s of SCREENS) {
  console.log(`\n    ${s.name}`);
  for (const [k, q] of [['sesja z dziś', PROMPT_TODAY], ['sesja z poprzednich dni', PROMPT_PAST]] as [string, string][]) {
    const h = Math.round(blockPromptHeight(s.w, q));
    const bottom = Math.round(PYTANIE_TOP + h);
    const ok = bottom < s.visible;
    if (!ok) promptRegres = true;
    console.log(`      ${ok ? '✅' : '❌'} ${String(h).padStart(4)} dp  ${k}  →  dół boxu na ${bottom} dp `
      + `(${ok ? `zapas ${s.visible - bottom} dp` : `${bottom - s.visible} dp POD ZGIĘCIEM`})`);
  }
}

// PRAKTYKA-EKRAN B6 08.08.2026 — TRZECI PRÓG REGRESJI.
if (doseWorstScroll > DOSE_SCREEN_LIMIT) {
  throw new Error(`REGRESJA: jedna dawka treści zajmuje ${doseWorstScroll.toFixed(2)} ekranu `
    + `(próg ${DOSE_SCREEN_LIMIT.toFixed(2)}) — zawodnik musi przewijać, żeby przeczytać JEDEN `
    + 'praktyczny krok. Zwiń „Dla chętnych" albo przypis, zamiast podnosić próg.');
}
console.log(`✅ Najgorsza realna dawka mieści się w ${doseWorstScroll.toFixed(2)} ekranu `
  + `(próg ${DOSE_SCREEN_LIMIT.toFixed(2)}).`);

// PORZADEK R8 08.08.2026 — CZWARTY PRÓG REGRESJI.
if (doseLineRegres) {
  throw new Error('REGRESJA: z linią „Nowa porcja w Twoim Bloku →" przyciski feedbacku '
    + 'zeszły pod zgięcie. Skróć hero albo przenieś linię, nie każ scrollować do przycisków.');
}
console.log(`✅ [MODEL RĘCZNY 08.08.2026] Z linią „Nowa porcja w Twoim Bloku →" przyciski feedbacku nadal nad zgięciem `
  + `(góra: ${BUTTONS_TOP_Z_LINIA} dp na najmniejszym ekranie 598 dp).`);

// ═════════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-M1 08.2026 (17.08.2026) — TU KOŃCZY SIĘ MODEL RĘCZNY,
//    A ZACZYNA POMIAR Z EKRANU
// ═════════════════════════════════════════════════════════════════════
// CO TU BYŁO DO 17.08.2026 I DLACZEGO ZNIKŁO.
//
// Stał tu „SZÓSTY PRÓG REGRESJI": `statSync('app/(tabs)/dzis.tsx').size > 48 000`
// → `throw`. Ten próg:
//   • ⛔ NIE BYŁ MIARĄ WYSOKOŚCI. Mierzył objętość PLIKU, a 63 % tego pliku to
//     komentarze. Karał dokumentowanie decyzji tak samo jak dokładanie kart.
//   • ⛔ URODZIŁ SIĘ CZERWONY. Wszedł commitem `e3cce2b` (12.08.2026), który
//     TYM SAMYM commitem podniósł `dzis.tsx` z 40 439 B do 55 170 B. Nie
//     przeszedł ANI RAZU w całej historii repozytorium.
//   • ⛔ NIKT TEGO NIE ZOBACZYŁ, bo ten plik nie jest odkrywany przez
//     `tests/run-selftests.mjs` (runner bierze wyłącznie `lib/*.selftest.ts`).
//     Od `e3cce2b` weszły 32 commity, z czego 15 dotykało `dzis.tsx`.
//
// CO STOI TU TERAZ. Prawdziwy pomiar, przemiatający drzewo komponentów
// z pliku ekranu (`lib/wysokoscEkranu.ts`), odpowiadający na pytanie:
//
//   ⭐ „Ile rzeczy zawodnik zobaczy, zanim cokolwiek przewinie — i które to są?"
//
// ⛔ D4: PRZEKROCZENIE PROGU NIE JEST TU AWARIĄ. Ekran „Dziś" przekracza go
// dziś wielokrotnie; strażnik czerwony od pierwszego dnia zostaje wyciszony
// w tydzień — co ten plik właśnie udowodnił własną historią. Dlatego pomiar
// PODAJE LICZBĘ I LISTĘ i przechodzi, a pilnowaniem, żeby liczba nie rosła,
// zajmuje się ZAPADKA NA RÓWNOŚĆ w `lib/wysokoscEkranu.selftest.ts`.

import {
  zmierzEkran, opiszPozycje, przeciete, WIDOCZNE_NAD_ZGIECIEM_DP, SZEROKOSC_ODNIESIENIA_DP,
  type PomiarEkranu,
} from '../lib/wysokoscEkranu';

const kreska = (t: string) => console.log(`\n${'═'.repeat(66)}\n${t}\n${'═'.repeat(66)}`);

kreska('⭐ CO ZAWODNIK WIDZI PRZED PRZEWINIĘCIEM — POMIAR Z EKRANU (M1)');
console.log(`  Narzędzie: tests/measure-heights.ts · moduł: lib/wysokoscEkranu.ts`);
console.log(`  Telefon odniesienia: ${SZEROKOSC_ODNIESIENIA_DP} dp szerokości, `
  + `${WIDOCZNE_NAD_ZGIECIEM_DP} dp widoczne nad zgięciem (bez paska zakładek i obszarów bezpiecznych).`);

const EKRANY_ZAKLADEK = ['dzis', 'ja', 'dziennik', 'mecz', 'kalendarz'] as const;
const pomiary: Record<string, PomiarEkranu> = {};
for (const e of EKRANY_ZAKLADEK) pomiary[e] = zmierzEkran(joinPath(KORZEN, 'app', '(tabs)', `${e}.tsx`));

console.log('\n  ekran        rzeczy   widzi w całości   przecięte zgięciem   pod zgięciem   wysokość');
console.log('  ' + '─'.repeat(84));
for (const e of EKRANY_ZAKLADEK) {
  const r = pomiary[e];
  const pr = przeciete(r);
  console.log(`  ${e.padEnd(11)}${String(r.pozycje.length).padStart(6)}`
    + `${String(r.nadZgieciem).padStart(18)}${String(pr).padStart(21)}`
    + `${String(r.podZgieciem - pr).padStart(15)}`
    + `${String(Math.round(r.wysokoscRazemDp)).padStart(11)} dp `
    + `(${(r.wysokoscRazemDp / WIDOCZNE_NAD_ZGIECIEM_DP).toFixed(2)} ekranu)`);
}

const dzis = pomiary.dzis;
kreska('⭐ EKRAN „DZIŚ" — LISTA RZECZY PO KOLEI OD GÓRY');
console.log('  👁 = widoczne w całości bez przewijania · ✂ = przecięte zgięciem · ↓ = trzeba przewinąć\n');
for (const p of dzis.pozycje) {
  console.log(opiszPozycje(p));
  for (const c of p.czesci) console.log(`    ${opiszPozycje(c)}`);
}

// ⛔ PLAN-D-M2 17.08.2026 — TE DWIE LISTY SĄ CZĘŚCIĄ ODPOWIEDZI, A NIE PRZYPISEM.
// Miara, która gubi rzecz i milczy, uspokaja tego, kto pyta: do tego pasa
// „Kalendarz" oddawał 536 dp i „14 z 14 widocznych" o ekranie, na którym nad
// zgięciem mieszczą się dwa dni z siedmiu. Zaniżona liczba jest gorsza niż
// brak liczby, więc wszystko, czego pomiar NIE obejmuje, ma tu stać z nazwy.
const niewyprowadzalne = new Set<string>();
for (const e of EKRANY_ZAKLADEK) pomiary[e].niewyprowadzalne.forEach((n) => niewyprowadzalne.add(n));
console.log(`\n  Czego NIE DA SIĘ wyprowadzić z repozytorium (liczone szacunkiem, nie ciszą): `
  + `${niewyprowadzalne.size ? [...niewyprowadzalne].sort().join(', ') : 'nic'}`);

for (const e of EKRANY_ZAKLADEK) {
  const pom = pomiary[e].pominieteGalezie;
  if (pom.length === 0) continue;
  console.log(`  ⚠️ Czego liczba dla ekranu „${e}" NIE OPISUJE — gałęzie pominięte jako niższe `
    + `(mierzymy najgorszy przypadek): ${pom.join(', ')}`);
}

// ⛔ D4 — OSTRZEŻENIE Z LICZBĄ, NIE AWARIA.
if (dzis.wysokoscRazemDp > WIDOCZNE_NAD_ZGIECIEM_DP) {
  const pod = dzis.pozycje.filter((p) => !p.nadZgieciem);
  console.log(`\n  ⚠️ OSTRZEŻENIE: ekran „Dziś" ma ${Math.round(dzis.wysokoscRazemDp)} dp przy `
    + `${WIDOCZNE_NAD_ZGIECIEM_DP} dp widocznych — to ${(dzis.wysokoscRazemDp / WIDOCZNE_NAD_ZGIECIEM_DP).toFixed(2)} ekranu.`);
  console.log(`  ⚠️ Zawodnik widzi w całości ${dzis.nadZgieciem} z ${dzis.pozycje.length} rzeczy. `
    + `Bez przewinięcia NIE ZOBACZY:`);
  for (const p of pod) console.log(`       • ${p.nazwa}  (${Math.round(p.wysokoscDp)} dp)`);
  console.log('  ⚠️ To NIE jest awaria budowy (D4). Co z tego zdjąć, rozstrzyga faza hierarchii.');
} else {
  console.log(`\n  ✅ Cały ekran „Dziś" mieści się nad zgięciem (${Math.round(dzis.wysokoscRazemDp)} `
    + `/ ${WIDOCZNE_NAD_ZGIECIEM_DP} dp).`);
}

console.log('\n  Zapadka na równość tych liczb stoi w lib/wysokoscEkranu.selftest.ts '
  + 'i to ona zapala się na czerwono, gdy któraś urośnie.');
