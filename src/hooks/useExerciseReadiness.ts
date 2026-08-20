import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  computeMuscleSorenessDecay,
  BJJ_MUSCLE_ACTIVATIONS,
  RUNNING_MUSCLE_ACTIVATIONS,
  EXERCISE_MUSCLES,
  DEFAULT_LAMBDA,
  getExerciseReadiness,
  type DecayInput,
  type ExerciseReadiness,
  type MuscleSoreness,
} from '../data/muscleMap'
import { todayIso } from '../lib/date'
import { useBiometricModifiers } from './useBiometricModifiers'

export function useAllExerciseReadiness(): Map<string, ExerciseReadiness> {
  const biometricModifiers = useBiometricModifiers()
  const today = todayIso()
  const sevenDaysAgo = (() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 7)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })()

  const calisthenicsLogs = useLiveQuery(
    () => db.calisthenicsLogs.where('date').between(sevenDaysAgo, today, true, true).toArray(),
    [sevenDaysAgo, today],
    []
  )

  const bjjLogs = useLiveQuery(
    () => db.bjjClassLogs.where('date').between(sevenDaysAgo, today, true, true).toArray(),
    [sevenDaysAgo, today],
    []
  )

  const runningLogs = useLiveQuery(
    () => db.runningLogs.where('date').between(sevenDaysAgo, today, true, true).toArray(),
    [sevenDaysAgo, today],
    []
  )

  const nowMs = Date.now()

  const decayInputs: DecayInput[] = (calisthenicsLogs ?? []).map((log) => ({
    exerciseId: log.exerciseId,
    value: log.value,
    loggedAt: new Date(log.date + 'T12:00:00').getTime(),
  }))

  let muscleSoreness: MuscleSoreness[] = computeMuscleSorenessDecay(decayInputs, nowMs, biometricModifiers)

  // BJJ contribution
  if (bjjLogs) {
    for (const log of bjjLogs) {
      const elapsedHours = Math.max(0, (nowMs - new Date(log.date + 'T12:00:00').getTime()) / 3600000)
      for (const activation of BJJ_MUSCLE_ACTIVATIONS) {
        const peakLoad = activation.level === 'primary' ? 80 : 40
        const contribution = peakLoad * Math.exp(-DEFAULT_LAMBDA * elapsedHours)
        const entry = muscleSoreness.find((m) => m.muscle === activation.muscle)
        if (entry) {
          entry.soreness = Math.min(100, Math.round(entry.soreness + contribution))
        }
      }
    }
  }

  // Running contribution
  if (runningLogs) {
    for (const log of runningLogs) {
      const elapsedHours = Math.max(0, (nowMs - new Date(log.date + 'T12:00:00').getTime()) / 3600000)
      const basePeak = Math.min(100, (log.durationSec / 1800) * 60)
      for (const activation of RUNNING_MUSCLE_ACTIVATIONS) {
        const peakLoad = activation.level === 'primary' ? basePeak : basePeak * 0.5
        const contribution = peakLoad * Math.exp(-DEFAULT_LAMBDA * elapsedHours)
        const entry = muscleSoreness.find((m) => m.muscle === activation.muscle)
        if (entry) {
          entry.soreness = Math.min(100, Math.round(entry.soreness + contribution))
        }
      }
    }
  }

  // Compute readiness for every exercise in the muscle map
  const result = new Map<string, ExerciseReadiness>()
  for (const exerciseId of Object.keys(EXERCISE_MUSCLES)) {
    result.set(exerciseId, getExerciseReadiness(exerciseId, muscleSoreness))
  }

  return result
}
