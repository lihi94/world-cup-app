import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { usePredictions } from '../../hooks/usePredictions'
import { useAuth } from '../../hooks/useAuth'
import PredictionForm from '../predictions/PredictionForm'
import PredictionReveal from '../predictions/PredictionReveal'
import Spinner from '../../components/common/Spinner'
import { formatKickoff } from '../../utils/date'
import { he } from '../../i18n/he'
import type { Match, Prediction } from '../../types'

const STAGE_LABELS: Record<string, string> = {
  GROUP: he.GROUP, R32: he.R32, R16: he.R16, QF: he.QF, SF: he.SF, THIRD: he.THIRD, FINAL: he.FINAL,
}

const STAGE_COLORS: Record<string, string> = {
  GROUP: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  R32:   'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  R16:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
  QF:    'bg-amber-500/20 text-amber-300 border-amber-500/30',
  SF:    'bg-orange-500/20 text-orange-300 border-orange-500/30',
  THIRD: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  FINAL: 'bg-red-500/20 text-red-300 border-red-500/30',
}

type PredictionRow = Prediction & {
  profiles?: { username: string; total_points: number; is_bot: boolean }
}

export default function MatchCenter() {
  const { matchId } = useParams<{ matchId: string }>()
  const { user } = useAuth()
  const [match, setMatch] = useState<Match | null>(null)
  const [loadingMatch, setLoadingMatch] = useState(true)

  const { myPrediction, allPredictions, loading: loadingPreds, upsertPrediction } =
    usePredictions(matchId ?? '', user?.id)

  useEffect(() => {
    if (!matchId) return
    supabase
      .from('matches')
      .select('*, team_a:teams!team_a_id(id,name,name_he,crest_url), team_b:teams!team_b_id(id,name,name_he,crest_url), winner:teams!winner_id(id,name,name_he)')
      .eq('id', matchId)
      .single()
      .then(({ data }) => {
        setMatch(data)
        setLoadingMatch(false)
      })
  }, [matchId])

  if (loadingMatch) {
    return <div className="flex justify-center items-center min-h-screen"><Spinner size="lg" /></div>
  }

  if (!match) {
    return <p className="text-center text-gray-400 mt-8">משחק לא נמצא</p>
  }

  const teamA = match.team_a
  const teamB = match.team_b
  const isFinished = match.status === 'FINISHED'
  const isLive = match.status === 'IN_PLAY'
  const isScheduled = match.status === 'SCHEDULED'

  // Split predictions into bots and humans
  const botPredictions = allPredictions.filter(p => (p as PredictionRow).profiles?.is_bot)
  const humanPredictions = allPredictions.filter(p => !(p as PredictionRow).profiles?.is_bot)

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-24 space-y-5">
      {/* Back link */}
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 font-medium">
        <span>→</span> חזרה
      </Link>

      {/* Match header — gradient with score */}
      <div className="relative bg-gradient-to-br from-emerald-700 via-green-800 to-slate-900 rounded-3xl p-6 text-white shadow-2xl shadow-emerald-900/30 overflow-hidden animate-fade-in-up ring-1 ring-white/10">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl animate-float-slow" />
        <div className="absolute -bottom-8 -left-8 w-44 h-44 bg-amber-400/10 rounded-full blur-2xl animate-float-slow" style={{ animationDelay: '1.5s' }} />

        <div className="relative flex flex-col items-center text-center">
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STAGE_COLORS[match.stage] ?? 'bg-gray-700/40 text-gray-300 border-gray-600'}`}>
            {STAGE_LABELS[match.stage]}
          </span>
          <p className="text-xs mt-2 text-emerald-200/80">{formatKickoff(match.start_time)}</p>

          <div className="flex items-center justify-between w-full mt-6 gap-2">
            <TeamBlock team={teamA} />

            <div className="text-center min-w-[80px]">
              {isFinished ? (
                <div className="text-5xl font-black tracking-tighter drop-shadow-lg">
                  {match.score_a} <span className="text-white/40">–</span> {match.score_b}
                </div>
              ) : isLive ? (
                <>
                  <div className="text-3xl font-black text-yellow-300 drop-shadow-lg">
                    {match.score_a ?? 0} – {match.score_b ?? 0}
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs font-black text-red-400">LIVE</span>
                  </div>
                </>
              ) : (
                <div className="text-2xl font-black text-white/40">{he.vs}</div>
              )}
            </div>

            <TeamBlock team={teamB} />
          </div>

          {isFinished && match.winner && match.stage !== 'GROUP' && (
            <p className="text-xs mt-4 text-emerald-200/80 flex items-center gap-1">
              <span>✈️</span>
              עולה לשלב הבא: <span className="font-bold text-white">{match.winner.name_he ?? match.winner.name}</span>
            </p>
          )}
        </div>
      </div>

      {/* User's prediction form / locked status */}
      {isScheduled && user && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <PredictionForm
            match={match}
            existing={myPrediction}
            userId={user.id}
            onSave={upsertPrediction}
          />
        </div>
      )}

      {loadingPreds && (
        <div className="flex justify-center py-8"><Spinner /></div>
      )}

      {/* Bot predictions — always visible */}
      {!loadingPreds && botPredictions.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <PredictionReveal
            match={match}
            predictions={botPredictions}
            currentUserId={user?.id ?? ''}
            title="🤖 ניחושי הבוטים"
          />
        </div>
      )}

      {/* Human predictions — only after match starts/ends */}
      {!loadingPreds && !isScheduled && humanPredictions.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
          <PredictionReveal
            match={match}
            predictions={humanPredictions}
            currentUserId={user?.id ?? ''}
            title={isFinished ? '🏆 דירוג הניחושים' : '👥 ניחושי הקבוצה'}
          />
        </div>
      )}

      {/* Pre-match message about hidden human predictions.
          Note: RLS only returns own prediction for SCHEDULED matches, so we
          can't know how many friends predicted — show a static hint instead. */}
      {isScheduled && (
        <div className="glass-card rounded-2xl p-4 flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <span className="text-2xl">🔒</span>
          <div className="flex-1 text-right">
            <p className="text-sm font-bold text-gray-200">ניחושי חברים מוסתרים</p>
            <p className="text-xs text-gray-400 mt-0.5">ייחשפו ברגע שהמשחק יתחיל</p>
          </div>
        </div>
      )}
    </div>
  )
}

function TeamBlock({ team }: { team?: import('../../types').Team }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      {team?.crest_url ? (
        <img src={team.crest_url} alt={team.name} className="w-16 h-16 object-contain drop-shadow-xl" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center text-2xl shadow-inner">
          ⚽
        </div>
      )}
      <span className="text-sm font-bold text-center leading-tight max-w-[100px] drop-shadow">
        {team?.name_he ?? team?.name ?? 'ייקבע'}
      </span>
    </div>
  )
}
