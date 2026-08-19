import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { generateMobilitySession, type GeneratedMobilitySession } from '../lib/mobilitySession'

export function useMobilitySession() {
  const [seed, setSeed] = useState(0)

  const session = useLiveQuery(async () => {
    const sessions = await db.sessions.toArray()
    const mobilitySessions = sessions.filter(
      (s) => s.type !== 'calisthenics' && s.type !== 'bjj' && s.type !== 'custom'
    )
    return generateMobilitySession(mobilitySessions, seed || undefined)
  }, [seed])

  const regenerate = useCallback(() => {
    setSeed((s) => s + 1)
  }, [])

  return {
    session: session ?? null,
    regenerate,
    isLoading: session === undefined,
  }
}
