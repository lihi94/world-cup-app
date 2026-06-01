import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../../components/common/Spinner'
import Hero from '../../components/common/Hero'
import MatchSection from '../../components/common/MatchSection'
import { formatKickoff } from '../../utils/date'
import { he } from '../../i18n/he'
import { groupMatchesIntoSections } from '../../utils/grouping'
import { displayName, type Match, type Prediction } from '../../types'

type Tab = 'finished' | 'live' | 'upcoming'

type PredictionWithProfile = Prediction & {
  profiles?: {
    username: string
    nickname: string | null
    total_points: number
    is_bot: boolean
    avatar?: string
  }
}

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: he.FRIENDLY, GROUP: he.GROUP, R32: he.R32, R16: he.R16, QF: he.QF, SF: he.SF, THIRD: he.THIRD, FINAL: he.FINAL,
}

export default function PredictionsFeedPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('upcoming')
  const [matches, setMatches] = useState<Match[]>([])
  const [predictionsByMatch, setPredictionsByMatch] = useState<Map<string, PredictionWithProfile[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    load()
  }, [tab])

  async function load() {
    setLoading(true)
    const now = new Date().toISOString()

    let q = supabase
      .from('matches')
      .select('*, team_a:teams!team_a_id(id,name,name_he,crest_url,group_name), team_b:teams!team_b_id(id,name,name_he,crest_url,group_name)')

    if (tab === 'finished') {
      q = q.eq('status', 'FINISHED').order('start_time', { ascending: false }).limit(30)
    } else if (tab === 'live') {
      q = q.eq('status', 'IN_PLAY').order('start_time', { ascending: true })
    } else {
      q = q.eq('status', 'SCHEDULED').gte('start_time', now)
        .not('team_a_id', 'is', null)
        .order('start_time', { ascending: true })
        .limit(20)
    }

    const { data: matchesData } = await q
    const ms = matchesData ?? []
    setMatches(ms)

    if (ms.length > 0) {
      const ids = ms.map(m => m.id)
      const { data: preds } = await supabase
        .from('predictions')
        .select('*, profiles(username, nickname, total_points, is_bot, avatar)')
        .in('match_id', ids)

      const grouped = new Map<string, PredictionWithProfile[]>()
      for (const p of preds ?? []) {
        const arr = grouped.get(p.match_id) ?? []
        arr.push(p as PredictionWithProfile)
        grouped.set(p.match_id, arr)
      }
      setPredictionsByMatch(grouped)
    } else {
      setPredictionsByMatch(new Map())
    }

    setLoading(false)
  }

  function toggleExpand(matchId: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(matchId)) next.delete(matchId)
      else next.add(matchId)
      return next
    })
  }

  // Group matches by group_name (group stage) or stage (knockout).
  // Sections come back in tournament order: A→L, then R32→Final.
  const sections = useMemo(() => groupMatchesIntoSections(matches), [matches])

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-24 space-y-5">

      {/* Hero */}
      <Hero image="crowd" overlay="blue" height="sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight drop-shadow-lg">ניחושים</h1>
            <p className="text-blue-100 text-sm mt-1 font-medium drop-shadow">מה כולם חוזים?</p>
          </div>
          <span className="text-5xl animate-float drop-shadow-2xl">🔮</span>
        </div>
      </Hero>

      {/* Tabs */}
      <div className="glass-card rounded-2xl p-1 flex gap-1 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
        <TabButton active={tab === 'upcoming'} onClick={() => setTab('upcoming')} icon="📅" label="עתידיים" />
        <TabButton active={tab === 'live'}     onClick={() => setTab('live')}     icon="🔴" label="LIVE" />
        <TabButton active={tab === 'finished'} onClick={() => setTab('finished')} icon="🏁" label="הסתיימו" />
      </div>

      {/* Helper text */}
      {tab === 'upcoming' && (
        <p className="text-xs text-gray-400 text-center px-4">
          ניחושי 🤖 יאני ו-🐒 הקוף גלויים תמיד · ניחושי חברים יחשפו ברגע הפתיחה
        </p>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : matches.length === 0 ? (
        <div className="glass-card rounded-2xl py-12 flex flex-col items-center gap-3">
          <span className="text-5xl animate-float">
            {tab === 'finished' ? '🏁' : tab === 'live' ? '🔴' : '📅'}
          </span>
          <p className="text-gray-300 text-sm">
            {tab === 'finished' ? 'עוד לא הסתיימו משחקים' : tab === 'live' ? 'אין משחקים חיים כרגע' : 'אין משחקים עתידיים'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {sections.map((section, si) => (
            <MatchSection
              key={section.key}
              title={section.title}
              icon={section.icon}
              accent={section.accent}
              count={section.matches.length}
              defaultOpen={si === 0}
              delay={`${0.1 + si * 0.03}s`}
            >
              {section.matches.map(m => {
                const preds = predictionsByMatch.get(m.id) ?? []
                const bots = preds.filter(p => p.profiles?.is_bot)
                const humans = preds.filter(p => !p.profiles?.is_bot)
                const isOpen = expanded.has(m.id)
                const isFinished = m.status === 'FINISHED'

                return (
                  <div key={m.id} className="glass-card rounded-2xl overflow-hidden">

                    {/* Match header */}
                    <button
                      onClick={() => toggleExpand(m.id)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition text-right"
                    >
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-500/20 text-blue-300 border-blue-500/30 shrink-0">
                        {STAGE_LABELS[m.stage] ?? m.stage}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-100 truncate">
                          {m.team_a?.name_he ?? m.team_a?.name ?? '?'} <span className="text-gray-500">×</span> {m.team_b?.name_he ?? m.team_b?.name ?? '?'}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{formatKickoff(m.start_time)}</p>
                      </div>

                      {/* Score */}
                      {isFinished ? (
                        <span className="text-lg font-black text-white tabular-nums shrink-0">
                          {m.score_a}–{m.score_b}
                        </span>
                      ) : m.status === 'IN_PLAY' ? (
                        <span className="text-base font-black text-yellow-300 tabular-nums shrink-0">
                          {m.score_a ?? 0}–{m.score_b ?? 0}
                        </span>
                      ) : null}

                      <span className={`text-xs text-gray-500 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    {/* Expanded predictions */}
                    {isOpen && (
                      <div className="border-t border-white/5 divide-y divide-white/5">
                        {/* Bots — always shown */}
                        {bots.length > 0 && (
                          <div className="px-4 py-3 bg-purple-500/[0.06]">
                            <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-2">🤖 בוטים</p>
                            <div className="space-y-1.5">
                              {bots.map(p => (
                                <PredRow key={p.id} pred={p} isMe={p.user_id === user?.id} isFinished={isFinished} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Humans — only if visible */}
                        {humans.length > 0 ? (
                          <div className="px-4 py-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                              👥 חברים
                              {isFinished && <span className="mr-1 text-emerald-400 normal-case">· ממוין לפי נקודות</span>}
                            </p>
                            <div className="space-y-1.5">
                              {[...humans]
                                .sort((a, b) => isFinished ? b.points_earned - a.points_earned : 0)
                                .map((p, idx) => (
                                  <PredRow key={p.id} pred={p} isMe={p.user_id === user?.id} isFinished={isFinished} rank={isFinished ? idx + 1 : undefined} />
                                ))}
                            </div>
                          </div>
                        ) : m.status === 'SCHEDULED' && (
                          <div className="px-4 py-3 text-center">
                            <p className="text-xs text-gray-500">🔒 ניחושי חברים יחשפו ברגע הפתיחה</p>
                          </div>
                        )}

                        {/* Link to full match */}
                        <Link
                          to={`/matches/${m.id}`}
                          className="block px-4 py-2.5 text-center text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition"
                        >
                          פתח את עמוד המשחק ←
                        </Link>
                      </div>
                    )}
                  </div>
                )
              })}
            </MatchSection>
          ))}
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
        active
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-inner'
          : 'text-gray-400 hover:text-gray-200 border border-transparent'
      }`}
    >
      <span className="mr-1">{icon}</span>
      {label}
    </button>
  )
}

function PredRow({
  pred, isMe, isFinished, rank,
}: {
  pred: PredictionWithProfile; isMe: boolean; isFinished: boolean; rank?: number
}) {
  const nameToShow = displayName(pred.profiles)
  const username = pred.profiles?.username ?? '—'
  const hasNickname = !!pred.profiles?.nickname && !pred.profiles?.is_bot
  return (
    <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${isMe ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30' : ''}`}>
      {rank !== undefined && (
        <span className="w-6 text-center text-xs font-black">
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : <span className="text-gray-500">#{rank}</span>}
        </span>
      )}
      <span className={`text-xs font-bold flex-1 min-w-0 ${isMe ? 'text-emerald-300' : 'text-gray-200'}`}>
        <span className="truncate block">
          {nameToShow}
          {isMe && <span className="text-[9px] text-emerald-400 mr-1">• אני</span>}
          {hasNickname && <span className="text-[9px] text-gray-500 mr-1 font-normal">@{username}</span>}
        </span>
      </span>
      <span className="text-xs font-black text-gray-100 bg-white/5 border border-white/10 px-2 py-0.5 rounded tabular-nums">
        {pred.pred_score_a ?? '?'}–{pred.pred_score_b ?? '?'}
      </span>
      {isFinished && (
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${
          pred.points_earned > 0
            ? 'bg-emerald-500/20 text-emerald-300'
            : 'bg-gray-700/40 text-gray-500'
        }`}>
          +{pred.points_earned}
        </span>
      )}
    </div>
  )
}
