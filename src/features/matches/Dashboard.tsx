import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import MatchCard from './MatchCard'
import Spinner from '../../components/common/Spinner'
import Hero from '../../components/common/Hero'
import WorldCupLogo from '../../components/common/WorldCupLogo'
import ProfileEditor from '../../components/common/ProfileEditor'
import { displayName } from '../../types'
import { he } from '../../i18n/he'
import { dateKey, formatDateHeader } from '../../utils/date'
import type { Match, Prediction } from '../../types'

async function handleLogout() {
  if (confirm('להתנתק מהאפליקציה?')) {
    await supabase.auth.signOut()
  }
}

export default function Dashboard() {
  const { user, profile, reloadProfile } = useAuth()
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [myPredictions, setMyPredictions] = useState<Map<string, Prediction>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showLocked, setShowLocked] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  async function updateProfile(nickname: string, avatar: string) {
    if (!user) return { error: 'לא מחובר' }
    const { error } = await supabase
      .from('profiles')
      .update({ nickname: nickname.trim() || null, avatar })
      .eq('id', user.id)
    if (error) return { error: error.message }
    reloadProfile?.()
    return { error: null }
  }

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  async function load() {
    const now = new Date().toISOString()

    const [upcomingRes, predsRes] = await Promise.all([
      // Show only matches that are still SCHEDULED — once kickoff passes,
      // matches move out of the dashboard into the "ניחושים" tab.
      supabase
        .from('matches')
        .select('*, team_a:teams!team_a_id(id,name,name_he,crest_url,group_name), team_b:teams!team_b_id(id,name,name_he,crest_url,group_name)')
        .eq('status', 'SCHEDULED')
        .gte('start_time', now)
        .order('start_time', { ascending: true }),
      supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user!.id),
    ])

    setUpcomingMatches(upcomingRes.data ?? [])

    const predMap = new Map<string, Prediction>()
    for (const p of predsRes.data ?? []) predMap.set(p.match_id, p)
    setMyPredictions(predMap)
    setLoading(false)
  }

  // Split: bettable (has teams) vs locked (knockout TBD)
  const { bettable, locked, dateSections } = useMemo(() => {
    const bet: Match[] = []
    const lck: Match[] = []
    for (const m of upcomingMatches) {
      if (m.team_a_id && m.team_b_id) bet.push(m)
      else lck.push(m)
    }

    // Group bettable matches by date (chronological, IL timezone) — keeps the
    // dashboard focused on "what's today / what's tomorrow".
    const byDate = new Map<string, Match[]>()
    for (const m of bet) {
      const k = dateKey(m.start_time)
      const arr = byDate.get(k) ?? []
      arr.push(m)
      byDate.set(k, arr)
    }
    const datesArr = [...byDate.entries()].map(([k, ms]) => ({ key: k, matches: ms }))

    return { bettable: bet, locked: lck, dateSections: datesArr }
  }, [upcomingMatches])

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><Spinner size="lg" /></div>
  }

  const totalPredicted = myPredictions.size
  const nextMatch = bettable[0] ?? upcomingMatches[0]
  // Soonest upcoming match the user still hasn't predicted (so they don't miss it).
  const nextUnpredicted = bettable.find(m => !myPredictions.has(m.id)) ?? null

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-24 space-y-5">

      <Hero image="stadium" overlay="green" height="lg">
        <div className="flex items-center justify-between">
          <WorldCupLogo size="md" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-200/90 uppercase bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm">
              ליגת החברים
            </span>
            <button
              onClick={handleLogout}
              className="text-base bg-black/30 hover:bg-black/50 backdrop-blur-sm w-8 h-8 rounded-full flex items-center justify-center transition border border-white/10"
              aria-label="יציאה"
              title="יציאה"
            >
              🚪
            </button>
          </div>
        </div>

        <div className="flex items-end justify-between mt-auto gap-3">
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-3 min-w-0 text-right group"
            aria-label="ערוך פרופיל"
          >
            <span className="text-4xl bg-black/30 group-hover:bg-black/50 backdrop-blur-sm w-14 h-14 rounded-2xl flex items-center justify-center transition border border-white/15 shrink-0 group-active:scale-95">
              {profile?.avatar || '⚽'}
            </span>
            <div className="min-w-0">
              <p className="text-emerald-200/90 text-sm font-medium">שלום 👋</p>
              <h1 className="text-2xl font-black mt-0.5 leading-tight drop-shadow-lg truncate flex items-center gap-1">
                {displayName(profile)}
                <span className="text-xs text-emerald-200/60 opacity-0 group-hover:opacity-100 transition">✏️</span>
              </h1>
              {profile?.nickname && (
                <p className="text-[11px] text-emerald-200/70 font-medium leading-none mt-0.5">@{profile.username}</p>
              )}
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <StatBadge label="ניקוד" value={profile?.total_points ?? 0} />
          <StatBadge label="ניחושים" value={totalPredicted} />
          <StatBadge label="זמינים" value={bettable.length} />
        </div>
      </Hero>

      {/* Next match (right) + soonest unpredicted match (left) */}
      {nextMatch && nextMatch.team_a_id && (
        <div className="flex items-stretch gap-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <NextPane
            to={`/matches/${nextMatch.id}`}
            label="המשחק הבא"
            match={nextMatch}
            urgent={!myPredictions.has(nextMatch.id)}
          />
          {nextUnpredicted && nextUnpredicted.id !== nextMatch.id && (
            <NextPane
              to={`/matches/${nextUnpredicted.id}`}
              label="ממתין לניחוש"
              match={nextUnpredicted}
              urgent
            />
          )}
        </div>
      )}

      {/* Bettable matches grouped by date */}
      <section className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-4 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            פתוחים לניחוש
          </h2>
          <span className="text-xs text-gray-500 font-medium">{bettable.length} משחקים</span>
        </div>

        {bettable.length === 0 ? (
          <div className="glass-card rounded-2xl py-12 flex flex-col items-center gap-3">
            <span className="text-5xl animate-float">📅</span>
            <p className="text-gray-300 text-sm">{he.noUpcoming}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {dateSections.map((day, di) => (
              <div key={day.key} className="space-y-2 animate-fade-in-up" style={{ animationDelay: `${0.25 + di * 0.03}s` }}>
                <div className="flex items-center gap-2 px-1">
                  <span className="w-1 h-4 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    {formatDateHeader(day.matches[0].start_time)}
                  </h3>
                  <span className="text-[10px] text-gray-500 font-medium">· {day.matches.length}</span>
                </div>
                {day.matches.map(m => (
                  <MatchCard key={m.id} match={m} myPrediction={myPredictions.get(m.id)} />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Locked knockout matches */}
      {locked.length > 0 && (
        <section className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={() => setShowLocked(v => !v)}
            className="w-full glass-card rounded-2xl px-4 py-3 flex items-center justify-between hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-200">משחקי נוקאאוט</p>
                <p className="text-[10px] text-gray-500">ייפתחו אחרי שלב הבתים</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
                {locked.length}
              </span>
              <span className={`text-gray-400 transition-transform ${showLocked ? 'rotate-180' : ''}`}>▼</span>
            </div>
          </button>

          {showLocked && (
            <div className="mt-3 space-y-2 animate-fade-in-up">
              {locked.map(m => (
                <div key={m.id} className="glass-card rounded-xl px-4 py-2.5 flex items-center justify-between opacity-60">
                  <span className="text-xs font-bold text-gray-400 uppercase">
                    {he[m.stage as keyof typeof he] ?? m.stage}
                  </span>
                  <span className="text-xs text-gray-500">ייקבע ←</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Recently finished matches live on the "ניחושים" tab — keep the
          dashboard focused on what still needs action. */}

      {profileOpen && (
        <ProfileEditor
          currentName={profile?.nickname || ''}
          currentAvatar={profile?.avatar || '⚽'}
          onSave={updateProfile}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </div>
  )
}

function NextPane({ to, label, match, urgent }: { to: string; label: string; match: Match; urgent: boolean }) {
  const a = match.team_a?.name_he ?? match.team_a?.name ?? '?'
  const b = match.team_b?.name_he ?? match.team_b?.name ?? '?'
  return (
    <Link
      to={to}
      className={`flex-1 min-w-0 rounded-2xl p-3 border flex items-center gap-2.5 transition active:scale-[0.98] ${
        urgent
          ? 'bg-gradient-to-l from-amber-500/20 to-transparent border-amber-500/40 hover:border-amber-400/60'
          : 'bg-gradient-to-l from-emerald-500/12 to-transparent border-emerald-500/30 hover:border-emerald-400/50'
      }`}
    >
      <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
        urgent ? 'bg-amber-500/15 border-amber-500/25 text-amber-300' : 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300'
      }`}>
        {urgent ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4" /><path d="M12 17h.01" /><circle cx="12" cy="12" r="9" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
          </svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-[9px] font-bold uppercase tracking-wider ${urgent ? 'text-amber-400/90' : 'text-emerald-400/90'}`}>{label}</p>
        <p className="text-xs font-bold text-gray-100 truncate">{a} <span className="text-gray-500">×</span> {b}</p>
        <p className={`text-[10px] font-bold mt-0.5 ${urgent ? 'text-amber-300' : 'text-emerald-300/80'}`}>
          {urgent ? 'חסר ניחוש →' : '✓ ניחשת'}
        </p>
      </div>
    </Link>
  )
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 bg-black/35 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/15 shadow-lg">
      <p className="text-[9px] text-emerald-200/90 uppercase tracking-wider font-bold">{label}</p>
      <p className="text-2xl font-black leading-none mt-0.5 drop-shadow">{value}</p>
    </div>
  )
}
