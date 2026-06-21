import { db, type SorenessArea, type ProgressionKey } from '../db/db'
import { todayIso, isoDate, addDays, dayName } from './date'

export interface PlanItem {
  id: string
  label: string
  durationMin: number
  /** route within Mobility / Recovery pages to start this item */
  target: { tab: 'morning' | 'bjj_release' | ProgressionKey | 'recovery'; area?: SorenessArea }
  done: boolean
  /** 0-100, based on actualSec/plannedSec of the matching session, if any */
  percent: number
}

export interface TodayPlan {
  recoveryScore: number
  items: PlanItem[]
  totalMin: number
  rationale: string
  context: {
    bjjYesterday: boolean
    bjjToday: boolean
    restYesterday: boolean
    soreAreasToday: SorenessArea[]
  }
}

/**
 * Core rule-based recommendation engine.
 *
 * Future integration hook: if `healthMetrics` for today/yesterday exist
 * (Apple Health / Garmin sync), `recoveryScore` and the soreness-driven
 * exclusions below can be refined using HRV / sleep / training readiness.
 * For now the score is a deterministic heuristic based on:
 *  - whether BJJ happened yesterday (recovery focus today)
 *  - whether BJJ is scheduled today (pre-BJJ "primer" item, not heavy work)
 *  - logged soreness today
 *  - current streak (consistency bonus)
 */
export async function generateTodayPlan(): Promise<TodayPlan> {
  const today = new Date()
  const yesterday = addDays(today, -1)

  const todayStr = todayIso()
  const yesterdayStr = isoDate(yesterday)

  const prefs = await db.preferences.get(1)
  const bjjDays = prefs?.bjjDays ?? ['Mon', 'Wed']

  // Did BJJ happen yesterday? Check explicit log first, fall back to scheduled days.
  const bjjLogYesterday = await db.bjjLogs.where('date').equals(yesterdayStr).first()
  const bjjYesterday = bjjLogYesterday
    ? bjjLogYesterday.attended
    : bjjDays.includes(dayName(yesterday))

  // Is BJJ scheduled (or already logged) for today?
  const bjjLogToday = await db.bjjLogs.where('date').equals(todayStr).first()
  const bjjToday = bjjLogToday ? bjjLogToday.attended : bjjDays.includes(dayName(today))

  // Soreness logged today
  const sorenessToday = await db.sorenessLogs.where('date').equals(todayStr).first()
  const soreAreasToday: SorenessArea[] = sorenessToday?.areas ?? []

  // Was yesterday a rest day (no session completed and no BJJ)?
  const sessionsYesterday = await db.sessions.where('date').equals(yesterdayStr).count()
  const restYesterday = !bjjYesterday && sessionsYesterday === 0

  // Streak (for score bonus)
  const streak = await computeStreak()

  // Phase progress (to pick which exercise to recommend on rest/mobility days)
  const phaseProgress = await db.phaseProgress.toArray()
  const phaseMap = new Map(phaseProgress.map((p) => [p.exerciseKey, p]))

  const items: PlanItem[] = []

  if (bjjYesterday) {
    // Post-BJJ recovery focus: morning mobility + hip recovery + neck decompression
    // Avoid: max pancake stretch, heavy compression work
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
    // Rest yesterday -> push progressions: pancake (straddle), pike, L-sit compression
    items.push({
      id: 'morning',
      label: 'Morning mobility',
      durationMin: 10,
      target: { tab: 'morning' },
      done: false,
      percent: 0
    })
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
    // Default mobility day: full hip mobility block
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

  // BJJ scheduled today: add a light pre-class primer, and trim load so the
  // plan isn't asking for max-effort stretches right before training.
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

  // Inject any extra soreness-driven recovery (e.g. user logged sore shoulders
  // even on a non-BJJ day) without duplicating an already-present area.
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

  // Reflect real progress: each item's percent comes from the matching
  // session's actual logged percent (set by upsertTodaySession as the
  // user completes exercises within that routine/progression).
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
  let score = 100
  if (bjjYesterday) score -= 12
  score -= soreAreasToday.length * 6
  score += Math.min(streak, 5) * 1.5
  score = Math.max(35, Math.min(98, Math.round(score)))

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
  if (soreAreasToday.length > 0) {
    rationale += ` Extra focus added for: ${soreAreasToday.map((a) => a.replace('_', ' ')).join(', ')}.`
  }

  return {
    recoveryScore: score,
    items,
    totalMin,
    rationale,
    context: { bjjYesterday, bjjToday, restYesterday, soreAreasToday }
  }
}

/** Consecutive days (including today, if already done) with at least one completed session. */
export async function computeStreak(): Promise<number> {
  const sessions = await db.sessions.toArray()
  if (sessions.length === 0) return 0

  const dates = new Set(sessions.map((s) => s.date))
  let streak = 0
  let cursor = new Date()

  // If nothing done today yet, start counting from yesterday so the streak
  // doesn't immediately drop to 0 before the user does today's session.
  if (!dates.has(isoDate(cursor))) {
    cursor = addDays(cursor, -1)
  }

  while (dates.has(isoDate(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return streak
}

/** Longest run of consecutive days with at least one completed session, ever. */
export async function computeLongestStreak(): Promise<number> {
  const sessions = await db.sessions.toArray()
  if (sessions.length === 0) return 0

  const dates = Array.from(new Set(sessions.map((s) => s.date))).sort()
  let longest = 1
  let current = 1

  for (let i = 1; i < dates.length; i++) {
    // Parse as local dates (YYYY-MM-DD with no time component defaults to
    // local midnight via the Date(y, m, d) constructor, unlike new Date(str)
    // which parses as UTC and can misjudge day gaps near midnight).
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

export type { ProgressionKey }
