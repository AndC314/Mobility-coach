import { useLiveQuery } from 'dexie-react-hooks'
import { buildSkillTree } from '../lib/skillTree'
import { db } from '../db/db'

export function useSkillTree() {
  return useLiveQuery(async () => {
    // depend on every table the tree derives from, so it recomputes live
    await db.phaseProgress.toArray()
    await db.measurements.toArray()
    await db.bjjSkillTags.toArray()
    await db.bjjClassLogs.toArray()
    await db.calisthenicsLogs.toArray()
    return buildSkillTree()
  }, [], [])
}
