// PLAN-D-J 08.2026 (12.08.2026) — NOWY PLIK. CO OBOWIĄZUJE W TYM TYGODNIU.
//
// ── PO CO TEN PLIK POWSTAŁ ────────────────────────────────────────────
// Do 12.08.2026 oś decyzji odpowiadała poprawnie na pytanie KTO MÓWI
// (`weekly_voice.voice`) i NIE MIAŁA JAK odpowiedzieć na pytanie CO OBOWIĄZUJE.
// Drabina w `gamechange-app/lib/arbiter-glosu.js` zwracała pole `ograniczenia`,
// a `api/cron-weekly-voice.js` je WYRZUCAŁ: do bazy szło tylko
// voice/reason/spoke_at/overridden_at.
//
// Skutek nie dotyczył wyłącznie stanu „czekam na decyzję". Dotyczył WSZYSTKIEGO:
//   • Osłona (szybki wzrost) → „Blok nie zwiększa objętości"  — nie docierało nigdzie;
//   • kontuzja               → „system milczy o celach"       — nie docierało nigdzie.
// Produkt, który wie, że zawodnik rośnie 8 cm na rok, i mimo to podbija mu
// objętość Bloku, jest gorszy niż produkt, który nic nie wie — bo obiecuje
// opiekę, której nie ma.
//
// ── DWIE ZASADY, KTÓRE TRZYMAJĄ TEN PLIK ──────────────────────────────
//
// 1. ⚠️ OGRANICZENIE JEST STANEM, NIE KOMUNIKATEM. Nic tu nie buduje kartki,
//    która o ograniczeniu opowiada. Funkcje niżej ZMIENIAJĄ ZACHOWANIE ekranów.
//    Jeśli w danym miejscu trzeba to zawodnikowi wyjaśnić, brzmienie należy do
//    Kuby i jest oznaczone jako DO PRZEJRZENIA.
//
// 2. ⚠️ TRZY STANY, NIGDY DWA (reguła R5). „Nie obowiązuje" i „nie umiem tego
//    rozstrzygnąć" to dwie różne rzeczy i produkt musi je rozróżniać:
//      • `tak`      — arbiter policzył i ograniczenie obowiązuje;
//      • `nie`      — arbiter policzył i nie obowiązuje;
//      • `nie_wiem` — arbiter nie miał czego policzyć ALBO appka nie odczytała
//                     koperty (błąd zapytania, brak kolumny, nieznana wersja).
//    Bez trzeciego stanu zawodnik, którego pomiarów wzrostu nie dało się
//    odczytać, wygląda identycznie jak zawodnik, o którym WIEMY, że nie rośnie
//    szybko — i dostaje dokładnie to, przed czym Osłona miała go chronić.
//
// ── DLACZEGO `nie_wiem` NIE ZACISKA OGRANICZEŃ ────────────────────────
// Kuszące jest zamknięcie się bezpiecznie: „nie wiem → traktuj jak włączone".
// Byłoby to błędne i zmierzone: `height_logs` jest dziś u większości zawodników
// puste, więc `blokNieZwiekszaObjetosci` będzie u nich NIEROZSTRZYGNIĘTE —
// zaciśnięcie odcięłoby całemu produktowi możliwość zaplanowania pracy na
// podstawie danych, których nie ma. Dlatego `nie_wiem` NIE egzekwuje niczego,
// ale ma nazwę, ma powód i jest policzone (licznik `z_nierozstrzygnietym_
// ograniczeniem` w cronie). Fail-closed obowiązuje tam, gdzie decyduje
// o ciszy — i tam siedzi, w czytniku ścieżki wyjścia, nie tutaj.

/** Wersja koperty, którą ta wersja appki umie przeczytać. Musi zgadzać się z `WERSJA_OGRANICZEN` w backendzie. */
export const WERSJA_OGRANICZEN_ZNANA = 1;

/**
 * Klucze ograniczeń. ⚠️ ŹRÓDŁEM JEST BACKEND — `gamechange-app/lib/arbiter-glosu.js`,
 * stała `KLUCZE_OGRANICZEN`. Ta lista jest KOPIĄ przez granicę dwóch repozytoriów
 * i dlatego NIE wolno jej pilnować komentarzem: pilnują jej dwie rzeczy naraz,
 *   • `lib/ograniczenia.selftest.ts` — porównuje tę listę z plikiem backendu,
 *     gdy oba repozytoria leżą obok siebie, i MÓWI GŁOŚNO, gdy nie leżą;
 *   • `czytajOgraniczenia` — klucz z bazy, którego tu nie ma, daje jawny stan
 *     „baza wie coś, czego ta wersja appki nie wie", a nie ciszę.
 */
// ⚠️ PLAN-D-P 08.2026 (13.08.2026) — SIEDEM KLUCZY ZESZŁO DO PIĘCIU.
// Zniknęły dwa i oba dlatego, że straciły konsumenta, a nie dlatego, że
// przestały być prawdziwe:
//   • `kalibracjaPrzeramowujeSpadek` — jego jedynym konsumentem był
//     `lib/kalibracja.ts` (`stanZmiany`), a Kalibracja została usunięta
//     z produktu w całości (claude/DECYZJA_KALIBRACJA_USUNIETA_13_08_2026.md).
//     ⚠️ SAMA REGUŁA NIE ZGINĘŁA: „spadku nie nazywa się spadkiem u kogoś, kto
//     akurat szybko rośnie" przeprowadziła się do `lib/rediagnosis.ts`, czyli
//     do zamknięcia Bloku. Czyta ją stamtąd `czyOslonaAktywna()` niżej;
//   • `blokSkracaHoryzontDoDecyzji` — obsługiwał wyłącznie stan
//     `exit_mode.state = 'paused_decision'`, którego nie dało się nigdzie
//     włączyć i który został skasowany razem z gałęzią (pas P, zadanie P8).
//
// ⚠️ PLAN-D-T 08.2026 (13.08.2026) — PIĘĆ KLUCZY ZESZŁO DO TRZECH (decyzja D6,
// `claude/DECYZJE_13_08_2026_DELEGOWANE.md`). Zniknęły `mapaTylkoWTwoichRekach`
// i `pokazacLiczbeSystemowa` — RAZEM ze swoimi konsumentami w `lib/mapaDrogi.ts`.
// Pas P zostawił je jako jawnie zawsze `false` i zapisał ten stan w strażniku
// backendu jako trzecią kategorię (`BEZ_PRZESLANKI`), z notą „ta lista ma się
// kurczyć, nigdy rosnąć". Ta runda ją opróżniła.
//
// POWÓD: klucz, który nie może być prawdziwy, jest kłamstwem w rejestrze.
// Koperta odpowiada na pytanie „co obowiązuje" — a wpis odpowiadający „nie"
// ZAWSZE, niezależnie od czegokolwiek, nie jest odpowiedzią, tylko szumem,
// który następna sesja weźmie za działający mechanizm.
//
// CO PRZEZ TO ZNIKA Z EKRANU: Mapa drogi wraca do zachowania sprzed pasa J —
// sekcja „Co jest tłem" jest ZAWSZE widoczna, liczby systemowej nie ma.
// ⚠️ Sama liczba o rotacji 24,5–41% NIE ZGINĘŁA z produktu: żyje dalej
// w `lib/sciezkaWyjscia.ts` (`WYJSCIE_LICZBY`), czyli w stanie, w którym
// naprawdę ma coś do powiedzenia.
//
// ⚠️ `WERSJA_OGRANICZEN` ŚWIADOMIE NIE ROŚNIE. Wersja mówi o KSZTAŁCIE koperty
// (`{wersja, aktywne[], nieznane_ograniczenia[], nieznane[]}`), a kształt się nie
// zmienił — zmienił się zbiór kluczy, które w tych tablicach mogą stać. Podbicie
// wersji kazałoby appce odpowiedzieć `nie_wiem` na KAŻDE ograniczenie z każdego
// wiersza zapisanego przed tą rundą, czyli wyłączyłoby Osłonę u wszystkich do
// czasu najbliższego przebiegu crona. Klucz, którego appka nie zna, i tak ma
// jawne wyjście: ląduje w `nieznaneKlucze` (patrz `czytajOgraniczenia`) — więc
// wiersze sprzed 13.08.2026, niosące dwa skasowane klucze, zostają NAZWANE
// w logu i nie włączają niczego.
export type KluczOgraniczenia =
  | 'wszystkoMilczy'
  | 'systemMilczyOCelach'
  | 'blokNieZwiekszaObjetosci';

export const KLUCZE_OGRANICZEN: readonly KluczOgraniczenia[] = [
  'wszystkoMilczy',
  'systemMilczyOCelach',
  'blokNieZwiekszaObjetosci',
];

/** Nazwa kolumny. Stała, bo napis wklepany w trzech plikach cicho przestaje trafiać. */
export const KOLUMNA_OGRANICZEN = 'ograniczenia';

/** Koperta zapisana przez `wierszDoZapisu` w backendzie. */
export type KopertaOgraniczen = {
  wersja: number;
  aktywne: string[];
  nieznane_ograniczenia: string[];
  nieznane: string[];
};

export type StanOgraniczen =
  /** Zapytanie się nie udało albo kolumny jeszcze nie ma w bazie. */
  | { rodzaj: 'nie_odczytane'; powod: string }
  /** Odczyt się udał, kolumna jest, ale wiersz jej nie ma — powstał przed migracją J1. */
  | { rodzaj: 'nie_zapisane'; powod: string }
  /** Koperta jest, ale w wersji, której ta appka nie zna. Nie zgadujemy. */
  | { rodzaj: 'nieznana_wersja'; wersja: number; powod: string }
  /** Koperta odczytana. `nieznaneKlucze` to klucze z bazy, których ta appka nie zna. */
  | {
    rodzaj: 'znane';
    aktywne: KluczOgraniczenia[];
    nierozstrzygniete: KluczOgraniczenia[];
    nieznane: string[];
    nieznaneKlucze: string[];
  };

export type Obowiazuje = 'tak' | 'nie' | 'nie_wiem';

/**
 * PostgREST przy nieznanej kolumnie odrzuca CAŁE zapytanie (kod `42703`).
 * Ten sam wzorzec co `isMissingContentDoseColumnError` w `lib/contentDose.ts`.
 *
 * ⚠️ ISTNIEJE PO TO, ŻEBY KOLEJNOŚĆ WDROŻENIA NIE MOGŁA ZGASIĆ EKRANU.
 * Migracja J1 czeka na wykonanie przez Kubę; gdyby appka poszła pierwsza,
 * `select ... , ograniczenia` wywróciłby cały odczyt głosu tygodnia i karta
 * zniknęłaby z ekranu „Dziś". Z tym rozpoznaniem appka ponawia odczyt bez
 * kolumny i mówi „nie wiem", zamiast udawać, że nic nie obowiązuje.
 */
export function isMissingOgraniczeniaColumnError(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null;
  if (!err) return false;
  if (err.code === '42703') return true;
  const m = typeof err.message === 'string' ? err.message.toLowerCase() : '';
  return m.includes(KOLUMNA_OGRANICZEN) && (m.includes('does not exist') || m.includes('column'));
}

function znanyKlucz(k: unknown): k is KluczOgraniczenia {
  return typeof k === 'string' && (KLUCZE_OGRANICZEN as readonly string[]).includes(k);
}

/**
 * Surowa wartość kolumny → stan.
 *
 * @param surowe wartość `weekly_voice.ograniczenia` (jsonb) albo `undefined`, gdy
 *               kolumny nie było w zapytaniu
 * @param bladOdczytu komunikat błędu zapytania; `null`, gdy odczyt się udał
 */
export function czytajOgraniczenia(
  surowe: unknown,
  bladOdczytu: string | null = null,
): StanOgraniczen {
  if (bladOdczytu) {
    return { rodzaj: 'nie_odczytane', powod: `nie odczytałem ograniczeń: ${bladOdczytu}` };
  }
  if (surowe === undefined) {
    // Kolumny nie było w zapytaniu — to jest brak ODCZYTU, nie brak ZAPISU.
    return { rodzaj: 'nie_odczytane', powod: 'kolumny „ograniczenia" nie było w zapytaniu' };
  }
  if (surowe === null) {
    return {
      rodzaj: 'nie_zapisane',
      powod: 'wiersz nie ma koperty ograniczeń — powstał przed migracją J1 albo zapisał go starszy cron',
    };
  }
  if (typeof surowe !== 'object' || Array.isArray(surowe)) {
    return { rodzaj: 'nie_odczytane', powod: `koperta ograniczeń ma nieznany kształt (${typeof surowe})` };
  }
  const k = surowe as Partial<KopertaOgraniczen>;
  if (typeof k.wersja !== 'number' || k.wersja !== WERSJA_OGRANICZEN_ZNANA) {
    return {
      rodzaj: 'nieznana_wersja',
      wersja: typeof k.wersja === 'number' ? k.wersja : -1,
      powod: `koperta ograniczeń w wersji ${String(k.wersja)}, a ta appka zna ${WERSJA_OGRANICZEN_ZNANA} — nie zgaduję`,
    };
  }
  const aktywneSurowe = Array.isArray(k.aktywne) ? k.aktywne : [];
  const nierozSurowe = Array.isArray(k.nieznane_ograniczenia) ? k.nieznane_ograniczenia : [];
  const nieznaneKlucze = [...aktywneSurowe, ...nierozSurowe].filter((x) => !znanyKlucz(x)).map(String);
  return {
    rodzaj: 'znane',
    aktywne: aktywneSurowe.filter(znanyKlucz),
    nierozstrzygniete: nierozSurowe.filter(znanyKlucz),
    nieznane: Array.isArray(k.nieznane) ? k.nieznane.map(String) : [],
    nieznaneKlucze,
  };
}

/**
 * Czy to konkretne ograniczenie obowiązuje. JEDYNE wejście dla ekranów —
 * nikt nie grzebie w tablicach z koperty ręcznie.
 */
export function obowiazuje(stan: StanOgraniczen, klucz: KluczOgraniczenia): Obowiazuje {
  if (stan.rodzaj !== 'znane') return 'nie_wiem';
  if (stan.nierozstrzygniete.includes(klucz)) return 'nie_wiem';
  return stan.aktywne.includes(klucz) ? 'tak' : 'nie';
}

/**
 * PLAN-D-P 08.2026 (13.08.2026) — CZY TRWA OSŁONA (szybki wzrost).
 *
 * ── DLACZEGO TO JEST WYPROWADZENIE, A NIE WŁASNY KLUCZ ────────────────
 * Do 13.08.2026 „zawodnik akurat szybko rośnie" miało w kopercie własny klucz
 * (`kalibracjaPrzeramowujeSpadek`, ustawiany dokładnie na `oslonaAktywna`).
 * Zniknął razem ze swoim jedynym konsumentem. Zostaje pytanie: skąd
 * rediagnoza ma teraz wiedzieć, że trwa skok wzrostowy.
 *
 * ⚠️ NIE WOLNO WZIĄĆ SAMEGO `blokNieZwiekszaObjetosci`. Backend ustawia je jako
 * `oslonaAktywna || kontuzjaAktywna` (`gamechange-app/lib/arbiter-glosu.js`,
 * odczytane 13.08.2026) — więc zawodnik z kontuzją i BEZ skoku wzrostowego
 * dostałby zdanie „rośniesz i dlatego ta liczba spadła". To jest podanie
 * prawdopodobnego jako pewnego, czyli złamanie Z0.
 *
 * Dlatego liczymy to z DWÓCH kluczy naraz, i tylko tam, gdzie wychodzi to bez
 * zgadywania:
 *   • `blokNieZwiekszaObjetosci = nie`  → ani Osłona, ani kontuzja → `nie`;
 *   • `blok = tak` i `systemMilczyOCelach = nie` → kontuzji NIE MA, więc
 *     przesłanką musi być Osłona → `tak`;
 *   • wszystko inne (obie naraz, albo którakolwiek nierozstrzygnięta)
 *     → `nie_wiem`, czyli brzmienie ostrożne, nie przeramowane.
 *
 * ⚠️ TO JEST STAN, NIE KOMUNIKAT (zasada 1 z nagłówka pliku). Ta funkcja nie
 * buduje ani jednego zdania — mówi tylko, którą gałąź wolno wybrać.
 */
export function czyOslonaAktywna(stan: StanOgraniczen): Obowiazuje {
  const blok = obowiazuje(stan, 'blokNieZwiekszaObjetosci');
  const kontuzja = obowiazuje(stan, 'systemMilczyOCelach');
  if (blok === 'nie') return 'nie';
  if (blok === 'tak' && kontuzja === 'nie') return 'tak';
  return 'nie_wiem';
}

/**
 * Zdanie do konsoli. Ten sam powód co `opisDoLogu` w `lib/glosTygodnia.ts`:
 * na pytanie „dlaczego produkt zachował się wtedy tak" ma dać się odpowiedzieć
 * zdaniem, a nie zgadywaniem.
 */
export function opisOgraniczenDoLogu(stan: StanOgraniczen): string {
  if (stan.rodzaj === 'nie_odczytane') return `ograniczenia: NIE ODCZYTANE — ${stan.powod}`;
  if (stan.rodzaj === 'nie_zapisane') return `ograniczenia: NIE ZAPISANE — ${stan.powod}`;
  if (stan.rodzaj === 'nieznana_wersja') return `ograniczenia: NIEZNANA WERSJA — ${stan.powod}`;
  const czesci = [
    `obowiązują: ${stan.aktywne.length > 0 ? stan.aktywne.join(', ') : 'żadne'}`,
    `nierozstrzygnięte: ${stan.nierozstrzygniete.length > 0 ? stan.nierozstrzygniete.join(', ') : 'brak'}`,
  ];
  if (stan.nieznaneKlucze.length > 0) {
    czesci.push(`KLUCZE SPOZA TEJ WERSJI APPKI: ${stan.nieznaneKlucze.join(', ')} (baza wie więcej niż appka)`);
  }
  if (stan.nieznane.length > 0) czesci.push(`arbiter nie odczytał: ${stan.nieznane.join('; ')}`);
  return `ograniczenia: ${czesci.join(' · ')}`;
}

// ─────────────────────────────────────────────────────────────────────
// KONSUMENT 1 — EKRAN „DZIŚ": `wszystkoMilczy` i `systemMilczyOCelach`
// ─────────────────────────────────────────────────────────────────────
// Dwa ograniczenia priorytetu 0 i 1 ze specyfikacji 1.2:
//   • ŚCIEŻKA WYJŚCIA → „wszystko inne milczy. Zero przypomnień, zero
//     liczników, zero porównań";
//   • KONTUZJA        → „system milczy o celach. Przesuwa się wyłącznie
//     horyzont BLOKU".
//
// ⚠️ ŻADNE Z NICH NIE DODAJE NA EKRAN ANI JEDNEGO SŁOWA. Karta głosu tygodnia
// („Zmieniła się Twoja sytuacja" / „Wracasz po urazie") już mówi zawodnikowi,
// co się dzieje, i jej brzmienia są zatwierdzone. Te dwie decyzje ZDEJMUJĄ
// z ekranu to, co w tych stanach jest wyrzutem: licznik zrobionych sesji,
// zaproszenie do zaplanowania Bloku, rekomendację treningową i podpowiedź.
//
// ⚠️ KAFELEK CELU NIE ZNIKA. Znika jego POPYCHANIE. Zawodnik po deselekcji
// albo z kontuzją ma prawo zobaczyć, nad czym pracował — nie ma obowiązku
// zobaczyć, ile z tego nie zrobił.

export type WidokDzis = {
  /** Pasek postępu i „N z M sesji zrobione" pod nazwą wąskiego gardła. */
  pokazacPostepPracy: boolean;
  /** Wiersze akcji: „Zaplanuj Blok →", „Nowa porcja w Twoim Bloku →". */
  pokazacWezwanieDoPracy: boolean;
  /** Cała sekcja „Co dziś zrobić" — karta rekomendacji albo jej zastępczy tekst. */
  pokazacRekomendacje: boolean;
  /** Podpowiedź z materiałów pod przyciskami karty. */
  pokazacPodpowiedz: boolean;
  /** Zdanie do konsoli — dlaczego ekran wygląda tak, a nie inaczej. */
  powod: string;
};

const WIDOK_DZIS_PELNY: WidokDzis = {
  pokazacPostepPracy: true,
  pokazacWezwanieDoPracy: true,
  pokazacRekomendacje: true,
  pokazacPodpowiedz: true,
  powod: 'żadne ograniczenie nie wycisza ekranu „Dziś"',
};

export function coPokazacNaDzis(stan: StanOgraniczen): WidokDzis {
  // Priorytet 0. Ścieżka wyjścia wycisza WSZYSTKO — łącznie z licznikiem,
  // bo licznik jest porównaniem z samym sobą sprzed tygodnia.
  if (obowiazuje(stan, 'wszystkoMilczy') === 'tak') {
    return {
      pokazacPostepPracy: false,
      pokazacWezwanieDoPracy: false,
      pokazacRekomendacje: false,
      pokazacPodpowiedz: false,
      powod: 'ścieżka wyjścia aktywna (wszystkoMilczy): zero przypomnień, zero liczników, zero porównań',
    };
  }
  // Priorytet 1. Kontuzja wycisza CELE, ale nie cały ekran: zawodnik nadal
  // widzi, nad czym pracował, i nadal ma pod ręką punkt pomocy.
  if (obowiazuje(stan, 'systemMilczyOCelach') === 'tak') {
    return {
      pokazacPostepPracy: false,
      pokazacWezwanieDoPracy: false,
      pokazacRekomendacje: false,
      pokazacPodpowiedz: false,
      powod: 'kontuzja (systemMilczyOCelach): przesuwa się wyłącznie horyzont Bloku, o celach nie rozmawiamy',
    };
  }
  return WIDOK_DZIS_PELNY;
}

// ─────────────────────────────────────────────────────────────────────
// REJESTR KONSUMENTÓW — SEDNO ZADANIA J3
// ─────────────────────────────────────────────────────────────────────
// Defekt, który ta runda naprawia, nie polegał na złym kodzie. Polegał na tym,
// że drabina zwracała coś, czego NIKT NIE CZYTAŁ, i NIC O TYM NIE MÓWIŁO.
// Każda część z osobna działała poprawnie — dlatego znalezisko przeżyło
// kilka rund i kilka audytów.
//
// ⚠️ TEN REJESTR NIE JEST DOKUMENTACJĄ. Jest wejściem dla strażnika
// `lib/ograniczenia.selftest.ts`, który sprawdza REGUŁĘ, nie dzisiejszą listę:
//   1. każdy klucz z `KLUCZE_OGRANICZEN` ma tu wpis;
//   2. plik wskazany we wpisie ISTNIEJE na dysku;
//   3. ten plik zawiera nazwę symbolu ORAZ dosłowną nazwę klucza —
//      czyli naprawdę o tym ograniczeniu wie, a nie tylko jest wymieniony;
//   4. lista kluczy zgadza się z `KLUCZE_OGRANICZEN` w repozytorium backendu,
//      gdy oba repozytoria leżą obok siebie (a gdy nie leżą — strażnik mówi
//      to GŁOŚNO i liczy jako pominięcie, zamiast przejść na zielono).
// Dołożenie szóstego ograniczenia bez odbiorcy zapala punkt 1. Wyjęcie
// konsumenta z pliku zapala punkt 3. Sprawdzone mutacją, oba.
//
// ⚠️ CZEGO TEN STRAŻNIK NIE ŁAPIE — NAZWANE 13.08.2026 (PLAN-D-P). Sprawdza,
// że każdy klucz MA KONSUMENTA. Nie sprawdza, że backend jest w stanie ten
// klucz kiedykolwiek WŁĄCZYĆ. Drugą połowę tej reguły pilnuje strażnik po
// stronie backendu (`gamechange-app/tests/test-ograniczenia-maja-konsumenta.js`,
// kategoria `BEZ_PRZESLANKI`) — i od 13.08.2026 (PLAN-D-T, decyzja D6) ta
// kategoria jest PUSTA, bo oba klucze, które w niej stały, zniknęły razem
// z konsumentami. Rejestr niżej opisuje więc trzy klucze, z których KAŻDY
// backend potrafi włączyć.

export type WpisRejestru = {
  /** Ścieżka względem katalogu głównego appki. */
  plik: string;
  /** Symbol, który to ograniczenie wykonuje. */
  symbol: string;
  /** Co się dzieje, gdy ograniczenie obowiązuje. Jedno zdanie, po polsku. */
  coRobi: string;
};

export const REJESTR_OGRANICZEN: Record<KluczOgraniczenia, WpisRejestru> = {
  wszystkoMilczy: {
    plik: 'lib/ograniczenia.ts',
    symbol: 'coPokazacNaDzis',
    coRobi: 'Ekran „Dziś" zdejmuje postęp pracy, wezwania do pracy, rekomendację i podpowiedź. Zostaje karta głosu i punkt pomocy.',
  },
  systemMilczyOCelach: {
    plik: 'lib/ograniczenia.ts',
    symbol: 'coPokazacNaDzis',
    coRobi: 'To samo co wyżej, ale kafelek wąskiego gardła zostaje widoczny — znika wyłącznie popychanie do pracy nad celem.',
  },
  blokNieZwiekszaObjetosci: {
    plik: 'lib/budzetUwagi.ts',
    symbol: 'sufitObjetosci',
    coRobi: 'Sufit tygodniowy Bloku spada z limitu do tego, co zawodnik już robi — planer nie proponuje ani jednej sesji więcej, a przy zajętym tygodniu proponuje redukcję. '
      + 'DRUGI KONSUMENT od 13.08.2026: `lib/rediagnosis.ts` czyta ten klucz przez `czyOslonaAktywna()`, żeby przy zamknięciu Bloku nie nazwać spadku spadkiem u kogoś, kto akurat szybko rośnie.',
  },
};

// ⚠️ PLAN-D-T 08.2026 (13.08.2026) — TU STAŁY DWA WPISY, OBA SKASOWANE.
// `mapaTylkoWTwoichRekach` („Mapa chowa sekcję «Co jest tłem»") oraz
// `pokazacLiczbeSystemowa` („Mapa dokłada liczbę o rotacji 24,5–41%") miały
// żywych, poprawnych konsumentów w `lib/mapaDrogi.ts` i ani jednej przesłanki,
// która mogłaby je zapalić. Zniknęły razem z konsumentami (decyzja D6).
// Nazywam to tutaj, zamiast po cichu skrócić rejestr — bo rejestr jest tym
// miejscem, w którym następna sesja będzie ich szukać.
