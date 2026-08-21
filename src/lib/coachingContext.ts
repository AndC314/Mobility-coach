import { db } from '../db/db'
import { todayIso } from './date'
import { computeSupercompensation, computeForecastInsights, type FitnessCategory } from './supercompensation'
import { computeMuscleScores, computeAdaptiveCaps } from '../data/muscleMap'
import { computeAllTrainingHours } from './trainingHourCalculator'
import { generateTodayPlan } from './recommendation'

export interface TrainingContext {
  supercompensation: Record<string, number>
  forecastInsights: { category: string; trend: string; message: string }[]
  muscleScores: { muscle: string; score: number }[]
  trainingHours: { category: string; totalHours: number; hoursThisWeek: number; lastActivityDaysAgo: number }[]
  recoveryScore: number
  categorySoreness: { category: string; score: number }[]
  weekNumber: number
  preferredSessionMin: number
  availableEquipment: string[]
  activeSports: string[]
}

function getWeekNumber(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000))
}

export async function buildCoachingContext(): Promise<TrainingContext> {
  const today = todayIso()
  const prefs = await db.preferences.get(1)

  // Supercompensation — get today's levels
  const calLogs = await db.calisthenicsLogs.toArray()
  const bjjLogs = await db.bjjClassLogs.toArray()
  const sessions = await db.sessions.toArray()
  const data = computeSupercompensation(calLogs, bjjLogs, 90, sessions)
  const historical = data.filter((d) => !d.isForecast)
  const todayPoint = historical[historical.length - 1]

  const categories: FitnessCategory[] = ['push', 'pull', 'legs', 'core', 'grappling', 'mob_hips', 'mob_hamstrings', 'mob_lats']
  const supercompensation: Record<string, number> = {}
  if (todayPoint) {
    for (const cat of categories) {
      supercompensation[cat] = Math.round((todayPoint as any)[cat] * 10) / 10
    }
  }

  // Forecast insights
  const rawInsights = computeForecastInsights(data)
  const forecastInsights = rawInsights.map((i) => ({
    category: i.category,
    trend: i.peakDay > 0 ? 'rising' : 'declining',
    message: i.peakDay > 0
      ? `${i.category} peaks in ${i.peakDay} days at ${Math.round(i.peakValue)}`
      : `${i.category} declining, train soon`,
  }))

  // Muscle scores — last 14 days
  const [ty, tm, td] = today.split('-').map(Number)
  const twoWeeksAgo = new Date(ty, tm - 1, td - 14)
  const twoWeeksStr = `${twoWeeksAgo.getFullYear()}-${String(twoWeeksAgo.getMonth() + 1).padStart(2, '0')}-${String(twoWeeksAgo.getDate()).padStart(2, '0')}`
  const recentLogs = calLogs.filter((l) => l.date >= twoWeeksStr)
  const adaptiveCaps = computeAdaptiveCaps(recentLogs, today)
  const scores = computeMuscleScores(recentLogs, today, adaptiveCaps)
  const muscleScores = scores
    .sort((a, b) => a.score - b.score)
    .slice(0, 10)
    .map((s) => ({ muscle: s.muscle, score: s.score }))

  // Training hours
  const trainingHoursRaw = await computeAllTrainingHours()
  const trainingHours = trainingHoursRaw.map((t) => ({
    category: t.category,
    totalHours: Math.round(t.totalHours * 10) / 10,
    hoursThisWeek: Math.round(t.hoursThisWeek * 10) / 10,
    lastActivityDaysAgo: t.lastActivityDaysAgo,
  }))

  // Recovery score + category soreness
  const plan = await generateTodayPlan()
  const recoveryScore = plan.recoveryScore
  const categorySoreness = plan.categorySoreness.map((cs) => ({
    category: cs.category,
    score: Math.round(cs.avgSoreness * 100),
  }))

  return {
    supercompensation,
    forecastInsights,
    muscleScores,
    trainingHours,
    recoveryScore,
    categorySoreness,
    weekNumber: getWeekNumber(),
    preferredSessionMin: prefs?.preferredSessionMin ?? 45,
    availableEquipment: prefs?.availableEquipment ?? [],
    activeSports: prefs?.activeSports ?? ['mobility', 'bjj', 'calisthenics'],
  }
}
