/**
 * Vercel serverless function — /api/sync
 *
 * Called every minute by cron-job.org during the tournament.
 * Returns 200 with a JSON summary on success.
 *
 * Auth: requires header  "Authorization: Bearer <CRON_SECRET>"
 *       OR  query param  "?secret=<CRON_SECRET>"
 *
 * Env vars (set in Vercel dashboard):
 *   FOOTBALL_API_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 *   CRON_SECRET             ← any random string; share with cron-job.org
 */

import { runSync } from '../lib/sync-core.mjs'

export const config = {
  maxDuration: 30,  // seconds (Vercel Hobby limit is 10, Pro is 60)
}

export default async function handler(req, res) {
  // Method check
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  // Auth check
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

  // Run
  const logs = []
  try {
    const result = await runSync({ log: (line) => logs.push(line) })
    res.status(200).json({ ...result, logs, ts: new Date().toISOString() })
  } catch (err) {
    console.error('sync error:', err)
    res.status(500).json({ ok: false, error: err.message, logs, ts: new Date().toISOString() })
  }
}
