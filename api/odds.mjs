/**
 * Vercel serverless function — /api/odds
 *
 * Called hourly by cron-job.org. Refreshes up to BATCH_SIZE matches per
 * call. Targets:
 *   - matches starting in the next 5 hours (priority)
 *   - matches with stale odds (>7 days old)
 *   - matches missing odds entirely
 *
 * Auth: header `Authorization: Bearer <CRON_SECRET>` or `?secret=<...>`.
 *
 * Required env vars (set in Vercel):
 *   GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, CRON_SECRET
 */

import { runOdds } from '../lib/odds-core.mjs'

// Stay safely under Vercel Hobby's 10-second function limit.
// Each Gemini call takes ~1.5-3s, so 4 is the sweet spot.
const BATCH_SIZE = 4

export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  const expected = process.env.CRON_SECRET
  if (!expected) {
    res.status(500).json({ ok: false, error: 'CRON_SECRET not configured on server' })
    return
  }
  const header = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const query = (req.query?.secret || '')
  if (header !== expected && query !== expected) {
    res.status(401).json({ ok: false, error: 'Unauthorized' })
    return
  }

  const logs = []
  try {
    // No delay inside the loop — we're already batch-limited to BATCH_SIZE
    // matches per call, and cron-job hits us at most once per minute.
    const result = await runOdds({
      limit: BATCH_SIZE,
      delayMs: 0,
      log: (line) => logs.push(line),
    })
    res.status(200).json({ ...result, logs, ts: new Date().toISOString() })
  } catch (err) {
    console.error('odds error:', err)
    res.status(500).json({ ok: false, error: err.message, logs, ts: new Date().toISOString() })
  }
}
