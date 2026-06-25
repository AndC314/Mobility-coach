import { useLiveQuery } from 'dexie-react-hooks'
import { computeAllTrainingHours, type TrainingHours } from '../lib/trainingHourCalculator'
import { db } from '../db/db'

export function useTrainingHours() {
  return useLiveQuery(async () => {
    // Depend on sessions table so this recomputes when sessions change
    await db.sessions.toArray()
    return computeAllTrainingHours()
  }, [], [])
}
