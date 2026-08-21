import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card, Tag } from './Card'
import ExercisePicker from './ExercisePicker'
import ExerciseIcon from './ExerciseIcon'
import { CALISTHENICS_EXERCISES, getExerciseDef } from '../data/calisthenics'
import { useCalisthenics, useCalisthenicsLogs, logCalisthenicsBase } from '../hooks/useCalisthenics'
import { useWakeLock } from '../hooks/useWakeLock'
import { db } from '../db/db'
import { todayIso } from '../lib/date'
import type { CalisthenicsExerciseId } from '../db/db'

export interface BulkPrefill {
  exercises: { id: string; value: number; sets: number }[]
}

type Tab = 'log' | 'bulk'

const TABS: { id: Tab; label: string }[] = [
  { id: 'log', label: '📋 Log' },
  { id: 'bulk', label: '📦 Bulk' },
]

interface CalisthenicsSectionProps {
  prefill?: BulkPrefill | null
  onPrefillConsumed?: () => void
}

export default function CalisthenicsSection({ prefill, onPrefillConsumed }: CalisthenicsSectionProps) {
  const [tab, setTab] = useState<Tab>('log')

  useEffect(() => {
    if (prefill) {
      setTab('bulk')
    }
  }, [prefill])

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'bg-purple/20 text-purple border border-purple/40'
                : 'bg-card text-muted border border-border'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'log' && <LogTab />}
      {tab === 'bulk' && <BulkTab prefill={prefill} onPrefillConsumed={onPrefillConsumed} />}
    </div>
  )
}

// ─── LOG TAB ─────────────────────────────────────────────────────────────

function LogTab() {
  const [selected, setSelected] = useState<CalisthenicsExerciseId>('pushups')
  const exercise = getExerciseDef(selected)!
  const logs = useCalisthenicsLogs(selected)
  const { logCalisthenics, updateCalisthenics } = useCalisthenics()

  const [value, setValue] = useState('')
  const [sets, setSets] = useState('')
  const [date, setDate] = useState(todayIso())
  const [saved, setSaved] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(true)

  // Edit modal state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editExerciseId, setEditExerciseId] = useState<CalisthenicsExerciseId | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editDate, setEditDate] = useState(todayIso())

  const best = logs && logs.length > 0 ? Math.max(...logs.map((l) => l.value)) : undefined
  const recent = (logs ?? []).slice().reverse().slice(0, 6)

  function handleToggle(id: CalisthenicsExerciseId) {
    setSelected(id)
    setValue('')
    setSets('')
    setPickerOpen(false)
  }

  function openEdit(log: any) {
    setEditingId(log.id)
    setEditExerciseId(log.exerciseId)
    setEditValue(String(log.value))
    setEditDate(log.date)
  }

  function closeEdit() {
    setEditingId(null)
    setEditExerciseId(null)
    setEditValue('')
    setEditDate(todayIso())
  }

  async function handleUpdateLog() {
    if (!editingId || !editExerciseId) return
    await updateCalisthenics(editingId, {
      exerciseId: editExerciseId,
      value: Number(editValue),
      date: editDate,
    })
    closeEdit()
  }

  async function handleSave() {
    const v = Number(value)
    if (!v || v <= 0) return
    await logCalisthenics({
      exerciseId: selected,
      metric: exercise.metric,
      value: v,
      sets: sets ? Number(sets) : undefined,
      date,
    })
    setValue('')
    setSets('')
    setDate(todayIso())
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <>
      <Card>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="flex w-full items-center justify-between"
        >
          <h2 className="text-base font-bold">
            {pickerOpen ? 'Select Exercise' : <><ExerciseIcon exerciseId={exercise.id} fallbackEmoji={exercise.icon} size="sm" /> {exercise.name}</>}
          </h2>
          <span className="text-xs text-muted">{pickerOpen ? '▲ collapse' : '▼ change'}</span>
        </button>
        {pickerOpen && (
          <div className="mt-2">
            <ExercisePicker mode="single" selected={[selected]} onToggle={handleToggle} />
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-base font-bold">
            <ExerciseIcon exerciseId={exercise.id} fallbackEmoji={exercise.icon} size="md" /> {exercise.name}
          </h2>
          {best != null && (
            <Tag color="#a78bfa">Best: {best}{exercise.unit}</Tag>
          )}
        </div>
        <p className="mb-3 text-xs text-muted">{exercise.description}</p>
        {exercise.equipmentNote && (
          <p className="mb-3 text-[11px] font-semibold text-gold">{'⚠'} {exercise.equipmentNote}</p>
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-muted">
              {exercise.metric === 'hold_sec' ? 'Hold time (sec)' : 'Reps'}
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={exercise.metric === 'hold_sec' ? 'e.g. 45' : 'e.g. 12'}
              className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink placeholder:text-muted"
            />
          </div>
          <div className="w-20">
            <label className="mb-1 block text-xs font-semibold text-muted">Sets</label>
            <input
              type="number"
              inputMode="numeric"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              placeholder="opt."
              className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink placeholder:text-muted"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Date (optional)</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink"
          />
        </div>

        <button
          onClick={handleSave}
          className="mt-3 w-full rounded-full bg-purple/15 py-3 text-sm font-bold text-purple border border-purple/40"
        >
          {saved ? '✓ Logged' : 'Log entry'}
        </button>
      </Card>

      {recent.length > 0 && (
        <Card>
          <h2 className="mb-3 text-base font-bold">Recent</h2>
          <div className="space-y-2">
            {recent.map((log) => (
              <button
                key={log.id}
                onClick={() => openEdit(log)}
                className="w-full text-left rounded-lg bg-card2 p-3 transition-colors hover:bg-card2/80"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">
                    {new Date(log.date + 'T12:00:00').toLocaleDateString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric'
                    })}
                  </span>
                  <span className="text-sm font-bold text-ink">
                    {log.value}{exercise.unit}
                    {log.sets ? ` × ${log.sets} sets` : ''}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {editingId && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="w-full rounded-t-2xl bg-card p-4 pb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold">Edit log</h3>
              <button onClick={closeEdit} className="text-muted">✕</button>
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">Exercise</label>
                <select
                  value={editExerciseId || ''}
                  onChange={(e) => setEditExerciseId(e.target.value as CalisthenicsExerciseId)}
                  className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink"
                >
                  {CALISTHENICS_EXERCISES.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">
                  Value ({getExerciseDef(editExerciseId as CalisthenicsExerciseId)?.metric === 'reps' ? 'reps' : 'seconds'})
                </label>
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink"
                />
              </div>
              <button
                onClick={handleUpdateLog}
                className="w-full rounded-full bg-accent/20 py-2.5 text-sm font-bold text-accent border border-accent/40"
              >
                Update log
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── BULK TAB ─────────────────────────────────────────────────────────────

interface BulkEntry {
  id: CalisthenicsExerciseId
  value: number
  sets: number
  restSec: number
}

function BulkTab({ prefill, onPrefillConsumed }: { prefill?: BulkPrefill | null; onPrefillConsumed?: () => void }) {
  const [selected, setSelected] = useState<BulkEntry[]>([])
  const [view, setView] = useState<'picker' | 'config'>('picker')
  const [date, setDate] = useState(todayIso())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useWakeLock(selected.length > 0)

  useEffect(() => {
    if (prefill && prefill.exercises.length > 0) {
      const entries: BulkEntry[] = prefill.exercises.map((e) => ({
        id: e.id as CalisthenicsExerciseId,
        value: e.value,
        sets: e.sets,
        restSec: 60,
      }))
      setSelected(entries)
      setView('config')
      onPrefillConsumed?.()
    }
  }, [prefill])

  function toggleExercise(id: CalisthenicsExerciseId) {
    if (selected.some((s) => s.id === id)) {
      setSelected(selected.filter((s) => s.id !== id))
    } else {
      const ex = getExerciseDef(id)!
      setSelected([...selected, { id, value: ex.metric === 'hold_sec' ? 30 : 10, sets: 3, restSec: 60 }])
    }
  }

  function update(id: CalisthenicsExerciseId, patch: Partial<BulkEntry>) {
    setSelected(selected.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function remove(id: CalisthenicsExerciseId) {
    setSelected(selected.filter((s) => s.id !== id))
  }

  async function handleLogBulk() {
    if (selected.length === 0) return
    setSaving(true)
    try {
      for (const entry of selected) {
        const ex = getExerciseDef(entry.id)!
        await logCalisthenicsBase({
          exerciseId: entry.id,
          metric: ex.metric,
          value: entry.value,
          sets: entry.sets,
          date,
          restSeconds: entry.restSec,
        })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      setSelected([])
      setView('picker')
    } catch (err) {
      console.error('Bulk log failed:', err)
    } finally {
      setSaving(false)
    }
  }

  if (view === 'config') {
    return (
      <>
        <Card>
          <h2 className="mb-3 text-base font-bold">Session details</h2>
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
              <label className="mb-2 block text-xs font-semibold text-muted">Adjust exercise details</label>
              <div className="space-y-2">
                {selected.map((entry) => {
                  const ex = getExerciseDef(entry.id)!
                  const isHold = ex.metric === 'hold_sec'
                  return (
                    <div key={entry.id} className="rounded-lg bg-card2 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <ExerciseIcon exerciseId={ex.id} fallbackEmoji={ex.icon} size="lg" />
                        <span className="flex-1 text-sm font-semibold text-ink">{ex.name}</span>
                        <button onClick={() => remove(entry.id)} className="text-xs text-muted hover:text-red">✕</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="block text-muted mb-1">{isHold ? 'Hold (sec)' : 'Reps'}</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            value={entry.value}
                            onChange={(e) => update(entry.id, { value: Number(e.target.value) })}
                            className="w-full rounded border border-border bg-card px-2 py-1 text-ink"
                          />
                        </div>
                        <div>
                          <label className="block text-muted mb-1">Sets</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            max="10"
                            value={entry.sets}
                            onChange={(e) => update(entry.id, { sets: Number(e.target.value) })}
                            className="w-full rounded border border-border bg-card px-2 py-1 text-ink"
                          />
                        </div>
                        <div>
                          <label className="block text-muted mb-1">Rest (sec)</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            max="300"
                            value={entry.restSec}
                            onChange={(e) => update(entry.id, { restSec: Number(e.target.value) })}
                            className="w-full rounded border border-border bg-card px-2 py-1 text-ink"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setView('picker')}
                className="flex-1 rounded-lg bg-card2 py-2.5 text-sm font-bold text-muted border border-border"
              >
                Back
              </button>
              <button
                onClick={handleLogBulk}
                disabled={saving || selected.length === 0}
                className="flex-1 rounded-lg bg-purple/20 py-2.5 text-sm font-bold text-purple border border-purple/40 disabled:opacity-50"
              >
                {saved ? '✓ Logged' : saving ? 'Saving…' : `Log ${selected.length} exercises`}
              </button>
            </div>
          </div>
        </Card>
      </>
    )
  }

  return (
    <>
      <Card>
        <h2 className="mb-1 text-base font-bold">Build Your Session</h2>
        <p className="mb-3 text-xs text-muted">Select exercises then configure sets and reps.</p>
        <ExercisePicker
          mode="multi"
          selected={selected.map((s) => s.id)}
          onToggle={toggleExercise}
        />
      </Card>

      {selected.length > 0 && (
        <Card>
          <h2 className="mb-3 text-base font-bold">Your session ({selected.length} exercises)</h2>
          <div className="space-y-1.5 mb-4">
            {selected.map((entry) => {
              const ex = getExerciseDef(entry.id)!
              return (
                <div key={entry.id} className="flex items-center justify-between rounded-lg bg-card2 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-sm text-ink"><ExerciseIcon exerciseId={ex.id} fallbackEmoji={ex.icon} size="sm" /> {ex.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">
                      {entry.sets} × {entry.value}{ex.unit}
                    </span>
                    <button onClick={() => remove(entry.id)} className="text-xs text-muted hover:text-red">✕</button>
                  </div>
                </div>
              )
            })}
          </div>
          <button
            onClick={() => setView('config')}
            className="w-full rounded-lg bg-purple/20 py-2.5 text-sm font-bold text-purple border border-purple/40"
          >
            Configure & Log Session →
          </button>
        </Card>
      )}
    </>
  )
}

