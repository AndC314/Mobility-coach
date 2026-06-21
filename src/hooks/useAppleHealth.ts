import { useState, useEffect, useCallback } from 'react'
import type { BiometricModifiers } from '../data/muscleMap'

// ─────────────────────────────────────────────────────────────────────────
// APPLE HEALTH BRIDGE
//
// Unified interface for biometric data. Currently reads from localStorage
// as a mock provider. Structured as async calls so that swapping in
// @capacitor-community/apple-health requires zero UI-layer changes.
//
// Migration path:
//   1. Install @capacitor-community/apple-health
//   2. Replace fetchAppleHealthData() internals with native plugin calls
//   3. Replace writeAppleHealthData() with actual HealthKit writes
//   4. The hook signature, return types, and BiometricModifiers interface
//      remain identical — UI and recovery engine stay untouched.
// ─────────────────────────────────────────────────────────────────────────

export interface AppleHealthData {
  sleepDuration: number | null // hours (e.g. 7.5)
  sleepQualityScore: number | null // 0-100
  restingHRV: number | null // ms
  lastSyncedAt: string | null // ISO timestamp
}

export interface AppleHealthState {
  data: AppleHealthData
  loading: boolean
  error: string | null
  isNativeAvailable: boolean
  refresh: () => Promise<void>
  updateMockData: (patch: Partial<AppleHealthData>) => Promise<void>
}

const STORAGE_KEY = 'mobility_coach_health_data'

const EMPTY_DATA: AppleHealthData = {
  sleepDuration: null,
  sleepQualityScore: null,
  restingHRV: null,
  lastSyncedAt: null
}

async function fetchAppleHealthData(): Promise<AppleHealthData> {
  // Simulate async native bridge latency
  await new Promise((r) => setTimeout(r, 50))

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return EMPTY_DATA

  try {
    const parsed = JSON.parse(raw)
    return {
      sleepDuration: parsed.sleepDuration ?? null,
      sleepQualityScore: parsed.sleepQualityScore ?? null,
      restingHRV: parsed.restingHRV ?? null,
      lastSyncedAt: parsed.lastSyncedAt ?? null
    }
  } catch {
    return EMPTY_DATA
  }
}

async function writeAppleHealthData(data: AppleHealthData): Promise<void> {
  await new Promise((r) => setTimeout(r, 20))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function isCapacitorNativeAvailable(): boolean {
  // In a future Capacitor build, this checks the native plugin registry
  return typeof window !== 'undefined' &&
    'Capacitor' in window &&
    (window as any).Capacitor?.isNativePlatform?.() === true
}

export function useAppleHealth(): AppleHealthState {
  const [data, setData] = useState<AppleHealthData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const fetched = await fetchAppleHealthData()
      setData(fetched)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read health data')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateMockData = useCallback(async (patch: Partial<AppleHealthData>) => {
    const current = await fetchAppleHealthData()
    const updated: AppleHealthData = {
      ...current,
      ...patch,
      lastSyncedAt: new Date().toISOString()
    }
    await writeAppleHealthData(updated)
    setData(updated)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    data,
    loading,
    error,
    isNativeAvailable: isCapacitorNativeAvailable(),
    refresh,
    updateMockData
  }
}

export function healthDataToBiometricModifiers(
  data: AppleHealthData
): BiometricModifiers | undefined {
  if (data.sleepQualityScore == null && data.restingHRV == null) return undefined

  const modifiers: BiometricModifiers = {}

  if (data.sleepQualityScore != null) {
    modifiers.sleepScore = data.sleepQualityScore
  }

  if (data.restingHRV != null) {
    // HRV below 30ms is generally considered suppressed for most populations
    modifiers.hrvStatus = data.restingHRV < 30 ? 'suppressed' : 'optimal'
  }

  return modifiers
}
