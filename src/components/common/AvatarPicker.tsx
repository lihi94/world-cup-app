import { useEffect } from 'react'

interface AvatarPickerProps {
  current: string
  onSelect: (emoji: string) => void
  onClose: () => void
}

const AVATAR_OPTIONS = [
  // Sports
  '⚽', '🏆', '🏅', '🥇', '🎯', '🥎', '🏐', '🏈',
  // Animals (mascots)
  '🦁', '🐯', '🐺', '🐉', '🦅', '🐻', '🦊', '🦉',
  '🐲', '🦈', '🐍', '🦏', '🦬', '🐗', '🐂', '🦌',
  // Faces / characters
  '😎', '🤠', '🥷', '🤴', '👑', '🦸', '🧙', '🤖',
  '🎩', '🎭', '👽', '🤡', '👻', '💀', '🧛', '🧝',
  // Power / fire
  '🔥', '⚡', '⭐', '💎', '✨', '🌟', '💫', '🌈',
  '💪', '🚀', '🌋', '☄️', '🌪️', '⚔️', '🛡️', '🏴‍☠️',
  // Country flags (popular)
  '🇮🇱', '🇧🇷', '🇦🇷', '🇫🇷', '🇪🇸', '🇩🇪', '🇵🇹', '🇮🇹',
  '🇬🇧', '🇳🇱', '🇧🇪', '🇺🇸', '🇲🇽', '🇨🇦', '🇯🇵', '🇰🇷',
]

export default function AvatarPicker({ current, onSelect, onClose }: AvatarPickerProps) {
  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-900 border border-white/15 rounded-3xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-black text-white">בחר תמונת פרופיל</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 text-xl flex items-center justify-center transition"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>

        {/* Preview */}
        <div className="flex items-center justify-center gap-3 py-4 px-4 bg-slate-800/40 border-b border-white/5">
          <span className="text-xs text-gray-400">נבחר:</span>
          <span className="text-4xl">{current || '⚽'}</span>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-3 grid grid-cols-6 gap-1.5 flex-1">
          {AVATAR_OPTIONS.map(emoji => {
            const selected = emoji === current
            return (
              <button
                key={emoji}
                onClick={() => onSelect(emoji)}
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

        <p className="text-[10px] text-gray-500 text-center py-2 border-t border-white/5">
          לחץ על אמוג'י לבחירה
        </p>
      </div>
    </div>
  )
}
