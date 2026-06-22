import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ProgressionKey, type CompletedSession } from '../db/db'
import { todayIso } from '../lib/date'
import { syncSessionToFirebase } from '../lib/firebase-workout-sync'

export async function logHold(params: {
  exerciseKey: ProgressionKey
  phase: 1 | 2 | 3 | 4
  plannedSec: number
  actualSec: number
}) {
  const id = await db.holdLogs.add({
    date: todayIso(),
    exerciseKey: params.exerciseKey,
    phase: params.phase,
    plannedSec: params.plannedSec,
    actualSec: params.actualSec,
    createdAt: new Date().toISOString()
  })

  // Also sync to Firestore as a mobility session (non-blocking)
  try {
    const session: CompletedSession = {
      date: todayIso(),
      type: params.exerciseKey === '90/90' ? 'ninety_ninety' : params.exerciseKey === 'straddle' ? 'pancake' : 'pike',
      label: `${params.exerciseKey} · Phase ${params.phase}`,
      durationMin: Math.round(params.actualSec / 60),
      plannedSec: params.plannedSec,
      actualSec: params.actualSec,
      percent: params.plannedSec > 0 ? Math.min(100, Math.round((params.actualSec / params.plannedSec) * 100)) : 0,
      exerciseIds: [`${params.exerciseKey}_p${params.phase}`],
      createdAt: new Date().toISOString()
    }
    await syncSessionToFirebase(session).catch(err => {
      console.error('[logHold] Failed to sync to Firestore:', err)
    })
  } catch (err) {
    console.error('[logHold] Error creating session:', err)
  }

  return id
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
