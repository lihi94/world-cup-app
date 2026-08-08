# fetch-odds

> **סטטוס:** יציב (v6)
> **עודכן:** 2026-08-07
> **מקור אמת:** [`supabase/functions/fetch-odds/index.ts`](../../supabase/functions/fetch-odds/index.ts)

מושך יחסי הימורים מ-[The Odds API](../sources/the-odds-api.md) וכותב אותם
ל-`matches.odds_a / odds_draw / odds_b`.

---

## הפעלה לפי staleness, לא לפי תדירות

הפונקציה **לא** רצה ב-cron משלה — [fetch-results](fetch-results.md) מטריגר
אותה. שני חלונות:

| חלון | טווח לפני המשחק | נחשב stale אחרי |
|------|------------------|------------------|
| 24 שעות | 22–26 שעות מראש | 20 שעות |
| 3 שעות | 2–4 שעות מראש | 2 שעות |

**למה זה חשוב:** בגלל שההחלטה היא לפי staleness ולא לפי תדירות, **שינוי
קצב ה-cron של `fetch-results` לא משנה את מספר הקריאות ל-The Odds API**.
סה"כ ~215 קריאות לטורניר כולו, מול מכסה חינמית של ~500/חודש.

> ⚠️ אם מישהו יחליף את מנגנון ה-staleness ב"משוך בכל tick" — המכסה
> החינמית תישרף תוך פחות מיומיים.

---

## מה נשמר

הערכים ב-DB הם **אחוזים** (0–100, סכום = 100) — implied probability עם
הסרת vig, לא ה-decimal odds הגולמיים. ראה [odds](../domain/odds.md).

## קשור
- [odds](../domain/odds.md) · [the-odds-api](../sources/the-odds-api.md) · [cron](cron-and-autofill.md)
