import { db as dexieDb, type SessionType, type CalisthenicsExerciseId, type BodySite, type SessionDuration, type SportDurations, type MobilityGoal, type AvatarVariant, type ProfileAvatar } from '../../db/db'
import { normalizeCreatedAt } from './helpers'
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

function mapWorkoutTypeToSessionType(workoutType: 'calisthenics' | 'bjj' | 'mobility'): SessionType {
  if (workoutType === 'calisthenics') return 'calisthenics'
  if (workoutType === 'bjj') return 'bjj'
  return 'morning'
}

export async function syncFirestoreToLocal(workouts: WorkoutDoc[]): Promise<void> {
  for (const workout of workouts) {
    try {
      if (!workout.date) continue

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

export async function syncBjjClassLogsToLocal(logs: BjjClassLogDoc[]): Promise<void> {
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

export async function syncCalisthenicsLogsToLocal(logs: CalisthenicsLogDoc[]): Promise<void> {
  for (const log of logs) {
    try {
      if (!log.date || !log.exerciseId || log.value == null) continue
      const createdAt = normalizeCreatedAt(log.createdAt, log.date)

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
      console.error('[syncCalisthenicsLogsToLocal] Failed to sync individual log:', log.date, err)
    }
  }
}

export async function syncRunningLogsToLocal(logs: RunningLogDoc[]): Promise<void> {
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

export async function syncHealthMetricsToLocal(docs: HealthMetricsDoc[]): Promise<void> {
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
          source: entry.source as 'manual' | 'garmin' | undefined,
          createdAt,
        })
      }
    } catch (err) {
      console.error('[syncHealthMetricsToLocal] Failed to sync entry:', entry.date, err)
    }
  }
}

export async function syncBodyMeasurementsToLocal(docs: BodyMeasurementDoc[]): Promise<void> {
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

export async function syncPreferencesToLocal(remote: PreferencesDoc): Promise<void> {
  const local = await dexieDb.preferences.get(1)
  const localUpdated = (local as any)?.updatedAt ?? 0
  if (remote.updatedAt > localUpdated) {
    await dexieDb.preferences.put({
      id: 1,
      bjjDays: remote.bjjDays,
      sessionDuration: remote.sessionDuration as SessionDuration,
      sportDurations: (remote.sportDurations ?? { mobility: 10, calisthenics: 20, running: 30, bjj: 20, elite_forces: 20 }) as SportDurations,
      goal: remote.goal as MobilityGoal,
      darkMode: remote.darkMode,
      weeklyGoalDays: remote.weeklyGoalDays,
      soundEnabled: remote.soundEnabled,
      avatarVariant: remote.avatarVariant as AvatarVariant,
      availableEquipment: remote.availableEquipment ?? ['pull_up_bar', 'parallel_bars', 'parallettes'],
      activeSports: remote.activeSports ?? ['mobility', 'bjj', 'calisthenics', 'running', 'elite_forces'],
      weightKg: remote.weightKg ?? null,
      profileAvatar: ((remote as any).profileAvatar as ProfileAvatar) ?? null,
    })
  }
}

export async function syncBjjSkillTagsToLocal(remoteTags: BjjSkillTagDoc[]): Promise<void> {
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

export async function syncCustomExercisesToLocal(remoteExercises: CustomExerciseDoc[], userId: string): Promise<void> {
  const { customExerciseId } = await import('../../db/db')
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
        category: remote.category as 'push' | 'pull' | 'legs' | 'core' | undefined,
        bodyArea: remote.bodyArea,
        isGlobal: remote.isGlobal,
        createdAt: remote.createdAt,
        updatedAt: remote.updatedAt,
      })
    }
  }
}

export async function syncHoldLogsToLocal(docs: HoldLogDoc[]): Promise<void> {
  for (const entry of docs) {
    try {
      if (!entry.date || !entry.exerciseKey) continue
      const createdAt = normalizeCreatedAt(entry.createdAt, entry.date)

      const existing = await dexieDb.holdLogs
        .where('date')
        .equals(entry.date)
        .filter((l) => l.exerciseKey === entry.exerciseKey && l.createdAt === createdAt)
        .first()

      if (!existing) {
        await dexieDb.holdLogs.add({
          date: entry.date,
          exerciseKey: entry.exerciseKey as import('../../db/db').ProgressionKey,
          phase: (entry.phase || 1) as 1 | 2 | 3 | 4,
          plannedSec: entry.plannedSec ?? 0,
          actualSec: entry.actualSec ?? 0,
          createdAt,
        })
      }
    } catch (err) {
      console.error('[syncHoldLogsToLocal] Failed to sync entry:', entry.date, entry.exerciseKey, err)
    }
  }
}

export async function syncWeightLogsToLocal(docs: WeightLogDoc[]): Promise<void> {
  for (const entry of docs) {
    try {
      if (!entry.date || entry.weightKg == null) continue
      const createdAt = normalizeCreatedAt(entry.createdAt, entry.date)

      const existing = await dexieDb.weightLogs
        .where('date')
        .equals(entry.date)
        .filter((l) => l.createdAt === createdAt)
        .first()

      if (!existing) {
        await dexieDb.weightLogs.add({
          date: entry.date,
          weightKg: entry.weightKg,
          createdAt,
        })
      }
    } catch (err) {
      console.error('[syncWeightLogsToLocal] Failed to sync entry:', entry.date, err)
    }
  }
}
