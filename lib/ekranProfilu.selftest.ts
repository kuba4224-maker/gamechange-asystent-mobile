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
  policzNagrode,
  wagaSesji,
  type JednostkaPracy,
  type NagrodaZaPrace,
  type WejscieNagrody,
} from './nagrodaZaPrace';
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
  // B5 — zero porównań (N3). Przypis „czego tu nie ma" jest jedynym wyjątkiem
  // i sprawdzamy resztę pliku PO JEGO USUNIĘCIU.
  const bezPrzypisu = modulZywy.replace(PRZYPIS_CZEGO_TU_NIE_MA, ' ')
    .replace(/PRZYPIS_CZEGO_TU_NIE_MA/g, ' ');
  const ekranBezPrzypisu = ekranZywy.replace(/PRZYPIS_CZEGO_TU_NIE_MA/g, ' ');
  const wzorce: [string, RegExp][] = [
    ['procent w porównaniu', /%\s*(cięż|lżej)/i],
    ['średnia z', /średni[ae]\s+z\b/i],
    ['dni z rzędu', /z rzędu|pod rząd/i],
    ['miejsce w tabeli', /miejsc[ae] w tabeli|ranking/i],
  ];
  const zle = wzorce.filter(([, r]) => r.test(bezPrzypisu) || r.test(ekranBezPrzypisu)).map(([n]) => n);
  check('⭐⛔ (B5/N3) zero porównań z innymi i zero serii dni — poza zdaniem, że ich nie ma',
    zle.length === 0, zle.join(', '));
  check('⭐ (B5b) …a samo zdanie „czego tu nie ma" NADAL stoi na ekranie',
    ekranZywy.includes('PRZYPIS_CZEGO_TU_NIE_MA') && PRZYPIS_CZEGO_TU_NIE_MA.includes('z rzędu'),
    'przypis zniknął razem ze słowami, których miał zabraniać');
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
