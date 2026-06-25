import { useState, useEffect } from 'react'

export interface SpriteSheetConfig {
  frameWidth: number    // width of one frame in pixels
  frameHeight: number   // height of one frame in pixels
  frameCols: number     // frames per row in sprite sheet
  frameCount: number    // total frames in this animation
  fps: number           // frames per second
  loop: boolean         // loop animation?
}

interface SpriteAnimatorProps {
  src: string           // URL to sprite sheet image
  config: SpriteSheetConfig
  className?: string
  onAnimationEnd?: () => void
}

/**
 * SpriteAnimator: renders a single frame from a sprite sheet and cycles through them.
 * Uses CSS background-image with background-position for reliable sprite cropping.
 * Use for idle animations, level-up sequences, etc.
 */
export function SpriteAnimator({
  src,
  config,
  className = '',
  onAnimationEnd
}: SpriteAnimatorProps) {
  const [frameIndex, setFrameIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(true)

  useEffect(() => {
    if (!isAnimating) return

    const intervalMs = 1000 / config.fps
    const timer = setInterval(() => {
      setFrameIndex((prev) => {
        const next = prev + 1
        if (next >= config.frameCount) {
          if (config.loop) {
            return 0
          } else {
            setIsAnimating(false)
            onAnimationEnd?.()
            return prev
          }
        }
        return next
      })
    }, intervalMs)

    return () => clearInterval(timer)
  }, [isAnimating, config.fps, config.frameCount, config.loop, onAnimationEnd])

  // Calculate which frame to display
  const row = Math.floor(frameIndex / config.frameCols)
  const col = frameIndex % config.frameCols
  const offsetX = col * config.frameWidth
  const offsetY = row * config.frameHeight

  return (
    <div
      className={`inline-block ${className}`}
      style={{
        width: `${config.frameWidth}px`,
        height: `${config.frameHeight}px`,
        backgroundImage: `url('${src}')`,
        backgroundPosition: `${-offsetX}px ${-offsetY}px`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${config.frameCols * config.frameWidth}px ${Math.ceil(config.frameCount / config.frameCols) * config.frameHeight}px`,
        imageRendering: 'pixelated',
      } as React.CSSProperties}
    />
  )
}
