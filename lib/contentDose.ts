// PRAKTYKA-EKRAN B6 08.08.2026 — NOWY PLIK.
//
// PO CO ISTNIEJE: dawka treści edukacyjnej Bloku Skupienia jest od rundy 5
// ZAPISYWANA w bazie (`focus_blocks.content_doses jsonb`, pas A) w postaci
// gotowej na ekran — i do tej rundy NIE BYŁA CZYTANA PRZEZ ŻADEN EKRAN.
// Stacja „Praktyka" była domknięta w danych, nie dla człowieka. Reguła R1
// mówi wprost: zadanie nie jest skończone, dopóki człowiek tego nie widzi.
//
// KONTRAKT, KTÓRY TEN PLIK REALIZUJE: `claude/RAPORT_ZWROTNY_A_RUNDA_5.md`,
// sekcja 11 („KONTRAKT DLA PASA B") — kształt koperty, kształt jednej dawki,
// przykład prawdziwego rekordu i sześć zasad renderowania. Wszystkie sześć
// zasad ma tu swoją asercję w `lib/contentDose.selftest.ts`.
//
// DLACZEGO OSOBNY PLIK, A NIE KOD W KOMPONENCIE: tak samo jak przy
// `lib/componentHints.ts` i `lib/rediagnosis.ts` — reguły, których nie da się
// sprawdzić przez uruchomienie appki (trzy jawne stany braku, wersja koperty,
// „`dla_chetnych: null` = brak przycisku"), muszą być czystymi funkcjami
// z własnym selftestem. Ten plik nie dotyka Supabase i nie zna Reacta.
//
// ⚠️ ZERO ZAPISU DO TEJ KOLUMNY (zasada 5 kontraktu). Baza dziś na to
// pozwoli — polityka `focus_blocks_owner` jest `FOR ALL`, znalezisko A27 —
// ale to jest treść generowana przez backend. W tym pliku nie ma ani jednej
// funkcji zapisu i nie wolno jej tu dopisać bez decyzji.
//
// ⚠️ ZERO WYWOŁAŃ ENDPOINTU (zasada 6 kontraktu). `api/generate-focus-block-
// content.js` z `action:'checkin'` GENERUJE treść i kosztuje wywołanie modelu.
// Dawka do odczytu jest w bazie i odczyt jest darmowy — cała sekcja 12 raportu
// A rundy 5 jest o tym, że to jest 9 → 4 wywołania na Blok.

import { formatHintSource } from './componentHints';

// ─────────────────────────────────────────────────────────────
// KSZTAŁT DANYCH — 1:1 z sekcją 11 raportu A rundy 5
// ─────────────────────────────────────────────────────────────

/** Wersja koperty, którą ten plik umie narysować. Wyższa = STOP, patrz `parseContentDoses`. */
export const CONTENT_DOSE_ENVELOPE_VERSION = 1;

/** Nazwa kolumny — jedno źródło, żeby zapytanie i rozpoznanie błędu mówiły o tym samym. */
export const CONTENT_DOSE_COLUMN = 'content_doses';

/**
 * Podpowiedź z materiałów przyklejona do dawki. DOKŁADNIE ten sam kształt co
 * `decision_recommendations.source_hint` z rundy 4 — dlatego renderujemy ją
 * tą samą regułą (`formatHintSource`), a nie drugą kopią reguły.
 *
 * `celowanie` i `wybor` są DIAGNOSTYCZNE i nie idą na ekran (zasada 3).
 * Dlatego nie ma ich w typie karty — patrz `ContentDoseCard`.
 */
export type ContentDoseSourceHint = {
  wersja?: number;
  klucz?: string;
  tresc?: string | null;
  material?: string | null;
  strona?: string | null;
  rodzaj?: string | null;
  celowanie?: string | null;
  segment_id?: string | null;
  component_id?: string | null;
  wybor?: string | null;
  wszystkie_w_promptcie?: number;
};

export type ContentDose = {
  wersja: number;
  /** `<id bloku>:e<etap>:<data>` — stabilny, deterministyczny. Klucz Reacta i deduplikacja. */
  klucz: string;
  /** Etap progresji Bloku. ⚠️ SUROWEJ LICZBY NIE POKAZUJEMY ZAWODNIKOWI (zasada z kontraktu). */
  etap: number | null;
  wygenerowano_at: string;
  /** Główna treść, 2–4 zdania, pisane pod 15-latka (A10). GOTOWA — bez obróbki. */
  krok_praktyczny: string;
  /** `null` = model nie miał czego pogłębić. NIE renderuj pustego „Dla chętnych" (zasada 2). */
  dla_chetnych: string | null;
  segment_id: string | null;
  component_id: string | null;
  zrodlo_podpowiedzi: ContentDoseSourceHint | null;
};

export type ContentDoseEnvelope = {
  wersja: number;
  dawki: ContentDose[];
};

// ─────────────────────────────────────────────────────────────
// REGUŁA R5 — „nie ma kolumny" to NIE jest „nie ma dawki"
// ─────────────────────────────────────────────────────────────
// Migracja z sekcji 7 raportu A rundy 5 (`ALTER TABLE focus_blocks ADD COLUMN
// content_doses jsonb`) może jeszcze nie być wklejona. Wtedy PostgREST odrzuca
// TO JEDNO zapytanie kodem `42703` (Postgres, undefined_column) albo
// `PGRST204` (schema cache). Gdyby ekran potraktował to jak „nie ma dawki",
// funkcja wyglądałaby na wdrożoną i nikt nigdy by nie wrócił — dokładnie
// „cichy brak" z audytu po bloku 3.
//
// Ten sam wzorzec co `isUnknownColumnError()` w `app/(tabs)/cele.tsx` (runda 5)
// i `isMissingTableError()` w `lib/componentHints.ts` (runda 4). Trzecia kopia
// wzorca, świadomie: tamte dwie mieszkają w plikach spoza tego pasa i pytają
// o inne kolumny, a scalanie ich wymagałoby ruszenia `cele.tsx`.
export function isMissingContentDoseColumnError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  if (code === '42703' || code === 'PGRST204') return true;
  const text = [e.message, e.details, e.hint]
    .map((v) => (typeof v === 'string' ? v : ''))
    .join(' ')
    .toLowerCase();
  if (!text.includes(CONTENT_DOSE_COLUMN)) return false;
  return text.includes('column')
    || text.includes('schema cache')
    || text.includes('does not exist')
    || text.includes('could not find');
}

/**
 * Log przy braku kolumny — mówi wprost, CZEGO ZAWODNIK NIE WIDZI, a nie że
 * „coś poszło nie tak". Trzymany jako stała, żeby selftest mógł sprawdzić, że
 * nadal wymienia migrację i skutek dla zawodnika.
 */
export const CONTENT_DOSE_COLUMN_MISSING_WARN =
  '[dawka] Kolumna focus_blocks.content_doses nie istnieje w bazie — zawodnik NIE zobaczy '
  + 'ani jednej dawki treści z Bloku Skupienia, mimo że backend je generuje (i płacimy za nie '
  + 'drugi raz). Migracja do wklejenia: RAPORT_ZWROTNY_A_RUNDA_5.md, sekcja 7.';

export const CONTENT_DOSE_UNSUPPORTED_VERSION_WARN =
  '[dawka] Koperta focus_blocks.content_doses ma wersję nowszą niż ta, którą ten ekran umie '
  + 'narysować. Nic nie zgaduję i nic nie pokazuję — sprawdź kontrakt w '
  + 'RAPORT_ZWROTNY_A_RUNDA_5.md, sekcja 11.';

// ─────────────────────────────────────────────────────────────
// „PRZECZYTANE" — ZAPIS B7 08.08.2026 (M23/B36, zamówienie z raportu B r6 8.3)
// ─────────────────────────────────────────────────────────────
// OSOBNA kolumna `focus_blocks.content_dose_seen jsonb` (lista kluczy dawek,
// które zawodnik otworzył). Osobna, bo `content_doses` pisze WYŁĄCZNIE backend
// (zasada 5 kontraktu pasa A) — a „przeczytane" to jedyna rzecz, którą do
// dawki dopisuje appka. Migracja do wklejenia: raport rundy 7, sekcja SQL.
// Brak kolumny NIE jest błędem: plakietka „Nowa" i linia na Dziś po prostu
// się nie pokazują, a log mówi dlaczego (jawny stan, reguła R5).

export const CONTENT_DOSE_SEEN_COLUMN = 'content_dose_seen';

/** Ile kluczy trzymamy — 2× limit dawek pasa A (12), z zapasem na stare. */
export const CONTENT_DOSE_SEEN_LIMIT = 24;

export const CONTENT_DOSE_SEEN_COLUMN_MISSING_WARN =
  '[dawka] Kolumna focus_blocks.content_dose_seen nie istnieje w bazie — zawodnik nie zobaczy '
  + 'plakietki „Nowa" przy dawce ani linii „Nowa porcja w Twoim Bloku" na Dziś, a my nie '
  + 'zmierzymy, czy ktokolwiek czyta dawki. Reszta ekranu działa normalnie. Migracja do '
  + 'wklejenia: raport rundy 7, sekcja SQL.';

/** Czy błąd oznacza brak kolumny `content_dose_seen` (ścieżka odzysku). */
export function isMissingSeenColumnError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const text = [e.message, e.details, e.hint]
    .map((v) => (typeof v === 'string' ? v : ''))
    .join(' ')
    .toLowerCase();
  if (text.includes(CONTENT_DOSE_SEEN_COLUMN)) return true;
  // Goły kod braku kolumny przy zapytaniu, którego jedyną „młodszą" kolumną
  // jest `content_dose_seen` (ta sama logika co ścieżka odzysku
  // `zawsze_widoczna` w componentHints.ts po M22).
  return code === 'PGRST204' || code === '42703';
}

/** Surowa wartość kolumny → lista kluczy. Wszystko, co nie jest listą stringów, znaczy „pusto". */
export function parseSeenKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

export function isDoseSeen(seenKeys: string[], klucz: string | null | undefined): boolean {
  if (!klucz) return true; // dawka bez klucza nie ma jak być „nowa"
  return seenKeys.includes(klucz);
}

/**
 * Nowa lista po otwarciu dawki: bez duplikatów, najnowsze na końcu,
 * przycięta z PRZODU do limitu (stare klucze wypadają pierwsze).
 */
export function withSeenKey(seenKeys: string[], klucz: string): string[] {
  const next = seenKeys.filter((k) => k !== klucz);
  next.push(klucz);
  return next.length > CONTENT_DOSE_SEEN_LIMIT
    ? next.slice(next.length - CONTENT_DOSE_SEEN_LIMIT)
    : next;
}

// ─────────────────────────────────────────────────────────────
// PARSOWANIE KOPERTY — pięć jawnych wyników, żaden nie jest „pusto"
// ─────────────────────────────────────────────────────────────

export type ContentDoseParse =
  /** Kolumna jest, ale `NULL` — żadna dawka jeszcze nie powstała. NORMALNE, nie błąd. */
  | { kind: 'null_column' }
  /** Koperta jest, `dawki: []` — też normalne, też nie błąd. */
  | { kind: 'empty_list' }
  /** `wersja > 1` — kontrakt się zmienił. NIE ZGADUJEMY. */
  | { kind: 'unsupported_version'; wersja: number }
  /** Coś jest, ale nie ma kształtu koperty (ręczna edycja, stary zapis). */
  | { kind: 'unreadable' }
  | { kind: 'ready'; doses: ContentDose[] };

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim().length > 0 ? v : null);

/**
 * Jedna dawka z surowego JSON-a. Zwraca `null`, gdy brak treści głównej —
 * dawka bez `krok_praktyczny` nie ma czego pokazać, a pusty kafelek byłby
 * gorszy niż jego brak.
 *
 * ⚠️ `krok_praktyczny` i `dla_chetnych` przechodzą TU BEZ OBRÓBKI (zasada 1
 * kontraktu): nie skracamy, nie dodajemy przedrostków, nie zmieniamy pierwszej
 * litery. Jedyne, co robimy, to odrzucamy pustkę.
 */
export function normalizeDose(raw: unknown): ContentDose | null {
  if (!isObj(raw)) return null;
  const krok = raw.krok_praktyczny;
  if (typeof krok !== 'string' || krok.trim().length === 0) return null;
  const klucz = str(raw.klucz);
  const etap = typeof raw.etap === 'number' && Number.isFinite(raw.etap) ? raw.etap : null;
  const at = str(raw.wygenerowano_at);
  return {
    wersja: typeof raw.wersja === 'number' ? raw.wersja : 1,
    // Klucz zastępczy tylko wtedy, gdy backend go nie dał — React potrzebuje
    // czegoś unikalnego, a data generowania jest w praktyce unikalna w bloku.
    klucz: klucz ?? `dawka:${at ?? 'bez-daty'}`,
    etap,
    wygenerowano_at: at ?? '',
    krok_praktyczny: krok,
    dla_chetnych: typeof raw.dla_chetnych === 'string' && raw.dla_chetnych.trim().length > 0
      ? raw.dla_chetnych
      : null,
    segment_id: str(raw.segment_id),
    component_id: str(raw.component_id),
    zrodlo_podpowiedzi: isObj(raw.zrodlo_podpowiedzi)
      ? (raw.zrodlo_podpowiedzi as ContentDoseSourceHint)
      : null,
  };
}

/**
 * Koperta → lista dawek albo jawny powód, dlaczego jej nie ma.
 *
 * ⚠️ KOLEJNOŚCI NIE ZMIENIAMY. Kontrakt (sekcja 11) mówi: `dawki` jest już
 * posortowane malejąco po `wygenerowano_at`, a `dawki[0]` to zawsze najnowsza.
 * Własne sortowanie po dacie rozjechałoby się z pasem A przy dwóch dawkach
 * z tą samą sekundą — a to pas A decyduje, która jest bieżąca.
 */
export function parseContentDoses(raw: unknown): ContentDoseParse {
  if (raw === null || raw === undefined) return { kind: 'null_column' };
  if (!isObj(raw)) return { kind: 'unreadable' };
  const wersja = typeof raw.wersja === 'number' ? raw.wersja : null;
  if (wersja === null) return { kind: 'unreadable' };
  if (wersja > CONTENT_DOSE_ENVELOPE_VERSION) return { kind: 'unsupported_version', wersja };
  if (!Array.isArray(raw.dawki)) return { kind: 'unreadable' };
  if (raw.dawki.length === 0) return { kind: 'empty_list' };

  const seen = new Set<string>();
  const doses: ContentDose[] = [];
  for (const item of raw.dawki) {
    const dose = normalizeDose(item);
    if (!dose) continue;
    // Deduplikacja po kluczu: klucz jest deterministyczny (`blok:etap:data`),
    // więc powtórka znaczy „ta sama dawka zapisana dwa razy". Powtórzony klucz
    // Reacta to poza tym cichy błąd renderowania.
    if (seen.has(dose.klucz)) continue;
    seen.add(dose.klucz);
    doses.push(dose);
  }
  if (doses.length === 0) return { kind: 'empty_list' };
  return { kind: 'ready', doses };
}

// ─────────────────────────────────────────────────────────────
// DATA — bez `Intl`, świadomie
// ─────────────────────────────────────────────────────────────
// `formatDatePl()` z lib/date-utils.ts woła `toLocaleDateString('pl-PL')`.
// Na Hermesie (Android) pełne dane `Intl` bywają przycięte, a wtedy miesiąc
// wychodzi po angielsku albo jako liczba. Przy dacie dawki to jedno słowo,
// więc zamiast ryzykować — dwanaście napisów. Skutek uboczny jest pożądany:
// selftest sprawdza tę datę deterministycznie, niezależnie od tego, jakie ICU
// ma piaskownica.
const MONTHS_GENITIVE = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];

/** „z 8 sierpnia" albo `null`, gdy daty nie ma / jest nieczytelna. */
export function contentDoseDateLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `z ${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]}`;
}

// ─────────────────────────────────────────────────────────────
// KARTA — to, co komponent ma narysować, bez ani jednej decyzji po drodze
// ─────────────────────────────────────────────────────────────

export type ContentDoseSourceLine = {
  /** Zdanie z materiału. `null` = pokazujemy sam przypis. */
  text: string | null;
  /** „Regeneracja, s. 2" — ta sama reguła co podpowiedź na Dziś. */
  label: string;
};

export type ContentDoseCard = {
  /** Klucz Reacta — deterministyczny, z kontraktu. */
  key: string;
  /** „z 8 sierpnia" albo `null`. */
  dateLabel: string | null;
  /** BEZ OBRÓBKI. */
  practicalStep: string;
  /** BEZ OBRÓBKI. `null` = nie renderuj „Dla chętnych" (zasada 2). */
  forCurious: string | null;
  /** `null` = nie renderuj przypisu w ogóle (zasada 3). */
  source: ContentDoseSourceLine | null;
};

/**
 * Przypis „Skąd to wiemy". Zasada 3 kontraktu, co do słowa:
 *  • bez `strona` → sam tytuł materiału,
 *  • bez `material` → NIE POKAZUJEMY PRZYPISU W OGÓLE,
 *  • `celowanie` i `wybor` są diagnostyczne i nie idą na ekran.
 *
 * Reguła jest wzięta z `formatHintSource()` — TEJ SAMEJ funkcji, która rysuje
 * źródło podpowiedzi na ekranie Dziś. To nie jest kopia reguły; to jej użycie.
 */
export function doseSourceLine(hint: ContentDoseSourceHint | null | undefined): ContentDoseSourceLine | null {
  if (!hint) return null;
  const label = formatHintSource(hint.material ?? null, hint.strona ?? null);
  if (!label) return null;
  return { text: str(hint.tresc), label };
}

export function toContentDoseCard(dose: ContentDose): ContentDoseCard {
  return {
    key: dose.klucz,
    dateLabel: contentDoseDateLabel(dose.wygenerowano_at),
    practicalStep: dose.krok_praktyczny,
    forCurious: dose.dla_chetnych,
    source: doseSourceLine(dose.zrodlo_podpowiedzi),
  };
}

// ─────────────────────────────────────────────────────────────
// STAN EKRANU
// ─────────────────────────────────────────────────────────────

/**
 * TRZY JAWNE STANY BRAKU, o które prosi polecenie — i ŻADEN nie jest błędem
 * na ekranie zawodnika:
 *   `column_missing` — migracja niewklejona (JEDYNY, który loguje ostrzeżenie),
 *   `no_doses`       — kolumna jest, wartość `NULL`,
 *   `empty_list`     — koperta jest, lista pusta.
 * Plus trzy, które nie były w poleceniu, a istnieją naprawdę:
 *   `unsupported_version`, `unreadable`, `error` (sieć/RLS).
 *
 * Wszystkie sześć renderują TO SAMO: nic. Rozróżnienie nie jest dla zawodnika
 * — jest dla logu i dla następnej sesji. To jest cała lekcja „cichego braku":
 * pusty wynik i brak dostępu to dwie różne rzeczy, nawet gdy wyglądają tak samo.
 */
export type ContentDoseAbsentReason =
  | 'loading'
  | 'column_missing'
  | 'no_doses'
  | 'empty_list'
  | 'unsupported_version'
  | 'unreadable'
  | 'error';

export type ContentDoseView =
  | { kind: 'absent'; reason: ContentDoseAbsentReason; warn: string | null }
  | { kind: 'ready'; current: ContentDoseCard; earlier: ContentDoseCard[] };

export function buildContentDoseView(params: {
  loading?: boolean;
  error?: unknown | null;
  /** Surowa wartość kolumny `focus_blocks.content_doses`. */
  raw?: unknown;
}): ContentDoseView {
  const { loading = false, error = null, raw } = params;

  if (error) {
    return isMissingContentDoseColumnError(error)
      ? { kind: 'absent', reason: 'column_missing', warn: CONTENT_DOSE_COLUMN_MISSING_WARN }
      : { kind: 'absent', reason: 'error', warn: null };
  }
  if (loading) return { kind: 'absent', reason: 'loading', warn: null };

  const parsed = parseContentDoses(raw);
  switch (parsed.kind) {
    case 'null_column': return { kind: 'absent', reason: 'no_doses', warn: null };
    case 'empty_list': return { kind: 'absent', reason: 'empty_list', warn: null };
    case 'unreadable': return { kind: 'absent', reason: 'unreadable', warn: null };
    case 'unsupported_version':
      return { kind: 'absent', reason: 'unsupported_version', warn: CONTENT_DOSE_UNSUPPORTED_VERSION_WARN };
    case 'ready': {
      // Zasada 4: `dawki[0]` to jest ta bieżąca. Reszta to „wcześniej w tym
      // Bloku" — miejsce, w którym zawodnik może wrócić do dawki sprzed zmiany
      // etapu. ⚠️ NIE JEST TO BIBLIOTEKA (decyzja C1: wartość jest w trafieniu
      // w moment, nie w katalogu) — dlatego stoi jako zwijana lista W ŚRODKU
      // Bloku Skupienia, a nie jako osobna trasa, wejście w „Ja" ani wyszukiwarka.
      const [first, ...rest] = parsed.doses;
      return { kind: 'ready', current: toContentDoseCard(first), earlier: rest.map(toContentDoseCard) };
    }
  }
}

// ─────────────────────────────────────────────────────────────
// TEKSTY NA EKRAN — test 15-latka (A10), zero oceniania
// ─────────────────────────────────────────────────────────────
// Trzymane tutaj, a nie w JSX, z tego samego powodu co teksty podpowiedzi:
// reguła R1 mówi „zadanie nie jest skończone, dopóki człowiek tego nie widzi",
// więc to, co człowiek zobaczy, musi dać się wypisać bez uruchamiania appki.
//
// ⚠️ NAZEWNICTWO JEST CELOWO TAKIE SAMO jak w ulotnym pudełku dawki, które
// stało w tym komponencie od 01.08.2026 („Praktyczny krok" / „Dla chętnych").
// Kontrakt pasa A proponował „Na ten tydzień" i „Pogłęb temat ▾", ale:
//   • „Na ten tydzień" byłoby nieprawdą — dawka wypada przy zmianie etapu albo
//     co 14 dni, więc bywa dawką na dwa tygodnie;
//   • „Pogłęb temat" JEST JUŻ ZAJĘTE w tym samym komponencie — tak nazywa się
//     przycisk do płatnego programu (`stripeCtaLabel`). Dwie różne rzeczy pod
//     jedną nazwą, jedna darmowa i jedna za 97 zł, to nie jest pomyłka, na
//     którą stać ten ekran.
// Kontrakt sam mówi „do Twojej decyzji, pas B — ja nie projektuję ekranu".

export const CONTENT_DOSE_SECTION_LABEL = 'Z materiałów do tego Bloku';
export const CONTENT_DOSE_STEP_LABEL = 'Praktyczny krok';
export const CONTENT_DOSE_CURIOUS_LABEL = 'Dla chętnych';
export const CONTENT_DOSE_SOURCE_LABEL = 'Skąd to wiemy';

/**
 * Przełącznik pogłębienia. ZWINIĘTE DOMYŚLNIE — i to nie jest decyzja
 * estetyczna, tylko wynik pomiaru: `npx tsx tests/measure-heights.ts` pokazał,
 * że przy najdłuższej realnej dawce (4 zdania kroku + pogłębienie + najdłuższa
 * podpowiedź z korpusu) rozwinięty blok przekracza jeden ekran na najmniejszym
 * telefonie. Zawodnik musiałby wtedy przewijać, żeby przeczytać JEDEN
 * praktyczny krok — czyli rzecz, którą ma dziś wykonać, konkurowałaby o miejsce
 * z ciekawostką. Kontrakt pasa A sam proponował tu strzałkę („Pogłęb temat ▾").
 */
export function curiousToggleLabel(expanded: boolean): string {
  return expanded ? `Ukryj — ${CONTENT_DOSE_CURIOUS_LABEL.toLowerCase()}` : `${CONTENT_DOSE_CURIOUS_LABEL} ▾`;
}

/** Nagłówek zwijanej listy starszych dawek. Liczba, bo bez niej nie wiadomo, czy warto dotknąć. */
export function earlierDosesLabel(count: number, expanded: boolean): string {
  const noun = count === 1 ? 'dawka' : (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14))
    ? 'dawki'
    : 'dawek';
  return `${expanded ? 'Ukryj' : 'Wcześniej w tym Bloku'} — ${count} ${noun}`;
}
