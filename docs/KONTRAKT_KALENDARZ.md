# Kontrakt zachowania — ekran KALENDARZ

Spisany z `panel-kalendarz` w `asystent_app.html` (migawka 2026-07-27T15:23:28Z,
zweryfikowana ponownie fresh w tej sesji przed napisaniem tego kontraktu — bez
zmian od poprzedniego odczytu), PRZED kodem.

**⚠️ UWAGA O ROZBIEŻNOŚCI PRODUKCJA/PROJECT KNOWLEDGE (ustalona wcześniej w tej
sesji, `claude/BACKUP_asystent_app_html_2026-07-27_przed_migracja_mobilna.md`):**
cała funkcja "Sugerowane na ten tydzień" (sekcja 5 niżej —
`computeCalendarSuggestion`/`renderCalendarSuggestion`/`acceptCalendarSuggestion`)
jest opisana w Project Knowledge i JEST tu wdrożona 1:1, ale NIE była
potwierdzona jako obecna na produkcji (`gamechange-app.vercel.app`) ani w
GitHub main w chwili tamtej weryfikacji. Jeśli po ściągnięciu repo na Twoją
maszynę okaże się, że produkcja jej nie ma — to jest znana, już wcześniej
zgłoszona rozbieżność, nie błąd tej migracji.

## AKTUALIZACJA 28.07.2026 — `match` dodany do `EVENT_TYPE_LABELS` (mobile-only)

Sekcja 1 niżej to niezmieniony zapis kontraktu spisanego 27.07.2026 z
`asystent_app.html` — mówi, że `EVENT_TYPE_LABELS` CELOWO nie zawiera `match`.
To nadal jest prawdą dla web/`asystent_app.html` (kontrakt zostaje wierny
web 1:1, nie poprawiamy go wstecznie pod mobile). Natomiast w repo mobilnym
(`gamechange-asystent-mobile`, `app/(tabs)/kalendarz.tsx`) 28.07.2026 świadomie
DODANO piąty typ — `match` (Mecz) — jako udokumentowane ROZSZERZENIE mobilne,
nie odtworzenie web. Powód: rytm powiadomień push `pre_match` (Krok 4,
`cron-send-notifications.js`) wymaga istnienia wydarzenia
`calendar_events.event_type='match'` w przyszłości, a przed tą zmianą żaden
ekran nie dawał zawodnikowi sposobu na jego utworzenie — patrz
`KROK_4_PUSH_POWIADOMIENIA.md`, sekcja "AKTUALIZACJA 28.07.2026".

Rozróżnienie bez zmian, nadal obowiązuje: `match` w Kalendarzu = wyłącznie
ZAPLANOWANIE nadchodzącego meczu (tytuł/data/notatka jak każde inne
wydarzenie) — to coś innego niż zakładka Mecz, gdzie zawodnik loguje WYNIK
już rozegranego meczu (osobna tabela `match_contexts`). Te dwie rzeczy się
nie mieszają.

## 1. Rodzaje wydarzeń — `EVENT_TYPE_LABELS`
`club_training` (Trening klubowy), `own_training` (Trening własny),
`micro_session` (Mikro-sesja), `task` (Zadanie). **Uwaga:** to CELOWO inna
lista niż `session_type` w Dzienniku (tam dodatkowo `match`/`other`, tu ich
nie ma) — dwa osobne wymiary danych, nie duplikat do ujednolicenia.

**[MOBILE] patrz "AKTUALIZACJA 28.07.2026" na górze pliku** — powyższe 4 typy
to wierny zapis web; repo mobilne ma piąty typ (`match`), celowo, jako
udokumentowane rozszerzenie.

## 2. Formularz nowego wydarzenia
- Rodzaj — select jak wyżej (domyślnie pierwszy: `club_training`).
- Tytuł — wymagany.
- Notatka — textarea, opcjonalna.
- Przełącznik częstotliwości: "Jednorazowe" / "Cykliczne" (`currentEventFrequency`).
  - Jednorazowe → pole Data (wymagane).
  - Cykliczne → checkboxy dni tygodnia `DAYS_OF_WEEK` (Pon–Nd), przynajmniej
    jeden wymagany.
- Powiąż z celem (opcjonalnie) — select z aktywnymi celami (`status==='active'`
  z `goalsCache`), etykieta = nazwa segmentu + (` — <refinement_note>` jeśli
  istnieje). Domyślnie "— nie dotyczy —".

**Uwaga o wierności (nowy element, nie w oryginalnym HTML-forms):** web używa
natywnego `<input type="date">` przeglądarki. RN nie ma wbudowanego
odpowiednika — implementacja używa `@react-native-community/datetimepicker`
(natywny picker daty iOS/Android) za przyciskiem pokazującym wybraną datę lub
placeholder "Wybierz datę". Funkcjonalnie równoważne (jedna wybrana data,
zapisywana tym samym `toLocalDateStr`), inny komponent UI — ten sam wzorzec
uzupełniania luk co `@react-native-picker/picker`/`expo-checkbox` wcześniej w
tej migracji. Nowa zależność do dodania w `package.json`.

## 3. Walidacja przy zapisie
- Brak tytułu → "Podaj tytuł wydarzenia." — przerwij.
- Jednorazowe bez daty → "Podaj datę." — przerwij.
- Cykliczne bez zaznaczonego dnia → "Zaznacz przynajmniej jeden dzień
  tygodnia." — przerwij.

## 4. Zapis — `createCalendarEvent()`
INSERT `calendar_events`: `user_id`, `event_type`, `source: 'player'`, `title`,
`status: 'scheduled'`, `notes` (jeśli podane), `goal_id` (jeśli wybrany).
**`chk_recurrence_xor_date`:** dokładnie jedno z dwóch, NIGDY oba naraz:
- tryb jednorazowy → `scheduled_date` (data z pickera, `toLocalDateStr`).
- tryb cykliczny → `recurrence_rule = 'weekly:' + <zaznaczone dni złączone przecinkiem>`.

Sukces → "Dodano do kalendarza.", reset formularza, przeładowanie list +
selektora celu (odświeżenie `goalsCache`).

(Web ma tu historyczny komentarz o tym, że funkcja nie może nazywać się
`createEvent` z powodu kolizji z `document.createEvent()` w inline
`onclick=""` — to ograniczenie czysto przeglądarkowe/DOM-owe, nie dotyczy RN;
nazwa funkcji w implementacji natywnej jest dowolna.)

## 5. Sugestia Kalendarza — "Sugerowane na ten tydzień" ⚠️ patrz nagłówek pliku
Pokazywana nad formularzem, TYLKO gdy `computeCalendarSuggestion()` zwraca
wynik:
1. Wymaga aktywnego celu priorytetowego (`goalsCache.find(is_priority &&
   active)`) — brak → brak sugestii.
2. `SUGGESTED_ACTIVITY_BY_SEGMENT` — mapa 13 segmentów → opis aktywności
   (do przeniesienia 1:1, treść w segmencie kodu web, nie zgadywana).
   Brak wpisu dla segmentu celu → brak sugestii.
3. Dni bieżącego tygodnia (Pon–Nd, `getCurrentWeekDayList()`) przefiltrowane
   do `dateStr >= dzisiaj` (`toLocalDateStr`, nie `toISOString()`). Pusta
   lista → brak sugestii.
4. "Zajęty" dzień = istnieje jednorazowe wydarzenie (`status='scheduled'`)
   zaplanowane na tę datę (`busyDates`), LUB cykliczne wydarzenie
   (`status='scheduled'`, ma `recurrence_rule`) obejmujące ten dzień tygodnia
   (`busyDayCodes`, sparsowane z `weekly:MON,WED,...`). Pierwszy wolny dzień
   z listy z kroku 3 → `freeDay`. Brak wolnego dnia → brak sugestii.
5. "Już zaplanowane" — jeśli istnieje JAKIEKOLWIEK zaplanowane wydarzenie typu
   `micro_session` powiązane z tym samym celem (`goal_id === activeGoal.id`) —
   czy to z datą, czy cykliczne — sugestia się nie pokazuje (unika
   powtarzania się). W praktyce: każde zaplanowane `micro_session` powiązane
   z celem = "już zaplanowane", niezależnie od tego czy jest w tym tygodniu
   czy nie.
6. Karta: etykieta segmentu + opis aktywności, tekst "Masz wolny <dzień> —
   dodać tam mikro-sesję powiązaną z Twoim aktywnym celem?", przycisk "Dodaj".
7. `acceptCalendarSuggestion()` → INSERT `calendar_events`: `event_type:
   'micro_session'`, `source: 'system'`, `title: 'Sugerowane: <segment>'`,
   `notes: <aktywność>`, `status: 'scheduled'`, `scheduled_date: <freeDay>`,
   `goal_id: <activeGoal.id>`. Sukces → przeładowanie list. Błąd → komunikat
   "Nie udało się dodać sugerowanej aktywności: " + treść błędu w banerze
   błędu formularza (NIE osobny baner).

## 6. Karta wydarzenia — `renderEventCard`
- Tytuł + odznaki: "Anulowane" (status='cancelled'); dla wydarzeń
  jednorazowych zaplanowanych na dziś lub wcześniej (`scheduled_date <=
  dzisiaj`, `toLocalDateStr`) — "Wykonano" (istnieje `daily_logs` z tym
  `calendar_event_id`) albo "Nie wykonano" (brak takiego wpisu). Cykliczne
  wydarzenia i przyszłe jednorazowe NIE dostają tej odznaki.
- Podtytuł: etykieta rodzaju (`EVENT_TYPE_LABELS`).
- Notatka, jeśli podana.
- Meta: data (jednorazowe, format "DD miesiąc, dzień tygodnia") LUB
  cykliczność sformatowana przez `formatRecurrence` ("Co tydzień: Pon, Śr...")
  + "cel: <segment>" jeśli powiązane — złączone " · ".
- Akcje: przycisk "Anuluj" TYLKO gdy `status==='scheduled'`.

## 7. `cancelEvent(id)`
PATCH `status: 'cancelled'` → przeładowanie list.

## 8. Wczytywanie — `loadEvents()`
1. Odświeża `goalsCache` (te same zapytanie co w Cele) i selektor celu (tylko
   aktywne).
2. Pobiera wszystkie `calendar_events` zawodnika.
3. Pobiera `daily_logs.calendar_event_id` (nie null) → `loggedEventIds` do
   liczenia "wykonano"/"nie wykonano".
4. Dzieli na trzy listy: **Cykliczne** (`scheduled` + `recurrence_rule`),
   **Nadchodzące** (`scheduled` + `scheduled_date`, sortowane rosnąco wg
   daty), **Anulowane** (`status==='cancelled'`, w zwijanej sekcji). Puste
   stany: "Brak cyklicznych wpisów." / "Brak zaplanowanych wydarzeń." / "Brak
   anulowanych wpisów."
5. Na końcu przelicza i renderuje sugestię (sekcja 5).

**Uwaga o architekturze (różnica web vs natywna, analogiczna do wcześniej
odnotowanych):** web po utworzeniu/anulowaniu wydarzenia dodatkowo odświeża
selektor "powiąż z wydarzeniem" w Dzienniku (`populateCalendarLinkSelect()`),
bo obie sekcje żyją na jednej stronie. W wersji natywnej Dziennik i Kalendarz
to osobne, niezależnie zamontowane ekrany — Dziennik już samodzielnie
pobiera swoją listę powiązań przy własnym montowaniu (patrz
`KONTRAKT_DZIENNIK.md`/`dziennik.tsx`). Nie ma potrzeby sztucznego
sprzęgania odświeżeń między ekranami; to naturalna konsekwencja podziału na
osobne pliki/ekrany ustalonego już we wcześniejszych krokach tej migracji.
