-- =============================================================
-- 002_rls_policies.sql
-- IMPORTANT: Test RLS by impersonating users in SQL editor, not
-- by running as postgres (which bypasses RLS).
-- SET LOCAL role = authenticated;
-- SET LOCAL "request.jwt.claims" = '{"sub": "USER_UUID_HERE"}';
-- =============================================================

ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE golden_bets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams          ENABLE ROW LEVEL SECURITY;
ALTER TABLE players        ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

-- ── profiles ──────────────────────────────────────────────────
-- All authenticated users can read (leaderboard shows everyone)
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT TO authenticated USING (true);

-- Users can only update their own username
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ── matches ───────────────────────────────────────────────────
-- All authenticated users can read matches
CREATE POLICY "matches_select"
  ON matches FOR SELECT TO authenticated USING (true);

-- ── predictions ───────────────────────────────────────────────
-- Users always see their own; see others only after match is no longer SCHEDULED
CREATE POLICY "predictions_select"
  ON predictions FOR SELECT TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
        AND m.status != 'SCHEDULED'
    )
  );

-- Insert only if match has not yet locked (>1 min before kickoff)
CREATE POLICY "predictions_insert"
  ON predictions FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
        AND m.start_time > now() + INTERVAL '1 minute'
        AND m.status = 'SCHEDULED'
    )
  );

-- Update only within the same lock window
CREATE POLICY "predictions_update"
  ON predictions FOR UPDATE TO authenticated USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
        AND m.start_time > now() + INTERVAL '1 minute'
        AND m.status = 'SCHEDULED'
    )
  );

-- ── golden_bets ───────────────────────────────────────────────
-- Users can only see their own golden bets
CREATE POLICY "golden_bets_select"
  ON golden_bets FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Only submittable before 1 hour before tournament opening match
CREATE POLICY "golden_bets_insert"
  ON golden_bets FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND now() < '2026-06-11T18:00:00Z'::timestamptz
  );

CREATE POLICY "golden_bets_update"
  ON golden_bets FOR UPDATE TO authenticated USING (
    auth.uid() = user_id
    AND now() < '2026-06-11T18:00:00Z'::timestamptz
  );

-- ── reference tables ──────────────────────────────────────────
CREATE POLICY "teams_select"
  ON teams FOR SELECT TO authenticated USING (true);

CREATE POLICY "players_select"
  ON players FOR SELECT TO authenticated USING (true);

-- Allowed emails readable so client can show friendly error
CREATE POLICY "allowed_emails_select"
  ON allowed_emails FOR SELECT TO authenticated USING (true);
