# Kontrakt zachowania — ekran MECZ (przeprojektowany)

Spisany z `app/(tabs)/mecz.tsx` w repo `gamechange-asystent-mobile` (stan
29.07.2026, PO wdrożeniu przeprojektowania wg
`TRYB_MECZU_PRZEPROJEKTOWANIE_DECYZJE.md` +
`MECZ_PRZEPROJEKTOWANIE_PROCEDURA_WDROZENIA.md`), PO Kroku 5 GATE
(potwierdzone na żywym urządzeniu Kuby). Zastępuje poprzednią wersję tego
dokumentu (opisywała 1:1 stary `panel-mecz` z `asystent_app.html` — flaga
"zbyt ubogi merytorycznie" z 28.07.2026 jest teraz NIEAKTUALNA, patrz
`DO_PRZEMYSLENIA_TRYB_MECZU.md`).

## 0. Krok 5 GATE — potwierdzone na urządzeniu (29.07.2026)

Test wykonany na koncie Kuby (jedyne konto w systemie), z realnie ustawioną
pozycją "Boczny obrońca" i realną diagnozą/celem. Potwierdzone bezpośrednio
w bazie (nie tylko wizualnie):

- **Scenariusz 1 (cel = deficyt pozycyjny, ten sam segment):** cel
  aktywny=`wytrzymalosc`, diagnoza wykryła `wytrzymalosc`+`decyzja` jako
  statystyczne deficyty, oba kluczowe dla pozycji Boczny obrońca → pierwsze
  2 pytania segmentowe to wytrzymałość i decyzja, zapisane z
  `selection_source='deficit'` (NIE `'goal'`, mimo pokrywania się z celem) —
  zgodnie z decyzją programistyczną w `matchCascade.ts`.
- **Scenariusz 2 (cel ≠ deficyt):** cel tymczasowo zmieniony na
  `techFund` — pierwsze 2 pytania nadal wytrzymałość/decyzja (`deficit`),
  cel pojawił się dopiero jako 3. (dodatkowe) pytanie, ze
  `selection_source='goal'`, `was_goal_segment=true`. Potwierdza kolejność
  priorytetu: deficyt pozycyjny > cel.
- **Wykluczanie w tym samym meczu:** drugie pytanie (`decyzja`) poprawnie
  wykluczyło już wybrane `wytrzymalosc`.
- **Pogłębienia:** odpowiedzi wyzwalające (`significant_drop`, `hesitated`)
  poprawnie pokazały pytanie pogłębiające i zapisały `followup_value`.
- **Walidacja:** pusty formularz (bez RPE/samooceny/odpowiedzi
  segmentowej) poprawnie zablokowany komunikatem.
- **Zapis end-to-end:** `match_contexts` (z nowymi polami) i
  `match_context_answers` (z `selection_source`/`followup_value`) zapisane
  poprawnie, zweryfikowane bezpośrednio w Supabase.

Nie przetestowane na żywym urządzeniu (świadomie odłożone — logika ma już
przechodzące testy jednostkowe, `lib/matchCascade.selftest.ts`, Krok 3):
brak diagnozy + brak celu → rotacja; pomijanie segmentu `regeneracja` gdy
`entered_recovery_state='entered_fresh'`.

## 1. Blok trybu kontuzji — `injury-routing-wrap`

BEZ ZMIAN względem poprzedniej wersji. Widoczny TYLKO gdy
`player_profiles.injury_mode_active === true` ORAZ `injury_mode_category`
ma odpowiadający wpis w `INJURY_MODE_ROUTING` (jeśli brak dopasowania —
cały blok ukryty, bez komunikatu).

`INJURY_MODE_ROUTING` — 3 kategorie (`lower_body`, `upper_body`,
`general`), każda z etykietą + mapą dostępności 13 segmentów
(`available`/`partial`/`unavailable`) — treść niezmieniona z poprzedniej
wersji kontraktu.

Render: etykieta kategorii + segmenty pogrupowane wg statusu, w kolejności
unavailable → partial → available. Stały tekst pod spodem: "Zmień lub
wyłącz tryb kontuzji w Profilu."

**Odporność na błąd:** zapytanie o profil zawiedzie → blok ukryty, reszta
ekranu działa dalej.

## 2. Formularz "Zapisz mecz" — kolejność pól (Krok 4 procedury)

### 2.1 Pola już istniejące
- Rodzaj — select: `official_match`/`friendly`/`training_game`/`tournament`.
  Domyślnie `official_match`.
- Twój zespół — gole / Przeciwnik — gole — dwa liczbowe pola, oba opcjonalne.
- Twoja rola (opcjonalnie) — tekst dowolny.
- Minuty na boisku — liczba, opcjonalna.

### 2.2 Pozycja dziś (NOWE)
Checkbox "Dziś grałem na innej pozycji niż zwykle". Gdy zaznaczony: pokazuje
podpowiedź ze zwykłą pozycją z profilu + picker z 8 etykiet pozycji (BEZ
"Nie dotyczy" — pole odpowiada na "jaką pozycję dziś grałeś"). Zapisywane
jako `position_played_today` (polska etykieta, albo `null` gdy checkbox
odznaczony). Używane WYŁĄCZNIE do wyboru WARIANTU TREŚCI pytań segmentowych
(`resolveWordingKey`) — NIGDY do liczenia priorytetu kaskady (to zawsze z
`player_profiles.position_primary`, patrz punkt 4 dokumentu decyzji).

### 2.3 Stan regeneracji przed meczem (NOWE)
3 opcje (`entered_fatigued`/`entered_fresh`/`uncertain`), zapisywane jako
`entered_recovery_state`. **Efekt uboczny krytyczny:** pierwsza zmiana tego
pola wyzwala JEDNORAZOWE przeliczenie 2 pytań segmentowych kaskady
(`loadSegmentSlots`) — kolejne zmiany tego pola NIE przeliczają slotów
ponownie (żeby nie gubić już udzielonych odpowiedzi). Segment `regeneracja`
dostępny w kaskadzie TYLKO gdy `entered_fatigued`.

### 2.4 Warunki meczu (NOWE)
Checkbox "Warunki dziś były wymagające (upał, zimno, deszcz, ciężka
murawa)" → `demanding_conditions` (boolean, domyślnie `false`).

### 2.5 Ocena występu (NOWE)
Trzy skale 0-10 (`ScalePicker`): RPE meczowe (`match_rpe`), samoocena gry
(`self_rating`), stan mentalny/pewność siebie (`mental_state`) — wszystkie
opcjonalne.

### 2.6 Sekcja bólu (NOWE — reuse 1:1 wzorca z Dziennika)
Checkbox "Boli Cię dziś coś?" → lokalizacja (17 opcji, w tym `inne`),
strona (lewa/prawa, ukryta dla lokalizacji nielateralnych: `plecy_kregoslup`,
`brzuch_tulow`, `inne`), intensywność 0-10, checkbox "To wyklucza mnie z
treningu". Zapis do OSOBNEJ tabeli `pain_entries` (nie `match_contexts`),
powiązanej przez `match_context_id` (Krok 1.1 migracji — `daily_log_id`
teraz nullable, CHECK wymusza dokładnie jednego rodzica).

### 2.7 Pytania segmentowe z kaskady (NOWE)
2 pytania liczone automatycznie po pierwszej zmianie stanu regeneracji
(patrz 2.3), plus opcjonalny przycisk "Pokaż dodatkowe pytanie" (trzecie,
liczone na żądanie, wykluczające już wybrane segmenty). Logika wyboru:
`lib/matchCascade.ts::selectSegmentForMatch()` (kaskada priorytetu —
pozycja+deficyt → cel → największy deficyt → pozycja bez deficytu →
rotacja, pełny opis w tym pliku). Treść pytań z `lib/matchQuestionBank.ts`
(13 segmentów, warianty pozycyjne gdzie dotyczy, pytania pogłębiające z
warunkiem pokazania po konkretnym kodzie odpowiedzi). Segment `regeneracja`
renderowany inaczej — pytanie bazowe to samo pole z sekcji 2.3, tu tylko
pogłębienie.

### 2.8 Wolna notatka (NOWE)
Pole wieloliniowe, opcjonalne → `free_note`.

## 3. Walidacja (punkt 3 dokumentu decyzji) — ZMIANA względem poprzedniej wersji

W przeciwieństwie do poprzedniej wersji (zero walidacji), teraz wymagane
**minimum jeden sensowny sygnał**: `match_rpe` LUB `self_rating` LUB
odpowiedź na którekolwiek pytanie segmentowe (albo sam fakt, że slot to
`regeneracja` — ta odpowiedź żyje w polu z sekcji 2.3). Dodatkowo: jeśli
zaznaczono ból — intensywność wymagana; jeśli zaznaczono "inna pozycja
dziś" — wybór pozycji wymagany. Błędy pokazywane jako baner nad
formularzem, nie blokują edycji.

## 4. Zapis — `submitMatchContext()`

1. INSERT `match_contexts`: wszystkie pola z sekcji 2.1-2.5 i 2.8 (liczby
   parsowane albo `null`, `position_played_today` `null` gdy checkbox
   odznaczony).
2. Jeśli ból zaznaczony: INSERT `pain_entries` z `match_context_id` z kroku
   1. Błąd tego INSERT-u NIE cofa zapisu meczu — komunikat "Mecz zapisany,
      ale wpis bólowy się nie udał: ...".
3. Dla każdego slotu segmentowego z odpowiedzią (albo `regeneracja`, zawsze):
   INSERT `match_context_answers` (`segment_id`, `selection_source`,
   `was_goal_segment` = `selection_source==='goal'`, `response_value`,
   `followup_value`). Błąd per-slot NIE cofa reszty — komunikat per segment.
4. Sukces → "Mecz zapisany.", pełny reset formularza (w tym sloty
   segmentowe i `slotsComputedRef` — kolejny wpis liczy sloty od nowa),
   przeładowanie historii.

## 5. Historia meczów — `renderMatchCard`

Ostatnie 20 `match_contexts` (malejąco po `created_at`). Karta: etykieta
rodzaju + data w górnym wierszu; linia detalu: "wynik: X:Y" (tylko gdy oba
wyniki ustawione), "X min", "RPE: X/10", **"Samoocena: X/10" (NOWE)**,
rola — złączone " · ", "—" jeśli nic z powyższego.

## 6. Wczytywanie — `loadMecz()`

1. Pobiera `player_profiles` (`injury_mode_active`, `injury_mode_category`,
   **`position_primary` — NOWE**, do sekcji 1 i do podpowiedzi w sekcji
   2.2). Błąd → ukryj blok trybu kontuzji, nie blokuj reszty.
2. Pobiera 20 najnowszych `match_contexts` → render historii.

Osobno, dopiero po pierwszej zmianie stanu regeneracji: `loadSegmentSlots()`
pobiera kontekst kaskady (`fetchPlayerMatchSelectionContext` —
`lib/matchSegmentSelection.ts`: pozycja profilowa, najnowsza diagnoza
`event='email_submitted'`, aktywny priorytetowy cel, historia pytań
segmentowych z wszystkich meczów) i liczy 2 pierwsze sloty.
