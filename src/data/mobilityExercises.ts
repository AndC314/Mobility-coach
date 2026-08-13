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
    cue: 'Breathe into the sides of your ribs. Let gravity lengthen you.',
    feel: 'Spine lengthening. Relief in lower back.'
  },
  {
    id: 'dead_hang',
    name: 'Dead Hang',
    icon: '🦾',
    category: 'full_body',
    defaultHoldSec: 30,
    maxHoldSec: 120,
    description: 'Passive hang for grip strength, shoulder health, and full spine decompression',
    setup: 'Grip pull-up bar shoulder-width. Let feet leave floor. Completely relax — no active pulling.',
    cue: 'Let everything go. Relax shoulders, relax lats. Just hang like dead weight. Breathe normally.',
    feel: 'Grip working, spine decompressing, shoulders stretching open.'
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
  },

  // Hip mobility — extra
  {
    id: 'butterfly',
    name: 'Butterfly Stretch',
    icon: '🦋',
    category: 'hip',
    defaultHoldSec: 60,
    maxHoldSec: 300,
    description: 'Inner thigh and groin opener',
    setup: 'Sit on floor. Press soles of feet together, knees falling out to sides.',
    cue: 'Sit tall, anterior tilt your pelvis, then hinge chest forward. Press knees gently toward floor with elbows.',
    feel: 'Inner thighs, groin, and hip adductors.',
    sides: false
  },
  {
    id: 'deep_squat',
    name: 'Deep Squat Hold',
    icon: '🏋️',
    category: 'hip',
    defaultHoldSec: 60,
    maxHoldSec: 180,
    description: 'Full-depth hip, ankle and groin mobility',
    setup: 'Feet shoulder-width apart, toes angled out. Lower into full squat, heels on floor.',
    cue: 'Use elbows to push knees out. Keep chest tall. Breathe deeply.',
    feel: 'Hip flexors, groin, ankles, and low back — all decompressing.',
    sides: false
  },
  {
    id: 'lizard',
    name: 'Lizard Pose',
    icon: '🦎',
    category: 'hip',
    defaultHoldSec: 60,
    maxHoldSec: 180,
    description: 'Deep hip flexor, groin, and inner thigh release',
    setup: 'From a low lunge, step front foot to the outside of the same-side hand.',
    cue: 'Drop back knee down. Sink hips toward the floor. Keep chest open.',
    feel: 'Deep hip flexor of back leg and inner thigh of front leg.',
    sides: true
  },
  {
    id: 'half_forward_fold',
    name: 'Half Forward Fold',
    icon: '🫄',
    category: 'hip',
    defaultHoldSec: 45,
    maxHoldSec: 120,
    description: 'Hamstring warm-up and spinal lengthening',
    setup: 'Stand, hinge at hips. Rest hands on shins. Spine long and parallel to floor.',
    cue: 'Lift your chest away from the floor. Flatten your back — not rounded.',
    feel: 'Hamstrings and a long, flat back. Spine elongating.',
    sides: false
  },

  // Spine mobility — extra
  {
    id: 'lunge_rotation',
    name: 'Lunge + Rotation',
    icon: '🔄',
    category: 'spine',
    defaultHoldSec: 45,
    maxHoldSec: 120,
    description: 'Thoracic rotation in a hip-open position',
    setup: 'Step into a low lunge. Front foot flat, back knee down.',
    cue: 'Rotate torso toward the front leg. Reach top arm to the ceiling. Hold, then switch.',
    feel: 'Thoracic spine rotating, hip flexor of back leg opening.',
    sides: true
  },
  {
    id: 'shoulder_stand',
    name: 'Shoulder Stand',
    icon: '🙃',
    category: 'spine',
    defaultHoldSec: 30,
    maxHoldSec: 90,
    description: 'Spinal inversion and shoulder opening',
    setup: 'Lie on back. Lift legs to ceiling, support lower back with hands, weight on upper back.',
    cue: 'Stack ankles over hips over shoulders. Breathe slowly. Press hands into back for support.',
    feel: 'Gentle traction along the spine. Neck and upper back supporting.',
    sides: false
  },

  // Full body — extra
  {
    id: 'downward_dog',
    name: 'Downward Dog',
    icon: '🐕',
    category: 'full_body',
    defaultHoldSec: 60,
    maxHoldSec: 180,
    description: 'Full posterior chain stretch and shoulder opener',
    setup: 'From all fours, tuck toes, lift hips up and back. Arms and legs straight.',
    cue: 'Push the floor away with your hands. Sink heels toward the floor. Relax your neck.',
    feel: 'Hamstrings, calves, spine lengthening, and shoulders opening.',
    sides: false
  },

  // New exercises
  {
    id: 'pelvic_tilt',
    name: 'Pelvic Tilt',
    icon: '🫀',
    category: 'spine',
    defaultHoldSec: 60,
    maxHoldSec: 120,
    description: 'Lumbar spine control and pelvic stability',
    setup: 'Lie on back with knees bent and feet flat on floor, hip-width apart. Arms at sides.',
    cue: 'Tilt pelvis under, flattening lower back. Hold, then return to neutral. Move slowly.',
    feel: 'Gentle engagement of lower abdominals and lower back stabilizers.',
    sides: false
  },
  {
    id: 'pigeon_pose',
    name: 'Pigeon Pose',
    icon: '🐦',
    category: 'hip',
    defaultHoldSec: 90,
    maxHoldSec: 180,
    description: 'Deep hip external rotator and glute stretch',
    setup: 'From all fours, bring right shin forward toward hands, flex foot. Hips level.',
    cue: 'Square hips forward. Fold chest forward to deepen. Keep spine long.',
    feel: 'Deep stretch in the hip and outer glute of the forward leg.',
    sides: true
  },
  {
    id: 'couch_stretch',
    name: 'Couch Stretch',
    icon: '🛋️',
    category: 'hip',
    defaultHoldSec: 60,
    maxHoldSec: 180,
    description: 'Hip flexor and quad stretch',
    setup: 'Kneel facing away from couch. Place back foot on couch behind you. Front leg steps forward.',
    cue: 'Square hips forward. Squeeze back glute. Lean torso upright or slightly back.',
    feel: 'Deep stretch in hip flexor and front of thigh of back leg.',
    sides: true
  },
  {
    id: 'calf_stretch',
    name: 'Calf Stretch',
    icon: '🦵',
    category: 'hip',
    defaultHoldSec: 45,
    maxHoldSec: 120,
    description: 'Calf and Achilles tendon release',
    setup: 'Step one foot forward, hands on wall. Keep back heel down, back leg straight.',
    cue: 'Front knee bends slightly. Feel a gentle pull up the back of the calf. Relax.',
    feel: 'Gentle stretch in the calf muscle and Achilles tendon.',
    sides: true
  },
  {
    id: 'standing_hamstring_stretch',
    name: 'Standing Hamstring Stretch',
    icon: '🧘',
    category: 'hip',
    defaultHoldSec: 60,
    maxHoldSec: 180,
    description: 'Hamstring lengthening and hip flexibility',
    setup: 'Stand. Place one heel on low bench or step. Keep leg straight.',
    cue: 'Hinge at hips, maintain neutral spine. Let gravity do the work. Breathe deeply.',
    feel: 'Stretch along the back of the hamstring and into the hip.',
    sides: true
  },
  {
    id: 'low_lunge_hip_flexor',
    name: 'Low Lunge Hip Flexor',
    icon: '🏃',
    category: 'hip',
    defaultHoldSec: 60,
    maxHoldSec: 180,
    description: 'Hip flexor and psoas release in deep lunge',
    setup: 'Low lunge position. Back knee down, front foot forward. Hands on front thigh or blocks.',
    cue: 'Squeeze back glute. Shift hips forward and down. Keep torso upright.',
    feel: 'Deep stretch in front of hip and hip flexor of the back leg.',
    sides: true
  }
]

export type MobilityExerciseId = typeof MOBILITY_EXERCISES[number]['id']
