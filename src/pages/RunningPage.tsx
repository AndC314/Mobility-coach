import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type RunningLog } from '../db/db'
import { upsertTodaySession } from '../hooks/useSessions'
import { syncRunningLogToFirebase } from '../lib/sync'
import { todayIso } from '../lib/date'
import { Card } from '../components/Card'

function formatPace(durationSec: number, distanceKm: number): string {
  if (distanceKm <= 0) return '--'
  const paceSecPerKm = durationSec / distanceKm
  const min = Math.floor(paceSecPerKm / 60)
  const sec = Math.round(paceSecPerKm % 60)
  return `${min}:${sec.toString().padStart(2, '0')}/km`
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

interface Milestone {
  label: string
  distanceKm: number
  targetSec: number
}

const MILESTONES: Milestone[] = [
  { label: '5K < 30min', distanceKm: 5, targetSec: 1800 },
  { label: '5K < 25min', distanceKm: 5, targetSec: 1500 },
  { label: '10K < 60min', distanceKm: 10, targetSec: 3600 },
  { label: '10K < 50min', distanceKm: 10, targetSec: 3000 },
  { label: 'Half < 2h', distanceKm: 21.1, targetSec: 7200 },
]

export default function RunningPage() {
  const [date, setDate] = useState(todayIso())
  const [distanceStr, setDistanceStr] = useState('')
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const recentRuns = useLiveQuery(
    () => db.runningLogs.orderBy('date').reverse().limit(20).toArray(),
    [],
    []
  )

  async function handleSave() {
    const distanceKm = parseFloat(distanceStr)
    const min = parseInt(minutes) || 0
    const sec = parseInt(seconds) || 0
    const durationSec = min * 60 + sec

    if (!distanceKm || distanceKm <= 0 || durationSec <= 0) return

    setSaving(true)
    try {
      const entry: Omit<RunningLog, 'id'> = {
        date,
        distanceKm,
        durationSec,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
      }
      await db.runningLogs.add(entry)
      syncRunningLogToFirebase(entry as RunningLog)

      await upsertTodaySession({
        type: 'running',
        label: `${distanceKm}km run`,
        plannedSec: durationSec,
        actualSec: durationSec,
        exerciseIds: [],
        date,
      })

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      setDistanceStr('')
      setMinutes('')
      setSeconds('')
      setNotes('')
    } catch (err) {
      console.error('Failed to save run:', err)
    } finally {
      setSaving(false)
    }
  }

  const bestByDistance = new Map<number, RunningLog>()
  for (const run of recentRuns) {
    for (const m of MILESTONES) {
      if (run.distanceKm >= m.distanceKm) {
        const existing = bestByDistance.get(m.distanceKm)
        if (!existing || run.durationSec < existing.durationSec) {
          bestByDistance.set(m.distanceKm, run)
        }
      }
    }
  }

  return (
    <div className="space-y-4 pb-4 fade-in">
      <div>
        <p className="text-sm text-muted">Distance and endurance</p>
        <h1 className="text-2xl font-extrabold">Running</h1>
      </div>

      {/* Log a run */}
      <Card>
        <h2 className="mb-3 text-base font-bold">Log a run</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Distance (km)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={distanceStr}
              onChange={(e) => setDistanceStr(e.target.value)}
              placeholder="e.g. 5.0"
              className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Duration</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="0"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="min"
                className="flex-1 rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink"
              />
              <span className="text-muted text-sm">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                placeholder="sec"
                className="flex-1 rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel?"
              className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !distanceStr || (!minutes && !seconds)}
            className="w-full rounded-lg bg-teal/20 py-2.5 text-sm font-bold text-teal border border-teal/40 disabled:opacity-50"
          >
            {saved ? '✓ Logged!' : saving ? 'Saving…' : 'Log Run'}
          </button>
        </div>
      </Card>

      {/* Milestones */}
      <Card>
        <h2 className="mb-3 text-base font-bold">Milestones</h2>
        <div className="space-y-2">
          {MILESTONES.map((m) => {
            const best = bestByDistance.get(m.distanceKm)
            const achieved = best && best.durationSec <= m.targetSec
            return (
              <div
                key={m.label}
                className={`flex items-center justify-between rounded-lg p-2.5 ${
                  achieved ? 'bg-green/10 border border-green/30' : 'bg-card2 border border-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{achieved ? '✓' : '○'}</span>
                  <span className={`text-xs font-semibold ${achieved ? 'text-green' : 'text-ink'}`}>
                    {m.label}
                  </span>
                </div>
                {best && (
                  <span className="text-[10px] text-muted">
                    PB: {formatDuration(best.durationSec)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Recent runs */}
      {recentRuns.length > 0 && (
        <Card>
          <h2 className="mb-3 text-base font-bold">Recent runs</h2>
          <div className="space-y-2">
            {recentRuns.slice(0, 10).map((run) => (
              <div key={run.id} className="flex items-center justify-between rounded-lg bg-card2 p-2.5">
                <div>
                  <div className="text-xs font-semibold text-ink">
                    {run.distanceKm} km
                  </div>
                  <div className="text-[10px] text-muted">{run.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-ink">
                    {formatDuration(run.durationSec)}
                  </div>
                  <div className="text-[10px] text-muted">
                    {formatPace(run.durationSec, run.distanceKm)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
