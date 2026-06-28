import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { displayName, type Profile, type LeaderboardStats } from '../types'

export interface TrajectoryPlayer {
  id: string
  name: string
  avatar: string
  isMe: boolean
  finalPoints: number
  /** Rank (1 = first place) at each checkpoint, same length as `labels`. */
  ranks: number[]
}

export interface RankTrajectory {
  /** "DD/MM" per finished match, in chronological order. */
  labels: string[]
  players: TrajectoryPlayer[]
  maxRank: number
  loading: boolean
  error: string | null
}

/**
 * Recomputes the leaderboard's standing after EVERY finished match (group +
 * knockout, friendlies excluded — they never score) so the UI can draw a
 * rank-over-time line per player. Computed client-side from raw predictions
 * because it's a one-time recompute per page load (≤ a few thousand rows for
 * a 104-match, ~20-player tournament) — no new RPC needed.
 */
export function useRankTrajectory(myUserId?: string | null): RankTrajectory {
  const [labels, setLabels] = useState<string[]>([])
  const [players, setPlayers] = useState<TrajectoryPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()

    // Re-fetch whenever a profile's total_points changes (scoring just ran)
    // so the chart never goes stale while the page stays open between
    // 5-minute fetch-results ticks.
    const channel = supabase
      .channel('rank-trajectory-profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => load())
      .subscribe()

    // Belt-and-suspenders: realtime sockets drop silently when a phone locks
    // or backgrounds the tab, so also poll every 60s and refetch the moment
    // the page becomes visible again (matches the LIVE tab's polling pattern).
    const interval = setInterval(load, 60_000)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {

    const [{ data: profiles, error: profilesErr }, { data: matches, error: matchesErr }, { data: statsData, error: statsErr }] = await Promise.all([
      supabase.from('profiles').select('id, username, nickname, avatar, is_bot').eq('is_bot', false),
      supabase
        .from('matches')
        .select('id, start_time')
        .eq('status', 'FINISHED')
        .neq('stage', 'FRIENDLY')
        .order('start_time', { ascending: true }),
      supabase.rpc('get_leaderboard_stats'),
    ])
    if (profilesErr) throw profilesErr
    if (matchesErr) throw matchesErr
    if (statsErr) throw statsErr

    // Same tiebreak the real leaderboard uses (more exact predictions wins),
    // so a tie in cumulative points never produces a different order/rank
    // here than what the leaderboard table actually shows right now.
    const statsByUser = new Map<string, LeaderboardStats>()
    for (const s of (statsData ?? []) as LeaderboardStats[]) statsByUser.set(s.user_id, s)

    const ms = matches ?? []
    const ps = (profiles ?? []) as Profile[]
    if (ms.length === 0 || ps.length === 0) {
      setLabels([])
      setPlayers([])
      setLoading(false)
      return
    }

    // A full tournament has 1600+ scored predictions (104 matches × ~20
    // players), well past Supabase's default 1000-row cap per request — a
    // plain .in() query silently truncated the result, undercounting
    // everyone's cumulative points. Page through in chunks of 1000 instead.
    const matchIds = ms.map(m => m.id)
    const preds: { user_id: string; match_id: string; points_earned: number }[] = []
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data: page, error: predsErr } = await supabase
        .from('predictions')
        .select('user_id, match_id, points_earned')
        .in('match_id', matchIds)
        .range(from, from + PAGE - 1)
      if (predsErr) throw predsErr
      preds.push(...(page ?? []))
      if (!page || page.length < PAGE) break
    }

    const N = ms.length
    const seqOf = new Map(ms.map((m, i) => [m.id, i]))

    // Cumulative points per user at each checkpoint (prefix sum).
    const cumByUser = new Map<string, number[]>()
    for (const p of ps) cumByUser.set(p.id, new Array(N).fill(0))
    for (const pr of preds ?? []) {
      const idx = seqOf.get(pr.match_id)
      const arr = cumByUser.get(pr.user_id)
      if (idx !== undefined && arr) arr[idx] += pr.points_earned ?? 0
    }
    for (const arr of cumByUser.values()) {
      for (let i = 1; i < N; i++) arr[i] += arr[i - 1]
    }

    // Same tiebreak as the leaderboard table: points DESC, exact_count DESC,
    // direction_count DESC, username ASC. This always yields a unique
    // sequential rank (1, 2, 3, ...) — the leaderboard never shares a rank
    // between tied players, so the chart shouldn't either.
    function compare(aId: string, bId: string, cumA: number, cumB: number) {
      if (cumB !== cumA) return cumB - cumA
      const sA = statsByUser.get(aId), sB = statsByUser.get(bId)
      const exA = sA?.exact_count ?? 0, exB = sB?.exact_count ?? 0
      if (exB !== exA) return exB - exA
      const dirA = sA?.direction_count ?? 0, dirB = sB?.direction_count ?? 0
      if (dirB !== dirA) return dirB - dirA
      const pA = ps.find(p => p.id === aId)!, pB = ps.find(p => p.id === bId)!
      return pA.username.localeCompare(pB.username)
    }

    // Rank per checkpoint.
    const ranksByUser = new Map<string, number[]>()
    for (const p of ps) ranksByUser.set(p.id, new Array(N).fill(0))
    for (let i = 0; i < N; i++) {
      const sorted = ps
        .map(p => ({ id: p.id, cum: cumByUser.get(p.id)![i] }))
        .sort((a, b) => compare(a.id, b.id, a.cum, b.cum))
      sorted.forEach((s, j) => { ranksByUser.get(s.id)![i] = j + 1 })
    }

    const lbls = ms.map(m =>
      new Date(m.start_time).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit' })
    )

    const playerList: TrajectoryPlayer[] = ps
      .map(p => ({
        id: p.id,
        name: displayName(p),
        avatar: p.avatar || '⚽',
        isMe: p.id === myUserId,
        finalPoints: cumByUser.get(p.id)![N - 1],
        ranks: ranksByUser.get(p.id)!,
      }))
      .sort((a, b) => compare(a.id, b.id, a.finalPoints, b.finalPoints))

    setLabels(lbls)
    setPlayers(playerList)
    } catch (e) {
      console.error('useRankTrajectory failed:', e)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return { labels, players, maxRank: players.length, loading, error }
}
