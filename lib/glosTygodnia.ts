// PLAN-D-F 08.2026 (12.08.2026) — NOWY PLIK. Co ekran „Dziś" robi z wierszem
// `weekly_voice`. Czysta logika, zero Reacta, zero Supabase — uruchamialna w node.
//
// ── PODZIAŁ PRACY, KTÓRY TU OBOWIĄZUJE ───────────────────────────────
// KTO MÓWI w tym tygodniu, rozstrzyga backend: `gamechange-app/lib/arbiter-glosu.js`,
// wołany raz dziennie przez `gamechange-app/api/cron-weekly-voice.js`, i zapisuje
// wynik do `weekly_voice`. Appka NIE liczy drabiny — czyta gotowy wiersz.
// Drabina ma dokładnie jedno źródło i to nie jest to repozytorium.
//
// Ten plik odpowiada na jedno, węższe pytanie: CO Z TYM ZROBIĆ NA EKRANIE.
//
// ── TRZY STANY, KTÓRYCH NIE WOLNO SKLEIĆ (reguła R5) ─────────────────
//   • `nie_wiem`      — odczyt się nie udał (brak sieci, RLS, timeout);
//   • `brak_wiersza`  — odczyt się udał, arbiter jeszcze nie policzył tygodnia;
//   • `cisza`         — arbiter policzył i wynikiem jest CISZA.
// Wszystkie trzy wyglądają na ekranie tak samo (nic nie pokazujemy), ale to
// są trzy różne rzeczy i muszą być rozróżnialne w kodzie i w logu — inaczej
// „appka nic nie pokazuje" nigdy nie da się zdiagnozować.
//
// ⚠️ CISZA TO DECYZJA, NIE BRAK DANYCH. Przy CISZY ekran nie pokazuje NICZEGO
// — żadnej karty, żadnego „nic nowego", żadnego pustego stanu. Produkt, który
// przy ciszy wyświetla zastępczy komunikat, zamienia decyzję o milczeniu
// w kolejne odezwanie i unieważnia cały budżet uwagi.
//
// ⚠️ BRZMIENIA PONIŻEJ SĄ DO PRZEJRZENIA PRZEZ KUBĘ. Teksty widoczne dla
// zawodnika są jego. Te są napisane tak, żeby były PRAWDZIWE i krótkie, i żeby
// nie łamały zakazów, ale nie były przez niego zatwierdzone — patrz raport F.

/**
 * Wartości kolumny `weekly_voice.voice` — jeden do jednego z CHECK w bazie.
 *
 * ⚠️ PLAN-D-P 08.2026 (13.08.2026) — SIEDEM WARTOŚCI ZESZŁO DO SZEŚCIU.
 * `calibration` zniknęło razem z całym narzędziem
 * (claude/DECYZJA_KALIBRACJA_USUNIETA_13_08_2026.md). Drabina w backendzie
 * (`gamechange-app/lib/arbiter-glosu.js`) ma od tej rundy SZEŚĆ szczebli,
 * a CHECK w bazie sześć wartości — te trzy listy muszą się zgadzać.
 * Wiersz z głosem spoza tego zbioru NIE jest ciszą: `stanGlosu` odpowiada
 * `nie_wiem` („appka jest starsza niż baza"), patrz niżej.
 */
export type Glos =
  | 'exit'
  | 'injury'
  | 'growth'
  | 'compass'
  | 'block'
  | 'silence';

/** Wiersz `weekly_voice`, dokładnie w kształcie, w jakim wraca z Supabase. */
export type WierszGlosu = {
  week_start: string;
  voice: Glos;
  reason: string;
  spoke_at: string | null;
};

export type StanGlosu =
  | { rodzaj: 'nie_wiem'; powod: string }
  | { rodzaj: 'brak_wiersza' }
  | { rodzaj: 'cisza'; powod: string }
  | { rodzaj: 'glos'; voice: Glos; tytul: string; tresc: string; powod: string; mowi: boolean };

// ─────────────────────────────────────────────────────────────────────
// ZADANIE N3 (13.08.2026) — `spoke_at` WRESZCIE COKOLWIEK ZNACZY
// ─────────────────────────────────────────────────────────────────────
// STAN ≠ GŁOS. Arbiter co tydzień rozstrzyga DWIE rzeczy naraz: KTÓRE
// narzędzie ma pierwszeństwo (`voice`) i CZY W OGÓLE SIĘ ODZYWA (`spoke`,
// zapisywane jako `spoke_at`: znacznik czasu, gdy mówi, `null`, gdy nie).
// Drugie z nich to cały budżet uwagi: refrakcje (Osłona odzywa się raz na
// kilka tygodni, kontuzja pyta o powrót po sześciu) polegają wyłącznie na tym,
// że wiersz istnieje, stan obowiązuje, a produkt MILCZY.
//
// Do 13.08.2026 ekran tej kolumny NIE CZYTAŁ. `spoke_at` było w typie
// `WierszGlosu` od pasa F, zapytanie w „Dziś" je pobierało — i nikt nigdy nie
// spytał o jego wartość. Skutek zmierzony przez audyt pasa M: arbiter zapisywał
// „w tym tygodniu nie mówię", a karta rysowała się mimo to, więc budżet
// „maksymalnie jedno odezwanie na tydzień" nie obowiązywał w ogóle.
//
// ⚠️ ROZRÓŻNIENIE, KTÓREGO NIE WOLNO SKLEIĆ Z CISZĄ. `cisza` to „żadne
// narzędzie nie ma nic do powiedzenia". `glos` z `mowi: false` to „narzędzie MA
// pierwszeństwo i jego stan OBOWIĄZUJE, ale w tym tygodniu nie zabiera głosu".
// Na ekranie obie wyglądają tak samo (nic nie widać) i właśnie dlatego muszą
// być różne w kodzie — inaczej nie da się odpowiedzieć na pytanie, dlaczego
// zawodnik czegoś nie zobaczył.
//
// ⚠️ CO SIĘ PRZEZ TO NIE ZMIENIA: `podniescPunktPomocy` NIE pyta o `mowi`.
// Punkt pomocy nie jest odezwaniem się produktu (spec E2, zakaz 1) — jest
// widocznością numeru w stanie, który trwa tygodniami. Gdyby znikał w tygodniu,
// w którym arbiter milczy, znikałby dokładnie wtedy, kiedy jest najbardziej
// potrzebny.

/**
 * Poniedziałek tygodnia, w którym leży podana data — liczony z DATY LOKALNEJ,
 * bo taki sam poniedziałek liczy backend (`Europe/Warsaw`).
 *
 * ⚠️ REGUŁA E-N2: data wchodzi PARAMETREM. Funkcja rozstrzygająca o czasie nie
 * czyta zegara sama — inaczej nie da się jej sprawdzić testem dla konkretnego dnia.
 */
export function poniedzialekTygodnia(dzis: Date): string {
  const d = new Date(dzis.getFullYear(), dzis.getMonth(), dzis.getDate());
  const przesun = (d.getDay() + 6) % 7; // 0 = poniedziałek
  d.setDate(d.getDate() - przesun);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Brzmienia. Świadomie krótkie i świadomie BEZ liczb o dojrzałości biologicznej
 * (zakaz bezwzględny, spec 3.3): wolno powiedzieć „rośniesz teraz szybko",
 * nie wolno podać wieku biologicznego ani przewidywanego wzrostu dorosłego.
 */
const BRZMIENIA: Record<Exclude<Glos, 'silence' | 'block'>, { tytul: string; tresc: string }> = {
  exit: {
    tytul: 'Zmieniła się Twoja sytuacja',
    tresc: 'Ten tydzień nie jest o wynikach. Przypomnienia, liczniki i porównania są wyłączone. '
      + 'Nic nie musisz teraz robić.',
  },
  injury: {
    tytul: 'Wracasz po urazie',
    tresc: 'W tym tygodniu nie rozmawiamy o celach — przesuwa się tylko termin Twojej pracy. '
      + 'Jeśli nic nie napiszesz, ten stan zostaje. Kończysz go wtedy, kiedy sam powiesz, że wróciłeś.',
  },
  growth: {
    tytul: 'Rośniesz teraz szybko',
    tresc: 'W takim okresie nie zwiększaj objętości treningu — to czas, w którym urazy zabierają '
      + 'najwięcej dni. Jeśli wynik Ci spadnie, to nie jest cofnięcie się.',
  },
  compass: {
    tytul: 'Dobry moment, żeby sprawdzić kierunek',
    tresc: 'Coś się zmieniło i warto zobaczyć, czy to, nad czym pracujesz, nadal jest tym właściwym. '
      + 'Nic się nie zmieni bez Twojej decyzji.',
  },
};

/**
 * Wiersz z bazy → stan ekranu.
 *
 * @param wiersz wiersz `weekly_voice` na BIEŻĄCY tydzień, albo `null` gdy go nie ma
 * @param bladOdczytu komunikat błędu, gdy zapytanie się nie powiodło; inaczej `null`
 */
export function stanGlosu(wiersz: WierszGlosu | null, bladOdczytu: string | null = null): StanGlosu {
  if (bladOdczytu) {
    // NIE udajemy ciszy. Cisza jest decyzją arbitra; to jest awaria odczytu
    // i jedyne, co wolno z nią zrobić, to nazwać ją w logu.
    return { rodzaj: 'nie_wiem', powod: `nie odczytałem głosu tygodnia: ${bladOdczytu}` };
  }
  if (!wiersz) {
    return { rodzaj: 'brak_wiersza' };
  }
  if (wiersz.voice === 'silence') {
    return { rodzaj: 'cisza', powod: wiersz.reason };
  }
  // ⚠️ N3: `spoke_at` = null znaczy „arbiter policzył ten tydzień i ZDECYDOWAŁ
  // NIE MÓWIĆ". Stan zostaje, karta nie. To nie jest brak danych — brak danych
  // to `brak_wiersza` kilka linijek wyżej.
  const mowi = wiersz.spoke_at !== null;
  if (wiersz.voice === 'block') {
    // Blok NIE dostaje osobnej karty: ma już cały kafelek na górze ekranu
    // („Nad czym pracujesz"). Druga karta o tej samej rzeczy byłaby drugą drogą
    // do jednego rekordu — dokładnie to, co blok B1 „jedna droga" z produktu wyciął.
    return { rodzaj: 'glos', voice: 'block', tytul: '', tresc: '', powod: wiersz.reason, mowi };
  }
  const b = BRZMIENIA[wiersz.voice];
  if (!b) {
    // Głos spoza znanego zbioru = baza wie coś, czego ta wersja appki nie wie.
    // To NIE jest cisza i nie wolno tego pokazać jako pustki.
    return { rodzaj: 'nie_wiem', powod: `nieznany głos „${wiersz.voice}" — appka jest starsza niż baza` };
  }
  return { rodzaj: 'glos', voice: wiersz.voice, tytul: b.tytul, tresc: b.tresc, powod: wiersz.reason, mowi };
}

/**
 * Czy ekran rysuje kartę głosu tygodnia.
 *
 * ⚠️ TRZY WARUNKI, KAŻDY Z INNEGO POWODU: to musi być głos (nie cisza i nie
 * awaria odczytu), nie może być `block` (ma własny kafelek) i arbiter musi
 * w tym tygodniu MÓWIĆ (`spoke_at` niepuste — patrz N3 wyżej).
 */
export function pokazacKarte(stan: StanGlosu): boolean {
  return stan.rodzaj === 'glos' && stan.voice !== 'block' && stan.mowi;
}

// ─────────────────────────────────────────────────────────────────────
// ⚠️ PLAN-D-P 08.2026 (13.08.2026) — TU BYŁO WEJŚCIE Z KARTY GŁOSU TYGODNIA
// ─────────────────────────────────────────────────────────────────────
// Od 12.08.2026 (zadanie I1) karta „Czas na pomiar" prowadziła do zakładki
// „Ja" parametrem `otworz`, a tamta otwierała modal Kalibracji. Zniknęły
// wszystkie trzy części naraz: `wejscieZKarty()`, stała `OTWORZ_KALIBRACJE`
// i etykieta `KARTA_WEJSCIE_LABEL`.
//
// ⚠️ POWÓD, DLA KTÓREGO NIE ZOSTAŁA PUSTA FUNKCJA. Kalibracja była JEDYNYM
// głosem z wejściem — pozostałe cztery świadomie prowadziły donikąd (exit
// i injury mają własne wejście przez punkt pomocy, growth i compass nie mają
// ekranu, do którego dałoby się prowadzić, block w ogóle nie dostaje karty).
// Po jej usunięciu `wejscieZKarty()` zwracałaby `null` przy KAŻDYM wejściu.
// Funkcja, która zawsze zwraca `null`, przy następnym czytaniu wygląda jak
// defekt do naprawienia, a nie jak decyzja — i ktoś ją „naprawi".
//
// Karta głosu tygodnia jest od tej rundy tekstem bez dotknięcia, we wszystkich
// czterech przypadkach, w których się w ogóle rysuje (exit, injury, growth, compass).

/**
 * ZADANIE E2 — PODNIESIENIE WIDOCZNOŚCI PUNKTU POMOCY.
 *
 * Punkt pomocy jest dostępny zawsze, z zakładki „Ja". To za mało w dwóch
 * sytuacjach, i tylko w tych dwóch: KONTUZJA i ŚCIEŻKA WYJŚCIA. Obie to stany,
 * w których zawodnik ma powód czuć się poza drużyną, obie trwają tygodniami,
 * i obie system rozpoznaje SAM — więc może przysunąć numer bliżej, zamiast
 * czekać, aż ktoś go poszuka.
 *
 * ⚠️ To jest PODNIESIENIE WIDOCZNOŚCI, NIE POWIADOMIENIE. Punkt pomocy nigdy
 * nie pusha, nic nie zapisuje i nikogo nie zawiadamia — ani rodzica, ani trenera
 * (zakaz 1, podstawa: claude/R2a_SCIEZKA_ESKALACJI_KRYZYS_11_08_2026.md).
 * Wiersz pojawia się na ekranie i tyle. Sam fakt jego pojawienia się nigdzie
 * nie jest odnotowywany.
 *
 * ⚠️ To NIE jest klasyfikator ryzyka. Nie ocenia stanu psychicznego zawodnika
 * i nie wnioskuje z jego wpisów. Reaguje na DWA jawne stany, które zawodnik sam
 * włączył albo które zapisało zdarzenie — nic więcej.
 *
 * ⚠️ ŚWIADOMIE NIE PYTA O `mowi` (N3, 13.08.2026). Punkt pomocy reaguje na STAN,
 * nie na GŁOS. Kontuzja i ścieżka wyjścia trwają tygodniami, a arbiter odzywa
 * się w nich rzadko — gdyby numer znikał w każdym tygodniu milczenia, znikałby
 * przez większość czasu, w którym jest potrzebny.
 */
export function podniescPunktPomocy(stan: StanGlosu): boolean {
  return stan.rodzaj === 'glos' && (stan.voice === 'injury' || stan.voice === 'exit');
}

/**
 * Zdanie do konsoli. Istnieje po to, żeby na pytanie „dlaczego Dziś nic nie
 * pokazało" dało się odpowiedzieć bez zgadywania — dokładnie z tego samego
 * powodu, dla którego `weekly_voice.reason` jest `not null`.
 */
export function opisDoLogu(stan: StanGlosu): string {
  if (stan.rodzaj === 'nie_wiem') return `głos tygodnia: NIE WIEM — ${stan.powod}`;
  if (stan.rodzaj === 'brak_wiersza') return 'głos tygodnia: brak wiersza na ten tydzień — arbiter jeszcze nie policzył';
  if (stan.rodzaj === 'cisza') return `głos tygodnia: CISZA (decyzja, nie brak danych) — ${stan.powod}`;
  if (!stan.mowi) {
    // Czwarty, osobny powód, dla którego ekran nic nie pokazuje. Musi dać się
    // odróżnić w logu od ciszy, bo to jest inna decyzja arbitra: stan OBOWIĄZUJE.
    return `głos tygodnia: ${stan.voice}, ale STAN BEZ ODEZWANIA — arbiter w tym tygodniu `
      + `nie mówi (spoke_at = null), stan nadal obowiązuje, karty nie ma — ${stan.powod}`;
  }
  return `głos tygodnia: ${stan.voice} — ${stan.powod}`;
}
