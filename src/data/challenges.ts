import type { CalisthenicsExerciseId } from '../db/db'

export type ChallengeType = 'target_reps' | 'max_reps' | 'accumulate_hold' | 'circuit_amrap'

export interface ChallengePR {
  bestReps: number
  bestTimeSec: number | null // fastest time to hit target (null if never reached)
}

export interface CircuitExercise {
  exerciseId: CalisthenicsExerciseId
  reps: number
  label: string
}

export interface ChallengeDef {
  id: string
  name: string
  exerciseId: CalisthenicsExerciseId
  type: ChallengeType
  /** For target_reps: reps to reach. For accumulate_hold: seconds to accumulate */
  targetReps?: number
  /** Time limit in seconds */
  timeLimitSec: number
  description: string
  icon: string
  /** Category for filtering */
  category: 'push' | 'pull' | 'legs' | 'core' | 'full_body'
  /** For circuit_amrap: exercises per round */
  circuitExercises?: CircuitExercise[]
  /** Notable benchmark to display */
  benchmark?: string
}

export const CHALLENGES: ChallengeDef[] = [
  // ─── PUSH DENSITY ─────────────────────────────────────────────────────
  {
    id: 'pushups_100',
    name: '100 Push-ups',
    exerciseId: 'pushups',
    type: 'target_reps',
    targetReps: 100,
    timeLimitSec: 600,
    description: 'Complete 100 push-ups in under 10 minutes. Pace with sets of 10–15, rest briefly between. Classic work capacity benchmark.',
    icon: '💪',
    category: 'push',
  },
  {
    id: 'pushups_50_5min',
    name: '50 Push-ups',
    exerciseId: 'pushups',
    type: 'target_reps',
    targetReps: 50,
    timeLimitSec: 300,
    description: 'Complete 50 push-ups in under 5 minutes. Break into manageable sets — stay well below failure.',
    icon: '💪',
    category: 'push',
  },
  {
    id: 'dips_50',
    name: '50 Dips',
    exerciseId: 'dips',
    type: 'target_reps',
    targetReps: 50,
    timeLimitSec: 480,
    description: 'Complete 50 dips in under 8 minutes. Full lockout at top, 90° at bottom. Rest as needed.',
    icon: '🔻',
    category: 'push',
  },

  // ─── PULL & LEVER CAPACITY ────────────────────────────────────────────
  {
    id: 'rows_100',
    name: 'Century Row',
    exerciseId: 'australian_pullups',
    type: 'target_reps',
    targetReps: 100,
    timeLimitSec: 480,
    description: '100 Australian rows in under 8 minutes. Direct antagonist to the 100 push-ups — builds scapular retractors and lat endurance for levers.',
    icon: '🪢',
    category: 'pull',
  },
  {
    id: 'max_pullups_5min',
    name: 'Pull-up Max',
    exerciseId: 'pullups',
    type: 'max_reps',
    timeLimitSec: 300,
    description: 'Maximum pull-ups in 5 minutes. Break into small sets, rest as needed. Tracks your submaximal pulling density.',
    icon: '🧗',
    category: 'pull',
  },

  // ─── LEGS & FULL BODY ─────────────────────────────────────────────────
  {
    id: 'squats_100',
    name: '100 Squats',
    exerciseId: 'squats',
    type: 'target_reps',
    targetReps: 100,
    timeLimitSec: 480,
    description: 'Complete 100 bodyweight squats in under 8 minutes. Full depth — hip crease below knee.',
    icon: '🦵',
    category: 'legs',
  },
  {
    id: 'max_burpees_2min',
    name: 'Burpee Blitz',
    exerciseId: 'burpees',
    type: 'max_reps',
    timeLimitSec: 120,
    description: 'Maximum burpees in 2 minutes. Full extension at top, chest to floor at bottom. Pure metabolic test.',
    icon: '🔥',
    category: 'full_body',
  },
  {
    id: 'max_burpees_5min',
    name: '5-Min Burpee Test',
    exerciseId: 'burpees',
    type: 'max_reps',
    timeLimitSec: 300,
    description: 'Maximum burpees in 5 minutes. Pacing is everything — start conservative, maintain rhythm.',
    icon: '🔥',
    category: 'full_body',
  },
  {
    id: 'jumping_lunges_100',
    name: '100 Jumping Lunges',
    exerciseId: 'jumping_lunges',
    type: 'target_reps',
    targetReps: 100,
    timeLimitSec: 480,
    description: '100 jumping lunges in under 8 minutes. Each landing counts as one rep. Land softly.',
    icon: '🦘',
    category: 'legs',
  },

  // ─── CORE COMPRESSION & LEVER SKILL ───────────────────────────────────
  {
    id: 'hollow_hold_3min',
    name: 'Hollow Body 3-Min',
    exerciseId: 'hollow_body_hold',
    type: 'accumulate_hold',
    targetReps: 180,
    timeLimitSec: 300,
    description: 'Accumulate 3 minutes of hollow body hold within 5 minutes. Rest when form breaks — lower back must stay pinned.',
    icon: '🛡️',
    category: 'core',
  },
  {
    id: 'plank_5min',
    name: '5-Minute Plank',
    exerciseId: 'plank',
    type: 'accumulate_hold',
    targetReps: 300,
    timeLimitSec: 360,
    description: 'Accumulate 5 minutes of plank hold within 6 minutes. Pause and resume — clock keeps running.',
    icon: '🧱',
    category: 'core',
  },
  {
    id: 'lsit_2min',
    name: 'L-Sit 2-Min',
    exerciseId: 'lsit',
    type: 'accumulate_hold',
    targetReps: 120,
    timeLimitSec: 300,
    description: 'Accumulate 2 minutes of L-sit hold within 5 minutes. Use parallettes. Tuck allowed if legs fatigue.',
    icon: '📐',
    category: 'core',
  },

  // ─── CIRCUIT AMRAP ────────────────────────────────────────────────────
  {
    id: 'cindy',
    name: 'Cindy',
    exerciseId: 'pullups',
    type: 'circuit_amrap',
    timeLimitSec: 1200,
    description: '20 minutes AMRAP: 5 Pull-ups → 10 Push-ups → 15 Air Squats. Move smoothly between exercises with minimal rest.',
    icon: '🔁',
    category: 'full_body',
    benchmark: "Tom Holland's PR: 27 rounds",
    circuitExercises: [
      { exerciseId: 'pullups', reps: 5, label: 'Pull-ups' },
      { exerciseId: 'pushups', reps: 10, label: 'Push-ups' },
      { exerciseId: 'squats', reps: 15, label: 'Air Squats' },
    ],
  },
]
