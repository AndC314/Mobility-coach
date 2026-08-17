import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CalisthenicsExerciseId } from '../db/db'
import { generateCalisthenicsSession, type GeneratedSession } from '../lib/calisthenicsSession'
import { useWeakLink } from './useWeakLink'
import type { ProgressionCategory } from '../data/progressionChains'

export function useCalisthenicsSession() {
  const [seed, setSeed] = useState(0)
  const analysis = useWeakLink()

  const session = useLiveQuery(async () => {
    const logs = await db.calisthenicsLogs.toArray()
    if (logs.length === 0) return null

    const bestMap = new Map<CalisthenicsExerciseId, number>()
    for (const log of logs) {
      const current = bestMap.get(log.exerciseId) ?? 0
      if (log.value > current) bestMap.set(log.exerciseId, log.value)
    }

    const categoryScores: { category: ProgressionCategory; score: number }[] = analysis
      ? analysis.scores.map((s) => ({ category: s.category as ProgressionCategory, score: s.score }))
      : [
          { category: 'push', score: 50 },
          { category: 'pull', score: 50 },
          { category: 'legs', score: 50 },
          { category: 'core', score: 50 },
        ]

    return generateCalisthenicsSession({
      logs,
      bestMap,
      categoryScores,
      seed: seed || undefined,
    })
  }, [seed, analysis])

  const regenerate = useCallback(() => {
    setSeed((s) => s + 1)
  }, [])

  return {
    session: session ?? null,
    regenerate,
    isLoading: session === undefined,
  }
}
