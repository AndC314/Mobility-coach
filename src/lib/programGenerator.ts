import { CALISTHENICS_EXERCISES, type ExerciseCategory, type Equipment } from '../data/calisthenics'
import type { ProgramWeek, ProgramSession, SessionPlanItem, TrainingProgram } from '../db/db'

export type ProgramGoal = 'strength' | 'hypertrophy' | 'endurance' | 'skills'
export type ProgramIntensity = 'moderate' | 'hard' | 'max'

export interface ExerciseLevel {
  maxValue: number // best single-set value (reps or seconds)
  lastSets: number // sets in most recent session
  unit: string // 'reps' or 'sec'
}

export interface ProgramConfig {
  goal: ProgramGoal
  daysPerWeek: number // 2-6
  sessionMinutes: number // 20-60
  intensity: ProgramIntensity
  equipment: string[]
  totalWeeks: number // 3-6
  levels?: Map<string, ExerciseLevel> // exerciseId → current ability
}

const GOAL_META: Record<ProgramGoal, { sets: [number, number]; reps: string; rest: number; label: string }> = {
  strength: { sets: [4, 5], reps: '3-6', rest: 180, label: 'Strength (low reps, high intensity)' },
  hypertrophy: { sets: [3, 4], reps: '8-12', rest: 90, label: 'Hypertrophy (muscle growth)' },
  endurance: { sets: [2, 3], reps: '15-20', rest: 45, label: 'Endurance (high reps)' },
  skills: { sets: [5, 6], reps: '3-5', rest: 180, label: 'Skill work (practice-oriented)' },
}

const SPLIT_MAP: Record<number, ExerciseCategory[][]> = {
  2: [['push', 'core'], ['pull', 'legs']],
  3: [['push'], ['pull'], ['legs', 'core']],
  4: [['push'], ['pull'], ['legs'], ['core', 'push']],
  5: [['push'], ['pull'], ['legs'], ['push', 'core'], ['pull', 'legs']],
  6: [['push'], ['pull'], ['legs'], ['push'], ['pull'], ['legs', 'core']],
}

const SPLIT_LABELS: Record<number, string[]> = {
  2: ['Upper Push + Core', 'Upper Pull + Legs'],
  3: ['Push', 'Pull', 'Legs + Core'],
  4: ['Push', 'Pull', 'Legs', 'Push + Core'],
  5: ['Push A', 'Pull A', 'Legs', 'Push B + Core', 'Pull B + Legs'],
  6: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B + Core'],
}

export function generateProgram(config: ProgramConfig): Omit<TrainingProgram, 'id'> {
  const { goal, daysPerWeek, sessionMinutes, intensity, equipment, totalWeeks, levels } = config
  const meta = GOAL_META[goal]
  const split = SPLIT_MAP[daysPerWeek] || SPLIT_MAP[3]
  const labels = SPLIT_LABELS[daysPerWeek] || SPLIT_LABELS[3]

  const availableExercises = CALISTHENICS_EXERCISES.filter((ex) => {
    if (!ex.equipment || ex.equipment.length === 0) return true
    return ex.equipment.some((eq) => equipment.includes(eq))
  })

  const exercisesByCategory: Record<ExerciseCategory, typeof availableExercises> = {
    push: availableExercises.filter((e) => e.category === 'push'),
    pull: availableExercises.filter((e) => e.category === 'pull'),
    legs: availableExercises.filter((e) => e.category === 'legs'),
    core: availableExercises.filter((e) => e.category === 'core'),
  }

  const exercisesPerSession = Math.max(3, Math.min(6, Math.floor(sessionMinutes / 8)))
  const baseSets = meta.sets[intensity === 'moderate' ? 0 : 1]

  const weeks: ProgramWeek[] = []
  for (let w = 1; w <= totalWeeks; w++) {
    const isDeload = w === totalWeeks
    const volumeScale = isDeload ? 0.5 : 1 + (w - 1) * 0.08

    const sessions: ProgramSession[] = split.map((categories, dayIdx) => {
      const exercises: SessionPlanItem[] = []
      let remaining = exercisesPerSession

      for (const cat of categories) {
        const pool = exercisesByCategory[cat]
        const take = Math.min(remaining, Math.ceil(exercisesPerSession / categories.length))
        const picked = pickExercises(pool, take, goal)
        for (const ex of picked) {
          const reps = prescribeReps(ex.id, ex.type, meta.reps, meta.rest, levels)
          const sets = prescribeSets(ex.id, baseSets, volumeScale, levels)
          exercises.push({
            exerciseId: ex.id,
            name: ex.name,
            sets,
            reps: reps.rep,
            restSec: reps.rest,
            category: ex.category,
          })
        }
        remaining -= picked.length
      }

      return { dayOfWeek: dayIdx, label: labels[dayIdx], exercises }
    })

    weeks.push({
      weekNumber: w,
      focus: isDeload ? 'Recovery & deload — 50% volume' : `Week ${w} — ${Math.round(volumeScale * 100)}% volume`,
      isDeload,
      sessions,
    })
  }

  const goalLabel = GOAL_META[goal].label.split(' (')[0]
  const totalSets = weeks[0].sessions.reduce((s, sess) => s + sess.exercises.reduce((t, e) => t + e.sets, 0), 0)
  const estMinutes = Math.round(totalSets * 2.5)

  return {
    name: `${totalWeeks}W ${goalLabel} ${daysPerWeek}x/week`,
    goal: `${goalLabel} focus · ~${estMinutes}min/session · ${daysPerWeek} days/week`,
    weeks,
    totalWeeks,
    currentWeek: 1,
    completedSessions: [],
    createdAt: new Date().toISOString(),
    active: true,
  }
}

function prescribeReps(
  exerciseId: string,
  type: string,
  goalReps: string,
  goalRest: number,
  levels?: Map<string, ExerciseLevel>,
): { rep: string; rest: number } {
  if (!levels || !levels.has(exerciseId)) {
    return { rep: type === 'hold' ? '20-30s' : goalReps, rest: goalRest }
  }

  const level = levels.get(exerciseId)!
  const max = level.maxValue

  if (type === 'hold' || level.unit === 'sec') {
    // For holds: use 60-70% of max as working set
    const workTime = Math.max(5, Math.round(max * 0.65))
    const targetTime = Math.min(workTime + 5, max)
    return { rep: `${workTime}-${targetTime}s`, rest: goalRest }
  }

  // Parse goal rep range (e.g., "8-12")
  const [goalMin, goalMax] = goalReps.split('-').map(Number)

  if (max >= goalMax) {
    // User is strong enough for the full range
    return { rep: goalReps, rest: goalRest }
  }

  if (max >= goalMin) {
    // User is in range but can't hit the top — work within their ability
    return { rep: `${goalMin}-${max}`, rest: goalRest }
  }

  // User's max is below the goal range — work at ~80% of their max
  const workReps = Math.max(1, max - 1)
  const targetReps = max
  // Give more rest when working near max
  const rest = Math.min(goalRest + 30, 180)
  return { rep: `${workReps}-${targetReps}`, rest }
}

function prescribeSets(
  exerciseId: string,
  baseSets: number,
  volumeScale: number,
  levels?: Map<string, ExerciseLevel>,
): number {
  const scaledSets = Math.max(2, Math.round(baseSets * volumeScale))

  if (!levels || !levels.has(exerciseId)) return scaledSets

  const level = levels.get(exerciseId)!
  // Start from what the user last did, then scale
  const startSets = Math.max(2, Math.min(level.lastSets, baseSets))
  return Math.max(2, Math.round(startSets * volumeScale))
}

function pickExercises(
  pool: typeof CALISTHENICS_EXERCISES,
  count: number,
  goal: ProgramGoal,
): typeof CALISTHENICS_EXERCISES {
  if (pool.length <= count) return pool.slice(0, count)

  const sorted = [...pool].sort((a, b) => {
    if (goal === 'skills') {
      const aCompound = a.primaryMuscles.length > 1 ? 1 : 0
      const bCompound = b.primaryMuscles.length > 1 ? 1 : 0
      return bCompound - aCompound
    }
    return 0
  })

  return sorted.slice(0, count)
}

export { GOAL_META }
