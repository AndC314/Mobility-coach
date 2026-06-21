import { Card, Tag } from './Card'
import { PHASES } from '../data/exercises'
import type { ProgressionKey, PhaseProgress } from '../db/db'

interface ProgressionHeaderProps {
  exerciseKey: ProgressionKey
  progress?: PhaseProgress
  onCheckpointToggle: (met: boolean) => void
  onAdvance: () => void
}

export default function ProgressionHeader({
  progress,
  onCheckpointToggle,
  onAdvance
}: ProgressionHeaderProps) {
  const phase = progress?.phase ?? 1
  const checkpointMet = progress?.checkpointMet ?? false
  const phaseInfo = PHASES[phase - 1]
  const pct = (phase / 4) * 100

  return (
    <Card className="mb-4" style={{ border: `1px solid ${phaseInfo.color}44` }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-extrabold">Phase {phase}</span>
          <Tag color={phaseInfo.color}>{phaseInfo.title}</Tag>
        </div>
        <span className="text-xs text-muted">Weeks {phaseInfo.weeks}</span>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: phaseInfo.color }}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={checkpointMet}
            onChange={(e) => onCheckpointToggle(e.target.checked)}
            className="h-5 w-5 accent-teal"
          />
          <span className="text-ink/90">Checkpoint hit</span>
        </label>
        <button
          onClick={onAdvance}
          disabled={!checkpointMet || phase >= 4}
          className="rounded-full px-4 py-2 text-xs font-bold disabled:opacity-30"
          style={{ background: phaseInfo.color + '22', color: phaseInfo.color, border: `1px solid ${phaseInfo.color}55` }}
        >
          {phase >= 4 ? 'Max phase' : 'Advance →'}
        </button>
      </div>
    </Card>
  )
}
