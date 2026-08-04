// Onboarding pierwszego uruchomienia — Krok 1 Toru 7
// (SESJA_START_UX_MOBILE_ONBOARDING_NAWIGACJA.md). Pokazywany RAZ, sterowany
// znacznikiem player_profiles.onboarding_completed_at (patrz lib/onboarding.ts
// i app/_layout.tsx, gdzie ten komponent jest wpięty w RootGate — ten sam
// wzorzec "gate screen" co LoginScreen/BiometricLockScreen/
// ProfileNotReadyScreen: plain component, żadnej własnej logiki Supabase
// poza tym co dostaje w propsach).
//
// Ostatni ekran (powiadomienia) CELOWO NIE duplikuje mechanizmu proszenia o
// zgodę na push — `requestPushPermission`/`dismissPushPriming` przekazane z
// RootGate to owinięte `requestPermission`/`dismissPriming` z DOKŁADNIE
// tego samego hooka usePushRegistration() (lib/push-notifications.ts), który
// poza onboardingiem steruje PushPrimingBanner. Obie ścieżki ustawiają ten
// sam znacznik AsyncStorage (PRIMING_DISMISSED_KEY) — więc PushPrimingBanner
// nie zapyta drugi raz zaraz po zakończeniu onboardingu, niezależnie którą
// z dwóch opcji zawodnik wybierze tutaj.
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii, minTouchHeight } from '../constants/theme';

type Props = {
  onFinish: () => void;
  requestPushPermission: () => Promise<void>;
  dismissPushPriming: () => Promise<void>;
};

// Treść — patrz dokument startowy sesji: appka to jedna spójna pętla
// (Dziennik → Centrum Decyzji → Kalendarz → Cele), nie 7 osobnych funkcji;
// fraza-kotwica "narzędzie jest nawigatorem, nie trenerem" (już ustalona
// jako oficjalna tożsamość systemu, PLAN_SPOJNEJ_SCIEZKI.md sekcja 5 pkt 3)
// wpleciona dosłownie w ekran 1.
const STEPS = [
  {
    title: 'Witaj w Gamechange',
    body:
      'To narzędzie pomoże Ci świadomie zarządzać swoim rozwojem. Nie poprowadzi za Ciebie treningu i nie zastąpi trenera — pokaże Ci, na czym się dziś skupić i dlaczego.\n\nNarzędzie jest nawigatorem, nie trenerem.',
  },
  {
    title: 'Jedna pętla, nie 7 osobnych funkcji',
    body:
      'Na co dzień appka to prosty cykl: zapisujesz obserwacje w Dzienniku → system pokazuje w Centrum Decyzji, co teraz warto zrobić → Ty planujesz to w Kalendarzu. Wszystko po to, żeby Twój Cel realnie się przybliżał.',
  },
  {
    title: 'Twój Cel prowadzi w tle',
    body:
      'Masz zawsze jeden aktywny Cel — to on decyduje, która rekomendacja i które wydarzenie w kalendarzu są dla Ciebie najważniejsze. Pełny widok swojego Celu znajdziesz zawsze w zakładce Cele.',
  },
  {
    title: 'Włącz powiadomienia',
    body:
      'Przypomnimy Ci o porannym wpisie i nowych rekomendacjach w Centrum Decyzji — bez zalewu, tylko to, co faktycznie wartościowe.',
  },
];

export default function OnboardingFlow({ onFinish, requestPushPermission, dismissPushPriming }: Props) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  // "Pomiń" przeskakuje do ekranu powiadomień zamiast od razu kończyć
  // onboarding — to jedyny krok z realną konsekwencją (zgoda systemowa),
  // więc zawsze pokazany świadomie, nawet gdy zawodnik pomija resztę treści.
  const skipToNotifications = () => setStep(STEPS.length - 1);

  const finishWith = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
      onFinish();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.top}>
        {!isFirst ? (
          <TouchableOpacity onPress={back} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.topLink}>Wstecz</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        {!isLast && (
          <TouchableOpacity onPress={skipToNotifications} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.topLink}>Pomiń</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>
      </View>

      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.bottom}>
        {!isLast ? (
          <TouchableOpacity style={styles.btn} onPress={next}>
            <Text style={styles.btnText}>Dalej</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.btn, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={() => finishWith(requestPushPermission)}
            >
              <Text style={styles.btnText}>{busy ? 'Chwila...' : 'Włącz powiadomienia'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={() => finishWith(dismissPushPriming)}
            >
              <Text style={styles.secondaryBtnText}>Nie teraz</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  top: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 32, alignItems: 'center' },
  topLink: { ...typography.body, fontSize: 13, color: colors.textSecondary, textDecorationLine: 'underline' },
  content: { flex: 1, justifyContent: 'center' },
  title: { ...typography.display, fontSize: 26, color: colors.textPrimary, marginBottom: spacing.md },
  body: { ...typography.body, fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.lg },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.brand, width: 18 },
  bottom: { gap: spacing.sm },
  btn: { minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  secondaryBtn: { minHeight: minTouchHeight, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, alignItems: 'center' },
  secondaryBtnText: { ...typography.bodyMedium, color: colors.textPrimary, fontSize: 14 },
});
