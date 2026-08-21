import { useState, useEffect, useCallback } from 'react'
import { db, type MobilityPlanItem } from '../db/db'
import { todayIso } from '../lib/date'
import { buildMobilityCoachingContext } from '../lib/mobilityCoachingContext'
import { useAuth } from './useAuth'
import { auth } from '../lib/firebase'

export interface AIMobilityCoachState {
  coaching: string | null
  sessionPlan: MobilityPlanItem[] | null
  loading: boolean
  error: string | null
  generatedAt: string | null
  refresh: () => void
}

export function useAIMobilityCoach(): AIMobilityCoachState {
  const { user } = useAuth()
  const [coaching, setCoaching] = useState<string | null>(null)
  const [sessionPlan, setSessionPlan] = useState<MobilityPlanItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  const fetchCoaching = useCallback(async (bypassCache = false) => {
    if (!user) return

    const today = todayIso()

    if (!bypassCache) {
      const cached = await db.aiMobilityCoachingLogs.where('date').equals(today).first()
      if (cached) {
        setCoaching(cached.coaching)
        setSessionPlan(cached.sessionPlan ?? null)
        setGeneratedAt(cached.generatedAt)
        return
      }
    }

    setCoaching(null)
    setSessionPlan(null)
    setGeneratedAt(null)
    setLoading(true)
    setError(null)

    try {
      if (bypassCache) {
        await db.aiMobilityCoachingLogs.where('date').equals(today).delete()
      }

      const context = await buildMobilityCoachingContext()
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch('/api/generateMobilityCoaching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(context),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setCoaching(data.coaching)
      setSessionPlan(data.sessionPlan ?? null)
      setGeneratedAt(data.generatedAt)

      const existing = await db.aiMobilityCoachingLogs.where('date').equals(today).first()
      if (existing) {
        await db.aiMobilityCoachingLogs.update(existing.id!, {
          coaching: data.coaching,
          sessionPlan: data.sessionPlan ?? null,
          generatedAt: data.generatedAt,
        })
      } else {
        await db.aiMobilityCoachingLogs.add({
          date: today,
          coaching: data.coaching,
          sessionPlan: data.sessionPlan ?? null,
          generatedAt: data.generatedAt,
        })
      }
    } catch (err: any) {
      setError(err?.message || 'Could not reach mobility coach')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchCoaching()
  }, [fetchCoaching])

  const refresh = useCallback(() => {
    fetchCoaching(true)
  }, [fetchCoaching])

  return { coaching, sessionPlan, loading, error, generatedAt, refresh }
}
