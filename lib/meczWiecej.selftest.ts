// PLAN-D-A1 08.2026 (18.08.2026) — NOWY PLIK. STRAŻNIK EKRANU MECZU
// PO DECYZJI KUBY Z 18.08 (M1 §3, wariant A).
// ⭐⭐ PLAN-D-D8 18.08.2026 — PRZEPISANY. Do dziś ten strażnik pilnował,
// żeby produkt UCZCIWIE MÓWIŁ, czego nie umie. Od dziś pilnuje tego, żeby
// UMIAŁ — i zapala się imiennie, kiedy przestaje.
//
// ⛔⛔ CO TEN STRAŻNIK NAPRAWDĘ PILNUJE. `app/(tabs)/mecz.tsx` ma 961 linii
// i do 18.08.2026 rano miał ZERO odnośników w całym repozytorium poza własną
// zakładką. Pas A1 zakładkę zdjął. Jeżeli wejście z kafla kiedykolwiek
// zniknie, ekran zniknie razem z nim — a razem z ekranem jedyne wejście do
// `match_contexts` i `match_context_answers`.
//
// ⭐ TEN STRAŻNIK MIAŁ PRAWO ZAPALIĆ SIĘ NA SUKCESIE i zapalił się 18.08.2026
// wieczorem: `czegoNieUmiemyZapisac()` przestało oddawać `match_length_minutes`,
// bo kolumna powstała, a ekran zaczął ją zapisywać. To było zaprojektowane
// (O73), nie przeoczone — i dlatego asercje niżej są przepisane, a nie zdjęte.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RZECZY_O_MECZU, rzeczyMeczu, podpisArkuszaMeczu, czegoNieUmiemyZapisac,
  MECZ_WIECEJ_WEJSCIE, MECZ_CZEKA_NA_KOLUMNE, STANY_RZECZY,
  MINUTY_NA_BOISKU, DLUGOSCI_MECZU, POZYCJE_DO_WYBORU, SKALA_OCENY,
  POLE_MINUTY_NA_BOISKU, POLE_DLUGOSC_MECZU,
  MECZ_ZERO_MINUT, MECZ_BEZ_ZAZNACZENIA, MECZ_MINUTY_PONAD_DLUGOSC,
  MECZ_WIECEJ_NIC_DO_ZAPISU, RODZAJ_MECZU_Z_KAFLA, PUSTE_WIECEJ_O_MECZU, POLA_ARKUSZA,
  minutyPonadDlugosc, wynikMeczu, zdecydujOZapisieMeczu, opisZapisuMeczuDoLogu,
  type RzeczOMeczu, type OcenaMeczu, type WiecejOMeczu, type WynikMeczu,
  type StanKontekstuMeczu, type DecyzjaZapisuMeczu,
} from './meczWiecej';
import {
  SELECT_MECZOW, KOLUMNY_MECZOW, meczDlaNagrody, type WierszMeczuWgl,
} from './wejsciaWgladow';
import {
  jednostkiZMeczow, wagaMeczu, punktyRozwojuNaEkranie,
  MAKS_PUNKTOW_ZA_MECZ, MECZ_BEZ_MINUT_NA_BOISKU,
} from './nagrodaZaPrace';
import { LABEL_TO_POSITION_KEY } from './positionProfiles';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let bledy = 0; let ok = 0;
function check(nazwa: string, warunek: boolean, szczegol = '') {
  if (warunek) { ok += 1; console.log(`OK   - ${nazwa}`); }
  else { bledy += 1; console.log(`FAIL - ${nazwa}${szczegol ? ': ' + szczegol : ''}`); }
}
const bezKomentarzy = (t: string): string =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

// ═════════════════════════════════════════════════════════════════════
// 1. PODZIAŁ Z DECYZJI KUBY — CZTERY NA WIERZCHU, SZEŚĆ W ARKUSZU
// ═════════════════════════════════════════════════════════════════════
const naWierzchu = rzeczyMeczu('ocena_z_kafla');
const wArkuszu = rzeczyMeczu('arkusz_wiecej');
const wKarcie = rzeczyMeczu('pelna_karta');
check('⭐ (M1 §3) ścieżka oceny CHUDNIE do czterech rzeczy — tak rysuje makieta v3',
  naWierzchu.length === 4, `${naWierzchu.length}: ${naWierzchu.map((r) => r.napis).join(' · ')}`);
check('⭐ (M1 §3) arkusz „powiedz więcej" niesie SZEŚĆ rzeczy',
  wArkuszu.length === 6, `${wArkuszu.length}`);
// ⛔ TRZECIE MIEJSCE JEST NOWE I MA POWÓD. Bez niego tabela twierdziłaby, że
// „cała karta meczu" to dziesięć rzeczy — a karta ma ich więcej i te dodatkowe
// nadal są jedynym miejscem, w którym da się je podać (B3).
check('⭐ (D8, B3) rzeczy, których decyzja Kuby NIE przeniosła, są wymienione '
  + 'z nazwy w trzecim miejscu — a nie przemilczane',
  wKarcie.length === 3 && wKarcie.every((r) => r.stan === 'dziala'),
  wKarcie.map((r) => r.kolumna).join(','));
check('⛔ każda rzecz stoi DOKŁADNIE w jednym miejscu — suma się zgadza',
  naWierzchu.length + wArkuszu.length + wKarcie.length === RZECZY_O_MECZU.length);

const NA_WIERZCHU_KUBY = ['minutes_played', 'match_length_minutes', 'match_rpe', '—'];
check('⭐ (M1 §3) na wierzchu stoi DOKŁADNIE to, co wymienił Kuba: minuty na boisku · '
  + 'długość meczu · ciężkość · ból',
  naWierzchu.map((r) => r.kolumna).join(',') === NA_WIERZCHU_KUBY.join(','),
  naWierzchu.map((r) => r.kolumna).join(','));

// ⚠️ NAZWY POPRAWIONE 18.08.2026: `result` i `notes` NIE ISTNIEJĄ w bazie.
// Wynik to DWIE kolumny (`own_score`, `opponent_score`), notatka to `free_note`.
const W_ARKUSZU_KUBY = ['self_rating', 'mental_state', 'demanding_conditions',
  'position_played_today', 'own_score+opponent_score', 'free_note'];
check('⭐ (M1 §3) w arkuszu stoi DOKŁADNIE reszta: samoocena · stan mentalny · '
  + 'warunki · rola · wynik · notatka — pod PRAWDZIWYMI nazwami kolumn',
  wArkuszu.map((r) => r.kolumna).join(',') === W_ARKUSZU_KUBY.join(','),
  wArkuszu.map((r) => r.kolumna).join(','));

check('⛔ każda rzecz ma napis, który da się przeczytać — kolumna to nie jest brzmienie',
  RZECZY_O_MECZU.every((r) => r.napis.length > 5 && !/_/.test(r.napis)));

// ═════════════════════════════════════════════════════════════════════
// 2. ⭐ Z0 / R5 — TRZY STANY ZOSTAJĄ, CHOĆ DZIURA JEST DOMKNIĘTA
// ═════════════════════════════════════════════════════════════════════
const brakujace = czegoNieUmiemyZapisac();
check('⭐⛔ (D8) DŁUGOŚĆ CAŁEGO MECZU PRZESTAŁA BYĆ DZIURĄ — kolumna '
  + '`match_length_minutes` istnieje i ekran ją zapisuje',
  brakujace.length === 0, brakujace.map((r) => r.kolumna).join(', '));
check('⛔ (B3) MECHANIZM „czego nie umiemy" NIE ZNIKNĄŁ razem z ostatnią dziurą — '
  + 'następna ma gdzie się pokazać',
  typeof czegoNieUmiemyZapisac === 'function'
  && MECZ_CZEKA_NA_KOLUMNE('X').includes('X')
  && /nie udajemy/.test(MECZ_CZEKA_NA_KOLUMNE('X')));
check('⛔ (R5) stany są TRZY, nie dwa — i liczymy je z listy, nie z użycia',
  STANY_RZECZY.length === 3
  && STANY_RZECZY.includes('dziala')
  && STANY_RZECZY.includes('czeka_na_ekran')
  && STANY_RZECZY.includes('czeka_na_kolumne'),
  STANY_RZECZY.join(', '));
check('⛔ każda rzecz ma stan Z LISTY — nie ma stanu spoza słownika',
  RZECZY_O_MECZU.every((r) => STANY_RZECZY.includes(r.stan)));
check('⭐ podpis arkusza mówi PRAWDĘ: ile rzeczy tu, ile w pełnej karcie',
  podpisArkuszaMeczu().includes('6 rzeczy')
  && podpisArkuszaMeczu().includes('Kolejne 3')
  && !/jeszcze nie przeniosła/.test(podpisArkuszaMeczu()),
  podpisArkuszaMeczu());

// ═════════════════════════════════════════════════════════════════════
// 3. ⭐⭐ ODCZYT DŁUGOŚCI MECZU — SPRAWDZONY WYKONANIEM, NIE LEKTURĄ
//
// ⛔ TO JEST POŁOWA PASA D8 I NAJŁATWIEJ JĄ PRZEOCZYĆ. Do 18.08 kolumna
// `match_length_minutes` była ZAPISYWANA i NIGDY NIEODCZYTYWANA: `SELECT_MECZOW`
// jej nie wymieniał, a rzutka `as unknown as WierszMeczu[]` nie przemianowuje
// pól, więc `wagaMeczu()` dostawała `null` i podstawiała 90 ZAWSZE.
// ⚠️ W tym projekcie DWA RAZY zdarzyło się, że rozszerzenie typu po cichu się
// nie zastosowało, a testy były zielone. Dlatego niżej nie ma ani jednej
// asercji tekstowej o mapowaniu — jest URUCHOMIENIE.
// ═════════════════════════════════════════════════════════════════════
check('⛔ (D8) `SELECT_MECZOW` prosi bazę o OBIE liczby meczu',
  KOLUMNY_MECZOW.includes('minutes_played') && KOLUMNY_MECZOW.includes('match_length_minutes'),
  SELECT_MECZOW);

// ⭐ WIERSZ W KSZTAŁCIE, W JAKIM NAPRAWDĘ WRACA Z BAZY — zbudowany
// Z LISTY KOLUMN, nie z ręki. Gdyby ktoś zdjął kolumnę z zapytania, ten
// wiersz przestałby ją mieć i asercje niżej zapalą się same.
function wierszZBazy(nadpisz: Record<string, unknown>): WierszMeczuWgl {
  const w: Record<string, unknown> = {};
  for (const k of KOLUMNY_MECZOW) w[k] = null;
  w.id = 7; w.created_at = '2026-08-15T18:00:00Z';
  return { ...w, ...nadpisz } as unknown as WierszMeczuWgl;
}

// ⭐⭐ NAJMOCNIEJSZA ASERCJA TEGO PLIKU: sprawdza, PO KTÓRE POLA mapowanie
// naprawdę sięga — przez `Proxy`, w czasie wykonania. ⛔ Pole, po które sięga,
// a którego nie ma w zapytaniu, jest defektem, którego nie widać ani
// w kompilatorze (rzutka), ani w oczach (nazwy są podobne).
{
  const dotkniete: string[] = [];
  const szpieg = new Proxy(wierszZBazy({}) as unknown as Record<string, unknown>, {
    get(cel, klucz) {
      if (typeof klucz === 'string') dotkniete.push(klucz);
      return Reflect.get(cel, klucz);
    },
  }) as unknown as WierszMeczuWgl;
  meczDlaNagrody(szpieg);
  const spoza = dotkniete.filter((k) => !KOLUMNY_MECZOW.includes(k));
  check('⭐⭐ (D8) KAŻDE pole, po które sięga `meczDlaNagrody`, JEST w zapytaniu — '
    + 'sprawdzone `Proxy` w czasie wykonania, nie porównaniem napisów',
    spoza.length === 0 && dotkniete.includes('match_length_minutes'),
    `dotknięte: ${dotkniete.join(',')} · spoza zapytania: ${spoza.join(',') || 'brak'}`);
}

{
  const zmapowany = meczDlaNagrody(wierszZBazy({ minutes_played: 60, match_length_minutes: 60 }));
  check('⭐⭐ (D8) `match_length_minutes` NAPRAWDĘ ląduje w `WierszMeczu.dlugoscMeczu`',
    zmapowany.dlugoscMeczu === 60 && zmapowany.minutes_played === 60,
    JSON.stringify(zmapowany));

  // ⭐ PEŁNY MECZ 60-MINUTOWY = 4 PUNKTY. To jest cała różnica dla trzynastolatka.
  const pelny60 = jednostkiZMeczow([zmapowany]);
  check('⭐⭐ (D8) zawodnik, który zagrał CAŁY mecz 60-minutowy, dostaje pełne '
    + `${MAKS_PUNKTOW_ZA_MECZ} punkty — a nie karę za to, że jego mecz jest krótszy`,
    pelny60.length === 1 && punktyRozwojuNaEkranie(pelny60[0].punkty) === MAKS_PUNKTOW_ZA_MECZ,
    `${pelny60[0]?.punkty}`);

  // ⛔ DOWÓD, ŻE MAPOWANIE ROBI RÓŻNICĘ — bez niego ten sam wiersz daje MNIEJ.
  const bezMapowania = jednostkiZMeczow([
    { id: 7, created_at: '2026-08-15T18:00:00Z', minutes_played: 60 },
  ]);
  check('⛔⛔ (D8) BEZ przemianowania długości ten sam mecz daje MNIEJ punktów — '
    + 'to jest dowód, że to mapowanie nie jest ozdobnikiem',
    punktyRozwojuNaEkranie(bezMapowania[0].punkty) < MAKS_PUNKTOW_ZA_MECZ,
    `${bezMapowania[0]?.punkty}`);
}

// ═════════════════════════════════════════════════════════════════════
// 4. ⭐ WYNIK MECZU — CZTERY STANY, SUFIT I ZERO MINUT
// ═════════════════════════════════════════════════════════════════════
const w = (minuty: number | null, dlugosc: number | null, rpe: number | null = null): WynikMeczu =>
  wynikMeczu({ minutyNaBoisku: minuty, dlugoscMeczu: dlugosc, rpe });
const punkty = (x: WynikMeczu): number => (x.rodzaj === 'policzony' ? x.punkty : -1);

const TABELA_KUBY: [number, number, number][] = [
  [90, 90, 4], // pełny mecz
  [45, 90, 2], // połowa
  [15, 90, 1], // wejście z ławki — max(1, …) pilnuje, żeby nie było zera
  [60, 60, 4], // pełny mecz U13
  [45, 60, 3], // ⭐ te same 45 minut, inny mianownik, inna liczba
];
const zle = TABELA_KUBY.filter(([m, d, oczekiwane]) => punkty(w(m, d)) !== oczekiwane);
check('⭐ (D6.2) trzy kotwice Kuby i dwa mecze o różnej długości — wszystkie się zgadzają',
  zle.length === 0,
  zle.map(([m, d, o]) => `${m}/${d}: jest ${punkty(w(m, d))}, ma być ${o}`).join(' · '));

check('⭐⭐ (D6.2) 45 minut znaczy CO INNEGO w meczu 60- i 90-minutowym — '
  + 'i to jest cały powód, dla którego pól jest dwa',
  punkty(w(45, 60)) === 3 && punkty(w(45, 90)) === 2,
  `${punkty(w(45, 60))} vs ${punkty(w(45, 90))}`);

check('⭐⛔ ZERO MINUT MA WŁASNY STAN — nie jest brakiem odpowiedzi i nie kasuje meczu',
  w(0, 90).rodzaj === 'zero_minut' && w(0, 90).zdanie === MECZ_ZERO_MINUT,
  w(0, 90).rodzaj);
check('⛔ (R5) BRAK ZAZNACZENIA to trzecia wartość — nie zero i nie liczba',
  w(null, 90).rodzaj === 'brak_minut' && w(null, 90).zdanie === MECZ_BEZ_ZAZNACZENIA,
  w(null, 90).rodzaj);
check('⛔ zero minut daje ZERO punktów w liczniku pracy (N1: nagroda za pracę, nie obecność)',
  wagaMeczu(0, 90).punkty === 0);

// ⛔⛔ SUFIT — TO JEST BŁĄD MAKIETY, KTÓREGO NIE WOLNO PRZEPISAĆ.
// `punktyMeczu()` z makiety v3 NIE MA sufitu i przy 90 minutach w meczu
// 60-minutowym pokazuje „6 z 4 punktów za ten mecz".
check('⭐⛔ SUFIT 4 PUNKTÓW OBOWIĄZUJE — 120 minut przy nieznanej długości '
  + 'NIE daje „6 z 4 punktów" (błąd makiety NIE został przepisany)',
  punkty(w(120, null)) === MAKS_PUNKTOW_ZA_MECZ,
  `${punkty(w(120, null))}`);
check('⭐⛔ 90 minut w meczu 60-minutowym to SPRZECZNOŚĆ, a nie wynik — '
  + 'ekran zatrzymuje to przed bazą i mówi o tym zdaniem',
  w(90, 60).rodzaj === 'sprzecznosc' && w(90, 60).zdanie === MECZ_MINUTY_PONAD_DLUGOSC,
  w(90, 60).rodzaj);
check('⛔ sprzeczność wymaga OBU liczb — brak jednej z nich to „nie wiemy", nie błąd zawodnika',
  minutyPonadDlugosc({ minutyNaBoisku: 90, dlugoscMeczu: null, rpe: null }) === false
  && minutyPonadDlugosc({ minutyNaBoisku: null, dlugoscMeczu: 60, rpe: null }) === false
  && minutyPonadDlugosc({ minutyNaBoisku: 90, dlugoscMeczu: 60, rpe: null }) === true);

check('⭐ CIĘŻKOŚĆ WCHODZI DO TEJ SAMEJ LICZBY, którą widzi zawodnik — '
  + 'inaczej ekran i licznik pracy pokazywałyby dwie różne prawdy',
  punkty(w(90, 90, 10)) === punktyRozwojuNaEkranie(wagaMeczu(90, 90, 10).punkty)
  && punkty(w(90, 90, 10)) === MAKS_PUNKTOW_ZA_MECZ,
  `${punkty(w(90, 90, 10))}`);

check('⭐ (Z0) przy nieznanej długości zdanie MÓWI, że liczymy z 90 — '
  + 'zamiast podać podstawienie jako pomiar',
  /nie podałeś/.test(w(45, null).zdanie) && /90/.test(w(45, null).zdanie),
  w(45, null).zdanie);
check('⭐ wynik stoi TRZECIĄ LINIĄ tego samego bloku i nazywa obie liczby',
  /2 z 4 punktów za ten mecz/.test(w(45, 90).zdanie) && /45 minut z 90/.test(w(45, 90).zdanie),
  w(45, 90).zdanie);

// ═════════════════════════════════════════════════════════════════════
// 5. ⭐ BRZMIENIA — ZATWIERDZONE, JEDNOŹRÓDŁOWE, BEZ SERII I PORÓWNAŃ
// ═════════════════════════════════════════════════════════════════════
const BRZMIENIE_KUBY = 'Nie wszedłeś na boisko — ten mecz nie dokłada pracy do licznika. '
  + 'Mecz zostaje w Twojej historii.';
check('⭐ (M2) brzmienie meczu z 0 minut przeniesione CO DO ZNAKU z decyzji Kuby',
  MECZ_ZERO_MINUT === BRZMIENIE_KUBY, MECZ_ZERO_MINUT);
check('⛔ to jest JEDNO brzmienie, nie dwa — ekran i licznik pracy czytają tę samą stałą',
  MECZ_ZERO_MINUT === MECZ_BEZ_MINUT_NA_BOISKU);

// ⛔ CZYTAMY DOKŁADNIE TEN KOMENTARZ, KTÓRY STOI NAD TYM BRZMIENIEM — nie cały
// plik. `nagrodaZaPrace.ts` ma inne, PRAWDZIWE znaczniki „do przejrzenia"
// (progi, wagi, nazwy odznak) i skasowanie ich byłoby zamiataniem cudzych
// otwartych pytań pod dywan.
const zrodloNagrody = readFileSync(join(root, 'lib', 'nagrodaZaPrace.ts'), 'utf8');
{
  const gdzie = zrodloNagrody.indexOf('export const MECZ_BEZ_MINUT_NA_BOISKU');
  const komentarz = gdzie > 0 ? zrodloNagrody.slice(Math.max(0, gdzie - 700), gdzie) : '';
  check('⭐ (§4.2) ZNACZNIK „do przejrzenia przez Kubę" ZDJĘTY Z TEGO brzmienia — '
    + 'jest zatwierdzone, a nie czeka na kogoś',
    gdzie > 0
    && !/DO PRZEJRZENIA PRZEZ KUBĘ/.test(komentarz)
    && /ZATWIERDZONE PRZEZ KUBĘ 18\.08\.2026/.test(komentarz),
    komentarz.slice(-160));
}

const NOWE_BRZMIENIA = [
  MECZ_ZERO_MINUT, MECZ_BEZ_ZAZNACZENIA, MECZ_MINUTY_PONAD_DLUGOSC,
  MECZ_WIECEJ_NIC_DO_ZAPISU, POLE_MINUTY_NA_BOISKU, POLE_DLUGOSC_MECZU,
  podpisArkuszaMeczu(), w(45, 90).zdanie,
];
// ⛔ N1 — zero słów o serii, passie i dniach z rzędu. ⛔ N3 — zero porównań.
const ZAKAZANE = /passa|seri[ae]|z rzędu|codziennie|nie przerwij|inni zawodnicy|lepszy niż|gorszy niż|średnia innych/i;
check('⛔ (N1, N3) ANI JEDNO nowe brzmienie nie mówi o serii, passie ani o innych',
  NOWE_BRZMIENIA.every((t) => !ZAKAZANE.test(t)),
  NOWE_BRZMIENIA.filter((t) => ZAKAZANE.test(t)).join(' · '));
check('⛔ zdanie o sprzeczności NIE OCENIA zawodnika — mówi, co się nie zgadza, '
  + 'i oddaje decyzję jemu',
  /nie zgadniemy/.test(MECZ_MINUTY_PONAD_DLUGOSC) && !/błąd|źle|pomyliłeś/i.test(MECZ_MINUTY_PONAD_DLUGOSC),
  MECZ_MINUTY_PONAD_DLUGOSC);

// ═════════════════════════════════════════════════════════════════════
// 6. ⭐ ZAPIS — WIERSZ MIEŚCI SIĘ W CHECK-ACH BAZY, DUPLIKAT NIE POWSTAJE
// ═════════════════════════════════════════════════════════════════════
const PELNE_WIECEJ: WiecejOMeczu = {
  samoocena: 7, stanMentalny: 6, wymagajaceWarunki: true,
  pozycja: 'Środkowy pomocnik', bramkiMy: 2, bramkiOni: 1, notatka: '  dobry mecz  ',
};
const zapisz = (
  stan: StanKontekstuMeczu, ocena: OcenaMeczu, wiecej: WiecejOMeczu = PELNE_WIECEJ,
): DecyzjaZapisuMeczu =>
  zdecydujOZapisieMeczu({ idZawodnika: 'u-1', stan, ocena, wiecej });

const pierwszy = zapisz({ rodzaj: 'brak' }, { minutyNaBoisku: 45, dlugoscMeczu: 60, rpe: 8 });
check('⭐ pierwszy zapis WSTAWIA wiersz z `user_id` i `game_type` (obie kolumny NOT NULL)',
  pierwszy.rodzaj === 'wstaw'
  && pierwszy.wiersz.user_id === 'u-1'
  && pierwszy.wiersz.game_type === RODZAJ_MECZU_Z_KAFLA,
  pierwszy.rodzaj);

const drugi = zapisz({ rodzaj: 'zapisany', id: 41 }, { minutyNaBoisku: 45, dlugoscMeczu: 60, rpe: 8 });
check('⭐⭐ drugi zapis DOKŁADA do tego samego wiersza — ⛔ dwa wiersze znaczyłyby, '
  + 'że licznik pracy liczy ten sam mecz dwa razy',
  drugi.rodzaj === 'aktualizuj' && drugi.id === 41,
  drugi.rodzaj);

check('⛔ PUSTY MECZ SIĘ NIE ZAPISUJE — wiersz bez ani jednej wartości waży w liczniku '
  + '1 punkt, czyli byłby nagrodą za dotknięcie przycisku (N1)',
  zapisz({ rodzaj: 'brak' }, { minutyNaBoisku: null, dlugoscMeczu: null, rpe: null },
    PUSTE_WIECEJ_O_MECZU).rodzaj === 'nie_zapisuj');

const sprzeczny = zapisz({ rodzaj: 'brak' }, { minutyNaBoisku: 90, dlugoscMeczu: 60, rpe: null });
check('⭐⛔ ZAPADKA BAZY ZNANA O KROK WCZEŚNIEJ: 90 minut w meczu 60-minutowym '
  + 'nie idzie do bazy, a zawodnik dostaje zdanie zamiast kodu `23514`',
  sprzeczny.rodzaj === 'nie_zapisuj' && sprzeczny.zdanie === MECZ_MINUTY_PONAD_DLUGOSC,
  sprzeczny.rodzaj);

if (pierwszy.rodzaj === 'wstaw') {
  const r = pierwszy.wiersz;
  const mieściSie =
    (r.minutes_played === null || (r.minutes_played >= 0 && r.minutes_played <= 130))
    && (r.match_length_minutes === null || (r.match_length_minutes > 0 && r.match_length_minutes <= 150))
    && (r.minutes_played === null || r.match_length_minutes === null
      || r.minutes_played <= r.match_length_minutes)
    && (r.match_rpe === null || (r.match_rpe >= 0 && r.match_rpe <= 10))
    && (r.self_rating === null || (r.self_rating >= 0 && r.self_rating <= 10))
    && (r.mental_state === null || (r.mental_state >= 0 && r.mental_state <= 10))
    && (r.own_score === null || r.own_score >= 0)
    && (r.opponent_score === null || r.opponent_score >= 0)
    && ['official_match', 'friendly', 'training_game', 'tournament'].includes(r.game_type);
  check('⭐⭐ WIERSZ MIEŚCI SIĘ WE WSZYSTKICH DZIEWIĘCIU CHECK-ACH `match_contexts` — '
    + 'sprawdzone tymi samymi wyrażeniami, które stoją w bazie (zmierzone 18.08.2026)',
    mieściSie, JSON.stringify(r));
  check('⛔ notatka jest PRZYCIĘTA, a pusta zostaje pustką — a nie napisem ze spacji',
    r.free_note === 'dobry mecz');
}

check('⭐⛔ (klucz obcy) pozycje do wyboru są WYPROWADZONE z `positionProfiles`, '
  + 'a nie przepisane — `position_played_today` ma FK do `positions(id)`',
  POZYCJE_DO_WYBORU.length === 8
  && POZYCJE_DO_WYBORU.every((p) => LABEL_TO_POSITION_KEY[p] !== undefined)
  && !POZYCJE_DO_WYBORU.includes('Nie dotyczy'),
  POZYCJE_DO_WYBORU.join(', '));
check('⛔ pozycja spoza słownika NIE PRZECHODZI dalej jako liczba ani jako pusty napis',
  (() => {
    const d = zapisz({ rodzaj: 'brak' }, { minutyNaBoisku: 45, dlugoscMeczu: 90, rpe: null },
      { ...PELNE_WIECEJ, pozycja: '   ' });
    return d.rodzaj === 'wstaw' && d.wiersz.position_played_today === null;
  })());

check('⛔ log mówi WPROST, co się stało z wierszem — cisza po zapisie jest defektem',
  /wstawiam/.test(opisZapisuMeczuDoLogu(pierwszy))
  && /aktualizuję id=41/.test(opisZapisuMeczuDoLogu(drugi))
  && /NIE ZAPISUJĘ/.test(opisZapisuMeczuDoLogu(sprzeczny)));

// ═════════════════════════════════════════════════════════════════════
// 7. ⭐⭐ WEJŚCIE ISTNIEJE — I OD DZIŚ COŚ ZA NIM STOI
// ═════════════════════════════════════════════════════════════════════
const ekranSurowy = readFileSync(join(root, 'app', '(tabs)', 'dzis.tsx'), 'utf8');
const ekran = bezKomentarzy(ekranSurowy);
const layout = bezKomentarzy(readFileSync(join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8'));

check('⭐⛔ zakładka „Mecz" JEST ZDJĘTA z paska (`href: null`)',
  /name="mecz"[\s\S]{0,120}href:\s*null/.test(layout), 'mecz nadal jest zakładką');
check('⭐⛔⛔ ekran „Dziś" MA `router.push(\'/mecz\')` — bez tego zdjęcie zakładki '
  + 'kasuje 961 linii i jedyną drogę do `match_contexts`',
  /router\.push\('\/mecz'\)/.test(ekran), 'ZERO wejść do /mecz');
check('⭐ wejście prowadzi Z ARKUSZA meczu, a nie z przypadkowego miejsca',
  /rodzaj: 'meczWiecej'/.test(ekran) && /\{MECZ_WIECEJ_WEJSCIE\}/.test(ekran));
check('⛔ napis wejścia bierze się ze stałej modułu — na ekranie nie stoi jego kopia',
  !ekran.includes(MECZ_WIECEJ_WEJSCIE), 'napis przepisany do ekranu');
check('⭐ arkusz meczu otwiera się Z KAFLA MECZU — rozpoznanie po `eventType === \'match\'`',
  /eventType === 'match'/.test(ekran), 'kafel meczu nie jest rozpoznawany');
// ⭐⭐ WIĄZANIE TABELA ↔ EKRAN. ⛔ Bez niego dopisanie siódmej rzeczy do
// `RZECZY_O_MECZU` nie zapaliłoby niczego, a arkusz nadal rysowałby sześć.
check('⭐⛔ KAŻDA rzecz z tabeli arkusza MA SWOJE POLE na ekranie — lista i arkusz '
  + 'nie mogą rozjechać się po cichu',
  POLA_ARKUSZA.length === wArkuszu.length
  && POLA_ARKUSZA.map((f) => f.kolumna).join(',') === wArkuszu.map((r) => r.kolumna).join(',')
  && POLA_ARKUSZA.every((f) => ekran.includes(`{${f.stala}}`)),
  POLA_ARKUSZA.filter((f) => !ekran.includes(`{${f.stala}}`)).map((f) => f.stala).join(', ') || 'lista się nie zgadza');
check('⭐⛔ (Z0) mechanizm „czego produkt nie umie" NADAL jest wołany z ekranu — '
  + 'także wtedy, gdy dziś nie ma czego wypisać',
  /czegoNieUmiemyZapisac\(\)/.test(ekran) && /MECZ_CZEKA_NA_KOLUMNE/.test(ekran));
check('⭐⛔ KOLEJNOŚĆ: wejście zastępcze i zdjęcie zakładki stoją w tym samym stanie repozytorium',
  /router\.push\('\/mecz'\)/.test(ekran) && /name="mecz"[\s\S]{0,120}href:\s*null/.test(layout));

// ── ⭐ CO DOSZŁO 18.08 WIECZOREM ──────────────────────────────────────
check('⭐⭐ (D8) ekran RYSUJE OBA POLA meczu — ze stałych modułu, nie z własnych napisów',
  /\{POLE_MINUTY_NA_BOISKU\}/.test(ekran) && /\{POLE_DLUGOSC_MECZU\}/.test(ekran)
  && /MINUTY_NA_BOISKU\.map/.test(ekran) && /DLUGOSCI_MECZU\.map/.test(ekran));
check('⭐⭐ (D8) ekran NIE LICZY PUNKTÓW SAM — woła `wynikMeczu`, a zdania nie ma w jego treści',
  /wynikMeczu\(\{/.test(ekran) && !ekranSurowy.includes('punktów za ten mecz'));
check('⭐⭐ (D8) ekran ZAPISUJE mecz przez czystą regułę, a nie własnym `if`-em',
  /zdecydujOZapisieMeczu\(\{/.test(ekran) && /match_contexts/.test(ekran));
check('⭐⛔ (D8) mapowanie długości meczu JEST wołane, a stara rzutka ZNIKNĘŁA',
  /meczDlaNagrody/.test(ekran) && !/as unknown as WierszMeczuNagroda\[\]/.test(ekran));
check('⭐ (D8) arkusz „powiedz więcej" ma sześć POLI, nie sześć napisów',
  [/\{POLE_SAMOOCENA\}/, /\{POLE_STAN_MENTALNY\}/, /\{POLE_WARUNKI\}/,
    /\{POLE_POZYCJA\}/, /\{POLE_WYNIK\}/, /\{POLE_NOTATKA\}/].every((r) => r.test(ekran))
  && /MECZ_WIECEJ_ZAPISZ/.test(ekran));
check('⛔⭐ (Z6) ŻADNA wartość meczu nie jest zaznaczona z góry — oba stany startują pustką',
  /useState<number \| null>\(null\);\s*$/m.test(ekran)
  && /const \[minutyNaBoisku, setMinutyNaBoisku\] = useState<number \| null>\(null\)/.test(ekran)
  && /const \[dlugoscMeczu, setDlugoscMeczu\] = useState<number \| null>\(null\)/.test(ekran),
  'któreś z pól startuje z liczbą');
check('⛔ (D6) CIĘŻKOŚCI Z PLANU NIE MA W ŚCIEŻCE MECZU — ekran nie podpowiada RPE',
  !/rpeZPlanu|podpowiedzRpe|setRpeWybrane\(\d/.test(ekran));

// ⛔⛔ WSZYSTKO, CO DOŁOŻYŁ TEN PAS, MUSI MIEŚCIĆ SIĘ W ARKUSZU — czyli poza
// obszarem przewijania. Ekran „Dziś" ma zapas liczony w dp, nie w rzeczach.
{
  const odScroll = ekran.indexOf('<ScrollView');
  const doScroll = ekran.lastIndexOf('</ScrollView>');
  const wnetrze = odScroll >= 0 && doScroll > odScroll ? ekran.slice(odScroll, doScroll) : '';
  check('⭐⭐ (D8) CAŁA ŚCIEŻKA MECZU STOI W ARKUSZU, nie na ekranie — `renderKrokiOceny` '
    + 'i `renderPytaniaOWystapienia` nie są wołane wewnątrz `ScrollView` (koszt 0 dp)',
    wnetrze.length > 0
    && !/renderKrokiOceny\(/.test(wnetrze)
    && !/renderPytaniaOWystapienia\(/.test(wnetrze)
    && !/styles\.meczBlok/.test(wnetrze),
    `wnętrze ScrollView: ${wnetrze.length} znaków`);
}

// ═════════════════════════════════════════════════════════════════════
// 8. ⭐⭐ BATERIA MUTACJI — SIEDEM MUTACJI WŁASNEGO KODU
//
// ⛔ ASERCJA ODWROTNA NAJPIERW: na PRAWDZIWYCH regułach bateria ma ZERO FAIL-i.
// Bez niej „każda mutacja coś zapala" byłoby prawdą także dla baterii, która
// zapala się zawsze — czyli dla baterii, która niczego nie pilnuje.
// ═════════════════════════════════════════════════════════════════════
type Predykat = { nazwa: string; ok: () => boolean };
type Wynikator = (o: OcenaMeczu) => WynikMeczu;
type Zapisywacz = typeof zdecydujOZapisieMeczu;
type Mapowacz = typeof meczDlaNagrody;

const bateria = (wm: Wynikator, zm: Zapisywacz, map: Mapowacz, rzeczy: readonly RzeczOMeczu[]): Predykat[] => {
  const pkt = (m: number | null, d: number | null, r: number | null = null): number => {
    const x = wm({ minutyNaBoisku: m, dlugoscMeczu: d, rpe: r });
    return x.rodzaj === 'policzony' ? x.punkty : -1;
  };
  const zap = (stan: StanKontekstuMeczu, o: OcenaMeczu): DecyzjaZapisuMeczu =>
    zm({ idZawodnika: 'u-1', stan, ocena: o, wiecej: PELNE_WIECEJ });
  return [
    { nazwa: 'B1 mecz bez minut NIE dostaje pełnej wagi',
      ok: () => wm({ minutyNaBoisku: null, dlugoscMeczu: 90, rpe: null }).rodzaj === 'brak_minut' },
    { nazwa: 'B2 długość meczu JEST odczytywana z bazy',
      ok: () => map(wierszZBazy({ minutes_played: 60, match_length_minutes: 60 })).dlugoscMeczu === 60 },
    { nazwa: 'B3 pełny mecz 60-minutowy daje 4 punkty',
      ok: () => punktyRozwojuNaEkranie(
        jednostkiZMeczow([map(wierszZBazy({ minutes_played: 60, match_length_minutes: 60 }))])[0].punkty,
      ) === MAKS_PUNKTOW_ZA_MECZ },
    { nazwa: 'B4 zero minut daje ZERO, nie 1',
      ok: () => wm({ minutyNaBoisku: 0, dlugoscMeczu: 90, rpe: null }).rodzaj === 'zero_minut' },
    { nazwa: 'B5 sufit 4 punktów obowiązuje',
      ok: () => pkt(120, null) === MAKS_PUNKTOW_ZA_MECZ },
    { nazwa: 'B6 minuty ponad długość meczu NIE dają wyniku',
      ok: () => wm({ minutyNaBoisku: 90, dlugoscMeczu: 60, rpe: null }).rodzaj === 'sprzecznosc' },
    { nazwa: 'B7 sprzeczność NIE IDZIE do bazy',
      ok: () => zap({ rodzaj: 'brak' }, { minutyNaBoisku: 90, dlugoscMeczu: 60, rpe: null }).rodzaj === 'nie_zapisuj' },
    { nazwa: 'B8 drugi zapis DOKŁADA, nie wstawia',
      ok: () => zap({ rodzaj: 'zapisany', id: 41 }, { minutyNaBoisku: 45, dlugoscMeczu: 90, rpe: null }).rodzaj === 'aktualizuj' },
    { nazwa: 'B9 pusty mecz się NIE zapisuje',
      ok: () => zm({ idZawodnika: 'u-1', stan: { rodzaj: 'brak' },
        ocena: { minutyNaBoisku: null, dlugoscMeczu: null, rpe: null },
        wiecej: PUSTE_WIECEJ_O_MECZU }).rodzaj === 'nie_zapisuj' },
    { nazwa: 'B10 długość meczu NIE jest podstawiana przy zapisie (Z0)',
      ok: () => {
        const d = zap({ rodzaj: 'brak' }, { minutyNaBoisku: 45, dlugoscMeczu: null, rpe: null });
        return d.rodzaj === 'wstaw' && d.wiersz.match_length_minutes === null;
      } },
    { nazwa: 'B11 długość meczu stoi w ścieżce oceny, nie w arkuszu',
      ok: () => rzeczy.some((r) => r.kolumna === 'match_length_minutes' && r.miejsce === 'ocena_z_kafla' && r.stan === 'dziala') },
  ];
};
const ileFail = (b: Predykat[]): number => b.filter((p) => !p.ok()).length;
const PRAWDZIWA = bateria(wynikMeczu, zdecydujOZapisieMeczu, meczDlaNagrody, RZECZY_O_MECZU);
check(`⭐⭐ ASERCJA ODWROTNA — na PRAWDZIWYCH regułach bateria (${PRAWDZIWA.length} predykatów) ma ZERO FAIL-i`,
  ileFail(PRAWDZIWA) === 0,
  PRAWDZIWA.filter((p) => !p.ok()).map((p) => p.nazwa).join(' · '));

const MUTACJE: [string, () => Predykat[]][] = [
  ['M1 ⛔ mecz bez minut dostaje pełną wagę', () => bateria(
    (o) => (o.minutyNaBoisku === null
      ? { rodzaj: 'policzony', punkty: MAKS_PUNKTOW_ZA_MECZ, zdanie: 'x' }
      : wynikMeczu(o)),
    zdecydujOZapisieMeczu, meczDlaNagrody, RZECZY_O_MECZU)],
  ['M2 ⛔ długość meczu przestaje być odczytywana', () => bateria(
    wynikMeczu, zdecydujOZapisieMeczu,
    (r) => ({ ...meczDlaNagrody(r), dlugoscMeczu: null }), RZECZY_O_MECZU)],
  ['M3 ⛔ zero minut daje 1 punkt zamiast 0', () => bateria(
    (o) => (o.minutyNaBoisku === 0
      ? { rodzaj: 'policzony', punkty: 1, zdanie: 'x' }
      : wynikMeczu(o)),
    zdecydujOZapisieMeczu, meczDlaNagrody, RZECZY_O_MECZU)],
  ['M4 ⛔ sufit 4 punktów znika (błąd makiety przepisany do produktu)', () => bateria(
    (o) => {
      const m = o.minutyNaBoisku; const d = o.dlugoscMeczu ?? 90;
      if (typeof m !== 'number' || m <= 0) return wynikMeczu(o);
      return { rodzaj: 'policzony', punkty: Math.max(1, Math.round(4 * m / d)), zdanie: 'x' };
    },
    zdecydujOZabisieMeczuZastepczy, meczDlaNagrody, RZECZY_O_MECZU)],
  ['M5 ⛔ sprzeczność minut przepuszczona do bazy', () => bateria(
    (o) => (o.minutyNaBoisku !== null && o.dlugoscMeczu !== null && o.minutyNaBoisku > o.dlugoscMeczu
      ? { rodzaj: 'policzony', punkty: 6, zdanie: 'x' }
      : wynikMeczu(o)),
    (a) => (a.ocena.minutyNaBoisku !== null && a.ocena.dlugoscMeczu !== null
      && a.ocena.minutyNaBoisku > a.ocena.dlugoscMeczu
      ? { rodzaj: 'wstaw', wiersz: { user_id: a.idZawodnika, game_type: RODZAJ_MECZU_Z_KAFLA,
        minutes_played: a.ocena.minutyNaBoisku, match_length_minutes: a.ocena.dlugoscMeczu,
        match_rpe: null, self_rating: null, mental_state: null, demanding_conditions: null,
        position_played_today: null, own_score: null, opponent_score: null, free_note: null },
      powod: 'mutacja' }
      : zdecydujOZapisieMeczu(a)),
    meczDlaNagrody, RZECZY_O_MECZU)],
  ['M6 ⛔ drugi zapis WSTAWIA drugi wiersz — ten sam mecz liczy się dwa razy', () => bateria(
    wynikMeczu,
    (a) => zdecydujOZapisieMeczu({ ...a, stan: { rodzaj: 'brak' } }),
    meczDlaNagrody, RZECZY_O_MECZU)],
  ['M7 ⛔ brak długości podstawia po cichu 90 przy ZAPISIE (plan jako pomiar)', () => bateria(
    wynikMeczu,
    (a) => zdecydujOZapisieMeczu({ ...a,
      ocena: { ...a.ocena, dlugoscMeczu: a.ocena.dlugoscMeczu ?? 90 } }),
    meczDlaNagrody, RZECZY_O_MECZU)],
  ['M8 ⛔ długość meczu spada do arkusza — znika ze ścieżki oceny', () => bateria(
    wynikMeczu, zdecydujOZapisieMeczu, meczDlaNagrody,
    RZECZY_O_MECZU.map((r) => (r.kolumna === 'match_length_minutes'
      ? { ...r, miejsce: 'arkusz_wiecej' as const } : r)))],
];

for (const [nazwa, zbuduj] of MUTACJE) {
  const b = zbuduj();
  const zapalone = b.filter((p) => !p.ok()).map((p) => p.nazwa);
  check(`⭐ mutacja „${nazwa}" zapala strażnik IMIENNIE — ${zapalone.join(' · ') || 'NIC'}`,
    zapalone.length > 0,
    '⛔ mutacja nie zapaliła niczego — strażnika nie ma, trzeba go wzmocnić');
}

// ⛔ POMOCNIK DLA M4: sufit znika w liczeniu, zapis zostaje prawdziwy.
function zdecydujOZabisieMeczuZastepczy(
  a: Parameters<typeof zdecydujOZapisieMeczu>[0],
): DecyzjaZapisuMeczu {
  return zdecydujOZapisieMeczu(a);
}

// ⛔ PODSUMOWANIE W KSZTAŁCIE, KTÓRY CZYTA `tests/run-selftests.mjs`.
console.log(`\n${ok} passed, ${bledy} failed`);
if (bledy > 0) throw new Error(`${bledy} asercji nie przeszło`);
