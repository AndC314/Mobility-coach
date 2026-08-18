import { MUSCLE_LABELS, type MuscleScore, type MuscleGroup } from '../data/muscleMap'

const UNTRAINED = '#2e3248'
const PRIMARY_FULL = '#d9472b'
const SECONDARY_FULL = '#f5c842'

function scoreColor(score: number, level: 'primary' | 'secondary'): string {
  if (score === 0) return UNTRAINED
  const target = level === 'secondary' ? SECONDARY_FULL : PRIMARY_FULL
  const t = Math.min(1, score / 100)
  return interpolateColor(UNTRAINED, target, t)
}

function interpolateColor(from: string, to: string, t: number): string {
  const f = hexToRgb(from)
  const toRgb = hexToRgb(to)
  const r = Math.round(f.r + (toRgb.r - f.r) * t)
  const g = Math.round(f.g + (toRgb.g - f.g) * t)
  const b = Math.round(f.b + (toRgb.b - f.b) * t)
  return `rgb(${r},${g},${b})`
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

const FRONT_MUSCLES: MuscleGroup[] = [
  'chest', 'front_delt', 'biceps', 'triceps', 'forearms',
  'abs', 'hip_flexors', 'quads', 'inner_thigh', 'calves',
]

const BACK_MUSCLES: MuscleGroup[] = [
  'traps', 'rear_delt', 'rhomboids', 'lats', 'lower_back',
  'glutes', 'hamstrings', 'calves',
]

interface BodyMapProps {
  scores: MuscleScore[]
}

export default function BodyMap({ scores }: BodyMapProps) {
  const scoreMap = new Map(scores.map((s) => [s.muscle, s]))

  return (
    <div className="space-y-4">
      <MuscleSection
        title="Front"
        muscles={FRONT_MUSCLES}
        scoreMap={scoreMap}
      />
      <MuscleSection
        title="Back"
        muscles={BACK_MUSCLES}
        scoreMap={scoreMap}
      />
      <Legend />
    </div>
  )
}

function MuscleSection({
  title,
  muscles,
  scoreMap,
}: {
  title: string
  muscles: MuscleGroup[]
  scoreMap: Map<MuscleGroup, MuscleScore>
}) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {muscles.map((m) => {
          const s = scoreMap.get(m)
          const score = s?.score ?? 0
          const level = s?.level ?? 'secondary'
          const color = scoreColor(score, level)
          const isActive = score > 0
          const borderColor = isActive
            ? level === 'primary' ? 'rgba(217,71,43,0.5)' : 'rgba(245,200,66,0.4)'
            : '#3e4258'

          return (
            <div
              key={m}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border transition-colors"
              style={{
                background: isActive ? color + '22' : 'transparent',
                borderColor,
              }}
            >
              <div
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ background: color }}
              />
              <span
                className="text-[11px] font-medium"
                style={{ color: isActive ? '#e8e8f0' : '#7a7d96' }}
              >
                {MUSCLE_LABELS[m]}
              </span>
              {score > 0 && (
                <span
                  className="text-[10px] font-bold ml-0.5"
                  style={{ color }}
                >
                  {score}%
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div className="mt-2 flex gap-4 text-[10px] text-muted">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#d9472b] inline-block" />
        Primary
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#f5c842] inline-block" />
        Secondary
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#2e3248] inline-block border border-[#3e4258]" />
        Untrained
      </div>
    </div>
  )
}
