import type { SorenessArea } from '../db/db'
import type { MuscleGroup } from './muscleMap'
import { ALL_EXERCISES } from './exercises'

export interface RecoverySequence {
  area: SorenessArea
  label: string
  icon: string
  exerciseIds: string[]
  durationMin: number
}

export const RECOVERY_SEQUENCES: Record<SorenessArea, RecoverySequence> = {
  hips: {
    area: 'hips',
    label: 'Hips',
    icon: '🧍',
    exerciseIds: ['hip_flexor_lunge_ext', 'ninety_ninety_fold', 'lat_hang_bjj'],
    durationMin: 11
  },
  lower_back: {
    area: 'lower_back',
    label: 'Lower Back',
    icon: '🪻',
    // gentle, extension-free sequence — safe even with a recent spasm
    exerciseIds: ['pelvic_clock', 'cat_cow', 'childs_pose_lat', 'lat_hang_bjj'],
    durationMin: 9
  },
  adductors: {
    area: 'adductors',
    label: 'Adductors',
    icon: '🦵',
    exerciseIds: ['hip_flexor_lunge', 'ninety_ninety_fold', 'childs_pose_lat'],
    durationMin: 9
  },
  shoulders: {
    area: 'shoulders',
    label: 'Shoulders',
    icon: '🤝',
    exerciseIds: ['shoulder_cars', 'lat_hang_bjj', 'doorway_pec_stretch', 'thread_the_needle'],
    durationMin: 11
  },
  wrists: {
    area: 'wrists',
    label: 'Wrists',
    icon: '🤲',
    exerciseIds: ['wrist_conditioning', 'lat_hang_bjj'],
    durationMin: 5
  },
  neck: {
    area: 'neck',
    label: 'Neck',
    icon: '🧝',
    exerciseIds: ['chin_tucks', 'neck_side_stretch', 'lat_hang_bjj'],
    durationMin: 6
  },
  general_fatigue: {
    area: 'general_fatigue',
    label: 'General Fatigue',
    icon: '🔄',
    exerciseIds: ['pelvic_clock', 'cat_cow', 'lat_hang_bjj', 'childs_pose_lat'],
    durationMin: 8
  }
}

export const SORENESS_OPTIONS: { area: SorenessArea; label: string; icon: string }[] = [
  { area: 'neck', label: 'Neck', icon: '🧝' },
  { area: 'lower_back', label: 'Lower Back', icon: '🪻' },
  { area: 'hips', label: 'Hips', icon: '🧍' },
  { area: 'adductors', label: 'Adductors', icon: '🦵' },
  { area: 'shoulders', label: 'Shoulders', icon: '🤝' },
  { area: 'wrists', label: 'Wrists', icon: '🤲' },
  { area: 'general_fatigue', label: 'General Fatigue', icon: '🔄' }
]

export function getSequenceExercises(area: SorenessArea) {
  return RECOVERY_SEQUENCES[area].exerciseIds.map((id) => ALL_EXERCISES[id]).filter(Boolean)
}

// Maps each muscle group to 1-2 ExerciseItem IDs from ALL_EXERCISES.
// Used by useSmartRecovery to build a prioritised stretch routine.
export const MUSCLE_STRETCHES: Partial<Record<MuscleGroup, string[]>> = {
  abs:         ['pelvic_clock', 'cat_cow'],
  lower_back:  ['pelvic_clock', 'cat_cow', 'childs_pose_lat'],
  hip_flexors: ['hip_flexor_lunge', 'hip_flexor_lunge_ext'],
  inner_thigh: ['ninety_ninety_fold'],
  glutes:      ['supine_figure_4', 'ninety_ninety_fold'],
  hamstrings:  ['supine_figure_4', 'lat_hang_bjj'],
  lats:        ['childs_pose_lat', 'thread_the_needle'],
  forearms:    ['wrist_conditioning', 'lat_hang_bjj'],
  chest:       ['doorway_pec_stretch'],
  front_delt:  ['doorway_pec_stretch', 'shoulder_cars'],
  rear_delt:   ['thread_the_needle', 'shoulder_cars'],
  rhomboids:   ['thread_the_needle'],
  traps:       ['shoulder_cars'],
  biceps:      ['lat_hang_bjj'],
  triceps:     ['childs_pose_lat'],
  quads:       ['hip_flexor_lunge'],
  calves:      ['lat_hang_bjj'],
}
