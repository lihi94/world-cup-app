# אינדקס הוויקי

> **עודכן:** 2026-08-07 · **דפים:** 33

**קרא את הדף הזה ראשון** בכל [query](SCHEMA.md#workflow-2--query).
הוא הניווט — אל תסרוק את `wiki/` עיוור.

מתחילים כאן? → [SCHEMA](SCHEMA.md) (איך הוויקי עובד) ואז
[lessons](lessons.md) (מה למדנו בדם).

---

## ליבה

| דף | מה יש בו |
|----|----------|
| [SCHEMA](SCHEMA.md) | מבנה הוויקי, כללי כתיבה, שלושת ה-workflows |
| ⭐ [lessons](lessons.md) | **הלקחים חוצי-התקריות — הדף החשוב ביותר** |
| [log](log.md) | יומן כרונולוגי append-only |

---

## systems/ — רכיבים רצים

| דף | מה יש בו |
|----|----------|
| [fetch-results](systems/fetch-results.md) | ה-Edge Function המרכזי (v24) — סדר ריצה, invariants, תוצאת 90', היסטוריית גרסאות |
| [score-predictions](systems/score-predictions.md) | חישוב נקודות, אידמפוטנטיות, **מי מחשב מול מי מסכם** |
| [fetch-odds](systems/fetch-odds.md) | משיכת יחסים, חלונות staleness, ניהול מכסה |
| [cron-and-autofill](systems/cron-and-autofill.md) | cron jobs, אוטו-פיל דו-שלבי, ניחושי הבוט |

## domain/ — חוקי המשחק

| דף | מה יש בו |
|----|----------|
| [scoring-rules](domain/scoring-rules.md) | טבלת הניקוד + הכללים שקל לפספס |
| [knockout-stages](domain/knockout-stages.md) | 104 משחקים, R32, תיוג שלב, מפגש חצי-ידוע |
| [golden-bets](domain/golden-bets.md) | אלוף + מלך שערים, ניקוד עצמאי, נעילה |
| [odds](domain/odds.md) | אחוזים ולא יחסים, תנאי תצוגה, שימוש בבוט |

## data/ — נתונים והרשאות

| דף | מה יש בו |
|----|----------|
| [db-schema](data/db-schema.md) | טבלאות, שדות עם מלכודות, פונקציות SQL, מיגרציות |
| [rls](data/rls.md) | חשיפה **לפי זמן**, נעילת ניחוש |
| [auth](data/auth.md) | allowlist, `handle_new_user` |
| [security](data/security.md) | `SECURITY DEFINER`, סודות (לא `VITE_`!) |

## sources/ — APIs חיצוניים

| דף | מה יש בו |
|----|----------|
| [football-data](sources/football-data.md) | 🔴 **איזה שדה תוצאה שבור בכל סוג הכרעה** |
| [ESPN](sources/espn.md) | סמכותי לתוצאה ולקבוצות; נכשל בשקט |
| [the-odds-api](sources/the-odds-api.md) | מכסה ~500/חודש, ~215 לטורניר |
| [openodds26](sources/openodds26.md) | מודל ניחושי הבוט · **TODO פתוח** |

## ops/

| דף | מה יש בו |
|----|----------|
| [local-dev](ops/local-dev.md) | פקודות, פורט 5273, stack, מבנה הקוד |

---

## incidents/ — כרונולוגי

| תאריך | תקרית | חומרה |
|-------|--------|-------|
| [11/6](incidents/2026-06-11-api-flapping.md) | משחקי הפתיחה — ה-API מתנדנד | ניקוד |
| [12/6](incidents/2026-06-12-live-visibility.md) | קוריאה–צ'כיה לא הופיע בלייב | תצוגה |
| [12/6](incidents/2026-06-12-scoring-crash.md) | קנדה–בוסניה — הניקוד לא רץ מעולם | ניקוד |
| [21/6](incidents/2026-06-21-var-score-overwrite.md) | ספרד–סעודיה — VAR דרס תוצאה נכונה | ניקוד |
| [21/6](incidents/2026-06-21-rtl-bidi.md) | תוצאות מתהפכות על המסך (RTL) | תצוגה |
| [26/6](incidents/2026-06-26-knockout-stage-tagging.md) | נוקאאוט מתויג "בתים" | ניקוד |
| [27/6](incidents/2026-06-27-knockout-teams-missing.md) | משחקי נוקאאוט בלי קבוצות | תצוגה |
| [28/6](incidents/2026-06-28-name-matcher.md) | 🔴 אוסטריה הפכה לאוסטרליה | ניקוד |
| [28/6](incidents/2026-06-28-knockout-autofill-gap.md) | 3 שחקנים בלי ניקוד — לבוט אין מה להעתיק | ניקוד |
| [28/6](incidents/2026-06-28-row-cap-truncation.md) | גרף המגמה — תקרת 1000 שורות | תצוגה |
| [2/7](incidents/2026-07-02-extra-time-score.md) | 🔴 בלגיה–סנגל 3-2 במקום 2-2 | ניקוד |
| [2/7](incidents/2026-07-02-stuck-winner-id.md) | `winner_id` נתקע null בפנדלים | בראקט |

---

## 📌 פתוח

- **[OpenOdds26](sources/openodds26.md)** — להחיל `modal` על ניחושי הבוט
  ב-R16 / QF / SF / Final כשהמפגשים נקבעים. אחרת הבוט נופל ל-fallback.
