import { useLiveQuery } from 'dexie-react-hooks'
import { computeStreak, computeLongestStreak } from '../lib/recommendation'
import { db } from '../db/db'

export function useStreak() {
  return useLiveQuery(async () => {
    // depend on sessions table so this recomputes when a session is logged
    await db.sessions.toArray()
    return computeStreak()
  }, [], 0)
}

export function useLongestStreak() {
  return useLiveQuery(async () => {
    await db.sessions.toArray()
    return computeLongestStreak()
  }, [], 0)
}
