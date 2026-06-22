/**
 * Merge algorithm for Firebase and Dexie workouts
 * Handles conflict detection and resolution based on timestamps
 */

import { WorkoutDoc } from '../types/firebase'

export interface MergeResult {
  merged: WorkoutDoc[]
  hasConflicts: boolean
  conflictDays: string[]
}

/**
 * Merges Firestore and Dexie workouts with conflict detection
 *
 * Algorithm:
 * 1. Create maps for each source using key = `${date}-${type}`
 * 2. For each unique key:
 *    - If only in Firestore: add to merged
 *    - If only in Dexie: add to merged
 *    - If in both: use the one with newer updatedAt timestamp
 *    - If both exist but differ: mark both as conflicted, add to merged
 * 3. Return merged array with conflict metadata
 *
 * @param firestoreWorkouts - Array of workouts from Firestore
 * @param dexieWorkouts - Array of workouts from Dexie local storage
 * @returns MergeResult containing merged array, conflict flag, and conflict days
 */
export function mergeWorkouts(
  firestoreWorkouts: WorkoutDoc[],
  dexieWorkouts: WorkoutDoc[]
): MergeResult {
  // Create maps for each source: key = `${date}-${type}`
  const firestoreMap = new Map<string, WorkoutDoc>()
  const dexieMap = new Map<string, WorkoutDoc>()

  // Populate Firestore map
  for (const workout of firestoreWorkouts) {
    const key = `${workout.date}-${workout.type}`
    firestoreMap.set(key, workout)
  }

  // Populate Dexie map
  for (const workout of dexieWorkouts) {
    const key = `${workout.date}-${workout.type}`
    dexieMap.set(key, workout)
  }

  // Collect all unique keys
  const allKeys = new Set<string>()
  firestoreMap.forEach((_, key) => allKeys.add(key))
  dexieMap.forEach((_, key) => allKeys.add(key))

  const merged: WorkoutDoc[] = []
  const conflictDays = new Set<string>()

  // Process each unique key
  for (const key of allKeys) {
    const firestoreDoc = firestoreMap.get(key)
    const dexieDoc = dexieMap.get(key)

    // Only in Firestore
    if (firestoreDoc && !dexieDoc) {
      merged.push(firestoreDoc)
      continue
    }

    // Only in Dexie
    if (dexieDoc && !firestoreDoc) {
      merged.push(dexieDoc)
      continue
    }

    // Both exist - need to determine winner and check for conflicts
    if (firestoreDoc && dexieDoc) {
      // Check if they differ
      const isDifferent = !docsAreEqual(firestoreDoc, dexieDoc)

      if (isDifferent) {
        // Mark conflict
        conflictDays.add(firestoreDoc.date)

        // Use the one with newer updatedAt timestamp
        if (firestoreDoc.updatedAt >= dexieDoc.updatedAt) {
          // Mark as conflicted and add Firestore version
          merged.push({
            ...firestoreDoc,
            conflicted: true,
          })
        } else {
          // Mark as conflicted and add Dexie version
          merged.push({
            ...dexieDoc,
            conflicted: true,
          })
        }
      } else {
        // Identical documents - no conflict
        merged.push(firestoreDoc)
      }
    }
  }

  return {
    merged,
    hasConflicts: conflictDays.size > 0,
    conflictDays: Array.from(conflictDays).sort(),
  }
}

/**
 * Helper function to check if two workout documents are equal
 * Compares all fields except updatedAt to detect meaningful differences
 *
 * @param doc1 - First workout document
 * @param doc2 - Second workout document
 * @returns true if documents are equal, false otherwise
 */
function docsAreEqual(doc1: WorkoutDoc, doc2: WorkoutDoc): boolean {
  // Compare immutable fields
  if (doc1.type !== doc2.type || doc1.date !== doc2.date) {
    return false
  }

  // Compare editable fields
  if (
    JSON.stringify(doc1.exerciseIds) !== JSON.stringify(doc2.exerciseIds) ||
    JSON.stringify(doc1.data) !== JSON.stringify(doc2.data)
  ) {
    return false
  }

  // Compare optional fields
  if (doc1.plannedSec !== doc2.plannedSec || doc1.actualSec !== doc2.actualSec) {
    return false
  }

  if (JSON.stringify(doc1.tags) !== JSON.stringify(doc2.tags)) {
    return false
  }

  if (doc1.area !== doc2.area || doc1.label !== doc2.label) {
    return false
  }

  return true
}
