import type { CalisthenicsExerciseId } from '../db/db'

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
]
