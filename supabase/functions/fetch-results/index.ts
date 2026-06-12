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
//
// Execution order (v13+):
//   1. ESPN runs FIRST — marks IN_PLAY or FINISHED for any kicked-off match
//   2. football-data runs SECOND — updates stages/teams for future matches,
//      catches anything ESPN missed, never downgrades status
// This ordering ensures ESPN can mark a match IN_PLAY before football-data
// potentially marks it FINISHED in the same tick (free-tier lag issue).
//
// Clock-based LIVE guarantee (v14, learned from Korea–Czechia 12/6 which
// never showed in the LIVE tab): a SCHEDULED match whose kickoff passed is
// promoted to IN_PLAY by TIME alone, even when ESPN is unreachable or
// unmatched. ESPN only enriches the live score after that. Promotion is
// skipped when ESPN explicitly reports 'pre' (delayed kickoff) and is
// bounded to kickoff+2h45m so a stuck match can't stay falsely live.
//
// Self-healing scoring (v15, learned from Canada–Bosnia 12/6): the tick that
// marked the match FINISHED crashed (football-data fetch threw, uncaught)
// before reaching the scoring step, and later ticks never retried because
// the FINISHED transition only fires once. Now football-data is wrapped in
// try/catch, and EVERY tick re-scores all matches finished in the last 24h —
// score-predictions is idempotent, so a crashed tick is repaired within 5min.

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

  // Load all teams so we can resolve external_id → uuid (needed by football-data block)
  const { data: teamsData } = await supabase.from('teams').select('id, external_id')
  const teamMap = new Map<number, string>(
    (teamsData ?? []).map((t: { id: string; external_id: number }) => [t.external_id, t.id])
  )

  // newlyFinished collects external_ids from both ESPN and football-data blocks.
  // Using a Set to avoid double-scoring the same match.
  const newlyFinishedSet = new Set<number>()

  // ── 1. ESPN live scores (runs FIRST) ─────────────────────────────────────
  // ESPN runs before football-data so it can mark IN_PLAY before football-data
  // potentially marks the same match FINISHED in the same tick (free-tier lag).
  //
  // For every match that kicked off (within the last 48h) and isn't FINISHED:
  //   • state 'in'   → mark IN_PLAY + write current live score
  //   • state 'post' → mark FINISHED + final score + winner, trigger scoring
  const nowMs = Date.now()
  const { data: pending } = await supabase
    .from('matches')
    .select('id, external_id, status, start_time, team_a_id, team_b_id, team_a:teams!team_a_id(name), team_b:teams!team_b_id(name)')
    .lte('start_time', new Date(nowMs).toISOString())
    .gt('start_time', new Date(nowMs - 48 * 3_600_000).toISOString())
    .neq('status', 'FINISHED')
    .not('external_id', 'is', null)

  let espnFixed = 0
  let espnLive = 0
  let timePromoted = 0
  if (pending && pending.length > 0) {
    // ESPN buckets scoreboard days by US local date, so a 02:00 UTC match
    // lives under the PREVIOUS day's date — query each UTC date and the day
    // before it, dedupe events by id.
    const dates = new Set<string>()
    for (const p of pending) {
      const t = new Date(p.start_time).getTime()
      for (const d of [t, t - 86_400_000]) {
        dates.add(new Date(d).toISOString().slice(0, 10).replace(/-/g, ''))
      }
    }
    const events: any[] = []
    const seenEvents = new Set<string>()
    for (const d of dates) {
      try {
        const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${d}`)
        if (!r.ok) continue
        for (const e of (await r.json()).events ?? []) {
          if (!seenEvents.has(e.id)) {
            seenEvents.add(e.id)
            events.push(e)
          }
        }
      } catch (_) { /* ESPN down — football-data will cover next tick */ }
    }

    // Loose name matching: shared token prefix handles naming gaps like
    // "Korea Republic" vs "South Korea" or "Czech Republic" vs "Czechia".
    const tokens = (s: string) =>
      s.toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).filter(w => w.length >= 4)
    const namesOverlap = (x?: string, y?: string) => {
      if (!x || !y) return false
      const tx = tokens(x), ty = tokens(y)
      return tx.some(a => ty.some(b => a.startsWith(b.slice(0, 5)) || b.startsWith(a.slice(0, 5))))
    }

    for (const p of pending) {
      const kickoff = new Date(p.start_time).getTime()
      const candidates = events.filter(e =>
        Math.abs(new Date(e.date).getTime() - kickoff) < 30 * 60_000
      )

      // What ESPN said about this match this tick — null means no event matched
      // (ESPN down, name mismatch, missing date bucket). Drives both the score
      // update and the clock-based promotion fallback below.
      let espnState: string | null = null

      for (const ev of candidates) {
        const comp = ev.competitions?.[0]
        const home = comp?.competitors?.find((c: any) => c.homeAway === 'home')
        const away = comp?.competitors?.find((c: any) => c.homeAway === 'away')
        if (!home || !away) continue

        const aName = (p as any).team_a?.name
        const bName = (p as any).team_b?.name
        const aligned = namesOverlap(home.team?.displayName, aName) && namesOverlap(away.team?.displayName, bName)
        const swapped = namesOverlap(home.team?.displayName, bName) && namesOverlap(away.team?.displayName, aName)
        if (!aligned && !swapped) continue

        const hs = parseInt(home.score), as_ = parseInt(away.score)
        if (isNaN(hs) || isNaN(as_)) continue
        const scoreA = aligned ? hs : as_
        const scoreB = aligned ? as_ : hs
        espnState = ev.status?.type?.state ?? null  // 'pre' | 'in' | 'post'

        if (espnState === 'post' && ev.status?.type?.completed) {
          const winnerId = scoreA > scoreB ? p.team_a_id : scoreB > scoreA ? p.team_b_id : null
          await supabase
            .from('matches')
            .update({ status: 'FINISHED', score_a: scoreA, score_b: scoreB, winner_id: winnerId })
            .eq('id', p.id)
          newlyFinishedSet.add(p.external_id as number)
          espnFixed++
        } else if (espnState === 'in') {
          await supabase
            .from('matches')
            .update({ status: 'IN_PLAY', score_a: scoreA, score_b: scoreB })
            .eq('id', p.id)
          espnLive++
        }
        break
      }

      // Clock-based LIVE guarantee: kickoff passed and ESPN gave us nothing →
      // promote to IN_PLAY anyway so the match always appears in the LIVE tab
      // (score stays null → UI renders 0–0 until ESPN catches up). Skipped when
      // ESPN explicitly says 'pre' (delayed kickoff). Bounded to 2h45m so a
      // postponed/stuck match can't sit falsely live forever.
      const elapsed = nowMs - kickoff
      if (
        espnState === null &&
        p.status === 'SCHEDULED' &&
        elapsed >= 0 && elapsed < 2.75 * 3_600_000
      ) {
        await supabase
          .from('matches')
          .update({ status: 'IN_PLAY' })
          .eq('id', p.id)
        timePromoted++
      }

      console.log(JSON.stringify({
        match: `${(p as any).team_a?.name} vs ${(p as any).team_b?.name}`,
        dbStatus: p.status,
        espnCandidates: candidates.length,
        espnState,
        elapsedMin: Math.round(elapsed / 60_000),
      }))
    }
  }

  // ── 2. football-data (runs SECOND) ───────────────────────────────────────
  // Updates stages, future match metadata, and team IDs. Also catches matches
  // that ESPN missed. The anti-downgrade guards below ensure football-data
  // can't undo what ESPN just wrote (e.g. IN_PLAY → SCHEDULED).
  const apiKey = Deno.env.get('FOOTBALL_API_KEY')
  if (!apiKey) {
    return new Response('FOOTBALL_API_KEY secret not set', { status: 500 })
  }

  // Wrapped in try/catch: a thrown fetch here used to kill the whole tick —
  // including the scoring step below — leaving a FINISHED match unscored
  // forever (Canada–Bosnia 12/6). football-data failing must never block
  // scoring or odds.
  let fdUpdated = 0
  try {
  const url = `${FOOTBALL_API}/competitions/${COMPETITION}/matches?season=2026`
  const res = await fetch(url, { headers: { 'X-Auth-Token': apiKey } })

  if (res.ok) {
    const { matches } = await res.json()
    fdUpdated = matches.length

    for (const m of matches) {
      const mappedStatus = STATUS_MAP[m.status] ?? 'SCHEDULED'
      const mappedStage = STAGE_MAP[m.stage] ?? 'GROUP'

      // Free-tier API lag: status can flip to FINISHED while fullTime is still
      // null (happened on the 2026 opener). Skip until scores are published.
      if (
        mappedStatus === 'FINISHED' &&
        (m.score?.fullTime?.home == null || m.score?.fullTime?.away == null)
      ) {
        continue
      }

      // Resolve advancing team: football-data.org sets score.winner to HOME/AWAY/DRAW
      let winnerId: string | null = null
      if (m.score?.winner === 'HOME_TEAM' && m.homeTeam?.id) {
        winnerId = teamMap.get(m.homeTeam.id) ?? null
      } else if (m.score?.winner === 'AWAY_TEAM' && m.awayTeam?.id) {
        winnerId = teamMap.get(m.awayTeam.id) ?? null
      }

      const teamAId = m.homeTeam?.id ? (teamMap.get(m.homeTeam.id) ?? null) : null
      const teamBId = m.awayTeam?.id ? (teamMap.get(m.awayTeam.id) ?? null) : null

      const payload: Record<string, unknown> = {
        external_id: m.id,
        status: mappedStatus,
        stage: mappedStage,
        score_a: m.score?.fullTime?.home ?? null,
        score_b: m.score?.fullTime?.away ?? null,
        winner_id: winnerId,
      }

      if (teamAId) payload.team_a_id = teamAId
      if (teamBId) payload.team_b_id = teamBId

      const { data: existing } = await supabase
        .from('matches')
        .select('status, external_id, score_a, score_b')
        .eq('external_id', m.id)
        .maybeSingle()

      if (!existing) continue

      // Anti-downgrade guards — the free-tier serves inconsistent replicas.
      // ESPN already ran this tick; don't let football-data undo it.
      if (existing.status === 'FINISHED' && mappedStatus !== 'FINISHED') continue
      if (existing.status === 'IN_PLAY' && mappedStatus === 'SCHEDULED') continue
      if (existing.score_a !== null && payload.score_a === null) {
        delete payload.score_a
        delete payload.score_b
        delete payload.winner_id
      }

      await supabase
        .from('matches')
        .update(payload)
        .eq('external_id', m.id)

      if (existing.status !== 'FINISHED' && mappedStatus === 'FINISHED') {
        newlyFinishedSet.add(m.id)
      }
    }
  } else {
    console.error(`Football API error ${res.status}`)
  }
  } catch (e) {
    console.error(`football-data block failed: ${e}`)
  }

  // ── 3. Score finished matches (self-healing) ─────────────────────────────
  // Not just newly-finished: EVERY tick re-scores all matches finished in the
  // last 24h. score-predictions recalculates from scratch (idempotent), so
  // this repairs any tick that crashed between marking FINISHED and scoring.
  const { data: recentFinished } = await supabase
    .from('matches')
    .select('external_id')
    .eq('status', 'FINISHED')
    .neq('stage', 'FRIENDLY')
    .not('external_id', 'is', null)
    .not('score_a', 'is', null)
    .gt('start_time', new Date(nowMs - 24 * 3_600_000).toISOString())
  for (const r of recentFinished ?? []) {
    newlyFinishedSet.add(r.external_id as number)
  }

  const newlyFinished = Array.from(newlyFinishedSet)
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

  // ── 4. Pre-match odds refresh ─────────────────────────────────────────────
  // Refresh odds exactly twice per match:
  //   • ~24 h before kickoff  (window: 22 h – 26 h from now, stale if >20 h old)
  //   • ~3 h before kickoff   (window:  2 h –  4 h from now, stale if > 2 h old)
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
    JSON.stringify({ fdUpdated, scored: newlyFinished.length, espnFixed, espnLive, timePromoted, oddsRefreshed }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
