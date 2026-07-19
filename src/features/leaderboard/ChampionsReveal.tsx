import { useEffect, useMemo, useState } from 'react'
import { displayName, type Profile } from '../../types'

const MEDALS = ['🥇', '🥈', '🥉', '', '']
const RANK_LABEL = ['אלוף הליגה', 'סגן אלוף', 'מקום שלישי', 'מקום רביעי', 'מקום חמישי']

/**
 * End-of-tournament grand reveal for the top 5.
 *
 * A full-screen dark overlay that unveils places 5→1 one at a time (suspense),
 * building to the champion with a crown, gold glow and a confetti burst.
 * Purely presentational + CSS/JS animation, no external libs. The parent
 * decides when to mount it (tournament finished) and how to dismiss it.
 */
export default function ChampionsReveal({
  top5,
  myId,
  onClose,
}: {
  top5: Profile[]
  myId?: string
  onClose: () => void
}) {
  // step 0 = nothing shown; step k = places 5..(6-k) revealed. step 5 = champion out.
  const [step, setStep] = useState(0)
  const done = step >= top5.length

  useEffect(() => {
    // Reveal one place every 1.1s, slowest→ champion.
    const timers = top5.map((_, i) => setTimeout(() => setStep(i + 1), 700 + i * 1100))
    return () => timers.forEach(clearTimeout)
  }, [top5.length])

  // Confetti pieces — generated once, only rendered after the champion lands.
  const confetti = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 2.6 + Math.random() * 2.2,
        size: 6 + Math.random() * 8,
        color: ['#fbbf24', '#f59e0b', '#34d399', '#60a5fa', '#f472b6', '#ffffff'][i % 6],
        rot: Math.random() * 360,
        drift: (Math.random() - 0.5) * 160,
      })),
    []
  )

  // Ordered 1st→5th, but each card only becomes visible once `step` passes it.
  // Card for rank r (1-based) reveals at step = top5.length - r + 1.
  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-slate-950/95 backdrop-blur-sm flex flex-col"
      role="dialog"
      aria-label="טקס סיום — חמשת המקומות הראשונים"
    >
      <style>{keyframes}</style>

      {/* Radial spotlight */}
      <div className="pointer-events-none absolute inset-0 cr-spotlight" />

      {/* Confetti */}
      {done && (
        <div className="pointer-events-none absolute inset-0">
          {confetti.map(c => (
            <span
              key={c.id}
              className="absolute top-[-24px] cr-confetti"
              style={{
                left: `${c.left}%`,
                width: c.size,
                height: c.size * 0.4,
                background: c.color,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.dur}s`,
                ['--rot' as string]: `${c.rot}deg`,
                ['--drift' as string]: `${c.drift}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="relative pt-8 pb-2 text-center shrink-0">
        <p className="text-amber-300/80 text-xs font-black uppercase tracking-[0.3em]">ליגת החברים</p>
        <h2 className="text-2xl font-black text-white mt-1 drop-shadow-lg cr-title">
          {done ? '🏆 טקס הסיום 🏆' : 'ורגע האמת…'}
        </h2>
      </div>

      {/* Cards 1→5 */}
      <div className="relative flex-1 overflow-y-auto px-5 flex flex-col justify-center gap-2.5 max-w-md w-full mx-auto">
        {top5.map((p, idx) => {
          const rank = idx + 1
          const revealAt = top5.length - rank + 1 // 5th reveals first, champ last
          const shown = step >= revealAt
          const isChamp = rank === 1
          const isMe = p.id === myId

          return (
            <div
              key={p.id}
              className={`cr-card ${shown ? 'cr-in' : ''} ${isChamp ? 'cr-champ' : ''}`}
              style={{ order: rank }}
            >
              <div
                className={`relative flex items-center gap-3 rounded-2xl px-4 shadow-xl border overflow-hidden ${
                  isChamp ? 'py-5' : 'py-3'
                } ${CARD_STYLE[rank] ?? 'bg-slate-800/80 border-white/10'} ${
                  isMe ? 'ring-2 ring-emerald-400' : ''
                }`}
              >
                {/* Champion crown */}
                {isChamp && shown && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-3xl cr-crown">👑</span>
                )}
                {/* Shine sweep on reveal */}
                {shown && <span className="absolute inset-0 cr-shine" />}

                {/* Rank badge */}
                <div className="shrink-0 w-10 text-center">
                  {rank <= 3 ? (
                    <span className={`${isChamp ? 'text-4xl' : 'text-3xl'} drop-shadow`}>{MEDALS[idx]}</span>
                  ) : (
                    <span className="text-xl font-black text-white/70">{rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <span className={`${isChamp ? 'text-4xl' : 'text-3xl'} drop-shadow shrink-0`}>{p.avatar || '⚽'}</span>

                {/* Name + label */}
                <div className="min-w-0 flex-1 text-right">
                  <p className={`font-black text-white truncate ${isChamp ? 'text-lg' : 'text-sm'}`}>
                    {displayName(p)}
                    {isMe && <span className="text-[10px] text-emerald-300 mr-1">• אתה</span>}
                  </p>
                  <p className={`font-bold ${isChamp ? 'text-amber-200 text-xs' : 'text-white/50 text-[10px]'}`}>
                    {RANK_LABEL[idx]}
                  </p>
                </div>

                {/* Points */}
                <div className="shrink-0 text-center">
                  <span className={`font-black tabular-nums drop-shadow ${isChamp ? 'text-3xl text-amber-200' : 'text-2xl text-white'}`}>
                    {p.total_points}
                  </span>
                  <p className="text-[9px] text-white/40 font-bold">נק׳</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="relative shrink-0 pb-8 pt-3 text-center">
        <button
          onClick={onClose}
          className={`px-6 py-2.5 rounded-full font-black text-sm transition active:scale-95 ${
            done
              ? 'bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/30'
              : 'bg-white/10 text-white/60'
          }`}
        >
          {done ? 'לטבלה המלאה ←' : 'דלג'}
        </button>
      </div>
    </div>
  )
}

const CARD_STYLE: Record<number, string> = {
  1: 'bg-gradient-to-l from-amber-500/90 via-amber-600/80 to-amber-700/70 border-amber-300/60 cr-glow',
  2: 'bg-gradient-to-l from-slate-400/70 to-slate-600/60 border-slate-300/40',
  3: 'bg-gradient-to-l from-orange-600/70 to-orange-800/60 border-orange-400/40',
}

const keyframes = `
.cr-spotlight{background:radial-gradient(120% 80% at 50% 0%,rgba(251,191,36,.18),transparent 60%);}
.cr-title{animation:crPop .5s ease-out both;}
@keyframes crPop{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
.cr-card{opacity:0;transform:translateY(28px) scale(.96);transition:opacity .5s ease,transform .5s cubic-bezier(.22,1.2,.36,1);}
.cr-card.cr-in{opacity:1;transform:translateY(0) scale(1);}
.cr-champ.cr-in{animation:crChamp .7s cubic-bezier(.22,1.4,.36,1) both;}
@keyframes crChamp{0%{opacity:0;transform:translateY(28px) scale(.7)}60%{transform:translateY(-6px) scale(1.06)}100%{opacity:1;transform:translateY(0) scale(1)}}
.cr-glow{animation:crGlow 1.8s ease-in-out infinite;}
@keyframes crGlow{0%,100%{box-shadow:0 0 22px 2px rgba(251,191,36,.35)}50%{box-shadow:0 0 40px 8px rgba(251,191,36,.65)}}
.cr-crown{animation:crCrown 1.6s ease-in-out infinite;}
@keyframes crCrown{0%,100%{transform:translate(-50%,0) rotate(-6deg)}50%{transform:translate(-50%,-4px) rotate(6deg)}}
.cr-shine{background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.35) 50%,transparent 60%);transform:translateX(-120%);animation:crShine .8s ease-out .1s 1;}
@keyframes crShine{to{transform:translateX(120%)}}
.cr-confetti{border-radius:1px;animation-name:crFall;animation-timing-function:linear;animation-iteration-count:1;}
@keyframes crFall{0%{opacity:1;transform:translate(0,0) rotate(var(--rot))}100%{opacity:.9;transform:translate(var(--drift),105vh) rotate(calc(var(--rot) + 540deg))}}
`
