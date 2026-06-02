/**
 * Core sync logic — shared by:
 *   • scripts/sync.mjs   (manual CLI run)
 *   • api/sync.mjs       (Vercel serverless cron endpoint)
 *
 * Reads env vars: FOOTBALL_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
 * Returns a summary object.
 */

const FB_BASE = 'https://api.football-data.org/v4'
const COMPETITION = 'WC'
const SEASON = 2026

const STAGE_MAP = {
  GROUP_STAGE: 'GROUP',
  LAST_32: 'R32',
  PLAYOFFS: 'R32',
  LAST_16: 'R16',
  QUARTER_FINALS: 'QF',
  SEMI_FINALS: 'SF',
  THIRD_PLACE: 'THIRD',
  FINAL: 'FINAL',
}

const STATUS_MAP = {
  SCHEDULED: 'SCHEDULED',
  TIMED: 'SCHEDULED',
  IN_PLAY: 'IN_PLAY',
  PAUSED: 'IN_PLAY',
  HALF_TIME: 'IN_PLAY',
  EXTRA_TIME: 'IN_PLAY',
  PENALTY_SHOOTOUT: 'IN_PLAY',
  FINISHED: 'FINISHED',
  AWARDED: 'FINISHED',
  POSTPONED: 'SCHEDULED',
  SUSPENDED: 'SCHEDULED',
  CANCELLED: 'SCHEDULED',
}

function calculatePoints(predA, predB, predQualId, actualA, actualB, winnerId, stage) {
  const isExact = predA === actualA && predB === actualB
  const predDir = Math.sign(predA - predB)
  const actualDir = Math.sign(actualA - actualB)
  const isCorrectDir = predDir === actualDir

  let pts = 0
  if (stage === 'GROUP') {
    pts = isExact ? 3 : isCorrectDir ? 2 : 0
  } else if (stage === 'FINAL') {
    pts = isExact ? 5 : isCorrectDir ? 4 : 0
    if (winnerId && predQualId === winnerId) pts += 1
  } else {
    pts = isExact ? 4 : isCorrectDir ? 3 : 0
    if (winnerId && predQualId === winnerId) pts += 1
  }
  return pts
}

export async function runSync({ log = console.log } = {}) {
  const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

  if (!FOOTBALL_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing env vars: FOOTBALL_API_KEY, SUPABASE_URL, or SUPABASE_SERVICE_KEY')
  }

  const t0 = Date.now()

  async function fb(endpoint) {
    const res = await fetch(`${FB_BASE}${endpoint}`, {
      headers: { 'X-Auth-Token': FOOTBALL_API_KEY },
    })
    if (!res.ok) throw new Error(`football-data ${res.status}: ${await res.text()}`)
    return { data: await res.json(), apiBudget: res.headers.get('X-Requests-Available-Minute') }
  }

  async function sb(path, options = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
      ...options,
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation,resolution=merge-duplicates',
        ...options.headers,
      },
    })
    if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`)
    return res.status === 204 ? null : res.json()
  }

  async function rpc(fn, args) {
    return sb(`/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) })
  }

  log('📥 Fetching from football-data.org...')
  const { data, apiBudget } = await fb(`/competitions/${COMPETITION}/matches?season=${SEASON}`)
  const apiMatches = data.matches ?? []
  log(`   ✓ ${apiMatches.length} matches (API budget left: ${apiBudget}/min)`)

  log('📂 Loading DB state...')
  const dbMatches = await sb('/matches?select=id,external_id,status,score_a,score_b,winner_id,stage,team_a_id,team_b_id')
  const dbTeams = await sb('/teams?select=id,external_id')
  const teamUuid = new Map(dbTeams.map(t => [t.external_id, t.id]))
  const dbByExt = new Map(dbMatches.map(m => [m.external_id, m]))

  // Quick exit: if no live matches AND no finished-state changes possible, skip
  const hasLiveOrPotential = apiMatches.some(m => {
    const apiStatus = STATUS_MAP[m.status] ?? 'SCHEDULED'
    if (apiStatus === 'IN_PLAY') return true
    if (apiStatus === 'FINISHED') {
      const existing = dbByExt.get(m.id)
      if (!existing || existing.status !== 'FINISHED') return true
    }
    return false
  })

  // Diff and decide what to update
  const toUpsert = []
  const newlyFinished = []
  const newlyStarted = []   // SCHEDULED → (IN_PLAY|FINISHED) — auto-fill missing predictions
  let liveCount = 0, finishedNew = 0, unchanged = 0

  for (const m of apiMatches) {
    const apiStatus = STATUS_MAP[m.status] ?? 'SCHEDULED'
    const apiStage = STAGE_MAP[m.stage] ?? 'GROUP'
    const apiScoreA = m.score?.fullTime?.home ?? null
    const apiScoreB = m.score?.fullTime?.away ?? null

    let apiWinnerId = null
    if (apiStatus === 'FINISHED' && m.score?.winner) {
      if (m.score.winner === 'HOME_TEAM') apiWinnerId = teamUuid.get(m.homeTeam?.id) ?? null
      else if (m.score.winner === 'AWAY_TEAM') apiWinnerId = teamUuid.get(m.awayTeam?.id) ?? null
    }

    const existing = dbByExt.get(m.id)
    if (!existing) {
      toUpsert.push(buildRow(m, apiStatus, apiStage, apiScoreA, apiScoreB, apiWinnerId, teamUuid))
      continue
    }

    const changed =
      existing.status !== apiStatus ||
      existing.score_a !== apiScoreA ||
      existing.score_b !== apiScoreB ||
      existing.winner_id !== apiWinnerId ||
      existing.stage !== apiStage ||
      (!existing.team_a_id && m.homeTeam?.id) ||
      (!existing.team_b_id && m.awayTeam?.id)

    if (!changed) { unchanged++; continue }

    if (apiStatus === 'IN_PLAY') liveCount++

    // Detect SCHEDULED → started transition (for auto-fill of missing predictions)
    if (existing.status === 'SCHEDULED' && apiStatus !== 'SCHEDULED' && existing.team_a_id && existing.team_b_id) {
      newlyStarted.push({
        db_id: existing.id,
        stage: apiStage,
        team_a_id: existing.team_a_id,
        team_b_id: existing.team_b_id,
      })
    }

    if (apiStatus === 'FINISHED' && existing.status !== 'FINISHED') {
      finishedNew++
      newlyFinished.push({
        db_id: existing.id,
        stage: apiStage,
        score_a: apiScoreA,
        score_b: apiScoreB,
        winner_id: apiWinnerId,
      })
    }

    toUpsert.push(buildRow(m, apiStatus, apiStage, apiScoreA, apiScoreB, apiWinnerId, teamUuid))
  }

  log(`📊 Diff: ${toUpsert.length} changes (${liveCount} live, ${finishedNew} newly FINISHED, ${unchanged} unchanged)`)

  // Upsert changes
  if (toUpsert.length > 0) {
    const BATCH = 50
    for (let i = 0; i < toUpsert.length; i += BATCH) {
      await sb('/matches?on_conflict=external_id', {
        method: 'POST',
        body: JSON.stringify(toUpsert.slice(i, i + BATCH)),
      })
    }
  }

  // ===== Auto-fill of missing predictions moved to the database =====
  // Previously this generated a RANDOM monkey-style prediction here. It is now
  // handled server-side by the Postgres function autofill_missing_predictions()
  // (pg_cron, every 5 min), which instead copies the AI bot's (רובוט A.I) pick
  // and also covers matches without an external_id (e.g. FRIENDLY) that this
  // API-driven sync never sees. See migration 021_autofill_and_reveal_predictions.
  const autoFilled = 0

  // Score newly-finished matches
  const affectedUsers = new Set()
  for (const m of newlyFinished) {
    if (m.score_a === null || m.score_b === null) continue
    const preds = await sb(`/predictions?match_id=eq.${m.db_id}&select=id,user_id,pred_score_a,pred_score_b,pred_qualifier_id`)
    for (const p of preds) {
      if (p.pred_score_a === null || p.pred_score_b === null) continue
      const pts = calculatePoints(
        p.pred_score_a, p.pred_score_b, p.pred_qualifier_id,
        m.score_a, m.score_b, m.winner_id, m.stage,
      )
      await sb(`/predictions?id=eq.${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ points_earned: pts }),
      })
      affectedUsers.add(p.user_id)
    }
    log(`⚖️  Scored ${preds.length} preds for match ${m.db_id} (${m.score_a}-${m.score_b})`)
  }

  // Recalculate user totals
  for (const userId of affectedUsers) {
    await rpc('recalculate_user_points', { p_user_id: userId })
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  return {
    ok: true,
    elapsed_s: parseFloat(elapsed),
    api_budget_left: apiBudget,
    matches_total: apiMatches.length,
    changes: toUpsert.length,
    live: liveCount,
    newly_finished: finishedNew,
    newly_started: newlyStarted.length,
    auto_filled: autoFilled,
    unchanged,
    users_updated: affectedUsers.size,
    skipped_polling: !hasLiveOrPotential && toUpsert.length === 0,
  }
}

function buildRow(m, status, stage, scoreA, scoreB, winnerId, teamUuid) {
  return {
    external_id: m.id,
    team_a_id: m.homeTeam?.id ? teamUuid.get(m.homeTeam.id) ?? null : null,
    team_b_id: m.awayTeam?.id ? teamUuid.get(m.awayTeam.id) ?? null : null,
    start_time: m.utcDate,
    stage,
    status,
    score_a: scoreA,
    score_b: scoreB,
    winner_id: winnerId,
  }
}
