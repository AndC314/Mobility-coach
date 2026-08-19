import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CalisthenicsExerciseId } from '../db/db'
import {
  PROGRESSION_CHAINS,
  type ProgressionChain,
  type ProgressionCategory,
  type ProgressionNode,
  LEVEL_LABELS,
  LEVEL_COLORS,
} from '../data/progressionChains'
import { CALISTHENICS_EXERCISES } from '../data/calisthenics'

export type NodeUnlockStatus = 'locked' | 'unlocked' | 'in_progress' | 'mastered'

export interface UnlockRequirementResolved {
  exerciseName: string
  current: number
  threshold: number
  unit: 'reps' | 's'
}

export interface ResolvedNode {
  exerciseId: CalisthenicsExerciseId
  exerciseName: string
  level: number
  status: NodeUnlockStatus
  best: number | null
  unit: 'reps' | 's'
  masteryTarget: number
  progressTowardNext: number
  nextUnlockThreshold: number | null
  nextUnlockUnit: 'reps' | 's' | null
  unlocksExercise: string | null
  unlockRequirements: UnlockRequirementResolved[]
}

export interface ResolvedChain {
  id: string
  category: ProgressionCategory
  label: string
  description: string
  nodes: ResolvedNode[]
  overallLevel: number
  overallProgress: number
}

export function useProgressionState(): ResolvedChain[] | undefined {
  const calLogs = useLiveQuery(() => db.calisthenicsLogs.toArray(), [])

  if (!calLogs) return undefined

  const bestMap = new Map<CalisthenicsExerciseId, number>()
  for (const log of calLogs) {
    if (log.notes?.startsWith('Challenge:')) continue
    const current = bestMap.get(log.exerciseId) ?? 0
    if (log.value > current) bestMap.set(log.exerciseId, log.value)
  }

  return PROGRESSION_CHAINS.map((chain) => resolveChain(chain, bestMap))
}

export function useProgressionForCategory(category: ProgressionCategory): ResolvedChain[] | undefined {
  const all = useProgressionState()
  if (!all) return undefined
  return all.filter((c) => c.category === category)
}

export function useCurrentLevel(): { level: number; label: string; color: string } | undefined {
  const chains = useProgressionState()
  if (!chains) return undefined

  const levels = chains.map((c) => c.overallLevel)
  const avg = levels.length > 0 ? Math.round(levels.reduce((a, b) => a + b, 0) / levels.length) : 1
  const level = Math.max(1, Math.min(5, avg))
  return { level, label: LEVEL_LABELS[level], color: LEVEL_COLORS[level] }
}

function resolveChain(
  chain: ProgressionChain,
  bestMap: Map<CalisthenicsExerciseId, number>
): ResolvedChain {
  const resolvedNodes: ResolvedNode[] = chain.nodes.map((node) => {
    const best = bestMap.get(node.exerciseId) ?? null
    const exercise = CALISTHENICS_EXERCISES.find((e) => e.id === node.exerciseId)
    const unit = exercise?.type === 'hold' ? 's' as const : 'reps' as const

    const status = getNodeStatus(node, bestMap, chain)
    const { progressTowardNext, nextUnlockThreshold, nextUnlockUnit, unlocksExercise } =
      getNextUnlockInfo(node, bestMap, chain)
    const masteryTarget = getMasteryTarget(node, chain)

    const unlockRequirements: UnlockRequirementResolved[] = node.unlockRequirements.map((req) => {
      const reqExercise = CALISTHENICS_EXERCISES.find((e) => e.id === req.exerciseId)
      return {
        exerciseName: reqExercise?.name ?? req.exerciseId,
        current: bestMap.get(req.exerciseId) ?? 0,
        threshold: req.threshold,
        unit: req.unit,
      }
    })

    return {
      exerciseId: node.exerciseId,
      exerciseName: exercise?.name ?? node.exerciseId,
      level: node.level,
      status,
      best,
      unit,
      masteryTarget,
      progressTowardNext,
      nextUnlockThreshold,
      nextUnlockUnit,
      unlocksExercise,
      unlockRequirements,
    }
  })

  const masteredCount = resolvedNodes.filter((n) => n.status === 'mastered').length
  const inProgressCount = resolvedNodes.filter((n) => n.status === 'in_progress').length
  const totalNodes = resolvedNodes.length

  const overallProgress = totalNodes > 0
    ? Math.round(((masteredCount + inProgressCount * 0.5) / totalNodes) * 100)
    : 0

  const highestMastered = resolvedNodes
    .filter((n) => n.status === 'mastered')
    .reduce((max, n) => Math.max(max, n.level), 0)
  const highestInProgress = resolvedNodes
    .filter((n) => n.status === 'in_progress')
    .reduce((max, n) => Math.max(max, n.level), 0)
  const overallLevel = Math.max(1, highestMastered || highestInProgress || 1)

  return {
    id: chain.id,
    category: chain.category,
    label: chain.label,
    description: chain.description,
    nodes: resolvedNodes,
    overallLevel,
    overallProgress,
  }
}

function getNodeStatus(
  node: ProgressionNode,
  bestMap: Map<CalisthenicsExerciseId, number>,
  chain: ProgressionChain
): NodeUnlockStatus {
  const best = bestMap.get(node.exerciseId)

  if (node.unlockRequirements.length === 0) {
    if (best == null) return 'unlocked'
    return isMastered(node, bestMap, chain) ? 'mastered' : 'in_progress'
  }

  const allMet = node.unlockRequirements.every((req) => {
    const reqBest = bestMap.get(req.exerciseId) ?? 0
    return reqBest >= req.threshold
  })

  if (!allMet) return 'locked'
  if (best == null) return 'unlocked'
  return isMastered(node, bestMap, chain) ? 'mastered' : 'in_progress'
}

function isMastered(
  node: ProgressionNode,
  bestMap: Map<CalisthenicsExerciseId, number>,
  chain: ProgressionChain
): boolean {
  const best = bestMap.get(node.exerciseId)
  if (best == null) return false

  const dependents = chain.nodes.filter((n) =>
    n.unlockRequirements.some((r) => r.exerciseId === node.exerciseId)
  )

  if (dependents.length === 0) {
    const exercise = CALISTHENICS_EXERCISES.find((e) => e.id === node.exerciseId)
    const isHold = exercise?.type === 'hold'
    return isHold ? best >= 60 : best >= 20
  }

  return dependents.every((dep) => {
    const req = dep.unlockRequirements.find((r) => r.exerciseId === node.exerciseId)
    return req ? best >= req.threshold : true
  })
}

function getMasteryTarget(node: ProgressionNode, chain: ProgressionChain): number {
  const dependents = chain.nodes.filter((n) =>
    n.unlockRequirements.some((r) => r.exerciseId === node.exerciseId)
  )

  if (dependents.length > 0) {
    return Math.max(
      ...dependents.map((d) =>
        d.unlockRequirements.find((r) => r.exerciseId === node.exerciseId)?.threshold ?? 0
      )
    )
  }

  const exercise = CALISTHENICS_EXERCISES.find((e) => e.id === node.exerciseId)
  return exercise?.type === 'hold' ? 60 : 20
}

function getNextUnlockInfo(
  node: ProgressionNode,
  bestMap: Map<CalisthenicsExerciseId, number>,
  chain: ProgressionChain
): {
  progressTowardNext: number
  nextUnlockThreshold: number | null
  nextUnlockUnit: 'reps' | 's' | null
  unlocksExercise: string | null
} {
  const dependents = chain.nodes.filter((n) =>
    n.unlockRequirements.some((r) => r.exerciseId === node.exerciseId)
  )

  if (dependents.length === 0) {
    return { progressTowardNext: 0, nextUnlockThreshold: null, nextUnlockUnit: null, unlocksExercise: null }
  }

  const lockedDeps = dependents.filter((dep) => {
    return dep.unlockRequirements.some((r) => {
      const reqBest = bestMap.get(r.exerciseId) ?? 0
      return reqBest < r.threshold
    })
  })

  const targetDep = lockedDeps[0] ?? dependents[0]
  const req = targetDep.unlockRequirements.find((r) => r.exerciseId === node.exerciseId)
  if (!req) {
    return { progressTowardNext: 0, nextUnlockThreshold: null, nextUnlockUnit: null, unlocksExercise: null }
  }

  const best = bestMap.get(node.exerciseId) ?? 0
  const progress = Math.min(100, Math.round((best / req.threshold) * 100))
  const exercise = CALISTHENICS_EXERCISES.find((e) => e.id === targetDep.exerciseId)

  return {
    progressTowardNext: progress,
    nextUnlockThreshold: req.threshold,
    nextUnlockUnit: req.unit,
    unlocksExercise: exercise?.name ?? targetDep.exerciseId,
  }
}
