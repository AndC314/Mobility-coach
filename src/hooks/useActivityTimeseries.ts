import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { isoDate } from '../lib/date'

export interface WeeklyActivityData {
  weekLabel: string // e.g. "Jun 30"
  weekStart: string // YYYY-MM-DD
  bjjMins: number
  calisthenicsMins: number
  mobilityMins: number
  runningMins: number
  bjjSessions: number
  calisthenicsSessions: number
  mobilitySessions: number
  runningSessions: number
  totalMins: number
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

    const wsStr = isoDate(weekStart)
    const weStr = isoDate(weekEnd)

    // BJJ: sum technicalMins + sparringMins (fallback 50T+10S=60 for old logs)
    const bjjWeekLogs = bjjLogs.filter((l) => l.date >= wsStr && l.date <= weStr)
    const bjjMins = bjjWeekLogs.reduce((sum, l) => {
      const t = l.technicalMins ?? 0
      const s = l.sparringMins ?? 0
      return sum + (t === 0 && s === 0 ? 60 : t + s)
    }, 0)

    // Calisthenics sessions
    const calisthenicsWeekSessions = sessions.filter(
      (s) => s.date >= wsStr && s.date <= weStr && s.type === 'calisthenics'
    )
    const calisthenicsMins = calisthenicsWeekSessions.reduce((sum, s) => sum + s.durationMin, 0)

    // Running sessions
    const runningWeekSessions = sessions.filter(
      (s) => s.date >= wsStr && s.date <= weStr && s.type === 'running'
    )
    const runningMins = runningWeekSessions.reduce((sum, s) => sum + s.durationMin, 0)

    // Mobility sessions (everything else except bjj, calisthenics, running, custom)
    const mobilityWeekSessions = sessions.filter(
      (s) =>
        s.date >= wsStr &&
        s.date <= weStr &&
        s.type !== 'bjj' &&
        s.type !== 'calisthenics' &&
        s.type !== 'running' &&
        s.type !== 'custom'
    )
    const mobilityMins = mobilityWeekSessions.reduce((sum, s) => sum + s.durationMin, 0)

    const label = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

    result.push({
      weekLabel: label,
      weekStart: wsStr,
      bjjMins,
      calisthenicsMins,
      mobilityMins,
      runningMins,
      bjjSessions: bjjWeekLogs.length,
      calisthenicsSessions: calisthenicsWeekSessions.length,
      mobilitySessions: mobilityWeekSessions.length,
      runningSessions: runningWeekSessions.length,
      totalMins: bjjMins + calisthenicsMins + mobilityMins + runningMins
    })
  }

  return result
}
