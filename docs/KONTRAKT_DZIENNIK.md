# Kontrakt zachowania — ekran DZIENNIK

Spisany z `panel-dziennik` w `asystent_app.html` (migawka 2026-07-27T15:23:28Z),
PRZED kodem. Nie dotyczy go znaleziona rozbieżność produkcja/Project Knowledge.

**AKTUALIZACJA 06.08.2026** (na prośbę Kuby, patrz `PLAN_DZIENNIK_ENERGIA_KOLORY_SEN_05_08_2026.md`
w pamięci projektu): trzy zmiany opisane w sekcjach 2 i 8 niżej — zakres godzin snu zawężony,
"poranne zmęczenie" zamienione na "poranny poziom energii" (wariant "bateria"), i kolorowanie
wszystkich suwaków wg wartości. Reszta kontraktu (przełącznik, walidacja, zapis, historia) bez
zmian funkcjonalnych.

## 1. Przełącznik typu wpisu
Toggle "Wpis poranny" / "Wpis potreningowy" (`currentEntryType`) — pokazuje jeden z
dwóch zestawów pól poniżej. Wybór resetuje się do 'morning' po każdym udanym zapisie.

## 2. Pola — wpis poranny
- Ile godzin spałeś? — suwak (ScalePicker), **0–12h, krok 0.5** (zawężone z 0–24h
  06.08.2026 — realistyczny zakres, bez utraty precyzji; `sleep_hours` w bazie nie ma węższego
  CHECK niż 0-24, więc zawężenie mieści się w istniejącym ograniczeniu). Kolor toru: progi
  dopasowane do progu silnika rekomendacji (sen<6h czerwony, 6-7h pomarańczowy, ≥7h zielony).
- Jakość snu (0-10 scale) — `sleep_quality`. Kolor toru: gradient czerwony→pomarańczowy→
  żółty→zielony (im wyżej tym lepiej).
- **Poranny poziom energii** (0-10 scale, UI) — zastąpiło "Poranne zmęczenie" 06.08.2026.
  Pokazywane jako wariant "bateria" (grafika baterii wypełniana kolorem gradientu +
  krótki opis słowny pod wartością, np. "Dobry poziom energii"). **Kierunek w UI jest
  odwrócony względem tego, co trafia do bazy**: appka pokazuje/zbiera 0=bardzo niski,
  10=pełnia energii (spójnie z resztą suwaków), ale TUŻ PRZED zapisem przelicza
  `payload.morning_fatigue = 10 - poziomEnergii` — kolumna w bazie i
  `api/generate-recommendation.js` (drugie repo, `gamechange-app`) nie widzą żadnej zmiany,
  nadal czytają `morning_fatigue` z semantyką "wyżej = bardziej zmęczony". Historia wpisów
  (sekcja 7) przelicza to z powrotem na energię przy WYŚWIETLANIU, żeby ekran mówił jednym
  językiem.
- Nastrój / motywacja (0-10 scale) — `mood_motivation`. Kolor toru: ten sam gradient co
  jakość snu/energia.
- Notatka — textarea, opcjonalna, `free_note`.

## 3. Pola — wpis potreningowy
- Rodzaj sesji — select: `club_training` (Trening klubowy), `own_training` (Trening
  własny), `micro_session` (Mikro-sesja), `match` (Mecz), `other` (Inne).
- Czas trwania (minuty) — liczba 0–360, krok 5.
- Powiąż z zaplanowanym wydarzeniem (opcjonalnie) — select wypełniany wydarzeniami
  `calendar_events` gdzie `status='scheduled'` i `scheduled_date` w oknie
  [dziś-2 dni, dziś+1 dzień] (liczonym przez lokalną datę, NIE `toISOString()` — patrz
  `toLocalDateStr` w web, poprawka strefy czasowej). Domyślnie "— nie dotyczy —".
- RPE — odczuwany wysiłek (0-10 scale) — `rpe`. Kolor toru: **neutralny** (intensywność
  koloru marki, nie czerwony/zielony) — wysoki wysiłek nie jest z definicji "zły".
- Zmęczenie po treningu (0-10 scale) — `post_fatigue`. Kolor toru: neutralny, jak RPE.
  (Ta wartość, w odróżnieniu od porannego zmęczenia, NIE została przemianowana ani
  odwrócona — pozostaje "im wyżej tym bardziej zmęczony", bo to normalny, oczekiwany
  stan po treningu, nie wskaźnik gotowości.)

## 4. Sekcja bólu (wspólna dla obu typów wpisu)
- Checkbox "Boli Cię dziś coś?" — pokazuje/chowa pola poniżej.
- Lokalizacja — select `BODY_LOCATIONS` (17 opcji, ta sama lista co w Profilu).
- Strona — ukryta gdy lokalizacja ∈ `NON_LATERAL_LOCATIONS`
  (`plecy_kregoslup`, `brzuch_tulow`, `inne`).
- Intensywność (0-10 scale) — `pain_intensity`. Kolor toru: gradient odwrócony
  (im wyżej tym gorzej) — zielony→żółty→pomarańczowy→czerwony.
- Checkbox "To wyklucza mnie z treningu" — `excludes_from_training`.

## 5. Walidacja przy zapisie
Jeśli zaznaczono ból, ale `pain_intensity` nie wybrane → błąd "Zaznacz intensywność
bólu." — zapis PRZERYWANY.

## 6. Zapis — `submitDailyLog()`
1. INSERT `daily_logs`: `user_id`, `entry_type`, `session_type` (tylko dla
   post_training, inaczej `null`), `payload` (obiekt — TYLKO pola faktycznie
   wypełnione, nie wysyłamy pustych kluczy). Dla post_training z wybranym
   powiązaniem: dodatkowo `calendar_event_id` na poziomie wiersza (nie w `payload`).
   **Poranny poziom energii zapisuje się jako `payload.morning_fatigue = 10 - energia`**
   (patrz sekcja 2) — jedyne pole z konwersją przy zapisie, reszta 1:1.
2. Jeśli był ból: INSERT `pain_entries` z `daily_log_id` (z wiersza zwróconego w
   kroku 1), `user_id`, `body_location`, `side` (null jeśli non-lateral),
   `intensity`, `excludes_from_training`.
   - Błąd TYLKO tego kroku → komunikat: "Wpis zapisany, ale wpis bólowy się nie
     udał: " + treść błędu (odróżnia się od błędu całego zapisu).
3. Sukces → "Zapisano.", reset formularza (wszystkie pola, w tym skale i checkbox
   bólu wracają do stanu początkowego), przeładowanie historii.

## 7. Historia wpisów
Ostatnie 20 `daily_logs` (malejąco po `created_at`) z dołączonymi `pain_entries`.
Każda karta: etykieta typu ("Poranny"/"Potreningowy") + data (`DD miesiąc, GG:MM`) w
górnym wierszu; linia detalu zależna od typu, **od 06.08.2026 renderowana jako osobno
kolorowane fragmenty** (te same funkcje koloru co formularz), nie jeden szary string:
- poranny: `sen: Xh · jakość snu: X/10 · energia: X/10 · nastrój: X/10` (tylko
  obecne pola, złączone " · ", "—" jeśli brak żadnego). `energia` to `10 -
  payload.morning_fatigue` przeliczone na wyświetlanie — baza dalej trzyma
  `morning_fatigue`, patrz sekcja 2.
- potreningowy: `<etykieta sesji> · X min · RPE: X/10 · zmęczenie: X/10`.
Tagi bólu pod detalem: `<lokalizacja>(L/P) — X/10 · wyklucza z treningu` (ostatni
fragment tylko jeśli `excludes_from_training`), kolorowane odwróconym gradientem
(im wyżej tym bardziej czerwone).

## 8. Kolorowanie suwaków — `lib/scale-colors.ts`
Cztery funkcje, każdy suwak w tym ekranie używa dokładnie jednej (patrz przypisanie
w sekcjach 2-4 wyżej):
- `higherIsBetterColor(v)` — gradient czerwony→pomarańczowy→żółty→zielony (ciągły,
  nie skokowe progi — przesunięcie o 1 punkt blisko granicy nie "przeskakuje" kolorem).
- `higherIsWorseColor(v)` — ten sam gradient, odwrócony kierunek.
- `sleepHoursColor(h)` — progi (nie gradient), zsynchronizowane z progiem 7h silnika
  rekomendacji.
- `neutralIntensityColor(v)` — sam kolor marki, rosnąca nieprzezroczystość; świadomie
  bez oceny dobry/zły.

`ScalePicker` przyjmuje to jako opcjonalny prop `colorForValue` — bez niego, dokładnie
stare, jednolite zachowanie (kolor marki). `variant="battery"` (używane tylko dla
porannego poziomu energii) zamienia cienki pasek na grafikę baterii, ale suwak pod
spodem to nadal ten sam `@react-native-community/slider` — mechanika dotyku/przeciągania
nietknięta.
