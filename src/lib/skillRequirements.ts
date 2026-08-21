import type { SkillNode } from '../types/skills'

export const SKILL_TREE_DATA: SkillNode[] = [
  {
    id: 'back_lever',
    name: 'Back Lever',
    category: 'pull',
    prerequisites: [
      { exerciseId: 'dead_hang', metric: 'sec', threshold: 60, label: 'Dead Hang 60s' },
      { exerciseId: 'reverse_plank', metric: 'sec', threshold: 40, label: 'Reverse Plank 40s' },
      { exerciseId: 'skin_the_cat', metric: 'reps', threshold: 3, label: 'Skin the Cat ×3' },
      { exerciseId: 'pullups', metric: 'reps', threshold: 6, label: 'Pull-ups ×6' },
    ],
    tiers: [
      { tier: 1, name: 'Tuck Back Lever', targetTUTorReps: '10s hold', exerciseId: 'skin_the_cat' },
      { tier: 2, name: 'Adv. Tuck Back Lever', targetTUTorReps: '10s hold', exerciseId: 'back_lever_adv_tuck' },
      { tier: 3, name: 'Straddle Back Lever', targetTUTorReps: '8s hold', exerciseId: 'back_lever_straddle' },
      { tier: 4, name: 'Full Back Lever', targetTUTorReps: '5s hold', exerciseId: 'back_lever' },
    ],
  },
  {
    id: 'handstand',
    name: 'Handstand',
    category: 'push',
    prerequisites: [
      { exerciseId: 'pike_pushups', metric: 'reps', threshold: 10, label: 'Pike Push-ups ×10' },
      { exerciseId: 'plank', metric: 'sec', threshold: 60, label: 'Plank 60s' },
      { exerciseId: 'tripod_headstand', metric: 'sec', threshold: 30, label: 'Tripod Headstand 30s' },
    ],
    tiers: [
      { tier: 1, name: 'Wall Walks', targetTUTorReps: '5 reps', exerciseId: 'wall_walks' },
      { tier: 2, name: 'Chest-to-Wall HS', targetTUTorReps: '45s hold', exerciseId: 'chest_to_wall_handstand' },
      { tier: 3, name: 'Freestanding HS', targetTUTorReps: '15s hold', exerciseId: 'freestanding_handstand' },
    ],
  },
  {
    id: 'dragon_flag',
    name: 'Dragon Flag',
    category: 'core',
    prerequisites: [
      { exerciseId: 'hollow_body_hold', metric: 'sec', threshold: 45, label: 'Hollow Body 45s' },
      { exerciseId: 'v_up', metric: 'reps', threshold: 12, label: 'V-Ups ×12' },
    ],
    tiers: [
      { tier: 1, name: 'Dragon Flag Negatives', targetTUTorReps: '5 reps', exerciseId: 'dragon_flag_negatives' },
      { tier: 2, name: 'Dragon Flag Hold (tuck)', targetTUTorReps: '10s hold', exerciseId: 'dragon_flag_press_hold' },
      { tier: 3, name: 'Full Dragon Flag', targetTUTorReps: '5s hold', exerciseId: 'dragon_flag_press_hold' },
    ],
  },
  {
    id: 'muscle_up',
    name: 'Muscle-Up',
    category: 'dynamic',
    prerequisites: [
      { exerciseId: 'pullups', metric: 'reps', threshold: 10, label: 'Pull-ups ×10' },
      { exerciseId: 'high_pull_ups_c2b', metric: 'reps', threshold: 5, label: 'C2B Pull-ups ×5' },
      { exerciseId: 'straight_bar_dips', metric: 'reps', threshold: 10, label: 'Straight Bar Dips ×10' },
      { exerciseId: 'hollow_body_hold', metric: 'sec', threshold: 30, label: 'Hollow Body 30s' },
      { exerciseId: 'leg_raise', metric: 'reps', threshold: 10, label: 'Hanging Leg Raise ×10' },
    ],
    tiers: [
      { tier: 1, name: 'Bar Lean-Overs (negatives)', targetTUTorReps: '6 reps tempo 2121', exerciseId: 'bar_lean_overs' },
      { tier: 2, name: 'False Grip Hang', targetTUTorReps: '15s hold', exerciseId: 'false_grip_hang' },
      { tier: 3, name: 'Assisted Muscle-Up', targetTUTorReps: '3 reps', exerciseId: 'muscle_ups' },
      { tier: 4, name: 'Strict Muscle-Up', targetTUTorReps: '3 clean reps', exerciseId: 'muscle_ups' },
    ],
  },
  {
    id: 'front_lever',
    name: 'Front Lever',
    category: 'pull',
    prerequisites: [
      { exerciseId: 'pullups', metric: 'reps', threshold: 8, label: 'Pull-ups ×8' },
      { exerciseId: 'scapular_pullups', metric: 'reps', threshold: 12, label: 'Scapular Pull-ups ×12' },
      { exerciseId: 'lsit', metric: 'sec', threshold: 15, label: 'L-Sit 15s' },
    ],
    tiers: [
      { tier: 1, name: 'Tucked Front Lever', targetTUTorReps: '10s hold', exerciseId: 'tucked_front_lever' },
      { tier: 2, name: 'Adv. Tuck Front Lever', targetTUTorReps: '10s hold', exerciseId: 'adv_tuck_front_lever' },
      { tier: 3, name: 'Straddle Front Lever', targetTUTorReps: '8s hold', exerciseId: 'straddle_front_lever' },
      { tier: 4, name: 'Full Front Lever', targetTUTorReps: '5s hold', exerciseId: 'front_lever' },
    ],
  },
  {
    id: 'one_arm_pushup',
    name: 'One-Arm Push-Up',
    category: 'push',
    prerequisites: [
      { exerciseId: 'diamond_push_ups', metric: 'reps', threshold: 15, label: 'Diamond Push-ups ×15' },
      { exerciseId: 'archer_pushups', metric: 'reps', threshold: 8, label: 'Archer Push-ups ×8' },
    ],
    tiers: [
      { tier: 1, name: 'Pseudo Planche PU', targetTUTorReps: '8 reps', exerciseId: 'pseudo_planche_push_up' },
      { tier: 2, name: 'Elevated OA Push-up', targetTUTorReps: '5 reps', exerciseId: 'pseudo_planche_push_up' },
      { tier: 3, name: 'Floor OA Push-up', targetTUTorReps: '3 reps', exerciseId: 'pseudo_planche_push_up' },
    ],
  },
  {
    id: 'pistol_squat',
    name: 'Pistol Squat',
    category: 'legs',
    prerequisites: [
      { exerciseId: 'bulgarian_squat', metric: 'reps', threshold: 12, label: 'Bulgarian Squat ×12' },
      { exerciseId: 'cossack_squat', metric: 'reps', threshold: 8, label: 'Cossack Squat ×8' },
    ],
    tiers: [
      { tier: 1, name: 'Box Pistol Squat', targetTUTorReps: '8 reps/leg', exerciseId: 'pistol_squat_box' },
      { tier: 2, name: 'Eccentric Pistol', targetTUTorReps: '5 reps/leg', exerciseId: 'pistol_squat_eccentric' },
      { tier: 3, name: 'Full Pistol Squat', targetTUTorReps: '5 reps/leg', exerciseId: 'pistol_squats' },
    ],
  },
]
