const SPRITE_MAP: Record<string, string> = {
  archer_pushups: '/sprites/exercises/archer_pushups.png',
  australian_pullups: '/sprites/exercises/australian_pullups.png',
  back_lever: '/sprites/exercises/back_lever.png',
  bulgarian_squat: '/sprites/exercises/bulgarian_squat.png',
  burpees: '/sprites/exercises/burpees.png',
  calf_raises: '/sprites/exercises/calf_raises.png',
  copenhagen_plank: '/sprites/exercises/copenhagen_plank.png',
  cossack_squat: '/sprites/exercises/cossack_squat.png',
  crow_pose: '/sprites/exercises/crow_pose.png',
  crunches: '/sprites/exercises/crunches.png',
  dead_bug: '/sprites/exercises/dead_bug.png',
  dead_hang: '/sprites/exercises/dead_hang.png',
  diamond_push_ups: '/sprites/exercises/diamond_push_ups.png',
  dips: '/sprites/exercises/dips.png',
  dog_bird: '/sprites/exercises/dog_bird.png',
  door_pull: '/sprites/exercises/door_pull.png',
  front_lever: '/sprites/exercises/front_lever.png',
  glute_bridge: '/sprites/exercises/glute_bridge.png',
  gymnastics_bridge: '/sprites/exercises/gymnastics_bridge.png',
  hanging_knee_to_chest: '/sprites/exercises/hanging_knee_to_chest.png',
  hindu_pushups: '/sprites/exercises/hindu_pushups.png',
  hollow_body_hold: '/sprites/exercises/hollow_body_hold.png',
  jumping_lunges: '/sprites/exercises/jumping_lunges.png',
  knee_raises: '/sprites/exercises/knee_raises.png',
  leg_raise: '/sprites/exercises/leg_raise.png',
  lsit: '/sprites/exercises/lsit.png',
  lunge_backward: '/sprites/exercises/lunge_backward.png',
  lunge_forward: '/sprites/exercises/lunge_forward.png',
  neck_curls: '/sprites/exercises/neck_curls.png',
  pike_pushups: '/sprites/exercises/pike_pushups.png',
  pistol_squats: '/sprites/exercises/pistol_squats.png',
  planche: '/sprites/exercises/planche.png',
  planche_leans: '/sprites/exercises/planche_leans.png',
  plank: '/sprites/exercises/plank.png',
  press_to_handstand: '/sprites/exercises/press_to_handstand.png',
  prone_y_raise: '/sprites/exercises/prone_y_raise.png',
  pullups: '/sprites/exercises/pullups.png',
  pushups: '/sprites/exercises/pushups.png',
  ring_rows: '/sprites/exercises/ring_rows.png',
  russian_twist: '/sprites/exercises/russian_twist.png',
  scapular_pullups: '/sprites/exercises/scapular_pullups.png',
  side_plank: '/sprites/exercises/side_plank.png',
  sit_ups: '/sprites/exercises/sit_ups.png',
  squats: '/sprites/exercises/squats.png',
  superman: '/sprites/exercises/superman.png',
  support_hold: '/sprites/exercises/support_hold.png',
  tricep_extension: '/sprites/exercises/tricep_extension.png',
  tuck_lsit: '/sprites/exercises/tuck_lsit.png',
  tucked_front_lever: '/sprites/exercises/tucked_front_lever.png',
  v_up: '/sprites/exercises/v_up.png',
  wall_plank: '/sprites/exercises/wall_plank.png',
  wall_sit: '/sprites/exercises/wall_sit.png',
  wide_push_ups: '/sprites/exercises/wide_push_ups.png',
  // Mobility exercises
  butterfly: '/sprites/exercises/butterfly.png',
  cat_cow: '/sprites/exercises/cat_cow.png',
  deep_squat: '/sprites/exercises/deep_squat.png',
  downward_dog: '/sprites/exercises/downward_dog.png',
  forward_fold: '/sprites/exercises/forward_fold.png',
  half_forward_fold: '/sprites/exercises/half_forward_fold.png',
  hip_flexor_lunge: '/sprites/exercises/hip_flexor_lunge.png',
  lizard: '/sprites/exercises/lizard.png',
  lunge_rotation: '/sprites/exercises/lunge_rotation.png',
  pike_stretch: '/sprites/exercises/pike_stretch.png',
  shoulder_stand: '/sprites/exercises/shoulder_stand.png',
}

interface Props {
  exerciseId: string
  fallbackEmoji: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-9 h-9',
}

export default function ExerciseIcon({ exerciseId, fallbackEmoji, size = 'md' }: Props) {
  const sprite = SPRITE_MAP[exerciseId]

  if (!sprite) {
    const textSize = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-base'
    return <span className={`${textSize} leading-none`}>{fallbackEmoji}</span>
  }

  return (
    <img
      src={sprite}
      alt=""
      className={`${SIZE_CLASSES[size]} object-contain`}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
