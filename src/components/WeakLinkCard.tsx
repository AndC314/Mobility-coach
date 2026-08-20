import { Card } from './Card'
import { useWeakLink, type CategoryScore } from '../hooks/useWeakLink'
import { usePlateauExercises } from '../hooks/usePlateauExercises'
import { useRecoveryReadiness } from '../hooks/useRecoveryReadiness'
import { LEVEL_COLORS } from '../data/progressionChains'

export default function WeakLinkCard() {
  const analysis = useWeakLink()
  const plateaus = usePlateauExercises()
  const recoveryAxes = useRecoveryReadiness()

  if (!analysis) return null

  const { scores, weakest, strongest, imbalanceRatio, recommendation } = analysis

  const hasAnyData = scores.some((s) => s.score > 0)
  if (!hasAnyData) return null

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Balance Analysis</h3>
          {imbalanceRatio >= 35 && (
            <span className="rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-bold text-orange">
              Imbalance detected
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {scores.map((s) => (
            <ScoreBar key={s.category} score={s} isWeakest={s.category === weakest.category} />
          ))}
        </div>

        <p className="text-xs text-muted leading-relaxed">{recommendation}</p>

        {(() => {
          const weakAxis = recoveryAxes.find((a) => a.axis.toLowerCase() === weakest.category)
          const strongAxis = recoveryAxes.find((a) => a.axis.toLowerCase() === strongest.category)
          if (!weakAxis) return null
          if (weakAxis.readinessPercent >= 70) {
            return (
              <p className="text-[11px] text-teal font-medium">
                Your {weakest.label} muscles are recovered — good day to focus here
              </p>
            )
          }
          if (weakAxis.readinessPercent < 40 && strongAxis && strongAxis.readinessPercent >= 70) {
            return (
              <p className="text-[11px] text-orange-500 font-medium">
                {weakest.label} still recovering — consider {strongest.label} today
              </p>
            )
          }
          return null
        })()}

        {weakest.bottleneck && imbalanceRatio >= 15 && (
          <div className="rounded-lg bg-card2 border border-border p-2.5">
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
              Bottleneck
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">
                {weakest.bottleneck.exerciseName}
              </span>
              <span className="text-[10px] text-muted">
                {weakest.bottleneck.currentBest ?? 0}/{weakest.bottleneck.threshold} {weakest.bottleneck.unit}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-card overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${weakest.bottleneck.progress}%`,
                  background: weakest.bottleneck.progress >= 80 ? '#2ec4b6' : '#e8622a',
                }}
              />
            </div>
            <div className="mt-1 text-[10px] text-muted">
              Unlocks: {weakest.bottleneck.unlocksExercise}
            </div>
          </div>
        )}

        {plateaus && plateaus.length > 0 && (
          <div className="rounded-lg bg-card2 border border-orange/20 p-2.5">
            <div className="text-[10px] font-bold text-orange uppercase tracking-wider mb-1.5">
              Plateaus
            </div>
            <div className="space-y-1.5">
              {plateaus.slice(0, 3).map((p) => (
                <div key={p.exerciseId} className="flex items-center justify-between">
                  <span className="text-xs text-ink">{p.name}</span>
                  <span className="text-[10px] text-muted">
                    {p.currentBest} {p.unit} &middot; {p.sessionsStuck} sessions stuck
                  </span>
                </div>
              ))}
            </div>
            {plateaus.length > 3 && (
              <div className="mt-1 text-[10px] text-muted">
                +{plateaus.length - 3} more
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

function ScoreBar({ score, isWeakest }: { score: CategoryScore; isWeakest: boolean }) {
  const color = isWeakest ? '#e8622a' : LEVEL_COLORS[score.level] ?? '#7a7d96'

  return (
    <div className="text-center">
      <div className="text-[10px] font-semibold text-muted mb-1">{score.label}</div>
      <div className="relative mx-auto h-16 w-3 rounded-full bg-card2 overflow-hidden">
        <div
          className="absolute bottom-0 w-full rounded-full transition-all duration-500"
          style={{ height: `${score.score}%`, background: color }}
        />
      </div>
      <div className="mt-1 text-xs font-bold" style={{ color }}>
        {score.score}
      </div>
      <div className="text-[9px] text-muted">L{score.level}</div>
    </div>
  )
}
