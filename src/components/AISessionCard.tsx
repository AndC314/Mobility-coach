import { useState } from 'react'
import { Card, Tag } from './Card'
import type { SessionPlanItem } from '../db/db'
import { CALISTHENICS_EXERCISES } from '../data/calisthenics'
import { EXERCISE_MUSCLES, MUSCLE_LABELS, type MuscleGroup, type ActivationLevel } from '../data/muscleMap'

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
  const [expanded, setExpanded] = useState(false)
  const totalMin = estimateDuration(plan)
  const muscles = getSessionMuscles(plan)
  const intensity = getIntensityLevel(plan)

  return (
    <div>
      {/* Preview header */}
      <Card className="border-purple/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">🎯</span>
            <h2 className="text-base font-bold">AI Session Plan</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-purple/10 px-2 py-0.5 text-[11px] font-bold text-purple">
              ~{totalMin} min
            </span>
          </div>
        </div>

        {/* Quick summary chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
            {plan.length} exercises
          </span>
          <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-semibold text-teal">
            {plan.reduce((s, p) => s + p.sets, 0)} sets
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            intensity === 'high' ? 'bg-red-400/10 text-red-400' :
            intensity === 'medium' ? 'bg-gold/10 text-gold' :
            'bg-green-400/10 text-green-400'
          }`}>
            {intensity} intensity
          </span>
        </div>

        {/* Muscles worked */}
        <div className="mb-2">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1.5">Muscles targeted</p>
          <div className="flex flex-wrap gap-1">
            {muscles.primary.map((m) => (
              <span key={m} className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                {MUSCLE_LABELS[m]}
              </span>
            ))}
            {muscles.secondary.map((m) => (
              <span key={m} className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                {MUSCLE_LABELS[m]}
              </span>
            ))}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-center text-[11px] font-semibold text-muted hover:text-ink transition-colors pt-1"
        >
          {expanded ? '▲ Hide exercises' : '▼ Show exercises'}
        </button>
      </Card>

      {/* Expanded exercise list */}
      {expanded && (
        <div className="mt-2 space-y-2">
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
      )}
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

function getSessionMuscles(plan: SessionPlanItem[]): { primary: MuscleGroup[]; secondary: MuscleGroup[] } {
  const primary = new Set<MuscleGroup>()
  const secondary = new Set<MuscleGroup>()

  for (const item of plan) {
    const activations = EXERCISE_MUSCLES[item.exerciseId] ?? []
    for (const a of activations) {
      if (a.level === 'primary') primary.add(a.muscle)
      else secondary.add(a.muscle)
    }
  }

  // Remove from secondary anything already in primary
  for (const m of primary) secondary.delete(m)

  return {
    primary: Array.from(primary),
    secondary: Array.from(secondary),
  }
}

function getIntensityLevel(plan: SessionPlanItem[]): 'low' | 'medium' | 'high' {
  const totalSets = plan.reduce((s, p) => s + p.sets, 0)
  const totalMin = estimateDuration(plan)
  if (totalSets >= 20 || totalMin >= 45) return 'high'
  if (totalSets >= 12 || totalMin >= 25) return 'medium'
  return 'low'
}
