import { useState, useEffect, useCallback } from 'react'
import { db } from '../db/db'
import { todayIso } from '../lib/date'
import { buildCoachingContext } from '../lib/coachingContext'
import { useAuth } from './useAuth'
import { auth } from '../lib/firebase'

interface AICoachState {
  coaching: string | null
  loading: boolean
  error: string | null
  generatedAt: string | null
  refresh: () => void
}

export function useAICoach(): AICoachState {
  const { user } = useAuth()
  const [coaching, setCoaching] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  const fetchCoaching = useCallback(async (bypassCache = false) => {
    if (!user) return

    const today = todayIso()

    // Check Dexie cache first
    if (!bypassCache) {
      const cached = await db.aiCoachingLogs.where('date').equals(today).first()
      if (cached) {
        setCoaching(cached.coaching)
        setGeneratedAt(cached.generatedAt)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const context = await buildCoachingContext()
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch('/api/generateCoaching', {
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
      setGeneratedAt(data.generatedAt)

      // Cache in Dexie
      const existing = await db.aiCoachingLogs.where('date').equals(today).first()
      if (existing) {
        await db.aiCoachingLogs.update(existing.id!, {
          coaching: data.coaching,
          generatedAt: data.generatedAt,
        })
      } else {
        await db.aiCoachingLogs.add({
          date: today,
          coaching: data.coaching,
          generatedAt: data.generatedAt,
        })
      }
    } catch (err: any) {
      setError(err?.message || 'Could not reach coach')
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

  return { coaching, loading, error, generatedAt, refresh }
}
