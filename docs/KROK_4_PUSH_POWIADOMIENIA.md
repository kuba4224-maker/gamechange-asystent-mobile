# Krok 4 — Powiadomienia push (priorytet Kuby)

Ten dokument NIE jest kontraktem zachowania (jak `KONTRAKT_*.md` dla ekranów
Fazy 2) — powiadomienia push to NOWA funkcjonalność bez odpowiednika w
`asystent_app.html`/web (PWA ma tylko szkielet pod web push/VAPID, którego
architektura mobilna świadomie NIE używa — patrz
`APLIKACJA_MOBILNA_ARCHITEKTURA_I_RYZYKA.md`, sekcja 0). Zamiast kontraktu —
status wykonania checklisty Kroku 4 i miejsce na wszystkie założenia, które
Kuba powinien przejrzeć.

## AKTUALIZACJA 28.07.2026 — luka #3 niżej ZAMKNIĘTA

`app/(tabs)/kalendarz.tsx` w repo mobilnym ma teraz `'match': 'Mecz'` w
`EVENT_TYPE_LABELS` — zawodnik może zaplanować nadchodzący mecz w
Kalendarzu (tytuł/data/notatka, jak każde inne wydarzenie). To WYŁĄCZNIE
zaplanowanie na przyszłość, coś innego niż zakładka Mecz (tam loguje się
WYNIK już rozegranego meczu, osobna tabela `match_contexts`) — nie miesza
się z tamtą logiką. Rytm `pre_match` w `cron-send-notifications.js` (kod
już wcześniej gotowy) będzie teraz realnie miał z czego korzystać, ale
NADAL nieprzetestowane na żywo (czeka na wgranie plików do repo
`gamechange-app`, konta Firebase/APNs i faktyczny build — patrz sekcja
"Co zostaje wyłącznie po stronie Kuby" niżej). Założenie #3 w liście niżej
zostaje jako zapis historyczny (co było nie tak i dlaczego), nie usunięte.

## Co jest zrobione (`[COWORK]`, w tym repo — `gamechange-asystent-mobile`)

- **4.5** `expo-notifications` już w `package.json` (dodane przy Kroku 1),
  plugin dodany do `app.json` (`expo.plugins`) z kolorem/ikoną powiadomienia.
- **4.6** `lib/push-notifications.ts` — rejestracja tokenu:
  - `usePushRegistration(currentUser)` — po zalogowaniu sprawdza status
    uprawnień; jeśli już przyznane, cicho pobiera token
    (`getDevicePushTokenAsync()` — surowy token FCM/APNs, CELOWO NIE
    `getExpoPushTokenAsync()`, patrz architektura 6.3) i zapisuje przez
    `upsert` (`on_conflict: token`) do **istniejącej** tabeli `push_tokens`
    (Domena 09) — zero zmian w schemacie.
  - Jeśli status to `undetermined`, pokazuje `PushPrimingBanner` (ekran
    "priming" PRZED systemowym oknem zgody — mitygacja ryzyka R9) zamiast
    od razu wywoływać systemowe okno.
  - `unregisterPushToken()` — wołane w `signOut()` (`lib/auth-context.tsx`)
    — usuwa własny wiersz `push_tokens` tego urządzenia przy wylogowaniu
    (zgodnie z komentarzem w SQL Domeny 09 o poprawnym przepływie zmiany
    użytkownika na tym samym urządzeniu).
- **components/PushPrimingBanner.tsx** — UI bannera, wpięty w
  `app/_layout.tsx` nad `<Slot />` (widoczny niezależnie od aktywnej
  zakładki).
- **(28.07.2026)** `app/(tabs)/kalendarz.tsx` — opcja `match` w formularzu
  dodawania wydarzenia (patrz aktualizacja na górze tego dokumentu).

## Co jest zrobione (`[COWORK]`, dla OSOBNEGO repo `gamechange-app`)

Te dwa pliki **NIE są częścią repo mobilnego** — trafiają do repo backendu
(`gamechange-app`, gdzie żyją wszystkie `/api/*.js`), zgodnie z checklistą.
Dostarczone Kubie osobno + zapisane w Project Knowledge jako
`claude/api_send_push.js` i `claude/api_cron_send_notifications.js`:

- **4.7** `api_send_push.js` → docelowo `/api/send-push.js` — `firebase-admin`,
  eksportuje `sendPush(tokens, {title, body, data})`, wołane IN-PROCESS
  (ten sam wzorzec co `email-sender.js`/`sendEmail`).
- **4.8** `api_cron_send_notifications.js` → docelowo
  `/api/cron-send-notifications.js` — pięć rytmów F15, godzina lokalna
  ZAWSZE przez `Intl.DateTimeFormat` z `timeZone: 'Europe/Warsaw'` (nigdy
  stały offset, ryzyko R7).
- **4.9** `asystent_vercel.json` zaktualizowany — 12 nowych wpisów cron (co
  ~2h w ciągu doby UTC), wszystkie na `/api/cron-send-notifications`, obok
  już istniejącego wpisu `/api/cron-onboard-diagnosis`.

**Nowa zależność do dodania w `gamechange-app`:** `firebase-admin` (`npm
install firebase-admin`) — nie jest jeszcze w tamtym repo. **Stan
28.07.2026: te pliki WCIĄŻ nie są wgrane do repo `gamechange-app`** —
potwierdzone ponownie (Cowork nie ma dostępu do tego repo/folderu ani
connectora GitHub w tej organizacji) — patrz `docs/PROCEDURA_KROK_PO_KROK.md`,
Etap 4, dla dokładnej instrukcji dla Kuby.

## Założenia wymagające przeglądu Kuby (nie 🛑 STOP, ale wpływają na działanie)

1. **`notification_preferences` (Domena 09) ma tylko `preferred_time`
   (godzina), BEZ dnia tygodnia** — rytm "tygodniowo" ma dzień ustalony na
   sztywno w kodzie (niedziela), tylko godzina jest personalizowana.
2. **Domyślne godziny dla użytkowników bez wiersza w
   `notification_preferences`** (co jest poprawnym, przewidzianym stanem —
   SQL: "brak wiersza = wartość domyślna, włączone") — 08:00 dla
   `morning_readiness`, 19:00 dla `weekly_summary`. To robocze wartości, nie
   opisane w żadnym dokumencie źródłowym — "system uczy się rytmu i
   dopasowuje timing" (F15) NIE jest zaimplementowane, to przyszła praca.
3. ~~**`pre_match` zależy od `calendar_events.event_type='match'`**~~ —
   **ZAMKNIĘTE 28.07.2026, patrz aktualizacja na górze dokumentu.** (Zapis
   historyczny: Domena 09 dodała tę wartość do CHECK bazy właśnie pod ten
   rytm, ale żaden frontend nie dawał zawodnikowi sposobu na faktyczne
   utworzenie wydarzenia typu `match` w kalendarzu — teraz daje.)
4. **Cztery z pięciu rytmów bez deduplikacji w bazie** (tylko
   `contextual_insight` ma `decision_recommendations.notified_at`) —
   poprawność przeciw duplikatom opiera się na tym, że każdy z pozostałych
   rytmów trafia w DOKŁADNIE JEDNO stałe okno ~2h dziennie. Jeśli
   harmonogram w `vercel.json` kiedyś zmieni się na częstszy niż co 2h, te
   okna trzeba będzie zawęzić.
5. **Limit crona Vercel Hobby** ("raz dziennie na wpis", obejście przez 12
   osobnych wpisów zamiast jednego częstego) — zasady dostawców zewnętrznych
   się zmieniają; do zweryfikowania przez Kubę na stronie Vercel przed
   wdrożeniem, że ten limit nadal obowiązuje w tej samej formie (ten sam
   nawyk co przy weryfikacji Stripe/Vercel gdzie indziej w projekcie).

## Co zostaje wyłącznie po stronie Kuby (`[KUBA]`, konta/urządzenia)

- **4.1** Firebase Console → dodanie aplikacji Android (package
  `com.gamechange.asystent`) → pobranie `google-services.json` → dodanie do
  repo mobilnego obok `app.json` + dopisanie
  `"android": {"googleServicesFile": "./google-services.json"}`.
- **4.2** Firebase Console → dodanie aplikacji iOS (Bundle ID
  `com.gamechange.asystent`) → pobranie `GoogleService-Info.plist` →
  analogicznie `"ios": {"googleServicesFile": "./GoogleService-Info.plist"}`.
- **4.3** Apple Developer Portal → Keys → nowy klucz APNs → pobranie `.p8`,
  zanotowanie Key ID i Team ID.
- **4.4** Wgranie klucza `.p8` do Firebase Console → Cloud Messaging → iOS
  app configuration.
- Dodatkowo (wynika z 4.7 wyżej): Firebase Console → Project Settings →
  Service Accounts → Generate new private key → wklejenie całego JSON jako
  zmienna środowiskowa `FIREBASE_SERVICE_ACCOUNT_JSON` w Vercel (repo
  `gamechange-app`) + `CRON_SECRET` (jeśli jeszcze nie ustawiony — powinien
  już być, używany przez pozostałe cron endpointy).
- Wgranie `api_send_push.js`/`api_cron_send_notifications.js`/`vercel.json`
  do repo `gamechange-app` (patrz `docs/PROCEDURA_KROK_PO_KROK.md`, Etap 4).
- **4.10** Test dostarczenia push na trzech etapach osobno (ryzyko R5): build
  deweloperski → EAS Build (development/preview) na urządzeniu →
  TestFlight/Internal Testing.

Bez tych kroków `[KUBA]` kod jest kompletny, ale push realnie nie poleci —
`FIREBASE_SERVICE_ACCOUNT_JSON` brakujący rzuci czytelny błąd (patrz
`api_send_push.js`), nie cichą awarię.
