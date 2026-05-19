-- =============================================================
-- 003_functions_triggers.sql
-- =============================================================

-- Auto-create profile on signup and enforce allowlist
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM allowed_emails WHERE email = NEW.email) THEN
    RAISE EXCEPTION 'Email % is not on the allowlist', NEW.email;
  END IF;

  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Recalculate total_points for one user from predictions + golden_bets
CREATE OR REPLACE FUNCTION recalculate_user_points(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET total_points = (
    SELECT COALESCE(SUM(points_earned), 0)
    FROM predictions
    WHERE user_id = p_user_id
  ) + (
    SELECT COALESCE(points_earned, 0)
    FROM golden_bets
    WHERE user_id = p_user_id
  )
  WHERE id = p_user_id;
END;
$$;

-- Recalculate all users (used by admin panel after manual score override)
CREATE OR REPLACE FUNCTION recalculate_all_points()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  FOR v_user_id IN SELECT id FROM profiles LOOP
    PERFORM recalculate_user_points(v_user_id);
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- updated_at auto-maintenance
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER predictions_updated_at
  BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
