import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CalisthenicsExerciseId } from '../db/db'
import {
  PROGRESSION_CHAINS,
  type ProgressionCategory,
  LEVEL_LABELS,
} from '../data/progressionChains'
import { CALISTHENICS_EXERCISES } from '../data/calisthenics'

export interface CategoryScore {
  category: ProgressionCategory
  label: string
  score: number
  level: number
  levelLabel: string
  totalNodes: number
  masteredNodes: number
  inProgressNodes: number
  lockedNodes: number
  bottleneck: BottleneckExercise | null
}

export interface BottleneckExercise {
  exerciseId: CalisthenicsExerciseId
  exerciseName: string
  currentBest: number | null
  threshold: number
  unit: 'reps' | 's'
  progress: number
  unlocksExercise: string
}

export interface WeakLinkAnalysis {
  scores: CategoryScore[]
  weakest: CategoryScore
  strongest: CategoryScore
  imbalanceRatio: number
  recommendation: string
}

const CATEGORY_LABELS: Record<ProgressionCategory, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  core: 'Core',
}

const LEVEL_WEIGHTS = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 10 } as const

export function useWeakLink(): WeakLinkAnalysis | undefined {
  const calLogs = useLiveQuery(() => db.calisthenicsLogs.toArray(), [])

  if (!calLogs) return undefined

  const bestMap = new Map<CalisthenicsExerciseId, number>()
  for (const log of calLogs) {
    const current = bestMap.get(log.exerciseId) ?? 0
    if (log.value > current) bestMap.set(log.exerciseId, log.value)
  }

  const categories: ProgressionCategory[] = ['push', 'pull', 'legs', 'core']
  const scores = categories.map((cat) => computeCategoryScore(cat, bestMap))

  const sorted = [...scores].sort((a, b) => a.score - b.score)
  const weakest = sorted[0]
  const strongest = sorted[sorted.length - 1]

  const imbalanceRatio = strongest.score > 0
    ? Math.round(((strongest.score - weakest.score) / strongest.score) * 100)
    : 0

  const recommendation = generateRecommendation(weakest, strongest, imbalanceRatio)

  return { scores, weakest, strongest, imbalanceRatio, recommendation }
}

function computeCategoryScore(
  category: ProgressionCategory,
  bestMap: Map<CalisthenicsExerciseId, number>
): CategoryScore {
  const chains = PROGRESSION_CHAINS.filter((c) => c.category === category)
  const allNodes = chains.flatMap((c) => c.nodes)

  let totalWeight = 0
  let earnedWeight = 0
  let masteredNodes = 0
  let inProgressNodes = 0
  let lockedNodes = 0

  for (const node of allNodes) {
    const weight = LEVEL_WEIGHTS[node.level as keyof typeof LEVEL_WEIGHTS] ?? 1
    totalWeight += weight

    const best = bestMap.get(node.exerciseId)
    const isUnlocked = node.unlockRequirements.length === 0 ||
      node.unlockRequirements.every((req) => (bestMap.get(req.exerciseId) ?? 0) >= req.threshold)

    if (!isUnlocked) {
      lockedNodes++
      continue
    }

    if (best == null) {
      inProgressNodes++
      continue
    }

    const exercise = CALISTHENICS_EXERCISES.find((e) => e.id === node.exerciseId)
    const isHold = exercise?.type === 'hold'
    const masteryThreshold = isHold ? 60 : 20

    const dependents = chains.flatMap((c) => c.nodes).filter((n) =>
      n.unlockRequirements.some((r) => r.exerciseId === node.exerciseId)
    )
    const effectiveThreshold = dependents.length > 0
      ? Math.max(...dependents.map((d) =>
          d.unlockRequirements.find((r) => r.exerciseId === node.exerciseId)?.threshold ?? masteryThreshold
        ))
      : masteryThreshold

    const progress = Math.min(1, best / effectiveThreshold)
    earnedWeight += weight * progress

    if (progress >= 1) {
      masteredNodes++
    } else {
      inProgressNodes++
    }
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0

  const highestMastered = allNodes
    .filter((n) => {
      const best = bestMap.get(n.exerciseId)
      if (best == null) return false
      const exercise = CALISTHENICS_EXERCISES.find((e) => e.id === n.exerciseId)
      const isHold = exercise?.type === 'hold'
      const dependents = chains.flatMap((c) => c.nodes).filter((d) =>
        d.unlockRequirements.some((r) => r.exerciseId === n.exerciseId)
      )
      if (dependents.length === 0) return isHold ? best >= 60 : best >= 20
      return dependents.every((d) => {
        const req = d.unlockRequirements.find((r) => r.exerciseId === n.exerciseId)
        return req ? best >= req.threshold : true
      })
    })
    .reduce((max, n) => Math.max(max, n.level), 0)

  const level = Math.max(1, highestMastered || 1)

  const bottleneck = findBottleneck(chains, bestMap)

  return {
    category,
    label: CATEGORY_LABELS[category],
    score,
    level,
    levelLabel: LEVEL_LABELS[level],
    totalNodes: allNodes.length,
    masteredNodes,
    inProgressNodes,
    lockedNodes,
    bottleneck,
  }
}

function findBottleneck(
  chains: typeof PROGRESSION_CHAINS,
  bestMap: Map<CalisthenicsExerciseId, number>
): BottleneckExercise | null {
  let bestBottleneck: BottleneckExercise | null = null
  let highestProgress = -1

  for (const chain of chains) {
    for (const node of chain.nodes) {
      if (node.unlockRequirements.length === 0) continue

      const isLocked = node.unlockRequirements.some((req) => {
        const reqBest = bestMap.get(req.exerciseId) ?? 0
        return reqBest < req.threshold
      })

      if (!isLocked) continue

      for (const req of node.unlockRequirements) {
        const reqBest = bestMap.get(req.exerciseId) ?? 0
        if (reqBest >= req.threshold) continue

        const progress = req.threshold > 0 ? reqBest / req.threshold : 0
        if (progress > highestProgress) {
          highestProgress = progress
          const exercise = CALISTHENICS_EXERCISES.find((e) => e.id === req.exerciseId)
          const unlocksExercise = CALISTHENICS_EXERCISES.find((e) => e.id === node.exerciseId)
          bestBottleneck = {
            exerciseId: req.exerciseId,
            exerciseName: exercise?.name ?? req.exerciseId,
            currentBest: reqBest > 0 ? reqBest : null,
            threshold: req.threshold,
            unit: req.unit,
            progress: Math.round(progress * 100),
            unlocksExercise: unlocksExercise?.name ?? node.exerciseId,
          }
        }
      }
    }
  }

  return bestBottleneck
}

function generateRecommendation(
  weakest: CategoryScore,
  strongest: CategoryScore,
  imbalanceRatio: number
): string {
  if (imbalanceRatio < 15) {
    return 'Your training is well-balanced across all patterns. Keep progressing evenly.'
  }

  if (imbalanceRatio < 35) {
    if (weakest.bottleneck) {
      return `${weakest.label} is slightly behind. Focus on ${weakest.bottleneck.exerciseName} (${weakest.bottleneck.currentBest ?? 0}/${weakest.bottleneck.threshold} ${weakest.bottleneck.unit}) to unlock ${weakest.bottleneck.unlocksExercise}.`
    }
    return `${weakest.label} is slightly behind ${strongest.label}. Add 1-2 extra ${weakest.label.toLowerCase()} sessions per week.`
  }

  if (weakest.bottleneck) {
    return `${weakest.label} is your weak link — ${imbalanceRatio}% gap vs ${strongest.label}. Priority: get ${weakest.bottleneck.exerciseName} to ${weakest.bottleneck.threshold} ${weakest.bottleneck.unit} to unlock ${weakest.bottleneck.unlocksExercise}.`
  }
  return `${weakest.label} is your weak link — ${imbalanceRatio}% gap vs ${strongest.label}. Prioritize ${weakest.label.toLowerCase()} exercises in your next sessions.`
}
