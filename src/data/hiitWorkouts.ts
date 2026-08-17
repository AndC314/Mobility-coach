import type { CalisthenicsExerciseId } from '../db/db'
import { CALISTHENICS_EXERCISES, type ExerciseCategory } from './calisthenics'

export type HiitFormat = 'tabata' | 'emom' | 'amrap'

export interface HiitWorkoutDef {
  id: string
  name: string
  format: HiitFormat
  description: string
  workSec: number
  restSec: number
  rounds: number
  exercises: CalisthenicsExerciseId[]
}

export const HIIT_FORMAT_INFO: Record<HiitFormat, { label: string; description: string; icon: string }> = {
  tabata: {
    label: 'Tabata',
    description: '20s work / 10s rest × 8 rounds',
    icon: '⚡',
  },
  emom: {
    label: 'EMOM',
    description: 'Every Minute On the Minute — complete reps, rest remainder',
    icon: '⏱️',
  },
  amrap: {
    label: 'AMRAP',
    description: 'As Many Rounds As Possible in time cap',
    icon: '🔥',
  },
}

// ─────────────────────────────────────────────────────────────────────────
// RANDOM WORKOUT GENERATOR
// Picks one exercise per category in push→pull→legs→core order
// ─────────────────────────────────────────────────────────────────────────

const HIIT_POOL: Record<ExerciseCategory, CalisthenicsExerciseId[]> = {
  push: ['pushups', 'diamond_push_ups', 'wide_push_ups', 'hindu_pushups', 'pike_pushups', 'archer_pushups', 'burpees'],
  pull: ['australian_pullups', 'pullups', 'ring_rows', 'scapular_pullups', 'door_pull'],
  legs: ['squats', 'lunge_forward', 'lunge_backward', 'bulgarian_squat', 'glute_bridge', 'calf_raises', 'jumping_lunges'],
  core: ['hollow_body_hold', 'v_up', 'dead_bug', 'leg_raise', 'russian_twist', 'sit_ups'],
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateBalancedHiit(rounds: 2 | 3 = 3): HiitWorkoutDef {
  const push = pickRandom(HIIT_POOL.push)
  const pull = pickRandom(HIIT_POOL.pull)
  const legs = pickRandom(HIIT_POOL.legs)
  const core = pickRandom(HIIT_POOL.core)

  const exercises: CalisthenicsExerciseId[] = [push, pull, legs, core]
  const totalRounds = exercises.length * rounds

  const names = exercises.map((id) => {
    const def = CALISTHENICS_EXERCISES.find((e) => e.id === id)
    return def?.name ?? id
  })

  return {
    id: `random_${Date.now()}`,
    name: 'Full Body Flow',
    format: 'tabata',
    description: `${names.join(' → ')} × ${rounds} rounds`,
    workSec: 40,
    restSec: 20,
    rounds: totalRounds,
    exercises,
  }
}

export function getExercisePool(): Record<ExerciseCategory, { id: CalisthenicsExerciseId; name: string }[]> {
  const result: Record<ExerciseCategory, { id: CalisthenicsExerciseId; name: string }[]> = {
    push: [], pull: [], legs: [], core: [],
  }
  for (const cat of Object.keys(HIIT_POOL) as ExerciseCategory[]) {
    result[cat] = HIIT_POOL[cat].map((id) => {
      const def = CALISTHENICS_EXERCISES.find((e) => e.id === id)
      return { id, name: def?.name ?? id }
    })
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────
// PRESET WORKOUTS
// ─────────────────────────────────────────────────────────────────────────

export const PRESET_WORKOUTS: HiitWorkoutDef[] = [
  {
    id: 'tabata_push',
    name: 'Tabata Push',
    format: 'tabata',
    description: 'Push-ups and dips, 8 rounds',
    workSec: 20,
    restSec: 10,
    rounds: 8,
    exercises: ['pushups', 'dips', 'diamond_push_ups', 'wide_push_ups'],
  },
  {
    id: 'tabata_core',
    name: 'Tabata Core Blast',
    format: 'tabata',
    description: 'Hollow body, V-ups, dead bugs, planks',
    workSec: 20,
    restSec: 10,
    rounds: 8,
    exercises: ['hollow_body_hold', 'v_up', 'dead_bug', 'plank'],
  },
  {
    id: 'emom_pull',
    name: 'EMOM Pull',
    format: 'emom',
    description: '5 pull-ups every minute for 10 min',
    workSec: 60,
    restSec: 0,
    rounds: 10,
    exercises: ['pullups', 'australian_pullups'],
  },
  {
    id: 'emom_full',
    name: 'EMOM Full Body',
    format: 'emom',
    description: 'Alternate push-ups, squats, pull-ups each minute',
    workSec: 60,
    restSec: 0,
    rounds: 12,
    exercises: ['pushups', 'squats', 'pullups'],
  },
  {
    id: 'amrap_bodyweight',
    name: 'AMRAP Bodyweight',
    format: 'amrap',
    description: '10 push-ups, 10 squats, 5 pull-ups — max rounds in 12 min',
    workSec: 720,
    restSec: 0,
    rounds: 1,
    exercises: ['pushups', 'squats', 'pullups'],
  },
  {
    id: 'amrap_legs',
    name: 'AMRAP Legs',
    format: 'amrap',
    description: '15 squats, 10 lunges, 5 jump squats — max rounds in 10 min',
    workSec: 600,
    restSec: 0,
    rounds: 1,
    exercises: ['squats', 'lunge_forward', 'bulgarian_squat'],
  },
  {
    id: 'balanced_foundation',
    name: 'Foundation Flow',
    format: 'tabata',
    description: 'Push→Pull→Legs→Core balanced circuit, 40s/20s × 3 rounds',
    workSec: 40,
    restSec: 20,
    rounds: 12,
    exercises: ['pushups', 'australian_pullups', 'squats', 'dead_bug'],
  },
  {
    id: 'balanced_advanced',
    name: 'Full Body Blitz',
    format: 'tabata',
    description: 'Advanced push→pull→legs→core, 40s/20s × 3 rounds',
    workSec: 40,
    restSec: 20,
    rounds: 12,
    exercises: ['diamond_push_ups', 'pullups', 'bulgarian_squat', 'v_up'],
  },
]
