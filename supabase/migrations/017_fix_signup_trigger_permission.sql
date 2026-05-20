-- =============================================================
-- 017_fix_signup_trigger_permission.sql
-- Migration 016 over-revoked EXECUTE on handle_new_user() — the
-- AFTER INSERT trigger on auth.users runs as supabase_auth_admin,
-- and Postgres checks EXECUTE against the current role even for
-- trigger-invoked functions. Result: "Database error saving new
-- user" on signup. Re-grant the bare minimum needed.
-- =============================================================

GRANT EXECUTE ON FUNCTION handle_new_user() TO supabase_auth_admin;
