import { useLeaderboard } from '../../hooks/useLeaderboard'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../../components/common/Spinner'
import Hero from '../../components/common/Hero'

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const { profiles, stats, loading } = useLeaderboard()
  const { user } = useAuth()

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
                    {profile?.username ?? '—'}
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

      {/* Legend */}
      <div className="glass-card rounded-xl px-3 py-2 flex items-center justify-around text-[10px] text-gray-400 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <span className="flex items-center gap-1">
          <span className="text-emerald-400">🎯</span> מדויק
        </span>
        <span className="flex items-center gap-1">
          <span className="text-blue-400">↗</span> כיוון
        </span>
        <span className="flex items-center gap-1">
          <span className="text-red-400">✗</span> טעות
        </span>
      </div>

      {/* Full list */}
      <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        {profiles.map((profile, i) => {
          const isMe = profile.id === user?.id
          const rank = i + 1
          const s = stats.get(profile.id)

          return (
            <div
              key={profile.id}
              className={`flex items-center gap-3 px-3 py-3 transition ${
                isMe ? 'bg-emerald-500/10' : 'hover:bg-white/5'
              }`}
            >
              {/* Rank */}
              <div className="w-7 text-center shrink-0">
                {rank <= 3 ? (
                  <span className="text-xl">{MEDALS[i]}</span>
                ) : (
                  <span className="text-xs font-black text-gray-500">#{rank}</span>
                )}
              </div>

              {/* Avatar + name + stats */}
              <div className="flex-1 flex items-center gap-2.5 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg shrink-0 ${
                  isMe
                    ? 'bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 ring-2 ring-emerald-300/50'
                    : 'bg-gradient-to-br from-slate-700 to-slate-800'
                }`}>
                  {profile.avatar || '⚽'}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`font-bold text-sm truncate ${isMe ? 'text-emerald-300' : 'text-gray-200'}`}>
                    {profile.username}
                    {isMe && <span className="text-[10px] text-emerald-400 mr-1.5 font-bold">• אני</span>}
                  </p>
                  {/* Breakdown */}
                  {s && s.scored_total > 0 ? (
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold">
                      <span className="text-emerald-400">🎯 {s.exact_count}</span>
                      <span className="text-blue-400">↗ {s.direction_count}</span>
                      <span className="text-red-400">✗ {s.miss_count}</span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-500 mt-0.5">אין משחקים שהסתיימו</p>
                  )}
                </div>
              </div>

              {/* Points */}
              <div className="text-left shrink-0">
                <span className={`text-xl font-black tabular-nums ${rank <= 3 ? 'text-amber-400' : 'text-gray-200'}`}>
                  {profile.total_points}
                </span>
                <p className="text-[9px] text-gray-500 -mt-1">נקודות</p>
              </div>
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

      <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
        <span className="animate-pulse">⚡</span>
        מתעדכן בזמן אמת לאחר כל משחק
      </p>
    </div>
  )
}
