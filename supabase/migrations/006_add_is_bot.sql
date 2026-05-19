-- =============================================================
-- 006_add_is_bot.sql
-- Adds an "is_bot" flag to profiles, so leaderboard can render
-- a robot/monkey indicator next to AI/random participants.
-- =============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT false;

-- Optional helpful index — keeps human-only queries fast
CREATE INDEX IF NOT EXISTS profiles_humans_idx ON profiles (id) WHERE is_bot = false;
