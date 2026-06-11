-- 026_revoke_definer_funcs_from_public.sql
-- 025 revoked from anon/authenticated but they still inherited EXECUTE via the
-- default PUBLIC grant. Revoke from PUBLIC and re-grant only to service_role
-- (pg_cron runs as postgres/owner, unaffected).
--
-- Why it matters: score_golden_top_scorer() let any signed-in user overwrite
-- every player's top-scorer bet points. Now only cron / service_role can call
-- these mutating functions.

REVOKE EXECUTE ON FUNCTION public.autofill_missing_predictions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.score_golden_top_scorer(uuid)   FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.autofill_missing_predictions() TO service_role;
GRANT EXECUTE ON FUNCTION public.score_golden_top_scorer(uuid)   TO service_role;
