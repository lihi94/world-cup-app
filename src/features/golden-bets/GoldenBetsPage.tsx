import { useEffect, useState, useMemo, type FormEvent } from 'react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../../components/common/Spinner'
import Hero from '../../components/common/Hero'
import { isGoldenBetOpen, GOLDEN_BET_DEADLINE } from '../../utils/date'
import { he } from '../../i18n/he'
import { displayName, type Team, type Player, type GoldenBet, type Profile } from '../../types'

/** Golden bet joined with the picker's profile + the team/player rows for display. */
type GoldenBetWithProfile = GoldenBet & {
  profiles: Pick<Profile, 'id' | 'username' | 'nickname' | 'avatar' | 'is_bot' | 'total_points'> | null
  winner_team: Pick<Team, 'id' | 'name' | 'name_he' | 'crest_url'> | null
  top_scorer:  Pick<Player, 'id' | 'name' | 'name_he'> & { teams: Pick<Team, 'name_he' | 'name' | 'crest_url'> | null } | null
}

export default function GoldenBetsPage() {
  const { user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [existing, setExisting] = useState<GoldenBet | null>(null)
  const [allBets, setAllBets] = useState<GoldenBetWithProfile[]>([])
  const [winnerId, setWinnerId] = useState('')
  const [scorerId, setScorerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const open = isGoldenBetOpen()
  const locked = !open  // After 11/6 18:00 UTC, all bets become visible to everyone

  useEffect(() => {
    // After lock, RLS allows fetching everyone's golden bets — fetch joined
    // with the picker's profile + chosen team/player so we can show a reveal.
    const allBetsQuery = locked
      ? supabase
          .from('golden_bets')
          .select(`
            *,
            profiles!user_id (id, username, nickname, avatar, is_bot, total_points),
            winner_team:teams!winner_team_id (id, name, name_he, crest_url),
            top_scorer:players!top_scorer_id (id, name, name_he, teams (name, name_he, crest_url))
          `)
      : null

    Promise.all([
      // Order by bookmaker-consensus favorite rank (NULL ranks sort last, alpha as tiebreak)
      supabase.from('teams').select('*').order('favorite_rank', { ascending: true, nullsFirst: false }).order('name'),
      supabase.from('players').select('*, teams(id,name,name_he,favorite_rank)').order('favorite_rank', { ascending: true, nullsFirst: false }).order('name'),
      user && supabase.from('golden_bets').select('*').eq('user_id', user.id).maybeSingle(),
      allBetsQuery,
    ]).then(([teamsRes, playersRes, betRes, allBetsRes]) => {
      setTeams(teamsRes.data ?? [])
      setPlayers(playersRes.data ?? [])
      const bet = betRes && 'data' in betRes ? betRes.data : null
      if (bet) {
        setExisting(bet)
        setWinnerId(bet.winner_team_id ?? '')
        setScorerId(bet.top_scorer_id ?? '')
      }
      if (allBetsRes?.data) {
        setAllBets(allBetsRes.data as unknown as GoldenBetWithProfile[])
      }
      setLoading(false)
    })
  }, [user, locked])

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
          <span className="text-[10px] text-amber-100/90 font-bold uppercase tracking-widest drop-shadow">ניחוש אחד לפני הפתיחה — לא ניתן לשנות אחרי</span>
          <span className="text-xs text-white font-black drop-shadow">+8 נק'</span>
        </div>
      </Hero>

      {!open ? (
        <>
          {/* Locked-state summary card */}
          <div className="glass-card border border-amber-500/30 rounded-2xl p-8 text-center animate-fade-in-up">
            <div className="text-5xl mb-3">🔒</div>
            <p className="font-bold text-amber-300 text-lg">{he.goldenBetsClosed}</p>
            {existing && (
              <div className="mt-4 pt-4 border-t border-white/10 text-sm text-gray-300">
                <p>נקודות שהרווחת: <strong className="text-amber-300 text-lg">{existing.points_earned}</strong></p>
              </div>
            )}
          </div>

          {/* Reveal: everyone's golden bets */}
          <AllGoldenBetsReveal bets={allBets} myUserId={user?.id} />
        </>
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

/**
 * Shown to all users after 11/6 18:00 UTC — reveals everyone's winner +
 * top-scorer pick so the league knows what each member committed to.
 *
 * Layout: a grid of cards, each card = one user. Bot picks shown last with
 * a special accent. My own row is highlighted. Tournament-points shown next
 * to each row so it doubles as a mini-leaderboard for the golden bet category.
 */
function AllGoldenBetsReveal({
  bets, myUserId,
}: {
  bets: GoldenBetWithProfile[]; myUserId: string | undefined
}) {
  // Sort: humans first (by total_points DESC), then bots last
  const sorted = useMemo(() => {
    const arr = [...bets]
    arr.sort((a, b) => {
      const aBot = a.profiles?.is_bot ? 1 : 0
      const bBot = b.profiles?.is_bot ? 1 : 0
      if (aBot !== bBot) return aBot - bBot
      return (b.profiles?.total_points ?? 0) - (a.profiles?.total_points ?? 0)
    })
    return arr
  }, [bets])

  if (bets.length === 0) {
    return (
      <div className="glass-card rounded-2xl py-10 text-center animate-fade-in-up">
        <span className="text-4xl">📭</span>
        <p className="text-sm text-gray-400 mt-2">אף אחד עוד לא הגיש ניחושי זהב</p>
      </div>
    )
  }

  return (
    <section className="space-y-3 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1 h-4 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          ניחושי הזהב של כולם
        </h2>
        <span className="text-xs text-gray-500 font-medium">{bets.length} משתתפים</span>
      </div>

      <div className="space-y-2">
        {sorted.map((bet, i) => {
          const isMe = bet.user_id === myUserId
          const isBot = bet.profiles?.is_bot ?? false
          const name = displayName(bet.profiles)
          const scorerTeam = bet.top_scorer?.teams?.name_he ?? bet.top_scorer?.teams?.name

          return (
            <div
              key={bet.user_id}
              className={`glass-card rounded-2xl p-3.5 animate-fade-in-up transition ${
                isMe ? 'ring-2 ring-emerald-500/40 bg-emerald-500/[0.04]' : ''
              } ${isBot ? 'opacity-80' : ''}`}
              style={{ animationDelay: `${0.18 + i * 0.03}s` }}
            >
              {/* User row */}
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="text-2xl shrink-0">{bet.profiles?.avatar || (isBot ? '🤖' : '⚽')}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-black truncate ${isMe ? 'text-emerald-300' : 'text-gray-100'}`}>
                    {name}
                    {isMe && <span className="text-[10px] text-emerald-400 mr-1.5">• אני</span>}
                    {isBot && <span className="text-[10px] text-purple-400 mr-1.5">• בוט</span>}
                  </p>
                </div>
                {bet.points_earned > 0 && (
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 tabular-nums shrink-0">
                    +{bet.points_earned} נק'
                  </span>
                )}
              </div>

              {/* Picks */}
              <div className="grid grid-cols-2 gap-2">
                {/* Tournament winner */}
                <div className="bg-black/20 border border-white/5 rounded-xl p-2.5 flex items-center gap-2 min-w-0">
                  {bet.winner_team?.crest_url ? (
                    <img src={bet.winner_team.crest_url} alt="" className="w-7 h-7 object-contain drop-shadow shrink-0" />
                  ) : (
                    <span className="text-xl shrink-0">🏆</span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[9px] text-amber-400 uppercase tracking-wider font-bold">אלוף</p>
                    <p className="text-xs font-bold text-gray-100 truncate">
                      {bet.winner_team?.name_he ?? bet.winner_team?.name ?? '—'}
                    </p>
                  </div>
                </div>

                {/* Top scorer */}
                <div className="bg-black/20 border border-white/5 rounded-xl p-2.5 flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">👟</span>
                  <div className="min-w-0">
                    <p className="text-[9px] text-amber-400 uppercase tracking-wider font-bold">מלך שערים</p>
                    <p className="text-xs font-bold text-gray-100 truncate">
                      {bet.top_scorer?.name_he ?? bet.top_scorer?.name ?? '—'}
                    </p>
                    {scorerTeam && (
                      <p className="text-[9px] text-gray-500 truncate">{scorerTeam}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
