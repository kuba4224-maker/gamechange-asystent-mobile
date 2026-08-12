# Testy appki mobilnej — jak i po co

*Utworzone 08.08.2026, sesja B rundy 4. Powód: znalezisko N7 z audytu po bloku 3.*

## Jedno polecenie

```bash
node tests/run-selftests.mjs
```

Runner znajduje i uruchamia **każdy** plik `lib/*.selftest.ts`. Wymaga `tsx`
(selftesty są w TypeScripcie). Jeśli go nie ma:

```bash
npm install --no-save tsx
```

Pojedynczy plik:

```bash
npx tsx lib/componentHints.selftest.ts
```

Stan na 08.08.2026 (runda 8): **12 plików, 383 asercje, wszystkie przechodzą**
(policzone uruchomieniem pełnego kompletu plików z dysku, nie przepisane z raportu).

| plik | asercji | czego pilnuje |
|---|---:|---|
| `lib/componentHints.selftest.ts` | **93** | **bramka wiekowa A9** (od rundy 7 z testem kontraktowym na fixturze), reguła R5 („nie ma tabeli" ≠ „pusto"), wybór i rotacja podpowiedzi, formatowanie źródła, **`zawsze_widoczna` i jej ścieżka odzysku** |
| `lib/rediagnosis.selftest.ts` | **90** | **rediagnoza przy zamknięciu Bloku (A8)**: martwa strefa chroniąca przed fałszywym „w dół" (od rundy 6 **pół kroku**, po potwierdzeniu `calcScores()`), odwrócenie `dir` dla trzech segmentów, brak pytania bez punktu odniesienia, pomijalność, zero nowych pytań |
| `lib/contentDose.selftest.ts` | **60** | **dawka treści Bloku Skupienia**: zasady renderowania z kontraktu pasa A, trzy jawne stany braku (nie ma kolumny / `NULL` / pusta lista), treść na ekran bajt w bajt, od rundy 7 warstwa **„przeczytane"** (`content_dose_seen`) |
| `lib/materials.selftest.ts` | **40** | 11 materiałów na 13 segmentów (B2), odblokowania z Celu i diagnozy (C1), zgodność tytułu w bibliotece z nazwą źródła na Dziś, polska odmiana, **teksty własnego ekranu biblioteki** |
| `lib/goal-prominence.selftest.ts` | 24 | kontekst „skąd się wziął ten Cel", odmiana liczebników |
| `lib/labels.selftest.ts` | 24 | jedno źródło 13 nazw, rename `mental` → „Odwaga w grze" (A1), **kolejność pozycji w Pickerze na ekranie Cele** |
| `lib/focusBlockJournalLink.selftest.ts` | 13 | **pytanie o sesję Bloku w dzienniku (sedno rundy 7)**: wybór sesji do potwierdzenia (nigdy z przyszłości), brzmienie pytania dziś/wstecz, komunikat po zapisie mówiący o pasku Celu |
| `lib/livingDiagnosisCascade.selftest.ts` | 13 | kaskada żywej diagnozy — wybór deficytów |
| `lib/pushDeepLink.selftest.ts` | 8 | **deep-link pusha z dawką (runda 8)**: tylko `focus_block_checkin` + `contentDose` (boolean LUB `'true'` po stringifikacji FCM) → `/cele`; wszystko inne → brak nawigacji |
| `lib/focusBlockProgress.selftest.ts` | 8 | wskaźnik „N z M sesji zrobione" w hero Celu |
| `lib/postOnboardingTarget.selftest.ts` | 5 | **onboarding kończy się akcją (runda 8)**: ma diagnozę → wynik, nie ma → założenie Celu, błąd odczytu → Dziś (R5: „nie wiem" ≠ „nie ma") |
| `lib/matchCascade.selftest.ts` | 5 | kaskada pytań okołomeczowych |

*(Uwaga do historii: raport rundy 7 podawał „11/11 selftestów, 394 asercje" i tych
liczb nie da się dziś odtworzyć z plików — prawdopodobnie liczył `measure-heights.ts`
jako jedenasty plik i sumował inaczej [HIPOTEZA, nie sprawdzono jak]. Ta tabela liczy
wyłącznie pliki `lib/*.selftest.ts` — dokładnie to, co uruchamia runner — i pochodzi
z uruchomienia, nie z przepisania.)*

## Zasada — dlaczego ten katalog w ogóle powstał

Runda 3 napisała 55 scenariuszy dla panelu trenera i 12 asercji dla
`lib/labels.ts`. **Wszystkie zniknęły razem z sesją**, bo `tests/` nie należało
do żadnego pasa i nikt ich nie zapisał na dysk. To ten sam wzorzec, przez który
rozjechały się kontrakty ekranów.

Od rundy 4 obowiązuje (ograniczenie O11):

> **`tests/` wchodzi do pasa tej sesji, która zmienia testowany plik.**
> Sesja, która zmienia `lib/X.ts`, zostawia po sobie `lib/X.selftest.ts`
> zapisany na dysku — nie wynik uruchomienia w raporcie.

Uruchomienie testu i wpisanie „przeszło" do raportu **nie liczy się**. Raport
czyta się raz; test zostaje.

## Czego te testy NIE sprawdzają

Uruchomienie runnera na zielono **nie znaczy „appka działa"**. Znaczy „reguły,
które spisaliśmy, nadal obowiązują". Poza zasięgiem zostają:

* **zgodność propsów z React Native** — to robi `npx tsc --noEmit` i tylko to;
* **cokolwiek dotykającego Supabase** — polityki RLS, kształt tabel, uprawnienia.
  Selftest podaje funkcjom gotowe wiersze, więc sprawdza, co appka **zrobi**
  z danymi, a nie czy te dane przyjdą;
* **wygląd i wysokości ekranów** — liczone z arkuszy stylów w raportach zwrotnych,
  nie mierzone;
* **ekrany** (`app/**`) i **komponenty** (`components/**`) — nic tam nie jest dziś
  objęte testem.

## Wzorzec, gdy dopisujesz swój

1. Logika, którą da się zepsuć po cichu, ma mieszkać w `lib/` jako **czysta
   funkcja** — bez `supabase`, bez `react`, bez `react-native`. Wtedy da się ją
   uruchomić bez appki i bez frameworka.
2. Selftest leży obok, nazywa się `X.selftest.ts` i kończy się linią
   `N passed, N failed` oraz `process.exit(1)` przy błędzie — runner czyta kod
   wyjścia.
3. Etykieta asercji ma mówić, **co się psuje**, a nie jak nazywa się funkcja.
   „A9: DAWKA + nieznany wiek = ZABLOKOWANA" jest użyteczne; „passesAgeGate
   zwraca false" nie jest.
4. Reguły z konsekwencjami dla bezpieczeństwa (bramka wiekowa, treści dla
   nieletnich) dostają asercję **także dla przypadku, którego dziś w bazie nie
   ma** — patrz `test-dawka-dla-zawodnika-16plus` w `componentHints.selftest.ts`.
   Dziś każdy wiersz z `min_age` ma `odbiorca='rodzic'`, więc filtr odbiorcy sam
   by wystarczył; wystarczy jeden wiersz dopisany w przyszłości, żeby przestał.

## Pomiar wysokości ekranów

```bash
npx tsx tests/measure-heights.ts
```

Liczy z tych samych stałych, którymi posługują się ekrany, i **kończy się
błędem**, gdy któraś ze zdobyczy zostanie utracona. Progi (każdy z historią,
dlaczego istnieje):

1. przyciski feedbacku rekomendacji schodzą pod zgięcie na małym telefonie
   (zdobycz rundy 3);
2. ekran „Ja" przekracza 2,5 ekranu scrolla (miara postawiona w rundzie 4,
   powód wyprowadzki biblioteki na własną trasę w rundzie 5);
3. **jedna dawka treści przekracza jeden ekran** (miara postawiona w rundzie 6).
   Ten próg odpalił się od razu, przy pierwszym uruchomieniu: najgorsza realna
   dawka miała 1,01 ekranu. Odpowiedzią było zwinięcie „Dla chętnych" za
   przycisk, nie podniesienie progu — po zmianie 0,89. **Jeśli odpali się
   ponownie, zwiń kolejny element, a nie próg**: dawka to rzecz, którą zawodnik
   ma dziś wykonać, i nie może wymagać przewijania;
4. **linia „Nowa porcja w Twoim Bloku →"** (M23, runda 7) spycha przyciski
   feedbacku pod zgięcie — pierwsza od rundy 3 rzecz, która realnie podnosi
   górę przycisków (o jedną linię 13 px, gdy czeka nieotwarta dawka); stan na
   rundę 8: góra przycisków 506 dp, zapas 92 dp na najmniejszym telefonie;
5. **pytanie o sesję Bloku w dzienniku** (sedno rundy 7) przestaje mieścić się
   w całości nad zgięciem — pytanie razem z przyciskami „Tak, to ten" i „Nie".
   Pytanie, którego nie widać bez scrolla, to ten sam bierny mechanizm, który
   runda 7 usuwała, tylko o jeden ekran niżej. Stan na rundę 8: dół boxu
   ~450 dp, zapas ~148 dp na najmniejszym telefonie;
6. **objętość `dzis.tsx` przekracza 48 kB** (miara postawiona w rundzie 8 —
   przegląd całości, sekcja 6: plik rósł ~2 kB na rundę i nikt tego nie
   pilnował). Stan na rundę 8: 40,4 kB. Po przekroczeniu wydziel sekcję do
   `components/` (wzorzec RecommendationCard), nie podnoś progu.

## Historia
- **08.08.2026 (runda 8, sesja główna, chunk 5)** — `measure-heights.ts` dostał próg 6
  (objętość `dzis.tsx` ≤ 48 kB). Po stronie backendu `test-dyspozytor-izolacja-rytmow.js`
  urósł do 42 scenariuszy (budżet czasu dyspozytora — M25).
- **08.08.2026 (runda 8, sesja główna, chunk 4)** — doszedł `lib/pushDeepLink.selftest.ts`
  (8 asercji; deep-link pusha z dawką — kontrakt z raportu C rundy 6, sekcja 12).
  Stan: 12 plików, 383 asercje.
- **08.08.2026 (runda 8, sesja główna, chunk 3)** — doszedł `lib/postOnboardingTarget.selftest.ts`
  (5 asercji; onboarding kończy się akcją — przegląd całości 4.2). Stan: 11 plików, 375 asercji.
- **08.08.2026 (runda 8, sesja główna)** — `measure-heights.ts` dostał progi 4 i 5
  (linia „Nowa porcja…" w hero + pytanie o sesję Bloku w dzienniku — obie rzeczy
  z rundy 7 stoją nad istniejącą treścią, więc obie dostały próg wzorem trzech
  poprzednich). Tabela wyżej przeliczona uruchomieniem pełnego kompletu z dysku:
  10 plików, 370 asercji (w rundzie 7 doszedł `focusBlockJournalLink.selftest.ts`,
  `componentHints` urósł do 93, `contentDose` do 60, `labels` do 24).
- **08.08.2026 (runda 6)** — doszedł `lib/contentDose.selftest.ts` (53 asercje,
  dawka treści w Bloku Skupienia). `componentHints` urósł o 22 asercje na
  `zawsze_widoczna` (funkcja bezpieczeństwa — treść z telefonem zaufania nie
  może czekać na swoją kolej w rotacji). `rediagnosis` urósł o 9 i **wymienił
  asercję odporności**: hipotetyczna druga postać `calcScores()` została
  wykluczona odczytem źródła, więc jej miejsce zajął błąd zaokrąglenia (0,005),
  a siatka objęła wszystkie 1 212 kombinacji zamiast samych niepłaskich.
  `measure-heights.ts` dostał trzeci próg. `labels` +7 (mała litera),
  `materials` bez zmiany liczby (jedna asercja przepisana tak, żeby brała nazwy
  z `SEGMENT_LABELS`, zamiast mieć je wpisane w treści).
- **08.08.2026 (runda 5)** — doszedł `lib/rediagnosis.selftest.ts` (81 asercji).
  `measure-heights.ts` dostał drugi próg (scroll ekranu „Ja") i trzeci ekran
  (biblioteka). `materials.selftest.ts` urósł o teksty własnego ekranu.
- **08.08.2026** — katalog utworzony w sesji B rundy 4 razem z runnerem, README
  i trzema nowymi selftestami (`componentHints`, `materials`, `labels`).
  Dwa wcześniejsze (`goal-prominence`, `focusBlockProgress`) istniały już
  w `lib/` i zostały tylko podłączone pod runner — bez zmiany treści.
