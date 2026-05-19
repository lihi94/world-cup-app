import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import WorldCupLogo from '../../components/common/WorldCupLogo'
import { he } from '../../i18n/he'

const STADIUM_BG = 'https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=1600&q=85&auto=format'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(he.loginError)
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

      {/* Stadium background image */}
      <img
        src={STADIUM_BG}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-emerald-950/75 to-slate-950/95" />

      {/* Animated glow blobs */}
      <div className="absolute top-1/4 -right-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-float-slow" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '2s' }} />

      {/* Floating soccer balls */}
      <div className="absolute top-12 right-8 text-3xl opacity-30 animate-float">⚽</div>
      <div className="absolute bottom-20 left-10 text-2xl opacity-20 animate-spin-slow">⚽</div>
      <div className="absolute top-1/3 left-8 text-xl opacity-15 animate-float" style={{ animationDelay: '1.5s' }}>⚽</div>

      {/* Card */}
      <div className="w-full max-w-sm relative animate-fade-in-up">
        <div className="bg-slate-900/70 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl shadow-emerald-950/50 p-8">
          <div className="flex flex-col items-center mb-7">
            <div className="animate-float">
              <WorldCupLogo size="lg" variant="icon" />
            </div>
            <h1 className="text-3xl font-black text-white mt-4 tracking-tight drop-shadow">ליגת החברים</h1>
            <p className="text-emerald-400 text-sm mt-1 font-bold tracking-[0.3em] uppercase">מונדיאל 2026</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">{he.email}</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-800/70 border border-white/10 text-white rounded-xl px-4 py-3 text-right placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                placeholder="you@example.com"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">{he.password}</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-800/70 border border-white/10 text-white rounded-xl px-4 py-3 text-right placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-500/15 border border-red-500/40 text-red-300 rounded-xl px-4 py-2.5 text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black py-3.5 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/40 hover:shadow-emerald-500/60 active:scale-[0.98]"
            >
              {loading ? he.loading : he.loginBtn}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            {he.noAccount}{' '}
            <Link to="/register" className="text-emerald-400 font-bold hover:text-emerald-300 transition">
              {he.register}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
