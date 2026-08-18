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
}

const BASELINE = 100
// Hard session (red zone): big dip, supercompensation
const HARD_FATIGUE_DIP = 12
const SUPERCOMP_GAIN = 6
// Maintenance session: small dip, recovers to same level
const MAINT_FATIGUE_DIP = 4
const RECOVERY_DAYS = 2
const DECAY_RATE = 0.12
// Below-baseline decay after prolonged inactivity
const INACTIVITY_THRESHOLD_DAYS = 10
const BELOW_BASELINE_DECAY = 0.015
// Intensity threshold: daily volume must be >= 70% of running best to trigger supercompensation
const INTENSITY_THRESHOLD = 0.7

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

interface DayVolume {
  volume: number
  isHard: boolean
}

export function computeSupercompensation(
  calLogs: CalisthenicsLog[],
  bjjLogs: BjjClassLog[],
  days: number = 90,
  sessions: CompletedSession[] = []
): DayPoint[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - days + 1)

  // Build per-category daily volume and compute running best
  const dailyVolume = new Map<string, Map<FitnessCategory, number>>()

  for (const log of calLogs) {
    const cat = getExerciseCategory(log.exerciseId)
    if (!cat) continue
    if (!dailyVolume.has(log.date)) dailyVolume.set(log.date, new Map())
    const dayMap = dailyVolume.get(log.date)!
    dayMap.set(cat, (dayMap.get(cat) ?? 0) + log.value * (log.sets ?? 1))
  }

  for (const log of bjjLogs) {
    if (!dailyVolume.has(log.date)) dailyVolume.set(log.date, new Map())
    const dayMap = dailyVolume.get(log.date)!
    const mins = (log.technicalMins ?? 0) + (log.sparringMins ?? 0) * 2
    dayMap.set('grappling', (dayMap.get('grappling') ?? 0) + mins)
  }

  // Mobility sessions → muscle group volume (seconds held)
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

  // Compute running best per category (max daily volume seen so far)
  const categories: FitnessCategory[] = ['push', 'pull', 'legs', 'core', 'grappling', 'mob_hips', 'mob_hamstrings', 'mob_lats']
  const runningBest: Record<FitnessCategory, number> = {
    push: 0, pull: 0, legs: 0, core: 0, grappling: 0,
    mob_hips: 0, mob_hamstrings: 0, mob_lats: 0,
  }

  // Pre-compute: scan all dates in chronological order to set running bests
  const allDates = Array.from(dailyVolume.keys()).sort()
  const dateBestSnapshot = new Map<string, Record<FitnessCategory, number>>()
  for (const date of allDates) {
    const dayMap = dailyVolume.get(date)!
    for (const cat of categories) {
      const vol = dayMap.get(cat) ?? 0
      if (vol > runningBest[cat]) runningBest[cat] = vol
    }
    dateBestSnapshot.set(date, { ...runningBest })
  }

  // Reset for simulation
  const simBest: Record<FitnessCategory, number> = {
    push: 0, pull: 0, legs: 0, core: 0, grappling: 0,
    mob_hips: 0, mob_hamstrings: 0, mob_lats: 0,
  }

  const initState = () => ({ level: BASELINE, daysSinceTraining: 999, lastWasHard: false, everTrained: false, levelAtDip: BASELINE })
  const state: Record<FitnessCategory, { level: number; daysSinceTraining: number; lastWasHard: boolean; everTrained: boolean; levelAtDip: number }> = {
    push: initState(), pull: initState(), legs: initState(), core: initState(),
    grappling: initState(), mob_hips: initState(), mob_hamstrings: initState(), mob_lats: initState(),
  }

  const result: DayPoint[] = []
  const cursor = new Date(startDate)

  for (let d = 0; d < days; d++) {
    const dateStr = cursor.toISOString().slice(0, 10)
    const dayMap = dailyVolume.get(dateStr)

    for (const cat of categories) {
      const s = state[cat]
      const volume = dayMap?.get(cat) ?? 0

      if (volume > 0) {
        if (volume > simBest[cat]) simBest[cat] = volume
        s.everTrained = true
        const threshold = simBest[cat] * INTENSITY_THRESHOLD
        const isHard = volume >= threshold || simBest[cat] === 0

        if (isHard) {
          s.level = s.level - HARD_FATIGUE_DIP
          s.lastWasHard = true
        } else {
          s.level = s.level - MAINT_FATIGUE_DIP
          s.lastWasHard = false
        }
        s.levelAtDip = s.level
        s.daysSinceTraining = 0
      } else {
        s.daysSinceTraining++

        if (s.daysSinceTraining <= RECOVERY_DAYS) {
          // Recovery: compute peak from the DIP level (not current level)
          const peak = s.lastWasHard
            ? s.levelAtDip + HARD_FATIGUE_DIP + SUPERCOMP_GAIN
            : s.levelAtDip + MAINT_FATIGUE_DIP
          const t = s.daysSinceTraining / RECOVERY_DAYS
          s.level = s.levelAtDip + (peak - s.levelAtDip) * Math.pow(t, 0.6)
        } else if (s.level > BASELINE) {
          // Detraining: decay back toward baseline
          s.level = BASELINE + (s.level - BASELINE) * (1 - DECAY_RATE)
          if (s.level - BASELINE < 0.3) s.level = BASELINE
        } else if (s.level < BASELINE && s.daysSinceTraining <= INACTIVITY_THRESHOLD_DAYS) {
          // Still recovering from deep fatigue
          s.level = s.level + (BASELINE - s.level) * 0.2
        } else if (s.daysSinceTraining > INACTIVITY_THRESHOLD_DAYS && s.everTrained) {
          // Slow decay below baseline after 10+ days inactivity
          s.level = s.level * (1 - BELOW_BASELINE_DECAY)
        }
      }
    }

    result.push({
      date: dateStr,
      push: Math.round(state.push.level * 10) / 10,
      pull: Math.round(state.pull.level * 10) / 10,
      legs: Math.round(state.legs.level * 10) / 10,
      core: Math.round(state.core.level * 10) / 10,
      grappling: Math.round(state.grappling.level * 10) / 10,
      mob_hips: Math.round(state.mob_hips.level * 10) / 10,
      mob_hamstrings: Math.round(state.mob_hamstrings.level * 10) / 10,
      mob_lats: Math.round(state.mob_lats.level * 10) / 10,
    })

    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}
