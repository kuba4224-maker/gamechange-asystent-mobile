// WIEDZA B4 08.08.2026 — NOWY PLIK.
//
// PO CO ISTNIEJE: żeby zawodnik miał w „Ja" miejsce, w którym widzi, co jest
// dla niego odblokowane — czyli materiały związane z segmentem jego Celu i z
// obszarami, które wyszły z diagnozy. To jest pierwsza rzecz w tym produkcie,
// która daje zawodnikowi treść, za którą wcześniej się płaciło.
// (decyzja C1 warstwa 3 + B2, claude/DECYZJE_PRODUKTOWE_07_08_2026.md)
//
// CZYM TA LISTA NIE JEST: katalogiem wszystkiego ani sklepem. Decyzja C1 mówi
// wprost: „materiał trafia do biblioteki PO ODBLOKOWANIU, a odblokowanie jest
// konsekwencją PRACY (założenie Celu, rozpoczęcie Bloku), nie zapłaty".
// Biblioteki mają fatalne wykorzystanie — wartość nie leży w dostępie do treści,
// tylko w trafieniu w moment. Dlatego przy każdej pozycji stoi JEDNO ZDANIE,
// dlaczego akurat ta, i nic poza tym: żadnych fajerwerków, żadnych plakietek
// „NOWE!", żadnego licznika odblokowań.
//
// ⚠️ ŚWIADOMIE BEZ POBIERANIA. Appka nie ma dziś ŻADNEGO mechanizmu dostarczania
// PDF-a — sprawdzone przeszukaniem całego pasa: zero odwołań do Supabase
// Storage, zero linków do plików, jedyne otwarcie przeglądarki to lejek diagnozy
// (`diagnoza.tsx`, `WebBrowser.openBrowserAsync(DIAGNOZA_URL)`) i zamrożony
// Marketplace. Zgadywanie adresów byłoby zbudowaniem przycisku, który prowadzi
// donikąd — czyli „cichego braku" z audytu po bloku 3. Lista z opisem jest
// wartościowa sama w sobie i jest tym, co ta runda dowozi; przycisk pobierania
// dokłada się jedną linią, gdy zapadnie decyzja o hostingu (patrz raport B
// runda 4, sekcja 8).

import { SEGMENT_LABELS } from './labels';

export type Material = {
  /** Stabilny klucz — użyty jako `key` listy i jako kotwica przy przyszłym hostingu. */
  id: string;
  /**
   * Tytuł materiału. Decyzja A1: „tytuł bierzemy z bazy, nie z nazwy pliku".
   * Te same napisy stoją w `component_hints.zrodlo`, więc źródło podpowiedzi na
   * ekranie Dziś („Moc, s. 8") i pozycja w bibliotece („Moc") mówią o tym samym
   * materiale tym samym słowem. Sprawdzone w selfteście.
   */
  title: string;
  /** Segmenty diagnozy, które ten materiał pokrywa. */
  segments: string[];
  /** O czym jest — jedno zdanie, język 15-latka (decyzja A10). */
  about: string;
  /**
   * Wypełnione TYLKO tam, gdzie jeden materiał obsługuje dwa segmenty. Decyzja
   * B2: „11 grup materiałowych na 13 segmentów i to nie jest dziura" — appka
   * mówi to jako WIEDZĘ O GRZE, nie jako przeprosiny za brak pliku.
   */
  sharedNote?: string;
};

// ─────────────────────────────────────────────────────────────
// 11 MATERIAŁÓW NA 13 SEGMENTÓW (decyzja B2)
// Kolejność = SEGMENT_ORDER, żeby biblioteka układała się tak samo jak wynik
// diagnozy i Picker Celu. Zawodnik ma widzieć jeden porządek wszędzie.
// ─────────────────────────────────────────────────────────────
export const MATERIALS: Material[] = [
  {
    id: 'moc',
    title: 'Moc',
    segments: ['moc'],
    about: 'Skąd bierze się eksplozja i jak ją zbudować w 6 tygodni.',
  },
  {
    id: 'wytrzymalosc',
    title: 'Wytrzymałość',
    segments: ['wytrzymalosc'],
    about: 'Jak nie odpuszczać w ostatnich 15 minutach meczu.',
  },
  {
    id: 'fizycznosc',
    title: 'Fizyczność',
    segments: ['fizycznosc'],
    about: 'Jak wygrywać kontakt, będąc lżejszym i niższym od rywala.',
  },
  {
    id: 'technika-fundamentalna',
    title: 'Technika fundamentalna',
    segments: ['techFund', 'techSpec'],
    about: 'Jak pracować nad techniką tak, żeby weszła do meczu.',
    sharedNote:
      'Ten sam materiał obsługuje Technikę Specjalistyczną — to nie osobne ruchy, '
      + 'tylko ta sama technika użyta pod presją, żeby tworzyć przewagę.',
  },
  {
    id: 'tolerancja-obciazen',
    title: 'Tolerancja obciążeń',
    segments: ['tolerancja'],
    about: 'Dlaczego ciało wysiada po mocnym tygodniu i jak podnieść granicę.',
  },
  {
    id: 'regeneracja',
    title: 'Regeneracja',
    segments: ['regeneracja'],
    about: 'Sen, oddech i jedzenie po treningu. Tu dzieje się postęp.',
  },
  {
    id: 'odpornosc-organizmu',
    title: 'Odporność organizmu',
    segments: ['odpornosc'],
    about: 'Dlaczego chorujesz w najgorszym momencie i co z tym zrobić.',
  },
  {
    id: 'odzywienie-organizmu',
    title: 'Odżywienie organizmu',
    segments: ['odzywianie'],
    about: 'Co jeść przed meczem i zaraz po nim. Bez liczenia kalorii.',
  },
  {
    id: 'koncentracja',
    title: 'Koncentracja',
    segments: ['koncentracja'],
    about: 'Rutyna, reset po błędzie i cisza. Jak szybko wracasz do gry.',
  },
  {
    id: 'stan-mentalny',
    title: 'Stan mentalny',
    segments: ['mental'],
    about: 'Jak grać swoje, kiedy wynik i szatnia ciągną w różne strony.',
  },
  {
    id: 'percepcja-i-szybkosc-decyzji',
    title: 'Percepcja i szybkość decyzji',
    segments: ['percepcja', 'decyzja'],
    about: 'Jak widzieć wcześniej i decydować szybciej, bez czekania na pewność.',
    // PRAKTYKA-EKRAN B6 08.08.2026 — nazwa segmentu brana z JEDNEGO ŹRÓDŁA
    // zamiast wpisana w zdanie. Było: „…obsługuje Szybkość Decyzji…". Po
    // decyzji Kuby o małej literze (patrz nagłówek lib/labels.ts) ta kopia
    // rozjechałaby się z etykietą stojącą na TEJ SAMEJ karcie materiału —
    // czyli zmiana nazw wyprodukowałaby nowy rozjazd zamiast go zamknąć.
    sharedNote:
      `Ten sam materiał obsługuje ${SEGMENT_LABELS['decyzja']} — na boisku widzenie i decyzja `
      + 'zdarzają się w tym samym momencie.',
  },
];

/** segment → materiał. Zbudowane z MATERIALS, żeby mapowanie nie istniało dwa razy. */
export const MATERIAL_BY_SEGMENT: Record<string, Material> = Object.fromEntries(
  MATERIALS.flatMap((m) => m.segments.map((s) => [s, m] as [string, Material]))
);

// ─────────────────────────────────────────────────────────────
// ODBLOKOWANIE — konsekwencja pracy, nie zapłaty (decyzja C1)
// ─────────────────────────────────────────────────────────────

export type UnlockReason = 'goal' | 'diagnosis' | 'both';

export type UnlockedMaterial = {
  material: Material;
  reason: UnlockReason;
  /** Jedno zdanie „dlaczego akurat to" — dokładnie to, co zobaczy zawodnik. */
  why: string;
  /** Nazwy segmentów, przez które materiał się odblokował (do zdania „dlaczego"). */
  viaSegments: string[];
};

function labelsOf(ids: string[]): string[] {
  return ids.map((id) => SEGMENT_LABELS[id] ?? id);
}

// Zdania są tak zbudowane, żeby nazwa segmentu stała w MIANOWNIKU — dokładnie
// w tej formie, w jakiej jest w `lib/labels.ts` i na wyniku diagnozy. Wersja
// „diagnoza pokazała Tolerancja (Obciążeń)" wymagałaby biernika, czyli drugiej
// listy 13 nazw, czyli dokładnie tego rozjazdu, który likwidował blok B1.
// Konstrukcja z dwukropkiem rozwiązuje to bez odmiany i brzmi naturalnie.
function whySentence(reason: UnlockReason, goalLabels: string[], deficitLabels: string[]): string {
  const obszar = (labels: string[]) =>
    labels.length === 1 ? `w obszarze ${labels[0]}` : `w obszarach ${labels.join(' i ')}`;

  if (reason === 'both') {
    return `Pracujesz nad Celem ${obszar(goalLabels)} — i diagnoza pokazała tu Twoje wąskie gardło.`;
  }
  if (reason === 'goal') {
    return `Bo pracujesz nad Celem ${obszar(goalLabels)}.`;
  }
  return deficitLabels.length === 1
    ? `Z diagnozy: ${deficitLabels[0]} to jedno z Twoich wąskich gardeł.`
    : `Z diagnozy: to Twoje wąskie gardła — ${deficitLabels.join(', ')}.`;
}

/**
 * Co ten zawodnik ma odblokowane, w kolejności ważności dla niego.
 *
 * Kolejność jest świadoma i nie jest alfabetyczna: najpierw materiał do Celu,
 * nad którym pracuje TERAZ, potem to, co wyszło z diagnozy. Zawodnik wchodzi tu
 * z pytaniem „co mam przeczytać", a nie „co posiadam".
 *
 * Odblokowania NIE MA za samo założenie konta — pusta lista jest prawidłowym,
 * częstym stanem i ekran ma dla niej osobny tekst.
 */
export function unlockedMaterials(params: {
  /** `segment_id` aktywnych Celów zawodnika. */
  goalSegmentIds: string[];
  /** `segment_id` wąskich gardeł z diagnozy (`getRelativeDeficits`). */
  deficitSegmentIds: string[];
}): UnlockedMaterial[] {
  const { goalSegmentIds, deficitSegmentIds } = params;
  const goalSet = new Set(goalSegmentIds.filter((s) => !!MATERIAL_BY_SEGMENT[s]));
  const deficitSet = new Set(deficitSegmentIds.filter((s) => !!MATERIAL_BY_SEGMENT[s]));

  const out: UnlockedMaterial[] = [];
  for (const material of MATERIALS) {
    const viaGoal = material.segments.filter((s) => goalSet.has(s));
    const viaDeficit = material.segments.filter((s) => deficitSet.has(s));
    if (viaGoal.length === 0 && viaDeficit.length === 0) continue;
    const reason: UnlockReason =
      viaGoal.length > 0 && viaDeficit.length > 0 ? 'both' : viaGoal.length > 0 ? 'goal' : 'diagnosis';
    out.push({
      material,
      reason,
      why: whySentence(reason, labelsOf(viaGoal), labelsOf(viaDeficit)),
      viaSegments: Array.from(new Set([...viaGoal, ...viaDeficit])),
    });
  }

  const rank: Record<UnlockReason, number> = { goal: 0, both: 0, diagnosis: 1 };
  return out.sort((a, b) => {
    const r = rank[a.reason] - rank[b.reason];
    if (r !== 0) return r;
    return MATERIALS.indexOf(a.material) - MATERIALS.indexOf(b.material);
  });
}

// ─────────────────────────────────────────────────────────────
// TEKSTY NA EKRAN (decyzja A10 — test 15-latka)
// ─────────────────────────────────────────────────────────────

export const LIBRARY_SECTION_LABEL = 'Twoje materiały';

/** Pusto to prawidłowy stan, nie awaria — i musi mówić, jak przestać być pusty. */
export const LIBRARY_EMPTY_TEXT =
  'Nic tu jeszcze nie ma. Materiały otwierają się, gdy założysz Cel albo zrobisz diagnozę — '
  + 'dostajesz to, co dotyczy Ciebie, nie całą półkę naraz.';

/**
 * Pod listą — żeby zawodnik wiedział, co tu widzi i czego jeszcze nie ma.
 *
 * ⚠️ To zdanie NIE MÓWI, skąd dziś bierze się plik PDF — bo appka tego nie wie
 * i sesja nie zgaduje (patrz nagłówek pliku). Mówi wyłącznie o rzeczy, która po
 * tej rundzie jest prawdą i którą da się sprawdzić na ekranie: konkretne zdania
 * z tych materiałów pojawiają się przy rekomendacji na Dziś.
 */
export const LIBRARY_NO_DOWNLOAD_TEXT =
  'Na razie widzisz tu, co jest dla Ciebie otwarte. Konkretne zdania z tych materiałów '
  + 'dostajesz na ekranie Dziś, przy rekomendacji.';

// ═══════════════════════════════════════════════════════════════════
// ZMIANA OBRAZU B5 08.08.2026 — BIBLIOTEKA MA WŁASNY EKRAN (pozycja M2)
//
// W rundzie 4 biblioteka była sekcją ekranu „Ja" i podniosła go z 803 dp do
// 1 353-1 578 dp, czyli 2,26-2,64 ekranu scrolla na małym telefonie. Miara
// postawiona wtedy przez ten sam pas brzmiała: „2,5 ekranu → biblioteka
// dostaje własną trasę". Najgorszy REALNY przypadek (Cel + trzy różne wąskie
// gardła) tę granicę przekraczał, więc trasa powstaje.
//
// Trasa jest CHOWANA (`href: null` w app/(tabs)/_layout.tsx) — pasek zostaje
// czterozakładkowy. Wejście: nazwana pozycja w sekcji „Twój rozwój" w „Ja",
// tym samym wzorcem co „Wynik diagnozy", „Wszystkie rekomendacje" i „Cele".
//
// Teksty stoją tutaj, a nie w ekranie, z tego samego powodu co reszta pliku:
// żeby dało się je sprawdzić selftestem bez uruchamiania appki.

/** Podpis pod wejściem „Twoje materiały" w „Ja". Zero to prawidłowy stan i
 *  musi mówić, jak przestać być zerem — dokładnie jak `LIBRARY_EMPTY_TEXT`,
 *  tylko krócej, bo to jest jedna linia w wierszu menu. */
export function libraryEntryHint(n: number): string {
  if (n === 0) return 'Otwiera je Cel albo diagnoza';
  return libraryCountLine(n);
}

/** Tytuł ekranu — świadomie ten sam napis co etykieta sekcji, z której
 *  biblioteka się wyprowadziła. Zawodnik ma rozpoznać, że to TA SAMA rzecz,
 *  która stała wcześniej w „Ja", a nie nowa funkcja. */
export const LIBRARY_SCREEN_TITLE = LIBRARY_SECTION_LABEL;

/** Jedno zdanie pod tytułem: co to jest i skąd się bierze. */
export const LIBRARY_SCREEN_INTRO =
  'Dostajesz to, co dotyczy Ciebie — materiał otwiera się, gdy założysz Cel w danym obszarze '
  + 'albo gdy diagnoza pokaże tam Twoje wąskie gardło.';

export function libraryCountLine(n: number): string {
  if (n === 0) return 'Jeszcze nic nie otworzyłeś';
  if (n === 1) return '1 materiał otwarty dla Ciebie';
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  const few = lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
  return `${n} ${few ? 'materiały otwarte' : 'materiałów otwartych'} dla Ciebie`;
}
