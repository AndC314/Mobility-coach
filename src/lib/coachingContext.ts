import { db, type CalisthenicsLog, type CalisthenicsExerciseId } from '../db/db'
import { todayIso } from './date'
import { computeSupercompensation, computeForecastInsights, type FitnessCategory } from './supercompensation'
import { computeMuscleScores, computeAdaptiveCaps } from '../data/muscleMap'
import { computeAllTrainingHours } from './trainingHourCalculator'
import { generateTodayPlan } from './recommendation'
import { getExerciseDef, CALISTHENICS_EXERCISES } from '../data/calisthenics'
import { PROGRESSION_CHAINS } from '../data/progressionChains'

export interface ExerciseHistoryEntry {
  exerciseId: string
  name: string
  category: string
  type: 'dynamic' | 'hold'
  unit: string
  recentSessions: { date: string; value: number; sets?: number }[]
  trend: 'improving' | 'plateau' | 'declining'
  currentBest: number
  daysSinceLastPR: number
  sessionsStuck?: number
}

export interface TrainingContext {
  supercompensation: Record<string, number>
  forecastInsights: { category: string; trend: string; message: string }[]
  muscleScores: { muscle: string; score: number }[]
  trainingHours: { category: string; totalHours: number; hoursThisWeek: number; lastActivityDaysAgo: number }[]
  recoveryScore: number
  categorySoreness: { category: string; score: number }[]
  exerciseHistory: ExerciseHistoryEntry[]
  progressionChains: { chainName: string; currentExercise: string; nextExercise: string | null }[]
  availableExercises: { id: string; name: string; category: string; type: string; equipment?: string[] }[]
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

function computeExerciseTrend(logs: CalisthenicsLog[]): ExerciseHistoryEntry | null {
  if (logs.length < 3) return null

  const exerciseId = logs[0].exerciseId
  const def = getExerciseDef(exerciseId)
  if (!def) return null

  // De-duplicate by date — take max value per day
  const byDate = new Map<string, { value: number; sets?: number }>()
  for (const log of logs) {
    const existing = byDate.get(log.date)
    if (!existing || log.value > existing.value) {
      byDate.set(log.date, { value: log.value, sets: log.sets })
    }
  }

  const sorted = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }))

  if (sorted.length < 3) return null

  const recent = sorted.slice(-8)

  // Trend: compare avg of last 3 vs first 3
  const last3 = recent.slice(-3)
  const first3 = recent.slice(0, 3)
  const avgLast = last3.reduce((s, v) => s + v.value, 0) / last3.length
  const avgFirst = first3.reduce((s, v) => s + v.value, 0) / first3.length

  let trend: 'improving' | 'plateau' | 'declining'
  const threshold = avgFirst * 0.05

  if (avgLast > avgFirst + threshold) {
    trend = 'improving'
  } else if (avgLast < avgFirst - threshold) {
    trend = 'declining'
  } else {
    trend = 'plateau'
  }

  // Plateau override: last 5 values within 10% of each other
  if (recent.length >= 5) {
    const last5 = recent.slice(-5)
    const max5 = Math.max(...last5.map((v) => v.value))
    const min5 = Math.min(...last5.map((v) => v.value))
    if (max5 > 0 && (max5 - min5) / max5 <= 0.1) {
      const priorMax = Math.max(...sorted.slice(0, -5).map((v) => v.value), 0)
      if (max5 <= priorMax || sorted.length <= 5) {
        trend = 'plateau'
      }
    }
  }

  // PR detection
  const currentBest = Math.max(...sorted.map((v) => v.value))
  const prDate = sorted.filter((v) => v.value === currentBest).pop()!.date
  const now = new Date()
  const daysSinceLastPR = Math.floor((now.getTime() - new Date(prDate).getTime()) / 86400000)

  // Sessions stuck (for plateaus)
  let sessionsStuck: number | undefined
  if (trend === 'plateau') {
    const values = sorted.map((v) => v.value)
    const best = Math.max(...values)
    let stuck = 0
    for (let i = values.length - 1; i >= 0; i--) {
      if (values[i] < best) stuck++
      else break
    }
    sessionsStuck = stuck > 0 ? stuck : sorted.length
  }

  return {
    exerciseId,
    name: def.name,
    category: def.category,
    type: def.type,
    unit: def.unit,
    recentSessions: recent,
    trend,
    currentBest,
    daysSinceLastPR,
    sessionsStuck,
  }
}

function computeProgressionState(calLogs: CalisthenicsLog[]) {
  const bestByExercise = new Map<string, number>()
  for (const log of calLogs) {
    const existing = bestByExercise.get(log.exerciseId) ?? 0
    if (log.value > existing) bestByExercise.set(log.exerciseId, log.value)
  }

  return PROGRESSION_CHAINS.map((chain) => {
    let currentIdx = 0
    for (let i = chain.nodes.length - 1; i >= 0; i--) {
      const node = chain.nodes[i]
      const best = bestByExercise.get(node.exerciseId)
      if (best !== undefined && best > 0) {
        currentIdx = i
        break
      }
    }

    const currentNode = chain.nodes[currentIdx]
    const nextNode = chain.nodes[currentIdx + 1] ?? null
    const currentDef = getExerciseDef(currentNode.exerciseId)
    const nextDef = nextNode ? getExerciseDef(nextNode.exerciseId) : null

    return {
      chainName: chain.label,
      currentExercise: currentDef?.name ?? currentNode.exerciseId,
      nextExercise: nextDef?.name ?? null,
    }
  })
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

  // Exercise-specific history — group by exerciseId, compute trends
  const logsByExercise = new Map<CalisthenicsExerciseId, CalisthenicsLog[]>()
  for (const log of calLogs) {
    const existing = logsByExercise.get(log.exerciseId) ?? []
    existing.push(log)
    logsByExercise.set(log.exerciseId, existing)
  }

  const exerciseHistory: ExerciseHistoryEntry[] = []
  for (const [, logs] of logsByExercise) {
    const entry = computeExerciseTrend(logs)
    if (entry) exerciseHistory.push(entry)
  }
  // Sort by most recent activity, take top 15
  exerciseHistory.sort((a, b) => {
    const aLast = a.recentSessions[a.recentSessions.length - 1]?.date ?? ''
    const bLast = b.recentSessions[b.recentSessions.length - 1]?.date ?? ''
    return bLast.localeCompare(aLast)
  })
  const topExerciseHistory = exerciseHistory.slice(0, 15)

  // Progression chains state
  const progressionChains = computeProgressionState(calLogs)

  // Available exercises (filtered by equipment)
  const userEquipment = prefs?.availableEquipment ?? []
  const availableExercises = CALISTHENICS_EXERCISES
    .filter((e) => {
      if (!e.equipment || e.equipment.length === 0) return true
      return e.equipment.some((eq) => userEquipment.includes(eq))
    })
    .map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      type: e.type,
      equipment: e.equipment,
    }))

  return {
    supercompensation,
    forecastInsights,
    muscleScores,
    trainingHours,
    recoveryScore,
    categorySoreness,
    exerciseHistory: topExerciseHistory,
    progressionChains,
    availableExercises,
    weekNumber: getWeekNumber(),
    preferredSessionMin: prefs?.sportDurations?.calisthenics ?? 20,
    availableEquipment: userEquipment,
    activeSports: prefs?.activeSports ?? ['mobility', 'bjj', 'calisthenics'],
  }
}
