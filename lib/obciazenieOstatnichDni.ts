// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-L1 08.2026 (17.08.2026) — OBCIĄŻENIE OSTATNICH DNI.
//
// Ten plik odpowiada na JEDNO pytanie: ILE PRACY MIEŚCI SIĘ W OKNIE OSTATNICH
// N DNI. Zero Reacta, zero Supabase, zero zegara — dzisiejszą datę podaje
// wołający, tak samo jak w `lib/wykonanieSesji.ts`.
//
// ── ⛔ CO TEN PLIK ODDAJE, A CZEGO NIE ODDAJE ───────────────────────
// Oddaje LICZBĘ i rozbiór tej liczby: ile jednostek, jakich rodzajów, ile
// z nich ma datę o pewnym znaczeniu, a ile tylko datę powstania wiersza.
// ⛔ Nie oddaje ANI JEDNEGO ZDANIA o tym, jaka ta liczba jest, i ani jednego
// odniesienia do kogokolwiek innego. Wolno powiedzieć ILE. Nie wolno
// powiedzieć CZY.
//
// ⚠️ POWODU TEGO ZAKAZU NIE MA W TYM PLIKU I TO JEST ŚWIADOME. Strażnik
// (`lib/nagrodaZaPrace.selftest.ts`, grupa L1-D5) czyta ten plik W CAŁOŚCI,
// razem z komentarzami — więc zapaliłby się na cytacie z zakazu tak samo, jak
// na jego złamaniu. Wyjaśnienie stoi w nagłówku `lib/nagrodaZaPrace.ts`
// i w nocie `claude/PRZEKAZANIE_PAS_L1_17_08_2026.md`. Tutaj zostaje sam kod.
//
// ── ⭐ DLACZEGO TO JEST OSOBNY PLIK, A NIE PARAMETR `policzNagrode` ──
// Bo jedna funkcja z przełącznikiem „okno" jest zaproszeniem, żeby ktoś podał
// okno tam, gdzie go nie wolno. `policzNagrode` w `lib/nagrodaZaPrace.ts` liczy
// DOROBEK CAŁKOWITY i nie ma prawa zależeć od kalendarza; ta funkcja liczy
// OKNO i bez kalendarza nie umie nic. Dwie funkcje, dwa pliki, jedna decyzja
// w każdym z nich — zamiast jednej funkcji, w której da się pomylić tryb.
//
// ── ⭐ TRZY WARTOŚCI WYNIKU, NIE DWIE (R5) ──────────────────────────
//   `policzone`            — odczytałem wszystko i coś w oknie jest;
//   `brak_pracy_w_oknie`   — odczytałem wszystko i w oknie NIC nie ma;
//   `nie_policzone`        — któregoś źródła NIE ODCZYTAŁEM.
// ⛔ `brak_pracy_w_oknie` NIE MA POLA `punkty`, dokładnie jak `nie_policzona`
// w `lib/nagrodaZaPrace.ts`. Bez tego pola nie da się narysować „0 punktów"
// tym samym zdaniem w obu przypadkach — a to są dwie różne rzeczy o zawodniku.
// ═══════════════════════════════════════════════════════════════════

import {
  WAGI_PRACY,
  type JednostkaPracy,
  type RodzajPracy,
  type WejscieNagrody,
  type WejscieZrodla,
} from './nagrodaZaPrace';
import { przesunDate } from './wykonanieSesji';

// ═══════════════════════════════════════════════════════════════════
// 1. ⭐ OKNA — DWIE LICZBY, JEDNO MIEJSCE (D4)
// ═══════════════════════════════════════════════════════════════════
//
// ⚠️ ŻADNA Z TYCH DWÓCH LICZB NIE MA ZA SOBĄ BADANIA I ŻADNA NIE UDAJE, ŻE MA.
// To są decyzje produktowe, wpisane tu z podpisem — dokładnie jak `PROGI`
// w `lib/nagrodaZaPrace.ts`, które o sobie piszą to samo.
//
// ⛔ OBIE STOJĄ TYLKO TUTAJ. Wpisanie którejkolwiek drugi raz — w asercji,
// w ekranie, w innym module — jest defektem, na który jest osobna zapadka
// strażnika (grupa L1-D4). Liczba przepisana w dwa miejsca rozjeżdża się przy
// pierwszej poprawce i oba miejsca wyglądają wtedy poprawnie.

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
// 2. WYNIK
// ═══════════════════════════════════════════════════════════════════

/** Jednostka, która do okna NIE WESZŁA, bo nie ma czym jej umieścić w czasie. */
export type JednostkaPozaPomiarem = { rodzaj: RodzajPracy; powod: string };

/** Rozbiór liczby na rodzaje pracy. ⛔ Sam rozbiór, bez ani jednego przymiotnika. */
export type WgRodzaju = Readonly<Record<RodzajPracy, number>>;

export type ObciazenieWOknie =
  | {
      rodzaj: 'policzone';
      /** Długość okna w dniach — ta sama liczba, którą podał wołający. */
      oknoDni: number;
      /** Pierwszy dzień okna (włącznie). */
      odDnia: string;
      /** Ostatni dzień okna (włącznie) — „dzisiaj" wołającego. */
      doDnia: string;
      /** ⭐ Obciążenie: suma wag pracy, która mieści się w oknie. */
      punkty: number;
      /** Ile jednostek złożyło się na tę liczbę. */
      jednostki: number;
      /** Ile z nich ma datę o znaczeniu „dzień wykonanej pracy". */
      zDniaPracy: number;
      /**
       * ⚠️ Ile z nich weszło do okna po DACIE POWSTANIA WIERSZA, bo źródło nie
       * ma innej. Liczba jest podana, ale nie udaje pewnej — kto rysuje wynik,
       * ma czym to powiedzieć (Z0).
       */
      zDniaZapisu: number;
      /** ⛔ Nazwane i policzone, nie ukryte: jednostki bez żadnej daty. */
      pozaPomiarem: readonly JednostkaPozaPomiarem[];
      wgRodzaju: WgRodzaju;
    }
  | {
      /** ⛔ Odczyt się udał i w oknie NIC nie ma. To NIE JEST awaria. */
      rodzaj: 'brak_pracy_w_oknie';
      oknoDni: number;
      odDnia: string;
      doDnia: string;
      /** ⛔ Także tutaj — bo „nic w oknie" przy dwóch jednostkach bez daty
       *  znaczy co innego niż „nic w oknie" przy zerze zapisów w ogóle. */
      pozaPomiarem: readonly JednostkaPozaPomiarem[];
    }
  | {
      /** ⛔ ŚWIADOMIE BEZ POLA `punkty` i bez `odDnia`. Nie ma czego rysować. */
      rodzaj: 'nie_policzone';
      powod: string;
      nieodczytane: readonly string[];
    };

// ═══════════════════════════════════════════════════════════════════
// 3. ⛔ PUNKT WPIĘCIA MUTACJI — produkcyjny wołający TEGO NIE PODAJE
// ═══════════════════════════════════════════════════════════════════

export type ZasadyObciazenia = {
  /** ⛔ Zawsze `true`. Gdy `false` — okno przestaje obowiązywać i wynik obejmuje całą historię. */
  oknoObowiazuje: boolean;
  /** ⛔ Zawsze `false`. Gdy `true` — jednostka bez daty wpada do okna. */
  bezDatyWchodziDoOkna: boolean;
  /** ⛔ Zawsze `false`. Gdy `true` — pusty wynik zlewa się z nieudanym odczytem. */
  pustkaZlewaSieZAwaria: boolean;
};

export const ZASADY_OBCIAZENIA_PRAWDZIWE: ZasadyObciazenia = {
  oknoObowiazuje: true,
  bezDatyWchodziDoOkna: false,
  pustkaZlewaSieZAwaria: false,
};

// ═══════════════════════════════════════════════════════════════════
// 4. FUNKCJA
// ═══════════════════════════════════════════════════════════════════

const PUSTY_ROZBIOR = (): Record<RodzajPracy, number> => ({
  sesja_z_dowodem: 0,
  wpis_potreningowy: 0,
  wpis_dziennika: 0,
  odpowiedz_kontrolna: 0,
  mecz: 0,
});

/**
 * ⭐ ILE PRACY MIEŚCI SIĘ W OKNIE OSTATNICH `oknoDni` DNI.
 *
 * ⛔ WEJŚCIE JEST TO SAMO, CO DLA DOROBKU (`WejscieNagrody`) i to nie jest
 * oszczędność. Dwa wejścia znaczyłyby dwa zapytania i dwie okazje, żeby jedna
 * z liczb powstała z innych wierszy niż druga — a wtedy zawodnik widzi obok
 * siebie dwie liczby, których nie da się ze sobą pogodzić.
 *
 * ⛔ JEDNO NIEODCZYTANE ŹRÓDŁO PRZEWRACA CAŁY WYNIK — ta sama decyzja co
 * w `policzNagrode`, z tego samego powodu: liczba z trzech źródeł zamiast
 * czterech jest mniejsza od prawdy, a milczenie o tym jest podaniem dolnego
 * ograniczenia jako pomiaru (Z0).
 */
export function policzObciazenieWOknie(
  we: WejscieNagrody,
  args: { dzis: string; oknoDni: number },
  zasady: ZasadyObciazenia = ZASADY_OBCIAZENIA_PRAWDZIWE,
): ObciazenieWOknie {
  const zrodla: readonly (readonly [string, WejscieZrodla])[] = [
    ['sesje z dowodem wykonania', we.sesje],
    ['wpisy w Dzienniku', we.dziennik],
    ['odpowiedzi kontrolne Bloku', we.odpowiedziKontrolne],
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

  // ── Odsiew duplikatów po kluczu — ta sama reguła, co w dorobku. ──
  const widziane = new Set<string>();
  const jednostki: JednostkaPracy[] = [];
  for (const [, z] of zrodla) {
    if (z.rodzaj !== 'jest') continue;
    for (const j of z.jednostki) {
      if (!j || typeof j.klucz !== 'string' || j.klucz.length === 0) continue;
      if (!(j.rodzaj in WAGI_PRACY)) continue;
      if (widziane.has(j.klucz)) continue;
      widziane.add(j.klucz);
      jednostki.push(j);
    }
  }

  let punkty = 0;
  let wOknie = 0;
  let zDniaPracy = 0;
  let zDniaZapisu = 0;
  const wgRodzaju = PUSTY_ROZBIOR();
  const pozaPomiarem: JednostkaPozaPomiarem[] = [];

  // ⭐ PLAN-D-W1 — waga jest WŁASNOŚCIĄ JEDNOSTKI, nie jej rodzaju (O100).
  // ⛔ `WAGI_PRACY[rodzaj]` zostaje wyłącznie jako wartość awaryjna: jednostka
  // bez policzonej wagi nie może wpaść do sumy jako zero, bo zero znaczyłoby
  // „tej pracy nie było". ⚠️ Ta funkcja przechodzi na minuty × RPE w pasie W3.
  const wagaJednostki = (j: JednostkaPracy): number =>
    typeof j.punkty === 'number' && Number.isFinite(j.punkty) ? j.punkty : WAGI_PRACY[j.rodzaj];

  for (const j of jednostki) {
    const kiedy = j.kiedy;
    if (!kiedy || kiedy.rodzaj === 'nieznana') {
      if (zasady.bezDatyWchodziDoOkna) {
        punkty += wagaJednostki(j);
        wOknie += 1;
        wgRodzaju[j.rodzaj] += 1;
        continue;
      }
      pozaPomiarem.push({
        rodzaj: j.rodzaj,
        powod: kiedy && kiedy.rodzaj === 'nieznana' ? kiedy.powod : 'jednostka bez daty',
      });
      continue;
    }
    const mieciSie = zasady.oknoObowiazuje
      ? kiedy.dzien >= odDnia && kiedy.dzien <= doDnia
      : true;
    if (!mieciSie) continue;
    punkty += wagaJednostki(j);
    wOknie += 1;
    wgRodzaju[j.rodzaj] += 1;
    if (kiedy.rodzaj === 'dzien_pracy') zDniaPracy += 1; else zDniaZapisu += 1;
  }

  if (wOknie === 0 && !zasady.pustkaZlewaSieZAwaria) {
    return { rodzaj: 'brak_pracy_w_oknie', oknoDni, odDnia, doDnia, pozaPomiarem };
  }
  if (wOknie === 0) {
    return {
      rodzaj: 'nie_policzone',
      powod: 'w oknie nie ma pracy',
      nieodczytane: [],
    };
  }

  return {
    rodzaj: 'policzone',
    oknoDni,
    odDnia,
    doDnia,
    punkty,
    jednostki: wOknie,
    zDniaPracy,
    zDniaZapisu,
    pozaPomiarem,
    wgRodzaju,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 5. ZDANIA — TRZY STANY, TRZY RÓŻNE ZDANIA (D6)
// ═══════════════════════════════════════════════════════════════════
//
// ⛔ KAŻDE Z TYCH ZDAŃ MÓWI ILE, ŻADNE NIE MÓWI CZY. Każde da się przeczytać
// zawodnikowi na głos i żadne nie stawia tezy o nim samym.

export function zdanieObciazenia(o: ObciazenieWOknie): string {
  if (o.rodzaj === 'nie_policzone') {
    return `Nie udało mi się policzyć ostatnich dni — ${o.powod}.`;
  }
  if (o.rodzaj === 'brak_pracy_w_oknie') {
    return `Ostatnie ${o.oknoDni} dni (${o.odDnia} – ${o.doDnia}): nie ma tu ani jednego zapisu.`;
  }
  return `Ostatnie ${o.oknoDni} dni (${o.odDnia} – ${o.doDnia}): `
    + `${o.punkty} ${o.punkty === 1 ? 'punkt' : 'punktów'} pracy z ${o.jednostki} `
    + `${o.jednostki === 1 ? 'zapisu' : 'zapisów'}.`;
}

/** Zdanie do konsoli — żeby dało się zdiagnozować liczbę po fakcie. */
export function opisObciazeniaDoLogu(o: ObciazenieWOknie): string {
  if (o.rodzaj === 'nie_policzone') {
    return `obciążenie: NIE POLICZONE — ${o.powod} [${o.nieodczytane.join(' | ')}]`;
  }
  if (o.rodzaj === 'brak_pracy_w_oknie') {
    return `obciążenie (${o.oknoDni} dni, ${o.odDnia}–${o.doDnia}): BRAK PRACY W OKNIE `
      + `· bez daty: ${o.pozaPomiarem.length}`;
  }
  const rozbior = (Object.keys(o.wgRodzaju) as RodzajPracy[])
    .filter((r) => o.wgRodzaju[r] > 0)
    .map((r) => `${r}=${o.wgRodzaju[r]}`)
    .join(',');
  return `obciążenie (${o.oknoDni} dni, ${o.odDnia}–${o.doDnia}): ${o.punkty} pkt `
    + `z ${o.jednostki} jednostek [${rozbior}] · z dnia pracy: ${o.zDniaPracy} `
    + `· z dnia zapisu: ${o.zDniaZapisu} · bez daty: ${o.pozaPomiarem.length}`;
}
