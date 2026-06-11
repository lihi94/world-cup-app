const LOCK_OFFSET_MS = 60 * 1000 // 1 minute before kickoff

export function isPredictionOpen(startTime: string): boolean {
  return new Date(startTime).getTime() - Date.now() > LOCK_OFFSET_MS
}

export function locksInLabel(startTime: string): string {
  const msLeft = new Date(startTime).getTime() - Date.now() - LOCK_OFFSET_MS
  if (msLeft <= 0) return 'נעול'

  const totalSeconds = Math.floor(msLeft / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) return `נועל בעוד ${days}י ${hours}ש'`
  if (hours > 0) return `נועל בעוד ${hours}ש' ${mins}ד'`
  return `נועל בעוד ${mins} דקות`
}

export function formatKickoff(startTime: string): string {
  return new Date(startTime).toLocaleString('he-IL', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jerusalem',
  })
}

/** Date-only label like "ראשון, 14.6" — used as a section header. */
export function formatDateHeader(startTime: string): string {
  return new Date(startTime).toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    timeZone: 'Asia/Jerusalem',
  })
}

/** Returns the date in 'YYYY-MM-DD' Israel-time for grouping matches. */
export function dateKey(startTime: string): string {
  // Build a date in IL timezone, then pull yyyy-mm-dd.
  const d = new Date(startTime)
  const il = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
  const y = il.getFullYear()
  const m = String(il.getMonth() + 1).padStart(2, '0')
  const day = String(il.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Time only — for matches within a date group. */
export function formatTime(startTime: string): string {
  return new Date(startTime).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jerusalem',
  })
}

export const GOLDEN_BET_DEADLINE = new Date('2026-06-11T13:05:00Z')

export function isGoldenBetOpen(): boolean {
  return new Date() < GOLDEN_BET_DEADLINE
}
