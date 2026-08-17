import { useExerciseTrend, type TrendDirection } from '../hooks/useExerciseTrend'
import type { CalisthenicsExerciseId } from '../db/db'

const TREND_COLORS: Record<TrendDirection, string> = {
  improving: '#2ec4b6',
  plateau: '#e8622a',
  declining: '#7a7d96',
}

const TREND_ARROWS: Record<TrendDirection, string> = {
  improving: '↑',
  plateau: '→',
  declining: '↓',
}

export default function TrendIndicator({ exerciseId }: { exerciseId: CalisthenicsExerciseId }) {
  const trend = useExerciseTrend(exerciseId)

  if (!trend || trend.recentValues.length < 3) return null

  const color = TREND_COLORS[trend.trend]
  const values = trend.recentValues.map((v) => v.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  // Build SVG sparkline points
  const width = 44
  const height = 14
  const padding = 1
  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2)
    const y = height - padding - ((v - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  return (
    <span className="inline-flex items-center gap-0.5 ml-1.5">
      <svg width={width} height={height} className="inline-block">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Endpoint dot */}
        {values.length > 0 && (() => {
          const lastX = padding + ((values.length - 1) / (values.length - 1)) * (width - padding * 2)
          const lastY = height - padding - ((values[values.length - 1] - min) / range) * (height - padding * 2)
          return <circle cx={lastX} cy={lastY} r="2" fill={color} />
        })()}
      </svg>
      <span className="text-[10px] font-bold" style={{ color }}>
        {TREND_ARROWS[trend.trend]}
      </span>
      {trend.isNewPR && (
        <span className="rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-bold text-purple-400 border border-purple-500/30">
          PR!
        </span>
      )}
    </span>
  )
}
