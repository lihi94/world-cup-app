import { Link, useLocation } from 'react-router-dom'
import { he } from '../../i18n/he'
import type { Profile } from '../../types'

interface NavBarProps {
  profile: Profile | null
}

export default function NavBar({ profile }: NavBarProps) {
  const { pathname } = useLocation()

  const navItems = [
    { path: '/', icon: '🏠', title: he.dashboard },
    { path: '/predictions', icon: '🔮', title: he.predictionsFeed },
    { path: '/leaderboard', icon: '🏆', title: he.leaderboard },
    { path: '/golden-bets', icon: '⭐', title: he.goldenBets },
    ...(profile?.is_admin ? [{ path: '/admin', icon: '⚙️', title: he.admin }] : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb">
      {/* Glow above bar */}
      <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="bg-slate-950/85 backdrop-blur-xl border-t border-white/10 shadow-2xl">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
          {navItems.map(item => {
            const active = pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center gap-0.5 px-3 py-1 transition-all"
              >
                {active && (
                  <>
                    <span className="absolute -top-px w-7 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                    <span className="absolute inset-0 -bottom-1 bg-emerald-500/10 rounded-2xl blur-md" />
                  </>
                )}
                <span className={`text-xl transition-all relative ${
                  active ? 'scale-110 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'scale-100 grayscale opacity-70'
                }`}>
                  {item.icon}
                </span>
                <span className={`text-[10px] font-bold transition-colors relative ${
                  active ? 'text-emerald-300' : 'text-gray-500'
                }`}>
                  {item.title}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
