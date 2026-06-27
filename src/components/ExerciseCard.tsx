import { useState } from 'react'
import { SingleTimer, SidedTimer } from './Timer'
import { Card } from './Card'
import { useCountdown } from '../hooks/useCountdown'
import { useSidedCountdown } from '../hooks/useSidedCountdown'
import { useWakeLock } from '../hooks/useWakeLock'

interface ExerciseCardProps {
  index: number
  name: string
  sets: string
  setup: string
  cue: string
  feel: string
  checkpoint?: string
  caution?: string
  image?: string
  timerSec: number
  /** If true, timerSec is per side — timer auto-restarts for side 2 */
  sides?: boolean
  color?: string
  completed?: boolean
  onComplete?: (elapsedSec: number) => void
  soundEnabled?: boolean
}

export default function ExerciseCard(props: ExerciseCardProps) {
  const {
    index, name, sets, setup, cue, feel, checkpoint, caution, image,
    timerSec, sides = false, color = '#2ec4b6',
    completed = false, onComplete, soundEnabled = true
  } = props

  const [open, setOpen] = useState(index === 0)
  const [done, setDone] = useState(completed)

  // Always call both hooks unconditionally (React rules), use the right one below
  const single = useCountdown(sides ? 0 : timerSec, soundEnabled)
  const sided  = useSidedCountdown(sides ? timerSec : 0, soundEnabled)

  // Keep screen awake while a timer is running
  useWakeLock(single.running || sided.running)

  function handleComplete() {
    setDone(true)
    const elapsed = sides
      ? (sided.elapsedSec > 0 ? sided.elapsedSec : timerSec * 2)
      : (single.elapsedSec > 0 ? single.elapsedSec : timerSec)
    onComplete?.(elapsed)
  }

  const isDone = done || (sides ? sided.bothDone : single.remaining === 0 && single.elapsedSec > 0)

  return (
    <Card className="mb-3 p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-transform active:scale-[0.99]"
        style={{ background: color + '0d' }}
      >
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ background: color + '22', color }}
        >
          {index + 1}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-ink">{name}</span>
            {isDone && <span className="text-xs text-teal">{'✓'}</span>}
          </div>
          <div className="mt-0.5 text-xs text-muted">{sets}</div>
        </div>
        <span className="text-muted text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="space-y-2.5 p-4 pt-3 fade-in">
          {image && (
            <img
              src={image}
              alt={name}
              className="w-full rounded-lg object-cover"
              style={{ maxHeight: 200 }}
            />
          )}
          <InfoBlock label="🧘 Setup" value={setup} color="#2ec4b6" />
          <InfoBlock label="🎯 Cue" value={cue} color={color} />
          <InfoBlock label="💬 Feel" value={feel} color="#f5c842" />
          {checkpoint && <InfoBlock label="✓ Checkpoint" value={checkpoint} color="#a78bfa" />}
          {caution && <InfoBlock label="⚠️ Caution" value={caution} color="#e8622a" />}

          <div className="flex items-center justify-between gap-3 pt-1">
            {sides ? (
              <SidedTimer secondsPerSide={timerSec} state={sided} color={color} />
            ) : (
              <SingleTimer seconds={timerSec} state={single} color={color} />
            )}
            <button
              type="button"
              onClick={handleComplete}
              className={`flex-shrink-0 rounded-full px-4 py-2.5 text-sm font-bold transition-transform active:scale-95 ${
                isDone
                  ? 'bg-teal/20 text-teal border border-teal/40'
                  : 'bg-card2 text-ink border border-border'
              }`}
            >
              {isDone ? '✓ Done' : 'Complete'}
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

function InfoBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-card2 p-2.5" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
        {label}
      </div>
      <div className="text-[13px] leading-relaxed text-ink/90">{value}</div>
    </div>
  )
}
