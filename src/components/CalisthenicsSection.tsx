import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card, Tag } from './Card'
import BodyMap from './BodyMap'
import { CALISTHENICS_EXERCISES } from '../data/calisthenics'
import { MUSCLE_LABELS, computeMuscleScores } from '../data/muscleMap'
import { useCalisthenics, useCalisthenicsLogs, logCalisthenicsBase } from '../hooks/useCalisthenics'
import { db } from '../db/db'
import { todayIso } from '../lib/date'
import type { CalisthenicsExerciseId } from '../db/db'

type Tab = 'log' | 'bulk' | 'muscle_map'

const TABS: { id: Tab; label: string }[] = [
  { id: 'log', label: '📋 Log' },
  { id: 'bulk', label: '📦 Bulk' },
  { id: 'muscle_map', label: '💪 Muscle Map' },
]

export default function CalisthenicsSection() {
  const [tab, setTab] = useState<Tab>('log')

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
      {tab === 'bulk' && <BulkTab />}
      {tab === 'muscle_map' && <MuscleMapTab />}
    </div>
  )
}

// ─── LOG TAB ─────────────────────────────────────────────────────────────

function LogTab() {
  const [selected, setSelected] = useState<CalisthenicsExerciseId>('pushups')
  const exercise = CALISTHENICS_EXERCISES.find((e) => e.id === selected)!
  const logs = useCalisthenicsLogs(selected)
  const { logCalisthenics, updateCalisthenics } = useCalisthenics()

  const [value, setValue] = useState('')
  const [sets, setSets] = useState('')
  const [date, setDate] = useState(todayIso())
  const [saved, setSaved] = useState(false)

  // Edit modal state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editExerciseId, setEditExerciseId] = useState<CalisthenicsExerciseId | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editDate, setEditDate] = useState(todayIso())

  const best = logs && logs.length > 0 ? Math.max(...logs.map((l) => l.value)) : undefined
  const recent = (logs ?? []).slice().reverse().slice(0, 6)

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
        <h2 className="mb-1 text-base font-bold">Fundamentals</h2>
        <p className="mb-3 text-xs text-muted">
          Track your foundational calisthenics movements. Best values feed your Skill Tree, and reps drive the Muscle Map.
        </p>

        <div className="grid grid-cols-4 gap-2">
          {CALISTHENICS_EXERCISES.map((ex) => (
            <button
              key={ex.id}
              onClick={() => { setSelected(ex.id); setValue(''); setSets('') }}
              className={`flex flex-col items-center gap-1 rounded-xl py-3 transition-colors ${
                selected === ex.id
                  ? 'bg-purple/15 border border-purple/40'
                  : 'bg-card2 border border-border'
              }`}
            >
              <span className="text-xl">{ex.icon}</span>
              <span className={`text-[10px] font-semibold text-center leading-tight ${
                selected === ex.id ? 'text-purple' : 'text-muted'
              }`}>
                {ex.name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-bold">
            {exercise.icon} {exercise.name}
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
                  Value ({CALISTHENICS_EXERCISES.find(e => e.id === editExerciseId)?.metric === 'reps' ? 'reps' : 'seconds'})
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

const EXERCISE_CATEGORIES: { id: string; label: string; ids: CalisthenicsExerciseId[] }[] = [
  {
    id: 'push',
    label: 'Push',
    ids: ['pushups', 'dips', 'pike_pushups', 'archer_pushups', 'hindu_pushups', 'planche_leans'],
  },
  {
    id: 'pull',
    label: 'Pull',
    ids: ['pullups', 'australian_pullups', 'ring_rows', 'scapular_pullups', 'hanging_knee_to_chest'],
  },
  {
    id: 'core',
    label: 'Core',
    ids: ['plank', 'hollow_body', 'hollow_body_hold', 'tuck_lsit', 'lsit', 'gymnastics_bridge'],
  },
  {
    id: 'legs',
    label: 'Legs',
    ids: ['squats', 'bulgarian_squat', 'pistol_squat', 'pistol_squats'],
  },
]

interface BulkEntry {
  id: CalisthenicsExerciseId
  value: number
  sets: number
  restSec: number
}

function BulkTab() {
  const [selected, setSelected] = useState<BulkEntry[]>([])
  const [view, setView] = useState<'picker' | 'config'>('picker')
  const [date, setDate] = useState(todayIso())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggleExercise(id: CalisthenicsExerciseId) {
    if (selected.some((s) => s.id === id)) {
      setSelected(selected.filter((s) => s.id !== id))
    } else {
      const ex = CALISTHENICS_EXERCISES.find((e) => e.id === id)!
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
        const ex = CALISTHENICS_EXERCISES.find((e) => e.id === entry.id)!
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
                  const ex = CALISTHENICS_EXERCISES.find((e) => e.id === entry.id)!
                  const isHold = ex.metric === 'hold_sec'
                  return (
                    <div key={entry.id} className="rounded-lg bg-card2 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-ink">
                          {ex.icon} {ex.name}
                        </span>
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
      {EXERCISE_CATEGORIES.map((cat) => {
        const exercises = cat.ids
          .map((id) => CALISTHENICS_EXERCISES.find((e) => e.id === id))
          .filter(Boolean) as typeof CALISTHENICS_EXERCISES
        if (exercises.length === 0) return null
        return (
          <div key={cat.id}>
            <h2 className="mb-2 text-sm font-bold text-muted">{cat.label}</h2>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {exercises.map((ex) => {
                const isSelected = selected.some((s) => s.id === ex.id)
                return (
                  <button
                    key={ex.id}
                    onClick={() => toggleExercise(ex.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors ${
                      isSelected
                        ? 'bg-purple/20 border border-purple/50'
                        : 'bg-card2 border border-border'
                    }`}
                  >
                    <span className="text-2xl">{ex.icon}</span>
                    <span className={`text-[10px] font-semibold text-center leading-tight ${
                      isSelected ? 'text-purple' : 'text-muted'
                    }`}>
                      {ex.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {selected.length > 0 && (
        <Card>
          <h2 className="mb-3 text-base font-bold">Your session ({selected.length} exercises)</h2>
          <div className="space-y-1.5 mb-4">
            {selected.map((entry) => {
              const ex = CALISTHENICS_EXERCISES.find((e) => e.id === entry.id)!
              return (
                <div key={entry.id} className="flex items-center justify-between rounded-lg bg-card2 px-3 py-2">
                  <span className="text-sm text-ink">{ex.icon} {ex.name}</span>
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

// ─── MUSCLE MAP TAB ───────────────────────────────────────────────────────

function MuscleMapTab() {
  const today = todayIso()
  const allLogs = useLiveQuery(async () => {
    const [ty, tm, td] = today.split('-').map(Number)
    const yesterday = new Date(ty, tm - 1, td - 1)
    const ys = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    return db.calisthenicsLogs.where('date').aboveOrEqual(ys).toArray()
  }, [today], [])

  const scores = computeMuscleScores(allLogs ?? [], today)
  const sorted = [...scores].sort((a, b) => a.score - b.score)
  const untrained = sorted.filter((s) => s.score === 0)
  const undertrained = sorted.filter((s) => s.score > 0 && s.score < 40)
  const loaded = sorted.filter((s) => s.score >= 40).reverse()

  return (
    <>
      <Card>
        <h2 className="mb-1 text-base font-bold">Muscle load — last 48h</h2>
        <p className="mb-3 text-xs text-muted">
          Based on logged reps/hold seconds. 45+ reps = 100% load for that muscle group.
          Colour: red = heavy load, gold = moderate, grey = not yet trained.
        </p>
        <BodyMap scores={scores} />
      </Card>

      {untrained.length > 0 && (
        <Card className="border-teal/30">
          <h2 className="mb-2 text-sm font-bold text-teal">{'→'} Suggested next</h2>
          <p className="mb-2 text-xs text-muted">
            These muscle groups haven't been trained in the last 48 hours:
          </p>
          <div className="flex flex-wrap gap-2">
            {untrained.map((s) => (
              <span key={s.muscle} className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal border border-teal/30">
                {MUSCLE_LABELS[s.muscle]}
              </span>
            ))}
          </div>
        </Card>
      )}

      {undertrained.length > 0 && (
        <Card className="border-gold/30">
          <h2 className="mb-2 text-sm font-bold text-gold">{'↑'} Light so far</h2>
          <div className="space-y-1.5">
            {undertrained.map((s) => (
              <div key={s.muscle} className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${s.score}%` }} />
                </div>
                <span className="w-28 text-right text-xs text-muted">{MUSCLE_LABELS[s.muscle]}</span>
                <span className="w-8 text-right text-xs font-bold text-gold">{s.score}%</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loaded.length > 0 && (
        <Card>
          <h2 className="mb-2 text-sm font-bold text-ink">{'✓'} Well trained</h2>
          <div className="space-y-1.5">
            {loaded.map((s) => (
              <div key={s.muscle} className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${s.score}%`,
                      background: s.score >= 80 ? '#d9472b' : '#f5c842'
                    }}
                  />
                </div>
                <span className="w-28 text-right text-xs text-muted">{MUSCLE_LABELS[s.muscle]}</span>
                <span className="w-8 text-right text-xs font-bold text-ink">{s.score}%</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(allLogs ?? []).length === 0 && (
        <Card>
          <p className="py-4 text-center text-sm text-muted">
            Log some calisthenics in the Log tab to see your muscle map fill in.
          </p>
        </Card>
      )}
    </>
  )
}
