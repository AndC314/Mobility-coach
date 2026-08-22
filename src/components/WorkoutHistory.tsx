import { useLiveQuery } from 'dexie-react-hooks'
import { Card } from './Card'
import ExerciseIcon from './ExerciseIcon'
import { db, type CalisthenicsExerciseId } from '../db/db'
import { getExerciseDef } from '../data/calisthenics'

interface DaySession {
  date: string
  exercises: { id: CalisthenicsExerciseId; bestValue: number; sets: number; unit: string }[]
  totalSets: number
  totalVolume: number
  durationMin: number
}

function relativeDate(dateStr: string): string {
  const today = new Date()
  const d = new Date(dateStr + 'T12:00:00')
  const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function WorkoutHistory() {
  const logs = useLiveQuery(
    () => db.calisthenicsLogs.orderBy('date').reverse().limit(200).toArray(),
    [],
    []
  )
  const sessions = useLiveQuery(
    () => db.sessions.orderBy('date').reverse().limit(50).toArray(),
    [],
    []
  )

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <p className="py-4 text-center text-sm text-muted">No workouts logged yet</p>
      </Card>
    )
  }

  // Group logs by date
  const byDate = new Map<string, typeof logs>()
  for (const log of logs) {
    const arr = byDate.get(log.date) || []
    arr.push(log)
    byDate.set(log.date, arr)
  }

  // Build day sessions
  const daySessions: DaySession[] = []
  for (const [date, dayLogs] of byDate) {
    const exerciseMap = new Map<CalisthenicsExerciseId, { bestValue: number; sets: number }>()
    for (const log of dayLogs) {
      const existing = exerciseMap.get(log.exerciseId)
      if (existing) {
        existing.sets += log.sets || 1
        existing.bestValue = Math.max(existing.bestValue, log.value)
      } else {
        exerciseMap.set(log.exerciseId, { bestValue: log.value, sets: log.sets || 1 })
      }
    }

    const exercises = Array.from(exerciseMap).map(([id, data]) => {
      const def = getExerciseDef(id)
      return { id, bestValue: data.bestValue, sets: data.sets, unit: def?.unit || '' }
    })

    const totalSets = exercises.reduce((s, e) => s + e.sets, 0)
    const totalVolume = exercises.reduce((s, e) => s + e.bestValue * e.sets, 0)

    // Try to find matching CompletedSession for duration
    const matchingSession = sessions?.find((s) => s.date === date && s.type === 'calisthenics')
    const durationMin = matchingSession?.durationMin || 0

    daySessions.push({ date, exercises, totalSets, totalVolume, durationMin })
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-ink">Workout History</h2>
      {daySessions.slice(0, 20).map((day) => (
        <Card key={day.date} className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-ink">{relativeDate(day.date)}</span>
            <span className="text-[10px] text-muted">
              {new Date(day.date + 'T12:00:00').toLocaleDateString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric'
              })}
            </span>
          </div>

          {/* Summary chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-purple/10 px-2.5 py-1 text-[11px] font-semibold text-purple">
              {day.exercises.length} exercise{day.exercises.length > 1 ? 's' : ''}
            </span>
            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
              {day.totalSets} sets
            </span>
            <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-semibold text-teal">
              {day.totalVolume} vol
            </span>
            {day.durationMin > 0 && (
              <span className="rounded-full bg-gold/10 px-2.5 py-1 text-[11px] font-semibold text-gold">
                {day.durationMin}min
              </span>
            )}
          </div>

          {/* Exercise grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {day.exercises.slice(0, 6).map((ex) => {
              const def = getExerciseDef(ex.id)
              if (!def) return null
              return (
                <div key={ex.id} className="flex items-center gap-1.5 rounded-lg bg-card2 px-2 py-1.5">
                  <ExerciseIcon exerciseId={ex.id} fallbackEmoji={def.icon} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-ink">{def.name}</p>
                    <p className="text-[10px] text-muted">{ex.bestValue}{ex.unit} × {ex.sets}s</p>
                  </div>
                </div>
              )
            })}
          </div>
          {day.exercises.length > 6 && (
            <p className="text-[10px] text-muted text-center">+{day.exercises.length - 6} more</p>
          )}
        </Card>
      ))}
    </div>
  )
}
