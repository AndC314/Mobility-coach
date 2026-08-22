import { db, type HealthMetrics } from '../db/db'
import { syncHealthMetricsToFirebase, syncWeightLogToFirebase } from './sync'
import { todayIso } from './date'

interface NormalizedEntry {
  date: string
  sleepHours?: number
  hrv?: number
  restingHr?: number
  weight?: number
  vo2max?: number
  energy?: number
  mood?: number
}

export async function importHealthJSON(text: string): Promise<number> {
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON — check format')
  }

  const entries = Array.isArray(data) ? data : [data]
  if (entries.length === 0) throw new Error('Empty array')

  let count = 0
  for (const raw of entries) {
    const n = normalize(raw)
    if (!n) continue
    await saveEntry(n)
    count++
  }

  if (count === 0) throw new Error('No valid health data found. Need at least one of: sleep, hrv, rhr, weight, vo2max')
  return count
}

export async function importHealthBase64(encoded: string): Promise<number> {
  let json: string
  try {
    json = atob(encoded)
  } catch {
    json = decodeURIComponent(encoded)
  }
  return importHealthJSON(json)
}

function normalize(raw: any): NormalizedEntry | null {
  if (!raw || typeof raw !== 'object') return null

  const date = str(raw.date) || str(raw.d) || todayIso()

  const sleepHours = num(raw.sleepHours ?? raw.sleep_hours ?? raw.sleep ?? raw.sleephours ?? raw.Sleep)
  const hrv = num(raw.hrv ?? raw.HRV ?? raw.heart_rate_variability ?? raw.heartRateVariability)
  const restingHr = num(raw.restingHr ?? raw.resting_hr ?? raw.restinghr ?? raw.rhr ?? raw.RHR ?? raw.resting_heart_rate ?? raw.restingHeartRate)
  const weight = num(raw.weight ?? raw.weightKg ?? raw.weight_kg ?? raw.mass ?? raw.body_mass ?? raw.Weight)
  const vo2max = num(raw.vo2max ?? raw.VO2max ?? raw.vo2 ?? raw.VO2 ?? raw.vo2_max ?? raw.Vo2max)
  const energy = num(raw.energy ?? raw.energy_level ?? raw.Energy)
  const mood = num(raw.mood ?? raw.Mood)

  const hasAnything = sleepHours || hrv || restingHr || weight || vo2max || energy || mood
  if (!hasAnything) return null

  return { date, sleepHours, hrv, restingHr, weight, vo2max, energy, mood }
}

function num(v: any): number | undefined {
  if (v == null) return undefined
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) || n <= 0 ? undefined : n
}

function str(v: any): string | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  return s.length > 0 ? s : undefined
}

async function saveEntry(entry: NormalizedEntry) {
  const metrics: HealthMetrics = {
    date: entry.date,
    createdAt: new Date().toISOString(),
    source: 'apple_health',
  }

  if (entry.sleepHours) {
    metrics.sleepHours = entry.sleepHours
    metrics.sleepScore = Math.min(100, Math.round((entry.sleepHours / 8) * 100))
  }
  if (entry.hrv) metrics.hrv = entry.hrv
  if (entry.restingHr) metrics.restingHr = entry.restingHr
  if (entry.vo2max) metrics.vo2max = entry.vo2max
  if (entry.energy) metrics.energy = entry.energy
  if (entry.mood) metrics.mood = entry.mood

  const hasMetrics = entry.sleepHours || entry.hrv || entry.restingHr || entry.vo2max || entry.energy || entry.mood
  if (hasMetrics) {
    await db.healthMetrics.add(metrics)
    syncHealthMetricsToFirebase(metrics)
  }

  if (entry.weight) {
    const weightLog = { date: entry.date, weightKg: entry.weight, createdAt: new Date().toISOString() }
    await db.weightLogs.add(weightLog)
    syncWeightLogToFirebase(weightLog)
  }
}
