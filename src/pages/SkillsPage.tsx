import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSkillProgression, type SkillProgress } from '../hooks/useSkillProgression'
import SkillDetailDrawer from '../components/SkillDetailDrawer'

const CATEGORY_COLORS: Record<string, string> = {
  pull: '#2ec4b6',
  push: '#e8622a',
  core: '#f5c842',
  legs: '#7c3aed',
  dynamic: '#ec4899',
}

const CATEGORY_BG: Record<string, string> = {
  pull: 'bg-teal-500/15 border-teal-500/30',
  push: 'bg-orange-500/15 border-orange-500/30',
  core: 'bg-yellow-500/15 border-yellow-500/30',
  legs: 'bg-purple-500/15 border-purple-500/30',
  dynamic: 'bg-pink-500/15 border-pink-500/30',
}

export default function SkillsPage() {
  const skills = useSkillProgression()
  const [selected, setSelected] = useState<SkillProgress | null>(null)

  if (!skills) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal" />
      </div>
    )
  }

  const unlocked = skills.filter((s) => s.isUnlocked).length

  return (
    <div className="space-y-4 pb-4 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Advanced</p>
          <h1 className="text-2xl font-extrabold">Skill Tree</h1>
        </div>
        <Link to="/calisthenics" className="text-sm text-accent font-medium">
          ← Back
        </Link>
      </div>

      <div className="rounded-xl bg-surface border border-border p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            {unlocked}/{skills.length} Skills Unlocked
          </span>
          <div className="h-2 w-32 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(unlocked / skills.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {skills.map((sp) => (
          <SkillCard key={sp.skill.id} sp={sp} onTap={() => setSelected(sp)} />
        ))}
      </div>

      {selected && (
        <SkillDetailDrawer skill={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function SkillCard({ sp, onTap }: { sp: SkillProgress; onTap: () => void }) {
  const overallPercent = sp.isUnlocked
    ? 100
    : Math.round(
        sp.prereqProgress.reduce((sum, p) => sum + p.percent, 0) / sp.prereqProgress.length
      )

  return (
    <button
      onClick={onTap}
      className={`w-full text-left rounded-xl border p-4 transition-all active:scale-[0.98] ${
        sp.isUnlocked
          ? CATEGORY_BG[sp.skill.category]
          : 'bg-surface border-border opacity-75'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
            style={{
              backgroundColor: sp.isUnlocked
                ? CATEGORY_COLORS[sp.skill.category] + '25'
                : 'var(--color-border)',
              color: sp.isUnlocked
                ? CATEGORY_COLORS[sp.skill.category]
                : 'var(--color-muted)',
            }}
          >
            {sp.isUnlocked ? sp.currentTier : '🔒'}
          </div>
          <div>
            <p className="font-semibold text-sm">{sp.skill.name}</p>
            <p className="text-xs text-muted capitalize">{sp.skill.category}</p>
          </div>
        </div>

        {sp.isUnlocked && sp.activeTierExercise && (
          <span className="text-xs font-medium text-accent">
            Tier {sp.currentTier}: {sp.activeTierExercise.name}
          </span>
        )}
      </div>

      {!sp.isUnlocked && (
        <div className="mt-3 space-y-2">
          {sp.prereqProgress.map((p) => (
            <div key={p.exerciseId}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] text-ink/70 truncate">{p.label}</span>
                <span className="text-[10px] text-muted ml-2 shrink-0">
                  {p.current}/{p.threshold}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${p.percent}%`,
                    backgroundColor: p.percent >= 100 ? '#2ec4b6' : '#6b7280',
                  }}
                />
              </div>
            </div>
          ))}
          <p className="text-[10px] text-muted">{overallPercent}% to unlock</p>
        </div>
      )}
    </button>
  )
}
