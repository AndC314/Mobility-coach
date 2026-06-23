import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card, Tag } from './Card'
import BodyMap from './BodyMap'
import { CALISTHENICS_EXERCISES } from '../data/calisthenics'
import { MUSCLE_LABELS, computeMuscleScores } from '../data/muscleMap'
import { useCalisthenics, useCalisthenicsLogs } from '../hooks/useCalisthenics'
import { db } from '../db/db'
import { todayIso } from '../lib/date'
import type { CalisthenicsExerciseId } from '../db/db'

type Tab = 'log' | 'muscle_map'

export default function CalisthenicsSection() {
  const [tab, setTab] = useState<Tab>('log')

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {(['log', 'muscle_map'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-colors ${
              tab === t
                ? 'bg-purple/20 text-purple border border-purple/40'
                : 'bg-card text-muted border border-border'
            }`}
          >
            {t === 'log' ? '📋 Log' : '💪 Muscle Map'}
          </button>
        ))}
      </div>

      {tab === 'log' && <LogTab />}
      {tab === 'muscle_map' && <MuscleMapTab />}
    </div>
  )
}

// ─── LOG TAB ─────────────────────────────────────────────────────────────

function LogTab() {
  const [selected, setSelected] = useState<CalisthenicsExerciseId>('pushups')
  const exercise = CALISTHENICS_EXERCISES.find((e) => e.id === selected)!
  const logs = useCalisthenicsLogs(selected)
  const { logCalisthenics } = useCalisthenics()

  const [value, setValue] = useState('')
  const [sets, setSets] = useState('')
  const [date, setDate] = useState(todayIso())
  const [saved, setSaved] = useState(false)

  const best = logs && logs.length > 0 ? Math.max(...logs.map((l) => l.value)) : undefined
  const recent = (logs ?? []).slice().reverse().slice(0, 6)

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
              <div key={log.id} className="flex items-center justify-between rounded-lg bg-card2 px-3 py-2">
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
            ))}
          </div>
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
