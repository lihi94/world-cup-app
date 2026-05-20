-- =============================================================
-- 013_match_odds.sql
-- Per-match win probabilities. Currently populated by Gemini AI
-- via scripts/compute-odds.mjs, but could also come from a real
-- odds API or be set manually.
-- =============================================================

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS odds_a INT,           -- 0-100 probability team A wins
  ADD COLUMN IF NOT EXISTS odds_draw INT,        -- 0-100 probability for draw
  ADD COLUMN IF NOT EXISTS odds_b INT,           -- 0-100 probability team B wins
  ADD COLUMN IF NOT EXISTS odds_source TEXT,     -- 'gemini' / 'manual' / etc.
  ADD COLUMN IF NOT EXISTS odds_updated_at TIMESTAMPTZ;
