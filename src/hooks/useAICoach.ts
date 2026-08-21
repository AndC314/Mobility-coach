import { useState, useEffect, useCallback } from 'react'
import { db, type SessionPlanItem } from '../db/db'
import { todayIso } from '../lib/date'
import { buildCoachingContext } from '../lib/coachingContext'
import { useAuth } from './useAuth'
import { auth } from '../lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db as firestoreDb } from '../lib/firebase'

export interface AICoachState {
  coaching: string | null
  sessionPlan: SessionPlanItem[] | null
  loading: boolean
  error: string | null
  generatedAt: string | null
  limitReached: boolean
  refresh: () => void
}

export function useAICoach(): AICoachState {
  const { user } = useAuth()
  const [coaching, setCoaching] = useState<string | null>(null)
  const [sessionPlan, setSessionPlan] = useState<SessionPlanItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)

  const fetchCoaching = useCallback(async (bypassCache = false) => {
    if (!user) return

    const today = todayIso()

    // Check Firestore first for cross-device consistency
    if (!bypassCache) {
      try {
        const fsDoc = await getDoc(doc(firestoreDb, `users/${user.uid}/aiCoaching/calisthenics_${today}`))
        if (fsDoc.exists()) {
          const data = fsDoc.data()
          setCoaching(data.coaching)
          setSessionPlan(data.sessionPlan ?? null)
          setGeneratedAt(data.generatedAt)
          setLimitReached(true)
          // Also cache locally
          const existing = await db.aiCoachingLogs.where('date').equals(today).first()
          if (!existing) {
            await db.aiCoachingLogs.add({
              date: today,
              coaching: data.coaching,
              sessionPlan: data.sessionPlan ?? null,
              generatedAt: data.generatedAt,
            })
          }
          return
        }
      } catch {
        // Firestore unavailable — fall through to local cache
      }

      // Fallback to local Dexie cache
      const cached = await db.aiCoachingLogs.where('date').equals(today).first()
      if (cached) {
        setCoaching(cached.coaching)
        setSessionPlan(cached.sessionPlan ?? null)
        setGeneratedAt(cached.generatedAt)
        setLimitReached(true)
        return
      }
    }

    // If bypassCache but limit already reached, block the refresh
    if (bypassCache && limitReached) return

    setCoaching(null)
    setSessionPlan(null)
    setGeneratedAt(null)
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
      setSessionPlan(data.sessionPlan ?? null)
      setGeneratedAt(data.generatedAt)
      setLimitReached(true)

      // Save to Firestore for cross-device sync
      try {
        await setDoc(doc(firestoreDb, `users/${user.uid}/aiCoaching/calisthenics_${today}`), {
          coaching: data.coaching,
          sessionPlan: data.sessionPlan ?? null,
          generatedAt: data.generatedAt,
        })
      } catch {
        // Non-critical — local cache still works
      }

      // Cache in Dexie
      const existing = await db.aiCoachingLogs.where('date').equals(today).first()
      if (existing) {
        await db.aiCoachingLogs.update(existing.id!, {
          coaching: data.coaching,
          sessionPlan: data.sessionPlan ?? null,
          generatedAt: data.generatedAt,
        })
      } else {
        await db.aiCoachingLogs.add({
          date: today,
          coaching: data.coaching,
          sessionPlan: data.sessionPlan ?? null,
          generatedAt: data.generatedAt,
        })
      }
    } catch (err: any) {
      setError(err?.message || 'Could not reach coach')
    } finally {
      setLoading(false)
    }
  }, [user, limitReached])

  useEffect(() => {
    fetchCoaching()
  }, [fetchCoaching])

  const refresh = useCallback(() => {
    if (limitReached) return
    fetchCoaching(true)
  }, [fetchCoaching, limitReached])

  return { coaching, sessionPlan, loading, error, generatedAt, limitReached, refresh }
}
