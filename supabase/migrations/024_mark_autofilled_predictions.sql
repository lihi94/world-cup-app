-- 024_mark_autofilled_predictions.sql
-- Flag predictions the system auto-filled (copied from the AI bot) so the UI
-- can show an "auto" badge. Update the auto-fill function to set the flag.

ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS is_auto boolean NOT NULL DEFAULT false;

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

  INSERT INTO predictions (user_id, match_id, pred_score_a, pred_score_b, pred_qualifier_id, is_auto)
  SELECT p.id, ab.match_id, ab.pred_score_a, ab.pred_score_b, ab.pred_qualifier_id, true
  FROM predictions ab
  JOIN matches m ON m.id = ab.match_id
  CROSS JOIN profiles p
  WHERE ab.user_id = v_ai
    AND m.start_time <= now()
    AND p.is_bot = false
    AND NOT EXISTS (
      SELECT 1 FROM predictions pr
      WHERE pr.match_id = ab.match_id AND pr.user_id = p.id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
