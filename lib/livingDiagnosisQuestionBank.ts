// Bank pytań "diagnozy żywej" (Funkcja 10, część 2) — jedno pytanie bazowe
// (qs[0]) na segment, treść przeniesiona 1:1 z SEGS w gamechange-diagnoza/
// index.html (weryfikowane fresh z produkcyjnego kodu 06.08.2026, nie z
// pamięci) — NIE parafrazowana, zgodnie z wyraźnym wymogiem briefu
// ("dokładnie to samo pytanie podstawowe, dla czystej linii trendu w
// czasie"). Świadomie NIE zawiera qs[1] ani pytań pogłębiających — diagnoza
// żywa pyta wyłącznie o pytanie bazowe (INTEGRACJA_DIAGNOZA_ZYWA.md,
// decyzja 4).
//
// `dir` zachowane 1:1 z index.html mimo że NIE jest używane przy zapisie
// pojedynczej odpowiedzi (response_value to surowa wartość 1-6, odwracanie
// względem dir dzieje się wyłącznie przy agregacji w calcScores() w
// index.html) — potrzebne, gdyby w przyszłości powstał mechanizm
// agregujący pulsy tym samym wzorem co formalna ankieta.
//
// Warianty pozycyjne (`pos`) obecne WYŁĄCZNIE dla Filaru 1 (moc,
// wytrzymalosc, fizycznosc) i Filaru 2 (techFund, techSpec) — zgodnie z
// ustalonym już wzorcem ankiety formalnej (TRYB_MECZU_PRZEPROJEKTOWANIE_
// DECYZJE.md, punkt 8). Klucze `pos` to WEWNĘTRZNA reprezentacja snake_case
// z lib/positionProfiles.ts (getPositionWordingKey()), NIE indeksy liczbowe
// 0-7 z index.html — przemapowane raz, tutaj, żeby reszta appki mobilnej
// nigdy nie musiała znać numerycznego schematu index.html.

export type SegmentWording = { t: string; ctx: string };

export type LivingDiagnosisSegment = {
  segmentId: string;
  name: string;
  pillar: string;
  dir: 1 | -1;
  hasPositionVariants: boolean;
  universal: SegmentWording;
  positionVariants?: Record<string, SegmentWording>;
};

export const LIVING_DIAGNOSIS_QUESTION_BANK: Record<string, LivingDiagnosisSegment> = {
  moc: {
    segmentId: 'moc',
    name: 'MOC',
    pillar: 'Filar 1 — Dominacja fizyczna',
    dir: 1,
    hasPositionVariants: true,
    universal: {
      t: 'Jak często wygrywasz wyścig do piłki z rywalem i docierasz do niej jako pierwszy?',
      ctx: 'Porównaj się z rywalem. Kto częściej dociera do piłki jako pierwszy?',
    },
    positionVariants: {
      bramkarz: { t: 'Jak często przy wyjściu do piłki (po dośrodkowaniu, rzucie wolnym lub podaniu za linię obrony) docierasz do niej przed rywalem?', ctx: 'Czy Twoje wyjście jest na tyle szybkie, że rywal traci szansę, zanim dotrze do piłki?' },
      obronca_srodkowy: { t: 'Jak często, gdy napastnik zmienia kierunek lub rusza do biegu, wracasz do właściwej pozycji, zanim stworzy zagrożenie?', ctx: 'Czy mimo ruchu napastnika potrafisz szybko wrócić do właściwego ustawienia?' },
      obronca_boczny: { t: 'Jak często wygrywasz wyścig do piłki granej w Twój korytarz przy linii bocznej — docierasz do niej pierwszy?', ctx: 'Pomyśl o długim podaniu lub piłce zagranej za linię obrony na Twoją stronę. Kto częściej dociera do niej pierwszy?' },
      pomocnik_defensywny: { t: 'Jak często docierasz pierwszy do luźnej piłki tuż przed polem karnym, zanim zdąży do niej rywal?', ctx: 'To Twoja strefa – piłka odbita, niczyja albo taka, nad którą nikt nie ma kontroli. Liczy się, kto pierwszy ją przejmie.' },
      pomocnik_srodkowy: { t: 'Jak często w pressingu dobiegasz do rywala na tyle szybko, że odbierasz mu czas na spokojne rozegranie piłki?', ctx: 'Pomyśl o sytuacjach, w których doskakujesz do rywala. Czy robisz to na tyle szybko, że nie ma czasu spokojnie zagrać piłki?' },
      pomocnik_ofensywny: { t: 'Jak często wygrywasz wyścig do piłki podanej między liniami obrony rywala — docierasz do niej pierwszy?', ctx: 'Pomyśl o podaniu między liniami. Czy zazwyczaj docierasz do piłki, zanim obrońca zdąży zareagować?' },
      skrzydlowy: { t: 'Jak często wygrywasz wyścig do piłki granej w przestrzeń za plecami obrońcy?', ctx: 'Pomyśl o piłce zagranej za plecy obrońcy. Kto częściej dociera do niej pierwszy – Ty czy obrońca?' },
      napastnik: { t: 'Jak często po zmianie kierunku lub nagłym odejściu od obrońcy zyskujesz przewagę, której obrońca nie jest w stanie od razu odrobić?', ctx: 'Pomyśl o pierwszych krokach po zmianie kierunku. Czy zazwyczaj dają Ci przewagę, której obrońca nie jest w stanie szybko zniwelować?' },
    },
  },

  wytrzymalosc: {
    segmentId: 'wytrzymalosc',
    name: 'WYTRZYMAŁOŚĆ',
    pillar: 'Filar 1 — Dominacja fizyczna',
    dir: 1,
    hasPositionVariants: true,
    universal: {
      t: 'Jak często w ostatnich 15 minutach meczu jesteś w stanie utrzymać taką samą intensywność gry jak na jego początku?',
      ctx: 'Pomyśl o końcówkach meczów. Czy nadal równie często i intensywnie biegasz, przyspieszasz oraz włączasz się do gry, czy wyraźnie ograniczasz swoją aktywność z powodu zmęczenia?',
    },
    positionVariants: {
      bramkarz: { t: 'Jak często w ostatnich 15 minutach meczu jesteś w stanie utrzymać taką samą gotowość do interwencji i aktywność w organizowaniu obrony jak na początku meczu?', ctx: 'Pomyśl o końcówkach meczów. Czy nadal jesteś stale gotowy do interwencji i równie aktywnie kierujesz ustawieniem obrony?' },
      obronca_srodkowy: { t: 'Jak często w ostatnich 15 minutach meczu utrzymujesz taką samą intensywność doskoków, powrotów i zabezpieczania przestrzeni jak na początku meczu?', ctx: 'Pomyśl o końcówce meczu. Czy nadal równie szybko doskakujesz do rywala, wracasz na pozycję i asekurujesz partnerów?' },
      obronca_boczny: { t: 'Jak często w ostatnich 15 minutach meczu jesteś w stanie z taką samą intensywnością wspierać atak i wracać do obrony jak na początku meczu?', ctx: 'Czy pod koniec meczu nadal regularnie wykonujesz oba zadania, czy zaczynasz ograniczać jedno z nich z powodu zmęczenia?' },
      pomocnik_defensywny: { t: 'Jak często w ostatnich 15 minutach meczu utrzymujesz taką samą intensywność w odbiorze piłki i zabezpieczaniu przestrzeni przed linią obrony jak na początku meczu?', ctx: 'Czy nadal równie często doskakujesz do rywali, przechwytujesz piłki i zabezpieczasz przestrzeń przed obroną?' },
      pomocnik_srodkowy: { t: 'Jak często w ostatnich 15 minutach meczu utrzymujesz taką samą intensywność gry w ataku i obronie jak na początku meczu?', ctx: 'Czy nadal równie często uczestniczysz w obu fazach gry, czy z powodu zmęczenia zaczynasz odpuszczać część swoich działań?' },
      pomocnik_ofensywny: { t: 'Jak często w ostatnich 15 minutach meczu utrzymujesz taką samą intensywność wychodzenia do gry i tworzenia przewagi jak na początku meczu?', ctx: 'Czy nadal równie często pokazujesz się do gry, wychodzisz na pozycję i szukasz możliwości stworzenia okazji?' },
      skrzydlowy: { t: 'Jak często w ostatnich 15 minutach meczu utrzymujesz taką samą intensywność sprintów, powrotów i pojedynków jak na początku meczu?', ctx: 'Czy nadal równie często wykonujesz sprinty do przodu i wracasz do obrony, czy wyraźnie ograniczasz swoją aktywność?' },
      napastnik: { t: 'Jak często w ostatnich 15 minutach meczu utrzymujesz taką samą intensywność pressingu, atakowania przestrzeni i wychodzenia do podań jak na początku meczu?', ctx: 'Czy nadal równie często inicjujesz pressing, wybiegasz za linię obrony i pokazujesz się do gry, czy robisz to coraz rzadziej z powodu zmęczenia?' },
    },
  },

  fizycznosc: {
    segmentId: 'fizycznosc',
    name: 'FIZYCZNOŚĆ',
    pillar: 'Filar 1 — Dominacja fizyczna',
    dir: 1,
    hasPositionVariants: true,
    universal: {
      t: 'Jak często czujesz, że dzięki swojej sile fizycznej masz przewagę nad zawodnikami, z którymi najczęściej rywalizujesz?',
      ctx: 'Pomyśl o zawodnikach, z którymi najczęściej trenujesz i grasz. Czy Twoja siła fizyczna daje Ci nad nimi wyraźną przewagę?',
    },
    positionVariants: {
      bramkarz: { t: 'Jak często czujesz, że dzięki swojej sile fizycznej masz przewagę nad innymi bramkarzami w sytuacjach wymagających dynamicznego odbicia, wyskoku i gry w powietrzu?', ctx: 'Pomyśl o sytuacjach typowych dla bramkarza. Czy Twoja siła fizyczna daje Ci wyraźną przewagę podczas interwencji?' },
      obronca_srodkowy: { t: 'Jak często czujesz, że dzięki swojej sile fizycznej masz przewagę nad napastnikami, z którymi najczęściej rywalizujesz?', ctx: 'Pomyśl o pojedynkach z napastnikami. Czy czujesz, że trudno jest Cię przepchnąć lub zdominować fizycznie?' },
      obronca_boczny: { t: 'Jak często czujesz, że dzięki swojej sile fizycznej masz przewagę nad skrzydłowymi, z którymi najczęściej rywalizujesz?', ctx: 'Pomyśl o pojedynkach przy linii bocznej. Czy Twoja siła pomaga Ci utrzymać pozycję i kontrolować rywala?' },
      pomocnik_defensywny: { t: 'Jak często czujesz, że dzięki swojej sile fizycznej masz przewagę nad zawodnikami, z którymi najczęściej walczysz w środku pola?', ctx: 'Pomyśl o najczęstszych kontaktowych sytuacjach w środku pola. Czy Twoja siła daje Ci w nich wyraźną przewagę?' },
      pomocnik_srodkowy: { t: 'Jak często czujesz, że dzięki swojej sile fizycznej masz przewagę nad pomocnikami, z którymi najczęściej rywalizujesz?', ctx: 'Pomyśl o sytuacjach, w których walczysz o utrzymanie piłki lub miejsca na boisku. Czy Twoja siła jest wtedy Twoim atutem?' },
      pomocnik_ofensywny: { t: 'Jak często czujesz, że dzięki swojej sile fizycznej masz przewagę nad zawodnikami próbującymi odebrać Ci piłkę?', ctx: 'Czy Twoja siła pomaga Ci utrzymać się przy piłce mimo presji rywala?' },
      skrzydlowy: { t: 'Jak często czujesz, że dzięki swojej sile fizycznej masz przewagę nad obrońcami, z którymi najczęściej rywalizujesz?', ctx: 'Pomyśl o pojedynkach jeden na jednego. Czy Twoja siła pomaga Ci utrzymać przewagę mimo kontaktu z obrońcą?' },
      napastnik: { t: 'Jak często czujesz, że dzięki swojej sile fizycznej masz przewagę nad obrońcami, z którymi najczęściej rywalizujesz?', ctx: 'Pomyśl o walce o pozycję i utrzymaniu piłki. Czy Twoja siła jest jednym z Twoich największych atutów?' },
    },
  },

  techFund: {
    segmentId: 'techFund',
    name: 'TECHNIKA FUND.',
    pillar: 'Filar 2 — Efektywność techniczna',
    dir: 1,
    hasPositionVariants: true,
    universal: {
      t: 'Jak często poprawnie wykonujesz swoje podstawowe zagrania, gdy masz czas i przestrzeń, bez presji rywala?',
      ctx: 'Pomyśl o spokojnych sytuacjach w meczu lub na treningu, gdy nikt nie wywiera na Tobie presji. Czy Twoja technika jest wtedy pewna i powtarzalna?',
    },
    positionVariants: {
      bramkarz: { t: 'Jak często poprawnie wykonujesz swoje podstawowe interwencje i rozegranie piłki, gdy nie jesteś pod presją rywali?', ctx: 'Pomyśl o standardowych, spokojnych sytuacjach. Czy Twoja technika jest wtedy pewna i powtarzalna?' },
      obronca_srodkowy: { t: 'Jak często poprawnie wykonujesz przyjęcia, podania i wybicia, gdy masz czas i przestrzeń?', ctx: 'Pomyśl o spokojnym rozegraniu od własnej bramki lub sytuacjach bez pressingu. Czy Twoje podstawowe zagrania są wtedy pewne?' },
      obronca_boczny: { t: 'Jak często poprawnie wykonujesz podania, dośrodkowania i przyjęcia piłki, gdy masz czas i przestrzeń?', ctx: 'Pomyśl o sytuacjach, w których możesz spokojnie przygotować zagranie. Czy wykonujesz je tak, jak planujesz?' },
      pomocnik_defensywny: { t: 'Jak często poprawnie wykonujesz pierwsze przyjęcie i podanie po odbiorze piłki, gdy nie jesteś pod presją?', ctx: 'Pomyśl o spokojnym rozpoczęciu akcji. Czy Twoje pierwsze zagranie jest wtedy pewne i dokładne?' },
      pomocnik_srodkowy: { t: 'Jak często poprawnie wykonujesz przyjęcia i podania, gdy masz czas na podjęcie decyzji?', ctx: 'Pomyśl o spokojnych fragmentach gry. Czy Twoja technika jest wtedy powtarzalna i dokładna?' },
      pomocnik_ofensywny: { t: 'Jak często poprawnie wykonujesz przyjęcie i pierwsze zagranie między liniami, gdy nie jesteś pod presją?', ctx: 'Pomyśl o sytuacjach, w których masz chwilę na działanie. Czy Twoja technika pozostaje wtedy pewna?' },
      skrzydlowy: { t: 'Jak często poprawnie wykonujesz przyjęcie piłki i pierwszy kontakt z nią, gdy masz przed sobą czas i przestrzeń?', ctx: 'Pomyśl o sytuacjach przed rozpoczęciem pojedynku 1 na 1. Czy pierwszy kontakt z piłką jest wtedy pewny?' },
      napastnik: { t: 'Jak często poprawnie wykonujesz przyjęcie, prowadzenie piłki i uderzenie, gdy nie jesteś pod presją obrońcy?', ctx: 'Pomyśl o spokojnych sytuacjach pod bramką lub poza polem karnym. Czy Twoje podstawowe zagrania są wtedy pewne?' },
    },
  },

  techSpec: {
    segmentId: 'techSpec',
    name: 'TECHNIKA SPEC.',
    pillar: 'Filar 2 — Efektywność techniczna',
    dir: 1,
    hasPositionVariants: true,
    universal: {
      t: 'Jak często Twoje zagrania dają partnerowi więcej czasu lub przestrzeni do dalszej gry?',
      ctx: 'Pomyśl o sytuacjach, w których po Twoim zagraniu partner ma łatwiejszą grę niż miałeś Ty. Czy często tworzysz mu taką przewagę?',
    },
    positionVariants: {
      bramkarz: { t: 'Jak często Twoje rozegranie daje partnerowi więcej czasu lub przestrzeni do rozpoczęcia akcji?', ctx: 'Pomyśl o podaniach, wyrzutach i rozegraniu nogą. Czy po Twoim zagraniu partner może spokojnie kontynuować grę?' },
      obronca_srodkowy: { t: 'Jak często Twoje podania omijają pressing i dają partnerowi więcej czasu lub przestrzeni do dalszej gry?', ctx: 'Pomyśl o wyprowadzeniu piłki spod pressingu. Czy Twoje podania poprawiają sytuację partnera?' },
      obronca_boczny: { t: 'Jak często Twoje dośrodkowania lub podania w pole karne tworzą partnerowi lepszą sytuację do zakończenia akcji?', ctx: 'Czy po Twoim zagraniu partner ma realnie większą szansę na stworzenie zagrożenia pod bramką?' },
      pomocnik_defensywny: { t: 'Jak często Twoje pierwsze podanie po odzyskaniu piłki daje partnerowi więcej czasu lub przestrzeni do rozpoczęcia ataku?', ctx: 'Pomyśl o momentach tuż po odbiorze piłki. Czy Twoje pierwsze zagranie ułatwia drużynie przejście do ataku?' },
      pomocnik_srodkowy: { t: 'Jak często Twoje podania dają partnerowi więcej czasu, przestrzeni lub możliwość przyspieszenia akcji?', ctx: 'Czy Twoje zagrania sprawiają, że partner znajduje się w lepszej sytuacji niż przed otrzymaniem piłki?' },
      pomocnik_ofensywny: { t: 'Jak często Twoje podania tworzą partnerowi dogodną sytuację do oddania strzału lub stworzenia kolejnej przewagi?', ctx: 'Pomyśl o ostatnich podaniach i zagraniach między liniami. Czy realnie poprawiają sytuację partnera?' },
      skrzydlowy: { t: 'Jak często po Twoim dryblingu lub podaniu partner otrzymuje więcej czasu lub przestrzeni do dalszej gry?', ctx: 'Czy dzięki Twoim działaniom obrona rywala zostaje na tyle przesunięta, że partner ma łatwiejszą sytuację?' },
      napastnik: { t: 'Jak często Twój ruch bez piłki tworzy partnerowi więcej czasu lub przestrzeni do rozegrania lub zakończenia akcji?', ctx: 'Pomyśl o wybiegnięciach, odejściach i związaniu obrońców. Czy Twoje ruchy ułatwiają grę partnerom?' },
    },
  },

  tolerancja: {
    segmentId: 'tolerancja',
    name: 'TOL. OBCIĄŻEŃ',
    pillar: 'Filar 3 — Trwałość organizmu',
    dir: -1,
    hasPositionVariants: false,
    universal: {
      t: 'Jak często po kilku dniach intensywnych treningów to samo miejsce w Twoim ciele znowu zaczyna sprawiać problemy?',
      ctx: 'Może to być ból, sztywność, napięcie lub wyraźny dyskomfort. Nie chodzi o pojedynczy uraz, ale o miejsce, które regularnie odzywa się przy większych obciążeniach.',
    },
  },

  regeneracja: {
    segmentId: 'regeneracja',
    name: 'REGENERACJA',
    pillar: 'Filar 3 — Trwałość organizmu',
    dir: 1,
    hasPositionVariants: false,
    universal: {
      t: 'Jak często przed kolejnym wymagającym treningiem lub meczem czujesz, że Twoje ciało jest gotowe do ponownego intensywnego wysiłku?',
      ctx: 'Zmęczenie zaraz po treningu lub meczu jest czymś normalnym. Pomyśl o tym, czy przed kolejnym intensywnym treningiem lub meczem czujesz, że Twoje ciało jest gotowe do ponownego wysiłku.',
    },
  },

  odpornosc: {
    segmentId: 'odpornosc',
    name: 'ODPORNOŚĆ',
    pillar: 'Filar 3 — Trwałość organizmu',
    dir: -1,
    hasPositionVariants: false,
    universal: {
      t: 'Jak często w ciągu sezonu opuszczasz treningi z powodu przeziębienia, infekcji lub innej choroby?',
      ctx: 'Pomyśl o całym sezonie. Nie chodzi o kontuzje, ale o choroby, które uniemożliwiły Ci normalne trenowanie lub udział w meczu.',
    },
  },

  odzywianie: {
    segmentId: 'odzywianie',
    name: 'ODŻYWIENIE',
    pillar: 'Filar 3 — Trwałość organizmu',
    dir: 1,
    hasPositionVariants: false,
    universal: {
      t: 'Jak często w końcowej fazie meczu nadal czujesz, że masz energię do wykonania sprintu z pełną intensywnością?',
      ctx: 'Nie chodzi o motywację ani charakter. Pomyśl o tym, czy pod koniec meczu Twoje nogi nadal są w stanie przyspieszyć tak samo mocno jak na początku.',
    },
  },

  koncentracja: {
    segmentId: 'koncentracja',
    name: 'KONCENTRACJA',
    pillar: 'Filar 4 — Mentalność',
    dir: -1,
    hasPositionVariants: false,
    universal: {
      t: 'Jak często po błędzie lub innym trudnym momencie w meczu Twoje myśli nadal do niego wracają, przez co trudniej Ci w pełni skupić się na kolejnej akcji?',
      ctx: 'Trudnym momentem może być Twój błąd, decyzja sędziego, krzyk trenera, prowokacja rywala lub reakcja kibiców. Pomyśl, czy szybko wracasz do pełnego skupienia, czy przez chwilę nadal myślisz o tym, co się wydarzyło.',
    },
  },

  mental: {
    segmentId: 'mental',
    name: 'STAN MENTALNY',
    pillar: 'Filar 4 — Mentalność',
    dir: 1,
    hasPositionVariants: false,
    universal: {
      t: 'Jak często w trudnych momentach meczu sam szukasz wpływu na grę — prosisz o piłkę, podejmujesz decyzje i wychodzisz z inicjatywą?',
      ctx: 'Trudnym momentem może być strata bramki, Twój błąd, przewaga rywala lub duża presja wyniku. Pomyśl, czy wtedy chcesz mieć wpływ na przebieg gry, czy wolisz oddać inicjatywę innym zawodnikom.',
    },
  },

  percepcja: {
    segmentId: 'percepcja',
    name: 'PERCEPCJA',
    pillar: 'Filar 5 — Boiskowa mądrość',
    dir: 1,
    hasPositionVariants: false,
    universal: {
      t: 'Jak często, gdy masz czas i przestrzeń, sprawdzasz, co dzieje się wokół Ciebie, zanim podejmiesz decyzję z piłką?',
      ctx: 'Chodzi o sprawdzanie, gdzie są partnerzy, rywale i wolna przestrzeń. Nie chodzi o to, co później zrobisz z tą informacją, ale o sam nawyk zbierania informacji z otoczenia.',
    },
  },

  decyzja: {
    segmentId: 'decyzja',
    name: 'SZYBKOŚĆ DECYZJI',
    pillar: 'Filar 5 — Boiskowa mądrość',
    dir: 1,
    hasPositionVariants: false,
    universal: {
      t: 'Jak często w sytuacji, którą dobrze znasz z wcześniejszych meczów, od razu wiesz, co zrobić?',
      ctx: 'Pomyśl o sytuacjach, które często powtarzają się podczas meczu. Czy od razu rozpoznajesz najlepsze rozwiązanie, czy za każdym razem musisz się nad nim zastanawiać?',
    },
  },
};

// Kolejność segmentów w rotacji (źródło 5 kaskady) — ta sama kolejność co
// SEGMENT_ORDER w matchQuestionBank.ts / public.segments.display_order
// (Domena 00), dla przewidywalności i spójności z Trybem Meczu.
export const LIVING_DIAGNOSIS_SEGMENT_ORDER = [
  'moc', 'wytrzymalosc', 'fizycznosc', 'techFund', 'techSpec',
  'tolerancja', 'regeneracja', 'odpornosc', 'odzywianie',
  'koncentracja', 'mental', 'percepcja', 'decyzja',
];

/** Wariant TREŚCI pytania: pozycja profilowa zawodnika, jeśli appka ją zna
 * i segment ma warianty pozycyjne — inaczej wersja uniwersalna. Diagnoza
 * żywa nie ma odpowiednika "dzisiejszej pozycji meczowej" (position_played_
 * today) — zawsze bierze pozycję z Profilu, zgodnie z tym, jak formalna
 * ankieta (getQuestion() w index.html) traktuje pytania POZA kontekstem
 * meczowym. */
export function resolveLivingDiagnosisWording(
  segmentId: string,
  wordingKey: string | null
): SegmentWording | null {
  const seg = LIVING_DIAGNOSIS_QUESTION_BANK[segmentId];
  if (!seg) return null;
  if (seg.hasPositionVariants && wordingKey && seg.positionVariants?.[wordingKey]) {
    return seg.positionVariants[wordingKey];
  }
  return seg.universal;
}
