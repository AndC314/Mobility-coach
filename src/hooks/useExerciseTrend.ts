import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CalisthenicsExerciseId } from '../db/db'

export type TrendDirection = 'improving' | 'plateau' | 'declining'

export interface ExerciseTrend {
  recentValues: { date: string; value: number }[]
  trend: TrendDirection
  daysSinceLastPR: number
  isNewPR: boolean
  currentBest: number
}

export function useExerciseTrend(exerciseId: CalisthenicsExerciseId): ExerciseTrend | undefined {
  return useLiveQuery(async () => {
    const logs = await db.calisthenicsLogs
      .where('exerciseId')
      .equals(exerciseId)
      .sortBy('date')

    if (logs.length < 3) return undefined

    // De-duplicate by date — take max value per day
    const byDate = new Map<string, number>()
    for (const log of logs) {
      const existing = byDate.get(log.date) ?? 0
      if (log.value > existing) byDate.set(log.date, log.value)
    }

    const sorted = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }))

    if (sorted.length < 3) return undefined

    // Take last 8 sessions for trend analysis
    const recent = sorted.slice(-8)

    // Compute trend: compare avg of last 3 vs first 3
    const last3 = recent.slice(-3)
    const first3 = recent.slice(0, 3)
    const avgLast = last3.reduce((s, v) => s + v.value, 0) / last3.length
    const avgFirst = first3.reduce((s, v) => s + v.value, 0) / first3.length

    let trend: TrendDirection
    const improvementThreshold = avgFirst * 0.05 // 5% improvement counts

    if (avgLast > avgFirst + improvementThreshold) {
      trend = 'improving'
    } else if (avgLast < avgFirst - improvementThreshold) {
      trend = 'declining'
    } else {
      trend = 'plateau'
    }

    // Plateau override: if last 5 values are all within 10% of each other
    if (recent.length >= 5) {
      const last5 = recent.slice(-5)
      const max5 = Math.max(...last5.map((v) => v.value))
      const min5 = Math.min(...last5.map((v) => v.value))
      if (max5 > 0 && (max5 - min5) / max5 <= 0.1) {
        // Also check: no improvement vs all prior logs
        const priorMax = Math.max(...sorted.slice(0, -5).map((v) => v.value), 0)
        if (max5 <= priorMax || sorted.length <= 5) {
          trend = 'plateau'
        }
      }
    }

    // PR detection
    const currentBest = Math.max(...sorted.map((v) => v.value))
    const latestValue = sorted[sorted.length - 1].value
    const isNewPR = latestValue >= currentBest && sorted.length > 1

    // Days since last PR
    const prDate = sorted.filter((v) => v.value === currentBest).pop()!.date
    const now = new Date()
    const prTime = new Date(prDate).getTime()
    const daysSinceLastPR = Math.floor((now.getTime() - prTime) / 86400000)

    return {
      recentValues: recent,
      trend,
      daysSinceLastPR,
      isNewPR,
      currentBest,
    }
  }, [exerciseId])
}
