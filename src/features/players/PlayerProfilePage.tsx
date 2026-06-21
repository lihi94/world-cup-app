import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useLeaderboard } from '../../hooks/useLeaderboard'
import Spinner from '../../components/common/Spinner'
import { formatKickoff } from '../../utils/date'
import { predOutcome, OUTCOME_STYLE, STAGE_LABELS } from '../../utils/outcome'
import { displayName, type Prediction, type Team, type Player, type GoldenBet } from '../../types'

/** A prediction joined with its match (+ both teams) for the history list. */
type PredictionWithMatch = Prediction & {
  match: {
    id: string
    start_time: string
    stage: string
    status: string
    score_a: number | null
    score_b: number | null
    team_a: Pick<Team, 'name' | 'name_he' | 'crest_url'> | null
    team_b: Pick<Team, 'name' | 'name_he' | 'crest_url'> | null
  } | null
}

type GoldenBetWithPicks = GoldenBet & {
  winner_team: Pick<Team, 'name' | 'name_he' | 'crest_url'> | null
  top_scorer: (Pick<Player, 'name' | 'name_he'> & { teams: Pick<Team, 'name' | 'name_he'> | null }) | null
}

export default function PlayerProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user } = useAuth()
  const { profiles, stats, loading: lbLoading } = useLeaderboard()

  const [preds, setPreds] = useState<PredictionWithMatch[]>([])
  const [golden, setGolden] = useState<GoldenBetWithPicks | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const [predsRes, goldenRes] = await Promise.all([
        supabase
          .from('predictions')
          .select(`
            *,
            match:matches!inner (
              id, start_time, stage, status, score_a, score_b,
              team_a:teams!team_a_id (name, name_he, crest_url),
              team_b:teams!team_b_id (name, name_he, crest_url)
            )
          `)
          .eq('user_id', userId),
        supabase
          .from('golden_bets')
          .select(`
            *,
            winner_team:teams!winner_team_id (name, name_he, crest_url),
            top_scorer:players!top_scorer_id (name, name_he, teams (name, name_he))
          `)
          .eq('user_id', userId)
          .maybeSingle(),
      ])

      if (cancelled) return
      setPreds((predsRes.data ?? []) as unknown as PredictionWithMatch[])
      setGolden((goldenRes.data as unknown as GoldenBetWithPicks) ?? null)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  const profile = profiles.find(p => p.id === userId)
  const rank = profiles.findIndex(p => p.id === userId) + 1
  const s = userId ? stats.get(userId) : undefined
  const isMe = userId === user?.id

  // Only show predictions for matches that have already kicked off — matches
  // RLS exposure and keeps this a "history", not a leak of future picks.
  // Friendlies are excluded too: they don't count for points, same as the feed.
  const history = useMemo(() => {
    const now = Date.now()
    return preds
      .filter(p => p.match && p.match.stage !== 'FRIENDLY' && new Date(p.match.start_time).getTime() <= now)
      .sort((a, b) =>
        new Date(b.match!.start_time).getTime() - new Date(a.match!.start_time).getTime()
      )
  }, [preds])

  if (lbLoading || loading) {
    return <div className="flex justify-center items-center min-h-screen"><Spinner size="lg" /></div>
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center space-y-4">
        <span className="text-5xl">🤷</span>
        <p className="text-gray-300">השחקן לא נמצא</p>
        <Link to="/leaderboard" className="text-emerald-400 font-bold text-sm">← חזרה לטבלה</Link>
      </div>
    )
  }

  const isBot = profile.is_bot
  const exact = s?.exact_count ?? 0
  const direction = s?.direction_count ?? 0
  const miss = s?.miss_count ?? 0

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-24 space-y-5">

      <Link to="/leaderboard" className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-200 transition">
        ← טבלת הליגה
      </Link>

      {/* Header */}
      <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up">
        <div className="bg-gradient-to-l from-amber-600/80 to-orange-600/80 p-5">
          <div className="flex items-center gap-3">
            <span className="w-16 h-16 rounded-2xl bg-slate-900/40 flex items-center justify-center text-4xl shrink-0 shadow-inner">
              {profile.avatar || (isBot ? '🤖' : '⚽')}
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-white drop-shadow truncate">
                {displayName(profile)}
                {isMe && <span className="text-xs text-amber-100 mr-2 font-bold">• אני</span>}
                {isBot && <span className="text-xs text-purple-200 mr-2 font-bold">• בוט</span>}
              </h1>
              <p className="text-amber-100 text-xs font-medium drop-shadow">@{profile.username}</p>
            </div>
            {rank > 0 && (
              <div className="text-center shrink-0">
                <p className="text-[10px] text-amber-100 font-bold">מקום</p>
                <p className="text-2xl font-black text-white drop-shadow">#{rank}</p>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-amber-200/30 flex items-center justify-between">
            <span className="text-amber-100 text-xs font-bold">סך נקודות</span>
            <span className="text-2xl font-black text-white drop-shadow tabular-nums">{profile.total_points}</span>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-2 p-3">
          <StatBox value={exact} label="🎯 מדויק" color="emerald" />
          <StatBox value={direction} label="↗ כיוון" color="blue" />
          <StatBox value={miss} label="✗ טעות" color="red" />
        </div>
      </div>

      {/* Golden bets */}
      {golden && (golden.winner_team || golden.top_scorer) && (
        <div className="glass-card rounded-2xl p-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
              <span>⭐</span> ניחושי הזהב
            </h2>
            {golden.points_earned > 0 && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 tabular-nums">
                +{golden.points_earned} נק'
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/20 border border-white/5 rounded-xl p-2.5 flex items-center gap-2 min-w-0">
              {golden.winner_team?.crest_url ? (
                <img src={golden.winner_team.crest_url} alt="" className="w-7 h-7 object-contain drop-shadow shrink-0" />
              ) : (
                <span className="text-xl shrink-0">🏆</span>
              )}
              <div className="min-w-0">
                <p className="text-[9px] text-amber-400 uppercase tracking-wider font-bold">אלוף</p>
                <p className="text-xs font-bold text-gray-100 truncate">
                  {golden.winner_team?.name_he ?? golden.winner_team?.name ?? '—'}
                </p>
              </div>
            </div>
            <div className="bg-black/20 border border-white/5 rounded-xl p-2.5 flex items-center gap-2 min-w-0">
              <span className="text-xl shrink-0">👟</span>
              <div className="min-w-0">
                <p className="text-[9px] text-amber-400 uppercase tracking-wider font-bold">מלך שערים</p>
                <p className="text-xs font-bold text-gray-100 truncate">
                  {golden.top_scorer?.name_he ?? golden.top_scorer?.name ?? '—'}
                </p>
                {(golden.top_scorer?.teams?.name_he ?? golden.top_scorer?.teams?.name) && (
                  <p className="text-[9px] text-gray-500 truncate">
                    {golden.top_scorer?.teams?.name_he ?? golden.top_scorer?.teams?.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prediction history */}
      <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 px-1">
          <span className="w-1 h-4 bg-emerald-500 rounded-full" />
          היסטוריית ניחושים
          <span className="text-xs text-gray-500 font-medium normal-case mr-auto">{history.length} משחקים</span>
        </h2>

        {history.length === 0 ? (
          <div className="glass-card rounded-2xl py-10 text-center">
            <span className="text-4xl">📭</span>
            <p className="text-sm text-gray-400 mt-2">עוד אין ניחושים גלויים</p>
          </div>
        ) : (
          history.map(p => <HistoryRow key={p.id} pred={p} />)
        )}
      </div>
    </div>
  )
}

type StatColor = 'emerald' | 'blue' | 'red'

function StatBox({ value, label, color }: { value: number; label: string; color: StatColor }) {
  const palette: Record<StatColor, string> = {
    emerald: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
    blue:    'text-blue-300 bg-blue-500/15 border-blue-500/30',
    red:     'text-red-300 bg-red-500/15 border-red-500/30',
  }
  return (
    <div className={`rounded-xl border py-2 text-center ${palette[color]}`}>
      <div className="text-lg font-black tabular-nums leading-none">{value}</div>
      <div className="text-[10px] text-gray-400 mt-1">{label}</div>
    </div>
  )
}

function HistoryRow({ pred }: { pred: PredictionWithMatch }) {
  const m = pred.match!
  const isFinished = m.status === 'FINISHED'
  const outcome = isFinished ? predOutcome(pred.pred_score_a, pred.pred_score_b, m.score_a, m.score_b) : null
  const oc = outcome ? OUTCOME_STYLE[outcome] : null
  const teamA = m.team_a?.name_he ?? m.team_a?.name ?? '?'
  const teamB = m.team_b?.name_he ?? m.team_b?.name ?? '?'

  return (
    <Link
      to={`/matches/${m.id}`}
      className="glass-card rounded-2xl px-3 py-2.5 flex items-center gap-2 hover:bg-white/5 transition"
    >
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-blue-500/20 text-blue-300 border-blue-500/30 shrink-0">
        {STAGE_LABELS[m.stage] ?? m.stage}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-100 truncate">
          {teamA} <span className="text-gray-500">×</span> {teamB}
        </p>
        <p className="text-[10px] text-gray-500 mt-0.5">
          {isFinished
            ? <>תוצאה <span className="text-gray-300 font-bold tabular-nums">{m.score_a}–{m.score_b}</span></>
            : m.status === 'IN_PLAY'
              ? <span className="text-yellow-300 font-bold">🔴 חי {m.score_a ?? 0}–{m.score_b ?? 0}</span>
              : formatKickoff(m.start_time)}
        </p>
      </div>

      {pred.is_auto && (
        <span
          className="text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded shrink-0"
          title="המשתמש לא ניחש — המערכת מילאה אוטומטית לפי ניחוש הבוט"
        >
          אוטומטי
        </span>
      )}

      <span className="text-xs font-black px-2 py-0.5 rounded border tabular-nums shrink-0 text-gray-100 bg-white/5 border-white/10">
        {pred.pred_score_a ?? '?'}–{pred.pred_score_b ?? '?'}
      </span>

      {oc && (
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border shrink-0 ${oc.badge}`}>
          {oc.icon}{pred.points_earned > 0 ? ` +${pred.points_earned}` : ` ${oc.label}`}
        </span>
      )}
    </Link>
  )
}
