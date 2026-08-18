// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-C4 08.2026 (15.08.2026) — NAGRODA ZA WYKONANĄ PRACĘ.
//
// Ten plik odpowiada na JEDNO pytanie: ILE PRACY TEN ZAWODNIK WYKONAŁ —
// łącznie, od początku, i co mu z tego przysługuje.
// Zero Reacta, zero Supabase, zero zegara. ⭐ ZERO DAT W ARYTMETYCE.
//
// ── ⛔ ZAKAZ, KTÓRY JEST CAŁĄ TREŚCIĄ TEGO PLIKU ────────────────────
// ŻADNEJ SERII DNI Z RZĘDU. ŻADNEJ NAGRODY ZA SAMO POJAWIENIE SIĘ.
// ŻADNEGO LICZNIKA, KTÓRY WRACA DO ZERA.
//
// Powód jest zmierzony, nie światopoglądowy. Nagroda za samo zaangażowanie:
// **d = −0,40** na motywację wewnętrzną (Deci 1999), najsilniej **u dzieci**.
// Jeden opuszczony dzień obniża automatyzm nawyku o **0,29 punktu** i nawyku
// NIE PRZERYWA — więc licznik wracający do zera mówi zawodnikowi nieprawdę
// o tym, jak powstaje nawyk. To jest złamanie Z0 przy zielonych testach.
// Zasada: `claude/ZASADY_OBOWIAZUJACE_13_08_2026.md`, **N1**.
//
// ── ⭐ PLAN-D-L1 (17.08.2026) — CO SIĘ ZMIENIŁO I CO ZOSTAŁO ────────
// Do 17.08.2026 `JednostkaPracy` NIE NIOSŁA DATY, a zakaz „nie karzemy za
// przerwę" był nie do złamania, bo funkcja nie miała CZYM zmierzyć przerwy.
// Decyzja Kuby z 17.08 (pas L1, D1): produkt ma umieć powiedzieć, ile pracy
// mieści się w ostatnich dniach — więc jednostka datę DOSTAJE.
//
// ⛔ TO NIE JEST ZŁAGODZENIE ZAKAZU. `policzNagrode` — funkcja DOROBKU
// CAŁKOWITEGO — nadal NIE MA ŻADNEGO PARAMETRU OKNA i NIE CZYTA pola `kiedy`
// ani razu. Okno mieszka WYŁĄCZNIE w `lib/obciazenieOstatnichDni.ts`, jako
// osobna funkcja, a nie jako przełącznik tej. ⭐ Powód, dla którego to są dwie
// funkcje, a nie jedna z parametrem: funkcja z przełącznikiem „okno" jest
// zaproszeniem, żeby ktoś podał okno tam, gdzie go nie wolno — i wtedy dorobek
// zaczyna maleć po tygodniu przerwy, czyli karze za kontuzję, chorobę i sesję
// egzaminacyjną. Pilnują tego DWIE asercje strażnika: jedna czyta to źródło
// jako tekst, druga to samo URUCHAMIA — ten sam zestaw jednostek rozrzucony
// po roku i skupiony w jednym dniu ma dać TĘ SAMĄ liczbę dorobku.
//
// ── ⭐ DLACZEGO ODZNAKI SĄ WYLICZANE, A NIE PRZECHOWYWANE ───────────
//   wykonana praca (wiersze, które JUŻ SĄ w bazie) → czysta funkcja → odznaki
// Licznika przechowywanego można nie zwiększyć albo wyzerować — wyliczanego
// nie. Odznaka wyliczona nigdy nie rozjedzie się z prawdą; przechowywana
// rozjeżdża się przy pierwszym błędzie zapisu i wtedy appka twierdzi coś
// o dziecku, czego nie ma w danych. Zero tabel, zero migracji, zero blokady.
//
// ── ⭐ CO TEN LICZNIK LICZY, A CZEGO NIE LICZY LICZNIK PASA D1 ──────
// `lib/wykonanieSesji.ts` odpowiada na pytanie o WYSTĄPIENIE: „czy TA sesja
// we wtorek się odbyła". Musi więc znać wiersz kalendarza i datę, i słusznie
// odmawia, gdy ich nie ma.
// TEN plik odpowiada na pytanie o PRACĘ: „ile jej wykonałeś". Praca zapisana
// w Dzienniku jako trening o RPE 6 i 90 minutach JEST wykonaną pracą, nawet
// jeżeli nikt nie wie, do którego wiersza kalendarza ją przypiąć.
// ⭐ To jest dokładnie ta różnica, dzięki której licznik skumulowany może być
// uczciwy tam, gdzie licznik okna być nie może.
//
// ── ⛔ ZMIERZONE 15.08.2026 NA PRODUKCJI — DLACZEGO TO NIE JEST TEORIA
// `session_verdicts` istnieje i ma **0 wierszy** · `calendar_events` ze
// `status='completed'`: **0 z 24** · `daily_logs.calendar_event_id`: **0 z 10**.
// Appka nie ma dziś ANI JEDNEGO dowodu, że jakakolwiek zaplanowana sesja się
// odbyła. Gdyby ten plik liczył wyłącznie sesje, oddałby zero każdemu — czyli
// powiedziałby dzieciom, które coś robiły, że nie zrobiły nic.
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// 1. ⚠️ PROGI I WAGI — WSZYSTKIE **DO PRZEJRZENIA PRZEZ KUBĘ**
// ═══════════════════════════════════════════════════════════════════
//
// ⛔ ŻADNA Z TYCH LICZB NIE MA ZA SOBĄ BADANIA I ŻADNA NIE UDAJE, ŻE MA.
// To jest skala trudności i brzmienie — czyli decyzja produktowa, nie pomiar.
// Wszystkie stoją w JEDNEJ tabeli, więc zmiana każdej to jedna linia.
// Komplet do decyzji zebrany w nocie `PRZEKAZANIE_PAS_C4_15_08_2026.md` §9.

import type { WejscieWerdyktow } from './wykonanieSesji';
import { rozpoznajRodzajPozycji } from './ocenaZKafla';
import { TRAFNOSC_BAZOWA, trafnoscSesji, type ZwrotObszarow } from './zwrotObszaru';

export const BRZMIENIE_DO_PRZEJRZENIA_C4 = 'DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-C4, 15.08.2026)';

/**
 * Rodzaje pracy, którą produkt NAPRAWDĘ zapisuje. ⛔ Nie ma tu niczego, czego
 * appka mogłaby zapisywać — tylko to, co ma dziś wiersz w bazie.
 */
export type RodzajPracy =
  /** Wystąpienie z DOWODEM wykonania (werdykt zawodnika · `completed` · wpis wskazujący tę pozycję). */
  | 'sesja_z_dowodem'
  /** Wpis w Dzienniku niosący POMIAR obciążenia (RPE i/lub czas trwania). */
  | 'wpis_potreningowy'
  /** Pozostały wpis w Dzienniku (poranny, samopoczucie, sen). */
  | 'wpis_dziennika'
  /** Odpowiedź na pytanie kontrolne Bloku Skupienia. */
  | 'odpowiedz_kontrolna'
  /** Zapisany mecz. */
  | 'mecz';

/**
 * ⚠️ WAGI — DO PRZEJRZENIA PRZEZ KUBĘ. Uzasadnienie przy każdej.
 *
 * Powód, dla którego wagi w ogóle istnieją: bez nich dziesięć porannych wpisów
 * o śnie wygląda w liczniku identycznie jak dziesięć odbytych treningów, a to
 * jest nagroda za obecność przebrana za nagrodę za pracę (N1).
 */
export const WAGI_PRACY: Readonly<Record<RodzajPracy, number>> = {
  /**
   * 1 — ⭐ TO JEST WYŁĄCZNIE WAGA AWARYJNA, gdy o sesji nie wiadomo NIC poza tym,
   * że się odbyła. Prawdziwą wagę liczy `wagaSesji()` z rodzaju wydarzenia
   * i z długości. ⛔ Nigdy nie dodawaj tej liczby wprost — dodaje się `j.punkty`.
   */
  sesja_z_dowodem: 1,
  /** 1 — jw. Prawdziwą wagę meczu liczy `wagaMeczu()` z minut na boisku. */
  mecz: 1,
  /**
   * ⛔ 0 — decyzja Kuby 17.08.2026. Wpis potreningowy PRZESTAJE być nagrodą
   * i staje się DOWODEM: nie daje punktu, tylko ODBLOKOWUJE punkt sesji,
   * której dotyczy (O100). Nagrodą za wypełnienie nie jest liczba w liczniku,
   * tylko to, że sesja przestaje być deklaracją.
   */
  wpis_potreningowy: 0,
  /** ⛔ 0 — jw. Odpowiedź kontrolna nie jest pracą sportową. */
  odpowiedz_kontrolna: 0,
  /**
   * ⛔ 0 — decyzja Kuby 17.08.2026, dosłownie: „dawanie punktów za wypełnianie
   * ankiety/dziennika to nie jest nic rzetelnego". Ankieta poranna nadal jest
   * potrzebna produktowi — ale nagrodą za nią ma być LEPSZA PODPOWIEDŹ,
   * a nie punkt w liczniku pracy.
   */
  wpis_dziennika: 0,
};

// ═══════════════════════════════════════════════════════════════════
// 1a. ⭐ O100 — PUNKT JEST ZA PRACĘ, KTÓRA MA DOWÓD (PLAN-D-W1, 17.08.2026)
// ═══════════════════════════════════════════════════════════════════
//
// Słowa Kuby: „to musi być poprawne logicznie i dawać realny feedback
// zawodnikom, którzy mają prawo robić duże postępy tym, że robią więcej,
// a nie dawać punkty za to, że ktoś uzupełnia udawane treningi i ankietę
// poranną".
//
// ⛔ CO BYŁO ZEPSUTE: czytnik brał z kalendarza id, datę i segment, a wagę
// dawał rodzaj `sesja_z_dowodem` — czyli 20-minutowa mikrosesja ważyła tyle,
// co 90-minutowy trening klubowy. Do tego ankieta ważyła 1, a formularz 2,
// więc zawodnik wypełniający formularze wyprzedzał tego, który trenował.

/** ⛔ DECYZJA KUBY 17.08.2026, nie wynik badania. Granica między 1 a 2 punktem. */
export const PROG_DLUGOSCI_SESJI_MIN = 45;

/**
 * ⭐ JEDNOSTKA ODNIESIENIA ROZWOJU: 30 minut × RPE 6 = 180.
 * ⛔ DECYZJA PRODUKTOWA, nie wynik badania.
 *
 * ⭐ ZNALEZISKO PASA W4, ZMIERZONE: formuła `minuty × RPE ⁄ 180` odtwarza
 * 12 z 13 wag ustawionych przez Kubę ręcznie — mecz cały 4, połowa 2,
 * wejście 1, klubowy 90 min 3, własny 60 min 2, mikrosesja 1. Tabela wag
 * NIE JEST osobną decyzją: jest tą samą miarą policzoną z typowych wartości.
 *
 * ⭐ I DRUGIE: próg 45 minut nie jest arbitralny. 45 × 6 = 270, a 270 ⁄ 180
 * = 1,50 — dokładnie punkt zwrotny zaokrąglenia przy RPE 6, czyli przy
 * typowej intensywności treningu.
 */
export const JEDNOSTKA_ODNIESIENIA_ROZWOJU = 180;

/** ⛔ DECYZJA PRODUKTOWA, nie pomiar. Używana, gdy mecz nie ma zaplanowanej długości. */
export const DOMYSLNA_DLUGOSC_MECZU_MIN = 90;

/** ⛔ DECYZJA KUBY: cały mecz = 4, połowa = 2, wejście na 10 minut = 1. */
export const MAKS_PUNKTOW_ZA_MECZ = 4;

/** ⛔ DECYZJA KUBY: trening klubowy jest jednostką główną, niezależnie od długości. */
export const WAGA_ZOBOWIAZANIA = 3;

/**
 * ⭐ SKĄD WZIĘŁA SIĘ WAGA TEJ JEDNOSTKI. ⛔ Sama liczba bez pochodzenia to
 * dokładnie ten błąd, który pas W1 naprawia: po roku nie da się odróżnić
 * pomiaru od założenia (Z0), a różnicy nie da się POLICZYĆ, tylko podejrzewać.
 */
export type PochodzenieWagi =
  /** czas trwania podany przez zawodnika we wpisie wskazującym TĘ pozycję */
  | 'zmierzony'
  /** dowód zewnętrzny (trener), waga z rodzaju wydarzenia */
  | 'z_rodzaju'
  /**
   * ⛔ własna praca BEZ ZMIERZONEJ DŁUGOŚCI — deklaracja, nie pomiar.
   * ⚠️ Znaczy dokładnie tyle: „nie znam długości tej sesji", więc waga
   * nie ma pokrycia i spada do najniższej. NIE znaczy „zawodnik nic nie napisał".
   */
  | 'bez_dowodu'
  /** mecz z podanymi minutami na boisku */
  | 'z_minut_meczu'
  /** ⛔ mecz bez minut — tak samo nieudowodniony jak trening bez liczby */
  | 'minuty_nieznane'
  /** ⛔ `event_type` spoza CHECK-a bazy — TRZECIA WARTOŚĆ, nie „najniższa waga" (R5) */
  | 'nieznany_rodzaj'
  /**
   * ⭐ PLAN-D-W4 — waga policzona z PRAWDZIWYCH minut i PRAWDZIWEGO RPE
   * (`minuty × RPE × trafność ⁄ 180`). To jest najwyższy poziom pomiaru:
   * ani jedna liczba nie pochodzi z tabeli.
   */
  | 'zmierzony_srpe';

export type WagaJednostki = { punkty: number; pochodzenie: PochodzenieWagi };

/** Fakty o sesji, z których liczy się waga. ⛔ Zero tytułu — same kolumny (O84). */
export type FaktySesji = {
  eventType: string | null;
  source: string | null;
  maSesjeTrenera: boolean;
  /** `daily_logs.payload.duration_minutes` wpisu wskazującego TĘ pozycję. */
  minutyZmierzone: number | null;
  /** `calendar_events.planned_minutes`. */
  minutyZPlanu: number | null;
  /**
   * ⭐ PLAN-D-W4 — ciężkość podana przez zawodnika (0–10), z wpisu wskazującego
   * TĘ sesję. `null` = nie wiemy. ⛔ Nie zgadujemy jej tutaj: szacowanie RPE
   * należy do miary OBCIĄŻENIA, a rozwój liczymy wyłącznie z tego, co zmierzone.
   */
  rpeZmierzone?: number | null;
  /**
   * ⭐ PLAN-D-W4 — 1,0 albo 1,5 (`lib/zwrotObszaru.ts`). ⛔ NIGDY poniżej 1,0.
   * Nieznana trafność to 1,0, a nie kara.
   */
  trafnosc?: number;
};

function dodatniaLiczba(x: unknown): number | null {
  return typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : null;
}

function wagaZMinut(minuty: number): number {
  return minuty >= PROG_DLUGOSCI_SESJI_MIN ? 2 : 1;
}

/**
 * ⭐ WAGA SESJI. Trzy poziomy dowodu (O100) rozstrzygają, nie deklaracja.
 *
 * ⛔ DECYZJA C KUBY: zmierzony czas może wagę PODNIEŚĆ, NIGDY OBNIŻYĆ.
 * Gdyby przyznanie się do skróconego treningu kosztowało punkt, żaden zawodnik
 * nigdy nie podałby prawdziwej liczby — i wtedy zgniłaby także miara obciążenia,
 * która na tej liczbie stoi. ⛔ Kara jest za BRAK DOWODU, nie za NISKĄ LICZBĘ.
 */
export function wagaSesji(f: FaktySesji): WagaJednostki {
  const r = rozpoznajRodzajPozycji({
    idWydarzenia: 1,
    eventType: f.eventType,
    source: f.source,
    maSesjeTrenera: f.maSesjeTrenera === true,
  });

  const zmierzone = dodatniaLiczba(f.minutyZmierzone);
  const rpe = typeof f.rpeZmierzone === 'number' && Number.isFinite(f.rpeZmierzone)
    && f.rpeZmierzone > 0 && f.rpeZmierzone <= 10 ? f.rpeZmierzone : null;
  // ⛔ Trafność NIGDY poniżej 1,0 (decyzja Kuby 1A). Brak trafności to baza, nie kara.
  const trafnosc = typeof f.trafnosc === 'number' && Number.isFinite(f.trafnosc) && f.trafnosc >= TRAFNOSC_BAZOWA
    ? f.trafnosc : TRAFNOSC_BAZOWA;

  /**
   * ⭐ WARTOŚĆ Z POMIARU: `minuty × RPE × trafność ⁄ 180`. Zwraca `null`, gdy
   * brakuje którejkolwiek z dwóch liczb — ⛔ RPE nie jest tu zgadywane.
   */
  const zPomiaru = (zTrafnoscia: number): number | null =>
    zmierzone !== null && rpe !== null
      ? (zmierzone * rpe * zTrafnoscia) / JEDNOSTKA_ODNIESIENIA_ROZWOJU
      : null;

  if (!r.znany) {
    // ⛔ Nieznany rodzaj to TRZECIA WARTOŚĆ, a nie cicha najniższa waga (R5).
    return { punkty: 1 * trafnosc, pochodzenie: 'nieznany_rodzaj' };
  }

  if (r.rodzaj === 'zobowiazanie') {
    // ⭐ Dowód jest ZEWNĘTRZNY — założył to trener. Brak wpisu go nie kasuje.
    // ⛔ TRAFNOŚĆ ZAWSZE 1,0: zawodnik nie ma wpływu na treść treningu klubowego
    // ani meczu (decyzja Kuby 18.08.2026), więc premia go nie dotyczy.
    const srpe = zPomiaru(TRAFNOSC_BAZOWA);
    // ⛔ Pomiar może wagę PODNIEŚĆ, nigdy obniżyć (decyzja C): ciężki trening
    // klubowy 90 min × RPE 8 daje 4, a lekki 90 min × RPE 3 nadal daje 3.
    if (srpe !== null && srpe > WAGA_ZOBOWIAZANIA) {
      return { punkty: srpe, pochodzenie: 'zmierzony_srpe' };
    }
    return { punkty: WAGA_ZOBOWIAZANIA, pochodzenie: 'z_rodzaju' };
  }

  if (r.rodzaj === 'rzecz_produktu') {
    // ⛔ Ankieta i wgląd nie są pracą sportową zawodnika.
    return { punkty: 0, pochodzenie: 'z_rodzaju' };
  }

  // ── własna praca ──
  if (f.eventType === 'task') return { punkty: 1 * trafnosc, pochodzenie: 'z_rodzaju' };

  // ⛔ WARTOŚĆ AWARYJNA: tyle, ile da się powiedzieć bez pomiaru.
  const bazowa = zmierzone === null
    ? { punkty: 1 * trafnosc, pochodzenie: 'bez_dowodu' as PochodzenieWagi }
    : { punkty: wagaZMinut(zmierzone) * trafnosc, pochodzenie: 'zmierzony' as PochodzenieWagi };

  const srpe = zPomiaru(trafnosc);
  // ⛔ Decyzja C raz jeszcze: pomiar podnosi albo nic nie zmienia.
  if (srpe !== null && srpe > bazowa.punkty) return { punkty: srpe, pochodzenie: 'zmierzony_srpe' };
  return bazowa;
}

/**
 * ⭐ WAGA MECZU — jedna formuła zamiast tabeli przedziałów.
 *
 *   punkty = max(1, round(4 × minuty / długość meczu))
 *
 * Trzy kotwice Kuby: cały mecz → 4 · połowa meczu → 2 · wejście na 10 minut → 1.
 * ⭐ Działa dla meczu o DOWOLNEJ długości, więc trzynastolatek grający pełne
 * 60 minut dostaje 4, a nie karę za to, że jego mecz jest krótszy.
 *
 * ⛔ 0 minut na boisku = 0 punktów. Licznik nagradza wykonaną pracę (N1),
 * nie obecność. Mecz mimo to NIE ZNIKA z listy — patrz `MECZ_BEZ_MINUT_NA_BOISKU`.
 */
export function wagaMeczu(
  minutyNaBoisku: number | null,
  dlugoscMeczu: number | null,
  rpeMeczu?: number | null,
): WagaJednostki {
  const dlugosc = dodatniaLiczba(dlugoscMeczu) ?? DOMYSLNA_DLUGOSC_MECZU_MIN;
  if (typeof minutyNaBoisku !== 'number' || !Number.isFinite(minutyNaBoisku)) {
    // ⛔ Mecz bez minut jest deklaracją, tak samo jak trening bez liczby.
    return { punkty: 1, pochodzenie: 'minuty_nieznane' };
  }
  if (minutyNaBoisku <= 0) return { punkty: 0, pochodzenie: 'z_minut_meczu' };

  const rpe = typeof rpeMeczu === 'number' && Number.isFinite(rpeMeczu) && rpeMeczu > 0 && rpeMeczu <= 10
    ? rpeMeczu : null;
  if (rpe !== null) {
    // ⭐ Mecz z podanym RPE liczy się DOKŁADNIE TĄ SAMĄ formułą, co każda inna
    // sesja: `minuty × RPE ⁄ 180`. Żadnej osobnej reguły dla meczu nie ma.
    return {
      punkty: Math.min(MAKS_PUNKTOW_ZA_MECZ, (minutyNaBoisku * rpe) / JEDNOSTKA_ODNIESIENIA_ROZWOJU),
      pochodzenie: 'zmierzony_srpe',
    };
  }

  // ⭐ ZNALEZISKO PASA W4: `4 × minuty ⁄ długość` to NIE JEST osobna formuła.
  // Przy meczu 90-minutowym `4 × min ⁄ 90 = min ⁄ 22,5`, a `min × 8 ⁄ 180`
  // to również `min ⁄ 22,5`. ⛔ To jest sRPE z PRZYJĘTYM RPE 8 dla meczu —
  // czyli decyzja produktowa udająca dotąd osobną regułę. Zostaje jako
  // wartość awaryjna i od dziś jest tak nazwana.
  const surowe = (MAKS_PUNKTOW_ZA_MECZ * minutyNaBoisku) / dlugosc;
  return { punkty: Math.min(MAKS_PUNKTOW_ZA_MECZ, Math.max(1, surowe)), pochodzenie: 'z_minut_meczu' };
}

/**
 * ⭐ PLAN-D-W4 — ILE PUNKTÓW POKAZAĆ PRZY POJEDYNCZEJ SESJI.
 *
 * ⛔ TO JEST KONWENCJA WYŚWIETLANIA, NIE JEDNOSTKA SUMOWANIA. Licznik sumuje
 * wartości SUROWE i zaokrągla RAZ, na końcu.
 *
 * ⛔ POWÓD JEST ZMIERZONY, NIE TEORETYCZNY: przy zaokrąglaniu każdej sesji
 * osobno sesja 30 min × RPE 5 daje 0,83 bez trafności i 1,25 z trafnością —
 * a po zaokrągleniu OBIE dają 1. Premia za trafienie w wąskie gardło znikała
 * w całości, i to akurat przy sesjach Bloku Skupienia, czyli przy jedynej
 * pracy, która JEST celowana. To są „dane znikające po cichu".
 */
export function punktyRozwojuNaEkranie(surowe: number): number {
  if (typeof surowe !== 'number' || !Number.isFinite(surowe) || surowe <= 0) return 0;
  return Math.max(1, Math.round(surowe));
}

/**
 * ⚠️ BRZMIENIE — DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-W1).
 * ⛔ Zero punktów nie może wyglądać jak zero wydarzenia. Zawodnik, który
 * pojechał, rozgrzał się i nie wszedł, ma to zobaczyć jako FAKT — bez oceny
 * jego osoby i bez punktu pocieszenia.
 */
export const MECZ_BEZ_MINUT_NA_BOISKU =
  'Nie wszedłeś na boisko — ten mecz nie dokłada pracy do licznika. Mecz zostaje w Twojej historii.';

/** Miara, w której wyrażony jest próg. ⛔ Żadna z nich nie jest jednostką czasu. */
export type MiaraProgu = 'punkty' | 'odpowiedzi_kontrolne' | 'punkty_w_celu';

export type OdznakaId =
  | 'pierwsza'
  | 'dziesiec'
  | 'czterdziesci'
  | 'sto_piecdziesiat'
  | 'czterysta'
  | 'praca_w_celu';

export type Prog = {
  id: OdznakaId;
  /** ⚠️ BRZMIENIE — DO PRZEJRZENIA PRZEZ KUBĘ. */
  nazwa: string;
  /** ⚠️ BRZMIENIE — DO PRZEJRZENIA PRZEZ KUBĘ. Jedno zdanie: ZA JAKĄ PRACĘ. */
  zaJakaPrace: string;
  miara: MiaraProgu;
  /** ⛔ Musi być ≥ 1. Próg zerowy byłby nagrodą za samo pojawienie się. */
  prog: number;
  /** Dlaczego akurat tyle. ⛔ Nie jest to liczba z badania i nie udaje, że jest. */
  uzasadnienieProgu: string;
};

/**
 * ⭐ TABELA PROGÓW. **Wszystkie nazwy i wszystkie zdania: DO PRZEJRZENIA PRZEZ KUBĘ.**
 *
 * ⛔ Kolejność ma znaczenie: `nastepnyProg` bierze PIERWSZY niezdobyty z tej
 * listy, więc lista jest posortowana rosnąco w obrębie każdej miary.
 *
 * ⛔ NIE MA TU ANI JEDNEGO PROGU WYRAŻONEGO W DNIACH, TYGODNIACH ANI
 * W CZYMKOLWIEK, CO MIJA SAMO. Każdy próg da się pokonać wyłącznie pracą.
 */
/**
 * ⛔ NAZWA PROGU JEST BRZMIENIEM WIDOCZNYM DLA ZAWODNIKA — rysuje ją
 * `components/ArkuszeProfilu.tsx` jako tytuł w arkuszu „Odznaki i progi".
 *
 * ⭐ POPRAWIONE 18.08.2026 (pas F2 znalazł, sesja nawigująca naprawiła):
 * cztery progi mówiły „punktów PRACY" — słowo uśmiercone decyzją D4/O92 —
 * i stały tak na ekranie 2, pod nagłówkiem „Rozwój". Strażnik tego nie złapał,
 * bo pilnował `NAZWA_MIARY` w PODPISIE („Brakuje Ci N punktów rozwoju"),
 * a nie tytułu obok. ⛔ Strażnik pilnował zdania obok tego, które kłamało.
 */
export const PROGI: readonly Prog[] = [
  {
    id: 'pierwsza',
    nazwa: 'Pierwsza zapisana praca',
    zaJakaPrace: 'Za pierwszą rzecz, którą zrobiłeś i zapisałeś.',
    miara: 'punkty',
    prog: 1,
    uzasadnienieProgu: 'Najniższy możliwy próg z pokryciem w pracy. Zero byłoby nagrodą za wejście.',
  },
  {
    id: 'dziesiec',
    nazwa: '10 punktów rozwoju',
    zaJakaPrace: 'Za dziesięć punktów wykonanej i zapisanej pracy.',
    miara: 'punkty',
    prog: 10,
    uzasadnienieProgu: 'Niecały tydzień pracy zawodnika trenującego w klubie (13 pkt/tydzień). Decyzja Kuby 17.08.2026.',
  },
  {
    id: 'czterdziesci',
    nazwa: '40 punktów rozwoju',
    zaJakaPrace: 'Za czterdzieści punktów wykonanej i zapisanej pracy.',
    miara: 'punkty',
    prog: 40,
    uzasadnienieProgu: 'Około trzech tygodni pracy w klubie, dwóch przy własnej pracy domkniętej liczbą. Decyzja Kuby 17.08.2026.',
  },
  {
    id: 'sto_piecdziesiat',
    nazwa: '150 punktów rozwoju',
    zaJakaPrace: 'Za sto pięćdziesiąt punktów wykonanej i zapisanej pracy.',
    miara: 'punkty',
    prog: 150,
    uzasadnienieProgu: 'Około kwartału. Odstępy rosną, żeby kolejna odznaka nie przychodziła sama. Decyzja Kuby 17.08.2026.',
  },
  {
    id: 'czterysta',
    nazwa: '400 punktów rozwoju',
    zaJakaPrace: 'Za czterysta punktów wykonanej i zapisanej pracy.',
    miara: 'punkty',
    prog: 400,
    uzasadnienieProgu: 'Sezon pracy w klubie (31 tygodni) albo 17 tygodni, gdy zawodnik dokłada własną pracę i domyka ją liczbą. ⭐ Ta różnica JEST nagrodą za robienie więcej. Decyzja Kuby 17.08.2026.',
  },
  {
    id: 'praca_w_celu',
    nazwa: 'Praca nad swoim celem',
    // ⚠️ DO PRZEJRZENIA przez Kubę — brzmienie. Podmiana mechaniczna martwego słowa (D4/O92).
    zaJakaPrace: 'Za dziesięć punktów rozwoju w tym, co sam nazwałeś swoim celem.',
    miara: 'punkty_w_celu',
    prog: 10,
    uzasadnienieProgu: 'Tyle samo, co drugi próg objętości — żeby „praca nad celem" była porównywalnie trudna, a nie tańsza.',
  },
];

// ⛔ ODZNAKA „PRACA DOMKNIĘTA" (5 odpowiedzi kontrolnych) USUNIĘTA 17.08.2026,
// decyzja Kuby 1.3 A. ⚠️ Miara `odpowiedzi_kontrolne` ZOSTAJE liczona i zwracana —
// odznaka i miara to dwie różne rzeczy, a miara jest potrzebna jako oś JAKOŚCI.
// Wpis w `claude/REJESTR_UTRACONEGO_DOSTEPU.md`, pozycja 2.

// ═══════════════════════════════════════════════════════════════════
// 2. JEDNOSTKA PRACY I TRZY STANY WEJŚCIA
// ═══════════════════════════════════════════════════════════════════

/**
 * ⭐ DATA JEDNOSTKI PRACY — **TRZY WARTOŚCI, NIE DWIE** (R5, Z0).
 *
 * ⛔ Trzeci stan nie jest ozdobą. „Wiem, którego dnia ta praca została
 * wykonana" i „wiem tylko, kiedy powstał wiersz w bazie" to dwie różne rzeczy,
 * a podanie drugiej jako pierwszej jest podaniem prawdopodobnego jako pewnego.
 *
 *   `dzien_pracy`  — źródło ma kolumnę, której ZNACZENIEM jest dzień wykonanej
 *                    pracy: `session_verdicts.occurred_on`,
 *                    `calendar_events.scheduled_date`,
 *                    `focus_block_checkins.answered_at` (odpowiedź JEST pracą)
 *                    oraz `daily_logs.created_at` dla wpisu, którego pracą jest
 *                    sam wpis.
 *   `dzien_zapisu` — jedyna data, jaką źródło ma, mówi KIEDY POWSTAŁ WIERSZ,
 *                    a praca, którą ten wiersz opisuje, wydarzyła się wcześniej
 *                    i **nie ma gdzie tego zapisać**. ⚠️ Zmierzone 17.08.2026:
 *                    `match_contexts` nie ma kolumny z datą meczu, a
 *                    `daily_logs` nie ma kolumny z datą treningu (ani klucza
 *                    w `payload`). ⛔ NIE ZGADUJEMY daty — nazywamy ją po
 *                    imieniu i liczymy dalej, mówiąc wprost, czym ona jest.
 *   `nieznana`     — wiersz nie ma ŻADNEJ użytecznej daty. ⛔ To nie jest
 *                    „dzisiaj" i nie jest „dawno".
 */
export type DataPracy =
  | { rodzaj: 'dzien_pracy'; dzien: string }
  | { rodzaj: 'dzien_zapisu'; dzien: string }
  | { rodzaj: 'nieznana'; powod: string };

/** `YYYY-MM-DD` z dowolnego znacznika czasu, albo `null`, gdy się nie da. */
function dzienZe(x: unknown): string | null {
  if (typeof x !== 'string' || x.length < 10) return null;
  const d = x.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

/**
 * ⭐ JEDNOSTKA PRACY.
 *
 * ⛔ Pole `kiedy` istnieje WYŁĄCZNIE dla `lib/obciazenieOstatnichDni.ts`.
 * `policzNagrode` w tym pliku nie sięga po nie ani razu i nie ma prawa sięgnąć
 * — inaczej dorobek całkowity zacząłby zależeć od kalendarza.
 */
export type JednostkaPracy = {
  /**
   * Unikat jednostki. ⛔ Służy WYŁĄCZNIE do odsiania duplikatów — dwa odczyty
   * tego samego wiersza nie mają prawa policzyć się dwa razy. Klucz nie wchodzi
   * do arytmetyki i jego kształt nie ma znaczenia dla wyniku.
   */
  klucz: string;
  rodzaj: RodzajPracy;
  /**
   * ⭐ PLAN-D-W1 (O100) — waga TEJ jednostki, policzona z dowodu i długości.
   * ⛔ `policzNagrode` dodaje TO POLE, a nie `WAGI_PRACY[rodzaj]`. Tabela wag
   * jest wyłącznie wartością awaryjną dla jednostek, o których nie wiadomo nic.
   */
  punkty: number;
  /** ⭐ PLAN-D-W1 — skąd ta waga wyszła. Liczba bez pochodzenia kłamie (Z0). */
  pochodzenieWagi: PochodzenieWagi;
  /**
   * Segment, w którym ta praca leży. `null` znaczy „nie wiem, do czego ją
   * przypisać" — ⛔ NIE „do niczego". Praca bez segmentu liczy się do objętości
   * i nie liczy się do celu; nie znika.
   */
  segment: string | null;
  /**
   * Czy ta jednostka jest DOMKNIĘTA odpowiedzią (pomiar obciążenia, odpowiedź
   * kontrolna, wpis wskazujący konkretną sesję). ⭐ To jest oś JAKOŚCI i jest
   * z założenia węższa niż liczba wierszy.
   */
  zOdpowiedziaKontrolna: boolean;
  /**
   * ⭐ PLAN-D-L1 (D1) — kiedy ta praca została wykonana. ⛔ CZYTA TO WYŁĄCZNIE
   * `lib/obciazenieOstatnichDni.ts`. Zapadka strażnika pilnuje, że `policzNagrode`
   * nie czyta tego pola i nie przyjmuje żadnego parametru okna.
   */
  kiedy: DataPracy;
};

/**
 * ⭐ TRZY STANY ŹRÓDŁA, I TRZECI NIE JEST OZDOBĄ (R5).
 *   `jest`          — odczytałem; lista może być pusta i pusta znaczy „nic tam nie ma".
 *   `nie_odczytano` — odczyt padł. ⛔ TO NIE JEST ZERO PRACY.
 */
export type WejscieZrodla =
  | { rodzaj: 'jest'; jednostki: readonly JednostkaPracy[] }
  | { rodzaj: 'nie_odczytano'; powod: string };

/**
 * Wejście dla wołającego, który danego źródła w ogóle nie czyta. ⛔ NIE JEST
 * domyślnym „pusto" — jest jawnym zapisem, że tego mechanizmu tam nie ma,
 * i zachowuje się jak `nie_odczytano`, bo skutek jest ten sam: nie wiem.
 */
export function zrodloNieczytane(powod: string): WejscieZrodla {
  return { rodzaj: 'nie_odczytano', powod };
}

/**
 * ⭐ SEGMENTY, KTÓRE ZAWODNIK SAM NAZWAŁ SWOIM CELEM — i dlaczego to musi być
 * zbiór KOMPLETNY.
 *
 * ⛔ ZMIERZONE 15.08.2026 NA PRODUKCJI: `goals` ma 6 wierszy, z czego **2 mają
 * `status='completed'`**, i wiersze te NIE SĄ KASOWANE. Zawodnik
 * `0be298a2…` ma dziś cztery cele, w tym `wytrzymalosc` **domknięty**.
 * Odznaka policzona ze zbioru filtrowanego po `status='active'` **przepadłaby
 * w dniu domknięcia celu** — czyli licznik wróciłby do zera z powodu sukcesu.
 * To jest ten sam defekt co seria dni, tylko lepiej ukryty.
 *
 * Dlatego zbiór ma dwa stany, a nie jeden: wołający, który nie umie podać
 * kompletu, mówi to WPROST i odznaka nie powstaje — zamiast powstać i zniknąć.
 */
export type SegmentyCelow =
  | { rodzaj: 'pelne'; segmenty: ReadonlySet<string> }
  | { rodzaj: 'niepelne'; powod: string };

export type WejscieNagrody = {
  sesje: WejscieZrodla;
  dziennik: WejscieZrodla;
  odpowiedziKontrolne: WejscieZrodla;
  mecze: WejscieZrodla;
  segmentyCelow: SegmentyCelow;
};

// ═══════════════════════════════════════════════════════════════════
// 3. ⭐ CZYTNIKI — JEDYNE MIEJSCE, W KTÓRYM WIERSZ BAZY ZAMIENIA SIĘ W PRACĘ
// ═══════════════════════════════════════════════════════════════════
//
// ⭐ PLAN-D-L1 (D3/D4): W TYM PLIKU NIE MA JUŻ ŻADNEGO OKNA. Do 17.08.2026
// czytniki przyjmowały `ZasadyCzytania { oknoDni, dzis }` — punkt wpięcia
// mutacji, którego produkcja nigdy nie podawała. Po dołożeniu daty do jednostki
// (D1) było to DRUGIE miejsce, w którym dałoby się przyciąć dorobek oknem,
// a decyzja D4 brzmi: okna stoją w JEDNYM miejscu. Zostały tam, gdzie należą —
// w `lib/obciazenieOstatnichDni.ts`. Czytniki oddają WSZYSTKO, co dostały,
// i doklejają do każdej jednostki datę wraz z tym, CZYM ta data jest.

/** Wystąpienie z DOWODEM wykonania, tak jak rozstrzygnął je pas D1. */
export type WierszSesji = {
  idWydarzenia: number;
  /**
   * Dzień WYSTĄPIENIA sesji (`session_verdicts.occurred_on` albo
   * `calendar_events.scheduled_date`). ⚠️ Wchodzi do klucza i do pola `kiedy`.
   * ⛔ Nie wchodzi do arytmetyki dorobku.
   */
  dzien: string;
  /** Segment Bloku Skupienia, do którego należy ta sesja. `null` = nie wiadomo. */
  segment: string | null;
  /** Czy istnieje wpis w Dzienniku wskazujący DOKŁADNIE tę pozycję. */
  maWpisWDzienniku: boolean;
  /**
   * ⭐ PLAN-D-W1 — fakty, z których liczy się waga (O100). Wszystkie pola
   * są opcjonalne, bo czytnik może ich nie dostać; ⛔ brak faktów NIE ZNACZY
   * zera pracy, tylko wagę „bez dowodu" (1 punkt).
   */
  eventType?: string | null;
  source?: string | null;
  maSesjeTrenera?: boolean;
  minutyZmierzone?: number | null;
  minutyZPlanu?: number | null;
  /** ⭐ PLAN-D-W4 — ciężkość z wpisu wskazującego TĘ sesję. `null` = nie wiemy. */
  rpeZmierzone?: number | null;
  /** ⭐ PLAN-D-W4 — 1,0 albo 1,5. ⛔ Nigdy poniżej 1,0. */
  trafnosc?: number;
};

export function jednostkiZSesji(wiersze: readonly WierszSesji[]): JednostkaPracy[] {
  const out: JednostkaPracy[] = [];
  for (const w of wiersze) {
    if (!w || typeof w.idWydarzenia !== 'number' || !Number.isFinite(w.idWydarzenia)) continue;
    if (typeof w.dzien !== 'string' || w.dzien.length < 10) continue;
    const dzien = dzienZe(w.dzien);
    const waga = wagaSesji({
      eventType: w.eventType ?? null,
      source: w.source ?? null,
      maSesjeTrenera: w.maSesjeTrenera === true,
      minutyZmierzone: w.minutyZmierzone ?? null,
      minutyZPlanu: w.minutyZPlanu ?? null,
      rpeZmierzone: w.rpeZmierzone ?? null,
      trafnosc: w.trafnosc,
    });
    out.push({
      klucz: `sesja:${w.idWydarzenia}@${w.dzien.slice(0, 10)}`,
      rodzaj: 'sesja_z_dowodem',
      punkty: waga.punkty,
      pochodzenieWagi: waga.pochodzenie,
      segment: typeof w.segment === 'string' && w.segment.length > 0 ? w.segment : null,
      zOdpowiedziaKontrolna: w.maWpisWDzienniku === true,
      // ⭐ `occurred_on` / `scheduled_date` MÓWIĄ o dniu sesji, nie o dniu zapisu.
      kiedy: dzien === null
        ? { rodzaj: 'nieznana', powod: 'dzień wystąpienia nie jest datą' }
        : { rodzaj: 'dzien_pracy', dzien },
    });
  }
  return out;
}

export type WierszDziennika = {
  id: number;
  entry_type: string | null;
  /**
   * ⚠️ `daily_logs` NIE MA kolumny z dniem, którego wpis dotyczy — zmierzone
   * 17.08.2026 na `information_schema.columns` i na kluczach `payload`
   * (`sleep_quality`, `morning_fatigue`, `sleep_hours`, `mood_motivation`,
   * `duration_minutes`, `post_fatigue`, `rpe` — ani jednej daty).
   * To jest DATA POWSTANIA WIERSZA i tylko tym się staje w polu `kiedy`.
   */
  created_at: string | null;
  /** Surowy `payload`. Czytamy z niego wyłącznie obecność pomiaru obciążenia. */
  payload: unknown;
};

/**
 * ⭐ CO ODRÓŻNIA WPIS POTRENINGOWY OD PORANNEGO — i dlaczego liczymy to
 * z PAYLOADU, a nie z `entry_type`.
 *
 * `entry_type='post_training'` mówi, jaki formularz zawodnik otworzył.
 * Obecność `rpe` albo `duration_minutes` mówi, czy go WYPEŁNIŁ czymkolwiek,
 * co jest pomiarem. Pusty formularz potreningowy nie jest domkniętą pracą,
 * a wpis z RPE 6 i 90 minutami jest nią nawet wtedy, gdy ktoś wybrał inny typ.
 * ⛔ Liczymy to, co zawodnik ZAPISAŁ, a nie to, co KLIKNĄŁ.
 */
export function maPomiarObciazenia(payload: unknown): boolean {
  if (payload === null || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  const liczba = (x: unknown): boolean => typeof x === 'number' && Number.isFinite(x);
  return liczba(p.rpe) || liczba(p.duration_minutes);
}

export function jednostkiZDziennika(wiersze: readonly WierszDziennika[]): JednostkaPracy[] {
  const out: JednostkaPracy[] = [];
  for (const w of wiersze) {
    if (!w || typeof w.id !== 'number' || !Number.isFinite(w.id)) continue;
    const dzien = dzienZe(w.created_at);
    const zPomiarem = maPomiarObciazenia(w.payload);
    out.push({
      klucz: `dziennik:${w.id}`,
      rodzaj: zPomiarem ? 'wpis_potreningowy' : 'wpis_dziennika',
      // ⛔ ZERO punktów — decyzja Kuby 17.08.2026. Wpis potreningowy jest
      // DOWODEM sesji, nie osobną nagrodą (O100); ankieta poranna nie jest
      // pracą sportową. Jednostka zostaje, bo niesie `zOdpowiedziaKontrolna`
      // (oś jakości) i `kiedy` (miara obciążenia).
      punkty: 0,
      pochodzenieWagi: 'z_rodzaju',
      // ⛔ Dziennik nie niesie segmentu i nie udajemy, że niesie.
      segment: null,
      zOdpowiedziaKontrolna: zPomiarem,
      // ⭐ TA SAMA KOLUMNA, DWA RÓŻNE ZNACZENIA — i to nie jest niedopatrzenie.
      // Wpis poranny: pracą JEST wpis, więc dzień powstania wiersza to dzień
      // pracy co do znaku. Wpis potreningowy: pracą jest TRENING, a wiersz
      // powstał wtedy, kiedy zawodnik usiadł do formularza — czyli tego samego
      // dnia albo później, i nie ma czym tego rozstrzygnąć. ⛔ Zamiast zgadywać,
      // nazywamy to `dzien_zapisu` i niesiemy tę różnicę dalej (Z0).
      kiedy: dzien === null
        ? { rodzaj: 'nieznana', powod: 'wpis Dziennika bez daty powstania' }
        : { rodzaj: zPomiarem ? 'dzien_zapisu' : 'dzien_pracy', dzien },
    });
  }
  return out;
}

export type WierszOdpowiedziKontrolnej = {
  id: string;
  /** ⚠️ `null` znaczy „pytanie zadane, nieodpowiedziane" — i to NIE JEST praca. */
  answered_at: string | null;
  segment: string | null;
};

export function jednostkiZOdpowiedziKontrolnych(
  wiersze: readonly WierszOdpowiedziKontrolnej[],
): JednostkaPracy[] {
  const out: JednostkaPracy[] = [];
  for (const w of wiersze) {
    if (!w || typeof w.id !== 'string' || w.id.length === 0) continue;
    // ⛔ Samo ZADANIE pytania nie jest pracą zawodnika. Nagradzanie go byłoby
    // nagrodą za to, że produkt się odezwał — czyli za obecność (N1).
    if (typeof w.answered_at !== 'string' || w.answered_at.length === 0) continue;
    const dzien = dzienZe(w.answered_at);
    out.push({
      klucz: `kontrola:${w.id}`,
      rodzaj: 'odpowiedz_kontrolna',
      // ⛔ ZERO punktów — decyzja Kuby 17.08.2026 (O100).
      punkty: 0,
      pochodzenieWagi: 'z_rodzaju',
      segment: typeof w.segment === 'string' && w.segment.length > 0 ? w.segment : null,
      zOdpowiedziaKontrolna: true,
      // ⭐ Pracą JEST odpowiedź, a `answered_at` mówi, kiedy padła. Dzień pracy
      // co do znaku — nie zapisu o pracy wykonanej kiedy indziej.
      kiedy: dzien === null
        ? { rodzaj: 'nieznana', powod: 'odpowiedź kontrolna bez daty' }
        : { rodzaj: 'dzien_pracy', dzien },
    });
  }
  return out;
}

export type WierszMeczu = {
  id: number;
  /**
   * ⚠️ `match_contexts` NIE MA kolumny z datą meczu — zmierzone 17.08.2026 na
   * `information_schema.columns` (`id`, `user_id`, `game_type`, `own_score`,
   * `opponent_score`, `role`, `minutes_played`, `match_rpe`, `created_at`,
   * `self_rating`, `mental_state`, `free_note`, `position_played_today`,
   * `entered_recovery_state`, `demanding_conditions`). To jest data POWSTANIA
   * WIERSZA i tylko tym się staje w polu `kiedy`.
   */
  created_at: string | null;
  /**
   * ⭐ PLAN-D-W1 — `match_contexts.minutes_played`. Kolumna istniała od dawna
   * (CHECK 0–130) i była WYRZUCANA przez ten czytnik: dziesięciominutowe
   * wejście ważyło tyle, co pełne 90 minut. `null` = nie wiemy (R5).
   */
  minutes_played?: number | null;
  /**
   * ⭐ PLAN-D-W1 — długość CAŁEGO meczu (`calendar_events.planned_minutes`).
   * ⛔ To jest MIANOWNIK wagi. `null` → 90 minut, jako decyzja produktowa.
   */
  dlugoscMeczu?: number | null;
  /**
   * ⭐ PLAN-D-W4 — `match_contexts.match_rpe`. W bazie wypełnione w 2 z 2 wierszy,
   * czyli mecz jest dziś NAJBLIŻEJ pełnego pomiaru `minuty × RPE`.
   */
  match_rpe?: number | null;
};

export function jednostkiZMeczow(wiersze: readonly WierszMeczu[]): JednostkaPracy[] {
  const out: JednostkaPracy[] = [];
  for (const w of wiersze) {
    if (!w || typeof w.id !== 'number' || !Number.isFinite(w.id)) continue;
    const dzien = dzienZe(w.created_at);
    const waga = wagaMeczu(
      typeof w.minutes_played === 'number' ? w.minutes_played : null,
      typeof w.dlugoscMeczu === 'number' ? w.dlugoscMeczu : null,
      typeof w.match_rpe === 'number' ? w.match_rpe : null,
    );
    out.push({
      klucz: `mecz:${w.id}`,
      rodzaj: 'mecz',
      punkty: waga.punkty,
      pochodzenieWagi: waga.pochodzenie,
      segment: null,
      zOdpowiedziaKontrolna: false,
      // ⛔ Mecz odbył się kiedyś, a wiersz powstał, gdy zawodnik go zapisał.
      // Nie mamy czym tego rozróżnić, więc nie udajemy, że mamy (Z0).
      kiedy: dzien === null
        ? { rodzaj: 'nieznana', powod: 'zapisany mecz bez daty powstania wiersza' }
        : { rodzaj: 'dzien_zapisu', dzien },
    });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════
// 3b. ⭐ CO JEST DOWODEM WYKONANEJ SESJI — jedna kopia reguły, nie druga
// ═══════════════════════════════════════════════════════════════════
//
// ⛔ TA REGUŁA NIE MA PRAWA MIESZKAĆ NA EKRANIE. Gdyby `dzis.tsx` sam
// decydował, co jest dowodem, powstałaby druga kopia rozstrzygnięcia pasa D1
// — a pierwsza poprawka weszłaby do jednej z nich i oba miejsca wyglądałyby
// poprawnie. Dlatego stoi tutaj i jest objęta asercjami strażnika.
//
// TRZY DOWODY, KAŻDY Z INNEGO ŹRÓDŁA:
//   1. WERDYKT `odbylo_sie`, niewycofany — dowód wystawiony ŚWIADOMIE
//      i O KONKRETNYM WYSTĄPIENIU. Działa także dla reguły cyklicznej,
//      bo niesie `(id wydarzenia, data wystąpienia)`.
//   2. `status='completed'` na wierszu — dowód na WIERSZU.
//   3. wpis w Dzienniku wskazujący tę pozycję — dowód pośredni.
//
// ⛔ DOWODY 2 I 3 NIE OBOWIĄZUJĄ DLA REGUŁY CYKLICZNEJ i to nie jest
// ostrożność. Jeden wiersz reguły ma dziesięć wystąpień; `daily_logs`
// i `status` opisują WIERSZ. Policzenie ich znaczyłoby, że jeden wpis
// o wtorkowym treningu daje zawodnikowi pracę za KAŻDY wtorek w historii —
// czyli produkt policzyłby mu pracę, której nie wykonał. To jest dokładnie
// reguła 4 z `rozstrzygnijWykonanie` w `lib/wykonanieSesji.ts`.

export type WierszWydarzeniaDoNagrody = {
  id: number;
  scheduled_date: string | null;
  status: string | null;
  recurrence_rule: string | null;
  /** Blok Skupienia, z którego ta pozycja pochodzi — nośnik segmentu. */
  focus_block_id: string | null;
  /** ⭐ PLAN-D-W1 — kolumny, z których liczy się waga (O100). */
  event_type?: string | null;
  source?: string | null;
  coach_session_id?: string | null;
  planned_minutes?: number | null;
};

/**
 * ⭐ ŹRÓDŁO „SESJE Z DOWODEM" — gotowe wejście do `policzNagrode`.
 *
 * Trzy z czterech argumentów mają stan „nie odczytałem" i każdy z nich
 * przewraca całe źródło na `nie_odczytano`, bo bez niego suma byłaby MNIEJSZA
 * od prawdy — a to jest ten sam defekt, co licznik wracający do zera.
 *
 * ⚠️ CZWARTY, `segmentBloku`, JEST INNY I ŚWIADOMIE NIE BLOKUJE. Nieznany
 * segment odbiera pracy przynależność do celu, ale nie odbiera jej istnienia:
 * jednostka wchodzi z `segment: null`, czyli liczy się do objętości i nie
 * liczy się do „pracy nad celem". ⛔ Odwrotna decyzja kasowałaby wykonaną
 * pracę z powodu brakującego przypisania.
 */
export function zrodloSesji(args: {
  /** ⚠️ `null` = ODCZYT WYDARZEŃ SIĘ NIE UDAŁ, a nie „nic nie ma". */
  wydarzenia: readonly WierszWydarzeniaDoNagrody[] | null;
  werdykty: WejscieWerdyktow;
  /** ⚠️ `null` = ODCZYT DZIENNIKA SIĘ NIE UDAŁ. */
  wpisyDziennika: ReadonlySet<number> | null;
  /** `focus_block_id` → `segment_id`. `null` = nie znam mapy; NIE blokuje. */
  segmentBloku: ReadonlyMap<string, string> | null;
  /**
   * ⭐ PLAN-D-W1 — `calendar_events.id` → ZMIERZONA długość sesji w minutach,
   * z `daily_logs.payload.duration_minutes` wpisu wskazującego TĘ pozycję.
   * ⛔ Brak wpisu w mapie NIE BLOKUJE źródła — daje wagę „bez zmierzonej
   * długości" (1 punkt), zgodnie z O100.
   */
  minutyZWpisow?: ReadonlyMap<number, number> | null;
  /**
   * ⭐ PLAN-D-W4 — `calendar_events.id` → RPE z wpisu wskazującego TĘ pozycję.
   * Razem z minutami daje pomiar `minuty × RPE ⁄ 180`. ⛔ Brak nie blokuje.
   */
  rpeZWpisow?: ReadonlyMap<number, number> | null;
  /**
   * ⭐ PLAN-D-W4 — zwrot zwrotu obszarów tego zawodnika (`lib/zwrotObszaru.ts`).
   * ⛔ Brak rankingu NIE odbiera nikomu punktów: trafność spada wtedy do 1,0
   * dla całej pracy, czyli do bazy (decyzja Kuby 1A).
   */
  zwrot?: ZwrotObszarow | null;
}): WejscieZrodla {
  if (args.wydarzenia === null) {
    return zrodloNieczytane('nie odczytałem wydarzeń kalendarza');
  }
  if (args.werdykty.rodzaj === 'nie_odczytano') {
    return zrodloNieczytane(args.werdykty.powod);
  }
  if (args.wpisyDziennika === null) {
    return zrodloNieczytane('nie odczytałem powiązań wpisów Dziennika z sesjami');
  }

  const wpisy = args.wpisyDziennika;
  const minuty = args.minutyZWpisow ?? null;
  const minutyDla = (id: number): number | null => {
    if (minuty === null) return null;
    const m = minuty.get(id);
    return typeof m === 'number' && Number.isFinite(m) ? m : null;
  };
  const rpeMapa = args.rpeZWpisow ?? null;
  const rpeDla = (id: number): number | null => {
    if (rpeMapa === null) return null;
    const r = rpeMapa.get(id);
    return typeof r === 'number' && Number.isFinite(r) ? r : null;
  };
  const zwrot = args.zwrot ?? null;
  // ⭐ TRAFNOŚĆ LICZY SIĘ Z SEGMENTU POZYCJI — i TYLKO stąd.
  //
  // ⛔ ZNALEZISKO WŁASNEJ MUTACJI, 18.08.2026: stała tu druga bramka
  // („zewnętrzna praca nie dostaje premii"), a pierwsza siedzi w `wagaSesji`,
  // która dla zobowiązania oddaje płaskie 3 i trafności NIE MNOŻY W OGÓLE.
  // Mutacja kasująca tę bramkę NIE ZMIENIAŁA ANI JEDNEJ LICZBY — czyli był to
  // kod, który wygląda jak reguła i nigdy nie rozstrzyga (pas Y4).
  // ⛔ Reguła „klub i mecz zawsze 1,0" mieszka od teraz w JEDNYM miejscu:
  // w gałęzi `zobowiazanie` funkcji `wagaSesji` (O92).
  const trafnoscDla = (segment: string | null): number =>
    (zwrot === null ? TRAFNOSC_BAZOWA : trafnoscSesji({ zwrot, obszar: segment, zewnetrzna: false }));
  const segmentDla = (idBloku: string | null): string | null => {
    if (args.segmentBloku === null || typeof idBloku !== 'string' || idBloku.length === 0) return null;
    return args.segmentBloku.get(idBloku) ?? null;
  };

  const wiersze: WierszSesji[] = [];

  // ── DOWÓD 1: werdykt zawodnika. Wystąpienie, nie wiersz. ──
  // ⚠️ `rodzaj: 'brak'` (tabeli nie ma w bazie) to WIEDZA, nie niewiedza:
  // nie ma gdzie trzymać werdyktu, więc werdyktu nie ma. Ta sama gałąź,
  // co w `czytajWerdykty`.
  const segmentWydarzenia = new Map<number, string | null>();
  // ⭐ PLAN-D-W1 — fakty wagowe wydarzenia, dostępne przy obu drogach dowodu.
  const faktyWydarzenia = new Map<number, Pick<WierszSesji,
    'eventType' | 'source' | 'maSesjeTrenera' | 'minutyZPlanu'>>();
  const cykliczne = new Set<number>();
  for (const w of args.wydarzenia) {
    if (!w || typeof w.id !== 'number' || !Number.isFinite(w.id)) continue;
    segmentWydarzenia.set(w.id, segmentDla(w.focus_block_id));
    faktyWydarzenia.set(w.id, {
      eventType: w.event_type ?? null,
      source: w.source ?? null,
      maSesjeTrenera: typeof w.coach_session_id === 'string' && w.coach_session_id.length > 0,
      minutyZPlanu: typeof w.planned_minutes === 'number' ? w.planned_minutes : null,
    });
    if (typeof w.recurrence_rule === 'string' && w.recurrence_rule.length > 0) cykliczne.add(w.id);
  }
  if (args.werdykty.rodzaj === 'jest') {
    for (const w of args.werdykty.werdykty) {
      if (w.wycofany) continue;
      if (w.werdykt !== 'odbylo_sie') continue;
      wiersze.push({
        idWydarzenia: w.idWydarzenia,
        dzien: w.dzien,
        segment: segmentWydarzenia.get(w.idWydarzenia) ?? null,
        maWpisWDzienniku: wpisy.has(w.idWydarzenia),
        ...(faktyWydarzenia.get(w.idWydarzenia) ?? {}),
        minutyZmierzone: minutyDla(w.idWydarzenia),
        rpeZmierzone: rpeDla(w.idWydarzenia),
        trafnosc: trafnoscDla(segmentWydarzenia.get(w.idWydarzenia) ?? null),
      });
    }
  }

  // ── DOWODY 2 i 3: `completed` oraz wpis wskazujący pozycję. ──
  for (const w of args.wydarzenia) {
    if (!w || typeof w.id !== 'number' || !Number.isFinite(w.id)) continue;
    if (cykliczne.has(w.id)) continue;
    if (typeof w.scheduled_date !== 'string' || w.scheduled_date.length < 10) continue;
    const maWpis = wpisy.has(w.id);
    if (w.status !== 'completed' && !maWpis) continue;
    wiersze.push({
      idWydarzenia: w.id,
      dzien: w.scheduled_date,
      segment: segmentWydarzenia.get(w.id) ?? null,
      maWpisWDzienniku: maWpis,
      ...(faktyWydarzenia.get(w.id) ?? {}),
      minutyZmierzone: minutyDla(w.id),
      rpeZmierzone: rpeDla(w.id),
      trafnosc: trafnoscDla(segmentWydarzenia.get(w.id) ?? null),
    });
  }

  // ⛔ Duplikaty (werdykt + `completed` na tym samym wystąpieniu) odsiewa
  // `policzNagrode` po kluczu — tutaj nie ma potrzeby ich gonić.
  return { rodzaj: 'jest', jednostki: jednostkiZSesji(wiersze) };
}

// ═══════════════════════════════════════════════════════════════════
// 4. WYNIK
// ═══════════════════════════════════════════════════════════════════

export type OdznakaZdobyta = {
  id: OdznakaId;
  nazwa: string;
  /** ⭐ Jedno zdanie: ZA JAKĄ PRACĘ. Odznaka bez tego zdania jest naklejką. */
  zaJakaPrace: string;
  miara: MiaraProgu;
  prog: number;
  /** Ile zawodnik ma w tej mierze. ⛔ Zawsze ≥ `prog`. */
  osiagnieto: number;
};

export type NastepnyProg = {
  id: OdznakaId;
  nazwa: string;
  miara: MiaraProgu;
  prog: number;
  masz: number;
  /** ⭐ Ile PRACY brakuje. ⛔ Nigdy dni. Zawsze ≥ 1. */
  brakuje: number;
};

/** Odznaka, której NIE UMIEM policzyć — z powodem. ⛔ To nie jest „niezdobyta". */
export type BrakPomiaru = { id: OdznakaId; nazwa: string; powod: string };

export type NagrodaZaPrace =
  | {
      rodzaj: 'policzona';
      /** ⭐ Łączna wykonana praca. NIGDY nie maleje. */
      punkty: number;
      /** Ile rzeczy się na to złożyło. */
      jednostki: number;
      /** Oś jakości — ile z nich zostało domkniętych odpowiedzią. */
      odpowiedziKontrolne: number;
      /** Punkty w segmentach nazwanych celem. `null` = zbiór celów niepełny (R5). */
      punktyWCelu: number | null;
      odznaki: readonly OdznakaZdobyta[];
      /** `null`, gdy zdobyte są wszystkie policzalne progi. */
      nastepnyProg: NastepnyProg | null;
      /** ⭐ Progi, których nie umiem policzyć — z powodem. Nie milczą. */
      nieumiemPoliczyc: readonly BrakPomiaru[];
    }
  | {
      rodzaj: 'nie_policzona';
      /**
       * ⛔ ŚWIADOMIE BEZ POLA `punkty`. Gdyby tu było, dałoby się narysować
       * „0 punktów" — zdanie, które wygląda na pomiar i nim nie jest. Ten sam
       * wzorzec, co `brak_podstawy` w `lib/wykonanieSesji.ts`.
       */
      powod: string;
      nieodczytane: readonly string[];
    };

/**
 * ⛔ PUNKT WPIĘCIA MUTACJI. Produkcyjny wołający TEGO ARGUMENTU NIE PODAJE.
 */
export type ZasadyNagrody = {
  /** ⛔ Zawsze `false`. Gdy `true` — nieodczytane źródło liczy się jak puste. */
  brakWolnoUznacZaZero: boolean;
  /** ⛔ Zawsze `true`. Gdy `false` — ten sam wiersz liczy się wielokrotnie. */
  odsiewajDuplikaty: boolean;
  /** ⛔ Zawsze `false`. Gdy `true` — odznaka powstaje bez pokrycia w pracy. */
  progWolnoDacBezPracy: boolean;
  /** ⛔ Zawsze `false`. Gdy `true` — niepełny zbiór celów liczy się jak pełny. */
  niepelneCeleLiczaSieJakPelne: boolean;
};

export const ZASADY_NAGRODY_PRAWDZIWE: ZasadyNagrody = {
  brakWolnoUznacZaZero: false,
  odsiewajDuplikaty: true,
  progWolnoDacBezPracy: false,
  niepelneCeleLiczaSieJakPelne: false,
};

/**
 * ⭐ ILE PRACY WYKONAŁEŚ I CO CI Z TEGO PRZYSŁUGUJE.
 *
 * ── DLACZEGO JEDNO NIEODCZYTANE ŹRÓDŁO PRZEWRACA CAŁY WYNIK ────────
 * Bo liczba, która wychodzi z trzech źródeł zamiast czterech, jest MNIEJSZA
 * od tej samej liczby sprzed godziny — a licznik, który maleje przy awarii
 * sieci, kłamie zawodnikowi dokładnie tak samo jak licznik zerowany po
 * opuszczonym dniu. Wolę powiedzieć „nie udało mi się policzyć" niż podać
 * dolne ograniczenie jako sumę (Z0).
 * ⛔ To NIE JEST ostrożność kosztem funkcji: stan `nie_policzona` jest
 * ODRÓŻNIALNY od `policzona` z zerem i ekran rysuje dwa różne zdania.
 *
 * ⭐⛔ ZAPADKA D2 (PLAN-D-L1, 17.08.2026) — NAJWAŻNIEJSZE ZDANIE TEGO PLIKU.
 * Ta funkcja NIE PRZYJMUJE ŻADNEGO PARAMETRU OKNA i NIE CZYTA pola `kiedy`
 * z jednostek. Ani jednego razu, w żadnej gałęzi. Jednostki mają od 17.08 daty
 * i to jest w porządku — dopóki DOROBEK CAŁKOWITY ich nie widzi. Gdyby zaczął,
 * licznik zacząłby spadać po tygodniu przerwy, czyli karałby zawodnika za
 * kontuzję, chorobę i sesję egzaminacyjną — a to jest nagradzanie obecności
 * (N1), którego produkt sobie zakazuje. Pilnują tego dwie asercje strażnika:
 * jedna czyta ciało tej funkcji jako tekst, druga URUCHAMIA ten sam zestaw
 * jednostek w dwóch rozkładach w czasie i żąda tej samej liczby.
 */
export function policzNagrode(
  we: WejscieNagrody,
  zasady: ZasadyNagrody = ZASADY_NAGRODY_PRAWDZIWE,
): NagrodaZaPrace {
  const zrodla: readonly (readonly [string, WejscieZrodla])[] = [
    ['sesje z dowodem wykonania', we.sesje],
    ['wpisy w Dzienniku', we.dziennik],
    ['odpowiedzi kontrolne Bloku', we.odpowiedziKontrolne],
    ['mecze', we.mecze],
  ];

  const nieodczytane: string[] = [];
  for (const [nazwa, z] of zrodla) {
    if (z.rodzaj === 'nie_odczytano') nieodczytane.push(`${nazwa}: ${z.powod}`);
  }
  if (nieodczytane.length > 0 && !zasady.brakWolnoUznacZaZero) {
    return {
      rodzaj: 'nie_policzona',
      powod: nieodczytane.length === zrodla.length
        ? 'nie odczytałem żadnego źródła pracy'
        : `nie odczytałem ${nieodczytane.length} z ${zrodla.length} źródeł pracy`,
      nieodczytane,
    };
  }

  // ── Odsiew duplikatów. Ten sam wiersz przeczytany dwa razy to jedna praca. ──
  const widziane = new Set<string>();
  const jednostki: JednostkaPracy[] = [];
  for (const [, z] of zrodla) {
    if (z.rodzaj !== 'jest') continue;
    for (const j of z.jednostki) {
      if (!j || typeof j.klucz !== 'string' || j.klucz.length === 0) continue;
      if (!(j.rodzaj in WAGI_PRACY)) continue;
      if (zasady.odsiewajDuplikaty) {
        if (widziane.has(j.klucz)) continue;
        widziane.add(j.klucz);
      }
      jednostki.push(j);
    }
  }

  let punkty = 0;
  let odpowiedziKontrolne = 0;
  let punktyWCelu = 0;
  const celePelne = we.segmentyCelow.rodzaj === 'pelne' || zasady.niepelneCeleLiczaSieJakPelne;
  const segmentyCelu: ReadonlySet<string> = we.segmentyCelow.rodzaj === 'pelne'
    ? we.segmentyCelow.segmenty
    : new Set<string>();

  for (const j of jednostki) {
    // ⭐ PLAN-D-W1 (O100): waga jest WŁASNOŚCIĄ JEDNOSTKI, nie jej rodzaju.
    // ⛔ Jednostka bez policzonej wagi spada do wartości awaryjnej rodzaju —
    // nie do zera, bo zero znaczyłoby „tej pracy nie było".
    const waga = typeof j.punkty === 'number' && Number.isFinite(j.punkty)
      ? j.punkty
      : WAGI_PRACY[j.rodzaj];
    punkty += waga;
    if (j.zOdpowiedziaKontrolna) odpowiedziKontrolne += 1;
    if (celePelne && j.segment !== null && segmentyCelu.has(j.segment)) {
      punktyWCelu += waga;
    }
  }

  const wartosc = (m: MiaraProgu): number | null => {
    if (m === 'punkty') return punkty;
    if (m === 'odpowiedzi_kontrolne') return odpowiedziKontrolne;
    return celePelne ? punktyWCelu : null;
  };

  const odznaki: OdznakaZdobyta[] = [];
  const nieumiemPoliczyc: BrakPomiaru[] = [];
  let nastepnyProg: NastepnyProg | null = null;

  for (const p of PROGI) {
    const masz = wartosc(p.miara);
    if (masz === null) {
      nieumiemPoliczyc.push({
        id: p.id,
        nazwa: p.nazwa,
        powod: we.segmentyCelow.rodzaj === 'niepelne'
          ? we.segmentyCelow.powod
          : 'nie umiem policzyć tej miary',
      });
      continue;
    }
    // ⛔ TA LINIA JEST CAŁYM ZAKAZEM „NAGRODY BEZ PRACY". Nie ma tu warunku
    // o dacie, o wejściu do aplikacji ani o niczym, co mija samo.
    const zdobyta = zasady.progWolnoDacBezPracy ? true : masz >= p.prog;
    if (zdobyta) {
      odznaki.push({ id: p.id, nazwa: p.nazwa, zaJakaPrace: p.zaJakaPrace, miara: p.miara, prog: p.prog, osiagnieto: masz });
    } else if (nastepnyProg === null) {
      nastepnyProg = { id: p.id, nazwa: p.nazwa, miara: p.miara, prog: p.prog, masz, brakuje: p.prog - masz };
    }
  }

  // ⭐ PLAN-D-W4 — ZAOKRĄGLENIE NASTĘPUJE TU I TYLKO TU, na sumie wartości
  // surowych. ⛔ Zaokrąglanie po drodze zjadało premię za trafność.
  punkty = Math.round(punkty);
  punktyWCelu = Math.round(punktyWCelu);

  return {
    rodzaj: 'policzona',
    punkty,
    jednostki: jednostki.length,
    odpowiedziKontrolne,
    punktyWCelu: celePelne ? punktyWCelu : null,
    odznaki,
    nastepnyProg,
    nieumiemPoliczyc,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 5. ZDANIA DO KONSOLI — żeby dało się zdiagnozować nagrodę po fakcie
// ═══════════════════════════════════════════════════════════════════

export function opisNagrodyDoLogu(n: NagrodaZaPrace): string {
  if (n.rodzaj === 'nie_policzona') {
    return `nagroda za pracę: NIE POLICZONA — ${n.powod} [${n.nieodczytane.join(' | ')}]`;
  }
  const nast = n.nastepnyProg === null
    ? 'brak kolejnego progu'
    : `następny: ${n.nastepnyProg.id} (brakuje ${n.nastepnyProg.brakuje} w mierze ${n.nastepnyProg.miara})`;
  return `nagroda za pracę: ${n.punkty} pkt z ${n.jednostki} jednostek `
    + `· domkniętych ${n.odpowiedziKontrolne} · w celu ${n.punktyWCelu === null ? 'NIE WIEM' : n.punktyWCelu} `
    + `· odznak ${n.odznaki.length} · ${nast}`
    + (n.nieumiemPoliczyc.length > 0 ? ` · nie umiem policzyć: ${n.nieumiemPoliczyc.map((b) => b.id).join(',')}` : '');
}
