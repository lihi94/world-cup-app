-- =============================================================
-- 004_prediction_stats.sql
-- Anonymous aggregate statistics per match.
-- Returns ONLY counts — never user IDs or usernames.
-- SECURITY DEFINER bypasses RLS so we can count all predictions
-- while exposing only aggregates to the client.
-- =============================================================

CREATE OR REPLACE FUNCTION get_match_prediction_stats(p_match_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_result JSON;
BEGIN
  -- Fetch match teams for direction labels
  SELECT team_a_id, team_b_id INTO v_match FROM matches WHERE id = p_match_id;

  SELECT json_build_object(
    'total',        COUNT(*),

    -- Outcome distribution
    'home_win',     COUNT(*) FILTER (WHERE pred_score_a > pred_score_b),
    'draw',         COUNT(*) FILTER (WHERE pred_score_a = pred_score_b),
    'away_win',     COUNT(*) FILTER (WHERE pred_score_a < pred_score_b),

    -- Top 5 most-predicted exact scores
    'top_scores', (
      SELECT json_agg(t)
      FROM (
        SELECT
          pred_score_a AS a,
          pred_score_b AS b,
          COUNT(*)     AS cnt
        FROM predictions
        WHERE match_id = p_match_id
          AND pred_score_a IS NOT NULL
          AND pred_score_b IS NOT NULL
        GROUP BY pred_score_a, pred_score_b
        ORDER BY COUNT(*) DESC, pred_score_a, pred_score_b
        LIMIT 5
      ) t
    )
  )
  INTO v_result
  FROM predictions
  WHERE match_id = p_match_id
    AND pred_score_a IS NOT NULL
    AND pred_score_b IS NOT NULL;

  RETURN v_result;
END;
$$;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION get_match_prediction_stats(UUID) TO authenticated;
