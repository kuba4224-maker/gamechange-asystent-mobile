// PLAN-D-A2A3 08.2026 (14.08.2026) — GODZINA WYDARZENIA, KTÓREJ WOLNO NIE BYĆ.
//
// Czysta logika: ZERO Supabase, ZERO Reacta. Inaczej nie da się jej sprawdzić
// bez ekranu, a to jest reguła, którą łatwo zepsuć po cichu.
//
// PO CO TO ISTNIEJE — makieta `claude/MAKIETA_WIDOK_TYGODNIA.html` pokazuje przy
// kaflach tagi „18:00" i „11:00", a jej stopka rozstrzyga to jednym zdaniem:
//
//   „Godzina przy kaflu pojawia się TYLKO WTEDY, GDY ZAWODNIK JĄ PODAŁ."
//
// Do 14.08.2026 `calendar_events` nie miało ANI JEDNEJ kolumny o czasie
// (14 kolumn, `scheduled_date` typu `date` — zmierzone). Migracja A2 dokłada
// `scheduled_time time`, NULL-owalną, bez wartości domyślnej.
//
// ⛔ NAJWAŻNIEJSZA REGUŁA TEGO PLIKU: BRAK GODZINY MA ZOSTAĆ BRAKIEM.
// `formatujGodzine` zwraca przy braku `null`, nigdy `''` i nigdy `'—'`.
// Pusty napis i myślnik WYGLĄDAJĄ NA EKRANIE JAK DANE: zawodnik widzi wtedy
// tag, w którym „coś jest", i nie ma jak odróżnić „nie podałem" od „system
// zgubił". `null` to jedyna wartość, której nie da się przypadkiem narysować.
//
// ⚠️ DWA RÓŻNE POZIOMY SUROWOŚCI, ŚWIADOMIE:
//   • `walidujGodzine` — SUROWA, dla tego, co zawodnik WPISUJE. Ma nie wpuścić
//     do bazy niczego, co baza i tak odrzuci (i niczego, co przejdzie, a znaczy
//     co innego, niż zawodnik myślał).
//   • `formatujGodzine` — TOLERANCYJNA, dla tego, co WRACA Z BAZY. PostgREST
//     podaje `time` jako '18:00:00', czyli z sekundami. Gdyby formatowanie było
//     tak samo surowe jak walidacja, appka NIE POKAZAŁABY godziny, którą sama
//     przed chwilą zapisała.
// Ta asymetria jest celowa i ma własną asercję w selfteście.

/** Wynik sprawdzenia godziny wpisanej przez zawodnika. */
export type WynikGodziny =
  | { ok: true; wartosc: string }
  | { ok: false; powod: string };

/**
 * Sprawdza godzinę WPISANĄ PRZEZ ZAWODNIKA i normalizuje ją do 'HH:MM'.
 *
 * Przyjmuje '8:00' i '08:00' — jedno i drugie znaczy to samo i baza jedno
 * i drugie przyjmuje (sprawdzone na PostgreSQL 16: `time '8:00'` zapisuje się
 * jako 08:00:00). Appka NIE MOŻE być tu surowsza od bazy, bo odrzucałaby zapis,
 * który jest poprawny — a zawodnik nie ma jak zgadnąć, że chodziło o zero.
 * Zwracana `wartosc` jest ZAWSZE dwucyfrowa, żeby w bazie nie leżały dwa
 * zapisy tej samej godziny.
 *
 * Odrzuca: pustkę, '25:00', '8:70', sekundy ('18:00:30' — produkt nie zna
 * pojęcia sekundy i zapis wyrenderowałby się jako '18:00', gubiąc różnicę),
 * '24:00' (poprawny `time` w PostgreSQL, ale nie godzina, którą ktoś wpisuje)
 * oraz wszystko, co nie jest napisem.
 */
export function walidujGodzine(wejscie: unknown): WynikGodziny {
  if (typeof wejscie !== 'string') {
    return { ok: false, powod: 'Podaj godzinę w formacie 18:00.' };
  }
  const tekst = wejscie.trim();
  if (tekst === '') {
    // Pusto NIE JEST błędem samym w sobie — godzina jest opcjonalna. Ale ta
    // funkcja odpowiada na pytanie „czy to jest godzina", a pustka nią nie jest.
    // Ekran, który pozwala nie podawać godziny, po prostu jej nie woła.
    return { ok: false, powod: 'Nie podano godziny.' };
  }
  const m = /^(\d{1,2}):(\d{2})$/.exec(tekst);
  if (!m) {
    return { ok: false, powod: 'Podaj godzinę w formacie 18:00 — same godziny i minuty.' };
  }
  const godziny = Number(m[1]);
  const minuty = Number(m[2]);
  if (godziny > 23) {
    return { ok: false, powod: 'Godzina musi być z zakresu 0–23.' };
  }
  if (minuty > 59) {
    return { ok: false, powod: 'Minuty muszą być z zakresu 00–59.' };
  }
  return { ok: true, wartosc: `${String(godziny).padStart(2, '0')}:${m[2]}` };
}

/**
 * Zamienia to, CO WRÓCIŁO Z BAZY, na tekst tagu — albo na `null`.
 *
 * `null` znaczy „NIE RYSUJ TAGU". Nie `''`, nie `'—'`, nie `'brak'`.
 *
 * Tolerancyjna z rozmysłem: przyjmuje '18:00:00' (tak PostgREST podaje `time`),
 * '18:00' i '18:00:00.000'. Nie „naprawia" jednak wartości bezsensownych —
 * '25:00' z bazy nie ma prawa przyjść (ograniczenie `chk_calendar_events_
 * scheduled_time`), a gdyby przyszło, lepiej nie pokazać nic niż pokazać
 * zawodnikowi godzinę, której nie ma na zegarze.
 */
export function formatujGodzine(wartosc: unknown): string | null {
  if (typeof wartosc !== 'string') return null;
  const tekst = wartosc.trim();
  if (tekst === '') return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(tekst);
  if (!m) return null;
  const godziny = Number(m[1]);
  const minuty = Number(m[2]);
  if (godziny > 23 || minuty > 59) return null;
  return `${String(godziny).padStart(2, '0')}:${m[2]}`;
}

/**
 * Jedno miejsce, w którym ekran pyta, czy w ogóle rysować tag godziny.
 *
 * Istnieje po to, żeby żaden ekran nie robił tego po swojemu — bo „po swojemu"
 * prędzej czy później znaczy `if (event.scheduled_time)`, a to jest inna reguła:
 * przepuszcza '' i wywala się na wartościach, których nie da się sformatować.
 */
export function czyPokazacGodzine(wartosc: unknown): boolean {
  return formatujGodzine(wartosc) !== null;
}

/**
 * Godzina jako minuty od północy — albo `null`, gdy godziny nie ma.
 *
 * `null`, NIE zero. Zero to prawidłowa godzina (północ) i pomylenie jej
 * z brakiem godziny jest dokładnie tym samym błędem co `DEFAULT '00:00'`
 * w bazie, przed którym broni się migracja A2.
 */
export function godzinaWMinutach(wartosc: unknown): number | null {
  const s = formatujGodzine(wartosc);
  if (s === null) return null;
  return Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
}
