import { useState } from 'react'
import { Card, Tag } from './Card'
import { db, type CalisthenicsExerciseId, type CalisthenicsMetric } from '../db/db'
import { CALISTHENICS_EXERCISES } from '../data/calisthenics'
import { LEVEL_LABELS, LEVEL_COLORS } from '../data/progressionChains'

interface AssessmentExercise {
  exerciseId: CalisthenicsExerciseId
  label: string
  metric: CalisthenicsMetric
  unit: string
  placeholder: string
  levelThresholds: [number, number, number, number, number]
}

const ASSESSMENT_EXERCISES: AssessmentExercise[] = [
  {
    exerciseId: 'pushups',
    label: 'Push-ups',
    metric: 'reps',
    unit: 'reps',
    placeholder: 'Max reps in one set',
    levelThresholds: [1, 10, 20, 30, 40],
  },
  {
    exerciseId: 'pullups',
    label: 'Pull-ups',
    metric: 'reps',
    unit: 'reps',
    placeholder: 'Max strict reps',
    levelThresholds: [0, 1, 5, 10, 15],
  },
  {
    exerciseId: 'dips',
    label: 'Dips',
    metric: 'reps',
    unit: 'reps',
    placeholder: 'Max strict reps',
    levelThresholds: [0, 1, 5, 10, 15],
  },
  {
    exerciseId: 'squats',
    label: 'Squats',
    metric: 'reps',
    unit: 'reps',
    placeholder: 'Max reps in one set',
    levelThresholds: [5, 15, 30, 40, 50],
  },
  {
    exerciseId: 'plank',
    label: 'Plank Hold',
    metric: 'hold_sec',
    unit: 'seconds',
    placeholder: 'Max hold time (seconds)',
    levelThresholds: [15, 30, 60, 90, 120],
  },
  {
    exerciseId: 'hollow_body_hold',
    label: 'Hollow Body Hold',
    metric: 'hold_sec',
    unit: 'seconds',
    placeholder: 'Max hold time (seconds)',
    levelThresholds: [5, 15, 30, 45, 60],
  },
]

function getLevel(value: number, thresholds: number[]): number {
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]) return i + 1
  }
  return 1
}

interface Props {
  onClose: () => void
}

export default function LevelAssessment({ onClose }: Props) {
  const [step, setStep] = useState(0)
  const [results, setResults] = useState<Map<CalisthenicsExerciseId, number>>(new Map())
  const [inputValue, setInputValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const current = ASSESSMENT_EXERCISES[step]

  async function handleNext() {
    const val = parseInt(inputValue, 10)
    if (!isNaN(val) && val >= 0) {
      const updated = new Map(results)
      updated.set(current.exerciseId, val)
      setResults(updated)
    }
    setInputValue('')

    if (step < ASSESSMENT_EXERCISES.length - 1) {
      setStep(step + 1)
    } else {
      await saveResults()
    }
  }

  function handleSkip() {
    setInputValue('')
    if (step < ASSESSMENT_EXERCISES.length - 1) {
      setStep(step + 1)
    } else {
      saveResults()
    }
  }

  async function saveResults() {
    setSaving(true)
    const now = new Date().toISOString()
    const today = now.slice(0, 10)

    const logs = Array.from(results.entries()).map(([exerciseId, value]) => {
      const exercise = CALISTHENICS_EXERCISES.find((e) => e.id === exerciseId)
      const metric: CalisthenicsMetric = exercise?.type === 'hold' ? 'hold_sec' : 'reps'
      return { date: today, exerciseId, metric, value, sets: 1, createdAt: now }
    })

    if (logs.length > 0) {
      await db.calisthenicsLogs.bulkAdd(logs)
    }

    setSaving(false)
    setDone(true)
  }

  if (done) {
    const levels = Array.from(results.entries()).map(([id, val]) => {
      const ex = ASSESSMENT_EXERCISES.find((e) => e.exerciseId === id)!
      return { label: ex.label, level: getLevel(val, ex.levelThresholds), value: val, unit: ex.unit }
    })
    const avgLevel = levels.length > 0
      ? Math.round(levels.reduce((sum, l) => sum + l.level, 0) / levels.length)
      : 1

    return (
      <div className="space-y-4">
        <Card>
          <div className="text-center space-y-2">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black"
              style={{ background: LEVEL_COLORS[avgLevel] + '22', color: LEVEL_COLORS[avgLevel] }}
            >
              {avgLevel}
            </div>
            <h2 className="text-lg font-bold text-ink">Your Level: {LEVEL_LABELS[avgLevel]}</h2>
            <p className="text-xs text-muted">Based on {levels.length} exercises tested</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            {levels.map((l) => (
              <div key={l.label} className="flex items-center justify-between">
                <span className="text-sm text-ink">{l.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{l.value} {l.unit}</span>
                  <Tag color={LEVEL_COLORS[l.level]}>{LEVEL_LABELS[l.level]}</Tag>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <button
          onClick={onClose}
          className="w-full rounded-xl bg-teal py-3 text-sm font-bold text-white"
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">Test Your Level</h2>
          <span className="text-xs text-muted">{step + 1} / {ASSESSMENT_EXERCISES.length}</span>
        </div>

        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-teal transition-all"
            style={{ width: `${((step + 1) / ASSESSMENT_EXERCISES.length) * 100}%` }}
          />
        </div>

        <div className="space-y-3 text-center">
          <div className="text-3xl font-black text-ink">{current.label}</div>
          <p className="text-sm text-muted">{current.placeholder}</p>

          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNext()}
            placeholder="0"
            className="mx-auto block w-32 rounded-xl border border-border bg-card2 py-3 text-center text-2xl font-bold text-ink focus:border-teal focus:outline-none"
            autoFocus
          />

          <p className="text-[11px] text-muted">
            {current.metric === 'hold_sec' ? 'Enter seconds' : 'Enter max reps (one set)'}
          </p>
        </div>
      </Card>

      <div className="flex gap-2">
        <button
          onClick={handleSkip}
          className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-muted"
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          disabled={saving}
          className="flex-1 rounded-xl bg-teal py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {step === ASSESSMENT_EXERCISES.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>

      <button onClick={onClose} className="w-full py-2 text-xs text-muted underline">
        Cancel
      </button>
    </div>
  )
}
