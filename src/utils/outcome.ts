import { he } from '../i18n/he'

/** Outcome of a prediction against a final score. */
export type Outcome = 'exact' | 'direction' | 'miss'

/** Classify a prediction against the final score: exact / right-direction / miss. */
export function predOutcome(
  pa: number | null, pb: number | null,
  sa: number | null, sb: number | null,
): Outcome | null {
  if (pa == null || pb == null || sa == null || sb == null) return null
  if (pa === sa && pb === sb) return 'exact'
  if (Math.sign(pa - pb) === Math.sign(sa - sb)) return 'direction'
  return 'miss'
}

/** Sort weight: exact first, then direction, then miss. */
export const OUTCOME_RANK: Record<Outcome, number> = { exact: 0, direction: 1, miss: 2 }

/** Badge styling per outcome — shared between the feed and player profile. */
export const OUTCOME_STYLE: Record<Outcome, { badge: string; icon: string; label: string }> = {
  exact:     { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: '🎯', label: 'מדויק' },
  direction: { badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',       icon: '↗',  label: 'כיוון' },
  miss:      { badge: 'bg-red-500/15 text-red-300 border-red-500/30',             icon: '✗',  label: 'טעות' },
}

/** Hebrew label per match stage. */
export const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: he.FRIENDLY, GROUP: he.GROUP, R32: he.R32, R16: he.R16,
  QF: he.QF, SF: he.SF, THIRD: he.THIRD, FINAL: he.FINAL,
}
