# The Odds API v4

> **סטטוס:** יציב
> **עודכן:** 2026-08-07
> **מקור אמת:** [`supabase/functions/fetch-odds/index.ts`](../../supabase/functions/fetch-odds/index.ts)

- ספורט: `soccer_fifa_world_cup` · שוק: `h2h` · אזור: `eu`
- מפתח: `ODDS_API_KEY` (ב-Supabase secrets בלבד)
- **מכסה חינמית: ~500 קריאות לחודש**

---

## ניהול המכסה

זו האילוץ המרכזי סביב ה-API הזה. [fetch-odds](../systems/fetch-odds.md)
מושך לפי **חלונות staleness** ולא בכל tick — סה"כ **~215 קריאות לטורניר
כולו**.

> ⚠️ המשמעות התכנונית: שינוי קצב ה-cron של `fetch-results` **לא** משנה את
> צריכת המכסה. אל תחליף את מנגנון ה-staleness במשיכה לפי תדירות.

---

## עיבוד

הערכים הגולמיים הם decimal odds. אנחנו שומרים **implied probability עם
הסרת vig** — אחוזים 0–100 שסכומם 100. ראה [odds](../domain/odds.md).

## שימוש נוסף
היחסים משמשים גם כ-fallback לניחושי הבוט בנוקאאוט (מועדף 1-0) —
ראה [cron-and-autofill](../systems/cron-and-autofill.md#אוטו-פיל--מי-שלא-ניחש-מקבל-את-ניחוש-הבוט).
