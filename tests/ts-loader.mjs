// ═══════════════════════════════════════════════════════════════════
// HOOK ROZWIĄZYWANIA IMPORTÓW — PLAN-D 18.08.2026
// ═══════════════════════════════════════════════════════════════════
//
// ⭐ PO CO TO ISTNIEJE. Do 18.08 runner uruchamiał strażników przez `npx tsx`.
// To działało, dopóki nikt nie użył `await` na najwyższym poziomie modułu:
// `tsx` transpiluje `.ts` do CommonJS (bo `package.json` nie ma `"type":"module"`),
// a w CJS `await` na najwyższym poziomie **nie istnieje**. Skutek zmierzony
// u Kuby 18.08: `lib/ekranProfilu.selftest.ts` kończył się kodem 1 i ⛔ NIE
// WYPISYWAŁ PODSUMOWANIA — czyli wyglądał jak strażnik, który nic nie sprawdził,
// choć w środowisku ESM przechodzi 59 asercji na 59.
//
// ⛔ TO NIE BYŁ DEFEKT KODU. To był defekt narzędzia — i taki, który
// PODAWAŁ SIĘ ZA defekt kodu. Najgorszy możliwy rodzaj.
//
// ⭐ CO ROBI TEN PLIK. Node uruchamia `.ts` natywnie (zdejmuje typy) i traktuje
// je jako ESM — więc `await` na najwyższym poziomie działa. Node wymaga jednak
// PEŁNYCH ścieżek w imporcie, a repozytorium pisze `from './widokTygodnia'`.
// Ten hook dokłada brakujące rozszerzenie i nie robi nic więcej.
//
// ⛔ CZEGO TEN PLIK NIE ROBI: nie kompiluje, nie sprawdza typów, nie zmienia
// kodu. Sprawdzenie typów robi `npx tsc --noEmit` i nic go nie zastąpi.

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DOKLADANE = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

export async function resolve(specyfikator, kontekst, dalej) {
  // ⛔ Tylko ścieżki względne i bezwzględne. Paczki z `node_modules`
  // rozwiązuje Node po swojemu — nie mamy tam nic do dodania.
  if (!specyfikator.startsWith('.') && !specyfikator.startsWith('/')) {
    return dalej(specyfikator, kontekst);
  }
  try {
    return await dalej(specyfikator, kontekst);
  } catch (pierwotny) {
    for (const koncowka of DOKLADANE) {
      try {
        const wynik = await dalej(specyfikator + koncowka, kontekst);
        // ⚠️ `dalej` potrafi oddać URL pliku, którego nie ma — sprawdzamy sami,
        // zamiast wierzyć na słowo (Z0).
        if (existsSync(fileURLToPath(wynik.url))) return wynik;
      } catch { /* próbujemy następnego rozszerzenia */ }
    }
    throw pierwotny;
  }
}
