import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { displayName, type Profile } from '../types'

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
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {

    const [{ data: profiles, error: profilesErr }, { data: matches, error: matchesErr }] = await Promise.all([
      supabase.from('profiles').select('id, username, nickname, avatar, is_bot').eq('is_bot', false),
      supabase
        .from('matches')
        .select('id, start_time')
        .eq('status', 'FINISHED')
        .neq('stage', 'FRIENDLY')
        .order('start_time', { ascending: true }),
    ])
    if (profilesErr) throw profilesErr
    if (matchesErr) throw matchesErr

    const ms = matches ?? []
    const ps = (profiles ?? []) as Profile[]
    if (ms.length === 0 || ps.length === 0) {
      setLabels([])
      setPlayers([])
      setLoading(false)
      return
    }

    const matchIds = ms.map(m => m.id)
    const { data: preds, error: predsErr } = await supabase
      .from('predictions')
      .select('user_id, match_id, points_earned')
      .in('match_id', matchIds)
    if (predsErr) throw predsErr

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

    // Rank per checkpoint (standard competition ranking — ties share rank).
    const ranksByUser = new Map<string, number[]>()
    for (const p of ps) ranksByUser.set(p.id, new Array(N).fill(0))
    for (let i = 0; i < N; i++) {
      const sorted = ps
        .map(p => ({ id: p.id, cum: cumByUser.get(p.id)![i] }))
        .sort((a, b) => b.cum - a.cum)
      let rank = 1
      for (let j = 0; j < sorted.length; j++) {
        if (j > 0 && sorted[j].cum !== sorted[j - 1].cum) rank = j + 1
        ranksByUser.get(sorted[j].id)![i] = rank
      }
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
      .sort((a, b) => b.finalPoints - a.finalPoints)

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
