import { useState, useEffect, useRef } from 'react'
import { User } from 'firebase/auth'
import { collection, onSnapshot, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db as firestoreDb } from '../lib/firebase'
import type { WorkoutDoc, BjjClassLogDoc, CalisthenicsLogDoc, RunningLogDoc, BjjSkillTagDoc, CustomExerciseDoc, HealthMetricsDoc, BodyMeasurementDoc, PreferencesDoc } from '../types/firebase'
import type { UseSyncState, HoldLogDoc, WeightLogDoc } from '../lib/sync/types'
import { stripUndefined } from '../lib/sync/helpers'
import {
  syncFirestoreToLocal,
  syncBjjClassLogsToLocal,
  syncCalisthenicsLogsToLocal,
  syncRunningLogsToLocal,
  syncHealthMetricsToLocal,
  syncBodyMeasurementsToLocal,
  syncPreferencesToLocal,
  syncBjjSkillTagsToLocal,
  syncCustomExercisesToLocal,
  syncHoldLogsToLocal,
  syncWeightLogsToLocal,
} from '../lib/sync/listeners'
import { catchUpSync } from '../lib/sync/catchUpSync'

export type { UseSyncState }

export function useFirebaseSync(user: User | null): UseSyncState {
  const [allWorkouts, setAllWorkouts] = useState<WorkoutDoc[]>([])
  const [conflictDays, setConflictDays] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(!!user)
  const unsubsRef = useRef<Array<() => void>>([])

  useEffect(() => {
    unsubsRef.current.forEach((unsub) => unsub())
    unsubsRef.current = []

    if (!user) {
      setAllWorkouts([])
      setConflictDays([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const uid = user.uid

    // ── Listeners ──────────────────────────────────────────────────────────

    const unsub1 = onSnapshot(
      collection(firestoreDb, `users/${uid}/workouts`),
      async (snapshot) => {
        const workouts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as WorkoutDoc[]
        setAllWorkouts(workouts)
        try { await syncFirestoreToLocal(workouts) } catch (err) { console.error('[sync] workouts:', err) }
        const conflicts = new Set<string>()
        workouts.forEach((w) => { if (w.conflicted) conflicts.add(w.date) })
        setConflictDays(Array.from(conflicts).sort())
        setIsLoading(false)
      },
      (err) => { console.error('[sync] workouts snapshot:', err); setIsLoading(false) }
    )

    const unsub2 = onSnapshot(
      collection(firestoreDb, `users/${uid}/bjjClassLogs`),
      async (snap) => { try { await syncBjjClassLogsToLocal(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as BjjClassLogDoc[]) } catch (e) { console.error('[sync] bjj:', e) } },
      (err) => console.error('[sync] bjj snapshot:', err)
    )

    const unsub3 = onSnapshot(
      collection(firestoreDb, `users/${uid}/calisthenicsLogs`),
      async (snap) => { try { await syncCalisthenicsLogsToLocal(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CalisthenicsLogDoc[]) } catch (e) { console.error('[sync] cal:', e) } },
      (err) => console.error('[sync] cal snapshot:', err)
    )

    const unsub4 = onSnapshot(
      doc(firestoreDb, `users/${uid}/settings/preferences`),
      async (snap) => { if (!snap.exists()) return; try { await syncPreferencesToLocal(snap.data() as PreferencesDoc) } catch (e) { console.error('[sync] prefs:', e) } },
      (err) => console.error('[sync] prefs snapshot:', err)
    )

    const unsub5 = onSnapshot(
      collection(firestoreDb, `users/${uid}/bjjSkillTags`),
      async (snap) => { try { await syncBjjSkillTagsToLocal(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as BjjSkillTagDoc[]) } catch (e) { console.error('[sync] tags:', e) } },
      (err) => console.error('[sync] tags snapshot:', err)
    )

    const unsub6 = onSnapshot(
      collection(firestoreDb, `users/${uid}/customExercises`),
      async (snap) => { try { await syncCustomExercisesToLocal(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CustomExerciseDoc[], uid) } catch (e) { console.error('[sync] customEx:', e) } },
      (err) => console.error('[sync] customEx snapshot:', err)
    )

    const unsub7 = onSnapshot(
      collection(firestoreDb, `users/${uid}/runningLogs`),
      async (snap) => { try { await syncRunningLogsToLocal(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as RunningLogDoc[]) } catch (e) { console.error('[sync] running:', e) } },
      (err) => console.error('[sync] running snapshot:', err)
    )

    const unsub8 = onSnapshot(
      collection(firestoreDb, `users/${uid}/healthMetrics`),
      async (snap) => { try { await syncHealthMetricsToLocal(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as HealthMetricsDoc[]) } catch (e) { console.error('[sync] health:', e) } },
      (err) => console.error('[sync] health snapshot:', err)
    )

    const unsub9 = onSnapshot(
      collection(firestoreDb, `users/${uid}/bodyMeasurements`),
      async (snap) => { try { await syncBodyMeasurementsToLocal(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as BodyMeasurementDoc[]) } catch (e) { console.error('[sync] body:', e) } },
      (err) => console.error('[sync] body snapshot:', err)
    )

    const unsub10 = onSnapshot(
      collection(firestoreDb, `users/${uid}/holdLogs`),
      async (snap) => { try { await syncHoldLogsToLocal(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as HoldLogDoc[]) } catch (e) { console.error('[sync] holds:', e) } },
      (err) => console.error('[sync] holds snapshot:', err)
    )

    const unsub11 = onSnapshot(
      collection(firestoreDb, `users/${uid}/weightLogs`),
      async (snap) => { try { await syncWeightLogsToLocal(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as WeightLogDoc[]) } catch (e) { console.error('[sync] weights:', e) } },
      (err) => console.error('[sync] weights snapshot:', err)
    )

    unsubsRef.current = [unsub1, unsub2, unsub3, unsub4, unsub5, unsub6, unsub7, unsub8, unsub9, unsub10, unsub11]

    catchUpSync(uid).catch((err) => console.error('[sync] catch-up failed:', err))

    return () => {
      unsubsRef.current.forEach((unsub) => unsub())
      unsubsRef.current = []
    }
  }, [user])

  // ── Write helpers ──────────────────────────────────────────────────────

  const addWorkoutToFirestore = async (workout: Omit<WorkoutDoc, 'id'>): Promise<string> => {
    if (!user) throw new Error('User must be logged in to add workouts')
    const now = Timestamp.now().toMillis()
    const ref = collection(firestoreDb, `users/${user.uid}/workouts`)
    const docRef = await addDoc(ref, { ...workout, createdAt: now, updatedAt: now })
    return docRef.id
  }

  const updateWorkoutInFirestore = async (workoutId: string, updates: Partial<WorkoutDoc>): Promise<void> => {
    if (!user) throw new Error('User must be logged in to update workouts')
    const ref = doc(firestoreDb, `users/${user.uid}/workouts`, workoutId)
    await updateDoc(ref, { ...updates, updatedAt: Timestamp.now().toMillis() })
  }

  const addBjjClassLogToFirestore = async (log: Omit<BjjClassLogDoc, 'id'>): Promise<string> => {
    if (!user) throw new Error('User must be logged in')
    const ref = collection(firestoreDb, `users/${user.uid}/bjjClassLogs`)
    const docRef = await addDoc(ref, stripUndefined(log))
    return docRef.id
  }

  const addCalisthenicsLogToFirestore = async (log: Omit<CalisthenicsLogDoc, 'id'>): Promise<string> => {
    if (!user) throw new Error('User must be logged in')
    const ref = collection(firestoreDb, `users/${user.uid}/calisthenicsLogs`)
    const docRef = await addDoc(ref, stripUndefined(log))
    return docRef.id
  }

  const addRunningLogToFirestore = async (log: Omit<RunningLogDoc, 'id'>): Promise<string> => {
    if (!user) throw new Error('User must be logged in')
    const ref = collection(firestoreDb, `users/${user.uid}/runningLogs`)
    const docRef = await addDoc(ref, stripUndefined(log))
    return docRef.id
  }

  const addHealthMetricsToFirestore = async (entry: Omit<HealthMetricsDoc, 'id'>): Promise<string> => {
    if (!user) throw new Error('User must be logged in')
    const ref = collection(firestoreDb, `users/${user.uid}/healthMetrics`)
    const docRef = await addDoc(ref, stripUndefined(entry))
    return docRef.id
  }

  const addBodyMeasurementToFirestore = async (entry: Omit<BodyMeasurementDoc, 'id'>): Promise<string> => {
    if (!user) throw new Error('User must be logged in')
    const ref = collection(firestoreDb, `users/${user.uid}/bodyMeasurements`)
    const docRef = await addDoc(ref, stripUndefined(entry))
    return docRef.id
  }

  const addHoldLogToFirestore = async (entry: Omit<HoldLogDoc, 'id'>): Promise<string> => {
    if (!user) throw new Error('User must be logged in')
    const ref = collection(firestoreDb, `users/${user.uid}/holdLogs`)
    const docRef = await addDoc(ref, stripUndefined(entry))
    return docRef.id
  }

  const addWeightLogToFirestore = async (entry: Omit<WeightLogDoc, 'id'>): Promise<string> => {
    if (!user) throw new Error('User must be logged in')
    const ref = collection(firestoreDb, `users/${user.uid}/weightLogs`)
    const docRef = await addDoc(ref, stripUndefined(entry))
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
    addHoldLogToFirestore,
    addWeightLogToFirestore,
  }
}
