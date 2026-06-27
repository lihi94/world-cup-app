import type { Match, MatchStage } from '../types'
import { he } from '../i18n/he'

export interface MatchSectionData {
  /** Stable identifier used for React keys. */
  key: string
  /** Heading shown on the collapsible bar (e.g. "בית A", "רבע גמר"). */
  title: string
  /** Optional emoji rendered next to the title. */
  icon: string
  /** Color theme for the section header. */
  accent: 'emerald' | 'amber' | 'purple' | 'rose' | 'blue' | 'cyan'
  /** Matches grouped into this section, ordered by start_time. */
  matches: Match[]
}

/** Stage ordering for knockout sections (group sections always come first). */
const STAGE_ORDER: MatchStage[] = ['R32', 'R16', 'QF', 'SF', 'THIRD', 'FINAL']

const KNOCKOUT_ACCENTS: Record<string, MatchSectionData['accent']> = {
  R32: 'cyan', R16: 'purple', QF: 'amber', SF: 'rose', THIRD: 'blue', FINAL: 'rose',
}
const KNOCKOUT_ICONS: Record<string, string> = {
  R32: '🔢', R16: '🏟️', QF: '⚔️', SF: '🥈', THIRD: '🥉', FINAL: '🏆',
}

/**
 * Group an ordered match list into sections by:
 *   - FRIENDLY     → single warmup section ("משחקי ידידות") shown first
 *   - GROUP stage  → by `team_a.group_name` ("בית A", "בית B"...)
 *   - knockout     → by `stage` (R32, R16, QF, SF, THIRD, FINAL)
 *
 * Sections are returned in tournament order: friendlies first (pre-tournament
 * warmup), then groups A→L, then knockout rounds in chronological round order.
 *
 * When `collapseGroups` is set, ALL group-stage matches collapse into a single
 * "בתים" section instead of one per group letter — used by the finished tab so
 * the long A→L list folds into one folder.
 */
export function groupMatchesIntoSections(
  matches: Match[],
  options: { collapseGroups?: boolean } = {}
): MatchSectionData[] {
  const friendlyBucket: Match[] = []
  const groupBuckets = new Map<string, Match[]>()  // key = group letter
  const allGroupBucket: Match[] = []               // used when collapseGroups
  const stageBuckets = new Map<MatchStage, Match[]>()

  for (const m of matches) {
    if (m.stage === 'FRIENDLY') {
      friendlyBucket.push(m)
    } else if (m.stage === 'GROUP') {
      if (options.collapseGroups) {
        allGroupBucket.push(m)
      } else {
        // Use team_a's group_name; fall back to team_b's if team_a missing.
        const g = m.team_a?.group_name ?? m.team_b?.group_name ?? '?'
        const arr = groupBuckets.get(g) ?? []
        arr.push(m)
        groupBuckets.set(g, arr)
      }
    } else {
      const arr = stageBuckets.get(m.stage) ?? []
      arr.push(m)
      stageBuckets.set(m.stage, arr)
    }
  }

  const sections: MatchSectionData[] = []

  // Friendlies (pre-tournament warmup) shown first
  if (friendlyBucket.length) {
    sections.push({
      key: 'friendly',
      title: 'משחקי ידידות',
      icon: '🤝',
      accent: 'blue',
      matches: friendlyBucket,
    })
  }

  // Collapsed mode: a single "בתים" folder for the whole group stage.
  if (options.collapseGroups && allGroupBucket.length) {
    sections.push({
      key: 'groups_all',
      title: 'בתים',
      icon: '🏟️',
      accent: 'emerald',
      matches: allGroupBucket,
    })
  }

  // Group sections in alphabetical order (A, B, ..., L; ? last)
  const groupKeys = [...groupBuckets.keys()].sort((a, b) => {
    if (a === '?') return 1
    if (b === '?') return -1
    return a.localeCompare(b)
  })
  for (const g of groupKeys) {
    sections.push({
      key: `group_${g}`,
      title: g === '?' ? 'ללא בית' : `בית ${g}`,
      icon: '🏟️',
      accent: 'emerald',
      matches: groupBuckets.get(g)!,
    })
  }

  // Knockout sections in canonical tournament order
  for (const s of STAGE_ORDER) {
    const ms = stageBuckets.get(s)
    if (!ms?.length) continue
    sections.push({
      key: `stage_${s}`,
      title: he[s as keyof typeof he] ?? s,
      icon: KNOCKOUT_ICONS[s] ?? '🎯',
      accent: KNOCKOUT_ACCENTS[s] ?? 'purple',
      matches: ms,
    })
  }

  return sections
}
