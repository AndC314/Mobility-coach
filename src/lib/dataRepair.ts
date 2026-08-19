import { db, type CompletedSession } from '../db/db'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db as firestoreDb } from './firebase'

/**
 * Removes duplicate session rows: same date + type + label, keeping only
 * the most recently created one (which has the most complete/accurate
 * actualSec, since upsertTodaySession always merges into the existing row
 * going forward — duplicates can only be historical debris from before
 * that logic existed).
 */
export async function dedupeSessions(): Promise<{ removed: number }> {
  const all = await db.sessions.toArray()
  const groups = new Map<string, CompletedSession[]>()

  for (const s of all) {
    const key = `${s.date}__${s.type}__${s.label}`
    const list = groups.get(key) ?? []
    list.push(s)
    groups.set(key, list)
  }

  const idsToRemove: number[] = []
  for (const list of groups.values()) {
    if (list.length <= 1) continue
    // keep the one with the highest actualSec (most progress), tie-broken
    // by most recently created
    const sorted = [...list].sort((a, b) => {
      if (b.actualSec !== a.actualSec) return b.actualSec - a.actualSec
      return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    })
    for (const dup of sorted.slice(1)) {
      if (dup.id != null) idsToRemove.push(dup.id)
    }
  }

  if (idsToRemove.length > 0) {
    await db.sessions.bulkDelete(idsToRemove)
  }

  return { removed: idsToRemove.length }
}

/** Re-applies the NaN-scrub from the v4 migration, in case any bad rows
 * were written after that migration ran (defensive, should be a no-op
 * on a healthy database). */
export async function repairInvalidNumbers(): Promise<{ fixed: number }> {
  let fixed = 0
  await db.sessions.toCollection().modify((s: any) => {
    const safe = (n: unknown, fallback: number) =>
      typeof n === 'number' && Number.isFinite(n) ? n : fallback

    const before = JSON.stringify(s)
    s.plannedSec = safe(s.plannedSec, 0)
    s.actualSec = safe(s.actualSec, 0)
    s.durationMin = safe(s.durationMin, Math.round(s.actualSec / 60) || 0)
    s.percent = safe(
      s.percent,
      s.plannedSec > 0 ? Math.min(100, Math.round((s.actualSec / s.plannedSec) * 100)) : 0
    )
    if (JSON.stringify(s) !== before) fixed += 1
  })
  return { fixed }
}

/**
 * Removes ghost mobility sessions that were duplicated from BJJ class logs.
 * Also deletes matching documents from Firestore so they don't re-sync.
 */
export async function purgeGhostMobilitySessions(uid?: string): Promise<{ purged: number }> {
  const [sessions, bjjLogs] = await Promise.all([
    db.sessions.toArray(),
    db.bjjClassLogs.toArray(),
  ])

  const bjjDates = new Set(bjjLogs.map((l) => l.date))

  const toRemove: CompletedSession[] = []
  for (const s of sessions) {
    if ((s.type === 'morning' || s.type === 'bjj_release') && bjjDates.has(s.date) && s.durationMin <= 15) {
      toRemove.push(s)
    }
  }

  const idsToRemove = toRemove.filter((s) => s.id != null).map((s) => s.id!)
  if (idsToRemove.length > 0) {
    await db.sessions.bulkDelete(idsToRemove)
  }

  if (uid && toRemove.length > 0) {
    await deleteMatchingWorkoutsFromFirestore(uid, toRemove)
  }

  return { purged: toRemove.length }
}

/**
 * Deletes calisthenics logs for exercises that were logged by mistake.
 * Also removes from Firestore.
 */
export async function purgeWrongExerciseLogs(uid?: string): Promise<{ purgedLogs: number }> {
  const wrongIds = ['gymnastics_bridge']
  const toDelete = await db.calisthenicsLogs
    .where('exerciseId')
    .anyOf(wrongIds)
    .toArray()

  if (toDelete.length > 0) {
    await db.calisthenicsLogs.bulkDelete(toDelete.map((l) => l.id!).filter(Boolean))
  }

  if (uid && toDelete.length > 0) {
    try {
      const calRef = collection(firestoreDb, `users/${uid}/calisthenicsLogs`)
      const snapshot = await getDocs(calRef)
      const deletes: Promise<void>[] = []
      for (const d of snapshot.docs) {
        const data = d.data()
        if (wrongIds.includes(data.exerciseId)) {
          deletes.push(deleteDoc(doc(firestoreDb, `users/${uid}/calisthenicsLogs`, d.id)))
        }
      }
      await Promise.all(deletes)
    } catch (err) {
      console.error('[purgeWrongExerciseLogs] Firestore cleanup failed:', err)
    }
  }

  return { purgedLogs: toDelete.length }
}

async function deleteMatchingWorkoutsFromFirestore(
  uid: string,
  sessions: CompletedSession[]
): Promise<void> {
  try {
    const workoutsRef = collection(firestoreDb, `users/${uid}/workouts`)
    const snapshot = await getDocs(workoutsRef)

    const keysToDelete = new Set(
      sessions.map((s) => `${s.date}|${s.type}|${s.label}`)
    )

    const deletes: Promise<void>[] = []
    for (const d of snapshot.docs) {
      const data = d.data()
      const key = `${data.date}|${data.originalType || data.type}|${data.label || ''}`
      if (keysToDelete.has(key)) {
        deletes.push(deleteDoc(doc(firestoreDb, `users/${uid}/workouts`, d.id)))
      }
    }
    await Promise.all(deletes)
  } catch (err) {
    console.error('[purgeGhostMobilitySessions] Firestore cleanup failed:', err)
  }
}

export async function runFullRepair(uid?: string): Promise<{ removed: number; fixed: number; purged: number; purgedLogs: number }> {
  const { fixed } = await repairInvalidNumbers()
  const { removed } = await dedupeSessions()
  const { purged } = await purgeGhostMobilitySessions(uid)
  const { purgedLogs } = await purgeWrongExerciseLogs(uid)
  return { removed, fixed, purged, purgedLogs }
}
