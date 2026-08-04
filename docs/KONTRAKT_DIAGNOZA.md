# Kontrakt zachowania — ekran DIAGNOZA

Spisany z `panel-diagnoza` w `asystent_app.html` (migawka 2026-07-27T15:23:28Z,
zweryfikowana ponownie fresh w tej sesji przed napisaniem tego kontraktu — bez
zmian od poprzedniego odczytu), PRZED kodem. Nie dotyczy go znaleziona
rozbieżność produkcja/Project Knowledge (ta sekcja komentarza w źródle była
akurat POPRAWKĄ pomyłki z wcześniejszej wersji komentarza, nie flagą nowej
niepewnej funkcji — most email→konto jest potwierdzony jako wdrożony).

## 1. Ten ekran NIE odtwarza ankiety diagnostycznej
Diagnoza (27 pytań, 13 obszarów) to osobne, już wdrożone narzędzie pod
`https://gamechange-diagnoza.vercel.app` — ten ekran tylko sprawdza status i
kieruje tam przez link zewnętrzny (otwierany w przeglądarce/systemowej
przeglądarce, nie w WebView wewnątrz appki — to `target="_blank"` w web,
odpowiednik natywny to `Linking.openURL`).

## 2. Trzy stany ekranu
Dokładnie jeden widoczny naraz: `loading` ("Sprawdzam status..."), `done`
(jest diagnoza), `missing` (brak diagnozy). Błąd zapytania → osobny baner
błędu, POZA tymi trzema stanami (loading chowany, ale ani done ani missing
nie są pokazywane).

## 3. Zapytanie — `loadDiagnoza()`
`diagnostics` to LOG ZDARZEŃ (wiele wierszy na jedną diagnozę:
`results_generated`/`email_submitted`/`waitlist_signup`/inne — patrz
`index.html`), NIE jeden wiersz na ukończoną diagnozę. Zapytanie MUSI
filtrować `event=eq.email_submitted` (ten sam filtr, którego `index.html` już
używa w tym samym celu) — inaczej "najnowszy wiersz" może być dowolnym
zdarzeniem, mylącym "zaczął ankietę" z "ma gotową diagnozę". Zapytanie:
`diagnostics` gdzie `user_id=eq.<id>` i `event=eq.email_submitted`, sortowane
malejąco po `created_at`, limit 1, tylko kolumny `diagnosis_type,created_at`
(jedyne, których istnienie potwierdza SQL Domeny 02 — nic więcej nie
wybieramy).

## 4. Stan `done`
Gdy zapytanie zwróci wiersz: `<etykieta typu> — <data>`.
`DIAGNOSIS_TYPE_LABELS`: `initial` → "Pierwsza diagnoza", `rediagnosis` →
"Rediagnoza" (fallback: surowa wartość `diagnosis_type` jeśli nieznana).
Data: format pełny (`dzień miesiąc słownie rok`, pl-PL). Pod spodem przycisk
"Zrób nową diagnozę" → link zewnętrzny do narzędzia diagnozy.

## 5. Stan `missing`
Gdy brak wiersza: tekst wyjaśniający (1:1 z web): "Nie masz jeszcze
wykonanej diagnozy powiązanej z tym kontem." + akapit o tym czym jest
diagnoza, że most email→konto działa automatycznie (do 24h na pierwszy
cel/rekomendację), i że jeśli robił diagnozę na inny email lub jeszcze jej
nie robił — powinien zrobić ją teraz. Przycisk "Wykonaj diagnozę" → ten sam
link zewnętrzny.

## 6. Błąd
Zapytanie nieudane → baner błędu "Nie udało się sprawdzić statusu diagnozy: "
+ treść błędu, `loading` ukryty, ani `done` ani `missing` nie są pokazywane.
