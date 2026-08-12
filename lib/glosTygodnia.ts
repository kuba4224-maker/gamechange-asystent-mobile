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

/** Wartości kolumny `weekly_voice.voice` — jeden do jednego z CHECK w bazie. */
export type Glos =
  | 'exit'
  | 'injury'
  | 'growth'
  | 'compass'
  | 'calibration'
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
  | { rodzaj: 'glos'; voice: Glos; tytul: string; tresc: string; powod: string };

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
  calibration: {
    tytul: 'Czas na pomiar',
    tresc: 'Zmierz to, co zapowiedziałeś — w tych samych warunkach co poprzednio: ta sama pora dnia, '
      + 'ta sama nawierzchnia, to samo obuwie. Inaczej nie da się tych dwóch liczb porównać.',
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
  if (wiersz.voice === 'block') {
    // Blok NIE dostaje osobnej karty: ma już cały kafelek na górze ekranu
    // („Nad czym pracujesz"). Druga karta o tej samej rzeczy byłaby drugą drogą
    // do jednego rekordu — dokładnie to, co blok B1 „jedna droga" z produktu wyciął.
    return { rodzaj: 'glos', voice: 'block', tytul: '', tresc: '', powod: wiersz.reason };
  }
  const b = BRZMIENIA[wiersz.voice];
  if (!b) {
    // Głos spoza znanego zbioru = baza wie coś, czego ta wersja appki nie wie.
    // To NIE jest cisza i nie wolno tego pokazać jako pustki.
    return { rodzaj: 'nie_wiem', powod: `nieznany głos „${wiersz.voice}" — appka jest starsza niż baza` };
  }
  return { rodzaj: 'glos', voice: wiersz.voice, tytul: b.tytul, tresc: b.tresc, powod: wiersz.reason };
}

/** Czy ekran rysuje kartę głosu tygodnia. */
export function pokazacKarte(stan: StanGlosu): boolean {
  return stan.rodzaj === 'glos' && stan.voice !== 'block';
}

// ─────────────────────────────────────────────────────────────────────
// PLAN-D-I 08.2026 (12.08.2026) — ZADANIE I1: KARTA MA DOKĄD PROWADZIĆ
// ─────────────────────────────────────────────────────────────────────
// Arbiter potrafił od 12.08.2026 powiedzieć „Czas na pomiar", ekran potrafił
// tę kartę narysować — i na tym się kończyło. Ekran Kalibracji istniał
// (`components/Kalibracja.tsx`, wiersz w zakładce „Ja"), ale zawodnik,
// któremu produkt WŁAŚNIE powiedział „zmierz to, co zapowiedziałeś", musiał
// go sobie sam znaleźć dwa dotknięcia dalej. To jest reguła R1 w czystej
// postaci: rzecz zbudowana bez ostatnich dziesięciu procent.
//
// ⚠️ KARTA PROWADZI DO ISTNIEJĄCEGO EKRANU, NIE OTWIERA DRUGIEGO.
// Kalibracja jest pełnoekranowym modalem zamontowanym w `app/(tabs)/ja.tsx`
// (świadomie, zakaz 10: żadnej piątej zakładki). Z ekranu „Dziś" nie da się
// jej otworzyć wprost, bo modal żyje w stanie lokalnym tamtego ekranu —
// dlatego karta NAWIGUJE do zakładki „Ja" z parametrem `otworz`, a „Ja"
// otwiera swój jedyny egzemplarz modala. Drugi egzemplarz byłby drugą drogą
// do jednego rekordu, czyli dokładnie tym, co blok B1 z produktu wyciął.
//
// ⚠️ CELOWO TYLKO KALIBRACJA. Pozostałe głosy zostają kartami bez wejścia:
//   • `exit` i `injury` mają już własne, świadomie osobne wejście (punkt
//     pomocy, ZADANIE E2) i doklejenie im drugiego cofałoby decyzję Kuby;
//   • `growth` i `compass` nie mają dziś ekranu, do którego dałoby się
//     prowadzić — link do czegoś, czego nie ma, jest gorszy niż jego brak;
//   • `block` w ogóle nie dostaje karty (ma kafelek na górze ekranu).

/** Wartość parametru `otworz` dla zakładki „Ja". Stała, bo dopasowanie po napisie w dwóch plikach cicho przestaje trafiać. */
export const OTWORZ_KALIBRACJE = 'kalibracja';

/**
 * ⚠️ BRZMIENIE DO PRZEJRZENIA PRZEZ KUBĘ (nowe 12.08.2026). Napis na wejściu
 * z karty. Świadomie czasownik, nie nazwa: karta już mówi „Czas na pomiar",
 * więc to zdanie ma odpowiadać na pytanie „gdzie", a nie powtarzać „co".
 */
export const KARTA_WEJSCIE_LABEL = 'Otwórz Kalibrację';

export type WejscieZKarty = { trasa: '/ja'; otworz: string; etykieta: string };

/**
 * Dokąd prowadzi karta głosu tygodnia — albo `null`, gdy donikąd.
 *
 * Czysta funkcja, bo to jest DECYZJA, a nie rysowanie: ekran ma ją wykonać,
 * a nie podjąć. Dzięki temu „karta kalibracji prowadzi do Kalibracji, a karta
 * ścieżki wyjścia nie prowadzi nigdzie" da się sprawdzić testem, zamiast
 * oglądać na telefonie.
 */
export function wejscieZKarty(stan: StanGlosu): WejscieZKarty | null {
  if (!pokazacKarte(stan) || stan.rodzaj !== 'glos') return null;
  if (stan.voice !== 'calibration') return null;
  return { trasa: '/ja', otworz: OTWORZ_KALIBRACJE, etykieta: KARTA_WEJSCIE_LABEL };
}

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
  return `głos tygodnia: ${stan.voice} — ${stan.powod}`;
}
