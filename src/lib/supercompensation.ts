import type { CalisthenicsLog, BjjClassLog, CompletedSession } from '../db/db'
import { CALISTHENICS_EXERCISES, type ExerciseCategory } from '../data/calisthenics'

export type FitnessCategory = 'push' | 'pull' | 'legs' | 'core' | 'grappling' | 'mob_hips' | 'mob_hamstrings' | 'mob_lats'

export interface DayPoint {
  date: string
  push: number
  pull: number
  legs: number
  core: number
  grappling: number
  mob_hips: number
  mob_hamstrings: number
  mob_lats: number
  isForecast?: boolean
}

// Banister Two-Factor Model: P(t) = P₀ + Σ[k₁·wᵢ·e^(-(t-tᵢ)/τ₁)] - Σ[k₂·wᵢ·e^(-(t-tᵢ)/τ₂)]
// τ₁ = fitness adaptation time constant (slow gain, slow decay)
// τ₂ = fatigue time constant (fast onset, fast decay)
// k₁ = fitness gain coefficient
// k₂ = fatigue coefficient (k₂ > k₁ → immediate dip after training)

const BASELINE = 100

interface BanisterParams {
  tau1: number  // fitness time constant (days)
  tau2: number  // fatigue time constant (days)
  k1: number   // fitness gain multiplier
  k2: number   // fatigue multiplier
}

const STRENGTH_PARAMS: BanisterParams = { tau1: 21, tau2: 3, k1: 1, k2: 2.2 }
const GRAPPLING_PARAMS: BanisterParams = { tau1: 25, tau2: 4, k1: 1, k2: 2 }
const MOBILITY_PARAMS: BanisterParams = { tau1: 30, tau2: 1.5, k1: 1, k2: 1.8 }

const CATEGORY_PARAMS: Record<FitnessCategory, BanisterParams> = {
  push: STRENGTH_PARAMS,
  pull: STRENGTH_PARAMS,
  legs: STRENGTH_PARAMS,
  core: STRENGTH_PARAMS,
  grappling: GRAPPLING_PARAMS,
  mob_hips: MOBILITY_PARAMS,
  mob_hamstrings: MOBILITY_PARAMS,
  mob_lats: MOBILITY_PARAMS,
}

// Base impulse for a "standard hard session" — scaled by actual volume/best volume
const BASE_IMPULSE = 8

// Density: rest time affects impulse magnitude
// Reference rest = 90s between sets. Shorter rest = higher density = bigger impulse.
const REFERENCE_REST_SEC = 90
const DENSITY_MIN = 0.7
const DENSITY_MAX = 1.5

// Atrophy: additional detraining below baseline after extended inactivity
const ATROPHY_THRESHOLD_DAYS = 10
const ATROPHY_RATE = 0.4
const ATROPHY_FLOOR = 70

// Mobility exercise → muscle group mapping
const MOBILITY_MUSCLE_MAP: Record<string, FitnessCategory[]> = {
  forward_fold: ['mob_hamstrings'],
  ninety_ninety: ['mob_hips'],
  figure_four: ['mob_hips'],
  hip_flexor_lunge: ['mob_hips', 'mob_hamstrings'],
  pancake: ['mob_hips', 'mob_hamstrings'],
  pigeon_pose: ['mob_hips'],
  butterfly: ['mob_hips'],
  deep_squat: ['mob_hips'],
  lizard: ['mob_hips'],
  couch_stretch: ['mob_hips', 'mob_hamstrings'],
  low_lunge_hip_flexor: ['mob_hips'],
  half_forward_fold: ['mob_hamstrings'],
  standing_hamstring_stretch: ['mob_hamstrings'],
  calf_stretch: ['mob_hamstrings'],
  lat_hang: ['mob_lats'],
  thread_needle: ['mob_lats'],
  doorway_pec_stretch: ['mob_lats'],
  shoulder_pass_through: ['mob_lats'],
  lunge_rotation: ['mob_lats', 'mob_hips'],
  downward_dog: ['mob_hamstrings', 'mob_lats'],
  cat_cow: ['mob_lats'],
  dead_hang: ['mob_lats'],
  pike_stretch: ['mob_hamstrings'],
  childs_pose: ['mob_hips', 'mob_lats'],
  shoulder_stand: ['mob_lats'],
  pelvic_clock: ['mob_hips'],
  pelvic_tilt: ['mob_hips'],
}

function getExerciseCategory(exerciseId: string): ExerciseCategory | null {
  const def = CALISTHENICS_EXERCISES.find((e) => e.id === exerciseId)
  return def?.category ?? null
}

interface TrainingImpulse {
  dayIndex: number
  w: number
}

export function computeSupercompensation(
  calLogs: CalisthenicsLog[],
  bjjLogs: BjjClassLog[],
  days: number = 90,
  sessions: CompletedSession[] = [],
  forecastDays: number = 0
): DayPoint[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - days + 1)

  // Include lookback period for impulses that started before the chart window
  const lookbackDays = 60
  const fullStartDate = new Date(startDate)
  fullStartDate.setDate(fullStartDate.getDate() - lookbackDays)

  function dateToDayIndex(dateStr: string): number {
    const d = new Date(dateStr)
    d.setHours(0, 0, 0, 0)
    return Math.round((d.getTime() - fullStartDate.getTime()) / 86400000)
  }

  const chartStartIndex = lookbackDays

  // Build per-category daily volume (density-weighted)
  const categories: FitnessCategory[] = ['push', 'pull', 'legs', 'core', 'grappling', 'mob_hips', 'mob_hamstrings', 'mob_lats']
  const dailyVolume = new Map<string, Map<FitnessCategory, number>>()

  for (const log of calLogs) {
    const cat = getExerciseCategory(log.exerciseId)
    if (!cat) continue
    if (!dailyVolume.has(log.date)) dailyVolume.set(log.date, new Map())
    const dayMap = dailyVolume.get(log.date)!

    const isChallenge = log.notes?.startsWith('Challenge:')
    // Challenge logs store total reps in value (already summed across sets)
    const rawVolume = isChallenge ? log.value : log.value * (log.sets ?? 1)

    let densityFactor = 1.0
    if (log.elapsedSec && log.elapsedSec > 0) {
      const sets = log.sets ?? 1
      const perSetValue = isChallenge ? log.value / sets : log.value
      const repTimeSec = log.metric === 'hold_sec' ? perSetValue : perSetValue * 3
      const refElapsed = repTimeSec * sets + REFERENCE_REST_SEC * Math.max(0, sets - 1)
      densityFactor = Math.max(DENSITY_MIN, Math.min(DENSITY_MAX, refElapsed / log.elapsedSec))
    } else if (log.restSec != null) {
      densityFactor = Math.max(DENSITY_MIN, Math.min(DENSITY_MAX, REFERENCE_REST_SEC / Math.max(10, log.restSec)))
    }

    dayMap.set(cat, (dayMap.get(cat) ?? 0) + rawVolume * densityFactor)
  }

  for (const log of bjjLogs) {
    if (!dailyVolume.has(log.date)) dailyVolume.set(log.date, new Map())
    const dayMap = dailyVolume.get(log.date)!
    const mins = (log.technicalMins ?? 0) + (log.sparringMins ?? 0) * 2
    dayMap.set('grappling', (dayMap.get('grappling') ?? 0) + mins)
  }

  for (const sess of sessions) {
    if (sess.type === 'calisthenics' || sess.type === 'bjj' || sess.type === 'custom') continue
    if (!sess.exerciseIds || sess.exerciseIds.length === 0) continue
    if (!dailyVolume.has(sess.date)) dailyVolume.set(sess.date, new Map())
    const dayMap = dailyVolume.get(sess.date)!
    const secPerExercise = (sess.actualSec || sess.durationMin * 60) / sess.exerciseIds.length
    for (const exId of sess.exerciseIds) {
      const muscles = MOBILITY_MUSCLE_MAP[exId]
      if (!muscles) continue
      for (const m of muscles) {
        dayMap.set(m, (dayMap.get(m) ?? 0) + secPerExercise)
      }
    }
  }

  // Compute running best per category and build impulse list
  const impulses: Record<FitnessCategory, TrainingImpulse[]> = {
    push: [], pull: [], legs: [], core: [], grappling: [],
    mob_hips: [], mob_hamstrings: [], mob_lats: [],
  }
  const runningBest: Record<FitnessCategory, number> = {
    push: 0, pull: 0, legs: 0, core: 0, grappling: 0,
    mob_hips: 0, mob_hamstrings: 0, mob_lats: 0,
  }
  const lastTrainingDay: Record<FitnessCategory, number> = {
    push: -999, pull: -999, legs: -999, core: -999, grappling: -999,
    mob_hips: -999, mob_hamstrings: -999, mob_lats: -999,
  }

  const allDates = Array.from(dailyVolume.keys()).sort()
  for (const date of allDates) {
    const dayIdx = dateToDayIndex(date)
    const dayMap = dailyVolume.get(date)!
    for (const cat of categories) {
      const vol = dayMap.get(cat) ?? 0
      if (vol <= 0) continue
      if (vol > runningBest[cat]) runningBest[cat] = vol
      // Impulse magnitude: scaled by intensity relative to running best
      const intensity = runningBest[cat] > 0 ? Math.min(1, vol / runningBest[cat]) : 1
      const w = BASE_IMPULSE * (0.4 + 0.6 * intensity) // minimum 40% impulse even for light sessions
      impulses[cat].push({ dayIndex: dayIdx, w })
      lastTrainingDay[cat] = dayIdx
    }
  }

  // Compute chart points using Banister summation
  const result: DayPoint[] = []
  const totalDays = lookbackDays + days + forecastDays
  const todayIndex = lookbackDays + days - 1

  for (let d = chartStartIndex; d < totalDays; d++) {
    const point: Partial<DayPoint> = {}
    const cursor = new Date(fullStartDate)
    cursor.setDate(cursor.getDate() + d)
    point.date = cursor.toISOString().slice(0, 10)
    if (d > todayIndex) point.isForecast = true

    for (const cat of categories) {
      const params = CATEGORY_PARAMS[cat]
      const catImpulses = impulses[cat]
      let fitness = 0
      let fatigue = 0

      for (const imp of catImpulses) {
        const t = d - imp.dayIndex
        if (t < 0) continue
        fitness += params.k1 * imp.w * Math.exp(-t / params.tau1)
        fatigue += params.k2 * imp.w * Math.exp(-t / params.tau2)
      }

      let level = BASELINE + fitness - fatigue

      // Atrophy: detraining below baseline after extended inactivity
      const daysSinceLast = d - lastTrainingDay[cat]
      const everTrained = catImpulses.length > 0 && lastTrainingDay[cat] >= 0
      if (everTrained && daysSinceLast > ATROPHY_THRESHOLD_DAYS) {
        const atrophyDays = daysSinceLast - ATROPHY_THRESHOLD_DAYS
        const atrophy = ATROPHY_RATE * atrophyDays
        level -= atrophy
        if (level < ATROPHY_FLOOR) level = ATROPHY_FLOOR
      }

      ;(point as any)[cat] = Math.round(level * 10) / 10
    }

    result.push(point as DayPoint)
  }

  return result
}

export interface ForecastInsight {
  category: FitnessCategory
  peakDay: number // days from today
  peakValue: number
  declineStartDay: number // days from today where decline begins
}

export function computeForecastInsights(data: DayPoint[]): ForecastInsight[] {
  const forecastPoints = data.filter((d) => d.isForecast)
  const todayPoint = data.find((d) => !d.isForecast && data.indexOf(d) === data.filter(p => !p.isForecast).length - 1)
    || data[data.length - forecastPoints.length - 1]
  if (!todayPoint || forecastPoints.length < 2) return []

  const categories: FitnessCategory[] = ['push', 'pull', 'legs', 'core', 'grappling', 'mob_hips', 'mob_hamstrings', 'mob_lats']
  const insights: ForecastInsight[] = []

  for (const cat of categories) {
    const currentVal = (todayPoint as any)[cat] as number
    if (currentVal === 100) continue

    let peakVal = currentVal
    let peakIdx = 0
    let declineStart = forecastPoints.length

    for (let i = 0; i < forecastPoints.length; i++) {
      const val = (forecastPoints[i] as any)[cat] as number
      if (val > peakVal) {
        peakVal = val
        peakIdx = i
      }
    }

    // Find where decline begins (first point after peak where value drops)
    for (let i = peakIdx + 1; i < forecastPoints.length; i++) {
      const val = (forecastPoints[i] as any)[cat] as number
      const prev = (forecastPoints[i - 1] as any)[cat] as number
      if (val < prev - 0.3) {
        declineStart = i
        break
      }
    }

    if (peakVal > 103) {
      insights.push({
        category: cat,
        peakDay: peakIdx + 1,
        peakValue: peakVal,
        declineStartDay: declineStart + 1,
      })
    }
  }

  return insights.sort((a, b) => a.peakDay - b.peakDay)
}
