import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { CalisthenicsLog, BjjLog } from '../db/db'
import {
  computeMuscleSorenessDecay,
  computeCategorySoreness,
  MUSCLE_CATEGORY,
  CATEGORY_MUSCLES,
  DEFAULT_LAMBDA,
  BJJ_MUSCLE_ACTIVATIONS,
  type DecayInput,
  type MuscleSoreness,
} from '../data/muscleMap'
import { todayIso, addDays } from '../lib/date'

export interface AxisReadiness {
  axis: 'Push' | 'Pull' | 'Legs' | 'Core' | 'Mobility'
  readinessPercent: number
  sorenessPercent: number
}

export function useRecoveryReadiness(): AxisReadiness[] {
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
    () => db.bjjLogs.where('date').between(sevenDaysAgo, today, true, true).toArray(),
    [sevenDaysAgo, today],
    []
  )

  const nowMs = Date.now()

  // Transform calisthenics logs into DecayInput format
  const decayInputs: DecayInput[] = []
  if (calisthenicsLogs) {
    for (const log of calisthenicsLogs) {
      const date = new Date(log.date)
      decayInputs.push({
        exerciseId: log.exerciseId,
        value: log.value,
        loggedAt: date.getTime(),
      })
    }
  }

  // Compute soreness from calisthenics
  let muscleSoreness = computeMuscleSorenessDecay(decayInputs, nowMs)

  // Add BJJ soreness contribution
  if (bjjLogs) {
    for (const log of bjjLogs) {
      if (log.attended) {
        const date = new Date(log.date)
        const elapsedHours = Math.max(0, (nowMs - date.getTime()) / 3600000)

        // BJJ contributes a fixed load (80%) to each of its primary muscles
        for (const activation of BJJ_MUSCLE_ACTIVATIONS) {
          const peakLoad = activation.level === 'primary' ? 80 : 40
          const bjjSoreness = peakLoad * Math.exp(-DEFAULT_LAMBDA * elapsedHours)

          // Find the muscle entry and add BJJ contribution
          const muscleEntry = muscleSoreness.find((m) => m.muscle === activation.muscle)
          if (muscleEntry) {
            muscleEntry.soreness = Math.min(100, Math.round(muscleEntry.soreness + bjjSoreness))
          }
        }
      }
    }
  }

  const categorySoreness = computeCategorySoreness(muscleSoreness)

  // Convert to 5 axes
  const axes: AxisReadiness[] = [
    {
      axis: 'Push',
      sorenessPercent: categorySoreness.find((c) => c.category === 'push')?.avgSoreness ?? 0,
      readinessPercent: 0,
    },
    {
      axis: 'Pull',
      sorenessPercent: categorySoreness.find((c) => c.category === 'pull')?.avgSoreness ?? 0,
      readinessPercent: 0,
    },
    {
      axis: 'Legs',
      sorenessPercent: categorySoreness.find((c) => c.category === 'legs')?.avgSoreness ?? 0,
      readinessPercent: 0,
    },
    {
      axis: 'Core',
      sorenessPercent: categorySoreness.find((c) => c.category === 'core')?.avgSoreness ?? 0,
      readinessPercent: 0,
    },
    {
      axis: 'Mobility',
      sorenessPercent: 0,
      readinessPercent: 100,
    },
  ]

  // Calculate readiness as inverse of soreness
  return axes.map((axis) => ({
    ...axis,
    readinessPercent: Math.max(0, 100 - axis.sorenessPercent),
  }))
}
