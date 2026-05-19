# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start Vite dev server
npm run build        # tsc + vite build
npm run test         # run all tests once (vitest)
npm run test:watch   # watch mode
npx vitest run src/utils/scoring.test.ts  # run a single test file

npm run bootstrap    # seed teams + matches from football-data.org into Supabase
npm run sync         # manual one-shot sync of match results
npm run bots:setup   # create the two bot user accounts
npm run bots:run     # generate bot predictions for upcoming matches
```

Scripts read from `.env.local` (not `.env`) and require `FOOTBALL_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (server-side, no `VITE_` prefix).

The frontend reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env`.

## Architecture

### Frontend
React 18 + TypeScript + Vite, styled with Tailwind CSS v4 (via `@tailwindcss/vite` plugin — no `tailwind.config.js`). Routing via React Router v6.

All routes except `/login` and `/register` are wrapped in `ProtectedLayout` (`src/App.tsx`), which redirects unauthenticated users and renders `NavBar` at the bottom.

Pages live under `src/features/<feature>/`. Data fetching is done in custom hooks (`src/hooks/`) that call Supabase directly — there is no separate API layer on the frontend.

**The UI is entirely in Hebrew (RTL).** String literals in components are Hebrew; `src/i18n/he.ts` holds some shared strings.

### Backend — Supabase
- **Auth**: Email/password only. Registration is gated by an `allowed_emails` table; the `handle_new_user` trigger enforces this and auto-creates a `profiles` row.
- **Database**: Postgres with RLS on every table. Migrations in `supabase/migrations/` must be applied in order (001–007).
- **Edge Functions** (`supabase/functions/`):
  - `fetch-results`: Called by `pg_cron` every 15 minutes; pulls all WC 2026 match results from football-data.org and updates the `matches` table. When a match transitions to `FINISHED`, it immediately invokes `score-predictions`.
  - `score-predictions`: Accepts `{ external_id }` or `{ match_id }`; scores all predictions for that match and calls `recalculate_user_points` RPC for affected users.

### Sync pipeline (alternative to Edge Functions)
`lib/sync-core.mjs` contains the same sync+scoring logic as the Edge Functions but for Node.js. It is used by:
- `scripts/sync.mjs` — CLI manual run
- `api/sync.mjs` — Vercel serverless function called by cron-job.org every minute

Both pipelines exist; in production only one should be active.

## Critical Constraints

### Scoring logic lives in three places — keep them identical
`src/utils/scoring.ts` (client-side preview), `supabase/functions/score-predictions/index.ts` (authoritative), and `lib/sync-core.mjs` (Vercel path). When scoring rules change, **all three must be updated simultaneously**.

Points table:
| Stage | Exact score | Correct direction | +Qualifier/winner |
|---|---|---|---|
| GROUP | 3 | 2 | — |
| R32/R16/QF/SF | 4 | 3 | +1 |
| FINAL | 5 | 4 | +1 |

The scoring function uses `if / else if` (not two separate `if` blocks) to avoid double-counting direction and exact points.

### Score fields are 90-minute only
`matches.score_a` / `score_b` store the 90-minute score exclusively — never extra time or penalties. `matches.winner_id` stores the *advancing* team, which may differ from the 90-minute winner.

### Prediction lock window
Predictions are locked by RLS policy 1 minute before `start_time`. Inserts/updates outside this window are rejected at the DB level with a `42501` error code, which the UI surfaces as a Hebrew error message.

### Bot users
Two bot accounts exist (`יאני 🤖` and `הקוף 🐒`) with `is_bot = true` on their profile. Bot predictions are always visible to all users (migration 007 policy), unlike human predictions which hide until the match is no longer `SCHEDULED`.

### Golden bets deadline
`golden_bets` insert/update is locked by RLS at `2026-06-11T18:00:00Z` (1 hour before the opening match). This timestamp is hardcoded in `002_rls_policies.sql`.

## Database Migrations
Apply in order via Supabase SQL Editor:
1. `001` — schema, enums, tables
2. `002` — RLS policies
3. `003` — triggers (`handle_new_user`, `set_updated_at`) and scoring RPCs
4. `004` — `get_match_prediction_stats` function (aggregate-only, SECURITY DEFINER)
5. `005` — adds `R32` to the `match_stage` enum (WC 2026 has 48 teams)
6. `006` — adds `is_bot` column to `profiles`
7. `007` — replaces `predictions_select` policy to expose bot predictions pre-match

To test RLS in the SQL editor without bypassing it, impersonate a user:
```sql
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "USER_UUID_HERE"}';
```
