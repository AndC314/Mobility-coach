import type { CalisthenicsExerciseId } from '../db/db'

export type ProgressionCategory = 'push' | 'pull' | 'legs' | 'core'

export interface ProgressionNode {
  exerciseId: CalisthenicsExerciseId
  unlockRequirements: UnlockRequirement[]
  level: 1 | 2 | 3 | 4 | 5
}

export interface UnlockRequirement {
  exerciseId: CalisthenicsExerciseId
  threshold: number
  unit: 'reps' | 's'
}

export interface ProgressionChain {
  id: string
  category: ProgressionCategory
  label: string
  description: string
  nodes: ProgressionNode[]
}

// ─────────────────────────────────────────────────────────────────────────
// PUSH PROGRESSIONS
// Based on Coach Ready 360 Vol 1→3: Push-ups → Dips → Planche lean
// ─────────────────────────────────────────────────────────────────────────

const PUSH_HORIZONTAL: ProgressionChain = {
  id: 'push_horizontal',
  category: 'push',
  label: 'Horizontal Push',
  description: 'Push-up progressions: negatives → standard → explosive → one-arm',
  nodes: [
    {
      exerciseId: 'negative_pushups',
      unlockRequirements: [],
      level: 1,
    },
    {
      exerciseId: 'scapula_pushups',
      unlockRequirements: [{ exerciseId: 'negative_pushups', threshold: 8, unit: 'reps' }],
      level: 1,
    },
    {
      exerciseId: 'pushups',
      unlockRequirements: [{ exerciseId: 'negative_pushups', threshold: 10, unit: 'reps' }],
      level: 2,
    },
    {
      exerciseId: 'diamond_push_ups',
      unlockRequirements: [{ exerciseId: 'pushups', threshold: 15, unit: 'reps' }],
      level: 2,
    },
    {
      exerciseId: 'wide_push_ups',
      unlockRequirements: [{ exerciseId: 'pushups', threshold: 12, unit: 'reps' }],
      level: 2,
    },
    {
      exerciseId: 'triceps_bw_extension',
      unlockRequirements: [{ exerciseId: 'diamond_push_ups', threshold: 10, unit: 'reps' }],
      level: 3,
    },
    {
      exerciseId: 'explosive_pushups',
      unlockRequirements: [{ exerciseId: 'pushups', threshold: 20, unit: 'reps' }],
      level: 3,
    },
    {
      exerciseId: 'archer_pushups',
      unlockRequirements: [
        { exerciseId: 'diamond_push_ups', threshold: 12, unit: 'reps' },
        { exerciseId: 'explosive_pushups', threshold: 8, unit: 'reps' },
      ],
      level: 4,
    },
    {
      exerciseId: 'hindu_pushups',
      unlockRequirements: [{ exerciseId: 'pushups', threshold: 20, unit: 'reps' }],
      level: 3,
    },
    {
      exerciseId: 'planche_leans',
      unlockRequirements: [
        { exerciseId: 'diamond_push_ups', threshold: 15, unit: 'reps' },
        { exerciseId: 'dips', threshold: 8, unit: 'reps' },
      ],
      level: 4,
    },
  ],
}

const PUSH_VERTICAL: ProgressionChain = {
  id: 'push_vertical',
  category: 'push',
  label: 'Vertical Push',
  description: 'Dip and overhead pushing toward handstand push-up',
  nodes: [
    {
      exerciseId: 'dips',
      unlockRequirements: [{ exerciseId: 'pushups', threshold: 20, unit: 'reps' }],
      level: 2,
    },
    {
      exerciseId: 'straight_bar_dips',
      unlockRequirements: [{ exerciseId: 'dips', threshold: 10, unit: 'reps' }],
      level: 3,
    },
    {
      exerciseId: 'pike_pushups',
      unlockRequirements: [{ exerciseId: 'dips', threshold: 5, unit: 'reps' }],
      level: 3,
    },
    {
      exerciseId: 'crow_pose',
      unlockRequirements: [
        { exerciseId: 'planche_leans', threshold: 15, unit: 's' },
      ],
      level: 4,
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────
// PULL PROGRESSIONS
// Based on Coach Ready 360 Vol 1→2: Scapular → Rows → Pull-up → Muscle-up
// ─────────────────────────────────────────────────────────────────────────

const PULL_VERTICAL: ProgressionChain = {
  id: 'pull_vertical',
  category: 'pull',
  label: 'Vertical Pull',
  description: 'Passive hang → scapular control → assisted → strict pull-ups → muscle-up',
  nodes: [
    {
      exerciseId: 'passive_hang',
      unlockRequirements: [],
      level: 1,
    },
    {
      exerciseId: 'australian_pullups',
      unlockRequirements: [{ exerciseId: 'passive_hang', threshold: 30, unit: 's' }],
      level: 1,
    },
    {
      exerciseId: 'scapular_pullups',
      unlockRequirements: [{ exerciseId: 'passive_hang', threshold: 45, unit: 's' }],
      level: 1,
    },
    {
      exerciseId: 'band_assisted_pullups',
      unlockRequirements: [
        { exerciseId: 'australian_pullups', threshold: 12, unit: 'reps' },
        { exerciseId: 'scapular_pullups', threshold: 12, unit: 'reps' },
      ],
      level: 2,
    },
    {
      exerciseId: 'negative_pullups',
      unlockRequirements: [{ exerciseId: 'band_assisted_pullups', threshold: 6, unit: 'reps' }],
      level: 2,
    },
    {
      exerciseId: 'pullups',
      unlockRequirements: [{ exerciseId: 'negative_pullups', threshold: 5, unit: 'reps' }],
      level: 3,
    },
    {
      exerciseId: 'hanging_knee_to_chest',
      unlockRequirements: [{ exerciseId: 'pullups', threshold: 3, unit: 'reps' }],
      level: 3,
    },
    {
      exerciseId: 'high_pull_ups_c2b',
      unlockRequirements: [{ exerciseId: 'pullups', threshold: 8, unit: 'reps' }],
      level: 4,
    },
    {
      exerciseId: 'bar_lean_overs',
      unlockRequirements: [
        { exerciseId: 'straight_bar_dips', threshold: 8, unit: 'reps' },
        { exerciseId: 'pullups', threshold: 8, unit: 'reps' },
      ],
      level: 4,
    },
    {
      exerciseId: 'muscle_ups',
      unlockRequirements: [
        { exerciseId: 'pullups', threshold: 10, unit: 'reps' },
        { exerciseId: 'high_pull_ups_c2b', threshold: 5, unit: 'reps' },
        { exerciseId: 'bar_lean_overs', threshold: 6, unit: 'reps' },
      ],
      level: 5,
    },
  ],
}

const PULL_HORIZONTAL: ProgressionChain = {
  id: 'pull_horizontal',
  category: 'pull',
  label: 'Horizontal Pull',
  description: 'Eccentric rows → ring rows → wide rows → archer rows',
  nodes: [
    {
      exerciseId: 'eccentric_rows',
      unlockRequirements: [],
      level: 1,
    },
    {
      exerciseId: 'ring_rows',
      unlockRequirements: [{ exerciseId: 'eccentric_rows', threshold: 10, unit: 'reps' }],
      level: 2,
    },
    {
      exerciseId: 'wide_rows',
      unlockRequirements: [{ exerciseId: 'ring_rows', threshold: 12, unit: 'reps' }],
      level: 3,
    },
    {
      exerciseId: 'archer_rows',
      unlockRequirements: [{ exerciseId: 'wide_rows', threshold: 10, unit: 'reps' }],
      level: 4,
    },
    {
      exerciseId: 'australian_pullups',
      unlockRequirements: [{ exerciseId: 'ring_rows', threshold: 12, unit: 'reps' }],
      level: 2,
    },
    {
      exerciseId: 'door_pull',
      unlockRequirements: [],
      level: 1,
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────
// LEGS PROGRESSIONS
// Bodyweight leg strength: bilateral → unilateral
// ─────────────────────────────────────────────────────────────────────────

const LEGS_SQUAT: ProgressionChain = {
  id: 'legs_squat',
  category: 'legs',
  label: 'Squat Progression',
  description: 'Deep squats → narrow → bilateral → unilateral → pistol',
  nodes: [
    {
      exerciseId: 'deep_squat_atg',
      unlockRequirements: [],
      level: 1,
    },
    {
      exerciseId: 'narrow_stance_squat',
      unlockRequirements: [{ exerciseId: 'deep_squat_atg', threshold: 12, unit: 'reps' }],
      level: 1,
    },
    {
      exerciseId: 'squats',
      unlockRequirements: [{ exerciseId: 'narrow_stance_squat', threshold: 12, unit: 'reps' }],
      level: 2,
    },
    {
      exerciseId: 'glute_bridge',
      unlockRequirements: [{ exerciseId: 'squats', threshold: 15, unit: 'reps' }],
      level: 2,
    },
    {
      exerciseId: 'bulgarian_squat',
      unlockRequirements: [{ exerciseId: 'squats', threshold: 15, unit: 'reps' }],
      level: 3,
    },
    {
      exerciseId: 'cossack_squat',
      unlockRequirements: [{ exerciseId: 'bulgarian_squat', threshold: 6, unit: 'reps' }],
      level: 3,
    },
    {
      exerciseId: 'pistol_squat_box',
      unlockRequirements: [{ exerciseId: 'cossack_squat', threshold: 6, unit: 'reps' }],
      level: 4,
    },
    {
      exerciseId: 'pistol_squats',
      unlockRequirements: [{ exerciseId: 'pistol_squat_box', threshold: 5, unit: 'reps' }],
      level: 5,
    },
    {
      exerciseId: 'calf_raises',
      unlockRequirements: [{ exerciseId: 'squats', threshold: 15, unit: 'reps' }],
      level: 2,
    },
    {
      exerciseId: 'lunge_forward',
      unlockRequirements: [{ exerciseId: 'squats', threshold: 15, unit: 'reps' }],
      level: 2,
    },
    {
      exerciseId: 'lunge_backward',
      unlockRequirements: [{ exerciseId: 'lunge_forward', threshold: 12, unit: 'reps' }],
      level: 2,
    },
    {
      exerciseId: 'wall_sit',
      unlockRequirements: [],
      level: 1,
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────
// CORE PROGRESSIONS
// Based on Coach Ready 360 Vol 1: Hollow body → L-sit chain
// ─────────────────────────────────────────────────────────────────────────

const CORE_ANTERIOR: ProgressionChain = {
  id: 'core_anterior',
  category: 'core',
  label: 'Anterior Core',
  description: 'Plank to L-sit: compression and hollow body strength',
  nodes: [
    {
      exerciseId: 'plank',
      unlockRequirements: [],
      level: 1,
    },
    {
      exerciseId: 'dead_bug',
      unlockRequirements: [{ exerciseId: 'plank', threshold: 30, unit: 's' }],
      level: 1,
    },
    {
      exerciseId: 'hollow_body_hold',
      unlockRequirements: [{ exerciseId: 'plank', threshold: 60, unit: 's' }],
      level: 2,
    },
    {
      exerciseId: 'leg_raise',
      unlockRequirements: [{ exerciseId: 'hollow_body_hold', threshold: 20, unit: 's' }],
      level: 2,
    },
    {
      exerciseId: 'v_up',
      unlockRequirements: [{ exerciseId: 'leg_raise', threshold: 12, unit: 'reps' }],
      level: 3,
    },
    {
      exerciseId: 'tuck_lsit',
      unlockRequirements: [{ exerciseId: 'hollow_body_hold', threshold: 30, unit: 's' }],
      level: 3,
    },
    {
      exerciseId: 'one_leg_bent_lsit',
      unlockRequirements: [{ exerciseId: 'tuck_lsit', threshold: 15, unit: 's' }],
      level: 3,
    },
    {
      exerciseId: 'lsit',
      unlockRequirements: [{ exerciseId: 'one_leg_bent_lsit', threshold: 10, unit: 's' }],
      level: 4,
    },
    {
      exerciseId: 'straddle_lsit',
      unlockRequirements: [{ exerciseId: 'lsit', threshold: 15, unit: 's' }],
      level: 5,
    },
  ],
}

const CORE_POSTERIOR: ProgressionChain = {
  id: 'core_posterior',
  category: 'core',
  label: 'Posterior Core & Rotation',
  description: 'Back extension, bridge, and rotational stability',
  nodes: [
    {
      exerciseId: 'dog_bird',
      unlockRequirements: [],
      level: 1,
    },
    {
      exerciseId: 'superman',
      unlockRequirements: [{ exerciseId: 'dog_bird', threshold: 12, unit: 'reps' }],
      level: 1,
    },
    {
      exerciseId: 'side_plank',
      unlockRequirements: [{ exerciseId: 'plank', threshold: 45, unit: 's' }],
      level: 2,
    },
    {
      exerciseId: 'russian_twist',
      unlockRequirements: [{ exerciseId: 'side_plank', threshold: 30, unit: 's' }],
      level: 2,
    },
    {
      exerciseId: 'gymnastics_bridge',
      unlockRequirements: [
        { exerciseId: 'superman', threshold: 20, unit: 's' },
        { exerciseId: 'hollow_body_hold', threshold: 20, unit: 's' },
      ],
      level: 3,
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────
// LEGS — ADDUCTOR & LATERAL
// Targets inner thigh / adductors and lateral movement patterns
// ─────────────────────────────────────────────────────────────────────────

const LEGS_ADDUCTOR: ProgressionChain = {
  id: 'legs_adductor',
  category: 'legs',
  label: 'Adductor & Lateral',
  description: 'Groin and inner thigh strength for guard control',
  nodes: [
    {
      exerciseId: 'copenhagen_plank',
      unlockRequirements: [{ exerciseId: 'side_plank', threshold: 30, unit: 's' }],
      level: 3,
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────
// PULL — GRIP & NECK
// Targets forearms, neck, and traps
// ─────────────────────────────────────────────────────────────────────────

const PULL_GRIP_NECK: ProgressionChain = {
  id: 'pull_grip_neck',
  category: 'pull',
  label: 'Grip & Neck',
  description: 'Forearm endurance and neck strength for BJJ',
  nodes: [
    {
      exerciseId: 'dead_hang',
      unlockRequirements: [],
      level: 1,
    },
    {
      exerciseId: 'prone_y_raise',
      unlockRequirements: [],
      level: 1,
    },
    {
      exerciseId: 'neck_curls',
      unlockRequirements: [{ exerciseId: 'prone_y_raise', threshold: 12, unit: 'reps' }],
      level: 2,
    },
  ],
}

const PULL_LEVERS: ProgressionChain = {
  id: 'pull_levers',
  category: 'pull',
  label: 'Levers & Statics',
  description: 'Straight-arm pulling: german hang → skin the cat → back/front lever',
  nodes: [
    {
      exerciseId: 'german_hang',
      unlockRequirements: [{ exerciseId: 'dead_hang', threshold: 30, unit: 's' }],
      level: 2,
    },
    {
      exerciseId: 'skin_the_cat',
      unlockRequirements: [{ exerciseId: 'german_hang', threshold: 15, unit: 's' }],
      level: 2,
    },
    {
      exerciseId: 'tucked_front_lever',
      unlockRequirements: [{ exerciseId: 'skin_the_cat', threshold: 5, unit: 'reps' }],
      level: 3,
    },
    {
      exerciseId: 'adv_tuck_front_lever',
      unlockRequirements: [{ exerciseId: 'tucked_front_lever', threshold: 10, unit: 's' }],
      level: 4,
    },
    {
      exerciseId: 'straddle_front_lever',
      unlockRequirements: [{ exerciseId: 'adv_tuck_front_lever', threshold: 10, unit: 's' }],
      level: 4,
    },
    {
      exerciseId: 'front_lever',
      unlockRequirements: [{ exerciseId: 'straddle_front_lever', threshold: 10, unit: 's' }],
      level: 5,
    },
    {
      exerciseId: 'back_lever_adv_tuck',
      unlockRequirements: [{ exerciseId: 'skin_the_cat', threshold: 5, unit: 'reps' }],
      level: 3,
    },
    {
      exerciseId: 'back_lever_straddle',
      unlockRequirements: [{ exerciseId: 'back_lever_adv_tuck', threshold: 10, unit: 's' }],
      level: 4,
    },
    {
      exerciseId: 'back_lever',
      unlockRequirements: [{ exerciseId: 'back_lever_straddle', threshold: 10, unit: 's' }],
      level: 5,
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────
// PUSH — HANDSTAND & HSPU
// Wall walks → Headstand → Chest-to-wall → Freestanding → HSPU
// ─────────────────────────────────────────────────────────────────────────

const PUSH_HANDSTAND: ProgressionChain = {
  id: 'push_handstand',
  category: 'push',
  label: 'Handstand & HSPU',
  description: 'Inverted pressing: wall walks to freestanding handstand push-ups',
  nodes: [
    {
      exerciseId: 'pike_pushups',
      unlockRequirements: [{ exerciseId: 'pushups', threshold: 15, unit: 'reps' }],
      level: 2,
    },
    {
      exerciseId: 'tripod_headstand',
      unlockRequirements: [{ exerciseId: 'pike_pushups', threshold: 8, unit: 'reps' }],
      level: 2,
    },
    {
      exerciseId: 'wall_walks',
      unlockRequirements: [{ exerciseId: 'tripod_headstand', threshold: 20, unit: 's' }],
      level: 3,
    },
    {
      exerciseId: 'chest_to_wall_handstand',
      unlockRequirements: [{ exerciseId: 'wall_walks', threshold: 5, unit: 'reps' }],
      level: 3,
    },
    {
      exerciseId: 'freestanding_handstand',
      unlockRequirements: [{ exerciseId: 'chest_to_wall_handstand', threshold: 45, unit: 's' }],
      level: 4,
    },
    {
      exerciseId: 'wall_hspu',
      unlockRequirements: [{ exerciseId: 'chest_to_wall_handstand', threshold: 30, unit: 's' }],
      level: 4,
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────
// PUSH — ONE-ARM PUSH-UP
// Diamond → Archer → Pseudo planche → (leads to one-arm)
// ─────────────────────────────────────────────────────────────────────────

const PUSH_ONE_ARM: ProgressionChain = {
  id: 'push_one_arm',
  category: 'push',
  label: 'One-Arm Push-Up',
  description: 'Unilateral pressing: diamond to pseudo planche',
  nodes: [
    {
      exerciseId: 'diamond_push_ups',
      unlockRequirements: [{ exerciseId: 'pushups', threshold: 15, unit: 'reps' }],
      level: 2,
    },
    {
      exerciseId: 'archer_pushups',
      unlockRequirements: [{ exerciseId: 'diamond_push_ups', threshold: 10, unit: 'reps' }],
      level: 3,
    },
    {
      exerciseId: 'pseudo_planche_push_up',
      unlockRequirements: [{ exerciseId: 'archer_pushups', threshold: 8, unit: 'reps' }],
      level: 4,
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────
// CORE — DRAGON FLAG
// Hollow body → Leg raises → Negatives → Full hold
// ─────────────────────────────────────────────────────────────────────────

const CORE_DRAGON_FLAG: ProgressionChain = {
  id: 'core_dragon_flag',
  category: 'core',
  label: 'Dragon Flag',
  description: 'Maximal anterior core: hollow body to full dragon flag',
  nodes: [
    {
      exerciseId: 'hollow_body_hold',
      unlockRequirements: [{ exerciseId: 'plank', threshold: 60, unit: 's' }],
      level: 2,
    },
    {
      exerciseId: 'hollow_body_rocks',
      unlockRequirements: [{ exerciseId: 'hollow_body_hold', threshold: 30, unit: 's' }],
      level: 2,
    },
    {
      exerciseId: 'leg_raise',
      unlockRequirements: [{ exerciseId: 'hollow_body_hold', threshold: 30, unit: 's' }],
      level: 3,
    },
    {
      exerciseId: 'dragon_flag_negatives',
      unlockRequirements: [
        { exerciseId: 'hollow_body_hold', threshold: 40, unit: 's' },
        { exerciseId: 'leg_raise', threshold: 12, unit: 'reps' },
      ],
      level: 4,
    },
    {
      exerciseId: 'dragon_flag_press_hold',
      unlockRequirements: [{ exerciseId: 'dragon_flag_negatives', threshold: 5, unit: 'reps' }],
      level: 5,
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────

export const PROGRESSION_CHAINS: ProgressionChain[] = [
  PUSH_HORIZONTAL,
  PUSH_VERTICAL,
  PUSH_HANDSTAND,
  PUSH_ONE_ARM,
  PULL_VERTICAL,
  PULL_HORIZONTAL,
  PULL_LEVERS,
  PULL_GRIP_NECK,
  LEGS_SQUAT,
  LEGS_ADDUCTOR,
  CORE_ANTERIOR,
  CORE_POSTERIOR,
  CORE_DRAGON_FLAG,
]

export function getChainsForCategory(category: ProgressionCategory): ProgressionChain[] {
  return PROGRESSION_CHAINS.filter((c) => c.category === category)
}

export function getChainForExercise(exerciseId: CalisthenicsExerciseId): ProgressionChain | undefined {
  return PROGRESSION_CHAINS.find((c) => c.nodes.some((n) => n.exerciseId === exerciseId))
}

export function getNextUnlocks(
  exerciseId: CalisthenicsExerciseId,
  currentBest: number
): { exerciseId: CalisthenicsExerciseId; threshold: number; unit: 'reps' | 's'; progress: number }[] {
  const unlocks: { exerciseId: CalisthenicsExerciseId; threshold: number; unit: 'reps' | 's'; progress: number }[] = []

  for (const chain of PROGRESSION_CHAINS) {
    for (const node of chain.nodes) {
      for (const req of node.unlockRequirements) {
        if (req.exerciseId === exerciseId) {
          const progress = Math.min(100, Math.round((currentBest / req.threshold) * 100))
          unlocks.push({
            exerciseId: node.exerciseId,
            threshold: req.threshold,
            unit: req.unit,
            progress,
          })
        }
      }
    }
  }

  return unlocks
}

export const LEVEL_LABELS: Record<number, string> = {
  1: 'Foundation',
  2: 'Intermediate',
  3: 'Advanced',
  4: 'Elite',
  5: 'Master',
}

export const LEVEL_COLORS: Record<number, string> = {
  1: '#7a7d96',
  2: '#2ec4b6',
  3: '#f5c842',
  4: '#e8622a',
  5: '#a78bfa',
}
