/**
 * Shared odds-computation logic. Used by:
 *   • scripts/compute-odds.mjs  (manual full refresh, rate-limited)
 *   • api/odds.mjs              (Vercel cron, batch-limited per call)
 *
 * "Needs refresh" rule:
 *   - no odds yet,                                              OR
 *   - odds older than STALE_DAYS,                                OR
 *   - match starts within PRE_MATCH_HOURS, and the current odds
 *     were set MORE than PRE_MATCH_HOURS before kickoff.
 */

const FB_GEMINI_MODEL = 'gemini-2.0-flash-lite'
const STALE_DAYS = 7
const PRE_MATCH_HOURS = 5

const STAGE_LABEL = {
  GROUP: 'Group Stage',
  R32:   'Round of 32',
  R16:   'Round of 16',
  QF:    'Quarter-final',
  SF:    'Semi-final',
  THIRD: 'Third-place playoff',
  FINAL: 'Final',
}

async function sb(url, key, path, options = {}) {
  const res = await fetch(`${url}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

async function gemini(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${FB_GEMINI_MODEL}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.95,
        topK: 40,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          required: ['team_a', 'draw', 'team_b'],
          properties: {
            team_a: { type: 'integer' },
            draw:   { type: 'integer' },
            team_b: { type: 'integer' },
          },
        },
      },
    }),
  })
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No text in Gemini response')
  return JSON.parse(text)
}

function buildPrompt(teamA, teamB, stage) {
  return `You are a football betting analyst. Estimate win probabilities for this upcoming FIFA World Cup 2026 match:

Match: ${teamA} vs ${teamB}
Stage: ${STAGE_LABEL[stage] ?? stage}

Consider:
- Current form (2025-2026 season)
- FIFA rankings
- Head-to-head history
- Squad quality

Provide probabilities (0-100, summing to 100) for:
- team_a: ${teamA} wins in regular 90 min
- draw: match ends in a draw after 90 min
- team_b: ${teamB} wins in regular 90 min

For knockout stages, "draw" means score level after 90 min (would go to ET/pens).`
}

function normalize(odds) {
  const total = odds.team_a + odds.draw + odds.team_b
  if (total === 0) return { team_a: 33, draw: 34, team_b: 33 }
  return {
    team_a: Math.round((odds.team_a / total) * 100),
    draw:   Math.round((odds.draw   / total) * 100),
    team_b: Math.round((odds.team_b / total) * 100),
  }
}

/**
 * Fetch matches that need fresh odds, ordered by priority
 * (matches starting soonest are processed first).
 */
async function pickMatches({ supabaseUrl, supabaseKey, limit }) {
  const now = new Date()
  const nowIso = now.toISOString()
  const staleCutoff = new Date(now.getTime() - STALE_DAYS * 86400_000).toISOString()

  // Pull all SCHEDULED matches with known teams, sorted by start time
  const all = await sb(supabaseUrl, supabaseKey,
    `/matches?status=eq.SCHEDULED&start_time=gt.${nowIso}` +
    `&team_a_id=not.is.null&team_b_id=not.is.null` +
    `&select=id,start_time,stage,odds_a,odds_updated_at,team_a:teams!team_a_id(name),team_b:teams!team_b_id(name)` +
    `&order=start_time.asc`
  )

  const needs = []
  for (const m of all) {
    const startsAt = new Date(m.start_time)
    const updatedAt = m.odds_updated_at ? new Date(m.odds_updated_at) : null
    let reason = null

    if (m.odds_a === null) {
      reason = 'no_odds'
    } else if (updatedAt && updatedAt.toISOString() < staleCutoff) {
      reason = 'stale'
    } else if (
      startsAt.getTime() - now.getTime() < PRE_MATCH_HOURS * 3600_000 &&
      updatedAt &&
      startsAt.getTime() - updatedAt.getTime() > PRE_MATCH_HOURS * 3600_000
    ) {
      reason = 'pre_match'
    }

    if (reason) needs.push({ ...m, _reason: reason })
    if (limit && needs.length >= limit) break
  }
  return needs
}

/**
 * Compute and persist odds for one match.
 */
async function refreshOne({ supabaseUrl, supabaseKey, geminiKey, match }) {
  const nameA = match.team_a?.name ?? '?'
  const nameB = match.team_b?.name ?? '?'

  const odds = normalize(await gemini(geminiKey, buildPrompt(nameA, nameB, match.stage)))
  await sb(supabaseUrl, supabaseKey, `/matches?id=eq.${match.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      odds_a: odds.team_a,
      odds_draw: odds.draw,
      odds_b: odds.team_b,
      odds_source: 'gemini',
      odds_updated_at: new Date().toISOString(),
    }),
  })

  return { match_id: match.id, teams: `${nameA} vs ${nameB}`, ...odds, reason: match._reason }
}

export async function runOdds({ limit = null, log = console.log, delayMs = 4500 }) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY
  const geminiKey = process.env.GEMINI_API_KEY

  if (!supabaseUrl || !supabaseKey || !geminiKey) {
    throw new Error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY')
  }

  const needs = await pickMatches({ supabaseUrl, supabaseKey, limit })
  log(`📋 ${needs.length} matches need fresh odds${limit ? ` (limit ${limit})` : ''}`)

  const results = []
  for (let i = 0; i < needs.length; i++) {
    const m = needs[i]
    try {
      const r = await refreshOne({ supabaseUrl, supabaseKey, geminiKey, match: m })
      results.push({ ok: true, ...r })
      log(`✓ ${r.teams}: ${r.team_a}/${r.draw}/${r.team_b} (${r.reason})`)
    } catch (e) {
      results.push({ ok: false, match_id: m.id, error: e.message })
      log(`✗ ${m.team_a?.name} vs ${m.team_b?.name}: ${e.message}`)
    }
    // Rate-limit pause between calls (skip after the last one)
    if (delayMs > 0 && i < needs.length - 1) {
      await new Promise(r => setTimeout(r, delayMs))
    }
  }

  return {
    ok: true,
    refreshed: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    queued_total: needs.length,
    results,
  }
}
