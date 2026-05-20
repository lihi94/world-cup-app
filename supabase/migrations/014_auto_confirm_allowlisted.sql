-- =============================================================
-- 014_auto_confirm_allowlisted.sql
-- Skip the "click the link in your email" flow for allowlisted
-- users. Being on the allowlist is enough proof of identity,
-- and this avoids hitting Supabase's free-tier SMTP rate limit.
-- =============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM allowed_emails WHERE email = NEW.email) THEN
    RAISE EXCEPTION 'Email not on allowlist';
  END IF;

  INSERT INTO profiles (id, username)
  VALUES (NEW.id, split_part(NEW.email, '@', 1));

  -- Auto-confirm — bypasses "Confirm email" setting + skips SMTP rate limits
  UPDATE auth.users
     SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
         confirmation_token = ''
   WHERE id = NEW.id;

  RETURN NEW;
END;
$$;
