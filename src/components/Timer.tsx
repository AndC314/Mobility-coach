import type { CountdownState } from '../hooks/useCountdown'
import type { SidedCountdownState } from '../hooks/useSidedCountdown'

// ─── Single-side timer ───────────────────────────────────────────────────

interface TimerProps {
  seconds: number
  state: CountdownState
  color?: string
}

export function SingleTimer({ seconds, state, color = '#2ec4b6' }: TimerProps) {
  const { remaining, running, toggle, reset } = state
  return <TimerShell seconds={seconds} remaining={remaining} running={running} done={remaining === 0} toggle={toggle} reset={reset} color={color} />
}

// ─── Two-side timer ───────────────────────────────────────────────────────

interface SidedTimerProps {
  secondsPerSide: number
  state: SidedCountdownState
  color?: string
}

export function SidedTimer({ secondsPerSide, state, color = '#2ec4b6' }: SidedTimerProps) {
  const { remaining, running, side, bothDone, toggle, reset } = state

  return (
    <div className="space-y-1.5">
      {/* Side indicator */}
      <div className="flex gap-2">
        {([1, 2] as const).map((s) => (
          <span
            key={s}
            className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
            style={{
              background: s === side && !bothDone ? color + '22' : 'transparent',
              color: s === side && !bothDone ? color : '#7a7d96',
              border: `1px solid ${s === side && !bothDone ? color + '55' : '#2e3248'}`
            }}
          >
            {s === 1 ? 'Left / Side 1' : 'Right / Side 2'}
          </span>
        ))}
      </div>
      <TimerShell
        seconds={secondsPerSide}
        remaining={remaining}
        running={running}
        done={bothDone}
        toggle={toggle}
        reset={reset}
        color={color}
        doneLabel={bothDone ? 'Both sides done' : undefined}
      />
    </div>
  )
}

// ─── Shared rendering shell ───────────────────────────────────────────────

interface ShellProps {
  seconds: number
  remaining: number
  running: boolean
  done: boolean
  toggle: () => void
  reset: () => void
  color: string
  doneLabel?: string
}

function TimerShell({ seconds, remaining, running, done, toggle, reset, color, doneLabel }: ShellProps) {
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const pct = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 0
  const circleR = 24
  const circumference = 2 * Math.PI * circleR

  let buttonLabel: string
  if (running) buttonLabel = 'Pause'
  else if (done) buttonLabel = 'Restart'
  else if (remaining === seconds) buttonLabel = 'Start'
  else buttonLabel = 'Resume'

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14 flex-shrink-0">
        <svg width="56" height="56" className="-rotate-90">
          <circle cx="28" cy="28" r={circleR} fill="none" stroke="rgb(var(--color-border))" strokeWidth="5" />
          <circle
            cx="28" cy="28" r={circleR}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-ink">
          {mins}:{secs.toString().padStart(2, '0')}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {doneLabel && <span className="text-xs font-semibold text-teal">{doneLabel}</span>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggle}
            className="rounded-full px-4 py-2 text-sm font-semibold transition-transform active:scale-95"
            style={{ background: color + '22', color, border: `1px solid ${color}55` }}
          >
            {buttonLabel}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-border px-3 py-2 text-sm font-semibold text-muted transition-transform active:scale-95"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

// Default export for backward compat (single timer)
export default SingleTimer
