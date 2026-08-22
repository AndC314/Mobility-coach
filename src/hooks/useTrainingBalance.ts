import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { EXERCISE_MUSCLES, type MuscleGroup } from '../data/muscleMap'
import { getExerciseDef } from '../data/calisthenics'

export type BalanceCategory = 'push' | 'pull' | 'legs' | 'core' | 'grappling' | 'mobility'

export interface CategoryVolume {
  category: BalanceCategory
  label: string
  sets: number
  sessions: number
  percent: number
  color: string
}

export interface Imbalance {
  weak: BalanceCategory
  strong: BalanceCategory
  ratio: number
}

export interface TrainingBalance {
  categories: CategoryVolume[]
  imbalances: Imbalance[]
  totalSets: number
  weeksAnalyzed: number
}

const CATEGORY_META: Record<BalanceCategory, { label: string; color: string }> = {
  push: { label: 'Push', color: '#3b82f6' },
  pull: { label: 'Pull', color: '#10b981' },
  legs: { label: 'Legs', color: '#f59e0b' },
  core: { label: 'Core', color: '#8b5cf6' },
  grappling: { label: 'Grappling', color: '#2ec4b6' },
  mobility: { label: 'Mobility', color: '#a78bfa' },
}

const EXERCISE_CATEGORY_MAP: Record<string, BalanceCategory> = {}

function getCategory(exerciseId: string): BalanceCategory | null {
  if (EXERCISE_CATEGORY_MAP[exerciseId]) return EXERCISE_CATEGORY_MAP[exerciseId]
  const def = getExerciseDef(exerciseId as any)
  if (!def) return null
  const cat = def.category as string
  if (cat === 'push' || cat === 'pull' || cat === 'legs' || cat === 'core') {
    EXERCISE_CATEGORY_MAP[exerciseId] = cat
    return cat
  }
  if (cat === 'mobility') {
    EXERCISE_CATEGORY_MAP[exerciseId] = 'mobility'
    return 'mobility'
  }
  return null
}

export function useTrainingBalance(weeks = 4): TrainingBalance | null {
  const calLogs = useLiveQuery(() => db.calisthenicsLogs.toArray(), [], null)
  const bjjLogs = useLiveQuery(() => db.bjjClassLogs.toArray(), [], null)
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], null)

  if (!calLogs || !bjjLogs || !sessions) return null

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - weeks * 7)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const counts: Record<BalanceCategory, { sets: number; days: Set<string> }> = {
    push: { sets: 0, days: new Set() },
    pull: { sets: 0, days: new Set() },
    legs: { sets: 0, days: new Set() },
    core: { sets: 0, days: new Set() },
    grappling: { sets: 0, days: new Set() },
    mobility: { sets: 0, days: new Set() },
  }

  for (const log of calLogs) {
    if (log.date < cutoffStr) continue
    const cat = getCategory(log.exerciseId)
    if (cat) {
      counts[cat].sets += log.sets ?? 1
      counts[cat].days.add(log.date)
    }
  }

  for (const log of bjjLogs) {
    if (log.date < cutoffStr) continue
    counts.grappling.sets += 10
    counts.grappling.days.add(log.date)
  }

  const MOBILITY_TYPES = new Set(['morning', 'bjj_release', 'hip_mobility', 'pancake', 'pike', 'ninety_ninety', 'recovery'])
  for (const sess of sessions) {
    if (sess.date < cutoffStr) continue
    if (MOBILITY_TYPES.has(sess.type)) {
      counts.mobility.sets += 5
      counts.mobility.days.add(sess.date)
    }
  }

  const totalSets = Object.values(counts).reduce((s, c) => s + c.sets, 0)

  const categories: CategoryVolume[] = (['push', 'pull', 'legs', 'core', 'grappling', 'mobility'] as BalanceCategory[]).map((cat) => ({
    category: cat,
    label: CATEGORY_META[cat].label,
    sets: counts[cat].sets,
    sessions: counts[cat].days.size,
    percent: totalSets > 0 ? Math.round((counts[cat].sets / totalSets) * 100) : 0,
    color: CATEGORY_META[cat].color,
  }))

  // Detect imbalances: push:pull or legs:upper ratio significantly off
  const imbalances: Imbalance[] = []
  const pushSets = counts.push.sets
  const pullSets = counts.pull.sets

  if (pushSets > 0 && pullSets > 0) {
    const ratio = pushSets / pullSets
    if (ratio > 2) imbalances.push({ weak: 'pull', strong: 'push', ratio })
    else if (ratio < 0.5) imbalances.push({ weak: 'push', strong: 'pull', ratio: 1 / ratio })
  } else if (pushSets > 10 && pullSets === 0) {
    imbalances.push({ weak: 'pull', strong: 'push', ratio: Infinity })
  } else if (pullSets > 10 && pushSets === 0) {
    imbalances.push({ weak: 'push', strong: 'pull', ratio: Infinity })
  }

  const upperSets = pushSets + pullSets
  const legSets = counts.legs.sets
  if (upperSets > 0 && legSets > 0) {
    const ratio = upperSets / legSets
    if (ratio > 3) imbalances.push({ weak: 'legs', strong: 'push', ratio })
  } else if (upperSets > 15 && legSets === 0) {
    imbalances.push({ weak: 'legs', strong: 'push', ratio: Infinity })
  }

  return { categories, imbalances, totalSets, weeksAnalyzed: weeks }
}
