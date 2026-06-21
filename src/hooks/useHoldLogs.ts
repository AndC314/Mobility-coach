import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ProgressionKey } from '../db/db'
import { todayIso } from '../lib/date'

export async function logHold(params: {
  exerciseKey: ProgressionKey
  phase: 1 | 2 | 3 | 4
  plannedSec: number
  actualSec: number
}) {
  return db.holdLogs.add({
    date: todayIso(),
    exerciseKey: params.exerciseKey,
    phase: params.phase,
    plannedSec: params.plannedSec,
    actualSec: params.actualSec,
    createdAt: new Date().toISOString()
  })
}

/** Last N hold logs for a given progression + phase, oldest first. */
export function useHoldHistory(exerciseKey: ProgressionKey, phase: 1 | 2 | 3 | 4, limit = 10) {
  return useLiveQuery(async () => {
    const rows = await db.holdLogs
      .where('exerciseKey')
      .equals(exerciseKey)
      .filter((r) => r.phase === phase)
      .toArray()
    return rows.sort((a, b) => a.date.localeCompare(b.date)).slice(-limit)
  }, [exerciseKey, phase], [])
}
