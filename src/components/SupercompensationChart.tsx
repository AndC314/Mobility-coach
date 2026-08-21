import { useMemo, useState, useRef, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, ReferenceArea
} from 'recharts'
import { Card } from './Card'
import { db } from '../db/db'
import { computeSupercompensation, computeForecastInsights, type FitnessCategory } from '../lib/supercompensation'

const CATEGORY_CONFIG: Record<FitnessCategory, { label: string; color: string; group: 'strength' | 'mobility' }> = {
  push: { label: 'Push', color: '#e8622a', group: 'strength' },
  pull: { label: 'Pull', color: '#2ec4b6', group: 'strength' },
  legs: { label: 'Legs', color: '#f5c842', group: 'strength' },
  core: { label: 'Core', color: '#a78bfa', group: 'strength' },
  grappling: { label: 'Grappling', color: '#64748b', group: 'strength' },
  mob_hips: { label: 'Hips', color: '#f472b6', group: 'mobility' },
  mob_hamstrings: { label: 'Hamstrings', color: '#fb923c', group: 'mobility' },
  mob_lats: { label: 'Lats/Shoulders', color: '#34d399', group: 'mobility' },
}

type Phase = 'fatigued' | 'supercompensated' | 'recovering' | 'decaying' | 'baseline'

const PHASE_STYLES: Record<Phase, { label: string; bg: string; text: string }> = {
  fatigued: { label: 'Fatigued', bg: 'bg-red-500/15', text: 'text-red-400' },
  supercompensated: { label: 'Peak', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  recovering: { label: 'Recovering', bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  decaying: { label: 'Decaying', bg: 'bg-orange-500/15', text: 'text-orange-400' },
  baseline: { label: 'Baseline', bg: 'bg-border', text: 'text-muted' },
}

function getPhase(currentValue: number, prevValue: number, forecastPeak?: number): Phase {
  if (currentValue < 97) return 'fatigued'
  if (currentValue < 100 && currentValue > prevValue) return 'recovering'
  // If a higher peak is coming in the forecast, we're still rising
  if (currentValue > 100 && forecastPeak != null && forecastPeak > currentValue + 1) return 'supercompensated'
  if (currentValue > 103 && currentValue >= prevValue - 0.2) return 'supercompensated'
  if (currentValue > 100 && currentValue < prevValue) return 'decaying'
  return 'baseline'
}

export default function SupercompensationChart() {
  const [visibleCats, setVisibleCats] = useState<Set<FitnessCategory>>(
    new Set(['push', 'pull', 'legs', 'core', 'grappling'])
  )
  const [timeRange, setTimeRange] = useState<30 | 60 | 90>(30)
  const scrollRef = useRef<HTMLDivElement>(null)

  const calLogs = useLiveQuery(() => db.calisthenicsLogs.toArray(), [], [])
  const bjjLogs = useLiveQuery(() => db.bjjClassLogs.toArray(), [], [])
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])

  const FORECAST_DAYS = 10

  const fullData = useMemo(
    () => computeSupercompensation(calLogs ?? [], bjjLogs ?? [], 90, sessions ?? [], FORECAST_DAYS),
    [calLogs, bjjLogs, sessions]
  )

  const data = useMemo(() => {
    if (timeRange === 90) return fullData
    // slice to show timeRange history + forecast
    const historyCount = fullData.filter(d => !d.isForecast).length
    const startIdx = Math.max(0, historyCount - timeRange)
    return fullData.slice(startIdx)
  }, [fullData, timeRange])

  const forecastInsights = useMemo(
    () => computeForecastInsights(fullData),
    [fullData]
  )

  useEffect(() => {
    if (scrollRef.current && timeRange > 30) {
      requestAnimationFrame(() => {
        scrollRef.current!.scrollLeft = scrollRef.current!.scrollWidth
      })
    }
  }, [timeRange])

  function toggleCat(cat: FitnessCategory) {
    setVisibleCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  const hasData = fullData.some((d) =>
    d.push !== 100 || d.pull !== 100 || d.legs !== 100 || d.core !== 100 || d.grappling !== 100 ||
    d.mob_hips !== 100 || d.mob_hamstrings !== 100 || d.mob_lats !== 100
  )

  if (!hasData) {
    return (
      <Card>
        <h2 className="mb-1 text-base font-bold">Fitness Level</h2>
        <p className="py-4 text-center text-sm text-muted">
          Log training to see your supercompensation curves
        </p>
      </Card>
    )
  }

  const tickFormatter = (date: string, index: number) => {
    const interval = timeRange <= 30 ? 7 : timeRange <= 60 ? 10 : 14
    if (index % interval === 0) {
      const d = new Date(date)
      return `${d.getDate()}/${d.getMonth() + 1}`
    }
    return ''
  }

  // Compute current phase for each category using today (last history point), not last forecast point
  const phases: { cat: FitnessCategory; phase: Phase; value: number }[] = []
  const historyPoints = data.filter(d => !d.isForecast)
  const forecastPoints = data.filter(d => d.isForecast)
  if (historyPoints.length >= 2) {
    const today = historyPoints[historyPoints.length - 1]
    const yesterday = historyPoints[historyPoints.length - 2]
    for (const cat of Object.keys(CATEGORY_CONFIG) as FitnessCategory[]) {
      const val = today[cat] as number
      const prevVal = yesterday[cat] as number
      // Find the peak in the forecast for this category
      const forecastPeak = forecastPoints.length > 0
        ? Math.max(...forecastPoints.map(d => d[cat] as number))
        : undefined
      if (val !== 100 || prevVal !== 100) {
        phases.push({ cat, phase: getPhase(val, prevVal, forecastPeak), value: Math.round(val) })
      }
    }
  }

  const strengthCats = (Object.entries(CATEGORY_CONFIG) as [FitnessCategory, typeof CATEGORY_CONFIG[FitnessCategory]][])
    .filter(([, cfg]) => cfg.group === 'strength')
  const mobilityCats = (Object.entries(CATEGORY_CONFIG) as [FitnessCategory, typeof CATEGORY_CONFIG[FitnessCategory]][])
    .filter(([, cfg]) => cfg.group === 'mobility')

  const chartWidth = timeRange <= 30 ? '100%' : `${Math.max(100, timeRange * 2.5)}%`

  return (
    <Card>
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-base font-bold">Fitness Level</h2>
        <div className="flex gap-1">
          {([30, 60, 90] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold transition-colors ${
                timeRange === r
                  ? 'bg-teal/20 text-teal border border-teal/40'
                  : 'text-muted border border-border'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-[11px] text-muted">
        Banister model · Fatigue clears fast, fitness persists · Inactivity → atrophy
      </p>

      <div className="space-y-1.5 mb-3">
        <div className="flex flex-wrap gap-1.5">
          {strengthCats.map(([cat, cfg]) => (
            <button
              key={cat}
              onClick={() => toggleCat(cat)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold border transition-colors ${
                visibleCats.has(cat)
                  ? 'border-current'
                  : 'border-border text-muted opacity-40'
              }`}
              style={visibleCats.has(cat) ? { color: cfg.color, borderColor: cfg.color, background: cfg.color + '15' } : undefined}
            >
              {cfg.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[9px] text-muted uppercase tracking-wide self-center mr-0.5">Mob</span>
          {mobilityCats.map(([cat, cfg]) => (
            <button
              key={cat}
              onClick={() => toggleCat(cat)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold border transition-colors ${
                visibleCats.has(cat)
                  ? 'border-current'
                  : 'border-border text-muted opacity-40'
              }`}
              style={visibleCats.has(cat) ? { color: cfg.color, borderColor: cfg.color, background: cfg.color + '15' } : undefined}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable chart area */}
      <div
        ref={scrollRef}
        className="overflow-x-auto -mx-3 px-3"
        style={{ height: 260 }}
      >
        <div style={{ width: chartWidth, height: '100%', minWidth: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fill: '#7a7d96', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={tickFormatter}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#7a7d96', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <ReferenceLine y={100} stroke="#3a3d52" strokeDasharray="3 3" label={{ value: 'baseline', position: 'left', fill: '#3a3d52', fontSize: 8 }} />
              {(() => {
                const todayDate = data.find((d, i) => !d.isForecast && (i + 1 >= data.length || data[i + 1]?.isForecast))?.date
                const forecastStart = data.find(d => d.isForecast)?.date
                const forecastEnd = data[data.length - 1]?.date
                return (
                  <>
                    {todayDate && <ReferenceLine x={todayDate} stroke="#a78bfa" strokeDasharray="4 2" strokeWidth={1.5} />}
                    {forecastStart && forecastEnd && (
                      <ReferenceArea x1={forecastStart} x2={forecastEnd} fill="#a78bfa" fillOpacity={0.04} />
                    )}
                  </>
                )
              })()}
              <Tooltip
                contentStyle={{
                  background: '#22263a',
                  border: '1px solid #2e3248',
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelFormatter={(date: string) => {
                  const d = new Date(date)
                  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                }}
                formatter={(value: number, name: string) => [value.toFixed(1), name]}
              />
              {(Object.entries(CATEGORY_CONFIG) as [FitnessCategory, typeof CATEGORY_CONFIG[FitnessCategory]][]).map(([cat, cfg]) =>
                visibleCats.has(cat) ? (
                  <Line
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    name={cfg.label}
                    stroke={cfg.color}
                    strokeWidth={cfg.group === 'mobility' ? 1.5 : 2}
                    strokeDasharray={cfg.group === 'mobility' ? '4 2' : undefined}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2 }}
                  />
                ) : null
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Phase status tags */}
      {phases.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex flex-wrap gap-1.5">
            {phases.map(({ cat, phase, value }) => {
              const cfg = CATEGORY_CONFIG[cat]
              const ps = PHASE_STYLES[phase]
              return (
                <div
                  key={cat}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1 ${ps.bg}`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                  <span className="text-[10px] font-semibold text-ink">{cfg.label}</span>
                  <span className={`text-[9px] font-bold ${ps.text}`}>{ps.label}</span>
                  <span className="text-[9px] text-muted">{value.toFixed(0)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Forecast training suggestions */}
      {forecastInsights.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <h3 className="text-[11px] font-bold text-muted uppercase tracking-wide">Upcoming peaks</h3>
          {forecastInsights.map(({ category, peakDay, peakValue, declineStartDay }) => {
            const cfg = CATEGORY_CONFIG[category]
            return (
              <div
                key={category}
                className="flex items-center gap-2 rounded-lg bg-emerald-500/8 px-3 py-2"
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold text-ink">{cfg.label}</span>
                  <span className="text-[11px] text-emerald-400 ml-1.5">
                    peak in {peakDay === 1 ? 'tomorrow' : `${peakDay} days`}
                  </span>
                  <span className="text-[10px] text-muted ml-1">({peakValue.toFixed(0)})</span>
                </div>
                <div className="text-[9px] text-orange-400 shrink-0">
                  decline day {declineStartDay}
                </div>
              </div>
            )
          })}
          {(() => {
            const peakCats = forecastInsights.filter(i => i.peakDay <= 3)
            if (peakCats.length === 0) return null
            const labels = peakCats.map(i => CATEGORY_CONFIG[i.category].label)
            const dayLabel = Math.min(...peakCats.map(i => i.peakDay))
            return (
              <div className="rounded-lg bg-accent/10 border border-accent/20 px-3 py-2">
                <span className="text-[11px] text-accent font-semibold">
                  {dayLabel === 1 ? 'Tomorrow' : `In ${dayLabel} days`}: train {labels.join(', ')}
                </span>
              </div>
            )
          })()}
        </div>
      )}
    </Card>
  )
}
