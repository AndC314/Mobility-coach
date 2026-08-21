import { useState, useEffect } from 'react'
import { Card, Tag } from './Card'
import ExerciseIcon from './ExerciseIcon'
import { useCalisthenicsSession } from '../hooks/useCalisthenicsSession'
import { db, DEFAULT_PREFERENCES } from '../db/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { getExerciseDef } from '../data/calisthenics'
import type { SessionExercise } from '../lib/calisthenicsSession'
import type { Equipment } from '../data/calisthenics'

const EQUIPMENT_OPTIONS: { id: Equipment; label: string; icon: string }[] = [
  { id: 'pull_up_bar', label: 'Pull-up bar', icon: '🏋️' },
  { id: 'parallel_bars', label: 'Dip station', icon: '🪵' },
  { id: 'parallettes', label: 'Parallettes', icon: '🤸' },
]

interface Props {
  onStartSession?: (exercises: SessionExercise[]) => void
}

export default function TodayStrengthCard({ onStartSession }: Props) {
  const prefs = useLiveQuery(() => db.preferences.get(1))
  const [equipment, setEquipment] = useState<string[]>(DEFAULT_PREFERENCES.availableEquipment)

  useEffect(() => {
    if (prefs?.availableEquipment) setEquipment(prefs.availableEquipment)
  }, [prefs])

  const { session, regenerate, isLoading } = useCalisthenicsSession(equipment)

  function toggleEquipment(id: string) {
    setEquipment((prev) => {
      const next = prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
      db.preferences.update(1, { availableEquipment: next })
      return next
    })
  }

  if (isLoading) return null
  if (!session) return null

  return (
    <Card className="border-l-2 border-l-purple-500/50">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink">Today's Strength</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Tag color="#a78bfa">{session.focus}</Tag>
              <span className="text-[10px] text-muted">
                ~{session.totalDurationMin}min &middot; {session.exercises.length} exercises
              </span>
            </div>
          </div>
          <button
            onClick={regenerate}
            className="rounded-full bg-card2 border border-border px-2.5 py-1.5 text-[10px] font-semibold text-muted"
          >
            Shuffle
          </button>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {EQUIPMENT_OPTIONS.map((eq) => {
            const active = equipment.includes(eq.id)
            return (
              <button
                key={eq.id}
                onClick={() => toggleEquipment(eq.id)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold border transition-colors ${
                  active
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                    : 'bg-card2 text-muted border-border opacity-50'
                }`}
              >
                {eq.icon} {eq.label}
              </button>
            )
          })}
        </div>

        <div className="space-y-1.5">
          {session.exercises.map((ex) => (
            <div
              key={ex.exerciseId}
              className="flex items-center gap-2.5 rounded-lg bg-card2 px-3 py-2"
            >
              <ExerciseIcon exerciseId={ex.exerciseId} fallbackEmoji={getExerciseDef(ex.exerciseId as any)?.icon ?? '🏋️'} size="md" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-ink truncate">{ex.name}</div>
                <div className="text-[10px] text-muted/70 truncate">{getExerciseDef(ex.exerciseId as any)?.description}</div>
                <div className="text-[10px] text-muted">{ex.reason}</div>
              </div>
              <div className="flex-shrink-0 text-right ml-2">
                <span className="text-xs font-bold text-purple-400">
                  {ex.targetSets}×{ex.targetValue}{ex.unit === 's' ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>

        {onStartSession && (
          <button
            onClick={() => onStartSession(session.exercises)}
            className="w-full rounded-xl bg-purple-500/15 border border-purple-500/30 py-2.5 text-xs font-bold text-purple-400"
          >
            Start session
          </button>
        )}
      </div>
    </Card>
  )
}
