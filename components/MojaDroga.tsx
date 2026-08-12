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
// Czyta: `account_state(p_user)`, `users.birth_year`, `road_segments`, `road_factors`,
// `exit_mode`. NIE zapisuje NICZEGO — zero `insert`, zero `update`.
//
// ⚠️ A-N12: każde zapytanie o dane zawodnika ma jawny filtr po `user_id`.
// Treść Mapy (`road_segments`, `road_factors`) jest wspólna i filtru nie ma —
// bo nie jest danymi zawodnika.
//
// ⚠️ PODPIS `account_state` SPRAWDZONY ODCZYTEM Z ŻYWEJ BAZY 11.08.2026:
//
//     public.account_state(p_user uuid DEFAULT auth.uid()) returns text
//     security definer
//
// Pierwsza wersja tego pliku wołała ją BEZ ARGUMENTÓW, bo dokumentacja projektu
// pisała o niej skrótowo „account_state()". To jest dokładnie kształt znaleziska
// A-N1: PostgREST dopasowuje funkcje po NAZWACH parametrów, więc „funkcja
// istnieje" nie znaczy „da się ją zawołać tak, jak zakłada kod". Wykryte przed
// pierwszym uruchomieniem, jednym zapytaniem do `pg_get_function_arguments`.
//
// **Podajemy `p_user` JAWNIE, mimo że ma wartość domyślną.** Wywołanie bez
// argumentów opierałoby się na tym, że PostgREST uwzględnia domyślne wartości
// przy dopasowaniu — co jest prawdopodobne i czego NIE SPRAWDZILIŚMY na żywo.
// Wywołanie z jawnym `p_user` dopasowuje się do tej funkcji zawsze, bez
// zakładania czegokolwiek o warstwie pośredniej.
//
// ⚠️ ZAKAZ ŚCIEŻKI ODZYSKU: wołamy DOKŁADNIE RAZ. Gdy zwróci błąd, ekran
// schodzi na stan „nie wiem" (mapa bez odcinka) i wypisuje `ACCOUNT_STATE_WARN`
// do konsoli. NIE MA tu drugiej próby z innym zestawem argumentów — cicha
// druga droga jest tym, co ukryło defekt A-N1 na całą rundę.
import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
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
  '[PLAN-D-E] rpc(account_state, {p_user}) zwróciło błąd — Mapa schodzi na stan „nie wiem" i NIE pokazuje odcinka. '
  + 'Podpis potwierdzony 11.08.2026 jako account_state(p_user uuid DEFAULT auth.uid()) returns text. '
  + 'Jeśli funkcja się zmieniła, sprawdź: select pg_get_function_arguments(p.oid) from pg_proc p '
  + 'join pg_namespace n on n.oid=p.pronamespace where n.nspname=\'public\' and p.proname=\'account_state\';';

export const NIEZNANY_STAN_KONTA_WARN =
  '[PLAN-D-E] account_state zwróciło wartość spoza czterech znanych (full / limited / suspended / unknown_age). '
  + 'Mapa NIE pokazuje odcinka — fail closed. Dopisz nowy stan do AccountState w lib/mapaDrogi.ts. Wartość:';

export const EXIT_MODE_WARN =
  '[PLAN-D-E] odczyt exit_mode nie powiódł się — wariant Mapy zostaje podstawowy. '
  + 'Jeśli migracja osi decyzji jest wykonana, to jest prawdziwy błąd, nie brak tabeli.';

/**
 * ŚWIADEK DESELEKCJI (wariant `witness`, reguła P8) NIE MA DZIŚ ŹRÓDŁA DANYCH.
 * Nie ma w bazie niczego, z czego dałoby się wywnioskować „koledzy z drużyny
 * odpadli". Przekazujemy `null`, czyli „nie wiem" — i to jest zapisane tutaj,
 * a nie ukryte w `false`, bo `false` znaczyłoby „sprawdziłem i nie jest
 * świadkiem". Szesnaście wierszy treści tego wariantu czeka w `road_factors`
 * od 11.08.2026.
 *
 * ── PLAN-D-I 08.2026 (12.08.2026) — ZADANIE I2: ROZSTRZYGNIĘTE, NA NIE ────
 * Zadaniem było ustalić, SKĄD produkt ma to wiedzieć. Sprawdzone zostały
 * trzy jedyne drogi, jakie dziś istnieją, i żadna nie działa:
 *
 * 1. WYWNIOSKOWAĆ Z DRUŻYNY. `team_memberships` ma kolumnę `left_at`, więc
 *    z kształtu wygląda na źródło. Zmierzone 12.08.2026: tabela ma **0
 *    wierszy**, a w obu repozytoriach nie ma **ANI JEDNEGO** zapisu do niej
 *    (`insert`/`update`/`upsert` — zero trafień; czytają ją wyłącznie ekrany
 *    trenera). Nawet gdyby dane były: `left_at` nie odróżnia deselekcji od
 *    zmiany klubu, przeprowadzki i rzucenia piłki — a produkt musiałby
 *    odróżnić, bo cała treść tego wariantu mówi o DECYZJI SYSTEMU.
 * 2. WYWNIOSKOWAĆ Z `exit_mode` KOLEGÓW. Wymagałoby czytania cudzego wiersza
 *    o deselekcji, żeby zmienić ekran osoby trzeciej — czyli ujawnienia
 *    jednemu małoletniemu, że drugi odpadł. To jest decyzja o bezpieczeństwie
 *    nieletnich i o prywatności, więc należy do Kuby i do prawnika, nie do
 *    sesji. Osobno: `team_memberships` jest puste, więc nie ma nawet po czym
 *    połączyć zawodników w drużynę.
 * 3. ZAPYTAĆ ZAWODNIKA WPROST. Da się — i to jest jedyna droga, która daje
 *    prawdziwą odpowiedź. Ale to jest NOWE PYTANIE do zawodnika, w jego
 *    najgorszym tygodniu, o cudzą deselekcję. Brzmienie takiego pytania
 *    należy do Kuby (zakaz 5), a moment i forma — do rozstrzygnięcia po
 *    pierwszej prawdziwej rozmowie z zawodnikiem.
 *
 * DLATEGO NIE ZBUDOWANE, ŚWIADOMIE. Zgadywanie, że komuś odpadli koledzy,
 * jest gorsze niż niepokazanie treści: wariant otwiera się zdaniem „to, co
 * się stało, nie było oceną ich wartości" — i jeżeli nikomu nic się nie
 * stało, produkt właśnie powiedział zawodnikowi coś nieprawdziwego o jego
 * drużynie. Cichy brak z pustką jest tu tańszy niż cichy brak ze zmyśleniem.
 * ──────────────────────────────────────────────────────────────────────────
 */
const SWIADEK_BRAK_ZRODLA = null;

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
      // Nazwa parametru MUSI brzmieć dokładnie `p_user` — PostgREST dopasowuje
      // funkcję po nazwach argumentów. Skrót albo synonim nie rzuci błędu
      // składni, tylko nie znajdzie funkcji.
      supabase.rpc('account_state', { p_user: userId }),
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
      exitAktywny = (exitRes.data ?? []).length > 0;
    }

    setStan(zbudujStanMapy({
      laduje: false,
      error: segRes.error ?? facRes.error ?? null,
      odcinki: (segRes.data ?? null) as RoadSegment[] | null,
      czynniki: (facRes.data ?? null) as RoadFactor[] | null,
      accountState,
      birthYear,
      exitAktywny,
      swiadekDeselekcji: SWIADEK_BRAK_ZRODLA,
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
                      w tym pliku, gdzie coś znika. Powód: wariant „świadek
                      deselekcji" NIE MA pozycji „w Twoich rękach" poza tą jedną
                      na jutro, bo cała jego treść dotyczy tego, co się stało
                      komu innemu. Nagłówek nad pustką czytałby się jak defekt. */}
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
                  <View style={{ marginTop: spacing.lg }}>
                    <Text style={styles.sectionLabel}>{SEKCJA_TLO}</Text>
                    <Text style={styles.tloPodpis}>{SEKCJA_TLO_PODPIS}</Text>
                    {stan.widok.tlo.length > 0
                      ? stan.widok.tlo.map(czynnik)
                      // Pusta trzecia sekcja to defekt treści, nie „nic tu nie ma".
                      // Mówimy to, zamiast chować nagłówek i udawać, że tak miało być.
                      : <Text style={styles.quiet}>Tło tego odcinka nie jest jeszcze wgrane do bazy.</Text>}
                  </View>
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
