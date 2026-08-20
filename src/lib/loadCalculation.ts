import type { CalisthenicsLog, BjjClassLog, Session } from '../db/db'
import { calculateOverallCalisthenicsLoad, calculateCategoryLoad } from './muscleGrouping'
import { applyStagnationPenalty } from './stagnationDetection'
import { EXERCISE_MUSCLES, type MuscleGroup } from '../data/muscleMap'

export interface DailyLoad {
  date: string
  bjjLoad: number // 0-100%
  calisthenicsLoad: number // 0-100%
  mobilityLoad: number // 0-100%
  overallLoad: number // 0-100% (max of the three)
  breakdown: {
    bjjTechnicalMins: number
    bjjSparringMins: number
    bjjClassCount: number
    calisthenicsMinutes: number
    mobilityMinutes: number
    muscleLoads: Record<string, number>
  }
}

/**
 * Calculate BJJ load for a day
 * (technicalMins + sparringMins × 3) / 120
 */
export function calculateBjjLoad(bjjLogs: BjjClassLog[]): number {
  let technical = 0
  let sparring = 0

  for (const log of bjjLogs) {
    technical += log.technicalMins ?? 0
    sparring += log.sparringMins ?? 0
  }

  // Default assumption for old logs without explicit minutes
  if (technical === 0 && sparring === 0 && bjjLogs.length > 0) {
    technical = 50 * bjjLogs.length
    sparring = 10 * bjjLogs.length
  }

  const equivalent = technical + sparring * 3
  const load = Math.min(100, Math.round((equivalent / 120) * 100))
  return load
}

/**
 * Calculate calisthenics load for a day
 * Per-muscle % = reps / 60, then group into push/pull/legs, then average
 */
export function calculateCalisthenicsLoad(
  calLogs: CalisthenicsLog[]
): { load: number; muscleLoads: Record<string, number> } {
  const muscleLoads: Record<MuscleGroup, number> = {} as Record<MuscleGroup, number>

  // Accumulate reps per muscle, with stagnation penalty
  for (const log of calLogs) {
    const muscles = getMusclesForExercise(log.exerciseId)
    const repsAfterPenalty = applyStagnationPenalty(log.exerciseId, log.value, calLogs)

    for (const muscle of muscles) {
      muscleLoads[muscle] = (muscleLoads[muscle] ?? 0) + repsAfterPenalty
    }
  }

  // Convert reps to load % per muscle
  for (const muscle of Object.keys(muscleLoads) as MuscleGroup[]) {
    muscleLoads[muscle] = Math.min(100, Math.round((muscleLoads[muscle] / 60) * 100))
  }

  const overallLoad = calculateOverallCalisthenicsLoad(muscleLoads)
  return { load: overallLoad, muscleLoads }
}

/**
 * Calculate mobility load for a day
 * Minutes / 30 = load %
 */
export function calculateMobilityLoad(sessions: Session[]): number {
  const mobilitySessions = sessions.filter((s) => s.type !== 'bjj' && s.type !== 'calisthenics' && s.type !== 'custom')
  const totalMinutes = mobilitySessions.reduce((sum, s) => sum + s.durationMin, 0)

  const load = Math.min(100, Math.round((totalMinutes / 30) * 100))
  return load
}

/**
 * Get muscles trained by an exercise from the muscle map
 */
function getMusclesForExercise(exerciseId: string): MuscleGroup[] {
  // Iterate through EXERCISE_MUSCLES to find which muscles this exercise targets
  const muscles: MuscleGroup[] = []

  for (const activation of EXERCISE_MUSCLES[exerciseId] ?? []) {
    muscles.push(activation.muscle)
  }

  return muscles
}

/**
 * Calculate complete daily load for a given day
 */
export function calculateDailyLoad(
  date: string,
  bjjLogs: BjjClassLog[],
  calLogs: CalisthenicsLog[],
  sessions: Session[]
): DailyLoad {
  const bjjForDate = bjjLogs.filter((l) => l.date === date)
  const calForDate = calLogs.filter((l) => l.date === date)
  const sessionsForDate = sessions.filter((s) => s.date === date)

  const bjjLoad = calculateBjjLoad(bjjForDate)
  const { load: calisthenicsLoad, muscleLoads } = calculateCalisthenicsLoad(calForDate)
  const mobilityLoad = calculateMobilityLoad(sessionsForDate)

  let bjjTechnicalMins = bjjForDate.reduce((sum, l) => sum + (l.technicalMins ?? 0), 0)
  let bjjSparringMins = bjjForDate.reduce((sum, l) => sum + (l.sparringMins ?? 0), 0)
  // Apply same assumption as load calculation for old logs
  if (bjjTechnicalMins === 0 && bjjSparringMins === 0 && bjjForDate.length > 0) {
    bjjTechnicalMins = bjjForDate.length * 50
    bjjSparringMins = bjjForDate.length * 10
  }
  // Use actual session duration (from timer), not rep estimation
  const calisthenicsMinutes = sessionsForDate
    .filter((s) => s.type === 'calisthenics')
    .reduce((sum, s) => sum + s.durationMin, 0)
  const mobilityMinutes = sessionsForDate
    .filter((s) => s.type !== 'bjj' && s.type !== 'calisthenics' && s.type !== 'custom')
    .reduce((sum, s) => sum + s.durationMin, 0)

  const overallLoad = Math.max(bjjLoad, calisthenicsLoad, mobilityLoad)

  return {
    date,
    bjjLoad,
    calisthenicsLoad,
    mobilityLoad,
    overallLoad,
    breakdown: {
      bjjTechnicalMins,
      bjjSparringMins,
      bjjClassCount: bjjForDate.length,
      calisthenicsMinutes,
      mobilityMinutes,
      muscleLoads
    }
  }
}

/**
 * Estimate duration in minutes for a calisthenics log
 * (reps * 3 seconds / 60 for dynamic, hold seconds / 60 for holds)
 */
function estimateCalisthenicsDuration(log: CalisthenicsLog): number {
  if (log.metric === 'hold_sec') {
    return log.value / 60
  }
  // Dynamic: assume 3 seconds per rep
  return (log.value * 3) / 60
}
