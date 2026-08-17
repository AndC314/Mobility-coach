import { Card, Tag } from './Card'
import { useCalisthenicsSession } from '../hooks/useCalisthenicsSession'
import type { SessionExercise } from '../lib/calisthenicsSession'

interface Props {
  onStartSession?: (exercises: SessionExercise[]) => void
}

export default function TodayStrengthCard({ onStartSession }: Props) {
  const { session, regenerate, isLoading } = useCalisthenicsSession()

  if (isLoading) return null
  if (!session) return null

  return (
    <Card className="border-l-2 border-l-purple-500/50">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink">Today's Strength</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Tag color="#a78bfa">{session.focus}</Tag>
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
              key={ex.exerciseId}
              className="flex items-center justify-between rounded-lg bg-card2 px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-ink truncate">{ex.name}</div>
                <div className="text-[10px] text-muted">{ex.reason}</div>
              </div>
              <div className="flex-shrink-0 text-right ml-2">
                <span className="text-xs font-bold text-purple-400">
                  {ex.targetSets}×{ex.targetValue}{ex.unit === 's' ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>

        {onStartSession && (
          <button
            onClick={() => onStartSession(session.exercises)}
            className="w-full rounded-xl bg-purple-500/15 border border-purple-500/30 py-2.5 text-xs font-bold text-purple-400"
          >
            Start session
          </button>
        )}
      </div>
    </Card>
  )
}
