import type { SorenessArea } from '../db/db'
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
