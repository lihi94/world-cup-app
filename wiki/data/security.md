# אבטחה

> **סטטוס:** יציב
> **עודכן:** 2026-08-07
> **מקור אמת:** מיגרציות `015` / `016` / `025` / `026`

---

## פונקציות SECURITY DEFINER

**כל פונקציית `SECURITY DEFINER` מְשַׁנָּה מוגבלת ל-`service_role` בלבד**, ובוטלו
הרשאות מ-`public` (מיגרציות `025` / `026`, PR #14, 11/6).

הסיכון שנסגר: פונקציה `SECURITY DEFINER` רצה בהרשאות היוצר. אם היא
`EXECUTE`-בילה ל-`public`, כל משתמש מחובר יכול לקרוא לה ולעקוף RLS —
למשל להריץ חישוב נקודות מחדש או לגעת בשורות שאינן שלו.

> ⚠️ **כלל למי שמוסיף פונקציה חדשה:** כל `SECURITY DEFINER` חדשה מגיעה עם
> `REVOKE ... FROM public` באותה מיגרציה. אין יוצאים מן הכלל.

מיגרציות `015` / `016` הן גלי hardening מוקדמים יותר.

---

## סודות

`FOOTBALL_API_KEY` ו-`ODDS_API_KEY` יושבים **ב-Supabase secrets בלבד**.

> 🔴 **אף פעם לא כ-`VITE_`.** כל משתנה `VITE_` נצרב לתוך ה-bundle של
> הדפדפן ומתפרסם לכל מי שנכנס לאתר.

לכן גם [fetch-results](../systems/fetch-results.md),
[fetch-odds](../systems/fetch-odds.md) ו-`debug-match` הם Edge Functions —
המפתחות לא יכולים לחיות בצד לקוח.

`debug-match` דורש JWT.

## קשור
- [rls](rls.md) · [auth](auth.md) · [db-schema](db-schema.md)
