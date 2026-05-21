// fetch-results/index.ts
// Supabase Edge Function — called by pg_cron every 15 minutes.
//
// Cron is LIVE — runs every 15 minutes via pg_cron (job id 2).
// To inspect: SELECT jobid, jobname, schedule, active FROM cron.job;
// To pause:   SELECT cron.unschedule('fetch-match-results');
// To resume:  re-run the SELECT cron.schedule(...) in the Supabase SQL editor.

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
  const res = await fetch(
    `${FOOTBALL_API}/competitions/${COMPETITION}/matches?season=2026`,
    { headers: { 'X-Auth-Token': Deno.env.get('FOOTBALL_API_KEY')! } }
  )

  if (!res.ok) {
    return new Response(`Football API error: ${res.status}`, { status: 502 })
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
  // If any SCHEDULED match kicks off within the next 3 hours and its odds
  // are stale (never fetched, or last fetched >2 h ago), trigger fetch-odds.
  // This implements the "refresh 3 h before each match" requirement without
  // needing a separate cron job per match.
  const in3h = new Date(Date.now() + 3 * 3_600_000).toISOString()
  const { data: upcoming } = await supabase
    .from('matches')
    .select('id, start_time, odds_updated_at')
    .eq('status', 'SCHEDULED')
    .gt('start_time', new Date().toISOString())
    .lt('start_time', in3h)

  const oddsStale = upcoming?.some(m => {
    if (!m.odds_updated_at) return true
    return Date.now() - new Date(m.odds_updated_at).getTime() > 2 * 3_600_000
  })

  let oddsRefreshed = false
  if (oddsStale) {
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
