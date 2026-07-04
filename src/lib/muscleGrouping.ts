import { EXERCISE_MUSCLES, MUSCLE_CATEGORY, CATEGORY_MUSCLES, type MuscleGroup } from '../data/muscleMap'
import type { CalisthenicsExerciseId } from '../db/db'

export type MovementCategory = 'push' | 'pull' | 'legs'

// Map individual muscles to their group (excluding core for PPL calculations)
const MUSCLE_TO_GROUP: Record<MuscleGroup, MovementCategory | 'core'> = {
  // Push
  chest: 'push',
  front_delt: 'push',
  triceps: 'push',
  // Pull
  biceps: 'pull',
  forearms: 'pull',
  lats: 'pull',
  rear_delt: 'pull',
  traps: 'pull',
  rhomboids: 'pull',
  // Legs
  quads: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  hip_flexors: 'legs',
  inner_thigh: 'legs',
  // Core
  abs: 'core',
  lower_back: 'core'
}

/**
 * Get all muscles trained by an exercise
 */
export function getExerciseMuscles(exerciseId: CalisthenicsExerciseId): MuscleGroup[] {
  const activations = EXERCISE_MUSCLES[exerciseId] ?? []
  return activations.map((a) => a.muscle)
}

/**
 * Get the movement category (push/pull/legs/core) for a muscle
 */
export function getMuscleCategory(muscle: MuscleGroup): MovementCategory | 'core' | undefined {
  return MUSCLE_TO_GROUP[muscle]
}

/**
 * Calculate load % for a category given per-muscle loads
 * Returns average of all muscles in the category
 */
export function calculateCategoryLoad(
  muscleLoads: Record<MuscleGroup, number>,
  category: MovementCategory | 'core'
): number {
  const musclesInCategory = CATEGORY_MUSCLES[category] as MuscleGroup[]

  if (!musclesInCategory || musclesInCategory.length === 0) return 0

  const loads = musclesInCategory.map((m) => muscleLoads[m] ?? 0)
  return Math.round(loads.reduce((a, b) => a + b, 0) / loads.length)
}

/**
 * Calculate overall calisthenics load: average of push/pull/legs
 * (excludes core from the overall score)
 */
export function calculateOverallCalisthenicsLoad(
  muscleLoads: Record<MuscleGroup, number>
): number {
  const pushLoad = calculateCategoryLoad(muscleLoads, 'push')
  const pullLoad = calculateCategoryLoad(muscleLoads, 'pull')
  const legsLoad = calculateCategoryLoad(muscleLoads, 'legs')

  return Math.round((pushLoad + pullLoad + legsLoad) / 3)
}

/**
 * Calculate load for a specific movement category (including core)
 */
export function getCategoryLoad(
  muscleLoads: Record<MuscleGroup, number>,
  category: MovementCategory | 'core'
): number {
  return calculateCategoryLoad(muscleLoads, category)
}
