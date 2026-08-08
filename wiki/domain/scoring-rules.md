# חוקי הניקוד

> **סטטוס:** יציב
> **עודכן:** 2026-08-07
> **מקור אמת:** Edge Function `score-predictions` (סמכותי) + [`src/utils/scoring.ts`](../../src/utils/scoring.ts) (מראה)

---

## הטבלה

| שלב | פגיעה מדויקת | כיוון נכון | פספוס |
|-----|---------------|------------|-------|
| **FRIENDLY** | **0** | **0** | 0 |
| GROUP | 3 | 2 | 0 |
| R32 / R16 / QF / SF | 4 | 3 | 0 |
| FINAL | 5 | 4 | 0 |

**Golden Bets:** אלוף **+8**, מלך שערים **+8** — ראה [golden-bets](golden-bets.md).

---

## כללים שקל לפספס

### FRIENDLY = 0
משחקי ידידות הם חימום טרום-טורניר ו**לא נספרים לטבלה**. הניחושים
**נשמרים ומוצגים** — רק בלי נקודות. מיגרציות `020` / `024`.

### אין בונוס "מי עולה"
ניקוד הנוקאאוט מבוסס **רק על תוצאת 90 דקות**, בדיוק כמו הבתים. הבונוס
הוסר מה-UI (`MatchCard`, `PredictionForm`) ומהניקוד.
`pred_qualifier_id` **נשאר בסכמה אך לא נכתב ולא נקרא**.

> זה מסביר למה `calculatePoints` מקבל `_predQualId` ו-`_winnerId` עם קו
> תחתון — הם שם רק כדי לשקף את חתימת ה-Edge Function.

### תוצאת 90 דקות בלבד
`score_a` / `score_b` = **תוצאת 90 דקות**, לא אחרי הארכות או פנדלים.
`winner_id` = הקבוצה **המתקדמת** (כולל ET/פנדלים) — ולכן במשחק נוקאאוט
לגמרי תקין שהתוצאה תיקו ו-`winner_id` מלא.
החילוץ מה-API הוא [הפרק הכי שביר בפרויקט](../sources/football-data.md#-המלכודת-הכי-יקרה-איזה-שדה-תוצאה-שבור).

### 🔴 `if / else if` — לא שני `if`
שני `if` נפרדים מזכים ניחוש גם ב"מדויק" וגם ב"כיוון" — double counting
שקט, בלי שגיאה. חובה `else if`.

### 🔴 שני קבצים, קומיט אחד
`src/utils/scoring.ts` הוא **מראה לתצוגה בלבד**; ה-Edge Function סמכותי.
הקובץ נושא את האזהרה בעצמו: *"update BOTH files simultaneously."*
ראה [הלקח](../lessons.md#שני-מקומות-לחוק-אחד--חוב).

---

## מי מחשב מה

ראה את [הטבלה המלאה](../systems/score-predictions.md#-חלוקת-האחריות-שהכי-מבלבלת).
בקצרה: `score-predictions` **מחשב**, `recalculate_user_points` רק **מסכם**.
תיקון ידני מחייב קביעת `points_earned` ישירות ואז `recalculate`.

## קשור
- [score-predictions](../systems/score-predictions.md) · [knockout-stages](knockout-stages.md) · [golden-bets](golden-bets.md)
