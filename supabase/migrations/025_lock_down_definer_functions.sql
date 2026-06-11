-- 025_lock_down_definer_functions.sql
-- These SECURITY DEFINER functions mutate data and must only run via cron /
-- service_role — not by app users. (See 026 for the effective PUBLIC revoke;
-- revoking only anon/authenticated here was insufficient because EXECUTE was
-- still inherited from the default PUBLIC grant.)

REVOKE EXECUTE ON FUNCTION public.autofill_missing_predictions() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.score_golden_top_scorer(uuid)     FROM anon, authenticated;
