import Dexie, { type Table } from 'dexie'

// ─────────────────────────────────────────────────────────────────────────
// CORE TYPES
// ─────────────────────────────────────────────────────────────────────────

export type ProgressionKey = '90/90' | 'straddle' | 'pike'

export type SorenessArea =
  | 'neck'
  | 'lower_back'
  | 'hips'
  | 'adductors'
  | 'shoulders'
  | 'wrists'
  | 'general_fatigue'

export type SessionType =
  | 'morning'
  | 'bjj_release'
  | 'hip_mobility'
  | 'pancake'
  | 'pike'
  | 'ninety_ninety'
  | 'recovery'
  | 'calisthenics'
  | 'custom'

export interface CompletedSession {
  id?: number
  date: string // YYYY-MM-DD
  type: SessionType
  label: string
  durationMin: number // actual minutes completed (rounded)
  plannedSec: number // total planned seconds for the routine
  actualSec: number // sum of actual seconds completed across exercises
  percent: number // round(actualSec / plannedSec * 100), clamped 0-100
  exerciseIds: string[]
  createdAt: string // ISO timestamp
}

// ─────────────────────────────────────────────────────────────────────────
// HOLD LOGS
// Records the actual held duration for a progression exercise each time
// it's completed. If "Complete" is pressed before the timer ends, the
// elapsed time (not the planned time) is recorded. Progression is then
// measured as the trend of actualSec over time per exerciseKey/phase.
// ─────────────────────────────────────────────────────────────────────────

export interface HoldLog {
  id?: number
  date: string // YYYY-MM-DD
  exerciseKey: ProgressionKey
  phase: 1 | 2 | 3 | 4
  plannedSec: number
  actualSec: number
  createdAt: string
}

export interface PhaseProgress {
  id?: number
  exerciseKey: ProgressionKey
  phase: 1 | 2 | 3 | 4
  checkpointMet: boolean
  updatedAt: string
}

export type MeasurementType =
  | 'pancake_angle' // degrees
  | 'pike_reach' // cm from toes
  | 'ninety_ninety_rom' // degrees
  | 'lsit_hold' // seconds
  | 'handstand_hold' // seconds
  | 'dragon_flag_negatives' // reps
  | 'pullups' // reps

export interface Measurement {
  id?: number
  date: string
  type: MeasurementType
  value: number
  unit: string
}

export interface SorenessLog {
  id?: number
  date: string
  areas: SorenessArea[]
}

export interface BjjLog {
  id?: number
  date: string
  attended: boolean
}

// ─────────────────────────────────────────────────────────────────────────
// CALISTHENICS FUNDAMENTALS
// A fixed library of foundational exercises. Holds are logged in seconds
// (total time, can be accumulated across multiple sets in one log entry),
// reps-based exercises log a rep count (optionally across sets). Feeds the
// existing skill tree (Pull-ups already has a node there; Plank, Hollow
// Body, Push-ups, Squats, Bulgarian Squat, Australian Pull-ups and Dips
// extend it — see lib/skillTree.ts).
// ─────────────────────────────────────────────────────────────────────────

export type CalisthenicsExerciseId =
  | 'archer_pushups'
  | 'australian_pullups'
  | 'bulgarian_squat'
  | 'dips'
  | 'gymnastics_bridge'
  | 'hanging_knee_to_chest'
  | 'hindu_pushups'
  | 'hollow_body'
  | 'hollow_body_hold'
  | 'lsit'
  | 'pike_pushups'
  | 'pistol_squat'
  | 'pistol_squats'
  | 'planche_leans'
  | 'plank'
  | 'pullups'
  | 'pushups'
  | 'ring_rows'
  | 'scapular_pullups'
  | 'squats'
  | 'tuck_lsit'

export type CalisthenicsMetric = 'hold_sec' | 'reps'

export interface CalisthenicsLog {
  id?: number
  date: string // YYYY-MM-DD
  exerciseId: CalisthenicsExerciseId
  metric: CalisthenicsMetric
  value: number // seconds for holds, rep count for reps (best/total set, per UI)
  sets?: number // optional, e.g. "3 sets of 12"
  notes?: string
  createdAt: string
}

// ─────────────────────────────────────────────────────────────────────────
// BJJ SKILL MAP
// A personal, growing taxonomy of BJJ concepts/positions. The gym schedules
// classes with a "theme" (e.g. "Armlock Variations"); the user tags each
// class with one or more of THEIR OWN categories (e.g. "Closed Guard",
// "Side Attack") so patterns build up over time. Tags can be renamed,
// re-described, or added freely as understanding deepens.
// ─────────────────────────────────────────────────────────────────────────

export interface BjjSkillTag {
  id?: number
  name: string
  description: string
  color?: string
  createdAt: string
}

export interface BjjClassLog {
  id?: number
  date: string // YYYY-MM-DD
  className?: string // e.g. "Beginners & Intermediates"
  theme?: string // the gym's stated lesson theme, e.g. "Armlock Variations"
  tagIds: number[] // references BjjSkillTag.id
  notes?: string
  createdAt: string
}

// ─────────────────────────────────────────────────────────────────────────
// SKILL TREE
// Derived entirely from existing tables (phaseProgress, measurements,
// bjjSkillTags, bjjClassLogs) at read time — see lib/skillTree.ts for the
// tier definitions and derivation logic. No new storage needed here.
// ─────────────────────────────────────────────────────────────────────────

export type MobilityGoal = 'bjj' | 'calisthenics' | 'general'
export type SessionDuration = 10 | 20 | 30

export interface UserPreferences {
  id?: number // singleton row, id = 1
  bjjDays: string[] // e.g. ['Mon', 'Wed', 'Fri']
  sessionDuration: SessionDuration
  goal: MobilityGoal
  darkMode: boolean
  weeklyGoalDays: number // target number of days/week with a logged session
  soundEnabled: boolean // midpoint/end timer dings
}

// ─────────────────────────────────────────────────────────────────────────
// FUTURE INTEGRATIONS (interfaces ready, not yet populated by any UI)
// These tables exist now so a future Apple Health / Garmin companion app
// can write into the same IndexedDB store (via a sync bridge) without a
// schema migration. The recommendation engine already has optional hooks
// to read from this table if data exists.
// ─────────────────────────────────────────────────────────────────────────

export type HealthSource = 'apple_health' | 'garmin' | 'manual'

export interface HealthMetrics {
  id?: number
  date: string // YYYY-MM-DD
  sleepScore?: number // 0-100
  hrv?: number // ms
  restingHr?: number // bpm
  trainingReadiness?: number // 0-100, e.g. Garmin Training Readiness
  source?: HealthSource
}

// ─────────────────────────────────────────────────────────────────────────
// DB
// ─────────────────────────────────────────────────────────────────────────

export class MobilityDB extends Dexie {
  sessions!: Table<CompletedSession, number>
  phaseProgress!: Table<PhaseProgress, number>
  measurements!: Table<Measurement, number>
  sorenessLogs!: Table<SorenessLog, number>
  bjjLogs!: Table<BjjLog, number>
  preferences!: Table<UserPreferences, number>
  healthMetrics!: Table<HealthMetrics, number>
  bjjSkillTags!: Table<BjjSkillTag, number>
  bjjClassLogs!: Table<BjjClassLog, number>
  holdLogs!: Table<HoldLog, number>
  calisthenicsLogs!: Table<CalisthenicsLog, number>

  constructor() {
    super('mobilityCoachDB')
    this.version(1).stores({
      sessions: '++id, date, type',
      phaseProgress: '++id, exerciseKey',
      measurements: '++id, date, type',
      sorenessLogs: '++id, date',
      bjjLogs: '++id, date',
      preferences: '++id',
      healthMetrics: '++id, date'
    })
    this.version(2).stores({
      bjjSkillTags: '++id, name',
      bjjClassLogs: '++id, date'
    })
    this.version(3)
      .stores({
        holdLogs: '++id, date, exerciseKey'
      })
      .upgrade(async (tx) => {
        // backfill new CompletedSession fields for rows created before v3
        await tx
          .table('sessions')
          .toCollection()
          .modify((s: any) => {
            if (s.plannedSec === undefined) {
              const sec = Math.round((s.durationMin ?? 0) * 60)
              s.plannedSec = sec
              s.actualSec = sec
              s.percent = 100
            }
          })
      })
    this.version(4)
      .stores({
        calisthenicsLogs: '++id, date, exerciseId'
      })
      .upgrade(async (tx) => {
        // Permanently scrub any NaN/invalid numeric fields that were
        // written by an earlier buggy build (e.g. Math.round(undefined/60)
        // = NaN getting persisted). Once NaN lands in IndexedDB it stays
        // there forever unless explicitly repaired, hence this pass.
        await tx
          .table('sessions')
          .toCollection()
          .modify((s: any) => {
            const safe = (n: unknown, fallback: number) =>
              typeof n === 'number' && Number.isFinite(n) ? n : fallback

            s.plannedSec = safe(s.plannedSec, 0)
            s.actualSec = safe(s.actualSec, 0)
            s.durationMin = safe(s.durationMin, Math.round(s.actualSec / 60) || 0)
            s.percent = safe(
              s.percent,
              s.plannedSec > 0 ? Math.min(100, Math.round((s.actualSec / s.plannedSec) * 100)) : 0
            )
          })
      })
  }
}

export const db = new MobilityDB()

// ─────────────────────────────────────────────────────────────────────────
// SEED / DEFAULTS
// ─────────────────────────────────────────────────────────────────────────

export const DEFAULT_PREFERENCES: UserPreferences = {
  id: 1,
  bjjDays: ['Mon', 'Wed'],
  sessionDuration: 20,
  goal: 'bjj',
  darkMode: false,
  weeklyGoalDays: 4,
  soundEnabled: true
}

export const DEFAULT_PHASE_PROGRESS: Omit<PhaseProgress, 'id'>[] = [
  { exerciseKey: '90/90', phase: 1, checkpointMet: false, updatedAt: new Date().toISOString() },
  { exerciseKey: 'straddle', phase: 1, checkpointMet: false, updatedAt: new Date().toISOString() },
  { exerciseKey: 'pike', phase: 1, checkpointMet: false, updatedAt: new Date().toISOString() }
]

// Starter BJJ skill map. Descriptions are intentionally short/generic —
// edit and expand them over time as your understanding deepens. Add new
// tags freely; this is just a seed, not a fixed taxonomy.
export const DEFAULT_BJJ_SKILL_TAGS: Omit<BjjSkillTag, 'id'>[] = [
  { name: 'Closed Guard', description: 'Controlling an opponent from the bottom with legs locked around their torso.', color: '#2ec4b6', createdAt: new Date().toISOString() },
  { name: 'Open Guard', description: 'Guard variations without closing the legs — feet/shins as the main connection.', color: '#2ec4b6', createdAt: new Date().toISOString() },
  { name: 'Half Guard', description: 'One leg trapped between the opponent’s legs, used to control and recover.', color: '#2ec4b6', createdAt: new Date().toISOString() },
  { name: 'Side Control', description: 'Top pinning position, perpendicular to the opponent.', color: '#f5c842', createdAt: new Date().toISOString() },
  { name: 'Mount', description: 'Top position sitting on the opponent’s torso.', color: '#f5c842', createdAt: new Date().toISOString() },
  { name: 'Back Control', description: 'Controlling from behind with hooks and/or body triangle.', color: '#f5c842', createdAt: new Date().toISOString() },
  { name: 'Guard Passing', description: 'Techniques to get around or through an opponent’s legs to a dominant position.', color: '#e8622a', createdAt: new Date().toISOString() },
  { name: 'Sweeps', description: 'Reversing position from the bottom to the top.', color: '#e8622a', createdAt: new Date().toISOString() },
  { name: 'Takedowns', description: 'Bringing the fight from standing to the ground in your favor.', color: '#e8622a', createdAt: new Date().toISOString() },
  { name: 'Escapes', description: 'Getting out of a bad position (side control, mount, back, etc.).', color: '#a78bfa', createdAt: new Date().toISOString() },
  { name: 'Submissions — Armlocks', description: 'Joint locks targeting the elbow/shoulder (armbar, kimura, americana, etc.).', color: '#a78bfa', createdAt: new Date().toISOString() },
  { name: 'Submissions — Chokes', description: 'Chokes and strangles (cross collar, RNC, guillotine, etc.).', color: '#a78bfa', createdAt: new Date().toISOString() },
  { name: 'Submissions — Leglocks', description: 'Leg/foot/knee locks (straight ankle lock, kneebar, etc.).', color: '#a78bfa', createdAt: new Date().toISOString() },
  { name: 'Takedown Defense', description: 'Stopping or limiting an opponent’s takedown attempts.', color: '#7a7d96', createdAt: new Date().toISOString() },
  { name: 'Self Defense', description: 'Non-sport applications: standing grabs, ground and pound defense, etc.', color: '#7a7d96', createdAt: new Date().toISOString() }
]

/** Ensures singleton preferences row + initial phase progress rows exist. */
export async function ensureSeedData() {
  const prefs = await db.preferences.get(1)
  if (!prefs) {
    await db.preferences.put(DEFAULT_PREFERENCES)
  }

  const phases = await db.phaseProgress.toArray()
  if (phases.length === 0) {
    await db.phaseProgress.bulkAdd(DEFAULT_PHASE_PROGRESS)
  }

  const tags = await db.bjjSkillTags.toArray()
  if (tags.length === 0) {
    await db.bjjSkillTags.bulkAdd(DEFAULT_BJJ_SKILL_TAGS)
  }
}
