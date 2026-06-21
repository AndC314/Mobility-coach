import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CalisthenicsExerciseId } from '../db/db'
import { EXERCISE_MUSCLES, MUSCLE_CATEGORY } from '../data/muscleMap'

// ─────────────────────────────────────────────────────────────────────────
// AVATAR STATS — 5-Axis Development Profile
//
// Computes a normalized 0-100 score for each axis based on logged data:
//  1. Push Strength — from push-category calisthenics nodes
//  2. Pull Strength — from pull-category calisthenics nodes
//  3. Static Core — from isometric hold durations (plank, hollow body, L-sit)
//  4. Mobility/Flexibility — from completed mobility sessions
//  5. Grappling Volume — from logged BJJ mat hours
// ─────────────────────────────────────────────────────────────────────────

export interface AvatarAxis {
  key: 'push' | 'pull' | 'core' | 'mobility' | 'grappling'
  label: string
  value: number // 0-100
  raw: number
  unit: string
}

export interface AvatarStats {
  axes: AvatarAxis[]
  overallLevel: number // 0-100 average
  milestones: AvatarMilestone[]
}

export interface AvatarMilestone {
  id: string
  label: string
  unlocked: boolean
  tier: 'beginner' | 'intermediate' | 'advanced'
}

const PUSH_EXERCISES: CalisthenicsExerciseId[] = ['pushups', 'dips']
const PULL_EXERCISES: CalisthenicsExerciseId[] = ['pullups', 'australian_pullups']
const CORE_HOLDS: CalisthenicsExerciseId[] = ['plank', 'hollow_body']

// Normalization thresholds (value at which the axis hits 100)
const PUSH_CAP = 40 // 40 pushups or 15 dips (best)
const PULL_CAP = 15 // 15 pullups or 20 australian
const CORE_CAP = 120 // 120s best hold
const MOBILITY_CAP = 60 // 60 completed sessions
const GRAPPLING_CAP = 50 // 50 logged BJJ classes

function normalize(value: number, cap: number): number {
  return Math.min(100, Math.round((value / cap) * 100))
}

export function useAvatarStats(): AvatarStats | null {
  return useLiveQuery(async () => {
    const [calLogs, sessions, bjjLogs, measurements, holdLogs] = await Promise.all([
      db.calisthenicsLogs.toArray(),
      db.sessions.toArray(),
      db.bjjClassLogs.toArray(),
      db.measurements.toArray(),
      db.holdLogs.toArray()
    ])

    // ── Push Strength ──────────────────────────────────────────────────
    const pushBest = PUSH_EXERCISES.reduce((max, id) => {
      const best = calLogs
        .filter((l) => l.exerciseId === id)
        .reduce((m, l) => Math.max(m, l.value), 0)
      return Math.max(max, best)
    }, 0)
    const pushValue = normalize(pushBest, PUSH_CAP)

    // ── Pull Strength ──────────────────────────────────────────────────
    const pullBest = PULL_EXERCISES.reduce((max, id) => {
      const best = calLogs
        .filter((l) => l.exerciseId === id)
        .reduce((m, l) => Math.max(m, l.value), 0)
      return Math.max(max, best)
    }, 0)
    // Also check measurements table for pullups
    const pullupMeasurement = measurements
      .filter((m) => m.type === 'pullups')
      .reduce((max, m) => Math.max(max, m.value), 0)
    const pullValue = normalize(Math.max(pullBest, pullupMeasurement), PULL_CAP)

    // ── Static Core ────────────────────────────────────────────────────
    const coreBest = CORE_HOLDS.reduce((max, id) => {
      const best = calLogs
        .filter((l) => l.exerciseId === id && l.metric === 'hold_sec')
        .reduce((m, l) => Math.max(m, l.value), 0)
      return Math.max(max, best)
    }, 0)
    // Also include L-sit from measurements
    const lsitBest = measurements
      .filter((m) => m.type === 'lsit_hold')
      .reduce((max, m) => Math.max(max, m.value), 0)
    const coreValue = normalize(Math.max(coreBest, lsitBest), CORE_CAP)

    // ── Mobility / Flexibility ─────────────────────────────────────────
    const mobilitySessions = sessions.filter(
      (s) => s.type !== 'calisthenics' && s.type !== 'custom'
    ).length
    const mobilityValue = normalize(mobilitySessions, MOBILITY_CAP)

    // ── Grappling Volume ───────────────────────────────────────────────
    const grapplingClasses = bjjLogs.length
    const grapplingValue = normalize(grapplingClasses, GRAPPLING_CAP)

    const axes: AvatarAxis[] = [
      { key: 'push', label: 'Push Strength', value: pushValue, raw: pushBest, unit: 'reps' },
      { key: 'pull', label: 'Pull Strength', value: pullValue, raw: Math.max(pullBest, pullupMeasurement), unit: 'reps' },
      { key: 'core', label: 'Static Core', value: coreValue, raw: Math.max(coreBest, lsitBest), unit: 's' },
      { key: 'mobility', label: 'Mobility', value: mobilityValue, raw: mobilitySessions, unit: 'sessions' },
      { key: 'grappling', label: 'Grappling', value: grapplingValue, raw: grapplingClasses, unit: 'classes' }
    ]

    const overallLevel = Math.round(axes.reduce((s, a) => s + a.value, 0) / axes.length)

    // ── Milestones (drive avatar visual state) ─────────────────────────
    const milestones: AvatarMilestone[] = [
      {
        id: 'push_basic',
        label: 'Floor Push-ups Unlocked',
        unlocked: pushBest >= 8,
        tier: 'beginner'
      },
      {
        id: 'push_intermediate',
        label: 'Dips Unlocked',
        unlocked: calLogs.some((l) => l.exerciseId === 'dips' && l.value >= 6),
        tier: 'intermediate'
      },
      {
        id: 'pull_basic',
        label: 'First Pull-up',
        unlocked: Math.max(pullBest, pullupMeasurement) >= 1,
        tier: 'beginner'
      },
      {
        id: 'pull_intermediate',
        label: 'Pull-up Strength (6+)',
        unlocked: Math.max(pullBest, pullupMeasurement) >= 6,
        tier: 'intermediate'
      },
      {
        id: 'core_hollow',
        label: 'Hollow Body 30s',
        unlocked: calLogs.some((l) => l.exerciseId === 'hollow_body' && l.value >= 30),
        tier: 'beginner'
      },
      {
        id: 'core_lsit',
        label: 'L-sit 10s',
        unlocked: lsitBest >= 10,
        tier: 'intermediate'
      },
      {
        id: 'core_advanced',
        label: 'L-sit 20s / Dragon Flag',
        unlocked: lsitBest >= 20 || measurements.some((m) => m.type === 'dragon_flag_negatives' && m.value >= 5),
        tier: 'advanced'
      },
      {
        id: 'mobility_consistent',
        label: '20 Mobility Sessions',
        unlocked: mobilitySessions >= 20,
        tier: 'beginner'
      },
      {
        id: 'mobility_dedicated',
        label: '40 Mobility Sessions',
        unlocked: mobilitySessions >= 40,
        tier: 'intermediate'
      },
      {
        id: 'grappling_white',
        label: '10 BJJ Classes',
        unlocked: grapplingClasses >= 10,
        tier: 'beginner'
      },
      {
        id: 'grappling_consistent',
        label: '30 BJJ Classes',
        unlocked: grapplingClasses >= 30,
        tier: 'intermediate'
      },
      {
        id: 'grappling_dedicated',
        label: '50 BJJ Classes',
        unlocked: grapplingClasses >= 50,
        tier: 'advanced'
      }
    ]

    return { axes, overallLevel, milestones }
  }, [], null)
}
