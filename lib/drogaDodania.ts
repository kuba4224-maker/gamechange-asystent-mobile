// PLAN-D-K1 08.2026 (21.08.2026) — NOWY PLIK. DROGA DODANIA RZECZY.
//
// ═════════════════════════════════════════════════════════════════════
// PO CO TO ISTNIEJE — jednym zdaniem Kuby
// ═════════════════════════════════════════════════════════════════════
// „Niestety nie potrafię w żaden sposób dodać meczu, a kiedy wchodzę przez
//  ikonkę dodania aktywności to przekierowuje mnie na tydzień a w tygodniu
//  nie jestem w stanie kliknąć żadnego dnia żeby coś do niego dodać."
//                                        — 21.08.2026, po pierwszym uruchomieniu
//
// ⛔ WŁAŚCICIEL PRODUKTU NIE UMIAŁ DODAĆ MECZU WE WŁASNEJ APLIKACJI. Funkcja
// była zbudowana, 3 552 asercje świeciły na zielono, a droga do niej nie
// istniała. Ten moduł jest tą drogą — rozłożoną na decyzje, które da się
// URUCHOMIĆ bez ekranu i bez bazy.
//
// ⛔ CZEGO TU NIE MA I NIE BĘDZIE: ani jednego `import` z `react-native`,
// ani jednego `supabase`, ani jednego Reacta. Ten sam podział, co
// `lib/dodanieWstecz.ts` (bramka „+") i `lib/meczWiecej.ts` (decyzja o zapisie
// meczu): reguła mieszka tutaj, ekran ją WYKONUJE.

// ═════════════════════════════════════════════════════════════════════
// 1. ⭐ DZIEŃ, KTÓRY PRZENOSI SIĘ DO FORMULARZA (§3.1 wymaganie 3)
// ═════════════════════════════════════════════════════════════════════
// ⛔ CO BYŁO ZEPSUTE. `przejdzDoDodania()` w `dzis.tsx` robiło czyste
// `router.push('/kalendarz')` — bez ani jednego parametru. Produkt przed
// chwilą zapytał zawodnika „już się odbyło czy dopiero będzie", dostał
// odpowiedź, po czym o niej zapomniał i kazał wpisać datę ręcznie.

/** Po co zawodnik dodaje rzecz. ⛔ Dwie odpowiedzi arkusza „+", nie trzy. */
export type PowodDodania = 'juz_sie_odbylo' | 'dopiero_bedzie';

/** ⛔ Lista ZAMKNIĘTA — zapadka na równość stoi w strażniku. */
export const POWODY_DODANIA: readonly PowodDodania[] = ['juz_sie_odbylo', 'dopiero_bedzie'];

/** ⛔ Kształt daty, którym mówi cała appka (`toLocalDateStr`). */
const KSZTALT_DATY = /^\d{4}-\d{2}-\d{2}$/;

export function toDataPoprawna(d: unknown): d is string {
  if (typeof d !== 'string' || !KSZTALT_DATY.test(d)) return false;
  const [r, m, dz] = d.split('-').map(Number);
  if (m < 1 || m > 12 || dz < 1 || dz > 31) return false;
  const t = new Date(Date.UTC(r, m - 1, dz));
  return t.getUTCFullYear() === r && t.getUTCMonth() === m - 1 && t.getUTCDate() === dz;
}

/**
 * ⛔ ARYTMETYKA DAT W UTC, NIE W STREFIE URZĄDZENIA. Doba przesunięta
 * o strefę potrafi cofnąć „jutro" na „dziś" u zawodnika, który dodaje coś
 * po dwudziestej drugiej — a wtedy produkt zaproponowałby datę, o której
 * właśnie powiedział, że jest przeszłością.
 */
export function przesunDzien(data: string, oIle: number): string | null {
  if (!toDataPoprawna(data)) return null;
  const [r, m, d] = data.split('-').map(Number);
  const t = new Date(Date.UTC(r, m - 1, d));
  t.setUTCDate(t.getUTCDate() + oIle);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export type DataStartowa = { data: string; powod: string };

/**
 * ⭐⭐ DWIE RÓŻNE DATY STARTOWE — i to jest cała treść wymagania 3 z §3.1.
 *
 * ⛔ „już się odbyło" → DZIEŃ, O KTÓRY PRODUKT WŁAŚNIE ZAPYTAŁ. Arkusz
 *    kolizji (`lib/dodanieWstecz.ts`) pyta o konkretny dzień z nieocenionymi
 *    rzeczami; jeżeli zawodnik powiedział „to była inna rzecz", chodzi
 *    o TEN SAM dzień. Gdy dnia nie znamy (nieudany odczyt pytań) —
 *    zostaje dziś, bo rzecz, która „się odbyła", odbyła się najpóźniej dziś.
 * ⛔ „dopiero będzie" → JUTRO. To jest najbliższy dzień, który w całości
 *    jest jeszcze przed zawodnikiem.
 *
 * ⚠️ GRANICA TEJ REGUŁY, WYPISANA ZAMIAST PRZEMILCZANA: mecz DZIŚ o 18:00
 * też „dopiero będzie", a dostanie jutro. To jest wartość STARTOWA pola,
 * które stoi na ekranie i widać w nim datę — nie zapis. ⛔ Kierunek pomyłki
 * wybrany świadomie: data w przyszłości nie wpada do licznika pracy jako
 * praca wykonana, a data dzisiejsza podstawiona rzeczy przyszłej — owszem.
 */
export function dataStartowa(w: {
  powod: PowodDodania;
  /** Dzień, o który pytał arkusz kolizji. ⛔ `null`/pusto = nie wiemy. */
  dzienPytania: string | null;
  dzis: string;
}): DataStartowa {
  const dzis = toDataPoprawna(w.dzis) ? w.dzis : '';
  if (dzis === '') {
    return { data: '', powod: '⛔ nie znam dzisiejszej daty — nie podstawiam żadnej (Z0)' };
  }
  if (w.powod === 'dopiero_bedzie') {
    const jutro = przesunDzien(dzis, 1);
    return jutro === null
      ? { data: '', powod: '⛔ nie umiem policzyć jutra — nie podstawiam żadnej daty' }
      : { data: jutro, powod: `„dopiero będzie" → jutro (${jutro}), najbliższy dzień w całości przed zawodnikiem` };
  }
  if (toDataPoprawna(w.dzienPytania)) {
    return {
      data: w.dzienPytania,
      powod: `„już się odbyło" → dzień, o który zapytał arkusz kolizji (${w.dzienPytania})`,
    };
  }
  return {
    data: dzis,
    powod: `„już się odbyło" → dziś (${dzis}); dnia pytania nie znamy, a rzecz, `
      + 'która się odbyła, odbyła się najpóźniej dziś',
  };
}

// ═════════════════════════════════════════════════════════════════════
// 2. ⭐ CO NIESIE TRASA DO KALENDARZA (§3.1 wymagania 1 i 2)
// ═════════════════════════════════════════════════════════════════════
// ⛔ CO BYŁO ZEPSUTE: `router.push('/kalendarz')` zostawiało zawodnika na
// zakładce „Tydzień", na której formularza NIE MA. Trzy skoki, których nic
// nie sygnalizowało.

export const PARAM_ZAKLADKA = 'zakladka';
export const PARAM_RODZAJ = 'rodzaj';
export const PARAM_DATA = 'data';
export const PARAM_SKAD = 'skad';

/** Skąd zawodnik przyszedł. ⛔ Do logu i do decyzji o przewinięciu, nie na ekran. */
export const SKAD_PLUS = 'plus';
export const SKAD_DZIEN = 'dzien';

export type ZakladkaKalendarza = 'tydzien' | 'listy';

/** ⛔ Zakładka, na której STOI formularz. Jedno miejsce, zero drugiej kopii. */
export const ZAKLADKA_Z_FORMULARZEM: ZakladkaKalendarza = 'listy';

export type WejscieDoKalendarza = {
  zakladka: ZakladkaKalendarza;
  /** `calendar_events.event_type` do zaznaczenia z góry. `null` = nie narzucamy. */
  rodzaj: string | null;
  /** Data startowa formularza. `null` = zawodnik wybierze sam. */
  data: string | null;
  /** ⭐ Czy ekran ma przewinąć do formularza zaraz po otwarciu. */
  przewinDoFormularza: boolean;
  powod: string;
};

function napisAlbo(x: unknown): string | null {
  if (typeof x === 'string') return x.trim() === '' ? null : x.trim();
  if (Array.isArray(x) && x.length > 0 && typeof x[0] === 'string') {
    return x[0].trim() === '' ? null : x[0].trim();
  }
  return null;
}

/**
 * ⭐⭐ JEDYNE MIEJSCE, KTÓRE ROZSTRZYGA, GDZIE LĄDUJE ZAWODNIK.
 *
 * ⛔ REGUŁA JEST JEDNA I NIE MA WYJĄTKÓW: **kto przyszedł z zamiarem
 * dodania, ląduje na zakładce z formularzem.** Zamiar poznajemy po tym,
 * że trasa niesie cokolwiek — rodzaj, datę albo `skad`. Zawodnik, który
 * dotknął zakładki „Kalendarz" w pasku, nie niesie nic i zostaje na
 * „Tygodniu", dokładnie jak dotąd.
 */
export function czytajWejscieDoKalendarza(params: Record<string, unknown>): WejscieDoKalendarza {
  const rodzaj = napisAlbo(params[PARAM_RODZAJ]);
  const dataSurowa = napisAlbo(params[PARAM_DATA]);
  const data = dataSurowa !== null && toDataPoprawna(dataSurowa) ? dataSurowa : null;
  const skad = napisAlbo(params[PARAM_SKAD]);
  const zakladkaZadana = napisAlbo(params[PARAM_ZAKLADKA]);
  const zZamiarem = rodzaj !== null || data !== null || skad !== null
    || zakladkaZadana === ZAKLADKA_Z_FORMULARZEM;

  if (!zZamiarem) {
    return {
      zakladka: 'tydzien',
      rodzaj: null,
      data: null,
      przewinDoFormularza: false,
      powod: 'trasa nie niesie zamiaru dodania — zostaje domyślny „Tydzień"',
    };
  }
  return {
    zakladka: ZAKLADKA_Z_FORMULARZEM,
    rodzaj,
    data,
    przewinDoFormularza: true,
    powod: `zamiar dodania (rodzaj=${rodzaj ?? '—'}, data=${data ?? '—'}, skąd=${skad ?? '—'}) `
      + `→ zakładka „${ZAKLADKA_Z_FORMULARZEM}" i przewinięcie do formularza`,
  };
}

/** Trasa, którą buduje „+" i wiersz dnia. ⛔ Puste pola nie idą jako `''`. */
export function trasaDodania(w: {
  rodzaj?: string | null;
  data?: string | null;
  skad: string;
}): { pathname: string; params: Record<string, string> } {
  const params: Record<string, string> = {
    [PARAM_ZAKLADKA]: ZAKLADKA_Z_FORMULARZEM,
    [PARAM_SKAD]: w.skad,
  };
  if (typeof w.rodzaj === 'string' && w.rodzaj !== '') params[PARAM_RODZAJ] = w.rodzaj;
  if (toDataPoprawna(w.data)) params[PARAM_DATA] = w.data;
  return { pathname: '/kalendarz', params };
}

// ═════════════════════════════════════════════════════════════════════
// 3. ⛔ RODZAJ „MECZ" OSIĄGALNY BEZ SZUKANIA (§3.1 wymaganie 4)
// ═════════════════════════════════════════════════════════════════════
// ⛔ CO BYŁO ZEPSUTE: rodzaj wybierało się `Picker`-em, który pokazuje
// WYŁĄCZNIE wartość zaznaczoną. „Mecz" był piątą pozycją listy, której nie
// widać, dopóki się jej nie otworzy i nie przewinie.
//
// ⛔ CZEGO TA REGUŁA NIE ROBI: nie kasuje ani jednego rodzaju (§4 zakazuje)
// i nie zmienia domyślnego. Zmienia się WYŁĄCZNIE to, ile z nich widać naraz.

export const RODZAJ_MECZ = 'match';

/**
 * ⭐ KOLEJNOŚĆ RODZAJÓW W FORMULARZU. „Mecz" idzie pierwszy, reszta zachowuje
 * kolejność, którą miała w `EVENT_TYPE_LABELS`.
 * ⛔ ZAPADKA NA RÓWNOŚĆ, nie na zawieranie: wynik ma DOKŁADNIE te same
 * elementy, co wejście. Rodzaj, który wypadłby z tej listy, zniknąłby
 * z formularza po cichu — czyli dokładnie ten defekt, który ten pas usuwa.
 */
export function rodzajeFormularza(znane: readonly string[]): readonly string[] {
  const bezMeczu = znane.filter((r) => r !== RODZAJ_MECZ);
  return znane.includes(RODZAJ_MECZ) ? [RODZAJ_MECZ, ...bezMeczu] : [...bezMeczu];
}

// ═════════════════════════════════════════════════════════════════════
// 4. ⭐ KAŻDY DZIEŃ TYGODNIA JEST WEJŚCIEM (§3.2)
// ═════════════════════════════════════════════════════════════════════
// ⛔ ZMIERZONE 21.08: na zakładce „Tydzień" jedynym wejściem do dodawania
// było CTA pustki, rysowane WYŁĄCZNIE w tygodniu bez treści. Kuba ma tydzień
// z treścią, więc nie zobaczył go ani razu.
// ⭐ To nie jest „zawodnik nie znalazł". To jest „nie ma czego znaleźć".

/** ⛔ Trzy stany dnia, nie dwa: „nieodczytany" nie jest pusty (R5). */
export type StanDnia = 'pusty' | 'z_trescia' | 'nieodczytany';

export const STANY_DNIA: readonly StanDnia[] = ['pusty', 'z_trescia', 'nieodczytany'];

/**
 * ⭐⭐ REGUŁA, KTÓRA NIE MA GAŁĘZI „BEZ WEJŚCIA".
 *
 * ⛔ To jest jej cały sens: funkcja zwraca `jest: true` dla KAŻDEGO stanu
 * dnia, bo stan dnia nie jest powodem, żeby odebrać zawodnikowi możliwość
 * dopisania czegoś do tego dnia. Strażnik przechodzi po `STANY_DNIA`
 * i sprawdza wszystkie trzy — dziura była dokładnie w „z_trescia".
 */
export function wejscieDnia(w: { data: string; stan: StanDnia }): {
  jest: boolean; data: string; powod: string;
} {
  if (!toDataPoprawna(w.data)) {
    return { jest: false, data: '', powod: '⛔ dzień bez poprawnej daty — nie ma czego przenieść do formularza' };
  }
  return {
    jest: true,
    data: w.data,
    powod: `dzień ${w.data} (${w.stan}) jest wejściem — stan dnia nie odbiera prawa dopisania`,
  };
}

/** ⛔ Obszar dotyku wiersza dnia. Wartość z §3.2 wymaganie 3, jedno miejsce. */
export const MINIMALNY_OBSZAR_DOTYKU_DP = 44;

// ═════════════════════════════════════════════════════════════════════
// 5. ⭐⭐ MECZ, KTÓREGO NIE BYŁO W PLANIE (§3.5 — decyzja Kuby 21.08.2026)
// ═════════════════════════════════════════════════════════════════════
// > „jaka teraz będzie droga wprowadzania meczu jak tylko to będzie gotowe?"
// > — i po przedstawieniu struktury: ⭐ „tak".
//
// ⛔ CO ZMIERZONO: JEDYNE wejście do pełnej karty meczu w całym repozytorium
// prowadzi Z KAFLA, a kafel bierze się z wydarzenia. Meczu, którego zawodnik
// nie zaplanował, nie dało się zapisać inaczej niż zakładając mu najpierw
// wydarzenie w kalendarzu. ⛔ Zawodnik po meczu ma w głowie „grałem 60 minut,
// było ciężko" — nie „muszę najpierw utworzyć wydarzenie".
//
// ⛔⛔ NAJWIĘKSZE RYZYKO, NAZWANE WPROST: wydarzenie założone i porzucone jest
// meczem, którego nie było — a liczy się jako zobowiązanie, czyli 3 punkty
// (`punktyMeczu`, `lib/nagrodaZaPrace.ts`). Zawodnik dotyka „+", rozmyśla się,
// wychodzi — i ma w tygodniu mecz, którego nie zagrał. To jest złamanie Z0
// i N1 naraz. ⭐ Dlatego reguła niżej jest TWARDA i sprawdzana uruchomieniowo.

/**
 * ⭐ CHWILA, W KTÓREJ EKRAN PYTA, CZY WOLNO ZAŁOŻYĆ WYDARZENIE.
 * ⛔ Dwie wartości i tylko jedna z nich przepuszcza.
 */
export type ChwilaZalozenia = 'wejscie_do_arkusza' | 'dotkniecie_zapisu';

export const CHWILE_ZALOZENIA: readonly ChwilaZalozenia[] =
  ['wejscie_do_arkusza', 'dotkniecie_zapisu'];

/**
 * ⭐⭐ JEDYNE MIEJSCE, W KTÓRYM PADA ZDANIE „WOLNO ZAŁOŻYĆ WYDARZENIE".
 *
 * ⛔ `wejscie_do_arkusza` NIE PRZEPUSZCZA i to jest cała ta funkcja.
 * Wyjście z arkusza w połowie ma zostawić bazę dokładnie w stanie sprzed
 * dotknięcia „+": zero nowych wierszy, zero punktów, zero meczu w tygodniu.
 *
 * ⛔ `maJuzWydarzenie` pilnuje drugiej połowy tego samego: ponowne dotknięcie
 * „Zapisz" po nieudanym zapisie oceny NIE zakłada drugiego wydarzenia.
 * Bez tego zawodnik, któremu raz padła sieć, miałby w tygodniu dwa mecze.
 */
export function czyWolnoZalozycWydarzenie(w: {
  chwila: ChwilaZalozenia;
  /** `calendar_events.id` założone już w tej wizycie. `null` = jeszcze nic. */
  maJuzWydarzenie: number | null;
}): { wolno: boolean; powod: string } {
  if (w.chwila !== 'dotkniecie_zapisu') {
    return {
      wolno: false,
      powod: '⛔ wydarzenie powstaje WYŁĄCZNIE przy dotknięciu „Zapisz" — '
        + 'założone przy wejściu do arkusza byłoby meczem, którego nie było (Z0, N1)',
    };
  }
  if (typeof w.maJuzWydarzenie === 'number' && Number.isFinite(w.maJuzWydarzenie)) {
    return {
      wolno: false,
      powod: `wydarzenie ${w.maJuzWydarzenie} jest już założone w tej wizycie — `
        + 'drugie byłoby drugim meczem w tygodniu',
    };
  }
  return { wolno: true, powod: 'zawodnik dotknął „Zapisz", a wydarzenia jeszcze nie ma' };
}

/** ⛔ Domyślny tytuł. Uczciwy, nie zmyślony: nie znamy rywala (§3.5 wym. 7, Z0). */
export const MECZ_BEZ_PLANU_TYTUL = 'Mecz';

/**
 * ⛔ STATUS ZAŁOŻONEGO WYDARZENIA. `completed`, bo mecz SIĘ ODBYŁ — zawodnik
 * właśnie to powiedział. `scheduled` znaczyłoby „czeka", a on nie czeka.
 * ⚠️ Wartość dopuszczona przez bazę od migracji A1 (14.08.2026) i rysowana
 * przez Kalendarz od pasa A7 — nie jest nowa.
 */
export const MECZ_BEZ_PLANU_STATUS = 'completed';

/** Wiersz `calendar_events` w kształcie, w jakim idzie do bazy. */
export type WierszWydarzeniaMeczu = {
  user_id: string;
  event_type: string;
  source: string;
  status: string;
  title: string;
  scheduled_date: string;
};

export type DecyzjaZalozeniaWydarzenia =
  | { rodzaj: 'zaloz'; wiersz: WierszWydarzeniaMeczu; powod: string }
  | { rodzaj: 'nie_zakladaj'; powod: string; zdanie: string | null };

/**
 * ⭐ WIERSZ WYDARZENIA MECZU — ZBUDOWANY, NIE ZGADNIĘTY.
 * ⛔ Ani godziny, ani rywala, ani rodzaju meczu tu nie ma: produkt ich nie
 * zna, a pole wypełnione domysłem jest domysłem podanym jako pomiar (Z0).
 */
export function decyzjaZalozeniaWydarzenia(w: {
  idZawodnika: string;
  data: string;
  tytul?: string | null;
}): DecyzjaZalozeniaWydarzenia {
  if (typeof w.idZawodnika !== 'string' || w.idZawodnika.trim() === '') {
    return { rodzaj: 'nie_zakladaj', powod: 'brak identyfikatora zawodnika', zdanie: null };
  }
  if (!toDataPoprawna(w.data)) {
    return {
      rodzaj: 'nie_zakladaj',
      powod: `data „${String(w.data)}" nie jest dniem`,
      zdanie: MECZ_BEZ_PLANU_BEZ_DNIA,
    };
  }
  const tytul = typeof w.tytul === 'string' && w.tytul.trim() !== ''
    ? w.tytul.trim() : MECZ_BEZ_PLANU_TYTUL;
  return {
    rodzaj: 'zaloz',
    wiersz: {
      user_id: w.idZawodnika,
      event_type: RODZAJ_MECZ,
      source: 'player',
      status: MECZ_BEZ_PLANU_STATUS,
      title: tytul,
      scheduled_date: w.data,
    },
    powod: `zakładam wydarzenie meczu na ${w.data} — dopiero teraz, przy zapisie`,
  };
}

/** ⛔ Jedno zdanie do logu — ten sam kształt, co reszta ekranu „Dziś". */
export function opisZalozeniaDoLogu(d: DecyzjaZalozeniaWydarzenia): string {
  return d.rodzaj === 'zaloz'
    ? `mecz bez planu: zakładam wydarzenie — ${d.powod}`
    : `mecz bez planu: NIE ZAKŁADAM — ${d.powod}`;
}

// ═════════════════════════════════════════════════════════════════════
// 6. BRZMIENIA — jedno miejsce, zero drugiego słownika (O92)
// ═════════════════════════════════════════════════════════════════════
// ⚠️⚠️ CAŁA TA SEKCJA JEST DO PRZEJRZENIA PRZEZ KUBĘ (§3.5 wymaganie 4,
// zasada B3: nic nie dzieje się bez jego wiedzy). To są zdania, które
// zobaczy zawodnik.

/** ⭐ Trzeci wybór w arkuszu „już się odbyło": mecz idzie prosto do oceny. */
export const PLUS_TO_BYL_MECZ = 'Mecz — już go zagrałem';
export const PLUS_TO_BYL_MECZ_PODPIS =
  'powiesz, ile minut i jak było; wpiszemy go do Twojego tygodnia';
export const PLUS_COS_INNEGO = 'Coś innego — trening, zadanie';
export const PLUS_COS_INNEGO_PODPIS =
  'otworzy się formularz kalendarza z wybranym dniem';

/**
 * ⭐ ZDANIE PO ZAPISIE (§3.5 wymaganie 4).
 * ⛔ Mówi WYŁĄCZNIE, co się stało — nie chwali, nie liczy dni z rzędu,
 * nie ocenia meczu (N1, N3).
 */
export const MECZ_BEZ_PLANU_ZAPISANY = 'Mecz stoi teraz w Twoim tygodniu.';

/** ⭐ Podpis arkusza — mówi wprost, że wydarzenia jeszcze NIE MA. */
export const MECZ_BEZ_PLANU_PODPIS =
  'Tego meczu nie było w planie. Powiedz, jak było — wpiszemy go do Twojego '
  + 'tygodnia dopiero wtedy, gdy dotkniesz „Zapisz".';

export const MECZ_BEZ_PLANU_ZAPISZ = 'Zapisz mecz';

/** ⛔ TRZY OSOBNE PORAŻKI, TRZY OSOBNE ZDANIA (R5, §3.5 wymaganie 6). */
export const MECZ_BEZ_PLANU_BEZ_DNIA =
  'Nie wiem, którego dnia był ten mecz. Wybierz dzień, zanim zapiszemy.';
export const MECZ_BEZ_PLANU_NIE_ZALOZYLEM =
  'Nie udało się wpisać tego meczu do Twojego tygodnia. ⛔ Nic nie zapisałem — '
  + 'ani meczu, ani oceny. Spróbuj jeszcze raz.';
export const MECZ_BEZ_PLANU_OCENA_NIE_WESZLA =
  'Mecz stoi już w Twoim tygodniu, ale nie udało się zapisać tego, co o nim '
  + 'powiedziałeś. Dotknij „Zapisz" jeszcze raz — nie założę go drugi raz.';

/** ⭐ Wybór dnia w arkuszu. ⛔ Dzień jest z WYBORU zawodnika (§3.5 wym. 7). */
export const MECZ_BEZ_PLANU_KTORY_DZIEN = 'Którego dnia był ten mecz';
export const MECZ_DZIEN_DZIS = 'dziś';
export const MECZ_DZIEN_WCZORAJ = 'wczoraj';
export const MECZ_BEZ_PLANU_INNY_DZIEN = 'Inny dzień — dodaj go w Kalendarzu →';

/** ⭐ Wejście z wiersza dnia na zakładce „Tydzień" (§3.2). */
export const DZIEN_DODAJ = 'Dodaj do tego dnia →';

/** ⭐ Wiersze wejścia, które zostają na ekranie Kalendarza po odchudzeniu. */
export const WEJSCIE_SZCZEGOLY = 'Więcej o tym wydarzeniu';
export const WEJSCIE_SZCZEGOLY_PODPIS = 'długość, notatka, godzina, wąskie gardło';
export const WEJSCIE_WPISY = 'Twoje wpisy w kalendarzu';
// ⛔ PODPIS WYMIENIA WSZYSTKIE CZTERY SEKCJE Z NAZWY — wiersz wejścia jest
// jedynym śladem po tym, co zeszło z ekranu (B3: zero cichych zniknięć).
export const WEJSCIE_WPISY_PODPIS = 'nadchodzące, cykliczne, minione, odwołane';

/** ⛔ Etykieta pola daty w formularzu — była i zostaje. */
export const FORMULARZ_WYBIERZ_DATE = 'Wybierz datę';
