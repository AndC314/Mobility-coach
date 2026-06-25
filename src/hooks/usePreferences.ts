import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_PREFERENCES, type UserPreferences } from '../db/db'

export function usePreferences(): {
  preferences: UserPreferences
  update: (patch: Partial<UserPreferences>) => Promise<void>
} {
  const preferences = useLiveQuery(async () => {
    const p = await db.preferences.get(1)
    // Merge with defaults to fill in any missing fields (backwards compatibility)
    return { ...DEFAULT_PREFERENCES, ...p }
  }, [], DEFAULT_PREFERENCES)

  async function update(patch: Partial<UserPreferences>) {
    const current = await db.preferences.get(1)
    const merged = { ...DEFAULT_PREFERENCES, ...current, ...patch, id: 1 }
    await db.preferences.put(merged)
  }

  return { preferences: preferences ?? DEFAULT_PREFERENCES, update }
}
