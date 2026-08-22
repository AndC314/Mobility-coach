import { useState } from 'react'
import { Card, Tag } from './Card'
import { usePrograms } from '../hooks/usePrograms'
import { db, type TrainingProgram, type ProgramWeek, type ProgramSession, type SessionPlanItem } from '../db/db'
import { getExerciseDef } from '../data/calisthenics'
import type { CalisthenicsExerciseId } from '../db/db'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function generateSampleProgram(): Omit<TrainingProgram, 'id'> {
  const pushExercises: SessionPlanItem[] = [
    { exerciseId: 'pushups', name: 'Push-ups', sets: 3, reps: '12', restSec: 90, category: 'push' },
    { exerciseId: 'dips', name: 'Dips', sets: 3, reps: '8', restSec: 90, category: 'push' },
    { exerciseId: 'pike_pushup', name: 'Pike Push-ups', sets: 3, reps: '10', restSec: 60, category: 'push' },
  ]
  const pullExercises: SessionPlanItem[] = [
    { exerciseId: 'pullups', name: 'Pull-ups', sets: 3, reps: '6', restSec: 120, category: 'pull' },
    { exerciseId: 'australian_pullups', name: 'Rows', sets: 3, reps: '10', restSec: 90, category: 'pull' },
    { exerciseId: 'dead_hang', name: 'Dead Hang', sets: 3, reps: '30s', restSec: 60, category: 'pull' },
  ]
  const legExercises: SessionPlanItem[] = [
    { exerciseId: 'squats', name: 'Squats', sets: 4, reps: '15', restSec: 90, category: 'legs' },
    { exerciseId: 'lunges', name: 'Lunges', sets: 3, reps: '10', restSec: 60, category: 'legs' },
    { exerciseId: 'calf_raises', name: 'Calf Raises', sets: 3, reps: '20', restSec: 45, category: 'legs' },
  ]

  const weeks: ProgramWeek[] = []
  for (let w = 1; w <= 4; w++) {
    const isDeload = w === 4
    const setsMultiplier = isDeload ? 0.6 : 1 + (w - 1) * 0.1
    weeks.push({
      weekNumber: w,
      focus: isDeload ? 'Recovery & deload' : `Progressive overload (week ${w})`,
      isDeload,
      sessions: [
        {
          dayOfWeek: 0,
          label: 'Push Day',
          exercises: pushExercises.map((e) => ({
            ...e,
            sets: Math.round(e.sets * setsMultiplier),
          })),
        },
        {
          dayOfWeek: 2,
          label: 'Pull Day',
          exercises: pullExercises.map((e) => ({
            ...e,
            sets: Math.round(e.sets * setsMultiplier),
          })),
        },
        {
          dayOfWeek: 4,
          label: 'Legs Day',
          exercises: legExercises.map((e) => ({
            ...e,
            sets: Math.round(e.sets * setsMultiplier),
          })),
        },
      ],
    })
  }

  return {
    name: '4-Week Push/Pull/Legs',
    goal: 'Build balanced upper and lower body strength with progressive overload',
    weeks,
    totalWeeks: 4,
    currentWeek: 1,
    completedSessions: [],
    createdAt: new Date().toISOString(),
    active: true,
  }
}

export default function ProgramCard() {
  const { active, programs, createProgram, markSessionDone, deactivateProgram, deleteProgram } = usePrograms()
  const [showAll, setShowAll] = useState(false)

  if (!active) {
    return (
      <Card>
        <div className="text-center py-4">
          <h2 className="text-base font-bold mb-1">Training Programs</h2>
          <p className="text-xs text-muted mb-4">
            Follow a structured multi-week plan with periodization and deload weeks
          </p>
          <button
            onClick={() => createProgram(generateSampleProgram())}
            className="rounded-full bg-purple/15 px-5 py-2.5 text-sm font-bold text-purple border border-purple/40"
          >
            Start 4-Week PPL Program
          </button>
          {programs.length > 0 && (
            <p className="mt-3 text-[10px] text-muted">
              {programs.length} past program{programs.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </Card>
    )
  }

  const currentWeekDef = active.weeks.find((w) => w.weekNumber === active.currentWeek)
  const totalSessions = active.weeks.reduce((s, w) => s + w.sessions.length, 0)
  const completedCount = active.completedSessions.length
  const progressPct = Math.round((completedCount / totalSessions) * 100)

  return (
    <div className="space-y-3">
      {/* Program overview */}
      <Card className="border-purple/20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-bold">{active.name}</h2>
            <p className="text-[11px] text-muted">{active.goal}</p>
          </div>
          <button
            onClick={() => deactivateProgram(active.id!)}
            className="text-[10px] text-muted hover:text-red-400"
          >
            End
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-muted">
              Week {active.currentWeek}/{active.totalWeeks}
            </span>
            <span className="text-[11px] font-semibold text-purple">{progressPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-card2 overflow-hidden">
            <div
              className="h-full rounded-full bg-purple transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Week pills */}
        <div className="flex gap-1">
          {active.weeks.map((w) => {
            const weekSessions = w.sessions.length
            const weekDone = w.sessions.filter((s) =>
              active.completedSessions.includes(`${w.weekNumber}-${s.dayOfWeek}`)
            ).length
            const isCurrent = w.weekNumber === active.currentWeek
            return (
              <div
                key={w.weekNumber}
                className={`flex-1 rounded-lg py-1.5 text-center text-[10px] font-semibold border ${
                  isCurrent
                    ? 'bg-purple/15 border-purple/40 text-purple'
                    : weekDone === weekSessions
                    ? 'bg-green-400/10 border-green-400/30 text-green-400'
                    : 'bg-card2 border-border text-muted'
                }`}
              >
                {w.isDeload ? 'D' : `W${w.weekNumber}`}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Current week sessions */}
      {currentWeekDef && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold">
              {currentWeekDef.isDeload ? '🧘 Deload Week' : `Week ${currentWeekDef.weekNumber}`}
            </h3>
            <span className="text-[11px] text-muted">{currentWeekDef.focus}</span>
          </div>

          <div className="space-y-2">
            {currentWeekDef.sessions.map((sess) => {
              const key = `${currentWeekDef.weekNumber}-${sess.dayOfWeek}`
              const done = active.completedSessions.includes(key)
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${
                    done ? 'bg-green-400/5 border-green-400/30' : 'bg-card2 border-border'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${done ? 'text-green-400' : 'text-ink'}`}>
                      {done ? '✓' : DAY_NAMES[sess.dayOfWeek]}
                    </span>
                    <span className="text-sm font-semibold text-ink">{sess.label}</span>
                    <span className="text-[10px] text-muted">
                      {sess.exercises.length} ex · {sess.exercises.reduce((s, e) => s + e.sets, 0)} sets
                    </span>
                  </div>
                  {!done && (
                    <button
                      onClick={() => markSessionDone(active.id!, currentWeekDef.weekNumber, sess.dayOfWeek)}
                      className="rounded-full bg-purple/10 px-2.5 py-1 text-[10px] font-bold text-purple"
                    >
                      Done
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
