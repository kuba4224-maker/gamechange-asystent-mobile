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
