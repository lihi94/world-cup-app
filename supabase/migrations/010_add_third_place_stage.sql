-- =============================================================
-- 010_add_third_place_stage.sql
-- The 3rd-place playoff (after SFs, before the FINAL) deserves
-- its own stage instead of being lumped under SF.
-- =============================================================

ALTER TYPE match_stage ADD VALUE IF NOT EXISTS 'THIRD' BEFORE 'FINAL';
