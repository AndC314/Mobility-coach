import type {
  WorkoutDoc,
  BjjClassLogDoc,
  CalisthenicsLogDoc,
  RunningLogDoc,
  PreferencesDoc,
  BjjSkillTagDoc,
  CustomExerciseDoc,
  HealthMetricsDoc,
  BodyMeasurementDoc,
} from '../../types/firebase'

export type {
  WorkoutDoc,
  BjjClassLogDoc,
  CalisthenicsLogDoc,
  RunningLogDoc,
  PreferencesDoc,
  BjjSkillTagDoc,
  CustomExerciseDoc,
  HealthMetricsDoc,
  BodyMeasurementDoc,
}

export interface HoldLogDoc {
  id?: string
  date: string
  exerciseKey: string
  phase: number
  plannedSec: number
  actualSec: number
  createdAt: string
}

export interface WeightLogDoc {
  id?: string
  date: string
  weightKg: number
  createdAt: string
}

export interface UseSyncState {
  allWorkouts: WorkoutDoc[]
  conflictDays: string[]
  isLoading: boolean
  updateWorkoutInFirestore: (workoutId: string, updates: Partial<WorkoutDoc>) => Promise<void>
  addWorkoutToFirestore: (workout: Omit<WorkoutDoc, 'id'>) => Promise<string>
  addBjjClassLogToFirestore: (log: Omit<BjjClassLogDoc, 'id'>) => Promise<string>
  addCalisthenicsLogToFirestore: (log: Omit<CalisthenicsLogDoc, 'id'>) => Promise<string>
  addRunningLogToFirestore: (log: Omit<RunningLogDoc, 'id'>) => Promise<string>
  addHealthMetricsToFirestore: (doc: Omit<HealthMetricsDoc, 'id'>) => Promise<string>
  addBodyMeasurementToFirestore: (doc: Omit<BodyMeasurementDoc, 'id'>) => Promise<string>
  addHoldLogToFirestore: (doc: Omit<HoldLogDoc, 'id'>) => Promise<string>
  addWeightLogToFirestore: (doc: Omit<WeightLogDoc, 'id'>) => Promise<string>
}

export type FirestoreTimestamp = { toDate(): Date }

export type CreatedAtValue = string | number | FirestoreTimestamp | undefined | null
