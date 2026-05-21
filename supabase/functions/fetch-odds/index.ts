// fetch-odds/index.ts
// Fetches real betting market odds from The Odds API and stores them as
// implied win-probabilities (0–100 each, sum ≈ 100) on the matches table.
//
// Scheduled via pg_cron:
//   1. Daily at 06:00 UTC (covers all upcoming matches)
//   2. Called by fetch-results whenever a match kicks off within 3 hours
//
// API: https://api.the-odds-api.com  (free tier: 500 req/month)
// Set secret: supabase secrets set ODDS_API_KEY=<your_key>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4'
const SPORT = 'soccer_fifa_world_cup'

// ── Types ────────────────────────────────────────────────────────────────────

interface OddsOutcome { name: string; price: number }
interface OddsMarket  { key: string; outcomes: OddsOutcome[] }
interface OddsBookmaker { key: string; markets: OddsMarket[] }
interface OddsGame {
  id: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: OddsBookmaker[]
}
interface DbMatch {
  id: string
  start_time: string
  team_a: { name: string } | null
  team_b: { name: string } | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise team names for fuzzy matching across two APIs */
function norm(s: string): string {
  return s.toLowerCase()
    .replace(/united states of america|united states/g, 'usa')
    .replace(/korea republic|south korea/g, 'korea')
    .replace(/korea dpr|north korea/g, 'korea dpr')
    .replace(/côte d.ivoire|ivory coast|cote d.ivoire/g, 'ivory coast')
    .replace(/cabo verde|cape verde/g, 'cape verde')
    .replace(/czech republic|czechia/g, 'czechia')
    .replace(/trinidad.*tobago/g, 'trinidad')
    .replace(/[-–—]/g, ' ')          // hyphens/dashes → spaces  ("Bosnia-Herzegovina")
    .replace(/\b(and|&)\b/g, ' ')    // strip 'and'/'&'           ("Bosnia and Herzegovina")
    .replace(/\s+/g, ' ')
    .trim()
}

function nameMatch(dbName: string, apiName: string): boolean {
  const a = norm(dbName)
  const b = norm(apiName)
  return a === b || a.includes(b) || b.includes(a)
}

/** Find our DB match for a given Odds-API game (time ±90 min + team names) */
function findDbMatch(matches: DbMatch[], game: OddsGame): DbMatch | null {
  const gameMs = new Date(game.commence_time).getTime()
  for (const m of matches) {
    if (Math.abs(new Date(m.start_time).getTime() - gameMs) > 90 * 60_000) continue
    const nA = m.team_a?.name ?? ''
    const nB = m.team_b?.name ?? ''
    const straight = nameMatch(nA, game.home_team) && nameMatch(nB, game.away_team)
    const flipped  = nameMatch(nA, game.away_team) && nameMatch(nB, game.home_team)
    if (straight || flipped) return m
  }
  return null
}

/**
 * Average the h2h decimal odds across all bookmakers for a game.
 * Returns null if no bookmaker has h2h data.
 */
function averageH2HOdds(
  game: OddsGame,
): { home: number; draw: number; away: number } | null {
  const homes: number[] = [], draws: number[] = [], aways: number[] = []

  for (const bm of game.bookmakers) {
    const h2h = bm.markets.find(m => m.key === 'h2h')
    if (!h2h) continue
    const home = h2h.outcomes.find(o => o.name === game.home_team)?.price
    const away = h2h.outcomes.find(o => o.name === game.away_team)?.price
    const draw = h2h.outcomes.find(o => o.name === 'Draw')?.price
    if (home && away && draw) {
      homes.push(home)
      draws.push(draw)
      aways.push(away)
    }
  }

  if (!homes.length) return null
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  return { home: avg(homes), draw: avg(draws), away: avg(aways) }
}

/**
 * Convert decimal odds → normalised implied probabilities (0-100, sum = 100).
 * This removes the bookmaker's overround (vig).
 */
function toProbs(
  decimal: { home: number; draw: number; away: number },
): { oddsA: number; oddsDraw: number; oddsB: number } {
  const pH = 1 / decimal.home
  const pD = 1 / decimal.draw
  const pA = 1 / decimal.away
  const tot = pH + pD + pA
  const oddsA    = Math.round((pH / tot) * 100)
  const oddsDraw = Math.round((pD / tot) * 100)
  const oddsB    = 100 - oddsA - oddsDraw   // ensures exact sum = 100
  return { oddsA, oddsDraw, oddsB }
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async () => {
  const apiKey = Deno.env.get('ODDS_API_KEY')
  if (!apiKey) {
    return new Response('ODDS_API_KEY secret not set', { status: 500 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── 1. Fetch odds from The Odds API ──────────────────────────────────────
  const oddsRes = await fetch(
    `${ODDS_API_BASE}/sports/${SPORT}/odds` +
    `?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${apiKey}`,
  )

  if (!oddsRes.ok) {
    const body = await oddsRes.text()
    console.error('Odds API error', oddsRes.status, body)
    return new Response(`Odds API error ${oddsRes.status}: ${body}`, { status: 502 })
  }

  const games: OddsGame[] = await oddsRes.json()
  const remaining = oddsRes.headers.get('x-requests-remaining') ?? '?'
  console.log(`Odds API: ${games.length} games, ${remaining} requests remaining`)

  // ── 2. Load all scheduled matches ────────────────────────────────────────
  const { data: matches, error: dbErr } = await supabase
    .from('matches')
    .select('id, start_time, team_a:teams!team_a_id(name), team_b:teams!team_b_id(name)')
    .eq('status', 'SCHEDULED')

  if (dbErr) {
    return new Response(`DB error: ${dbErr.message}`, { status: 500 })
  }

  if (!matches?.length) {
    return new Response(
      JSON.stringify({ updated: 0, message: 'no scheduled matches' }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  }

  // ── 3. Match & update ────────────────────────────────────────────────────
  let updated = 0
  let skipped = 0

  for (const game of games) {
    const dbMatch = findDbMatch(matches as DbMatch[], game)
    if (!dbMatch) { skipped++; continue }

    const avgOdds = averageH2HOdds(game)
    if (!avgOdds) { skipped++; continue }

    const { oddsA, oddsDraw, oddsB } = toProbs(avgOdds)

    const { error } = await supabase.from('matches').update({
      odds_a:          oddsA,
      odds_draw:       oddsDraw,
      odds_b:          oddsB,
      odds_source:     'the-odds-api',
      odds_updated_at: new Date().toISOString(),
    }).eq('id', dbMatch.id)

    if (error) {
      console.error(`Failed to update match ${dbMatch.id}:`, error.message)
    } else {
      updated++
    }
  }

  return new Response(
    JSON.stringify({ total_games: games.length, updated, skipped, requests_remaining: remaining }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
