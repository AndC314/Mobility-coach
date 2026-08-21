import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { SKILL_TREE_DATA } from '../lib/skillRequirements'
import type { SkillNode, SkillTier } from '../types/skills'

export interface SkillProgress {
  skill: SkillNode
  isUnlocked: boolean
  prereqProgress: { exerciseId: string; label: string; current: number; threshold: number; percent: number }[]
  currentTier: number
  activeTierExercise: SkillTier | null
}

export function useSkillProgression(): SkillProgress[] | undefined {
  return useLiveQuery(async () => {
    const logs = await db.calisthenicsLogs.toArray()

    const bestMap = new Map<string, number>()
    for (const log of logs) {
      if (log.notes?.startsWith('Challenge:')) continue
      const key = log.exerciseId
      const current = bestMap.get(key) ?? 0
      if (log.value > current) bestMap.set(key, log.value)
    }

    return SKILL_TREE_DATA.map((skill) => {
      const prereqProgress = skill.prerequisites.map((p) => {
        const current = bestMap.get(p.exerciseId) ?? 0
        const percent = Math.min(100, Math.round((current / p.threshold) * 100))
        return { exerciseId: p.exerciseId, label: p.label, current, threshold: p.threshold, percent }
      })

      const isUnlocked = prereqProgress.every((p) => p.percent >= 100)

      let currentTier = 0
      if (isUnlocked) {
        for (const tier of skill.tiers) {
          const best = bestMap.get(tier.exerciseId) ?? 0
          if (best > 0) currentTier = tier.tier
        }
        if (currentTier === 0) currentTier = 1
      }

      const activeTierExercise = isUnlocked
        ? skill.tiers.find((t) => t.tier === currentTier) ?? skill.tiers[0]
        : null

      return { skill, isUnlocked, prereqProgress, currentTier, activeTierExercise }
    })
  }, [])
}
