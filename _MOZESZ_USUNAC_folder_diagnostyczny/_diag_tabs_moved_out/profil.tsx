// Ekran PROFIL — Krok 3.5 checklisty. Implementacja wg
// docs/KONTRAKT_PROFIL.md (spisanego z panel-profil w asystent_app.html
// PRZED tym kodem). Pierwszy ekran w kolejności Fazy 2 — czeka na
// potwierdzenie "zgadza się" po porównaniu z wersją webową, zanim ruszy
// Dziennik (Krok 6).
// AUDYT 27.07.2026: ŚWIADOMIE bez useFocusEffect (w przeciwieństwie do
// pozostałych 6 ekranów — patrz uzasadnienie w app/(tabs)/dziennik.tsx).
// Profil to jedyny ekran, który wczytuje dane do EDYTOWALNEGO formularza
// (imię, pozycja, poziom, cel kierunkowy, sprzęt, tryb kontuzji), nie do
// listy tylko-do-odczytu/formularza-dodawania-nowego-wpisu jak pozostałe
// ekrany. useFocusEffect nadpisywałby niezapisane zmiany w polach za każdym
// powrotem na tę zakładkę (np. zawodnik zaczął edytować imię, przełączył się
// na Kalendarz sprawdzić coś, wrócił — stracił to, co wpisał). Nic innego w
// appce nie zapisuje do tych samych pól w tle, więc ryzyko "danych
// nieaktualnych" tu nie występuje tak jak np. w Meczu (zależnym od trybu
// kontuzji ustawianego właśnie tutaj) — jednokrotne wczytanie przy
// montowaniu zostaje poprawnym zachowaniem.
import { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { toLocalDateStr } from '../../lib/date-utils';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';
import {
  isBiometricHardwareAvailable,
  isBiometricLockEnabled,
  enableBiometricLock,
  disableBiometricLock,
} from '../../lib/biometric-auth';

// ── Stałe — 1:1 z asystent_app.html (kontrakt, sekcje 1-4) ──
const POSITIONS = [
  'Bramkarz', 'Środkowy obrońca', 'Boczny obrońca', 'Defensywny pomocnik',
  'Środkowy pomocnik', 'Ofensywny pomocnik', 'Skrzydłowy', 'Napastnik', 'Nie dotyczy',
];
const CURRENT_LEVELS = [
  'Amator / rekreacyjnie', 'Juniorski klub', 'Seniorski klub amatorski',
  'Półprofesjonalny', 'Profesjonalny',
];
const GOAL_DIRECTION_LABELS: Record<string, string> = {
  more_minutes: 'Więcej minut w meczach',
  move_up: 'Awans na wyższy poziom',
  improve_element: 'Poprawa konkretnego elementu gry',
  avoid_relegation_from_team: 'Utrzymanie miejsca w składzie',
  other: 'Inne',
};
const EQUIPMENT_LABELS: Record<string, string> = {
  silownia: 'Siłownia',
  biezna: 'Bieżnia',
  gumy_oporowe: 'Gumy oporowe',
  boisko: 'Dostęp do boiska',
  brak_dostepu: 'Brak dostępu do sprzętu',
};
const INJURY_MODE_CATEGORY_LABELS: Record<string, string> = {
  lower_body: 'Dolna część ciała',
  upper_body: 'Górna część ciała',
  general: 'Ogólne / całe ciało',
};
const BODY_LOCATIONS: [string, string][] = [
  ['kostka', 'Kostka'], ['kolano', 'Kolano'], ['udo_przednie', 'Udo przednie'],
  ['udo_tylne', 'Udo tylne'], ['lydka', 'Łydka'], ['pachwina', 'Pachwina'],
  ['biodro', 'Biodro'], ['stopa', 'Stopa'], ['achilles', 'Ścięgno Achillesa'],
  ['plecy_kregoslup', 'Plecy / kręgosłup'], ['brzuch_tulow', 'Brzuch / tułów'],
  ['bark', 'Bark'], ['lokiec', 'Łokieć'], ['nadgarstek_dlon', 'Nadgarstek / dłoń'],
  ['glowa_twarz', 'Głowa / twarz'], ['klatka_piersiowa_zebra', 'Klatka piersiowa / żebra'],
  ['inne', 'Inne'],
];
const BODY_LOCATION_LABELS = Object.fromEntries(BODY_LOCATIONS);
const NON_LATERAL_LOCATIONS = new Set(['plecy_kregoslup', 'brzuch_tulow', 'inne']);

type InjuryRow = {
  id: number;
  injury_type: string;
  body_location: string;
  side: string | null;
  period_from: string | null;
  period_to: string | null;
  fully_healed: boolean;
};

function formatDatePl(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProfilScreen() {
  const { currentUser } = useAuth();

  // Sekcja 1-2
  const [fullName, setFullName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [posPrimary, setPosPrimary] = useState('');
  const [posSecondary, setPosSecondary] = useState('');
  const [currentLevel, setCurrentLevel] = useState('');
  const [highestLevel, setHighestLevel] = useState('');

  // Sekcja 3
  const [goalDirection, setGoalDirection] = useState('');
  const [goalNote, setGoalNote] = useState('');

  // Sekcja 4
  const [equipment, setEquipment] = useState<Record<string, boolean>>({});

  // Sekcja 5
  const [injuryModeActive, setInjuryModeActive] = useState(false);
  const [injuryModeCategory, setInjuryModeCategory] = useState('');

  // Sekcja 6 — Krok 3.4: blokada biometryczna (Face ID/Touch ID zamiast kodu OTP przy kolejnych otwarciach)
  const [biometricHardwareOk, setBiometricHardwareOk] = useState(false);
  const [biometricLockOn, setBiometricLockOn] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileOk, setProfileOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sekcja 7 — nowy wpis historii kontuzji (formularz niezależny)
  const [injuryType, setInjuryType] = useState('');
  const [injuryLocation, setInjuryLocation] = useState<string>(BODY_LOCATIONS[0][0]);
  const [injurySide, setInjurySide] = useState('');
  // AUDYT 28.07.2026 (ta sama luka co Kalendarz — web używa natywnego
  // <input type="date"> dla tych dwóch pól, patrz KONTRAKT_PROFIL.md,
  // "Uwaga o wierności" przy sekcji 7): Date zamiast zwykłego tekstu +
  // @react-native-community/datetimepicker (już zależność z Kroku 8).
  const [injuryFrom, setInjuryFrom] = useState<Date | null>(null);
  const [injuryTo, setInjuryTo] = useState<Date | null>(null);
  const [showInjuryFromPicker, setShowInjuryFromPicker] = useState(false);
  const [showInjuryToPicker, setShowInjuryToPicker] = useState(false);
  const [injuryHealed, setInjuryHealed] = useState(true);
  const [addingInjury, setAddingInjury] = useState(false);

  // Sekcja 8
  const [injuryHistory, setInjuryHistory] = useState<InjuryRow[]>([]);

  const loadProfile = useCallback(async () => {
    // Konwencja z web: load* NIE czyści banerów błędu/OK — patrz kontrakt sekcja 9.
    if (!currentUser) return;
    try {
      const [userRes, profileRes, injuryRes] = await Promise.all([
        supabase.from('users').select('full_name,birth_year').eq('id', currentUser.id).limit(1),
        supabase.from('player_profiles').select('*').eq('user_id', currentUser.id).limit(1),
        supabase.from('injury_history').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }),
      ]);

      const u = userRes.data?.[0];
      setFullName(u?.full_name ?? '');
      setBirthYear(u?.birth_year != null ? String(u.birth_year) : '');

      const p = profileRes.data?.[0];
      setPosPrimary(p?.position_primary ?? '');
      setPosSecondary(p?.position_secondary ?? '');
      setCurrentLevel(p?.current_level ?? '');
      setHighestLevel(p?.highest_level_ever ?? '');
      setGoalDirection(p?.goal_direction ?? '');
      setGoalNote(p?.goal_direction_note ?? '');
      const equip: Record<string, boolean> = {};
      (p?.equipment_access ?? []).forEach((id: string) => { equip[id] = true; });
      setEquipment(equip);
      setInjuryModeActive(!!p?.injury_mode_active);
      setInjuryModeCategory(p?.injury_mode_category ?? '');

      setInjuryHistory(injuryRes.data ?? []);
    } catch (e: any) {
      setProfileError('Nie udało się wczytać profilu: ' + e.message);
    }
  }, [currentUser]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    let mounted = true;
    Promise.all([isBiometricHardwareAvailable(), isBiometricLockEnabled()]).then(([hw, enabled]) => {
      if (!mounted) return;
      setBiometricHardwareOk(hw);
      setBiometricLockOn(enabled);
    });
    return () => { mounted = false; };
  }, []);

  const toggleBiometricLock = async (next: boolean) => {
    setBiometricBusy(true);
    setProfileError(null);
    try {
      if (next) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.refresh_token) throw new Error('Brak aktywnej sesji.');
        await enableBiometricLock(session.refresh_token);
      } else {
        await disableBiometricLock();
      }
      setBiometricLockOn(next);
    } catch (e: any) {
      setProfileError('Nie udało się zmienić ustawienia logowania biometrycznego: ' + e.message);
    } finally {
      setBiometricBusy(false);
    }
  };

  const saveProfile = async () => {
    if (!currentUser) return;
    setProfileError(null);
    setProfileOk(null);

    // Walidacja twarda — kontrakt sekcja 5.
    if (injuryModeActive && !injuryModeCategory) {
      setProfileError('Wybierz kategorię ograniczenia dla trybu kontuzji.');
      return;
    }

    setSaving(true);
    try {
      // Krok 1: TYLKO full_name/birth_year na public.users (kontrakt sekcja 6).
      const { error: userErr } = await supabase
        .from('users')
        .update({
          full_name: fullName || null,
          birth_year: birthYear !== '' ? Number(birthYear) : null,
        })
        .eq('id', currentUser.id);
      if (userErr) throw userErr;

      // Krok 2: upsert player_profiles.
      const equipmentAccess = Object.keys(EQUIPMENT_LABELS).filter((id) => equipment[id]);
      const { error: profileErr } = await supabase
        .from('player_profiles')
        .upsert(
          {
            user_id: currentUser.id,
            position_primary: posPrimary || null,
            position_secondary: posSecondary || null,
            current_level: currentLevel || null,
            highest_level_ever: highestLevel || null,
            goal_direction: goalDirection || null,
            goal_direction_note: goalDirection === 'other' ? (goalNote.trim() || null) : null,
            equipment_access: equipmentAccess,
            injury_mode_active: injuryModeActive,
            injury_mode_category: injuryModeActive ? injuryModeCategory : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      if (profileErr) throw profileErr;

      setProfileOk('Profil zapisany.');
    } catch (e: any) {
      setProfileError('Nie udało się zapisać profilu: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const addInjuryHistory = async () => {
    if (!currentUser) return;
    setProfileError(null);
    setProfileOk(null);
    if (!injuryType.trim()) {
      setProfileError('Podaj rodzaj kontuzji.');
      return;
    }
    setAddingInjury(true);
    try {
      const side = NON_LATERAL_LOCATIONS.has(injuryLocation) ? null : (injurySide || null);
      const { data, error } = await supabase
        .from('injury_history')
        .insert({
          user_id: currentUser.id,
          injury_type: injuryType,
          body_location: injuryLocation,
          side,
          period_from: injuryFrom ? toLocalDateStr(injuryFrom) : null,
          period_to: injuryTo ? toLocalDateStr(injuryTo) : null,
          fully_healed: injuryHealed,
        })
        .select();
      if (error) throw error;

      if (data && data[0]) {
        setInjuryHistory((prev) => [data[0] as InjuryRow, ...prev]);
      }
      // Reset — lokalizacja/strona CELOWO nieresetowane, patrz kontrakt sekcja 7.
      setInjuryType('');
      setInjuryFrom(null);
      setInjuryTo(null);
      setInjuryHealed(true);
      setProfileOk('Dodano do historii kontuzji.');
    } catch (e: any) {
      setProfileError('Nie udało się dodać wpisu: ' + e.message);
    } finally {
      setAddingInjury(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={styles.title}>Profil</Text>

      {profileError && <Text style={styles.error}>{profileError}</Text>}
      {profileOk && <Text style={styles.ok}>{profileOk}</Text>}

      {/* Dane podstawowe */}
      <View style={styles.block}>
        <Text style={styles.blockLabel}>Dane podstawowe</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.staticValue}>{currentUser?.email ?? '—'}</Text>
        <Text style={styles.label}>Imię i nazwisko</Text>
        <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} value={fullName} onChangeText={setFullName} placeholder="np. Jan Kowalski" />
        <Text style={styles.label}>Rok urodzenia</Text>
        <TextInput
          style={styles.input} placeholderTextColor={colors.textSecondary} value={birthYear} onChangeText={setBirthYear}
          keyboardType="number-pad" placeholder="np. 2008"
        />
      </View>

      {/* Pozycja i poziom */}
      <View style={styles.block}>
        <Text style={styles.blockLabel}>Pozycja i poziom</Text>
        <Text style={styles.label}>Pozycja podstawowa</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={posPrimary} onValueChange={setPosPrimary}>
            <Picker.Item label="— wybierz —" value="" />
            {POSITIONS.map((p) => <Picker.Item key={p} label={p} value={p} />)}
          </Picker>
        </View>
        <Text style={styles.label}>Pozycja dodatkowa (opcjonalnie)</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={posSecondary} onValueChange={setPosSecondary}>
            <Picker.Item label="— brak —" value="" />
            {POSITIONS.map((p) => <Picker.Item key={p} label={p} value={p} />)}
          </Picker>
        </View>
        <Text style={styles.label}>Obecny poziom gry</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={currentLevel} onValueChange={setCurrentLevel}>
            <Picker.Item label="— wybierz —" value="" />
            {CURRENT_LEVELS.map((l) => <Picker.Item key={l} label={l} value={l} />)}
          </Picker>
        </View>
        <Text style={styles.label}>Najwyższy poziom, na jakim kiedykolwiek grałeś</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={highestLevel} onValueChange={setHighestLevel}>
            <Picker.Item label="— wybierz —" value="" />
            {CURRENT_LEVELS.map((l) => <Picker.Item key={l} label={l} value={l} />)}
          </Picker>
        </View>
      </View>

      {/* Cel kierunkowy */}
      <View style={styles.block}>
        <Text style={styles.blockLabel}>Cel kierunkowy</Text>
        <Text style={styles.hint}>
          To ogólny kierunek, nie konkretny, śledzony cel — przy zakładaniu Twojego
          pierwszego celu w zakładce Cele przypomnimy Ci o nim, żebyś mógł wybrać
          konkretny segment, którego dotyczy.
        </Text>
        <Text style={styles.label}>Co jest dla Ciebie teraz najważniejsze?</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={goalDirection} onValueChange={setGoalDirection}>
            <Picker.Item label="— wybierz —" value="" />
            {Object.entries(GOAL_DIRECTION_LABELS).map(([id, label]) => (
              <Picker.Item key={id} label={label} value={id} />
            ))}
          </Picker>
        </View>
        {goalDirection === 'other' && (
          <>
            <Text style={styles.label}>Doprecyzowanie</Text>
            <TextInput
              style={[styles.input, styles.textarea]} placeholderTextColor={colors.textSecondary} value={goalNote} onChangeText={setGoalNote}
              placeholder="Opisz swój cel własnymi słowami" multiline
            />
          </>
        )}
      </View>

      {/* Dostęp do sprzętu */}
      <View style={styles.block}>
        <Text style={styles.blockLabel}>Dostęp do sprzętu</Text>
        {Object.entries(EQUIPMENT_LABELS).map(([id, label]) => (
          <TouchableOpacity
            key={id} style={styles.checkboxRow}
            onPress={() => setEquipment((e) => ({ ...e, [id]: !e[id] }))}
          >
            <Checkbox value={!!equipment[id]} onValueChange={(v) => setEquipment((e) => ({ ...e, [id]: v }))} />
            <Text style={styles.checkboxLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tryb kontuzji */}
      <View style={styles.block}>
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setInjuryModeActive((v) => !v)}>
          <Checkbox value={injuryModeActive} onValueChange={setInjuryModeActive} />
          <Text style={styles.checkboxLabel}>
            Jestem teraz w trybie kontuzji (wykluczony z normalnego treningu)
          </Text>
        </TouchableOpacity>
        {injuryModeActive && (
          <>
            <Text style={styles.label}>Której części ciała to dotyczy?</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={injuryModeCategory} onValueChange={setInjuryModeCategory}>
                <Picker.Item label="— wybierz —" value="" />
                {Object.entries(INJURY_MODE_CATEGORY_LABELS).map(([id, label]) => (
                  <Picker.Item key={id} label={label} value={id} />
                ))}
              </Picker>
            </View>
          </>
        )}
      </View>

      {/* Bezpieczeństwo — Krok 3.4 */}
      {biometricHardwareOk && (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Bezpieczeństwo</Text>
          <TouchableOpacity
            style={styles.checkboxRow}
            disabled={biometricBusy}
            onPress={() => toggleBiometricLock(!biometricLockOn)}
          >
            <Checkbox value={biometricLockOn} onValueChange={(v) => toggleBiometricLock(v)} disabled={biometricBusy} />
            <Text style={styles.checkboxLabel}>
              Loguj się Face ID / Touch ID zamiast kodu z maila przy kolejnych otwarciach appki
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} disabled={saving} onPress={saveProfile}>
        <Text style={styles.btnText}>{saving ? 'Zapisuję...' : 'Zapisz profil'}</Text>
      </TouchableOpacity>

      {/* Dodaj wpis do historii kontuzji — formularz niezależny */}
      <View style={{ marginTop: 40 }}>
        <Text style={styles.sectionLabel}>Dodaj wpis do historii kontuzji</Text>
        <View style={styles.block}>
          <Text style={styles.label}>Rodzaj kontuzji</Text>
          <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} value={injuryType} onChangeText={setInjuryType} placeholder="np. skręcenie kostki" />

          <Text style={styles.label}>Lokalizacja</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={injuryLocation} onValueChange={setInjuryLocation}>
              {BODY_LOCATIONS.map(([id, label]) => <Picker.Item key={id} label={label} value={id} />)}
            </Picker>
          </View>

          {!NON_LATERAL_LOCATIONS.has(injuryLocation) && (
            <>
              <Text style={styles.label}>Strona</Text>
              <View style={styles.pickerWrap}>
                <Picker selectedValue={injurySide} onValueChange={setInjurySide}>
                  <Picker.Item label="—" value="" />
                  <Picker.Item label="Lewa" value="left" />
                  <Picker.Item label="Prawa" value="right" />
                </Picker>
              </View>
            </>
          )}

          <Text style={styles.label}>Od kiedy (opcjonalnie)</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowInjuryFromPicker(true)}>
            <Text style={{ color: injuryFrom ? colors.textPrimary : colors.textSecondary }}>
              {injuryFrom ? injuryFrom.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Wybierz datę'}
            </Text>
          </TouchableOpacity>
          {showInjuryFromPicker && (
            <DateTimePicker
              value={injuryFrom ?? new Date()}
              mode="date"
              onChange={(_event, selected) => {
                setShowInjuryFromPicker(false);
                if (selected) setInjuryFrom(selected);
              }}
            />
          )}

          <Text style={styles.label}>Do kiedy (opcjonalnie, jeśli już zagojona)</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowInjuryToPicker(true)}>
            <Text style={{ color: injuryTo ? colors.textPrimary : colors.textSecondary }}>
              {injuryTo ? injuryTo.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Wybierz datę'}
            </Text>
          </TouchableOpacity>
          {showInjuryToPicker && (
            <DateTimePicker
              value={injuryTo ?? new Date()}
              mode="date"
              onChange={(_event, selected) => {
                setShowInjuryToPicker(false);
                if (selected) setInjuryTo(selected);
              }}
            />
          )}

          <TouchableOpacity style={styles.checkboxRow} onPress={() => setInjuryHealed((v) => !v)}>
            <Checkbox value={injuryHealed} onValueChange={setInjuryHealed} />
            <Text style={styles.checkboxLabel}>Już w pełni zagojona</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnSecondary, addingInjury && styles.btnDisabled]}
            disabled={addingInjury}
            onPress={addInjuryHistory}
          >
            <Text style={styles.btnSecondaryText}>{addingInjury ? 'Dodaję...' : 'Dodaj do historii'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Historia kontuzji */}
      <View style={{ marginTop: 24 }}>
        <Text style={styles.sectionLabel}>Historia kontuzji</Text>
        {injuryHistory.length === 0 && <Text style={styles.empty}>Brak wpisów w historii kontuzji.</Text>}
        {injuryHistory.map((row) => {
          const loc = BODY_LOCATION_LABELS[row.body_location] ?? row.body_location;
          const side = row.side === 'left' ? ' (L)' : row.side === 'right' ? ' (P)' : '';
          const dates: string[] = [];
          if (row.period_from) dates.push('od ' + formatDatePl(row.period_from));
          if (row.period_to) dates.push('do ' + formatDatePl(row.period_to));
          return (
            <View key={row.id} style={styles.historyCard}>
              <View style={styles.historyTop}>
                <Text style={styles.historyType}>{row.injury_type}</Text>
                <Text style={styles.historyDate}>{row.fully_healed ? 'Zagojona' : 'W trakcie leczenia'}</Text>
              </View>
              <Text style={styles.historyDetail}>
                {loc}{side}{dates.length ? ' · ' + dates.join(' – ') : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 28, marginBottom: spacing.lg, color: colors.textPrimary },
  block: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.md },
  blockLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: spacing.md },
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: spacing.md },
  label: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 6, marginTop: 4 },
  hint: { ...typography.body, fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
  staticValue: { ...typography.body, fontSize: 14, color: colors.textPrimary, marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background, padding: 10,
    fontSize: 14, marginBottom: spacing.sm, color: colors.textPrimary,
  },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  pickerWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background, marginBottom: spacing.sm },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 10 },
  checkboxLabel: { ...typography.body, fontSize: 14, color: colors.textPrimary, flexShrink: 1 },
  btn: { minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  btnSecondary: { minHeight: minTouchHeight, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, alignItems: 'center', marginTop: spacing.sm },
  btnSecondaryText: { ...typography.bodyMedium, color: colors.textPrimary, fontSize: 13, letterSpacing: 0.3 },
  error: { color: colors.error, fontSize: 13, marginBottom: spacing.md },
  ok: { color: colors.success, fontSize: 13, marginBottom: spacing.md },
  empty: { textAlign: 'center', padding: spacing.lg, color: colors.textSecondary, fontSize: 14 },
  historyCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 14, marginBottom: 10 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  historyType: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary },
  historyDate: { fontSize: 12, color: colors.textSecondary },
  historyDetail: { ...typography.body, fontSize: 13, color: colors.textSecondary },
});
