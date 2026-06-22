import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card } from './Card'
import { useAllSessions } from '../hooks/useSessions'
import { useStreak, useLongestStreak } from '../hooks/useStreak'
import { usePreferences } from '../hooks/usePreferences'
import { isoDate, startOfWeek, todayIso } from '../lib/date'
import { db, type CompletedSession } from '../db/db'
import { computeMuscleScores, MUSCLE_LABELS, type MuscleGroup } from '../data/muscleMap'

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

// Ring colors
const RING_MOBILITY = '#3b82f6' // blue
const RING_BJJ = '#ef4444' // red
const RING_CALISTHENICS = '#22c55e' // green

interface DayRings {
  mobility: number // 0-1 completion
  bjj: number // 0 or 1
  calisthenics: number // 0-1 (10% per muscle group at 100%)
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

  // Compute ring data per day
  function getRingsForDate(dateStr: string): DayRings {
    const daySessions = (sessions ?? []).filter((s) => s.date === dateStr)

    // Mobility: sum actualSec / sum plannedSec for non-calisthenics sessions
    const mobilitySessions = daySessions.filter((s) => s.type !== 'calisthenics')
    let mobility = 0
    if (mobilitySessions.length > 0) {
      const totalPlanned = mobilitySessions.reduce((s, x) => s + x.plannedSec, 0)
      const totalActual = mobilitySessions.reduce((s, x) => s + x.actualSec, 0)
      mobility = totalPlanned > 0 ? Math.min(1, totalActual / totalPlanned) : (totalActual > 0 ? 1 : 0)
    }

    // BJJ: 1 if any BJJ class logged that day
    const bjj = (bjjLogs ?? []).some((l) => l.date === dateStr) ? 1 : 0

    // Calisthenics: 10% per muscle group at 100% load
    const dayCalLogs = (calLogs ?? []).filter((l) => l.date === dateStr)
    let calisthenics = 0
    if (dayCalLogs.length > 0) {
      const scores = computeMuscleScores(
        dayCalLogs.map((l) => ({ exerciseId: l.exerciseId, value: l.value, date: l.date })),
        dateStr
      )
      const fullGroups = scores.filter((s) => s.score >= 100).length
      calisthenics = Math.min(1, fullGroups * 0.1)
    }

    return { mobility, bjj, calisthenics }
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
            const rings = inMonth ? getRingsForDate(dStr) : { mobility: 0, bjj: 0, calisthenics: 0 }
            const hasAny = rings.mobility > 0 || rings.bjj > 0 || rings.calisthenics > 0
            const hasConflict = conflictDays.includes(dStr)

            return (
              <div key={i} className="flex items-center justify-center py-0.5">
                <DayCell
                  day={d.getDate()}
                  inMonth={inMonth}
                  isToday={isToday}
                  rings={rings}
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

// ─── Day cell with concentric progress rings ────────────────────────────────

interface DayCellProps {
  day: number
  inMonth: boolean
  isToday: boolean
  rings: DayRings
  hasConflict?: boolean
}

function DayCell({ day, inMonth, isToday, rings, hasConflict }: DayCellProps) {
  const size = 40
  const cx = size / 2
  const cy = size / 2

  // Three concentric rings: outer=mobility, middle=bjj, inner=calisthenics
  // Radii chosen so numbers (even 2-digit) fit comfortably inside
  const ringDefs = [
    { radius: 17, value: rings.mobility, color: RING_MOBILITY, width: 2.5 },
    { radius: 13.5, value: rings.bjj, color: RING_BJJ, width: 2.5 },
    { radius: 10, value: rings.calisthenics, color: RING_CALISTHENICS, width: 2.5 }
  ]

  const hasAnyRing = rings.mobility > 0 || rings.bjj > 0 || rings.calisthenics > 0

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {hasAnyRing && inMonth && (
        <svg
          width={size}
          height={size}
          className="absolute inset-0"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {ringDefs.map(({ radius, value, color, width }, i) => {
            if (value <= 0) return null
            const circumference = 2 * Math.PI * radius
            const offset = circumference * (1 - value)
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={width}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                opacity={0.85}
              />
            )
          })}
        </svg>
      )}

      {/* Today ring (thin accent border) */}
      {isToday && inMonth && (
        <svg width={size} height={size} className="absolute inset-0">
          <circle
            cx={cx}
            cy={cy}
            r={18.5}
            fill="none"
            stroke="#e8622a"
            strokeWidth={1.5}
            opacity={0.9}
          />
        </svg>
      )}

      {/* Conflict indicator */}
      {hasConflict && inMonth && (
        <span className="absolute top-0 right-0 text-red-600 font-bold text-lg leading-none">!</span>
      )}

      <span
        className={`relative z-10 text-[13px] font-semibold ${
          !inMonth ? 'text-border' : isToday ? 'text-accent font-bold' : 'text-ink/85'
        }`}
      >
        {day}
      </span>
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
