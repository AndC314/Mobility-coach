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
import { db } from '../lib/firebase'
import { WorkoutDoc } from '../types/firebase'

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
      const fsRef = collection(db, `users/${user.uid}/workouts`)
      const unsub = onSnapshot(fsRef, (snapshot) => {
        const workouts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WorkoutDoc[]
        setAllWorkouts(workouts)

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

  const updateWorkoutInFirestore = async (
    workoutId: string,
    updates: Partial<WorkoutDoc>
  ): Promise<void> => {
    if (!user) {
      throw new Error('User must be logged in to update workouts')
    }

    const workoutRef = doc(db, `users/${user.uid}/workouts`, workoutId)
    await updateDoc(workoutRef, {
      ...updates,
      updatedAt: Timestamp.now().toMillis(),
    })
  }

  const addWorkoutToFirestore = async (
    workout: Omit<WorkoutDoc, 'id'>
  ): Promise<string> => {
    if (!user) {
      throw new Error('User must be logged in to add workouts')
    }

    const now = Timestamp.now().toMillis()
    const fsRef = collection(db, `users/${user.uid}/workouts`)
    const docRef = await addDoc(fsRef, {
      ...workout,
      createdAt: now,
      updatedAt: now,
    })

    return docRef.id
  }

  return {
    allWorkouts,
    conflictDays,
    isLoading,
    updateWorkoutInFirestore,
    addWorkoutToFirestore,
  }
}
