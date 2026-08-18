import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend
} from 'recharts'
import SkillTree from '../components/SkillTree'
import SkillRadar from '../components/SkillRadar'
import SupercompensationChart from '../components/SupercompensationChart'
import WeakLinkCard from '../components/WeakLinkCard'
import { Card } from '../components/Card'
import { useActivityTimeseries } from '../hooks/useActivityTimeseries'

export default function Progress() {
  const [view, setView] = useState<'tree' | 'trends' | 'activity'>('tree')
  const timeseries = useActivityTimeseries(12)

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
            { id: 'trends', label: 'Strength Profile' },
            { id: 'activity', label: 'Activity' },
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

      {view === 'tree' && (
        <div className="space-y-4">
          <WeakLinkCard />
          <SkillTree />
        </div>
      )}

      {view === 'trends' && (
        <div className="space-y-4">
          <SkillRadar />
          <SupercompensationChart />
        </div>
      )}

      {view === 'activity' && (
        <div className="space-y-4">
          {/* Weekly summary stats */}
          {(() => {
            const activeWeeks = timeseries.filter((w) => w.totalMins > 0)
            const totalSessions = timeseries.reduce(
              (s, w) => s + w.bjjSessions + w.calisthenicsSessions + w.mobilitySessions, 0
            )
            const totalMins = timeseries.reduce((s, w) => s + w.totalMins, 0)
            const avgPerWeek = activeWeeks.length > 0
              ? Math.round(totalMins / activeWeeks.length)
              : 0
            return (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: totalSessions, label: 'Sessions' },
                  { value: `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`, label: 'Total' },
                  { value: `${avgPerWeek}m`, label: 'Avg / week' }
                ].map(({ value, label }) => (
                  <Card key={label} className="text-center py-3">
                    <div className="text-lg font-bold text-ink">{value}</div>
                    <div className="text-[10px] text-muted uppercase tracking-wide">{label}</div>
                  </Card>
                ))}
              </div>
            )
          })()}

          <Card>
            <h2 className="mb-1 text-base font-bold">Weekly training</h2>
            <p className="mb-3 text-xs text-muted">Last 12 weeks — minutes per discipline</p>
            {timeseries.every((w) => w.totalMins === 0) ? (
              <p className="py-6 text-center text-sm text-muted">No sessions logged yet</p>
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeseries} margin={{ left: -16, right: 4 }}>
                    <XAxis
                      dataKey="weekLabel"
                      tick={{ fill: '#7a7d96', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      interval={1}
                    />
                    <YAxis
                      tick={{ fill: '#7a7d96', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      unit="m"
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#22263a',
                        border: '1px solid #2e3248',
                        borderRadius: 8,
                        fontSize: 12
                      }}
                      labelStyle={{ color: '#e8e8f0', fontWeight: 600 }}
                      formatter={(value: number, name: string) => [`${value} min`, name]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      formatter={(value) => <span style={{ color: '#b0b3c6' }}>{value}</span>}
                    />
                    <Bar dataKey="bjjMins" name="BJJ" stackId="a" fill="#2ec4b6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="calisthenicsMins" name="Calisthenics" stackId="a" fill="#e8622a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="mobilityMins" name="Mobility" stackId="a" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-2 text-base font-bold">By discipline</h2>
            <div className="space-y-3">
              {[
                { label: 'BJJ', color: '#2ec4b6', minsKey: 'bjjMins' as const, sessKey: 'bjjSessions' as const },
                { label: 'Calisthenics', color: '#e8622a', minsKey: 'calisthenicsMins' as const, sessKey: 'calisthenicsSessions' as const },
                { label: 'Mobility', color: '#a78bfa', minsKey: 'mobilityMins' as const, sessKey: 'mobilitySessions' as const }
              ].map(({ label, color, minsKey, sessKey }) => {
                const total = timeseries.reduce((s, w) => s + w[minsKey], 0)
                const sessions = timeseries.reduce((s, w) => s + w[sessKey], 0)
                const hrs = Math.floor(total / 60)
                const mins = total % 60
                return (
                  <div key={minsKey} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                      <span className="text-sm text-ink">{label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">
                        {hrs > 0 ? `${hrs}h ` : ''}{mins}m
                      </span>
                      <span className="ml-2 text-xs text-muted">
                        ({sessions} {sessions === 1 ? 'session' : 'sessions'})
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

