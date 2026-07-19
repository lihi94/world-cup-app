import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

/**
 * True once the tournament FINAL has finished — the signal to fire the
 * end-of-tournament champions reveal. Polls lightly (the whole thing happens
 * once, ever) and refetches when the tab regains focus.
 */
export function useTournamentDone(): boolean {
  const [done, setDone] = useState(false)

  useEffect(() => {
    let alive = true
    async function check() {
      const { data } = await supabase
        .from('matches')
        .select('status')
        .eq('stage', 'FINAL')
        .maybeSingle()
      if (alive && data?.status === 'FINISHED') setDone(true)
    }
    check()
    const interval = setInterval(check, 60_000)
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return done
}
