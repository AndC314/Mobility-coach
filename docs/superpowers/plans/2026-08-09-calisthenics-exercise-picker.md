# Calisthenics Exercise Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize calisthenics exercises into Push/Pull/Legs/Core categories with a searchable picker shared across Log and Bulk tabs, add 6 new exercises, and remove duplicates.

**Architecture:** Add `category` and `primaryMuscles` fields to exercise definitions, build a reusable `ExercisePicker` component with search + category filter pills, and wire it into both the Log (single-select) and Bulk (multi-select) tabs. Deprecated exercise IDs are remapped transparently in the read path.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Dexie (IndexedDB)

## Global Constraints

- No external dependencies added
- All exercises use existing `CalisthenicsExerciseId` type from `src/db/db.ts`
- New IDs must be added to the union type before being used
- Deprecated IDs stay in the union type forever (existing DB rows reference them)
- No DB migration — old logs with deprecated IDs are remapped at read time

---

### Task 1: Add new exercise IDs to the database type

**Files:**
- Modify: `src/db/db.ts:123-155` (CalisthenicsExerciseId union type)

**Interfaces:**
- Consumes: nothing
- Produces: Extended `CalisthenicsExerciseId` type with 6 new IDs: `wall_plank`, `wall_sit`, `superman`, `door_pull`, `crunches`, `russian_twist`

- [ ] **Step 1: Add new IDs to the CalisthenicsExerciseId type**

In `src/db/db.ts`, add these entries to the `CalisthenicsExerciseId` union type (insert alphabetically):

```ts
export type CalisthenicsExerciseId =
  | 'archer_pushups'
  | 'australian_pullups'
  | 'bulgarian_squat'
  | 'crunches'
  | 'dead_bug'
  | 'diamond_push_ups'
  | 'dips'
  | 'dog_bird'
  | 'door_pull'
  | 'glute_bridge'
  | 'gymnastics_bridge'
  | 'hanging_knee_to_chest'
  | 'hindu_pushups'
  | 'hollow_body'
  | 'hollow_body_hold'
  | 'lsit'
  | 'leg_raise'
  | 'pike_pushups'
  | 'pistol_squat'
  | 'pistol_squats'
  | 'planche_leans'
  | 'plank'
  | 'pullups'
  | 'pushups'
  | 'ring_rows'
  | 'russian_twist'
  | 'scapular_pullups'
  | 'sit_ups'
  | 'side_plank'
  | 'crow_pose'
  | 'squats'
  | 'superman'
  | 'tuck_lsit'
  | 'v_up'
  | 'wall_plank'
  | 'wall_sit'
  | 'wide_push_ups'
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (new IDs are valid, no code references them yet)

- [ ] **Step 3: Commit**

```bash
git add src/db/db.ts
git commit -m "feat: add 6 new calisthenics exercise IDs to DB type"
```

---

### Task 2: Update exercise definitions with categories and new exercises

**Files:**
- Modify: `src/data/calisthenics.ts` (add `category` + `primaryMuscles` fields, add 6 new exercises, remove duplicates, fix names)

**Interfaces:**
- Consumes: `CalisthenicsExerciseId` type from Task 1
- Produces: Updated `CalisthenicsExerciseDef` type with `category: 'push' | 'pull' | 'legs' | 'core'` and `primaryMuscles: string[]`; `DEPRECATED_EXERCISE_MAP` export; no more `pistol_squat` or `hollow_body` entries in the array

- [ ] **Step 1: Update the CalisthenicsExerciseDef interface**

Add two fields after `equipmentNote`:

```ts
export type ExerciseCategory = 'push' | 'pull' | 'legs' | 'core'

export interface CalisthenicsExerciseDef {
  id: CalisthenicsExerciseId
  name: string
  type: 'dynamic' | 'hold'
  metric: CalisthenicsMetric
  unit: string
  icon: string
  description: string
  category: ExerciseCategory
  primaryMuscles: string[]
  equipmentNote?: string
  setup?: string
  cue?: string
  bjjTransfer?: string
  feelIt?: string
}
```

- [ ] **Step 2: Add the deprecated exercise mapping**

At the bottom of the file, before the `getExerciseDef` function:

```ts
export const DEPRECATED_EXERCISE_MAP: Partial<Record<string, CalisthenicsExerciseId>> = {
  pistol_squat: 'pistol_squats',
  hollow_body: 'hollow_body_hold',
}
```

- [ ] **Step 3: Add category and primaryMuscles to every existing exercise**

Add `category` and `primaryMuscles` to each exercise entry. The assignments:

**Push:** `pushups`, `diamond_push_ups`, `wide_push_ups`, `dips`, `pike_pushups`, `archer_pushups`, `hindu_pushups`, `planche_leans`
**Pull:** `pullups`, `australian_pullups`, `ring_rows`, `scapular_pullups`, `hanging_knee_to_chest`
**Legs:** `squats`, `bulgarian_squat`, `pistol_squats`, `glute_bridge`
**Core:** `plank`, `side_plank`, `hollow_body_hold`, `tuck_lsit`, `lsit`, `gymnastics_bridge`, `crow_pose`, `sit_ups`, `leg_raise`, `v_up`, `dog_bird`, `dead_bug`

For `primaryMuscles`, use the human-readable labels of the primary muscles from `EXERCISE_MUSCLES` in `muscleMap.ts`. Examples:
- `pushups`: `['Chest', 'Front delts', 'Triceps']`
- `pullups`: `['Lats', 'Biceps', 'Rhomboids']`
- `plank`: `['Abs / Core', 'Lower back']`

- [ ] **Step 4: Remove duplicate entries**

Remove the `pistol_squat` entry (keep `pistol_squats`).
Remove the `hollow_body` entry (keep `hollow_body_hold`).

Rename `hollow_body_hold` display name from "Hollow Body Hold" to "Hollow Body".

- [ ] **Step 5: Fix display names**

| ID | New name |
|----|----------|
| `dog_bird` | Bird-Dog |
| `hanging_knee_to_chest` | Hanging Knee Raise |
| `tuck_lsit` | Tuck L-Sit |

- [ ] **Step 6: Add 6 new exercise definitions**

```ts
{
  id: 'wall_plank',
  name: 'Wall Plank',
  type: 'hold',
  metric: 'hold_sec',
  unit: 's',
  icon: '🧱',
  category: 'push',
  primaryMuscles: ['Chest', 'Front delts', 'Abs / Core'],
  description: 'Hands on wall at shoulder height, lean forward into plank position. Hold with straight body line.',
},
{
  id: 'wall_sit',
  name: 'Wall Sit',
  type: 'hold',
  metric: 'hold_sec',
  unit: 's',
  icon: '🪑',
  category: 'legs',
  primaryMuscles: ['Quads', 'Glutes'],
  description: 'Back flat against wall, thighs parallel to floor, knees at 90 degrees. Hold for time.',
},
{
  id: 'superman',
  name: 'Superman',
  type: 'hold',
  metric: 'hold_sec',
  unit: 's',
  icon: '🦸',
  category: 'core',
  primaryMuscles: ['Lower back', 'Glutes'],
  description: 'Lie face down, lift arms and legs off the floor simultaneously. Squeeze glutes and lower back.',
},
{
  id: 'door_pull',
  name: 'Door Pull',
  type: 'dynamic',
  metric: 'reps',
  unit: 'reps',
  icon: '🚪',
  category: 'pull',
  primaryMuscles: ['Lats', 'Biceps', 'Rhomboids'],
  description: 'Grip a door frame or sturdy door edge, lean back and pull chest toward hands. Horizontal pulling without a bar.',
},
{
  id: 'crunches',
  name: 'Crunches',
  type: 'dynamic',
  metric: 'reps',
  unit: 'reps',
  icon: '🔄',
  category: 'core',
  primaryMuscles: ['Abs / Core'],
  description: 'Curl shoulders off floor toward knees, short range of motion. Focus on upper abs contraction.',
},
{
  id: 'russian_twist',
  name: 'Russian Twist',
  type: 'dynamic',
  metric: 'reps',
  unit: 'reps',
  icon: '🌀',
  category: 'core',
  primaryMuscles: ['Abs / Core'],
  description: 'Sit with feet elevated, lean back slightly, rotate torso side to side. Count each side as one rep.',
},
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Errors about missing `category`/`primaryMuscles` should be gone since all entries now have them. May see errors in `muscleMap.ts` for removed IDs — fixed in Task 3.

- [ ] **Step 8: Commit**

```bash
git add src/data/calisthenics.ts
git commit -m "feat: add categories, muscles, 6 new exercises; remove duplicates"
```

---

### Task 3: Update muscle map for new exercises and remove deprecated entries

**Files:**
- Modify: `src/data/muscleMap.ts:96-279` (EXERCISE_MUSCLES record)

**Interfaces:**
- Consumes: New exercise IDs from Task 1, `DEPRECATED_EXERCISE_MAP` concept from Task 2
- Produces: `EXERCISE_MUSCLES` record with entries for all 6 new exercises and no entries for `pistol_squat` or `hollow_body`

- [ ] **Step 1: Remove deprecated entries from EXERCISE_MUSCLES**

Remove the `pistol_squat` entry (lines ~178-184). Its muscle data is already duplicated in `pistol_squats`.
Remove the `hollow_body` entry (lines ~147-152). Its muscle data is already duplicated in `hollow_body_hold`.

- [ ] **Step 2: Add muscle activations for new exercises**

Add these entries to `EXERCISE_MUSCLES`:

```ts
wall_plank: [
  { muscle: 'chest', level: 'primary' },
  { muscle: 'front_delt', level: 'primary' },
  { muscle: 'abs', level: 'primary' },
  { muscle: 'triceps', level: 'secondary' },
],
wall_sit: [
  { muscle: 'quads', level: 'primary' },
  { muscle: 'glutes', level: 'primary' },
  { muscle: 'calves', level: 'secondary' },
],
superman: [
  { muscle: 'lower_back', level: 'primary' },
  { muscle: 'glutes', level: 'primary' },
  { muscle: 'hamstrings', level: 'secondary' },
],
door_pull: [
  { muscle: 'lats', level: 'primary' },
  { muscle: 'biceps', level: 'primary' },
  { muscle: 'rhomboids', level: 'primary' },
  { muscle: 'rear_delt', level: 'secondary' },
],
crunches: [
  { muscle: 'abs', level: 'primary' },
],
russian_twist: [
  { muscle: 'abs', level: 'primary' },
  { muscle: 'hip_flexors', level: 'secondary' },
],
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/data/muscleMap.ts
git commit -m "feat: add muscle maps for new exercises, remove deprecated entries"
```

---

### Task 4: Add deprecated ID remapping in useCalisthenics hook

**Files:**
- Modify: `src/hooks/useCalisthenics.ts`

**Interfaces:**
- Consumes: `DEPRECATED_EXERCISE_MAP` from `src/data/calisthenics.ts`
- Produces: `useCalisthenicsLogs` transparently remaps `pistol_squat` → `pistol_squats` and `hollow_body` → `hollow_body_hold` when reading from DB

- [ ] **Step 1: Import the mapping and apply it in useCalisthenicsLogs**

Add import at top:
```ts
import { getExerciseDef, estimateCalisthenicsduration, DEPRECATED_EXERCISE_MAP } from '../data/calisthenics'
```

Update `useCalisthenicsLogs` to remap deprecated IDs:

```ts
export function useCalisthenicsLogs(exerciseId?: CalisthenicsExerciseId) {
  return useLiveQuery(async () => {
    const all = await db.calisthenicsLogs.orderBy('date').toArray()
    const remapped = all.map((log) => {
      const canonical = DEPRECATED_EXERCISE_MAP[log.exerciseId]
      return canonical ? { ...log, exerciseId: canonical } : log
    })
    return exerciseId ? remapped.filter((l) => l.exerciseId === exerciseId) : remapped
  }, [exerciseId], [])
}
```

Also update `useTodayCalisthenicsLogs` similarly:

```ts
export function useTodayCalisthenicsLogs() {
  const today = todayIso()
  return useLiveQuery(
    async () => {
      const logs = await db.calisthenicsLogs.where('date').equals(today).toArray()
      return logs.map((log) => {
        const canonical = DEPRECATED_EXERCISE_MAP[log.exerciseId]
        return canonical ? { ...log, exerciseId: canonical } : log
      })
    },
    [today],
    []
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCalisthenics.ts
git commit -m "feat: remap deprecated exercise IDs on read"
```

---

### Task 5: Build the ExercisePicker component

**Files:**
- Create: `src/components/ExercisePicker.tsx`

**Interfaces:**
- Consumes: `CALISTHENICS_EXERCISES`, `ExerciseCategory` from `src/data/calisthenics.ts`; `CalisthenicsExerciseId` from `src/db/db.ts`
- Produces: `<ExercisePicker>` component with props:
  ```ts
  interface ExercisePickerProps {
    mode: 'single' | 'multi'
    selected: CalisthenicsExerciseId[]
    onToggle: (id: CalisthenicsExerciseId) => void
  }
  ```

- [ ] **Step 1: Create the ExercisePicker component file**

Create `src/components/ExercisePicker.tsx`:

```tsx
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

export default function ExercisePicker({ mode, selected, onToggle }: ExercisePickerProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all')

  const filtered = useMemo(() => {
    let exercises = CALISTHENICS_EXERCISES

    if (category !== 'all') {
      exercises = exercises.filter((ex) => ex.category === category)
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      exercises = exercises.filter(
        (ex) =>
          ex.name.toLowerCase().includes(q) ||
          ex.primaryMuscles.some((m) => m.toLowerCase().includes(q))
      )
    }

    return exercises
  }, [search, category])

  const grouped = useMemo(() => {
    if (category !== 'all') return [{ category, exercises: filtered }]
    const groups: { category: ExerciseCategory; exercises: typeof filtered }[] = []
    const order: ExerciseCategory[] = ['push', 'pull', 'legs', 'core']
    for (const cat of order) {
      const exercises = filtered.filter((ex) => ex.category === cat)
      if (exercises.length > 0) groups.push({ category: cat, exercises })
    }
    return groups
  }, [filtered, category])

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search exercises or muscles..."
        className="w-full rounded-lg border border-border bg-card2 px-3 py-2.5 text-sm text-ink placeholder:text-muted"
      />

      <div className="flex gap-1.5 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              category === cat.id
                ? 'bg-purple/20 text-purple border border-purple/40'
                : 'bg-card2 text-muted border border-border'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {grouped.map((group) => (
          <div key={group.category}>
            {category === 'all' && (
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                {group.category}
              </h3>
            )}
            <div className="space-y-1">
              {group.exercises.map((ex) => {
                const isSelected = selected.includes(ex.id)
                return (
                  <button
                    key={ex.id}
                    onClick={() => onToggle(ex.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-purple/10 border border-purple/40'
                        : 'bg-card2 border border-transparent hover:border-border'
                    }`}
                  >
                    <span className="text-xl">{ex.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className={`block text-sm font-semibold ${isSelected ? 'text-purple' : 'text-ink'}`}>
                        {ex.name}
                      </span>
                      <span className="block text-[11px] text-muted truncate">
                        {ex.primaryMuscles.join(' · ')}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold text-muted border border-border">
                      {ex.metric === 'hold_sec' ? 'hold' : 'reps'}
                    </span>
                    {mode === 'multi' && isSelected && (
                      <span className="text-purple text-sm">✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="py-4 text-center text-sm text-muted">No exercises match your search.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ExercisePicker.tsx
git commit -m "feat: add ExercisePicker component with search + category filter"
```

---

### Task 6: Refactor CalisthenicsSection to use ExercisePicker

**Files:**
- Modify: `src/components/CalisthenicsSection.tsx`

**Interfaces:**
- Consumes: `<ExercisePicker>` from Task 5; `CALISTHENICS_EXERCISES`, `DEPRECATED_EXERCISE_MAP`, `getExerciseDef` from `src/data/calisthenics.ts`
- Produces: Refactored `LogTab` using ExercisePicker in single mode; refactored `BulkTab` using ExercisePicker in multi mode; `EXERCISE_CATEGORIES` constant removed

- [ ] **Step 1: Update imports**

Replace the old imports section with:

```tsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card, Tag } from './Card'
import BodyMap from './BodyMap'
import ExercisePicker from './ExercisePicker'
import { CALISTHENICS_EXERCISES, getExerciseDef } from '../data/calisthenics'
import { MUSCLE_LABELS, computeMuscleScores } from '../data/muscleMap'
import { useCalisthenics, useCalisthenicsLogs, logCalisthenicsBase } from '../hooks/useCalisthenics'
import { db } from '../db/db'
import { todayIso } from '../lib/date'
import type { CalisthenicsExerciseId } from '../db/db'
```

- [ ] **Step 2: Refactor LogTab to use ExercisePicker**

Replace the `LogTab` function's exercise grid section (the `<Card>` containing the 4-column grid) with:

```tsx
function LogTab() {
  const [selected, setSelected] = useState<CalisthenicsExerciseId>('pushups')
  const exercise = getExerciseDef(selected)!
  const logs = useCalisthenicsLogs(selected)
  const { logCalisthenics, updateCalisthenics } = useCalisthenics()

  const [value, setValue] = useState('')
  const [sets, setSets] = useState('')
  const [date, setDate] = useState(todayIso())
  const [saved, setSaved] = useState(false)

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

  function handleToggle(id: CalisthenicsExerciseId) {
    setSelected(id)
    setValue('')
    setSets('')
  }

  return (
    <>
      <Card>
        <h2 className="mb-1 text-base font-bold">Select Exercise</h2>
        <ExercisePicker mode="single" selected={[selected]} onToggle={handleToggle} />
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
          <p className="mb-3 text-[11px] font-semibold text-gold">⚠ {exercise.equipmentNote}</p>
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
```

- [ ] **Step 3: Refactor BulkTab to use ExercisePicker**

Delete the `EXERCISE_CATEGORIES` constant entirely. Replace the `BulkTab` picker view (the `return` when `view === 'picker'`) with:

```tsx
// In the picker view return:
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
```

Also update `toggleExercise` to use `getExerciseDef`:

```tsx
function toggleExercise(id: CalisthenicsExerciseId) {
  if (selected.some((s) => s.id === id)) {
    setSelected(selected.filter((s) => s.id !== id))
  } else {
    const ex = getExerciseDef(id)!
    setSelected([...selected, { id, value: ex.metric === 'hold_sec' ? 30 : 10, sets: 3, restSec: 60 }])
  }
}
```

And in the config view, replace `CALISTHENICS_EXERCISES.find(...)` calls with `getExerciseDef(entry.id)!`.

- [ ] **Step 4: Remove the ExerciseThumb component**

The ExerciseThumb component (image + fallback emoji) is no longer used in the picker. Remove it from this file. The exercise row in ExercisePicker uses the emoji icon directly.

Note: if you still want thumbnails in the config view, keep ExerciseThumb and use it there only.

- [ ] **Step 5: Verify TypeScript compiles and app builds**

Run: `npx tsc --noEmit && npm run build`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/CalisthenicsSection.tsx
git commit -m "feat: refactor Log + Bulk tabs to use ExercisePicker"
```

---

### Task 7: Smoke test in browser

**Files:** None (manual verification)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Verified working app

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test Log tab**

1. Navigate to Calisthenics page → Log tab
2. Verify category pills show: All | Push | Pull | Legs | Core
3. Click "Push" — only push exercises appear
4. Type "chest" in search — exercises targeting chest filter in
5. Tap "Push-ups" — form appears below with reps input
6. Log a value — confirm "✓ Logged" flash and entry appears in Recent

- [ ] **Step 3: Test Bulk tab**

1. Switch to Bulk tab
2. Verify same picker with multi-select behavior
3. Select 3 exercises across categories
4. Verify session summary shows at bottom
5. Click "Configure & Log Session" → verify config view works
6. Log the session — confirm success

- [ ] **Step 4: Test new exercises**

1. Search for "wall" — Wall Plank and Wall Sit appear
2. Search for "superman" — Superman appears
3. Search for "door" — Door Pull appears
4. Verify Russian Twist and Crunches appear under Core category

- [ ] **Step 5: Test deprecated ID handling**

1. If you have existing logs with `pistol_squat` or `hollow_body`, verify they show up under the canonical exercise when viewing history
2. Muscle Map tab still shows correct data

- [ ] **Step 6: Final commit (if any tweaks needed)**

```bash
git add -A
git commit -m "fix: address smoke test findings"
```
