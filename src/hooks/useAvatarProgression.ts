import { useLiveQuery } from 'dexie-react-hooks'
import { computeAvatarState, getAvatarSpriteUrl, hoursUntilNextMilestone, type AvatarState } from '../lib/avatarProgression'
import { usePreferences } from './usePreferences'
import { type SpriteSheetConfig } from '../components/SpriteAnimator'

export function useAvatarProgression() {
  const { preferences } = usePreferences()

  const state = useLiveQuery(async () => {
    if (!preferences?.avatarVariant) return null
    return computeAvatarState(preferences.avatarVariant)
  }, [preferences?.avatarVariant], null)

  // Sprite sheet config: 4 frames, 1 row, 64×64 per frame
  const spriteConfig: SpriteSheetConfig = {
    frameWidth: 64,
    frameHeight: 64,
    frameCols: 4,
    frameCount: 4,
    fps: 8,
    loop: true
  }

  return {
    state: state || null,
    spriteUrl: state ? getAvatarSpriteUrl(state) : null,
    hoursUntilNext: state ? hoursUntilNextMilestone(state) : null,
    isLoading: state === null,
    spriteConfig
  }
}
