# Smart Recovery — Design Spec
_2026-06-27_

## Overview

The Recovery page gains a **Smart / Manual** mode switcher. Manual is the existing body-area grid (untouched). Smart mode reads recent training logs, computes which muscles are loaded via the existing decay model, and generates a prioritised recovery routine automatically. Both modes share the same `ExerciseCard` timer flow and session logging.

---

## Data Model

### Source signals

| Signal | Table | Window |
|--------|-------|--------|
| Calisthenics load | `db.calisthenicsLogs` | Last 48 h |
| BJJ class | `db.bjjLogs` (filter `attended === true`) | Last 24 h |

Soreness is computed with the existing `computeMuscleSorenessDecay()` from `src/data/muscleMap.ts`. No new math.

### Muscle → stretch mapping

New constant `MUSCLE_STRETCHES: Partial<Record<MuscleGroup, string[]>>` added to `src/data/recovery.ts`. Maps each muscle group to 1–2 exercise IDs from `ALL_EXERCISES`. Complete mapping:

| Muscle group | Exercise IDs |
|---|---|
| `abs` | `pelvic_clock`, `cat_cow` |
| `lower_back` | `pelvic_clock`, `cat_cow`, `childs_pose_lat` |
| `hip_flexors` | `hip_flexor_lunge`, `hip_flexor_lunge_ext` |
| `inner_thigh` | `ninety_ninety_fold` |
| `glutes` | `supine_figure_4`, `ninety_ninety_fold` |
| `hamstrings` | `supine_figure_4`, `lat_hang_bjj` |
| `lats` | `childs_pose_lat`, `thread_the_needle` |
| `forearms` | `wrist_conditioning`, `lat_hang_bjj` |
| `chest` | `doorway_pec_stretch` |
| `front_delt` | `doorway_pec_stretch`, `shoulder_cars` |
| `rear_delt` | `thread_the_needle`, `shoulder_cars` |
| `rhomboids` | `thread_the_needle` |
| `traps` | `shoulder_cars` |
| `biceps` | `lat_hang_bjj` |
| `triceps` | `childs_pose_lat` |
| `quads` | `hip_flexor_lunge` |
| `calves` | `lat_hang_bjj` |

### Routine generation algorithm

1. Build `DecayInput[]` from calisthenics logs (last 48 h) and `bjjLogs` where `attended === true` (last 24 h, using `BJJ_MUSCLE_ACTIVATIONS` at fixed 80/40 load).
2. Run `computeMuscleSorenessDecay(inputs, Date.now())`.
3. Filter to muscles with `soreness > 10`, sort descending.
4. For each sore muscle (in order), look up `MUSCLE_STRETCHES[muscle]`, collect exercise IDs.
5. Deduplicate (first-seen order preserved).
6. Cap at **6 exercises**.
7. Fallback (nothing sore / no recent training): return `['pelvic_clock', 'cat_cow', 'lat_hang_bjj', 'childs_pose_lat']` with label "General recovery".

### Routine label

Derived from what drove the soreness:

| Condition | Label |
|-----------|-------|
| BJJ log in last 24 h only | `"Post-BJJ recovery"` |
| Calisthenics in last 48 h only | `"Post-training recovery"` |
| Both | `"Mixed recovery"` |
| Neither (fallback) | `"General recovery"` |

---

## New Hook: `useSmartRecovery`

**File:** `src/hooks/useSmartRecovery.ts`

```ts
export interface SmartRecovery {
  exercises: ExerciseItem[]
  label: string
  muscleChips: string[]   // top-3 human-readable muscle names for display
  source: 'bjj' | 'calisthenics' | 'mixed' | 'none'
}

export function useSmartRecovery(): SmartRecovery
```

- Uses `useLiveQuery` to subscribe to both `db.calisthenicsLogs` and `db.bjjClassLogs`.
- Returns loading default `{ exercises: [], label: 'Loading…', muscleChips: [], source: 'none' }` while Dexie hydrates.
- Pure derivation — no writes.

---

## UI Changes

### Recovery.tsx — mode switcher

A two-button tab bar replaces the current page header area:

```
[ Smart ]  [ Manual ]
```

- Active tab: `bg-accent/10 text-accent border border-accent/40`
- Inactive tab: `text-muted`
- Default tab on first render: **Smart**.
- Tab state is local (`useState`) — not persisted.

### Smart tab content (no active sequence)

```
┌───────────────────────────────────────┐
│  Post-BJJ recovery · ~12 min          │  ← label + estimated duration
│  ● Hips  ● Lower back  ● Forearms     │  ← top-3 muscle chips (text-[11px])
│                                       │
│  [  Start routine  →  ]               │  ← full-width button, bg-accent
└───────────────────────────────────────┘
```

Estimated duration = sum of `timerSec` across all exercises, accounting for `sides` (×2), divided by 60, rounded up to nearest minute.

If source is `'none'` (no recent training): show a softer card —
> "No recent training found — here's a general mobility reset."

### Smart tab content (active sequence)

Identical to the existing Manual sequence view — same `ExerciseCard` list, same back button, same completion banner. The only difference is the back button returns to the Smart tab (not Manual).

### Manual tab content

The existing body-area grid and sequence flow, completely unchanged.

### Session logging

Smart sequences log using the same `upsertTodaySession` call:

```ts
type: 'recovery'
label: smartRecovery.label   // e.g. "Post-BJJ recovery"
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/data/recovery.ts` | Add `MUSCLE_STRETCHES` constant |
| `src/hooks/useSmartRecovery.ts` | New hook |
| `src/pages/Recovery.tsx` | Add mode switcher, Smart tab render |

No changes to `ExerciseCard`, `ALL_EXERCISES`, `muscleMap.ts`, `useRecoveryReadiness`, or any other file.

---

## Out of Scope

- Persisting the selected tab between sessions.
- Allowing the user to edit or reorder the generated routine.
- Using `MOBILITY_EXERCISES` (MobilityPage picker format) — all exercises come from `ALL_EXERCISES` to stay compatible with `ExerciseCard`.
- More than 6 exercises in a Smart routine.
