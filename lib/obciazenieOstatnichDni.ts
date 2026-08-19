// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-L1 08.2026 (17.08.2026) — OKNO OSTATNICH DNI.
// ⭐ PLAN-D-D1 (18.08.2026) — ZMIENIŁA SIĘ SUMOWANA WARTOŚĆ.
//
// Ten plik odpowiada na JEDNO pytanie: ILE OBCIĄŻENIA MIEŚCI SIĘ W OKNIE
// OSTATNICH N DNI. Zero Reacta, zero Supabase, zero zegara — dzisiejszą datę
// podaje wołający, tak samo jak w `lib/wykonanieSesji.ts`.
//
// ── ⛔ CO ZMIENIŁ PAS D1 I DLACZEGO ────────────────────────────────
// Do 18.08 ta funkcja sumowała `j.punkty` z `lib/nagrodaZaPrace.ts`, czyli
// wartość DOROBKU. Ta wartość niesie w sobie TRAFNOŚĆ: ta sama sesja 30 minut
// przy ciężkości 5 ważyła 1,0 albo 1,5 zależnie od tego, w co celowała.
// Liczba nazwana obciążeniem, która rośnie od celności, mówi zawodnikowi
// odwrotność tezy produktu.
//
// ⭐ ZOSTAŁA CAŁA MASZYNERIA OKNA: dwie długości, odsiew duplikatów po kluczu,
// trzecia wartość „nie policzone", jednostki bez daty nazwane i policzone
// zamiast zniknięte, rozróżnienie dnia pracy od dnia zapisu.
// ⭐ ZMIENIŁA SIĘ WYŁĄCZNIE SUMOWANA WARTOŚĆ: `minuty × ciężkość ⁄ przelicznik`
// z `lib/obciazenie.ts`.
//
// ── ⛔ STRUKTURALNY DOWÓD ──────────────────────────────────────────
// Ten plik NIE IMPORTUJE ANI JEDNEJ NAZWY z `lib/nagrodaZaPrace.ts`
// ani z `lib/zwrotObszaru.ts`. Trafność mieszka tam i nie ma tędy drogi.
//
// ── ⛔ CO TEN PLIK ODDAJE, A CZEGO NIE ODDAJE ──────────────────────
// Oddaje LICZBĘ i rozbiór tej liczby. ⛔ Nie oddaje ANI JEDNEGO zdania o tym,
// jaka ta liczba jest, i ani jednego odniesienia do kogokolwiek innego.
// Wolno powiedzieć ILE. Nie wolno powiedzieć CZY.
//
// ⚠️ POWODU TEGO ZAKAZU NIE MA W TYM PLIKU I TO JEST ŚWIADOME. Strażnik czyta
// ten plik W CAŁOŚCI, razem z komentarzami — więc zapaliłby się na cytacie
// z zakazu tak samo, jak na jego złamaniu. Wyjaśnienie stoi w nagłówku
// `lib/obciazenie.ts` i w nocie `claude/PRZEKAZANIE_PAS_D1_18_08_2026.md`.
//
// ── ⭐ TRZY WARTOŚCI WYNIKU, NIE DWIE (R5) ─────────────────────────
//   `policzone`            — odczytałem wszystko i coś w oknie jest;
//   `brak_pracy_w_oknie`   — odczytałem wszystko i w oknie NIC nie ma;
//   `nie_policzone`        — któregoś źródła NIE ODCZYTAŁEM.
// ⛔ `brak_pracy_w_oknie` NIE MA POLA `punkty`. Bez tego pola nie da się
// narysować zera tym samym zdaniem w obu przypadkach — a to są dwie różne
// rzeczy o zawodniku.
// ═══════════════════════════════════════════════════════════════════

import {
  obciazenieSesjiZZasadami,
  type BrakLiczby,
  ZASADY_SILNIKA_PRAWDZIWE,
  type RodzajObciazenia,
  type SesjaObciazenia,
  type ZasadySilnika,
} from './obciazenie';
import { przesunDate } from './wykonanieSesji';

// ═══════════════════════════════════════════════════════════════════
// 1. ⭐ OKNA — DWIE LICZBY, JEDNO MIEJSCE (D4)
// ═══════════════════════════════════════════════════════════════════
//
// ⚠️ ŻADNA Z TYCH DWÓCH LICZB NIE MA ZA SOBĄ BADANIA I ŻADNA NIE UDAJE, ŻE MA.
// To są decyzje produktowe, wpisane tu z podpisem.
//
// ⛔ OBIE STOJĄ TYLKO TUTAJ. Wpisanie którejkolwiek drugi raz — w asercji,
// w ekranie, w innym module — jest defektem, na który jest osobna zapadka
// strażnika. Liczba przepisana w dwa miejsca rozjeżdża się przy pierwszej
// poprawce i oba miejsca wyglądają wtedy poprawnie.

/**
 * Okno pierwszego planu: **7 dni**.
 *
 * Skąd 7: tydzień jest jednostką, w której zaplanowany jest tydzień zawodnika
 * (`lib/widokTygodnia.ts`) i w której produkt już z nim rozmawia. Zawodnik nie
 * musi przeliczać, czego dotyczy liczba. Decyzja Kuby z 17.08.2026 (wariant A).
 */
export const OKNO_OBCIAZENIA_DNI = 7;

/**
 * Okno szersze: **28 dni**.
 *
 * Skąd 28: cztery tygodnie, czyli skala jednego Bloku Skupienia — ta sama,
 * którą nosi uzasadnienie progu `siedemdziesiat_piec` w `PROGI`
 * (`4 tygodnie × 3 sesje`). Jedna liczba w dwóch decyzjach zamiast dwóch.
 */
export const OKNO_ODNIESIENIA_DNI = 28;

// ═══════════════════════════════════════════════════════════════════
// 2. WEJŚCIE
// ═══════════════════════════════════════════════════════════════════

/**
 * ⭐ TRZY STANY ŹRÓDŁA, I TRZECI NIE JEST OZDOBĄ (R5).
 *   `jest`          — odczytałem; lista może być pusta i pusta znaczy „nic tam nie ma".
 *   `nie_odczytano` — odczyt padł. ⛔ TO NIE JEST ZERO OBCIĄŻENIA.
 */
export type ZrodloObciazenia =
  | { rodzaj: 'jest'; sesje: readonly SesjaObciazenia[] }
  | { rodzaj: 'nie_odczytano'; powod: string };

/** Wejście dla wołającego, który danego źródła w ogóle nie czyta. */
export function zrodloObciazeniaNieczytane(powod: string): ZrodloObciazenia {
  return { rodzaj: 'nie_odczytano', powod };
}

/**
 * ⛔ DWA ŹRÓDŁA, BO TYLKO DWA RODZAJE ZAPISU NIOSĄ PRACĘ CIAŁA. Wpis poranny
 * i odpowiedź kontrolna są danymi o pracy, nie pracą — nie mają jak obciążyć
 * ciała i nie wchodzą tu nawet jako brak.
 */
export type WejscieObciazenia = {
  sesje: ZrodloObciazenia;
  mecze: ZrodloObciazenia;
};

// ═══════════════════════════════════════════════════════════════════
// 3. WYNIK
// ═══════════════════════════════════════════════════════════════════

/** Sesja, która do okna NIE WESZŁA, bo nie ma czym jej umieścić w czasie. */
export type SesjaPozaPomiarem = { rodzaj: RodzajObciazenia; powod: string };

/**
 * ⭐ Sesja, która W OKNIE JEST, a mimo to nie dokłada liczby — bo brakuje
 * minut albo ciężkości. ⛔ To NIE JEST zero obciążenia (R5): to jest praca,
 * o której wiemy, że była, i nie wiemy, ile ważyła.
 */
export type SesjaBezLiczby = { rodzaj: RodzajObciazenia; czegoBrak: string };

/** Rozbiór liczby na rodzaje pracy. ⛔ Sam rozbiór, bez ani jednego przymiotnika. */
export type WgRodzaju = Readonly<Record<RodzajObciazenia, number>>;

export type ObciazenieWOknie =
  | {
      rodzaj: 'policzone';
      /** Długość okna w dniach — ta sama liczba, którą podał wołający. */
      oknoDni: number;
      /** Pierwszy dzień okna (włącznie). */
      odDnia: string;
      /** Ostatni dzień okna (włącznie) — „dzisiaj" wołającego. */
      doDnia: string;
      /**
       * ⭐ Suma wartości SUROWYCH `minuty × ciężkość ⁄ przelicznik`.
       * ⛔ Bez trafności i bez zaokrąglenia — zaokrąglenie należy do ekranu.
       */
      punkty: number;
      /** Ile sesji złożyło się na tę liczbę. */
      sesje: number;
      /** Ile z nich ma datę o znaczeniu „dzień wykonanej pracy". */
      zDniaPracy: number;
      /**
       * ⚠️ Ile z nich weszło do okna po DACIE POWSTANIA WIERSZA, bo źródło nie
       * ma innej. Liczba jest podana, ale nie udaje pewnej — kto rysuje wynik,
       * ma czym to powiedzieć (Z0).
       */
      zDniaZapisu: number;
      /** ⛔ Nazwane i policzone, nie ukryte: sesje bez żadnej daty. */
      pozaPomiarem: readonly SesjaPozaPomiarem[];
      /** ⛔ Nazwane i policzone: sesje W OKNIE bez minut albo bez ciężkości. */
      bezLiczby: readonly SesjaBezLiczby[];
      wgRodzaju: WgRodzaju;
    }
  | {
      /** ⛔ Odczyt się udał i w oknie NIC nie waży. To NIE JEST awaria. */
      rodzaj: 'brak_pracy_w_oknie';
      oknoDni: number;
      odDnia: string;
      doDnia: string;
      pozaPomiarem: readonly SesjaPozaPomiarem[];
      /**
       * ⛔ Także tutaj — i to jest najważniejszy powód, dla którego ten wariant
       * NIE MA pola `punkty`: dwie sesje w oknie bez ciężkości to nie to samo,
       * co brak sesji w ogóle.
       */
      bezLiczby: readonly SesjaBezLiczby[];
    }
  | {
      /** ⛔ ŚWIADOMIE BEZ POLA `punkty` i bez `odDnia`. Nie ma czego rysować. */
      rodzaj: 'nie_policzone';
      powod: string;
      nieodczytane: readonly string[];
    };

// ═══════════════════════════════════════════════════════════════════
// 4. ⛔ PUNKT WPIĘCIA MUTACJI — produkcyjny wołający TEGO NIE PODAJE
// ═══════════════════════════════════════════════════════════════════

export type ZasadyObciazenia = {
  /** ⛔ Zawsze `true`. Gdy `false` — okno przestaje obowiązywać i wynik obejmuje całą historię. */
  oknoObowiazuje: boolean;
  /** ⛔ Zawsze `false`. Gdy `true` — sesja bez daty wpada do okna. */
  bezDatyWchodziDoOkna: boolean;
  /** ⛔ Zawsze `false`. Gdy `true` — pusty wynik zlewa się z nieudanym odczytem. */
  pustkaZlewaSieZAwaria: boolean;
  /** ⛔ Zasady samego silnika — przechodzą w dół bez zmiany. */
  silnik: ZasadySilnika;
};

export const ZASADY_OBCIAZENIA_PRAWDZIWE: ZasadyObciazenia = {
  oknoObowiazuje: true,
  bezDatyWchodziDoOkna: false,
  pustkaZlewaSieZAwaria: false,
  silnik: ZASADY_SILNIKA_PRAWDZIWE,
};

// ═══════════════════════════════════════════════════════════════════
// 5. FUNKCJA
// ═══════════════════════════════════════════════════════════════════

const PUSTY_ROZBIOR = (): Record<RodzajObciazenia, number> => ({ sesja: 0, mecz: 0 });

/**
 * ⛔ MAPA JEST PEŁNA I `Record<BrakLiczby, …>` TO WYMUSZA. Wersja z odwrotem
 * (`NAZWY_BRAKU[x] ?? x`) pokazywałaby surową wartość z kodu jako nazwę —
 * złapał to strażnik E2-5 („żaden plik nie pokazuje surowej wartości jako
 * nazwy") 18.08.2026, zanim ta linia dożyła ekranu. Nowy wariant braku
 * NIE SKOMPILUJE SIĘ bez dopisania mu nazwy.
 */
const NAZWY_BRAKU: Readonly<Record<BrakLiczby, string>> = {
  minut: 'bez liczby minut',
  ciezkosci: 'bez ciężkości',
  obu: 'bez minut i bez ciężkości',
};

/**
 * ⭐ ILE OBCIĄŻENIA MIEŚCI SIĘ W OKNIE OSTATNICH `oknoDni` DNI.
 *
 * ⛔ JEDNO NIEODCZYTANE ŹRÓDŁO PRZEWRACA CAŁY WYNIK: liczba z jednego źródła
 * zamiast dwóch jest mniejsza od prawdy, a milczenie o tym jest podaniem
 * dolnego ograniczenia jako pomiaru (Z0).
 */
export function policzObciazenieWOknie(
  we: WejscieObciazenia,
  args: { dzis: string; oknoDni: number },
  zasady: ZasadyObciazenia = ZASADY_OBCIAZENIA_PRAWDZIWE,
): ObciazenieWOknie {
  const zrodla: readonly (readonly [string, ZrodloObciazenia])[] = [
    ['sesje z dowodem wykonania', we.sesje],
    ['mecze', we.mecze],
  ];

  const nieodczytane: string[] = [];
  for (const [nazwa, z] of zrodla) {
    if (z.rodzaj === 'nie_odczytano') nieodczytane.push(`${nazwa}: ${z.powod}`);
  }
  if (nieodczytane.length > 0) {
    return {
      rodzaj: 'nie_policzone',
      powod: nieodczytane.length === zrodla.length
        ? 'nie odczytałem żadnego źródła pracy'
        : `nie odczytałem ${nieodczytane.length} z ${zrodla.length} źródeł pracy`,
      nieodczytane,
    };
  }

  const doDnia = typeof args.dzis === 'string' ? args.dzis.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doDnia)) {
    return {
      rodzaj: 'nie_policzone',
      powod: `nie umiem policzyć okna bez dzisiejszej daty (dostałem „${String(args.dzis)}")`,
      nieodczytane: [],
    };
  }
  const oknoDni = args.oknoDni;
  if (!Number.isInteger(oknoDni) || oknoDni < 1) {
    return {
      rodzaj: 'nie_policzone',
      powod: `długość okna musi być liczbą całkowitą ≥ 1 (dostałem „${String(oknoDni)}")`,
      nieodczytane: [],
    };
  }
  const odDnia = przesunDate(doDnia, -(oknoDni - 1));
  if (odDnia === null) {
    return {
      rodzaj: 'nie_policzone',
      powod: `nie umiem policzyć początku okna z daty „${doDnia}" i ${oknoDni} dni`,
      nieodczytane: [],
    };
  }

  // ── Odsiew duplikatów po kluczu. Dwa odczyty tego samego wiersza nie mają
  //    prawa policzyć się dwa razy. ──
  const widziane = new Set<string>();
  const sesje: SesjaObciazenia[] = [];
  for (const [, z] of zrodla) {
    if (z.rodzaj !== 'jest') continue;
    for (const s of z.sesje) {
      if (!s || typeof s.klucz !== 'string' || s.klucz.length === 0) continue;
      if (s.rodzaj !== 'sesja' && s.rodzaj !== 'mecz') continue;
      if (widziane.has(s.klucz)) continue;
      widziane.add(s.klucz);
      sesje.push(s);
    }
  }

  let punkty = 0;
  let wOknie = 0;
  let zDniaPracy = 0;
  let zDniaZapisu = 0;
  const wgRodzaju = PUSTY_ROZBIOR();
  const pozaPomiarem: SesjaPozaPomiarem[] = [];
  const bezLiczby: SesjaBezLiczby[] = [];

  for (const s of sesje) {
    const kiedy = s.kiedy;
    const bezDaty = !kiedy || kiedy.rodzaj === 'nieznana';
    if (bezDaty && !zasady.bezDatyWchodziDoOkna) {
      pozaPomiarem.push({
        rodzaj: s.rodzaj,
        powod: kiedy && kiedy.rodzaj === 'nieznana' ? kiedy.powod : 'sesja bez daty',
      });
      continue;
    }
    if (!bezDaty && zasady.oknoObowiazuje) {
      const dzien = (kiedy as { dzien: string }).dzien;
      if (dzien < odDnia || dzien > doDnia) continue;
    }

    const waga = obciazenieSesjiZZasadami(s.pomiar, zasady.silnik);
    if (waga.rodzaj === 'bez_liczby') {
      bezLiczby.push({ rodzaj: s.rodzaj, czegoBrak: NAZWY_BRAKU[waga.brakuje] });
      continue;
    }
    punkty += waga.surowe;
    wOknie += 1;
    wgRodzaju[s.rodzaj] += 1;
    if (!bezDaty && kiedy.rodzaj === 'dzien_pracy') zDniaPracy += 1;
    else if (!bezDaty) zDniaZapisu += 1;
  }

  if (wOknie === 0 && !zasady.pustkaZlewaSieZAwaria) {
    return { rodzaj: 'brak_pracy_w_oknie', oknoDni, odDnia, doDnia, pozaPomiarem, bezLiczby };
  }
  if (wOknie === 0) {
    return {
      rodzaj: 'nie_policzone',
      powod: 'w oknie nic nie waży',
      nieodczytane: [],
    };
  }

  return {
    rodzaj: 'policzone',
    oknoDni,
    odDnia,
    doDnia,
    punkty,
    sesje: wOknie,
    zDniaPracy,
    zDniaZapisu,
    pozaPomiarem,
    bezLiczby,
    wgRodzaju,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 6. ZDANIE DO KONSOLI
// ═══════════════════════════════════════════════════════════════════
//
// ⛔ To zdanie NIE JEST brzmieniem dla zawodnika. Brzmienia ekranu 2 stoją
// w `lib/ekranProfilu.ts` i tylko tam.

export function opisObciazeniaDoLogu(o: ObciazenieWOknie): string {
  if (o.rodzaj === 'nie_policzone') {
    return `obciążenie: NIE POLICZONE — ${o.powod} [${o.nieodczytane.join(' | ')}]`;
  }
  if (o.rodzaj === 'brak_pracy_w_oknie') {
    return `obciążenie (${o.oknoDni} dni, ${o.odDnia}–${o.doDnia}): NIC NIE WAŻY W OKNIE `
      + `· bez daty: ${o.pozaPomiarem.length} · bez liczby: ${o.bezLiczby.length}`;
  }
  const rozbior = (Object.keys(o.wgRodzaju) as RodzajObciazenia[])
    .filter((r) => o.wgRodzaju[r] > 0)
    .map((r) => `${r}=${o.wgRodzaju[r]}`)
    .join(',');
  return `obciążenie (${o.oknoDni} dni, ${o.odDnia}–${o.doDnia}): ${o.punkty} pkt `
    + `z ${o.sesje} sesji [${rozbior}] · z dnia pracy: ${o.zDniaPracy} `
    + `· z dnia zapisu: ${o.zDniaZapisu} · bez daty: ${o.pozaPomiarem.length} `
    + `· bez liczby: ${o.bezLiczby.length}`;
}
