# Smart Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Smart / Manual mode switcher to the Recovery page where Smart mode auto-generates a stretch routine ranked by muscle soreness from recent calisthenics and BJJ logs.

**Architecture:** Three layered changes — (1) a `MUSCLE_STRETCHES` data table added to `recovery.ts` mapping each `MuscleGroup` to exercise IDs, (2) a `useSmartRecovery` hook that reads recent logs, runs the existing decay model, and returns a prioritised `ExerciseItem[]`, and (3) Recovery.tsx gains a `mode` state and renders either the new Smart card or the unchanged Manual picker.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Dexie (`useLiveQuery`), existing `computeMuscleSorenessDecay` + `BJJ_MUSCLE_ACTIVATIONS` from `muscleMap.ts`, existing `ExerciseCard` + `upsertTodaySession`.

## Global Constraints

- TypeScript strict mode — no `any`, no `ts-ignore`.
- Tailwind only — no inline style objects except where Tailwind cannot express dynamic values.
- No test framework — verification is `npx tsc --noEmit` (build check) + visual inspection via `npm run dev`.
- Do not modify `ExerciseCard`, `muscleMap.ts`, `exercises.ts`, `useSessions.ts`, or any page file other than `Recovery.tsx`.
- The existing Manual mode (body-area grid + sequence flow) must be byte-for-byte identical in behaviour after this change.
- Session logging stays on `type: 'recovery'` for both modes.
- Working directory: `/Users/acastiglioni/Desktop/Repos/Mobility-coach`

---

### Task 1: Add `MUSCLE_STRETCHES` to `recovery.ts`

**Files:**
- Modify: `src/data/recovery.ts`

**Interfaces:**
- Consumes: `MuscleGroup` from `../data/muscleMap` (type-only import)
- Produces:
  ```ts
  export const MUSCLE_STRETCHES: Partial<Record<MuscleGroup, string[]>>
  ```
  Used by `useSmartRecovery` in Task 2.

- [ ] **Step 1: Add the import and constant**

Open `src/data/recovery.ts`. At the top, after the existing imports, add:

```ts
import type { MuscleGroup } from './muscleMap'
```

Then, after the closing brace of `getSequenceExercises` (the last export in the file), append:

```ts
// Maps each muscle group to 1-2 ExerciseItem IDs from ALL_EXERCISES.
// Used by useSmartRecovery to build a prioritised stretch routine.
export const MUSCLE_STRETCHES: Partial<Record<MuscleGroup, string[]>> = {
  abs:         ['pelvic_clock', 'cat_cow'],
  lower_back:  ['pelvic_clock', 'cat_cow', 'childs_pose_lat'],
  hip_flexors: ['hip_flexor_lunge', 'hip_flexor_lunge_ext'],
  inner_thigh: ['ninety_ninety_fold'],
  glutes:      ['supine_figure_4', 'ninety_ninety_fold'],
  hamstrings:  ['supine_figure_4', 'lat_hang_bjj'],
  lats:        ['childs_pose_lat', 'thread_the_needle'],
  forearms:    ['wrist_conditioning', 'lat_hang_bjj'],
  chest:       ['doorway_pec_stretch'],
  front_delt:  ['doorway_pec_stretch', 'shoulder_cars'],
  rear_delt:   ['thread_the_needle', 'shoulder_cars'],
  rhomboids:   ['thread_the_needle'],
  traps:       ['shoulder_cars'],
  biceps:      ['lat_hang_bjj'],
  triceps:     ['childs_pose_lat'],
  quads:       ['hip_flexor_lunge'],
  calves:      ['lat_hang_bjj'],
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/acastiglioni/Desktop/Repos/Mobility-coach
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors mentioning `recovery.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/data/recovery.ts
git commit -m "feat: add MUSCLE_STRETCHES map to recovery data"
```

---

### Task 2: Create `useSmartRecovery` hook

**Files:**
- Create: `src/hooks/useSmartRecovery.ts`

**Interfaces:**
- Consumes:
  - `useLiveQuery` from `dexie-react-hooks`
  - `db` from `../db/db` — tables `db.calisthenicsLogs`, `db.bjjLogs`
  - `computeMuscleSorenessDecay`, `BJJ_MUSCLE_ACTIVATIONS`, `MUSCLE_LABELS`, `DEFAULT_LAMBDA` from `../data/muscleMap`
  - `MUSCLE_STRETCHES` from `../data/recovery` (Task 1)
  - `ALL_EXERCISES`, `ExerciseItem` from `../data/exercises`
  - `todayIso` from `../lib/date`
  - `DecayInput`, `MuscleGroup` from `../data/muscleMap`
- Produces:
  ```ts
  export interface SmartRecovery {
    exercises: ExerciseItem[]
    label: string
    muscleChips: string[]   // top-3 human-readable muscle names
    source: 'bjj' | 'calisthenics' | 'mixed' | 'none'
  }
  export function useSmartRecovery(): SmartRecovery
  ```

- [ ] **Step 1: Create the hook file**

Create `src/hooks/useSmartRecovery.ts` with the following complete content:

```ts
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { todayIso } from '../lib/date'
import {
  computeMuscleSorenessDecay,
  BJJ_MUSCLE_ACTIVATIONS,
  MUSCLE_LABELS,
  DEFAULT_LAMBDA,
  type DecayInput,
  type MuscleGroup,
} from '../data/muscleMap'
import { MUSCLE_STRETCHES } from '../data/recovery'
import { ALL_EXERCISES, type ExerciseItem } from '../data/exercises'

export interface SmartRecovery {
  exercises: ExerciseItem[]
  label: string
  muscleChips: string[]
  source: 'bjj' | 'calisthenics' | 'mixed' | 'none'
}

const FALLBACK_IDS = ['pelvic_clock', 'cat_cow', 'lat_hang_bjj', 'childs_pose_lat']

const FALLBACK: SmartRecovery = {
  exercises: FALLBACK_IDS.map((id) => ALL_EXERCISES[id]).filter(Boolean),
  label: 'General recovery',
  muscleChips: [],
  source: 'none',
}

const LOADING: SmartRecovery = {
  exercises: [],
  label: 'Loading…',
  muscleChips: [],
  source: 'none',
}

export function useSmartRecovery(): SmartRecovery {
  const today = todayIso()
  const now = new Date()

  const cutoff48h = new Date(now.getTime() - 48 * 3600000).toISOString().split('T')[0]
  const cutoff24h = new Date(now.getTime() - 24 * 3600000).toISOString().split('T')[0]

  const calisthenicsLogs = useLiveQuery(
    () => db.calisthenicsLogs.where('date').between(cutoff48h, today, true, true).toArray(),
    [cutoff48h, today],
    null
  )

  const bjjLogs = useLiveQuery(
    () => db.bjjLogs.where('date').between(cutoff24h, today, true, true).toArray(),
    [cutoff24h, today],
    null
  )

  if (calisthenicsLogs === null || bjjLogs === null) return LOADING

  const nowMs = now.getTime()
  const hasCalisthenics = calisthenicsLogs.length > 0
  const attendedBjjLogs = bjjLogs.filter((l) => l.attended)
  const hasAttendedBjj = attendedBjjLogs.length > 0

  // Build decay inputs from calisthenics logs
  const decayInputs: DecayInput[] = calisthenicsLogs.map((log) => ({
    exerciseId: log.exerciseId,
    value: log.value,
    loggedAt: new Date(log.date + 'T12:00:00').getTime(),
  }))

  // Run decay model on calisthenics
  let muscleSoreness = computeMuscleSorenessDecay(decayInputs, nowMs)

  // Add BJJ contribution from the most recent attended class
  if (hasAttendedBjj) {
    const latestBjj = attendedBjjLogs.sort((a, b) => b.date.localeCompare(a.date))[0]
    const bjjMs = new Date(latestBjj.date + 'T12:00:00').getTime()
    const elapsedHours = Math.max(0, (nowMs - bjjMs) / 3600000)
    for (const activation of BJJ_MUSCLE_ACTIVATIONS) {
      const peakLoad = activation.level === 'primary' ? 80 : 40
      const contribution = peakLoad * Math.exp(-DEFAULT_LAMBDA * elapsedHours)
      const entry = muscleSoreness.find((m) => m.muscle === activation.muscle)
      if (entry) {
        entry.soreness = Math.min(100, Math.round(entry.soreness + contribution))
      }
    }
  }

  // Filter sore muscles above threshold, sort by soreness descending
  const soreMuscles = muscleSoreness
    .filter((m) => m.soreness > 10)
    .sort((a, b) => b.soreness - a.soreness)
    .map((m) => m.muscle as MuscleGroup)

  if (soreMuscles.length === 0) return FALLBACK

  // Map muscles to exercise IDs, deduplicate, cap at 6
  const seen = new Set<string>()
  const exerciseIds: string[] = []
  outer: for (const muscle of soreMuscles) {
    for (const id of MUSCLE_STRETCHES[muscle] ?? []) {
      if (!seen.has(id)) {
        seen.add(id)
        exerciseIds.push(id)
        if (exerciseIds.length >= 6) break outer
      }
    }
  }

  const exercises = exerciseIds.map((id) => ALL_EXERCISES[id]).filter(Boolean)
  if (exercises.length === 0) return FALLBACK

  const muscleChips = soreMuscles.slice(0, 3).map((m) => MUSCLE_LABELS[m])

  const source: SmartRecovery['source'] =
    hasAttendedBjj && hasCalisthenics ? 'mixed' :
    hasAttendedBjj ? 'bjj' :
    hasCalisthenics ? 'calisthenics' :
    'none'

  const label =
    source === 'bjj'          ? 'Post-BJJ recovery' :
    source === 'calisthenics' ? 'Post-training recovery' :
    source === 'mixed'        ? 'Mixed recovery' :
    'General recovery'

  return { exercises, label, muscleChips, source }
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/acastiglioni/Desktop/Repos/Mobility-coach
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors in `useSmartRecovery.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSmartRecovery.ts
git commit -m "feat: add useSmartRecovery hook (decay-ranked stretch routine)"
```

---

### Task 3: Add Smart / Manual mode switcher to Recovery page

**Files:**
- Modify: `src/pages/Recovery.tsx`

**Interfaces:**
- Consumes: `useSmartRecovery`, `SmartRecovery` from `../hooks/useSmartRecovery` (Task 2)
- Consumes (already imported): `ExerciseCard`, `Card`, `upsertTodaySession`, `RECOVERY_SEQUENCES`, `getSequenceExercises`, `SORENESS_OPTIONS`
- The existing Manual mode logic (`toggleArea`, `startSequence`, `handleComplete`, `selected`, `active`, `elapsed`) is kept intact and unchanged.

- [ ] **Step 1: Add the import**

In `src/pages/Recovery.tsx`, find the existing imports block (lines 1–9):

```ts
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ExerciseCard from '../components/ExerciseCard'
import { Card } from '../components/Card'
import { SORENESS_OPTIONS, RECOVERY_SEQUENCES, getSequenceExercises } from '../data/recovery'
import { db, type SorenessArea } from '../db/db'
import { upsertTodaySession } from '../hooks/useSessions'
import { usePreferences } from '../hooks/usePreferences'
import { todayIso } from '../lib/date'
```

Replace with:

```ts
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ExerciseCard from '../components/ExerciseCard'
import { Card } from '../components/Card'
import { SORENESS_OPTIONS, RECOVERY_SEQUENCES, getSequenceExercises } from '../data/recovery'
import { db, type SorenessArea } from '../db/db'
import { upsertTodaySession } from '../hooks/useSessions'
import { usePreferences } from '../hooks/usePreferences'
import { todayIso } from '../lib/date'
import { useSmartRecovery } from '../hooks/useSmartRecovery'
import type { ExerciseItem } from '../data/exercises'
```

- [ ] **Step 2: Add mode state and smart hook call**

Find the opening of the `Recovery` function component and its existing state declarations:

```ts
export default function Recovery() {
  const [searchParams] = useSearchParams()
  const [selected, setSelected] = useState<SorenessArea[]>([])
  const [active, setActive] = useState<SorenessArea | null>(null)
  const [elapsed, setElapsed] = useState<Record<string, number>>({})
  const { preferences } = usePreferences()
```

Replace with:

```ts
export default function Recovery() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<'smart' | 'manual'>('smart')
  const [selected, setSelected] = useState<SorenessArea[]>([])
  const [active, setActive] = useState<SorenessArea | null>(null)
  const [smartActive, setSmartActive] = useState(false)
  const [elapsed, setElapsed] = useState<Record<string, number>>({})
  const { preferences } = usePreferences()
  const smartRecovery = useSmartRecovery()
```

- [ ] **Step 3: Add the duration helper**

Immediately after the state declarations block (before `useEffect`), add:

```ts
  function estimateDurationMin(exercises: ExerciseItem[]): number {
    const totalSec = exercises.reduce((s, ex) => s + ex.timerSec, 0)
    return Math.max(1, Math.ceil(totalSec / 60))
  }
```

- [ ] **Step 4: Add smart sequence completion handler**

After the existing `handleComplete` function, add:

```ts
  async function handleSmartComplete(id: string, elapsedSec: number) {
    const next = { ...elapsed, [id]: elapsedSec }
    setElapsed(next)
    const plannedSec = smartRecovery.exercises.reduce((s, ex) => s + ex.timerSec, 0)
    const actualSec = Object.values(next).reduce((s, v) => s + v, 0)
    await upsertTodaySession({
      type: 'recovery',
      label: smartRecovery.label,
      plannedSec,
      actualSec,
      exerciseIds: Object.keys(next),
    })
  }
```

- [ ] **Step 5: Add the smart active sequence view**

Find the opening of the `if (active)` block:

```ts
  if (active) {
```

Immediately before it, insert the smart active view:

```tsx
  if (smartActive) {
    const completedIds = Object.keys(elapsed)
    const allDone = completedIds.length === smartRecovery.exercises.length
    const plannedSec = smartRecovery.exercises.reduce((s, ex) => s + ex.timerSec, 0)
    const actualSec = Object.values(elapsed).reduce((s, v) => s + v, 0)
    const percent = plannedSec > 0 ? Math.min(100, Math.round((actualSec / plannedSec) * 100)) : 0

    return (
      <div className="space-y-4 pb-4 fade-in">
        <button
          onClick={() => { setSmartActive(false); setElapsed({}) }}
          className="text-sm font-semibold text-teal"
        >
          ← Back to recovery
        </button>
        <div>
          <p className="text-sm text-muted">🧠 {smartRecovery.label}</p>
          <h1 className="text-2xl font-extrabold">Recovery sequence</h1>
        </div>
        {smartRecovery.exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            index={i}
            name={ex.name}
            sets={ex.sets}
            setup={ex.setup}
            cue={ex.cue}
            feel={ex.feel}
            caution={ex.caution}
            timerSec={ex.timerSec}
            sides={ex.sides}
            color="#e8622a"
            completed={completedIds.includes(ex.id)}
            soundEnabled={preferences.soundEnabled}
            onComplete={(elapsedSec) => handleSmartComplete(ex.id, elapsedSec)}
          />
        ))}
        {completedIds.length > 0 && (
          <Card
            className={`text-center text-sm font-bold ${
              allDone ? 'border-teal/40 bg-teal/10 text-teal' : 'border-gold/40 bg-gold/10 text-gold'
            }`}
          >
            {allDone ? '✓ Recovery session logged' : `Session logged · ${percent}% of full sequence`}
          </Card>
        )}
      </div>
    )
  }
```

- [ ] **Step 6: Update the main return to add tab switcher + Smart tab**

Find the main `return` statement (currently starts with):

```tsx
  return (
    <div className="space-y-4 pb-4 fade-in">
      <div>
        <p className="text-sm text-muted">Where are you sore?</p>
        <h1 className="text-2xl font-extrabold">Recovery</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
```

Replace the entire `return` with:

```tsx
  return (
    <div className="space-y-4 pb-4 fade-in">
      {/* Page header */}
      <div>
        <p className="text-sm text-muted">Active recovery</p>
        <h1 className="text-2xl font-extrabold">Recovery</h1>
      </div>

      {/* Mode switcher */}
      <div className="flex gap-1 rounded-xl bg-card2 p-1">
        {(['smart', 'manual'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-all ${
              mode === m
                ? 'bg-accent/10 text-accent border border-accent/40'
                : 'text-muted'
            }`}
          >
            {m === 'smart' ? '🧠 Smart' : '🎯 Manual'}
          </button>
        ))}
      </div>

      {/* Smart tab */}
      {mode === 'smart' && (
        <Card className="space-y-3">
          <div>
            <p className="text-sm font-bold text-ink">{smartRecovery.label}</p>
            <p className="text-xs text-muted">
              ~{estimateDurationMin(smartRecovery.exercises)} min · {smartRecovery.exercises.length} exercises
            </p>
          </div>
          {smartRecovery.muscleChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {smartRecovery.muscleChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-teal/10 border border-teal/30 px-2.5 py-0.5 text-[11px] font-semibold text-teal"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
          {smartRecovery.source === 'none' && (
            <p className="text-xs text-muted italic">
              No recent training found — here's a general mobility reset.
            </p>
          )}
          {smartRecovery.exercises.length > 0 && (
            <button
              onClick={() => { setSmartActive(true); setElapsed({}) }}
              className="w-full rounded-full bg-accent py-2.5 text-sm font-bold text-white"
            >
              Start routine →
            </button>
          )}
        </Card>
      )}

      {/* Manual tab */}
      {mode === 'manual' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {SORENESS_OPTIONS.map((opt) => {
              const isSelected = selected.includes(opt.area)
              const seq = RECOVERY_SEQUENCES[opt.area]
              return (
                <Card
                  key={opt.area}
                  className={`relative ${isSelected ? 'border-accent/50 bg-accent/10' : ''}`}
                >
                  <button onClick={() => toggleArea(opt.area)} className="flex w-full flex-col items-start gap-1">
                    <span className="text-2xl">{opt.icon}</span>
                    <span className="text-sm font-bold text-ink">{opt.label}</span>
                    <span className="text-xs text-muted">{seq.durationMin} min sequence</span>
                  </button>
                  {isSelected && (
                    <button
                      onClick={() => startSequence(opt.area)}
                      className="mt-3 w-full rounded-full bg-accent/20 py-2 text-xs font-bold text-accent border border-accent/40"
                    >
                      Start
                    </button>
                  )}
                </Card>
              )
            })}
          </div>
          {selected.length === 0 && (
            <p className="text-center text-xs text-muted pt-2">
              Select one or more areas to log soreness and generate a recovery sequence.
            </p>
          )}
        </>
      )}
    </div>
  )
```

- [ ] **Step 7: Build check**

```bash
cd /Users/acastiglioni/Desktop/Repos/Mobility-coach
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero TypeScript errors.

- [ ] **Step 8: Visual check**

```bash
npm run dev
```

Open `http://localhost:5173` → navigate to the Recovery tab.

Verify:
- Smart / Manual tab switcher appears below the page header.
- Smart tab (default): shows a card with label, duration, muscle chips (if recent training logged), and "Start routine →" button.
- Smart tab with no training: shows "General recovery" label and "No recent training found" note.
- "Start routine →" launches ExerciseCard flow using the generated exercises.
- Back button in smart sequence returns to Smart tab with the switcher visible.
- Manual tab shows the original body-area grid, identical to before.
- Tapping a Manual area and pressing Start opens the existing ExerciseCard flow unchanged.
- Session is logged under Recovery for both modes.

- [ ] **Step 9: Commit**

```bash
git add src/pages/Recovery.tsx
git commit -m "feat: add Smart/Manual mode switcher to Recovery page"
```

---

## Post-Implementation

Push to origin:

```bash
git push origin main
```
