-- =============================================================
-- 005_add_r32_stage.sql
-- 2026 WC introduces a new Round-of-32 stage (48-team format).
-- Add 'R32' between 'GROUP' and 'R16' in the match_stage enum.
-- =============================================================

ALTER TYPE match_stage ADD VALUE IF NOT EXISTS 'R32' BEFORE 'R16';
