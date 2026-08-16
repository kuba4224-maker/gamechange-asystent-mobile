// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-D1 08.2026 (14.08.2026) — „TEJ SESJI NIE ODBYŁEM".
//
// Ten plik odpowiada na JEDNO pytanie: CO WIEMY O TYM WYSTĄPIENIU.
// Zero Reacta, zero Supabase, zero zegara — dzisiejsza data jest parametrem.
//
// ── DLACZEGO POWSTAŁ ────────────────────────────────────────────────
// Do 14.08.2026 produkt nie umiał zapisać, że sesja się NIE odbyła. Znał trzy
// rzeczy i ŻADNA tego nie znaczyła:
//   • `calendar_events.status='completed'` — od pasa A1 zapisywane, ale opisuje
//     WIERSZ (regułę albo pojedynczą pozycję), nie WYSTĄPIENIE;
//   • `status='cancelled'` — „odwołana", czyli zdjęta z planu. NIE „opuszczona";
//     ⭐ PLAN-D-K1 16.08.2026 — TO ZDANIE STAŁO TU OD 14.08 I BYŁO NIEPRAWDĄ
//     O WŁASNYM PLIKU: reguła 3, 300 linii niżej, robiła z odwołania dokładnie
//     „opuszczoną" (`return 'nie_odbylo_sie'`). Od pasa K1 odwołanie ma własny,
//     PIĄTY stan `odwolane` i komentarz wreszcie opisuje kod (O67);
//   • `daily_logs.calendar_event_id` — „ta sesja MA wpis". Brak wpisu NIE ZNACZY
//     „nie odbyła się"; wskazuje też na wiersz reguły, nie na wystąpienie.
// Skutek policzalny: licznik pracy umiał powiedzieć wyłącznie „ile sesji ma
// wpis", nigdy „ile odbyłeś" — a to jest fundament N1 (nagradzamy WYKONANĄ
// pracę). Blokowało to sześć obietnic: WG-28, WT-15, WT-17, WG-37, WG-38, WG-39.
//
// ── ⛔ TRZY PROJEKTY, KTÓRE TU NIE STOJĄ, I NIE PRZEZ PRZEOCZENIE ────
// 1. CZWARTY STATUS `'missed'` w `calendar_events`. Status opisuje PLANOWANĄ
//    POZYCJĘ, a „nie odbyłem" jest FAKTEM O WYSTĄPIENIU. Reguła cykliczna ma
//    jeden wiersz i dziesięć wystąpień — jeden status nie uniesie dziesięciu
//    werdyktów. Status zmienia autor planu; werdykt należy do zawodnika.
// 2. `status='completed'` STAWIANE PRZY WPISIE W DZIENNIKU jako nośnik „odbyło
//    się". To jest zasada P3 przeczytana wspak: pole zaczyna być zapisywane,
//    ale nadal opisuje wiersz, nie wystąpienie.
// 3. WNIOSKOWANIE „nie odbyło się" Z UPŁYWU CZASU („minęła data, nie ma wpisu").
//    To jest zgadywanie podane jako fakt o zawodniku — złamanie Z0 i dokładnie
//    ten defekt, który pas C1 usunął z ekranu Kalendarz („Nie wykonano").
//    ⛔ BRAK WPISU MA ZOSTAĆ BRAKIEM WPISU. Pilnuje tego grupa 2 strażnika.
//
// ── ⭐ JEDNA KOPIA REGUŁY, NIE DWIE ─────────────────────────────────
// `lib/widokTygodnia.ts` miał od pasa C1 własną `rozstrzygnijStanPrzeszly`
// z tymi samymi czterema stanami. Ten plik JĄ ZASTĘPUJE: tamta funkcja jest
// dziś cienką przejściówką, która woła `rozstrzygnijWykonanie`. Dwie kopie
// rozjechałyby się przy pierwszej poprawce, a każda z osobna wyglądałaby
// poprawnie — dokładnie tak, jak „Nie wykonano" wyglądało poprawnie na jednym
// ekranie i było oskarżeniem na drugim.
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// 1. PIĘĆ STANÓW — I DLACZEGO PIĘĆ, A NIE DWA
// ═══════════════════════════════════════════════════════════════════

/**
 *   `odbylo_sie`     — MAMY DOWÓD, że tak.
 *   `nie_odbylo_sie` — MAMY DOWÓD, że nie: WERDYKT ZAWODNIKA. ⚠️ I NIC POZA NIM.
 *   `odwolane`       — pozycja została ZDJĘTA Z PLANU. ⛔ TO NIE JEST ZARZUT
 *                      i ⛔ TO NIE JEST BRAK DOWODU. To jest FAKT O PLANIE,
 *                      nie o zawodniku — patrz akapit niżej.
 *   `brak_wpisu`     — nie mamy dowodu w żadną stronę. ⛔ TO NIE JEST ZARZUT.
 *   `nie_odczytano`  — odczyt się nie udał. ⛔ TO NIE JEST „brak wpisu" (R5).
 *
 * ⚠️ Czwarty i piąty wyglądają na to samo i nie są tym samym. `brak_wpisu`
 * znaczy „sprawdziłem i nic nie ma". `nie_odczytano` znaczy „nie wiem, bo nie
 * sprawdziłem". Sklejenie ich zamienia awarię w twierdzenie o zawodniku.
 *
 * ── ⭐ PLAN-D-K1 16.08.2026 — DLACZEGO `odwolane` MUSIAŁO POWSTAĆ ────
 *
 * Do 16.08.2026 odwołanie wpadało do `nie_odbylo_sie`, czyli do plakietki
 * „Nie odbyło się". Zmierzone tego dnia na produkcji (`kqrbztsvepjtggjmmcdx`):
 * WSZYSTKIE 24 wydarzenia w bazie mają `source='system'`, a 12 z nich ma
 * `status='cancelled'` — i te 12 odwołał SAM PRODUKT
 * (`gamechange-app/lib/focus-block-adaptation.js :: adaptFocusBlock`,
 * `update({status:'cancelled'}).eq('focus_block_id', …).eq('status','scheduled')`).
 * Zawodnik czytał więc przy sesji, której produkt nie dał mu wykonać, zdanie
 * brzmiące jak zarzut wobec niego. To jest złamanie N1 („nagradzamy wykonaną
 * pracę, nigdy obecność" — i tym bardziej nie karcimy za pracę, której produkt
 * sam nie dał wykonać) oraz Z0 (zdanie o PLANIE podane jako zdanie O ZAWODNIKU).
 *
 * ⛔ I DLACZEGO NIE ROZRÓŻNIAMY, KTO ODWOŁAŁ. `app/(tabs)/kalendarz.tsx`
 * pozwala odwołać pozycję także ZAWODNIKOWI (`update({status:'cancelled'})`),
 * a `calendar_events` NIE MA kolumny mówiącej, kto to zrobił. Dwa różne
 * podmioty piszą dziś tę samą wartość i są NIEROZRÓŻNIALNE. Przy
 * nierozróżnialnych podmiotach jedyne prawdziwe zdanie to zdanie O POZYCJI,
 * nie o osobie: „Odwołane" jest prawdziwe w OBU przypadkach, „Nie odbyło się"
 * nie jest prawdziwe w ŻADNYM. Kolumna `cancelled_by` jest propozycją POZA
 * TYM PASEM — bez niej i tak nie wolno pisać zdania o osobie.
 */
export type StanWykonania =
  | 'odbylo_sie'
  | 'nie_odbylo_sie'
  | 'odwolane'
  | 'brak_wpisu'
  | 'nie_odczytano';

/**
 * Plakietki pięciu stanów. Cztery przeniesione z `lib/widokTygodnia.ts` co do
 * znaku (pas C1) — ten plik jest teraz ich jedynym domem, tamten je
 * re-eksportuje.
 * ⛔ Nie ma tu „Nie wykonano" i nie będzie.
 * ⚠️ BRZMIENIA — DO PRZEJRZENIA PRZEZ KUBĘ (te cztery są w produkcie od pasa C1).
 */
export const PLAKIETKI_WYKONANIA: Record<StanWykonania, string> = {
  odbylo_sie: 'Zrobione',
  nie_odbylo_sie: 'Nie odbyło się',
  // ⚠️ DO PRZEJRZENIA — K1. Brzmienie NIE JEST nowe: `app/(tabs)/kalendarz.tsx`
  // miał od pasa A `badges.push('Anulowane')` przy tym samym fakcie. Pas K1
  // bierze wariant „Odwołane" i UJEDNOLICA kalendarz do niego, bo ten sam fakt
  // miał w produkcie dwie nazwy („Anulowane" na karcie, „Nie odbyło się"
  // w wierszu dnia) — a to jest ta sama choroba, którą pas G2 usuwał z obszarów.
  odwolane: 'Odwołane',
  brak_wpisu: 'Bez wpisu',
  nie_odczytano: 'Nie wiemy',
};

/**
 * ⚠️ BRZMIENIA NOWE W TYM PASIE — DO PRZEJRZENIA PRZEZ KUBĘ.
 *
 * Rozróżnienie osoby jest celowe i jest całą treścią tej pary:
 *   • akcja mówi w PIERWSZEJ osobie — to zawodnik coś oświadcza;
 *   • plakietka mówi w TRZECIEJ — to produkt opisuje swoją wiedzę.
 * Gdyby przycisk brzmiał tak samo jak plakietka, zawodnik nie miałby jak
 * odróżnić „tak jest" od „powiedz, że tak jest".
 *
 * ⛔ NIE MA TU PYTANIA „DLACZEGO NIE". Pytanie o powód przy opuszczonej sesji
 * jest konfrontacją (M1) i obniża wypełnialność u tych, którzy najbardziej
 * odpadają. Powód wolno zapisać, gdy zawodnik sam go poda — nie wolno o niego
 * prosić jako o warunek zapisu.
 * ⛔ NIE MA TU ZDANIA PO ZAPISIE. „Szkoda" ocenia, „nic straconego" kłamie.
 */
export const AKCJA_NIE_ODBYLEM = 'Nie odbyłem';
export const AKCJA_COFNIJ = 'Cofnij';

/**
 * ⚠️ DO PRZEJRZENIA — K1. Czasownik, którym zawodnik zdejmuje pozycję z planu.
 * Do 16.08.2026 przycisk w `app/(tabs)/kalendarz.tsx` brzmiał „Anuluj", a stan,
 * który z niego powstawał, nazywał się na jednym ekranie „Anulowane", a na
 * drugim „Nie odbyło się". Jedna rzecz — jedna nazwa: czynność „Odwołaj",
 * skutek „Odwołane".
 * ⛔ TO NIE JEST to samo słowo, co „Anuluj" w oknach dialogowych
 * (`components/FocusBlockPlanner.tsx`, `components/RecommendationCard.tsx`,
 * `lib/biometric-auth.ts`) — tam „Anuluj" znaczy „porzuć ten formularz",
 * czyli INNY FAKT, i pas K1 świadomie go nie rusza.
 */
export const AKCJA_ODWOLAJ = 'Odwołaj';

// ═══════════════════════════════════════════════════════════════════
// 2. WERDYKT — FAKT O WYSTĄPIENIU, NIE O WIERSZU
// ═══════════════════════════════════════════════════════════════════

/**
 * Wartość werdyktu. ⛔ Dwie i tylko dwie: „nie wiem" nie jest werdyktem, jest
 * BRAKIEM werdyktu i zapisuje się brakiem wiersza (albo wycofaniem).
 */
export type WartoscWerdyktu = 'odbylo_sie' | 'nie_odbylo_sie';

/**
 * Wiersz `session_verdicts` w kształcie, w jakim przychodzi z PostgREST.
 * ⚠️ `dzien` to DATA WYSTĄPIENIA (`occurred_on`), nie data wystawienia werdyktu.
 * Dla reguły cyklicznej `idWydarzenia` jest ten sam dla wszystkich wtorków —
 * rozróżnia je wyłącznie `dzien`.
 */
export type Werdykt = {
  idWydarzenia: number;
  dzien: string;
  werdykt: WartoscWerdyktu;
  /** Werdykt wycofany („Cofnij") NIE OBOWIĄZUJE, ale ślad po nim zostaje. */
  wycofany: boolean;
};

/**
 * ⭐ TRZY STANY WEJŚCIA WERDYKTÓW — i trzeci nie jest ozdobą.
 *
 *   `jest`          — odczytałem, oto lista (może być pusta).
 *   `brak`          — WIEM, że werdyktów nie ma. Dziś zachodzi z jednego,
 *                     policzalnego powodu: TABELI NIE MA W BAZIE, więc żaden
 *                     werdykt nie może istnieć. To NIE jest zgadywanie — to
 *                     wynikanie. Migracja z pasa D1 czeka na wykonanie.
 *   `nie_odczytano` — odczyt padł z innego powodu (sieć, RLS, cokolwiek).
 *                     Werdykt MOŻE istnieć i go nie widzę.
 *
 * ⛔ `powod` jest OBOWIĄZKOWY także przy `brak`. Wejście bez powodu wraca za
 * miesiąc jako „przecież tam nic nie było" i nikt nie umie sprawdzić czemu.
 */
export type WejscieWerdyktow =
  | { rodzaj: 'jest'; werdykty: readonly Werdykt[] }
  | { rodzaj: 'brak'; powod: string }
  | { rodzaj: 'nie_odczytano'; powod: string };

/**
 * Wejście dla wołającego, który o werdyktach w ogóle nie wie (np. starszy
 * ekran). ⛔ NIE JEST domyślną wartością „pusto" — jest jawnym zapisem, że
 * mechanizmu tam nie ma, i tak samo się zachowuje jak `brak` z powodem.
 */
export const WERDYKTY_NIEPODANE: WejscieWerdyktow = {
  rodzaj: 'brak',
  powod: 'wołający nie podał werdyktów — ten ekran ich nie czyta',
};

/**
 * Klucz wystąpienia. ⭐ TO JEST CAŁA ISTOTA TEGO PASA: para
 * `(id wydarzenia, data wystąpienia)`, a nie samo `id`.
 */
export function kluczWystapienia(idWydarzenia: number, dzien: string): string {
  return `${idWydarzenia}@${dzien}`;
}

// ═══════════════════════════════════════════════════════════════════
// 3. ODCZYT WERDYKTÓW — GDZIE MIESZKA RÓŻNICA „NIE MA TABELI" / „NIE UDAŁO SIĘ"
// ═══════════════════════════════════════════════════════════════════

/**
 * Kody, którymi PostgREST i PostgreSQL mówią „takiej tabeli nie ma".
 * `42P01` to `undefined_table` z PostgreSQL-a; `PGRST205` to odpowiedź
 * PostgRESTa, gdy tabeli nie ma w cache schematu.
 */
export const KODY_BRAKU_TABELI: readonly string[] = ['42P01', 'PGRST205'];

/** Kształt odpowiedzi PostgREST-a, w minimalnym zakresie, jakiego tu trzeba. */
export type OdpowiedzWerdyktow = {
  dane: readonly {
    calendar_event_id: number | string | null;
    occurred_on: string | null;
    verdict: string | null;
    withdrawn_at: string | null;
  }[] | null;
  blad: { code?: string | null; message?: string | null } | null;
};

/**
 * ⭐ JEDYNE MIEJSCE, W KTÓRYM ROZSTRZYGA SIĘ, CZY BRAK WERDYKTÓW JEST WIEDZĄ,
 * CZY NIEWIEDZĄ.
 *
 * ⚠️ Dopóki migracja D1 nie jest wykonana, tabeli `session_verdicts` NIE MA.
 * Gdyby ten przypadek wpadł do `nie_odczytano`, KAŻDA przeszła pozycja bez
 * wpisu dostałaby dziś plakietkę „Nie wiemy" — czyli spełniona obietnica WG-05
 * zgasłaby na wszystkich ekranach z powodu migracji, której nikt jeszcze nie
 * wkleił. Brak tabeli jest wynikaniem („nie ma gdzie trzymać werdyktu, więc
 * werdyktu nie ma"), a nie zgadywaniem — i dlatego ma własną gałąź.
 */
export function czytajWerdykty(o: OdpowiedzWerdyktow): WejscieWerdyktow {
  if (o.blad) {
    const kod = typeof o.blad.code === 'string' ? o.blad.code : '';
    const tresc = typeof o.blad.message === 'string' ? o.blad.message : '';
    if (KODY_BRAKU_TABELI.includes(kod) || /could not find the table/i.test(tresc)) {
      return {
        rodzaj: 'brak',
        powod: `tabeli session_verdicts nie ma w bazie (${kod || 'brak kodu'}) `
          + '— migracja PLAN-D-D1 nie jest jeszcze wykonana, więc werdyktu nie może być',
      };
    }
    return {
      rodzaj: 'nie_odczytano',
      powod: `session_verdicts: ${tresc || 'odczyt się nie udał'} (${kod || 'brak kodu'})`,
    };
  }
  if (o.dane === null) {
    return { rodzaj: 'nie_odczytano', powod: 'session_verdicts: brak danych i brak błędu' };
  }

  const werdykty: Werdykt[] = [];
  for (const w of o.dane) {
    if (!w) continue;
    const id = typeof w.calendar_event_id === 'string'
      ? Number(w.calendar_event_id)
      : w.calendar_event_id;
    // ⛔ Wiersza, którego nie umiem przeczytać, NIE UDAJĘ, ŻE PRZECZYTAŁEM,
    // i nie zamieniam po cichu w werdykt o czymkolwiek — pomijam go.
    if (typeof id !== 'number' || !Number.isFinite(id)) continue;
    if (typeof w.occurred_on !== 'string' || w.occurred_on.length < 10) continue;
    if (w.verdict !== 'odbylo_sie' && w.verdict !== 'nie_odbylo_sie') continue;
    werdykty.push({
      idWydarzenia: id,
      dzien: w.occurred_on.slice(0, 10),
      werdykt: w.verdict,
      wycofany: w.withdrawn_at !== null && w.withdrawn_at !== undefined,
    });
  }
  return { rodzaj: 'jest', werdykty };
}

/**
 * Werdykt OBOWIĄZUJĄCY dla wystąpienia — czyli niewycofany.
 * `null` znaczy „nie ma", `undefined` nie występuje (nie ma trzeciego znaczenia).
 */
export function werdyktDlaWystapienia(
  we: WejscieWerdyktow,
  idWydarzenia: number,
  dzien: string,
): Werdykt | null {
  if (we.rodzaj !== 'jest') return null;
  const klucz = kluczWystapienia(idWydarzenia, dzien);
  for (const w of we.werdykty) {
    if (w.wycofany) continue;
    if (kluczWystapienia(w.idWydarzenia, w.dzien) === klucz) return w;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// 4. ⭐ REGUŁA — CO WIEMY O TYM WYSTĄPIENIU
// ═══════════════════════════════════════════════════════════════════

export type WejscieWykonania = {
  /** Wystąpienie: `id` wiersza kalendarza + DATA TEGO wystąpienia. */
  idWydarzenia: number;
  dzien: string;
  /**
   * Czy to wystąpienie jest już za nami. ⚠️ PARAMETREM, nie z zegara: reguła,
   * która sama patrzy na zegar, nie da się sprawdzić dla konkretnego dnia.
   */
  przeszle: boolean;
  /** `calendar_events.status` tego wiersza. */
  status: string;
  /** Pozycja rozwinięta z reguły cyklicznej, a nie z własnej daty. */
  zRegulyCyklicznej: boolean;
  /** `calendar_event_id` z `daily_logs`. ⚠️ `null` = ODCZYT SIĘ NIE UDAŁ. */
  wpisyDziennika: ReadonlySet<number> | null;
  werdykty: WejscieWerdyktow;
};

/**
 * Punkt wpięcia mutacji dla strażnika. ⛔ Produkcyjny wołający NIE PODAJE tego
 * argumentu — to jedyny sposób, żeby mutacja nie mogła wejść na ekran.
 */
export type ZasadyWykonania = {
  /** Czy werdykt zawodnika w ogóle jest brany pod uwagę. */
  werdyktLiczySie: boolean;
  /** Czy brak dowodu wolno zamienić w „nie odbyło się". ⛔ Zawsze `false`. */
  brakWolnoUznacZaNieodbyte: boolean;
  /** Czy reguła cykliczna może dostać `odbylo_sie` ze wpisu wskazującego regułę. */
  regulaBierzeWpisReguly: boolean;
};

export const ZASADY_PRAWDZIWE: ZasadyWykonania = {
  werdyktLiczySie: true,
  brakWolnoUznacZaNieodbyte: false,
  regulaBierzeWpisReguly: false,
};

/**
 * ⭐ CO WIEMY O TYM WYSTĄPIENIU. `null`, gdy wystąpienie jest przed nami —
 * wtedy nie ma o czym rozstrzygać i milczenie jest jedyną prawdą.
 *
 * KOLEJNOŚĆ REGUŁ JEST TREŚCIĄ, NIE PORZĄDKIEM ALFABETYCZNYM:
 *
 *  1. przyszłość → `null`.
 *  2. ⭐ WERDYKT ZAWODNIKA WYGRYWA ze wszystkim innym. Jest jedynym dowodem
 *     wystawionym ŚWIADOMIE i O KONKRETNYM WYSTĄPIENIU; reszta to poszlaki
 *     o wierszu. Zawodnik, który mówi „nie odbyłem", ma być usłyszany także
 *     wtedy, gdy ktoś wcześniej postawił na tym wierszu `completed`.
 *  3. ⭐ odwołanie (`cancelled`) → `odwolane`. ZMIENIONE 16.08.2026 (pas K1):
 *     do tego dnia stało tu `nie_odbylo_sie`, czyli plakietka „Nie odbyło się"
 *     przy sesji, którą PRODUKT SAM zdjął z planu (12 z 12 odwołań na
 *     produkcji pochodziło z `adaptFocusBlock`). Pozycja zdjęta z planu to
 *     nadal DOWÓD i nadal nie jest domysłem — ale dowód O PLANIE, nie
 *     o zawodniku, więc dostaje własną wartość.
 *     ⛔ REGUŁA ZOSTAJE TRZECIA, nie druga: werdykt zawodnika (reguła 2) ma
 *     nadal wygrywać ze wszystkim. Kto sam powiedział „nie odbyłem" o dniu,
 *     w którym pozycję potem odwołano, ma być usłyszany.
 *  4. reguła cykliczna bez werdyktu → `brak_wpisu`. `daily_logs` wskazuje
 *     WIERSZ REGUŁY, więc jeden wpis o wtorkowym treningu oznaczałby „odbyło
 *     się" dla KAŻDEGO wtorku w historii — produkt policzyłby zawodnikowi
 *     pracę, której nie wykonał.
 *  5. `completed` → `odbylo_sie`.
 *  6. dziennik nieodczytany → `nie_odczytano`.
 *  7. wpis wskazuje tę pozycję → `odbylo_sie`.
 *  8. werdyktów nie udało się odczytać, a poszlaki milczą → `nie_odczytano`.
 *     ⚠️ Tu i tylko tu nieodczytane werdykty zmieniają wynik: gdyby zostało
 *     `brak_wpisu`, produkt powiedziałby „sprawdziłem i nic nie ma", a nie
 *     sprawdził. Przy `rodzaj: 'brak'` (tabeli nie ma) TO NIE ZACHODZI.
 *  9. → `brak_wpisu`. ⛔ I ZOSTAJE BRAKIEM WPISU. Żaden upływ czasu tego nie
 *     zmienia — asercja grupy 2 strażnika podaje datę sprzed roku.
 */
export function rozstrzygnijWykonanie(
  we: WejscieWykonania,
  zasady: ZasadyWykonania = ZASADY_PRAWDZIWE,
): StanWykonania | null {
  if (!we.przeszle) return null;

  if (zasady.werdyktLiczySie) {
    const w = werdyktDlaWystapienia(we.werdykty, we.idWydarzenia, we.dzien);
    if (w !== null) return w.werdykt;
  }

  // ⭐ PLAN-D-K1 — WŁASNA WARTOŚĆ, NIE „nie odbyło się". Patrz reguła 3 wyżej.
  if (we.status === 'cancelled') return 'odwolane';

  if (we.zRegulyCyklicznej && !zasady.regulaBierzeWpisReguly) {
    return brakAlboNieodczytano(we, zasady);
  }

  if (we.status === 'completed') return 'odbylo_sie';
  if (we.wpisyDziennika === null) return 'nie_odczytano';
  if (we.wpisyDziennika.has(we.idWydarzenia)) return 'odbylo_sie';

  return brakAlboNieodczytano(we, zasady);
}

function brakAlboNieodczytano(we: WejscieWykonania, zasady: ZasadyWykonania): StanWykonania {
  // ⛔ TA GAŁĄŹ JEST CAŁYM ZAKAZEM Z0 W JEDNEJ LINII. Nie ma tu żadnego
  // warunku o dacie, o tym, ile dni minęło, ani o niczym innym — bo brak
  // dowodu nie staje się dowodem z upływem czasu.
  if (zasady.brakWolnoUznacZaNieodbyte) return 'nie_odbylo_sie';
  if (we.werdykty.rodzaj === 'nie_odczytano') return 'nie_odczytano';
  return 'brak_wpisu';
}

/**
 * Czy TO wystąpienie da się dziś oznaczyć jako nieodbyte — i czy da się to
 * cofnąć. ⭐ Jedna akcja, odwracalna, i widać, że jest.
 *
 * ⛔ `brak` w polu `mozna` znaczy „nie pokazuj przycisku", a nie „pokaż
 * wyszarzony". Przycisk, który nic nie robi, uczy, że klikanie nic nie daje.
 */
export type AkcjaWystapienia =
  | { rodzaj: 'oznacz'; etykieta: string }
  | { rodzaj: 'cofnij'; etykieta: string }
  | { rodzaj: 'brak'; powod: string };

export function akcjaDlaWystapienia(we: WejscieWykonania): AkcjaWystapienia {
  if (!we.przeszle) {
    return { rodzaj: 'brak', powod: 'wystąpienie jest przed nami — nie ma o czym orzekać' };
  }
  // ⛔ Bez tabeli nie ma gdzie zapisać werdyktu. Przycisk, który po dotknięciu
  // zwraca błąd bazy, jest gorszy niż brak przycisku.
  if (we.werdykty.rodzaj !== 'jest') {
    return { rodzaj: 'brak', powod: we.werdykty.powod };
  }
  const w = werdyktDlaWystapienia(we.werdykty, we.idWydarzenia, we.dzien);
  if (w !== null) return { rodzaj: 'cofnij', etykieta: AKCJA_COFNIJ };

  // ⭐ AKCJA STOI DOKŁADNIE TAM, GDZIE JEST DZIURA — przy wystąpieniu, o którym
  // produkt nie wie NIC. Nie stawiamy jej przy „Zrobione" ani przy „Odwołane":
  // tam dowód już jest, a przycisk obok dowodu zaprasza do zaprzeczenia
  // własnemu wpisowi z Dziennika jednym przypadkowym dotknięciem.
  // ⚠️ PLAN-D-K1 — warunek `s !== 'brak_wpisu'` obejmuje PIĄTĄ wartość bez
  // zmiany: `odwolane` nie jest „brak wpisu", więc przycisku nadal nie ma.
  // To jest jedyny konsument, u którego piąta wartość NIC nie zmienia, i jest
  // to napisane wprost, żeby nie wyglądało na przeoczenie (D7).
  // ⛔ I nie stawiamy jej przy „Nie wiemy": dokładanie werdyktu do stanu, który
  // jest awarią odczytu, zapisałoby zdanie o dniu, którego nie znamy.
  const s = rozstrzygnijWykonanie(we);
  if (s !== 'brak_wpisu') {
    return { rodzaj: 'brak', powod: `stan wystąpienia to „${s}", a nie „brak wpisu"` };
  }
  return { rodzaj: 'oznacz', etykieta: AKCJA_NIE_ODBYLEM };
}

// ═══════════════════════════════════════════════════════════════════
// 5. ⭐ LICZNIK PRACY POD N1
// ═══════════════════════════════════════════════════════════════════
//
// N1 (zasady z 13.08.2026): nagradzamy WYKONANĄ PRACĘ, nie obecność, a licznik
// nigdy nie wraca do zera. Ten licznik odpowiada na pytanie „ile sesji odbyłeś
// w oknie N dni" i ma JEDNĄ twardą regułę, bez której kłamie:
//
// ⛔ „BEZ WPISU" NIE WCHODZI ANI DO LICZNIKA, ANI DO MIANOWNIKA.
//
// Gdyby wchodziło do mianownika, licznik MALAŁBY, kiedy zawodnik pracuje
// i nie zapisuje — czyli karałby go za nasz brak zapisu. Gdyby wchodziło do
// licznika, mówiłby, że coś się odbyło, choć nie wiemy.
// To samo dotyczy `nie_odczytano`: awaria odczytu nie jest pracą ani jej brakiem.

export type LicznikPracy =
  | {
      rodzaj: 'policzony';
      /** Wystąpienia z DOWODEM, że się odbyły. */
      odbyte: number;
      /** Wystąpienia z DOWODEM, że się nie odbyły. */
      nieodbyte: number;
      /** ⛔ Podane OSOBNO i NIE liczone. Ekran ma prawo to pokazać jako trzecią liczbę. */
      bezWpisu: number;
      /** Wystąpienia, o których odczyt się nie udał. Też poza licznikiem. */
      nieodczytane: number;
      /** `odbyte + nieodbyte`. ⛔ NIGDY nie zawiera „bez wpisu". */
      mianownik: number;
      oknoDni: number;
    }
  | {
      rodzaj: 'brak_podstawy';
      /**
       * ⛔ ŚWIADOMIE BEZ POLA `odbyte` i BEZ `mianownik`. Gdyby tu były, dałoby
       * się z nich narysować „0 z 0" — zdanie, które wygląda na pomiar i nim
       * nie jest. Ten sam wzorzec co stan `NIE_WIEM` w `lib/focusBlockProgress.ts`.
       */
      powod: string;
      bezWpisu: number;
      nieodczytane: number;
      oknoDni: number;
    };

export type WystapienieDoLicznika = {
  idWydarzenia: number;
  dzien: string;
  status: string;
  zRegulyCyklicznej: boolean;
};

/**
 * ⭐ ILE SESJI ODBYŁEŚ W OKNIE N DNI — z jawnym podziałem
 * odbyte · nieodbyte · bez wpisu.
 *
 * Okno to `[dzis - oknoDni + 1, dzis]`, czyli DZIŚ WŁĄCZNIE. Wystąpienia
 * z przyszłości nie wchodzą (nie ma o nich czego orzekać), a `dzis` wchodzi,
 * bo sesję dzisiejszą można już dziś odbyć albo nie odbyć.
 */
export function policzWykonanaPrace(
  args: {
    dzis: string;
    oknoDni: number;
    /** ⚠️ `null` = ODCZYT WYDARZEŃ SIĘ NIE UDAŁ, a nie „nic nie ma". */
    wystapienia: readonly WystapienieDoLicznika[] | null;
    wpisyDziennika: ReadonlySet<number> | null;
    werdykty: WejscieWerdyktow;
  },
  zasady: ZasadyWykonania = ZASADY_PRAWDZIWE,
): LicznikPracy {
  const oknoDni = args.oknoDni;
  if (args.wystapienia === null) {
    return {
      rodzaj: 'brak_podstawy',
      powod: 'nie odczytałem wydarzeń — nie wiem, ile sesji było w oknie',
      bezWpisu: 0,
      nieodczytane: 0,
      oknoDni,
    };
  }
  const od = przesunDate(args.dzis, -(oknoDni - 1));
  if (od === null) {
    return {
      rodzaj: 'brak_podstawy',
      powod: `nie umiem policzyć początku okna z daty „${args.dzis}" i ${oknoDni} dni`,
      bezWpisu: 0,
      nieodczytane: 0,
      oknoDni,
    };
  }

  let odbyte = 0;
  let nieodbyte = 0;
  let bezWpisu = 0;
  let nieodczytane = 0;

  for (const w of args.wystapienia) {
    if (!w || typeof w.idWydarzenia !== 'number') continue;
    if (typeof w.dzien !== 'string' || w.dzien.length < 10) continue;
    const dzien = w.dzien.slice(0, 10);
    if (dzien < od || dzien > args.dzis) continue;

    const stan = rozstrzygnijWykonanie({
      idWydarzenia: w.idWydarzenia,
      dzien,
      przeszle: true,
      status: w.status,
      zRegulyCyklicznej: w.zRegulyCyklicznej,
      wpisyDziennika: args.wpisyDziennika,
      werdykty: args.werdykty,
    }, zasady);

    // ⛔ PLAN-D-K1 16.08.2026 — GAŁĄŹ, BEZ KTÓREJ PIĄTY STAN ZEPSUŁBY LICZNIK
    // PO CICHU. Ten `if/else` nie ma `default`, więc `tsc` NIE POWIEDZIAŁBY
    // ani słowa: `odwolane` wpadłoby do ostatniego `else`, czyli do „bez
    // wpisu" — a wtedy mianownik zmalałby o wszystkie odwołane sesje i
    // zawodnik z 12 odwołaniami dostałby „brak podstawy" zamiast „0 z 12".
    // Odwołana sesja to nadal PRACA NIEWYKONANA i licznik ma ją tak widzieć.
    // Plakietka jest o tym, CO PRODUKT MÓWI ZAWODNIKOWI; licznik jest o tym,
    // ILE PRACY POWSTAŁO. Zmiana pierwszego nie ma prawa ruszyć drugiego —
    // pilnuje tego grupa 8 strażnika, na przypiętych liczbach sprzed pasa K1.
    if (stan === 'odbylo_sie') odbyte += 1;
    else if (stan === 'nie_odbylo_sie') nieodbyte += 1;
    else if (stan === 'odwolane') nieodbyte += 1;
    else if (stan === 'nie_odczytano') nieodczytane += 1;
    else bezWpisu += 1;
  }

  const mianownik = odbyte + nieodbyte;
  if (mianownik === 0) {
    return {
      rodzaj: 'brak_podstawy',
      powod: bezWpisu + nieodczytane > 0
        ? `w oknie ${oknoDni} dni żadne wystąpienie nie ma rozstrzygnięcia `
          + `(${bezWpisu} bez wpisu, ${nieodczytane} nieodczytanych)`
        : `w oknie ${oknoDni} dni nie ma ani jednego wystąpienia`,
      bezWpisu,
      nieodczytane,
      oknoDni,
    };
  }

  return { rodzaj: 'policzony', odbyte, nieodbyte, bezWpisu, nieodczytane, mianownik, oknoDni };
}

/**
 * Przesuwa datę `YYYY-MM-DD` o `oDni`. `null`, gdy wejście nie jest datą —
 * ⛔ nie „dzisiaj", nie pusty napis, nie NaN przemycony dalej.
 * Ta sama arytmetyka co `przesunTydzien` w `lib/widokTygodnia.ts`, tylko o dni.
 */
export function przesunDate(data: string, oDni: number): string | null {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(data)) return null;
  if (!Number.isFinite(oDni)) return null;
  const t = Date.parse(`${data.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  const d = new Date(t + oDni * 86400000);
  const iso = d.toISOString();
  return iso.slice(0, 10);
}

/** Zdanie do konsoli — żeby dało się zdiagnozować licznik po fakcie. */
export function opisLicznikaDoLogu(l: LicznikPracy): string {
  return l.rodzaj === 'policzony'
    ? `licznik pracy (${l.oknoDni} dni): ${l.odbyte} z ${l.mianownik} `
      + `· nieodbyte ${l.nieodbyte} · bez wpisu ${l.bezWpisu} (poza licznikiem) `
      + `· nieodczytane ${l.nieodczytane} (poza licznikiem)`
    : `licznik pracy (${l.oknoDni} dni): BRAK PODSTAWY — ${l.powod} `
      + `· bez wpisu ${l.bezWpisu} · nieodczytane ${l.nieodczytane}`;
}
