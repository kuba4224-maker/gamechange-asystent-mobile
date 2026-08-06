// Kolorowanie suwaków 0-10 (i 0-12 dla snu) w Dzienniku — na prośbę Kuby (05-06.08.2026):
// "poziom energii 0-2 mógłby być czerwony, 3-4 pomarańczowy, 5-6 żółty, 7+ zielony (...)
// do przeanalizowania każdy suwak i do nadania kolorów". Zaimplementowane jako CIĄGŁY
// gradient przez te same cztery barwy (nie skokowe progi) — płynne przejście, żeby
// przesunięcie suwaka o 1 punkt blisko granicy (np. 6→7) nie "przeskakiwało" kolorem
// z jednego skrajnego odcienia na drugi. Cztery barwy odpowiadają dokładnie słowom
// Kuby: czerwony=error, pomarańczowy=warning, żółty=caution (nowy token 06.08.2026,
// patrz theme.ts), zielony=success.
//
// Cztery tryby, dobrane per pole (patrz PLAN_DZIENNIK_ENERGIA_KOLORY_SEN_05_08_2026.md
// w pamięci projektu dla pełnego uzasadnienia per-pole):
// - higherIsBetterColor — jakość snu, poranny poziom energii, nastrój/motywacja:
//   czerwony→pomarańczowy→żółty→zielony w miarę wzrostu wartości.
// - higherIsWorseColor — intensywność bólu: ten sam gradient, odwrócony kierunek
//   (im wyżej tym gorzej).
// - sleepHoursColor — progi, NIE gradient ciągły, dopasowane do progu już używanego
//   przez silnik rekomendacji (`api/generate-recommendation.js`, sen < 7h przez 2
//   noce): <6h czerwony, 6-7h pomarańczowy, ≥7h zielony.
// - neutralIntensityColor — RPE i zmęczenie potreningowe (i `match_rpe` w Meczu):
//   ŚWIADOMIE bez oceny dobry/zły (wysoki wysiłek treningowy nie jest z definicji
//   "zły", często jest celem) — sam kolor marki, rosnąca intensywność zamiast
//   zmiany barwy. Otwarte pytanie z planu (czy wysokie RPE+zmęczenie razem powinny
//   się czerwienić jako ostrzeżenie przed przetrenowaniem) pozostaje nierozstrzygnięte
//   — ta funkcja realizuje na razie ustalony, neutralny wariant domyślny.
import { colors } from '../constants/theme';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function mixHex(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

const GRADIENT_STOPS = [colors.error, colors.warning, colors.caution, colors.success];

function colorOnGradient(ratio: number, stops: string[]): string {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const segments = stops.length - 1;
  const scaled = clamped * segments;
  const index = Math.min(Math.floor(scaled), segments - 1);
  const localT = scaled - index;
  return mixHex(stops[index], stops[index + 1], localT);
}

/** Sen (jakość) / poranny poziom energii / nastrój-motywacja — im wyżej tym lepiej. */
export function higherIsBetterColor(value: number, min = 0, max = 10): string {
  return colorOnGradient((value - min) / (max - min), GRADIENT_STOPS);
}

/** Intensywność bólu — im wyżej tym gorzej, ten sam gradient odwrócony. */
export function higherIsWorseColor(value: number, min = 0, max = 10): string {
  return colorOnGradient((value - min) / (max - min), [...GRADIENT_STOPS].reverse());
}

/**
 * Godziny snu — progi dopasowane do `sleepFlag` w api/generate-recommendation.js.
 * Zakres suwaka to dziś 0-12h (zmiana 06.08.2026), próg pozostaje ten sam (7h).
 */
export function sleepHoursColor(hours: number): string {
  if (hours < 6) return colors.error;
  if (hours < 7) return colors.warning;
  return colors.success;
}

/**
 * RPE / zmęczenie potreningowe / match_rpe — neutralna intensywność koloru marki,
 * bez oceny dobry/zły.
 */
export function neutralIntensityColor(value: number, min = 0, max = 10): string {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const [r, g, b] = hexToRgb(colors.brand);
  const alpha = 0.35 + ratio * 0.65;
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}
