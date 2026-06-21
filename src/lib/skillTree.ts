// ─────────────────────────────────────────────────────────────────────────
// SKILL TREE
//
// A Sloth-style visual progress map across three branches:
//  - Mobility: 90/90, Straddle, Pike — each phase (1-4) is a tier, driven
//    by the existing `phaseProgress` + `holdLogs` tables.
//  - Calisthenics: L-sit, Handstand, Dragon Flag (from `measurements`) plus
//    Plank, Hollow Body, Push-ups, Pull-ups, Squats, Bulgarian Split Squat,
//    Australian Pull-ups, Dips (from `calisthenicsLogs`, the fundamentals
//    tracker) — tiers driven by best logged value per skill.
//  - BJJ: each `bjjSkillTag` becomes a node; "mastery" tier is driven by
//    how many logged classes reference it (frequency), via `bjjClassLogs`.
//
// This is intentionally a pure derivation layer — it reads existing data
// and computes tree state, rather than introducing a new source of truth.
// That keeps it consistent with Progress/Mobility pages automatically.
// ─────────────────────────────────────────────────────────────────────────

import { db, type ProgressionKey, type MeasurementType, type BjjSkillTag, type CalisthenicsExerciseId } from '../db/db'
import { PHASES, PROGRESSION_LABELS } from '../data/exercises'

export type NodeStatus = 'locked' | 'available' | 'in_progress' | 'mastered'

export interface SkillNode {
  id: string
  label: string
  tier: number // 1-based, position within its branch
  maxTier: number
  status: NodeStatus
  progressPercent: number // 0-100 toward the NEXT tier (0 if mastered or locked w/ no data)
  detail: string // small caption, e.g. "Phase 2 of 4" or "8s hold"
  color: string
}

export interface SkillBranch {
  id: 'mobility' | 'calisthenics' | 'bjj'
  label: string
  icon: string
  nodes: SkillNode[]
  overallPercent: number // average mastery across nodes, 0-100
}

// ─────────────────────────────────────────────────────────────────────────
// MOBILITY BRANCH
// ─────────────────────────────────────────────────────────────────────────

async function buildMobilityBranch(): Promise<SkillBranch> {
  const progressRows = await db.phaseProgress.toArray()
  const keys: ProgressionKey[] = ['90/90', 'straddle', 'pike']

  const nodes: SkillNode[] = keys.map((key) => {
    const row = progressRows.find((r) => r.exerciseKey === key)
    const phase = row?.phase ?? 1
    const checkpointMet = row?.checkpointMet ?? false
    const phaseInfo = PHASES[phase - 1]

    const status: NodeStatus = phase >= 4 && checkpointMet ? 'mastered' : phase > 1 || checkpointMet ? 'in_progress' : 'available'

    // progress toward next phase: checkpoint met = halfway there visually
    const progressPercent = status === 'mastered' ? 100 : checkpointMet ? 75 : (phase - 1) * 25

    return {
      id: `mobility_${key}`,
      label: PROGRESSION_LABELS[key],
      tier: phase,
      maxTier: 4,
      status,
      progressPercent,
      detail: `Phase ${phase} of 4 — ${phaseInfo.title}`,
      color: phaseInfo.color
    }
  })

  const overallPercent = Math.round(
    nodes.reduce((sum, n) => sum + ((n.tier - 1) / (n.maxTier - 1)) * 100, 0) / nodes.length
  )

  return { id: 'mobility', label: 'Mobility', icon: '🧘', nodes, overallPercent }
}

// ─────────────────────────────────────────────────────────────────────────
// CALISTHENICS BRANCH
// Tiers are hand-tuned thresholds per skill, roughly beginner -> advanced.
// Two data sources feed this branch:
//  - `measurements` table: L-sit, Handstand, Pull-ups, Dragon Flag (the
//    original skill-tree metrics, entered via Progress > Trends)
//  - `calisthenicsLogs` table: the fundamentals tracker (Plank, Hollow
//    Body, Push-ups, Squats, Bulgarian Squat, Australian Pull-ups, Dips)
// Pull-ups exists in both; calisthenicsLogs takes precedence if present,
// since it's the more frequently-updated source going forward.
// ─────────────────────────────────────────────────────────────────────────

interface CalSkillDef {
  type: MeasurementType
  label: string
  unit: string
  tiers: number[] // ascending thresholds, tier 1..n
}

const CAL_SKILLS: CalSkillDef[] = [
  { type: 'lsit_hold', label: 'L-sit', unit: 's', tiers: [1, 5, 10, 20, 30] },
  { type: 'handstand_hold', label: 'Handstand', unit: 's', tiers: [1, 5, 15, 30, 60] },
  { type: 'dragon_flag_negatives', label: 'Dragon Flag', unit: 'reps', tiers: [1, 3, 5, 8, 12] }
]

interface CalLogSkillDef {
  id: CalisthenicsExerciseId
  label: string
  unit: string
  tiers: number[]
}

const CAL_LOG_SKILLS: CalLogSkillDef[] = [
  { id: 'plank', label: 'Plank', unit: 's', tiers: [10, 30, 60, 90, 120] },
  { id: 'hollow_body', label: 'Hollow Body', unit: 's', tiers: [5, 15, 30, 45, 60] },
  { id: 'pushups', label: 'Push-ups', unit: 'reps', tiers: [3, 8, 15, 25, 40] },
  { id: 'pullups', label: 'Pull-ups', unit: 'reps', tiers: [1, 3, 6, 10, 15] },
  { id: 'squats', label: 'Squats', unit: 'reps', tiers: [10, 20, 35, 50, 75] },
  { id: 'bulgarian_squat', label: 'Bulgarian Split Squat', unit: 'reps', tiers: [5, 10, 15, 20, 30] },
  { id: 'australian_pullups', label: 'Australian Pull-ups', unit: 'reps', tiers: [3, 6, 10, 15, 20] },
  { id: 'dips', label: 'Dips', unit: 'reps', tiers: [1, 3, 6, 10, 15] },
  { id: 'pike_pushups', label: 'Pike Push-ups', unit: 'reps', tiers: [3, 6, 10, 15, 20] },
  { id: 'tuck_lsit', label: 'Tuck L-sit', unit: 's', tiers: [2, 5, 10, 20, 30] },
  { id: 'pistol_squat', label: 'Pistol Squat', unit: 'reps', tiers: [1, 3, 5, 8, 12] }
]

function tierForValue(value: number, tiers: number[]): number {
  let tier = 0
  for (const t of tiers) {
    if (value >= t) tier += 1
  }
  return tier // 0 = not started, up to tiers.length
}

function buildTierNode(id: string, label: string, value: number | undefined, tiers: number[], detailUnit: string): SkillNode {
  const v = value ?? 0
  const tier = tierForValue(v, tiers)
  const maxTier = tiers.length
  const status: NodeStatus = tier >= maxTier ? 'mastered' : tier > 0 ? 'in_progress' : 'available'

  let progressPercent = 0
  if (status !== 'mastered') {
    const prevThreshold = tier > 0 ? tiers[tier - 1] : 0
    const nextThreshold = tiers[tier]
    progressPercent =
      nextThreshold > prevThreshold ? Math.round(((v - prevThreshold) / (nextThreshold - prevThreshold)) * 100) : 0
    progressPercent = Math.max(0, Math.min(99, progressPercent))
  } else {
    progressPercent = 100
  }

  return {
    id,
    label,
    tier,
    maxTier,
    status,
    progressPercent,
    detail: value != null ? `${value}${detailUnit} best` : 'No data yet',
    color: '#a78bfa'
  }
}

async function buildCalisthenicsBranch(): Promise<SkillBranch> {
  const [measurements, calLogs] = await Promise.all([
    db.measurements.toArray(),
    db.calisthenicsLogs.toArray()
  ])

  const measurementNodes: SkillNode[] = CAL_SKILLS.map((skill) => {
    const history = measurements
      .filter((m) => m.type === skill.type)
      .sort((a, b) => a.date.localeCompare(b.date))
    const latest = history[history.length - 1]
    return buildTierNode(`cal_${skill.type}`, skill.label, latest?.value, skill.tiers, skill.unit)
  })

  const logNodes: SkillNode[] = CAL_LOG_SKILLS.map((skill) => {
    const history = calLogs.filter((l) => l.exerciseId === skill.id)
    const best = history.length > 0 ? Math.max(...history.map((l) => l.value)) : undefined
    return buildTierNode(`calfund_${skill.id}`, skill.label, best, skill.tiers, skill.unit)
  })

  const nodes = [...logNodes, ...measurementNodes]

  const overallPercent = Math.round(
    nodes.reduce((sum, n) => sum + (n.tier / n.maxTier) * 100, 0) / nodes.length
  )

  return { id: 'calisthenics', label: 'Calisthenics', icon: '🤸', nodes, overallPercent }
}

// ─────────────────────────────────────────────────────────────────────────
// BJJ BRANCH
// Each personal skill tag becomes a node. Mastery tier is driven by how
// many logged classes reference it — a simple, honest proxy for exposure
// (not actual competency, which the user self-assesses elsewhere).
// ─────────────────────────────────────────────────────────────────────────

const BJJ_TIERS = [1, 3, 6, 10, 16] // class-count thresholds

async function buildBjjBranch(): Promise<SkillBranch> {
  const [tags, logs] = await Promise.all([db.bjjSkillTags.toArray(), db.bjjClassLogs.toArray()])

  const counts = new Map<number, number>()
  for (const log of logs) {
    for (const tagId of log.tagIds) {
      counts.set(tagId, (counts.get(tagId) ?? 0) + 1)
    }
  }

  const nodes: SkillNode[] = tags.map((tag: BjjSkillTag) => {
    const count = counts.get(tag.id!) ?? 0
    const tier = tierForValue(count, BJJ_TIERS)
    const maxTier = BJJ_TIERS.length
    const status: NodeStatus = tier >= maxTier ? 'mastered' : tier > 0 ? 'in_progress' : 'available'

    let progressPercent = 0
    if (status !== 'mastered') {
      const prevThreshold = tier > 0 ? BJJ_TIERS[tier - 1] : 0
      const nextThreshold = BJJ_TIERS[tier]
      progressPercent =
        nextThreshold > prevThreshold
          ? Math.round(((count - prevThreshold) / (nextThreshold - prevThreshold)) * 100)
          : 0
      progressPercent = Math.max(0, Math.min(99, progressPercent))
    } else {
      progressPercent = 100
    }

    return {
      id: `bjj_${tag.id}`,
      label: tag.name,
      tier,
      maxTier,
      status,
      progressPercent,
      detail: count === 0 ? 'Not seen in class yet' : `${count} class${count === 1 ? '' : 'es'} logged`,
      color: tag.color ?? '#2ec4b6'
    }
  })

  const overallPercent = nodes.length
    ? Math.round(nodes.reduce((sum, n) => sum + (n.tier / n.maxTier) * 100, 0) / nodes.length)
    : 0

  return { id: 'bjj', label: 'BJJ', icon: '🥋', nodes, overallPercent }
}

// ─────────────────────────────────────────────────────────────────────────

export async function buildSkillTree(): Promise<SkillBranch[]> {
  const [mobility, calisthenics, bjj] = await Promise.all([
    buildMobilityBranch(),
    buildCalisthenicsBranch(),
    buildBjjBranch()
  ])
  return [mobility, calisthenics, bjj]
}
