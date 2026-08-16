// PLAN-D-B2 08.2026 (14.08.2026) — NOWY PLIK. Zadanie B2.3.
//
// JEDNA KOPIA WIERSZA KOLEJKI, DWIE GŁĘBOKOŚCI.
//
// ═════════════════════════════════════════════════════════════════════
// PO CO TEN PLIK ISTNIEJE
//
// `lib/kolejkaPodania.ts` (pas B1) ustala JEDNĄ kolejność dla trzech widoków:
// „Dziś", „Tydzień" i „Moje zadania". Gdyby każdy z nich rysował pozycję po
// swojemu, kolejność miałaby jedno źródło, a WYGLĄD trzy — i za pół roku trzy
// ekrany mówiłyby o tej samej pozycji trzy różne rzeczy. Ten komponent jest
// jedyną kopią rysowania pozycji; C1 i C2 mają go użyć, nie przepisać.
//
// ── DWIE GŁĘBOKOŚCI, NIE DWA EKRANY (zasada podania, P0) ─────────────
//   głębokość 0 (PODANE, 0 dotknięć): `co` · `dlaczego` · `ile zajmie`
//   głębokość 1 (ROZWINIĘCIE, 1 dotknięcie): dochodzi „skąd to wiemy"
//
// ⚠️ ROZWINIĘCIE NIE OPUSZCZA EKRANU. Wysłanie zawodnika na inny ekran po to,
// żeby zobaczył, skąd wiemy — to jest dokładnie ten schowek, który zasada
// podania (P0) likwiduje.
//
// ── CZTERY ZAKAZY W RYSOWANIU, każdy z powodem (polecenie B2 §7) ─────
//  1. ⛔ `dlaczego === null` → część ZNIKA W CAŁOŚCI. Nie „bo tak trzeba",
//     nie myślnik. Zmyślone uzasadnienie brzmi wiarygodnie i dlatego jest
//     GORSZE niż jego brak (Z0).
//  2. ⛔ `ileZajmieSekund === null` → pole znika. Nie „0 s", nie „~1 min":
//     „nie wiemy, ile to zajmie" to nie jest „zajmie zero".
//  3. ⛔ ANI `waga`, ANI `skladnikiWagi` nie wychodzą do zawodnika. Liczba 740
//     nic mu nie mówi i zaprasza do porównywania się (N3).
//  4. ⛔ `podniesioneRecznie === true` NIE KASUJE `kubelekSystemowy`: zawodnik
//     ma prawo decydować I ma prawo wiedzieć, co system o tym sądzi (M1, M2).
//
// ⛔ `skadToWiemy.idWiersza` NIE JEST RYSOWANY NIGDY — to identyfikator rekordu,
// zero wartości dla zawodnika (kontrakt B1 §8.6).
//
// ── DLACZEGO STAN ROZWINIĘCIA SIEDZI TUTAJ, A NIE W EKRANIE ──────────
// Bo jest własnością JEDNEGO WIERSZA, nie ekranu. Trzymany w `dzis.tsx`
// wymagałby, żeby ekran wiedział, która pozycja jest otwarta — czyli żeby znów
// coś o pozycjach rozstrzygał. Ekran ma wyłącznie oddać listę z rankera.
// ═════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, minTouchHeight } from '../constants/theme';
import type { PozycjaKolejki, Kubelek } from '../lib/kolejkaPodania';

/** Znacznik dla Kuby i dla strażnika. Nie usuwać do czasu zatwierdzenia brzmień. */
export const BRZMIENIE_DO_PRZEJRZENIA = 'DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-B2, 14.08.2026)';

// ─────────────────────────────────────────────────────────────────────
// BRZMIENIA — ⚠️ WSZYSTKIE DO PRZEJRZENIA PRZEZ KUBĘ
// ─────────────────────────────────────────────────────────────────────
// Kontrakt B1 §8.3 mówi wprost: „Mapa `klucz` → zdanie należy do B2/C2 — to
// jest tekst dla zawodnika". Oddaję kształt i pierwszą wersję słów; ostateczne
// brzmienie należy do Kuby.

export const POKAZ_SKAD = 'Skąd to wiemy';
export const UKRYJ_SKAD = 'Ukryj';

/**
 * Maszynowy klucz śladu → zdanie dla zawodnika.
 *
 * ⚠️ CELOWO NIEPEŁNA. Klucza, którego tu nie ma (m.in. `nieznane` — „baza wie
 * więcej niż ta wersja appki"), NIE ZGADUJEMY: wiersz „skąd to wiemy" się
 * wtedy nie rysuje. Zgadnięte brzmienie jest gorsze niż jego brak (Z0),
 * a wiersz „nie wiemy, skąd to wiemy" jest hałasem, nie informacją.
 */
export const SKAD_TO_WIEMY: Record<string, string> = {
  player: 'Ty to dodałeś.',
  calendar: 'Z Twojego kalendarza.',
  focus_block: 'Odblokowane w Twoim Bloku Skupienia.',
  blok: 'Z Twojego Bloku Skupienia.',
  journal: 'Z Twojego Dziennika.',
  profile: 'Z Twojego profilu.',
  system: 'To wstawił system, nie Ty.',
  rekomendacja: 'Z Twojej rekomendacji na ten tydzień.',
  podpowiedz: 'Z materiałów Gamechange.',
  zaproszenie: 'Nie masz jeszcze zaplanowanej pracy w Bloku.',
};

/** Nazwy kubełków. Wychodzą WYŁĄCZNIE przy ręcznym podniesieniu — patrz zakaz 4. */
export const KUBELEK_ETYKIETA: Record<Kubelek, string> = {
  teraz: 'Teraz',
  w_tym_tygodniu: 'W tym tygodniu',
  kiedys: 'Kiedyś',
};

export const PODNIESIONE_PRZEZ_CIEBIE = 'Podniosłeś to do „Teraz".';
export const SYSTEM_PROPONOWAL = 'System proponował: ';

// ⚠️ DO PRZEJRZENIA — B2
// ⭐ PAS B2 16.08.2026 — LICZNIK ZWINIĘTYCH POWTÓRZEŃ.
// Ranker (`lib/kolejkaPodania.ts#zwinPowtorzenia`) scala pozycje o tym samym
// rodzaju i tym samym zdaniu w JEDEN wiersz. ⛔ Wiersz, który tego nie mówi,
// jest UKRYCIEM, nie porządkiem (Z0): zawodnik z dwunastoma sesjami w Bloku
// zobaczyłby jedną i miałby prawo sądzić, że tylko tyle ma zaplanowane.
export const POWTORZENIE_PRZED = 'To samo powtarza się jeszcze ';
export const POWTORZENIE_RAZ = ' raz.';
export const POWTORZENIE_RAZY = ' razy.';

/**
 * „Ile jeszcze razy" — z `pozycja.ileRazem`, czyli Z RANKERA, nigdy z długości
 * czegokolwiek, co ekran ma pod ręką.
 *
 * ⚠️ `ileRazem` LICZY WIERSZ, NA KTÓRYM STOI. Zawodnik czyta jedno zdanie
 * i pyta, ile TAKICH SAMYCH jeszcze przed nim — więc wypisujemy `ileRazem − 1`.
 * ⛔ `1` (i cokolwiek mniejszego) oddaje `null` i wiersz się nie rysuje: „to samo
 * powtarza się jeszcze 0 razy" jest hałasem, nie informacją.
 */
export function opiszPowtorzenie(ileRazem: number): string | null {
  if (!Number.isFinite(ileRazem)) return null;
  const pozostale = Math.floor(ileRazem) - 1;
  if (pozostale < 1) return null;
  return POWTORZENIE_PRZED + String(pozostale) + (pozostale === 1 ? POWTORZENIE_RAZ : POWTORZENIE_RAZY);
}

/**
 * „Ile zajmie" — bez odmiany przez przypadki, świadomie.
 * ⚠️ `null` NIE JEST ZEREM: przy braku danych ta funkcja oddaje `null`, a wiersz
 * się nie rysuje. „30 sekund" wypisane komuś, komu nikt czasu nie zmierzył,
 * jest zmyśleniem tak samo jak zmyślone uzasadnienie.
 */
export function opiszCzas(sekundy: number | null): string | null {
  if (sekundy === null) return null;
  if (!Number.isFinite(sekundy) || sekundy <= 0) return null;
  if (sekundy < 60) return `${Math.round(sekundy)} s`;
  return `${Math.round(sekundy / 60)} min`;
}

/**
 * Termin pozycji jako data słowna. ⚠️ `null` na wejściu znaczy „bez terminu"
 * i jest POPRAWNYM stanem — wtedy nic się nie rysuje. Data nieczytelna też
 * oddaje `null`: „2026-13-45" wypisane zawodnikowi jest gorsze niż jej brak.
 */
export function opiszTermin(iso: string | null): string | null {
  if (iso === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
}

export type PozycjaKolejkiCardProps = {
  pozycja: PozycjaKolejki;
  /**
   * Dzisiejsza data ('YYYY-MM-DD'). Służy DOKŁADNIE JEDNEJ rzeczy: żeby przy
   * pozycji na dziś nie pisać „14 sierpnia" — to jest ekran „Dziś", więc data
   * dnia dzisiejszego nic nie wnosi. `null` = nie wiem, który jest dzień,
   * i wtedy rysuję termin przy każdej pozycji, która go ma.
   *
   * ⚠️ POWÓD, DLA KTÓREGO TERMIN W OGÓLE TU JEST — zmierzone 14.08.2026 na
   * danych produkcyjnych: kolejka wydaje DWIE pozycje kalendarza o IDENTYCZNEJ
   * treści („Blok Skupienia: Bieg ciągły w strefie tlenowej", 15 i 20 sierpnia).
   * Bez terminu zawodnik widzi dwa takie same wiersze i nie ma jak ich odróżnić.
   */
  dzis?: string | null;
  /**
   * Pierwsza pozycja widoku. Dwie rzeczy naraz, obie z P0:
   *  • startuje ROZWINIĘTA — rzecz najważniejsza ma być PODANA, a nie schowana
   *    za dotknięciem;
   *  • nie rysuje kreski u góry, bo stoi tuż pod nagłówkiem karty.
   */
  pierwsza?: boolean;
  /**
   * Czy TEN komponent rysuje część „dlaczego".
   *
   * ⚠️ `false` PODAJE WYŁĄCZNIE PIERWSZA POZYCJA na „Dziś" — i to jest jedyny
   * wyjątek w całym pliku, więc stoi tu wprost. Powód: pierwsza pozycja JEST
   * jedną odpowiedzią pasa T, a ta ma na ekranie trzy NAZWANE części
   * („Co dziś zrobić" · „Dlaczego akurat to" · „Co to zmieni", WG-14 i WG-15).
   * Nagłówek środkowej części należy do ekranu, bo trzecia część
   * („co to zmieni") nie jest polem pozycji kolejki i ranker jej nie zna —
   * gdyby środkowa wyszła stąd, a trzecia z ekranu, trzy części miałyby dwóch
   * rysowników i rozjechałyby się przy pierwszej zmianie.
   * ⛔ Zakaz 1 obowiązuje tak samo po obu stronach: `dlaczego === null`
   * znaczy „nie mam uzasadnienia, którego bym nie zmyślił" i część znika.
   */
  pokazacDlaczego?: boolean;
  /**
   * Ciało pozycji, gdy treść niesie inny, już istniejący komponent — dziś
   * wyłącznie karta rekomendacji. ⚠️ To NIE jest drugi producent: miejsce tej
   * pozycji w kolejności ustala ranker, tak samo jak każdej innej.
   */
  slot?: ReactNode;
  onPress?: () => void;
};

export default function PozycjaKolejkiCard({
  pozycja, pierwsza = false, pokazacDlaczego = true, dzis = null, slot, onPress,
}: PozycjaKolejkiCardProps) {
  const [rozwinieta, setRozwinieta] = useState(pierwsza);

  const milczy = pozycja.milczy !== null;
  const czas = opiszCzas(pozycja.ileZajmieSekund);
  const skad = SKAD_TO_WIEMY[pozycja.skadToWiemy.klucz];
  const termin = pozycja.termin !== null && pozycja.termin !== dzis
    ? opiszTermin(pozycja.termin)
    : null;
  // ⭐ PAS B2 — liczba scalonych powtórzeń. `null` przy pozycji pojedynczej.
  const powtorzenie = opiszPowtorzenie(pozycja.ileRazem);

  return (
    <View style={[styles.pozycja, pierwsza && styles.pozycjaPierwsza, milczy && styles.pozycjaMilczaca]}>
      {/* ── GŁĘBOKOŚĆ 0: CO ─────────────────────────────────────────── */}
      {/* Wiersz jednolinijkowy, chyba że treść niesie `slot` (rekomendacja). */}
      {slot ?? (
        <TouchableOpacity
          disabled={!onPress}
          onPress={onPress}
          accessibilityRole={onPress ? 'button' : undefined}
        >
          <Text style={[styles.co, pierwsza && styles.coPierwsza, milczy && styles.tekstMilczacy]}>
            {pozycja.co}
            {/* ⚠️ Godzina WYŁĄCZNIE wtedy, gdy zawodnik ją podał (D10).
                `null` → brak tagu. Nie '' i nie '—'. */}
            {pozycja.godzina !== null ? <Text style={styles.godzina}>{'  ·  ' + pozycja.godzina}</Text> : null}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── GŁĘBOKOŚĆ 0: DLACZEGO ───────────────────────────────────── */}
      {/* ⛔ ZAKAZ 1. `null` → część znika w całości. */}
      {pokazacDlaczego && pozycja.dlaczego !== null ? (
        <Text style={[styles.dlaczego, milczy && styles.tekstMilczacy]}>{pozycja.dlaczego}</Text>
      ) : null}

      {/* ── GŁĘBOKOŚĆ 0: ILE ZAJMIE ─────────────────────────────────── */}
      {/* ⛔ ZAKAZ 2. `null` → pole znika. Nigdy „0 s". */}
      {/* ⛔ Termin i „ile zajmie" stoją w JEDNEJ linii i każde z nich potrafi
          zniknąć osobno. `null` znaczy „bez terminu" / „nie wiemy, ile zajmie" —
          nigdy „dziś" i nigdy „0 s". */}
      {czas !== null || termin !== null ? (
        <Text style={styles.czas}>
          {[termin, czas].filter((x) => x !== null).join('  ·  ')}
        </Text>
      ) : null}

      {/* ── ⭐ PAS B2: ILE TAKICH SAMYCH RZECZY JEST W TYM JEDNYM WIERSZU ── */}
      {/* ⛔ Wiersz rysuje się WYŁĄCZNIE przy zwiniętej pozycji (`ileRazem > 1`).
          Napis pochodzi ze stałych tego pliku przez `opiszPowtorzenie` — ⛔ ani
          jednej kopii wpisanej wprost w JSX, ani liczby policzonej tutaj. */}
      {powtorzenie !== null ? (
        <Text style={[styles.powtorzenie, milczy && styles.tekstMilczacy]}>{powtorzenie}</Text>
      ) : null}

      {/* ── POZYCJA WSTRZYMANA: WIDOCZNA, WYSZARZONA, Z POWODEM ─────── */}
      {/* WG-24. ⛔ Nie usuwamy jej z listy — milczenie bez podanego powodu
          wygląda dla zawodnika jak awaria, a bez warunku powrotu jest wyrokiem. */}
      {pozycja.milczy !== null ? (
        <View style={styles.milczenie}>
          <Text style={styles.milczeniePowod}>{pozycja.milczy.powod}</Text>
          <Text style={styles.milczenieWarunek}>{pozycja.milczy.warunekPowrotu}</Text>
        </View>
      ) : null}

      {/* ── RĘCZNE PODNIESIENIE ─────────────────────────────────────── */}
      {/* ⛔ ZAKAZ 4. Oba naraz: decyzja zawodnika I zdanie systemu (M1, M2). */}
      {pozycja.podniesioneRecznie ? (
        <Text style={styles.kubelki}>
          {PODNIESIONE_PRZEZ_CIEBIE}
          {'  '}
          <Text style={styles.kubelekSystemowy}>
            {SYSTEM_PROPONOWAL + KUBELEK_ETYKIETA[pozycja.kubelekSystemowy]}
          </Text>
        </Text>
      ) : null}

      {/* ── GŁĘBOKOŚĆ 1: SKĄD TO WIEMY ──────────────────────────────── */}
      {/* JEDNO dotknięcie i NIE opuszcza ekranu (P0). Przełącznik rysuje się
          wyłącznie wtedy, gdy mamy dla tego klucza zdanie — patrz komentarz
          przy `SKAD_TO_WIEMY`. */}
      {skad !== undefined ? (
        <>
          <TouchableOpacity
            style={styles.przelacznik}
            onPress={() => setRozwinieta((x) => !x)}
            accessibilityRole="button"
          >
            <Text style={styles.przelacznikTekst}>{rozwinieta ? UKRYJ_SKAD : POKAZ_SKAD}</Text>
          </TouchableOpacity>
          {rozwinieta ? <Text style={styles.skad}>{skad}</Text> : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pozycja: {
    marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  // WG-24 — „wyszarzona" jest tu jedyną rzeczą, jaką robimy z milczeniem.
  // ⛔ Nie `display: none`, nie skrócenie do jednej linii: pozycja ma być
  // WIDOCZNA razem z powodem.
  pozycjaMilczaca: { opacity: 0.55 },
  pozycjaPierwsza: { marginTop: 0, paddingTop: 0, borderTopWidth: 0 },
  co: { ...typography.bodySemiBold, fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  // Pierwsza pozycja jest odpowiedzią na pytanie, z którym zawodnik wchodzi na
  // ekran — te same wartości co `odpowiedzTresc` w dzis.tsx sprzed tej rundy.
  coPierwsza: { fontSize: 16, lineHeight: 23 },

  tekstMilczacy: { color: colors.textSecondary },
  godzina: { ...typography.bodyMedium, fontSize: 13, color: colors.brand },
  dlaczego: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: 4 },
  czas: { ...typography.bodyMedium, fontSize: 12, color: colors.textTertiary, marginTop: 4 },
  // ⭐ PAS B2 — ta sama waga co „ile zajmie": to jest fakt o planie, nie ostrzeżenie.
  powtorzenie: { ...typography.bodyMedium, fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  milczenie: { marginTop: 8 },
  milczeniePowod: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  milczenieWarunek: { ...typography.body, fontSize: 12, lineHeight: 18, color: colors.textTertiary, marginTop: 2 },
  kubelki: { ...typography.bodyMedium, fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  kubelekSystemowy: { ...typography.body, fontSize: 12, color: colors.textTertiary },
  przelacznik: { minHeight: minTouchHeight, justifyContent: 'center' },
  przelacznikTekst: { ...typography.bodyMedium, fontSize: 12, color: colors.brand },
  skad: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginBottom: 6 },
});
