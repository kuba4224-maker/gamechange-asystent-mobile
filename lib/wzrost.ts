// PLAN-D-F 08.2026 (12.08.2026) — NOWY PLIK. Pomiary wzrostu: walidacja i opis
// stanu. Czysta logika, zero Reacta, zero Supabase — uruchamialna w node.
//
// ── PO CO TO ISTNIEJE ────────────────────────────────────────────────
// KOREKTA WŁASNEGO ZNALEZISKA F-N6. W raporcie F napisałem, że Osłona nie może
// zadziałać, „bo nic nie wypełnia `height_logs`". **To było niedokładne i sam to
// prostuję.** Ekran wpisywania wzrostu ISTNIEJE od Toru 5 i siedzi w Profilu
// (`app/(tabs)/profil.tsx`, sekcja 2b), i to on zapisał jedyny pomiar w bazie.
//
// Prawdziwa blokada jest węższa i dlatego trudniejsza do zobaczenia:
// **formularz nie pozwalał podać DATY pomiaru.** `measured_at` ustawiała baza
// (`DEFAULT CURRENT_DATE`), więc każdy pomiar był z dnia wpisania. A Osłona
// wymaga dwóch pomiarów oddalonych o co najmniej pół roku — przy oknie
// 3-miesięcznym błąd wynosi ±5,6 cm/rok i klasyfikacja jest bezwartościowa.
//
// Skutek: zawodnik, który dziś zakłada konto, może odblokować Osłonę
// **najwcześniej za pół roku**, i to tylko jeśli pamięta, żeby wrócić.
// A wzrost sprzed roku zna prawie każdy — z bilansu, z pomiaru w klubie,
// z rozmowy w domu. Ta wiedza istniała i nie było jak jej wpisać.
//
// ⚠️ TEN PLIK NIE LICZY TEMPA WZROSTU I NIE ZNA PROGU 7,2 cm/rok.
// Klasyfikację robi WYŁĄCZNIE backend (`gamechange-app/lib/arbiter-glosu.js`),
// a jej wynik wraca do appki wierszem `weekly_voice`. Druga implementacja progu
// po tej stronie to gwarantowany cichy rozjazd: obie liczą, obie mają zielone
// testy, a odpowiadają różnie. Appka zbiera surowe pomiary i opisuje FAKTY
// (ile pomiarów, jaki odstęp) — nigdy nie wydaje oceny.
//
// ⚠️ I NIE POKAZUJE ŻADNEJ LICZBY O DOJRZAŁOŚCI BIOLOGICZNEJ. Zakaz bezwzględny
// (spec 3.3): ani wieku biologicznego, ani „PHV za X miesięcy", ani
// przewidywanego wzrostu dorosłego. Błąd tych szacunków idzie w najgorszą
// możliwą stronę — 0 trafień na 39 przypadków u wcześnie dojrzewających.

/** Wiersz `height_logs` w kształcie, w jakim wraca z Supabase. */
export type PomiarWzrostu = {
  height_cm: number;
  measured_at: string; // 'YYYY-MM-DD'
};

/** Ten sam zakres co `CHECK (height_cm BETWEEN 50 AND 250)` w bazie. */
export const MIN_CM = 50;
export const MAX_CM = 250;

/**
 * Jak dawno wstecz wolno wpisać pomiar. Dziesięć lat: dłuższa historia nie ma
 * wartości dla zawodnika w wieku, do którego ten produkt mówi, a bez żadnej
 * granicy literówka w roku („2016" zamiast „2026") wygląda jak normalny pomiar
 * i po cichu psuje tempo policzone przez backend.
 */
export const MAX_LAT_WSTECZ = 10;

export type WynikWalidacji =
  | { ok: true; wartosc: number; data: string; ostrzezenie: string | null }
  | { ok: false; blad: string };

/** 'YYYY-MM-DD' → liczba dni od epoki (UTC, zero pułapek strefowych). */
export function dniOdEpoki(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (!Number.isFinite(t)) return null;
  // Odrzuca daty, które się „przewinęły" (31.02 → 03.03).
  const z = new Date(t).toISOString().slice(0, 10);
  return z === iso ? Math.round(t / 86400000) : null;
}

/**
 * Data lokalna jako 'YYYY-MM-DD'.
 * ⚠️ REGUŁA E-N2: `dzis` wchodzi PARAMETREM, funkcja nie czyta zegara sama.
 */
export function naDateLokalna(dzis: Date): string {
  const mm = String(dzis.getMonth() + 1).padStart(2, '0');
  const dd = String(dzis.getDate()).padStart(2, '0');
  return `${dzis.getFullYear()}-${mm}-${dd}`;
}

/**
 * Sprawdza jeden pomiar, ZANIM pójdzie do bazy.
 *
 * Rozróżnia BŁĄD (nie zapisujemy) od OSTRZEŻENIA (zapisujemy, ale mówimy).
 * Drugi pomiar tego samego dnia nie jest błędem — baza nie ma na to unikalności
 * i bywa uzasadniony (poprawka pomyłki) — ale zawodnik ma o tym wiedzieć,
 * bo inaczej podwójne dotknięcie przycisku wygląda jak brak reakcji.
 */
export function sprawdzPomiar(
  wartoscTekst: string,
  dataIso: string,
  dzisIso: string,
  istniejace: PomiarWzrostu[],
): WynikWalidacji {
  const norm = String(wartoscTekst).trim().replace(',', '.');
  if (norm === '') return { ok: false, blad: 'Podaj wzrost w centymetrach.' };
  const wartosc = Number(norm);
  if (!Number.isFinite(wartosc)) return { ok: false, blad: 'Podaj wzrost w centymetrach.' };
  if (wartosc < MIN_CM || wartosc > MAX_CM) {
    return { ok: false, blad: `Wzrost musi być w zakresie ${MIN_CM}–${MAX_CM} cm.` };
  }

  const d = dniOdEpoki(dataIso);
  const dzis = dniOdEpoki(dzisIso);
  if (d === null) return { ok: false, blad: 'Podaj datę pomiaru w formacie RRRR-MM-DD.' };
  if (dzis === null) return { ok: false, blad: 'Nie umiem ustalić dzisiejszej daty.' };
  if (d > dzis) return { ok: false, blad: 'Data pomiaru nie może być z przyszłości.' };
  if (d < dzis - MAX_LAT_WSTECZ * 366) {
    return { ok: false, blad: `Data pomiaru nie może być starsza niż ${MAX_LAT_WSTECZ} lat.` };
  }

  const tegoSamegoDnia = istniejace.some((p) => p.measured_at === dataIso);
  return {
    ok: true,
    wartosc,
    data: dataIso,
    ostrzezenie: tegoSamegoDnia
      ? 'Masz już pomiar z tego dnia. Zapiszę drugi — jeśli to pomyłka, ten starszy zostaje w historii.'
      : null,
  };
}

export type StanPomiarow = {
  /** Ile pomiarów zawodnik ma w ogóle. */
  ile: number;
  najstarszy: PomiarWzrostu | null;
  najnowszy: PomiarWzrostu | null;
  /** Pełne miesiące między najstarszym a najnowszym. `null`, gdy pomiarów jest mniej niż dwa. */
  odstepMiesiecy: number | null;
  /**
   * Jedno zdanie dla zawodnika: co ma, i co dałoby systemowi więcej.
   * ⚠️ NIGDY nie zawiera oceny („rośniesz szybko") ani progu — ocena przychodzi
   * z arbitra przez `weekly_voice`.
   */
  zdanie: string;
};

/**
 * Pełne miesiące KALENDARZOWE między dwiema datami.
 *
 * ⚠️ ŚWIADOMA RÓŻNICA WOBEC BACKENDU, nazwana, żeby nie wyglądała na pomyłkę.
 * `tempoZPomiarow` w `gamechange-app/lib/arbiter-glosu-io.js` liczy okno przez
 * `Math.floor(dni / 30,4375)`, więc dokładnie rok wychodzi tam jako **11**
 * miesięcy, nie 12. Tam to jest w porządku i zostaje: zaniżenie działa na
 * korzyść bezpieczeństwa — przy oknie tuż poniżej progu arbiter woli powiedzieć
 * „nie wiem" niż sklasyfikować.
 *
 * Tutaj liczba trafia do ZDANIA DLA ZAWODNIKA. „Twoje pomiary dzieli
 * 11 miesięcy", gdy dzieli je równo rok, jest po prostu nieprawdą — a produkt,
 * który kłamie w drobiazgu sprawdzalnym gołym okiem, traci wiarygodność
 * w rzeczach niesprawdzalnych.
 */
export function miesiecyMiedzy(od: string, do_: string): number | null {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(od);
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(do_);
  if (!a || !b || dniOdEpoki(od) === null || dniOdEpoki(do_) === null) return null;
  if ((dniOdEpoki(do_) as number) < (dniOdEpoki(od) as number)) return null;
  let m = (Number(b[1]) - Number(a[1])) * 12 + (Number(b[2]) - Number(a[2]));
  if (Number(b[3]) < Number(a[3])) m -= 1; // miesiąc jeszcze się nie dopełnił
  return m;
}

/**
 * Opis stanu pomiarów. Świadomie mówi, CO ZROBIĆ, a nie tylko czego brakuje:
 * „nie mam dość danych" bez wskazania ruchu jest komunikatem o systemie,
 * nie o zawodniku.
 */
export function opiszPomiary(pomiary: PomiarWzrostu[]): StanPomiarow {
  const p = pomiary
    .filter((x) => Number.isFinite(Number(x.height_cm)) && dniOdEpoki(x.measured_at) !== null)
    .slice()
    .sort((a, b) => (a.measured_at < b.measured_at ? -1 : a.measured_at > b.measured_at ? 1 : 0));

  if (p.length === 0) {
    return {
      ile: 0,
      najstarszy: null,
      najnowszy: null,
      odstepMiesiecy: null,
      zdanie: 'Nie masz jeszcze żadnego pomiaru. Wpisz swój dzisiejszy wzrost — a jeśli pamiętasz, '
        + 'ile miałeś rok temu, dopisz też tamten pomiar z tamtą datą.',
    };
  }
  if (p.length === 1) {
    return {
      ile: 1,
      najstarszy: p[0],
      najnowszy: p[0],
      odstepMiesiecy: null,
      zdanie: 'Masz jeden pomiar. Z jednego nie da się powiedzieć nic o tym, jak szybko rośniesz. '
        + 'Jeśli pamiętasz swój wzrost sprzed roku — wpisz go z tamtą datą, a system będzie miał co porównać.',
    };
  }

  const najstarszy = p[0];
  const najnowszy = p[p.length - 1];
  const odstep = miesiecyMiedzy(najstarszy.measured_at, najnowszy.measured_at);
  return {
    ile: p.length,
    najstarszy,
    najnowszy,
    odstepMiesiecy: odstep,
    // Świadomie BEZ progu i BEZ oceny: podajemy odstęp jako fakt i mówimy,
    // że dłuższy jest pewniejszy. Ocena należy do arbitra.
    zdanie: `Twoje pomiary: ${p.length}. Najstarszy i najnowszy dzieli ${opisOdstepu(odstep)}. `
      + 'Im dłuższy odstęp, tym pewniej system rozpozna Twoje tempo wzrostu.',
  };
}

/** „7 miesięcy" / „miesiąc" / „mniej niż miesiąc" — po polsku, bez liczby w mianowniku tam, gdzie brzmi źle. */
export function opisOdstepu(miesiecy: number | null): string {
  if (miesiecy === null) return 'nieznany czas';
  if (miesiecy === 0) return 'mniej niż miesiąc';
  if (miesiecy === 1) return 'miesiąc';
  if (miesiecy >= 2 && miesiecy <= 4) return `${miesiecy} miesiące`;
  return `${miesiecy} miesięcy`;
}
