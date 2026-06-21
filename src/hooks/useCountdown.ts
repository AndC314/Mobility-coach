import { useEffect, useRef, useState } from 'react'
import { playMidwayDing, playCompleteDing, primeAudio } from '../lib/sound'

export interface CountdownState {
  remaining: number
  running: boolean
  /** seconds elapsed so far (seconds - remaining) — used to record actual hold time */
  elapsedSec: number
  toggle: () => void
  reset: () => void
}

export function useCountdown(seconds: number, soundEnabled = true): CountdownState {
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const midwayFiredRef = useRef(false)

  // reset when the planned duration changes (e.g. switching exercises/phases)
  useEffect(() => {
    setRemaining(seconds)
    setRunning(false)
    midwayFiredRef.current = false
  }, [seconds])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          const next = r - 1

          if (soundEnabled) {
            const midpoint = Math.floor(seconds / 2)
            if (!midwayFiredRef.current && next === midpoint && next > 0) {
              midwayFiredRef.current = true
              playMidwayDing()
            }
          }

          if (next <= 0) {
            setRunning(false)
            if (intervalRef.current) clearInterval(intervalRef.current)
            if (soundEnabled) playCompleteDing()
            return 0
          }
          return next
        })
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  function toggle() {
    // Prime the AudioContext inside the user-gesture window (this tap).
    // Must happen before the interval fires — iOS won't allow audio from
    // a setInterval callback without this prior gesture-based unlock.
    primeAudio()

    if (remaining === 0) {
      midwayFiredRef.current = false
      setRemaining(seconds)
      setRunning(true)
      return
    }
    setRunning((r) => !r)
  }

  function reset() {
    setRunning(false)
    setRemaining(seconds)
    midwayFiredRef.current = false
  }

  return {
    remaining,
    running,
    elapsedSec: seconds - remaining,
    toggle,
    reset
  }
}
