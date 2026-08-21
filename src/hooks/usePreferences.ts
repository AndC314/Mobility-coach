import { useLiveQuery } from 'dexie-react-hooks'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { db, DEFAULT_PREFERENCES, type UserPreferences } from '../db/db'
import { db as firestoreDb } from '../lib/firebase'
import { useAuth } from './useAuth'

export function usePreferences(): {
  preferences: UserPreferences
  update: (patch: Partial<UserPreferences>) => Promise<void>
} {
  const { user } = useAuth()

  const preferences = useLiveQuery(async () => {
    const p = await db.preferences.get(1)
    return { ...DEFAULT_PREFERENCES, ...p }
  }, [], DEFAULT_PREFERENCES)

  async function update(patch: Partial<UserPreferences>) {
    const current = await db.preferences.get(1)
    const merged = { ...DEFAULT_PREFERENCES, ...current, ...patch, id: 1 }
    await db.preferences.put(merged)

    if (user) {
      const prefsDocRef = doc(firestoreDb, `users/${user.uid}/settings/preferences`)
      setDoc(prefsDocRef, {
        bjjDays: merged.bjjDays,
        sessionDuration: merged.sessionDuration,
        sportDurations: merged.sportDurations,
        goal: merged.goal,
        darkMode: merged.darkMode,
        weeklyGoalDays: merged.weeklyGoalDays,
        soundEnabled: merged.soundEnabled,
        avatarVariant: merged.avatarVariant,
        activeSports: merged.activeSports,
        weightKg: merged.weightKg ?? null,
        updatedAt: Timestamp.now().toMillis(),
      }, { merge: true }).catch((err) =>
        console.error('[usePreferences] Failed to sync to Firestore:', err)
      )
    }
  }

  return { preferences: preferences ?? DEFAULT_PREFERENCES, update }
}
