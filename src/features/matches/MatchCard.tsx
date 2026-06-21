import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatKickoff, locksInLabel, isPredictionOpen, dateKey } from '../../utils/date'
import { he } from '../../i18n/he'
import type { Match, Prediction } from '../../types'

// Distinct but soft color per World Cup group (A–L) — used for the group letter.
const GROUP_COLORS: Record<string, string> = {
  A: 'text-rose-300',  B: 'text-orange-300', C: 'text-amber-300',   D: 'text-yellow-300',
  E: 'text-lime-300',  F: 'text-green-300',  G: 'text-emerald-300', H: 'text-teal-300',
  I: 'text-cyan-300',  J: 'text-sky-300',    K: 'text-indigo-300',  L: 'text-fuchsia-300',
}

/** Countdown to kickoff in days / hours / minutes (no seconds). Bold on match day. */
function MatchCountdown({ startTime }: { startTime: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const diff = new Date(startTime).getTime() - now
  if (diff <= 0) return null // kicked off — handled by LIVE/score states

  const totalMin = Math.floor(diff / 60_000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins = totalMin % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days} ימים`)
  if (days > 0 || hours > 0) parts.push(`${hours} שע׳`)
  parts.push(`${mins} דק׳`)

  const isMatchDay = dateKey(startTime) === dateKey(new Date(now).toISOString())

  return (
    <div className={`mt-2 flex items-center justify-center gap-1.5 rounded-lg py-1 text-[11px] border ${
      isMatchDay
        ? 'bg-amber-500/15 border-amber-500/30 text-amber-200 font-black'
        : 'bg-white/5 border-white/10 text-gray-300 font-bold'
    }`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 14" />
      </svg>
      <span className="tabular-nums">בעוד {parts.join(' ')}</span>
    </div>
  )
}

interface MatchCardProps {
  match: Match
  myPrediction?: Prediction | null
  /** When provided, the card shows an inline quick-predict strip instead of linking to the match page. */
  onQuickSave?: (matchId: string, a: number, b: number, qualifierId: string | null) => Promise<{ error: string | null }>
}

const STAGE_LABELS: Record<string, string> = {
  FRIENDLY: he.FRIENDLY, GROUP: he.GROUP, R32: he.R32, R16: he.R16, QF: he.QF, SF: he.SF, THIRD: he.THIRD, FINAL: he.FINAL,
}

const STAGE_COLORS: Record<string, string> = {
  FRIENDLY: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  GROUP: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  R32:   'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  R16:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
  QF:    'bg-amber-500/20 text-amber-300 border-amber-500/30',
  SF:    'bg-orange-500/20 text-orange-300 border-orange-500/30',
  THIRD: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  FINAL: 'bg-red-500/20 text-red-300 border-red-500/30',
}

export default function MatchCard({ match, myPrediction, onQuickSave }: MatchCardProps) {
  const open = isPredictionOpen(match.start_time)
  const teamA = match.team_a
  const teamB = match.team_b
  const isFinished = match.status === 'FINISHED'
  const isLive = match.status === 'IN_PLAY'
  const isScheduled = match.status === 'SCHEDULED'
  const hasPrediction = !!myPrediction && myPrediction.pred_score_a !== null && myPrediction.pred_score_b !== null
  const needsPrediction = isScheduled && open && !hasPrediction
  const quickPredict = isScheduled && open && !!onQuickSave

  // Predicted-state styling: subtle emerald tint + ring
  const cardClass = hasPrediction && isScheduled
    ? 'block rounded-2xl p-4 bg-gradient-to-br from-emerald-500/12 via-emerald-500/[0.06] to-transparent border border-emerald-500/40 shadow-lg shadow-emerald-500/10 hover:border-emerald-400/60 transition-all'
    : needsPrediction
      ? 'block rounded-2xl p-4 bg-gradient-to-br from-amber-500/10 via-amber-500/[0.04] to-transparent border border-amber-500/40 shadow-lg shadow-amber-500/10 hover:border-amber-400/60 transition-all'
      : 'block glass-card rounded-2xl p-4 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all'

  return (
    <div className={cardClass}>
      <Link to={`/matches/${match.id}`} className="block active:scale-[0.99] transition-transform">
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

      {/* Live countdown to kickoff (scheduled matches only) */}
      {isScheduled && <MatchCountdown startTime={match.start_time} />}

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

      {/* Betting odds bar (only when scheduled and odds available) */}
      {isScheduled && match.odds_a !== null && match.odds_b !== null && match.odds_draw !== null && (
        <OddsBar
          oddsA={match.odds_a}
          oddsDraw={match.odds_draw}
          oddsB={match.odds_b}
          teamAName={teamA?.name_he ?? teamA?.name ?? '?'}
          teamBName={teamB?.name_he ?? teamB?.name ?? '?'}
          updatedAt={match.odds_updated_at}
        />
      )}

      </Link>

      {/* Bottom: inline quick-predict / prediction status */}
      <div className="mt-3 pt-3 border-t border-white/5">
        {quickPredict ? (
          <QuickPredict match={match} existing={hasPrediction ? myPrediction! : null} onSave={onQuickSave!} />
        ) : myPrediction ? (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-black flex items-center gap-1">
              <span className="text-sm">✓</span> ניחשת
            </span>
            <div className="flex items-center gap-2">
              <span dir="ltr" className="text-sm font-black text-emerald-200 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg tabular-nums">
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

      {/* Group label (group stage only) — letter colored per group */}
      {match.stage === 'GROUP' && (match.team_a?.group_name ?? match.team_b?.group_name) && (
        <p className="mt-2 text-center text-[11px] text-gray-400 font-medium">
          בית{' '}
          <span className={`font-bold ${GROUP_COLORS[(match.team_a?.group_name ?? match.team_b?.group_name) as string] ?? 'text-gray-300'}`}>
            {match.team_a?.group_name ?? match.team_b?.group_name}
          </span>
        </p>
      )}
    </div>
  )
}

/**
 * Inline one-tap prediction editor shown on the dashboard card.
 * Saved state collapses to a compact "ניחשת" row with an edit button.
 * Knockout: qualifier is implied by the score; only a draw asks "מי עולה?".
 */
function QuickPredict({
  match, existing, onSave,
}: {
  match: Match
  existing: Prediction | null
  onSave: (matchId: string, a: number, b: number, qualifierId: string | null) => Promise<{ error: string | null }>
}) {
  const [editing, setEditing] = useState(false)
  const [a, setA] = useState(existing?.pred_score_a ?? 0)
  const [b, setB] = useState(existing?.pred_score_b ?? 0)
  const [qual, setQual] = useState<string>(existing?.pred_qualifier_id ?? '')
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [err, setErr] = useState('')

  const knockout = match.stage !== 'GROUP' && match.stage !== 'FRIENDLY'
  const needsQualChoice = knockout && a === b

  if (existing && !editing) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-black flex items-center gap-1">
          <span className="text-sm">✓</span> {justSaved ? 'נשמר!' : 'ניחשת'}
        </span>
        <div className="flex items-center gap-2">
          <span dir="ltr" className="text-sm font-black text-emerald-200 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg tabular-nums">
            {existing.pred_score_a} – {existing.pred_score_b}
          </span>
          <button
            type="button"
            onClick={() => {
              setA(existing.pred_score_a ?? 0)
              setB(existing.pred_score_b ?? 0)
              setQual(existing.pred_qualifier_id ?? '')
              setErr('')
              setEditing(true)
            }}
            className="text-xs font-bold text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-full transition active:scale-95"
          >
            ✏️ ערוך
          </button>
        </div>
      </div>
    )
  }

  async function save() {
    let qualifierId: string | null = null
    if (knockout) {
      if (a > b) qualifierId = match.team_a_id
      else if (b > a) qualifierId = match.team_b_id
      else qualifierId = qual || null
      if (!qualifierId) {
        setErr('תיקו — בחר מי עולה')
        return
      }
    }
    setSaving(true)
    setErr('')
    const { error } = await onSave(match.id, a, b, qualifierId)
    setSaving(false)
    if (error) {
      setErr(error)
    } else {
      setEditing(false)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-3">
        <MiniStepper value={a} onChange={setA} />
        <span className="text-gray-500 font-black text-lg">–</span>
        <MiniStepper value={b} onChange={setB} />
      </div>

      {needsQualChoice && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-[10px] text-gray-400 font-bold">מי עולה?</span>
          {[
            { id: match.team_a_id, name: match.team_a?.name_he ?? match.team_a?.name ?? '?' },
            { id: match.team_b_id, name: match.team_b?.name_he ?? match.team_b?.name ?? '?' },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setQual(t.id!)}
              className={`text-xs font-bold px-2.5 py-1 rounded-full border transition active:scale-95 ${
                qual === t.id
                  ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-200'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              <bdi>{t.name}</bdi>
            </button>
          ))}
        </div>
      )}

      {err && (
        <p className="bg-red-500/15 border border-red-500/30 text-red-300 rounded-lg px-3 py-1.5 text-xs text-center font-medium">{err}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-sm font-black py-2 rounded-xl transition-all disabled:opacity-50 shadow shadow-emerald-500/20 active:scale-[0.98]"
        >
          {saving ? '...' : existing ? 'עדכן ניחוש' : 'שמור ניחוש ⚡'}
        </button>
        {existing && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs font-bold text-gray-400 bg-white/5 hover:bg-white/10 border border-white/10 px-3 rounded-xl transition active:scale-95"
          >
            ביטול
          </button>
        )}
      </div>
    </div>
  )
}

function MiniStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.min(20, value + 1))}
        className="w-9 h-9 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/40 text-emerald-300 font-black text-base flex items-center justify-center transition active:scale-90"
        aria-label="הוסף שער"
      >
        +
      </button>
      <span className="w-10 h-11 flex items-center justify-center text-2xl font-black text-white bg-slate-800/80 border border-white/15 rounded-xl tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
        className="w-9 h-9 rounded-lg bg-slate-700/40 hover:bg-slate-700/70 border border-white/10 text-gray-300 font-black text-base flex items-center justify-center transition active:scale-90 disabled:opacity-30"
        aria-label="הורד שער"
      >
        −
      </button>
    </div>
  )
}

function OddsBar({
  oddsA, oddsDraw, oddsB, teamAName, teamBName, updatedAt,
}: {
  oddsA: number; oddsDraw: number; oddsB: number
  teamAName: string; teamBName: string
  updatedAt: string | null
}) {
  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })
    : null

  return (
    <div className="mt-3 border-t border-white/5 pt-2">
      {/* Probability bar */}
      <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-slate-700/40">
        <div
          className="bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${oddsA}%` }}
        />
        <div
          className="bg-gradient-to-r from-amber-500/80 to-amber-400/80 transition-all duration-500"
          style={{ width: `${oddsDraw}%` }}
        />
        <div
          className="bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500"
          style={{ width: `${oddsB}%` }}
        />
      </div>

      {/* Single horizontal row — labels aligned under their bar segments (RTL) */}
      <div className="flex items-center justify-between mt-1.5 text-[10px] font-medium gap-2">
        <span className="flex items-center gap-1 min-w-0 flex-shrink">
          <span className="font-black text-emerald-300 tabular-nums">{oddsA}%</span>
          <span className="text-gray-400 truncate">{teamAName}</span>
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          <span className="font-black text-amber-300 tabular-nums">{oddsDraw}%</span>
          <span className="text-gray-400">תיקו</span>
        </span>
        <span className="flex items-center gap-1 min-w-0 flex-shrink justify-end">
          <span className="font-black text-blue-300 tabular-nums">{oddsB}%</span>
          <span className="text-gray-400 truncate">{teamBName}</span>
        </span>
      </div>

      {/* Tiny source label */}
      {updatedLabel && (
        <div className="text-center text-[9px] text-gray-600 font-medium mt-0.5">
          📊 שוק הימורים · {updatedLabel}
        </div>
      )}
    </div>
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
