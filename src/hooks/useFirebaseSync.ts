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
import { db as dexieDb, type SessionType } from '../db/db'
import { WorkoutDoc } from '../types/firebase'
import { mergeWorkouts } from '../lib/merge'

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
  const [isLoading, setIsLoading] = useState(!!user)
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

    setIsLoading(true)

    const fsRef = collection(firestoreDb, `users/${user.uid}/workouts`)
    const unsub = onSnapshot(
      fsRef,
      async (snapshot) => {
        const workouts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WorkoutDoc[]
        setAllWorkouts(workouts)

        // Sync Firestore workouts into local Dexie for display
        try {
          await syncFirestoreToLocal(workouts)
        } catch (err) {
          console.error('[useFirebaseSync] Failed to sync Firestore workouts to local DB:', err)
        }

        // Calculate conflict days
        const conflictSet = new Set<string>()
        workouts.forEach((workout) => {
          if (workout.conflicted) {
            conflictSet.add(workout.date)
          }
        })
        setConflictDays(Array.from(conflictSet).sort())
        setIsLoading(false)
      },
      (error) => {
        console.error('[useFirebaseSync] Firestore snapshot error:', error)
        setIsLoading(false)
      }
    )
    unsubscribeRef.current = unsub

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
  const dexieSessions = await dexieDb.sessions.toArray()
  const {merged} = mergeWorkouts(workouts, dexieSessions)

  for (const workout of merged) {
    const sessionType = mapWorkoutTypeToSessionType(workout.type)
    const session = {
      date: workout.date,
      type: sessionType,
      label: workout.label || `${workout.type} workout`,
      durationMin: Math.round((workout.actualSec || 0) / 60),
      plannedSec: workout.plannedSec || 0,
      actualSec: workout.actualSec || 0,
      percent: workout.plannedSec ? Math.round((workout.actualSec! / workout.plannedSec) * 100) : 0,
      exerciseIds: workout.exerciseIds || [],
      createdAt: new Date(workout.createdAt).toISOString(),
    }

    // Check if this session already exists locally by (date, type, label)
    const existing = await dexieDb.sessions
      .where('date')
      .equals(workout.date)
      .filter((s) => s.type === sessionType && s.label === session.label)
      .first()

    if (existing) {
      // Update with merged data (Firestore wins on conflict via mergeWorkouts)
      await dexieDb.sessions.update(existing.id!, session)
    } else {
      // New row from Firestore
      await dexieDb.sessions.add(session)
    }
  }
}

function mapWorkoutTypeToSessionType(workoutType: 'calisthenics' | 'bjj' | 'mobility'): SessionType {
  if (workoutType === 'calisthenics') return 'calisthenics'
  if (workoutType === 'bjj') return 'recovery'
  return 'morning'
}
