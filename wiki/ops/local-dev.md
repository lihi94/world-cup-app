# פיתוח מקומי ופריסה

> **סטטוס:** יציב
> **עודכן:** 2026-08-07
> **מקור אמת:** [`vite.config.ts`](../../vite.config.ts) · [`package.json`](../../package.json) · `.claude/launch.json`

```bash
npm run dev      # שרת פיתוח — פורט 5273 (strictPort)
npm run build    # בנייה לפרודקשן
npm run test     # vitest
```

ב-Claude Code: `preview_start` עם השם **`world-cup-app`** (ה-`launch.json`
כבר מוגדר עם cwd ופורט קבוע).

---

## ⚠️ פורט 5273 עם `strictPort: true` — ולמה

בתיקיית האב (`cluade code/`) יש **פרויקטים אחרים שגם רצים על Vite**
(ברירת מחדל 5173).

`strictPort: true` גורם לשרת **ליפול מיד** אם הפורט תפוס — במקום להחליק
לפורט אחר. בלי זה, ה-preview היה מציג **אפליקציה שגויה** לגמרי, וזה נראה
כמו באג באפליקציה שלנו.

> אל "תתקן" את זה לברירת מחדל גמישה. הכשל הרועש הוא הפיצ'ר.

---

## Stack

| שכבה | טכנולוגיה |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind v4 (RTL, עברית, Heebo) |
| Backend | Supabase (Postgres + RLS + Edge Functions) |
| Auth | Supabase Auth — email/password + allowlist |
| Deploy | Vercel — auto-deploy מ-GitHub `main` |

> RTL הוא לא רק עיצוב — הוא מקור לבאגים אמיתיים.
> ראה [rtl-bidi](../incidents/2026-06-21-rtl-bidi.md).

---

## מבנה הקוד

```
src/
├── features/       auth · matches · leaderboard · golden-bets · predictions · players · admin
├── components/     common/
├── hooks/          useAuth · useLeaderboard · usePredictions · useRankTrajectory · useTournamentDone
├── services/       supabase.ts (client singleton)
├── utils/          scoring.ts ⚠️ · date.ts · outcome.ts · grouping.ts
├── i18n/he.ts      כל הטקסטים בעברית
└── types/
```

> ⚠️ `utils/scoring.ts` **חייב להישאר מסונכרן** עם Edge Function
> `score-predictions`. ראה [scoring-rules](../domain/scoring-rules.md).

## דיבאג פרודקשן
הכלי העיקרי: **לוגים של `fetch-results`** בסופאבייס — כל tick כותב
`console.log` פר משחק תלוי-ועומד (`dbStatus`, `espnState`, `candidates`).
ראה [fetch-results](../systems/fetch-results.md#עמידות-ומרפא-עצמי).
