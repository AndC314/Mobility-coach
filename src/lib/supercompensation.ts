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
// Hard session (red zone): big dip, supercompensation
const HARD_FATIGUE_DIP = 12
const SUPERCOMP_GAIN = 6
// Maintenance session: small dip, recovers to same level
const MAINT_FATIGUE_DIP = 4
const RECOVERY_DAYS = 2
const DECAY_RATE = 0.03
// Intensity threshold: daily volume must be >= 70% of running best to trigger supercompensation
const INTENSITY_THRESHOLD = 0.7

function getExerciseCategory(exerciseId: string): ExerciseCategory | null {
  const def = CALISTHENICS_EXERCISES.find((e) => e.id === exerciseId)
  return def?.category ?? null
}

interface DayVolume {
  volume: number
  isHard: boolean
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

  // Build per-category daily volume and compute running best
  const dailyVolume = new Map<string, Map<FitnessCategory, number>>()

  for (const log of calLogs) {
    const cat = getExerciseCategory(log.exerciseId)
    if (!cat) continue
    if (!dailyVolume.has(log.date)) dailyVolume.set(log.date, new Map())
    const dayMap = dailyVolume.get(log.date)!
    dayMap.set(cat, (dayMap.get(cat) ?? 0) + log.value * (log.sets ?? 1))
  }

  for (const log of bjjLogs) {
    if (!dailyVolume.has(log.date)) dailyVolume.set(log.date, new Map())
    const dayMap = dailyVolume.get(log.date)!
    const mins = (log.technicalMins ?? 0) + (log.sparringMins ?? 0) * 2
    dayMap.set('grappling', (dayMap.get('grappling') ?? 0) + mins)
  }

  // Compute running best per category (max daily volume seen so far)
  const categories: FitnessCategory[] = ['push', 'pull', 'legs', 'core', 'grappling']
  const runningBest: Record<FitnessCategory, number> = {
    push: 0, pull: 0, legs: 0, core: 0, grappling: 0,
  }

  // Pre-compute: scan all dates in chronological order to set running bests
  const allDates = Array.from(dailyVolume.keys()).sort()
  const dateBestSnapshot = new Map<string, Record<FitnessCategory, number>>()
  for (const date of allDates) {
    const dayMap = dailyVolume.get(date)!
    for (const cat of categories) {
      const vol = dayMap.get(cat) ?? 0
      if (vol > runningBest[cat]) runningBest[cat] = vol
    }
    dateBestSnapshot.set(date, { ...runningBest })
  }

  // Reset for simulation
  const simBest: Record<FitnessCategory, number> = {
    push: 0, pull: 0, legs: 0, core: 0, grappling: 0,
  }

  const state: Record<FitnessCategory, { level: number; daysSinceTraining: number; lastWasHard: boolean }> = {
    push: { level: BASELINE, daysSinceTraining: 999, lastWasHard: false },
    pull: { level: BASELINE, daysSinceTraining: 999, lastWasHard: false },
    legs: { level: BASELINE, daysSinceTraining: 999, lastWasHard: false },
    core: { level: BASELINE, daysSinceTraining: 999, lastWasHard: false },
    grappling: { level: BASELINE, daysSinceTraining: 999, lastWasHard: false },
  }

  const result: DayPoint[] = []
  const cursor = new Date(startDate)

  for (let d = 0; d < days; d++) {
    const dateStr = cursor.toISOString().slice(0, 10)
    const dayMap = dailyVolume.get(dateStr)

    for (const cat of categories) {
      const s = state[cat]
      const volume = dayMap?.get(cat) ?? 0

      if (volume > 0) {
        // Update running best
        if (volume > simBest[cat]) simBest[cat] = volume
        // Determine if this is a hard (red zone) or maintenance session
        const threshold = simBest[cat] * INTENSITY_THRESHOLD
        const isHard = volume >= threshold || simBest[cat] === 0

        if (isHard) {
          s.level = s.level - HARD_FATIGUE_DIP
          s.lastWasHard = true
        } else {
          s.level = s.level - MAINT_FATIGUE_DIP
          s.lastWasHard = false
        }
        s.daysSinceTraining = 0
      } else {
        s.daysSinceTraining++

        if (s.daysSinceTraining <= RECOVERY_DAYS) {
          // Recovery phase
          if (s.lastWasHard) {
            // Supercompensation: recover above where we started
            const peak = s.level + HARD_FATIGUE_DIP + SUPERCOMP_GAIN
            const t = s.daysSinceTraining / RECOVERY_DAYS
            s.level = s.level + (peak - s.level) * Math.pow(t, 0.6)
          } else {
            // Maintenance: recover back to pre-session level
            const peak = s.level + MAINT_FATIGUE_DIP
            const t = s.daysSinceTraining / RECOVERY_DAYS
            s.level = s.level + (peak - s.level) * Math.pow(t, 0.6)
          }
        } else if (s.level > BASELINE) {
          // Detraining: decay back toward baseline
          s.level = BASELINE + (s.level - BASELINE) * (1 - DECAY_RATE)
          if (s.level - BASELINE < 0.5) s.level = BASELINE
        } else if (s.level < BASELINE) {
          // Still recovering from deep fatigue
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
