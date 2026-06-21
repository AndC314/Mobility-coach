import type { CalisthenicsExerciseId, CalisthenicsMetric } from '../db/db'

export interface CalisthenicsExerciseDef {
  id: CalisthenicsExerciseId
  name: string
  metric: CalisthenicsMetric
  unit: string
  icon: string
  description: string
  /** true if the user has flagged limited access to equipment for this one */
  equipmentNote?: string
}

export const CALISTHENICS_EXERCISES: CalisthenicsExerciseDef[] = [
  {
    id: 'plank',
    name: 'Plank',
    metric: 'hold_sec',
    unit: 's',
    icon: '🧱',
    description: 'Total hold time, forearms or hands, straight line from shoulders to ankles.'
  },
  {
    id: 'hollow_body',
    name: 'Hollow Body',
    metric: 'hold_sec',
    unit: 's',
    icon: '🌙',
    description: 'Total hold time, lower back pressed to floor, shoulders and legs lifted.'
  },
  {
    id: 'pushups',
    name: 'Push-ups',
    metric: 'reps',
    unit: 'reps',
    icon: '💪',
    description: 'Max reps with good form, chest to floor.'
  },
  {
    id: 'pullups',
    name: 'Pull-ups',
    metric: 'reps',
    unit: 'reps',
    icon: '🧗',
    description: 'Max reps, full hang to chin over bar.'
  },
  {
    id: 'squats',
    name: 'Squats',
    metric: 'reps',
    unit: 'reps',
    icon: '🦵',
    description: 'Bodyweight squats, max reps with full depth.'
  },
  {
    id: 'bulgarian_squat',
    name: 'Bulgarian Split Squat',
    metric: 'reps',
    unit: 'reps',
    icon: '🦿',
    description: 'Rear foot elevated, max reps per leg.'
  },
  {
    id: 'australian_pullups',
    name: 'Australian Pull-ups',
    metric: 'reps',
    unit: 'reps',
    icon: '🪢',
    description: 'Horizontal row under a bar or rings, body straight.',
    equipmentNote: 'Needs a low bar or rings — log when accessible.'
  },
  {
    id: 'dips',
    name: 'Dips',
    metric: 'reps',
    unit: 'reps',
    icon: '🔻',
    description: 'Parallel bars or bench, max reps, full lockout at top, controlled descent.',
    equipmentNote: 'Needs parallel bars or sturdy edges — log when accessible.'
  },
  {
    id: 'pike_pushups',
    name: 'Pike Push-ups',
    metric: 'reps',
    unit: 'reps',
    icon: '🔺',
    description: 'Hips high in a pike/downward-dog shape, lower head toward floor between hands. Primary shoulder press progression toward handstand push-ups.'
  },
  {
    id: 'tuck_lsit',
    name: 'Tuck L-sit',
    metric: 'hold_sec',
    unit: 's',
    icon: '🪑',
    description: 'Knees tucked to chest, both feet off the floor, arms straight. Total accumulated hold time. The stepping stone between floor support holds and full L-sit.'
  },
  {
    id: 'pistol_squat',
    name: 'Pistol Squat',
    metric: 'reps',
    unit: 'reps',
    icon: '🦯',
    description: 'Single-leg squat to full depth, free leg extended forward. Count total reps across both legs. Use a doorframe or band for assistance if needed.'
  }
]

export function getExerciseDef(id: CalisthenicsExerciseId): CalisthenicsExerciseDef | undefined {
  return CALISTHENICS_EXERCISES.find((e) => e.id === id)
}
