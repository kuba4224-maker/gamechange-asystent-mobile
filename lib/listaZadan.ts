// PLAN-D-C2 08.2026 (14.08.2026) — NOWY PLIK. Zadania C2.2 i C2.3.
//
// LISTA „MOJE ZADANIA" — CZYSTA CZĘŚĆ. Zero Reacta, zero Supabase, zero JSX.
//
// ═════════════════════════════════════════════════════════════════════
// PO CO TEN PLIK ISTNIEJE
//
// Pas B2 pokazał na ekranie „Dziś" CZTERY PIERWSZE pozycje kolejki podania
// (głębokość 0). Ten pas pokazuje WSZYSTKIE, pogrupowane w trzy kubełki, dla
// dociekliwego (głębokość 2). ⚠️ To jest TA SAMA kolejka, TEN SAM ranker
// (`lib/kolejkaPodania.ts`, pas B1) i TEN SAM komponent pozycji
// (`components/PozycjaKolejkiCard.tsx`, pas B2) — druga kopia czegokolwiek
// z tej trójki jest dokładnie tym defektem kolażu, który cały etap B wyciął.
//
// Tutaj siedzi wyłącznie to, czego lista potrzebuje PONAD kolejkę:
//   • podsumowanie kubełka (WG-19) — z twardą regułą, że suma NIE KŁAMIE;
//   • cztery zdania na cztery stany `odczytZadan()` (R5);
//   • rozpoznanie, która pozycja ma wiersz w `player_tasks` (WT-23, WT-28);
//   • trzy stany wejścia z odpowiedzi bazy — ⛔ zakaz `data ?? []`.
//
// ⚠️ DLACZEGO TO JEST W `lib/`, A NIE W EKRANIE. Bo dzięki temu strażnik
// (`lib/listaZadan.selftest.ts`) sprawdza REGUŁĘ, uruchamiając ją, a nie
// czytając ekran jako tekst. Asercja na tekście łapie skasowanie wywołania;
// asercja na funkcji łapie też zmianę jej sensu.
//
// ⛔ TEN PLIK NIE IMPORTUJE NICZEGO Z `components/`. Powód jest zmierzony, nie
// estetyczny: import komponentu ciągnie `react-native`, którego `tsx` nie
// potrafi przetransformować (`Unexpected "typeof"` w react-native/index.js) —
// czyli cały selftest przestałby się uruchamiać (znalezisko 11 pasa B2).
// Dlatego `opiszSume` PRZYJMUJE gotowy tekst czasu zamiast go formatować:
// formatowanie należy do `opiszCzas()` w komponencie i ma tam ZOSTAĆ jedyne.
// ═════════════════════════════════════════════════════════════════════
import { KUBELKI, type Kubelek, type PozycjaKolejki, type Wejscie } from './kolejkaPodania';
import {
  MAKS_DLUGOSC_TYTULU,
  TABELA_ZADAN,
  czyOdczytNiepelny,
  type OdczytZadan,
  type PowodOdmowyWlasnego,
} from './zadania';

/** Znacznik dla Kuby i dla strażnika. Nie usuwać do czasu zatwierdzenia brzmień. */
export const BRZMIENIE_DO_PRZEJRZENIA = 'DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-C2, 14.08.2026)';

/**
 * Kolejność kubełków na liście. ⚠️ Bierzemy ją z rankera, nie z własnej stałej:
 * druga lista kubełków rozjechałaby się z pierwszą przy pierwszej zmianie,
 * a obie byłyby zielone.
 */
export const KUBELKI_LISTY: readonly Kubelek[] = KUBELKI;

// ─────────────────────────────────────────────────────────────────────
// 1. BRZMIENIA — ⚠️ WSZYSTKIE DO PRZEJRZENIA PRZEZ KUBĘ
// ─────────────────────────────────────────────────────────────────────
// ⚠️ Nazwy kubełków („Teraz" · „W tym tygodniu" · „Kiedyś") NIE STOJĄ TUTAJ.
// Są w `components/PozycjaKolejkiCard.tsx` jako `KUBELEK_ETYKIETA` (pas B2)
// i ekran bierze je STAMTĄD. Druga lista nazw znaczyłaby, że zawodnik czyta
// „W tym tygodniu" na jednym ekranie i coś innego na drugim.

export const NAGLOWEK_LISTY = 'Moje zadania';
export const PODTYTUL_LISTY = 'Wszystko, co masz do zrobienia — w kolejności, którą ustawia system.';
export const ZAMKNIJ_LISTE = 'Zamknij';
export const LISTA_WCZYTUJE = 'Wczytuję…';

/** Wejście z ekranu „Ja". ⚠️ Ta sama nazwa co nagłówek listy — jedno słowo, jedno miejsce. */
export const WEJSCIE_LISTA_LABEL = NAGLOWEK_LISTY;

// ── Cztery stany `odczytZadan()` = CZTERY RÓŻNE ZDANIA (R5) ──────────
// ⛔ `data ?? []` jest zakazane właśnie dlatego, że sklejałoby drugie z trzecim
// i czwartym: „nie udało się odczytać" wyglądałoby jak „nic nie masz".
export const ZADANIA_SA = 'Twoje zadania stoją w trzech kubełkach: Teraz · W tym tygodniu · Kiedyś.';
export const ZADANIA_BRAK = 'Nie masz zapisanego ani jednego zadania.';
export const ZADANIA_BRAK_UPRAWNIEN = 'Nie mam dostępu do Twoich zadań — to nie znaczy, że ich nie masz.';
export const ZADANIA_NIE_WIEM = 'Nie udało mi się odczytać Twoich zadań.';

/**
 * Piąte zdanie, DODATKOWE — nie zastępuje żadnego z czterech.
 * `sa_zadania` z niepustym `odrzucone` znaczy „część wierszy wypadła": lista
 * jest wtedy NIEPEŁNA i `lib/zadania.ts` mówi wprost, że C2 ma to sprawdzać.
 */
export const ZADANIA_NIEPELNE = 'Części Twoich zadań nie dało się odczytać — ta lista jest niepełna.';

/**
 * Szóste zdanie, o CZYM INNYM: `kolejka.niepelna` mówi, że nie odczytało się
 * któreś z DZIEWIĘCIU wejść rankera (kalendarz, Dziennik, ból, cel, mecz…),
 * a nie tylko zadania. Dwa różne powody dostają dwa różne zdania, bo zawodnik
 * ma prawo wiedzieć, czego brakuje, a nie tylko że „czegoś".
 */
export const LISTA_NIEPELNA = 'Ta lista jest niepełna — czegoś nie odczytałem.';

export const KUBELEK_PUSTY = 'Nic tutaj nie stoi.';
export const SUMA_NIC_NIE_WIEM = 'przy żadnej nie wiem, ile zajmie';
export const SUMA_CZAS_NIECZYTELNY = 'sumy czasu nie umiem podać';
export const SUMA_RAZEM = 'razem ';

export const ROZWIN_KUBELEK = 'Pokaż';
export const ZWIN_KUBELEK = 'Zwiń';

export const PODNIES_DO_TERAZ = 'Podnieś do „Teraz"';
export const ODHACZ = 'Zrobione';
export const ODHACZONE_PREFIKS = 'Odhaczone: ';
export const BLAD_ODHACZENIA = 'Nie udało mi się zapisać odhaczenia. Zadanie zostaje na liście.';
export const BLAD_PODNIESIENIA = 'Nie udało mi się zapisać podniesienia. Kolejność się nie zmieniła.';

// ─────────────────────────────────────────────────────────────────────
// 1a. ⭐ PLAN-D-T1 08.2026 — POLE „DOPISZ COŚ SWOJEGO"
// ─────────────────────────────────────────────────────────────────────
// ⚠️ DO PRZEJRZENIA — T1. Dziewięć zdań niżej jest NOWYCH i żadne nie zostało
// zatwierdzone. Wszystkie stoją w nocie `claude/PRZEKAZANIE_PAS_T1_16_08_2026.md`
// §8 jako propozycje, do zmiany w jednym miejscu.
//
// ── PO CO TO POWSTAŁO ───────────────────────────────────────────────
// Do 16.08.2026 ten ekran nie mógł dostać ANI JEDNEJ rzeczy do odhaczenia:
// w całym produkcie nie było ani jednego `insert` do `player_tasks`.
// Pozycje wpadające na listę z kalendarza i z wglądów NIE MAJĄ tam wiersza,
// więc `mozliweOdhaczenie` i `mozliwePodniesienie` oddają dla nich `false`.
//
// ── ⛔ CZEGO TO POLE NIE ROBI I ROBIĆ NIE BĘDZIE ────────────────────
//  1. ⛔ NIE ZAMALOWUJE PUSTKI. Gdy zawodnik nie ma zadań, `ZADANIA_BRAK`
//     nadal mówi „Nie masz zapisanego ani jednego zadania." Pole stoi obok
//     tego zdania, nie zamiast niego: pusta lista jest uczciwa (zakaz 4
//     z nagłówka `components/ListaZadan.tsx`).
//  2. ⛔ NIE PYTA O TERMIN. Żadnego „do kiedy", żadnego przypomnienia,
//     żadnego licznika dni (**N1** — nie karzemy za nieobecność, a termin
//     jest karą w przebraniu). Kubełek wyznacza RANKER, nie kalendarz.
//  3. ⛔ NIE POZWALA UDAWAĆ PRODUKTU. Wiersz idzie z `origin='player'`
//     i pustymi polami systemowymi — bo tyle i tylko tyle wpuszcza polityka
//     `player_tasks_insert_own`.

export const DODAJ_NAGLOWEK = 'Dopisz coś swojego';
export const DODAJ_PLACEHOLDER = 'np. Kupić nowe wkładki do korków';
export const DODAJ_PRZYCISK = 'Dodaj';
export const DODAJ_ZAPISUJE = 'Zapisuję…';
export const DODANE_PREFIKS = 'Dodane: ';

/**
 * ⛔ BŁĄD ZAPISU MA WŁASNE ZDANIE, NIE CISZĘ (**R5**) — i mówi wprost, że
 * tekst zawodnika NIE PRZEPADŁ. Ekran go nie czyści; komunikat i zachowanie
 * muszą mówić to samo, inaczej jedno z dwojga kłamie.
 */
export const BLAD_DODANIA =
  'Nie udało mi się zapisać tego zadania. Twój tekst zostaje w polu — spróbuj jeszcze raz.';

/**
 * Trzy powody odmowy → trzy RÓŻNE zdania.
 * ⚠️ Zdanie o za długim tytule LICZY ZNAKI ZE STAŁEJ, a nie z liczby wpisanej
 * tu ręcznie: granica mieszka w bazie (`player_tasks_title_len`) i rozjazd
 * znaczyłby, że produkt obiecuje zawodnikowi więcej, niż baza przyjmie.
 */
export const ODMOWA_BRAK_KONTA = 'Jeszcze nie wczytałem Twojego konta. Spróbuj za chwilę.';
export const ODMOWA_TYTUL_PUSTY = 'Napisz jednym zdaniem, co masz do zrobienia.';
export const ODMOWA_TYTUL_ZA_DLUGI =
  `To jest za długie jak na jedną rzecz do zrobienia — zmieść się w ${MAKS_DLUGOSC_TYTULU} znakach.`;

const ZDANIA_ODMOWY: Record<PowodOdmowyWlasnego, string> = {
  brak_konta: ODMOWA_BRAK_KONTA,
  tytul_pusty: ODMOWA_TYTUL_PUSTY,
  tytul_za_dlugi: ODMOWA_TYTUL_ZA_DLUGI,
};

/**
 * Kod odmowy z `zbudujZadanieWlasne` → zdanie dla zawodnika.
 * ⚠️ `Record` po typie związkowym sprawia, że NOWY kod odmowy bez zdania
 * nie skompiluje się — a nie: pokaże zawodnikowi `undefined`.
 */
export function zdanieOdmowyDodania(kod: PowodOdmowyWlasnego): string {
  return ZDANIA_ODMOWY[kod];
}

/**
 * ⚠️ Dlaczego lista nie ma przycisku „Podnieś" przy KAŻDEJ pozycji — brzmienie
 * nie jest potrzebne, bo przycisku po prostu nie ma. Powód i gotowy kontrakt
 * dla pasa B1 stoją w nocie przekazania C2, sekcja „kontrakty".
 */
export const POWOD_BRAKU_PODNIESIENIA =
  'podniesienie zapisuje się w `player_tasks.raised_at`; pozycja bez wiersza w tej tabeli '
  + '(kalendarz, wgląd, jedna odpowiedź) nie ma dziś gdzie tego zapisać — kontrakt dla B1';

// ─────────────────────────────────────────────────────────────────────
// 2. TRZY STANY WEJŚCIA — ⛔ TU MIESZKA ZAKAZ `data ?? []`
// ─────────────────────────────────────────────────────────────────────
// `supabase-js` NIE RZUCA wyjątku, gdy odczyt się nie uda — oddaje
// `{ data: null, error }`. Gdyby ekran napisał `data ?? []`, „nie udało się
// odczytać" stałoby się NIEODRÓŻNIALNE od „nic nie masz": lista pokazałaby
// spokojną pustkę, wszystko wyglądałoby na wdrożone i nikt by tu nie wrócił.
//
// ⚠️ TA SAMA FUNKCJA CO W `app/(tabs)/dzis.tsx` (pas B2), tylko tam jest
// zamknięta w pliku ekranu i nie da się jej ani zaimportować, ani przetestować.
// To jest DRUGA KOPIA i nazywam ją drugą kopią — kontrakt „wyprowadzić
// budowanie wejść kolejki do `lib/`" stoi w nocie C2.

export function powodBledu(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return 'nieznany błąd odczytu';
}

export function wejscieZOdpowiedzi<W, T>(
  odp: { data: unknown; error: unknown },
  nazwa: string,
  mapuj: (wiersz: W) => T,
): Wejscie<T[]> {
  if (odp.error) return { rodzaj: 'nie_wiem', powod: `${nazwa}: ${powodBledu(odp.error)}` };
  if (!Array.isArray(odp.data)) {
    return { rodzaj: 'nie_wiem', powod: `${nazwa}: odpowiedź bazy nie jest listą` };
  }
  if (odp.data.length === 0) return { rodzaj: 'brak' };
  return { rodzaj: 'jest', dane: (odp.data as W[]).map(mapuj) };
}

// ─────────────────────────────────────────────────────────────────────
// 3. CZTERY STANY ODCZYTU → CZTERY ZDANIA
// ─────────────────────────────────────────────────────────────────────

/**
 * ⚠️ Każda gałąź oddaje INNĄ stałą. Gdyby dwie oddawały tę samą, zawodnik
 * przestałby odróżniać „nic nie masz" od „nie dostałeś swoich danych" — a to
 * są dwie różne rzeczy i tylko jedna z nich jest o nim.
 */
export function zdanieOdczytu(o: OdczytZadan): string {
  switch (o.rodzaj) {
    case 'sa_zadania': return ZADANIA_SA;
    case 'brak_danych': return ZADANIA_BRAK;
    case 'brak_uprawnien': return ZADANIA_BRAK_UPRAWNIEN;
    case 'nie_wiem': return ZADANIA_NIE_WIEM;
  }
}

/** `null` = lista jest pełna. Inaczej: zdanie o tym, że coś wypadło. */
export function zdanieNiepelnosci(o: OdczytZadan): string | null {
  return czyOdczytNiepelny(o) ? ZADANIA_NIEPELNE : null;
}

// ─────────────────────────────────────────────────────────────────────
// 4. PODSUMOWANIE KUBEŁKA (WG-19) — SUMA, KTÓRA NIE KŁAMIE
// ─────────────────────────────────────────────────────────────────────

export type PodsumowanieKubelka = {
  /** Ile rzeczy stoi w kubełku. */
  ile: number;
  /**
   * Suma czasu WYŁĄCZNIE z pozycji, które czas mają.
   * ⛔ Pozycja z `ileZajmieSekund === null` NIE WCHODZI do tej liczby i nie
   * jest liczona jako zero: „nie wiemy, ile zajmie" to nie jest „zajmie zero".
   */
  sekundy: number;
  /** Ile pozycji nie ma czasu. ⚠️ Suma MUSI to powiedzieć — inaczej udaje komplet. */
  bezCzasu: number;
};

export function podsumujKubelek(pozycje: PozycjaKolejki[]): PodsumowanieKubelka {
  let sekundy = 0;
  let bezCzasu = 0;
  for (const p of pozycje) {
    const s = p.ileZajmieSekund;
    // ⛔ Warunek jest CELOWO ostry. `0` i `-1` też nie są czasem, który wolno
    // dodać: pierwsze udawałoby „zajmie zero", drugie skróciłoby sumę.
    if (typeof s === 'number' && Number.isFinite(s) && s > 0) sekundy += s;
    else bezCzasu += 1;
  }
  return { ile: pozycje.length, sekundy, bezCzasu };
}

/**
 * Nagłówek kubełka: „4 rzeczy · razem 22 min · przy 2 nie wiem ile".
 *
 * @param czasTekst wynik `opiszCzas(p.sekundy)` z `components/PozycjaKolejkiCard.tsx`.
 *        ⚠️ PRZYCHODZI Z ZEWNĄTRZ CELOWO — patrz nagłówek pliku. `null` znaczy
 *        „nie umiem tego sformatować" i wtedy suma mówi to wprost, zamiast
 *        po cichu pominąć czas, który zna.
 */
export function opiszSume(p: PodsumowanieKubelka, czasTekst: string | null): string {
  if (p.ile === 0) return KUBELEK_PUSTY;

  const czesci: string[] = [`${p.ile} ${p.ile === 1 ? 'rzecz' : 'rzeczy'}`];

  if (p.sekundy > 0) {
    czesci.push(czasTekst === null ? SUMA_CZAS_NIECZYTELNY : SUMA_RAZEM + czasTekst);
  }

  if (p.bezCzasu > 0) {
    czesci.push(p.bezCzasu === p.ile ? SUMA_NIC_NIE_WIEM : `przy ${p.bezCzasu} nie wiem ile`);
  }

  return czesci.join(' · ');
}

// ─────────────────────────────────────────────────────────────────────
// 5. KTÓRA POZYCJA MA WIERSZ W `player_tasks` (WT-23, WT-28)
// ─────────────────────────────────────────────────────────────────────
// Odhaczenie i podniesienie to ZAPISY DO KONKRETNEGO WIERSZA. Pozycja, która
// nie pochodzi z `player_tasks` (wydarzenie z kalendarza, wgląd, jedna
// odpowiedź), nie ma czego zapisać — a przycisk, który udaje, że coś zapisał,
// jest gorszy niż jego brak.
//
// ⚠️ Rozpoznajemy po ŚLADZIE (`skadToWiemy.skad`), nie po prefiksie `id`.
// Prefiks jest konwencją nazewniczą producenta i wolno mu się zmienić; ślad
// jest kontraktem Z0 i zmienić mu się nie wolno.

export function czyPozycjaZadania(p: PozycjaKolejki): boolean {
  return p.skadToWiemy.skad === TABELA_ZADAN;
}

/**
 * Identyfikator wiersza `player_tasks` dla tej pozycji albo `null`.
 * ⛔ WYŁĄCZNIE DO ZAPISU DO BAZY. Nigdy na ekran (kontrakt B1 §8.6).
 */
export function idZadaniaZPozycji(p: PozycjaKolejki): string | null {
  if (!czyPozycjaZadania(p)) return null;
  return p.skadToWiemy.idWiersza;
}

/**
 * Czy tę pozycję da się dziś podnieść do „Teraz".
 * ⚠️ Pozycja JUŻ podniesiona nie dostaje przycisku po raz drugi — przycisk,
 * który nic nie zmienia, uczy zawodnika, że przyciski nic nie robią.
 */
export function mozliwePodniesienie(p: PozycjaKolejki): boolean {
  return czyPozycjaZadania(p) && !p.podniesioneRecznie && p.kubelek !== 'teraz';
}

/** Czy przy tej pozycji ma stać pole do odhaczenia (WT-23). */
export function mozliweOdhaczenie(p: PozycjaKolejki): boolean {
  return czyPozycjaZadania(p);
}
