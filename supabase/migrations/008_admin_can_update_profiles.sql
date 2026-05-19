-- =============================================================
-- 008_admin_can_update_profiles.sql
-- Lets admins update ANY profile (username, etc.), in addition
-- to the existing "users can update their own profile" policy.
--
-- Uses a SECURITY DEFINER helper to bypass RLS during the admin
-- check, avoiding an infinite recursion on `profiles` itself.
-- =============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), false)
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Additional policy: admins may update any profile.
-- (Combined with "profiles_update_own", which still applies to non-admins.)
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE TO authenticated
USING (is_admin());
