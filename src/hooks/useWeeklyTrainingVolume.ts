import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { todayIso } from '../lib/date'

export interface WeeklyTrainingVolume {
  push: number // count of strength sessions in 7 days
  pull: number
  core: number
  mobility: number // count of mobility sessions in 7 days
  grappling: number // count of BJJ/grappling sessions in 7 days
}

/**
 * Calculates 7-day rolling averages for training volume.
 * Returns session counts for each training category from the past 7 days.
 */
export function useWeeklyTrainingVolume(): WeeklyTrainingVolume {
  const today = todayIso()
  const sevenDaysAgo = (() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 7)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })()

  // Get all sessions in the past 7 days
  const sessions = useLiveQuery(
    () => db.sessions.where('date').between(sevenDaysAgo, today, true, true).toArray(),
    [sevenDaysAgo, today],
    []
  )

  // Get BJJ sessions in the past 7 days
  const bjjLogs = useLiveQuery(
    () => db.bjjLogs.where('date').between(sevenDaysAgo, today, true, true).toArray(),
    [sevenDaysAgo, today],
    []
  )

  if (!sessions || !bjjLogs) {
    return { push: 0, pull: 0, core: 0, mobility: 0, grappling: 0 }
  }

  // Count sessions by category
  const push = sessions.filter((s) => s.type === 'calisthenics' && s.exerciseIds?.some((id) => ['pushups', 'dips', 'pike_pushups', 'archer_pushups', 'hindu_pushups'].includes(id))).length
  const pull = sessions.filter((s) => s.type === 'calisthenics' && s.exerciseIds?.some((id) => ['pullups', 'australian_pullups', 'ring_rows', 'scapular_pullups'].includes(id))).length
  const core = sessions.filter((s) => s.type === 'calisthenics' && s.exerciseIds?.some((id) => ['plank', 'hollow_body', 'hollow_body_hold', 'lsit', 'tuck_lsit', 'side_plank'].includes(id))).length

  // Mobility: any session that's not calisthenics or custom (including bjj_release, hip_mobility, pancake, pike, ninety_ninety, recovery, morning, etc.)
  const mobility = sessions.filter((s) => s.type !== 'calisthenics' && s.type !== 'custom').length

  // Grappling: BJJ sessions in the past 7 days
  const grappling = bjjLogs.filter((log) => log.attended).length

  return { push, pull, core, mobility, grappling }
}
