import { useEffect, useState } from 'react'

interface ProfileEditorProps {
  currentName: string
  currentAvatar: string
  onSave: (name: string, avatar: string) => Promise<{ error?: string | null }>
  onClose: () => void
}

const AVATAR_OPTIONS = [
  '⚽', '🏆', '🏅', '🥇', '🎯', '🥎', '🏐', '🏈',
  '🦁', '🐯', '🐺', '🐉', '🦅', '🐻', '🦊', '🦉',
  '🐲', '🦈', '🐍', '🦏', '🦬', '🐗', '🐂', '🦌',
  '😎', '🤠', '🥷', '🤴', '👑', '🦸', '🧙', '🤖',
  '🎩', '🎭', '👽', '🤡', '👻', '💀', '🧛', '🧝',
  '🔥', '⚡', '⭐', '💎', '✨', '🌟', '💫', '🌈',
  '💪', '🚀', '🌋', '☄️', '🌪️', '⚔️', '🛡️', '🏴‍☠️',
  '🇮🇱', '🇧🇷', '🇦🇷', '🇫🇷', '🇪🇸', '🇩🇪', '🇵🇹', '🇮🇹',
  '🇬🇧', '🇳🇱', '🇧🇪', '🇺🇸', '🇲🇽', '🇨🇦', '🇯🇵', '🇰🇷',
]

export default function ProfileEditor({ currentName, currentAvatar, onSave, onClose }: ProfileEditorProps) {
  const [name, setName] = useState(currentName)
  const [avatar, setAvatar] = useState(currentAvatar || '⚽')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSave() {
    const trimmed = name.trim()
    if (trimmed.length > 30) {
      setError('כינוי מקסימום 30 תווים')
      return
    }
    setSaving(true)
    setError('')
    const result = await onSave(trimmed, avatar)
    setSaving(false)
    if (result?.error) {
      setError(result.error)
    } else {
      onClose()
    }
  }

  const hasChanges = name.trim() !== currentName.trim() || avatar !== currentAvatar

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-900 border border-white/15 rounded-3xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-black text-white">עריכת פרופיל</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 text-xl flex items-center justify-center transition"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-l from-emerald-500/10 to-transparent border-b border-white/5">
          <span className="text-5xl">{avatar}</span>
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">תצוגה מקדימה</p>
            <p className="text-lg font-black text-white truncate">{name || '—'}</p>
          </div>
        </div>

        {/* Nickname input */}
        <div className="px-4 py-3 border-b border-white/5">
          <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
            כינוי <span className="text-gray-500 normal-case font-normal">(אופציונלי)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-slate-800/60 border border-white/10 text-white rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            placeholder='לדוגמה: "מלך הקלוד" 👑'
            maxLength={30}
            autoFocus
          />
          <p className="text-[10px] text-gray-500 mt-1.5 leading-snug">
            השם הזה יוצג ליד שם המשתמש שלך. השאר ריק להחזרה לברירת המחדל.
          </p>
        </div>

        {/* Avatar grid */}
        <div className="px-4 py-2">
          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
            תמונת פרופיל
          </label>
        </div>
        <div className="overflow-y-auto px-3 pb-3 grid grid-cols-6 gap-1.5 flex-1">
          {AVATAR_OPTIONS.map(emoji => {
            const selected = emoji === avatar
            return (
              <button
                key={emoji}
                onClick={() => setAvatar(emoji)}
                className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all ${
                  selected
                    ? 'bg-emerald-500/30 ring-2 ring-emerald-400 scale-105'
                    : 'bg-white/5 hover:bg-white/10 active:scale-95'
                }`}
              >
                {emoji}
              </button>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-2 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Save / Cancel */}
        <div className="flex gap-2 p-3 border-t border-white/5">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 font-bold py-3 rounded-xl transition"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/30 active:scale-[0.98]"
          >
            {saving ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>
    </div>
  )
}
