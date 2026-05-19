-- =============================================================
-- 007_expose_bot_predictions.sql
-- Bot predictions are public — half the fun is seeing them before
-- kickoff. Humans still hide their picks until the match starts.
-- =============================================================

DROP POLICY IF EXISTS "predictions_select" ON predictions;

CREATE POLICY "predictions_select" ON predictions FOR SELECT TO authenticated USING (
  -- Own predictions: always
  auth.uid() = user_id
  -- Other humans: only once the match is no longer SCHEDULED
  OR EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_id AND m.status != 'SCHEDULED'
  )
  -- Bot predictions: always visible
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_id AND p.is_bot = true
  )
);
