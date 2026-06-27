// scoring.ts — client-side mirror of score-predictions Edge Function.
// Used only for preview/display. The Edge Function is authoritative.
// If scoring rules change, update BOTH files simultaneously.

import type { MatchStage } from '../types'

// Scoring is based on the 90-minute result only. Knockout matches have NO
// advancing-team (qualifier) bonus — predQualId/winnerId are kept in the
// signature to mirror the Edge Function but are no longer used.
export function calculatePoints(
  predA: number,
  predB: number,
  _predQualId: string | null,
  actualA: number,
  actualB: number,
  _winnerId: string | null,
  stage: MatchStage
): number {
  const isExact = predA === actualA && predB === actualB
  const isCorrectDir = Math.sign(predA - predB) === Math.sign(actualA - actualB)

  // FRIENDLY = pre-tournament warmup — does NOT count for the league.
  if (stage === 'FRIENDLY') return 0
  if (stage === 'GROUP') return isExact ? 3 : isCorrectDir ? 2 : 0
  if (stage === 'FINAL') return isExact ? 5 : isCorrectDir ? 4 : 0
  // R32 / R16 / QF / SF — 90-minute result only.
  return isExact ? 4 : isCorrectDir ? 3 : 0
}

export function maxPointsForStage(stage: MatchStage): number {
  if (stage === 'FRIENDLY') return 0
  if (stage === 'GROUP') return 3
  if (stage === 'FINAL') return 5
  return 4
}

export function pointsLabel(pts: number): string {
  return `${pts} נק'`
}
