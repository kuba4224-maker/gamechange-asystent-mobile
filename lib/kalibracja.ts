// PLAN-D-H 08.2026 (12.08.2026) — NOWY PLIK. Kalibracja: czysta logika.
//
//   node --experimental-strip-types lib/kalibracja.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// Ten plik NIE zna Reacta i NIE robi zapytań. Ekrany siedzą
// w `components/Kalibracja.tsx`; tutaj mieszkają reguły.
//
// ── CO MIERZY KALIBRACJA I DLACZEGO TO JEST RDZEŃ, A NIE DODATEK ─────
// Sprawności nie da się uczciwie zmierzyć w osiem tygodni: szum jest 3–57×
// większy od sygnału. Kalibracja mierzy RÓŻNICĘ między tym, co zawodnik
// powiedział, a tym, co wyszło — obie liczby są twarde, więc błąd pomiaru
// jest bliski zeru. Miarą postępu jest |predykcja − pomiar| MALEJĄCA w czasie,
// nie sam wynik. Dlatego działa od pierwszego pomiaru (reguła P3) i dlatego
// jest rozwiązaniem zimnego startu całego produktu.
//
// ── GWARANCJA KOLEJNOŚCI — WYMUSZONA SCHEMATEM, NIE INTERFEJSEM ──────
// Spec 4.2: predykcja zapisana ZANIM zawodnik zobaczy pomiar. Jeśli ta
// kolejność żyje tylko w kolejności ekranów, złamie ją pierwsza zmiana
// nawigacji. W bazie stoją pod tym DWA wyzwalacze:
//   • `trg_lock_calibration` (10.08.2026) — nie da się zmienić predykcji,
//     gdy pomiar jest już zapisany;
//   • `trg_calibration_kolejnosc` (PLAN-D-H, 12.08.2026) — INSERT NIE MOŻE
//     nieść pomiaru, a UPDATE zapisujący pomiar nie może przy okazji zmienić
//     predykcji. Bez tego drugiego całą gwarancję dawało się obejść jednym
//     zapytaniem: `insert(predykcja + pomiar)` albo `update(predykcja + pomiar)`
//     na wierszu, który pomiaru jeszcze nie miał.
// Ten plik dokłada trzecią warstwę — buduje ładunki tak, żeby appka nawet nie
// mogła wysłać zapytania łamiącego kolejność. Pilnują tego asercje.
//
// ── CZEGO TU NIE MA I NIE MOŻE BYĆ ──────────────────────────────────
//   • pochwały za trafność („dobrze oszacowałeś") — to trening zgadywania
//     tego, co system chce usłyszeć, a nie kalibracji;
//   • komentarza o rozjeździe jako o wadzie zawodnika;
//   • porównania z kimkolwiek innym (zakaz 2);
//   • pokazywania zmiany mniejszej od progu jako postępu (zakaz 6).
//
// Protokół i liczby: `claude/POMIAR_KALIBRACJI_10_08_2026.html`.

// ─────────────────────────────────────────────────────────────────────
// 1. KSZTAŁT DANYCH — jeden do jednego z tabelą `calibration_measurements`
// ─────────────────────────────────────────────────────────────────────

export const OS_FIZYCZNA = 'physical';
export const OS_ZACHOWANIA = 'behavioural';
export type Os = typeof OS_FIZYCZNA | typeof OS_ZACHOWANIA;

/** Wartości `axis` dopuszczone CHECK-iem w bazie — zamknięty zbiór. */
export const OSIE: readonly Os[] = [OS_FIZYCZNA, OS_ZACHOWANIA];

/** `metric` — wolny tekst w bazie, więc tym bardziej musi mieć jedno źródło. */
export const METRYKA_CMJ = 'cmj_cm';
export const METRYKA_SESJE_WLASNE = 'sesje_wlasne_4t';

export type WierszKalibracji = {
  id: string;
  axis: Os;
  metric: string;
  predicted_value: number;
  predicted_at: string;
  measured_value: number | null;
  measured_at: string | null;
  is_baseline: boolean;
  comparable: boolean;
  time_of_day: string | null;
  surface: string | null;
  footwear: string | null;
};

export const KOLUMNY_KALIBRACJI =
  'id,axis,metric,predicted_value,predicted_at,measured_value,measured_at,is_baseline,comparable,time_of_day,surface,footwear';

/** Warunki standaryzacji zapisywane przy predykcji, sprawdzane przy porównaniu. */
export type Warunki = {
  /** 'HH:MM' — pora dnia pomiaru. */
  poraDnia: string | null;
  nawierzchnia: string | null;
  obuwie: string | null;
};

// ─────────────────────────────────────────────────────────────────────
// 2. WALIDACJA LICZB
// ─────────────────────────────────────────────────────────────────────

/** Zakresy szersze niż realne, ale odcinające literówkę o rząd wielkości. */
export const CMJ_MIN = 5;
export const CMJ_MAX = 120;
export const SESJE_MIN = 0;
export const SESJE_MAX = 200;

export type WynikWalidacji =
  | { ok: true; wartosc: number }
  | { ok: false; blad: string };

/**
 * Tekst z pola → liczba. Przecinek dziesiętny działa (klawiatura polska).
 * Oś zachowania przyjmuje WYŁĄCZNIE liczby całkowite — „ile razy" nie ma
 * połówek, a „3,5 sesji" to objaw pomyłki, nie precyzji.
 */
export function sprawdzLiczbe(tekst: string, os: Os): WynikWalidacji {
  const t = String(tekst ?? '').trim().replace(',', '.');
  if (t === '') return { ok: false, blad: 'Wpisz liczbę.' };
  if (!/^\d+(\.\d+)?$/.test(t)) return { ok: false, blad: 'To nie jest liczba.' };
  const n = Number(t);
  if (!Number.isFinite(n)) return { ok: false, blad: 'To nie jest liczba.' };

  if (os === OS_FIZYCZNA) {
    if (n < CMJ_MIN) return { ok: false, blad: `Poniżej ${CMJ_MIN} cm — sprawdź, czy to na pewno centymetry.` };
    if (n > CMJ_MAX) return { ok: false, blad: `Powyżej ${CMJ_MAX} cm — sprawdź, czy to na pewno centymetry.` };
    // Jedno miejsce po przecinku: My Jump podaje z taką dokładnością,
    // a 31,472 cm sugeruje precyzję, której w tym pomiarze nie ma.
    return { ok: true, wartosc: Math.round(n * 10) / 10 };
  }

  if (!Number.isInteger(n)) return { ok: false, blad: 'Podaj liczbę całkowitą — ile razy, nie ile godzin.' };
  if (n < SESJE_MIN || n > SESJE_MAX) {
    return { ok: false, blad: `Podaj liczbę od ${SESJE_MIN} do ${SESJE_MAX}.` };
  }
  return { ok: true, wartosc: n };
}

// ─────────────────────────────────────────────────────────────────────
// 3. PORÓWNYWALNOŚĆ — warunki standaryzacji ważniejsze niż sam pomiar
// ─────────────────────────────────────────────────────────────────────

/** Maksymalna dopuszczalna różnica pory dnia między pomiarami, w minutach. */
export const MAX_ROZNICA_PORY_MIN = 120;

export type OcenaPorownania = { comparable: boolean; powod: string };

function minutyZGodziny(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return h * 60 + mi;
}

/**
 * Czy DZISIEJSZY pomiar da się porównać z poprzednim.
 *
 * ⚠️ Kierunek błędu wybrany świadomie: gdy warunków poprzedniego pomiaru NIE
 * ZNAMY, wynik to `comparable = false` z nazwanym powodem — nie `true`.
 * Skok rano jest niższy o ~1,44 cm, czyli więcej niż całe osiem tygodni pracy;
 * porównanie „na oko" pokazałoby spadek tam, gdzie zmieniła się tylko godzina.
 * Pomiar zapisuje się mimo to (nie jest kasowany), tylko nie wchodzi do trendu.
 */
export function ocenPorownanie(poprzedni: Warunki | null, biezacy: Warunki): OcenaPorownania {
  if (!poprzedni) {
    return { comparable: false, powod: 'To pierwszy pomiar — nie ma go z czym porównać.' };
  }
  const a = minutyZGodziny(poprzedni.poraDnia);
  const b = minutyZGodziny(biezacy.poraDnia);
  if (a === null || b === null) {
    return { comparable: false, powod: 'Nie znam pory dnia jednego z pomiarów, więc ich nie porównuję.' };
  }
  if (Math.abs(a - b) > MAX_ROZNICA_PORY_MIN) {
    return {
      comparable: false,
      powod: 'Pomiary są o innej porze dnia (ponad 2 godziny różnicy). Sam skok rano jest niższy o więcej, niż daje osiem tygodni pracy.',
    };
  }
  if (!poprzedni.nawierzchnia || !biezacy.nawierzchnia) {
    return { comparable: false, powod: 'Nie wiem, na czym był robiony jeden z pomiarów, więc ich nie porównuję.' };
  }
  if (poprzedni.nawierzchnia.trim().toLowerCase() !== biezacy.nawierzchnia.trim().toLowerCase()) {
    return { comparable: false, powod: 'Inna nawierzchnia niż poprzednio — to unieważnia porównanie.' };
  }
  if (!poprzedni.obuwie || !biezacy.obuwie) {
    return { comparable: false, powod: 'Nie wiem, w czym był robiony jeden z pomiarów, więc ich nie porównuję.' };
  }
  if (poprzedni.obuwie.trim().toLowerCase() !== biezacy.obuwie.trim().toLowerCase()) {
    return { comparable: false, powod: 'Inne buty niż poprzednio — to unieważnia porównanie.' };
  }
  return { comparable: true, powod: '' };
}

// ─────────────────────────────────────────────────────────────────────
// 4. TRZY STANY KOMUNIKATU — NIGDY DWA (spec 4.3)
// ─────────────────────────────────────────────────────────────────────

/** Próg realnej zmiany CMJ: jeden dzień pomiaru. */
export const PROG_CMJ_JEDEN_DZIEN = 2.3;
/** …i średnia z dwóch dni. */
export const PROG_CMJ_DWA_DNI = 1.6;

export function progZmiany(dniPomiaru: number): number {
  return dniPomiaru >= 2 ? PROG_CMJ_DWA_DNI : PROG_CMJ_JEDEN_DZIEN;
}

export type StanZmiany = { stan: 1 | 2 | 3; tytul: string; tresc: string };

/**
 * Zmiana wyniku między pomiarami → komunikat.
 *
 * ⚠️ STAN DRUGI JEST OBOWIĄZKOWY. Bez niego produkt sprzedaje szum jako
 * postęp — i to jest jedyna granica między nim a większością rynku.
 * Funkcja nie ma gałęzi, która przy zmianie poniżej progu milczy albo
 * zaokrągla w górę; pilnuje tego selftest, który przemiata cały zakres.
 */
export function stanZmiany(roznica: number, prog: number): StanZmiany {
  const r = Math.round(roznica * 10) / 10;
  if (r > prog) {
    return {
      stan: 1,
      tytul: 'To jest realna zmiana',
      tresc: `Jesteś lepszy o ${r.toFixed(1).replace('.', ',')} cm — to więcej, niż wynosi błąd tego pomiaru.`,
    };
  }
  if (r < -prog) {
    return {
      stan: 3,
      tytul: 'Wynik spadł',
      tresc: 'Sprawdź sen i obciążenie — po ciężkim bloku spadek jest normalny. Jeśli akurat szybko rośniesz, to też nie jest cofnięcie się.',
    };
  }
  return {
    stan: 2,
    tytul: 'Bez zmian, których dałoby się dowieść',
    tresc: `To nie znaczy, że nie pracowałeś — znaczy, że ten pomiar jest za gruby, żeby to zobaczyć. Próg wynosi ${prog.toFixed(1).replace('.', ',')} cm.`,
  };
}

// ─────────────────────────────────────────────────────────────────────
// 5. BŁĄD KALIBRACJI — to jest mierzona wielkość, nie wynik
// ─────────────────────────────────────────────────────────────────────

export function bladKalibracji(predykcja: number, pomiar: number): number {
  return Math.round(Math.abs(predykcja - pomiar) * 10) / 10;
}

export type OpisKalibracji =
  | { rodzaj: 'punkt_zerowy'; tytul: string; tresc: string; blad: number }
  | { rodzaj: 'porownanie'; tytul: string; tresc: string; blad: number; bladPoprzedni: number };

/**
 * Co zawodnik czyta po zapisaniu pomiaru.
 *
 * ⚠️ Pierwszy pomiar w życiu jest PUNKTEM ZEROWYM i nie wolno go nazwać ani
 * dobrym, ani słabym: przy drugim podejściu do każdego testu wynik rośnie
 * o ~5% z samego oswojenia się z zadaniem i wygląda to identycznie jak postęp.
 * Trafienie za pierwszym razem też nic nie znaczy — mieści się w przypadku
 * i dlatego NIE MA tu gałęzi chwalącej trafność.
 */
export function opiszKalibracje(params: {
  predykcja: number;
  pomiar: number;
  /** Błąd kalibracji z poprzedniego porównywalnego pomiaru tej samej osi, albo `null`. */
  bladPoprzedni: number | null;
  jednostka: 'cm' | 'razy';
}): OpisKalibracji {
  const blad = bladKalibracji(params.predykcja, params.pomiar);
  const j = params.jednostka === 'cm' ? 'cm' : '';
  const liczba = (n: number) => `${String(Math.round(n * 10) / 10).replace('.', ',')}${j ? ` ${j}` : ''}`;

  if (params.bladPoprzedni === null) {
    return {
      rodzaj: 'punkt_zerowy',
      blad,
      tytul: 'To jest Twój punkt zerowy',
      tresc: `Powiedziałeś ${liczba(params.predykcja)}, wyszło ${liczba(params.pomiar)}. Różnica to ${liczba(blad)} `
        + '— i to jest liczba, którą będziemy zmniejszać. Dzisiejszy wynik nie jest ani dobry, ani słaby: '
        + 'jest punktem odniesienia.',
    };
  }
  const delta = Math.round((params.bladPoprzedni - blad) * 10) / 10;
  if (delta > 0) {
    return {
      rodzaj: 'porownanie',
      blad,
      bladPoprzedni: params.bladPoprzedni,
      tytul: 'Znasz się lepiej niż poprzednio',
      tresc: `Poprzednio myliłeś się o ${liczba(params.bladPoprzedni)}, teraz o ${liczba(blad)}. `
        + 'To jest jedyna rzecz w tym pomiarze, którą wolno nazwać postępem.',
    };
  }
  if (delta < 0) {
    return {
      rodzaj: 'porownanie',
      blad,
      bladPoprzedni: params.bladPoprzedni,
      tytul: 'Różnica urosła',
      tresc: `Poprzednio myliłeś się o ${liczba(params.bladPoprzedni)}, teraz o ${liczba(blad)}. `
        + 'Częściej zdarza się to tym, którzy realnie się rozwinęli — widzą więcej, więc oceniają siebie inaczej.',
    };
  }
  return {
    rodzaj: 'porownanie',
    blad,
    bladPoprzedni: params.bladPoprzedni,
    tytul: 'Różnica bez zmian',
    tresc: `Poprzednio myliłeś się o ${liczba(params.bladPoprzedni)} i teraz tak samo. `
      + 'Jeden pomiar nie wystarczy, żeby coś z tego wyczytać.',
  };
}

// ─────────────────────────────────────────────────────────────────────
// 6. ŁADUNKI DO BAZY — kolejność wymuszona także tutaj
// ─────────────────────────────────────────────────────────────────────

/**
 * INSERT predykcji. NIE ZAWIERA i nie może zawierać `measured_value`
 * ani `measured_at` — inaczej appka wysłałaby zapytanie, które baza odrzuci
 * wyzwalaczem, a zawodnik zobaczyłby błąd zamiast ekranu.
 */
export function wierszPredykcji(params: {
  userId: string;
  os: Os;
  metryka: string;
  predykcja: number;
  isBaseline: boolean;
  warunki: Warunki;
  teraz: Date;
}): Record<string, unknown> {
  return {
    user_id: params.userId,
    axis: params.os,
    metric: params.metryka,
    predicted_value: params.predykcja,
    predicted_at: params.teraz.toISOString(),
    is_baseline: params.isBaseline,
    time_of_day: params.warunki.poraDnia,
    surface: params.warunki.nawierzchnia,
    footwear: params.warunki.obuwie,
  };
}

/**
 * UPDATE pomiaru. NIE ZAWIERA i nie może zawierać `predicted_value`
 * ani `predicted_at` — to jest dokładnie ta dziura, którą łata wyzwalacz
 * `trg_calibration_kolejnosc`: bez niej dało się zmienić predykcję w tym
 * samym zapytaniu, w którym zapisuje się pomiar.
 */
export function patchPomiaru(params: {
  pomiar: number;
  comparable: boolean;
  teraz: Date;
}): Record<string, unknown> {
  return {
    measured_value: params.pomiar,
    measured_at: params.teraz.toISOString(),
    comparable: params.comparable,
  };
}

// ─────────────────────────────────────────────────────────────────────
// 7. STAN EKRANU — R5 obowiązuje tak samo
// ─────────────────────────────────────────────────────────────────────

export type StanKalibracji =
  | { rodzaj: 'nie_wiem'; powod: string }
  | { rodzaj: 'brak_predykcji' }
  | { rodzaj: 'czeka_na_pomiar'; wiersz: WierszKalibracji }
  | { rodzaj: 'zamkniete'; ostatni: WierszKalibracji };

/**
 * Wiersze zawodnika dla JEDNEJ osi (najnowsze pierwsze) → stan ekranu.
 * Otwarta predykcja (pomiar pusty) blokuje zapisanie kolejnej: dwie otwarte
 * predykcje znaczyłyby, że zawodnik może zgadywać do skutku i wybrać tę,
 * która trafiła.
 */
export function stanKalibracji(
  wiersze: WierszKalibracji[] | null,
  bladOdczytu: string | null = null,
): StanKalibracji {
  if (bladOdczytu) {
    return { rodzaj: 'nie_wiem', powod: `nie odczytałem kalibracji: ${bladOdczytu}` };
  }
  const w = wiersze || [];
  const otwarta = w.find((r) => r.measured_at === null);
  if (otwarta) return { rodzaj: 'czeka_na_pomiar', wiersz: otwarta };
  const zamkniete = w.filter((r) => r.measured_at !== null);
  if (zamkniete.length === 0) return { rodzaj: 'brak_predykcji' };
  return { rodzaj: 'zamkniete', ostatni: zamkniete[0] };
}

/**
 * Czy ten pomiar jest punktem zerowym (`is_baseline`). Punkt zerowy to
 * pierwszy DOKOŃCZONY pomiar tej osi — nie pierwszy wiersz, bo predykcja
 * bez pomiaru niczego nie ustala.
 */
export function czyPunktZerowy(wiersze: WierszKalibracji[] | null): boolean {
  return (wiersze || []).filter((r) => r.measured_at !== null).length === 0;
}

/** Błąd kalibracji z ostatniego PORÓWNYWALNEGO dokończonego pomiaru, albo `null`. */
export function poprzedniBlad(wiersze: WierszKalibracji[] | null): number | null {
  const w = (wiersze || []).filter(
    (r) => r.measured_at !== null && r.measured_value !== null && r.comparable !== false,
  );
  if (w.length === 0) return null;
  const p = w[0];
  return bladKalibracji(Number(p.predicted_value), Number(p.measured_value as number));
}

// ─────────────────────────────────────────────────────────────────────
// 8. TREŚĆ — ⚠️ DO PRZEJRZENIA PRZEZ KUBĘ
// ─────────────────────────────────────────────────────────────────────

export const KALIBRACJA_ENTRY_LABEL = 'Kalibracja';
export const KALIBRACJA_ENTRY_PODPIS =
  'Najpierw mówisz, ile Ci wyjdzie. Potem mierzysz. Mierzymy różnicę między jednym a drugim.';

export const KALIBRACJA_PYTANIE_FIZYCZNA =
  'Za chwilę zmierzysz swój wyskok: w miejscu, ręce na biodrach, bez zamachu. Ile centymetrów wyskoczysz?';
export const KALIBRACJA_PYTANIE_ZACHOWANIE =
  'W ostatnich czterech tygodniach — ile razy zrobiłeś coś dla piłki poza treningiem drużyny? Jedna liczba.';
export const KALIBRACJA_NIE_WIEM_PODPOWIEDZ =
  'Nie wiesz? Zgadnij. Interesuje mnie Twoje zgadnięcie, nie dokładność.';

export const KALIBRACJA_ZABLOKOWANE =
  'Najpierw podaj swoją liczbę. Pomiaru nie da się tu wpisać wcześniej — i to jest cały sens tego narzędzia.';

export const KALIBRACJA_NIE_WIEM =
  'Nie udało się sprawdzić Twoich pomiarów. Spróbuj jeszcze raz — nic nie zostało zapisane.';

/** Warunki do przepisania na ekran pomiaru fizycznego. */
export const KALIBRACJA_PROTOKOL: readonly string[] = [
  'Twarda, płaska nawierzchnia — nie trawa, nie mata.',
  'Rozgrzewka 8 minut: 3 trucht, 3 mobilizacja, 2 trzy podskoki narastające.',
  '5 skoków, minuta przerwy między nimi. Liczy się średnia z 3 najlepszych.',
  'Ręce na biodrach przez cały skok. Jeśli oderwiesz — próba się nie liczy.',
  'Nagrywaj 240 klatkami na sekundę, telefon z boku na wysokości kolan.',
];

/** Jedna rzecz do zrobienia jutro (zakaz 17) — ta sama dla obu osi. */
export const KALIBRACJA_NA_JUTRO =
  'Zapisz w kalendarzu powtórkę za sześć tygodni, o tej samej godzinie. Bez tego dzisiejsza liczba nie ma z czym się porównać.';
