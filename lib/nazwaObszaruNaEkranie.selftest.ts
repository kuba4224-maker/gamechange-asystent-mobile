// ═══════════════════════════════════════════════════════════════════════
// PLAN-D-G1 08.2026 (15.08.2026) — NOWY PLIK.
// NAZWA OBSZARU NA EKRANIE: cztery pliki, jedenaście miejsc, dwie gałęzie.
//
//   npx tsx lib/nazwaObszaruNaEkranie.selftest.ts
// ═══════════════════════════════════════════════════════════════════════
//
// ── PO CO TEN PLIK ISTNIEJE, SKORO JEST JUŻ `surowaWartosc.selftest.ts` ──
//
// Tamten plik pilnuje NIEOBECNOŚCI: że nikt nie woła `segmentLabel()`. To jest
// dokładnie połowa dowodu — i to ta tańsza. Pas F1 zmierzył u siebie, czym
// kończy się druga połowa zostawiona bez strażnika: funkcja
// `computeFocusBlockProgressState` była zbudowana, przetestowana i **przez dobę
// nie narysowana przez żaden ekran**, a suita świeciła na zielono.
//
// ⛔ ZDJĘCIE `segmentLabel()` NIE JEST NAPRAWĄ. Naprawą jest to, że zawodnik
// czyta nazwę obszaru albo zdanie o naszej niewiedzy — i **żadnego surowego
// `id` z bazy**. Ten plik pilnuje tej drugiej połowy, i pilnuje jej dwiema
// drogami naraz:
//
//   1. **URUCHOMIENIOWO** — puszcza PRAWDZIWE funkcje (`describeCause`,
//      `groupSegmentsForDisplay`, `buildRediagnosisView`) na profilach
//      z nieznanym segmentem i patrzy, co wychodzi. Nie na tekst pliku.
//   2. **PRZEZ WYCIĘTĄ INSTRUKCJĘ (O71)** — dla dwóch ekranów, których logiki
//      nie da się uruchomić bez Reacta, WYCINA konkretną gałąź JSX i bada ją
//      osobno. ⚠️ Nigdy `plik.includes('…')` na całym pliku: pas F1 zmierzył,
//      że fraza szukana w całym pliku trafia nie w tę gałąź, co trzeba.
//
// ── TRZY PRZESŁANKI, KTÓRE MOGĄ UPAŚĆ (i dlatego mają tu asercje) ────────
// Sześć z jedenastu naprawionych miejsc ma dziś dziedzinę ZAMKNIĘTĄ — ale
// zamkniętą przez ZBIEG DWÓCH RĘCZNYCH LIST, a nie przez regułę. To jest
// mechanizm „uniewinnienia z dowodem" pasa F2 (§7.3) zastosowany do dziedzin:
// werdykt „to miejsce nie może dziś wyciec" stoi tu razem z asercją, która
// upadnie w dniu, w którym przesłanka przestanie być prawdziwa.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SEGMENT_LABELS,
  SEGMENT_ORDER,
  SEGMENTY_ZNANE,
  SEGMENT_NIEZNANY_KOMUNIKAT,
  opiszSegment,
  opisNieznanegoSegmentuDoLogu,
} from './labels';
import {
  describeCause,
  groupSegmentsForDisplay,
  getRelativeDeficits,
  getHiddenCauses,
  DEPENDENCY_NETWORK,
  DEPENDENCY_CASCADES,
} from '../components/diagnosisProfile';
import { buildRediagnosisView } from './rediagnosis';
import { LIVING_DIAGNOSIS_QUESTION_BANK } from './livingDiagnosisQuestionBank';
import { zyweZrodlo } from './trzyPustki';

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail = ''): void {
  if (cond) { passed++; console.log(`OK   - ${label}`); }
  else { failed++; console.log(`FAIL - ${label}: ${detail}`); }
}

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const zrodlo = (p: string): string => {
  const pelna = join(appRoot, p);
  if (!existsSync(pelna)) return '';
  return zyweZrodlo(readFileSync(pelna, 'utf8'));
};

/**
 * ⭐ WYCINA INSTRUKCJĘ, NIE SZUKA FRAZY (**O71**).
 * Od `igla` do zbilansowania nawiasów klamrowych. Zwraca `''`, gdy igły nie ma —
 * i to samo w sobie jest wynikiem, który zapala asercję.
 */
function wytnijBlok(zywy: string, igla: string): string {
  const start = zywy.indexOf(igla);
  if (start < 0) return '';
  let i = zywy.indexOf('{', start);
  if (i < 0) return '';
  let glebokosc = 0;
  for (let k = i; k < zywy.length; k++) {
    if (zywy[k] === '{') glebokosc++;
    else if (zywy[k] === '}') {
      glebokosc--;
      if (glebokosc === 0) return zywy.slice(start, k + 1);
    }
  }
  return '';
}

const PLIK_JA = 'app/(tabs)/ja.tsx';
const PLIK_WIDOK = 'components/DiagnosisProfileView.tsx';
const PLIK_PROFIL = 'components/diagnosisProfile.ts';
const PLIK_REDIAGNOZA = 'lib/rediagnosis.ts';
const CZTERY_PLIKI = [PLIK_JA, PLIK_WIDOK, PLIK_PROFIL, PLIK_REDIAGNOZA];

console.log('nazwaObszaruNaEkranie.selftest.ts — PLAN-D-G1: 11 miejsc, dwie gałęzie\n');

// ═════════════════════════════════════════════════════════════════════
console.log('1. ⭐ PRZESŁANKI DZIEDZIN — werdykt „to miejsce nie może dziś wyciec" z dowodem');
// ═════════════════════════════════════════════════════════════════════
{
  const znane = new Set(SEGMENTY_ZNANE);

  check('⭐ PRZESŁANKA `groupSegmentsForDisplay`: `SEGMENT_ORDER` i klucze `SEGMENT_LABELS` '
    + 'to TEN SAM zbiór — dlatego pętla po `SEGMENT_ORDER` nie może dziś wyciec',
    SEGMENT_ORDER.length === znane.size
    && SEGMENT_ORDER.every((id) => znane.has(id))
    && [...znane].every((id) => SEGMENT_ORDER.includes(id)),
    `SEGMENT_ORDER: ${SEGMENT_ORDER.length}, SEGMENT_LABELS: ${znane.size}, `
    + `różnica: ${SEGMENT_ORDER.filter((id) => !znane.has(id)).join(', ')}`);

  const sieciowe = new Set<string>();
  for (const r of DEPENDENCY_NETWORK) { sieciowe.add(r.from); sieciowe.add(r.to); }
  for (const c of DEPENDENCY_CASCADES) for (const n of c.path) sieciowe.add(n);
  const bezNazwy = [...sieciowe].filter((id) => !znane.has(id));

  check('⭐ PRZESŁANKA `describeCause`: KAŻDY węzeł sieci zależności i kaskad ma nazwę '
    + '— dlatego gałąź `nieznana_przyczyna` jest dziś nieosiągalna',
    bezNazwy.length === 0,
    `${bezNazwy.length} węzłów bez nazwy: ${bezNazwy.join(', ')} — gałąź STAŁA SIĘ osiągalna, `
    + 'sprawdź brzmienie, które zawodnik od teraz zobaczy');
  console.log(`   [pomiar] sieć zależności: ${DEPENDENCY_NETWORK.length} par, `
    + `${DEPENDENCY_CASCADES.length} kaskad, ${sieciowe.size} unikalnych id — wszystkie nazywalne`);

  const bank = Object.keys(LIVING_DIAGNOSIS_QUESTION_BANK);
  const bankBezNazwy = bank.filter((id) => !znane.has(id));
  check('⭐ PRZESŁANKA `buildRediagnosisView`: każdy segment z banku 13 pytań ma nazwę '
    + '— dlatego rediagnoza nie pyta dziś o obszar, którego nie umie nazwać',
    bankBezNazwy.length === 0,
    `${bankBezNazwy.join(', ')} — rediagnoza pyta o obszar bez nazwy; zawodnik zobaczy komunikat `
    + 'w nagłówku, co jest zachowaniem ZAMIERZONYM, ale brzmienie wymaga przejrzenia');

  // ⚠️ Odwrotny kierunek NIE jest wymagany i mówię to wprost: segment nazywalny,
  // o który bank nie pyta, jest w porządku (`techSpec` czekał tak przez tydzień).
  console.log(`   [pomiar] bank pytań: ${bank.length} segmentów `
    + `· nazywalnych bez pytania: ${[...znane].filter((id) => !bank.includes(id)).length}`);
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n2. ⭐ URUCHOMIENIOWO — prawdziwe funkcje, nie tekst pliku');
// ═════════════════════════════════════════════════════════════════════
{
  // Profil zawodnika: trzynastka + JEDEN KLUCZ SPOZA SŁOWNIKA. To nie jest
  // scenariusz teoretyczny — `diagnostics.scores` jest kolumną jsonb BEZ FK
  // i BEZ CHECK-a (znalezisko F2-4), więc jeden `insert` to robi.
  const SUROWY = 'explosive_power';
  const profil: Record<string, number> = {};
  SEGMENT_ORDER.forEach((id, i) => { profil[id] = 78 + (i % 4); });
  profil.moc = 30;
  profil[SUROWY] = 28;

  const deficyty = getRelativeDeficits(profil, 3);
  check('⭐ DZIEDZINA NAPRAWDĘ OTWARTA: nieznany klucz z `diagnostics.scores` DOCHODZI '
    + 'do listy deficytów — to nie jest scenariusz teoretyczny',
    deficyty.some(([id]) => id === SUROWY), deficyty.map(([id]) => id).join(', '));

  const opisy = deficyty.map(([id]) => opiszSegment(id));
  check('⛔ ⭐ ANI JEDNA nazwa deficytu nie jest surową wartością z bazy',
    opisy.every((o) => (o.znany ? o.etykieta : o.komunikat) !== SUROWY),
    'zawodnik przeczytałby identyfikator zamiast nazwy obszaru');
  check('⭐ nieznany deficyt oddaje KOMUNIKAT, znany — ETYKIETĘ (dwie gałęzie, nie jedna)',
    opisy.some((o) => !o.znany && o.komunikat === SEGMENT_NIEZNANY_KOMUNIKAT)
    && opisy.some((o) => o.znany && o.etykieta === SEGMENT_LABELS.moc),
    JSON.stringify(opisy));
  check('⭐ nieznany deficyt ma CO wpisać do logu — inaczej defekt zamienia się w cichy brak',
    opisy.filter((o) => !o.znany).every((o) => (opisNieznanegoSegmentuDoLogu(o) ?? '').includes(SUROWY)),
    'log nie niesie surowej wartości');

  // ── `groupSegmentsForDisplay` — 13 nazw, zero identyfikatorów ─────────
  //
  // ⚠️ ODCZYT OBRONNY, I TO NIE JEST OZDOBA. Strażnik puszczony na STARSZEJ
  // wersji pliku (kontrola historyczna, **O70**) dostaje wynik BEZ pola
  // `nieznane` — a `nieznane.length` wywróciłoby wtedy cały plik `TypeError`-em
  // i asercje niżej nigdy by się nie wykonały. ⛔ Strażnik, który się wywraca
  // zamiast zapalić, mówi „coś jest nie tak" zamiast „TO jest nie tak".
  const wynikGrupowania = groupSegmentsForDisplay(profil, null) as {
    groups: Record<'g1' | 'g2' | 'g3' | 'g4', { id: string; name: string }[]>;
    nieznane?: { surowy: string }[];
  };
  const groups = wynikGrupowania.groups;
  const nieznane = wynikGrupowania.nieznane;
  const wszystkie = [...groups.g1, ...groups.g2, ...groups.g3, ...groups.g4];
  check('⭐ `groupSegmentsForDisplay`: ANI JEDNA `entry.name` nie jest identyfikatorem',
    wszystkie.every((e) => e.name !== e.id && (SEGMENTY_ZNANE.includes(e.id) ? e.name === SEGMENT_LABELS[e.id] : true)),
    wszystkie.filter((e) => e.name === e.id).map((e) => e.id).join(', '));
  check('⛔ pole `nieznane` ISTNIEJE w wyniku — bez niego ekran nie miałby czego zalogować',
    Array.isArray(nieznane), `dostałem: ${typeof nieznane} — to jest wersja funkcji sprzed pasa G1`);
  check('⭐ `groupSegmentsForDisplay` POMIJA nieznany klucz zamiast go rysować '
    + '(pętla po `SEGMENT_ORDER`) — i dlatego lista `nieznane` jest pusta, a to POMIAR, nie brak pracy',
    !wszystkie.some((e) => e.id === SUROWY) && (nieznane?.length ?? -1) === 0,
    `nieznane: ${(nieznane ?? []).map((o) => o.surowy).join(', ')}`);

  // ── `describeCause` — nazwa WPLECIONA W ZDANIE ────────────────────────
  let surowewZdaniach = 0;
  let rodzajow = new Set<string>();
  for (const id of SEGMENT_ORDER) {
    const c = describeCause(profil, id);
    rodzajow.add(c.kind);
    const tekst = c.kind === 'standalone' ? c.text
      : c.kind === 'blocked' ? `${c.before}${c.primaryName}${c.after}`
        : SEGMENT_NIEZNANY_KOMUNIKAT;
    for (const podejrzany of [SUROWY, ...SEGMENT_ORDER]) {
      if (tekst.includes(podejrzany)) surowewZdaniach++;
    }
  }
  check('⛔ ⭐ ŻADNE zdanie o przyczynie nie niesie identyfikatora segmentu — '
    + 'a to jest miejsce, w którym nazwa jest WPLECIONA („Zacznij od: X.")',
    surowewZdaniach === 0, `wystąpień: ${surowewZdaniach}`);
  check('⭐ `describeCause` oddaje na dzisiejszych danych rodzaje z unii, nie napis',
    [...rodzajow].every((k) => ['standalone', 'blocked', 'nieznana_przyczyna'].includes(k)),
    [...rodzajow].join(', '));

  // ⭐ R5 — „nie wynika z niczego" i „nie umiem nazwać tego, z czego wynika"
  // MUSZĄ być dwoma różnymi zdaniami. Bez tego produkt podaje niewiedzę jako
  // ustalenie (Z0), dokładnie jak „0 z 12 sesji zrobione" przed pasem F1.
  const samodzielny = describeCause({ moc: 30, wytrzymalosc: 80, fizycznosc: 80 }, 'moc');
  check('⭐ R5: rodzaj „samodzielne wąskie gardło" nadal istnieje i ma WŁASNE zdanie',
    samodzielny.kind === 'standalone'
    && samodzielny.text.length > 40
    && samodzielny.text !== SEGMENT_NIEZNANY_KOMUNIKAT,
    JSON.stringify(samodzielny));
  check('⛔ ⭐ R5: „nie wynika z innych deficytów" NIE JEST tym samym zdaniem, '
    + 'co „nie znam tego obszaru" — inaczej niewiedza wychodzi jako ustalenie (Z0)',
    samodzielny.kind === 'standalone' && !samodzielny.text.includes(SEGMENT_NIEZNANY_KOMUNIKAT),
    'oba stany zlane w jedno zdanie');

  // ── ukryta przyczyna ────────────────────────────────────────────────
  const ukryte = getHiddenCauses(profil, deficyty, 0.5);
  check('⭐ ukryta przyczyna pochodzi WYŁĄCZNIE z sieci zależności, więc każda ma nazwę',
    ukryte.every((u) => opiszSegment(u.id).znany
      && u.causesFor.every((c) => opiszSegment(c).znany || !SEGMENTY_ZNANE.includes(c) === false)),
    ukryte.map((u) => u.id).join(', '));

  // ── `buildRediagnosisView` ──────────────────────────────────────────
  const READY = { state: 'ready', score: 42 } as const;
  let zleNazwy = 0;
  for (const id of SEGMENT_ORDER) {
    const v = buildRediagnosisView({ segmentId: id, baseline: READY, answerValue: null }) as { kind: string; segmentName?: string };
    if (v.kind !== 'question' || v.segmentName !== SEGMENT_LABELS[id]) zleNazwy++;
  }
  check('⭐ rediagnoza: 13/13 segmentów dostaje ETYKIETĘ ze słownika, nie identyfikator',
    zleNazwy === 0, `rozjazdów: ${zleNazwy}`);
  check('⭐ rediagnoza: segment spoza banku nadal kończy się `unknown_segment` '
    + '— naprawa nazwy NIE zmieniła zachowania ekranu, który jest poza pasem G1',
    (buildRediagnosisView({ segmentId: SUROWY, baseline: READY, answerValue: null }) as { reason?: string }).reason
    === 'unknown_segment', 'zmieniony kontrakt z `BlockClosingRediagnosis.tsx`');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n3. ⭐ WYCIĘTA INSTRUKCJA (O71) — obie gałęzie NARYSOWANE, nie tylko policzone');
// ═════════════════════════════════════════════════════════════════════
{
  // ── `ja.tsx :: load` ────────────────────────────────────────────────
  const zywyJa = zrodlo(PLIK_JA);
  const blokJa = wytnijBlok(zywyJa, 'const opisyDeficytow');
  check(`⭐ ${PLIK_JA}: mapowanie deficytów na nazwy DA SIĘ WYCIĄĆ (igła istnieje)`,
    zywyJa.includes('const opisyDeficytow'), 'przepisane pod inną nazwą — zaktualizuj igłę');
  check(`⭐ ${PLIK_JA}: OBIE gałęzie w jednym wyrażeniu — etykieta ORAZ komunikat`,
    /o\.znany\s*\?\s*o\.etykieta\s*:\s*o\.komunikat/.test(zywyJa),
    'jedna z gałęzi nie trafia do `deficitLabels`');
  check(`⛔ ${PLIK_JA}: log o nieznanym segmencie jest WOŁANY, nie tylko zaimportowany`,
    /console\.warn\(\s*doLogu\s*\)/.test(zywyJa) && /opisNieznanegoSegmentuDoLogu\(opis\)/.test(zywyJa),
    'surowa wartość znika bez śladu — cichy brak zamiast defektu');
  check(`⛔ ${PLIK_JA}: ani jednego wywołania \`segmentLabel(\``,
    !/\bsegmentLabel\s*\(/.test(zywyJa), 'wyciek wrócił');
  console.log(`   [pomiar] wycięty blok \`opisyDeficytow\`: ${blokJa.length} znaków`);

  // ── `DiagnosisProfileView.tsx :: SekcjaWaskiegoGardla`, gałąź `jest` ──
  const zywyWidok = zrodlo(PLIK_WIDOK);
  const blokCelu = wytnijBlok(zywyWidok, "if (cel.stan === 'jest')");
  check(`⭐ ${PLIK_WIDOK}: gałąź \`cel.stan === 'jest'\` DA SIĘ WYCIĄĆ`,
    blokCelu.length > 200, `wycięto ${blokCelu.length} znaków`);
  check('⭐ ⭐ NAJWAŻNIEJSZA ASERCJA TEGO PASA: w gałęzi „masz wąskie gardło" komunikat '
    + '„nie znam" stoi SAMODZIELNIE, a nie wpleciony w zdanie',
    /!opisCelu\.znany\s*\n?\s*\?\s*SEGMENT_NIEZNANY_KOMUNIKAT/.test(blokCelu),
    'komunikat wstawiony w miejsce nazwy — zawodnik czyta „Twoje wąskie gardło to Nie znam tego obszaru — obszar z grupy…"');
  check('⛔ ⭐ komunikat NIE JEST interpolowany w żadne `${…}` tej gałęzi',
    !/\$\{\s*[^}]*NIEZNANY[^}]*\}/.test(blokCelu),
    'komunikat wpleciony w zdanie — dokładnie ten kształt, przez który pas F2 tu nie wszedł');
  check('⭐ wszystkie TRZY warianty zdania o wąskim gardle biorą `opisCelu.etykieta`',
    (blokCelu.match(/\$\{opisCelu\.etykieta\}/g) ?? []).length === 3,
    `wariantów z etykietą: ${(blokCelu.match(/\$\{opisCelu\.etykieta\}/g) ?? []).length} (oczekiwane 3)`);
  check('⭐ M4: wyjście („Zobacz wąskie gardła →") zostaje TAKŻE przy nieznanym obszarze '
    + '— komunikat bez rzeczy do zrobienia byłby wiedzą bez sprawczości',
    blokCelu.includes('Zobacz wąskie gardła'), 'zawodnik zostaje bez wyjścia');
  check(`⛔ ${PLIK_WIDOK}: log jest WOŁANY w tej gałęzi`,
    /zalogujNieznane\(\[opisCelu\]\)/.test(blokCelu), 'surowa wartość znika bez śladu');

  // ── ta sama metoda dla wiersza deficytu i dla ukrytej przyczyny ──────
  check(`⭐ ${PLIK_WIDOK}: nazwa deficytu ma OBIE gałęzie`,
    /opisDeficytu\.znany\s*\?\s*opisDeficytu\.etykieta\s*:\s*opisDeficytu\.komunikat/.test(zywyWidok),
    'jedna z gałęzi nie jest rysowana');
  check(`⭐ ${PLIK_WIDOK}: ukryta przyczyna rysuje się WYŁĄCZNIE, gdy nazwy są znane`,
    /opisUkrytej\?\.znany\s*&&\s*ukrytePowodyNazwy\.length/.test(zywyWidok),
    'blok rysuje się z nienazwanym podmiotem zdania');
  check(`⛔ ${PLIK_WIDOK}: rodzaj \`nieznana_przyczyna\` JEST OBSŁUŻONY w renderze, `
    + 'a `never` niżej nie pozwoli dołożyć czwartego po cichu',
    /cause\.kind === 'nieznana_przyczyna'/.test(zywyWidok)
    && /const rodzajNieobsluzony: never = cause/.test(zywyWidok),
    'trzeci rodzaj policzony, ale nienarysowany — wzorzec E2-4');
  check(`⛔ ${PLIK_WIDOK}: \`opisPrzyczyny\` jest WOŁANE, nie tylko zdefiniowane`,
    /\{opisPrzyczyny\(cause\)\}/.test(zywyWidok), 'funkcja bez konsumenta (E2-4 / F1-2)');
  check(`⛔ ${PLIK_WIDOK}: ani jednego wywołania \`segmentLabel(\``,
    !/\bsegmentLabel\s*\(/.test(zywyWidok), 'wyciek wrócił');

  // ── `diagnosisProfile.ts` i `rediagnosis.ts` ────────────────────────
  for (const p of [PLIK_PROFIL, PLIK_REDIAGNOZA]) {
    check(`⛔ ${p}: ani jednego wywołania \`segmentLabel(\``,
      !/\bsegmentLabel\s*\(/.test(zrodlo(p)), 'wyciek wrócił');
  }
  check(`⭐ ${PLIK_PROFIL}: re-eksport \`segmentLabel\` ZOSTAJE (funkcja mieszka `
    + 'w pliku zakazanym dla pasa G1) — i nie jest wywołaniem',
    /export \{[^}]*segmentLabel[^}]*\}/.test(zrodlo(PLIK_PROFIL)), 're-eksport zniknął');
  check(`⭐ ${PLIK_PROFIL}: nienazwana przyczyna WYPADA pojedynczo, nie kasuje pozostałych`,
    /\.filter\(\(p\): p is \{ inf: Influence; nazwa: string \} => p\.nazwa !== null\)/.test(zrodlo(PLIK_PROFIL)),
    'jedna nienazwana przyczyna kasuje dwie nazwane — zawodnik dostaje mniej, niż mamy');
  check(`⛔ ${PLIK_PROFIL} JEST CZYSTY: zero \`console\`, zero Reacta, zero Supabase`,
    !/console\./.test(zrodlo(PLIK_PROFIL))
    && !/from ['"]react/.test(zrodlo(PLIK_PROFIL))
    && !/supabase/i.test(zrodlo(PLIK_PROFIL)),
    'log wpełzł do warstwy logiki — miał zostać u konsumenta');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n4. ⛔ BRZMIENIA — zero nowych, jedno użyte co do znaku');
// ═════════════════════════════════════════════════════════════════════
{
  check('⛔ komunikat jest DOKŁADNIE tym, który zaproponował pas F2 i który czeka na Kubę',
    SEGMENT_NIEZNANY_KOMUNIKAT === 'Nie znam tego obszaru', SEGMENT_NIEZNANY_KOMUNIKAT);
  check('⛔ komunikat NIE jest żadnym identyfikatorem ani żadną nazwą segmentu',
    !SEGMENTY_ZNANE.includes(SEGMENT_NIEZNANY_KOMUNIKAT)
    && !Object.values(SEGMENT_LABELS).includes(SEGMENT_NIEZNANY_KOMUNIKAT), '');
  check('⛔ komunikat mówi o NIEWIEDZY PRODUKTU, nie o zawodniku (Z0)',
    !/\b(Twoj|Twój|Twoje|Ty|Ciebie|masz|nie masz)\b/i.test(SEGMENT_NIEZNANY_KOMUNIKAT),
    SEGMENT_NIEZNANY_KOMUNIKAT);

  // ⭐ ZAPADKA NA BRZMIENIA: cztery pliki tego pasa nie mają prawa wprowadzić
  // ANI JEDNEGO własnego zdania o nieznanym obszarze. Jedenaste brzmienie ma
  // przejść przez Kubę, a nie przez commit.
  const podejrzane = /['"`][^'"`]*[Nn]ie (znam|wiem|rozpozna|umiem nazwa)[^'"`]*['"`]/g;
  const wlasne: string[] = [];
  for (const p of CZTERY_PLIKI) {
    for (const m of zrodlo(p).matchAll(podejrzane)) {
      const tekst = m[0].slice(1, -1);
      if (tekst !== SEGMENT_NIEZNANY_KOMUNIKAT) wlasne.push(`${p}: ${tekst}`);
    }
  }
  check('⛔ ⭐ ŻADEN z czterech plików nie napisał WŁASNEGO zdania o nieznanym obszarze '
    + '(zakaz 4 polecenia G1 — dziesięć brzmień czeka na Kubę, jedenastego nie dokładamy)',
    wlasne.length === 0, wlasne.join(' | '));
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n5. ⭐ MUTACJE — cofnięcie strukturalne, mutanty poza kodem produkcyjnym');
// ═════════════════════════════════════════════════════════════════════
// ⚠️ Każdy mutant to NAPIS przekazany do tej samej baterii predykatów, nie
// edycja pliku na dysku. Nie ma czego cofać. ⭐ Pięć z sześciu mutantów to
// kształty, które NAPRAWDĘ stały w tym repozytorium na `main` (`1e0bfcaa`)
// przed tym pasem — czyli kontrola historyczna zapisana strukturalnie.
{
  type Predykat = { label: string; ok: (kod: string) => boolean };

  const BATERIA: Predykat[] = [
    { label: 'brak wywołań `segmentLabel(`', ok: (k) => !/\bsegmentLabel\s*\(/.test(k) },
    { label: 'komunikat stoi samodzielnie, nie w `${…}`', ok: (k) => !/\$\{\s*[^}]*NIEZNANY[^}]*\}/.test(k) },
    { label: 'obie gałęzie w wyrażeniu (`znany ? … : …`)', ok: (k) => /\.znany\s*\?[^:]+:\s*\S/.test(k) },
    { label: 'log o nieznanym segmencie jest wołany', ok: (k) => /(zalogujNieznane\(|console\.warn\()/.test(k) },
    { label: 'wyjście dla zawodnika zostaje', ok: (k) => /Zobacz wąskie gardła|deficitLabels/.test(k) },
  ];

  const PRAWDZIWE = [
    zrodlo(PLIK_JA),
    wytnijBlok(zrodlo(PLIK_WIDOK), "if (cel.stan === 'jest')"),
  ].join('\n');

  const MUTANTY: { nazwa: string; opis: string; kod: string }[] = [
    {
      nazwa: 'G1-N1 · ⭐ stan `main` sprzed pasa: nazwa wplatana przez `segmentLabel()`',
      opis: 'dokładnie ten kod stał w `DiagnosisProfileView.tsx` godzinę temu',
      kod: 'const c = `Twoje wąskie gardło to ${segmentLabel(cel.segmentId)} — obszar z grupy „x".`;\n'
        + '<TouchableOpacity><Text>Zobacz wąskie gardła →</Text></TouchableOpacity>\n'
        + 'console.warn(x); const y = a.znany ? a.etykieta : a.komunikat;',
    },
    {
      nazwa: 'G1-N2 · ⛔ komunikat WPLECIONY w zdanie zamiast postawiony samodzielnie',
      opis: 'najbardziej kuszący skrót: podmiana napisu w miejscu `${…}`. Dałby zawodnikowi '
        + '„Twoje wąskie gardło to Nie znam tego obszaru — obszar z grupy…"',
      kod: 'const c = `Twoje wąskie gardło to ${opisCelu.znany ? opisCelu.etykieta : SEGMENT_NIEZNANY_KOMUNIKAT} — obszar…`;\n'
        + '<Text>Zobacz wąskie gardła →</Text>\nzalogujNieznane([opisCelu]);',
    },
    {
      nazwa: 'G1-N3 · ⛔ gałąź „nie znam" policzona, ale NIENARYSOWANA',
      opis: 'wzorzec E2-4 / F1-2: wynik jest, konsumenta nie ma. Suita świeciłaby na zielono',
      kod: 'const opisCelu = opiszSegment(cel.segmentId);\n'
        + 'const c = `Twoje wąskie gardło to ${opisCelu.etykieta ?? ""}`;\n'
        + '<Text>Zobacz wąskie gardła →</Text>\nzalogujNieznane([opisCelu]);',
    },
    {
      nazwa: 'G1-N4 · ⛔ log usunięty — defekt zamienia się w cichy brak',
      opis: 'zawodnik przestaje czytać `explosive_power`, ale NIKT się nie dowiaduje, '
        + 'że taka wartość jest w bazie (znalezisko E1)',
      kod: 'const c = opisCelu.znany ? opisCelu.etykieta : SEGMENT_NIEZNANY_KOMUNIKAT;\n'
        + '<Text>Zobacz wąskie gardła →</Text>',
    },
    {
      nazwa: 'G1-N5 · ⛔ komunikat bez rzeczy do zrobienia (M4)',
      opis: 'zawodnik czyta „Nie znam tego obszaru" i nie ma dokąd pójść — wiedza bez sprawczości',
      kod: 'const c = opisCelu.znany ? opisCelu.etykieta : SEGMENT_NIEZNANY_KOMUNIKAT;\n'
        + 'zalogujNieznane([opisCelu]);',
    },
    {
      nazwa: 'G1-N6 · ⛔ obie gałęzie zlane w jedną (wraca odwrót do surowej wartości)',
      opis: 'ktoś „upraszcza" `opiszSegment()` do jednego napisu i wraca do punktu wyjścia',
      kod: 'const c = opisCelu.surowy ?? opisCelu.etykieta;\n'
        + '<Text>Zobacz wąskie gardła →</Text>\nzalogujNieznane([opisCelu]);',
    },
  ];

  const failePrawdziwe = BATERIA.filter((p) => !p.ok(PRAWDZIWE));
  console.log(`\nbateria ma ${BATERIA.length} predykatów · na PRAWDZIWYM kodzie FAIL-i: ${failePrawdziwe.length}`);
  check('⭐ bateria na PRAWDZIWYM kodzie nie zapala ani jednego predykatu',
    failePrawdziwe.length === 0, failePrawdziwe.map((p) => p.label).join(' | '));

  const zgasle: string[] = [];
  for (const m of MUTANTY) {
    const zapalone = BATERIA.filter((p) => !p.ok(m.kod));
    console.log(`${m.nazwa}\n   co psuje: ${m.opis}\n   FAIL-i: ${zapalone.length} / ${BATERIA.length}`);
    for (const z of zapalone) console.log(`     • ${z.label}`);
    if (zapalone.length === 0) zgasle.push(m.nazwa);
  }
  check('⭐ KAŻDY z sześciu mutantów zapala co najmniej jeden predykat (O71 + znalezisko E1) '
    + '— zgasłe wypisane Z NAZWY, nie zliczone',
    zgasle.length === 0, `zgasły: ${zgasle.join(' | ')}`);
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n6. ⭐ STRAŻNIK STRAŻNIKA — milczenie z powodu awarii wygląda jak czystość');
// ═════════════════════════════════════════════════════════════════════
{
  check('⛔ wszystkie CZTERY pliki pasa G1 istnieją i dają się odczytać',
    CZTERY_PLIKI.every((p) => zrodlo(p).length > 1000),
    CZTERY_PLIKI.filter((p) => zrodlo(p).length <= 1000).join(', '));

  // ⚠️ Polecenie G1 wymieniało `lib/diagnosisProfile.ts`. Taki plik NIE ISTNIEJE
  // i nigdy nie istniał — logika profilu diagnozy mieszka w `components/`.
  // Ta asercja jest tu po to, żeby następna sesja nie szukała go po omacku.
  check('⭐ `lib/diagnosisProfile.ts` NIE ISTNIEJE — plik z polecenia G1 to `components/diagnosisProfile.ts`',
    !existsSync(join(appRoot, 'lib/diagnosisProfile.ts')), 'powstał drugi plik o tej nazwie — rozjazd');

  check('⛔ `wytnijBlok` naprawdę wycina, a nie oddaje całego pliku',
    wytnijBlok('function a(){ const x = 1; } function b(){ const y = 2; }', 'function b') === 'function b(){ const y = 2; }',
    'wycinarka nie działa — wszystkie asercje z sekcji 3 są bez wartości');
  check('⛔ `wytnijBlok` oddaje pustkę, gdy igły nie ma (a nie cichą prawdę)',
    wytnijBlok('const a = 1;', 'nie ma takiej igly') === '', '');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} asercji nie przeszło`);
