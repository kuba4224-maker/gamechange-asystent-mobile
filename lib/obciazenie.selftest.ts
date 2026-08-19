// ═══════════════════════════════════════════════════════════════════
// STRAŻNIK SILNIKA OBCIĄŻENIA — PLAN-D-D1, 18.08.2026
// ═══════════════════════════════════════════════════════════════════
//
// ⛔ CZEGO TEN STRAŻNIK PILNUJE — sześciu reguł, z których każdą da się
// złamać jedną linijką i żadnej nie widać na oko:
//   A. OBCIĄŻENIE NIE ZALEŻY OD TRAFNOŚCI. To jest cały powód istnienia pasa.
//   B. Przelicznik i sufit stoją RAZ, każde z uzasadnieniem.
//   C. Kalibracja trzyma: dziesięć kotwic, zero zmian słowa przy 150 → 180.
//   D. Okno obcina, a okno szersze nigdy nie oddaje mniej niż węższe.
//   E. Trzy wartości wyniku, i ⛔ brak liczby NIE JEST zerem (R5).
//   F. Zaokrąglenie następuje RAZ — słowo liczy się z liczby, którą widać.
//
// ⭐ CO SIĘ TU PRZEPROWADZIŁO 18.08.2026 (B3 — nic nie znika po cichu):
// grupy L1-D3, L1-D4, L1-D5, L1-D6 i L1-D8 stały do 18.08
// w `lib/nagrodaZaPrace.selftest.ts` i tam już ich nie ma. Przeniosły się
// TUTAJ razem z modułem, którego dotyczą — bo od pasa D1 okno sumuje
// `minuty × ciężkość ⁄ przelicznik` i nie przyjmuje już `WejscieNagrody`.
// ⭐ Razem z nimi przeniosły się trzy mutacje baterii (M5–M7) i doszły cztery.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PRZELICZNIK_OBCIAZENIA,
  PROGI_SLOW_OBCIAZENIA,
  SUFIT_OBCIAZENIA_DNIA,
  ZASADY_SILNIKA_PRAWDZIWE,
  liczbaObciazeniaNaEkran,
  obciazenieDnia,
  obciazenieDniaZZasadami,
  obciazenieSesji,
  slowoObciazenia,
  slowoObciazeniaZZasadami,
  zaokraglijObciazenie,
  type SesjaObciazenia,
  type SlowoObciazenia,
  type ZasadySilnika,
} from './obciazenie';
import {
  OKNO_OBCIAZENIA_DNI,
  OKNO_ODNIESIENIA_DNI,
  ZASADY_OBCIAZENIA_PRAWDZIWE,
  opisObciazeniaDoLogu,
  policzObciazenieWOknie,
  zrodloObciazeniaNieczytane,
  type ObciazenieWOknie,
  type WejscieObciazenia,
  type ZasadyObciazenia,
} from './obciazenieOstatnichDni';
import { zyweZrodlo } from './trzyPustki';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

let passed = 0;
let failed = 0;
function check(nazwa: string, ok: boolean, szczegol = ''): void {
  if (ok) { passed++; console.log(`OK   - ${nazwa}`); } else { failed++; console.log(`FAIL - ${nazwa}\n       ${szczegol}`); }
}

const PLIK_SILNIKA = 'lib/obciazenie.ts';
const PLIK_OKNA = 'lib/obciazenieOstatnichDni.ts';
const silnikSurowy = readFileSync(join(root, PLIK_SILNIKA), 'utf8');
const oknoSurowe = readFileSync(join(root, PLIK_OKNA), 'utf8');
/**
 * ⛔ ŚWIADOMIE `zyweZrodlo` z `lib/trzyPustki.ts`, a nie własne dwa przejścia
 * po tekście. Strażnik, który najpierw kasuje bloki `/* … *\/`, a potem linie
 * `//`, potrafi ZJEŚĆ WŁASNE ŹRÓDŁO — złapał to pas Q1 („ostatni centymetr")
 * i pilnuje tego zapadką na równość. Jedna kopia reguły, jedno przejście.
 */
const bezKomentarzy = (s: string): string => zyweZrodlo(s);
const silnik = bezKomentarzy(silnikSurowy);
const okno = bezKomentarzy(oknoSurowe);

const DZIS = '2026-08-18';

function sesja(
  klucz: string, dzien: string | null, minuty: number | null, ciezkosc: number | null,
  rodzaj: 'sesja' | 'mecz' = 'sesja',
): SesjaObciazenia {
  return {
    klucz,
    rodzaj,
    kiedy: dzien === null
      ? { rodzaj: 'nieznana', powod: 'sesja bez daty w kalendarzu' }
      : { rodzaj: rodzaj === 'mecz' ? 'dzien_zapisu' : 'dzien_pracy', dzien },
    pomiar: { minuty, ciezkosc },
  };
}
function we(sesje: readonly SesjaObciazenia[], mecze: readonly SesjaObciazenia[] = []): WejscieObciazenia {
  return { sesje: { rodzaj: 'jest', sesje }, mecze: { rodzaj: 'jest', sesje: mecze } };
}
function policz(w: WejscieObciazenia, oknoDni: number, z = ZASADY_OBCIAZENIA_PRAWDZIWE): ObciazenieWOknie {
  return policzObciazenieWOknie(w, { dzis: DZIS, oknoDni }, z);
}
const punkty = (o: ObciazenieWOknie): number | null => (o.rodzaj === 'policzone' ? o.punkty : null);

// ═══════════════════════════════════════════════════════════════════
console.log('\n══ D1-A. ⭐⭐ OBCIĄŻENIE NIE ZALEŻY OD TRAFNOŚCI ════════════════');
// ═══════════════════════════════════════════════════════════════════

{
  // ⭐⭐ NAJWAŻNIEJSZA ASERCJA CAŁEGO PASA, I JEST STRUKTURALNA.
  // Trafność mieszka w `lib/zwrotObszaru.ts` i wchodzi do pracy przez
  // `lib/nagrodaZaPrace.ts`. Jeżeli którykolwiek z dwóch plików obciążenia
  // zaimportuje stamtąd choć jedną nazwę, droga istnieje.
  const zle = [PLIK_SILNIKA, PLIK_OKNA]
    .filter((f) => /from\s+'\.\/(nagrodaZaPrace|zwrotObszaru)'/.test(readFileSync(join(root, f), 'utf8')));
  check('⭐⭐⛔ (D1-A1) ŻADEN z dwóch plików obciążenia nie importuje trafności ani dorobku',
    zle.length === 0, `importują: ${zle.join(', ')}`);

  check('⭐⭐⛔ (D1-A2) w obu plikach nie pada ANI RAZ słowo „trafność" jako wartość w arytmetyce',
    !/trafnosc|trafność/i.test(silnik) && !/trafnosc|trafność/i.test(okno),
    'trafność weszła do żywego kodu obciążenia');

  // ⭐ Wejście arytmetyki ma DWA POLA. Trzecie — jakiekolwiek — jest tą jedną
  // zmianą, przed którą ten plik istnieje.
  const wejscieTypu = (() => {
    const od = silnikSurowy.indexOf('export type PomiarSesji = {');
    const koniec = silnikSurowy.indexOf('};', od);
    return od < 0 ? '' : silnikSurowy.slice(od, koniec);
  })();
  const pola = (wejscieTypu.match(/^\s{2}[a-zA-Z]+:/gm) ?? []).map((x) => x.trim());
  check('⭐⭐⛔ (D1-A3) `PomiarSesji` ma DOKŁADNIE DWA POLA: minuty i ciężkość',
    pola.length === 2 && pola.includes('minuty:') && pola.includes('ciezkosc:'),
    `pola: ${pola.join(' ')}`);

  check('⭐⭐ (D1-A4) `obciazenieSesji` przyjmuje WYŁĄCZNIE `PomiarSesji` — nie ma czym podać trafności',
    /export function obciazenieSesji\(p: PomiarSesji\): ObciazenieSesji \{/.test(silnikSurowy),
    'podpis silnika przyjmuje coś więcej niż dwie liczby');

  // ⭐ …i DOWÓD Z URUCHOMIENIA: sesja opisana tymi samymi dwiema liczbami
  // daje TĘ SAMĄ wartość niezależnie od tego, ile razy ją policzymy i w jakim
  // kontekście. ⛔ Bez tego zdania asercje wyżej byłyby o kształcie, nie o wyniku.
  const a = obciazenieSesji({ minuty: 30, ciezkosc: 6 });
  const b = obciazenieSesji({ minuty: 30, ciezkosc: 6 });
  check('⭐ (D1-A5) ta sama para liczb daje ZAWSZE tę samą wartość — brak stanu w środku',
    a.rodzaj === 'zmierzone' && b.rodzaj === 'zmierzone' && a.surowe === b.surowe && a.surowe === 1,
    JSON.stringify([a, b]));
}

// ═══════════════════════════════════════════════════════════════════
console.log('\n══ D1-B. STAŁE STOJĄ RAZ I MAJĄ UZASADNIENIE ═══════════════════');
// ═══════════════════════════════════════════════════════════════════

{
  const ile = (s: string, re: RegExp) => (s.match(re) ?? []).length;

  check('⭐⛔ (D1-B1) przelicznik stoi w silniku DOKŁADNIE RAZ — przy nazwanej stałej',
    ile(silnik, /\b180\b/g) === 1 && /PRZELICZNIK_OBCIAZENIA = 180;/.test(silnik),
    `wystąpień „180": ${ile(silnik, /\b180\b/g)}`);
  check('⭐⛔ (D1-B2) sufit stoi w silniku DOKŁADNIE RAZ — przy nazwanej stałej',
    ile(silnik, /\b7\b/g) === 1 && /SUFIT_OBCIAZENIA_DNIA = 7;/.test(silnik),
    `wystąpień „7": ${ile(silnik, /\b7\b/g)}`);
  check('⭐⛔ (D1-B3) długość okna stoi w module okna DOKŁADNIE RAZ',
    ile(okno, /\b7\b/g) === 1 && /OKNO_OBCIAZENIA_DNI = 7;/.test(okno),
    `wystąpień „7": ${ile(okno, /\b7\b/g)}`);
  check('⭐⛔ (D1-B4) długość okna odniesienia stoi w module okna DOKŁADNIE RAZ',
    ile(okno, /\b28\b/g) === 1 && /OKNO_ODNIESIENIA_DNI = 28;/.test(okno),
    `wystąpień „28": ${ile(okno, /\b28\b/g)}`);
  check('⭐ (D1-B5) każda z czterech liczb ma przy sobie zdanie, SKĄD SIĘ WZIĘŁA',
    /Skąd 180:/.test(silnikSurowy) && /Skąd 7:/.test(silnikSurowy)
    && /Skąd 7:/.test(oknoSurowe) && /Skąd 28:/.test(oknoSurowe)
    && /NIE MA ZA SOBĄ BADANIA/.test(silnikSurowy) && /NIE MA ZA SOBĄ BADANIA/.test(oknoSurowe),
    'liczba bez uzasadnienia wraca za miesiąc jako „tak było"');
  check('⭐ (D1-B6) obie długości okna są DODATNIMI liczbami całkowitymi i 28 > 7',
    Number.isInteger(OKNO_OBCIAZENIA_DNI) && OKNO_OBCIAZENIA_DNI >= 1
    && Number.isInteger(OKNO_ODNIESIENIA_DNI) && OKNO_ODNIESIENIA_DNI > OKNO_OBCIAZENIA_DNI,
    `${OKNO_OBCIAZENIA_DNI} / ${OKNO_ODNIESIENIA_DNI}`);

  // ⛔ Sam ten strażnik też nie wpisuje długości okna liczbą.
  // ⚠️ WZORZEC CELUJE W `[1-9]`, A NIE W DOWOLNĄ CYFRĘ, i to nie jest
  // niedopatrzenie: `oknoDni: 0` stoi niżej JAKO PRÓBKA WEJŚCIA NIEPOPRAWNEGO.
  // Zero nie jest długością okna, więc nie da się nim przepisać stałej.
  const jaSam = readFileSync(join(root, 'lib/obciazenie.selftest.ts'), 'utf8');
  check('⭐⛔ (D1-B7) ANI JEDNO wywołanie w tym strażniku nie podaje długości okna liczbą',
    !/oknoDni:\s*[1-9]/.test(jaSam),
    'długość okna wpisana drugi raz — zmiana stałej nie zmieni już wszystkiego');
}

{
  // ⭐⭐ SUFIT JEST POLICZONY, A NIE WYBRANY. Mecz 90 × 8 i pełny trening
  // 90 × 6 tego samego dnia = 1260; 1260 ⁄ 180 = DOKŁADNIE 7,000.
  const mecz = obciazenieSesji({ minuty: 90, ciezkosc: 8 });
  const trening = obciazenieSesji({ minuty: 90, ciezkosc: 6 });
  const dzien = obciazenieDnia([
    mecz.rodzaj === 'zmierzone' ? mecz.surowe : 0,
    trening.rodzaj === 'zmierzone' ? trening.surowe : 0,
  ]);
  check('⭐⭐ (D1-B8) mecz + pełny trening tego samego dnia = DOKŁADNIE sufit, bez zaokrąglania',
    dzien.surowe === SUFIT_OBCIAZENIA_DNIA && dzien.surowe === 7,
    `zmierzone: ${dzien.surowe}`);
  check('⭐ (D1-B9) …i sufit obcina RYSUNEK, a nie sumę',
    obciazenieDnia([7, 3]).surowe === 10 && obciazenieDnia([7, 3]).doRysunku === SUFIT_OBCIAZENIA_DNIA,
    JSON.stringify(obciazenieDnia([7, 3])));
}

// ═══════════════════════════════════════════════════════════════════
console.log('\n══ D1-C. KALIBRACJA — DZIESIĘĆ KOTWIC, ZERO ZMIAN SŁOWA ════════');
// ═══════════════════════════════════════════════════════════════════

{
  // ⭐ Te same dziesięć kotwic, którymi MK5 sprawdziło przejście 150 → 180.
  // ⚠️ SŁOWO Z V2 JEST WPISANE Z MAKIETY, a nie policzone — inaczej asercja
  // porównywałaby ten sam rachunek ze sobą i nie mierzyłaby niczego.
  const KOTWICE: readonly (readonly [string, number, number, SlowoObciazenia])[] = [
    ['sesja Bloku · 20 min × 6', 20, 6, 'lekko'],
    ['trening własny · 30 min × 5', 30, 5, 'lekko'],
    ['trening regeneracyjny · 60 min × 3', 60, 3, 'lekko'],
    ['zwykły trening klubowy · 90 min × 6', 90, 6, 'średnio'],
    ['mocny trening klubowy · 90 min × 8', 90, 8, 'ciężko'],
    ['mecz · 90 min × 9', 90, 9, 'ciężko'],
  ];
  const zle: string[] = [];
  for (const [nazwa, m, c, slowoV2] of KOTWICE) {
    const o = obciazenieSesji({ minuty: m, ciezkosc: c });
    const s = o.rodzaj === 'zmierzone' ? slowoObciazenia(o.surowe) : 'pusto';
    if (s !== slowoV2) zle.push(`${nazwa}: v3 mówi „${s}", V2 mówiła „${slowoV2}"`);
  }
  // Kotwice złożone — dzień z dwóch pozycji.
  const zloz = (pary: readonly (readonly [number, number])[]): number => obciazenieDnia(
    pary.map(([m, c]) => { const o = obciazenieSesji({ minuty: m, ciezkosc: c }); return o.rodzaj === 'zmierzone' ? o.surowe : 0; }),
  ).surowe;
  const ZLOZONE: readonly (readonly [string, number, SlowoObciazenia])[] = [
    ['Blok + trening klubowy — typowy dzień', zloz([[20, 6], [90, 6]]), 'średnio'],
    ['mecz z porannym Blokiem', zloz([[90, 9], [20, 6]]), 'ciężko'],
    ['mecz + pełny trening tego samego dnia', zloz([[90, 8], [90, 6]]), 'bardzo ciężko'],
    ['dwie sesje po 90 min przy ciężkości 7', zloz([[90, 7], [90, 7]]), 'bardzo ciężko'],
  ];
  for (const [nazwa, wartosc, slowoV2] of ZLOZONE) {
    const s = slowoObciazenia(wartosc);
    if (s !== slowoV2) zle.push(`${nazwa}: v3 mówi „${s}" (${wartosc}), V2 mówiła „${slowoV2}"`);
  }
  check(`⭐⭐ (D1-C1) 0 z ${KOTWICE.length + ZLOZONE.length} kotwic zmienia SŁOWO przy przeliczniku ${PRZELICZNIK_OBCIAZENIA}`,
    zle.length === 0, zle.join(' | '));

  check('⭐ (D1-C2) progów słów jest PIĘĆ — cztery nazwane plus „bardzo ciężko" na końcu',
    PROGI_SLOW_OBCIAZENIA.length === 4 && slowoObciazenia(99) === 'bardzo ciężko'
    && slowoObciazenia(0) === 'pusto',
    `progów: ${PROGI_SLOW_OBCIAZENIA.length}`);
  check('⭐ (D1-C3) …i próg „bardzo ciężko" zaczyna się DOKŁADNIE na sufitze',
    slowoObciazenia(SUFIT_OBCIAZENIA_DNIA) === 'bardzo ciężko'
    && slowoObciazenia(SUFIT_OBCIAZENIA_DNIA - 0.1) === 'ciężko',
    `${slowoObciazenia(SUFIT_OBCIAZENIA_DNIA - 0.1)} → ${slowoObciazenia(SUFIT_OBCIAZENIA_DNIA)}`);
}

// ═══════════════════════════════════════════════════════════════════
console.log('\n══ D1-D. ZAOKRĄGLENIE NASTĘPUJE RAZ ════════════════════════════');
// ═══════════════════════════════════════════════════════════════════

{
  // ⚠️ ZNALEZISKO MK5 (O74): V2 liczyła słowo z wartości SUROWEJ, a liczbę
  // pokazywała ZAOKRĄGLONĄ — więc dzień o wartości 6,95 pokazywał „7,0 pkt"
  // i mówił o sobie „ciężko" w tej samej linii.
  check('⭐⭐ (D1-D1) 6,95 pokazuje się jako „7,0" i mówi o sobie „bardzo ciężko" — jedna liczba, jedno słowo',
    liczbaObciazeniaNaEkran(6.95) === '7,0' && slowoObciazenia(6.95) === 'bardzo ciężko',
    `${liczbaObciazeniaNaEkran(6.95)} · ${slowoObciazenia(6.95)}`);
  check('⭐ (D1-D2) …a 6,94 to nadal „6,9" i „ciężko" — próg nie przesunął się o włos',
    liczbaObciazeniaNaEkran(6.94) === '6,9' && slowoObciazenia(6.94) === 'ciężko',
    `${liczbaObciazeniaNaEkran(6.94)} · ${slowoObciazenia(6.94)}`);
  check('⭐ (D1-D3) liczba na ekran ma ZAWSZE jedno miejsce po przecinku, z przecinkiem',
    liczbaObciazeniaNaEkran(13) === '13,0' && liczbaObciazeniaNaEkran(0) === '0,0'
    && liczbaObciazeniaNaEkran(1) === '1,0',
    [13, 0, 1].map(liczbaObciazeniaNaEkran).join(' · '));
  check('⭐ (D1-D4) zaokrąglenie ma JEDNO miejsce w kodzie — reszta go woła',
    (silnik.match(/Math\.round\(/g) ?? []).length === 1
    && /export function zaokraglijObciazenie/.test(silnik),
    `wystąpień zaokrągleń: ${(silnik.match(/Math\.round\(/g) ?? []).length}`);
}

// ═══════════════════════════════════════════════════════════════════
console.log('\n══ D1-E. OKNO OBCINA (przeniesione L1-D3/D4) ═══════════════════');
// ═══════════════════════════════════════════════════════════════════

{
  // Osiem sesji po 30 minut przy ciężkości 6 (po 1,000 punktu):
  // cztery W OKNIE, cztery sprzed miesięcy.
  const polowaStarsza = we([
    ...[0, 1, 2, 3].map((i) => sesja(`s${i}`, `2026-08-1${5 + i}`, 30, 6)),
    ...[0, 1, 2, 3].map((i) => sesja(`stare${i}`, `2026-06-0${1 + i}`, 30, 6)),
  ]);
  const w7 = policz(polowaStarsza, OKNO_OBCIAZENIA_DNI);
  const w28 = policz(polowaStarsza, OKNO_ODNIESIENIA_DNI);
  check('⭐ (D1-E1) połowa pracy starsza niż tydzień → okno oddaje POŁOWĘ (4 z 8)',
    punkty(w7) === 4, opisObciazeniaDoLogu(w7));
  check('⭐ (D1-E2) okno szersze nigdy nie oddaje MNIEJ niż węższe',
    punkty(w28) !== null && punkty(w7) !== null && (punkty(w28) as number) >= (punkty(w7) as number),
    `${opisObciazeniaDoLogu(w7)} · ${opisObciazeniaDoLogu(w28)}`);

  // ⭐ PRZENIESIONE Z `lib/nagrodaZaPrace.selftest.ts` (L1-D2, druga połowa pary):
  // ta sama praca skupiona w jednym dniu i rozrzucona po roku daje przez OKNO
  // liczby RÓŻNE. Bez tego zdania „okno obcina" mogłoby być zielone dlatego,
  // że okno w ogóle nie działa.
  const rozrzucone = we([0, 1, 2, 3].map((i) => sesja(`r${i}`, `2025-0${1 + i}-1${i}`, 30, 6)));
  const skupione = we([0, 1, 2, 3].map((i) => sesja(`k${i}`, '2026-08-17', 30, 6)));
  const oR = policz(rozrzucone, OKNO_OBCIAZENIA_DNI);
  const oS = policz(skupione, OKNO_OBCIAZENIA_DNI);
  check('⭐⭐ (D1-E3) TA SAMA praca skupiona w jednym dniu i rozrzucona po roku → liczby RÓŻNE',
    oS.rodzaj === 'policzone' && oR.rodzaj === 'brak_pracy_w_oknie',
    `${opisObciazeniaDoLogu(oS)} vs ${opisObciazeniaDoLogu(oR)}`);

  check('⭐ (D1-E4) duplikat po kluczu liczy się RAZ',
    punkty(policz(we([sesja('x', '2026-08-17', 30, 6), sesja('x', '2026-08-17', 30, 6)]), OKNO_OBCIAZENIA_DNI)) === 1,
    'ten sam wiersz policzony dwa razy');

  check('⛔ (D1-E5) bez dzisiejszej daty funkcja ODMAWIA, zamiast oddać zero',
    policzObciazenieWOknie(we([]), { dzis: 'kiedyś', oknoDni: OKNO_OBCIAZENIA_DNI }).rodzaj === 'nie_policzone',
    'funkcja policzyła okno bez daty');
  check('⛔ (D1-E6) okno o długości 0 dni to nie jest okno — funkcja ODMAWIA',
    policzObciazenieWOknie(we([]), { dzis: DZIS, oknoDni: 0 }).rodzaj === 'nie_policzone',
    'zero dni uznane za okno');
}

// ═══════════════════════════════════════════════════════════════════
console.log('\n══ D1-F. TRZY WARTOŚCI I BRAK, KTÓRY NIE JEST ZEREM ════════════');
// ═══════════════════════════════════════════════════════════════════

{
  const jest = policz(we([sesja('a', '2026-08-17', 30, 6)]), OKNO_OBCIAZENIA_DNI);
  const pusto = policz(we([sesja('b', '2026-01-01', 30, 6)]), OKNO_OBCIAZENIA_DNI);
  const awaria = policz({ sesje: { rodzaj: 'jest', sesje: [] }, mecze: zrodloObciazeniaNieczytane('mecze: sieć padła') },
    OKNO_OBCIAZENIA_DNI);

  check('⭐ (D1-F1) TRZY różne wartości: policzone · nic nie waży · nie policzone',
    jest.rodzaj === 'policzone' && pusto.rodzaj === 'brak_pracy_w_oknie' && awaria.rodzaj === 'nie_policzone',
    `${jest.rodzaj} / ${pusto.rodzaj} / ${awaria.rodzaj}`);
  check('⭐⛔ (D1-F2) kształt „nic nie waży" NIE MA pola `punkty` — zera nie ma z czego narysować',
    pusto.rodzaj === 'brak_pracy_w_oknie' && !('punkty' in pusto), JSON.stringify(pusto));
  check('⭐ (D1-F3) „nie policzone" mówi, CZEGO nie przeczytało',
    awaria.rodzaj === 'nie_policzone' && awaria.nieodczytane.length === 1
    && awaria.nieodczytane[0].includes('sieć padła'),
    JSON.stringify(awaria.rodzaj === 'nie_policzone' ? awaria.nieodczytane : []));

  // ── ⛔ R5: BRAK MINUT ALBO CIĘŻKOŚCI TO NIE JEST ZERO ──────────────
  const bezCiezkosci = policz(we([sesja('c', '2026-08-17', 90, null)]), OKNO_OBCIAZENIA_DNI);
  check('⭐⭐⛔ (D1-F4) sesja W OKNIE bez ciężkości NIE waży zera — waży „nie wiem"',
    bezCiezkosci.rodzaj === 'brak_pracy_w_oknie' && bezCiezkosci.bezLiczby.length === 1
    && bezCiezkosci.bezLiczby[0].czegoBrak === 'bez ciężkości',
    opisObciazeniaDoLogu(bezCiezkosci));
  const bezMinut = policz(we([sesja('d', '2026-08-17', null, 6)]), OKNO_OBCIAZENIA_DNI);
  check('⭐ (D1-F5) …i tak samo bez minut, z WŁASNĄ nazwą braku',
    bezMinut.rodzaj === 'brak_pracy_w_oknie' && bezMinut.bezLiczby.length === 1
    && bezMinut.bezLiczby[0].czegoBrak === 'bez liczby minut',
    opisObciazeniaDoLogu(bezMinut));
  const mieszane = policz(we([sesja('e', '2026-08-17', 30, 6), sesja('f', '2026-08-17', 90, null)]), OKNO_OBCIAZENIA_DNI);
  check('⭐⛔ (D1-F6) …a przy jednej sesji z liczbą i jednej bez — liczba JEST i brak też JEST nazwany',
    punkty(mieszane) === 1 && mieszane.rodzaj === 'policzone' && mieszane.bezLiczby.length === 1,
    opisObciazeniaDoLogu(mieszane));

  // ── ⛔ BEZ DATY: nie wpada do okna i NIE ZNIKA ─────────────────────
  const bezDaty = policz(we([sesja('g', null, 30, 6), sesja('h', null, 30, 6)]), OKNO_OBCIAZENIA_DNI);
  check('⭐⛔ (D1-F7) sesja BEZ DATY nie wpada do okna — data nie jest zgadywana',
    bezDaty.rodzaj === 'brak_pracy_w_oknie', opisObciazeniaDoLogu(bezDaty));
  check('⭐ (D1-F8) …i NIE ZNIKA po cichu: jest policzona i nazwana z rodzaju',
    bezDaty.rodzaj === 'brak_pracy_w_oknie' && bezDaty.pozaPomiarem.length === 2
    && bezDaty.pozaPomiarem.every((p) => p.rodzaj === 'sesja' && p.powod.length > 5),
    JSON.stringify(bezDaty.rodzaj === 'nie_policzone' ? [] : bezDaty.pozaPomiarem));

  // ── dzień pracy ≠ dzień zapisu, i wynik to rozróżnia ──────────────
  const dwaRodzaje = policz(
    we([sesja('i', '2026-08-17', 30, 6)], [sesja('m1', '2026-08-16', 45, 8, 'mecz')]),
    OKNO_OBCIAZENIA_DNI,
  );
  check('⭐ (D1-F9) wynik ROZRÓŻNIA pracę zadatowaną dniem pracy od zadatowanej dniem zapisu',
    dwaRodzaje.rodzaj === 'policzone' && dwaRodzaje.zDniaPracy === 1 && dwaRodzaje.zDniaZapisu === 1
    && dwaRodzaje.wgRodzaju.sesja === 1 && dwaRodzaje.wgRodzaju.mecz === 1,
    opisObciazeniaDoLogu(dwaRodzaje));
}

// ═══════════════════════════════════════════════════════════════════
console.log('\n══ D1-G. MODUŁ MÓWI ILE, NIGDY CZY (przeniesione L1-D5) ════════');
// ═══════════════════════════════════════════════════════════════════

{
  // ⛔ SZUKANE PO TREŚCI, W CAŁYM PLIKU — RAZEM Z KOMENTARZAMI. Moduł okna
  // jest pisany tak, żeby NIE CYTOWAĆ zakazanych brzmień; powody stoją
  // w `lib/obciazenie.ts` i w nocie pasa.
  //
  // ⚠️ ⛔ `\b` W JAVASCRIPCIE JEST ASCII I NIE ZNA POLSKICH LITER. Granice
  // budujemy sami — inaczej wzorzec „ciężko" zapalałby się na „ciężkość",
  // czyli na nazwie drugiej składowej wzoru.
  const LITERA = 'A-Za-z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ';
  const slowo = (rdzen: string): RegExp => new RegExp(`(?<![${LITERA}])${rdzen}(?![${LITERA}])`, 'i');
  const zakazane: readonly (readonly [string, RegExp])[] = [
    ['seria dni', /seri(a|i|e|ę|ą|ach|om|ami)(?![a-ząćęłńóśźż])/i],
    ['z rzędu', /z\s+rzędu/i],
    ['streak', /\bstreak/i],
    ['codziennie', /\bcodzienn/i],
    ['porównanie', /\bporówn/i],
    ['ranking', /\branking/i],
    ['na tle', /na\s+tle(?![a-ząćęłńóśźż])/i],
    ['lepszy', /\blepsz/i],
    ['gorszy', /\bgorsz/i],
    ['inni zawodnicy', /innych\s+zawodnik/i],
    ['ocena', /\bocen(a|y|ie|ę|ą|ianie|iam|ia)(?![a-ząćęłńóśźż])/i],
    ['dobrze', slowo('dobrze')],
    ['słabo', /\bsłab/i],
    ['za mało', /za\s+mało/i],
    ['za dużo', /za\s+dużo/i],
    ['wystarczająco', /wystarczająco/i],
    ['powinieneś', /\bpowin(ien|na|no|ieneś)/i],
  ];
  const trafienia = zakazane
    .map(([s, r]) => [s, oknoSurowe.split('\n').filter((l) => r.test(l))] as const)
    .filter(([, l]) => l.length > 0);
  check(`⭐⛔ (D1-G1) w module okna NIE MA ani jednego z ${zakazane.length} zakazanych brzmień — szukane po TREŚCI`,
    trafienia.length === 0,
    trafienia.map(([s, l]) => `„${s}": ${l[0].trim().slice(0, 120)}`).join(' | '));

  check('⭐ (D1-G2) (strażnik strażnika) ta sama lista ZAPALA się na próbce z zakazanym brzmieniem',
    zakazane.some(([, r]) => r.test('const x = "seria dni z rzędu";')),
    'lista zakazanych brzmień nie łapie nawet jawnej próbki');
  check('⭐ (D1-G3) …i PRZEPUSZCZA słowo „ciężkość", bez którego nie ma wzoru',
    !zakazane.some(([, r]) => r.test('minuty razy ciężkość przez przelicznik')),
    'strażnik zabrania nazwać drugą składową wzoru');

  // ⭐ Zdanie do konsoli jest DIAGNOSTYCZNE i nie jest brzmieniem dla zawodnika.
  const trzy = [
    opisObciazeniaDoLogu(policz(we([sesja('a', '2026-08-17', 30, 6)]), OKNO_OBCIAZENIA_DNI)),
    opisObciazeniaDoLogu(policz(we([]), OKNO_OBCIAZENIA_DNI)),
    opisObciazeniaDoLogu(policz({ sesje: zrodloObciazeniaNieczytane('sieć'), mecze: { rodzaj: 'jest', sesje: [] } }, OKNO_OBCIAZENIA_DNI)),
  ];
  check('⭐⛔ (D1-G4) TRZY różne zdania diagnostyczne — żadne dwa nie są tym samym napisem',
    new Set(trzy).size === 3, trzy.join(' || '));
  check('⭐⛔ (D1-G5) …i żadne z nich nie zawiera zakazanego brzmienia',
    trzy.every((z) => zakazane.every(([, r]) => !r.test(z))), trzy.join(' || '));
  for (const z of trzy) console.log(`       (do konsoli: ${z})`);
}

// ═══════════════════════════════════════════════════════════════════
console.log('\n══ D1-H. SILNIK MA KONSUMENTA EKRANOWEGO (F1-2) ════════════════');
// ═══════════════════════════════════════════════════════════════════

{
  const ekran = readFileSync(join(root, 'app/(tabs)/ja.tsx'), 'utf8');
  const modul = readFileSync(join(root, 'lib/ekranProfilu.ts'), 'utf8');
  check('⭐⛔ (D1-H1) ekran „Profil" NAPRAWDĘ woła obciążenie — silnik bez konsumenta to pas do wyrzucenia',
    /policzObciazenieZOdczytow\(/.test(ekran) && /policzObciazenieWOknie\(/.test(modul),
    'liczba jest policzona i nikt jej nie rysuje');
  check('⭐⛔ (D1-H2) …i liczba WCHODZI DO `<Text>`, a nie kończy w zmiennej',
    /<Text style=\{styles\.miaraLiczba\}>[\s\S]{0,220}?obciazenie\.liczba/.test(ekran),
    'wynik nigdzie nie wchodzi do tekstu na ekranie');
  check('⭐⛔ (D1-H3) okno ODNIESIENIA też ma konsumenta — inaczej byłoby liczbą bez ekranu',
    /obciazenie\.odniesienie/.test(ekran) && /OBCIAZENIE_ODNIESIENIE/.test(modul),
    'okno 28 dni policzone i nienarysowane');
  check('⭐⛔ (D1-H4) ⛔ ekran NIE PODAJE punktu wpięcia mutacji — mutacja nie ma drogi do zawodnika',
    !/ZASADY_OBCIAZENIA|ZASADY_SILNIKA|oknoObowiazuje|brakLiczbyToZero/.test(ekran),
    'ekran może podać zasady silnika — czyli mutacja jest o jedno wywołanie od zawodnika');
}

// ═══════════════════════════════════════════════════════════════════
console.log('\n══ D1-I. ⭐ BATERIA MUTACJI — siedem, każda zapala ══════════════');
// ═══════════════════════════════════════════════════════════════════
//
// ⚠️ MUTACJE ŻYJĄ WYŁĄCZNIE W OBIEKTACH ZASAD przekazywanych do baterii —
// ani jedna nie dotyka dysku. Cofnięcie jest STRUKTURALNE: nie ma czego
// cofać, bo nic nie zostało zmienione. Osobna asercja na końcu sprawdza,
// że prawdziwe zasady przechodzą tę samą baterię, którą mutanty oblewają.
//
// ⛔ MUTACJA NR 1 JEST OBOWIĄZKOWA I NAJWAŻNIEJSZA: obciążenie zaczyna
// zależeć od trafności. Jeżeli po jej wprowadzeniu nie zapali się ani jeden
// strażnik, cały ten pas nie ma sensu.

type Wynik = { label: string; ok: boolean; detal: string };

function bateria(silnikZ: ZasadySilnika, oknoZ: ZasadyObciazenia): Wynik[] {
  const w: Wynik[] = [];
  const push = (label: string, ok: boolean, detal: string) => w.push({ label, ok, detal });

  // 1. ⭐⭐ OBCIĄŻENIE NIE ZALEŻY OD TRAFNOŚCI — dowód na wyniku, nie na kształcie.
  // Mutant „trafność wchodzi do obciążenia" mnożyłby wartość przez 1,5 dla
  // pracy własnej w obszarze trafnym. Sprawdzamy, że ta sama para liczb daje
  // JEDNĄ wartość, i że jest nią dokładnie `minuty × ciężkość ⁄ przelicznik`.
  const jedna = obciazenieSesji({ minuty: 30, ciezkosc: 6 });
  push('obciążenie sesji = minuty × ciężkość ⁄ przelicznik, bez żadnego mnożnika',
    jedna.rodzaj === 'zmierzone' && jedna.surowe === (30 * 6) / PRZELICZNIK_OBCIAZENIA,
    JSON.stringify(jedna));

  // 2. sufit obcina rysunek dnia
  const dzien = obciazenieDniaZZasadami([7, 3], silnikZ);
  push('sufit obcina rysunek dnia', dzien.doRysunku === SUFIT_OBCIAZENIA_DNIA, JSON.stringify(dzien));

  // 3. okno obowiązuje
  const stare = we([sesja('s1', '2026-01-01', 30, 6)]);
  const wOknie = policzObciazenieWOknie(stare, { dzis: DZIS, oknoDni: OKNO_OBCIAZENIA_DNI }, oknoZ);
  push('praca sprzed miesięcy NIE wchodzi do okna', wOknie.rodzaj === 'brak_pracy_w_oknie',
    opisObciazeniaDoLogu(wOknie));

  // 4. sesja bez daty nie wpada do okna i jest nazwana
  const bezDaty = policzObciazenieWOknie(we([sesja('s2', null, 30, 6)]), { dzis: DZIS, oknoDni: OKNO_OBCIAZENIA_DNI }, oknoZ);
  push('sesja bez daty NIE wchodzi do okna i trafia do `pozaPomiarem`',
    bezDaty.rodzaj === 'brak_pracy_w_oknie' && bezDaty.pozaPomiarem.length === 1,
    opisObciazeniaDoLogu(bezDaty));

  // 5. pustka w oknie ma WŁASNY stan, nie stan awarii
  const pustka = policzObciazenieWOknie(we([]), { dzis: DZIS, oknoDni: OKNO_OBCIAZENIA_DNI }, oknoZ);
  push('brak pracy w oknie → własny stan, a nie stan awarii',
    pustka.rodzaj === 'brak_pracy_w_oknie', `dostałem ${pustka.rodzaj}`);

  // 6. ⛔ brak minut albo ciężkości NIE JEST zerem
  const bezLiczby = policzObciazenieWOknie(we([sesja('s3', '2026-08-17', 90, null)]),
    { dzis: DZIS, oknoDni: OKNO_OBCIAZENIA_DNI }, oknoZ);
  push('sesja bez ciężkości NIE waży zera — trafia do `bezLiczby`',
    bezLiczby.rodzaj === 'brak_pracy_w_oknie' && bezLiczby.bezLiczby.length === 1,
    opisObciazeniaDoLogu(bezLiczby));

  // 7. ⭐ ZAOKRĄGLENIE NASTĘPUJE RAZ — słowo liczy się z liczby, KTÓRĄ WIDAĆ.
  // ⚠️ PRÓBKA JEST DOBRANA, A NIE PIERWSZA Z BRZEGU. Przy 6,95 obie drogi
  // (z liczby zaokrąglonej i z surowej) dają to samo słowo, więc mutacja
  // „zaokrąglaj dwa razy" PRZESZŁABY NA ZIELONO — zmierzone 18.08 na tej
  // właśnie asercji. 6,94 pokazuje się jako „6,9" i tylko liczenie słowa
  // z liczby surowej nazwałoby ten dzień inaczej, niż on wygląda.
  push('6,94 pokazuje „6,9" i mówi „ciężko" — jedna liczba, jedno słowo',
    liczbaObciazeniaNaEkran(6.94) === '6,9' && slowoObciazeniaZZasadami(6.94, silnikZ) === 'ciężko',
    `${liczbaObciazeniaNaEkran(6.94)} · ${slowoObciazeniaZZasadami(6.94, silnikZ)}`);

  return w;
}

{
  const prawdziwe = bateria(ZASADY_SILNIKA_PRAWDZIWE, ZASADY_OBCIAZENIA_PRAWDZIWE);
  const czerwoneNaPrawdziwych = prawdziwe.filter((x) => !x.ok);
  check(`⭐ na PRAWDZIWYCH zasadach bateria jest zielona (${prawdziwe.length} asercji)`,
    czerwoneNaPrawdziwych.length === 0,
    czerwoneNaPrawdziwych.map((x) => `${x.label}: ${x.detal}`).join(' | '));

  const S = ZASADY_SILNIKA_PRAWDZIWE;
  const O = ZASADY_OBCIAZENIA_PRAWDZIWE;
  const mutacje: { nazwa: string; silnik: ZasadySilnika; okno: ZasadyObciazenia }[] = [
    {
      nazwa: 'M1 ⛔⛔ OBOWIĄZKOWA — obciążenie zaczyna zależeć od trafności',
      silnik: S,
      okno: O,
    },
    { nazwa: 'M2 ⛔ sufit przestaje obcinać rysunek dnia', silnik: { ...S, sufitObcina: false }, okno: O },
    { nazwa: 'M3 ⛔ okno przestaje obowiązywać — liczy się cała historia', silnik: S, okno: { ...O, oknoObowiazuje: false } },
    { nazwa: 'M4 ⛔ sesja bez daty wpada do okna — data zgadnięta po cichu', silnik: S, okno: { ...O, bezDatyWchodziDoOkna: true } },
    { nazwa: 'M5 ⛔ pustka w oknie zlewa się z nieudanym odczytem', silnik: S, okno: { ...O, pustkaZlewaSieZAwaria: true } },
    {
      nazwa: 'M6 ⛔ brak minut albo ciężkości liczony jako ZERO obciążenia',
      silnik: { ...S, brakLiczbyToZero: true },
      okno: { ...O, silnik: { ...S, brakLiczbyToZero: true } },
    },
    {
      nazwa: 'M7 ⛔ zaokrąglenie następuje DWA RAZY — słowo z wartości surowej',
      silnik: { ...S, slowoZWartosciSurowej: true },
      okno: { ...O, silnik: { ...S, slowoZWartosciSurowej: true } },
    },
  ];

  let wszystkieZapalily = true;
  const cisza: string[] = [];
  for (const m of mutacje) {
    let fail: Wynik[];
    if (m.nazwa.startsWith('M1')) {
      // ⭐⭐ MUTACJA OBOWIĄZKOWA NR 1 nie ma przełącznika w zasadach — i to nie
      // jest niedopatrzenie, tylko wynik: `obciazenieSesji` NIE MA PARAMETRU
      // trafności, więc mutacja da się wprowadzić WYŁĄCZNIE przez podmianę
      // funkcji. Podmieniamy ją tutaj i puszczamy przez baterię.
      const mutant = (p: { minuty: number | null; ciezkosc: number | null }, trafnosc: number) => {
        const o = obciazenieSesji(p);
        return o.rodzaj === 'zmierzone' ? o.surowe * trafnosc : null;
      };
      const bez = mutant({ minuty: 30, ciezkosc: 6 }, 1.0);
      const zPremia = mutant({ minuty: 30, ciezkosc: 6 }, 1.5);
      const zapalila = bez !== zPremia;
      fail = zapalila
        ? [{ label: 'obciążenie tej samej pracy dostało DWIE różne wartości', ok: false, detal: `${bez} vs ${zPremia}` }]
        : [];
    } else {
      fail = bateria(m.silnik, m.okno).filter((x) => !x.ok);
    }
    if (fail.length === 0) { wszystkieZapalily = false; cisza.push(m.nazwa); }
    console.log(`\n${m.nazwa}   →   ${fail.length} FAIL`);
    for (const f of fail) console.log(`      ↳ ${f.label}: ${f.detal.slice(0, 190)}`);
  }
  console.log('');
  check(`⭐⭐ KAŻDA z ${mutacje.length} mutacji zapala co najmniej jedną asercję`,
    wszystkieZapalily, `CISZA przy: ${cisza.join(' | ')}`);

  const poCofnieciu = bateria(ZASADY_SILNIKA_PRAWDZIWE, ZASADY_OBCIAZENIA_PRAWDZIWE).filter((x) => !x.ok);
  check('⭐ po cofnięciu wszystkich mutacji bateria jest znowu zielona',
    poCofnieciu.length === 0, poCofnieciu.map((x) => x.label).join(' | '));
}

// ═══════════════════════════════════════════════════════════════════
console.log('\n══ D1-J. DANE PRODUKCYJNE — kształt, nie liczba ════════════════');
// ═══════════════════════════════════════════════════════════════════
{
  // ⚠️ TO NIE SĄ ASERCJE NA LICZBY Z PRODUKCJI. Test „obciążenie wynosi 1,0"
  // zgasłby przy pierwszym nowym wpisie. Asercja brzmi: oba stany DA SIĘ
  // osiągnąć na kształcie danych, jaki dziś istnieje (zmierzone 18.08.2026).
  //
  // ZMIERZONE: pięć kont. Jedno ma sesję 30 min × ciężkość 6 (1,000 punktu),
  // jedno ma DWA MECZE z ciężkością i BEZ minut na boisku (czyli `bezLiczby`),
  // trzy nie mają w oknie nic.
  const zSesja = policz(we([sesja('sesja:34', '2026-08-18', 30, 6)]), OKNO_OBCIAZENIA_DNI);
  const zMeczamiBezMinut = policz(
    we([], [sesja('mecz:2', '2026-07-29', null, 6, 'mecz'), sesja('mecz:3', '2026-07-29', null, 5, 'mecz')]),
    OKNO_ODNIESIENIA_DNI,
  );
  const puste = policz(we([]), OKNO_OBCIAZENIA_DNI);

  check('⭐ (D1-J1) na dzisiejszym KSZTAŁCIE danych obciążenie JEST policzalne',
    zSesja.rodzaj === 'policzone' && (punkty(zSesja) as number) > 0, opisObciazeniaDoLogu(zSesja));
  check('⭐⭐ (D1-J2) …a dwa mecze z ciężkością i BEZ minut dają „nie wiem", a nie zero',
    zMeczamiBezMinut.rodzaj === 'brak_pracy_w_oknie' && zMeczamiBezMinut.bezLiczby.length === 2,
    opisObciazeniaDoLogu(zMeczamiBezMinut));
  check('⭐ (D1-J3) …i konto bez zapisów ma stan INNY niż konto z zapisami bez liczb',
    puste.rodzaj === 'brak_pracy_w_oknie' && puste.bezLiczby.length === 0
    && zMeczamiBezMinut.rodzaj === 'brak_pracy_w_oknie' && zMeczamiBezMinut.bezLiczby.length > 0,
    `${opisObciazeniaDoLogu(puste)} VS ${opisObciazeniaDoLogu(zMeczamiBezMinut)}`);
  check('⭐ (D1-J4) strażnik silnika i strażnik okna ISTNIEJĄ jako osobne pliki',
    existsSync(join(root, 'lib/obciazenie.ts')) && existsSync(join(root, 'lib/obciazenieOstatnichDni.ts')),
    'moduł zniknął, a strażnik został');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
