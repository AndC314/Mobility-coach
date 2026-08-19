import { useState } from 'react'
import { Card } from '../components/Card'
import { MOBILITY_EXERCISES, type MobilityExerciseId } from '../data/mobilityExercises'
import { upsertTodaySession } from '../hooks/useSessions'
import { todayIso } from '../lib/date'
import { useWakeLock } from '../hooks/useWakeLock'
import TodayMobilityCard from '../components/TodayMobilityCard'
import type { MobilitySessionExercise } from '../lib/mobilitySession'

function ExerciseThumb({ id, icon, className }: { id: string; icon: string; className?: string }) {
  const [src, setSrc] = useState<'sprite' | 'legacy' | 'emoji'>('sprite')
  return (
    <div className={`flex items-center justify-center bg-card ${className ?? ''}`}>
      {src === 'sprite' ? (
        <img
          src={`/sprites/exercises/${id}.png`}
          alt=""
          className="h-12 w-12 object-contain"
          style={{ imageRendering: 'pixelated' }}
          onError={() => setSrc('legacy')}
        />
      ) : src === 'legacy' ? (
        <img
          src={`/exercises/${id}.png`}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setSrc('emoji')}
        />
      ) : (
        <span className="text-2xl">{icon}</span>
      )}
    </div>
  )
}

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

  useWakeLock(selected.length > 0)
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
        type: 'hip_mobility',
        label: `Mobility: ${exerciseNames}`,
        plannedSec: totalSec,
        actualSec: totalSec,
        exerciseIds: selected.map((s) => s.id),
        date
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

  function handleStartMobilitySession(exercises: MobilitySessionExercise[]) {
    const newSelected: SelectedExercise[] = exercises.map((ex) => ({
      id: ex.id as MobilityExerciseId,
      holdSec: ex.holdSec,
      sets: ex.sets,
      restSec: 30,
    }))
    setSelected(newSelected)
  }

  const categories = ['hip', 'spine', 'shoulder', 'full_body'] as const
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['hip']))

  function toggleSection(cat: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  return (
    <div className="space-y-4 pb-4 fade-in">
      <div>
        <p className="text-sm text-muted">Flexibility and joint mobility</p>
        <h1 className="text-2xl font-extrabold">Mobility</h1>
      </div>

      <TodayMobilityCard onStartSession={handleStartMobilitySession} />

      {view === 'picker' ? (
        <>
          {/* Exercise picker grid — collapsible sections */}
          {categories.map((category) => {
            const categoryName = {
              hip: 'Hip Mobility',
              spine: 'Spine & Thoracic',
              shoulder: 'Shoulder Mobility',
              full_body: 'Full Body'
            }[category]

            const exercises = MOBILITY_EXERCISES.filter((e) => e.category === category)
            const selectedInCategory = exercises.filter((e) => selected.some((s) => s.id === e.id)).length
            const isOpen = openSections.has(category)

            return (
              <div key={category}>
                <button
                  onClick={() => toggleSection(category)}
                  className="mb-2 flex w-full items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-ink">{categoryName}</h2>
                    {selectedInCategory > 0 && (
                      <span className="text-[10px] font-bold bg-teal/20 text-teal rounded-full px-1.5 py-0.5">
                        {selectedInCategory}
                      </span>
                    )}
                  </div>
                  <svg
                    width="12" height="12" viewBox="0 0 12 12"
                    className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {exercises.map((ex) => {
                      const isSelected = selected.some((s) => s.id === ex.id)
                      return (
                        <button
                          key={ex.id}
                          onClick={() => toggleExercise(ex.id)}
                          className={`flex flex-col items-center gap-1.5 rounded-xl p-2 transition-colors ${
                            isSelected
                              ? 'bg-teal/20 border border-teal/50'
                              : 'bg-card2 border border-border hover:bg-card2/80'
                          }`}
                        >
                          <ExerciseThumb id={ex.id} icon={ex.icon} className="h-14 w-full rounded-lg overflow-hidden" />
                          <span className={`text-[10px] font-semibold text-center leading-tight ${
                            isSelected ? 'text-teal' : 'text-muted'
                          }`}>
                            {ex.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Selected exercises with inline duration controls */}
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
                    <div key={sel.id} className="rounded-lg bg-card2 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ExerciseThumb id={sel.id} icon={ex.icon} className="h-8 w-8 flex-shrink-0 rounded overflow-hidden" />
                          <div>
                            <div className="text-xs font-semibold text-ink">{ex.name}</div>
                            <div className="text-[10px] text-muted">
                              {Math.floor(totalExerciseTime / 60)}m {totalExerciseTime % 60}s
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeExercise(sel.id)}
                          className="text-xs text-muted hover:text-red"
                        >
                          ✕
                        </button>
                      </div>
                      {/* Inline duration controls */}
                      <div className="flex items-center gap-3 text-[10px]">
                        <div className="flex items-center gap-1">
                          <span className="text-muted">Hold</span>
                          <button
                            onClick={() => updateExercise(sel.id, { holdSec: Math.max(5, sel.holdSec - 15) })}
                            className="w-5 h-5 rounded bg-border text-ink font-bold flex items-center justify-center"
                          >−</button>
                          <span className="w-7 text-center font-semibold text-ink">{sel.holdSec}s</span>
                          <button
                            onClick={() => updateExercise(sel.id, { holdSec: Math.min(ex.maxHoldSec, sel.holdSec + 15) })}
                            className="w-5 h-5 rounded bg-border text-ink font-bold flex items-center justify-center"
                          >+</button>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted">Sets</span>
                          <button
                            onClick={() => updateExercise(sel.id, { sets: Math.max(1, sel.sets - 1) })}
                            className="w-5 h-5 rounded bg-border text-ink font-bold flex items-center justify-center"
                          >−</button>
                          <span className="w-4 text-center font-semibold text-ink">{sel.sets}</span>
                          <button
                            onClick={() => updateExercise(sel.id, { sets: Math.min(5, sel.sets + 1) })}
                            className="w-5 h-5 rounded bg-border text-ink font-bold flex items-center justify-center"
                          >+</button>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted">Rest</span>
                          <button
                            onClick={() => updateExercise(sel.id, { restSec: Math.max(0, sel.restSec - 10) })}
                            className="w-5 h-5 rounded bg-border text-ink font-bold flex items-center justify-center"
                          >−</button>
                          <span className="w-7 text-center font-semibold text-ink">{sel.restSec}s</span>
                          <button
                            onClick={() => updateExercise(sel.id, { restSec: Math.min(120, sel.restSec + 10) })}
                            className="w-5 h-5 rounded bg-border text-ink font-bold flex items-center justify-center"
                          >+</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-border pt-3 mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-muted">Total: </span>
                    <span className="text-sm font-bold text-ink">
                      {Math.floor(totalSec / 60)}m {totalSec % 60}s
                    </span>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted mr-1.5">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="rounded border border-border bg-card2 px-2 py-1 text-xs text-ink"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogBulk}
                disabled={saving}
                className="w-full rounded-lg bg-teal/20 py-2.5 text-sm font-bold text-teal border border-teal/40 disabled:opacity-50"
              >
                {saved ? '✓ Logged!' : saving ? 'Saving…' : 'Log Session'}
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
                        <div className="mb-2 flex items-center gap-2">
                          <ExerciseThumb id={sel.id} icon={ex.icon} className="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden" />
                          <span className="text-sm font-semibold text-ink">{ex.name}</span>
                        </div>
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
