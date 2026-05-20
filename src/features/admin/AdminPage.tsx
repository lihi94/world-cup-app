import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../../components/common/Spinner'
import Hero from '../../components/common/Hero'
import { he } from '../../i18n/he'
import type { Match } from '../../types'

export default function AdminPage() {
  const { profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [matches, setMatches] = useState<Match[]>([])

  // Score override
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [scoreA, setScoreA] = useState('')
  const [scoreB, setScoreB] = useState('')
  const [winnerId, setWinnerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Allowlist
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
    setMessage(res.ok ? '✓ תוצאה עודכנה ונקודות חושבו מחדש' : 'עדכון הצליח, אך חישוב הנקודות נכשל (אפשרי שה-Edge Function לא נפרס)')
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
    return <div className="flex justify-center items-center min-h-screen"><Spinner size="lg" /></div>
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-24 space-y-5">

      {/* Hero */}
      <Hero image="pitch" overlay="dark" height="sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight drop-shadow-lg">פאנל ניהול</h1>
            <p className="text-gray-200 text-sm mt-1 font-medium drop-shadow">{matches.length} משחקים</p>
          </div>
          <span className="text-5xl animate-float drop-shadow-2xl">⚙️</span>
        </div>
      </Hero>

      {/* Score Override */}
      <section className="glass-card rounded-2xl p-5 space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1 h-4 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
          עדכון תוצאה ידנית
        </h2>

        <form onSubmit={handleScoreOverride} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">בחר משחק</label>
            <select
              value={selectedMatchId}
              onChange={e => setSelectedMatchId(e.target.value)}
              className="w-full bg-slate-800/60 border border-white/10 text-white rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
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

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">{he.scoreA}</label>
              <input
                type="number" min={0} max={20} value={scoreA}
                onChange={e => setScoreA(e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 text-white rounded-xl px-3 py-2.5 text-center text-lg font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                required
              />
            </div>
            <div className="pb-2 text-gray-500 font-black text-xl">–</div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">{he.scoreB}</label>
              <input
                type="number" min={0} max={20} value={scoreB}
                onChange={e => setScoreB(e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 text-white rounded-xl px-3 py-2.5 text-center text-lg font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                required
              />
            </div>
          </div>

          {selectedMatch && selectedMatch.stage !== 'GROUP' && (
            <div className="animate-fade-in-up">
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">קבוצה עולה (בונוס)</label>
              <select
                value={winnerId}
                onChange={e => setWinnerId(e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 text-white rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              >
                <option value="">— ללא —</option>
                {[selectedMatch.team_a, selectedMatch.team_b].filter(Boolean).map(t => {
                  const team = t as { id: string; name_he?: string; name: string }
                  return <option key={team.id} value={team.id}>{team.name_he ?? team.name}</option>
                })}
              </select>
            </div>
          )}

          {message && (
            <p className={`text-sm rounded-xl px-3 py-2 ${
              message.startsWith('✓')
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/15 border border-red-500/30 text-red-300'
            }`}>{message}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/30 active:scale-[0.98]"
          >
            {saving ? he.loading : 'עדכן תוצאה + חשב נקודות'}
          </button>
        </form>
      </section>

      {/* Rules & Scoring */}
      <section className="glass-card rounded-2xl p-5 space-y-3 animate-fade-in-up" style={{ animationDelay: '0.12s' }}>
        <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          חוקי הניקוד
        </h2>

        <div className="space-y-2">
          <RuleRow stage="GROUP" label="שלב הבתים" exact="3" dir="2" bonus="—" />
          <RuleRow stage="R32" label="שלב ה-32" exact="4" dir="3" bonus="+1 על קבוצה עולה" />
          <RuleRow stage="R16" label="שמינית גמר" exact="4" dir="3" bonus="+1 על קבוצה עולה" />
          <RuleRow stage="QF" label="רבע גמר" exact="4" dir="3" bonus="+1 על קבוצה עולה" />
          <RuleRow stage="SF" label="חצי גמר" exact="4" dir="3" bonus="+1 על קבוצה עולה" />
          <RuleRow stage="THIRD" label="מקום שלישי" exact="4" dir="3" bonus="+1 על קבוצה עולה" />
          <RuleRow stage="FINAL" label="גמר" exact="5" dir="4" bonus="+1 על אלוף" />
        </div>

        <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs text-gray-400">
          <p className="flex items-center gap-1.5">
            <span className="text-amber-400 text-base">🏆</span>
            <span><strong className="text-amber-300">+8</strong> אלוף הטורניר (הימור זהב)</span>
          </p>
          <p className="flex items-center gap-1.5">
            <span className="text-amber-400 text-base">👟</span>
            <span><strong className="text-amber-300">+8</strong> מלך השערים (הימור זהב)</span>
          </p>
          <p className="flex items-center gap-1.5">
            <span className="text-emerald-400 text-base">🎯</span>
            <span>שובר שוויון: יותר ניחושים מדויקים מנצח</span>
          </p>
          <p className="flex items-center gap-1.5">
            <span className="text-blue-400 text-base">🎲</span>
            <span>לא ניחשת? המערכת תיצור ניחוש רנדומלי בתחילת המשחק</span>
          </p>
        </div>
      </section>

      {/* Add Email to Allowlist */}
      <section className="glass-card rounded-2xl p-5 space-y-3 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
        <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1 h-4 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          הוספת דוא"ל לרשימת ההרשמה
        </h2>

        <form onSubmit={handleAddEmail} className="flex gap-2">
          <input
            type="email"
            value={allowedEmail}
            onChange={e => setAllowedEmail(e.target.value)}
            placeholder="friend@example.com"
            className="flex-1 bg-slate-800/60 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            dir="ltr"
            required
          />
          <button
            type="submit"
            disabled={addingEmail}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white px-4 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            הוסף
          </button>
        </form>
        {emailMsg && (
          <p className={`text-sm rounded-xl px-3 py-2 ${
            emailMsg.startsWith('✓')
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border border-red-500/30 text-red-300'
          }`}>{emailMsg}</p>
        )}
      </section>

    </div>
  )
}

function RuleRow({ stage, label, exact, dir, bonus }: {
  stage: string; label: string; exact: string; dir: string; bonus: string
}) {
  const STAGE_COLORS: Record<string, string> = {
    GROUP: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    R32:   'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    R16:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
    QF:    'bg-amber-500/20 text-amber-300 border-amber-500/30',
    SF:    'bg-orange-500/20 text-orange-300 border-orange-500/30',
    THIRD: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    FINAL: 'bg-red-500/20 text-red-300 border-red-500/30',
  }
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`px-2 py-0.5 rounded-full border font-bold whitespace-nowrap ${STAGE_COLORS[stage]}`}>
        {label}
      </span>
      <div className="flex items-center gap-1.5 text-gray-300 mr-auto">
        <span className="flex items-center gap-0.5">
          <span className="text-emerald-400">🎯</span>
          <strong className="text-white">{exact}</strong>
        </span>
        <span className="text-gray-600">·</span>
        <span className="flex items-center gap-0.5">
          <span className="text-blue-400">↗</span>
          <strong className="text-white">{dir}</strong>
        </span>
        {bonus !== '—' && (
          <>
            <span className="text-gray-600">·</span>
            <span className="text-amber-300 text-[10px] whitespace-nowrap">{bonus}</span>
          </>
        )}
      </div>
    </div>
  )
}
