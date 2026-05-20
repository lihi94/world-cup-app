import { displayName, type Match, type Prediction } from '../../types'

interface PredictionRevealProps {
  match: Match
  predictions: Prediction[]
  currentUserId: string
  /** Show only bot predictions (used pre-match). */
  botsOnly?: boolean
  /** Optional header override. */
  title?: string
}

type PredictionRow = Prediction & {
  profiles?: {
    username: string
    nickname: string | null
    total_points: number
    is_bot: boolean
    avatar?: string
  }
}

export default function PredictionReveal({
  match,
  predictions,
  currentUserId,
  botsOnly = false,
  title,
}: PredictionRevealProps) {
  const isFinished = match.status === 'FINISHED'

  const filtered = botsOnly
    ? predictions.filter(p => (p as PredictionRow).profiles?.is_bot)
    : predictions

  const sorted = [...filtered].sort((a, b) => {
    // Finished: by points; otherwise by name
    if (isFinished) return b.points_earned - a.points_earned
    const aBot = (a as PredictionRow).profiles?.is_bot ? 0 : 1
    const bBot = (b as PredictionRow).profiles?.is_bot ? 0 : 1
    return aBot - bBot
  })

  if (sorted.length === 0) {
    return (
      <div className="glass-card rounded-2xl py-8 flex flex-col items-center gap-2">
        <span className="text-3xl">🔮</span>
        <p className="text-gray-400 text-sm">{botsOnly ? 'אין ניחושי בוטים' : 'אין ניחושים עדיין'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {title && (
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3 px-1">
          <span className="w-1 h-4 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
          {title}
          <span className="text-xs text-gray-500 font-medium normal-case mr-auto">{sorted.length} ניחושים</span>
        </h3>
      )}

      <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5">
        {sorted.map((pred, i) => {
          const p = pred as PredictionRow
          const isMe = pred.user_id === currentUserId
          const isBot = p.profiles?.is_bot
          const nameToShow = displayName(p.profiles)
          const username = p.profiles?.username ?? '—'
          const rank = isFinished ? i + 1 : null

          return (
            <div
              key={pred.id}
              className={`flex items-center gap-3 px-4 py-3 transition ${
                isMe ? 'bg-emerald-500/10' : isBot ? 'bg-purple-500/[0.06]' : 'hover:bg-white/5'
              }`}
            >
              {/* Rank or avatar */}
              <div className="w-10 flex justify-center">
                {isFinished && rank ? (
                  rank === 1 ? <span className="text-xl">🥇</span>
                  : rank === 2 ? <span className="text-xl">🥈</span>
                  : rank === 3 ? <span className="text-xl">🥉</span>
                  : <span className="text-xs font-black text-gray-500">#{rank}</span>
                ) : (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shadow-md ${
                    isBot
                      ? 'bg-gradient-to-br from-purple-400 to-fuchsia-600 text-white ring-1 ring-purple-300/40'
                      : isMe
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white ring-2 ring-emerald-300/50'
                        : 'bg-gradient-to-br from-slate-600 to-slate-700 text-gray-200'
                  }`}>
                    {username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${
                  isMe ? 'text-emerald-300' : isBot ? 'text-purple-200' : 'text-gray-200'
                }`}>
                  {nameToShow}
                  {isMe && <span className="text-[10px] text-emerald-400 mr-1.5 font-bold">• אני</span>}
                </p>
                {p.profiles?.nickname && !isBot && (
                  <p className="text-[10px] text-gray-500 leading-none mt-0.5 truncate">@{username}</p>
                )}
              </div>

              {/* Score prediction */}
              <span className="text-sm font-black text-gray-100 bg-white/5 border border-white/10 px-3 py-1 rounded-lg tabular-nums shrink-0">
                {pred.pred_score_a ?? '?'} – {pred.pred_score_b ?? '?'}
              </span>

              {/* Points (when finished) */}
              {isFinished && (
                <span className={`text-xs font-black px-2 py-0.5 rounded-full shrink-0 ${
                  pred.points_earned > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-gray-700/40 text-gray-500'
                }`}>
                  +{pred.points_earned}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
