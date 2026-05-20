-- =============================================================
-- 018_enable_pg_cron_and_pg_net.sql
-- Enable pg_net (async HTTP) and pg_cron (scheduled jobs).
-- The actual cron schedule is created via execute_sql (not here)
-- because the job command contains the anon key which should not
-- be committed to version control.
--
-- Cron job created manually:
--   SELECT cron.schedule(
--     'fetch-match-results', '*/15 * * * *',
--     $$ SELECT net.http_post(
--          url     := 'https://ebvvnqiyxxgsjwzjnydk.supabase.co/functions/v1/fetch-results',
--          body    := '{}'::jsonb,
--          headers := jsonb_build_object(
--            'Content-Type',  'application/json',
--            'Authorization', 'Bearer <anon_key>'
--          )
--        ) $$
--   );
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA pg_catalog;

GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO postgres;
