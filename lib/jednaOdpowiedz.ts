// PLAN-D-T 08.2026 (13.08.2026) — NOWY PLIK. ZADANIE T1: KRĘGOSŁUP.
// „DZIŚ" STAJE SIĘ JEDNĄ ODPOWIEDZIĄ.
//
// ═════════════════════════════════════════════════════════════════════
// ── PO CO TEN PLIK POWSTAŁ ───────────────────────────────────────────
//
// Ekran „Dziś" był KOLAŻEM SZEŚCIU NIEZALEŻNYCH PRODUCENTÓW, z których każdy
// powstał w innej rundzie i żaden nie wiedział o pozostałych:
//
//     kafelek Bloku · karta rekomendacji · podpowiedź dnia ·
//     karta głosu tygodnia · punkt pomocy · piętnaście rytmów push
//
// Arbiter głosu miał rozwiązać kolizję głosów i rozwiązał ją W JEDNYM KANALE
// Z SZEŚCIU. Audyt z 12.08.2026 nazwał to wprost: „kolizja nie została
// naprawiona, została przeniesiona o jeden ekran niżej".
//
// To jest powód, dla którego produkt nie wyglądał jak makiety. Makieta
// pokazywała coś, co PROWADZI zawodnika przez czas: jedna oś ma głos, reszta
// milknie. Ekran pokazywał sześć rzeczy mówiących naraz.
//
// ⚠️ TEN PLIK NIE DOKŁADA ANI JEDNEJ NOWEJ FUNKCJI. Składa to, co już jest,
// w jedną odpowiedź o trzech częściach:
//
//     CO DZIŚ ZROBIĆ  ·  DLACZEGO AKURAT TO  ·  CO TO ZMIENI
//
// ── DWIE ZASADY, KTÓRE TRZYMAJĄ TEN PLIK ─────────────────────────────
//
// 1. ⚠️ DOKŁADNIE JEDNA RZECZ. Nie lista. Gdy nie ma czego zaproponować,
//    mówimy to wprost — zamiast pokazać trzy słabe propozycje obok siebie.
//    Pilnuje tego typ (`coZrobic` to jeden obiekt, nie tablica) i asercja,
//    nie ten komentarz.
//
// 2. ⚠️ „CO TO ZMIENI" MA PRAWO BYĆ PUSTE I CZĘSTO BĘDZIE.
//    Wychodzi WYŁĄCZNIE wtedy, gdy istnieje liczba albo dowód, który da się
//    podać RAZEM Z JEGO SIŁĄ (Z0, rejestr „fakt o innych"). Zmierzone
//    14.08.2026: `component_hints.dowody` jest wypełnione w 21 z 297 wierszy,
//    więc ta część będzie pusta w ~93% przypadków — I TAK MA BYĆ.
//    ⛔ Wypełnienie jej zdaniem ogólnym w rodzaju „to pomoże Ci się rozwijać"
//    łamie zasadę twardą Z0: byłoby podaniem propozycji jako faktu, bez
//    źródła i bez siły dowodu. Puste miejsce jest uczciwe; wypełniacz kłamie.
//    Pilnuje tego typ: `coToZmieni` NIE MOŻE powstać bez `zrodlo`.
//
// ── CZEGO TEN PLIK NIE ROBI ──────────────────────────────────────────
// Nie dotyka bazy, nie zna godziny, nie rysuje. Jest czystą funkcją, żeby
// dało się ją sprawdzić w całości bez Supabase i bez telefonu — reguła,
// której nie da się sprawdzić, prędzej czy później przestaje obowiązywać.
// ═════════════════════════════════════════════════════════════════════

import type { WidokDzis, Obowiazuje } from './ograniczenia';
import type { HintState, HintPresentation } from './componentHints';

// ─────────────────────────────────────────────────────────────────────
// 1. KSZTAŁT ODPOWIEDZI
// ─────────────────────────────────────────────────────────────────────

/**
 * Skąd wzięła się rzecz do zrobienia. Kolejność pierwszeństwa z polecenia T1:
 * aktywny Blok → rekomendacja → podpowiedź dnia.
 */
export type ZrodloOdpowiedzi =
  /** Aktywny Blok ma coś NA DZIŚ — czekającą, nieotwartą porcję treści. */
  | 'blok'
  /** Gotowa rekomendacja z Centrum decyzji. Niesie własne przyciski. */
  | 'rekomendacja'
  /** Podpowiedź z materiałów Kuby, wycelowana w Element albo w segment. */
  | 'podpowiedz'
  /** Zawodnik nie ma pod czym pracować — zaproszenie do zaplanowania Bloku. */
  | 'zaproszenie'
  /** Nie ma czego zaproponować. Mówimy to wprost. */
  | 'brak';

export type CoDzisZrobic = {
  zrodlo: ZrodloOdpowiedzi;
  /**
   * DOKŁADNIE JEDNA RZECZ. Przy źródle `rekomendacja` jest to `null`, bo
   * treść niesie `components/RecommendationCard.tsx` — ten sam komponent,
   * który renderuje Centrum decyzji (zero drugiej kopii kodu karty).
   */
  tekst: string | null;
};

/**
 * ⚠️ TYPU NIE DA SIĘ ZBUDOWAĆ BEZ ŹRÓDŁA — i to jest cała jego robota.
 * „Co to zmieni" bez źródła jest zdaniem ogólnym, a zdanie ogólne w tym
 * miejscu łamie Z0.
 */
export type CoToZmieni = {
  /** Dosłowna treść z bazy wiedzy (`component_hints.dowody`). Nigdy nasze zdanie. */
  tekst: string;
  /** Skąd to wiadomo — książka i strona albo nazwa zasady. Bez tego część nie wychodzi. */
  zrodlo: string;
};

export type JednaOdpowiedz = {
  coZrobic: CoDzisZrobic;
  /**
   * JEDNO ZDANIE. `null` znaczy „nie mam uzasadnienia, którego bym nie zmyślił".
   * ⚠️ Bez uzasadnienia rekomendacja jest rozkazem — ale zmyślone uzasadnienie
   * jest gorsze niż jego brak, bo brzmi wiarygodnie.
   */
  dlaczego: string | null;
  /** Patrz zasada 2 w nagłówku pliku. `null` w ~93% przypadków i tak ma być. */
  coToZmieni: CoToZmieni | null;
  /** Czy ekran ma w ogóle rysować odpowiedź (wyciszenie, ładowanie). */
  pokazac: boolean;
  /** Zdanie do konsoli — żeby na pytanie „czemu ekran wyglądał wtedy tak" dało się odpowiedzieć. */
  powod: string;
};

// ─────────────────────────────────────────────────────────────────────
// 2. BRZMIENIA
// ─────────────────────────────────────────────────────────────────────
// ⚠️ WSZYSTKIE STOJĄ TUTAJ, NIE W JSX — żeby selftest mógł je sprawdzić
// literalnie. Reguła R1: to, co człowiek zobaczy, musi dać się wypisać bez
// uruchamiania appki.

/** Znacznik dla Kuby i dla strażnika. Nie usuwać do czasu zatwierdzenia brzmienia. */
export const BRZMIENIE_DO_PRZEJRZENIA = 'DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-T, 13.08.2026)';

/** Trzy nagłówki jednej odpowiedzi. To jest cała jej struktura. */
export const NAGLOWEK_CO_ZROBIC = 'Co dziś zrobić';
export const NAGLOWEK_DLACZEGO = 'Dlaczego akurat to';
export const NAGLOWEK_CO_ZMIENI = 'Co to zmieni';

/**
 * ⚠️ BRZMIENIE ISTNIEJĄCE, PRZENIESIONE CO DO ZNAKU. Do 13.08.2026 stało
 * w kafelku wąskiego gardła jako `heroAction`. Nie jest nowe — zmieniło
 * miejsce, bo „nowa porcja czeka" jest rzeczą DO ZROBIENIA, a nie etykietą
 * kafelka o tym, nad czym zawodnik pracuje.
 */
export const BLOK_NOWA_PORCJA = 'Nowa porcja w Twoim Bloku';

/** ⚠️ TAK SAMO: było `heroAction` „Zaplanuj Blok →". */
export const ZAPROSZENIE_ZAPLANUJ_BLOK = 'Zaplanuj Blok';

/**
 * ⚠️ NOWE BRZMIENIE — DO PRZEJRZENIA PRZEZ KUBĘ.
 * Stan „nie mam dziś nic do zaproponowania". Polecenie T1 wymaga, żeby
 * powiedzieć to WPROST, a nie zostawić pustkę udającą, że ekran się nie
 * doczytał. Zdanie świadomie NIE przeprasza i NIE obiecuje terminu.
 */
export const BRAK_PROPOZYCJI =
  'Dziś nie mam dla Ciebie jednej konkretnej rzeczy do zrobienia. To nie jest błąd — po prostu nie chcę wymyślać zadania, żeby coś tu stało.';

/**
 * ⚠️ NOWE BRZMIENIE — DO PRZEJRZENIA PRZEZ KUBĘ.
 * „Dlaczego akurat to" przy aktywnej Osłonie (szybki wzrost). Jedno zdanie,
 * bez liczby o dojrzewaniu (zakaz bezwzględny) i bez słowa „ochrona".
 */
export const DLACZEGO_OSLONA =
  'Twój Blok w tym okresie nie zwiększa objętości — dlatego dziś jedna rzecz, nie więcej.';

/**
 * „Dlaczego akurat to" przy pracy powiązanej z wąskim gardłem.
 * ⚠️ BRZMIENIE ISTNIEJĄCE: do 13.08.2026 stało w karcie rekomendacji jako
 * `headerSlot` („Pomaga Ci przy: …"). Przeniesione co do znaku.
 */
export function dlaczegoZGardla(etykietaGardla: string): string {
  return `Pomaga Ci przy: ${etykietaGardla}`;
}

// ─────────────────────────────────────────────────────────────────────
// 3. WEJŚCIE
// ─────────────────────────────────────────────────────────────────────

export type WejscieOdpowiedzi = {
  /** Wynik `coPokazacNaDzis(ograniczenia)`. Rozstrzyga, czy odpowiedź w ogóle wychodzi. */
  widok: WidokDzis;
  /** Ekran jeszcze się nie doczytał. Nie udajemy wtedy, że czegoś nie ma. */
  laduje: boolean;
  /** Czy zawodnik ma aktywne wąskie gardło (`goals`, `is_priority`). */
  maGardlo: boolean;
  /** Nazwa segmentu wąskiego gardła — `null`, gdy zawodnik go nie ma. */
  etykietaGardla: string | null;
  /** Czy pod tym wąskim gardłem stoi AKTYWNY Blok. */
  maAktywnyBlok: boolean;
  /** Czy w Bloku czeka NIEOTWARTA porcja treści. */
  nowaPorcjaCzeka: boolean;
  /** Czy jest gotowa rekomendacja i czy jest powiązana z wąskim gardłem. */
  rekomendacja: { jest: boolean; powiazanaZGardlem: boolean };
  /** Stan podpowiedzi z materiałów (`buildHintState`). */
  podpowiedz: HintState;
  /** Czy trwa Osłona — z `czyOslonaAktywna()`. Trzy stany, nigdy dwa. */
  oslona: Obowiazuje;
};

// ─────────────────────────────────────────────────────────────────────
// 4. SKŁADANIE ODPOWIEDZI
// ─────────────────────────────────────────────────────────────────────

const NIC: JednaOdpowiedz = {
  coZrobic: { zrodlo: 'brak', tekst: null },
  dlaczego: null,
  coToZmieni: null,
  pokazac: false,
  powod: 'odpowiedź nie jest rysowana',
};

/**
 * ⚠️ „CO TO ZMIENI" — JEDYNA DROGA, KTÓRĄ TA CZĘŚĆ MOŻE POWSTAĆ.
 *
 * Bierze siłę dowodu z bazy wiedzy (`component_hints.dowody`) i wymaga do niej
 * ŹRÓDŁA. Brak jednego z dwóch → `null`, bez wyjątków i bez ścieżki obejścia.
 *
 * ⛔ TU NIE MA GAŁĘZI „a jak nie ma dowodu, to napisz coś ogólnego". Gdyby
 * była, ktoś by z niej skorzystał — i to jest dokładnie ten sposób, w jaki
 * produkt zaczyna podawać prawdopodobne jako pewne.
 */
export function zbudujCoToZmieni(p: HintPresentation | null): CoToZmieni | null {
  if (!p) return null;
  const dowody = (p.hint.dowody || '').trim();
  const zrodlo = (p.source || '').trim();
  if (dowody.length === 0 || zrodlo.length === 0) return null;
  return { tekst: dowody, zrodlo };
}

/**
 * Podpowiedź, która ma trafić do „co dziś zrobić".
 *
 * ⭐ ZADANIE T7. Preferujemy `rodzaj = 'zrobic'` (pole `doZrobienia`), a gdy
 * takiej nie ma w całej puli — bierzemy wylosowaną na dziś, BO JEJ TREŚĆ
 * I TAK NAJCZĘŚCIEJ JEST POLECENIEM (sprostowanie z polecenia T7: problemem
 * był szablon karty, nie treść).
 *
 * ⚠️ Nagłówek „Warto wiedzieć" znika z produktu razem z tym wyborem: żadna
 * podpowiedź nie renderuje się już jako sama wiedza (M4).
 */
function podpowiedzDoDzialania(stan: HintState): HintPresentation | null {
  if (stan.state !== 'ready') return null;
  if (stan.doZrobienia) return stan.doZrobienia;
  return { hint: stan.hint, source: stan.source };
}

/**
 * Składa jedną odpowiedź z tego, co ekran już ma. NIE PYTA BAZY.
 *
 * KOLEJNOŚĆ PIERWSZEŃSTWA (polecenie T1, dosłownie):
 *   aktywny Blok → rekomendacja → podpowiedź dnia
 * plus dwa stany brzegowe, których polecenie wprost wymaga:
 *   zaproszenie (nie ma pod czym pracować) i jawny brak.
 *
 * ⚠️ „AKTYWNY BLOK" ZNACZY „BLOK, KTÓRY MA COŚ NA DZIŚ", A NIE „BLOK ISTNIEJE".
 * To jest decyzja i warto ją znać: gdyby sam fakt istnienia Bloku wygrywał
 * pierwszeństwo, zawodnik z Blokiem NIGDY nie zobaczyłby rekomendacji ani jej
 * przycisków — a to jedyna akcja decyzyjna na tym ekranie. Blok wygrywa
 * wtedy, gdy naprawdę ma dziś czym wygrać: czeka nieotwarta porcja treści.
 */
export function zbudujJednaOdpowiedz(w: WejscieOdpowiedzi): JednaOdpowiedz {
  // ── Wyciszenie ma pierwszeństwo nad wszystkim. Przy kontuzji i ścieżce
  //    wyjścia odpowiedź NIE JEST zastępowana innym komunikatem: zastępczy
  //    tekst zamieniłby decyzję o milczeniu w kolejne odezwanie.
  if (!w.widok.pokazacRekomendacje) {
    return { ...NIC, powod: `odpowiedź wyciszona — ${w.widok.powod}` };
  }
  if (w.laduje) {
    return { ...NIC, powod: 'ekran jeszcze się nie doczytał — nie udajemy, że czegoś nie ma' };
  }

  const dlaczegoStan = w.oslona === 'tak' ? DLACZEGO_OSLONA : null;
  const dlaczegoGardlo = w.etykietaGardla ? dlaczegoZGardla(w.etykietaGardla) : null;
  const podpowiedz = podpowiedzDoDzialania(w.podpowiedz);

  // ── 1. AKTYWNY BLOK Z NOWĄ PORCJĄ ─────────────────────────────────
  if (w.maAktywnyBlok && w.nowaPorcjaCzeka && w.widok.pokazacWezwanieDoPracy) {
    return {
      coZrobic: { zrodlo: 'blok', tekst: BLOK_NOWA_PORCJA },
      // Stan obowiązujący ma pierwszeństwo przed wąskim gardłem: jeśli Osłona
      // trwa, to ONA jest powodem, dla którego dziś jest jedna rzecz.
      dlaczego: dlaczegoStan ?? dlaczegoGardlo,
      // ⚠️ Blok nie niesie ze sobą dowodu — porcja treści jest treścią, nie
      // liczbą. Część „co to zmieni" zostaje pusta i jest to poprawne.
      coToZmieni: null,
      pokazac: true,
      powod: 'źródło: aktywny Blok — czeka nieotwarta porcja treści',
    };
  }

  // ── 2. REKOMENDACJA ───────────────────────────────────────────────
  if (w.rekomendacja.jest) {
    return {
      // `tekst: null` — treść i przyciski niesie RecommendationCard.
      coZrobic: { zrodlo: 'rekomendacja', tekst: null },
      dlaczego: dlaczegoStan ?? (w.rekomendacja.powiazanaZGardlem ? dlaczegoGardlo : null),
      // Dowód z bazy wiedzy dla TEJ pracy — jeśli w ogóle istnieje.
      coToZmieni: zbudujCoToZmieni(podpowiedz),
      pokazac: true,
      powod: 'źródło: rekomendacja z Centrum decyzji',
    };
  }

  // ── 3. PODPOWIEDŹ DNIA ────────────────────────────────────────────
  if (podpowiedz) {
    const tekst = (podpowiedz.hint.hint || '').trim();
    if (tekst.length > 0) {
      // „Dlaczego" bierzemy z nazwy Elementu/obszaru — to jest TREŚĆ Z BAZY,
      // nie nasze zdanie. Gdy jej nie ma, zostaje wąskie gardło; gdy i tego
      // nie ma — `null`, bo zmyślone uzasadnienie jest gorsze niż jego brak.
      const zBazy = (podpowiedz.hint.element_name || podpowiedz.hint.obszar_name || '').trim();
      return {
        coZrobic: { zrodlo: 'podpowiedz', tekst },
        dlaczego: dlaczegoStan
          ?? (zBazy.length > 0 ? dlaczegoZGardla(zBazy) : dlaczegoGardlo),
        coToZmieni: zbudujCoToZmieni(podpowiedz),
        pokazac: true,
        powod: `źródło: podpowiedź z materiałów (rodzaj ${podpowiedz.hint.rodzaj}`
          + `${w.podpowiedz.state === 'ready' && !w.podpowiedz.doZrobienia ? ', BRAK w puli podpowiedzi „zrobic" — biorę wylosowaną' : ''})`,
      };
    }
  }

  // ── 4. ZAPROSZENIE ────────────────────────────────────────────────
  // Zawodnik ma wąskie gardło, ale nie ma pod nim Bloku. „Zaplanuj Blok" JEST
  // jedną konkretną rzeczą do zrobienia — ostatnią w kolejności, bo gotowa
  // rekomendacja albo konkret z materiału jest dziś bardziej wykonalna niż
  // zaplanowanie kilku tygodni pracy.
  if (w.maGardlo && !w.maAktywnyBlok && w.widok.pokazacWezwanieDoPracy) {
    return {
      coZrobic: { zrodlo: 'zaproszenie', tekst: ZAPROSZENIE_ZAPLANUJ_BLOK },
      dlaczego: dlaczegoStan ?? dlaczegoGardlo,
      coToZmieni: null,
      pokazac: true,
      powod: 'źródło: brak Bloku pod wąskim gardłem — zaproszenie do zaplanowania pracy',
    };
  }

  // ── 5. JAWNY BRAK ─────────────────────────────────────────────────
  // ⚠️ MÓWIMY TO WPROST. Pustka w tym miejscu wygląda jak niedoczytany ekran
  // i zawodnik traktuje ją jak awarię — a to jest decyzja, nie awaria.
  return {
    coZrobic: { zrodlo: 'brak', tekst: BRAK_PROPOZYCJI },
    dlaczego: dlaczegoStan,
    coToZmieni: null,
    pokazac: true,
    powod: 'brak źródła: ani Bloku z porcją, ani rekomendacji, ani podpowiedzi',
  };
}

// ─────────────────────────────────────────────────────────────────────
// 5. REJESTR ELEMENTÓW EKRANU „DZIŚ" — WEJŚCIE DLA STRAŻNIKA T8
// ─────────────────────────────────────────────────────────────────────
// ⚠️ TO NIE JEST DOKUMENTACJA. To jest wejście dla `lib/jednaOdpowiedz.selftest.ts`,
// który czyta ŹRÓDŁO `app/(tabs)/dzis.tsx` i sprawdza REGUŁĘ:
// „na «Dziś» nie ma elementu poza jedną odpowiedzią i poza tym rejestrem".
//
// Siódmy kafelek dołożony za rok zapala strażnika, choć nikt go tu nie wpisze.
//
// ⚠️ TA LISTA MA SIĘ KURCZYĆ, NIGDY ROSNĄĆ — ta sama zasada, którą pas T
// wykonał na kluczach koperty (T5). Każda nowa pozycja to kolejny producent
// mówiący naraz z resztą, czyli powrót do stanu sprzed tej rundy.

export type ElementDzis = {
  /** Nazwa stylu albo komponentu, po której da się go znaleźć w źródle. */
  znacznik: string;
  /** Co to jest — jednym zdaniem, po polsku. */
  coTo: string;
  /** Czy należy do jednej odpowiedzi. */
  wJednejOdpowiedzi: boolean;
};

// ═════════════════════════════════════════════════════════════════════
// ⭐ PRZEPISANY 18.08.2026 (PAS S1) — EKRAN „DZIŚ" PO PRZEBUDOWIE PASA A1
// ═════════════════════════════════════════════════════════════════════
// ⛔ NIC NIE ZNIKNĘŁO PO CICHU. Każdy wpis zdjęty niżej ma NAGROBEK z datą,
// powodem i adresem, pod którym rzecz stoi dziś (albo z decyzją, że nie stoi
// nigdzie). Rejestr ma opisywać ekran, jaki JEST — martwy wpis znaczy, że
// strażnik pilnuje ekranu sprzed roku i nie zapali się na niczym.
//
// ── CZTERY WPISY ZDJĘTE 18.08.2026 ─────────────────────────────────
//  1. `styles.heroGoal` — kafelek wąskiego gardła (190 dp).
//     ZDJĘTY przez pas A1: makieta v3 NIE MA na „Dziś" żadnego kafla celu —
//     „Dziś" odpowiada na „co dziś zrobić", nie „nad czym pracujesz".
//     GDZIE JEST: wąskie gardło → ekran „Profil" (`app/(tabs)/ja.tsx`,
//     `deficitLabels` + arkusz „Skąd bierze się trafność").
//  2. `styles.glosCard` — karta głosu tygodnia (83 dp).
//     ⭐ NIE ZNIKNĘŁA — ZOSTAŁA WCHŁONIĘTA: `glos.tytul` i `glos.tresc` rysują
//     się co do znaku WEWNĄTRZ `styles.odpowiedzCard`, bo to ten sam gatunek
//     zdania co „co dziś najważniejsze", a makieta ma tu JEDEN blok, nie dwa.
//     Pilnuje tego asercja (T3) w `lib/jednaOdpowiedz.selftest.ts`.
//  3. `styles.pomocCard` — punkt pomocy (96 dp).
//     ZDJĘTY DECYZJĄ KUBY z 17.08.2026, cytat:
//       „najważniejsza jest prostota. Nie chcę, żebyś nawrzucał mi tam rzeczy
//        takich jak jakaś linia telefoniczna pomocy. Czyste «mięcho» sportowe."
//     GDZIE JEST: ścieżka kryzysowa żyje z tyłu, uruchamiana danymi; jedyne
//     wejście z ekranu stoi w „Profilu" (`otworzPunktPomocy` w `ja.tsx`).
//     ⛔ Na „Dziś" nie ma go i nie ma prawa wrócić.
//  4. `LivingDiagnosisPulseCard` — karta pulsu diagnozy żywej (442 dp).
//     ZDJĘTA przez pas A1: zamrożona od 06.08.2026
//     (`LIVING_DIAGNOSIS_PULSE_ENABLED = false`), rysuje `null`, a miara liczy
//     najgorszy przypadek — 442 dp z budżetu 850 na rzecz, której nikt nie widzi.
//     GDZIE JEST: nigdzie; pilnuje tego zapadka w `lib/livingDiagnosisCascade.selftest.ts`,
//     związana z flagą zamrożenia.
//
// ── CO DOSZŁO ──────────────────────────────────────────────────────
// `styles.naglowekDnia`, `styles.seg`, `styles.sectionLabel`, `styles.kafel`,
// `styles.inlineLink`, `styles.licznikPodpis` — sześć wpisów opisujących
// kształt ekranu po przebudowie. ⚠️ Dwa dawne wpisy opisowe („Dziennik",
// „Dziś w kalendarzu") zastąpione znacznikiem `styles.kafel`, bo tamte
// pasowały do KOMENTARZY w pliku, a nie do żadnego bloku ekranu — czyli
// nie rozpoznawały niczego.
export const REJESTR_ELEMENTOW_DZIS: ElementDzis[] = [
  { znacznik: 'styles.naglowekDnia', coTo: 'Nagłówek dnia: tytuł ekranu i dzisiejsza data, jeden blok.', wJednejOdpowiedzi: false },
  { znacznik: 'styles.eyebrow', coTo: 'Dzisiejsza data nad tytułem.', wJednejOdpowiedzi: false },
  { znacznik: 'styles.title', coTo: 'Tytuł ekranu — „Dziś" albo „Tydzień", zależnie od przełącznika.', wJednejOdpowiedzi: false },
  { znacznik: 'styles.seg', coTo: 'Przełącznik Dziś / Tydzień. ⭐ Od 18.08.2026 stoi NA GÓRZE EKRANU — do tej pory był zakładką wewnątrz karty, 4 663 dp w głąb, więc zawodnik nie wiedział, że widok tygodnia istnieje.', wJednejOdpowiedzi: false },
  { znacznik: 'styles.odpowiedzCard', coTo: 'JEDNA ODPOWIEDŹ: co dziś zrobić · dlaczego akurat to · co to zmieni. ⭐ Od 18.08.2026 wchłania też głos tygodnia — ten sam gatunek zdania, jeden blok zamiast dwóch.', wJednejOdpowiedzi: true },
  { znacznik: 'RecommendationCard', coTo: 'Treść i przyciski rekomendacji — WEWNĄTRZ jednej odpowiedzi, gdy to ona jest źródłem.', wJednejOdpowiedzi: true },
  { znacznik: 'styles.hintBox', coTo: 'Treść ZAWSZE WIDOCZNA (bezpieczeństwo, telefon zaufania). ⚠️ NIE jest podpowiedzią dnia — ta weszła do jednej odpowiedzi. Zostaje osobno, bo jest funkcją bezpieczeństwa, nie treścią o pracy.', wJednejOdpowiedzi: false },
  // ⭐ PAS W1 18.08.2026 (D-2) — TRZY FAKTY O DNIU. Blok, którego na tym
  // ekranie NIE BYŁO w ogóle: makieta v3 rysuje go od początku (`czteryInfo`,
  // 86 dp), a produkt nie miał ani jednego wiersza o dniu.
  { znacznik: 'renderTrzyFakty', coTo: 'Trzy fakty o dniu: Obciążenie · Napięcie · Z Twoich wpisów. ⛔ Kropka jest jedna i taka sama niezależnie od tego, ile dzień waży (D4) — barwienie kropki wg progu byłoby oceną liczby kolorem.', wJednejOdpowiedzi: false },
  { znacznik: 'styles.sectionLabel', coTo: 'Etykieta sekcji „Twój dzień" — nad kaflami dnia.', wJednejOdpowiedzi: false },
  // ⭐ PAS W1 18.08.2026 (D-3, D-4, D-5) — JEDEN RYSOWNIK KAFLA.
  { znacznik: 'renderKafel', coTo: 'Kafle dnia rysowane jednym producentem: lewa krawędź niesie RODZAJ pozycji (Z5), reszta ramki REJESTR (Z1), a plakietka STAN — trzy niezależne informacje, trzy niezależne nośniki (K4).', wJednejOdpowiedzi: false },
  { znacznik: 'styles.kafel', coTo: 'Kafle dnia: wpis do Dziennika (JEDYNE wejście do Dziennika po zdjęciu jego zakładki) i wydarzenia z kalendarza, każde z informacją, czy czeka na ocenę.', wJednejOdpowiedzi: false },
  { znacznik: 'styles.inlineLink', coTo: 'Wiersz „Bez oceny: N rzeczy →" oraz wyjścia z pustki dnia — jedno dotknięcie do arkusza oceny albo do Kalendarza.', wJednejOdpowiedzi: false },
  // ⭐ PAS W1 18.08.2026 — CZTERY ELEMENTY GAŁĘZI „TYDZIEŃ". Do 18.08 nie było
  // ich w rejestrze, bo wycinanie bloków nie wchodziło do wnętrza tej gałęzi:
  // widok tygodnia mógł rosnąć po cichu, a rejestr o nim milczał.
  { znacznik: 'styles.card', coTo: 'Obudowa stanu „nie udało się odczytać tygodnia" — ⛔ nieudany odczyt NIE JEST pustym tygodniem i ma własne zdanie (R5).', wJednejOdpowiedzi: false },
  { znacznik: 'styles.kartaTydzienZakres', coTo: 'Zakres dat tygodnia („14–20 SIERPNIA") nad wierszami dni.', wJednejOdpowiedzi: false },
  { znacznik: 'tydzienBiezacy.zdanie', coTo: 'Jedno zdanie o tygodniu. ⛔ Powstaje albo nie powstaje — nigdy nie jest ogólne.', wJednejOdpowiedzi: false },
  { znacznik: 'renderWierszDnia', coTo: 'Siedem wierszy dni. Każdy niesie słupek obciążenia (wysokość i nasycenie mówią to samo — K4), plakietkę rejestru pod słupkiem i opis dnia. ⛔ Zero przekreśleń: nieobecność jest wiedzą, nie karą (Z7).', wJednejOdpowiedzi: false },
  { znacznik: 'styles.licznikPodpis', coTo: 'Przypis: „Ocena należy do rzeczy: dotykasz kafla i mówisz, jak poszło."', wJednejOdpowiedzi: false },
];
