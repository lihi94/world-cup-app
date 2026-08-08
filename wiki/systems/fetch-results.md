# fetch-results

> **סטטוס:** יציב (v24)
> **עודכן:** 2026-08-07
> **מקור אמת:** [`supabase/functions/fetch-results/index.ts`](../../supabase/functions/fetch-results/index.ts)

ה-Edge Function המרכזי של המערכת, ובמידה רבה **הרכיב היחיד שנשבר** לאורך
הטורניר. רץ כל 5 דקות (cron job id=2) ומעדכן תוצאות, שלבים, קבוצות וניקוד.

כמעט כל שורה בו היא צלקת מתקרית. ראה [incidents/](../incidents/).

---

## סדר הריצה — והוא קריטי

הסדר לא שרירותי; הוא ה"ארכיטקטורה" של הפונקציה כולה.

| # | בלוק | תפקיד | למה כאן |
|---|------|-------|---------|
| 1 | **ESPN** | מסמן `IN_PLAY` / `FINISHED`, תוצאה חיה | רץ **ראשון** כדי לסמן משחק שהתחיל לפני ש-football-data מספיק לסמן FINISHED באותו tick |
| 2 | **football-data** | stage, קבוצות, משחקים עתידיים, תוצאת 90' | רץ **שני** — לא יכול להוריד סטטוס שESPN כתב. עטוף `try/catch` |
| 2.5 | **תיוג נוקאאוט** | חלונות תאריך קבועים ל-R32/R16 | **אחרי** football-data (דורס את ה-GROUP שלו), **לפני** הניקוד (שהנקודות יהיו נכונות) |
| 2.6 | **מילוי קבוצות נוקאאוט** | משלים צדדים חסרים מ-ESPN | football-data מפגר בימים אחרי ESPN בבראקט |
| 3 | **ניקוד** | מנקד מחדש כל משחק שהסתיים ב-24 שעות | אחרי שהשלב והקבוצות נכונים |
| 4 | **reconcile** | `reconcile_total_points()` | רשת ביטחון אחרונה לטבלה |

> ⚠️ **אזהרה למי שמשנה כאן:** הזזת בלוק 2.5 אחרי הניקוד = ניקוד נוקאאוט
> לפי חוקי בתים (3/2 במקום 4/3). הזזת ESPN אחרי football-data = משחקים
> חיים שלא מופיעים בלייב.

---

## כללי ההגנה (invariants)

כולם נובעים מהעובדה ש[הרפליקה החינמית של football-data לא עקבית](../sources/football-data.md):

1. לא כותבים `FINISHED` בלי תוצאה.
2. אסור downgrade ממשחק `FINISHED`.
3. אסור לדרוס תוצאה קיימת ב-`NULL`.
4. **הקפאת תוצאה סופית** — משחק `FINISHED` עם תוצאה לא-null: football-data
   לא יכול לדרוס `score_a/score_b`. מילוי תוצאה **ריקה** עדיין מותר
   (מסלול הארכות). ✅ ([ספרד–סעודיה](../incidents/2026-06-21-var-score-overwrite.md))
5. **נעילת אוריינטציה** — צד-קבוצה שכבר מולא לא נדרס: `if existing.team_a_id
   → delete payload.team_a_id`. מי שמילא ראשון בעלים על הכיוון, אחרת
   ניחושים שכבר הונחו משתבשים בדיעבד.
6. **אין נסיגת שלב** — `if mappedStage==='GROUP' && KNOCKOUT.includes(existing.stage)
   → delete payload.stage`. מונע הבהוב של R32 ל"בתים" באמצע tick.
7. `winner_id` מתמלא ומתתקן חופשי — אבל **לעולם לא חוזר ל-`null`**.
8. **deduplication עם `Set`** — מונע double-scoring כששני המקורות מזהים את
   אותו משחק כ-FINISHED.

הכלל הכללי שמאחורי כולם: [אף פעם לא לסגת](../lessons.md#אף-פעם-לא-לסגת-מונוטוניות-ככלל-תכנוני).

---

## חישוב תוצאת 90 דקות

`score_a/score_b` מכילים **אך ורק תוצאת 90 דקות** — לא הארכות, לא פנדלים.
זו הייתה התקלה הכי עקשנית בפרויקט (v16 → v23 → v24).

```
hasRegularTime ?  regularTime            ← מועדף תמיד
               :  fullTime − extraTime   ← רק כשregularTime הוא null
```

**למה דווקא ככה** — לכל סוג הכרעה יש שדה שבור אחר:

| סוג | `regularTime` | `fullTime` | מה עובד |
|-----|---------------|------------|---------|
| הארכות (EXTRA_TIME) | ❌ null | תקין | `fullTime − extraTime` |
| פנדלים (PENALTY_SHOOTOUT) | ✅ תקין | ❌ משובש | `regularTime` |

v23 השתמש ב-`fullTime − extraTime` **ללא תנאי** ושבר את משחקי הפנדלים.
✅ אומת מול football-data על **כל 16** משחקי R32 שהסתיימו.
ראה [extra-time-score](../incidents/2026-07-02-extra-time-score.md).

---

## חלונות נוקאאוט קבועים

football-data מתייג את כל הטורניר `GROUP_STAGE` עד שהבראקט נמשך רשמית.
הפתרון: חלונות תאריך **קבועים** (מלוח ESPN, `leagues[0].calendar`):

| שלב | חלון (UTC) |
|-----|------------|
| R32 | 28/6 07:00 – 4/7 06:59 |
| R16 | 4/7 07:00 – 9/7 06:59 |

QF/SF/THIRD/FINAL לא נגעים — football-data מתייג אותם נכון. הבלוק idempotent
(נוגע רק בשורות `GROUP`).

✅ אומת אחרי ריצה מלאה: 72 GROUP / 16 R32 / 8 R16 / 4 QF / 2 SF / 1 THIRD /
1 FINAL = **104**.

### ניסיונות שנכשלו
- **v17** — קריאה **דינמית** של הלוח מ-ESPN. נכשל: שם השדה בלוח היה שונה
  מהצפוי. אל תנסה שוב בלי לאמת את הסכמה בפועל.
  ([למה מתעדים כישלונות](../lessons.md#אל-תזרוק-ניסיון-שנכשל--תעד-אותו))

---

## התאמת שמות קבוצות (`namesOverlap`)

מקור שני לבאגים חמורים. הגרסה הנוכחית:
- containment של prefix **מלא**, בלי קיצוץ.
- **stoplist**: `south` / `republic` / `united` מסוננים כטוקנים גנריים.
- מסלול התאמה **מדויקת** (case-insensitive) לקבוצות שכל הטוקנים שלהן
  גנריים (למשל "United States").

### ניסיונות שנכשלו
- **קיצוץ ל-5 תווים** — "Austria" ו-"Australia" שניהם `austr`. גרם למשחק
  R32 ספרד–אוסטריה להתמלא באוסטרליה.
- **v21 (prefix בלי stoplist)** — "South Africa" ו-"South Korea" עדיין
  התאימו דרך הטוקן `south`.

ראה [name-matcher](../incidents/2026-06-28-name-matcher.md).

---

## עמידות ומרפא-עצמי

- בלוק football-data עטוף `try/catch` — קריסה שלו לא מונעת ניקוד.
- כל ריצה מנקדת **מחדש** את כל המשחקים שהסתיימו ב-24 השעות האחרונות
  (`score-predictions` אידמפוטנטי) — קריסה מתוקנת לבד תוך 5 דקות.
- **הבטחת LIVE לפי שעון (v14)** — משחק `SCHEDULED` ששעת הפתיחה עברה עולה
  ל-`IN_PLAY` גם בלי ESPN. לא מקדמים אם ESPN אומר מפורשות `pre` (דחייה),
  ותקרת קידום `kickoff + 2:45` כדי שמשחק תקוע לא יישאר לייב לנצח.
- כל tick כותב `console.log` פר משחק תלוי-ועומד (`dbStatus`, `espnState`,
  `candidates`) — **זו דרך הדיבאג העיקרית**.

---

## היסטוריית גרסאות

| v | מה |
|---|-----|
| v10 | הגנה מפני flapping — אין downgrade, אין מחיקת תוצאה |
| v11 | ESPN כ-fallback להשלמת משחקים |
| v12 | ESPN מעדכן `IN_PLAY` + תוצאה חיה |
| v14 | הבטחת LIVE לפי שעון |
| v15 | ניקוד מרפא-עצמי |
| v16 | טיפול הארכות (תוכנן) + `reconcile_total_points` |
| v17 | הקפאת תוצאה סופית; תיוג נוקאאוט דינמי (נכשל) |
| v18 | תיוג נוקאאוט בחלונות קבועים |
| v19 | אין נסיגת שלב ל-GROUP |
| v20 | מילוי קבוצות נוקאאוט מ-ESPN |
| v21 | matcher: prefix מלא |
| v22 | matcher: stoplist + התאמה מדויקת |
| v23 | `fullTime − extraTime`; שחרור `winner_id` מההקפאה — **שבר פנדלים** |
| v24 | העדפת `regularTime` — הנוסחה הנוכחית |

---

## קשור
- [score-predictions](score-predictions.md) · [fetch-odds](fetch-odds.md) · [cron](cron-and-autofill.md)
- [football-data](../sources/football-data.md) · [ESPN](../sources/espn.md)
- [scoring-rules](../domain/scoring-rules.md) · [knockout-stages](../domain/knockout-stages.md)
