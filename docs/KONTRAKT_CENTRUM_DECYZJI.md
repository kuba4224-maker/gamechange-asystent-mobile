# Kontrakt zachowania — ekran CENTRUM DECYZJI

Spisany z `panel-centrum` w `asystent_app.html` (migawka 2026-07-27T15:23:28Z,
zweryfikowana ponownie fresh w tej sesji przed napisaniem tego kontraktu — bez
zmian od poprzedniego odczytu), PRZED kodem. Najbardziej złożony ekran,
robiony na końcu zgodnie z planem.

**⚠️ UWAGA O ROZBIEŻNOŚCI PRODUKCJA/PROJECT KNOWLEDGE (ustalona wcześniej w
tej sesji, `claude/BACKUP_asystent_app_html_2026-07-27_przed_migracja_mobilna.md`):**
DWA elementy tego ekranu nie były potwierdzone jako obecne na produkcji/
GitHub main w chwili audytu:
1. Endpoint `/api/submit-recommendation-feedback` (plik
   `claude/api_submit_recommendation_feedback.js` istnieje w Project
   Knowledge, logika eskalacji po serii odrzuceń) — `submitFeedback()` w web
   woła ten endpoint zamiast bezpośredniego PATCH-a na Supabase.
2. Etykieta "Co teraz:" przed treścią rekomendacji `training_focus`.

Jeśli po ściągnięciu repo okaże się, że produkcja tego nie ma (np. endpoint
zwraca 404, albo etykieta nie występuje na deployu) — to znana, już wcześniej
zgłoszona rozbieżność, nie błąd tej migracji. Wdrożone tu 1:1 zgodnie z
Project Knowledge.

**⚠️ DODATKOWA NIEPEWNOŚĆ SWOISTA DLA MIGRACJI MOBILNEJ (nowa, nie z audytu
web):** web woła `fetch('/api/submit-recommendation-feedback', ...)` —
ścieżka WZGLĘDNA, rozwiązywana względem originu strony (czyli
`gamechange-app.vercel.app`), bo formularz i endpoint API żyją na tej samej
domenie Vercel. Aplikacja natywna NIE MA "tego samego originu" — musi wołać
pełny, bezwzględny URL. Przyjęto tu założenie
`https://gamechange-app.vercel.app/api/submit-recommendation-feedback` (ta
sama domena produkcyjna, do której odwołuje się reszta tego repo/Project
Knowledge) — **do potwierdzenia przez Kubę**, że to poprawna, aktualna domena
produkcyjna tego konkretnego endpointu, zanim funkcja eskalacji feedbacku
będzie testowana na żywo. Stała `RECOMMENDATION_FEEDBACK_API_URL` na górze
pliku — jedno miejsce do poprawki, jeśli domena jest inna.

## 1. Trzy typy rekomendacji — `decision_recommendations.recommendation_type`
- `training_focus` — główna, cykliczna rekomendacja tygodnia.
- `specialist_referral` — skierowanie do specjalisty (np. wzorzec bólu).
- `position_fit_signal` (Domena 13) — sygnał dopasowania pozycji, INNY zestaw
  dozwolonych wartości feedbacku niż pozostałe dwa typy (patrz sekcja 5).

Treść (`weekly_focus_text`/`recommendation_text`/`rationale_text`) generuje
WYŁĄCZNIE backend (AI) — ten ekran tylko czyta i zbiera feedback, NIGDY nie
tworzy ani nie edytuje treści rekomendacji.

## 2. Wczytywanie — `loadRecommendations()`
Pobiera WSZYSTKIE `decision_recommendations` zawodnika, malejąco po
`created_at`. Z tej jednej listy wyprowadzane są trzy sekcje:
- **Priorytet tygodnia** = najnowszy wiersz typu `training_focus` (pierwszy po
  sortowaniu) — tylko jeden, nie lista.
- **Warto sprawdzić** = wiersze typu `specialist_referral` LUB
  `position_fit_signal`, gdzie `feedback_response IS NULL` (jeszcze bez
  odpowiedzi) — może być wiele naraz.
- **Historia** = wszystko pozostałe (wszystkie wiersze MINUS ten jeden
  priorytet tygodnia MINUS wszystkie z "Warto sprawdzić").

Puste stany: "Brak jeszcze wygenerowanej rekomendacji — pojawi się tu, gdy
silnik Centrum Decyzji zacznie działać." / "Nic do sprawdzenia w tej
chwili." / "Brak historii." (historia w zwijanej sekcji).

## 3. Karta rekomendacji — `renderRecCard`
- **Badge tonu:** jeśli `confidence_tone === 'questioning'` → "ton pytający".
- **Treść wg typu:**
  - `specialist_referral`: linia z etykietą powodu (`REFERRAL_REASON_LABELS`:
    `pain_pattern_match`→"Wzorzec bólu", `feedback_escalation`→"Powtarzające
    się odrzucenia", `other`→"Inne", fallback surowa wartość) + akcja =
    `recommendation_text`.
  - `position_fit_signal`: linia "Sugerowana pozycja: <suggested_position>" +
    akcja = `recommendation_text`.
  - `training_focus`: jeśli jest `weekly_focus_text` → pokazany jako
    nagłówek karty + badge tonu obok; akcja = **"Co teraz:"** (pogrubione) +
    `recommendation_text`. Jeśli `weekly_focus_text` BRAK, badge tonu
    pokazuje się osobno przed akcją zamiast obok nagłówka.
- `rationale_text` — jeśli podane, mniejszym, przytłumionym tekstem pod
  akcją.
- **Link do specjalisty:** jeśli `suggested_specialist_category` ustawione
  (niezależnie od typu rekomendacji — warunek szerszy niż tylko
  `specialist_referral`, żeby automatycznie objąć przyszłe typy) → link
  `${MARKETPLACE_BASE_URL}/specialist_list.html?category=<kategoria>`
  (`MARKETPLACE_BASE_URL = 'https://gamechange-marketplace.vercel.app'`),
  etykieta "Znajdź specjalistę: <etykieta kategorii> →".
  `SPECIALIST_CATEGORY_LABELS` — 6 kategorii: `strength_conditioning`
  ("Trener przygotowania motorycznego"), `physiotherapy` ("Fizjoterapeuta"),
  `orthopedics` ("Ortopeda"), `nutrition` ("Dietetyk sportowy"),
  `technical_tactical` ("Trener Techniczno-Taktyczny"), `sports_psychology`
  ("Psycholog sportowy"). Otwierany jako link zewnętrzny (`Linking.openURL`),
  tak jak w web (`target="_blank"`).
- **Data** — `DD miesiąc` (pl-PL).

## 4. Blok feedbacku na karcie
- Jeśli `feedback_response` JUŻ ustawione: "Twoja odpowiedź: <etykieta>" +
  (` — „<feedback_comment>”` jeśli podany komentarz). Żadnych przycisków.
- W przeciwnym razie, dwa warianty:
  - **`position_fit_signal`:** przyciski "Chętnie porozmawiam"
    (`open_to_discussing`), "Nie jestem zainteresowany" (`not_interested`),
    "Nie miało to sensu" (pokazuje pole komentarza + przycisk "Wyślij" →
    `did_not_make_sense` z opcjonalnym komentarzem).
  - **`training_focus` / `specialist_referral`:** przyciski "Wykonałem"
    (`done`), "Nie wykonałem" (`not_done`), "Nie miało to sensu" (jak wyżej,
    → `did_not_make_sense`).

## 5. `FEEDBACK_LABELS`
`done`→"Wykonałem", `not_done`→"Nie wykonałem", `did_not_make_sense`→"Nie
miało to sensu", `open_to_discussing`→"Chętnie porozmawiam",
`not_interested`→"Nie jestem zainteresowany". **Uwaga:** baza ma CHECK
(`chk_feedback_response_matches_type`, Domena 13) wymuszający, że
`position_fit_signal` przyjmuje TYLKO `open_to_discussing`/`not_interested`/
`did_not_make_sense` — nigdy `done`/`not_done`. Stąd osobna gałąź przycisków
w sekcji 4 (błędna gałąź wysłałaby wartość odrzuconą przez bazę, 400).

## 6. `submitFeedback(recId, response, comment?)`
POST na `RECOMMENDATION_FEEDBACK_API_URL` (patrz uwaga na górze pliku o
bezwzględnym URL), body `{ userId, recommendationId, response, comment }`
(comment pominięty jeśli pusty). Backend dodatkowo liczy serię odrzuceń
("nie miało to sensu") i przy 3+ z rzędu automatycznie generuje nową
rekomendację `specialist_referral` (eskalacja) — logika WYŁĄCZNIE po stronie
backendu, ekran tylko odczytuje wynik.

Odpowiedź sukcesu:
- `data.escalation.fired === true` → komunikat: "Zapisano Twoją odpowiedź.
  Widzimy, że kilka razy z rzędu ta sugestia nie trafiała — przygotowaliśmy
  nową rekomendację, sprawdź listę poniżej."
- w przeciwnym razie → "Zapisano Twoją odpowiedź."

Błąd → baner "Nie udało się zapisać odpowiedzi: " + treść błędu (z
`data.error` jeśli backend go zwrócił, inaczej `HTTP <status>`).

Sukces → przeładowanie `loadRecommendations()`.
