# score-predictions

> **סטטוס:** יציב (v6)
> **עודכן:** 2026-08-07
> **מקור אמת:** [`supabase/functions/score-predictions/index.ts`](../../supabase/functions/score-predictions/index.ts)

מחשב נקודות לניחושים אחרי שמשחק מסתיים. **מקור האמת היחיד לניקוד** —
`src/utils/scoring.ts` הוא רק מראה לתצוגה.

---

## אידמפוטנטיות

הפונקציה **קובעת** את `points_earned`, לא מוסיפה אליו. הרצה חוזרת על אותו
משחק נותנת בדיוק אותה תוצאה.

זה מה שמאפשר ל[fetch-results](fetch-results.md) לנקד מחדש בכל tick את כל
המשחקים שהסתיימו ב-24 שעות בלי חשש — וזה מה שהופך קריסה באמצע ריצה לבעיה
שמתקנת את עצמה תוך 5 דקות.
ראה [scoring-crash](../incidents/2026-06-12-scoring-crash.md).

זו גם הסיבה ש-cron כל 5 דקות בטוח: גם race condition של הפעלה כפולה →
תוצאה זהה.

---

## ⚠️ חלוקת האחריות שהכי מבלבלת

| מי | מה הוא עושה | מה הוא **לא** עושה |
|----|-------------|---------------------|
| `score-predictions` (Edge Fn) | **מחשב** `points_earned` פר ניחוש | — |
| `recalculate_user_points` (SQL) | **סוכמת** `points_earned` קיים לפרופיל | לא מחשבת נקודות |
| `reconcile_total_points()` (SQL) | מיישרת `profiles.total_points` לסכום האמיתי | לא מחשבת נקודות |

**מכאן:** תיקון ניקוד ידני דורש קביעת `points_earned` **ישירות**, ורק אז
`recalculate_user_points`. קריאה ל-`recalculate` לבדה על ניחוש עם
`points_earned` שגוי פשוט תסכם מחדש את השגיאה.

---

## חוקי הניקוד

ראה [scoring-rules](../domain/scoring-rules.md) לפירוט מלא. תמצית:

| שלב | מדויק | כיוון |
|-----|-------|-------|
| FRIENDLY | 0 | 0 |
| GROUP | 3 | 2 |
| R32/R16/QF/SF | 4 | 3 |
| FINAL | 5 | 4 |

- הניקוד מבוסס **רק על תוצאת 90 דקות** — אין בונוס "מי עולה" בשום שלב.
- Golden Bets: אלוף +8, מלך שערים +8, נספרים בנפרד.
- **חובה `if / else if`** — שני `if` נפרדים = double counting שקט.
  ראה [הלקח](../lessons.md#if--else-if-לא-שני-if).

---

## קשור
- [fetch-results](fetch-results.md) · [scoring-rules](../domain/scoring-rules.md)
- [golden-bets](../domain/golden-bets.md) · [`src/utils/scoring.ts`](../../src/utils/scoring.ts)
