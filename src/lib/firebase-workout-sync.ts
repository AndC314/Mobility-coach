/**
 * Firebase Workout Sync Utilities
 * Converts Dexie logging data to Firestore WorkoutDoc format
 * and provides sync callbacks for logging functions
 */

import type { WorkoutDoc, BjjClassLogDoc, CalisthenicsLogDoc, RunningLogDoc } from '../types/firebase'
import type { CompletedSession, BjjClassLog, CalisthenicsLog, RunningLog } from '../db/db'

/**
 * Converts a CompletedSession (Dexie) to a WorkoutDoc (Firestore)
 * originalType preserves the Dexie SessionType so sync-back is lossless.
 */
export function sessionToWorkoutDoc(session: CompletedSession): Omit<WorkoutDoc, 'id'> {
  const now = new Date(session.createdAt).getTime()
  return {
    type: mapSessionTypeToWorkoutType(session.type),
    originalType: session.type,
    date: session.date,
    createdAt: now,
    updatedAt: now,
    exerciseIds: session.exerciseIds,
    data: {},
    plannedSec: session.plannedSec,
    actualSec: session.actualSec,
    label: session.label
  }
}

function mapSessionTypeToWorkoutType(sessionType: string): 'calisthenics' | 'bjj' | 'mobility' {
  if (sessionType === 'calisthenics') return 'calisthenics'
  if (sessionType === 'bjj' || sessionType === 'bjj_release' || sessionType === 'recovery') return 'bjj'
  return 'mobility'
}

// ─────────────────────────────────────────────────────────────────────────
// Global sync callbacks — set by App.tsx once useFirebaseSync initialises
// ─────────────────────────────────────────────────────────────────────────

type AddWorkoutFn = (workout: Omit<WorkoutDoc, 'id'>) => Promise<string>
type AddBjjClassLogFn = (log: Omit<BjjClassLogDoc, 'id'>) => Promise<string>
type AddCalisthenicsLogFn = (log: Omit<CalisthenicsLogDoc, 'id'>) => Promise<string>
type AddRunningLogFn = (log: Omit<RunningLogDoc, 'id'>) => Promise<string>

let globalAddWorkoutToFirestore: AddWorkoutFn | null = null
let globalAddBjjClassLog: AddBjjClassLogFn | null = null
let globalAddCalisthenicsLog: AddCalisthenicsLogFn | null = null
let globalAddRunningLog: AddRunningLogFn | null = null

export function setFirebaseSyncCallback(callback: AddWorkoutFn | null) {
  globalAddWorkoutToFirestore = callback
}

export function setBjjClassLogSyncCallback(callback: AddBjjClassLogFn | null) {
  globalAddBjjClassLog = callback
}

export function setCalisthenicsLogSyncCallback(callback: AddCalisthenicsLogFn | null) {
  globalAddCalisthenicsLog = callback
}

export function setRunningLogSyncCallback(callback: AddRunningLogFn | null) {
  globalAddRunningLog = callback
}

export function getFirebaseSyncCallback() {
  return globalAddWorkoutToFirestore
}

// ─────────────────────────────────────────────────────────────────────────
// Sync helpers — called after each local write
// ─────────────────────────────────────────────────────────────────────────

export async function syncSessionToFirebase(session: CompletedSession) {
  if (!globalAddWorkoutToFirestore) {
    console.warn('[Firebase Sync] No callback set; skipping session sync', session.date)
    return
  }
  try {
    const workoutDoc = sessionToWorkoutDoc(session)
    const docId = await globalAddWorkoutToFirestore(workoutDoc)
    console.debug('[Firebase Sync] Session synced:', docId, session.date)
    return docId
  } catch (err) {
    console.error('[Firebase Sync] Failed to sync session:', err)
  }
}

export async function syncBjjClassLogToFirebase(log: BjjClassLog) {
  if (!globalAddBjjClassLog) return
  try {
    await globalAddBjjClassLog({
      date: log.date,
      className: log.className,
      theme: log.theme,
      tagIds: log.tagIds,
      technicalMins: log.technicalMins,
      sparringMins: log.sparringMins,
      notes: log.notes,
      createdAt: log.createdAt
    })
  } catch (err) {
    console.error('[Firebase Sync] Failed to sync BJJ class log:', err)
  }
}

export async function syncCalisthenicsLogToFirebase(log: CalisthenicsLog) {
  if (!globalAddCalisthenicsLog) return
  try {
    await globalAddCalisthenicsLog({
      date: log.date,
      exerciseId: log.exerciseId,
      metric: log.metric,
      value: log.value,
      sets: log.sets,
      notes: log.notes,
      createdAt: log.createdAt
    })
  } catch (err) {
    console.error('[Firebase Sync] Failed to sync calisthenics log:', err)
  }
}

export async function syncRunningLogToFirebase(log: RunningLog) {
  if (!globalAddRunningLog) return
  try {
    await globalAddRunningLog({
      date: log.date,
      distanceKm: log.distanceKm,
      durationSec: log.durationSec,
      notes: log.notes,
      createdAt: log.createdAt
    })
  } catch (err) {
    console.error('[Firebase Sync] Failed to sync running log:', err)
  }
}
