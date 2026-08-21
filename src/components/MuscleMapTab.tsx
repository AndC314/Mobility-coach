import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card } from './Card'
import BodyMap from './BodyMap'
import { MUSCLE_LABELS, computeMuscleScores, computeAdaptiveCaps, computeSuggestions, computeMuscleBreakdown, enrichSuggestionsWithPredictions } from '../data/muscleMap'
import type { MuscleGroup, MuscleBreakdown } from '../data/muscleMap'
import { db } from '../db/db'
import { todayIso } from '../lib/date'

/** Format [5,4,4] as "1×5 + 2×4" */
function formatRepScheme(scheme: number[], metric: 'reps' | 'hold_sec'): string {
  const unit = metric === 'hold_sec' ? 's' : ''
  const groups: { count: number; reps: number }[] = []
  for (const reps of scheme) {
    const last = groups[groups.length - 1]
    if (last && last.reps === reps) last.count++
    else groups.push({ count: 1, reps })
  }
  return groups.map((g) => `${g.count}×${g.reps}${unit}`).join(' + ')
}

function BreakdownPanel({ breakdown }: { breakdown: MuscleBreakdown }) {
  return (
    <div className="mt-1.5 rounded-lg bg-card2 px-3 py-2 text-[10px] fade-in">
      {breakdown.contributions.map((c, i) => (
        <div key={`${c.exerciseId}-${i}`} className="flex items-center justify-between py-0.5">
          <span className="text-ink/80">
            {c.label}: {c.sets > 1 ? `${c.sets}×` : ''}{c.value}
            <span className="text-muted"> × {c.level === 'primary' ? '1.0' : '0.5'}</span>
          </span>
          <span className="font-semibold text-ink/70">= {Math.round(c.contribution)}</span>
        </div>
      ))}
      <div className="mt-1 border-t border-border pt-1 flex items-center justify-between font-semibold text-ink">
        <span>Total</span>
        <span>{Math.round(breakdown.totalVolume)} / {Math.round(breakdown.cap)} = {breakdown.score}%</span>
      </div>
    </div>
  )
}

export default function MuscleMapTab() {
  const today = todayIso()
  const [openMuscle, setOpenMuscle] = useState<MuscleGroup | null>(null)

  const data = useLiveQuery(async () => {
    const [ty, tm, td] = today.split('-').map(Number)
    const twoWeeksAgo = new Date(ty, tm - 1, td - 14)
    const twoWeeksStr = `${twoWeeksAgo.getFullYear()}-${String(twoWeeksAgo.getMonth() + 1).padStart(2, '0')}-${String(twoWeeksAgo.getDate()).padStart(2, '0')}`
    const logs = await db.calisthenicsLogs.where('date').aboveOrEqual(twoWeeksStr).toArray()
    return logs
  }, [today], [])

  const allLogs = data ?? []
  const adaptiveCaps = computeAdaptiveCaps(allLogs, today)
  const scores = computeMuscleScores(allLogs, today, adaptiveCaps)
  const breakdowns = computeMuscleBreakdown(allLogs, today, adaptiveCaps)
  const breakdownMap = new Map<MuscleGroup, MuscleBreakdown>(breakdowns.map((b) => [b.muscle, b]))
  const sorted = [...scores].sort((a, b) => a.score - b.score)
  const untrained = sorted.filter((s) => s.score === 0)
  const undertrained = sorted.filter((s) => s.score > 0 && s.score < 40)
  const loaded = sorted.filter((s) => s.score >= 40).reverse()

  const gapMuscles = [...untrained, ...undertrained].map((s) => s.muscle)
  const suggestions = enrichSuggestionsWithPredictions(
    computeSuggestions(gapMuscles, allLogs),
    scores,
    adaptiveCaps
  )

  return (
    <>
      <Card>
        <h2 className="mb-1 text-base font-bold">Muscle load — last 48h</h2>
        <p className="mb-3 text-xs text-muted">
          % of your personal best volume per muscle. Red = heavy, gold = moderate, grey = untrained.
        </p>
        <BodyMap scores={scores} />
      </Card>

      {suggestions.length > 0 && (
        <Card className="border-teal/30">
          <h2 className="mb-2 text-sm font-bold text-teal">{'→'} Suggested next</h2>
          <p className="mb-2 text-xs text-muted">
            Exercises targeting your least-trained muscles, with progressive targets:
          </p>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div
                key={s.exerciseId}
                className="flex items-center justify-between rounded-lg bg-teal/5 px-3 py-2 border border-teal/20"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-ink">{s.label}</span>
                  {s.isNew && (
                    <span className="ml-1.5 text-[9px] font-semibold text-teal bg-teal/10 rounded px-1 py-0.5">
                      NEW
                    </span>
                  )}
                  <div className="text-[10px] text-muted mt-0.5">
                    <span className="font-semibold text-ink/70">{s.primaryMuscle}</span>
                    {s.primaryMuscle !== MUSCLE_LABELS[s.muscle] && (
                      <span> · fills {MUSCLE_LABELS[s.muscle]} gap</span>
                    )}
                  </div>
                  {s.predictions && s.predictions.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-[9px]">
                      {s.predictions.slice(0, 3).map((p) => (
                        <span key={p.muscle} className="text-teal/80">
                          {MUSCLE_LABELS[p.muscle]}: {p.currentScore}%{'→'}{p.projectedScore}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-sm font-bold text-teal tabular-nums">
                  {s.repScheme
                    ? formatRepScheme(s.repScheme, s.metric)
                    : `${s.targetSets}×${s.targetReps}${s.metric === 'hold_sec' ? 's' : ''}`
                  }
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {undertrained.length > 0 && (
        <Card className="border-gold/30">
          <h2 className="mb-2 text-sm font-bold text-gold">{'↑'} Light so far</h2>
          <div className="space-y-1">
            {undertrained.map((s) => (
              <div key={s.muscle}>
                <button
                  onClick={() => setOpenMuscle(openMuscle === s.muscle ? null : s.muscle)}
                  className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 -mx-1 hover:bg-gold/5 transition-colors"
                >
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${s.score}%` }} />
                  </div>
                  <span className="w-28 text-right text-xs font-medium text-ink/80">{MUSCLE_LABELS[s.muscle]}</span>
                  <span className="w-8 text-right text-xs font-bold text-gold">{s.score}%</span>
                </button>
                {openMuscle === s.muscle && breakdownMap.has(s.muscle) && (
                  <BreakdownPanel breakdown={breakdownMap.get(s.muscle)!} />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {loaded.length > 0 && (
        <Card>
          <h2 className="mb-2 text-sm font-bold text-ink">{'✓'} Well trained</h2>
          <div className="space-y-1">
            {loaded.map((s) => (
              <div key={s.muscle}>
                <button
                  onClick={() => setOpenMuscle(openMuscle === s.muscle ? null : s.muscle)}
                  className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 -mx-1 hover:bg-ink/5 transition-colors"
                >
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${s.score}%`,
                        background: s.score >= 80 ? '#d9472b' : '#f5c842'
                      }}
                    />
                  </div>
                  <span className="w-28 text-right text-xs font-medium text-ink/80">{MUSCLE_LABELS[s.muscle]}</span>
                  <span className="w-8 text-right text-xs font-bold text-ink">{s.score}%</span>
                </button>
                {openMuscle === s.muscle && breakdownMap.has(s.muscle) && (
                  <BreakdownPanel breakdown={breakdownMap.get(s.muscle)!} />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {allLogs.length === 0 && (
        <Card>
          <p className="py-4 text-center text-sm text-muted">
            Log some calisthenics in the Log tab to see your muscle map fill in.
          </p>
        </Card>
      )}
    </>
  )
}
