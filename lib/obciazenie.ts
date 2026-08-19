// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-D1 08.2026 (18.08.2026) — NOWY PLIK. SILNIK OBCIĄŻENIA.
// ═══════════════════════════════════════════════════════════════════
//
// Ten plik odpowiada na JEDNO pytanie: ILE CIAŁO WZIĘŁO NA SIEBIE.
//
//        OBCIĄŻENIE = minuty × ciężkość ⁄ PRZELICZNIK
//
// ⛔⛔ NAJWAŻNIEJSZE ZDANIE TEGO PLIKU — I CAŁEGO PASA D1:
// W tym wzorze NIE MA TRAFNOŚCI i nie ma jej gdzie wstawić. Wejście funkcji
// liczącej niesie DWIE LICZBY i ani jednej więcej. Praca, która celuje
// w najsłabszy obszar zawodnika, obciąża ciało DOKŁADNIE TYLE SAMO co ta
// sama praca celująca gdzie indziej — bo obciążenie mierzy ciało, a nie cel.
//
// ⭐ Model produktu: ROZWÓJ = OBCIĄŻENIE × TRAFNOŚĆ. Trafność podnosi ROZWÓJ.
// Gdyby podnosiła też obciążenie, produkt mówiłby, że celniejsza praca
// bardziej męczy — czyli odwrotność własnej tezy.
//
// ── ⛔ STRUKTURALNY DOWÓD, A NIE OBIETNICA ─────────────────────────
// Ten plik i `lib/obciazenieOstatnichDni.ts` NIE IMPORTUJĄ ANI JEDNEJ
// NAZWY z `lib/nagrodaZaPrace.ts` ani z `lib/zwrotObszaru.ts`. Trafność
// mieszka tam i nie ma tędy drogi. To nie jest dyscyplina do zapamiętania,
// tylko brak połączenia — pilnuje go strażnik `lib/obciazenie.selftest.ts`.
//
// ── ⛔ CZEGO W TYM PLIKU NIE MA ────────────────────────────────────
// Reacta · Supabase · zegara (dzisiejszą datę podaje wołający) · ani jednego
// zdania o tym, JAKA ta liczba jest. Wolno powiedzieć ILE. Ten plik nie mówi
// CZY, nie stawia progu bezpieczeństwa i nie zna nikogo poza tym zawodnikiem.
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// 1. ⭐ DWIE STAŁE — obie z podpisem, skąd się wzięły
// ═══════════════════════════════════════════════════════════════════

/**
 * ⭐ PRZELICZNIK = 180 = 30 minut × ciężkość 6.
 *
 * Skąd 180: formalnie decyzja produktowa, ale WYPROWADZONA Z POMIARU (pas W4).
 * Wzór `minuty × ciężkość ⁄ 180` odtwarza 12 z 13 wag ustawionych ręcznie przez
 * Kubę (mecz cały 4 · połowa 2 · wejście 1 · klub 90 min 3 · własny 60 min 2 ·
 * mikrosesja 1 · siłownia 1 · zadanie 1). Próg 45 minut wypada dokładnie na
 * punkcie zwrotnym zaokrąglenia przy ciężkości 6: 45 × 6 = 270; 270 ⁄ 180 = 1,50.
 *
 * ⚠️ TA LICZBA NIE MA ZA SOBĄ BADANIA i nie udaje, że ma. Metoda (czas razy
 * ciężkość) jest miarą Fostera, sprawdzaną w sportach zespołowych — ale nie
 * mówi ona, ile obciążenia jest właściwe ani kiedy zaczyna się przetrenowanie.
 *
 * ⛔ STOI TYLKO TUTAJ. Wpisanie jej drugi raz — w asercji, w ekranie, w innym
 * module — rozjeżdża się przy pierwszej poprawce i oba miejsca wyglądają wtedy
 * poprawnie. Strażnik ma na to osobną zapadkę.
 */
export const PRZELICZNIK_OBCIAZENIA = 180;

/**
 * ⭐ SUFIT DNIA = 7 punktów obciążenia.
 *
 * Skąd 7: to jest POLICZONE, a nie wybrane. Zdanie Kuby brzmiało „ekstremalnie
 * ciężki dzień jest już wtedy, gdy ktoś ma mecz i pełny trening". Taki dzień to
 * 90 × 8 + 90 × 6 = 1260; 1260 ⁄ 180 = 7,000 — bez zaokrąglania.
 * ⚠️ Zmiana zakładanej ciężkości meczu (8) albo treningu klubowego (6) zmienia
 * tę liczbę. To nie są parametry obok sufitu, tylko jego składniki.
 *
 * ⛔ Sufit obcina WYSOKOŚĆ i INTENSYWNOŚĆ obrazu dnia. ⛔ NIE obcina sumy
 * w oknie 7 ani 28 dni: tydzień z trzema treningami klubowymi i meczem waży
 * 13,0 i ta liczba ma prawo urosnąć dalej.
 */
export const SUFIT_OBCIAZENIA_DNIA = 7;

// ═══════════════════════════════════════════════════════════════════
// 2. ⭐ OBCIĄŻENIE JEDNEJ SESJI — dwie liczby na wejściu i ani jednej więcej
// ═══════════════════════════════════════════════════════════════════

/**
 * ⛔ CAŁE WEJŚCIE ARYTMETYKI OBCIĄŻENIA. Dwa pola. Dołożenie tu trzeciego —
 * trafności, obszaru, celu, rodzaju pracy — jest tą jedną zmianą, przed którą
 * cały ten plik istnieje.
 */
export type PomiarSesji = {
  /** Minuty pracy. `null` = nie wiemy. ⛔ Nie zgadujemy z planu. */
  minuty: number | null;
  /** Ciężkość 1–10 podana przez zawodnika. `null` = nie wiemy. */
  ciezkosc: number | null;
};

/** ⛔ Czego zabrakło. TRZECIA WARTOŚĆ, nie zero (R5). */
export type BrakLiczby = 'minut' | 'ciezkosci' | 'obu';

export type ObciazenieSesji =
  /** ⭐ Wartość SUROWA. ⛔ Nigdy zaokrąglona — zaokrąglenie należy do wyświetlenia. */
  | { rodzaj: 'zmierzone'; surowe: number }
  /** ⛔ Brak minut albo ciężkości to NIE JEST zero obciążenia (R5). */
  | { rodzaj: 'bez_liczby'; brakuje: BrakLiczby };

function liczbaWZakresie(x: unknown, od: number, doGory: number): number | null {
  return typeof x === 'number' && Number.isFinite(x) && x > od && x <= doGory ? x : null;
}

/**
 * ⭐⭐ CAŁY SILNIK W JEDNEJ LINII: `minuty × ciężkość ⁄ 180`.
 *
 * ⛔ Ta funkcja przyjmuje `PomiarSesji` i NIC POZA TYM. Nie ma parametru
 * trafności, nie ma parametru obszaru i nie ma parametru rodzaju pracy —
 * więc nie ma jak sprawić, żeby dwie identyczne sesje różniły się wynikiem.
 *
 * ⛔ Ciężkość spoza 1–10 i minuty ≤ 0 dają `bez_liczby`, a nie zero. Zero
 * znaczyłoby „ciało nic nie wzięło", a my wtedy po prostu nie wiemy.
 */
export function obciazenieSesji(p: PomiarSesji): ObciazenieSesji {
  const minuty = liczbaWZakresie(p.minuty, 0, Number.MAX_SAFE_INTEGER);
  const ciezkosc = liczbaWZakresie(p.ciezkosc, 0, 10);
  if (minuty === null && ciezkosc === null) return { rodzaj: 'bez_liczby', brakuje: 'obu' };
  if (minuty === null) return { rodzaj: 'bez_liczby', brakuje: 'minut' };
  if (ciezkosc === null) return { rodzaj: 'bez_liczby', brakuje: 'ciezkosci' };
  return { rodzaj: 'zmierzone', surowe: (minuty * ciezkosc) / PRZELICZNIK_OBCIAZENIA };
}

// ═══════════════════════════════════════════════════════════════════
// 3. ⭐ DZIEŃ — suma surowa i to, co z niej widać
// ═══════════════════════════════════════════════════════════════════

export type ObciazenieDnia = {
  /** ⭐ Suma wartości SUROWYCH. ⛔ Bez sufitu i bez zaokrąglenia. */
  surowe: number;
  /**
   * ⭐ To samo po sufitze — WYŁĄCZNIE do rysunku dnia (wysokość, intensywność).
   * ⛔ Nie jest to „liczba dnia": liczba dnia jest surowa aż do wyświetlenia.
   */
  doRysunku: number;
};

/** ⭐ Dzień to suma sesji. ⛔ Sufit stoi tylko przy rysunku, nie przy sumie. */
export function obciazenieDnia(surowe: readonly number[]): ObciazenieDnia {
  let suma = 0;
  for (const x of surowe) if (Number.isFinite(x) && x > 0) suma += x;
  return { surowe: suma, doRysunku: Math.min(suma, SUFIT_OBCIAZENIA_DNIA) };
}

// ═══════════════════════════════════════════════════════════════════
// 4. ⭐ ZAOKRĄGLENIE NASTĘPUJE RAZ
// ═══════════════════════════════════════════════════════════════════
//
// ⚠️ ZNALEZISKO MK5 (O74): makieta V2 liczyła słowo z wartości SUROWEJ,
// a liczbę pokazywała ZAOKRĄGLONĄ. Przy sufitze 7 dzień o wartości 6,95
// pokazywał „7,0 pkt" i mówił o sobie „ciężko" w tej samej linii.
// ⛔ Dlatego `slowoObciazenia` liczy z TEJ SAMEJ liczby, którą widzi zawodnik.

/** ⭐ JEDYNE zaokrąglenie w całym silniku. Jedno miejsce po przecinku. */
export function zaokraglijObciazenie(surowe: number): number {
  if (!Number.isFinite(surowe)) return 0;
  return Math.round(surowe * 10) / 10;
}

/** ⭐ Liczba na ekran: zawsze z jednym miejscem po przecinku, przecinkiem. */
export function liczbaObciazeniaNaEkran(surowe: number): string {
  return zaokraglijObciazenie(surowe).toFixed(1).replace('.', ',');
}

// ═══════════════════════════════════════════════════════════════════
// 5. PROGI SŁÓW — skala DNIA
// ═══════════════════════════════════════════════════════════════════
//
// ⭐ KALIBRACJA JEST SPRAWDZONA RACHUNKIEM (MK5): przy przejściu przelicznika
// 150 → 180 ŻADNA z dziesięciu kotwic nie zmienia słowa. Kotwice stoją
// w strażniku, a nie tutaj — liczba, która pilnuje sama siebie, nie pilnuje nic.
//
// ⚠️ TE SŁOWA OPISUJĄ DZIEŃ, NIE ZAWODNIKA, i ⛔ NIE STOJĄ przy liczbie okna
// na ekranie „Profil". Tam liczba stoi sama.

export type SlowoObciazenia = 'pusto' | 'lekko' | 'średnio' | 'ciężko' | 'bardzo ciężko';

export const PROGI_SLOW_OBCIAZENIA: readonly { readonly doWlacznie: number; readonly slowo: SlowoObciazenia }[] = [
  { doWlacznie: 0, slowo: 'pusto' },
  { doWlacznie: 1.5, slowo: 'lekko' },
  { doWlacznie: 3.9, slowo: 'średnio' },
  { doWlacznie: SUFIT_OBCIAZENIA_DNIA - 0.1, slowo: 'ciężko' },
];

/** ⭐ Słowo liczy się z liczby ZAOKRĄGLONEJ — tej samej, którą widać. */
export function slowoObciazenia(surowe: number): SlowoObciazenia {
  const r = zaokraglijObciazenie(surowe);
  for (const p of PROGI_SLOW_OBCIAZENIA) if (r <= p.doWlacznie) return p.slowo;
  return 'bardzo ciężko';
}

// ═══════════════════════════════════════════════════════════════════
// 6. ⭐ SESJA W CZASIE — wejście okna
// ═══════════════════════════════════════════════════════════════════
//
// ⛔ TEN KSZTAŁT JEST WŁASNY, A NIE POŻYCZONY Z `JednostkaPracy`. Tamten
// niesie pole `punkty` z trafnością w środku; sięgnięcie po niego byłoby
// jedną linijką i przywróciłoby dokładnie ten defekt, który ten pas naprawia.

/** ⭐ Rodzaje pracy, które w ogóle obciążają ciało. ⛔ Wpis w dzienniku nie obciąża. */
export type RodzajObciazenia = 'sesja' | 'mecz';

/** Kiedy ta praca się odbyła. ⛔ Trzecia wartość nie jest ozdobą (R5). */
export type KiedyObciazenie =
  | { rodzaj: 'dzien_pracy'; dzien: string }
  | { rodzaj: 'dzien_zapisu'; dzien: string }
  | { rodzaj: 'nieznana'; powod: string };

export type SesjaObciazenia = {
  /** ⛔ Wyłącznie do odsiania duplikatów. Nie wchodzi do arytmetyki. */
  klucz: string;
  rodzaj: RodzajObciazenia;
  kiedy: KiedyObciazenie;
  pomiar: PomiarSesji;
};

/** `YYYY-MM-DD` z dowolnego znacznika czasu, albo `null`, gdy się nie da. */
export function dzienZeZnacznika(x: unknown): string | null {
  if (typeof x !== 'string' || x.length < 10) return null;
  const d = x.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

// ═══════════════════════════════════════════════════════════════════
// 7. ⛔ PUNKT WPIĘCIA MUTACJI — produkcyjny wołający TEGO NIE PODAJE
// ═══════════════════════════════════════════════════════════════════
//
// ⚠️ Punkt wpięcia istnieje po to, żeby bateria mutacji miała czym poruszyć
// silnik BEZ dotykania dysku. ⛔ Ani jeden ekran nie podaje tego argumentu —
// pilnuje tego osobna asercja strażnika.

export type ZasadySilnika = {
  /** ⛔ Zawsze `true`. Gdy `false` — sufit przestaje obcinać rysunek dnia. */
  sufitObcina: boolean;
  /** ⛔ Zawsze `false`. Gdy `true` — słowo liczy się z wartości surowej (drugie zaokrąglenie). */
  slowoZWartosciSurowej: boolean;
  /** ⛔ Zawsze `false`. Gdy `true` — sesja bez minut albo bez ciężkości waży zero. */
  brakLiczbyToZero: boolean;
};

export const ZASADY_SILNIKA_PRAWDZIWE: ZasadySilnika = {
  sufitObcina: true,
  slowoZWartosciSurowej: false,
  brakLiczbyToZero: false,
};

/** ⭐ Ta sama arytmetyka co wyżej, z punktem wpięcia. ⛔ Wołana tylko przez baterię. */
export function obciazenieSesjiZZasadami(p: PomiarSesji, z: ZasadySilnika): ObciazenieSesji {
  const wynik = obciazenieSesji(p);
  if (wynik.rodzaj === 'bez_liczby' && z.brakLiczbyToZero) return { rodzaj: 'zmierzone', surowe: 0 };
  return wynik;
}

export function obciazenieDniaZZasadami(surowe: readonly number[], z: ZasadySilnika): ObciazenieDnia {
  const d = obciazenieDnia(surowe);
  return z.sufitObcina ? d : { surowe: d.surowe, doRysunku: d.surowe };
}

export function slowoObciazeniaZZasadami(surowe: number, z: ZasadySilnika): SlowoObciazenia {
  if (!z.slowoZWartosciSurowej) return slowoObciazenia(surowe);
  for (const p of PROGI_SLOW_OBCIAZENIA) if (surowe <= p.doWlacznie) return p.slowo;
  return 'bardzo ciężko';
}
