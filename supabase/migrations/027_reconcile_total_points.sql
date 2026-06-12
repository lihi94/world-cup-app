-- 027: leaderboard safety net (applied 2026-06-13)
--
-- Canada–Bosnia (12/6) finished but its predictions were never scored: the
-- cron tick that marked the match FINISHED crashed before the scoring step.
-- Together with the self-healing re-scoring in fetch-results v15+, this
-- function guarantees the leaderboard can never silently drift: every cron
-- tick forces profiles.total_points to equal the true sum of prediction
-- points + golden-bet points. Returns how many profiles were corrected.
CREATE OR REPLACE FUNCTION public.reconcile_total_points()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH expected AS (
    SELECT pr.id,
           COALESCE(pp.s, 0) + COALESCE(gg.s, 0) AS pts
    FROM profiles pr
    LEFT JOIN (
      SELECT user_id, SUM(points_earned) AS s FROM predictions GROUP BY user_id
    ) pp ON pp.user_id = pr.id
    LEFT JOIN (
      SELECT user_id, SUM(points_earned) AS s FROM golden_bets GROUP BY user_id
    ) gg ON gg.user_id = pr.id
  ),
  fixed AS (
    UPDATE profiles pr
    SET total_points = e.pts
    FROM expected e
    WHERE pr.id = e.id AND pr.total_points IS DISTINCT FROM e.pts
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM fixed;
$$;

-- Definer function: callable only by the service role (cron), like 025/026.
REVOKE EXECUTE ON FUNCTION public.reconcile_total_points() FROM PUBLIC, anon, authenticated;
