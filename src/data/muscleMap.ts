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
    { muscle: 'triceps', level: 'primary' },
    { muscle: 'traps', level: 'secondary' },
    { muscle: 'chest', level: 'secondary' },
    { muscle: 'abs', level: 'secondary' }
  ],
  tuck_lsit: [
    { muscle: 'abs', level: 'primary' },
    { muscle: 'hip_flexors', level: 'primary' },
    { muscle: 'quads', level: 'secondary' },
    { muscle: 'triceps', level: 'secondary' },
    { muscle: 'forearms', level: 'secondary' }
  ],
  pistol_squat: [
    { muscle: 'quads', level: 'primary' },
    { muscle: 'glutes', level: 'primary' },
    { muscle: 'hamstrings', level: 'secondary' },
    { muscle: 'calves', level: 'secondary' },
    { muscle: 'abs', level: 'secondary' }
  ]
}

// ─────────────────────────────────────────────────────────────────────────
// SORENESS / LOAD SCORING
// 45 reps (or 45s hold) = 100% load for that session. We look at the
// last 48 hours of logs to estimate current "soreness" per muscle, then
// scale by activation level (primary counts more than secondary).
// ─────────────────────────────────────────────────────────────────────────

export const SORENESS_CAP = 45 // reps or seconds above which = 100%

export interface MuscleScore {
  muscle: MuscleGroup
  score: number // 0-100
  /** highest activation level from any contributing exercise */
  level: ActivationLevel
}

interface LogEntry {
  exerciseId: CalisthenicsExerciseId
  value: number // reps or hold seconds
  date: string  // YYYY-MM-DD
}

/**
 * Compute 0–100 soreness score per muscle from recent logs.
 * Primary activation: full value counts.
 * Secondary activation: 50% of value counts.
 * Score = min(100, sum across exercises / SORENESS_CAP * 100)
 */
export function computeMuscleScores(
  logs: LogEntry[],
  todayStr: string
): MuscleScore[] {
  // Only consider logs from today and yesterday (48h window)
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
