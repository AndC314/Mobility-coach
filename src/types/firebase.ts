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

export interface UserMetadata {
  lastSync: number
  version: number
}

export interface UseAuthState {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
}

