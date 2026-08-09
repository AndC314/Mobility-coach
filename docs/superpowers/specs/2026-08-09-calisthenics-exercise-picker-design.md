# Calisthenics Exercise Picker Redesign

## Problem

Logging a calisthenics exercise takes too long. The Log tab shows 30 exercises in a flat 4-column grid with truncated names (only first word visible). The Bulk tab has Push/Pull/Core/Legs categories but uses a different exercise subset — some exercises only appear in one tab. There's no way to search or filter.

## Solution

Add a `category` field to each exercise definition, build a shared `ExercisePicker` component with search + category filter, and use it in both tabs. Remove duplicate exercise IDs and clean up display names.

## Data Layer

### `CalisthenicsExerciseDef` changes

Add two fields:

```ts
category: 'push' | 'pull' | 'legs' | 'core'
primaryMuscles: string[] // e.g. ['Chest', 'Triceps'] — derived from EXERCISE_MUSCLES for search
```

### New exercises

| ID | Name | Type | Category | Primary muscles |
|----|------|------|----------|-----------------|
| `wall_plank` | Wall Plank | hold | push | Chest, Front delts, Abs |
| `wall_sit` | Wall Sit | hold | legs | Quads, Glutes |
| `superman` | Superman | hold | core | Lower back, Glutes |
| `door_pull` | Door Pull | dynamic (reps) | pull | Lats, Biceps, Rhomboids |
| `crunches` | Crunches | dynamic (reps) | core | Abs |
| `russian_twist` | Russian Twist | dynamic (reps) | core | Abs, Obliques (abs) |

Note: `sit_ups` already exists in the DB. No new entry needed for Situps.

### Category assignments

| Category | Exercises |
|----------|-----------|
| Push | pushups, diamond_push_ups, wide_push_ups, dips, pike_pushups, archer_pushups, hindu_pushups, planche_leans, wall_plank |
| Pull | pullups, australian_pullups, ring_rows, scapular_pullups, hanging_knee_to_chest, door_pull |
| Legs | squats, bulgarian_squat, pistol_squats, glute_bridge, wall_sit |
| Core | plank, side_plank, hollow_body_hold, tuck_lsit, lsit, gymnastics_bridge, crow_pose, sit_ups, crunches, russian_twist, leg_raise, v_up, dog_bird, dead_bug, superman |

### Duplicate removal

| Remove | Keep | Reason |
|--------|------|--------|
| `pistol_squat` | `pistol_squats` | Richer definition (setup, cue, BJJ transfer) |
| `hollow_body` | `hollow_body_hold` | Richer definition; functionally identical |

Both removed IDs stay in the `CalisthenicsExerciseId` union type for DB compatibility. A `DEPRECATED_EXERCISE_MAP` constant maps old → new for log reads.

### Name cleanup

| ID | Old name | New name |
|----|----------|----------|
| `tuck_lsit` | Tuck L-sit | Tuck L-Sit |
| `lsit` | L-Sit | L-Sit (no change) |
| `dog_bird` | Dog Bird (Bird-Dog) | Bird-Dog |
| `hanging_knee_to_chest` | Hanging Knee-to-Chest | Hanging Knee Raise |
| `hollow_body_hold` | Hollow Body Hold | Hollow Body |

## ExercisePicker Component

### Props

```ts
interface ExercisePickerProps {
  mode: 'single' | 'multi'
  selected: CalisthenicsExerciseId | CalisthenicsExerciseId[]
  onSelect: (id: CalisthenicsExerciseId) => void
  onDeselect?: (id: CalisthenicsExerciseId) => void
}
```

### Layout

1. **Search input** — placeholder "Search exercises or muscles..." — sticky at top
2. **Category pills** — horizontal row: All | Push | Pull | Legs | Core
3. **Exercise list** — grouped by category (with headers) when "All" selected, flat list otherwise

### Exercise row

```
[Icon] [Full Name]     [type pill: "reps" or "hold"]
       [primary muscles in muted text]
```

In multi mode, selected rows get a purple left border + check indicator.

### Filtering logic

- Category pill: exact match on `exercise.category`
- Search: case-insensitive substring match against `exercise.name` OR any entry in `exercise.primaryMuscles`
- Both filters compose (AND): selecting "Push" + typing "chest" shows only push exercises that target chest

## CalisthenicsSection Changes

### Log tab

- Replace the 4-column grid with `<ExercisePicker mode="single" />`
- Selected exercise opens the existing form below (value, sets, date, log button)
- Recent history card unchanged

### Bulk tab

- Replace `EXERCISE_CATEGORIES` + grid with `<ExercisePicker mode="multi" />`
- Selected exercises accumulate in the session summary card at bottom
- "Configure & Log Session" button + config view unchanged
- Delete the hardcoded `EXERCISE_CATEGORIES` constant

## Migration

In `useCalisthenics` hook, add a mapping step when reading logs:

```ts
const DEPRECATED_EXERCISE_MAP: Partial<Record<string, CalisthenicsExerciseId>> = {
  pistol_squat: 'pistol_squats',
  hollow_body: 'hollow_body_hold',
}
```

Apply when loading logs so old entries display correctly. No DB migration needed — the old IDs remain valid in the type system, they just don't appear in the picker.

## Files touched

1. `src/data/calisthenics.ts` — add category/primaryMuscles fields, remove duplicates, fix names, add 6 new exercises
2. `src/data/muscleMap.ts` — remove `pistol_squat` and `hollow_body` entries from EXERCISE_MUSCLES (merge into canonical), add muscle maps for new exercises
3. `src/db/db.ts` — keep deprecated IDs in union type, add new IDs (`wall_plank`, `wall_sit`, `superman`, `door_pull`, `crunches`, `russian_twist`)
4. `src/components/ExercisePicker.tsx` — new shared component
5. `src/components/CalisthenicsSection.tsx` — refactor Log + Bulk tabs to use ExercisePicker
6. `src/hooks/useCalisthenics.ts` — add deprecated ID remapping on read
