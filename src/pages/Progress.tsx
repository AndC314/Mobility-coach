import { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts'
import { Card, Tag } from '../components/Card'
import TrainingCalendar from '../components/TrainingCalendar'
import BjjSkillsSection from '../components/BjjSkillsSection'
import SkillTree from '../components/SkillTree'
import CalisthenicsSection from '../components/CalisthenicsSection'
import { PHASES, PROGRESSIONS, PROGRESSION_LABELS } from '../data/exercises'
import { usePhaseProgress } from '../hooks/usePhaseProgress'
import { useHoldHistory } from '../hooks/useHoldLogs'
import { useAllSessions } from '../hooks/useSessions'
import { useStreak } from '../hooks/useStreak'
import { db, type Measurement, type MeasurementType, type PhaseProgress } from '../db/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { isoDate, todayIso } from '../lib/date'

const STRENGTH_SKILLS: { type: MeasurementType; label: string; unit: string }[] = [
  { type: 'lsit_hold', label: 'L-sit hold', unit: 'sec' },
  { type: 'handstand_hold', label: 'Handstand hold', unit: 'sec' },
  { type: 'dragon_flag_negatives', label: 'Dragon flag negatives', unit: 'reps' },
  { type: 'pullups', label: 'Pull-ups', unit: 'reps' }
]

const FLEXIBILITY_METRICS: { type: MeasurementType; label: string; unit: string }[] = [
  { type: 'pancake_angle', label: 'Pancake (straddle) angle', unit: '°' },
  { type: 'pike_reach', label: 'Pike reach (from toes)', unit: 'cm' },
  { type: 'ninety_ninety_rom', label: '90/90 ROM', unit: '°' }
]

function last7Days() {
  const days: string[] = []
  const cursor = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(cursor)
    d.setDate(d.getDate() - i)
    days.push(isoDate(d))
  }
  return days
}

export default function Progress() {
  const [tab, setTab] = useState<'logs' | 'skills' | 'bjj' | 'calisthenics' | 'trends'>('logs')
  const { rows } = usePhaseProgress()
  const sessions = useAllSessions()
  const streak = useStreak()
  const measurements = useLiveQuery(() => db.measurements.toArray(), [], [])
  const sorenessLogs = useLiveQuery(() => db.sorenessLogs.toArray(), [], [])

  const days = last7Days()
  const sessionsByDay = days.map((d) => ({
    day: d.slice(5),
    sessions: sessions?.filter((s) => s.date === d).length ?? 0
  }))

  const sorenessByDay = days.map((d) => ({
    day: d.slice(5),
    soreAreas: sorenessLogs?.find((s) => s.date === d)?.areas.length ?? 0
  }))

  const weeklySessions = sessions?.filter((s) => days.includes(s.date)).length ?? 0

  const checkpointsCompleted = rows.filter((r) => r.checkpointMet).length

  return (
    <div className="space-y-5 pb-4 fade-in">
      <div>
        <p className="text-sm text-muted">Your trends</p>
        <h1 className="text-2xl font-extrabold">Progress</h1>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['logs', 'skills', 'bjj', 'calisthenics', 'trends'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${
              tab === t ? 'bg-teal/20 text-teal border border-teal/40' : 'bg-card text-muted border border-border'
            }`}
          >
            {t === 'bjj' ? 'BJJ' : t === 'skills' ? 'Skill Tree' : t === 'calisthenics' ? 'Calisthenics' : t}
          </button>
        ))}
      </div>

      {tab === 'logs' && <TrainingCalendar />}

      {tab === 'calisthenics' && <CalisthenicsSection />}

      {tab === 'skills' && <SkillTree />}

      {tab === 'bjj' && <BjjSkillsSection />}

      {tab === 'trends' && (
        <>
      {/* Mobility phase summary */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Mobility Phases</h2>
          <Tag color="#2ec4b6">{checkpointsCompleted}/3 checkpoints</Tag>
        </div>
        <div className="space-y-3">
          {(['90/90', 'straddle', 'pike'] as const).map((key) => {
            const progress = rows.find((r) => r.exerciseKey === key)
            const phase = progress?.phase ?? 1
            const phaseInfo = PHASES[phase - 1]
            const pct = (phase / 4) * 100
            return (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">{PROGRESSION_LABELS[key]}</span>
                  <span style={{ color: phaseInfo.color }}>
                    Phase {phase} · {phaseInfo.title}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: phaseInfo.color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Hold time progression */}
      <HoldTimeSection rows={rows} />

      {/* Weekly consistency */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Sessions this week</h2>
          <Tag color="#e8622a">{streak ?? 0} day streak</Tag>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sessionsByDay}>
              <XAxis dataKey="day" tick={{ fill: '#7a7d96', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#22263a', border: '1px solid #2e3248', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e8e8f0' }}
              />
              <Bar dataKey="sessions" fill="#2ec4b6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-center text-xs text-muted">{weeklySessions} sessions logged this week</p>
      </Card>

      {/* Soreness trend */}
      <Card>
        <h2 className="mb-3 text-base font-bold">Soreness trend</h2>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sorenessByDay}>
              <CartesianGrid stroke="#2e3248" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#7a7d96', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#22263a', border: '1px solid #2e3248', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e8e8f0' }}
              />
              <Line type="monotone" dataKey="soreAreas" stroke="#e8622a" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-center text-xs text-muted">Number of areas logged sore, per day</p>
      </Card>

      {/* Flexibility measurements */}
      <MeasurementSection title="Flexibility" metrics={FLEXIBILITY_METRICS} measurements={measurements ?? []} />

      {/* Strength skills */}
      <MeasurementSection title="Strength skills" metrics={STRENGTH_SKILLS} measurements={measurements ?? []} />
        </>
      )}
    </div>
  )
}

function HoldTimeSection({ rows }: { rows: PhaseProgress[] }) {
  const ninetyPhase = rows.find((r) => r.exerciseKey === '90/90')?.phase ?? 1
  const straddlePhase = rows.find((r) => r.exerciseKey === 'straddle')?.phase ?? 1
  const pikePhase = rows.find((r) => r.exerciseKey === 'pike')?.phase ?? 1

  const ninety = useHoldHistory('90/90', ninetyPhase)
  const straddle = useHoldHistory('straddle', straddlePhase)
  const pike = useHoldHistory('pike', pikePhase)

  const sections = [
    { key: '90/90', label: PROGRESSION_LABELS['90/90'], phase: ninetyPhase, data: ninety, color: '#2ec4b6' },
    { key: 'straddle', label: PROGRESSION_LABELS['straddle'], phase: straddlePhase, data: straddle, color: '#f5c842' },
    { key: 'pike', label: PROGRESSION_LABELS['pike'], phase: pikePhase, data: pike, color: '#e8622a' }
  ]

  const withData = sections.filter((s) => s.data.length > 0)

  return (
    <Card>
      <h2 className="mb-1 text-base font-bold">Hold time progression</h2>
      <p className="mb-3 text-xs text-muted">
        Completing before the timer ends records your actual hold time. The trend going up — not
        just the checkpoint — is the real progression signal.
      </p>

      {withData.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">
          Complete a 90/90, Straddle or Pike phase to start tracking
        </p>
      ) : (
        <div className="space-y-4">
          {withData.map((s) => {
            const chartData = s.data.map((h, i) => ({ idx: i + 1, actual: h.actualSec, planned: h.plannedSec }))
            const latest = s.data[s.data.length - 1]
            const first = s.data[0]
            const delta = latest.actualSec - first.actualSec

            return (
              <div key={s.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">
                    {s.label} · Phase {latest.phase}
                  </span>
                  <span style={{ color: s.color }}>
                    {latest.actualSec}s
                    {s.data.length > 1 && delta !== 0 ? ` (${delta > 0 ? '+' : ''}${delta}s)` : ''}
                  </span>
                </div>
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <Line type="monotone" dataKey="actual" stroke={s.color} strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="planned" stroke="#7a7d96" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                      <XAxis dataKey="idx" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function MeasurementSection({
  title,
  metrics,
  measurements
}: {
  title: string
  metrics: { type: MeasurementType; label: string; unit: string }[]
  measurements: Measurement[]
}) {
  const [adding, setAdding] = useState<MeasurementType | null>(null)
  const [value, setValue] = useState('')

  async function save() {
    if (!adding || !value) return
    await db.measurements.add({
      date: todayIso(),
      type: adding,
      value: Number(value),
      unit: metrics.find((m) => m.type === adding)?.unit ?? ''
    })
    setAdding(null)
    setValue('')
  }

  return (
    <Card>
      <h2 className="mb-3 text-base font-bold">{title}</h2>
      <div className="space-y-3">
        {metrics.map((m) => {
          const history = measurements
            .filter((x) => x.type === m.type)
            .sort((a, b) => a.date.localeCompare(b.date))
          const latest = history[history.length - 1]
          const data = history.slice(-8).map((h) => ({ date: h.date.slice(5), value: h.value }))

          return (
            <div key={m.type} className="border-b border-border pb-3 last:border-b-0 last:pb-0">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{m.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-teal">
                    {latest ? `${latest.value} ${m.unit}` : '—'}
                  </span>
                  <button
                    onClick={() => setAdding(adding === m.type ? null : m.type)}
                    className="rounded-full bg-card2 px-2.5 py-1 text-xs font-bold text-muted border border-border"
                  >
                    +
                  </button>
                </div>
              </div>

              {data.length > 1 && (
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                      <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2} dot={{ r: 2 }} />
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {adding === m.type && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={`Value in ${m.unit}`}
                    className="flex-1 rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink"
                  />
                  <button onClick={save} className="rounded-lg bg-teal/20 px-4 py-2 text-sm font-bold text-teal border border-teal/40">
                    Save
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
