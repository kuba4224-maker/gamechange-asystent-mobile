// Natywny pasek zakładek "za darmo" przez Expo Router (patrz architektura
// 6.1) — pierwotnie 7 ekranów asystent_app.html w tej samej kolejności co
// nav w wersji webowej: Dziennik, Cele, Centrum Decyzji, Kalendarz, Profil,
// Diagnoza, Mecz.
//
// KROK 2 TORU 7 (30.07.2026, SESJA_START_UX_MOBILE_ONBOARDING_NAWIGACJA.md)
// — przebudowa nawigacji:
// 1) Nowa zakładka "Dziś" (app/(tabs)/dzis.tsx) DODANA na pierwszym miejscu
//    — nowy ekran domowy. Domyślne przekierowanie z app/index.tsx zmienione
//    na tę zakładkę.
// 2) Profil/Diagnoza/Mecz — rzadziej odwiedzany kontekst — schowane pod
//    zakładką "Więcej" (app/(tabs)/wiecej.tsx). Trasy zostają w pełni
//    dostępne, tylko `href: null` chowa przycisk z paska — to oficjalnie
//    rekomendowany przez Expo Router wzorzec na ekran "Więcej".
//
// JEDNA DROGA B2 08.08.2026 — "Centrum Decyzji" zeszła z paska do tras
// chowanych (najnowszy `training_focus` przeniósł się na ekran Dziś razem
// z przyciskami). Pasek: Dziś, Dziennik, Kalendarz, Cele, Więcej.
//
// ═══════════════════════════════════════════════════════════════════
// NAWIGACJA B3 08.08.2026 — CZTERY ZAKŁADKI, DOCELOWY UKŁAD
// (decyzja B8 + B12, claude/DECYZJE_PRODUKTOWE_07_08_2026.md)
//
//        Dziś  ·  Dziennik  ·  Mecz  ·  Ja
//
// CO SIĘ ZMIENIŁO I DLACZEGO KAŻDA POZYCJA TU STOI:
//
//  • **Mecz wychodzi z ukrycia.** `match_context_answers` to najcenniejsze
//    dane, jakie system zbiera — karmią silnik rekomendacji i meczowy wymiar
//    Gotowości. Ekran, który je zbiera, siedział pod „Więcej", czyli o dwa
//    dotknięcia od zawodnika, w sobotę wieczorem po meczu. Zakładka to jedyne
//    miejsce, z którego da się do niego trafić bez szukania.
//  • **Kalendarz wchłonięty przez Dziś.** Trasa `/kalendarz` żyje (`href: null`);
//    wejście: karta „Dziś w kalendarzu" na ekranie Dziś — lista pozycji dnia
//    otwiera pełny kalendarz, a osobny link „Dodaj wydarzenie →" wchodzi w
//    formularz również wtedy, gdy dziś nic nie ma. Ani jedna funkcja Kalendarza
//    nie zniknęła (formularz, cykliczne, nadchodzące, minione, anulowane).
//  • **Cele wchłonięte przez Dziś.** Trasa `/cele` żyje (`href: null`); wejścia:
//    hero Celu na Dziś (cały kafelek jest przyciskiem — to są „szczegóły Celu")
//    oraz pozycja „Cele" w zakładce „Ja" (tam mieszka historia celów). Cel
//    zostaje PIERWSZYM elementem ekranu Dziś — decyzja Kuby z 06.08.2026 jest
//    w mocy, spełniona taniej (B5).
//  • **„Więcej" znika.** To był rozdzielacz do listy linków, nie ekran.
//    Zastępuje go „Ja" (app/(tabs)/ja.tsx), który zaczyna się od czegoś, co
//    mówi zawodnikowi coś o NIM (skrót profilu z diagnozy), a dopiero pod tym
//    ma wejścia. Plik `wiecej.tsx` zostaje na dysku jako przekierowanie do
//    `/ja` — usunięcie pliku jest po stronie Kuby (sesja nie kasuje plików).
//  • **Trasy chowane zostają tym samym wzorcem co dotąd** (`href: null`):
//    kalendarz, cele, centrum-decyzji, profil, diagnoza, wiecej — a od
//    08.08.2026 także **biblioteka**. Nowego mechanizmu nawigacji nie
//    wprowadzamy.
//
// ⚠️ WAŻNE PRZY DOKŁADANIU EKRANU: Expo Router pokazuje w pasku KAŻDY plik
// z tego katalogu, także ten, którego tu nie wymieniono. Nowy plik w
// `app/(tabs)/` bez wpisu `href: null` poniżej pojawi się jako piąta zakładka.
//
// ═══════════════════════════════════════════════════════════════════
// ⭐⭐ PLAN-D-A1 08.2026 (18.08.2026) — DWIE ZAKŁADKI (A4)
//
//                      Dziś  ·  Profil
//
// DECYZJA KUBY (17/18.08.2026, makieta v3 „dwie miary"): produkt ma DWA
// ekrany. Wszystko inne wchodzi z nich — dotknięciem kafla, przyciskiem „+"
// albo wierszem w „Profilu".
//
// ⛔ KOLEJNOŚĆ TEJ ZMIANY BYŁA NIENEGOCJOWALNA: NAJPIERW WEJŚCIE ZASTĘPCZE,
// POTEM ZDJĘCIE ZAKŁADKI. Odwrotnie to jest cicha utrata dostępu. Dwa ekrany
// były o jedno wejście od zniknięcia:
//
//   • `mecz.tsx` (961 linii) miał 18.08 rano **ZERO `router.push('/mecz')`
//     w całym repozytorium** — jedynym wejściem była ta zakładka. Razem z nim
//     zniknęłoby jedyne wejście do `match_contexts` i `match_context_answers`.
//     ⭐ WEJŚCIE ZASTĘPCZE: arkusz „powiedz więcej o tym meczu", otwierany
//     z kafla meczu na „Dziś" (`app/(tabs)/dzis.tsx`, `MECZ_WIECEJ_OTWORZ`).
//   • `dziennik.tsx` był osiągalny WYŁĄCZNIE przez `TRASA_POZYCJI` — czyli
//     tylko wtedy, gdy ranker postawił pozycję Dziennika na PIERWSZYM miejscu
//     kolejki. Wejście, które bywa, nie jest wejściem.
//     ⭐ WEJŚCIE ZASTĘPCZE: kafel „Zapisz dzisiejszy wpis" w „Twoim dniu".
//
// ⛔ `centrum-decyzji` ZOSTAJE BEZ WEJŚCIA Z „DZIŚ" — to jest świadoma decyzja
// Kuby z 18.08, nie przeoczenie. Pilnuje tego zapadka w `lib/nawigacja.selftest.ts`,
// żeby cisza nie zamieniła się w przypadek.
//
// ⭐ „Ja" ZMIENIA WYŁĄCZNIE NAPIS na „Profil". ⛔ Nazwa TRASY zostaje `ja`,
// bo `app/(tabs)/wiecej.tsx` przekierowuje na `/ja` i przemianowanie zerwałoby
// to wejście. Zawartość ekranu buduje pas A3, nie ten pas.
//
// ⭐ OD 18.08 PILNUJE TEGO ASERCJA, NIE KOMENTARZ: `lib/nawigacja.selftest.ts`
// sprawdza, że widocznych zakładek są DOKŁADNIE DWIE, że każdy plik z tego
// katalogu ma wpis, i że każda chowana trasa ma wejście spoza własnego pliku.
// ⛔ Komentarz nie jest asercją — ten plik miał ostrzeżenie o piątej zakładce
// od 08.08.2026 i przez dziesięć dni nikt nie sprawdził, czy ono obowiązuje.
// ═══════════════════════════════════════════════════════════════════
import { Tabs } from 'expo-router';
// W1: 08.2026 — pasek dostaje język wizualny z koncepcji identyfikacji
// (komponent 6): aktywna zakładka = WYPEŁNIONA ikona + kolor marki,
// nieaktywne = kontur w ink3, tło = bg, obrys = line. Zero badge'ów (B7).
// Struktura czterech zakładek i trasy chowane — NIETKNIĘTE.
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

// W1: ikona w dwóch stanach — wypełniona (aktywna) / kontur (nieaktywna).
function tabIcon(filled: keyof typeof Ionicons.glyphMap, outline: keyof typeof Ionicons.glyphMap) {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? filled : outline} color={color} size={size} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // ═══════════════════════════════════════════════════════════
        // ⭐ PAS W1 18.08.2026 — DEFEKT P-2: „aktywna zakładka i ikony
        // paska są CZERWONE". Makieta (`.tabs div.on`) rysuje aktywną
        // zakładkę jako CIEMNY TEKST NA `--tint`, a nie jako barwę.
        //
        // ⛔ To nie była wina samego paska: brał `colors.brand`, a `brand`
        // był do 18.08 koralem #EE5342. Token jest już zielenią marki
        // (patrz `constants/theme.ts`), więc czerwień zniknęłaby i tak —
        // ale makieta NIE MALUJE aktywnej zakładki kolorem marki. Aktywna
        // rzecz ma tu DWA nośniki: wypełniona ikona (była) i podkład
        // `--tint` pod pozycją (dochodzi teraz). ⭐ Barwa jest trzecim
        // nośnikiem, nie jedynym — i dlatego wolno jej być zwykłym `--ink`.
        // ═══════════════════════════════════════════════════════════
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarActiveBackgroundColor: colors.surfaceElevated,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarItemStyle: { borderRadius: 8, marginHorizontal: 8, marginVertical: 6 },
      }}
    >
      {/* ── ⭐ DWIE ZAKŁADKI WIDOCZNE (A4, 18.08.2026) ────────────── */}
      <Tabs.Screen name="dzis" options={{ title: 'Dziś', tabBarIcon: tabIcon('today', 'today-outline') }} />
      {/* ⭐ NAPIS „Profil", TRASA nadal `ja` — patrz nagłówek pliku. */}
      <Tabs.Screen name="ja" options={{ title: 'Profil', tabBarIcon: tabIcon('person', 'person-outline') }} />

      {/* ── Trasy chowane: żyją, otwierane z linku ─────────────────
          ⭐ 18.08.2026 doszły DWIE: `dziennik` i `mecz`. Obie mają wejście
          z ekranu „Dziś" i obie je dostały ZANIM straciły zakładkę. */}
      {/* ⛔ Wejście: kafel „Zapisz dzisiejszy wpis" w „Twoim dniu" (dzis.tsx). */}
      <Tabs.Screen name="dziennik" options={{ title: 'Dziennik', href: null }} />
      {/* ⛔⛔ Wejście: arkusz „powiedz więcej o tym meczu" z kafla meczu
          (dzis.tsx). Bez niego ten wpis kasuje 961 linii i jedyną drogę
          do `match_contexts` — sprawdza to `lib/nawigacja.selftest.ts`. */}
      <Tabs.Screen name="mecz" options={{ title: 'Mecz', href: null }} />
      <Tabs.Screen name="kalendarz" options={{ title: 'Kalendarz', href: null }} />
      {/* PLAN-D-A 08.2026 — nazwa TRASY (`cele`) zostaje, zmienia się tylko
          tytuł widoczny dla zawodnika. */}
      <Tabs.Screen name="cele" options={{ title: 'Wąskie gardła', href: null }} />
      <Tabs.Screen name="centrum-decyzji" options={{ title: 'Wszystkie rekomendacje', href: null }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', href: null }} />
      <Tabs.Screen name="diagnoza" options={{ title: 'Diagnoza', href: null }} />
      {/* ZMIANA OBRAZU B5 08.08.2026 — biblioteka materiałów wyprowadziła się
          z ekranu „Ja" na własną trasę (pozycja M2 audytu po bloku 4: „Ja"
          miało 2,26-2,64 ekranu scrolla, przy własnej mierze 2,5). Wejście:
          nazwana pozycja „Twoje materiały" w sekcji „Twój rozwój" w „Ja",
          tym samym wzorcem co „Wynik diagnozy" i „Cele".
          ⚠️ TEN WPIS JEST OBOWIĄZKOWY, nie ozdobny — bez niego
          `app/(tabs)/biblioteka.tsx` pojawiłby się jako PIĄTA ZAKŁADKA i
          skasował decyzję B8. Patrz uwaga na końcu nagłówka pliku. */}
      <Tabs.Screen name="biblioteka" options={{ title: 'Twoje materiały', href: null }} />
      {/* NAWIGACJA B3 08.08.2026 — „Więcej" nie jest już ekranem produktu;
          plik przekierowuje do `/ja`. Wpis MUSI tu zostać, dopóki plik leży
          w katalogu — bez niego wróciłby jako piąta zakładka (patrz uwaga
          w nagłówku pliku). */}
      <Tabs.Screen name="wiecej" options={{ title: 'Więcej', href: null }} />
    </Tabs>
  );
}
