// ZMIANA OBRAZU B5 08.08.2026 — NOWY PLIK.
// Warstwa I/O rediagnozy przy zamknięciu Bloku Skupienia. Osobno od czystej
// logiki (lib/rediagnosis.ts) — ten sam rozdział co livingDiagnosisCascade.ts
// vs livingDiagnosisPulses.ts, i z tego samego powodu: logikę da się wtedy
// uruchomić bez sieci i bez appki.
//
// ŻADNEJ NOWEJ TABELI I ŻADNEJ MIGRACJI. Polecenie kazało najpierw sprawdzić,
// czy `diagnostics` i `living_diagnosis_pulses` nie uniosą tego bez migracji —
// unoszą, i to bez naciągania:
//
//   • punkt odniesienia  → `diagnostics.scores` z ostatniej diagnozy SPRZED
//     startu Bloku (`created_at <= started_at`). Filtr `event='email_submitted'`
//     jest ten sam co w diagnoza.tsx, ja.tsx i livingDiagnosisPulses.ts —
//     `diagnostics` to log zdarzeń, nie jeden wiersz na diagnozę;
//   • dzisiejsza odpowiedź → `living_diagnosis_pulses`: `user_id`,
//     `segment_id`, `response_value smallint 1-6`, `created_at`. To jest
//     DOKŁADNIE kształt jednej odpowiedzi na jedno pytanie segmentowe —
//     tabela została zaprojektowana pod ten sam bank pytań (patrz
//     claude/INTEGRACJA_DIAGNOZA_ZYWA_SQL.md).
//
// ⚠️ TO NIE JEST ODMROŻENIE `LIVING_DIAGNOSIS_PULSE_ENABLED`. Ta flaga chowa
// KARTĘ na ekranie Dziś (pytanie co ~3 dni, którego nikt nie czytał) i zostaje
// `false`. Tu reużywamy banku pytań, skali i tabeli — nie ekranu. Zapis stąd
// ma zresztą skutek uboczny, który jest pożądany: gdyby puls kiedyś wrócił,
// bramka świeżości (21 dni) nie zapyta o segment, o który właśnie zapytaliśmy.
//
// PLAN-D-P 08.2026 (13.08.2026) — CZWARTY ODCZYT: CO OBOWIĄZUJE W TYM TYGODNIU.
// Reguła uratowana z Kalibracji („spadku nie nazywa się spadkiem u kogoś, kto
// akurat szybko rośnie") potrzebuje stanu Osłony, a ten mieszka w kopercie
// `weekly_voice.ograniczenia`. Odczyt jest tu, a nie w komponencie, bo
// komponent nie robi zapytań — i nie w `lib/rediagnosis.ts`, bo tamten plik nie
// zna Supabase i musi dać się uruchomić w node.
//
// ⚠️ BEZ TEGO ODCZYTU REGUŁA BYŁABY MARTWA. `buildRediagnosisView` bez koperty
// odpowiada `nie_wiem` i mówi dokładnie to, co mówiło przed tą rundą — czyli
// przeniesienie reguły wyglądałoby na zrobione i nie zmieniłoby ani jednego
// zdania na ekranie. To jest wzorzec 26 pozycji „JEST, ALE MARTWE" z audytu M.
import { supabase } from './supabase';
import { saveLivingDiagnosisPulse } from './livingDiagnosisPulses';
import { isMissingTableError } from './componentHints';
import { parseScores } from '../components/diagnosisProfile';
import { baselineFromScores, type RediagnosisBaseline } from './rediagnosis';
import {
  czytajOgraniczenia,
  isMissingOgraniczeniaColumnError,
  KOLUMNA_OGRANICZEN,
  type StanOgraniczen,
} from './ograniczenia';
import { poniedzialekTygodnia as poniedzialekGlosu } from './glosTygodnia';

export type RediagnosisContext = {
  baseline: RediagnosisBaseline;
  /** Odpowiedź już udzielona po starcie tego Bloku — wtedy nie pytamy drugi raz. */
  existingAnswer: number | null;
  /** Pozycja z profilu, do wariantu treści pytania. */
  positionPrimary: string | null;
  /** Tabela pulsów nie istnieje w bazie — patrz reguła R5. Nie blokuje stacji,
   *  ale zapis się nie uda i zawodnik zobaczy o tym jedno zdanie. */
  pulsesTableMissing: boolean;
  /** (PLAN-D-P) Koperta ograniczeń na bieżący tydzień. Nigdy `null` — brak
   *  odczytu to jawny stan `nie_odczytane`, nie „nic nie obowiązuje". */
  ograniczenia: StanOgraniczen;
};

export async function fetchRediagnosisContext(params: {
  userId: string;
  segmentId: string;
  blockStartedAt: string;
  /** ⚠️ REGUŁA E-N2: „dzisiaj" wchodzi parametrem, nie z zegara w środku. */
  teraz?: Date;
}): Promise<RediagnosisContext> {
  const { userId, segmentId, blockStartedAt, teraz = new Date() } = params;

  const [diagRes, pulseRes, profileRes, ogrRes] = await Promise.all([
    // „Diagnoza sprzed bloku", nie „najnowsza diagnoza". Gdyby zawodnik zrobił
    // pełną rediagnozę W TRAKCIE Bloku, porównanie z nią pokazywałoby zmianę z
    // połowy okresu i zjadłoby część efektu pracy.
    supabase.from('diagnostics').select('scores,created_at')
      .eq('user_id', userId).eq('event', 'email_submitted')
      .lte('created_at', blockStartedAt)
      .order('created_at', { ascending: false }).limit(1),
    // Odpowiedź udzielona już po starcie Bloku = ta stacja została przerobiona.
    // Bez tego ponowne otwarcie przeglądu zamknięcia pytałoby w kółko i
    // zapisywało kolejne wiersze.
    supabase.from('living_diagnosis_pulses').select('response_value,created_at')
      .eq('user_id', userId).eq('segment_id', segmentId)
      .gte('created_at', blockStartedAt)
      .order('created_at', { ascending: false }).limit(1),
    supabase.from('player_profiles').select('position_primary')
      .eq('user_id', userId).limit(1),
    // (PLAN-D-P) Koperta ograniczeń na BIEŻĄCY tydzień — ten sam wzorzec
    // odczytu co w `components/MojaDroga.tsx` i na ekranie „Dziś".
    supabase.from('weekly_voice')
      .select(`week_start, ${KOLUMNA_OGRANICZEN}`)
      .eq('user_id', userId)
      .eq('week_start', poniedzialekGlosu(teraz))
      .limit(1),
  ]);

  // Trzy różne rzeczy, trzy różne stany — nigdy jeden wspólny „pusto".
  let baseline: RediagnosisBaseline;
  if (diagRes.error) {
    baseline = { state: 'error' };
  } else if (!diagRes.data || diagRes.data.length === 0) {
    baseline = { state: 'no_diagnosis' };
  } else {
    baseline = baselineFromScores(parseScores((diagRes.data[0] as { scores: unknown }).scores), segmentId);
  }

  const pulsesTableMissing = !!pulseRes.error && isMissingTableError(pulseRes.error);
  const rawAnswer = pulseRes.error ? null : (pulseRes.data?.[0] as { response_value: number } | undefined);
  const existingAnswer =
    rawAnswer && typeof rawAnswer.response_value === 'number' ? rawAnswer.response_value : null;

  // (PLAN-D-P) Trzy stany, nigdy dwa: brak kolumny ≠ brak koperty ≠ błąd odczytu.
  const wierszOgr = (ogrRes.data ?? [])[0] as Record<string, unknown> | undefined;
  const ograniczenia = ogrRes.error && isMissingOgraniczeniaColumnError(ogrRes.error)
    ? czytajOgraniczenia(undefined, `kolumny „${KOLUMNA_OGRANICZEN}" nie ma jeszcze w bazie`)
    : czytajOgraniczenia(
      wierszOgr ? wierszOgr[KOLUMNA_OGRANICZEN] : null,
      ogrRes.error ? ogrRes.error.message : null,
    );

  return {
    baseline,
    existingAnswer,
    positionPrimary: profileRes.error ? null : (profileRes.data?.[0]?.position_primary ?? null),
    pulsesTableMissing,
    ograniczenia,
  };
}

/**
 * Zapis odpowiedzi. Świadomie NIE ma tu własnego `insert` — woła
 * `saveLivingDiagnosisPulse()`, żeby kształt zapisywanego wiersza istniał
 * w projekcie w jednym miejscu.
 *
 * Pominięcie NIE woła tej funkcji w ogóle: nic się nie zapisuje i nic nie
 * liczy się jako spadek.
 */
export async function saveRediagnosisAnswer(
  userId: string,
  segmentId: string,
  value: number
): Promise<{ saved: boolean }> {
  const { error } = await saveLivingDiagnosisPulse(userId, segmentId, value);
  return { saved: !error };
}
