// PLAN-D-A2 08.2026 (16.08.2026) — NOWY PLIK. Zadanie A2.2, decyzja D4.
//
// WEJŚCIA PRODUCENTA WGLĄDÓW — JEDNO MIEJSCE, DWA EKRANY.
//
// ═════════════════════════════════════════════════════════════════════
// PO CO TEN PLIK ISTNIEJE
//
// Do 16.08.2026 sześć wejść `policzWglady()` powstawało WYŁĄCZNIE wewnątrz
// `load()` w `app/(tabs)/dzis.tsx` (sekcja „WEJŚCIA WGLĄDÓW", linie 1643–1707
// przed tym pasem), razem z pięcioma funkcjami mapującymi i dwoma typami
// wierszy. Zmierzone przed pasem A2:
//
//   grep -rn "policzWglady(" app components   →   1   (tylko `dzis.tsx`)
//   grep -rn "ulozKolejke("  app components   →   2   (`dzis.tsx`, `ListaZadan.tsx`)
//
// Czyli: TA SAMA kolejka, dwa ekrany — i tylko jeden z nich widział wglądy.
// Ekran „Moje zadania" pokazywał zawodnikowi z tych samych danych 1 pozycję
// zamiast 3 (pomiar A2.1 na zawodniku 8d7e1ebb…, 17.08.2026).
//
// ⛔ SKOPIOWANIE TAMTEJ SEKCJI DO `ListaZadan.tsx` BYŁO ROZWAŻONE I ODRZUCONE.
// Dałoby DWA CZYTNIKI tej samej rzeczy: dwie listy kolumn, dwie konwersje
// `created_at → dzień`, dwie gałęzie „nie odczytałem". Pierwsza zmiana
// w którymkolwiek z nich rozjeżdża ekrany po cichu — a rozjazd, którego nie
// widać, jest dokładnie tym defektem, który ten pas usuwa (O92).
//
// ⛔ CZEGO TU NIE MA I MIEĆ NIE BĘDZIE
//   • ani jednego importu Supabase — ten plik NIE PYTA bazy. Wydaje NAZWY
//     tabel i LISTY KOLUMN, a zapytanie składa ekran, swoim klientem, w swojej
//     paczce `Promise.all`. Dzięki temu wglądy nie kosztują ANI JEDNEJ nowej
//     rundy sieci na ekranie, który te odpowiedzi i tak już ma;
//   • ani jednego importu Reacta i ani jednego odczytu zegara —
//     `zbudujWejsciaWgladow()` jest czystą funkcją i strażnik uruchamia ją
//     wprost, zamiast czytać ekran jako tekst;
//   • ani jednego `?? []` i ani jednego `|| []`. Producent wglądów rozróżnia
//     `brak_danych` („odczytałem, nie ma z czego policzyć") od `nie_wiem`
//     („nie odczytałem, wgląd MÓGŁBY istnieć"). To rozróżnienie ginie
//     w całości, jeżeli wołający sklei je tutaj — i ginie CICHO.
//
// ⚠️ DLACZEGO OSOBNE MAPOWANIA OD TYCH, KTÓRYMI KARMIONY JEST RANKER.
// Powód przeniesiony CO DO ZNAKU z `dzis.tsx`: ranker i producent wglądów
// potrzebują RÓŻNYCH pól z tych samych wierszy (ranker chce energii, wgląd
// chce identyfikatora wiersza i miejsca bólu). Jedna wspólna funkcja musiałaby
// oddawać sumę obu kształtów, więc każde nowe pole jednego z nich lądowałoby
// po cichu w drugim.
// ═════════════════════════════════════════════════════════════════════
import { toLocalDateStr } from './date-utils';
import { powodBledu, wejscieZOdpowiedzi } from './listaZadan';
import type { Wejscie } from './kolejkaPodania';
import type { WierszMeczu } from './nagrodaZaPrace';
import type {
  WejsciaWgladow,
  WpisDziennikaWglad,
  WydarzenieWglad,
  PowiazanieWpisu,
  WpisBoluWglad,
  WpisMeczuWglad,
  ProfilWglad,
} from './wgladyZAlgorytmu';

// ─────────────────────────────────────────────────────────────────────
// 1. WIERSZE BAZY, W KSZTAŁCIE, W JAKIM WRACAJĄ
// ─────────────────────────────────────────────────────────────────────

/** Wiersz `daily_logs`. Ten sam kształt, którym karmiony jest ranker. */
export type WierszDziennikaWgl = {
  id: number;
  entry_type: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  calendar_event_id: number | null;
};

/** Wiersz `calendar_events`. */
export type WierszWydarzeniaWgl = {
  id: number;
  title: string;
  event_type: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  recurrence_rule: string | null;
  focus_block_id: string | null;
};

/**
 * Wiersz `pain_entries`.
 * ⚠️ `body_location` jest w bazie NOT NULL (zmierzone 14.08.2026 na
 * `information_schema.columns`), więc typ jest `string`, a nie `string | null`
 * — pole zastępcze („nieznane miejsce") byłoby zmyśleniem.
 */
export type WierszBoluWgl = {
  id: number;
  body_location: string;
  intensity: number | null;
  excludes_from_training: boolean | null;
  created_at: string;
};

/**
 * ⭐ Wiersz kaskady meczowej (WG-30, WG-34).
 * ⚠️ ZMIERZONE 14.08.2026 i potwierdzone 17.08.2026: `match_contexts` ma
 * 2 wiersze, OBA z 29.07.2026. Próg osi to trzy mecze, więc dziś ten wgląd
 * oddaje `brak_danych` z powodem. To jest oczekiwane — wiersza „na próbę"
 * nikt nie dokłada (Z0).
 */
export type WierszMeczuWgl = {
  id: number;
  created_at: string;
  match_rpe: number | null;
  entered_recovery_state: string | null;
  /**
   * ⭐ PLAN-D-W1 17.08.2026 — minuty NA BOISKU. `null` = nie wiemy (R5).
   * ⚠️ Do 18.08.2026 kolumna była w `SELECT_MECZOW`, ale NIE BYŁO JEJ W TYM
   * TYPIE ani w żadnym mapowaniu — czyli baza ją oddawała, a produkt ją
   * wyrzucał. To jest ten sam kształt defektu, który pas D8 usuwa niżej.
   */
  minutes_played: number | null;
  /**
   * ⭐ PLAN-D-D8 18.08.2026 — DŁUGOŚĆ CAŁEGO MECZU (mianownik wagi).
   * ⛔ `match_contexts` NIE MA relacji z `calendar_events` (zmierzone
   * 18.08.2026), więc długość meczu MUSI być własną kolumną tej tabeli —
   * nie da się jej odczytać z `planned_minutes`. `null` = nie wiemy;
   * `wagaMeczu()` podstawia wtedy 90 jako DECYZJĘ PRODUKTOWĄ, nie pomiar.
   */
  match_length_minutes: number | null;
  /**
   * ⭐⭐ PLAN-D-D2 19.08.2026 — WYSTĄPIENIE, KTÓREGO TEN WIERSZ DOTYCZY.
   * ⛔ `null` = wiersz sprzed migracji albo zapis bez sprawdzonego właściciela
   * wydarzenia. Taki wiersz LICZY SIĘ NADAL i nie pochłania niczego (R5).
   */
  calendar_event_id: number | null;
};

/** Jedyna kolumna katalogu podpowiedzi, jakiej WT-26 potrzebuje. */
export type WierszKataloguWgl = { min_age: number | null };

// ─────────────────────────────────────────────────────────────────────
// 2. NAZWY TABEL I LISTY KOLUMN — ⛔ JEDNO ŹRÓDŁO DLA OBU EKRANÓW
// ─────────────────────────────────────────────────────────────────────
// ⚠️ TO NIE JEST OZDOBNIK. Gdyby każdy ekran trzymał własny napis
// `'id,created_at,match_rpe,entered_recovery_state'`, dołożenie kolumny
// w jednym miejscu dałoby na drugim ekranie `nie_wiem` z komunikatu PostgREST
// — albo, gorzej, cichy brak pola. Nazwa tabeli i lista kolumn to jedna rzecz
// i mieszka w jednym miejscu (O92).

/** Kaskada meczowa (WG-30, WG-34). */
export const TABELA_MECZOW = 'match_contexts';
// ⭐ PLAN-D-W1 17.08.2026 — doszło `minutes_played`. Kolumna istniała od dawna
// (CHECK 0–130) i była WYRZUCANA: waga meczu liczyła się bez minut na boisku,
// więc dziesięciominutowe wejście ważyło tyle, co pełne 90 minut.
// ⚠️ To jest ROZSZERZENIE istniejącego zapytania, nie nowe zapytanie.
//
// ⭐⭐ PLAN-D-D8 18.08.2026 — doszło `match_length_minutes`, i to jest POŁOWA
// tego pasa. ⛔ ZMIERZONE PRZED ZMIANĄ: kolumna powstała na produkcji 18.08,
// ekran meczu ją zapisywał, a TA LISTA jej nie czytała — więc `wagaMeczu()`
// dostawała `null` i podstawiała 90 ZAWSZE. Skutek dla zawodnika U13, który
// zagrał pełne 60 minut meczu 60-minutowego: 3 punkty zamiast 4, czyli kara
// za to, że jego mecz jest krótszy. ⛔ Pole zapisane i nigdy nieodczytane
// wygląda dokładnie jak pole, którego nie ma — z tą różnicą, że nikt go nie szuka.
//
// ⭐⭐ PLAN-D-D2 19.08.2026 — doszło `calendar_event_id`, i to jest cały ten pas.
// ⛔ ZMIERZONE: bez tej kolumny w zapytaniu `jednostkiZMeczow()` nie ma czym
// zestawić wiersza meczu z wydarzeniem, więc jeden mecz liczy się DWA RAZY
// (7 punktów zamiast 4). Kolumna założona na produkcji 19.08.2026.
export const SELECT_MECZOW =
  'id,created_at,match_rpe,entered_recovery_state,minutes_played,match_length_minutes,calendar_event_id';

/**
 * ⭐ KOLUMNY, KTÓRYCH MAPOWANIE NAPRAWDĘ UŻYWA — wyprowadzone z `SELECT_MECZOW`,
 * nie przepisane obok niego.
 *
 * ⛔ PO CO TO ISTNIEJE. Strażnik, który czyta napis `SELECT_MECZOW` i porównuje
 * go z własną listą, dowodzi tylko tego, że dwa napisy są zgodne. Ta stała
 * pozwala sprawdzić rzecz o jeden stopień prawdziwszą: że każda kolumna,
 * po którą sięga `meczDlaNagrody()`, JEST w zapytaniu — a więc że rozszerzenie
 * typu naprawdę się zastosowało, a nie tylko zostało napisane.
 */
export const KOLUMNY_MECZOW: readonly string[] = SELECT_MECZOW.split(',');

/**
 * Rocznik zawodnika (WT-26). JEDYNE źródło wieku, jakie appka ma
 * (`app/(tabs)/profil.tsx`, etap 0 kreatora).
 */
export const TABELA_PROFILU = 'users';
export const SELECT_PROFILU = 'birth_year';

/**
 * Katalog podpowiedzi (WT-26).
 *
 * ⛔ FILTR ODBIORCY JEST OBOWIĄZKOWY I NIE JEST OSTROŻNOŚCIĄ. Bez
 * `odbiorca in ('zawodnik','oba')` wgląd powiedziałby zawodnikowi, że traci
 * 18 podpowiedzi — a wszystkie 18 bramkowanych wiekiem ma `odbiorca='rodzic'`
 * i NIGDY by ich nie zobaczył (znalezisko 10.9 noty B3, potwierdzone
 * zapytaniem 14.08.2026: 0 z 274). To byłaby nieprawda o zawodniku przy
 * zielonych testach, czyli dokładnie to, czego zakazuje Z0.
 */
export const TABELA_KATALOGU = 'component_hints';
export const SELECT_KATALOGU = 'min_age';
export const KOLUMNA_ODBIORCY = 'odbiorca';
export const ODBIORCY_KATALOGU: readonly string[] = ['zawodnik', 'oba'];

/**
 * Odcinki Mapy drogi (WT-26).
 * ⚠️ Wołane z `count: 'exact'` i `head: true`, więc NIE ŚCIĄGA ANI JEDNEGO
 * WIERSZA. Trzeciej liczby katalogu NIE DA SIĘ dołożyć do zapytania wyżej:
 * `road_segments` nie ma relacji z `component_hints`, a PostgREST nie łączy
 * tabel, między którymi relacji nie ma.
 */
export const TABELA_ODCINKOW = 'road_segments';
export const SELECT_ODCINKOW = 'id';

// ─────────────────────────────────────────────────────────────────────
// 3. MAPOWANIE WIERSZ BAZY → WEJŚCIE PRODUCENTA WGLĄDÓW
// ─────────────────────────────────────────────────────────────────────

function liczbaAlboNull(x: unknown): number | null {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

export function wpisDziennikaDlaWgladu(w: WierszDziennikaWgl): WpisDziennikaWglad {
  const p: Record<string, unknown> = w.payload && typeof w.payload === 'object' ? w.payload : {};
  return {
    idWiersza: String(w.id),
    dzien: toLocalDateStr(new Date(w.created_at)),
    // ⚠️ Wiersz `morning` niesie `sleep_hours`, wiersz `post_training` niesie
    // `rpe` — NIGDY oba naraz. `null` w jednym z tych pól nie jest brakiem
    // danych, tylko informacją, o czym ten wiersz jest.
    senGodziny: liczbaAlboNull(p.sleep_hours),
    rpe: liczbaAlboNull(p.rpe),
  };
}

/**
 * ⛔ `mood_motivation` NIE PRZECHODZI TĘDY I PRZECHODZIĆ NIE MA. Decyzja B3-b
 * (nota B3 §4.1): granica B1 biegnie po SKUTKU, a zdanie zbudowane na tym
 * kluczu jest o jedną zmianę nazwy zmiennej od zdania o nastroju. Producent
 * wglądów nie ma dla niego pola i to jest jedyna wersja tej granicy, której
 * nie da się przekroczyć przez przypadek.
 */
export function powiazanieDlaWgladu(w: WierszDziennikaWgl): PowiazanieWpisu {
  return {
    idWpisu: String(w.id),
    // ⚠️ `null` znaczy „ten wpis nie wskazuje żadnego wydarzenia" i JEST DZIŚ
    // stanem 10 z 10 (zmierzone 14.08.2026). Producent policzy z tego
    // `brak_danych`, a nie licznik „0 z 6" — bo to byłaby nieprawda o zawodniku.
    idWydarzenia: w.calendar_event_id === null ? null : String(w.calendar_event_id),
  };
}

export function wydarzenieDlaWgladu(e: WierszWydarzeniaWgl): WydarzenieWglad {
  return {
    id: String(e.id),
    dzien: e.scheduled_date,
    rodzaj: e.event_type,
    status: e.status,
    tytul: e.title,
  };
}

export function wpisBoluDlaWgladu(w: WierszBoluWgl): WpisBoluWglad {
  return {
    idWiersza: String(w.id),
    dzien: toLocalDateStr(new Date(w.created_at)),
    // ⚠️ KLUCZ MASZYNOWY, nie brzmienie. Nazwę miejsca dobiera producent
    // z istniejącej mapy `lib/labels.ts`, a klucza spoza mapy NIE ZGADUJE.
    miejsce: w.body_location,
    intensywnosc: liczbaAlboNull(w.intensity) ?? 0,
    wykluczaZTreningu: w.excludes_from_training === true,
  };
}

/**
 * ⭐⭐ PLAN-D-D8 18.08.2026 — WIERSZ `match_contexts` → WIERSZ LICZNIKA PRACY.
 *
 * ⛔ PO CO OSOBNA FUNKCJA, SKORO WCZEŚNIEJ WYSTARCZAŁA RZUTKA. Ekran „Dziś"
 * robił do 18.08 `meczeRes.data as unknown as WierszMeczu[]`. Rzutka nie
 * przemianowuje pól: `match_length_minutes` z bazy NIGDY nie stało się
 * `dlugoscMeczu`, którego szuka `jednostkiZMeczow()`. Kompilator tego nie
 * łapie (rzutka przez `unknown` wyłącza sprawdzanie), testy tego nie łapią
 * (w czasie wykonania właściwość po prostu nie istnieje i wychodzi `null`),
 * a zawodnik widzi liczbę policzoną z założonych 90 minut.
 * ⭐ To jest CAŁY powód, dla którego ta funkcja istnieje: przemianowanie ma
 * być JEDNYM miejscem, które da się uruchomić w strażniku.
 *
 * ⛔ `dlugoscMeczu` NIE MA WARTOŚCI ZASTĘPCZEJ. Brak długości to „nie wiemy",
 * a nie „90" — dziewięćdziesiątkę podstawia dopiero `wagaMeczu()` i robi to
 * jawnie, jako decyzję produktową (R5, Z0).
 */
export function meczDlaNagrody(w: WierszMeczuWgl): WierszMeczu {
  return {
    id: w.id,
    created_at: w.created_at,
    minutes_played: liczbaAlboNull(w.minutes_played),
    dlugoscMeczu: liczbaAlboNull(w.match_length_minutes),
    match_rpe: liczbaAlboNull(w.match_rpe),
    // ⭐⭐ PLAN-D-D2 — bez tego przemianowania kolumna jest w zapytaniu
    // i wypada w mapowaniu, czyli wygląda dokładnie jak kolumna, której nie ma.
    calendar_event_id: liczbaAlboNull(w.calendar_event_id),
  };
}

/**
 * ⭐⭐ PLAN-D-D2 19.08.2026 — WYSTĄPIENIE → WIERSZ `match_contexts`.
 *
 * ⛔ PO CO TO ISTNIEJE (§4.3 polecenia D2). Do 19.08 mapa „które wystąpienie
 * ma który wiersz meczu" żyła WYŁĄCZNIE w stanie ekranu, więc po restarcie
 * aplikacji ten sam mecz oceniony ponownie zakładał DRUGI wiersz — produkt
 * nie miał czym odnaleźć wiersza, który sam założył. Od dziś odnajduje go
 * po `calendar_event_id`, czyli w bazie, a nie w pamięci ekranu.
 *
 * ⚠️ Wiersze bez `calendar_event_id` NIE WCHODZĄ do mapy i to nie jest
 * przeoczenie: nie ma po czym ich odnaleźć, a wpisanie ich pod jakimkolwiek
 * kluczem znaczyłoby przypisanie cudzego meczu do wystąpienia (Z0).
 */
export function mapaWierszyMeczuPoWydarzeniu(
  wiersze: readonly WierszMeczuWgl[],
): Map<number, number> {
  const out = new Map<number, number>();
  for (const w of wiersze) {
    if (!w || typeof w.id !== 'number' || !Number.isFinite(w.id)) continue;
    const e = liczbaAlboNull(w.calendar_event_id);
    if (e === null) continue;
    // ⛔ Pierwszy wygrywa — unikalny indeks częściowy pilnuje, że drugiego nie ma.
    if (!out.has(e)) out.set(e, w.id);
  }
  return out;
}

export function meczDlaWgladu(w: WierszMeczuWgl): WpisMeczuWglad {
  return {
    idWiersza: String(w.id),
    dzien: toLocalDateStr(new Date(w.created_at)),
    ciezkosc: liczbaAlboNull(w.match_rpe),
    stanWejscia: typeof w.entered_recovery_state === 'string' ? w.entered_recovery_state : null,
  };
}

// ─────────────────────────────────────────────────────────────────────
// 4. SIEDEM ODPOWIEDZI BAZY → SZEŚĆ WEJŚĆ, KAŻDE W TRZECH STANACH
// ─────────────────────────────────────────────────────────────────────

/** Surowa odpowiedź `supabase-js`. ⚠️ CAŁA, razem z `error`. */
export type OdpowiedzBazy = { data: unknown; error: unknown };

/** Odpowiedź z `count: 'exact', head: true` — `count` bywa `null`. */
export type OdpowiedzLicznika = { count: number | null; error: unknown };

/**
 * ⚠️ SIEDEM ODPOWIEDZI, NIE SIEDEM ZAPYTAŃ. Cztery z nich (`dziennik`,
 * `kalendarz`, `bol` oraz drugi przebieg `dziennik` na powiązania) ekran
 * i tak już ma dla rankera. Nowe są trzy: mecze, katalog, odcinki — plus
 * `profil`, który na „Dziś" karmi także bramkę wiekową.
 */
export type OdpowiedziWgladow = {
  dziennikRes: OdpowiedzBazy;
  wydarzeniaRes: OdpowiedzBazy;
  bolRes: OdpowiedzBazy;
  meczeRes: OdpowiedzBazy;
  profilRes: OdpowiedzBazy;
  katalogRes: OdpowiedzBazy;
  odcinkiRes: OdpowiedzLicznika;
};

/**
 * ⭐ JEDYNE MIEJSCE W PRODUKCIE, KTÓRE BUDUJE WEJŚCIA `policzWglady()`.
 *
 * ⛔ `dzis` tu nie stoi i stać nie będzie: bierze się z `wejscia.dzis` kolejki,
 * żeby ranker i producent wglądów nie mogły dostać DWÓCH RÓŻNYCH dni.
 * Jeden napis, jedno źródło.
 */
export function zbudujWejsciaWgladow(o: OdpowiedziWgladow): Omit<WejsciaWgladow, 'dzis'> {
  const dziennik: Wejscie<WpisDziennikaWglad[]> =
    wejscieZOdpowiedzi<WierszDziennikaWgl, WpisDziennikaWglad>(
      o.dziennikRes, 'dziennik (wglądy)', wpisDziennikaDlaWgladu,
    );

  const powiazania: Wejscie<PowiazanieWpisu[]> =
    wejscieZOdpowiedzi<WierszDziennikaWgl, PowiazanieWpisu>(
      o.dziennikRes, 'powiązania wpisów', powiazanieDlaWgladu,
    );

  const kalendarz: Wejscie<WydarzenieWglad[]> =
    wejscieZOdpowiedzi<WierszWydarzeniaWgl, WydarzenieWglad>(
      o.wydarzeniaRes, 'kalendarz (wglądy)', wydarzenieDlaWgladu,
    );

  const bol: Wejscie<WpisBoluWglad[]> =
    wejscieZOdpowiedzi<WierszBoluWgl, WpisBoluWglad>(o.bolRes, 'ból (wglądy)', wpisBoluDlaWgladu);

  const mecze: Wejscie<WpisMeczuWglad[]> =
    wejscieZOdpowiedzi<WierszMeczuWgl, WpisMeczuWglad>(o.meczeRes, 'mecze', meczDlaWgladu);

  const profil: Wejscie<ProfilWglad> = zbudujProfilWgladu(o);

  return { dziennik, powiazania, kalendarz, bol, mecze, profil };
}

/**
 * PROFIL — TRZY ODPOWIEDZI, JEDNO WEJŚCIE, TRZY STANY.
 *
 * ⚠️ Błąd KTÓREJKOLWIEK z nich znaczy „nie wiem, ile Cię kosztuje brak
 * rocznika", a NIE „nic Cię nie kosztuje". Różnica jest cała: przy zerowym
 * skutku wgląd świadomie NIE POWSTAJE (nota B3 §3, wgląd 6), więc sklejenie
 * błędu z zerem uciszyłoby go tak samo skutecznie — tylko po cichu.
 *
 * Stoi osobno, a nie w środku `zbudujWejsciaWgladow()`, bo to jedyne wejście,
 * które NIE jest listą i nie przechodzi przez `wejscieZOdpowiedzi` — więc jako
 * jedyne musi sprawdzić `error` ręcznie, trzy razy.
 */
export function zbudujProfilWgladu(o: OdpowiedziWgladow): Wejscie<ProfilWglad> {
  if (o.profilRes.error) return { rodzaj: 'nie_wiem', powod: `profil: ${powodBledu(o.profilRes.error)}` };
  if (o.katalogRes.error) {
    return { rodzaj: 'nie_wiem', powod: `katalog podpowiedzi: ${powodBledu(o.katalogRes.error)}` };
  }
  if (o.odcinkiRes.error) {
    return { rodzaj: 'nie_wiem', powod: `odcinki Mapy drogi: ${powodBledu(o.odcinkiRes.error)}` };
  }
  if (!Array.isArray(o.katalogRes.data)) {
    return { rodzaj: 'nie_wiem', powod: 'katalog podpowiedzi: odpowiedź bazy nie jest listą' };
  }
  // ⚠️ `count` z `head: true` bywa `null`, gdy PostgREST nie odda nagłówka.
  // `null` to „nie policzyłem", a nie „zero odcinków" — a te dwie rzeczy dają
  // PRZECIWNE wglądy (przy zerze odcinków rocznik nie zmienia nic).
  if (typeof o.odcinkiRes.count !== 'number') {
    return { rodzaj: 'nie_wiem', powod: 'odcinki Mapy drogi: baza nie oddała licznika' };
  }
  const katalog = o.katalogRes.data as unknown as WierszKataloguWgl[];
  return {
    rodzaj: 'jest',
    dane: {
      rokUrodzenia: rocznikZOdpowiedzi(o.profilRes),
      podpowiedziZaBramkaWieku: katalog.filter((r) => r.min_age !== null).length,
      podpowiedziRazem: katalog.length,
      odcinkowMapyDrogi: o.odcinkiRes.count,
    },
  };
}

/**
 * Rocznik z odpowiedzi `users`. ⚠️ TA SAMA funkcja karmi na „Dziś" bramkę
 * wiekową A9 — jedno źródło rocznika, więc bramka i wgląd nie mogą się
 * rozjechać. Błąd odczytu daje `null`, czyli „appka nie zna wieku", czyli
 * bramka zamknięta. Nie ma tu cichego fallbacku „załóżmy, że dorosły".
 */
export function rocznikZOdpowiedzi(profilRes: OdpowiedzBazy): number | null {
  if (profilRes.error) return null;
  if (!Array.isArray(profilRes.data)) return null;
  const w = profilRes.data[0] as { birth_year: number | null } | undefined;
  return w && typeof w.birth_year === 'number' ? w.birth_year : null;
}
