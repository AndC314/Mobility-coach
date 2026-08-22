import { useState, useEffect, useRef } from 'react'
import { Card } from './Card'
import ExercisePicker from './ExercisePicker'
import ExerciseIcon from './ExerciseIcon'
import { getExerciseDef } from '../data/calisthenics'
import { logCalisthenicsBase } from '../hooks/useCalisthenics'
import { useWakeLock } from '../hooks/useWakeLock'
import { todayIso } from '../lib/date'
import type { CalisthenicsExerciseId } from '../db/db'
import type { CelebrationData } from './WorkoutCelebration'

interface LoggedSet {
  exerciseId: CalisthenicsExerciseId
  value: number
  setNumber: number
  timestamp: number
}

interface Props {
  onCelebrate: (data: CelebrationData) => void
}

type Phase = 'setup' | 'active' | 'rest'

export default function LiveTracker({ onCelebrate }: Props) {
  const [started, setStarted] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [phase, setPhase] = useState<Phase>('setup')

  // Exercise selection
  const [currentExercise, setCurrentExercise] = useState<CalisthenicsExerciseId | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [value, setValue] = useState('')

  // Rest timer
  const [restSec, setRestSec] = useState(90)
  const [restRemaining, setRestRemaining] = useState(0)

  // Session log
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([])

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useWakeLock(started)

  // Session elapsed timer
  useEffect(() => {
    if (started && startTime) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [started, startTime])

  // Rest countdown
  useEffect(() => {
    if (phase === 'rest' && restRemaining > 0) {
      restRef.current = setInterval(() => {
        setRestRemaining((r) => {
          if (r <= 1) {
            setPhase('active')
            return 0
          }
          return r - 1
        })
      }, 1000)
    }
    return () => {
      if (restRef.current) clearInterval(restRef.current)
    }
  }, [phase, restRemaining])

  function handleStart() {
    setStarted(true)
    setStartTime(Date.now())
    setPhase('active')
  }

  function handleSelectExercise(id: CalisthenicsExerciseId) {
    setCurrentExercise(id)
    setValue('')
    setPickerOpen(false)
  }

  function handleLogSet() {
    if (!currentExercise || !value) return
    const v = Number(value)
    if (v <= 0) return

    const exerciseSets = loggedSets.filter((s) => s.exerciseId === currentExercise)
    const newSet: LoggedSet = {
      exerciseId: currentExercise,
      value: v,
      setNumber: exerciseSets.length + 1,
      timestamp: Date.now(),
    }
    setLoggedSets([...loggedSets, newSet])
    setValue('')
    setPhase('rest')
    setRestRemaining(restSec)
  }

  function skipRest() {
    setPhase('active')
    setRestRemaining(0)
  }

  async function handleFinish() {
    if (loggedSets.length === 0) return
    const date = todayIso()

    // Group by exercise and save
    const byExercise = new Map<CalisthenicsExerciseId, LoggedSet[]>()
    for (const s of loggedSets) {
      const arr = byExercise.get(s.exerciseId) || []
      arr.push(s)
      byExercise.set(s.exerciseId, arr)
    }

    const celebrationExercises: CelebrationData['exercises'] = []

    for (const [exId, sets] of byExercise) {
      const ex = getExerciseDef(exId)!
      const bestValue = Math.max(...sets.map((s) => s.value))
      await logCalisthenicsBase({
        exerciseId: exId,
        metric: ex.metric,
        value: bestValue,
        sets: sets.length,
        date,
        restSeconds: restSec,
      })
      celebrationExercises.push({ id: exId, value: bestValue, sets: sets.length })
    }

    // Reset state
    setStarted(false)
    setStartTime(null)
    setElapsed(0)
    setPhase('setup')
    setCurrentExercise(null)
    setLoggedSets([])

    onCelebrate({ exercises: celebrationExercises, date })
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ─── SETUP VIEW (not started) ───
  if (!started) {
    return (
      <Card>
        <div className="text-center py-4">
          <div className="text-3xl mb-3">&#9201;</div>
          <h2 className="text-lg font-bold text-ink mb-2">Live Tracking</h2>
          <p className="text-sm text-muted mb-4">
            Track each set in real time with rest timers between sets.
          </p>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-muted mb-1">Rest between sets</label>
            <div className="flex items-center justify-center gap-3">
              {[60, 90, 120, 180].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setRestSec(sec)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    restSec === sec
                      ? 'bg-teal/20 text-teal border border-teal/40'
                      : 'bg-card2 text-muted border border-border'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleStart}
            className="w-full rounded-full bg-teal/15 py-3 text-sm font-bold text-teal border border-teal/40"
          >
            Start Session
          </button>
        </div>
      </Card>
    )
  }

  // ─── ACTIVE SESSION VIEW ───
  const currentExDef = currentExercise ? getExerciseDef(currentExercise) : null
  const currentSetsForExercise = currentExercise
    ? loggedSets.filter((s) => s.exerciseId === currentExercise)
    : []

  // Summary grouped by exercise
  const exerciseSummary = Array.from(
    loggedSets.reduce((acc, s) => {
      const existing = acc.get(s.exerciseId)
      if (existing) {
        existing.sets++
        existing.bestValue = Math.max(existing.bestValue, s.value)
      } else {
        acc.set(s.exerciseId, { sets: 1, bestValue: s.value })
      }
      return acc
    }, new Map<CalisthenicsExerciseId, { sets: number; bestValue: number }>())
  )

  return (
    <div className="space-y-3">
      {/* Session header */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/15">
              <span className="text-lg font-black text-teal font-mono">{formatTime(elapsed)}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted">Session active</p>
              <p className="text-sm font-bold text-ink">{loggedSets.length} sets logged</p>
            </div>
          </div>
          <button
            onClick={handleFinish}
            disabled={loggedSets.length === 0}
            className="rounded-full bg-accent/15 px-4 py-2 text-xs font-bold text-accent border border-accent/40 disabled:opacity-40"
          >
            Finish
          </button>
        </div>
      </Card>

      {/* Rest timer overlay (inline) */}
      {phase === 'rest' && (
        <Card className="border-teal/30">
          <div className="text-center py-3">
            <p className="text-xs font-semibold text-muted mb-1">Rest</p>
            <p className="text-3xl font-black text-teal font-mono">{formatTime(restRemaining)}</p>
            <button
              onClick={skipRest}
              className="mt-3 rounded-full bg-card2 px-4 py-1.5 text-xs font-semibold text-muted border border-border"
            >
              Skip rest
            </button>
          </div>
        </Card>
      )}

      {/* Current exercise + log set */}
      {phase === 'active' && (
        <Card>
          {!currentExercise || pickerOpen ? (
            <>
              <h3 className="mb-2 text-sm font-bold text-ink">
                {loggedSets.length === 0 ? 'Pick your first exercise' : 'Next exercise'}
              </h3>
              <ExercisePicker
                mode="single"
                selected={currentExercise ? [currentExercise] : []}
                onToggle={handleSelectExercise}
              />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ExerciseIcon exerciseId={currentExDef!.id} fallbackEmoji={currentExDef!.icon} size="md" />
                  <div>
                    <p className="text-sm font-bold text-ink">{currentExDef!.name}</p>
                    <p className="text-[11px] text-muted">
                      Set {currentSetsForExercise.length + 1}
                      {currentSetsForExercise.length > 0 && ` · Last: ${currentSetsForExercise[currentSetsForExercise.length - 1].value}${currentExDef!.unit}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPickerOpen(true)}
                  className="text-xs text-muted hover:text-accent"
                >
                  Change
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={currentExDef!.metric === 'hold_sec' ? 'Seconds' : 'Reps'}
                  className="flex-1 rounded-lg border border-border bg-card2 px-3 py-2.5 text-sm text-ink placeholder:text-muted"
                  autoFocus
                />
                <button
                  onClick={handleLogSet}
                  disabled={!value || Number(value) <= 0}
                  className="rounded-lg bg-teal/15 px-5 py-2.5 text-sm font-bold text-teal border border-teal/40 disabled:opacity-40"
                >
                  Log set
                </button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Session summary so far */}
      {exerciseSummary.length > 0 && (
        <Card>
          <h3 className="mb-2 text-xs font-bold text-muted uppercase tracking-wide">This session</h3>
          <div className="space-y-1.5">
            {exerciseSummary.map(([exId, data]) => {
              const ex = getExerciseDef(exId)!
              return (
                <div key={exId} className="flex items-center justify-between rounded-lg bg-card2 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-sm text-ink">
                    <ExerciseIcon exerciseId={ex.id} fallbackEmoji={ex.icon} size="sm" /> {ex.name}
                  </span>
                  <span className="text-xs text-muted">
                    {data.sets} set{data.sets > 1 ? 's' : ''} · best {data.bestValue}{ex.unit}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
