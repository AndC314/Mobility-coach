import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DojoScene from '../components/DojoScene'
import AICoachCard from '../components/AICoachCard'
import AISessionCard from '../components/AISessionCard'
import TrainingCalendar from '../components/TrainingCalendar'
import { Card, Tag } from '../components/Card'
import { useTodayPlan } from '../hooks/useTodayPlan'
import { useAICoach } from '../hooks/useAICoach'
import { useTrainingHours } from '../hooks/useTrainingHours'
import { usePreferences } from '../hooks/usePreferences'
import { getNudgeMessage } from '../lib/trainingHourCalculator'
import type { PlanItem } from '../lib/recommendation'

export default function Today() {
  const [recommendedOpen, setRecommendedOpen] = useState(false)
  const plan = useTodayPlan()
  const aiCoach = useAICoach()
  const trainingHours = useTrainingHours()
  const { preferences } = usePreferences()
  const activeSports = preferences.activeSports ?? ['mobility', 'bjj', 'calisthenics', 'running', 'elite_forces']
  const navigate = useNavigate()

  const today = new Date()
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })

  async function handleItemTap(item: PlanItem) {
    if (item.target.tab === 'recovery') {
      navigate(`/recovery?area=${item.target.area}`)
    } else if (item.target.tab === 'calisthenics') {
      navigate('/calisthenics')
    } else if (item.target.tab === 'morning' || item.target.tab === 'bjj_release') {
      navigate(`/mobility?tab=${item.target.tab}`)
    } else {
      navigate(`/mobility?tab=${item.target.tab}`)
    }
  }

  if (!plan) {
    return (
      <div className="flex h-64 items-center justify-center text-muted text-sm">Loading today plan...</div>
    )
  }

  const remainingMin = plan.items.filter((i) => !i.done).reduce((s, i) => s + i.durationMin, 0)

  return (
    <div className="space-y-4 pb-4 fade-in">
      <div>
        <p className="text-sm text-muted">{dateLabel}</p>
        <h1 className="text-2xl font-extrabold">Today</h1>
      </div>

      <DojoScene />

      <AICoachCard />

      {trainingHours && trainingHours.length > 0 && (
        <Card>
          <h2 className="mb-4 text-base font-bold">Training consistency</h2>
          <div className="space-y-4">
            {trainingHours.filter((t) => activeSports.includes(t.category)).map((training) => {
              const categoryEmoji = { bjj: '🥋', calisthenics: '💪', mobility: '🧘', running: '🏃' }[training.category]
              const categoryName = { bjj: 'BJJ', calisthenics: 'Calisthenics', mobility: 'Mobility', running: 'Running' }[training.category]
              const decayRate = 0.05
              const weeksInactive = training.lastActivityDaysAgo / 7
              const totalLoggedHours = Math.round(training.totalHours / (1 - decayRate * weeksInactive) * 100) / 100
              const consistencyPercent = totalLoggedHours > 0 ? Math.round((training.totalHours / totalLoggedHours) * 100) : 0
              const progressPercent = Math.min(100, (training.totalHours / 40) * 100)
              const nudgeMsg = getNudgeMessage(training)
              return (
                <div key={training.category}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{categoryEmoji}</span>
                      <div>
                        <div className="text-sm font-semibold">{categoryName}</div>
                        <div className="text-xs text-muted">
                          {totalLoggedHours === 0 ? '0h logged' : `${training.totalHours}h • ${consistencyPercent}% consistent`}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted">{training.hoursThisWeek}h this week</div>
                  </div>
                  <div className="bg-border rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${training.needsNudge ? 'bg-orange-500' : 'bg-accent'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {nudgeMsg && <div className="text-xs text-orange-600 mt-2 italic">{nudgeMsg}</div>}
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-xs text-muted">Skills decay 5% per week of inactivity. Log 1h/week to maintain your score.</p>
        </Card>
      )}

      {aiCoach.sessionPlan && aiCoach.sessionPlan.length > 0 ? (
        <AISessionCard plan={aiCoach.sessionPlan} />
      ) : (
        <div>
          <button
            onClick={() => setRecommendedOpen((o) => !o)}
            className="mb-2 flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">Recommended</h2>
              <svg
                width="12" height="12" viewBox="0 0 12 12"
                className={`text-muted transition-transform ${recommendedOpen ? 'rotate-180' : ''}`}
              >
                <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-muted">{remainingMin} min left</span>
          </button>

          {recommendedOpen && (
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
          )}

          <Card className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-ink">Total session</div>
              <div className="text-xs text-muted">Estimated duration</div>
            </div>
            <div className="text-2xl font-extrabold text-accent">{plan.totalMin} min</div>
          </Card>
        </div>
      )}

      <TrainingCalendar />

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
          OK
        </div>
      )}
    </div>
  )
}
