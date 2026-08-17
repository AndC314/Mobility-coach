import type { CalisthenicsExerciseId, CalisthenicsLog } from '../db/db'
import {
  PROGRESSION_CHAINS,
  type ProgressionCategory,
  type ProgressionNode,
} from '../data/progressionChains'
import { CALISTHENICS_EXERCISES, estimateCalisthenicsduration } from '../data/calisthenics'
import {
  computeMuscleSorenessDecay,
  computeCategorySoreness,
  type DecayInput,
  type CategorySoreness,
} from '../data/muscleMap'

export interface SessionExercise {
  exerciseId: CalisthenicsExerciseId
  name: string
  targetValue: number
  targetSets: number
  unit: string
  reason: string
}

export interface GeneratedSession {
  exercises: SessionExercise[]
  totalDurationMin: number
  focus: string
}

export interface SessionGeneratorInput {
  logs: CalisthenicsLog[]
  bestMap: Map<CalisthenicsExerciseId, number>
  categoryScores: { category: ProgressionCategory; score: number }[]
  seed?: number
}

export function generateCalisthenicsSession(input: SessionGeneratorInput): GeneratedSession {
  const { logs, bestMap, categoryScores, seed } = input
  const now = Date.now()

  // Build soreness from recent logs (last 48h)
  const recentLogs = logs.filter((l) => {
    const logTime = new Date(l.date).getTime()
    return now - logTime < 48 * 3600000
  })

  const decayInputs: DecayInput[] = recentLogs.map((l) => ({
    exerciseId: l.exerciseId,
    value: l.value,
    loggedAt: l.createdAt ? new Date(l.createdAt).getTime() : new Date(l.date).getTime(),
  }))

  const muscleSoreness = computeMuscleSorenessDecay(decayInputs, now)
  const catSoreness = computeCategorySoreness(muscleSoreness)

  // Filter out categories with high soreness
  const availableCategories = (['push', 'pull', 'legs', 'core'] as ProgressionCategory[])
    .filter((cat) => {
      const s = catSoreness.find((cs) => cs.category === cat)
      return !s || !s.isRecovering
    })

  // If all categories are recovering, allow all (fallback)
  const categories = availableCategories.length >= 2 ? availableCategories : (['push', 'pull', 'legs', 'core'] as ProgressionCategory[])

  // Rank categories: weakest first, then least recently trained
  const lastTrainedMap = buildLastTrainedMap(logs)
  const ranked = [...categories].sort((a, b) => {
    const scoreA = categoryScores.find((s) => s.category === a)?.score ?? 50
    const scoreB = categoryScores.find((s) => s.category === b)?.score ?? 50
    if (scoreA !== scoreB) return scoreA - scoreB // weakest first

    const lastA = lastTrainedMap.get(a) ?? 0
    const lastB = lastTrainedMap.get(b) ?? 0
    return lastA - lastB // least recently trained first
  })

  // Select exercises: 4-6 total, max 2 per category
  const selected: SessionExercise[] = []
  const usedCategories = new Map<ProgressionCategory, number>()

  // First pass: one exercise per category (prioritize bottlenecks)
  for (const cat of ranked) {
    if (selected.length >= 6) break
    const exercise = pickExerciseForCategory(cat, bestMap, selected, seed)
    if (exercise) {
      selected.push(exercise)
      usedCategories.set(cat, (usedCategories.get(cat) ?? 0) + 1)
    }
  }

  // Second pass: fill to 5-6 with second exercises in weakest categories
  for (const cat of ranked) {
    if (selected.length >= 6) break
    if ((usedCategories.get(cat) ?? 0) >= 2) continue
    const exercise = pickExerciseForCategory(cat, bestMap, selected, seed ? seed + 1 : undefined)
    if (exercise) {
      selected.push(exercise)
      usedCategories.set(cat, (usedCategories.get(cat) ?? 0) + 1)
    }
  }

  // Compute duration
  const totalDurationSec = selected.reduce((sum, ex) => {
    return sum + estimateCalisthenicsduration(ex.exerciseId, ex.targetValue, ex.targetSets, 60)
  }, 0)
  const totalDurationMin = Math.max(10, Math.round(totalDurationSec / 60))

  // Generate focus label
  const catCounts = new Map<ProgressionCategory, number>()
  for (const ex of selected) {
    const def = CALISTHENICS_EXERCISES.find((e) => e.id === ex.exerciseId)
    if (def) catCounts.set(def.category as ProgressionCategory, (catCounts.get(def.category as ProgressionCategory) ?? 0) + 1)
  }
  const topCats = [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([cat]) => cat.charAt(0).toUpperCase() + cat.slice(1))
  const focus = topCats.join(' + ') + ' focus'

  return { exercises: selected, totalDurationMin, focus }
}

function pickExerciseForCategory(
  category: ProgressionCategory,
  bestMap: Map<CalisthenicsExerciseId, number>,
  alreadySelected: SessionExercise[],
  seed?: number
): SessionExercise | null {
  const chains = PROGRESSION_CHAINS.filter((c) => c.category === category)
  const alreadyIds = new Set(alreadySelected.map((e) => e.exerciseId))

  // Find all unlocked and in-progress exercises
  const candidates: { node: ProgressionNode; priority: number; reason: string }[] = []

  for (const chain of chains) {
    for (const node of chain.nodes) {
      if (alreadyIds.has(node.exerciseId)) continue

      const isUnlocked = node.unlockRequirements.length === 0 ||
        node.unlockRequirements.every((req) => (bestMap.get(req.exerciseId) ?? 0) >= req.threshold)

      if (!isUnlocked) continue

      const best = bestMap.get(node.exerciseId)
      let priority = 0
      let reason = ''

      // Check if this is a bottleneck (blocks next progression)
      const dependents = chains.flatMap((c) => c.nodes).filter((n) =>
        n.unlockRequirements.some((r) => r.exerciseId === node.exerciseId)
      )

      if (dependents.length > 0 && best != null) {
        const nextThreshold = Math.max(...dependents.map((d) =>
          d.unlockRequirements.find((r) => r.exerciseId === node.exerciseId)?.threshold ?? 0
        ))
        if (best < nextThreshold) {
          priority = 10 // Bottleneck — highest priority
          reason = `Unlock next at ${nextThreshold}`
        }
      }

      if (best == null) {
        priority = Math.max(priority, 5) // Never tried — high priority
        reason = reason || 'New exercise'
      } else if (priority < 10) {
        priority = 3 // Has data, keep progressing
        reason = reason || 'Progressive overload'
      }

      candidates.push({ node, priority, reason })
    }
  }

  if (candidates.length === 0) return null

  // Sort by priority, then use seed for tie-breaking
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    // Deterministic shuffle using seed
    if (seed != null) {
      const hashA = simpleHash(a.node.exerciseId + seed)
      const hashB = simpleHash(b.node.exerciseId + seed)
      return hashA - hashB
    }
    return 0
  })

  const chosen = candidates[0]
  const def = CALISTHENICS_EXERCISES.find((e) => e.id === chosen.node.exerciseId)
  if (!def) return null

  const best = bestMap.get(chosen.node.exerciseId) ?? 0
  const targetValue = computeOverloadTarget(chosen.node.exerciseId, best, bestMap, def.type === 'hold')
  const targetSets = 3

  return {
    exerciseId: chosen.node.exerciseId,
    name: def.name,
    targetValue,
    targetSets,
    unit: def.type === 'hold' ? 's' : 'reps',
    reason: chosen.reason,
  }
}

function computeOverloadTarget(
  exerciseId: CalisthenicsExerciseId,
  currentBest: number,
  bestMap: Map<CalisthenicsExerciseId, number>,
  isHold: boolean
): number {
  if (currentBest === 0) {
    return isHold ? 10 : 5
  }

  let increment: number
  if (isHold) {
    increment = 5 // +5 seconds for holds
  } else if (currentBest < 10) {
    increment = 1 // +1 rep for low counts
  } else {
    increment = Math.max(1, Math.round(currentBest * 0.1)) // +10% for higher
  }

  const target = currentBest + increment

  // Cap at next unlock threshold if one exists
  const chains = PROGRESSION_CHAINS.filter((c) => c.nodes.some((n) => n.exerciseId === exerciseId))
  for (const chain of chains) {
    const dependents = chain.nodes.filter((n) =>
      n.unlockRequirements.some((r) => r.exerciseId === exerciseId)
    )
    if (dependents.length > 0) {
      const nextThreshold = Math.max(...dependents.map((d) =>
        d.unlockRequirements.find((r) => r.exerciseId === exerciseId)?.threshold ?? Infinity
      ))
      if (target > nextThreshold && currentBest < nextThreshold) {
        return nextThreshold
      }
    }
  }

  return target
}

function buildLastTrainedMap(logs: CalisthenicsLog[]): Map<ProgressionCategory, number> {
  const map = new Map<ProgressionCategory, number>()

  for (const log of logs) {
    const def = CALISTHENICS_EXERCISES.find((e) => e.id === log.exerciseId)
    if (!def) continue
    const cat = def.category as ProgressionCategory
    const logTime = new Date(log.date).getTime()
    const existing = map.get(cat) ?? 0
    if (logTime > existing) map.set(cat, logTime)
  }

  return map
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return hash
}
