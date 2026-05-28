// fetch-results/index.ts
// Supabase Edge Function — called by pg_cron every 5 minutes.
//
// Cron is LIVE — runs every 5 minutes via pg_cron (job id 2).
// To inspect: SELECT jobid, jobname, schedule, active FROM cron.job;
// To pause:   SELECT cron.unschedule('fetch-match-results');
// To resume:  re-run the SELECT cron.schedule(...) in the Supabase SQL editor.
// To change cadence (no downtime, keeps job ID):
//             SELECT cron.alter_job(job_id := 2, schedule := '*/N * * * *');
//
// Safety properties verified (2026-05-23) for sub-15min cadence:
//   • score-predictions is idempotent — re-runs produce identical points
//   • fetch-odds trigger uses staleness windows (20h/2h), not frequency,
//     so total odds-API calls remain ~2 per match regardless of cron rate
//   • football-data.org free tier (10 req/min) leaves 50× headroom at 5min

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FOOTBALL_API = 'https://api.football-data.org/v4'
const COMPETITION = 'WC'

const STATUS_MAP: Record<string, string> = {
  FINISHED: 'FINISHED',
  IN_PLAY: 'IN_PLAY',
  PAUSED: 'IN_PLAY',
  HALF_TIME: 'IN_PLAY',
  EXTRA_TIME: 'IN_PLAY',
  PENALTY_SHOOTOUT: 'IN_PLAY',
  TIMED: 'SCHEDULED',
  SCHEDULED: 'SCHEDULED',
  POSTPONED: 'SCHEDULED',
  SUSPENDED: 'SCHEDULED',
  CANCELLED: 'SCHEDULED',
}

const STAGE_MAP: Record<string, string> = {
  'GROUP_STAGE': 'GROUP',
  'ROUND_OF_32': 'R32',        // 2026 WC — new stage with 48 teams
  'ROUND_OF_16': 'R16',
  'QUARTER_FINALS': 'QF',
  'SEMI_FINALS': 'SF',
  'THIRD_PLACE': 'THIRD',      // football-data.org name for 3rd-place playoff
  'THIRD_PLACE_PLAY_OFF': 'THIRD', // alternate spelling some competitions use
  'FINAL': 'FINAL',
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Single API call — fetch all WC matches at once to respect rate limits
  const apiKey = Deno.env.get('FOOTBALL_API_KEY')
  if (!apiKey) {
    return new Response('FOOTBALL_API_KEY secret not set', { status: 500 })
  }

  const url = `${FOOTBALL_API}/competitions/${COMPETITION}/matches?season=2026`
  const res = await fetch(url, { headers: { 'X-Auth-Token': apiKey } })

  if (!res.ok) {
    const body = await res.text()
    console.error(`Football API error ${res.status} on ${url}`, body)
    return new Response(
      JSON.stringify({
        error: 'football_api_error',
        status: res.status,
        url,
        keyLength: apiKey.length,
        body: body.slice(0, 500),
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { matches } = await res.json()

  // Load all teams so we can resolve external_id → uuid
  const { data: teamsData } = await supabase.from('teams').select('id, external_id')
  const teamMap = new Map<number, string>(
    (teamsData ?? []).map((t: { id: string; external_id: number }) => [t.external_id, t.id])
  )

  const newlyFinished: number[] = []

  for (const m of matches) {
    const mappedStatus = STATUS_MAP[m.status] ?? 'SCHEDULED'
    const mappedStage = STAGE_MAP[m.stage] ?? 'GROUP'

    // Resolve advancing team: football-data.org sets score.winner to HOME/AWAY/DRAW
    let winnerId: string | null = null
    if (m.score?.winner === 'HOME_TEAM' && m.homeTeam?.id) {
      winnerId = teamMap.get(m.homeTeam.id) ?? null
    } else if (m.score?.winner === 'AWAY_TEAM' && m.awayTeam?.id) {
      winnerId = teamMap.get(m.awayTeam.id) ?? null
    }

    // Resolve team UUIDs from the API home/away team IDs
    const teamAId = m.homeTeam?.id ? (teamMap.get(m.homeTeam.id) ?? null) : null
    const teamBId = m.awayTeam?.id ? (teamMap.get(m.awayTeam.id) ?? null) : null

    const payload: Record<string, unknown> = {
      external_id: m.id,
      status: mappedStatus,
      stage: mappedStage,
      score_a: m.score?.fullTime?.home ?? null,  // 90-min only
      score_b: m.score?.fullTime?.away ?? null,
      winner_id: winnerId,
    }

    // Fill in team IDs for knockout matches once teams are determined
    if (teamAId) payload.team_a_id = teamAId
    if (teamBId) payload.team_b_id = teamBId

    // Check current status to detect transition → FINISHED
    const { data: existing } = await supabase
      .from('matches')
      .select('status, external_id')
      .eq('external_id', m.id)
      .maybeSingle()

    if (!existing) continue  // match not yet in DB (will be inserted by admin/bootstrap)

    await supabase
      .from('matches')
      .update(payload)
      .eq('external_id', m.id)

    if (existing.status !== 'FINISHED' && mappedStatus === 'FINISHED') {
      newlyFinished.push(m.id)
    }
  }

  // Trigger scoring for each newly finished match
  for (const externalId of newlyFinished) {
    await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/score-predictions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ external_id: externalId }),
      }
    )
  }

  // ── Pre-match odds refresh ────────────────────────────────────────────────
  // Refresh odds exactly twice per match:
  //   • ~24 h before kickoff  (window: 22 h – 26 h from now, stale if >20 h old)
  //   • ~3 h before kickoff   (window:  2 h –  4 h from now, stale if > 2 h old)
  // fetch-results runs every 5 min — many cron ticks land inside each window,
  // but only the FIRST one actually triggers fetch-odds because subsequent
  // ticks see odds_updated_at within the staleness threshold and skip.
  // Net result: ~2 fetch-odds calls per match across the whole tournament,
  // identical to the previous 15-min cadence.
  const now = Date.now()

  const [w24, w3] = await Promise.all([
    supabase
      .from('matches')
      .select('id, odds_updated_at')
      .eq('status', 'SCHEDULED')
      .gt('start_time', new Date(now + 22 * 3_600_000).toISOString())
      .lt('start_time', new Date(now + 26 * 3_600_000).toISOString()),
    supabase
      .from('matches')
      .select('id, odds_updated_at')
      .eq('status', 'SCHEDULED')
      .gt('start_time', new Date(now +  2 * 3_600_000).toISOString())
      .lt('start_time', new Date(now +  4 * 3_600_000).toISOString()),
  ])

  const stale20h = new Date(now - 20 * 3_600_000).toISOString()
  const stale2h  = new Date(now -  2 * 3_600_000).toISOString()

  const needs24h = w24.data?.some(m => !m.odds_updated_at || m.odds_updated_at < stale20h)
  const needs3h  = w3.data?.some(m  => !m.odds_updated_at || m.odds_updated_at < stale2h)

  let oddsRefreshed = false
  if (needs24h || needs3h) {
    const oddsRes = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-odds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    )
    oddsRefreshed = oddsRes.ok
  }

  return new Response(
    JSON.stringify({ updated: matches.length, scored: newlyFinished.length, oddsRefreshed }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
