import { useState, useRef, useEffect, useCallback } from 'react'
import { Card } from './Card'
import { db } from '../db/db'
import type { ChallengeDef } from '../data/challenges'
import { useWakeLock } from '../hooks/useWakeLock'

interface Props {
  challenge: ChallengeDef
  onClose: () => void
  previousBest?: number | null
}

type Phase = 'ready' | 'active' | 'done'

export default function CircuitTimer({ challenge, onClose, previousBest }: Props) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [elapsed, setElapsed] = useState(0)
  const [rounds, setRounds] = useState(0)
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const exercises = challenge.circuitExercises ?? []
  useWakeLock(running)

  const remaining = Math.max(0, challenge.timeLimitSec - elapsed)

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setElapsed((e) => e + 1)
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, remaining])

  useEffect(() => {
    if (phase === 'active' && remaining === 0) {
      finish()
    }
  }, [remaining, phase])

  const start = useCallback(() => {
    setPhase('active')
    setRunning(true)
  }, [])

  const pause = useCallback(() => setRunning(false), [])
  const resume = useCallback(() => setRunning(true), [])

  const completeExercise = useCallback(() => {
    const nextIdx = currentExerciseIdx + 1
    if (nextIdx >= exercises.length) {
      setRounds((r) => r + 1)
      setCurrentExerciseIdx(0)
    } else {
      setCurrentExerciseIdx(nextIdx)
    }
  }, [currentExerciseIdx, exercises.length])

  async function finish() {
    setRunning(false)
    setPhase('done')

    if (rounds > 0) {
      const now = new Date().toISOString()
      const today = now.slice(0, 10)
      await db.calisthenicsLogs.add({
        date: today,
        exerciseId: challenge.exerciseId,
        metric: 'reps',
        value: rounds,
        sets: 1,
        elapsedSec: elapsed,
        notes: `Challenge: ${challenge.name} — ${rounds} rounds in ${formatTime(elapsed)}`,
        createdAt: now,
      })
    }
  }

  if (phase === 'done') {
    const isNewPR = previousBest != null && rounds > previousBest
    const totalReps = exercises.reduce((sum, ex) => sum + ex.reps * rounds, 0)

    return (
      <div className="space-y-4 fade-in">
        <Card>
          <div className="py-6 text-center space-y-3">
            <div className="text-4xl">🔁</div>
            <h2 className="text-xl font-black text-ink">
              {rounds >= 20 ? 'Beast Mode!' : rounds >= 10 ? 'Strong Work!' : 'Challenge Complete!'}
            </h2>
            <p className="text-sm text-muted">{challenge.name}</p>

            <div className="flex justify-center gap-6 pt-2">
              <Stat label="Rounds" value={String(rounds)} />
              <Stat label="Time" value={formatTime(elapsed)} />
              <Stat label="Total reps" value={String(totalReps)} />
            </div>

            <div className="mt-3 text-[11px] text-muted space-y-0.5">
              {exercises.map((ex) => (
                <p key={ex.exerciseId}>{ex.label}: {ex.reps * rounds} total</p>
              ))}
            </div>

            {isNewPR && (
              <div className="mt-2 inline-block rounded-full bg-purple/15 px-3 py-1 text-xs font-bold text-purple border border-purple/30">
                New Personal Record!
              </div>
            )}

            {previousBest != null && !isNewPR && (
              <p className="text-xs text-muted mt-1">
                Previous best: {previousBest} rounds
              </p>
            )}

            {challenge.benchmark && (
              <p className="text-[11px] text-muted italic mt-2">{challenge.benchmark}</p>
            )}
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

  const currentEx = exercises[currentExerciseIdx]
  const timePercent = Math.min(100, Math.round((elapsed / challenge.timeLimitSec) * 100))

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-xs text-muted underline">
          &larr; Back
        </button>
        <span className="text-xs font-semibold text-muted">
          {challenge.icon} {challenge.name}
        </span>
      </div>

      {phase === 'ready' && (
        <>
          <Card>
            <div className="py-4 text-center space-y-4">
              <h2 className="text-lg font-bold text-ink">{challenge.name}</h2>
              <p className="text-sm text-muted">{challenge.description}</p>

              <div className="space-y-2 pt-2">
                {exercises.map((ex, i) => (
                  <div key={ex.exerciseId} className="flex items-center justify-between rounded-lg bg-card2 px-4 py-2.5">
                    <span className="text-sm font-semibold text-ink">{ex.label}</span>
                    <span className="text-sm font-bold text-teal">{ex.reps} reps</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-4 pt-2">
                <Stat label="Time cap" value={formatTime(challenge.timeLimitSec)} />
                <Stat label="Format" value="AMRAP" />
              </div>

              {previousBest != null && previousBest > 0 && (
                <p className="text-sm font-semibold text-accent">
                  PR to beat: {previousBest} rounds
                </p>
              )}

              {challenge.benchmark && (
                <p className="text-[11px] text-muted italic">{challenge.benchmark}</p>
              )}
            </div>
          </Card>

          <button
            onClick={start}
            className="w-full rounded-xl bg-orange py-3.5 text-base font-bold text-white shadow-lg shadow-orange/30"
          >
            Start Challenge
          </button>
        </>
      )}

      {phase === 'active' && (
        <>
          <Card>
            <div className="py-3 text-center space-y-3">
              {/* Timer */}
              <div className={`text-4xl font-black tabular-nums ${remaining <= 30 ? 'text-accent' : 'text-ink'}`}>
                {formatTime(remaining)}
              </div>

              {/* Round counter */}
              <div className="text-2xl font-black text-teal">
                {rounds} <span className="text-sm font-semibold text-muted">rounds</span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-orange transition-all"
                  style={{ width: `${timePercent}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Exercise checklist */}
          <Card>
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Round {rounds + 1}
                </span>
                <span className="text-[10px] text-muted">
                  {currentExerciseIdx + 1}/{exercises.length}
                </span>
              </div>

              {exercises.map((ex, i) => {
                const isDone = i < currentExerciseIdx
                const isCurrent = i === currentExerciseIdx
                return (
                  <div
                    key={ex.exerciseId}
                    className={`flex items-center justify-between rounded-lg px-4 py-3 border transition-all ${
                      isCurrent
                        ? 'bg-teal/10 border-teal/40'
                        : isDone
                          ? 'bg-card2 border-border opacity-50'
                          : 'bg-card2 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isDone ? 'bg-teal text-white' : isCurrent ? 'bg-teal/20 text-teal' : 'bg-border text-muted'
                      }`}>
                        {isDone ? '✓' : i + 1}
                      </div>
                      <span className={`text-sm font-semibold ${isCurrent ? 'text-ink' : 'text-muted'}`}>
                        {ex.label}
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${isCurrent ? 'text-teal' : 'text-muted'}`}>
                      {ex.reps}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Action buttons */}
          <button
            onClick={completeExercise}
            className="w-full rounded-xl bg-teal py-4 text-base font-bold text-white active:scale-[0.97] transition-transform shadow-lg shadow-teal/20"
          >
            {currentExerciseIdx === exercises.length - 1
              ? `✓ Round ${rounds + 1} complete`
              : `✓ ${currentEx?.label} done → next`
            }
          </button>

          <div className="flex gap-2">
            <button
              onClick={running ? pause : resume}
              className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-ink"
            >
              {running ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={finish}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-white"
            >
              Finish Early
            </button>
          </div>
        </>
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

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
