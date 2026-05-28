import { useState, type ReactNode } from 'react'

interface MatchSectionProps {
  /** Heading text shown on the collapse bar (e.g. "בית A", "רבע גמר"). */
  title: string
  /** Optional emoji shown left of the title (RTL). */
  icon?: string
  /** Number shown on the right (e.g. match count). */
  count?: number
  /** Optional sub-label (e.g. "8 ניחושים נחשפו"). */
  subtitle?: string | null
  /** Whether the section starts expanded. Defaults to true. */
  defaultOpen?: boolean
  /** Tailwind color accent — controls the dot + count chip styling. */
  accent?: 'emerald' | 'amber' | 'purple' | 'rose' | 'blue' | 'cyan'
  /** Stagger delay for the fade-in (e.g. `${0.05 * i}s`). */
  delay?: string
  children: ReactNode
}

const ACCENTS = {
  emerald: { dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.5)]', chip: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  amber:   { dot: 'bg-amber-500   shadow-[0_0_8px_rgba(245,158,11,0.5)]', chip: 'text-amber-300   bg-amber-500/15   border-amber-500/30' },
  purple:  { dot: 'bg-purple-500  shadow-[0_0_8px_rgba(168,85,247,0.5)]', chip: 'text-purple-300  bg-purple-500/15  border-purple-500/30' },
  rose:    { dot: 'bg-rose-500    shadow-[0_0_8px_rgba(244,63,94,0.5)]',  chip: 'text-rose-300    bg-rose-500/15    border-rose-500/30'   },
  blue:    { dot: 'bg-blue-500    shadow-[0_0_8px_rgba(59,130,246,0.5)]', chip: 'text-blue-300    bg-blue-500/15    border-blue-500/30'   },
  cyan:    { dot: 'bg-cyan-500    shadow-[0_0_8px_rgba(6,182,212,0.5)]',  chip: 'text-cyan-300    bg-cyan-500/15    border-cyan-500/30'   },
}

/**
 * Collapsible section header used to group match cards by tournament stage
 * (e.g. "בית A" for group-stage matches, "רבע גמר" for knockout rounds).
 * First section on a page should pass defaultOpen, others collapsed.
 */
export default function MatchSection({
  title, icon, count, subtitle, defaultOpen = false, accent = 'emerald', delay, children,
}: MatchSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const a = ACCENTS[accent]

  return (
    <div className="animate-fade-in-up" style={delay ? { animationDelay: delay } : undefined}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full glass-card rounded-2xl px-4 py-3 flex items-center justify-between hover:bg-white/5 active:scale-[0.99] transition text-right"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-1.5 h-6 rounded-full ${a.dot}`} />
          {icon && <span className="text-xl shrink-0">{icon}</span>}
          <div className="min-w-0 text-right">
            <h3 className="text-sm font-black text-gray-100 truncate">{title}</h3>
            {subtitle && <p className="text-[10px] text-gray-500 font-medium truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {count !== undefined && (
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${a.chip} tabular-nums`}>
              {count}
            </span>
          )}
          <span className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {open && (
        <div className="mt-2 space-y-2 animate-fade-in-up">
          {children}
        </div>
      )}
    </div>
  )
}
