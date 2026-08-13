// PLAN-D-K 08.2026 (13.08.2026) — NOWY PLIK. CO SIĘ DZIEJE, GDY DOSTĘP WYGASA.
//
// ── PO CO TEN PLIK POWSTAŁ ────────────────────────────────────────────
// Do 13.08.2026 aplikacja NIE MIAŁA ANI JEDNEGO WEJŚCIA do stanu własnego
// dostępu. Pomiar (13.08.2026, `grep -rn "trial\|subscription\|active_access"`
// po `app/`, `lib/` i `components/`): zero trafień merytorycznych — jedyne
// dopasowania to `parent_report_subscriptions` i `listener.subscription`.
//
// Skutek był mierzalny i brzydki: `user_has_active_access` bramkuje w RLS
// KAŻDY istotny zapis (cel, sesja, wpis w Dzienniku, głos tygodnia). W dniu
// wygaśnięcia baza zaczynała odrzucać zapisy kodem `42501`, a zawodnik widział
// wyłącznie `Nie udało się zapisać: new row violates row-level security policy`.
// Produkt milkł i nie mówił ani co się stało, ani że nic nie zginęło.
//
// ⚠️ POMIAR NA PRODUKCJI, 13.08.2026, w transakcji cofniętej: przy wygaszonym
// dostępie `insert into daily_logs` kończy się `42501`, a JEDNOCZEŚNIE wszystkie
// odczyty Mapy drogi przechodzą (`road_segments` 4, `road_factors` 88,
// `users` 1, `exit_mode` 0, `weekly_voice` 1). To nie jest przypuszczenie —
// to jest wynik zapytania.
//
// ── DWIE ZASADY, KTÓRE TRZYMAJĄ TEN PLIK ──────────────────────────────
//
// 1. ⚠️ TRZY STANY, NIGDY DWA (reguła R5, ten sam wzorzec co `ograniczenia.ts`).
//    „Nie mam dostępu" i „nie udało mi się odczytać, czy mam dostęp" to dwie
//    różne rzeczy. Bez tego rozróżnienia zawodnik z chwilowym brakiem sieci
//    zobaczyłby komunikat o wygaśnięciu — czyli produkt skłamałby mu w twarz.
//
// 2. ⚠️ BRAK DOSTĘPU NIE WYCISZA MAPY DROGI. `coDzialaBezDostepu()` jest
//    jedynym miejscem, w którym ta lista stoi, i pilnuje jej strażnik
//    `lib/okresProbnyIObserwacje.selftest.ts`. Mapa drogi ma działać bez ani
//    jednej danej o zawodniku — a więc tym bardziej bez ważnego dostępu.

/** Nazwa funkcji bazy. Stała, bo napis wklepany w kilku plikach cicho przestaje trafiać. */
export const RPC_STAN_DOSTEPU = 'stan_dostepu';

/**
 * ⚠️ TU NIE MA I NIE MOŻE BYĆ DATY KOŃCA PILOTAŻU.
 * Jedyne miejsce, w którym ta data stoi, to funkcja bazy
 * `public.koniec_okresu_probnego_pilotazu()`. Appka ją ODCZYTUJE
 * (pole `koniec_pilotazu` w odpowiedzi), nigdy nie zna jej z pamięci.
 * Wpisanie tu literału zapala strażnika `okresProbnyIObserwacje.selftest.ts`.
 */
export const DATA_KONCA_PILOTAZU_ZYJE_W_BAZIE =
  'public.koniec_okresu_probnego_pilotazu()';

export type ZrodloDostepu = 'subskrypcja' | 'okres_probny' | 'brak' | 'nieznane';

export type StanDostepu =
  /** Zapytanie się nie udało (brak sieci, timeout, brak funkcji w bazie). NIE znaczy „brak dostępu". */
  | { rodzaj: 'nie_odczytane'; powod: string }
  /** Baza odpowiedziała, że nikt nie jest zalogowany. */
  | { rodzaj: 'niezalogowany'; powod: string }
  /** Odczyt się udał. */
  | {
    rodzaj: 'znany';
    maDostep: boolean;
    zrodlo: ZrodloDostepu;
    /** Wartość spoza znanych źródeł — baza wie coś, czego ta wersja appki nie wie. */
    nieznaneZrodlo: string | null;
    okresProbnyDo: Date | null;
    subskrypcjaStatus: string | null;
    koniecPilotazu: Date | null;
    teraz: Date | null;
  };

const ZNANE_ZRODLA: readonly string[] = ['subskrypcja', 'okres_probny', 'brak'];

function data(x: unknown): Date | null {
  if (typeof x !== 'string' || x.length === 0) return null;
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Surowa odpowiedź `rpc('stan_dostepu')` → stan.
 *
 * @param surowe wartość zwrócona przez RPC albo `undefined`, gdy wywołania nie było
 * @param bladOdczytu komunikat błędu; `null`, gdy odczyt się udał
 */
export function czytajStanDostepu(
  surowe: unknown,
  bladOdczytu: string | null = null,
): StanDostepu {
  if (bladOdczytu) {
    return { rodzaj: 'nie_odczytane', powod: `nie odczytałem stanu dostępu: ${bladOdczytu}` };
  }
  if (surowe === undefined || surowe === null) {
    return { rodzaj: 'nie_odczytane', powod: 'baza nie zwróciła stanu dostępu' };
  }
  if (typeof surowe !== 'object' || Array.isArray(surowe)) {
    return { rodzaj: 'nie_odczytane', powod: `stan dostępu ma nieznany kształt (${typeof surowe})` };
  }
  const s = surowe as Record<string, unknown>;
  if (s.rozpoznane !== true) {
    return {
      rodzaj: 'niezalogowany',
      powod: typeof s.powod === 'string' ? s.powod : 'baza nie rozpoznała zalogowanego zawodnika',
    };
  }
  if (typeof s.ma_dostep !== 'boolean') {
    return { rodzaj: 'nie_odczytane', powod: 'w odpowiedzi nie ma pola „ma_dostep"' };
  }
  const zrodloSurowe = typeof s.zrodlo === 'string' ? s.zrodlo : '';
  const znane = ZNANE_ZRODLA.includes(zrodloSurowe);
  return {
    rodzaj: 'znany',
    maDostep: s.ma_dostep,
    zrodlo: (znane ? zrodloSurowe : 'nieznane') as ZrodloDostepu,
    nieznaneZrodlo: znane ? null : (zrodloSurowe || null),
    okresProbnyDo: data(s.okres_probny_do),
    subskrypcjaStatus: typeof s.subskrypcja_status === 'string' ? s.subskrypcja_status : null,
    koniecPilotazu: data(s.koniec_pilotazu),
    teraz: data(s.teraz),
  };
}

/**
 * Czy ten błąd zapisu to odmowa dostępu, a nie awaria.
 *
 * `42501` to `insufficient_privilege` — kod, którym PostgREST odpowiada, gdy
 * polityka RLS z bramką `user_has_active_access` odrzuci `insert`/`update`.
 * ⚠️ POMIERZONE, NIE ZAPAMIĘTANE: 13.08.2026 na produkcji, w transakcji
 * cofniętej, `insert into daily_logs` przy wygaszonym dostępie zwrócił
 * dokładnie `42501`.
 */
export function toJestBrakDostepu(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null;
  if (!err) return false;
  if (err.code === '42501') return true;
  const m = typeof err.message === 'string' ? err.message.toLowerCase() : '';
  return m.includes('row-level security') || m.includes('row level security');
}

// ─────────────────────────────────────────────────────────────────────
// CO DZIAŁA BEZ WAŻNEGO DOSTĘPU — JEDNO ŹRÓDŁO PRAWDY
// ─────────────────────────────────────────────────────────────────────
// ⚠️ TO NIE JEST DOKUMENTACJA. To jest wejście dla strażnika
// `lib/okresProbnyIObserwacje.selftest.ts`, który sprawdza REGUŁĘ:
// `mapaDrogi` musi tu stać na `true`, a `components/MojaDroga.tsx` nie może
// w ogóle sięgać po stan dostępu. Dopisanie warunku dostępu do Mapy zapala
// strażnika, zamiast po cichu zgasić jedyne narzędzie, które ma działać zawsze.
export type CoDziala = {
  /** Ekran „Ja → Moja droga". Czyta wyłącznie treść wspólną i własne dane — zero bramek. */
  mapaDrogi: boolean;
  /** Wszystko, co zawodnik już zapisał. Polityki SELECT nie mają bramki `user_has_active_access`. */
  odczytWlasnychDanych: boolean;
  /** Punkt pomocy — dostępny z każdego ekranu, bez detekcji, bez zapisu. */
  punktPomocy: boolean;
  /** Nowy wpis w Dzienniku, nowy cel, nowa sesja, zapis głosu tygodnia. */
  nowyZapis: boolean;
};

export function coDzialaBezDostepu(): CoDziala {
  return {
    mapaDrogi: true,
    odczytWlasnychDanych: true,
    punktPomocy: true,
    nowyZapis: false,
  };
}

// ─────────────────────────────────────────────────────────────────────
// BRZMIENIE — ⚠️ DO PRZEJRZENIA PRZEZ KUBĘ, NIE WDROŻONE JAKO OSTATECZNE
// ─────────────────────────────────────────────────────────────────────
// Trzy rzeczy, które ten komunikat MUSI nieść (polecenie K2):
//   1. co wygasło,
//   2. co nadal działa — Mapa drogi działa w koncie ograniczonym,
//   3. czego zawodnik nie stracił — nic nie zostało skasowane.
//
// ⛔ ZAKAZ SPRZEDAŻY W TYM MIEJSCU. Nie ma tu ceny, przycisku zakupu,
// odliczania ani zdania zaczynającego się od „wystarczy, że". Komunikat mówi,
// co się stało — nie namawia. Kto dołoży tu CTA, złamie polecenie K2.
//
// ⛔ ZAKAZ STRASZENIA. Zero „stracisz", zero „ostatnia szansa", zero liczby dni
// wyświetlanej jako odliczanie.

/** Znacznik dla strażnika i dla Kuby. Nie usuwać do czasu zatwierdzenia brzmienia. */
export const BRZMIENIE_DO_PRZEJRZENIA = 'DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-K, 13.08.2026)';

export type KomunikatDostepu = {
  tytul: string;
  /** 1 — co wygasło. */
  coWygaslo: string;
  /** 2 — co nadal działa. */
  coDziala: string;
  /** 3 — czego nie stracił. */
  czegoNieStracil: string;
  doPrzejrzenia: string;
};

export const KOMUNIKAT_WYGASNIECIA: KomunikatDostepu = {
  tytul: 'Twój okres próbny się skończył',
  coWygaslo:
    'Od dziś aplikacja nie zapisze nowego wpisu w Dzienniku, nowego celu ani nowej sesji.',
  coDziala:
    'Mapa drogi działa dalej — cała, tak samo jak wczoraj. Wszystko, co już zapisałeś, nadal czytasz.',
  czegoNieStracil:
    'Nic nie zostało skasowane. Twoje wpisy, cele i diagnozy są na miejscu.',
  doPrzejrzenia: BRZMIENIE_DO_PRZEJRZENIA,
};

/**
 * Zdanie przy nieudanym zapisie — w miejscu, w którym zawodnik uderza w ścianę.
 * Świadomie KRÓTSZE od karty w Profilu: przy zapisie liczy się odpowiedź na
 * pytanie „dlaczego to się nie zapisało", a nie cały wykład.
 */
export const ZAPIS_ODRZUCONY_BRAK_DOSTEPU =
  'Nie zapisałem tego — Twój okres próbny się skończył. '
  + 'Nic nie zginęło: wszystko, co zapisałeś wcześniej, jest na miejscu, a Mapa drogi działa dalej. '
  + 'Szczegóły w Profilu.';

/** Zdanie do konsoli — żeby na pytanie „dlaczego ekran wyglądał wtedy tak" dało się odpowiedzieć. */
export function opisDostepuDoLogu(stan: StanDostepu): string {
  if (stan.rodzaj === 'nie_odczytane') return `dostęp: NIE ODCZYTANY — ${stan.powod}`;
  if (stan.rodzaj === 'niezalogowany') return `dostęp: NIEZALOGOWANY — ${stan.powod}`;
  const czesci = [
    stan.maDostep ? 'jest' : 'BRAK',
    `źródło: ${stan.zrodlo}`,
    `okres próbny do: ${stan.okresProbnyDo ? stan.okresProbnyDo.toISOString() : 'brak daty'}`,
    `subskrypcja: ${stan.subskrypcjaStatus ?? 'brak wiersza'}`,
  ];
  if (stan.nieznaneZrodlo) {
    czesci.push(`ŹRÓDŁO SPOZA TEJ WERSJI APPKI: ${stan.nieznaneZrodlo} (baza wie więcej niż appka)`);
  }
  return `dostęp: ${czesci.join(' · ')}`;
}
