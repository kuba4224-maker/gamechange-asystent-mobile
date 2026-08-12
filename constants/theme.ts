// W1: 08.2026 — TEN PLIK NIE JEST JUŻ ŹRÓDŁEM TOKENÓW.
//
// Jedynym źródłem języka wizualnego appki jest od rundy WIZUAL-1 `lib/theme.ts`
// (tokeny z `claude/IDENTYFIKACJA_WIZUALNA_KONCEPCJA_08_2026.md`: ciemny motyw
// „boisko nocą", Archivo + Inter, ścięcie 12°, kolor marki #EE5342 wyłącznie
// jako działanie/tożsamość — nigdy ocena danych).
//
// Ten plik zostaje jako re-eksport, żeby 22 istniejące importy
// `from '../constants/theme'` w ekranach i komponentach nie musiały się
// zmieniać w tej samej rundzie, w której zmieniają się wartości — mniejszy
// diff, zero ryzyka pominiętego importu. Nowy kod importuje z `lib/theme`.
//
// (Historia: 28.07.2026 ten plik wprowadził pierwszy ciemny motyw — paleta
// „ciemny brąz" #0E0D0B/#1C1A17 + Barlow Condensed, wyprowadzona z
// asystent_app.html. Zastąpiona koncepcją identyfikacji 08.2026.)

export {
  colors,
  typography,
  radii,
  spacing,
  minTouchHeight,
  skew,
  theme,
} from '../lib/theme';
export type { Theme } from '../lib/theme';
export { default } from '../lib/theme';
