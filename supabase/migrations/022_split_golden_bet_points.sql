-- 022_split_golden_bet_points.sql
-- Golden bets hold TWO independent +8 bets (champion + top scorer) but stored
-- them in a single points_earned column, so champion scoring overwrote the
-- top-scorer points. Split into two columns; make points_earned a generated
-- total so all existing readers (frontend, recalculate_user_points) keep working.

ALTER TABLE public.golden_bets ADD COLUMN IF NOT EXISTS winner_points     integer NOT NULL DEFAULT 0;
ALTER TABLE public.golden_bets ADD COLUMN IF NOT EXISTS top_scorer_points integer NOT NULL DEFAULT 0;

-- Best-effort migrate any existing value into the winner bucket (currently all 0).
UPDATE public.golden_bets SET winner_points = points_earned WHERE points_earned <> 0;

-- Replace points_earned with a generated total of the two buckets.
ALTER TABLE public.golden_bets DROP COLUMN points_earned;
ALTER TABLE public.golden_bets
  ADD COLUMN points_earned integer
  GENERATED ALWAYS AS (winner_points + top_scorer_points) STORED;

-- Admin helper: score the top-scorer bet for everyone, given the real top scorer.
-- Idempotent — re-running with the same player yields the same result.
CREATE OR REPLACE FUNCTION public.score_golden_top_scorer(p_player_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.golden_bets
  SET top_scorer_points = CASE WHEN top_scorer_id = p_player_id THEN 8 ELSE 0 END;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM recalculate_user_points(user_id) FROM public.golden_bets;
  RETURN v_count;
END;
$$;
