import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { todayIso } from '../lib/date'
import {
  computeMuscleSorenessDecay,
  BJJ_MUSCLE_ACTIVATIONS,
  MUSCLE_LABELS,
  DEFAULT_LAMBDA,
  type DecayInput,
  type MuscleGroup,
} from '../data/muscleMap'
import { MUSCLE_STRETCHES } from '../data/recovery'
import { ALL_EXERCISES, type ExerciseItem } from '../data/exercises'

export interface SmartRecovery {
  exercises: ExerciseItem[]
  label: string
  muscleChips: string[]
  source: 'bjj' | 'calisthenics' | 'mixed' | 'none'
}

const FALLBACK_IDS = ['pelvic_clock', 'cat_cow', 'lat_hang_bjj', 'childs_pose_lat']

const FALLBACK: SmartRecovery = {
  exercises: FALLBACK_IDS.map((id) => ALL_EXERCISES[id]).filter(Boolean),
  label: 'General recovery',
  muscleChips: [],
  source: 'none',
}

const LOADING: SmartRecovery = {
  exercises: [],
  label: 'Loading…',
  muscleChips: [],
  source: 'none',
}

export function useSmartRecovery(): SmartRecovery {
  const today = todayIso()
  const now = new Date()

  const cutoff48h = new Date(now.getTime() - 48 * 3600000).toISOString().split('T')[0]
  const cutoff24h = new Date(now.getTime() - 24 * 3600000).toISOString().split('T')[0]

  const calisthenicsLogs = useLiveQuery(
    () => db.calisthenicsLogs.where('date').between(cutoff48h, today, true, true).toArray(),
    [cutoff48h, today],
    null
  )

  const bjjLogs = useLiveQuery(
    () => db.bjjLogs.where('date').between(cutoff24h, today, true, true).toArray(),
    [cutoff24h, today],
    null
  )

  if (calisthenicsLogs === null || bjjLogs === null) return LOADING

  const nowMs = now.getTime()
  const hasCalisthenics = calisthenicsLogs.length > 0
  const attendedBjjLogs = bjjLogs.filter((l) => l.attended)
  const hasAttendedBjj = attendedBjjLogs.length > 0

  // Build decay inputs from calisthenics logs
  const decayInputs: DecayInput[] = calisthenicsLogs.map((log) => ({
    exerciseId: log.exerciseId,
    value: log.value,
    loggedAt: new Date(log.date + 'T12:00:00').getTime(),
  }))

  // Run decay model on calisthenics
  let muscleSoreness = computeMuscleSorenessDecay(decayInputs, nowMs)

  // Add BJJ contribution from the most recent attended class
  if (hasAttendedBjj) {
    const latestBjj = attendedBjjLogs.sort((a, b) => b.date.localeCompare(a.date))[0]
    const bjjMs = new Date(latestBjj.date + 'T12:00:00').getTime()
    const elapsedHours = Math.max(0, (nowMs - bjjMs) / 3600000)
    for (const activation of BJJ_MUSCLE_ACTIVATIONS) {
      const peakLoad = activation.level === 'primary' ? 80 : 40
      const contribution = peakLoad * Math.exp(-DEFAULT_LAMBDA * elapsedHours)
      const entry = muscleSoreness.find((m) => m.muscle === activation.muscle)
      if (entry) {
        entry.soreness = Math.min(100, Math.round(entry.soreness + contribution))
      }
    }
  }

  // Filter sore muscles above threshold, sort by soreness descending
  const soreMuscles = muscleSoreness
    .filter((m) => m.soreness > 10)
    .sort((a, b) => b.soreness - a.soreness)
    .map((m) => m.muscle as MuscleGroup)

  if (soreMuscles.length === 0) return FALLBACK

  // Map muscles to exercise IDs, deduplicate, cap at 6
  const seen = new Set<string>()
  const exerciseIds: string[] = []
  outer: for (const muscle of soreMuscles) {
    for (const id of MUSCLE_STRETCHES[muscle] ?? []) {
      if (!seen.has(id)) {
        seen.add(id)
        exerciseIds.push(id)
        if (exerciseIds.length >= 6) break outer
      }
    }
  }

  const exercises = exerciseIds.map((id) => ALL_EXERCISES[id]).filter(Boolean)
  if (exercises.length === 0) return FALLBACK

  const muscleChips = soreMuscles.slice(0, 3).map((m) => MUSCLE_LABELS[m])

  const source: SmartRecovery['source'] =
    hasAttendedBjj && hasCalisthenics ? 'mixed' :
    hasAttendedBjj ? 'bjj' :
    hasCalisthenics ? 'calisthenics' :
    'none'

  const label =
    source === 'bjj'          ? 'Post-BJJ recovery' :
    source === 'calisthenics' ? 'Post-training recovery' :
    source === 'mixed'        ? 'Mixed recovery' :
    'General recovery'

  return { exercises, label, muscleChips, source }
}
