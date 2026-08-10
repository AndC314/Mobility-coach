import { useState, useEffect, useRef } from 'react'
import { User } from 'firebase/auth'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  getDocs,
  doc,
  Timestamp,
} from 'firebase/firestore'
import { db as firestoreDb } from '../lib/firebase'
import { db as dexieDb, type SessionType, type CalisthenicsExerciseId } from '../db/db'
import { sessionToWorkoutDoc } from '../lib/firebase-workout-sync'
import type { WorkoutDoc, BjjClassLogDoc, CalisthenicsLogDoc } from '../types/firebase'

export interface UseSyncState {
  allWorkouts: WorkoutDoc[]
  conflictDays: string[]
  isLoading: boolean
  updateWorkoutInFirestore: (workoutId: string, updates: Partial<WorkoutDoc>) => Promise<void>
  addWorkoutToFirestore: (workout: Omit<WorkoutDoc, 'id'>) => Promise<string>
  addBjjClassLogToFirestore: (log: Omit<BjjClassLogDoc, 'id'>) => Promise<string>
  addCalisthenicsLogToFirestore: (log: Omit<CalisthenicsLogDoc, 'id'>) => Promise<string>
}

export function useFirebaseSync(user: User | null): UseSyncState {
  const [allWorkouts, setAllWorkouts] = useState<WorkoutDoc[]>([])
  const [conflictDays, setConflictDays] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(!!user)
  const unsubsRef = useRef<Array<() => void>>([])

  useEffect(() => {
    // Clean up any existing listeners
    unsubsRef.current.forEach((unsub) => unsub())
    unsubsRef.current = []

    if (!user) {
      setAllWorkouts([])
      setConflictDays([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    // ── 1. workouts listener ──────────────────────────────────────────────
    const workoutsRef = collection(firestoreDb, `users/${user.uid}/workouts`)
    const unsubWorkouts = onSnapshot(
      workoutsRef,
      async (snapshot) => {
        const workouts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as WorkoutDoc[]
        setAllWorkouts(workouts)
        try {
          await syncFirestoreToLocal(workouts)
        } catch (err) {
          console.error('[useFirebaseSync] Failed to sync workouts to local DB:', err)
        }
        const conflictSet = new Set<string>()
        workouts.forEach((w) => { if (w.conflicted) conflictSet.add(w.date) })
        setConflictDays(Array.from(conflictSet).sort())
        setIsLoading(false)
      },
      (error) => {
        console.error('[useFirebaseSync] workouts snapshot error:', error)
        setIsLoading(false)
      }
    )
    unsubsRef.current.push(unsubWorkouts)

    // ── 2. bjjClassLogs listener ──────────────────────────────────────────
    const bjjRef = collection(firestoreDb, `users/${user.uid}/bjjClassLogs`)
    const unsubBjj = onSnapshot(
      bjjRef,
      async (snapshot) => {
        const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as BjjClassLogDoc[]
        try {
          await syncBjjClassLogsToLocal(logs)
        } catch (err) {
          console.error('[useFirebaseSync] Failed to sync bjjClassLogs to local DB:', err)
        }
      },
      (error) => {
        console.error('[useFirebaseSync] bjjClassLogs snapshot error:', error)
      }
    )
    unsubsRef.current.push(unsubBjj)

    // ── 3. calisthenicsLogs listener ──────────────────────────────────────
    const calRef = collection(firestoreDb, `users/${user.uid}/calisthenicsLogs`)
    const unsubCal = onSnapshot(
      calRef,
      async (snapshot) => {
        const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as CalisthenicsLogDoc[]
        try {
          await syncCalisthenicsLogsToLocal(logs)
        } catch (err) {
          console.error('[useFirebaseSync] Failed to sync calisthenicsLogs to local DB:', err)
        }
      },
      (error) => {
        console.error('[useFirebaseSync] calisthenicsLogs snapshot error:', error)
      }
    )
    unsubsRef.current.push(unsubCal)

    // ── 4. Catch-up push: push local data that's missing from Firestore ──
    catchUpSync(user.uid).catch((err) =>
      console.error('[useFirebaseSync] Catch-up sync failed:', err)
    )

    return () => {
      unsubsRef.current.forEach((unsub) => unsub())
      unsubsRef.current = []
    }
  }, [user])

  // ── Write helpers (returned so App.tsx can wire them as sync callbacks) ──

  const addWorkoutToFirestore = async (workout: Omit<WorkoutDoc, 'id'>): Promise<string> => {
    if (!user) throw new Error('User must be logged in to add workouts')
    const now = Timestamp.now().toMillis()
    const fsRef = collection(firestoreDb, `users/${user.uid}/workouts`)
    const docRef = await addDoc(fsRef, { ...workout, createdAt: now, updatedAt: now })
    return docRef.id
  }

  const updateWorkoutInFirestore = async (
    workoutId: string,
    updates: Partial<WorkoutDoc>
  ): Promise<void> => {
    if (!user) throw new Error('User must be logged in to update workouts')
    const workoutRef = doc(firestoreDb, `users/${user.uid}/workouts`, workoutId)
    await updateDoc(workoutRef, { ...updates, updatedAt: Timestamp.now().toMillis() })
  }

  const addBjjClassLogToFirestore = async (log: Omit<BjjClassLogDoc, 'id'>): Promise<string> => {
    if (!user) throw new Error('User must be logged in')
    const fsRef = collection(firestoreDb, `users/${user.uid}/bjjClassLogs`)
    const docRef = await addDoc(fsRef, log)
    return docRef.id
  }

  const addCalisthenicsLogToFirestore = async (
    log: Omit<CalisthenicsLogDoc, 'id'>
  ): Promise<string> => {
    if (!user) throw new Error('User must be logged in')
    const fsRef = collection(firestoreDb, `users/${user.uid}/calisthenicsLogs`)
    const docRef = await addDoc(fsRef, log)
    return docRef.id
  }

  return {
    allWorkouts,
    conflictDays,
    isLoading,
    updateWorkoutInFirestore,
    addWorkoutToFirestore,
    addBjjClassLogToFirestore,
    addCalisthenicsLogToFirestore,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Local DB sync helpers
// ─────────────────────────────────────────────────────────────────────────

async function syncFirestoreToLocal(workouts: WorkoutDoc[]): Promise<void> {
  for (const workout of workouts) {
    // Use originalType when available for lossless round-trip
    const sessionType: SessionType =
      (workout.originalType as SessionType) || mapWorkoutTypeToSessionType(workout.type)

    const session = {
      date: workout.date,
      type: sessionType,
      label: workout.label || `${workout.type} workout`,
      durationMin: Math.round((workout.actualSec || 0) / 60),
      plannedSec: workout.plannedSec || 0,
      actualSec: workout.actualSec || 0,
      percent: workout.plannedSec
        ? Math.round((workout.actualSec! / workout.plannedSec) * 100)
        : 0,
      exerciseIds: workout.exerciseIds || [],
      createdAt: new Date(workout.createdAt).toISOString(),
    }

    const existing = await dexieDb.sessions
      .where('date')
      .equals(workout.date)
      .filter((s) => s.type === sessionType && s.label === session.label)
      .first()

    if (existing) {
      if (workout.updatedAt > new Date(existing.createdAt).getTime()) {
        await dexieDb.sessions.update(existing.id!, session)
      }
    } else {
      await dexieDb.sessions.add(session)
    }
  }
}

async function syncBjjClassLogsToLocal(logs: BjjClassLogDoc[]): Promise<void> {
  for (const log of logs) {
    // Dedup by (date, createdAt) — same ISO timestamp = same record
    const existing = await dexieDb.bjjClassLogs
      .where('date')
      .equals(log.date)
      .filter((l) => l.createdAt === log.createdAt)
      .first()

    if (!existing) {
      await dexieDb.bjjClassLogs.add({
        date: log.date,
        className: log.className,
        theme: log.theme,
        tagIds: log.tagIds ?? [],
        technicalMins: log.technicalMins,
        sparringMins: log.sparringMins,
        notes: log.notes,
        createdAt: log.createdAt,
      })
    }
  }
}

async function syncCalisthenicsLogsToLocal(logs: CalisthenicsLogDoc[]): Promise<void> {
  for (const log of logs) {
    // Dedup by (date, exerciseId, createdAt)
    const existing = await dexieDb.calisthenicsLogs
      .where('date')
      .equals(log.date)
      .filter((l) => l.exerciseId === log.exerciseId && l.createdAt === log.createdAt)
      .first()

    if (!existing) {
      await dexieDb.calisthenicsLogs.add({
        date: log.date,
        exerciseId: log.exerciseId as CalisthenicsExerciseId,
        metric: log.metric,
        value: log.value,
        sets: log.sets,
        notes: log.notes,
        createdAt: log.createdAt,
      })
    }
  }
}

function mapWorkoutTypeToSessionType(workoutType: 'calisthenics' | 'bjj' | 'mobility'): SessionType {
  if (workoutType === 'calisthenics') return 'calisthenics'
  if (workoutType === 'bjj') return 'bjj'
  return 'morning'
}

// ─────────────────────────────────────────────────────────────────────────
// Catch-up sync: pushes local-only data to Firestore on login.
// Runs once per session. Deduplicates by createdAt timestamp.
// ─────────────────────────────────────────────────────────────────────────

async function catchUpSync(uid: string): Promise<void> {
  const workoutsRef = collection(firestoreDb, `users/${uid}/workouts`)
  const bjjRef = collection(firestoreDb, `users/${uid}/bjjClassLogs`)
  const calRef = collection(firestoreDb, `users/${uid}/calisthenicsLogs`)

  // Fetch existing remote createdAt keys for dedup
  const [remoteWorkouts, remoteBjj, remoteCal] = await Promise.all([
    getDocs(workoutsRef),
    getDocs(bjjRef),
    getDocs(calRef),
  ])

  const remoteWorkoutKeys = new Set(
    remoteWorkouts.docs.map((d) => {
      const data = d.data() as WorkoutDoc
      return `${data.date}|${data.originalType || data.type}|${data.label || ''}`
    })
  )
  const remoteBjjKeys = new Set(
    remoteBjj.docs.map((d) => (d.data() as BjjClassLogDoc).createdAt)
  )
  const remoteCalKeys = new Set(
    remoteCal.docs.map((d) => (d.data() as CalisthenicsLogDoc).createdAt)
  )

  // Push missing sessions
  const localSessions = await dexieDb.sessions.toArray()
  let pushedSessions = 0
  for (const session of localSessions) {
    const key = `${session.date}|${session.type}|${session.label}`
    if (!remoteWorkoutKeys.has(key)) {
      const doc = sessionToWorkoutDoc(session)
      await addDoc(workoutsRef, doc)
      pushedSessions++
    }
  }

  // Push missing BJJ class logs
  const localBjj = await dexieDb.bjjClassLogs.toArray()
  let pushedBjj = 0
  for (const log of localBjj) {
    if (!remoteBjjKeys.has(log.createdAt)) {
      await addDoc(bjjRef, {
        date: log.date,
        className: log.className,
        theme: log.theme,
        tagIds: log.tagIds,
        technicalMins: log.technicalMins,
        sparringMins: log.sparringMins,
        notes: log.notes,
        createdAt: log.createdAt,
      })
      pushedBjj++
    }
  }

  // Push missing calisthenics logs
  const localCal = await dexieDb.calisthenicsLogs.toArray()
  let pushedCal = 0
  for (const log of localCal) {
    if (!remoteCalKeys.has(log.createdAt)) {
      await addDoc(calRef, {
        date: log.date,
        exerciseId: log.exerciseId,
        metric: log.metric,
        value: log.value,
        sets: log.sets,
        notes: log.notes,
        createdAt: log.createdAt,
      })
      pushedCal++
    }
  }

  if (pushedSessions + pushedBjj + pushedCal > 0) {
    console.info(
      `[catchUpSync] Pushed ${pushedSessions} sessions, ${pushedBjj} BJJ logs, ${pushedCal} calisthenics logs`
    )
  }
}
