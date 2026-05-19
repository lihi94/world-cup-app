-- =============================================================
-- 011_player_hebrew_name.sql
-- Hebrew transliteration for player names (used in golden bets).
-- =============================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS name_he TEXT;
