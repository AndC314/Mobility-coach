import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { computeSupercompensation, type DayPoint, type FitnessCategory } from '../lib/supercompensation'

export interface TrendPoint {
  date: string
  label: string
  overall: number
  strength: number
  grappling: number
  mobility: number
  isForecast?: boolean
}

const STRENGTH_CATS: FitnessCategory[] = ['push', 'pull', 'legs', 'core']
const MOBILITY_CATS: FitnessCategory[] = ['mob_hips', 'mob_hamstrings', 'mob_lats']

function avg(point: DayPoint, cats: FitnessCategory[]): number {
  const vals = cats.map((c) => (point as any)[c] as number)
  const active = vals.filter((v) => v !== 100)
  if (active.length === 0) return 100
  return Math.round((active.reduce((s, v) => s + v, 0) / active.length) * 10) / 10
}

export function useFitnessTrend(days = 60): TrendPoint[] {
  const calLogs = useLiveQuery(() => db.calisthenicsLogs.toArray(), [], null)
  const bjjLogs = useLiveQuery(() => db.bjjClassLogs.toArray(), [], null)
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], null)

  if (!calLogs || !bjjLogs || !sessions) return []

  const raw = computeSupercompensation(calLogs, bjjLogs, days, sessions, 7)

  return raw.map((p) => {
    const strength = avg(p, STRENGTH_CATS)
    const grappling = p.grappling
    const mobility = avg(p, MOBILITY_CATS)
    const overall = Math.round(((strength + grappling + mobility) / 3) * 10) / 10
    const d = new Date(p.date + 'T12:00:00')
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return { date: p.date, label, overall, strength, grappling, mobility, isForecast: p.isForecast }
  })
}
