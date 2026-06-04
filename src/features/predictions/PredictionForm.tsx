import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'
import { isPredictionOpen, locksInLabel } from '../../utils/date'
import { he } from '../../i18n/he'
import PredictionStats from './PredictionStats'
import type { Match, Team, Prediction } from '../../types'

interface PredictionFormProps {
  match: Match
  existing: Prediction | null
  userId: string
  onSave: (scoreA: number, scoreB: number, qualifierId: string | null) => Promise<{ error: string | null }>
}

const isKnockout = (stage: string) => stage !== 'GROUP' && stage !== 'FRIENDLY'

export default function PredictionForm({ match, existing, onSave }: PredictionFormProps) {
  const [scoreA, setScoreA] = useState<string>(existing?.pred_score_a?.toString() ?? '')
  const [scoreB, setScoreB] = useState<string>(existing?.pred_score_b?.toString() ?? '')
  const [qualifierId, setQualifierId] = useState<string>(existing?.pred_qualifier_id ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [statsRefreshKey, setStatsRefreshKey] = useState(0)
  const [, setTick] = useState(0)

  const open = isPredictionOpen(match.start_time)
  const knockout = isKnockout(match.stage)

  // Refresh countdown every 30s
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  async function handleSubmit() {
    // Empty input means the default 0 (the field shows "0" as placeholder),
    // so a 0–0 prediction is savable without touching the stepper.
    const a = scoreA.trim() === '' ? 0 : parseInt(scoreA)
    const b = scoreB.trim() === '' ? 0 : parseInt(scoreB)
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) {
      setError('יש להזין תוצאה תקינה')
      return
    }
    if (knockout && !qualifierId) {
      setError('יש לבחור את הקבוצה העולה')
      return
    }

    setSaving(true)
    setError('')
    const { error: saveErr } = await onSave(a, b, knockout ? qualifierId || null : null)
    setSaving(false)

    if (saveErr) {
      setError(saveErr)
    } else {
      setSaved(true)
      setStatsRefreshKey(k => k + 1) // refresh stats after save
      setTimeout(() => setSaved(false), 2000)
    }
  }

  if (!open) {
    return (
      <div className="glass-card rounded-2xl p-5 text-center space-y-2">
        <span className="text-gray-300 font-bold text-base">🔒 {he.locked}</span>
        {existing && (
          <p className="text-sm text-gray-400 mt-1">
            ניחושך: <span className="font-black text-white">{existing.pred_score_a} – {existing.pred_score_b}</span>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl border border-emerald-500/20 p-5 space-y-4">
      <p className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
        <span className="animate-pulse">⏳</span>
        {locksInLabel(match.start_time)}
      </p>

      <div className="flex items-center gap-3 justify-center">
        <TeamCrest team={match.team_a} />
        <div className="flex items-center gap-3">
          <ScoreStepper value={scoreA} onChange={setScoreA} />
          <span className="text-gray-500 font-black text-2xl">–</span>
          <ScoreStepper value={scoreB} onChange={setScoreB} />
        </div>
        <TeamCrest team={match.team_b} />
      </div>

      {knockout && (
        <QualifierSelect
          teamA={match.team_a ?? null}
          teamB={match.team_b ?? null}
          value={qualifierId}
          onChange={setQualifierId}
        />
      )}

      {error && (
        <p className="bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl px-3 py-2 text-sm text-center font-medium">
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black py-3.5 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/30 active:scale-[0.98]"
      >
        {saved ? `✓ ${he.saved}` : saving ? he.loading : existing ? 'עדכן ניחוש' : he.submit}
      </button>

      {/* Anonymous group stats */}
      <PredictionStats match={match} refreshKey={statsRefreshKey} />
    </div>
  )
}

function ScoreStepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const num = parseInt(value)
  const current = isNaN(num) ? 0 : num

  function set(n: number) {
    onChange(String(Math.max(0, Math.min(20, n))))
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => set(current + 1)}
        className="w-10 h-7 bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/40 text-emerald-300 rounded-lg font-black text-base flex items-center justify-center transition active:scale-90 shadow-sm"
        aria-label="הוסף שער"
      >
        +
      </button>
      <div className="relative">
        <input
          type="number"
          min={0}
          max={20}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-16 h-16 text-center text-3xl font-black bg-slate-800/80 border-2 border-emerald-500/40 text-white rounded-2xl shadow-lg shadow-emerald-500/10 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/30 focus:outline-none transition tabular-nums"
          placeholder="0"
        />
      </div>
      <button
        type="button"
        onClick={() => set(current - 1)}
        disabled={current === 0}
        className="w-10 h-7 bg-slate-700/40 hover:bg-slate-700/70 border border-white/10 text-gray-300 rounded-lg font-black text-base flex items-center justify-center transition active:scale-90 disabled:opacity-30 shadow-sm"
        aria-label="הורד שער"
      >
        −
      </button>
    </div>
  )
}

function TeamCrest({ team }: { team?: Team }) {
  if (!team) return <div className="w-10 h-10 rounded-full bg-gray-200" />
  return (
    <div className="flex flex-col items-center gap-1">
      {team.crest_url ? (
        <img src={team.crest_url} alt={team.name} className="w-10 h-10 object-contain" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">⚽</div>
      )}
      <span className="text-xs text-gray-600 text-center max-w-16 leading-tight">
        {team.name_he ?? team.name}
      </span>
    </div>
  )
}

function QualifierSelect({
  teamA, teamB, value, onChange,
}: {
  teamA: Team | null; teamB: Team | null; value: string; onChange: (v: string) => void
}) {
  const [extraTeams, setExtraTeams] = useState<Team[]>([])

  useEffect(() => {
    // Load all teams for cases where we need to show the full list
    supabase.from('teams').select('*').then(({ data }) => {
      setExtraTeams((data as Team[]) ?? [])
    })
  }, [])

  const options = teamA && teamB ? [teamA, teamB] : extraTeams

  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">{he.qualifier}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-800/60 border border-white/10 text-white rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
      >
        <option value="">— בחר קבוצה עולה —</option>
        {options.map(t => (
          <option key={t.id} value={t.id}>
            {t.name_he ?? t.name}
          </option>
        ))}
      </select>
    </div>
  )
}
