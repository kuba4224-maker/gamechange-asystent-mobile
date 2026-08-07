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

Stan na 08.08.2026 (runda 6): **9 plików, 335 asercji, wszystkie przechodzą.**

| plik | asercji | czego pilnuje |
|---|---:|---|
| `lib/rediagnosis.selftest.ts` | **90** | **rediagnoza przy zamknięciu Bloku (A8)**: martwa strefa chroniąca przed fałszywym „w dół" (od rundy 6 **pół kroku**, po potwierdzeniu `calcScores()`), odwrócenie `dir` dla trzech segmentów, brak pytania bez punktu odniesienia, pomijalność, zero nowych pytań |
| `lib/componentHints.selftest.ts` | **78** | **bramka wiekowa A9**, reguła R5 („nie ma tabeli" ≠ „pusto"), wybór i rotacja podpowiedzi, formatowanie źródła, **`zawsze_widoczna` i jej ścieżka odzysku** |
| `lib/contentDose.selftest.ts` | **53** | **dawka treści Bloku Skupienia**: sześć zasad renderowania z kontraktu pasa A, trzy jawne stany braku (nie ma kolumny / `NULL` / pusta lista), treść na ekran bajt w bajt |
| `lib/materials.selftest.ts` | **40** | 11 materiałów na 13 segmentów (B2), odblokowania z Celu i diagnozy (C1), zgodność tytułu w bibliotece z nazwą źródła na Dziś, polska odmiana, **teksty własnego ekranu biblioteki** |
| `lib/goal-prominence.selftest.ts` | 24 | kontekst „skąd się wziął ten Cel", odmiana liczebników |
| `lib/labels.selftest.ts` | 17 | jedno źródło 13 nazw, rename `mental` → „Odwaga w grze" (A1), **kolejność pozycji w Pickerze na ekranie Cele** |
| `lib/focusBlockProgress.selftest.ts` | 8 | wskaźnik „N z M sesji zrobione" w hero Celu |

Dwa pozostałe pliki (`livingDiagnosisCascade`, `matchCascade`) też są w katalogu
i uruchamia je ten sam runner — u Kuby na komplecie plików przechodzą; w
piaskownicy sesji delegowanej `matchCascade` nie startuje, bo `lib/matchCascade.ts`
nie zostało pobrane mostem. **To nie jest regresja** — patrz raport zwrotny B
runda 5, sekcja 10.

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
błędem**, gdy któraś z dwóch zdobyczy zostanie utracona:

1. przyciski feedbacku rekomendacji schodzą pod zgięcie na małym telefonie
   (zdobycz rundy 3);
2. ekran „Ja" przekracza 2,5 ekranu scrolla (miara postawiona w rundzie 4,
   powód wyprowadzki biblioteki na własną trasę w rundzie 5);
3. **jedna dawka treści przekracza jeden ekran** (miara postawiona w rundzie 6).
   Ten próg odpalił się od razu, przy pierwszym uruchomieniu: najgorsza realna
   dawka miała 1,01 ekranu. Odpowiedzią było zwinięcie „Dla chętnych" za
   przycisk, nie podniesienie progu — po zmianie 0,89. **Jeśli odpali się
   ponownie, zwiń kolejny element, a nie próg**: dawka to rzecz, którą zawodnik
   ma dziś wykonać, i nie może wymagać przewijania.

## Historia
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
