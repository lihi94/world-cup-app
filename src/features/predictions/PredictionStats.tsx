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

  if (loading) return <div className="h-16 animate-pulse bg-gray-100 rounded-xl" />
  if (!stats || stats.total === 0) return (
    <p className="text-xs text-gray-400 text-center py-2">
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
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 text-center">
        📊 מה הקבוצה חושבת? ({stats.total} ניחושים)
      </p>

      {/* Outcome bars */}
      <div className="space-y-1.5">
        <OutcomeBar label={`🏠 ${nameA} מנצחת`} pct={pctHome} count={stats.home_win} color="bg-green-500" />
        <OutcomeBar label="🤝 תיקו"             pct={pctDraw} count={stats.draw}     color="bg-amber-400" />
        <OutcomeBar label={`✈️ ${nameB} מנצחת`} pct={pctAway} count={stats.away_win} color="bg-blue-500" />
      </div>

      {/* Top exact scores */}
      {stats.top_scores && stats.top_scores.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1.5">תוצאות פופולריות:</p>
          <div className="flex flex-wrap gap-1.5">
            {stats.top_scores.map((s, i) => (
              <span
                key={i}
                className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1 font-semibold text-gray-700"
              >
                {s.a}–{s.b}
                <span className="text-gray-400 font-normal mr-1">×{s.cnt}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function OutcomeBar({
  label, pct, count, color,
}: {
  label: string; pct: number; count: number; color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600 w-32 shrink-0 text-right">{label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`${color} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-700 w-8 text-left">{pct}%</span>
    </div>
  )
}
