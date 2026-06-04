// scoring.ts — client-side mirror of score-predictions Edge Function.
// Used only for preview/display. The Edge Function is authoritative.
// If scoring rules change, update BOTH files simultaneously.

import type { MatchStage } from '../types'

export function calculatePoints(
  predA: number,
  predB: number,
  predQualId: string | null,
  actualA: number,
  actualB: number,
  winnerId: string | null,
  stage: MatchStage
): number {
  const isExact = predA === actualA && predB === actualB
  const predDir = Math.sign(predA - predB)
  const actualDir = Math.sign(actualA - actualB)
  const isCorrectDir = predDir === actualDir

  // FRIENDLY = pre-tournament warmup — does NOT count for the league.
  if (stage === 'FRIENDLY') return 0

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

export function maxPointsForStage(stage: MatchStage): number {
  if (stage === 'FRIENDLY') return 0
  if (stage === 'GROUP') return 3
  if (stage === 'FINAL') return 6
  return 5
}

export function pointsLabel(pts: number): string {
  return `${pts} נק'`
}
