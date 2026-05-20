import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import type { Match } from '../../types'

interface Stats {
  total: number
  home_win: number
  draw: number
  away_win: number
  top_scores: Array<{ a: number; b: number; cnt: number }> | null
}

interface PredictionStatsProps {
  match: Match
  /** re-fetch when user submits a new prediction */
  refreshKey?: number
}

export default function PredictionStats({ match, refreshKey }: PredictionStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [match.id, refreshKey])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_match_prediction_stats', {
      p_match_id: match.id,
    })
    if (!error && data) setStats(data as Stats)
    setLoading(false)
  }

  if (loading) return <div className="h-16 animate-pulse bg-white/5 rounded-xl" />
  if (!stats || stats.total === 0) return (
    <p className="text-xs text-gray-500 text-center py-2">
      עוד אין ניחושים — היה הראשון!
    </p>
  )

  const teamA = match.team_a
  const teamB = match.team_b
  const nameA = teamA?.name_he ?? teamA?.name ?? 'ביתית'
  const nameB = teamB?.name_he ?? teamB?.name ?? 'אורחת'

  const pctHome = Math.round((stats.home_win / stats.total) * 100)
  const pctDraw = Math.round((stats.draw / stats.total) * 100)
  const pctAway = Math.round((stats.away_win / stats.total) * 100)

  return (
    <div className="bg-white/5 border border-white/8 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-gray-400 text-center uppercase tracking-wider">
        📊 מה הקבוצה חושבת? ({stats.total} ניחושים)
      </p>

      {/* Outcome bars */}
      <div className="space-y-1.5">
        <OutcomeBar label={`🏠 ${nameA}`} pct={pctHome} count={stats.home_win} color="bg-emerald-500" />
        <OutcomeBar label="🤝 תיקו"       pct={pctDraw} count={stats.draw}     color="bg-amber-400" />
        <OutcomeBar label={`✈️ ${nameB}`}  pct={pctAway} count={stats.away_win} color="bg-blue-500" />
      </div>

      {/* Top exact scores */}
      {stats.top_scores && stats.top_scores.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1.5">תוצאות פופולריות:</p>
          <div className="flex flex-wrap gap-1.5">
            {stats.top_scores.map((s, i) => (
              <span
                key={i}
                className="text-xs bg-white/8 border border-white/10 rounded-lg px-2.5 py-1 font-bold text-gray-200"
              >
                {s.a}–{s.b}
                <span className="text-gray-500 font-normal mr-1">×{s.cnt}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function OutcomeBar({
  label, pct, color,
}: {
  label: string; pct: number; count: number; color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-28 shrink-0 text-right truncate">{label}</span>
      <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
        <div
          className={`${color} h-1.5 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-300 w-8 text-left">{pct}%</span>
    </div>
  )
}
