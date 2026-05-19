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

      {/* Full list — each row is a "card" with prominent stats */}
      <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        {profiles.map((profile, i) => {
          const isMe = profile.id === user?.id
          const rank = i + 1
          const s = stats.get(profile.id)
          const totalScored = s?.scored_total ?? 0

          return (
            <div
              key={profile.id}
              className={`glass-card rounded-2xl px-3 py-3 transition ${
                isMe ? 'ring-2 ring-emerald-400/60 bg-emerald-500/5' : ''
              }`}
            >
              {/* Top row: rank, avatar, name, points */}
              <div className="flex items-center gap-3">
                <div className="w-9 text-center shrink-0">
                  {rank <= 3 ? (
                    <span className="text-2xl">{MEDALS[i]}</span>
                  ) : (
                    <span className="text-sm font-black text-gray-500">#{rank}</span>
                  )}
                </div>

                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg shrink-0 ${
                  isMe
                    ? 'bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 ring-2 ring-emerald-300/50'
                    : 'bg-gradient-to-br from-slate-700 to-slate-800 border border-white/5'
                }`}>
                  {profile.avatar || '⚽'}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`font-black text-base truncate ${isMe ? 'text-emerald-300' : 'text-gray-100'}`}>
                    {profile.username}
                    {isMe && <span className="text-[10px] text-emerald-400 mr-1.5 font-bold">• אני</span>}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {totalScored === 0 ? 'אין משחקים שהסתיימו' : `${totalScored} משחקים שהוערכו`}
                  </p>
                </div>

                <div className="text-left shrink-0">
                  <span className={`text-2xl font-black tabular-nums ${rank <= 3 ? 'text-amber-400' : 'text-white'}`}>
                    {profile.total_points}
                  </span>
                  <p className="text-[9px] text-gray-500 -mt-1 text-center">נקודות</p>
                </div>
              </div>

              {/* Bottom row: prominent stats pills */}
              {totalScored > 0 && s && (
                <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-3 gap-2">
                  <StatPill
                    icon="🎯"
                    label="מדויק"
                    value={s.exact_count}
                    color="emerald"
                    total={totalScored}
                  />
                  <StatPill
                    icon="↗"
                    label="כיוון"
                    value={s.direction_count}
                    color="blue"
                    total={totalScored}
                  />
                  <StatPill
                    icon="✗"
                    label="טעות"
                    value={s.miss_count}
                    color="red"
                    total={totalScored}
                  />
                </div>
              )}
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

type StatColor = 'emerald' | 'blue' | 'red'

function StatPill({ icon, label, value, color, total }: {
  icon: string
  label: string
  value: number
  color: StatColor
  total: number
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const palette: Record<StatColor, { bg: string; text: string; bar: string }> = {
    emerald: { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-300', bar: 'bg-emerald-500' },
    blue:    { bg: 'bg-blue-500/15 border-blue-500/30',       text: 'text-blue-300',    bar: 'bg-blue-500' },
    red:     { bg: 'bg-red-500/15 border-red-500/30',         text: 'text-red-300',     bar: 'bg-red-500' },
  }
  const c = palette[color]

  return (
    <div className={`${c.bg} border rounded-xl px-2 py-1.5 relative overflow-hidden`}>
      {/* Progress bar background */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-white/5`}>
        <div className={`h-full ${c.bar} opacity-60 transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-black ${c.text}`}>{icon}</span>
        <span className={`text-base font-black tabular-nums ${c.text}`}>{value}</span>
      </div>
      <p className={`text-[9px] font-bold ${c.text} opacity-80 mt-0.5`}>{label} · {pct}%</p>
    </div>
  )
}
