// PLAN-D-L2 08.2026 (15.08.2026) — NOWY PLIK. RAPORT O MNIE JEST MÓJ.
//
// PO CO TEN PLIK ISTNIEJE — jednym zdaniem: żeby dziecko mogło zobaczyć
// i wyłączyć raport, który co miesiąc opisuje jego życie obcej osobie.
//
// ⚠️ ZMIERZONE 15.08.2026, NIE ZAŁOŻONE. `public.parent_report_subscriptions`
// MA trzy polityki RLS właściciela — sprawdzone zapytaniem do `pg_policies`
// na produkcji (projekt `kqrbztsvepjtggjmmcdx`):
//     parent_report_owner_select  [SELECT] using  (auth.uid() = player_user_id)
//     parent_report_owner_insert  [INSERT] check  (auth.uid() = player_user_id)
//     parent_report_owner_update  [UPDATE] using + check (auth.uid() = player_user_id)
// Komentarz w `app/(tabs)/profil.tsx` twierdził od 06.08.2026 coś odwrotnego
// i przez dziewięć dni appka NIE PYTAŁA bazy o coś, o co wolno jej było
// zapytać (O67). Ten plik istnieje po to, żeby pytała. Dosłowne brzmienie
// tamtego zdania zostało spisane w `claude/PRZEKAZANIE_PAS_L2_15_08_2026.md`
// i jest w tym repozytorium ZAKAZANE — pilnuje tego selftest, sekcja 6.
//
// ⛔ POLITYKI DELETE NIE MA I NIE MA BYĆ. Wypisanie to `active = false`
// plus `unsubscribed_at`, nigdy skasowanie wiersza — historia wysyłek
// o nieletnim ma zostać.
//
// ⚠️ TEN PLIK JEST CZYSTY: bez Reacta, bez Supabase, bez zegara, bez sieci.
// Pilnuje tego `lib/raportRodzica.selftest.ts` (sekcja 8).

// Rejestry Z0 mają w tym repozytorium JEDNO źródło — `lib/zadania.ts`.
// Trzecia kopia tej listy (druga stoi w `lib/wgladyZAlgorytmu.ts` jako
// `RejestrZnaczenia`) byłaby gwarantowanym rozjazdem.
import type { RejestrZ0 } from './zadania';
import { MONTHS_GENITIVE_PL } from './date-utils';

// ─────────────────────────────────────────────────────────────────────
// 1. CO CZYTAMY Z BAZY
// ─────────────────────────────────────────────────────────────────────

/** Nazwa tabeli w jednym miejscu — żeby literówka w ekranie nie przeszła cicho. */
export const TABELA_SUBSKRYPCJI = 'parent_report_subscriptions';

/**
 * Lista kolumn do `select`. ⚠️ `access_token` ŚWIADOMIE POZA listą: polityka
 * SELECT pozwoliłaby zawodnikowi go odczytać, ale token jest kluczem do pełnej
 * treści raportu bez logowania i nie ma po co leżeć w pamięci ekranu.
 */
export const KOLUMNY_SUBSKRYPCJI = 'id,parent_email,active,last_sent_at';

/** Surowy wiersz, dokładnie w kształcie kolumn z `KOLUMNY_SUBSKRYPCJI`. */
export type WierszSubskrypcji = {
  id: number;
  parent_email: string;
  active: boolean;
  last_sent_at: string | null;
};

/** Jedna żywa subskrypcja — to, co widzi zawodnik. */
export type AktywnaSubskrypcja = {
  id: number;
  email: string;
  /** ISO z bazy albo `null`, gdy jeszcze nic nie poszło. */
  ostatniaWysylka: string | null;
};

/**
 * TRZY STANY ODCZYTU, NIGDY DWA (reguła R5).
 *
 * Czwarty stan — „jeszcze nie pytałem" — to `null` po stronie ekranu,
 * tym samym wzorcem co `stanDostepu` i `stanPlanuLekcji` w `profil.tsx`.
 * `opisStanuRaportu` przyjmuje `null` i daje mu WŁASNE zdanie, więc cztery
 * stany są rozróżnialne aż do ekranu.
 *
 * ⛔ NIE WOLNO skleić `nie_udalo_sie` z `brak`. Błąd uprawnień, który wygląda
 * jak „nikt nie dostaje raportu o Tobie", mówi dziecku nieprawdę w jedynej
 * sprawie, w której ten ekran w ogóle istnieje.
 */
export type StanRaportuRodzica =
  | { rodzaj: 'brak'; wypisanych: number }
  | { rodzaj: 'jest'; aktywne: AktywnaSubskrypcja[]; wypisanych: number }
  | { rodzaj: 'nie_udalo_sie'; powod: string };

/** Klucz stanu widoczny dla ekranu — cztery, razem z „jeszcze nie pytałem". */
export type KluczStanuRaportu = 'nie_pytalem' | 'brak' | 'jest' | 'nie_udalo_sie';

// ─────────────────────────────────────────────────────────────────────
// 2. BRZMIENIA
//
// ⚠️ Zdania niżej pochodzą WPROST z polecenia pasa L2. Zdania mówiące
// o RELACJI z rodzicem („Twój rodzic…", „rodzic nie dostanie kolejnego")
// należą do Kuby i NIE MA ICH w tym pliku — stoją w nocie pasa jako
// propozycje. Tutaj są wyłącznie fakty i komunikaty techniczne.
// ─────────────────────────────────────────────────────────────────────

/** Rejestr Z0 przy każdym zdaniu — bez niego zdanie nie wychodzi na ekran. */
export type ZdanieRaportu = { tekst: string; rejestr: RejestrZ0 };

export const ZDANIE_NIE_PYTALEM = 'Sprawdzam, czy ktoś dostaje raport o Tobie…';
export const ZDANIE_NIKT_NIE_DOSTAJE = 'Nikt nie dostaje raportu o Tobie.';
export const ZDANIE_NIE_UDALO_SIE = 'Nie udało się sprawdzić, czy ktoś dostaje raport o Tobie.';
export const ZDANIE_JEST_NAGLOWEK = 'Raport o Tobie dostaje:';

export const KOMUNIKAT_JUZ_DOSTAJE = 'Ten adres już dostaje raport.';
export const KOMUNIKAT_WYLACZONY = 'Raport wyłączony.';
export const KOMUNIKAT_WLACZONY_PONOWNIE = 'Raport włączony na ten adres.';
export const KOMUNIKAT_ZAPISANY = 'Zapisano — ten adres będzie dostawał raport.';
export const KOMUNIKAT_BLAD_WYLACZENIA =
  'Nie udało się wyłączyć raportu — nic się nie zmieniło. Spróbuj jeszcze raz.';
export const KOMUNIKAT_BLAD_ZAPISU =
  'Nie udało się zapisać adresu — nic się nie zmieniło. Spróbuj jeszcze raz.';
export const KOMUNIKAT_ZLY_EMAIL = 'Podaj prawidłowy adres email rodzica.';

export const ETYKIETA_WYLACZ = 'Przestań wysyłać raport';

// ─────────────────────────────────────────────────────────────────────
// 3. ODCZYT — trzy stany plus błąd, nigdy sklejone
// ─────────────────────────────────────────────────────────────────────

function czytajWiersz(x: unknown): WierszSubskrypcji | null {
  if (typeof x !== 'object' || x === null) return null;
  const r = x as Record<string, unknown>;
  if (typeof r.id !== 'number' || !Number.isFinite(r.id)) return null;
  if (typeof r.parent_email !== 'string' || r.parent_email.trim() === '') return null;
  if (typeof r.active !== 'boolean') return null;
  const ostatnia = r.last_sent_at;
  if (ostatnia !== null && ostatnia !== undefined && typeof ostatnia !== 'string') return null;
  return {
    id: r.id,
    parent_email: r.parent_email,
    active: r.active,
    last_sent_at: typeof ostatnia === 'string' ? ostatnia : null,
  };
}

/**
 * ⚠️ PRZYJMUJE CAŁĄ ODPOWIEDŹ, nie samą tablicę — ten sam wzorzec co
 * `odczytZadan` w `lib/zadania.ts`. Funkcja, która dostaje tylko `data`,
 * NIE MA JAK odróżnić „pusto" od „nie wolno mi było zapytać", i dlatego
 * `data ?? []` jest w tym repozytorium wzorcem zakazanym.
 *
 * @param dane        `data` z PostgREST — oczekiwana tablica wierszy.
 * @param bladOdczytu `error.message` albo `null`.
 */
export function czytajSubskrypcje(dane: unknown, bladOdczytu: string | null): StanRaportuRodzica {
  // ⛔ BŁĄD MA PIERWSZEŃSTWO NAD WSZYSTKIM. To jest cała istota R5 w tym pliku.
  if (bladOdczytu !== null && bladOdczytu !== undefined && String(bladOdczytu).trim() !== '') {
    return { rodzaj: 'nie_udalo_sie', powod: String(bladOdczytu) };
  }
  // Odpowiedź, która nie jest listą, NIE JEST pustą listą.
  if (!Array.isArray(dane)) {
    return { rodzaj: 'nie_udalo_sie', powod: 'odpowiedź bazy nie jest listą wierszy' };
  }

  const wiersze = dane.map(czytajWiersz).filter((w): w is WierszSubskrypcji => w !== null);
  // Wiersze były, ale ANI JEDNEGO nie zrozumieliśmy → to nie jest „nikt nie
  // dostaje", tylko „nie umiem tego przeczytać".
  if (dane.length > 0 && wiersze.length === 0) {
    return { rodzaj: 'nie_udalo_sie', powod: 'żadnego wiersza nie dało się odczytać' };
  }

  const aktywne = wiersze
    .filter((w) => w.active)
    .map((w) => ({ id: w.id, email: w.parent_email, ostatniaWysylka: w.last_sent_at }));
  const wypisanych = wiersze.length - aktywne.length;

  if (aktywne.length === 0) return { rodzaj: 'brak', wypisanych };
  return { rodzaj: 'jest', aktywne, wypisanych };
}

/** Opis stanu dla ekranu. `null` = „jeszcze nie pytałem" — czwarty stan. */
export function opisStanuRaportu(stan: StanRaportuRodzica | null): {
  klucz: KluczStanuRaportu;
  zdanie: ZdanieRaportu;
  pokazListe: boolean;
} {
  if (stan === null) {
    return { klucz: 'nie_pytalem', zdanie: { tekst: ZDANIE_NIE_PYTALEM, rejestr: 'fakt_o_tobie' }, pokazListe: false };
  }
  if (stan.rodzaj === 'nie_udalo_sie') {
    return { klucz: 'nie_udalo_sie', zdanie: { tekst: ZDANIE_NIE_UDALO_SIE, rejestr: 'fakt_o_tobie' }, pokazListe: false };
  }
  if (stan.rodzaj === 'brak') {
    return { klucz: 'brak', zdanie: { tekst: ZDANIE_NIKT_NIE_DOSTAJE, rejestr: 'fakt_o_tobie' }, pokazListe: false };
  }
  return { klucz: 'jest', zdanie: { tekst: ZDANIE_JEST_NAGLOWEK, rejestr: 'fakt_o_tobie' }, pokazListe: true };
}

/**
 * „Kiedy poszedł ostatni raport" — jedna z czterech liczb P0 tego pasa.
 *
 * ⚠️ Bez `Intl`: na Hermesie `toLocaleDateString('pl-PL')` potrafi oddać
 * miesiąc po angielsku (B37) — dlatego miesiąc bierzemy z kanonicznej listy
 * `MONTHS_GENITIVE_PL`. Data liczona z LOKALNYCH getterów, nie z `toISOString`
 * (ten sam powód co `toLocalDateStr`: okno 22:00–02:00 przesuwa dzień).
 */
export function opisOstatniejWysylki(iso: string | null): ZdanieRaportu {
  if (iso === null || iso === undefined || String(iso).trim() === '') {
    return { tekst: 'Jeszcze żaden raport nie poszedł.', rejestr: 'fakt_o_tobie' };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { tekst: 'Nie wiadomo, kiedy poszedł ostatni raport.', rejestr: 'fakt_o_tobie' };
  }
  const dzien = d.getDate();
  const miesiac = MONTHS_GENITIVE_PL[d.getMonth()];
  return { tekst: `Ostatni raport poszedł ${dzien} ${miesiac} ${d.getFullYear()}.`, rejestr: 'fakt_o_tobie' };
}

// ─────────────────────────────────────────────────────────────────────
// 4. ADRES — jedna para na zawodnika
// ─────────────────────────────────────────────────────────────────────

/**
 * `Mama@dom.pl` i `mama@dom.pl` to jeden rodzic i JEDNA skrzynka.
 * Ta funkcja jest lustrem `lower(parent_email)` z indeksu migracji L2 —
 * jeżeli któraś strona się zmieni, druga musi zmienić się w tym samym pasie.
 */
export function normalizujEmail(surowy: string): string {
  return String(surowy ?? '').trim().toLowerCase();
}

/** Walidacja „zawiera @" — ten sam, świadomie prosty wzorzec co logowanie. */
export function sprawdzEmail(surowy: string): { ok: true; email: string } | { ok: false; blad: string } {
  const email = String(surowy ?? '').trim();
  if (email === '' || !email.includes('@')) return { ok: false, blad: KOMUNIKAT_ZLY_EMAIL };
  return { ok: true, email };
}

/**
 * KTÓRA ŚCIEŻKA ZAPISU — liczona z tego, co NAPRAWDĘ jest w bazie.
 *
 * ⚠️ DLACZEGO NIE `upsert`. PostgREST przyjmuje w `on_conflict` WYŁĄCZNIE
 * nazwy kolumn, a unikat z migracji L2 stoi na WYRAŻENIU `lower(parent_email)`.
 * `on_conflict=player_user_id,parent_email` nie pasuje do tego indeksu
 * i Postgres odpowiada `42P10` — zmierzone na PostgreSQL 16 w kontenerze
 * sesji (patrz nota pasa, sekcja „dowody"). Dlatego ścieżka jest jawna:
 * najpierw patrzymy, co jest, potem reaktywujemy albo wstawiamy.
 *
 * @param stan   wynik `czytajSubskrypcje` — **stan odczytany**, nie życzenie.
 * @param email  adres wpisany przez zawodnika (przed normalizacją).
 * @param wiersze wszystkie wiersze zawodnika (także nieaktywne) — potrzebne,
 *                bo reaktywacja dotyczy wiersza, którego już nie widać na liście.
 */
export function sciezkaZapisu(
  stan: StanRaportuRodzica | null,
  email: string,
  wiersze: WierszSubskrypcji[],
):
  | { rodzaj: 'nie_wiem' }
  | { rodzaj: 'juz_aktywny' }
  | { rodzaj: 'reaktywuj'; id: number }
  | { rodzaj: 'nowy' } {
  // ⛔ Nie pytałem albo nie udało się odczytać → NIE ZGADUJEMY. Zapis
  // „na ślepo" wprost pod unikat kończy się surowym `23505` na ekranie dziecka.
  if (stan === null || stan.rodzaj === 'nie_udalo_sie') return { rodzaj: 'nie_wiem' };

  const szukany = normalizujEmail(email);
  if (szukany === '') return { rodzaj: 'nie_wiem' };

  const trafienia = wiersze.filter((w) => normalizujEmail(w.parent_email) === szukany);
  if (trafienia.some((w) => w.active)) return { rodzaj: 'juz_aktywny' };

  const doReaktywacji = trafienia.find((w) => !w.active);
  if (doReaktywacji) return { rodzaj: 'reaktywuj', id: doReaktywacji.id };

  return { rodzaj: 'nowy' };
}

// ─────────────────────────────────────────────────────────────────────
// 5. ZMIANA — dowodem jest LICZBA WIERSZY, nie brak błędu (O61)
// ─────────────────────────────────────────────────────────────────────

/**
 * ⛔ `update` pod RLS, który nie trafił w żaden wiersz, NIE RZUCA WYJĄTKU —
 * zmienia zero wierszy i z appki wygląda dokładnie jak sukces (O61).
 * Dlatego każda zmiana idzie z `.select('id')`, a dowodem jest to, że wróciła
 * DOKŁADNIE JEDNA pozycja.
 *
 * @param dane `data` z PostgREST po `.select('id')`.
 * @param blad `error.message` albo `null`.
 */
export function wynikZmiany(
  dane: unknown,
  blad: string | null,
): { ok: true; id: number } | { ok: false; powod: string; ile: number } {
  if (blad !== null && blad !== undefined && String(blad).trim() !== '') {
    return { ok: false, powod: String(blad), ile: -1 };
  }
  if (!Array.isArray(dane)) return { ok: false, powod: 'odpowiedź bazy nie jest listą wierszy', ile: -1 };
  if (dane.length === 0) {
    // Najczęstszy powód: polityka RLS nie wpuściła — cudzy wiersz albo
    // wygasła sesja. Cokolwiek to było, NIC SIĘ NIE ZMIENIŁO.
    return { ok: false, powod: 'zmiana nie objęła żadnego wiersza', ile: 0 };
  }
  if (dane.length > 1) {
    return { ok: false, powod: 'zmiana objęła więcej niż jeden wiersz', ile: dane.length };
  }
  const w = dane[0] as Record<string, unknown>;
  const id = typeof w?.id === 'number' ? w.id : -1;
  if (id < 0) return { ok: false, powod: 'wiersz wrócił bez identyfikatora', ile: 1 };
  return { ok: true, id };
}

/** Ładunek wypisania. `active = false` + znacznik. ⛔ Nigdy `delete`. */
export function ladunekWylaczenia(teraz: string): { active: false; unsubscribed_at: string } {
  return { active: false, unsubscribed_at: teraz };
}

/** Ładunek reaktywacji — znacznik wypisania MUSI zniknąć, inaczej kłamie. */
export function ladunekReaktywacji(): { active: true; unsubscribed_at: null } {
  return { active: true, unsubscribed_at: null };
}

/**
 * Naruszenie unikatu z migracji L2. Po jej wykonaniu drugie kliknięcie
 * „Zapisz" na ten sam adres przestaje tworzyć duplikat i zaczyna zwracać
 * `23505` — a surowy błąd bazy na ekranie dziecka jest tak samo zły jak
 * cichy duplikat.
 */
export function toJestDuplikat(blad: { code?: string; message?: string } | null | undefined): boolean {
  if (!blad) return false;
  if (blad.code === '23505') return true;
  const m = String(blad.message ?? '');
  return m.includes('23505') || /duplicate key value/i.test(m);
}
