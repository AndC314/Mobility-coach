import { useState } from 'react'
import { Card } from './Card'
import { usePrograms } from '../hooks/usePrograms'
import { usePreferences } from '../hooks/usePreferences'
import { db, type TrainingProgram, type ProgramWeek, type ProgramSession, type SessionPlanItem } from '../db/db'
import { generateProgram, GOAL_META, type ProgramGoal, type ProgramIntensity, type ProgramConfig } from '../lib/programGenerator'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function ProgramCard() {
  const { active, programs, createProgram, markSessionDone, deactivateProgram } = usePrograms()
  const [showBuilder, setShowBuilder] = useState(false)

  if (showBuilder || !active) {
    return (
      <ProgramBuilder
        onCreated={() => setShowBuilder(false)}
        createProgram={createProgram}
        pastCount={programs.length}
      />
    )
  }

  return <ActiveProgramView program={active} markSessionDone={markSessionDone} deactivateProgram={deactivateProgram} />
}

// ─── BUILDER ──────────────────────────────────────────────────────────────────

function ProgramBuilder({
  onCreated,
  createProgram,
  pastCount,
}: {
  onCreated: () => void
  createProgram: (p: Omit<TrainingProgram, 'id'>) => void
  pastCount: number
}) {
  const { preferences } = usePreferences()
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState<ProgramGoal>('hypertrophy')
  const [days, setDays] = useState(3)
  const [minutes, setMinutes] = useState(30)
  const [intensity, setIntensity] = useState<ProgramIntensity>('moderate')
  const [weeks, setWeeks] = useState(4)

  function handleCreate() {
    const config: ProgramConfig = {
      goal,
      daysPerWeek: days,
      sessionMinutes: minutes,
      intensity,
      equipment: preferences.availableEquipment ?? [],
      totalWeeks: weeks,
    }
    createProgram(generateProgram(config))
    onCreated()
  }

  const steps = [
    // Step 0: Goal
    <div key="goal" className="space-y-3">
      <h3 className="text-sm font-bold">What's your training goal?</h3>
      {(Object.keys(GOAL_META) as ProgramGoal[]).map((g) => (
        <button
          key={g}
          onClick={() => { setGoal(g); setStep(1) }}
          className={`w-full text-left rounded-xl px-4 py-3 border transition-colors ${
            goal === g ? 'bg-purple/10 border-purple/40' : 'bg-card2 border-border'
          }`}
        >
          <span className="text-sm font-semibold text-ink">{GOAL_META[g].label}</span>
          <span className="block text-[10px] text-muted mt-0.5">
            {g === 'strength' && 'Heavy, low reps. Build max force.'}
            {g === 'hypertrophy' && 'Moderate load, more volume. Build muscle.'}
            {g === 'endurance' && 'Light, high reps. Conditioning focus.'}
            {g === 'skills' && 'Practice-oriented. Learn movements.'}
          </span>
        </button>
      ))}
    </div>,

    // Step 1: Schedule
    <div key="schedule" className="space-y-4">
      <h3 className="text-sm font-bold">How often can you train?</h3>

      <div>
        <label className="text-xs text-muted mb-2 block">Days per week</label>
        <div className="flex gap-2">
          {[2, 3, 4, 5, 6].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold border ${
                days === d ? 'bg-purple/15 border-purple/40 text-purple' : 'bg-card2 border-border text-muted'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted mb-2 block">Session duration</label>
        <div className="flex gap-2">
          {[20, 30, 40, 50, 60].map((m) => (
            <button
              key={m}
              onClick={() => setMinutes(m)}
              className={`flex-1 rounded-lg py-2.5 text-xs font-bold border ${
                minutes === m ? 'bg-purple/15 border-purple/40 text-purple' : 'bg-card2 border-border text-muted'
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setStep(2)}
        className="w-full rounded-xl bg-purple py-2.5 text-sm font-bold text-white mt-2"
      >
        Next
      </button>
    </div>,

    // Step 2: Intensity + duration
    <div key="intensity" className="space-y-4">
      <h3 className="text-sm font-bold">Intensity & program length</h3>

      <div>
        <label className="text-xs text-muted mb-2 block">Training intensity</label>
        <div className="flex gap-2">
          {(['moderate', 'hard', 'max'] as ProgramIntensity[]).map((i) => (
            <button
              key={i}
              onClick={() => setIntensity(i)}
              className={`flex-1 rounded-lg py-2.5 text-xs font-bold border capitalize ${
                intensity === i ? 'bg-purple/15 border-purple/40 text-purple' : 'bg-card2 border-border text-muted'
              }`}
            >
              {i}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted mt-1">
          {intensity === 'moderate' && 'Sustainable volume — room to grow'}
          {intensity === 'hard' && 'High volume — demanding but manageable'}
          {intensity === 'max' && 'Maximum volume — needs solid recovery'}
        </p>
      </div>

      <div>
        <label className="text-xs text-muted mb-2 block">Program length (weeks)</label>
        <div className="flex gap-2">
          {[3, 4, 5, 6].map((w) => (
            <button
              key={w}
              onClick={() => setWeeks(w)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold border ${
                weeks === w ? 'bg-purple/15 border-purple/40 text-purple' : 'bg-card2 border-border text-muted'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted mt-1">Last week is always a deload</p>
      </div>

      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted mb-1">Equipment (from your Profile):</p>
        <p className="text-[10px] text-ink">
          {preferences.availableEquipment?.length
            ? preferences.availableEquipment.map((e) => e.replace(/_/g, ' ')).join(', ')
            : 'None selected — bodyweight only'}
        </p>
        <p className="text-[10px] text-muted mt-1 italic">
          Change in Profile → Equipment
        </p>
      </div>

      <button
        onClick={handleCreate}
        className="w-full rounded-xl bg-purple py-3 text-sm font-bold text-white"
      >
        Generate My Program
      </button>
    </div>,
  ]

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold">Build Your Program</h2>
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="text-xs text-purple font-semibold">
            ← Back
          </button>
        )}
      </div>

      {/* Step dots */}
      <div className="flex gap-1.5 mb-4">
        {[0, 1, 2].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-purple' : 'bg-card2'}`}
          />
        ))}
      </div>

      {steps[step]}
    </Card>
  )
}

// ─── ACTIVE PROGRAM VIEW ──────────────────────────────────────────────────────

function ActiveProgramView({
  program,
  markSessionDone,
  deactivateProgram,
}: {
  program: TrainingProgram
  markSessionDone: (id: number, week: number, day: number) => void
  deactivateProgram: (id: number) => void
}) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [editingExercise, setEditingExercise] = useState<string | null>(null)

  const currentWeekDef = program.weeks.find((w) => w.weekNumber === program.currentWeek)
  const totalSessions = program.weeks.reduce((s, w) => s + w.sessions.length, 0)
  const completedCount = program.completedSessions.length
  const progressPct = Math.round((completedCount / totalSessions) * 100)

  return (
    <div className="space-y-3">
      {/* Program header */}
      <Card className="border-purple/20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-bold">{program.name}</h2>
            <p className="text-[11px] text-muted">{program.goal}</p>
          </div>
          <button
            onClick={() => deactivateProgram(program.id!)}
            className="text-[10px] text-muted hover:text-red-400 px-2 py-1 border border-border rounded-lg"
          >
            End
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-muted">
              Week {program.currentWeek} of {program.totalWeeks}
            </span>
            <span className="text-[11px] font-semibold text-purple">
              {completedCount}/{totalSessions} sessions ({progressPct}%)
            </span>
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
          {program.weeks.map((w) => {
            const weekDone = w.sessions.filter((s) =>
              program.completedSessions.includes(`${w.weekNumber}-${s.dayOfWeek}`)
            ).length
            const isCurrent = w.weekNumber === program.currentWeek
            const allDone = weekDone === w.sessions.length
            return (
              <div
                key={w.weekNumber}
                className={`flex-1 rounded-lg py-1.5 text-center text-[10px] font-semibold border ${
                  isCurrent
                    ? 'bg-purple/15 border-purple/40 text-purple'
                    : allDone
                    ? 'bg-green-400/10 border-green-400/30 text-green-400'
                    : 'bg-card2 border-border text-muted'
                }`}
              >
                {w.isDeload ? 'D' : `W${w.weekNumber}`}
                {allDone && ' ✓'}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Current week sessions */}
      {currentWeekDef && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">
              {currentWeekDef.isDeload ? '🧘 Deload Week' : `Week ${currentWeekDef.weekNumber}`}
            </h3>
            <span className="text-[10px] text-muted italic">{currentWeekDef.focus}</span>
          </div>

          <div className="space-y-2">
            {currentWeekDef.sessions.map((sess) => {
              const key = `${currentWeekDef.weekNumber}-${sess.dayOfWeek}`
              const done = program.completedSessions.includes(key)
              const isExpanded = expandedSession === key

              return (
                <div key={key} className="rounded-xl border border-border overflow-hidden">
                  {/* Session header */}
                  <button
                    onClick={() => setExpandedSession(isExpanded ? null : key)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors ${
                      done ? 'bg-green-400/5' : 'bg-card2'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${done ? 'text-green-400' : 'text-muted'}`}>
                        {done ? '✓' : DAY_NAMES[sess.dayOfWeek] || `Day ${sess.dayOfWeek + 1}`}
                      </span>
                      <span className="text-sm font-semibold text-ink">{sess.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted">
                        {sess.exercises.length} ex · {sess.exercises.reduce((s, e) => s + e.sets, 0)} sets
                      </span>
                      <span className="text-muted text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Exercise list */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 space-y-1 border-t border-border/50">
                      {sess.exercises.map((ex, i) => (
                        <ExerciseRow
                          key={i}
                          exercise={ex}
                          programId={program.id!}
                          weekNumber={currentWeekDef.weekNumber}
                          sessionDay={sess.dayOfWeek}
                          exerciseIdx={i}
                          isEditing={editingExercise === `${key}-${i}`}
                          onEdit={() => setEditingExercise(editingExercise === `${key}-${i}` ? null : `${key}-${i}`)}
                        />
                      ))}

                      {!done && (
                        <button
                          onClick={() => markSessionDone(program.id!, currentWeekDef.weekNumber, sess.dayOfWeek)}
                          className="mt-2 w-full rounded-xl bg-purple py-2.5 text-sm font-bold text-white"
                        >
                          Complete Session
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Next week preview */}
      {program.currentWeek < program.totalWeeks && (
        <ProgressionPreview program={program} />
      )}
    </div>
  )
}

// ─── EXERCISE ROW ─────────────────────────────────────────────────────────────

function ExerciseRow({
  exercise,
  programId,
  weekNumber,
  sessionDay,
  exerciseIdx,
  isEditing,
  onEdit,
}: {
  exercise: SessionPlanItem
  programId: number
  weekNumber: number
  sessionDay: number
  exerciseIdx: number
  isEditing: boolean
  onEdit: () => void
}) {
  const [sets, setSets] = useState(exercise.sets)
  const [reps, setReps] = useState(exercise.reps)

  async function saveEdit() {
    const prog = await db.trainingPrograms.get(programId)
    if (!prog) return
    const weekIdx = prog.weeks.findIndex((w) => w.weekNumber === weekNumber)
    if (weekIdx < 0) return
    const sessIdx = prog.weeks[weekIdx].sessions.findIndex((s) => s.dayOfWeek === sessionDay)
    if (sessIdx < 0) return

    const updatedWeeks = [...prog.weeks]
    const updatedExercises = [...updatedWeeks[weekIdx].sessions[sessIdx].exercises]
    updatedExercises[exerciseIdx] = { ...updatedExercises[exerciseIdx], sets, reps }
    updatedWeeks[weekIdx] = {
      ...updatedWeeks[weekIdx],
      sessions: updatedWeeks[weekIdx].sessions.map((s, i) =>
        i === sessIdx ? { ...s, exercises: updatedExercises } : s
      ),
    }
    await db.trainingPrograms.update(programId, { weeks: updatedWeeks })
    onEdit()
  }

  if (isEditing) {
    return (
      <div className="rounded-lg bg-card p-2.5 border border-purple/30 space-y-2">
        <span className="text-xs font-semibold text-ink">{exercise.name}</span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted">Sets</span>
            <input
              type="number"
              value={sets}
              onChange={(e) => setSets(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 rounded bg-card2 border border-border px-2 py-1 text-xs text-ink text-center"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted">Reps</span>
            <input
              type="text"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="w-16 rounded bg-card2 border border-border px-2 py-1 text-xs text-ink text-center"
            />
          </label>
          <span className="text-[10px] text-muted">{exercise.restSec}s rest</span>
        </div>
        <div className="flex gap-2">
          <button onClick={saveEdit} className="text-[10px] font-bold text-purple">Save</button>
          <button onClick={onEdit} className="text-[10px] text-muted">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={onEdit}
      className="w-full flex items-center justify-between rounded-lg px-2.5 py-2 hover:bg-card2/50 transition-colors text-left"
    >
      <span className="text-xs text-ink">{exercise.name}</span>
      <span className="text-[10px] text-muted font-mono">
        {exercise.sets} × {exercise.reps}
        <span className="ml-1 text-muted/40">({exercise.restSec}s)</span>
      </span>
    </button>
  )
}

// ─── PROGRESSION PREVIEW ──────────────────────────────────────────────────────

function ProgressionPreview({ program }: { program: TrainingProgram }) {
  const nextWeek = program.weeks.find((w) => w.weekNumber === program.currentWeek + 1)
  if (!nextWeek) return null

  const currentWeek = program.weeks.find((w) => w.weekNumber === program.currentWeek)
  if (!currentWeek) return null

  return (
    <Card>
      <h3 className="text-sm font-bold mb-2">
        Coming up: {nextWeek.isDeload ? '🧘 Deload' : `Week ${nextWeek.weekNumber}`}
      </h3>
      <p className="text-[10px] text-muted mb-2">{nextWeek.focus}</p>

      <div className="space-y-1">
        {nextWeek.sessions.map((sess, si) => {
          const currentSess = currentWeek.sessions[si]
          const currentSets = currentSess?.exercises.reduce((s, e) => s + e.sets, 0) ?? 0
          const nextSets = sess.exercises.reduce((s, e) => s + e.sets, 0)
          const diff = nextSets - currentSets

          return (
            <div key={si} className="flex items-center justify-between text-xs">
              <span className="text-muted">{sess.label}</span>
              <span className="font-mono text-[10px]">
                {nextSets} sets
                {diff !== 0 && (
                  <span className={diff > 0 ? 'text-green-400 ml-1' : 'text-orange-400 ml-1'}>
                    ({diff > 0 ? '+' : ''}{diff})
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
