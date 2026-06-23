import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CalisthenicsExerciseId, type CalisthenicsMetric } from '../db/db'
import { todayIso } from '../lib/date'
import { upsertTodaySession } from './useSessions'
import { getExerciseDef } from '../data/calisthenics'

export async function logCalisthenicsBase(params: {
  exerciseId: CalisthenicsExerciseId
  metric: CalisthenicsMetric
  value: number
  sets?: number
  notes?: string
  date?: string
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

  // Also reflect into the daily session log so it shows up in Logs/streaks,
  // same way BJJ and mobility sessions do. Calisthenics doesn't have a
  // natural "planned duration", so treat the act of logging as 100% done
  // with a nominal 1-minute planned/actual duration.
  const def = getExerciseDef(params.exerciseId)
  await upsertTodaySession({
    type: 'calisthenics',
    label: `${def?.name ?? 'Calisthenics'} logged`,
    plannedSec: 60,
    actualSec: 60,
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
    return exerciseId ? all.filter((l) => l.exerciseId === exerciseId) : all
  }, [exerciseId], [])
}

export function useTodayCalisthenicsLogs() {
  const today = todayIso()
  return useLiveQuery(
    () => db.calisthenicsLogs.where('date').equals(today).toArray(),
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
