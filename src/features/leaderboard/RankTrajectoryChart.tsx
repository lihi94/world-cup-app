import { useState } from 'react'
import type { TrajectoryPlayer } from '../../hooks/useRankTrajectory'

const COLORS = [
  '#f43f5e', '#22c55e', '#f97316', '#3b82f6', '#a855f7', '#06b6d4',
  '#ec4899', '#eab308', '#14b8a6', '#f59e0b', '#84cc16', '#6366f1',
  '#ef4444', '#10b981', '#fb923c', '#8b5cf6', '#0ea5e9', '#d946ef',
  '#65a30d', '#dc2626', '#0d9488',
]

interface Props {
  labels: string[]
  players: TrajectoryPlayer[]
  maxRank: number
}

/**
 * Bump chart: rank (1 = top) on the Y axis, match sequence on the X axis.
 * Click a line or a legend row to isolate that player's trajectory; click
 * again (or "הצג הכל") to go back to the full faded overview.
 */
export default function RankTrajectoryChart({ labels, players, maxRank }: Props) {
  const meIdx = players.findIndex(p => p.isMe)
  const [selected, setSelected] = useState<number | null>(meIdx >= 0 ? meIdx : null)

  if (players.length === 0 || labels.length === 0) return null

  const N = labels.length
  const W = 680, H = 420, mL = 28, mR = 10, mT = 10, mB = 26
  const plotW = W - mL - mR, plotH = H - mT - mB
  const x = (i: number) => mL + (N <= 1 ? 0 : (i * plotW) / (N - 1))
  const y = (r: number) => mT + ((r - 1) * plotH) / (maxRank - 1 || 1)

  const yTicks = [1, ...[5, 10, 15, 20].filter(t => t < maxRank), maxRank].filter((v, i, a) => a.indexOf(v) === i)
  const dayTicks: number[] = []
  const seenLabels = new Set<string>()
  labels.forEach((l, i) => { if (!seenLabels.has(l)) { seenLabels.add(l); dayTicks.push(i) } })
  // Thin out day ticks so labels don't overlap on a narrow phone screen.
  const dayTicksShown = dayTicks.filter((_, i) => i % Math.ceil(dayTicks.length / 7) === 0)

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] text-gray-500">
          {selected !== null
            ? <>מציג מסלול של <span className="text-gray-300 font-bold">{players[selected].name}</span></>
            : 'לחץ על שם לבידוד מסלול'}
        </p>
        {selected !== null && (
          <button
            onClick={() => setSelected(null)}
            className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 shrink-0"
          >
            הצג הכל
          </button>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }}>
        {yTicks.map(t => (
          <g key={t}>
            <line x1={mL} y1={y(t)} x2={W - mR} y2={y(t)} stroke="#ffffff" strokeOpacity={0.06} strokeWidth={1} />
            <text x={mL - 5} y={y(t) + 3} textAnchor="end" fontSize={9} fill="#6b7280">{t}</text>
          </g>
        ))}
        {dayTicksShown.map(i => (
          <text key={i} x={x(i)} y={H - mB + 14} textAnchor="middle" fontSize={8} fill="#6b7280">{labels[i]}</text>
        ))}

        {players.map((p, pi) => {
          const isSel = selected === pi
          const dim = selected !== null && !isSel
          const pts = p.ranks.map((r, i) => `${x(i).toFixed(1)},${y(r).toFixed(1)}`).join(' ')
          return (
            <polyline
              key={p.id}
              points={pts}
              fill="none"
              stroke={COLORS[pi % COLORS.length]}
              strokeOpacity={dim ? 0.1 : isSel ? 1 : 0.55}
              strokeWidth={isSel ? 3 : 1.4}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ cursor: 'pointer' }}
              onClick={() => setSelected(isSel ? null : pi)}
            />
          )
        })}

        {selected !== null && (
          <circle
            cx={x(N - 1)}
            cy={y(players[selected].ranks[N - 1])}
            r={4.5}
            fill={COLORS[selected % COLORS.length]}
            stroke="#0f172a"
            strokeWidth={1.5}
          />
        )}
      </svg>

      <div className="grid grid-cols-2 gap-1 mt-3">
        {players.map((p, pi) => {
          const isSel = selected === pi
          return (
            <button
              key={p.id}
              onClick={() => setSelected(isSel ? null : pi)}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-right transition ${
                isSel ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'
              }`}
            >
              <span className="text-[10px] font-black text-gray-500 w-4 shrink-0">{pi + 1}</span>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[pi % COLORS.length] }} />
              <span className={`text-[11px] truncate flex-1 ${isSel ? 'font-bold text-gray-100' : 'text-gray-300'} ${p.isMe ? 'text-emerald-300' : ''}`}>
                {p.avatar} {p.name}
              </span>
              <span className="text-[10px] text-gray-500 font-bold shrink-0">{p.finalPoints}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
