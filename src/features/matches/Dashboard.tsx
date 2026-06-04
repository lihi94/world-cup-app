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

      {/* System message: prediction reminder */}
      <PredictionReminder matches={bettable} predictedIds={myPredictions} />

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

const teamName = (t?: Match['team_a']) => t?.name_he ?? t?.name ?? '?'

/**
 * System-message banner: reminds the user of the soonest match they haven't
 * predicted, which day it's on, and any other unpredicted matches that same
 * day. Escalates (red) when that match is TODAY. Calm green when nothing's left.
 */
function PredictionReminder({ matches, predictedIds }: { matches: Match[]; predictedIds: Map<string, Prediction> }) {
  const unpredicted = matches.filter(m => !predictedIds.has(m.id))

  if (unpredicted.length === 0) {
    return (
      <div className="rounded-2xl p-3.5 bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <span className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">הכול מעודכן</p>
          <p className="text-sm font-bold text-emerald-100">כל הניחושים מולאו ✓</p>
        </div>
      </div>
    )
  }

  const soonest = unpredicted[0]
  const dayKey = dateKey(soonest.start_time)
  const isToday = dayKey === dateKey(new Date().toISOString())
  const sameDay = unpredicted.filter(m => m.id !== soonest.id && dateKey(m.start_time) === dayKey)

  return (
    <Link
      to={`/matches/${soonest.id}`}
      className={`block rounded-2xl p-3.5 border animate-fade-in-up transition active:scale-[0.99] ${
        isToday
          ? 'bg-gradient-to-l from-red-500/20 via-amber-500/10 to-transparent border-red-500/40 ring-1 ring-red-500/20'
          : 'bg-gradient-to-l from-amber-500/20 to-transparent border-amber-500/40'
      }`}
      style={{ animationDelay: '0.1s' }}
    >
      <div className="flex items-center gap-2.5">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
          isToday ? 'bg-red-500/20 border-red-500/30 text-red-300' : 'bg-amber-500/15 border-amber-500/25 text-amber-300'
        }`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-red-300' : 'text-amber-400/90'}`}>
            {isToday ? 'חסר ניחוש — היום!' : 'תזכורת: חסר ניחוש'}
          </p>
          <p className="text-sm font-bold text-gray-100 truncate">
            {teamName(soonest.team_a)} <span className="text-gray-500">נגד</span> {teamName(soonest.team_b)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {isToday ? 'היום' : formatDateHeader(soonest.start_time)}
            {sameDay.length > 0 && ` · ועוד ${sameDay.length} באותו יום`}
          </p>
        </div>
        <span className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${isToday ? 'bg-red-500 text-white' : 'bg-amber-500 text-amber-950'}`}>
          נחש ←
        </span>
      </div>

      {sameDay.length > 0 && (
        <p className="text-[10px] text-gray-500 mt-2.5 pt-2.5 border-t border-white/10 truncate">
          גם באותו יום: {sameDay.map(m => `${teamName(m.team_a)}–${teamName(m.team_b)}`).join(' · ')}
        </p>
      )}
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
