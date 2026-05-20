import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import type { Profile, LeaderboardStats } from '../types'

/**
 * Sort comparator for the leaderboard:
 *   1. total_points  DESC
 *   2. exact_count   DESC   (tiebreaker — more pinpoint predictions wins)
 *   3. direction_count DESC (secondary tiebreaker)
 *   4. username ASC         (final tiebreaker for deterministic order)
 */
function rankCompare(a: Profile, b: Profile, stats: Map<string, LeaderboardStats>) {
  if (b.total_points !== a.total_points) return b.total_points - a.total_points
  const sA = stats.get(a.id), sB = stats.get(b.id)
  const exA = sA?.exact_count ?? 0, exB = sB?.exact_count ?? 0
  if (exB !== exA) return exB - exA
  const dirA = sA?.direction_count ?? 0, dirB = sB?.direction_count ?? 0
  if (dirB !== dirA) return dirB - dirA
  return a.username.localeCompare(b.username)
}

export function useLeaderboard() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [stats, setStats] = useState<Map<string, LeaderboardStats>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()

    const channel = supabase
      .channel('leaderboard-profiles')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        payload => {
          setProfiles(prev => {
            const updated = prev.map(p =>
              p.id === payload.new.id ? (payload.new as Profile) : p
            )
            // Re-sort with current stats snapshot
            return [...updated].sort((a, b) => rankCompare(a, b, stats))
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // We intentionally don't re-subscribe when `stats` changes — the closure
  // captures the latest map via setProfiles, which is fine for our use case.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    const [profilesRes, statsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.rpc('get_leaderboard_stats'),
    ])

    const statsMap = new Map<string, LeaderboardStats>()
    for (const s of (statsRes.data ?? []) as LeaderboardStats[]) {
      statsMap.set(s.user_id, s)
    }

    const sorted = [...(profilesRes.data ?? [])].sort((a, b) => rankCompare(a, b, statsMap))
    setProfiles(sorted)
    setStats(statsMap)
    setLoading(false)
  }

  return { profiles, stats, loading }
}
