import { db, type CompletedSession } from '../db/db'

/**
 * Removes duplicate session rows: same date + type + label, keeping only
 * the most recently created one (which has the most complete/accurate
 * actualSec, since upsertTodaySession always merges into the existing row
 * going forward — duplicates can only be historical debris from before
 * that logic existed).
 */
export async function dedupeSessions(): Promise<{ removed: number }> {
  const all = await db.sessions.toArray()
  const groups = new Map<string, CompletedSession[]>()

  for (const s of all) {
    const key = `${s.date}__${s.type}__${s.label}`
    const list = groups.get(key) ?? []
    list.push(s)
    groups.set(key, list)
  }

  const idsToRemove: number[] = []
  for (const list of groups.values()) {
    if (list.length <= 1) continue
    // keep the one with the highest actualSec (most progress), tie-broken
    // by most recently created
    const sorted = [...list].sort((a, b) => {
      if (b.actualSec !== a.actualSec) return b.actualSec - a.actualSec
      return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    })
    for (const dup of sorted.slice(1)) {
      if (dup.id != null) idsToRemove.push(dup.id)
    }
  }

  if (idsToRemove.length > 0) {
    await db.sessions.bulkDelete(idsToRemove)
  }

  return { removed: idsToRemove.length }
}

/** Re-applies the NaN-scrub from the v4 migration, in case any bad rows
 * were written after that migration ran (defensive, should be a no-op
 * on a healthy database). */
export async function repairInvalidNumbers(): Promise<{ fixed: number }> {
  let fixed = 0
  await db.sessions.toCollection().modify((s: any) => {
    const safe = (n: unknown, fallback: number) =>
      typeof n === 'number' && Number.isFinite(n) ? n : fallback

    const before = JSON.stringify(s)
    s.plannedSec = safe(s.plannedSec, 0)
    s.actualSec = safe(s.actualSec, 0)
    s.durationMin = safe(s.durationMin, Math.round(s.actualSec / 60) || 0)
    s.percent = safe(
      s.percent,
      s.plannedSec > 0 ? Math.min(100, Math.round((s.actualSec / s.plannedSec) * 100)) : 0
    )
    if (JSON.stringify(s) !== before) fixed += 1
  })
  return { fixed }
}

export async function runFullRepair(): Promise<{ removed: number; fixed: number }> {
  const { fixed } = await repairInvalidNumbers()
  const { removed } = await dedupeSessions()
  return { removed, fixed }
}
