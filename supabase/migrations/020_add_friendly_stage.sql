-- 020_add_friendly_stage.sql
-- Add a 'FRIENDLY' value to the match_stage enum so we can store pre-tournament
-- warmup matches (e.g. Croatia vs Belgium, 2/6/2026) alongside the WC bracket.
--
-- These matches:
--   - have external_id = NULL (football-data.org's free tier doesn't cover
--     international friendlies, so we can't auto-fetch results)
--   - require admin to enter the final score manually
--   - use the same scoring as GROUP stage (exact=3, direction=2)
--   - render in their own section ("משחקי ידידות") at the top of the dashboard

ALTER TYPE match_stage ADD VALUE IF NOT EXISTS 'FRIENDLY' BEFORE 'GROUP';
