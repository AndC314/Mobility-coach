import { useState, useMemo } from 'react'
import { CALISTHENICS_EXERCISES, type ExerciseCategory } from '../data/calisthenics'
import type { CalisthenicsExerciseId } from '../db/db'

interface ExercisePickerProps {
  mode: 'single' | 'multi'
  selected: CalisthenicsExerciseId[]
  onToggle: (id: CalisthenicsExerciseId) => void
}

const CATEGORIES: { id: ExerciseCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'push', label: 'Push' },
  { id: 'pull', label: 'Pull' },
  { id: 'legs', label: 'Legs' },
  { id: 'core', label: 'Core' },
]

const CATEGORY_ORDER: ExerciseCategory[] = ['push', 'pull', 'legs', 'core']

export default function ExercisePicker({ mode, selected, onToggle }: ExercisePickerProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<ExerciseCategory | 'all'>('all')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return CALISTHENICS_EXERCISES.filter((ex) => {
      const matchesCategory = activeCategory === 'all' || ex.category === activeCategory
      if (!matchesCategory) return false
      if (!query) return true
      const nameMatch = ex.name.toLowerCase().includes(query)
      const muscleMatch = ex.primaryMuscles.some((m) => m.toLowerCase().includes(query))
      return nameMatch || muscleMatch
    })
  }, [search, activeCategory])

  const isEmpty = filtered.length === 0

  // Group by category only when "All" is selected
  const grouped = useMemo(() => {
    if (activeCategory !== 'all') return null
    const map = new Map<ExerciseCategory, typeof filtered>()
    for (const cat of CATEGORY_ORDER) {
      const exercises = filtered.filter((ex) => ex.category === cat)
      if (exercises.length > 0) map.set(cat, exercises)
    }
    return map
  }, [activeCategory, filtered])

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search exercises or muscles..."
        className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-purple/40"
      />

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
                (isActive
                  ? 'border-purple/40 bg-purple/20 text-purple'
                  : 'border-border bg-card2 text-muted hover:border-border')
              }
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Exercise list */}
      {isEmpty ? (
        <p className="py-4 text-center text-sm text-muted">No exercises match your search.</p>
      ) : grouped ? (
        // Grouped by category
        <div className="flex flex-col gap-4">
          {CATEGORY_ORDER.map((cat) => {
            const exercises = grouped.get(cat)
            if (!exercises || exercises.length === 0) return null
            return (
              <div key={cat} className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {cat}
                </p>
                {exercises.map((ex) => {
                  const isSelected = selected.includes(ex.id)
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => onToggle(ex.id)}
                      className={
                        'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ' +
                        (isSelected
                          ? 'border-purple/40 bg-purple/10'
                          : 'border-transparent bg-card2 hover:border-border')
                      }
                    >
                      <span className="text-lg leading-none">{ex.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={
                            'truncate text-sm font-medium ' +
                            (isSelected ? 'text-purple' : 'text-ink')
                          }
                        >
                          {ex.name}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {ex.primaryMuscles.join(' · ')}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded border border-border bg-card px-1.5 py-0.5 text-xs text-muted">
                          {ex.type === 'hold' ? 'hold' : 'reps'}
                        </span>
                        {mode === 'multi' && isSelected && (
                          <span className="text-sm font-semibold text-purple">✓</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      ) : (
        // Flat list (specific category selected)
        <div className="flex flex-col gap-2">
          {filtered.map((ex) => {
            const isSelected = selected.includes(ex.id)
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => onToggle(ex.id)}
                className={
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ' +
                  (isSelected
                    ? 'border-purple/40 bg-purple/10'
                    : 'border-transparent bg-card2 hover:border-border')
                }
              >
                <span className="text-lg leading-none">{ex.icon}</span>
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      'truncate text-sm font-medium ' +
                      (isSelected ? 'text-purple' : 'text-ink')
                    }
                  >
                    {ex.name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {ex.primaryMuscles.join(' · ')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded border border-border bg-card px-1.5 py-0.5 text-xs text-muted">
                    {ex.type === 'hold' ? 'hold' : 'reps'}
                  </span>
                  {mode === 'multi' && isSelected && (
                    <span className="text-sm font-semibold text-purple">✓</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
