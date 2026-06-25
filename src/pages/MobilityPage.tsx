import { useState } from 'react'
import { Card } from '../components/Card'
import { MOBILITY_EXERCISES, type MobilityExerciseId } from '../data/mobilityExercises'
import { upsertTodaySession } from '../hooks/useSessions'
import { todayIso } from '../lib/date'

interface SelectedExercise {
  id: MobilityExerciseId
  holdSec: number
  sets: number
  restSec: number
}

export default function MobilityPage() {
  const [selected, setSelected] = useState<SelectedExercise[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [date, setDate] = useState(todayIso())
  const [view, setView] = useState<'picker' | 'config'>('picker')

  function toggleExercise(id: MobilityExerciseId) {
    if (selected.some((s) => s.id === id)) {
      setSelected(selected.filter((s) => s.id !== id))
    } else {
      const exercise = MOBILITY_EXERCISES.find((e) => e.id === id)!
      setSelected([
        ...selected,
        {
          id,
          holdSec: exercise.defaultHoldSec,
          sets: 1,
          restSec: 30
        }
      ])
    }
  }

  function updateExercise(
    id: MobilityExerciseId,
    updates: Partial<SelectedExercise>
  ) {
    setSelected(
      selected.map((s) => (s.id === id ? { ...s, ...updates } : s))
    )
  }

  function removeExercise(id: MobilityExerciseId) {
    setSelected(selected.filter((s) => s.id !== id))
  }

  // Calculate total time
  const totalSec = selected.reduce((sum, s) => {
    const holdTime = s.holdSec * s.sets
    const restTime = s.restSec * Math.max(0, s.sets - 1)
    return sum + holdTime + restTime
  }, 0)

  async function handleLogBulk() {
    if (selected.length === 0) return

    setSaving(true)
    try {
      const exerciseNames = selected
        .map((s) => MOBILITY_EXERCISES.find((e) => e.id === s.id)?.name)
        .join(' + ')

      await upsertTodaySession({
        type: 'custom',
        label: `Mobility: ${exerciseNames}`,
        plannedSec: totalSec,
        actualSec: totalSec,
        exerciseIds: selected.map((s) => s.id)
      })

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

  const categories = ['hip', 'spine', 'shoulder', 'full_body'] as const

  return (
    <div className="space-y-4 pb-4 fade-in">
      <div>
        <p className="text-sm text-muted">Flexibility and joint mobility</p>
        <h1 className="text-2xl font-extrabold">Mobility</h1>
      </div>

      {view === 'picker' ? (
        <>
          {/* Exercise picker grid */}
          {categories.map((category) => {
            const categoryName = {
              hip: 'Hip Mobility',
              spine: 'Spine Mobility',
              shoulder: 'Shoulder Mobility',
              full_body: 'Full Body'
            }[category]

            const exercises = MOBILITY_EXERCISES.filter((e) => e.category === category)

            return (
              <div key={category}>
                <h2 className="mb-2 text-sm font-bold text-muted">{categoryName}</h2>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {exercises.map((ex) => {
                    const isSelected = selected.some((s) => s.id === ex.id)
                    return (
                      <button
                        key={ex.id}
                        onClick={() => toggleExercise(ex.id)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors ${
                          isSelected
                            ? 'bg-teal/20 border border-teal/50'
                            : 'bg-card2 border border-border hover:bg-card2/80'
                        }`}
                      >
                        <span className="text-2xl">{ex.icon}</span>
                        <span className={`text-[10px] font-semibold text-center leading-tight ${
                          isSelected ? 'text-teal' : 'text-muted'
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

          {/* Selected exercises summary */}
          {selected.length > 0 && (
            <Card>
              <h2 className="mb-3 text-base font-bold">Your session ({selected.length} exercises)</h2>
              <div className="space-y-2 mb-4">
                {selected.map((sel) => {
                  const ex = MOBILITY_EXERCISES.find((e) => e.id === sel.id)!
                  const exerciseTime = sel.holdSec * sel.sets
                  const restTime = sel.restSec * Math.max(0, sel.sets - 1)
                  const totalExerciseTime = exerciseTime + restTime

                  return (
                    <div key={sel.id} className="flex items-center justify-between rounded-lg bg-card2 p-3">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-ink">{ex.name}</div>
                        <div className="text-xs text-muted">
                          {sel.sets} × {sel.holdSec}s
                          {sel.restSec > 0 ? ` + ${sel.restSec}s rest` : ''}
                          {' = '}
                          {Math.floor(totalExerciseTime / 60)}m {totalExerciseTime % 60}s
                        </div>
                      </div>
                      <button
                        onClick={() => removeExercise(sel.id)}
                        className="ml-2 text-xs text-muted hover:text-red"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-border pt-3 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Total session time:</span>
                  <span className="font-bold text-ink">
                    {Math.floor(totalSec / 60)}m {totalSec % 60}s
                  </span>
                </div>
              </div>

              <button
                onClick={() => setView('config')}
                className="w-full rounded-lg bg-teal/20 py-2.5 text-sm font-bold text-teal border border-teal/40"
              >
                Configure & Log Session
              </button>
            </Card>
          )}
        </>
      ) : (
        <>
          {/* Configuration view */}
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
                  {selected.map((sel) => {
                    const ex = MOBILITY_EXERCISES.find((e) => e.id === sel.id)!
                    return (
                      <div key={sel.id} className="rounded-lg bg-card2 p-3">
                        <div className="mb-2 text-sm font-semibold text-ink">{ex.name}</div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <label className="block text-muted mb-1">Hold (sec)</label>
                            <input
                              type="number"
                              min="5"
                              max={ex.maxHoldSec}
                              value={sel.holdSec}
                              onChange={(e) =>
                                updateExercise(sel.id, { holdSec: Number(e.target.value) })
                              }
                              className="w-full rounded border border-border bg-card px-2 py-1 text-ink"
                            />
                          </div>
                          <div>
                            <label className="block text-muted mb-1">Sets</label>
                            <input
                              type="number"
                              min="1"
                              max="5"
                              value={sel.sets}
                              onChange={(e) => updateExercise(sel.id, { sets: Number(e.target.value) })}
                              className="w-full rounded border border-border bg-card px-2 py-1 text-ink"
                            />
                          </div>
                          <div>
                            <label className="block text-muted mb-1">Rest (sec)</label>
                            <input
                              type="number"
                              min="0"
                              max="120"
                              value={sel.restSec}
                              onChange={(e) =>
                                updateExercise(sel.id, { restSec: Number(e.target.value) })
                              }
                              className="w-full rounded border border-border bg-card px-2 py-1 text-ink"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-muted">Total session time:</span>
                  <span className="font-bold text-ink">
                    {Math.floor(totalSec / 60)}m {totalSec % 60}s
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setView('picker')}
                    className="flex-1 rounded-lg bg-card2 py-2.5 text-sm font-bold text-muted border border-border"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleLogBulk}
                    disabled={saving}
                    className="flex-1 rounded-lg bg-teal/20 py-2.5 text-sm font-bold text-teal border border-teal/40 disabled:opacity-50"
                  >
                    {saved ? '✓ Logged' : saving ? 'Saving…' : 'Log Session'}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
