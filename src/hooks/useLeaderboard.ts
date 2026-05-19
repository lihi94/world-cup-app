import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import type { Profile, LeaderboardStats } from '../types'

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
            return [...updated].sort((a, b) => b.total_points - a.total_points)
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function load() {
    const [profilesRes, statsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('total_points', { ascending: false }),
      supabase.rpc('get_leaderboard_stats'),
    ])

    setProfiles(profilesRes.data ?? [])

    const statsMap = new Map<string, LeaderboardStats>()
    for (const s of (statsRes.data ?? []) as LeaderboardStats[]) {
      statsMap.set(s.user_id, s)
    }
    setStats(statsMap)
    setLoading(false)
  }

  return { profiles, stats, loading }
}
