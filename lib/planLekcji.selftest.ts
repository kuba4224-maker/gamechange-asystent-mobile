// PLAN-D-A2A3 08.2026 (14.08.2026) — STRAŻNIK PLANU LEKCJI I REGUŁY R5.
//
//   npx tsx lib/planLekcji.selftest.ts
//
// (albo `node tests/run-selftests.mjs`, który odkrywa ten plik sam).
//
// ⛔ PIERWSZA I NAJWAŻNIEJSZA ASERCJA TEGO PLIKU: `NIE_WIEM` ≠ `WOLNE`.
// Gdyby te dwa stany się skleiły, produkt powiedziałby zawodnikowi, o którym
// nie wie NIC, że ma wolny tydzień. To jest kłamstwo o zawodniku (Z0)
// i dokładnie ten defekt, który makieta nazywa trzema różnymi pustkami.
//
// ⛔ ZAKAZ `new URL(...)` — O53, TS2769.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parsujPlanLekcji,
  oknoDnia,
  wolnyCzasPo,
  wykryjCiasno,
  isoDzienTygodnia,
  zbudujOknaDoZapisu,
  PROG_CIASNO_MINUT,
  type WierszPlanuLekcji,
} from './planLekcji';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

// Wiersze DOKŁADNIE w kształcie, w jakim wraca `public.school_week(date)` —
// przepisane z przebiegu na PostgreSQL 16 w kontenerze (K7), nie wymyślone.
const w = (
  on_date: string, weekday: number, timetable_id: number | null,
  starts_at: string | null, ends_at: string | null,
): WierszPlanuLekcji => ({ on_date, weekday, timetable_id, starts_at, ends_at });

// Tydzień 10–16.08.2026 zawodnika, który plan PODAŁ: szkoła pon–pt,
// sobota i niedziela bez szkoły.
const TYDZIEN_Z_PLANEM: WierszPlanuLekcji[] = [
  w('2026-08-10', 1, 7, '08:00:00', '15:30:00'),
  w('2026-08-11', 2, 7, '08:00:00', '16:30:00'),
  w('2026-08-12', 3, 7, '08:00:00', '15:30:00'),
  w('2026-08-13', 4, 7, '08:00:00', '15:30:00'),
  w('2026-08-14', 5, 7, '08:00:00', '14:00:00'),
  w('2026-08-15', 6, 7, null, null),
  w('2026-08-16', 7, 7, null, null),
];

// Ten sam tydzień u zawodnika, który planu NIE PODAŁ. Różnica w danych jest
// jedna: `timetable_id` jest puste. Wynik ma być zupełnie inny.
const TYDZIEN_BEZ_PLANU: WierszPlanuLekcji[] = TYDZIEN_Z_PLANEM.map(
  (r) => w(r.on_date, r.weekday, null, null, null));

// ═══════════════════════════════════════════════════════════════════════════
// (1) REGUŁA R5 — TRZY STANY, NIGDY DWA
// ═══════════════════════════════════════════════════════════════════════════
{
  const zPlanem = parsujPlanLekcji(TYDZIEN_Z_PLANEM);
  const bezPlanu = parsujPlanLekcji(TYDZIEN_BEZ_PLANU);

  const sobotaZPlanem = oknoDnia(zPlanem, '2026-08-15');   // podał plan, nie ma szkoły
  const sobotaBezPlanu = oknoDnia(bezPlanu, '2026-08-15'); // nie podał nic

  check('⛔ R5: dzień wolny to WOLNE', sobotaZPlanem.stan === 'WOLNE', sobotaZPlanem.stan);
  check('⛔ R5: brak planu to NIE_WIEM', sobotaBezPlanu.stan === 'NIE_WIEM', sobotaBezPlanu.stan);
  check('⛔ R5: NIE_WIEM I WOLNE TO DWIE RÓŻNE RZECZY — NIE WOLNO ICH SKLEIĆ',
    sobotaZPlanem.stan !== sobotaBezPlanu.stan,
    `oba dały ${sobotaZPlanem.stan} — produkt powie „masz wolny tydzień" komuś, o kim nic nie wie`);

  // Cały tydzień, nie jeden dzień: zawodnik bez planu nie ma ANI JEDNEGO dnia
  // wyglądającego na wolny.
  const dniBezPlanu = TYDZIEN_BEZ_PLANU.map((r) => oknoDnia(bezPlanu, r.on_date).stan);
  check('⛔ R5: zawodnik bez planu ma 7 z 7 dni NIE_WIEM, zero WOLNE',
    dniBezPlanu.length === 7 && dniBezPlanu.every((s) => s === 'NIE_WIEM'),
    dniBezPlanu.join(','));

  const dniZPlanem = TYDZIEN_Z_PLANEM.map((r) => oknoDnia(zPlanem, r.on_date).stan);
  check('zawodnik z planem ma 5 × SZKOLA i 2 × WOLNE, zero NIE_WIEM',
    dniZPlanem.filter((s) => s === 'SZKOLA').length === 5
    && dniZPlanem.filter((s) => s === 'WOLNE').length === 2
    && dniZPlanem.filter((s) => s === 'NIE_WIEM').length === 0,
    dniZPlanem.join(','));

  check('trzy stany i tylko trzy — żadna nowa wartość nie wchodzi bokiem',
    [...dniZPlanem, ...dniBezPlanu].every((s) => s === 'NIE_WIEM' || s === 'WOLNE' || s === 'SZKOLA'),
    [...dniZPlanem, ...dniBezPlanu].join(','));

  check('dzień, którego w wyniku nie było, to NIE_WIEM — nigdy WOLNE',
    oknoDnia(zPlanem, '2026-09-30').stan === 'NIE_WIEM', oknoDnia(zPlanem, '2026-09-30').stan);
}

// ═══════════════════════════════════════════════════════════════════════════
// (2) NIEUDANY ODCZYT ≠ BRAK PLANU
// ═══════════════════════════════════════════════════════════════════════════
{
  const nieudany = parsujPlanLekcji(null);
  const pusty = parsujPlanLekcji([]);
  check('odczyt, który się nie udał, ma odczytany === false',
    nieudany.odczytany === false, String(nieudany.odczytany));
  check('odczyt udany, ale bez wierszy, ma odczytany === true',
    pusty.odczytany === true, String(pusty.odczytany));
  check('nieudany odczyt da się odróżnić od „zawodnik nic nie podał"',
    nieudany.odczytany !== pusty.odczytany,
    'ekran wyśle do formularza kogoś, kto już wszystko wpisał');
  check('nieudany odczyt NIE udaje dnia wolnego',
    oknoDnia(nieudany, '2026-08-15').stan === 'NIE_WIEM', oknoDnia(nieudany, '2026-08-15').stan);
}

// ═══════════════════════════════════════════════════════════════════════════
// (3) OKIENKA — kilka okien jednego dnia
// ═══════════════════════════════════════════════════════════════════════════
{
  const plan = parsujPlanLekcji([
    w('2026-09-02', 3, 8, '08:00:00', '11:30:00'),
    w('2026-09-02', 3, 8, '13:00:00', '15:30:00'),
  ]);
  const sroda = oknoDnia(plan, '2026-09-02');
  check('dwa okna jednego dnia dają SZKOLA z dwoma oknami',
    sroda.stan === 'SZKOLA' && (sroda as any).okna.length === 2, JSON.stringify(sroda));
  check('początek dnia to najwcześniejsze okno, koniec — najpóźniejsze',
    (sroda as any).poczatek === '08:00' && (sroda as any).koniec === '15:30', JSON.stringify(sroda));

  // Kolejność z bazy bywa dowolna; wynik ma być ten sam.
  const odwrotnie = parsujPlanLekcji([
    w('2026-09-02', 3, 8, '13:00:00', '15:30:00'),
    w('2026-09-02', 3, 8, '08:00:00', '11:30:00'),
  ]);
  check('kolejność wierszy z bazy nie zmienia wyniku',
    JSON.stringify(oknoDnia(odwrotnie, '2026-09-02')) === JSON.stringify(sroda),
    JSON.stringify(oknoDnia(odwrotnie, '2026-09-02')));

  // Okno bez jednej strony nie jest oknem i nie wolno drugiej zgadywać.
  const polowiczne = parsujPlanLekcji([w('2026-09-03', 4, 8, '08:00:00', null)]);
  check('okno bez godziny zakończenia nie tworzy SZKOLA — druga strona nie jest zgadywana',
    oknoDnia(polowiczne, '2026-09-03').stan === 'WOLNE',
    JSON.stringify(oknoDnia(polowiczne, '2026-09-03')));
}

// ═══════════════════════════════════════════════════════════════════════════
// (4) ILE ZOSTAJE — zero to nie brak
// ═══════════════════════════════════════════════════════════════════════════
{
  check('szkoła do 15:30, trening 18:00 → 150 minut', wolnyCzasPo('15:30', '18:00') === 150,
    String(wolnyCzasPo('15:30', '18:00')));
  check('szkoła do 16:30, trening 18:00 → 90 minut (przypadek z makiety)',
    wolnyCzasPo('16:30', '18:00') === 90, String(wolnyCzasPo('16:30', '18:00')));
  check('⛔ styk: 18:00 po 18:00 → 0, a NIE null („zdążysz na styk" to odpowiedź)',
    wolnyCzasPo('18:00', '18:00') === 0, String(wolnyCzasPo('18:00', '18:00')));
  check('⛔ brak końca szkoły → null, a NIE 0', wolnyCzasPo(null, '18:00') === null,
    String(wolnyCzasPo(null, '18:00')));
  check('⛔ brak godziny wydarzenia → null, a NIE 0', wolnyCzasPo('16:30', null) === null,
    String(wolnyCzasPo('16:30', null)));
  check('⛔ zero i null to DWIE RÓŻNE ODPOWIEDZI',
    wolnyCzasPo('18:00', '18:00') !== wolnyCzasPo(null, null), 'styk sklejony z „nie wiem"');
  check('wydarzenie przed końcem szkoły → liczba UJEMNA, nie null i nie zero',
    wolnyCzasPo('18:00', '17:00') === -60, String(wolnyCzasPo('18:00', '17:00')));
  check('godziny z bazy (z sekundami) liczą się tak samo',
    wolnyCzasPo('16:30:00', '18:00:00') === 90, String(wolnyCzasPo('16:30:00', '18:00:00')));
}

// ═══════════════════════════════════════════════════════════════════════════
// (5) CIASNO — nigdy bez obu składników
// ═══════════════════════════════════════════════════════════════════════════
{
  const plan = parsujPlanLekcji(TYDZIEN_Z_PLANEM);
  const bezPlanu = parsujPlanLekcji(TYDZIEN_BEZ_PLANU);

  const wtorek = wykryjCiasno(oknoDnia(plan, '2026-08-11'), '18:00', 'trening');
  check('wtorek z makiety: CIASNO, 90 minut',
    wtorek.stan === 'CIASNO' && wtorek.minut === 90, JSON.stringify(wtorek));
  check('powód jest materiałem na linię makiety „szkoła do 16:30, trening o 18:00"',
    wtorek.powod === 'szkoła do 16:30, trening o 18:00', String(wtorek.powod));

  const poniedzialek = wykryjCiasno(oknoDnia(plan, '2026-08-10'), '18:00', 'trening');
  check('poniedziałek (szkoła do 15:30, 150 minut) to LUZ, nie CIASNO',
    poniedzialek.stan === 'LUZ' && poniedzialek.minut === 150, JSON.stringify(poniedzialek));

  const sobota = wykryjCiasno(oknoDnia(plan, '2026-08-15'), '11:00', 'mecz');
  check('dzień wolny: LUZ bez liczby — szkoła niczego nie ściska',
    sobota.stan === 'LUZ' && sobota.minut === null, JSON.stringify(sobota));

  const nieWiem = wykryjCiasno(oknoDnia(bezPlanu, '2026-08-11'), '18:00', 'trening');
  check('⛔ brak planu: NIE_WIEM, bez liczby i bez powodu — nie „LUZ"',
    nieWiem.stan === 'NIE_WIEM' && nieWiem.minut === null && nieWiem.powod === null,
    JSON.stringify(nieWiem));
  check('⛔ dzień wolny i brak planu dają RÓŻNY stan także tutaj',
    sobota.stan !== nieWiem.stan, 'R5 przecieka przez wykryjCiasno');

  const bezGodziny = wykryjCiasno(oknoDnia(plan, '2026-08-11'), null, 'trening');
  check('szkoła jest, godziny wydarzenia nie ma → NIE_WIEM',
    bezGodziny.stan === 'NIE_WIEM' && bezGodziny.minut === null, JSON.stringify(bezGodziny));

  const kolizja = wykryjCiasno(oknoDnia(plan, '2026-08-11'), '15:00', 'trening');
  check('wydarzenie w środku szkoły to KOLIZJA, nie CIASNO',
    kolizja.stan === 'KOLIZJA' && kolizja.minut === -90, JSON.stringify(kolizja));

  const styk = wykryjCiasno(oknoDnia(plan, '2026-08-11'), '16:30', 'trening');
  check('styk (0 minut) to CIASNO, nie KOLIZJA',
    styk.stan === 'CIASNO' && styk.minut === 0, JSON.stringify(styk));

  // ⛔ ASERCJA NA REGUŁĘ, NIE NA LISTĘ: przejeżdżamy wszystkie kombinacje
  // dzień × godzina i wymagamy, żeby CIASNO nigdy nie padło bez OBU składników.
  const dni = ['2026-08-10', '2026-08-11', '2026-08-15', '2026-09-30'];
  const godziny: Array<string | null> = ['18:00', '11:00', '00:00', '16:30', null, '', 'bzdura'];
  const zle: string[] = [];
  for (const plan2 of [plan, bezPlanu, parsujPlanLekcji(null)]) {
    for (const d of dni) {
      for (const g of godziny) {
        const r = wykryjCiasno(oknoDnia(plan2, d), g, 'trening');
        if ((r.stan === 'CIASNO' || r.stan === 'KOLIZJA')
            && (r.koniecSzkoly === null || r.godzinaWydarzenia === null || r.minut === null)) {
          zle.push(`${d}/${String(g)} → ${JSON.stringify(r)}`);
        }
        if (r.stan === 'NIE_WIEM' && r.minut !== null) {
          zle.push(`NIE_WIEM z liczbą: ${d}/${String(g)} → ${JSON.stringify(r)}`);
        }
      }
    }
  }
  check('⛔ CIASNO/KOLIZJA nigdy nie pada bez obu składników, NIE_WIEM nigdy nie niesie liczby',
    zle.length === 0, zle.join(' · '));

  // Powód to materiał, nie brzmienie: bez nazwy wydarzenia go NIE MA.
  check('bez nazwy wydarzenia powód jest null — rzeczownik jest brzmieniem Kuby',
    wykryjCiasno(oknoDnia(plan, '2026-08-11'), '18:00').powod === null,
    String(wykryjCiasno(oknoDnia(plan, '2026-08-11'), '18:00').powod));
}

// ═══════════════════════════════════════════════════════════════════════════
// (6) PRÓG — nazwana stała, nie liczba w warunku
// ═══════════════════════════════════════════════════════════════════════════
{
  check('PROG_CIASNO_MINUT jest wyeksportowany i jest liczbą',
    typeof PROG_CIASNO_MINUT === 'number' && PROG_CIASNO_MINUT > 0, String(PROG_CIASNO_MINUT));

  // Klasyfikacja ma iść ZA stałą, nie za wpisaną liczbą: zmiana stałej
  // (tu: symulowana przez policzenie na granicy) ma przesuwać granicę.
  const naGranicy = parsujPlanLekcji([
    w('2026-08-11', 2, 7, '08:00:00', '16:30:00'),
  ]);
  const okno = oknoDnia(naGranicy, '2026-08-11');
  const doGranicy = wykryjCiasno(okno, minutyNaGodzine(990 + PROG_CIASNO_MINUT), 'trening');
  const zaGranica = wykryjCiasno(okno, minutyNaGodzine(990 + PROG_CIASNO_MINUT + 1), 'trening');
  check('dokładnie na progu → CIASNO', doGranicy.stan === 'CIASNO', JSON.stringify(doGranicy));
  check('minutę za progiem → LUZ', zaGranica.stan === 'LUZ', JSON.stringify(zaGranica));

  const tu = dirname(fileURLToPath(import.meta.url));
  const zrodlo = readFileSync(join(tu, 'planLekcji.ts'), 'utf8');
  const kod = zrodlo.split('\n').filter((l) => {
    const t = l.trim();
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
  }).join('\n');

  check('próg stoi w JEDNEJ nazwanej stałej', /export const PROG_CIASNO_MINUT\s*=\s*\d+/.test(kod),
    'brak nazwanej stałej progu');
  check('stała ma komentarz z prefiksem pasa — da się ją znaleźć grepem',
    /PLAN-D-A2A3 08\.2026 — próg niezmierzony/.test(zrodlo), 'brak komentarza o niezmierzonym progu');
  check('⛔ klasyfikacja porównuje ze STAŁĄ, nie z liczbą wpisaną w warunek',
    /minut\s*<=\s*PROG_CIASNO_MINUT/.test(kod) && !/minut\s*<=\s*\d+/.test(kod),
    'w warunku „ciasno" siedzi goła liczba');
  check('ten moduł nie ma DRUGIEJ implementacji parsowania godziny',
    !/\(\\d\{1,2\}\):\(\\d\{2\}\)/.test(kod.replace(/\\\\/g, '\\')) || /from '\.\/godzinaWydarzenia'/.test(kod),
    'godzina parsowana dwa razy — gwarantowany rozjazd');
  check('formatowanie godziny bierze się z jednego miejsca',
    /import \{[^}]*formatujGodzine[^}]*\} from '\.\/godzinaWydarzenia'/.test(zrodlo),
    'brak importu z godzinaWydarzenia');
}

function minutyNaGodzine(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// (7) DZIEŃ TYGODNIA — jedno przeliczenie, nie dwa
// ═══════════════════════════════════════════════════════════════════════════
{
  check('2026-08-10 (poniedziałek) → 1', isoDzienTygodnia('2026-08-10') === 1,
    String(isoDzienTygodnia('2026-08-10')));
  check('2026-08-14 (piątek) → 5', isoDzienTygodnia('2026-08-14') === 5,
    String(isoDzienTygodnia('2026-08-14')));
  check('2026-08-15 (sobota) → 6', isoDzienTygodnia('2026-08-15') === 6,
    String(isoDzienTygodnia('2026-08-15')));
  check('⛔ 2026-08-16 (niedziela) → 7, a nie 0 — baza liczy po ISO',
    isoDzienTygodnia('2026-08-16') === 7, String(isoDzienTygodnia('2026-08-16')));
  check('numeracja zgadza się z weekday z bazy dla całego tygodnia',
    TYDZIEN_Z_PLANEM.every((r) => isoDzienTygodnia(r.on_date) === r.weekday),
    TYDZIEN_Z_PLANEM.map((r) => `${r.on_date}:${isoDzienTygodnia(r.on_date)}≠${r.weekday}`).join(','));
  check('śmieci dają null, nie przypadkową liczbę',
    isoDzienTygodnia('bzdura') === null && isoDzienTygodnia('') === null,
    'parsowanie daty przepuszcza śmieci');
}

// ═══════════════════════════════════════════════════════════════════════════
// (8) ZAPIS — pusty plan jest poprawną deklaracją
// ═══════════════════════════════════════════════════════════════════════════
{
  const pelny = zbudujOknaDoZapisu([
    { weekday: 1, od: '8:00', do_: '15:30' },
    { weekday: 2, od: '08:00', do_: '16:30' },
    { weekday: 6, od: '', do_: '' },
  ]);
  check('dni bez godzin wypadają z zapisu (to są dni wolne, nie błąd)',
    pelny.ok === true && pelny.okna.length === 2, JSON.stringify(pelny));
  check('godziny normalizowane do dwóch cyfr przed wysłaniem do bazy',
    pelny.ok === true && pelny.okna[0].starts_at === '08:00', JSON.stringify(pelny));

  const pusty = zbudujOknaDoZapisu([]);
  check('⛔ pusta lista jest POPRAWNA — „podałem plan, nie mam szkoły" to deklaracja',
    pusty.ok === true && pusty.okna.length === 0, JSON.stringify(pusty));

  const polowa = zbudujOknaDoZapisu([{ weekday: 1, od: '08:00', do_: '' }]);
  check('jedna godzina bez drugiej to błąd, nie cichy dzień wolny',
    polowa.ok === false, JSON.stringify(polowa));

  const odwrotnie = zbudujOknaDoZapisu([{ weekday: 1, od: '16:00', do_: '08:00' }]);
  check('koniec przed początkiem to błąd po stronie appki (baza też go odrzuci)',
    odwrotnie.ok === false, JSON.stringify(odwrotnie));

  const zlyDzien = zbudujOknaDoZapisu([{ weekday: 8, od: '08:00', do_: '09:00' }]);
  check('dzień spoza 1–7 to błąd (baza odrzuci go CHECK-iem chk_school_slot_weekday)',
    zlyDzien.ok === false, JSON.stringify(zlyDzien));

  const bezsens = zbudujOknaDoZapisu([{ weekday: 1, od: '25:00', do_: '26:00' }]);
  check('godzina spoza doby nie jedzie do bazy', bezsens.ok === false, JSON.stringify(bezsens));

  const bezsens2 = zbudujOknaDoZapisu([{ weekday: 1, od: '25:00', do_: '' }]);
  check('⛔ jedna godzina bez sensu, druga pusta — to BŁĄD, a nie cichy dzień wolny',
    bezsens2.ok === false, JSON.stringify(bezsens2));

  const spacje = zbudujOknaDoZapisu([{ weekday: 1, od: '   ', do_: '   ' }]);
  check('same spacje liczą się jako pusto (dzień wolny), nie jako błąd',
    spacje.ok === true && spacje.okna.length === 0, JSON.stringify(spacje));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
