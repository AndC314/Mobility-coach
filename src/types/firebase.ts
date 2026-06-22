/**
 * Firebase TypeScript interfaces for Mobility Coach
 * Defines the data structures for workouts, exercises, and user metadata
 */

export type WorkoutType = 'mobility' | 'flexibility' | 'strength' | 'cardio';

export type MobilityArea =
  | 'shoulders'
  | 'hips'
  | 'spine'
  | 'ankles'
  | 'knees'
  | 'elbows'
  | 'wrists'
  | 'neck'
  | 'lower_back'
  | 'full_body';

export interface ExerciseLog {
  name: string;
  duration: number; // in seconds
  reps?: number;
  sets?: number;
  notes?: string;
}

export interface WorkoutDoc {
  id?: string;
  userId: string;
  date: string; // ISO 8601 format (YYYY-MM-DD)
  type: WorkoutType;
  area: MobilityArea;
  duration: number; // in minutes
  exercises: ExerciseLog[];
  notes?: string;
  completed: boolean;
  createdAt: number; // timestamp in milliseconds
  updatedAt: number; // timestamp in milliseconds
}

export interface UserMetadata {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  createdAt: number; // timestamp in milliseconds
  updatedAt: number; // timestamp in milliseconds
  lastWorkoutDate?: string; // ISO 8601 format
  totalWorkouts: number;
  preferences?: {
    defaultWorkoutType?: WorkoutType;
    defaultArea?: MobilityArea;
    notifications?: boolean;
  };
}
