// Mobility exercises library for the new Mobility page picker
// Each exercise can be customized with hold time, sets, and rest

export interface MobilityExercise {
  id: string
  name: string
  icon: string
  category: 'hip' | 'spine' | 'shoulder' | 'full_body'
  defaultHoldSec: number
  maxHoldSec: number
  description: string
  setup: string
  cue: string
  feel: string
  sides?: boolean // two-sided exercise
}

export const MOBILITY_EXERCISES: MobilityExercise[] = [
  // Hip mobility
  {
    id: 'forward_fold',
    name: 'Forward Fold',
    icon: '🙏',
    category: 'hip',
    defaultHoldSec: 60,
    maxHoldSec: 300,
    description: 'Hamstring and lower back release',
    setup: 'Stand with feet hip-width apart. Hinge from hips, knees slightly bent.',
    cue: 'Let gravity do the work. Relax neck, shoulders. Breathe deeply into the back of your legs.',
    feel: 'Gentle stretch along the back of your legs and lower back.'
  },
  {
    id: 'ninety_ninety',
    name: '90/90 Stretch',
    icon: '⬜',
    category: 'hip',
    defaultHoldSec: 60,
    maxHoldSec: 180,
    description: 'Deep hip external rotator stretch',
    setup: 'Sit on floor. Both knees at 90°. Front shin parallel ahead, back shin behind.',
    cue: 'Anterior tilt first, then slowly lean chest toward front shin. Feel deep in back hip.',
    feel: 'Deep pressure in outer hip and glute of back leg.',
    sides: true
  },
  {
    id: 'childs_pose',
    name: "Child's Pose",
    icon: '🧎',
    category: 'full_body',
    defaultHoldSec: 60,
    maxHoldSec: 300,
    description: 'Full posterior chain relaxation',
    setup: 'Kneel, sit hips toward heels, reach arms forward, forehead down.',
    cue: 'Breathe deeply. Let shoulders relax. Feel your entire back body lengthen.',
    feel: 'Gentle stretch through low back, hips, and upper back.'
  },
  {
    id: 'figure_four',
    name: 'Figure-4 Stretch',
    icon: '🔲',
    category: 'hip',
    defaultHoldSec: 90,
    maxHoldSec: 180,
    description: 'Piriformis and deep hip rotator release',
    setup: 'Lie on back, knees bent. Cross right ankle over left knee. Flex right foot.',
    cue: 'Pull bottom thigh toward chest. Gently press top knee away to deepen.',
    feel: 'Deep in outer hip and glute of the crossed leg.',
    sides: true
  },
  {
    id: 'hip_flexor_lunge',
    name: 'Hip Flexor Lunge',
    icon: '🏃',
    category: 'hip',
    defaultHoldSec: 60,
    maxHoldSec: 180,
    description: 'Psoas and hip flexor release',
    setup: 'Kneel on one knee. Front foot forward, front shin vertical.',
    cue: 'Squeeze back glute hard. Shift hips forward slightly. Feel deep in front of hip.',
    feel: 'Deep pull at the front crease of the hip joint.',
    sides: true
  },
  {
    id: 'pancake',
    name: 'Pancake Stretch',
    icon: '🥞',
    category: 'hip',
    defaultHoldSec: 60,
    maxHoldSec: 300,
    description: 'Hip internal rotation and hamstring',
    setup: 'Sit with legs out in front, as wide as comfortable. Hinge at hips forward.',
    cue: 'Fold forward from the hips, not the spine. Keep chest open.',
    feel: 'Stretch along inner thighs and hamstrings.'
  },
  {
    id: 'pike_stretch',
    name: 'Pike Stretch',
    icon: '⛏️',
    category: 'full_body',
    defaultHoldSec: 60,
    maxHoldSec: 180,
    description: 'Full body posterior chain extension',
    setup: 'Lie face down. Hands under shoulders. Press hips and thighs down.',
    cue: 'Lift chest slightly. Breathe into the front of your hips.',
    feel: 'Full stretch along the front of your body.'
  },

  // Spine mobility
  {
    id: 'cat_cow',
    name: 'Cat-Cow',
    icon: '🐱',
    category: 'spine',
    defaultHoldSec: 60,
    maxHoldSec: 120,
    description: 'Spine segmentation and mobility',
    setup: 'On all fours. Wrists under shoulders, knees under hips.',
    cue: 'Move slowly from tailbone up. Cat round, Cow arch. 5 sec each direction.',
    feel: 'Each segment moving in sequence along your spine.'
  },
  {
    id: 'thread_needle',
    name: 'Thread the Needle',
    icon: '🧵',
    category: 'spine',
    defaultHoldSec: 45,
    maxHoldSec: 120,
    description: 'Thoracic rotation and shoulder release',
    setup: 'On all fours. Reach one arm under your body toward the opposite side.',
    cue: 'Lower shoulder and cheek toward the ground. Breathe into the stretch.',
    feel: 'Gentle twist in upper back and shoulder release.',
    sides: true
  },
  {
    id: 'lat_hang',
    name: 'Lat Hang',
    icon: '🤸',
    category: 'spine',
    defaultHoldSec: 30,
    maxHoldSec: 60,
    description: 'Lat and spine decompression',
    setup: 'Grip pull-up bar. Let feet leave floor. Relax shoulders.',
    cue: 'Breathe into the sides of your ribs. Let gravity lengthen you.'
  },
  {
    id: 'pelvic_clock',
    name: 'Pelvic Clock',
    icon: '🕐',
    category: 'spine',
    defaultHoldSec: 120,
    maxHoldSec: 180,
    description: 'Pelvic mobility and neutral spine',
    setup: 'Lie on back, knees bent, feet flat. Arms relaxed.',
    cue: 'Move pelvis toward 12 (arch), then 6 (flatten). Find neutral midpoint.',
    feel: 'Low back gently arching and flattening. Control, not pain.'
  },

  // Shoulder mobility
  {
    id: 'doorway_pec_stretch',
    name: 'Doorway Pec Stretch',
    icon: '🚪',
    category: 'shoulder',
    defaultHoldSec: 45,
    maxHoldSec: 120,
    description: 'Chest and front shoulder opening',
    setup: 'Stand in doorway. Forearm on frame at shoulder height.',
    cue: 'Rotate body away from arm. Feel stretch across front of chest.',
    feel: 'Stretch across front of chest and shoulder.',
    sides: true
  },
  {
    id: 'shoulder_pass_through',
    name: 'Shoulder Pass-Through',
    icon: '🔄',
    category: 'shoulder',
    defaultHoldSec: 60,
    maxHoldSec: 120,
    description: 'Shoulder mobility and scapular control',
    setup: 'Stand with arms extended in front. Hold a light stick or dowel.',
    cue: 'Slowly pass stick overhead and behind you. Keep arms straight.',
    feel: 'Gentle opening across front and back of shoulders.'
  },
  {
    id: 'dead_bug',
    name: 'Dead Bug',
    icon: '🐛',
    category: 'full_body',
    defaultHoldSec: 120,
    maxHoldSec: 180,
    description: 'Core stability and pelvic control',
    setup: 'Lie on back. Arms to ceiling, knees bent 90° in air. Press low back flat.',
    cue: 'Lower one arm and opposite leg slowly. Keep low back flat.',
    feel: 'Deep core engagement. Low back stays glued to floor.'
  }
]

export type MobilityExerciseId = typeof MOBILITY_EXERCISES[number]['id']
