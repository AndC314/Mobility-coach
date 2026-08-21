import { Card, Tag } from './Card'
import type { SessionPlanItem } from '../db/db'
import { CALISTHENICS_EXERCISES } from '../data/calisthenics'

const CATEGORY_COLORS: Record<string, string> = {
  push: '#3b82f6',
  pull: '#10b981',
  legs: '#f59e0b',
  core: '#8b5cf6',
  mobility: '#06b6d4',
}

interface AISessionCardProps {
  plan: SessionPlanItem[]
}

export default function AISessionCard({ plan }: AISessionCardProps) {
  const totalMin = estimateDuration(plan)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">🎯</span>
          <h2 className="text-base font-bold">AI Session Plan</h2>
        </div>
        <span className="text-sm font-semibold text-muted">~{totalMin} min</span>
      </div>

      <div className="space-y-2">
        {plan.map((item, i) => (
          <Card key={`${item.exerciseId}-${i}`} className="p-3">
            <div className="flex items-center gap-3">
              <div
                className="h-8 w-1 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[item.category] ?? '#6b7280' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink truncate">{item.name}</span>
                  <Tag color={CATEGORY_COLORS[item.category] ?? '#6b7280'}>{item.category}</Tag>
                </div>
                {(() => {
                  const ex = CALISTHENICS_EXERCISES.find((e: any) => e.id === item.exerciseId)
                  return ex?.description ? (
                    <div className="mt-0.5 text-[11px] text-muted/70">{ex.description}</div>
                  ) : null
                })()}
                <div className="mt-0.5 text-xs text-muted">
                  {item.sets}× {item.reps} · {item.restSec}s rest
                </div>
                {item.notes && (
                  <div className="mt-1 text-xs text-accent italic">{item.notes}</div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function estimateDuration(plan: SessionPlanItem[]): number {
  let totalSec = 0
  for (const item of plan) {
    const repsNum = parseInt(item.reps) || 8
    const isHold = item.reps.includes('s')
    const workSec = isHold ? repsNum : repsNum * 3
    totalSec += item.sets * (workSec + item.restSec)
  }
  return Math.round(totalSec / 60)
}
