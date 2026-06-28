import { Link } from 'react-router-dom'
import { useLeaderboard } from '../../hooks/useLeaderboard'
import { useRankTrajectory } from '../../hooks/useRankTrajectory'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../../components/common/Spinner'
import Hero from '../../components/common/Hero'
import MatchSection from '../../components/common/MatchSection'
import RankTrajectoryChart from './RankTrajectoryChart'
import { displayName } from '../../types'

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const { profiles, stats, loading } = useLeaderboard()
  const { user } = useAuth()
  const trajectory = useRankTrajectory(user?.id)

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><Spinner size="lg" /></div>
  }

  const myRank = profiles.findIndex(p => p.id === user?.id) + 1

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-24 space-y-5">

      {/* Hero */}
      <Hero image="trophy" overlay="amber" height="md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight drop-shadow-lg">טבלת הליגה</h1>
            <p className="text-amber-100 text-sm mt-1 font-medium drop-shadow">{profiles.length} שחקנים בקרב</p>
          </div>
          <span className="text-6xl animate-float drop-shadow-2xl">🏆</span>
        </div>

        {myRank > 0 && (
          <div className="mt-auto pt-3 border-t border-amber-300/40 flex items-center justify-between">
            <span className="text-amber-100 text-sm font-medium drop-shadow">המיקום שלך</span>
            <span className="text-2xl font-black text-white drop-shadow-lg">#{myRank}</span>
          </div>
        )}
      </Hero>

      {/* Top 3 podium */}
      {profiles.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          {[profiles[1], profiles[0], profiles[2]].map((profile, podiumIdx) => {
            const actualIdx = podiumIdx === 0 ? 1 : podiumIdx === 1 ? 0 : 2
            const isMe = profile?.id === user?.id
            const heights = ['h-28', 'h-36', 'h-24']
            const gradients = [
              'bg-gradient-to-b from-slate-400 to-slate-700',
              'bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 animate-pulse-glow',
              'bg-gradient-to-b from-orange-500 to-orange-800',
            ]
            return (
              <div key={profile?.id} className="flex flex-col items-center gap-1">
                <span className="text-3xl drop-shadow-lg">{MEDALS[actualIdx]}</span>
                <div className={`w-full ${heights[podiumIdx]} ${gradients[podiumIdx]} rounded-2xl flex flex-col items-center justify-center p-2 shadow-xl ${
                  isMe ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : ''
                }`}>
                  <span className="text-3xl mb-1 drop-shadow">{profile?.avatar || '⚽'}</span>
                  <p className="text-[10px] font-black text-white text-center leading-tight drop-shadow line-clamp-1">
                    {displayName(profile)}
                  </p>
                  <p className="text-xl font-black text-white drop-shadow leading-none mt-1">
                    {profile?.total_points ?? 0}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.3s' }}>

        {/* Sticky header row */}
        <div className="grid grid-cols-[28px_1fr_56px_36px_36px_36px] items-end gap-2 px-3 py-2 bg-slate-800/60 border-b border-white/10 text-[10px] font-black uppercase tracking-wider">
          <span className="text-gray-500 text-center">#</span>
          <span className="text-gray-400">שחקן</span>
          <span className="text-amber-400 text-center">נק׳</span>
          <span className="text-emerald-400 text-center" title="מדויק">🎯</span>
          <span className="text-blue-400 text-center" title="כיוון">↗</span>
          <span className="text-red-400 text-center" title="טעות">✗</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/5">
          {profiles.map((profile, i) => {
            const isMe = profile.id === user?.id
            const rank = i + 1
            const s = stats.get(profile.id)
            const exact = s?.exact_count ?? 0
            const direction = s?.direction_count ?? 0
            const miss = s?.miss_count ?? 0

            return (
              <div
                key={profile.id}
                className={`grid grid-cols-[28px_1fr_56px_36px_36px_36px] items-center gap-2 px-3 py-3 transition ${
                  isMe ? 'bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/30' : 'hover:bg-white/5'
                }`}
              >
                {/* Rank */}
                <div className="text-center">
                  {rank <= 3 ? (
                    <span className="text-xl">{MEDALS[i]}</span>
                  ) : (
                    <span className="text-xs font-black text-gray-500">{rank}</span>
                  )}
                </div>

                {/* Player */}
                <div className="flex items-center gap-2 min-w-0">
                  {/* Avatar is the tappable entry point to the player's profile */}
                  <Link
                    to={`/players/${profile.id}`}
                    aria-label={`הצג פרופיל של ${displayName(profile)}`}
                    className={`text-xl w-9 h-9 rounded-xl flex items-center justify-center shadow shrink-0 transition active:scale-95 hover:brightness-110 cursor-pointer ${
                      isMe
                        ? 'bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 ring-1 ring-emerald-300/50'
                        : 'bg-slate-700/60 border border-white/5 hover:ring-1 hover:ring-amber-400/50'
                    }`}
                  >
                    {profile.avatar || '⚽'}
                  </Link>
                  <div className="min-w-0">
                    <p className={`font-bold text-sm truncate ${isMe ? 'text-emerald-300' : 'text-gray-100'}`}>
                      {displayName(profile)}
                      {isMe && <span className="text-[9px] text-emerald-400 mr-1 font-bold">• אני</span>}
                    </p>
                    {profile.nickname && (
                      <p className="text-[10px] text-gray-500 font-medium leading-none mt-0.5 truncate">@{profile.username}</p>
                    )}
                  </div>
                </div>

                {/* Points (most prominent) */}
                <div className="text-center">
                  <span className={`text-2xl font-black tabular-nums leading-none drop-shadow ${
                    rank <= 3 ? 'text-amber-400' : 'text-white'
                  }`}>
                    {profile.total_points}
                  </span>
                </div>

                {/* Exact */}
                <StatCell value={exact} color="emerald" />
                {/* Direction */}
                <StatCell value={direction} color="blue" />
                {/* Miss */}
                <StatCell value={miss} color="red" />
              </div>
            )
          })}

          {profiles.length === 0 && (
            <div className="py-12 flex flex-col items-center gap-2">
              <span className="text-5xl animate-float">🏁</span>
              <p className="text-gray-400 text-sm">אין שחקנים עדיין</p>
            </div>
          )}
        </div>
      </div>

      {/* Rank trajectory */}
      <MatchSection
        title="מגמת דירוג"
        icon="📈"
        subtitle={trajectory.labels.length > 0 ? `${trajectory.labels.length} משחקים שהסתיימו` : undefined}
        accent="cyan"
        defaultOpen
        delay="0.35s"
      >
        <div className="glass-card rounded-2xl p-4">
          {trajectory.loading ? (
            <div className="flex justify-center py-6"><Spinner size="md" /></div>
          ) : trajectory.error ? (
            <p className="text-xs text-red-400 text-center py-4">שגיאה בטעינת הגרף: {trajectory.error}</p>
          ) : trajectory.players.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">אין עדיין מספיק משחקים שהסתיימו להצגת מגמה</p>
          ) : (
            <RankTrajectoryChart
              labels={trajectory.labels}
              players={trajectory.players}
              maxRank={trajectory.maxRank}
            />
          )}
        </div>
      </MatchSection>

      {/* Legend */}
      <div className="glass-card rounded-xl px-3 py-2.5 flex items-center justify-around text-[10px] text-gray-400 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <LegendItem icon="🎯" label="ניחוש מדויק" color="text-emerald-400" />
        <LegendItem icon="↗" label="כיוון נכון" color="text-blue-400" />
        <LegendItem icon="✗" label="טעות" color="text-red-400" />
      </div>

      <div className="glass-card rounded-xl px-4 py-3 space-y-1.5 text-center animate-fade-in-up" style={{ animationDelay: '0.45s' }}>
        <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">חוקי שובר שוויון</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          בתיקו בנקודות, מי שיש לו <span className="text-emerald-400 font-bold">יותר ניחושים מדויקים 🎯</span> מקבל את המקום הגבוה יותר
        </p>
      </div>

      <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
        <span className="animate-pulse">⚡</span>
        מתעדכן בזמן אמת לאחר כל משחק
      </p>
    </div>
  )
}

type StatColor = 'emerald' | 'blue' | 'red'

function StatCell({ value, color }: { value: number; color: StatColor }) {
  const palette: Record<StatColor, string> = {
    emerald: value > 0 ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' : 'text-gray-600 bg-white/5 border-white/5',
    blue:    value > 0 ? 'text-blue-300    bg-blue-500/15    border-blue-500/30'    : 'text-gray-600 bg-white/5 border-white/5',
    red:     value > 0 ? 'text-red-300     bg-red-500/15     border-red-500/30'     : 'text-gray-600 bg-white/5 border-white/5',
  }
  return (
    <div className={`text-center text-sm font-black tabular-nums rounded-lg border py-1.5 ${palette[color]}`}>
      {value}
    </div>
  )
}

function LegendItem({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`${color} text-sm font-black`}>{icon}</span>
      <span>{label}</span>
    </span>
  )
}
