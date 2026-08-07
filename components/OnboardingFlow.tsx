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

// Treść. Fraza-kotwica "narzędzie jest nawigatorem, nie trenerem" (oficjalna
// tożsamość systemu, PLAN_SPOJNEJ_SCIEZKI.md sekcja 5 pkt 3) wpleciona dosłownie
// w ekran 1.
//
// AUDYT 06.08.2026 — z czterech ekranów zostały trzy. Usunięte:
//  • "Jedna pętla, nie 7 osobnych funkcji" — tłumaczył zawodnikowi wewnętrzną
//    historię refaktoru ("7 funkcji", których nigdy nie widział) i opisywał pętlę
//    Dziennik → Centrum Decyzji → Kalendarz, w której nie ma ekranu Dziś, czyli
//    tego, na którym zawodnik za chwilę wyląduje.
//  • "Twój Cel prowadzi W TLE" — stał w jawnej sprzeczności z decyzją z 06.08.2026
//    (BRIEF_DELEGACJA_PROMINENCJA_CELU.md), że Cel ma być największym, PIERWSZYM
//    elementem ekranu Dziś. Onboarding nie został wtedy zaktualizowany.
// Ekran 2 poniżej zastępuje oba jednym zdaniem zgodnym z aktualną decyzją.
const STEPS = [
  {
    title: 'Witaj w Gamechange',
    body:
      'To narzędzie pomoże Ci świadomie zarządzać swoim rozwojem. Nie poprowadzi za Ciebie treningu i nie zastąpi trenera — pokaże Ci, na czym się dziś skupić i dlaczego.\n\nNarzędzie jest nawigatorem, nie trenerem.',
  },
  {
    title: 'Wszystko kręci się wokół Twojego Celu',
    body:
      'Masz jeden aktywny Cel — zobaczysz go na samej górze ekranu Dziś, za każdym razem gdy otworzysz appkę. To on decyduje, co system Ci podpowiada i co warto zaplanować.\n\nZaczynasz od zapisania, jak się dziś czujesz. Reszta buduje się na tym.',
  },
  {
    title: 'Włącz powiadomienia',
    body:
      // JEDNA DROGA B2 08.08.2026 — zdanie mówiło zawodnikowi, że nowe rekomendacje
      // są „w Centrum Decyzji". Po scaleniu najnowsza rekomendacja stoi na ekranie
      // Dziś, a zakładki o tej nazwie już nie ma — to była instrukcja prowadząca
      // w miejsce, którego zawodnik nie znajdzie. Zmieniona wyłącznie nazwa miejsca.
      'Przypomnimy Ci o porannym wpisie i o nowej rekomendacji na ekranie Dziś — bez zalewu, tylko to, co faktycznie wartościowe.',
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
