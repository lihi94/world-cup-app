# Auth והרשמה

> **סטטוס:** יציב
> **עודכן:** 2026-08-07
> **מקור אמת:** מיגרציות `014` / `017` + `src/hooks/useAuth.ts`

Supabase Auth — email/password + **allowlist**.

---

## הזרימה

1. משתמש נרשם עצמאית.
2. הטריגר `handle_new_user` בודק מול טבלת `allowed_emails`.
3. הטריגר **מאשר את המייל אוטומטית** — אין צורך ב-confirmation email
   (מיגרציה `014`).
4. `is_admin` נקבע **ידנית** ב-`profiles` אחרי הרשמת המנהל.

> באג היסטורי: לטריגר ההרשמה חסרו הרשאות. תוקן במיגרציה `017`.

## קשור
- [rls](rls.md) · [db-schema](db-schema.md) · [security](security.md)
