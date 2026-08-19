import { MOBILITY_EXERCISES, type MobilityExercise } from '../data/mobilityExercises'
import type { CompletedSession } from '../db/db'

export interface MobilitySessionExercise {
  id: string
  name: string
  icon: string
  holdSec: number
  sets: number
  category: string
}

export interface GeneratedMobilitySession {
  exercises: MobilitySessionExercise[]
  totalDurationMin: number
  focus: string
}

type MobilityCategory = 'hip' | 'spine' | 'shoulder' | 'full_body'

const CATEGORY_LABELS: Record<MobilityCategory, string> = {
  hip: 'Hips',
  spine: 'Spine',
  shoulder: 'Shoulders',
  full_body: 'Full Body',
}

export function generateMobilitySession(
  sessions: CompletedSession[],
  seed?: number
): GeneratedMobilitySession {
  const now = Date.now()

  // Find which categories were trained recently (last 48h)
  const recentSessions = sessions.filter((s) => {
    const t = new Date(s.date).getTime()
    return now - t < 48 * 3600000
  })

  const recentExerciseIds = new Set(
    recentSessions.flatMap((s) => s.exerciseIds ?? [])
  )

  // Rank categories: least recently trained first
  const lastTrainedPerCat = new Map<MobilityCategory, number>()
  for (const sess of sessions) {
    if (!sess.exerciseIds) continue
    for (const exId of sess.exerciseIds) {
      const ex = MOBILITY_EXERCISES.find((e) => e.id === exId)
      if (!ex) continue
      const t = new Date(sess.date).getTime()
      const existing = lastTrainedPerCat.get(ex.category) ?? 0
      if (t > existing) lastTrainedPerCat.set(ex.category, t)
    }
  }

  const categories: MobilityCategory[] = ['hip', 'spine', 'shoulder', 'full_body']
  const ranked = [...categories].sort((a, b) => {
    const tA = lastTrainedPerCat.get(a) ?? 0
    const tB = lastTrainedPerCat.get(b) ?? 0
    return tA - tB
  })

  // Select 4-6 exercises: prioritize untrained categories, avoid recently done exercises
  const selected: MobilitySessionExercise[] = []
  const usedCategories = new Map<MobilityCategory, number>()

  // First pass: one exercise per category
  for (const cat of ranked) {
    if (selected.length >= 6) break
    const exercise = pickMobilityExercise(cat, recentExerciseIds, selected, seed)
    if (exercise) {
      selected.push(exercise)
      usedCategories.set(cat, (usedCategories.get(cat) ?? 0) + 1)
    }
  }

  // Second pass: fill to 5-6 from weakest categories
  for (const cat of ranked) {
    if (selected.length >= 5) break
    if ((usedCategories.get(cat) ?? 0) >= 2) continue
    const exercise = pickMobilityExercise(cat, recentExerciseIds, selected, seed ? seed + 7 : undefined)
    if (exercise) {
      selected.push(exercise)
      usedCategories.set(cat, (usedCategories.get(cat) ?? 0) + 1)
    }
  }

  // Compute total duration
  const totalSec = selected.reduce((sum, ex) => {
    return sum + ex.holdSec * ex.sets + 30 * Math.max(0, ex.sets - 1)
  }, 0)
  const totalDurationMin = Math.max(5, Math.round(totalSec / 60))

  // Focus label: top 2 categories
  const catCounts = new Map<MobilityCategory, number>()
  for (const ex of selected) {
    const cat = ex.category as MobilityCategory
    catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1)
  }
  const topCats = [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([cat]) => CATEGORY_LABELS[cat])
  const focus = topCats.join(' + ') + ' focus'

  return { exercises: selected, totalDurationMin, focus }
}

function pickMobilityExercise(
  category: MobilityCategory,
  recentExerciseIds: Set<string>,
  alreadySelected: MobilitySessionExercise[],
  seed?: number
): MobilitySessionExercise | null {
  const alreadyIds = new Set(alreadySelected.map((e) => e.id))

  const candidates = MOBILITY_EXERCISES
    .filter((e) => e.category === category && !alreadyIds.has(e.id))
    .map((e) => ({
      exercise: e,
      priority: recentExerciseIds.has(e.id) ? 1 : 3,
    }))

  if (candidates.length === 0) return null

  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    if (seed != null) {
      return simpleHash(a.exercise.id + seed) - simpleHash(b.exercise.id + seed)
    }
    return 0
  })

  const chosen = candidates[0].exercise
  const sets = chosen.sides ? 2 : 1

  return {
    id: chosen.id,
    name: chosen.name,
    icon: chosen.icon,
    holdSec: chosen.defaultHoldSec,
    sets,
    category: chosen.category,
  }
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return hash
}
