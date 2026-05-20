-- =============================================================
-- 016_followup_hardening.sql
-- Follow-up to 015:
--   * Revoke EXECUTE FROM PUBLIC on internal SECURITY DEFINER
--     functions (the GRANT defaults to PUBLIC, so revoking only
--     from anon/authenticated wasn't enough).
--   * Add the missing predictions(match_id) FK index.
-- =============================================================

REVOKE EXECUTE ON FUNCTION handle_new_user()                FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION recalculate_user_points(UUID)    FROM PUBLIC;

-- Re-grant only to roles that actually need it.
-- handle_new_user is called by the AFTER INSERT trigger as supabase_auth_admin,
-- so no role-level grant is needed for normal app traffic.
-- recalculate_user_points is called by the service role via Edge Function /
-- sync, which has BYPASSRLS so doesn't need explicit grants either.

-- Missing FK index — the existing (user_id, match_id) compound only covers
-- queries leading with user_id, not lookups by match_id alone.
CREATE INDEX IF NOT EXISTS predictions_match_idx ON predictions (match_id);
