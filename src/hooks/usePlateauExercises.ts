import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CalisthenicsExerciseId } from '../db/db'
import { CALISTHENICS_EXERCISES } from '../data/calisthenics'

export interface PlateauExercise {
  exerciseId: CalisthenicsExerciseId
  name: string
  category: string
  currentBest: number
  unit: string
  sessionsStuck: number
  daysSinceImprovement: number
}

export function usePlateauExercises(): PlateauExercise[] | undefined {
  return useLiveQuery(async () => {
    const allLogs = await db.calisthenicsLogs.toArray()
    if (allLogs.length === 0) return []

    // Group logs by exerciseId (skip challenge totals — they inflate the best)
    const byExercise = new Map<CalisthenicsExerciseId, { date: string; value: number }[]>()
    for (const log of allLogs) {
      if (log.notes?.startsWith('Challenge:')) continue
      const arr = byExercise.get(log.exerciseId) ?? []
      arr.push({ date: log.date, value: log.value })
      byExercise.set(log.exerciseId, arr)
    }

    const plateaus: PlateauExercise[] = []

    for (const [exerciseId, logs] of byExercise) {
      // De-duplicate by date (max per day), sort chronologically
      const byDate = new Map<string, number>()
      for (const log of logs) {
        const existing = byDate.get(log.date) ?? 0
        if (log.value > existing) byDate.set(log.date, log.value)
      }

      const sorted = [...byDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value }))

      if (sorted.length < 5) continue

      // Plateau: last 5 sessions are all within 10% of each other
      // AND max of last 5 <= overall max of prior sessions
      const last5 = sorted.slice(-5)
      const max5 = Math.max(...last5.map((v) => v.value))
      const min5 = Math.min(...last5.map((v) => v.value))

      if (max5 === 0) continue
      if ((max5 - min5) / max5 > 0.1) continue

      const priorValues = sorted.slice(0, -5)
      const priorMax = priorValues.length > 0 ? Math.max(...priorValues.map((v) => v.value)) : 0

      if (max5 > priorMax && priorMax > 0) continue

      // Count sessions stuck (consecutive sessions not exceeding prior max)
      const overallMax = Math.max(...sorted.map((v) => v.value))
      let sessionsStuck = 0
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].value < overallMax) {
          sessionsStuck++
        } else {
          break
        }
      }
      // If the max IS the last value but repeated, count from last improvement
      if (sessionsStuck === 0) {
        for (let i = sorted.length - 1; i >= 0; i--) {
          if (sorted[i].value >= overallMax) sessionsStuck++
          else break
        }
        sessionsStuck = Math.max(0, sessionsStuck - 1)
      }

      if (sessionsStuck < 4) continue

      // Find last improvement date
      let lastImprovementDate = sorted[0].date
      for (let i = sorted.length - 1; i > 0; i--) {
        if (sorted[i].value > sorted[i - 1].value) {
          lastImprovementDate = sorted[i].date
          break
        }
      }

      const daysSinceImprovement = Math.floor(
        (Date.now() - new Date(lastImprovementDate).getTime()) / 86400000
      )

      const def = CALISTHENICS_EXERCISES.find((e) => e.id === exerciseId)

      plateaus.push({
        exerciseId,
        name: def?.name ?? exerciseId,
        category: def?.category ?? 'core',
        currentBest: overallMax,
        unit: def?.type === 'hold' ? 's' : 'reps',
        sessionsStuck,
        daysSinceImprovement,
      })
    }

    return plateaus.sort((a, b) => b.sessionsStuck - a.sessionsStuck)
  }, [])
}
