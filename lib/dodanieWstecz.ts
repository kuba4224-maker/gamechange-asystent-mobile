// PLAN-D-A1 08.2026 (18.08.2026) — NOWY PLIK. ŚCIEŻKA „+" Z DATĄ, KTÓRA
// MINĘŁA (A5).
//
// ═════════════════════════════════════════════════════════════════════
// PO CO TO ISTNIEJE — i co dziś dzieje się bez tego
// ═════════════════════════════════════════════════════════════════════
// `app/(tabs)/kalendarz.tsx:523` robi czysty
// `supabase.from('calendar_events').insert(body)` — ZERO sprawdzenia, czy
// tego dnia nie stoi już rzecz, o którą chodzi. Skutek jest przewidywalny
// i nie jest hipotezą: zawodnik, który w niedzielę wieczorem dopisuje
// „wczorajszy trening", tworzy DRUGI wiersz obok tego, który przyszedł
// z planu — jeden bez oceny i jeden z oceną. Od tej chwili licznik pracy
// dzieli się przez zawyżony mianownik, a tydzień pokazuje „nie wiemy"
// o dniu, o którym zawodnik właśnie powiedział wszystko.
//
// ⭐ REGUŁA MAKIETY v3 (`arkuszKolizja`): **nowe `calendar_events` powstaje
// DOPIERO PO „nie, to była inna rzecz".** Ten moduł jest tą bramką.
//
// ⛔ CZEGO TU NIE MA: zapisu, Supabase, Reacta. To jest czysta decyzja —
// da się ją sprawdzić uruchomieniem, bez bazy i bez ekranu.

/** Jedna rzecz z planu, o którą można zapytać „czy to była ona?". */
export type PozycjaBezOceny = {
  /** `calendar_events.id` — to, co dostanie ocenę zamiast duplikatu. */
  idWydarzenia: number;
  tytul: string;
  /** Godzina albo `null`. ⛔ `null` to „nie znamy", nie „00:00". */
  godzina: string | null;
};

export type StanDodaniaWstecz =
  /** ⭐ Są nieocenione rzeczy z planu — PYTAMY, zanim cokolwiek utworzymy. */
  | { rodzaj: 'pytamy'; data: string; pozycje: PozycjaBezOceny[]; powod: string }
  /** Sprawdziliśmy i nie ma z czym pomylić — wolno dodać od razu. */
  | { rodzaj: 'wolno_dodac'; data: string; powod: string }
  /** ⛔ TRZECIA WARTOŚĆ (R5): nie udało się sprawdzić. NIE jest to „pusto". */
  | { rodzaj: 'nie_wiemy'; data: string; powod: string };

export type WejscieDodaniaWstecz = {
  /**
   * Data, na którą zawodnik dodaje rzecz (`YYYY-MM-DD`).
   * ⛔ `null` znaczy „NIE WIEMY, którego dnia to dotyczy" — i to jest osobny
   * stan, nie „dziś" (R5). Wchodzi tędy awaria odczytu pytań: skoro nie wiemy,
   * o co pytać, to nie wiemy też, o który dzień.
   */
  data: string | null;
  /** Dzisiejsza data (`YYYY-MM-DD`). */
  dzis: string;
  /**
   * Nieocenione pozycje planu tego dnia.
   * ⛔ `null` znaczy „NIE UDAŁO SIĘ ODCZYTAĆ" i prowadzi do `nie_wiemy`.
   * Pusta tablica znaczy „odczytałem i nic nie ma" — to dwie różne rzeczy.
   */
  nieocenione: PozycjaBezOceny[] | null;
};

/**
 * ⭐ CZY PRZED DODANIEM TRZEBA ZAPYTAĆ.
 *
 * ⛔ DATA W PRZYSZŁOŚCI ALBO DZISIEJSZA NIE PYTA O NIC. Rzecz, która jeszcze
 * nie minęła, nie ma jak być duplikatem czegoś ocenionego — pytanie byłoby
 * przeszkodą, nie zabezpieczeniem (makieta v3, przypis `arkuszKolizja`).
 */
export function sprawdzPrzedDodaniem(we: WejscieDodaniaWstecz): StanDodaniaWstecz {
  // ⛔ NIE ZNAMY DNIA — nie ma o co pytać i nie udajemy, że wiemy (R5, Z0).
  if (we.data === null) {
    return {
      rodzaj: 'nie_wiemy',
      data: '',
      powod: 'nie wiemy, którego dnia dotyczy dodanie — pytania o wystąpienia nie dały się odczytać',
    };
  }
  if (we.data >= we.dzis) {
    return {
      rodzaj: 'wolno_dodac',
      data: we.data,
      powod: `data ${we.data} nie minęła (dziś ${we.dzis}) — nie ma czego pomylić`,
    };
  }
  if (we.nieocenione === null) {
    return {
      rodzaj: 'nie_wiemy',
      data: we.data,
      powod: `nie udało się odczytać planu na ${we.data} — nie twierdzimy, że był pusty`,
    };
  }
  if (we.nieocenione.length === 0) {
    return {
      rodzaj: 'wolno_dodac',
      data: we.data,
      powod: `odczytałem plan na ${we.data} i nie ma tam ani jednej rzeczy bez oceny`,
    };
  }
  return {
    rodzaj: 'pytamy',
    data: we.data,
    pozycje: we.nieocenione,
    powod: `${we.data}: ${we.nieocenione.length} rzeczy z planu bez oceny — pytamy przed utworzeniem`,
  };
}

/** Co zawodnik odpowiedział na pytanie o kolizję. */
export type OdpowiedzNaKolizje =
  /** „to było to" — wskazał pozycję z planu; ⛔ nowy wiersz NIE powstaje */
  | { rodzaj: 'to_bylo_to'; idWydarzenia: number }
  /** „nie, to była inna rzecz" — dopiero teraz wolno utworzyć wiersz */
  | { rodzaj: 'inna_rzecz' }
  /** zawodnik jeszcze nie odpowiedział */
  | { rodzaj: 'brak_odpowiedzi' };

/**
 * ⭐ BRAMKA. To jest jedyne miejsce, w którym pada zdanie „wolno utworzyć
 * nowe `calendar_events`".
 *
 * ⛔ `nie_wiemy` PRZEPUSZCZA. Zablokowanie dodania przy nieudanym odczycie
 * odebrałoby zawodnikowi jedyną drogę zapisania pracy z powodu awarii
 * PO NASZEJ stronie. Ryzyko duplikatu jest mniejsze niż ryzyko utraty wpisu
 * — i to jest decyzja, nie przeoczenie.
 */
export function wolnoUtworzycWydarzenie(
  stan: StanDodaniaWstecz,
  odpowiedz: OdpowiedzNaKolizje,
): { wolno: boolean; powod: string } {
  if (stan.rodzaj === 'wolno_dodac') return { wolno: true, powod: stan.powod };
  if (stan.rodzaj === 'nie_wiemy') {
    return { wolno: true, powod: `${stan.powod}; przepuszczamy, żeby awaria odczytu nie zjadła wpisu` };
  }
  if (odpowiedz.rodzaj === 'inna_rzecz') {
    return { wolno: true, powod: `zawodnik powiedział „to była inna rzecz" — ${stan.powod}` };
  }
  if (odpowiedz.rodzaj === 'to_bylo_to') {
    return {
      wolno: false,
      powod: `zawodnik wskazał pozycję ${odpowiedz.idWydarzenia} z planu — oceniamy ją zamiast tworzyć drugą`,
    };
  }
  return { wolno: false, powod: `pytanie o ${stan.pozycje.length} nieocenionych rzeczy jeszcze bez odpowiedzi` };
}

// ═════════════════════════════════════════════════════════════════════
// BRZMIENIA — jedno miejsce, zero drugiego słownika
// ═════════════════════════════════════════════════════════════════════
export const KOLIZJA_PYTANIE = (ile: number) =>
  `Tego dnia miałeś w planie ${ile} ${ile === 1 ? 'rzecz' : 'rzeczy'} bez oceny.`;
export const KOLIZJA_PODPYTANIE = 'Czy to była jedna z nich?';
export const KOLIZJA_TO_BYLO_TO = 'to było to →';
export const KOLIZJA_INNA_RZECZ = 'Nie, to była inna rzecz';
export const KOLIZJA_PRZYPIS =
  'Nowe wydarzenie powstaje dopiero po „nie". Ten krok istnieje po to, '
  + 'żeby ten sam trening nie wpadł do kalendarza dwa razy — raz z planu, raz z ręki.';
export const KOLIZJA_NIC_NIE_STALO =
  'Sprawdziliśmy plan tego dnia, zanim zapytaliśmy — nie ma z czym tego pomylić.';
export const KOLIZJA_NIE_ODCZYTANE =
  'Nie udało się odczytać planu tego dnia. Nie powiemy, że był pusty — dodajemy, '
  + 'a gdyby to jednak był duplikat, poprawisz go w Kalendarzu.';
