# INTEGRACJA_WSKAZNIK_NOWE_SQL.md — migracja dla wskaźnika "nowe/nieprzeczytane"

*Kontekst: `BRIEF_DELEGACJA_PROMINENCJA_CELU.md`, Zakres 2. Appka mobilna (Centrum Decyzji +
zakładka "Centrum Decyzji") pokazuje teraz kropkę/badge przy NIEPRZECZYTANEJ rekomendacji.*

**Kuba wkleja to w Supabase SQL Editor** — jedna nowa kolumna + indeks + rozszerzenie
istniejącego grantu, czysto addytywne. Bezpieczne do wielokrotnego wklejenia.

## Dlaczego nowa kolumna, nie prostsze `notified_at IS NOT NULL`

Brief sugerował zacząć od prostszej opcji (`notified_at` jako proxy "nowe", bez nowej kolumny) i
zweryfikować w `api/cron-send-notifications.js` przed budową na złym założeniu — zrobione, wynik
poniżej.

1. **`notified_at` faktycznie ustawiane jest PRZY WYSŁANIU push** (w `runContextualInsight`, po
   `await sendPush(...)`), nie przy generowaniu rekomendacji — ten konkretny niepokój z briefu
   jest nieuzasadniony, kod jest poprawny.
2. **Ale:** `notified_at` zostaje ustawione WYŁĄCZNIE gdy (a) zawodnik ma zarejestrowany token
   push, ORAZ (b) limit "max 1 kontekstowe powiadomienie na 3 dni na zawodnika" na to pozwala. W
   pilotażu (patrz `KROK_4_PUSH_POWIADOMIENIA.md`, `APLIKACJA_MOBILNA_CHECKLISTA_WDROZENIA.md`) nikt
   nie miał jeszcze zarejestrowanego tokenu push — więc realnie WSZYSTKIE rekomendacje mają dziś
   `notified_at IS NULL`, niezależnie od tego, ile razy zawodnik faktycznie już je zobaczył w
   appce. Użycie `notified_at` jako "przeczytane" pokazywałoby WIECZNIE "nowe" na wszystkim, dopóki
   push nie zacznie niezawodnie działać (osobny, nierozwiązany wątek — `lib/push-notifications.ts`)
   — czyli dokładne przeciwieństwo tego, co ten wskaźnik ma naprawić. Nawet gdy push zacznie
   działać, `notified_at` i tak miesza dwa różne zdarzenia ("wysłaliśmy Ci push" ≠ "zobaczyłeś to w
   appce") — zawodnik, który wchodzi w Centrum Decyzji bez czekania na push, nigdy nie "przeczyta"
   niczego w tym sensie.

Stąd: osobny, jawny sygnał "zawodnik faktycznie zobaczył to w appce", niezależny od push.
Appka ustawia go sama (Centrum Decyzji, w momencie gdy rekomendacja faktycznie się wyrenderuje na
ekranie) — nie wymaga backendu/crona.

```sql
begin;

-- 1. Nowa kolumna — kiedy zawodnik faktycznie zobaczył rekomendację w appce.
alter table public.decision_recommendations
  add column if not exists viewed_at timestamptz null;

comment on column public.decision_recommendations.viewed_at is
  'Kiedy zawodnik faktycznie zobaczył tę rekomendację wyrenderowaną w appce (Centrum Decyzji) — '
  'NIEZALEŻNE od notified_at (kiedy/czy wysłano push). Podstawa wskaźnika "nowe/nieprzeczytane" '
  'w UI mobilnej, 06.08.2026 (BRIEF_DELEGACJA_PROMINENCJA_CELU.md).';

-- 2. Indeks pod zapytanie liczące nieprzeczytane per zawodnik (badge na
--    zakładce Centrum Decyzji, odpytywane przy każdej zmianie zakładki) —
--    ten sam styl co idx_push_send_log_user_sent_at /
--    idx_goals_one_pending_suggestion_per_segment (indeks częściowy pod
--    dokładnie ten warunek, nie pełny scan).
create index if not exists idx_decision_recommendations_user_unviewed
  on public.decision_recommendations (user_id)
  where viewed_at is null;

-- 3. Zawodnik JUŻ MA (Domena 06) politykę `decision_recs_update_own` —
--    UPDATE własnych wierszy, zawężone kolumnowo do pól feedbacku
--    (feedback_response/feedback_comment/feedback_at). Dopisujemy
--    `viewed_at` do TEGO SAMEGO grantu kolumnowego — bez nowej polityki
--    RLS, bez zmiany istniejącej. Appka nadal nie może dotknąć
--    recommendation_text/rationale_text/goal_id/etc, wyłącznie kolumny
--    explicite wymienione w GRANT (GRANT kolumnowy jest addytywny — nie
--    kasuje wcześniej przyznanych kolumn feedbacku).
grant update (viewed_at) on public.decision_recommendations to authenticated;

commit;
```

## Jedna rzecz do zweryfikowania po wklejeniu

Grant w kroku 3 zakłada, że istniejący grant kolumnowy na pola feedbacku był wydany do roli
`authenticated` (standardowa rola Supabase dla zalogowanego użytkownika, zgodna z tym jak appka się
łączy — `lib/supabase.ts`). Jeśli po wdrożeniu appka dostanie błąd typu "permission denied for
column viewed_at" przy próbie oznaczenia rekomendacji jako przeczytanej — oryginalny grant był
najpewniej wydany do innej roli (np. `public`). Daj znać treść błędu, dopiszę brakujący grant od
razu, jedna linijka.

## Po uruchomieniu — nic więcej w bazie

Appka mobilna (`app/(tabs)/centrum-decyzji.tsx`) sama ustawia `viewed_at` bezpośrednio przez
klienta Supabase (`update({ viewed_at: ... }).eq('id', ...)`) w momencie renderowania listy
rekomendacji — żadnej nowej funkcji Vercel, żadnego crona.
