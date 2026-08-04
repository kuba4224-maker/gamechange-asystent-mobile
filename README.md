# gamechange-asystent-mobile

Natywna appka React Native (Expo Router) — migracja `asystent_app.html` (Asystent
Sportowca, 7 ekranów). Pełne uzasadnienie i metodologia: `APLIKACJA_MOBILNA_ARCHITEKTURA_
I_RYZYKA.md` i `APLIKACJA_MOBILNA_CHECKLISTA_WDROZENIA.md` w Project Knowledge
(Gamechange System).

## Status na 27.07.2026 (sesja Cowork)

Zrobione bez kont (Krok 1 checklisty, ręcznie napisane pliki — `npm install` NIE był
możliwy w tej sesji, patrz niżej):
- Struktura Expo Router: `app/(tabs)/{dziennik,cele,centrum-decyzji,kalendarz,profil,
  diagnoza,mecz}.tsx` — placeholdery, gotowe pod Fazę 2.
- `app.json` — draft z `com.gamechange.asystent` (do potwierdzenia z Kubą przed
  pierwszym `eas build`, nie wcześniej).
- `package.json` — lista zależności z checklisty, wersje jako `"latest"` (NIE
  zweryfikowane względem rejestru npm w tej sesji — zrobić `npx expo install` zamiast
  ręcznego `npm install`, żeby dostać wersje zgodne z aktualnym SDK Expo).
- `lib/supabase.ts` — klient Supabase wg wzorca z checklisty (AsyncStorage jako
  storage), z tymi samymi `SUPABASE_URL`/`SUPABASE_KEY` co w `asystent_app.html`.

## Czego NIE zrobiono i dlaczego

- `npx create-expo-app` / `npm install` / `eas init` — środowisko sandboxa tej sesji
  Cowork zablokowało dostęp do `registry.npmjs.org` na poziomie sieci (błąd: "Host not
  in allowlist"). To nie jest kwestia brakujących kont, tylko ograniczenia sieciowego
  tego konkretnego środowiska wykonawczego. Pierwszy krok po pobraniu tego archiwum:
  `npm install` (albo `npx expo install <pakiet>` per pakiet) na komputerze z normalnym
  dostępem do internetu.
- `eas init` / `eas build:configure` — wymaga zalogowanego konta Expo (`expo.dev`).
- Ikony/splash (Krok 2) — czekają na logo od Kuby albo start od istniejących ikon PWA.

## Ważne odkrycie z tej sesji — do wyjaśnienia przed Fazą 2

Kopia `asystent_app.html` w Project Knowledge (zapisana 27.07.2026 15:23) zawiera 5
zmian opisanych w sekcji 0 architektury (endpoint `submit-recommendation-feedback`,
etykieta "Co teraz:", karta "Sugerowane na ten tydzień", kontekst Celu kierunkowego,
poprawiony tekst mostu diagnoza→konto). Sprawdzone bezpośrednio w tej sesji: wersja
NA PRODUKCJI (`gamechange-app.vercel.app/asystent_app.html`) i na GitHubie
(`raw.githubusercontent.com/kuba4224-maker/gamechange-app/main/asystent_app.html`) mają
TYLKO 2 z tych 5 zmian (kontekst Celu kierunkowego, tekst mostu diagnoza→konto) — brakuje
endpointu feedbacku, etykiety "Co teraz:" i karty Kalendarza. Innymi słowy: część zmian z
równoległej sesji Cowork trafiła do opisu w Project Knowledge, ale nie została (jeszcze?)
wypchnięta do repo/produkcji. Przy pisaniu kontraktów zachowania dla Kalendarza (Krok 8) i
Centrum Decyzji (Krok 11) zweryfikować to na nowo i ustalić, który stan jest faktycznie
docelowy.
