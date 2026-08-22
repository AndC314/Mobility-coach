import { Card } from './Card'
import { useTrainingBalance, type BalanceCategory } from '../hooks/useTrainingBalance'

export default function TrainingBalanceCard() {
  const balance = useTrainingBalance(4)

  if (!balance || balance.totalSets === 0) {
    return (
      <Card>
        <h2 className="mb-1 text-base font-bold">Training Balance</h2>
        <p className="py-4 text-center text-sm text-muted">
          Log some training to see your balance breakdown
        </p>
      </Card>
    )
  }

  const maxSets = Math.max(...balance.categories.map((c) => c.sets))

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold">Training Balance</h2>
          <span className="text-[11px] text-muted">Last {balance.weeksAnalyzed} weeks</span>
        </div>

        {/* Volume bars */}
        <div className="space-y-2.5">
          {balance.categories.map((cat) => (
            <div key={cat.category}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: cat.color }} />
                  <span className="text-xs font-semibold text-ink">{cat.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted">{cat.sessions} days</span>
                  <span className="text-xs font-bold text-ink">{cat.sets} sets</span>
                  <span className="text-[10px] text-muted w-8 text-right">{cat.percent}%</span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-card2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: maxSets > 0 ? `${(cat.sets / maxSets) * 100}%` : '0%',
                    backgroundColor: cat.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted">Total volume</span>
          <span className="text-sm font-bold text-ink">{balance.totalSets} sets</span>
        </div>
      </Card>

      {/* Imbalance warnings */}
      {balance.imbalances.length > 0 && (
        <Card className="border-gold/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">⚠️</span>
            <h3 className="text-sm font-bold text-ink">Imbalance Detected</h3>
          </div>
          <div className="space-y-2">
            {balance.imbalances.map((imb, i) => (
              <div key={i} className="rounded-lg bg-gold/5 border border-gold/20 px-3 py-2">
                <p className="text-xs text-ink">
                  <span className="font-semibold capitalize">{imb.weak}</span> is undertrained vs{' '}
                  <span className="font-semibold capitalize">{imb.strong}</span>
                  {isFinite(imb.ratio) && (
                    <span className="text-muted"> ({imb.ratio.toFixed(1)}:1 ratio)</span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Add more {imb.weak} exercises to your sessions for balanced development
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Balance radar (simple text-based) */}
      <Card>
        <h3 className="mb-2 text-sm font-bold">Push:Pull Ratio</h3>
        {(() => {
          const push = balance.categories.find((c) => c.category === 'push')!
          const pull = balance.categories.find((c) => c.category === 'pull')!
          const total = push.sets + pull.sets
          if (total === 0) return <p className="text-xs text-muted">No push/pull data yet</p>
          const pushPct = Math.round((push.sets / total) * 100)
          const pullPct = 100 - pushPct
          const ideal = pushPct >= 40 && pushPct <= 60
          return (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-3 rounded-full overflow-hidden flex">
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${pushPct}%`, backgroundColor: push.color }}
                  />
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${pullPct}%`, backgroundColor: pull.color }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-[10px]">
                <span style={{ color: push.color }} className="font-semibold">Push {pushPct}%</span>
                <span className={`font-semibold ${ideal ? 'text-green-400' : 'text-gold'}`}>
                  {ideal ? '✓ Balanced' : '⚠ Adjust'}
                </span>
                <span style={{ color: pull.color }} className="font-semibold">Pull {pullPct}%</span>
              </div>
            </div>
          )
        })()}
      </Card>
    </div>
  )
}
