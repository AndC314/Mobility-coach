import { useEffect, useRef, useState } from 'react'
import { playMidwayDing, playCompleteDing, primeAudio } from '../lib/sound'

type Mode = 'technical' | 'sparring'

export default function BjjSplitTimer() {
  // Timer state for each mode
  const [technicalSeconds, setTechnicalSeconds] = useState(0)
  const [sparringSeconds, setSparringSeconds] = useState(0)

  // Running state
  const [running, setRunning] = useState(false)
  const [mode, setMode] = useState<Mode>('technical')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Get current seconds based on mode
  const currentSeconds = mode === 'technical' ? technicalSeconds : sparringSeconds
  const setCurrentSeconds = mode === 'technical' ? setTechnicalSeconds : setSparringSeconds

  // Handle timer interval
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setCurrentSeconds((prev) => {
          const next = prev + 1
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
  }, [running, mode])

  function toggleTimer() {
    primeAudio()
    setRunning((r) => !r)
  }

  function resetAll() {
    setRunning(false)
    setTechnicalSeconds(0)
    setSparringSeconds(0)
    setMode('technical')
  }

  function switchMode(newMode: Mode) {
    // Only switch mode when timer is paused
    if (!running) {
      setMode(newMode)
    }
  }

  // Format time display
  const mins = Math.floor(currentSeconds / 60)
  const secs = currentSeconds % 60

  // Calculate summary stats
  const technicalMins = Math.floor(technicalSeconds / 60)
  const sparringMins = Math.floor(sparringSeconds / 60)
  const sparringEquivalent = sparringMins * 3

  // Circle progress indicator
  const circleR = 24
  const circumference = 2 * Math.PI * circleR

  // Determine display color based on mode
  const color = mode === 'technical' ? '#2ec4b6' : '#ff6b6b'

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-2">
        {(['technical', 'sparring'] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            disabled={running}
            className="flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-50"
            style={{
              background: m === mode ? color + '22' : 'transparent',
              color: m === mode ? color : '#7a7d96',
              border: `1px solid ${m === mode ? color + '55' : '#2e3248'}`
            }}
          >
            {m === 'technical' ? 'Technical' : 'Sparring'}
          </button>
        ))}
      </div>

      {/* Main timer display */}
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 flex-shrink-0">
          <svg width="56" height="56" className="-rotate-90">
            <circle cx="28" cy="28" r={circleR} fill="none" stroke="rgb(var(--color-border))" strokeWidth="5" />
            <circle
              cx="28"
              cy="28"
              r={circleR}
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={0} // Always full for split timer (counting up)
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.3s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-ink">
            {mins}:{secs.toString().padStart(2, '0')}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted capitalize">{mode}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleTimer}
              className="rounded-full px-4 py-2 text-sm font-semibold transition-transform active:scale-95"
              style={{ background: color + '22', color, border: `1px solid ${color}55` }}
            >
              {running ? 'Pause' : 'Start'}
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="rounded-full border border-border px-3 py-2 text-sm font-semibold text-muted transition-transform active:scale-95"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg bg-neutral-900 p-3 text-sm space-y-1.5">
        <div className="flex justify-between">
          <span className="text-muted">Technical:</span>
          <span className="font-semibold">{technicalMins} min{technicalMins !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Sparring:</span>
          <span className="font-semibold">{sparringMins} min{sparringMins !== 1 ? 's' : ''}</span>
        </div>
        <div className="border-t border-neutral-700 pt-1.5 flex justify-between">
          <span className="text-muted">Sparring equivalent:</span>
          <span className="font-semibold text-orange-400">≈ {sparringEquivalent} min{sparringEquivalent !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}
