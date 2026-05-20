-- =============================================================
-- 012_add_nickname.sql
-- Separate display nickname (user-editable) from username
-- (admin-controlled for accountability).
-- =============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nickname TEXT;
