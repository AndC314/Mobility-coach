import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ExerciseCard from '../components/ExerciseCard'
import { Card } from '../components/Card'
import { SORENESS_OPTIONS, RECOVERY_SEQUENCES, getSequenceExercises } from '../data/recovery'
import { db, type SorenessArea } from '../db/db'
import { upsertTodaySession } from '../hooks/useSessions'
import { usePreferences } from '../hooks/usePreferences'
import { todayIso } from '../lib/date'

export default function Recovery() {
  const [searchParams] = useSearchParams()
  const [selected, setSelected] = useState<SorenessArea[]>([])
  const [active, setActive] = useState<SorenessArea | null>(null)
  const [elapsed, setElapsed] = useState<Record<string, number>>({})
  const { preferences } = usePreferences()

  useEffect(() => {
    const area = searchParams.get('area') as SorenessArea | null
    if (area) {
      setSelected([area])
      setActive(area)
      setElapsed({})
    }
  }, [searchParams])

  async function toggleArea(area: SorenessArea) {
    const next = selected.includes(area) ? selected.filter((a) => a !== area) : [...selected, area]
    setSelected(next)

    const today = todayIso()
    const existing = await db.sorenessLogs.where('date').equals(today).first()
    if (existing) {
      await db.sorenessLogs.update(existing.id!, { areas: next })
    } else {
      await db.sorenessLogs.add({ date: today, areas: next })
    }
  }

  function startSequence(area: SorenessArea) {
    setActive(area)
    setElapsed({})
  }

  async function handleComplete(id: string, area: SorenessArea, elapsedSec: number) {
    const seq = RECOVERY_SEQUENCES[area]
    const exercises = getSequenceExercises(area)
    const plannedSec = exercises.reduce((s, ex) => s + ex.timerSec, 0)

    const next = { ...elapsed, [id]: elapsedSec }
    setElapsed(next)

    const actualSec = Object.values(next).reduce((s, v) => s + v, 0)
    await upsertTodaySession({
      type: 'recovery',
      label: `${seq.label} recovery`,
      plannedSec,
      actualSec,
      exerciseIds: Object.keys(next)
    })
  }

  if (active) {
    const seq = RECOVERY_SEQUENCES[active]
    const exercises = getSequenceExercises(active)
    const completedIds = Object.keys(elapsed)
    const allDone = completedIds.length === exercises.length
    const plannedSec = exercises.reduce((s, ex) => s + ex.timerSec, 0)
    const actualSec = Object.values(elapsed).reduce((s, v) => s + v, 0)
    const percent = plannedSec > 0 ? Math.min(100, Math.round((actualSec / plannedSec) * 100)) : 0

    return (
      <div className="space-y-4 pb-4 fade-in">
        <button onClick={() => setActive(null)} className="text-sm font-semibold text-teal">
          ← Back to recovery
        </button>
        <div>
          <p className="text-sm text-muted">
            {seq.icon} {seq.label} · {seq.durationMin} min
          </p>
          <h1 className="text-2xl font-extrabold">Recovery sequence</h1>
        </div>
        {exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            index={i}
            name={ex.name}
            sets={ex.sets}
            setup={ex.setup}
            cue={ex.cue}
            feel={ex.feel}
            caution={ex.caution}
            timerSec={ex.timerSec}
            sides={ex.sides}
            color="#e8622a"
            completed={completedIds.includes(ex.id)}
            soundEnabled={preferences.soundEnabled}
            onComplete={(elapsedSec) => handleComplete(ex.id, active, elapsedSec)}
          />
        ))}
        {completedIds.length > 0 && (
          <Card
            className={`text-center text-sm font-bold ${
              allDone ? 'border-teal/40 bg-teal/10 text-teal' : 'border-gold/40 bg-gold/10 text-gold'
            }`}
          >
            {allDone ? '✓ Recovery session logged' : `Session logged · ${percent}% of full sequence`}
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4 fade-in">
      <div>
        <p className="text-sm text-muted">Where are you sore?</p>
        <h1 className="text-2xl font-extrabold">Recovery</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SORENESS_OPTIONS.map((opt) => {
          const isSelected = selected.includes(opt.area)
          const seq = RECOVERY_SEQUENCES[opt.area]
          return (
            <Card
              key={opt.area}
              className={`relative ${isSelected ? 'border-accent/50 bg-accent/10' : ''}`}
            >
              <button onClick={() => toggleArea(opt.area)} className="flex w-full flex-col items-start gap-1">
                <span className="text-2xl">{opt.icon}</span>
                <span className="text-sm font-bold text-ink">{opt.label}</span>
                <span className="text-xs text-muted">{seq.durationMin} min sequence</span>
              </button>
              {isSelected && (
                <button
                  onClick={() => startSequence(opt.area)}
                  className="mt-3 w-full rounded-full bg-accent/20 py-2 text-xs font-bold text-accent border border-accent/40"
                >
                  Start
                </button>
              )}
            </Card>
          )
        })}
      </div>

      {selected.length === 0 && (
        <p className="text-center text-xs text-muted pt-2">
          Select one or more areas to log soreness and generate a recovery sequence.
        </p>
      )}
    </div>
  )
}
