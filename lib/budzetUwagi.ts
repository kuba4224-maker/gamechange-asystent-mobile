// PLAN-D-A 08.2026 (11.08.2026) — NOWY PLIK. Czysta logika budżetu uwagi,
// wyjęta z `components/FocusBlockPlanner.tsx`.
//
// DLACZEGO OSOBNY PLIK, A NIE ZOSTAWIENIE JEJ W KOMPONENCIE. Te funkcje
// budują ZDANIA, które zawodnik czyta w chwili odmowy — a to jest dokładnie
// ten rodzaj reguły, którą da się zepsuć po cichu: liczba przestaje się
// parsować, komunikat traci wyjście, na ekran wycieka surowy tekst z bazy.
// Dopóki mieszkały w `.tsx`, nie dało się ich uruchomić bez Reacta, bo import
// komponentu ciągnie za sobą `react-native`. Ten plik nie importuje niczego,
// więc `lib/budzetUwagi.selftest.ts` przechodzi je w całości w node.
// Ten sam wzorzec co `lib/contentDose.ts`, `lib/rediagnosis.ts`
// i `lib/focusBlockProgress.ts`: decyzja w `lib/`, rysowanie w komponencie.
//
// ── SKĄD SIĘ BIORĄ TE LICZBY (stan bazy z 10.08.2026) ──
// Indeks `one_active_focus_block_per_pillar` został USUNIĘTY i zastąpiony
// dwiema różnymi regułami:
//   • REGUŁA DANYCH — `one_active_focus_block_per_segment`, UNIQUE
//     (user_id, segment_id) WHERE status='active'. Dwa otwarte Bloki nad tą
//     samą rzeczą to bezsens niezależnie od decyzji produktowej.
//   • REGUŁA UWAGI — wyzwalacz `trg_check_focus_budget`: najwyżej 2 otwarte
//     Bloki i suma `sessions_per_week` ≤ 4. Podnosi SQLSTATE `GC001`
//     z komunikatem zaczynającym się od `BUDZET_UWAGI:` i liczbami w `hint`.
//
// ⚠️ KOMUNIKAT „Masz już aktywny Blok w tej kategorii" ZNIKNĄŁ, bo od
// 10.08.2026 jest NIEPRAWDZIWY. Ograniczeniem nie jest kategoria ani filar —
// zawodnik może mieć Bloki w dwóch segmentach jednego filaru, jeśli mieszczą
// się w budżecie.

// PLAN-D-J 08.2026 — ograniczenia arbitra (sekcja na końcu pliku).
import { obowiazuje, type StanOgraniczen, type Obowiazuje } from './ograniczenia';

/** Kształt zwracany przez `focus_budget_state()` (odczyt 10.08.2026). */
export type BudzetStan = {
  limit_blokow: number;
  uzyte_bloki: number;
  limit_jednostek: number;
  uzyte_jednostki: number;
  wolne_jednostki: number;
  mozna_zaczac: boolean;
};

/** Reguła R5: „nie wiem" jest osobnym stanem, nigdy zerem. */
export type BudzetView =
  | { kind: 'loading' }
  | { kind: 'unknown' }
  | { kind: 'ready'; stan: BudzetStan };

/** Otwarty Blok zawodnika — tyle, ile trzeba, żeby powiedzieć KTÓRY zamknąć. */
export type OtwartyBlok = { id: string; label: string; jednostki: number };

/**
 * Odmiana rzeczownika po liczbie: „1 sesję", „3 sesje", „5 sesji".
 * ⚠️ To jest MIANOWNIK PO LICZEBNIKU. Po przyimku „z" idzie dopełniacz i tam
 * zawsze jest „sesji", niezależnie od liczby — dlatego zdanie „0 z 4 sesji"
 * NIE używa tej funkcji (błąd złapany na telefonie 11.08.2026).
 */
export function jednostkiSlowo(n: number): string {
  if (n === 1) return 'sesję';
  const ostatnia = n % 10;
  const dwie = n % 100;
  if (ostatnia >= 2 && ostatnia <= 4 && !(dwie >= 12 && dwie <= 14)) return 'sesje';
  return 'sesji';
}

/**
 * `hint` z wyzwalacza ma postać `koszt=3;wolne=1;limit_jednostek=4`.
 * Nieznany kształt daje same `null` — czyli „nie wiem", nie zero.
 */
export function parseBudzetHint(hint: string | null | undefined): {
  koszt: number | null; wolne: number | null; limitJednostek: number | null;
} {
  const wynik = { koszt: null as number | null, wolne: null as number | null, limitJednostek: null as number | null };
  if (typeof hint !== 'string') return wynik;
  for (const kawalek of hint.split(';')) {
    const [k, v] = kawalek.split('=');
    const n = Number((v ?? '').trim());
    if (!Number.isFinite(n)) continue;
    const klucz = (k ?? '').trim();
    if (klucz === 'koszt') wynik.koszt = n;
    else if (klucz === 'wolne') wynik.wolne = n;
    else if (klucz === 'limit_jednostek') wynik.limitJednostek = n;
  }
  return wynik;
}

/**
 * Komunikat, który daje WYJŚCIE, nie ścianę. Nigdy nie pokazuje surowego
 * tekstu z bazy — `BUDZET_UWAGI: ...` jest napisane dla programisty.
 * Gdy liczb zabrakło (nieznany kształt `hint`), mówi to wprost zamiast
 * zmyślać zero.
 */
export function budzetBlokadaKomunikat(
  hint: string | null | undefined,
  otwarte: OtwartyBlok[],
): string {
  const { koszt, wolne, limitJednostek } = parseBudzetHint(hint);
  const zdania: string[] = [];

  if (koszt != null && wolne != null) {
    zdania.push(
      `Ten Blok kosztuje ${koszt} ${jednostkiSlowo(koszt)} w tygodniu, a masz wolne: ${wolne}`
      + (limitJednostek != null ? ` z ${limitJednostek}.` : '.'),
    );
  } else {
    zdania.push('Ten Blok nie mieści się w Twoim tygodniu — masz już zajętą całą uwagę.');
  }

  if (otwarte.length > 0) {
    const lista = otwarte.map((b) => `${b.label} (${b.jednostki})`).join(', ');
    zdania.push(`Zamknij jeden z otwartych Bloków: ${lista}.`);
  } else {
    // Nie wiemy, co zamknąć — i mówimy to, zamiast wysyłać zawodnika donikąd.
    zdania.push('Zamknij jeden z otwartych Bloków na liście wąskich gardeł.');
  }

  if (wolne != null && wolne > 0) {
    zdania.push(`Możesz też zaznaczyć mniej dni — ${wolne} ${wolne === 1 ? 'zmieści się' : 'zmieszczą się'} teraz.`);
  }
  return zdania.join(' ');
}

/**
 * Rozpoznanie nazwanego wyjątku budżetu — po kodzie SQLSTATE **ALBO** po
 * prefiksie komunikatu. Dwie drogi świadomie: nie zostało sprawdzone na żywo,
 * czy klient bazy przenosi SQLSTATE do pola `code` dla wyjątków z wyzwalacza,
 * a pomyłka w tę stronę oznacza surowy tekst bazy na ekranie zawodnika.
 */
export function isBudzetError(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null;
  if (!err) return false;
  if (err.code === 'GC001') return true;
  return typeof err.message === 'string' && err.message.trim().startsWith('BUDZET_UWAGI:');
}

// ─────────────────────────────────────────────────────────────────────
// PLAN-D-J 08.2026 (12.08.2026) — OGRANICZENIA ARBITRA DOCIERAJĄ DO BLOKU
// ─────────────────────────────────────────────────────────────────────
// Do 12.08.2026 arbiter potrafił stwierdzić, że zawodnik rośnie szybciej niż
// 7,2 cm/rok, i włączał stan „Blok nie zwiększa objętości" (spec 3.2) —
// a planer Bloku o tym stanie NIE WIEDZIAŁ, bo cron wyrzucał `ograniczenia`
// przed zapisem. Zawodnik w szczycie wzrastania, czyli w okresie, w którym
// urazy zabierają 96 zamiast 24 dni absencji na 1000 godzin, dostawał od
// produktu dokładnie to samo zaproszenie do podbicia objętości co każdy inny.
//
// ⚠️ TO JEST STAN, NIE KOMUNIKAT. Funkcje niżej nie budują kartki o Osłonie —
// zmieniają LICZBY, którymi planer się posługuje. Kartkę (kartę głosu tygodnia
// „Rośniesz teraz szybko") produkt już ma i jej brzmienie jest zatwierdzone.


// ⚠️ PLAN-D-P 08.2026 (13.08.2026) — TU BYŁ SUFIT HORYZONTU BLOKU.
// `TYGODNI_PRZY_CZEKAM_NA_DECYZJE = 4` i `sufitTygodni()` obsługiwały wyłącznie
// stan `exit_mode.state = 'paused_decision'` przez ograniczenie
// `blokSkracaHoryzontDoDecyzji`. Stanu nie dało się nigdzie włączyć — żaden
// ekran go nie ustawiał — więc funkcja przycinała horyzont, który nigdy nie był
// przycinany, a liczba 4 czekała na decyzję Kuby, której nie było po co
// podejmować. Cała gałąź została skasowana (pas P, zadanie P8). Wraca razem
// z wejściem do tego stanu, gdy takie powstanie; opis, czym była, stoi w nocie
// przekazania pasa P.

export type SufitObjetosci = {
  /** Górna granica sesji w tygodniu ŁĄCZNIE. `null` = nie znam budżetu. */
  maxJednostek: number | null;
  /** Ile jeszcze wolno dołożyć. `null` = nie znam budżetu. */
  wolneJednostki: number | null;
  /** Trzy stany, nigdy dwa. */
  ograniczenie: Obowiazuje;
  /**
   * Spec 3.2: „BLOK nie proponuje zwiększenia objętości; JEŚLI JUŻ ZAPLANOWAŁ —
   * PROPONUJE REDUKCJĘ". To jest ta druga połowa zdania.
   */
  proponowacRedukcje: boolean;
  /** Zdanie do konsoli i do raportu. Nigdy na ekran zawodnika. */
  powod: string;
};

/**
 * Sufit tygodniowy Bloku po nałożeniu ograniczenia `blokNieZwiekszaObjetosci`.
 *
 * REGUŁA, KTÓRA Z TEGO WYCHODZI:
 *   • ograniczenie NIE obowiązuje → sufit to normalny limit budżetu uwagi;
 *   • ograniczenie OBOWIĄZUJE     → sufit spada do tego, co zawodnik JUŻ robi
 *     (minimum 1, żeby ktoś, kto nie ma jeszcze nic, mógł zacząć od jednej
 *     sesji — produkt nie może przestać działać przez cały skok wzrostowy);
 *   • NIE WIEM                    → sufit zostaje normalny, ale stan jest
 *     NAZWANY. Zaciśnięcie na domyśle odcięłoby planowanie każdemu, kto nie
 *     ma pomiarów wzrostu, czyli dziś prawie wszystkim.
 */
export function sufitObjetosci(budzet: BudzetView, stanOgraniczen: StanOgraniczen): SufitObjetosci {
  const ograniczenie = obowiazuje(stanOgraniczen, 'blokNieZwiekszaObjetosci');

  if (budzet.kind !== 'ready') {
    // R5: brak budżetu to nie zero. Nie zmyślamy sufitu z niczego.
    return {
      maxJednostek: null,
      wolneJednostki: null,
      ograniczenie,
      proponowacRedukcje: false,
      powod: `nie znam budżetu uwagi (${budzet.kind}) — sufitu nie liczę`,
    };
  }

  const s = budzet.stan;
  if (ograniczenie === 'tak') {
    const max = Math.max(1, s.uzyte_jednostki);
    return {
      maxJednostek: max,
      wolneJednostki: Math.max(0, max - s.uzyte_jednostki),
      ograniczenie,
      // „Już zaplanował" = ma cokolwiek zajęte. Wtedy nie ma czego dołożyć
      // i jedyne, co planer może zaproponować, to zejście niżej.
      proponowacRedukcje: s.uzyte_jednostki > 0,
      powod: 'blokNieZwiekszaObjetosci obowiązuje: sufit spada z '
        + `${s.limit_jednostek} do ${max} (tyle, ile już robisz)`,
    };
  }

  return {
    maxJednostek: s.limit_jednostek,
    wolneJednostki: s.wolne_jednostki,
    ograniczenie,
    proponowacRedukcje: false,
    powod: ograniczenie === 'nie_wiem'
      ? 'blokNieZwiekszaObjetosci NIEROZSTRZYGNIĘTE — sufit zostaje normalny, '
        + 'bo zaciskanie na domyśle odcięłoby planowanie wszystkim bez pomiarów wzrostu'
      : 'blokNieZwiekszaObjetosci nie obowiązuje — sufit normalny',
  };
}

/**
 * Ile dni tygodnia wolno mieć zaznaczonych. Osobno od `sufitObjetosci`, bo
 * planer zaznacza dni PO tym, jak zawodnik zadeklarował częstotliwość, a
 * ograniczenie musi obciąć obie liczby, nie jedną.
 */
export function ograniczLiczbeDni(ileZaznaczono: number, sufit: SufitObjetosci): number {
  if (sufit.maxJednostek === null) return ileZaznaczono;
  return Math.min(ileZaznaczono, Math.max(1, sufit.maxJednostek));
}
