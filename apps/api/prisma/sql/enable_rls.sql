-- Mozaika — włączenie Row Level Security (RLS) na wszystkich tabelach public.
-- Powód: Supabase wystawia publiczne Data API (PostgREST) z kluczem `anon`.
-- Bez RLS każdy może czytać/edytować/usuwać dane przez to API.
--
-- Bezpieczeństwo dla aplikacji: Prisma łączy się rolą `postgres` (BYPASSRLS),
-- więc po włączeniu RLS aplikacja działa BEZ ZMIAN — blokowane jest tylko
-- publiczne API (role anon / authenticated), które nie ma żadnych polityk.
--
-- Uwaga: ENABLE (nie FORCE) — właściciel/BYPASSRLS nadal ma pełny dostęp.
-- Uruchom w Supabase → SQL Editor, albo: psql "$DIRECT_URL" -f enable_rls.sql

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    RAISE NOTICE 'RLS włączone: public.%', r.tablename;
  END LOOP;
END $$;
