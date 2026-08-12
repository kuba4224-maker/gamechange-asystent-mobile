// ZMIANA OBRAZU B5 08.08.2026 — NOWY PLIK.
// Stacja „Zmiana obrazu" — jedyna pusta stacja pętli od początku projektu.
// ⚠️ PLAN-D-A 08.2026 — dla zawodnika ta rzecz nazywa się od teraz BLOK.
// UWAGA: ten plik NIE zawiera ani jednego zdania widocznego dla zawodnika —
// cała treść pochodzi z `lib/rediagnosis.ts` (`buildRediagnosisView`), który
// leży POZA pasem tej sesji. Jeśli tam padają słowa „Blok Skupienia" albo
// „Cel" w znaczeniu `goals`, zmiana nazw jest w tym miejscu NIEDOKOŃCZONA —
// patrz raport PLAN-D-A, sekcja 4.
//
// Renderowana wewnątrz przeglądu zamknięcia Bloku
// (components/FocusBlockActiveView.tsx), między podsumowaniem a pytaniem
// „Co dalej?".
//
// DLACZEGO TU, A NIE NA OSOBNYM EKRANIE: decyzja A8 mówi „rediagnoza PRZY
// ZAMKNIĘCIU Bloku", a zamknięcie to jest ten jeden moment, w którym zawodnik
// sam przyszedł podsumować 4-8 tygodni pracy. Osobny ekran znaczyłby kolejne
// drzwi, w które trzeba wejść — i pytanie oderwane od powodu, dla którego jest
// zadawane. Ten komponent nie jest plikiem w `app/(tabs)/`, więc nie dotyka
// paska zakładek (pułapka B14).
//
// CAŁA TREŚĆ I WSZYSTKIE REGUŁY SIEDZĄ W `lib/rediagnosis.ts`
// (`buildRediagnosisView`). Ten plik wyłącznie rysuje to, co tamta funkcja
// zwróci, i nie dokłada ani jednego zdania — dzięki temu wypis w raporcie
// („co zawodnik realnie zobaczy") jest wyjściem tego samego kodu, który maluje
// ekran, a nie tekstem przepisanym ręcznie.
//
// TRZY RZECZY, KTÓRE MUSZĄ BYĆ PRAWDZIWE (polecenie B, runda 5):
//  • zawodnik widzi RÓŻNICĘ — dwa paski, „byłeś tu, jesteś tu", nigdy sam
//    nowy wynik;
//  • różnica MOŻE BYĆ UJEMNA i wtedy też jest pokazywana, bez pocieszania;
//  • rediagnoza jest POMIJALNA — „Nie chcę teraz odpowiadać" nie zapisuje
//    niczego i przepuszcza zawodnika wprost do zamknięcia Bloku.
//
// ⚠️ NIGDY NIE BLOKUJE ZAMKNIĘCIA BLOKU. `onResolved()` leci także wtedy, gdy
// odczyt się nie powiódł, gdy nie ma punktu odniesienia i gdy segment jest
// spoza banku. Stacja, która przy błędzie sieci uwięziłaby zawodnika w
// przeglądzie, byłaby gorsza niż brak stacji.
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, typography, spacing, radii, minTouchHeight, skew } from '../constants/theme';
import { getPositionWordingKey } from '../lib/positionProfiles';
import {
  buildRediagnosisView,
  weeksWorked,
  REDIAGNOSIS_SAVING_LABEL,
  type RediagnosisBaseline,
} from '../lib/rediagnosis';
import { fetchRediagnosisContext, saveRediagnosisAnswer } from '../lib/rediagnosisIO';

type Props = {
  userId: string;
  segmentId: string;
  /** `focus_blocks.started_at` — wyznacza, która diagnoza jest „sprzed bloku". */
  blockStartedAt: string;
  /** Wywoływane RAZ, gdy stacja przestaje stać na drodze do „Co dalej?".
   *  Rodzic trzyma to w stanie i dopiero wtedy rysuje trzy przyciski. */
  onResolved: () => void;
};

export default function BlockClosingRediagnosis({ userId, segmentId, blockStartedAt, onResolved }: Props) {
  const [loading, setLoading] = useState(true);
  const [baseline, setBaseline] = useState<RediagnosisBaseline>({ state: 'error' });
  const [answer, setAnswer] = useState<number | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wordingKey, setWordingKey] = useState<string | null>(null);

  // `onResolved` może być tylko raz — rodzic po nim odsłania przyciski
  // zamknięcia, a drugie wywołanie nic by nie zmieniło poza szumem.
  const resolvedRef = useRef(false);
  const resolve = useCallback(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onResolved();
  }, [onResolved]);

  const weeks = weeksWorked(blockStartedAt, new Date());

  // Bezpiecznik: gdyby odczyt utknął (sieć wisi, a nie zwraca błędu), po 12 s
  // stacja odpuszcza i odsłania „Co dalej?". Bez tego zawodnik zostałby
  // uwięziony w przeglądzie zamknięcia z samym podsumowaniem i bez przycisków
  // — czyli nowa stacja zabrałaby mu funkcję, którą miał wczoraj.
  const LOAD_TIMEOUT_MS = 12000;

  useEffect(() => {
    let alive = true;
    const bail = setTimeout(() => {
      if (!alive) return;
      setLoading(false);
      setBaseline({ state: 'error' });
      resolve();
    }, LOAD_TIMEOUT_MS);
    (async () => {
      try {
        const ctx = await fetchRediagnosisContext({ userId, segmentId, blockStartedAt });
        if (!alive) return;
        setBaseline(ctx.baseline);
        setWordingKey(getPositionWordingKey(ctx.positionPrimary));
        if (ctx.existingAnswer != null) {
          // Zawodnik już odpowiedział w trakcie tego Bloku (np. otworzył
          // przegląd drugi raz) — pokazujemy tę samą różnicę, nie pytamy znowu.
          setAnswer(ctx.existingAnswer);
          resolve();
        } else if (ctx.baseline.state !== 'ready') {
          // Nie ma czego z czym porównać — stacji nie ma, droga wolna.
          resolve();
        }
      } catch {
        if (!alive) return;
        setBaseline({ state: 'error' });
        resolve();
      } finally {
        clearTimeout(bail);
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; clearTimeout(bail); };
  }, [userId, segmentId, blockStartedAt, resolve]);

  const onAnswer = async (value: number) => {
    setSaving(true);
    const { saved: ok } = await saveRediagnosisAnswer(userId, segmentId, value);
    setSaved(ok);
    setAnswer(value);
    setSaving(false);
    resolve();
  };

  const onSkip = () => {
    // Nic nie zapisujemy. Świadomie także NIE zapamiętujemy pominięcia —
    // pominięcie nie jest danymi o zawodniku i nie może się liczyć jako spadek.
    setSkipped(true);
    resolve();
  };

  const view = buildRediagnosisView({
    segmentId, baseline, answerValue: answer, skipped, saved, wordingKey, weeks, loading,
  });

  // ════════════════════════════════════════════════════════════
  // NAPRAWA A4c — 10.08.2026
  //
  // Nagłówek tego pliku obiecuje wprost, że `onResolved()` leci TAKŻE wtedy,
  // gdy segment jest spoza banku pytań. Kod tej obietnicy nie realizował:
  // `buildRediagnosisView` zwraca `{kind:'absent', reason:'unknown_segment'}`
  // ZANIM w ogóle sprawdzi baseline, więc efekt wyżej nie wołał `resolve()`
  // (bo `baseline.state` bywa wtedy `ready`), a render kończył się cichym
  // `return null`.
  //
  // Skutek był poważny i całkowicie niewidoczny: `rediagnosisResolved`
  // w `FocusBlockActiveView` zostawało `false`, więc trzy przyciski
  // „Co dalej?" NIE POJAWIAŁY SIĘ NIGDY — a ekran przeglądu nie ma innego
  // wyjścia. Zawodnik zostawał uwięziony na podsumowaniu własnego Bloku.
  // Wystarczał jeden segment albo wariant pozycyjny bez wpisu w banku.
  //
  // Efekt, a nie wywołanie wprost w renderze — `resolve()` ustawia stan
  // rodzica, więc w renderze byłaby to aktualizacja stanu podczas
  // renderowania (ostrzeżenie Reacta i realne ryzyko pętli).
  // ════════════════════════════════════════════════════════════
  useEffect(() => {
    if (view.kind === 'absent') resolve();
  }, [view.kind, resolve]);

  if (view.kind === 'absent') return null;

  if (view.kind === 'question') {
    return (
      <View style={styles.wrap}>
        {/* W1: krecha 12° */}
        <View style={styles.wrapStripe} />
        <Text style={styles.eyebrow}>{view.eyebrow}  ·  {view.segmentName}</Text>
        <Text style={styles.lead}>{view.lead}</Text>
        <Text style={styles.question}>{view.question}</Text>
        <Text style={styles.ctx}>{view.ctx}</Text>
        {saving ? (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={colors.brand} />
            <Text style={styles.savingText}>{REDIAGNOSIS_SAVING_LABEL}</Text>
          </View>
        ) : (
          <>
            <View style={styles.scaleGrid}>
              {view.scale.map(([value, label]) => (
                <TouchableOpacity key={value} style={styles.scaleBtn} onPress={() => onAnswer(value)}>
                  <Text style={styles.scaleNum}>{value}</Text>
                  <Text style={styles.scaleLabel}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.skipLink} onPress={onSkip}>
              <Text style={styles.skipLinkText}>{view.skipLabel}</Text>
            </TouchableOpacity>
            <Text style={styles.skipNote}>{view.skipNote}</Text>
          </>
        )}
      </View>
    );
  }

  // Stan „change" — to jest cała stacja „Zmiana obrazu".
  // Dwa paski, jeden pod drugim, w tej kolejności: najpierw skąd, potem dokąd.
  // Bez liczb — ekran Diagnoza od rundy 1 świadomie nie pokazuje surowej
  // punktacji i tu obowiązuje to samo. Zawodnik ma zobaczyć RUCH, nie wynik.
  return (
    <View style={styles.wrap}>
      {/* W1: krecha 12° */}
      <View style={styles.wrapStripe} />
      <Text style={styles.eyebrow}>{view.eyebrow}  ·  {view.segmentName}</Text>

      <View style={styles.barRow}>
        <Text style={styles.barCaption}>{view.beforeCaption}</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, styles.barFillBefore, { width: `${view.beforeBarPercent}%` }]} />
        </View>
      </View>
      <View style={styles.barRow}>
        <Text style={styles.barCaption}>{view.afterCaption}</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${view.afterBarPercent}%` }]} />
        </View>
      </View>

      <Text style={styles.headline}>{view.headline}</Text>
      <Text style={styles.body}>{view.body}</Text>
      {view.notSavedText ? <Text style={styles.notSaved}>{view.notSavedText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Ta sama rodzina co karta rekomendacji i karta pulsu — zawodnik nie ma
  // rozpoznawać nowego rodzaju kafelka w momencie, w którym czyta o sobie.
  // W1: prosta krecha borderLeft → krecha ŚCIĘTA 12° (karta „to jest o Tobie");
  // absolutna, wysokość karty bez zmian. Paski przed/dziś ZOSTAJĄ w przygaszonej
  // marce (wzorzec „bez oceny", jak RPE) i BEZ ścięcia — to dane, nie postęp.
  wrap: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingVertical: 16, paddingLeft: 22, paddingRight: 16,
    marginTop: 12, marginBottom: 4,
  },
  wrapStripe: { ...skew.stripe, left: 8, top: 16, height: 36, backgroundColor: colors.brand },
  eyebrow: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 10 }, // W1: ink3
  lead: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginBottom: 12 },
  question: { ...typography.bodySemiBold, fontSize: 15, lineHeight: 21, color: colors.textPrimary, marginBottom: 6 },
  ctx: { ...typography.body, fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginBottom: spacing.md },
  scaleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scaleBtn: { width: '31%', minHeight: minTouchHeight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background, paddingVertical: 8 },
  scaleNum: { ...typography.bodySemiBold, fontSize: 16, color: colors.textPrimary },
  scaleLabel: { ...typography.body, fontSize: 10, color: colors.textSecondary, textAlign: 'center', marginTop: 2 },
  skipLink: { marginTop: spacing.md, minHeight: minTouchHeight, alignItems: 'center', justifyContent: 'center' },
  skipLinkText: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary, textDecorationLine: 'underline' },
  skipNote: { ...typography.body, fontSize: 12, lineHeight: 17, color: colors.textSecondary, textAlign: 'center' },
  savingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: minTouchHeight, gap: 8 },
  savingText: { ...typography.body, fontSize: 13, color: colors.textSecondary },
  barRow: { marginBottom: 10 },
  barCaption: { ...typography.bodyMedium, fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: colors.background, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5, backgroundColor: colors.brand },
  // Pasek „przed" jest przygaszony, a nie w innym kolorze — inny kolor
  // znaczyłby ocenę („zielony/czerwony"), a ta stacja świadomie nie ocenia.
  barFillBefore: { opacity: 0.4 },
  headline: { ...typography.bodySemiBold, fontSize: 15, lineHeight: 21, color: colors.textPrimary, marginTop: 6, marginBottom: 6 },
  body: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  notSaved: { ...typography.body, fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 10 },
});
