// TOR 7 KROK 5a (31.07.2026) — Blok Skupienia, Faza 1 "Start": precyzowanie +
// dozowanie + automatyczny wpis do kalendarza. Punkt startowy:
// claude/SESJA_START_UX_MOBILE_BLOK_SKUPIENIA.md. Projekt wzorcowy:
// claude/PLAN_SPOJNEJ_SCIEZKI.md sekcja 3D (dozowanie) / 3F (przykład Bartek).
//
// Wpięty w app/(tabs)/cele.tsx: przycisk "Zaplanuj pracę nad tym celem" na
// karcie aktywnego celu renderuje ten komponent w miejscu przycisku (inline,
// nie modal — appka nigdzie jeszcze nie używa React Native Modal, więc
// trzymamy się już istniejącego wzorca progresywnego rozwijania w miejscu,
// tego samego co przepływ Obszar→Element w cele.tsx z Toru 7 Kroku 4).
//
// WAŻNE: `goals.refinement_note` (Krok 4) przechowuje WYŁĄCZNIE nazwę
// wybranego Elementu jako tekst — NIE przechowuje `segment_components.id`.
// Dlatego gdy cel już ma `refinement_note`, wywołanie endpointu dozowania
// używa `customDescription`, nie `componentId` (nie mamy skąd wziąć id).
// Tylko gdy zawodnik świeżo wybiera Element z listy w TYM komponencie, mamy
// realne `componentId` i przekazujemy je (odrobinę bogatszy opis po stronie
// endpointu — patrz fetchComponentOrCustom w generate-focus-block-dosing.js).
//
// Krok 0 tej sesji (żywe zapytania do Supabase) potwierdził: `focus_blocks`
// istnieje, `component_id` jest typu TEXT (zgodnie z poprawką z poprzedniej
// sesji), `calendar_events.focus_block_id` (uuid, FK) istnieje,
// `chk_recurrence_xor_date` wymusza dokładnie jedno z `recurrence_rule`/
// `scheduled_date` — stąd ten komponent tworzy N osobnych wierszy
// `calendar_events` ze `scheduled_date`, nie jeden cykliczny wiersz.
//
// ⚠️ NIEAKTUALNE OD 10.08.2026, zostawione jako zapis stanu: „jeden aktywny
// Blok na filar" było egzekwowane indeksem `one_active_focus_block_per_pillar`.
// Ten indeks NIE ISTNIEJE — patrz sekcja „BUDŻET UWAGI" niżej i
// claude/STAN_BAZY_POTWIERDZONY_A1_10_08_2026.md (odczyt produkcyjny).
import { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Checkbox from 'expo-checkbox';
import { supabase } from '../lib/supabase';
import { DAYS_OF_WEEK, toLocalDateStr } from '../lib/date-utils';
// ZAPIS B7 08.08.2026 — „Skąd to wiemy" przy sugestii dozowania: ten sam
// formatter źródła co podpowiedź na Dziś i dawka w Bloku (jedna reguła).
import { formatHintSource } from '../lib/componentHints';
import { colors, typography, radii, minTouchHeight } from '../constants/theme';
// PLAN-D-A 08.2026 — czysta logika budżetu uwagi, sprawdzana przez
// lib/budzetUwagi.selftest.ts bez uruchamiania Reacta.
import {
  type BudzetStan,
  type BudzetView,
  type OtwartyBlok,
  jednostkiSlowo,
  budzetBlokadaKomunikat,
  isBudzetError,
} from '../lib/budzetUwagi';

const FOCUS_BLOCK_DOSING_API_URL = 'https://gamechange-app.vercel.app/api/generate-focus-block-dosing';

// Te same 4 wartości co w cele.tsx (Tor 7 Krok 4) — świadoma duplikacja, ten
// sam wzorzec co SEG_NAMES/SEG_PILLAR w całym projekcie (patrz nagłówek
// generate-focus-block-dosing.js).
const EVIDENCE_LABELS: Record<string, string> = {
  SILNE: 'silne dowody naukowe',
  REASONABLE: 'dość dobre dowody',
  'PRAKTYKA TRENERSKA': 'praktyka trenerska',
  MIESZANE: 'mieszane dowody',
};

const SESSIONS_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

// PLAN-D-A 08.2026 — BUDŻET UWAGI (naprawa A2).
// Cała logika i całe uzasadnienie siedzą w `lib/budzetUwagi.ts`, razem
// z selftestem. Tutaj zostaje wyłącznie rysowanie.
//
// DLACZEGO BUDŻET JEST W TYM KOMPONENCIE, A NIE TYLKO W OBSŁUDZE BŁĘDU:
// cała różnica między limitem a budżetem polega na tym, że budżet WIDAĆ
// WCZEŚNIEJ. Limit jest regułą, o której zawodnik dowiaduje się, uderzając
// w nią na końcu przepływu; budżet jest liczbą, którą można pokazać na
// początku. Jeśli zawodnik poznaje go z błędu — ta zmiana nie ma sensu.

type Goal = { id: number; segment_id: string; refinement_note: string | null };
type SegmentComponent = { id: string; name: string; evidence_strength?: string | null };
// ZAPIS B7 08.08.2026 — kontrakt fazy 1 (raport A rundy 6, sekcja 13):
// `sourceHint` ma DOKŁADNIE ten sam kształt co `decision_recommendations.
// source_hint` (r4) i `content_doses[].zrodlo_podpowiedzi` (r5). `null` =
// dozowanie powstało bez podpowiedzi z materiałów — sekcji wtedy NIE MA.
// Pola `celowanie`/`wybor`/`klucz` są diagnostyczne i nie idą na ekran.
type DosingSourceHint = {
  wersja?: number;
  tresc?: string | null;
  material?: string | null;
  strona?: string | null;
};
type Suggestion = {
  days: Set<string>; durationMinutes: number; weeks: number; reasoning: string;
  sourceHint: DosingSourceHint | null;
};

type Props = {
  goal: Goal;
  segmentLabel: string;
  pillar: string;
  currentUserId: string;
  onClose: () => void;
  onCreated: () => void;
};

// Generuje sessions_per_week × target_weeks dat: dla każdego wybranego dnia
// tygodnia — najbliższe wystąpienie od dziś, potem co 7 dni przez `weeks`
// tygodni. Zgodnie z Krokiem 0 tej sesji: calendar_events.recurrence_rule to
// wzorzec BEZ KOŃCA (brak pola "liczba wystąpień"), więc Blok Skupienia
// (ograniczona liczba sesji) musi tworzyć osobne wiersze ze scheduled_date.
function buildScheduledDates(dayCodes: string[], weeks: number): string[] {
  const today = new Date();
  const curIdx = (today.getDay() + 6) % 7; // Pon=0..Nd=6, jak w date-utils
  const dates: string[] = [];
  for (const code of dayCodes) {
    const targetIdx = DAYS_OF_WEEK.findIndex(([c]) => c === code);
    if (targetIdx === -1) continue;
    const diff = (targetIdx - curIdx + 7) % 7;
    const first = new Date(today);
    first.setDate(today.getDate() + diff);
    for (let w = 0; w < weeks; w++) {
      const d = new Date(first);
      d.setDate(first.getDate() + w * 7);
      dates.push(toLocalDateStr(d));
    }
  }
  return dates;
}

export default function FocusBlockPlanner({ goal, segmentLabel, pillar, currentUserId, onClose, onCreated }: Props) {
  const [step, setStep] = useState<'refine' | 'frequency' | 'suggestion'>('refine');

  // ── PLAN-D-A 08.2026 — budżet uwagi, ładowany PRZED pierwszym wyborem ──
  const [budzet, setBudzet] = useState<BudzetView>({ kind: 'loading' });
  const [otwarteBloki, setOtwarteBloki] = useState<OtwartyBlok[]>([]);

  const loadBudzet = useCallback(async () => {
    // `focus_budget_state()` to jedyne źródło liczb budżetu — appka NIE liczy
    // ich sama, żeby nie powstała druga definicja tego samego limitu.
    // Funkcja może zwrócić obiekt albo jednoelementową tablicę zależnie od
    // tego, jak jest zadeklarowana — czytamy oba kształty.
    const { data, error: err } = await supabase.rpc('focus_budget_state');
    const wiersz: any = Array.isArray(data) ? data[0] : data;
    if (err || !wiersz || typeof wiersz.limit_jednostek !== 'number') {
      // R5: brak odpowiedzi i „zero zajęte" to dwie różne rzeczy. Nigdy nie
      // udajemy pustego budżetu — zawodnik dostałby wtedy zaproszenie do
      // zaplanowania Bloku, który baza i tak odrzuci.
      console.warn('[budzet] Nie udało się odczytać focus_budget_state():', err?.message ?? 'nieznany kształt odpowiedzi');
      setBudzet({ kind: 'unknown' });
      return;
    }
    setBudzet({ kind: 'ready', stan: wiersz as BudzetStan });
  }, []);

  const loadOtwarteBloki = useCallback(async () => {
    // Potrzebne wyłącznie po to, żeby komunikat o przekroczeniu budżetu mógł
    // powiedzieć, KTÓRY Blok zamknąć. Bez tego zostaje „nie możesz".
    const { data, error: err } = await supabase
      .from('focus_blocks')
      .select('id, segment_id, custom_description, sessions_per_week, segment_components(name)')
      .eq('user_id', currentUserId)
      .eq('status', 'active');
    if (err) {
      console.warn('[budzet] Nie udało się odczytać otwartych Bloków:', err.message);
      setOtwarteBloki([]);
      return;
    }
    setOtwarteBloki(((data ?? []) as any[]).map((r) => ({
      id: r.id,
      label: r.custom_description ?? r.segment_components?.name ?? r.segment_id,
      jednostki: r.sessions_per_week ?? 1,
    })));
  }, [currentUserId]);

  useEffect(() => {
    loadBudzet();
    loadOtwarteBloki();
  }, [loadBudzet, loadOtwarteBloki]);

  // --- Krok "co precyzyjnie" — reużywa wzorzec Obszar→Element→"opisz sam"
  // z cele.tsx (Tor 7 Krok 4), zawężony do stałego segmentu tego celu. ---
  const [confirmedText, setConfirmedText] = useState(goal.refinement_note ?? '');
  const [confirmedComponentId, setConfirmedComponentId] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(!goal.refinement_note);
  const [obszary, setObszary] = useState<SegmentComponent[]>([]);
  const [obszaryLoading, setObszaryLoading] = useState(false);
  const [selectedObszarId, setSelectedObszarId] = useState<string | null>(null);
  const [elementy, setElementy] = useState<SegmentComponent[]>([]);
  const [elementyLoading, setElementyLoading] = useState(false);
  const [freeTextMode, setFreeTextMode] = useState(false);
  const [freeText, setFreeText] = useState('');

  const loadObszary = useCallback(async () => {
    setObszaryLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('segment_components')
        .select('id, name')
        .eq('segment_id', goal.segment_id)
        .is('parent_component_id', null)
        .order('display_order', { ascending: true });
      if (err) throw err;
      const rows = (data ?? []) as SegmentComponent[];
      setObszary(rows);
      // Segment bez Obszarów w bazie (dziś: wyłącznie techSpec) — bezpieczny
      // spadek na "opisz sam", tak samo jak w cele.tsx.
      if (rows.length === 0) setFreeTextMode(true);
    } catch {
      setObszary([]);
      setFreeTextMode(true);
    } finally {
      setObszaryLoading(false);
    }
  }, [goal.segment_id]);

  useEffect(() => {
    if (browsing && obszary.length === 0 && !obszaryLoading) loadObszary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browsing]);

  const loadElementy = useCallback(async (obszarId: string) => {
    setElementyLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('segment_components')
        .select('id, name, evidence_strength')
        .eq('parent_component_id', obszarId)
        .order('display_order', { ascending: true });
      if (err) throw err;
      setElementy((data ?? []) as SegmentComponent[]);
    } catch {
      setElementy([]);
    } finally {
      setElementyLoading(false);
    }
  }, []);

  const selectObszar = (id: string) => {
    setSelectedObszarId(id);
    setElementy([]);
    loadElementy(id);
  };

  const confirmElement = (el: SegmentComponent) => {
    setConfirmedText(el.name);
    setConfirmedComponentId(el.id);
    setBrowsing(false);
  };

  const confirmFreeText = () => {
    if (!freeText.trim()) return;
    setConfirmedText(freeText.trim());
    setConfirmedComponentId(null);
    setBrowsing(false);
  };

  const changeElement = () => {
    setBrowsing(true);
    setSelectedObszarId(null);
    setElementy([]);
    setFreeText('');
    setFreeTextMode(false); // loadObszary (przez efekt wyżej) ustawi z powrotem na true, jeśli segment nie ma Obszarów
  };

  // --- Krok "ile razy w tygodniu" + dozowanie ---
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [dosingLoading, setDosingLoading] = useState(false);
  const [dosingError, setDosingError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const fetchDosing = async () => {
    setDosingLoading(true);
    setDosingError(null);
    try {
      const body: Record<string, any> = {
        userId: currentUserId,
        segmentId: goal.segment_id,
        sessionsPerWeek,
      };
      if (confirmedComponentId) body.componentId = confirmedComponentId;
      else body.customDescription = confirmedText;

      const res = await fetch(FOCUS_BLOCK_DOSING_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      // ZAPIS B7 08.08.2026 — sourceHint defensywnie: starszy backend (bez
      // rundy 6) w ogóle nie zwraca tego pola, a wersja > 1 znaczy „pas A
      // rozszerzył kontrakt" — trzon (tresc/material/strona) jest zadeklarowany
      // jako stabilny, więc renderujemy go nadal, tylko głośno ostrzegamy.
      let sourceHint: DosingSourceHint | null = null;
      const sh = data.sourceHint;
      if (sh && typeof sh === 'object' && typeof sh.tresc === 'string' && sh.tresc.trim()) {
        sourceHint = sh as DosingSourceHint;
        if (typeof sh.wersja === 'number' && sh.wersja > 1) {
          console.warn('[dozowanie] sourceHint.wersja > 1 — sprawdź kontrakt fazy 1 (raport A rundy 6, sekcja 13) zamiast zgadywać.');
        }
      }
      setSuggestion({
        days: new Set<string>(data.suggestion.days),
        durationMinutes: data.suggestion.durationMinutes,
        weeks: data.suggestion.weeks,
        reasoning: data.suggestion.reasoning,
        sourceHint,
      });
      setStep('suggestion');
    } catch (e: any) {
      setDosingError('Nie udało się wygenerować sugestii: ' + e.message);
    } finally {
      setDosingLoading(false);
    }
  };

  // --- Krok sugestii — edycja dni/czasu/tygodni + zapis ---
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const toggleSuggestionDay = (code: string) => {
    if (!suggestion) return;
    const next = new Set(suggestion.days);
    if (next.has(code)) next.delete(code); else next.add(code);
    setSuggestion({ ...suggestion, days: next });
  };

  const confirmAndSave = async () => {
    if (!suggestion) return;
    if (suggestion.days.size === 0) { setSaveError('Wybierz przynajmniej jeden dzień.'); return; }
    if (!suggestion.durationMinutes || suggestion.durationMinutes <= 0) { setSaveError('Podaj czas trwania sesji.'); return; }
    if (!suggestion.weeks || suggestion.weeks <= 0) { setSaveError('Podaj liczbę tygodni.'); return; }

    setSaving(true);
    setSaveError(null);
    try {
      const insertBody: Record<string, any> = {
        user_id: currentUserId,
        segment_id: goal.segment_id,
        pillar,
        status: 'active',
        sessions_per_week: suggestion.days.size,
        target_weeks: suggestion.weeks,
      };
      if (confirmedComponentId) insertBody.component_id = confirmedComponentId;
      else insertBody.custom_description = confirmedText;

      const { data: fbRow, error: fbErr } = await supabase
        .from('focus_blocks')
        .insert(insertBody)
        .select('id')
        .single();
      if (fbErr) {
        // PLAN-D-A 08.2026 — dwa RÓŻNE powody odmowy, dwa różne zdania.
        //
        // 1) REGUŁA UWAGI (wyzwalacz, SQLSTATE GC001). To nie jest awaria —
        //    to rozmowa. Komunikat musi dać wyjście: zamknij konkretny Blok
        //    albo weź lżejszy wariant. Surowy tekst z bazy („BUDZET_UWAGI: …")
        //    nie trafia na ekran nigdy.
        if (isBudzetError(fbErr)) {
          // Odświeżamy liczby, bo mogły się zmienić od wejścia w przepływ.
          loadBudzet(); loadOtwarteBloki();
          throw new Error(budzetBlokadaKomunikat((fbErr as any).hint, otwarteBloki));
        }
        // 2) REGUŁA DANYCH (unikalny indeks po SEGMENCIE od 10.08.2026).
        //    Do tej daty indeks szedł po `pillar` i komunikat mówił „w tej
        //    kategorii" — od 10.08.2026 to nieprawda, bo dwa segmenty jednego
        //    filaru są dozwolone.
        if ((fbErr as any).code === '23505' || fbErr.message?.includes('one_active_focus_block_per_segment')) {
          throw new Error(`Masz już otwarty Blok nad tym samym obszarem (${segmentLabel}) — zamknij go, zanim zaczniesz nowy.`);
        }
        throw fbErr;
      }

      const dates = buildScheduledDates(Array.from(suggestion.days), suggestion.weeks);
      const eventsBody = dates.map((d) => ({
        user_id: currentUserId,
        event_type: 'micro_session',
        source: 'system',
        // AUDYT 06.08.2026 — czas trwania sesji przestaje przepadać.
        // `suggestion.durationMinutes` był edytowany przez zawodnika i walidowany
        // ("Podaj czas trwania sesji."), a potem nie trafiał ANI do `focus_blocks`,
        // ANI do `calendar_events` — informacja ginęła w całości.
        // Tabela `focus_blocks` nie ma dziś kolumny na czas trwania, więc bez
        // migracji jedynym miejscem, gdzie ta liczba ma sens dla zawodnika, jest
        // wpis w kalendarzu. SQL na docelową kolumnę czeka na Kubę — patrz
        // REJESTR_NAPRAW_AUDYT_06_08_2026.md.
        // PLAN-D-A 08.2026 — tytuł wchodzi do Kalendarza, więc to brzmienie
        // widzi zawodnik poza tym ekranem.
        title: `Blok: ${confirmedText} (${suggestion.durationMinutes} min)`,
        notes: `Planowany czas sesji: ${suggestion.durationMinutes} min.\n${suggestion.reasoning}`,
        status: 'scheduled',
        scheduled_date: d,
        goal_id: goal.id,
        focus_block_id: fbRow.id,
      }));
      const { error: evErr } = await supabase.from('calendar_events').insert(eventsBody);
      if (evErr) {
        // Sprzątanie po nieudanym zapisie — ten sam wzorzec co rollback
        // priorytetu w createGoal() w cele.tsx: nie zostawiaj "aktywnego"
        // Bloku bez ani jednej sesji, blokującego cały filar na darmo.
        try { await supabase.from('focus_blocks').delete().eq('id', fbRow.id); } catch { /* najlepszy wysiłek */ }
        throw new Error('Nie udało się zapisać sesji w kalendarzu, spróbuj ponownie: ' + evErr.message);
      }

      onCreated();
    } catch (e: any) {
      setSaveError(e.message || 'Nie udało się zapisać Bloku.');
    } finally {
      setSaving(false);
    }
  };

  // --- Render ---

  // PLAN-D-A 08.2026 — budżet widoczny na KAŻDYM kroku planowania, w tym na
  // pierwszym. To jest cała wartość tej zmiany: liczba, zanim zawodnik wybierze.
  const renderBudzet = () => {
    if (budzet.kind === 'loading') return null; // nic nie migocze nad wyborem
    if (budzet.kind === 'unknown') {
      return (
        <View style={styles.budzetBox}>
          <Text style={styles.budzetLabel}>Twój tydzień</Text>
          <Text style={styles.budzetUnknown}>
            Nie udało się teraz sprawdzić, ile masz wolnego czasu w tygodniu.
            Możesz planować dalej — jeśli się nie zmieści, powiemy to przed zapisem.
          </Text>
        </View>
      );
    }
    const s = budzet.stan;
    return (
      <View style={styles.budzetBox}>
        <Text style={styles.budzetLabel}>Twój tydzień</Text>
        <Text style={styles.budzetText}>
          {/* PLAN-D-A 08.2026 — po „z" idzie dopełniacz i jest on ZAWSZE „sesji",
              niezależnie od liczby („0 z 4 sesji", „1 z 4 sesji"). `jednostkiSlowo`
              odmienia mianownik po liczbie („1 sesję", „3 sesje") i w tym zdaniu
              dawało „0 z 4 sesje". */}
          {s.uzyte_jednostki} z {s.limit_jednostek} sesji w tygodniu już zajętych
          {' · '}otwarte Bloki: {s.uzyte_bloki} z {s.limit_blokow}
        </Text>
        {!s.mozna_zaczac ? (
          <Text style={styles.budzetWarn}>
            {otwarteBloki.length > 0
              ? `Nie masz teraz miejsca na nowy Blok. Zamknij jeden z otwartych: ${otwarteBloki.map((b) => `${b.label} (${b.jednostki})`).join(', ')}.`
              : 'Nie masz teraz miejsca na nowy Blok — zamknij jeden z otwartych na liście wąskich gardeł.'}
          </Text>
        ) : null}
      </View>
    );
  };

  // Ile ten Blok będzie kosztował. Na kroku „ile razy w tygodniu" to deklaracja
  // zawodnika, na kroku sugestii — liczba zaznaczonych dni (to ona idzie do
  // `sessions_per_week`, patrz `confirmAndSave`).
  const kosztPlanowany = step === 'suggestion' && suggestion ? suggestion.days.size : sessionsPerWeek;
  const renderKoszt = () => {
    if (budzet.kind !== 'ready' || kosztPlanowany <= 0) return null;
    const wolne = budzet.stan.wolne_jednostki;
    if (kosztPlanowany <= wolne) {
      return (
        <Text style={styles.budzetOk}>
          Ten Blok kosztuje {kosztPlanowany} {jednostkiSlowo(kosztPlanowany)} w tygodniu. Zmieści się — masz wolne: {wolne}.
        </Text>
      );
    }
    return (
      <Text style={styles.budzetWarn}>
        Ten Blok kosztuje {kosztPlanowany} {jednostkiSlowo(kosztPlanowany)} w tygodniu, a masz wolne: {wolne}.
        {otwarteBloki.length > 0
          ? ` Zamknij jeden z otwartych Bloków (${otwarteBloki.map((b) => `${b.label} (${b.jednostki})`).join(', ')})`
          : ' Zamknij jeden z otwartych Bloków'}
        {wolne > 0 ? ` albo zaznacz ${wolne} ${wolne === 1 ? 'dzień' : 'dni'}.` : '.'}
      </Text>
    );
  };

  const renderRefineStep = () => {
    if (!browsing) {
      return (
        <View>
          <View style={styles.selectedRow}>
            <Text style={styles.rowTextSelected}>{confirmedText}</Text>
            <TouchableOpacity onPress={changeElement}>
              <Text style={styles.linkText}>Zmień</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.btn, !confirmedText.trim() && styles.btnDisabled]}
            disabled={!confirmedText.trim()}
            onPress={() => setStep('frequency')}
          >
            <Text style={styles.btnText}>Dalej</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelLink} onPress={onClose}>
            <Text style={styles.linkTextMuted}>Anuluj</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (selectedObszarId && !freeTextMode) {
      return (
        <View>
          <TouchableOpacity onPress={() => setSelectedObszarId(null)} style={{ marginBottom: 8 }}>
            <Text style={styles.linkText}>◂ Zmień obszar</Text>
          </TouchableOpacity>
          {elementyLoading && <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginVertical: 8 }} />}
          {!elementyLoading && elementy.map((el) => (
            <TouchableOpacity key={el.id} style={styles.listRow} onPress={() => confirmElement(el)}>
              <Text style={styles.rowText}>{el.name}</Text>
              {el.evidence_strength && EVIDENCE_LABELS[el.evidence_strength] && (
                <Text style={styles.rowEvidence}>{EVIDENCE_LABELS[el.evidence_strength]}</Text>
              )}
            </TouchableOpacity>
          ))}
          {!elementyLoading && elementy.length === 0 && (
            <Text style={styles.empty}>Brak elementów dla tego obszaru.</Text>
          )}
          <TouchableOpacity onPress={() => setFreeTextMode(true)} style={{ marginTop: 4 }}>
            <Text style={styles.linkText}>Opisz sam zamiast wybierać z listy</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (freeTextMode) {
      return (
        <View>
          {obszary.length === 0 && !obszaryLoading && (
            <Text style={styles.hintText}>
              Ten segment nie ma jeszcze gotowej listy obszarów — opisz swój cel własnymi słowami.
            </Text>
          )}
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholderTextColor={colors.textSecondary}
            value={freeText}
            onChangeText={setFreeText}
            multiline
            placeholder="np. poprawić przyjęcie piłki lewą nogą pod presją"
          />
          <View style={styles.rowBetween}>
            {obszary.length > 0 && (
              <TouchableOpacity onPress={() => setFreeTextMode(false)}>
                <Text style={styles.linkText}>◂ Wybierz z listy zamiast</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity disabled={!freeText.trim()} onPress={confirmFreeText}>
              <Text style={[styles.linkText, !freeText.trim() && { opacity: 0.4 }]}>Potwierdź</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View>
        {obszaryLoading && <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginVertical: 8 }} />}
        {!obszaryLoading && obszary.map((ob) => (
          <TouchableOpacity key={ob.id} style={styles.listRow} onPress={() => selectObszar(ob.id)}>
            <Text style={styles.rowText}>{ob.name}</Text>
          </TouchableOpacity>
        ))}
        {!obszaryLoading && (
          <TouchableOpacity onPress={() => setFreeTextMode(true)} style={{ marginTop: 4 }}>
            <Text style={styles.linkText}>Opisz sam zamiast wybierać z listy</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.cancelLink} onPress={onClose}>
          <Text style={styles.linkTextMuted}>Anuluj</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFrequencyStep = () => (
    <View>
      <Text style={styles.recapText}>{confirmedText}</Text>
      <Text style={styles.label}>Ile razy w tygodniu realistycznie możesz na to poświęcić czas?</Text>
      <View style={styles.numRow}>
        {SESSIONS_OPTIONS.map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.numBtn, sessionsPerWeek === n && styles.numBtnActive]}
            onPress={() => setSessionsPerWeek(n)}
          >
            <Text style={[styles.numBtnText, sessionsPerWeek === n && styles.numBtnTextActive]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* PLAN-D-A 08.2026 — koszt wyboru widoczny OD RAZU po dotknięciu liczby,
          a nie dopiero przy zapisie. */}
      {renderKoszt()}
      {dosingError && <Text style={styles.error}>{dosingError}</Text>}
      <TouchableOpacity style={[styles.btn, dosingLoading && styles.btnDisabled]} disabled={dosingLoading} onPress={fetchDosing}>
        <Text style={styles.btnText}>{dosingLoading ? 'Dobieram dawkowanie...' : 'Zaproponuj plan'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelLink} onPress={() => setStep('refine')}>
        <Text style={styles.linkTextMuted}>◂ Wstecz</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSuggestionStep = () => {
    if (!suggestion) return null;
    return (
      <View>
        <Text style={styles.recapText}>{confirmedText}</Text>
        <Text style={styles.reasoningText}>{suggestion.reasoning}</Text>

        {/* ZAPIS B7 08.08.2026 (decyzja po A 8.2, runda 6) — pierwszy moment
            w produkcie, w którym liczby, które zawodnik dostaje, mają widoczne
            źródło. Cytat DOSŁOWNY (nie streszczony — streszczenie nie jest
            dowodem), przypis tą samą regułą co wszędzie: bez strony sam tytuł,
            bez materiału brak przypisu. `sourceHint === null` ⇒ sekcji NIE MA
            (żadnego „brak źródła"). */}
        {suggestion.sourceHint?.tresc ? (
          <View style={styles.sourceHintBox}>
            <Text style={styles.sourceHintTitle}>Skąd to wiemy</Text>
            <Text style={styles.sourceHintText}>{suggestion.sourceHint.tresc}</Text>
            {formatHintSource(suggestion.sourceHint.material ?? null, suggestion.sourceHint.strona ?? null) ? (
              <Text style={styles.sourceHintSource}>
                {formatHintSource(suggestion.sourceHint.material ?? null, suggestion.sourceHint.strona ?? null)}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.label}>Dni tygodnia</Text>
        <View style={styles.daysRow}>
          {DAYS_OF_WEEK.map(([code, label]) => (
            <TouchableOpacity key={code} style={styles.dayCheck} onPress={() => toggleSuggestionDay(code)}>
              <Checkbox value={suggestion.days.has(code)} onValueChange={() => toggleSuggestionDay(code)} />
              <Text style={styles.dayCheckLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* AUDYT 06.08.2026 — deklaracja zawodnika z kroku 2 ("ile razy w tygodniu
            realistycznie możesz") była po cichu nadpisywana liczbą zaznaczonych dni:
            zapisywane jest `sessions_per_week: suggestion.days.size`. Zawodnik mówił
            "3 razy", odznaczał jeden dzień i w bazie lądowało 2, bez słowa. Teraz
            rozjazd jest widoczny, zanim kliknie "Zatwierdź i zaplanuj". */}
        {suggestion.days.size !== sessionsPerWeek && suggestion.days.size > 0 ? (
          <Text style={styles.reasoningText}>
            Mówiłeś o {sessionsPerWeek} sesjach w tygodniu, a masz zaznaczone {suggestion.days.size}.
            Zapiszemy {suggestion.days.size} — jeśli to pomyłka, popraw dni powyżej.
          </Text>
        ) : null}

        <Text style={styles.label}>Czas trwania sesji (minuty)</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={String(suggestion.durationMinutes)}
          onChangeText={(v) => setSuggestion({ ...suggestion, durationMinutes: Number(v) || 0 })}
        />

        <Text style={styles.label}>Liczba tygodni</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={String(suggestion.weeks)}
          onChangeText={(v) => setSuggestion({ ...suggestion, weeks: Number(v) || 0 })}
        />

        {/* PLAN-D-A 08.2026 — ostatnie miejsce, w którym koszt jest widoczny
            PRZED zapisem. Świadomie NIE blokujemy przycisku: budżet może się
            zmienić (zawodnik zamyka Blok na drugim ekranie), a bramką jest
            baza — appka ma ostrzegać, nie zgadywać za nią.

            ⚠️ POPRAWKA 11.08.2026, po obejrzeniu ekranu na telefonie.
            Po odmowie zapisu zawodnik dostawał DWA niemal identyczne zdania
            jeden pod drugim: ostrzeżenie appki (pomarańczowe, wyliczone
            z `focus_budget_state`) i komunikat z bazy (czerwony, wyliczony
            z `hint` wyzwalacza). Oba mówiły to samo, tylko innymi słowami —
            i to jest gorsze niż jedno zdanie, bo brzmi jak dwa różne problemy.
            Gdy jest odpowiedź BAZY, ona wygrywa: pochodzi z prawdziwej próby
            zapisu, a nie z liczb sprzed kilku minut. */}
        {!saveError && renderKoszt()}
        {saveError && <Text style={styles.error}>{saveError}</Text>}
        <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} disabled={saving} onPress={confirmAndSave}>
          <Text style={styles.btnText}>{saving ? 'Zapisuję...' : 'Zatwierdź i zaplanuj'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelLink} onPress={() => setStep('frequency')} disabled={saving}>
          <Text style={styles.linkTextMuted}>◂ Wstecz</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Nowy Blok — {segmentLabel}</Text>
      {/* Budżet stoi NAD wyborem na każdym kroku — patrz nagłówek sekcji
          „BUDŻET UWAGI" na górze pliku. */}
      {renderBudzet()}
      {step === 'refine' && renderRefineStep()}
      {step === 'frequency' && renderFrequencyStep()}
      {step === 'suggestion' && renderSuggestionStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderColor: colors.brand, borderRadius: radii.md, backgroundColor: colors.brandSofter, padding: 14, marginTop: 10 }, // W1: token
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 10 }, // W1: ink3
  label: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6, marginTop: 8 }, // W1: ink3
  recapText: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary, marginBottom: 8 },
  reasoningText: { ...typography.body, fontSize: 13, color: colors.textSecondary, marginBottom: 12, lineHeight: 18 },
  // ZAPIS B7 08.08.2026 — „Skąd to wiemy": pionowa kreska jak w panelu trenera
  // (cudzy, nieruszony tekst z materiału, nie kolejne zdanie systemu).
  sourceHintBox: { borderLeftWidth: 3, borderLeftColor: colors.border, paddingLeft: 10, marginBottom: 12 },
  sourceHintTitle: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 4 }, // W1: ink3
  sourceHintText: { ...typography.body, fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
  sourceHintSource: { ...typography.body, fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 10, fontSize: 14, marginBottom: 8, color: colors.textPrimary },
  textarea: { minHeight: 60, textAlignVertical: 'top' },
  listRow: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 },
  rowText: { ...typography.body, fontSize: 14, color: colors.textPrimary },
  rowEvidence: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  selectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.brand, borderRadius: radii.md, backgroundColor: colors.brandSoft, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 }, // W1: token
  rowTextSelected: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary, flexShrink: 1, marginRight: 8 },
  linkText: { color: colors.brand, fontSize: 13, ...typography.bodyMedium },
  linkTextMuted: { color: colors.textSecondary, fontSize: 13, ...typography.bodyMedium },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  hintText: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  empty: { textAlign: 'center', padding: 16, color: colors.textSecondary, fontSize: 13 },
  error: { color: colors.error, fontSize: 13, marginBottom: 8, marginTop: 4 },
  btn: { minHeight: minTouchHeight, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.4 },
  btnText: { ...typography.bodySemiBold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
  cancelLink: { marginTop: 12, alignItems: 'center' },
  // PLAN-D-A 08.2026 — budżet uwagi. Ta sama rodzina co „Skąd to wiemy"
  // (pionowa kreska), bo to też jest kontekst, a nie kolejny przycisk.
  budzetBox: { borderLeftWidth: 3, borderLeftColor: colors.border, paddingLeft: 10, marginBottom: 12 },
  budzetLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 4 },
  budzetText: { ...typography.body, fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
  budzetUnknown: { ...typography.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  budzetOk: { ...typography.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginTop: 4, marginBottom: 4 },
  budzetWarn: { ...typography.body, fontSize: 13, color: colors.warning, lineHeight: 18, marginTop: 4, marginBottom: 4 },
  numRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  numBtn: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  numBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  numBtnText: { ...typography.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  numBtnTextActive: { color: colors.white },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 8 },
  dayCheck: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayCheckLabel: { fontSize: 13, color: colors.textPrimary },
});
