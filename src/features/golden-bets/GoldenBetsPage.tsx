import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../../components/common/Spinner'
import Hero from '../../components/common/Hero'
import { isGoldenBetOpen, GOLDEN_BET_DEADLINE } from '../../utils/date'
import { he } from '../../i18n/he'
import type { Team, Player, GoldenBet } from '../../types'

export default function GoldenBetsPage() {
  const { user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [existing, setExisting] = useState<GoldenBet | null>(null)
  const [winnerId, setWinnerId] = useState('')
  const [scorerId, setScorerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const open = isGoldenBetOpen()

  useEffect(() => {
    Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('players').select('*, teams(id,name,name_he)').order('name'),
      user && supabase.from('golden_bets').select('*').eq('user_id', user.id).maybeSingle(),
    ]).then(([teamsRes, playersRes, betRes]) => {
      setTeams(teamsRes.data ?? [])
      setPlayers(playersRes.data ?? [])
      const bet = betRes && 'data' in betRes ? betRes.data : null
      if (bet) {
        setExisting(bet)
        setWinnerId(bet.winner_team_id ?? '')
        setScorerId(bet.top_scorer_id ?? '')
      }
      setLoading(false)
    })
  }, [user])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!winnerId || !scorerId) {
      setError('יש לבחור אלוף ומלך שערים')
      return
    }

    setSaving(true)
    setError('')

    const { error: err } = await supabase.from('golden_bets').upsert(
      { user_id: user.id, winner_team_id: winnerId, top_scorer_id: scorerId },
      { onConflict: 'user_id' }
    )

    setSaving(false)
    if (err) {
      setError(err.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><Spinner size="lg" /></div>
  }

  const playersByTeam = players.reduce<Record<string, { teamName: string; players: Player[] }>>(
    (acc, p) => {
      const tid = p.team_id ?? 'unknown'
      const teamName = (p.teams as Team | undefined)?.name_he ?? (p.teams as Team | undefined)?.name ?? 'אחר'
      if (!acc[tid]) acc[tid] = { teamName, players: [] }
      acc[tid].players.push(p)
      return acc
    },
    {}
  )

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-24 space-y-5">

      {/* Hero with ball background */}
      <Hero image="ball" overlay="amber" height="md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight drop-shadow-lg">{he.goldenBetsTitle}</h1>
            <p className="text-amber-100 text-sm mt-1 font-medium drop-shadow max-w-[200px]">{he.goldenBetsDesc}</p>
          </div>
          <span className="text-6xl animate-float drop-shadow-2xl">⭐</span>
        </div>
        <div className="mt-auto pt-3 border-t border-amber-300/30 flex items-center justify-between">
          <span className="text-[10px] text-amber-100/90 font-bold uppercase tracking-widest drop-shadow">פרס יחיד למחזיק האולימפיאדה</span>
          <span className="text-xs text-white font-black drop-shadow">+8 נק'</span>
        </div>
      </Hero>

      {!open ? (
        <div className="glass-card border border-amber-500/30 rounded-2xl p-8 text-center animate-fade-in-up">
          <div className="text-5xl mb-3">🔒</div>
          <p className="font-bold text-amber-300 text-lg">{he.goldenBetsClosed}</p>
          {existing && (
            <div className="mt-4 pt-4 border-t border-white/10 text-sm text-gray-300">
              <p>נקודות שהרווחת: <strong className="text-amber-300 text-lg">{existing.points_earned}</strong></p>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="glass-card rounded-2xl p-5 space-y-5">
            <div>
              <label className="block mb-2">
                <span className="text-sm font-bold text-gray-200 flex items-center gap-1.5">
                  <span>🏆</span> {he.tournamentWinner}
                </span>
                <span className="text-xs text-emerald-400 font-bold mt-0.5 block">+8 נק' לניחוש מדויק</span>
              </label>
              <select
                value={winnerId}
                onChange={e => setWinnerId(e.target.value)}
                required
                disabled={!open}
                className="w-full bg-slate-800/60 border border-white/10 text-white rounded-xl px-3 py-3 text-right focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              >
                <option value="">— בחר קבוצה —</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name_he ?? t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2">
                <span className="text-sm font-bold text-gray-200 flex items-center gap-1.5">
                  <span>👟</span> {he.topScorer}
                </span>
                <span className="text-xs text-emerald-400 font-bold mt-0.5 block">+8 נק' לניחוש מדויק</span>
              </label>
              <select
                value={scorerId}
                onChange={e => setScorerId(e.target.value)}
                required
                disabled={!open}
                className="w-full bg-slate-800/60 border border-white/10 text-white rounded-xl px-3 py-3 text-right focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              >
                <option value="">— בחר שחקן —</option>
                {Object.entries(playersByTeam).map(([tid, { teamName, players: ps }]) => (
                  <optgroup key={tid} label={teamName}>
                    {ps.map(p => (
                      <option key={p.id} value={p.id}>{p.name_he ?? p.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-2.5 text-sm text-center font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !open}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black py-3.5 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-amber-500/30 active:scale-[0.98]"
          >
            {saved ? '✓ נשמר!' : saving ? he.loading : he.saveGoldenBets}
          </button>

          <p className="text-xs text-gray-500 text-center">
            ניתן לשנות עד{' '}
            {GOLDEN_BET_DEADLINE.toLocaleString('he-IL', {
              day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
              timeZone: 'Asia/Jerusalem',
            })}
          </p>
        </form>
      )}
    </div>
  )
}
