import { useLiveQuery } from 'dexie-react-hooks'
import { collection, addDoc } from 'firebase/firestore'
import { db, type CustomExercise } from '../db/db'
import { db as firestoreDb } from '../lib/firebase'
import { useAuth } from './useAuth'
import type { CustomExerciseDoc } from '../types/firebase'

export function useCustomExercises(type?: 'calisthenics' | 'mobility') {
  const { user } = useAuth()

  const exercises = useLiveQuery(
    () =>
      type
        ? db.customExercises.where('exerciseType').equals(type).toArray()
        : db.customExercises.toArray(),
    [type],
    []
  )

  async function addCustomExercise(exercise: CustomExercise) {
    await db.customExercises.add(exercise)

    if (user) {
      const ref = collection(firestoreDb, `users/${user.uid}/customExercises`)
      addDoc(ref, {
        localId: exercise.id as string,
        name: exercise.name,
        type: exercise.type,
        icon: exercise.icon,
        exerciseType: exercise.exerciseType,
        primaryMuscles: exercise.primaryMuscles,
        category: exercise.category,
        bodyArea: exercise.bodyArea,
        isGlobal: exercise.isGlobal,
        createdAt: exercise.createdAt,
        updatedAt: exercise.updatedAt,
      } satisfies CustomExerciseDoc).catch((err) =>
        console.error('[useCustomExercises] sync failed:', err)
      )
    }
  }

  return { exercises: exercises ?? [], addCustomExercise }
}
