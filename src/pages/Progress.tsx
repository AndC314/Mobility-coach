import { useState } from 'react'
import SkillTree from '../components/SkillTree'
import SkillRadar from '../components/SkillRadar'
import { useAuth } from '../hooks/useAuth'
import { useFirebaseSync } from '../hooks/useFirebaseSync'

export default function Progress() {
  const [view, setView] = useState<'tree' | 'trends'>('tree')
  const { user } = useAuth()
  useFirebaseSync(user)

  return (
    <div className="space-y-5 pb-4 fade-in">
      <div>
        <p className="text-sm text-muted">Your progress</p>
        <h1 className="text-2xl font-extrabold">Progress</h1>
      </div>

      <div className="flex gap-1.5">
        {(
          [
            { id: 'tree', label: 'Skill Tree' },
            { id: 'trends', label: 'Trends' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${
              view === t.id ? 'bg-accent/20 text-accent border border-accent/40' : 'bg-card text-muted border border-border'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'tree' && <SkillTree />}

      {view === 'trends' && (
        <div className="space-y-4">
          <SkillRadar />
        </div>
      )}
    </div>
  )
}

