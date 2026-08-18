import { useAvatarStats, type AvatarAxis } from '../hooks/useAvatarStats'
import { Card } from './Card'

interface SkillRadarProps {
  axes?: AvatarAxis[]
  size?: number
  recoveryReadiness?: {
    Push: number
    Pull: number
    Legs: number
    Core: number
    Mobility: number
  }
}

const AXIS_CAPS: Record<string, string> = {
  push: '40 reps',
  pull: '15 reps',
  core: '120s hold',
  mobility: '60 sessions',
  grappling: '50 classes',
}

const AXIS_COLORS = {
  push: '#e8622a',
  pull: '#2ec4b6',
  core: '#f5c842',
  mobility: '#a78bfa',
  grappling: '#7a7d96'
}

export default function SkillRadar({ axes, size = 260, recoveryReadiness }: SkillRadarProps) {
  const stats = useAvatarStats()
  const data = axes ?? stats?.axes ?? []

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted">Log some training to see your radar</p>
      </div>
    )
  }

  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.38
  const n = data.length
  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2

  function polarToXY(angle: number, r: number): [number, number] {
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  }

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0]

  // Data polygon points for skill
  const dataPoints = data.map((axis, i) => {
    const angle = startAngle + i * angleStep
    const r = (axis.value / 100) * radius
    return polarToXY(angle, r)
  })
  const dataPath = dataPoints.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ') + ' Z'

  // Data polygon points for readiness (if provided)
  const readinessPoints = recoveryReadiness
    ? data.map((axis, i) => {
        const angle = startAngle + i * angleStep
        let readinessValue = 100 // default

        // Map axis key to readiness object property
        if (axis.key === 'push') readinessValue = recoveryReadiness.Push
        else if (axis.key === 'pull') readinessValue = recoveryReadiness.Pull
        else if (axis.key === 'core') readinessValue = recoveryReadiness.Core
        else if (axis.key === 'mobility') readinessValue = recoveryReadiness.Mobility ?? 100
        else if (axis.key === 'grappling') readinessValue = recoveryReadiness.Legs ?? 100

        const r = (readinessValue / 100) * radius
        return polarToXY(angle, r)
      })
    : []
  const readinessPath = readinessPoints.length > 0
    ? readinessPoints.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ') + ' Z'
    : ''

  return (
    <Card>
      <h2 className="text-base font-bold text-ink">Training Profile</h2>
      <p className="mb-3 text-[11px] text-muted">Your best performance across disciplines, normalized to mastery caps</p>

      <div className="flex flex-col items-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          {/* Grid rings */}
          {rings.map((pct) => {
            const points = Array.from({ length: n }, (_, i) => {
              const angle = startAngle + i * angleStep
              return polarToXY(angle, radius * pct)
            })
            const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ') + ' Z'
            return (
              <path
                key={pct}
                d={path}
                fill="none"
                stroke="#2e3248"
                strokeWidth={pct === 1 ? 1.5 : 0.75}
                opacity={pct === 1 ? 0.8 : 0.4}
              />
            )
          })}

          {/* Axis lines */}
          {data.map((_, i) => {
            const angle = startAngle + i * angleStep
            const [x, y] = polarToXY(angle, radius)
            return (
              <line
                key={`axis-${i}`}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="#2e3248"
                strokeWidth={0.75}
                opacity={0.5}
              />
            )
          })}

          {/* Data polygon */}
          <path
            d={dataPath}
            fill="rgba(46, 196, 182, 0.12)"
            stroke="#2ec4b6"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Readiness polygon (if provided) */}
          {readinessPath && (
            <path
              d={readinessPath}
              fill="none"
              stroke="#a78bfa"
              strokeWidth={2}
              strokeDasharray="4 2"
              opacity={0.5}
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {dataPoints.map(([x, y], i) => (
            <circle
              key={`pt-${i}`}
              cx={x}
              cy={y}
              r={3.5}
              fill={AXIS_COLORS[data[i].key] ?? '#2ec4b6'}
              stroke="#1a1d2e"
              strokeWidth={1.5}
            />
          ))}

          {/* Labels */}
          {data.map((axis, i) => {
            const angle = startAngle + i * angleStep
            const labelRadius = radius + 22
            const [lx, ly] = polarToXY(angle, labelRadius)
            const anchor = lx < cx - 5 ? 'end' : lx > cx + 5 ? 'start' : 'middle'
            return (
              <text
                key={`label-${i}`}
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                className="text-[10px] font-semibold"
                fill={AXIS_COLORS[axis.key] ?? '#7a7d96'}
              >
                {axis.label}
              </text>
            )
          })}
        </svg>

        {readinessPath && (
          <div className="mt-2 flex items-center gap-2 text-[10px] text-muted">
            <span className="inline-block w-4 border-t-2 border-dashed border-purple-400 opacity-50" />
            <span>Recovery readiness</span>
          </div>
        )}
      </div>

      {/* Axis breakdown */}
      <div className="mt-4 space-y-2.5">
        {data.map((axis) => {
          const color = AXIS_COLORS[axis.key] ?? '#7a7d96'
          const pct = Math.round(axis.value)
          const rawLabel = axis.raw != null
            ? `${axis.raw}${axis.unit === 'reps' ? ' reps' : axis.unit === 's' ? 's' : axis.unit ? ` ${axis.unit}` : ''}`
            : '—'
          const cap = AXIS_CAPS[axis.key] ?? ''
          return (
            <div key={axis.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color }}>{axis.label}</span>
                <span className="text-xs font-bold text-ink">{rawLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="text-[10px] text-muted w-20 text-right">/ {cap}</span>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
