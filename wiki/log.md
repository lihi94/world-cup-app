# יומן

append-only. **הרשומה החדשה נוספת בסוף.** אל תערוך רשומות ישנות ואל תמחק.

פורמט קבוע (מאפשר parsing פשוט):
`## [YYYY-MM-DD] <ingest|query|lint|incident> | כותרת`

---

## [2026-08-07] ingest | הקמת הוויקי — backfill מ-CLAUDE.md ומ-git log

**מקורות:** `CLAUDE.md` (19KB), 60 קומיטים, 27 מיגרציות, 3 Edge Functions,
[הגיסט של karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

**נכתבו 33 דפים:** SCHEMA, index, log, lessons, 4× systems, 4× domain,
4× data, 4× sources, 1× ops, 12× incidents.

**עיקר העבודה** היה חילוץ 12 התקריות שהיו דחוסות כפסקאות פרוזה בתוך
`CLAUDE.md`, וזיקוק **10 לקחים חוצי-תקריות** מתוכן ל-[lessons](lessons.md) —
כשהחשוב מכולם הוא [אימות רחב](lessons.md#אימות-רחב), שנלמד פעמיים
(v21→v22 ו-v23→v24).

---

## [2026-08-07] lint | ביקורת ראשונה

**ממצאים:**

1. ⚠️ **אימות חלקי** — ל-[knockout-autofill-gap](incidents/2026-06-28-knockout-autofill-gap.md)
   אין מונה `N מתוך M`. תוקן למקרה שדווח + הזרעה ל-16 R32, אבל **לא אומת
   שכל המשתמשים בכל משחקי הנוקאאוט קיבלו אוטו-פיל**. לפי
   [לקח האימות הרחב](lessons.md#אימות-רחב) — לא נחשב סגור.
2. ⚠️ **אימות חלקי** — [api-flapping](incidents/2026-06-11-api-flapping.md)
   ו-[live-visibility](incidents/2026-06-12-live-visibility.md) מאומתים
   ב"עבד מכאן והלאה", בלי מונה.
3. 📌 **TODO פתוח** — [OpenOdds26](sources/openodds26.md) לא הוחל על
   R16/QF/SF/Final. **פער ידע פעיל**, לא רק תיעודי.
4. ℹ️ **אין דף** ל-`debug-match` (מוזכר ב-[football-data](sources/football-data.md)),
   ל-`scripts/*.mjs`, ולרכיבי UI. נדחה עד שיהיה בהם ידע יקר.
5. ✅ **אין סתירות** בין דפים לקוד. נבדק מדגמית מול
   `fetch-results/index.ts` (סדר בלוקים, `regularTime`, stoplist),
   `utils/scoring.ts` (טבלת ניקוד), `useRankTrajectory.ts` (`PAGE = 1000`).
6. ✅ **אין דפים יתומים** — כל 33 מקושרים מ-[index](index.md).
