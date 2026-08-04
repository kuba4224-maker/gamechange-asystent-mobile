# Kontrakt zachowania — ekran PROFIL

Spisany z `claude/asystent_app.html` w Project Knowledge (migawka 2026-07-27T15:23:28Z,
panel `panel-profil` + powiązane funkcje JS), PRZED napisaniem kodu natywnego —
zgodnie z Krokiem A metodologii (sekcja 4 architektury). Ten ekran nie jest dotknięty
rozbieżnością znalezioną między Project Knowledge a produkcją (te 3 brakujące zmiany
dotyczą Kalendarza i Centrum Decyzji, nie Profilu) — kontrakt poniżej jest bezpieczny.

## 1. Sekcja "Dane podstawowe"
- **Email** — tylko wyświetlany (`currentUser.email`), nieedytowalny.
- **Imię i nazwisko** — tekst, opcjonalne.
- **Rok urodzenia** — liczba, zakres 1950–2020 (walidacja UI jak w web, nie twarda blokada).

## 2. Sekcja "Pozycja i poziom"
- **Pozycja podstawowa** — select z listy `POSITIONS` (Bramkarz, Środkowy obrońca, Boczny
  obrońca, Defensywny pomocnik, Środkowy pomocnik, Ofensywny pomocnik, Skrzydłowy,
  Napastnik, Nie dotyczy) + opcja pusta "— wybierz —".
- **Pozycja dodatkowa** — ta sama lista + opcja pusta "— brak —". Opcjonalne.
- **Obecny poziom gry** / **Najwyższy poziom, na jakim kiedykolwiek grałeś** — oba z listy
  `CURRENT_LEVELS` (Amator/rekreacyjnie, Juniorski klub, Seniorski klub amatorski,
  Półprofesjonalny, Profesjonalny) + "— wybierz —".

## 3. Sekcja "Cel kierunkowy"
- Select **"Co jest dla Ciebie teraz najważniejsze?"** — opcje z `GOAL_DIRECTION_LABELS`:
  `more_minutes` (Więcej minut w meczach), `move_up` (Awans na wyższy poziom),
  `improve_element` (Poprawa konkretnego elementu gry), `avoid_relegation_from_team`
  (Utrzymanie miejsca w składzie), `other` (Inne) + "— wybierz —".
- Textarea **"Doprecyzowanie"** — widoczna WYŁĄCZNIE gdy wybrano `other`. Zapisywana do
  `goal_direction_note` tylko wtedy; w każdym innym przypadku `null`.
- Tekst pomocniczy pod nagłówkiem: "To ogólny kierunek, nie konkretny, śledzony cel —
  przy zakładaniu Twojego pierwszego celu w zakładce Cele przypomnimy Ci o nim, żebyś
  mógł wybrać konkretny segment, którego dotyczy." (dokładnie ten sam tekst co web).

## 4. Sekcja "Dostęp do sprzętu"
- Checkboxy wielokrotnego wyboru z `EQUIPMENT_LABELS`: `silownia` (Siłownia), `biezna`
  (Bieżnia), `gumy_oporowe` (Gumy oporowe), `boisko` (Dostęp do boiska), `brak_dostepu`
  (Brak dostępu do sprzętu). Zapisywane jako tablica `equipment_access`.

## 5. Tryb kontuzji
- Checkbox **"Jestem teraz w trybie kontuzji (wykluczony z normalnego treningu)"**.
- Gdy zaznaczony: pokazuje select **"Której części ciała to dotyczy?"** —
  `INJURY_MODE_CATEGORY_LABELS`: `lower_body` (Dolna część ciała), `upper_body` (Górna
  część ciała), `general` (Ogólne / całe ciało).
- **Walidacja twarda przy zapisie:** jeśli `injury_mode_active=true` i kategoria pusta →
  błąd "Wybierz kategorię ograniczenia dla trybu kontuzji." — zapis PRZERYWANY, żadne
  zapytanie do bazy nie leci (dokładnie jak w `saveProfile()` web).

## 6. Przycisk "Zapisz profil" — `saveProfile()`
Dwa zapisy, W TEJ KOLEJNOŚCI (jeśli pierwszy zawiedzie, drugi się nie wykonuje):
1. UPDATE `public.users` — **wyłącznie** kolumny `full_name`, `birth_year` (zgodnie z
   GRANT UPDATE ograniczonym do tych dwóch kolumn — żadnych innych pól usera stąd nie
   ruszamy).
2. UPSERT `public.player_profiles` (`on_conflict=user_id`, bo `user_id` to PK) —
   `position_primary`, `position_secondary`, `current_level`, `highest_level_ever`,
   `goal_direction`, `goal_direction_note` (patrz sekcja 3), `equipment_access`,
   `injury_mode_active`, `injury_mode_category` (`null` gdy tryb wyłączony),
   `updated_at`.
- Sukces → "Profil zapisany." Błąd → "Nie udało się zapisać profilu: " + treść błędu.
- Przycisk disabled + "Zapisuję..." w trakcie.

## 7. Sekcja "Dodaj wpis do historii kontuzji" — formularz NIEZALEŻNY od "Zapisz profil"
- **Rodzaj kontuzji** — tekst, wymagany (błąd "Podaj rodzaj kontuzji." jeśli puste).
- **Lokalizacja** — select `BODY_LOCATIONS` (17 opcji, ta sama lista co przy bólu w
  Dzienniku: kostka, kolano, udo przednie/tylne, łydka, pachwina, biodro, stopa,
  achilles, plecy/kręgosłup, brzuch/tułów, bark, łokieć, nadgarstek/dłoń, głowa/twarz,
  klatka piersiowa/żebra, inne).
- **Strona** — select (—/Lewa/Prawa), **ukryty** gdy lokalizacja ∈
  `{plecy_kregoslup, brzuch_tulow, inne}` (zbiór `NON_LATERAL_LOCATIONS`).
- **Od kiedy** / **Do kiedy** — daty, obie opcjonalne.

**Uwaga o wierności (dopisana 28.07.2026, ta sama luka co wcześniej znaleziona i
zamknięta w Kalendarzu — patrz `KONTRAKT_KALENDARZ.md`, sekcja 2):** web używa
natywnego `<input type="date">` przeglądarki dla obu tych pól
(`f-injury-from`/`f-injury-to` w `asystent_app.html`). Implementacja natywna
używa `@react-native-community/datetimepicker` (ta sama zależność, już
dodana do `package.json` przy Kroku 8/Kalendarzu) zamiast zwykłego pola
tekstowego — funkcjonalnie równoważne (jedna wybrana data, zapisywana tym
samym `toLocalDateStr`), inny komponent UI.

- **"Już w pełni zagojona"** — checkbox, domyślnie ZAZNACZONY.
- Przycisk **"Dodaj do historii"** — INSERT do `injury_history` (user_id, injury_type,
  body_location, side [null jeśli non-lateral], period_from, period_to, fully_healed).
  Po sukcesie: nowy wiersz dokładany NA GÓRĘ lokalnej listy bez pełnego przeładowania,
  pola `injury_type`/`from`/`to` czyszczone, `fully_healed` wraca do zaznaczonego —
  **UWAGA:** lokalizacja/strona NIE są resetowane w oryginale (zachować to zachowanie,
  nie "naprawiać" bez wyraźnej prośby). Komunikat "Dodano do historii kontuzji."

## 8. Lista "Historia kontuzji"
Każda karta: `injury_type` + status ("Zagojona" / "W trakcie leczenia") w górnym
wierszu; w wierszu detalu: etykieta lokalizacji + " (L)"/" (P)" jeśli dotyczy + daty
"od DD miesiąc RRRR" / "do DD miesiąc RRRR" połączone " – ", tylko jeśli podane.

## 9. Ładowanie ekranu — `loadProfile()`
- Wypełnia selecty (statyczne listy), ustawia wyświetlany email.
- Równolegle pobiera: `users` (full_name, birth_year), `player_profiles` (cały wiersz —
  może nie istnieć jeszcze, wtedy pola zostają puste/domyślne), `injury_history`
  (sort malejąco po `created_at`).
- **Konwencja do zachowania:** `load*` NIGDY nie czyści banerów błędu/OK — to robią
  tylko funkcje zapisujące (`saveProfile`/`addInjuryHistory`), każda swój własny baner.

## Co świadomie NIE wchodzi w ten pierwszy przebieg
- Biometryczny re-login (Krok 3.4) — osobny krok checklisty, nieblokujący dla Profilu.
- Edycja/usuwanie istniejących wpisów historii kontuzji — w web też nie ma takiej opcji,
  więc brak jej w appce natywnej to PARYTET, nie luka.
