import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useLeaderboard } from '../../hooks/useLeaderboard'
import MatchCard from './MatchCard'
import Spinner from '../../components/common/Spinner'
import Hero from '../../components/common/Hero'
import WorldCupLogo from '../../components/common/WorldCupLogo'
import ProfileEditor from '../../components/common/ProfileEditor'
import { displayName } from '../../types'
import { he } from '../../i18n/he'
import { dateKey, formatDateHeader, formatKickoff } from '../../utils/date'
import type { Match, Prediction } from '../../types'

// Knockout rounds in bracket order. The dashboard reads these straight from the
// DB `stage` column, which fetch-results keeps in sync with football-data every
// 5 min — so a match auto-appears here the moment it's revealed as knockout.
const KNOCKOUT_ORDER = ['R32', 'R16', 'QF', 'SF', 'THIRD', 'FINAL'] as const
const KNOCKOUT_STAGES = new Set<string>(KNOCKOUT_ORDER)

async function handleLogout() {
  if (confirm('להתנתק מהאפליקציה?')) {
    await supabase.auth.signOut()
  }
}

export default function Dashboard() {
  const { user, profile, reloadProfile } = useAuth()
  const { profiles: lbProfiles } = useLeaderboard()
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [myPredictions, setMyPredictions] = useState<Map<string, Prediction>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showLocked, setShowLocked] = useState(true)
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

  /** Inline save from a MatchCard — upserts and updates the local map so the
      progress bar and card state refresh without a reload. */
  async function quickSave(matchId: string, a: number, b: number, qualifierId: string | null) {
    if (!user) return { error: 'לא מחובר' }
    const { data, error } = await supabase
      .from('predictions')
      .upsert(
        { user_id: user.id, match_id: matchId, pred_score_a: a, pred_score_b: b, pred_qualifier_id: qualifierId },
        { onConflict: 'user_id,match_id' }
      )
      .select()
      .single()
    if (error) {
      if (error.code === '42501') return { error: 'הניחוש נעול — המשחק עומד להתחיל' }
      return { error: error.message }
    }
    setMyPredictions(prev => {
      const next = new Map(prev)
      next.set(matchId, data as Prediction)
      return next
    })
    return { error: null }
  }

  // Split: bettable group matches (by date) + knockout bracket (by round).
  const { bettable, knockoutRounds, dateSections } = useMemo(() => {
    // Bettable = group-stage matches with both teams known. Knockout matches
    // live in their own bracket section below, regardless of whether the teams
    // are filled in yet.
    const bet: Match[] = []
    for (const m of upcomingMatches) {
      if (!KNOCKOUT_STAGES.has(m.stage) && m.team_a_id && m.team_b_id) bet.push(m)
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

    // Knockout bracket: every knockout-stage match, grouped by round in order.
    const byStage = new Map<string, Match[]>()
    for (const m of upcomingMatches) {
      if (!KNOCKOUT_STAGES.has(m.stage)) continue
      const arr = byStage.get(m.stage) ?? []
      arr.push(m)
      byStage.set(m.stage, arr)
    }
    const rounds = KNOCKOUT_ORDER
      .filter(s => byStage.has(s))
      .map(s => ({
        stage: s,
        matches: byStage.get(s)!.sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        ),
      }))

    return { bettable: bet, knockoutRounds: rounds, dateSections: datesArr }
  }, [upcomingMatches])

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><Spinner size="lg" /></div>
  }

  const myRankIdx = lbProfiles.findIndex(p => p.id === user?.id)
  const myRank = myRankIdx >= 0 ? myRankIdx + 1 : null
  const totalPlayers = lbProfiles.length
  const upcomingCount = bettable.length
  const predictedUpcoming = bettable.filter(m => myPredictions.has(m.id)).length
  const progressPct = upcomingCount > 0 ? Math.round((predictedUpcoming / upcomingCount) * 100) : 0

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

        {/* Rank + points */}
        <div className="flex items-stretch gap-2 mt-4">
          <Link
            to="/leaderboard"
            className="flex-1 bg-black/35 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/15 shadow-lg active:scale-[0.98] transition"
          >
            <p className="text-[9px] text-amber-200/90 uppercase tracking-wider font-bold flex items-center gap-1">
              <span>🏆</span> דירוג
            </p>
            <p className="text-2xl font-black leading-none mt-0.5 drop-shadow tabular-nums">
              {myRank ? `#${myRank}` : '—'}
              {totalPlayers > 0 && <span className="text-sm text-white/55 font-bold"> / {totalPlayers}</span>}
            </p>
          </Link>
          <div className="flex-1 bg-black/35 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/15 shadow-lg">
            <p className="text-[9px] text-emerald-200/90 uppercase tracking-wider font-bold">נקודות</p>
            <p className="text-2xl font-black leading-none mt-0.5 drop-shadow tabular-nums">{profile?.total_points ?? 0}</p>
          </div>
        </div>

        {/* Prediction progress for upcoming matches */}
        {upcomingCount > 0 && (
          <div className="mt-2.5 bg-black/30 backdrop-blur-md rounded-2xl px-3 py-2.5 border border-white/15 shadow-lg">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-white/85 font-bold uppercase tracking-wider">ניחושים למשחקים הקרובים</span>
              <span className="text-xs font-black text-white tabular-nums">{predictedUpcoming}/{upcomingCount}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/15 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPct === 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'
                }`}
                style={{ width: `${Math.max(progressPct, predictedUpcoming > 0 ? 6 : 0)}%` }}
              />
            </div>
          </div>
        )}
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
                  <MatchCard key={m.id} match={m} myPrediction={myPredictions.get(m.id)} onQuickSave={quickSave} />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Knockout bracket — grouped by round, auto-fills as matches are revealed */}
      {knockoutRounds.length > 0 && (
        <section className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={() => setShowLocked(v => !v)}
            className="w-full glass-card rounded-2xl px-4 py-3 flex items-center justify-between hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-200">משחקי נוקאאוט</p>
                <p className="text-[10px] text-gray-500">מתעדכן אוטומטית ככל שנקבעים</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
                {knockoutRounds.reduce((n, r) => n + r.matches.length, 0)}
              </span>
              <span className={`text-gray-400 transition-transform ${showLocked ? 'rotate-180' : ''}`}>▼</span>
            </div>
          </button>

          {showLocked && (
            <div className="mt-3 space-y-4 animate-fade-in-up">
              {knockoutRounds.map(round => (
                <div key={round.stage} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="w-1 h-4 bg-amber-500 rounded-full" />
                    <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      {he[round.stage as keyof typeof he] ?? round.stage}
                    </h3>
                    <span className="text-[10px] text-gray-500 font-medium">· {round.matches.length}</span>
                  </div>
                  {round.matches.map(m => {
                    const known = !!(m.team_a_id && m.team_b_id)
                    // Determined matchups get a full predictable card, like group
                    // matches. TBD slots stay a locked placeholder until drawn.
                    return known ? (
                      <MatchCard key={m.id} match={m} myPrediction={myPredictions.get(m.id)} onQuickSave={quickSave} />
                    ) : (
                      <div key={m.id} className="glass-card rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 opacity-70">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-500">ייקבע</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{formatKickoff(m.start_time)}</p>
                        </div>
                        <span className="text-[10px] text-gray-600 shrink-0">🔒</span>
                      </div>
                    )
                  })}
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
function Matchup({ a, b }: { a: Match['team_a']; b: Match['team_b'] }) {
  return (
    <><bdi>{teamName(a)}</bdi> <span className="text-gray-500">נגד</span> <bdi>{teamName(b)}</bdi></>
  )
}

function PredictionReminder({ matches, predictedIds }: { matches: Match[]; predictedIds: Map<string, Prediction> }) {
  // Only nag about matches within the next 3 days.
  const in3 = Date.now() + 3 * 86_400_000
  const toPredict = matches.filter(m => !predictedIds.has(m.id) && new Date(m.start_time).getTime() <= in3)

  // ── Info mode: nothing to predict in the next 3 days → just show the next match
  if (toPredict.length === 0) {
    const next = matches[0]
    if (!next) return null
    return (
      <div className="rounded-2xl p-3.5 bg-gradient-to-l from-emerald-500/12 to-transparent border border-emerald-500/30 flex items-center gap-2.5 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <span className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">המשחק הבא</p>
          <p className="text-sm font-bold text-gray-100 truncate"><Matchup a={next.team_a} b={next.team_b} /></p>
          <p className="text-[11px] text-gray-400 mt-0.5">{formatDateHeader(next.start_time)} · כל הניחושים הקרובים מולאו ✓</p>
        </div>
      </div>
    )
  }

  // ── Nag mode: there are matches to predict in the next 3 days
  const soonest = toPredict[0]
  const dayKey = dateKey(soonest.start_time)
  const isToday = dayKey === dateKey(new Date().toISOString())
  const sameDay = toPredict.filter(m => m.id !== soonest.id && dateKey(m.start_time) === dayKey)

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
          <p className="text-sm font-bold text-gray-100 truncate"><Matchup a={soonest.team_a} b={soonest.team_b} /></p>
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
