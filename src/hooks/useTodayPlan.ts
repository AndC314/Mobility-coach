import { useLiveQuery } from 'dexie-react-hooks'
import { generateTodayPlan } from '../lib/recommendation'
import { db } from '../db/db'

export function useTodayPlan() {
  return useLiveQuery(async () => {
    // depend on relevant tables so plan recomputes on changes
    await db.sessions.toArray()
    await db.sorenessLogs.toArray()
    await db.bjjLogs.toArray()
    await db.phaseProgress.toArray()
    await db.preferences.toArray()
    return generateTodayPlan()
  }, [], undefined)
}
