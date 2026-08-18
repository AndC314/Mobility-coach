import type { CalisthenicsLog, BjjClassLog } from '../db/db'
import { CALISTHENICS_EXERCISES, type ExerciseCategory } from '../data/calisthenics'

export type FitnessCategory = 'push' | 'pull' | 'legs' | 'core' | 'grappling'

export interface DayPoint {
  date: string
  push: number
  pull: number
  legs: number
  core: number
  grappling: number
}

const BASELINE = 100
const FATIGUE_DIP = 10
const SUPERCOMP_GAIN = 5
const RECOVERY_DAYS = 2
const DECAY_RATE = 0.03

function getExerciseCategory(exerciseId: string): ExerciseCategory | null {
  const def = CALISTHENICS_EXERCISES.find((e) => e.id === exerciseId)
  return def?.category ?? null
}

export function computeSupercompensation(
  calLogs: CalisthenicsLog[],
  bjjLogs: BjjClassLog[],
  days: number = 90
): DayPoint[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - days + 1)

  // Build a map of date → set of trained categories
  const trainedMap = new Map<string, Set<FitnessCategory>>()

  for (const log of calLogs) {
    const cat = getExerciseCategory(log.exerciseId)
    if (!cat) continue
    if (!trainedMap.has(log.date)) trainedMap.set(log.date, new Set())
    trainedMap.get(log.date)!.add(cat)
  }

  for (const log of bjjLogs) {
    if (!trainedMap.has(log.date)) trainedMap.set(log.date, new Set())
    trainedMap.get(log.date)!.add('grappling')
  }

  // Simulate daily fitness per category
  const categories: FitnessCategory[] = ['push', 'pull', 'legs', 'core', 'grappling']
  const state: Record<FitnessCategory, { level: number; daysSinceTraining: number }> = {
    push: { level: BASELINE, daysSinceTraining: 999 },
    pull: { level: BASELINE, daysSinceTraining: 999 },
    legs: { level: BASELINE, daysSinceTraining: 999 },
    core: { level: BASELINE, daysSinceTraining: 999 },
    grappling: { level: BASELINE, daysSinceTraining: 999 },
  }

  const result: DayPoint[] = []
  const cursor = new Date(startDate)

  for (let d = 0; d < days; d++) {
    const dateStr = cursor.toISOString().slice(0, 10)
    const trained = trainedMap.get(dateStr)

    for (const cat of categories) {
      const s = state[cat]
      const wasTrained = trained?.has(cat) ?? false

      if (wasTrained) {
        // Training: apply fatigue dip, reset recovery timer
        s.level = s.level - FATIGUE_DIP
        s.daysSinceTraining = 0
      } else {
        s.daysSinceTraining++

        if (s.daysSinceTraining <= RECOVERY_DAYS) {
          // Recovery phase: power-law recovery toward supercompensated peak
          const peak = s.level + FATIGUE_DIP + SUPERCOMP_GAIN
          const t = s.daysSinceTraining / RECOVERY_DAYS
          const recovered = s.level + (peak - s.level) * Math.pow(t, 0.6)
          s.level = recovered
        } else if (s.level > BASELINE) {
          // Detraining: decay back toward baseline
          s.level = BASELINE + (s.level - BASELINE) * (1 - DECAY_RATE)
          if (s.level - BASELINE < 0.5) s.level = BASELINE
        } else if (s.level < BASELINE) {
          // Recovering from fatigue toward baseline
          s.level = s.level + (BASELINE - s.level) * 0.15
        }
      }
    }

    result.push({
      date: dateStr,
      push: Math.round(state.push.level * 10) / 10,
      pull: Math.round(state.pull.level * 10) / 10,
      legs: Math.round(state.legs.level * 10) / 10,
      core: Math.round(state.core.level * 10) / 10,
      grappling: Math.round(state.grappling.level * 10) / 10,
    })

    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}
