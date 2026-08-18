// PLAN-D-N 08.2026 (13.08.2026) — NOWY PLIK.
//
//   npx tsx lib/ostatniCentymetr.selftest.ts
//   albo razem z resztą: node tests/run-selftests.mjs
//
// ── PO CO TEN PLIK ISTNIEJE ───────────────────────────────────────────
// Audyt zgodności z wizją (pas M, 12.08.2026) policzył 84 obietnice makiet
// i ustaleń. Z tego 26 miało stan „JEST, ALE MARTWE": kod istnieje, jest
// poprawny, ma testy — i zawodnik nigdy tego nie zobaczy, bo ostatni centymetr
// (jedno wywołanie, jedna kolejność linijek, jeden warunek) był poza zakresem
// pasa, który daną rzecz budował. Każda z tych 26 pozycji przeszła przez raport
// jako ZROBIONA i każda naprawdę była zrobiona.
//
// Wszystkie selftesty w tym katalogu sprawdzają CZYSTE FUNKCJE. Żaden z nich
// nie umiał złapać żadnego z tych 26 defektów, bo one nie siedzą w funkcjach,
// tylko w SPOSOBIE, W JAKI EKRAN JE WOŁA. Ten plik pilnuje dokładnie tego —
// czyta źródła komponentów jako tekst i sprawdza kształt wywołań.
//
// ⚠️ CZEGO TEN PLIK NIE UDAJE. To nie jest test — to jest strażnik regresji na
// tekście źródłowym. Nie uruchamia Reacta, nie dotyka Supabase i nie wie, czy
// ekran się rysuje. Przechodzi, dopóki nikt nie przywrócił KONKRETNEGO defektu,
// który już raz kosztował produkt cały ekran. Zamiana wywołania na inne, równie
// zepsute, przejdzie tu niezauważona — i dlatego każda asercja niżej mówi
// wprost, co dokładnie było zepsute i jak to zmierzono.
//
// ⚠️ REGUŁA, KTÓREJ TO SŁUŻY (audyt M, sekcja 6.7): zadanie nie jest skończone,
// dopóki zawodnik tego nie widzi. Ten plik jest pierwszym miejscem, w którym ta
// reguła cokolwiek MIERZY, zamiast być zdaniem w kontrakcie.
//
// ⚠️ 13.08.2026 (PLAN-D-P): plik schodzi z 12 asercji do 5. Zniknęły dwie całe
// sekcje — (N4) i (N2) — obie razem z rzeczami, których pilnowały. Powody
// stoją w sekcji 2 niżej, wypisane co do sztuki, zamiast po cichu.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Źródło BEZ komentarzy.
 *
 * ⚠️ TO NIE JEST OZDOBNIK. Pliki w tym projekcie mają długie komentarze, które
 * CYTUJĄ zepsute wywołania („do 13.08.2026 stało tu `rpc('account_state', …)`").
 * Strażnik czytający surowy tekst zapalałby się na własnej dokumentacji, więc
 * jedynym sposobem, żeby go uciszyć, byłoby usunięcie wyjaśnienia — czyli
 * dokładnie tej wiedzy, dla której ten plik powstał.
 *
 * ⛔ TA FUNKCJA MIAŁA DEFEKT KOLEJNOŚCI — PLAN-D-Q1 17.08.2026.
 * Do 17.08.2026 stało tu `.replace(/\/\*[\s\S]*?\*\//g, '')` W PIERWSZYM KROKU,
 * a dopiero potem odcinane były całe linie `//`. Blok wycinany był więc
 * z tekstu, w którym komentarze `//` JESZCZE BYŁY — i komentarz cytujący
 * ścieżkę w rodzaju `lib/*.selftest.ts` albo `app/**` otwierał „blok",
 * który leciał aż do NASTĘPNEGO `*\/` w pliku, zjadając po drodze prawdziwy
 * kod. W strażniku pasa M2 zjadało to 25 065 znaków, czyli 87 % pliku,
 * a asercje przechodziły — bo pytały o tekst, którego już nie było.
 *
 * ⛔ KOLEJNOŚCI DWÓCH `replace` NIE DA SIĘ USTAWIĆ DOBRZE: przy odwrotnej
 * kolejności blok komentarza zawierający `//` gubi swoje zamknięcie. Tekst
 * trzeba przejść RAZ i pilnować, w czym się jest — dokładnie tak, jak zrobił
 * to pas M2 w `lib/wysokoscEkranu.selftest.ts`. Jedna choroba, jedno lekarstwo.
 *
 * ⚠️ ZMIANA ZACHOWANIA, ŚWIADOMA: skaner odcina także komentarz doklejony ZA
 * kodem (dawna wersja go zostawiała). ⛔ DLATEGO ZNA NAPISY — inaczej
 * `'https://…'` urywałby się na `//` i strażnik przestałby widzieć stałe
 * z adresem. Zmierzone 17.08.2026: sam kształt z pasa M2, bez gałęzi napisu,
 * gubi 11 524 znaki znaczące w 17 plikach `app/`, `components/` i `lib/`.
 * ⚠️ CZEGO NADAL NIE UMIE: `//` wewnątrz LITERAŁU WYRAŻENIA REGULARNEGO
 * (np. `/\/\*[\s\S]*?\*\//g`) nadal urywa linię. Asercje tego pliku pytają
 * o kształt wywołań `supabase.rpc(…)`, więc to nie przeszkadza — ale kto doda
 * asercję o wyrażeniu regularnym, ma to wiedzieć (O97).
 */
const bezKomentarzy = (s: string): string => {
  let out = '';
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (c === '/' && s[i + 1] === '/') {
      const k = s.indexOf('\n', i);
      i = k === -1 ? s.length : k;
      continue;
    }
    if (c === '/' && s[i + 1] === '*') {
      const k = s.indexOf('*/', i + 2);
      i = k === -1 ? s.length : k + 2;
      continue;
    }
    // ⛔ NAPIS NIE JEST KOMENTARZEM. Bez tej gałęzi `'https://…'` urywało się
    // na `//` — zmierzone 17.08.2026: 11 524 znaki znaczące w 17 plikach
    // (adresy, `textTransform`, ścieżki). Strażnik ślepy na stałą z adresem
    // jest tym samym defektem, tylko z drugiej strony.
    if (c === '\'' || c === '"' || c === '`') {
      const cudz = c;
      out += c;
      i++;
      while (i < s.length) {
        if (s[i] === '\\') { out += s[i] + (s[i + 1] ?? ''); i += 2; continue; }
        if (s[i] === cudz) { out += s[i]; i++; break; }
        if (cudz !== '`' && s[i] === '\n') break;
        out += s[i];
        i++;
      }
      continue;
    }
    out += c;
    i++;
  }
  return out;
};

const zrodlo = (wzgledna: string): string => bezKomentarzy(readFileSync(join(root, wzgledna), 'utf8'));

/** Surowy plik — do asercji, które mają widzieć także komentarze i napisy. */
const zrodloSurowe = (wzgledna: string): string => readFileSync(join(root, wzgledna), 'utf8');

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail: string) {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}\n       ${detail}`); }
}

// ═══════════════════════════════════════════════════════════════════
// 1. `account_state` — WYWOŁANIE MUSI PASOWAĆ DO PODPISU W BAZIE
// ═══════════════════════════════════════════════════════════════════
// PODPIS ZMIERZONY NA ŻYWEJ BAZIE 13.08.2026:
//     select pronargs, pg_get_function_identity_arguments(oid)
//       from pg_proc where proname = 'account_state';
//     → pronargs = 0, argumenty []
//
// CO SIĘ STAŁO. 11.08.2026 funkcja miała podpis `(p_user uuid DEFAULT auth.uid())`
// i Mapa słusznie podawała `p_user` jawnie. 12.08.2026 migracja `20260812135901`
// skasowała wariant `(uuid)` z uzasadnieniem „Appka woła ją bez argumentów" —
// zdaniem nieprawdziwym, którego nikt nie sprawdził `grep`em. PostgREST dopasowuje
// funkcje po NAZWACH parametrów (O33), więc wywołanie z `{ p_user }` przestało
// trafiać w cokolwiek, `accountState` schodziło na `null`, `dostepMapy(null)`
// dawało `odcinek: false` — i CAŁA MAPA DROGI BYŁA MARTWA U KAŻDEGO ZAWODNIKA.
// Nie rzuciło to żadnego wyjątku i nie zapaliło żadnego testu.
{
  const mapa = zrodlo('components/MojaDroga.tsx');
  const wszystkie = mapa.match(/supabase\.rpc\(\s*['"]account_state['"][^)]*\)/g) ?? [];

  check('(N1) Mapa woła `account_state` dokładnie raz — bez cichej ścieżki odzysku',
    wszystkie.length === 1, JSON.stringify(wszystkie));
  check('(N1) …i woła ją BEZ ARGUMENTÓW, bo funkcja w bazie ma pronargs = 0',
    wszystkie.length === 1 && /supabase\.rpc\(\s*['"]account_state['"]\s*\)/.test(wszystkie[0]),
    `wywołanie w kodzie: ${wszystkie[0] ?? '(brak)'} — argumenty nie pasują do podpisu z bazy, `
    + 'PostgREST nie dopasuje funkcji i Mapa zgaśnie u WSZYSTKICH');
  check('(N1) nigdzie nie wróciło `p_user` przy tym wywołaniu',
    !/rpc\(\s*['"]account_state['"]\s*,/.test(mapa), 'wywołanie znów podaje argument');

  // Wiedza, która kosztowała cały ekran, ma zostać w pliku. Gdyby ktoś skasował
  // wyjaśnienie, następna osoba „poprawiłaby" to wywołanie z powrotem.
  const surowe = zrodloSurowe('components/MojaDroga.tsx');
  check('(N1) plik nadal tłumaczy, DLACZEGO bez argumentów — z datą pomiaru',
    surowe.includes('pronargs = 0') && surowe.includes('13.08.2026'),
    'zniknęło uzasadnienie zmierzonego podpisu — bez niego ta linijka wygląda na literówkę');
}

// ═══════════════════════════════════════════════════════════════════
// 2. ⚠️ TU BYŁY DWIE SEKCJE I OBIE ZNIKŁY 13.08.2026 (PLAN-D-P)
// ═══════════════════════════════════════════════════════════════════
// Nazywam to wprost, zamiast po cichu skrócić plik — spadek liczby asercji
// bez powodu wygląda przy następnym czytaniu jak zgubiony test.
//
// (N4) „CZEKAM NA DECYZJĘ" TO NIE JEST „ODPADŁEM" — trzy asercje.
// Pilnowały, żeby Mapa przełączała wariant „po deselekcji" wyłącznie przy
// `exit_mode.state = 'active'`, a nie przy każdym otwartym wierszu.
// ⚠️ TA RUNDA COFA ZADANIE N4 I TAK MA BYĆ. Stan `paused_decision` został
// skasowany w całości (pas P, zadanie P8): nie dało się go nigdzie włączyć,
// a CHECK w bazie zwęża się do `('active','closed')`. Po tej zmianie „otwarty
// wiersz" i „wiersz aktywny" to jedno i to samo, więc asercja pilnowałaby
// rozróżnienia, którego już nie ma. Gdyby stan kiedyś wrócił, ta sekcja MUSI
// wrócić razem z nim — opis, czym był, jest w nocie przekazania pasa P.
//
// (N2) CZTERY LICZNIKI ZACHOWANIA — cztery asercje.
// Pilnowały KOLEJNOŚCI: `setSladLinie(opiszSlad…)` po `await load()`, nie
// przed. Czytały `components/Kalibracja.tsx`, a tego pliku nie ma
// (claude/DECYZJA_KALIBRACJA_USUNIETA_13_08_2026.md), więc `readFileSync`
// rzuciłby wyjątkiem i wywrócił CAŁY ten strażnik — łącznie z asercjami (N1),
// które mają zostać nietknięte.
// ⚠️ AKTUALIZACJA 17.08.2026 (PLAN-D-L1): `lib/sladZachowania.ts` JUŻ NIE
// ISTNIEJE. Do 17.08 stało tu zdanie „sam plik ZOSTAJE i jego selftest nadal
// przechodzi" — pas L1 usunął plik razem z selftestem po dowodzie zera
// importerów w całym repozytorium poza własnym selftestem. Znikła najpierw
// karta (13.08), potem licznik (17.08). ⛔ Nagrobek — co ten moduł liczył,
// co zostało w bazie i co trzeba zrobić, żeby wrócił — stoi w nocie
// `claude/PRZEKAZANIE_PAS_L1_17_08_2026.md`, nie w kodzie.

// ═══════════════════════════════════════════════════════════════════
// 4. STRAŻNIK STRAŻNIKA
// ═══════════════════════════════════════════════════════════════════
// Wszystkie asercje wyżej czytają pliki z dysku. Gdyby ścieżka się rozjechała,
// `readFileSync` rzuci — ale gdyby plik istniał i był pusty albo gdyby ktoś
// przeniósł logikę gdzie indziej, testy przechodziłyby, nie sprawdzając nic.
{
  const mapa = zrodlo('components/MojaDroga.tsx');
  check('plik, który ten strażnik czyta, naprawdę zawiera badaną logikę',
    mapa.includes('supabase.rpc(') && mapa.includes('exit_mode'),
    `MojaDroga=${mapa.length}B`);
}


// ═══════════════════════════════════════════════════════════════════
// 5. ⭐ PLAN-D-Q1 17.08.2026 — ZAPADKA NA STRAŻNIKA, KTÓRY ZJADA ŹRÓDŁO
// ═══════════════════════════════════════════════════════════════════
//
// ⛔ TEN DEFEKT WRÓCIŁ JUŻ DWA RAZY (pasy M1 i M2) i za każdym razem asercje
// były ZIELONE, bo pytały o tekst, którego już nie było. Wzorzec: funkcja
// odcinająca komentarze woła najpierw `.replace(/\/\*…\*\//g, '')`, a DOPIERO
// POTEM linie `//`. Blok jest więc wycinany z tekstu, w którym komentarze `//`
// jeszcze stoją — a wystarczy jeden komentarz cytujący ścieżkę w rodzaju
// `lib/*.selftest.ts` albo `app/**`, żeby „blok" poleciał aż do następnego
// `*/`, zjadając po drodze kod.
//
// ⚠️ SZUKAMY PO TREŚCI, NIE PO NAZWIE FUNKCJI (O88): te funkcje nazywają się
// w repozytorium `bezKomentarzy`, `zywyKod`, `zyweZrodlo` i `kod` — nazwa nic
// nie pilnuje. Pytamy o KSZTAŁT wywołania w linii żywego kodu.
//
// ⛔ ZAPADKA JEST NA RÓWNOŚĆ (O73), nie na „≤". Kto dopisze kolejny plik z tym
// wzorcem, zobaczy czerwień i podejmie decyzję świadomie. Kto NAPRAWI kolejny,
// obniży tę liczbę o jeden — i to też jest decyzja, którą widać.
{
  const KORZENIE = ['app', 'components', 'lib', 'tests', 'constants'];
  const przemiec = (dir: string, zebrane: string[] = []): string[] => {
    // ⚠️ BEZ ADNOTACJI TYPU — świadomie. `ReturnType<typeof readdirSync>` wybiera
    // przeciążenie oddające `Dirent<Buffer>`, więc na nowszym `@types/node`
    // `w.name` przestaje być napisem i plik nie kompiluje się (6 błędów, 18.08).
    // ⛔ Ten defekt NIE pochodzi z rundy przebudowy — stoi w repozytorium od dawna.
    const wpisy = (() => {
      try { return readdirSync(dir, { withFileTypes: true }); } catch { return null; }
    })();
    if (wpisy === null) return zebrane;
    for (const w of wpisy) {
      if (w.name === 'node_modules' || w.name.startsWith('.') || w.name === '_diag_backup') continue;
      const pelna = join(dir, w.name);
      if (w.isDirectory()) przemiec(pelna, zebrane);
      else if (/\.tsx?$/.test(w.name)) zebrane.push(pelna);
    }
    return zebrane;
  };
  const wszystkie = KORZENIE.flatMap((k) => przemiec(join(root, k)));

  // ⚠️ „ŻYWA LINIA" LICZONA NA SUROWYM TEKŚCIE, nie przez `bezKomentarzy`.
  // Powód jest policzalny: szukany wzorzec SAM JEST literałem wyrażenia
  // regularnego zawierającym `//`, a skaner wyżej takiego literału nie zna
  // i uciąłby linię (O97 — strażnik może mieć rację co do różnicy i mylić się
  // co do sumy). Odcinamy więc wyłącznie linie, które SĄ komentarzem: zdanie
  // „do 17.08 stało tu …" ma prawo zostać w pliku (O67).
  const zyweLinie = (t: string): string =>
    t.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');

  const WZORZEC_BLOK_PRZED_LINIA = /\.replace\(\s*\/\\\/\\\*\[\\s\\S\]\*\?\\\*\\\/\/g/;

  check('⛔ O69 — przemiatanie w ogóle coś znalazło (inaczej zapadka niżej jest pusta)',
    wszystkie.length > 100, `plików .ts/.tsx: ${wszystkie.length}`);

  const zWzorcem = wszystkie
    .filter((f) => WZORZEC_BLOK_PRZED_LINIA.test(zyweLinie(readFileSync(f, 'utf8'))))
    .map((f) => f.slice(root.length + 1))
    .sort();

  // ⭐ LICZBA ZMIERZONA 17.08.2026, PO NAPRAWIE DWÓCH PLIKÓW (pas Q1).
  // Przed naprawą było 37: te 35 plus `lib/ostatniCentymetr.selftest.ts`
  // i `lib/pustkaWCalymRepo.selftest.ts`.
  // ⭐ AKTUALIZACJA 17.08.2026, PAS L1: 35 → 33. Liczba SPADŁA O DWA i to jest
  // dobra wiadomość — pas L1 usunął `lib/arbiterGlosu.selftest.ts`
  // i `lib/sladZachowania.selftest.ts` razem z ich modułami (D7, dowód zera
  // konsumentów). ⛔ Nie naprawiono tam niczego: pliki po prostu przestały
  // istnieć. Nagrobek jest w `claude/PRZEKAZANIE_PAS_L1_17_08_2026.md`.
  // ⭐ AKTUALIZACJA 18.08.2026, PAS S1: 33 → 37. Liczba WZROSŁA O CZTERY i to
  // NIE JEST regres: pas A1 dopisał 18.08.2026 czterech nowych strażników
  // (`lib/arkusz.selftest.ts`, `lib/dodanieWstecz.selftest.ts`,
  // `lib/meczWiecej.selftest.ts`, `lib/nawigacja.selftest.ts`), a każdy z nich
  // używa TEGO SAMEGO, poprawnego idiomu `bezKomentarzy` co pozostałe 33 —
  // czyli ma wzorzec w pliku, ale nie zjada nim własnego źródła. Dowodzi tego
  // asercja D5 niżej, która na wszystkich 37 plikach nadal pokazuje ZERO.
  // ⛔ Liczba jest przestawiona, nie poluzowana: nadal jest to RÓWNOŚĆ, więc
  // piąty taki plik zapali ją tak samo jak dotąd.
  // ⚠️ Nowe pliki pasa S1 (`components/WgladPozycji.tsx`) NIE SĄ na tej liście
  // — sprawdzone uruchomieniem 18.08.2026.
  // ⭐ AKTUALIZACJA 18.08.2026, PAS W1: 37 → 38. Liczba WZROSŁA O JEDEN i to
  // NIE JEST regres: pas W1 dopisał `lib/wygladW1.selftest.ts` — strażnika
  // umowy o wyglądzie (§7 polecenia W1: czerwień tylko przy ostrzeżeniu, zero
  // oceny przy obciążeniu, dwa nośniki na kafel, zero „AU", nic pod „+",
  // zero rzeczy przeciętych zgięciem). Powstał, bo bateria mutacji tego pasa
  // wykazała, że PIĘĆ z tych reguł nie miało w repozytorium ANI JEDNEJ asercji.
  // Używa tego samego, poprawnego idiomu `bezKomentarzy` co pozostałe 37.
  // ⛔ Liczba jest przestawiona, nie poluzowana: nadal RÓWNOŚĆ.
  const PLIKOW_Z_WZORCEM_18_08_2026 = 38;
  check(`⭐ D6 ZAPADKA NA RÓWNOŚĆ — plików z wzorcem „blok przed linią" jest DOKŁADNIE ${PLIKOW_Z_WZORCEM_18_08_2026}`,
    zWzorcem.length === PLIKOW_Z_WZORCEM_18_08_2026,
    `${zWzorcem.length}: ${zWzorcem.join(', ')} — ⛔ jeżeli liczba WZROSŁA, ktoś dopisał `
    + 'strażnika, który może zjeść własne źródło: przejdź tekst RAZ, jak `bezKomentarzy` '
    + 'w tym pliku. Jeżeli SPADŁA — napraw tę liczbę, to dobra wiadomość.');

  check('⛔ …i NIE MA wśród nich dwóch plików naprawionych pasem Q1',
    !zWzorcem.includes('lib/ostatniCentymetr.selftest.ts')
    && !zWzorcem.includes('lib/pustkaWCalymRepo.selftest.ts'),
    `wróciło do: ${zWzorcem.filter((f) => f.includes('ostatniCentymetr') || f.includes('pustkaWCalymRepo')).join(', ')}`);

  // ⭐ URUCHOMIENIOWO — CZY WZORZEC KTÓREMUŚ Z NICH COŚ DZIŚ ZJADA.
  // ⛔ Sama obecność wzorca jest bombą z opóźnionym zapłonem; ta asercja pyta,
  // czy któraś już wybuchła. Porównujemy DWIE kolejności o IDENTYCZNEJ
  // semantyce linii — różni je wyłącznie to, co idzie pierwsze.
  // ⛔ WYRAŻENIA SKŁADANE PRZEZ `new RegExp`, A NIE WPISANE JAKO LITERAŁ —
  // i to nie jest ozdobnik. Literał `/\/\*…/g` wpisany tutaj wprost trafiałby
  // we WŁASNĄ zapadkę wyżej: ten plik zameldowałby sam siebie jako plik
  // z wzorcem. Narzędzie pomiaru nie ma być mierzonym przypadkiem.
  const BLOK = new RegExp('/\\*[\\s\\S]*?\\*/', 'g');
  const LINIA = new RegExp('^[ \\t]*//.*$', 'gm');
  const OBIE_NARAZ = new RegExp('^[ \\t]*//.*$|/\\*[\\s\\S]*?\\*/', 'gm');
  const blokPrzedLinia = (t: string): string => t.replace(BLOK, '').replace(LINIA, '');
  const liniaPrzedBlokiem = (t: string): string => t.replace(OBIE_NARAZ, '');

  const zjadajace = zWzorcem
    .map((rel) => {
      const t = readFileSync(join(root, rel), 'utf8');
      return { rel, roznica: liniaPrzedBlokiem(t).length - blokPrzedLinia(t).length };
    })
    .filter((x) => x.roznica > 0);

  const ZJADAJACYCH_17_08_2026 = 0;
  check(`⭐ D5 URUCHOMIENIOWO — plików, w których ta kolejność COŚ DZIŚ ZJADA, jest ${ZJADAJACYCH_17_08_2026}`,
    zjadajace.length === ZJADAJACYCH_17_08_2026,
    `${zjadajace.length}: ${zjadajace.map((x) => `${x.rel} (${x.roznica} znaków)`).join(', ')} `
    + '— ⛔ ten plik ma dziś asercje pytające o tekst, którego jego własny strażnik już nie widzi');

  // ⛔ ASERCJA ODWROTNA — DETEKTOR MUSI UMIEĆ ZAPALIĆ SIĘ NA PRAWDZIWYM WEJŚCIU.
  // Zapadka, która nigdy nie zapala, jest ozdobą. Podajemy tekst z DOKŁADNIE
  // tym defektem i sprawdzamy, że obie miary go widzą.
  const CHORY = [
    '// patrz lib/*.selftest.ts',
    "const x = 1;",
    '/** blok */',
    'const y = 2;',
  ].join('\n');
  check('⭐ ASERCJA ODWROTNA — miara „zjada" zapala się na tekście z tym defektem',
    liniaPrzedBlokiem(CHORY).length - blokPrzedLinia(CHORY).length > 0,
    `różnica=${liniaPrzedBlokiem(CHORY).length - blokPrzedLinia(CHORY).length}`);
  check('⛔ …i NIE zapala się na tekście bez defektu',
    liniaPrzedBlokiem('// zwykły komentarz\nconst x = 1;\n/** blok */\nconst y = 2;\n').length
    - blokPrzedLinia('// zwykły komentarz\nconst x = 1;\n/** blok */\nconst y = 2;\n').length === 0,
    'miara zapala się wszędzie — nic nie mierzy');

  // ⭐ TEN PLIK MA MIEĆ NAPRAWĘ, A NIE TYLKO JEJ OPIS.
  const wlasne = readFileSync(join(root, 'lib', 'ostatniCentymetr.selftest.ts'), 'utf8');
  check('⛔ `bezKomentarzy` w TYM pliku przechodzi tekst RAZ (jest pętlą, nie parą `replace`)',
    /const bezKomentarzy = \(s: string\): string => \{[\s\S]{0,200}for \(let i = 0/.test(wlasne),
    'wróciła para `replace` — defekt wraca razem z nią');
  check('⛔ …i zna napisy, więc `https://…` nie urywa się na `//`',
    bezKomentarzy("const u = 'https://a.example/b';").includes('https://a.example/b'),
    bezKomentarzy("const u = 'https://a.example/b';"));
  // ⚠️ WEJŚCIE MUSI MIEĆ BLOK ZA KOMENTARZEM. Bez `/** … */` niżej stary,
  // zepsuty kształt też by przeszedł: „blok" otwarty w komentarzu nie miałby
  // gdzie się domknąć i nic by nie zjadł. Defekt widać dopiero wtedy, gdy
  // w pliku dalej stoi jakiekolwiek `*/` — a stoi w każdym pliku tego repo.
  const PULAPKA = '// patrz lib/*.selftest.ts\nconst zostaje = 1;\n/** blok */\nconst tez = 2;\n';
  check('⭐ …i komentarz `//` cytujący `/*` NIE zjada kodu aż do następnego `*\\/`',
    bezKomentarzy(PULAPKA).includes('const zostaje = 1;')
    && bezKomentarzy(PULAPKA).includes('const tez = 2;'),
    JSON.stringify(bezKomentarzy(PULAPKA)));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
