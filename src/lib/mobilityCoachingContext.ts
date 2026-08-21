import { db } from '../db/db'
import { todayIso } from './date'
import { computeSupercompensation, type FitnessCategory } from './supercompensation'
import { MOBILITY_EXERCISES } from '../data/mobilityExercises'

export interface MobilityCoachingContext {
  lastMobilitySession: {
    date: string
    exerciseIds: string[]
    daysAgo: number
  } | null
  lastCalisthenicsSession: {
    date: string
    exerciseIds: string[]
    daysAgo: number
    categories: string[]
  } | null
  mobilitySupercompensation: Record<string, number>
  recentMobilitySessions: {
    date: string
    exerciseIds: string[]
  }[]
  availableExercises: {
    id: string
    name: string
    category: string
    defaultHoldSec: number
    maxHoldSec: number
    sides: boolean
  }[]
  preferredSessionMin: number
  weekNumber: number
}

function getWeekNumber(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000))
}

function daysAgo(dateStr: string): number {
  const now = new Date()
  const d = new Date(dateStr)
  return Math.floor((now.getTime() - d.getTime()) / 86400000)
}

export async function buildMobilityCoachingContext(): Promise<MobilityCoachingContext> {
  const prefs = await db.preferences.get(1)

  // Get mobility sessions (from CompletedSession table, type hip_mobility)
  const sessions = await db.sessions
    .where('type')
    .equals('hip_mobility')
    .reverse()
    .sortBy('date')

  const lastMob = sessions.length > 0
    ? {
        date: sessions[0].date,
        exerciseIds: sessions[0].exerciseIds ?? [],
        daysAgo: daysAgo(sessions[0].date),
      }
    : null

  const recentMobilitySessions = sessions.slice(0, 5).map((s) => ({
    date: s.date,
    exerciseIds: s.exerciseIds ?? [],
  }))

  // Get last calisthenics session
  const calSessions = await db.sessions
    .where('type')
    .equals('calisthenics')
    .reverse()
    .sortBy('date')

  const lastCal = calSessions.length > 0
    ? {
        date: calSessions[0].date,
        exerciseIds: calSessions[0].exerciseIds ?? [],
        daysAgo: daysAgo(calSessions[0].date),
        categories: inferCalisthenicsCategories(calSessions[0].exerciseIds ?? []),
      }
    : null

  // Supercompensation for mobility categories
  const calLogs = await db.calisthenicsLogs.toArray()
  const bjjLogs = await db.bjjClassLogs.toArray()
  const allSessions = await db.sessions.toArray()
  const data = computeSupercompensation(calLogs, bjjLogs, 90, allSessions)
  const historical = data.filter((d) => !d.isForecast)
  const todayPoint = historical[historical.length - 1]

  const mobCategories: FitnessCategory[] = ['mob_hips', 'mob_hamstrings', 'mob_lats']
  const mobilitySupercompensation: Record<string, number> = {}
  if (todayPoint) {
    for (const cat of mobCategories) {
      mobilitySupercompensation[cat] = Math.round((todayPoint as any)[cat] * 10) / 10
    }
  }

  // Available mobility exercises
  const availableExercises = MOBILITY_EXERCISES.map((e) => ({
    id: e.id,
    name: e.name,
    category: e.category,
    defaultHoldSec: e.defaultHoldSec,
    maxHoldSec: e.maxHoldSec,
    sides: e.sides ?? false,
  }))

  return {
    lastMobilitySession: lastMob,
    lastCalisthenicsSession: lastCal,
    mobilitySupercompensation,
    recentMobilitySessions,
    availableExercises,
    preferredSessionMin: prefs?.sportDurations?.mobility ?? 10,
    weekNumber: getWeekNumber(),
  }
}

function inferCalisthenicsCategories(exerciseIds: string[]): string[] {
  const categories = new Set<string>()
  for (const id of exerciseIds) {
    if (/push|dip|pike_push/i.test(id)) categories.add('push')
    else if (/pull|row|hang/i.test(id)) categories.add('pull')
    else if (/squat|lunge|calf|pistol|bulgarian|cossack/i.test(id)) categories.add('legs')
    else if (/plank|hollow|lsit|v_up|crunch|sit_up|dead_bug|leg_raise|superman|russian_twist/i.test(id)) categories.add('core')
  }
  return [...categories]
}
