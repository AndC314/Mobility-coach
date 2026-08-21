import { db, type SorenessArea, type ProgressionKey, type SportDurations, DEFAULT_SPORT_DURATIONS } from '../db/db'
import { PROGRESSIONS } from '../data/exercises'
import { todayIso, isoDate, addDays, dayName } from './date'
import {
  computeMuscleSorenessDecay,
  computeCategorySoreness,
  type BiometricModifiers,
  type DecayInput,
  type CategorySoreness,
  type MovementCategory
} from '../data/muscleMap'
import { RECOVERY_SEQUENCES } from '../data/recovery'
import { computeDeloadStatus, type DeloadStatus } from './supercompensation'

/**
 * Pure recovery score formula — extracted for testability.
 * Score = 100 - 12*bjjYesterday - 6*soreAreas + min(streak,5)*1.5 - 8*suppressedCategories
 * Clamped [35, 98].
 */
export function computeRecoveryScore(params: {
  bjjYesterday: boolean
  soreAreasCount: number
  streak: number
  suppressedCount: number
}): number {
  let score = 100
  if (params.bjjYesterday) score -= 12
  score -= params.soreAreasCount * 6
  score += Math.min(params.streak, 5) * 1.5
  score -= params.suppressedCount * 8
  return Math.max(35, Math.min(98, Math.round(score)))
}

export interface PlanItem {
  id: string
  label: string
  durationMin: number
  target: { tab: 'morning' | 'bjj_release' | ProgressionKey | 'recovery' | 'calisthenics'; area?: SorenessArea }
  done: boolean
  percent: number
}

export interface TodayPlan {
  recoveryScore: number
  items: PlanItem[]
  totalMin: number
  rationale: string
  categorySoreness: CategorySoreness[]
  deloadCategories: string[]
  context: {
    bjjYesterday: boolean
    bjjToday: boolean
    restYesterday: boolean
    soreAreasToday: SorenessArea[]
    suppressedCategories: MovementCategory[]
  }
}

// ─────────────────────────────────────────────────────────────────────────
// RECOVERY-AWARE RECOMMENDATION ENGINE
//
// Integrates the 48h exponential decay model into the daily plan generator.
// When a muscle category's avg soreness > 30%, heavy training for that
// group is suppressed and replaced with targeted recovery drills.
// ─────────────────────────────────────────────────────────────────────────

async function loadDecayInputs(): Promise<DecayInput[]> {
  const logs = await db.calisthenicsLogs.toArray()
  return logs.map((log) => ({
    exerciseId: log.exerciseId,
    value: log.value,
    loggedAt: new Date(log.createdAt).getTime()
  }))
}

export async function generateTodayPlan(
  biometrics?: BiometricModifiers
): Promise<TodayPlan> {
  const today = new Date()
  const yesterday = addDays(today, -1)

  const todayStr = todayIso()
  const yesterdayStr = isoDate(yesterday)

  const prefs = await db.preferences.get(1)
  const bjjDays = prefs?.bjjDays ?? ['Mon', 'Wed']
  const sportDurations: SportDurations = prefs?.sportDurations ?? DEFAULT_SPORT_DURATIONS

  const bjjLogYesterday = await db.bjjClassLogs.where('date').equals(yesterdayStr).first()
  const bjjYesterday = bjjLogYesterday != null
    ? true
    : bjjDays.includes(dayName(yesterday))

  const bjjLogToday = await db.bjjClassLogs.where('date').equals(todayStr).first()
  const bjjToday = bjjLogToday != null ? true : bjjDays.includes(dayName(today))

  const sorenessToday = await db.sorenessLogs.where('date').equals(todayStr).first()
  const soreAreasToday: SorenessArea[] = sorenessToday?.areas ?? []

  const sessionsYesterday = await db.sessions.where('date').equals(yesterdayStr).count()
  const restYesterday = !bjjYesterday && sessionsYesterday === 0

  const streak = await computeStreak()
  const phaseProgress = await db.phaseProgress.toArray()
  const phaseMap = new Map(phaseProgress.map((p) => [p.exerciseKey, p]))

  // ── Compute muscle decay state ──────────────────────────────────────
  const decayInputs = await loadDecayInputs()
  const muscleSoreness = computeMuscleSorenessDecay(
    decayInputs,
    Date.now(),
    biometrics
  )
  const categorySoreness = computeCategorySoreness(muscleSoreness)
  const suppressedCategories = categorySoreness
    .filter((c) => c.isRecovering)
    .map((c) => c.category)

  const items: PlanItem[] = []

  if (bjjYesterday) {
    items.push({
      id: 'morning',
      label: 'Morning mobility',
      durationMin: 10,
      target: { tab: 'morning' },
      done: false,
      percent: 0
    })
    items.push({
      id: 'hip_recovery',
      label: 'Hip recovery',
      durationMin: 11,
      target: { tab: 'recovery', area: 'hips' },
      done: false,
      percent: 0
    })
    items.push({
      id: 'neck_decompression',
      label: 'Neck decompression',
      durationMin: 6,
      target: { tab: 'recovery', area: 'neck' },
      done: false,
      percent: 0
    })
  } else if (restYesterday) {
    items.push({
      id: 'morning',
      label: 'Morning mobility',
      durationMin: 10,
      target: { tab: 'morning' },
      done: false,
      percent: 0
    })

    // Only recommend push progressions if push category is not suppressed
    if (!suppressedCategories.includes('push') && !suppressedCategories.includes('core')) {
      items.push({
        id: 'pancake',
        label: `Pancake progression · Phase ${phaseMap.get('straddle')?.phase ?? 1}`,
        durationMin: 8,
        target: { tab: 'straddle' },
        done: false,
        percent: 0
      })
      items.push({
        id: 'pike',
        label: `Pike / L-sit compression · Phase ${phaseMap.get('pike')?.phase ?? 1}`,
        durationMin: 7,
        target: { tab: 'pike' },
        done: false,
        percent: 0
      })
    } else {
      // Substitute recovery for the suppressed categories
      items.push({
        id: 'active_recovery_core',
        label: 'Active recovery (core/hip)',
        durationMin: 9,
        target: { tab: 'recovery', area: 'lower_back' },
        done: false,
        percent: 0
      })
    }
  } else {
    items.push({
      id: 'morning',
      label: 'Morning mobility',
      durationMin: 10,
      target: { tab: 'morning' },
      done: false,
      percent: 0
    })
    items.push({
      id: 'ninety_ninety',
      label: `90/90 · Phase ${phaseMap.get('90/90')?.phase ?? 1}`,
      durationMin: 6,
      target: { tab: '90/90' },
      done: false,
      percent: 0
    })
    items.push({
      id: 'straddle',
      label: `Straddle · Phase ${phaseMap.get('straddle')?.phase ?? 1}`,
      durationMin: 6,
      target: { tab: 'straddle' },
      done: false,
      percent: 0
    })
    items.push({
      id: 'pike',
      label: `Pike · Phase ${phaseMap.get('pike')?.phase ?? 1}`,
      durationMin: 6,
      target: { tab: 'pike' },
      done: false,
      percent: 0
    })
  }

  if (bjjToday) {
    items.push({
      id: 'bjj_primer',
      label: 'Pre-BJJ primer (hips + shoulders)',
      durationMin: 8,
      target: { tab: '90/90' },
      done: false,
      percent: 0
    })
  }

  // Inject soreness-driven recovery for suppressed categories
  for (const cat of suppressedCategories) {
    const mappedArea = categoryToRecoveryArea(cat)
    if (!mappedArea) continue
    const alreadyCovered = items.some(
      (i) => i.target.tab === 'recovery' && i.target.area === mappedArea
    )
    if (!alreadyCovered) {
      const seq = RECOVERY_SEQUENCES[mappedArea]
      items.push({
        id: `decay_recovery_${cat}`,
        label: `${cat} recovery (active)`,
        durationMin: seq?.durationMin ?? 8,
        target: { tab: 'recovery', area: mappedArea },
        done: false,
        percent: 0
      })
    }
  }

  // Inject explicit soreness-logged recovery
  for (const area of soreAreasToday) {
    const alreadyCovered = items.some(
      (i) => i.target.tab === 'recovery' && i.target.area === area
    )
    if (!alreadyCovered) {
      items.push({
        id: `soreness_${area}`,
        label: `${area.replace('_', ' ')} recovery`,
        durationMin: area === 'neck' ? 6 : area === 'shoulders' ? 8 : 9,
        target: { tab: 'recovery', area },
        done: false,
        percent: 0
      })
    }
  }

  // Add calisthenics session if user has training history and categories are available
  const calLogsCount = await db.calisthenicsLogs.count()
  if (calLogsCount > 0 && suppressedCategories.length < 4) {
    const calTarget = sportDurations.calisthenics ?? 20
    const availableCats = 4 - suppressedCategories.length
    const estMin = Math.min(calTarget, availableCats >= 3 ? calTarget : Math.round(calTarget * 0.6))
    items.push({
      id: 'calisthenics_session',
      label: 'Strength session',
      durationMin: estMin,
      target: { tab: 'calisthenics' },
      done: false,
      percent: 0
    })
  }

  // Scale mobility items to fit the mobility duration preference
  const mobilityTarget = sportDurations.mobility ?? 10
  const mobilityItems = items.filter(i =>
    i.target.tab !== 'calisthenics' && i.target.tab !== 'recovery'
  )
  const mobilityTotal = mobilityItems.reduce((s, i) => s + i.durationMin, 0)
  if (mobilityTotal > 0 && mobilityTotal > mobilityTarget * 1.5) {
    const scale = mobilityTarget / mobilityTotal
    for (const item of mobilityItems) {
      item.durationMin = Math.max(3, Math.round(item.durationMin * scale))
    }
  }

  // Reflect real progress from today's sessions
  const sessionsToday = await db.sessions.where('date').equals(todayStr).toArray()
  for (const item of items) {
    const match = sessionsToday.find((s) => s.label === item.label)
    if (match) {
      item.percent = match.percent ?? 0
      item.done = item.percent >= 100
    }
  }

  const totalMin = items.reduce((sum, i) => sum + i.durationMin, 0)

  // ── Recovery score heuristic ───────────────────────────────────────────
  const score = computeRecoveryScore({
    bjjYesterday,
    soreAreasCount: soreAreasToday.length,
    streak,
    suppressedCount: suppressedCategories.length,
  })

  let rationale: string
  if (bjjYesterday) {
    rationale = 'BJJ yesterday — focus on recovery, avoid heavy compression and max stretches today.'
  } else if (restYesterday) {
    rationale = 'Rest day yesterday — good window to push pancake, pike and L-sit progressions.'
  } else {
    rationale = 'Standard mobility day — full hip mobility block recommended.'
  }
  if (bjjToday) {
    rationale += ' BJJ scheduled today — a short primer is included; save the deep stretches for after class.'
  }
  if (suppressedCategories.length > 0) {
    rationale += ` Recovery mode active for: ${suppressedCategories.join(', ')} (>30% soreness via decay model).`
  }
  if (soreAreasToday.length > 0) {
    rationale += ` Extra focus added for: ${soreAreasToday.map((a) => a.replace('_', ' ')).join(', ')}.`
  }

  // Deload trigger: 3+ consecutive weeks of ≥3 sessions/week per category
  const calLogs = await db.calisthenicsLogs.toArray()
  const deloadStatuses = computeDeloadStatus(calLogs)
  const deloadCategories = deloadStatuses.filter((d) => d.shouldDeload).map((d) => d.category)
  if (deloadCategories.length > 0) {
    rationale += ` Deload recommended for: ${deloadCategories.join(', ')} (3+ weeks of high frequency).`
  }

  return {
    recoveryScore: score,
    items,
    totalMin,
    rationale,
    categorySoreness,
    deloadCategories,
    context: { bjjYesterday, bjjToday, restYesterday, soreAreasToday, suppressedCategories }
  }
}

function categoryToRecoveryArea(category: MovementCategory): SorenessArea | null {
  switch (category) {
    case 'push': return 'shoulders'
    case 'pull': return 'shoulders'
    case 'legs': return 'hips'
    case 'core': return 'lower_back'
  }
}

export async function computeStreak(): Promise<number> {
  const sessions = await db.sessions.toArray()
  if (sessions.length === 0) return 0

  const dates = new Set(sessions.map((s) => s.date))
  let streak = 0
  let cursor = new Date()

  if (!dates.has(isoDate(cursor))) {
    cursor = addDays(cursor, -1)
  }

  while (dates.has(isoDate(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return streak
}

export async function computeLongestStreak(): Promise<number> {
  const sessions = await db.sessions.toArray()
  if (sessions.length === 0) return 0

  const dates = Array.from(new Set(sessions.map((s) => s.date))).sort()
  let longest = 1
  let current = 1

  for (let i = 1; i < dates.length; i++) {
    const [py, pm, pd] = dates[i - 1].split('-').map(Number)
    const [cy, cm, cd] = dates[i].split('-').map(Number)
    const prev = new Date(py, pm - 1, pd)
    const curr = new Date(cy, cm - 1, cd)
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
    if (diffDays === 1) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }

  return longest
}

export function progressionPercent(phase: 1 | 2 | 3 | 4) {
  return Math.round((phase / 4) * 100)
}

export { PROGRESSIONS }
export type { ProgressionKey }
