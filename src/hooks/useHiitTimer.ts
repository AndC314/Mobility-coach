import { useEffect, useRef, useState, useCallback } from 'react'
import { playMidwayDing, playCompleteDing, primeAudio } from '../lib/sound'
import type { HiitFormat } from '../data/hiitWorkouts'

export type HiitPhase = 'idle' | 'countdown' | 'work' | 'rest' | 'done'

export interface HiitTimerState {
  phase: HiitPhase
  remaining: number
  currentRound: number
  totalRounds: number
  currentExerciseIndex: number
  totalElapsed: number
  roundsCompleted: number
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  running: boolean
}

interface HiitTimerConfig {
  format: HiitFormat
  workSec: number
  restSec: number
  rounds: number
  exerciseCount: number
  soundEnabled?: boolean
}

const COUNTDOWN_SEC = 3

export function useHiitTimer(config: HiitTimerConfig): HiitTimerState {
  const { format, workSec, restSec, rounds, exerciseCount, soundEnabled = true } = config

  const [phase, setPhase] = useState<HiitPhase>('idle')
  const [remaining, setRemaining] = useState(0)
  const [currentRound, setCurrentRound] = useState(1)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [totalElapsed, setTotalElapsed] = useState(0)
  const [running, setRunning] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startWork = useCallback(() => {
    setPhase('work')
    if (format === 'amrap') {
      setRemaining(workSec)
    } else {
      setRemaining(workSec)
    }
  }, [format, workSec])

  const startRest = useCallback(() => {
    if (restSec <= 0) {
      advanceRound()
      return
    }
    setPhase('rest')
    setRemaining(restSec)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restSec])

  const advanceRound = useCallback(() => {
    setCurrentRound((r) => {
      const next = r + 1
      if (next > rounds) {
        setPhase('done')
        setRunning(false)
        if (soundEnabled) playCompleteDing()
        return r
      }
      if (exerciseCount > 1) {
        setCurrentExerciseIndex((i) => (i + 1) % exerciseCount)
      }
      startWork()
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, exerciseCount, soundEnabled, startWork])

  useEffect(() => {
    if (!running) {
      clearTimer()
      return
    }

    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (phase === 'countdown') {
            startWork()
            if (soundEnabled) playMidwayDing()
          } else if (phase === 'work') {
            if (format === 'amrap') {
              setPhase('done')
              setRunning(false)
              if (soundEnabled) playCompleteDing()
            } else {
              if (soundEnabled) playMidwayDing()
              startRest()
            }
          } else if (phase === 'rest') {
            advanceRound()
          }
          return 0
        }
        return r - 1
      })
      setTotalElapsed((t) => t + 1)
    }, 1000)

    return clearTimer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase])

  function start() {
    primeAudio()
    setPhase('countdown')
    setRemaining(COUNTDOWN_SEC)
    setCurrentRound(1)
    setCurrentExerciseIndex(0)
    setTotalElapsed(0)
    setRunning(true)
  }

  function pause() {
    setRunning(false)
  }

  function resume() {
    primeAudio()
    setRunning(true)
  }

  function reset() {
    clearTimer()
    setPhase('idle')
    setRemaining(0)
    setCurrentRound(1)
    setCurrentExerciseIndex(0)
    setTotalElapsed(0)
    setRunning(false)
  }

  return {
    phase,
    remaining,
    currentRound,
    totalRounds: rounds,
    currentExerciseIndex,
    totalElapsed,
    roundsCompleted: Math.max(0, currentRound - 1),
    start,
    pause,
    resume,
    reset,
    running,
  }
}
