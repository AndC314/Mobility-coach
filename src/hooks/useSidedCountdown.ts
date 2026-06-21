import { useEffect, useRef, useState } from 'react'
import { playMidwayDing, playCompleteDing, primeAudio } from '../lib/sound'

export interface SidedCountdownState {
  remaining: number
  running: boolean
  side: 1 | 2
  /** true once BOTH sides have finished */
  bothDone: boolean
  /** total elapsed across both sides so far — used to record actual hold time */
  elapsedSec: number
  toggle: () => void
  reset: () => void
}

/**
 * Like useCountdown, but for "X sec each side" exercises. Runs side 1,
 * plays the same midpoint/complete dings as a normal timer, then —
 * instead of stopping — automatically resets and starts side 2. The
 * complete-ding at the end of side 1 doubles as the "switch sides" cue,
 * so no new sound is introduced; behavior is identical to two consecutive
 * single-side timers, just chained without requiring a manual restart.
 */
export function useSidedCountdown(secondsPerSide: number, soundEnabled = true): SidedCountdownState {
  const [side, setSide] = useState<1 | 2>(1)
  const [remaining, setRemaining] = useState(secondsPerSide)
  const [running, setRunning] = useState(false)
  const [bothDone, setBothDone] = useState(false)
  const [side1ElapsedSec, setSide1ElapsedSec] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const midwayFiredRef = useRef(false)

  // reset everything when the per-side duration changes (e.g. switching exercises)
  useEffect(() => {
    setSide(1)
    setRemaining(secondsPerSide)
    setRunning(false)
    setBothDone(false)
    setSide1ElapsedSec(0)
    midwayFiredRef.current = false
  }, [secondsPerSide])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          const next = r - 1

          if (soundEnabled) {
            const midpoint = Math.floor(secondsPerSide / 2)
            if (!midwayFiredRef.current && next === midpoint && next > 0) {
              midwayFiredRef.current = true
              playMidwayDing()
            }
          }

          if (next <= 0) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            if (soundEnabled) playCompleteDing()

            if (side === 1) {
              // side 1 finished — auto-restart for side 2, same ding cues
              setSide1ElapsedSec(secondsPerSide)
              setSide(2)
              midwayFiredRef.current = false
              // restart immediately so it keeps running into side 2
              setTimeout(() => {
                setRemaining(secondsPerSide)
                setRunning(true)
              }, 0)
            } else {
              // side 2 finished — fully done
              setRunning(false)
              setBothDone(true)
            }
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
  }, [running, side])

  function toggle() {
    primeAudio()
    if (bothDone) {
      // restart from side 1 entirely
      setSide(1)
      setRemaining(secondsPerSide)
      setSide1ElapsedSec(0)
      setBothDone(false)
      midwayFiredRef.current = false
      setRunning(true)
      return
    }
    setRunning((r) => !r)
  }

  function reset() {
    setRunning(false)
    setSide(1)
    setRemaining(secondsPerSide)
    setSide1ElapsedSec(0)
    setBothDone(false)
    midwayFiredRef.current = false
  }

  const currentSideElapsed = secondsPerSide - remaining
  const elapsedSec = side === 1 ? currentSideElapsed : side1ElapsedSec + currentSideElapsed

  return {
    remaining,
    running,
    side,
    bothDone,
    elapsedSec,
    toggle,
    reset
  }
}
