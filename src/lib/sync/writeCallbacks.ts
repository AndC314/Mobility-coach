import type { CompletedSession, BjjClassLog, CalisthenicsLog, RunningLog, HealthMetrics, BodyMeasurementLog, HoldLog, WeightLog } from '../../db/db'
import type { WorkoutDoc, BjjClassLogDoc, CalisthenicsLogDoc, RunningLogDoc, HealthMetricsDoc, BodyMeasurementDoc, HoldLogDoc, WeightLogDoc } from './types'

type AddWorkoutFn = (workout: Omit<WorkoutDoc, 'id'>) => Promise<string>
type AddBjjClassLogFn = (log: Omit<BjjClassLogDoc, 'id'>) => Promise<string>
type AddCalisthenicsLogFn = (log: Omit<CalisthenicsLogDoc, 'id'>) => Promise<string>
type AddRunningLogFn = (log: Omit<RunningLogDoc, 'id'>) => Promise<string>
type AddHealthMetricsFn = (doc: Omit<HealthMetricsDoc, 'id'>) => Promise<string>
type AddBodyMeasurementFn = (doc: Omit<BodyMeasurementDoc, 'id'>) => Promise<string>
type AddHoldLogFn = (doc: Omit<HoldLogDoc, 'id'>) => Promise<string>
type AddWeightLogFn = (doc: Omit<WeightLogDoc, 'id'>) => Promise<string>

let globalAddWorkout: AddWorkoutFn | null = null
let globalAddBjjClassLog: AddBjjClassLogFn | null = null
let globalAddCalisthenicsLog: AddCalisthenicsLogFn | null = null
let globalAddRunningLog: AddRunningLogFn | null = null
let globalAddHealthMetrics: AddHealthMetricsFn | null = null
let globalAddBodyMeasurement: AddBodyMeasurementFn | null = null
let globalAddHoldLog: AddHoldLogFn | null = null
let globalAddWeightLog: AddWeightLogFn | null = null

export function setFirebaseSyncCallback(callback: AddWorkoutFn | null) {
  globalAddWorkout = callback
}
export function setBjjClassLogSyncCallback(callback: AddBjjClassLogFn | null) {
  globalAddBjjClassLog = callback
}
export function setCalisthenicsLogSyncCallback(callback: AddCalisthenicsLogFn | null) {
  globalAddCalisthenicsLog = callback
}
export function setRunningLogSyncCallback(callback: AddRunningLogFn | null) {
  globalAddRunningLog = callback
}
export function setHealthMetricsSyncCallback(callback: AddHealthMetricsFn | null) {
  globalAddHealthMetrics = callback
}
export function setBodyMeasurementSyncCallback(callback: AddBodyMeasurementFn | null) {
  globalAddBodyMeasurement = callback
}
export function setHoldLogSyncCallback(callback: AddHoldLogFn | null) {
  globalAddHoldLog = callback
}
export function setWeightLogSyncCallback(callback: AddWeightLogFn | null) {
  globalAddWeightLog = callback
}

export function getFirebaseSyncCallback() {
  return globalAddWorkout
}

function mapSessionTypeToWorkoutType(sessionType: string): 'calisthenics' | 'bjj' | 'mobility' {
  if (sessionType === 'calisthenics') return 'calisthenics'
  if (sessionType === 'bjj' || sessionType === 'bjj_release' || sessionType === 'recovery') return 'bjj'
  return 'mobility'
}

export function sessionToWorkoutDoc(session: CompletedSession): Omit<WorkoutDoc, 'id'> {
  const now = new Date(session.createdAt).getTime()
  return {
    type: mapSessionTypeToWorkoutType(session.type),
    originalType: session.type,
    date: session.date,
    createdAt: now,
    updatedAt: now,
    exerciseIds: session.exerciseIds,
    data: {},
    plannedSec: session.plannedSec,
    actualSec: session.actualSec,
    label: session.label,
  }
}

export async function syncSessionToFirebase(session: CompletedSession) {
  if (!globalAddWorkout) {
    console.warn('[Firebase Sync] No callback set; skipping session sync', session.date)
    return
  }
  try {
    const workoutDoc = sessionToWorkoutDoc(session)
    const docId = await globalAddWorkout(workoutDoc)
    console.debug('[Firebase Sync] Session synced:', docId, session.date)
    return docId
  } catch (err) {
    console.error('[Firebase Sync] Failed to sync session:', err)
  }
}

export async function syncBjjClassLogToFirebase(log: BjjClassLog) {
  if (!globalAddBjjClassLog) return
  try {
    await globalAddBjjClassLog({
      date: log.date,
      className: log.className,
      theme: log.theme,
      tagIds: log.tagIds,
      technicalMins: log.technicalMins,
      sparringMins: log.sparringMins,
      notes: log.notes,
      createdAt: log.createdAt,
    })
  } catch (err) {
    console.error('[Firebase Sync] Failed to sync BJJ class log:', err)
  }
}

export async function syncCalisthenicsLogToFirebase(log: CalisthenicsLog) {
  if (!globalAddCalisthenicsLog) return
  try {
    await globalAddCalisthenicsLog({
      date: log.date,
      exerciseId: log.exerciseId,
      metric: log.metric,
      value: log.value,
      sets: log.sets,
      notes: log.notes,
      createdAt: log.createdAt,
    })
  } catch (err) {
    console.error('[Firebase Sync] Failed to sync calisthenics log:', err)
  }
}

export async function syncRunningLogToFirebase(log: RunningLog) {
  if (!globalAddRunningLog) return
  try {
    await globalAddRunningLog({
      date: log.date,
      distanceKm: log.distanceKm,
      durationSec: log.durationSec,
      notes: log.notes,
      createdAt: log.createdAt,
    })
  } catch (err) {
    console.error('[Firebase Sync] Failed to sync running log:', err)
  }
}

export async function syncHealthMetricsToFirebase(entry: HealthMetrics) {
  if (!globalAddHealthMetrics) return
  try {
    const doc: Omit<HealthMetricsDoc, 'id'> = {
      date: entry.date,
      createdAt: entry.createdAt ?? new Date().toISOString(),
    }
    if (entry.sleepScore != null) doc.sleepScore = entry.sleepScore
    if (entry.sleepHours != null) doc.sleepHours = entry.sleepHours
    if (entry.hrv != null) doc.hrv = entry.hrv
    if (entry.restingHr != null) doc.restingHr = entry.restingHr
    if (entry.trainingReadiness != null) doc.trainingReadiness = entry.trainingReadiness
    if (entry.energy != null) doc.energy = entry.energy
    if (entry.mood != null) doc.mood = entry.mood
    if (entry.vo2max != null) doc.vo2max = entry.vo2max
    if (entry.notes != null) doc.notes = entry.notes
    if (entry.source != null) doc.source = entry.source
    await globalAddHealthMetrics(doc)
  } catch (err) {
    console.error('[Firebase Sync] Failed to sync health metrics:', err)
  }
}

export async function syncBodyMeasurementToFirebase(log: BodyMeasurementLog) {
  if (!globalAddBodyMeasurement) return
  try {
    await globalAddBodyMeasurement({
      date: log.date,
      site: log.site,
      valueCm: log.valueCm,
      createdAt: log.createdAt,
    })
  } catch (err) {
    console.error('[Firebase Sync] Failed to sync body measurement:', err)
  }
}

export async function syncHoldLogToFirebase(log: HoldLog) {
  if (!globalAddHoldLog) return
  try {
    await globalAddHoldLog({
      date: log.date,
      exerciseKey: log.exerciseKey,
      phase: log.phase,
      plannedSec: log.plannedSec,
      actualSec: log.actualSec,
      createdAt: log.createdAt,
    })
  } catch (err) {
    console.error('[Firebase Sync] Failed to sync hold log:', err)
  }
}

export async function syncWeightLogToFirebase(log: WeightLog) {
  if (!globalAddWeightLog) return
  try {
    await globalAddWeightLog({
      date: log.date,
      weightKg: log.weightKg,
      createdAt: log.createdAt,
    })
  } catch (err) {
    console.error('[Firebase Sync] Failed to sync weight log:', err)
  }
}
