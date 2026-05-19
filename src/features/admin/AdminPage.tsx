import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../../components/common/Spinner'
import Hero from '../../components/common/Hero'
import { he } from '../../i18n/he'
import type { Match, Profile } from '../../types'

export default function AdminPage() {
  const { profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [matches, setMatches] = useState<Match[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])

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

  // Username editor
  const [selectedUserId, setSelectedUserId] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState('')

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

    loadProfiles()
  }, [])

  async function loadProfiles() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('is_bot', { ascending: true })
      .order('username')
    setProfiles(data ?? [])
  }

  const selectedMatch = matches.find(m => m.id === selectedMatchId)
  const selectedUser = profiles.find(p => p.id === selectedUserId)

  // When user is selected, prefill current name
  useEffect(() => {
    if (selectedUser) setNewUsername(selectedUser.username)
  }, [selectedUserId])

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

  async function handleRenameUser(e: FormEvent) {
    e.preventDefault()
    if (!selectedUserId || !newUsername.trim()) return

    const trimmed = newUsername.trim().slice(0, 30)
    setSavingName(true)
    setNameMsg('')

    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', selectedUserId)

    setSavingName(false)
    if (error) {
      setNameMsg(error.code === '23505' ? 'שם משתמש כבר תפוס' : `שגיאה: ${error.message}`)
    } else {
      setNameMsg(`✓ השם עודכן ל-${trimmed}`)
      await loadProfiles()
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
            <p className="text-gray-200 text-sm mt-1 font-medium drop-shadow">{profiles.length} משתמשים · {matches.length} משחקים</p>
          </div>
          <span className="text-5xl animate-float drop-shadow-2xl">⚙️</span>
        </div>
      </Hero>

      {/* Change username */}
      <section className="glass-card rounded-2xl p-5 space-y-4 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-4 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            שינוי שם משתמש
          </h2>
          <span className="text-xs text-gray-500">{profiles.length} משתמשים</span>
        </div>

        <form onSubmit={handleRenameUser} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">בחר משתמש</label>
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="w-full bg-slate-800/60 border border-white/10 text-white rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              required
            >
              <option value="">— בחר משתמש —</option>
              {profiles.filter(p => !p.is_bot).length > 0 && (
                <optgroup label="👥 חברים">
                  {profiles.filter(p => !p.is_bot).map(p => (
                    <option key={p.id} value={p.id}>{p.username} {p.is_admin && '👑'}</option>
                  ))}
                </optgroup>
              )}
              {profiles.filter(p => p.is_bot).length > 0 && (
                <optgroup label="🤖 בוטים">
                  {profiles.filter(p => p.is_bot).map(p => (
                    <option key={p.id} value={p.id}>{p.username}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {selectedUserId && (
            <div className="animate-fade-in-up">
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">שם חדש</label>
              <input
                type="text"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 text-white rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                placeholder="לדוגמה: יוסי 🇮🇱"
                maxLength={30}
                required
              />
            </div>
          )}

          {nameMsg && (
            <p className={`text-sm rounded-xl px-3 py-2 ${
              nameMsg.startsWith('✓')
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/15 border border-red-500/30 text-red-300'
            }`}>{nameMsg}</p>
          )}

          <button
            type="submit"
            disabled={savingName || !selectedUserId}
            className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-400 hover:to-fuchsia-400 text-white font-black py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-purple-500/30 active:scale-[0.98]"
          >
            {savingName ? he.loading : 'עדכן שם משתמש'}
          </button>
        </form>
      </section>

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
