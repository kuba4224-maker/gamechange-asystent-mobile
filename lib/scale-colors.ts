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
//   ⛔ PAS B1 21.08.2026: BYŁO czerwony→pomarańczowy→żółty→zielony, JEST
//   złoto→zieleń. Czerwień zdjęta (Z2) — patrz blok przy `STOPY_*` niżej.
// - higherIsWorseColor — intensywność bólu: ⛔ PAS B1: WŁASNA lista przystanków,
//   nie odwrócona kopia tamtej. Czerwień na górze ZOSTAJE (Z2 na to pozwala).
// - sleepHoursColor — progi, NIE gradient ciągły, dopasowane do progu już używanego
//   przez silnik rekomendacji (`api/generate-recommendation.js`, sen < 7h przez 2
//   noce): <6h czerwony, 6-7h pomarańczowy, ≥7h zielony.
// - neutralIntensityColor — RPE i zmęczenie potreningowe (i `match_rpe` w Meczu):
//   ŚWIADOMIE bez oceny dobry/zły (wysoki wysiłek treningowy nie jest z definicji
//   "zły", często jest celem) — sam kolor marki, rosnąca intensywność zamiast
//   zmiany barwy. Otwarte pytanie z planu (czy wysokie RPE+zmęczenie razem powinny
//   się czerwienić jako ostrzeżenie przed przetrenowaniem) pozostaje nierozstrzygnięte
//   — ta funkcja realizuje na razie ustalony, neutralny wariant domyślny.
// ⚠️ PAS B1 21.08.2026 — AKAPIT NIŻEJ OPISUJE STAN SPRZED TEJ ZMIANY i zostaje
// jako zapis historii (B3: nic nie znika bez wiersza). `error` NIE JEST już
// przystankiem skali „im wyżej tym lepiej" ani progiem godzin snu.
// W1: 08.2026 — wartości czterech barw gradientu przestroiły się razem
// z tokenami (lib/theme.ts, koncepcja identyfikacji 08.2026): error=#DE3D5B
// (karmazyn, NIE koral marki), warning=#F2933D, caution=#E8C33F,
// success=#3DC97E; neutralIntensityColor używa nowego brand=#EE5342.
// Sygnatury czterech funkcji i WSZYSTKIE progi (w tym sen 7h,
// zsynchronizowany z silnikiem rekomendacji) — bez zmian.
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

// ═══════════════════════════════════════════════════════════════════
// ⛔⛔ PAS B1 21.08.2026 — CZERWIEŃ SCHODZI ZE SNU, ENERGII I NASTROJU (Z2)
// ═══════════════════════════════════════════════════════════════════
//
// CO BYŁO ZEPSUTE. Jedna lista przystanków (`GRADIENT_STOPS`) obsługiwała
// OBIE skale: „im wyżej tym lepiej" i „im wyżej tym gorzej". Skutek: niska
// jakość snu, niski poziom energii i niski nastrój dostawały `colors.error` —
// TĘ SAMĄ CZERWIEŃ CO BÓL.
//
// ⛔ REGUŁA Z2: czerwień jest zarezerwowana dla bólu i stanu ochronnego.
// Znalezisko pasa Z1 (21.08.2026): `grep` = ZERO strażników na to.
//
// DLACZEGO TO NIE JEST KOSMETYKA. Zawodnik, który źle spał, dostawał ten sam
// sygnał co zawodnik, który zgłosił ból. ⛔ Czerwień, która znaczy pięć różnych
// rzeczy, przestaje znaczyć cokolwiek — a wtedy przestaje działać wtedy, kiedy
// jest naprawdę potrzebna.
//
// ⭐ CO STOI W TYM MIEJSCU: DWIE OSOBNE LISTY PRZYSTANKÓW.
//   • `STOPY_IM_WYZEJ_TYM_LEPIEJ` — złoto (`caution`, w tej palecie
//     „ostrzeżenie MIĘKKIE") → zieleń marki (`success`). ⛔ Bez `colors.error`.
//     Skala jest nadal MONOTONICZNA i nadal mówi „mało" i „dużo" — zmienia się
//     wyłącznie to, że „mało snu" przestaje udawać ostrzeżenie o ciele.
//   • `STOPY_IM_WYZEJ_TYM_GORZEJ` — ta sama zieleń na dole, `colors.error`
//     NA GÓRZE. ⛔ CZERWIEŃ PRZY BÓLU ZOSTAJE: tam jest na miejscu i to jest
//     jedyne miejsce, w którym ten plik ma prawo jej użyć.
//
// ⚠️ CO Z TEGO WYNIKA I CO NALEŻY DO KUBY. Sygnał „spałeś mniej niż 6 godzin"
// jest dziś SŁABSZY KOLORYSTYCZNIE niż przed tą zmianą. ⛔ Nie jest słabszy
// TREŚCIOWO: liczbę godzin niesie napis obok barwy (K4), a mocne zdanie
// o niedoborze snu należy do warstwy brzmień, nie do palety. Wypisane imiennie
// w nocie pasa B1 jako pozycja do przejrzenia.
//
// ⭐ K4 — DRUGI NOŚNIK. Żadna z tych funkcji NIE JEST jedynym nośnikiem swojej
// informacji: każde wywołanie w produkcie stoi przy liczbie (`ScalePicker`
// pokazuje wartość wielką cyfrą i wypełnieniem toru, `app/(tabs)/dziennik.tsx`
// pisze `„jakość snu: 8/10"`). Jeden na dwunastu chłopców nie rozróżnia części
// barw i ma czytać dokładnie to samo. ⛔ Pilnuje tego strażnik
// `lib/bolCzerwienIKafel.selftest.ts`, bo bez asercji jest to obietnica, nie fakt.
const STOPY_IM_WYZEJ_TYM_LEPIEJ = [colors.caution, colors.success];
const STOPY_IM_WYZEJ_TYM_GORZEJ = [colors.success, colors.caution, colors.warning, colors.error];

function colorOnGradient(ratio: number, stops: string[]): string {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const segments = stops.length - 1;
  const scaled = clamped * segments;
  const index = Math.min(Math.floor(scaled), segments - 1);
  const localT = scaled - index;
  return mixHex(stops[index], stops[index + 1], localT);
}

/**
 * Sen (jakość) / poranny poziom energii / nastrój-motywacja — im wyżej tym lepiej.
 * ⛔ PAS B1 21.08.2026 — BEZ `colors.error` (Z2). Czerwień jest zarezerwowana
 * dla bólu i stanu ochronnego; zła noc nie jest ani jednym, ani drugim.
 */
export function higherIsBetterColor(value: number, min = 0, max = 10): string {
  return colorOnGradient((value - min) / (max - min), STOPY_IM_WYZEJ_TYM_LEPIEJ);
}

/**
 * Intensywność bólu — im wyżej tym gorzej.
 * ⛔ PAS B1 21.08.2026 — TU CZERWIEŃ ZOSTAJE i to jest cała różnica wobec
 * funkcji wyżej. `colors.error` na górze skali bólu jest zgodne z Z2: to jest
 * jedno z dwóch miejsc w produkcie, w których czerwień coś znaczy.
 * ⛔ Lista przystanków jest WŁASNA, nie odwróconą kopią tamtej — odwracanie
 * wspólnej listy było mechanizmem, który wpuścił czerwień na sen.
 */
export function higherIsWorseColor(value: number, min = 0, max = 10): string {
  return colorOnGradient((value - min) / (max - min), STOPY_IM_WYZEJ_TYM_GORZEJ);
}

/**
 * Godziny snu — progi dopasowane do `sleepFlag` w api/generate-recommendation.js.
 * Zakres suwaka to dziś 0-12h (zmiana 06.08.2026), próg pozostaje ten sam (7h).
 */
export function sleepHoursColor(hours: number): string {
  // ⛔ PAS B1 21.08.2026 — `colors.error` ZDJĘTE (Z2). Godziny snu to skala
  // „im wyżej tym lepiej" tak samo jak jakość snu, więc chodzi po TEJ SAMEJ
  // drabinie barw. ⭐ TRZY POZIOMY ZOSTAJĄ i nadal się od siebie różnią:
  // dół drabiny, środek, góra. ⛔ Próg 7h — bez zmian, nadal zsynchronizowany
  // z `sleepFlag` w `api/generate-recommendation.js`.
  if (hours < 6) return higherIsBetterColor(0);
  if (hours < 7) return higherIsBetterColor(5);
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
