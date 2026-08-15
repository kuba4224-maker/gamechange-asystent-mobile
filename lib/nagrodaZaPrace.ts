// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-C4 08.2026 (15.08.2026) — NAGRODA ZA WYKONANĄ PRACĘ.
//
// Ten plik odpowiada na JEDNO pytanie: ILE PRACY TEN ZAWODNIK WYKONAŁ —
// łącznie, od początku, i co mu z tego przysługuje.
// Zero Reacta, zero Supabase, zero zegara. ⭐ ZERO DAT W ARYTMETYCE.
//
// ── ⛔ ZAKAZ, KTÓRY JEST CAŁĄ TREŚCIĄ TEGO PLIKU ────────────────────
// ŻADNEJ SERII DNI Z RZĘDU. ŻADNEJ NAGRODY ZA SAMO POJAWIENIE SIĘ.
// ŻADNEGO LICZNIKA, KTÓRY WRACA DO ZERA.
//
// Powód jest zmierzony, nie światopoglądowy. Nagroda za samo zaangażowanie:
// **d = −0,40** na motywację wewnętrzną (Deci 1999), najsilniej **u dzieci**.
// Jeden opuszczony dzień obniża automatyzm nawyku o **0,29 punktu** i nawyku
// NIE PRZERYWA — więc licznik wracający do zera mówi zawodnikowi nieprawdę
// o tym, jak powstaje nawyk. To jest złamanie Z0 przy zielonych testach.
// Zasada: `claude/ZASADY_OBOWIAZUJACE_13_08_2026.md`, **N1**.
//
// ── ⭐ JAK TEN ZAKAZ STAŁ SIĘ KSZTAŁTEM KODU, A NIE DYSCYPLINĄ ──────
// Reguła „nie karzemy za przerwę" jest nie do złamania, jeżeli funkcja
// NIE MA CZYM zmierzyć przerwy. Dlatego `JednostkaPracy` **nie niesie daty**.
// Daty wchodzą do tego pliku wyłącznie przez czytniki z §3 i są tam
// odrzucane — w JEDNYM, nazwanym miejscu, które da się pokazać palcem.
// Poniżej tej granicy nie istnieje nic, czym dałoby się policzyć „ile dni
// temu" ani „ile dni z rzędu”, więc kolejna sesja nie musi o tym pamiętać.
//
// ── ⭐ DLACZEGO ODZNAKI SĄ WYLICZANE, A NIE PRZECHOWYWANE ───────────
//   wykonana praca (wiersze, które JUŻ SĄ w bazie) → czysta funkcja → odznaki
// Licznika przechowywanego można nie zwiększyć albo wyzerować — wyliczanego
// nie. Odznaka wyliczona nigdy nie rozjedzie się z prawdą; przechowywana
// rozjeżdża się przy pierwszym błędzie zapisu i wtedy appka twierdzi coś
// o dziecku, czego nie ma w danych. Zero tabel, zero migracji, zero blokady.
//
// ── ⭐ CO TEN LICZNIK LICZY, A CZEGO NIE LICZY LICZNIK PASA D1 ──────
// `lib/wykonanieSesji.ts` odpowiada na pytanie o WYSTĄPIENIE: „czy TA sesja
// we wtorek się odbyła". Musi więc znać wiersz kalendarza i datę, i słusznie
// odmawia, gdy ich nie ma.
// TEN plik odpowiada na pytanie o PRACĘ: „ile jej wykonałeś". Praca zapisana
// w Dzienniku jako trening o RPE 6 i 90 minutach JEST wykonaną pracą, nawet
// jeżeli nikt nie wie, do którego wiersza kalendarza ją przypiąć.
// ⭐ To jest dokładnie ta różnica, dzięki której licznik skumulowany może być
// uczciwy tam, gdzie licznik okna być nie może.
//
// ── ⛔ ZMIERZONE 15.08.2026 NA PRODUKCJI — DLACZEGO TO NIE JEST TEORIA
// `session_verdicts` istnieje i ma **0 wierszy** · `calendar_events` ze
// `status='completed'`: **0 z 24** · `daily_logs.calendar_event_id`: **0 z 10**.
// Appka nie ma dziś ANI JEDNEGO dowodu, że jakakolwiek zaplanowana sesja się
// odbyła. Gdyby ten plik liczył wyłącznie sesje, oddałby zero każdemu — czyli
// powiedziałby dzieciom, które coś robiły, że nie zrobiły nic.
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// 1. ⚠️ PROGI I WAGI — WSZYSTKIE **DO PRZEJRZENIA PRZEZ KUBĘ**
// ═══════════════════════════════════════════════════════════════════
//
// ⛔ ŻADNA Z TYCH LICZB NIE MA ZA SOBĄ BADANIA I ŻADNA NIE UDAJE, ŻE MA.
// To jest skala trudności i brzmienie — czyli decyzja produktowa, nie pomiar.
// Wszystkie stoją w JEDNEJ tabeli, więc zmiana każdej to jedna linia.
// Komplet do decyzji zebrany w nocie `PRZEKAZANIE_PAS_C4_15_08_2026.md` §9.

import type { WejscieWerdyktow } from './wykonanieSesji';

export const BRZMIENIE_DO_PRZEJRZENIA_C4 = 'DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-C4, 15.08.2026)';

/**
 * Rodzaje pracy, którą produkt NAPRAWDĘ zapisuje. ⛔ Nie ma tu niczego, czego
 * appka mogłaby zapisywać — tylko to, co ma dziś wiersz w bazie.
 */
export type RodzajPracy =
  /** Wystąpienie z DOWODEM wykonania (werdykt zawodnika · `completed` · wpis wskazujący tę pozycję). */
  | 'sesja_z_dowodem'
  /** Wpis w Dzienniku niosący POMIAR obciążenia (RPE i/lub czas trwania). */
  | 'wpis_potreningowy'
  /** Pozostały wpis w Dzienniku (poranny, samopoczucie, sen). */
  | 'wpis_dziennika'
  /** Odpowiedź na pytanie kontrolne Bloku Skupienia. */
  | 'odpowiedz_kontrolna'
  /** Zapisany mecz. */
  | 'mecz';

/**
 * ⚠️ WAGI — DO PRZEJRZENIA PRZEZ KUBĘ. Uzasadnienie przy każdej.
 *
 * Powód, dla którego wagi w ogóle istnieją: bez nich dziesięć porannych wpisów
 * o śnie wygląda w liczniku identycznie jak dziesięć odbytych treningów, a to
 * jest nagroda za obecność przebrana za nagrodę za pracę (N1).
 */
export const WAGI_PRACY: Readonly<Record<RodzajPracy, number>> = {
  /** 3 — sesja z dowodem jest jednostką, o którą chodzi w całym produkcie. */
  sesja_z_dowodem: 3,
  /** 3 — mecz jest najcięższą jednostką obciążenia w tygodniu zawodnika. */
  mecz: 3,
  /** 2 — wpis z pomiarem obciążenia: praca WYKONANA i DOMKNIĘTA liczbą. */
  wpis_potreningowy: 2,
  /** 2 — odpowiedź kontrolna: to samo domknięcie, po stronie Bloku Skupienia. */
  odpowiedz_kontrolna: 2,
  /** 1 — najmniejsza policzalna praca. Jest pracą (bez niej reszty nie da się
   *  zmierzyć), ale nie może ważyć tyle, co trening. */
  wpis_dziennika: 1,
};

/** Miara, w której wyrażony jest próg. ⛔ Żadna z nich nie jest jednostką czasu. */
export type MiaraProgu = 'punkty' | 'odpowiedzi_kontrolne' | 'punkty_w_celu';

export type OdznakaId =
  | 'pierwsza'
  | 'dziesiec'
  | 'trzydziesci'
  | 'siedemdziesiat_piec'
  | 'sto_piecdziesiat'
  | 'odpowiedz_kontrolna'
  | 'praca_w_celu';

export type Prog = {
  id: OdznakaId;
  /** ⚠️ BRZMIENIE — DO PRZEJRZENIA PRZEZ KUBĘ. */
  nazwa: string;
  /** ⚠️ BRZMIENIE — DO PRZEJRZENIA PRZEZ KUBĘ. Jedno zdanie: ZA JAKĄ PRACĘ. */
  zaJakaPrace: string;
  miara: MiaraProgu;
  /** ⛔ Musi być ≥ 1. Próg zerowy byłby nagrodą za samo pojawienie się. */
  prog: number;
  /** Dlaczego akurat tyle. ⛔ Nie jest to liczba z badania i nie udaje, że jest. */
  uzasadnienieProgu: string;
};

/**
 * ⭐ TABELA PROGÓW. **Wszystkie nazwy i wszystkie zdania: DO PRZEJRZENIA PRZEZ KUBĘ.**
 *
 * ⛔ Kolejność ma znaczenie: `nastepnyProg` bierze PIERWSZY niezdobyty z tej
 * listy, więc lista jest posortowana rosnąco w obrębie każdej miary.
 *
 * ⛔ NIE MA TU ANI JEDNEGO PROGU WYRAŻONEGO W DNIACH, TYGODNIACH ANI
 * W CZYMKOLWIEK, CO MIJA SAMO. Każdy próg da się pokonać wyłącznie pracą.
 */
export const PROGI: readonly Prog[] = [
  {
    id: 'pierwsza',
    nazwa: 'Pierwsza zapisana praca',
    zaJakaPrace: 'Za pierwszą rzecz, którą zrobiłeś i zapisałeś.',
    miara: 'punkty',
    prog: 1,
    uzasadnienieProgu: 'Najniższy możliwy próg z pokryciem w pracy. Zero byłoby nagrodą za wejście.',
  },
  {
    id: 'dziesiec',
    nazwa: '10 punktów pracy',
    zaJakaPrace: 'Za dziesięć punktów wykonanej i zapisanej pracy.',
    miara: 'punkty',
    prog: 10,
    uzasadnienieProgu: 'Około tygodnia realnej pracy przy trzech sesjach i wpisach. Decyzja produktowa.',
  },
  {
    id: 'trzydziesci',
    nazwa: '30 punktów pracy',
    zaJakaPrace: 'Za trzydzieści punktów wykonanej i zapisanej pracy.',
    miara: 'punkty',
    prog: 30,
    uzasadnienieProgu: 'Trzykrotność poprzedniego progu. Odstępy rosną, żeby kolejna odznaka nie przychodziła sama.',
  },
  {
    id: 'siedemdziesiat_piec',
    nazwa: '75 punktów pracy',
    zaJakaPrace: 'Za siedemdziesiąt pięć punktów wykonanej i zapisanej pracy.',
    miara: 'punkty',
    prog: 75,
    uzasadnienieProgu: 'Skala jednego Bloku Skupienia (4 tygodnie × 3 sesje) z zapisami. Decyzja produktowa.',
  },
  {
    id: 'sto_piecdziesiat',
    nazwa: '150 punktów pracy',
    zaJakaPrace: 'Za sto pięćdziesiąt punktów wykonanej i zapisanej pracy.',
    miara: 'punkty',
    prog: 150,
    uzasadnienieProgu: 'Dwa Bloki. Ostatni próg tej skali — kolejne dokłada się, gdy ktoś tu dojdzie.',
  },
  {
    id: 'odpowiedz_kontrolna',
    nazwa: 'Praca domknięta',
    zaJakaPrace: 'Za pięć rzeczy, które nie tylko zrobiłeś, ale i domknąłeś odpowiedzią — RPE, czasem trwania albo odpowiedzią na pytanie kontrolne Bloku.',
    miara: 'odpowiedzi_kontrolne',
    prog: 5,
    uzasadnienieProgu: 'Pięć, bo to jest okno, którym ranker już liczy Dziennik (`OKNO_WPISOW` = 5). Jedna liczba w dwóch miejscach zamiast dwóch.',
  },
  {
    id: 'praca_w_celu',
    nazwa: 'Praca nad swoim celem',
    zaJakaPrace: 'Za dziesięć punktów pracy w tym, co sam nazwałeś swoim celem.',
    miara: 'punkty_w_celu',
    prog: 10,
    uzasadnienieProgu: 'Tyle samo, co drugi próg objętości — żeby „praca nad celem" była porównywalnie trudna, a nie tańsza.',
  },
];

// ═══════════════════════════════════════════════════════════════════
// 2. JEDNOSTKA PRACY I TRZY STANY WEJŚCIA
// ═══════════════════════════════════════════════════════════════════

/**
 * ⭐ JEDNOSTKA PRACY. **Nie ma tu pola z datą i nie będzie.**
 *
 * ⛔ Dołożenie daty do tego typu jest jedyną zmianą, która pozwoliłaby kolejnej
 * sesji policzyć „dni z rzędu" albo „okno ostatnich N dni" — czyli przywrócić
 * dokładnie to, co ten pas usuwa. Pilnuje tego asercja strażnika, która czyta
 * ten plik jako tekst.
 */
export type JednostkaPracy = {
  /**
   * Unikat jednostki. ⛔ Służy WYŁĄCZNIE do odsiania duplikatów — dwa odczyty
   * tego samego wiersza nie mają prawa policzyć się dwa razy. Klucz nie wchodzi
   * do arytmetyki i jego kształt nie ma znaczenia dla wyniku.
   */
  klucz: string;
  rodzaj: RodzajPracy;
  /**
   * Segment, w którym ta praca leży. `null` znaczy „nie wiem, do czego ją
   * przypisać" — ⛔ NIE „do niczego". Praca bez segmentu liczy się do objętości
   * i nie liczy się do celu; nie znika.
   */
  segment: string | null;
  /**
   * Czy ta jednostka jest DOMKNIĘTA odpowiedzią (pomiar obciążenia, odpowiedź
   * kontrolna, wpis wskazujący konkretną sesję). ⭐ To jest oś JAKOŚCI i jest
   * z założenia węższa niż liczba wierszy.
   */
  zOdpowiedziaKontrolna: boolean;
};

/**
 * ⭐ TRZY STANY ŹRÓDŁA, I TRZECI NIE JEST OZDOBĄ (R5).
 *   `jest`          — odczytałem; lista może być pusta i pusta znaczy „nic tam nie ma".
 *   `nie_odczytano` — odczyt padł. ⛔ TO NIE JEST ZERO PRACY.
 */
export type WejscieZrodla =
  | { rodzaj: 'jest'; jednostki: readonly JednostkaPracy[] }
  | { rodzaj: 'nie_odczytano'; powod: string };

/**
 * Wejście dla wołającego, który danego źródła w ogóle nie czyta. ⛔ NIE JEST
 * domyślnym „pusto" — jest jawnym zapisem, że tego mechanizmu tam nie ma,
 * i zachowuje się jak `nie_odczytano`, bo skutek jest ten sam: nie wiem.
 */
export function zrodloNieczytane(powod: string): WejscieZrodla {
  return { rodzaj: 'nie_odczytano', powod };
}

/**
 * ⭐ SEGMENTY, KTÓRE ZAWODNIK SAM NAZWAŁ SWOIM CELEM — i dlaczego to musi być
 * zbiór KOMPLETNY.
 *
 * ⛔ ZMIERZONE 15.08.2026 NA PRODUKCJI: `goals` ma 6 wierszy, z czego **2 mają
 * `status='completed'`**, i wiersze te NIE SĄ KASOWANE. Zawodnik
 * `0be298a2…` ma dziś cztery cele, w tym `wytrzymalosc` **domknięty**.
 * Odznaka policzona ze zbioru filtrowanego po `status='active'` **przepadłaby
 * w dniu domknięcia celu** — czyli licznik wróciłby do zera z powodu sukcesu.
 * To jest ten sam defekt co seria dni, tylko lepiej ukryty.
 *
 * Dlatego zbiór ma dwa stany, a nie jeden: wołający, który nie umie podać
 * kompletu, mówi to WPROST i odznaka nie powstaje — zamiast powstać i zniknąć.
 */
export type SegmentyCelow =
  | { rodzaj: 'pelne'; segmenty: ReadonlySet<string> }
  | { rodzaj: 'niepelne'; powod: string };

export type WejscieNagrody = {
  sesje: WejscieZrodla;
  dziennik: WejscieZrodla;
  odpowiedziKontrolne: WejscieZrodla;
  mecze: WejscieZrodla;
  segmentyCelow: SegmentyCelow;
};

// ═══════════════════════════════════════════════════════════════════
// 3. ⭐ CZYTNIKI — JEDYNE MIEJSCE W TYM PLIKU, W KTÓRYM ISTNIEJĄ DATY
// ═══════════════════════════════════════════════════════════════════
//
// Poniżej tej sekcji nie ma ani jednej daty. Wiersze wchodzą z datami, bo
// tak wyglądają w bazie; wychodzą bez nich, bo data nie ma prawa wpłynąć
// na to, ile pracy zawodnik wykonał.

/**
 * ⛔ PUNKT WPIĘCIA MUTACJI DLA STRAŻNIKA — i jedyne miejsce, w którym data
 * mogłaby cokolwiek zmienić. Produkcyjny wołający TEGO ARGUMENTU NIE PODAJE,
 * więc mutacja nie ma jak wejść na ekran (ten sam wzorzec co `ZasadyWykonania`
 * w `lib/wykonanieSesji.ts`).
 */
export type ZasadyCzytania = {
  /**
   * ⛔ ZAWSZE `null`. Gdy liczba — czytnik odrzuca wiersze starsze niż N dni,
   * czyli przywraca licznik okna, który maleje z upływem czasu.
   */
  oknoDni: number | null;
  /** Dzisiejsza data dla okna wyżej. Bez niej okno i tak nie działa. */
  dzis: string | null;
};

export const CZYTAJ_WSZYSTKO: ZasadyCzytania = { oknoDni: null, dzis: null };

/** `true`, gdy wiersz przechodzi przez (nieistniejące w produkcji) okno. */
function wOknie(dzien: string | null, zasady: ZasadyCzytania): boolean {
  if (zasady.oknoDni === null || zasady.dzis === null) return true;
  if (typeof dzien !== 'string' || dzien.length < 10) return true;
  const granica = przesunDate(zasady.dzis, -(zasady.oknoDni - 1));
  if (granica === null) return true;
  return dzien.slice(0, 10) >= granica;
}

/** Wystąpienie z DOWODEM wykonania, tak jak rozstrzygnął je pas D1. */
export type WierszSesji = {
  idWydarzenia: number;
  /** ⚠️ Wchodzi wyłącznie do klucza i do (nieistniejącego) okna. Nie do arytmetyki. */
  dzien: string;
  /** Segment Bloku Skupienia, do którego należy ta sesja. `null` = nie wiadomo. */
  segment: string | null;
  /** Czy istnieje wpis w Dzienniku wskazujący DOKŁADNIE tę pozycję. */
  maWpisWDzienniku: boolean;
};

export function jednostkiZSesji(
  wiersze: readonly WierszSesji[],
  zasady: ZasadyCzytania = CZYTAJ_WSZYSTKO,
): JednostkaPracy[] {
  const out: JednostkaPracy[] = [];
  for (const w of wiersze) {
    if (!w || typeof w.idWydarzenia !== 'number' || !Number.isFinite(w.idWydarzenia)) continue;
    if (typeof w.dzien !== 'string' || w.dzien.length < 10) continue;
    if (!wOknie(w.dzien, zasady)) continue;
    out.push({
      klucz: `sesja:${w.idWydarzenia}@${w.dzien.slice(0, 10)}`,
      rodzaj: 'sesja_z_dowodem',
      segment: typeof w.segment === 'string' && w.segment.length > 0 ? w.segment : null,
      zOdpowiedziaKontrolna: w.maWpisWDzienniku === true,
    });
  }
  return out;
}

export type WierszDziennika = {
  id: number;
  entry_type: string | null;
  /** ⚠️ Tylko do klucza i do (nieistniejącego) okna. */
  created_at: string | null;
  /** Surowy `payload`. Czytamy z niego wyłącznie obecność pomiaru obciążenia. */
  payload: unknown;
};

/**
 * ⭐ CO ODRÓŻNIA WPIS POTRENINGOWY OD PORANNEGO — i dlaczego liczymy to
 * z PAYLOADU, a nie z `entry_type`.
 *
 * `entry_type='post_training'` mówi, jaki formularz zawodnik otworzył.
 * Obecność `rpe` albo `duration_minutes` mówi, czy go WYPEŁNIŁ czymkolwiek,
 * co jest pomiarem. Pusty formularz potreningowy nie jest domkniętą pracą,
 * a wpis z RPE 6 i 90 minutami jest nią nawet wtedy, gdy ktoś wybrał inny typ.
 * ⛔ Liczymy to, co zawodnik ZAPISAŁ, a nie to, co KLIKNĄŁ.
 */
export function maPomiarObciazenia(payload: unknown): boolean {
  if (payload === null || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  const liczba = (x: unknown): boolean => typeof x === 'number' && Number.isFinite(x);
  return liczba(p.rpe) || liczba(p.duration_minutes);
}

export function jednostkiZDziennika(
  wiersze: readonly WierszDziennika[],
  zasady: ZasadyCzytania = CZYTAJ_WSZYSTKO,
): JednostkaPracy[] {
  const out: JednostkaPracy[] = [];
  for (const w of wiersze) {
    if (!w || typeof w.id !== 'number' || !Number.isFinite(w.id)) continue;
    const dzien = typeof w.created_at === 'string' ? w.created_at.slice(0, 10) : null;
    if (!wOknie(dzien, zasady)) continue;
    const zPomiarem = maPomiarObciazenia(w.payload);
    out.push({
      klucz: `dziennik:${w.id}`,
      rodzaj: zPomiarem ? 'wpis_potreningowy' : 'wpis_dziennika',
      // ⛔ Dziennik nie niesie segmentu i nie udajemy, że niesie.
      segment: null,
      zOdpowiedziaKontrolna: zPomiarem,
    });
  }
  return out;
}

export type WierszOdpowiedziKontrolnej = {
  id: string;
  /** ⚠️ `null` znaczy „pytanie zadane, nieodpowiedziane" — i to NIE JEST praca. */
  answered_at: string | null;
  segment: string | null;
};

export function jednostkiZOdpowiedziKontrolnych(
  wiersze: readonly WierszOdpowiedziKontrolnej[],
  zasady: ZasadyCzytania = CZYTAJ_WSZYSTKO,
): JednostkaPracy[] {
  const out: JednostkaPracy[] = [];
  for (const w of wiersze) {
    if (!w || typeof w.id !== 'string' || w.id.length === 0) continue;
    // ⛔ Samo ZADANIE pytania nie jest pracą zawodnika. Nagradzanie go byłoby
    // nagrodą za to, że produkt się odezwał — czyli za obecność (N1).
    if (typeof w.answered_at !== 'string' || w.answered_at.length === 0) continue;
    if (!wOknie(w.answered_at.slice(0, 10), zasady)) continue;
    out.push({
      klucz: `kontrola:${w.id}`,
      rodzaj: 'odpowiedz_kontrolna',
      segment: typeof w.segment === 'string' && w.segment.length > 0 ? w.segment : null,
      zOdpowiedziaKontrolna: true,
    });
  }
  return out;
}

export type WierszMeczu = { id: number; created_at: string | null };

export function jednostkiZMeczow(
  wiersze: readonly WierszMeczu[],
  zasady: ZasadyCzytania = CZYTAJ_WSZYSTKO,
): JednostkaPracy[] {
  const out: JednostkaPracy[] = [];
  for (const w of wiersze) {
    if (!w || typeof w.id !== 'number' || !Number.isFinite(w.id)) continue;
    const dzien = typeof w.created_at === 'string' ? w.created_at.slice(0, 10) : null;
    if (!wOknie(dzien, zasady)) continue;
    out.push({ klucz: `mecz:${w.id}`, rodzaj: 'mecz', segment: null, zOdpowiedziaKontrolna: false });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════
// 3b. ⭐ CO JEST DOWODEM WYKONANEJ SESJI — jedna kopia reguły, nie druga
// ═══════════════════════════════════════════════════════════════════
//
// ⛔ TA REGUŁA NIE MA PRAWA MIESZKAĆ NA EKRANIE. Gdyby `dzis.tsx` sam
// decydował, co jest dowodem, powstałaby druga kopia rozstrzygnięcia pasa D1
// — a pierwsza poprawka weszłaby do jednej z nich i oba miejsca wyglądałyby
// poprawnie. Dlatego stoi tutaj i jest objęta asercjami strażnika.
//
// TRZY DOWODY, KAŻDY Z INNEGO ŹRÓDŁA:
//   1. WERDYKT `odbylo_sie`, niewycofany — dowód wystawiony ŚWIADOMIE
//      i O KONKRETNYM WYSTĄPIENIU. Działa także dla reguły cyklicznej,
//      bo niesie `(id wydarzenia, data wystąpienia)`.
//   2. `status='completed'` na wierszu — dowód na WIERSZU.
//   3. wpis w Dzienniku wskazujący tę pozycję — dowód pośredni.
//
// ⛔ DOWODY 2 I 3 NIE OBOWIĄZUJĄ DLA REGUŁY CYKLICZNEJ i to nie jest
// ostrożność. Jeden wiersz reguły ma dziesięć wystąpień; `daily_logs`
// i `status` opisują WIERSZ. Policzenie ich znaczyłoby, że jeden wpis
// o wtorkowym treningu daje zawodnikowi pracę za KAŻDY wtorek w historii —
// czyli produkt policzyłby mu pracę, której nie wykonał. To jest dokładnie
// reguła 4 z `rozstrzygnijWykonanie` w `lib/wykonanieSesji.ts`.

export type WierszWydarzeniaDoNagrody = {
  id: number;
  scheduled_date: string | null;
  status: string | null;
  recurrence_rule: string | null;
  /** Blok Skupienia, z którego ta pozycja pochodzi — nośnik segmentu. */
  focus_block_id: string | null;
};

/**
 * ⭐ ŹRÓDŁO „SESJE Z DOWODEM" — gotowe wejście do `policzNagrode`.
 *
 * Trzy z czterech argumentów mają stan „nie odczytałem" i każdy z nich
 * przewraca całe źródło na `nie_odczytano`, bo bez niego suma byłaby MNIEJSZA
 * od prawdy — a to jest ten sam defekt, co licznik wracający do zera.
 *
 * ⚠️ CZWARTY, `segmentBloku`, JEST INNY I ŚWIADOMIE NIE BLOKUJE. Nieznany
 * segment odbiera pracy przynależność do celu, ale nie odbiera jej istnienia:
 * jednostka wchodzi z `segment: null`, czyli liczy się do objętości i nie
 * liczy się do „pracy nad celem". ⛔ Odwrotna decyzja kasowałaby wykonaną
 * pracę z powodu brakującego przypisania.
 */
export function zrodloSesji(args: {
  /** ⚠️ `null` = ODCZYT WYDARZEŃ SIĘ NIE UDAŁ, a nie „nic nie ma". */
  wydarzenia: readonly WierszWydarzeniaDoNagrody[] | null;
  werdykty: WejscieWerdyktow;
  /** ⚠️ `null` = ODCZYT DZIENNIKA SIĘ NIE UDAŁ. */
  wpisyDziennika: ReadonlySet<number> | null;
  /** `focus_block_id` → `segment_id`. `null` = nie znam mapy; NIE blokuje. */
  segmentBloku: ReadonlyMap<string, string> | null;
  zasady?: ZasadyCzytania;
}): WejscieZrodla {
  if (args.wydarzenia === null) {
    return zrodloNieczytane('nie odczytałem wydarzeń kalendarza');
  }
  if (args.werdykty.rodzaj === 'nie_odczytano') {
    return zrodloNieczytane(args.werdykty.powod);
  }
  if (args.wpisyDziennika === null) {
    return zrodloNieczytane('nie odczytałem powiązań wpisów Dziennika z sesjami');
  }

  const wpisy = args.wpisyDziennika;
  const segmentDla = (idBloku: string | null): string | null => {
    if (args.segmentBloku === null || typeof idBloku !== 'string' || idBloku.length === 0) return null;
    return args.segmentBloku.get(idBloku) ?? null;
  };

  const wiersze: WierszSesji[] = [];

  // ── DOWÓD 1: werdykt zawodnika. Wystąpienie, nie wiersz. ──
  // ⚠️ `rodzaj: 'brak'` (tabeli nie ma w bazie) to WIEDZA, nie niewiedza:
  // nie ma gdzie trzymać werdyktu, więc werdyktu nie ma. Ta sama gałąź,
  // co w `czytajWerdykty`.
  const segmentWydarzenia = new Map<number, string | null>();
  const cykliczne = new Set<number>();
  for (const w of args.wydarzenia) {
    if (!w || typeof w.id !== 'number' || !Number.isFinite(w.id)) continue;
    segmentWydarzenia.set(w.id, segmentDla(w.focus_block_id));
    if (typeof w.recurrence_rule === 'string' && w.recurrence_rule.length > 0) cykliczne.add(w.id);
  }
  if (args.werdykty.rodzaj === 'jest') {
    for (const w of args.werdykty.werdykty) {
      if (w.wycofany) continue;
      if (w.werdykt !== 'odbylo_sie') continue;
      wiersze.push({
        idWydarzenia: w.idWydarzenia,
        dzien: w.dzien,
        segment: segmentWydarzenia.get(w.idWydarzenia) ?? null,
        maWpisWDzienniku: wpisy.has(w.idWydarzenia),
      });
    }
  }

  // ── DOWODY 2 i 3: `completed` oraz wpis wskazujący pozycję. ──
  for (const w of args.wydarzenia) {
    if (!w || typeof w.id !== 'number' || !Number.isFinite(w.id)) continue;
    if (cykliczne.has(w.id)) continue;
    if (typeof w.scheduled_date !== 'string' || w.scheduled_date.length < 10) continue;
    const maWpis = wpisy.has(w.id);
    if (w.status !== 'completed' && !maWpis) continue;
    wiersze.push({
      idWydarzenia: w.id,
      dzien: w.scheduled_date,
      segment: segmentWydarzenia.get(w.id) ?? null,
      maWpisWDzienniku: maWpis,
    });
  }

  // ⛔ Duplikaty (werdykt + `completed` na tym samym wystąpieniu) odsiewa
  // `policzNagrode` po kluczu — tutaj nie ma potrzeby ich gonić.
  return { rodzaj: 'jest', jednostki: jednostkiZSesji(wiersze, args.zasady ?? CZYTAJ_WSZYSTKO) };
}

/**
 * Przesuwa datę `YYYY-MM-DD` o `oDni`. Skopiowane co do znaku
 * z `lib/wykonanieSesji.ts` — świadomie, bo ten plik NIE MA prawa importować
 * niczego, co ciągnie za sobą pojęcie okna. Jedyny konsument: `wOknie`,
 * czyli gałąź, która w produkcji nigdy się nie wykonuje.
 */
function przesunDate(data: string, oDni: number): string | null {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(data)) return null;
  if (!Number.isFinite(oDni)) return null;
  const t = Date.parse(`${data.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  return new Date(t + oDni * 86400000).toISOString().slice(0, 10);
}

// ═══════════════════════════════════════════════════════════════════
// 4. WYNIK
// ═══════════════════════════════════════════════════════════════════

export type OdznakaZdobyta = {
  id: OdznakaId;
  nazwa: string;
  /** ⭐ Jedno zdanie: ZA JAKĄ PRACĘ. Odznaka bez tego zdania jest naklejką. */
  zaJakaPrace: string;
  miara: MiaraProgu;
  prog: number;
  /** Ile zawodnik ma w tej mierze. ⛔ Zawsze ≥ `prog`. */
  osiagnieto: number;
};

export type NastepnyProg = {
  id: OdznakaId;
  nazwa: string;
  miara: MiaraProgu;
  prog: number;
  masz: number;
  /** ⭐ Ile PRACY brakuje. ⛔ Nigdy dni. Zawsze ≥ 1. */
  brakuje: number;
};

/** Odznaka, której NIE UMIEM policzyć — z powodem. ⛔ To nie jest „niezdobyta". */
export type BrakPomiaru = { id: OdznakaId; nazwa: string; powod: string };

export type NagrodaZaPrace =
  | {
      rodzaj: 'policzona';
      /** ⭐ Łączna wykonana praca. NIGDY nie maleje. */
      punkty: number;
      /** Ile rzeczy się na to złożyło. */
      jednostki: number;
      /** Oś jakości — ile z nich zostało domkniętych odpowiedzią. */
      odpowiedziKontrolne: number;
      /** Punkty w segmentach nazwanych celem. `null` = zbiór celów niepełny (R5). */
      punktyWCelu: number | null;
      odznaki: readonly OdznakaZdobyta[];
      /** `null`, gdy zdobyte są wszystkie policzalne progi. */
      nastepnyProg: NastepnyProg | null;
      /** ⭐ Progi, których nie umiem policzyć — z powodem. Nie milczą. */
      nieumiemPoliczyc: readonly BrakPomiaru[];
    }
  | {
      rodzaj: 'nie_policzona';
      /**
       * ⛔ ŚWIADOMIE BEZ POLA `punkty`. Gdyby tu było, dałoby się narysować
       * „0 punktów" — zdanie, które wygląda na pomiar i nim nie jest. Ten sam
       * wzorzec, co `brak_podstawy` w `lib/wykonanieSesji.ts`.
       */
      powod: string;
      nieodczytane: readonly string[];
    };

/**
 * ⛔ PUNKT WPIĘCIA MUTACJI. Produkcyjny wołający TEGO ARGUMENTU NIE PODAJE.
 */
export type ZasadyNagrody = {
  /** ⛔ Zawsze `false`. Gdy `true` — nieodczytane źródło liczy się jak puste. */
  brakWolnoUznacZaZero: boolean;
  /** ⛔ Zawsze `true`. Gdy `false` — ten sam wiersz liczy się wielokrotnie. */
  odsiewajDuplikaty: boolean;
  /** ⛔ Zawsze `false`. Gdy `true` — odznaka powstaje bez pokrycia w pracy. */
  progWolnoDacBezPracy: boolean;
  /** ⛔ Zawsze `false`. Gdy `true` — niepełny zbiór celów liczy się jak pełny. */
  niepelneCeleLiczaSieJakPelne: boolean;
};

export const ZASADY_NAGRODY_PRAWDZIWE: ZasadyNagrody = {
  brakWolnoUznacZaZero: false,
  odsiewajDuplikaty: true,
  progWolnoDacBezPracy: false,
  niepelneCeleLiczaSieJakPelne: false,
};

/**
 * ⭐ ILE PRACY WYKONAŁEŚ I CO CI Z TEGO PRZYSŁUGUJE.
 *
 * ── DLACZEGO JEDNO NIEODCZYTANE ŹRÓDŁO PRZEWRACA CAŁY WYNIK ────────
 * Bo liczba, która wychodzi z trzech źródeł zamiast czterech, jest MNIEJSZA
 * od tej samej liczby sprzed godziny — a licznik, który maleje przy awarii
 * sieci, kłamie zawodnikowi dokładnie tak samo jak licznik zerowany po
 * opuszczonym dniu. Wolę powiedzieć „nie udało mi się policzyć" niż podać
 * dolne ograniczenie jako sumę (Z0).
 * ⛔ To NIE JEST ostrożność kosztem funkcji: stan `nie_policzona` jest
 * ODRÓŻNIALNY od `policzona` z zerem i ekran rysuje dwa różne zdania.
 */
export function policzNagrode(
  we: WejscieNagrody,
  zasady: ZasadyNagrody = ZASADY_NAGRODY_PRAWDZIWE,
): NagrodaZaPrace {
  const zrodla: readonly (readonly [string, WejscieZrodla])[] = [
    ['sesje z dowodem wykonania', we.sesje],
    ['wpisy w Dzienniku', we.dziennik],
    ['odpowiedzi kontrolne Bloku', we.odpowiedziKontrolne],
    ['mecze', we.mecze],
  ];

  const nieodczytane: string[] = [];
  for (const [nazwa, z] of zrodla) {
    if (z.rodzaj === 'nie_odczytano') nieodczytane.push(`${nazwa}: ${z.powod}`);
  }
  if (nieodczytane.length > 0 && !zasady.brakWolnoUznacZaZero) {
    return {
      rodzaj: 'nie_policzona',
      powod: nieodczytane.length === zrodla.length
        ? 'nie odczytałem żadnego źródła pracy'
        : `nie odczytałem ${nieodczytane.length} z ${zrodla.length} źródeł pracy`,
      nieodczytane,
    };
  }

  // ── Odsiew duplikatów. Ten sam wiersz przeczytany dwa razy to jedna praca. ──
  const widziane = new Set<string>();
  const jednostki: JednostkaPracy[] = [];
  for (const [, z] of zrodla) {
    if (z.rodzaj !== 'jest') continue;
    for (const j of z.jednostki) {
      if (!j || typeof j.klucz !== 'string' || j.klucz.length === 0) continue;
      if (!(j.rodzaj in WAGI_PRACY)) continue;
      if (zasady.odsiewajDuplikaty) {
        if (widziane.has(j.klucz)) continue;
        widziane.add(j.klucz);
      }
      jednostki.push(j);
    }
  }

  let punkty = 0;
  let odpowiedziKontrolne = 0;
  let punktyWCelu = 0;
  const celePelne = we.segmentyCelow.rodzaj === 'pelne' || zasady.niepelneCeleLiczaSieJakPelne;
  const segmentyCelu: ReadonlySet<string> = we.segmentyCelow.rodzaj === 'pelne'
    ? we.segmentyCelow.segmenty
    : new Set<string>();

  for (const j of jednostki) {
    punkty += WAGI_PRACY[j.rodzaj];
    if (j.zOdpowiedziaKontrolna) odpowiedziKontrolne += 1;
    if (celePelne && j.segment !== null && segmentyCelu.has(j.segment)) {
      punktyWCelu += WAGI_PRACY[j.rodzaj];
    }
  }

  const wartosc = (m: MiaraProgu): number | null => {
    if (m === 'punkty') return punkty;
    if (m === 'odpowiedzi_kontrolne') return odpowiedziKontrolne;
    return celePelne ? punktyWCelu : null;
  };

  const odznaki: OdznakaZdobyta[] = [];
  const nieumiemPoliczyc: BrakPomiaru[] = [];
  let nastepnyProg: NastepnyProg | null = null;

  for (const p of PROGI) {
    const masz = wartosc(p.miara);
    if (masz === null) {
      nieumiemPoliczyc.push({
        id: p.id,
        nazwa: p.nazwa,
        powod: we.segmentyCelow.rodzaj === 'niepelne'
          ? we.segmentyCelow.powod
          : 'nie umiem policzyć tej miary',
      });
      continue;
    }
    // ⛔ TA LINIA JEST CAŁYM ZAKAZEM „NAGRODY BEZ PRACY". Nie ma tu warunku
    // o dacie, o wejściu do aplikacji ani o niczym, co mija samo.
    const zdobyta = zasady.progWolnoDacBezPracy ? true : masz >= p.prog;
    if (zdobyta) {
      odznaki.push({ id: p.id, nazwa: p.nazwa, zaJakaPrace: p.zaJakaPrace, miara: p.miara, prog: p.prog, osiagnieto: masz });
    } else if (nastepnyProg === null) {
      nastepnyProg = { id: p.id, nazwa: p.nazwa, miara: p.miara, prog: p.prog, masz, brakuje: p.prog - masz };
    }
  }

  return {
    rodzaj: 'policzona',
    punkty,
    jednostki: jednostki.length,
    odpowiedziKontrolne,
    punktyWCelu: celePelne ? punktyWCelu : null,
    odznaki,
    nastepnyProg,
    nieumiemPoliczyc,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 5. ZDANIA DO KONSOLI — żeby dało się zdiagnozować nagrodę po fakcie
// ═══════════════════════════════════════════════════════════════════

export function opisNagrodyDoLogu(n: NagrodaZaPrace): string {
  if (n.rodzaj === 'nie_policzona') {
    return `nagroda za pracę: NIE POLICZONA — ${n.powod} [${n.nieodczytane.join(' | ')}]`;
  }
  const nast = n.nastepnyProg === null
    ? 'brak kolejnego progu'
    : `następny: ${n.nastepnyProg.id} (brakuje ${n.nastepnyProg.brakuje} w mierze ${n.nastepnyProg.miara})`;
  return `nagroda za pracę: ${n.punkty} pkt z ${n.jednostki} jednostek `
    + `· domkniętych ${n.odpowiedziKontrolne} · w celu ${n.punktyWCelu === null ? 'NIE WIEM' : n.punktyWCelu} `
    + `· odznak ${n.odznaki.length} · ${nast}`
    + (n.nieumiemPoliczyc.length > 0 ? ` · nie umiem policzyć: ${n.nieumiemPoliczyc.map((b) => b.id).join(',')}` : '');
}
