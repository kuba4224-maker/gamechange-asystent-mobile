// ⭐ PAS W1 18.08.2026 — SZPACHLA ODWRÓCONA. Ten plik NIE JEST już źródłem
// tokenów; jest re-eksportem `constants/theme.ts`.
//
// DLACZEGO ODWRÓCONA. Polecenie W1, KROK 2: „wyciągnij umowę o wyglądzie
// do JEDNEGO miejsca (`constants/theme.ts`) i nazwij rzeczy tak, jak nazywa
// je makieta". Do 18.08 było odwrotnie: wartości mieszkały tutaj, a
// `constants/theme.ts` był szpachlą. Odwrócenie kosztuje ZERO zmian
// u wołających — oba wejścia oddają dokładnie te same obiekty.
//
// ⛔ NIE DOPISUJ TU ANI JEDNEJ WARTOŚCI. Kolor, rozmiar i promień, które
// stoją w dwóch plikach, rozjeżdżają się w trzecim tygodniu i nikt tego
// nie zauważy, bo nikt nie ogląda obu naraz.
//
// (Historia: 28.07.2026 pierwszy ciemny motyw w `constants/theme.ts`
// („ciemny brąz" + Barlow Condensed) → 08.2026 WIZUAL-1 przeniósł tokeny
// tutaj i wprowadził „boisko nocą" #0B0C0F + markę #EE5342 → 18.08.2026
// pas W1 przeniósł je z powrotem i zamienił motyw na JASNY, zgodny
// z makietą v3, a markę na zieleń #2E6B5E. Wszystkie trzy stany są
// nazwane w nocie pasa W1 — ⛔ żaden nie zniknął po cichu.)

export {
  colors,
  typography,
  // ⭐ PAS W2 21.08.2026 — nazwy krojów i ich zmierzona interlinia. Re-eksport
  // jest tu po to, żeby wejście `lib/theme` oddawało DOKŁADNIE to samo co
  // `constants/theme` (⛔ nie ma trzeciego miejsca z nazwą kroju).
  KROJE,
  INTERLINIA_KROJU,
  radii,
  spacing,
  minTouchHeight,
  skew,
  theme,
  wymiary,
  barwaObciazenia,
  wysokoscObciazenia,
  SKLADOWE_OBCIAZENIA,
  SUFIT_SLUPKA,
  TOR_SLUPKA_DP,
} from '../constants/theme';
export type { Theme } from '../constants/theme';
export { default } from '../constants/theme';
