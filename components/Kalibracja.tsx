// PLAN-D-H 08.2026 (12.08.2026) — NOWY PLIK. Ekrany Kalibracji.
//
// Reguły i cały rachunek: `lib/kalibracja.ts` i `lib/sladZachowania.ts`
// (czysta logika + selftesty). Tutaj są WYŁĄCZNIE zapytania i rysowanie.
//
// ── DLACZEGO MODAL, A NIE PLIK W `app/(tabs)/` ────────────────────────
// Ten sam powód co w `MojaDroga.tsx` i `SciezkaWyjscia.tsx`: plik w `app/(tabs)/`
// pojawia się jako zakładka. Zakaz 10 — żadnej piątej zakładki.
//
// ── KOLEJNOŚĆ, KTÓREJ TEN EKRAN NIE PILNUJE SAM ───────────────────────
// Interfejs pokazuje predykcję przed pomiarem, ale NIE NA NIM to stoi.
// Kolejność wymuszają dwa wyzwalacze w bazie (`trg_lock_calibration`,
// `trg_calibration_kolejnosc`), bo ekran można obejść — PostgREST jest
// otwarty, a nawigacja zmienia się co rundę. Ten plik po prostu nie potrafi
// wysłać zapytania łamiącego kolejność: buduje ładunki funkcjami
// `wierszPredykcji` i `patchPomiaru`, które nie mają jak nieść drugiej połowy.
//
// ── OŚ B I ŚLAD ZACHOWANIA ────────────────────────────────────────────
// Pomiar osi zachowania NIE JEST wpisywany przez zawodnika — jest LICZONY
// z jego danych (`daily_logs`, `calendar_events`) w tym samym momencie,
// w którym materializuje się okno do `behavioural_trace`. To jest jedyne
// miejsce w produkcie, które do tej tabeli pisze, i jedyny moment, w którym
// zawodnik widzi swoje cztery liczniki. Przy nieudanym odczycie NIE ZAPISUJEMY
// wiersza: materializacja zapamiętuje błąd na zawsze.
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
// PLAN-D-J 08.2026 (12.08.2026) — CO OBOWIĄZUJE W TYM TYGODNIU.
// Spec 3.2 mówi wprost: w stanie Osłony „KALIBRACJA nie nazywa spadku spadkiem".
// Do 12.08.2026 nie miała jak — arbiter zwracał `ograniczenia`, a cron je
// wyrzucał, więc zawodnik w szczycie wzrastania dostawał zdanie WARUNKOWE
// („jeśli akurat szybko rośniesz"), choć produkt znał odpowiedź.
import {
  czytajOgraniczenia,
  isMissingOgraniczeniaColumnError,
  KOLUMNA_OGRANICZEN,
  opisOgraniczenDoLogu,
  type StanOgraniczen,
} from '../lib/ograniczenia';
import { poniedzialekTygodnia as poniedzialekGlosu } from '../lib/glosTygodnia';
import { colors, typography, radii, spacing, minTouchHeight } from '../constants/theme';
import { toLocalDateStr } from '../lib/date-utils';
import {
  sprawdzLiczbe, ocenPorownanie, stanZmiany, progZmiany, opiszKalibracje,
  wierszPredykcji, patchPomiaru, stanKalibracji, czyPunktZerowy, poprzedniBlad,
  KOLUMNY_KALIBRACJI, OS_FIZYCZNA, OS_ZACHOWANIA, METRYKA_CMJ, METRYKA_SESJE_WLASNE,
  KALIBRACJA_PYTANIE_FIZYCZNA, KALIBRACJA_PYTANIE_ZACHOWANIE, KALIBRACJA_NIE_WIEM_PODPOWIEDZ,
  KALIBRACJA_ZABLOKOWANE, KALIBRACJA_PROTOKOL, KALIBRACJA_NA_JUTRO, KALIBRACJA_NIE_WIEM,
  PROG_CMJ_JEDEN_DZIEN,
  type Os, type Warunki, type WierszKalibracji, type StanKalibracji,
} from '../lib/kalibracja';
import {
  policzSlad, wierszSladu, opiszSlad, oknoWstecz, OKNO_DNI,
  type WpisDziennika, type WydarzenieKalendarza,
} from '../lib/sladZachowania';

export const KALIBRACJA_ODCZYT_WARN =
  '[PLAN-D-H] odczyt calibration_measurements nie powiódł się — ekran mówi „nie wiem", NIE „nie masz pomiarów". '
  + 'Te dwie rzeczy wyglądają identycznie i to jest dokładnie ten defekt, przed którym ostrzega reguła R5.';

export const KALIBRACJA_ZAPIS_WARN =
  '[PLAN-D-H] zapis calibration_measurements odrzucony. Jeśli komunikat zaczyna się od „KALIBRACJA:", '
  + 'to zadziałał wyzwalacz kolejności — ładunek niósł pomiar razem z predykcją. ZERO ścieżki odzysku.';

export const SLAD_ODCZYT_WARN =
  '[PLAN-D-H] nie odczytałem daily_logs albo calendar_events — NIE zapisuję wiersza behavioural_trace. '
  + 'Wiersz z zerami zapisany po nieudanym odczycie jest kłamstwem, którego po miesiącu nikt nie odróżni od prawdy.';

type Props = { visible: boolean; onClose: () => void; userId: string | null };

export default function Kalibracja({ visible, onClose, userId }: Props) {
  const [os, setOs] = useState<Os>(OS_FIZYCZNA);
  const [stan, setStan] = useState<StanKalibracji | null>(null);
  const [wiersze, setWiersze] = useState<WierszKalibracji[] | null>(null);

  const [predykcja, setPredykcja] = useState('');
  const [pomiar, setPomiar] = useState('');
  const [poraDnia, setPoraDnia] = useState('');
  const [nawierzchnia, setNawierzchnia] = useState('');
  const [obuwie, setObuwie] = useState('');
  const [blad, setBlad] = useState<string | null>(null);
  const [zapisuje, setZapisuje] = useState(false);
  const [sladLinie, setSladLinie] = useState<string[] | null>(null);

  const metryka = os === OS_FIZYCZNA ? METRYKA_CMJ : METRYKA_SESJE_WLASNE;
  const jednostka = os === OS_FIZYCZNA ? 'cm' : 'razy';

  // PLAN-D-J 08.2026 — stan początkowy to `nie_odczytane`, nie „nic nie
  // obowiązuje": brzmienie przeramowane wolno pokazać dopiero wtedy, gdy
  // WIEMY, że zawodnik jest w Osłonie.
  const [ograniczenia, setOgraniczenia] = useState<StanOgraniczen>(
    { rodzaj: 'nie_odczytane', powod: 'jeszcze nie odczytano' },
  );

  const load = useCallback(async () => {
    if (!userId) {
      setStan({ rodzaj: 'nie_wiem', powod: 'nie wiem, kto jest zalogowany' });
      return;
    }
    setStan(null);
    // ⚠️ KOLEJNOŚĆ MA ZNACZENIE (N2, 13.08.2026). `load()` czyści licznik śladu,
    // bo po przeładowaniu danych stara linijka mogłaby opisywać nieaktualny okres.
    // Dlatego KAŻDE miejsce, które chce pokazać ślad, musi wołać `setSladLinie`
    // PO `await load()`, nigdy przed. Do 13.08.2026 zapis pomiaru osi B robił
    // odwrotnie — ustawiał linijkę, a linijkę niżej wołał `load()`, który ją
    // natychmiast kasował. Efekt: JEDYNE miejsce w produkcie, w którym zawodnik
    // miał zobaczyć cztery liczniki swojego zachowania, nie pokazywało ich nigdy
    // (znalezisko pasa M, M-N4).
    setSladLinie(null);
    // ⚠️ A-N12: jawny filtr po `user_id`.
    const res = await supabase
      .from('calibration_measurements')
      .select(KOLUMNY_KALIBRACJI)
      .eq('user_id', userId)
      .eq('axis', os)
      .eq('metric', metryka)
      .order('predicted_at', { ascending: false });
    if (res.error) console.warn(KALIBRACJA_ODCZYT_WARN, res.error);
    const w = res.error ? null : ((res.data ?? []) as unknown as WierszKalibracji[]);
    setWiersze(w);
    setStan(stanKalibracji(w, res.error ? res.error.message : null));

    // PLAN-D-J 08.2026 — osobne, wąskie zapytanie o ograniczenia. Dopóki
    // migracja J1 nie jest wykonana, brak kolumny daje jawne „nie wiem",
    // a Kalibracja zachowuje się dokładnie jak przed tą rundą.
    const ogrRes = await supabase
      .from('weekly_voice')
      .select(`week_start, ${KOLUMNA_OGRANICZEN}`)
      .eq('user_id', userId)
      .eq('week_start', poniedzialekGlosu(new Date()))
      .limit(1);
    const wierszOgr = (ogrRes.data ?? [])[0] as Record<string, unknown> | undefined;
    const stanOgr = ogrRes.error && isMissingOgraniczeniaColumnError(ogrRes.error)
      ? czytajOgraniczenia(undefined, `kolumny „${KOLUMNA_OGRANICZEN}" nie ma jeszcze w bazie`)
      : czytajOgraniczenia(wierszOgr ? wierszOgr[KOLUMNA_OGRANICZEN] : null, ogrRes.error ? ogrRes.error.message : null);
    console.log(`[kalibracja] ${opisOgraniczenDoLogu(stanOgr)}`);
    setOgraniczenia(stanOgr);
  }, [userId, os, metryka]);

  useEffect(() => {
    if (visible) {
      setPredykcja(''); setPomiar(''); setBlad(null);
      setPoraDnia(''); setNawierzchnia(''); setObuwie('');
      load();
    }
  }, [visible, os, load]);

  // ── ZAPIS PREDYKCJI ────────────────────────────────────────────────
  const zapiszPredykcje = useCallback(async () => {
    if (!userId || zapisuje) return;
    const v = sprawdzLiczbe(predykcja, os);
    if (!v.ok) { setBlad(v.blad); return; }
    setBlad(null);
    setZapisuje(true);
    const warunki: Warunki = os === OS_FIZYCZNA
      ? { poraDnia: poraDnia.trim() || null, nawierzchnia: nawierzchnia.trim() || null, obuwie: obuwie.trim() || null }
      : { poraDnia: null, nawierzchnia: null, obuwie: null };
    const res = await supabase.from('calibration_measurements').insert(wierszPredykcji({
      userId, os, metryka, predykcja: v.wartosc,
      isBaseline: czyPunktZerowy(wiersze), warunki, teraz: new Date(),
    }));
    setZapisuje(false);
    if (res.error) {
      console.warn(KALIBRACJA_ZAPIS_WARN, res.error);
      setBlad('Nie udało się zapisać Twojej liczby. Nic nie zostało zapisane — spróbuj jeszcze raz.');
      return;
    }
    setPredykcja('');
    await load();
  }, [userId, zapisuje, predykcja, os, metryka, poraDnia, nawierzchnia, obuwie, wiersze, load]);

  // ── ZAPIS POMIARU FIZYCZNEGO ───────────────────────────────────────
  const zapiszPomiar = useCallback(async () => {
    if (!userId || zapisuje || !stan || stan.rodzaj !== 'czeka_na_pomiar') return;
    const v = sprawdzLiczbe(pomiar, os);
    if (!v.ok) { setBlad(v.blad); return; }
    setBlad(null);
    setZapisuje(true);

    const otwarty = stan.wiersz;
    const poprzedniZamkniety = (wiersze ?? []).find((r) => r.measured_at !== null) ?? null;
    const ocena = os === OS_FIZYCZNA
      ? ocenPorownanie(
        poprzedniZamkniety
          ? { poraDnia: poprzedniZamkniety.time_of_day, nawierzchnia: poprzedniZamkniety.surface, obuwie: poprzedniZamkniety.footwear }
          : null,
        { poraDnia: otwarty.time_of_day, nawierzchnia: otwarty.surface, obuwie: otwarty.footwear },
      )
      // Oś zachowania nie ma warunków standaryzacji — liczba sesji to licznik,
      // nie pomiar, więc porównywalna jest zawsze, o ile jest z czym porównywać.
      : { comparable: poprzedniZamkniety !== null, powod: '' };

    const res = await supabase
      .from('calibration_measurements')
      .update(patchPomiaru({ pomiar: v.wartosc, comparable: ocena.comparable, teraz: new Date() }))
      .eq('user_id', userId)
      .eq('id', otwarty.id);
    setZapisuje(false);
    if (res.error) {
      console.warn(KALIBRACJA_ZAPIS_WARN, res.error);
      setBlad('Nie udało się zapisać pomiaru. Nic nie zostało zapisane — spróbuj jeszcze raz.');
      return;
    }
    setPomiar('');
    await load();
  }, [userId, zapisuje, stan, pomiar, os, wiersze, load]);

  // ── POMIAR OSI ZACHOWANIA: LICZONY Z DANYCH + MATERIALIZACJA ŚLADU ──
  const policzIZapiszZachowanie = useCallback(async () => {
    if (!userId || zapisuje || !stan || stan.rodzaj !== 'czeka_na_pomiar') return;
    setZapisuje(true);
    setBlad(null);

    const okno = oknoWstecz(toLocalDateStr(new Date()));
    const [logRes, evRes] = await Promise.all([
      supabase.from('daily_logs').select('created_at,session_type,calendar_event_id,payload')
        .eq('user_id', userId).gte('created_at', `${okno.od}T00:00:00.000Z`),
      supabase.from('calendar_events').select('id,scheduled_date')
        .eq('user_id', userId).gte('scheduled_date', okno.od).lte('scheduled_date', okno.do_),
    ]);

    if (logRes.error || evRes.error) {
      console.warn(SLAD_ODCZYT_WARN, logRes.error ?? evRes.error);
      setZapisuje(false);
      setBlad('Nie udało się policzyć Twoich sesji. Nic nie zostało zapisane — spróbuj jeszcze raz.');
      return;
    }

    const wpisy: WpisDziennika[] = (logRes.data ?? []).map((r: any) => ({
      dzien: toLocalDateStr(new Date(r.created_at)),
      session_type: r.session_type ?? null,
      calendar_event_id: r.calendar_event_id ?? null,
      sleep_hours: r.payload && typeof r.payload.sleep_hours === 'number' ? r.payload.sleep_hours : null,
    }));
    const wydarzenia: WydarzenieKalendarza[] = (evRes.data ?? []).map((r: any) => ({
      id: r.id, dzien: r.scheduled_date,
    }));

    const slad = policzSlad({ okno, wpisy, wydarzenia });
    const teraz = new Date();

    // Materializacja. `upsert` po kluczu UNIQUE (user_id, window_start, window_end):
    // to samo okno policzone drugi raz nadpisuje siebie, a nie tworzy duplikatu.
    const sladRes = await supabase
      .from('behavioural_trace')
      .upsert(wierszSladu({ userId, okno, slad, teraz }), { onConflict: 'user_id,window_start,window_end' });
    if (sladRes.error) {
      // Ślad jest materializacją, nie pomiarem — jego brak NIE unieważnia
      // kalibracji. Mówimy o tym w logu i idziemy dalej z liczbą, którą
      // policzyliśmy z tych samych danych.
      console.warn(SLAD_ODCZYT_WARN, sladRes.error);
    }

    const poprzedniZamkniety = (wiersze ?? []).find((r) => r.measured_at !== null) ?? null;
    const res = await supabase
      .from('calibration_measurements')
      .update(patchPomiaru({
        pomiar: slad.own_sessions,
        comparable: poprzedniZamkniety !== null,
        teraz,
      }))
      .eq('user_id', userId)
      .eq('id', stan.wiersz.id);
    setZapisuje(false);
    if (res.error) {
      console.warn(KALIBRACJA_ZAPIS_WARN, res.error);
      setBlad('Nie udało się zapisać pomiaru. Spróbuj jeszcze raz.');
      return;
    }
    // ⚠️ NAJPIERW `load()`, POTEM LICZNIK — patrz uwaga przy `setSladLinie(null)`
    // w `load()`. Odwrotna kolejność kasuje linijkę, zanim ktokolwiek ją zobaczy.
    await load();
    setSladLinie(opiszSlad(slad, okno));
  }, [userId, zapisuje, stan, wiersze, load]);

  const przelacznik = (
    <View style={styles.tabs}>
      {[
        { id: OS_FIZYCZNA as Os, label: 'Skok' },
        { id: OS_ZACHOWANIA as Os, label: 'Sesje własne' },
      ].map((t) => (
        <TouchableOpacity
          key={t.id}
          style={[styles.tab, os === t.id && styles.tabActive]}
          onPress={() => setOs(t.id)}
        >
          <Text style={[styles.tabText, os === t.id && styles.tabTextActive]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const naglowek = (
    <View style={styles.headRow}>
      <Text style={styles.title}>Kalibracja</Text>
      <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Zamknij">
        <Text style={styles.close}>Zamknij</Text>
      </TouchableOpacity>
    </View>
  );

  const ostatniOpis = (() => {
    if (!stan || stan.rodzaj !== 'zamkniete') return null;
    const o = stan.ostatni;
    if (o.measured_value === null) return null;
    // Poprzedni błąd liczymy z wierszy STARSZYCH niż ostatni — inaczej
    // porównalibyśmy pomiar sam ze sobą.
    const starsze = (wiersze ?? []).filter((r) => r.id !== o.id);
    return opiszKalibracje({
      predykcja: Number(o.predicted_value),
      pomiar: Number(o.measured_value),
      bladPoprzedni: poprzedniBlad(starsze),
      jednostka: jednostka as 'cm' | 'razy',
    });
  })();

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          {naglowek}
          {przelacznik}

          {stan === null && (
            <View style={{ paddingVertical: 40 }}><ActivityIndicator color={colors.brand} /></View>
          )}

          {stan?.rodzaj === 'nie_wiem' && (
            <>
              <Text style={styles.quiet}>{KALIBRACJA_NIE_WIEM}</Text>
              <TouchableOpacity style={styles.secondary} onPress={load}>
                <Text style={styles.secondaryText}>Spróbuj jeszcze raz</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── KROK 1: PREDYKCJA ─────────────────────────────────── */}
          {(stan?.rodzaj === 'brak_predykcji' || stan?.rodzaj === 'zamkniete') && (
            <>
              {ostatniOpis && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{ostatniOpis.tytul}</Text>
                  <Text style={styles.cardBody}>{ostatniOpis.tresc}</Text>
                  {/* Trzy stany komunikatu dotyczą WYNIKU, nie kalibracji —
                      pokazujemy je tylko dla osi fizycznej i tylko wtedy,
                      gdy poprzedni pomiar był porównywalny. */}
                  {os === OS_FIZYCZNA && stan.rodzaj === 'zamkniete' && (() => {
                    const o = stan.ostatni;
                    const poprz = (wiersze ?? []).filter((r) => r.id !== o.id && r.measured_value !== null)[0];
                    if (!poprz || o.comparable === false) return null;
                    // PLAN-D-J 08.2026 — trzeci parametr to STAN NAŁOŻONY
                    // PRZEZ ARBITRA. Przy `kalibracjaPrzeramowujeSpadek` stan
                    // trzeci przestaje nazywać spadek spadkiem (spec 3.2).
                    // Decyzja siedzi w `lib/kalibracja.ts`, tu tylko jej użycie.
                    const s = stanZmiany(
                      Number(o.measured_value) - Number(poprz.measured_value),
                      progZmiany(1),
                      ograniczenia,
                    );
                    return (
                      <View style={styles.inner}>
                        <Text style={styles.innerTitle}>{s.tytul}</Text>
                        <Text style={styles.cardBody}>{s.tresc}</Text>
                      </View>
                    );
                  })()}
                </View>
              )}

              {sladLinie && (
                <View style={[styles.card, { marginTop: spacing.md }]}>
                  <Text style={styles.cardTitle}>{`Ostatnie ${OKNO_DNI} dni, policzone`}</Text>
                  {sladLinie.map((l) => <Text key={l} style={styles.cardBody}>{l}</Text>)}
                </View>
              )}

              <Text style={styles.lead}>
                {os === OS_FIZYCZNA ? KALIBRACJA_PYTANIE_FIZYCZNA : KALIBRACJA_PYTANIE_ZACHOWANIE}
              </Text>
              <Text style={styles.quiet}>{KALIBRACJA_NIE_WIEM_PODPOWIEDZ}</Text>

              <TextInput
                style={styles.input}
                placeholder={os === OS_FIZYCZNA ? 'np. 38' : 'np. 12'}
                placeholderTextColor={colors.textTertiary}
                keyboardType={os === OS_FIZYCZNA ? 'decimal-pad' : 'number-pad'}
                value={predykcja}
                onChangeText={setPredykcja}
              />

              {os === OS_FIZYCZNA && (
                <>
                  <Text style={styles.sectionLabel}>Warunki pomiaru</Text>
                  <Text style={styles.quiet}>
                    Zapisz je teraz. Za sześć tygodni muszą być te same — inaczej tych dwóch liczb
                    nie da się porównać.
                  </Text>
                  <TextInput style={styles.input} placeholder="Godzina, np. 17:30"
                    placeholderTextColor={colors.textTertiary} value={poraDnia} onChangeText={setPoraDnia} />
                  <TextInput style={styles.input} placeholder="Nawierzchnia, np. beton"
                    placeholderTextColor={colors.textTertiary} value={nawierzchnia} onChangeText={setNawierzchnia} />
                  <TextInput style={styles.input} placeholder="Buty, np. korki"
                    placeholderTextColor={colors.textTertiary} value={obuwie} onChangeText={setObuwie} />
                </>
              )}

              {blad ? <Text style={styles.error}>{blad}</Text> : null}

              <TouchableOpacity
                style={[styles.primary, zapisuje && styles.primaryDisabled]}
                disabled={zapisuje}
                onPress={zapiszPredykcje}
              >
                <Text style={styles.primaryText}>{zapisuje ? 'Zapisuję…' : 'Zapisz moją liczbę'}</Text>
              </TouchableOpacity>
              <Text style={styles.quiet}>{KALIBRACJA_ZABLOKOWANE}</Text>
            </>
          )}

          {/* ── KROK 2: POMIAR ────────────────────────────────────── */}
          {stan?.rodzaj === 'czeka_na_pomiar' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Twoja liczba jest zapisana</Text>
                <Text style={styles.cardBody}>
                  {`Powiedziałeś ${String(stan.wiersz.predicted_value).replace('.', ',')}`
                    + `${os === OS_FIZYCZNA ? ' cm' : ''}. Teraz pomiar.`}
                </Text>
              </View>

              {os === OS_FIZYCZNA ? (
                <>
                  <Text style={styles.sectionLabel}>Jak mierzyć</Text>
                  {KALIBRACJA_PROTOKOL.map((l) => (
                    <View key={l} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>·</Text>
                      <Text style={styles.bullet}>{l}</Text>
                    </View>
                  ))}
                  <TextInput
                    style={styles.input}
                    placeholder="Średnia z 3 najlepszych, w cm"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    value={pomiar}
                    onChangeText={setPomiar}
                  />
                  {blad ? <Text style={styles.error}>{blad}</Text> : null}
                  <TouchableOpacity
                    style={[styles.primary, zapisuje && styles.primaryDisabled]}
                    disabled={zapisuje}
                    onPress={zapiszPomiar}
                  >
                    <Text style={styles.primaryText}>{zapisuje ? 'Zapisuję…' : 'Zapisz pomiar'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.quiet}>
                    {`Próg realnej zmiany to ${String(PROG_CMJ_JEDEN_DZIEN).replace('.', ',')} cm. `
                      + 'Wszystko poniżej jest szumem pomiarowym i tak to nazwiemy.'}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.quiet}>
                    {`Teraz policzę to z Twoich danych za ostatnie ${OKNO_DNI} dni. `
                      + 'Ty już powiedziałeś swoją liczbę — tej nie da się zmienić.'}
                  </Text>
                  {blad ? <Text style={styles.error}>{blad}</Text> : null}
                  <TouchableOpacity
                    style={[styles.primary, zapisuje && styles.primaryDisabled]}
                    disabled={zapisuje}
                    onPress={policzIZapiszZachowanie}
                  >
                    <Text style={styles.primaryText}>{zapisuje ? 'Liczę…' : 'Policz z moich danych'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {/* Zakaz 17: żadna treść nie kończy się na wiedzy. */}
          {stan && stan.rodzaj !== 'nie_wiem' && (
            <View style={styles.jutro}>
              <Text style={styles.jutroTitle}>Jedna rzecz na jutro</Text>
              <Text style={styles.jutroBody}>{KALIBRACJA_NA_JUTRO}</Text>
            </View>
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

  tabs: { flexDirection: 'row', marginBottom: spacing.lg },
  tab: {
    flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 2, borderBottomColor: colors.border,
  },
  tabActive: { borderBottomColor: colors.brand },
  tabText: { ...typography.bodyMedium, fontSize: 14, color: colors.textTertiary },
  tabTextActive: { ...typography.bodySemiBold, color: colors.textPrimary },

  lead: { ...typography.bodySemiBold, fontSize: 16, lineHeight: 23, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: 8 },
  quiet: { ...typography.body, fontSize: 13, lineHeight: 20, color: colors.textSecondary, marginBottom: spacing.md },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginTop: spacing.lg, marginBottom: 8 },
  error: { ...typography.bodyMedium, fontSize: 14, lineHeight: 21, color: colors.brand, marginTop: spacing.md },

  input: {
    minHeight: minTouchHeight, backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    paddingHorizontal: 14, marginBottom: 10,
    ...typography.body, fontSize: 16, color: colors.textPrimary,
  },

  bulletRow: { flexDirection: 'row', marginBottom: 8 },
  bulletDot: { ...typography.body, fontSize: 14, color: colors.textTertiary, width: 14 },
  bullet: { ...typography.body, fontSize: 13, lineHeight: 20, color: colors.textSecondary, flex: 1 },

  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: 18,
  },
  cardTitle: { ...typography.bodySemiBold, fontSize: 17, color: colors.textPrimary, marginBottom: 8 },
  cardBody: { ...typography.body, fontSize: 14, lineHeight: 21, color: colors.textSecondary, marginBottom: 4 },
  inner: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  innerTitle: { ...typography.bodySemiBold, fontSize: 15, color: colors.textPrimary, marginBottom: 6 },

  primary: {
    minHeight: minTouchHeight, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.brand, borderRadius: radii.md, marginTop: spacing.md,
  },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { ...typography.bodySemiBold, fontSize: 16, color: '#FFFFFF' },

  secondary: {
    minHeight: minTouchHeight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, marginTop: 10,
  },
  secondaryText: { ...typography.bodyMedium, fontSize: 15, color: colors.textSecondary },

  jutro: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.brand,
    borderRadius: radii.md, padding: 16, marginTop: spacing.lg,
  },
  jutroTitle: { ...typography.bodySemiBold, fontSize: 16, color: colors.textPrimary, marginBottom: 6 },
  jutroBody: { ...typography.body, fontSize: 14, lineHeight: 21, color: colors.textSecondary },
});
