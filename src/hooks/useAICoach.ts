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
  stale: boolean
  refresh: () => void
}

const STALE_THRESHOLD_MS = 60 * 60 * 1000 // 1 hour

async function isCoachingStale(generatedAtIso: string): Promise<boolean> {
  const generatedTime = new Date(generatedAtIso).getTime()
  const elapsed = Date.now() - generatedTime
  if (elapsed < STALE_THRESHOLD_MS) return false

  // Check if there are logs created after the coaching was generated
  const logs = await db.calisthenicsLogs.where('createdAt').above(generatedAtIso).count()
  return logs > 0
}

export function useAICoach(): AICoachState {
  const { user } = useAuth()
  const [coaching, setCoaching] = useState<string | null>(null)
  const [sessionPlan, setSessionPlan] = useState<SessionPlanItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [stale, setStale] = useState(false)

  const fetchCoaching = useCallback(async (bypassCache = false) => {
    if (!user) return

    const today = todayIso()

    // Check Firestore first for cross-device consistency
    if (!bypassCache) {
      try {
        const fsDoc = await getDoc(doc(firestoreDb, `users/${user.uid}/aiCoaching/calisthenics_${today}`))
        if (fsDoc.exists()) {
          const data = fsDoc.data()
          const stale = await isCoachingStale(data.generatedAt)
          if (!stale) {
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
          // Stale — fall through to regenerate
        }
      } catch {
        // Firestore unavailable — fall through to local cache
      }

      // Fallback to local Dexie cache
      const cached = await db.aiCoachingLogs.where('date').equals(today).first()
      if (cached) {
        const stale = await isCoachingStale(cached.generatedAt)
        if (!stale) {
          setCoaching(cached.coaching)
          setSessionPlan(cached.sessionPlan ?? null)
          setGeneratedAt(cached.generatedAt)
          setLimitReached(true)
          return
        }
        // Stale — fall through to regenerate
      }
    }

    // If bypassCache but limit already reached AND not stale, block the refresh
    if (bypassCache && limitReached) {
      const stale = generatedAt ? await isCoachingStale(generatedAt) : false
      if (!stale) return
    }

    // Only call AI if there's been training in the last 48h
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const recentCal = await db.calisthenicsLogs.where('date').aboveOrEqual(twoDaysAgo).count()
    const recentBjj = await db.bjjClassLogs.where('date').aboveOrEqual(twoDaysAgo).count()
    const recentSessions = await db.sessions.where('date').aboveOrEqual(twoDaysAgo).count()
    if (recentCal + recentBjj + recentSessions === 0) return

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
  }, [user, limitReached, generatedAt])

  useEffect(() => {
    fetchCoaching()
  }, [fetchCoaching])

  // Periodically check if coaching is stale (every 5 min)
  useEffect(() => {
    if (!generatedAt) return
    const check = () => {
      isCoachingStale(generatedAt).then(setStale)
    }
    check()
    const interval = setInterval(check, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [generatedAt])

  const refresh = useCallback(() => {
    if (limitReached && !stale) return
    setLimitReached(false)
    setStale(false)
    fetchCoaching(true)
  }, [fetchCoaching, limitReached, stale])

  return { coaching, sessionPlan, loading, error, generatedAt, limitReached, stale, refresh }
}
