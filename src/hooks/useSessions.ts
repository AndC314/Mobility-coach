import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CompletedSession, type SessionType } from '../db/db'
import { todayIso, startOfWeek, isoDate } from '../lib/date'
import { syncSessionToFirebase } from '../lib/firebase-workout-sync'

/** Coerces to a finite number, falling back if NaN/undefined/Infinity. */
function safeNum(n: unknown, fallback: number): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

/**
 * Upserts today's session for a given (type, label) combo as exercises are
 * completed within a routine. Only sessions that actually happened are
 * logged — the first completed exercise creates the row; subsequent
 * completions update actualSec/percent/exerciseIds in place, so re-visiting
 * the same routine never creates duplicate rows for the same day.
 *
 * All numeric inputs are sanitized defensively — this can never persist
 * NaN/undefined, even if called with bad data.
 */
export async function upsertTodaySession(params: {
  type: SessionType
  label: string
  plannedSec: number
  actualSec: number
  exerciseIds: string[]
}) {
  const today = todayIso()
  const plannedSec = Math.max(0, safeNum(params.plannedSec, 0))
  const actualSec = Math.max(0, safeNum(params.actualSec, 0))
  const percent = plannedSec > 0 ? Math.min(100, Math.round((actualSec / plannedSec) * 100)) : actualSec > 0 ? 100 : 0
  const durationMin = actualSec > 0 ? Math.max(1, Math.round(actualSec / 60)) : 0

  // Only persist if something actually happened — avoids creating empty
  // rows for routines that were opened but never engaged with.
  if (actualSec <= 0) return null

  const existing = await db.sessions
    .where('date')
    .equals(today)
    .filter((s) => s.type === params.type && s.label === params.label)
    .first()

  if (existing) {
    await db.sessions.update(existing.id!, {
      plannedSec,
      actualSec,
      durationMin,
      percent,
      exerciseIds: params.exerciseIds
    })
    // Sync updated session to Firestore (non-blocking)
    const updated = await db.sessions.get(existing.id!)
    if (updated) {
      syncSessionToFirebase(updated).catch(err => {
        console.error('[useSessions] Failed to sync updated session:', err)
      })
    }
    return existing.id!
  }

  const id = await db.sessions.add({
    date: today,
    type: params.type,
    label: params.label,
    plannedSec,
    actualSec,
    durationMin,
    percent,
    exerciseIds: params.exerciseIds,
    createdAt: new Date().toISOString()
  })

  // Sync new session to Firestore (non-blocking)
  const newSession = await db.sessions.get(id)
  if (newSession) {
    syncSessionToFirebase(newSession).catch(err => {
      console.error('[useSessions] Failed to sync new session:', err)
    })
  }

  return id
}

export function useTodaySessions() {
  const today = todayIso()
  return useLiveQuery(() => db.sessions.where('date').equals(today).toArray(), [], [])
}

export function useWeeklySessions() {
  const weekStart = isoDate(startOfWeek(new Date()))
  return useLiveQuery(
    () => db.sessions.where('date').aboveOrEqual(weekStart).toArray(),
    [],
    []
  )
}

export function useAllSessions() {
  return useLiveQuery(() => db.sessions.toArray(), [], [])
}
