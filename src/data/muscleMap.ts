import type { CalisthenicsExerciseId } from '../db/db'

// ─────────────────────────────────────────────────────────────────────────
// MUSCLE GROUPS
// Named regions that correspond to colored areas on the body map SVG.
// Each has a front/back flag so the renderer knows which silhouette to
// color it on.
// ─────────────────────────────────────────────────────────────────────────

export type MuscleGroup =
  | 'chest'
  | 'front_delt'
  | 'triceps'
  | 'biceps'
  | 'forearms'
  | 'abs'
  | 'hip_flexors'
  | 'quads'
  | 'inner_thigh'
  | 'lats'
  | 'rear_delt'
  | 'traps'
  | 'rhomboids'
  | 'lower_back'
  | 'glutes'
  | 'hamstrings'
  | 'calves'

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  front_delt: 'Front delts',
  triceps: 'Triceps',
  biceps: 'Biceps',
  forearms: 'Forearms',
  abs: 'Abs / Core',
  hip_flexors: 'Hip flexors',
  quads: 'Quads',
  inner_thigh: 'Inner thigh',
  lats: 'Lats',
  rear_delt: 'Rear delts',
  traps: 'Traps',
  rhomboids: 'Rhomboids',
  lower_back: 'Lower back',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  calves: 'Calves'
}

// ─────────────────────────────────────────────────────────────────────────
// PUSH / PULL / LEGS / CORE CATEGORIZATION
// Maps each muscle group to a functional movement category for the PPL
// recommendation engine and recovery routing.
// ─────────────────────────────────────────────────────────────────────────

export type MovementCategory = 'push' | 'pull' | 'legs' | 'core'

export const MUSCLE_CATEGORY: Record<MuscleGroup, MovementCategory> = {
  chest: 'push',
  front_delt: 'push',
  triceps: 'push',
  biceps: 'pull',
  forearms: 'pull',
  abs: 'core',
  hip_flexors: 'legs',
  quads: 'legs',
  inner_thigh: 'legs',
  lats: 'pull',
  rear_delt: 'pull',
  traps: 'pull',
  rhomboids: 'pull',
  lower_back: 'core',
  glutes: 'legs',
  hamstrings: 'legs',
  calves: 'legs'
}

export const CATEGORY_MUSCLES: Record<MovementCategory, MuscleGroup[]> = {
  push: ['chest', 'front_delt', 'triceps'],
  pull: ['lats', 'rhomboids', 'biceps', 'rear_delt', 'traps', 'forearms'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves', 'hip_flexors', 'inner_thigh'],
  core: ['abs', 'lower_back']
}

// 'primary' = main mover (red), 'secondary' = stabiliser (gold)
export type ActivationLevel = 'primary' | 'secondary'

export interface MuscleActivation {
  muscle: MuscleGroup
  level: ActivationLevel
}

// ─────────────────────────────────────────────────────────────────────────
// EXERCISE → MUSCLE MAPPING
// ─────────────────────────────────────────────────────────────────────────

export const EXERCISE_MUSCLES: Record<CalisthenicsExerciseId, MuscleActivation[]> = {
  plank: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'lower_back', level: 'primary' },
    { muscle: 'glutes', level: 'secondary' },
    { muscle: 'front_delt', level: 'secondary' },
    { muscle: 'triceps', level: 'secondary' }
  ],
  hollow_body: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'hip_flexors', level: 'primary' },
    { muscle: 'lower_back', level: 'secondary' },
    { muscle: 'quads', level: 'secondary' }
  ],
  pushups: [
    { muscle: 'chest', level: 'primary' },
    { muscle: 'front_delt', level: 'primary' },
    { muscle: 'triceps', level: 'primary' },
    { muscle: 'abs', level: 'secondary' },
    { muscle: 'lats', level: 'secondary' }
  ],
  pullups: [
    { muscle: 'lats', level: 'primary' },
    { muscle: 'biceps', level: 'primary' },
    { muscle: 'rhomboids', level: 'primary' },
    { muscle: 'rear_delt', level: 'secondary' },
    { muscle: 'traps', level: 'secondary' },
    { muscle: 'forearms', level: 'secondary' },
    { muscle: 'abs', level: 'secondary' }
  ],
  squats: [
    { muscle: 'quads', level: 'primary' },
    { muscle: 'glutes', level: 'primary' },
    { muscle: 'hamstrings', level: 'secondary' },
    { muscle: 'calves', level: 'secondary' },
    { muscle: 'lower_back', level: 'secondary' }
  ],
  bulgarian_squat: [
    { muscle: 'quads', level: 'primary' },
    { muscle: 'glutes', level: 'primary' },
    { muscle: 'hip_flexors', level: 'secondary' },
    { muscle: 'hamstrings', level: 'secondary' },
    { muscle: 'calves', level: 'secondary' }
  ],
  australian_pullups: [
    { muscle: 'rhomboids', level: 'primary' },
    { muscle: 'lats', level: 'primary' },
    { muscle: 'rear_delt', level: 'primary' },
    { muscle: 'biceps', level: 'secondary' },
    { muscle: 'traps', level: 'secondary' },
    { muscle: 'abs', level: 'secondary' }
  ],
  dips: [
    { muscle: 'triceps', level: 'primary' },
    { muscle: 'chest', level: 'primary' },
    { muscle: 'front_delt', level: 'secondary' },
    { muscle: 'lats', level: 'secondary' }
  ],
  pike_pushups: [
    { muscle: 'front_delt', level: 'primary' },
    { muscle: 'chest', level: 'secondary' },
    { muscle: 'triceps', level: 'secondary' },
    { muscle: 'abs', level: 'secondary' }
  ],
  tuck_lsit: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'hip_flexors', level: 'primary' },
    { muscle: 'triceps', level: 'secondary' },
    { muscle: 'front_delt', level: 'secondary' }
  ],
  pistol_squat: [
    { muscle: 'quads', level: 'primary' },
    { muscle: 'glutes', level: 'primary' },
    { muscle: 'hamstrings', level: 'secondary' },
    { muscle: 'calves', level: 'secondary' },
    { muscle: 'lower_back', level: 'secondary' }
  ]
}

// ─────────────────────────────────────────────────────────────────────────
// BJJ SESSION MUSCLE ACTIVATION
// A BJJ class is full-body, but these specific patterns are dominant:
// grip work (forearms), bridging (glutes/lower_back), hip escapes
// (hip_flexors/abs/glutes), framing (triceps/front_delt), guard retention
// (inner_thigh/hamstrings). Treated as a fixed activation set when a BJJ
// session is logged.
// ─────────────────────────────────────────────────────────────────────────

export const BJJ_MUSCLE_ACTIVATIONS: MuscleActivation[] = [
  { muscle: 'forearms', level: 'primary' },
  { muscle: 'glutes', level: 'primary' },
  { muscle: 'lower_back', level: 'primary' },
  { muscle: 'hip_flexors', level: 'primary' },
  { muscle: 'abs', level: 'primary' },
  { muscle: 'inner_thigh', level: 'primary' },
  { muscle: 'hamstrings', level: 'secondary' },
  { muscle: 'triceps', level: 'secondary' },
  { muscle: 'front_delt', level: 'secondary' },
  { muscle: 'lats', level: 'secondary' },
  { muscle: 'biceps', level: 'secondary' },
  { muscle: 'rear_delt', level: 'secondary' },
  { muscle: 'quads', level: 'secondary' }
]

// ─────────────────────────────────────────────────────────────────────────
// MUSCLE → SUGGESTED EXERCISES (reverse mapping)
// For each muscle group, what exercises target it as a primary mover.
// Used by the "Suggested next" card to recommend specific movements.
// ─────────────────────────────────────────────────────────────────────────

export interface ExerciseSuggestion {
  exerciseId: CalisthenicsExerciseId
  label: string
}

export const MUSCLE_SUGGESTIONS: Record<MuscleGroup, ExerciseSuggestion[]> = {
  chest: [
    { exerciseId: 'pushups', label: 'Push-ups' },
    { exerciseId: 'dips', label: 'Dips' }
  ],
  front_delt: [
    { exerciseId: 'pushups', label: 'Push-ups' },
    { exerciseId: 'dips', label: 'Dips' }
  ],
  triceps: [
    { exerciseId: 'dips', label: 'Dips' },
    { exerciseId: 'pushups', label: 'Push-ups' }
  ],
  biceps: [
    { exerciseId: 'pullups', label: 'Pull-ups' },
    { exerciseId: 'australian_pullups', label: 'Australian Pull-ups' }
  ],
  forearms: [
    { exerciseId: 'pullups', label: 'Pull-ups (dead hang)' }
  ],
  abs: [
    { exerciseId: 'hollow_body', label: 'Hollow Body' },
    { exerciseId: 'plank', label: 'Plank' }
  ],
  hip_flexors: [
    { exerciseId: 'hollow_body', label: 'Hollow Body' },
    { exerciseId: 'squats', label: 'Deep Squats' }
  ],
  quads: [
    { exerciseId: 'squats', label: 'Squats' },
    { exerciseId: 'bulgarian_squat', label: 'Bulgarian Split Squat' }
  ],
  inner_thigh: [
    { exerciseId: 'squats', label: 'Wide-stance Squats' },
    { exerciseId: 'bulgarian_squat', label: 'Bulgarian Split Squat' }
  ],
  lats: [
    { exerciseId: 'pullups', label: 'Pull-ups' },
    { exerciseId: 'australian_pullups', label: 'Australian Pull-ups' }
  ],
  rear_delt: [
    { exerciseId: 'australian_pullups', label: 'Australian Pull-ups' }
  ],
  traps: [
    { exerciseId: 'australian_pullups', label: 'Australian Pull-ups' },
    { exerciseId: 'pullups', label: 'Pull-ups' }
  ],
  rhomboids: [
    { exerciseId: 'australian_pullups', label: 'Australian Pull-ups' },
    { exerciseId: 'pullups', label: 'Pull-ups' }
  ],
  lower_back: [
    { exerciseId: 'plank', label: 'Plank' },
    { exerciseId: 'squats', label: 'Squats' }
  ],
  glutes: [
    { exerciseId: 'squats', label: 'Squats' },
    { exerciseId: 'bulgarian_squat', label: 'Bulgarian Split Squat' }
  ],
  hamstrings: [
    { exerciseId: 'squats', label: 'Squats' },
    { exerciseId: 'bulgarian_squat', label: 'Bulgarian Split Squat' }
  ],
  calves: [
    { exerciseId: 'squats', label: 'Squats (pause at bottom)' },
    { exerciseId: 'bulgarian_squat', label: 'Bulgarian Split Squat' }
  ]
}

// ─────────────────────────────────────────────────────────────────────────
// SORENESS / LOAD SCORING (legacy simple model, still used by BodyMap)
// ─────────────────────────────────────────────────────────────────────────

export const SORENESS_CAP = 45

export interface MuscleScore {
  muscle: MuscleGroup
  score: number // 0-100
  level: ActivationLevel
}

interface LogEntry {
  exerciseId: CalisthenicsExerciseId
  value: number
  date: string
}

export function computeMuscleScores(
  logs: LogEntry[],
  todayStr: string
): MuscleScore[] {
  const [ty, tm, td] = todayStr.split('-').map(Number)
  const yesterday = new Date(ty, tm - 1, td - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  const recent = logs.filter((l) => l.date >= yesterdayStr)

  const raw = new Map<MuscleGroup, { total: number; level: ActivationLevel }>()

  for (const log of recent) {
    const activations = EXERCISE_MUSCLES[log.exerciseId] ?? []
    for (const { muscle, level } of activations) {
      const contribution = level === 'primary' ? log.value : log.value * 0.5
      const existing = raw.get(muscle)
      if (!existing) {
        raw.set(muscle, { total: contribution, level })
      } else {
        raw.set(muscle, {
          total: existing.total + contribution,
          level: level === 'primary' ? 'primary' : existing.level
        })
      }
    }
  }

  const all = Object.keys(MUSCLE_LABELS) as MuscleGroup[]
  return all.map((muscle) => {
    const entry = raw.get(muscle)
    return {
      muscle,
      score: entry ? Math.min(100, Math.round((entry.total / SORENESS_CAP) * 100)) : 0,
      level: entry?.level ?? 'secondary'
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────
// 48-HOUR EXPONENTIAL DECAY ENGINE
//
// Models muscle recovery as S(t) = S0 * e^(-lambda * t)
// Default lambda calibrated so S drops to <=1% at t=48h.
// BiometricModifiers can scale lambda down (extend recovery) when sleep
// is poor or HRV is suppressed.
// ─────────────────────────────────────────────────────────────────────────

// ln(100) / 48 ≈ 0.0960 — exactly drives 100% → 1% at 48h
export const DEFAULT_LAMBDA = Math.log(100) / 48

export interface BiometricModifiers {
  sleepScore?: number // 0-100 (100 = optimal)
  hrvStatus?: 'optimal' | 'suppressed'
}

export function computeEffectiveLambda(
  baseLambda: number,
  modifiers?: BiometricModifiers
): number {
  if (!modifiers) return baseLambda
  let scale = 1.0

  if (modifiers.sleepScore != null) {
    // Poor sleep (score < 50) slows recovery by up to 40%
    const sleepFactor = Math.max(0.6, modifiers.sleepScore / 100)
    scale *= sleepFactor
  }

  if (modifiers.hrvStatus === 'suppressed') {
    // Suppressed HRV indicates autonomic stress — slow recovery by 30%
    scale *= 0.7
  }

  return baseLambda * scale
}

export interface DecayInput {
  exerciseId: CalisthenicsExerciseId
  value: number // reps or hold seconds
  loggedAt: number // timestamp in ms (Date.now() when workout was logged)
}

export interface MuscleSoreness {
  muscle: MuscleGroup
  category: MovementCategory
  soreness: number // 0-100
  hoursToRecovery: number // estimated hours until <= 1%
}

export function computeMuscleSorenessDecay(
  inputs: DecayInput[],
  nowMs: number,
  modifiers?: BiometricModifiers
): MuscleSoreness[] {
  const lambda = computeEffectiveLambda(DEFAULT_LAMBDA, modifiers)
  const rawSoreness = new Map<MuscleGroup, number>()

  for (const input of inputs) {
    const activations = EXERCISE_MUSCLES[input.exerciseId] ?? []
    const elapsedHours = Math.max(0, (nowMs - input.loggedAt) / 3600000)

    for (const { muscle, level } of activations) {
      const peakLoad = level === 'primary'
        ? Math.min(100, (input.value / SORENESS_CAP) * 100)
        : Math.min(100, (input.value * 0.5 / SORENESS_CAP) * 100)

      const currentSoreness = peakLoad * Math.exp(-lambda * elapsedHours)
      const existing = rawSoreness.get(muscle) ?? 0
      rawSoreness.set(muscle, Math.min(100, existing + currentSoreness))
    }
  }

  const all = Object.keys(MUSCLE_LABELS) as MuscleGroup[]
  return all.map((muscle) => {
    const soreness = Math.round(rawSoreness.get(muscle) ?? 0)
    const hoursToRecovery = soreness > 1
      ? Math.round(Math.log(soreness) / lambda)
      : 0
    return {
      muscle,
      category: MUSCLE_CATEGORY[muscle],
      soreness,
      hoursToRecovery
    }
  })
}

export interface CategorySoreness {
  category: MovementCategory
  avgSoreness: number
  maxSoreness: number
  isRecovering: boolean // true if avg > 30%
}

export function computeCategorySoreness(
  muscleSoreness: MuscleSoreness[]
): CategorySoreness[] {
  const categories: MovementCategory[] = ['push', 'pull', 'legs', 'core']
  return categories.map((category) => {
    const muscles = muscleSoreness.filter((m) => m.category === category)
    const avgSoreness = muscles.length
      ? Math.round(muscles.reduce((s, m) => s + m.soreness, 0) / muscles.length)
      : 0
    const maxSoreness = muscles.length
      ? Math.max(...muscles.map((m) => m.soreness))
      : 0
    return {
      category,
      avgSoreness,
      maxSoreness,
      isRecovering: avgSoreness > 30
    }
  })
}
