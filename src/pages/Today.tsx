import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import ProgressRing from '../components/ProgressRing'
import { Card, Tag } from '../components/Card'
import { useTodayPlan } from '../hooks/useTodayPlan'
import { useStreak } from '../hooks/useStreak'
import { db } from '../db/db'
import { todayIso } from '../lib/date'
import type { PlanItem } from '../lib/recommendation'

function scoreColor(score: number) {
  if (score >= 80) return '#2ec4b6'
  if (score >= 60) return '#f5c842'
  return '#e8622a'
}

export default function Today() {
  const plan = useTodayPlan()
  const streak = useStreak()
  const navigate = useNavigate()

  const today = new Date()
  const todayStr = todayIso()
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })

  const bjjToday = useLiveQuery(
    () => db.bjjLogs.where('date').equals(todayStr).first(),
    [todayStr],
    undefined
  )

  async function toggleBjjToday() {
    const existing = await db.bjjLogs.where('date').equals(todayStr).first()
    if (existing) {
      await db.bjjLogs.update(existing.id!, { attended: !existing.attended })
    } else {
      await db.bjjLogs.add({ date: todayStr, attended: true })
    }
  }

  async function handleItemTap(item: PlanItem) {
    if (item.target.tab === 'recovery') {
      navigate(`/recovery?area=${item.target.area}`)
    } else if (item.target.tab === 'morning' || item.target.tab === 'bjj_release') {
      navigate(`/mobility?tab=${item.target.tab}`)
    } else {
      navigate(`/mobility?tab=${item.target.tab}`)
    }
  }

  if (!plan) {
    return (
      <div className="flex h-64 items-center justify-center text-muted text-sm">Loading today’s plan…</div>
    )
  }

  const remainingMin = plan.items.filter((i) => !i.done).reduce((s, i) => s + i.durationMin, 0)

  return (
    <div className="space-y-4 pb-4 fade-in">
      <div>
        <p className="text-sm text-muted">{dateLabel}</p>
        <h1 className="text-2xl font-extrabold">Today</h1>
      </div>

      <Card className="flex items-center gap-4">
        <ProgressRing
          value={plan.recoveryScore}
          color={scoreColor(plan.recoveryScore)}
          label={`${plan.recoveryScore}%`}
          sublabel="Recovery"
          size={104}
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{'🔥'}</span>
            <div>
              <div className="text-lg font-extrabold leading-none">{streak ?? 0}</div>
              <div className="text-xs text-muted">day streak</div>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-ink/70">{plan.rationale}</p>
        </div>
      </Card>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold">Recommended</h2>
          <span className="text-sm font-semibold text-muted">{remainingMin} min left</span>
        </div>

        <div className="space-y-2">
          {plan.items.map((item) => (
            <Card key={item.id} className="flex items-center gap-3 p-3">
              <MiniProgress percent={item.percent} done={item.done} />
              <div className="flex-1">
                <div className={`text-sm font-semibold ${item.done ? 'text-muted' : 'text-ink'}`}>
                  {item.label}
                </div>
                {item.percent > 0 && !item.done && (
                  <div className="text-xs text-muted">{item.percent}% done</div>
                )}
              </div>
              <Tag color="#7a7d96">{item.durationMin} min</Tag>
              <button
                onClick={() => handleItemTap(item)}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  item.done
                    ? 'bg-teal/15 text-teal border border-teal/30'
                    : 'bg-accent/15 text-accent border border-accent/30'
                }`}
              >
                {item.done ? 'Review' : item.percent > 0 ? 'Continue' : 'Start'}
              </button>
            </Card>
          ))}
        </div>
      </div>

      <Card className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-ink">Total session</div>
          <div className="text-xs text-muted">Estimated duration</div>
        </div>
        <div className="text-2xl font-extrabold text-accent">{plan.totalMin} min</div>
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-ink">Trained BJJ today?</div>
          <div className="text-xs text-muted">Used to plan tomorrow’s recovery</div>
        </div>
        <button
          onClick={toggleBjjToday}
          className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
            bjjToday?.attended
              ? 'bg-accent/20 text-accent border border-accent/40'
              : 'bg-card2 text-muted border border-border'
          }`}
        >
          {bjjToday?.attended ? '🥋 Yes' : 'No'}
        </button>
      </Card>
    </div>
  )
}

function MiniProgress({ percent, done }: { percent: number; done: boolean }) {
  const size = 28
  const stroke = 3
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, percent) / 100) * circumference
  const color = done ? '#2ec4b6' : percent > 0 ? '#f5c842' : '#2e3248'

  return (
    <div className="relative h-7 w-7 flex-shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(var(--color-border))" strokeWidth={stroke} />
        {percent > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        )}
      </svg>
      {done && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-teal">
          {'✓'}
        </div>
      )}
    </div>
  )
}
