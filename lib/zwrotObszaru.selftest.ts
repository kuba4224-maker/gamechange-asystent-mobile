// ═══════════════════════════════════════════════════════════════════
// STRAŻNIK ZWROTU OBSZARU — PLAN-D-W4, 18.08.2026
// ═══════════════════════════════════════════════════════════════════
//
// ⛔ Ten strażnik pilnuje JEDNEJ rzeczy, której nie widać w kodzie: że produkt
// przestał mylić „najniższy wynik" ze „największym zwrotem". Na prawdziwym
// zawodniku z bazy (boczny obrońca, 15 lat) to jest różnica między wskazaniem
// ODŻYWIANIA (wynik 40, tier `minor`) a zobaczeniem MOCY (wynik 70, tier `key`).

import {
  policzZwrotObszarow,
  trafnoscSesji,
  ocenPraceWlasna,
  MAPA_PRACY_WLASNEJ,
  RODZAJE_PRACY_WLASNEJ_DO_WYBORU,
  RODZAJE_PRACY_WLASNEJ_HISTORYCZNE,
  WAGA_TIERU,
  PROG_PODLOGI_WYNIKU,
  ILE_NAJWYZSZYCH_ZWROTOW,
  TRAFNOSC_BAZOWA,
  TRAFNOSC_W_OBSZAR_TRAFNY,
  type ZwrotObszarow,
} from './zwrotObszaru';
import { POSITION_PROFILES } from './positionProfiles';

let passed = 0;
let failed = 0;
function check(nazwa: string, ok: boolean, szczegol = ''): void {
  if (ok) { passed++; console.log(`OK   - ${nazwa}`); } else { failed++; console.log(`FAIL - ${nazwa}\n       ${szczegol}`); }
}

// ⭐ PRAWDZIWE DANE Z PRODUKCJI, wiersz `diagnostics.id = 92`, odczytany 18.08.2026.
// ⛔ Nie wymyślone: to jest jedyny zawodnik z kontem i pełną diagnozą.
const WYNIKI_92 = {
  moc: 70, wytrzymalosc: 70, fizycznosc: 30, techFund: 80, techSpec: 60, tolerancja: 60,
  regeneracja: 80, odpornosc: 90, odzywianie: 40, koncentracja: 50, mental: 50,
  percepcja: 40, decyzja: 70,
};
const POZYCJA_92 = 'Boczny obrońca';

console.log('\nW4-A. ZWROT = (100 − wynik) × waga tieru');
{
  const z = policzZwrotObszarow({ wyniki: WYNIKI_92, pozycja: POZYCJA_92 });
  check('⭐ ranking policzony dla prawdziwego zawodnika z bazy',
    z.rodzaj === 'jest', z.rodzaj === 'nie_wiemy' ? z.powod : '');
  if (z.rodzaj !== 'jest') { console.log(`\n${passed} passed, ${failed} failed`); throw new Error('brak rankingu'); }

  const zwrotem = new Map(z.obszary.map((o) => [o.obszar, o.zwrot]));
  check('⭐ fizyczność (30, important) → 42 · percepcja (40, important) → 36 · moc (70, key) → 30',
    zwrotem.get('fizycznosc') === 42 && zwrotem.get('percepcja') === 36 && zwrotem.get('moc') === 30,
    JSON.stringify([...zwrotem]));

  check('⛔ odporność (90, minor) → 3 — obszar wysoko rozwinięty i poboczny daje NAJMNIEJ',
    zwrotem.get('odpornosc') === 3, `${zwrotem.get('odpornosc')}`);

  // ⭐⭐ ASERCJA, DLA KTÓREJ TEN MODUŁ POWSTAŁ
  check('⭐⭐ (W4) MOC (wynik 70) daje WIĘKSZY zwrot niż ODŻYWIANIE (wynik 40) — bo jest kluczowa dla tej pozycji',
    (zwrotem.get('moc') as number) > (zwrotem.get('odzywianie') as number),
    `moc ${zwrotem.get('moc')} vs odżywianie ${zwrotem.get('odzywianie')}`);

  check('⭐ (W4) …a mimo to ODŻYWIANIE ZOSTAJE trafne — przez podłogę wyniku, nie przez zwrot',
    z.trafne.has('odzywianie')
    && z.obszary.find((o) => o.obszar === 'odzywianie')?.trafny === 'podloga',
    JSON.stringify(z.obszary.find((o) => o.obszar === 'odzywianie')));

  // ⭐⭐ ZAPADKA NA REMIS, KTÓRY BYŁ O KROK OD CICHEGO ZNIKNIĘCIA.
  // Ten zawodnik ma TRZY obszary kluczowe z identycznym wynikiem 70 → identycznym
  // zwrotem 30. „Weź trzy pierwsze" wybrałoby jeden alfabetycznie i wyrzuciło dwa.
  check('⭐⭐ (W4) trafnych jest SZEŚĆ, bo trzy obszary kluczowe remisują na zwrocie 30 — ⛔ i żaden nie znika po cichu',
    z.trafne.size === 6
    && ['fizycznosc', 'percepcja', 'moc', 'wytrzymalosc', 'decyzja', 'odzywianie'].every((o) => z.trafne.has(o)),
    [...z.trafne].sort().join(' · '));

  check('⛔ (W4) …a obszary o zwrocie NIŻSZYM niż trzeci najwyższy NIE wchodzą: tolerancja (24) jest poza',
    !z.trafne.has('tolerancja') && !z.trafne.has('techFund') && !z.trafne.has('odpornosc'),
    [...z.trafne].sort().join(' · '));

  check('⛔ (W4) ranking jest POSORTOWANY malejąco po zwrocie — pierwszy jest największy',
    z.obszary[0].obszar === 'fizycznosc',
    z.obszary.slice(0, 3).map((o) => `${o.obszar}:${o.zwrot}`).join(' · '));

  // ⛔ Zapadka na kolejność kluczy w JSON-ie: ten sam zestaw, inna kolejność.
  const odwrotnie = Object.fromEntries(Object.entries(WYNIKI_92).reverse());
  const z2 = policzZwrotObszarow({ wyniki: odwrotnie, pozycja: POZYCJA_92 });
  check('⛔ (W4) wynik NIE ZALEŻY od kolejności kluczy w JSON-ie diagnozy',
    z2.rodzaj === 'jest' && [...z2.trafne].sort().join() === [...z.trafne].sort().join(),
    'ranking zmienia się przy tej samej diagnozie zapisanej w innej kolejności');
}

console.log('\nW4-B. TRZY WARTOŚCI, NIE DWIE (R5)');
{
  const bezDiagnozy = policzZwrotObszarow({ wyniki: null, pozycja: POZYCJA_92 });
  const bezPozycji = policzZwrotObszarow({ wyniki: WYNIKI_92, pozycja: null });
  const zlaPozycja = policzZwrotObszarow({ wyniki: WYNIKI_92, pozycja: 'Trener bramkarzy' });

  check('⭐ brak diagnozy → „nie wiemy" Z POWODEM, ⛔ nie „nic nie jest trafne"',
    bezDiagnozy.rodzaj === 'nie_wiemy' && bezDiagnozy.powod.length > 10, JSON.stringify(bezDiagnozy));
  check('⭐ brak pozycji → „nie wiemy" Z POWODEM',
    bezPozycji.rodzaj === 'nie_wiemy' && /pozycj/i.test(bezPozycji.powod), JSON.stringify(bezPozycji));
  check('⭐ nieznana pozycja → „nie wiemy" i POWÓD CYTUJE tę pozycję',
    zlaPozycja.rodzaj === 'nie_wiemy' && zlaPozycja.powod.includes('Trener bramkarzy'), JSON.stringify(zlaPozycja));

  // ⭐⭐ NAJWAŻNIEJSZA ASERCJA CAŁEJ GRUPY
  check('⭐⭐ (W4, decyzja 1A) przy KAŻDYM „nie wiemy" trafność wynosi 1,0 — ⛔ NIKT NIE TRACI PUNKTÓW za to, że produkt czegoś nie wie',
    [bezDiagnozy, bezPozycji, zlaPozycja].every((z) =>
      trafnoscSesji({ zwrot: z, obszar: 'moc', zewnetrzna: false }) === TRAFNOSC_BAZOWA),
    'brak wiedzy produktu zamienił się w karę dla zawodnika');
}

console.log('\nW4-C. TRAFNOŚĆ SESJI');
{
  const z = policzZwrotObszarow({ wyniki: WYNIKI_92, pozycja: POZYCJA_92 });
  const t = (obszar: string | null, zewnetrzna = false) => trafnoscSesji({ zwrot: z, obszar, zewnetrzna });

  check('⭐ praca własna w obszar trafny → 1,5',
    t('moc') === TRAFNOSC_W_OBSZAR_TRAFNY && t('fizycznosc') === TRAFNOSC_W_OBSZAR_TRAFNY, `${t('moc')}`);
  check('⭐ praca własna poza obszarami trafnymi → 1,0, ⛔ NIGDY mniej',
    t('regeneracja') === TRAFNOSC_BAZOWA && t('techFund') === TRAFNOSC_BAZOWA, `${t('regeneracja')}`);
  check('⛔ (decyzja Kuby) TRENING KLUBOWY I MECZ mają 1,0 nawet w obszarze trafnym — zawodnik nie ma wpływu na ich treść',
    t('moc', true) === TRAFNOSC_BAZOWA, `${t('moc', true)}`);
  check('⭐ nieznany obszar sesji → 1,0, a nie kara',
    t(null) === TRAFNOSC_BAZOWA && t('') === TRAFNOSC_BAZOWA, `${t(null)}`);

  check('⛔ (W4) ŻADNA droga nie zwraca trafności poniżej 1,0 — sprawdzone przez PODSTAWIENIE, nie przez lekturę',
    ['moc', 'regeneracja', 'cokolwiek', ''].every((o) =>
      [true, false].every((zew) => t(o, zew) >= TRAFNOSC_BAZOWA)),
    'gdzieś powstała trafność karząca');
}

console.log('\nW4-D. PRACA WŁASNA ZADEKLAROWANA W DIAGNOZIE');
{
  const z = policzZwrotObszarow({ wyniki: WYNIKI_92, pozycja: POZYCJA_92 });
  const o = ocenPraceWlasna({ zwrot: z, rodzaje: 'silownia,bieganie,stretching,technika' });
  check('⭐⭐ (W4) PRAWDZIWY ZAWODNIK: z czterech rzeczy, które robi dodatkowo, TRAFIAJĄ DWIE — siłownia i bieganie',
    o.rodzaj === 'jest' && o.trafiaja.length === 2
    && o.trafiaja.includes('silownia') && o.trafiaja.includes('bieganie')
    && o.nieTrafiaja.length === 2
    && o.nieTrafiaja.includes('stretching') && o.nieTrafiaja.includes('technika'),
    JSON.stringify(o));
  check('⭐⭐ (W4) …a TRZY jego obszary trafne nie dostają NICZEGO: percepcja, szybkość decyzji, odżywianie',
    o.rodzaj === 'jest' && o.trafneBezPokrycia.length === 3
    && ['percepcja', 'decyzja', 'odzywianie'].every((x) => o.trafneBezPokrycia.includes(x)),
    o.rodzaj === 'jest' ? o.trafneBezPokrycia.join(' · ') : '');
  check('⛔ (W4, R5) rodzaj spoza mapy jest NAZWANY, a nie pominięty po cichu',
    (() => { const x = ocenPraceWlasna({ zwrot: z, rodzaje: 'silownia,joga' });
      return x.rodzaj === 'jest' && x.nieznaneRodzaje.length === 1 && x.nieznaneRodzaje[0] === 'joga'; })(),
    'nieznany rodzaj pracy zniknął bez śladu');
  check('⭐ (W4, R5) brak deklaracji → „nie wiemy", ⛔ nie „nic nie trafia"',
    ocenPraceWlasna({ zwrot: z, rodzaje: null }).rodzaj === 'nie_wiemy'
    && ocenPraceWlasna({ zwrot: z, rodzaje: '  ' }).rodzaj === 'nie_wiemy',
    'pusta deklaracja policzona jako zero trafień');
  check('⛔ (M1) mapa pracy własnej pokrywa DOKŁADNIE te rodzaje — pięć do wyboru + jeden historyczny',
    Object.keys(MAPA_PRACY_WLASNEJ).sort().join(',') === 'bieganie,mental,odnowa,silownia,stretching,technika',
    Object.keys(MAPA_PRACY_WLASNEJ).sort().join(','));

  // ═══ M1 — DECYZJA KUBY 18.08.2026 ═══════════════════════════════
  check('⭐ (M1) siłownia celuje TAKŻE w tolerancję obciążeń — decyzja Kuby 18.08',
    (MAPA_PRACY_WLASNEJ.silownia ?? []).includes('tolerancja'),
    (MAPA_PRACY_WLASNEJ.silownia ?? []).join(' · '));
  check('⭐ (M1) `odnowa` istnieje i celuje WYŁĄCZNIE w regenerację — ⛔ bez odporności „na wszelki wypadek"',
    (MAPA_PRACY_WLASNEJ.odnowa ?? []).join(',') === 'regeneracja',
    (MAPA_PRACY_WLASNEJ.odnowa ?? []).join(' · '));
  check('⛔ (M1) `stretching` NIE JEST proponowany zawodnikowi — jest wyłącznie aliasem historycznym',
    !RODZAJE_PRACY_WLASNEJ_DO_WYBORU.includes('stretching')
    && RODZAJE_PRACY_WLASNEJ_HISTORYCZNE.includes('stretching'),
    RODZAJE_PRACY_WLASNEJ_DO_WYBORU.join(' · '));
  check('⭐⛔ (M1, B3) alias liczy DOKŁADNIE TO SAMO co `odnowa` — 12 zawodników w bazie ma wpisany `stretching` i nie wolno im tej pracy odebrać po cichu',
    (MAPA_PRACY_WLASNEJ.stretching ?? []).join(',') === (MAPA_PRACY_WLASNEJ.odnowa ?? []).join(','),
    `stretching=[${(MAPA_PRACY_WLASNEJ.stretching ?? []).join()}] odnowa=[${(MAPA_PRACY_WLASNEJ.odnowa ?? []).join()}]`);
  check('⛔ (M1) KAŻDY rodzaj do wyboru ma swoje obszary w mapie — lista wyboru nie może wskazywać w pustkę',
    RODZAJE_PRACY_WLASNEJ_DO_WYBORU.every((r) => (MAPA_PRACY_WLASNEJ[r] ?? []).length > 0),
    RODZAJE_PRACY_WLASNEJ_DO_WYBORU.filter((r) => !(MAPA_PRACY_WLASNEJ[r] ?? []).length).join(' · '));
  check('⛔ (M1) rodzaj historyczny i rodzaj do wyboru to ROZŁĄCZNE zbiory',
    !RODZAJE_PRACY_WLASNEJ_HISTORYCZNE.some((r) => RODZAJE_PRACY_WLASNEJ_DO_WYBORU.includes(r))
    && RODZAJE_PRACY_WLASNEJ_HISTORYCZNE.every((r) => r in MAPA_PRACY_WLASNEJ),
    'rodzaj stoi w obu listach naraz — czyli „wywalony" i „proponowany" jednocześnie');
  check('⭐⛔ (M1) zawodnik z `odnowa` i zawodnik z `stretching` dostają IDENTYCZNY wynik — sprawdzone WYWOŁANIEM, nie lekturą mapy',
    (() => {
      const stary = ocenPraceWlasna({ zwrot: z, rodzaje: 'silownia,bieganie,stretching,technika' });
      const nowy = ocenPraceWlasna({ zwrot: z, rodzaje: 'silownia,bieganie,odnowa,technika' });
      if (stary.rodzaj !== 'jest' || nowy.rodzaj !== 'jest') return false;
      return stary.trafiaja.join(',') === nowy.trafiaja.join(',')
        && stary.trafneBezPokrycia.join(',') === nowy.trafneBezPokrycia.join(',')
        && stary.nieznaneRodzaje.length === 0 && nowy.nieznaneRodzaje.length === 0;
    })(),
    'przemianowanie zmieniło komuś wynik — czyli nie było przemianowaniem');
  check('⛔ (W4) każdy obszar z mapy istnieje w profilach pozycji — mapa nie wskazuje w próżnię',
    Object.values(MAPA_PRACY_WLASNEJ).flat()
      .every((obszar) => Object.values(POSITION_PROFILES).some((p) => obszar in p.tiers)),
    'mapa pracy własnej wskazuje obszar, którego nie zna ani jeden profil pozycji');
}

console.log('\nW4-M. ⭐ BATERIA MUTACJI');
{
  type Pred = { nazwa: string; ok: () => boolean };
  const bateria = (
    zwrotFn: typeof policzZwrotObszarow,
    trafFn: typeof trafnoscSesji,
  ): Pred[] => {
    const z = zwrotFn({ wyniki: WYNIKI_92, pozycja: POZYCJA_92 });
    return [
      { nazwa: 'moc bije odżywianie', ok: () => z.rodzaj === 'jest'
        && (z.obszary.find((o) => o.obszar === 'moc')?.zwrot ?? 0) > (z.obszary.find((o) => o.obszar === 'odzywianie')?.zwrot ?? 0) },
      { nazwa: 'odżywianie zostaje trafne przez podłogę', ok: () => z.rodzaj === 'jest' && z.trafne.has('odzywianie') },
      { nazwa: 'remis na granicy wchodzi w komplecie — trafnych jest sześć', ok: () => z.rodzaj === 'jest' && z.trafne.size === 6 },
      { nazwa: 'klub ma trafność bazową', ok: () => trafFn({ zwrot: z, obszar: 'moc', zewnetrzna: true }) === TRAFNOSC_BAZOWA },
      { nazwa: 'praca własna w trafny obszar ma premię', ok: () => trafFn({ zwrot: z, obszar: 'moc', zewnetrzna: false }) > TRAFNOSC_BAZOWA },
      { nazwa: 'nic nie schodzi poniżej bazy', ok: () => trafFn({ zwrot: z, obszar: 'regeneracja', zewnetrzna: false }) >= TRAFNOSC_BAZOWA },
      { nazwa: 'brak wiedzy nie karze', ok: () => trafFn({ zwrot: { rodzaj: 'nie_wiemy', powod: 'x' } as ZwrotObszarow, obszar: 'moc', zewnetrzna: false }) === TRAFNOSC_BAZOWA },
    ];
  };
  const ileFail = (b: readonly Pred[]) => b.filter((p) => !p.ok()).length;

  check('⭐⭐ (W4-M) ASERCJA ODWROTNA — na PRAWDZIWYCH regułach bateria ma ZERO FAIL-i',
    ileFail(bateria(policzZwrotObszarow, trafnoscSesji)) === 0,
    bateria(policzZwrotObszarow, trafnoscSesji).filter((p) => !p.ok()).map((p) => p.nazwa).join(' · '));

  const mutacje: readonly (readonly [string, () => number])[] = [
    ['MZ1 ⛔ tier przestaje się liczyć — zwrot to sam deficyt', () => ileFail(bateria(
      (a) => { const z = policzZwrotObszarow(a); if (z.rodzaj !== 'jest') return z;
        const ob = z.obszary.map((o) => ({ ...o, zwrot: 100 - o.wynik }));
        const naj = [...ob].sort((x, y) => (y.zwrot as number) - (x.zwrot as number)).slice(0, ILE_NAJWYZSZYCH_ZWROTOW);
        return { rodzaj: 'jest', obszary: ob, trafne: new Set(naj.map((o) => o.obszar)) }; },
      trafnoscSesji))],
    ['MZ2 ⛔ podłoga skasowana — niski wynik w obszarze pobocznym wypada', () => ileFail(bateria(
      (a) => { const z = policzZwrotObszarow(a); if (z.rodzaj !== 'jest') return z;
        const naj = [...z.obszary].filter((o) => o.zwrot !== null)
          .sort((x, y) => (y.zwrot as number) - (x.zwrot as number)).slice(0, ILE_NAJWYZSZYCH_ZWROTOW);
        return { rodzaj: 'jest', obszary: z.obszary, trafne: new Set(naj.map((o) => o.obszar)) }; },
      trafnoscSesji))],
    ['MZ3 ⛔ trening klubowy zaczyna dostawać premię', () => ileFail(bateria(
      policzZwrotObszarow,
      (a) => (a.zwrot.rodzaj === 'jest' && typeof a.obszar === 'string' && a.zwrot.trafne.has(a.obszar)
        ? TRAFNOSC_W_OBSZAR_TRAFNY : TRAFNOSC_BAZOWA)))],
    ['MZ4 ⛔ trafność zaczyna KARAĆ pracę poza obszarem trafnym', () => ileFail(bateria(
      policzZwrotObszarow,
      (a) => { const t = trafnoscSesji(a); return t === TRAFNOSC_BAZOWA && !a.zewnetrzna ? 0.7 : t; }))],
    ['MZ5 ⛔ brak diagnozy liczony jak zero trafności', () => ileFail(bateria(
      policzZwrotObszarow,
      (a) => (a.zwrot.rodzaj !== 'jest' ? 0 : trafnoscSesji(a))))],
    ['MZ6 ⛔ waga tieru wyrównana — key, important i minor znaczą to samo', () => ileFail(bateria(
      (a) => { const z = policzZwrotObszarow(a); if (z.rodzaj !== 'jest') return z;
        const ob = z.obszary.map((o) => ({ ...o, zwrot: o.tier === null ? null : (100 - o.wynik) * 0.6 }));
        const naj = [...ob].filter((o) => o.zwrot !== null)
          .sort((x, y) => (y.zwrot as number) - (x.zwrot as number)).slice(0, ILE_NAJWYZSZYCH_ZWROTOW);
        const podl = ob.filter((o) => o.wynik <= PROG_PODLOGI_WYNIKU).map((o) => o.obszar);
        return { rodzaj: 'jest', obszary: ob, trafne: new Set([...naj.map((o) => o.obszar), ...podl]) }; },
      trafnoscSesji))],
  ];

  let nieZapalone: string | null = null;
  for (const [nazwa, uruchom] of mutacje) {
    const n = uruchom();
    console.log(`       ${nazwa}   →   ${n} FAIL`);
    if (n === 0 && nieZapalone === null) nieZapalone = nazwa;
  }
  check(`⭐⭐ (W4-M) KAŻDA z ${mutacje.length} mutacji zapala strażnika`,
    nieZapalone === null, `nie zapaliła: ${nieZapalone}`);
  check('⭐ (W4-M) …a prawdziwe reguły są po baterii NIETKNIĘTE',
    WAGA_TIERU.key === 1.0 && WAGA_TIERU.minor === 0.3 && PROG_PODLOGI_WYNIKU === 40
    && ileFail(bateria(policzZwrotObszarow, trafnoscSesji)) === 0,
    'bateria zostawiła ślad w prawdziwych regułach');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
