const SPRITE_MAP: Record<string, string> = {
  pushups: '/sprites/exercises/pushups.png',
  pullups: '/sprites/exercises/pullups.png',
  squats: '/sprites/exercises/squats.png',
  plank: '/sprites/exercises/plank.png',
  dips: '/sprites/exercises/dips.png',
  hollow_body_hold: '/sprites/exercises/hollow_body_hold.png',
  lunge_forward: '/sprites/exercises/lunge_forward.png',
  dead_bug: '/sprites/exercises/dead_bug.png',
  glute_bridge: '/sprites/exercises/glute_bridge.png',
  australian_pullups: '/sprites/exercises/australian_pullups.png',
  diamond_push_ups: '/sprites/exercises/diamond_push_ups.png',
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
