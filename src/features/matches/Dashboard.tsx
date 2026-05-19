import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import MatchCard from './MatchCard'
import Spinner from '../../components/common/Spinner'
import Hero from '../../components/common/Hero'
import WorldCupLogo from '../../components/common/WorldCupLogo'
import { formatDateHeader, dateKey } from '../../utils/date'
import { he } from '../../i18n/he'
import type { Match, Prediction } from '../../types'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [recentMatches, setRecentMatches] = useState<Match[]>([])
  const [myPredictions, setMyPredictions] = useState<Map<string, Prediction>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showLocked, setShowLocked] = useState(false)

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  async function load() {
    const now = new Date().toISOString()

    const [upcomingRes, recentRes, predsRes] = await Promise.all([
      supabase
        .from('matches')
        .select('*, team_a:teams!team_a_id(id,name,name_he,crest_url), team_b:teams!team_b_id(id,name,name_he,crest_url)')
        .gte('start_time', now)
        .order('start_time', { ascending: true }),
      supabase
        .from('matches')
        .select('*, team_a:teams!team_a_id(id,name,name_he,crest_url), team_b:teams!team_b_id(id,name,name_he,crest_url)')
        .lt('start_time', now)
        .order('start_time', { ascending: false })
        .limit(5),
      supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user!.id),
    ])

    setUpcomingMatches(upcomingRes.data ?? [])
    setRecentMatches(recentRes.data ?? [])

    const predMap = new Map<string, Prediction>()
    for (const p of predsRes.data ?? []) predMap.set(p.match_id, p)
    setMyPredictions(predMap)
    setLoading(false)
  }

  // Split: bettable (has teams) vs locked (knockout TBD)
  const { bettable, locked, byDate } = useMemo(() => {
    const bet: Match[] = []
    const lck: Match[] = []
    for (const m of upcomingMatches) {
      if (m.team_a_id && m.team_b_id) bet.push(m)
      else lck.push(m)
    }

    // Group bettable by date
    const grouped = new Map<string, Match[]>()
    for (const m of bet) {
      const k = dateKey(m.start_time)
      if (!grouped.has(k)) grouped.set(k, [])
      grouped.get(k)!.push(m)
    }
    return { bettable: bet, locked: lck, byDate: grouped }
  }, [upcomingMatches])

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><Spinner size="lg" /></div>
  }

  const totalPredicted = myPredictions.size
  const nextMatch = bettable[0] ?? upcomingMatches[0]

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-24 space-y-5">

      <Hero image="stadium" overlay="green" height="lg">
        <div className="flex items-center justify-between">
          <WorldCupLogo size="md" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-200/90 uppercase bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm">
            ליגת החברים
          </span>
        </div>

        <div className="flex items-end justify-between mt-auto">
          <div>
            <p className="text-emerald-200/90 text-sm font-medium">שלום 👋</p>
            <h1 className="text-3xl font-black mt-0.5 leading-tight drop-shadow-lg">{profile?.username}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <StatBadge label="ניקוד" value={profile?.total_points ?? 0} />
          <StatBadge label="ניחושים" value={totalPredicted} />
          <StatBadge label="זמינים" value={bettable.length} />
        </div>
      </Hero>

      {/* Next match alert */}
      {nextMatch && nextMatch.team_a_id && (
        <div className="relative bg-gradient-to-l from-amber-500/20 via-orange-500/15 to-transparent border border-amber-500/40 rounded-2xl p-3 flex items-center gap-3 animate-fade-in-up overflow-hidden" style={{ animationDelay: '0.1s' }}>
          <div className="absolute inset-0 animate-shimmer pointer-events-none" />
          <span className="text-2xl animate-pulse relative">⏰</span>
          <div className="flex-1 min-w-0 relative">
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">המשחק הבא</p>
            <p className="text-sm font-bold text-amber-100 truncate">
              {nextMatch.team_a?.name_he ?? nextMatch.team_a?.name ?? '?'} נגד {nextMatch.team_b?.name_he ?? nextMatch.team_b?.name ?? '?'}
            </p>
          </div>
          {!myPredictions.has(nextMatch.id) && (
            <span className="text-xs bg-amber-500 text-amber-950 font-black px-2.5 py-1 rounded-full shrink-0 animate-pulse relative shadow-lg">
              חסר ניחוש!
            </span>
          )}
        </div>
      )}

      {/* Bettable matches grouped by date */}
      <section className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-4 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            פתוחים לניחוש
          </h2>
          <span className="text-xs text-gray-500 font-medium">{bettable.length} משחקים</span>
        </div>

        {bettable.length === 0 ? (
          <div className="glass-card rounded-2xl py-12 flex flex-col items-center gap-3">
            <span className="text-5xl animate-float">📅</span>
            <p className="text-gray-300 text-sm">{he.noUpcoming}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {[...byDate.entries()].map(([key, matches], gi) => (
              <div key={key} className="space-y-2 animate-fade-in-up" style={{ animationDelay: `${0.25 + gi * 0.03}s` }}>
                <div className="flex items-center gap-2 px-1">
                  <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/30 to-transparent" />
                  <h3 className="text-xs font-bold text-emerald-300/80 uppercase tracking-wider">
                    {formatDateHeader(matches[0].start_time)}
                  </h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent" />
                </div>
                {matches.map(m => (
                  <MatchCard key={m.id} match={m} myPrediction={myPredictions.get(m.id)} />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Locked knockout matches */}
      {locked.length > 0 && (
        <section className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={() => setShowLocked(v => !v)}
            className="w-full glass-card rounded-2xl px-4 py-3 flex items-center justify-between hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-200">משחקי נוקאאוט</p>
                <p className="text-[10px] text-gray-500">ייפתחו אחרי שלב הבתים</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
                {locked.length}
              </span>
              <span className={`text-gray-400 transition-transform ${showLocked ? 'rotate-180' : ''}`}>▼</span>
            </div>
          </button>

          {showLocked && (
            <div className="mt-3 space-y-2 animate-fade-in-up">
              {locked.map(m => (
                <div key={m.id} className="glass-card rounded-xl px-4 py-2.5 flex items-center justify-between opacity-60">
                  <span className="text-xs font-bold text-gray-400 uppercase">
                    {he[m.stage as keyof typeof he] ?? m.stage}
                  </span>
                  <span className="text-xs text-gray-500">ייקבע ←</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {recentMatches.length > 0 && (
        <section className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3 px-1">
            <span className="w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            משחקים אחרונים
          </h2>
          <div className="space-y-3">
            {recentMatches.map(m => (
              <MatchCard key={m.id} match={m} myPrediction={myPredictions.get(m.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 bg-black/35 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/15 shadow-lg">
      <p className="text-[9px] text-emerald-200/90 uppercase tracking-wider font-bold">{label}</p>
      <p className="text-2xl font-black leading-none mt-0.5 drop-shadow">{value}</p>
    </div>
  )
}
