// score-predictions/index.ts
// Supabase Edge Function — scores all predictions for a given match
// and updates profiles.total_points via recalculate_user_points().
//
// POST body: { external_id: number }   (football-data.org match ID)
// Also accepts: { match_id: string }   (internal UUID, for admin override)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Stage = 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'THIRD' | 'FINAL'

// CRITICAL: if/else if chain — two separate `if` blocks would double-count
// direction points when prediction is exact (e.g. group exact = 3, not 2+3=5).
function calculatePoints(
  predA: number,
  predB: number,
  predQualId: string | null,
  actualA: number,
  actualB: number,
  winnerId: string | null,
  stage: Stage
): number {
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
    // R32, R16, QF, SF
    pts = isExact ? 4 : isCorrectDir ? 3 : 0
    if (winnerId && predQualId === winnerId) pts += 1
  }

  return pts
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
      pred.pred_qualifier_id,
      match.score_a,
      match.score_b,
      match.winner_id,
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

    // Top scorer scoring is done manually by admin (API may not have final data instantly)
    for (const bet of bets ?? []) {
      let betPts = bet.points_earned
      // Only award winner points once (reset if re-scoring)
      const winnerCorrect = bet.winner_team_id === match.winner_id
      betPts = winnerCorrect ? 8 : 0

      await supabase
        .from('golden_bets')
        .update({ points_earned: betPts })
        .eq('user_id', bet.user_id)

      await supabase.rpc('recalculate_user_points', { p_user_id: bet.user_id })
    }
  }

  return new Response(
    JSON.stringify({ scored: preds?.length ?? 0, users: affectedUsers.size }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
