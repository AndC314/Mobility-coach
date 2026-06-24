import { useLiveQuery } from 'dexie-react-hooks'
import { computeAvatarState, getAvatarSpriteUrl, hoursUntilNextMilestone, type AvatarState } from '../lib/avatarProgression'
import { usePreferences } from './usePreferences'

export function useAvatarProgression() {
  const { preferences } = usePreferences()

  const state = useLiveQuery(async () => {
    if (!preferences?.avatarVariant) return null
    return computeAvatarState(preferences.avatarVariant)
  }, [preferences?.avatarVariant], null)

  return {
    state: state || null,
    spriteUrl: state ? getAvatarSpriteUrl(state) : null,
    hoursUntilNext: state ? hoursUntilNextMilestone(state) : null,
    isLoading: state === null
  }
}
