-- =============================================================
-- 009_avatars_and_stats.sql
--   1. avatar emoji per profile (default ⚽)
--   2. get_leaderboard_stats() — breakdown per user of how many
--      exact / direction-only / missed predictions they have on
--      FINISHED matches.
-- =============================================================

-- 1. Avatar column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar TEXT NOT NULL DEFAULT '⚽';

-- 2. Aggregated breakdown stats
CREATE OR REPLACE FUNCTION get_leaderboard_stats()
RETURNS TABLE (
  user_id        UUID,
  exact_count    INT,
  direction_count INT,
  miss_count     INT,
  scored_total   INT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    p.user_id,
    COUNT(*) FILTER (
      WHERE p.pred_score_a = m.score_a
        AND p.pred_score_b = m.score_b
    )::INT AS exact_count,
    COUNT(*) FILTER (
      WHERE SIGN(p.pred_score_a - p.pred_score_b) = SIGN(m.score_a - m.score_b)
        AND NOT (p.pred_score_a = m.score_a AND p.pred_score_b = m.score_b)
    )::INT AS direction_count,
    COUNT(*) FILTER (
      WHERE SIGN(p.pred_score_a - p.pred_score_b) <> SIGN(m.score_a - m.score_b)
    )::INT AS miss_count,
    COUNT(*)::INT AS scored_total
  FROM predictions p
  JOIN matches m ON m.id = p.match_id
  WHERE p.pred_score_a IS NOT NULL
    AND p.pred_score_b IS NOT NULL
    AND m.score_a IS NOT NULL
    AND m.score_b IS NOT NULL
    AND m.status = 'FINISHED'
  GROUP BY p.user_id;
$$;

GRANT EXECUTE ON FUNCTION get_leaderboard_stats() TO authenticated;
