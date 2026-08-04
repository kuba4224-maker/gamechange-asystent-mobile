# Audyt "co zbudowaliśmy pod starą infrastrukturę" — 27.07.2026

Na prośbę Kuby: "przyjrzyj się całej aplikacji i poszukaj rzeczy, które
wcześniej zostały zbudowane w taki sposób tylko dlatego, że były budowane w
innej infrastrukturze, a teraz dużo lepszym rozwiązaniem jest jakaś inna
forma ich opracowania." Przejrzany cały kod mobilny (7 ekranów + auth +
push). Kuba autoryzował dalszą, autonomiczną pracę nad kolejnymi
jednoznacznymi usprawnieniami tego typu bez pytania o zgodę za każdym razem
— ten dokument jest aktualizowany na bieżąco, kiedy takie znajdę.

## 0. Brak obsługi wcięcia/notcha telefonu (SafeArea) — znalezione w drugim przebiegu

**Co było:** żaden z 7 ekranów ani ekran logowania nie używał
`SafeAreaView`/`useSafeAreaInsets`, mimo że `react-native-safe-area-context`
był zależnością już od Kroku 1. Podobnie `expo-status-bar` był zależnością,
ale nigdy nie skonfigurowany (`<StatusBar>` nigdzie nie wyrenderowany).

**Dlaczego to było "web-shaped":** web zawsze ma prostokątny obszar do
dyspozycji — nie ma wcięcia na aparat (notch/Dynamic Island) ani paska
statusu telefonu do ominięcia. Kod renderujący każdy ekran zaczynał się od
razu od `padding: 20` na górze ekranu, tak jakby cały ekran telefonu był
dostępny — a nie jest, kawałek u góry zasłania system (zegar, bateria,
aparat). Efekt na prawdziwym telefonie: nagłówek typu "Dziennik zawodnika"
renderowałby się częściowo pod wcięciem albo tuż przy nim, nieczytelnie.

**Co jest teraz:** `SafeAreaProvider` dodany raz na samej górze appki
(`app/_layout.tsx`), każdy z 7 ekranów + ekran logowania owinięty w
`SafeAreaView` (z `react-native-safe-area-context`) z `edges={['top']}` —
dolna krawędź nie wymaga tego samego zabiegu, bo pasek zakładek na dole
sam poprawnie uwzględnia wcięcia urządzenia. Dodatkowo `<StatusBar
style="dark" />` — appka ma konsekwentnie jasne tło (`#f5f2ec`) w każdym
ekranie, więc ciemne ikony paska statusu (godzina, bateria) są poprawnym,
jednoznacznym wyborem wszędzie.

Cztery zmiany wprowadzone w pierwszym przebiegu (poniżej), teraz plus ta
piąta — łącznie pięć zmian, jedna świadomie NIE wprowadzona (uzasadnienie
niżej, punkt 4 starej numeracji, teraz punkt 5).

## 1. Logowanie: magic link → kod OTP (zmiana z największym wpływem)

**Co było:** `signInWithOtp({ email, options: { emailRedirectTo } })` +
appka nasłuchująca na deep link `gamechange://auth-callback`, parsująca
`#access_token=...&refresh_token=...` z URL (`app/_layout.tsx`), wymagająca
zarejestrowania tego URL-a w Supabase Auth → Redirect URLs.

**Dlaczego to było "web-shaped":** magic link + przechwytywanie fragmentu
URL to dokładne tłumaczenie tego, jak Supabase Auth działa w przeglądarce
(`window.location.hash`). Appka natywna nie ma przeglądarkowego "originu", więc
ta sama technika wymagała dodatkowej infrastruktury (deep link, redirect URL
w konsoli Supabase) tylko po to, żeby obejść ograniczenie, które w ogóle nie
istnieje przy innym podejściu.

**Co jest teraz:** `signInWithOtp({ email })` wysyła e-mail z 6-cyfrowym
kodem; użytkownik wpisuje go ręcznie w appce
(`components/LoginScreen.tsx`), `supabase.auth.verifyOtp({ email, token,
type: 'email' })` loguje. Appka nigdy nie jest "otwierana z zewnątrz".

**Efekt uboczny:** cały punkt 🛑 STOP dot. dodania redirect URL w Supabase
Auth **znika** — nie trzeba go wykonywać. Wersja webowa zostaje bez zmian
(magic link tam działa dobrze, bo przeglądarka ma zwykły adres https).

**Zostaje do sprawdzenia przez Kubę (nie STOP, ale wymagane, żeby logowanie
działało):** szablon e-maila "Magic Link" w Supabase Dashboard →
Authentication → Email Templates musi zawierać `{{ .Token }}` w treści,
żeby użytkownik w ogóle widział kod, nie tylko link. Dokładna instrukcja w
`PROCEDURA_KROK_PO_KROK.md`.

## 2. Ekrany nie odświeżały się przy przełączaniu zakładek

**Co było:** każdy ekran wołał swoje `load*()` w zwykłym `useEffect(() => {
...}, [...])` — czyli "przy zamontowaniu komponentu".

**Dlaczego to było "web-shaped":** w wersji webowej przełączenie panelu to
w praktyce nowe wywołanie logiki ładowania danego widoku. W appce natywnej z
paskiem zakładek (Expo Router / React Navigation) ekrany NIE są
odmontowywane przy przełączaniu zakładek — zostają "żywe" w tle. Efekt:
`useEffect` z pustymi/stałymi zależnościami wykonuje się raz, przy
pierwszym wejściu na zakładkę, i nigdy więcej — nawet jeśli dane zmieniły
się gdzie indziej w appce.

**Konkretne, realne konsekwencje, które by to spowodowało:** zawodnik loguje
wpis w Dzienniku, przełącza się na Kalendarz — plakietka "Wykonano/Nie
wykonano" pokazywałaby starą wartość. Zawodnik włącza tryb kontuzji w
Profilu, przełącza się na Mecz — blok "co jest teraz dostępne" pokazywałby
stan sprzed zmiany. Zawodnik wraca z przeglądarki po wypełnieniu diagnozy —
status w zakładce Diagnoza nie zmieniłby się na "zrobione" bez ręcznego
zamknięcia i ponownego otwarcia appki.

**Co jest teraz:** `useEffect` zamieniony na `useFocusEffect` (z
`@react-navigation/native`) w 6 z 7 ekranów — Dziennik, Kalendarz, Cele,
Mecz, Centrum Decyzji, Diagnoza. Dane ładują się na nowo za każdym razem, gdy
zakładka staje się aktywna, nie tylko przy pierwszym wejściu.

**Profil — świadomy wyjątek:** Profil pozostał przy zwykłym `useEffect`.
To jedyny ekran, który ładuje dane do EDYTOWALNEGO formularza (nie do listy
czy formularza "dodaj nowy wpis"). `useFocusEffect` nadpisywałby
niezapisane zmiany za każdym powrotem na tę zakładkę — np. zawodnik zaczyna
poprawiać swoje imię, przełącza się na chwilę gdzie indziej, wraca — i traci
to, co wpisał. Nic innego w appce nie zmienia danych profilu w tle, więc
ryzyko nieaktualności tu nie występuje tak jak w pozostałych ekranach.

## 3. Linki zewnętrzne otwierane w systemowej przeglądarce

**Co było:** `Linking.openURL(...)` dla linku do zewnętrznego narzędzia
diagnozy (Diagnoza) i do listy specjalistów w Marketplace (Centrum
Decyzji) — appka znika z ekranu całkowicie, użytkownik ląduje w osobnej
appce przeglądarki i musi ręcznie wrócić przez przełączanie aplikacji.

**Dlaczego to było "web-shaped":** to dokładne tłumaczenie `target="_blank"`
z wersji webowej — tam otwarcie nowej karty jest tanie i naturalne, na
telefonie oznacza wyjście z appki.

**Co jest teraz:** `expo-web-browser` (`WebBrowser.openBrowserAsync(...)`)
— przeglądarka otwiera się WEWNĄTRZ appki (Safari View Controller na iOS,
Chrome Custom Tabs na Androidzie), z przyciskiem powrotu, bez przełączania
aplikacji. To nie jest WebView (brak problemów z izolacją danych strony
trzeciej) — to oficjalnie rekomendowany przez Expo wzorzec dokładnie na ten
przypadek.

## 4. Brak gestu "pociągnij, żeby odświeżyć"

**Co było:** listy historii (Dziennik, Kalendarz, Cele, Mecz, Centrum
Decyzji) nie miały żadnego sposobu ręcznego odświeżenia poza opuszczeniem i
powrotem na zakładkę.

**Dlaczego to jest "web-shaped" (dokładniej: "brak nawyku mobilnego"):**
web nie ma gestu przeciągnięcia w dół jako standardu odświeżania —
użytkownik odświeża stronę inaczej (F5, przycisk). Na telefonie to
pierwszy odruch, którego użytkownik spróbuje, gdy będzie chciał się
upewnić, że widzi aktualne dane.

**Co jest teraz:** `RefreshControl` dodany do wszystkich list
(Dziennik, Kalendarz, Cele, Mecz, Centrum Decyzji) — koszt wdrożenia bliski
zeru, bo `loadX()` do wywołania już istniało w każdym przypadku.

## Zależności dodane w `package.json`

- `@react-navigation/native` — potrzebne dla `useFocusEffect` (był już
  ukrytą zależnością przez `expo-router`, teraz jawna, żeby uniknąć
  "phantom dependency").
- `expo-web-browser` — przeglądarka w kontekście appki (punkty 3 wyżej).

## Rzeczy sprawdzone, ale ŚWIADOMIE niezmienione

- **Picker (`@react-native-picker/picker`) dla list wyboru** — to
  standardowy, natywny komponent na obu platformach, nie "web-shaped"
  tłumaczenie `<select>`. Zostaje bez zmian.
- **ScalePicker (rząd przycisków 0-10)** — to świadomy wybór projektowy
  (precyzyjniejszy niż slider dla wyboru liczby całkowitej), nie
  pozostałość po starej infrastrukturze. Zostaje bez zmian.
- **Banery błędu/sukcesu jako `<Text>` na górze ekranu (zamiast
  toast/snackbar)** — stylistyczny wybór zgodny z metodologią "kontrakt
  najpierw" (zachowanie 1:1 z web), nie błąd architektoniczny. Nie ruszane
  w tym audycie, żeby nie mnożyć zmian bez wyraźnej prośby.
- **Biometryczny re-login (Krok 3.4)** — nadal niedokończony, ale to nie
  jest "zbudowane źle pod starą infrastrukturę", tylko punkt checklisty
  jeszcze nieukończony. Osobna sprawa, nieporuszana tutaj.
