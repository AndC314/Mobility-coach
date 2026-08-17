import { useState, useCallback } from 'react'
import { Card, Tag } from '../components/Card'
import { PRESET_WORKOUTS, HIIT_FORMAT_INFO, generateBalancedHiit, type HiitWorkoutDef, type HiitFormat } from '../data/hiitWorkouts'
import { getExerciseDef } from '../data/calisthenics'
import HiitTimer from '../components/HiitTimer'

export default function HiitPage() {
  const [activeWorkout, setActiveWorkout] = useState<HiitWorkoutDef | null>(null)
  const [filterFormat, setFilterFormat] = useState<HiitFormat | 'all'>('all')
  const [generatedWorkout, setGeneratedWorkout] = useState<HiitWorkoutDef | null>(null)

  const handleGenerate = useCallback(() => {
    setGeneratedWorkout(generateBalancedHiit(3))
  }, [])

  if (activeWorkout) {
    return <HiitTimer workout={activeWorkout} onClose={() => setActiveWorkout(null)} />
  }

  const filtered = filterFormat === 'all'
    ? PRESET_WORKOUTS
    : PRESET_WORKOUTS.filter((w) => w.format === filterFormat)

  return (
    <div className="space-y-4 pb-4 fade-in">
      <div>
        <p className="text-sm text-muted">Interval training</p>
        <h1 className="text-2xl font-extrabold">HIIT Workouts</h1>
      </div>

      {/* Random Generator */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink">Random Full Body</h3>
              <p className="text-[11px] text-muted">Push → Pull → Legs → Core, 40s/20s × 3 rounds</p>
            </div>
            <button
              onClick={handleGenerate}
              className="rounded-full bg-orange/15 px-3 py-1.5 text-xs font-bold text-orange border border-orange/30"
            >
              🎲 Generate
            </button>
          </div>

          {generatedWorkout && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {generatedWorkout.exercises.map((exId, i) => {
                  const def = getExerciseDef(exId)
                  const catColors = ['#e8622a', '#2ec4b6', '#f5c842', '#a78bfa']
                  return (
                    <span
                      key={`${exId}-${i}`}
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                      style={{
                        color: catColors[i],
                        background: catColors[i] + '15',
                        borderColor: catColors[i] + '30',
                      }}
                    >
                      {def?.name ?? exId}
                    </span>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveWorkout(generatedWorkout)}
                  className="flex-1 rounded-xl bg-orange py-2.5 text-xs font-bold text-white"
                >
                  Start Workout
                </button>
                <button
                  onClick={handleGenerate}
                  className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-muted"
                >
                  Reroll
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Format Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <FilterButton active={filterFormat === 'all'} onClick={() => setFilterFormat('all')}>
          All
        </FilterButton>
        {(Object.keys(HIIT_FORMAT_INFO) as HiitFormat[]).map((f) => (
          <FilterButton key={f} active={filterFormat === f} onClick={() => setFilterFormat(f)}>
            {HIIT_FORMAT_INFO[f].icon} {HIIT_FORMAT_INFO[f].label}
          </FilterButton>
        ))}
      </div>

      {/* Preset Workouts */}
      <div className="space-y-3">
        {filtered.map((w) => (
          <button
            key={w.id}
            onClick={() => setActiveWorkout(w)}
            className="w-full text-left"
          >
            <Card>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-ink">{w.name}</span>
                    <Tag color={formatColor(w.format)}>{HIIT_FORMAT_INFO[w.format].label}</Tag>
                  </div>
                  <p className="text-[11px] text-muted mb-2">{w.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {w.exercises.map((exId) => {
                      const def = getExerciseDef(exId)
                      return (
                        <span key={exId} className="rounded-full bg-card2 px-2 py-0.5 text-[10px] text-muted border border-border">
                          {def?.name ?? exId}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <div className="flex-shrink-0 ml-3 text-right">
                  <div className="text-lg font-black text-ink">{formatDuration(w)}</div>
                  <div className="text-[10px] text-muted">{w.rounds} {w.format === 'amrap' ? 'min' : 'rounds'}</div>
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
        active
          ? 'bg-orange/20 text-orange border border-orange/40'
          : 'bg-card text-muted border border-border'
      }`}
    >
      {children}
    </button>
  )
}

function formatColor(format: HiitFormat): string {
  switch (format) {
    case 'tabata': return '#e8622a'
    case 'emom': return '#2ec4b6'
    case 'amrap': return '#f5c842'
  }
}

function formatDuration(w: HiitWorkoutDef): string {
  if (w.format === 'amrap') {
    return `${Math.round(w.workSec / 60)}m`
  }
  const total = (w.workSec + w.restSec) * w.rounds
  return `${Math.round(total / 60)}m`
}
