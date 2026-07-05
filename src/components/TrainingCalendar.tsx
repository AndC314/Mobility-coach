import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card } from './Card'
import { useAllSessions } from '../hooks/useSessions'
import { useStreak, useLongestStreak } from '../hooks/useStreak'
import { usePreferences } from '../hooks/usePreferences'
import { isoDate, startOfWeek, todayIso } from '../lib/date'
import { db, type CompletedSession, type BjjLog, type CalisthenicsLog, type Session } from '../db/db'
import { computeMuscleScores, MUSCLE_LABELS, type MuscleGroup } from '../data/muscleMap'
import { calculateDailyLoad, type DailyLoad } from '../lib/loadCalculation'
import CalendarDay from './CalendarDay'

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const SESSION_TYPE_LABELS: Record<string, string> = {
  morning: 'Morning mobility',
  bjj_release: 'Post-BJJ release',
  hip_mobility: 'Hip mobility',
  pancake: 'Pancake / Straddle',
  pike: 'Pike',
  ninety_ninety: '90/90',
  recovery: 'Recovery',
  calisthenics: 'Calisthenics',
  custom: 'Session'
}

function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const gridStart = startOfWeek(first)

  const days: Date[] = []
  const cursor = new Date(gridStart)
  while (cursor <= last || days.length % 7 !== 0) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
    if (days.length > 42) break
  }
  return days
}

interface TrainingCalendarProps {
  conflictDays?: string[]
}

export default function TrainingCalendar({ conflictDays = [] }: TrainingCalendarProps) {
  const sessions = useAllSessions()
  const streak = useStreak()
  const longestStreak = useLongestStreak()
  const { preferences, update } = usePreferences()
  const [editingGoal, setEditingGoal] = useState(false)

  const [viewDate, setViewDate] = useState(() => new Date())
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const today = new Date()
  const todayStr = isoDate(today)

  const weekStart = isoDate(startOfWeek(today))
  const weeklyCount = new Set((sessions ?? []).filter((s) => s.date >= weekStart).map((s) => s.date)).size

  const monthGrid = buildMonthGrid(year, month)
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  // Load BJJ and calisthenics logs for the visible month range
  const monthStart = isoDate(monthGrid[0])
  const monthEnd = isoDate(monthGrid[monthGrid.length - 1])

  const bjjLogs = useLiveQuery(
    () => db.bjjClassLogs.where('date').between(monthStart, monthEnd, true, true).toArray(),
    [monthStart, monthEnd],
    []
  )
  const calLogs = useLiveQuery(
    () => db.calisthenicsLogs.where('date').between(monthStart, monthEnd, true, true).toArray(),
    [monthStart, monthEnd],
    []
  )

  // Get daily load for a date using the comprehensive load calculation
  function getDailyLoadForDate(dateStr: string): DailyLoad {
    if (!bjjLogs || !calLogs || !sessions) {
      return {
        date: dateStr,
        bjjLoad: 0,
        calisthenicsLoad: 0,
        mobilityLoad: 0,
        overallLoad: 0,
        breakdown: {
          bjjTechnicalMins: 0,
          bjjSparringMins: 0,
          calisthenicsMinutes: 0,
          mobilityMinutes: 0,
          muscleLoads: {}
        }
      }
    }
    return calculateDailyLoad(dateStr, bjjLogs as BjjLog[], calLogs as CalisthenicsLog[], sessions as Session[])
  }

  const sessionsThisMonth = (sessions ?? [])
    .filter((s) => {
      const d = new Date(s.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  function changeMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1))
  }

  return (
    <div className="space-y-4">
      {/* Streak + weekly goal */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🔥</span>
            <div>
              <div className="text-lg font-extrabold leading-none">{streak ?? 0} day{(streak ?? 0) === 1 ? '' : 's'}</div>
              <div className="text-xs text-muted">Current streak</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏆</span>
            <div>
              <div className="text-lg font-extrabold leading-none">{longestStreak ?? 0} day{(longestStreak ?? 0) === 1 ? '' : 's'}</div>
              <div className="text-xs text-muted">Longest streak</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <span className="text-sm font-semibold text-ink/90">Weekly goal</span>
          </div>
          {editingGoal ? (
            <div className="flex items-center gap-1.5">
              {[2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    update({ weeklyGoalDays: n })
                    setEditingGoal(false)
                  }}
                  className={`h-7 w-7 rounded-full text-xs font-bold ${
                    preferences.weeklyGoalDays === n
                      ? 'bg-teal/20 text-teal border border-teal/40'
                      : 'bg-card2 text-muted border border-border'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setEditingGoal(true)}
              className="rounded-full bg-card2 px-3 py-1.5 text-xs font-bold text-ink/90 border border-border"
            >
              {weeklyCount}/{preferences.weeklyGoalDays} days
            </button>
          )}
        </div>
      </Card>

      {/* Month calendar with rings */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{monthLabel}</h2>
          <div className="flex gap-1">
            <button
              onClick={() => changeMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-card2 text-muted border border-border"
            >
              ‹
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-card2 text-muted border border-border"
            >
              ›
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="mb-2 flex items-center justify-center gap-4">
          <LegendDot color={RING_MOBILITY} label="Mobility" />
          <LegendDot color={RING_BJJ} label="BJJ" />
          <LegendDot color={RING_CALISTHENICS} label="Calisthenics" />
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_LABELS.map((d, i) => (
            <div key={i} className="py-1 text-[11px] font-semibold text-muted">
              {d}
            </div>
          ))}
          {monthGrid.map((d, i) => {
            const dStr = isoDate(d)
            const inMonth = d.getMonth() === month
            const isToday = dStr === todayStr
            const load = inMonth ? getDailyLoadForDate(dStr) : {
              date: dStr,
              bjjLoad: 0,
              calisthenicsLoad: 0,
              mobilityLoad: 0,
              overallLoad: 0,
              breakdown: {
                bjjTechnicalMins: 0,
                bjjSparringMins: 0,
                calisthenicsMinutes: 0,
                mobilityMinutes: 0,
                muscleLoads: {}
              }
            }
            const hasConflict = conflictDays.includes(dStr)

            return (
              <div key={i} className="flex items-center justify-center py-0.5">
                <CalendarDay
                  date={d}
                  dateIso={dStr}
                  load={load}
                  isCurrentMonth={inMonth}
                  isToday={isToday}
                  hasConflict={hasConflict}
                />
              </div>
            )
          })}
        </div>
      </Card>

      {/* Session list for the month */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Sessions</h2>
          <span className="text-xs text-muted">{monthLabel}</span>
        </div>
        {sessionsThisMonth.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No sessions logged this month</p>
        ) : (
          <div className="space-y-2">
            {sessionsThisMonth.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}


function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-muted">{label}</span>
    </div>
  )
}

function SessionRow({ session }: { session: CompletedSession }) {
  const d = new Date(session.date)
  const dateLabel = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
  const typeLabel = SESSION_TYPE_LABELS[session.type] ?? session.label

  return (
    <div className="flex items-center gap-3 rounded-xl bg-card2 px-3 py-2.5">
      <div className="flex h-9 w-9 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-teal/15 text-teal">
        <span className="text-[10px] font-bold leading-none">{dateLabel.split(' ')[0]}</span>
        <span className="text-sm font-extrabold leading-none">{dateLabel.split(' ')[1]}</span>
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-ink/90">{session.label}</div>
        <div className="text-xs text-muted">{typeLabel}</div>
      </div>
      <div className="text-sm font-bold text-muted">{session.durationMin} min</div>
    </div>
  )
}
