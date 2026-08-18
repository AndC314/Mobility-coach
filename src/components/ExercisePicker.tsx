import { useState, useMemo } from 'react'
import { CALISTHENICS_EXERCISES, type ExerciseCategory, type Equipment } from '../data/calisthenics'
import { customExerciseId, type CalisthenicsExerciseId, type CustomExercise } from '../db/db'
import { useExerciseFrequency } from '../hooks/useCalisthenics'
import { useCustomExercises } from '../hooks/useCustomExercises'
import { useAuth } from '../hooks/useAuth'
import { MUSCLE_LABELS, type MuscleGroup } from '../data/muscleMap'
import ExerciseIcon from './ExerciseIcon'

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

const EQUIPMENT_OPTIONS: { id: Equipment; label: string }[] = [
  { id: 'parallettes', label: 'Parallettes' },
  { id: 'parallel_bars', label: 'Parallel Bars' },
  { id: 'pull_up_bar', label: 'Pull-up Bar' },
]

const FREQUENT_THRESHOLD = 3

export default function ExercisePicker({ mode, selected, onToggle }: ExercisePickerProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<ExerciseCategory | 'all'>('all')
  const [activeEquipment, setActiveEquipment] = useState<Equipment[]>([])
  const [showCustomForm, setShowCustomForm] = useState(false)

  const frequency = useExerciseFrequency()
  const { exercises: customExercises, addCustomExercise } = useCustomExercises('calisthenics')

  function toggleEquipment(eq: Equipment) {
    setActiveEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]
    )
  }

  const allExercises = useMemo(() => {
    const builtIn = CALISTHENICS_EXERCISES.map((ex) => ({
      id: ex.id,
      name: ex.name,
      icon: ex.icon,
      type: ex.type,
      category: ex.category,
      primaryMuscles: ex.primaryMuscles,
      equipment: ex.equipment,
      isCustom: false as const,
    }))
    const custom = customExercises.map((ex) => ({
      id: ex.id as unknown as CalisthenicsExerciseId,
      name: ex.name,
      icon: ex.icon,
      type: ex.type,
      category: (ex.category ?? 'core') as ExerciseCategory,
      primaryMuscles: ex.primaryMuscles ?? [],
      equipment: undefined as Equipment[] | undefined,
      isCustom: true as const,
    }))
    return [...builtIn, ...custom]
  }, [customExercises])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return allExercises.filter((ex) => {
      const matchesCategory = activeCategory === 'all' || ex.category === activeCategory
      if (!matchesCategory) return false
      if (activeEquipment.length > 0) {
        const hasEquipment = activeEquipment.some((eq) => ex.equipment?.includes(eq))
        if (!hasEquipment) return false
      }
      if (!query) return true
      const nameMatch = ex.name.toLowerCase().includes(query)
      const muscleMatch = ex.primaryMuscles.some((m) => m.toLowerCase().includes(query))
      return nameMatch || muscleMatch
    })
  }, [search, activeCategory, activeEquipment, allExercises])

  // Split into frequent (top) and rest
  const { frequent, rest } = useMemo(() => {
    const freq: typeof filtered = []
    const other: typeof filtered = []
    for (const ex of filtered) {
      const count = frequency.get(ex.id) ?? 0
      if (count >= FREQUENT_THRESHOLD) {
        freq.push(ex)
      } else {
        other.push(ex)
      }
    }
    freq.sort((a, b) => (frequency.get(b.id) ?? 0) - (frequency.get(a.id) ?? 0))
    return { frequent: freq, rest: other }
  }, [filtered, frequency])

  const isEmpty = filtered.length === 0

  // Group "rest" by category when "All" is selected
  const groupedRest = useMemo(() => {
    if (activeCategory !== 'all') return null
    const map = new Map<ExerciseCategory, typeof rest>()
    for (const cat of CATEGORY_ORDER) {
      const exercises = rest.filter((ex) => ex.category === cat)
      if (exercises.length > 0) map.set(cat, exercises)
    }
    return map
  }, [activeCategory, rest])

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
        {/* Add Custom button */}
        <button
          type="button"
          onClick={() => setShowCustomForm((v) => !v)}
          className={
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
            (showCustomForm
              ? 'border-accent/40 bg-accent/20 text-accent'
              : 'border-border bg-card2 text-muted hover:border-border')
          }
        >
          + Custom
        </button>
      </div>

      {/* Equipment filter */}
      <div className="flex flex-wrap gap-2">
        {EQUIPMENT_OPTIONS.map((eq) => {
          const isActive = activeEquipment.includes(eq.id)
          return (
            <button
              key={eq.id}
              type="button"
              onClick={() => toggleEquipment(eq.id)}
              className={
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
                (isActive
                  ? 'border-teal/40 bg-teal/20 text-teal'
                  : 'border-border bg-card2 text-muted hover:border-border')
              }
            >
              {eq.label}
            </button>
          )
        })}
      </div>

      {/* Custom exercise form */}
      {showCustomForm && (
        <InlineCustomForm
          onSave={() => setShowCustomForm(false)}
          onCancel={() => setShowCustomForm(false)}
          addCustomExercise={addCustomExercise}
        />
      )}

      {/* Exercise list */}
      {isEmpty ? (
        <p className="py-4 text-center text-sm text-muted">No exercises match your search.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Frequent section */}
          {frequent.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Frequent
              </p>
              {frequent.map((ex) => (
                <ExerciseRow
                  key={ex.id}
                  ex={ex}
                  isSelected={selected.includes(ex.id)}
                  mode={mode}
                  onToggle={onToggle}
                  count={frequency.get(ex.id)}
                />
              ))}
            </div>
          )}

          {/* Rest: grouped by category or flat */}
          {groupedRest
            ? CATEGORY_ORDER.map((cat) => {
                const exercises = groupedRest.get(cat)
                if (!exercises || exercises.length === 0) return null
                return (
                  <div key={cat} className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      {cat}
                    </p>
                    {exercises.map((ex) => (
                      <ExerciseRow
                        key={ex.id}
                        ex={ex}
                        isSelected={selected.includes(ex.id)}
                        mode={mode}
                        onToggle={onToggle}
                      />
                    ))}
                  </div>
                )
              })
            : rest.length > 0 && (
                <div className="flex flex-col gap-2">
                  {rest.map((ex) => (
                    <ExerciseRow
                      key={ex.id}
                      ex={ex}
                      isSelected={selected.includes(ex.id)}
                      mode={mode}
                      onToggle={onToggle}
                    />
                  ))}
                </div>
              )}
        </div>
      )}
    </div>
  )
}

// ─── Exercise Row ───────────────────────────────────────────────────────

interface ExerciseRowProps {
  ex: { id: CalisthenicsExerciseId; name: string; icon: string; type: string; primaryMuscles: string[]; isCustom: boolean }
  isSelected: boolean
  mode: 'single' | 'multi'
  onToggle: (id: CalisthenicsExerciseId) => void
  count?: number
}

function ExerciseRow({ ex, isSelected, mode, onToggle, count }: ExerciseRowProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(ex.id)}
      className={
        'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ' +
        (isSelected
          ? 'border-purple/40 bg-purple/10'
          : 'border-transparent bg-card2 hover:border-border')
      }
    >
      <ExerciseIcon exerciseId={ex.id} fallbackEmoji={ex.icon} size="md" />
      <div className="min-w-0 flex-1">
        <p
          className={
            'truncate text-sm font-medium ' +
            (isSelected ? 'text-purple' : 'text-ink')
          }
        >
          {ex.name}
          {ex.isCustom && <span className="ml-1 text-xs text-muted">(custom)</span>}
        </p>
        <p className="truncate text-xs text-muted">
          {ex.primaryMuscles.join(' · ')}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {count != null && (
          <span className="rounded border border-border bg-card px-1.5 py-0.5 text-xs text-muted">
            {count}×
          </span>
        )}
        <span className="rounded border border-border bg-card px-1.5 py-0.5 text-xs text-muted">
          {ex.type === 'hold' ? 'hold' : 'reps'}
        </span>
        {mode === 'multi' && isSelected && (
          <span className="text-sm font-semibold text-purple">✓</span>
        )}
      </div>
    </button>
  )
}

// ─── Inline Custom Exercise Form ────────────────────────────────────────

const MUSCLE_OPTIONS = Object.entries(MUSCLE_LABELS) as [MuscleGroup, string][]

function InlineCustomForm({ onSave, onCancel, addCustomExercise }: { onSave: () => void; onCancel: () => void; addCustomExercise: (ex: CustomExercise) => Promise<void> }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [exType, setExType] = useState<'dynamic' | 'hold'>('dynamic')
  const [category, setCategory] = useState<ExerciseCategory>('push')
  const [muscles, setMuscles] = useState<string[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleMuscle(m: string) {
    setMuscles((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  async function handleSave() {
    if (!user || !name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    try {
      const exercise: CustomExercise = {
        id: customExerciseId(`calisthenics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
        userId: user.uid,
        name: name.trim(),
        type: exType,
        icon: '🏋️',
        exerciseType: 'calisthenics',
        primaryMuscles: muscles,
        category,
        isGlobal: true,
        createdAt: new Date().toISOString(),
      }
      await addCustomExercise(exercise)
      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-accent/30 bg-card p-3 space-y-3">
      <p className="text-sm font-semibold text-ink">New Custom Exercise</p>

      {error && <p className="text-xs text-accent">{error}</p>}

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Exercise name..."
        className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/40"
      />

      {/* Type toggle */}
      <div className="flex gap-2">
        {(['dynamic', 'hold'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setExType(t)}
            className={
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
              (exType === t
                ? 'border-purple/40 bg-purple/20 text-purple'
                : 'border-border bg-card2 text-muted')
            }
          >
            {t === 'dynamic' ? 'Reps' : 'Hold'}
          </button>
        ))}
      </div>

      {/* Category */}
      <div className="flex gap-2">
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
              (category === cat
                ? 'border-purple/40 bg-purple/20 text-purple'
                : 'border-border bg-card2 text-muted')
            }
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Muscles (compact grid) */}
      <div>
        <p className="text-xs font-semibold text-muted mb-1">Target Muscles</p>
        <div className="flex flex-wrap gap-1.5">
          {MUSCLE_OPTIONS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleMuscle(key)}
              className={
                'rounded-full border px-2 py-0.5 text-xs transition-colors ' +
                (muscles.includes(key)
                  ? 'border-teal/40 bg-teal/20 text-teal'
                  : 'border-border bg-card2 text-muted')
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-full bg-accent/20 py-2 text-sm font-bold text-accent border border-accent/40 hover:bg-accent/30 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full bg-border/50 py-2 text-sm font-bold text-ink border border-border hover:bg-border/70 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
