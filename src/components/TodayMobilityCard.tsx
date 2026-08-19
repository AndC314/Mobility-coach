import { Card, Tag } from './Card'
import { useMobilitySession } from '../hooks/useMobilitySession'
import type { MobilitySessionExercise } from '../lib/mobilitySession'

interface Props {
  onStartSession?: (exercises: MobilitySessionExercise[]) => void
}

export default function TodayMobilityCard({ onStartSession }: Props) {
  const { session, regenerate, isLoading } = useMobilitySession()

  if (isLoading) return null
  if (!session) return null

  return (
    <Card className="border-l-2 border-l-teal/50">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink">Today's Mobility</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Tag color="#2ec4b6">{session.focus}</Tag>
              <span className="text-[10px] text-muted">
                ~{session.totalDurationMin}min &middot; {session.exercises.length} exercises
              </span>
            </div>
          </div>
          <button
            onClick={regenerate}
            className="rounded-full bg-card2 border border-border px-2.5 py-1.5 text-[10px] font-semibold text-muted"
          >
            Shuffle
          </button>
        </div>

        <div className="space-y-1.5">
          {session.exercises.map((ex) => (
            <div
              key={ex.id}
              className="flex items-center gap-2.5 rounded-lg bg-card2 px-3 py-2"
            >
              <img
                src={`/sprites/exercises/${ex.id}.png`}
                alt=""
                className="w-8 h-8 flex-shrink-0"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-ink truncate">{ex.name}</div>
                <div className="text-[10px] text-muted capitalize">{ex.category.replace('_', ' ')}</div>
              </div>
              <div className="flex-shrink-0 text-right ml-2">
                <span className="text-xs font-bold text-teal">
                  {ex.sets > 1 ? `${ex.sets}×` : ''}{ex.holdSec}s
                </span>
              </div>
            </div>
          ))}
        </div>

        {onStartSession && (
          <button
            onClick={() => onStartSession(session.exercises)}
            className="w-full rounded-xl bg-teal/15 border border-teal/30 py-2.5 text-xs font-bold text-teal"
          >
            Start session
          </button>
        )}
      </div>
    </Card>
  )
}
