import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CalisthenicsExerciseId, type CalisthenicsMetric } from '../db/db'
import { todayIso } from '../lib/date'
import { upsertTodaySession } from './useSessions'
import { getExerciseDef, estimateCalisthenicsduration, DEPRECATED_EXERCISE_MAP } from '../data/calisthenics'
import { usePreferences } from './usePreferences'
import { syncCalisthenicsLogToFirebase } from '../lib/firebase-workout-sync'

export async function logCalisthenicsBase(params: {
  exerciseId: CalisthenicsExerciseId
  metric: CalisthenicsMetric
  value: number
  sets?: number
  notes?: string
  date?: string
  restSeconds?: number // override default 30s per-user preference
}) {
  const date = params.date || todayIso()
  const id = await db.calisthenicsLogs.add({
    date,
    exerciseId: params.exerciseId,
    metric: params.metric,
    value: params.value,
    sets: params.sets,
    notes: params.notes,
    createdAt: new Date().toISOString()
  })
  const savedLog = await db.calisthenicsLogs.get(id)
  if (savedLog) {
    syncCalisthenicsLogToFirebase(savedLog).catch((err) => {
      console.error('[logCalisthenicsBase] Failed to sync to Firestore:', err)
    })
  }

  // Estimate duration based on exercise type and reps/sets
  const estimatedSec = estimateCalisthenicsduration(
    params.exerciseId,
    params.value,
    params.sets,
    params.restSeconds ?? 30
  )

  const def = getExerciseDef(params.exerciseId)
  await upsertTodaySession({
    type: 'calisthenics',
    label: def?.name ?? 'Calisthenics',
    plannedSec: estimatedSec,
    actualSec: estimatedSec, // assume completed as planned
    exerciseIds: [params.exerciseId]
  })

  return id
}

export function useCalisthenics() {
  const logsData = useCalisthenicsLogs()

  const logCalisthenics = async (params: {
    exerciseId: CalisthenicsExerciseId
    metric: CalisthenicsMetric
    value: number
    sets?: number
    notes?: string
    date?: string
  }) => {
    return logCalisthenicsBase(params)
  }

  const deleteCalisthenics = async (id: number) => {
    return db.calisthenicsLogs.delete(id)
  }

  const updateCalisthenics = async (
    id: number,
    params: {
      exerciseId?: CalisthenicsExerciseId
      metric?: CalisthenicsMetric
      value?: number
      date?: string
    }
  ) => {
    const log = logsData?.find((l) => l.id === id)
    if (!log) throw new Error('Log not found')

    await db.calisthenicsLogs.update(id, {
      exerciseId: params.exerciseId ?? log.exerciseId,
      metric: params.metric ?? log.metric,
      value: params.value ?? log.value,
      date: params.date ?? log.date,
    })
  }

  return { logs: logsData, logCalisthenics, deleteCalisthenics, updateCalisthenics }
}

export function useCalisthenicsLogs(exerciseId?: CalisthenicsExerciseId) {
  return useLiveQuery(async () => {
    const all = await db.calisthenicsLogs.orderBy('date').toArray()
    const remapped = all.map((log) => {
      const canonical = DEPRECATED_EXERCISE_MAP[log.exerciseId]
      return canonical ? { ...log, exerciseId: canonical } : log
    })
    return exerciseId ? remapped.filter((l) => l.exerciseId === exerciseId) : remapped
  }, [exerciseId], [])
}

export function useTodayCalisthenicsLogs() {
  const today = todayIso()
  return useLiveQuery(
    async () => {
      const logs = await db.calisthenicsLogs.where('date').equals(today).toArray()
      return logs.map((log) => {
        const canonical = DEPRECATED_EXERCISE_MAP[log.exerciseId]
        return canonical ? { ...log, exerciseId: canonical } : log
      })
    },
    [today],
    []
  )
}

/** Best (max) value ever logged for a given exercise. */
export function useBestValue(exerciseId: CalisthenicsExerciseId) {
  const logs = useCalisthenicsLogs(exerciseId)
  if (!logs || logs.length === 0) return undefined
  return logs.reduce((max, l) => Math.max(max, l.value), 0)
}

/** Returns a Map of exerciseId → log count, sorted descending. */
export function useExerciseFrequency(): Map<CalisthenicsExerciseId, number> {
  const logs = useCalisthenicsLogs()
  const freq = new Map<CalisthenicsExerciseId, number>()
  if (!logs) return freq
  for (const log of logs) {
    freq.set(log.exerciseId, (freq.get(log.exerciseId) ?? 0) + 1)
  }
  return freq
}
