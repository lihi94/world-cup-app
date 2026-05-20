import { Link } from 'react-router-dom'
import { formatKickoff, locksInLabel, isPredictionOpen } from '../../utils/date'
import { he } from '../../i18n/he'
import type { Match, Prediction } from '../../types'

interface MatchCardProps {
  match: Match
  myPrediction?: Prediction | null
}

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

export default function MatchCard({ match, myPrediction }: MatchCardProps) {
  const open = isPredictionOpen(match.start_time)
  const teamA = match.team_a
  const teamB = match.team_b
  const isFinished = match.status === 'FINISHED'
  const isLive = match.status === 'IN_PLAY'
  const isScheduled = match.status === 'SCHEDULED'
  const hasPrediction = !!myPrediction && myPrediction.pred_score_a !== null && myPrediction.pred_score_b !== null
  const needsPrediction = isScheduled && open && !hasPrediction

  // Predicted-state styling: subtle emerald tint + ring
  const cardClass = hasPrediction && isScheduled
    ? 'block rounded-2xl p-4 bg-gradient-to-br from-emerald-500/12 via-emerald-500/[0.06] to-transparent border border-emerald-500/40 shadow-lg shadow-emerald-500/10 hover:border-emerald-400/60 active:scale-[0.98] transition-all'
    : needsPrediction
      ? 'block rounded-2xl p-4 bg-gradient-to-br from-amber-500/10 via-amber-500/[0.04] to-transparent border border-amber-500/40 shadow-lg shadow-amber-500/10 hover:border-amber-400/60 active:scale-[0.98] transition-all'
      : 'block glass-card rounded-2xl p-4 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-[0.98] transition-all'

  return (
    <Link
      to={`/matches/${match.id}`}
      className={cardClass}
    >
      {/* Top row: stage + time/live */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${STAGE_COLORS[match.stage] ?? 'bg-gray-700/40 text-gray-300 border-gray-600'}`}>
          {STAGE_LABELS[match.stage]}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1.5 text-xs font-black text-red-400">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            LIVE
          </span>
        ) : (
          <span className="text-xs text-gray-400 font-medium">{formatKickoff(match.start_time)}</span>
        )}
      </div>

      {/* Teams row */}
      <div className="flex items-center justify-between gap-2">
        <TeamDisplay name={teamA?.name_he ?? teamA?.name ?? '?'} crest={teamA?.crest_url} />

        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          {isFinished ? (
            <div className="text-2xl font-black text-white tracking-tight">
              {match.score_a} <span className="text-gray-600">–</span> {match.score_b}
            </div>
          ) : isLive ? (
            <div className="text-xl font-black text-red-400">
              {match.score_a ?? 0} – {match.score_b ?? 0}
            </div>
          ) : (
            <div className="text-sm font-black text-gray-500">VS</div>
          )}
        </div>

        <TeamDisplay name={teamB?.name_he ?? teamB?.name ?? '?'} crest={teamB?.crest_url} />
      </div>

      {/* AI odds bar (only when match is scheduled and odds exist) */}
      {isScheduled && match.odds_a !== null && match.odds_b !== null && match.odds_draw !== null && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-bold mb-1 px-0.5">
            <span className="flex items-center gap-1 text-emerald-300">
              <span className="text-sm">🇦</span>
              {match.odds_a}%
            </span>
            <span className="text-gray-400 flex items-center gap-1">
              <span className="text-xs">✨</span>
              סיכויי A.I
            </span>
            <span className="flex items-center gap-1 text-blue-300">
              {match.odds_b}%
              <span className="text-sm">🇧</span>
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-slate-700/40">
            <div className="bg-emerald-500/80 transition-all" style={{ width: `${match.odds_a}%` }} />
            <div className="bg-amber-500/70 transition-all" style={{ width: `${match.odds_draw}%` }} />
            <div className="bg-blue-500/80 transition-all" style={{ width: `${match.odds_b}%` }} />
          </div>
          <div className="flex items-center justify-center gap-0.5 mt-0.5 text-[9px] text-amber-300/80 font-medium">
            <span>תיקו {match.odds_draw}%</span>
          </div>
        </div>
      )}

      {/* Bottom: prediction status */}
      <div className="mt-3 pt-3 border-t border-white/5">
        {myPrediction ? (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-black flex items-center gap-1">
              <span className="text-sm">✓</span> ניחשת
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-emerald-200 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg tabular-nums">
                {myPrediction.pred_score_a} – {myPrediction.pred_score_b}
              </span>
              {isFinished && (
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  myPrediction.points_earned > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-gray-700/40 text-gray-400'
                }`}>
                  +{myPrediction.points_earned} נק'
                </span>
              )}
            </div>
          </div>
        ) : match.status === 'SCHEDULED' ? (
          <div className="flex items-center justify-between">
            {open ? (
              <>
                <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                  <span className="animate-pulse">⏳</span>
                  {locksInLabel(match.start_time)}
                </span>
                <span className="text-xs font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  נחש עכשיו ←
                </span>
              </>
            ) : (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <span>🔒</span> {he.locked}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </Link>
  )
}

function TeamDisplay({
  name, crest,
}: {
  name: string; crest?: string | null
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-24">
      {crest ? (
        <img src={crest} alt={name} className="w-11 h-11 object-contain drop-shadow-lg" />
      ) : (
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center text-xl shadow-inner">
          ⚽
        </div>
      )}
      <span className="text-xs text-gray-200 font-bold text-center leading-tight line-clamp-2">{name}</span>
    </div>
  )
}
