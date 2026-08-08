# Cron ואוטו-פיל

> **סטטוס:** יציב
> **עודכן:** 2026-08-07
> **מקור אמת:** `cron.job` ב-Supabase + מיגרציה `021` + `autofill_seeds_bot_knockout_predictions`

---

## Cron Jobs

| id | שם | schedule | מריץ |
|----|-----|----------|------|
| 2 | `fetch-match-results` | `*/5 * * * *` | [fetch-results](fetch-results.md) |
| 4 | `autofill-missing-predictions` | `*/5 * * * *` | `autofill_missing_predictions()` |

שינוי קצב בלי downtime (שומר על אותו ID):
```sql
SELECT cron.alter_job(job_id := 2, schedule := '*/N * * * *');
```

**למה 5 דקות בטוח:** `score-predictions` [אידמפוטנטי](score-predictions.md#אידמפוטנטיות),
ו-[fetch-odds](fetch-odds.md) מוגבל ב-staleness ולא בתדירות. הפעלה כפולה →
תוצאה זהה, ומספר הקריאות ל-API החיצוני לא משתנה.

---

## אוטו-פיל — מי שלא ניחש מקבל את ניחוש הבוט

למשחק שכבר נעל (`start_time <= now()`), מי שלא ניחש מקבל **עותק של ניחוש
הבוט "רובוט A.I"**. idempotent (`NOT EXISTS`). מכסה גם ידידות בלי
`external_id`.

> ההיסטוריה: קודם היה אוטו-פיל **רנדומלי** ב-`sync-core.mjs`. הוסר.

### שני השלבים

הפונקציה **מרפאת את עצמה** — לא מניחה שלבוט יש ניחוש:

1. **הזרעה** — לפני ההעתקה, מזריקה לבוט ניחוש לכל משחק נוקאאוט עם קבוצות
   ידועות. fallback: **מועדף לפי יחסי ההימורים, 1-0**. `null` odds →
   `team_a` 1-0. מזריקה רק כשיש odds, או 15 דקות לפני נעילה.
2. **העתקה** — לכל מי שלא הימר.

**למה שלב 1 קיים:** הבוט ניחש רק את הבתים ואף לא משחק נוקאאוט. לאוטו-פיל
לא היה מה להעתיק, ושלושה שחקנים נשארו בלי ניקוד ב-R32 דרום-אפריקה–קנדה.
ראה [knockout-autofill-gap](../incidents/2026-06-28-knockout-autofill-gap.md)
ואת [הלקח](../lessons.md#הקצה-החיצוני-של-הפייפליין-נשבר-לפני-הליבה).

### ניחושי הבוט מ-OpenOdds26

ניחושי הנוקאאוט של הבוט מוזנים ממודל חיצוני —
[OpenOdds26](../sources/openodds26.md). השדה `modal` = התוצאה הסבירה ביותר.

> ⚠️ **מיפוי לפי זהות קבוצה, לא לפי מיקום.** המודל כותב
> "France 2-0 Sweden" בעוד אצלנו `team_a = Sweden`.

הוחל ידנית על כל 16 משחקי R32. ה-fallback של מועדף-1-0 נשאר רשת ביטחון.

**📌 TODO פתוח:** כשנקבעים מפגשי R16/QF/SF/Final — למשוך מחדש את הקובץ
(הוא מתעדכן) ולהחיל את ה-`modal` על הבוט. אחרת הבוט ייפול ל-fallback.

---

## קשור
- [fetch-results](fetch-results.md) · [openodds26](../sources/openodds26.md) · [odds](../domain/odds.md)
