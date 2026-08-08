# סכמת ה-DB

> **סטטוס:** יציב
> **עודכן:** 2026-08-07
> **מקור אמת:** [`supabase/migrations/`](../../supabase/migrations/) — 27 מיגרציות

Supabase (Postgres + RLS + Edge Functions).
Project: `ebvvnqiyxxgsjwzjnydk` · repo: `lihi94/world-cup-app`

---

## טבלאות מרכזיות

| טבלה | תפקיד | שדות שכדאי להכיר |
|------|-------|-------------------|
| `matches` | משחקים | `external_id` (football-data), `stage`, `status`, `score_a/b`, `winner_id`, `odds_a/draw/b`, `start_time` |
| `predictions` | ניחושי משתמשים | `points_earned` ⚠️, `pred_qualifier_id` (מת), סימון autofilled |
| `profiles` | פרופילים | `total_points`, `is_admin`, `avatar_emoji`, `is_bot`, `nickname` |
| `golden_bets` | אלוף + מלך שערים | ראה [golden-bets](../domain/golden-bets.md) |
| `allowed_emails` | allowlist להרשמה | ראה [auth](auth.md) |
| `teams` | קבוצות | `name`, `name_he` |
| `players` | שחקנים (מלך שערים) | שם עברי — מיגרציה `011` |

---

## שדות עם מלכודות

### `predictions.points_earned`
**נכתב אך ורק ע"י Edge Function `score-predictions`.**
`recalculate_user_points` רק **מסכמת** אותו.
תיקון ידני = לקבוע `points_earned` ישירות, ורק אז `recalculate`.
ראה [חלוקת האחריות](../systems/score-predictions.md#-חלוקת-האחריות-שהכי-מבלבלת).

### `predictions.pred_qualifier_id`
🪦 **מת אך קיים.** בונוס "מי עולה" הוסר לחלוטין — השדה נשאר בסכמה אבל
**לא נכתב ולא נקרא**. אל תבנה עליו.

### `matches.score_a` / `score_b`
**תוצאת 90 דקות בלבד.** `winner_id` = המתקדמת (כולל ET/פנדלים), ולכן
תיקו + `winner_id` מלא הוא מצב תקין בנוקאאוט.

### `matches.external_id`
`null` למשחקי **ידידות** — הם לא מגיעים מ-football-data. זו הסיבה
ש[חשיפת ניחושים ב-RLS](rls.md) עובדת לפי **זמן** ולא לפי סטטוס.

---

## פונקציות SQL

| פונקציה | מה עושה |
|---------|---------|
| `handle_new_user` | טריגר הרשמה — בודק `allowed_emails`, מאשר מייל אוטומטית |
| `recalculate_user_points` | **מסכמת** `points_earned` + זהב לפרופיל |
| `reconcile_total_points()` | מיישרת `profiles.total_points` לסכום האמיתי (מיגרציה `027`) |
| `autofill_missing_predictions()` | הזרעה + העתקת ניחוש הבוט — ראה [cron-and-autofill](../systems/cron-and-autofill.md) |

✅ `reconcile_total_points` נבדק: שיבוש מכוון של נקודות תוקן אוטומטית
בריצה אחת.

---

## נקודות ציון במיגרציות

| # | מה |
|---|-----|
| `005` | הוספת שלב R32 (פורמט 48 קבוצות) |
| `013` | odds על משחקים |
| `018` | הפעלת `pg_cron` + `pg_net` |
| `020` / `024` | FRIENDLY — שלב, ואפס נקודות |
| `021` | אוטו-פיל + חשיפת ניחושים לפי זמן |
| `022` / `023` | פיצול נקודות golden bets + תיקון קריסה בלי golden bet |
| `025` / `026` | נעילת פונקציות `SECURITY DEFINER` — ראה [security](security.md) |
| `027` | `reconcile_total_points()` |
| `autofill_seeds_bot_knockout_predictions` | הזרעת ניחושי בוט לנוקאאוט |

## קשור
- [rls](rls.md) · [auth](auth.md) · [security](security.md)
