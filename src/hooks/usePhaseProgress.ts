import { useLiveQuery } from 'dexie-react-hooks'
import { db, type PhaseProgress, type ProgressionKey } from '../db/db'

export function usePhaseProgress() {
  const rows = useLiveQuery(() => db.phaseProgress.toArray(), [], [])

  function getPhase(key: ProgressionKey): PhaseProgress | undefined {
    return rows?.find((r) => r.exerciseKey === key)
  }

  async function setPhase(key: ProgressionKey, phase: 1 | 2 | 3 | 4) {
    const existing = await db.phaseProgress.where('exerciseKey').equals(key).first()
    if (existing) {
      await db.phaseProgress.update(existing.id!, {
        phase,
        checkpointMet: false,
        updatedAt: new Date().toISOString()
      })
    } else {
      await db.phaseProgress.add({
        exerciseKey: key,
        phase,
        checkpointMet: false,
        updatedAt: new Date().toISOString()
      })
    }
  }

  async function setCheckpoint(key: ProgressionKey, met: boolean) {
    const existing = await db.phaseProgress.where('exerciseKey').equals(key).first()
    if (existing) {
      await db.phaseProgress.update(existing.id!, { checkpointMet: met, updatedAt: new Date().toISOString() })
    }
  }

  async function advancePhase(key: ProgressionKey) {
    const existing = await db.phaseProgress.where('exerciseKey').equals(key).first()
    if (existing && existing.phase < 4) {
      await db.phaseProgress.update(existing.id!, {
        phase: (existing.phase + 1) as 1 | 2 | 3 | 4,
        checkpointMet: false,
        updatedAt: new Date().toISOString()
      })
    }
  }

  return { rows: rows ?? [], getPhase, setPhase, setCheckpoint, advancePhase }
}
