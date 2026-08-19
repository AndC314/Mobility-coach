import { useState, useRef, useEffect, useCallback } from 'react'
import { Card } from './Card'
import { db } from '../db/db'
import { getExerciseDef } from '../data/calisthenics'
import type { ChallengeDef, ChallengePR } from '../data/challenges'
import { useWakeLock } from '../hooks/useWakeLock'

interface Props {
  challenge: ChallengeDef
  onClose: () => void
  challengePR?: ChallengePR | null
}

type Phase = 'ready' | 'active' | 'done'

export default function ChallengeTimer({ challenge, onClose, challengePR }: Props) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [elapsed, setElapsed] = useState(0)
  const [reps, setReps] = useState(0)
  const [setLog, setSetLog] = useState<number[]>([])
  const [customReps, setCustomReps] = useState('')
  const [holdActive, setHoldActive] = useState(false)
  const [holdAccumulated, setHoldAccumulated] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isHoldChallenge = challenge.type === 'accumulate_hold'
  useWakeLock(running)

  const remaining = Math.max(0, challenge.timeLimitSec - elapsed)
  const exerciseDef = getExerciseDef(challenge.exerciseId)

  const score = isHoldChallenge ? holdAccumulated : reps
  const isTargetReached = challenge.targetReps != null && score >= challenge.targetReps

  useEffect(() => {
    if (running && remaining > 0 && !isTargetReached) {
      intervalRef.current = setInterval(() => {
        setElapsed((e) => e + 1)
        if (isHoldChallenge && holdActive) {
          setHoldAccumulated((h) => h + 1)
        }
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, remaining, isTargetReached, isHoldChallenge, holdActive])

  useEffect(() => {
    if (phase === 'active' && (remaining === 0 || isTargetReached)) {
      finish()
    }
  }, [remaining, isTargetReached, phase])

  const start = useCallback(() => {
    setPhase('active')
    setRunning(true)
  }, [])

  const pause = useCallback(() => setRunning(false), [])
  const resume = useCallback(() => setRunning(true), [])

  const addReps = useCallback((count: number) => {
    setReps((r) => r + count)
    setSetLog((log) => [...log, count])
  }, [])

  const addCustomReps = useCallback(() => {
    const n = parseInt(customReps, 10)
    if (n > 0) {
      setReps((r) => r + n)
      setSetLog((log) => [...log, n])
      setCustomReps('')
    }
  }, [customReps])

  const toggleHold = useCallback(() => {
    setHoldActive((h) => !h)
  }, [])

  async function finish() {
    setRunning(false)
    setHoldActive(false)
    setPhase('done')

    const finalScore = isHoldChallenge ? holdAccumulated : reps
    if (finalScore > 0) {
      const now = new Date().toISOString()
      const today = now.slice(0, 10)
      await db.calisthenicsLogs.add({
        date: today,
        exerciseId: challenge.exerciseId,
        metric: isHoldChallenge ? 'hold_sec' : 'reps',
        value: finalScore,
        sets: setLog.length || 1,
        elapsedSec: elapsed,
        notes: `Challenge: ${challenge.name} — ${formatTime(elapsed)}${setLog.length > 1 ? ` (${setLog.join('+')})` : ''}`,
        createdAt: now,
      })
    }
  }

  if (phase === 'done') {
    const finalScore = isHoldChallenge ? holdAccumulated : reps
    const success = challenge.targetReps != null ? finalScore >= challenge.targetReps : true

    // Dual-metric PR: time-based when target reached, reps-based otherwise
    let isNewPR = false
    let previousBestLabel: string | null = null
    if (challengePR) {
      if (challenge.type === 'target_reps' && success && challengePR.bestTimeSec != null) {
        isNewPR = elapsed < challengePR.bestTimeSec
        previousBestLabel = `Previous best: ${formatTime(challengePR.bestTimeSec)}`
      } else if (challenge.type === 'target_reps' && success && challengePR.bestTimeSec === null) {
        isNewPR = true // first time hitting target
      } else {
        isNewPR = finalScore > challengePR.bestReps
        previousBestLabel = challengePR.bestReps > 0
          ? `Previous best: ${isHoldChallenge ? formatTime(challengePR.bestReps) : `${challengePR.bestReps} reps`}`
          : null
      }
    }

    return (
      <div className="space-y-4 fade-in">
        <Card>
          <div className="py-6 text-center space-y-3">
            <div className="text-4xl">{success ? '🏆' : '💪'}</div>
            <h2 className="text-xl font-black text-ink">
              {success ? 'Challenge Complete!' : 'Time\'s Up!'}
            </h2>
            <p className="text-sm text-muted">{challenge.name}</p>

            <div className="flex justify-center gap-6 pt-2">
              <Stat label={isHoldChallenge ? 'Hold' : 'Reps'} value={isHoldChallenge ? formatTime(finalScore) : String(finalScore)} />
              <Stat label="Time" value={formatTime(elapsed)} />
              {challenge.targetReps != null && (
                <Stat label="Target" value={isHoldChallenge ? formatTime(challenge.targetReps) : String(challenge.targetReps)} />
              )}
            </div>

            {setLog.length > 1 && !isHoldChallenge && (
              <p className="text-xs text-muted font-mono">
                {setLog.join(' + ')}
              </p>
            )}

            {isNewPR && (
              <div className="mt-2 inline-block rounded-full bg-purple/15 px-3 py-1 text-xs font-bold text-purple border border-purple/30">
                New Personal Record!
              </div>
            )}

            {!isNewPR && previousBestLabel && (
              <p className="text-xs text-muted mt-1">{previousBestLabel}</p>
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

  const progressPercent = challenge.targetReps != null
    ? Math.min(100, Math.round((score / challenge.targetReps) * 100))
    : Math.min(100, Math.round((elapsed / challenge.timeLimitSec) * 100))

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

      <Card>
        <div className="py-4 text-center space-y-4">
          {phase === 'ready' && (
            <>
              <h2 className="text-lg font-bold text-ink">{challenge.name}</h2>
              <p className="text-sm text-muted">{challenge.description}</p>
              {challengePR && (challengePR.bestTimeSec != null || challengePR.bestReps > 0) && (
                <p className="text-sm font-semibold text-accent">
                  PR to beat: {challenge.type === 'target_reps' && challengePR.bestTimeSec != null
                    ? formatTime(challengePR.bestTimeSec)
                    : isHoldChallenge
                      ? formatTime(challengePR.bestReps)
                      : `${challengePR.bestReps} ${exerciseDef?.type === 'hold' ? 's' : 'reps'}`}
                </p>
              )}
              <div className="flex justify-center gap-4 pt-2">
                <Stat label="Time limit" value={formatTime(challenge.timeLimitSec)} />
                {challenge.targetReps != null && (
                  <Stat label="Target" value={isHoldChallenge ? formatTime(challenge.targetReps) : `${challenge.targetReps}`} />
                )}
              </div>
            </>
          )}

          {phase === 'active' && (
            <>
              <div className={`text-5xl font-black tabular-nums ${remaining <= 10 ? 'text-accent' : 'text-ink'}`}>
                {formatTime(remaining)}
              </div>

              {isHoldChallenge ? (
                <>
                  <div className={`text-3xl font-black ${holdActive ? 'text-teal' : 'text-muted'}`}>
                    {formatTime(holdAccumulated)}
                  </div>
                  <p className="text-xs text-muted">
                    {holdActive ? 'Holding...' : 'Resting'} — {formatTime(holdAccumulated)}/{formatTime(challenge.targetReps ?? 0)} accumulated
                  </p>
                </>
              ) : (
                <>
                  <div className="text-3xl font-black text-teal">{reps}</div>
                  <p className="text-xs text-muted">
                    {challenge.targetReps != null
                      ? `${reps}/${challenge.targetReps} reps`
                      : 'total reps'}
                  </p>
                </>
              )}

              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-teal transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </>
          )}
        </div>
      </Card>

      {phase === 'ready' && (
        <button
          onClick={start}
          className="w-full rounded-xl bg-orange py-3.5 text-base font-bold text-white shadow-lg shadow-orange/30"
        >
          Start Challenge
        </button>
      )}

      {phase === 'active' && (
        <div className="space-y-2">
          {isHoldChallenge ? (
            <button
              onClick={toggleHold}
              className={`w-full rounded-xl py-4 text-lg font-bold transition-all active:scale-95 ${
                holdActive
                  ? 'bg-accent text-white shadow-lg shadow-accent/30'
                  : 'bg-teal/15 text-teal border-2 border-teal/40'
              }`}
            >
              {holdActive ? 'Release (resting)' : 'Hold (tap & hold)'}
            </button>
          ) : (
            <>
              {/* Custom number input + quick buttons */}
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="reps"
                  value={customReps}
                  onChange={(e) => setCustomReps(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomReps()}
                  className="flex-1 rounded-xl border border-teal/30 bg-card px-3 py-3 text-center text-lg font-bold text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal"
                />
                <button
                  onClick={addCustomReps}
                  disabled={!customReps || parseInt(customReps, 10) <= 0}
                  className="rounded-xl bg-teal px-5 py-3 text-base font-bold text-white active:scale-95 transition-transform disabled:opacity-40"
                >
                  + Add
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[5, 10, 15, 20, 25].map((n) => (
                  <button
                    key={n}
                    onClick={() => addReps(n)}
                    className="rounded-xl bg-teal/15 py-2.5 text-sm font-bold text-teal border border-teal/30 active:scale-95 transition-transform"
                  >
                    +{n}
                  </button>
                ))}
              </div>
              {/* Set breakdown log */}
              {setLog.length > 0 && (
                <div className="rounded-xl bg-card2 border border-border px-3 py-2">
                  <p className="text-xs text-muted font-semibold mb-1">Sets</p>
                  <p className="text-sm text-ink font-mono">
                    {setLog.join(' + ')} = {reps}
                  </p>
                </div>
              )}
            </>
          )}

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
        </div>
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
