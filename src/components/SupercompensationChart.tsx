import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, Legend
} from 'recharts'
import { Card } from './Card'
import { db } from '../db/db'
import { computeSupercompensation, type FitnessCategory } from '../lib/supercompensation'

const CATEGORY_CONFIG: Record<FitnessCategory, { label: string; color: string }> = {
  push: { label: 'Push', color: '#e8622a' },
  pull: { label: 'Pull', color: '#2ec4b6' },
  legs: { label: 'Legs', color: '#f5c842' },
  core: { label: 'Core', color: '#a78bfa' },
  grappling: { label: 'Grappling', color: '#64748b' },
}

export default function SupercompensationChart() {
  const [visibleCats, setVisibleCats] = useState<Set<FitnessCategory>>(
    new Set(['push', 'pull', 'legs', 'core', 'grappling'])
  )

  const calLogs = useLiveQuery(() => db.calisthenicsLogs.toArray(), [], [])
  const bjjLogs = useLiveQuery(() => db.bjjClassLogs.toArray(), [], [])

  const data = useMemo(
    () => computeSupercompensation(calLogs ?? [], bjjLogs ?? [], 90),
    [calLogs, bjjLogs]
  )

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

  const hasData = data.some((d) => d.push !== 100 || d.pull !== 100 || d.legs !== 100 || d.core !== 100 || d.grappling !== 100)

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

  // Only show every 7th date label to avoid crowding
  const tickFormatter = (date: string, index: number) => {
    if (index % 14 === 0) {
      const d = new Date(date)
      return `${d.getDate()}/${d.getMonth() + 1}`
    }
    return ''
  }

  return (
    <Card>
      <h2 className="mb-1 text-base font-bold">Fitness Level</h2>
      <p className="mb-3 text-[11px] text-muted">
        Hard sessions (≥70% best volume) → supercompensation. Light sessions → maintenance only.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {(Object.entries(CATEGORY_CONFIG) as [FitnessCategory, { label: string; color: string }][]).map(([cat, cfg]) => (
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

      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -20, right: 4, top: 4, bottom: 0 }}>
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
            />
            <ReferenceLine y={100} stroke="#3a3d52" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{
                background: '#22263a',
                border: '1px solid #2e3248',
                borderRadius: 8,
                fontSize: 11,
              }}
              labelFormatter={(date: string) => {
                const d = new Date(date)
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              }}
              formatter={(value: number, name: string) => [value.toFixed(1), name]}
            />
            {(Object.entries(CATEGORY_CONFIG) as [FitnessCategory, { label: string; color: string }][]).map(([cat, cfg]) =>
              visibleCats.has(cat) ? (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  name={cfg.label}
                  stroke={cfg.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-[10px] text-muted text-center">
        Baseline 100 · Hard = dip + growth · Light = dip + maintain · No training = decay
      </p>
    </Card>
  )
}
