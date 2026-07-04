# Calendar, Load Tracking & Custom Exercises Design
**Date**: 2026-07-04  
**Scope**: Activity load ring on calendar, BJJ split timer visualization, calisthenics/mobility exercise additions, custom exercise system with progressive overload tracking

---

## 1. Calendar with Activity Load Ring

### Layout
- **Month view** of the current month with navigation (prev/next)
- **Week rows** displaying 7 days (Mon–Sun)
- **Day cells** show:
  - Day number (large, bold)
  - Abbreviated month (e.g., "JUL")
  - Circular load ring around the cell (0–100%, filled progressively)
  - Ring color: dynamic based on overall training intensity

### Hover Tooltip
When hovering over any day, show:
```
BJJ: 60 mins
Calisthenics: 90 mins (85%)
Mobility: 25 mins
```

**Details**:
- BJJ shows total time (technical + sparring combined)
- Calisthenics shows duration + calculated load %
- Mobility shows total duration

### Load Ring (0–100%)

#### BJJ Load Calculation
```
load % = (technical_mins + sparring_mins × 3) / 120

Max: 120 mins equivalent
- 60 mins technique = 60 mins equivalent
- 60 mins sparring = 180 mins equivalent (capped via formula)
- Example: 45 min technique + 15 min sparring = (45 + 45) / 120 = 75%
```

#### Calisthenics Load Calculation
```
Per-muscle load % = min(total_reps_per_muscle / 60, 100%)
Exercise-level stagnation penalty applied (see Section 6)

Overall calisthenics load = max(all muscle groups' load %)
```

**Target**: 45–60 reps per muscle per day for hypertrophy.

**Example**:
- 4×15 pushups (60 reps) = 100% chest
- 3×10 wide pushups (30 reps) = adds to chest total
- 3×12 diamond pushups (36 reps) = adds to chest total
- Total chest: 126 reps → capped at 100%
- If another muscle (back) only has 30 reps → 50% back load
- Overall calisthenics load = 100% (max of all muscles)

#### Mobility Load Calculation
```
load % = min(total_minutes / 30, 100%)

Target: 30 mins/day = 100%
```

#### Overall Ring Visualization
- Ring displays **blended color** based on highest load across all three activities
- Color algorithm:
  - **Intense** (orange/red): any activity ≥ 70%
  - **Medium** (amber/tan): any activity 30–69%
  - **Light** (gray/beige): all activities < 30%
- Ring fills from 0° to 360° proportional to overall load %
- Hover shows tooltip with breakdown (see Section 1 hover)

---

## 2. BJJ Split Timer

### Visual Design
- Single timer interface with two **side-by-side segments**:
  - Technical (e.g., blue)
  - Sparring (e.g., orange)
- Both track independently; user manually switches modes
- Displays: "45 mins technical | 15 mins sparring"

### User Flow
1. User taps "Start Technical" or "Start Sparring"
2. Timer counts up for the selected mode
3. User can pause/resume or switch modes at any time
4. Both durations persist until manually logged

### Data Tracking
- Stores `technical_mins` and `sparring_mins` separately
- **For load calculation**: sparring_mins × 3 (e.g., 15 min sparring = 45 mins equivalent)
- **For belt advancement**: both count equally (15 + 45 = 60 mins total)

---

## 3. New Calisthenics Exercises

Add 9 exercises with type and primary muscle mappings:

| Exercise | Type | Primary Muscles |
|----------|------|-----------------|
| Sit Ups | dynamic | core |
| Side Plank | hold | core, obliques |
| Glute Bridge | dynamic | glutes, core |
| Leg Raise | dynamic | core, hip flexors |
| V Ups | dynamic | core |
| Dog Bird | dynamic | core, glutes, back |
| Dead Bug | dynamic | core |
| Diamond Push Ups | dynamic | chest, triceps, core |
| Wide Push Ups | dynamic | chest, shoulders, core |

**Note**: Some exercises (side plank, dead bug) exist in mobility; they are duplicated here with different tracking (calisthenics tracks reps/load, mobility tracks hold time).

---

## 4. New Mobility Exercises

Add 6 missing stretches to the mobility exercise library:

| Exercise | Category | Default Hold |
|----------|----------|--------------|
| Pelvic Tilt | spine | 60s |
| Pigeon Pose | hip | 90s |
| Couch Stretch | hip | 60s |
| Calf Stretch | hip/ankle | 45s |
| Standing Hamstring Stretch | hip | 60s |
| Low-Lunge Hip Flexor | hip | 60s |

All are `hold`-type exercises. Target: 30 mins total per day = 100% load.

---

## 5. Custom Exercise System

### Two-Tier Model

#### Global Saved Exercises
- User creates once, persists forever
- Appears in exercise picker for all future sessions
- Stored in Firebase under user profile

#### Session-Level Quick Templates
- Fast-add during a workout
- Auto-saved for future quick-pick access
- Can be promoted to "global saved" or deleted later

### Custom Calisthenics Input (Minimal)
User provides:
1. **Name** (e.g., "Assault Bike Sprints")
2. **Type** (`dynamic` or `hold`)
3. **Icon** (emoji picker)
4. **Primary Muscle Groups** (checkboxes: chest, back, shoulders, arms, legs, core)
5. **Volume** (sets × reps if dynamic; total hold seconds if hold)

*Future additions (monthly review)*: notes, cues, setup tips, secondary muscle groups.

### Custom Mobility Input (Minimal)
User provides:
1. **Name** (e.g., "Deep Couch Stretch Variant")
2. **Type** (`hold` only for now)
3. **Icon** (emoji picker)
4. **Duration** (seconds, auto-populates typical default like 60s)

*Future additions*: body area category, notes.

### Load Contribution
- **Custom calisthenics exercises** contribute to per-muscle load % exactly like presets (total reps / 60 per muscle)
- **Custom mobility exercises** contribute to 30-min daily target
- Both are subject to progressive overload rules (Section 6)

---

## 6. Progressive Overload & Load Calculation

### Per-Muscle Load (Calisthenics)

**Step 1**: Accumulate total reps across all exercises targeting each muscle per day.

**Step 2**: Calculate base load per muscle:
```
muscle_load % = min(total_reps_for_muscle / 60, 100%)
```

**Example**:
- 4×15 pushups (60 reps chest) + 3×10 wide pushups (30 reps chest) = 90 reps chest
- Chest load % = min(90 / 60, 100%) = 100%

**Step 3**: Apply stagnation penalty (see below).

### Stagnation Detection (Progressive Overload)

**Trigger**: Track volume per exercise for the last 5 days. On day 6+, if volume ≤ previous 5 days' average, apply penalty.

**Penalty**: Multiply that exercise's rep contribution by 0.9 for each additional stagnant day.

**Example**:
- Days 1–5: 4×15 pushups = 60 reps/day
- Day 6: 4×15 pushups (same) → penalty of 0.9 applied to those 60 reps
- Effective contribution: 60 × 0.9 = 54 reps toward chest load
- Day 7: same → 60 × 0.9² = 48.6 reps
- After ~10 days of stagnation, that exercise contributes ~30 reps to load (vs. full 60)

**Recalculation**: Triggers on each new workout log or daily refresh. Penalty is applied retroactively to today's load % calculation, then stored in cache.

### Overall Calisthenics Load
```
overall_load % = max(all_muscle_groups' load %)
```

The highest-trained muscle determines the day's calisthenics load %.

---

## 7. Data Model Changes

### Exercises Collection
**Calisthenics**:
- Add 9 new `CalisthenicsExerciseDef` entries to `CALISTHENICS_EXERCISES`
- All with properly mapped `icon`, `type`, `metric`, `unit`, and `description`

**Mobility**:
- Add 6 new `MobilityExercise` entries to `MOBILITY_EXERCISES`
- All with `hold` type and appropriate `category` and default `hold_sec`

### Workout Logging
**BJJ**:
- Extend to track `{ technical_mins: number, sparring_mins: number }` instead of flat `duration`
- Load calculation uses formula above

**Calisthenics & Mobility**:
- Add `exercise_source: 'preset' | 'custom_global' | 'custom_session'` to distinguish custom exercises
- Link to custom exercise definition if `source !== 'preset'`

### Custom Exercises
**New collection**: `user_custom_exercises`
- `{ id, user_id, name, type, icon, muscles[], duration_or_volume, created_at, is_global }`
- Indexed by user + global flag for fast lookup

### Load Calculation Cache
**New collection**: `daily_load_cache` (optional, for performance)
- `{ user_id, date, bjj_load%, calisthenics_load%, mobility_load%, overall_ring_color }`
- Recalculated nightly or on-demand; speeds up calendar rendering

### Exercise History
**Track per-exercise stagnation**:
- `{ user_id, exercise_id, date, volume_reps_or_secs, muscle_penalty }`
- Used to calculate stagnation penalty on day 6+

---

## 8. UI Components

### New/Modified Components
1. **`TrainingCalendar.tsx`** (or `WorkoutCalendar.tsx`)
   - Month view with day cells
   - Load ring SVG overlay per day
   - Hover tooltip with BJJ/Calisthenics/Mobility breakdown

2. **`BjjSplitTimer.tsx`** (replaces or extends `Timer.tsx`)
   - Side-by-side technical + sparring display
   - Independent counters
   - Mode switcher

3. **`CustomExerciseForm.tsx`**
   - Minimal input flow (name, type, icon, muscles, volume)
   - Save to global or session-level

4. **`ExerciseLibraryPicker.tsx`** (enhancement)
   - Show presets + custom saved exercises
   - Visual distinction between global + session

### Modified Pages
- **`Progress.tsx`** or new **`Calendar.tsx`**: Calendar with load ring prominent
- **`Bjj.tsx`**: Replace timer with new `BjjSplitTimer`
- **`CalisthenicsPage.tsx`** & **`MobilityPage.tsx`**: Add "Create Custom Exercise" button

---

## 9. Testing & Validation

### Unit Tests
- Load % calculation per activity (BJJ, calisthenics, mobility)
- Stagnation penalty logic (days 6+)
- Overall ring color derivation

### Integration Tests
- Custom exercise creation → logged workout → load recalculation
- Calendar hover tooltip accuracy
- BJJ split timer persistence across sessions

### Manual Testing
- Create a custom calisthenics exercise, log a workout, verify load %
- Perform same exercise for 6+ days, verify stagnation penalty
- Hover calendar days, verify tooltip details
- Use BJJ split timer, switch modes, verify both tracked

---

## 10. Radar Visualization (Training Readiness)

**Current Issue**: The radar shows stale/phantom values for mobility because:
1. `useRecoveryReadiness` hardcodes mobility to always be 100% (not calculated from actual sessions)
2. Axis mapping in `SkillRadar.tsx` is incorrect (mobility and grappling wired wrong)

**Fix**: Refactor to show **weekly averages** (last 7 days) for all axes:

| Axis | Calculation |
|------|-------------|
| Push Strength | Best pushup/dip volume last 7 days |
| Pull Strength | Best pullup volume last 7 days |
| Static Core | Best hold duration last 7 days |
| Mobility | Total mobility sessions last 7 days (minutes) |
| Grappling | Total BJJ class hours last 7 days |

**Implementation**:
- Update `useRecoveryReadiness` to calculate mobility from actual session logs (not hardcoded 100%)
- Create a new `useWeeklyTrainingVolume` hook that computes 7-day rolling averages
- Correct axis mapping in `SkillRadar.tsx`

---

## 11. Future Enhancements (Out of Scope)

- Weekly/monthly load trends graph
- Custom muscle group definitions per user
- Advanced stagnation strategies (e.g., deload weeks)
- Export workout data

