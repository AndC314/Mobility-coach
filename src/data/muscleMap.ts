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
  front_delt: 'Shoulders',
  triceps: 'Triceps',
  biceps: 'Biceps',
  forearms: 'Forearms',
  abs: 'Abs',
  hip_flexors: 'Pelvis',
  quads: 'Quadriceps',
  inner_thigh: 'Hip adductors',
  lats: 'Back',
  rear_delt: 'Rotator cuff',
  traps: 'Neck / Traps',
  rhomboids: 'Back (mid)',
  lower_back: 'Spine',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  calves: 'Legs (calves)'
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

export const EXERCISE_MUSCLES: Partial<Record<CalisthenicsExerciseId, MuscleActivation[]>> = {
  archer_pushups: [
    { muscle: 'chest', level: 'primary' },
    { muscle: 'triceps', level: 'primary' },
    { muscle: 'front_delt', level: 'secondary' },
    { muscle: 'biceps', level: 'secondary' }
  ],
  australian_pullups: [
    { muscle: 'rhomboids', level: 'primary' },
    { muscle: 'lats', level: 'primary' },
    { muscle: 'rear_delt', level: 'primary' },
    { muscle: 'biceps', level: 'secondary' },
    { muscle: 'traps', level: 'secondary' },
    { muscle: 'abs', level: 'secondary' }
  ],
  bulgarian_squat: [
    { muscle: 'quads', level: 'primary' },
    { muscle: 'glutes', level: 'primary' },
    { muscle: 'hip_flexors', level: 'secondary' },
    { muscle: 'hamstrings', level: 'secondary' },
    { muscle: 'calves', level: 'secondary' }
  ],
  dips: [
    { muscle: 'triceps', level: 'primary' },
    { muscle: 'chest', level: 'primary' },
    { muscle: 'front_delt', level: 'secondary' },
    { muscle: 'lats', level: 'secondary' }
  ],
  gymnastics_bridge: [
    { muscle: 'glutes', level: 'primary' },
    { muscle: 'hamstrings', level: 'primary' },
    { muscle: 'chest', level: 'secondary' },
    { muscle: 'front_delt', level: 'secondary' }
  ],
  hanging_knee_to_chest: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'hip_flexors', level: 'primary' },
    { muscle: 'forearms', level: 'secondary' }
  ],
  hindu_pushups: [
    { muscle: 'chest', level: 'primary' },
    { muscle: 'triceps', level: 'primary' },
    { muscle: 'lower_back', level: 'secondary' },
    { muscle: 'front_delt', level: 'secondary' }
  ],
  hollow_body_hold: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'hip_flexors', level: 'secondary' },
    { muscle: 'lower_back', level: 'secondary' }
  ],
  lsit: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'hip_flexors', level: 'primary' },
    { muscle: 'triceps', level: 'secondary' },
    { muscle: 'front_delt', level: 'secondary' }
  ],
  pike_pushups: [
    { muscle: 'front_delt', level: 'primary' },
    { muscle: 'chest', level: 'secondary' },
    { muscle: 'triceps', level: 'secondary' },
    { muscle: 'abs', level: 'secondary' }
  ],
  planche_leans: [
    { muscle: 'front_delt', level: 'primary' },
    { muscle: 'triceps', level: 'primary' },
    { muscle: 'abs', level: 'secondary' },
    { muscle: 'chest', level: 'secondary' }
  ],
  plank: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'lower_back', level: 'primary' },
    { muscle: 'glutes', level: 'secondary' },
    { muscle: 'front_delt', level: 'secondary' },
    { muscle: 'triceps', level: 'secondary' }
  ],
  pistol_squats: [
    { muscle: 'quads', level: 'primary' },
    { muscle: 'glutes', level: 'primary' },
    { muscle: 'hamstrings', level: 'secondary' },
    { muscle: 'hip_flexors', level: 'secondary' }
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
  pushups: [
    { muscle: 'chest', level: 'primary' },
    { muscle: 'front_delt', level: 'primary' },
    { muscle: 'triceps', level: 'primary' },
    { muscle: 'abs', level: 'secondary' },
    { muscle: 'lats', level: 'secondary' }
  ],
  ring_rows: [
    { muscle: 'lats', level: 'primary' },
    { muscle: 'biceps', level: 'primary' },
    { muscle: 'rear_delt', level: 'secondary' },
    { muscle: 'rhomboids', level: 'secondary' }
  ],
  scapular_pullups: [
    { muscle: 'lats', level: 'primary' },
    { muscle: 'rear_delt', level: 'primary' },
    { muscle: 'traps', level: 'secondary' },
    { muscle: 'rhomboids', level: 'secondary' }
  ],
  squats: [
    { muscle: 'quads', level: 'primary' },
    { muscle: 'glutes', level: 'primary' },
    { muscle: 'hamstrings', level: 'secondary' },
    { muscle: 'calves', level: 'secondary' },
    { muscle: 'lower_back', level: 'secondary' }
  ],
  tuck_lsit: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'hip_flexors', level: 'primary' },
    { muscle: 'triceps', level: 'secondary' },
    { muscle: 'front_delt', level: 'secondary' }
  ],
  side_plank: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'glutes', level: 'secondary' },
    { muscle: 'front_delt', level: 'secondary' }
  ],
  crow_pose: [
    { muscle: 'triceps', level: 'primary' },
    { muscle: 'front_delt', level: 'primary' },
    { muscle: 'abs', level: 'primary' },
    { muscle: 'forearms', level: 'secondary' }
  ],
  sit_ups: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'hip_flexors', level: 'secondary' }
  ],
  glute_bridge: [
    { muscle: 'glutes', level: 'primary' },
    { muscle: 'hamstrings', level: 'secondary' },
    { muscle: 'lower_back', level: 'secondary' }
  ],
  leg_raise: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'hip_flexors', level: 'primary' }
  ],
  v_up: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'hip_flexors', level: 'secondary' }
  ],
  dog_bird: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'lower_back', level: 'primary' },
    { muscle: 'glutes', level: 'secondary' }
  ],
  diamond_push_ups: [
    { muscle: 'triceps', level: 'primary' },
    { muscle: 'chest', level: 'primary' },
    { muscle: 'front_delt', level: 'secondary' }
  ],
  wide_push_ups: [
    { muscle: 'chest', level: 'primary' },
    { muscle: 'front_delt', level: 'secondary' },
    { muscle: 'abs', level: 'secondary' }
  ],
  dead_bug: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'lower_back', level: 'secondary' },
    { muscle: 'hip_flexors', level: 'secondary' }
  ],
  crunches: [
    { muscle: 'abs', level: 'primary' }
  ],
  door_pull: [
    { muscle: 'lats', level: 'primary' },
    { muscle: 'biceps', level: 'primary' },
    { muscle: 'rhomboids', level: 'primary' },
    { muscle: 'rear_delt', level: 'secondary' }
  ],
  russian_twist: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'hip_flexors', level: 'secondary' }
  ],
  superman: [
    { muscle: 'lower_back', level: 'primary' },
    { muscle: 'glutes', level: 'primary' },
    { muscle: 'hamstrings', level: 'secondary' }
  ],
  wall_plank: [
    { muscle: 'chest', level: 'primary' },
    { muscle: 'front_delt', level: 'primary' },
    { muscle: 'abs', level: 'primary' },
    { muscle: 'triceps', level: 'secondary' }
  ],
  wall_sit: [
    { muscle: 'quads', level: 'primary' },
    { muscle: 'glutes', level: 'primary' },
    { muscle: 'calves', level: 'secondary' }
  ],
  lunge_forward: [
    { muscle: 'quads', level: 'primary' },
    { muscle: 'glutes', level: 'primary' },
    { muscle: 'hamstrings', level: 'secondary' },
    { muscle: 'calves', level: 'secondary' }
  ],
  lunge_backward: [
    { muscle: 'quads', level: 'primary' },
    { muscle: 'glutes', level: 'primary' },
    { muscle: 'hamstrings', level: 'primary' },
    { muscle: 'calves', level: 'secondary' }
  ],
  calf_raises: [
    { muscle: 'calves', level: 'primary' }
  ],
  dead_hang: [
    { muscle: 'forearms', level: 'primary' },
    { muscle: 'lats', level: 'secondary' },
    { muscle: 'rear_delt', level: 'secondary' }
  ],
  neck_curls: [
    { muscle: 'traps', level: 'primary' }
  ],
  prone_y_raise: [
    { muscle: 'traps', level: 'primary' },
    { muscle: 'rear_delt', level: 'primary' },
    { muscle: 'rhomboids', level: 'secondary' }
  ],
  copenhagen_plank: [
    { muscle: 'inner_thigh', level: 'primary' },
    { muscle: 'abs', level: 'primary' },
    { muscle: 'glutes', level: 'secondary' }
  ],
  cossack_squat: [
    { muscle: 'inner_thigh', level: 'primary' },
    { muscle: 'quads', level: 'primary' },
    { muscle: 'glutes', level: 'primary' },
    { muscle: 'hamstrings', level: 'secondary' }
  ],
  support_hold: [
    { muscle: 'triceps', level: 'primary' },
    { muscle: 'front_delt', level: 'primary' },
    { muscle: 'chest', level: 'secondary' },
    { muscle: 'abs', level: 'secondary' }
  ],
  knee_raises: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'hip_flexors', level: 'primary' },
    { muscle: 'triceps', level: 'secondary' }
  ],
  tucked_front_lever: [
    { muscle: 'lats', level: 'primary' },
    { muscle: 'rear_delt', level: 'primary' },
    { muscle: 'abs', level: 'primary' },
    { muscle: 'biceps', level: 'secondary' }
  ],
  front_lever: [
    { muscle: 'lats', level: 'primary' },
    { muscle: 'rear_delt', level: 'primary' },
    { muscle: 'abs', level: 'primary' },
    { muscle: 'lower_back', level: 'primary' },
    { muscle: 'biceps', level: 'secondary' },
    { muscle: 'glutes', level: 'secondary' }
  ],
  back_lever: [
    { muscle: 'front_delt', level: 'primary' },
    { muscle: 'biceps', level: 'primary' },
    { muscle: 'chest', level: 'secondary' },
    { muscle: 'abs', level: 'secondary' }
  ],
  planche: [
    { muscle: 'front_delt', level: 'primary' },
    { muscle: 'chest', level: 'primary' },
    { muscle: 'triceps', level: 'primary' },
    { muscle: 'abs', level: 'primary' },
    { muscle: 'lower_back', level: 'secondary' }
  ],
  press_to_handstand: [
    { muscle: 'front_delt', level: 'primary' },
    { muscle: 'triceps', level: 'primary' },
    { muscle: 'abs', level: 'primary' },
    { muscle: 'hip_flexors', level: 'secondary' }
  ],
  tricep_extension: [
    { muscle: 'triceps', level: 'primary' },
    { muscle: 'front_delt', level: 'secondary' },
    { muscle: 'abs', level: 'secondary' }
  ],
  straight_bar_dips: [
    { muscle: 'triceps', level: 'primary' },
    { muscle: 'chest', level: 'primary' },
    { muscle: 'front_delt', level: 'secondary' },
    { muscle: 'abs', level: 'secondary' }
  ],
  muscle_ups: [
    { muscle: 'lats', level: 'primary' },
    { muscle: 'chest', level: 'primary' },
    { muscle: 'triceps', level: 'secondary' },
    { muscle: 'biceps', level: 'secondary' },
    { muscle: 'front_delt', level: 'secondary' },
    { muscle: 'abs', level: 'secondary' }
  ],
  skin_the_cat: [
    { muscle: 'lats', level: 'primary' },
    { muscle: 'rear_delt', level: 'primary' },
    { muscle: 'biceps', level: 'secondary' },
    { muscle: 'abs', level: 'secondary' },
    { muscle: 'front_delt', level: 'secondary' }
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
    { exerciseId: 'dead_hang', label: 'Dead Hang' },
    { exerciseId: 'pullups', label: 'Pull-ups' }
  ],
  abs: [
    { exerciseId: 'hollow_body_hold', label: 'Hollow Body' },
    { exerciseId: 'plank', label: 'Plank' }
  ],
  hip_flexors: [
    { exerciseId: 'hollow_body_hold', label: 'Hollow Body' },
    { exerciseId: 'leg_raise', label: 'Leg Raise' }
  ],
  quads: [
    { exerciseId: 'squats', label: 'Squats' },
    { exerciseId: 'bulgarian_squat', label: 'Bulgarian Split Squat' }
  ],
  inner_thigh: [
    { exerciseId: 'copenhagen_plank', label: 'Copenhagen Plank' },
    { exerciseId: 'cossack_squat', label: 'Cossack Squat' }
  ],
  lats: [
    { exerciseId: 'pullups', label: 'Pull-ups' },
    { exerciseId: 'australian_pullups', label: 'Australian Pull-ups' }
  ],
  rear_delt: [
    { exerciseId: 'australian_pullups', label: 'Australian Pull-ups' }
  ],
  traps: [
    { exerciseId: 'neck_curls', label: 'Neck Curls' },
    { exerciseId: 'prone_y_raise', label: 'Prone Y-Raise' }
  ],
  rhomboids: [
    { exerciseId: 'australian_pullups', label: 'Australian Pull-ups' },
    { exerciseId: 'pullups', label: 'Pull-ups' }
  ],
  lower_back: [
    { exerciseId: 'superman', label: 'Superman' },
    { exerciseId: 'dog_bird', label: 'Bird-Dog' }
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
// EXERCISE SUGGESTIONS WITH TARGETS
// Given untrained muscles + user log history, returns de-duplicated
// exercise suggestions with progressive overload targets.
// ─────────────────────────────────────────────────────────────────────────

export interface TargetedSuggestion {
  exerciseId: CalisthenicsExerciseId
  label: string
  targetSets: number
  targetReps: number
  muscle: MuscleGroup
  isNew: boolean // true if user has never logged this exercise
}

export function computeSuggestions(
  muscles: MuscleGroup[],
  allLogs: LogEntry[]
): TargetedSuggestion[] {
  const seen = new Set<CalisthenicsExerciseId>()
  const suggestions: TargetedSuggestion[] = []

  // Find user's best value per exercise
  const bestByExercise = new Map<CalisthenicsExerciseId, number>()
  for (const log of allLogs) {
    const prev = bestByExercise.get(log.exerciseId) ?? 0
    if (log.value > prev) bestByExercise.set(log.exerciseId, log.value)
  }

  for (const muscle of muscles) {
    const candidates = MUSCLE_SUGGESTIONS[muscle] ?? []
    for (const { exerciseId, label } of candidates) {
      if (seen.has(exerciseId)) continue
      seen.add(exerciseId)

      const best = bestByExercise.get(exerciseId)
      const isNew = best == null
      let targetReps: number
      if (isNew) {
        targetReps = 5
      } else if (best < 10) {
        targetReps = best + 1
      } else {
        targetReps = Math.ceil(best * 1.1)
      }

      suggestions.push({
        exerciseId,
        label,
        targetSets: 3,
        targetReps,
        muscle,
        isNew,
      })
      break // one exercise per muscle to keep suggestions compact
    }
  }

  return suggestions
}

// ─────────────────────────────────────────────────────────────────────────
// SORENESS / LOAD SCORING
//
// The load threshold is adaptive: 100% = matching your best recent 48h
// volume for that muscle. If you did 60 total reps for chest last week,
// 100% next time means you hit 60+ again. Falls back to a baseline cap
// when no history exists.
// ─────────────────────────────────────────────────────────────────────────

export const BASELINE_CAP = 45
export const SORENESS_CAP = BASELINE_CAP

export type MuscleCaps = Partial<Record<MuscleGroup, number>>

export interface MuscleScore {
  muscle: MuscleGroup
  score: number // 0-100
  level: ActivationLevel
}

export interface LogEntry {
  exerciseId: CalisthenicsExerciseId
  value: number
  date: string
}

/**
 * Computes per-muscle adaptive caps from historical logs.
 * For each muscle, finds the max total volume achieved in any 48h window
 * across the last 14 days. Returns a partial map — muscles without history
 * will use BASELINE_CAP as fallback.
 */
export function computeAdaptiveCaps(historicalLogs: LogEntry[], todayStr: string): MuscleCaps {
  const [ty, tm, td] = todayStr.split('-').map(Number)
  const today = new Date(ty, tm - 1, td)

  // Group logs by date
  const byDate = new Map<string, LogEntry[]>()
  for (const log of historicalLogs) {
    const existing = byDate.get(log.date) ?? []
    existing.push(log)
    byDate.set(log.date, existing)
  }

  // Get all dates in last 14 days
  const dates: string[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }

  // For each possible 48h window start, compute muscle volume
  const caps: MuscleCaps = {}
  const all = Object.keys(MUSCLE_LABELS) as MuscleGroup[]

  for (let windowStart = 0; windowStart < 13; windowStart++) {
    const windowDates = [dates[windowStart], dates[windowStart + 1]]
    const windowLogs = windowDates.flatMap((d) => byDate.get(d) ?? [])
    if (windowLogs.length === 0) continue

    const muscleTotals = new Map<MuscleGroup, number>()
    for (const log of windowLogs) {
      const activations = EXERCISE_MUSCLES[log.exerciseId] ?? []
      for (const { muscle, level } of activations) {
        const contribution = level === 'primary' ? log.value : log.value * 0.5
        muscleTotals.set(muscle, (muscleTotals.get(muscle) ?? 0) + contribution)
      }
    }

    for (const muscle of all) {
      const total = muscleTotals.get(muscle) ?? 0
      if (total > 0) {
        caps[muscle] = Math.max(caps[muscle] ?? 0, total)
      }
    }
  }

  return caps
}

export function computeMuscleScores(
  logs: LogEntry[],
  todayStr: string,
  adaptiveCaps?: MuscleCaps
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
    const cap = adaptiveCaps?.[muscle] ?? BASELINE_CAP
    return {
      muscle,
      score: entry ? Math.min(100, Math.round((entry.total / cap) * 100)) : 0,
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
