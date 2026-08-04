# Procedura krok po kroku — wersja dla kogoś, kto nigdy tego nie robił

Ten dokument zakłada, że NIC nie wiesz o programowaniu, terminalach,
konsolach deweloperskich ani o tym, jak appki trafiają na telefon. Każde
pojęcie jest wyjaśnione, zanim go użyjemy. Jeśli mimo to coś jest
niejasne — zatrzymaj się i napisz do mnie z pytaniem, zanim pójdziesz
dalej. Lepiej zapytać niż zgadywać.

**Zasada nadrzędna: rób WYŁĄCZNIE to, co jest napisane, w podanej
kolejności. Nie próbuj "przyspieszać" ani pomijać kroków, nawet jeśli
wyglądają na oczywiste.** Jeśli na ekranie widzisz coś innego niż opisane —
zatrzymaj się, zrób zrzut ekranu (klawisz **Print Screen** na klawiaturze,
albo skrót **Windows + Shift + S** żeby zaznaczyć fragment ekranu) i wyślij
mi go razem z pytaniem, na którym punkcie utknąłeś (np. "Etap 1, punkt
1.1").

---

## Zanim zaczniesz — kilka pojęć, które pojawią się wielokrotnie

Nie musisz tego zapamiętywać — możesz tu wracać, gdy natrafisz na dane
słowo w dalszej części dokumentu.

**Terminal (inaczej: PowerShell, konsola, wiersz poleceń)** — to program w
Windows, w którym zamiast klikać myszką, piszesz polecenia tekstem, a
komputer je wykonuje. Wygląda jak czarne albo granatowe okno z białym/
zielonym tekstem. To NIE jest nic niebezpiecznego — jeśli wpiszesz coś
błędnie, komputer najwyżej pokaże czerwony komunikat błędu, nic się nie
"zepsuje". Jak go otworzyć — opisane dokładnie w Etapie 0 niżej.

**"Wpisz komendę X"** — oznacza: kliknij w okno terminala, żeby było
aktywne, wpisz dokładnie ten tekst (bez cudzysłowów, chyba że są w treści
komendy), a potem naciśnij klawisz **Enter**. Dopiero po Enterze komputer
zacznie to wykonywać.

**Folder / repozytorium** — folder to zwykły folder na dysku, jak każdy
inny w Eksploratorze Windows. "Repozytorium" to tylko bardziej formalna
nazwa folderu z kodem appki, który dodatkowo ma historię zmian (jak "cofnij"
w Wordzie, tylko dla całego folderu). Dla Ciebie praktycznie to samo co
"folder appki".

**Zależności appki / `npm install`** — appka mobilna nie jest napisana od
zera w całości — korzysta z gotowych "klocków" napisanych przez innych
programistów (np. gotowy kalendarz, gotowy przycisk). Komenda `npm install`
pobiera wszystkie te "klocki" na Twój komputer, żeby appka miała z czego
korzystać. To normalne, że trwa to kilka minut i że w terminalu przewija
się dużo tekstu.

**Build** — proces zamiany kodu appki w gotowy plik, który da się
zainstalować na telefonie (tak jak przepis zamienia się w gotowe ciasto).
Robi się to w chmurze (na serwerach firmy Expo), nie na Twoim komputerze —
Twój komputer tylko wysyła "zlecenie" i czeka na gotowy plik.

**Zmienna środowiskowa (np. w Vercel)** — to taka "zaszyfrowana szufladka"
na stronie internetowej, w której chowa się hasła i klucze dostępowe, żeby
nie leżały jawnie w kodzie appki. Ty tylko wklejasz wartość do konkretnego,
nazwanego pola — nie musisz rozumieć, jak to działa w środku.

**Commit / push (GitHub)** — sposób na zapisanie kopii zapasowej kodu w
internecie (na stronie GitHub), żeby nic nie zginęło i żeby inne narzędzia
(np. budowanie appki) miały do niego dostęp. To jak zapisanie pliku, tylko
że zapisuje się "w chmurze" z historią wersji.

**Konsola (Apple/Google/Firebase/Vercel)** — tak nazywam stronę
internetową danej firmy, na której zarządzasz swoim kontem deweloperskim
(zakładasz appkę, wgrywasz pliki, sprawdzasz ustawienia). To zwykła strona
WWW, logujesz się na nią tak jak na każdą inną.

**Uwaga o wyglądzie stron:** strony Apple/Google/Firebase/Vercel zmieniają
wygląd co jakiś czas. Jeśli nazwa przycisku albo menu, które opisuję, nie
zgadza się dokładnie z tym, co widzisz — szukaj najbliższego znaczeniowo
odpowiednika (np. "Ustawienia" zamiast "Settings", jeśli masz angielski
interfejs) i pytaj, jeśli nie masz pewności, zanim klikniesz.

---

## Zdecydowane wcześniej — nie musisz nic więcej potwierdzać

- **Identyfikator appki** (techniczna nazwa w formacie
  `com.gamechange.asystent`, której użytkownik nigdy nie widzi) —
  potwierdzona przez Ciebie, wpisana już w kodzie appki. Nic nie musisz
  robić.
- **Ustawienia logowania w Supabase** — logowanie zostało zmienione na
  kod z maila (opisane w Etapie 2 niżej) właśnie po to, żeby NIE trzeba
  było ruszać dodatkowych ustawień bezpieczeństwa konta. Ten temat jest
  zamknięty.

---

## ETAP 0 — Sprawdź, czy appka w ogóle działa

**Po co ten etap:** zanim wydasz choćby złotówkę na konta deweloperskie
(Etap 1), chcemy się upewnić, że appka faktycznie się uruchamia na Twoim
komputerze. To jest bezpłatne i w pełni odwracalne — jeśli coś nie
zadziała, nic nie tracisz.

### 0.1 — Sprawdź, czy masz zainstalowany program "Node.js"

1. Naciśnij jednocześnie klawisze **Windows** (ikonka flagi na klawiaturze)
   **+ R**. Otworzy się małe okienko "Uruchom".
2. Wpisz w nim: `powershell` i naciśnij Enter.
3. Otworzy się granatowe/czarne okno terminala (patrz wyjaśnienie wyżej).
4. Wpisz dokładnie:
   ```
   node -v
   ```
   i naciśnij Enter.
5. **Jeśli zobaczysz coś w stylu `v20.11.0`** (litera "v" i numery) — masz
   już zainstalowany Node.js, przejdź od razu do punktu 0.3.
6. **Jeśli zobaczysz czerwony tekst** typu "nie jest rozpoznawany jako
   polecenie wewnętrzne" — nie masz Node.js, przejdź do punktu 0.2.

### 0.2 — Zainstaluj Node.js (tylko jeśli w 0.1 wyszedł błąd)

1. Otwórz przeglądarkę internetową, wejdź na stronę: **nodejs.org**
2. Zobaczysz dwa duże przyciski do pobrania — kliknij ten, który ma napis
   **"LTS"** (to skrót od "Long Term Support", czyli wersja stabilna,
   zalecana — nie klika się w tę drugą, nowszą, eksperymentalną).
3. Pobierze się plik instalacyjny (nazwa w stylu `node-v20.x.x-x64.msi`).
   Otwórz go (kliknij dwa razy) z folderu Pobrane.
4. Instalator poprowadzi Cię przez kilka ekranów — na każdym klikaj "Next"
   / "Dalej", zostawiając wszystko w ustawieniach domyślnych (nic nie trzeba
   zmieniać), aż do przycisku "Install"/"Zainstaluj", a na końcu
   "Finish"/"Zakończ".
5. **WAŻNE:** zamknij okno terminala, które miałeś otwarte, i otwórz je
   ponownie (powtórz punkt 0.1, kroki 1-2) — inaczej komputer nie "zobaczy"
   nowo zainstalowanego programu.
6. Wpisz ponownie `node -v` i sprawdź, czy teraz pokazuje numer wersji.
   Jeśli tak — instalacja się udała, idź do punktu 0.3. Jeśli nadal błąd —
   napisz do mnie z dokładną treścią błędu.

### 0.3 — Sprawdź, czy masz najnowszą wersję kodu appki

W tej samej sesji, w której piszę do Ciebie tę procedurę, wprowadziłem
zmiany w kodzie appki (m.in. logowanie kodem z maila zamiast linkiem).
Próbowałem je automatycznie wysłać na Twój komputer, do folderu
`Asystent Gamechange` na pulpicie, ale to akurat nie zadziałało (most
łączący mnie z Twoim komputerem nie odpowiadał w tamtym momencie). Dostałeś
te pliki bezpośrednio w naszej rozmowie (do pobrania) — jeśli nie masz
pewności, czy są już na miejscu w folderze na pulpicie, napisz mi o tym,
zanim przejdziesz dalej, dopilnuję żeby tam trafiły.

### 0.4 — Otwórz terminal w folderze appki

1. Otwórz Eksplorator Windows (żółta ikonka folderu na pasku zadań) i
   przejdź do folderu **`Asystent Gamechange`** na Twoim Pulpicie.
2. Wewnątrz tego folderu: przytrzymaj klawisz **Shift** na klawiaturze i,
   trzymając go wciśniętym, kliknij prawym przyciskiem myszy w puste
   miejsce (nie na żaden plik, tylko na "puste tło" folderu).
3. Z menu, które się pojawi, wybierz opcję **"Otwórz okno PowerShell tutaj"**
   (w nowszych Windows może to być **"Otwórz w terminalu"**).
4. Otworzy się terminal, już ustawiony na ten konkretny folder (zobaczysz
   ścieżkę do folderu w treści okna, coś jak
   `PS C:\Users\Kuba\Desktop\Asystent Gamechange>`).

**Jeśli nie widzisz tej opcji w menu:** kliknij prawym przyciskiem na sam
folder (nie wchodząc do środka) → "Otwórz w terminalu", albo napisz do
mnie, pokażę alternatywny sposób.

### 0.5 — Zainstaluj "klocki", z których zbudowana jest appka

1. W otwartym terminalu wpisz dokładnie:
   ```
   npm install
   ```
   i naciśnij Enter.
2. Zacznie się dziać dużo rzeczy na ekranie — dużo tekstu, pasek postępu,
   to normalne. Może to potrwać od 1 do kilku minut, zależnie od szybkości
   internetu.
3. **Co może pójść nie tak (i to jest w porządku, nie panikuj):** wersje
   niektórych "klocków" w tej appce są ustawione na "najnowsze dostępne" i
   nigdy nie zostały przetestowane razem w praktyce (mój komputer roboczy
   miał zablokowany dostęp do internetu w tym miejscu, więc nie mogłem
   tego sprawdzić za Ciebie). Jeśli po zakończeniu zobaczysz czerwony
   tekst z napisem "error" — **zaznacz cały czerwony fragment myszką,
   skopiuj (Ctrl+C) i wklej do wiadomości do mnie w całości**, zanim
   spróbujesz cokolwiek naprawiać sam. Naprawię to i wrócisz do tego
   samego miejsca.
4. Jeśli na końcu zobaczysz coś w stylu "added 900 packages" (bez
   czerwonego "error" nad tym) — udało się, przejdź dalej.

### 0.6 — Uruchom appkę

1. W tym samym terminalu wpisz:
   ```
   npx expo start
   ```
   i naciśnij Enter.
2. Poczekaj chwilę — w terminalu pojawi się duży kwadratowy wzór złożony
   z czarno-białych kwadracików. To jest **kod QR** — appka na telefonie
   robi nim "zdjęcie" zamiast wpisywania adresu strony.

### 0.7 — Zainstaluj appkę "Expo Go" na telefonie

To jest darmowa appka pomocnicza (od tej samej firmy co narzędzie, którego
używamy do budowania appki), która na razie pozwoli Ci zobaczyć naszą
appkę na telefonie, zanim zrobimy jej "właściwą" wersję instalacyjną
(to będzie dopiero w Etapie 5).

1. Na telefonie otwórz sklep z appkami: **App Store** (iPhone) albo
   **Google Play** (Android/Samsung).
2. Wyszukaj: **Expo Go**
3. Zainstaluj (przycisk "Pobierz"/"Zainstaluj", appka jest darmowa).

### 0.8 — Otwórz appkę Gamechange na telefonie

**Na iPhonie:**
1. Otwórz appkę **Aparat** (zwykły aparat do zdjęć).
2. Wyceluj w kod QR widoczny w terminalu na komputerze.
3. Na górze ekranu telefonu pojawi się żółty pasek/powiadomienie — dotknij
   go, żeby otworzyć w Expo Go.

**Na Androidzie:**
1. Otwórz appkę **Expo Go**, którą zainstalowałeś w punkcie 0.7.
2. W appce znajdź przycisk "Scan QR code" (zeskanuj kod QR) — zwykle na
   głównym ekranie appki.
3. Wyceluj telefonem w kod QR widoczny w terminalu.

**Poczekaj chwilę** (appka może się ładować do minuty za pierwszym razem)
— powinna otworzyć się nasza appka, z ekranem logowania i polem na email.

**Jeśli nic się nie otwiera / appka pokazuje czerwony ekran z błędem:**
zrób zrzut ekranu telefonu i wyślij mi go razem z opisem, na którym
dokładnie punkcie jesteś.

### 0.9 — Przetestuj logowanie

1. Na ekranie appki wpisz swój adres email w pole tekstowe.
2. Dotknij przycisku **"Wyślij kod logowania"**.
3. Sprawdź skrzynkę mailową na telefonie albo komputerze (sprawdź też
   folder Spam/Wiadomości-śmieci, jeśli nic nie widać w Odebranych po
   minucie).
4. W mailu powinieneś zobaczyć **6-cyfrowy kod** (np. "482913"). Wróć do
   appki, wpisz ten kod w pole, które się pojawiło, i dotknij
   **"Zaloguj się"**.
5. **Jeśli się uda:** appka pokaże 7 zakładek na dole ekranu (Dziennik,
   Cele, Centrum Decyzji, Kalendarz, Profil, Diagnoza, Mecz). 🎉 Ten etap
   jest zaliczony — przejdź do Etapu 1.
6. **Jeśli w mailu widzisz TYLKO link/przycisk, a NIE widzisz 6-cyfrowego
   kodu** — to jest dokładnie sprawa opisana w Etapie 2 niżej (trzeba
   poprawić treść szablonu maila w Supabase). Przejdź od razu do Etapu 2,
   zrób go, i wróć tutaj, żeby spróbować ponownie.

**Zostaw to okno terminala otwarte** (albo pamiętaj, że możesz je otworzyć
ponownie w ten sam sposób co w punkcie 0.4 + wpisać `npx expo start`
ponownie za każdym razem, gdy chcesz sprawdzić appkę).

---

## ETAP 1 — Załóż potrzebne konta

**Po co ten etap:** żeby appka mogła trafić na prawdziwy telefon (nie tylko
przez appkę pomocniczą Expo Go) i do sklepów Apple/Google, potrzebne są
4 konta. Możesz robić te 4 rzeczy w dowolnej kolejności, równolegle z
innymi etapami, w wolnych chwilach — załóż je jak najwcześniej, bo
weryfikacja czasem trwa kilka dni.

### 1.1 — Konto Apple Developer (99 USD / rok, ok. 400-450 zł)

1. Wejdź na stronę: **developer.apple.com/programs/enroll**
2. Zaloguj się swoim Apple ID (tym samym, którego używasz do iPhone'a /
   iCloud). Jeśli nie masz Apple ID — załóż je najpierw na stronie
   **appleid.apple.com** (to zwykłe, darmowe konto Apple, jak każde inne).
3. Strona zapyta, czy rejestrujesz się jako **"Individual"** (osoba
   prywatna) czy **"Organization"** (firma). **Wybierz "Individual"** —
   jest szybsze, nie wymaga specjalnego numeru rejestracyjnego firmy.
   Appka i tak będzie się nazywać "Gamechange" dla wszystkich użytkowników
   — ten wybór wpływa tylko na to, czyje imię i nazwisko widnieje jako
   "deweloper" w drobnym druku w App Store. Można to zmienić w przyszłości,
   jeśli zechcesz zarejestrować firmę — to osobna, dłuższa procedura, nie
   teraz.
4. Podążaj za instrukcjami na ekranie: zapłać kartą (99 USD), uzupełnij
   dane.
5. Czasem Apple prosi o dodatkowe potwierdzenie tożsamości (np. zdjęcie
   dowodu osobistego) — może to wydłużyć proces o kilka dni. To normalne,
   nie martw się.
6. **Skąd wiesz, że się udało:** dostaniesz mail od Apple z potwierdzeniem
   aktywacji konta dewelopera (czasem po kilku dniach oczekiwania).

### 1.2 — Konto Google Play Console (25 USD jednorazowo, ok. 100 zł)

1. Wejdź na: **play.google.com/console/signup**
2. Zaloguj się swoim kontem Google (tym samym co np. do Gmaila).
3. Podobnie jak wyżej — wybierz typ konta "Individual" (osoba prywatna),
   szybsze niż "Organization".
4. Zapłać (25 USD, jednorazowo — to jedyna opłata, nie roczna jak Apple).
5. Google też czasem prosi o dodatkową weryfikację tożsamości i może być
   krótki okres oczekiwania, zanim konto będzie mogło publikować appki —
   zrób to jak najwcześniej, żeby nie czekać na to później.
6. **Skąd wiesz, że się udało:** zobaczysz swój panel Google Play Console
   z Twoim nazwiskiem/nazwą firmy w rogu.

### 1.3 — Konto Expo (darmowe)

1. Wejdź na: **expo.dev/signup**
2. Załóż konto — email + hasło, jak przy każdej innej stronie.
3. Wróć do terminala (ten sam, otwarty w folderze appki — patrz punkt 0.4,
   jeśli go zamknąłeś, otwórz od nowa) i wpisz:
   ```
   npx expo login
   ```
4. Wpisz email i hasło, które właśnie założyłeś.
5. **Skąd wiesz, że się udało:** terminal pokaże Twój login/nazwę
   użytkownika Expo.

### 1.4 — Projekt Firebase (darmowe)

1. Wejdź na: **console.firebase.google.com**
2. Zaloguj się tym samym kontem Google co w punkcie 1.2.
3. Kliknij przycisk **"Dodaj projekt"** / **"Add project"**.
4. Wpisz nazwę — może być dowolna, np. "gamechange-asystent" (użytkownik
   appki nigdy tej nazwy nie zobaczy, to tylko dla Ciebie/mnie).
5. Jeśli zapyta o Google Analytics — możesz to wyłączyć (przełącznik na
   "off"/"wyłączone"), niepotrzebne na razie, appka i tak zadziała bez
   tego.
6. Kliknij "Utwórz projekt"/"Create project", poczekaj chwilę aż się
   utworzy.
7. **Skąd wiesz, że się udało:** zobaczysz panel projektu z jego nazwą na
   górze.

---

## ETAP 2 — Popraw treść maila logowania w Supabase

**Po co ten etap:** appka wysyła teraz e-mail z 6-cyfrowym kodem
logowania (zamiast linku). Trzeba tylko sprawdzić, czy treść tego maila
faktycznie POKAZUJE ten kod — to jest ustawienie treści wiadomości, NIE
zmiana zabezpieczeń konta, więc jest to całkowicie bezpieczne do zrobienia
samodzielnie.

1. Wejdź na: **supabase.com/dashboard**
2. Zaloguj się (to konto, którego już wcześniej używałeś do tego
   projektu).
3. Wybierz projekt appki Gamechange z listy (jeśli masz tylko jeden
   projekt, otworzy się od razu).
4. Po lewej stronie ekranu znajdź menu i kliknij **"Authentication"**.
5. W menu, które się rozwinie, kliknij **"Email Templates"**.
6. Z listy szablonów wybierz ten, który nazywa się **"Magic Link"**.
7. Zobaczysz okno z treścią maila (może być w formie kodu HTML — to
   normalne, nie musisz go rozumieć).
8. Sprawdź, czy gdziekolwiek w tej treści występuje fragment:
   `{{ .Token }}`
   (dokładnie w takiej formie, z podwójnymi klamrami).
   - **Jeśli TAK** — nic nie musisz robić, ten etap jest już gotowy.
   - **Jeśli NIE** (widzisz tylko przycisk/link typu "Log In") — dopisz
     gdziekolwiek w treści (np. na końcu) zdanie:
     ```
     Twój kod logowania: {{ .Token }}
     ```
9. Jeśli coś dopisałeś — kliknij przycisk **"Save"** / **"Zapisz"** na
   dole ekranu.
10. **Skąd wiesz, że się udało:** wróć do appki na telefonie (Etap 0,
    punkt 0.9), spróbuj się zalogować jeszcze raz — w nowym mailu
    powinieneś teraz zobaczyć 6-cyfrowy kod.

---

## ETAP 3 — Skonfiguruj powiadomienia push w Firebase

**Po co ten etap:** appka ma wysyłać powiadomienia na telefon (np.
przypomnienie o wpisie w Dzienniku). Do tego potrzebne jest połączenie
appki z systemem Firebase (Google) i Apple. To najdłuższy etap — rób go
spokojnie, punkt po punkcie.

### 3.1 — Dodaj appkę Android w Firebase

1. Wejdź do projektu Firebase założonego w punkcie 1.4
   (console.firebase.google.com → wybierz swój projekt).
2. Kliknij małą ikonę zębatki (⚙) obok napisu "Project Overview" w lewym
   górnym rogu → z menu wybierz **"Project settings"**.
3. Przewiń w dół do sekcji **"Your apps"** (Twoje aplikacje).
4. Kliknij ikonę wyglądającą jak mały robocik Android (zielona ikonka).
5. Otworzy się formularz "Add Firebase to your Android app":
   - W polu **"Android package name"** wpisz DOKŁADNIE, litera po literze,
     bez spacji, wielkimi/małymi tak jak tu:
     ```
     com.gamechange.asystent
     ```
   - W polu "App nickname" (opcjonalne) możesz wpisać np. "Gamechange
     Android" — to tylko dla Twojej orientacji, nieistotne dla appki.
   - Pole "Debug signing certificate" zostaw puste.
6. Kliknij **"Register app"** / "Zarejestruj aplikację".
7. Na kolejnym ekranie pojawi się przycisk **"Download google-
   services.json"** — kliknij go. Pobierze się plik o nazwie
   `google-services.json`.
8. Skopiuj ten pobrany plik (zwykle ląduje w folderze "Pobrane") do
   folderu appki na pulpicie: **`Asystent Gamechange`** — wklej go tak,
   żeby leżał BEZPOŚREDNIO w tym folderze, obok pliku o nazwie `app.json`
   (nie twórz nowego podfolderu, ma być na tym samym "poziomie").
9. Na stronie Firebase możesz kliknąć "Next"/"Dalej" kilka razy, aż
   dotrzesz do końca (kroki o "dodaniu SDK" możesz pominąć — to dotyczy
   appek pisanych inaczej niż nasza, u nas to załatwia Expo automatycznie).
10. **Napisz do mnie, że plik `google-services.json` jest już w folderze**
    — dopiszę jedną linijkę w pliku konfiguracyjnym appki, żeby appka
    wiedziała, że ma z niego skorzystać. To bezpieczna, drobna zmiana,
    zrobię ją od razu po Twojej wiadomości.

### 3.2 — Dodaj appkę iOS w Firebase

1. Wróć do tego samego miejsca co w punkcie 3.1 (Project settings → Your
   apps).
2. Kliknij ikonę Apple (szara ikonka jabłuszka) → "Add app".
3. W polu **"Apple bundle ID"** wpisz DOKŁADNIE:
   ```
   com.gamechange.asystent
   ```
   (identycznie jak dla Androida w punkcie 3.1)
4. Nazwa (opcjonalnie): np. "Gamechange iOS".
5. Kliknij "Register app" / "Zarejestruj aplikację".
6. Pobierz plik **`GoogleService-Info.plist`** (przycisk download na
   ekranie).
7. Skopiuj ten plik do TEGO SAMEGO folderu co w punkcie 3.1, krok 8:
   **`Asystent Gamechange`**, obok pliku `app.json`.
8. Kliknij "Next"/"Dalej" do końca (podobnie jak wyżej, kroki o SDK
   możesz pominąć).
9. **Napisz do mnie, że ten plik też jest już w folderze** — dopiszę
   analogiczną linijkę konfiguracyjną.

### 3.3 — Wygeneruj klucz APNs (Apple Push Notifications) w Apple Developer

1. Wejdź na: **developer.apple.com/account**
2. Zaloguj się (to samo konto co w Etapie 1.1).
3. Po lewej stronie znajdź i kliknij **"Certificates, Identifiers &
   Profiles"**.
4. W menu po lewej kliknij **"Keys"**.
5. Kliknij niebieski przycisk **"+"** (plus) w prawym górnym rogu, żeby
   dodać nowy klucz.
6. W polu "Key Name" wpisz dowolną nazwę, np. **"Gamechange Push Key"**.
7. Zaznacz checkbox (kwadracik do odhaczenia) przy opcji **"Apple Push
   Notifications service (APNs)"**.
8. Kliknij **"Continue"**, potem **"Register"**.
9. Na następnym ekranie pojawi się przycisk **"Download"** — kliknij go.
   Pobierze się plik z rozszerzeniem `.p8` (np. `AuthKey_ABC123XYZ.p8`).

   ⚠️ **BARDZO WAŻNE: ten plik da się pobrać TYLKO RAZ.** Jeśli
   zamkniesz tę stronę bez pobrania albo zgubisz plik, będziesz musiał
   wygenerować zupełnie nowy klucz od zera. Zapisz go od razu w
   bezpiecznym miejscu na dysku (np. w folderze appki, ale w osobnym
   podfolderze, żeby się nie pomieszał z resztą — np. `Asystent
   Gamechange\sekrety\`).

   🛑 **Nie wysyłaj mi tego pliku, nawet jeśli o to poproszę przez
   pomyłkę.** To prywatny klucz dostępu — zostaje wyłącznie u Ciebie i
   w jednym konkretnym miejscu na stronie Vercel (punkt 3.5 niżej), gdzie
   sam go wkleisz.

10. Na tym samym ekranie zanotuj sobie (np. w notatniku w telefonie, albo
    zrób zrzut ekranu):
    - **Key ID** — krótki ciąg liter/cyfr widoczny przy nazwie klucza,
      który właśnie utworzyłeś.
    - **Team ID** — widoczny w prawym górnym rogu strony Apple Developer,
      obok Twojego imienia/nazwy konta (kliknij tam, jeśli nie widać od
      razu — czasem trzeba rozwinąć menu konta).

### 3.4 — Wgraj klucz APNs do Firebase

1. Wróć do Firebase Console → Project Settings (jak w punkcie 3.1, krok
   2).
2. Kliknij zakładkę **"Cloud Messaging"** (u góry ekranu, obok "General").
3. Znajdź sekcję **"Apple app configuration"** (powinna pokazać appkę iOS,
   którą dodałeś w punkcie 3.2).
4. Przy napisie **"APNs Authentication Key"** kliknij przycisk
   **"Upload"**.
5. Wgraj plik `.p8` z punktu 3.3 (przeciągnij go albo kliknij i wybierz z
   folderu, gdzie go zapisałeś).
6. Wpisz **Key ID** i **Team ID**, które zanotowałeś w punkcie 3.3, krok
   10.
7. Kliknij **"Upload"** / "Zapisz".
8. **Skąd wiesz, że się udało:** przy sekcji "APNs Authentication Key"
   pojawi się informacja, że klucz jest już wgrany (np. widoczny Key ID).

### 3.5 — Klucz serwisowy Firebase → wklej do Vercel

To jest drugi, OSOBNY klucz od tego z punktu 3.3 — nie myl ich.

1. Firebase Console → Project Settings → zakładka **"Service accounts"**
   (obok "Cloud Messaging").
2. Kliknij przycisk **"Generate new private key"**.
3. Pojawi się okienko z ostrzeżeniem — kliknij **"Generate key"**, żeby
   potwierdzić.
4. Pobierze się plik JSON (długa nazwa, coś jak
   `gamechange-asystent-firebase-adminsdk-xxxxx.json`).
5. Otwórz ten plik w Notatniku: kliknij prawym przyciskiem na plik →
   "Otwórz za pomocą" → "Notatnik".
6. Zaznacz CAŁĄ zawartość pliku: kliknij gdziekolwiek w tekście, potem
   naciśnij **Ctrl + A** (zaznacza wszystko), potem **Ctrl + C**
   (kopiuje).
7. Otwórz nową kartę w przeglądarce, wejdź na: **vercel.com**
8. Zaloguj się (jeśli masz już konto Vercel od wcześniejszej pracy nad tym
   projektem — użyj tego samego).
9. Znajdź na liście projekt o nazwie **`gamechange-app`** (to inny projekt
   niż appka mobilna — to backend/serwer appki) i kliknij w niego.
10. Kliknij zakładkę **"Settings"** (u góry), potem po lewej **"Environment
    Variables"**.
11. Znajdziesz tam pole do dodania nowej zmiennej — będą dwa pola: "Key" (albo
    "Name") i "Value".
    - W polu **Key/Name** wpisz dokładnie:
      ```
      FIREBASE_SERVICE_ACCOUNT_JSON
      ```
    - W polu **Value** kliknij i wklej (Ctrl+V) to, co skopiowałeś w
      punkcie 6 (cały plik JSON jako jeden długi tekst).
12. Niżej będą checkboxy z napisami "Production", "Preview", "Development" —
    zaznacz przynajmniej **"Production"** (możesz zaznaczyć wszystkie
    trzy, to nie zaszkodzi).
13. Kliknij **"Save"**.
14. **Przy okazji sprawdź jedną rzecz:** na tej samej liście zmiennych
    poszukaj, czy istnieje już zmienna o nazwie `CRON_SECRET` (powinna być,
    bo używają jej inne, wcześniej zbudowane części tego projektu). Jeśli
    NIE istnieje — dodaj ją tak samo jak wyżej: w polu Key wpisz
    `CRON_SECRET`, a w polu Value wpisz dowolny długi losowy ciąg znaków
    (możesz go wygenerować np. na stronie **1password.com/password-
    generator** — ustaw długość np. 32 znaki, skopiuj wygenerowany ciąg).
    Zapisz sobie tę wartość gdzieś (np. w menedżerze haseł), na wszelki
    wypadek.
15. **Skąd wiesz, że się udało:** na liście zmiennych środowiskowych w
    Vercel zobaczysz `FIREBASE_SERVICE_ACCOUNT_JSON` (wartość będzie
    ukryta kropkami, to normalne — tak Vercel chroni sekrety).

---

## ETAP 4 — Wgraj dwa pliki na serwer (do INNEGO folderu niż appka mobilna)

**Po co ten etap:** appka na telefonie wysyła prośbę o powiadomienie do
serwera w internecie, a to serwer faktycznie je wysyła. Kod tego serwera
już przygotowałem — trzeba go tylko umieścić we właściwym miejscu. To
miejsce to NIE jest ten sam folder co appka mobilna (`Asystent
Gamechange`) — to inny, osobny folder/projekt na Twoim komputerze, w
którym trzymasz resztę strony internetowej Gamechange (ten z plikami typu
`/api/...`).

1. Otwórz na dysku ten drugi folder (repozytorium `gamechange-app`).
2. Weź plik `api_send_push.js`, który dostałeś ode mnie wcześniej
   (możesz go też znaleźć w Project Knowledge naszej rozmowy jako
   `claude/api_send_push.js`, jeśli go nie masz pod ręką — daj znać, wyślę
   ponownie).
3. Skopiuj ten plik do podfolderu `api` w tamtym repozytorium, i zmień mu
   nazwę na dokładnie: **`send-push.js`**
   (czyli ostateczna ścieżka to coś jak `gamechange-app\api\send-push.js`).
4. Analogicznie: weź plik `api_cron_send_notifications.js`, skopiuj do
   tego samego folderu `api`, zmień nazwę na: **`cron-send-notifications.js`**
5. Otwórz plik `vercel.json` w tamtym repozytorium (główny folder, nie w
   `api`) w Notatniku. Zamień CAŁĄ jego zawartość na treść z pliku
   `claude/asystent_vercel.json`, który mam zapisany w Project Knowledge —
   **jeśli wolisz, żebym to zrobił zamiast Ciebie, wklej mi najpierw
   aktualną zawartość tego pliku z Twojego komputera, a ja przygotuję
   dokładną, bezpieczną wersję do wklejenia, żeby nie nadpisać czegoś,
   czego nie widziałem.**
6. W folderze `gamechange-app` otwórz terminal (dokładnie tak samo jak w
   Etapie 0, punkt 0.4 — Shift + prawy klik → "Otwórz okno PowerShell
   tutaj").
7. Wpisz:
   ```
   npm install firebase-admin
   ```
   i poczekaj, aż się zainstaluje (podobnie jak w Etapie 0, punkt 0.5).
8. Zapisz te zmiany na GitHub tak, jak zwykle to robisz w tym projekcie
   (czyli: dodaj zmienione/nowe pliki, zapisz commit z opisem, wypchnij
   na GitHub — dokładnie tak samo jak przy innych zmianach na tej stronie
   wcześniej). Jeśli nie pamiętasz dokładnie tych kroków, napisz do mnie,
   przypomnę Ci je szczegółowo.

---

## ETAP 5 — Pierwszy prawdziwy build appki

**Po co ten etap:** to moment, w którym appka przestaje być czymś, co
widzisz tylko przez appkę pomocniczą Expo Go, a staje się prawdziwym
plikiem instalacyjnym — takim, jaki później trafi do App Store/Google
Play.

1. Otwórz terminal w folderze appki mobilnej (Etap 0, punkt 0.4).
2. Wpisz:
   ```
   eas build --profile development --platform android
   ```
   i naciśnij Enter.
3. **Jeśli pojawi się błąd wspominający o brakującym pliku `eas.json`** —
   napisz do mnie od razu, przygotuję ten plik (to plik z ustawieniami
   budowania, mogę go dopisać zawczasu bez czekania na Ciebie, jeśli mi
   wcześniej dasz znać, że się do tego zbliżasz).
4. Terminal może zapytać Cię o kilka rzeczy — najbezpieczniejsza,
   zalecana odpowiedź na każde pytanie typu "czy mamy wygenerować i
   zarządzać certyfikatami/kluczami podpisywania za Ciebie?" to
   **"Yes"** (wpisz `y` albo użyj strzałek i Enter, zależnie jak pyta).
5. Poczekaj — budowanie dzieje się na serwerach Expo (w internecie, nie
   na Twoim komputerze), może potrwać od kilkunastu minut do godziny.
   W terminalu pojawi się link do strony, na której widać pasek postępu —
   możesz go otworzyć w przeglądarce, żeby obserwować.
6. Powtórz dokładnie to samo dla iPhone'a, wpisując:
   ```
   eas build --profile development --platform ios
   ```
7. **Gdy Android build się skończy:** dostaniesz w terminalu link/kod QR
   do pobrania pliku `.apk` — otwórz ten link na telefonie z Androidem
   (albo zeskanuj kod QR aparatem), telefon zapyta, czy zainstalować plik
   spoza sklepu — potwierdź (na Androidzie czasem trzeba dodatkowo
   zezwolić na "instalację z nieznanych źródeł" w ustawieniach — telefon
   sam Cię o to zapyta, jeśli będzie trzeba, i pokaże jak to zrobić).
8. **Gdy iOS build się skończy:** proces jest odrobinę bardziej złożony,
   bo Apple wymaga dodania Twojego konkretnego iPhone'a do listy "urządzeń
   testowych" — terminal (`eas build`) zwykle prowadzi Cię przez to
   automatycznie, zadając pytania w stylu "czy chcesz zarejestrować to
   urządzenie?" — odpowiadaj **"Yes"**. Na koniec dostaniesz link do
   zainstalowania na iPhonie.
9. Zainstaluj appkę na telefonie (jednym albo obu, jeśli masz oba typy
   telefonów) i przetestuj:
   - logowanie kodem z maila (Etap 0, punkt 0.9),
   - czy wszystkie 7 zakładek na dole się otwierają i nie pokazują
     czerwonych ekranów błędu,
   - (dopiero jeśli skończyłeś już Etap 3 i 4) czy dochodzi powiadomienie
     push — o to napisz do mnie osobno, kiedy dojdziesz do tego punktu,
     przygotuję Ci prosty sposób na wywołanie testowego powiadomienia od
     razu, zamiast czekać na naturalny harmonogram (który sprawdza co
     około 2 godziny).

**Zatrzymaj się tutaj i napisz mi, jak poszło.** Jeśli wszystko działa —
przygotuję dokładnie tak samo szczegółowe kolejne kroki: build "prawdziwy"
(produkcyjny) i wysłanie go do TestFlight (Apple) oraz Google Play
Internal Testing (Android), czyli miejsca, z którego będziesz mógł już
dodawać innych ludzi (np. zawodników z klubu) do testowania appki.

---

## Co robić, gdy utkniesz (dotyczy każdego etapu wyżej)

1. **Nie próbuj zgadywać ani "kombinować".** Zatrzymaj się dokładnie w tym
   miejscu, w którym coś nie zgadza się z opisem.
2. Zrób zrzut ekranu (Print Screen, albo Windows + Shift + S żeby
   zaznaczyć fragment) tego, co widzisz.
3. Napisz do mnie: (a) na którym punkcie jesteś (np. "Etap 3, punkt 3.4"),
   (b) co dokładnie zrobiłeś, (c) co się stało zamiast tego, czego
   oczekiwałeś, (d) dołącz zrzut ekranu albo pełną treść błędu
   (skopiowaną, nie przepisaną ręcznie — treść błędów bywa bardzo
   dokładna i ważna).
4. Poczekaj na moją odpowiedź, zanim spróbujesz czegoś innego na własną
   rękę na tym samym etapie — łatwiej naprawić jedną rzecz naraz niż kilka
   nawarstwionych prób.
