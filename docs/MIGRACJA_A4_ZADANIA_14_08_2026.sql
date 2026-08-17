-- ═══════════════════════════════════════════════════════════════════════
-- MIGRACJA A4 — TABELA ZADAŃ `public.player_tasks`
-- ═══════════════════════════════════════════════════════════════════════
--
-- ⛔ ODTWORZONE Z PRODUKCJI 16.08.2026 (pas I1) — NIE URUCHAMIAĆ.
--    BAZA JUŻ TO MA. Ten plik NIE JEST zapisem tego, co kiedyś wykonano;
--    jest ODCZYTEM tego, co dziś stoi na produkcji, spisanym co do znaku
--    z katalogu systemowego:
--      information_schema.columns · pg_constraint · pg_indexes · pg_policy
--      · pg_trigger · pg_get_functiondef · pg_class.relrowsecurity
--      · information_schema.role_table_grants
--    Projekt `kqrbztsvepjtggjmmcdx`, 16.08.2026. Zero zapisu do bazy.
--
-- ⚠️ PO CO ISTNIEJE. Do 16.08.2026 tego pliku nie było w repozytorium,
--    a `lib/zadania.selftest.ts` szukał go i — nie znajdując — wypisywał
--    POMINIETE dla czterech warstw (w tym dziewięciu asercji o RLS).
--    Podsumowanie suity liczyło to jako przejście: „44/44 przeszło",
--    wyjście 0, a warstwa, która pilnuje, żeby zawodnik NIE CZYTAŁ CUDZYCH
--    ZADAŃ, nie uruchamiała się w ogóle (H1, klasa K5; ograniczenie O76).
--
-- ⚠️ CZEGO TEN PLIK NIE ZAŁATWIA (ograniczenie O67). Plik odtworzony
--    z pomiaru STARZEJE SIĘ CICHO: zmiana polityki na produkcji nie zmienia
--    tego pliku. Dlatego ŹRÓDŁEM OCZEKIWANEGO KSZTAŁTU jest stała
--    `RLS_ZMIERZONE_NA_PRODUKCJI` w `lib/zadania.selftest.ts`, a ten plik
--    jest tym, co strażnik z nią PORÓWNUJE. Rozjazd pliku i stałej zapala
--    strażnika. Rozjazdu PRODUKCJI z obojgiem nie widzi nikt — kontrola
--    migracji dzieje się na produkcji, nie w CI (O65).
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. TABELA ─────────────────────────────────────────────────────────
-- ⛔ NIE MA TU KOLUMNY KUBEŁKA ANI KOLEJNOŚCI. Kolejność liczy ranker
--    (`lib/kolejkaPodania.ts`, pas B1). Zamrożona w danych unieważniłaby go.
create table if not exists public.player_tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  title            text not null,
  reason_fact      text,
  reason_text      text,
  reason_register  text,
  reason_key       text,
  origin           text not null,
  source_table     text,
  -- ⭐ PLAN-D-S1 16.08.2026 — DEKLARACJA POPRAWIONA, BO OD DZIŚ KŁAMAŁA.
  -- BYŁO: `source_row_id uuid`. Migracja `player_tasks_source_row_id_na_text`
  -- (wykonana na produkcji 16.08.2026) zmieniła typ na `text`, bo wszystkie
  -- cztery tabele źródłowe wglądów — `pain_entries`, `daily_logs`,
  -- `calendar_events`, `match_contexts` — mają `id` typu `bigint`, a
  -- `select '12'::uuid` kończy się `22P02`. Przy `uuid` ślad PIĘCIU z sześciu
  -- wglądów nie mieścił się w kolumnie i zadanie systemowe nie mogło zapisać
  -- wskazania na rekord, z którego powstało (WG-17 „skąd to wiemy").
  -- ⛔ TEN PLIK JEST OPISEM STANU, NIE SKRYPTEM DO PONOWNEGO URUCHOMIENIA.
  source_row_id    text,
  effort_seconds   integer,
  due_on           date,
  state            text not null default 'open',
  state_changed_at timestamptz,
  raised_at        timestamptz,
  system_key       text,
  created_at       timestamptz not null default now()
);

-- ─── 2. OGRANICZENIA (CHECK) ───────────────────────────────────────────
alter table public.player_tasks
  add constraint player_tasks_title_len
  check (char_length(title) >= 1 and char_length(title) <= 120);

alter table public.player_tasks
  add constraint player_tasks_origin_enum
  check (origin = any (array['player','calendar','focus_block','journal','profile','system']));

alter table public.player_tasks
  add constraint player_tasks_state_enum
  check (state = any (array['open','done','abandoned']));

-- „Odhaczone" i „porzucone" to NIE JEST to samo — dlatego trzy stany, nie flaga.
alter table public.player_tasks
  add constraint player_tasks_stan_ma_date
  check ((state = 'open') = (state_changed_at is null));

alter table public.player_tasks
  add constraint player_tasks_effort_dodatni
  check (effort_seconds is null or effort_seconds > 0);

-- WG-17: rekord nie wychodzi bez źródła — połówka źródła jest zakazana.
alter table public.player_tasks
  add constraint player_tasks_zrodlo_calosc
  check ((source_table is null) = (source_row_id is null));

-- ⭐ PLAN-D-S1 16.08.2026 — CHECK DOŁOŻONY RAZEM ZE ZMIANĄ TYPU NA `text`.
-- ⛔ CELOWO NIE WALIDUJE „per tabela źródłowa". Lista „które źródła mają
-- `bigint`, a które `uuid`" starzałaby się po cichu przy pierwszym nowym
-- źródle danych (O67, O89) — a starzejąca się lista w bazie jest gorsza niż
-- brak listy, bo wygląda na regułę. Kolumna pilnuje KSZTAŁTU, nie pochodzenia:
-- ślad ma być niepusty, przycięty i mieścić się w 64 znakach.
-- ⚠️ Granica 64 stoi też w `lib/zadania.ts` jako `MAKS_DLUGOSC_SLADU` i jest
-- przypięta zapadką na RÓWNOŚĆ w `lib/zadania.selftest.ts`.
alter table public.player_tasks
  add constraint player_tasks_source_row_id_ksztalt
  check (
    source_row_id is null
    or (btrim(source_row_id) = source_row_id
        and char_length(source_row_id) >= 1
        and char_length(source_row_id) <= 64)
  );

-- WG-17 / Z0: powód bez rejestru nie wychodzi w ogóle.
alter table public.player_tasks
  add constraint player_tasks_reason_register_enum
  check (
    (reason_fact is null and reason_register is null and reason_key is null)
    or (reason_fact is not null
        and reason_register = any (array['fakt_o_tobie','fakt_o_innych','propozycja'])
        and reason_key is not null)
  );

-- Zadanie NIE OD ZAWODNIKA musi umieć powiedzieć, skąd się wzięło.
alter table public.player_tasks
  add constraint player_tasks_system_ma_powod
  check (origin = 'player' or reason_fact is not null or reason_text is not null);

-- ─── 3. INDEKSY ────────────────────────────────────────────────────────
-- WG-18: zadania systemowego nie da się wstawić dwa razy tym samym kluczem.
-- Na tym indeksie stoi `on conflict (user_id, system_key) do nothing`
-- (`UPSERT_ZADANIA_SYSTEMOWEGO` w `lib/zadania.ts`).
create unique index if not exists player_tasks_system_key_uniq
  on public.player_tasks (user_id, system_key);

create index if not exists player_tasks_user_state_idx
  on public.player_tasks (user_id, state);

-- ─── 4. WYZWALACZ ──────────────────────────────────────────────────────
-- R2: powodu systemowego NIE DA SIĘ skasować ani nadpisać. Pilnuje tego
-- baza, bo do tabeli pisze także cron — nie sama appka.
create or replace function public.player_tasks_pilnuj()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  -- 1. POCHODZENIE JEST NIEZMIENNE PO UTWORZENIU (w obie strony).
  --    Bez tego zawodnik zakladal zadanie jako 'player' i awansowal je UPDATE-em
  --    na 'system', dorabiajac sobie system_key i reason_text.
  if new.origin is distinct from old.origin then
    raise exception
      'PLAN-D-A4: pochodzenia zadania nie wolno zmieniac po utworzeniu (zadanie %, % -> %)',
      old.id, old.origin, new.origin
      using errcode = 'check_violation';
  end if;

  -- 2. POWÓD SYSTEMOWY JEST NIENARUSZALNY.
  if old.origin <> 'player' then
    if new.reason_fact     is distinct from old.reason_fact
    or new.reason_text     is distinct from old.reason_text
    or new.reason_register is distinct from old.reason_register
    or new.reason_key      is distinct from old.reason_key
    or new.source_table    is distinct from old.source_table
    or new.source_row_id   is distinct from old.source_row_id
    or new.system_key      is distinct from old.system_key
    then
      raise exception
        'PLAN-D-A4: powodu zadania systemowego nie wolno zmieniac ani kasowac (zadanie %, origin %)',
        old.id, old.origin
        using errcode = 'check_violation';
    end if;
  end if;

  -- 3. ZADANIE ZAWODNIKA NIE DORABIA SOBIE KLUCZY SYSTEMOWYCH.
  if old.origin = 'player' then
    if new.system_key    is distinct from old.system_key
    or new.source_table  is distinct from old.source_table
    or new.source_row_id is distinct from old.source_row_id
    then
      raise exception
        'PLAN-D-A4: do zadania zawodnika nie wolno dopisywac kluczy systemowych (zadanie %)',
        old.id
        using errcode = 'check_violation';
    end if;
  end if;

  -- 4. DATA ZMIANY STANU STAWIA SIĘ SAMA I TYLKO PRZY ZMIANIE STANU.
  if new.state is distinct from old.state then
    if new.state = 'open' then
      new.state_changed_at := null;
    else
      new.state_changed_at := now();
    end if;
  else
    -- stan sie nie zmienil: recznego przestawiania daty nie ma
    new.state_changed_at := old.state_changed_at;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_player_tasks_pilnuj on public.player_tasks;
create trigger trg_player_tasks_pilnuj
  before update on public.player_tasks
  for each row execute function public.player_tasks_pilnuj();

-- ─── 5. RLS — W TYM SAMYM PLIKU, CO `create table` ─────────────────────
-- ⛔ R6. Tabela bez RLS to tabela, z której da się czytać CUDZE ZADANIA.
--    Nie ma wersji „włączymy jutro".
alter table public.player_tasks enable row level security;

-- ⛔ Grantów dla roli `anon` NIE MA i mieć nie ma. Zadanie jest danymi
--    zawodnika, a `anon` to każdy, kto zna adres projektu.
revoke all on public.player_tasks from anon;
grant select, insert, update on public.player_tasks to authenticated;

-- ⛔ NIE MA POLITYKI DELETE — zadanie się PORZUCA (`state='abandoned'`),
--    nie kasuje. Skasowane zadanie zabiera ze sobą powód, dla którego
--    powstało, a ten jest dowodem, nie ozdobą.
create policy player_tasks_select_own
  on public.player_tasks for select to authenticated
  using (user_id = (select auth.uid()));

create policy player_tasks_insert_own
  on public.player_tasks for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and origin = 'player'
    and system_key is null
    and source_table is null
    and source_row_id is null
  );

create policy player_tasks_update_own
  on public.player_tasks for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ─── 6. ZAPYTANIE KONTROLNE ────────────────────────────────────────────
-- ⚠️ REGUŁA: liczby, których Kuba ma się spodziewać, mają MIEĆ SKĄD WYJŚĆ.
--    Zapytanie bez którejkolwiek z nich zostawia go z „wygląda OK".
--    ⭐ ZMIERZONE 16.08.2026: tabela=1 · rls=t · polityki=3 · polityka_delete=0
--       · checki=8 · indeksy=3 · wyzwalacz=1 · wierszy=0
--       · granty_authenticated=3 · granty_anon=0
select
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'player_tasks')                    as tabela,
  (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'player_tasks')                    as rls,
  (select count(*) from pg_policy where polrelid = 'public.player_tasks'::regclass) as polityki,
  (select count(*) from pg_policy where polrelid = 'public.player_tasks'::regclass
     and polcmd = 'd')                                                             as polityka_delete,
  (select count(*) from pg_constraint where conrelid = 'public.player_tasks'::regclass
     and contype = 'c')                                                            as checki,
  (select count(*) from pg_indexes where schemaname = 'public'
     and tablename = 'player_tasks')                                               as indeksy,
  (select count(*) from pg_trigger where tgrelid = 'public.player_tasks'::regclass
     and not tgisinternal)                                                         as wyzwalacz,
  (select count(*) from public.player_tasks)                                       as wierszy,
  (select count(*) from information_schema.role_table_grants where table_schema = 'public'
     and table_name = 'player_tasks' and grantee = 'authenticated')                as granty_authenticated,
  (select count(*) from information_schema.role_table_grants where table_schema = 'public'
     and table_name = 'player_tasks' and grantee = 'anon')                         as granty_anon;
