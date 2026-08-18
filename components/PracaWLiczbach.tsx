// ═══════════════════════════════════════════════════════════════════
// ⭐ PRACA W LICZBACH — PLAN-D-S2 08.2026 (18.08.2026). NOWY PLIK.
// ═══════════════════════════════════════════════════════════════════
//
// PO CO TEN PLIK ISTNIEJE — jednym zdaniem: to jest JEDYNA KOPIA RYSOWANIA
// trzech rzeczy, które produkt liczył od 15.08.2026 i których od 18.08.2026
// nie rysował NIKT.
//
// ── CO SIĘ STAŁO (mierzone, nie zapamiętane) ────────────────────────
// Pas A1 przebudował ekran „Dziś" do kształtu z makiety v3 i zdjął z niego
// trzy bloki: licznik pracy (~150 dp), pracę we wszystkich Blokach (~120 dp)
// i kafelek Celu z trzecim stanem postępu Bloku. ⛔ Decyzji o usunięciu ich
// Z PRODUKTU nie ma w żadnym dokumencie — nota A1 §3 kierowała je na „Profil",
// a pas A3 ich tam nie postawił. Skutek: `app/(tabs)/dzis.tsx` NADAL wołał
// `policzWykonanaPrace` (linia 2237) i `policzPraceWeWszystkichBlokach`
// (linia 2605), a wynik szedł do `console.log` i do kosza. To jest dokładnie
// stan, którego zakazuje reguła (F1-2): funkcja licząca pracę bez konsumenta.
//
// ── GDZIE TO STOI OD DZIŚ I DLACZEGO AKURAT TAM ─────────────────────
// Ekran „Profil" → pozycja **„Skąd to wiemy"** → ten blok. Makieta v3 opisuje
// tę pozycję dosłownie jako „Twoje wpisy, mecze i pomiary, z których liczą się
// wglądy" — licznik „N z M sesji odbyte, K bez wpisu" JEST tą treścią, a nie
// doklejeniem obcej rzeczy.
//
// ⭐ KOSZT: ZERO dp na obu ekranach produktu. `ArkuszeProfilu` jest `Modal`-em
// montowanym POZA `ScrollView` ekranu „Profil" (`app/(tabs)/ja.tsx`), a ekran
// „Dziś" ma 807 dp przy zgięciu 808 i ten pas nie dokłada mu ani jednego dp.
// ⛔ Liczba pozycji na „Profilu" zostaje PIĘĆ — wchodzimy DO WNĘTRZA jednej
// z nich, nie obok niej.
//
// ── ⛔ CZTERY RZECZY, KTÓRE PRZEŻYŁY PRZEPROWADZKĘ CO DO ZNAKU ───────
//  1. R5 — TRZY WARTOŚCI, NIE DWIE. „Nie udało się policzyć" i „jeszcze nic
//     nie ma" to DWA RÓŻNE ZDANIA. ⛔ Ekran nie podstawia zera za brakujące
//     `odbyte` / `mianownik` — kształt `brak_podstawy` tych pól NIE MA
//     (pas D1) i nie dorabiamy ich tutaj.
//  2. WG-28 — „bez wpisu" ma WŁASNE, JAWNE zdanie. Nie chowa się w liczniku
//     i nie wchodzi do mianownika.
//  3. M4 — KAŻDA gałąź kończy się rzeczą do zrobienia, także ta bez podstawy
//     do policzenia. Liczba bez rzeczy do zrobienia jest oceną, nie prowadzeniem.
//  4. Pasek postępu rysuje się WYŁĄCZNIE przy `WIADOMO`. Przy `NIE_WIEM` stoi
//     zdanie, nie pasek: pasek na 0 % obok „nie wiemy, ile się odbyło" jest tym
//     samym kłamstwem, tylko narysowanym zamiast napisanego (Z0).
//
// ⛔ N1 — ani jednego słowa o dniach z rzędu, passie, serii. ⛔ N3 — zero
// porównań z kimkolwiek. Nagroda jest za WYKONANĄ PRACĘ, nigdy za obecność.
//
// ⛔ ANI JEDNA LICZBA NIE POWSTAJE W TYM PLIKU. Cała arytmetyka stoi
// w `lib/wykonanieSesji.ts`, `lib/widokTygodnia.ts` i `lib/focusBlockProgress.ts`,
// objęta trzema strażnikami. Ten plik dostaje WIERSZE i rysuje wynik.
// ⚠️ Wywołania czystych funkcji stoją TUTAJ, a nie w `app/(tabs)/ja.tsx`,
// z tego samego powodu, dla którego `components/ListaZadan.tsx` woła
// `policzWglady`: konsument reguły ma stać przy rysowaniu jej wyniku, żeby
// nie dało się zdjąć jednego bez drugiego.
import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, minTouchHeight, skew } from '../constants/theme';
import {
  przesunTydzien,
  zbudujTydzien,
  type Tydzien,
  type WierszWydarzenia,
} from '../lib/widokTygodnia';
import {
  policzWykonanaPrace,
  type LicznikPracy,
  type WejscieWerdyktow,
  type WystapienieDoLicznika,
} from '../lib/wykonanieSesji';
import {
  DOROBEK_BLOKOW_NAGLOWEK,
  DOROBEK_BLOKOW_PUSTO,
  DOROBEK_BLOKOW_RZECZ_DO_ZROBIENIA,
  NIE_WIEM_POWOD,
  NIE_WIEM_TYTUL,
  computeFocusBlockProgressState,
  dorobekBlokowLiczba,
  dorobekBlokowNiePoliczony,
  policzPraceWeWszystkichBlokach,
  type BlockEventLike,
  type DorobekWBlokach,
  type FocusBlockLike,
  type FocusBlockProgressState,
} from '../lib/focusBlockProgress';

// ═══════════════════════════════════════════════════════════════════
// BRZMIENIA LICZNIKA — PRZENIESIONE CO DO ZNAKU Z `app/(tabs)/dzis.tsx`
// (pas B5, 15.08.2026). ⛔ ANI JEDNO NIE JEST NOWE i ani jedno nie zostało
// przepisane: to są te same stałe, w nowym pliku. Martwe kopie w `dzis.tsx`
// skreślił ten sam pas — dwie kopie brzmienia rozjeżdżają się przy pierwszej
// poprawce, a każda z osobna wygląda poprawnie.
// ═══════════════════════════════════════════════════════════════════

/** Okno licznika pracy. Jedna liczba, jedno miejsce — WG-28 mówi o 14 dniach. */
const OKNO_LICZNIKA_DNI = 14;

/** Nagłówek licznika. Ten sam kształt, co pozostałe nadtytuły tego bloku. */
const LICZNIK_NAGLOWEK = 'WYKONANA PRACA';

/** Nagłówek postępu bieżącego Bloku. */
const POSTEP_NAGLOWEK = 'TWÓJ BLOK SKUPIENIA';

/**
 * ⭐ ZDANIE STANU `policzony`.
 *
 * ⚠️ TRZECIA OSOBA JEST TREŚCIĄ, NIE STYLEM. „2 z 3 sesji odbyte" opisuje
 * NASZĄ WIEDZĘ; „Odbyłeś 2 z 3" jest zdaniem o zawodniku — a `nieodbyte`
 * zawiera dziś także sesje ODWOŁANE, których zawodnik nie opuścił.
 */
const LICZNIK_POLICZONY = (odbyte: number, mianownik: number, oknoDni: number) =>
  `${odbyte} z ${mianownik} sesji odbyte · ostatnie ${oknoDni} dni`;

/**
 * ⭐ ZDANIE STANU `brak_podstawy` — ⛔ INNA STAŁA, NIE TA SAMA Z ZEREM.
 *
 * ⛔ TU NIE MA I NIE MOŻE BYĆ „0 z 0". Kształt `brak_podstawy` świadomie nie
 * ma pól `odbyte` ani `mianownik` (pas D1), więc zera nie da się nawet
 * przypadkiem narysować — a zdanie „0 z 0" wygląda jak pomiar i nim nie jest.
 */
const LICZNIK_BRAK_PODSTAWY = (bezWpisu: number, nieodczytane: number) => {
  if (bezWpisu > 0 && nieodczytane > 0) {
    return `${bezWpisu} sesji bez wpisu i ${nieodczytane} nieodczytanych — nie wiem, które się odbyły.`;
  }
  if (bezWpisu > 0) return `${bezWpisu} sesji bez wpisu — nie wiem, które się odbyły.`;
  if (nieodczytane > 0) return `${nieodczytane} sesji nie udało mi się odczytać — nie wiem, które się odbyły.`;
  return 'Nie masz w kalendarzu ani jednej sesji z ostatnich dwóch tygodni.';
};

/** Trzecia liczba WG-28 — „bez wpisu" JAWNIE, i jawnie POZA licznikiem. */
const LICZNIK_BEZ_WPISU = (ile: number) =>
  `${ile} bez wpisu — nie liczą się ani do jednej z tych liczb.`;
const LICZNIK_NIEODCZYTANE = (ile: number) =>
  `${ile} nie udało mi się odczytać — też są poza licznikiem.`;

/**
 * ⭐ M4 — LICZBA KOŃCZY SIĘ RZECZĄ DO ZROBIENIA. „2 z 3" bez wyjścia jest oceną.
 * Obie prowadzą do Kalendarza, bo tam mieszka zapis werdyktu (pas D1) i tam
 * planuje się sesję. ⛔ Ten blok werdyktu NIE ZAPISUJE.
 */
const LICZNIK_ROBOTA_ZAZNACZ = 'Zaznacz w Kalendarzu, których nie odbyłeś →';
const LICZNIK_ROBOTA_ZAPLANUJ = 'Zaplanuj kolejną sesję w Kalendarzu →';

/**
 * ⭐ WEJŚCIA — SUROWE WIERSZE, NIE LICZBY.
 *
 * ⛔ KAŻDE `null` ZNACZY „NIE ODCZYTAŁEM", nigdy „nie ma". Sklejenie tych dwóch
 * jest jedynym sposobem, żeby awaria sieci wyglądała jak brak pracy zawodnika
 * — i to jest ta sama rzecz, przed którą stoi R5.
 */
export type WejsciaPracy = {
  /** Dzisiejsza data `YYYY-MM-DD`. ⛔ Parametrem, nie z zegara tego pliku. */
  dzis: string;
  /** Poniedziałek bieżącego tygodnia — ta sama reguła, co w `glosTygodnia`. */
  poniedzialek: string;
  /** ⚠️ `null` = odczyt kalendarza się nie udał. */
  wydarzeniaTygodnia: WierszWydarzenia[] | null;
  /** Powiązania wpisów Dziennika z sesjami. ⚠️ `null` = odczyt się nie udał. */
  wpisyDziennika: ReadonlySet<number> | null;
  /** Trzy stany `czytajWerdykty`, nie dwa — rozstrzyga je moduł, nie ekran. */
  werdykty: WejscieWerdyktow;
  /** WSZYSTKIE sesje Bloków, bez odsiewania po statusie. `null` = odczyt padł. */
  sesjeWszystkichBlokow: BlockEventLike[] | null;
  /** Bloki `active`. ⚠️ `null` = odczyt padł, a nie „nie masz Bloku". */
  aktywneBloki: FocusBlockLike[] | null;
  /** Sesje `scheduled` — mianownik postępu Bloku. `null` = odczyt padł. */
  zaplanowaneSesje: BlockEventLike[] | null;
  /** `segment_id` wąskiego gardła. `null` = nie znam Celu. */
  segmentCelu: string | null;
};

export default function PracaWLiczbach(props: { we: WejsciaPracy | null }) {
  const router = useRouter();
  const we = props.we;

  /**
   * ⛔ TRZY TYGODNIE, NIE JEDEN — I TO NIE JEST NADMIAR.
   *
   * Okno licznika to `[dziś − 13, dziś]`, czyli 14 dni. Tygodnie ISO zaczynają
   * się w poniedziałek, więc te 14 dni potrafią wejść w TRZY różne tygodnie.
   * Dwa tygodnie zostawiłyby dziurę jednego dnia, której nikt by nie zauważył.
   *
   * ⛔ I DLATEGO NIE MA TU WŁASNEJ PĘTLI PO DNIACH. Rozwinięcie reguły
   * cyklicznej w konkretne wtorki jest regułą pasa C1 i ma zostać jedną kopią.
   */
  const tygodnie: Tydzien[] = useMemo(() => {
    if (we === null) return [];
    const dwaWstecz = przesunTydzien(we.poniedzialek, -2);
    const jedenWstecz = przesunTydzien(we.poniedzialek, -1);
    const poniedzialki = [dwaWstecz, jedenWstecz, we.poniedzialek]
      .filter((p): p is string => p !== null);
    return poniedzialki.map((poniedzialek) => zbudujTydzien({
      poniedzialek,
      dzisiaj: we.dzis,
      wydarzenia: we.wydarzeniaTygodnia,
      // ⚠️ `null` znaczy „w ogóle nie próbowano odczytać", i to jest prawda:
      // ekran „Profil" NIE pyta o `school_week`. Skutek jest zaprojektowany —
      // pasek zajętości wychodzi `NIE_WIEM` i się nie rysuje.
      planLekcji: null,
      wpisyDziennika: we.wpisyDziennika,
      werdykty: we.werdykty,
    }));
  }, [we]);

  /**
   * ⭐ LICZNIK PRACY. Wystąpienia bierzemy z tych samych trzech tygodni, więc
   * reguła rozwijania cyklicznej stoi w jednym miejscu. `status` dokładamy
   * z surowego wiersza: `PozycjaDnia` go nie niesie, a licznik potrzebuje obu.
   *
   * ⛔ NIE FILTRUJEMY OKNA TUTAJ. `policzWykonanaPrace` ma własne okno
   * `[dziś − 13, dziś]` i sam odcina przyszłość.
   * ⛔ JEDEN ARGUMENT — drugi (`ZasadyWykonania`) należy wyłącznie do strażnika
   * mutacyjnego D1; podany stąd znaczyłby, że blok ma własną, schowaną kopię
   * reguł rozstrzygania wykonania.
   */
  const licznik: LicznikPracy | null = useMemo(() => {
    if (we === null) return null;
    const statusy = new Map<number, string>();
    const surowe = we.wydarzeniaTygodnia;
    if (surowe !== null) for (const w of surowe) statusy.set(w.id, w.status);

    const wystapienia: WystapienieDoLicznika[] | null = surowe === null
      ? null
      : tygodnie.flatMap((t) => t.dni.flatMap((d) => d.pozycje.map((p) => ({
        idWydarzenia: p.id,
        dzien: p.dzien,
        // ⚠️ Wiersz, którego nie ma w mapie, nie istnieje — ale gdyby kiedyś
        // zaistniał, `''` NIE jest żadnym ze statusów bazy, więc reguła
        // potraktuje go jako „nie odwołany i nie completed", czyli najostrożniej.
        status: statusy.get(p.id) ?? '',
        zRegulyCyklicznej: p.zRegulyCyklicznej,
      }))));

    return policzWykonanaPrace({
      dzis: we.dzis,
      oknoDni: OKNO_LICZNIKA_DNI,
      wystapienia,
      wpisyDziennika: we.wpisyDziennika,
      werdykty: we.werdykty,
    });
  }, [we, tygodnie]);

  /**
   * ⭐ PRACA WE WSZYSTKICH BLOKACH — jedyna liczba w appce, której nie kasuje
   * domknięcie Bloku. ⛔ WYLICZANA Z WIERSZY, nie czytana z kolumny stanu:
   * liczba trzymana w stanie jest liczbą, którą da się wyzerować.
   */
  const pracaWBlokach: DorobekWBlokach | null = useMemo(
    () => (we === null ? null : policzPraceWeWszystkichBlokach({
      wszystkieSesjeBlokow: we.sesjeWszystkichBlokow,
      zrobioneEventIds: we.wpisyDziennika,
    })),
    [we],
  );

  /**
   * ⭐ TRZECI STAN POSTĘPU BLOKU. ⛔ `computeFocusBlockProgressState`, a nie
   * `computeFocusBlockProgress`: różnica między „0 z M" a „nie wiemy, ile z M"
   * jest w tej appce różnicą między pomiarem a oskarżeniem (Z0).
   *
   * ⚠️ `null` w odczycie daje PUSTY ZBIÓR, czyli `BRAK_PLANU` albo `NIE_WIEM` —
   * jedyne stany, które są wtedy prawdziwe. ⛔ Nigdy „0 z M".
   */
  const workProgress: FocusBlockProgressState | null = useMemo(() => {
    if (we === null) return null;
    return computeFocusBlockProgressState({
      goalSegmentId: we.segmentCelu,
      activeBlocks: we.aktywneBloki === null ? [] : we.aktywneBloki,
      scheduledEvents: we.zaplanowaneSesje === null ? [] : we.zaplanowaneSesje,
      // ⭐ DYSKRYMINATOR pasa A1: `null` (odczyt powiązań padł) daje pusty
      // zbiór, czyli NIE_WIEM — jedyny stan, który jest wtedy prawdziwy.
      doneEventIds: we.wpisyDziennika === null ? new Set<number>() : new Set(we.wpisyDziennika),
    });
  }, [we]);

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ LICZNIK PRACY NA EKRANIE — cztery rzeczy, ani jednej więcej:
  //
  //  1. ⛔ STAN „NIE MAM Z CZEGO POLICZYĆ" MA WŁASNE ZDANIE (R5). Prowadzi
  //     do INNEJ STAŁEJ (`LICZNIK_BRAK_PODSTAWY`), mówiącej, CZEGO BRAKUJE.
  //     Kształt danych celowo nie ma pól `odbyte` ani `mianownik` — i nie
  //     dorabiamy ich tutaj.
  //  2. ⛔ LICZNIK NIE ZERUJE SIĘ I NIE LICZY DNI Z RZĘDU (N1).
  //  3. ⛔ „BEZ WPISU" NIE WCHODZI DO MIANOWNIKA — rysujemy `bezWpisu` jako
  //     TRZECIĄ, osobną liczbę i mówimy wprost, że nie liczy się do żadnej
  //     z dwóch (WG-28).
  //  4. ⭐ LICZBA KOŃCZY SIĘ RZECZĄ DO ZROBIENIA (M4), NIEZALEŻNIE OD GAŁĘZI.
  // ═══════════════════════════════════════════════════════════════════
  function renderLicznikPracy() {
    if (licznik === null) return null;

    // ⚠️ Wyjście dobiera się do TEGO, CZEGO BRAKUJE, a nie do stanu licznika:
    // przy sesjach bez wpisu brakuje rozstrzygnięcia (a to robi się
    // w Kalendarzu), a bez sesji brakuje sesji. ⛔ Powstaje PRZED gałęziami,
    // więc żadna z nich nie ma prawa skończyć się na samej wiedzy.
    const doZrobienia = licznik.bezWpisu > 0 ? LICZNIK_ROBOTA_ZAZNACZ : LICZNIK_ROBOTA_ZAPLANUJ;

    return (
      <View style={styles.czesc}>
        <Text style={styles.naglowek}>{LICZNIK_NAGLOWEK}</Text>
        {licznik.rodzaj === 'policzony' ? (
          <>
            <Text style={styles.liczba}>
              {LICZNIK_POLICZONY(licznik.odbyte, licznik.mianownik, licznik.oknoDni)}
            </Text>
            {licznik.bezWpisu > 0
              ? <Text style={styles.podpis}>{LICZNIK_BEZ_WPISU(licznik.bezWpisu)}</Text>
              : null}
            {licznik.nieodczytane > 0
              ? <Text style={styles.podpis}>{LICZNIK_NIEODCZYTANE(licznik.nieodczytane)}</Text>
              : null}
          </>
        ) : (
          <Text style={styles.brakPodstawy}>
            {LICZNIK_BRAK_PODSTAWY(licznik.bezWpisu, licznik.nieodczytane)}
          </Text>
        )}
        <TouchableOpacity style={styles.inlineLink} onPress={() => router.push('/kalendarz')}>
          <Text style={styles.cardAction}>{doZrobienia}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PRACA WE WSZYSTKICH BLOKACH SKUPIENIA — trzecia liczba i trzecia inna
  // odpowiedź:
  //   • licznik pasa D1  — RYTM ostatnich 14 dni (może zmaleć i tak ma być);
  //   • „ROZWÓJ" na wierzchu Profilu — cała wykonana praca (nie maleje);
  //   • ten blok         — praca w BLOKACH, licząc te domknięte.
  //
  // ⛔ BEZ ZAKRESU CZASU. Zakres czasu jest dokładnie tym, co pozwala liczbie
  // zmaleć. ⛔ ZERO PORÓWNANIA Z KIMKOLWIEK (N3). ⛔ ZERO POWIADOMIEŃ.
  // ═══════════════════════════════════════════════════════════════════
  function renderPracaWBlokach() {
    if (pracaWBlokach === null) return null;

    // ⭐ R5 — „nie udało się policzyć" to INNE ZDANIE niż „jeszcze nic nie ma",
    // nie to samo z zerem. Typ `nie_policzony` nie ma pola `sesje`, więc zera
    // nie da się tu narysować nawet przez pomyłkę.
    if (pracaWBlokach.rodzaj === 'nie_policzony') {
      return (
        <View style={styles.czesc}>
          <Text style={styles.naglowek}>{DOROBEK_BLOKOW_NAGLOWEK}</Text>
          <Text style={styles.brakPodstawy}>
            {dorobekBlokowNiePoliczony(pracaWBlokach.nieodczytaneZrodlo)}
          </Text>
          {/* ⭐ M4 — także gałąź „nie udało się policzyć" kończy się rzeczą
              do zrobienia. Zdanie o awarii bez wyjścia jest ślepą uliczką. */}
          <TouchableOpacity style={styles.inlineLink} onPress={() => router.push('/dziennik')}>
            <Text style={styles.cardAction}>{DOROBEK_BLOKOW_RZECZ_DO_ZROBIENIA}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.czesc}>
        <Text style={styles.naglowek}>{DOROBEK_BLOKOW_NAGLOWEK}</Text>

        {/* LICZBA — albo jawne „jeszcze nic tu nie ma", NIE „0 sesji". */}
        {pracaWBlokach.sesje > 0 ? (
          <Text style={styles.liczba}>
            {dorobekBlokowLiczba(pracaWBlokach.sesje, pracaWBlokach.bloki)}
          </Text>
        ) : (
          <Text style={styles.brakPodstawy}>{DOROBEK_BLOKOW_PUSTO}</Text>
        )}

        {/* ⭐ POWÓD STANU „NIE WIEM" — jedyne miejsce, w którym jest napisany.
            ⛔ RYSUJEMY GO WYŁĄCZNIE, GDY STAN NAPRAWDĘ JEST `NIE_WIEM`. Zdanie
            „żaden wpis nie jest jeszcze połączony z sesją" jest TWIERDZENIEM
            o danych zawodnika — postawione bezwarunkowo, także po nieudanym
            odczycie powiązań, byłoby zgadywaniem podanym jako pewnik (Z0). */}
        {workProgress !== null && workProgress.stan === 'NIE_WIEM' ? (
          <Text style={styles.podpis}>{NIE_WIEM_POWOD}</Text>
        ) : null}

        {/* ⭐ M4 — liczba kończy się rzeczą do zrobienia, i jest to DOKŁADNIE
            TA SAMA rzecz, którą wskazuje trzeci stan pasa A1
            (`DOROBEK_BLOKOW_RZECZ_DO_ZROBIENIA === NIE_WIEM_RZECZ_DO_ZROBIENIA`). */}
        <TouchableOpacity style={styles.inlineLink} onPress={() => router.push('/dziennik')}>
          <Text style={styles.cardAction}>{DOROBEK_BLOKOW_RZECZ_DO_ZROBIENIA}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ POSTĘP BIEŻĄCEGO BLOKU — TRZY STANY, NIE DWA.
  //
  // Do 15.08.2026 stało tu wyłącznie „{done} z {total} sesji zrobione" i była
  // to JEDYNA gałąź. Zmierzone tego dnia na produkcji:
  // `daily_logs.calendar_event_id` puste w 10 na 10 wpisach — więc zawodnik
  // czytał „0 z 12 sesji zrobione", zdanie z rejestru FAKT O TOBIE, twierdzące,
  // że nie odbył ani jednej sesji, podczas gdy prawdą jest, że NIE WIEMY.
  //
  // ⛔ PASEK RYSUJE SIĘ WYŁĄCZNIE PRZY `WIADOMO`. Pasek na 0 % obok zdania
  // „nie wiemy" byłby tym samym kłamstwem, tylko narysowanym zamiast
  // napisanego. Przy `NIE_WIEM` stoi ZDANIE — i ani jednego piksela paska.
  // ⛔ `BRAK_PLANU` to MILCZENIE, a nie „0 z 0": nie ma o czym mówić.
  // ═══════════════════════════════════════════════════════════════════
  function renderPostepBloku() {
    if (workProgress === null) return null;
    // ⛔ MILCZENIE PRZY `BRAK_PLANU` — i to jest JEDYNE dopuszczalne wyciszenie
    // w tej funkcji. `BRAK_PLANU` znaczy „nie ma Bloku pod tym Celem albo Blok
    // nie ma ani jednej sesji", czyli nie ma o czym mówić; „0 z 0" byłoby
    // zdaniem wyglądającym na pomiar. ⛔ ANI `WIADOMO`, ANI `NIE_WIEM` NIE MA
    // PRAWA WYPAŚĆ TĄ DROGĄ — pilnuje tego osobna asercja (F1-1) w
    // `lib/kartaDzisILicznik.selftest.ts`, bo cisza przy `NIE_WIEM` wygląda
    // dokładnie jak brak funkcji.
    if (workProgress.stan === 'BRAK_PLANU') return null;

    return (
      <View style={styles.czesc}>
        <Text style={styles.naglowek}>{POSTEP_NAGLOWEK}</Text>
        {workProgress.stan === 'WIADOMO' ? (
          <>
            <Text style={styles.workText}>
              {workProgress.done} z {workProgress.total} sesji zrobione
            </Text>
            <View style={styles.workTrack}>
              <View style={[styles.workFill, { width: `${Math.round((workProgress.done / workProgress.total) * 100)}%` }]} />
            </View>
          </>
        ) : null}
        {workProgress.stan === 'NIE_WIEM' ? (
          <Text style={styles.workText}>{NIE_WIEM_TYTUL(workProgress.total)}</Text>
        ) : null}
      </View>
    );
  }

  // ⛔ KOLEJNOŚĆ JEST CZĘŚCIĄ TREŚCI, nie układem: najpierw to, nad czym
  // zawodnik pracuje TERAZ (Blok), potem rytm ostatnich 14 dni, na końcu
  // dorobek, którego nic nie kasuje. Od szczegółu do sumy, nie odwrotnie.
  return (
    <View>
      {renderPostepBloku()}
      {renderLicznikPracy()}
      {renderPracaWBlokach()}
    </View>
  );
}

const styles = StyleSheet.create({
  czesc: { marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  naglowek: {
    ...typography.bodyMedium, fontSize: 11, letterSpacing: 1,
    textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6,
  },
  liczba: { ...typography.bodySemiBold, fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  brakPodstawy: { ...typography.bodySemiBold, fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  podpis: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: 4 },
  inlineLink: { minHeight: minTouchHeight, justifyContent: 'center' },
  cardAction: { ...typography.bodyMedium, fontSize: 13, color: colors.brand },
  workText: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary, marginBottom: 5 },
  workTrack: { height: 4, borderRadius: 2, backgroundColor: colors.track, overflow: 'hidden' },
  workFill: { height: 4, backgroundColor: colors.brand, transform: [{ skewX: skew.angle }] },
});
