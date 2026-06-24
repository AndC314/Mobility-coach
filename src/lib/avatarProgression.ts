import { db, type AvatarVariant } from '../db/db'

export type BeltTier = 'white' | 'yellow' | 'orange' | 'green' | 'blue' | 'purple' | 'brown' | 'black'

export interface AvatarState {
  variant: AvatarVariant
  tier: BeltTier
  stripes: number // 0-3 stripes on white belt, 0 stripes on colored belts
  totalHours: number
  spriteKey: string // e.g., "lean_white_belt_2" for use in file lookup
}

const TIER_THRESHOLDS: Record<BeltTier, number> = {
  white: 0,
  yellow: 160,
  orange: 320,
  green: 480,
  blue: 640,
  purple: 800,
  brown: 960,
  black: 1200
}

const BELT_TIERS: BeltTier[] = ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'black']

/**
 * Compute avatar state based on total training hours and user preferences.
 * Stripe progression: 1 stripe per 40 hours (white belt only has stripes)
 * Belt color: determined by total hours milestone
 */
export async function computeAvatarState(variant: AvatarVariant): Promise<AvatarState> {
  // Calculate total training hours
  const sessions = await db.sessions.toArray()
  const totalSec = sessions.reduce((sum, s) => sum + (s.actualSec || 0), 0)
  const totalHours = Math.floor(totalSec / 3600)

  // Determine belt tier
  let tier: BeltTier = 'white'
  for (const beltTier of BELT_TIERS) {
    if (totalHours >= TIER_THRESHOLDS[beltTier]) {
      tier = beltTier
    }
  }

  // Stripes only on white belt (0-3 stripes = 0-120 hours)
  // After 160 hours, user moves to yellow belt (no stripes)
  let stripes = 0
  if (tier === 'white') {
    stripes = Math.min(3, Math.floor(totalHours / 40))
  }

  const spriteKey = `${variant}_${tier}${tier === 'white' && stripes > 0 ? `_${stripes}` : ''}`

  return { variant, tier, stripes, totalHours, spriteKey }
}

/**
 * Get the sprite sheet path for a given avatar state.
 * Assumes sprites are stored in /public/avatars/[variant]/[tier].png
 */
export function getAvatarSpriteUrl(state: AvatarState): string {
  const tierLabel = state.tier === 'white' && state.stripes > 0
    ? `white_belt_${state.stripes}`
    : state.tier === 'white'
    ? 'white_belt'
    : `${state.tier}_belt`
  return `/avatars/${state.variant}/${tierLabel}.png`
}

/**
 * Human-readable belt/stripe description
 */
export function getAvatarDescription(state: AvatarState): string {
  if (state.tier === 'white') {
    const stripeText = state.stripes === 0 ? 'white belt' : `white belt + ${state.stripes} stripe${state.stripes > 1 ? 's' : ''}`
    return stripeText
  }
  return `${state.tier} belt`
}

/**
 * Hours until next milestone
 */
export function hoursUntilNextMilestone(state: AvatarState): number {
  if (state.tier === 'white' && state.stripes < 3) {
    // Next stripe in 40 hours
    const nextStripeHours = (state.stripes + 1) * 40
    return Math.max(0, nextStripeHours - state.totalHours)
  }

  // Next belt color
  const currentThreshold = TIER_THRESHOLDS[state.tier]
  const nextBeltIndex = BELT_TIERS.indexOf(state.tier) + 1
  if (nextBeltIndex >= BELT_TIERS.length) {
    return Infinity // Black belt is max
  }

  const nextThreshold = TIER_THRESHOLDS[BELT_TIERS[nextBeltIndex]]
  return Math.max(0, nextThreshold - state.totalHours)
}
