import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, Area, ComposedChart } from 'recharts'
import { Card } from './Card'
import { useFitnessTrend } from '../hooks/useFitnessTrend'

const COLORS = {
  overall: '#e8622a',
  strength: '#f97316',
  grappling: '#2ec4b6',
  mobility: '#a78bfa',
}

export default function FitnessTrendChart() {
  const data = useFitnessTrend(60)

  if (data.length === 0 || data.every((d) => d.overall === 100)) {
    return (
      <Card>
        <h2 className="mb-1 text-base font-bold">Fitness Level</h2>
        <p className="py-6 text-center text-sm text-muted">
          Log some training to see your fitness trend
        </p>
      </Card>
    )
  }

  const todayIdx = data.findIndex((d) => d.isForecast) - 1
  const current = todayIdx >= 0 ? data[todayIdx] : data[data.length - 1]
  const weekAgo = todayIdx >= 7 ? data[todayIdx - 7] : data[0]
  const delta = Math.round((current.overall - weekAgo.overall) * 10) / 10

  const chartData = data.map((d) => ({
    ...d,
    overall: d.isForecast ? undefined : d.overall,
    forecast: d.isForecast ? d.overall : undefined,
  }))
  const lastActualIdx = data.findIndex((d) => d.isForecast)
  if (lastActualIdx > 0) {
    (chartData[lastActualIdx] as any).forecast = data[lastActualIdx - 1].overall
  }

  const minY = Math.min(...data.map((d) => Math.min(d.overall, d.strength, d.grappling, d.mobility)))
  const maxY = Math.max(...data.map((d) => Math.max(d.overall, d.strength, d.grappling, d.mobility)))
  const yMin = Math.floor(Math.min(minY, 95) / 5) * 5
  const yMax = Math.ceil(Math.max(maxY, 105) / 5) * 5

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold">Fitness Level</h2>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-black text-ink">{Math.round(current.overall)}</span>
            <span className={`text-xs font-bold ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {delta >= 0 ? '↑' : '↓'}{Math.abs(delta)}
            </span>
          </div>
        </div>
        <p className="mb-3 text-[11px] text-muted">
          Supercompensation model — 60 days + 7 day forecast
        </p>

        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ left: -16, right: 4, top: 4 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: '#7a7d96', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval={Math.floor(data.length / 6)}
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fill: '#7a7d96', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine y={100} stroke="#3b3e52" strokeDasharray="3 3" />
              <Tooltip
                contentStyle={{
                  background: '#22263a',
                  border: '1px solid #2e3248',
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelStyle={{ color: '#e8e8f0', fontWeight: 600 }}
                formatter={(value: number, name: string) => [
                  value.toFixed(1),
                  name.charAt(0).toUpperCase() + name.slice(1),
                ]}
              />
              <Line
                type="monotone"
                dataKey="overall"
                stroke={COLORS.overall}
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke={COLORS.overall}
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 3"
                opacity={0.6}
              />
              <Line
                type="monotone"
                dataKey="strength"
                stroke={COLORS.strength}
                strokeWidth={1.2}
                dot={false}
                opacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="grappling"
                stroke={COLORS.grappling}
                strokeWidth={1.2}
                dot={false}
                opacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="mobility"
                stroke={COLORS.mobility}
                strokeWidth={1.2}
                dot={false}
                opacity={0.5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap gap-3 justify-center">
          {([
            { key: 'overall', label: 'Overall' },
            { key: 'strength', label: 'Strength' },
            { key: 'grappling', label: 'Grappling' },
            { key: 'mobility', label: 'Mobility' },
          ] as const).map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full" style={{ background: COLORS[key] }} />
              <span className="text-[10px] text-muted">{label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Category breakdown */}
      <Card>
        <h3 className="mb-2 text-sm font-bold">Current Levels</h3>
        <div className="space-y-2">
          {([
            { key: 'strength' as const, label: 'Strength', color: COLORS.strength },
            { key: 'grappling' as const, label: 'Grappling', color: COLORS.grappling },
            { key: 'mobility' as const, label: 'Mobility', color: COLORS.mobility },
          ]).map(({ key, label, color }) => {
            const val = current[key]
            const barPct = Math.max(0, Math.min(100, ((val - yMin) / (yMax - yMin)) * 100))
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-ink font-semibold">{label}</span>
                  <span className="text-xs font-black" style={{ color }}>{Math.round(val)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-card2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barPct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
