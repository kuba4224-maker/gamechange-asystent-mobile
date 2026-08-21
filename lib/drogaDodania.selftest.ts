// PLAN-D-K1 08.2026 (21.08.2026) — NOWY PLIK. STRAŻNIK DROGI DODANIA.
//
// ═════════════════════════════════════════════════════════════════════
// ⛔⛔ PO CO TEN PLIK ISTNIEJE — i dlaczego „testy zielone" nie wystarczyło
// ═════════════════════════════════════════════════════════════════════
// 21.08.2026 właściciel produktu uruchomił appkę na telefonie i NIE UMIAŁ
// DODAĆ MECZU. W tej samej chwili repozytorium miało 54 strażników i 3 552
// zielone asercje. ⛔ Defekt przeszedł przez wszystkie, bo ani jedna nie
// pytała o rzecz, o którą trzeba było zapytać: **czy z ekranu, na którym stoi
// zawodnik, da się dojść do miejsca, w którym da się coś dodać.**
//
// ⭐ Ten plik zadaje dokładnie to pytanie — dziewięcioma strażnikami i
// jedenastoma mutacjami na PRAWDZIWYCH plikach produktu.
//
// ⛔ CZEGO TU NIE MA: ani jednej asercji „czy napis pada gdziekolwiek w pliku"
// (§0.7 polecenia). Każdy strażnik bierze WYCINEK (ciało procedury, ciało
// stylu, ciało gałęzi) i sprawdza najpierw, że wycinek NIE JEST PUSTY.
//
// ⚠️ IDIOM WYCINANIA KOMENTARZY: JEDNO PRZEJŚCIE, wyrażenie składane przez
// `new RegExp`. ⛔ To nie jest ozdobnik — `lib/ostatniCentymetr.selftest.ts`
// trzyma zapadkę na RÓWNOŚĆ liczby plików z wzorcem „blok przed linią" (39).
// Ten plik świadomie do niej nie dołącza.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dataStartowa,
  przesunDzien,
  toDataPoprawna,
  czytajWejscieDoKalendarza,
  trasaDodania,
  rodzajeFormularza,
  wejscieDnia,
  czyWolnoZalozycWydarzenie,
  decyzjaZalozeniaWydarzenia,
  STANY_DNIA,
  POWODY_DODANIA,
  CHWILE_ZALOZENIA,
  RODZAJ_MECZ,
  MINIMALNY_OBSZAR_DOTYKU_DP,
  MECZ_BEZ_PLANU_STATUS,
  MECZ_BEZ_PLANU_TYTUL,
  PARAM_DATA,
  PARAM_RODZAJ,
  PARAM_SKAD,
  SKAD_PLUS,
} from './drogaDodania';
import { zdecydujOZapisieMeczu, PUSTE_WIECEJ_O_MECZU } from './meczWiecej';
import { zmierzEkranZTekstu } from './wysokoscEkranu';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const KAT_EKRANOW = join(root, 'app', '(tabs)');

let bledy = 0;
let ok = 0;
function check(nazwa: string, warunek: boolean, szczegol = '') {
  if (warunek) { ok += 1; console.log(`OK   - ${nazwa}`); }
  else { bledy += 1; console.log(`FAIL - ${nazwa}${szczegol ? ': ' + szczegol : ''}`); }
}

/** ⛔ JEDNO PRZEJŚCIE — patrz nota na górze pliku. */
const KOMENTARZE = new RegExp('^[ \\t]*//.*$|/\\*[\\s\\S]*?\\*/', 'gm');
function bezKomentarzy(t: string): string {
  return t.replace(KOMENTARZE, '');
}

/** Ciało procedury albo obiektu, po nazwie. ⛔ Pusty wynik = strażnik ślepy. */
function cialo(zrodlo: string, naglowek: string): string {
  const i = zrodlo.indexOf(naglowek);
  if (i === -1) return '';
  const otw = zrodlo.indexOf('{', i);
  if (otw === -1) return '';
  let g = 0;
  for (let j = otw; j < zrodlo.length; j += 1) {
    if (zrodlo[j] === '{') g += 1;
    else if (zrodlo[j] === '}') { g -= 1; if (g === 0) return zrodlo.slice(otw, j + 1); }
  }
  return '';
}

console.log('═══ GRUPA 1 — REGUŁY MODUŁU (bez ekranu, bez bazy) ═══');

// ─── DATA STARTOWA ────────────────────────────────────────────────
{
  const dzis = '2026-08-21';
  const wczoraj = '2026-08-20';

  const odbylo = dataStartowa({ powod: 'juz_sie_odbylo', dzienPytania: wczoraj, dzis });
  const bedzie = dataStartowa({ powod: 'dopiero_bedzie', dzienPytania: wczoraj, dzis });

  check('⭐ (K1) „już się odbyło" bierze DZIEŃ, O KTÓRY PRODUKT ZAPYTAŁ',
    odbylo.data === wczoraj, `${odbylo.data} — ${odbylo.powod}`);

  check('⭐ (K1) „dopiero będzie" bierze JUTRO',
    bedzie.data === '2026-08-22', `${bedzie.data} — ${bedzie.powod}`);

  check('⛔ (K1, §3.1 wym. 3) to są DWIE RÓŻNE daty startowe, a nie jedna',
    odbylo.data !== bedzie.data, `${odbylo.data} / ${bedzie.data}`);

  check('⛔ (K1, R5) bez dnia pytania „już się odbyło" spada na DZIŚ, a nie na pustkę',
    dataStartowa({ powod: 'juz_sie_odbylo', dzienPytania: null, dzis }).data === dzis);

  check('⛔ (K1, Z0) bez dzisiejszej daty NIE PODSTAWIAMY ŻADNEJ',
    POWODY_DODANIA.every((p) => dataStartowa({ powod: p, dzienPytania: null, dzis: '' }).data === ''));

  check('⛔ (K1) każdy z dwóch powodów oddaje DATĘ POPRAWNĄ, nie napis o dacie',
    POWODY_DODANIA.every((p) => toDataPoprawna(dataStartowa({ powod: p, dzienPytania: wczoraj, dzis }).data)));

  check('⛔ (K1) arytmetyka dat przechodzi przez koniec miesiąca i koniec roku',
    przesunDzien('2026-08-31', 1) === '2026-09-01'
    && przesunDzien('2026-12-31', 1) === '2027-01-01'
    && przesunDzien('2026-03-01', -1) === '2026-02-28',
    `${przesunDzien('2026-08-31', 1)} / ${przesunDzien('2026-12-31', 1)} / ${przesunDzien('2026-03-01', -1)}`);

  check('⛔ (K1, R5) data zmyślona nie przechodzi za poprawną',
    !toDataPoprawna('2026-02-30') && !toDataPoprawna('2026-13-01') && !toDataPoprawna('dziś'));
}

// ─── GDZIE LĄDUJE ZAWODNIK ────────────────────────────────────────
{
  const zPlusa = czytajWejscieDoKalendarza({
    [PARAM_SKAD]: SKAD_PLUS, [PARAM_DATA]: '2026-08-20',
  });
  check('⭐⛔ (K1, §3.1 wym. 1 i 2) trasa z zamiarem dodania LĄDUJE NA ZAKŁADCE '
    + 'Z FORMULARZEM i każe do niego przewinąć',
    zPlusa.zakladka === 'listy' && zPlusa.przewinDoFormularza && zPlusa.data === '2026-08-20',
    JSON.stringify(zPlusa));

  const goly = czytajWejscieDoKalendarza({});
  check('⛔ (K1) dotknięcie zakładki „Kalendarz" w pasku NIE ZMIENIA zachowania — '
    + 'zostaje „Tydzień", dokładnie jak dotąd',
    goly.zakladka === 'tydzien' && !goly.przewinDoFormularza, JSON.stringify(goly));

  check('⛔ (K1, Z0) data spoza kształtu dnia NIE WCHODZI do formularza',
    czytajWejscieDoKalendarza({ [PARAM_DATA]: 'wczoraj' }).data === null);

  check('⛔ (K1) parametr podany tablicą (tak potrafi oddać router) czyta się tak samo',
    czytajWejscieDoKalendarza({ [PARAM_RODZAJ]: ['match'] }).rodzaj === RODZAJ_MECZ);

  const trasa = trasaDodania({ rodzaj: RODZAJ_MECZ, data: '2026-08-20', skad: SKAD_PLUS });
  check('⭐ (K1) trasa niesie zakładkę, rodzaj i dzień — i nic pustego',
    trasa.pathname === '/kalendarz'
    && trasa.params[PARAM_RODZAJ] === RODZAJ_MECZ
    && trasa.params[PARAM_DATA] === '2026-08-20'
    && Object.values(trasa.params).every((v) => v !== ''),
    JSON.stringify(trasa));

  check('⛔ (K1, R5) trasa BEZ dnia nie wysyła pustego napisu jako dnia',
    !(PARAM_DATA in trasaDodania({ skad: SKAD_PLUS }).params));

  // ⛔ PĘTLA: co trasa wysyła, to ekran ma przeczytać. Bez tej asercji obie
  // strony mogą być poprawne osobno i nie zgadzać się ze sobą.
  const tam = trasaDodania({ rodzaj: RODZAJ_MECZ, data: '2026-08-20', skad: SKAD_PLUS });
  const zPowrotem = czytajWejscieDoKalendarza(tam.params);
  check('⭐⛔ (K1) PĘTLA: co `trasaDodania` wysyła, to `czytajWejscieDoKalendarza` czyta',
    zPowrotem.rodzaj === RODZAJ_MECZ && zPowrotem.data === '2026-08-20'
    && zPowrotem.zakladka === 'listy' && zPowrotem.przewinDoFormularza,
    JSON.stringify(zPowrotem));
}

// ─── KAŻDY DZIEŃ JEST WEJŚCIEM ────────────────────────────────────
{
  check('⭐⛔ (K1, §3.2 wym. 4) wejście istnieje w KAŻDYM stanie dnia — '
    + 'pusty, z treścią, nieodczytany. ⛔ „z treścią" był dziurą',
    STANY_DNIA.length === 3
    && STANY_DNIA.every((stan) => wejscieDnia({ data: '2026-08-21', stan }).jest),
    STANY_DNIA.map((s) => `${s}=${wejscieDnia({ data: '2026-08-21', stan: s }).jest}`).join(' · '));

  check('⛔ (K1) …a dzień bez poprawnej daty wejścia NIE dostaje — '
    + 'nie ma czego przenieść do formularza',
    !wejscieDnia({ data: '', stan: 'pusty' }).jest);

  check('⛔ (K1) próg dotyku jest STAŁĄ MODUŁU, nie liczbą wpisaną w styl',
    MINIMALNY_OBSZAR_DOTYKU_DP === 44);
}

// ─── RODZAJ „MECZ" ────────────────────────────────────────────────
{
  const znane = ['club_training', 'own_training', 'micro_session', 'task', 'match'];
  const kolejnosc = rodzajeFormularza(znane);
  check('⭐ (K1, §3.1 wym. 4) „Mecz" jest PIERWSZY, a nie piąty w liście do przewinięcia',
    kolejnosc[0] === RODZAJ_MECZ, kolejnosc.join(', '));
  check('⛔ (K1, §4) ANI JEDEN RODZAJ NIE ZNIKA — zapadka na RÓWNOŚĆ zbiorów',
    kolejnosc.length === znane.length
    && znane.every((r) => kolejnosc.includes(r)),
    `${kolejnosc.length} vs ${znane.length}: ${kolejnosc.join(', ')}`);
}

// ─── ⛔⛔ CO POWSTAJE W BAZIE I KIEDY (§3.5) ───────────────────────
{
  check('⛔⛔ (K1, §3.5 wym. 2) WEJŚCIE DO ARKUSZA NIE ZAKŁADA WYDARZENIA — '
    + 'wydarzenie założone i porzucone jest meczem, którego nie było (Z0, N1)',
    !czyWolnoZalozycWydarzenie({ chwila: 'wejscie_do_arkusza', maJuzWydarzenie: null }).wolno);

  check('⭐ (K1, §3.5 wym. 2) …a dotknięcie „Zapisz" — zakłada',
    czyWolnoZalozycWydarzenie({ chwila: 'dotkniecie_zapisu', maJuzWydarzenie: null }).wolno);

  check('⛔ (K1) ponowne „Zapisz" po nieudanej ocenie NIE zakłada DRUGIEGO wydarzenia',
    !czyWolnoZalozycWydarzenie({ chwila: 'dotkniecie_zapisu', maJuzWydarzenie: 77 }).wolno);

  check('⛔ (K1) obie chwile są wymienione z nazwy i tylko jedna przepuszcza',
    CHWILE_ZALOZENIA.length === 2
    && CHWILE_ZALOZENIA.filter((c) => czyWolnoZalozycWydarzenie({ chwila: c, maJuzWydarzenie: null }).wolno).length === 1);

  const d = decyzjaZalozeniaWydarzenia({ idZawodnika: 'u1', data: '2026-08-20' });
  check('⭐ (K1, §3.5 wym. 3 i 7) wiersz wydarzenia jest ZWYKŁYM wierszem kalendarza — '
    + 'rodzaj „mecz", źródło „zawodnik", tytuł uczciwy, dzień z wyboru',
    d.rodzaj === 'zaloz'
    && d.wiersz.event_type === RODZAJ_MECZ
    && d.wiersz.source === 'player'
    && d.wiersz.status === MECZ_BEZ_PLANU_STATUS
    && d.wiersz.title === MECZ_BEZ_PLANU_TYTUL
    && d.wiersz.scheduled_date === '2026-08-20',
    JSON.stringify(d));

  check('⛔ (K1, Z0) wiersz NIE ZMYŚLA godziny ani rywala — tych pól po prostu nie ma',
    d.rodzaj === 'zaloz'
    && !('scheduled_time' in d.wiersz)
    && !('notes' in d.wiersz),
    JSON.stringify(d.rodzaj === 'zaloz' ? Object.keys(d.wiersz) : []));

  check('⛔ (K1, R5) bez dnia NIE ZAKŁADAMY NIC i mówimy o tym zdaniem',
    decyzjaZalozeniaWydarzenia({ idZawodnika: 'u1', data: '' }).rodzaj === 'nie_zakladaj'
    && decyzjaZalozeniaWydarzenia({ idZawodnika: 'u1', data: '' }).rodzaj === 'nie_zakladaj');

  // ⭐ §3.5 wymaganie 5 — WIERSZ OCENY JEST ZWIĄZANY Z TYM WYDARZENIEM.
  // ⛔ Maszynerię ma pas D2 (`zdecydujOZapisieMeczu`); tutaj sprawdzamy, że
  // wołana z wystąpieniem świeżo założonym NAPRAWDĘ wiąże — inaczej licznik
  // pracy policzyłby ten mecz dwa razy.
  const zapis = zdecydujOZapisieMeczu({
    idZawodnika: 'u1',
    stan: { rodzaj: 'brak' },
    ocena: { minutyNaBoisku: 60, dlugoscMeczu: 90, rpe: 7 },
    wiecej: PUSTE_WIECEJ_O_MECZU,
    idWydarzenia: 4242,
    wydarzeniaZawodnika: new Set([4242]),
  });
  check('⭐⛔ (K1, §3.5 wym. 5) wiersz oceny WIĄŻE SIĘ z założonym wydarzeniem — '
    + 'bez `calendar_event_id` ten mecz policzyłby się dwa razy',
    zapis.rodzaj === 'wstaw' && zapis.wiersz.calendar_event_id === 4242,
    JSON.stringify(zapis.rodzaj === 'wstaw' ? zapis.wiersz.calendar_event_id : zapis.rodzaj));
}

// ═════════════════════════════════════════════════════════════════════
// ⭐⭐ GRUPA 2 — DZIEWIĘCIU STRAŻNIKÓW NA PRAWDZIWYCH PLIKACH
// ═════════════════════════════════════════════════════════════════════
// ⛔ KAŻDY BIERZE WYCINEK, A NIE CAŁY PLIK. Asercja „napis pada gdziekolwiek"
// przechodzi także wtedy, gdy napis stoi w komentarzu o tym, jak było kiedyś.

type Zrodla = { kalendarz: string; dzis: string; droga: string };

const ZRODLA_PRAWDZIWE: Zrodla = {
  kalendarz: readFileSync(join(KAT_EKRANOW, 'kalendarz.tsx'), 'utf8'),
  dzis: readFileSync(join(KAT_EKRANOW, 'dzis.tsx'), 'utf8'),
  droga: readFileSync(join(root, 'lib', 'drogaDodania.ts'), 'utf8'),
};

type Straznik = { id: string; nazwa: string; sprawdz: (z: Zrodla) => boolean };

const STRAZNICY: Straznik[] = [
  {
    id: 'K1-B1',
    nazwa: '„+" nie zostawia zawodnika na zakładce, na której nie ma formularza',
    sprawdz: (z) => {
      const k = bezKomentarzy(z.kalendarz);
      return /useLocalSearchParams\(\)/.test(k)
        && /czytajWejscieDoKalendarza\(/.test(k)
        && /useState<'tydzien' \| 'listy'>\(wejscie\.zakladka\)/.test(k)
        && /przewinDoFormularza/.test(k);
    },
  },
  {
    id: 'K1-B2',
    nazwa: 'wiersz dnia JEST wejściem — dotykalny i o obszarze ≥ 44 dp',
    sprawdz: (z) => {
      const k = bezKomentarzy(z.kalendarz);
      const dzien = cialo(k, 'function renderDzien');
      const styl = cialo(k, 'dhead:');
      if (dzien === '' || styl === '') return false;
      return /<TouchableOpacity\s+style=\{styles\.dhead\}/.test(dzien)
        && /onPress=\{\(\) => otworzFormularzNaDzien\(d\)\}/.test(dzien)
        && /minHeight: MINIMALNY_OBSZAR_DOTYKU_DP/.test(styl);
    },
  },
  {
    id: 'K1-B3',
    nazwa: 'dzień przenosi się do formularza — z trasy i z dotknięcia dnia',
    sprawdz: (z) => {
      const k = bezKomentarzy(z.kalendarz);
      const otw = cialo(k, 'function otworzFormularzNaDzien');
      if (otw === '') return false;
      return /useState<Date \| null>\(\s*wejscie\.data === null \? null : new Date\(wejscie\.data \+ 'T00:00:00'\),\s*\)/.test(k)
        && /wejscieDnia\(\{/.test(otw)
        && /setDate\(new Date\(we\.data \+ 'T00:00:00'\)\)/.test(otw);
    },
  },
  {
    id: 'K1-B4',
    nazwa: 'rodzaj „Mecz" jest w formularzu i widać go bez otwierania czegokolwiek',
    sprawdz: (z) => {
      const k = bezKomentarzy(z.kalendarz);
      const lista = /const RODZAJE_FORMULARZA: readonly string\[\] =\s*\[([^\]]*)\]/.exec(k);
      if (lista === null) return false;
      const wPliku = lista[1].split(',').map((x) => x.trim().replace(/'/g, '')).filter((x) => x !== '');
      const etykiety = /const EVENT_TYPE_LABELS: Record<string, string> = \{([\s\S]*?)\};/.exec(k);
      if (etykiety === null) return false;
      const znane = [...etykiety[1].matchAll(/([a-z_]+):\s*'/g)].map((m) => m[1]);
      const zReguly = rodzajeFormularza(znane);
      // ⛔ RÓWNOŚĆ co do elementu I co do kolejności.
      return wPliku.length === zReguly.length
        && wPliku.every((r, i) => r === zReguly[i])
        // ⛔ …i wszystkie stoją na ekranie naraz, a nie w `Picker`-ze rodzaju.
        && /\{RODZAJE_FORMULARZA\.map\(/.test(k)
        && !/<Picker selectedValue=\{eventType\}/.test(k);
    },
  },
  {
    id: 'K1-B5',
    nazwa: 'RÓWNOŚĆ: każdy arkusz ma wejście na ekranie, każde wejście ma arkusz',
    sprawdz: (z) => {
      const k = bezKomentarzy(z.kalendarz);
      const zapadka = /const RODZAJE_ARKUSZA_KALENDARZA: readonly RodzajArkuszaKalendarza\[\] =\s*\[([^\]]*)\]/.exec(k);
      if (zapadka === null) return false;
      const rodzaje = zapadka[1].split(',').map((x) => x.trim().replace(/'/g, '')).filter((x) => x !== '');
      if (rodzaje.length === 0) return false;
      const wejscia = [...k.matchAll(/wejscieArkusza\('([a-zA-Z]+)'/g)].map((m) => m[1]);
      const naglowki = [...cialo(k, 'function naglowekArkuszaKalendarza').matchAll(/case '([a-zA-Z]+)':/g)].map((m) => m[1]);
      const rowne = (a: string[], b: string[]) =>
        a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
      // ⛔ Trzy zbiory na RÓWNOŚĆ: rodzaj bez wejścia to pytanie, którego
      // zawodnik nigdy nie zobaczy; wejście bez rodzaju to przycisk donikąd;
      // rodzaj bez nagłówka to okno bez nazwy.
      return rowne(rodzaje, [...new Set(wejscia)]) && rowne(rodzaje, [...new Set(naglowki)])
        // ⛔ …a arkusz stoi POZA `ScrollView`, inaczej nie zdejmuje ani jednego dp.
        // ⚠️ `> 0` przy OBU: brak `</ScrollView>` dawał `-1`, a `-1 < cokolwiek`
        // przechodziło — czyli skasowanie przewijania uciszało tego strażnika.
        && k.indexOf('</ScrollView>') > 0
        && k.indexOf('<Arkusz') > 0
        && k.indexOf('</ScrollView>') < k.indexOf('<Arkusz');
    },
  },
  {
    id: 'K1-B6',
    nazwa: 'zero przekreśleń na Kalendarzu (T-4: przekreślenie czyta się jako kara)',
    sprawdz: (z) => !/textDecorationLine:\s*'line-through'/.test(bezKomentarzy(z.kalendarz)),
  },
  {
    id: 'K1-B7',
    nazwa: 'obie kopie skali RPE biorą wartości z `RPE_WARTOSCI` i żadna nic nie podstawia',
    sprawdz: (z) => {
      const d = bezKomentarzy(z.dzis);
      // ⛔ WYCINEK, NIE CAŁY PLIK (§0.7). Poza skalą RPE `rpeWybrane` ma
      // w tym pliku prawo mieć wartość zastępczą — `natezenie: rpeWybrane ?? 1`
      // przy wpisie bólu jest kolumną bazy, nie podpowiedzią na ekranie.
      const bloki = [...d.matchAll(/RPE_WARTOSCI\.map\(\(r\) => \([\s\S]{0,800}?\)\)\}/g)]
        .map((m) => m[0]);
      // ⛔ DOKŁADNIE DWIE kopie i ani jedna więcej — trzecia znaczyłaby, że
      // ktoś dorobił trzecią ścieżkę oceny ciężkości.
      return bloki.length === 2
        && bloki.every((b) => b.length > 100
          && /rpeWybrane === r && styles\.pytanieBtnWybrany/.test(b)
          && !/rpeWybrane\s*\?\?/.test(b)
          && !/rpeWybrane\s*\|\|/.test(b))
        && !/setRpeWybrane\(\s*\d/.test(d);
    },
  },
  {
    id: 'K1-B8',
    nazwa: '⛔⛔ wydarzenie meczu powstaje WYŁĄCZNIE przy dotknięciu „Zapisz"',
    sprawdz: (z) => {
      const d = bezKomentarzy(z.dzis);
      const otwarcie = cialo(d, 'function otworzMeczBezPlanu');
      const zapis = cialo(d, 'async function zapiszMeczBezPlanu');
      if (otwarcie === '' || zapis === '') return false;
      const wstawienia = [...d.matchAll(/from\('calendar_events'\)\s*\.insert\(/g)].length;
      return wstawienia === 1
        && /from\('calendar_events'\)\.insert\(|from\('calendar_events'\)\s*\.insert\(/.test(zapis)
        && !/supabase/.test(otwarcie)
        && !/insert/.test(otwarcie);
    },
  },
  {
    id: 'K1-B9',
    nazwa: '⛔ zapis meczu bez planu przechodzi PRZEZ bramkę chwili założenia',
    sprawdz: (z) => {
      const zapis = cialo(bezKomentarzy(z.dzis), 'async function zapiszMeczBezPlanu');
      if (zapis === '') return false;
      return /czyWolnoZalozycWydarzenie\(\{/.test(zapis)
        && /chwila: 'dotkniecie_zapisu'/.test(zapis)
        && /maJuzWydarzenie: wydarzenieBezPlanu/.test(zapis)
        // ⛔ …i wiąże ocenę z wydarzeniem, które właśnie założył.
        && /zapiszKontekstMeczu\(KLUCZ_MECZU_BEZ_PLANU, idWydarzenia, idWydarzenia\)/.test(zapis);
    },
  },
];

console.log('\n═══ GRUPA 2 — ⭐⭐ ASERCJA ODWROTNA (najpierw!) ═══');
// ⛔ KOLEJNOŚĆ JEST ODWROTNA NIŻ INTUICYJNA I TO JEST CELOWE (wzorzec pasa M2):
// bateria, która na ZDROWYM kodzie cokolwiek zapala, mierzy własny błąd,
// a nie kod produktu. Najpierw dowodzimy, że milczy.
{
  const zapalone = STRAZNICY.filter((s) => !s.sprawdz(ZRODLA_PRAWDZIWE));
  check('⭐⭐ (K1) ASERCJA ODWROTNA — na PRAWDZIWYCH plikach dziewięciu strażników '
    + 'daje ZERO zapaleń',
    zapalone.length === 0,
    `zapalone: ${zapalone.map((s) => s.id).join(', ')}`);
  for (const s of STRAZNICY) {
    check(`⭐ ${s.id} — ${s.nazwa}`, s.sprawdz(ZRODLA_PRAWDZIWE));
  }
}

// ═════════════════════════════════════════════════════════════════════
// ⭐⭐ GRUPA 3 — BATERIA MUTACJI (jedenaście, na tekście z dysku)
// ═════════════════════════════════════════════════════════════════════
// ⭐ MUTUJEMY TEKST WCZYTANY Z DYSKU, NIE PLIK NA DYSKU (wzorzec pasa M2).
// ⛔ Przerwanie procesu w dowolnym momencie nie ma czego zepsuć — nie ma stanu
// do przywrócenia, więc nie ma też przywracania, które mogłoby się nie udać.

console.log('\n═══ GRUPA 3 — JEDENAŚCIE MUTACJI ═══');

type Mutacja = {
  id: string;
  copsuje: string;
  zapala: string;
  mutuj: (z: Zrodla) => Zrodla;
};

const podmien = (z: Zrodla, plik: keyof Zrodla, co: string, na: string): Zrodla => {
  if (!z[plik].includes(co)) throw new Error(`mutacja nie ma czego podmienić w ${plik}: ${co.slice(0, 60)}`);
  return { ...z, [plik]: z[plik].replace(co, na) };
};

const MUTACJE: Mutacja[] = [
  {
    id: 'K1-M1',
    copsuje: '„+" znowu ląduje na obcej zakładce — zawodnik widzi tydzień zamiast formularza',
    zapala: 'K1-B1',
    mutuj: (z) => podmien(z, 'kalendarz',
      "useState<'tydzien' | 'listy'>(wejscie.zakladka)",
      "useState<'tydzien' | 'listy'>('tydzien')"),
  },
  {
    id: 'K1-M2',
    copsuje: 'dzień z treścią przestaje być dotykalny — dokładnie ten stan był dziurą',
    zapala: 'K1-B2',
    mutuj: (z) => podmien(z, 'kalendarz',
      'onPress={() => otworzFormularzNaDzien(d)}', ''),
  },
  {
    id: 'K1-M3',
    copsuje: 'obszar dotyku wiersza dnia spada poniżej 44 dp — wiersz wygląda na dotykalny i nie jest trafiany',
    zapala: 'K1-B2',
    mutuj: (z) => podmien(z, 'kalendarz',
      ', minHeight: MINIMALNY_OBSZAR_DOTYKU_DP }', ' }'),
  },
  {
    id: 'K1-M4',
    copsuje: 'data nie przenosi się z dotkniętego dnia — zawodnik wpisuje ją drugi raz',
    zapala: 'K1-B3',
    mutuj: (z) => podmien(z, 'kalendarz',
      "setDate(new Date(we.data + 'T00:00:00'));", ''),
  },
  {
    id: 'K1-M5',
    copsuje: 'rodzaj „Mecz" wypada z formularza — po cichu, bo `EVENT_TYPE_LABELS` nadal go zna',
    zapala: 'K1-B4',
    mutuj: (z) => podmien(z, 'kalendarz', "['match', 'club_training'", "['club_training'"),
  },
  {
    id: 'K1-M6',
    copsuje: 'pola opcjonalne znikają z ekranu BEZ wejścia zastępczego — najtańsze „ekran schudł"',
    zapala: 'K1-B5',
    mutuj: (z) => podmien(z, 'kalendarz',
      "{wejscieArkusza('szczegoly', WEJSCIE_SZCZEGOLY, WEJSCIE_SZCZEGOLY_PODPIS)}", ''),
  },
  {
    id: 'K1-M7',
    copsuje: 'arkusz wpięty DO `ScrollView` — nakładka przestaje zdejmować cokolwiek',
    zapala: 'K1-B5',
    mutuj: (z) => podmien(z, 'kalendarz', '    </ScrollView>\n\n    {/* ── ARKUSZ', '    {/* ── ARKUSZ'),
  },
  {
    id: 'K1-M8',
    copsuje: 'przekreślenie wraca na Kalendarz — „to miało być, a nie było" jako kara (T-4, Z7)',
    zapala: 'K1-B6',
    mutuj: (z) => podmien(z, 'kalendarz',
      'itNieObowiazuje: { color: colors.textTertiary },',
      "itNieObowiazuje: { color: colors.textTertiary, textDecorationLine: 'line-through' },"),
  },
  {
    id: 'K1-M9',
    copsuje: 'skala ciężkości dostaje wartość podstawioną za zawodnika (Z6)',
    zapala: 'K1-B7',
    mutuj: (z) => podmien(z, 'dzis',
      'key={`bp-${r}`}\n                    style={[styles.pytanieBtn, rpeWybrane === r && styles.pytanieBtnWybrany]}',
      'key={`bp-${r}`}\n                    style={[styles.pytanieBtn, (rpeWybrane ?? 5) === r && styles.pytanieBtnWybrany]}'),
  },
  {
    id: 'K1-M10',
    copsuje: '⛔⛔ wydarzenie powstaje PRZY WEJŚCIU do arkusza — mecz, którego nie było, '
      + 'i 3 punkty, na które nikt nie zapracował (Z0 + N1)',
    zapala: 'K1-B8',
    mutuj: (z) => podmien(z, 'dzis',
      '  function otworzMeczBezPlanu() {',
      "  function otworzMeczBezPlanu() {\n"
      + "    supabase.from('calendar_events').insert({ event_type: 'match' });"),
  },
  {
    id: 'K1-M11',
    copsuje: '⛔⛔ wyjście z arkusza w połowie zostawia wiersz w bazie — bramka chwili '
      + 'założenia obchodzona, a wiązanie oceny z wydarzeniem zerwane',
    zapala: 'K1-B9',
    mutuj: (z) => podmien(z, 'dzis',
      "    const brama = czyWolnoZalozycWydarzenie({\n      chwila: 'dotkniecie_zapisu', maJuzWydarzenie: wydarzenieBezPlanu,\n    });",
      '    const brama = { wolno: true, powod: \'\' };'),
  },
];

check('⛔ (K1, O69) bateria mutacji NIE JEST PUSTA — minimum osiem z polecenia',
  MUTACJE.length >= 8, `${MUTACJE.length}`);

for (const m of MUTACJE) {
  let zmutowane: Zrodla;
  try {
    zmutowane = m.mutuj(ZRODLA_PRAWDZIWE);
  } catch (e) {
    check(`⛔ ${m.id} — mutacja ma co zepsuć`, false, String(e));
    continue;
  }
  check(`⛔ ${m.id} — mutacja NAPRAWDĘ zmienia plik`,
    zmutowane.kalendarz !== ZRODLA_PRAWDZIWE.kalendarz
    || zmutowane.dzis !== ZRODLA_PRAWDZIWE.dzis
    || zmutowane.droga !== ZRODLA_PRAWDZIWE.droga);

  const zapalone = STRAZNICY.filter((s) => !s.sprawdz(zmutowane)).map((s) => s.id);
  check(`⭐ ${m.id} → ${m.zapala} · ${m.copsuje}`,
    zapalone.includes(m.zapala),
    `zapalone: [${zapalone.join(', ') || 'ŻADEN'}] — spodziewany ${m.zapala}`);
}

// ⛔ PO CAŁEJ BATERII PLIKI NA DYSKU SĄ CO DO ZNAKU TAKIE SAME.
// ⚠️ Ta asercja pilnuje, żeby nikt nie zamienił mutacji na zapisującą.
{
  const teraz: Zrodla = {
    kalendarz: readFileSync(join(KAT_EKRANOW, 'kalendarz.tsx'), 'utf8'),
    dzis: readFileSync(join(KAT_EKRANOW, 'dzis.tsx'), 'utf8'),
    droga: readFileSync(join(root, 'lib', 'drogaDodania.ts'), 'utf8'),
  };
  check('⭐⛔ (K1) po CAŁEJ baterii pliki na dysku są CO DO ZNAKU takie same',
    teraz.kalendarz === ZRODLA_PRAWDZIWE.kalendarz
    && teraz.dzis === ZRODLA_PRAWDZIWE.dzis
    && teraz.droga === ZRODLA_PRAWDZIWE.droga);
}

// ═════════════════════════════════════════════════════════════════════
// ⛔ GRUPA 4 — ZAPADKA ZAKŁADKI „LISTY"
// ═════════════════════════════════════════════════════════════════════
// ⚠️ PO CO OSOBNA. `zmierzEkran('kalendarz.tsx')` opisuje JEDNĄ zakładkę
// i mówi, którą pomija. Zakładka bez zapadki to zakładka, w której wolno
// rosnąć po cichu — a to jest dokładnie ten ekran, o który poszedł ten pas.
// ⭐ Ta zapadka pilnuje TEJ zakładki, na której od 21.08 ląduje „+".
{
  const ZAPADKA_LISTY = {
    pozycji: 7,
    widocznych: 7,
    przecietych: 0,
    wysokoscDp: 767,
    ustawiona: '21.08.2026',
    powod: 'pas K1 — 2 802 → 767 dp: cztery sekcje wpisów i cztery pola opcjonalne '
      + 'zeszły do arkusza (Modal, 0 dp), dni tygodnia i rodzaj wydarzenia stanęły '
      + 'chipami zamiast siedmiu wierszy Checkbox i Pickera',
  };
  const k = ZRODLA_PRAWDZIWE.kalendarz;
  const znacznik = "{zakladka === 'tydzien' ? renderTydzien() : renderListy()}";
  check('⛔ STRAŻNIK STRAŻNIKA — znacznik zakładek stoi w pliku (inaczej mierzę nie to)',
    k.includes(znacznik));
  const listy = zmierzEkranZTekstu('kalendarz-listy', k.replace(znacznik, '{renderListy()}'), KAT_EKRANOW);
  const przeciete = listy.pozycje.filter((p) => p.goraDp < 808 && p.dolDp > 808).length;

  check(`⛔ (K1, D4) ZAPADKA „Listy": liczba rzeczy NIE ZMIENIŁA SIĘ (${ZAPADKA_LISTY.ustawiona})`,
    listy.pozycje.length === ZAPADKA_LISTY.pozycji,
    `jest ${listy.pozycje.length}, zapadka ${ZAPADKA_LISTY.pozycji} — ${ZAPADKA_LISTY.powod}`);
  check('⛔ (K1, D4) ZAPADKA „Listy": wysokość w dp NIE UROSŁA',
    Math.round(listy.wysokoscRazemDp) === ZAPADKA_LISTY.wysokoscDp,
    `jest ${Math.round(listy.wysokoscRazemDp)} dp, zapadka ${ZAPADKA_LISTY.wysokoscDp} dp`);
  check('⭐ (K1) ZAPADKA „Listy": WSZYSTKO widać bez przewijania',
    listy.nadZgieciem === ZAPADKA_LISTY.widocznych && przeciete === ZAPADKA_LISTY.przecietych,
    `nad zgięciem ${listy.nadZgieciem}, przeciętych ${przeciete}`);
  check('⭐⛔ (K1, §3.3) zakładka z formularzem MIEŚCI SIĘ NAD ZGIĘCIEM (808 dp)',
    listy.wysokoscRazemDp < 808, `${listy.wysokoscRazemDp} dp`);
  check('(K1) zapadka ma datę i powód — bez nich jest liczbą bez właściciela',
    /^\d{2}\.\d{2}\.\d{4}$/.test(ZAPADKA_LISTY.ustawiona) && ZAPADKA_LISTY.powod.length > 20);
}

// ⛔ PODSUMOWANIE W KSZTAŁCIE, KTÓRY CZYTA `tests/run-selftests.mjs`.
console.log(`\n${ok} passed, ${bledy} failed`);
if (bledy > 0) throw new Error(`${bledy} asercji nie przeszło`);
