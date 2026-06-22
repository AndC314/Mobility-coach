import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BjjSkillTag, type BjjClassLog, type CompletedSession } from '../db/db'
import { todayIso } from '../lib/date'
import { syncSessionToFirebase } from '../lib/firebase-workout-sync'

export function useBjjSkillTags() {
  const tags = useLiveQuery(() => db.bjjSkillTags.toArray(), [], [])

  async function addTag(name: string, description = '') {
    const trimmed = name.trim()
    if (!trimmed) return
    const existing = await db.bjjSkillTags.where('name').equalsIgnoreCase(trimmed).first()
    if (existing) return existing.id!
    return db.bjjSkillTags.add({
      name: trimmed,
      description,
      color: '#2ec4b6',
      createdAt: new Date().toISOString()
    })
  }

  async function updateTag(id: number, patch: Partial<Omit<BjjSkillTag, 'id'>>) {
    await db.bjjSkillTags.update(id, patch)
  }

  async function deleteTag(id: number) {
    await db.bjjSkillTags.delete(id)
    // strip from any class logs referencing it
    const logs = await db.bjjClassLogs.where('tagIds').equals(id).toArray()
    for (const log of logs) {
      await db.bjjClassLogs.update(log.id!, { tagIds: log.tagIds.filter((t) => t !== id) })
    }
  }

  return { tags: tags ?? [], addTag, updateTag, deleteTag }
}

export function useBjjClassLogs() {
  const logs = useLiveQuery(
    () => db.bjjClassLogs.orderBy('date').reverse().toArray(),
    [],
    []
  )

  async function addClassLog(entry: {
    date: string
    className?: string
    theme?: string
    tagIds: number[]
    notes?: string
  }) {
    const id = await db.bjjClassLogs.add({ ...entry, createdAt: new Date().toISOString() })

    // Also create a session entry for consistency with other workout types
    // and sync to Firestore (non-blocking)
    try {
      const session: CompletedSession = {
        date: entry.date,
        type: 'recovery',
        label: `BJJ: ${entry.theme || entry.className || 'Class'}`,
        durationMin: 60, // default estimate
        plannedSec: 3600,
        actualSec: 3600,
        percent: 100,
        exerciseIds: [`bjj_class_${id}`],
        createdAt: new Date().toISOString()
      }
      await syncSessionToFirebase(session).catch(err => {
        console.error('[addClassLog] Failed to sync to Firestore:', err)
      })
    } catch (err) {
      console.error('[addClassLog] Error creating session:', err)
    }

    return id
  }

  async function updateClassLog(id: number, patch: Partial<Omit<BjjClassLog, 'id'>>) {
    await db.bjjClassLogs.update(id, patch)
  }

  async function deleteClassLog(id: number) {
    await db.bjjClassLogs.delete(id)
  }

  return { logs: logs ?? [], addClassLog, updateClassLog, deleteClassLog }
}

/** Counts how many logged classes reference each tag — the "buildup of patterns" view. */
export function useTagFrequency() {
  return useLiveQuery(async () => {
    const [tags, logs] = await Promise.all([db.bjjSkillTags.toArray(), db.bjjClassLogs.toArray()])
    const counts = new Map<number, number>()
    for (const log of logs) {
      for (const tagId of log.tagIds) {
        counts.set(tagId, (counts.get(tagId) ?? 0) + 1)
      }
    }
    return tags
      .map((t) => ({ tag: t, count: counts.get(t.id!) ?? 0 }))
      .sort((a, b) => b.count - a.count)
  }, [], [])
}
