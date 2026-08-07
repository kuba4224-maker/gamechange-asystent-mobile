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
console.log('EKRAN DZIŚ — czy zdobycz rundy 3 przetrwała');
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
console.log('\n✅ Przyciski feedbacku NADAL nad zgięciem na wszystkich trzech telefonach.');
if (jaWorstScroll > JA_SCROLL_LIMIT) {
  throw new Error(`REGRESJA: ekran „Ja" ma ${jaWorstScroll.toFixed(2)} ekranu scrolla `
    + `(próg ${JA_SCROLL_LIMIT}) — coś do niego wróciło.`);
}
console.log(`✅ Ekran „Ja" zszedł do ${jaWorstScroll.toFixed(2)} ekranu scrolla (próg ${JA_SCROLL_LIMIT}).`);

// PRAKTYKA-EKRAN B6 08.08.2026 — TRZECI PRÓG REGRESJI.
if (doseWorstScroll > DOSE_SCREEN_LIMIT) {
  throw new Error(`REGRESJA: jedna dawka treści zajmuje ${doseWorstScroll.toFixed(2)} ekranu `
    + `(próg ${DOSE_SCREEN_LIMIT.toFixed(2)}) — zawodnik musi przewijać, żeby przeczytać JEDEN `
    + 'praktyczny krok. Zwiń „Dla chętnych" albo przypis, zamiast podnosić próg.');
}
console.log(`✅ Najgorsza realna dawka mieści się w ${doseWorstScroll.toFixed(2)} ekranu `
  + `(próg ${DOSE_SCREEN_LIMIT.toFixed(2)}).`);
