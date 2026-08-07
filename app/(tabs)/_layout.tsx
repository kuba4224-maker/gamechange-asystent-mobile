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
//    kalendarz, cele, centrum-decyzji, profil, diagnoza, wiecej. Nowego
//    mechanizmu nawigacji nie wprowadzamy.
//
// ⚠️ WAŻNE PRZY DOKŁADANIU EKRANU: Expo Router pokazuje w pasku KAŻDY plik
// z tego katalogu, także ten, którego tu nie wymieniono. Nowy plik w
// `app/(tabs)/` bez wpisu `href: null` poniżej pojawi się jako piąta zakładka.
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      {/* ── Cztery zakładki widoczne ─────────────────────────────── */}
      <Tabs.Screen name="dzis" options={{ title: 'Dziś' }} />
      <Tabs.Screen name="dziennik" options={{ title: 'Dziennik' }} />
      <Tabs.Screen name="mecz" options={{ title: 'Mecz' }} />
      <Tabs.Screen name="ja" options={{ title: 'Ja' }} />

      {/* ── Trasy chowane: żyją, otwierane z linku ───────────────── */}
      <Tabs.Screen name="kalendarz" options={{ title: 'Kalendarz', href: null }} />
      <Tabs.Screen name="cele" options={{ title: 'Cele', href: null }} />
      <Tabs.Screen name="centrum-decyzji" options={{ title: 'Wszystkie rekomendacje', href: null }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', href: null }} />
      <Tabs.Screen name="diagnoza" options={{ title: 'Diagnoza', href: null }} />
      {/* NAWIGACJA B3 08.08.2026 — „Więcej" nie jest już ekranem produktu;
          plik przekierowuje do `/ja`. Wpis MUSI tu zostać, dopóki plik leży
          w katalogu — bez niego wróciłby jako piąta zakładka (patrz uwaga
          w nagłówku pliku). */}
      <Tabs.Screen name="wiecej" options={{ title: 'Więcej', href: null }} />
    </Tabs>
  );
}
