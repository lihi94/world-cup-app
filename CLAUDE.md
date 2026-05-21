# World Cup App — CLAUDE.md

אפליקציית ניחושים למונדיאל 2026 לקבוצת חברים ("ליגת החברים").

## מיקום ופקודות

```
מיקום: C:\Users\eliha\OneDrive\Desktop\cluade code\world-cup-app\
```

```bash
npm run dev        # שרת פיתוח מקומי (פורט 5173)
npm run build      # בנייה לפרודקשן
npm run test       # טסטים (vitest)
```

להפעלת preview בתוך Claude Code — השתמש ב-preview_start עם שם "world-cup-app" (launch.json כבר מוגדר).

## Stack

| שכבה | טכנולוגיה |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind v4 (RTL, עברית, Heebo font) |
| Backend | Supabase (Postgres + RLS + Edge Functions) |
| Auth | Supabase Auth — email/password + allowlist |
| Deploy | Vercel (auto-deploy מ-GitHub main) |
| Results API | football-data.org v4 (WC competition, season 2026) |
| Odds API | The Odds API v4 (soccer_fifa_world_cup, h2h, eu region) |

## Supabase

- **Project URL:** `https://ebvvnqiyxxgsjwzjnydk.supabase.co`
- **GitHub repo:** `lihi94/world-cup-app`

### Edge Functions (כולן ACTIVE)

| Function | Version | תפקיד |
|----------|---------|--------|
| `fetch-results` | v6 | מעדכן תוצאות כל 15 דקות (pg_cron job id=2) |
| `fetch-odds` | v3 | מושך יחסי הימורים מ-The Odds API |
| `score-predictions` | v2 | מחשב נקודות לאחר סיום משחק |

### Cron Jobs

- **job id=2** `fetch-match-results` — כל 15 דקות — מריץ `fetch-results`
- `fetch-results` מטריגר את `fetch-odds` אוטומטית:
  - חלון 24 שעות לפני המשחק (22–26 שעות מראש, stale אחרי 20 שעות)
  - חלון 3 שעות לפני המשחק (2–4 שעות מראש, stale אחרי 2 שעות)

### טבלאות מרכזיות

- `matches` — משחקים (external_id מ-football-data.org, odds_a/odds_draw/odds_b)
- `predictions` — ניחושים של משתמשים
- `profiles` — פרופילים (total_points, is_admin, avatar_emoji)
- `golden_bets` — ניחוש אלוף + מלך שערים
- `allowed_emails` — רשימת מיילים מורשים להרשמה
- `teams` — קבוצות (name_he לעברית)
- `players` — שחקנים (לניחוש מלך שערים)

### Auth

- הרשמה עצמית עם allowlist — הטריגר `handle_new_user` בודק `allowed_emails`
- הטריגר מאשר מייל אוטומטית (אין צורך ב-confirmation email)
- `is_admin` נקבע ידנית ב-profiles לאחר הרשמת המנהל

## ארכיטקטורה

```
src/
├── features/
│   ├── auth/          # LoginPage, RegisterPage
│   ├── matches/       # MatchCard (+ OddsBar), MatchCenter
│   ├── leaderboard/   # LeaderboardPage, useLeaderboard
│   ├── golden-bets/   # GoldenBetsPage
│   └── admin/         # AdminPage (is_admin בלבד)
├── components/common/ # Spinner, Hero, AvatarPicker
├── hooks/             # useAuth, useLeaderboard, usePredictions
├── services/          # supabase.ts (client singleton)
├── utils/
│   ├── scoring.ts     # ⚠️ חייב להישאר מסונכרן עם score-predictions Edge Function
│   └── date.ts        # isPredictionOpen, locksInLabel, formatKickoff
├── i18n/he.ts         # כל הטקסטים בעברית
└── types/index.ts
```

## נקודות חשובות

### ניקוד
- GROUP: exact=3, direction=2, miss=0
- R16/QF/SF: exact=4, direction=3, miss=0, qualifier=+1
- FINAL: exact=5, direction=4, miss=0, qualifier=+1
- Golden Bets: אלוף=+8, מלך שערים=+8
- **חובה** להשתמש ב-`if/else if` ולא שני `if` נפרדים (מונע double counting)

### יחסי הימורים (OddsBar)
- מציג רק על משחקים `SCHEDULED` עם odds_a/odds_draw/odds_b לא null
- ערכים הם אחוזים (0-100, סכום=100) — implied probability עם הסרת vig
- מוצג כ-bar צבעוני + שורה אופקית אחת עם שם קבוצה + אחוז + תיקו

### RLS
- ניחושים נסתרים מאחרים עד שהמשחק כבר לא SCHEDULED
- נעילת ניחוש: `start_time > now() + INTERVAL '1 minute'` (server-side)
- Golden bets נעולים אחרי `2026-06-11T18:00:00Z`

### score_a / score_b
- מכילים **רק תוצאת 90 דקות** (fullTime מה-API), לא אחרי הארכות/פנדלים
- `winner_id` = הקבוצה המתקדמת (כולל ET/penalties)

## Secrets (ב-Supabase בלבד — לא VITE_)

- `FOOTBALL_API_KEY` — football-data.org
- `ODDS_API_KEY` — The Odds API (~500 req/month free)
