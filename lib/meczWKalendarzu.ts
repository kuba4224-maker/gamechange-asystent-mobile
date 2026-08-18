// PLAN-D-A7 08.2026 (14.08.2026) — NOWY PLIK.
//
//   npx tsx lib/meczWKalendarzu.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ── PO CO TEN PLIK ISTNIEJE ───────────────────────────────────────────
// Pomiar M5 (rejestr obietnic, 14.08.2026, powtórzony przeze mnie na żywej
// bazie tego samego dnia): `calendar_events` ma 24 wiersze i WSZYSTKIE 24 to
// `micro_session` ze `source='system'`. Zero meczów. Zero treningów klubowych.
// Zero pozycji dodanych przez zawodnika — mimo że i CHECK, i polityka RLS na to
// pozwalają od dawna. Kropki rozróżniające rodzaje w makiecie widoku tygodnia
// (`claude/MAKIETA_WIDOK_TYGODNIA.html`, legenda: „Sesja Bloku Skupienia
// (system zaplanował)" · „Trening — Ty dodałeś" · „Mecz" · „Zadanie wstawione
// w dzień") nie mają dziś czego rozróżniać.
//
// ⛔ NAJWAŻNIEJSZA REGUŁA TEGO PLIKU: MECZ MA JEDEN TOR.
// Zawodnik może zaplanować mecz w Kalendarzu (wydarzenie na przyszłość) i może
// opisać mecz na ekranie Mecz (`match_contexts`, mecz rozegrany). To są dwa
// wejścia do JEDNEJ rzeczy, a nie dwie rzeczy. Bez `zdecydujOWierszuMeczu`
// zawodnik, który zaplanował sobotni mecz, a potem go opisał, zobaczyłby ten
// sam mecz w kalendarzu DWA RAZY — i żaden test by tego nie złapał, bo oba
// zapisy są poprawne z osobna. Dokładnie ten wzorzec („cichy brak": funkcja,
// która nie zgłasza, że jest zepsuta) kosztował ten projekt najwięcej.
//
// ⚠️ ZERO Reacta, ZERO Supabase. Inaczej tych reguł nie da się sprawdzić bez
// ekranu i bez sieci, a reguła, której nie da się sprawdzić, cicho przestaje
// obowiązywać.
//
// ⚠️ CZEGO TEN PLIK NIE ROBI: nie wie, czy zapis się udał, i nie decyduje
// o brzmieniach na ekranie poza tymi, które eksportuje jawnie niżej.

import { walidujGodzine } from './godzinaWydarzenia';

// ═══════════════════════════════════════════════════════════════════
// 1. CO BAZA NAPRAWDĘ DOPUSZCZA — ZMIERZONE, NIE ZAŁOŻONE
// ═══════════════════════════════════════════════════════════════════
// Zapytanie (14.08.2026, projekt kqrbztsvepjtggjmmcdx):
//   select conname, pg_get_constraintdef(oid) from pg_constraint
//    where conrelid='public.calendar_events'::regclass and contype='c';
// Wynik, co do znaku:
//   chk_calendar_events_event_type  CHECK (event_type = ANY (ARRAY[
//       'club_training','own_training','micro_session','task','match']))
//   calendar_events_source_check    CHECK (source = ANY (ARRAY[
//       'system','coach','player']))
//   calendar_events_status_check    CHECK (status = ANY (ARRAY[
//       'scheduled','completed','cancelled']))
//   chk_calendar_events_scheduled_time  CHECK (scheduled_time IS NULL OR
//       (scheduled_time < '24:00:00' AND date_part('second', scheduled_time) = 0))
//   chk_recurrence_xor_date  CHECK ((recurrence_rule IS NOT NULL)
//       <> (scheduled_date IS NOT NULL))
//
// ⚠️ R4 (skill `praca-rownolegla-z-porzadkiem`): komentarz o kształcie danych
// z zewnętrznego źródła MUSI mieć datę i źródło. Ma je wyżej. Gdy CHECK się
// zmieni, ta lista rozjedzie się z bazą — i wtedy pierwsza rzecz, która to
// pokaże, to wiersz odrzucony kodem `23514`, a nie ten komentarz.

/** Pięć rodzajów, które `chk_calendar_events_event_type` przepuszcza. */
export const RODZAJE_WYDARZEN = [
  'club_training', 'own_training', 'micro_session', 'task', 'match',
] as const;
export type RodzajWydarzenia = (typeof RODZAJE_WYDARZEN)[number];

/** Trzy źródła, które `calendar_events_source_check` przepuszcza. */
export const ZRODLA_WYDARZEN = ['system', 'coach', 'player'] as const;
export type ZrodloWydarzenia = (typeof ZRODLA_WYDARZEN)[number];

/** Trzy statusy, które `calendar_events_status_check` przepuszcza. */
export const STATUSY_WYDARZEN = ['scheduled', 'completed', 'cancelled'] as const;
export type StatusWydarzenia = (typeof STATUSY_WYDARZEN)[number];

// ⚠️ `as const`, NIE `: RodzajWydarzenia` — inaczej typ szerokiej piątki
// przecieka do `WierszMeczuDoZapisu.event_type` i `tsc` odrzuca budowę wiersza
// meczu (TS2322, zmierzone). Wąski typ jest tu częścią reguły: wiersz meczu
// nie ma prawa powstać z innym rodzajem.
export const RODZAJ_MECZ = 'match' as const;
export const RODZAJ_TRENING_KLUBOWY = 'club_training' as const;

// ═══════════════════════════════════════════════════════════════════
// 2. RODZAJ, KTÓREGO NIE ZNAMY, MA SIĘ NAZWAĆ — A NIE PRZEJŚĆ
// ═══════════════════════════════════════════════════════════════════
// Reguła R5: pustka i brak wiedzy to dwie różne rzeczy i produkt musi je
// rozróżniać. Wzorzec `ETYKIETY[e.event_type] || e.event_type` (dziś w trzech
// plikach appki) łamie to po cichu: przy rodzaju spoza piątki pokazuje
// zawodnikowi SUROWĄ WARTOŚĆ Z BAZY („club_training"), która wygląda jak
// etykieta i przez to nikt nigdy nie zgłosi, że jej brakuje.

export type OpisRodzaju =
  | { znany: true; id: RodzajWydarzenia }
  | { znany: false; surowy: string; komunikat: string };

export function czyZnanyRodzaj(wartosc: unknown): wartosc is RodzajWydarzenia {
  return typeof wartosc === 'string' && (RODZAJE_WYDARZEN as readonly string[]).includes(wartosc);
}

/**
 * Rozstrzyga, czy rodzaj wydarzenia jest jednym z pięciu, które znamy.
 *
 * Przy nieznanym NIE zgaduje etykiety i NIE oddaje surowej wartości jako
 * nazwy — oddaje jawny stan „nie znam tego rodzaju" plus tekst do logu,
 * w którym stoi ta wartość. Ekran ma wtedy co narysować (`komunikat`),
 * a autor ma po czym poznać, że baza urosła o rodzaj, którego appka nie zna.
 */
export function opiszRodzaj(wartosc: unknown): OpisRodzaju {
  if (czyZnanyRodzaj(wartosc)) return { znany: true, id: wartosc };
  const surowy = typeof wartosc === 'string' ? wartosc : String(wartosc);
  return {
    znany: false,
    surowy,
    komunikat: 'Nie znam tego rodzaju wydarzenia',
  };
}

/** Tekst do konsoli — ma nazwać wartość, której appka nie rozumie. */
export function opisNieznanegoRodzajuDoLogu(opis: OpisRodzaju): string | null {
  if (opis.znany) return null;
  return `[PLAN-D-A7] calendar_events.event_type = „${opis.surowy}" — poza piątką znaną appce `
    + `(${RODZAJE_WYDARZEN.join(', ')}). Wiersz jest w bazie i zawodnik go widzi bez nazwy rodzaju.`;
}

// ═══════════════════════════════════════════════════════════════════
// 3. ŹRÓDŁO — „TY TO DODAŁEŚ" KONTRA „SYSTEM ZAPLANOWAŁ"
// ═══════════════════════════════════════════════════════════════════
// To NIE jest ozdobnik. Legenda makiety widoku tygodnia rozróżnia kropki
// właśnie po tym, kto pozycję wstawił — `d-blok` („system zaplanował") od
// `d-klub` („Ty dodałeś"). Rozróżnienie siedzi w kolumnie `source`, a nie
// w `event_type`: mikro-sesja Bloku i trening, który zawodnik wpisał sam,
// to dwie różne rzeczy dla zawodnika, choć obie są „wydarzeniem".
//
// ⚠️ BRZMIENIA PONIŻEJ SĄ WIDOCZNE DLA ZAWODNIKA — patrz sekcja 11 noty
// `claude/PRZEKAZANIE_PAS_A7_14_08_2026.md`, do przejrzenia przez Kubę.
// Wzięte z legendy makiety i z meta zadania („Ty to dodałeś · środa”),
// nie wymyślone tutaj.

export type OpisZrodla =
  | { znane: true; id: ZrodloWydarzenia; opis: string }
  | { znane: false; surowy: string; opis: string };

export function opiszZrodlo(wartosc: unknown): OpisZrodla {
  switch (wartosc) {
    case 'player': return { znane: true, id: 'player', opis: 'Ty to dodałeś' };
    case 'system': return { znane: true, id: 'system', opis: 'system zaplanował' };
    case 'coach': return { znane: true, id: 'coach', opis: 'dodał trener' };
    default: {
      const surowy = typeof wartosc === 'string' ? wartosc : String(wartosc);
      // ⚠️ `undefined` znaczy tu „ekran NIE POBRAŁ kolumny", a nie „nie ma
      // źródła" — kolumna jest NOT NULL (zmierzone 14.08.2026,
      // information_schema.columns). Dlatego opis mówi „nie wiemy", a nie
      // „brak": to jest brak wiedzy ekranu, nie brak danych.
      return { znane: false, surowy, opis: 'nie wiemy, skąd ta pozycja' };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// 4. GODZINA — PEŁNA MINUTA ALBO NIC
// ═══════════════════════════════════════════════════════════════════
// `chk_calendar_events_scheduled_time` odrzuca sekundy i `>= 24:00` kodem
// `23514`. Sprawdzanie tego DOPIERO po odpowiedzi bazy znaczy: zawodnik
// wypełnia formularz, klika zapisz i dostaje surowy błąd bazy. Ta funkcja
// jest tu po to, żeby to samo rozstrzygnięcie zapadło PRZED wysłaniem.
//
// ⚠️ PUSTO NIE JEST BŁĘDEM. Godzina jest opcjonalna z decyzji makiety
// („Godzina przy kaflu pojawia się tylko wtedy, gdy zawodnik ją podał").
// `walidujGodzine('')` odpowiada „to nie jest godzina" — i ma rację, bo
// odpowiada na inne pytanie. Tu pustka daje `{ zapisz: true, wartosc: null }`.

export type GodzinaDoZapisu =
  | { zapisz: true; wartosc: string | null }
  | { zapisz: false; powod: string };

export function przygotujGodzineDoZapisu(wejscie: unknown): GodzinaDoZapisu {
  if (wejscie === null || wejscie === undefined) return { zapisz: true, wartosc: null };
  if (typeof wejscie !== 'string') {
    return { zapisz: false, powod: 'Podaj godzinę w formacie 18:00.' };
  }
  // ⚠️ KOLEJNOŚĆ MA ZNACZENIE — najpierw pustka, potem format. Odwrotna
  // kolejność zamienia „25:00" w „nie podano godziny" i zapisuje po cichu
  // decyzję, której zawodnik nie podjął. Ten sam błąd złapał u siebie pas
  // A2+A3 (`claude/PRZEKAZANIE_PAS_A2_A3_14_08_2026.md`, mutacja M7).
  if (wejscie.trim() === '') return { zapisz: true, wartosc: null };
  const wynik = walidujGodzine(wejscie);
  if (!wynik.ok) return { zapisz: false, powod: wynik.powod };
  return { zapisz: true, wartosc: wynik.wartosc };
}

// ═══════════════════════════════════════════════════════════════════
// 5. ⭐ SEDNO: MECZ POWSTAJE JEDNYM TOREM
// ═══════════════════════════════════════════════════════════════════

/** Wiersz `calendar_events` w kształcie, jakiego ta decyzja potrzebuje. */
export type WierszKalendarzaDoDecyzji = {
  id: number;
  event_type: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  /** ⭐ PLAN-D-W2 — długość meczu, jeżeli wiersz już ją niesie. */
  planned_minutes?: number | null;
};

export type WierszMeczuDoZapisu = {
  user_id: string;
  event_type: 'match';
  source: 'player';
  status: StatusWydarzenia;
  title: string;
  scheduled_date: string;
  scheduled_time: string | null;
  /** ⭐ PLAN-D-W2 — długość MECZU (mianownik wagi), nie minuty zawodnika. `null` = nie wiemy. */
  planned_minutes: number | null;
};

export type DecyzjaOMeczu =
  | { rodzaj: 'utworz'; wiersz: WierszMeczuDoZapisu; powod: string }
  | { rodzaj: 'aktualizuj'; id: number; zmiany: Partial<WierszMeczuDoZapisu>; powod: string };

export type WejscieDecyzjiOMeczu = {
  userId: string;
  /** `YYYY-MM-DD` — dzień, którego mecz dotyczy. */
  data: string;
  /** `HH:MM` albo `null`, gdy zawodnik godziny nie podał. */
  godzina: string | null;
  /**
   * ⭐ PLAN-D-W2 — ile trwał mecz, w minutach. `null` = nie wiemy (R5).
   * ⛔ Nie mylić z `match_contexts.minutes_played` — to jest długość CAŁEGO
   * meczu, a tamto liczba minut, które zawodnik na nim spędził NA BOISKU.
   */
  dlugoscMeczu?: number | null;
  /** Tytuł kafla, np. „Mecz oficjalny". */
  tytul: string;
  /** WSZYSTKIE wydarzenia zawodnika, jakie ekran zdążył pobrać. */
  istniejace: readonly WierszKalendarzaDoDecyzji[];
};

/**
 * Rozstrzyga, czy opisany mecz ma ZAŁOŻYĆ nowy wiersz w kalendarzu, czy
 * DOMKNĄĆ ten, który zawodnik zaplanował wcześniej.
 *
 * Dopasowanie po parze (rodzaj `match`, `scheduled_date`) — bo to jest jedyna
 * para, którą zawodnik widzi jako „ten mecz". Wiersze `cancelled` są pomijane
 * świadomie: anulowany mecz to mecz, który się nie odbył, więc opisanie meczu
 * tego dnia jest nowym faktem, a nie domknięciem starego.
 *
 * ⚠️ Gdy pasujących wierszy jest więcej niż jeden, bierzemy NAJMNIEJSZE `id`
 * (najstarszy) i mówimy o tym w `powod`. Zduplikowane wiersze mogły powstać
 * przed tą rundą i nie wolno ich cicho pomnożyć.
 *
 * ⚠️ Ta funkcja NIE kasuje ani nie anuluje niczego. Kasowanie cudzych wierszy
 * jest decyzją, której nie podejmuje kod dopisujący jeden mecz.
 */
export function zdecydujOWierszuMeczu(wejscie: WejscieDecyzjiOMeczu): DecyzjaOMeczu {
  const { userId, data, godzina, tytul, istniejace } = wejscie;
  const dlugoscMeczu = typeof wejscie.dlugoscMeczu === 'number'
    && Number.isFinite(wejscie.dlugoscMeczu) && wejscie.dlugoscMeczu > 0
    ? wejscie.dlugoscMeczu : null;

  const pasujace = istniejace
    .filter((e) => e.event_type === RODZAJ_MECZ)
    .filter((e) => e.status !== 'cancelled')
    .filter((e) => e.scheduled_date === data)
    .slice()
    .sort((a, b) => a.id - b.id);

  if (pasujace.length === 0) {
    return {
      rodzaj: 'utworz',
      powod: `brak wiersza match na ${data} — zakładam nowy`,
      wiersz: {
        user_id: userId,
        event_type: RODZAJ_MECZ,
        source: 'player',
        status: 'completed',
        title: tytul,
        scheduled_date: data,
        scheduled_time: godzina,
        // ⭐ PLAN-D-W2 17.08.2026 — DŁUGOŚĆ MECZU, nie minuty zawodnika.
        // ⛔ To jest MIANOWNIK wagi meczu: punkty liczą się jako udział minut
        // na boisku w długości meczu. Bez tej liczby trzynastolatek grający
        // pełne 60 minut dostałby 3 punkty zamiast 4, bo produkt założyłby 90.
        // `null` = nie wiemy, i wtedy dopiero wchodzi założenie (R5).
        planned_minutes: dlugoscMeczu,
      },
    };
  }

  const cel = pasujace[0];
  const zmiany: Partial<WierszMeczuDoZapisu> = { status: 'completed' };
  // Godzina wpisana teraz NIE nadpisuje godziny, którą zawodnik podał,
  // planując ten mecz — nadpisanie skasowałoby jego wcześniejszą decyzję.
  // Uzupełnia wyłącznie pustkę.
  if (dlugoscMeczu !== null && (cel.planned_minutes === null || cel.planned_minutes === undefined)) {
    // ⛔ Tylko UZUPEŁNIAMY brak. Nadpisanie istniejącej długości zmieniłoby
    // mianownik wagi meczu, który już raz policzył zawodnikowi punkty.
    zmiany.planned_minutes = dlugoscMeczu;
  }
  if (godzina !== null && (cel.scheduled_time === null || cel.scheduled_time === undefined)) {
    zmiany.scheduled_time = godzina;
  }
  const ostrzezenie = pasujace.length > 1
    ? ` (uwaga: pasujących wierszy jest ${pasujace.length}, biorę najstarszy)`
    : '';
  return {
    rodzaj: 'aktualizuj',
    id: cel.id,
    zmiany,
    powod: `mecz na ${data} już jest w kalendarzu (id=${cel.id}) — domykam go zamiast zakładać drugi${ostrzezenie}`,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 6. PORAŻKA ZAPISU DO KALENDARZA NIE MOŻE BYĆ CICHA — ANI GŁOŚNA SUROWO
// ═══════════════════════════════════════════════════════════════════
// Warunek 3 polecenia A7: zapis meczu do `match_contexts` NIE MOŻE zależeć od
// powodzenia zapisu do `calendar_events` — ale porażka nie może być cicha
// (R5), i bez surowego błędu na ekranie.
//
// ⚠️ BRZMIENIE WIDOCZNE DLA ZAWODNIKA — do przejrzenia przez Kubę.

export const MECZ_ZAPISANY_BEZ_KALENDARZA =
  'Mecz zapisany. Nie udało się dodać go do kalendarza — spróbuj wpisać go tam ręcznie.';

/** Tekst do konsoli. Ma nieść powód, żeby dało się to zdiagnozować po fakcie. */
export function opisNieudanegoZapisuMeczuDoLogu(krok: 'odczyt' | 'utworz' | 'aktualizuj', powod: string): string {
  return `[PLAN-D-A7] mecz zapisany do match_contexts, ale krok „${krok}" na calendar_events `
    + `się nie powiódł: ${powod}. Wiersz meczu w kalendarzu NIE POWSTAŁ — zawodnik nie zobaczy `
    + 'tego meczu w widoku tygodnia ani w kalendarzu.';
}
