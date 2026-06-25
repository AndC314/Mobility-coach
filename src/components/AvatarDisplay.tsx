import { useState } from 'react'
import { useAvatarStats, type AvatarMilestone } from '../hooks/useAvatarStats'
import { useAvatarProgression } from '../hooks/useAvatarProgression'
import { getAvatarDescription } from '../lib/avatarProgression'
import { SpriteAnimator } from './SpriteAnimator'
import { Card } from './Card'

interface AvatarDisplayProps {
  compact?: boolean
  useSpriteAnimation?: boolean // use new pixel art sprite system if true
}

// Old system: tier-based AI images
const AVATAR_IMAGES: Record<string, string> = {
  novice: '/avatar/novice.webp',
  developing: '/avatar/developing.webp',
  strong: '/avatar/strong.webp',
  elite: '/avatar/elite.webp'
}

type AvatarTier = 'novice' | 'developing' | 'strong' | 'elite'

function computeOldAvatarTier(milestones: AvatarMilestone[]): AvatarTier {
  const unlocked = milestones.filter((m) => m.unlocked)
  const advancedCount = unlocked.filter((m) => m.tier === 'advanced').length
  const intermediateCount = unlocked.filter((m) => m.tier === 'intermediate').length

  if (advancedCount >= 2) return 'elite'
  if (intermediateCount >= 3) return 'strong'
  if (unlocked.length >= 3) return 'developing'
  return 'novice'
}

function getBeltColor(grapplingClasses: number): string {
  if (grapplingClasses >= 50) return '#6b4c9a' // purple
  if (grapplingClasses >= 30) return '#2ec4b6' // teal (4-stripe white proxy)
  if (grapplingClasses >= 10) return '#f5f5f0' // white w/ stripes
  return '#e8e8f0' // white
}

function getBeltStripes(grapplingClasses: number): number {
  if (grapplingClasses >= 50) return 0
  if (grapplingClasses >= 40) return 4
  if (grapplingClasses >= 30) return 3
  if (grapplingClasses >= 20) return 2
  if (grapplingClasses >= 10) return 1
  return 0
}

const TIER_STYLES: Record<AvatarTier, { bodyOpacity: number; limbWidth: number; glowColor: string }> = {
  novice: { bodyOpacity: 0.5, limbWidth: 3, glowColor: 'transparent' },
  developing: { bodyOpacity: 0.7, limbWidth: 4, glowColor: 'rgba(46, 196, 182, 0.1)' },
  strong: { bodyOpacity: 0.9, limbWidth: 5, glowColor: 'rgba(46, 196, 182, 0.2)' },
  elite: { bodyOpacity: 1.0, limbWidth: 6, glowColor: 'rgba(167, 139, 250, 0.25)' }
}

/**
 * New sprite-based avatar display component
 */
function SpriteAvatarDisplay({ compact = false }: { compact?: boolean }) {
  const { state, spriteUrl, hoursUntilNext, isLoading, spriteConfig } = useAvatarProgression()

  if (isLoading || !state || !spriteUrl || !spriteConfig) {
    return (
      <div className="flex items-center justify-center h-32 text-muted">
        Loading avatar...
      </div>
    )
  }

  const scale = compact ? 1.5 : 3
  const description = getAvatarDescription(state)
  const progressPercent = !hoursUntilNext || hoursUntilNext === Infinity
    ? 100
    : Math.max(0, 100 - (hoursUntilNext / 40) * 100)

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
          <SpriteAnimator src={spriteUrl} config={spriteConfig} />
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-ink">{description}</div>
          <div className="text-xs text-muted">{state.totalHours} hours trained</div>
        </div>
      </div>

      {hoursUntilNext !== Infinity && (
        <Card className="p-3">
          <div className="text-xs font-semibold text-muted mb-2">Next milestone</div>
          <div className="bg-border rounded-full h-2 overflow-hidden">
            <div
              className="bg-accent h-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-xs text-muted mt-2 text-center">
            {hoursUntilNext} hours to go
          </div>
        </Card>
      )}
    </div>
  )
}

/**
 * Old procedural SVG avatar for backward compatibility
 */
function ProceduralAvatarDisplay({ compact }: { compact?: boolean }) {
  const stats = useAvatarStats()
  const [imgError, setImgError] = useState(false)

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-6">
        <p className="text-xs text-muted">Training data loading...</p>
      </div>
    )
  }

  const tier = computeOldAvatarTier(stats.milestones)
  const style = TIER_STYLES[tier]
  const grapplingAxis = stats.axes.find((a) => a.key === 'grappling')
  const beltColor = getBeltColor(grapplingAxis?.raw ?? 0)
  const beltStripes = getBeltStripes(grapplingAxis?.raw ?? 0)

  const pushAxis = stats.axes.find((a) => a.key === 'push')
  const pullAxis = stats.axes.find((a) => a.key === 'pull')
  const coreAxis = stats.axes.find((a) => a.key === 'core')

  // Try to show tier image, fall back to SVG
  const tierImage = AVATAR_IMAGES[tier]

  if (tierImage && !imgError) {
    return (
      <div className="flex flex-col items-center">
        <img
          src={tierImage}
          alt={`${tier} avatar`}
          className={`${compact ? 'h-36' : 'h-52'} w-auto rounded-2xl object-contain`}
          onError={() => setImgError(true)}
        />
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full bg-card2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted border border-border">
            {tier}
          </span>
          <span className="text-xs text-muted">
            Lvl {stats.overallLevel}
          </span>
        </div>
      </div>
    )
  }

  const shoulderWidth = 18 + (pushAxis?.value ?? 0) * 0.06
  const armThickness = style.limbWidth + (pullAxis?.value ?? 0) * 0.02
  const coreDefinition = (coreAxis?.value ?? 0) / 100

  const w = compact ? 120 : 180
  const h = compact ? 160 : 220
  const cx = w / 2
  const headR = compact ? 14 : 18

  return (
    <div className="flex flex-col items-center">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        {/* Background glow */}
        {style.glowColor !== 'transparent' && (
          <ellipse
            cx={cx}
            cy={h * 0.45}
            rx={w * 0.35}
            ry={h * 0.4}
            fill={style.glowColor}
          />
        )}

        {/* Head */}
        <circle
          cx={cx}
          cy={headR + 8}
          r={headR}
          fill="none"
          stroke="#e8e8f0"
          strokeWidth={2}
          opacity={style.bodyOpacity}
        />

        {/* Neck */}
        <line
          x1={cx}
          y1={headR * 2 + 8}
          x2={cx}
          y2={headR * 2 + 16}
          stroke="#e8e8f0"
          strokeWidth={2}
          opacity={style.bodyOpacity}
        />

        {/* Torso */}
        <path
          d={`M ${cx - shoulderWidth} ${headR * 2 + 16}
              L ${cx + shoulderWidth} ${headR * 2 + 16}
              L ${cx + shoulderWidth * 0.7} ${h * 0.6}
              L ${cx - shoulderWidth * 0.7} ${h * 0.6} Z`}
          fill="none"
          stroke="#e8e8f0"
          strokeWidth={2}
          strokeLinejoin="round"
          opacity={style.bodyOpacity}
        />

        {/* Core definition lines */}
        {coreDefinition > 0.3 && (
          <>
            <line
              x1={cx}
              y1={headR * 2 + 26}
              x2={cx}
              y2={h * 0.55}
              stroke="#e8e8f0"
              strokeWidth={0.75}
              opacity={coreDefinition * 0.6}
            />
            <line
              x1={cx - 6}
              y1={h * 0.38}
              x2={cx + 6}
              y2={h * 0.38}
              stroke="#e8e8f0"
              strokeWidth={0.5}
              opacity={coreDefinition * 0.5}
            />
            <line
              x1={cx - 5}
              y1={h * 0.44}
              x2={cx + 5}
              y2={h * 0.44}
              stroke="#e8e8f0"
              strokeWidth={0.5}
              opacity={coreDefinition * 0.5}
            />
          </>
        )}

        {/* Belt */}
        <rect
          x={cx - shoulderWidth * 0.75}
          y={h * 0.56}
          width={shoulderWidth * 1.5}
          height={compact ? 4 : 5}
          rx={2}
          fill={beltColor}
          opacity={style.bodyOpacity}
        />
        {/* Belt stripes */}
        {Array.from({ length: beltStripes }).map((_, i) => (
          <rect
            key={`stripe-${i}`}
            x={cx + shoulderWidth * 0.35 + i * 4}
            y={h * 0.56}
            width={2.5}
            height={compact ? 4 : 5}
            rx={0.5}
            fill="#1a1d2e"
            opacity={0.7}
          />
        ))}

        {/* Arms */}
        <line
          x1={cx - shoulderWidth}
          y1={headR * 2 + 18}
          x2={cx - shoulderWidth - 10}
          y2={h * 0.52}
          stroke="#e8e8f0"
          strokeWidth={armThickness}
          strokeLinecap="round"
          opacity={style.bodyOpacity}
        />
        <line
          x1={cx + shoulderWidth}
          y1={headR * 2 + 18}
          x2={cx + shoulderWidth + 10}
          y2={h * 0.52}
          stroke="#e8e8f0"
          strokeWidth={armThickness}
          strokeLinecap="round"
          opacity={style.bodyOpacity}
        />

        {/* Legs */}
        <line
          x1={cx - shoulderWidth * 0.5}
          y1={h * 0.6}
          x2={cx - shoulderWidth * 0.6}
          y2={h * 0.88}
          stroke="#e8e8f0"
          strokeWidth={style.limbWidth}
          strokeLinecap="round"
          opacity={style.bodyOpacity}
        />
        <line
          x1={cx + shoulderWidth * 0.5}
          y1={h * 0.6}
          x2={cx + shoulderWidth * 0.6}
          y2={h * 0.88}
          stroke="#e8e8f0"
          strokeWidth={style.limbWidth}
          strokeLinecap="round"
          opacity={style.bodyOpacity}
        />

        {/* Feet */}
        <ellipse cx={cx - shoulderWidth * 0.6} cy={h * 0.9} rx={5} ry={3} fill="#e8e8f0" opacity={style.bodyOpacity * 0.7} />
        <ellipse cx={cx + shoulderWidth * 0.6} cy={h * 0.9} rx={5} ry={3} fill="#e8e8f0" opacity={style.bodyOpacity * 0.7} />
      </svg>

      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-full bg-card2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted border border-border">
          {tier}
        </span>
        <span className="text-xs text-muted">
          Lvl {stats.overallLevel}
        </span>
      </div>
    </div>
  )
}

/**
 * Main avatar display component
 * Supports both old procedural system and new sprite-based system
 */
export default function AvatarDisplay({ compact, useSpriteAnimation }: AvatarDisplayProps) {
  if (useSpriteAnimation) {
    return <SpriteAvatarDisplay compact={compact} />
  }
  return <ProceduralAvatarDisplay compact={compact} />
}
