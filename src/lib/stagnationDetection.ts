import type { CalisthenicsLog } from '../db/db'
import type { CalisthenicsExerciseId } from '../db/db'

export interface ExerciseVolumeHistory {
  exerciseId: CalisthenicsExerciseId
  volumes: number[] // last 5+ days in chronological order
}

/**
 * Detect if an exercise is stagnating (same volume for 5+ consecutive days)
 * Returns penalty multiplier (0.9^n where n = days stagnating past day 5)
 */
export function detectStagnation(
  exerciseId: CalisthenicsExerciseId,
  logs: CalisthenicsLog[]
): number {
  const exerciseLogs = logs
    .filter((l) => l.exerciseId === exerciseId)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (exerciseLogs.length < 5) {
    return 1.0 // No penalty if less than 5 days of data
  }

  const lastFiveVolumes = exerciseLogs.slice(-5).map((l) => l.value)
  const avg5Days = lastFiveVolumes.reduce((a, b) => a + b, 0) / 5

  // If today's volume is same or less than 5-day average, apply penalty
  const today = exerciseLogs[exerciseLogs.length - 1]
  if (today.value <= avg5Days + 0.1) {
    // Count consecutive stagnant days
    let stagnantDays = 0
    for (let i = exerciseLogs.length - 1; i >= Math.max(0, exerciseLogs.length - 10); i--) {
      if (exerciseLogs[i].value <= avg5Days + 0.1) {
        stagnantDays++
      } else {
        break
      }
    }

    // Penalty: 0.9^(stagnantDays - 5) for days beyond day 5
    if (stagnantDays > 5) {
      const penaltyDays = stagnantDays - 5
      return Math.pow(0.9, penaltyDays)
    }
  }

  return 1.0 // No penalty
}

/**
 * Apply stagnation penalty to a rep value
 */
export function applyStagnationPenalty(
  exerciseId: CalisthenicsExerciseId,
  reps: number,
  logs: CalisthenicsLog[]
): number {
  const penalty = detectStagnation(exerciseId, logs)
  return Math.round(reps * penalty)
}
