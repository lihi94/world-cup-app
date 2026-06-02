-- 021_autofill_and_reveal_predictions.sql
-- 1) Reveal predictions by TIME (kickoff), not just by status change.
--    Needed so matches without an external_id (e.g. FRIENDLY) still reveal
--    everyone's picks the moment they kick off.
-- 2) Auto-fill missing predictions by copying the AI bot's (רובוט A.I) pick
--    for any human who forgot to predict, once a match is locked.

-- ── RLS: reveal once kickoff has passed ───────────────────────────────
DROP POLICY IF EXISTS predictions_select ON public.predictions;
CREATE POLICY predictions_select ON public.predictions
FOR SELECT
USING (
  (SELECT auth.uid()) = user_id
  OR EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = predictions.match_id
      AND (m.status <> 'SCHEDULED'::match_status OR m.start_time <= now())
  )
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = predictions.user_id AND p.is_bot = true
  )
);

-- ── Auto-fill: copy AI bot prediction for non-predictors on locked matches ─
CREATE OR REPLACE FUNCTION public.autofill_missing_predictions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ai uuid;
  v_count integer := 0;
BEGIN
  SELECT id INTO v_ai
  FROM profiles
  WHERE is_bot = true AND username = 'רובוט A.I'
  LIMIT 1;

  IF v_ai IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO predictions (user_id, match_id, pred_score_a, pred_score_b, pred_qualifier_id)
  SELECT p.id, ab.match_id, ab.pred_score_a, ab.pred_score_b, ab.pred_qualifier_id
  FROM predictions ab
  JOIN matches m ON m.id = ab.match_id
  CROSS JOIN profiles p
  WHERE ab.user_id = v_ai
    AND m.start_time <= now()           -- match is locked / kicked off
    AND p.is_bot = false                -- only real users
    AND NOT EXISTS (
      SELECT 1 FROM predictions pr
      WHERE pr.match_id = ab.match_id AND pr.user_id = p.id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ── Schedule: run the auto-fill every 5 minutes (pg_cron) ──────────────
-- Idempotent: drop the job first if it already exists, then (re)create it.
SELECT cron.unschedule('autofill-missing-predictions')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'autofill-missing-predictions');

SELECT cron.schedule(
  'autofill-missing-predictions',
  '*/5 * * * *',
  $$SELECT public.autofill_missing_predictions();$$
);
