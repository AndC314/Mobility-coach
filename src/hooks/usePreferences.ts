import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_PREFERENCES, type UserPreferences } from '../db/db'

export function usePreferences(): {
  preferences: UserPreferences
  update: (patch: Partial<UserPreferences>) => Promise<void>
} {
  const preferences = useLiveQuery(async () => {
    const p = await db.preferences.get(1)
    return p ?? DEFAULT_PREFERENCES
  }, [], DEFAULT_PREFERENCES)

  async function update(patch: Partial<UserPreferences>) {
    const current = (await db.preferences.get(1)) ?? DEFAULT_PREFERENCES
    await db.preferences.put({ ...current, ...patch, id: 1 })
  }

  return { preferences: preferences ?? DEFAULT_PREFERENCES, update }
}
