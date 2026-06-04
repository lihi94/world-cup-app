-- 023_fix_recalculate_null_golden_bet.sql
-- recalculate_user_points crashed for any user WITHOUT a golden_bets row:
-- the non-aggregate golden_bets scalar subquery returned NULL (zero rows),
-- and `int + NULL = NULL` violated profiles.total_points NOT NULL.
-- This would have broken real World Cup scoring for any such user.
-- Fix: COALESCE the ENTIRE subquery, not just the column.

CREATE OR REPLACE FUNCTION public.recalculate_user_points(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET total_points =
    COALESCE((SELECT SUM(points_earned) FROM predictions WHERE user_id = p_user_id), 0)
    + COALESCE((SELECT points_earned FROM golden_bets WHERE user_id = p_user_id), 0)
  WHERE id = p_user_id;
END;
$$;
