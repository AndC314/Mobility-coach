import { useState, useEffect } from 'react'
import { Card, Tag } from './Card'
import ExerciseIcon from './ExerciseIcon'
import { useCalisthenicsSession } from '../hooks/useCalisthenicsSession'
import { db, DEFAULT_PREFERENCES } from '../db/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { getExerciseDef } from '../data/calisthenics'
import { computeMuscleScores, computeAdaptiveCaps, computeSessionLoadForecast } from '../data/muscleMap'
import type { SessionLoadForecast } from '../data/muscleMap'
import { todayIso } from '../lib/date'
import type { SessionExercise, Intensity } from '../lib/calisthenicsSession'
import type { Equipment } from '../data/calisthenics'

const INTENSITY_OPTIONS: { id: Intensity; label: string; icon: string }[] = [
  { id: 'light', label: 'Light', icon: '~' },
  { id: 'moderate', label: 'Moderate', icon: '↑' },
  { id: 'push_it', label: 'Push it', icon: '⚡' },
]

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
  const [intensity, setIntensity] = useState<Intensity>('moderate')

  useEffect(() => {
    if (prefs?.availableEquipment) setEquipment(prefs.availableEquipment)
  }, [prefs])

  const { session, regenerate, isLoading } = useCalisthenicsSession(equipment, intensity)

  const today = todayIso()
  const loadForecast = useLiveQuery(async () => {
    if (!session) return []
    const [ty, tm, td] = today.split('-').map(Number)
    const twoWeeksAgo = new Date(ty, tm - 1, td - 14)
    const twoWeeksStr = `${twoWeeksAgo.getFullYear()}-${String(twoWeeksAgo.getMonth() + 1).padStart(2, '0')}-${String(twoWeeksAgo.getDate()).padStart(2, '0')}`
    const logs = await db.calisthenicsLogs.where('date').aboveOrEqual(twoWeeksStr).toArray()
    const adaptiveCaps = computeAdaptiveCaps(logs, today)
    const scores = computeMuscleScores(logs, today, adaptiveCaps)
    return computeSessionLoadForecast(
      session.exercises.map(e => ({ exerciseId: e.exerciseId, targetSets: e.targetSets, targetValue: e.targetValue })),
      scores,
      adaptiveCaps
    )
  }, [session, today], []) as SessionLoadForecast[]

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
          {INTENSITY_OPTIONS.map((opt) => {
            const active = intensity === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setIntensity(opt.id)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold border transition-colors ${
                  active
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                    : 'bg-card2 text-muted border-border opacity-50'
                }`}
              >
                {opt.icon} {opt.label}
              </button>
            )
          })}
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

        {loadForecast.length > 0 && (
          <div className="rounded-lg bg-teal/5 border border-teal/20 px-3 py-2">
            <div className="text-[10px] font-semibold text-teal mb-1">Muscle load after session</div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {loadForecast.slice(0, 5).map((f) => (
                <span key={f.muscle} className="text-[10px] text-ink/70">
                  {f.label}: <span className="text-muted">{f.currentScore}%</span>
                  {' → '}
                  <span className="font-semibold text-teal">{f.projectedScore}%</span>
                </span>
              ))}
            </div>
          </div>
        )}

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
