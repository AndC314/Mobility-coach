import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { todayIso } from '../lib/date'
import type { BiometricModifiers } from '../data/muscleMap'

export function useBiometricModifiers(): BiometricModifiers | undefined {
  const today = todayIso()

  const todayMetrics = useLiveQuery(
    () => db.healthMetrics.where('date').equals(today).last(),
    [today],
    undefined
  )

  if (!todayMetrics) return undefined
  if (todayMetrics.sleepScore == null && todayMetrics.sleepHours == null && todayMetrics.hrv == null) return undefined

  const modifiers: BiometricModifiers = {}

  if (todayMetrics.sleepScore != null) {
    modifiers.sleepScore = todayMetrics.sleepScore
  } else if (todayMetrics.sleepHours != null) {
    modifiers.sleepScore = Math.min(100, Math.round((todayMetrics.sleepHours / 8) * 100))
  }

  if (todayMetrics.hrv != null) {
    modifiers.hrvStatus = todayMetrics.hrv < 30 ? 'suppressed' : 'optimal'
  }

  return modifiers
}
