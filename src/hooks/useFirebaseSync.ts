/**
 * useFirebaseSync Hook
 * Sets up real-time Firestore listener for workouts and manages sync state
 * Provides access to all workouts, conflict detection, and CRUD operations
 */

import { useState, useEffect, useRef } from 'react'
import { User } from 'firebase/auth'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore'
import { db as firestoreDb } from '../lib/firebase'
import { db as dexieDb } from '../db/db'
import { WorkoutDoc } from '../types/firebase'
import { isoDate } from '../lib/date'

export interface UseSyncState {
  allWorkouts: WorkoutDoc[]
  conflictDays: string[]
  isLoading: boolean
  updateWorkoutInFirestore: (
    workoutId: string,
    updates: Partial<WorkoutDoc>
  ) => Promise<void>
  addWorkoutToFirestore: (
    workout: Omit<WorkoutDoc, 'id'>
  ) => Promise<string>
}

export function useFirebaseSync(user: User | null): UseSyncState {
  const [allWorkouts, setAllWorkouts] = useState<WorkoutDoc[]>([])
  const [conflictDays, setConflictDays] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Set up real-time listener
  useEffect(() => {
    if (!user) {
      setAllWorkouts([])
      setConflictDays([])
      setIsLoading(false)
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      return
    }

    const setupSync = async () => {
      const fsRef = collection(firestoreDb, `users/${user.uid}/workouts`)
      const unsub = onSnapshot(fsRef, async (snapshot) => {
        const workouts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WorkoutDoc[]
        setAllWorkouts(workouts)

        // Sync Firestore workouts into local Dexie for display
        await syncFirestoreToLocal(workouts)

        // Calculate conflict days
        const conflictSet = new Set<string>()
        workouts.forEach((workout) => {
          if (workout.conflicted) {
            conflictSet.add(workout.date)
          }
        })
        setConflictDays(Array.from(conflictSet).sort())
        setIsLoading(false)
      })
      unsubscribeRef.current = unsub
    }

    setupSync()

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [user])

  const addWorkoutToFirestore = async (
    workout: Omit<WorkoutDoc, 'id'>
  ): Promise<string> => {
    if (!user) {
      throw new Error('User must be logged in to add workouts')
    }

    const now = Timestamp.now().toMillis()
    const fsRef = collection(firestoreDb, `users/${user.uid}/workouts`)
    const docRef = await addDoc(fsRef, {
      ...workout,
      createdAt: now,
      updatedAt: now,
    })

    return docRef.id
  }

  const updateWorkoutInFirestore = async (
    workoutId: string,
    updates: Partial<WorkoutDoc>
  ): Promise<void> => {
    if (!user) {
      throw new Error('User must be logged in to update workouts')
    }

    const workoutRef = doc(firestoreDb, `users/${user.uid}/workouts`, workoutId)
    await updateDoc(workoutRef, {
      ...updates,
      updatedAt: Timestamp.now().toMillis(),
    })
  }

  return {
    allWorkouts,
    conflictDays,
    isLoading,
    updateWorkoutInFirestore,
    addWorkoutToFirestore,
  }
}

async function syncFirestoreToLocal(workouts: WorkoutDoc[]): Promise<void> {
  // Convert Firestore workouts to local Dexie sessions
  for (const workout of workouts) {
    // Skip if already exists in local Dexie by checking date + type
    const existing = await dexieDb.sessions
      .where('date')
      .equals(workout.date)
      .filter((s) => mapWorkoutTypeToSessionType(workout.type) === s.type)
      .first()

    if (!existing) {
      // Insert as a session so it shows in Progress/Logs
      await dexieDb.sessions.add({
        date: workout.date,
        type: mapWorkoutTypeToSessionType(workout.type),
        label: workout.label || `${workout.type} workout`,
        durationMin: Math.round((workout.actualSec || 0) / 60),
        plannedSec: workout.plannedSec || 0,
        actualSec: workout.actualSec || 0,
        percent: workout.plannedSec ? Math.round((workout.actualSec! / workout.plannedSec) * 100) : 0,
        exerciseIds: workout.exerciseIds || [],
        createdAt: new Date(workout.createdAt).toISOString(),
      })
    }
  }
}

function mapWorkoutTypeToSessionType(workoutType: 'calisthenics' | 'bjj' | 'mobility'): string {
  if (workoutType === 'calisthenics') return 'calisthenics'
  if (workoutType === 'bjj') return 'recovery'
  return 'morning' // default mobility type
}
