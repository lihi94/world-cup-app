import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../../components/common/Spinner'
import { he } from '../../i18n/he'
import type { Match } from '../../types'

export default function AdminPage() {
  const { profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [scoreA, setScoreA] = useState('')
  const [scoreB, setScoreB] = useState('')
  const [winnerId, setWinnerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [allowedEmail, setAllowedEmail] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')

  useEffect(() => {
    if (!authLoading && !profile?.is_admin) {
      navigate('/')
    }
  }, [authLoading, profile, navigate])

  useEffect(() => {
    supabase
      .from('matches')
      .select('*, team_a:teams!team_a_id(id,name,name_he), team_b:teams!team_b_id(id,name,name_he)')
      .order('start_time', { ascending: true })
      .then(({ data }) => setMatches(data ?? []))
  }, [])

  const selectedMatch = matches.find(m => m.id === selectedMatchId)

  async function handleScoreOverride(e: FormEvent) {
    e.preventDefault()
    if (!selectedMatchId) return

    setSaving(true)
    setMessage('')

    const a = parseInt(scoreA)
    const b = parseInt(scoreB)
    if (isNaN(a) || isNaN(b)) {
      setMessage('תוצאה לא תקינה')
      setSaving(false)
      return
    }

    const { error: updateErr } = await supabase
      .from('matches')
      .update({
        score_a: a,
        score_b: b,
        status: 'FINISHED',
        winner_id: winnerId || null,
      })
      .eq('id', selectedMatchId)

    if (updateErr) {
      setMessage(`שגיאה: ${updateErr.message}`)
      setSaving(false)
      return
    }

    // Trigger scoring via Edge Function
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/score-predictions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ match_id: selectedMatchId }),
      }
    )

    setSaving(false)
    setMessage(res.ok ? '✓ תוצאה עודכנה ונקודות חושבו מחדש' : 'עדכון הצליח אך חישוב הנקודות נכשל')
  }

  async function handleAddEmail(e: FormEvent) {
    e.preventDefault()
    if (!allowedEmail) return
    setAddingEmail(true)
    setEmailMsg('')

    const { error } = await supabase
      .from('allowed_emails')
      .insert({ email: allowedEmail.trim().toLowerCase() })

    setAddingEmail(false)
    if (error) {
      setEmailMsg(error.code === '23505' ? 'כתובת כבר קיימת ברשימה' : error.message)
    } else {
      setEmailMsg(`✓ ${allowedEmail} נוספה בהצלחה`)
      setAllowedEmail('')
    }
  }

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-64"><Spinner size="lg" /></div>
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
      <h1 className="text-xl font-bold text-gray-900">{he.adminTitle}</h1>

      {/* Score Override */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">{he.overrideScore}</h2>

        <form onSubmit={handleScoreOverride} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">בחר משחק</label>
            <select
              value={selectedMatchId}
              onChange={e => setSelectedMatchId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">— בחר משחק —</option>
              {matches.map(m => {
                const ta = (m.team_a as { name_he?: string; name: string } | undefined)
                const tb = (m.team_b as { name_he?: string; name: string } | undefined)
                const label = `${ta?.name_he ?? ta?.name ?? '?'} נ' ${tb?.name_he ?? tb?.name ?? '?'}`
                return <option key={m.id} value={m.id}>{label}</option>
              })}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">{he.scoreA}</label>
              <input
                type="number" min={0} max={20} value={scoreA}
                onChange={e => setScoreA(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center"
                required
              />
            </div>
            <div className="flex items-end pb-2 text-gray-400 font-bold">–</div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">{he.scoreB}</label>
              <input
                type="number" min={0} max={20} value={scoreB}
                onChange={e => setScoreB(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center"
                required
              />
            </div>
          </div>

          {selectedMatch && selectedMatch.stage !== 'GROUP' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">קבוצה עולה (עבור בונוס)</label>
              <select
                value={winnerId}
                onChange={e => setWinnerId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right"
              >
                <option value="">— ללא (גמר שחזרה אם רלוונטי) —</option>
                {[selectedMatch.team_a, selectedMatch.team_b].filter(Boolean).map(t => {
                  const team = t as { id: string; name_he?: string; name: string }
                  return <option key={team.id} value={team.id}>{team.name_he ?? team.name}</option>
                })}
              </select>
            </div>
          )}

          {message && (
            <p className={`text-sm ${message.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
          >
            {saving ? he.loading : `${he.overrideScore} + ${he.recalculate}`}
          </button>
        </form>
      </section>

      {/* Add Email to Allowlist */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">הוספת דוא"ל לרשימת ההרשמה</h2>
        <form onSubmit={handleAddEmail} className="flex gap-2">
          <input
            type="email"
            value={allowedEmail}
            onChange={e => setAllowedEmail(e.target.value)}
            placeholder="friend@example.com"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            dir="ltr"
            required
          />
          <button
            type="submit"
            disabled={addingEmail}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            הוסף
          </button>
        </form>
        {emailMsg && (
          <p className={`text-sm ${emailMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
            {emailMsg}
          </p>
        )}
      </section>
    </div>
  )
}
