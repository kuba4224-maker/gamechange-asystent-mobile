# Kontrakt zachowania — ekran DZIENNIK

Spisany z `panel-dziennik` w `asystent_app.html` (migawka 2026-07-27T15:23:28Z),
PRZED kodem. Nie dotyczy go znaleziona rozbieżność produkcja/Project Knowledge.

## 1. Przełącznik typu wpisu
Toggle "Wpis poranny" / "Wpis potreningowy" (`currentEntryType`) — pokazuje jeden z
dwóch zestawów pól poniżej. Wybór resetuje się do 'morning' po każdym udanym zapisie.

## 2. Pola — wpis poranny
- Ile godzin spałeś? — liczba, 0–24, krok 0.5.
- Jakość snu (0-10 scale) — `sleep_quality`.
- Poranne zmęczenie (0-10 scale) — `morning_fatigue`.
- Nastrój / motywacja (0-10 scale) — `mood_motivation`.
- Notatka — textarea, opcjonalna, `free_note`.

## 3. Pola — wpis potreningowy
- Rodzaj sesji — select: `club_training` (Trening klubowy), `own_training` (Trening
  własny), `micro_session` (Mikro-sesja), `match` (Mecz), `other` (Inne).
- Czas trwania (minuty) — liczba 0–360, krok 5.
- Powiąż z zaplanowanym wydarzeniem (opcjonalnie) — select wypełniany wydarzeniami
  `calendar_events` gdzie `status='scheduled'` i `scheduled_date` w oknie
  [dziś-2 dni, dziś+1 dzień] (liczonym przez lokalną datę, NIE `toISOString()` — patrz
  `toLocalDateStr` w web, poprawka strefy czasowej). Domyślnie "— nie dotyczy —".
- RPE — odczuwany wysiłek (0-10 scale) — `rpe`.
- Zmęczenie po treningu (0-10 scale) — `post_fatigue`.

## 4. Sekcja bólu (wspólna dla obu typów wpisu)
- Checkbox "Boli Cię dziś coś?" — pokazuje/chowa pola poniżej.
- Lokalizacja — select `BODY_LOCATIONS` (17 opcji, ta sama lista co w Profilu).
- Strona — ukryta gdy lokalizacja ∈ `NON_LATERAL_LOCATIONS`
  (`plecy_kregoslup`, `brzuch_tulow`, `inne`).
- Intensywność (0-10 scale) — `pain_intensity`.
- Checkbox "To wyklucza mnie z treningu" — `excludes_from_training`.

## 5. Walidacja przy zapisie
Jeśli zaznaczono ból, ale `pain_intensity` nie wybrane → błąd "Zaznacz intensywność
bólu." — zapis PRZERYWANY.

## 6. Zapis — `submitDailyLog()`
1. INSERT `daily_logs`: `user_id`, `entry_type`, `session_type` (tylko dla
   post_training, inaczej `null`), `payload` (obiekt — TYLKO pola faktycznie
   wypełnione, nie wysyłamy pustych kluczy). Dla post_training z wybranym
   powiązaniem: dodatkowo `calendar_event_id` na poziomie wiersza (nie w `payload`).
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
górnym wierszu; linia detalu zależna od typu:
- poranny: `sen: Xh · jakość snu: X/10 · zmęczenie: X/10 · nastrój: X/10` (tylko
  obecne pola, złączone " · ", "—" jeśli brak żadnego).
- potreningowy: `<etykieta sesji> · X min · RPE: X/10 · zmęczenie: X/10`.
Tagi bólu pod detalem: `<lokalizacja>(L/P) — X/10 · wyklucza z treningu` (ostatni
fragment tylko jeśli `excludes_from_training`).
