// PLAN-D-A2A3 08.2026 (14.08.2026) — PLAN LEKCJI ZAWODNIKA.
//
// Czysta logika: ZERO Supabase, ZERO Reacta.
//
// PO CO TO ISTNIEJE — makieta `claude/MAKIETA_WIDOK_TYGODNIA.html` rysuje nad
// każdym dniem PASEK ZAJĘTOŚCI z podpisem „8:00–15:30" albo „wolne", a pod
// wtorkiem linię „↑ ciasno — szkoła do 16:30, trening o 18:00". Stopka makiety
// mówi wprost, skąd te godziny mają pochodzić:
//
//   „Pasek zajętości u góry dnia pochodzi z godzin szkoły/pracy
//    (JEDYNE DANE, KTÓRE GODZINĘ NAPRAWDĘ MAJĄ)."
//
// Do 14.08.2026 w bazie nie było ANI JEDNEJ tabeli pasującej do %school%,
// %szkol%, %lesson%, %availab% poza `specialist_availability` (Marketplace,
// nie zawodnik) — zmierzone. Migracja A3 zakłada `player_school_timetables`
// (nagłówek: fakt, że zawodnik plan podał) i `player_school_slots` (okna).
//
// ═══════════════════════════════════════════════════════════════════════════
// ⛔ REGUŁA R5 — NAJWAŻNIEJSZE ZDANIE TEGO PLIKU
//
//   „BRAK PLANU LEKCJI" I „DZIEŃ WOLNY" TO DWIE RÓŻNE RZECZY.
//
// `oknoDnia` zwraca TRZY stany, nigdy dwa:
//   NIE_WIEM — zawodnik nie podał planu na ten dzień,
//   WOLNE    — podał i tego dnia nie ma szkoły,
//   SZKOLA   — podał, są godziny.
//
// Makieta ma na NIE_WIEM osobną pustkę, z żółtym paskiem „brak konfiguracji",
// inną niż szara „brak danych":
//   „Nie wiemy, kiedy masz szkołę — dlatego cały tydzień wygląda na wolny."
//
// Gdyby te dwa stany się skleiły, produkt powiedziałby zawodnikowi, że ma
// wolny tydzień, nie wiedząc o nim NIC — czyli skłamałby o nim (Z0).
// Selftest ma osobną asercję na `NIE_WIEM !== WOLNE` i mutację, która to psuje.
// ═══════════════════════════════════════════════════════════════════════════

import { formatujGodzine, godzinaWMinutach } from './godzinaWydarzenia';

// ── PRÓG „CIASNO" ──────────────────────────────────────────────────────────
//
// PLAN-D-A2A3 08.2026 — próg niezmierzony, decyzja Kuby z dnia ____________
// (wpisz datę przy zatwierdzeniu; do tego czasu ta liczba jest propozycją).
//
// CZEGO NIE MA W DANYCH: jedyna liczba w bazie mówiąca, ile trwa jednostka
// pracy, to `daily_logs.payload->>'duration_minutes'` — a tam jest **n = 2**
// (60 i 90 minut, średnia 75) na 10 wpisów i 2 zawodników. Z dwóch obserwacji
// nie wyprowadza się progu i ta liczba NIE JEST z nich wyprowadzona.
//
// SKĄD SIĘ WZIĘŁO 90: z samej makiety. Wtorek ma szkołę do 16:30 i trening
// o 18:00, czyli okno 90 minut, i to jest jedyny przykład w produkcie
// oznaczony jako „ciasno". To DOLNA GRANICA („90 minut to już ciasno"),
// nie zmierzony próg — nie wiadomo, czy 120 minut też jest ciasne.
//
// CZEGO TEN PRÓG NIE OBEJMUJE — baza nie zna ŻADNEJ z tych rzeczy:
// dojazdu, posiłku, rozgrzewki, prysznica, odrabiania lekcji.
//
// ⚠️ Zmiana progu = zmiana TEJ JEDNEJ stałej. Liczba wpisana w warunek
// zamiast stałej byłaby nie do znalezienia i nie do zmiany w jednym miejscu.
export const PROG_CIASNO_MINUT = 90;

// ── KSZTAŁTY ───────────────────────────────────────────────────────────────

/** Trzy stany dnia. Nigdy dwa — patrz reguła R5 na górze pliku. */
export type StanDnia = 'NIE_WIEM' | 'WOLNE' | 'SZKOLA';

/** Jedno okno zajętości szkolnej. Dzień może mieć ich kilka (okienka). */
export type OknoSzkolne = { poczatek: string; koniec: string };

export type OknoDnia =
  | { stan: 'NIE_WIEM' }
  | { stan: 'WOLNE' }
  | { stan: 'SZKOLA'; okna: OknoSzkolne[]; poczatek: string; koniec: string };

/**
 * Wiersz DOKŁADNIE taki, jaki wraca z `public.school_week(p_from date)`.
 * Nie „wygodny obiekt" — kształt jest przepisany z wyniku funkcji w bazie,
 * bo to on przyjdzie do appki, a nie ten, który byłby przyjemniejszy.
 */
export type WierszPlanuLekcji = {
  on_date: string;               // 'YYYY-MM-DD'
  weekday: number;               // 1 = poniedziałek … 7 = niedziela (ISO-8601)
  timetable_id: number | null;   // null = na ten dzień NIE MA planu → NIE_WIEM
  starts_at: string | null;      // '08:00:00' (PostgREST podaje z sekundami)
  ends_at: string | null;
};

/**
 * Tydzień po sparsowaniu.
 *
 * ⚠️ `odczytany` NIE JEST OZDOBĄ. Odczyt, który się nie udał, daje pusty wynik
 * — a pusty wynik wygląda identycznie jak „zawodnik nie podał planu". Ekran,
 * który tego nie rozróżni, powie zawodnikowi mającemu plan „nie wiemy, kiedy
 * masz szkołę", i wyśle go do formularza, w którym wszystko już jest.
 * Ten sam wzorzec, który `profil.tsx` stosuje przy `height_logs`
 * („Błąd odczytu NIE udaje pustej historii").
 */
export type PlanTygodnia = {
  odczytany: boolean;
  dni: Record<string, OknoDnia>;
};

// ── PARSOWANIE ─────────────────────────────────────────────────────────────

/**
 * Zamienia wynik `school_week()` na tydzień.
 *
 * `null` na wejściu znaczy „ODCZYT SIĘ NIE UDAŁ" i daje `odczytany: false`.
 * Pusta tablica znaczy „odczyt się udał i nic nie wrócił" — co przy tej funkcji
 * w bazie nie powinno się zdarzyć (zawsze zwraca 7 dni), więc traktujemy to
 * jak brak wiedzy o każdym dniu, ale Z ZACHOWANIEM `odczytany: true`.
 */
export function parsujPlanLekcji(wiersze: WierszPlanuLekcji[] | null | undefined): PlanTygodnia {
  if (wiersze == null) return { odczytany: false, dni: {} };

  const dni: Record<string, OknoDnia> = {};
  const oknaDnia: Record<string, OknoSzkolne[]> = {};
  const maNaglowek: Record<string, boolean> = {};

  for (const w of wiersze) {
    if (!w || typeof w.on_date !== 'string' || w.on_date === '') continue;
    const dzien = w.on_date.slice(0, 10);

    // Nagłówek planu = jedyny dowód, że zawodnik plan PODAŁ.
    if (w.timetable_id != null) maNaglowek[dzien] = true;
    if (!(dzien in oknaDnia)) oknaDnia[dzien] = [];

    const poczatek = formatujGodzine(w.starts_at);
    const koniec = formatujGodzine(w.ends_at);
    // Okno bez którejkolwiek strony nie jest oknem. Nie zgadujemy drugiej.
    if (poczatek !== null && koniec !== null && poczatek < koniec) {
      oknaDnia[dzien].push({ poczatek, koniec });
    }
  }

  for (const dzien of Object.keys(oknaDnia)) {
    if (!maNaglowek[dzien]) {
      dni[dzien] = { stan: 'NIE_WIEM' };
      continue;
    }
    const okna = oknaDnia[dzien].slice().sort((a, b) => (a.poczatek < b.poczatek ? -1 : a.poczatek > b.poczatek ? 1 : 0));
    if (okna.length === 0) {
      dni[dzien] = { stan: 'WOLNE' };
      continue;
    }
    dni[dzien] = {
      stan: 'SZKOLA',
      okna,
      poczatek: okna[0].poczatek,
      koniec: okna.reduce((n, o) => (o.koniec > n ? o.koniec : n), okna[0].koniec),
    };
  }

  return { odczytany: true, dni };
}

/**
 * Stan jednego dnia. Dzień, którego w wyniku nie było, to NIE_WIEM —
 * nigdy WOLNE.
 */
export function oknoDnia(plan: PlanTygodnia | null | undefined, data: string): OknoDnia {
  if (!plan || typeof data !== 'string') return { stan: 'NIE_WIEM' };
  const znalezione = plan.dni[data.slice(0, 10)];
  return znalezione ?? { stan: 'NIE_WIEM' };
}

// ── ILE ZOSTAJE ────────────────────────────────────────────────────────────

/**
 * Ile minut dzieli koniec szkoły od godziny wydarzenia.
 *
 * ⚠️ `null`, GDY KTÓREJKOLWIEK STRONY NIE MA — nie zero.
 * Zero znaczy „zdążysz na styk" (wydarzenie zaczyna się dokładnie wtedy, kiedy
 * kończy się szkoła) i jest prawdziwą, policzoną odpowiedzią.
 * `null` znaczy „nie wiem" i jest brakiem odpowiedzi. Sklejenie tych dwóch
 * to ten sam błąd co sklejenie NIE_WIEM z WOLNE, tylko o piętro niżej.
 *
 * Wynik MOŻE BYĆ UJEMNY — wtedy wydarzenie zaczyna się, zanim skończy się
 * szkoła. To nie jest „ciasno", tylko kolizja; patrz `wykryjCiasno`.
 *
 * ⚠️ Zwracana liczba to RÓŻNICA SUROWA. Nie odejmujemy dojazdu, posiłku ani
 * rozgrzewki — baza nie zna żadnej z tych rzeczy, więc każda taka poprawka
 * byłaby liczbą wymyśloną i podaną zawodnikowi jako zmierzona.
 */
export function wolnyCzasPo(
  koniecSzkoly: string | null | undefined,
  godzinaWydarzenia: string | null | undefined,
): number | null {
  const a = godzinaWMinutach(koniecSzkoly);
  const b = godzinaWMinutach(godzinaWydarzenia);
  if (a === null || b === null) return null;
  return b - a;
}

// ── CIASNO ─────────────────────────────────────────────────────────────────

/**
 * NIE_WIEM — nie da się policzyć (brak planu albo brak godziny wydarzenia).
 * KOLIZJA  — wydarzenie zaczyna się PRZED końcem szkoły.
 * CIASNO   — policzone i okno nie większe niż `PROG_CIASNO_MINUT`.
 * LUZ      — policzone i okno większe niż próg, albo tego dnia nie ma szkoły.
 */
export type StanCiasno = 'NIE_WIEM' | 'KOLIZJA' | 'CIASNO' | 'LUZ';

export type WynikCiasno = {
  stan: StanCiasno;
  /** Surowa różnica w minutach albo `null`, gdy nie było czego liczyć. */
  minut: number | null;
  koniecSzkoly: string | null;
  godzinaWydarzenia: string | null;
  /**
   * Materiał na linię makiety „szkoła do 16:30, trening o 18:00".
   * `null`, gdy nie podano nazwy wydarzenia — rzeczownik jest brzmieniem
   * i ten moduł go nie wymyśla.
   */
  powod: string | null;
};

export function wykryjCiasno(
  okno: OknoDnia | null | undefined,
  godzinaWydarzenia: string | null | undefined,
  nazwaWydarzenia?: string | null,
): WynikCiasno {
  const godzina = formatujGodzine(godzinaWydarzenia);

  // Dzień bez planu — nie wiemy nic i nie wolno udawać, że wiemy.
  if (!okno || okno.stan === 'NIE_WIEM') {
    return { stan: 'NIE_WIEM', minut: null, koniecSzkoly: null, godzinaWydarzenia: godzina, powod: null };
  }

  // Dzień wolny — szkoła nic nie ściska. To NIE jest „nie wiem": zawodnik
  // powiedział, że tego dnia szkoły nie ma.
  if (okno.stan === 'WOLNE') {
    return { stan: 'LUZ', minut: null, koniecSzkoly: null, godzinaWydarzenia: godzina, powod: null };
  }

  // Jest szkoła, ale wydarzenie nie ma godziny — nie ma od czego liczyć.
  if (godzina === null) {
    return { stan: 'NIE_WIEM', minut: null, koniecSzkoly: okno.koniec, godzinaWydarzenia: null, powod: null };
  }

  const minut = wolnyCzasPo(okno.koniec, godzina);
  if (minut === null) {
    return { stan: 'NIE_WIEM', minut: null, koniecSzkoly: okno.koniec, godzinaWydarzenia: godzina, powod: null };
  }

  const powod = nazwaWydarzenia
    ? `szkoła do ${okno.koniec}, ${nazwaWydarzenia} o ${godzina}`
    : null;

  const stan: StanCiasno = minut < 0 ? 'KOLIZJA' : minut <= PROG_CIASNO_MINUT ? 'CIASNO' : 'LUZ';
  return { stan, minut, koniecSzkoly: okno.koniec, godzinaWydarzenia: godzina, powod };
}

// ── DZIEŃ TYGODNIA ─────────────────────────────────────────────────────────

/**
 * Numer dnia tygodnia w numeracji ISO-8601 (1 = poniedziałek … 7 = niedziela)
 * dla daty 'YYYY-MM-DD'.
 *
 * ⚠️ JEDYNE MIEJSCE W APPCE, W KTÓRYM WOLNO PRZELICZAĆ DZIEŃ TYGODNIA.
 * Baza liczy `extract(isodow from date)` → 1..7 z poniedziałkiem jako 1,
 * a JavaScript `Date.getDay()` → 0..6 z NIEDZIELĄ jako 0. Dwa różne układy
 * przy dwóch niezależnych przeliczeniach dają przesunięcie o jeden dzień,
 * którego nikt nie zauważy, dopóki nie zobaczy szkoły w niedzielę.
 *
 * ⚠️ Data rozbierana na części, NIE przez `new Date(tekst)` — `new Date('2026-08-10')`
 * czyta datę jako UTC i w strefie ujemnej cofa ją o jeden dzień.
 */
export function isoDzienTygodnia(data: string): number | null {
  if (typeof data !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  const js = d.getDay();          // 0 = niedziela
  return js === 0 ? 7 : js;       // 1 = poniedziałek … 7 = niedziela
}

/**
 * Zamiana planu na wiersze dla `set_school_timetable(p_slots jsonb, …)`.
 * Kolejność i nazwy pól są kontraktem z funkcją w bazie — nie zmieniać
 * bez zmiany migracji.
 *
 * PUSTA TABLICA JEST POPRAWNA i znaczy „podałem plan, nie mam szkoły w żaden
 * dzień". To jest coś innego niż brak planu i baza to rozróżnia (istnieje
 * nagłówek bez okien).
 */
export type OknoDoZapisu = { weekday: number; starts_at: string; ends_at: string };

export function zbudujOknaDoZapisu(
  dni: Array<{ weekday: number; od: string; do_: string }>,
): { ok: true; okna: OknoDoZapisu[] } | { ok: false; powod: string } {
  const okna: OknoDoZapisu[] = [];
  for (const d of dni) {
    if (!Number.isInteger(d.weekday) || d.weekday < 1 || d.weekday > 7) {
      return { ok: false, powod: 'Dzień tygodnia musi być liczbą od 1 (poniedziałek) do 7 (niedziela).' };
    }
    // ⚠️ NAJPIERW PUSTKA, DOPIERO POTEM FORMAT — kolejność ma znaczenie
    // i znalazł to strażnik. Pierwsza wersja pytała najpierw o format i uznawała
    // „obie godziny nie do odczytania" za dzień wolny: zawodnik wpisywał „25:00"
    // i appka po cichu zapisywała, że tego dnia nie ma szkoły. To jest cichy
    // brak — wpis zniknął, a produkt zapamiętał deklarację, której nikt nie złożył.
    const odSurowe = typeof d.od === 'string' ? d.od.trim() : '';
    const doSurowe = typeof d.do_ === 'string' ? d.do_.trim() : '';
    // Oba pola puste = „tego dnia nie mam szkoły". To jest deklaracja, nie brak.
    if (odSurowe === '' && doSurowe === '') continue;

    const od = formatujGodzine(odSurowe);
    const doG = formatujGodzine(doSurowe);
    if (od === null || doG === null) {
      return {
        ok: false,
        powod: 'Podaj obie godziny w formacie 8:00 — albo zostaw cały dzień pusty, jeśli nie masz wtedy szkoły.',
      };
    }
    if (od >= doG) {
      return { ok: false, powod: 'Godzina zakończenia musi być późniejsza niż rozpoczęcia.' };
    }
    okna.push({ weekday: d.weekday, starts_at: od, ends_at: doG });
  }
  return { ok: true, okna };
}
