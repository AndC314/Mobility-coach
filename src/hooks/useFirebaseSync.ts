import { useState, useEffect, useRef } from 'react'
import { User } from 'firebase/auth'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore'
import { db as firestoreDb } from '../lib/firebase'
import { db as dexieDb, type SessionType, type CalisthenicsExerciseId, type UserPreferences, type CustomExercise, customExerciseId, type BodySite } from '../db/db'
import { sessionToWorkoutDoc } from '../lib/firebase-workout-sync'
import type { WorkoutDoc, BjjClassLogDoc, CalisthenicsLogDoc, RunningLogDoc, PreferencesDoc, BjjSkillTagDoc, CustomExerciseDoc, HealthMetricsDoc, BodyMeasurementDoc } from '../types/firebase'

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const result = {} as any
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) result[key] = value
  }
  return result
}

export interface UseSyncState {
  allWorkouts: WorkoutDoc[]
  conflictDays: string[]
  isLoading: boolean
  updateWorkoutInFirestore: (workoutId: string, updates: Partial<WorkoutDoc>) => Promise<void>
  addWorkoutToFirestore: (workout: Omit<WorkoutDoc, 'id'>) => Promise<string>
  addBjjClassLogToFirestore: (log: Omit<BjjClassLogDoc, 'id'>) => Promise<string>
  addCalisthenicsLogToFirestore: (log: Omit<CalisthenicsLogDoc, 'id'>) => Promise<string>
  addRunningLogToFirestore: (log: Omit<RunningLogDoc, 'id'>) => Promise<string>
  addHealthMetricsToFirestore: (doc: Omit<HealthMetricsDoc, 'id'>) => Promise<string>
  addBodyMeasurementToFirestore: (doc: Omit<BodyMeasurementDoc, 'id'>) => Promise<string>
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

    // ── 4. preferences listener (singleton doc) ────────────────────────────
    const prefsDocRef = doc(firestoreDb, `users/${user.uid}/settings/preferences`)
    const unsubPrefs = onSnapshot(
      prefsDocRef,
      async (snapshot) => {
        if (!snapshot.exists()) return
        const remote = snapshot.data() as PreferencesDoc
        try {
          await syncPreferencesToLocal(remote)
        } catch (err) {
          console.error('[useFirebaseSync] Failed to sync preferences to local DB:', err)
        }
      },
      (error) => {
        console.error('[useFirebaseSync] preferences snapshot error:', error)
      }
    )
    unsubsRef.current.push(unsubPrefs)

    // ── 5. BJJ skill tags listener ───────────────────────────────────────
    const tagsRef = collection(firestoreDb, `users/${user.uid}/bjjSkillTags`)
    const unsubTags = onSnapshot(
      tagsRef,
      async (snapshot) => {
        const tags = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as BjjSkillTagDoc[]
        try {
          await syncBjjSkillTagsToLocal(tags)
        } catch (err) {
          console.error('[useFirebaseSync] Failed to sync bjjSkillTags to local DB:', err)
        }
      },
      (error) => {
        console.error('[useFirebaseSync] bjjSkillTags snapshot error:', error)
      }
    )
    unsubsRef.current.push(unsubTags)

    // ── 6. custom exercises listener ─────────────────────────────────────
    const customExRef = collection(firestoreDb, `users/${user.uid}/customExercises`)
    const unsubCustom = onSnapshot(
      customExRef,
      async (snapshot) => {
        const exercises = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as CustomExerciseDoc[]
        try {
          await syncCustomExercisesToLocal(exercises, user.uid)
        } catch (err) {
          console.error('[useFirebaseSync] Failed to sync customExercises to local DB:', err)
        }
      },
      (error) => {
        console.error('[useFirebaseSync] customExercises snapshot error:', error)
      }
    )
    unsubsRef.current.push(unsubCustom)

    // ── 7. runningLogs listener ────────────────────────────────────────────
    const runningRef = collection(firestoreDb, `users/${user.uid}/runningLogs`)
    const unsubRunning = onSnapshot(
      runningRef,
      async (snapshot) => {
        const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as RunningLogDoc[]
        try {
          await syncRunningLogsToLocal(logs)
        } catch (err) {
          console.error('[useFirebaseSync] Failed to sync runningLogs to local DB:', err)
        }
      },
      (error) => {
        console.error('[useFirebaseSync] runningLogs snapshot error:', error)
      }
    )
    unsubsRef.current.push(unsubRunning)

    // ── 8. healthMetrics listener ─────────────────────────────────────────
    const healthRef = collection(firestoreDb, `users/${user.uid}/healthMetrics`)
    const unsubHealth = onSnapshot(
      healthRef,
      async (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as HealthMetricsDoc[]
        try {
          await syncHealthMetricsToLocal(docs)
        } catch (err) {
          console.error('[useFirebaseSync] Failed to sync healthMetrics to local DB:', err)
        }
      },
      (error) => {
        console.error('[useFirebaseSync] healthMetrics snapshot error:', error)
      }
    )
    unsubsRef.current.push(unsubHealth)

    // ── 9. bodyMeasurements listener ────────────────────────────────────────
    const bodyRef = collection(firestoreDb, `users/${user.uid}/bodyMeasurements`)
    const unsubBody = onSnapshot(
      bodyRef,
      async (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as BodyMeasurementDoc[]
        try {
          await syncBodyMeasurementsToLocal(docs)
        } catch (err) {
          console.error('[useFirebaseSync] Failed to sync bodyMeasurements to local DB:', err)
        }
      },
      (error) => {
        console.error('[useFirebaseSync] bodyMeasurements snapshot error:', error)
      }
    )
    unsubsRef.current.push(unsubBody)

    // ── 10. Catch-up push: push local data that's missing from Firestore ──
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
    const docRef = await addDoc(fsRef, stripUndefined(log))
    return docRef.id
  }

  const addCalisthenicsLogToFirestore = async (
    log: Omit<CalisthenicsLogDoc, 'id'>
  ): Promise<string> => {
    if (!user) throw new Error('User must be logged in')
    const fsRef = collection(firestoreDb, `users/${user.uid}/calisthenicsLogs`)
    const docRef = await addDoc(fsRef, stripUndefined(log))
    return docRef.id
  }

  const addRunningLogToFirestore = async (
    log: Omit<RunningLogDoc, 'id'>
  ): Promise<string> => {
    if (!user) throw new Error('User must be logged in')
    const fsRef = collection(firestoreDb, `users/${user.uid}/runningLogs`)
    const docRef = await addDoc(fsRef, stripUndefined(log))
    return docRef.id
  }

  const addHealthMetricsToFirestore = async (
    entry: Omit<HealthMetricsDoc, 'id'>
  ): Promise<string> => {
    if (!user) throw new Error('User must be logged in')
    const fsRef = collection(firestoreDb, `users/${user.uid}/healthMetrics`)
    const docRef = await addDoc(fsRef, stripUndefined(entry))
    return docRef.id
  }

  const addBodyMeasurementToFirestore = async (
    entry: Omit<BodyMeasurementDoc, 'id'>
  ): Promise<string> => {
    if (!user) throw new Error('User must be logged in')
    const fsRef = collection(firestoreDb, `users/${user.uid}/bodyMeasurements`)
    const docRef = await addDoc(fsRef, stripUndefined(entry))
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
    addRunningLogToFirestore,
    addHealthMetricsToFirestore,
    addBodyMeasurementToFirestore,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Local DB sync helpers
// ─────────────────────────────────────────────────────────────────────────

async function syncFirestoreToLocal(workouts: WorkoutDoc[]): Promise<void> {
  for (const workout of workouts) {
    try {
      if (!workout.date) continue

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
        createdAt: new Date(workout.createdAt || Date.now()).toISOString(),
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
    } catch (err) {
      console.error('[syncFirestoreToLocal] Failed to sync workout:', workout.date, err)
    }
  }
}

async function syncBjjClassLogsToLocal(logs: BjjClassLogDoc[]): Promise<void> {
  for (const log of logs) {
    try {
      if (!log.date) continue
      const createdAt = normalizeCreatedAt(log.createdAt, log.date)

      const existing = await dexieDb.bjjClassLogs
        .where('date')
        .equals(log.date)
        .filter((l) => l.createdAt === createdAt)
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
          createdAt,
        })
      }
    } catch (err) {
      console.error('[syncBjjClassLogsToLocal] Failed to sync individual log:', log.date, err)
    }
  }
}

async function syncCalisthenicsLogsToLocal(logs: CalisthenicsLogDoc[]): Promise<void> {
  for (const log of logs) {
    try {
      // Skip invalid logs — date, exerciseId, and value are required
      if (!log.date || !log.exerciseId || log.value == null) continue

      // Normalize createdAt — handle Timestamp objects, numbers, or missing values
      const createdAt = normalizeCreatedAt(log.createdAt, log.date)

      // Dedup by (date, exerciseId, createdAt)
      const existing = await dexieDb.calisthenicsLogs
        .where('date')
        .equals(log.date)
        .filter((l) => l.exerciseId === log.exerciseId && l.createdAt === createdAt)
        .first()

      if (!existing) {
        await dexieDb.calisthenicsLogs.add({
          date: log.date,
          exerciseId: log.exerciseId as CalisthenicsExerciseId,
          metric: log.metric || 'reps',
          value: log.value,
          sets: log.sets,
          notes: log.notes,
          createdAt,
        })
      }
    } catch (err) {
      console.error('[syncCalisthenicsLogsToLocal] Failed to sync individual log:', log.exerciseId, log.date, err)
    }
  }
}

async function syncRunningLogsToLocal(logs: RunningLogDoc[]): Promise<void> {
  for (const log of logs) {
    try {
      if (!log.date || log.distanceKm == null || log.durationSec == null) continue
      const createdAt = normalizeCreatedAt(log.createdAt, log.date)

      const existing = await dexieDb.runningLogs
        .where('date')
        .equals(log.date)
        .filter((l) => l.createdAt === createdAt)
        .first()

      if (!existing) {
        await dexieDb.runningLogs.add({
          date: log.date,
          distanceKm: log.distanceKm,
          durationSec: log.durationSec,
          notes: log.notes,
          createdAt,
        })
      }
    } catch (err) {
      console.error('[syncRunningLogsToLocal] Failed to sync individual log:', log.date, err)
    }
  }
}

async function syncHealthMetricsToLocal(docs: HealthMetricsDoc[]): Promise<void> {
  for (const entry of docs) {
    try {
      if (!entry.date) continue
      const createdAt = normalizeCreatedAt(entry.createdAt, entry.date)

      const existing = await dexieDb.healthMetrics
        .where('date')
        .equals(entry.date)
        .filter((l) => l.createdAt === createdAt)
        .first()

      if (!existing) {
        await dexieDb.healthMetrics.add({
          date: entry.date,
          sleepScore: entry.sleepScore,
          sleepHours: entry.sleepHours,
          hrv: entry.hrv,
          restingHr: entry.restingHr,
          trainingReadiness: entry.trainingReadiness,
          energy: entry.energy,
          mood: entry.mood,
          vo2max: entry.vo2max,
          notes: entry.notes,
          source: entry.source as any,
          createdAt,
        })
      }
    } catch (err) {
      console.error('[syncHealthMetricsToLocal] Failed to sync entry:', entry.date, err)
    }
  }
}

async function syncBodyMeasurementsToLocal(docs: BodyMeasurementDoc[]): Promise<void> {
  for (const entry of docs) {
    try {
      if (!entry.date || !entry.site || entry.valueCm == null) continue
      const createdAt = normalizeCreatedAt(entry.createdAt, entry.date)

      const existing = await dexieDb.bodyMeasurementLogs
        .where('date')
        .equals(entry.date)
        .filter((l) => l.site === entry.site && l.createdAt === createdAt)
        .first()

      if (!existing) {
        await dexieDb.bodyMeasurementLogs.add({
          date: entry.date,
          site: entry.site as BodySite,
          valueCm: entry.valueCm,
          createdAt,
        })
      }
    } catch (err) {
      console.error('[syncBodyMeasurementsToLocal] Failed to sync entry:', entry.date, entry.site, err)
    }
  }
}

function normalizeCreatedAt(createdAt: any, fallbackDate: string): string {
  if (typeof createdAt === 'string' && createdAt.length > 0) return createdAt
  if (createdAt && typeof createdAt.toDate === 'function') return createdAt.toDate().toISOString()
  if (typeof createdAt === 'number') return new Date(createdAt).toISOString()
  return `${fallbackDate}T00:00:00.000Z`
}

async function syncPreferencesToLocal(remote: PreferencesDoc): Promise<void> {
  const local = await dexieDb.preferences.get(1)
  const localUpdated = local ? new Date(local.bjjDays.join()).getTime() : 0
  if (remote.updatedAt > localUpdated) {
    await dexieDb.preferences.put({
      id: 1,
      bjjDays: remote.bjjDays,
      sessionDuration: remote.sessionDuration as any,
      sportDurations: (remote.sportDurations ?? { mobility: 10, calisthenics: 20, running: 30, bjj: 20, elite_forces: 20 }) as any,
      goal: remote.goal as any,
      darkMode: remote.darkMode,
      weeklyGoalDays: remote.weeklyGoalDays,
      soundEnabled: remote.soundEnabled,
      avatarVariant: remote.avatarVariant as any,
      availableEquipment: remote.availableEquipment ?? ['pull_up_bar', 'parallel_bars', 'parallettes'],
      activeSports: remote.activeSports ?? ['mobility', 'bjj', 'calisthenics', 'running', 'elite_forces'],
      weightKg: remote.weightKg ?? null,
    })
  }
}

async function syncBjjSkillTagsToLocal(remoteTags: BjjSkillTagDoc[]): Promise<void> {
  const localTags = await dexieDb.bjjSkillTags.toArray()
  const localByName = new Map(localTags.map((t) => [t.name, t]))

  for (const remote of remoteTags) {
    const existing = localByName.get(remote.name)
    if (!existing) {
      await dexieDb.bjjSkillTags.add({
        name: remote.name,
        description: remote.description,
        color: remote.color,
        createdAt: remote.createdAt,
      })
    } else {
      await dexieDb.bjjSkillTags.update(existing.id!, {
        description: remote.description,
        color: remote.color,
      })
    }
  }
}

async function syncCustomExercisesToLocal(remoteExercises: CustomExerciseDoc[], userId: string): Promise<void> {
  const localExercises = await dexieDb.customExercises.toArray()
  const localByLocalId = new Map(localExercises.map((e) => [e.id as string, e]))

  for (const remote of remoteExercises) {
    if (!localByLocalId.has(remote.localId)) {
      await dexieDb.customExercises.add({
        id: customExerciseId(remote.localId),
        userId,
        name: remote.name,
        type: remote.type,
        icon: remote.icon,
        exerciseType: remote.exerciseType,
        primaryMuscles: remote.primaryMuscles,
        category: remote.category as any,
        bodyArea: remote.bodyArea,
        isGlobal: remote.isGlobal,
        createdAt: remote.createdAt,
        updatedAt: remote.updatedAt,
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
      const bjjDoc: Record<string, any> = {
        date: log.date,
        tagIds: log.tagIds ?? [],
        createdAt: log.createdAt,
      }
      if (log.className != null) bjjDoc.className = log.className
      if (log.theme != null) bjjDoc.theme = log.theme
      if (log.technicalMins != null) bjjDoc.technicalMins = log.technicalMins
      if (log.sparringMins != null) bjjDoc.sparringMins = log.sparringMins
      if (log.notes != null) bjjDoc.notes = log.notes
      await addDoc(bjjRef, bjjDoc)
      pushedBjj++
    }
  }

  // Push missing calisthenics logs
  const localCal = await dexieDb.calisthenicsLogs.toArray()
  let pushedCal = 0
  for (const log of localCal) {
    try {
      const createdAt = log.createdAt || `${log.date}T00:00:00.000Z`
      if (!remoteCalKeys.has(createdAt)) {
        const calDoc: Record<string, any> = {
          date: log.date,
          exerciseId: log.exerciseId,
          metric: log.metric || 'reps',
          value: log.value,
          createdAt,
        }
        if (log.sets != null) calDoc.sets = log.sets
        if (log.notes != null) calDoc.notes = log.notes
        await addDoc(calRef, calDoc)
        pushedCal++
      }
    } catch (err) {
      console.error('[catchUpSync] Failed to push calisthenics log:', log.date, log.exerciseId, err)
    }
  }

  // Push missing running logs
  const runningRef = collection(firestoreDb, `users/${uid}/runningLogs`)
  const remoteRunning = await getDocs(runningRef)
  const remoteRunningKeys = new Set(
    remoteRunning.docs.map((d) => (d.data() as RunningLogDoc).createdAt)
  )
  const localRunning = await dexieDb.runningLogs.toArray()
  let pushedRunning = 0
  for (const log of localRunning) {
    try {
      const createdAt = log.createdAt || `${log.date}T00:00:00.000Z`
      if (!remoteRunningKeys.has(createdAt)) {
        const runDoc: Record<string, any> = {
          date: log.date,
          distanceKm: log.distanceKm,
          durationSec: log.durationSec,
          createdAt,
        }
        if (log.notes != null) runDoc.notes = log.notes
        await addDoc(runningRef, runDoc)
        pushedRunning++
      }
    } catch (err) {
      console.error('[catchUpSync] Failed to push running log:', log.date, err)
    }
  }

  // Push preferences (singleton — always overwrite if local exists)
  const localPrefs = await dexieDb.preferences.get(1)
  if (localPrefs) {
    const prefsDocRef = doc(firestoreDb, `users/${uid}/settings/preferences`)
    await setDoc(prefsDocRef, {
      bjjDays: localPrefs.bjjDays,
      sessionDuration: localPrefs.sessionDuration,
      sportDurations: localPrefs.sportDurations as Record<string, number>,
      goal: localPrefs.goal,
      darkMode: localPrefs.darkMode,
      weeklyGoalDays: localPrefs.weeklyGoalDays,
      soundEnabled: localPrefs.soundEnabled,
      avatarVariant: localPrefs.avatarVariant,
      activeSports: localPrefs.activeSports,
      weightKg: localPrefs.weightKg ?? null,
      updatedAt: Timestamp.now().toMillis(),
    } satisfies PreferencesDoc, { merge: true })
  }

  // Push missing BJJ skill tags
  const tagsRef = collection(firestoreDb, `users/${uid}/bjjSkillTags`)
  const remoteTags = await getDocs(tagsRef)
  const remoteTagNames = new Set(remoteTags.docs.map((d) => (d.data() as BjjSkillTagDoc).name))
  const localTags = await dexieDb.bjjSkillTags.toArray()
  let pushedTags = 0
  for (const tag of localTags) {
    if (!remoteTagNames.has(tag.name)) {
      await addDoc(tagsRef, {
        name: tag.name,
        description: tag.description,
        color: tag.color,
        createdAt: tag.createdAt,
        localId: tag.id,
      } satisfies BjjSkillTagDoc)
      pushedTags++
    }
  }

  // Push missing custom exercises
  const customExRef = collection(firestoreDb, `users/${uid}/customExercises`)
  const remoteCustom = await getDocs(customExRef)
  const remoteCustomIds = new Set(remoteCustom.docs.map((d) => (d.data() as CustomExerciseDoc).localId))
  const localCustom = await dexieDb.customExercises.toArray()
  let pushedCustom = 0
  for (const ex of localCustom) {
    if (!remoteCustomIds.has(ex.id as string)) {
      await addDoc(customExRef, {
        localId: ex.id as string,
        name: ex.name,
        type: ex.type,
        icon: ex.icon,
        exerciseType: ex.exerciseType,
        primaryMuscles: ex.primaryMuscles,
        category: ex.category,
        bodyArea: ex.bodyArea,
        isGlobal: ex.isGlobal,
        createdAt: ex.createdAt,
        updatedAt: ex.updatedAt,
      } satisfies CustomExerciseDoc)
      pushedCustom++
    }
  }

  // Push missing health metrics
  const healthRef = collection(firestoreDb, `users/${uid}/healthMetrics`)
  const remoteHealth = await getDocs(healthRef)
  const remoteHealthKeys = new Set(
    remoteHealth.docs.map((d) => (d.data() as HealthMetricsDoc).createdAt)
  )
  const localHealth = await dexieDb.healthMetrics.toArray()
  let pushedHealth = 0
  for (const entry of localHealth) {
    try {
      const createdAt = entry.createdAt || `${entry.date}T00:00:00.000Z`
      if (!remoteHealthKeys.has(createdAt)) {
        const hDoc: Record<string, any> = { date: entry.date, createdAt }
        if (entry.sleepScore != null) hDoc.sleepScore = entry.sleepScore
        if (entry.sleepHours != null) hDoc.sleepHours = entry.sleepHours
        if (entry.hrv != null) hDoc.hrv = entry.hrv
        if (entry.restingHr != null) hDoc.restingHr = entry.restingHr
        if (entry.trainingReadiness != null) hDoc.trainingReadiness = entry.trainingReadiness
        if (entry.energy != null) hDoc.energy = entry.energy
        if (entry.mood != null) hDoc.mood = entry.mood
        if (entry.vo2max != null) hDoc.vo2max = entry.vo2max
        if (entry.notes != null) hDoc.notes = entry.notes
        if (entry.source != null) hDoc.source = entry.source
        await addDoc(healthRef, hDoc)
        pushedHealth++
      }
    } catch (err) {
      console.error('[catchUpSync] Failed to push health metrics:', entry.date, err)
    }
  }

  // Push missing body measurements
  const bodyRef = collection(firestoreDb, `users/${uid}/bodyMeasurements`)
  const remoteBody = await getDocs(bodyRef)
  const remoteBodyKeys = new Set(
    remoteBody.docs.map((d) => {
      const data = d.data() as BodyMeasurementDoc
      return `${data.date}|${data.site}|${data.createdAt}`
    })
  )
  const localBody = await dexieDb.bodyMeasurementLogs.toArray()
  let pushedBody = 0
  for (const entry of localBody) {
    try {
      const key = `${entry.date}|${entry.site}|${entry.createdAt}`
      if (!remoteBodyKeys.has(key)) {
        await addDoc(bodyRef, {
          date: entry.date,
          site: entry.site,
          valueCm: entry.valueCm,
          createdAt: entry.createdAt,
        })
        pushedBody++
      }
    } catch (err) {
      console.error('[catchUpSync] Failed to push body measurement:', entry.date, entry.site, err)
    }
  }

  const total = pushedSessions + pushedBjj + pushedCal + pushedTags + pushedCustom + pushedHealth + pushedBody
  if (total > 0) {
    console.info(
      `[catchUpSync] Pushed ${pushedSessions} sessions, ${pushedBjj} BJJ logs, ${pushedCal} cal logs, ${pushedTags} tags, ${pushedCustom} custom exercises, ${pushedHealth} health metrics, ${pushedBody} body measurements`
    )
  }
}
