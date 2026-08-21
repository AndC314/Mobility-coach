import {
  collection,
  getDocs,
  addDoc,
  setDoc,
  doc,
  Timestamp,
} from 'firebase/firestore'
import { db as firestoreDb } from '../firebase'
import { db as dexieDb } from '../../db/db'
import { sessionToWorkoutDoc } from './writeCallbacks'
import type {
  WorkoutDoc,
  BjjClassLogDoc,
  CalisthenicsLogDoc,
  RunningLogDoc,
  PreferencesDoc,
  BjjSkillTagDoc,
  CustomExerciseDoc,
  HealthMetricsDoc,
  BodyMeasurementDoc,
  HoldLogDoc,
  WeightLogDoc,
} from './types'

export async function catchUpSync(uid: string): Promise<void> {
  const workoutsRef = collection(firestoreDb, `users/${uid}/workouts`)
  const bjjRef = collection(firestoreDb, `users/${uid}/bjjClassLogs`)
  const calRef = collection(firestoreDb, `users/${uid}/calisthenicsLogs`)

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
      const workoutDoc = sessionToWorkoutDoc(session)
      await addDoc(workoutsRef, workoutDoc)
      pushedSessions++
    }
  }

  // Push missing BJJ class logs
  const localBjj = await dexieDb.bjjClassLogs.toArray()
  let pushedBjj = 0
  for (const log of localBjj) {
    if (!remoteBjjKeys.has(log.createdAt)) {
      const bjjDoc: Record<string, unknown> = {
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
        const calDoc: Record<string, unknown> = {
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
        const runDoc: Record<string, unknown> = {
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

  // Push preferences (singleton — merge)
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
        const hDoc: Record<string, unknown> = { date: entry.date, createdAt }
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

  // Push missing hold logs
  const holdRef = collection(firestoreDb, `users/${uid}/holdLogs`)
  const remoteHolds = await getDocs(holdRef)
  const remoteHoldKeys = new Set(
    remoteHolds.docs.map((d) => {
      const data = d.data() as HoldLogDoc
      return `${data.date}|${data.exerciseKey}|${data.createdAt}`
    })
  )
  const localHolds = await dexieDb.holdLogs.toArray()
  let pushedHolds = 0
  for (const entry of localHolds) {
    try {
      const key = `${entry.date}|${entry.exerciseKey}|${entry.createdAt}`
      if (!remoteHoldKeys.has(key)) {
        await addDoc(holdRef, {
          date: entry.date,
          exerciseKey: entry.exerciseKey,
          phase: entry.phase,
          plannedSec: entry.plannedSec,
          actualSec: entry.actualSec,
          createdAt: entry.createdAt,
        })
        pushedHolds++
      }
    } catch (err) {
      console.error('[catchUpSync] Failed to push hold log:', entry.date, entry.exerciseKey, err)
    }
  }

  // Push missing weight logs
  const weightRef = collection(firestoreDb, `users/${uid}/weightLogs`)
  const remoteWeights = await getDocs(weightRef)
  const remoteWeightKeys = new Set(
    remoteWeights.docs.map((d) => (d.data() as WeightLogDoc).createdAt)
  )
  const localWeights = await dexieDb.weightLogs.toArray()
  let pushedWeights = 0
  for (const entry of localWeights) {
    try {
      const createdAt = entry.createdAt || `${entry.date}T00:00:00.000Z`
      if (!remoteWeightKeys.has(createdAt)) {
        await addDoc(weightRef, {
          date: entry.date,
          weightKg: entry.weightKg,
          createdAt,
        })
        pushedWeights++
      }
    } catch (err) {
      console.error('[catchUpSync] Failed to push weight log:', entry.date, err)
    }
  }

  const total = pushedSessions + pushedBjj + pushedCal + pushedRunning + pushedTags + pushedCustom + pushedHealth + pushedBody + pushedHolds + pushedWeights
  if (total > 0) {
    console.info(
      `[catchUpSync] Pushed ${pushedSessions} sessions, ${pushedBjj} BJJ, ${pushedCal} cal, ${pushedRunning} running, ${pushedTags} tags, ${pushedCustom} custom ex, ${pushedHealth} health, ${pushedBody} body, ${pushedHolds} holds, ${pushedWeights} weights`
    )
  }
}
