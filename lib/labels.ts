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

/** Nazwa segmentu, z bezpiecznym odwrotem na surowe id (nigdy nie zwraca pustego). */
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
