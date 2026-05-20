-- =============================================================
-- 015_hardening.sql
-- Security + performance hardening pass.
--
--   1. SET search_path on all SECURITY DEFINER functions
--   2. Revoke anon execute on internal functions
--   3. Add covering indexes for foreign keys
--   4. Rewrite RLS policies to cache auth.uid() per query
-- =============================================================

-- ---------- 1+2. Functions: search_path + revoke anon ----------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM allowed_emails WHERE email = NEW.email) THEN
    RAISE EXCEPTION 'Email not on allowlist';
  END IF;

  INSERT INTO profiles (id, username)
  VALUES (NEW.id, split_part(NEW.email, '@', 1));

  UPDATE auth.users
     SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
         confirmation_token = ''
   WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION recalculate_user_points(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE profiles
  SET total_points = (
    SELECT COALESCE(SUM(points_earned), 0) FROM predictions WHERE user_id = p_user_id
  ) + (
    SELECT COALESCE(points_earned, 0) FROM golden_bets WHERE user_id = p_user_id
  )
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

REVOKE EXECUTE ON FUNCTION handle_new_user()             FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION recalculate_user_points(UUID) FROM anon, authenticated;

-- Drop unused rls_auto_enable() and its event trigger
DROP EVENT TRIGGER IF EXISTS ensure_rls;
DROP FUNCTION IF EXISTS rls_auto_enable() CASCADE;

-- ---------- 3. Foreign-key indexes ----------

CREATE INDEX IF NOT EXISTS golden_bets_top_scorer_idx   ON golden_bets (top_scorer_id);
CREATE INDEX IF NOT EXISTS golden_bets_winner_team_idx  ON golden_bets (winner_team_id);
CREATE INDEX IF NOT EXISTS matches_team_a_idx           ON matches (team_a_id);
CREATE INDEX IF NOT EXISTS matches_team_b_idx           ON matches (team_b_id);
CREATE INDEX IF NOT EXISTS matches_winner_idx           ON matches (winner_id);
CREATE INDEX IF NOT EXISTS players_team_idx             ON players (team_id);
CREATE INDEX IF NOT EXISTS predictions_qualifier_idx    ON predictions (pred_qualifier_id);

-- ---------- 4. Rewrite RLS policies to cache auth.uid() ----------

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "predictions_select" ON predictions;
CREATE POLICY "predictions_select" ON predictions FOR SELECT TO authenticated USING (
  (SELECT auth.uid()) = user_id
  OR EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_id AND m.status != 'SCHEDULED'
  )
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_id AND p.is_bot = true
  )
);

DROP POLICY IF EXISTS "predictions_insert" ON predictions;
CREATE POLICY "predictions_insert" ON predictions FOR INSERT TO authenticated WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_id
      AND m.start_time > now() + INTERVAL '1 minute'
      AND m.status = 'SCHEDULED'
  )
);

DROP POLICY IF EXISTS "predictions_update" ON predictions;
CREATE POLICY "predictions_update" ON predictions FOR UPDATE TO authenticated USING (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_id
      AND m.start_time > now() + INTERVAL '1 minute'
      AND m.status = 'SCHEDULED'
  )
);

DROP POLICY IF EXISTS "golden_bets_select" ON golden_bets;
CREATE POLICY "golden_bets_select" ON golden_bets FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "golden_bets_insert" ON golden_bets;
CREATE POLICY "golden_bets_insert" ON golden_bets FOR INSERT TO authenticated WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND now() < '2026-06-11T18:00:00Z'::timestamptz
);

DROP POLICY IF EXISTS "golden_bets_update" ON golden_bets;
CREATE POLICY "golden_bets_update" ON golden_bets FOR UPDATE TO authenticated USING (
  (SELECT auth.uid()) = user_id
  AND now() < '2026-06-11T18:00:00Z'::timestamptz
);

-- ---------- 5. Drop unused index ----------
DROP INDEX IF EXISTS profiles_humans_idx;
