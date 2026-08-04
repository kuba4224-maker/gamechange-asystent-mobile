// Bank pytań segmentowych trybu Mecz — WSZYSTKIE 13 SEGMENTÓW.
// Źródło: TRYB_MECZU_PRZEPROJEKTOWANIE_DECYZJE.md, punkt 10 — treść
// przeniesiona 1:1 (nie parafrazowana), zgodnie z wyraźną instrukcją w
// dokumencie decyzji ("treść była już wielokrotnie weryfikowana i
// poprawiana w tej sesji").
//
// Wzorem SEGS z index.html (ankieta diagnostyczna), dostosowane do
// formatu zdarzenia meczowego (wystąpiło dziś/nie, z jakim skutkiem)
// zamiast skali częstości 1-6 — patrz punkt 8 dokumentu decyzji.
//
// Klucze positionVariants to WEWNĘTRZNA reprezentacja snake_case,
// dokładnie ta sama co POSITION_MAP_TEMP w lib/positionProfiles.ts —
// NIE polskie etykiety z profilu. Tłumaczenie polska etykieta ->
// snake_case robi getPositionWordingKey() w lib/positionProfiles.ts;
// ten plik nigdy nie widzi polskich etykiet bezpośrednio.

export type SegmentAnswer = { label: string; code: string };
export type SegmentWording = { t: string; ctx: string };
export type FollowupQuestion = {
  // Kod odpowiedzi bazowej, który odsłania to pytanie pogłębiające.
  triggerCode: string;
  t: string;
  answers: SegmentAnswer[];
};

export type SegmentQuestion = {
  segmentId: string;
  hasPositionVariants: boolean;
  universal: SegmentWording;
  // Tylko gdy hasPositionVariants === true. Klucze: patrz POSITION_MAP_TEMP.
  positionVariants?: Record<string, SegmentWording>;
  answers: SegmentAnswer[];
  followup?: FollowupQuestion;
  // Segment specjalny: regeneracja. Pytanie bazowe ŻYJE w rdzeniu karty
  // (entered_recovery_state) — ten wpis w banku niesie WYŁĄCZNIE
  // pogłębienie, nigdy nowego pytania bazowego. Patrz punkt 10 dokumentu
  // decyzji, sekcja Regeneracja, i Krok 4 UI.
  noBaseQuestion?: boolean;
};

const NO_RECALL_LATE_SCAN = { label: 'Nie pamiętam', code: 'no_recall' };

export const MATCH_QUESTION_BANK: Record<string, SegmentQuestion> = {
  // ── Filar 5 — Boiskowa mądrość ──────────────────────────────
  percepcja: {
    segmentId: 'percepcja',
    hasPositionVariants: false,
    universal: {
      t: 'Czy dziś zdarzyło się, że dopiero po otrzymaniu piłki zacząłeś się rozglądać, co kosztowało Cię czas albo samą piłkę?',
      ctx: 'Chodzi o moment, gdy nie wiedziałeś jeszcze co zrobisz z piłką, dopóki faktycznie do Ciebie nie dotarła — musiałeś dopiero wtedy sprawdzić, gdzie są koledzy i rywale.',
    },
    answers: [
      { label: 'Tak, i straciłem przez to czas albo piłkę', code: 'late_scan_cost' },
      { label: 'Tak, ale zdążyłem się rozejrzeć zanim to zaszkodziło', code: 'late_scan_recovered' },
      { label: 'Nie, zwykle wiedziałem co zrobię, zanim piłka do mnie doszła', code: 'pre_scanned' },
      { label: 'Miałem za mało kontaktu z piłką, żeby to ocenić', code: 'insufficient_sample' },
      NO_RECALL_LATE_SCAN,
    ],
    followup: {
      triggerCode: 'late_scan_cost',
      t: 'Co działo się tuż przed tą sytuacją?',
      answers: [
        { label: 'Rywal był blisko, czułem presję', code: 'rival_pressure' },
        { label: 'Byłem sam, miałem dużo czasu', code: 'alone_time' },
        { label: 'Gra była bardzo szybka, dużo się działo', code: 'fast_game' },
        { label: 'Nie potrafię wskazać', code: 'unspecified' },
      ],
    },
  },

  decyzja: {
    segmentId: 'decyzja',
    hasPositionVariants: false,
    universal: {
      t: 'Czy dziś zdarzyło Ci się zawahać z piłką przy nodze, czyli zwlekać z decyzją zamiast zagrać od razu?',
      ctx: 'Zawahanie to moment kiedy zwlekałeś, zastanawiałeś się za długo, albo zatrzymałeś piłkę zamiast zagrać od razu.',
    },
    answers: [
      { label: 'Tak, zawahałem się', code: 'hesitated' },
      { label: 'Nie, decyzje przychodziły szybko', code: 'decisive' },
      { label: 'Nie miałem dziś takich sytuacji', code: 'no_occurrence' },
      { label: 'Nie pamiętam', code: 'occurred_no_recall' },
    ],
    followup: {
      triggerCode: 'hesitated',
      t: 'W jakim momencie meczu to się zdarzyło?',
      answers: [
        { label: 'Na początku meczu', code: 'early' },
        { label: 'W środkowej części', code: 'middle' },
        { label: 'Pod koniec, przy zmęczeniu', code: 'late_fatigue' },
        { label: 'Nie potrafię wskazać', code: 'unspecified' },
      ],
    },
  },

  // ── Filar 4 — Mentalność ────────────────────────────────────
  mental: {
    segmentId: 'mental',
    hasPositionVariants: false,
    universal: {
      t: 'Czy po jakimś swoim błędzie zdarzyło Ci się grać przez chwilę ostrożniej niż zwykle, żeby nie popełnić kolejnego?',
      ctx: "Chodzi o odczuwalną zmianę — np. unikanie ryzykownego podania czy dryblingu 'żeby nie zepsuć' kolejnej akcji, zamiast grać tak jak zwykle.",
    },
    answers: [
      { label: 'Tak, zauważyłem że grałem ostrożniej po błędzie', code: 'became_cautious' },
      { label: 'Popełniłem błąd, ale grałem dalej tak samo jak wcześniej', code: 'bounced_back' },
      { label: 'Nie popełniłem dziś żadnego zauważalnego błędu', code: 'no_occurrence' },
      { label: 'Popełniłem błąd, ale nie pamiętam czy wpłynęło to na dalszą grę', code: 'occurred_no_recall' },
    ],
    followup: {
      triggerCode: 'became_cautious',
      t: 'Co najbardziej wpłynęło na to, że grałeś ostrożniej?',
      answers: [
        { label: 'Reakcja trenera lub kibiców', code: 'coach_or_crowd' },
        { label: 'Reakcja kolegów z drużyny', code: 'teammates' },
        { label: 'Moja własna złość na siebie', code: 'self_anger' },
        { label: 'Nie potrafię wskazać', code: 'unspecified' },
      ],
    },
  },

  koncentracja: {
    segmentId: 'koncentracja',
    hasPositionVariants: false,
    universal: {
      t: "Czy dziś zdarzył Ci się moment, gdzie Twoja uwaga 'odpłynęła' od gry, np. zacząłeś myśleć o czymś zupełnie innym niż to co się dzieje na boisku?",
      ctx: 'Nie chodzi o reakcję na własny błąd, o to pytamy osobno — tylko o moment, gdy przestałeś śledzić grę, bez względu na przyczynę.',
    },
    answers: [
      { label: 'Tak, i długo mi zajęło zanim wróciłem do gry', code: 'drifted_slow_return' },
      { label: 'Tak, ale szybko wróciłem do gry', code: 'drifted_quick_return' },
      { label: 'Nie, byłem skupiony przez cały mecz', code: 'stayed_focused' },
      { label: 'Nie pamiętam', code: 'no_recall' },
    ],
    followup: {
      triggerCode: 'drifted_slow_return',
      t: 'Co spowodowało, że Twoja uwaga odpłynęła?',
      answers: [
        { label: 'Nudny fragment meczu, mało się działo w mojej okolicy', code: 'boring_stretch' },
        { label: 'Coś zewnętrznego — trener, kibice, sędzia', code: 'external' },
        { label: 'Zmęczenie', code: 'fatigue' },
        { label: 'Nie potrafię wskazać', code: 'unspecified' },
      ],
    },
  },

  // ── Filar 1 — Dominacja fizyczna (z wariantami pozycyjnymi) ─
  moc: {
    segmentId: 'moc',
    hasPositionVariants: true,
    universal: {
      t: 'Czy dziś zdarzyła się sytuacja, gdzie rywal wygrał z Tobą wyścig do piłki, mimo że miałeś realną szansę dobiec pierwszy?',
      ctx: 'Chodzi o moment, gdzie obaj mieliście podobny dystans do piłki, a rywal był szybszy.',
    },
    positionVariants: {
      bramkarz: {
        t: 'Czy dziś zdarzyła się sytuacja, gdzie przy dośrodkowaniu, rzucie wolnym lub podaniu za linię obrony nie zdążyłeś wyjść do piłki przed rywalem, mimo że miałeś szansę?',
        ctx: 'Chodzi o Twoje wyjście z bramki — czy rywal był przy piłce pierwszy, mimo że dystans dawał Ci realną szansę.',
      },
      obronca_srodkowy: {
        t: 'Czy dziś zdarzyła się sytuacja, gdzie napastnik zmienił kierunek lub ruszył do biegu, a Ty nie zdążyłeś wrócić na pozycję, zanim stworzył zagrożenie?',
        ctx: "Chodzi o moment, gdzie napastnik Cię 'rozpędził' zmianą kierunku, a Twój powrót do ustawienia był za wolny.",
      },
      obronca_boczny: {
        t: 'Czy dziś zdarzyła się sytuacja, gdzie przegrałeś wyścig do piłki granej w Twój korytarz przy linii bocznej?',
        ctx: 'Chodzi o długą piłkę zagraną w Twoją strefę przy bocznej linii — czy rywal dotarł do niej pierwszy, mimo że miałeś realną szansę.',
      },
      pomocnik_defensywny: {
        t: 'Czy dziś zdarzyła się sytuacja, gdzie rywal dotarł przed Tobą do luźnej piłki tuż przed polem karnym?',
        ctx: 'Chodzi o piłkę odbitą, niczyją, w Twojej strefie przed polem karnym — czy rywal przejął ją pierwszy, mimo że miałeś szansę dobiec.',
      },
      pomocnik_srodkowy: {
        t: 'Czy dziś zdarzyła się sytuacja, gdzie w pressingu nie zdążyłeś dobiec do rywala na tyle szybko, żeby odebrać mu czas na spokojne zagranie?',
        ctx: 'Chodzi o moment pressingu — czy rywal zdążył spokojnie rozegrać piłkę, zanim go dopadłeś.',
      },
      pomocnik_ofensywny: {
        t: 'Czy dziś zdarzyła się sytuacja, gdzie przegrałeś wyścig do piłki podanej między liniami obrony rywala?',
        ctx: 'Chodzi o piłkę zagraną między liniami — czy obrońca dotarł do niej pierwszy, mimo że miałeś realną szansę.',
      },
      skrzydlowy: {
        t: 'Czy dziś zdarzyła się sytuacja, gdzie przegrałeś wyścig do piłki granej w przestrzeń za plecami obrońcy?',
        ctx: 'Chodzi o piłkę zagraną w przestrzeń za obrońcę — czy on dotarł do niej pierwszy, mimo że miałeś realną szansę.',
      },
      napastnik: {
        t: 'Czy dziś zdarzyła się sytuacja, gdzie po zmianie kierunku lub odejściu od obrońcy nie zdołałeś zbudować realnej przewagi, mimo że próbowałeś?',
        ctx: 'Chodzi o pierwsze metry po zmianie kierunku — czy dawały Ci wyraźną przewagę, czy obrońca od razu ją odrabiał.',
      },
    },
    answers: [
      { label: 'Tak, rywal był szybszy / nie zdążyłem', code: 'lost_race' },
      { label: 'Miałem taką sytuację i wygrałem ją', code: 'won_race' },
      { label: 'Nie miałem dziś takiej sytuacji', code: 'no_occurrence' },
      { label: 'Nie pamiętam', code: 'no_recall' },
    ],
    followup: {
      triggerCode: 'lost_race',
      t: 'W jakim momencie meczu to się zdarzyło?',
      answers: [
        { label: 'Na początku meczu', code: 'early' },
        { label: 'W środkowej części', code: 'middle' },
        { label: 'Pod koniec, przy zmęczeniu', code: 'late_fatigue' },
        { label: 'Nie potrafię wskazać', code: 'unspecified' },
      ],
    },
  },

  wytrzymalosc: {
    segmentId: 'wytrzymalosc',
    hasPositionVariants: true,
    universal: {
      t: 'Czy w ostatnich ~15 minutach meczu zauważyłeś u siebie wyraźny spadek intensywności względem początku meczu?',
      ctx: 'Chodzi o odczuwalną różnicę — czy biegałeś, przyspieszałeś i włączałeś się do gry wyraźnie rzadziej niż na początku, z powodu zmęczenia.',
    },
    positionVariants: {
      bramkarz: {
        t: 'Czy w ostatnich ~15 minutach meczu zauważyłeś spadek swojej gotowości do interwencji i aktywności w organizowaniu obrony, względem początku meczu?',
        ctx: 'Chodzi o to, czy pod koniec meczu byłeś nadal tak samo czujny i aktywny głosowo/organizacyjnie, czy zaczynałeś to ograniczać z powodu zmęczenia.',
      },
      obronca_srodkowy: {
        t: 'Czy w ostatnich ~15 minutach meczu zauważyłeś spadek intensywności swoich doskoków, powrotów na pozycję i zabezpieczania przestrzeni, względem początku meczu?',
        ctx: 'Chodzi o to, czy pod koniec meczu nadal równie szybko doskakiwałeś do rywala i wracałeś na pozycję, czy zacząłeś to wyraźnie ograniczać.',
      },
      obronca_boczny: {
        t: 'Czy w ostatnich ~15 minutach meczu zauważyłeś spadek intensywności wspierania ataku i powrotów do obrony, względem początku meczu?',
        ctx: 'Chodzi o to, czy pod koniec meczu nadal równie często włączałeś się ofensywnie i wracałeś defensywnie, czy zacząłeś ograniczać jedno z tych zadań.',
      },
      pomocnik_defensywny: {
        t: 'Czy w ostatnich ~15 minutach meczu zauważyłeś spadek intensywności w odbiorze piłki i zabezpieczaniu przestrzeni przed obroną, względem początku meczu?',
        ctx: 'Chodzi o to, czy pod koniec meczu nadal równie często doskakiwałeś do rywali i przechwytywałeś piłki, czy zacząłeś to wyraźnie ograniczać.',
      },
      pomocnik_srodkowy: {
        t: 'Czy w ostatnich ~15 minutach meczu zauważyłeś spadek intensywności swojej gry zarówno w ataku, jak i w obronie, względem początku meczu?',
        ctx: 'Chodzi o to, czy pod koniec meczu nadal równie aktywnie uczestniczyłeś w obu fazach gry, czy zacząłeś odpuszczać część działań z powodu zmęczenia.',
      },
      pomocnik_ofensywny: {
        t: 'Czy w ostatnich ~15 minutach meczu zauważyłeś spadek intensywności wychodzenia do gry i szukania sytuacji do stworzenia przewagi, względem początku meczu?',
        ctx: 'Chodzi o to, czy pod koniec meczu nadal równie często pokazywałeś się do gry i szukałeś okazji, czy zacząłeś to ograniczać z powodu zmęczenia.',
      },
      skrzydlowy: {
        t: 'Czy w ostatnich ~15 minutach meczu zauważyłeś spadek intensywności swoich sprintów, powrotów i pojedynków, względem początku meczu?',
        ctx: 'Chodzi o to, czy pod koniec meczu Twoje sprinty do przodu i powroty do obrony były nadal tak samo intensywne, czy wyraźnie ograniczyłeś swoją aktywność.',
      },
      napastnik: {
        t: 'Czy w ostatnich ~15 minutach meczu zauważyłeś spadek intensywności swojego pressingu, atakowania przestrzeni i wychodzenia do podań, względem początku meczu?',
        ctx: 'Chodzi o to, czy pod koniec meczu nadal równie często inicjowałeś pressing i wybiegałeś za linię obrony, czy robiłeś to coraz rzadziej z powodu zmęczenia.',
      },
    },
    answers: [
      { label: 'Tak, wyraźnie spadła', code: 'significant_drop' },
      { label: 'Trochę spadła, ale niewiele to zmieniło', code: 'mild_drop' },
      { label: 'Nie, utrzymałem taką samą intensywność', code: 'maintained' },
      { label: 'Nie grałem w tej części meczu (zmiana/wejście z ławki)', code: 'not_applicable' },
      { label: 'Nie pamiętam / trudno powiedzieć', code: 'no_recall' },
    ],
    followup: {
      triggerCode: 'significant_drop',
      t: 'Czy to zdarza Ci się w większości ostatnich meczów, czy to był wyjątek dzisiaj?',
      answers: [
        { label: 'Zdarza się w większości meczów', code: 'chronic' },
        { label: 'To był wyjątek, zwykle tak nie mam', code: 'exception' },
        { label: 'Nie potrafię ocenić', code: 'unspecified' },
      ],
    },
  },

  fizycznosc: {
    segmentId: 'fizycznosc',
    hasPositionVariants: true,
    universal: {
      t: 'Czy dziś przegrałeś starcie fizyczne z rywalem, mimo że próbowałeś się utrzymać?',
      ctx: 'Chodzi o kontakt barkiem w bark, plecami w plecy, albo walkę o pozycję — czy rywal Cię przepchnął albo wytrącił z równowagi, przez co straciłeś pozycję lub piłkę.',
    },
    positionVariants: {
      bramkarz: {
        t: 'Czy dziś rywal wygrał z Tobą starcie o pozycję przy dośrodkowaniu?',
        ctx: 'Chodzi o walkę w polu karnym przy dośrodkowaniu — czy rywal fizycznie Cię wyprzedził i wyszedł na piłkę przed Tobą.',
      },
      obronca_srodkowy: {
        t: 'Czy dziś przegrałeś starcie ramię w ramię z napastnikiem?',
        ctx: 'Chodzi o bezpośredni kontakt barkowy lub plecy w plecy z napastnikiem — czy to on wyszedł z tego silniejszy, przejmując pozycję lub piłkę.',
      },
      obronca_boczny: {
        t: 'Czy dziś skrzydłowy rywala wygrał z Tobą starcie fizyczne?',
        ctx: 'Chodzi o bezpośredni kontakt przy linii bocznej — czy rywal Cię przepchnął albo wytrącił z pozycji.',
      },
      pomocnik_defensywny: {
        t: 'Czy dziś przegrałeś walkę o piłkę w środku pola, bo rywal był silniejszy?',
        ctx: 'Chodzi o starcie przy walce o drugą piłkę lub odbiór w środku pola.',
      },
      pomocnik_srodkowy: {
        t: 'Czy dziś rywal fizycznie zepchnął Cię z piłki podczas jej przyjęcia?',
        ctx: 'Chodzi o moment przyjęcia piłki pod presją rywala — czy kontakt sprawił, że straciłeś nad nią kontrolę.',
      },
      pomocnik_ofensywny: {
        t: 'Czy dziś rywal fizycznie nie dał Ci utrzymać piłki?',
        ctx: 'Chodzi o moment, gdy rywal naciskał Cię od tyłu lub z boku — czy kontakt sprawił, że straciłeś piłkę, zamiast zyskać przestrzeń do dalszej gry.',
      },
      skrzydlowy: {
        t: 'Czy dziś przegrałeś kontakt fizyczny z obrońcą?',
        ctx: 'Chodzi o pojedynek jeden na jednego — czy kontakt fizyczny przerwał Twoją akcję.',
      },
      napastnik: {
        t: 'Czy dziś, grając tyłem do bramki, obrońca wygrał z Tobą walkę o pozycję?',
        ctx: 'Chodzi o grę plecami do bramki pod naciskiem obrońcy — czy odebrał Ci piłkę albo nie dał Ci się obrócić.',
      },
    },
    answers: [
      { label: 'Tak, przegrałem ten pojedynek', code: 'lost_duel' },
      { label: 'Miałem taką sytuację i wygrałem', code: 'won_duel' },
      { label: 'Nie miałem dziś takiej sytuacji', code: 'no_occurrence' },
      { label: 'Nie pamiętam', code: 'no_recall' },
    ],
    followup: {
      triggerCode: 'lost_duel',
      t: 'Co, Twoim zdaniem, zadecydowało w tym starciu?',
      answers: [
        { label: 'Rywal był po prostu silniejszy fizycznie', code: 'rival_stronger' },
        { label: 'Źle się ustawiłem, nie broniłem pozycji', code: 'positioning' },
        { label: 'Byłem już zmęczony', code: 'fatigue' },
        { label: 'Nie potrafię wskazać', code: 'unspecified' },
      ],
    },
  },

  // ── Filar 2 — Efektywność techniczna (z wariantami pozycyjnymi) ─
  techFund: {
    segmentId: 'techFund',
    hasPositionVariants: true,
    universal: {
      t: 'Czy dziś zdarzyła się sytuacja, gdzie pod presją rywala popełniłeś błąd w podstawowym zagraniu (przyjęcie, podanie), które normalnie wykonujesz bez problemu?',
      ctx: 'Chodzi o proste, techniczne zagranie — nie o trudną, ambitną akcję — które zwykle wychodzi Ci bez trudności, ale pod presją czasu/rywala nie wyszło.',
    },
    positionVariants: {
      bramkarz: {
        t: 'Czy dziś zdarzyła się sytuacja, gdzie pod presją rywali w polu karnym, popełniłeś błąd w prostej interwencji lub rozegraniu piłki, które normalnie wykonujesz bez problemu?',
        ctx: 'Chodzi o obecność rywali w polu karnym — czy to wpłynęło na jakość Twojej prostej techniki (łapanie, wybicie, rozegranie nogą).',
      },
      obronca_srodkowy: {
        t: 'Czy dziś zdarzyła się sytuacja, gdzie pod presją napastnika popełniłeś błąd w prostym przyjęciu, podaniu lub wybiciu, które normalnie wykonujesz bez problemu?',
        ctx: 'Chodzi o moment, gdy miałeś mało czasu na zagranie z powodu napastnika blisko Ciebie.',
      },
      obronca_boczny: {
        t: 'Czy dziś zdarzyła się sytuacja przy linii bocznej, gdzie pod presją rywala popełniłeś błąd w prostym przyjęciu, podaniu lub dośrodkowaniu?',
        ctx: 'Chodzi o sytuację, gdzie presja rywala pogorszyła jakość zagrania, które normalnie wychodzi Ci bez trudności.',
      },
      pomocnik_defensywny: {
        t: 'Czy dziś zdarzyła się sytuacja, gdzie od razu po odbiorze piłki, pod pressingiem rywala, popełniłeś błąd w pierwszym przyjęciu lub podaniu?',
        ctx: 'Chodzi o moment tuż po odbiorze piłki, gdy rywal natychmiast Cię zaatakował.',
      },
      pomocnik_srodkowy: {
        t: 'Czy dziś zdarzyła się sytuacja, gdzie grając pod pressingiem, popełniłeś błąd w prostym przyjęciu lub podaniu, które normalnie wykonujesz bez problemu?',
        ctx: 'Chodzi o moment, gdy presja rywala ograniczyła Twój czas na zagranie.',
      },
      pomocnik_ofensywny: {
        t: 'Czy dziś zdarzyła się sytuacja, gdzie grając między liniami z obrońcą blisko za plecami, popełniłeś błąd w przyjęciu lub pierwszym zagraniu?',
        ctx: 'Chodzi o moment, gdy obrońca był tuż za Tobą, a Ty przyjmowałeś piłkę z przodu.',
      },
      skrzydlowy: {
        t: 'Czy dziś zdarzyła się sytuacja w pojedynku 1 na 1 przy linii bocznej, gdzie pod presją obrońcy popełniłeś błąd w pierwszym kontakcie z piłką?',
        ctx: 'Chodzi o moment przed rozpoczęciem pojedynku — czy presja obrońcy pogorszyła jakość Twojego pierwszego kontaktu.',
      },
      napastnik: {
        t: 'Czy dziś zdarzyła się sytuacja, gdzie pod presją obrońcy popełniłeś błąd w przyjęciu, prowadzeniu piłki lub uderzeniu, które normalnie wykonujesz bez problemu?',
        ctx: 'Chodzi o moment, gdy obrońca ograniczał Ci czas i przestrzeń przy prostym, technicznym zagraniu.',
      },
    },
    answers: [
      { label: 'Tak, popełniłem błąd', code: 'broke_down' },
      { label: 'Miałem taką sytuację i technika się utrzymała', code: 'held_up' },
      { label: 'Nie miałem dziś takiej sytuacji', code: 'no_occurrence' },
      { label: 'Nie pamiętam', code: 'no_recall' },
    ],
    followup: {
      triggerCode: 'broke_down',
      t: 'Co Twoim zdaniem najbardziej wpłynęło na ten błąd?',
      answers: [
        { label: 'Rywal był bardzo blisko, mało czasu', code: 'time_pressure' },
        { label: 'Byłem spięty, bałem się pomylić', code: 'tension' },
        { label: 'Byłem zmęczony', code: 'fatigue' },
        { label: 'Nie potrafię wskazać', code: 'unspecified' },
      ],
    },
  },

  techSpec: {
    segmentId: 'techSpec',
    hasPositionVariants: true,
    universal: {
      t: 'Czy dziś spróbowałeś zagrania, które miało dać koledze przewagę?',
      ctx: 'Chodzi o podanie, dogranie albo zagranie, po którym kolega miał zyskać czas lub przestrzeń.',
    },
    positionVariants: {
      bramkarz: {
        t: 'Czy dziś Twoje rozegranie piłki miało dać koledze dobry start do akcji?',
        ctx: 'Chodzi o podanie, wyrzut albo rozegranie nogą od bramki — czy kolega mógł od razu spokojnie ruszyć z piłką, czy musiał się z czymś zmagać.',
      },
      obronca_srodkowy: {
        t: 'Czy dziś Twoje podanie miało ominąć pressing rywala i pomóc koledze?',
        ctx: 'Chodzi o wyprowadzenie piłki spod pressingu — czy podanie faktycznie odciążyło kolegę, czy wciąż był pod presją.',
      },
      obronca_boczny: {
        t: 'Czy dziś Twoje dośrodkowanie miało stworzyć koledze okazję do zakończenia akcji?',
        ctx: 'Chodzi o zagranie w pole karne — czy kolega miał realną szansę na strzał, czy dośrodkowanie nic nie dało.',
      },
      pomocnik_defensywny: {
        t: 'Czy dziś Twoje pierwsze podanie po odbiorze piłki miało pomóc rozpocząć atak?',
        ctx: 'Chodzi o moment tuż po odzyskaniu piłki — czy zagranie ułatwiło drużynie przejście do ataku, czy było za mało dokładne albo zbyt zachowawcze.',
      },
      pomocnik_srodkowy: {
        t: 'Czy dziś Twoje podanie miało dać koledze korzyść w tempie gry?',
        ctx: 'Chodzi o zwykłe podanie w grze — czy dzięki niemu kolega był w lepszej sytuacji niż przed otrzymaniem piłki.',
      },
      pomocnik_ofensywny: {
        t: 'Czy dziś Twoje podanie miało stworzyć koledze dogodną sytuację do strzału?',
        ctx: 'Chodzi o ostatnie podanie przed bramką — czy realnie ułatwiło sytuację, czy kolega musiał sam sobie poradzić.',
      },
      skrzydlowy: {
        t: 'Czy dziś Twój drybling miał dać koledze korzyść w grze?',
        ctx: 'Chodzi o sytuację 1 na 1 — czy dzięki Twojemu zagraniu obrona rywala się rozsunęła, dając koledze łatwiejszą sytuację.',
      },
      napastnik: {
        t: 'Czy dziś Twój ruch bez piłki miał ułatwić koledze rozegranie akcji?',
        ctx: 'Chodzi o wybiegnięcia i zmiany pozycji bez piłki — czy realnie tworzyły przestrzeń dla kolegów, czy nic nie zmieniały.',
      },
    },
    answers: [
      { label: 'Tak, ale nie wyszło', code: 'attempted_no_effect' },
      { label: 'Tak, i zadziałało', code: 'attempted_worked' },
      { label: 'Nie miałem dziś takiej okazji', code: 'no_occurrence' },
      { label: 'Nie pamiętam', code: 'no_recall' },
    ],
    followup: {
      triggerCode: 'attempted_no_effect',
      t: 'Co, Twoim zdaniem, zawiodło w tej sytuacji?',
      answers: [
        { label: 'Wykonanie nie wyszło technicznie', code: 'execution' },
        { label: 'Zabrakło mi odwagi, zagrałem bezpieczniej', code: 'lack_of_courage' },
        { label: 'Rywal dobrze to obronił', code: 'rival_defended_well' },
        { label: 'Nie potrafię wskazać', code: 'unspecified' },
      ],
    },
  },

  // ── Filar 3 — Trwałość organizmu ────────────────────────────
  tolerancja: {
    segmentId: 'tolerancja',
    hasPositionVariants: false,
    universal: {
      t: 'Czy dziś Twoje ciało czuło się bardziej obciążone po meczu niż zwykle?',
      ctx: 'Chodzi o sumę całego wysiłku fizycznego meczu — sprinty, skoki, gwałtowne zmiany kierunku, starcia z rywalami — nie tylko sam kontakt z przeciwnikiem. Liczy się ogólne odczucie w ciele, nie konkretna przyczyna.',
    },
    answers: [
      { label: 'Tak, czułem się bardziej obciążony niż zwykle', code: 'above_normal_toll' },
      { label: 'Nie, czułem się jak zwykle po meczu', code: 'normal_toll' },
      { label: 'Grałem bardzo krótko (wszedłem z ławki na chwilę)', code: 'not_applicable' },
      { label: 'Nie pamiętam / trudno powiedzieć', code: 'no_recall' },
    ],
    followup: {
      triggerCode: 'above_normal_toll',
      t: 'Czy to uczucie pojawiło się w tym samym miejscu, co poprzednio Ci się zdarzało?',
      answers: [
        { label: 'Tak, to samo miejsce co zwykle', code: 'same_spot' },
        { label: 'Nie, to nowe miejsce', code: 'new_spot' },
        { label: 'To pierwszy raz, nie mam porównania', code: 'first_time' },
        { label: 'Nie potrafię wskazać', code: 'unspecified' },
      ],
    },
  },

  // Regeneracja: pytanie bazowe żyje w rdzeniu karty
  // (match_contexts.entered_recovery_state) — patrz Krok 4 UI i
  // matchSegmentSelection.ts. Ten wpis niesie WYŁĄCZNIE pogłębienie.
  regeneracja: {
    segmentId: 'regeneracja',
    hasPositionVariants: false,
    noBaseQuestion: true,
    universal: {
      t: '', // nieużywane — pytanie bazowe to pole rdzenia entered_recovery_state
      ctx: '',
    },
    answers: [
      { label: 'Wchodziłem zmęczony', code: 'entered_fatigued' },
      { label: 'Wchodziłem w pełni zregenerowany', code: 'entered_fresh' },
      { label: 'Nie jestem pewien', code: 'uncertain' },
    ],
    followup: {
      triggerCode: 'entered_fatigued',
      t: 'Co najbardziej wpłynęło na to zmęczenie wchodzenia w mecz?',
      answers: [
        { label: 'Zbyt mało snu w ostatnich dniach', code: 'lack_of_sleep' },
        { label: 'Zbyt duże obciążenie treningowe ostatnio', code: 'training_load' },
        { label: 'Zbyt szybko po poprzednim meczu/treningu', code: 'insufficient_recovery_time' },
        { label: 'Nie potrafię wskazać', code: 'unspecified' },
      ],
    },
  },

  odpornosc: {
    segmentId: 'odpornosc',
    hasPositionVariants: false,
    universal: {
      t: 'Czy podczas dzisiejszego meczu czułeś jakiekolwiek objawy przeziębienia lub choroby (np. gardło, katar, ogólne rozbicie)?',
      ctx: 'Nie chodzi o zmęczenie wysiłkiem, tylko o sygnały, że organizm może właśnie walczyć z infekcją.',
    },
    answers: [
      { label: 'Tak, czułem objawy', code: 'symptoms_present' },
      { label: 'Nie, czułem się zdrowo', code: 'no_symptoms' },
      { label: 'Nie jestem pewien', code: 'uncertain' },
    ],
    followup: {
      triggerCode: 'symptoms_present',
      t: 'Czy to zdarza Ci się częściej ostatnio?',
      answers: [
        { label: 'Tak, to już kolejny raz w ostatnim czasie', code: 'recurring' },
        { label: 'Nie, to rzadkość dla mnie', code: 'rare' },
        { label: 'Nie potrafię ocenić', code: 'unspecified' },
      ],
    },
  },

  odzywianie: {
    segmentId: 'odzywianie',
    hasPositionVariants: false,
    universal: {
      t: 'Czy pod koniec meczu poczułeś nagły spadek chęci i energii, mimo że wcześniej tego nie czułeś?',
      ctx: "Chodzi o uczucie zamulenia, brak napędu, myśl 'żeby to się już skończyło' — pod koniec meczu, inne niż zwykłe zmęczenie fizyczne nóg.",
    },
    answers: [
      { label: 'Tak, poczułem taki spadek', code: 'energy_crash' },
      { label: 'Nie, energia i chęć były stabilne do końca', code: 'stayed_driven' },
      { label: 'Nie grałem wystarczająco długo, żeby ocenić', code: 'not_applicable' },
      { label: 'Nie pamiętam / trudno powiedzieć', code: 'no_recall' },
    ],
    followup: {
      triggerCode: 'energy_crash',
      t: 'Co jadłeś w dniu meczu, przed grą?',
      answers: [
        { label: 'Przemyślany posiłek z węglowodanami', code: 'planned_carb_meal' },
        { label: 'Coś przypadkowego, niewiele', code: 'random_little' },
        { label: 'Nic nie jadłem odpowiednio wcześniej', code: 'nothing' },
        { label: 'Nie pamiętam', code: 'no_recall' },
      ],
    },
  },
};

// Kolejność segmentów w rotacji (źródło 5 kaskady) — ta sama kolejność
// co public.segments.display_order (Domena 00), dla przewidywalności.
export const SEGMENT_ORDER = [
  'moc', 'wytrzymalosc', 'fizycznosc', 'techFund', 'techSpec',
  'tolerancja', 'regeneracja', 'odpornosc', 'odzywianie',
  'koncentracja', 'mental', 'percepcja', 'decyzja',
];
