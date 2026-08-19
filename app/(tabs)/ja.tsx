// ═══════════════════════════════════════════════════════════════════
// EKRAN 2 — „PROFIL". PLAN-D-A3 08.2026 (18.08.2026)
// ═══════════════════════════════════════════════════════════════════
//
// CZYM TEN EKRAN BYŁ DO 18.08.2026: zakładka „Ja" — szesnaście pozycji,
// 1 325 dp, dziesięć rzeczy pod zgięciem. Zawodnik widział sześć rzeczy
// z szesnastu, zanim cokolwiek przewinął.
//
// CZYM JEST OD DZIŚ: drugi z DWÓCH ekranów produktu. Trzy rzeczy na wierzchu
// i pięć pozycji za dotknięciem:
//
//   1. ⭐ DWIE MIARY OBOK SIEBIE, TEJ SAMEJ WIELKOŚCI.
//      ROZWÓJ  — ⛔ bez okna, NIGDY nie maleje.
//      OBCIĄŻENIE · 7 dni — ma okno kroczące i MOŻE SPAŚĆ, i to jest
//      w porządku. ⛔ Przy tej liczbie nie ma oceny, progu ani koloru
//      ostrzegawczego (D4).
//   2. ⭐ ZDANIE O PRACY DODATKOWEJ — policzalne w DNIU ZAŁOŻENIA KONTA,
//      z samej diagnozy, bez ani jednego wpisu. Klikalne.
//   3. ⭐ PIĘĆ POZYCJI za dotknięciem.
//
// ⛔ ANI JEDNA LICZBA NIE POWSTAJE W TYM PLIKU. Cała arytmetyka i wszystkie
// brzmienia stoją w `lib/ekranProfilu.ts`, objęte strażnikiem
// `lib/ekranProfilu.selftest.ts`. Ekran czyta wiersze i rysuje wynik.
//
// ⚠️ CO ZDJĄŁ TEN PAS Z TEGO PLIKU — imiennie, bo nic nie znika po cichu (B3).
// Wpisy w `claude/PRZEKAZANIE_PAS_A3_18_08_2026.md`, tabela „co zdjęte":
//   • hero „Twój profil z diagnozy" (528 dp, pięć stanów) → jego treść żyje
//     w zdaniu o pracy dodatkowej i w arkuszu „Skąd bierze się trafność";
//     wejście do pełnego wyniku diagnozy stoi w pozycji „Skąd to wiemy",
//   • sekcje „Twój rozwój" / „Ustawienia" / „Twoja sytuacja" / „Pomoc" →
//     ich wiersze weszły w pięć pozycji Profilu,
//   • wiersz „Moje zadania" → stoi w arkuszu „Skąd to wiemy" jako
//     TYMCZASOWE wejście zastępcze, dopóki zadanie nie wróci na ekran 1
//     (to jest plik pasa A1 i ten pas go nie dotyka).
//
// ⛔ TRZY RZECZY, KTÓRYCH TU NIE MA I NIE MA PRAWA BYĆ:
//   • słowa „AU" i „jednostki umowne" (C1),
//   • słowa „jednostka pracy" — nie ma desygnatu (O92),
//   • porównania z innymi i serii dni z rzędu (N3) — poza jednym zdaniem,
//     które mówi, że tego tu nie ma.
import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, typography, spacing, radii, minTouchHeight } from '../../constants/theme';
import { opisBleduOdczytuDoLogu, rozpoznajPustke } from '../../lib/trzyPustki';
// ⭐ PLAN-D-S2 18.08.2026 — WEJŚCIA DO BLOKU „PRACA W LICZBACH".
// ⛔ Ten ekran CZYTA WIERSZE i podaje je dalej; ani jednej z tych liczb nie
// liczy sam. Rozstrzyganie stoi w `lib/wykonanieSesji.ts` (trzy stany
// werdyktów) i w `components/PracaWLiczbach.tsx` (jedyna kopia rysowania).
import { toLocalDateStr } from '../../lib/date-utils';
import { poniedzialekTygodnia } from '../../lib/glosTygodnia';
import { czytajWerdykty } from '../../lib/wykonanieSesji';
import type { BlockEventLike, FocusBlockLike } from '../../lib/focusBlockProgress';
import type { WierszWydarzenia } from '../../lib/widokTygodnia';
import type { WejsciaPracy } from '../../components/PracaWLiczbach';
import { getRelativeDeficits, parseScores } from '../../components/diagnosisProfile';
// ⭐ NAZWY OBSZARÓW — jedna funkcja na cały produkt (pas G1). ⛔ `segmentLabel()`
// oddawało surowe `id` z bazy, które WYGLĄDA jak nazwa; `opiszSegment()` ma dwie
// gałęzie i tę drugą też rysujemy.
import { opiszSegment, opisNieznanegoSegmentuDoLogu } from '../../lib/labels';
import { LIBRARY_SECTION_LABEL, libraryEntryHint, unlockedMaterials } from '../../lib/materials';
import { odczytZadan, SELECT_ZADANIA, TABELA_ZADAN, type OdczytZadan } from '../../lib/zadania';
import { WEJSCIE_LISTA_LABEL, zdanieOdczytu } from '../../lib/listaZadan';
import { MAPA_ENTRY_HINT_DOSTEPNA, MAPA_ENTRY_LABEL } from '../../lib/mapaDrogi';
import { WYJSCIE_WEJSCIE_LABEL, WYJSCIE_WEJSCIE_PODPIS } from '../../lib/sciezkaWyjscia';
import MojaDroga from '../../components/MojaDroga';
import ListaZadan from '../../components/ListaZadan';
import SciezkaWyjscia from '../../components/SciezkaWyjscia';
import type { NagrodaZaPrace } from '../../lib/nagrodaZaPrace';
import {
  JEDNOSTKA_ROZWOJU_JEDEN,
  KOLEJNOSC_POZYCJI,
  JEDNOSTKA_ROZWOJU_WIELE,
  NAZWA_OBCIAZENIA,
  NAZWA_ROZWOJU,
  OBCIAZENIE_NIE_POLICZONE_ZDANIE,
  OBCIAZENIE_ZAMIAST_LICZBY,
  policzObciazenieZOdczytow,
  PRACA_DODATKOWA_BRAK,
  PRACA_DODATKOWA_WEJSCIE,
  PRZYPIS_CZEGO_TU_NIE_MA,
  TYTULY_POZYCJI,
  ROZWOJ_JESZCZE_NIC,
  ROZWOJ_NIE_POLICZONE,
  ROZWOJ_PODPIS,
  TYTUL_EKRANU,
  arkuszTrafnosci,
  odczytTabeli,
  podpisNaglowka,
  policzRozwojZOdczytow,
  trafnoscZawodnika,
  zbudujModelProfilu,
  zdanieOPracyDodatkowej,
  type ArkuszTrafnosci,
  type KluczPozycji,
  type ModelProfilu,
  type OdczytyDoRozwoju,
} from '../../lib/ekranProfilu';
import ArkuszeProfilu from '../../components/ArkuszeProfilu';

/** Jedno miejsce, w którym nieudany odczyt trafia do konsoli. */
const zaloguj = (zdanie: string) => console.warn(opisBleduOdczytuDoLogu('profil.load', zdanie));

/** ⛔ `null` = nie odczytałem. Nigdy zero — zero jest pomiarem (R5). */
function liczbaZOdczytu(blad: unknown, ile: number | null): number | null {
  if (blad) return null;
  return typeof ile === 'number' ? ile : null;
}

type Stan = {
  model: ModelProfilu;
  nagroda: NagrodaZaPrace;
  trafnosc: ArkuszTrafnosci;
  podpis: string;
  rekomendacje: number | null;
  /** Nazwy trzech wąskich gardeł z diagnozy — OBIE gałęzie `opiszSegment`. */
  deficitLabels: string[];
  /** Nazwy obszarów do arkusza trafności. ⛔ Arkusz ich nie wymyśla. */
  etykietyObszarow: Record<string, string>;
  /** Czy w ogóle mamy czytelną diagnozę — rozstrzyga pustkę zdania o pracy. */
  odczytDiagnozyUdanySie: boolean;
  maDiagnoze: boolean;
  /**
   * ⭐ PLAN-D-S2 — WEJŚCIA BLOKU „PRACA W LICZBACH" (pozycja „Skąd to wiemy").
   * ⛔ SUROWE WIERSZE, nie liczby: rozstrzyganie należy do modułów, a rysowanie
   * do `components/PracaWLiczbach.tsx`. Ten ekran jest tu wyłącznie kurierem.
   */
  praca: WejsciaPracy;
};

export default function JaScreen() {
  const router = useRouter();
  const { currentUser, signOut } = useAuth();
  const [stan, setStan] = useState<Stan | null>(null);
  // Modale montuje TEN ekran, nie arkusz: „Ja" jest od 08.2026 jedynym miejscem
  // w produkcie, z którego da się je otworzyć, i zapadki repozytorium liczą
  // te montaże po nazwie pliku.
  const [drogaOtwarta, setDrogaOtwarta] = useState(false);
  const [zadaniaOtwarte, setZadaniaOtwarte] = useState(false);
  const [wyjscieOtwarte, setWyjscieOtwarte] = useState(false);
  // ⛔ Licznik otwartych materiałów liczy MODUŁ (`unlockedMaterials`), nie ekran.
  const [libraryCount, setLibraryCount] = useState(0);
  // ⚠️ CZTERY STANY, NIE DWA. `null` znaczy „jeszcze nie czytałem", a nie
  // „nie masz zadań" — podpis wejścia startuje wtedy pusty zamiast kłamać.
  const [odczytZadanStan, setOdczytZadanStan] = useState<OdczytZadan | null>(null);
  const [otwarty, setOtwarty] = useState<KluczPozycji | 'trafnosc' | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!currentUser) return;
    const [
      diagRes, profilRes, uzytkownikRes, wzrostRes, wydarzeniaRes, dziennikRes,
      checkinyRes, meczeRes, celeRes, werdyktyRes, raportRes, rekomendacjeRes, zadaniaRes,
      blokiRes,
    ] = await Promise.all([
      // ⭐ POZYCJA I RODZAJE PRACY IDĄ Z DIAGNOZY, nie z profilu — to jest
      // jedna linijka, od której zależy, czy zdanie o pracy dodatkowej
      // w ogóle padnie. Powód i pomiar: `lib/ekranProfilu.ts`, sekcja 1.
      supabase.from('diagnostics').select('scores,position,own_training_types')
        .eq('user_id', currentUser.id).eq('event', 'email_submitted')
        .order('created_at', { ascending: false }).limit(1),
      supabase.from('player_profiles').select('position_primary,goal_direction')
        .eq('user_id', currentUser.id).limit(1),
      supabase.from('users').select('full_name,birth_year').eq('id', currentUser.id).limit(1),
      supabase.from('height_logs').select('id', { count: 'exact', head: true }).eq('user_id', currentUser.id),
      supabase.from('calendar_events')
        // ⭐ PLAN-D-S2 — `title` i `scheduled_time` DOŁOŻONE, nie podmienione:
        // `zbudujTydzien` rozwija reguły cykliczne i bez tytułu nie ma jak
        // nazwać pozycji, której nie umie umieścić. ⛔ Ani jednego filtra
        // więcej: licznik pracy potrzebuje TAKŻE sesji odwołanych.
        .select('id,title,scheduled_date,scheduled_time,status,recurrence_rule,focus_block_id,event_type,source,coach_session_id,planned_minutes')
        .eq('user_id', currentUser.id),
      supabase.from('daily_logs').select('id,entry_type,payload,created_at,calendar_event_id')
        .eq('user_id', currentUser.id),
      supabase.from('focus_block_checkins').select('id,focus_block_id,answered_at'),
      supabase.from('match_contexts').select('id,created_at,minutes_played,match_rpe')
        .eq('user_id', currentUser.id),
      // ⛔ BEZ FILTRA `status` — cel domknięty to sukces, nie utrata odznaki.
      // ⭐ PLAN-D-S2 — `is_priority` DOŁOŻONE, filtra statusu NADAL NIE MA
      // (⛔ cel domknięty to sukces, nie utrata odznaki — (A4b)). Kolejność
      // służy WYŁĄCZNIE wyborowi wąskiego gardła dla postępu Bloku; zbiór
      // podawany do rozwoju zostaje kompletny co do wiersza.
      supabase.from('goals').select('segment_id,is_priority,created_at')
        .eq('user_id', currentUser.id)
        .order('is_priority', { ascending: false })
        .order('created_at', { ascending: false }),
      // ⭐ PLAN-D-S2 — WIERSZE, NIE SAM LICZNIK. Do 18.08 ten ekran pytał
      // `head: true` i dostawał wyłącznie `count`, więc licznik pracy nie miał
      // z czego rozstrzygnąć, KTÓRE wystąpienie się odbyło. `count: 'exact'`
      // zostaje, bo podpis pozycji „Skąd to wiemy" nadal go używa — jedno
      // zapytanie odpowiada teraz na dwa pytania, zero nowych rund sieci.
      supabase.from('session_verdicts')
        .select('calendar_event_id,occurred_on,verdict,withdrawn_at', { count: 'exact' })
        .eq('user_id', currentUser.id),
      supabase.from('parent_report_subscriptions').select('id,active')
        .eq('player_user_id', currentUser.id).limit(1),
      supabase.from('decision_recommendations').select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id).is('viewed_at', null),
      // ⛔ CAŁA odpowiedź idzie do `odczytZadan`, nie `data` z podstawioną pustą
      // listą: „nie udało się odczytać" i „nic nie masz" to dwie różne rzeczy
      // i tylko jedna z nich jest o zawodniku.
      supabase.from(TABELA_ZADAN).select(SELECT_ZADANIA).eq('user_id', currentUser.id),
      // ⭐ PLAN-D-S2 — BLOKI SKUPIENIA. ⛔ BEZ FILTRA `status` W ZAPYTANIU:
      // te same wiersze odpowiadają na dwa pytania („który Blok jest aktywny"
      // i „ile Bloków w ogóle masz"), a filtr w zapytaniu zabrałby drugie.
      // Zawężenie do `active` robi jedna, nazwana linia niżej.
      supabase.from('focus_blocks').select('id,segment_id,status').eq('user_id', currentUser.id),
    ]);

    if (diagRes.error) console.warn(opisBleduOdczytuDoLogu('profil.load → diagnostics', diagRes.error));
    if (profilRes.error) console.warn(opisBleduOdczytuDoLogu('profil.load → player_profiles', profilRes.error));

    const wierszDiagnozy = diagRes.error ? null : (diagRes.data?.[0] as {
      scores: unknown; position: string | null; own_training_types: string | null;
    } | undefined) ?? null;
    const wierszProfilu = profilRes.error ? null : (profilRes.data?.[0] as {
      position_primary: string | null; goal_direction: string | null;
    } | undefined) ?? null;
    const wierszUzytkownika = uzytkownikRes.error ? null : (uzytkownikRes.data?.[0] as {
      full_name: string | null; birth_year: number | null;
    } | undefined) ?? null;

    const rodzajePracy = wierszDiagnozy ? wierszDiagnozy.own_training_types : null;
    const t = trafnoscZawodnika({
      wyniki: wierszDiagnozy ? parseScores(wierszDiagnozy.scores) : null,
      pozycjaZDiagnozy: wierszDiagnozy ? wierszDiagnozy.position : null,
      pozycjaZProfilu: wierszProfilu ? wierszProfilu.position_primary : null,
      rodzajePracy,
    });

    // ─── Wąskie gardła z diagnozy i nazwy obszarów ────────────────
    // ⛔ Deficyty liczy `getRelativeDeficits` — ta sama funkcja, co na ekranie
    // wyniku diagnozy. Własne sortowanie dałoby zawodnikowi DWIE różne prawdy
    // o sobie na dwóch ekranach.
    const wyniki = wierszDiagnozy ? parseScores(wierszDiagnozy.scores) : null;
    const deficits = wyniki === null ? [] : getRelativeDeficits(wyniki, 3);
    const opisyDeficytow = deficits.map(([id]) => opiszSegment(id));
    for (const opis of opisyDeficytow) {
      const doLogu = opisNieznanegoSegmentuDoLogu(opis);
      if (doLogu) console.warn(doLogu);
    }
    const deficitLabels = opisyDeficytow.map((o) => (o.znany ? o.etykieta : o.komunikat));
    const deficitSegmentIds = deficits.map(([id]) => id);
    const goalSegmentIds = celeRes.error || !Array.isArray(celeRes.data)
      ? []
      : (celeRes.data as { segment_id: string | null }[])
        .map((g) => g.segment_id)
        .filter((x): x is string => typeof x === 'string' && x.length > 0);

    // ⛔ Nazwy obszarów do arkusza trafności powstają TUTAJ, jedną funkcją.
    // Arkusz ich nie wymyśla — inaczej „nie znam tego obszaru" istniałoby
    // w dwóch brzmieniach.
    const etykietyObszarow: Record<string, string> = {};
    if (wyniki !== null) {
      for (const klucz of Object.keys(wyniki)) {
        const o = opiszSegment(klucz);
        etykietyObszarow[klucz] = o.znany ? o.etykieta : o.komunikat;
      }
    }

    // ⭐⭐ PLAN-D-D1 18.08.2026 — JEDEN ZBIÓR WIERSZY, DWIE MIARY.
    // ⛔ Gdyby rozwój i obciążenie powstawały z dwóch osobnych odczytów,
    // zawodnik zobaczyłby obok siebie dwie liczby, których nie da się ze sobą
    // pogodzić, a rozjazd wyglądałby jak zmiana obciążenia.
    // ⛔ TYP PODANY WPROST, a nie wywnioskowany. `odczytTabeli` jest ogólne,
    // więc bez tej adnotacji wiersze schodzą do `unknown` — złapał to
    // `npx tsc --noEmit` 18.08.2026, a suita tego nie widzi (Z-4).
    const odczyty: OdczytyDoRozwoju = {
      // ⛔ Rozpoznanie „odczyt padł" robi MODUŁ, nie ekran — patrz `odczytTabeli`.
      wydarzenia: odczytTabeli(wydarzeniaRes.error, wydarzeniaRes.data, 'wydarzeń kalendarza', zaloguj),
      dziennik: odczytTabeli(dziennikRes.error, dziennikRes.data, 'wpisów Dziennika', zaloguj),
      odpowiedziKontrolne: odczytTabeli(checkinyRes.error, checkinyRes.data, 'odpowiedzi kontrolnych Bloku', zaloguj),
      mecze: odczytTabeli(meczeRes.error, meczeRes.data, 'meczów', zaloguj),
      cele: odczytTabeli(celeRes.error, celeRes.data, 'listy celów', zaloguj),
      zwrot: t.zwrot,
    };
    const nagroda = policzRozwojZOdczytow(odczyty);
    // ⛔ TE SAME `odczyty`, BEZ `zwrot` w środku wzoru: obciążenie liczy się
    // z minut i ciężkości, a trafność nie ma jak do niego wejść — funkcja
    // nie ma parametru, którym dałoby się ją podać (`lib/obciazenie.ts`).
    const obciazenie = policzObciazenieZOdczytow(odczyty, { dzis: toLocalDateStr(new Date()) });

    const raportIstnieje = raportRes.error
      ? null
      : Array.isArray(raportRes.data) && raportRes.data.length > 0;

    // ⛔ Liczbę otwartych materiałów liczy MODUŁ — żeby liczba w podpisie
    // wejścia i lista po wejściu nie mówiły po cichu o dwóch różnych zbiorach.
    setLibraryCount(unlockedMaterials({ goalSegmentIds, deficitSegmentIds }).length);
    setOdczytZadanStan(odczytZadan({ data: zadaniaRes.data, error: zadaniaRes.error }));

    // ═══════════════════════════════════════════════════════════════
    // ⭐ PLAN-D-S2 18.08.2026 — WEJŚCIA TRZECH LICZB O PRACY — POCZĄTEK
    //
    // ⛔ KAŻDE `null` NIŻEJ ZNACZY „NIE ODCZYTAŁEM", nigdy „nie ma". To jest
    // cała różnica między R5 a licznikiem, który maleje przy awarii sieci.
    // ⛔ ZERO `?? []` I `?? 0` — pusta lista podstawiona za nieudany odczyt
    // zamienia awarię w twierdzenie o zawodniku.
    // ═══════════════════════════════════════════════════════════════
    type WierszKalendarza = WierszWydarzenia & { focus_block_id: string | null };
    const wierszeWydarzen: WierszKalendarza[] | null =
      wydarzeniaRes.error || !Array.isArray(wydarzeniaRes.data)
        ? null
        : (wydarzeniaRes.data as WierszKalendarza[]);

    const powiazaniaWpisow: ReadonlySet<number> | null = (() => {
      if (dziennikRes.error) return null;
      if (!Array.isArray(dziennikRes.data)) return null;
      const ids = (dziennikRes.data as { calendar_event_id: number | null }[])
        .map((l) => l.calendar_event_id)
        .filter((x): x is number => typeof x === 'number');
      return new Set(ids);
    })();

    // ⛔ ZBIÓR PEŁNY: bez odsiewania po statusie Bloku I bez odsiewania po
    // statusie sesji. Zmierzone 15.08.2026 na produkcji: Blok `completed` ma
    // wszystkie 12 sesji w statusie `cancelled`, więc każdy z tych dwóch
    // filtrów Z OSOBNA wystarczy, żeby czterotygodniowa praca zniknęła.
    const sesjeWszystkichBlokow: BlockEventLike[] | null = wierszeWydarzen === null
      ? null
      : wierszeWydarzen.map((e) => ({ id: e.id, focus_block_id: e.focus_block_id }));

    // ⛔ MIANOWNIK POSTĘPU BIERZE WYŁĄCZNIE `scheduled`: sesja odwołana nie
    // jest pracą do zrobienia i nie ma prawa go podbijać (kontrakt
    // `lib/focusBlockProgress.ts`).
    const zaplanowaneSesje: BlockEventLike[] | null = wierszeWydarzen === null
      ? null
      : wierszeWydarzen
        .filter((e) => e.status === 'scheduled')
        .map((e) => ({ id: e.id, focus_block_id: e.focus_block_id }));

    // ⭐ ZAWĘŻENIE DO `active` MA NAZWĘ I STOI W JEDNEJ LINII — nie w zapytaniu,
    // bo te same wiersze odpowiadają też na pytanie „ile Bloków w ogóle masz".
    const aktywneBloki: FocusBlockLike[] | null = blokiRes.error || !Array.isArray(blokiRes.data)
      ? null
      : (blokiRes.data as { id: string; segment_id: string; status: string }[])
        .filter((b) => b.status === 'active')
        .map((b) => ({ id: b.id, segment_id: b.segment_id }));

    // ⚠️ WĄSKIE GARDŁO DO POSTĘPU BLOKU — pierwszy wiersz z zapytania
    // uporządkowanego po `is_priority`. ⛔ RÓŻNICA WOBEC EKRANU 1 NAZWANA
    // WPROST: „Dziś" filtruje cele po `status='active'`, a tutaj filtra nie ma
    // i mieć nie może (A4b — cel domknięty to sukces, nie utrata odznaki).
    // Skutek: gdy zawodnik ma wyłącznie cele domknięte, ten blok pokaże postęp
    // Bloku prowadzonego pod cel domknięty. To jest ŚWIADOMY kompromis, a nie
    // przeoczenie — zgłoszony w nocie pasa S2.
    const segmentCelu: string | null = celeRes.error || !Array.isArray(celeRes.data)
      ? null
      : (() => {
        const pierwszy = (celeRes.data as { segment_id: string | null }[])
          .map((g) => g.segment_id)
          .filter((x): x is string => typeof x === 'string' && x.length > 0);
        return pierwszy.length > 0 ? pierwszy[0] : null;
      })();

    const praca: WejsciaPracy = {
      dzis: toLocalDateStr(new Date()),
      poniedzialek: poniedzialekTygodnia(new Date()),
      wydarzeniaTygodnia: wierszeWydarzen,
      wpisyDziennika: powiazaniaWpisow,
      // ⛔ TRZY STANY, NIE DWA: „tabeli nie ma" ≠ „nie udało się odczytać"
      // ≠ „odczytałem i nic nie ma". Rozstrzyga to MODUŁ, nie ten ekran.
      werdykty: czytajWerdykty({ dane: werdyktyRes.data, blad: werdyktyRes.error }),
      sesjeWszystkichBlokow,
      aktywneBloki,
      zaplanowaneSesje,
      segmentCelu,
    };
    // ═══ ⭐ PLAN-D-S2 — WEJŚCIA TRZECH LICZB O PRACY — KONIEC ═══════

    setStan({
      praca,
      nagroda,
      deficitLabels,
      etykietyObszarow,
      odczytDiagnozyUdanySie: !diagRes.error,
      maDiagnoze: t.maDiagnoze,
      trafnosc: arkuszTrafnosci({ ...t, rodzajePracy }),
      rekomendacje: liczbaZOdczytu(rekomendacjeRes.error, rekomendacjeRes.count),
      podpis: podpisNaglowka({
        imie: wierszUzytkownika ? wierszUzytkownika.full_name : null,
        rocznik: wierszUzytkownika ? wierszUzytkownika.birth_year : null,
        rokTeraz: new Date().getFullYear(),
      }),
      model: zbudujModelProfilu({
        nagroda,
        zwrot: t.zwrot,
        pracaWlasna: t.pracaWlasna,
        maDiagnoze: t.maDiagnoze,
        pozycja: t.pozycja,
        rodzajePracy,
        liczby: {
          wpisy: dziennikRes.error || !Array.isArray(dziennikRes.data) ? null : dziennikRes.data.length,
          oceny: liczbaZOdczytu(werdyktyRes.error, werdyktyRes.count),
          mecze: meczeRes.error || !Array.isArray(meczeRes.data) ? null : meczeRes.data.length,
          pomiary: liczbaZOdczytu(wzrostRes.error, wzrostRes.count),
        },
        daneICel: {
          rocznik: wierszUzytkownika ? wierszUzytkownika.birth_year : null,
          wzrostPomiarow: liczbaZOdczytu(wzrostRes.error, wzrostRes.count),
          pozycja: t.pozycja,
          cel: wierszProfilu ? wierszProfilu.goal_direction : null,
        },
        raportRodzicaIstnieje: raportIstnieje,
        obciazenieOkna: obciazenie.okno,
        obciazenieOdniesienia: obciazenie.odniesienie,
      }),
    });
  }, [currentUser]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // ⭐ TRZY WARTOŚCI, NIE DWIE: dopóki `stan` jest `null`, ekran NIE RYSUJE
  // zer. Pustka odczytu ma własne zdanie z `lib/trzyPustki.ts`.
  const pustkaOdczytu = rozpoznajPustke({
    maWpisy: stan !== null,
    planLekcjiZnany: null,
    moznaZapisywac: null,
    odczytUdanySie: null,
    daSieOdswiezyc: true,
    tekstBrakuDanych: 'Wczytuję Twój profil…',
    ctaBrakuDanych: 'Pociągnij w dół, jeżeli to trwa.',
  });

  // ⭐ PUSTKA ZDANIA O PRACY DODATKOWEJ — i jej WYJŚCIE. Zdanie liczy się
  // z diagnozy, więc bez diagnozy zawodnik ma tu dostać nie samą informację
  // o braku, tylko rzecz do zrobienia (B3: pustka bez wyjścia jest ślepa).
  const pustkaDiagnozy = rozpoznajPustke({
    maWpisy: stan !== null && stan.maDiagnoze,
    planLekcjiZnany: null,
    moznaZapisywac: null,
    odczytUdanySie: stan === null ? null : (stan.odczytDiagnozyUdanySie ? null : false),
    daSieOdswiezyc: true,
    // ⛔ Zdanie NIE JEST wpisane tutaj — stoi w `lib/ekranProfilu.ts` razem
    // z trzema pozostałymi brakami, żeby cztery różne przyczyny nie zlały się
    // w jedno zdanie przy pierwszej poprawce (D3).
    tekstBrakuDanych: PRACA_DODATKOWA_BRAK.brak_diagnozy,
    ctaBrakuDanych: 'Zrób diagnozę →',
  });

  // ⭐ WEJŚCIA POWSTAJĄ TUTAJ, a arkusz je tylko układa. Ekran „Ja" jest
  // od 08.2026 JEDYNYM miejscem w produkcie, z którego prowadzą te drogi —
  // i zapadki repozytorium liczą je po nazwie TEGO pliku.
  // ⛔ Żaden z tych wierszy nie stoi w `ScrollView` ekranu: nie kosztują dp.
  const renderRow = (trasa: string, label: string, hint: string, onPress?: () => void) => (
    <TouchableOpacity
      key={trasa}
      style={styles.wiersz}
      onPress={onPress ? onPress : () => router.push(trasa as never)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.wierszTytul}>{label}</Text>
        <Text style={styles.wierszPodpis}>{hint}</Text>
      </View>
      <Text style={styles.strzalka}>›</Text>
    </TouchableOpacity>
  );

  const model = stan === null ? null : stan.model;
  const rozwoj = model === null ? null : model.rozwoj;
  // ⛔ `null` znaczy „jeszcze nie wczytałem", a nie „nie policzone" — to są
  // trzy różne rzeczy i ekran rysuje każdą innym zdaniem (R5).
  const obciazenie = model === null ? null : model.obciazenie7;
  // ⛔ Dopóki nie ma modelu, podpisy są PUSTE — nie zerowe i nie zmyślone.
  const podpisy: string[] = model === null ? [] : model.pozycje.map((p) => p.podpis);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        {/* ── NAGŁÓWEK ──────────────────────────────────────────────── */}
        <View style={styles.naglowek}>
          <Text style={styles.tytul}>{TYTUL_EKRANU}</Text>
          <Text style={styles.podtytul}>{stan === null ? '' : stan.podpis}</Text>
        </View>

        {/* ── ⭐ DWIE MIARY OBOK SIEBIE ──────────────────────────────
            ⛔ TEN SAM STYL LICZBY (`miaraLiczba`) po obu stronach — bo są
            równorzędne (D2). Rozjazd stylów zapala strażnika E4. */}
        <View style={styles.panelMiar}>
          <View style={styles.dwieMiary}>
            <View style={styles.miara}>
              <Text style={styles.miaraNazwa}>{NAZWA_ROZWOJU}</Text>
              <Text style={styles.miaraLiczba}>
                {rozwoj !== null && rozwoj.rodzaj === 'jest' ? String(rozwoj.punkty) : OBCIAZENIE_ZAMIAST_LICZBY}
              </Text>
              <Text style={styles.miaraPodpis}>
                {rozwoj === null
                  ? (pustkaOdczytu === null ? '' : pustkaOdczytu.tekst)
                  : rozwoj.rodzaj === 'jest'
                    ? `${rozwoj.punkty === 1 ? JEDNOSTKA_ROZWOJU_JEDEN : JEDNOSTKA_ROZWOJU_WIELE} · ${ROZWOJ_PODPIS}`
                    : rozwoj.rodzaj === 'jeszcze_nic'
                      ? ROZWOJ_JESZCZE_NIC
                      : ROZWOJ_NIE_POLICZONE(rozwoj.powod)}
              </Text>
            </View>
            {/* ⭐⭐ OBCIĄŻENIE — od pasa D1 (18.08.2026) PRAWDZIWA LICZBA.
                ⛔ Wzór `minuty × ciężkość ⁄ przelicznik`, BEZ trafności:
                ta sama praca celująca w wąskie gardło obciąża ciało dokładnie
                tyle samo. ⛔ ANI OCENY, ANI PROGU, ANI BARWY ZALEŻNEJ OD
                WARTOŚCI — obciążenie jest faktem o zawodniku, nie werdyktem.
                Dlatego liczba idzie tym SAMYM stylem, co rozwój, i nie ma
                obok siebie ani jednego przymiotnika. */}
            <View style={styles.miara}>
              <Text style={styles.miaraNazwa}>{NAZWA_OBCIAZENIA}</Text>
              <Text style={styles.miaraLiczba}>
                {obciazenie !== null && obciazenie.rodzaj === 'policzone'
                  ? obciazenie.liczba
                  : OBCIAZENIE_ZAMIAST_LICZBY}
              </Text>
              <Text style={styles.miaraPodpis}>
                {obciazenie === null
                  ? (pustkaOdczytu === null ? '' : pustkaOdczytu.tekst)
                  : obciazenie.rodzaj === 'policzone'
                    ? obciazenie.podpis
                    : obciazenie.rodzaj === 'nic_nie_wazy'
                      ? obciazenie.powod
                      : OBCIAZENIE_NIE_POLICZONE_ZDANIE(obciazenie.powod)}
              </Text>
            </View>
          </View>
          {/* ⭐ OKNO ODNIESIENIA — GOŁY FAKT, wewnątrz TEGO SAMEGO panelu.
              ⛔ Ani jednego dp poza panelem i ani jednej nowej pozycji ekranu:
              „Profil" ma pięć pozycji i ma je zachować. ⛔ Zdanie nie mówi
              „cięższy" ani „lżejszy" — mówi, ile było, i nic poza tym (Z0). */}
          {obciazenie !== null && obciazenie.rodzaj === 'policzone' && obciazenie.odniesienie !== null
            ? <Text style={styles.miaraOdniesienie}>{obciazenie.odniesienie}</Text>
            : null}
        </View>

        {/* ── ⭐ ZDANIE O PRACY DODATKOWEJ — klikalne ────────────────
            Policzalne w dniu założenia konta, z samej diagnozy. */}
        <TouchableOpacity style={styles.pracaDodatkowa} onPress={() => setOtwarty('trafnosc')}>
          <Text style={styles.pracaZdanie}>
            {pustkaDiagnozy
              ? pustkaDiagnozy.tekst
              : (model === null ? '' : zdanieOPracyDodatkowej(model.pracaDodatkowa))}
          </Text>
          {/* ⛔ WYJŚCIE Z PUSTKI stoi WEWNĄTRZ elementu dotykalnego. Napis
              ze strzałką, którego nie da się dotknąć, jest obietnicą bez pokrycia. */}
          {pustkaDiagnozy
            ? <Text style={styles.pracaWejscie}>{pustkaDiagnozy.cta}</Text>
            : <Text style={styles.pracaWejscie}>{PRACA_DODATKOWA_WEJSCIE}</Text>}
        </TouchableOpacity>

        {/* ── ⭐ PIĘĆ POZYCJI ───────────────────────────────────────
            ⛔ Lista idzie po `KOLEJNOSC_POZYCJI`, a nie po danych zawodnika,
            i to nie jest szczegół: dzięki temu jej długość DA SIĘ WYPROWADZIĆ
            z repozytorium, więc miara wysokości ekranu jej nie zaniża.
            Szósta pozycja nie wejdzie tu niezauważona (E3). */}
        {KOLEJNOSC_POZYCJI.map((klucz, i) => (
          <TouchableOpacity key={klucz} style={styles.wiersz} onPress={() => setOtwarty(klucz)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.wierszTytul}>{TYTULY_POZYCJI[klucz]}</Text>
              <Text style={styles.wierszPodpis}>{podpisy[i]}</Text>
            </View>
            <Text style={styles.strzalka}>›</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.przypis}>{PRZYPIS_CZEGO_TU_NIE_MA}</Text>
      </ScrollView>

      {/* Arkusze stoją POZA `ScrollView`, bo to modale, nie treść ekranu —
          ten sam wzorzec, którym od 08.2026 wchodzą Mapa drogi i Lista zadań. */}
      <ArkuszeProfilu
        otwarty={otwarty}
        onClose={() => setOtwarty(null)}
        userId={currentUser ? currentUser.id : null}
        praca={stan === null ? null : stan.praca}
        nagroda={stan === null ? null : stan.nagroda}
        trafnosc={stan === null ? null : stan.trafnosc}
        model={model}
        rekomendacje={stan === null ? null : stan.rekomendacje}
        deficitLabels={stan === null ? [] : stan.deficitLabels}
        etykietyObszarow={stan === null ? {} : stan.etykietyObszarow}
        wejscieBiblioteki={renderRow('/biblioteka', LIBRARY_SECTION_LABEL, libraryEntryHint(libraryCount))}
        wejscieZadan={renderRow('moje-zadania', WEJSCIE_LISTA_LABEL,
          // ⚠️ CZTERY STANY, NIE DWA: dopóki nie czytaliśmy, podpis jest PUSTY,
          // a nie zmyślony.
          odczytZadanStan === null ? '' : zdanieOdczytu(odczytZadanStan),
          () => setZadaniaOtwarte(true))}
        wejscieDrogi={renderRow('moja-droga', MAPA_ENTRY_LABEL, MAPA_ENTRY_HINT_DOSTEPNA,
          () => setDrogaOtwarta(true))}
        wejscieWyjscia={renderRow('sciezka-wyjscia', WYJSCIE_WEJSCIE_LABEL, WYJSCIE_WEJSCIE_PODPIS,
          () => setWyjscieOtwarte(true))}
        onSignOut={signOut}
        onOdswiez={load}
      />

      {/* ⛔ Modale montuje TEN plik — poza `ScrollView`, więc nie kosztują ani
          jednego dp, i w jednym miejscu, więc nie da się otworzyć dwóch kopii. */}
      <MojaDroga
        visible={drogaOtwarta}
        onClose={() => setDrogaOtwarta(false)}
        userId={currentUser ? currentUser.id : null}
      />
      <ListaZadan
        visible={zadaniaOtwarte}
        onClose={() => { setZadaniaOtwarte(false); load(); }}
        userId={currentUser ? currentUser.id : null}
      />
      <SciezkaWyjscia
        visible={wyjscieOtwarte}
        onClose={() => setWyjscieOtwarte(false)}
        userId={currentUser ? currentUser.id : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  naglowek: { marginBottom: spacing.md },
  // ⭐ PAS W1 (D-7, ten sam defekt co na „Dziś") — bez `lineHeight` Archivo
  // gubi ogonki i akcenty u góry. 28 px pisma, 34 px linii.
  tytul: { ...typography.display, fontSize: 28, lineHeight: 34, paddingTop: 3, color: colors.textPrimary },
  podtytul: { ...typography.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  // ═══════════════════════════════════════════════════════════════
  // ⭐ PAS W1 18.08.2026 (P-3) — PANEL DWÓCH MIAR.
  //
  // ⛔ PANEL JEST ODWRÓCONY: ciemne tło `--ink`, jasny tekst — tak jak
  // `.cnt` w makiecie v3. Do 18.08 dawało to ten sam efekt PRZYPADKIEM
  // (motyw był ciemny, więc `textPrimary` było prawie białe). Po zmianie
  // palety na jasną odwrócenie jest ŚWIADOME i ma własne tokeny:
  // `onInk` i `onInkMuted`. ⛔ Tekst na ciemnym panelu NIE bierze już
  // `colors.surface` — to znaczyło „karta", a chodziło o „tekst na ciemnym".
  //
  // ⭐ P-3 — OBIE LICZBY TEJ SAMEJ WIELKOŚCI, 44 px (makieta `.two .v`).
  // Były już tym samym stylem; zmienia się rozmiar (40 → 44) i to, że
  // obie kolumny mają RÓWNĄ szerokość i wyrównany dół podpisu.
  // ⛔ Kolor liczby jest STAŁĄ, nie funkcją wartości: barwienie liczby
  // obciążenia byłoby jej oceną, a tego zabrania D4.
  // ═══════════════════════════════════════════════════════════════
  panelMiar: {
    backgroundColor: colors.textPrimary, borderRadius: radii.lg,
    paddingVertical: 13, paddingHorizontal: 14, marginBottom: 10,
  },
  dwieMiary: { flexDirection: 'row', gap: 12 },
  miara: { flex: 1, minWidth: 0 },
  miaraNazwa: {
    ...typography.bodyMedium, fontSize: 9.5, letterSpacing: 1.3,
    textTransform: 'uppercase', color: colors.onInkMuted,
  },
  miaraLiczba: { ...typography.display, fontSize: 44, lineHeight: 46, color: colors.onInk, marginTop: 2 },
  miaraPodpis: { ...typography.body, fontSize: 10.5, color: colors.onInkMuted, marginTop: 3, lineHeight: 14 },
  // ⭐ PLAN-D-D1 — OKNO ODNIESIENIA. ⛔ Ten sam kolor i ta sama waga co podpis
  // miary: gdyby zdanie o odniesieniu było wyróżnione, byłoby werdyktem
  // o zawodniku, a jest faktem. ⛔ Zero barwy zależnej od wartości.
  miaraOdniesienie: {
    ...typography.body, fontSize: 10.5, color: colors.onInkMuted,
    marginTop: 9, paddingTop: 7, borderTopWidth: 1, borderTopColor: colors.onInkLine, lineHeight: 14,
  },

  pracaDodatkowa: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
  },
  pracaZdanie: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
  // ⭐ PAS W1 (P-1) — „«Zrób diagnozę →» jest CZERWONE".
  // ⛔ Ten styl SIĘ NIE ZMIENIŁ: bierze `colors.brand` tak jak brał.
  // Zmieniła się WARTOŚĆ tokenu — `brand` jest od 18.08 zielenią marki
  // #2E6B5E, a nie koralem #EE5342. ⭐ To jest cały zysk z trzymania
  // koloru w jednym miejscu: jedna poprawka gasi czerwień wszędzie.
  pracaWejscie: { ...typography.bodyMedium, fontSize: 11, color: colors.brand, marginTop: 4 },

  wiersz: {
    flexDirection: 'row', alignItems: 'center', minHeight: minTouchHeight,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 8,
  },
  wierszTytul: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  wierszPodpis: { ...typography.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  strzalka: { fontSize: 20, color: colors.textSecondary, marginLeft: 8 },

  przypis: { ...typography.body, fontSize: 11, color: colors.textTertiary, marginTop: 10, lineHeight: 15 },
});
