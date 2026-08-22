import { useEffect, useRef } from 'react'
import { db, type HealthMetrics } from '../db/db'
import { syncHealthMetricsToFirebase, syncWeightLogToFirebase } from '../lib/sync'

interface HealthPayload {
  date: string
  sleepHours?: number
  hrv?: number
  restingHr?: number
  weight?: number
  vo2max?: number
}

export function useHealthAutoImport(onImported?: (count: number) => void) {
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('health')
    if (!encoded) return

    try {
      const json = atob(encoded)
      const data: HealthPayload | HealthPayload[] = JSON.parse(json)
      const entries = Array.isArray(data) ? data : [data]

      importEntries(entries).then((count) => {
        // Clean URL without reload
        const url = new URL(window.location.href)
        url.searchParams.delete('health')
        window.history.replaceState(null, '', url.toString())
        onImported?.(count)
      })
    } catch {
      // Invalid payload — silently ignore
    }
  }, [])
}

async function importEntries(entries: HealthPayload[]): Promise<number> {
  let count = 0

  for (const entry of entries) {
    if (!entry.date) continue

    const metrics: HealthMetrics = {
      date: entry.date,
      createdAt: new Date().toISOString(),
      source: 'apple_health',
    }
    if (entry.sleepHours != null && entry.sleepHours > 0) {
      metrics.sleepHours = entry.sleepHours
      metrics.sleepScore = Math.min(100, Math.round((entry.sleepHours / 8) * 100))
    }
    if (entry.hrv != null && entry.hrv > 0) metrics.hrv = entry.hrv
    if (entry.restingHr != null && entry.restingHr > 0) metrics.restingHr = entry.restingHr
    if (entry.vo2max != null && entry.vo2max > 0) metrics.vo2max = entry.vo2max

    const hasMetrics = metrics.sleepHours || metrics.hrv || metrics.restingHr || metrics.vo2max
    if (hasMetrics) {
      await db.healthMetrics.add(metrics)
      syncHealthMetricsToFirebase(metrics)
    }

    if (entry.weight != null && entry.weight > 0) {
      const weightLog = { date: entry.date, weightKg: entry.weight, createdAt: new Date().toISOString() }
      await db.weightLogs.add(weightLog)
      syncWeightLogToFirebase(weightLog)
    }

    if (hasMetrics || (entry.weight != null && entry.weight > 0)) count++
  }

  return count
}
