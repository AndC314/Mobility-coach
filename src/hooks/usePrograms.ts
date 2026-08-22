import { useLiveQuery } from 'dexie-react-hooks'
import { db, type TrainingProgram, type ProgramWeek } from '../db/db'

export function usePrograms() {
  const programs = useLiveQuery(() => db.trainingPrograms.toArray(), [], [])
  const active = programs.find((p) => p.active) ?? null

  async function createProgram(program: Omit<TrainingProgram, 'id'>) {
    // Deactivate existing active programs
    const existing = await db.trainingPrograms.where('active').equals(1).toArray()
    for (const p of existing) {
      await db.trainingPrograms.update(p.id!, { active: false })
    }
    await db.trainingPrograms.add(program)
  }

  async function markSessionDone(programId: number, weekNum: number, dayOfWeek: number) {
    const program = await db.trainingPrograms.get(programId)
    if (!program) return
    const key = `${weekNum}-${dayOfWeek}`
    if (program.completedSessions.includes(key)) return
    const updated = [...program.completedSessions, key]

    // Advance week if all sessions for current week are done
    const currentWeekDef = program.weeks.find((w) => w.weekNumber === program.currentWeek)
    let newCurrentWeek = program.currentWeek
    if (currentWeekDef) {
      const weekKeys = currentWeekDef.sessions.map((s) => `${program.currentWeek}-${s.dayOfWeek}`)
      const allDone = weekKeys.every((k) => updated.includes(k))
      if (allDone && program.currentWeek < program.totalWeeks) {
        newCurrentWeek = program.currentWeek + 1
      }
    }

    await db.trainingPrograms.update(programId, {
      completedSessions: updated,
      currentWeek: newCurrentWeek,
    })
  }

  async function deleteProgram(programId: number) {
    await db.trainingPrograms.delete(programId)
  }

  async function deactivateProgram(programId: number) {
    await db.trainingPrograms.update(programId, { active: false })
  }

  return { programs, active, createProgram, markSessionDone, deleteProgram, deactivateProgram }
}
