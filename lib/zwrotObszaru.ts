// ═══════════════════════════════════════════════════════════════════
// ZWROT OBSZARU — ile daje praca w danym obszarze TEMU zawodnikowi
// PLAN-D-W4, 18.08.2026
// ═══════════════════════════════════════════════════════════════════
//
// ⛔ CO BYŁO ZEPSUTE, ZMIERZONE 18.08 W BAZIE I W KODZIE:
// Produkt ma DWIE osie i nigdy ich nie pomnożył.
//   1. `diagnostics.scores` — wynik 0–100 dla każdego z 13 obszarów;
//   2. `lib/positionProfiles.ts` — tier `key`/`important`/`minor` dla każdego
//      obszaru i każdej z 9 pozycji.
// Kaskada `livingDiagnosisCascade` bierze „key I deficyt", a gdy takich nie ma,
// spada do „największy deficyt sam w sobie". Skutek na prawdziwym zawodniku
// (boczny obrońca, 15 lat): produkt wskazuje ODŻYWIANIE (wynik 40, tier `minor`)
// i NIE WIDZI MOCY (wynik 70, tier `key` — jedna z trzech rzeczy, na których
// ta pozycja stoi).
//
// Słowa Kuby: „z diagnozy wychodzą te rzeczy, nad którymi warto pracować, bo
// dają możliwy największy zwrot. Są też inne kategorie. Takie, które są już
// wysoko rozwinięte, takie, które na pozycji nie dają aż takiego zwrotu."
//
// ⛔ ŻADNA LICZBA W TYM PLIKU NIE MA ZA SOBĄ BADANIA I ŻADNA NIE UDAJE, ŻE MA.
// To są wagi i progi, czyli decyzje produktowe.

import { getPositionProfile, type PositionTier } from './positionProfiles';

/**
 * ⛔ DECYZJA PRODUKTOWA. Ile znaczy tier pozycji przy liczeniu zwrotu.
 * Nie wynika z badania — wynika z tego, że obszar kluczowy dla pozycji zwraca
 * więcej niż poboczny przy tej samej wielkości deficytu.
 */
export const WAGA_TIERU: Readonly<Record<PositionTier, number>> = {
  key: 1.0,
  important: 0.6,
  minor: 0.3,
};

/**
 * ⭐ PODŁOGA. Obszar z wynikiem NIE WYŻSZYM niż ta liczba jest trafny ZAWSZE,
 * niezależnie od tieru pozycji.
 *
 * ⛔ TO NIE JEST OSTROŻNOŚĆ, TYLKO NAPRAWA ZNANEGO BŁĘDU SAMEJ SKALI TIERÓW.
 * Odżywianie, regeneracja i tolerancja obciążeń mają u prawie każdej pozycji
 * tier `minor`, bo nie zwracają „na boisku" — ale są warunkiem, żeby cokolwiek
 * innego zadziałało. Bez podłogi produkt powiedziałby piętnastolatkowi
 * z odżywianiem na 40, że jedzenie nie jest warte jego czasu.
 */
export const PROG_PODLOGI_WYNIKU = 40;

/** Ile obszarów o najwyższym zwrocie wchodzi na listę trafnych. ⛔ Decyzja produktowa. */
export const ILE_NAJWYZSZYCH_ZWROTOW = 3;

/** ⭐ Premia dla pracy trafiającej w obszar trafny. ⛔ NIGDY poniżej 1 (decyzja Kuby 1A). */
export const TRAFNOSC_W_OBSZAR_TRAFNY = 1.5;
export const TRAFNOSC_BAZOWA = 1.0;

/** Dlaczego ten obszar jest trafny. ⛔ `null` znaczy „nie jest", a nie „nie wiem". */
export type PowodTrafnosci = 'zwrot' | 'podloga' | 'zwrot_i_podloga';

export type ObszarZeZwrotem = {
  obszar: string;
  wynik: number;
  tier: PositionTier | null;
  /** ⚠️ `null` = nie znam tieru tego obszaru dla tej pozycji, więc nie liczę zwrotu (Z0). */
  zwrot: number | null;
  trafny: PowodTrafnosci | null;
};

export type ZwrotObszarow =
  | { rodzaj: 'jest'; obszary: readonly ObszarZeZwrotem[]; trafne: ReadonlySet<string> }
  /** ⭐ TRZECIA WARTOŚĆ (R5): nie znam diagnozy albo pozycji. ⛔ NIE „nic nie jest trafne". */
  | { rodzaj: 'nie_wiemy'; powod: string };

function liczbaWynik(x: unknown): number | null {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 100 ? x : null;
}

/**
 * ⭐ ZWROT OBSZARÓW: `(100 − wynik) × waga tieru`.
 *
 * ⛔ Brak diagnozy albo brak pozycji NIE JEST zerem zwrotu — jest „nie wiemy",
 * a wtedy każda praca ma trafność bazową 1,0 i nikt nic nie traci (decyzja 1A).
 */
export function policzZwrotObszarow(args: {
  /** `diagnostics.scores` już sparsowane. `null` = nie ma diagnozy. */
  wyniki: Readonly<Record<string, unknown>> | null;
  /** Polska etykieta pozycji (`player_profiles.position_primary` albo `diagnostics.position`). */
  pozycja: string | null;
}): ZwrotObszarow {
  if (args.wyniki === null || typeof args.wyniki !== 'object') {
    return { rodzaj: 'nie_wiemy', powod: 'nie mam wyników diagnozy tego zawodnika' };
  }
  const profil = getPositionProfile(args.pozycja);
  if (profil === null) {
    return {
      rodzaj: 'nie_wiemy',
      powod: args.pozycja === null || args.pozycja === ''
        ? 'nie znam pozycji tego zawodnika'
        : `nie znam profilu pozycji „${args.pozycja}"`,
    };
  }

  const obszary: ObszarZeZwrotem[] = [];
  for (const [obszar, surowy] of Object.entries(args.wyniki)) {
    const wynik = liczbaWynik(surowy);
    if (wynik === null) continue;
    const tier = (profil.tiers[obszar] as PositionTier | undefined) ?? null;
    obszary.push({
      obszar,
      wynik,
      tier,
      // ⛔ Nieznany tier NIE dostaje wagi domyślnej. Zwrot bez tieru byłby
      // liczbą udającą pomiar (Z0) — zamiast tego zostaje `null` i obszar
      // może wejść na listę trafnych wyłącznie podłogą.
      zwrot: tier === null ? null : (100 - wynik) * WAGA_TIERU[tier],
      trafny: null,
    });
  }

  if (obszary.length === 0) {
    return { rodzaj: 'nie_wiemy', powod: 'diagnoza nie zawiera ani jednego czytelnego wyniku obszaru' };
  }

  // ── Trzy najwyższe zwroty ────────────────────────────────────────
  const zeZwrotem = obszary.filter((o) => o.zwrot !== null);
  const kolejnosc = [...zeZwrotem].sort((a, b) => {
    const r = (b.zwrot as number) - (a.zwrot as number);
    // ⛔ Remis rozstrzyga NIŻSZY wynik, a potem nazwa — żeby zwrot był
    // powtarzalny co do znaku, a nie zależny od kolejności kluczy w JSON-ie.
    if (r !== 0) return r;
    if (a.wynik !== b.wynik) return a.wynik - b.wynik;
    return a.obszar < b.obszar ? -1 : 1;
  });
  // ⭐ REMISY NA GRANICY WCHODZĄ W KOMPLECIE — i to nie jest drobiazg.
  // ⛔ ZMIERZONE NA PRAWDZIWYM ZAWODNIKU: boczny obrońca ma TRZY obszary
  // kluczowe (moc, wytrzymałość, szybkość decyzji) z identycznym wynikiem 70,
  // czyli z identycznym zwrotem 30. Zwykłe „weź trzy pierwsze" wybrałoby
  // JEDEN z nich alfabetycznie i po cichu wyrzuciło dwa pozostałe.
  // Dlatego progiem jest WARTOŚĆ trzeciego zwrotu, a nie pozycja w liście.
  const progZwrotu = kolejnosc.length >= ILE_NAJWYZSZYCH_ZWROTOW
    ? (kolejnosc[ILE_NAJWYZSZYCH_ZWROTOW - 1].zwrot as number)
    : (kolejnosc.length > 0 ? (kolejnosc[kolejnosc.length - 1].zwrot as number) : Infinity);
  const zZwrotu = new Set(kolejnosc.filter((o) => (o.zwrot as number) >= progZwrotu).map((o) => o.obszar));

  // ── Podłoga ──────────────────────────────────────────────────────
  const zPodlogi = new Set(obszary.filter((o) => o.wynik <= PROG_PODLOGI_WYNIKU).map((o) => o.obszar));

  const trafne = new Set<string>([...zZwrotu, ...zPodlogi]);
  for (const o of obszary) {
    const a = zZwrotu.has(o.obszar);
    const b = zPodlogi.has(o.obszar);
    o.trafny = a && b ? 'zwrot_i_podloga' : a ? 'zwrot' : b ? 'podloga' : null;
  }

  obszary.sort((a, b) => {
    const az = a.zwrot ?? -1;
    const bz = b.zwrot ?? -1;
    if (az !== bz) return bz - az;
    return a.obszar < b.obszar ? -1 : 1;
  });

  return { rodzaj: 'jest', obszary, trafne };
}

/**
 * ⭐ TRAFNOŚĆ JEDNEJ SESJI. ⛔ NIGDY poniżej 1,0 (decyzja Kuby 1A):
 * trafność poniżej bazy mówiłaby zawodnikowi, że jego praca jest mniej warta.
 * Premia jest premią, nie karą.
 *
 * ⛔ Trening klubowy i mecz mają 1,0 ZAWSZE — zawodnik nie ma wpływu na ich
 * treść. Słowa Kuby: „ocenianie tego przez pryzmat treningu klubowego nie ma
 * sensu, bo zawodnik nie ma takiego wpływu".
 */
export function trafnoscSesji(args: {
  zwrot: ZwrotObszarow;
  /** Obszar, którego dotyczy sesja (`focus_blocks.segment_id`). `null` = nie wiadomo. */
  obszar: string | null;
  /** Czy tę pozycję postawił ktoś inny niż zawodnik (klub, trener, mecz). */
  zewnetrzna: boolean;
}): number {
  if (args.zewnetrzna) return TRAFNOSC_BAZOWA;
  if (args.zwrot.rodzaj !== 'jest') return TRAFNOSC_BAZOWA;
  if (typeof args.obszar !== 'string' || args.obszar.length === 0) return TRAFNOSC_BAZOWA;
  return args.zwrot.trafne.has(args.obszar) ? TRAFNOSC_W_OBSZAR_TRAFNY : TRAFNOSC_BAZOWA;
}

// ═══════════════════════════════════════════════════════════════════
// PRACA WŁASNA ZADEKLAROWANA W DIAGNOZIE
// ═══════════════════════════════════════════════════════════════════
//
// ⭐ Diagnoza PYTA, co zawodnik robi dodatkowo (`own_training_types`), i nikt
// tego dotąd nie zestawił ze zwrotem. Dzięki temu zdanie „robisz dużo pracy
// o małym zwrocie" da się powiedzieć W DNIU ZAŁOŻENIA KONTA — bez ani jednego
// wpisu i bez tygodnia historii.

/**
 * ⛔ DECYZJA PRODUKTOWA, NIE BADANIE. Uogólnienie, tak jak w wielu innych
 * miejscach tego produktu.
 *
 * ⚠️ NAJSŁABSZE OGNIWO TEJ MAPY, NAZWANE PRZEZ KUBĘ 18.08.2026:
 * `stretching → regeneracja` ma SŁABE DANE naukowe. Zostaje jako uogólnienie
 * na teraz i jest pierwszą pozycją do dopracowania. ⛔ Produkt nie wolno mu
 * na tej podstawie powiedzieć „stretching nic ci nie daje" — wolno mu tylko
 * policzyć, ile z zadeklarowanej pracy trafia w obszary o najwyższym zwrocie.
 */
export const MAPA_PRACY_WLASNEJ: Readonly<Record<string, readonly string[]>> = {
  silownia: ['moc', 'fizycznosc'],
  bieganie: ['wytrzymalosc', 'tolerancja'],
  technika: ['techFund', 'techSpec'],
  mental: ['mental', 'koncentracja'],
  stretching: ['regeneracja', 'odpornosc'],
};

export type OcenaPracyWlasnej =
  | {
    rodzaj: 'jest';
    /** Rodzaje, które trafiają w co najmniej jeden obszar trafny. */
    trafiaja: readonly string[];
    /** Rodzaje, które nie trafiają w żaden. ⛔ To NIE znaczy „bezwartościowe". */
    nieTrafiaja: readonly string[];
    /** ⭐ Obszary trafne, w które NIC z zadeklarowanej pracy nie trafia. */
    trafneBezPokrycia: readonly string[];
    /** Rodzaje spoza mapy — ⛔ nazwane, nie pominięte (R5). */
    nieznaneRodzaje: readonly string[];
  }
  | { rodzaj: 'nie_wiemy'; powod: string };

export function ocenPraceWlasna(args: {
  zwrot: ZwrotObszarow;
  /** `diagnostics.own_training_types`, np. `"silownia,bieganie,technika"`. */
  rodzaje: string | null;
}): OcenaPracyWlasnej {
  if (args.zwrot.rodzaj !== 'jest') {
    return { rodzaj: 'nie_wiemy', powod: args.zwrot.powod };
  }
  if (typeof args.rodzaje !== 'string' || args.rodzaje.trim().length === 0) {
    return { rodzaj: 'nie_wiemy', powod: 'zawodnik nie podał, co robi dodatkowo' };
  }
  const lista = args.rodzaje.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0);
  if (lista.length === 0) {
    return { rodzaj: 'nie_wiemy', powod: 'zawodnik nie podał, co robi dodatkowo' };
  }

  const trafiaja: string[] = [];
  const nieTrafiaja: string[] = [];
  const nieznaneRodzaje: string[] = [];
  const pokryte = new Set<string>();

  for (const r of lista) {
    const obszary = MAPA_PRACY_WLASNEJ[r];
    if (!obszary) { nieznaneRodzaje.push(r); continue; }
    const trafia = obszary.filter((o) => args.zwrot.rodzaj === 'jest' && args.zwrot.trafne.has(o));
    if (trafia.length > 0) { trafiaja.push(r); trafia.forEach((o) => pokryte.add(o)); } else { nieTrafiaja.push(r); }
  }

  return {
    rodzaj: 'jest',
    trafiaja,
    nieTrafiaja,
    trafneBezPokrycia: [...args.zwrot.trafne].filter((o) => !pokryte.has(o)).sort(),
    nieznaneRodzaje,
  };
}
