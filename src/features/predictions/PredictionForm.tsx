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

const isKnockout = (stage: string) => stage !== 'GROUP'

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
    const a = parseInt(scoreA)
    const b = parseInt(scoreB)
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
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <span className="text-gray-500 font-medium">🔒 {he.locked}</span>
        {existing && (
          <p className="text-sm text-gray-400 mt-1">
            ניחושך: {existing.pred_score_a} – {existing.pred_score_b}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <p className="text-xs text-amber-600 font-medium">{locksInLabel(match.start_time)}</p>

      <div className="flex items-center gap-3 justify-center">
        <TeamCrest team={match.team_a} />
        <div className="flex items-center gap-2">
          <ScoreInput value={scoreA} onChange={setScoreA} />
          <span className="text-gray-400 font-bold">–</span>
          <ScoreInput value={scoreB} onChange={setScoreB} />
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

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
      >
        {saved ? `✓ ${he.saved}` : saving ? he.loading : he.submit}
      </button>

      {/* Anonymous group stats */}
      <PredictionStats match={match} refreshKey={statsRefreshKey} />
    </div>
  )
}

function ScoreInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      min={0}
      max={20}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-14 h-12 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
      placeholder="0"
    />
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
    supabase.from('teams').select('id, name, name_he').then(({ data }) => {
      setExtraTeams(data ?? [])
    })
  }, [])

  const options = teamA && teamB ? [teamA, teamB] : extraTeams

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{he.qualifier}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-green-500"
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
