// PLAN-D-E 08.2026 (11.08.2026) — NOWY PLIK. PUNKT POMOCY.
//
// To nie jest funkcja produktu. To jest obowiązek: do 11.08.2026 zawodnik nie
// miał w aplikacji ŻADNEJ drogi do człowieka, gdy dzieje się coś poważnego.
//
// Podstawa i pełne uzasadnienie każdego z wymagań niżej:
// `claude/R2a_SCIEZKA_ESKALACJI_KRYZYS_11_08_2026.md`.
// Brzmienie ekranu prawdy — PRZYJĘTE PRZEZ KUBĘ 11.08.2026, nie wolno go
// skracać ani „poprawiać stylistycznie". Treść żyje w `lib/labels.ts`.
//
// ── PIĘĆ WYMAGAŃ, KTÓRYCH NIE WOLNO ZŁAMAĆ ─────────────────────────────
//
// 1. NIE URUCHAMIA GO ŻADNE WYKRYCIE. Jest zawsze dostępny i zawsze taki sam.
//    Automatyczne klasyfikatory ryzyka samobójczego mają PPV 6–17% (przegląd
//    53 badań, PLOS Medicine 2025) — od 5 do 25 fałszywych alarmów na jedno
//    trafienie. Zakaz 14 z kontraktu budowy.
//
// 2. NIE ZAPISUJE ŻADNEGO ZDARZENIA. Dotknięcie tego przycisku nie tworzy
//    wiersza w bazie i nie zmienia niczego w koncie zawodnika. W tym pliku
//    NIE MA I NIE MOŻE SIĘ POJAWIĆ import `supabase`. W chwili, w której ten
//    przycisk zaczyna cokolwiek zmieniać, przestaje być bezpieczny do dotknięcia.
//    ⚠️ Jedyny zapis, jaki tu istnieje, to lokalna flaga „ekran prawdy już był"
//    (AsyncStorage, urządzenie zawodnika). Nie wychodzi z telefonu, nie jest
//    powiązana z kontem i nie zapala się od dotknięcia przycisku pomocy —
//    tylko od pierwszego uruchomienia.
//
// 3. NIE WYSYŁA POWIADOMIEŃ. Nigdy. Ani rodzicowi, ani trenerowi, ani nam.
//    34,4% nastolatków nie ujawnia myśli samobójczych rodzicom właśnie
//    z obawy przed reakcją; 60% monitorowanych uczniów przestaje pisać prawdę.
//    Produkt, który obiecuje donieść, przestaje być produktem, w którym
//    dziecko pisze prawdę — a taki nie ochroni nikogo poza nami.
//
// 4. NUMERY SĄ KLIKALNE. Nastolatek o 23:00 nie przepisuje numeru z ekranu.
//
// 5. EKRAN PRAWDY POKAZUJE SIĘ RAZ PRZY PIERWSZYM WEJŚCIU, potem jest stale
//    dostępny. Konsensus Delphi (Bailey i in. 2024, 49 ekspertów): trzeba
//    z góry i przejrzyście zakomunikować, kto zostanie powiadomiony i kiedy.
//    Produkt, który sprawia wrażenie, że ktoś patrzy, tworzy fałszywe
//    poleganie — dziecko czeka na reakcję, która nigdy nie nadejdzie.
//
// ── GDZIE SIĘ WCHODZI — DECYZJA KUBY Z 12.08.2026 ─────────────────────
// TEN KOMPONENT NIE RYSUJE ŻADNEGO PRZYCISKU NA EKRANACH PRODUKTU.
// Pierwsza wersja miała pływającą pigułkę w prawym dolnym rogu, na każdym
// ekranie. Kuba obejrzał ją na telefonie i zdecydował: „przycisk musi w ogóle
// zniknąć z tych ekranów, nie ma dla niego miejsca tam, gdzie są główne rzeczy
// w apce". Decyzja jest jego — brzmienia i miejsce rzeczy widocznych dla
// zawodnika należą do niego.
//
// Co z tego zostaje tutaj: ekran prawdy przy pierwszym uruchomieniu, sam modal
// i JEDNO wejście — nazwany wiersz „Potrzebuję pomocy" w sekcji „Pomoc" na dole
// zakładki „Ja", który woła `otworzPunktPomocy()`.
//
// ⚠️ KONSEKWENCJA DO ZAPISANIA, nie do przemilczenia: R2a warstwa pierwsza
// mówiła „dostępny z KAŻDEGO ekranu, tak jak przycisk SOS w Wysie", bo wartość
// tego punktu polega na braku nawigacji o 23:00. Od tej decyzji zawodnik piszący
// notatkę w Dzienniku ma do niego trzy dotknięcia, nie jedno. To jest świadomy
// koszt, nie przeoczenie — patrz raport E, sekcja „wymaga decyzji".
//
// ── KIERUNEK BŁĘDU PRZY NIEDZIAŁAJĄCEJ PAMIĘCI LOKALNEJ ────────────────
// Gdy odczyt flagi się nie uda, ekran prawdy POKAZUJE SIĘ. Błąd w tę stronę
// znaczy „zawodnik zobaczył ten ekran drugi raz". Błąd w drugą stronę znaczy
// „zawodnik nigdy nie dowiedział się, że nikt nie czyta jego wpisów".
// To nie są koszty tej samej wagi.
import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, radii, spacing, minTouchHeight } from '../constants/theme';
import {
  POMOC_TYTUL,
  POMOC_PRAWDA,
  POMOC_KANALY,
  POMOC_ZAMKNIJ,
  POMOC_STOPKA,
} from '../lib/labels';

/**
 * Klucz lokalny, wersjonowany. Zmiana brzmienia ekranu prawdy = nowy numer
 * wersji, żeby zawodnik zobaczył NOWĄ treść raz jeszcze. Stara flaga zostaje
 * i nikomu nie przeszkadza.
 */
const KLUCZ_PRAWDA_WIDZIANA = 'gc_punkt_pomocy_prawda_v1';

/**
 * PLAN-D-E 08.2026 — jedno wejście do TEGO SAMEGO modala z drugiego miejsca
 * w appce (nazwany wiersz na dole „Ja").
 *
 * ⚠️ Świadomie NIE drugi egzemplarz komponentu. Dwa zamontowane `Modal`
 * potrafią się na iOS zablokować nawzajem, a dwa `useEffect` czytające flagę
 * „ekran prawdy już był" to wyścig. Jeden montaż (w `app/_layout.tsx`),
 * jeden modal, a stąd tylko prośba o otwarcie.
 */
let otworzZewnetrznie: (() => void) | null = null;

/** Otwiera punkt pomocy z dowolnego miejsca. Nic nie zapisuje. */
export function otworzPunktPomocy(): void {
  otworzZewnetrznie?.();
}

export default function PunktPomocy() {
  const [otwarty, setOtwarty] = useState(false);

  // Rejestracja jedynego openera. Sprzątana przy odmontowaniu, żeby nie
  // trzymać wskaźnika na martwy komponent.
  useEffect(() => {
    otworzZewnetrznie = () => setOtwarty(true);
    return () => { otworzZewnetrznie = null; };
  }, []);

  // Ekran prawdy przy pierwszym uruchomieniu. Świadomie BEZ zapisu do bazy:
  // to jest informacja o działaniu produktu, nie zdarzenie o zawodniku.
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KLUCZ_PRAWDA_WIDZIANA)
      .then((v) => {
        if (!mounted) return;
        if (v !== '1') {
          setOtwarty(true);
          AsyncStorage.setItem(KLUCZ_PRAWDA_WIDZIANA, '1').catch(() => {});
        }
      })
      .catch(() => {
        // Nie wiem, czy widział → pokazuję. Patrz „kierunek błędu" w nagłówku.
        if (mounted) setOtwarty(true);
      });
    return () => { mounted = false; };
  }, []);

  // Nieudane otwarcie NIE jest ciszą: zawodnik widzi numer na ekranie i może
  // go przepisać, a my nie udajemy, że coś się stało.
  const otworz = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {});
  }, []);

  // ⚠️ ZERO ELEMENTÓW NA EKRANIE PRODUKTU. Komponent rysuje wyłącznie modal,
  // a ten jest niewidoczny, dopóki ktoś nie zawoła `otworzPunktPomocy()`
  // albo dopóki nie jest to pierwsze uruchomienie. Nie zajmuje miejsca,
  // nie przechwytuje dotknięć, nie zmienia układu żadnej zakładki.
  return (
    <>
      <Modal
        visible={otwarty}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setOtwarty(false)}
      >
        <SafeAreaView style={styles.sheet} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <Text style={styles.title}>{POMOC_TYTUL}</Text>

            {/* EKRAN PRAWDY — brzmienie przyjęte przez Kubę 11.08.2026.
                Stoi NAD numerami świadomie: zawodnik ma najpierw wiedzieć,
                jak to działa, a dopiero potem dzwonić. */}
            <View style={styles.prawdaBox}>
              <Text style={styles.prawda}>{POMOC_PRAWDA}</Text>
            </View>

            {POMOC_KANALY.map((k) => (
              <View key={k.numer} style={styles.kanal}>
                <Text style={styles.kanalNumer}>{k.numer}</Text>
                <Text style={styles.kanalOpis}>{k.opis}</Text>
                <View style={styles.akcje}>
                  <TouchableOpacity
                    style={styles.akcja}
                    onPress={() => otworz(k.tel)}
                    accessibilityRole="button"
                    accessibilityLabel={`Zadzwoń ${k.numer}`}
                  >
                    <Text style={styles.akcjaText}>Zadzwoń</Text>
                  </TouchableOpacity>
                  {k.czat ? (
                    <TouchableOpacity
                      style={styles.akcja}
                      onPress={() => otworz(k.czat as string)}
                      accessibilityRole="button"
                      accessibilityLabel={`Otwórz czat ${k.czatLabel ?? ''}`}
                    >
                      <Text style={styles.akcjaText}>{k.czatLabel ?? 'Czat'}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))}

            <Text style={styles.stopka}>{POMOC_STOPKA}</Text>

            <TouchableOpacity style={styles.zamknij} onPress={() => setOtwarty(false)}>
              <Text style={styles.zamknijText}>{POMOC_ZAMKNIJ}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 26, color: colors.textPrimary, marginBottom: spacing.md },
  prawdaBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: spacing.lg,
  },
  prawda: { ...typography.body, fontSize: 15, lineHeight: 23, color: colors.textPrimary },

  kanal: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  kanalNumer: { ...typography.display, fontSize: 24, color: colors.textPrimary, marginBottom: 4 },
  kanalOpis: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginBottom: 12 },
  akcje: { flexDirection: 'row', gap: 10 },
  akcja: {
    minHeight: minTouchHeight,
    paddingHorizontal: 18,
    borderRadius: radii.sm,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  akcjaText: { ...typography.bodySemiBold, fontSize: 14, color: colors.white },

  stopka: { ...typography.body, fontSize: 12, lineHeight: 18, color: colors.textTertiary, marginTop: spacing.md },
  zamknij: { marginTop: spacing.lg, minHeight: minTouchHeight, alignItems: 'center', justifyContent: 'center' },
  zamknijText: { ...typography.bodyMedium, fontSize: 14, color: colors.textSecondary, textDecorationLine: 'underline' },
});
