/**
 * useAuth Hook
 * Manages Firebase authentication state for Mobility Coach
 * Provides user state, loading indicator, and logout functionality
 */

import { useState, useEffect } from 'react'
import { User, onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { UseAuthState } from '../types/firebase'

export function useAuth(): UseAuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const logout = async () => {
    await signOut(auth)
    setUser(null)
  }

  return { user, loading, logout }
}
