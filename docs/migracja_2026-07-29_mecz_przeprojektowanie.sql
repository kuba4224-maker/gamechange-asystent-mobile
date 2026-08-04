-- ============================================================
-- ASYSTENT SPORTOWCA — MIGRACJA SCHEMATU
-- PRZEPROJEKTOWANIE TRYBU MECZU — Krok 1 procedury wdrożenia
-- Data przygotowania: 29.07.2026
-- Źródło specyfikacji: TRYB_MECZU_PRZEPROJEKTOWANIE_DECYZJE.md, punkt 9
--
-- KOLEJNOŚĆ MA ZNACZENIE: sekcja 1 (pain_entries) musi wejść PIERWSZA —
-- bez niej sekcja bólu w przeprojektowanym ekranie Mecz nie ma jak
-- zapisać danych (match_context_id jeszcze by nie istniał jako możliwy
-- rodzic wpisu bólowego).
--
-- Do uruchomienia w całości w Supabase SQL Editor. Idempotentne
-- (IF NOT EXISTS / DROP...IF EXISTS przed CREATE) — bezpieczne do
-- powtórzenia, jeśli coś przerwie wykonanie w połowie.
--
-- DECYZJA POTWIERDZONA Z KUBĄ (29.07.2026, przed napisaniem tego pliku):
-- `position_played_today` używa POLSKICH ETYKIET (np. "Bramkarz",
-- "Środkowy obrońca"), DOKŁADNIE tej samej formy co
-- `player_profiles.position_primary/secondary` i `public.positions.id`.
-- Dokument decyzji w punkcie 9 błędnie sugerował snake_case
-- (`bramkarz`, `obronca_srodkowy`...) — to pomylenie z zupełnie inną,
-- czysto wewnętrzną reprezentacją używaną WYŁĄCZNIE w kodzie appki do
-- wyboru wariantu treści pytania (POSITION_MAP_TEMP w index.html,
-- teraz portowane do mobile jako lib/positionProfiles.ts). Baza nigdzie
-- nie zna i nie powinna znać snake_case — dokładnie ten sam podział
-- odpowiedzialności co przy INJURY_MODE_ROUTING i POSITION_PROFILES.
-- ============================================================


-- ----------------------------------------------------------
-- 1. Naprawa pain_entries — dopuszczenie wpisu bólowego powiązanego
--    z meczem, nie tylko z Dziennikiem (Domena 03).
-- ----------------------------------------------------------
ALTER TABLE public.pain_entries ALTER COLUMN daily_log_id DROP NOT NULL;

ALTER TABLE public.pain_entries
  ADD COLUMN IF NOT EXISTS match_context_id BIGINT
  REFERENCES public.match_contexts(id) ON DELETE CASCADE;

ALTER TABLE public.pain_entries DROP CONSTRAINT IF EXISTS chk_pain_entry_one_parent;
ALTER TABLE public.pain_entries
  ADD CONSTRAINT chk_pain_entry_one_parent CHECK (
    (daily_log_id IS NOT NULL AND match_context_id IS NULL) OR
    (daily_log_id IS NULL AND match_context_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_pain_entries_match_context ON public.pain_entries(match_context_id);

-- RLS: rozszerzenie o warunek EXISTS przez match_contexts, obok już
-- istniejącego warunku przez daily_logs — ten sam wzorzec co naprawa
-- match_context_answers w Domenie 04 (nie ufać samemu user_id w wierszu
-- bez potwierdzenia, że wskazany rodzic też należy do tego użytkownika).
DROP POLICY IF EXISTS "pain_entries_owner" ON public.pain_entries;
CREATE POLICY "pain_entries_owner" ON public.pain_entries
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (daily_log_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.daily_logs dl WHERE dl.id = daily_log_id AND dl.user_id = auth.uid()
      ))
      OR
      (match_context_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.match_contexts mc WHERE mc.id = match_context_id AND mc.user_id = auth.uid()
      ))
    )
  );


-- ----------------------------------------------------------
-- 2. Nowe kolumny match_contexts — rdzeń przeprojektowanej karty
--    pomeczowej (Domena 04). Patrz punkt 2 dokumentu decyzji.
-- ----------------------------------------------------------
ALTER TABLE public.match_contexts ADD COLUMN IF NOT EXISTS self_rating SMALLINT
  CHECK (self_rating IS NULL OR self_rating BETWEEN 0 AND 10);

ALTER TABLE public.match_contexts ADD COLUMN IF NOT EXISTS mental_state SMALLINT
  CHECK (mental_state IS NULL OR mental_state BETWEEN 0 AND 10);

ALTER TABLE public.match_contexts ADD COLUMN IF NOT EXISTS free_note TEXT;

-- Polskie etykiety, FK do public.positions — patrz uwaga na górze pliku.
-- UI (Krok 4) prezentuje w tym polu tylko 8 z 9 wartości tabeli
-- (bez "Nie dotyczy", które nie ma sensu jako odpowiedź na "jaką
-- pozycję dziś grałeś") — ograniczenie na poziomie ekranu, nie bazy.
ALTER TABLE public.match_contexts ADD COLUMN IF NOT EXISTS position_played_today TEXT
  REFERENCES public.positions(id);

ALTER TABLE public.match_contexts ADD COLUMN IF NOT EXISTS entered_recovery_state TEXT
  CHECK (entered_recovery_state IS NULL OR entered_recovery_state IN (
    'entered_fatigued', 'entered_fresh', 'uncertain'
  ));

ALTER TABLE public.match_contexts ADD COLUMN IF NOT EXISTS demanding_conditions BOOLEAN;


-- ----------------------------------------------------------
-- 3. Nowe kolumny match_context_answers — pierwsze realne użycie tej
--    tabeli z jakiegokolwiek ekranu (Domena 04). Patrz punkt 9
--    dokumentu decyzji.
-- ----------------------------------------------------------
ALTER TABLE public.match_context_answers ADD COLUMN IF NOT EXISTS selection_source TEXT
  CHECK (selection_source IS NULL OR selection_source IN ('goal', 'deficit', 'position', 'rotation'));

ALTER TABLE public.match_context_answers ADD COLUMN IF NOT EXISTS followup_value TEXT;

-- ============================================================
-- KONIEC MIGRACJI
--
-- PO URUCHOMIENIU: zgodnie z Krokiem 1.3 procedury, zanim zacznie się
-- kod ekranu, warto ręcznie sprawdzić że RLS/FK match_context_answers
-- działa zgodnie z oczekiwaniem, np.:
--
--   INSERT INTO public.match_context_answers
--     (match_context_id, user_id, segment_id, was_goal_segment,
--      selection_source, response_value)
--   VALUES (<id_istniejącego_match_context_z_Twojego_konta>, auth.uid(),
--           'moc', false, 'rotation', 'lost_race');
--
-- Powinno się udać dla Twojego własnego match_context_id, i zawieść
-- (naruszenie RLS) dla cudzego.
-- ============================================================
