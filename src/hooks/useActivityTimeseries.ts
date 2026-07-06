import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'

export interface WeeklyActivityData {
  weekLabel: string // e.g. "Jun 30"
  weekStart: string // YYYY-MM-DD
  bjjMins: number
  calisthenicsMins: number
  mobilityMins: number
}

export function useActivityTimeseries(weeksBack = 12): WeeklyActivityData[] {
  const bjjLogs = useLiveQuery(() => db.bjjClassLogs.toArray(), [], [])
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])

  if (!bjjLogs || !sessions) return []

  const result: WeeklyActivityData[] = []
  const today = new Date()

  for (let w = weeksBack - 1; w >= 0; w--) {
    const weekEnd = new Date(today)
    weekEnd.setDate(today.getDate() - w * 7)
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekEnd.getDate() - 6)

    const wsStr = weekStart.toISOString().split('T')[0]
    const weStr = weekEnd.toISOString().split('T')[0]

    // BJJ: sum technicalMins + sparringMins (fallback 60 if neither set)
    const bjjMins = bjjLogs
      .filter((l) => l.date >= wsStr && l.date <= weStr)
      .reduce((sum, l) => {
        const t = l.technicalMins ?? 0
        const s = l.sparringMins ?? 0
        return sum + (t === 0 && s === 0 ? 60 : t + s)
      }, 0)

    // Calisthenics sessions
    const calisthenicsMins = sessions
      .filter((s) => s.date >= wsStr && s.date <= weStr && s.type === 'calisthenics')
      .reduce((sum, s) => sum + s.durationMin, 0)

    // Mobility sessions (non-bjj, non-calisthenics, non-custom)
    const mobilityMins = sessions
      .filter(
        (s) =>
          s.date >= wsStr &&
          s.date <= weStr &&
          s.type !== 'bjj' &&
          s.type !== 'calisthenics' &&
          s.type !== 'custom'
      )
      .reduce((sum, s) => sum + s.durationMin, 0)

    const label = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

    result.push({ weekLabel: label, weekStart: wsStr, bjjMins, calisthenicsMins, mobilityMins })
  }

  return result
}
