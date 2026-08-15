-- ============================================================
-- MIGRACJA L2 — JEDNA AKTYWNA SUBSKRYPCJA NA PARĘ (ZAWODNIK, ADRES)
-- PLAN-D-L2 08.2026 · 15.08.2026 · public.parent_report_subscriptions
--
-- ⛔ SESJA TEJ MIGRACJI NIE WYKONAŁA. Plik jest napisany, przetestowany
--    na PostgreSQL 16 w kontenerze sesji i oddany do wklejenia. Wykonanie
--    i zapytanie kontrolne NA PRODUKCJI (O65) należą do sesji nawigującej.
--
-- ── PO CO TO ISTNIEJE ───────────────────────────────────────
-- Znalezisko L-5 (zmierzone w `pg_indexes`, 15.08.2026): tabela ma cztery
-- indeksy — `parent_report_subscriptions_pkey`, `idx_parent_report_token`,
-- `idx_parent_report_player`, `idx_parent_report_due` — i ŻADEN nie pilnuje
-- pary (zawodnik, adres). Trzy kliknięcia „Zapisz e-mail rodzica" = trzy
-- subskrypcje = TRZY RAPORTY o tym samym dziecku na jeden okres.
--
-- ── DLACZEGO CZĘŚCIOWY (`where active`) ─────────────────────
-- Bez `where active` zawodnik, który się wypisał, NIE MOŻE SIĘ ZAPISAĆ
-- PONOWNIE: wiersz historyczny (`active = false`, z `unsubscribed_at`)
-- blokowałby parę na zawsze. A wierszy historycznych nie kasujemy — to jest
-- dziennik tego, co wyszło na zewnątrz o nieletnim, i ma zostać.
--
-- ── DLACZEGO PO `lower()` ───────────────────────────────────
-- `Mama@dom.pl` i `mama@dom.pl` to jeden rodzic i JEDNA skrzynka. Bez
-- `lower()` unikat przepuszcza duplikat po jednej zmianie wielkości litery,
-- czyli dokładnie ten przypadek, który zdarza się przy przepisywaniu adresu
-- z pamięci.
-- ⚠️ Appka jest lustrem tej decyzji: `normalizujEmail` w
--    `lib/raportRodzica.ts` robi `trim().toLowerCase()`. Zmiana po jednej
--    stronie bez drugiej to rozjazd, którego nikt nie zobaczy.
--
-- ── CZEGO TA MIGRACJA NIE ROBI, ŚWIADOMIE ───────────────────
--  • NIE dodaje polityki DELETE — jej brak jest stanem prawidłowym.
--    Wypisanie to `active = false`, nie skasowanie wiersza.
--  • NIE kasuje ani nie scala duplikatów. Gdyby jakieś były, migracja
--    ZATRZYMUJE SIĘ (sekcja 2) — scalanie wierszy o cudzych adresach
--    e-mail jest decyzją, nie skutkiem ubocznym indeksu.
--  • NIE rusza `parent_report_snapshots` ani niczego w `api/`.
--
-- ⚠️ IDEMPOTENTNA: `create unique index if not exists`. Drugie wykonanie
--    nie zmienia niczego i kończy się tym samym wierszem kontrolnym.
-- ============================================================


-- ------------------------------------------------------------
-- 1. WYKRYCIE DUPLIKATÓW — URUCHOM I PRZECZYTAJ, ZANIM PÓJDZIESZ DALEJ
--
-- 15.08.2026 na produkcji: PUSTY WYNIK (zmierzone, 1 wiersz w tabeli).
-- Ale migracja ma być bezpieczna także wtedy, gdy wierszy będzie więcej —
-- `create unique index` na tabeli z duplikatami PADA, i to jest właściwe
-- zachowanie. Ten SELECT mówi, KTÓRE wiersze trzeba wtedy rozstrzygnąć.
-- ------------------------------------------------------------
select
  player_user_id,
  lower(parent_email)                     as adres_po_lower,
  count(*)                                as ile_aktywnych,
  array_agg(id order by id)               as id_wierszy,
  array_agg(parent_email order by id)     as adresy_jak_wpisane,
  min(created_at)                         as najstarszy,
  max(created_at)                         as najnowszy
from public.parent_report_subscriptions
where active
group by player_user_id, lower(parent_email)
having count(*) > 1
order by ile_aktywnych desc, player_user_id;


-- ------------------------------------------------------------
-- 2. HAMULEC — migracja zatrzymuje się sama, jeśli duplikaty istnieją.
--
-- Bez tego bloku `create unique index` niżej oddałby surowy błąd Postgresa
-- („could not create unique index … Key … is duplicated"), z którego nie
-- widać ani ilu duplikatów jest, ani czyich.
-- ------------------------------------------------------------
do $$
declare
  ile_par integer;
  ile_wierszy integer;
begin
  select count(*), coalesce(sum(ile), 0)
    into ile_par, ile_wierszy
  from (
    select count(*) as ile
    from public.parent_report_subscriptions
    where active
    group by player_user_id, lower(parent_email)
    having count(*) > 1
  ) d;

  if ile_par > 0 then
    raise exception
      'MIGRACJA L2 ZATRZYMANA: % par (zawodnik, adres) ma po kilka aktywnych subskrypcji, razem % wierszy. Uruchom SELECT z sekcji 1, rozstrzygnij, który wiersz zostaje, i ustaw pozostałym active = false (NIE kasuj ich). Potem uruchom migrację jeszcze raz.',
      ile_par, ile_wierszy;
  end if;

  raise notice 'MIGRACJA L2: brak duplikatów, zakładam unikat.';
end
$$;


-- ------------------------------------------------------------
-- 3. UNIKAT — jedna AKTYWNA subskrypcja na parę (zawodnik, adres po lower)
-- ------------------------------------------------------------
create unique index if not exists idx_parent_report_unique_active_email
  on public.parent_report_subscriptions (player_user_id, lower(parent_email))
  where active;

comment on index public.idx_parent_report_unique_active_email is
  'PLAN-D-L2 15.08.2026. Jedna AKTYWNA subskrypcja raportu na parę (zawodnik, adres po lower()). '
  'CZĘŚCIOWY (where active), żeby wiersz historyczny po wypisaniu nie blokował ponownego zapisu; '
  'po lower(), bo Mama@dom.pl i mama@dom.pl to jedna skrzynka. '
  'Lustro po stronie appki: normalizujEmail() w lib/raportRodzica.ts. '
  'Naruszenie (23505) appka tłumaczy zdaniem "Ten adres juz dostaje raport."';


-- ------------------------------------------------------------
-- 4. ZAPYTANIE KONTROLNE — JEDEN WIERSZ, WARTOŚCI PODANE WPROST
--
-- SPODZIEWANY WYNIK NA PRODUKCJI 15.08.2026:
--   unikat_pary=1 · indeksow_razem=5 · polityk=3 · polityk_delete=0
--   · wierszy=1 · wierszy_aktywnych=1 · duplikatow=0 · rls=t
--   · komentarz_indeksu=t · unikat_czesciowy=t · unikat_po_lower=t
--
-- Każda inna wartość znaczy, że migracja NIE zrobiła tego, co miała.
-- ------------------------------------------------------------
select
  (select count(*) from pg_indexes
     where schemaname = 'public' and tablename = 'parent_report_subscriptions'
       and indexname = 'idx_parent_report_unique_active_email')            as unikat_pary,
  (select count(*) from pg_indexes
     where schemaname = 'public' and tablename = 'parent_report_subscriptions') as indeksow_razem,
  (select count(*) from pg_policies
     where schemaname = 'public' and tablename = 'parent_report_subscriptions') as polityk,
  (select count(*) from pg_policies
     where schemaname = 'public' and tablename = 'parent_report_subscriptions'
       and cmd = 'DELETE')                                                 as polityk_delete,
  (select count(*) from public.parent_report_subscriptions)                as wierszy,
  (select count(*) from public.parent_report_subscriptions where active)   as wierszy_aktywnych,
  (select count(*) from (
      select 1 from public.parent_report_subscriptions
      where active group by player_user_id, lower(parent_email) having count(*) > 1
   ) d)                                                                    as duplikatow,
  (select relrowsecurity from pg_class
     where oid = 'public.parent_report_subscriptions'::regclass)           as rls,
  (select obj_description(
     'public.idx_parent_report_unique_active_email'::regclass, 'pg_class') is not null) as komentarz_indeksu,
  (select indexdef like '%WHERE active%' from pg_indexes
     where schemaname = 'public' and indexname = 'idx_parent_report_unique_active_email') as unikat_czesciowy,
  (select indexdef like '%lower(parent_email)%' from pg_indexes
     where schemaname = 'public' and indexname = 'idx_parent_report_unique_active_email') as unikat_po_lower;


-- ============================================================
-- KONIEC MIGRACJI
--
-- CO TA MIGRACJA ZMIENIA W ZACHOWANIU APPKI — i dlaczego appka zmieniła się
-- w TYM SAMYM pasie:
--   PRZED: drugie kliknięcie „Zapisz" tworzyło po cichu duplikat.
--   PO SAMEJ MIGRACJI (gdyby appka została stara): drugie kliknięcie pokazałoby
--          dziecku surowy błąd bazy `23505 duplicate key value…`.
--   PO PASIE L2: appka najpierw czyta, co naprawdę jest, i albo mówi
--          „Ten adres już dostaje raport.", albo REAKTYWUJE wiersz
--          (`active = true`, `unsubscribed_at = null`) zamiast wstawiać drugi.
--          `23505` zostaje jako siatka na wyścig dwóch urządzeń i też ma
--          zdanie po ludzku.
--
-- ⚠️ `upsert` z PostgREST NIE ZADZIAŁA na tym indeksie: `on_conflict`
--    przyjmuje nazwy kolumn, a unikat stoi na WYRAŻENIU `lower(parent_email)`,
--    więc Postgres odpowiada `42P10 there is no unique or exclusion constraint
--    matching the ON CONFLICT specification`. Zmierzone na PostgreSQL 16,
--    nie założone — patrz nota pasa L2.
-- ============================================================
