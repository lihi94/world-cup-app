import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import type { Profile } from '../types'

export function useLeaderboard() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()

    // Realtime: re-sort whenever any profile's points change
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
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('total_points', { ascending: false })
    setProfiles(data ?? [])
    setLoading(false)
  }

  return { profiles, loading }
}
