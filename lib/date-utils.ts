// Pomocnicze funkcje dat — odpowiednik toLocalDateStr()/getCurrentWeekDayList()
// z asystent_app.html. WAŻNE: liczą datę z lokalnych getFullYear/getMonth/getDate,
// NIGDY przez toISOString() (ta zawsze liczy UTC) — to ta sama poprawka strefy
// czasowej co w wersji webowej (patrz komentarz przy toLocalDateStr w web),
// inaczej "dzisiaj" przesuwa się o dzień w oknie ok. 22:00-02:00 czasu PL.
export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DAYS_OF_WEEK: [string, string][] = [
  ['MON', 'Pon'], ['TUE', 'Wt'], ['WED', 'Śr'], ['THU', 'Czw'],
  ['FRI', 'Pt'], ['SAT', 'Sob'], ['SUN', 'Nd'],
];
export const DAY_LABELS_PL: Record<string, string> = Object.fromEntries(
  DAYS_OF_WEEK.map(([code, label]) => [code, label.toLowerCase()])
);

export function getCurrentWeekDayList() {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0=Pon..6=Nd
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek);
  const days: { dateStr: string; dayCode: string; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({ dateStr: toLocalDateStr(d), dayCode: DAYS_OF_WEEK[i][0], label: DAYS_OF_WEEK[i][1] });
  }
  return days;
}

// PORZADEK R9 08.08.2026 (M26/B37) — KANONICZNY słownik miesięcy (dopełniacz),
// przeniesiony z lib/contentDose.ts, żeby istniał w JEDNYM miejscu. Powód
// powstania (B37, raport B rundy 6): na Hermesie (Android) pełne dane `Intl`
// bywają przycięte i `toLocaleDateString('pl-PL')` potrafi dać miesiąc po
// angielsku albo jako liczbę — dlatego dawka treści formatuje datę z tej
// listy, nie przez `Intl`. Nowy kod, który potrzebuje polskiej daty
// odpornej na Hermes, ma brać TĘ listę, nie zakładać własnej.
export const MONTHS_GENITIVE_PL = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
] as const;

// ⚠️ B37 (raport B rundy 6, 08.08.2026): ta funkcja stoi na
// `toLocaleDateString('pl-PL')` — na Hermesie miesiąc MOŻE wyjść po angielsku
// (nie zweryfikowane na urządzeniu). Świadomie NIE przepisana na słownik
// wyżej w rundzie 9: używa jej kilka ekranów z różnymi opcjami Intl i ręczna
// podróbka mogłaby zmienić widoczne formaty na urządzeniach ze zdrowym ICU.
// Jeśli Kuba zobaczy na telefonie angielskie miesiące — to jest to miejsce,
// a lekarstwem jest MONTHS_GENITIVE_PL (wzorzec: contentDoseDateLabel).
export function formatDatePl(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString('pl-PL', opts ?? { day: 'numeric', month: 'short' });
}
