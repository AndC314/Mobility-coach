import { Card } from './Card'
import { useHiitTimer, type HiitPhase } from '../hooks/useHiitTimer'
import { getExerciseDef } from '../data/calisthenics'
import { HIIT_FORMAT_INFO, type HiitWorkoutDef } from '../data/hiitWorkouts'
import { useWakeLock } from '../hooks/useWakeLock'

interface Props {
  workout: HiitWorkoutDef
  onClose: () => void
}

const PHASE_COLORS: Record<HiitPhase, string> = {
  idle: '#7a7d96',
  countdown: '#a78bfa',
  work: '#e8622a',
  rest: '#2ec4b6',
  done: '#2ec4b6',
}

export default function HiitTimer({ workout, onClose }: Props) {
  const timer = useHiitTimer({
    format: workout.format,
    workSec: workout.workSec,
    restSec: workout.restSec,
    rounds: workout.rounds,
    exerciseCount: workout.exercises.length,
  })

  useWakeLock(timer.running)

  const currentExercise = workout.exercises[timer.currentExerciseIndex]
  const exerciseDef = getExerciseDef(currentExercise)
  const phaseColor = PHASE_COLORS[timer.phase]

  const mins = Math.floor(timer.remaining / 60)
  const secs = timer.remaining % 60

  if (timer.phase === 'done') {
    return (
      <div className="space-y-4 fade-in">
        <Card>
          <div className="py-6 text-center space-y-3">
            <div className="text-4xl">🎉</div>
            <h2 className="text-xl font-black text-ink">Workout Complete!</h2>
            <p className="text-sm text-muted">{workout.name} — {HIIT_FORMAT_INFO[workout.format].label}</p>
            <div className="flex justify-center gap-6 pt-2">
              <Stat label="Rounds" value={String(timer.totalRounds)} />
              <Stat label="Time" value={formatElapsed(timer.totalElapsed)} />
            </div>
          </div>
        </Card>
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-teal py-3 text-sm font-bold text-white"
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-xs text-muted underline">
          &larr; Back
        </button>
        <span className="text-xs font-semibold text-muted">
          {HIIT_FORMAT_INFO[workout.format].icon} {workout.name}
        </span>
      </div>

      <Card>
        <div className="py-4 text-center space-y-4">
          {timer.phase !== 'idle' && (
            <div
              className="mx-auto rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
              style={{ background: phaseColor + '22', color: phaseColor }}
            >
              {timer.phase === 'countdown' ? 'Get Ready' : timer.phase === 'work' ? 'Work' : 'Rest'}
            </div>
          )}

          <div
            className="text-6xl font-black tabular-nums"
            style={{ color: timer.phase === 'idle' ? '#7a7d96' : phaseColor }}
          >
            {mins > 0 && `${mins}:`}{secs.toString().padStart(mins > 0 ? 2 : 1, '0')}
          </div>

          {timer.phase !== 'idle' && timer.phase !== 'countdown' && exerciseDef && (
            <div className="text-lg font-bold text-ink">{exerciseDef.name}</div>
          )}

          {timer.phase !== 'idle' && (
            <div className="flex justify-center gap-4">
              <Stat label="Round" value={`${timer.currentRound}/${timer.totalRounds}`} />
              <Stat label="Elapsed" value={formatElapsed(timer.totalElapsed)} />
            </div>
          )}

          {timer.phase !== 'idle' && workout.rounds > 1 && (
            <div className="flex justify-center gap-0.5">
              {Array.from({ length: timer.totalRounds }, (_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${Math.min(32, 200 / timer.totalRounds)}px`,
                    background: i < timer.currentRound - 1
                      ? '#2ec4b6'
                      : i === timer.currentRound - 1
                        ? phaseColor
                        : '#2e3248',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-2">
        {timer.phase === 'idle' ? (
          <button
            onClick={timer.start}
            className="flex-1 rounded-xl bg-orange py-3 text-sm font-bold text-white"
          >
            Start Workout
          </button>
        ) : (
          <>
            <button
              onClick={timer.running ? timer.pause : timer.resume}
              className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-ink"
            >
              {timer.running ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={timer.reset}
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-muted"
            >
              Reset
            </button>
          </>
        )}
      </div>

      {timer.phase === 'idle' && (
        <Card>
          <h3 className="mb-2 text-xs font-bold text-muted uppercase tracking-wider">Exercises</h3>
          <div className="space-y-1.5">
            {workout.exercises.map((exId, i) => {
              const def = getExerciseDef(exId)
              return (
                <div key={exId} className="flex items-center gap-2 text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-card2 text-[10px] font-bold text-muted">
                    {i + 1}
                  </span>
                  <span className="text-ink">{def?.name ?? exId}</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-sm font-bold text-ink">{value}</div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  )
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
