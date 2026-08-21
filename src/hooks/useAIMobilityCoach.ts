import { useState, useEffect, useCallback } from 'react'
import { db, type MobilityPlanItem } from '../db/db'
import { todayIso } from '../lib/date'
import { buildMobilityCoachingContext } from '../lib/mobilityCoachingContext'
import { useAuth } from './useAuth'
import { auth } from '../lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db as firestoreDb } from '../lib/firebase'

export interface AIMobilityCoachState {
  coaching: string | null
  sessionPlan: MobilityPlanItem[] | null
  loading: boolean
  error: string | null
  generatedAt: string | null
  limitReached: boolean
  refresh: () => void
}

export function useAIMobilityCoach(): AIMobilityCoachState {
  const { user } = useAuth()
  const [coaching, setCoaching] = useState<string | null>(null)
  const [sessionPlan, setSessionPlan] = useState<MobilityPlanItem[] | null>(null)
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
        const fsDoc = await getDoc(doc(firestoreDb, `users/${user.uid}/aiCoaching/mobility_${today}`))
        if (fsDoc.exists()) {
          const data = fsDoc.data()
          setCoaching(data.coaching)
          setSessionPlan(data.sessionPlan ?? null)
          setGeneratedAt(data.generatedAt)
          setLimitReached(true)
          const existing = await db.aiMobilityCoachingLogs.where('date').equals(today).first()
          if (!existing) {
            await db.aiMobilityCoachingLogs.add({
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

      const cached = await db.aiMobilityCoachingLogs.where('date').equals(today).first()
      if (cached) {
        setCoaching(cached.coaching)
        setSessionPlan(cached.sessionPlan ?? null)
        setGeneratedAt(cached.generatedAt)
        setLimitReached(true)
        return
      }
    }

    if (bypassCache && limitReached) return

    // Only call AI if there's been any training in the last 48h
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
      setLimitReached(true)

      // Save to Firestore for cross-device sync
      try {
        await setDoc(doc(firestoreDb, `users/${user.uid}/aiCoaching/mobility_${today}`), {
          coaching: data.coaching,
          sessionPlan: data.sessionPlan ?? null,
          generatedAt: data.generatedAt,
        })
      } catch {
        // Non-critical
      }

      // Cache in Dexie
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
