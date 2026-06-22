/**
 * Firebase Workout Sync Utilities
 * Converts Dexie logging data to Firestore WorkoutDoc format
 * and provides sync callbacks for logging functions
 */

import { WorkoutDoc } from '../types/firebase'
import { CompletedSession } from '../db/db'

/**
 * Converts a CompletedSession (Dexie) to a WorkoutDoc (Firestore)
 * Used when syncing logged workouts to Firestore
 */
export function sessionToWorkoutDoc(session: CompletedSession): Omit<WorkoutDoc, 'id'> {
  return {
    type: mapSessionTypeToWorkoutType(session.type),
    date: session.date,
    createdAt: new Date(session.createdAt).getTime(),
    exerciseIds: session.exerciseIds,
    data: {}, // populated from specific exercise logs if available
    plannedSec: session.plannedSec,
    actualSec: session.actualSec,
    label: session.label
  }
}

/**
 * Maps SessionType from Dexie to WorkoutType for Firestore
 */
function mapSessionTypeToWorkoutType(sessionType: string): 'calisthenics' | 'bjj' | 'mobility' {
  if (sessionType === 'calisthenics') return 'calisthenics'
  if (sessionType === 'bjj_release' || sessionType === 'recovery') return 'bjj'
  // morning, ninety_ninety, pancake, pike, hip_mobility, custom default to mobility
  return 'mobility'
}

/**
 * Global sync context for logging functions
 * Set this in App.tsx to enable Firestore sync
 */
let globalAddWorkoutToFirestore: ((workout: Omit<WorkoutDoc, 'id'>) => Promise<string>) | null = null

export function setFirebaseSyncCallback(
  callback: ((workout: Omit<WorkoutDoc, 'id'>) => Promise<string>) | null
) {
  globalAddWorkoutToFirestore = callback
}

export function getFirebaseSyncCallback() {
  return globalAddWorkoutToFirestore
}

/**
 * Call this after logging a session to sync it to Firestore
 * Safe to call even if callback is not set (logs warning)
 */
export async function syncSessionToFirebase(session: CompletedSession) {
  if (!globalAddWorkoutToFirestore) {
    console.warn('[Firebase Sync] No callback set; skipping Firestore sync for session', session.date)
    return
  }

  try {
    const workoutDoc = sessionToWorkoutDoc(session)
    const docId = await globalAddWorkoutToFirestore(workoutDoc)
    console.debug('[Firebase Sync] Session synced to Firestore:', docId, session.date)
    return docId
  } catch (err) {
    console.error('[Firebase Sync] Failed to sync session to Firestore:', err)
    // Don't throw — let logging continue even if sync fails
  }
}
