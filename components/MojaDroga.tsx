// PLAN-D-E 08.2026 (11.08.2026) — NOWY PLIK. Ekran „Ja → Moja droga".
//
// Reguły i cały rachunek: `lib/mapaDrogi.ts` (czysta logika + selftest).
// Tutaj są WYŁĄCZNIE zapytania i rysowanie. Ani jednej reguły w tym pliku.
//
// ── DLACZEGO TO JEST MODAL, A NIE PLIK W `app/(tabs)/` ─────────────────
// Expo Router pokazuje w pasku KAŻDY plik z `app/(tabs)/`, także ten, którego
// nie wymieniono w `(tabs)/_layout.tsx`. Nowy plik bez wpisu `href: null`
// pojawiłby się jako PIĄTA ZAKŁADKA i skasował decyzję B8 — zakaz numer 10
// z kontraktu budowy. Wpis w `_layout.tsx` jest poza pasem tej sesji
// (pracują tam równolegle inne sesje), więc trasy NIE zakładam: ekran wchodzi
// jako pełnoekranowy modal otwierany z „Ja". Dla zawodnika różnica jest żadna,
// a ryzyko piątej zakładki spada do zera.
// Gdy sesja główna otworzy `(tabs)/_layout.tsx`, przeniesienie tego komponentu
// na trasę chowaną to jeden plik-opakowanie i jedna linijka `href: null`.
//
// ── MAPA NIGDY NIE ZABIERA GŁOSU I NIGDY NIE PUSHA ─────────────────────
// Budżet odezwań Mapy wynosi 0 ZAWSZE (spec arbitra 1.4). Mapa nie występuje
// w drabinie pierwszeństwa. Działa wyłącznie na przyciąganie — i dlatego jako
// jedyne narzędzie działa w koncie OGRANICZONYM. W tym pliku nie ma i nie może
// się pojawić nic, co planuje powiadomienie ani zapisuje zdarzenie o zawodniku.
//
// ── CO TEN EKRAN CZYTA I CZEGO NIE ─────────────────────────────────────
// Czyta: `account_state()`, `users.birth_year`, `road_segments`, `road_factors`,
// `exit_mode`. NIE zapisuje NICZEGO — zero `insert`, zero `update`.
//
// ⚠️ A-N12: każde zapytanie o dane zawodnika ma jawny filtr po `user_id`.
// Treść Mapy (`road_segments`, `road_factors`) jest wspólna i filtru nie ma —
// bo nie jest danymi zawodnika.
//
// ⚠️ PODPIS `account_state` — STAN Z 13.08.2026, ZMIERZONY, NIE ZAPAMIĘTANY:
//
//     public.account_state() returns text          -- pronargs = 0, argumenty []
//     stable security definer, set search_path = public
//
// Funkcja bierze zawodnika z `auth.uid()` w środku i NIE PRZYJMUJE ŻADNEGO
// ARGUMENTU. Woła się ją dokładnie tak: `supabase.rpc('account_state')`.
//
// ── DLACZEGO TA UWAGA JEST TAKA DŁUGA (przeczytaj przed zmianą tej linii) ──
// 11.08.2026 w bazie stała wersja `account_state(p_user uuid DEFAULT auth.uid())`
// i ten plik SŁUSZNIE podawał `p_user` jawnie. 12.08.2026 migracja
// `20260812135901` skasowała wariant `(uuid)` i zostawiła bezargumentowy —
// z uzasadnieniem „Appka woła ją bez argumentów". To zdanie było NIEPRAWDZIWE
// i nikt go nie sprawdził `grep`em. Skutek: przez dobę `rpc('account_state',
// { p_user })` nie dopasowywało się do niczego (PostgREST dopasowuje funkcje po
// NAZWACH parametrów — znalezisko A-N1/O33), `accountState` schodziło na `null`,
// `dostepMapy(null)` dawało `odcinek: false` i CAŁA MAPA BYŁA MARTWA U KAŻDEGO
// ZAWODNIKA. Wykrył to audyt zgodności z wizją (pas M, 12.08.2026, M-N1).
// Naprawione 13.08.2026 po stronie appki, nie bazy — bezargumentowa wersja jest
// bezpieczniejsza (nie da się podstawić cudzego `uuid`), więc to appka miała się
// dostosować.
//
// ⚠️ REGUŁA, KTÓRA Z TEGO ZOSTAJE (O44): migracja kasująca albo zmieniająca
// funkcję musi mieć w uzasadnieniu WYNIK `grep`a po wywołaniach, a nie zdanie
// o tym, jak appka ją rzekomo woła.
//
// ⚠️ ZAKAZ ŚCIEŻKI ODZYSKU: wołamy DOKŁADNIE RAZ. Gdy zwróci błąd, ekran
// schodzi na stan „nie wiem" (mapa bez odcinka) i wypisuje `ACCOUNT_STATE_WARN`
// do konsoli. NIE MA tu drugiej próby z innym zestawem argumentów — cicha
// druga droga jest tym, co ukryło defekt A-N1 na całą rundę.
import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
// PLAN-D-J 08.2026 (12.08.2026) — CO OBOWIĄZUJE W TYM TYGODNIU. Mapa nigdy nie
// zabiera głosu (budżet 0 ZAWSZE), ale OBOWIĄZUJE ją stan — to jest dokładnie
// rozróżnienie A1 ze specyfikacji. Dwa ograniczenia dotyczą tego ekranu:
// `mapaTylkoWTwoichRekach` i `pokazacLiczbeSystemowa`.
// ⚠️ PLAN-D-P 08.2026 (13.08.2026): oba są od tej rundy ZAWSZE `false`. Ich
// jedyną przesłanką był stan `exit_mode.state = 'paused_decision'`, którego nie
// dało się nigdzie włączyć i który został skasowany w całości (zadanie P8).
// Odczyt ZOSTAJE — jest poprawny, przetestowany i zadziała w dniu, w którym
// któreś z tych ograniczeń dostanie nową przesłankę. To jest stan ŚWIADOMY
// i nazwany, nie cichy brak; rozstrzygnięcie należy do sesji nawigującej.
import {
  czytajOgraniczenia,
  isMissingOgraniczeniaColumnError,
  KOLUMNA_OGRANICZEN,
  opisOgraniczenDoLogu,
} from '../lib/ograniczenia';
import { poniedzialekTygodnia as poniedzialekGlosu } from '../lib/glosTygodnia';
import { colors, typography, radii, spacing, minTouchHeight, skew } from '../constants/theme';
import {
  zbudujStanMapy,
  zakresWieku,
  SEGMENT_COLUMNS,
  FACTOR_COLUMNS,
  MAPA_TITLE,
  SEKCJA_JUTRO,
  SEKCJA_W_RECE,
  SEKCJA_TLO,
  SEKCJA_TLO_PODPIS,
  SILA_DOWODU_LABEL,
  type StanMapy,
  type RoadSegment,
  type RoadFactor,
} from '../lib/mapaDrogi';

export const ACCOUNT_STATE_WARN =
  '[PLAN-D-E] rpc(account_state) zwróciło błąd — Mapa schodzi na stan „nie wiem" i NIE pokazuje odcinka. '
  + 'Podpis zmierzony 13.08.2026 jako account_state() returns text, BEZ ARGUMENTÓW (pronargs = 0). '
  + 'Jeśli w błędzie jest PGRST202, funkcja znów ma inny podpis niż to wywołanie — sprawdź: '
  + 'select pronargs, pg_get_function_identity_arguments(p.oid) from pg_proc p '
  + 'join pg_namespace n on n.oid=p.pronamespace where n.nspname=\'public\' and p.proname=\'account_state\';';

export const NIEZNANY_STAN_KONTA_WARN =
  '[PLAN-D-E] account_state zwróciło wartość spoza czterech znanych (full / limited / suspended / unknown_age). '
  + 'Mapa NIE pokazuje odcinka — fail closed. Dopisz nowy stan do AccountState w lib/mapaDrogi.ts. Wartość:';

export const EXIT_MODE_WARN =
  '[PLAN-D-E] odczyt exit_mode nie powiódł się — wariant Mapy zostaje podstawowy. '
  + 'Jeśli migracja osi decyzji jest wykonana, to jest prawdziwy błąd, nie brak tabeli.';

// ⚠️ PLAN-D-P 08.2026 (13.08.2026) — TU BYŁ WARIANT „ŚWIADEK" I JEGO NIE MA.
//
// Wariant `witness` („zostałeś, ale koledzy odpadli") miał 16 wierszy treści
// w `road_factors` od 11.08.2026 i wejście WYŁĄCZONE NA SZTYWNO
// (`const SWIADEK_BRAK_ZRODLA = null`), bo produkt nie miał skąd wiedzieć, że
// taka sytuacja zaszła. Pas I sprawdził 12.08.2026 trzy jedyne drogi i żadna
// nie działa: zapisy drużyny są puste i tak czy tak nie odróżniają deselekcji
// od przeprowadzki; czytanie `exit_mode` kolegów znaczyłoby ujawnienie jednemu
// małoletniemu, że drugi odpadł (decyzja Kuby i prawnika, nie sesji); a pytanie
// wprost jest NOWYM pytaniem, w najgorszym tygodniu zawodnika, o cudzą
// deselekcję — i wymaga brzmienia Kuby.
//
// Stan „treść leży, wejście wyłączone, decyzji nie ma" trwał dwa dni i był
// dokładnie tym cichym bałaganem, który ta runda sprząta. Treść 16 wierszy jest
// wypisana W CAŁOŚCI w nocie przekazania pasa P — jeśli pierwsza rozmowa
// z zawodnikiem pokaże, że ta sytuacja jest przeżywana tak, jak zakładaliśmy,
// odtworzenie jej to jedna migracja.
//
// ⚠️ WARIANT `after_deselection` (32 wiersze) ZOSTAJE NIETKNIĘTY.

type Props = { visible: boolean; onClose: () => void; userId: string | null };

export default function MojaDroga({ visible, onClose, userId }: Props) {
  const [stan, setStan] = useState<StanMapy>({ stan: 'ladowanie' });

  const load = useCallback(async () => {
    if (!userId) {
      setStan({ stan: 'blad', powod: 'Nie wiem, kto jest zalogowany — odśwież aplikację.' });
      return;
    }
    setStan({ stan: 'ladowanie' });

    const [accRes, userRes, segRes, facRes, exitRes] = await Promise.all([
      // ⚠️ BEZ ARGUMENTÓW — I TO JEST ZMIERZONE, NIE ZAŁOŻONE (13.08.2026).
      // Funkcja w bazie ma `pronargs = 0` i bierze zawodnika z `auth.uid()`.
      // PostgREST dopasowuje po NAZWACH parametrów, więc dołożenie tu czegokolwiek
      // (np. `{ p_user: userId }`) nie rzuci błędu składni — po prostu nie znajdzie
      // funkcji, Mapa zejdzie na „nie wiem" i zgaśnie u WSZYSTKICH. Pełna historia
      // tego defektu jest w nagłówku pliku. Przed zmianą tej linii: zmierz podpis.
      supabase.rpc('account_state'),
      supabase.from('users').select('birth_year').eq('id', userId).limit(1),
      supabase.from('road_segments').select(SEGMENT_COLUMNS).order('sort_order', { ascending: true }),
      supabase.from('road_factors').select(FACTOR_COLUMNS),
      supabase.from('exit_mode').select('state,closed_at').eq('user_id', userId).is('closed_at', null).limit(1),
    ]);

    // Stan konta: błąd NIE jest równy „konto pełne". Fail closed.
    // ⚠️ Typ jest `string`, nie `AccountState`, ŚWIADOMIE. Gdyby baza zwróciła
    // piąty stan, rzutowanie na wąski typ zamieniłoby „nie znam tej wartości"
    // w „nie odczytałem" — dwa różne problemy, jeden ekran. `dostepMapy`
    // rozróżnia je i podaje wartość w `nieznanaWartosc`.
    let accountState: string | null = null;
    if (accRes.error) {
      console.warn(ACCOUNT_STATE_WARN, accRes.error);
    } else if (typeof accRes.data === 'string') {
      accountState = accRes.data;
    } else if (accRes.data && typeof accRes.data === 'object') {
      // Niektóre funkcje zwracają wiersz, nie skalar. Bierzemy pierwszą wartość
      // tekstową i nic nie zgadujemy poza tym.
      const v = Object.values(accRes.data as Record<string, unknown>)[0];
      if (typeof v === 'string') accountState = v;
    } else {
      console.warn(ACCOUNT_STATE_WARN, 'rpc nie zwróciło ani błędu, ani tekstu:', accRes.data);
    }
    const znane: string[] = ['full', 'limited', 'suspended', 'unknown_age'];
    if (accountState !== null && !znane.includes(accountState)) {
      console.warn(NIEZNANY_STAN_KONTA_WARN, accountState);
    }

    const birthYear = userRes.error
      ? null
      : ((userRes.data?.[0] as { birth_year: number | null } | undefined)?.birth_year ?? null);

    let exitAktywny: boolean | null = null;
    if (exitRes.error) {
      console.warn(EXIT_MODE_WARN, exitRes.error);
    } else {
      // ⚠️ PLAN-D-P 08.2026 (13.08.2026) — TO ŚWIADOMIE COFA ZADANIE N4.
      // 13.08.2026 rano stało tu rozróżnienie `state === 'active'`, żeby Mapa
      // nie powiedziała „odpadłeś" komuś, kto tylko wstrzymał decyzję. Tego
      // samego dnia stan `paused_decision` został skasowany w całości (pas P,
      // zadanie P8: nie dało się go nigdzie włączyć), a CHECK w bazie zwężony
      // do `('active','closed')`. Po tym zwężeniu OTWARTY wiersz `exit_mode`
      // może mieć tylko jedną wartość, więc rozróżnienie nie ma czego
      // rozróżniać — a warunek pilnujący nieistniejącego stanu myli następnego
      // czytającego. Zamknięte wiersze odfiltrowuje samo zapytanie
      // (`closed_at is null`).
      // ⚠️ GDYBY STAN KIEDYŚ WRÓCIŁ, TA LINIJKA MUSI WRÓCIĆ RAZEM Z NIM.
      exitAktywny = ((exitRes.data ?? []) as unknown[]).length > 0;
    }

    // PLAN-D-J 08.2026 — osobne, wąskie zapytanie o ograniczenia. Świadomie
    // POZA paczką wyżej: dopóki migracja J1 nie jest wykonana, PostgREST odrzuca
    // CAŁE zapytanie z powodu jednej nieznanej kolumny — a Mapa ma działać
    // niezależnie od tego, bo jest jedynym narzędziem działającym w koncie
    // OGRANICZONYM. Brak kolumny to jawne „nie wiem", nie „nic nie obowiązuje".
    const ogrRes = await supabase
      .from('weekly_voice')
      .select(`week_start, ${KOLUMNA_OGRANICZEN}`)
      .eq('user_id', userId)
      .eq('week_start', poniedzialekGlosu(new Date()))
      .limit(1);
    const wierszOgr = (ogrRes.data ?? [])[0] as Record<string, unknown> | undefined;
    const ograniczenia = ogrRes.error && isMissingOgraniczeniaColumnError(ogrRes.error)
      ? czytajOgraniczenia(undefined, `kolumny „${KOLUMNA_OGRANICZEN}" nie ma jeszcze w bazie`)
      : czytajOgraniczenia(wierszOgr ? wierszOgr[KOLUMNA_OGRANICZEN] : null, ogrRes.error ? ogrRes.error.message : null);
    console.log(`[mapa] ${opisOgraniczenDoLogu(ograniczenia)}`);

    setStan(zbudujStanMapy({
      laduje: false,
      error: segRes.error ?? facRes.error ?? null,
      odcinki: (segRes.data ?? null) as RoadSegment[] | null,
      czynniki: (facRes.data ?? null) as RoadFactor[] | null,
      accountState,
      birthYear,
      exitAktywny,
      ograniczenia,
    }));
  }, [userId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const naglowek = (
    <View style={styles.headRow}>
      <Text style={styles.title}>{MAPA_TITLE}</Text>
      <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Zamknij">
        <Text style={styles.close}>Zamknij</Text>
      </TouchableOpacity>
    </View>
  );

  const czynnik = (fk: RoadFactor) => (
    <View key={fk.id} style={styles.factor}>
      <Text style={styles.factorTitle}>{fk.title}</Text>
      <Text style={styles.factorBody}>{fk.body}</Text>
      {fk.evidence_number ? <Text style={styles.factorNumber}>{fk.evidence_number}</Text> : null}
      <Text style={styles.factorEvidence}>
        {SILA_DOWODU_LABEL[fk.evidence_level]}
        {fk.source_ref ? `  ·  ${fk.source_ref}` : ''}
      </Text>
    </View>
  );

  const lista = (odcinki: RoadSegment[]) => (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={styles.sectionLabel}>Cała droga</Text>
      {odcinki.map((s) => (
        <View key={s.id} style={styles.segRow}>
          <Text style={styles.segLabel}>{s.label}</Text>
          <Text style={styles.segAge}>{zakresWieku(s)}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          {naglowek}

          {stan.stan === 'ladowanie' && (
            <View style={{ paddingVertical: 40 }}>
              <ActivityIndicator color={colors.brand} />
            </View>
          )}

          {/* BRAK TABEL ≠ BRAK TREŚCI. Zawodnik ma wiedzieć, że treść istnieje,
              tylko nie została jeszcze wgrana. */}
          {stan.stan === 'brak_tabel' && <Text style={styles.quiet}>{stan.powod}</Text>}
          {stan.stan === 'blad' && <Text style={styles.quiet}>{stan.powod}</Text>}

          {stan.stan === 'bez_odcinka' && (
            <>
              <Text style={styles.quiet}>{stan.powod}</Text>
              {lista(stan.odcinki)}
            </>
          )}

          {stan.stan === 'gotowa' && (
            <>
              {stan.przyblizenie ? <Text style={styles.quiet}>{stan.przyblizenie}</Text> : null}

              <View style={styles.hero}>
                <View style={styles.heroStripe} />
                <Text style={styles.heroEyebrow}>Twój odcinek</Text>
                <Text style={styles.heroTitle}>{stan.widok.odcinek.label}</Text>
                <Text style={styles.heroAge}>{zakresWieku(stan.widok.odcinek)}</Text>
              </View>

              {stan.widok.stan === 'brak_tresci' && <Text style={styles.quiet}>{stan.widok.powod}</Text>}

              {/* ── 1. JEDNA RZECZ DO ZROBIENIA JUTRO ─────────────────── */}
              {stan.widok.stan === 'gotowy' && (
                <View style={{ marginTop: spacing.lg }}>
                  <Text style={styles.sectionLabel}>{SEKCJA_JUTRO}</Text>
                  <View style={styles.jutro}>
                    <Text style={styles.jutroTitle}>{stan.widok.naJutro.title}</Text>
                    <Text style={styles.jutroBody}>{stan.widok.naJutro.body}</Text>
                    {stan.widok.naJutro.evidence_number
                      ? <Text style={styles.jutroNumber}>{stan.widok.naJutro.evidence_number}</Text>
                      : null}
                  </View>
                </View>
              )}
              {stan.widok.stan === 'wadliwy' && (
                <View style={{ marginTop: spacing.lg }}>
                  <Text style={styles.sectionLabel}>{SEKCJA_JUTRO}</Text>
                  <Text style={styles.quiet}>{stan.widok.powod}</Text>
                </View>
              )}

              {/* ── 2. CO JEST W TWOICH RĘKACH ────────────────────────── */}
              {(stan.widok.stan === 'gotowy' || stan.widok.stan === 'wadliwy') && (
                <>
                  {/* Sekcja 2 znika, gdy jest pusta — i to jest jedyne miejsce
                      w tym pliku, gdzie coś znika. Nagłówek nad pustką czytałby
                      się jak defekt treści, a nie jak jej brak.
                      (Powodem był wariant „świadek deselekcji", który jako
                      jedyny nie miał pozycji „w Twoich rękach" poza tą jedną na
                      jutro. Wariant zniknął 13.08.2026, PLAN-D-P — ten warunek
                      zostaje, bo chroni też przed brakiem treści w bazie.) */}
                  {stan.widok.wTwoichRekach.length > 0 ? (
                    <View style={{ marginTop: spacing.lg }}>
                      <Text style={styles.sectionLabel}>{SEKCJA_W_RECE}</Text>
                      {stan.widok.wTwoichRekach.map(czynnik)}
                    </View>
                  ) : null}

                  {/* ── 3. CO JEST TŁEM ──────────────────────────────────
                      Trzecia sekcja NIE JEST wypełniaczem. Pokazanie, że część
                      czynników nie zależy od zawodnika, jest samo w sobie
                      działaniem — przenosi przyczynę niepowodzenia z niego na
                      system. Dlatego ma własny podpis, a nie samą listę. */}
                  {/* PLAN-D-J 08.2026 — przy `mapaTylkoWTwoichRekach` (stan
                      „czekam na decyzję", spec 6.4) CAŁA sekcja tła znika razem
                      z nagłówkiem. To jedyny przypadek, w którym jej brak NIE
                      jest defektem treści — i dlatego rozróżnia go osobne pole
                      `tloUkryte`, a nie pusta lista. */}
                  {!stan.widok.tloUkryte ? (
                    <View style={{ marginTop: spacing.lg }}>
                      <Text style={styles.sectionLabel}>{SEKCJA_TLO}</Text>
                      <Text style={styles.tloPodpis}>{SEKCJA_TLO_PODPIS}</Text>
                      {stan.widok.tlo.length > 0
                        ? stan.widok.tlo.map(czynnik)
                        // Pusta trzecia sekcja to defekt treści, nie „nic tu nie ma".
                        // Mówimy to, zamiast chować nagłówek i udawać, że tak miało być.
                        : <Text style={styles.quiet}>Tło tego odcinka nie jest jeszcze wgrane do bazy.</Text>}
                    </View>
                  ) : null}

                  {/* PLAN-D-J 08.2026 — liczba systemowa przy `pokazacLiczbeSystemowa`.
                      Spec 6.4: ma się pojawić, ŻEBY W DNIU DECYZJI NIE BYŁA NOWĄ
                      INFORMACJĄ. Świadomie zamiast pocieszenia, nie obok niego.
                      ⚠️ BRZMIENIE DO PRZEJRZENIA PRZEZ KUBĘ — stała
                      LICZBA_SYSTEMOWA_ROTACJI w lib/mapaDrogi.ts. */}
                  {stan.widok.liczbaSystemowa ? (
                    <View style={{ marginTop: spacing.lg }}>
                      <Text style={styles.tloPodpis}>{stan.widok.liczbaSystemowa}</Text>
                    </View>
                  ) : null}
                </>
              )}

              {lista(stan.odcinki)}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { ...typography.display, fontSize: 28, color: colors.textPrimary },
  close: { ...typography.bodyMedium, fontSize: 14, color: colors.textSecondary, textDecorationLine: 'underline' },

  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 10 },
  quiet: { ...typography.body, fontSize: 14, lineHeight: 21, color: colors.textSecondary, marginBottom: spacing.md },

  hero: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg,
    paddingVertical: 18, paddingLeft: 24, paddingRight: 20,
  },
  heroStripe: { ...skew.stripe, height: 48, top: 16, backgroundColor: colors.brand },
  heroEyebrow: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6 },
  heroTitle: { ...typography.display, fontSize: 26, color: colors.textPrimary },
  heroAge: { ...typography.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  jutro: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.brand, borderRadius: radii.md,
    padding: 16,
  },
  jutroTitle: { ...typography.bodySemiBold, fontSize: 16, color: colors.textPrimary, marginBottom: 6 },
  jutroBody: { ...typography.body, fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  jutroNumber: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary, marginTop: 8 },

  factor: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    padding: 14, marginBottom: 10,
  },
  factorTitle: { ...typography.bodySemiBold, fontSize: 15, color: colors.textPrimary, marginBottom: 4 },
  factorBody: { ...typography.body, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  factorNumber: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary, marginTop: 6 },
  factorEvidence: { ...typography.body, fontSize: 11, color: colors.textTertiary, marginTop: 6 },

  tloPodpis: { ...typography.body, fontSize: 13, lineHeight: 20, color: colors.textSecondary, marginBottom: 10 },

  segRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: minTouchHeight, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  segLabel: { ...typography.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  segAge: { ...typography.body, fontSize: 13, color: colors.textTertiary },
});
