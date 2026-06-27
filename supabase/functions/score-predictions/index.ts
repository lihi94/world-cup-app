// score-predictions/index.ts
// Supabase Edge Function — scores all predictions for a given match
// and updates profiles.total_points via recalculate_user_points().
//
// POST body: { external_id: number }   (football-data.org match ID)
// Also accepts: { match_id: string }   (internal UUID, for admin override)
//
// v7: removed the knockout "who advances" qualifier bonus. Scoring is based
// on the 90-minute result only, at every stage (group and knockout alike).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Stage = 'FRIENDLY' | 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'THIRD' | 'FINAL'

function calculatePoints(
  predA: number,
  predB: number,
  actualA: number,
  actualB: number,
  stage: Stage
): number {
  const isExact = predA === actualA && predB === actualB
  const isCorrectDir = Math.sign(predA - predB) === Math.sign(actualA - actualB)

  // FRIENDLY = pre-tournament warmup — does NOT count for the league.
  if (stage === 'FRIENDLY') return 0
  if (stage === 'GROUP') return isExact ? 3 : isCorrectDir ? 2 : 0
  if (stage === 'FINAL') return isExact ? 5 : isCorrectDir ? 4 : 0
  // R32, R16, QF, SF, THIRD — knockout, 90-minute result only (no qualifier bonus).
  return isExact ? 4 : isCorrectDir ? 3 : 0
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const body = await req.json()
  let matchQuery = supabase.from('matches').select('*')

  if (body.match_id) {
    matchQuery = matchQuery.eq('id', body.match_id)
  } else if (body.external_id) {
    matchQuery = matchQuery.eq('external_id', body.external_id)
  } else {
    return new Response('Missing match_id or external_id', { status: 400 })
  }

  const { data: match, error: matchErr } = await matchQuery.single()
  if (matchErr || !match) {
    return new Response('Match not found', { status: 404 })
  }

  if (match.score_a === null || match.score_b === null) {
    return new Response('Match has no score yet', { status: 400 })
  }

  const { data: preds, error: predErr } = await supabase
    .from('predictions')
    .select('*')
    .eq('match_id', match.id)

  if (predErr) {
    return new Response('Failed to fetch predictions', { status: 500 })
  }

  const affectedUsers = new Set<string>()

  for (const pred of preds ?? []) {
    if (pred.pred_score_a === null || pred.pred_score_b === null) continue

    const pts = calculatePoints(
      pred.pred_score_a,
      pred.pred_score_b,
      match.score_a,
      match.score_b,
      match.stage as Stage
    )

    await supabase
      .from('predictions')
      .update({ points_earned: pts })
      .eq('id', pred.id)

    affectedUsers.add(pred.user_id)
  }

  // Recalculate total_points for each affected user
  for (const userId of affectedUsers) {
    await supabase.rpc('recalculate_user_points', { p_user_id: userId })
  }

  // Score golden bets if this is the Final and winner is known
  if (match.stage === 'FINAL' && match.winner_id && match.status === 'FINISHED') {
    const { data: bets } = await supabase
      .from('golden_bets')
      .select('*')
      .not('winner_team_id', 'is', null)

    // Champion bet only — writes the dedicated winner_points column so it never
    // clobbers top_scorer_points (scored separately via score_golden_top_scorer).
    // points_earned is a generated total of both, so we must NOT write it here.
    for (const bet of bets ?? []) {
      const winnerCorrect = bet.winner_team_id === match.winner_id

      await supabase
        .from('golden_bets')
        .update({ winner_points: winnerCorrect ? 8 : 0 })
        .eq('user_id', bet.user_id)

      await supabase.rpc('recalculate_user_points', { p_user_id: bet.user_id })
    }
  }

  return new Response(
    JSON.stringify({ scored: preds?.length ?? 0, users: affectedUsers.size }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
