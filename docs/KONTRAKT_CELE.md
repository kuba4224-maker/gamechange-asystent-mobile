# Kontrakt zachowania — ekran CELE

Spisany z `panel-cele` w `asystent_app.html` (migawka 2026-07-27T15:23:28Z), PRZED
kodem. **Zawiera funkcję "kontekst Celu kierunkowego" dodaną 27.07.2026** — ta
konkretna zmiana JEST potwierdzona na produkcji/GitHub main (zweryfikowane wcześniej
w tej sesji), więc bezpiecznie wchodzi w zakres tego kontraktu.

## 1. Segmenty pogrupowane wg filaru
`SEGMENTS_BY_PILLAR` — 5 filarów, 13 segmentów, kolejność 1:1 z insertem w Domenie 00:
1. Dominacja fizyczna: `moc`, `wytrzymalosc`, `fizycznosc`
2. Efektywność techniczna: `techFund`, `techSpec`
3. Trwałość organizmu: `tolerancja`, `regeneracja`, `odpornosc`, `odzywianie`
4. Mentalność: `koncentracja`, `mental`
5. Boiskowa mądrość: `percepcja`, `decyzja`

**Uwaga o wierności:** web używa `<optgroup>` do grupowania segmentów pod filarem w
jednym select. Natywny `Picker` (RN) nie ma dobrze wspieranego, spójnego cross-platform
odpowiednika optgroup — w implementacji lista jest spłaszczona (13 pozycji, bez
wizualnego nagłówka filaru). To świadome uproszczenie wizualne, nie zmiana
funkcjonalna — flagowane tu wprost, do oceny czy potrzebny osobny custom picker z
sekcjami w kolejnym przebiegu.

## 2. Formularz nowego celu
- Segment — select jak wyżej (wymagany, ma sensowną wartość domyślną = pierwszy).
- Doprecyzowanie celu (opcjonalnie) — textarea → `refinement_note`.
- Horyzont w tygodniach (opcjonalnie) — liczba 1–52 → `horizon_weeks`; jeśli podane,
  DODATKOWO ustawia `horizon_started_at` = dzisiejsza data lokalna (`toLocalDateStr`,
  NIE `toISOString()`).
- Checkbox "Ustaw jako cel priorytetowy" → `is_priority`.

## 3. Kontekst "Cel kierunkowy" z Profilu (NOWE od 27.07.2026)
Pokazywany TYLKO gdy zawodnik nie ma ŻADNEGO aktywnego celu (`goalsCache.some(status
=== 'active')` === false). Pobiera `player_profiles.goal_direction` +
`goal_direction_note`. Jeśli `goal_direction` puste — nic nie pokazuj (cichy fallback,
też przy błędzie zapytania — brak kontekstu NIE blokuje zakładania celu). Jeśli jest:
blok z etykietą "Twój ogólny cel z Profilu", treścią `<label>` + ` — „<notatka>”` (myślnik
+ cudzysłów tylko jeśli notatka istnieje), i podpowiedzią "Wybierz poniżej konkretny
segment, którego to dotyczy — to on będzie śledzony jako Twój cel." Świadomie ŻADNEGO
mapowania segmentu z `goal_direction` — zawodnik sam wybiera.

## 4. Tworzenie celu — `createGoal()`
1. Jeśli `is_priority=true`: znajdź istniejący aktywny cel priorytetowy
   (`goalsCache.find(is_priority && active)`) i jeśli istnieje, PATCH go na
   `is_priority=false, priority_changed_at=now` PRZED insertem nowego (unikalny
   indeks `idx_goals_one_priority_per_user` wymaga tego porządku).
2. INSERT `goals`: `user_id`, `segment_id`, `origin: 'player_chosen'`, `is_priority`,
   `refinement_note` (jeśli podane), `horizon_weeks`+`horizon_started_at` (jeśli
   podane), `priority_changed_at` (jeśli `is_priority`).
3. **Obsługa konfliktu:** błąd 409 / tekst zawierający
   `idx_goals_one_active_per_segment` → komunikat zastępczy: "Masz już aktywny cel w
   tym segmencie — najpierw go zakończ (ukończony/porzucony), zanim dodasz nowy."
4. **Rollback:** jeśli krok 2 zawiedzie PO tym jak krok 1 zdjął poprzedni priorytet,
   spróbuj przywrócić `is_priority=true` na `prevPriority`. Jeśli i to zawiedzie,
   dopisz do komunikatu błędu: " Dodatkowo nie udało się przywrócić poprzedniego
   priorytetu — sprawdź zakładkę Cele."
5. Sukces → "Cel dodany.", reset pól (notatka/horyzont/priorytet), przeładowanie listy.

## 5. Karta celu — `renderGoalCard`
- Segment (label) + filar pod spodem.
- Odznaki: "Priorytet" (gdy `is_priority && active`), "Ukończony" (`completed`),
  "Porzucony" (`abandoned`).
- `refinement_note` jeśli istnieje.
- Meta: "horyzont: X tyg." (jeśli `horizon_weeks`) + "dodano: DD miesiąc" + "zakończono:
  DD miesiąc" (jeśli `ended_at`), złączone " · ".
- Akcje (TYLKO gdy `status==='active'`): przełącznik priorytetu (etykieta zależna od
  stanu: "Zdejmij priorytet" / "Ustaw priorytet"), "Ukończony", "Porzuć".

## 6. `togglePriority(goalId, makePriority)`
Ten sam wzorzec demote-poprzedniego-potem-patch-nowego + rollback co w `createGoal`
krok 1+4, ale bez insertu — tylko PATCH docelowego celu na `is_priority=makePriority`.

## 7. `endGoal(goalId, status)`
PATCH: `status`, `ended_at=now`. Jeśli kończony cel MIAŁ `is_priority=true`, w TYM
SAMYM update też `is_priority=false` (baza ma CHECK `chk_priority_only_if_active`,
wymagający że priorytetowy cel musi być aktywny — inaczej zapis odrzucony).

## 8. Listy
- "Aktywne cele" — `status==='active'`, pusty stan: "Brak aktywnych celów — dodaj
  pierwszy powyżej."
- "Historia celów" (zwijana sekcja) — `status!=='active'`, pusty stan: "Brak
  zakończonych celów."
