import { Card } from './Card'
import { useAchievements, type Achievement } from '../hooks/useAchievements'

function XPBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = Math.min(100, (current / max) * 100)
  return (
    <div className="h-2 w-full rounded-full bg-card2 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const tierColors = {
    bronze: 'border-orange-400/40 bg-orange-400/10',
    silver: 'border-gray-300/40 bg-gray-300/10',
    gold: 'border-gold/40 bg-gold/10',
  }

  return (
    <div
      className={`relative flex flex-col items-center gap-1 rounded-xl border p-2.5 ${
        achievement.unlocked ? tierColors[achievement.tier] : 'border-border bg-card2 opacity-50'
      }`}
    >
      <span className="text-xl">{achievement.icon}</span>
      <span className="text-[10px] font-semibold text-ink text-center leading-tight">{achievement.name}</span>
      {!achievement.unlocked && (
        <div className="w-full mt-0.5">
          <div className="h-1 w-full rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-muted/60"
              style={{ width: `${achievement.progress * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function AchievementsCard() {
  const stats = useAchievements()

  if (!stats) return null

  const unlockedCount = stats.achievements.filter((a) => a.unlocked).length

  return (
    <div className="space-y-3">
      {/* Level summary */}
      <Card>
        <div className="grid grid-cols-2 gap-4">
          {/* Mastery */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm">🎯</span>
              <span className="text-xs font-bold text-ink">Mastery</span>
              <span className="ml-auto text-xs font-black text-purple">Lv.{stats.masteryLevel}</span>
            </div>
            <XPBar current={stats.masteryXP} max={stats.masteryNextXP} color="#a78bfa" />
            <p className="mt-1 text-[10px] text-muted">{stats.masteryXP}/{stats.masteryNextXP} XP</p>
          </div>

          {/* Discipline */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm">🔥</span>
              <span className="text-xs font-bold text-ink">Discipline</span>
              <span className="ml-auto text-xs font-black text-teal">Lv.{stats.disciplineLevel}</span>
            </div>
            <XPBar current={stats.disciplineXP} max={stats.disciplineNextXP} color="#2ec4b6" />
            <p className="mt-1 text-[10px] text-muted">{stats.disciplineXP}/{stats.disciplineNextXP} XP</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            { value: stats.totalPRs, label: 'PRs' },
            { value: stats.uniqueExercises, label: 'Exercises' },
            { value: stats.currentStreak, label: 'Streak' },
            { value: stats.longestStreak, label: 'Best streak' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-sm font-black text-ink">{value}</div>
              <div className="text-[9px] text-muted uppercase">{label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Achievements grid */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-ink">Achievements</h3>
          <span className="text-[11px] text-muted">{unlockedCount}/{stats.achievements.length} unlocked</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {stats.achievements.map((a) => (
            <AchievementBadge key={a.id} achievement={a} />
          ))}
        </div>
      </Card>
    </div>
  )
}
