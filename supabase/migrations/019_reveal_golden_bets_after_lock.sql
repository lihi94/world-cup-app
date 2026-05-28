-- 019_reveal_golden_bets_after_lock.sql
-- After the tournament opener (11/6 18:00 UTC), all authenticated users can
-- see everyone's golden bets. Before then, only own bets are visible.
--
-- The frontend AllGoldenBetsReveal section in GoldenBetsPage relies on this
-- relaxed SELECT policy to render every member's winner + top-scorer pick.

DROP POLICY IF EXISTS "golden_bets_select" ON golden_bets;

CREATE POLICY "golden_bets_select" ON golden_bets
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR now() >= '2026-06-11T18:00:00Z'::timestamptz
  );
