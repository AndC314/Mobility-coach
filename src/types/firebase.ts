/**
 * Firebase TypeScript interfaces for Mobility Coach
 * Defines the data structures for workouts, exercises, and user metadata
 */

import { User } from 'firebase/auth'

export type WorkoutType = 'calisthenics' | 'bjj' | 'mobility'

export type MobilityArea = 'shoulders' | 'hips' | 'lower_back'

export interface ExerciseLog {
  reps?: number
  seconds?: number
}

export interface WorkoutDoc {
  // Document ID
  id?: string // Firestore document ID

  // Immutable
  type: WorkoutType
  date: string // YYYY-MM-DD
  createdAt: number // Unix timestamp
  updatedAt: number // Unix timestamp

  // Editable
  exerciseIds: string[]
  data: Record<string, ExerciseLog>

  // Conflict handling
  conflicted?: boolean

  // Preserved original Dexie SessionType for faithful round-trip
  originalType?: string

  // Calisthenics specific
  plannedSec?: number
  actualSec?: number

  // BJJ specific
  tags?: string[]

  // Mobility specific
  area?: MobilityArea
  label?: string
}

export interface BjjClassLogDoc {
  id?: string        // Firestore document ID
  date: string       // YYYY-MM-DD
  className?: string
  theme?: string
  tagIds: number[]
  technicalMins?: number
  sparringMins?: number
  notes?: string
  createdAt: string  // ISO string — used as dedup key on sync
}

export interface CalisthenicsLogDoc {
  id?: string
  date: string       // YYYY-MM-DD
  exerciseId: string
  metric: 'hold_sec' | 'reps'
  value: number
  sets?: number
  notes?: string
  createdAt: string  // ISO string — used as dedup key on sync
}

export interface RunningLogDoc {
  id?: string
  date: string       // YYYY-MM-DD
  distanceKm: number
  durationSec: number
  notes?: string
  createdAt: string  // ISO string — used as dedup key on sync
}

export interface UserMetadata {
  lastSync: number
  version: number
}

export interface PreferencesDoc {
  bjjDays: string[]
  sessionDuration: number
  goal: string
  darkMode: boolean
  weeklyGoalDays: number
  soundEnabled: boolean
  avatarVariant: string
  availableEquipment?: string[]
  activeSports?: string[]
  weightKg?: number | null
  updatedAt: number
}

export interface BjjSkillTagDoc {
  id?: string
  name: string
  description: string
  color?: string
  createdAt: string
  localId?: number
}

export interface CustomExerciseDoc {
  id?: string
  localId: string
  name: string
  type: 'dynamic' | 'hold'
  icon: string
  exerciseType: 'calisthenics' | 'mobility'
  primaryMuscles?: string[]
  category?: string
  bodyArea?: string
  isGlobal: boolean
  createdAt: string
  updatedAt?: string
}

export interface HealthMetricsDoc {
  id?: string
  date: string       // YYYY-MM-DD
  sleepScore?: number
  sleepHours?: number
  hrv?: number
  restingHr?: number
  trainingReadiness?: number
  energy?: number
  mood?: number
  vo2max?: number
  notes?: string
  source?: string
  createdAt: string  // ISO string — used as dedup key on sync
}

export interface BodyMeasurementDoc {
  id?: string
  date: string       // YYYY-MM-DD
  site: string
  valueCm: number
  createdAt: string  // ISO string — used as dedup key on sync
}

export interface UseAuthState {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
}

