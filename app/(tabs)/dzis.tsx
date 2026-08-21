// Ekran DZIŚ — NOWY, Krok 2 Toru 7 (SESJA_START_UX_MOBILE_ONBOARDING_NAWIGACJA.md).
// Nowy ekran domowy appki, zastępuje Dziennik jako domyślna zakładka po
// zalogowaniu (patrz app/index.tsx).
//
// DECYZJA ODWRÓCONA 06.08.2026 (BRIEF_DELEGACJA_PROMINENCJA_CELU.md, zatwierdzone
// przez Kubę) — Cel aktywny jest tu dużym, stałym, PIERWSZYM elementem ekranu,
// nie small-printem. Rekomendacja training_focus stoi pod Celem, jawnie z nim
// powiązana (patrz `linkedToGoal` niżej).
//
// ═══════════════════════════════════════════════════════════════════
// JEDNA DROGA B2 08.08.2026 — SCALENIE Z CENTRUM DECYZJI
// (blok B1 „jedna droga, jeden słownik", claude/KREGOSLUP_PRODUKTU_I_DROGA_07_08_2026.md)
//
// PROBLEM, KTÓRY TO ZAMYKA: ten sam rekord bazy — najnowszy `training_focus` —
// był pokazywany w dwóch miejscach, pod dwiema nazwami („Co dziś zrobić" tutaj
// i „Priorytet tygodnia" w Centrum Decyzji), w dwóch ramach czasowych, z niemal
// identycznymi pustymi stanami. Na Dziś nie dało się kliknąć NIC poza przejściem
// dalej — przyciski Wykonałem / Nie wykonałem / Nie miało to sensu były o
// zakładkę dalej. Jedna rzecz, dwie drogi.
//
// CO SIĘ ZMIENIŁO:
//  1. Karta „Co dziś zrobić" pokazuje PEŁNĄ treść rekomendacji i ma realne
//     przyciski feedbacku. Zawodnik odpowiada systemowi bez opuszczania ekranu
//     domowego. Karta to `components/RecommendationCard.tsx` — TEN SAM komponent,
//     który renderuje Centrum Decyzji (zero drugiej kopii kodu karty).
//  2. Ten ekran oznacza jako przeczytaną WYŁĄCZNIE tę jedną rekomendację, którą
//     faktycznie pokazuje. Stary `markAsViewed()` w Centrum Decyzji oznaczał przy
//     każdym wejściu wszystkie wczytane rekomendacje, łącznie z tymi w ZWINIĘTEJ
//     historii — badge spadał do zera, choć zawodnik niczego nie przeczytał.
//  3. Reszta Centrum Decyzji (historia + specialist_referral / position_fit_signal /
//     coach_recommendation) jest dostępna z linku „Wszystkie rekomendacje" niżej.
//     Zakładka zniknęła z paska; trasa żyje (`href: null`, patrz (tabs)/_layout.tsx).
//  4. Wskaźnik pracy w hero Celu — „N z M sesji Bloku Skupienia zrobione",
//     policzone z `focus_blocks` + `calendar_events` + `daily_logs.calendar_event_id`.
//     To zamiennik dwóch wskaźników usuniętych w audycie 06.08.2026 („Aktywny od
//     N tygodni" mierzył upływ czasu i nagradzał stagnację; „N rekomendacji"
//     liczyło wszystkie typy wbrew własnej etykiecie). Ten mierzy PRACĘ.
//     Bez aktywnego Bloku pod tym Celem NIE pokazujemy zastępczej liczby, tylko
//     zaproszenie do zaplanowania pracy.
//
// CO USTĄPIŁO, ŻEBY EKRAN NIE URÓSŁ (zasada „jedno wchodzi, jedno wychodzi"):
//  • Linia „Twój profil z diagnozy →" przestała być osobnym blokiem 48 px pod
//    hero i weszła do środka hero, w jeden rząd z „Zobacz szczegóły celu →".
//    Merytorycznie to jej właściwe miejsce: diagnoza jest uzasadnieniem Celu.
//  • Sekcja „Dziś w kalendarzu" to JEDNA karta z listą pozycji, nie osobna karta
//    na każde wydarzenie. Przy trzech treningach dziennie oszczędza dwie karty.
//  • Z karty rekomendacji zniknął odsyłacz „Zobacz w Centrum Decyzji →" — jest
//    zbędny, skoro treść i przyciski są już tutaj.
//
// Świadomie NIE duplikuje ciężkiej logiki „znajdź wolny dzień w tygodniu"
// z app/(tabs)/kalendarz.tsx (computeCalendarSuggestion) — to jest ekran
// DZISIAJ, węższe pytanie niż planowanie na cały tydzień do przodu.
//
// ═══════════════════════════════════════════════════════════════════
// NAWIGACJA B3 08.08.2026 — HERO CELU KURCZY SIĘ, KALENDARZ I CELE
// WCHŁONIĘTE (decyzje B5 i B8, claude/DECYZJE_PRODUKTOWE_07_08_2026.md)
//
// 1. HERO CELU: ~220 dp → ~101 dp. Zostały trzy rzeczy: nazwa Celu, wskaźnik
//    pracy („3 z 6 sesji zrobione") i pasek. Zeszły do szczegółów Celu
//    (ekran `/cele`): kontekst „skąd się wziął" (`goalOriginContext`) i rząd
//    linków. CEL ZOSTAJE PIERWSZY — decyzja Kuby z 06.08.2026 jest w mocy,
//    tylko spełniona taniej.
//    PO CO TO: żeby przyciski feedbacku rekomendacji („Wykonałem / Nie
//    wykonałem / Nie miało to sensu") weszły NAD ZGIĘCIE. W rundzie 2 stały
//    ~607 dp od góry, czyli poniżej pierwszego ekranu na mniejszym telefonie
//    (iPhone SE ma ~598 dp widocznego obszaru) — jedyna akcja decyzyjna
//    zawodnika wymagała tam scrolla. Teraz ~491 dp, czyli z zapasem.
//    Pomiar i założenia: raport zwrotny B runda 3, sekcja 12.
//    CAŁY KAFELEK JEST PRZYCISKIEM do `/cele` — to są „szczegóły Celu".
//    Osobnych linków w hero nie ma: jeden kafelek, jedno miejsce docelowe.
//
// 2. LINK „TWÓJ PROFIL Z DIAGNOZY" WYPROWADZONY STĄD do zakładki „Ja"
//    (app/(tabs)/ja.tsx), gdzie stoi jako skrót profilu + wejście „Wynik
//    diagnozy". Nie zniknął — zmienił dom na ten, który powstał właśnie po to.
//
// 3. KALENDARZ jest wchłonięty przez ten ekran: zakładki „Kalendarz" nie ma
//    w pasku, trasa `/kalendarz` żyje (`href: null`), a karta „Dziś w
//    kalendarzu" niżej jest jej JEDYNYM wejściem — stąd link mówi wprost
//    „dodaj i zaplanuj", a nie tylko „otwórz". Formularz dodawania,
//    cykliczne, nadchodzące, minione i anulowane są nietknięte, jedno
//    dotknięcie stąd.
//
// ═══════════════════════════════════════════════════════════════════
// WIEDZA B4 08.08.2026 — PODPOWIEDŹ Z MATERIAŁU PRZY REKOMENDACJI
// (decyzje B1 i C1 warstwa 1, claude/DECYZJE_PRODUKTOWE_07_08_2026.md;
//  treść i kształt tabeli: claude/PODPOWIEDZI_Z_MATERIALOW_A.md 4.3 i 4.5)
//
// CO SIĘ ZMIENIŁO: pod przyciskami karty rekomendacji stoi jedna podpowiedź
// z materiałów Kuby, Z WIDOCZNYM ŹRÓDŁEM („Moc, s. 8"). To źródło jest całą
// różnicą — zdanie bez niego mógłby napisać dowolny model; zdanie z nim pochodzi
// z konkretnej strony konkretnej książki i da się je sprawdzić.
//
// SKĄD BIERZEMY DANE — i dlaczego tą drogą. Polecenie dawało dwie: (1) czytać
// podpowiedź już przypiętą do rekordu rekomendacji przez pas A tej samej rundy,
// (2) czytać `component_hints` bezpośrednio po `segment_id` aktywnego Celu.
// SPRAWDZIŁEM PIERWSZĄ: raportu A rundy 4 nie ma w pamięci projektu (najnowszy
// to `RAPORT_ZWROTNY_A_RUNDA_3.md`), więc kontraktu na przypięcie nie ma, a
// `RECOMMENDATION_COLUMNS` nie zawiera żadnej kolumny z podpowiedzią. Idę
// drugą drogą. Gdy pas A dopnie podpowiedź do rekordu, ten ekran przestawia się
// na nią zmianą w jednym miejscu (`loadHint`), bez ruszania reguł z
// `lib/componentHints.ts`.
//
// ⚠️ BRAMKA WIEKOWA (decyzja A9) jest twarda i jest w `lib/componentHints.ts`:
// poniżej 16 lat zawodnik nie dostaje podpowiedzi z dawkami suplementacyjnymi,
// a gdy appka NIE ZNA wieku — też ich nie dostaje. Appka zna wyłącznie rocznik
// (`users.birth_year`), więc liczymy wiek NAJNIŻSZY MOŻLIWY. Uzasadnienie
// kierunku błędu stoi przy `minimumPossibleAge`.
//
// ⚠️ REGUŁA R5: „nie ma tabeli" i „tabela jest, ale pusta" to DWIE RÓŻNE RZECZY
// i ekran je rozróżnia. Migracja `component_hints` (214 wierszy) czeka na
// wklejenie przez Kubę — do tego czasu ekran mówi wprost „materiały dla tego
// obszaru są w przygotowaniu", zamiast pokazać pustkę udającą, że nic nie ma.
//
// ═══════════════════════════════════════════════════════════════════
// WIEDZA B4 08.08.2026 — STAN ŁADOWANIA (dług N2 / znalezisko B18, otwarte
// od rundy 2). `loading` było ustawiane i NIGDY nie czytane: przy pierwszym
// wejściu zawodnik widział przez chwilę „Nie masz jeszcze Celu" i pusty stan
// rekomendacji, po czym ekran się przemalowywał. To nie jest kosmetyka —
// pierwsze zdanie, jakie appka mówi zawodnikowi po zalogowaniu, brzmiało
// nieprawdziwie. `loading` startuje jako `true` i schodzi do `false` po
// pierwszym `load()`; kolejne odświeżenia (`useFocusEffect`, `RefreshControl`)
// go NIE podnoszą, bo wtedy na ekranie są już prawdziwe dane i migotanie
// byłoby gorsze niż jego brak.
import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { toLocalDateStr, DAYS_OF_WEEK } from '../../lib/date-utils';
// NAWIGACJA B3 08.08.2026 — `goalOriginContext` (lib/goal-prominence.ts) stracił
// tu konsumenta razem ze skurczeniem hero (punkt 1 w nagłówku). Plik ZOSTAJE
// nietknięty; kontekst „skąd się wziął ten Cel" należy teraz do szczegółów Celu
// na ekranie `/cele`, gdzie jest miejsce, żeby go rozwinąć, a nie skracać.
// JEDNA DROGA B2 08.08.2026 — jedno źródło nazw segmentów (lib/labels.ts);
// lokalna kopia 13 nazw usunięta, treść niezmieniona co do znaku.
import { SEGMENT_LABELS } from '../../lib/labels';
// ⭐ PLAN-D-F1 08.2026 (15.08.2026) — SILNIK NA EKRAN.
//
// Do tego pasa ten plik importował WYŁĄCZNIE `computeFocusBlockProgress`,
// czyli jedną funkcję z pięciu, które `lib/focusBlockProgress.ts` oferuje.
// Pozostałe były zbudowane, sprawdzone 63 asercjami i NIEWIDOCZNE: pas A1
// dołożył 14.08 trzeci stan „NIE WIEM" i zostawił w komentarzu zdanie
// „podmiana wywołania jest KONTRAKTEM dla pasa T", a pas E2 dołożył 15.08
// drugą liczbę i sam napisał: „druga liczba tego pasa też bez konsumenta —
// wzorzec, nie przypadek". Ten import jest wykonaniem obu tych kontraktów.
//
// ⛔ `computeFocusBlockProgress` NIE JEST TU JUŻ IMPORTOWANE i to nie jest
// sprzątanie: dopóki stało w tym pliku, każdy, kto poprawiał ekran, miał pod
// ręką wersję BEZ trzeciego stanu i wybierał ją, bo była krótsza. Funkcja
// zostaje w `lib/` (woła ją `computeFocusBlockProgressState` w środku, ma
// własne asercje), ale ekran nie ma już jak jej wybrać.
// ⭐ PLAN-D-S2 18.08.2026 — `policzPraceWeWszystkichBlokach` ZDJĘTE Z TEGO
// PLIKU. Ekran wołał je do 18.08 i wyrzucał wynik do `console.log`: pas A1
// zdjął `renderPracaWBlokach` (~120 dp), a nikt nie postawił go z powrotem.
// Liczba i jej rysowanie stoją od dziś RAZEM, w `components/PracaWLiczbach.tsx`
// (Profil → „Skąd to wiemy"). Tutaj zostaje wyłącznie stan postępu Bloku —
// bo ma tu ŻYWEGO konsumenta: `maAktywnyBlok` w jednej odpowiedzi.
import {
  computeFocusBlockProgressState,
  type FocusBlockProgressState,
} from '../../lib/focusBlockProgress';
// WIEDZA B4 08.08.2026 — wszystkie reguły podpowiedzi (bramka wiekowa A9,
// rozróżnienie R5, wybór jednej z kilkunastu) siedzą w czystych funkcjach
// z własnym selftestem. Tutaj zostaje wyłącznie zapytanie i rysowanie.
import {
  COMPONENT_HINT_COLUMNS,
  // ZAPIS B7 08.08.2026 (M19) — treść zawsze widoczna: rozszerzona lista kolumn
  // + ścieżka odzysku, gdy migracja `zawsze_widoczna` nie jest wklejona.
  COMPONENT_HINT_COLUMNS_WITH_ALWAYS,
  shouldRetryWithoutAlwaysVisible,
  ALWAYS_VISIBLE_COLUMN_MISSING_WARN,
  buildHintState,
  minimumPossibleAge,
  hintKindLabel,
  hintEyebrow,
  // ⚠️ PLAN-D-T 08.2026 — `HINT_EYEBROW` stracił tu konsumenta razem
  // z kafelkiem stanów R5 podpowiedzi. Stała ZOSTAJE w lib/componentHints.ts:
  // czyta ją `hintEyebrow()`, którego ten ekran nadal używa dla treści zawsze
  // widocznej. Zniknął import, nie stała.
  HINT_TABLE_MISSING_TEXT,
  HINT_ERROR_TEXT,
  HINT_EMPTY_TEXT,
  type ComponentHintRow,
  type HintState,
} from '../../lib/componentHints';
// ZAPIS B7 08.08.2026 (M23/B35) — „Nowa porcja w Twoim Bloku": odczyt dawki
// i listy „przeczytane" tymi samymi czystymi funkcjami co ekran Bloku.
import {
  CONTENT_DOSE_COLUMN,
  CONTENT_DOSE_SEEN_COLUMN,
  CONTENT_DOSE_SEEN_COLUMN_MISSING_WARN,
  isMissingContentDoseColumnError,
  isMissingSeenColumnError,
  parseContentDoses,
  parseSeenKeys,
  isDoseSeen,
} from '../../lib/contentDose';
// ⭐ PAS W1 18.08.2026 — `wymiary`, `barwaObciazenia`, `wysokoscObciazenia`
// i `TOR_SLUPKA_DP` przychodzą Z TEGO SAMEGO MODUŁU co kolory. ⛔ Ekran
// nie trzyma ani jednej z tych liczb sam — to jest cały KROK 2 polecenia.
import {
  colors, typography, spacing, radii, minTouchHeight, skew,
  wymiary, barwaObciazenia, wysokoscObciazenia, TOR_SLUPKA_DP,
} from '../../constants/theme';
// PLAN-D-E 12.08.2026, zaktualizowane 12.08.2026 wieczorem — ZASADA PUNKTU
// POMOCY I JEJ JEDYNY WYJATEK. Czytaj razem z komentarzem "ZADANIE E2" nizej;
// wczesniej te dwa miejsca mowily co innego, a to jest dokladnie taki defekt,
// ktory nastepna sesja rozstrzyga po tym, na ktory komentarz trafi pierwsza.
//
// ZASADA (decyzja Kuby z 12.08.2026): zadnego przycisku pomocy na ekranach,
// na ktorych stoja glowne rzeczy produktu. Podstawowe wejscie to nazwany wiersz
// w sekcji "Pomoc" na dole zakladki "Ja". NIE DOKLADAC tu nic "przy okazji".
// `paddingBottom` zostaje 60 dp.
//
// WYJATEK ("ZADANIE E2", pas F, 12.08.2026): wiersz pomocy pokazuje sie na tym
// ekranie przy glosie `injury` albo `exit` — i przy zadnym innym. Warunek stoi
// w jednym miejscu: `podniescPunktPomocy()` w `lib/glosTygodnia.ts`.
// DECYZJA KUBY z 12.08.2026, wieczorem: ZOSTAWIC TAK, JAK JEST. Wyjatek jest
// zatwierdzony przez wlasciciela produktu i przestaje byc otwarta sprawa
// (znalezisko E-N15 w `claude/RAPORT_E_OS_DECYZJI_11_08_2026.md` — zamkniete).
// Zakres wyjatku jest ZAMKNIETY na dwa stany: `injury` i `exit`. Dolozenie
// trzeciego stanu, drugiego ekranu albo drugiego wejscia jest cofnieciem
// decyzji wlasciciela, nie ulepszeniem — tego dotyczy ZASADA wyzej.
import RecommendationCard, { RECOMMENDATION_COLUMNS, type Recommendation } from '../../components/RecommendationCard';
// PLAN-D-F 08.2026 (12.08.2026) — GŁOS TYGODNIA. Ekran czyta gotowy wiersz
// `weekly_voice`; drabinę liczy backend (gamechange-app/lib/arbiter-glosu.js,
// wołany raz dziennie przez api/cron-weekly-voice.js). Appka NIE rozstrzyga,
// kto ma głos — czyta wynik i decyduje, co z nim zrobić na ekranie.
import {
  stanGlosu,
  pokazacKarte,
  opisDoLogu,
  poniedzialekTygodnia as poniedzialekGlosu,
  type StanGlosu,
  type WierszGlosu,
} from '../../lib/glosTygodnia';
// PLAN-D-J 08.2026 (12.08.2026) — CO OBOWIĄZUJE W TYM TYGODNIU.
// Do dziś ekran wiedział, KTO MÓWI (`weekly_voice.voice`), i nie miał skąd
// wiedzieć, CO OBOWIĄZUJE: cron wyrzucał `ograniczenia` przed zapisem.
// Skutek na TYM ekranie: zawodnik z kontuzją, o którym produkt WIEDZIAŁ, że ma
// kontuzję, dostawał licznik „3 z 6 sesji zrobione", zaproszenie „Zaplanuj
// Blok →" i rekomendację treningową — czyli dokładnie to, o czym spec 1.2 mówi
// „system milczy o celach". Decyzja, co zdjąć z ekranu, siedzi jako CZYSTA
// FUNKCJA w `lib/ograniczenia.ts`; ten ekran ją WYKONUJE, nie podejmuje.
import {
  czytajOgraniczenia,
  coPokazacNaDzis,
  czyOslonaAktywna,
  opisOgraniczenDoLogu,
  isMissingOgraniczeniaColumnError,
  KOLUMNA_OGRANICZEN,
  type StanOgraniczen,
} from '../../lib/ograniczenia';
// ═══════════════════════════════════════════════════════════════════
// PLAN-D-T 08.2026 (13.08.2026), zadanie T1 — KRĘGOSŁUP.
//
// Ten ekran był KOLAŻEM SZEŚCIU NIEZALEŻNYCH PRODUCENTÓW: kafelek Bloku ·
// karta rekomendacji · podpowiedź dnia · karta głosu tygodnia · punkt pomocy ·
// piętnaście rytmów push. Każdy powstał w innej rundzie i żaden nie wiedział
// o pozostałych. Trzy pierwsze łączą się od tej rundy w JEDNĄ ODPOWIEDŹ
// o trzech częściach: CO DZIŚ ZROBIĆ · DLACZEGO AKURAT TO · CO TO ZMIENI.
//
// ⚠️ DECYZJA JEST CZYSTĄ FUNKCJĄ (`lib/jednaOdpowiedz.ts`); ten ekran ją
// WYKONUJE, nie podejmuje. ZERO NOWYCH ZAPYTAŃ DO BAZY — wszystkie trzy części
// biorą się z danych, które ekran i tak już miał.
// ═══════════════════════════════════════════════════════════════════
import {
  zbudujJednaOdpowiedz,
  NAGLOWEK_CO_ZROBIC,
  NAGLOWEK_DLACZEGO,
  NAGLOWEK_CO_ZMIENI,
} from '../../lib/jednaOdpowiedz';
// PLAN-D-T 08.2026 (14.08.2026), zadanie T6 — TRZY PUSTKI.
// Karta „Dziś w kalendarzu" mówiła „Nic zaplanowanego na dziś." zawodnikowi,
// który nic nie zaplanował, I zawodnikowi, któremu wygasł dostęp i którego
// wpisu baza i tak by nie przyjęła. To są dwie różne rzeczy i od tej rundy
// mają dwa różne zdania. Rozstrzygnięcie: `lib/trzyPustki.ts`.
// ⭐ PLAN-D-F1 15.08.2026 — doszło `opisBleduOdczytuDoLogu`: JEDNA postać logu
// nieudanego odczytu w całym repozytorium (ta sama, której używają pasy C3,
// C3b i E1). Druga, pisana własnymi słowami, rozjechałaby się z pierwszą
// i wtedy `grep` po logach przestałby znajdować połowę awarii.
import { rozpoznajPustke, opisPustkiDoLogu, opisBleduOdczytuDoLogu } from '../../lib/trzyPustki';
import { czytajStanDostepu, RPC_STAN_DOSTEPU } from '../../lib/dostepKonta';
// ZADANIE E2 12.08.2026 — punkt pomocy wyżej w kontuzji i ścieżce wyjścia.
// Stąd idzie WYŁĄCZNIE prośba o otwarcie tego samego, jedynego modala
// zamontowanego w app/_layout.tsx. Zero drugiego egzemplarza.
// ⭐ PLAN-D-O1 — MIEJSCA BÓLU BIERZEMY Z ISTNIEJĄCEGO SŁOWNIKA, nie z nowego.
// To ten sam `BODY_LOCATIONS`, z którego rysuje Dziennik i wgląd WT-25:
// drugi słownik na to samo rozjechałby się przy pierwszej poprawce, a oba
// wyglądałyby poprawnie z osobna.
import { BODY_LOCATIONS } from '../../lib/labels';
// PLAN-D 14.08.2026 — RODZAJ, KTÓREGO NIE ZNAMY, MA SIĘ NAZWAĆ.
// Pas A7 domknął to w `kalendarz.tsx` i postawił tam strażnika. Ten sam wzorzec
// (`EVENT_TYPE_LABELS[e.event_type] || e.event_type`) żył dalej TUTAJ, na ekranie,
// który zawodnik otwiera pierwszy — czyli reguła obowiązywała na ekranie rzadziej
// oglądanym, a nie obowiązywała na tym, który widać zawsze. Rozstrzygnięcie idzie
// z tej samej czystej funkcji, nie z kopii.
import { opiszRodzaj, opisNieznanegoRodzajuDoLogu } from '../../lib/meczWKalendarzu';
// ═══════════════════════════════════════════════════════════════════
// PLAN-D-B2 08.2026 (14.08.2026), zadanie B2.2 — TEN EKRAN PRZESTAJE
// UKŁADAĆ WŁASNĄ KOLEJNOŚĆ.
//
// Do 14.08 ten plik był kolażem DZIEWIĘCIU niezależnych producentów (pomiar
// B2.1 — polecenie spodziewało się sześciu). Każdy sam decydował, czy się
// pokazać i gdzie stanąć, i żaden nie wiedział o pozostałych. Od 14.08 istnieje
// `lib/kolejkaPodania.ts` — JEDNA czysta funkcja, która tę decyzję podejmuje
// raz, z uzasadnieniem przy każdej pozycji.
//
// ⛔ TEN EKRAN NIE SORTUJE, NIE FILTRUJE I NIE TNIE KOLEJKI. Bierze prefiks,
// który wydaje `wezDlaWidoku(kolejka, 'dzis')`, i rysuje go jednym komponentem.
// Kolejność, która się nie podoba, jest ZGŁOSZENIEM DO PASA B1 — nie poprawką
// tutaj. Własny `sort` na ekranie to powrót do kolażu.
// ═══════════════════════════════════════════════════════════════════
import {
  ulozKolejke,
  wezDlaWidoku,
  slad,
  WAGA_BAZOWA,
  type WejsciaKolejki,
  type Kolejka,
  type Kandydat,
  type Wejscie,
  type WydarzenieKalendarza,
  type WpisDziennikaWejscie,
  type WpisBolu,
  type WejscieCelu,
  type WejscieMeczu,
} from '../../lib/kolejkaPodania';
// Zadania zawodnika — CZTERY stany R5 (`sa_zadania` / `brak_danych` /
// `brak_uprawnien` / `nie_wiem`). ⚠️ `odczytZadan` świadomie NIE PRZYJMUJE
// tablicy, tylko całą odpowiedź bazy: dzięki temu nie da się jej zawołać,
// odrzuciwszy wcześniej `error` — a to jest jedyny ruch, którym powstaje
// „pustka zamiast błędu".
import {
  odczytZadan,
  opisOdczytuDoLogu,
  SELECT_ZADANIA,
  TABELA_ZADAN,
} from '../../lib/zadania';
import PozycjaKolejkiCard from '../../components/PozycjaKolejkiCard';
// ⭐ PLAN-D-A1 08.2026 (18.08.2026) — ARKUSZ JAKO WZORZEC NAWIGACJI (A2, A5).
// Do 18.08 ten ekran nie miał ani jednej nakładki: wszystko, co zawodnik miał
// zrobić, albo stało na ekranie (i podnosiło go), albo było za trasą (i wtedy
// kosztowało opuszczenie ekranu). Trzy moduły niżej są DECYZJAMI, ten plik
// jest ich WYKONANIEM — żadna z nich nie jest liczona tutaj.
import Arkusz from '../../components/Arkusz';
import { naglowekArkusza } from '../../lib/arkusz';
import {
  rzeczyMeczu, podpisArkuszaMeczu, czegoNieUmiemyZapisac,
  MECZ_WIECEJ_WEJSCIE, MECZ_CZEKA_NA_KOLUMNE,
  // ⭐⭐ PLAN-D-D8 18.08.2026 — REGUŁY ŚCIEŻKI MECZU. ⛔ Ani jedna z tych
  // liczb i ani jedno z tych zdań nie powstaje w tym pliku: ekran je RYSUJE,
  // a rozstrzyga je moduł, który da się uruchomić w strażniku bez Reacta.
  MINUTY_NA_BOISKU, DLUGOSCI_MECZU,
  POLE_MINUTY_NA_BOISKU, POLE_DLUGOSC_MECZU,
  wynikMeczu, zdecydujOZapisieMeczu, opisZapisuMeczuDoLogu,
  // ⭐⭐ PLAN-D-D2 19.08.2026 — drugi wiersz na to samo wystąpienie ma być
  // ZDANIEM, a nie kodem `23505`.
  toJestDrugiWierszNaMecz, MECZ_JUZ_MA_WIERSZ,
  SKALA_OCENY, POLE_SAMOOCENA, POLE_STAN_MENTALNY, POLE_WARUNKI,
  POLE_POZYCJA, POLE_WYNIK, POLE_NOTATKA,
  // ⭐⭐ PLAN-D-M3 21.08.2026 — RODZAJ MECZU ZSZEDŁ Z PEŁNEJ KARTY DO TEGO
  // ARKUSZA. ⛔ To jest ZMIANA W CUDZYM PLIKU, wymuszona i nazwana w nocie
  // `claude/PRZEKAZANIE_PAS_M3_21_08_2026.md` §8: `POLA_ARKUSZA` wiąże tabelę
  // `RZECZY_O_MECZU` z polami TEGO ekranu na RÓWNOŚĆ, a decyzja Kuby z 21.08
  // („skoro jest mecz oficjalny, to musi być też sparingowy") wymaga, żeby
  // zawodnik oceniający z kafla wskazał rodzaj JEDNYM dotknięciem.
  POLE_RODZAJ_MECZU, RODZAJE_MECZU,
  WARUNKI_TAK, WARUNKI_NIE, WYNIK_MY, WYNIK_ONI,
  MECZ_WIECEJ_DOBROWOLNE, MECZ_WIECEJ_ZAPISZ, MECZ_WIECEJ_ZAPISANO,
  PUSTE_WIECEJ_O_MECZU, POZYCJE_DO_WYBORU,
  type OcenaMeczu, type WiecejOMeczu, type StanKontekstuMeczu,
} from '../../lib/meczWiecej';
import {
  sprawdzPrzedDodaniem, wolnoUtworzycWydarzenie,
  KOLIZJA_PYTANIE, KOLIZJA_PODPYTANIE, KOLIZJA_TO_BYLO_TO, KOLIZJA_INNA_RZECZ,
  KOLIZJA_PRZYPIS, KOLIZJA_NIC_NIE_STALO, KOLIZJA_NIE_ODCZYTANE,
  type PozycjaBezOceny, type OdpowiedzNaKolizje,
} from '../../lib/dodanieWstecz';
// ═══════════════════════════════════════════════════════════════════
// ⭐⭐ PAS K1 21.08.2026 — DROGA DODANIA. Decyzje w module, ekran je WYKONUJE.
// ═══════════════════════════════════════════════════════════════════
import {
  dataStartowa,
  trasaDodania,
  czyWolnoZalozycWydarzenie,
  decyzjaZalozeniaWydarzenia,
  opisZalozeniaDoLogu,
  przesunDzien,
  toDataPoprawna,
  RODZAJ_MECZ,
  SKAD_PLUS,
  PLUS_TO_BYL_MECZ, PLUS_TO_BYL_MECZ_PODPIS,
  PLUS_COS_INNEGO, PLUS_COS_INNEGO_PODPIS,
  MECZ_BEZ_PLANU_TYTUL,
  MECZ_BEZ_PLANU_PODPIS,
  MECZ_BEZ_PLANU_ZAPISZ,
  MECZ_BEZ_PLANU_ZAPISANY,
  MECZ_BEZ_PLANU_BEZ_DNIA,
  MECZ_BEZ_PLANU_NIE_ZALOZYLEM,
  MECZ_BEZ_PLANU_OCENA_NIE_WESZLA,
  MECZ_BEZ_PLANU_KTORY_DZIEN,
  MECZ_BEZ_PLANU_INNY_DZIEN,
  MECZ_DZIEN_DZIS, MECZ_DZIEN_WCZORAJ,
  type PowodDodania,
} from '../../lib/drogaDodania';
// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-B4 08.2026 (14.08.2026), zadanie B4.2 — WGLĄDY WCHODZĄ NA EKRAN.
//
// `lib/wgladyZAlgorytmu.ts` (pas B3, 49 261 B, 81 asercji) liczył sześć wglądów
// i NIE MIAŁ ANI JEDNEGO KONSUMENTA. Zmierzone przed tym pasem:
//   grep -rn "wgladyZAlgorytmu" app components  →  ZERO.
// Dziewięć obietnic (WG-25, WG-26, WG-27, WG-30, WG-32, WG-33, WG-34, WT-25,
// WT-26) stało w stanie „KOD GOTOWY" wyłącznie dlatego, że nikt nie wpiął
// jednego pola.
//
// ⛔ WGLĄD NIE JEST SIÓDMYM PRODUCENTEM I NIE DOSTAJE WŁASNEJ KARTY. Wchodzi
// TĄ SAMĄ DROGĄ, CO KAŻDA INNA FUNKCJA — przez `dodatkowi` rankera. Ekran,
// który po tym pasie ma więcej kart, zadania nie wykonał.
//
// ⛔ NIE FILTRUJEMY KANDYDATÓW PRZED RANKEREM. Wgląd, który ranker wyciszy,
// ma zostać WIDOCZNY z powodem milczenia (WG-32); `.filter()` przed rankerem
// kasuje go po cichu — czyli robi dokładnie to, czego WG-32 zakazuje.
//
// ⚠️ `Kandydat` ma DWA pola tekstowe, a wgląd ma TRZY części. Trzecia
// („jedna rzecz do zrobienia") wychodzi WYŁĄCZNIE przez `wgladDlaPozycji()`
// i rysuje ją ten ekran — patrz `WgladPozycji` niżej. Bez tego wgląd kończy
// się na wiedzy, a to jest złamanie M4.
// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-S2 18.08.2026 — `dataPoPolsku` i `liczbaPoPolsku` SKREŚLONE.
// Były martwe od 18.08 rano: zostały po komponencie `WgladPozycji`, który pas
// A1 zdjął z tego pliku, a pas S1 wyprowadził do `components/WgladPozycji.tsx`.
// Pas S1 zamroził je świadomie w zapadce powierzchni importu z komentarzem
// „dług do skreślenia jedną linią" — to jest ta linia.
import {
  policzWglady,
  type WejsciaWgladow,
  type WynikiWgladow,
  type Wglad,
} from '../../lib/wgladyZAlgorytmu';
// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-A2 08.2026 (16.08.2026), decyzja D4 — WEJŚCIA WGLĄDÓW
// WYPROWADZONE Z TEGO PLIKU DO `lib/`.
//
// Do dziś sześć wejść `policzWglady()` powstawało WYŁĄCZNIE tutaj, w środku
// `load()`. Ekran „Moje zadania" woła TEGO SAMEGO rankera — i nie miał jak
// dostać wglądów, bo cała droga ich budowania mieszkała w cudzym pliku.
//
// ⛔ SKOPIOWANIE TEJ SEKCJI DO `components/ListaZadan.tsx` BYŁO ROZWAŻONE
// I ODRZUCONE: dwa czytniki tej samej rzeczy rozjeżdżają się przy pierwszej
// zmianie i robią to po cichu (O92). Zostaje JEDEN — `zbudujWejsciaWgladow`.
//
// ⚠️ ZERO ZMIANY ZACHOWANIA TEGO EKRANU. Mapowania, gałęzie `nie_wiem`,
// listy kolumn i kolejność wejść przeniesione CO DO ZNAKU; ten plik oddaje
// te same odpowiedzi bazy, które i tak już pobierał, w tej samej paczce
// `Promise.all`. Koszt: zero nowych rund sieci.
// ═══════════════════════════════════════════════════════════════════
import {
  zbudujWejsciaWgladow,
  rocznikZOdpowiedzi,
  // ⭐⭐ PLAN-D-D8 18.08.2026 — PRZEMIANOWANIE WIERSZA MECZU MA JEDNO MIEJSCE.
  // Do dziś stała tu rzutka `as unknown as WierszMeczuNagroda[]`, która nie
  // przemianowuje ani jednego pola: `match_length_minutes` z bazy NIGDY nie
  // stawało się `dlugoscMeczu`, więc waga meczu liczyła się z założonych
  // 90 minut ZAWSZE. ⛔ Rzutka przez `unknown` wyłącza kompilator, a testy
  // widziały właściwość, której w czasie wykonania nie było.
  meczDlaNagrody,
  // ⭐⭐ PLAN-D-D2 — odnalezienie WŁASNEGO wiersza meczu po restarcie aplikacji.
  mapaWierszyMeczuPoWydarzeniu,
  type WierszMeczuWgl,
  TABELA_MECZOW, SELECT_MECZOW,
  TABELA_PROFILU, SELECT_PROFILU,
  TABELA_KATALOGU, SELECT_KATALOGU, KOLUMNA_ODBIORCY, ODBIORCY_KATALOGU,
  TABELA_ODCINKOW, SELECT_ODCINKOW,
} from '../../lib/wejsciaWgladow';
// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-B5 08.2026 (15.08.2026), zadania B5.2 i B5.3 — PĘTLA SIĘ ZAMYKA.
//
// Dwie czyste funkcje, obie przetestowane, obie BEZ KONSUMENTA na tym ekranie.
// Zmierzone 15.08.2026 na kopii zgodnej z dyskiem co do bajtu:
//   grep -rn "policzWykonanaPrace" app components  →  0  (ZERO konsumentów)
//   grep -rn "zbudujTydzien"       app components  →  1  (tylko kalendarz.tsx)
//
// `lib/wykonanieSesji.ts` (pas D1, 84 asercje) umie policzyć WYKONANĄ PRACĘ
// i do dziś nikt jej o to nie pytał. `lib/widokTygodnia.ts` (pas C1, 73
// asercje) umie zbudować siedem wierszy dnia i robił to wyłącznie w Kalendarzu,
// czyli o jedno dotknięcie od startu — a „jak wygląda mój tydzień" jest rzeczą
// ważną, więc wg P0 należy do głębokości 0.
//
// ⛔ ZERO WŁASNEJ PĘTLI PO DNIACH. Tydzień na tej karcie buduje `zbudujTydzien`,
// a nie druga kopia rozwijania reguły cyklicznej. Dwie kopie tej reguły znaczą,
// że pierwsza poprawka wejdzie do jednej z nich, oba ekrany będą wyglądały
// poprawnie i nikt nie zauważy różnicy — bo nikt nie ogląda obu naraz.
//
// ⛔ TEN EKRAN CZYTA WERDYKTY, NIE ZAPISUJE ICH. Zapis („Nie odbyłem") mieszka
// w Kalendarzu (pas D1, `renderPozycja`). Dwa miejsca zapisu to dwa źródła
// prawdy o tym samym wystąpieniu.
//
// ⛔ ZERO SIATKI GODZINOWEJ (WT-34). Karta pokazuje siedem wierszy dnia,
// tak jak Kalendarz — nie siatkę godzin. WT-34 jest dziś spełnione i tego
// pasa nie wolno użyć do jego zgaszenia.
// ═══════════════════════════════════════════════════════════════════
import {
  zbudujTydzien,
  przesunTydzien,
  PLAKIETKI_STANU_PRZESZLEGO,
  plakietkaPozycji,
  type Tydzien,
  type WierszWydarzenia,
  type WierszDnia,
} from '../../lib/widokTygodnia';
// ⭐ PLAN-D-S2 18.08.2026 — `policzWykonanaPrace` ZDJĘTE Z TEGO PLIKU.
// Ekran liczył licznik pracy do 18.08 i oddawał go do `console.log`, bo pas A1
// zdjął `renderLicznikPracy` (~150 dp) i nikt go nie postawił z powrotem.
// Licznik i jego rysowanie stoją od dziś RAZEM, w `components/PracaWLiczbach.tsx`
// (Profil → „Skąd to wiemy"). ⛔ `czytajWerdykty` ZOSTAJE: karmi `zbudujTydzien`,
// czyli widok tygodnia na tej karcie.
import {
  czytajWerdykty,
  type WejscieWerdyktow,
  type WartoscWerdyktu,
} from '../../lib/wykonanieSesji';
// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-D2 08.2026 (15.08.2026) — „ZROBIŁEŚ?". PRODUKT WRESZCIE PYTA.
//
// ⛔ POMIAR, KTÓRY TO UZASADNIA (15.08.2026, produkcja): `session_verdicts`
// 0 wierszy · `status='completed'` 0 z 24 · `daily_logs.calendar_event_id`
// 0 z 10 · odpowiedzianych `focus_block_checkins` 0 z 1. Zawodnik nie miał
// jak powiedzieć, że coś ZROBIŁ — `app/(tabs)/kalendarz.tsx` zapisuje
// WYŁĄCZNIE `nie_odbylo_sie`, choć `CHECK` w bazie dopuszcza obie wartości.
//
// ⚠️ Przycisk „Nie odbyłem" w Kalendarzu istnieje od 14.08 i ma ZERO użyć.
// Dlatego ta droga jest DRUGA, a nie zamienna: Kalendarz zostaje dla kogoś,
// kto porządkuje tydzień wstecz (i pas D2 nie zmienia w nim ani znaku),
// a karta „Dziś" PYTA SAMA — bez szukania i bez wchodzenia gdziekolwiek.
//
// ⛔ REGUŁA STOI W `lib/pytanieOWystapienie.ts`, TEN PLIK JĄ RYSUJE. Ekran,
// który sam liczy, o co zapytać, jest drugą kopią reguły pod inną nazwą —
// i pierwszą rzeczą, która rozjedzie się z oknem „wczoraj i dziś".
// ═══════════════════════════════════════════════════════════════════
import {
  zbudujPytaniaOWystapienia,
  opisPytanDoLogu,
  // ⛔ `ilePytamy` ŚWIADOMIE NIE JEST TU IMPORTOWANE. Liczba pytań bez
  // odpowiedzi jest wielkością dla logu i dla strażnika — postawiona na
  // ekranie byłaby listą zaległości, czyli dokładnie tym, co decyzja Kuby
  // o oknie „wczoraj i dziś" wyklucza. Dopóki nie ma jej w imporcie, nie ma
  // jej jak narysować przez przeoczenie.
  PYTANIE_NAGLOWEK,
  type WynikPytan,
  type Pytanie,
  type WystapienieDoPytania,
} from '../../lib/pytanieOWystapienie';
import { toJestBrakDostepu, ZAPIS_ODRZUCONY_BRAK_DOSTEPU } from '../../lib/dostepKonta';

// ⭐ PLAN-D-W4 18.08.2026 — ZWROT OBSZARU: ile daje praca w danym obszarze
// TEMU zawodnikowi. Iloczyn dwóch osi, które leżały w produkcie osobno przez
// cały czas: wyniku 0–100 z `diagnostics.scores` i tieru pozycji z
// `lib/positionProfiles.ts`. Do dziś ten ekran pytał bazę WYŁĄCZNIE o to,
// CZY diagnoza istnieje — i nigdy nie zajrzał do środka.
import { policzZwrotObszarow, type ZwrotObszarow } from '../../lib/zwrotObszaru';
// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-O1 08.2026 (17.08.2026) — OCENA NALEŻY DO KAFLA W DNIU (D1).
//
// ⛔ POMIAR, KTÓRY TO UZASADNIA (17.08.2026, produkcja): `session_verdicts`
// 1 wiersz — pierwszy w historii produktu, zapisany DZIŚ ścieżką pasa D2.
// Droga zapisu WERDYKTU działa. Nie działa nic poza nią: `daily_logs`
// z `calendar_event_id` 0 z 10 · `data_sources` używane w 0 miejscach kodu ·
// `absence_reason` (kolumna dodana 17.08) 0 wypełnień · 7 wydarzeń przeszłych
// bez werdyktu u 1 zawodnika.
//
// ⭐ CO TEN PAS DOKŁADA: trzy kroki ZWINIĘTE pod odpowiedzią „zrobiłeś?" —
// czas i RPE, ból, powód nieobecności. ⛔ WSZYSTKIE OPCJONALNE. Lepszy jeden
// werdykt bez RPE niż trzy pola bez ani jednej odpowiedzi (D2).
//
// ⛔ REGUŁA STOI W `lib/ocenaZKafla.ts`, TEN PLIK JĄ RYSUJE — tak samo jak
// pytanie stoi w `lib/pytanieOWystapienie.ts`. Ekran, który sam rozstrzyga,
// czy powód liczy się przeciwko zawodnikowi, jest drugą kopią decyzji D7.
// ═══════════════════════════════════════════════════════════════════
import {
  krokiOceny,
  rpePoczatkowe,
  podpowiedzCzasu,
  rozstrzygnijPowod,
  rozpoznajRodzajPozycji,
  sciezkaUsuniecia,
  wierszWerdyktu,
  wierszWpisuPoTreningu,
  wierszBolu,
  opisOcenyDoLogu,
  zbudujPayloadIZrodla,
  RPE_WARTOSCI,
  // ⭐⭐ PAS B1 21.08.2026 — BÓL MA WŁASNE PYTANIE. ⛔ `BOL_WARTOSCI` jest
  // OSOBNĄ stałą od `RPE_WARTOSCI` świadomie: dzięki temu strażnik `B1` umie
  // odróżnić „liczba z pytania o ból" od „liczba z pytania o ciężkość", czytając
  // ten plik jako tekst. Wspólna stała skasowałaby tę różnicę.
  BOL_WARTOSCI,
  bolNatezeniePoczatkowe,
  stanZapisuBolu,
  POLE_BOL_NATEZENIE,
  BOL_BEZ_NATEZENIA,
  POWODY_NIEOBECNOSCI,
  POWOD_NAPIS,
  KROK_CZAS_I_RPE,
  KROK_BOL,
  KROK_POWOD,
  POLE_CZAS,
  POLE_RPE,
  RESZTA_DOBROWOLNA,
  BEZ_USUNIECIA,
  ZAPISZ_SZCZEGOL,
  ZDEJMIJ_Z_PLANU,
  MINUTY_DO_WYBORU,
  type IdKroku,
  type PowodNieobecnosci,
  type FaktyPozycji,
  type WartoscBolu,
  type WartoscRpe,
  type WartoscZeZrodlem,
} from '../../lib/ocenaZKafla';
// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-C4 08.2026 (15.08.2026), zadanie C4.3 — NAGRODA ZA WYKONANĄ PRACĘ.
//
// ── DLACZEGO TO STOI OBOK LICZNIKA, A NIE ZAMIAST NIEGO ─────────────
// To są DWIE RÓŻNE ODPOWIEDZI i obie są potrzebne:
//   • licznik pasa D1 mówi „ile z zaplanowanych sesji odbyłeś W OSTATNICH
//     14 DNIACH" — czyli o RYTMIE. Jego okno jest ruchome i tak ma być.
//   • ten blok mówi „ile pracy wykonałeś W OGÓLE" — czyli o DOROBKU.
//     ⛔ NIE MA OKNA I NIGDY GO NIE DOSTANIE.
//
// ⚠️ ZMIERZONE 15.08.2026, NA PRAWDZIWYCH DANYCH, PRZEZ URUCHOMIENIE FUNKCJI:
// licznik okna dla zawodnika `0be298a2…` pokazuje 20.08 „0 z 4", 27.08 „0 z 6",
// a 22.09 — „Nie masz w kalendarzu ani jednej sesji z ostatnich dwóch tygodni".
// Ten sam komplet danych, żadnej zmiany po stronie zawodnika, SAM UPŁYW CZASU.
// Przy wejściu z dowodem wykonania maleje też licznik `odbyte`: 4 → 4 → 2 → 1 →
// znika z ekranu. To jest dokładnie ta rzecz, której zakazuje N1, tylko schowana
// w oknie zamiast w serii dni. **Blok niżej jest odpowiedzią na ten pomiar.**
//
// ⛔ ANI JEDNEGO SŁOWA O DNIACH Z RZĘDU, PASSIE, SERII, „NIE PRZERWIJ".
// Pilnuje tego asercja `lib/nagrodaZaPrace.selftest.ts`, czytająca TEN plik
// jako tekst — nie tylko ten blok.
// ═══════════════════════════════════════════════════════════════════
import {
  policzNagrode,
  jednostkiZDziennika,
  jednostkiZMeczow,
  jednostkiZOdpowiedziKontrolnych,
  zrodloSesji,
  zrodloNieczytane,
  opisNagrodyDoLogu,
  type NagrodaZaPrace,
  type WejscieNagrody,
  type SegmentyCelow,
  type WierszWydarzeniaDoNagrody,
  type WierszDziennika as WierszDziennikaNagroda,
  type WierszMeczu as WierszMeczuNagroda,
  type WierszOdpowiedziKontrolnej,
} from '../../lib/nagrodaZaPrace';

const SEG_LABELS = SEGMENT_LABELS;

const EVENT_TYPE_LABELS: Record<string, string> = {
  club_training: 'Trening klubowy', own_training: 'Trening własny',
  micro_session: 'Mikro-sesja', task: 'Zadanie', match: 'Mecz',
};

type Goal = {
  id: number; segment_id: string; is_priority: boolean; created_at: string;
  origin: string | null; suggestion_note: string | null; refinement_note: string | null;
};
type RecommendationRow = Recommendation & { goal_id: number | null };
// PLAN-D-B2 — doszły `status` i `scheduled_time`. Oba są WYMAGANE przez
// `WydarzenieKalendarza` (kontrakt rankera §3): status rozstrzyga, czy pozycja
// w ogóle wchodzi do kolejki, a godzina wychodzi WYŁĄCZNIE wtedy, gdy zawodnik
// ją podał (D10) — `null` to nie jest północ i nie jest myślnik.
type CalEvent = {
  id: number; title: string; event_type: string; scheduled_date: string | null;
  scheduled_time: string | null; status: string;
  recurrence_rule: string | null; focus_block_id: string | null;
};
// WIEDZA B4 08.08.2026 — doszło `component_id`: to jest Element, nad którym
// zawodnik faktycznie pracuje, więc podpowiedź wycelowana w ten Element jest
// trafniejsza niż reguła przekrojowa segmentu. `computeFocusBlockProgress`
// tej kolumny nie czyta i nie zmienia przez to zachowania.
type FocusBlockRow = { id: string; segment_id: string; status: string; component_id?: string | null };
// PLAN-D-B2 — wiersze dwóch wejść kolejki, w kształcie, w jakim wracają z bazy.
type WierszDziennika = {
  id: number;
  entry_type: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  calendar_event_id: number | null;
};
/**
 * Wszystko, co `load()` oddaje renderowi. ⚠️ `wydarzeniaDnia` NIE SĄ pochodną
 * `wejscia.kalendarz`: karta „Dziś w kalendarzu" pokazuje też wydarzenia
 * CYKLICZNE, których ranker świadomie nie widzi (`scheduled_date === null`,
 * kolejkaPodania.ts:775). Gdyby ekran liczył je z wejścia kolejki, zawodnik
 * z cotygodniowym treningiem przestałby go widzieć — po cichu.
 */
type DaneEkranu = {
  wejscia: Omit<WejsciaKolejki, 'jednaOdpowiedz' | 'dodatkowi'>;
  /**
   * ⭐ PLAN-D-F1 15.08.2026 — `null` znaczy ODCZYT SIĘ NIE UDAŁ i nie ma czego
   * zostawić z poprzedniego odświeżenia. Pusta tablica znaczy „odczytałem
   * i nic dziś nie ma". Do 15.08 obie te rzeczy były tą samą pustą tablicą,
   * bo lista powstawała z `(eventsRes.data ?? [])` — i zawodnik z trzema
   * treningami w kalendarzu czytał po awarii „Nic zaplanowanego na dziś."
   */
  wydarzeniaDnia: CalEvent[] | null;
  /** ⭐ PLAN-D-F1 — czy ostatni odczyt wydarzeń przeszedł. Rozstrzyga czwarty rodzaj pustki. */
  odczytWydarzenUdanySie: boolean;
  /**
   * ⭐ PLAN-D-B4 — SZEŚĆ WEJŚĆ PRODUCENTA WGLĄDÓW. `dzis` nie stoi tutaj:
   * bierze się z `wejscia.dzis`, żeby ranker i producent wglądów nie mogły
   * dostać DWÓCH RÓŻNYCH dni. Jeden napis, jedno źródło.
   */
  wejsciaWgladow: Omit<WejsciaWgladow, 'dzis'>;
  /**
   * ⭐ PLAN-D-B5 — WEJŚCIA TYGODNIA I LICZNIKA. Trzy pola, każde w kształcie,
   * którego wymagają czyste funkcje pasów C1 i D1.
   *
   * ⚠️ `wydarzeniaTygodnia` NIE JEST tym samym co `wejscia.kalendarz` ani co
   * `wydarzeniaDnia` — i to jest cała treść osobnego zapytania (§ niżej,
   * „ZAPYTANIE B5"). Tamte dwa jadą z odpowiedzi zawężonej do
   * `status in ('scheduled','completed')`, a licznik pracy MUSI widzieć
   * `cancelled`: odwołanie jest dziś JEDYNYM dowodem pracy NIEWYKONANEJ
   * (`session_verdicts` ma 0 wierszy, `status='completed'` 0 z 24,
   * `daily_logs.calendar_event_id` 0 z 10 — zmierzone 15.08.2026).
   * ⚠️ PLAN-D-K1 16.08.2026 — DOPRECYZOWANIE, KTÓRE NIE JEST KOSMETYKĄ:
   * do 16.08 stało tu „dowodem »nie odbyło się«", bo reguła zwracała wtedy
   * dla odwołania `nie_odbylo_sie`. Dziś odwołanie daje PIĄTĄ wartość
   * `odwolane` — ZAWODNIK czyta „Odwołane", a LICZNIK nadal liczy tę pozycję
   * jako niewykonaną. Zmiana plakietki nie ruszyła tu ANI JEDNEJ LICZBY
   * i pilnuje tego grupa 8 strażnika `lib/wykonanieSesji.selftest.ts`.
   * Bez odwołań licznik oddałby `brak_podstawy` u zawodnika, u którego
   * poprawną odpowiedzią jest „0 z 2".
   *
   * ⛔ `null` znaczy ODCZYT SIĘ NIE UDAŁ, nie „nic nie ma". Pusta tablica
   * znaczy „odczytałem i nic nie ma". Sklejenie tych dwóch to `?? []` pod
   * inną nazwą.
   */
  wydarzeniaTygodnia: WierszWydarzenia[] | null;
  /** `calendar_event_id` z Dziennika. ⛔ `null` = odczyt się nie udał. */
  wpisyDziennika: ReadonlySet<number> | null;
  /**
   * ⭐ Trzy stany, nie dwa: `brak` (tabeli nie ma) · `nie_odczytano` (inny
   * błąd) · `jest`. ⛔ NIGDY `?? []` — patrz `czytajWerdykty`.
   */
  werdykty: WejscieWerdyktow;
  /**
   * ⭐ PLAN-D-C4 — CZTERY ŹRÓDŁA WYKONANEJ PRACY + zbiór segmentów, które
   * zawodnik sam nazwał celem. Każde źródło ma jawny stan „nie odczytałem".
   *
   * ⛔ TU NIE MA GOTOWEJ LICZBY I TO JEST DECYZJA. `DaneEkranu` niesie
   * WEJŚCIA, a nie wynik: gdyby stała tu policzona nagroda, byłaby stanem —
   * a stan da się nie zaktualizować albo wyzerować. Odznaki liczy `useMemo`
   * przy każdym renderze, z wierszy, które już są w bazie.
   */
  wejsciaNagrody: WejscieNagrody;
  // ⭐ PLAN-D-S2 18.08.2026 — POLE `sesjeWszystkichBlokow` ZDJĘTE.
  // Istniało wyłącznie po to, żeby nakarmić `policzPraceWeWszystkichBlokach`
  // — a to wywołanie wyszło z tego pliku razem z rysowaniem. Zostawione
  // byłoby danymi bez konsumenta, czyli tą samą chorobą od drugiej strony.
  // ⛔ Zbiór PEŁNY (z `cancelled`) czyta dziś `app/(tabs)/ja.tsx` i podaje go
  // do `components/PracaWLiczbach.tsx`.
};

type WierszBolu = {
  id: number;
  /**
   * ⭐ PLAN-D-B4 — DOŁOŻONA KOLUMNA, NIE NOWE ZAPYTANIE. Bez niej wgląd
   * o powtarzającym się bólu (WT-25) nie ma jak zgrupować zgłoszeń po miejscu.
   * ⚠️ `body_location` jest w bazie NOT NULL (zmierzone 14.08.2026 na
   * `information_schema.columns`), więc typ jest `string`, a nie `string | null`
   * — pole zastępcze („nieznane miejsce") byłoby zmyśleniem.
   */
  body_location: string;
  intensity: number | null;
  excludes_from_training: boolean | null;
  created_at: string;
};

// ⭐ PLAN-D-A2 (16.08.2026), D4 — `WierszMeczu` (kaskada meczowa) i
// `WierszKatalogu` (katalog podpowiedzi) MIESZKAJĄ TERAZ w `lib/wejsciaWgladow.ts`
// jako `WierszMeczuWgl` i `WierszKataloguWgl`. Ten ekran nie jest jedynym,
// który je czyta, więc przestały być jego typami prywatnymi.

// ═══════════════════════════════════════════════════════════════════
// PLAN-D-B2 — TRZY STANY KAŻDEGO WEJŚCIA. ⛔ TU MIESZKA ZAKAZ `data ?? []`.
//
// `supabase-js` NIE RZUCA wyjątku, gdy odczyt się nie uda — zwraca
// `{ data: null, error }`. Gdyby ten ekran napisał `data ?? []`, „nie udało się
// odczytać" stałoby się NIEODRÓŻNIALNE od „nic nie masz na dziś": kolejka
// pokazałaby spokojną pustkę, wszystko wyglądałoby na wdrożone i nikt nigdy
// by tu nie wrócił. Ranker ma na to gotowy typ `Wejscie<T>` i to jest jedyna
// droga, którą ten ekran go buduje.
// ═══════════════════════════════════════════════════════════════════
function powodBledu(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return 'nieznany błąd odczytu';
}

function wejscieZOdpowiedzi<W, T>(
  odp: { data: unknown; error: unknown },
  nazwa: string,
  mapuj: (wiersz: W) => T,
): Wejscie<T[]> {
  if (odp.error) return { rodzaj: 'nie_wiem', powod: `${nazwa}: ${powodBledu(odp.error)}` };
  if (!Array.isArray(odp.data)) {
    return { rodzaj: 'nie_wiem', powod: `${nazwa}: odpowiedź bazy nie jest listą` };
  }
  if (odp.data.length === 0) return { rodzaj: 'brak' };
  return { rodzaj: 'jest', dane: (odp.data as W[]).map(mapuj) };
}

function liczbaAlboNull(x: unknown): number | null {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

function wpisDziennikaDlaKolejki(w: WierszDziennika): WpisDziennikaWejscie {
  const p: Record<string, unknown> = w.payload && typeof w.payload === 'object' ? w.payload : {};
  const zmeczenie = liczbaAlboNull(p.morning_fatigue);
  return {
    dzien: toLocalDateStr(new Date(w.created_at)),
    senGodziny: liczbaAlboNull(p.sleep_hours),
    // Dziennik zapisuje `payload.morning_fatigue = 10 − energia` (patrz
    // app/(tabs)/dziennik.tsx). Odwracamy TĄ SAMĄ konwersją, nie własną.
    energia: zmeczenie === null ? null : 10 - zmeczenie,
    rpe: liczbaAlboNull(p.rpe),
  };
}

function wpisBoluDlaKolejki(w: WierszBolu): WpisBolu {
  return {
    dzien: toLocalDateStr(new Date(w.created_at)),
    intensywnosc: liczbaAlboNull(w.intensity) ?? 0,
    wykluczaZTreningu: w.excludes_from_training === true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-A2 (16.08.2026), D4 — PIĘĆ FUNKCJI MAPUJĄCYCH WIERSZ BAZY
// NA WEJŚCIE PRODUCENTA WGLĄDÓW WYPROWADZONYCH DO `lib/wejsciaWgladow.ts`.
//
// Stały tu do 16.08.2026: `wpisDziennikaDlaWgladu`, `powiazanieDlaWgladu`,
// `wydarzenieDlaWgladu`, `wpisBoluDlaWgladu`, `meczDlaWgladu`. Powód
// przeniesienia jest jeden i policzalny: `components/ListaZadan.tsx` woła
// TEGO SAMEGO rankera, a tych pięciu funkcji nie miał jak zawołać — więc
// lista „Moje zadania" nie pokazywała ANI JEDNEGO wglądu.
//
// ⚠️ Funkcje mapujące wiersz bazy na wejście RANKERA (`wpisDziennikaDlaKolejki`,
// `wpisBoluDlaKolejki`) ZOSTAJĄ tutaj — one karmią wejścia, które ten ekran
// buduje inaczej niż lista (osiem wejść, `jednaOdpowiedz`, dwaj producenci
// lokalni). Rozdział między nimi jest ten sam co przed pasem: ranker i wgląd
// biorą RÓŻNE pola z tych samych wierszy.
// ═══════════════════════════════════════════════════════════════════

/**
 * Dokąd prowadzi dotknięcie pozycji — WYNIKA ZE ŚLADU, nie z osobnej decyzji
 * ekranu. Dzięki temu nie da się pokazać zdania o Dzienniku i wysłać zawodnika
 * do wąskich gardeł.
 * ⚠️ CELOWO NIEPEŁNA: pozycje zadań (`player`, `system`) nie mają jeszcze
 * dokąd prowadzić — lista „Moje zadania" to pas C2. Brak trasy = brak
 * dotknięcia, a nie dotknięcie prowadzące donikąd.
 */
const TRASA_POZYCJI: Record<string, '/dziennik' | '/kalendarz' | '/cele'> = {
  journal: '/dziennik',
  calendar: '/kalendarz',
  blok: '/cele',
  focus_block: '/cele',
  zaproszenie: '/cele',
};

// ─────────────────────────────────────────────────────────────────────
// BRZMIENIA KOLEJKI — ⚠️ WSZYSTKIE DO PRZEJRZENIA PRZEZ KUBĘ
// ─────────────────────────────────────────────────────────────────────
/** Znacznik dla Kuby i dla strażnika. Nie usuwać do czasu zatwierdzenia brzmień. */
const BRZMIENIE_DO_PRZEJRZENIA_B2 = 'DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-B2, 14.08.2026)';

/**
 * ⚠️ TRZY STANY KOLEJKI TO TRZY RÓŻNE ZDANIA, NIGDY DWA (R5).
 * `pusto` znaczy „odczytałem wszystko i naprawdę nic nie ma".
 * `nie_wiem` znaczy „czegoś nie odczytałem" — i wtedy NIE WOLNO powiedzieć
 * zawodnikowi, że nic nie ma, bo to byłaby nieprawda o nim (Z0).
 * Sklejenie tych dwóch zdań w jedno jest głównym defektem, którego ten pas
 * ma nie popełnić — pilnuje tego asercja w `lib/kolejkaNaDzis.selftest.ts`.
 */
const KOLEJKA_PUSTO = 'Na dziś nie mam dla Ciebie ani jednej rzeczy.';
const KOLEJKA_NIE_WIEM = 'Nie wszystko udało mi się odczytać, więc nie powiem Ci, że nic nie masz.';
const KOLEJKA_NIEPELNA = 'Ta lista jest niepełna — czegoś nie odczytałem.';
const KOLEJKA_WCZYTUJE = 'Wczytuję…';

/** ⚠️ BRZMIENIA PRZENIESIONE CO DO ZNAKU z karty „Dziennik", która stała
 *  na tym ekranie do 14.08 jako osobny, ósmy element. Nie są nowe — zmieniły
 *  miejsce na to, w którym zawodnik szuka odpowiedzi „co dziś zrobić". */
const DZIENNIK_CO = 'Zapisz dzisiejszy wpis';
const DZIENNIK_DLACZEGO = 'Nie masz jeszcze dzisiejszego wpisu.';
// ⭐ PLAN-D-A1 18.08.2026 — DWA BRAKUJĄCE STANY KAFLA WPISU (R5).
// ⛔ „Wpis jest" i „nie wiem, czy jest" to dwie różne rzeczy i zawodnik ma je
// odróżniać po tekście, a nie zgadywać z ciszy. ⛔ Zero pochwały za wpis (N1):
// zdanie stwierdza fakt i nie gratuluje.
const DZIENNIK_JEST = 'Dzisiejszy wpis jest zapisany. Możesz go poprawić.';
const DZIENNIK_NIE_WIEM = 'Nie udało się sprawdzić, czy masz dzisiejszy wpis.';

// ─────────────────────────────────────────────────────────────────────
// ⭐ PLAN-D-B4 — BRZMIENIA WGLĄDU, KTÓRE DOKŁADA EKRAN
// ─────────────────────────────────────────────────────────────────────
// ⚠️ TO SĄ DOKŁADNIE TRZY NOWE ZDANIA. Wszystkie zdania samych wglądów
// (liczba, znaczenie, zastrzeżenie, rzecz do zrobienia) przychodzą GOTOWE
// z `lib/wgladyZAlgorytmu.ts` i ten pas ich NIE ZMIENIA — decyzja o brzmieniu
// należy do Kuby, nie do pasa, który je wpina (polecenie B4 §8.3).
/** Znacznik dla Kuby i dla strażnika. Nie usuwać do czasu zatwierdzenia brzmień. */
const BRZMIENIE_DO_PRZEJRZENIA_B4 = 'DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-B4, 14.08.2026)';

// ⭐ PLAN-D-S2 18.08.2026 — TRZY MARTWE KOPIE BRZMIEŃ WGLĄDU SKREŚLONE:
// `WGLAD_DO_ZROBIENIA`, `OS_POKAZ`, `OS_UKRYJ`. ⛔ Nie znikły z produktu —
// żyją co do znaku w `components/WgladPozycji.tsx`, czyli w JEDYNEJ kopii
// rysowania trzeciej części wglądu (pas S1). Tutaj były drugą kopią,
// zamrożoną z komentarzem „dług do skreślenia"; dwie kopie brzmienia
// rozjeżdżają się przy pierwszej poprawce, a każda z osobna wygląda poprawnie.

// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-B5 08.2026 (15.08.2026) — BRZMIENIA KARTY I LICZNIKA.
// WSZYSTKIE PONIŻSZE SĄ NOWE I WSZYSTKIE SĄ **DO PRZEJRZENIA PRZEZ KUBĘ**.
// ═══════════════════════════════════════════════════════════════════
const BRZMIENIE_DO_PRZEJRZENIA_B5 = 'DO PRZEJRZENIA PRZEZ KUBĘ (PLAN-D-B5, 15.08.2026)';

/** WT-02 — przełącznik na karcie. Domyślnie „Dziś": karta ma dalej odpowiadać
 *  na pytanie „co mam dzisiaj", a tydzień jest ROZWINIĘCIEM, nie zamianą. */
const KARTA_ZAKRES_DZIS = 'Dziś';
const KARTA_ZAKRES_TYDZIEN = 'Tydzień';

// ⭐ PLAN-D-S2 18.08.2026 — OSIEM MARTWYCH BRZMIEŃ LICZNIKA SKREŚLONYCH:
// `OKNO_LICZNIKA_DNI`, `LICZNIK_NAGLOWEK`, `LICZNIK_POLICZONY`,
// `LICZNIK_BRAK_PODSTAWY`, `LICZNIK_BEZ_WPISU`, `LICZNIK_NIEODCZYTANE`,
// `LICZNIK_ROBOTA_ZAZNACZ`, `LICZNIK_ROBOTA_ZAPLANUJ`.
// ⛔ NIE ZNIKŁY Z PRODUKTU — stoją CO DO ZNAKU w `components/PracaWLiczbach.tsx`
// (Profil → „Skąd to wiemy"), razem z jedynym miejscem, które je rysuje.
// Od 18.08 rano były tu martwe: pas A1 zdjął `renderLicznikPracy`, a brzmienia
// zostały jako druga kopia bez widza. Strażnik `lib/kartaDzisILicznik.selftest.ts`
// pyta od dziś o kopię ŻYWĄ.

// ═══════════════════════════════════════════════════════════════════
// ⭐⭐ PLAN-D-D2 19.08.2026 (§4.4) — NAGROBEK: DWANAŚCIE MARTWYCH STAŁYCH
// BLOKU „TWÓJ DOROBEK" USUNIĘTYCH Z TEGO PLIKU.
//
// CO STAŁO W TYM MIEJSCU (mierzone uruchomieniem 19.08.2026, każda z nich
// miała w pliku DOKŁADNIE JEDNO wystąpienie, czyli była martwa):
//   `BRZMIENIE_DO_PRZEJRZENIA_C4_EKRAN` · `NAGRODA_NAGLOWEK` ·
//   `NAGRODA_PUNKTY` · `NAGRODA_JESZCZE_NIC` · `NAGRODA_NIE_POLICZONA` ·
//   `NAGRODA_ODZNAKI_NAGLOWEK` · `NAGRODA_ODZNAKA` · `NAGRODA_NASTEPNY` ·
//   `NAGRODA_MIARA` · `NAGRODA_WSZYSTKO` · `NAGRODA_NIEUMIEM` ·
//   `NAGRODA_ROBOTA_ZAPISZ`.
//
// ⚠️ POLECENIE D2 §4.4 MÓWIŁO O SZEŚCIU. ⛔ ZMIERZONE JEST DWANAŚCIE i tę
// liczbę podaję, bo policzyłem ją, a tamtej nie. Zgodne co do znaku jest to,
// co polecenie mówiło o SŁOWIE: zakazane „punktów pracy" niosły TRZY
// wystąpienia w DWÓCH stałych — `NAGRODA_PUNKTY` (raz) i `NAGRODA_MIARA`
// (dwa razy: „punktów pracy" i „punktów pracy nad tym, co sam nazwałeś
// celem"). Tak też liczył je inwentarz strażnika `lib/zdobyczeRundy.selftest.ts`.
//
// ⛔ DLACZEGO USUNIĘTE, SKORO MARTWE NIKOGO NIE OSZUKUJĄ. Bo pierwsza osoba,
// która zechce odbudować dorobek na ekranie 1, podepnie je z powrotem — i tego
// dnia zawodnik zobaczy „punktów pracy", czyli walutę uśmierconą decyzją
// D4/O92. Stała czekająca na podpięcie jest zaproszeniem, nie neutralnością.
//
// ⭐ GDZIE TA WIEDZA ŻYJE DALEJ — NIC NIE ZNIKŁO Z PRODUKTU (B3):
//   • licznik i jego brzmienia: `components/PracaWLiczbach.tsx`
//     (Profil → „Skąd to wiemy") — jedyne miejsce, które je RYSUJE;
//   • nazwa miary i jednostka: `lib/ekranProfilu.ts`
//     (`NAZWA_ROZWOJU`, `JEDNOSTKA_ROZWOJU_WIELE` = „punktów rozwoju");
//   • progi, odznaki i ich zdania „za jaką pracę": `PROGI`
//     w `lib/nagrodaZaPrace.ts`;
//   • rachunek dorobku: `policzNagrode()` — ⛔ NADAL WOŁANY z tego pliku
//     (`useMemo` niżej) i nadal logowany przez `opisNagrodyDoLogu`.
//
// ⛔ STRAŻNIK ZOSTAŁ PRZECELOWANY, NIE OSŁABIONY. `lib/zdobyczeRundy.selftest.ts`
// pytał dotąd „czy MARTWE stałe są policzone i nazwane" (wymagał ich ≥ 1).
// Od 19.08 pyta o rzecz MOCNIEJSZĄ: czy w `dzis.tsx` nie ma zakazanego słowa
// ANI RAZU — ani w żywej stałej, ani w martwej. Predykat `42d` (żywa stała
// z tym słowem = czerwień) stoi nietknięty, a mutacja `S3-M13` przywraca
// teraz stałą RAZEM z jej podpięciem, czyli robi dokładnie to, co zrobiłby
// człowiek odbudowujący kartę. Uzgodnione imiennie w nocie pasa D2.
// ═══════════════════════════════════════════════════════════════════

/** Dzień tygodnia bez pozycji w skróconym tygodniu na karcie. */
const KARTA_TYDZIEN_DZIEN_PUSTY = '—';
/** Gdy nie udało się odczytać wydarzeń — ⛔ NIE „nic nie masz". */
const KARTA_TYDZIEN_NIEODCZYTANY =
  'Nie udało się odczytać Twojego tygodnia. To nie znaczy, że nic w nim nie masz — pociągnij w dół.';

/**
 * ⭐ PLAN-D-B4 — TRZECIA CZĘŚĆ WGLĄDU I OŚ POMIARÓW.
 *
 * ── DLACZEGO RYSUJE TO EKRAN, A NIE `PozycjaKolejkiCard` ─────────────
 * Bo `doZrobienia` i `os` NIE SĄ POLAMI POZYCJI KOLEJKI — ranker ich nie zna
 * i znać nie powinien (tak samo jak nie zna „co to zmieni", które ten ekran
 * rysuje od pasa T). Komponent pozycji należy do pasa B2 i ten pas go nie
 * zmienia; wgląd dokłada swoją trzecią część POD pozycją, wewnątrz tej samej
 * karty.
 *
 * ── DWIE GŁĘBOKOŚCI (P0) ────────────────────────────────────────────
 *   głębokość 0: rzecz do zrobienia — ZERO dotknięć. Wgląd, który kończy się
 *                na wiedzy, łamie M4, więc czynność nie ma prawa być schowana.
 *   głębokość 1: oś pomiarów (WG-34) — jedno dotknięcie, bez opuszczania
 *                ekranu. Trzy daty z liczbami to materiał do sprawdzenia
 *                „skąd to wiesz", a nie odpowiedź na „co mam dziś zrobić".
 *
 * ⛔ PUNKT OSI BEZ CZYTELNEJ DATY NIE JEST RYSOWANY. `dataPoPolsku` oddaje
 * wtedy `null`, a surowe „2026-13-45" na ekranie jest gorsze niż brak punktu.
 */
// ⛔ ZDJĘTE 18.08.2026 (pas A1): komponent `WgladPozycji` razem z osią pomiarów
// (WG-34). Rysował trzecią część wglądu — „jedna rzecz do zrobienia" (M4) —
// pod pozycją kolejki na „Dziś". Zmierzone: sam ten blok niósł 330 dp z 927,
// czyli ponad jedną trzecią ekranu, który ma się zmieścić w 850.
// ⭐ Inwentarz A1 §1.3 kieruje go na „Profil → Skąd to wiemy"; postawienie go
// tam należy do pasa A3. ⛔ Nic nie zniknęło bez śladu: pełny kod stoi
// w `git show 70e00d7:"app/(tabs)/dzis.tsx"`, linie 999–1039, a wiersz
// „zdjęte · dlaczego · co stoi w tym miejscu" — w nocie przekazania A1.

// ═══════════════════════════════════════════════════════════════════
// ⭐ PLAN-D-A1 08.2026 (18.08.2026) — BRZMIENIA EKRANU „DZIŚ / TYDZIEŃ"
//
// ⛔ ZERO SŁÓW OCENIAJĄCYCH PRACĘ ZAWODNIKA. Ani jedno z tych zdań nie liczy
// dni z rzędu (N1), nie porównuje z nikim (N3) i nie chwali za samo wejście.
// ⚠️ Brzmienia przepisane z makiety v3 (`ekranDzien`, `arkuszPlus`) — nowe
// jest tylko to, co makieta zostawiła w HTML-u, a nie w produkcie.
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// ⭐⭐ PAS W1 08.2026 (18.08.2026) — BRZMIENIA WYGLĄDU
//
// ⚠️ WSZYSTKIE PONIŻSZE POCHODZĄ Z DWÓCH ŹRÓDEŁ I Z ŻADNEGO INNEGO:
//   (a) §2 POLECENIA W1 — Kuba wypisał je imiennie przy defektach
//       D-2, D-4, D-8 i T-2 („jak ma być"). To nie są moje propozycje;
//   (b) `claude/MAKIETA_APLIKACJI_V3.html` — funkcje `kafelHTML`,
//       `slupek`, `czteryInfo`, przeniesione CO DO ZNAKU.
// ⛔ Ani jedno z nich nie ocenia zawodnika, nie liczy dni z rzędu (N1)
// i nie porównuje go z nikim (N3). Wszystkie opisują STAN RZECZY albo
// STAN NASZEJ WIEDZY o niej — nigdy jego charakteru.
// ═══════════════════════════════════════════════════════════════════
const BRZMIENIE_DO_PRZEJRZENIA_W1 = 'DO PRZEJRZENIA PRZEZ KUBĘ (PAS W1, 18.08.2026)';

// ═══════════════════════════════════════════════════════════════════
// ⭐⭐ PAS W1 — POPRAWKA PO ZRZUTACH Z 18.08, 16:46.
//
// ⛔⛔ CO ZOBACZYŁEM NA ZRZUCIE, A CZEGO NIE BYŁO NA LIŚCIE §2:
// ŚCIANA TEKSTU Z KARTY „CO DZIŚ ZROBIĆ" TO NIE JEST DOKLEJONY MATERIAŁ
// OBOK ZDANIA — TO JEST SAMO `pozycja.co`. Producent (`lib/jednaOdpowiedz.ts`
// → `coZrobic.tekst`) oddaje CAŁY akapit z materiałów Gamechange:
// „Prosta diagnoza wąskiego gardła z materiału: Potencjał — skok dosiężny
//  (poniżej 35 cm nisko…)" — piętnaście linii.
//
// ⚠️ To znaczy, że zdjęcie z karty „skąd to wiemy" i „co to zmieni"
// NIE ZAŁATWIAŁO D-1. Karta nadal byłaby ścianą, tylko krótszą o jedną
// trzecią. Pierwsza wersja tego pasa tego nie widziała, bo miara wysokości
// liczy `{pozycjeNaDzis[0].co}` jako JEDEN WIERSZ (długość zależy od danych
// i miara mówi to wprost) — ⭐ liczba 105 dp była prawdziwa i myląca naraz.
//
// ⭐ CO ROBI TA FUNKCJA: składa PIERWSZE ZDANIE do pokazania na ekranie.
// ⛔ NIE JEST TO ZMIANA BRZMIENIA (§7.6). Nie przepisuję ani jednego słowa
// producenta — składam jego własny tekst do miejsca, w którym decyzja D-B
// Kuby każe pokazać jedno zdanie. Całość stoi o jedno dotknięcie dalej,
// w arkuszu „cały materiał", CO DO ZNAKU.
// ⛔ Skrócenie jest ZAWSZE WIDOCZNE — kończy się wielokropkiem, a pod
// spodem stoi „Cały materiał →". Tekst ucięty po cichu udaje całość.
// ═══════════════════════════════════════════════════════════════════

/** Ile znaków pierwszego zdania wchodzi na ekran (dwie linie po 15 px). */
const ZNAKOW_PIERWSZEGO_ZDANIA = 120;

/**
 * Pierwsze zdanie tekstu, przycięte do `ZNAKOW_PIERWSZEGO_ZDANIA`.
 * ⛔ Tnie WYŁĄCZNIE na `.`, `!`, `?` albo na granicy słowa — nigdy w środku
 * wyrazu i nigdy na dwukropku (zdanie „…z materiału: Potencjał —" zaczyna
 * się od dwukropka i cięcie tam zostawiłoby sam nagłówek).
 * ⛔ Zwraca `skrocone: false`, gdy nic nie uciął — wtedy ekran NIE rysuje
 * wielokropka, bo nie ma czego zapowiadać.
 */
export function pierwszeZdanieNaEkran(
  tekst: string,
  limit: number = ZNAKOW_PIERWSZEGO_ZDANIA,
): { tekst: string; skrocone: boolean } {
  const calosc = tekst.trim();
  if (calosc.length === 0) return { tekst: '', skrocone: false };

  // Koniec pierwszego zdania: kropka, wykrzyknik albo pytajnik, po którym
  // stoi spacja albo koniec tekstu. ⛔ Przecinek dziesiętny („1,80") nie jest
  // kropką, więc nie ma tu na co uważać — ale skrót „np. " byłby cięciem
  // w złym miejscu, dlatego wymagam co najmniej 30 znaków przed cięciem.
  const m = /[.!?](\s|$)/g;
  let koniecZdania = -1;
  for (let t = m.exec(calosc); t !== null; t = m.exec(calosc)) {
    if (t.index >= 30) { koniecZdania = t.index + 1; break; }
  }
  const zdanie = koniecZdania > 0 ? calosc.slice(0, koniecZdania) : calosc;
  if (zdanie.length <= limit) {
    return { tekst: zdanie, skrocone: zdanie.length < calosc.length };
  }
  const ciete = zdanie.slice(0, limit);
  const spacja = ciete.lastIndexOf(' ');
  const wynik = (spacja > limit / 2 ? ciete.slice(0, spacja) : ciete).replace(/[\s,;:—-]+$/, '');
  return { tekst: `${wynik}…`, skrocone: true };
}


/** ⭐ D-2 — TRZY FAKTY O DNIU. Nazwy wierszy z §2 polecenia, co do znaku. */
const FAKT_OBCIAZENIE = 'Obciążenie';
const FAKT_NAPIECIE = 'Napięcie';
const FAKT_Z_WPISOW = 'Z Twoich wpisów';

/**
 * ⛔⛔ NAJWAŻNIEJSZE ZDANIE TEGO BLOKU — i jedyne, które musiałem tu
 * napisać sam. Silnik obciążenia (minuty × ciężkość ⁄ 180) NIE ISTNIEJE
 * w produkcie: buduje go pas D1. To, co produkt umie policzyć dzisiaj,
 * to WAGA DNIA z rodzajów pozycji (`lib/widokTygodnia.ts`, `PUNKTY_RODZAJU`)
 * — czyli liczba z PLANU, nie z pomiaru.
 * ⭐ Dlatego wiersz „Obciążenie" pokazuje to, co naprawdę mamy — opis dnia
 * z rodzajów — i NIE PODAJE ŻADNEJ LICZBY W PUNKTACH. Liczba w punktach
 * przy dzisiejszym silniku byłaby podaniem planu jako pomiaru (Z0).
 */
const FAKT_OBCIAZENIE_BEZ_SILNIKA = 'w planie — punktów jeszcze nie liczymy';
const FAKT_NIE_POLICZONE_PUSTY = 'nie policzone — dzień jest pusty';
const FAKT_NIE_ODCZYTANE = 'nie policzone — nie udało się odczytać tego dnia';
/** ⚠️ Plan lekcji nie istnieje w bazie (0 tabel) — pustka NAZWANA, nie cisza. */
const FAKT_NAPIECIE_BEZ_PLANU = 'nie policzone — nie znamy Twojego planu lekcji';

/**
 * ⭐ D-1 + DECYZJA D-B KUBY z 18.08: „karta pokazuje JEDNO ZDANIE: co zrobić
 * i dlaczego akurat to. Cały materiał otwiera się dotknięciem, w arkuszu —
 * koszt 0 dp na ekranie."
 */
const KARTA_MATERIAL_WEJSCIE = 'Cały materiał →';
const KARTA_MATERIAL_NAGLOWEK = 'Cały materiał';
const KARTA_MATERIAL_PODPIS = 'to samo, tylko w całości';

/**
 * ⭐ D-4 — PLAKIETKA STANU NA KAFLU. Pięć napisów z §2 polecenia
 * i z makiety v3 (`kafelHTML`, klasa `.chip`).
 * ⛔ „czeka na Twoją ocenę" NIE JEST nowe — stało tu od pasa A1 jako
 * `KAFEL_CZEKA_NA_OCENE` i zostaje tą samą stałą.
 */
const PLAKIETKA_DO_ZROBIENIA = 'do zrobienia';
const PLAKIETKA_OCENIONE = 'ocenione';
const PLAKIETKA_WYPELNIONA = 'wypełniona';
const PLAKIETKA_DO_WYPELNIENIA = 'do wypełnienia';
const PLAKIETKA_NIE_WIEM = 'nie wiem';

/**
 * ⭐ T-2 — PLAKIETKA REJESTRU POD SŁUPKIEM. Pięć napisów z §2 polecenia
 * i z makiety v3 (funkcja `slupek`). ⛔ To NIE są oceny dnia: mówią, CO
 * O NIM WIEMY, a nie ile jest wart.
 */
/**
 * ⚠️ JEDYNE BRZMIENIE W TYM PASIE, KTÓREGO NIE MA ANI W POLECENIU, ANI
 * W MAKIECIE — i dlatego jest oznaczone jako `BRZMIENIE_DO_PRZEJRZENIA_W1`
 * i wypisane osobno w nocie przekazania. Mówi o STANIE NASZEJ WIEDZY,
 * a nie o zawodniku: „nic nie wyszło" ≠ „nic nie zrobiłeś".
 */
const FAKT_WPISY_BEZ_WNIOSKU = 'nie policzone — z Twoich wpisów nic jeszcze nie wyszło';

const REJESTR_ZMIERZONE = 'zmierzone';
const REJESTR_W_PLANIE = 'w planie';
const REJESTR_BEZ_OCENY = 'bez oceny';
const REJESTR_BEZ_LICZBY = 'bez liczby';
const REJESTR_PUSTO = 'pusto';

/**
 * ⭐ T-5 — DRUGA LINIA WIERSZA DNIA. Z makiety v3 (`wierszDnia`), co do znaku.
 * ⛔ T-4: makieta NIGDY nie przekreśla pozycji odwołanej. Przekreślenie czyta
 * się jako kara, a nieobecność jest WIEDZĄ, nie karą (Z7).
 */
const DZIEN_MINELO_NIE_WIEM = 'minęło · nie wiemy, jak było';
const DZIEN_MINELO_OCENIONE = 'minęło · ocenione';
const DZIEN_MINELO_PUSTO = 'minęło · nic tu nie stało';
const DZIEN_DZIS = 'dziś';
const DZIEN_JESZCZE_NIE_BYLO = 'jeszcze nie było';
// ⭐⭐ PAS K1 21.08.2026 (§3.4, defekt 2) — TO ZDANIE STAŁO JAKO TYTUŁ DNIA.
// ⛔ CO WIDAĆ BYŁO NA ZRZUCIE Z TELEFONU: w widoku „Tydzień" pierwsza linia
// wiersza dnia — miejsce, w którym stoi NAZWA tego, co się dzieje („Sesja +
// klub") — pokazywała napis `nie odczytane`. To jest nazwa STANU WEWNĘTRZNEGO
// postawiona w miejscu nazwy rzeczy: zawodnik czyta ją jak nazwę swojego dnia.
// ⛔ Stan zostaje (R5: „nie wiem" ma mieć własny, jawny stan i to jest dobre),
// zmienia się WYŁĄCZNIE jego brzmienie — na zdanie o produkcie, a nie etykietę
// o dniu zawodnika. Ten sam idiom, co `NIE_UDALO_SIE_ODCZYTAC_TYGODNIA`.
const DZIEN_NIE_ODCZYTANY = 'nie udało się odczytać tego dnia';

/**
 * ⛔⛔ T-7 — PRZYPIS Z DEFINICJĄ SKALI NIE WCHODZI NA EKRAN W TYM PASIE.
 * Polecenie mówi wprost: „postaw go dopiero, gdy słupki naprawdę liczą
 * obciążenie — silnik buduje pas D1". Słupek liczy dziś WAGĘ DNIA
 * z rodzajów pozycji, więc zdanie „1 punkt obciążenia = 30 minut pracy
 * przy ciężkości 6" byłoby opisem mechanizmu, którego pod nim nie ma.
 * ⛔ Nie stawiam go i mówię o tym w nocie — zamiast postawić i przemilczeć.
 */
const PRZYPIS_TYGODNIA_BEZ_SKALI =
  'Wysokość słupka mówi to samo, co jego nasycenie.';
// ⚠️ MAKIETA DOPISUJE TU JESZCZE „Nie liczymy dni z rzędu i nie porównujemy
// Cię z nikim." ⛔ Tego zdania NIE MA w tym pliku i mieć nie może: strażnik
// N1 (`lib/nagrodaZaPrace.selftest.ts`) zakazuje frazy „z rzędu" w całym
// `dzis.tsx`, żeby nikt nie wprowadził serii tylnymi drzwiami. Ta sama
// obietnica stoi CO DO ZNAKU na „Profilu" (`PRZYPIS_CZEGO_TU_NIE_MA`).

const ETYKIETA_TWOJ_DZIEN = 'Twój dzień';
const KAFEL_CZEKA_NA_OCENE = 'czeka na Twoją ocenę';
const WIERSZ_BEZ_OCENY = (ile: number) =>
  `Bez oceny: ${ile} ${ile === 1 ? 'rzecz' : 'rzeczy'} →`;
const PRZYPIS_OCENA_NALEZY_DO_RZECZY =
  'Ocena należy do rzeczy: dotykasz kafla i mówisz, jak poszło.';
const ARKUSZ_JUZ_OCENIONE =
  'Ta rzecz nie czeka już na ocenę. Nic nie przepadło — wpis jest zapisany.';
const ARKUSZ_NIC_BEZ_OCENY = 'Sprawdziłem i nie ma tu ani jednej rzeczy bez oceny.';
// ⛔ TRZECI STAN (R5): awaria odczytu NIE JEST pustką i ma własne zdanie.
const ARKUSZ_NIE_ODCZYTANE =
  'Nie udało się sprawdzić, o co zapytać. Nie powiem Ci, że nic nie czeka — '
  + 'nie wiem tego. Pociągnij ekran w dół, żeby spróbować jeszcze raz.';
const MECZ_WIECEJ_OTWORZ = 'Powiedz więcej o tym meczu →';
const PLUS_ETYKIETA = 'Dodaj do kalendarza';
const PLUS_W_PRZYSZLOSCI = 'Coś, co dopiero będzie';
const PLUS_W_PRZYSZLOSCI_PODPIS =
  'mecz w sobotę, sparing, stały trening — stanie w dniu i poczeka na ocenę';
const PLUS_JUZ_SIE_ODBYLO = 'Już się odbyło';
const PLUS_JUZ_SIE_ODBYLO_PODPIS =
  'wczorajszy trening, którego nie było w planie — wpadnie do kalendarza wstecz';
const PLUS_DODAJ_NOWE = 'Dodaj nowe wydarzenie →';
/**
 * ⭐ PAS K1 21.08.2026 — KLUCZ WIZYTY DLA MECZU, KTÓRY NIE MA WYSTĄPIENIA.
 * ⛔ `kontekstyMeczu` jest mapą „klucz wystąpienia → id wiersza meczu";
 * mecz bez planu wystąpienia jeszcze nie ma, więc dostaje własny, stały klucz.
 * Jeden klucz, bo jeden taki draft naraz — arkusz otwiera się na jeden mecz.
 */
const KLUCZ_MECZU_BEZ_PLANU = 'mecz-bez-planu';

/**
 * ⭐ CO WŁAŚNIE STOI NAD EKRANEM. ⛔ `null` znaczy „nic" — arkusz nie ma
 * stanu „otwarty, ale pusty".
 */
type StanArkusza =
  | { rodzaj: 'ocena'; klucz: string }
  | { rodzaj: 'oceny' }
  // ⭐ PLAN-D-D8 — `klucz` DOSZEDŁ i nie jest wygodą: bez niego arkusz
  // „powiedz więcej" nie wie, do którego wiersza `match_contexts` dokłada,
  // więc każdy zapis wstawiałby nowy wiersz i licznik pracy liczyłby ten
  // sam mecz tyle razy, ile razy zawodnik dotknął „Zapisz".
  // ⭐⭐ PLAN-D-D2 19.08.2026 — `idWydarzenia` DOSZŁO i też nie jest wygodą:
  // bez niego arkusz nie ma czym związać wiersza `match_contexts`
  // z wystąpieniem, więc mecz liczyłby się DWA RAZY (raz jako wydarzenie,
  // raz jako wiersz) — 7 punktów zamiast 4.
  /**
   * ⭐⭐ PAS K1 21.08.2026 — `idWydarzenia: null` ZNACZY „MECZ, KTÓREGO NIE
   * BYŁO W PLANIE" (§3.5, decyzja Kuby). ⛔ To nie jest brak danych, tylko
   * osobny, nazwany stan: wydarzenia jeszcze NIE MA i nie powstanie, dopóki
   * zawodnik nie dotknie „Zapisz". `dzien` niesie dzień, który zawodnik
   * wybrał w arkuszu — ⛔ z wyboru, nie ze zgadywania (Z0).
   * ⚠️ NIE DODAŁEM SIÓDMEGO RODZAJU ARKUSZA: `lib/arkusz.ts` trzyma zapadkę
   * na RÓWNOŚĆ sześciu i nie jest plikiem tego pasa. To jest kontrakt dla
   * pasa, który ten plik trzyma — opisany w nocie K1.
   */
  | { rodzaj: 'meczWiecej'; tytul: string; klucz: string; idWydarzenia: number | null; dzien: string | null }
  | { rodzaj: 'plus' }
  | { rodzaj: 'kolizja' }
  // ⭐ PAS W1 (D-1 + decyzja D-B Kuby): cały materiał jednej odpowiedzi.
  | { rodzaj: 'material' }
  | null;


function dayCodeFor(date: Date) {
  const idx = (date.getDay() + 6) % 7; // 0=Pon..6=Nd — ta sama konwencja co lib/date-utils.ts
  return DAYS_OF_WEEK[idx][0];
}

export default function DzisScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();

  const [priorityGoal, setPriorityGoal] = useState<Goal | null>(null);
  const [hasAnyGoal, setHasAnyGoal] = useState(false);
  // PIERWSZE URUCHOMIENIE 10.08.2026 (zatwierdzone przez Kubę) — ekran Dziś
  // do dziś NIE MIAŁ ANI JEDNEGO odwołania do diagnozy, więc nie potrafił
  // odróżnić zawodnika, który ją ma, od takiego, który jej nie ma, i obu
  // mówił to samo: „załóż Cel". A `api/cron-onboard-diagnosis.js` onboarduje
  // WYŁĄCZNIE zawodników Z diagnozą — kto jej nie zrobi, nie dostanie ani
  // zaproponowanego Celu, ani pierwszej rekomendacji, nigdy. Jedyne miejsce,
  // które o diagnozie wspominało, siedziało dwa dotknięcia dalej, w zakładce
  // „Ja", pod nazwą „WYNIK diagnozy" — co dla kogoś, kto jej nie robił,
  // brzmi jak raport, nie jak zaproszenie. Znalezione przy przejściu ścieżki
  // na świeżym koncie 10.08.2026 (zgłosił Kuba).
  const [hasDiagnosis, setHasDiagnosis] = useState<boolean | null>(null);

  const [focusRec, setFocusRec] = useState<RecommendationRow | null>(null);
  const [otherUnreadCount, setOtherUnreadCount] = useState(0);
  const [openActionableCount, setOpenActionableCount] = useState(0);
  /**
   * ⭐ PLAN-D-F1 15.08.2026 — TRZY STANY PASA A1 ZAMIAST DWÓCH.
   * Do 15.08 stało tu `useState<FocusBlockProgress>(null)`, czyli
   * `{done,total} | null` — kształt, w którym „zrobiłeś zero z dwunastu"
   * i „nie wiemy, ile z dwunastu zrobiłeś" są TĄ SAMĄ wartością.
   * `null` nadal znaczy „jeszcze nie czytałem".
   */
  const [workProgress, setWorkProgress] = useState<FocusBlockProgressState | null>(null);
  // ⭐ PLAN-D-B2 — JEDEN STAN ZAMIAST DWÓCH. Zawiera wejścia kolejki (wszystko
  // poza `jednaOdpowiedz`, którą ekran liczy dopiero w renderze, i poza
  // `dodatkowi`) oraz dzisiejsze wydarzenia dla karty kalendarza.
  // ⚠️ `null` = jeszcze nie odczytano. To NIE jest pusta kolejka.
  const [dane, setDane] = useState<DaneEkranu | null>(null);
  /**
   * ⭐ PLAN-D-B5 (WT-02) — ZAKRES KARTY „DZIŚ W KALENDARZU".
   * ⛔ DOMYŚLNIE `'dzis'`: karta ma dalej odpowiadać na pytanie „co mam
   * dzisiaj". Tydzień jest ROZWINIĘCIEM dla dociekliwego, nie zamianą
   * odpowiedzi na listę.
   */
  const [zakresKarty, setZakresKarty] = useState<'dzis' | 'tydzien'>('dzis');
  // ⭐ PLAN-D-A1 — ARKUSZ. ⛔ Jeden stan na całą nakładkę: dwa arkusze naraz
  // to dwa okna nad sobą, z których zawodnik nie umie wyjść w jednym ruchu.
  const [arkusz, setArkusz] = useState<StanArkusza>(null);
  /**
   * ⭐ PLAN-D-D2 — KTÓRE WYSTĄPIENIE JEST WŁAŚNIE ZAPISYWANE. Klucz
   * `(id, dzien)`, `null` = nic nie leci. ⚠️ Nie `boolean`: przy dwóch
   * pytaniach naraz jedna flaga zablokowałaby OBA na czas zapisu jednego.
   */
  const [zapisWerdyktu, setZapisWerdyktu] = useState<string | null>(null);
  /**
   * ⭐ PLAN-D-D2 — błąd ZAPISU werdyktu. ⛔ Osobny od `error` ekranu: awaria
   * zapisu odpowiedzi ma się pokazać PRZY PYTANIU, a nie na górze karty,
   * gdzie zawodnik nie połączy jej z przyciskiem, który przed chwilą dotknął.
   */
  const [bladWerdyktu, setBladWerdyktu] = useState<string | null>(null);
  /**
   * ⭐ PLAN-D-O1 — KTÓRY KROK OCENY JEST ROZWINIĘTY. Klucz wystąpienia + id
   * kroku, `null` = wszystkie zwinięte. ⛔ Jeden stan na cały ekran, a nie
   * flaga per krok: dwa rozwinięte kroki naraz to znowu formularz, a formularz
   * jest tym, przed czym stoi decyzja D2.
   */
  const [krokOtwarty, setKrokOtwarty] = useState<string | null>(null);
  /**
   * ⭐⛔ PLAN-D-O1, D3 — RPE STARTUJE PUSTE I NIE MA TU LICZBY.
   * Wartość początkowa bierze się z `rpePoczatkowe()`, która oddaje `null`.
   * ⛔ Nie `useState(5)`, nie `useState(RPE_WARTOSCI[4])`, nie suwak: RPE mierzy
   * wyłącznie subiektywny stan zawodnika, więc podpowiedziana wartość nie jest
   * punktem odniesienia — ONA STAJE SIĘ POMIAREM, a produkt zmierzyłby własny
   * plan zamiast zawodnika i nie miałby jak tego zauważyć.
   */
  const [rpeWybrane, setRpeWybrane] = useState<WartoscRpe | null>(rpePoczatkowe());
  /**
   * ⭐ PLAN-D-O1, D3 strona odwrotna — CZAS TRWANIA PODPOWIADAMY.
   * `null` znaczy „zawodnik nic nie wpisał", a podpowiedź z planu wchodzi
   * przy rozwinięciu kroku. Czas jest faktem zewnętrznym: zawodnik zna go
   * niezależnie i umie poprawić — i to jest cała różnica wobec RPE.
   */
  const [czasWybrany, setCzasWybrany] = useState<number | null>(null);
  const [czasZPlanu, setCzasZPlanu] = useState<boolean>(false);
  /** ⭐ PLAN-D-O1 — ból: miejsce. ⛔ Bez wartości początkowej. */
  const [bolMiejsce, setBolMiejsce] = useState<string | null>(null);
  /**
   * ⭐⭐ PAS B1 21.08.2026 — NATĘŻENIE BÓLU MA WŁASNY STAN I ZACZYNA OD PUSTKI.
   *
   * ⛔ CO TU STAŁO DO 21.08.2026: nic. Stanu nie było, a do kolumny
   * `pain_entries.intensity` wchodziło `rpeWybrane ?? 1` — odpowiedź na pytanie
   * „jak ciężka była sesja" albo wartość domyślna 1. `lib/wgladyZAlgorytmu.ts`
   * podawał tę liczbę zawodnikowi w rejestrze `fakt_o_tobie`, czyli JAKO
   * ZMIERZONY FAKT O JEGO CIELE, i wysyłał ją do raportu dla rodzica.
   *
   * ⛔ `null` znaczy „zawodnik nie podał" i ma znaczyć TYLKO to (R5). Nie ma tu
   * wartości domyślnej — przy bólu liczba podpowiedziana przekrzywia odpowiedź
   * najmocniej ze wszystkich pól produktu (Z6).
   */
  const [bolNatezenie, setBolNatezenie] = useState<WartoscBolu | null>(bolNatezeniePoczatkowe());
  /** ⭐ PLAN-D-O1 — powód nieobecności. ⛔ `null` to „nie wiemy", nie „bez powodu". */
  const [powodWybrany, setPowodWybrany] = useState<PowodNieobecnosci | null>(null);
  // ═════════════════════════════════════════════════════════════════
  // ⭐⭐ PLAN-D-D8 18.08.2026 — ŚCIEŻKA MECZU. DWIE LICZBY, NIE JEDNA.
  //
  // ⛔ OBIE STARTUJĄ PUSTE i to jest ta sama reguła, co przy RPE (Z6):
  // wartość zaznaczona z góry przestaje być podpowiedzią i staje się
  // pomiarem, a produkt zmierzyłby wtedy własne założenie zamiast zawodnika.
  // ⛔ `null` NIE JEST ZEREM. „Nie zaznaczyłem" i „nie wszedłem na boisko"
  // to dwa różne fakty o zawodniku i mają dwa różne stany na ekranie (R5).
  // ═════════════════════════════════════════════════════════════════
  const [minutyNaBoisku, setMinutyNaBoisku] = useState<number | null>(null);
  const [dlugoscMeczu, setDlugoscMeczu] = useState<number | null>(null);
  /** ⭐ Sześć rzeczy z arkusza „powiedz więcej". ⛔ Wszystkie puste na start. */
  const [wiecejOMeczu, setWiecejOMeczu] = useState<WiecejOMeczu>(PUSTE_WIECEJ_O_MECZU);
  /**
   * ⭐ KTÓRY WIERSZ `match_contexts` NALEŻY DO KTÓREGO WYSTĄPIENIA.
   * ⛔ Klucz to `Pytanie.klucz`, wartość to `match_contexts.id`.
   * ⚠️ GRANICA DOWODU (Z0): ta mapa żyje w stanie ekranu, więc po zamknięciu
   * aplikacji jest pusta. `match_contexts` NIE MA kolumny wskazującej
   * `calendar_events` (zmierzone 18.08.2026), więc produkt nie umie odnaleźć
   * wiersza, który sam założył wczoraj. Domknięcie wymaga kolumny wiążącej
   * i jest wypisane w nocie pasa jako dług, a nie przemilczane.
   */
  const [kontekstyMeczu, setKontekstyMeczu] = useState<Record<string, number>>({});
  /**
   * ⭐⭐ PLAN-D-D2 19.08.2026 — TA SAMA MAPA, TYLKO Z BAZY I PO WYSTĄPIENIU.
   * ⛔ `calendar_events.id` → `match_contexts.id`, zbudowana przy KAŻDYM
   * odczycie z kolumny `calendar_event_id`. To ona domyka dziurę opisaną
   * wyżej: po zamknięciu aplikacji `kontekstyMeczu` jest puste, a ta mapa
   * wraca z bazy — więc ponowna ocena DOKŁADA do istniejącego wiersza
   * zamiast zakładać drugi.
   * ⚠️ Wiersze bez `calendar_event_id` (sprzed migracji) w niej nie leżą
   * i to nie jest przeoczenie — nie ma po czym ich odnaleźć.
   */
  const [wierszeMeczuPoWydarzeniu, setWierszeMeczuPoWydarzeniu] =
    useState<ReadonlyMap<number, number>>(new Map());
  /** ⛔ Osobny od `bladWerdyktu`: zapis meczu może się nie udać przy udanej ocenie. */
  const [bladMeczu, setBladMeczu] = useState<string | null>(null);
  const [zapisanoMecz, setZapisanoMecz] = useState<string | null>(null);
  /**
   * ⭐⭐ PAS K1 21.08.2026 — WYDARZENIE ZAŁOŻONE PRZEZ ŚCIEŻKĘ „MECZ BEZ PLANU"
   * W TEJ WIZYCIE. ⛔ `null` znaczy „JESZCZE NIC NIE POWSTAŁO" i to jest stan
   * startowy KAŻDEGO otwarcia arkusza — wyjście z niego w połowie zostawia
   * bazę dokładnie w stanie sprzed dotknięcia „+".
   * ⛔ PO CO TO PAMIĘTAMY: żeby ponowne dotknięcie „Zapisz" po nieudanym
   * zapisie oceny NIE założyło drugiego wydarzenia. Zawodnik, któremu raz
   * padła sieć, miałby w tygodniu dwa mecze i podwójne punkty.
   */
  const [wydarzenieBezPlanu, setWydarzenieBezPlanu] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  // WIEDZA B4 08.08.2026 — podpowiedź z materiału. Osobny stan, bo zapytanie
  // o nią rusza dopiero wtedy, gdy wiadomo, jaki jest segment Celu.
  // PLAN-D-E 08.2026 — dopisane `alwaysVisible: []`. Wariant `loading` typu
  // `HintState` wymaga tego pola od rundy ZAPIS B7; stan początkowy go nie
  // podawał i `npx tsc --noEmit` zgłaszał tu TS2345. Zachowanie bez zmian:
  // `renderHint` wychodzi przez `return null` przy `state === 'loading'`,
  // zanim w ogóle sięgnie po `alwaysVisible`.
  const [hintState, setHintState] = useState<HintState>({ state: 'loading', alwaysVisible: [] });

  // PLAN-D-F 08.2026 — głos tygodnia. Stan początkowy to `brak_wiersza`, a NIE
  // `cisza`: przed odczytem nie wiadomo, czy arbiter policzył ten tydzień, a
  // cisza jest DECYZJĄ arbitra i nie wolno jej udawać. Patrz lib/glosTygodnia.ts.
  const [glos, setGlos] = useState<StanGlosu>({ rodzaj: 'brak_wiersza' });

  // PLAN-D-T (T6) — `null` znaczy „nie odczytałem", a NIE „nie ma dostępu".
  const [moznaZapisywac, setMoznaZapisywac] = useState<boolean | null>(null);

  // PLAN-D-J 08.2026 — stan nałożony przez arbitra. Stan początkowy to
  // `nie_odczytane`, a NIE „nic nie obowiązuje": przed odczytem nie wiadomo,
  // czy zawodnik jest w Osłonie albo po urazie, a udawanie, że nie jest, to
  // dokładnie ten defekt, który ta runda likwiduje.
  const [ograniczenia, setOgraniczenia] = useState<StanOgraniczen>(
    { rodzaj: 'nie_odczytane', powod: 'jeszcze nie odczytano' },
  );

  // Migawka „co było nieprzeczytane w chwili wejścia na ekran" — ten sam wzorzec
  // co w centrum-decyzji.tsx: kropka „Nowe" nie może zniknąć w trakcie tej samej
  // wizyty, zaraz po asynchronicznym oznaczeniu jako przeczytane.
  const unreadSnapshotRef = useRef<Set<number>>(new Set());

  // JEDNA DROGA B2 08.08.2026 — oznaczamy JEDNĄ rekomendację: tę, którą ten ekran
  // faktycznie wyrenderował. Nigdy hurtem, nigdy niewidocznych. Patrz nagłówek, punkt 2.
  const markShownAsViewed = useCallback(async (rec: RecommendationRow | null) => {
    if (!rec || rec.viewed_at) return;
    const nowIso = new Date().toISOString();
    const { error: err } = await supabase
      .from('decision_recommendations')
      .update({ viewed_at: nowIso })
      .eq('id', rec.id);
    if (err) {
      // Brak oznaczenia to tylko kropka przy kolejnej wizycie, nie utrata danych.
      console.error('dzis: nie udało się oznaczyć rekomendacji jako przeczytanej:', err);
      return;
    }
    setFocusRec((prev) => (prev && prev.id === rec.id ? { ...prev, viewed_at: nowIso } : prev));
  }, []);

  // WIEDZA B4 08.08.2026 — jedno zapytanie o podpowiedzi z materiałów.
  // Rusza dopiero po `load()`, bo dopiero wtedy znany jest segment Celu.
  //
  // ⚠️ TU MIESZKA REGUŁA R5. `supabase-js` NIE RZUCA wyjątku, gdy tabeli nie
  // ma — zwraca `{ data: null, error }`. Gdyby ten kod zrobił
  // `rows = data ?? []`, brak tabeli byłby nieodróżnialny od „nie ma treści dla
  // tego segmentu": ekran pokazałby spokojny pusty stan, wszystko wyglądałoby
  // na wdrożone i nikt nigdy by nie wrócił. Dlatego `error` idzie do
  // `buildHintState` NIETKNIĘTY i to ono rozstrzyga, co zawodnik zobaczy.
  // ZAPIS B7 08.08.2026 (M23/B35) — czy w Bloku pod tym Celem czeka NOWA,
  // nieotwarta dawka treści. Osobne, wąskie zapytanie (nie kolumny w selecie
  // z Promise.all — PostgREST przy nieznanej kolumnie odrzuca CAŁE zapytanie,
  // a `content_doses`/`content_dose_seen` to najmłodsze migracje). Każdy brak
  // — kolumny, koperty, klucza — znaczy po prostu „nie pokazuj linii";
  // pierwszy z nich dodatkowo mówi w logu dlaczego.
  const [newDoseWaiting, setNewDoseWaiting] = useState(false);
  const loadNewDose = useCallback(async (blockId: string | null) => {
    if (!blockId) { setNewDoseWaiting(false); return; }
    let { data, error: err } = await supabase
      .from('focus_blocks')
      .select(`${CONTENT_DOSE_COLUMN},${CONTENT_DOSE_SEEN_COLUMN}`)
      .eq('id', blockId)
      .maybeSingle();
    if (err && isMissingSeenColumnError(err) && !isMissingContentDoseColumnError(err)) {
      console.warn(CONTENT_DOSE_SEEN_COLUMN_MISSING_WARN);
      setNewDoseWaiting(false);
      return; // bez kolumny „seen" nie ma jak odróżnić nowej od przeczytanej
    }
    if (err || !data) { setNewDoseWaiting(false); return; }
    const row = data as Record<string, unknown>;
    const parsed = parseContentDoses(row[CONTENT_DOSE_COLUMN]);
    if (parsed.kind !== 'ready' || parsed.doses.length === 0) { setNewDoseWaiting(false); return; }
    const seen = parseSeenKeys(row[CONTENT_DOSE_SEEN_COLUMN]);
    setNewDoseWaiting(!isDoseSeen(seen, parsed.doses[0].klucz));
  }, []);

  const loadHint = useCallback(async (params: {
    segmentId: string | null;
    componentId: string | null;
    birthYear: number | null;
  }) => {
    const { segmentId, componentId, birthYear } = params;
    if (!segmentId) {
      setHintState(buildHintState({ hasGoal: false, error: null, rows: null, age: null }));
      return;
    }
    const age = minimumPossibleAge(birthYear);
    // ZAPIS B7 08.08.2026 (M19) — pytamy rozszerzoną listą kolumn (z
    // `zawsze_widoczna`); gdy migracji nie ma, powtarzamy starą listą i
    // zachowanie wraca bajt w bajt do stanu sprzed rundy 6. Diff wprost
    // z raportu B rundy 6, sekcja 8.1 — to jest WARUNEK wejścia treści
    // bezpieczeństwa do bazy.
    // PLAN-D-E 08.2026 — rozbite na dwie osobne odpowiedzi zamiast ponownego
    // przypisania do tej samej pary zmiennych. Powód jest wyłącznie typowy:
    // druga próba pyta KRÓTSZĄ listą kolumn, więc supabase-js wywodzi dla niej
    // inny kształt `data` niż dla pierwszej, i `npx tsc --noEmit` zgłaszał tu
    // TS2322 (`GenericStringError[]`). Zachowanie jest bajt w bajt to samo:
    // pierwsze zapytanie, warunek powtórki, drugie zapytanie, ten sam `console.warn`.
    const pierwsza = await supabase
      .from('component_hints')
      .select(COMPONENT_HINT_COLUMNS_WITH_ALWAYS)
      .eq('segment_id', segmentId)
      .eq('active', true);
    let data: ComponentHintRow[] | null = pierwsza.data as unknown as ComponentHintRow[] | null;
    let err: unknown = pierwsza.error;
    if (err && shouldRetryWithoutAlwaysVisible(err)) {
      console.warn(ALWAYS_VISIBLE_COLUMN_MISSING_WARN);
      const druga = await supabase
        .from('component_hints')
        .select(COMPONENT_HINT_COLUMNS)
        .eq('segment_id', segmentId)
        .eq('active', true);
      data = druga.data as unknown as ComponentHintRow[] | null;
      err = druga.error;
    }
    setHintState(buildHintState({
      hasGoal: true,
      error: err,
      rows: err ? null : ((data ?? []) as unknown as ComponentHintRow[]),
      componentId,
      age,
    }));
  }, []);

  const load = useCallback(async () => {
    if (!currentUser) return;
    const todayStr = toLocalDateStr(new Date());
    const todayCode = dayCodeFor(new Date());

    // ⭐ PLAN-D-B4 — TRZY NOWE ZAPYTANIA (`meczeRes`, `katalogRes`, `odcinkiRes`).
    // Nadal JEDNA paczka `Promise.all`, więc kosztują jedną rundę sieci, nie trzy.
    // ⭐ PLAN-D-B5 — DWA NOWE ZAPYTANIA (`tydzienRes`, `werdyktyRes`), DOŁOŻONE
    // DO TEJ SAMEJ PACZKI. Koszt: zero dodatkowych rund sieci.
    // ⭐ PLAN-D-C4 — TRZY NOWE ZAPYTANIA (`celeWszystkieRes`, `blokiWszystkieRes`,
    // `checkinyRes`), DOŁOŻONE DO TEJ SAMEJ PACZKI. Koszt: zero dodatkowych
    // rund sieci. Uzasadnienie każdego stoi przy nim niżej.
    const [goalsRes, dziennikRes, recsRes, eventsRes, blocksRes, bolRes, zadaniaRes, userRes, diagRes, glosRes,
      meczeRes, katalogRes, odcinkiRes, tydzienRes, werdyktyRes,
      celeWszystkieRes, blokiWszystkieRes, checkinyRes] = await Promise.all([
      supabase.from('goals').select('id,segment_id,is_priority,status,created_at,origin,suggestion_note,refinement_note')
        .eq('user_id', currentUser.id).eq('status', 'active')
        .order('is_priority', { ascending: false }).order('created_at', { ascending: false }),
      // ⭐ PLAN-D-B2 — JEDNO ZAPYTANIE ZAMIAST DWÓCH. Do 14.08 ten ekran pytał
      // `daily_logs` dwa razy: raz o „czy jest dzisiejszy wpis" (`select('id')`
      // z filtrem na dziś), drugi raz o `calendar_event_id` wykonanych sesji.
      // Kolejka potrzebuje trzeciej rzeczy z tej samej tabeli — snu i RPE
      // z ostatnich wpisów — a trzecie zapytanie o tę samą tabelę byłoby już
      // groteską. Jedno zapytanie karmi WSZYSTKIE TRZY:
      //   • `wejscie.dziennik` rankera (sen, energia, RPE — okno 5 wpisów),
      //   • licznik pracy (`calendar_event_id`),
      //   • „czy jest dzisiejszy wpis" — liczone z `dzien` wpisów, nie z bazy.
      supabase.from('daily_logs').select('id,entry_type,payload,created_at,calendar_event_id')
        .eq('user_id', currentUser.id).order('created_at', { ascending: false }),
      // JEDNA DROGA B2 08.08.2026 — pełne kolumny karty (nie skrót jak dotąd),
      // bo karta pokazuje teraz całą treść i przyciski. Ta sama lista kolumn co
      // w Centrum Decyzji (RECOMMENDATION_COLUMNS) — jedno źródło.
      supabase.from('decision_recommendations').select(RECOMMENDATION_COLUMNS)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false }),
      // ⚠️ PLAN-D 14.08.2026 — WARUNEK WSTĘPNY MIGRACJI A1, NIE KOSMETYKA.
      // Do 14.08.2026 stało tu `.eq('status', 'scheduled')`.
      // Pas A1 rozszerza `calendar_events_status_check` o wartość `'completed'`.
      // Gdyby ten filtr został przy `'scheduled'`, PIERWSZA sesja oznaczona jako
      // wykonana WYPADŁABY Z MIANOWNIKA licznika „N z M sesji" — czyli licznik
      // MALAŁBY DOKŁADNIE WTEDY, GDY ZAWODNIK PRACUJE. Odwrócenie sensu.
      // Ta linia MUSI być wdrożona PRZED migracją A1 (kolejność zmierzona 14.08).
      // PLAN-D-B2 — doszły `status` i `scheduled_time`: obu wymaga
      // `WydarzenieKalendarza` (kontrakt rankera §3). ⚠️ To jest ROZSZERZENIE
      // istniejącego zapytania, nie nowe zapytanie.
      // ⭐ PLAN-D-W1 — doszły `source`, `coach_session_id` i `planned_minutes`.
      // Bez nich waga jednostki pracy nie ma z czego się policzyć: rodzaj mówi,
      // kto tę pozycję założył (dowód zewnętrzny), a `planned_minutes` niesie
      // długość, o którą chodzi w progu 45 minut. ⚠️ ROZSZERZENIE zapytania.
      supabase.from('calendar_events').select('id,title,event_type,source,coach_session_id,planned_minutes,scheduled_date,scheduled_time,status,recurrence_rule,focus_block_id')
        .eq('user_id', currentUser.id).in('status', ['scheduled', 'completed']),
      // WIEDZA B4 08.08.2026 — doszło `component_id` (Element Bloku Skupienia),
      // żeby podpowiedź dało się wycelować w to, nad czym zawodnik pracuje.
      supabase.from('focus_blocks').select('id,segment_id,status,component_id')
        .eq('user_id', currentUser.id).eq('status', 'active'),
      // ⭐ PLAN-D-B2, NOWE ZAPYTANIE nr 1 — BÓL. Wejście `bol` rankera: hamulec
      // O1 punkt 2 (zgłoszony ból wycisza dokładanie objętości) i premia, która
      // podnosi rzeczy o ciele. Bez niego wejście musiałoby oddać jawne
      // „nie wiem", czyli kolejka mówiłaby „lista jest niepełna" PRZY KAŻDYM
      // wejściu na ekran u każdego zawodnika — a to jest zdanie, które po
      // tygodniu przestaje cokolwiek znaczyć.
      // ⭐ PLAN-D-B4 — DOSZŁA JEDNA KOLUMNA `body_location`. ⚠️ To jest
      // ROZSZERZENIE istniejącego zapytania, nie zapytanie nowe: wgląd WT-25
      // („ten sam ból trzeci raz") grupuje zgłoszenia po miejscu, a bez tej
      // kolumny musiałby zgadywać, czy trzy zgłoszenia to trzy razy to samo,
      // czy trzy różne rzeczy.
      supabase.from('pain_entries').select('id,body_location,intensity,excludes_from_training,created_at')
        .eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(20),
      // ⭐ PLAN-D-B2, NOWE ZAPYTANIE nr 2 — ZADANIA ZAWODNIKA. To jest wejście,
      // o które chodzi w całym etapie B i C: `player_tasks` (pas A4).
      // ⚠️ ZMIERZONE 14.08.2026: tabela ma 0 wierszy, więc dziś to zapytanie
      // odda `brak_danych` u każdego. Tak ma być — pusty ekran jest uczciwy,
      // a producenta zadań buduje pas B3.
      supabase.from(TABELA_ZADAN).select(SELECT_ZADANIA).eq('user_id', currentUser.id),
      // WIEDZA B4 08.08.2026 — rocznik. JEDYNE źródło wieku, jakie appka ma
      // (`app/(tabs)/profil.tsx`, etap 0 kreatora). Karmi wyłącznie bramkę
      // wiekową A9 i nie jest nigdzie pokazywany.
      // ⭐ PLAN-D-A2 D4 — nazwa tabeli i lista kolumn z `lib/wejsciaWgladow.ts`,
      // czyli z tego samego miejsca, z którego bierze je „Moje zadania".
      supabase.from(TABELA_PROFILU).select(SELECT_PROFILU).eq('id', currentUser.id).limit(1),
      // PIERWSZE URUCHOMIENIE 10.08.2026 — samo ISTNIENIE diagnozy, nic więcej.
      // `head: true` + `count: 'exact'` nie ściąga ani jednego wiersza, więc
      // dokładamy do tej paczki zapytanie o zerowym koszcie transferu.
      // Warunek `scores is not null` jest ten sam, którego używa
      // `fetchLatestDiagnosisPerUser()` w cronie onboardującym — żeby appka
      // i silnik liczyły „ma diagnozę" DOKŁADNIE tak samo. Bez tego appka
      // mogłaby uznać za wypełnioną ankietę, której cron nie widzi.
      // ⭐ PLAN-D-W4 — TO ZAPYTANIE PRZESTAJE LICZYĆ WIERSZE, A ZACZYNA JE CZYTAĆ.
      // Do tego pasa pytało wyłącznie „czy jest choć jedna diagnoza" (`head: true`),
      // czyli produkt WIEDZIAŁ, że diagnoza istnieje, i NIE PATRZYŁ, co w niej stoi.
      // `scores` niesie wynik 0–100 dla 13 obszarów, `position` — pozycję, po której
      // `lib/positionProfiles.ts` zna tier każdego obszaru. Iloczyn tych dwóch rzeczy
      // to ZWROT — i nikt go dotąd nie policzył.
      supabase.from('diagnostics').select('id,scores,position,own_training_types')
        .eq('user_id', currentUser.id).order('id', { ascending: false }).limit(1),
      // PLAN-D-F 08.2026 — głos tygodnia na BIEŻĄCY tydzień. Poniedziałek liczony
      // tą samą regułą co w backendzie (`poniedzialekGlosu`), więc appka pyta
      // dokładnie o ten wiersz, który zapisał cron.
      // ⚠️ `weekly_voice` ma politykę `select_own` — to zapytanie idzie tokenem
      // zawodnika i zobaczy WYŁĄCZNIE jego wiersz. Zapis robi cron rolą
      // service_role, appka nigdy tu nie pisze.
      // PLAN-D-J 08.2026 — doszła kolumna `ograniczenia`. ⚠️ PostgREST przy
      // nieznanej kolumnie odrzuca CAŁE zapytanie, więc dopóki migracja J1 nie
      // jest wykonana, ten select by się wywrócił i karta głosu ZNIKNĘŁABY
      // z ekranu. Dlatego niżej stoi jawne ponowienie bez tej kolumny — patrz
      // `isMissingOgraniczeniaColumnError`.
      supabase.from('weekly_voice').select(`week_start, voice, reason, spoke_at, ${KOLUMNA_OGRANICZEN}`)
        .eq('user_id', currentUser.id).eq('week_start', poniedzialekGlosu(new Date())).limit(1),
      // ⭐ PLAN-D-B4, NOWE ZAPYTANIE nr 1 — KASKADA MECZOWA (WG-30, WG-34).
      // ⚠️ ZMIERZONE 14.08.2026: `match_contexts` ma 2 wiersze, oba z 29.07,
      // a próg osi to trzy mecze. Dziś ten wgląd ODDA `brak_danych` z powodem
      // i tak ma być — oś trzech punktów narysowana z dwóch byłaby zmyśleniem.
      supabase.from(TABELA_MECZOW).select(SELECT_MECZOW)
        .eq('user_id', currentUser.id).order('created_at', { ascending: false }),
      // ⭐ PLAN-D-B4, NOWE ZAPYTANIE nr 2 — KATALOG PODPOWIEDZI (WT-26).
      //
      // ⛔ FILTR ODBIORCY JEST OBOWIĄZKOWY I NIE JEST OSTROŻNOŚCIĄ. Bez
      // `odbiorca in ('zawodnik','oba')` wgląd powiedziałby zawodnikowi, że
      // traci 18 podpowiedzi — a wszystkie 18 bramkowanych wiekiem ma
      // `odbiorca='rodzic'` i NIGDY by ich nie zobaczył (znalezisko 10.9 noty
      // B3, potwierdzone zapytaniem 14.08.2026: 0 z 274). To byłaby nieprawda
      // o zawodniku przy zielonych testach, czyli dokładnie to, czego zakazuje Z0.
      //
      // ⚠️ JEDNO ZAPYTANIE NA DWIE LICZBY Z TRZECH: `podpowiedziRazem` to
      // długość odpowiedzi, `podpowiedziZaBramkaWieku` to wiersze z `min_age`.
      // Dwa osobne `count` byłyby dwoma zapytaniami po tę samą tabelę.
      supabase.from(TABELA_KATALOGU).select(SELECT_KATALOGU).in(KOLUMNA_ODBIORCY, [...ODBIORCY_KATALOGU]),
      // ⭐ PLAN-D-B4, NOWE ZAPYTANIE nr 3 — ODCINKI MAPY DROGI (WT-26).
      // ⚠️ `count: 'exact'` + `head: true` NIE ŚCIĄGA ANI JEDNEGO WIERSZA.
      // Trzeciej liczby katalogu NIE DA SIĘ dołożyć do zapytania wyżej:
      // `road_segments` nie ma relacji z `component_hints`, a PostgREST nie
      // łączy tabel, między którymi relacji nie ma. Trzy liczby katalogu
      // kosztują więc DWA zapytania — nie trzy i nie jedno.
      supabase.from(TABELA_ODCINKOW).select(SELECT_ODCINKOW, { count: 'exact', head: true }),
      // ⭐ PLAN-D-B5, NOWE ZAPYTANIE nr 1 — WYDARZENIA BEZ FILTRA STATUSU.
      //
      // ⚠️ TO NIE JEST DUBLET ZAPYTANIA `eventsRes` I POWÓD JEST POLICZALNY.
      // Tamto ma `.in('status', ['scheduled','completed'])` i musi je mieć:
      // karmi rankera, sześć wejść wglądów, listę „Dziś w kalendarzu" i pasek
      // postępu Bloku — a każdy z tych czterech konsumentów policzyłby
      // odwołane wydarzenie jako pracę do zrobienia.
      //
      // ⛔ LICZNIK PRACY MUSI WIDZIEĆ `cancelled`. Zmierzone 15.08.2026 na
      // produkcji: `session_verdicts` 0 wierszy · `status='completed'` 0 z 24 ·
      // `daily_logs.calendar_event_id` 0 z 10. **Odwołanie jest dziś JEDYNYM
      // dowodem „nie odbyło się" w całej bazie.** Bez tych 12 wierszy licznik
      // oddałby `brak_podstawy` zawodnikowi, u którego poprawną odpowiedzią
      // jest „0 z 2" — czyli milczałby, mając czym mówić.
      //
      // ⚠️ ROZSZERZENIE TAMTEGO ZAPYTANIA O `cancelled` BYŁO ROZWAŻONE
      // I ODRZUCONE: jedna tablica dla pięciu konsumentów znaczy, że każdy
      // z nich musi pamiętać o odfiltrowaniu odwołań, a pierwszy, który
      // zapomni, zepsuje się CICHO. Osobna, wąska odpowiedź nie ma tej wady.
      //
      // ⭐ PLAN-D-F1 15.08.2026 — DOSZŁA JEDNA KOLUMNA: `focus_block_id`.
      //
      // ⚠️ TO JEST ROZSZERZENIE ISTNIEJĄCEGO ZAPYTANIA, NIE NOWE ZAPYTANIE —
      // ten sam ruch i to samo uzasadnienie, którym B2 dołożył tu `status`
      // i `scheduled_time`, a B4 `body_location` do `pain_entries`. Koszt:
      // zero nowych zapytań, zero nowych rund sieci, zero nowych dróg awarii.
      //
      // ⛔ DLACZEGO NIE `eventsRes`, KTÓRE `focus_block_id` JUŻ MA. Bo tamto
      // zapytanie ma `.in('status', ['scheduled','completed'])`, czyli DRUGI
      // z dwóch filtrów, które kasują pracę zawodnika po domknięciu Bloku.
      // Zmierzone 15.08.2026 na produkcji: Blok `completed` ma wszystkie 12
      // swoich sesji w statusie `cancelled`, więc `eventsRes` nie zawiera
      // z niego ANI JEDNEGO wiersza. Dorobek policzony z tamtej odpowiedzi
      // byłby MNIEJSZY OD PRAWDY — i to jest dokładnie ta jedna droga, której
      // typ `BlockEventLike` nie umie zablokować (patrz `lib/focusBlockProgress.ts`,
      // sekcja PLAN-D-E2, „ZOSTAJE JEDNO MIEJSCE: wywołanie").
      //
      // ⛔ DLACZEGO NIE ZDJĄĆ FILTRA Z `eventsRes` — rozważone i odrzucone:
      // tamta odpowiedź karmi rankera, sześć wejść wglądów, listę „Dziś
      // w kalendarzu" i pasek postępu Bloku. Każdy z tych konsumentów
      // policzyłby odwołane wydarzenie jako pracę do zrobienia. To jest ten
      // sam wybór, który B5 uzasadnił, zakładając to zapytanie.
      // ⭐ PLAN-D-O1 17.08.2026 — DOSZŁA JEDNA KOLUMNA `coach_session_id`.
      // ⚠️ To jest ROZSZERZENIE istniejącego zapytania, nie nowe zapytanie.
      // Po co: decyzja D6 każe rozpoznawać rodzaj pozycji Z DANYCH, a nie
      // z listy nazw (O84). `coach_session_id` jest jedynym polem, które mówi
      // „tę pozycję wiąże ktoś poza zawodnikiem" NIEZALEŻNIE od tego, ile
      // rodzajów wydarzeń przybędzie w `chk_calendar_events_event_type`.
      supabase.from('calendar_events')
        .select('id,title,event_type,scheduled_date,scheduled_time,status,recurrence_rule,source,focus_block_id,coach_session_id')
        .eq('user_id', currentUser.id),
      // ⭐ PLAN-D-B5, NOWE ZAPYTANIE nr 2 — WERDYKTY ZAWODNIKA (pas D1).
      // Ten sam wąski kształt co w `app/(tabs)/kalendarz.tsx` — cztery kolumny,
      // bo tyle czyta `czytajWerdykty`.
      //
      // ⛔ TEN EKRAN WERDYKTÓW NIE ZAPISUJE. Zapis mieszka w Kalendarzu
      // (pas D1, `oznaczNieodbyte`). Drugie miejsce zapisu byłoby drugim
      // źródłem prawdy o tym samym wystąpieniu.
      //
      // ⚠️ ZMIERZONE 15.08.2026: tabela `session_verdicts` ISTNIEJE na
      // produkcji (migracja D1 wykonana, 3 polityki, granty dokładnie
      // INSERT/SELECT/UPDATE) i ma 0 wierszy. Gałąź `brak` z `czytajWerdykty`
      // NIE POWINNA już wchodzić — jeżeli wejdzie, to jest znalezisko.
      supabase.from('session_verdicts')
        .select('calendar_event_id,occurred_on,verdict,withdrawn_at')
        .eq('user_id', currentUser.id),
      // ⭐ PLAN-D-C4, NOWE ZAPYTANIE nr 1 — CELE **BEZ FILTRA STATUSU**.
      //
      // ⚠️ TO NIE JEST DUBLET `goalsRes` I POWÓD JEST ZMIERZONY, NIE ESTETYCZNY.
      // Tamto ma `.eq('status','active')` i musi je mieć: karmi kafelek wąskiego
      // gardła, rankera, Mapę drogi i cztery inne miejsca, z których każde pyta
      // „nad czym pracujesz TERAZ".
      //
      // ⛔ ODZNAKA MUSI WIDZIEĆ TAKŻE CELE DOMKNIĘTE. Zmierzone 15.08.2026 na
      // produkcji: `goals` ma 6 wierszy, z czego **2 mają `status='completed'`**,
      // a wiersze NIE SĄ KASOWANE. Zawodnik `0be298a2…` ma cel `wytrzymalosc`
      // domknięty. Gdyby „praca nad Twoim celem" liczyła się ze zbioru
      // filtrowanego po `active`, odznaka **przepadłaby w dniu domknięcia celu**
      // — czyli licznik cofnąłby się z powodu SUKCESU. To jest ten sam defekt,
      // co seria dni, tylko lepiej ukryty (N1).
      //
      // ⚠️ ROZSZERZENIE `goalsRes` O CELE NIEAKTYWNE BYŁO ROZWAŻONE I ODRZUCONE:
      // siedmiu konsumentów tamtej odpowiedzi zakłada wąskość, a pierwszy, który
      // o niej zapomni, zepsuje się CICHO. Osobna, wąska odpowiedź (jedna
      // kolumna) nie ma tej wady i kosztuje zero dodatkowych rund sieci — jedzie
      // w tej samej paczce `Promise.all`.
      supabase.from('goals').select('segment_id').eq('user_id', currentUser.id),
      // ⭐ PLAN-D-C4, NOWE ZAPYTANIE nr 2 — BLOKI SKUPIENIA **BEZ FILTRA STATUSU**.
      // Ten sam powód: `blocksRes` ma `.eq('status','active')`, a mapa
      // `focus_block_id → segment_id` musi obejmować też bloki ZAMKNIĘTE —
      // inaczej praca wykonana w domkniętym Bloku traci segment i przestaje
      // liczyć się do celu. Zmierzone 15.08.2026: `focus_blocks` = 2 wiersze,
      // z czego **1 ma `status='completed'`**. Dwie kolumny, zero nowych rund.
      supabase.from('focus_blocks').select('id,segment_id').eq('user_id', currentUser.id),
      // ⭐ PLAN-D-C4, NOWE ZAPYTANIE nr 3 — ODPOWIEDZI KONTROLNE BLOKU.
      //
      // ⚠️ `focus_block_checkins` NIE MA KOLUMNY `user_id` (zmierzone
      // 15.08.2026 na `information_schema.columns`), więc nie ma czego filtrować
      // — zawęża RLS: polityka `focus_block_checkins_select_own` przepuszcza
      // wiersze, których `focus_block_id` wskazuje Blok należący do `auth.uid()`.
      // Sprawdzone w `pg_policies`, nie założone.
      //
      // ⛔ TO ZAPYTANIE JEST OBOWIĄZKOWE, A NIE OZDOBNE. Odpowiedź kontrolna
      // jest jednym z czterech źródeł wykonanej pracy, a `policzNagrode`
      // z założenia ODMAWIA policzenia dorobku, gdy któregokolwiek źródła nie
      // przeczytano. Gdyby ten ekran deklarował „nie czytam odpowiedzi
      // kontrolnych", dorobek nie policzyłby się NIGDY i U NIKOGO.
      // ⚠️ Dziś ta tabela ma 1 wiersz i 0 odpowiedzianych — czyli wnosi zero
      // i tak ma być. Zero z odczytu to nie to samo, co zero z milczenia.
      supabase.from('focus_block_checkins').select('id,focus_block_id,answered_at'),
    ]);

    // PLAN-D-F 08.2026 — trzy różne powody, dla których tu może nic nie być:
    // błąd odczytu / arbiter jeszcze nie policzył / arbiter policzył CISZĘ.
    // `stanGlosu` je rozdziela, a `opisDoLogu` mówi który zaszedł — bez tego
    // „Dziś nic nie pokazuje" jest nie do zdiagnozowania.
    // PLAN-D-J 08.2026 — gdy migracja J1 nie jest jeszcze wykonana, PostgREST
    // odrzuca CAŁE zapytanie z powodu jednej nieznanej kolumny. Ponawiamy bez
    // niej: głos tygodnia ma się pokazać, a ograniczenia zostają jawnym
    // „nie wiem". Kolejność wdrożenia nie może gasić ekranu.
    // ⚠️ TYP JAWNY, NIE WYWNIOSKOWANY (poprawka 13.08.2026, błąd TS2322).
    // Bez tego `glosData` bierze typ z pierwszego zapytania — czyli Z kolumną
    // `ograniczenia` — i przypisanie wyniku ponowienia, które tej kolumny nie
    // pobiera, nie kompiluje się. Wąski typ mówi wprost, na czym od tego miejsca
    // POLEGAMY: na czterech kolumnach głosu. Ograniczenia jadą osobną drogą,
    // przez `ograniczeniaSurowe`, i nikt ich stąd nie czyta.
    type WierszGlosuSurowy = { week_start: unknown; voice: unknown; reason: unknown; spoke_at: unknown };
    let glosData: WierszGlosuSurowy[] | null = glosRes.data;
    let glosError: { message: string } | null = glosRes.error;
    let ograniczeniaSurowe: unknown = ((glosRes.data ?? [])[0] as Record<string, unknown> | undefined)?.[KOLUMNA_OGRANICZEN];
    let bladOgraniczen: string | null = glosRes.error ? glosRes.error.message : null;
    if (glosRes.error && isMissingOgraniczeniaColumnError(glosRes.error)) {
      console.warn(`dzis: kolumny „${KOLUMNA_OGRANICZEN}" nie ma w bazie — migracja J1 niewykonana. `
        + 'Czytam głos tygodnia bez niej; ograniczenia zostają jawnym „nie wiem".');
      const drugi = await supabase.from('weekly_voice').select('week_start, voice, reason, spoke_at')
        .eq('user_id', currentUser.id).eq('week_start', poniedzialekGlosu(new Date())).limit(1);
      glosData = drugi.data;
      glosError = drugi.error;
      ograniczeniaSurowe = undefined;
      bladOgraniczen = `kolumny „${KOLUMNA_OGRANICZEN}" nie ma jeszcze w bazie`;
    }

    const stanTygodnia = stanGlosu(
      ((glosData ?? [])[0] as WierszGlosu | undefined) ?? null,
      glosError ? glosError.message : null,
    );
    setGlos(stanTygodnia);
    if (stanTygodnia.rodzaj === 'nie_wiem') console.error(`dzis: ${opisDoLogu(stanTygodnia)}`);
    else console.log(`dzis: ${opisDoLogu(stanTygodnia)}`);

    const stanOgraniczen = czytajOgraniczenia(ograniczeniaSurowe, bladOgraniczen);
    setOgraniczenia(stanOgraniczen);
    console.log(`dzis: ${opisOgraniczenDoLogu(stanOgraniczen)}`);

    // ⚠️ PLAN-D-W4 — TEN ODCZYT BYŁ NIEZAUWAŻONY I STRAŻNIK MIAŁ RACJĘ.
    // `(goalsRes.data ?? [])` zamieniało BŁĄD ODCZYTU w „ten zawodnik nie ma
    // celów" — czyli zawodnik z celem wyglądał jak zawodnik bez celu, a ekran
    // pierwszego kroku mógł mu się pokazać po zwykłej awarii sieci.
    // ⛔ Nie zmieniam tu kształtu ekranu (to nie jest zakres tego pasa), ale
    // błąd przestaje ginąć: jest odczytany, nazwany w konsoli i NIE UDAJE pustki.
    if (goalsRes.error) {
      console.warn(`dzis: [PLAN-D-W4] nie odczytałem celów — ${powodBledu(goalsRes.error)}`);
    }
    const goals = (goalsRes.error || !Array.isArray(goalsRes.data) ? [] : goalsRes.data) as Goal[];
    const goal = goals.find((g) => g.is_priority) ?? goals[0] ?? null;
    setPriorityGoal(goal);
    setHasAnyGoal(!goalsRes.error && goals.length > 0);
    // PIERWSZE URUCHOMIENIE 10.08.2026 — przy błędzie zapytania NIE udajemy,
    // że diagnozy nie ma (to wepchnęłoby zawodnika z gotową diagnozą w ekran
    // pierwszego kroku). Błąd = zostawiamy `null`, czyli stan „nie wiem",
    // a ekran zachowuje się wtedy jak dotąd.
    // ⚠️ PLAN-D-W4 — `head: true` i `count: 'exact'` ZNIKNĘŁY z tego zapytania,
    // więc `diagRes.count` jest od teraz `null`. Gdyby ta linia została bez zmiany,
    // KAŻDY zawodnik z gotową diagnozą zostałby wepchnięty w ekran pierwszego kroku.
    // Liczymy z wierszy, nie z licznika. Stan „nie wiem" przy błędzie — bez zmian.
    setHasDiagnosis(diagRes.error ? null : Array.isArray(diagRes.data) && diagRes.data.length > 0);

    // ⭐ PLAN-D-W4 — RANKING ZWROTU. Dwie osie, które od dawna leżą w produkcie
    // i nigdy nie zostały pomnożone: wynik 0–100 z diagnozy i tier pozycji
    // z `lib/positionProfiles.ts`. ⛔ Błąd odczytu NIE odbiera nikomu punktów —
    // trafność spada wtedy do bazy 1,0 dla całej pracy (decyzja Kuby 1A).
    const zwrotObszarow: ZwrotObszarow = (() => {
      if (diagRes.error) return { rodzaj: 'nie_wiemy', powod: `diagnoza: ${powodBledu(diagRes.error)}` };
      if (!Array.isArray(diagRes.data) || diagRes.data.length === 0) {
        return { rodzaj: 'nie_wiemy', powod: 'ten zawodnik nie ma jeszcze diagnozy' };
      }
      const w = diagRes.data[0] as unknown as { scores: string | null; position: string | null };
      let wyniki: Record<string, unknown> | null = null;
      try {
        // ⚠️ `diagnostics.scores` to KOLUMNA TEKSTOWA z JSON-em w środku,
        // nie `jsonb` — zmierzone 18.08 na `information_schema.columns`.
        const sparsowane = typeof w?.scores === 'string' ? JSON.parse(w.scores) : null;
        if (sparsowane !== null && typeof sparsowane === 'object') wyniki = sparsowane as Record<string, unknown>;
      } catch {
        // ⛔ Niepoprawny JSON to „nie wiem", a nie „zero zwrotu" (R5).
        return { rodzaj: 'nie_wiemy', powod: 'nie umiem odczytać wyników diagnozy' };
      }
      return policzZwrotObszarow({ wyniki, pozycja: w?.position ?? null });
    })();
    if (zwrotObszarow.rodzaj === 'nie_wiemy') {
      console.warn(`dzis: [PLAN-D-W4] trafność pracy nieliczona — ${zwrotObszarow.powod}`);
    }

    // ⚠️ PLAN-D-W4 — DRUGI NIEZAUWAŻONY ODCZYT, ODSŁONIĘTY PRZEZ TEN SAM PAS.
    // Do dziś ta linia była „zakryta" wyłącznie tym, że sześćset znaków wyżej
    // padało słowo `error` w NIEZWIĄZANEJ z nią gałęzi. Po wstawieniu bloku
    // zwrotu obszarów okno się przesunęło i strażnik ją zobaczył — a defekt
    // był tu cały czas: przy błędzie odczytu rekomendacji zawodnik widzi
    // „nie mam dla Ciebie nic", zamiast „nie udało mi się tego odczytać" (R5).
    if (recsRes.error) {
      console.warn(`dzis: [PLAN-D-W4] nie odczytałem rekomendacji — ${powodBledu(recsRes.error)}`);
    }
    const recs = (recsRes.error || !Array.isArray(recsRes.data) ? [] : recsRes.data) as unknown as RecommendationRow[];
    const rec = recs.find((r) => r.recommendation_type === 'training_focus') ?? null;
    unreadSnapshotRef.current = new Set(recs.filter((r) => !r.viewed_at).map((r) => r.id));
    setFocusRec(rec);
    // „N nowe" na linku do wszystkich rekomendacji liczy WYŁĄCZNIE te, których
    // ten ekran nie pokazuje — inaczej etykieta kłamałaby zaraz po wejściu.
    setOtherUnreadCount(recs.filter((r) => !r.viewed_at && r.id !== rec?.id).length);
    setOpenActionableCount(recs.filter((r) =>
      (r.recommendation_type === 'specialist_referral' || r.recommendation_type === 'position_fit_signal')
      && !r.feedback_response).length);
    markShownAsViewed(rec);

    // ═══════════════════════════════════════════════════════════════
    // ⭐ PLAN-D-F1 15.08.2026, zadanie F1.3 — OSIEROCONE `?? []` ZNIKA.
    //
    // DO TEGO PASA STAŁO TU: `const events = (eventsRes.data ?? []) as CalEvent[];`
    // z komentarzem „`?? []` ZOSTAJE WYŁĄCZNIE TU (…) i którego ten pas nie
    // przebudowuje". Pas, który tak napisał, skończył się 15.08 i wypchnął
    // (`931bb16`); pozycja została na liście `DLUG_ZASTANY` strażnika
    // `lib/pustkaWCalymRepo.selftest.ts` jako **dług bez właściciela** (E1).
    //
    // CO ZAWODNIK CZYTAŁ PRZEZ TO: `events` karmi `wydarzeniaDnia`, czyli
    // kartę „Dziś w kalendarzu". Nieudany odczyt dawał PUSTĄ TABLICĘ, a pusta
    // tablica znaczy dla `rozpoznajPustke` „maWpisy: false" — więc zawodnik
    // z trzema treningami w kalendarzu czytał „Nic zaplanowanego na dziś.",
    // zdanie z rejestru FAKT O TOBIE, postawione po odczycie, który nie doszedł.
    //
    // WZORZEC WZIĘTY CO DO ZNAKU z `PRZEKAZANIE_PAS_C3_15_08_2026.md` §8:
    // gałąź błędu NIE CZYŚCI listy i NAZYWA to, co się stało. Tu jedno i drugie:
    //   • `null` ≠ `[]` — trzy stany zamiast dwóch, jak przy `wydarzeniaTygodnia`;
    //   • lista sprzed nieudanego ODŚWIEŻENIA zostaje (patrz `setDane` niżej —
    //     gałąź błędu przepisuje `wydarzeniaDnia` z poprzedniego stanu);
    //   • log z powodem, więc błąd przestaje być niewidoczny;
    //   • ekran dostaje czwarty rodzaj pustki (`odczytUdanySie: false`), czyli
    //     „Nie udało się sprawdzić." zamiast zdania o zawodniku.
    // ═══════════════════════════════════════════════════════════════
    const events: CalEvent[] | null =
      eventsRes.error || !Array.isArray(eventsRes.data)
        ? null
        : (eventsRes.data as unknown as CalEvent[]);
    if (events === null) {
      console.warn(opisBleduOdczytuDoLogu('dzis.load → calendar_events', eventsRes.error));
    }

    // PLAN-D-T 08.2026 (14.08.2026), zadanie T6 — STAN DOSTĘPU DO ZAPISU.
    // ⚠️ ŚWIADOMIE OSOBNE, WĄSKIE WYWOŁANIE: gdyby RPC `stan_dostepu` padło
    // albo nie istniało, ekran „Dziś" ma działać dalej. Nieudany odczyt daje
    // `null`, czyli „nie wiem" — a „nie wiem" NIE mówi zawodnikowi, że
    // stracił dostęp (kierunek błędu jak przy ograniczeniach).
    const dostepRes = await supabase.rpc(RPC_STAN_DOSTEPU);
    const stanDostepu = czytajStanDostepu(
      dostepRes.data, dostepRes.error ? dostepRes.error.message : null,
    );
    setMoznaZapisywac(stanDostepu.rodzaj === 'znany' ? stanDostepu.maDostep : null);

    // ─── Wskaźnik pracy (patrz nagłówek pliku, punkt 4) ───────────────
    // Cała logika (i uzasadnienie każdej decyzji) siedzi w
    // lib/focusBlockProgress.ts — czysta funkcja, uruchamiana i sprawdzana bez
    // appki przez lib/focusBlockProgress.selftest.ts. Tutaj tylko dane.
    //
    // ⭐ PLAN-D-F1 15.08.2026 — SAMO WYWOŁANIE PRZENIOSŁO SIĘ NIŻEJ, do sekcji
    // „WEJŚCIA TYGODNIA I LICZNIKA", i to nie jest przestawianie mebli.
    // `computeFocusBlockProgressState` rozstrzyga między „0 z M" a „nie wiemy,
    // ile z M" DYSKRYMINATOREM, którym jest zbiór powiązań wpisu z sesją —
    // a UCZCIWY zbiór powiązań (`wpisyDziennikaIds`, z `null` przy nieudanym
    // odczycie) powstaje dopiero tam. Liczony tutaj, szedłby z
    // `(dziennikRes.data ?? [])`, czyli z pustego zbioru NIEODRÓŻNIALNEGO od
    // „żaden wpis nie wskazuje sesji" — i wtedy trzeci stan pasa A1 orzekałby
    // o zawodniku na podstawie awarii sieci.
    const activeBlocks = (blocksRes.data ?? []) as FocusBlockRow[];

    setLoading(false);

    // ─── Podpowiedź z materiału (WIEDZA B4 08.08.2026) ────────────────
    // Świadomie POZA `Promise.all` wyżej: zapytanie potrzebuje `segment_id`
    // Celu, którego przed tamtym zapytaniem nie znamy. Ekran ma na to własny
    // stan ładowania, więc rekomendacja nie czeka na podpowiedź.
    // Blok Skupienia bierzemy ten, który stoi pod Celem — nie dowolny aktywny.
    const blockForGoal = goal
      ? activeBlocks.find((b) => b.segment_id === goal.segment_id) ?? null
      : null;
    // ⭐ PLAN-D-A2 D4 — rocznik przez `rocznikZOdpowiedzi` z `lib/wejsciaWgladow.ts`.
    // ⚠️ TO SAMO WYRAŻENIE, KTÓRYM WGLĄD WT-26 liczy `rokUrodzenia`: bramka
    // wiekowa A9 i wgląd o roczniku czytają odpowiedź `users` JEDNĄ regułą,
    // więc nie mogą się rozjechać. Błąd odczytu daje `null`, czyli „appka nie
    // zna wieku", czyli bramka zamknięta — bez cichego „załóżmy, że dorosły".
    const birthYear = rocznikZOdpowiedzi(userRes);
    loadHint({
      segmentId: goal?.segment_id ?? null,
      componentId: blockForGoal?.component_id ?? null,
      // Błąd odczytu rocznika daje `null`, czyli „appka nie zna wieku", czyli
      // bramka A9 zamknięta. Nie ma tu cichego fallbacku „załóżmy, że dorosły".
      birthYear: userRes.error ? null : birthYear,
    });
    loadNewDose(blockForGoal?.id ?? null);

    // ═══════════════════════════════════════════════════════════════
    // ⬇⬇⬇ WEJŚCIA KOLEJKI — POCZĄTEK ⬇⬇⬇   (PLAN-D-B2, zadanie B2.2)
    //
    // ⛔ W TEJ SEKCJI NIE MA PRAWA PAŚĆ ANI JEDNO `?? []` ANI `|| []`.
    // Każde wejście ma TRZY stany: `jest` / `brak` / `nie_wiem`. Sklejenie
    // dwóch ostatnich zamienia „nie udało mi się odczytać" w „nie masz nic" —
    // czyli w nieprawdę o zawodniku (Z0). Pilnuje tego asercja nr 3
    // w `lib/kolejkaNaDzis.selftest.ts`, nie ten komentarz.
    // ═══════════════════════════════════════════════════════════════
    const weKalendarz: Wejscie<WydarzenieKalendarza[]> =
      wejscieZOdpowiedzi<CalEvent, WydarzenieKalendarza>(eventsRes, 'kalendarz', (e) => ({
        id: e.id,
        title: e.title,
        event_type: e.event_type,
        scheduled_date: e.scheduled_date,
        scheduled_time: e.scheduled_time,
        status: e.status,
        focus_block_id: e.focus_block_id,
      }));

    const weDziennik: Wejscie<WpisDziennikaWejscie[]> =
      wejscieZOdpowiedzi<WierszDziennika, WpisDziennikaWejscie>(dziennikRes, 'dziennik', wpisDziennikaDlaKolejki);

    const weBol: Wejscie<WpisBolu[]> =
      wejscieZOdpowiedzi<WierszBolu, WpisBolu>(bolRes, 'ból', wpisBoluDlaKolejki);

    // CEL — dwa zapytania, jedno wejście. ⚠️ Błąd KTÓREGOKOLWIEK z nich znaczy
    // „nie wiem, nad czym pracujesz", a nie „nie masz nad czym pracować".
    const weCel: Wejscie<WejscieCelu> = (goalsRes.error || blocksRes.error)
      ? { rodzaj: 'nie_wiem', powod: `cel: ${powodBledu(goalsRes.error ?? blocksRes.error)}` }
      : {
        rodzaj: 'jest',
        dane: { segmentCelu: goal ? goal.segment_id : null, maAktywnyBlok: blockForGoal !== null },
      };

    // MECZ — ⚠️ ZMIERZONE 14.08.2026: w całej bazie jest ZERO wydarzeń
    // `event_type = 'match'`, a jedyny inny ślad meczu (`match_contexts`)
    // opisuje mecz JUŻ OPISANY, czyli taki, na który kaskada nie czeka.
    // Ten ekran nie czyta stanu kaskady. Dlatego: gdy meczu w kalendarzu nie
    // ma — mówię „brak" i to jest prawda odczytana z kalendarza; gdy jest —
    // mówię „nie wiem", zamiast zgadywać, czy kaskada czeka. Wejście domyka
    // pas B3 (wgląd z kaskady meczowej).
    const meczeMinione = weKalendarz.rodzaj === 'jest'
      ? weKalendarz.dane.filter((e) => e.event_type === 'match'
        && e.scheduled_date !== null && e.scheduled_date <= todayStr)
      : [];
    const weMecz: Wejscie<WejscieMeczu> = weKalendarz.rodzaj === 'nie_wiem'
      ? { rodzaj: 'nie_wiem', powod: 'mecz: nie odczytałem kalendarza' }
      : meczeMinione.length === 0
        ? { rodzaj: 'brak' }
        : { rodzaj: 'nie_wiem', powod: 'mecz: ekran „Dziś" nie czyta stanu kaskady meczowej (pas B3)' };

    // ZADANIA — cztery stany R5. `odczytZadan` dostaje CAŁĄ odpowiedź bazy.
    const weZadania = odczytZadan({ data: zadaniaRes.data, error: zadaniaRes.error });
    console.log(`dzis: ${opisOdczytuDoLogu(weZadania)}`);

    // ═══════════════════════════════════════════════════════════════
    // ⬇⬇⬇ WEJŚCIA WGLĄDÓW — POCZĄTEK ⬇⬇⬇   (PLAN-D-B4 · PLAN-D-A2 D4)
    //
    // ⭐ JEDNO WYWOŁANIE. Do 16.08.2026 stało tu SZEŚĆ deklaracji, pięć wywołań
    // `wejscieZOdpowiedzi` i wyrażenie budujące `profil` — razem 65 linii,
    // WYŁĄCZNIE w tym pliku. `components/ListaZadan.tsx` woła TEGO SAMEGO
    // rankera i nie miał jak tego zawołać, więc lista „Moje zadania" nie
    // pokazywała ANI JEDNEGO wglądu (pomiar A2.1: 1 pozycja zamiast 3).
    //
    // ⛔ W `zbudujWejsciaWgladow` NIE MA PRAWA PAŚĆ ANI JEDNO `?? []` ANI
    // `|| []` — i nadal nie pada. Producent wglądów rozróżnia `brak_danych`
    // („odczytałem, nie ma z czego policzyć — oto próg i oto liczba") od
    // `nie_wiem` („nie odczytałem, wgląd MÓGŁBY istnieć"). To rozróżnienie
    // ginie w całości, jeżeli wołający sklei je u siebie — i ginie CICHO,
    // bo obie gałęzie wyglądają na ekranie tak samo.
    // Pilnuje tego asercja nr 3 w `lib/wgladyNaDzis.selftest.ts`, która czyta
    // teraz `lib/wejsciaWgladow.ts` — czyli plik, w którym ta reguła MIESZKA.
    //
    // ⚠️ CZTERY Z SIEDMIU ODPOWIEDZI NIE KOSZTUJĄ NOWEGO ZAPYTANIA: `dziennik`
    // i `powiazania` jadą z `dziennikRes`, `kalendarz` z `eventsRes`, `bol`
    // z `bolRes`. Wszystkie siedem jest już w paczce `Promise.all` wyżej.
    // ═══════════════════════════════════════════════════════════════
    const wejsciaWgladowEkranu = zbudujWejsciaWgladow({
      dziennikRes,
      wydarzeniaRes: eventsRes,
      bolRes,
      meczeRes,
      profilRes: userRes,
      katalogRes,
      odcinkiRes,
    });
    // ⬆⬆⬆ WEJŚCIA WGLĄDÓW — KONIEC ⬆⬆⬆

    // ═══════════════════════════════════════════════════════════════
    // ⬇⬇⬇ WEJŚCIA TYGODNIA I LICZNIKA — POCZĄTEK ⬇⬇⬇  (PLAN-D-B5, B5.2/B5.3)
    //
    // ⛔ W TEJ SEKCJI NIE MA PRAWA PAŚĆ ANI JEDNO `?? []` ANI `|| []`.
    // Każde z trzech wejść ma stan „nie odczytałem", ODRÓŻNIALNY od „pusto":
    // wydarzenia i wpisy Dziennika przez `null`, werdykty przez trzy gałęzie
    // `czytajWerdykty`. Sklejenie ich zamieniłoby awarię odczytu w zdanie
    // „nie odbyłeś nic" — czyli w nieprawdę o zawodniku (Z0).
    // Pilnuje tego asercja nr 4 w `lib/kartaDzisILicznik.selftest.ts`.
    // ═══════════════════════════════════════════════════════════════
    const wydarzeniaTygodnia: WierszWydarzenia[] | null =
      tydzienRes.error || !Array.isArray(tydzienRes.data)
        ? null
        : (tydzienRes.data as unknown as WierszWydarzenia[]);
    if (wydarzeniaTygodnia === null) {
      console.warn(`dzis: nie odczytałem wydarzeń tygodnia — ${powodBledu(tydzienRes.error)}`);
    }

    // ⭐ PLAN-D-F1 15.08.2026 — TEN ZBIÓR MA OD DZIŚ TRZECIEGO KONSUMENTA
    // I DLATEGO POPRZEDNI AKAPIT PRZESTAŁ BYĆ PRAWDĄ.
    //
    // Do tego pasa stało tu: „ŚWIADOMIE NIE UŻYWAM `doneEventIds` policzonego
    // wyżej dla paska Bloku (…). Tamtej linii nie ruszam (należy do innego pasa
    // i do innej liczby); tutaj liczę to samo drugi raz, uczciwie."
    // ⛔ Ta linia była w tym pliku DRUGIM, NIEUCZCIWYM ROZUMIENIEM „zrobione":
    // pasek Bloku liczył z `(dziennikRes.data ?? [])`, licznik pracy — stąd.
    // Dwa zbiory z jednej odpowiedzi, różniące się WYŁĄCZNIE tym, co robią po
    // awarii. Pas F1 kasuje tamten i podaje TEN do obu liczb o Blokach, bo
    // to jest ten sam dyskryminator: „czy mechanizm powiązań u tego zawodnika
    // demonstrowalnie zadziałał". Jedno rozumienie „zrobione" w całym pliku.
    // ⭐ PLAN-D-W1 — `calendar_events.id` → ZMIERZONA długość sesji w minutach.
    // ⛔ To jest jedyna droga, którą własna praca zdobywa wagę wyższą niż 1:
    // deklaracja nie jest pracą, liczba jest (O100).
    const minutyZWpisow: ReadonlyMap<number, number> | null = (() => {
      if (dziennikRes.error) return null;
      if (!Array.isArray(dziennikRes.data)) return null;
      const m = new Map<number, number>();
      for (const l of dziennikRes.data as (WierszDziennika & { payload?: unknown })[]) {
        const id = l?.calendar_event_id;
        if (typeof id !== 'number') continue;
        const p = l?.payload;
        if (p === null || typeof p !== 'object') continue;
        const min = (p as Record<string, unknown>).duration_minutes;
        if (typeof min !== 'number' || !Number.isFinite(min) || min <= 0) continue;
        // ⛔ Przy dwóch wpisach o tej samej sesji wygrywa DŁUŻSZY — pomiar może
        // wagę podnieść, nigdy obniżyć (decyzja C Kuby, 17.08.2026).
        m.set(id, Math.max(m.get(id) ?? 0, min));
      }
      return m;
    })();

    // ⭐ PLAN-D-W4 — `calendar_events.id` → RPE z wpisu wskazującego TĘ sesję.
    // Razem z minutami daje pomiar `minuty × RPE ⁄ 180` — najwyższy poziom
    // dokładności, przy którym ani jedna liczba nie pochodzi z tabeli.
    const rpeZWpisow: ReadonlyMap<number, number> | null = (() => {
      if (dziennikRes.error) return null;
      if (!Array.isArray(dziennikRes.data)) return null;
      const m = new Map<number, number>();
      for (const l of dziennikRes.data as (WierszDziennika & { payload?: unknown })[]) {
        const id = l?.calendar_event_id;
        if (typeof id !== 'number') continue;
        const p = l?.payload;
        if (p === null || typeof p !== 'object') continue;
        const rpe = (p as Record<string, unknown>).rpe;
        if (typeof rpe !== 'number' || !Number.isFinite(rpe) || rpe <= 0 || rpe > 10) continue;
        // ⛔ Przy dwóch wpisach o tej samej sesji wygrywa WYŻSZE RPE — pomiar
        // może wagę podnieść, nigdy obniżyć (decyzja C Kuby).
        m.set(id, Math.max(m.get(id) ?? 0, rpe));
      }
      return m;
    })();

    const wpisyDziennikaIds: ReadonlySet<number> | null = (() => {
      if (dziennikRes.error) return null;
      if (!Array.isArray(dziennikRes.data)) return null;
      const ids = (dziennikRes.data as WierszDziennika[])
        .map((l) => l.calendar_event_id)
        .filter((x): x is number => typeof x === 'number');
      return new Set(ids);
    })();

    const werdyktyWe = czytajWerdykty({ dane: werdyktyRes.data, blad: werdyktyRes.error });
    if (werdyktyWe.rodzaj !== 'jest') console.warn(`dzis: [PLAN-D-D1] ${werdyktyWe.powod}`);

    // ═══════════════════════════════════════════════════════════════
    // ⭐ PLAN-D-F1 15.08.2026, zadanie F1.2 — DWIE LICZBY O BLOKACH.
    //
    // Obie były policzone przed tym pasem i ŻADNEJ NIKT NIE RYSOWAŁ.
    // Rejestr obietnic nosił 32 pozycje „KOD GOTOWY"; to są dwie z nich.
    //
    // ⛔ DWIE LICZBY, DWA RÓŻNE ZDANIA — I TO JEST CAŁA ISTOTA:
    //
    //   | liczba                       | czy może zmaleć | mówi o           |
    //   |------------------------------|-----------------|------------------|
    //   | postęp w BIEŻĄCYM Bloku      | tak i tak ma być| tym Bloku        |
    //   | praca we WSZYSTKICH Blokach  | ⛔ NIGDY        | całej historii   |
    //
    // Pierwsza odpowiada na pytanie o RYTM i musi się zerować przy nowym
    // Bloku — inaczej nie jest odpowiedzią na nie. Druga odpowiada na pytanie
    // o DOROBEK i zmalenie jest w niej defektem (N1). To jest ta sama para,
    // co licznik okna (pas D1) i „TWÓJ DOROBEK" (pas C4) piętro niżej.
    // ═══════════════════════════════════════════════════════════════

    // (1) POSTĘP W BIEŻĄCYM BLOKU — trzy stany pasa A1 zamiast dwóch.
    // ⛔ `scheduledEvents` DOSTAJE ZBIÓR ODSIANY I TAK MA BYĆ: ta liczba mówi
    // o pracy DO ZROBIENIA w bieżącym Bloku, a sesja odwołana nie jest pracą
    // do zrobienia i nie może podbijać mianownika (kontrakt `lib/focusBlockProgress.ts`).
    // ⚠️ `events === null` (odczyt padł) daje pustą listę wejściową, czyli
    // `BRAK_PLANU`, czyli MILCZENIE — a nie „0 z M". Kierunek błędu jest tu
    // jedyny dopuszczalny: po nieudanym odczycie produkt nie stawia zdania.
    setWorkProgress(computeFocusBlockProgressState({
      goalSegmentId: goal?.segment_id ?? null,
      activeBlocks,
      scheduledEvents: events === null ? [] : events,
      // ⭐ DYSKRYMINATOR pasa A1. `null` (odczyt powiązań padł) daje pusty
      // zbiór, czyli NIE_WIEM — jedyny stan, który jest wtedy prawdziwy.
      // Powodu NIE_WIEM ten ekran nie rysuje wcale: od 18.08 stan postępu Bloku
      // karmi tu WYŁĄCZNIE `maAktywnyBlok` w jednej odpowiedzi, a zdanie
      // o powodzie stoi tam, gdzie stoi liczba — `components/PracaWLiczbach.tsx`.
      doneEventIds: wpisyDziennikaIds === null ? new Set<number>() : new Set(wpisyDziennikaIds),
    }));

    // ⭐ PLAN-D-S2 18.08.2026 — ODCZYT SESJI WSZYSTKICH BLOKÓW ZDJĘTY STĄD
    // razem z jedynym wywołaniem, które go używało. ⛔ Zbiór PEŁNY (z sesjami
    // `cancelled`, bez których praca w domkniętym Bloku znika) czyta dziś
    // `app/(tabs)/ja.tsx` i podaje go do `components/PracaWLiczbach.tsx`.
    // ⬆⬆⬆ WEJŚCIA TYGODNIA I LICZNIKA — KONIEC ⬆⬆⬆

    // ═══════════════════════════════════════════════════════════════
    // ⬇⬇⬇ WEJŚCIA NAGRODY ZA PRACĘ — POCZĄTEK ⬇⬇⬇  (PLAN-D-C4, C4.3)
    //
    // ⛔ W TEJ SEKCJI NIE MA PRAWA PAŚĆ ANI JEDNO `?? []` ANI `|| []`.
    // Cztery źródła pracy i mapa segmentów — każde z jawnym stanem
    // „nie odczytałem", odróżnialnym od „nic tam nie ma". Sklejenie ich
    // zamieniłoby awarię sieci w zdanie „nic nie zrobiłeś", a dorobek, który
    // maleje po nieudanym odczycie, kłamie tak samo jak licznik zerowany po
    // opuszczonym dniu.
    //
    // ⚠️ ŚWIADOMIE NIE UŻYWAM `events` policzonego wyżej: tamto powstaje
    // z `(eventsRes.data ?? [])`, więc po nieudanym odczycie oddaje pustą
    // listę NIEODRÓŻNIALNĄ od „nie masz wydarzeń". Dla dorobku ta różnica
    // jest cała. Tamtej linii nie ruszam (należy do innej liczby); tutaj
    // liczę to samo drugi raz, uczciwie — ten sam ruch, co przy
    // `wpisyDziennikaIds` w sekcji wyżej.
    // ═══════════════════════════════════════════════════════════════
    const wydarzeniaDoNagrody: WierszWydarzeniaDoNagrody[] | null =
      eventsRes.error || !Array.isArray(eventsRes.data)
        ? null
        : (eventsRes.data as unknown as (CalEvent & {
          source?: string | null; coach_session_id?: string | null; planned_minutes?: number | null;
        })[]).map((e) => ({
          id: e.id,
          scheduled_date: e.scheduled_date,
          status: e.status,
          recurrence_rule: e.recurrence_rule,
          focus_block_id: e.focus_block_id,
          // ⭐ PLAN-D-W1 (O100) — fakty, z których liczy się waga pracy.
          event_type: e.event_type ?? null,
          source: e.source ?? null,
          coach_session_id: e.coach_session_id ?? null,
          planned_minutes: typeof e.planned_minutes === 'number' ? e.planned_minutes : null,
        }));
    if (wydarzeniaDoNagrody === null) {
      console.warn(`dzis: [PLAN-D-C4] nie odczytałem wydarzeń — ${powodBledu(eventsRes.error)}`);
    }

    // ⚠️ `null` NIE BLOKUJE dorobku i to jest decyzja: nieznany segment odbiera
    // pracy przynależność do celu, ale nie odbiera jej istnienia. Odwrotnie
    // byłoby kasowaniem wykonanej pracy z powodu brakującego przypisania.
    const segmentBloku: ReadonlyMap<string, string> | null =
      blokiWszystkieRes.error || !Array.isArray(blokiWszystkieRes.data)
        ? null
        : new Map((blokiWszystkieRes.data as unknown as { id: string; segment_id: string }[])
          .filter((b) => b && typeof b.id === 'string' && typeof b.segment_id === 'string')
          .map((b) => [b.id, b.segment_id] as const));

    // ⭐ DWA STANY, NIE JEDEN. Zbiór niepełny NIE UDAJE pełnego: odznaka „praca
    // nad swoim celem" wtedy NIE POWSTAJE i mówi dlaczego — zamiast powstać
    // z niepełnych danych i zniknąć, gdy dane się uzupełnią.
    const segmentyCelow: SegmentyCelow =
      celeWszystkieRes.error || !Array.isArray(celeWszystkieRes.data)
        ? { rodzaj: 'niepelne', powod: `nie odczytałem listy Twoich celów — ${powodBledu(celeWszystkieRes.error)}` }
        : {
          rodzaj: 'pelne',
          segmenty: new Set((celeWszystkieRes.data as unknown as { segment_id: string | null }[])
            .map((g) => g?.segment_id)
            .filter((s): s is string => typeof s === 'string' && s.length > 0)),
        };

    const wejsciaNagrody: WejscieNagrody = {
      // ⛔ „Co jest dowodem wykonanej sesji" NIE MIESZKA NA TYM EKRANIE.
      // Rozstrzyga to `zrodloSesji` w `lib/nagrodaZaPrace.ts`, jedną kopią
      // reguły pasa D1 — bo druga kopia rozjechałaby się przy pierwszej
      // poprawce i oba miejsca wyglądałyby poprawnie.
      sesje: zrodloSesji({
        wydarzenia: wydarzeniaDoNagrody,
        werdykty: werdyktyWe,
        wpisyDziennika: wpisyDziennikaIds,
        segmentBloku,
        minutyZWpisow,
        rpeZWpisow,
        zwrot: zwrotObszarow,
      }),
      dziennik: dziennikRes.error || !Array.isArray(dziennikRes.data)
        ? zrodloNieczytane(`Dziennik: ${powodBledu(dziennikRes.error)}`)
        : {
          rodzaj: 'jest',
          jednostki: jednostkiZDziennika(dziennikRes.data as unknown as WierszDziennikaNagroda[]),
        },
      odpowiedziKontrolne: checkinyRes.error || !Array.isArray(checkinyRes.data)
        ? zrodloNieczytane(`odpowiedzi kontrolne Bloku: ${powodBledu(checkinyRes.error)}`)
        : {
          rodzaj: 'jest',
          jednostki: jednostkiZOdpowiedziKontrolnych(
            (checkinyRes.data as unknown as { id: string; focus_block_id: string | null; answered_at: string | null }[])
              .map((c): WierszOdpowiedziKontrolnej => ({
                id: c?.id,
                answered_at: c?.answered_at ?? null,
                segment: segmentBloku === null || typeof c?.focus_block_id !== 'string'
                  ? null
                  : segmentBloku.get(c.focus_block_id) ?? null,
              })),
          ),
        },
      mecze: meczeRes.error || !Array.isArray(meczeRes.data)
        ? zrodloNieczytane(`mecze: ${powodBledu(meczeRes.error)}`)
        : {
          rodzaj: 'jest',
          // ⭐ PLAN-D-D8 — `meczDlaNagrody` przemianowuje `match_length_minutes`
          // na `dlugoscMeczu`. ⛔ To JEST tą zmianą: bez niej mecz 60-minutowy
          // rozegrany w całości dawał 3 punkty zamiast 4.
          jednostki: jednostkiZMeczow(
            (meczeRes.data as unknown as WierszMeczuWgl[]).map(meczDlaNagrody),
          ),
        },
      segmentyCelow,
    };
    // ⬆⬆⬆ WEJŚCIA NAGRODY ZA PRACĘ — KONIEC ⬆⬆⬆

    // ⭐⭐ PLAN-D-D2 19.08.2026 (§4.3) — MAPA „WYSTĄPIENIE → WIERSZ MECZU".
    // ⛔ Stawiamy ją TYLKO przy udanym odczycie. Nieudany odczyt zostawia
    // poprzednią mapę — wyczyszczenie jej znaczyłoby „ten mecz nie ma wiersza",
    // czyli zaproszenie do założenia drugiego (Z0, ten sam wzorzec, co
    // `wydarzeniaTygodnia`).
    if (!meczeRes.error && Array.isArray(meczeRes.data)) {
      setWierszeMeczuPoWydarzeniu(
        mapaWierszyMeczuPoWydarzeniu(meczeRes.data as unknown as WierszMeczuWgl[]),
      );
    }

    // ⭐ PLAN-D-F1 15.08.2026 — postać FUNKCYJNA `setDane`, i to nie jest styl.
    // Gałąź nieudanego odczytu wydarzeń przepisuje `wydarzeniaDnia`
    // z POPRZEDNIEGO stanu, czyli lista sprzed nieudanego ODŚWIEŻENIA zostaje
    // (wzorzec C3 §8: „gałąź błędu NIE CZYŚCI listy"). Bez dostępu do
    // poprzedniego stanu nie da się tego zrobić — stąd `(poprzednie) => …`.
    setDane((poprzednie) => ({
      wejscia: {
        dzis: todayStr,
        glos: stanTygodnia,
        ograniczenia: stanOgraniczen,
        zadania: weZadania,
        kalendarz: weKalendarz,
        dziennik: weDziennik,
        bol: weBol,
        cel: weCel,
        mecz: weMecz,
      },
      // Karta „Dziś w kalendarzu" — NIETKNIĘTA przez ten pas (EK-12, EK-14).
      // ⚠️ Ta lista bierze się z `events`, a nie z `weKalendarz`, właśnie po to,
      // żeby wydarzenia cykliczne nie zniknęły razem z wejściem rankera.
      //
      // ⭐ PLAN-D-F1 — TRZY STANY, NIE DWA. `null` znaczy „odczyt padł", pusta
      // tablica znaczy „odczytałem i nic dziś nie ma". Po nieudanym ODŚWIEŻENIU
      // zostaje lista sprzed niego; dopiero gdy nie ma czego zostawić, idzie
      // `null` i ekran mówi „Nie udało się sprawdzić." zamiast „Nic
      // zaplanowanego na dziś."
      wydarzeniaDnia: events === null
        ? (poprzednie === null ? null : poprzednie.wydarzeniaDnia)
        : events.filter((e) =>
          e.scheduled_date === todayStr
          || (!!e.recurrence_rule && e.recurrence_rule.replace('weekly:', '').split(',').includes(todayCode))
        ),
      /** ⭐ PLAN-D-F1 — czy odczyt, z którego wzięła się lista wyżej, PRZESZEDŁ. */
      odczytWydarzenUdanySie: events !== null,
      // ⭐ PLAN-D-B4 — sześć wejść producenta wglądów, każde w trzech stanach.
      wejsciaWgladow: wejsciaWgladowEkranu,
      // ⭐ PLAN-D-B5 — trzy wejścia tygodnia i licznika pracy.
      wydarzeniaTygodnia,
      wpisyDziennika: wpisyDziennikaIds,
      werdykty: werdyktyWe,
      // ⭐ PLAN-D-C4 — WEJŚCIA, NIE WYNIK. Liczby powstają w `useMemo` niżej.
      wejsciaNagrody,
    }));
    // ⬆⬆⬆ WEJŚCIA KOLEJKI — KONIEC ⬆⬆⬆
  }, [currentUser, markShownAsViewed, loadHint, loadNewDose]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const todayLabel = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  const goalSegmentLabel = priorityGoal ? (SEG_LABELS[priorityGoal.segment_id] ?? priorityGoal.segment_id) : null;
  const isRecLinkedToGoal = !!focusRec && !!priorityGoal && focusRec.goal_id === priorityGoal.id;

  // ⭐ PLAN-D-B2 — „czy jest dzisiejszy wpis" LICZONE Z WEJŚCIA KOLEJKI, nie
  // z osobnego stanu i nie z osobnego zapytania. Trzy wartości, nie dwie:
  // `null` znaczy „nie odczytałem Dziennika" i wtedy pozycja NIE POWSTAJE —
  // zaproszenie do wpisu wysłane komuś, kto wpis właśnie zrobił, jest
  // nieprawdą o zawodniku tak samo jak każda inna (Z0).
  const brakWpisuDzis: boolean | null = useMemo(() => {
    if (dane === null) return null;
    const d = dane.wejscia.dziennik;
    if (d.rodzaj === 'brak') return true;
    if (d.rodzaj !== 'jest') return null;
    return !d.dane.some((w) => w.dzien === dane.wejscia.dzis);
  }, [dane]);

  /**
   * ⭐ PLAN-D-F1 — `null` znaczy „nie udało się odczytać i nie ma czego
   * pokazać", a nie „nic dziś nie masz". Przed 15.08 obie te rzeczy były pustą
   * tablicą. ⚠️ `dane === null` (jeszcze nie czytałem) też daje `null` — ekran
   * jest wtedy w stanie `loading` i pustki nie rysuje.
   */
  const todayEvents: CalEvent[] | null = dane === null ? null : dane.wydarzeniaDnia;
  const odczytWydarzenUdanySie: boolean | null = dane === null ? null : dane.odczytWydarzenUdanySie;

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-B5 — TYDZIEŃ NA KARCIE (WT-02) I LICZNIK PRACY (WG-28, WG-37).
  //
  // Ten ekran WYNIK RYSUJE, a nie liczy. Obie reguły są czystymi funkcjami
  // z własnymi strażnikami (73 i 84 asercje) i dają się sprawdzić bez appki —
  // a reguła, której nie da się sprawdzić, cicho przestaje obowiązywać.
  // ═══════════════════════════════════════════════════════════════════
  const poniedzialekTegoTygodnia = poniedzialekGlosu(new Date());
  /**
   * ⚠️ „DZIŚ" BIERZE SIĘ Z WEJŚCIA KOLEJKI, NIE Z DRUGIEGO ODCZYTU ZEGARA.
   * Ten sam napis karmi rankera, producenta wglądów, tydzień i licznik —
   * inaczej o północy cztery części jednego ekranu mówiłyby o dwóch różnych
   * dniach, a rozjazd trwałby dokładnie tyle, ile jedno wejście na ekran.
   */
  const dzisNapis: string | null = dane === null ? null : dane.wejscia.dzis;

  /**
   * ⛔ TRZY TYGODNIE, NIE JEDEN — I TO NIE JEST NADMIAR.
   *
   * Okno licznika to `[dziś − 13, dziś]`, czyli 14 dni. Tygodnie ISO zaczynają
   * się w poniedziałek, więc te 14 dni potrafią wejść w TRZY różne tygodnie:
   * dla dnia `pon + k` okno sięga do `pon + k − 13`, czyli w skrajnym
   * przypadku (`k = 0`) do `pon − 13` — a to jest przedostatni tydzień.
   * Dwa tygodnie zostawiłyby dziurę jednego dnia, której nikt by nie zauważył,
   * bo licznik po prostu pokazywałby o jedno wystąpienie mniej.
   *
   * ⛔ I DLATEGO NIE MA TU WŁASNEJ PĘTLI PO DNIACH. Rozwinięcie reguły
   * cyklicznej w konkretne wtorki jest regułą pasa C1 i ma zostać jedną kopią;
   * napisanie jej tutaj drugi raz znaczyłoby, że pierwsza poprawka wejdzie
   * do jednej z nich, oba ekrany będą wyglądały poprawnie, a różnicy nie
   * zauważy nikt.
   */
  const tygodnie: Tydzien[] = useMemo(() => {
    if (dane === null || dzisNapis === null) return [];
    const dwaWstecz = przesunTydzien(poniedzialekTegoTygodnia, -2);
    const jedenWstecz = przesunTydzien(poniedzialekTegoTygodnia, -1);
    const poniedzialki = [dwaWstecz, jedenWstecz, poniedzialekTegoTygodnia]
      .filter((p): p is string => p !== null);
    return poniedzialki.map((poniedzialek) => zbudujTydzien({
      poniedzialek,
      dzisiaj: dzisNapis,
      wydarzenia: dane.wydarzeniaTygodnia,
      // ⚠️ `null` znaczy „w ogóle nie próbowano odczytać", i to jest prawda:
      // ten ekran NIE pyta o `school_week`. Skutek jest zaprojektowany —
      // pasek zajętości wychodzi `NIE_WIEM`, więc się nie rysuje, a zdanie
      // o napięciu nie powstaje. Pełny tydzień z paskiem szkoły stoi
      // w Kalendarzu, jedno dotknięcie dalej. ⛔ Dokładanie tu zapytania
      // o plan lekcji zrobiłoby z karty drugi Kalendarz, a nie jego skrót.
      planLekcji: null,
      wpisyDziennika: dane.wpisyDziennika,
      werdykty: dane.werdykty,
    }));
  }, [dane, dzisNapis, poniedzialekTegoTygodnia]);

  /** Bieżący tydzień — ten, który rysuje przełącznik. Zawsze ostatni z trzech. */
  const tydzienBiezacy: Tydzien | null = tygodnie.length > 0 ? tygodnie[tygodnie.length - 1] : null;

  // ⭐ PLAN-D-S2 18.08.2026 — MEMO LICZNIKA PRACY ZDJĘTE Z TEGO PLIKU.
  // Do dziś stało tutaj, wołało `policzWykonanaPrace` i oddawało wynik
  // WYŁĄCZNIE do `console.log` — bo pas A1 zdjął z ekranu `renderLicznikPracy`
  // i nie postawił go nigdzie indziej. To był producent bez konsumenta, czyli
  // dokładnie to, czego zakazuje (F1-2). Licznik liczy się od dziś TAM, GDZIE
  // się rysuje: `components/PracaWLiczbach.tsx`, Profil → „Skąd to wiemy".
  // ⛔ Ani jednego dp mniej ani więcej na tym ekranie: nic tu nie było rysowane.

  /**
   * ⭐ PLAN-D-D2 15.08.2026 — O CO PRODUKT MA DZIŚ ZAPYTAĆ.
   *
   * ⛔ WYLICZANE W `useMemo` Z WEJŚĆ, nie trzymane w stanie — z tego samego
   * powodu, co dorobek pasa C4: lista pytań schowana w stanie rozjeżdża się
   * z bazą przy pierwszym odświeżeniu, którego nikt nie zauważy.
   *
   * ⭐ WYSTĄPIENIA BIERZEMY Z TYCH SAMYCH TRZECH TYGODNI, CO LICZNIK — czyli
   * z `zbudujTydzien`. Reguła rozwijania cyklicznej w konkretne wtorki stoi
   * w `lib/widokTygodnia.ts` (pas C1) i ma zostać JEDNĄ kopią; napisanie jej
   * tutaj drugi raz znaczyłoby, że przy pierwszej poprawce jedno z dwóch
   * miejsc zostanie w tyle, a oba będą wyglądały poprawnie.
   *
   * ⚠️ TRZY TYGODNIE WYSTARCZAJĄ NA OKNO „WCZORAJ I DZIŚ" ZAWSZE, także
   * w poniedziałek, kiedy „wczoraj" (niedziela) należy do tygodnia
   * POPRZEDNIEGO. ⛔ Okno odcina `lib/pytanieOWystapienie.ts`, nie ten plik —
   * drugie odcinanie tutaj byłoby drugą kopią granicy okna.
   *
   * ⛔ `nazwaRodzaju` PODAJE EKRAN, bo tylko on ma `EVENT_TYPE_LABELS`.
   * Przy rodzaju spoza piątki podajemy `null`, a NIE surową wartość i NIE
   * komunikat diagnostyczny — zdanie bierze wtedy TYTUŁ wpisany przez
   * zawodnika. „Nie znam tego rodzaju wydarzenia wczoraj o 17:00 — zrobiłeś?"
   * byłoby zdaniem o awarii słownika, przebranym za pytanie do zawodnika (R5).
   */
  const pytania: WynikPytan | null = useMemo(() => {
    if (dane === null || dzisNapis === null) return null;
    const surowe = dane.wydarzeniaTygodnia;
    const statusy = new Map<number, string>();
    if (surowe !== null) for (const w of surowe) statusy.set(w.id, w.status);

    const wystapienia: WystapienieDoPytania[] | null = surowe === null
      ? null
      : tygodnie.flatMap((t) => t.dni.flatMap((d) => d.pozycje.map((p) => ({
        idWydarzenia: p.id,
        dzien: p.dzien,
        tytul: p.tytul,
        nazwaRodzaju: p.rodzaj.znany ? EVENT_TYPE_LABELS[p.rodzaj.id] : null,
        godzina: p.godzina,
        // ⚠️ Ten sam wartownik, co w liczniku: `''` NIE jest żadnym statusem
        // bazy, więc reguła potraktuje wiersz najostrożniej, jak umie.
        status: statusy.get(p.id) ?? '',
        zRegulyCyklicznej: p.zRegulyCyklicznej,
      }))));

    return zbudujPytaniaOWystapienia({
      dzis: dzisNapis,
      wystapienia,
      wpisyDziennika: dane.wpisyDziennika,
      werdykty: dane.werdykty,
    });
  }, [dane, dzisNapis, tygodnie]);

  if (pytania !== null) console.log(`dzis: [PLAN-D-D2] ${opisPytanDoLogu(pytania)}`);

  /**
   * ⭐ PLAN-D-O1, D6 — FAKTY O POZYCJI, Z KTÓRYCH LICZY SIĘ JEJ RODZAJ.
   *
   * ⛔ ZERO TYTUŁU W TEJ MAPIE i to jest cała jej treść. Tytuł jest napisem
   * zawodnika: „Trening klubowy" wpisany ręcznie w nazwę własnego treningu
   * zamieniłby własną pracę w zobowiązanie i odebrał prawo do usunięcia.
   * Rozstrzygają wyłącznie kolumny — `coach_session_id`, `source`, `event_type`.
   *
   * ⚠️ `coach_session_id` czytane przez indeks, a nie przez pole typu:
   * `WierszWydarzenia` mieszka w `lib/widokTygodnia.ts` i ten pas świadomie
   * nie zmienia jego kształtu, bo stoją na nim trzy inne konsumenty.
   */
  const faktyWydarzen = useMemo(() => {
    const m = new Map<number, FaktyPozycji>();
    const surowe = dane === null ? null : dane.wydarzeniaTygodnia;
    if (surowe === null) return m;
    for (const w of surowe) {
      const kolumny = w as unknown as Record<string, unknown>;
      m.set(w.id, {
        idWydarzenia: w.id,
        eventType: typeof w.event_type === 'string' ? w.event_type : null,
        source: typeof w.source === 'string' ? w.source : null,
        maSesjeTrenera: kolumny.coach_session_id !== null && kolumny.coach_session_id !== undefined,
      });
    }
    return m;
  }, [dane]);

  /**
   * ⭐⭐ PLAN-D-D2 19.08.2026 — WYSTĄPIENIA, KTÓRE ZAWODNIK MA NA SWOIM EKRANIE.
   *
   * ⛔ PO CO TO ISTNIEJE (§3 polecenia D2). Klucz obcy `match_contexts
   * → calendar_events` sprawdza, że wydarzenie ISTNIEJE — ⛔ NIE sprawdza,
   * że należy do tego samego zawodnika. Ten zbiór jest jedynym miejscem,
   * w którym da się to sprawdzić przed zapisem.
   *
   * ⛔ `null` ≠ pusty zbiór i to jest cała ostrożność tej stałej: nieudany
   * odczyt wydarzeń daje `null` („nie wiem, co ma na ekranie"), a wtedy
   * `ustalWiazanieMeczu` NIE WIĄŻE. Pusty zbiór znaczyłby „sprawdziłem
   * i nie ma nic" — dwa różne fakty, dwa różne stany (R5).
   */
  const wydarzeniaNaEkranie: ReadonlySet<number> | null = useMemo(() => {
    const surowe = dane === null ? null : dane.wydarzeniaTygodnia;
    if (surowe === null) return null;
    const zbior = new Set<number>();
    for (const w of surowe) if (typeof w.id === 'number' && Number.isFinite(w.id)) zbior.add(w.id);
    return zbior;
  }, [dane]);

  /**
   * ⛔ WARTOWNIK PRZY BRAKU WIERSZA JEST CELOWO NAJOSTROŻNIEJSZY, JAKI MOŻE BYĆ:
   * `eventType: null` daje rozpoznanie „nie wiem", a „nie wiem" nie ma ścieżki
   * usunięcia. Pozycja, której nie odczytaliśmy, ma zostać w planie.
   */
  function faktyPozycji(idWydarzenia: number): FaktyPozycji {
    const znane = faktyWydarzen.get(idWydarzenia);
    if (znane !== undefined) return znane;
    return { idWydarzenia, eventType: null, source: null, maSesjeTrenera: false };
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-D2 — ZAPIS ODPOWIEDZI. JEDNO DOTKNIĘCIE, ODWRACALNE.
  //
  // ⚠️ WZORZEC WZIĘTY CO DO ZNAKU Z `app/(tabs)/kalendarz.tsx` (`oznaczNieodbyte`,
  // pas D1 + poprawka ryzyka 6): `upsert` z `onConflict` na parze
  // `(calendar_event_id, occurred_on)` i `withdrawn_at: null`.
  //
  // ⛔ DLACZEGO `upsert`, A NIE `insert`: unikat `session_verdicts_jeden_na_wystapienie`
  // obejmuje TAKŻE wiersze wycofane (i słusznie — inaczej po „Cofnij" powstałby
  // drugi wiersz na ten sam dzień i „ostatni wygrywa" stałoby się niepisaną
  // regułą). Bez `upsert` ścieżka „Zrobione" → „Nie odbyło się" zwracałaby
  // `23505`, a zawodnik widziałby „Nie udało się zapisać" przy poprawnym ruchu.
  //
  // ⛔ `withdrawn_at: null` JEST OBOWIĄZKOWE, nie kosmetyczne: bez niego
  // odpowiedź trafiłaby w wiersz wycofany i nadal by nie obowiązywała.
  // Ślad zmiany zdania (`previous_verdict`, `changed_at`) stawia WYZWALACZ
  // `session_verdicts_pilnuj`, nie ten kod — ⛔ drugiego mechanizmu śladu
  // ten pas nie buduje.
  //
  // ⭐ TA SAMA FUNKCJA ZAPISUJE OBIE WARTOŚCI. To jest cała różnica między
  // tym pasem a stanem sprzed niego: `kalendarz.tsx` ma na sztywno
  // `verdict: 'nie_odbylo_sie'` i dlatego `odbylo_sie` nie miało w całym
  // produkcie ani jednej drogi zapisu.
  // ═══════════════════════════════════════════════════════════════════
  async function odpowiedzNaWystapienie(
    p: Pytanie,
    werdykt: WartoscWerdyktu,
    powod: PowodNieobecnosci | null = null,
  ) {
    if (!currentUser) return;
    setBladWerdyktu(null);
    setZapisWerdyktu(p.klucz);
    // ⭐ PLAN-D-O1 — POWÓD PRZECHODZI PRZEZ REGUŁĘ, NIE PRZEZ EKRAN.
    // `wierszWerdyktu` zna CHECK `session_verdicts_powod_tylko_przy_nieodbyciu`
    // i przy „zrobione" oddaje `absence_reason: null`. ⛔ To NIE jest ostrożność
    // na zapas: bez tego zawodnik, który najpierw powiedział „nie odbyło się"
    // z powodem, a potem zmienił zdanie (D9), dostałby od bazy kod `23514`
    // przy ruchu, do którego ma pełne prawo — bo `upsert` zostawiłby stary powód.
    const doZapisu = wierszWerdyktu({
      idZawodnika: currentUser.id,
      idWydarzenia: p.idWydarzenia,
      dzien: p.dzien,
      werdykt,
      powod,
    });
    // ⚠️ KSZTAŁT WYPISANY POLE PO POLU, choć `doZapisu` niesie go w całości.
    // Powód jest policzalny, nie estetyczny: DWA strażniki czytają to miejsce
    // JAKO TEKST i pytają, czy `verdict` jest ZMIENNĄ (a nie literałem
    // „zrobione") i czy `withdrawn_at` na pewno wraca do `null`. Po podmianie
    // obiektu na rozwinięcie wywołania oba pytania straciłyby na czym stanąć,
    // a strażnik przestałby pilnować, nie zapalając się ani razu (O88).
    const { data: zapisane, error: err } = await supabase
      .from('session_verdicts')
      .upsert({
        user_id: doZapisu.user_id,
        calendar_event_id: doZapisu.calendar_event_id,
        occurred_on: doZapisu.occurred_on,
        verdict: werdykt,
        origin: 'player',
        withdrawn_at: null,
        absence_reason: doZapisu.absence_reason,
      }, { onConflict: 'calendar_event_id,occurred_on' })
      .select('id');
    setZapisWerdyktu(null);
    if (err) {
      setBladWerdyktu(toJestBrakDostepu(err)
        ? ZAPIS_ODRZUCONY_BRAK_DOSTEPU
        : 'Nie udało się zapisać: ' + err.message);
      return;
    }
    // ⚠️ O61 — OPERACJA, KTÓRA NIE RZUCIŁA WYJĄTKU, NIE JEST DOWODEM, ŻE COŚ
    // SIĘ STAŁO. Zapis odrzucony przez RLS wraca jako sukces z PUSTĄ LISTĄ.
    // ⛔ DOWODEM JEST LICZBA ZWRÓCONYCH WIERSZY, nie brak błędu — dlatego
    // `.select('id')` jest tu obowiązkowe, a zero wierszy to PORAŻKA.
    if (!zapisane || zapisane.length === 0) {
      setBladWerdyktu('Nie udało się zapisać: baza nie przyjęła tego wpisu.');
      console.warn('[PLAN-D-D2] upsert session_verdicts dotknął ZERO wierszy '
        + `(wydarzenie ${p.idWydarzenia}, dzień ${p.dzien}) — najpewniej RLS.`);
      return;
    }
    // ⛔ ZERO ZDANIA PO ZAPISIE i zero pochwały za samo odpowiedzenie (N1).
    // Zmienia się to, co pytanie pokazuje — i to jest cała odpowiedź produktu.
    await load();
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-O1 — KROKI 2 i 3: CZAS, RPE I BÓL. ⛔ WSZYSTKO OPCJONALNE.
  //
  // ⚠️ TO JEST OSOBNY ZAPIS I OSOBNE DOTKNIĘCIE, nie druga połowa poprzedniego.
  // Werdykt jest już w bazie, zanim ta funkcja w ogóle ma szansę się wykonać —
  // i to jest cała decyzja D2: zawodnik, który zamknie appkę po pierwszym
  // przycisku, ZOSTAWIA PO SOBIE ODPOWIEDŹ, a nie porzucony formularz.
  //
  // ⭐ D4 — `data_sources` POWSTAJE Z TEJ SAMEJ LISTY, CO `payload`.
  // Nie ma tu drogi, którą wartość weszłaby do wpisu bez zapisania, skąd
  // pochodzi: obie mapy buduje `zbudujPayloadIZrodla` w jednej pętli.
  //
  // ⭐ D5 — `calendar_event_id` WCHODZI ZAWSZE. 17.08.2026 takich wpisów było
  // 0 z 10, i przez to licznik pracy nie umiał powiązać wpisu z sesją.
  //
  // ⛔ D10 — `error` ODCZYTANY PRZY KAŻDYM WYWOŁANIU. Klient Supabase NIE
  // RZUCA (O83): zignorowany `error` w destrukturyzacji jest cichym brakiem,
  // a nie awarią, którą ktoś kiedyś zauważy.
  // ═══════════════════════════════════════════════════════════════════
  async function zapiszSzczegolyOceny(p: Pytanie) {
    if (!currentUser) return;
    setBladWerdyktu(null);
    setZapisWerdyktu(p.klucz);

    const wartosci: WartoscZeZrodlem[] = [];
    if (czasWybrany !== null) {
      // ⭐ ŹRÓDŁO JEST FAKTEM O TEJ WARTOŚCI, nie etykietą dopisaną z rozpędu:
      // czas nietknięty przez zawodnika został podpowiedziany przez plan.
      wartosci.push({ klucz: 'duration_minutes', liczba: czasWybrany, zrodlo: czasZPlanu ? 'plan' : 'zawodnik' });
    }
    if (rpeWybrane !== null) {
      // ⛔ RPE MOŻE POCHODZIĆ WYŁĄCZNIE OD ZAWODNIKA i to nie jest wybór
      // zapisu, tylko wynik tego, że nie ma go skąd podpowiedzieć (D3).
      wartosci.push({ klucz: 'rpe', liczba: rpeWybrane, zrodlo: 'zawodnik' });
    }

    // ═══════════════════════════════════════════════════════════════
    // ⛔⛔ PAS B1 21.08.2026 — BRAMKA BÓLU STOI PRZED KAŻDYM ZAPISEM.
    //
    // ⚠️ TRZY STANY, NIE DWA (R5). Rozstrzyga je CZYSTA FUNKCJA
    // `stanZapisuBolu` z `lib/ocenaZKafla.ts`, a ten kod ją WYKONUJE — ten sam
    // podział, co przy powodzie nieobecności i przy bramce „+".
    //
    // ⛔ DLACZEGO PRZED, A NIE PO. Zawodnik, który zaznaczył, ŻE go boli, i nie
    // powiedział JAK MOCNO, jest w stanie „nie wiemy". Kolumna
    // `pain_entries.intensity` jest dziś `NOT NULL` (odczytane 21.08.2026,
    // `pain_entries_intensity_check`: 0–10), więc tego stanu NIE DA SIĘ ZAPISAĆ —
    // propozycja migracji leży w nocie pasa B1 i ⛔ nie została wykonana.
    // Gdyby ta bramka stała PO wpisie do `daily_logs`, zawodnik po uzupełnieniu
    // natężenia i drugim dotknięciu przycisku zostawiłby DRUGI wpis potreningowy,
    // a licznik pracy policzyłby tę sesję dwa razy. Przed zapisem nie ginie nic
    // i nie powstaje nic zbędnego: werdykt („odbyło się" / „nie odbyło się")
    // leży w bazie od osobnego, wcześniejszego dotknięcia (decyzja D2).
    //
    // ⛔ TO NIE JEST ODMOWA, TYLKO HAMULEC Z DROGĄ WYJŚCIA: zdanie mówi, czego
    // brakuje, ile to kosztuje (jedno dotknięcie) i że reszta jest zapisana.
    // To samo zdanie stoi W ARKUSZU, przy pytaniu — zawodnik widzi je ZANIM
    // naciśnie przycisk, a nie dopiero po.
    const stanBolu = stanZapisuBolu({ miejsce: bolMiejsce, natezenie: bolNatezenie });
    if (stanBolu.rodzaj === 'nie_wiemy') {
      setZapisWerdyktu(null);
      setBladWerdyktu(stanBolu.zdanie);
      return;
    }

    const wpis = wierszWpisuPoTreningu({
      idZawodnika: currentUser.id,
      idWydarzenia: p.idWydarzenia,
      eventType: faktyPozycji(p.idWydarzenia).eventType,
      wartosci,
    });

    const { data: wpisany, error: bladWpisu } = await supabase
      .from('daily_logs')
      .insert(wpis)
      .select('id');
    if (bladWpisu) {
      setZapisWerdyktu(null);
      setBladWerdyktu(toJestBrakDostepu(bladWpisu)
        ? ZAPIS_ODRZUCONY_BRAK_DOSTEPU
        : 'Nie udało się zapisać: ' + bladWpisu.message);
      return;
    }
    // ⚠️ O61 — ZERO WIERSZY BEZ BŁĘDU TO PORAŻKA. Zapis odrzucony przez RLS
    // wraca jako sukces z pustą listą i wygląda dokładnie jak zapisany wpis.
    const idWpisu = Array.isArray(wpisany) && wpisany.length > 0 ? Number(wpisany[0].id) : null;
    if (idWpisu === null || !Number.isFinite(idWpisu)) {
      setZapisWerdyktu(null);
      setBladWerdyktu('Nie udało się zapisać: baza nie przyjęła tego wpisu.');
      console.warn('[PLAN-D-O1] insert daily_logs dotknął ZERO wierszy '
        + `(wydarzenie ${p.idWydarzenia}, dzień ${p.dzien}) — najpewniej RLS.`);
      return;
    }

    // ⛔ BÓL WISI NA WPISIE, NIE OBOK NIEGO. Polityka `pain_entries_owner`
    // wymaga `daily_log_id` wskazującego wpis tego samego zawodnika — wpis
    // bólu bez tego zostałby odrzucony, a zawodnik zobaczyłby błąd po tym,
    // jak reszta odpowiedzi już się zapisała.
    //
    // ⛔⛔ PAS B1 21.08.2026 — NATĘŻENIE BÓLU BIERZE SIĘ Z PYTANIA O BÓL
    // I Z NICZEGO INNEGO.
    //
    // CO TU STAŁO: `natezenie: rpeWybrane ?? 1`. Do kolumny „jak bardzo Cię
    // boli" wchodziła odpowiedź na pytanie „jak ciężka była sesja", a gdy
    // zawodnik ciężkości nie wybrał — liczba 1, czyli „prawie nie boli".
    // ⛔ Zawodnik żadnej z tych liczb nigdy nie podał, a `lib/wgladyZAlgorytmu.ts`
    // podawał mu ją z powrotem w rejestrze `fakt_o_tobie` — jako ZMIERZONY FAKT
    // O JEGO CIELE. Ta sama liczba szła do raportu dla rodzica i do historii bólu.
    // To jest złamanie Z0 („nie podajemy prawdopodobnego jako pewnego")
    // w miejscu, gdzie nie chodziło nawet o prawdopodobne — tylko o liczbę
    // z zupełnie innego pytania.
    //
    // ⛔ `rpeWybrane` NIE MA PRAWA POJAWIĆ SIĘ W TYM WYWOŁANIU — ani jako
    // wartość, ani jako wartość domyślna. Pilnuje tego strażnik
    // `lib/bolCzerwienIKafel.selftest.ts`, który czyta ten plik jako tekst.
    //
    const bol = stanBolu.rodzaj !== 'zapisz' ? null : wierszBolu({
      idZawodnika: currentUser.id,
      idWpisu,
      miejsce: bolMiejsce ?? '',
      strona: null,
      natezenie: stanBolu.natezenie,
      wykluczaZTreningu: false,
    });
    if (bol !== null) {
      const { error: bladBolu } = await supabase.from('pain_entries').insert(bol);
      if (bladBolu) {
        setZapisWerdyktu(null);
        setBladWerdyktu('Zapisałem odpowiedź, ale nie zapisałem bólu: ' + bladBolu.message);
        return;
      }
    }

    // ⭐⭐ PLAN-D-D8 — MECZ MA DRUGĄ POŁOWĘ ODPOWIEDZI I ONA IDZIE GDZIE INDZIEJ.
    // Minuty na boisku i długość meczu NIE MAJĄ kolumn w `daily_logs`; ich
    // miejsce to `match_contexts`. ⛔ Zapis stoi TU, po udanym wpisie
    // potreningowym, świadomie: gdyby stał przed nim, nieudany wpis do
    // dziennika zostawiłby wiersz meczu bez ciężkości i bez bólu, a zawodnik
    // zobaczyłby błąd po tym, jak połowa odpowiedzi już się zapisała.
    if (faktyPozycji(p.idWydarzenia).eventType === 'match') {
      await zapiszKontekstMeczu(p.klucz, p.idWydarzenia);
    }

    console.log(`dzis: [PLAN-D-O1] ${opisOcenyDoLogu({
      werdykt: p.stan.rodzaj === 'odpowiedziane' ? p.stan.werdykt : null,
      payload: zbudujPayloadIZrodla(wartosci),
      powod: rozstrzygnijPowod(powodWybrany),
      rodzaj: rozpoznajRodzajPozycji(faktyPozycji(p.idWydarzenia)),
    })}`);

    setZapisWerdyktu(null);
    setKrokOtwarty(null);
    setCzasWybrany(null);
    setCzasZPlanu(false);
    setRpeWybrane(rpePoczatkowe());
    setBolMiejsce(null);
    // ⛔ PAS B1 — NATĘŻENIE WRACA DO PUSTKI, nie do 1 i nie do ostatniej
    // wartości. Liczba, która została po poprzedniej rzeczy, byłaby przy
    // następnej podpowiedzią (Z6) — i to jest ta sama pomyłka, tylko wolniejsza.
    setBolNatezenie(bolNatezeniePoczatkowe());
    // ⛔ MINUT I DŁUGOŚCI NIE CZYŚCIMY DO ZERA, tylko do „nie zaznaczone" —
    // zero jest ODPOWIEDZIĄ („nie wszedłem na boisko"), a nie stanem pustym (R5).
    setMinutyNaBoisku(null);
    setDlugoscMeczu(null);
    await load();
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⭐⭐ PLAN-D-D8 18.08.2026 — ZAPIS KONTEKSTU MECZU. JEDNA DROGA, DWA WEJŚCIA.
  //
  // ⛔ JEDNA FUNKCJA, BO INACZEJ BYŁYBY DWIE. Minuty na boisku zapisuje ścieżka
  // oceny, a samoocenę i notatkę arkusz „powiedz więcej" — ale OBIE piszą
  // do TEGO SAMEGO wiersza `match_contexts`. Dwie funkcje znaczyłyby dwa
  // wiersze na jeden mecz, a licznik pracy policzyłby go dwa razy.
  //
  // ⛔ DECYZJĘ „wstaw czy dołóż" PODEJMUJE CZYSTA FUNKCJA
  // (`zdecydujOZapisieMeczu`), a ten kod ją WYKONUJE. Ten sam podział,
  // co przy bramce „+" (`lib/dodanieWstecz.ts`).
  //
  // ⚠️ ODDAJE `true`, gdy nie ma się na co skarżyć — także wtedy, gdy świadomie
  // NIC nie zapisał (pusty formularz nie jest awarią). Porażką jest wyłącznie
  // odrzucony zapis, i tylko ona ustawia `bladMeczu`.
  // ═══════════════════════════════════════════════════════════════════
  async function zapiszKontekstMeczu(
    klucz: string,
    idWydarzenia: number,
    /**
     * ⭐⭐ PAS K1 21.08.2026 — WYDARZENIE ZAŁOŻONE PRZED CHWILĄ PRZEZ TEN EKRAN.
     * ⛔ PO CO TO ISTNIEJE. `wydarzeniaNaEkranie` powstaje z odczytu tygodnia,
     * więc wydarzenie założone sekundę temu ścieżką „+ → już się odbyło → Mecz"
     * NIE JEST w tym zbiorze — a wtedy `ustalWiazanieMeczu` słusznie odmawia
     * wiązania i wiersz meczu leci z `calendar_event_id = null`. Skutek byłby
     * dokładnie ten, którego zakazuje §3.5 wymaganie 5: licznik pracy policzyłby
     * ten mecz DWA RAZY — raz jako wydarzenie, raz jako wiersz meczu.
     * ⛔ To NIE JEST poluzowanie granicy właściciela: ten ekran sam wstawił to
     * wydarzenie z `user_id = currentUser.id` i dostał jego `id` z powrotem,
     * więc wie o jego właścicielu tyle samo, co o pozostałych.
     */
    swiezoZalozone: number | null = null,
  ): Promise<boolean> {
    if (!currentUser) return false;
    const ocena: OcenaMeczu = { minutyNaBoisku, dlugoscMeczu, rpe: rpeWybrane };
    // ⛔ `null` NADAL ZNACZY „NIE ZNAM LISTY" i nadal NIE WIĄŻE. Świeżo
    // założone wydarzenie tworzy zbiór jednoelementowy — bo o nim wiemy.
    const wydarzeniaZawodnika: ReadonlySet<number> | null =
      swiezoZalozone === null
        ? wydarzeniaNaEkranie
        : new Set<number>([...(wydarzeniaNaEkranie ?? []), swiezoZalozone]);
    // ⭐⭐ PLAN-D-D2 19.08.2026 (§4.3) — DWA ŹRÓDŁA STANU, W TEJ KOLEJNOŚCI.
    //   1. `kontekstyMeczu` — wiersz założony W TEJ WIZYCIE, po kluczu wystąpienia.
    //   2. `wierszeMeczuPoWydarzeniu` — wiersz założony KIEDYKOLWIEK, odczytany
    //      z bazy po `calendar_event_id`.
    // ⛔ To drugie źródło jest całą różnicą wobec 18.08: bez niego po restarcie
    // aplikacji ten sam mecz oceniony ponownie zakładał DRUGI wiersz.
    const idZBazy = wierszeMeczuPoWydarzeniu.get(idWydarzenia);
    const idWiersza = kontekstyMeczu[klucz] ?? idZBazy;
    const stan: StanKontekstuMeczu = idWiersza === undefined
      ? { rodzaj: 'brak' }
      : { rodzaj: 'zapisany', id: idWiersza };
    const decyzja = zdecydujOZapisieMeczu({
      idZawodnika: currentUser.id, stan, ocena, wiecej: wiecejOMeczu,
      idWydarzenia,
      // ⛔ `null` przy nieodczytanych wydarzeniach — patrz `wydarzeniaZawodnika`.
      wydarzeniaZawodnika,
    });
    console.log(`dzis: [PLAN-D-D8] ${opisZapisuMeczuDoLogu(decyzja)}`);

    if (decyzja.rodzaj === 'nie_zapisuj') {
      // ⛔ ZDANIE ALBO CISZA — nigdy „coś poszło nie tak". Brak zdania znaczy,
      // że nie ma o czym mówić zawodnikowi (np. pusty formularz przy ocenie).
      setBladMeczu(decyzja.zdanie);
      return decyzja.zdanie === null;
    }

    if (decyzja.rodzaj === 'aktualizuj') {
      const { data: zmienione, error: bladU } = await supabase
        .from('match_contexts')
        .update(decyzja.zmiany)
        .eq('id', decyzja.id)
        .select('id');
      if (bladU) {
        setBladMeczu(toJestBrakDostepu(bladU)
          ? ZAPIS_ODRZUCONY_BRAK_DOSTEPU
          : 'Nie udało się zapisać meczu: ' + bladU.message);
        return false;
      }
      // ⚠️ O61 — PostgREST przy odmowie RLS na UPDATE nie zwraca błędu, tylko
      // ZERO zmienionych wierszy. Bez tego „nie mam uprawnień" byłoby
      // nieodróżnialne od „zapisano".
      if (!zmienione || zmienione.length === 0) {
        setBladMeczu('Nie udało się zapisać meczu: baza nie zmieniła ani jednego wiersza.');
        return false;
      }
      setBladMeczu(null);
      setZapisanoMecz(klucz);
      return true;
    }

    const { data: wstawione, error: bladW } = await supabase
      .from('match_contexts')
      .insert(decyzja.wiersz)
      .select('id');
    if (bladW) {
      // ⭐⭐ PLAN-D-D2 19.08.2026 (§4.3) — UNIKALNY INDEKS CZĘŚCIOWY ZAMIENIA
      // CICHY DUPLIKAT W BŁĄD, a ekran zamienia ten błąd w ZDANIE.
      // ⛔ Zawodnikowi nie wolno pokazać `23505`: kod bazy nie mówi mu nic
      // o jego meczu, a mówi wszystko o tym, że produkt się nie pozbierał.
      setBladMeczu(toJestDrugiWierszNaMecz(bladW)
        ? MECZ_JUZ_MA_WIERSZ
        : (toJestBrakDostepu(bladW)
          ? ZAPIS_ODRZUCONY_BRAK_DOSTEPU
          : 'Nie udało się zapisać meczu: ' + bladW.message));
      return false;
    }
    // ⚠️ PLAN-D-D2 — przemianowane z `idWiersza`, bo ta nazwa niesie już wyżej
    // wiersz ODNALEZIONY (w wizycie albo w bazie). Dwie różne rzeczy pod jedną
    // nazwą to dokładnie ten rodzaj pomyłki, który ten pas usuwa.
    const idWstawionego = Array.isArray(wstawione) && wstawione.length > 0
      ? Number(wstawione[0].id) : null;
    if (idWstawionego === null || !Number.isFinite(idWstawionego)) {
      setBladMeczu('Nie udało się zapisać meczu: baza nie przyjęła tego wiersza.');
      console.warn('[PLAN-D-D8] insert match_contexts dotknął ZERO wierszy — najpewniej RLS.');
      return false;
    }
    // ⭐ OD TEJ CHWILI KOLEJNE ZAPISY DOKŁADAJĄ, ZAMIAST WSTAWIAĆ.
    setKontekstyMeczu((poprzednie) => ({ ...poprzednie, [klucz]: idWstawionego }));
    // ⭐⭐ PLAN-D-D2 — i ta sama wiedza pod kluczem WYSTĄPIENIA, żeby przetrwała
    // zamknięcie arkusza. Trwałym nośnikiem jest kolumna w bazie; to jest
    // wyłącznie skrót do najbliższego odczytu.
    if (decyzja.wiersz.calendar_event_id !== null) {
      const e = decyzja.wiersz.calendar_event_id;
      setWierszeMeczuPoWydarzeniu((poprzednie) => new Map(poprzednie).set(e, idWstawionego));
    }
    setBladMeczu(null);
    setZapisanoMecz(klucz);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-O1, D6 — ŚCIEŻKA USUNIĘCIA ISTNIEJE WYŁĄCZNIE DLA WŁASNEJ PRACY.
  //
  // ⛔ ZOBOWIĄZANIE (trening klubowy, mecz) NIE MA TU CZEGO SZUKAĆ i to nie
  // jest surowość wobec zawodnika: rzecz, której nie było, ma zostać w planie
  // jako NIEOBECNOŚĆ Z POWODEM, a nie zniknąć razem z pytaniem. Usunięcie
  // zobowiązania kasuje jedyny ślad tego, że coś było umówione.
  //
  // ⛔ RODZAJ, KTÓREGO NIE ZNAMY, ZACHOWUJE SIĘ JAK ZOBOWIĄZANIE — bo z dwóch
  // możliwych pomyłek ta druga jest nieodwracalna (`ON DELETE CASCADE`
  // zabiera ze sobą werdykt).
  // ═══════════════════════════════════════════════════════════════════
  async function zdejmijZPlanu(p: Pytanie) {
    if (!currentUser) return;
    const wolno = sciezkaUsuniecia(rozpoznajRodzajPozycji(faktyPozycji(p.idWydarzenia)));
    if (!wolno.jest) {
      setBladWerdyktu(BEZ_USUNIECIA);
      console.warn(`[PLAN-D-O1] odmowa usunięcia ${p.klucz} — ${wolno.powod}`);
      return;
    }
    setBladWerdyktu(null);
    setZapisWerdyktu(p.klucz);
    const { data: usuniete, error: bladUsuniecia } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', p.idWydarzenia)
      .select('id');
    setZapisWerdyktu(null);
    if (bladUsuniecia) {
      setBladWerdyktu(toJestBrakDostepu(bladUsuniecia)
        ? ZAPIS_ODRZUCONY_BRAK_DOSTEPU
        : 'Nie udało się zdjąć z planu: ' + bladUsuniecia.message);
      return;
    }
    if (!usuniete || usuniete.length === 0) {
      setBladWerdyktu('Nie udało się zdjąć z planu: baza nie zmieniła ani jednego wiersza.');
      return;
    }
    setKrokOtwarty(null);
    await load();
  }

  /**
   * ⭐ PLAN-D-C4 — DOROBEK. **WYLICZANY PRZY KAŻDYM RENDERZE, NIGDY CZYTANY
   * Z KOLUMNY STANU.**
   *
   * ── DLACZEGO TO JEST CAŁA ARCHITEKTURA TEGO PASA ────────────────
   * Licznika PRZECHOWYWANEGO można nie zwiększyć albo wyzerować — wyliczanego
   * nie. Zakaz „licznik nigdy nie wraca do zera" przestaje więc zależeć od
   * dyscypliny kolejnej sesji i staje się kształtem kodu: nie ma tabeli, którą
   * dałoby się nadpisać, ani kolumny, którą dałoby się cofnąć. Odznaka jest
   * czystą funkcją z wierszy, które JUŻ SĄ w bazie.
   *
   * ⛔ JEDEN ARGUMENT. Drugi (`ZasadyNagrody`) jest punktem wpięcia MUTACJI
   * i należy wyłącznie do strażnika — podany stąd znaczyłby, że ekran ma
   * własną, schowaną kopię reguł i że mutacja ma drogę na ekran zawodnika.
   */
  const nagroda: NagrodaZaPrace | null = useMemo(
    () => (dane === null ? null : policzNagrode(dane.wejsciaNagrody)),
    [dane],
  );

  if (nagroda !== null) console.log(`dzis: ${opisNagrodyDoLogu(nagroda)}`);

  // ⭐ PLAN-D-S2 18.08.2026 — MEMO PRACY WE WSZYSTKICH BLOKACH ZDJĘTE STĄD.
  // Ten sam powód, co przy liczniku: pas A1 zdjął `renderPracaWBlokach`
  // (~120 dp), a wywołanie zostało i szło do `console.log`. Liczba i jej
  // rysowanie stoją od dziś razem w `components/PracaWLiczbach.tsx`.

  // PIERWSZE URUCHOMIENIE 10.08.2026 — stan „zawodnik zero": ani diagnozy,
  // ani Celu. Świadomie WYMAGA OBU warunków: kto zdążył założyć Cel sam,
  // dostaje ekran Celu jak dotąd — nie odbieramy mu tego, co już zrobił.
  // `hasDiagnosis === false` (a nie `!hasDiagnosis`) jest celowe: `null`
  // oznacza „nie udało się sprawdzić" i wtedy ekran zachowuje się po staremu.
  const showFirstStep = hasDiagnosis === false && !hasAnyGoal;

  // WIEDZA B4 08.08.2026 — podpowiedź z materiału, blok pod przyciskami karty.
  // Uzasadnienie miejsca (a nie nad przyciskami) stoi przy `footerSlot`
  // w components/RecommendationCard.tsx. Cztery stany, każdy JAWNY — reguła R5:
  // pusty wynik i brak tabeli to dwie różne rzeczy i zawodnik ma je rozróżniać
  // po tekście, nie zgadywać z ciszy.
  // ⚠️ PLAN-D-T 08.2026 (13.08.2026), zadanie T1 — `renderHint()` PRZESTAŁ
  // BYĆ SZÓSTYM PRODUCENTEM I ZOSTAŁ TREŚCIĄ ZAWSZE WIDOCZNĄ.
  //
  // Do tej rundy ta funkcja rysowała DWIE rzeczy naraz:
  //   (a) treść ZAWSZE WIDOCZNĄ (`zawsze_widoczna`, m.in. telefon zaufania) —
  //       to jest funkcja BEZPIECZEŃSTWA i zostaje nietknięta;
  //   (b) podpowiedź dnia z rotacji — czyli trzeciego z sześciu producentów,
  //       który mówił zawodnikowi, co ma zrobić, nie wiedząc o dwóch
  //       pozostałych.
  //
  // (b) WCHODZI DO JEDNEJ ODPOWIEDZI (`lib/jednaOdpowiedz.ts`) i przestaje
  // istnieć jako osobny kafelek. Zostaje wyłącznie (a).
  //
  // ⚠️ ZNIKA TEŻ NAGŁÓWEK „Warto wiedzieć" nad podpowiedzią dnia — a razem
  // z nim znika stan, w którym 114 z 297 treści kończyło się na wiedzy (M4).
  // W jednej odpowiedzi ta sama treść stoi pod nagłówkiem „Co dziś zrobić".
  // Przy treści ZAWSZE WIDOCZNEJ nagłówek ZOSTAJE: tam „warto wiedzieć" jest
  // prawdą — to są granice bezpieczeństwa, nie zadania na dziś.
  const renderTrescZawszeWidoczna = () => {
    // Treść zawsze widoczna jest bezpieczeństwem, nie treścią o pracy —
    // ale przy ścieżce wyjścia milczy WSZYSTKO poza kartą głosu i punktem
    // pomocy, więc warunek zostaje bez zmiany.
    if (!widokDzis.pokazacPodpowiedz) return null;
    if (hintState.state === 'no_goal' || hintState.state === 'loading') return null;
    if (hintState.alwaysVisible.length === 0) return null;
    return (
      <>
        {hintState.alwaysVisible.map((p) => (
          <View key={p.hint.klucz} style={styles.hintBox}>
            {/* Nadtytuł mówi PRAWDĘ o pochodzeniu zdania: „Z materiałów Gamechange"
                tylko wtedy, gdy da się pokazać źródło. Wiersz bez źródła
                (zdanie kierujące po dawki do rodzica, decyzja A9) dostaje
                „Zasada Gamechange" — patrz `hintEyebrow` w lib/componentHints.ts. */}
            <Text style={styles.hintEyebrow}>
              {hintEyebrow(p.source)}
              {p.source ? <Text style={styles.hintSource}>{'  ·  ' + p.source}</Text> : null}
            </Text>
            <Text style={styles.hintKind}>{hintKindLabel(p.hint.rodzaj)}</Text>
            <Text style={styles.hintText}>{p.hint.hint}</Text>
          </View>
        ))}
      </>
    );
  };

  // ⚠️ PLAN-D-T (T1) — STANY R5 PODPOWIEDZI („nie ma tabeli" / „błąd odczytu" /
  // „pusto") NIE RYSUJĄ JUŻ WŁASNEGO KAFELKA. Rozróżnienie NIE ZGINĘŁO: idzie
  // do konsoli razem z powodem odpowiedzi. Powód jest twardy — te trzy zdania
  // mówiły zawodnikowi o STANIE NASZEJ BAZY („materiały są w przygotowaniu"),
  // czyli o nas, a nie o nim, i zajmowały miejsce jednej odpowiedzi. Gdy nie
  // mamy czego zaproponować, mówi to `BRAK_PROPOZYCJI` — jednym zdaniem,
  // w jednym miejscu.
  const powodBrakuPodpowiedzi =
    hintState.state === 'table_missing' ? HINT_TABLE_MISSING_TEXT
      : hintState.state === 'error' ? HINT_ERROR_TEXT
        : hintState.state === 'empty' ? HINT_EMPTY_TEXT
          : null;

  // PLAN-D-J 08.2026 — CO OBOWIĄZUJE. Decyzja jest czystą funkcją
  // (`lib/ograniczenia.ts`), tu zostaje wyłącznie jej wykonanie.
  // ⚠️ TO NIE DODAJE NA EKRAN ANI JEDNEGO SŁOWA. Karta głosu tygodnia
  // („Wracasz po urazie" / „Zmieniła się Twoja sytuacja") już mówi zawodnikowi,
  // co się dzieje. To ZDEJMUJE z ekranu to, co w tych stanach jest wyrzutem:
  // licznik zrobionych sesji, zaproszenie do planowania i rekomendację.
  // ⚠️ PLAN-D-B2 — `useMemo`, bo od tej rundy `widokDzis` jest ZALEŻNOŚCIĄ
  // memoizacji kolejki. Nowy obiekt przy każdym renderze przeliczałby rankera
  // za każdym przemalowaniem ekranu — a polecenie B2 §6.3 mówi wprost:
  // `ulozKolejke` woła się RAZ. Zachowanie bez zmian co do znaku.
  const widokDzis = useMemo(() => coPokazacNaDzis(ograniczenia), [ograniczenia]);

  // ═══════════════════════════════════════════════════════════════════
  // PLAN-D-T 08.2026 (13.08.2026), zadanie T1 — JEDNA ODPOWIEDŹ.
  // Decyzja jest CZYSTĄ FUNKCJĄ (`lib/jednaOdpowiedz.ts`); ten ekran ją
  // WYKONUJE, nie podejmuje. Wszystkie trzy części biorą się z rzeczy, które
  // ekran już miał — zero nowych zapytań do bazy.
  // ═══════════════════════════════════════════════════════════════════
  const odpowiedz = useMemo(() => zbudujJednaOdpowiedz({
    widok: widokDzis,
    laduje: loading,
    maGardlo: !!priorityGoal,
    etykietaGardla: goalSegmentLabel,
    // ⭐ PLAN-D-F1 — CO DO ZNAKU TO SAMO CO `!!workProgress` PRZED PASEM:
    // `BRAK_PLANU` zachodzi dokładnie wtedy, gdy `computeFocusBlockProgress`
    // zwracało `null` (patrz `computeFocusBlockProgressState`, pierwsza linia).
    // ⛔ `NIE_WIEM` NIE JEST brakiem Bloku: Blok jest, sesje są, nieznana jest
    // wyłącznie liczba odbytych. Zaliczenie go do „nie ma Bloku" kazałoby
    // jednej odpowiedzi zaprosić do zaplanowania pracy, którą zawodnik ma.
    maAktywnyBlok: workProgress !== null && workProgress.stan !== 'BRAK_PLANU',
    nowaPorcjaCzeka: newDoseWaiting,
    rekomendacja: { jest: !!focusRec && !!currentUser, powiazanaZGardlem: isRecLinkedToGoal },
    podpowiedz: hintState,
    // ⚠️ Osłona liczona z DWÓCH kluczy naraz (`czyOslonaAktywna`), nigdy
    // z samego `blokNieZwiekszaObjetosci` — bo ten zapala także kontuzja,
    // a wtedy zdanie „Twój Blok nie zwiększa objętości" sugerowałoby wzrost
    // komuś, kto leży z urazem. To jest Z0.
    oslona: czyOslonaAktywna(ograniczenia),
  }), [widokDzis, loading, priorityGoal, goalSegmentLabel, workProgress, newDoseWaiting,
    focusRec, currentUser, isRecLinkedToGoal, hintState, ograniczenia]);

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-B2 (14.08.2026), zadanie B2.2 — KOLEJKA PODANIA.
  //
  // To jest JEDYNE miejsce w tym pliku, które decyduje, CO i W JAKIEJ
  // KOLEJNOŚCI stoi na „Dziś". Ekran wybiera wyłącznie, ILE pozycji bierze —
  // i nawet tego nie liczy sam: liczbę wydaje `wezDlaWidoku`.
  //
  // ⛔ ZERO `.sort()`, ZERO `.filter()` po regule, ZERO własnego `.slice()`.
  // ═══════════════════════════════════════════════════════════════════
  //
  // DECYZJA B2-a (polecenie §4, DROGA B — z pomiarem, nie z gustu).
  // Zmierzone 14.08.2026 na żywym rankerze: `ulozKolejke` produkuje pozycję ze
  // źródła „jedna odpowiedź" w TRZECH z czterech jej źródeł (`blok`,
  // `zaproszenie`, `brak`) — waga 1300, kubełek `teraz`, pozycja nr 1.
  // W czwartym (`rekomendacja`) NIE produkuje NICZEGO i nie zapisuje tego
  // nawet w `odrzucone`, bo `coZrobic.tekst` jest wtedy `null` — treść niesie
  // karta rekomendacji (`zJednejOdpowiedzi`, kolejkaPodania.ts:804).
  //
  // Gdyby ekran rysował wyłącznie `wezDlaWidoku`, w tym czwartym przypadku
  // z ekranu ZNIKNĘŁABY karta rekomendacji — a z nią CZTERY obietnice w stanie
  // JEST (EK-07, EK-08, EK-09, EK-11). Dlatego rekomendacja wchodzi do rankera
  // TĄ SAMĄ DROGĄ, CO KAŻDA INNA FUNKCJA: przez `dodatkowi` (kontrakt B1 §8.7),
  // z kluczem śladu `rekomendacja` — który B1 przewidział w swojej liście
  // kluczy. Karta jest wtedy CIAŁEM pozycji nr 1, a nie drugim producentem:
  // jej miejsce ustala ranker.
  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-B4 (14.08.2026), zadanie B4.2 — SZEŚĆ WGLĄDÓW, JEDNO WYWOŁANIE.
  //
  // `policzWglady` jest CZYSTĄ FUNKCJĄ: nie czyta bazy, nie czyta zegara,
  // nie ma pamięci między dniami. Wszystko, czego potrzebuje, przyszło już
  // z `load()`. Dlatego stoi w `useMemo`, a nie w `load()` — liczenie sześciu
  // wglądów przy każdym przemalowaniu ekranu byłoby marnotrawstwem, a liczenie
  // ich w `load()` wiązałoby wynik z odczytem bazy bez żadnego powodu.
  //
  // ⛔ JEDEN ARGUMENT. Drugi (`ZasadyWgladow`) istnieje WYŁĄCZNIE dla strażnika
  // mutacyjnego pasa B3 — podany stąd znaczyłby, że ekran ma własną, schowaną
  // kopię reguł liczenia wglądów.
  // ═══════════════════════════════════════════════════════════════════
  const wglady = useMemo<WynikiWgladow | null>(() => {
    if (dane === null) return null;
    return policzWglady({ dzis: dane.wejscia.dzis, ...dane.wejsciaWgladow });
  }, [dane]);

  const kolejka = useMemo<Kolejka | null>(() => {
    if (dane === null) return null;

    const dodatkowi: Kandydat[] = [];

    // (1) REKOMENDACJA — patrz decyzja B2-a wyżej.
    if (odpowiedz.coZrobic.zrodlo === 'rekomendacja' && focusRec !== null) {
      const sladRekomendacji = slad({
        rejestr: 'propozycja',
        skad: 'decision_recommendations',
        idWiersza: String(focusRec.id),
        klucz: 'rekomendacja',
      });
      dodatkowi.push({
        id: `rekomendacja:${focusRec.id}`,
        co: focusRec.recommendation_text,
        dlaczego: odpowiedz.dlaczego,
        ileZajmieSekund: null,
        skadToWiemy: sladRekomendacji,
        wagaBazowa: WAGA_BAZOWA.jedna_odpowiedz,
        zrodlo: 'jedna_odpowiedz',
        rodzajPracy: 'praca_nad_celem',
        podniesioneRecznie: false,
        termin: dane.wejscia.dzis,
        godzina: null,
      });
    }

    // (2) DZISIEJSZY WPIS DZIENNIKA — do 14.08 osobna, ósma karta tego ekranu.
    // ⚠️ NIE JEST NOWĄ FUNKCJĄ: jest istniejącym producentem, który przestał
    // sam decydować, gdzie stanąć. Powstaje WYŁĄCZNIE wtedy, gdy zawodnik
    // dzisiejszego wpisu nie ma — rzecz zrobiona nie jest rzeczą do zrobienia.
    // ⚠️ `dlaczego` to zmierzony fakt o zawodniku (brak wiersza w `daily_logs`
    // z dzisiejszą datą), a nie nasza teza. `ileZajmieSekund` = `null`, bo
    // NIKT tego czasu nie zmierzył — „30 sekund" byłoby zmyśleniem (Z0).
    // `rodzajPracy: 'porzadek'` jest rozstrzygnięciem: wpis w Dzienniku nie
    // jest dokładaniem objętości, więc Osłona ani ból go NIE wyciszają —
    // zawodnik po urazie ma prawo (i powód) dalej notować.
    if (brakWpisuDzis === true) {
      const sladDziennika = slad({
        rejestr: 'fakt_o_tobie',
        skad: 'daily_logs',
        idWiersza: null,
        klucz: 'journal',
      });
      dodatkowi.push({
        id: `dziennik:${dane.wejscia.dzis}`,
        co: DZIENNIK_CO,
        dlaczego: DZIENNIK_DLACZEGO,
        ileZajmieSekund: null,
        skadToWiemy: sladDziennika,
        wagaBazowa: WAGA_BAZOWA.zadanie_systemowe,
        zrodlo: 'zadanie_systemowe',
        rodzajPracy: 'porzadek',
        podniesioneRecznie: false,
        termin: dane.wejscia.dzis,
        godzina: null,
      });
    }

    // ⭐ (3) SZEŚĆ WGLĄDÓW — TO JEST CAŁE WPIĘCIE PASA B4. Jedno pole.
    //
    // ⛔ ZERO FILTROWANIA PRZED RANKEREM. Wgląd, który ranker wyciszy (Osłona,
    // kontuzja, ścieżka wyjścia), ma zostać WIDOCZNY, wyszarzony, z powodem
    // milczenia i warunkiem powrotu — to jest WG-32. `.filter()` w tym miejscu
    // skasowałby go po cichu, czyli zrobiłby dokładnie to, czego WG-32 zakazuje,
    // i zrobiłby to niewidocznie dla testów, bo lista byłaby po prostu krótsza.
    //
    // ⚠️ Kandydat wglądu ma wagę bazową 300 — NAJNIŻSZĄ ze wszystkich źródeł.
    // To jest decyzja pasa B1, nie tego pasa: wgląd stoi POD rzeczami, które
    // zawodnik ma dziś zrobić. Skutek jest zmierzony i opisany w nocie B4 §4.
    if (wglady !== null) dodatkowi.push(...wglady.kandydaci);

    // ⛔ JEDEN ARGUMENT. Drugi (`Zasady`) jest wyłącznie dla strażnika
    // mutacyjnego rankera i dla pasa B3 — kontrakt B1 §8.1.
    return ulozKolejke({ ...dane.wejscia, jednaOdpowiedz: odpowiedz, dodatkowi });
  }, [dane, odpowiedz, focusRec, brakWpisuDzis, wglady]);

  // ⛔ EKRAN NIE WYBIERA, KTÓRE POZYCJE POKAZAĆ. `wezDlaWidoku` wydaje PREFIKS
  // kolejki (dziś: 4 pozycje) i to jest cała rola tego wiersza.
  // ⚠️ Przy ścieżce wyjścia (`wyciszonaCalkowicie`) oddaje PUSTĄ tablicę —
  // „zero przypomnień, zero liczników, zero porównań". Cztery wyszarzone
  // przypomnienia byłyby nadal listą przypomnień.
  const pozycjeNaDzis = kolejka === null ? [] : wezDlaWidoku(kolejka, 'dzis');
  if (kolejka !== null) console.log(`dzis: ${kolejka.powod}`);

  // ⭐ PLAN-D-B4 — `wglady.brakDanych` IDZIE DO KONSOLI, NIE NA EKRAN.
  // To są zdania o STANIE NASZYCH DANYCH („2 pomiary ciężkości, próg 3"),
  // czyli o nas, a nie o zawodniku — dokładnie ta klasa zdań, którą pas T
  // zdjął z tego ekranu. Zawodnik dostaje z tego JEDNĄ rzecz: informację,
  // że lista jest niepełna (`KOLEJKA_NIEPELNA` niżej), i to tylko wtedy, gdy
  // czegoś naprawdę NIE ODCZYTALIŚMY — a nie wtedy, gdy odczyt się udał
  // i danych po prostu nie ma.
  if (wglady !== null) {
    console.log(`dzis: ${wglady.powod}`);
    for (const b of wglady.brakDanych) {
      console.log(`dzis: wgląd „${b.klucz}" się nie policzył — ${b.powod}`);
    }
    for (const n of wglady.nieWiem) {
      console.error(`dzis: wgląd nieodczytany — ${n.wejscie}: ${n.powod}`);
    }
  }

  // ⚠️ ROZRÓŻNIENIE R5 NIE ZGINĘŁO — ZESZŁO DO KONSOLI. „Nie ma tabeli",
  // „błąd odczytu" i „pusto" to nadal trzy różne rzeczy i nadal da się je
  // odróżnić przy pytaniu „dlaczego ekran wyglądał wtedy tak". Przestały być
  // trzema różnymi zdaniami NA EKRANIE, bo mówiły zawodnikowi o stanie NASZEJ
  // bazy („materiały dla tego obszaru są w przygotowaniu"), a nie o jego
  // pracy — i zajmowały miejsce jednej odpowiedzi.
  if (powodBrakuPodpowiedzi) console.log(`dzis: podpowiedź niedostępna — ${powodBrakuPodpowiedzi}`);
  console.log(`dzis: jedna odpowiedź — ${odpowiedz.powod}`);

  // PLAN-D-T (T6) — KTÓRA TO PUSTKA w karcie „Dziś w kalendarzu".
  // ⚠️ `planLekcjiZnany: null` — planu lekcji nie ma w bazie (zmierzone
  // 14.08.2026: zero tabel %school% / %szkol% / %lesson%), więc gałąź
  // „brak konfiguracji" jest nieosiągalna. Włącza ją pas A3.
  // ⭐ PLAN-D-F1 15.08.2026 — CZWARTY RODZAJ PUSTKI WCHODZI NA TEN EKRAN.
  // Do 15.08 `dzis.tsx` wołał `rozpoznajPustke` BEZ `odczytUdanySie` i miał do
  // tego prawo: pole jest wstecznie zgodne (R9 pasa C3), a lista i tak zawsze
  // przychodziła jako tablica — bo `?? []` gasiło awarię wcześniej. Po
  // usunięciu tamtego `?? []` (F1.3) awaria ma wreszcie czym się zameldować.
  const pustkaDzis = rozpoznajPustke({
    maWpisy: todayEvents !== null && todayEvents.length > 0,
    planLekcjiZnany: null,
    moznaZapisywac,
    zakres: 'dzis',
    // ⛔ `null` (jeszcze nie czytałem) NIE jest `false`. Trzy wartości, nie dwie.
    odczytUdanySie: odczytWydarzenUdanySie,
  });
  if (pustkaDzis) console.log(`dzis: ${opisPustkiDoLogu(pustkaDzis)}`);

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-B5, B5.2 — SIEDEM WIERSZY DNIA NA KARCIE „DZIŚ W KALENDARZU".
  //
  // ⛔ ZERO WŁASNEJ PĘTLI PO DNIACH: `tydzienBiezacy.dni` MA już siedem
  // wierszy — także przy zerze wydarzeń i przy nieudanym odczycie. Ta funkcja
  // wyłącznie je rysuje.
  //
  // ⛔ ZERO SIATKI GODZINOWEJ (WT-34). Pozycje zostają LISTĄ przy dniu.
  //
  // ⚠️ CZEGO TU ŚWIADOMIE NIE MA, a jest w Kalendarzu: paska zajętości ze
  // szkoły, zdania o napięciu, legendy kropek, strzałek ‹ › i wagi dnia.
  // Powód nie jest estetyczny: pasek i napięcie wymagają planu lekcji, którego
  // ten ekran nie czyta (patrz `planLekcji: null` wyżej), a strzałki zrobiłyby
  // z karty drugi Kalendarz zamiast jego skrótu. Pełny tydzień stoi JEDNO
  // dotknięcie dalej i ten pas tego nie zmienia (§5 pkt 4 polecenia).
  // ═══════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════
  // ⭐⭐ PAS W1 18.08.2026 — KAFEL Z TRZEMA NOŚNIKAMI (D-3, D-4, D-5).
  //
  // ⛔ JEDEN RYSOWNIK KAFLA NA CAŁY EKRAN. Do 18.08 kafel był pisany
  // W DWÓCH MIEJSCACH (wpis dzienny i pętla po wydarzeniach) i oba miały
  // czerwoną lewą krawędź. Dwie kopie rozjeżdżają się przy pierwszej
  // poprawce, a każda z osobna wygląda poprawnie.
  //
  //  RODZAJ  (Z5)  → lewa krawędź: ciemna · zielona · kropkowana
  //  REJESTR (Z1)  → reszta ramki: wypełniona · ciągła · przerywana
  //  STAN          → plakietka tekstem, bo ⭐ K4: około 1 na 12 chłopców
  //                  nie rozróżnia części barw i kształt ramki im nie wystarczy
  // ═══════════════════════════════════════════════════════════════════
  type RodzajKafla = 'zob' | 'wl' | 'prod';
  type RejestrKafla = 'zmierzone' | 'plan' | 'niewiem' | 'wygasly';
  function renderKafel(k: {
    klucz: string;
    tytul: string;
    podpis: string;
    rodzaj: RodzajKafla;
    rejestr: RejestrKafla;
    plakietka: string;
    onPress: () => void;
  }) {
    const stylRodzaju = k.rodzaj === 'zob' ? styles.kafelZobowiazanie
      : k.rodzaj === 'wl' ? styles.kafelWlasnaPraca : styles.kafelRzeczProduktu;
    const stylRejestru = k.rejestr === 'zmierzone' ? styles.kafelZmierzone
      : k.rejestr === 'plan' ? styles.kafelZaplanowane
        : k.rejestr === 'wygasly' ? styles.kafelWygasly : styles.kafelNieWiemy;
    const stylPlakietki = k.rejestr === 'zmierzone' ? styles.plakietkaZrobione
      : k.rejestr === 'plan' ? styles.plakietkaDoZrobienia
        : k.rejestr === 'wygasly' ? styles.plakietkaWygasla : styles.plakietkaNieWiemy;
    return (
      <TouchableOpacity
        key={k.klucz}
        style={[styles.kafel, stylRejestru, stylRodzaju]}
        accessibilityRole="button"
        onPress={k.onPress}
      >
        {/* ⛔ React Native nie umie `border-left-style: dotted` osobno dla
            jednej krawędzi — kropkowana krawędź rzeczy produktu jest osobnym
            paskiem, a nie stylem ramki. To jest ograniczenie platformy,
            nie decyzja projektowa. */}
        {k.rodzaj === 'prod' ? <View style={styles.kafelKrawedzProdukt} /> : null}
        <View style={styles.kafelTresc}>
          <Text style={styles.kafelTytul}>{k.tytul}</Text>
          {k.podpis === '' ? null : <Text style={styles.kafelPodpis}>{k.podpis}</Text>}
        </View>
        <Text style={[styles.plakietka, stylPlakietki]}>{k.plakietka}</Text>
      </TouchableOpacity>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⭐⭐ PAS W1 (D-2) — TRZY FAKTY O DNIU. Makieta v3: `czteryInfo`, 86 dp.
  //
  // ⛔⛔ NAJWAŻNIEJSZA UCZCIWOŚĆ TEGO BLOKU: wiersz „Obciążenie" NIE PODAJE
  // LICZBY W PUNKTACH. Silnik obciążenia (minuty × ciężkość ⁄ 180) nie
  // istnieje — buduje go pas D1. To, co produkt umie policzyć dzisiaj, to
  // WAGA DNIA z rodzajów pozycji, czyli liczba Z PLANU. Podanie jej jako
  // „X pkt obciążenia" byłoby podaniem planu jako pomiaru (Z0).
  //
  // ⛔ KROPKA JEST JEDNA I TAKA SAMA niezależnie od tego, ile dzień waży
  // (D4). Zielona = mamy liczbę. Szara = nie policzone. Złota = ostrzeżenie
  // MIĘKKIE (napięcie). ⛔ Czerwieni tu nie ma i mieć nie będzie (Z2).
  // ═══════════════════════════════════════════════════════════════════
  function renderTrzyFakty(zdanieZWpisow: string | null) {
    const odczytOk = tydzienBiezacy !== null && tydzienBiezacy.odczyt.wydarzenia;
    const dzisWiersz = tydzienBiezacy === null
      ? null
      : (tydzienBiezacy.dni.find((d) => d.dzisiaj) ?? null);

    // ── 1. OBCIĄŻENIE ──────────────────────────────────────────────
    let obciazenie: string;
    let obciazeniePustka = true;
    if (!odczytOk || dzisWiersz === null) {
      obciazenie = FAKT_NIE_ODCZYTANE;
    } else if (dzisWiersz.stan === 'pusto') {
      obciazenie = FAKT_NIE_POLICZONE_PUSTY;
    } else if (dzisWiersz.opisWagi !== null) {
      obciazenie = `${dzisWiersz.opisWagi} · ${FAKT_OBCIAZENIE_BEZ_SILNIKA}`;
      obciazeniePustka = false;
    } else {
      obciazenie = FAKT_NIE_ODCZYTANE;
    }

    // ── 2. NAPIĘCIE ────────────────────────────────────────────────
    // ⚠️ Plan lekcji nie istnieje w bazie (zmierzone 14.08: zero tabel
    // %school% / %szkol% / %lesson%), więc ta gałąź jest dziś jedyną
    // osiągalną. ⛔ Pustka NAZWANA, nie cisza (R5).
    const napiecie = dzisWiersz !== null && dzisWiersz.napiecie !== null
      ? dzisWiersz.napiecie.tekst
      : FAKT_NAPIECIE_BEZ_PLANU;
    const napiecieJest = dzisWiersz !== null && dzisWiersz.napiecie !== null;

    // ── 3. Z TWOICH WPISÓW ─────────────────────────────────────────
    // ⛔ ZERO NOWEJ TREŚCI: to jest `glos.tytul` co do znaku, czyli jedno
    // zdanie, które arbiter już wydał. Pełna treść stoi w arkuszu.
    const wpisyJest = zdanieZWpisow !== null;
    const wpisy = zdanieZWpisow !== null
      ? zdanieZWpisow
      : (glos.rodzaj === 'nie_wiem' ? FAKT_NIE_ODCZYTANE : FAKT_WPISY_BEZ_WNIOSKU);

    const wiersz = (nazwa: string, tresc: string, jest: boolean, miekka = false) => (
      <View style={styles.fakt}>
        <View style={[
          styles.faktKropka,
          !jest && styles.faktKropkaPustka,
          jest && miekka && styles.faktKropkaMiekka,
        ]} />
        <Text style={styles.faktTekst}>
          <Text style={styles.faktNazwa}>{nazwa + ': '}</Text>
          <Text style={jest ? styles.faktTekst : styles.faktPustka}>{tresc}</Text>
        </Text>
      </View>
    );

    return (
      <View style={styles.fakty}>
        {wiersz(FAKT_OBCIAZENIE, obciazenie, !obciazeniePustka)}
        {wiersz(FAKT_NAPIECIE, napiecie, napiecieJest, true)}
        {wiersz(FAKT_Z_WPISOW, wpisy, wpisyJest)}
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⭐⭐ PAS W1 (T-1, T-2) — REJESTR DNIA I SŁUPEK OBCIĄŻENIA.
  //
  // ⛔ CO TEN SŁUPEK NAPRAWDĘ NIESIE — i mówię to tutaj, a nie w nocie:
  // WAGĘ DNIA z `lib/widokTygodnia.ts` (`punktyWagi`, tabela `PUNKTY_RODZAJU`),
  // czyli liczbę Z RODZAJÓW POZYCJI. ⛔ NIE jest to obciążenie z minut
  // i ciężkości — tego silnika w produkcie nie ma i buduje go pas D1.
  // Dlatego ⛔ NIE STAWIAM pod tygodniem przypisu z definicją skali
  // („1 punkt obciążenia = 30 minut pracy przy ciężkości 6"): opisywałby
  // mechanizm, którego pod nim nie ma. Polecenie W1 mówi to wprost (T-7).
  //
  // ⭐ K4 — WYSOKOŚĆ I NASYCENIE LICZĄ SIĘ Z TEJ SAMEJ LICZBY, więc słupek
  // mówi to samo dwa razy: raz kształtem, raz barwą.
  // ⛔ Barwa nie ma składowej czerwonej (Z2) — pilnuje tego `barwaObciazenia`
  // w `constants/theme.ts` i mutacja M1 z baterii tego pasa.
  // ═══════════════════════════════════════════════════════════════════
  type RejestrDnia = 'zmierzone' | 'plan' | 'bezOceny' | 'bezLiczby' | 'pusto';
  function rejestrDnia(d: WierszDnia): RejestrDnia {
    const liczone = d.pozycje.filter((p) => p.liczonaDoWagi);
    if (d.pozycje.length === 0) return 'pusto';
    if (!d.przeszly) return 'plan';
    // ⛔ „nie odczytano" i „brak wpisu" to DWA różne powody tej samej
    // niewiedzy — i oba znaczą „nie wiemy", a nie „nic nie zrobiłeś".
    if (liczone.some((p) => p.stanPrzeszly === null || p.stanPrzeszly === 'brak_wpisu')) return 'bezOceny';
    if (liczone.some((p) => p.stanPrzeszly === 'nie_odczytano')) return 'bezLiczby';
    return 'zmierzone';
  }
  const PODPIS_REJESTRU: Record<RejestrDnia, string> = {
    zmierzone: REJESTR_ZMIERZONE,
    plan: REJESTR_W_PLANIE,
    bezOceny: REJESTR_BEZ_OCENY,
    bezLiczby: REJESTR_BEZ_LICZBY,
    pusto: REJESTR_PUSTO,
  };
  function renderSlupek(d: WierszDnia) {
    const rej = rejestrDnia(d);
    const wartosc = d.punktyWagi === null ? 0 : d.punktyWagi;
    const wys = wysokoscObciazenia(wartosc);
    const wypelnienie = rej === 'zmierzone'
      ? { height: wys, backgroundColor: barwaObciazenia(wartosc) }
      : rej === 'plan'
        ? { height: wys, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: barwaObciazenia(Math.max(wartosc, 3)) }
        : rej === 'pusto'
          ? { height: 2, backgroundColor: colors.border }
          : { height: wys, backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed' as const, borderColor: colors.textSecondary };
    return (
      <View style={styles.slupek}>
        <View style={styles.slupekTor}>
          <View style={[styles.slupekWypelnienie, wypelnienie]} />
        </View>
        <Text style={styles.slupekPodpis}>{PODPIS_REJESTRU[rej]}</Text>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⭐⭐ PAS W1 18.08.2026 — WIERSZ DNIA PRZEBUDOWANY (T-1 … T-8).
  //
  //  T-1 ⛔⛔ SŁUPKA OBCIĄŻENIA NIE BYŁO W OGÓLE — cały nośnik zniknął.
  //          Wraca, i niesie tę samą informację DWA RAZY: wysokością
  //          i nasyceniem (K4 — około 1 na 12 chłopców nie rozróżnia
  //          części barw).
  //  T-2     Pod słupkiem stoi plakietka REJESTRU: co o tym dniu WIEMY.
  //  T-3     Wiersz jest KARTĄ i da się go dotknąć. Do 18.08 był gołym
  //          rzędem tekstu — nie wyglądał na nic dotykalnego, i nie był.
  //  T-4 ⛔⛔ POZYCJA ODWOŁANA NIE JEST JUŻ PRZEKREŚLONA. Makieta nigdy
  //          nie przekreśla: przekreślenie czyta się jako kara, a
  //          nieobecność jest WIEDZĄ, nie karą (Z7).
  //  T-5     Wiersz przestaje wyliczać NAZWY pozycji. Pierwsza linia to
  //          OPIS DNIA (`opisWagi` — „Sesja + klub"), druga mówi, co o tym
  //          dniu wiadomo. ⛔ Nic nie znika: opis dnia jest zbudowany
  //          z tych samych rodzajów, które stały w liście nazw, a pełna
  //          lista pozycji stoi JEDNO DOTKNIĘCIE dalej, w Kalendarzu.
  //  T-6     Plakietka „ocenione" / „N bez oceny" — jak w makiecie.
  //  T-8 ⛔  Dzisiejszy dzień oznacza OBWÓDKA, nie barwa ostrzegawcza.
  // ═══════════════════════════════════════════════════════════════════
  function renderWierszDnia(d: WierszDnia) {
    const rej = rejestrDnia(d);
    const bezOcenyIle = d.pozycje.filter(
      (p) => p.liczonaDoWagi && (p.stanPrzeszly === null || p.stanPrzeszly === 'brak_wpisu'),
    ).length;

    // ── PIERWSZA LINIA: OPIS DNIA (T-5) ────────────────────────────
    // ⛔ `opisWagi === null` znaczy „nie udało się odczytać" — i wtedy NIE
    // piszemy „nic nie masz", tylko mówimy, że nie wiemy (Z0).
    const opis = d.pozycje.length === 0
      ? (d.podpisPustegoDnia ?? DZIEN_NIE_ODCZYTANY)
      : (d.opisWagi ?? DZIEN_NIE_ODCZYTANY);

    // ── DRUGA LINIA: CO O TYM DNIU WIADOMO (T-5) ───────────────────
    const druga = d.dzisiaj ? DZIEN_DZIS
      : !d.przeszly ? DZIEN_JESZCZE_NIE_BYLO
        : rej === 'pusto' ? DZIEN_MINELO_PUSTO
          : rej === 'zmierzone' ? DZIEN_MINELO_OCENIONE
            : DZIEN_MINELO_NIE_WIEM;

    // ── PLAKIETKA WIERSZA (T-6) ────────────────────────────────────
    const plakietka = rej === 'bezOceny' && bezOcenyIle > 0
      ? `${bezOcenyIle} ${REJESTR_BEZ_OCENY}`
      : (d.przeszly && rej === 'zmierzone' ? PLAKIETKA_OCENIONE : null);

    return (
      <TouchableOpacity
        key={d.data}
        style={[styles.wd, d.dzisiaj && styles.wdDzis]}
        accessibilityRole="button"
        onPress={() => router.push('/kalendarz')}
      >
        <Text style={[styles.wdNazwa, d.dzisiaj && styles.kartaDzienEtykietaDzis]}>
          {d.etykieta}
        </Text>
        {renderSlupek(d)}
        <View style={styles.wdTresc}>
          <Text style={styles.wdOpis}>{opis}</Text>
          <Text style={styles.wdDruga}>{druga}</Text>
          {/* ═══════════════════════════════════════════════════════
              ⛔⛔ T-4 BEZ CICHEGO ZNIKNIĘCIA (B3). T-5 każe zdjąć z wiersza
              WYLICZANKĘ NAZW pozycji — i jest zdjęta. Ale pozycja ODWOŁANA
              i pozycja BEZ WPISU niosły swój stan właśnie tam, więc samo
              zdjęcie listy skasowałoby po cichu jedyne miejsce, w którym
              zawodnik widzi „Odwołane".
              ⭐ Dlatego wiersz wymienia z nazwy WYŁĄCZNIE te pozycje, które
              MAJĄ CO POWIEDZIEĆ o swoim stanie — a stan bierze z
              `plakietkaPozycji`, czyli z JEDYNEGO producenta plakietki.
              ⛔ Ekran, który składa plakietkę sam z dwóch pól, jest drugą
              kopią reguły: dokładnie przez to sesja odwołana z datą
              w przyszłości nie niosła NICZEGO (9 wydarzeń na produkcji,
              pomiar 17.08.2026).
              ⛔ ZERO PRZEKREŚLENIA. Stan niesie SŁOWO, nie kreska. */}
          {d.pozycje
            .filter((p) => p.obowiazywanie === 'odwolane'
              || p.stanPrzeszly === 'brak_wpisu' || p.stanPrzeszly === 'nie_odczytano')
            .map((p) => (
              <Text key={`${p.id}-${p.dzien}`} style={styles.wdOdwolana}>
                {p.tytul}
                {plakietkaPozycji(p) !== null
                  ? <Text style={styles.kartaPlakietka}>{'  ·  ' + plakietkaPozycji(p)}</Text>
                  : null}
              </Text>
            ))}
        </View>
        {plakietka === null ? null : (
          <Text style={[
            styles.plakietka,
            rej === 'zmierzone' ? styles.plakietkaZrobione : styles.plakietkaNieWiemy,
          ]}>{plakietka}</Text>
        )}
      </TouchableOpacity>
    );
  }

  function renderTydzienNaKarcie() {
    // ⛔ NIEUDANY ODCZYT NIE JEST PUSTYM TYGODNIEM. Bez tej gałęzi awaria
    // sieci wyglądałaby jak siedem dni bez nic — czyli jak nieprawda o tym,
    // co zawodnik ma zaplanowane (Z0).
    if (tydzienBiezacy === null || !tydzienBiezacy.odczyt.wydarzenia) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardBody}>{KARTA_TYDZIEN_NIEODCZYTANY}</Text>
        </View>
      );
    }
    return (
      /* ⭐ PLAN-D-A1 18.08.2026 — KARTA WCHODZI DO TEJ FUNKCJI, a gałąź na
         ekranie jest GOŁYM WYWOŁANIEM (`renderTydzienNaKarcie()`), tak jak
         w `app/(tabs)/kalendarz.tsx`. ⛔ To nie jest kosmetyka: miara
         (`lib/wysokoscEkranu.ts`) umie NAZWAĆ pominiętą gałąź tylko wtedy,
         gdy jest ona wywołaniem po nazwie. Owinięta w `<View>` wypadała
         z raportu BEZ ŚLADU razem z siedmioma wierszami dni — czyli dokładnie
         ten cichy brak, którego pilnuje asercja (M2-13, O97). */
      /* ⭐ PAS W1 (T-3) — KARTA ZDJĘTA Z OBUDOWY TYGODNIA. Wiersze dni SĄ
         od dziś kartami (`styles.wd`), więc obudowa robiła z tego kartę
         w karcie: dwie ramki wokół tej samej rzeczy. Makieta v3
         (`ekranTydzien`) rysuje wiersze wprost na tle ekranu. */
      <>
        <Text style={styles.kartaTydzienZakres}>{tydzienBiezacy.zakresDat}</Text>
        {/* ⚠️ Zdanie nad tygodniem POWSTAJE ALBO NIE POWSTAJE — nigdy nie
            jest ogólne. `zbudujZdanie` oddaje `null`, gdy nie ma czego
            podsumować, i wtedy nie rysujemy nic.
            ⚠️ T-9 — brzmienie „Jeden trening, trzy dni bez nic." jest
            niezręczne po polsku i Kuba to zgłosił. ⛔ NIE PODMIENIAM GO
            po cichu: producent stoi w `lib/widokTygodnia.ts`
            (`zbudujZdanie`), czyli po stronie logiki, której ten pas nie
            dotyka. Propozycja brzmienia jest w nocie przekazania. */}
        {tydzienBiezacy.zdanie !== null
          ? <Text style={styles.kartaTydzienZdanie}>{tydzienBiezacy.zdanie.podsumowanie}</Text>
          : null}
        {tydzienBiezacy.dni.map(renderWierszDnia)}
        {/* ⭐ PAS W1 (T-7) — PRZYPIS BEZ DEFINICJI SKALI.
            Polecenie mówi wprost: definicję („1 punkt obciążenia = 30 minut
            pracy przy ciężkości 6") postawić DOPIERO, gdy słupki naprawdę
            liczą obciążenie. Dziś liczą WAGĘ DNIA z rodzajów pozycji, więc
            zdanie o minutach i ciężkości opisywałoby mechanizm, którego pod
            nim nie ma. ⛔ Nie stawiam go i mówię o tym w nocie. */}
        <Text style={styles.licznikPodpis}>{PRZYPIS_TYGODNIA_BEZ_SKALI}</Text>
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-D2, D2.3 — PYTANIE NA EKRANIE. **ZERO DOTKNIĘĆ, ŻEBY ZOBACZYĆ.
  // JEDNO, ŻEBY ODPOWIEDZIEĆ.**
  //
  // ⭐ STOI NAD LICZNIKIEM PRACY, BO TO JEST PYTANIE, A LICZNIK JEST
  // ODPOWIEDZIĄ. Odwrotna kolejność kazałaby zawodnikowi czytać „nie wiemy,
  // ile z 12 sesji się odbyło", zanim dostanie jedyną rzecz, która to zmienia.
  //
  // SZEŚĆ ZAKAZÓW, KAŻDY Z POWODEM I KAŻDY Z ASERCJĄ:
  //
  //  1. ⛔ ZERO NOWYCH BRZMIEŃ POZA ZDANIEM PYTAJĄCYM. Przyciski niosą
  //     `PLAKIETKI_STANU_PRZESZLEGO` — te same dwa napisy („Zrobione",
  //     „Nie odbyło się"), które zawodnik widzi w Kalendarzu i w widoku
  //     tygodnia. Trzecie słowo na to samo byłoby rozjazdem słownika.
  //  2. ⛔ ZERO SŁOWA O TYM, ILE PYTAŃ ZOSTAŁO BEZ ODPOWIEDZI. To byłaby
  //     lista zaległości — czyli dokładnie to, co decyzja o oknie wyklucza.
  //     Kształt `WynikPytan` takiej liczby nie niesie poza oknem.
  //  3. ⛔ ZERO POCHWAŁY ZA SAMO ODPOWIEDZENIE (N1). Po zapisie nie pojawia
  //     się ani jedno zdanie — zmienia się to, co pokazuje pytanie.
  //  4. ⛔ ZERO SŁÓW „passa", „seria", „z rzędu", „codziennie", „nie przerwij"
  //     (N1) i zero porównania z kimkolwiek (N3).
  //  5. ⛔ ZERO POWIADOMIEŃ PUSH. Pytanie jest DO ZOBACZENIA, gdy zawodnik
  //     wejdzie — nie do zawołania go z powrotem.
  //  6. ⛔ `brak_pytan` NIE RYSUJE SIĘ WCALE, `nie_wiem` RYSUJE SIĘ ZAWSZE (R5).
  //     Pierwsze to prawdziwa pustka („sprawdziłem, nie ma o co pytać")
  //     i blok o niej byłby szumem na karcie, która ma już trzy liczby.
  //     Drugie to AWARIA ODCZYTU i milczenie o niej powiedziałoby zawodnikowi
  //     „wczoraj nic nie miałeś" o dniu, którego nie sprawdziliśmy (Z0).
  //     ⚠️ Brzmienie awarii NIE JEST NOWE: idzie przez `rozpoznajPustke`
  //     i wychodzi jako „Nie udało się sprawdzić." + „Pociągnij w dół…" —
  //     te same dwa zdania, co przy pustkach pasa C3.
  // ═══════════════════════════════════════════════════════════════════
  /**
   * ⭐ PLAN-D-O1 — TRZY KROKI ZWINIĘTE POD ODPOWIEDZIĄ (D2).
   *
   * ⛔ ROZWINIĘTY MOŻE BYĆ NAJWYŻEJ JEDEN i to nie jest oszczędność miejsca.
   * Trzy pola otwarte naraz to formularz, a formularz się porzuca — dokładnie
   * to zrobiło z pytaniem „ZROBIŁEŚ?" 2,3 ekranu przewijania.
   *
   * ⛔ KROKI 2–4 NIE MAJĄ WŁASNEGO PRZYCISKU „ZAPISZ WSZYSTKO". Werdykt jest
   * już w bazie; te kroki DOKŁADAJĄ do niego, a nie warunkują go.
   */
  // ═══════════════════════════════════════════════════════════════════
  // ⭐⭐ PAS K1 21.08.2026 — DWA BLOKI OCENY MECZU, KAŻDY W JEDNYM MIEJSCU.
  //
  // ⛔ PO CO TA WYPROWADZKA. Ścieżka „+ → już się odbyło → Mecz" (§3.5,
  // decyzja Kuby 21.08) potrzebuje DOKŁADNIE tych samych dwóch bloków, co
  // ocena z kafla: dwóch liczb minut i ciężkości. Druga kopia tego JSX
  // rozjechałaby się z pierwszą przy pierwszej poprawce, a oba ekrany
  // wyglądałyby poprawnie — dokładnie ta choroba, którą pas M2 nazwał
  // „jedna rzecz, jedno słowo, jedna lista" (O92).
  // ⭐ Strażnik `K1-B7` sprawdza, że `MINUTY_NA_BOISKU` i `RPE_WARTOSCI`
  // pojawiają się w tym pliku DOKŁADNIE RAZ każde.
  // ═══════════════════════════════════════════════════════════════════
  function renderBlokMinutMeczu(leci: boolean) {
    const wynik = wynikMeczu({ minutyNaBoisku, dlugoscMeczu, rpe: rpeWybrane });
    return (
      <View style={styles.meczBlok}>
        <Text style={styles.licznikPodpis}>{POLE_MINUTY_NA_BOISKU}</Text>
        <View style={styles.pytanieOdpowiedzi}>
          {MINUTY_NA_BOISKU.map((m) => (
            <TouchableOpacity
              key={`min-${m}`}
              disabled={leci}
              style={[styles.pytanieBtn, minutyNaBoisku === m && styles.pytanieBtnWybrany]}
              onPress={() => setMinutyNaBoisku(minutyNaBoisku === m ? null : m)}
            >
              <Text style={[styles.pytanieBtnTxt, minutyNaBoisku === m && styles.pytanieBtnTxtWybrany]}>{String(m)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.licznikPodpis}>{POLE_DLUGOSC_MECZU}</Text>
        <View style={styles.pytanieOdpowiedzi}>
          {DLUGOSCI_MECZU.map((m) => (
            <TouchableOpacity
              key={`dl-${m}`}
              disabled={leci}
              style={[styles.pytanieBtn, dlugoscMeczu === m && styles.pytanieBtnWybrany]}
              onPress={() => setDlugoscMeczu(dlugoscMeczu === m ? null : m)}
            >
              <Text style={[styles.pytanieBtnTxt, dlugoscMeczu === m && styles.pytanieBtnTxtWybrany]}>{`${m} min`}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* ⭐ TRZECIA LINIA TEGO SAMEGO BLOKU. ⛔ Zero minut ma
            WŁASNY stan i własne zdanie — nie jest brakiem odpowiedzi
            i nie kasuje meczu z historii. */}
        {wynik.rodzaj === 'zero_minut'
          ? <Text style={styles.meczZeroMinut}>{wynik.zdanie}</Text>
          : <Text style={styles.licznikPodpis}>{wynik.zdanie}</Text>}
      </View>
    );
  }


  function renderKrokiOceny(p: Pytanie) {
    if (p.stan.rodzaj !== 'odpowiedziane') return null;
    const rodzaj = rozpoznajRodzajPozycji(faktyPozycji(p.idWydarzenia));
    const usuniecie = sciezkaUsuniecia(rodzaj);
    const leci = zapisWerdyktu === p.klucz;
    const otwarty = (id: IdKroku) => krokOtwarty === `${p.klucz}:${id}`;
    const przelacz = (id: IdKroku) => setKrokOtwarty(otwarty(id) ? null : `${p.klucz}:${id}`);
    // ⛔ D3 — PODPOWIEDŹ CZASU BIERZE SIĘ Z PLANU, A PLAN DZIŚ JEJ NIE MA.
    // Zmierzone 17.08.2026: w całej bazie NIE ISTNIEJE ani jedna kolumna
    // z planowanym czasem trwania (`information_schema.columns`, wzorce
    // `%duration%` i `%minut%` — wracają wyłącznie `match_contexts.minutes_played`
    // i `player_school_slots.minutes_range`, oba o czymś innym). Mechanizm
    // podpowiedzi ISTNIEJE i jest sprawdzany uruchomieniowo; danych nie ma
    // i ekran mówi to wprost, zamiast wstawiać wypełniacz.
    const podpowiedz = podpowiedzCzasu(null);
    // ⭐⭐ PLAN-D-D8 — MECZ MA WŁASNĄ POSTAĆ KROKU „ile trwało i jak ciężko".
    // ⛔ To NIE jest osobny krok: `krokiOceny()` z `lib/ocenaZKafla.ts` zostaje
    // nietknięte, zmienia się WYŁĄCZNIE to, co ten krok rysuje przy meczu.
    // Osobny krok znaczyłby, że ścieżka meczu i ścieżka treningu mogą się
    // po cichu rozjechać w kolejności i w zapisie.
    const toMecz = faktyPozycji(p.idWydarzenia).eventType === 'match';
    return (
      <View style={styles.ocenaKroki}>
        {krokiOceny(p.stan.werdykt).filter((k) => k.widoczny && !k.obowiazkowy).map((k) => (
          <View key={k.id}>
            <TouchableOpacity style={styles.ocenaKrokNaglowek} disabled={leci} onPress={() => przelacz(k.id)}>
              <Text style={styles.ocenaKrokTytul}>
                {k.id === 'czas_i_rpe' ? KROK_CZAS_I_RPE : (k.id === 'bol' ? KROK_BOL : KROK_POWOD)}
              </Text>
            </TouchableOpacity>
            {otwarty(k.id) && k.id === 'czas_i_rpe' ? (
              <View>
                {/* ═══════════════════════════════════════════════════════
                    ⭐⭐ PLAN-D-D8 — DWA POLA W JEDNYM BLOKU, WYNIK TRZECIĄ LINIĄ.
                    ⛔ Osobne bloki byłyby błędem, a nie układem: bez długości
                    meczu minuty na boisku nie znaczą nic (45′ z 60′ ≠ 45′ z 90′),
                    więc rozdzielenie ich zaprosiłoby zawodnika do podania
                    pierwszej i zignorowania drugiej.
                    ⛔ ŻADNA WARTOŚĆ NIE JEST ZAZNACZONA Z GÓRY (Z6).
                    ═══════════════════════════════════════════════════════ */}
                {toMecz ? renderBlokMinutMeczu(leci) : (
                  <>
                    <Text style={styles.licznikPodpis}>{POLE_CZAS}</Text>
                    <View style={styles.pytanieOdpowiedzi}>
                      {MINUTY_DO_WYBORU.map((m) => (
                        <TouchableOpacity
                          key={m}
                          disabled={leci}
                          style={[styles.pytanieBtn, czasWybrany === m && styles.pytanieBtnWybrany]}
                          onPress={() => { setCzasWybrany(m); setCzasZPlanu(podpowiedz.jest && podpowiedz.minuty === m); }}
                        >
                          <Text style={[styles.pytanieBtnTxt, czasWybrany === m && styles.pytanieBtnTxtWybrany]}>{`${m} min`}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {podpowiedz.jest ? null : <Text style={styles.licznikPodpis}>{podpowiedz.powod}</Text>}
                  </>
                )}
                <Text style={styles.licznikPodpis}>{POLE_RPE}</Text>
                {/* ⛔⭐ D3 — DZIESIĘĆ PRZYCISKÓW I ANI JEDEN NIE JEST WSTĘPNIE
                    ZAZNACZONY. Zaznaczenie bierze się WYŁĄCZNIE z `rpeWybrane`,
                    które startuje z `rpePoczatkowe()`, czyli z pustki. ⛔ Nie ma
                    tu suwaka i nie będzie: suwak ma uchwyt, uchwyt gdzieś stoi,
                    a to „gdzieś" jest podpowiedzią, choćby nikt jej tak nie nazwał.
                    ⚠️ PAS K1 21.08.2026 — TEN BLOK MA DRUGĄ KOPIĘ w arkuszu meczu
                    bez planu (`renderPolaMeczuBezPlanu`). ⛔ NIE WYPROWADZIŁEM GO
                    do wspólnej procedury świadomie: `lib/pytanieOWystapienie.selftest.ts`
                    (pas D3 w tej fali) sprawdza `RPE_WARTOSCI.map(` i `POLE_RPE`
                    W CIELE `renderKrokiOceny` — wyprowadzka zapala CUDZĄ asercję.
                    ⭐ Obie kopie pilnuje strażnik `K1-B7`: obie muszą brać wartości
                    z `RPE_WARTOSCI` i w żadnej nie wolno podstawić wartości z góry.
                    ⛔ To jest KONTRAKT DLA PASA D3, wypisany w nocie K1. */}
                <View style={styles.pytanieOdpowiedzi}>
                  {RPE_WARTOSCI.map((r) => (
                    <TouchableOpacity
                      key={r}
                      disabled={leci}
                      style={[styles.pytanieBtn, rpeWybrane === r && styles.pytanieBtnWybrany]}
                      onPress={() => setRpeWybrane(r)}
                    >
                      <Text style={[styles.pytanieBtnTxt, rpeWybrane === r && styles.pytanieBtnTxtWybrany]}>{String(r)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.pytanieBtn} disabled={leci} onPress={() => zapiszSzczegolyOceny(p)}>
                  <Text style={styles.pytanieBtnTxt}>{ZAPISZ_SZCZEGOL}</Text>
                </TouchableOpacity>
                {/* ⚠️ Błąd zapisu meczu stoi PRZY tym przycisku, nie na górze
                    arkusza — inaczej zawodnik nie połączy go z ruchem, który
                    przed chwilą wykonał (O61). */}
                {toMecz && bladMeczu !== null
                  ? <Text style={styles.pytanieBlad}>{bladMeczu}</Text>
                  : null}
                <Text style={styles.licznikPodpis}>{RESZTA_DOBROWOLNA}</Text>
              </View>
            ) : null}
            {otwarty(k.id) && k.id === 'bol' ? (
              <View>
                {/* ⛔ ZERO NOWYCH BRZMIEŃ MIEJSC BÓLU — `BODY_LOCATIONS`
                    z `lib/labels.ts` jest w produkcie od dawna i to ten sam
                    słownik, którym opisuje je Dziennik i wgląd WT-25. */}
                <View style={styles.pytanieOdpowiedzi}>
                  {BODY_LOCATIONS.map(([id, napis]) => (
                    <TouchableOpacity
                      key={id}
                      disabled={leci}
                      style={[styles.pytanieBtn, bolMiejsce === id && styles.pytanieBtnWybrany]}
                      onPress={() => setBolMiejsce(bolMiejsce === id ? null : id)}
                    >
                      <Text style={[styles.pytanieBtnTxt, bolMiejsce === id && styles.pytanieBtnTxtWybrany]}>{napis}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* ═══════════════════════════════════════════════════════
                    ⭐⭐ PAS B1 21.08.2026 — PYTANIE O NATĘŻENIE BÓLU. WPROST.

                    ⛔ CZEGO TU NIE BYŁO DO 21.08.2026: tego pytania. Zawodnik
                    zaznaczał miejsce, a produkt sam dopisywał natężenie —
                    z pytania o ciężkość sesji (`rpeWybrane`) albo z wartości
                    domyślnej 1. Liczba wracała do niego jako `fakt_o_tobie`,
                    czyli jako pomiar jego ciała, i szła do raportu dla rodzica.

                    ⭐ POKAZUJE SIĘ DOPIERO PO ZAZNACZENIU MIEJSCA i to jest
                    decyzja o koszcie uwagi: zawodnikowi, którego nic nie boli,
                    nie zadajemy pytania o to, jak mocno. Koszt na ekranie
                    przy braku bólu: 0 dp.

                    ⛔ ANI JEDNA WARTOŚĆ NIE JEST ZAZNACZONA Z GÓRY (Z6).
                    Zaznaczenie bierze się WYŁĄCZNIE z `bolNatezenie`, które
                    startuje z `bolNatezeniePoczatkowe()`, czyli z pustki.
                    ⛔ Nie ma tu suwaka i nie będzie: suwak ma uchwyt, uchwyt
                    gdzieś stoi, a to „gdzieś" jest liczbą podpowiedzianą —
                    przy bólu najgorszą z możliwych.

                    ⭐ K4 — LICZBA STOI NA PRZYCISKU, więc kto nie rozróżnia
                    barw, czyta dokładnie to samo: wyróżnienie wybranej wartości
                    niesie kolor ORAZ ten sam napis, który niesie wartość. */}
                {bolMiejsce === null ? null : (
                  <>
                    <Text style={styles.licznikPodpis}>{POLE_BOL_NATEZENIE}</Text>
                    {/* ⭐ ZDANIE STOI PRZED PRZYCISKIEM ZAPISU, nie po nieudanym
                        zapisie. ⛔ Hamulec bez drogi wyjścia jest odmową; ten
                        mówi, czego brakuje i ile to kosztuje (jedno dotknięcie),
                        zanim zawodnik cokolwiek naciśnie. */}
                    {bolNatezenie === null
                      ? <Text style={styles.licznikPodpis}>{BOL_BEZ_NATEZENIA}</Text>
                      : null}
                    <View style={styles.pytanieOdpowiedzi}>
                      {BOL_WARTOSCI.map((b) => (
                        <TouchableOpacity
                          key={b}
                          disabled={leci}
                          style={[styles.pytanieBtn, bolNatezenie === b && styles.pytanieBtnWybrany]}
                          onPress={() => setBolNatezenie(b)}
                        >
                          <Text style={[styles.pytanieBtnTxt, bolNatezenie === b && styles.pytanieBtnTxtWybrany]}>{String(b)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
                <TouchableOpacity style={styles.pytanieBtn} disabled={leci} onPress={() => zapiszSzczegolyOceny(p)}>
                  <Text style={styles.pytanieBtnTxt}>{ZAPISZ_SZCZEGOL}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {otwarty(k.id) && k.id === 'powod' ? (
              <View>
                {/* ⛔ TO JEST OFERTA, NIE WARUNEK ZAPISU. Werdykt „nie odbyło się"
                    leży już w bazie i zostanie tam, choćby zawodnik nie dotknął
                    ani jednego z tych przycisków. Prośba o powód jako warunek
                    byłaby konfrontacją (M1) i obniżałaby wypełnialność u tych,
                    którzy odpadają najbardziej. */}
                <View style={styles.pytanieOdpowiedzi}>
                  {POWODY_NIEOBECNOSCI.map((r) => (
                    <TouchableOpacity
                      key={r}
                      disabled={leci}
                      style={[styles.pytanieBtn, powodWybrany === r && styles.pytanieBtnWybrany]}
                      onPress={() => { setPowodWybrany(r); odpowiedzNaWystapienie(p, p.stan.rodzaj === 'odpowiedziane' ? p.stan.werdykt : 'nie_odbylo_sie', r); }}
                    >
                      <Text style={[styles.pytanieBtnTxt, powodWybrany === r && styles.pytanieBtnTxtWybrany]}>{POWOD_NAPIS[r]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.licznikPodpis}>{rozstrzygnijPowod(powodWybrany).powod}</Text>
              </View>
            ) : null}
          </View>
        ))}
        {/* ⭐ D6 — ŚCIEŻKA USUNIĘCIA ALBO ZDANIE, DLACZEGO JEJ NIE MA. ⛔ Nigdy
            wyszarzony przycisk: przycisk, który nic nie robi, uczy, że dotykanie
            nic nie daje, i psuje wszystkie pozostałe. */}
        {usuniecie.jest ? (
          <TouchableOpacity style={styles.pytanieBtn} disabled={leci} onPress={() => zdejmijZPlanu(p)}>
            <Text style={styles.pytanieBtnTxt}>{ZDEJMIJ_Z_PLANU}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.licznikPodpis}>{BEZ_USUNIECIA}</Text>
        )}
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-A1 18.08.2026 — TEN SAM RENDER, NOWE MIEJSCE (A2).
  //
  // ⚠️ CO SIĘ TU ZMIENIŁO I DLACZEGO. Do 18.08.2026 ta funkcja była wołana
  // WEWNĄTRZ karty kalendarza, pod przełącznikiem, pod listą dnia i nad
  // trzema licznikami. Miara `lib/wysokoscEkranu.ts` postawiła pytanie
  // „ZROBIŁEŚ?" na 4 663 dp od górnej krawędzi — pięć i pół ekranu
  // przewijania. Silnik był gotowy i podłączony (`lib/ocenaZKafla.ts`,
  // `krokiOceny`, `sciezkaUsuniecia`, `rozstrzygnijPowod`), a mimo to
  // `session_verdicts` miało JEDEN wiersz w całej bazie.
  //
  // ⛔ SILNIK NIE ZOSTAŁ TKNIĘTY — `lib/ocenaZKafla.ts` nie ma w tym pasie
  // ani jednej zmiany. Zmieniło się WYŁĄCZNIE miejsce wywołania: z karty
  // NA ekranie → do `<Arkusz>` NAD ekranem. To jest przeniesienie, nie budowa.
  //
  // ⭐ JEDEN ARGUMENT, DWA WEJŚCIA. `renderPytaniaOWystapienia()` bez
  // argumentu rysuje WSZYSTKO, co czeka („Bez oceny: 3 rzeczy"); z kluczem
  // rysuje DOKŁADNIE JEDNĄ rzecz — tę, której kafel zawodnik dotknął.
  // ⛔ To jest ten sam kod i ten sam filtr; druga kopia znaczyłaby, że kafel
  // i wiersz zbiorczy mogą po cichu zacząć pytać o co innego.
  // ═══════════════════════════════════════════════════════════════════
  function renderPytaniaOWystapienia(tylkoKlucz?: string) {
    if (pytania === null) return null;

    // ⛔ ZAKAZ 6, GAŁĄŹ AWARII — STOI PRZED KAŻDYM `return null`, żeby nie
    // dało się jej wyciszyć wcześniejszym wyjściem z funkcji. To jest ta
    // sama pułapka, którą asercja `(F1-3)` pilnuje przy stanie `nie_policzony`.
    if (pytania.rodzaj === 'nie_wiem') {
      const pustka = rozpoznajPustke({
        maWpisy: false,
        planLekcjiZnany: null,
        moznaZapisywac,
        zakres: 'dzis',
        odczytUdanySie: false,
      });
      console.warn(`dzis: [PLAN-D-D2] nie wiem, o co pytać — ${pytania.powod}`);
      if (pustka === null) return null;
      return (
        <View style={styles.licznikCzesc}>
          <Text style={styles.odpowiedzNaglowek}>{PYTANIE_NAGLOWEK}</Text>
          <Text style={styles.licznikBrakPodstawy}>{pustka.tekst}</Text>
          <Text style={styles.licznikPodpis}>{pustka.cta}</Text>
        </View>
      );
    }

    // ⛔ PRAWDZIWA PUSTKA — nic nie rysujemy. Zdanie „nie mam o co zapytać"
    // jest prawdziwe i bezwartościowe: zawodnik nie ma z nim co zrobić.
    if (pytania.rodzaj !== 'pytania') return null;

    const doNarysowania = tylkoKlucz === undefined
      ? pytania.pytania
      : pytania.pytania.filter((p) => p.klucz === tylkoKlucz);
    // ⛔ NIE OTWIERAMY PUSTEGO OKNA. Rzecz mogła zostać oceniona w międzyczasie
    // — wtedy arkusz mówi to wprost, zamiast pokazywać puste miejsce.
    if (doNarysowania.length === 0) {
      return <Text style={styles.cardBody}>{ARKUSZ_JUZ_OCENIONE}</Text>;
    }

    return (
      <View style={styles.licznikCzesc}>
        <Text style={styles.odpowiedzNaglowek}>{PYTANIE_NAGLOWEK}</Text>
        {doNarysowania.map((p) => {
          const wybrane = p.stan.rodzaj === 'odpowiedziane' ? p.stan.werdykt : null;
          const leci = zapisWerdyktu === p.klucz;
          const mecz = faktyPozycji(p.idWydarzenia).eventType === 'match';
          return (
            <View key={p.klucz} style={styles.pytanieWiersz}>
              {/* ⭐ ZDANIE PYTAJĄCE — rozstrzyga je `lib/pytanieOWystapienie.ts`,
                  nie ten plik. */}
              <Text style={styles.licznikLiczba}>{p.zdanie}</Text>
              {/* ⛔ PLAN-D-K1 — TA LISTA MA ZOSTAĆ DWUELEMENTOWA I TO JEST JAWNA
                  DECYZJA (D7). To są wartości `WartoscWerdyktu` — tego, co
                  ZAWODNIK może o sobie powiedzieć — a nie `StanWykonania`.
                  Piąta wartość stanu (`odwolane`) jest FAKTEM O PLANIE i ⛔ NIE
                  WOLNO jej tu dokładać: przycisk „Odwołane" prosiłby zawodnika,
                  żeby oświadczył coś, czego nie zrobił i czego nie wie. */}
              <View style={styles.pytanieOdpowiedzi}>
                {(['odbylo_sie', 'nie_odbylo_sie'] as const).map((w) => (
                  <TouchableOpacity
                    key={w}
                    // ⛔ `disabled` WYŁĄCZNIE na czas zapisu TEGO wystąpienia.
                    // Przycisk wyszarzony na stałe uczy, że klikanie nic nie daje.
                    disabled={leci}
                    style={[styles.pytanieBtn, wybrane === w && styles.pytanieBtnWybrany]}
                    onPress={() => odpowiedzNaWystapienie(p, w)}
                  >
                    {/* ⛔ BRZMIENIE ISTNIEJĄCE, NIE NOWE — `PLAKIETKI_STANU_PRZESZLEGO`
                        z pasa C1/D1, użyte co do znaku. */}
                    <Text style={[styles.pytanieBtnTxt, wybrane === w && styles.pytanieBtnTxtWybrany]}>
                      {PLAKIETKI_STANU_PRZESZLEGO[w]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* ⭐ PLAN-D-O1 — trzy kroki zwinięte pod odpowiedzią, wszystkie
                  dobrowolne. ⛔ Zawodnik, który zamknie arkusz po pierwszym
                  dotknięciu, zostawia po sobie ODPOWIEDŹ, nie porzucony formularz. */}
              {renderKrokiOceny(p)}
              {/* ⭐ DECYZJA KUBY 18.08 (M1 §3) — RESZTA PYTAŃ O MECZ MA WEJŚCIE
                  Z TEGO SAMEGO KAFLA. ⛔ To wejście musiało powstać ZANIM zniknęła
                  zakładka „Mecz": do 18.08 `app/(tabs)/mecz.tsx` (961 linii) miał
                  ZERO `router.push('/mecz')` w całym repozytorium, więc zdjęcie
                  zakładki skasowałoby jedyne wejście do `match_contexts`. */}
              {mecz ? (
                <TouchableOpacity
                  style={styles.inlineLink}
                  onPress={() => setArkusz({
                    rodzaj: 'meczWiecej', tytul: p.tytul, klucz: p.klucz, idWydarzenia: p.idWydarzenia, dzien: null,
                  })}
                >
                  <Text style={styles.cardAction}>{MECZ_WIECEJ_OTWORZ}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
        {/* ⚠️ Błąd zapisu stoi PRZY pytaniu, nie na górze karty. Bez tego
            zawodnik nie połączyłby go z przyciskiem, który przed chwilą
            dotknął — a zapis odrzucony przez RLS wygląda jak sukces (O61). */}
        {bladWerdyktu !== null
          ? <Text style={styles.pytanieBlad}>{bladWerdyktu}</Text>
          : null}
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-A1 — CO ARKUSZ MA W ŚRODKU
  // ═══════════════════════════════════════════════════════════════════
  const pytaniaLista: readonly Pytanie[] =
    pytania !== null && pytania.rodzaj === 'pytania' ? pytania.pytania : [];
  /** ⛔ „Bez oceny" to `pytam`, nie „wszystkie" — odpowiedziane już nie proszą. */
  const bezOceny = pytaniaLista.filter((p) => p.stan.rodzaj === 'pytam');
  /**
   * ⭐ DZIEŃ, O KTÓRY PYTA ŚCIEŻKA „+", BIERZE SIĘ Z PYTAŃ — nie z arytmetyki
   * dat na ekranie. ⛔ To nie jest wygoda: okno „wczoraj i dziś" jest REGUŁĄ
   * (`lib/pytanieOWystapienie.ts`) i druga jego kopia tutaj rozjechałaby się
   * z pierwszą przy pierwszej poprawce — a ekran nadal wyglądałby poprawnie.
   * `kiedy` przychodzi z reguły; ten plik go tylko CZYTA.
   */
  const wczorajszeBezOceny = bezOceny.filter((p) => p.kiedy === 'wczoraj');
  /**
   * ⛔ TRZY WARTOŚCI, NIE DWIE (R5). `null` znaczy „NIE ODCZYTALIŚMY pytań",
   * pusta tablica — „odczytaliśmy i nic tam nie ma". Sklejenie ich kazałoby
   * produktowi twierdzić, że dzień był pusty, o dniu, którego nie sprawdził (Z0).
   */
  const nieocenioneWczoraj: PozycjaBezOceny[] | null =
    pytania === null || pytania.rodzaj === 'nie_wiem'
      ? null
      : wczorajszeBezOceny.map((p) => ({
        idWydarzenia: p.idWydarzenia, tytul: p.tytul, godzina: p.godzina,
      }));
  /**
   * ⭐ A5 — BRAMKA ŚCIEŻKI „+". Decyzja jest CZYSTĄ FUNKCJĄ
   * (`lib/dodanieWstecz.ts`), ten ekran ją WYKONUJE.
   */
  const stanDodania = sprawdzPrzedDodaniem({
    data: wczorajszeBezOceny[0]?.dzien ?? null,
    dzis: dzisNapis ?? '',
    nieocenione: nieocenioneWczoraj,
  });
  console.log(`dzis: [A5] ${stanDodania.powod}`);

  const naglowekOtwartego = arkusz === null ? null : naglowekArkusza(
    arkusz.rodzaj,
    arkusz.rodzaj === 'ocena'
      ? (pytaniaLista.find((q) => q.klucz === arkusz.klucz)?.tytul ?? '')
      : arkusz.rodzaj === 'meczWiecej' ? arkusz.tytul : '',
  );

  /**
   * ⭐ WYJŚCIE ZE ŚCIEŻKI „+" DO KALENDARZA — I JEDYNE MIEJSCE, W KTÓRYM
   * pada zdanie „wolno utworzyć nowe wydarzenie". ⛔ Bramka jest wołana
   * ZAWSZE, także w gałęzi „nie wiemy" — inaczej byłaby ozdobą.
   */
  function przejdzDoDodania(odpowiedz: OdpowiedzNaKolizje, powod: PowodDodania) {
    const brama = wolnoUtworzycWydarzenie(stanDodania, odpowiedz);
    console.log(`dzis: [A5] wolno utworzyć = ${brama.wolno} — ${brama.powod}`);
    if (!brama.wolno) return;
    // ⭐⭐ PAS K1 21.08.2026 — TRASA NIESIE ODPOWIEDŹ, KTÓRĄ ZAWODNIK WŁAŚNIE DAŁ.
    // ⛔ CO BYŁO ZEPSUTE: stało tu czyste `router.push('/kalendarz')`. Produkt
    // przed sekundą zapytał „już się odbyło czy dopiero będzie", dostał
    // odpowiedź — i wyrzucał zawodnika na zakładkę „Tydzień", na której nie
    // ma formularza, każąc mu wpisać tę samą datę ręcznie.
    const start = dataStartowa({
      powod,
      dzienPytania: stanDodania.rodzaj === 'pytamy' ? stanDodania.data : null,
      dzis: dzisNapis ?? '',
    });
    console.log(`dzis: [K1] data startowa — ${start.powod}`);
    const trasa = trasaDodania({ data: start.data === '' ? null : start.data, skad: SKAD_PLUS });
    setArkusz(null);
    router.push({ pathname: trasa.pathname as '/kalendarz', params: trasa.params });
  }

  /**
   * ⭐⭐ PAS K1 21.08.2026 (§3.5) — „MECZ — JUŻ GO ZAGRAŁEM".
   *
   * ⛔ TO JEST TA JEDNA DECYZJA KUBY Z 21.08. Zmierzone: JEDYNE wejście do
   * pełnej karty meczu prowadzi Z KAFLA, a kafel bierze się z wydarzenia —
   * więc meczu, którego zawodnik nie zaplanował, NIE DAŁO SIĘ zapisać inaczej
   * niż zakładając mu najpierw wydarzenie w kalendarzu. Zawodnik po meczu ma
   * w głowie „grałem 60 minut, było ciężko", nie „muszę utworzyć wydarzenie".
   *
   * ⛔⛔ TA FUNKCJA NIE DOTYKA BAZY I NIE MA PRAWA JEJ DOTKNĄĆ. Otwiera arkusz
   * i nic więcej. Wydarzenie powstaje DOPIERO w `zapiszMeczBezPlanu`, przy
   * dotknięciu „Zapisz" — bo wydarzenie założone i porzucone jest meczem,
   * którego nie było, a liczy się jako zobowiązanie (3 punkty; Z0 i N1 naraz).
   */
  function otworzMeczBezPlanu() {
    const brama = wolnoUtworzycWydarzenie(stanDodania, { rodzaj: 'inna_rzecz' });
    console.log(`dzis: [A5] wolno utworzyć = ${brama.wolno} — ${brama.powod}`);
    if (!brama.wolno) return;
    const start = dataStartowa({
      powod: 'juz_sie_odbylo',
      dzienPytania: stanDodania.rodzaj === 'pytamy' ? stanDodania.data : null,
      dzis: dzisNapis ?? '',
    });
    console.log(`dzis: [K1] mecz bez planu — ${start.powod}`);
    // ⛔ NOWY DRAFT ZNACZY NOWY DRAFT: żadnego wydarzenia z poprzedniego
    // podejścia, żadnych minut z poprzedniej oceny.
    setWydarzenieBezPlanu(null);
    setBladMeczu(null);
    setZapisanoMecz(null);
    setMinutyNaBoisku(null);
    setDlugoscMeczu(null);
    setRpeWybrane(rpePoczatkowe());
    setWiecejOMeczu(PUSTE_WIECEJ_O_MECZU);
    setArkusz({
      rodzaj: 'meczWiecej',
      tytul: MECZ_BEZ_PLANU_TYTUL,
      klucz: KLUCZ_MECZU_BEZ_PLANU,
      idWydarzenia: null,
      dzien: start.data === '' ? null : start.data,
    });
  }

  /**
   * ⭐⭐ PAS K1 21.08.2026 (§3.5 wymagania 2, 5 i 6) — JEDEN ZAPIS, DWA WIERSZE,
   * W TEJ KOLEJNOŚCI I DOPIERO TERAZ.
   *
   * ⛔ CO POWSTAJE W BAZIE I KIEDY — dokładnie, bo to jest najważniejsze
   * zdanie tej ścieżki:
   *   • do chwili dotknięcia „Zapisz": ⛔ NIC. Zero wierszy, zero punktów.
   *     Wyjście z arkusza w połowie zostawia bazę w stanie sprzed „+".
   *   • przy dotknięciu „Zapisz": najpierw JEDEN wiersz `calendar_events`
   *     (`event_type='match'`, `source='player'`, `status='completed'`,
   *     `title='Mecz'`, `scheduled_date` = dzień z WYBORU zawodnika),
   *     zaraz po nim JEDEN wiersz `match_contexts` związany z tamtym przez
   *     `calendar_event_id`.
   *   • przy PONOWNYM dotknięciu po nieudanym zapisie oceny: ⛔ wydarzenie
   *     NIE powstaje drugi raz (`czyWolnoZalozycWydarzenie` je pamięta),
   *     dokładamy wyłącznie ocenę.
   *
   * ⛔ KOLEJNOŚĆ JEST WYMUSZONA, NIE WYBRANA: `match_contexts.calendar_event_id`
   * potrzebuje `id`, którego przed wstawieniem wydarzenia po prostu nie ma.
   * ⛔ NIEUDANE ZAŁOŻENIE WYDARZENIA MA WŁASNE ZDANIE i NIE UDAJE, że ocena
   * się zapisała — to jest wymaganie 6, wprost.
   */
  async function zapiszMeczBezPlanu(dzien: string | null): Promise<void> {
    if (!currentUser) return;
    setBladMeczu(null);
    if (!toDataPoprawna(dzien)) { setBladMeczu(MECZ_BEZ_PLANU_BEZ_DNIA); return; }

    let idWydarzenia = wydarzenieBezPlanu;
    const brama = czyWolnoZalozycWydarzenie({
      chwila: 'dotkniecie_zapisu', maJuzWydarzenie: wydarzenieBezPlanu,
    });
    console.log(`dzis: [K1] ${brama.powod}`);
    if (brama.wolno) {
      const decyzja = decyzjaZalozeniaWydarzenia({ idZawodnika: currentUser.id, data: dzien });
      console.log(`dzis: [K1] ${opisZalozeniaDoLogu(decyzja)}`);
      if (decyzja.rodzaj === 'nie_zakladaj') { setBladMeczu(decyzja.zdanie); return; }
      const { data: wstawione, error: bladW } = await supabase
        .from('calendar_events').insert(decyzja.wiersz).select('id');
      if (bladW) {
        setBladMeczu(toJestBrakDostepu(bladW)
          ? ZAPIS_ODRZUCONY_BRAK_DOSTEPU : MECZ_BEZ_PLANU_NIE_ZALOZYLEM);
        return;
      }
      // ⚠️ O61 — ZERO WIERSZY BEZ BŁĘDU TO PORAŻKA. Zapis odrzucony przez RLS
      // wraca jako sukces z pustą listą i wygląda dokładnie jak zapisany wiersz.
      const nowe = Array.isArray(wstawione) && wstawione.length > 0 ? Number(wstawione[0].id) : null;
      if (nowe === null || !Number.isFinite(nowe)) {
        setBladMeczu(MECZ_BEZ_PLANU_NIE_ZALOZYLEM);
        console.warn('[PLAN-D-K1] insert calendar_events dotknął ZERO wierszy — najpewniej RLS.');
        return;
      }
      idWydarzenia = nowe;
      setWydarzenieBezPlanu(nowe);
    }
    if (idWydarzenia === null) { setBladMeczu(MECZ_BEZ_PLANU_NIE_ZALOZYLEM); return; }

    // ⭐ OCENA IDZIE TĄ SAMĄ DROGĄ, CO Z KAFLA. ⛔ Druga droga zapisu meczu
    // znaczyłaby drugą regułę „wstaw czy dołóż" — a licznik pracy liczyłby
    // ten sam mecz tyle razy, ile dróg do niego prowadzi.
    const udalo = await zapiszKontekstMeczu(KLUCZ_MECZU_BEZ_PLANU, idWydarzenia, idWydarzenia);
    if (!udalo) {
      // ⛔ WYDARZENIE JUŻ STOI, OCENA NIE WESZŁA — i zawodnik ma to usłyszeć
      // wprost, zamiast zobaczyć „zapisano" nad pustym wierszem (R5).
      // ⚠️ `zapiszKontekstMeczu` mogło już ustawić własne, dokładniejsze zdanie
      // (np. o braku dostępu) — wtedy go nie nadpisujemy.
      setBladMeczu((poprzednie) => poprzednie ?? MECZ_BEZ_PLANU_OCENA_NIE_WESZLA);
      return;
    }
    // ⭐ §3.5 wymaganie 4 — ZAWODNIK DOWIADUJE SIĘ, CO SIĘ STAŁO. Jedno zdanie,
    // zero oceny meczu, zero liczenia dni z rzędu (N1, N3).
    // ⚠️ BRZMIENIE DO PRZEJRZENIA PRZEZ KUBĘ (B3) — stoi w `lib/drogaDodania.ts`.
    // ⛔ ZDANIE STOI W ARKUSZU, NIE NA EKRANIE — i to nie jest wygoda: banerek
    // na ekranie „Dziś" byłby ósmą rzeczą w pomiarze i przestawiłby zapadkę
    // ekranu, którego ten pas nie odchudza (791 dp). Arkusz kosztuje 0 dp,
    // a zawodnik i tak w nim stoi w chwili, w której to zdanie ma przeczytać.
    // (`zapisanoMecz` ustawia `zapiszKontekstMeczu`; arkusz to czyta niżej.)
    await load();
  }

  function trescArkusza() {
    if (arkusz === null) return null;

    // ⭐ JEDEN KAFEL — DOKŁADNIE JEDNA RZECZ DO OCENY.
    if (arkusz.rodzaj === 'ocena') return <>{renderPytaniaOWystapienia(arkusz.klucz)}</>;

    // ⭐ WSZYSTKO, CO CZEKA — wejście z wiersza „Bez oceny: N rzeczy".
    // ⛔ Wywołanie BEZ ARGUMENTU jest tym samym renderem, nie drugą kopią.
    if (arkusz.rodzaj === 'oceny') return <>{renderPytaniaOWystapienia()}</>;

    // ═══════════════════════════════════════════════════════════════
    // ⭐⭐ PAS W1 (D-1, decyzja D-B) — CAŁY MATERIAŁ JEDNEJ ODPOWIEDZI.
    //
    // ⛔ TO NIE JEST DRUGA KOPIA TREŚCI. Dokładnie te same producenty
    // (`glos`, `pozycjeNaDzis[0]`, `odpowiedz.coToZmieni`, `kolejka.niepelna`,
    // `renderTrescZawszeWidoczna`) — tylko narysowane W CAŁOŚCI, w miejscu,
    // które nie kosztuje ani jednego dp ekranu.
    //
    // CO STĄD ZESZŁO Z EKRANU „DZIŚ" (zmierzone 18.08.2026 przed pasem):
    //   • pełna `<PozycjaKolejkiCard pierwsza>` z rozwiniętym „skąd to wiemy" — 215 dp
    //   • część „CO TO ZMIENI" z dowodem i źródłem                            —  80 dp
    //   • zdanie „ta lista jest niepełna"                                     —  35 dp
    //   • treść ZAWSZE WIDOCZNA (granice bezpieczeństwa)                      —  91 dp
    //   • karta głosu tygodnia                                                —  21 dp
    // ⛔ Żadna z nich nie zniknęła. Wszystkie są tutaj, o jedno dotknięcie.
    // ═══════════════════════════════════════════════════════════════
    if (arkusz.rodzaj === 'material') {
      return (
        <>
          {pokazacKarte(glos) && glos.rodzaj === 'glos' ? (
            <View style={styles.odpowiedzCzesc}>
              <Text style={styles.odpowiedzNaglowek}>{glos.tytul}</Text>
              <Text style={styles.glosTresc}>{glos.tresc}</Text>
            </View>
          ) : null}
          {pozycjeNaDzis.length > 0 ? (
            <PozycjaKolejkiCard
              pozycja={pozycjeNaDzis[0]}
              pierwsza
              pokazacDlaczego={false}
              dzis={dane === null ? null : dane.wejscia.dzis}
              onPress={TRASA_POZYCJI[pozycjeNaDzis[0].skadToWiemy.klucz]
                ? () => { setArkusz(null); router.push(TRASA_POZYCJI[pozycjeNaDzis[0].skadToWiemy.klucz]); }
                : undefined}
            />
          ) : null}
          {/* ⭐ CZĘŚĆ 2: DLACZEGO AKURAT TO — nazwana, tak jak od pasa T.
              ⛔ Na ekranie stoi SAMO ZDANIE (D-1: dwa zdania, 118 dp);
              NAZWA części stoi tutaj, razem z resztą materiału. */}
          {pozycjeNaDzis.length > 0 && pozycjeNaDzis[0].dlaczego !== null ? (
            <View style={styles.odpowiedzCzesc}>
              <Text style={styles.odpowiedzNaglowek}>{NAGLOWEK_DLACZEGO}</Text>
              <Text style={styles.odpowiedzDlaczego}>{pozycjeNaDzis[0].dlaczego}</Text>
            </View>
          ) : null}
          {/* ⭐ CZĘŚĆ 3: CO TO ZMIENI — TYLKO Z DOWODEM I ŹRÓDŁEM. */}
          {odpowiedz.coToZmieni ? (
            <View style={styles.odpowiedzCzesc}>
              <Text style={styles.odpowiedzNaglowek}>{NAGLOWEK_CO_ZMIENI}</Text>
              <Text style={styles.odpowiedzDowod}>{odpowiedz.coToZmieni.tekst}</Text>
              <Text style={styles.hintSource}>{odpowiedz.coToZmieni.zrodlo}</Text>
            </View>
          ) : null}
          {kolejka !== null && (kolejka.niepelna || (wglady !== null && wglady.niepelna)) ? (
            <Text style={styles.kolejkaNiepelna}>{KOLEJKA_NIEPELNA}</Text>
          ) : null}
          {renderTrescZawszeWidoczna()}
        </>
      );
    }

    if (arkusz.rodzaj === 'meczWiecej') {
      // ⭐⭐ PLAN-D-D8 18.08.2026 — POLA, KTÓRE NAPRAWDĘ ZAPISUJĄ.
      // ⚠️ PLAN-D-M3 21.08.2026: było ich sześć, jest SIEDEM (doszedł rodzaj
      // meczu). ⛔ Liczba NIE JEST tu wpisana: pilnuje jej strażnik
      // `lib/meczWiecej.selftest.ts`, porównując `POLA_ARKUSZA`
      // z `rzeczyMeczu('arkusz_wiecej')` na RÓWNOŚĆ, razem z kolejnością.
      // ⛔ Do dziś ten arkusz wypisywał sześć NAPISÓW i odsyłał do pełnej karty
      // meczu. Napis, który nic nie zapisuje, jest obietnicą, nie funkcją (R1).
      const klaczM = arkusz.klucz;
      // ⭐⭐ PLAN-D-D2 — wystąpienie, z którego ten arkusz został otwarty.
      // ⭐⭐ PAS K1 21.08.2026 — `null` znaczy „MECZ, KTÓREGO NIE BYŁO W PLANIE":
      // wystąpienia jeszcze NIE MA i nie powstanie przed dotknięciem „Zapisz".
      const wydarzenieM = arkusz.idWydarzenia;
      const bezPlanu = wydarzenieM === null;
      const dzienM = arkusz.dzien;
      const dzisM = dzisNapis ?? '';
      const wczorajM = dzisM === '' ? null : przesunDzien(dzisM, -1);
      const ustaw = (zmiana: Partial<WiecejOMeczu>) =>
        setWiecejOMeczu((poprzednie) => ({ ...poprzednie, ...zmiana }));
      const liczbaZPola = (t: string): number | null => {
        const oczyszczone = t.replace(/[^0-9]/g, '');
        // ⛔ Puste pole to „nie podał", a nie zero — inaczej każdy mecz, którego
        // wyniku zawodnik nie pamięta, zapisałby się jako 0:0 (R5).
        if (oczyszczone === '') return null;
        return Number(oczyszczone);
      };
      return (
        <>
          {/* ═══════════════════════════════════════════════════════════
              ⭐⭐ PAS K1 21.08.2026 (§3.5) — DWA WEJŚCIA, JEDEN ARKUSZ.
              ⛔ Z KAFLA (`bezPlanu === false`) arkusz jest tym, czym był:
              pytaniami, których nie ma w ocenie. Ze ścieżki
              „+ → już się odbyło → Mecz" (`bezPlanu === true`) niesie
              dodatkowo to, czego z kafla nie trzeba pytać, bo kafel to wie:
              KTÓREGO DNIA był mecz i ILE go było.
              ⛔ Podpis mówi WPROST, że wydarzenia jeszcze nie ma — zawodnik
              ma wiedzieć, że nic się nie stanie bez jego dotknięcia (B3).
              ═══════════════════════════════════════════════════════════ */}
          {bezPlanu ? (
            <>
              <Text style={styles.cardBody}>{MECZ_BEZ_PLANU_PODPIS}</Text>

              {/* ⛔ DZIEŃ Z WYBORU ZAWODNIKA, NIE ZE ZGADYWANIA (§3.5 wym. 7).
                  Dwa dni to okno, którym produkt już pyta o wystąpienia
                  (`lib/pytanieOWystapienie.ts`: „wczoraj i dziś") — ⛔ nie
                  wymyślam tu trzeciego zakresu. Mecz sprzed tygodnia ma
                  uczciwe wyjście: wiersz niżej, prowadzący do Kalendarza. */}
              <Text style={styles.licznikPodpis}>{MECZ_BEZ_PLANU_KTORY_DZIEN}</Text>
              <View style={styles.pytanieOdpowiedzi}>
                {[[MECZ_DZIEN_WCZORAJ, wczorajM] as const, [MECZ_DZIEN_DZIS, dzisM] as const]
                  .filter(([, d]) => toDataPoprawna(d))
                  .map(([napis, d]) => (
                    <TouchableOpacity
                      key={napis}
                      style={[styles.pytanieBtn, dzienM === d && styles.pytanieBtnWybrany]}
                      onPress={() => setArkusz({
                        rodzaj: 'meczWiecej', tytul: MECZ_BEZ_PLANU_TYTUL,
                        klucz: KLUCZ_MECZU_BEZ_PLANU, idWydarzenia: null, dzien: d,
                      })}
                    >
                      <Text style={[styles.pytanieBtnTxt, dzienM === d && styles.pytanieBtnTxtWybrany]}>{napis}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
              <TouchableOpacity
                style={styles.inlineLink}
                onPress={() => {
                  const trasa = trasaDodania({ rodzaj: RODZAJ_MECZ, data: dzienM, skad: SKAD_PLUS });
                  setArkusz(null);
                  router.push({ pathname: trasa.pathname as '/kalendarz', params: trasa.params });
                }}
              >
                <Text style={styles.cardAction}>{MECZ_BEZ_PLANU_INNY_DZIEN}</Text>
              </TouchableOpacity>

              {/* ⭐ TE SAME DWA BLOKI, CO W OCENIE Z KAFLA — jedna procedura,
                  nie druga kopia (`renderBlokMinutMeczu`). */}
              {renderBlokMinutMeczu(false)}

              <Text style={styles.licznikPodpis}>{POLE_RPE}</Text>
              {/* ⚠️ DRUGA KOPIA BLOKU RPE — świadoma i wypisana. Wyprowadzenie
                  go do wspólnej procedury zapala asercję w
                  `lib/pytanieOWystapienie.selftest.ts`, która wymaga
                  `RPE_WARTOSCI.map(` i `POLE_RPE` W CIELE `renderKrokiOceny`,
                  a to nie jest plik tego pasa. ⭐ Obie kopie pilnuje strażnik
                  `K1-B7`. ⛔ KONTRAKT DLA PASA D3 — opisany w nocie K1.
                  ⛔ I tu też ANI JEDNA wartość nie jest zaznaczona z góry (Z6). */}
              <View style={styles.pytanieOdpowiedzi}>
                {RPE_WARTOSCI.map((r) => (
                  <TouchableOpacity
                    key={`bp-${r}`}
                    style={[styles.pytanieBtn, rpeWybrane === r && styles.pytanieBtnWybrany]}
                    onPress={() => setRpeWybrane(r)}
                  >
                    <Text style={[styles.pytanieBtnTxt, rpeWybrane === r && styles.pytanieBtnTxtWybrany]}>{String(r)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.cardBody}>{podpisArkuszaMeczu('ocena_z_kafla')}</Text>
          )}
          <Text style={styles.licznikPodpis}>{MECZ_WIECEJ_DOBROWOLNE}</Text>

          {/* ⭐⭐ 1. RODZAJ MECZU — PLAN-D-M3 21.08.2026.
              ⛔ CO BYŁO ZŁE: ścieżka oceny z kafla wpisywała
              `RODZAJ_MECZU_Z_KAFLA = 'official_match'` NA SZTYWNO, więc
              zawodnik, który zagrał sparing, miał w bazie „Mecz oficjalny",
              a nikt go o rodzaj nie zapytał (złamanie Z0). Poprawienie tego
              kosztowało go CZTERY dotknięcia; od dziś kosztuje JEDNO.
              ⛔ ANI JEDNA WARTOŚĆ NIE JEST ZAZNACZONA Z GÓRY (Z6) — dotknięcie
              wybranej wartości drugi raz ODZNACZA ją, tak jak przy samoocenie.
              ⚠️ Koszt na ekranie: 0 dp — arkusz jest `Modal`-em. */}
          <Text style={styles.licznikPodpis}>{POLE_RODZAJ_MECZU}</Text>
          <View style={styles.pytanieOdpowiedzi}>
            {RODZAJE_MECZU.map((r) => (
              <TouchableOpacity
                key={`gt-${r.wartosc}`}
                style={[styles.pytanieBtn, wiecejOMeczu.rodzajMeczu === r.wartosc && styles.pytanieBtnWybrany]}
                onPress={() => ustaw({ rodzajMeczu: wiecejOMeczu.rodzajMeczu === r.wartosc ? null : r.wartosc })}
              >
                <Text style={[styles.pytanieBtnTxt, wiecejOMeczu.rodzajMeczu === r.wartosc && styles.pytanieBtnTxtWybrany]}>{r.napis}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 2. SAMOOCENA — ⛔ bez wartości zaznaczonej z góry. */}
          <Text style={styles.licznikPodpis}>{POLE_SAMOOCENA}</Text>
          <View style={styles.pytanieOdpowiedzi}>
            {SKALA_OCENY.map((n) => (
              <TouchableOpacity
                key={`sr-${n}`}
                style={[styles.pytanieBtn, wiecejOMeczu.samoocena === n && styles.pytanieBtnWybrany]}
                onPress={() => ustaw({ samoocena: wiecejOMeczu.samoocena === n ? null : n })}
              >
                <Text style={[styles.pytanieBtnTxt, wiecejOMeczu.samoocena === n && styles.pytanieBtnTxtWybrany]}>{String(n)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 3. STAN MENTALNY */}
          <Text style={styles.licznikPodpis}>{POLE_STAN_MENTALNY}</Text>
          <View style={styles.pytanieOdpowiedzi}>
            {SKALA_OCENY.map((n) => (
              <TouchableOpacity
                key={`ms-${n}`}
                style={[styles.pytanieBtn, wiecejOMeczu.stanMentalny === n && styles.pytanieBtnWybrany]}
                onPress={() => ustaw({ stanMentalny: wiecejOMeczu.stanMentalny === n ? null : n })}
              >
                <Text style={[styles.pytanieBtnTxt, wiecejOMeczu.stanMentalny === n && styles.pytanieBtnTxtWybrany]}>{String(n)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 4. WARUNKI — ⛔ trzy wartości, nie dwie: `null` znaczy „nie zapytaliśmy". */}
          <Text style={styles.licznikPodpis}>{POLE_WARUNKI}</Text>
          <View style={styles.pytanieOdpowiedzi}>
            {[[WARUNKI_NIE, false] as const, [WARUNKI_TAK, true] as const].map(([napis, wartosc]) => (
              <TouchableOpacity
                key={napis}
                style={[styles.pytanieBtn, wiecejOMeczu.wymagajaceWarunki === wartosc && styles.pytanieBtnWybrany]}
                onPress={() => ustaw({ wymagajaceWarunki: wiecejOMeczu.wymagajaceWarunki === wartosc ? null : wartosc })}
              >
                <Text style={[styles.pytanieBtnTxt, wiecejOMeczu.wymagajaceWarunki === wartosc && styles.pytanieBtnTxtWybrany]}>{napis}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 5. POZYCJA — ⛔ etykiety wyprowadzone z `positions.id`, nie przepisane. */}
          <Text style={styles.licznikPodpis}>{POLE_POZYCJA}</Text>
          <View style={styles.pytanieOdpowiedzi}>
            {POZYCJE_DO_WYBORU.map((poz) => (
              <TouchableOpacity
                key={poz}
                style={[styles.pytanieBtn, wiecejOMeczu.pozycja === poz && styles.pytanieBtnWybrany]}
                onPress={() => ustaw({ pozycja: wiecejOMeczu.pozycja === poz ? null : poz })}
              >
                <Text style={[styles.pytanieBtnTxt, wiecejOMeczu.pozycja === poz && styles.pytanieBtnTxtWybrany]}>{poz}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 6. WYNIK — dwie kolumny, nie jedna: `own_score` i `opponent_score`. */}
          <Text style={styles.licznikPodpis}>{POLE_WYNIK}</Text>
          <View style={styles.pytanieOdpowiedzi}>
            <TextInput
              style={styles.meczPoleWyniku}
              keyboardType="number-pad"
              placeholder={WYNIK_MY}
              placeholderTextColor={colors.textSecondary}
              value={wiecejOMeczu.bramkiMy === null ? '' : String(wiecejOMeczu.bramkiMy)}
              onChangeText={(t) => ustaw({ bramkiMy: liczbaZPola(t) })}
            />
            <TextInput
              style={styles.meczPoleWyniku}
              keyboardType="number-pad"
              placeholder={WYNIK_ONI}
              placeholderTextColor={colors.textSecondary}
              value={wiecejOMeczu.bramkiOni === null ? '' : String(wiecejOMeczu.bramkiOni)}
              onChangeText={(t) => ustaw({ bramkiOni: liczbaZPola(t) })}
            />
          </View>

          {/* 7. NOTATKA */}
          <Text style={styles.licznikPodpis}>{POLE_NOTATKA}</Text>
          <TextInput
            style={styles.meczNotatka}
            multiline
            placeholder={POLE_NOTATKA}
            placeholderTextColor={colors.textSecondary}
            value={wiecejOMeczu.notatka ?? ''}
            onChangeText={(t) => ustaw({ notatka: t })}
          />

          {/* ⛔⛔ TO JEST JEDYNE MIEJSCE, W KTÓRYM POWSTAJE WYDARZENIE MECZU
              BEZ PLANU. Otwarcie arkusza nie zapisuje NIC; wyjście w połowie
              zostawia bazę w stanie sprzed „+". Strażniki `K1-B8` i `K1-B9`
              pilnują obu połów tego zdania. */}
          <TouchableOpacity
            style={styles.pytanieBtn}
            onPress={() => (bezPlanu
              ? zapiszMeczBezPlanu(dzienM)
              : zapiszKontekstMeczu(klaczM, wydarzenieM))}
          >
            <Text style={styles.pytanieBtnTxt}>{bezPlanu ? MECZ_BEZ_PLANU_ZAPISZ : MECZ_WIECEJ_ZAPISZ}</Text>
          </TouchableOpacity>
          {bladMeczu !== null ? <Text style={styles.pytanieBlad}>{bladMeczu}</Text> : null}
          {bladMeczu === null && zapisanoMecz === klaczM
            ? (
              <Text style={styles.licznikPodpis}>
                {bezPlanu ? MECZ_BEZ_PLANU_ZAPISANY : MECZ_WIECEJ_ZAPISANO}
              </Text>
            )
            : null}
          {/* ⛔ CZEGO PRODUKT NIE UMIE ZAPISAĆ — imiennie, na ekranie.
              `match_contexts.match_length_minutes` NIE ISTNIEJE (zmierzone
              18.08.2026), więc arkusz mówi to zamiast pokazywać pole,
              które nic nie zapisze (Z0). */}
          {czegoNieUmiemyZapisac().map((r) => (
            <Text key={`brak-${r.kolumna}`} style={styles.licznikPodpis}>
              {MECZ_CZEKA_NA_KOLUMNE(r.napis)}
            </Text>
          ))}
          {/* ⛔ WEJŚCIE DO PEŁNEJ KARTY MECZU TYLKO PRZY MECZU Z PLANU.
              Pełna karta (`app/(tabs)/mecz.tsx`) opisuje mecz, który JUŻ MA
              wystąpienie; przy meczu bez planu wystąpienia jeszcze nie ma,
              więc ten wiersz prowadziłby donikąd — a wyjście donikąd jest
              napisem o wyjściu, nie wyjściem (WT-33). */}
          {bezPlanu ? null : (
            <TouchableOpacity
              style={styles.inlineLink}
              onPress={() => { setArkusz(null); router.push('/mecz'); }}
            >
              <Text style={styles.cardAction}>{MECZ_WIECEJ_WEJSCIE}</Text>
            </TouchableOpacity>
          )}
        </>
      );
    }

    if (arkusz.rodzaj === 'plus') {
      return (
        <>
          <TouchableOpacity
            style={styles.arkuszWybor}
            onPress={() => przejdzDoDodania({ rodzaj: 'inna_rzecz' }, 'dopiero_bedzie')}
          >
            <Text style={styles.cardLabel}>{PLUS_W_PRZYSZLOSCI}</Text>
            <Text style={styles.licznikPodpis}>{PLUS_W_PRZYSZLOSCI_PODPIS}</Text>
          </TouchableOpacity>
          {/* ⭐ A5 — „już się odbyło" NIE PROWADZI PROSTO DO FORMULARZA.
              Najpierw pytanie o nieocenione rzeczy z planu (`arkuszKolizja`
              z makiety v3), i dopiero po „nie" powstaje nowy wiersz. */}
          <TouchableOpacity style={styles.arkuszWybor} onPress={() => setArkusz({ rodzaj: 'kolizja' })}>
            <Text style={styles.cardLabel}>{PLUS_JUZ_SIE_ODBYLO}</Text>
            <Text style={styles.licznikPodpis}>{PLUS_JUZ_SIE_ODBYLO_PODPIS}</Text>
          </TouchableOpacity>
        </>
      );
    }

    // arkusz.rodzaj === 'kolizja'
    if (stanDodania.rodzaj === 'pytamy') {
      return (
        <>
          <Text style={styles.cardLabel}>{KOLIZJA_PYTANIE(stanDodania.pozycje.length)}</Text>
          <Text style={styles.cardBody}>{KOLIZJA_PODPYTANIE}</Text>
          {stanDodania.pozycje.map((poz) => {
            const p = bezOceny.find((q) => q.idWydarzenia === poz.idWydarzenia) ?? null;
            return (
              <TouchableOpacity
                key={poz.idWydarzenia}
                style={styles.arkuszWybor}
                onPress={() => {
                  const brama = wolnoUtworzycWydarzenie(stanDodania, {
                    rodzaj: 'to_bylo_to', idWydarzenia: poz.idWydarzenia,
                  });
                  console.log(`dzis: [A5] wolno utworzyć = ${brama.wolno} — ${brama.powod}`);
                  if (p !== null) setArkusz({ rodzaj: 'ocena', klucz: p.klucz });
                }}
              >
                <Text style={styles.cardLabel}>{poz.tytul}</Text>
                <Text style={styles.licznikPodpis}>
                  {(poz.godzina === null ? '' : `${poz.godzina}  ·  `) + KOLIZJA_TO_BYLO_TO}
                </Text>
              </TouchableOpacity>
            );
          })}
          {/* ═══════════════════════════════════════════════════════════
              ⭐⭐ PAS K1 21.08.2026 (§3.5) — „NIE, TO BYŁA INNA RZECZ"
              ROZDZIELONE NA DWA WYJŚCIA. ⛔ Do 21.08 była tu JEDNA droga
              i prowadziła do formularza kalendarza — czyli mecz, którego
              zawodnik nie zaplanował, dało się zapisać wyłącznie zakładając
              mu najpierw wydarzenie. Mecz dostaje własne wyjście i kończy
              na arkuszu oceny; wszystko inne idzie tam, gdzie szło.
              ⛔ ANI JEDNO Z NICH NIC NIE ZAPISUJE — bramka `wolnoUtworzyc-
              Wydarzenie` jest wołana w obu, tak jak dotąd.
              ═══════════════════════════════════════════════════════════ */}
          <TouchableOpacity style={styles.arkuszWybor} onPress={() => otworzMeczBezPlanu()}>
            <Text style={styles.cardLabel}>{PLUS_TO_BYL_MECZ}</Text>
            <Text style={styles.licznikPodpis}>{PLUS_TO_BYL_MECZ_PODPIS}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.arkuszWybor}
            onPress={() => przejdzDoDodania({ rodzaj: 'inna_rzecz' }, 'juz_sie_odbylo')}
          >
            <Text style={styles.cardLabel}>{PLUS_COS_INNEGO}</Text>
            <Text style={styles.licznikPodpis}>{PLUS_COS_INNEGO_PODPIS}</Text>
          </TouchableOpacity>
          <Text style={styles.licznikPodpis}>{KOLIZJA_PRZYPIS}</Text>
        </>
      );
    }
    return (
      <>
        <Text style={styles.cardBody}>
          {stanDodania.rodzaj === 'nie_wiemy' ? KOLIZJA_NIE_ODCZYTANE : KOLIZJA_NIC_NIE_STALO}
        </Text>
        {/* ⭐ PAS K1 — TE SAME DWA WYJŚCIA, CO W GAŁĘZI Z PYTANIEM.
            ⛔ Jedno wyjście tutaj i dwa tam znaczyłoby, że zawodnik, którego
            plan akurat był pusty, NIE MA jak zapisać meczu — a to jest
            dokładnie ten przypadek, w którym najczęściej go nie ma w planie. */}
        <TouchableOpacity style={styles.arkuszWybor} onPress={() => otworzMeczBezPlanu()}>
          <Text style={styles.cardLabel}>{PLUS_TO_BYL_MECZ}</Text>
          <Text style={styles.licznikPodpis}>{PLUS_TO_BYL_MECZ_PODPIS}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.arkuszWybor}
          onPress={() => przejdzDoDodania({ rodzaj: 'inna_rzecz' }, 'juz_sie_odbylo')}
        >
          <Text style={styles.cardLabel}>{PLUS_DODAJ_NOWE}</Text>
          <Text style={styles.licznikPodpis}>{PLUS_COS_INNEGO_PODPIS}</Text>
        </TouchableOpacity>
      </>
    );
  }

  /**
   * ⭐ PAS W1 18.08.2026 — CAŁA GAŁĄŹ „DZIŚ" JAKO JEDNA NAZWANA FUNKCJA.
   * Bliźniak `renderTydzienNaKarcie()`. Obie są wywołaniami po nazwie,
   * więc miara zawsze wie, KTÓREJ z nich nie opisuje.
   */
  function renderDzisNaEkranie() {
    return (
      <>
            {/* ── 3. CO DZIŚ NAJWAŻNIEJSZE (makieta v3: `kartaGlowna`, 118 dp)
                ⭐ WCHŁANIA GŁOS TYGODNIA. Karta głosu i jedna odpowiedź były
                do 18.08 dwiema kartami pod sobą i mówiły tym samym głosem
                („co dziś najważniejsze"). Makieta v3 ma tu JEDEN blok —
                i dlatego głos tygodnia stoi w środku tej karty, a nie nad nią.
                ⛔ ZERO NOWYCH BRZMIEŃ: `glos.tytul` i `glos.tresc` co do znaku. */}
            {/* ═══════════════════════════════════════════════════════
                ⭐⭐ 3. CO DZIŚ ZROBIĆ — DEFEKT D-1 NAPRAWIONY.

                CO BYŁO ŹLE (§2 polecenia, zrzut z 18.08): karta „CO DZIŚ
                ZROBIĆ” to ŚCIANA TEKSTU na ~15 linii — surowy materiał
                wklejony w całości, PONAD PÓŁ EKRANU. ⭐ Zmierzone
                `lib/wysokoscEkranu.ts`: 547 dp z 806,5 — czyli 68% ekranu
                na jeden blok.

                JAK JEST TERAZ (decyzja D-B Kuby z 18.08): karta pokazuje
                DWA ZDANIA — co zrobić i dlaczego akurat to. Cały materiał
                otwiera się dotknięciem, w arkuszu (`rodzaj: 'material'`),
                czyli POZA `ScrollView` — koszt 0 dp.

                ⛔ CAŁA KARTA JEST PRZYCISKIEM. Wiersz „Cały materiał →”
                stoi WEWNĄTRZ obszaru dotykalnego, a nie obok niego: napis
                ze strzałką, którego nie da się dotknąć, jest obietnicą
                bez pokrycia.
                ═══════════════════════════════════════════════════════ */}
            <TouchableOpacity
              style={styles.odpowiedzCard}
              accessibilityRole="button"
              onPress={() => setArkusz({ rodzaj: 'material' })}
            >
              <View style={styles.odpowiedzStripe} />
              <Text style={styles.voiceLabel}>{NAGLOWEK_CO_ZROBIC}</Text>
              {/* ── ZDANIE 1: CO ZROBIĆ ─────────────────────────────
                  ⛔ `pozycja.co` CO DO ZNAKU z rankera — ekran nie skraca
                  cudzego zdania i nie dopisuje własnego. */}
              {kolejka === null ? (
                <Text style={styles.odpowiedzTresc}>{KOLEJKA_WCZYTUJE}</Text>
              ) : pozycjeNaDzis.length === 0 ? (
                <Text style={styles.kolejkaPustka}>
                  {kolejka.stan === 'nie_wiem' ? KOLEJKA_NIE_WIEM : KOLEJKA_PUSTO}
                </Text>
              ) : (
                <>
                  {/* ⛔⛔ D-1 — JEDNO ZDANIE, NIE CAŁY MATERIAŁ.
                      `numberOfLines` jest DRUGIM, twardym hamulcem: gdyby
                      producent oddał kiedyś zdanie bez kropki i bez spacji,
                      funkcja wyżej nie miałaby gdzie ciąć, a ekran i tak
                      nie urośnie ponad dwie linie. ⭐ Dwa niezależne
                      zabezpieczenia, bo to jest defekt, który Kuba nazwał
                      pierwszym słowem po obejrzeniu appki. */}
                  <Text style={styles.odpowiedzTresc} numberOfLines={2}>
                    {pierwszeZdanieNaEkran(pozycjeNaDzis[0].co).tekst}
                  </Text>
                  {/* ── ZDANIE 2: DLACZEGO AKURAT TO ────────────────
                      ⚠️ `null` znaczy „nie mam uzasadnienia, którego bym
                      nie zmyślił”. Zmyślone uzasadnienie jest gorsze niż
                      jego brak, bo brzmi wiarygodnie — dlatego ta część
                      potrafi zniknąć w całości. */}
                  {pozycjeNaDzis[0].dlaczego !== null ? (
                    <Text style={styles.voiceSub} numberOfLines={2}>
                      {pozycjeNaDzis[0].dlaczego}
                    </Text>
                  ) : null}
                </>
              )}
              <Text style={styles.cardWejscie}>{KARTA_MATERIAL_WEJSCIE}</Text>
            </TouchableOpacity>

            {/* ═══════════════════════════════════════════════════════
                ⭐ 4. TRZY FAKTY O DNIU — DEFEKT D-2 NAPRAWIONY.
                Makieta v3, funkcja `czteryInfo`, 86 dp. Do 18.08 tego
                bloku NIE BYŁO NA EKRANIE W OGÓLE.
                ═══════════════════════════════════════════════════════ */}
            {/* ⛔ `glos.tytul` PADA NA EKRANIE — trzeci fakt („Z Twoich wpisów")
                jest tym samym zdaniem arbitra, tylko jedną linią. Pełna treść
                (`glos.tresc`) stoi w arkuszu „cały materiał". ⛔ Głos NIE MA
                i nie odzyska własnej karty — `styles.glosCard` nie jest tu wołane. */}
            {renderTrzyFakty(pokazacKarte(glos) && glos.rodzaj === 'glos' ? glos.tytul : null)}

            {/* ── 5. ETYKIETA „TWÓJ DZIEŃ" (makieta v3: 26 dp) ───────── */}
            <Text style={styles.sectionLabel}>{ETYKIETA_TWOJ_DZIEN}</Text>

            {/* ── ⭐ KAFEL PRODUKTU: WPIS DZIENNY (makieta v3: `rodzaj:"prod"`) ──
                ⛔⛔ TO JEST JEDYNE WEJŚCIE DO `/dziennik` PO ZDJĘCIU ZAKŁADKI —
                i dlatego powstało PRZED zdjęciem zakładki, a nie po nim.
                Zmierzone 18.08.2026: `grep -rn "'/dziennik'"` wracał WYŁĄCZNIE
                tablicę `TRASA_POZYCJI` w tym pliku, czyli wejście zależne od
                tego, czy ranker postawi pozycję Dziennika na PIERWSZYM miejscu.
                Wejście, które bywa, nie jest wejściem (decyzja Kuby 18.08:
                „dziennik wchłania »Dziś« — ankieta poranna jako kafel").
                ⛔ TRZY STANY, NIE DWA (R5): `null` znaczy „nie odczytałem",
                a nie „nie masz wpisu". */}
            {/* ⭐ D-9 NAPRAWIONE — „tytuł i podpis mówią co innego”.
                Do 18.08 kafel mówił jednocześnie „ZAPISZ dzisiejszy wpis”
                (polecenie) i „dzisiejszy wpis JEST ZAPISANY” (stan). Teraz
                TYTUŁ OPISUJE STAN, gdy rzecz jest już zrobiona, i jest
                poleceniem tylko wtedy, gdy jest co zrobić.
                ⛔ ZERO NOWYCH BRZMIEŃ: te same trzy stałe, inaczej ułożone.
                ⛔ TRZY STANY, NIE DWA (R5): `null` znaczy „nie odczytałem”. */}
            {renderKafel({
              klucz: 'dziennik',
              tytul: brakWpisuDzis === false ? DZIENNIK_JEST : DZIENNIK_CO,
              podpis: brakWpisuDzis === null ? DZIENNIK_NIE_WIEM
                : brakWpisuDzis ? DZIENNIK_DLACZEGO : '',
              rodzaj: 'prod',
              rejestr: brakWpisuDzis === null ? 'niewiem' : brakWpisuDzis ? 'plan' : 'zmierzone',
              plakietka: brakWpisuDzis === null ? PLAKIETKA_NIE_WIEM
                : brakWpisuDzis ? PLAKIETKA_DO_WYPELNIENIA : PLAKIETKA_WYPELNIONA,
              onPress: () => router.push('/dziennik'),
            })}

            {/* ── 6. KAFLE DNIA (makieta v3: `kafelHTML`, 54/60 dp) ────
                ⭐ KAFEL JEST WEJŚCIEM DO OCENY. Do 18.08 dotknięcie
                czegokolwiek w tej liście prowadziło do `/kalendarz` albo
                do niczego; ocena stała 4 663 dp niżej. */}
            {pustkaDzis ? (
              <>
                <Text style={styles.cardBody}>{pustkaDzis.tekst}</Text>
                {/* ⭐ PAS I2 16.08.2026 — WT-33: pustka MA MIEĆ WYJŚCIE, a nie
                    goły napis ze strzałką. ⚠️ `blad_odczytu` ZOSTAJE NAPISEM
                    i to jest decyzja: jego wyjściem jest `RefreshControl`,
                    nie dotknięcie — strzałka byłaby obietnicą akcji. */}
                {pustkaDzis.krokWTekscie ? null
                  : pustkaDzis.rodzaj === 'blad_odczytu' ? (
                    <Text style={styles.cardBody}>{pustkaDzis.cta}</Text>
                  ) : (
                    <TouchableOpacity
                      style={styles.inlineLink}
                      onPress={() => router.push(pustkaDzis.rodzaj === 'brak_danych' ? '/kalendarz' : '/profil')}
                    >
                      <Text style={styles.cardAction}>{pustkaDzis.cta} →</Text>
                    </TouchableOpacity>
                  )}
              </>
            ) : (
              (todayEvents === null ? [] : todayEvents).map((e) => {
                const opisRodzaju = opiszRodzaj(e.event_type);
                if (!opisRodzaju.znany) console.warn(opisNieznanegoRodzajuDoLogu(opisRodzaju));
                // ⭐⭐ PAS B1 21.08.2026 — KAFEL SZUKA W `pytaniaLista`, NIE
                // W `bezOceny`. ⛔ CO BYŁO ZEPSUTE (znalezisko R1 #10): `bezOceny`
                // to `pytaniaLista.filter(stan.rodzaj === 'pytam')`, więc rzecz
                // JUŻ OCENIONA nie była w tym zbiorze i wypadała do gałęzi
                // „nie ma o co pytać" — dostawała plakietkę „do zrobienia"
                // i prowadziła do Kalendarza. ⛔ To jest ta sama klasa defektu,
                // przez którą Kuba nie umiał dodać meczu: DROGA PROWADZI GDZIE
                // INDZIEJ NIŻ NAPIS OBIECUJE, a napis w dodatku kłamie o stanie.
                const pyt = pytaniaLista.find((q) => q.idWydarzenia === e.id) ?? null;
                // ⛔ TRZY STANY, NIE DWA (R5): „nie ma pytania" ≠ „czeka na ocenę"
                // ≠ „ocenione". Sklejenie pierwszego z trzecim było całym defektem.
                const ocenione = pyt !== null && pyt.stan.rodzaj === 'odpowiedziane';
                // ⭐ D-3 · RODZAJ POZYCJI (Z5). ⛔ Rozstrzyga to `opiszRodzaj`
                // z `lib/meczWKalendarzu.ts`, a nie własna tabela w tym pliku —
                // ekran, który sam mapuje rodzaje, jest drugą kopią reguły.
                const rodzajKafla = !opisRodzaju.znany ? 'prod'
                  : (opisRodzaju.id === 'match' || opisRodzaju.id === 'club_training')
                    ? 'zob' : 'wl';
                return renderKafel({
                  klucz: String(e.id),
                  tytul: e.title,
                  podpis: opisRodzaju.znany ? EVENT_TYPE_LABELS[opisRodzaju.id] : opisRodzaju.komunikat,
                  rodzaj: rodzajKafla,
                  // ⭐ D-5 · REJESTR (Z1, R5). ⛔ „czeka na ocenę” to NIE JEST
                  // „pusto” — to jest NIE WIEMY, i ma własny kształt ramki.
                  // ⭐ PAS B1 — RZECZ OCENIONA JEST ZMIERZONA, nie „nie wiemy".
                  rejestr: ocenione ? 'zmierzone' : pyt === null ? 'plan' : 'niewiem',
                  // ⭐ D-4 · PLAKIETKA STANU — trzeci nośnik, tekstowy (K4).
                  // ⛔ PAS B1 — „ocenione" to STAŁA, KTÓRA JUŻ BYŁA
                  // (`PLAKIETKA_OCENIONE`, użyta przy wierszu dnia). Zero nowych
                  // brzmień: rzecz oceniona przestaje mówić „do zrobienia".
                  plakietka: ocenione ? PLAKIETKA_OCENIONE
                    : pyt === null ? PLAKIETKA_DO_ZROBIENIA : KAFEL_CZEKA_NA_OCENE,
                  // ⭐ PAS B1 · Z-5 — DOTKNIĘCIA OD INTENCJI DO SKUTKU.
                  // „chcę poprawić albo uzupełnić ocenę rzeczy, którą już
                  // oceniłem": PRZED — z kafla NIE DA SIĘ, kafel prowadził do
                  // Kalendarza, a wiersz „Bez oceny" pokazuje wyłącznie `pytam`.
                  // PO — JEDNO dotknięcie: kafel otwiera arkusz TEJ rzeczy,
                  // z zaznaczonym werdyktem i z krokami czasu, ciężkości i bólu.
                  // ⚠️ CIAŁO `onPress` ZOSTAJE CO DO ZNAKU — mutacja `S3-M2`
                  // z `lib/zdobyczeRundy.selftest.ts` kotwiczy się na tych
                  // czterech liniach. ⛔ Komentarz stoi NAD nimi celowo.
                  onPress: () => {
                    if (pyt !== null) setArkusz({ rodzaj: 'ocena', klucz: pyt.klucz });
                    else router.push('/kalendarz');
                  },
                });
              })
            )}

            {/* ── 9. WIERSZ „WCZORAJ BEZ OCENY" (makieta v3: 40 dp) ────
                ⭐ TO JEST DRUGIE WEJŚCIE DO OCENY — dla rzeczy, których nie
                ma już na dzisiejszej liście. ⛔ Rysuje się WYŁĄCZNIE, gdy
                naprawdę coś czeka; wiersz „0 rzeczy" byłby listą zaległości. */}
            {bezOceny.length > 0 ? (
              <TouchableOpacity style={styles.inlineLink} onPress={() => setArkusz({ rodzaj: 'oceny' })}>
                <Text style={styles.cardAction}>{WIERSZ_BEZ_OCENY(bezOceny.length)}</Text>
              </TouchableOpacity>
            ) : null}

            {/* ── 12. PRZYPIS (makieta v3: 42 dp) ─────────────────────── */}
            <Text style={styles.licznikPodpis}>{PRZYPIS_OCENA_NALEZY_DO_RZECZY}</Text>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        {/* ── 1. NAGŁÓWEK (makieta v3: `naglowek`, 54 dp) ────────────
            ⭐ TYTUŁ I DATA STOJĄ W JEDNYM WIERSZU, tak jak w makiecie (`shd`:
            tytuł po lewej, data po prawej, na tej samej linii bazowej).
            Do 18.08.2026 data stała NAD tytułem i kosztowała 19 dp osobnego
            wiersza — przy budżecie 850 dp to jest 2,2% ekranu wydane na to,
            żeby dwie rzeczy tej samej wagi nie stały obok siebie. */}
        <View style={styles.naglowekDnia}>
          <Text style={styles.title}>{zakresKarty === 'dzis' ? KARTA_ZAKRES_DZIS : KARTA_ZAKRES_TYDZIEN}</Text>
          <Text style={styles.eyebrow}>{todayLabel}</Text>
        </View>

        {/* ── 2. PRZEŁĄCZNIK (makieta v3: `przelacznik`, 48 dp) ──────
            ⭐ WYSZEDŁ Z KARTY NA GÓRĘ EKRANU. Do 18.08.2026 stał WEWNĄTRZ
            karty kalendarza, czyli 4 663 dp niżej — zawodnik musiał przewinąć
            pięć ekranów, żeby dowiedzieć się, że widok tygodnia w ogóle
            istnieje. ⛔ Rzecz ważna nie może wymagać przewijania (P0). */}
        <View style={styles.seg}>
          <TouchableOpacity
            style={[styles.segBtn, zakresKarty === 'dzis' && styles.segBtnOn]}
            onPress={() => setZakresKarty('dzis')}
            accessibilityRole="button"
          >
            <Text style={[styles.segTxt, zakresKarty === 'dzis' && styles.segTxtOn]}>{KARTA_ZAKRES_DZIS}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segBtn, zakresKarty === 'tydzien' && styles.segBtnOn]}
            onPress={() => setZakresKarty('tydzien')}
            accessibilityRole="button"
          >
            <Text style={[styles.segTxt, zakresKarty === 'tydzien' && styles.segTxtOn]}>{KARTA_ZAKRES_TYDZIEN}</Text>
          </TouchableOpacity>
        </View>

        {zakresKarty === 'tydzien' ? (
          /* ── WIDOK „TYDZIEŃ" (makieta v3: `ekranTydzien`) ──────────
             ⭐ Ten sam kod, co dotąd rysował się w karcie — zmieniło się
             wyłącznie to, że jest teraz OSOBNYM STANEM EKRANU, a nie
             zakładką schowaną pod pięcioma ekranami przewijania. */
          renderTydzienNaKarcie()
        ) : (
          /* ── WIDOK „DZIŚ" (makieta v3: `ekranDzien`) ───────────────
             ⭐ PAS W1 18.08.2026 — GAŁĄŹ WYPROWADZONA DO NAZWANEJ FUNKCJI,
             dokładnie tak jak `renderTydzienNaKarcie()` obok. ⛔ To nie
             jest kosmetyka: miara (`lib/wysokoscEkranu.ts`) wybiera
             NAJWYŻSZĄ z dwóch gałęzi i NAZYWA tę, której nie opisuje —
             ale nazwać umie WYŁĄCZNIE wywołanie po nazwie. Gałąź wpisana
             wprost w JSX wypadałaby z raportu BEZ ŚLADU, czyli dokładnie
             ten cichy brak, którego pilnuje asercja (M2-13, O97). */
          renderDzisNaEkranie()
        )}
      </ScrollView>

      {/* ── PRZYCISK „+" (makieta v3: `fab`) ───────────────────────────
          ⛔ STOI POZA `ScrollView` I DLATEGO NIGDY NIE UCIEKA POD ZGIĘCIE.
          Wszystko, co produkt kiedykolwiek policzy, wchodzi tędy albo przez
          ankietę poranną. */}
      <TouchableOpacity
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel={PLUS_ETYKIETA}
        onPress={() => setArkusz({ rodzaj: 'plus' })}
      >
        <Text style={styles.fabZnak}>+</Text>
      </TouchableOpacity>

      {/* ── ARKUSZ (makieta v3: `sheet`) ───────────────────────────────
          ⛔ STOI POZA `ScrollView`: to jest NAKŁADKA nad ekranem, a nie
          kolejna rzecz na nim. Dlatego zdejmuje wysokość, zamiast ją
          przesuwać — i dlatego miara ekranu liczy go na zero. */}
      <Arkusz
        widoczny={arkusz !== null}
        naglowek={naglowekOtwartego}
        naZamkniecie={() => setArkusz(null)}
      >
        {trescArkusza()}
      </Arkusz>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  /** ⭐ PLAN-D-A1 — nagłówek dnia: tytuł i data w jednym wierszu (makieta `shd`). */
  naglowekDnia: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-A1 18.08.2026 — KAFEL DNIA, PRZYCISK „+" I WIERSZE ARKUSZA
  //
  // ⚠️ ZERO NOWYCH BARW. Wszystkie trzy korzystają z tokenów, które w tym
  // pliku już były (`surface`, `border`, `brand`) — makieta v3 też nie
  // dokłada ani jednej barwy.
  // ═══════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════
  // ⭐⭐ PAS W1 18.08.2026 — KAFEL NIESIE TRZY NIEZALEŻNE INFORMACJE
  // I KAŻDA MA WŁASNY NOŚNIK (makieta v3, `kafelHTML`).
  //
  //  D-3  LEWA KRAWĘDŹ = RODZAJ POZYCJI (Z5)
  //       ciemna ciągła  → zobowiązanie wobec zespołu
  //       zielona ciągła → Twoja własna praca
  //       kropkowana     → rzecz produktu
  //       ⛔ DO 18.08 BYŁA CZERWONA U WSZYSTKICH TRZECH — bo brała
  //       `colors.brand`, a `brand` był koralem. To łamało Z2 (czerwień
  //       wyłącznie przy bólu) I nie niosło żadnej informacji, bo była
  //       jedna dla wszystkiego.
  //
  //  D-5  RESZTA RAMKI = REJESTR (Z1, R5)
  //       wypełniony       → zmierzone
  //       obrys ciągły     → zaplanowane
  //       obrys przerywany → ⛔ NIE WIEMY (a to NIE JEST to samo co „pusto")
  //
  //  D-4  PLAKIETKA = STAN. Trzeci nośnik, tekstowy — bo ⭐ K4: około
  //       1 na 12 chłopców nie rozróżnia części barw i sam kształt ramki
  //       nie powie im nic.
  //
  //  D-6  `paddingRight` — kafel nie wchodzi pod nieprzezroczysty „+".
  // ═══════════════════════════════════════════════════════════════
  /** Kafel dnia. Wysokość z makiety v3 (`kafelHTML`, 54 dp) — stąd `minHeight`. */
  kafel: {
    minHeight: wymiary.wysokoscKafla, justifyContent: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md,
    paddingLeft: 12, paddingRight: wymiary.odstepPodPlusem, paddingVertical: 8, marginBottom: 6,
  },
  /** D-3 · RODZAJ — lewa krawędź. Trzy warianty, trzy różne znaczenia. */
  kafelZobowiazanie: { borderLeftWidth: 4, borderLeftColor: colors.textPrimary },
  kafelWlasnaPraca: { borderLeftWidth: 4, borderLeftColor: colors.brand },
  // ⛔ React Native nie zna `border-left-style: dotted` osobno dla jednej
  // krawędzi, więc kropkowaną krawędź rysuje osobny pasek (`kafelKrawedzProdukt`).
  // Kafel produktu ma za to lewą krawędź ROZSZERZONĄ i przezroczystą, żeby
  // treść trzech rodzajów stała w tej samej odległości od brzegu.
  kafelRzeczProduktu: { borderLeftWidth: 4, borderLeftColor: 'transparent' },
  kafelKrawedzProdukt: {
    position: 'absolute', left: 0, top: 8, bottom: 8, width: 4,
    borderLeftWidth: 4, borderLeftColor: colors.textSecondary, borderStyle: 'dotted',
    borderRadius: 2,
  },
  /** D-5 · REJESTR — reszta ramki. ⛔ „pusto" i „nie wiemy" to dwie różne rzeczy. */
  kafelZmierzone: { backgroundColor: colors.okSoft, borderColor: colors.okBorder },
  kafelZaplanowane: { backgroundColor: colors.surface, borderColor: colors.border },
  kafelNieWiemy: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: colors.border },
  kafelWygasly: { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
  kafelTresc: { flex: 1, minWidth: 0 },
  kafelTytul: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  kafelPodpis: { ...typography.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  /** D-4 · PLAKIETKA STANU. Makieta v3, klasa `.chip`. */
  plakietka: {
    ...typography.bodyMedium, fontSize: 10, letterSpacing: 0.6,
    textTransform: 'uppercase', color: colors.textSecondary,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.xs,
    paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden',
  },
  plakietkaZrobione: { backgroundColor: colors.okSoft, borderColor: colors.okBorder, color: colors.brand },
  plakietkaDoZrobienia: { backgroundColor: colors.surfaceElevated, color: colors.textPrimary },
  plakietkaNieWiemy: { backgroundColor: 'transparent', borderStyle: 'dashed' },
  plakietkaWygasla: { backgroundColor: colors.surfaceSunken, borderColor: colors.surfaceSunken },

  // ═══════════════════════════════════════════════════════════════
  // ⭐ PAS W1 (D-2) — TRZY FAKTY O DNIU (makieta v3: `czteryInfo`, 86 dp).
  // ⛔⛔ KROPKA JEST JEDNA I TAKA SAMA NIEZALEŻNIE OD TEGO, ILE DZIEŃ WAŻY.
  // V2 makiety zmieniała jej kolor na progu 4,5 — czyli OCENIAŁA LICZBĘ
  // KOLOREM. D4 tego zabrania: obciążenie jest faktem o zawodniku, nie
  // werdyktem. ⛔ Nie wracaj do kolorowania kropki wg progu.
  // ═══════════════════════════════════════════════════════════════
  fakty: { marginTop: 6, marginBottom: 10 },
  fakt: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 3 },
  faktKropka: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand, marginTop: 6 },
  /** ⛔ Szara kropka = „nie policzone". To jest brak wiedzy, nie ostrzeżenie. */
  faktKropkaPustka: { backgroundColor: colors.border },
  /** Złota kropka = ostrzeżenie MIĘKKIE (napięcie). ⛔ Nigdy czerwień. */
  faktKropkaMiekka: { backgroundColor: colors.caution },
  faktTekst: { flex: 1, ...typography.body, fontSize: 12.5, lineHeight: 17, color: colors.textPrimary },
  faktNazwa: { ...typography.bodySemiBold, fontSize: 12.5, color: colors.textPrimary },
  faktPustka: { ...typography.body, fontSize: 12.5, color: colors.textSecondary },

  // ═══════════════════════════════════════════════════════════════
  // ⭐⭐ PAS W1 (T-1, T-2, T-3) — WIERSZ DNIA W TYGODNIU (makieta `.wd`).
  //
  //  T-1  SŁUPEK WRACA. ⭐ K4 — WYSOKOŚĆ NIESIE TĘ SAMĄ INFORMACJĘ CO
  //       NASYCENIE. Obie liczy `constants/theme.ts` z tej samej wartości.
  //       ⛔ Barwa słupka NIE MA składowej czerwonej i mieć nie będzie (Z2).
  //  T-2  PLAKIETKA POD SŁUPKIEM niesie REJESTR, a nie wagę.
  //  T-3  WIERSZ JEST KARTĄ — do 18.08 był gołym rzędem tekstu i nie
  //       wyglądał na coś, czego można dotknąć.
  //  T-8  ⛔ DZISIEJSZY DZIEŃ OZNACZA OBWÓDKA, NIE BARWA OSTRZEGAWCZA.
  // ═══════════════════════════════════════════════════════════════
  wd: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: wymiary.wysokoscWierszaDnia,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: 11, paddingVertical: 7, marginBottom: 6,
  },
  wdDzis: { borderColor: colors.textPrimary, borderWidth: 2 },
  wdNazwa: { ...typography.display, fontSize: 15, letterSpacing: 0.4, color: colors.textPrimary, width: 62 },
  wdTresc: { flex: 1, minWidth: 0 },
  wdOpis: { ...typography.body, fontSize: 12.5, lineHeight: 17, color: colors.textPrimary },
  wdDruga: { ...typography.body, fontSize: 10.5, lineHeight: 15, color: colors.textSecondary, marginTop: 2 },
  /** ⛔ T-4 — TEN STYL NIE MA I NIE MOŻE MIEĆ `textDecorationLine`. */
  wdOdwolana: { ...typography.body, fontSize: 12.5, color: colors.textSecondary },
  slupek: { width: 46, alignItems: 'center' },
  slupekTor: {
    width: 32, height: TOR_SLUPKA_DP, justifyContent: 'flex-end',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  slupekWypelnienie: { width: 32, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  slupekPodpis: {
    ...typography.body, fontSize: 8, letterSpacing: 0.4, textTransform: 'uppercase',
    color: colors.textSecondary, marginTop: 3, textAlign: 'center',
  },
  /** Wiersz listy w arkuszu — bez ramki, bo to nie jest przycisk. */
  arkuszWiersz: { ...typography.body, fontSize: 13, color: colors.textSecondary, paddingVertical: 5 },
  // ═══════════════════════════════════════════════════════════════════
  // ⭐⭐ PLAN-D-D8 — ŚCIEŻKA MECZU. ⛔ Wszystko stoi W ARKUSZU, czyli poza
  // `ScrollView`, więc koszt na ekranie „Dziś" wynosi ZERO dp. Wzorzec
  // przeniesiony z `components/PracaWLiczbach.tsx` i z pasa A1.
  // ═══════════════════════════════════════════════════════════════════
  /** ⛔ JEDEN BLOK NA DWIE LICZBY — ramka niesie to, że bez siebie nic nie znaczą. */
  meczBlok: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    padding: 10, marginBottom: 8,
  },
  /**
   * ⭐ ZERO MINUT MA WŁASNY WYGLĄD, nie mniejszą czcionkę tej samej rzeczy.
   * ⛔ ZERO CZERWIENI (Z2): to nie jest ostrzeżenie ani ocena zawodnika —
   * czerwień w tym produkcie należy wyłącznie do bólu i stanu ochronnego.
   */
  meczZeroMinut: {
    ...typography.body, fontSize: 13, color: colors.textPrimary,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, padding: 10, marginTop: 6,
  },
  /** Dwa wąskie pola wyniku — `own_score` i `opponent_score`. */
  meczPoleWyniku: {
    ...typography.body, fontSize: 14, color: colors.textPrimary, minWidth: 64,
    minHeight: minTouchHeight, paddingHorizontal: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, marginRight: 8,
  },
  meczNotatka: {
    ...typography.body, fontSize: 14, color: colors.textPrimary, minHeight: 72,
    padding: 10, textAlignVertical: 'top',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, marginBottom: 8,
  },
  /** Wybór w arkuszu („+" i kolizja) — to JEST przycisk, więc ma dotyk 48 dp. */
  arkuszWybor: {
    minHeight: minTouchHeight, justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, padding: 12, marginBottom: 8,
  },
  /** ⛔ `position: 'absolute'` — przycisk „+" NIE PODNOSI ekranu ani o dp. */
  fab: {
    position: 'absolute', right: 16, bottom: 24, width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center',
  },
  fabZnak: { ...typography.display, fontSize: 30, color: colors.white, lineHeight: 34 },
  // W1: nadtytuły/etykiety sekcji na ink3 (koncepcja: ink3 = podpisy, nadtytuły)
  eyebrow: { ...typography.bodyMedium, fontSize: 12, letterSpacing: 1, textTransform: 'capitalize', color: colors.textTertiary, marginBottom: 4 },
  // ⭐ PLAN-D-A1 18.08.2026 — 32 → 26 px i odstęp lg → md. Makieta v3 (`shd .t`)
  // rysuje tytuł ekranu w 26 px i mieści datę OBOK niego, w tym samym wierszu.
  // ⛔ To nie jest zmiana hierarchii: tytuł nadal jest największym tekstem
  // ekranu. To jest 13 dp oddane blokowi, który niesie treść, a nie nazwę.
  // ⭐ PAS W1 (D-7) — „nagłówek «Dziś» jest PRZYCIĘTY OD GÓRY (ucięty ogonek «ś»)".
  // Powód: styl nie miał `lineHeight`, więc React Native brał wysokość linii
  // z metryki kroju — a Archivo-Bold w 26 px ma akcenty wyżej niż ta metryka.
  // ⛔ Nie zmieniam rozmiaru pisma (to jest hierarchia), tylko wysokość linii
  // i oddech u góry. Koszt: 6 dp, i to jest cena za czytelny tytuł.
  title: {
    ...typography.display, fontSize: 26, lineHeight: 32, paddingTop: 4,
    marginBottom: spacing.md, color: colors.textPrimary,
  },
  // ⭐ PLAN-D-A1 18.08.2026 — odstęp pod etykietą 10 → 4 dp. Makieta v3 daje
  // etykiecie „Twój dzień" 26 dp W CAŁOŚCI; te 6 dp to była różnica między
  // ekranem mieszczącym się nad zgięciem (808 dp) a ekranem, którego przypis
  // linia zgięcia PRZECINA. ⛔ Rzecz przecięta linią jest defektem, nie ozdobą.
  sectionLabel: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 4 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 16, marginBottom: 10 },
  cardMuted: { opacity: 0.7 },
  // PLAN-D-F 08.2026 — karta głosu tygodnia. Ta sama rodzina co `card`,
  // z krechą 12° jak hero: to jest zdanie o zawodniku, nie pozycja listy.
  glosCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 16, overflow: 'hidden' },
  glosStripe: { ...skew.stripe, height: 6, backgroundColor: colors.brand, marginBottom: 12 },
  glosTytul: { ...typography.bodySemiBold, fontSize: 17, color: colors.textPrimary, marginBottom: 6 },
  glosTresc: { ...typography.body, fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  // PLAN-D-I 08.2026 — wejście z karty głosu tygodnia (I1). Te same wartości
  // co `cardAction`: to jest ta sama rzecz co „zobacz" na innych kartach,
  // więc nie ma powodu, żeby wyglądała inaczej.
  // ZADANIE E2 12.08.2026 — wiersz punktu pomocy.
  pomocCard: { borderColor: colors.brand },
  pomocPodpis: { ...typography.body, fontSize: 12, color: colors.textTertiary, lineHeight: 17 },
  cardLabel: { ...typography.bodySemiBold, fontSize: 15, color: colors.textPrimary, marginBottom: 4 },
  cardBody: { ...typography.body, fontSize: 14, color: colors.textSecondary, marginBottom: 8, lineHeight: 20 },
  cardAction: { ...typography.bodyMedium, fontSize: 13, color: colors.brand },
  linkedToGoal: { ...typography.bodyMedium, fontSize: 12, color: colors.brand, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  // NAWIGACJA B3 08.08.2026 — hero Celu skurczone z ~220 dp do ~102 dp
  // (decyzja B5). Wysokość składa się z: 24 (padding pionowy 12+12)
  // + 17,8 (nadtytuł 11 px + 4 marginesu) + 32,3 (nazwa 21 px, jedna linia,
  // + 6 marginesu) + 21,3 (wskaźnik 13 px + 5) + 4 (pasek) + 2 (ramka) ≈ 101 dp.
  // Cel B5 brzmiał „~90" — jesteśmy 12 dp wyżej i to jest świadome: zejście
  // niżej wymagałoby usunięcia jednej z trzech rzeczy, które B5 kazała
  // zostawić (nazwa / wskaźnik / pasek) albo zwężenia oddechu do 8 px.
  // Zmienione względem stanu z rundy 2: `padding` 20 → 12/16, `heroTitle`
  // 30 px → 22 px, usunięte `heroContext` i `heroLinksRow`.
  // Cały kafelek jest dotykalny, więc nie potrzebuje własnych stref dotyku
  // 48 dp w środku — i to jest połowa oszczędzonej wysokości.
  // W1: prosta krecha borderLeft → krecha ŚCIĘTA 12° (transform, nie obrazek;
  // koncepcja 08.2026, komponent 1 — wyłącznie karty „to jest o Tobie").
  // Absolutna, więc wysokość hero bez zmian (~101 dp, rachunek wyżej aktualny).
  heroGoal: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: 12, paddingLeft: 24, paddingRight: 16, marginBottom: 4,
  },
  heroStripe: { ...skew.stripe, height: 44, backgroundColor: colors.brand },
  heroEyebrow: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 4 },
  heroTitle: { ...typography.displayExtraBold, fontSize: 21, color: colors.textPrimary, marginBottom: 6 },
  heroAction: { ...typography.bodyMedium, fontSize: 13, color: colors.brand },
  // WIEDZA B4 08.08.2026 — dług N2. Wysokość dobrana tak, żeby stan ładowania
  // NIE był wyższy niż stan docelowy (21 px nazwa + 6 marginesu + 13 px wskaźnik
  // + 5 + 4 pasek ≈ 49 dp; tu 20 + 5 + 4 + 20 = 49). Ekran nie skacze w dół,
  // gdy dane dojdą — a to jest cały sens tego stanu.
  heroLoading: { ...typography.body, fontSize: 15, lineHeight: 20, color: colors.textSecondary, marginBottom: 29 },
  // PIERWSZE URUCHOMIENIE 10.08.2026 — jedyny akapit opisowy w tym kafelku.
  // Te same wartości co `heroBody` w zakładce „Ja", żeby oba ekrany pierwszego
  // uruchomienia czytały się jak jeden głos.
  heroFirstStepBody: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: 4, marginBottom: 10 },
  // JEDNA DROGA B2 08.08.2026 — wskaźnik pracy.
  workText: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary, marginBottom: 5 },
  // W1: ścięty koniec paska postępu (motyw 12°) — skewX na wypełnieniu,
  // lewa krawędź prostowana clipem toru (overflow hidden). Wysokość bez zmian.
  workTrack: { height: 4, borderRadius: 2, backgroundColor: colors.track, overflow: 'hidden' },
  workFill: { height: 4, backgroundColor: colors.brand, transform: [{ skewX: skew.angle }] },
  // ═══════════════════════════════════════════════════════════════
  // PLAN-D-T 08.2026 (13.08.2026), zadanie T1 — JEDNA ODPOWIEDŹ.
  //
  // Ta sama rodzina co `glosCard` i `heroGoal`: krecha 12° z logo, bo to jest
  // karta „to jest o Tobie", a nie pozycja listy. ⚠️ ŚWIADOMIE JEDNA RAMKA
  // NA TRZY CZĘŚCI — gdyby każda część miała własną, na ekranie stałyby trzy
  // kafelki zamiast trzech akapitów jednej odpowiedzi, czyli dokładnie to,
  // co ta runda likwiduje.
  // ═══════════════════════════════════════════════════════════════
  // ⭐⭐ PAS W1 — POPRAWKA PO ZRZUTACH: KARTA „CO DZIŚ ZROBIĆ" JEST
  // PANELEM CIEMNYM, tak jak `.voice` w makiecie v3.
  //
  // ⛔ Do tej poprawki była zwykłą kartą (`surface` + obrys). Na ciemnym
  // motywie wyglądała jak każda inna karta; po przestrojeniu palety na
  // jasną wyglądałaby jak KAŻDA INNA KARTA JESZCZE BARDZIEJ — biała na
  // prawie białym tle, odróżnialna wyłącznie kreską 1 dp.
  // ⭐ Makieta rysuje tu ODWRÓCENIE: tło `--ink`, tekst `#f5f2ec`. To jest
  // jedyny blok na tym ekranie, który odpowiada na pytanie, z którym
  // zawodnik wchodzi — i ma to być widać bez czytania.
  // ⚠️ Wartości 1:1 z `.voice`: promień 13, oddech 11/12.
  // ═══════════════════════════════════════════════════════════════
  odpowiedzCard: {
    backgroundColor: colors.textPrimary,
    borderRadius: 13, paddingVertical: 11, paddingHorizontal: 12, overflow: 'hidden',
  },
  /** `.voice .vl` — nadtytuł na panelu ciemnym. */
  voiceLabel: {
    ...typography.bodyMedium, fontSize: 9.5, letterSpacing: 1.3,
    textTransform: 'uppercase', color: colors.onInkMuted, marginBottom: 6,
  },
  /** `.voice .vs` — drugie zdanie, oddzielone kreską wewnątrz panelu. */
  voiceSub: {
    ...typography.body, fontSize: 11.5, lineHeight: 16.3, color: colors.onInkMuted,
    marginTop: 7, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.onInkLine,
  },
  /** Wejście w arkusz „cały materiał" — ⛔ WEWNĄTRZ obszaru dotykalnego karty. */
  cardWejscie: {
    ...typography.bodyMedium, fontSize: 11.5, color: colors.onInkAccent, marginTop: 8,
  },
  odpowiedzStripe: { ...skew.stripe, height: 6, backgroundColor: colors.onInkAccent, marginBottom: 12 },
  // Nadtytuły trzech części. Te same wartości co `sectionLabel`, bo to JEST
  // etykieta sekcji — tyle że wewnątrz karty, nie nad nią.
  odpowiedzNaglowek: {
    ...typography.bodyMedium, fontSize: 11, letterSpacing: 1,
    textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6,
  },
  // Jedna rzecz do zrobienia. Największy tekst w karcie — bo to jest
  // odpowiedź na pytanie, z którym zawodnik na ten ekran wchodzi.
  // ⭐ `.voice .vt` — 15 px, interlinia 1,36. ⛔ Kolor `onInk`, bo ten tekst
  // stoi WYŁĄCZNIE na panelu ciemnym (dwa użycia, oba w karcie „co dziś zrobić").
  odpowiedzTresc: { ...typography.bodySemiBold, fontSize: 15, lineHeight: 20.4, color: colors.onInk },
  // ⭐ PLAN-D-A1 18.08.2026 — ODSTĘP CZĘŚCI JEDNEJ ODPOWIEDZI: 16+14 → 10+8.
  // ⚠️ To NIE JEST kosmetyka. Te 30 dp chromu na część powstały wtedy, gdy pod
  // nimi stały CZTERY pozycje kolejki i trzeba je było od siebie odciąć. Od
  // 18.08 pozycja jest JEDNA, a kreska zostaje — bo rozdziela „co zrobić" od
  // „dlaczego". ⛔ Zdejmujemy odstęp, nie kreskę: kreska niesie znaczenie,
  // odstęp niósł sąsiedztwo, którego już nie ma. Zysk zmierzony: 24 dp z 862.
  odpowiedzCzesc: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  odpowiedzDlaczego: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  odpowiedzDowod: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textPrimary, marginBottom: 4 },
  // PLAN-D-B2 — dwa stany pustej kolejki i zdanie o niepełnej liście.
  // ⚠️ STYL JEST JEDEN, ZDANIA SĄ DWA. Rozróżnienie „pusto" / „nie wiem" nosi
  // TEKST, nie kolor — kolor zawodnik zapamiętuje, a znaczenia się nie domyśli.
  // ⛔ Stoi na tym samym panelu ciemnym co `odpowiedzTresc` — stąd `onInk`.
  // ⚠️ STYL JEST JEDEN, ZDANIA SĄ DWA. Rozróżnienie „pusto" / „nie wiem" nosi
  // TEKST, nie kolor — kolor zawodnik zapamiętuje, a znaczenia się nie domyśli.
  kolejkaPustka: { ...typography.body, fontSize: 15, lineHeight: 22, color: colors.onInk },
  kolejkaNiepelna: {
    ...typography.body, fontSize: 12, lineHeight: 18, color: colors.textTertiary,
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border,
  },
  // ⭐ PLAN-D-B4 — TRZECIA CZĘŚĆ WGLĄDU.
  // ⚠️ Te same wartości co `odpowiedzCzesc`: kreska u góry zamiast własnej
  // ramki, bo to jest CZĘŚĆ TEJ POZYCJI, a nie kafelek pod nią. Zawodnik ma
  // przeczytać „to należy do tego wglądu", nie „doszła kolejna karta".
  wgladCzesc: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  // Rzecz do zrobienia jest CZYNNOŚCIĄ, więc waży tyle, co treść, a nie tyle,
  // co przypis. Wgląd, którego trzecia część wygląda jak stopka, kończy się
  // na wiedzy mimo że formalnie ją ma (M4).
  wgladDoZrobienia: { ...typography.bodySemiBold, fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  // WG-34 — punkt osi: data i liczba, nic więcej. ⛔ Bez wykresu i bez
  // strzałek: „rośnie" jest interpretacją, a trzy daty z liczbami są pomiarem.
  osPunkt: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  // WIEDZA B4 08.08.2026 — PODPOWIEDŹ Z MATERIAŁU.
  // ⚠️ PLAN-D-T 08.2026 — od tej rundy `hintBox` rysuje WYŁĄCZNIE treść
  // ZAWSZE WIDOCZNĄ (bezpieczeństwo, m.in. telefon zaufania). Podpowiedź dnia
  // weszła do jednej odpowiedzi i nie ma już własnego kafelka.
  // Kreska u góry zamiast własnej ramki: to jest część TEJ karty, a nie druga
  // karta pod nią. Zawodnik ma przeczytać „to należy do tej rekomendacji", nie
  // „doszedł kolejny kafelek".
  hintBox: {
    marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  hintEyebrow: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6 }, // W1: ink3
  // Źródło w kolorze marki — to JEDYNA rzecz na tym ekranie, która mówi
  // zawodnikowi, że zdanie obok pochodzi z konkretnej strony konkretnej książki,
  // a nie z generatora. Dlatego nie jest szare.
  hintSource: { ...typography.bodySemiBold, color: colors.brand, letterSpacing: 0.5 },
  hintKind: { ...typography.bodySemiBold, fontSize: 13, color: colors.textPrimary, marginBottom: 4 },
  hintText: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textPrimary },
  // Stan „nie mam skąd wziąć" (reguła R5) — spokojny, szary, JAWNY. Nigdy pustka.
  hintQuiet: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  // ⭐ PAS W1 (D-6) — `paddingRight` = szerokość przycisku „+" plus oddech.
  // ⛔ Przycisk „+" jest nieprzezroczysty i stoi w pasie 730–794 dp; tekst,
  // który tam wjeżdża, jest tekstem, którego zawodnik NIE PRZECZYTA.
  inlineLink: { minHeight: minTouchHeight, justifyContent: 'center', paddingRight: wymiary.odstepPodPlusem },
  eventLine: { ...typography.body, fontSize: 14, color: colors.textPrimary, marginBottom: 6, lineHeight: 20 },
  eventTitle: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  // ═══════════════════════════════════════════════════════════════════
  // ⭐ PLAN-D-B5 — PRZEŁĄCZNIK, TYDZIEŃ NA KARCIE I LICZNIK PRACY.
  // ⚠️ Przełącznik ma DOKŁADNIE te same wartości, co zakładki Tydzień / Listy
  // w `app/(tabs)/kalendarz.tsx`. To jest ten sam element interfejsu w dwóch
  // miejscach; dwa różne wyglądy znaczyłyby, że zawodnik musi się go uczyć
  // dwa razy.
  // ═══════════════════════════════════════════════════════════════════
  seg: { flexDirection: 'row', backgroundColor: colors.surfaceElevated, borderRadius: radii.md, padding: 3, marginBottom: 14 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: minTouchHeight, borderRadius: radii.sm },
  segBtnOn: { backgroundColor: colors.surface },
  segTxt: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  segTxtOn: { ...typography.bodySemiBold, color: colors.textPrimary },
  kartaTydzienZakres: { ...typography.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6 },
  kartaTydzienZdanie: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginBottom: 12 },
  // ⛔ PAS W1 (T-8) — dzisiejszy dzień oznacza OBWÓDKA wiersza (`wdDzis`),
  // a nie barwa etykiety. Ten styl zostaje jako WZMOCNIENIE (pogrubienie),
  // żeby stan miał dwa nośniki, nie jeden.
  kartaDzienEtykietaDzis: { ...typography.bodySemiBold, color: colors.textPrimary },
  kartaPlakietka: { ...typography.bodyMedium, fontSize: 12, color: colors.textTertiary },
  // ═══════════════════════════════════════════════════════════════
  // ⛔ PAS W1 18.08.2026 — SIEDEM MARTWYCH STYLÓW SKREŚLONYCH, IMIENNIE:
  // `kartaDzienRzad`, `kartaDzienEtykieta`, `kartaDzienTresc`,
  // `kartaDzienPusty`, `kartaPozycja`, `kartaPozycjaTytul`,
  // `kartaPozycjaOdwolana`.
  // ⛔ NIC Z NICH NIE ZNIKŁO Z PRODUKTU — wszystkie siedem rysowało STARY
  // wiersz dnia (goły rząd tekstu z wyliczanką nazw pozycji), który defekty
  // T-1…T-5 kazały zastąpić kartą ze słupkiem (`styles.wd` i sąsiednie).
  // Ostatni z nich, `kartaPozycjaOdwolana`, niósł PRZEKREŚLENIE — czyli
  // dokładnie to, czego zabrania T-4. Zostawienie go tu jako „nieużywanego"
  // znaczyłoby, że kreska czeka na powrót.
  // ⚠️ Martwy styl wygląda tak samo jak żywy i rozjeżdża się przy pierwszej
  // poprawce motywu — ta sama choroba, którą pas S2 leczył na brzmieniach.
  // ═══════════════════════════════════════════════════════════════
  licznikCzesc: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  licznikLiczba: { ...typography.bodySemiBold, fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  // ⛔ CELOWO TEN SAM ROZMIAR, CO `licznikLiczba`, A NIE MNIEJSZY. Zdanie
  // „nie wiem, które się odbyły" jest pełnoprawną odpowiedzią, a nie
  // przypisem do liczby, której nie ma.
  licznikBrakPodstawy: { ...typography.bodySemiBold, fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  licznikPodpis: {
    ...typography.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: 4,
    // ⭐ PAS W1 (D-6, D-8) — przypis ekranu „Dziś" stoi w pasie przycisku „+".
    paddingRight: wymiary.odstepPodPlusem,
  },
  // ⭐ PLAN-D-D2 — PYTANIE „ZROBIŁEŚ?". Cztery style, wszystkie w istniejącej
  // skali karty; zdanie pytające używa `licznikLiczba`, czyli tego samego
  // rozmiaru co liczby obok — pytanie nie jest przypisem do licznika.
  pytanieWiersz: { marginTop: 10 },
  pytanieOdpowiedzi: { flexDirection: 'row', gap: 8, marginTop: 8 },
  // ⚠️ `minHeight: minTouchHeight` NIE JEST OZDOBĄ i nie jest kopiowane
  // z nawyku: cel dotykowy mniejszy od progu to akcja, której zawodnik nie
  // trafia, a nietrafiona akcja wygląda dokładnie jak akcja niechciana.
  // ⛔ Tu kosztuje to więcej niż gdzie indziej: obok siebie stoją DWA
  // przyciski o przeciwnym znaczeniu.
  pytanieBtn: {
    minHeight: minTouchHeight, justifyContent: 'center', paddingHorizontal: 12,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, backgroundColor: colors.surface,
  },
  // ⭐ WYBRANA ODPOWIEDŹ MA BYĆ WIDOCZNA, a nie domyślna: bez tego zawodnik
  // nie wie, czy jego dotknięcie doszło, i dotyka drugi raz.
  pytanieBtnWybrany: { borderColor: colors.brand, backgroundColor: colors.okSoft },
  pytanieBtnTxt: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  pytanieBtnTxtWybrany: { color: colors.textPrimary },
  pytanieBlad: { ...typography.body, fontSize: 13, lineHeight: 19, color: colors.error, marginTop: 8 },
  // ⭐ PLAN-D-O1 — KROKI 2–4 SĄ WCIĘTE I ODDZIELONE KRESKĄ Z LEWEJ. To nie
  // jest ozdoba: wcięcie mówi, że należą DO ODPOWIEDZI wyżej, a nie stoją
  // obok niej jako osobne pytania. ⛔ Bez tego zawodnik czyta trzy nowe
  // pytania zamiast trzech dobrowolnych dopisków do jednej odpowiedzi.
  ocenaKroki: { marginTop: 8, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: colors.border },
  ocenaKrokNaglowek: { minHeight: minTouchHeight, justifyContent: 'center' },
  ocenaKrokTytul: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  // ⭐ PLAN-D-C4 — DOROBEK. Trzy style, wszystkie w istniejącej skali karty.
  nagrodaPodnaglowek: { ...typography.bodySemiBold, fontSize: 12, lineHeight: 18, letterSpacing: 0.4, color: colors.textSecondary, marginTop: 10, textTransform: 'uppercase' },
  // ⛔ CELOWO PEŁNY ROZMIAR TEKSTU, A NIE PRZYPIS. Zdanie „za jaką pracę"
  // jest treścią odznaki — bez niego zostaje sama naklejka (M4).
  nagrodaOdznaka: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textPrimary, marginTop: 4 },
  // ⛔ TEN SAM ROZMIAR, CO LICZBA. „Ile pracy Ci brakuje" jest pełnoprawną
  // odpowiedzią, a nie dopiskiem — i jest jedyną rzeczą na tym bloku, która
  // mówi zawodnikowi, co ma zrobić dalej.
  nagrodaNastepny: { ...typography.bodySemiBold, fontSize: 15, lineHeight: 21, color: colors.textPrimary, marginTop: 10 },
});
