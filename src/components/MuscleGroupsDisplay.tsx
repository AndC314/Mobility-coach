import { useLiveQuery } from 'dexie-react-hooks'
import { Card } from './Card'
import { db } from '../db/db'
import { computeMuscleScores, MUSCLE_LABELS } from '../data/muscleMap'
import { isoDate, todayIso } from '../lib/date'

export function MuscleGroupsDisplay() {
  const today = todayIso()
  const calisthenicsLogs = useLiveQuery(
    () => db.calisthenicsLogs.where('date').equals(today).toArray(),
    [today],
    []
  )

  const scores = computeMuscleScores(
    (calisthenicsLogs ?? []).map((l) => ({
      exerciseId: l.exerciseId,
      value: l.value,
      date: l.date
    })),
    today
  )

  const trained = scores.filter((s) => s.score > 0).sort((a, b) => b.score - a.score)
  const untrained = scores.filter((s) => s.score === 0)

  return (
    <Card>
      <h2 className="mb-3 text-base font-bold">Muscle groups trained today</h2>

      {trained.length === 0 ? (
        <p className="py-2 text-sm text-muted">No exercises logged yet</p>
      ) : (
        <>
          <div className="mb-3 space-y-1.5">
            {trained.map((s) => (
              <div key={s.muscle} className="flex items-center justify-between text-sm">
                <span className="text-ink">{MUSCLE_LABELS[s.muscle]}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${s.score}%`,
                        background: s.score >= 80 ? '#ef4444' : s.score >= 40 ? '#f5c842' : '#7a7d96'
                      }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-semibold text-muted">{s.score}%</span>
                </div>
              </div>
            ))}
          </div>

          {untrained.length > 0 && (
            <div className="border-t border-border pt-2">
              <p className="mb-1.5 text-xs font-semibold text-muted uppercase tracking-wider">Not trained yet</p>
              <div className="flex flex-wrap gap-1">
                {untrained.map((s) => (
                  <span key={s.muscle} className="rounded-full bg-card2 px-2 py-1 text-xs text-muted border border-border">
                    {MUSCLE_LABELS[s.muscle]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
