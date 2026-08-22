import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type HealthMetrics, type BodyMeasurementLog, type BodySite } from '../db/db'
import { syncHealthMetricsToFirebase, syncBodyMeasurementToFirebase, syncWeightLogToFirebase } from '../lib/sync'
import { todayIso } from '../lib/date'
import { Card } from '../components/Card'
import Sparkline from '../components/Sparkline'
import HealthConnectCard from '../components/HealthConnectCard'

const BODY_SITES: { key: BodySite; label: string }[] = [
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'biceps', label: 'Biceps' },
  { key: 'thighs', label: 'Thighs' },
]

const MOOD_EMOJIS = ['😫', '😟', '😐', '😊', '🤩']

type Tab = 'daily' | 'body' | 'connect'

export default function HealthPage() {
  const [tab, setTab] = useState<Tab>('daily')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black text-ink">Health & Body</h1>

      <div className="flex gap-1 rounded-xl bg-card p-1 border border-border">
        <TabButton active={tab === 'daily'} onClick={() => setTab('daily')}>Daily</TabButton>
        <TabButton active={tab === 'body'} onClick={() => setTab('body')}>Body</TabButton>
        <TabButton active={tab === 'connect'} onClick={() => setTab('connect')}>Connect</TabButton>
      </div>

      {tab === 'daily' && <DailyMetricsTab />}
      {tab === 'body' && <BodyMeasurementsTab />}
      {tab === 'connect' && <HealthConnectCard />}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
        active ? 'bg-teal/20 text-teal' : 'text-muted'
      }`}
    >
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// DAILY METRICS TAB
// ─────────────────────────────────────────────────────────────────────────

function DailyMetricsTab() {
  const [date, setDate] = useState(todayIso())
  const [sleepHours, setSleepHours] = useState('')
  const [hrv, setHrv] = useState('')
  const [restingHr, setRestingHr] = useState('')
  const [energy, setEnergy] = useState<number | null>(null)
  const [mood, setMood] = useState<number | null>(null)
  const [weight, setWeight] = useState('')
  const [vo2max, setVo2max] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const last30 = useLiveQuery(
    () => db.healthMetrics.orderBy('date').reverse().limit(30).toArray(),
    [],
    []
  )

  const recentWeights = useLiveQuery(
    () => db.weightLogs.orderBy('date').reverse().limit(30).toArray(),
    [],
    []
  )

  async function handleSave() {
    const sleepVal = parseFloat(sleepHours)
    const hrvVal = parseFloat(hrv)
    const rhrVal = parseFloat(restingHr)
    const weightVal = parseFloat(weight)
    const vo2Val = parseFloat(vo2max)

    if (!sleepVal && !hrvVal && !rhrVal && energy == null && mood == null && !weightVal && !vo2Val) return

    setSaving(true)
    try {
      const entry: HealthMetrics = {
        date,
        createdAt: new Date().toISOString(),
      }
      if (sleepVal > 0) {
        entry.sleepHours = sleepVal
        entry.sleepScore = Math.min(100, Math.round((sleepVal / 8) * 100))
      }
      if (hrvVal > 0) entry.hrv = hrvVal
      if (rhrVal > 0) entry.restingHr = rhrVal
      if (energy != null) entry.energy = energy
      if (mood != null) entry.mood = mood
      if (vo2Val > 0) entry.vo2max = vo2Val
      if (notes.trim()) entry.notes = notes.trim()
      entry.source = 'manual'

      await db.healthMetrics.add(entry)
      syncHealthMetricsToFirebase(entry)

      if (weightVal > 0) {
        const weightLog = { date, weightKg: weightVal, createdAt: new Date().toISOString() }
        await db.weightLogs.add(weightLog)
        syncWeightLogToFirebase(weightLog)
        await db.preferences.update(1, { weightKg: weightVal })
      }

      setSleepHours('')
      setHrv('')
      setRestingHr('')
      setEnergy(null)
      setMood(null)
      setWeight('')
      setVo2max('')
      setNotes('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const sleepData = last30.filter(e => e.sleepHours != null).map(e => e.sleepHours!).reverse()
  const hrvData = last30.filter(e => e.hrv != null).map(e => e.hrv!).reverse()
  const rhrData = last30.filter(e => e.restingHr != null).map(e => e.restingHr!).reverse()
  const energyData = last30.filter(e => e.energy != null).map(e => e.energy!).reverse()
  const weightData = (recentWeights ?? []).map(w => w.weightKg).reverse()

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Log Metrics</h3>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg bg-card2 border border-border px-2 py-1 text-xs text-ink"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricInput label="Sleep" value={sleepHours} onChange={setSleepHours} unit="hrs" step="0.5" />
            <MetricInput label="HRV" value={hrv} onChange={setHrv} unit="ms" />
            <MetricInput label="Resting HR" value={restingHr} onChange={setRestingHr} unit="bpm" />
            <MetricInput label="Weight" value={weight} onChange={setWeight} unit="kg" step="0.1" />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Energy (1-10)</label>
            <div className="mt-1 flex gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                <button
                  key={v}
                  onClick={() => setEnergy(energy === v ? null : v)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-colors ${
                    energy === v ? 'bg-teal text-white' : 'bg-card2 text-muted border border-border'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Mood</label>
            <div className="mt-1 flex gap-2">
              {MOOD_EMOJIS.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => setMood(mood === i + 1 ? null : i + 1)}
                  className={`flex-1 rounded-lg py-2 text-lg transition-all ${
                    mood === i + 1 ? 'bg-teal/20 scale-110 ring-2 ring-teal' : 'bg-card2 border border-border'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <MetricInput label="VO2max" value={vo2max} onChange={setVo2max} unit="ml/kg/min" />

          <div>
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How are you feeling?"
              className="mt-1 w-full rounded-lg bg-card2 border border-border px-3 py-2 text-sm text-ink placeholder:text-muted/50"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-teal py-3 text-sm font-bold text-white disabled:opacity-50 transition-opacity"
          >
            {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Card>

      {last30.length > 0 && (
        <Card>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Recent</h3>
          <div className="space-y-2">
            {last30.slice(0, 7).map((entry, i) => {
              const dayWeight = (recentWeights ?? []).find(w => w.date === entry.date)
              return <RecentEntry key={entry.id ?? i} entry={entry} weightKg={dayWeight?.weightKg} />
            })}
          </div>
        </Card>
      )}

      {(sleepData.length >= 2 || hrvData.length >= 2 || rhrData.length >= 2 || weightData.length >= 2 || energyData.length >= 2) && (
        <Card>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Trends (30 days)</h3>
          <div className="space-y-3">
            {weightData.length >= 2 && (
              <TrendRow label="Weight" data={weightData} color="#f5c842" unit="kg" />
            )}
            {sleepData.length >= 2 && (
              <TrendRow label="Sleep" data={sleepData} color="#2ec4b6" unit="hrs" />
            )}
            {hrvData.length >= 2 && (
              <TrendRow label="HRV" data={hrvData} color="#2ec4b6" unit="ms" />
            )}
            {rhrData.length >= 2 && (
              <TrendRow label="Resting HR" data={rhrData} color="#e8622a" unit="bpm" />
            )}
            {energyData.length >= 2 && (
              <TrendRow label="Energy" data={energyData} color="#2ec4b6" unit="/10" />
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

function MetricInput({
  label, value, onChange, unit, step,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  unit: string
  step?: string
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">{label}</label>
      <div className="mt-1 flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          step={step ?? '1'}
          min="0"
          className="w-full rounded-lg bg-card2 border border-border px-3 py-2 text-sm text-ink"
        />
        <span className="text-[10px] text-muted whitespace-nowrap">{unit}</span>
      </div>
    </div>
  )
}

function TrendRow({ label, data, color, unit }: { label: string; data: number[]; color: string; unit: string }) {
  const latest = data[data.length - 1]
  const prev = data[data.length - 2]
  const diff = latest - prev
  const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→'
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-ink w-20">{label}</span>
        <Sparkline data={data} color={color} width={100} height={24} />
      </div>
      <span className="text-xs text-muted">
        {latest}{unit} {arrow}
      </span>
    </div>
  )
}

function RecentEntry({ entry, weightKg }: { entry: HealthMetrics; weightKg?: number }) {
  const chips: string[] = []
  if (entry.sleepHours != null) chips.push(`${entry.sleepHours}h sleep`)
  if (entry.hrv != null) chips.push(`HRV ${entry.hrv}`)
  if (entry.restingHr != null) chips.push(`RHR ${entry.restingHr}`)
  if (weightKg != null) chips.push(`${weightKg}kg`)
  if (entry.energy != null) chips.push(`E:${entry.energy}/10`)
  if (entry.mood != null) chips.push(MOOD_EMOJIS[entry.mood - 1])

  return (
    <div className="flex items-center justify-between py-1 border-b border-border last:border-0">
      <span className="text-xs font-semibold text-ink">{entry.date}</span>
      <div className="flex gap-1.5 flex-wrap justify-end">
        {chips.map((c, i) => (
          <span key={i} className="rounded-full bg-card2 px-2 py-0.5 text-[10px] text-muted">{c}</span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// BODY MEASUREMENTS TAB
// ─────────────────────────────────────────────────────────────────────────

function BodyMeasurementsTab() {
  const [date, setDate] = useState(todayIso())
  const [values, setValues] = useState<Record<BodySite, string>>({
    chest: '', waist: '', hips: '', biceps: '', thighs: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const allMeasurements = useLiveQuery(
    () => db.bodyMeasurementLogs.orderBy('date').reverse().limit(150).toArray(),
    [],
    []
  )

  async function handleSave() {
    const entries: { site: BodySite; valueCm: number }[] = []
    for (const { key } of BODY_SITES) {
      const v = parseFloat(values[key])
      if (v > 0) entries.push({ site: key, valueCm: v })
    }
    if (entries.length === 0) return

    setSaving(true)
    try {
      const createdAt = new Date().toISOString()
      for (const { site, valueCm } of entries) {
        const log: BodyMeasurementLog = { date, site, valueCm, createdAt }
        await db.bodyMeasurementLogs.add(log)
        syncBodyMeasurementToFirebase(log)
      }
      setValues({ chest: '', waist: '', hips: '', biceps: '', thighs: '' })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const bySite = (site: BodySite) =>
    allMeasurements.filter(m => m.site === site).map(m => m.valueCm).reverse()

  const uniqueDates = [...new Set(allMeasurements.map(m => m.date))].slice(0, 3)
  const comparisonData = uniqueDates.map(d => ({
    date: d,
    measurements: allMeasurements.filter(m => m.date === d),
  }))

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Measurements</h3>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg bg-card2 border border-border px-2 py-1 text-xs text-ink"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {BODY_SITES.map(({ key, label }) => (
              <div key={key}>
                <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">{label}</label>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number"
                    value={values[key]}
                    onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                    step="0.5"
                    min="0"
                    className="w-full rounded-lg bg-card2 border border-border px-3 py-2 text-sm text-ink"
                  />
                  <span className="text-[10px] text-muted">cm</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-teal py-3 text-sm font-bold text-white disabled:opacity-50 transition-opacity"
          >
            {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Measurements'}
          </button>
        </div>
      </Card>

      {comparisonData.length > 0 && (
        <Card>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-1.5 text-left text-muted font-semibold">Site</th>
                  {comparisonData.map(({ date }) => (
                    <th key={date} className="py-1.5 text-right text-muted font-semibold">{date.slice(5)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BODY_SITES.map(({ key, label }) => (
                  <tr key={key} className="border-b border-border last:border-0">
                    <td className="py-1.5 font-semibold text-ink">{label}</td>
                    {comparisonData.map(({ date, measurements }) => {
                      const m = measurements.find(x => x.site === key)
                      return (
                        <td key={date} className="py-1.5 text-right text-muted">
                          {m ? `${m.valueCm}` : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {BODY_SITES.some(({ key }) => bySite(key).length >= 2) && (
        <Card>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Trends</h3>
          <div className="space-y-3">
            {BODY_SITES.filter(({ key }) => bySite(key).length >= 2).map(({ key, label }) => (
              <TrendRow
                key={key}
                label={label}
                data={bySite(key)}
                color={key === 'waist' ? '#e8622a' : '#2ec4b6'}
                unit="cm"
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
