// ═══════════════════════════════════════════════════════════════════
// STRAŻNIK EKRANU 2 „PROFIL" — PLAN-D-A3, 18.08.2026
// ═══════════════════════════════════════════════════════════════════
//
// ⛔ CZEGO TEN STRAŻNIK PILNUJE — czterech reguł, z których każda da się
// złamać jedną linijką i żadnej nie widać na oko:
//   A. ROZWÓJ nigdy nie maleje i nie ma okna.
//   B. Przy OBCIĄŻENIU nie ma oceny, a do czasu D1 nie ma tam LICZBY.
//   C. Słowo „AU" i „jednostki umowne" nie wchodzą na ekran.
//   D. Pustka jest NAZWANA, nie wypełniona zerem.
//   E. Ekran mieści się nad zgięciem i ma dokładnie pięć pozycji.
//
// ⚠️ ASERCJE TEKSTOWE SĄ TU DRUGIM, NIE PIERWSZYM DOWODEM. Strażnik czytający
// tekst dowodzi, że wywołanie jest NAPISANE — nie, że się ROZWIĄZUJE. Dlatego
// przy każdym imporcie ekranu stoi asercja URUCHAMIAJĄCA (sekcja F).

import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  KOLEJNOSC_POZYCJI,
  NAZWA_FILTRU_PROGOW,
  NAZWA_OBCIAZENIA,
  NAZWA_ROZWOJU,
  OBCIAZENIE_BEZ_LICZBY,
  OBCIAZENIE_NIC_NIE_WAZY,
  OBCIAZENIE_NIE_POLICZONE_POWOD,
  OBCIAZENIE_NIE_POLICZONE_ZDANIE,
  OBCIAZENIE_ODNIESIENIE,
  OBCIAZENIE_PODPIS,
  OBCIAZENIE_ZAMIAST_LICZBY,
  POWOD_FILTRU_PROGOW,
  PRACA_DODATKOWA_BRAK,
  PRACA_DODATKOWA_ZDANIE,
  PRZYPIS_CZEGO_TU_NIE_MA,
  ROZWOJ_JESZCZE_NIC,
  ROZWOJ_NIE_POLICZONE,
  USTAWIENIA_CZEGO_NIE_MA,
  arkuszTrafnosci,
  obciazenieNaEkranie,
  opiszLiczbe,
  pozycjeProfilu,
  pracaDodatkowaNaEkranie,
  progiNaEkranie,
  rozwojZNagrody,
  trafnoscZawodnika,
  policzObciazenieZOdczytow,
  policzRozwojZOdczytow,
  mapaSegmentowBlokow,
  stanSegmentowSesji,
  zdanieOSegmentachDoLogu,
  wejscieNagrodyZOdczytow,
  wejscieObciazeniaZOdczytow,
  wybierzPozycje,
  zbudujModelProfilu,
  zdanieOPracyDodatkowej,
  type DaneICel,
  type LiczbyZrodel,
  type OdczytyDoRozwoju,
  type PowodBrakuPracyDodatkowej,
  type WejscieModelu,
} from './ekranProfilu';
import {
  PROGI,
  jednostkiZDziennika,
  jednostkiZMeczow,
  jednostkiZOdpowiedziKontrolnych,
  opisNagrodyDoLogu,
  policzNagrode,
  wagaSesji,
  zrodloSesji,
  type JednostkaPracy,
  type NagrodaZaPrace,
  type WejscieNagrody,
  type WierszOdpowiedziKontrolnej,
} from './nagrodaZaPrace';
// ⛔ PAS P1 — ścieżka „Dziś" liczy się TYMI SAMYMI funkcjami, co produkcyjna.
// Przepisanie jej tutaj dowodziłoby wyłącznie tego, że umiem przepisać.
import { WERDYKTY_NIEPODANE } from './wykonanieSesji';
import { meczDlaNagrody, type WierszMeczuWgl } from './wejsciaWgladow';
import {
  OKNO_OBCIAZENIA_DNI,
  OKNO_ODNIESIENIA_DNI,
  opisObciazeniaDoLogu,
  policzObciazenieWOknie,
  type ObciazenieWOknie,
} from './obciazenieOstatnichDni';
import { PRZELICZNIK_OBCIAZENIA, obciazenieSesji } from './obciazenie';
// ⛔ Zdanie do konsoli, nie brzmienie — używane WYŁĄCZNIE w komunikatach asercji.
import { zmierzEkran } from './wysokoscEkranu';
import { rozpoznajPustke, zyweZrodlo } from './trzyPustki';

let passed = 0;
let failed = 0;
function check(nazwa: string, ok: boolean, szczegol = ''): void {
  if (ok) { passed++; console.log(`OK   - ${nazwa}`); } else { failed++; console.log(`FAIL - ${nazwa}\n       ${szczegol}`); }
}

const EKRAN = 'app/(tabs)/ja.tsx';
const MODUL = 'lib/ekranProfilu.ts';
const zrodloEkranu = readFileSync(EKRAN, 'utf8');
const zrodloModulu = readFileSync(MODUL, 'utf8');

/**
 * Tekst po usunięciu komentarzy — bo komentarz nie jest tym, co widzi zawodnik.
 * ⛔ ŚWIADOMIE `zyweZrodlo` z `lib/trzyPustki.ts`, a nie własne dwa przejścia:
 * strażnik, który przechodzi tekst dwa razy, potrafi zjeść własne źródło
 * (pas Q1, „ostatni centymetr"). Jedna kopia reguły, jedno przejście.
 */
function bezKomentarzy(src: string): string {
  return zyweZrodlo(src);
}
const ARKUSZE = 'components/ArkuszeProfilu.tsx';
const zrodloArkuszy = readFileSync(ARKUSZE, 'utf8');
const ekranZywy = bezKomentarzy(zrodloEkranu);
const modulZywy = bezKomentarzy(zrodloModulu);
const arkuszeZywe = bezKomentarzy(zrodloArkuszy);

// ── narzędzia do budowania wejść ─────────────────────────────────────
function jedn(klucz: string, punkty: number, dzien: string, segment: string | null = null): JednostkaPracy {
  return {
    klucz, rodzaj: 'sesja_z_dowodem', punkty, pochodzenieWagi: 'z_rodzaju',
    segment, zOdpowiedziaKontrolna: false, kiedy: { rodzaj: 'dzien_pracy', dzien },
  };
}
function wejscie(jednostki: readonly JednostkaPracy[], segmenty: readonly string[] = []): WejscieNagrody {
  return {
    sesje: { rodzaj: 'jest', jednostki },
    dziennik: { rodzaj: 'jest', jednostki: [] },
    odpowiedziKontrolne: { rodzaj: 'jest', jednostki: [] },
    mecze: { rodzaj: 'jest', jednostki: [] },
    segmentyCelow: { rodzaj: 'pelne', segmenty: new Set(segmenty) },
  };
}
const LICZBY_PUSTE: LiczbyZrodel = { wpisy: 0, oceny: 0, mecze: 0, pomiary: 0 };
const LICZBY_NIEZNANE: LiczbyZrodel = { wpisy: null, oceny: null, mecze: null, pomiary: null };
const WYNIKI_PRAWDZIWE = {
  moc: 70, wytrzymalosc: 70, fizycznosc: 30, techFund: 80, techSpec: 60, tolerancja: 60,
  regeneracja: 80, odpornosc: 90, odzywianie: 40, koncentracja: 50, mental: 50,
  percepcja: 40, decyzja: 70,
};
const POZYCJA_PRAWDZIWA = 'Boczny obrońca';

/** ⭐ Dzisiaj podane z zewnątrz — ten strażnik nie ma zegara, tak jak moduł. */
const DZIS_D1 = '2026-08-18';

/**
 * ⭐ ODCZYTY, NA KTÓRYCH DA SIĘ ZOBACZYĆ OBIE MIARY NARAZ. Jedna sesja
 * z DWIEMA liczbami (30 minut, ciężkość 6) i przypisanym segmentem — czyli
 * dokładnie ten kształt, który na produkcji daje 1,000 punktu obciążenia.
 */
function odczytyZSesja(dzien = '2026-08-17'): OdczytyDoRozwoju {
  return {
    wydarzenia: {
      rodzaj: 'jest',
      wiersze: [{
        id: 34, scheduled_date: dzien, status: 'completed', recurrence_rule: null,
        focus_block_id: 'blok-1', event_type: 'own_training', source: 'player', planned_minutes: 30,
      }],
    },
    dziennik: {
      rodzaj: 'jest',
      wiersze: [{
        id: 16, entry_type: 'post_training', created_at: `${dzien}T19:00:00Z`,
        payload: { duration_minutes: 30, rpe: 6 }, calendar_event_id: 34,
      }],
    },
    odpowiedziKontrolne: { rodzaj: 'jest', wiersze: [] },
    mecze: { rodzaj: 'jest', wiersze: [] },
    cele: { rodzaj: 'jest', wiersze: [{ segment_id: 'moc' }] },
    // ⭐ PAS P1 — Blok, z którego pochodzi sesja `blok-1`. Do 19.08.2026 tego
    // pola w ogóle nie było, a moduł podawał `segmentBloku: null` na sztywno.
    bloki: { rodzaj: 'jest', wiersze: [{ id: 'blok-1', segment_id: 'fizycznosc' }] },
    zwrot: null,
  };
}

function okna(o: OdczytyDoRozwoju): { okno: ObciazenieWOknie; odniesienie: ObciazenieWOknie } {
  return policzObciazenieZOdczytow(o, { dzis: DZIS_D1 });
}
const OKNA_MODELU = okna(odczytyZSesja());

function model(nadpisz: Partial<WejscieModelu> = {}): WejscieModelu {
  const t = trafnoscZawodnika({
    wyniki: WYNIKI_PRAWDZIWE, pozycjaZDiagnozy: POZYCJA_PRAWDZIWA,
    pozycjaZProfilu: null, rodzajePracy: 'silownia,bieganie,stretching,technika',
  });
  const dane: DaneICel = { rocznik: null, wzrostPomiarow: 0, pozycja: t.pozycja, cel: null };
  return {
    nagroda: policzNagrode(wejscie([jedn('a', 3, '2026-08-10')])),
    zwrot: t.zwrot,
    pracaWlasna: t.pracaWlasna,
    maDiagnoze: t.maDiagnoze,
    pozycja: t.pozycja,
    rodzajePracy: 'silownia,bieganie,stretching,technika',
    liczby: LICZBY_PUSTE,
    daneICel: dane,
    raportRodzicaIstnieje: false,
    obciazenieOkna: OKNA_MODELU.okno,
    obciazenieOdniesienia: OKNA_MODELU.odniesienie,
    ...nadpisz,
  };
}

console.log('\n══ A. ROZWÓJ NIGDY NIE MALEJE ══════════════════════════════════');

{
  // A1 — dołożenie DOWOLNEJ jednostki nigdy nie zmniejsza liczby na ekranie.
  const rosnacy: JednostkaPracy[] = [];
  let poprzednia = 0;
  let spadek: string | null = null;
  for (let i = 0; i < 25; i++) {
    rosnacy.push(jedn(`u${i}`, (i % 4) * 0.833, `2026-0${1 + (i % 8)}-1${i % 9}`, i % 3 === 0 ? 'moc' : null));
    const r = rozwojZNagrody(policzNagrode(wejscie(rosnacy, ['moc'])));
    const teraz = r.rodzaj === 'jest' ? r.punkty : 0;
    if (teraz < poprzednia && spadek === null) spadek = `po ${i + 1} jednostkach: ${teraz} < ${poprzednia}`;
    poprzednia = teraz;
  }
  check('⭐ (A1) 25 kolejnych dołożeń jednostki NIGDY nie zmniejsza rozwoju', spadek === null, spadek ?? '');
}

{
  // A1b — te same jednostki rozrzucone w czasie dają tę samą liczbę.
  const skupione = [jedn('x1', 3, '2026-08-18'), jedn('x2', 2, '2026-08-18')];
  const rozrzucone = [jedn('x1', 3, '2024-01-02'), jedn('x2', 2, '2026-08-18')];
  const a = rozwojZNagrody(policzNagrode(wejscie(skupione)));
  const b = rozwojZNagrody(policzNagrode(wejscie(rozrzucone)));
  check('⭐ (A1b) rok przerwy między jednostkami nie zmienia liczby ani o punkt',
    a.rodzaj === 'jest' && b.rodzaj === 'jest' && a.punkty === b.punkty,
    `${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
}

// ⭐ PRZECELOWANE 18.08.2026 (pas D1). DO 18.08 TA ASERCJA ZABRANIAŁA
// MODUŁOWI EKRANU 2 ZNAĆ OKNO W OGÓLE — i to była właściwa ochrona na czas,
// kiedy jedyna funkcja o nazwie „obciążenie" sumowała wartość DOROBKU.
// ⛔ Od pasa D1 okno jest podpięte, więc zakaz importu przestałby cokolwiek
// chronić. W jego miejsce stoi zakaz WĘŻSZY I MOCNIEJSZY: moduł ekranu wolno
// mu okno WOŁAĆ, ⛔ nie wolno mu okna ANI ZEGARA MIEĆ U SIEBIE.
check('⭐⛔ (A2) moduł ekranu 2 NIE MA ZEGARA — dzisiejszą datę podaje ekran',
  !/new Date\(/.test(modulZywy) && !/Date\.now\(/.test(modulZywy),
  'moduł sięgnął po zegar — od tej chwili ta sama liczba znaczy co innego o północy');

check('⭐⛔ (A2b) moduł ekranu 2 NIE PRZEPISAŁ SOBIE wzoru obciążenia',
  !/\/\s*180\b/.test(modulZywy) && !/\b180\b/.test(modulZywy)
  && !/minuty\s*\*/.test(modulZywy)
  && /PRZELICZNIK_OBCIAZENIA/.test(readFileSync('lib/obciazenie.ts', 'utf8')),
  'przelicznik ma drugą kopię — pierwsza poprawka rozjedzie oba miejsca');

{
  // ⭐⭐ (A2c) NAJWAŻNIEJSZA ASERCJA STRUKTURALNA PASA D1.
  // Obciążenie nie może zależeć od trafności, a trafność mieszka wyłącznie
  // w `lib/zwrotObszaru.ts` i wchodzi do pracy przez `lib/nagrodaZaPrace.ts`.
  // ⛔ Jeżeli którykolwiek z dwóch plików obciążenia zaimportuje choć jedną
  // nazwę z któregokolwiek z nich, droga istnieje — reszta jest kwestią czasu.
  const pliki = ['lib/obciazenie.ts', 'lib/obciazenieOstatnichDni.ts'];
  const zle = pliki.filter((f) => /from\s+'\.\/(nagrodaZaPrace|zwrotObszaru)'/.test(readFileSync(f, 'utf8')));
  check('⭐⭐⛔ (A2c) ŻADEN z dwóch plików obciążenia nie importuje trafności ani dorobku',
    zle.length === 0,
    `importują: ${zle.join(', ')} — trafność ma drogę do obciążenia`);
}

{
  // A3 — „nie policzone" NIE MA pola `punkty` i nie da się go narysować zerem.
  const nieudane: NagrodaZaPrace = {
    rodzaj: 'nie_policzona', powod: 'nie odczytałem 1 z 4 źródeł pracy', nieodczytane: ['mecze: sieć'],
  };
  const r = rozwojZNagrody(nieudane);
  check('⭐ (A3) „nie policzone" nie ma pola `punkty` — zera nie ma z czego narysować',
    r.rodzaj === 'nie_policzone' && !('punkty' in r), JSON.stringify(r));
  const zero = rozwojZNagrody(policzNagrode(wejscie([])));
  check('⭐ (A3b) „jeszcze nic" i „nie policzone" to DWA RÓŻNE warianty',
    zero.rodzaj === 'jeszcze_nic' && r.rodzaj === 'nie_policzone', `${zero.rodzaj} vs ${r.rodzaj}`);
  check('⭐ (A3c) …i DWA RÓŻNE teksty na ekranie (D4)',
    ROZWOJ_JESZCZE_NIC !== ROZWOJ_NIE_POLICZONE('cokolwiek')
    && ekranZywy.includes('ROZWOJ_JESZCZE_NIC') && ekranZywy.includes('ROZWOJ_NIE_POLICZONE'),
    'ekran rysuje obie pustki jednym zdaniem');
}

{
  // A4 — zbiór celów budowany BEZ filtra po statusie.
  const o: OdczytyDoRozwoju = {
    wydarzenia: { rodzaj: 'jest', wiersze: [] },
    dziennik: { rodzaj: 'jest', wiersze: [] },
    odpowiedziKontrolne: { rodzaj: 'jest', wiersze: [] },
    mecze: { rodzaj: 'jest', wiersze: [] },
    cele: { rodzaj: 'jest', wiersze: [{ segment_id: 'moc' }, { segment_id: 'wytrzymalosc' }] },
    bloki: { rodzaj: 'jest', wiersze: [] },
    zwrot: null,
  };
  const we = wejscieNagrodyZOdczytow(o);
  check('⭐ (A4) zbiór celów jest KOMPLETNY, gdy odczyt się udał',
    we.segmentyCelow.rodzaj === 'pelne' && we.segmentyCelow.segmenty.size === 2, JSON.stringify(we.segmentyCelow));
  check('⭐ (A4b) ⛔ w kodzie ekranu NIE MA filtra `status` przy odczycie celów do rozwoju',
    !/from\('goals'\)[\s\S]{0,220}?eq\('status'/.test(ekranZywy),
    'cel domknięty przestałby liczyć się do odznaki — licznik cofnąłby się z powodu sukcesu');
  const padniete = wejscieNagrodyZOdczytow({ ...o, cele: { rodzaj: 'nie_odczytano', powod: 'sieć' } });
  check('⭐ (A4c) nieodczytane cele dają zbiór NIEPEŁNY, a nie pusty',
    padniete.segmentyCelow.rodzaj === 'niepelne', JSON.stringify(padniete.segmentyCelow));
}

console.log('\n══ B. PRZY OBCIĄŻENIU ŻADNEJ OCENY ═════════════════════════════');

{
  // ⭐ WZMOCNIONE 18.08.2026 (pas D1) NA DWA SPOSOBY.
  //
  // 1. GAŁĄŹ JEST PEŁNA. Do 18.08 stały w niej DWIE stałe, bo tyle ich było.
  //    Od dziś obciążenie ma na ekranie liczbę, podpis, okno odniesienia
  //    i dwa zdania o pustce — i każde z nich musi przejść tę samą listę.
  // 2. ⚠️ WZORCE MAJĄ GRANICE SŁOWA, A NIE SĄ PODCIĄGIEM. Wersja z 18.08 rano
  //    pytała `includes('ciężko')` — a słowo `ciężkość` zawiera `ciężkoś`.
  //    Strażnik zapaliłby się na NAZWIE DRUGIEJ SKŁADOWEJ WZORU, czyli na
  //    rzeczy, bez której obciążenia nie da się w ogóle opisać, i jedynym
  //    sposobem na zieleń byłoby przemianowanie ciężkości. `\bciężko\b`
  //    łapie przymiotnik dnia i przepuszcza rzeczownik pomiaru.
  // ⚠️ ⛔ `\b` W JAVASCRIPCIE JEST ASCII I NIE ZNA POLSKICH LITER — zmierzone
  // 18.08.2026 na tej właśnie asercji: `/\bciężko\b/` ZAPALAŁO SIĘ na słowie
  // „ciężkość", bo `ś` nie jest dla `\b` literą, więc po `ciężko` wypadała
  // granica słowa. Dlatego granice budujemy sami, z polskim alfabetem w środku.
  const LITERA = 'A-Za-z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ';
  const slowo = (rdzen: string, koncowki = ''): RegExp =>
    new RegExp(`(?<![${LITERA}])${rdzen}${koncowki}(?![${LITERA}])`, 'i');
  const zakazane: [string, RegExp][] = [
    ['lekko', slowo('lekko')], ['średnio', slowo('średnio')], ['ciężko', slowo('ciężko')],
    ['bardzo ciężko', /bardzo\s+ciężko/i], ['próg', slowo('pr[oó]g', '(u|i|iem|[oó]w|owa|owy)?')],
    ['ostrzeżenie', /ostrzeż/i], ['alarm', /\balarm/i], ['czerwień', /\bczerw/i],
    ['za dużo', /za\s+dużo/i], ['za mało', /za\s+mało/i], ['powinieneś', /\bpowin(ien|na|no|ieneś)/i],
    ['dobrze', slowo('dobrze')], ['słabo', /\bsłab/i], ['ranking', /\branking/i],
    ['inni zawodnicy', /innych\s+zawodnik/i],
  ];
  const galazObciazenia = [
    NAZWA_OBCIAZENIA, OBCIAZENIE_NIE_POLICZONE_POWOD, OBCIAZENIE_ZAMIAST_LICZBY,
    OBCIAZENIE_PODPIS, OBCIAZENIE_NIC_NIE_WAZY, OBCIAZENIE_BEZ_LICZBY(2),
    OBCIAZENIE_ODNIESIENIE('3,5'), OBCIAZENIE_NIE_POLICZONE_ZDANIE('sieć padła'),
    ...Object.values(PRACA_DODATKOWA_BRAK),
  ].join(' \n ');
  const trafione = zakazane.filter(([, r]) => r.test(galazObciazenia)).map(([n]) => n);
  check(`⛔ (B1) w ${8 + Object.keys(PRACA_DODATKOWA_BRAK).length} brzmieniach obciążenia nie ma ani jednego z ${zakazane.length} przymiotników werdyktu`,
    trafione.length === 0, trafione.join(', '));
  // ⭐ Strażnik strażnika: lista naprawdę łapie, a nie jest ozdobą.
  check('⭐ (B1b) (strażnik strażnika) ta sama lista ZAPALA się na próbce z werdyktem',
    zakazane.some(([, r]) => r.test('ten tydzień był bardzo ciężko i za dużo')),
    'lista przymiotników nie łapie nawet jawnej próbki');
  // ⭐ …i PRZEPUSZCZA rzeczownik pomiaru — inaczej byłaby nie do spełnienia.
  check('⭐ (B1c) …i PRZEPUSZCZA słowo „ciężkość", bez którego nie ma wzoru',
    !zakazane.some(([, r]) => r.test('minuty razy ciężkość przez przelicznik')),
    'strażnik zabrania nazwać drugą składową wzoru');

  // ⭐⭐ (B1d) ZNALEZISKO WŁASNEJ BATERII MUTACJI, 18.08.2026.
  // ⛔ Asercja wyżej czyta STAŁE. Mutacja „przy obciążeniu pojawia się ocena"
  // dopisała przymiotnik NIE DO STAŁEJ, tylko do miejsca jej użycia
  // (`podpis: \`${OBCIAZENIE_PODPIS} — to bardzo ciężko\``) — i NIE ZAPALIŁA
  // ANI JEDNEJ ASERCJI W CAŁYM REPOZYTORIUM. To jest dokładnie ta choroba,
  // przed którą ostrzega pas S1: strażnik pyta o stałą zamiast o to, co
  // naprawdę wychodzi na ekran.
  // ⭐ Od dziś pytamy o WYNIK: budujemy model w czterech stanach i przeglądamy
  // KAŻDY napis, który z gałęzi obciążenia wychodzi do zawodnika.
  const stanyObciazenia: readonly ObciazenieWOknie[] = [
    OKNA_MODELU.okno,
    policzObciazenieWOknie({ sesje: { rodzaj: 'jest', sesje: [] }, mecze: { rodzaj: 'jest', sesje: [] } },
      { dzis: DZIS_D1, oknoDni: OKNO_OBCIAZENIA_DNI }),
    policzObciazenieWOknie({
      sesje: {
        rodzaj: 'jest',
        sesje: [{
          klucz: 'x', rodzaj: 'sesja', kiedy: { rodzaj: 'dzien_pracy', dzien: DZIS_D1 },
          pomiar: { minuty: 90, ciezkosc: null },
        }],
      },
      mecze: { rodzaj: 'jest', sesje: [] },
    }, { dzis: DZIS_D1, oknoDni: OKNO_OBCIAZENIA_DNI }),
    { rodzaj: 'nie_policzone', powod: 'nie odczytałem meczów', nieodczytane: ['mecze'] },
  ];
  const napisyZWyniku: string[] = [];
  for (const st of stanyObciazenia) {
    const m = zbudujModelProfilu(model({ obciazenieOkna: st, obciazenieOdniesienia: st })).obciazenie7;
    for (const v of Object.values(m)) if (typeof v === 'string') napisyZWyniku.push(v);
  }
  const trafioneWWyniku = zakazane
    .filter(([, r]) => napisyZWyniku.some((n) => r.test(n)))
    .map(([n]) => n);
  check(`⭐⭐⛔ (B1d) …i ŻADEN z ${napisyZWyniku.length} napisów, które gałąź obciążenia NAPRAWDĘ oddaje, nie niesie werdyktu`,
    trafioneWWyniku.length === 0,
    `${trafioneWWyniku.join(', ')} — w: ${napisyZWyniku.filter((n) => zakazane.some(([, r]) => r.test(n))).join(' | ')}`);
}

{
  // B2 — kolor liczby obciążenia jest STAŁĄ, nie funkcją liczby.
  const stylMiary = /styles\.miaraLiczba/g;
  const ile = (ekranZywy.match(stylMiary) ?? []).length;
  check('⭐ (B2/E4) obie miary rysują liczbę TYM SAMYM stylem `miaraLiczba`',
    ile === 2, `wystąpień stylu: ${ile}`);
  check('⭐ (B2b) styl liczby nie zależy od żadnej wartości — brak wyrażenia warunkowego w stylu miary',
    !/style=\{\[styles\.miaraLiczba/.test(ekranZywy) && !/miaraLiczba,\s*\w+\s*[?>]/.test(ekranZywy),
    'styl miary stał się funkcją liczby — to jest ocena kolorem (D4)');
}

{
  // ⭐⭐⛔ B3 — ZAPADKA A3 PRZECELOWANA, NIE SKASOWANA (pas D1, 18.08.2026).
  //
  // CO PILNOWAŁA DO 18.08: że `ObciazenieNaEkranie` ma DOKŁADNIE JEDEN
  // osiągalny wariant `nie_policzone`. ⭐ To była właściwa ochrona na czas,
  // w którym jedyna funkcja o nazwie „obciążenie" sumowała wartość DOROBKU.
  // CO PILNUJE OD DZIŚ: że obciążenie NIE ZALEŻY OD TRAFNOŚCI — i pilnuje
  // tego URUCHOMIENIEM, a nie czytaniem tekstu.
  const o = obciazenieNaEkranie(OKNA_MODELU.okno, OKNA_MODELU.odniesienie);
  check('⭐ (B3) `obciazenieNaEkranie` oddaje na prawdziwym kształcie danych LICZBĘ',
    o.rodzaj === 'policzone', JSON.stringify(o));
  check('⭐ (B3a) `obciazenieNaEkranie` przyjmuje DWA okna — samo niczego nie liczy',
    /export function obciazenieNaEkranie\(\s*\n\s*okno: ObciazenieWOknie,\s*\n\s*odniesienie: ObciazenieWOknie,/.test(zrodloModulu),
    'funkcja dostała czym liczyć sama — arytmetyka wróciła do modułu ekranu');

  // ⚠️ WYCINAMY DO PUSTEJ LINII, a nie „do pierwszego średnika": średniki
  // siedzą WEWNĄTRZ pól wariantu, więc krótszy wzorzec czytał jeden wariant
  // i przepuszczał dołożenie następnych (zmierzone na tej asercji 18.08).
  const warianty = (() => {
    const odT = zrodloModulu.indexOf('export type ObciazenieNaEkranie =');
    if (odT < 0) return '';
    const koniec = zrodloModulu.indexOf('\n\n', odT);
    return zrodloModulu.slice(odT, koniec < 0 ? zrodloModulu.length : koniec);
  })();
  const ileWariantow = (warianty.match(/rodzaj: '/g) ?? []).length;
  check('⭐ (B3b) typ `ObciazenieNaEkranie` ma DOKŁADNIE TRZY warianty — nie dwa i nie cztery',
    ileWariantow === 3
    && warianty.includes("rodzaj: 'policzone'")
    && warianty.includes("rodzaj: 'nic_nie_wazy'")
    && warianty.includes("rodzaj: 'nie_policzone'"),
    `wariantów: ${ileWariantow} — ${warianty.replace(/\s+/g, ' ').slice(0, 200)}`);

  // ⭐⭐⭐ (B3c) MUTACJA OBOWIĄZKOWA NR 1 PASA D1, ZAPISANA JAKO ASERCJA.
  // TE SAME WIERSZE, DWA RAZY. Raz bez zwrotu obszarów (trafność 1,0 wszędzie),
  // raz ze zwrotem (praca własna w obszarze trafnym dostaje 1,5).
  // ⛔ ROZWÓJ MA SIĘ RÓŻNIĆ — inaczej przełącznik nic nie robi i cała asercja
  //    świeciłaby na zielono, nic nie mierząc.
  // ⛔ OBCIĄŻENIE MA BYĆ IDENTYCZNE CO DO LICZBY.
  // (i) NA POJEDYNCZEJ SESJI — 30 minut, ciężkość 6, dwie trafności.
  const FAKTY_SESJI = {
    eventType: 'own_training', source: 'player', maSesjeTrenera: false,
    minutyZmierzone: 30, minutyZPlanu: 30, rpeZmierzone: 6,
  };
  const rozwojBaza = wagaSesji({ ...FAKTY_SESJI, trafnosc: 1.0 });
  const rozwojPremia = wagaSesji({ ...FAKTY_SESJI, trafnosc: 1.5 });
  const obcSesji = obciazenieSesji({ minuty: 30, ciezkosc: 6 });
  check('⭐⭐ (B3c) …przełącznik trafności NAPRAWDĘ zmienia ROZWÓJ (bez tego reszta nic nie mierzy)',
    rozwojPremia.punkty > rozwojBaza.punkty,
    `rozwój 1,0=${rozwojBaza.punkty} · 1,5=${rozwojPremia.punkty}`);
  check('⭐⭐⭐ (B3c) …a OBCIĄŻENIE tej samej sesji jest JEDNO — funkcja nie ma parametru trafności',
    obcSesji.rodzaj === 'zmierzone' && obcSesji.surowe === rozwojBaza.punkty
    && /export function obciazenieSesji\(p: PomiarSesji\)/.test(readFileSync('lib/obciazenie.ts', 'utf8')),
    `obciążenie=${JSON.stringify(obcSesji)} · rozwój przy trafności 1,0=${rozwojBaza.punkty}`);
  check('⭐⭐⭐ (B3c) …i cała teza produktu DOMYKA SIĘ RACHUNKIEM: ROZWÓJ = OBCIĄŻENIE × TRAFNOŚĆ',
    obcSesji.rodzaj === 'zmierzone'
    && Math.abs(obcSesji.surowe * 1.5 - rozwojPremia.punkty) < 1e-9,
    `${obcSesji.rodzaj === 'zmierzone' ? obcSesji.surowe : '—'} × 1,5 vs ${rozwojPremia.punkty}`);

  // (ii) NA CAŁYM OKNIE — te same wiersze, dwa różne zwroty obszarów.
  const t = trafnoscZawodnika({
    wyniki: WYNIKI_PRAWDZIWE, pozycjaZDiagnozy: POZYCJA_PRAWDZIWA,
    pozycjaZProfilu: null, rodzajePracy: 'silownia',
  });
  const bezTrafnosci: OdczytyDoRozwoju = { ...odczytyZSesja(), zwrot: null };
  const zTrafnoscia: OdczytyDoRozwoju = { ...odczytyZSesja(), zwrot: t.zwrot };
  const obcBez = okna(bezTrafnosci).okno;
  const obcZ = okna(zTrafnoscia).okno;
  check('⭐⭐⭐ (B3c) …a OBCIĄŻENIE W OKNIE przy tych samych wierszach jest IDENTYCZNE',
    obcBez.rodzaj === 'policzone' && obcZ.rodzaj === 'policzone'
    && obcBez.punkty === obcZ.punkty,
    `${opisObciazeniaDoLogu(obcBez)} VS ${opisObciazeniaDoLogu(obcZ)}`);

  // ⭐ (B3d) KOTWICA PRODUKCYJNA: 30 minut przy ciężkości 6 to DOKŁADNIE
  // jeden punkt obciążenia — bo przelicznik jest z tego zdania zbudowany.
  // ⛔ To jest ten sam wiersz, który 18.08.2026 stoi na koncie
  // `gamechangemartaseweryn@gmail.com` (calendar_events.id = 34).
  check('⭐⭐ (B3d) 30 minut × ciężkość 6 = DOKŁADNIE 1 punkt obciążenia',
    obcBez.rodzaj === 'policzone' && obcBez.punkty === 1
    && (30 * 6) / PRZELICZNIK_OBCIAZENIA === 1,
    opisObciazeniaDoLogu(obcBez));

  // ⭐ (B3e) PUSTKA NIE MA LICZBY. Zera nie ma z czego narysować.
  const pusto = obciazenieNaEkranie(
    policzObciazenieWOknie({ sesje: { rodzaj: 'jest', sesje: [] }, mecze: { rodzaj: 'jest', sesje: [] } },
      { dzis: DZIS_D1, oknoDni: OKNO_OBCIAZENIA_DNI }),
    policzObciazenieWOknie({ sesje: { rodzaj: 'jest', sesje: [] }, mecze: { rodzaj: 'jest', sesje: [] } },
      { dzis: DZIS_D1, oknoDni: OKNO_ODNIESIENIA_DNI }),
  );
  check('⭐⛔ (B3e) „nic nie waży w oknie" NIE MA pola `liczba` — zera nie ma z czego narysować',
    pusto.rodzaj === 'nic_nie_wazy' && !('liczba' in pusto), JSON.stringify(pusto));
  check('⭐ (B3f) …i to jest INNY stan niż „nie policzone" — dwa różne zdania',
    pusto.rodzaj === 'nic_nie_wazy'
    && obciazenieNaEkranie(
      { rodzaj: 'nie_policzone', powod: 'sieć padła', nieodczytane: ['mecze'] },
      { rodzaj: 'nie_policzone', powod: 'sieć padła', nieodczytane: ['mecze'] },
    ).rodzaj === 'nie_policzone'
    && OBCIAZENIE_NIC_NIE_WAZY !== OBCIAZENIE_NIE_POLICZONE_ZDANIE('sieć padła'),
    'pustka i awaria mówią tym samym zdaniem');

  // ⛔ (B3g) NA EKRANIE LICZBA IDZIE Z MODELU, a nie z literału.
  // ⚠️ ZNALEZISKO PASA S1, KTÓRE ZOSTAJE W MOCY: pytanie „czy stała pada
  // GDZIEKOLWIEK w pliku" przepuszczało mutację, bo ta sama stała stoi też
  // w kaflu rozwoju. Pytamy o KAFEL OBCIĄŻENIA, wycięty od jego nazwy.
  const kafelObciazenia = (() => {
    const odK = ekranZywy.indexOf('{NAZWA_OBCIAZENIA}');
    if (odK < 0) return null;
    const koniec = ekranZywy.indexOf('</View>', odK);
    return koniec < 0 ? null : ekranZywy.slice(odK, koniec);
  })();
  check('⛔ (B3g) w kaflu obciążenia liczba pochodzi z modelu, a znak zastępczy z nazwanej stałej',
    OBCIAZENIE_ZAMIAST_LICZBY === '—'
    && kafelObciazenia !== null
    && /obciazenie\.rodzaj === 'policzone'/.test(kafelObciazenia)
    && /OBCIAZENIE_ZAMIAST_LICZBY/.test(kafelObciazenia)
    && !/<Text style=\{styles\.miaraLiczba\}>\s*\{?\s*['"0-9]/.test(kafelObciazenia),
    kafelObciazenia === null
      ? 'nie znajduję kafla obciążenia na ekranie — ta asercja nie znaczy nic'
      : `kafel: ${kafelObciazenia.replace(/\s+/g, ' ').slice(0, 200)}`);
}

check('⛔ (B4) ekran NIE RYSUJE zdania z konsoli — `opisObciazeniaDoLogu` nie jest brzmieniem',
  !/opisObciazeniaDoLogu/.test(zrodloEkranu) && !/opisObciazeniaDoLogu/.test(zrodloArkuszy),
  'zdanie diagnostyczne trafiło na ekran zawodnika');

{
  // ═══════════════════════════════════════════════════════════════════
  // B5 — PORÓWNANIE Z INNYMI LUDŹMI (N3) · SERIA DNI (N1)
  //
  // ⛔⛔ PRZECELOWANE 21.08.2026, PAS Z1 — REGUŁA TA SAMA, ZAKRES INNY.
  //
  // Do 21.08 ta asercja nazywała się „zero porównań" i pilnowała czterech
  // wzorców. DWA Z NICH nie miały w sobie ani słowa o INNYCH LUDZIACH:
  //     ['procent w porównaniu', /%\s*(cięż|lżej)/i]
  //     ['średnia z',            /średni[ae]\s+z\b/i]
  // i zapalały się na zdaniu porównującym zawodnika Z JEGO WŁASNĄ
  // PRZESZŁOŚCIĄ:
  //     „ten tydzień jest o 12% cięższy od Twoich czterech ostatnich"
  //     „to więcej niż Twoja średnia z ostatniego miesiąca"
  //
  // ⛔ N3 TEGO NIE ZABRANIA. Cytat z `claude/ZASADY_OBOWIAZUJACE_13_08_2026.md`,
  // czyli z reguły, którą ten strażnik pilnuje (O101):
  //   „Ranking u trenera — tak. U zawodnika — nigdy. Trener widzi zestawienie
  //    swojej drużyny. ZAWODNIK NIGDY NIE WIDZI SWOJEGO MIEJSCA W TABELI —
  //    ani wobec drużyny, ani wobec innych użytkowników.
  //    ⭐ Porównanie z normą dla wieku i etapu dojrzewania: DOZWOLONE
  //    i potrzebne. Norma to nie ranking."
  //
  // ⚠️ SKUTEK ZMIERZONY PRZED PRZECELOWANIEM: pas D1 nie zbudował zdania
  // „ten tydzień jest cięższy od Twoich czterech ostatnich" i napisał wprost,
  // że blokuje go ta zapadka. Produkt stracił funkcję przez regułę, która
  // jej nie zabraniała.
  //
  // ⭐ O101 (Kuba, 21.08.2026): STRAŻNIK CYTUJE REGUŁĘ, KTÓRĄ PILNUJE.
  // Jeżeli pilnuje szerzej niż ona — to jest defekt STRAŻNIKA, nie reguły.
  // Dlatego w nazwach asercji niżej stoi ZAKRES RZECZYWISTY, a nie skrót:
  // napis „zero porównań" był początkiem tego defektu.
  //
  // ⛔ CO ZOSTAJE NIETKNIĘTE I DALEJ ZAPALA:
  //   • N1 — „z rzędu" i „pod rząd" (osobna asercja B5-N1 niżej);
  //   • miejsce w tabeli i ranking;
  //   • porównanie z drużyną, z zespołem, z kolegami i z innymi
  //     zawodnikami albo użytkownikami.
  // ⭐ CO JEST OD DZIŚ DOZWOLONE — i bateria B5c tego DOWODZI:
  //   • porównanie zawodnika z jego własną przeszłością (poprzedni tydzień,
  //     cztery ostatnie tygodnie, jego własna średnia);
  //   • norma dla wieku i etapu dojrzewania (N3 mówi wprost: „norma to nie
  //     ranking"), łącznie ze zdaniem „zawodnicy na tej ścieżce robią X".
  // ═══════════════════════════════════════════════════════════════════
  //
  // Przypis „czego tu nie ma" jest jedynym wyjątkiem i resztę sprawdzamy
  // PO JEGO USUNIĘCIU — bo to jedyne miejsce, w którym te słowa mają paść.
  const bezPrzypisu = modulZywy.replace(PRZYPIS_CZEGO_TU_NIE_MA, ' ')
    .replace(/PRZYPIS_CZEGO_TU_NIE_MA/g, ' ');
  const ekranBezPrzypisu = ekranZywy.replace(/PRZYPIS_CZEGO_TU_NIE_MA/g, ' ');

  /**
   * ⛔ ZWROT, KTÓRY ROBI Z WYMIENIENIA KOGOŚ — PORÓWNANIE.
   *
   * Bez tego warunku zapadka świeciłaby na czerwono NA ZDROWYM KODZIE:
   * w `lib/ekranProfilu.ts` żyją dziś dwa zdania ze słowem „drużyna" i ani
   * jedno nie jest rankingiem — „co robisz dodatkowo poza treningiem
   * z drużyną" (`ZDANIE_BEZ_DEKLARACJI`) oraz „kod drużyny"
   * (`USTAWIENIA_PODPIS`). Strażnik oskarżający poprawny kod zostaje
   * wyciszony przy pierwszej okazji.
   */
  // ⛔ GRANICE SŁOWA SĄ TU OBOWIĄZKOWE, NIE OZDOBNE — i ⛔ NIE WOLNO ICH
  // PISAĆ JAKO `\b`. Dwa defekty zmierzone uruchomieniem 21.08.2026, PRZED
  // pierwszym zapisem na dysk Kuby:
  //   ① wzorzec bez granicy zapalił się na ŻYWYM `USTAWIENIA_PODPIS`
  //      („dostęp, kOD drużyny…"), bo „od" siedzi w środku słowa „kod";
  //   ② wzorzec z `\b` NIE ZAPALIŁ SIĘ na „więcej NIŻ reszta zespołu",
  //      bo `\b` liczy `\w`, czyli `[A-Za-z0-9_]`, a „ż" nie jest dla niego
  //      literą — po „niż" nie ma więc żadnej granicy do złapania.
  // Dlatego granicą jest tu JAWNA KLASA LITER POLSKICH w obu kierunkach.
  const LITERA = String.raw`[a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]`;
  const ZWROT_POROWNUJACY =
    `(?<!${LITERA})`
    + String.raw`(?:niż|od|na tle|wobec|spośród|pośród|w porównaniu\s+(?:z|do)`
    + String.raw`|lepsz[a-ząćęłńóśźż]*|gorsz[a-ząćęłńóśźż]*|lepiej|gorzej|wyżej|niżej`
    + String.raw`|średni[a-ząćęłńóśźż]*\s+(?:dla|w))`
    + `(?!${LITERA})`;
  /** Do dwóch słów wypełnienia między zwrotem porównującym a nazwą grupy. */
  const LUZ = String.raw`(?:\s+` + LITERA + String.raw`+){0,2}\s+`;
  /** Nazwy GRUP LUDZI, wobec których N3 zabrania stawiać zawodnika. */
  const GRUPA_LUDZI =
    String.raw`(?:drużyn[a-ząćęłńóśźż]*|zespoł[a-ząćęłńóśźż]*|zespol[a-ząćęłńóśźż]*|zespół`
    + String.raw`|koleg[a-ząćęłńóśźż]*|koledz[a-ząćęłńóśźż]*)`;

  /** ⛔ N3 — CZTERY RZECZY, KTÓRYCH ZABRANIA, I TYLKO ONE. */
  const wzorceInniLudzie: [string, RegExp][] = [
    ['miejsce w tabeli', /miejsc[a-ząćęłńóśźż]*\s+w\s+tabeli/i],
    ['ranking', /\brankin[a-ząćęłńóśźż]*/i],
    ['porównanie z drużyną, zespołem albo kolegami',
      new RegExp(ZWROT_POROWNUJACY + LUZ + GRUPA_LUDZI, 'i')],
    // ⛔ RDZEŃ TO `zawodni`, NIE `zawodnik`. Mianownik liczby mnogiej brzmi
    // „zawodni**cy**", a nie „zawodnik-i" — wzorzec na `zawodnik` przepuszczał
    // zdanie „Robisz mniej niż inni zawodnicy na Twojej pozycji". To jest ta
    // sama choroba, którą `lib/zdobyczeRundy.selftest.ts` opisał przy `jednost`.
    ['porównanie z innymi zawodnikami albo użytkownikami',
      /\b(?:inn|pozostał|reszt)[a-ząćęłńóśźż]*\s+(?:zawodni|użytkowni|gracz)[a-ząćęłńóśźż]*/i],
    ['ile robią inni',
      /\b(?:ile|ilu|jak\s+(?:dużo|wielu))\b(?:\s+[a-ząćęłńóśźż]+){0,3}\s+(?:inn|pozostał)[a-ząćęłńóśźż]*/i],
  ];

  /** ⛔ N1 — NIETKNIĘTE. Licznik dni z rzędu dalej nie ma prawa paść. */
  const wzorceSerieDni: [string, RegExp][] = [
    ['dni z rzędu', /z rzędu|pod rząd/i],
  ];

  const zleInni = wzorceInniLudzie
    .filter(([, r]) => r.test(bezPrzypisu) || r.test(ekranBezPrzypisu)).map(([n]) => n);
  check('⭐⛔ (B5/N3) zero porównań Z INNYMI LUDŹMI — z drużyną, z innymi zawodnikami, '
    + 'z miejscem w tabeli i z rankingiem. ⭐ Porównanie z WŁASNĄ przeszłością jest dozwolone',
    zleInni.length === 0, zleInni.join(', '));

  const zleSerie = wzorceSerieDni
    .filter(([, r]) => r.test(bezPrzypisu) || r.test(ekranBezPrzypisu)).map(([n]) => n);
  check('⭐⛔ (B5/N1) zero serii dni — „z rzędu" i „pod rząd" nie wchodzą na ekran',
    zleSerie.length === 0, zleSerie.join(', '));

  check('⭐ (B5b) …a samo zdanie „czego tu nie ma" NADAL stoi na ekranie',
    ekranZywy.includes('PRZYPIS_CZEGO_TU_NIE_MA') && PRZYPIS_CZEGO_TU_NIE_MA.includes('z rzędu'),
    'przypis zniknął razem ze słowami, których miał zabraniać');

  // ── (B5c) ⭐ BATERIA MUTACJI — DOWÓD, ŻE PRZECELOWANY STRAŻNIK NADAL ŁAPIE
  //          TO, PO CO POWSTAŁ, I PRZEPUSZCZA TO, CO N3 DOPUSZCZA.
  //
  // ⛔ Próbki są SYNTETYCZNE i mutujemy TEKST W PAMIĘCI, nie plik na dysku
  // (wzorzec pasa M2) — nie ma więc czego przywracać i nic nie zależy od tego,
  // czy proces dobiegł końca. ⛔ Próbki nie znikną też razem z naprawą kodu:
  // to jest ta sama ostrożność, co przy „strażniku strażnika" (O71).
  const zapalaN3 = (t: string): boolean => wzorceInniLudzie.some(([, r]) => r.test(t));
  const zapalaN1 = (t: string): boolean => wzorceSerieDni.some(([, r]) => r.test(t));

  /** ⛔ MUSI ZAPALIĆ — to jest to, po co ten strażnik powstał. */
  const MUSI_ZAPALIC: readonly string[] = [
    'Twój tydzień jest o 12% cięższy od średniej w drużynie.',
    'To więcej niż reszta zespołu zrobiła w tym tygodniu.',
    'Jesteś na 4. miejscu w tabeli swojej drużyny.',
    'Twoje miejsce w rankingu klubu: 7.',
    'Robisz mniej niż inni zawodnicy na Twojej pozycji.',
    'Zobacz, ile robią inni użytkownicy aplikacji.',
    'Wypadasz gorzej niż koledzy z drużyny.',
    'Trenujesz na tle zespołu poniżej przeciętnej.',
  ];
  /** ⭐ MUSI PRZEJŚĆ — N3 tego NIE zabrania, a produkt tego potrzebuje. */
  const MUSI_PRZEJSC: readonly string[] = [
    // ⭐ Zdanie, którego pas D1 nie zbudował, bo blokowała go stara zapadka.
    'Ten tydzień jest o 12% cięższy od Twoich czterech ostatnich.',
    'To więcej niż Twoja średnia z ostatniego miesiąca.',
    'W tym tygodniu zrobiłeś 6 jednostek, w poprzednim 4.',
    'Twoje obciążenie jest niższe niż w zeszłym tygodniu.',
    // ⭐ N3: „Porównanie z normą dla wieku i etapu dojrzewania: dozwolone."
    'Norma dla 15-latka to 8–10 godzin snu; śpisz 6,2.',
    'Zawodnicy na tej ścieżce robią sześć do ośmiu jednostek, Ty robisz cztery.',
    // ⭐ Zdania, które ŻYJĄ dziś w module i nie mają prawa zapalić.
    'Nie powiedziałeś jeszcze, co robisz dodatkowo poza treningiem z drużyną.',
    'dostęp, kod drużyny, logowanie odciskiem, wylogowanie',
  ];

  const nieZapalily = MUSI_ZAPALIC.filter((t) => !zapalaN3(t));
  check('⭐⛔ (B5c) MUTACJA — każde zdanie porównujące zawodnika Z INNYMI LUDŹMI zapala',
    nieZapalily.length === 0,
    `przeszły, a nie powinny: ${nieZapalily.join(' | ')}`);

  const zapalilyNiepotrzebnie = MUSI_PRZEJSC.filter((t) => zapalaN3(t) || zapalaN1(t));
  check('⭐⛔ (B5c) MUTACJA ODWROTNA — porównanie z WŁASNĄ przeszłością i norma dla wieku PRZECHODZĄ',
    zapalilyNiepotrzebnie.length === 0,
    `zapaliły, a nie powinny: ${zapalilyNiepotrzebnie.join(' | ')}`);

  check('⭐⛔ (B5c) N1 NIETKNIĘTE — „5 dni z rzędu" dalej zapala, „pod rząd" też',
    zapalaN1('Masz 5 dni z rzędu.') && zapalaN1('Trzeci tydzień pod rząd.'),
    'zakaz serii przestał działać przy okazji przecelowania N3');

  check('⭐ (B5c) (strażnik strażnika) obie listy próbek są NIEPUSTE',
    MUSI_ZAPALIC.length >= 8 && MUSI_PRZEJSC.length >= 8,
    `${MUSI_ZAPALIC.length} / ${MUSI_PRZEJSC.length}`);
}

console.log('\n══ C. SŁOWO „AU" NIE WCHODZI NA EKRAN ══════════════════════════');

{
  const zakazane: [string, RegExp][] = [
    ['AU', /\bAU\b/],
    ['a.u.', /\ba\.\s?u\.\s/i],
    ['jednostka umowna', /jednostk\w*\s+umown\w*/i],
    ['arbitrary unit', /arbitrary\s+unit/i],
  ];
  for (const plik of [EKRAN, MODUL, ARKUSZE]) {
    const zywy = bezKomentarzy(readFileSync(plik, 'utf8'));
    const zle = zakazane.filter(([, r]) => r.test(zywy)).map(([n]) => n);
    check(`⭐ (C1) w ${plik} nie pada „AU" ani „jednostka umowna"`, zle.length === 0, zle.join(', '));
  }
}

check('⭐ (C2) na ekranie 2 nie ma słowa „jednostka pracy" — nie ma desygnatu (O92)',
  !/jednostk\w*\s+pracy/i.test(ekranZywy) && !/jednostk\w*\s+pracy/i.test(modulZywy),
  'trzecia waluta wróciła');

check('⭐ (C3) dwie miary mają DWA RÓŻNE rzeczowniki, nigdy sklejone w jedno słowo',
  /punkt[a-ząćęłńóśźż]*\s+rozwoju/.test(modulZywy)
  && /punkt[a-ząćęłńóśźż]*\s+obciążenia/.test(modulZywy)
  // ⛔ Przez `String(...)`, bo obie stałe mają typ literalny i `tsc` uznaje
  // porównanie za bezcelowe. Sprawdzenie ma zostać RUNTIME-owe: ktoś, kto je
  // kiedyś zrówna, ma zobaczyć czerwień, a nie błąd kompilacji w strażniku.
  && String(NAZWA_ROZWOJU) !== String(NAZWA_OBCIAZENIA)
  && !/punktorozwoju|punktoobciazenia/i.test(modulZywy),
  'jedna nazwa na dwie waluty (N1)');

console.log('\n══ D. PUSTKA NAZWANA, NIE WYPEŁNIONA ZEREM ═════════════════════');

{
  // D1 — żadnej liczby na ekran przez `?? 0` / `|| 0` / `?? []`.
  const zle = [...ekranZywy.matchAll(/\?\?\s*0\b|\|\|\s*0\b|\?\?\s*\[\]/g)].map((m) => m[0]);
  check('⭐ (D1) w `ja.tsx` nie ma ani jednego `?? 0`, `|| 0` ani `?? []`',
    zle.length === 0, zle.join(' · '));
}

{
  // D2 — trzy wartości w każdym polu modelu.
  const rozwoj = zrodloModulu.match(/export type RozwojNaEkranie =([\s\S]*?);\n/)?.[1] ?? '';
  const warianty = (rozwoj.match(/rodzaj: '/g) ?? []).length;
  check('⭐ (D2) `RozwojNaEkranie` ma DOKŁADNIE TRZY warianty — nie dwa i nie cztery',
    warianty === 3, `wariantów: ${warianty}`);
  const praca = zrodloModulu.match(/export type PracaDodatkowaNaEkranie =([\s\S]*?)\n\n/)?.[1] ?? '';
  check('⭐ (D2b) `PracaDodatkowaNaEkranie` ma wariant „jest" i wariant „nie wiemy" z POWODEM',
    /rodzaj: 'jest'/.test(praca)
    && /rodzaj: 'nie_wiemy';\s*powod: PowodBrakuPracyDodatkowej/.test(praca),
    praca.slice(0, 200).replace(/\s+/g, ' '));
}

{
  // D3 — trzy (u nas cztery) powody „nie wiemy", każdy z WŁASNYM zdaniem.
  const klucze: PowodBrakuPracyDodatkowej[] = ['brak_diagnozy', 'brak_pozycji', 'nie_umiem_policzyc', 'brak_deklaracji'];
  const zdania = klucze.map((k) => PRACA_DODATKOWA_BRAK[k]);
  check('⭐ (D3) cztery różne braki → cztery RÓŻNE zdania, ani jedno sklejone',
    new Set(zdania).size === klucze.length && zdania.every((z) => z.length > 20), zdania.join(' | '));

  const bezDiagnozy = pracaDodatkowaNaEkranie({
    maDiagnoze: false, pozycja: { pozycja: null, zrodlo: 'nie_znam' },
    zwrot: { rodzaj: 'nie_wiemy', powod: 'x' }, rodzajePracy: null,
    pracaWlasna: { rodzaj: 'nie_wiemy', powod: 'x' },
  });
  const t = trafnoscZawodnika({
    wyniki: WYNIKI_PRAWDZIWE, pozycjaZDiagnozy: null, pozycjaZProfilu: null, rodzajePracy: 'silownia',
  });
  const bezPozycji = pracaDodatkowaNaEkranie({ ...t, rodzajePracy: 'silownia' });
  const t2 = trafnoscZawodnika({
    wyniki: WYNIKI_PRAWDZIWE, pozycjaZDiagnozy: POZYCJA_PRAWDZIWA, pozycjaZProfilu: null, rodzajePracy: null,
  });
  const bezDeklaracji = pracaDodatkowaNaEkranie({ ...t2, rodzajePracy: null });
  check('⭐ (D3b) trzy różne stany dają trzy RÓŻNE zdania — uruchomione, nie przeczytane',
    new Set([zdanieOPracyDodatkowej(bezDiagnozy), zdanieOPracyDodatkowej(bezPozycji), zdanieOPracyDodatkowej(bezDeklaracji)]).size === 3,
    `${bezDiagnozy.rodzaj}/${bezPozycji.rodzaj}/${bezDeklaracji.rodzaj}`);
}

{
  // D5 — pustka ma RODZAJ, nie jest jednym zdaniem na wszystko.
  const bladOdczytu = rozpoznajPustke({
    maWpisy: false, planLekcjiZnany: null, moznaZapisywac: null,
    odczytUdanySie: false, daSieOdswiezyc: true,
  });
  const brakDanych = rozpoznajPustke({
    maWpisy: false, planLekcjiZnany: null, moznaZapisywac: null,
    odczytUdanySie: true, daSieOdswiezyc: true, tekstBrakuDanych: 'Nic tu jeszcze nie ma.',
  });
  check('⭐ (D5) ekran 2 rozróżnia „nie udało się sprawdzić" od „nic tu nie ma"',
    bladOdczytu?.rodzaj === 'blad_odczytu' && brakDanych?.rodzaj === 'brak_danych'
    && bladOdczytu?.tekst !== brakDanych?.tekst,
    `${bladOdczytu?.rodzaj} vs ${brakDanych?.rodzaj}`);
  check('⭐ (D5b) …i sam `ja.tsx` przepuszcza pustkę przez `rozpoznajPustke`',
    /rozpoznajPustke\(/.test(ekranZywy), 'ekran rysuje pustkę bez rodzaju');
}

{
  // D6 — pięć pozycji, każda w dwóch wariantach podpisu.
  const zTrescia = pozycjeProfilu(model({
    liczby: { wpisy: 7, oceny: 0, mecze: 2, pomiary: 0 },
    daneICel: { rocznik: 2011, wzrostPomiarow: 2, pozycja: { pozycja: POZYCJA_PRAWDZIWA, zrodlo: 'diagnoza' }, cel: 'zawodowo' },
    raportRodzicaIstnieje: true,
  }));
  const bez = pozycjeProfilu(model({
    nagroda: policzNagrode(wejscie([])),
    liczby: LICZBY_PUSTE,
    daneICel: { rocznik: null, wzrostPomiarow: 0, pozycja: { pozycja: null, zrodlo: 'nie_znam' }, cel: null },
    raportRodzicaIstnieje: false,
  }));
  check('⭐ (E3/D6) pozycji jest DOKŁADNIE PIĘĆ — ani mniej, ani więcej',
    zTrescia.length === 5 && KOLEJNOSC_POZYCJI.length === 5, `${zTrescia.length}`);
  const rozne = KOLEJNOSC_POZYCJI.filter((_, i) => zTrescia[i].podpis !== bez[i].podpis);
  check('⭐ (D6) cztery z pięciu pozycji mają DWA RÓŻNE podpisy (pełny i pusty)',
    rozne.length >= 4, `różnią się: ${rozne.join(', ')}`);
  check('⭐ (D6b) piąta pozycja — „Ustawienia i konto" — mówi wprost, czego produkt NIE ma (R5)',
    USTAWIENIA_CZEGO_NIE_MA.includes('powiadomień')
    && USTAWIENIA_CZEGO_NIE_MA.includes('hasła')
    && USTAWIENIA_CZEGO_NIE_MA.includes('usunięcia konta')
    && arkuszeZywe.includes('USTAWIENIA_CZEGO_NIE_MA'),
    'ekran obiecuje trzy rzeczy, których w produkcie nie ma');
}

{
  // D7 — żadne zero w „Skąd to wiemy" nie stoi samo.
  const W: [string, string, string] = ['wpis', 'wpisy', 'wpisów'];
  check('⭐ (D7) zero w „Skąd to wiemy" ma obok siebie zdanie, czym to zero jest',
    opiszLiczbe(0, ...W).includes('nie ma jeszcze z czego liczyć')
    && opiszLiczbe(null, ...W).includes('nie sprawdziłem'),
    `${opiszLiczbe(0, ...W)} / ${opiszLiczbe(null, ...W)}`);
  check('⭐ (D7c) liczba ma POLSKĄ formę: 1 wpis · 3 wpisy · 7 wpisów · 12 wpisów',
    opiszLiczbe(1, ...W) === '1 wpis' && opiszLiczbe(3, ...W) === '3 wpisy'
    && opiszLiczbe(7, ...W) === '7 wpisów' && opiszLiczbe(12, ...W) === '12 wpisów'
    && opiszLiczbe(22, ...W) === '22 wpisy',
    [1, 3, 7, 12, 22].map((n) => opiszLiczbe(n, ...W)).join(' · '));
  check('⭐ (D7d) zdanie o pracy dodatkowej odmienia OBA liczebniki, każdy w swoim przypadku',
    PRACA_DODATKOWA_ZDANIE(4, 2) === 'Z czterech rzeczy, które robisz dodatkowo, w Twój największy zwrot trafiają dwie.'
    && PRACA_DODATKOWA_ZDANIE(2, 1) === 'Z dwóch rzeczy, które robisz dodatkowo, w Twój największy zwrot trafia jedna.',
    `${PRACA_DODATKOWA_ZDANIE(4, 2)} | ${PRACA_DODATKOWA_ZDANIE(2, 1)}`);
  const nieznane = pozycjeProfilu(model({ liczby: LICZBY_NIEZNANE }));
  check('⭐ (D7b) „nie sprawdziłem" i „zero" to DWA RÓŻNE podpisy pozycji „Skąd to wiemy"',
    nieznane[2].podpis !== pozycjeProfilu(model({ liczby: LICZBY_PUSTE }))[2].podpis, nieznane[2].podpis);
}

console.log('\n══ E. WYSOKOŚĆ, PROGI I KOMPLETNOŚĆ ═══════════════════════════');

/** ⭐ CEL Z MAKIETY V3, telefon A: ekran 2 ma 783 dp przy zgięciu 808. */
export const CEL_WYSOKOSCI_PROFILU_DP = 783;

{
  const p = zmierzEkran(EKRAN);
  check(`⭐⭐ (E1) ekran „Profil" mieści się w celu ${CEL_WYSOKOSCI_PROFILU_DP} dp`,
    p.wysokoscRazemDp <= CEL_WYSOKOSCI_PROFILU_DP, `zmierzone: ${p.wysokoscRazemDp} dp`);
  check('⭐⭐ (E1b) ⛔ ani jedna rzecz nie leży pod zgięciem',
    p.podZgieciem === 0, `pod zgięciem: ${p.podZgieciem} z ${p.pozycje.length}`);
  check('⭐ (E2) ⛔ nie ma na tym ekranie ani jednego komponentu o nieznanej wysokości',
    p.niewyprowadzalne.length === 0, p.niewyprowadzalne.join(', '));
}

{
  const na = progiNaEkranie();
  check('⚠️ (E3b) liczba progów na ekranie = `PROGI.length` PO nazwanym filtrze',
    na.length === PROGI.length, `${na.length} vs ${PROGI.length}`);
  check('⚠️ (E3c) …a filtr ma NAZWĘ i POWÓD, nie jest cichy',
    NAZWA_FILTRU_PROGOW.length > 10 && POWOD_FILTRU_PROGOW.length > 80
    && POWOD_FILTRU_PROGOW.toLowerCase().includes('praca'),
    'filtr progów jest cichy — szósty próg mógłby wejść albo wypaść niezauważony');
  check('⚠️ (E3d) szósty próg (`praca_w_celu`) NIE ZNIKA — jest na ekranie z własną miarą',
    na.some((p) => p.id === 'praca_w_celu' && p.miara === 'punkty_w_celu'),
    'szósty próg zniknął bez wpisu (B3)');
}

console.log('\n══ F. IMPORTY URUCHOMIONE, NIE PRZECZYTANE ═════════════════════');

{
  // ⛔ Strażnik czytający TEKST dowodzi, że wywołanie jest NAPISANE. Poniżej
  // każdy import ekranu jest URUCHOMIONY i musi coś oddać.
  const m = zbudujModelProfilu(model());
  check('⭐ (F1) `zbudujModelProfilu` rozwiązuje się i oddaje komplet pól',
    m.rozwoj.rodzaj === 'jest' && m.obciazenie7.rodzaj === 'policzone'
    && m.pracaDodatkowa.rodzaj === 'jest' && m.pozycje.length === 5 && m.przypis.length > 20,
    JSON.stringify({ r: m.rozwoj.rodzaj, o: m.obciazenie7.rodzaj, p: m.pracaDodatkowa.rodzaj }));
  const a = arkuszTrafnosci({ maDiagnoze: true, pozycja: m.pozycje.length ? { pozycja: POZYCJA_PRAWDZIWA, zrodlo: 'diagnoza' } : { pozycja: null, zrodlo: 'nie_znam' }, zwrot: model().zwrot, rodzajePracy: 'silownia,bieganie,stretching,technika' });
  check('⭐ (F2) `arkuszTrafnosci` oddaje obszary i cztery wiersze pracy dodatkowej',
    a.rodzaj === 'jest' && a.obszary.length === 13 && a.praca.length === 4,
    JSON.stringify({ rodzaj: a.rodzaj }));
  check('⭐ (F2b) arkusz NIE liczy zwrotu sam — nie ma w nim ani jednej własnej arytmetyki obszaru',
    !/\(100\s*-\s*/.test(bezKomentarzy(readFileSync(MODUL, 'utf8')).replace(/TRAFNOSC_WZOR[\s\S]{0,400}?;/, ' '))
    && /policzZwrotObszarow/.test(zrodloModulu) && /MAPA_PRACY_WLASNEJ/.test(zrodloModulu),
    'moduł ekranu przepisał sobie wzór zwrotu albo mapę pracy własnej');
}

{
  // F3 — ⭐ ZMIERZONA PUŁAPKA: ekran przechodził asercje tekstowe i wywalał
  // się przy pierwszym otwarciu, bo brakowało importu. Każda nazwa, której
  // `ja.tsx` używa z `lib/ekranProfilu`, MUSI być w liście importu.
  const blok = zrodloEkranu.match(/import\s*\{([\s\S]*?)\}\s*from\s*'\.\.\/\.\.\/lib\/ekranProfilu'/)?.[1] ?? '';
  const zaimportowane = new Set(blok.split(',').map((s) => s.replace(/\btype\b/, '').trim()).filter(Boolean));
  const uzywane = ['TYTUL_EKRANU', 'NAZWA_ROZWOJU', 'NAZWA_OBCIAZENIA', 'OBCIAZENIE_ZAMIAST_LICZBY',
    'ROZWOJ_JESZCZE_NIC', 'ROZWOJ_NIE_POLICZONE', 'PRZYPIS_CZEGO_TU_NIE_MA', 'zbudujModelProfilu',
    'wejscieNagrodyZOdczytow', 'trafnoscZawodnika', 'zdanieOPracyDodatkowej'];
  const brakujace = uzywane.filter((n) => ekranZywy.includes(n) && !zaimportowane.has(n));
  check('⭐⛔ (F3) każda nazwa użyta w `ja.tsx` jest FAKTYCZNIE zaimportowana',
    brakujace.length === 0, `bez importu: ${brakujace.join(', ')}`);
  check('⭐ (F3b) ekran nie liczy niczego sam — nie ma w nim `policzNagrode` ani `policzZwrotObszarow`',
    !/policzNagrode\(|policzZwrotObszarow\(/.test(ekranZywy)
    && !/policzNagrode\(|policzZwrotObszarow\(/.test(arkuszeZywe),
    'arytmetyka wróciła na ekran');
}

{
  // ⭐⛔ F4 — PUŁAPKA ZMIERZONA: ekran BEZ IMPORTU przechodził asercje
  // tekstowe i wywalał się przy pierwszym otwarciu. Ta asercja bierze KAŻDY
  // import z obu plików ekranu 2 i sprawdza, że nazwa NAPRAWDĘ jest
  // eksportowana przez wskazany moduł — najpierw uruchomieniem, a gdy moduł
  // nie da się uruchomić poza telefonem (React Native), odczytem eksportów.
  const brakujace: string[] = [];
  const uruchomione: string[] = [];
  for (const [plik, src] of [[EKRAN, zrodloEkranu], [ARKUSZE, zrodloArkuszy]] as const) {
    const katalog = plik.includes('/') ? plik.slice(0, plik.lastIndexOf('/')) : '.';
    for (const m of src.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*'(\.[^']+)'/g)) {
      const nazwy = m[1].split(',').map((x) => x.replace(/\btype\b/, '').trim()).filter(Boolean);
      let sciezka: string | null = null;
      for (const ext of ['.ts', '.tsx']) {
        const kandydat = `${katalog}/${m[2]}${ext}`.replace(/\/\.\//g, '/');
        // ⛔ `.replace` na ukośniki — powód przy warunku niżej.
        try { readFileSync(kandydat, 'utf8'); sciezka = relative(process.cwd(), resolve(kandydat)).replace(/\\/g, '/'); break; } catch { /* szukamy dalej */ }
      }
      if (sciezka === null) { brakujace.push(`${plik}: nie znajduję modułu ${m[2]}`); continue; }
      let klucze: Set<string> | null = null;
      // ⛔⛔ UKOŚNIKI — ZMIERZONE U KUBY 18.08.2026. Na Windowsie `relative()`
      // oddaje `lib\widokTygodnia.ts`, więc ten warunek NIGDY się nie spełniał
      // i ⛔ ANI JEDEN moduł nie był sprawdzany URUCHOMIENIEM — asercja (F4b)
      // padała, a reszta cicho schodziła do samego odczytu tekstu.
      if (/^lib\//.test(sciezka) && !/react-native|expo-/.test(readFileSync(sciezka, 'utf8'))) {
        try {
          const mod = await import(pathToFileURL(resolve(sciezka)).href);
          klucze = new Set(Object.keys(mod));
          uruchomione.push(sciezka);
        } catch { klucze = null; }
      }
      const tekst = readFileSync(sciezka, 'utf8');
      for (const n of nazwy) {
        const jestWTekscie = new RegExp(`export\\s+(?:async\\s+)?(?:const|function|type|class|enum|let)\\s+${n}\\b`).test(tekst)
          || new RegExp(`export\\s*\\{[^}]*\\b${n}\\b`).test(tekst);
        const jest = klucze !== null ? (klucze.has(n) || jestWTekscie) : jestWTekscie;
        if (!jest) brakujace.push(`${plik} → ${m[2]}: ${n}`);
      }
    }
  }
  check('⭐⛔ (F4) każdy import obu plików ekranu 2 ROZWIĄZUJE SIĘ — nie tylko jest napisany',
    brakujace.length === 0, brakujace.join(' · '));
  check('⭐ (F4b) …a co najmniej trzy moduły sprawdzono URUCHOMIENIEM, nie odczytem',
    uruchomione.length >= 3, `uruchomione: ${uruchomione.join(', ')}`);
}

console.log('\n══ P1. ROZWÓJ NA „PROFILU" == ROZWÓJ NA „DZIŚ" ════════════════');

// ═════════════════════════════════════════════════════════════════════
// ⭐⭐ PAS P1 19.08.2026 — GŁÓWNA ASERCJA PASA
// ═════════════════════════════════════════════════════════════════════
//
// ⛔ CO BYŁO ZEPSUTE. `wejscieNagrodyZOdczytow` podawało do `zrodloSesji`
// `segmentBloku: null` NA SZTYWNO, więc na ekranie „Profil" KAŻDA sesja
// dostawała trafność 1,0 — także ta, która na „Dziś" dostaje 1,5.
// ⛔ Zawodnik widział pod słowem ROZWÓJ MNIEJ, niż naprawdę zrobił.
//
// ⚠️ TA SEKCJA LICZY OBIE ŚCIEŻKI NA JEDNYM ZESTAWIE WIERSZY. Ścieżka „Dziś"
// nie jest tu przepisana ze zrozumienia — składa się z DOKŁADNIE TYCH SAMYCH
// funkcji, które woła `app/(tabs)/dzis.tsx` (`zrodloSesji`,
// `jednostkiZDziennika`, `jednostkiZOdpowiedziKontrolnych`, `jednostkiZMeczow`
// po `meczDlaNagrody`). Poniżej stoi asercja tekstowa na WYCINKU pliku „Dziś",
// która pilnuje, że te cztery wywołania tam nadal są — bo replika, która
// rozjedzie się z oryginałem, dowodzi wyłącznie sama siebie.

const T_P1 = trafnoscZawodnika({
  wyniki: WYNIKI_PRAWDZIWE, pozycjaZDiagnozy: POZYCJA_PRAWDZIWA,
  pozycjaZProfilu: null, rodzajePracy: 'silownia',
});

/** ⛔ `fizycznosc` ma w `WYNIKI_PRAWDZIWE` wynik 30 — najniższy, czyli TRAFNY. */
const BLOKI_P1 = [
  { id: 'blok-fiz', segment_id: 'fizycznosc' },
  { id: 'blok-mental', segment_id: 'mental' },
];

const WYDARZENIA_P1 = [
  // (1) sesja w Bloku o ZNANYM i TRAFNYM obszarze — to jest ta, której
  //     „Profil" do 19.08 odbierał premię 1,5.
  { id: 101, scheduled_date: '2026-08-17', status: 'completed', recurrence_rule: null,
    focus_block_id: 'blok-fiz', event_type: 'own_training', source: 'player', planned_minutes: 60 },
  // (2) sesja SPOZA Bloku — trafność 1,0 jest tu POPRAWNA i ma powód.
  { id: 102, scheduled_date: '2026-08-16', status: 'completed', recurrence_rule: null,
    focus_block_id: null, event_type: 'own_training', source: 'player', planned_minutes: 45 },
  // (3) sesja wskazująca Blok, którego W ODCZYCIE NIE MA — trafność 1,0
  //     jest tu NIEWIEDZĄ, nie pomiarem.
  { id: 103, scheduled_date: '2026-08-15', status: 'completed', recurrence_rule: null,
    focus_block_id: 'blok-skasowany', event_type: 'own_training', source: 'player', planned_minutes: 30 },
];

const DZIENNIK_P1 = [
  { id: 11, entry_type: 'post_training', created_at: '2026-08-17T19:00:00Z',
    payload: { duration_minutes: 60, rpe: 7 }, calendar_event_id: 101 },
  { id: 12, entry_type: 'post_training', created_at: '2026-08-16T19:00:00Z',
    payload: { duration_minutes: 45, rpe: 5 }, calendar_event_id: 102 },
  { id: 13, entry_type: 'post_training', created_at: '2026-08-15T19:00:00Z',
    payload: { duration_minutes: 30, rpe: 6 }, calendar_event_id: 103 },
];

const KONTROLE_P1 = [
  { id: 'kontrola-1', focus_block_id: 'blok-fiz', answered_at: '2026-08-17T20:00:00Z' },
];

/**
 * ⛔ DWA MECZE, I TO NIE JEST OZDOBA.
 *   • id 7 — z RPE. `wagaMeczu()` liczy go wzorem `minuty × RPE`, więc długość
 *     meczu NIE WCHODZI do wyniku i rozjazd `dlugoscMeczu` tu NIE WIDAĆ.
 *   • id 8 — BEZ RPE. Dopiero tu mianownikiem jest długość meczu: 60 minut
 *     rozegranych z 60 to 4 punkty, a z podstawionych 90 — 2,67.
 * ⚠️ Gdyby stał tu wyłącznie mecz z RPE, asercja o przemianowaniu byłaby
 * zielona i NIC BY NIE MIERZYŁA. Zmierzone na tej właśnie asercji 19.08.2026.
 */
const MECZE_P1: WierszMeczuWgl[] = [
  // ⭐ PLAN-D-D2 19.08.2026 — `calendar_event_id` doszło do `WierszMeczuWgl`.
  // `null` = wiersz niezwiązany z wystąpieniem; ten pas mierzy przemianowanie
  // długości meczu, więc wiązanie jest tu nieistotne i ma być jawnie puste (R5).
  { id: 7, created_at: '2026-08-14T12:00:00Z', match_rpe: 7,
    entered_recovery_state: null, minutes_played: 60, match_length_minutes: 60,
    calendar_event_id: null },
  { id: 8, created_at: '2026-08-13T12:00:00Z', match_rpe: null,
    entered_recovery_state: null, minutes_played: 60, match_length_minutes: 60,
    calendar_event_id: null },
];

function odczytyP1(nadpisz: Partial<OdczytyDoRozwoju> = {}): OdczytyDoRozwoju {
  return {
    wydarzenia: { rodzaj: 'jest', wiersze: WYDARZENIA_P1 },
    dziennik: { rodzaj: 'jest', wiersze: DZIENNIK_P1 },
    odpowiedziKontrolne: { rodzaj: 'jest', wiersze: KONTROLE_P1 },
    mecze: { rodzaj: 'jest', wiersze: MECZE_P1 },
    cele: { rodzaj: 'jest', wiersze: [{ segment_id: 'fizycznosc' }] },
    bloki: { rodzaj: 'jest', wiersze: BLOKI_P1 },
    zwrot: T_P1.zwrot,
    ...nadpisz,
  };
}

/**
 * ⭐ ŚCIEŻKA „DZIŚ", ZŁOŻONA Z TYCH SAMYCH FUNKCJI, CO PRODUKCYJNA.
 * ⛔ `mapaBloku === null` odwzorowuje defekt: tak wyglądał „Profil" do 19.08.
 */
function wejscieJakNaDzis(o: OdczytyDoRozwoju, mapaBloku: ReadonlyMap<string, string> | null): WejscieNagrody {
  const wiersze = o.dziennik.rodzaj === 'nie_odczytano' ? [] : o.dziennik.wiersze;
  const minuty = new Map<number, number>();
  const rpe = new Map<number, number>();
  const ids = new Set<number>();
  for (const l of wiersze) {
    const id = l?.calendar_event_id;
    if (typeof id !== 'number') continue;
    ids.add(id);
    const pl = l?.payload as Record<string, unknown> | null;
    if (pl === null || typeof pl !== 'object') continue;
    const min = pl.duration_minutes;
    if (typeof min === 'number' && Number.isFinite(min) && min > 0) minuty.set(id, Math.max(minuty.get(id) ?? 0, min));
    const r = pl.rpe;
    if (typeof r === 'number' && Number.isFinite(r) && r > 0 && r <= 10) rpe.set(id, Math.max(rpe.get(id) ?? 0, r));
  }
  const segment = (idBloku: string | null | undefined): string | null =>
    (mapaBloku === null || typeof idBloku !== 'string' || idBloku.length === 0
      ? null : mapaBloku.get(idBloku) ?? null);
  return {
    sesje: zrodloSesji({
      wydarzenia: o.wydarzenia.rodzaj === 'nie_odczytano' ? null : o.wydarzenia.wiersze,
      werdykty: WERDYKTY_NIEPODANE,
      wpisyDziennika: ids,
      segmentBloku: mapaBloku,
      minutyZWpisow: minuty,
      rpeZWpisow: rpe,
      zwrot: o.zwrot,
    }),
    dziennik: { rodzaj: 'jest', jednostki: jednostkiZDziennika(wiersze) },
    odpowiedziKontrolne: {
      rodzaj: 'jest',
      jednostki: jednostkiZOdpowiedziKontrolnych(
        (o.odpowiedziKontrolne.rodzaj === 'nie_odczytano' ? [] : o.odpowiedziKontrolne.wiersze)
          .map((c): WierszOdpowiedziKontrolnej => ({
            id: c.id, answered_at: c.answered_at ?? null, segment: segment(c.focus_block_id),
          })),
      ),
    },
    mecze: {
      rodzaj: 'jest',
      jednostki: jednostkiZMeczow(
        (o.mecze.rodzaj === 'nie_odczytano' ? [] : o.mecze.wiersze).map(meczDlaNagrody),
      ),
    },
    segmentyCelow: {
      rodzaj: 'pelne',
      segmenty: new Set((o.cele.rodzaj === 'nie_odczytano' ? [] : o.cele.wiersze)
        .map((g) => g.segment_id)
        .filter((x): x is string => typeof x === 'string' && x.length > 0)),
    },
  };
}

const MAPA_P1 = new Map(BLOKI_P1.map((b) => [b.id, b.segment_id] as const));

{
  // ── P1-1: mapa segmentów powstaje z PRAWDZIWYCH wierszy, nie z `null` ──
  const mapa = mapaSegmentowBlokow({ rodzaj: 'jest', wiersze: BLOKI_P1 });
  check('⭐ (P1-1) `mapaSegmentowBlokow` oddaje `focus_block_id → segment_id`, nie `null`',
    mapa !== null && mapa.get('blok-fiz') === 'fizycznosc' && mapa.size === 2,
    JSON.stringify(mapa === null ? null : [...mapa]));
  check('⭐ (P1-1b) …a nieodczytana tabela Bloków daje `null`, nie pustą mapę udającą „nie masz Bloków"',
    mapaSegmentowBlokow({ rodzaj: 'nie_odczytano', powod: 'RLS' }) === null,
    'nieudany odczyt zamienił się w twierdzenie o zawodniku');

  const we = wejscieNagrodyZOdczytow(odczytyP1());
  const segmenty = we.sesje.rodzaj === 'jest'
    ? we.sesje.jednostki.filter((j) => j.rodzaj === 'sesja_z_dowodem').map((j) => j.segment)
    : [];
  check('⭐⭐ (P1-1c) sesja z Bloku `blok-fiz` wchodzi na „Profil" Z SEGMENTEM `fizycznosc`',
    segmenty.includes('fizycznosc'),
    `segmenty jednostek: ${JSON.stringify(segmenty)}`);
}

{
  // ── P1-2: ⭐⭐⭐ GŁÓWNA ASERCJA PASA — JEDEN ZESTAW WIERSZY, DWIE ŚCIEŻKI ──
  const o = odczytyP1();
  const profil = policzRozwojZOdczytow(o);
  const dzis = policzNagrode(wejscieJakNaDzis(o, MAPA_P1));
  // ⛔ STAN SPRZED PASA P1, odtworzony CO DO ARGUMENTU: `segmentBloku: null`.
  const przed = policzNagrode(wejscieJakNaDzis(o, null));

  check('⭐⭐⭐ (P1-2) ROZWÓJ na „Profilu" i na „Dziś" z TYCH SAMYCH wierszy — TA SAMA LICZBA',
    profil.rodzaj === 'policzona' && dzis.rodzaj === 'policzona' && profil.punkty === dzis.punkty,
    `Profil=${profil.rodzaj === 'policzona' ? profil.punkty : profil.rodzaj} `
    + `vs Dziś=${dzis.rodzaj === 'policzona' ? dzis.punkty : dzis.rodzaj}`);
  check('⭐⭐ (P1-2b) …i TA SAMA praca w celu, i TYLE SAMO jednostek, i TE SAME odznaki',
    profil.rodzaj === 'policzona' && dzis.rodzaj === 'policzona'
    && profil.punktyWCelu === dzis.punktyWCelu
    && profil.jednostki === dzis.jednostki
    && profil.odznaki.map((z) => z.id).join(',') === dzis.odznaki.map((z) => z.id).join(','),
    `${opisNagrodyDoLogu(profil)} VS ${opisNagrodyDoLogu(dzis)}`);
  // ⛔ BEZ TEJ ASERCJI POWYŻSZE NIC NIE MIERZY: gdyby mapa segmentów nie
  // zmieniała ani jednej liczby, równość byłaby prawdziwa i bezużyteczna.
  check('⭐⭐⭐ (P1-2c) …a stan SPRZED pasa (`segmentBloku: null`) dawał liczbę NIŻSZĄ — poprawka coś rusza',
    profil.rodzaj === 'policzona' && przed.rodzaj === 'policzona' && przed.punkty < profil.punkty,
    `przed=${przed.rodzaj === 'policzona' ? przed.punkty : przed.rodzaj} `
    + `po=${profil.rodzaj === 'policzona' ? profil.punkty : profil.rodzaj}`);
  check('⭐⭐ (P1-2d) ⛔ ROZWÓJ ROŚNIE, NIE MALEJE — poprawka nie zabiera nikomu ani punktu',
    profil.rodzaj === 'policzona' && przed.rodzaj === 'policzona' && profil.punkty >= przed.punkty,
    'poprawka odebrała zawodnikowi pracę, którą wykonał');
}

{
  // ── P1-2e: WYCINEK PLIKU „DZIŚ" — replika wyżej nie rozjechała się z oryginałem ──
  const zrodloDzis = readFileSync('app/(tabs)/dzis.tsx', 'utf8');
  const od = zrodloDzis.indexOf('const wejsciaNagrody: WejscieNagrody = {');
  const wycinek = od < 0 ? '' : zrodloDzis.slice(od, od + 4000);
  check('⭐⛔ (P1-2e) wycinek „Dziś" z wejściem nagrody ISTNIEJE i nie jest pusty',
    wycinek.length > 500, `długość wycinka: ${wycinek.length}`);
  const brakujace = ['zrodloSesji(', 'segmentBloku', 'jednostkiZDziennika(',
    'jednostkiZOdpowiedziKontrolnych(', 'jednostkiZMeczow(', 'meczDlaNagrody']
    .filter((n) => !wycinek.includes(n));
  check('⭐⛔ (P1-2f) …i woła DOKŁADNIE te funkcje, z których złożona jest replika wyżej',
    wycinek.length > 500 && brakujace.length === 0, `brakuje w wycinku: ${brakujace.join(', ')}`);
}

{
  // ── P1-3: ⛔ BRAK MAPY ≠ TRAFNOŚĆ 1,0 — STAN MA NAZWĘ (R5) ──
  const znam = stanSegmentowSesji(odczytyP1());
  const bezMapy = stanSegmentowSesji(odczytyP1({ bloki: { rodzaj: 'nie_odczytano', powod: 'RLS na focus_blocks' } }));
  check('⭐⭐ (P1-3) „nie odczytałem Bloków" ma WŁASNY, NAZWANY stan — nie zlewa się z „znam mapę"',
    bezMapy.rodzaj === 'nie_znam_mapy' && znam.rodzaj === 'znam_mape',
    `${bezMapy.rodzaj} vs ${znam.rodzaj}`);
  check('⭐⭐ (P1-3b) …a przy znanej mapie „spoza Bloku" i „Blok nieznany" są POLICZONE OSOBNO',
    znam.rodzaj === 'znam_mape' && znam.zSegmentem === 1 && znam.spozaBloku === 1 && znam.blokNieznany === 1,
    JSON.stringify(znam));
  check('⭐⛔ (P1-3c) niewiedza WYCHODZI DO LOGU — obie odmiany mówią, ⛔ a pełna wiedza MILCZY',
    zdanieOSegmentachDoLogu(bezMapy) !== null
    && zdanieOSegmentachDoLogu(znam) !== null
    && zdanieOSegmentachDoLogu({ rodzaj: 'znam_mape', zSegmentem: 3, spozaBloku: 1, blokNieznany: 0 }) === null,
    `bezMapy=${zdanieOSegmentachDoLogu(bezMapy)} · znam=${zdanieOSegmentachDoLogu(znam)}`);
  // ⛔ WYCINEK, NIE „czy napis pada gdziekolwiek". Zmierzone na tej asercji
  // 19.08.2026: wersja pytająca o samą obecność wywołania NIE ZAPALIŁA SIĘ
  // na mutacji, która policzyła zdanie i WYRZUCIŁA je zamiast wypisać.
  // Wywołanie bez odbiorcy to kod, który wygląda jak reguła i nic nie robi.
  {
    const od = ekranZywy.indexOf('const zdanieOSegmentach');
    const wycinek = od < 0 ? '' : ekranZywy.slice(od, od + 400);
    check('⭐⛔ (P1-3d) wycinek ekranu wokół `stanSegmentowSesji` ISTNIEJE i nie jest pusty',
      wycinek.length > 100, `długość wycinka: ${wycinek.length}`);
    check('⭐⛔ (P1-3d2) …a zdanie o niewiedzy TRAFIA DO LOGU, nie tylko powstaje',
      wycinek.includes('zdanieOSegmentachDoLogu(')
      && /console\.warn\(\s*zdanieOSegmentach\s*\)/.test(wycinek),
      'ekran liczy zdanie i je wyrzuca — niewiedza wraca do ciszy');
  }
  check('⭐⛔ (P1-3e) ekran NIE PODAJE JUŻ `segmentBloku: null` — ani ekran, ani moduł',
    !/segmentBloku:\s*null/.test(modulZywy) && !/segmentBloku:\s*null/.test(ekranZywy),
    'sztywne `null` wróciło — rozwój znów jest zaniżony');
}

{
  // ── P1-4: ⛔ OBCIĄŻENIE NIE RUSZA SIĘ ANI O SETNĄ ──
  const zMapa = policzObciazenieZOdczytow(odczytyP1(), { dzis: DZIS_D1 });
  const bezMapy = policzObciazenieZOdczytow(
    odczytyP1({ bloki: { rodzaj: 'nie_odczytano', powod: 'RLS' } }), { dzis: DZIS_D1 });
  const bezZwrotu = policzObciazenieZOdczytow(odczytyP1({ zwrot: null }), { dzis: DZIS_D1 });
  const liczba = (x: ObciazenieWOknie) => (x.rodzaj === 'policzone' ? x.punkty : NaN);
  check('⭐⭐⭐ (P1-4) TE SAME wiersze z mapą segmentów i bez niej → OBCIĄŻENIE IDENTYCZNE',
    liczba(zMapa.okno) === liczba(bezMapy.okno)
    && liczba(zMapa.odniesienie) === liczba(bezMapy.odniesienie)
    && Number.isFinite(liczba(zMapa.okno)),
    `${opisObciazeniaDoLogu(zMapa.okno)} VS ${opisObciazeniaDoLogu(bezMapy.okno)}`);
  check('⭐⭐ (P1-4b) …i tak samo ze zwrotem obszarów i bez niego (zapadka D1-B3c nadal zielona)',
    liczba(zMapa.okno) === liczba(bezZwrotu.okno),
    `${opisObciazeniaDoLogu(zMapa.okno)} VS ${opisObciazeniaDoLogu(bezZwrotu.okno)}`);
  // ⛔ WYCINEK, NIE CAŁY PLIK: „czy słowo pada gdziekolwiek" zapaliłoby się
  // na komentarzu i gasło przy prawdziwym rozjeździe.
  const od = zrodloModulu.indexOf('export function wejscieObciazeniaZOdczytow');
  const wycinek = od < 0 ? '' : bezKomentarzy(zrodloModulu.slice(od, zrodloModulu.indexOf('\n}\n', od)));
  check('⭐⛔ (P1-4c) wycinek `wejscieObciazeniaZOdczytow` ISTNIEJE i NIE ZNA słowa „segment"',
    wycinek.length > 400 && !/segment/i.test(wycinek) && !/trafnos/i.test(wycinek),
    `długość ${wycinek.length}; trafienia: ${(wycinek.match(/segment|trafnos/gi) ?? []).join(', ')}`);
}

{
  // ── P1-5: MECZ — drugi rozjazd, znaleziony przez asercję główną ──
  const tylkoMecz = odczytyP1({
    wydarzenia: { rodzaj: 'jest', wiersze: [] },
    dziennik: { rodzaj: 'jest', wiersze: [] },
    odpowiedziKontrolne: { rodzaj: 'jest', wiersze: [] },
  });
  const profil = policzRozwojZOdczytow(tylkoMecz);
  const dzis = policzNagrode(wejscieJakNaDzis(tylkoMecz, MAPA_P1));
  // Stan sprzed pasa: surowy wiersz bazy udający `WierszMeczu` — `dlugoscMeczu`
  // nigdy nie powstaje, więc `wagaMeczu()` podstawia 90 minut ZAWSZE.
  const suma = (js: readonly JednostkaPracy[]) => js.reduce((a, j) => a + j.punkty, 0);
  const przed = suma(jednostkiZMeczow(MECZE_P1 as unknown as Parameters<typeof jednostkiZMeczow>[0]));
  const po = suma(jednostkiZMeczow(MECZE_P1.map(meczDlaNagrody)));
  check('⭐⭐ (P1-5) mecz 60-minutowy rozegrany w całości daje na „Profilu" TYLE SAMO, co na „Dziś"',
    profil.rodzaj === 'policzona' && dzis.rodzaj === 'policzona' && profil.punkty === dzis.punkty,
    `Profil=${profil.rodzaj === 'policzona' ? profil.punkty : profil.rodzaj} `
    + `vs Dziś=${dzis.rodzaj === 'policzona' ? dzis.punkty : dzis.rodzaj}`);
  check('⭐⭐ (P1-5b) …a bez przemianowania `match_length_minutes → dlugoscMeczu` było MNIEJ',
    przed < po, `bez mapowania ${przed} · z mapowaniem ${po}`);
  check('⭐⛔ (P1-5c) ekran „Profil" czyta kolumny meczu z JEDNEJ listy (`SELECT_MECZOW`), nie z własnego napisu',
    /SELECT_MECZOW/.test(ekranZywy) && !/select\('id,created_at,minutes_played,match_rpe'\)/.test(ekranZywy),
    'lista kolumn meczu ma na „Profilu" drugą kopię — pierwsza poprawka je rozjedzie');
}

{
  // ── P1-6: ⭐ BATERIA MUTACJI PASA P1 ──
  // ⛔ NAJPIERW ASERCJA ODWROTNA: na PRAWDZIWYM kodzie zero zapaleń.
  const o = odczytyP1();
  const prawdziwe: Array<[string, () => boolean]> = [
    ['R1 rozwój Profil == rozwój Dziś', () => {
      const a = policzRozwojZOdczytow(o); const b = policzNagrode(wejscieJakNaDzis(o, MAPA_P1));
      return a.rodzaj === 'policzona' && b.rodzaj === 'policzona' && a.punkty === b.punkty;
    }],
    ['R2 stan segmentów ma trzy osobne liczby', () => {
      const st = stanSegmentowSesji(o);
      return st.rodzaj === 'znam_mape' && st.zSegmentem + st.spozaBloku + st.blokNieznany === 3;
    }],
    ['R3 obciążenie nie zależy od mapy segmentów', () => {
      const a = policzObciazenieZOdczytow(o, { dzis: DZIS_D1 }).okno;
      const b = policzObciazenieZOdczytow(odczytyP1({ bloki: { rodzaj: 'nie_odczytano', powod: 'x' } }), { dzis: DZIS_D1 }).okno;
      return a.rodzaj === 'policzone' && b.rodzaj === 'policzone' && a.punkty === b.punkty;
    }],
    ['R4 mecz przemianowany waży więcej niż nieprzemianowany', () => {
      const s2 = (js: readonly JednostkaPracy[]) => js.reduce((a, j) => a + j.punkty, 0);
      return s2(jednostkiZMeczow(MECZE_P1 as unknown as Parameters<typeof jednostkiZMeczow>[0]))
        < s2(jednostkiZMeczow(MECZE_P1.map(meczDlaNagrody)));
    }],
  ];
  const zapalone = prawdziwe.filter(([, f]) => !f()).map(([n]) => n);
  check(`⭐⛔ (P1-6) ASERCJA ODWROTNA — na PRAWDZIWYM kodzie ${prawdziwe.length}/${prawdziwe.length} reguł trzyma, zero zapaleń`,
    zapalone.length === 0, `zapaliły się: ${zapalone.join(' · ')}`);

  type Mutacja = [string, () => boolean];
  const mutacje: Mutacja[] = [
    ['MP1 ⛔⛔ mapa segmentów wraca na `null` (defekt sprzed pasa P1)', () => {
      const zmutowane = policzNagrode(wejscieJakNaDzis(o, null));
      const prawda = policzRozwojZOdczytow(o);
      // Zapala się, bo ta sama praca dostaje na dwóch ekranach dwie liczby.
      return zmutowane.rodzaj === 'policzona' && prawda.rodzaj === 'policzona'
        && zmutowane.punkty < prawda.punkty;
    }],
    ['MP2 ⛔ brak Bloku daje PO CICHU 1,0 — stan przestaje mieć nazwę', () => {
      // Mutant: stan zawsze „znam mapę, wszystko rozpoznane".
      const zmutowany = (): { rodzaj: 'znam_mape'; zSegmentem: number; spozaBloku: number; blokNieznany: number } =>
        ({ rodzaj: 'znam_mape', zSegmentem: WYDARZENIA_P1.length, spozaBloku: 0, blokNieznany: 0 });
      const prawda = stanSegmentowSesji(o);
      return zdanieOSegmentachDoLogu(zmutowany()) === null
        && prawda.rodzaj === 'znam_mape' && prawda.blokNieznany > 0
        && zdanieOSegmentachDoLogu(prawda) !== null;
    }],
    ['MP3 ⛔ nieodczytane Bloki udają pustą listę Bloków', () => {
      // Mutant: `?? []` zamiast `null` — awaria odczytu staje się twierdzeniem.
      const zmutowana = new Map<string, string>();
      const prawdziwaNull = mapaSegmentowBlokow({ rodzaj: 'nie_odczytano', powod: 'RLS' });
      const stanZmutowany = zdanieOSegmentachDoLogu(
        { rodzaj: 'znam_mape', zSegmentem: 0, spozaBloku: WYDARZENIA_P1.length, blokNieznany: 0 });
      return zmutowana.size === 0 && prawdziwaNull === null && stanZmutowany === null;
    }],
    ['MP4 ⛔⛔ obciążenie zaczyna zależeć od trafności', () => {
      const f = {
        eventType: 'own_training', source: 'player', maSesjeTrenera: false,
        minutyZmierzone: 60, minutyZPlanu: 60, rpeZmierzone: 7,
      };
      const mutantBaza = wagaSesji({ ...f, trafnosc: 1.0 }).punkty;
      const mutantPremia = wagaSesji({ ...f, trafnosc: 1.5 }).punkty;
      const prawdziwe2 = obciazenieSesji({ minuty: 60, ciezkosc: 7 });
      return mutantBaza !== mutantPremia
        && prawdziwe2.rodzaj === 'zmierzone' && prawdziwe2.surowe === mutantBaza;
    }],
    ['MP5 ⛔ mecz bez przemianowania — „Profil" znów niżej niż „Dziś"', () => {
      const s2 = (js: readonly JednostkaPracy[]) => js.reduce((a, j) => a + j.punkty, 0);
      return s2(jednostkiZMeczow(MECZE_P1 as unknown as Parameters<typeof jednostkiZMeczow>[0]))
        < s2(jednostkiZMeczow(MECZE_P1.map(meczDlaNagrody)));
    }],
  ];
  let nieZapalone: string | null = null;
  for (const [nazwa, uruchom] of mutacje) {
    const zapalila = uruchom();
    console.log(`       ${nazwa}   →   ${zapalila ? 'ZAPALIŁA' : '⛔ CISZA'}`);
    if (!zapalila && nieZapalone === null) nieZapalone = nazwa;
  }
  check(`⭐⭐ (P1-6b) KAŻDA z ${mutacje.length} mutacji pasa P1 zapala strażnika imiennie`,
    nieZapalone === null, `nie zapaliła: ${nieZapalone}`);
  const poBaterii = prawdziwe.filter(([, f]) => !f()).map(([n]) => n);
  check('⭐ (P1-6c) …a prawdziwe reguły są PO baterii nietknięte',
    poBaterii.length === 0, `zapaliły się: ${poBaterii.join(' · ')}`);
}

console.log('\n══ G. BATERIA MUTACJI ══════════════════════════════════════════');

{
  // ⛔ Każda mutacja łamie regułę TEGO pasa i musi zapalić strażnika IMIENNIE.
  type Mutacja = [string, () => boolean];
  const mutacje: Mutacja[] = [
    // ⭐⭐ PRZECELOWANA 18.08.2026 (pas D1). Do 18.08 brzmiała „obciążenie
    // dostaje liczbę zamiast «nie policzone»" — od dziś liczba jest tym,
    // co ma stać na ekranie, więc ta mutacja przestała cokolwiek psuć.
    // ⛔ W jej miejsce stoi MUTACJA OBOWIĄZKOWA PASA D1: obciążenie zaczyna
    // zależeć od trafności. Mutant sumuje `j.punkty` (wartość rozwoju) zamiast
    // `minuty × ciężkość` — czyli DOKŁADNIE defekt sprzed 18.08.
    ['M1 ⛔⛔ obciążenie zaczyna zależeć od trafności (defekt sprzed pasa D1)', () => {
      const f = {
        eventType: 'own_training', source: 'player', maSesjeTrenera: false,
        minutyZmierzone: 30, minutyZPlanu: 30, rpeZmierzone: 6,
      };
      // Mutant: „obciążenie" = waga DOROBKU tej sesji, czyli z trafnością.
      const mutantBaza = wagaSesji({ ...f, trafnosc: 1.0 }).punkty;
      const mutantPremia = wagaSesji({ ...f, trafnosc: 1.5 }).punkty;
      const prawdziwe = obciazenieSesji({ minuty: 30, ciezkosc: 6 });
      // Zapala się, bo mutant daje DWIE różne liczby tam, gdzie prawdziwe
      // obciążenie daje jedną — i to jest dokładnie defekt sprzed 18.08.
      return mutantBaza !== mutantPremia
        && prawdziwe.rodzaj === 'zmierzone' && prawdziwe.surowe === mutantBaza;
    }],
    ['M2 ⛔ rozwój przycięty oknem — może zmaleć', () => {
      const okno = (js: readonly JednostkaPracy[]) =>
        js.filter((j) => j.kiedy.rodzaj !== 'nieznana' && j.kiedy.dzien >= '2026-08-12');
      const a = policzNagrode(wejscie(okno([jedn('p', 3, '2026-01-01'), jedn('q', 2, '2026-08-18')])));
      const b = policzNagrode(wejscie([jedn('p', 3, '2026-01-01'), jedn('q', 2, '2026-08-18')]));
      return a.rodzaj === 'policzona' && b.rodzaj === 'policzona' && a.punkty < b.punkty;
    }],
    ['M3 ⛔ „nie policzone" narysowane jako 0', () => {
      const n: NagrodaZaPrace = { rodzaj: 'nie_policzona', powod: 'x', nieodczytane: [] };
      const zmutowane = (nn: NagrodaZaPrace) => (nn.rodzaj === 'nie_policzona'
        ? { rodzaj: 'jest' as const, punkty: 0, jednostki: 0 } : rozwojZNagrody(nn));
      const r = zmutowane(n);
      return r.rodzaj === 'jest' && r.punkty === 0;
    }],
    ['M4 ⛔ na ekran wchodzi słowo „AU"', () => /\bAU\b/.test('ROZWÓJ 147 AU')],
    ['M5 ⛔ pustka wypełniona zerem — „Skąd to wiemy" bez zdania przy zerze', () => {
      const zmutowane = (n: number | null) => `${n ?? 0} wpisów`;
      return zmutowane(null) === '0 wpisów' && zmutowane(0) === '0 wpisów';
    }],
    ['M6 ⛔ cztery powody „nie wiemy" sklejone w jedno zdanie', () => {
      const zmutowane: Record<PowodBrakuPracyDodatkowej, string> = {
        brak_diagnozy: 'Nie wiemy.', brak_pozycji: 'Nie wiemy.',
        nie_umiem_policzyc: 'Nie wiemy.', brak_deklaracji: 'Nie wiemy.',
      };
      return new Set(Object.values(zmutowane)).size < 4;
    }],
    ['M7 ⛔ zbiór celów zawężony do `status=active` — cel domknięty przepada', () => {
      const cele = [{ segment_id: 'moc', status: 'completed' }, { segment_id: 'wytrzymalosc', status: 'active' }];
      const pelne = new Set(cele.map((c) => c.segment_id));
      const zmutowane = new Set(cele.filter((c) => c.status === 'active').map((c) => c.segment_id));
      return zmutowane.size < pelne.size;
    }],
  ];
  let nieZapalone: string | null = null;
  for (const [nazwa, uruchom] of mutacje) {
    const zapalila = uruchom();
    console.log(`       ${nazwa}   →   ${zapalila ? 'ZAPALIŁA' : '⛔ CISZA'}`);
    if (!zapalila && nieZapalone === null) nieZapalone = nazwa;
  }
  check(`⭐⭐ (G) KAŻDA z ${mutacje.length} mutacji zapala strażnika imiennie`,
    nieZapalone === null, `nie zapaliła: ${nieZapalone}`);
  check('⭐ (G2) …a prawdziwe reguły są po baterii NIETKNIĘTE',
    obciazenieNaEkranie(OKNA_MODELU.okno, OKNA_MODELU.odniesienie).rodzaj === 'policzone'
    && okna({ ...odczytyZSesja(), zwrot: null }).okno.rodzaj === 'policzone'
    && rozwojZNagrody(policzNagrode(wejscie([]))).rodzaj === 'jeszcze_nic'
    && new Set(Object.values(PRACA_DODATKOWA_BRAK)).size === 4
    && wybierzPozycje({ zDiagnozy: 'Boczny obrońca', zProfilu: null }).zrodlo === 'diagnoza',
    'bateria zostawiła ślad w prawdziwych regułach');
}

console.log('\n══ H. POZYCJA CZYTANA Z DIAGNOZY ═══════════════════════════════');

{
  // ⛔ ZMIERZONE NA PRODUKCJI 18.08.2026: konto `adam.bar@op.pl` ma
  // `player_profiles.position_primary` = NULL i `diagnostics.position` =
  // „Boczny obrońca". Czytane z profilu — zdanie NIE PADA.
  const zDiagnozy = wybierzPozycje({ zDiagnozy: 'Boczny obrońca', zProfilu: null });
  const zProfilu = wybierzPozycje({ zDiagnozy: null, zProfilu: 'Boczny obrońca' });
  const brak = wybierzPozycje({ zDiagnozy: null, zProfilu: null });
  check('⭐⭐ (H1) pozycja czytana Z DIAGNOZY, gdy profil jej nie ma',
    zDiagnozy.pozycja === 'Boczny obrońca' && zDiagnozy.zrodlo === 'diagnoza', JSON.stringify(zDiagnozy));
  check('⭐ (H2) odwrót do `player_profiles` działa',
    zProfilu.pozycja === 'Boczny obrońca' && zProfilu.zrodlo === 'profil', JSON.stringify(zProfilu));
  check('⭐ (H3) brak obu → `null` i źródło „nie znam". ⛔ Nigdy pozycja domyślna',
    brak.pozycja === null && brak.zrodlo === 'nie_znam', JSON.stringify(brak));
  const t = trafnoscZawodnika({
    wyniki: WYNIKI_PRAWDZIWE, pozycjaZDiagnozy: 'Boczny obrońca', pozycjaZProfilu: null,
    rodzajePracy: 'silownia,bieganie,stretching,technika',
  });
  const zdanie = zdanieOPracyDodatkowej(pracaDodatkowaNaEkranie({ ...t, rodzajePracy: 'silownia,bieganie,stretching,technika' }));
  check('⭐⭐ (H4) na PRAWDZIWYCH danych konta bez pozycji w profilu zdanie PADA',
    zdanie.includes('robisz dodatkowo') && zdanie.includes('trafiaj'), zdanie);
  const bezOdwrotu = trafnoscZawodnika({
    wyniki: WYNIKI_PRAWDZIWE, pozycjaZDiagnozy: null, pozycjaZProfilu: null,
    rodzajePracy: 'silownia,bieganie,stretching,technika',
  });
  check('⭐ (H5) …a bez odczytu z diagnozy to samo konto dostaje nazwaną pustkę, nie liczbę',
    zdanieOPracyDodatkowej(pracaDodatkowaNaEkranie({ ...bezOdwrotu, rodzajePracy: 'silownia' }))
    === PRACA_DODATKOWA_BRAK.brak_pozycji, 'pustka bez nazwy');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
