// JEDNA DROGA B2 08.08.2026 — NOWY PLIK. Jedno źródło nazw dla całej appki.
//
// POWÓD: te same 13 nazw segmentów leżały dotąd w PIĘCIU miejscach
// (`SEG_LABELS` w dzis.tsx, cele.tsx, kalendarz.tsx, mecz.tsx oraz
// `SEGMENT_LABELS` w components/diagnosisProfile.ts), a 17 nazw części ciała
// w TRZECH (dziennik.tsx, mecz.tsx, profil.tsx). Każda kopia to okazja, żeby
// jedna nazwa rozjechała się z resztą — a zawodnik zobaczyłby wtedy Cel pod
// jedną nazwą, a wynik diagnozy pod inną. Blok B1 „jedna droga, jeden
// słownik" (claude/KREGOSLUP_PRODUKTU_I_DROGA_07_08_2026.md).
//
// TO JEST PRZENIESIENIE, NIE ZMIANA. Wszystkie wartości poniżej są identyczne
// co do znaku z tym, co było w plikach źródłowych — sprawdzone maszynowo
// (porównanie zestawów przed usunięciem kopii). Ani jedna nazwa nie została
// zmieniona, dodana ani usunięta.
//
// USTALENIA, KTÓRE STOJĄ ZA TĄ TREŚCIĄ (raport zwrotny B, runda 1, sekcja 11):
//  • Kolejność `SEGMENT_ORDER` = `public.segments.display_order` 1–13,
//    sprawdzone na żywo w Supabase 07.08.2026. Identyczna z `SEGS`
//    w `gamechange-diagnoza/index.html`.
//  • Baza NIE rozstrzyga nazewnictwa — `public.segments` nie ma kolumny
//    z nazwą. Zestaw pełnych słów (Title Case) to decyzja appki; skróty
//    w `index.html` ('TECH. FUND.') są artefaktem szerokości kolumny tabeli
//    webowej, nie decyzją nazewniczą.
//  • Segment `mental` — konflikt rozstrzygnięty. Patrz niżej, przy tej nazwie.

// ─────────────────────────────────────────────────────────────
// NAWIGACJA B3 08.08.2026 — RENAME `mental` → „Odwaga w grze" (decyzja A1,
// claude/DECYZJE_PRODUKTOWE_07_08_2026.md)
//
// Do 07.08.2026 appka mówiła „Stan Mentalny", a dwie z trzech map w
// `gamechange-diagnoza/index.html` — „ODWAGA W GRZE". To był jedyny prawdziwy
// konflikt znaczeniowy w systemie: zawodnik widział ten sam obszar pod dwiema
// nazwami i nie miał jak wiedzieć, że to jedno i to samo. Kuba rozstrzygnął na
// rzecz „Odwagi w grze" — nazwa mówi, co się dzieje NA BOISKU, a nie jak się
// nazywa dziedzina wiedzy. To jest cały test 15-latka (decyzja A10).
//
// W pasie B (`Asystent Gamechange/`) to była DOKŁADNIE JEDNA linia — sprawdzone
// przeszukaniem wszystkich plików `.ts`/`.tsx`/`.js`/`.json`. Poza nią fraza
// „Stan Mentalny" występuje już tylko w komentarzach (tu i w
// `components/diagnosisProfile.ts`, wiersz 315 — przykład w opisie działania
// funkcji, nie tekst dla zawodnika).
//
// ZNALEZIONE PRZY OKAZJI, NIE ZMIENIONE (poza zakresem, zgłoszone w raporcie):
// `app/(tabs)/mecz.tsx` ma etykietę suwaka „Stan mentalny / pewność siebie
// (0-10)". To NIE jest ta sama rzecz — to samoocena po meczu zapisywana do
// `match_contexts.mental_state`, osobne pole, nie segment diagnozy. Zbieżność
// słów jest jednak myląca teraz, gdy segment nazywa się inaczej. Do decyzji.
//
// POZA PASEM B ta sama zmiana musi wejść w `index.html` (`SEG_ORDER`) i
// `coach.html` — inaczej wraca ten sam konflikt, tylko odwrócony.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// PRAKTYKA-EKRAN B6 08.08.2026 — FORMA KANONICZNA NAZW: MAŁA LITERA
// (decyzja Kuby z 08.08.2026)
//
// Do dziś appka mobilna pisała cztery nazwy Title Case'em („Technika
// Fundamentalna"), a `coach.html`, `asystent_app.html`, e-maile i pushe —
// małą literą. Zawodnik i trener widzieli więc ten sam obszar zapisany na dwa
// sposoby; nie był to konflikt znaczeniowy jak przy `mental` (A1), ale był to
// rozjazd, którego nikt nie umiał uzasadnić.
//
// OD 08.08.2026 FORMĄ KANONICZNĄ JEST MAŁA LITERA — czyli zapis zgodny
// z resztą systemu, a nie z tą jedną appką. Zmienione dokładnie cztery:
//   techFund     'Technika Fundamentalna'  → 'Technika fundamentalna'
//   techSpec     'Technika Specjalistyczna'→ 'Technika specjalistyczna'
//   tolerancja   'Tolerancja (Obciążeń)'   → 'Tolerancja obciążeń'
//   decyzja      'Szybkość Decyzji'        → 'Szybkość decyzji'
//
// ⚠️ PRZY `tolerancja` ZNIKA TAKŻE NAWIAS. To jest więcej niż zmiana wielkości
// litery i jest świadome: docelowy zapis podany w decyzji brzmi „Tolerancja
// obciążeń", a nawias był artefaktem tego, że nazwa segmentu bywała skracana
// do samego słowa „Tolerancja". Odnotowane, żeby nikt nie uznał tego za
// literówkę przy przepisywaniu.
//
// CZEGO TA ZMIANA NIE DOTYKA — i dlaczego:
//   • KLUCZY (`techFund`, `techSpec`, `tolerancja`, `decyzja`) — to są ID
//     w bazie (`public.segments`, `diagnostics.scores`, `goals.segment_id`).
//     Zmiana klucza to migracja, nie etykieta.
//   • „Odwaga w grze" — to osobna decyzja (A1) i osobna nazwa własna; wielka
//     litera jest tu na początku zdania, nie w środku.
//   • pozostałych dziewięciu nazw — one już były jednowyrazowe albo zgodne.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// PLAN-D-A 08.2026 — SŁOWNIK TRZECH POZIOMÓW
// (decyzja Kuby, claude/DECYZJA_SLOWNIK_I_SPEC_ZMIANY_10_08_2026.md)
//
// Do 10.08.2026 produkt mówił „Cel" na dwie różne rzeczy naraz: na kierunek
// na lata (`player_profiles.goal_direction`) i na wiersz w `goals`, który
// żyje miesiące. Trzeci poziom — `focus_blocks` — nazywał się „Blok
// Skupienia". Zawodnik widział więc jedno słowo w dwóch znaczeniach i jedną
// rzecz pod nazwą, której nikt nie używa w rozmowie.
//
//   CEL           lata           jeden          player_profiles.goal_direction
//   WĄSKIE GARDŁO miesiące       kilka          goals
//   BLOK          4–8 tygodni    jeden/segment  focus_blocks
//
// ⚠️ TO JEST WYŁĄCZNIE WARSTWA WIDOCZNA DLA CZŁOWIEKA. Nazwy tabel, kolumn,
// kluczy, plików i komponentów zostają nietknięte — `goals`, `focus_blocks`,
// `FocusBlockPlanner.tsx`. Zmiana schematu przy zmianie etykiety to dwa razy
// większe ryzyko przy zerowym zysku (ten sam wzorzec co `mental` → „Odwaga
// w grze", decyzja A1 z 07.08.2026).
//
// ⚠️ SŁOWO „PORZUĆ" ZNIKA Z PRODUKTU. Zawodnik nie porzuca niczego — kończy
// Blok albo przestaje nad czymś pracować. Statusy w bazie (`abandoned`)
// zostają, bo to klucz, nie zdanie.
//
// Odmiana jest tu wypisana wprost zamiast sklejana w miejscu użycia — polski
// dopełniacz („wąskiego gardła", „wąskich gardeł") nie da się wyprowadzić
// z mianownika bez reguły, której nikt później nie odczyta.

/** Poziom 1 — kierunek na lata. Jeden. Nie ma przycisku zamknięcia. */
export const CEL_LABEL = 'Cel';

/** Poziom 2 — `goals`. To, co ogranicza zawodnika teraz. */
export const GARDLO_LABEL = 'Wąskie gardło';
export const GARDLO_LABEL_D = 'wąskiego gardła';
export const GARDLO_LABEL_B = 'wąskie gardło';
export const GARDLO_LABEL_PL = 'Wąskie gardła';
export const GARDLO_LABEL_PL_D = 'wąskich gardeł';

/** Poziom 3 — `focus_blocks`. 4–8 tygodni intensyfikacji. */
export const BLOK_LABEL = 'Blok';
export const BLOK_LABEL_D = 'Bloku';
export const BLOK_LABEL_PL = 'Bloki';

/**
 * Brzmienia przycisków rozdzielające odpowiedzialność (sekcja 2 decyzji).
 * `GARDLO_STOP_LABEL` jest WYJŚCIEM AWARYJNYM, nie główną drogą — główną jest
 * rediagnoza przy zamknięciu Bloku. Dlatego ma być wizualnie drugorzędny.
 */
export const BLOK_CLOSE_LABEL = 'Zamknij Blok';
export const GARDLO_STOP_LABEL = 'Już nad tym nie pracuję';
export const GARDLO_DONE_LABEL = 'Ukończone';

/** Odznaki w historii. „Porzucony" musiał zniknąć — patrz nagłówek sekcji. */
export const GARDLO_BADGE_DONE = 'Ukończone';
export const GARDLO_BADGE_CLOSED = 'Zamknięte';

/** Tytuł ekranu `app/(tabs)/cele.tsx`. Nazwa PLIKU i trasy zostaje. */
export const GARDLA_SCREEN_TITLE = 'Wąskie gardła';

// ─────────────────────────────────────────────────────────────
// 13 SEGMENTÓW
// ─────────────────────────────────────────────────────────────

/** Kolejność kanoniczna = `public.segments.display_order` (1–13). */
export const SEGMENT_ORDER: string[] = [
  'moc', 'wytrzymalosc', 'fizycznosc', 'techFund', 'techSpec',
  'tolerancja', 'regeneracja', 'odpornosc', 'odzywianie',
  'koncentracja', 'mental', 'percepcja', 'decyzja',
];

export const SEGMENT_LABELS: Record<string, string> = {
  moc: 'Moc',
  wytrzymalosc: 'Wytrzymałość',
  fizycznosc: 'Fizyczność',
  // PRAKTYKA-EKRAN B6 08.08.2026 — mała litera (patrz nagłówek).
  techFund: 'Technika fundamentalna',
  techSpec: 'Technika specjalistyczna',
  tolerancja: 'Tolerancja obciążeń',
  regeneracja: 'Regeneracja',
  odpornosc: 'Odporność',
  odzywianie: 'Odżywienie',
  koncentracja: 'Koncentracja',
  // NAWIGACJA B3 08.08.2026 — było 'Stan Mentalny' (decyzja A1, patrz nagłówek).
  mental: 'Odwaga w grze',
  percepcja: 'Percepcja',
  // PRAKTYKA-EKRAN B6 08.08.2026 — mała litera (patrz nagłówek).
  decyzja: 'Szybkość decyzji',
};

// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-F2 08.2026 (15.08.2026) — SEGMENT, KTÓREGO NIE ZNAMY
// ═══════════════════════════════════════════════════════════════════
//
// ── CO JEST ZEPSUTE ──────────────────────────────────────────────────
// `segmentLabel()` niżej oddaje SUROWE `id` z bazy, gdy nie ma dla niego
// nazwy. Zawodnik czyta wtedy „Twoje wąskie gardło to explosive_power"
// zamiast słowa, które sam wybrał — a ponieważ surowa wartość WYGLĄDA jak
// nazwa, nikt nigdy nie zgłosi, że nazwy brakuje. To jest ta sama choroba,
// którą pas A7 usunął z kalendarza (`EVENT_TYPE_LABELS[x] || x`), tylko
// schowana o jeden skok dalej — WEWNĄTRZ funkcji, a nie w miejscu wywołania.
//
// ⚠️ I dlatego DETEKTOR PASA E2 JEJ NIE WIDZI u konsumentów. `(E2-5)` szuka
// zapisu `SLOWNIK[x] ?? x` w pliku, który rysuje. Tutaj plik, który rysuje,
// pisze `segmentLabel(id)` — zapis czysty jak łza. ZMIERZONE 15.08.2026:
// wyciek dosięga PIĘCIU plików, z których ANI JEDEN nie stoi na liście
// długu `(E2-5)`.
//
// ── DZIEDZINA — ZMIERZONA, NIE ZAŁOŻONA (`select distinct`, 15.08.2026) ──
//   `public.segments`                       13 wierszy, ZERO kolumn z nazwą
//                                           → jedynym źródłem nazw jest ten plik
//   z FK → segments (domena zamknięta):     goals · segment_components ·
//                                           knowledge_base_entries ·
//                                           living_diagnosis_pulses ·
//                                           match_context_answers ·
//                                           decision_recommendations
//   ⛔ BEZ FK I BEZ CHECK (domena OTWARTA): focus_blocks.segment_id ·
//                                           component_hints.segment_id ·
//                                           player_insights.segment_id
//   ⛔ bez żadnego ograniczenia:            klucze w `diagnostics.scores` (jsonb)
//
// ⭐ Dziś ani jedna wartość nie wypada poza trzynastkę (zmierzone na wszystkich
// dziewięciu kolumnach i na 50 kluczach `scores`). ⚠️ ALE trzy z nich nie mają
// ani FK, ani CHECK-a — więc gałąź „nie znam" jest osiągalna BEZ ŻADNEJ
// MIGRACJI, jednym `insert`em. To NIE jest ten sam przypadek, co
// `daily_logs.session_type` w pasie E2, gdzie CHECK domykał dziedzinę.

/**
 * ⭐ ROZSTRZYGNIĘCIE, NIE NAPIS — kształt wzięty co do znaku z `opiszRodzaj()`
 * (`lib/meczWKalendarzu.ts`, pas A7).
 *
 * ⚠️ FUNKCJA Z `lib/` NIE RYSUJE. Oddaje strukturę, z której ekran wie, co
 * pokazać: `znany: true` → gotowa etykieta; `znany: false` → surowa wartość
 * (do logu, NIE na ekran) i komunikat. Sklejenie tego w jeden napis jest
 * dokładnie tym błędem, przez który dziś nie da się odróżnić nazwy od
 * identyfikatora.
 */
export type OpisSegmentu =
  | { znany: true; id: string; etykieta: string }
  | { znany: false; surowy: string; komunikat: string };

/**
 * ⭐ DZIEDZINA WYPROWADZONA ZE SŁOWNIKA, A NIE WPISANA OBOK NIEGO.
 *
 * Druga lista rozjechałaby się z pierwszą — i wtedy funkcja mówiłaby „nie znam"
 * o segmencie, dla którego nazwa stoi dziesięć linii wyżej. Ten sam ruch, co
 * `Object.keys` w pasie E2 (`dziennik.tsx`), i z tego samego powodu.
 *
 * ⚠️ `SEGMENT_ORDER` NIE nadaje się na to źródło: jest listą KOLEJNOŚCI
 * (`display_order` w bazie), a nie listą tego, co umiemy nazwać. Asercja
 * w `labels.selftest.ts` pilnuje, że oba zbiory są dziś równe — ale to jest
 * pomiar, nie definicja.
 */
export const SEGMENTY_ZNANE: readonly string[] = Object.keys(SEGMENT_LABELS);

export function czyZnanySegment(wartosc: unknown): wartosc is string {
  return typeof wartosc === 'string' && Object.prototype.hasOwnProperty.call(SEGMENT_LABELS, wartosc);
}

/**
 * ⚠️ BRZMIENIE WIDOCZNE DLA ZAWODNIKA — DO DECYZJI KUBY (nota F2 §6).
 *
 * ⛔ Nie jest wymyślone tutaj. Jest INSTANCJĄ wzorca `Nie znam tego …`
 * przyjętego w pasie A7 (`Nie znam tego rodzaju wydarzenia`), z rzeczownikiem,
 * którym produkt NAZYWA DZIŚ SEGMENT we własnym tekście — „obszar"
 * (`components/DiagnosisProfileView.tsx`: „…to X — obszar z grupy „…"").
 *
 * ⭐ ZERO KONSUMENTÓW NA DZIŚ. Ani jeden ekran tego nie rysuje, więc zawodnik
 * tego nie zobaczy do czasu decyzji. Pilnuje tego asercja w `labels.selftest.ts`,
 * która ZAPALA SIĘ, gdy konsument się pojawi — żeby brzmienie nie weszło na
 * ekran bez przejścia przez §6 noty. Zmiana to jedna stała.
 */
export const SEGMENT_NIEZNANY_KOMUNIKAT = 'Nie znam tego obszaru';

/**
 * Rozstrzyga, czy `id` segmentu jest jednym z tych, które umiemy nazwać.
 *
 * Przy nieznanym NIE zgaduje nazwy i NIE oddaje surowej wartości jako nazwy —
 * oddaje jawny stan plus wartość do logu. Ekran ma wtedy co narysować,
 * a autor ma po czym poznać, że baza urosła o segment, którego appka nie zna.
 */
export function opiszSegment(wartosc: unknown): OpisSegmentu {
  if (czyZnanySegment(wartosc)) {
    return { znany: true, id: wartosc, etykieta: SEGMENT_LABELS[wartosc] };
  }
  const surowy = typeof wartosc === 'string' ? wartosc : String(wartosc);
  return { znany: false, surowy, komunikat: SEGMENT_NIEZNANY_KOMUNIKAT };
}

/**
 * Tekst do konsoli — ma NAZWAĆ wartość, której appka nie rozumie, i powiedzieć,
 * gdzie jej szukać. Kolumny wymienione z pomiaru, nie z pamięci (patrz nagłówek).
 */
export function opisNieznanegoSegmentuDoLogu(opis: OpisSegmentu): string | null {
  if (opis.znany) return null;
  return `[PLAN-D-F2] segment_id = „${opis.surowy}" — poza trzynastką znaną appce `
    + `(${SEGMENTY_ZNANE.join(', ')}). Trzy kolumny nie mają ani FK, ani CHECK-a `
    + '(focus_blocks, component_hints, player_insights), więc wartość mogła tam wejść '
    + 'bez migracji. Zawodnik widzi tę pozycję bez nazwy obszaru.';
}

/**
 * ⛔ ⭐ ZNANY DEFEKT, ŚWIADOMIE NIEZMIENIONY PRZEZ PAS F2 — I OTO DLACZEGO.
 *
 * Ta funkcja oddaje SUROWE `id`, gdy nie ma dla niego nazwy. To jest jedna
 * z pozycji długu `(E2-5)` i pas F2 dostał ją jako swoje główne zadanie.
 * ⛔ NIE DA SIĘ JEJ ZAMKNĄĆ Z `lib/` — i to jest POMIAR, nie wygoda:
 *
 *  1. ZMIERZONE 15.08.2026: `segmentLabel()` ma **12 wywołań w 5 plikach** —
 *     `app/(tabs)/ja.tsx :: load` · `components/DiagnosisProfileView.tsx`
 *     (`tiers` ×3, `SekcjaWaskiegoGardla` ×3) · `components/diagnosisProfile.ts`
 *     (`nameOf` ×2, `classify`) · `lib/rediagnosis.ts :: buildRediagnosisView` ·
 *     ten plik (`SEGMENTS_BY_PILLAR`, id zawsze znane — nie wyciek).
 *  2. ⭐ W CZTERECH Z NICH WYNIK JEST WPLATANY W ZDANIE, a nie stawiany
 *     samodzielnie: „Twoje wąskie gardło to ${segmentLabel(id)} — obszar
 *     z grupy „…"" (`SekcjaWaskiegoGardla`), `.map(segmentLabel).join(' + ')`
 *     (`nameOf`). Jeden napis nie obsłuży obu miejsc naraz: etykieta stoi sama,
 *     a w zdaniu musi być frazą. Podmiana odwrotu na komunikat dałaby tam
 *     „Twoje wąskie gardło to Nie znam tego obszaru — obszar z grupy…".
 *  3. ⛔ Wszystkie pięć plików jest POZA listą pasa F2 (`app/`, `components/`
 *     i cudze `lib/`). Polecenie mówi wprost: nie wchodzisz, wypisujesz.
 *
 * ⚠️ ZAPIS `SEGMENT_LABELS[id] ?? id` ZOSTAJE CO DO ZNAKU CELOWO. Przepisanie
 * go na `opiszSegment(...)` wyciszyłoby detektor `(E2-5)`, nie naprawiając ani
 * jednego ekranu — czyli pozycja długu zniknęłaby z listy, a defekt zostałby.
 * To jest dokładnie ten ruch, którego zapadka w `meczWKalendarzu.selftest.ts`
 * ma zabronić.
 *
 * ⭐ CO MA ZROBIĆ NASTĘPNY PAS: podmienić te 11 wywołań na `opiszSegment()`
 * (wyżej) i narysować OBIE gałęzie, a potem skasować tę funkcję. Strażnik
 * `lib/surowaWartosc.selftest.ts` liczy je i nie pozwala im przybyć.
 */
export function segmentLabel(id: string): string {
  return SEGMENT_LABELS[id] ?? id;
}

// Filary — przeniesione z cele.tsx (`SEGMENTS_BY_PILLAR`). Trzymane jako
// mapa filar → lista id, a etykiety dokładane z SEGMENT_LABELS, żeby nazwy
// segmentów nie istniały tu po raz drugi. Kolejność wypłaszczona = SEGMENT_ORDER
// (sprawdzone), więc Picker w cele.tsx zachowuje dotychczasową kolejność
// pozycji co do jednej.
export const SEGMENTS_BY_PILLAR_IDS: [string, string[]][] = [
  ['Filar 1 — Dominacja fizyczna', ['moc', 'wytrzymalosc', 'fizycznosc']],
  ['Filar 2 — Efektywność techniczna', ['techFund', 'techSpec']],
  ['Filar 3 — Trwałość organizmu', ['tolerancja', 'regeneracja', 'odpornosc', 'odzywianie']],
  ['Filar 4 — Mentalność', ['koncentracja', 'mental']],
  ['Filar 5 — Boiskowa mądrość', ['percepcja', 'decyzja']],
];

/** Ten sam kształt, co dotychczasowe `SEGMENTS_BY_PILLAR` w cele.tsx: [filar, [[id, nazwa], …]]. */
export const SEGMENTS_BY_PILLAR: [string, [string, string][]][] =
  SEGMENTS_BY_PILLAR_IDS.map(([pillar, ids]) => ([
    pillar,
    ids.map((id) => [id, segmentLabel(id)] as [string, string]),
  ] as [string, [string, string][]]));

/** id segmentu → nazwa filaru. */
export const SEGMENT_PILLAR: Record<string, string> = Object.fromEntries(
  SEGMENTS_BY_PILLAR_IDS.flatMap(([pillar, ids]) => ids.map((id) => [id, pillar] as [string, string]))
);

// ─────────────────────────────────────────────────────────────
// 17 LOKALIZACJI BÓLU / KONTUZJI
// ─────────────────────────────────────────────────────────────
// Przeniesione 1:1 z dziennik.tsx / mecz.tsx / profil.tsx — trzy kopie były
// identyczne co do znaku (sprawdzone maszynowo przed usunięciem). Razem z
// nimi przeniesiony `NON_LATERAL_LOCATIONS`, który też istniał w trzech
// kopiach i musi się zgadzać z tą listą (lokalizacje bez strony lewa/prawa).

export const BODY_LOCATIONS: [string, string][] = [
  ['kostka', 'Kostka'], ['kolano', 'Kolano'], ['udo_przednie', 'Udo przednie'],
  ['udo_tylne', 'Udo tylne'], ['lydka', 'Łydka'], ['pachwina', 'Pachwina'],
  ['biodro', 'Biodro'], ['stopa', 'Stopa'], ['achilles', 'Ścięgno Achillesa'],
  ['plecy_kregoslup', 'Plecy / kręgosłup'], ['brzuch_tulow', 'Brzuch / tułów'],
  ['bark', 'Bark'], ['lokiec', 'Łokieć'], ['nadgarstek_dlon', 'Nadgarstek / dłoń'],
  ['glowa_twarz', 'Głowa / twarz'], ['klatka_piersiowa_zebra', 'Klatka piersiowa / żebra'],
  ['inne', 'Inne'],
];

export const BODY_LOCATION_LABELS: Record<string, string> = Object.fromEntries(BODY_LOCATIONS);

/** Lokalizacje, przy których pytanie o stronę (lewa/prawa) nie ma sensu. */
export const NON_LATERAL_LOCATIONS = new Set(['plecy_kregoslup', 'brzuch_tulow', 'inne']);

// ─────────────────────────────────────────────────────────────
// PLAN-D-E 08.2026 (11.08.2026) — PUNKT POMOCY
// ─────────────────────────────────────────────────────────────
// Podstawa: `claude/R2a_SCIEZKA_ESKALACJI_KRYZYS_11_08_2026.md`.
// Komponent: `components/PunktPomocy.tsx`.
//
// ⚠️ BRZMIENIE `POMOC_PRAWDA` JEST PRZYJĘTE PRZEZ KUBĘ 11.08.2026 I NIE WOLNO
// GO ZMIENIAĆ ANI SKRACAĆ. Nie jest to tekst marketingowy — to jest jedyne
// miejsce, w którym produkt mówi nastolatkowi prawdę o tym, że nikt nie czyta
// jego wpisów na bieżąco. Produkt, który sprawia wrażenie, że ktoś patrzy,
// tworzy fałszywe poleganie: dziecko czeka na reakcję, która nigdy nie nadejdzie.
//
// Te stałe siedzą tutaj, a nie w komponencie, z tego samego powodu co nazwy
// segmentów: brzmienia widoczne dla zawodnika mają jedno źródło, żeby nie dało
// się ich rozjechać na dwóch ekranach.

/** Etykieta stałej pigułki dostępnej z ekranu. NIE jest brzmieniem przyjętym — patrz raport E, sekcja 8. */
export const POMOC_PRZYCISK = 'Potrzebuję pomocy';

export const POMOC_TYTUL = 'Kiedy potrzebujesz człowieka';

/** PRZYJĘTE PRZEZ KUBĘ 11.08.2026. Co do znaku. */
export const POMOC_PRAWDA =
  'Nikt nie czyta tego, co tu wpisujesz, na bieżąco. Ta aplikacja nie jest pogotowiem i nie zastąpi człowieka. '
  + 'Nikt nie zostanie o niczym automatycznie powiadomiony — ani Twój rodzic, ani trener. '
  + 'Jeśli dzieje się coś, z czym nie chcesz być sam, tu są ludzie, którzy odbierają o każdej porze: '
  + '116 111 · 800 12 12 12 · 112';

export type KanalPomocy = {
  numer: string;
  opis: string;
  /** Link `tel:` — numer ma być klikalny, nie do przepisania z ekranu o 23:00. */
  tel: string;
  czat: string | null;
  czatLabel: string | null;
};

export const POMOC_KANALY: KanalPomocy[] = [
  {
    numer: '116 111',
    opis: 'Telefon zaufania dla dzieci i młodzieży. Całodobowo, bezpłatnie, anonimowo. Telefon albo czat na 116111.pl.',
    tel: 'tel:116111',
    czat: 'https://116111.pl',
    czatLabel: 'Czat 116111.pl',
  },
  {
    numer: '800 12 12 12',
    opis: 'Rzecznik Praw Dziecka. Całodobowo. Telefon albo czat na czat.brpd.gov.pl, bez logowania.',
    tel: 'tel:800121212',
    czat: 'https://czat.brpd.gov.pl',
    czatLabel: 'Czat brpd.gov.pl',
  },
  {
    numer: '112',
    opis: 'Numer alarmowy. Wtedy, gdy komuś dzieje się krzywda teraz.',
    tel: 'tel:112',
    czat: null,
    czatLabel: null,
  },
];

/**
 * Zdanie zamykające. Powtarza najważniejszą rzecz z ekranu prawdy w miejscu,
 * w którym zawodnik podejmuje decyzję o dotknięciu przycisku: to nic nie
 * uruchamia i nikogo nie wzywa.
 */
export const POMOC_STOPKA =
  'Otwarcie tego ekranu i wybranie numeru nie zapisuje się nigdzie w Twoim koncie i nikogo nie powiadamia.';

export const POMOC_ZAMKNIJ = 'Zamknij';

/**
 * Podpis nazwanego wejścia do punktu pomocy w zakładce „Ja" (PLAN-D-E 12.08.2026).
 * Wymienia numery, bo wiersz w menu ma powiedzieć, co jest po drugiej stronie,
 * zanim zawodnik go dotknie.
 */
export const POMOC_WIERSZ_PODPIS = '116 111 · 800 12 12 12 · 112 — całodobowo, bezpłatnie, anonimowo';
