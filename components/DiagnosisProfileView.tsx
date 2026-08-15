// WYNIK DIAGNOZY 07.08.2026 — NOWY PLIK.
// Warstwa widoku dla wyniku diagnozy. Cała logika (grupowanie, ranking
// przyczyn, progi) siedzi osobno w components/diagnosisProfile.ts — ten plik
// tylko renderuje. Ten sam podział co lib/livingDiagnosisCascade.ts (logika)
// vs components/LivingDiagnosisPulseCard.tsx (widok).
//
// ZASADA NADRZĘDNA TEGO EKRANU: zero surowej punktacji. Nigdzie nie pojawia
// się liczba 0-100 ani "62/100" — ani jako tekst, ani jako podpis paska.
// Paski pokazują wyłącznie POŁOŻENIE względem reszty własnego profilu
// zawodnika (relativeBarWidth), nie wartość bezwzględną.
//
// Ten komponent NIE zadaje zawodnikowi ani jednego pytania i niczego nie
// zapisuje do bazy — jest w całości po stronie ODDAWANIA wartości.
import type { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, radii } from '../constants/theme';
import { getPositionProfile } from '../lib/positionProfiles';
import {
  parseScores,
  getRelativeDeficits,
  groupSegmentsForDisplay,
  describeCause,
  getHiddenCauses,
  detectScenario,
  scenarioHeadline,
  segmentLabel,
  GROUP_HEADINGS_WITH_POSITION,
  GROUP_HEADINGS_NO_POSITION,
  type GroupKey,
  type GroupedSegment,
  type SegmentTier,
} from './diagnosisProfile';
// ⭐ PLAN-D-C3b 15.08.2026 — brzmienie „nie wiem" pochodzi z JEDNEJ funkcji
// decyzyjnej, tej samej, którą pas C3 wpiął na sześciu ekranach. Ten plik
// nie wymyśla własnego zdania (zakaz 4 polecenia C3b).
import { rozpoznajPustke } from '../lib/trzyPustki';

/**
 * ⭐ PLAN-D-C3b 15.08.2026 — TRZY STANY WĄSKIEGO GARDŁA, NIE DWA.
 *
 * ── CO BYŁO NIE TAK ──────────────────────────────────────────────────
 * Do dziś ten komponent brał `goalSegmentId: string | null` i renderował
 * `null` jako zdanie **„Nie masz jeszcze wąskiego gardła."** `diagnoza.tsx`
 * podawał `null` także wtedy, gdy odczyt `goals` PADŁ (`goalRes.error ? null`)
 * — więc zawodnik z założonym wąskim gardłem czytał, że go nie ma, a razem
 * z tym zdaniem dostawał zaproszenie do założenia drugiego.
 * Pas C3 zmierzył tę ścieżkę i **nie mógł jej naprawić**: zdanie mieszka tutaj,
 * a ten plik nie był na jego liście. Stąd nota zablokowania C3 §15 i ten pas.
 *
 * ── DLACZEGO TAGOWANA UNIA, A NIE OPCJONALNY PROP ────────────────────
 * Polecenie C3b dało jedno kryterium wyboru kształtu: **pominięcie nowego
 * stanu przez kolejny ekran ma ZAPALIĆ `tsc`.** Zmierzone na obu propozycjach:
 *
 *   • `odczytCeluUdanySie?: boolean | null` — **znak zapytania czyni prop
 *     opcjonalnym**, więc nowy ekran, który go nie poda, kompiluje się
 *     w ciszy. To jest dokładnie ten cichy brak, który ten pas usuwa.
 *   • `goalSegmentId: string | null | 'nie_wiem'` — poszerzenie typu jest
 *     nadtypem starego, więc ekran podający `string | null` też kompiluje się
 *     w ciszy i nigdy nie obsłuży trzeciego stanu.
 *
 * Żaden z dwóch nie spełnia kryterium. Spełnia je **wymagany prop o typie
 * tagowanej unii**: pominięcie to TS2741, podanie starego kształtu to TS2322,
 * a dołożenie czwartego stanu zapala `never` w `SekcjaWaskiegoGardla`.
 * ⚠️ Dowód nie jest deklaracją — trzy mutacje w `lib/trzyPustki.selftest.ts`
 * (sekcja 12) sprawdzają, że każdy z tych trzech błędów naprawdę wychodzi.
 */
export type StanCelu =
  /** Odczyt przeszedł i zawodnik ma priorytetowe wąskie gardło. */
  | { stan: 'jest'; segmentId: string }
  /** Odczyt przeszedł i zawodnik naprawdę żadnego nie ma. */
  | { stan: 'brak' }
  /** ⭐ Odczyt PADŁ. Nie wiemy, czy ma — i nie wolno nam zgadywać. */
  | { stan: 'nie_wiem' };

type Props = {
  /** Surowa zawartość `diagnostics.scores` — obiekt albo string JSON. */
  scoresRaw: unknown;
  /** `player_profiles.position_primary` (polska etykieta) albo null. */
  positionLabel: string | null;
  /**
   * ⭐ PLAN-D-C3b 15.08.2026 — było `goalSegmentId: string | null`.
   * Prop jest WYMAGANY świadomie; patrz uzasadnienie przy `StanCelu`.
   */
  cel: StanCelu;
  onOpenGoals: () => void;
  onOpenProfile: () => void;
  /** Renderowane, gdy `scores` nie da się odczytać (patrz parseScores). */
  fallback: ReactNode;
};

// W1: 08.2026 — kolory grup wg koncepcji identyfikacji (komponent 4):
// PRIORYTET = karmazyn (bad), WYKORZYSTAJ = zieleń (ok), ROZWIJAJ = żółć (mid),
// W TLE = neutralny. Do tej rundy g1 świeciło KOLOREM MARKI — a zasada
// nadrzędna koncepcji brzmi: marka nigdy nie ocenia danych.
const GROUP_COLOR: Record<GroupKey, string> = {
  g1: colors.error,
  g2: colors.success,
  g3: colors.caution,
  g4: colors.textSecondary,
};

const TIER_LABEL: Record<SegmentTier, string> = {
  key: 'kluczowe',
  important: 'ważne',
  minor: 'drugorzędne',
};

function SegmentRow({ entry, color, showTier }: { entry: GroupedSegment; color: string; showTier: boolean }) {
  return (
    <View style={styles.segRow}>
      <View style={styles.segHead}>
        <Text style={styles.segName}>{entry.name}</Text>
        {showTier && entry.tier ? <Text style={styles.segTier}>{TIER_LABEL[entry.tier]}</Text> : null}
      </View>
      <View style={styles.barTrack}>
        {/* Rzutowanie na `${number}%` — RN 0.81 typuje `width` jako
            DimensionValue, a szablon z liczbą zmiennej daje zwykły `string`. */}
        <View style={[styles.barFill, { width: `${entry.barW}%` as `${number}%`, backgroundColor: color }]} />
        {/* W1: znacznik środka — 50% paska to własna mediana zawodnika
            (relativeBarWidth), zawodnik widzi punkt odniesienia bez liczb */}
        <View style={styles.barMid} />
      </View>
    </View>
  );
}

export default function DiagnosisProfileView({
  scoresRaw, positionLabel, cel, onOpenGoals, onOpenProfile, fallback,
}: Props) {
  const scores = parseScores(scoresRaw);
  if (!scores) return <>{fallback}</>;

  const positionProfile = getPositionProfile(positionLabel);
  const tiers = (positionProfile ? positionProfile.tiers : null) as Record<string, SegmentTier> | null;

  const deficits = getRelativeDeficits(scores, 4);
  const scenario = detectScenario(scores, !!positionProfile);
  const { headline, desc } = scenarioHeadline(scenario, deficits.length);
  const { groups, hasTiers } = groupSegmentsForDisplay(scores, tiers);
  const headings = hasTiers ? GROUP_HEADINGS_WITH_POSITION : GROUP_HEADINGS_NO_POSITION;
  const groupOrder: GroupKey[] = hasTiers ? ['g1', 'g2', 'g3', 'g4'] : ['g1', 'g2', 'g4'];

  const hiddenCause = getHiddenCauses(scores, deficits, 0.5)[0] ?? null;

  // Powiązanie z Celem — bez ani jednego dodatkowego pytania do zawodnika:
  // wszystko liczone z danych, które system już ma.
  const goalInGroup: GroupKey | null = cel.stan === 'jest'
    ? (groupOrder.find((k) => groups[k].some((e) => e.id === cel.segmentId)) ?? null)
    : null;

  return (
    <View>
      {/* NAGŁÓWEK SCENARIUSZOWY — zamiast wyniku ogólnego. */}
      <View style={styles.headlineBlock}>
        <Text style={styles.eyebrow}>Twój profil z diagnozy</Text>
        {/* W1: nagłówek scenariusza to OCENA DANYCH — karmazyn/pomarańcz,
            nigdy kolor marki (zasada nadrzędna koncepcji) */}
        <Text style={[styles.headline, { color: scenario === 1 ? colors.error : colors.warning }]}>{headline}</Text>
        <Text style={styles.headlineDesc}>{desc}</Text>
        {scenario === 3 ? (
          <TouchableOpacity onPress={onOpenProfile}>
            <Text style={styles.link}>Uzupełnij pozycję w Profilu →</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* PRZYCZYNY — sedno systemu: opis przyczynowy, nie objawowy. */}
      <Text style={styles.sectionLabel}>{deficits.length ? 'Kluczowe wąskie gardła' : 'Twój kierunek pracy'}</Text>
      <Text style={styles.sectionHint}>{deficits.length ? 'Tu powinieneś zacząć pracę' : 'Tu warto zainwestować uwagę'}</Text>

      {deficits.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardBody}>
            Nic wyraźnie nie odstaje w Twoim profilu — to nie jest porażka systemu, to prawdziwa informacja o Twojej
            grze. Poniżej zobaczysz, które obszary są dla Ciebie najważniejsze.
          </Text>
        </View>
      ) : (
        deficits.map(([id], i) => {
          const cause = describeCause(scores, id);
          return (
            <View key={id} style={styles.deficitRow}>
              <Text style={[styles.deficitRank, i === 0 && styles.deficitRankTop]}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.deficitName}>{segmentLabel(id)}</Text>
                <Text style={styles.deficitCause}>
                  {cause.kind === 'standalone' ? cause.text : (
                    <>
                      {cause.before}
                      <Text style={styles.deficitCauseStrong}>{cause.primaryName}</Text>
                      {cause.after}
                    </>
                  )}
                </Text>
              </View>
            </View>
          );
        })
      )}

      {hiddenCause ? (
        <View style={styles.hiddenCause}>
          <Text style={styles.hiddenCauseLabel}>Ukryta przyczyna</Text>
          <Text style={styles.hiddenCauseText}>
            <Text style={styles.deficitCauseStrong}>{segmentLabel(hiddenCause.id)}</Text>
            {' nie odstaje w Twoim profilu, więc łatwo go pominąć — ale to on silnie wpływa na obszary wypisane wyżej ('}
            {Array.from(new Set(hiddenCause.causesFor)).map(segmentLabel).join(', ')}
            {'). Jeśli praca nad nimi nie przynosi efektu, zacznij stąd.'}
          </Text>
        </View>
      ) : null}

      {/* 13 OBSZARÓW W GRUPACH — bez ani jednej liczby. */}
      <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>Twoja gra, obszar po obszarze</Text>
      <Text style={styles.sectionHint}>
        {hasTiers
          ? 'Względem reszty Twoich własnych wyników i ważności na Twojej pozycji'
          : 'Względem reszty Twoich własnych wyników'}
      </Text>

      {groupOrder.map((key) => {
        const entries = groups[key];
        if (!entries.length) return null;
        const h = headings[key];
        return (
          <View key={key} style={[styles.groupSection, { borderLeftColor: GROUP_COLOR[key] }]}>
            <View style={styles.groupHead}>
              <Text style={styles.groupTitle}>{h.title}</Text>
              <Text style={[styles.groupBadge, { color: GROUP_COLOR[key], borderColor: GROUP_COLOR[key] }]}>{h.badge}</Text>
            </View>
            <Text style={styles.groupDesc}>{h.desc}</Text>
            {entries.map((e) => (
              <SegmentRow key={e.id} entry={e} color={GROUP_COLOR[key]} showTier={hasTiers} />
            ))}
          </View>
        );
      })}

      {/* POWIĄZANIE Z CELEM — domyka pętlę "skąd się to wzięło". */}
      {/* PLAN-D-A 08.2026 — ta sekcja czyta `goals`, czyli WĄSKIE GARDŁO. */}
      {/* ⭐ PLAN-D-C3b 15.08.2026 — trzy gałęzie zamiast dwóch. Układ, karta
          i style bez zmian; zmienia się wyłącznie to, że „nie masz" i „nie
          wiem" przestały być jednym zdaniem. */}
      <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>Twoje wąskie gardło a ten profil</Text>
      <SekcjaWaskiegoGardla
        cel={cel}
        goalInGroup={goalInGroup}
        headings={headings}
        onOpenGoals={onOpenGoals}
      />
    </View>
  );
}

/**
 * ⭐ PLAN-D-C3b 15.08.2026 — wydzielone z ciała `DiagnosisProfileView`, żeby
 * `stanNieobsluzony` miał gdzie stanąć. To jest cała rzecz, która sprawia,
 * że czwarty stan `StanCelu` NIE PRZEJDZIE po cichu: dołożenie go do unii
 * bez dołożenia gałęzi tutaj zapala `tsc` na przypisaniu do `never`.
 */
function SekcjaWaskiegoGardla({
  cel, goalInGroup, headings, onOpenGoals,
}: {
  cel: StanCelu;
  goalInGroup: GroupKey | null;
  headings: typeof GROUP_HEADINGS_WITH_POSITION;
  onOpenGoals: () => void;
}) {
  // ⭐ „Nie wiem" idzie PRZED „nie masz" — ten sam porządek, który
  // `rozpoznajPustke` ustaliła dla sześciu pozostałych ekranów.
  if (cel.stan === 'nie_wiem') {
    // ⛔ Brzmienie NIE JEST tu wymyślane. Pochodzi z tej samej funkcji
    // decyzyjnej, co na sześciu ekranach pasa C3 — z wyjściem właściwym dla
    // `diagnoza.tsx`, który jako jedyny z siedmiu NIE MA `RefreshControl`
    // (zmierzone przez C3) i odświeża się dopiero przy wejściu na ekran.
    const pustka = rozpoznajPustke({
      maWpisy: false,
      planLekcjiZnany: null,
      moznaZapisywac: null,
      odczytUdanySie: false,
      daSieOdswiezyc: false,
    });
    if (!pustka) return null;
    return (
      <View style={styles.card}>
        <Text style={styles.cardBody}>{pustka.tekst}</Text>
        {/* ⛔ ANI JEDNEGO wejścia „Wskaż pierwsze wąskie gardło →". Nie wiemy,
            czy zawodnik jakieś ma — a wysłanie go po drugie byłoby zdaniem
            o nim postawionym na odczycie, który nie doszedł. Następnym krokiem
            jest sprawdzenie jeszcze raz i tyle mu mówimy. */}
        <Text style={styles.cardBody}>{pustka.cta}</Text>
      </View>
    );
  }

  if (cel.stan === 'brak') {
    return (
      <View style={styles.card}>
        <Text style={styles.cardBody}>
          Nie masz jeszcze wąskiego gardła. To ten profil decyduje, co system Ci podpowiada — najwięcej zmieni
          praca w obszarze z pierwszej grupy powyżej.
        </Text>
        <TouchableOpacity onPress={onOpenGoals}>
          <Text style={styles.link}>Wskaż pierwsze wąskie gardło →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (cel.stan === 'jest') {
    return (
      <View style={[styles.card, goalInGroup === 'g1' && styles.cardHighlighted]}>
        <Text style={styles.cardBody}>
          {goalInGroup === 'g1'
            ? `Twoje wąskie gardło to ${segmentLabel(cel.segmentId)} — obszar z grupy „${headings.g1.title}". Stąd biorą się zadania i rekomendacje, które dostajesz.`
            : goalInGroup
              ? `Twoje wąskie gardło to ${segmentLabel(cel.segmentId)} — obszar z grupy „${headings[goalInGroup].title}". Twoim najmocniejszym punktem zaczepienia jest dziś grupa „${headings.g1.title}" powyżej.`
              : `Twoje wąskie gardło to ${segmentLabel(cel.segmentId)}. Ten obszar nie ma jeszcze wyniku w Twojej ostatniej diagnozie.`}
        </Text>
        <TouchableOpacity onPress={onOpenGoals}>
          <Text style={styles.link}>Zobacz wąskie gardła →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ⛔ NIEOSIĄGALNE I O TO CHODZI. Dołożenie czwartego stanu do `StanCelu`
  // bez dołożenia gałęzi wyżej zapala tu `tsc` (TS2322: nie da się przypisać
  // do `never`) — czyli dokładnie to, czego wymagało kryterium z C3b.1.
  const stanNieobsluzony: never = cel;
  return stanNieobsluzony;
}

const styles = StyleSheet.create({
  headlineBlock: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg,
    backgroundColor: colors.surface, padding: 20, marginBottom: spacing.lg,
  },
  eyebrow: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 8 }, // W1: ink3
  headline: { ...typography.displayExtraBold, fontSize: 28, lineHeight: 32, marginBottom: 8 },
  headlineDesc: { ...typography.body, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  link: { ...typography.bodyMedium, fontSize: 13, color: colors.brand, marginTop: 10 },

  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 2 }, // W1: ink3
  sectionHint: { ...typography.body, fontSize: 12, color: colors.textSecondary, marginBottom: 12, opacity: 0.8 },

  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 16, marginBottom: 10 },
  cardHighlighted: { borderLeftWidth: 4, borderLeftColor: colors.brand },
  cardBody: { ...typography.body, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

  deficitRow: { flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 16, marginBottom: 10 },
  deficitRank: { ...typography.displayExtraBold, fontSize: 20, color: colors.textSecondary, width: 28 },
  deficitRankTop: { color: colors.error }, // W1: ranga deficytu = ocena danych → karmazyn, nie marka
  deficitName: { ...typography.bodySemiBold, fontSize: 15, color: colors.textPrimary, marginBottom: 6 },
  deficitCause: { ...typography.body, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  deficitCauseStrong: { ...typography.bodySemiBold, color: colors.textPrimary },

  hiddenCause: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 16, marginBottom: 10 },
  hiddenCauseLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 6 },
  hiddenCauseText: { ...typography.body, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

  groupSection: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4,
    borderRadius: radii.md, padding: 16, marginBottom: 12,
  },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  groupTitle: { ...typography.display, fontSize: 18, color: colors.textPrimary, flexShrink: 1, paddingRight: 8 },
  groupBadge: { ...typography.bodyMedium, fontSize: 10, letterSpacing: 1, borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  groupDesc: { ...typography.body, fontSize: 12, color: colors.textSecondary, marginBottom: 12, lineHeight: 17 },

  segRow: { marginBottom: 10 },
  segHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  segName: { ...typography.body, fontSize: 13, color: colors.textPrimary, flexShrink: 1, paddingRight: 8 },
  segTier: { ...typography.body, fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  // W1: tor z tokenu (koniec rgba na sztywno) + znacznik środka (mediana)
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  barMid: { position: 'absolute', left: '50%', marginLeft: -1, top: 0, bottom: 0, width: 2, backgroundColor: colors.textTertiary, opacity: 0.7 },
});
