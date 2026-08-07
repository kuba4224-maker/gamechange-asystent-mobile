// Ekran WIĘCEJ — USUNIĘTY Z PRODUKTU 08.08.2026.
//
// NAWIGACJA B3 08.08.2026 (decyzja B8, claude/DECYZJE_PRODUKTOWE_07_08_2026.md)
// „Więcej" był rozdzielaczem do listy linków — czterema wierszami, które nic nie
// mówiły zawodnikowi o nim samym. Zastąpiła go zakładka „Ja" (app/(tabs)/ja.tsx):
// zaczyna się od skrótu profilu z diagnozy, a wejścia stoją pod nim.
//
// DLACZEGO PLIK ZOSTAJE, ZAMIAST ZNIKNĄĆ:
//  1. Sesja delegowana nie kasuje plików z dysku Kuby — kasowanie jest po
//     stronie człowieka, który widzi `git diff`. Do usunięcia: ten plik oraz
//     wpis `wiecej` w app/(tabs)/_layout.tsx (oba naraz, nie osobno).
//  2. Dopóki plik tu leży, Expo Router i tak zarejestruje trasę `/wiecej`.
//     Lepiej, żeby prowadziła tam, gdzie zawodnik ma trafić, niż pokazywała
//     martwy ekran — gdyby gdzieś został link, którego nie wyłapaliśmy.
//     (Przeszukane: żaden plik w pasie nie odwołuje się już do `/wiecej`.)
import { Redirect } from 'expo-router';

export default function WiecejScreen() {
  return <Redirect href="/ja" />;
}
