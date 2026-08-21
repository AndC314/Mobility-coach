import type { SkillProgress } from '../hooks/useSkillProgression'

const CATEGORY_COLORS: Record<string, string> = {
  pull: '#2ec4b6',
  push: '#e8622a',
  core: '#f5c842',
  legs: '#7c3aed',
  dynamic: '#ec4899',
}

export default function SkillDetailDrawer({
  skill,
  onClose,
}: {
  skill: SkillProgress
  onClose: () => void
}) {
  const color = CATEGORY_COLORS[skill.skill.category]

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-t-2xl bg-surface border-t border-border p-5 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-border mb-4" />

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
            style={{ backgroundColor: color + '25', color }}
          >
            {skill.isUnlocked ? '✓' : '🔒'}
          </div>
          <div>
            <h2 className="text-lg font-bold">{skill.skill.name}</h2>
            <p className="text-xs text-muted capitalize">{skill.skill.category}</p>
          </div>
        </div>

        <section className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted mb-2">
            Prerequisites
          </h3>
          <div className="space-y-2">
            {skill.prereqProgress.map((p) => (
              <div key={p.exerciseId} className="flex items-center gap-3">
                <span className="text-sm" style={{ color: p.percent >= 100 ? '#2ec4b6' : undefined }}>
                  {p.percent >= 100 ? '✓' : '○'}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{p.label}</span>
                    <span className="text-xs text-muted">
                      {p.current}/{p.threshold}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-border mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${p.percent}%`,
                        backgroundColor: p.percent >= 100 ? '#2ec4b6' : color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted mb-2">
            Progression Tiers
          </h3>
          <div className="space-y-2">
            {skill.skill.tiers.map((tier) => {
              const isActive = skill.isUnlocked && tier.tier === skill.currentTier
              const isCompleted = skill.isUnlocked && tier.tier < skill.currentTier
              return (
                <div
                  key={tier.tier}
                  className={`rounded-lg border p-3 ${
                    isActive
                      ? 'border-accent/50 bg-accent/5'
                      : isCompleted
                      ? 'border-teal-500/30 bg-teal-500/5'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{
                          backgroundColor: isActive ? color + '30' : isCompleted ? '#2ec4b625' : 'var(--color-border)',
                          color: isActive ? color : isCompleted ? '#2ec4b6' : 'var(--color-muted)',
                        }}
                      >
                        {isCompleted ? '✓' : tier.tier}
                      </span>
                      <span className={`text-sm font-medium ${!skill.isUnlocked ? 'text-muted' : ''}`}>
                        {tier.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted">{tier.targetTUTorReps}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-border/50 py-2.5 text-sm font-medium text-muted"
        >
          Close
        </button>
      </div>
    </div>
  )
}
