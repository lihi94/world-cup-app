# יחסי הימורים (OddsBar)

> **סטטוס:** יציב
> **עודכן:** 2026-08-07
> **מקור אמת:** `src/features/matches/MatchCard.tsx` + [fetch-odds](../systems/fetch-odds.md)

---

## מה שמור ב-DB

`matches.odds_a` / `odds_draw` / `odds_b`.

> 🔴 הערכים הם **אחוזים (0–100, סכום = 100)** — implied probability עם
> הסרת vig. **לא** decimal odds גולמיים. מי שיציג אותם כיחס יראה שטויות.

---

## תנאי תצוגה

ה-OddsBar מוצג רק כאשר **שני** התנאים מתקיימים:
1. המשחק ב-`SCHEDULED`,
2. שלושת השדות `odds_a` / `odds_draw` / `odds_b` **לא null**.

עיצוב: bar צבעוני + שורה אופקית אחת עם שם קבוצה + אחוז + תיקו.

---

## שימוש נוסף — לא רק תצוגה

היחסים מזינים גם את **fallback ניחושי הבוט** בנוקאאוט: המועדף לפי ה-odds
מקבל 1-0. `null` odds → `team_a` 1-0.
ראה [cron-and-autofill](../systems/cron-and-autofill.md#אוטו-פיל--מי-שלא-ניחש-מקבל-את-ניחוש-הבוט).

## קשור
- [fetch-odds](../systems/fetch-odds.md) · [the-odds-api](../sources/the-odds-api.md)
