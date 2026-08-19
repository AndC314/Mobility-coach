import { useState, useEffect, useCallback } from 'react'
import { SpriteAnimator, type SpriteSheetConfig } from './SpriteAnimator'

type AnimationName = 'walk' | 'jump' | 'pushups'

interface AnimationDef {
  name: AnimationName
  src: string
  config: SpriteSheetConfig
  loops: number // how many loops before switching
}

const ANIMATIONS: AnimationDef[] = [
  {
    name: 'walk',
    src: '/avatars/bjj/walk.png',
    config: { frameWidth: 48, frameHeight: 48, frameCols: 8, frameCount: 8, fps: 10, loop: true },
    loops: 3,
  },
  {
    name: 'jump',
    src: '/avatars/bjj/jump.png',
    config: { frameWidth: 48, frameHeight: 48, frameCols: 7, frameCount: 7, fps: 10, loop: true },
    loops: 2,
  },
  {
    name: 'pushups',
    src: '/avatars/bjj/pushups.png',
    config: { frameWidth: 64, frameHeight: 64, frameCols: 9, frameCount: 9, fps: 8, loop: true },
    loops: 3,
  },
]

interface BJJAvatarAnimatorProps {
  scale?: number
  className?: string
}

const TARGET_SIZE = 48

export function BJJAvatarAnimator({ scale = 2.5, className = '' }: BJJAvatarAnimatorProps) {
  const [animIndex, setAnimIndex] = useState(0)
  const [loopCount, setLoopCount] = useState(0)

  const current = ANIMATIONS[animIndex]
  const normalizedScale = scale * (TARGET_SIZE / current.config.frameWidth)

  const handleAnimationLoop = useCallback(() => {
    setLoopCount((c) => {
      const next = c + 1
      if (next >= current.loops) {
        setAnimIndex((i) => (i + 1) % ANIMATIONS.length)
        return 0
      }
      return next
    })
  }, [current.loops])

  useEffect(() => {
    const loopDuration = (current.config.frameCount / current.config.fps) * 1000
    const timer = setInterval(() => {
      handleAnimationLoop()
    }, loopDuration)
    return () => clearInterval(timer)
  }, [current, handleAnimationLoop])

  return (
    <div
      className={className}
      style={{
        width: TARGET_SIZE * scale,
        height: TARGET_SIZE * scale,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ transform: `scale(${normalizedScale})`, transformOrigin: 'center', lineHeight: 0 }}>
        <SpriteAnimator
          key={current.name}
          src={current.src}
          config={current.config}
        />
      </div>
    </div>
  )
}
